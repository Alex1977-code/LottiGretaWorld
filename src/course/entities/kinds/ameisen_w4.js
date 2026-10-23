// Ameisen der Welt 4 (4-1 „Ant Trooper Hill“-Vorbild, eigene Figuren): Ameisensoldat, Hörner-Ameisensoldat und
// Riesenameise (Laufuntergrund über dem Stachelfeld). Präzisierung (Gegner Welt 4) in docs/KURS-ARCHITEKTUR.md.
//
// ameisensoldat / ameisensoldat_horn – marschieren auf einem **Ameisenpfad** über Böden und Wände (Datenformat
//   `antpath`, blocks/antpath.js: [[x, y, z, nx, ny, nz], …] Fußpunkte auf der Lauffläche mit
//   Flächennormale; zwei Punkte an derselben Stelle mit neuer Normale = Kante, dort kippt die Ameise weich über `round`
//   0,35 m; ohne Normale [0, 1, 0]; { path, loop } für Rundwege; oder die Id eines Bausteins `ameisenweg`). Ohne Pfad
//   laufen sie am Boden wie Pilzlinge (dir, Umkehr an Kanten/Wänden).
//   **Tragen:** Auf dem Rücken liegt ein Einweg-Quader (bewegte Form, mover) – wer daraufsteht, fährt mit, auch die
//   Wand hinauf (an der Wand ist die Oberseite das obere Körperende) und über Kanten. `ride` regelt das Landen:
//     'wall' (Standard): an Wänden (Flächennormale y < 0,5) trägt jede Ameise; am Boden ist Landen von oben der
//            normale Konter – Ameisensoldat platt (Abprall), Hörner-Ameise: Horn verletzt.
//     true:  trägt immer (Landen von oben besiegt nicht; Stampfattacke besiegt den Ameisensoldaten trotzdem).
//     false: keine Reit-Form (klassischer Gegner).
//   Wer schon draufsteht, fährt weiter, auch wenn die Ameise von der Wand auf eine Oberseite wechselt (kein Treffer).
//   Besiegt: Ameisensoldat durch Draufspringen (Boden), Stampfattacke, alle Angriffe; Hörner-Ameise **nicht von oben**
//   (Horn verletzt), sonst durch Feuer, Wurf, Krallen/Schwanzhieb, Panzer, Biss, Faust, Stampfwelle daneben, Rutschen,
//   Kanonenkugel, Explosion, Riesentrank, Funkelstern; Lava/Giftwasser/Absturz. Seitlich = Treffer der Figur.
//   Daten: { kind: 'ameisensoldat' | 'ameisensoldat_horn', antpath | path (Format oben), loop?, mode?: 'pingpong'
//            (Standard ohne loop) | 'loop' | 'once' (am Ende verschwinden), speed?: 1.5, phase?: 0..1 (Start auf dem Pfad),
//            back?: false (startet rückwärts), count?: 1, spacing?: 1.5 (m entlang des Pfads, Kolonne), ride?: 'wall',
//            pos?, dir? (ohne Pfad), spawner?: { every: 2.5, max: 6, first: 0 } (Strom aus einer Röhre/Höhle: neue
//            Ameisen am Pfadanfang mit mode 'once'), id?, drop? }
//   Laufzeit: s (Bogenlänge), normal, tangent, riders (Figuren auf dem Rücken), carried (Zähler), onWall, info().
//   Darstellung: eine Instanz-Gruppe je Art und Level (createInstanced 'ameisensoldat' | '…_horn', Quaternion-Lage).
//
// riesenameise – große Ameise mit flachem Lastdeck (Deck-Oberkante 1,25 m) als **Laufuntergrund** (Stachelfeld 4-1):
//   läuft auf einem Bodenpfad (y = Bodenhöhe), das Deck (Einweg, mover mit Drehung) trägt Figuren und Gegner. Harmlos,
//   unbesiegbar (kein `enemy`). Als Strom aus einer Höhle: spawner → alle every s eine neue Riesenameise am Pfadanfang
//   (erscheint 0,6 s), die bis zum Pfadende läuft und dort in der Höhle verschwindet (0,8 s); prefill füllt den Strom
//   schon beim Start.
//   Daten: { kind: 'riesenameise', path: [[x, y, z], …], speed?: 2, loop?, mode?: 'pingpong' | 'loop' | 'once',
//            phase?: 0..1, spawner?: true | { every: 3.5, max: 8, first: 0, prefill: true }, id? }
//   Laufzeit: deckTop (Höhe der Deck-Oberseite), riders, info(); Spawner: spawned, alive.
//   Darstellung: alle Riesenameisen eines Levels teilen sich Modell-Instanzen (sharedModelSlot, gleicher Gang).

import * as THREE from 'three';
import { EnemyW2, sharedSlot, sharedModelSlot, figures } from '../EnemyW2.js';
import { getModel } from '../../models/index.js';
import { PathMover } from '../../level/PathMover.js';
import { antPath, resolveAntPath, antPathAt, antOrient } from '../../blocks/antpath.js';


// =====================================================================================================================
// Ameisenpfad: Datenformat und Abtasten aus blocks/antpath.js (Bausteine Welt 4)
// =====================================================================================================================

/** Pfad aus Gegnerdaten (antpath | path): Id eines `ameisenweg`, Liste (mit loop) oder { path, loop }. */
export function resolveTrack(level, ref, loop) {
  if (!ref) return null;
  if (typeof ref === 'string') {
    const t = resolveAntPath(level, ref);
    if (!t) console.warn(`[Ameise] Ameisenweg fehlt: ${ref}`);
    return t;
  }
  if (Array.isArray(ref) && loop) return antPath({ path: ref, loop: true });
  return resolveAntPath(level, ref);
}

const _rm = new THREE.Matrix4();
/**
 * Achsenparalleler Hüllquader eines gedrehten Quaders (lokal lo … hi, Ursprung foot, Lage q) → out { min, max }
 * (Vector3). Nutzt die Beträge der Drehmatrix (exakte Hülle des gedrehten Quaders).
 */
export function orientedAABB(foot, q, lo, hi, out) {
  _rm.makeRotationFromQuaternion(q);
  const e = _rm.elements;   // Spalten: x-Achse (0,1,2), y (4,5,6), z (8,9,10)
  const cx = (lo[0] + hi[0]) / 2, cy = (lo[1] + hi[1]) / 2, cz = (lo[2] + hi[2]) / 2;
  const hx = (hi[0] - lo[0]) / 2, hy = (hi[1] - lo[1]) / 2, hz = (hi[2] - lo[2]) / 2;
  for (let a = 0; a < 3; a++) {
    const c = foot.getComponent(a) + e[a] * cx + e[4 + a] * cy + e[8 + a] * cz;
    const h = Math.abs(e[a]) * hx + Math.abs(e[4 + a]) * hy + Math.abs(e[8 + a]) * hz;
    out.min.setComponent(a, c - h);
    out.max.setComponent(a, c + h);
  }
  return out;
}

// =====================================================================================================================
// Ameisensoldat / Hörner-Ameisensoldat
// =====================================================================================================================

// Reit-Quader (Rücken) und Trefferhülle, lokal (x vorn, y oben = Flächennormale, z quer)
const BOX_LO = [-0.6, 0, -0.3], BOX_HI = [0.48, 0.62, 0.3];
const HULL_LO = [-0.64, 0, -0.32], HULL_HI = [0.6, 0.72, 0.32];
const HULL_HORN_HI = [0.62, 0.95, 0.32];
const WALL_NY = 0.5;            // |normal.y| darunter: Wand

class Ameise extends EnemyW2 {
  constructor(level, spec, horn) {
    super(level, spec, horn ? 'ameisensoldat_horn' : 'ameisensoldat');
    this.horn = horn;
    this.speed = spec.speed ?? 1.5;
    this.ride = spec.ride ?? 'wall';
    this.wake = 0;
    this.shadow = 0.42;
    this.state = 'walk';
    this.foot = this.pos.clone();
    this.normal = new THREE.Vector3(0, 1, 0);
    this.tangent = new THREE.Vector3(this.dir.x, 0, this.dir.z);
    this.quat = new THREE.Quaternion();
    this.at = { pos: new THREE.Vector3(), normal: new THREE.Vector3(), tangent: new THREE.Vector3(), s: 0, face: 0 };
    this.box = { min: new THREE.Vector3(), max: new THREE.Vector3() };
    this.hull = { min: new THREE.Vector3(), max: new THREE.Vector3() };
    this.riders = new Set();
    this.landed = new Set();
    this.carried = 0;
    this.stomps = 0;
    this.track = resolveTrack(level, spec.antpath ?? spec.path, spec.loop);
    if (this.track && this.track.L <= 0) this.track = null;
    if (this.track) {
      this.path = null;   // Patrouille von Enemy aus
      this.mode = spec.mode ?? (this.track.loop ? 'loop' : 'pingpong');
      this.s = spec.s ?? (((spec.phase ?? 0) % 1 + 1) % 1) * this.track.L;
      this.sdir = spec.back ? -1 : 1;
      if (!this.track.loop && this.s < 0) { this.s = -this.s; this.sdir = -this.sdir; }
    } else {
      this.half.set(0.45, 0.36, 0.45);
    }
    this.mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: 0, cz: 0 };
    this.boxId = this.ride === false ? null : this.addShape({ type: 'box', min: [0, -999, 0], max: [0.1, -998.9, 0.1], oneWay: true, mover: this.mover, camIgnore: true, noWallSlide: true, tag: this.kind });
    this.slot = sharedSlot(level, this.kind);
    this.leaving = false;
    this.place(0, true);
  }

  get onWall() { return Math.abs(this.normal.y) < WALL_NY; }
  get sideways() { return this.normal.y < 0.5; }

  // ------------------------------------------------------------------ Bewegung

  update(dt) {
    this.stateT += dt;
    if (this.state === 'flipped' || this.state === 'squashed') { this.defeatStep(dt); return; }
    if (this.state === 'leave') {
      if (this.stateT > 0.5) this.kill();
      this.placeTrackStep(dt * 0.6);
      return;
    }
    if (this.track) this.placeTrackStep(dt);
    else this.walkStep(dt);
  }

  placeTrackStep(dt) {
    const L = this.track.L;
    let s = this.s + this.speed * this.sdir * dt;
    if (this.mode === 'loop' && this.track.loop) s = ((s % L) + L) % L;
    else if (s >= L || s <= 0) {
      if (this.mode === 'once' && s >= L) { s = L; if (this.state !== 'leave') { this.setState('leave'); this.dropShape(); } }
      else if (this.mode === 'loop') s = ((s % L) + L) % L;
      else { s = Math.max(0, Math.min(L, s)); this.sdir = -this.sdir; }
    }
    this.s = s;
    this.place(dt, false);
  }

  walkStep(dt) {
    this.walk(dt, this.speed);
    if (this.removed) return;
    this.place(dt, false);
  }

  /** Lage (Fußpunkt, Normale, Richtung) → Quaternion, Hülle, Reit-Quader, mover. */
  place(dt, first) {
    if (this.track) {
      antPathAt(this.track, this.s, this.at);
      this.foot.copy(this.at.pos);
      this.normal.copy(this.at.normal);
      this.tangent.copy(this.at.tangent).multiplyScalar(this.sdir);
    } else {
      this.foot.copy(this.pos);
      this.normal.set(0, 1, 0);
      this.tangent.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    }
    antOrient(this.normal, this.tangent, this.quat);
    if (this.track) {
      orientedAABB(this.foot, this.quat, HULL_LO, this.horn ? HULL_HORN_HI : HULL_HI, this.hull);
      const h = this.hull;
      this.half.set((h.max.x - h.min.x) / 2, (h.max.y - h.min.y) / 2, (h.max.z - h.min.z) / 2);
      this.pos.set((h.min.x + h.max.x) / 2, h.min.y, (h.min.z + h.max.z) / 2);
      this.checkLava();
    }
    this.shadowVisible = this.normal.y > 0.7;
    this.syncShape(dt, first);
    this.trackRiders();
  }

  syncShape(dt, first) {
    if (this.boxId === null) return;
    const sh = this.level.world.get(this.boxId);
    if (!sh) return;
    const b = orientedAABB(this.foot, this.quat, BOX_LO, BOX_HI, this.box);
    const m = this.mover;
    const ox = (sh.x0 + sh.x1) / 2, oy = sh.top, oz = (sh.z0 + sh.z1) / 2;
    const nx = (b.min.x + b.max.x) / 2, ny = b.max.y, nz = (b.min.z + b.max.z) / 2;
    if (first || !(dt > 0) || oy < -900) { m.dx = 0; m.dy = 0; m.dz = 0; }
    else { m.dx = nx - ox; m.dy = ny - oy; m.dz = nz - oz; }
    const k = dt > 0 ? 1 / dt : 0;
    m.vx = m.dx * k; m.vy = m.dy * k; m.vz = m.dz * k;
    m.cx = nx; m.cz = nz;
    // Oberseite dünn: an Wänden trägt nur das obere Körperende
    const top = b.max.y, bot = Math.max(b.min.y, top - 0.5);
    sh.min = [b.min.x, bot, b.min.z];
    sh.max = [b.max.x, top, b.max.z];
    this.level.world.update(this.boxId);
  }

  dropShape() {
    if (this.boxId === null) return;
    this.level.world.remove(this.boxId);
    const i = this.shapes.indexOf(this.boxId);
    if (i >= 0) this.shapes.splice(i, 1);
    this.boxId = null;
    this.riders.clear();
  }

  riding(p) { return this.boxId !== null && p.mode === 'ground' && p.ground?.owner === this; }

  /** Wer steht auf dem Rücken? Neu gelandete merken (Konter im onPlayer desselben Schritts). */
  trackRiders() {
    this.landed.clear();
    if (this.boxId === null) return;
    const now = [];
    for (const p of figures(this.level)) {
      if (!p || p.dead || p.removedFigure) continue;
      if (!this.riding(p)) continue;
      now.push(p);
      if (!this.riders.has(p) && p.state === 'land' && p.stateTime < 0.02) this.landed.add(p);
    }
    const before = this.riders.size;
    this.riders.clear();
    for (const p of now) this.riders.add(p);
    if (!before && this.riders.size) this.carried++;
  }

  // ------------------------------------------------------------------ Niederlage

  defeatStep(dt) {
    const fx = this.foot.x - this.pos.x, fy = this.foot.y - this.pos.y, fz = this.foot.z - this.pos.z;
    if (this.state === 'squashed') {
      if (this.track && this.sideways) {
        // an der Wand platt: fällt hinunter
        this.vel.y = Math.max(this.vel.y - 30 * dt, -18);
        this.pos.y += this.vel.y * dt;
        if (this.stateT > this.squashTime || this.pos.y < this.level.killY) this.kill();
      } else {
        if (this.track) { if (this.stateT > this.squashTime) this.kill(); }
        else this.updateDefeat(dt);
      }
    } else this.updateDefeat(dt);
    this.foot.set(this.pos.x + fx, this.pos.y + fy, this.pos.z + fz);
  }

  squash(dur) {
    if (this.defeated) return;
    super.squash(dur);
    this.dropShape();
    this.stomps++;
  }

  flip(source, up) {
    if (this.defeated) return;
    super.flip(source, up);
    this.dropShape();
  }

  fallOut(cause) {
    this.dropShape();
    super.fallOut(cause);
  }

  // ------------------------------------------------------------------ Konter

  /** Landen von oben: Konter oder Mitfahren? → 'stomp' | 'hurt' | 'none' */
  landOn(player, pound) {
    const carrier = this.ride === true || (this.ride === 'wall' && this.sideways);
    if (pound) {
      if (!this.horn) { this.squash(); this.level.sfx('stomp'); return 'none'; }
      if (carrier) return 'none';
      return 'hurt';
    }
    if (carrier) return 'none';
    if (this.horn) return 'hurt';
    this.squash();
    return 'stomp';
  }

  onPlayer(player, contact) {
    if (this.defeated || this.state === 'leave') return 'none';
    if (this.riding(player)) {
      if (this.landed.has(player)) { this.landed.delete(player); return this.landOn(player, player.poundLanded); }
      return 'none';
    }
    if (this.slideAttack(player, contact)) return 'none';
    if (contact.pound) return this.landOn(player, true);
    if (contact.fromAbove && this.normal.y > -0.5) return this.landOn(player, false);
    // knapp über dem Rücken (landet gleich darauf): nichts
    if (this.boxId !== null && player.pos.y >= this.box.max.y - 0.12 && player.vel.y <= 0.5) return 'none';
    if (contact.dive) { this.onHit('claw', player); return 'none'; }
    return 'hurt';
  }

  /** Stampfattacke landet auf dem Reit-Quader (Player.land → owner.onPound). */
  onPound(player) {
    if (this.defeated || this.horn) return;
    this.squash();
    this.level.sfx('stomp');
  }

  onHit(kind, source) {
    if (this.defeated || this.state === 'leave') return;
    if (kind === 'throw' && source === this) return;
    super.onHit(kind, source);
  }

  // ------------------------------------------------------------------ Darstellung

  render() {
    if (!this.slot || this.removed) return;
    let anim = 'walk';
    if (this.state === 'squashed') anim = 'squashed';
    else if (this.state === 'flipped') anim = 'idle';
    else if (this.riders.size) anim = 'carry';
    if (this.state === 'flipped') {
      _fq.setFromAxisAngle(this.tangent, Math.PI);
      _rq.copy(this.quat).premultiply(_fq);
      this.slot.set(this.foot, _rq, 1, { anim, speed: this.speed });
      return;
    }
    const sc = this.state === 'leave' ? Math.max(0.05, 1 - this.stateT / 0.5) : 1;
    this.slot.set(this.foot, this.quat, sc, { anim, speed: this.speed });
  }

  dispose() {
    this.slot?.release();
    this.slot = null;
    super.dispose();
  }

  info() {
    return {
      state: this.state, s: +(this.s ?? 0).toFixed(2), x: +this.foot.x.toFixed(2), y: +this.foot.y.toFixed(2), z: +this.foot.z.toFixed(2),
      ny: +this.normal.y.toFixed(2), riders: this.riders.size, carried: this.carried, defeated: this.defeated,
      top: this.boxId !== null ? +this.box.max.y.toFixed(2) : null,
    };
  }
}
const _fq = new THREE.Quaternion(), _rq = new THREE.Quaternion();

// =====================================================================================================================
// Riesenameise (Laufuntergrund)
// =====================================================================================================================

const DECK = { y: 1.25, x0: -1.3, x1: 0.85, w: 1.35 };

class Riesenameise extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'riesenameise');
    this.enemy = false;
    this.touch = false;
    this.wake = 0;
    this.flying = true;     // Giftwasser lässt sie nicht versinken
    this.shadow = 1.3;
    this.half.set(1.5, 0.7, 1.5);
    this.speed = spec.speed ?? 2;
    this.state = 'walk';
    this.mode = spec.mode ?? (spec.loop ? 'loop' : 'pingpong');
    const pts = spec.path?.length >= 2 ? spec.path : [[this.pos.x, this.pos.y, this.pos.z], [this.pos.x + this.dir.x * 8, this.pos.y, this.pos.z + this.dir.z * 8]];
    this.path = null;
    this.pm = new PathMover(pts, { speed: this.speed, mode: this.mode === 'loop' ? 'loop' : 'pingpong', wait: spec.wait ?? 0.4, phase: ((spec.phase ?? 0) % 1 + 1) % 1 });
    if (spec.s !== undefined) { this.pm.s = Math.max(0, Math.min(this.pm.length, spec.s)); this.pm.at(this.pm.s, this.pm.pos); }
    this.pos.set(this.pm.pos.x, this.pm.pos.y, this.pm.pos.z);
    this.heading = this.headingAt();
    this.yaw = this.heading;
    this.scale = this.mode === 'once' && spec.enter !== false ? 0.05 : 1;
    this.deckTop = this.pos.y + DECK.y;
    this.mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: this.pos.x, cz: this.pos.z };
    this.deckId = this.addShape({ type: 'box', min: [0, -999, 0], max: [0.1, -998.9, 0.1], oneWay: true, mover: this.mover, camIgnore: true, tag: 'riesenameise_deck' });
    this.riders = new Set();
    this.carried = 0;
    this.prev = { x: this.pos.x, y: this.pos.y, z: this.pos.z, yaw: this.yaw };
    this.syncDeck(0, true);
    // Darstellung: alle Riesenameisen eines Levels als Instanzen (gleicher Gang), sonst eigenes Modell
    this.slot = sharedModelSlot(level, 'riesenameise', {}, { anim: 'walk', speed: this.speed });
    if (!this.slot && level.view) { this.setModel(getModel('riesenameise')); this.initShadows(2); }
  }

  /** Blickrichtung aus dem aktuellen Pfadstück (PathMover). */
  headingAt() {
    const pm = this.pm;
    if (!pm.seg.length) return this.yaw;
    let k = pm.seg.length - 1;
    for (let i = 0; i < pm.seg.length; i++) if (pm.s <= pm.seg[i].s0 + pm.seg[i].l) { k = i; break; }
    const g = pm.seg[k];
    let dx = g.b.x - g.a.x, dz = g.b.z - g.a.z;
    if (pm.mode !== 'loop' && pm.dir < 0) { dx = -dx; dz = -dz; }
    return Math.atan2(-dz, dx);
  }

  update(dt) {
    this.stateT += dt;
    const pm = this.pm;
    this.prev.x = this.pos.x; this.prev.y = this.pos.y; this.prev.z = this.pos.z; this.prev.yaw = this.yaw;
    if (this.state === 'leave') {
      this.scale = Math.max(0.02, 1 - this.stateT / 0.8);
      const f = { x: Math.cos(this.yaw), z: -Math.sin(this.yaw) };
      this.pos.x += f.x * this.speed * dt; this.pos.z += f.z * this.speed * dt;
      if (this.stateT > 0.25 && this.deckId !== null) { this.removeShapes(); this.deckId = null; this.riders.clear(); }
      if (this.stateT >= 0.8) this.kill();
      if (this.deckId !== null) this.syncDeck(dt);
      return;
    }
    if (this.scale < 1) this.scale = Math.min(1, this.scale + dt / 0.6);
    if (this.mode === 'once' && pm.s + this.speed * dt >= pm.length) {
      pm.s = pm.length; pm.at(pm.s, pm.pos);
      this.pos.set(pm.pos.x, pm.pos.y, pm.pos.z);
      this.setState('leave');
      this.level.effects?.dust(this.pos, 6, 1.6);
      return;
    }
    pm.step(dt);
    this.pos.set(pm.pos.x, pm.pos.y, pm.pos.z);
    const want = this.headingAt();
    // an Ecken weich drehen (das Deck dreht mit, Figuren auch)
    let d = want - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += Math.sign(d) * Math.min(Math.abs(d), 2.4 * dt);
    this.syncDeck(dt);
  }

  syncDeck(dt, first = false) {
    if (this.deckId === null) return;
    const sh = this.level.world.get(this.deckId);
    if (!sh) return;
    const c = Math.cos(this.yaw), s = Math.sin(this.yaw);
    const mx = (DECK.x0 + DECK.x1) / 2, hl = (DECK.x1 - DECK.x0) / 2, hw = DECK.w / 2;
    // Deckmitte in Welt (lokal x vorn, z rechts)
    const cx = this.pos.x + mx * c, cz = this.pos.z - mx * s;
    const ex = Math.abs(c) * hl + Math.abs(s) * hw, ez = Math.abs(s) * hl + Math.abs(c) * hw;
    const top = this.pos.y + DECK.y;
    const m = this.mover;
    if (first || !(dt > 0)) { m.dx = m.dy = m.dz = m.dyaw = 0; }
    else {
      m.dx = this.pos.x - this.prev.x; m.dy = this.pos.y - this.prev.y; m.dz = this.pos.z - this.prev.z;
      m.dyaw = this.yaw - this.prev.yaw;
      m.cx = this.prev.x; m.cz = this.prev.z;
    }
    const k = dt > 0 ? 1 / dt : 0;
    m.vx = m.dx * k; m.vy = m.dy * k; m.vz = m.dz * k;
    sh.min = [cx - ex, top - 0.25, cz - ez];
    sh.max = [cx + ex, top, cz + ez];
    this.deckTop = top;
    this.level.world.update(this.deckId);
    // Mitfahrer zählen
    const before = this.riders.size;
    this.riders.clear();
    for (const p of figures(this.level)) if (p && !p.dead && p.mode === 'ground' && p.ground?.owner === this) this.riders.add(p);
    if (!before && this.riders.size) this.carried++;
  }

  onPlayer() { return 'none'; }
  onHit() {}

  modelState() { return { anim: this.state === 'leave' || this.state === 'walk' ? (this.riders.size ? 'carry' : 'walk') : 'idle', speed: this.speed }; }

  syncModel() {
    if (this.slot) { if (!this.removed) this.slot.set(this.pos, this.yaw, this.scale); return; }
    if (!this.model) return;
    super.syncModel();
    this.model.root.scale.setScalar(this.scale);
  }

  dispose() {
    this.slot?.release();
    this.slot = null;
    super.dispose();
  }

  info() {
    return { state: this.state, x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2), deckTop: +this.deckTop.toFixed(2), riders: this.riders.size, carried: this.carried, s: +this.pm.s.toFixed(2) };
  }
}

// =====================================================================================================================
// Strom (Spawner): neue Ameisen am Pfadanfang alle every s
// =====================================================================================================================

class AntSpawner extends EnemyW2 {
  constructor(level, spec, kind) {
    super(level, spec, `${kind}_strom`);
    this.enemy = false;
    this.touch = false;
    this.shadow = 0;
    this.wake = 0;
    this.of = kind;
    const sp = typeof spec.spawner === 'object' ? spec.spawner : {};
    this.every = sp.every ?? spec.every ?? (kind === 'riesenameise' ? 3.5 : 2.5);
    this.max = sp.max ?? spec.max ?? (kind === 'riesenameise' ? 8 : 6);
    this.timer = sp.first ?? spec.first ?? 0;
    this.spawned = 0;
    this.list = [];
    this.child = { ...spec, kind, spawner: undefined, id: undefined, mode: 'once', count: 1, phase: 0 };
    delete this.child.spawner;
    this.active = spec.active !== false;
    const prefill = sp.prefill ?? spec.prefill ?? true;
    if (prefill) this.prefill();
  }

  /** Länge des Pfads (Bodenpfad bzw. Ameisenpfad). */
  pathLength() {
    if (this.of === 'riesenameise') {
      const pts = this.spec.path ?? [];
      let L = 0;
      for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]);
      return L;
    }
    return resolveTrack(this.level, this.spec.antpath ?? this.spec.path, false)?.L ?? 0;
  }

  prefill() {
    const L = this.pathLength();
    const gap = (this.spec.speed ?? (this.of === 'riesenameise' ? 2 : 1.5)) * this.every;
    if (!(gap > 0.5) || !(L > 0)) return;
    for (let s = L - gap * 0.5, n = 0; s > 0.5 && n < this.max - 1; s -= gap, n++) this.emit(s);
  }

  emit(s = 0) {
    const e = this.level.spawn(this.of, { ...this.child, s, enter: s <= 0 });
    if (!e) return null;
    this.list.push(e);
    this.spawned++;
    return e;
  }

  get aliveCount() { return this.list.filter((e) => !e.removed).length; }

  setActive(b) { this.active = !!b; }

  update(dt) {
    this.list = this.list.filter((e) => !e.removed);
    if (!this.active) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer += this.every;
    if (this.list.length < this.max) this.emit(0);
  }

  onPlayer() { return 'none'; }
  onHit() {}
  info() { return { spawned: this.spawned, alive: this.aliveCount, every: this.every, max: this.max }; }
}

// =====================================================================================================================
// Fabriken (Kolonnen, Strom)
// =====================================================================================================================

function makeAnt(horn) {
  const kind = horn ? 'ameisensoldat_horn' : 'ameisensoldat';
  return (level, spec) => {
    if (spec.spawner) return new AntSpawner(level, spec, kind);
    const n = Math.max(1, Math.round(spec.count ?? 1));
    const first = new Ameise(level, { ...spec, count: 1 }, horn);
    if (n > 1) {
      const spacing = spec.spacing ?? 1.5;
      for (let i = 1; i < n; i++) {
        const sub = { ...spec, id: spec.id ? `${spec.id}_${i}` : undefined, count: 1 };
        if (first.track) { sub.s = first.s - i * spacing * first.sdir; delete sub.phase; }
        else { sub.pos = [first.pos.x - first.dir.x * spacing * i, first.pos.y, first.pos.z - first.dir.z * spacing * i]; }
        level.spawn(kind, sub);
      }
    }
    return first;
  };
}

export const KINDS = {
  ameisensoldat: makeAnt(false),
  ameisensoldat_horn: makeAnt(true),
  riesenameise: (level, spec) => (spec.spawner ? new AntSpawner(level, spec, 'riesenameise') : new Riesenameise(level, spec)),
};
