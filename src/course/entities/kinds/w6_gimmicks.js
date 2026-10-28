// Gimmick-Entitäten Welt 6 (Präzisierung Motor und Bausteine Welt 6).
//
// stachelkugel – rollende Stachelkugel (Bauplan 6-1 „Stachelkugeln“, Stern „Glasröhre zwischen zwei Stachelkugeln“):
//   verletzt bei jeder Berührung (auch von oben – nicht draufspringen!), rollt entlang einer Bahn (path) oder frei (rollt
//   Rampen hinab, prallt an Wänden ab, fällt in Abgründe). Funkelstern, Riesentrank, Explosion zerstören sie; Feuer, Tatze,
//   Wurf prallen ab. Reist durch Glasröhren-Netze (pipeable).
//   { kind: 'stachelkugel', pos: [x, y, z] (Auflagepunkt), size: 1.2 (Ø), path: [[x, y, z], …] (Bodenpunkte), speed: 3.5,
//     mode: 'loop' | 'pingpong' | 'once', wait: 0, phase: 0..1, vel: [vx, vz] (freies Rollen: Startschub), friction: 0.4,
//     life: 0 (s, 0 = ewig), respawn: 0 (s nach dem Absturz wieder am Start; 0 = weg), id, hidden }
// stachelkugel_quelle – Röhrenmündung, aus der im Takt Stachelkugeln rollen (frei oder auf path, mode 'once').
//   { kind: 'stachelkugel_quelle', pos: [x, y, z] (Austritt, Boden), dir: [dx, dz], every: 3 (s), speed: 4, size: 1.2,
//     max: 4 (gleichzeitig), life: 14, phase: 0 (s), path, id, hidden }   Laufzeit: spawned, start(), stop()
// wurfball – Wurfball (Bauplan 6-Haus „alles mit Wurfbällen“): Aktion hebt ihn auf (vor der Brust), Aktion wirft ihn schnell
//   und flach in Blickrichtung (Ducken + Aktion: absetzen). Er prallt von Boden und Wänden ab, rollt Hänge hinab, treibt im
//   Wind und trifft (im Flug und schnell rollend, ab 2,5 m/s): Gegner (onHit('throw')), POW-Block (fire), Druckschalter (pswitch), grüne Sterne (sammelt sie für die
//   Werferin), Münzen, Zielscheiben, Gong, alles mit onBallHit(ball). Nach `life` s am Boden verschwindet er und liegt nach
//   `respawn` s wieder am Start.
//   { kind: 'wurfball', pos, size: 0.45 (Ø), speed: 15 (m/s Wurf), lift: 3 (m/s nach oben), bounce: 0.5, life: 4 (s nach dem
//     Wurf), respawn: 1.5 (s; 0 = nie), color: 'weiss' | 'rot' | 'gelb', slopeAir: 0.35 (s Luftphase nach einem
//     Hang-Kontakt, in der der Hangabtrieb weiter wirkt; 0 = nur am Boden wie vor dem Motor-Feinschliff), id, hidden }
//   Laufzeit: thrown, hits (Zahl der Treffer), lastHit (Art), info()
// zielscheibe – Zielscheibe / Schalterfeld (6-Haus „jedes Schalterfeld treffen“): ein Treffer (Wurfball, auf Wunsch auch
//   Angriffe) klappt sie um (grün); sind alle einer Gruppe getroffen, läuft onAll.
//   { kind: 'zielscheibe', pos: [x, y, z] (Mitte der Scheibe), yaw: −π/2 (Scheibe blickt dorthin), size: 1.2 (Ø),
//     group: 'ziele', onHit: Aktion, onAll: Aktion, by: 'ball' | 'alles' (auch Tatze/Feuer/Panzer/Stampfen), stand: 0 (m
//     Pfosten darunter; 0 = an der Wand), reset: 0 (s, dann wieder offen), id, hidden }
//   level.targets[group] = { n, of, done }
// pilz_maske – Pilz-Maske (Bauplan 6-3 „Pilz-Maske macht Figur für Gegner unsichtbar, wenn man ihnen zugewandt ist“):
//   berühren setzt sie auf (Trage-Helm 'maske', player.masked); Gegner, denen die Figur zugewandt ist, sehen sie nicht
//   (level.isMaskedFrom(gegner, figur), Blickkegel ±75°). Ein Treffer schlägt sie ab (fängt den Treffer ab, liegt dann als
//   helm_maske wieder da), Ducken + Aktion setzt sie ab.
//   { kind: 'pilz_maske', pos, respawn: 0 (s; nach dem Aufheben liegt wieder eine da), id, hidden }
// riesenfrageblock – großer ?-Block (Bauplan 6-Panzer „große ?-Blöcke wachsen per Zündkopf oder Stampfen zu Türmen“):
//   Stampfattacke oben drauf oder eine Explosion (Zündkopf, Kickbombe) lässt ihn auf einer Säule zum Turm wachsen (trägt die
//   Figur hinauf), Inhalt springt heraus; danach ist er ein brauner (benutzter) Block.
//   { kind: 'riesenfrageblock', pos: [x, y, z] (Mitte unten), size: 2, grow: 6 (m), speed: 3 (m/s), content: 'coins:5' |
//     Aktion, onGrow: Aktion (am Ende), trigger: ['pound', 'bomb'] (+ 'bump' Kopfstoß von unten, 'mega'), attach, id, hidden }
//   Laufzeit: state ('bereit'|'waechst'|'turm'), height, grow(), info()
// Hüllen: die Welt-6-Bausteine kippschiff, kippsteg, wippe, schiebetuer, gong, klettergitter, windfeld, foerderband,
//   quetschblock, wolkenplattform, floss sind auch als kind in enemies/items erlaubt ({ kind: 'gong', … }).

import * as THREE from 'three';
import { Gimmick, runAction, contentAction, visDt } from '../gimmick.js';
import { getModel, hasModel } from '../../models/index.js';
import { surfaceNormal } from '../../physics/shapes.js';
import { HELMETS } from '../../player/helmets.js';
import { PathMover } from '../../level/PathMover.js';
import { blockTemplate } from '../visuals.js';
import { lin, mixc, smooth, colorize, merge } from '../../blocks/kit.js';
import { w6, w6Sfx } from '../../blocks/w6kit.js';
import { buildKippschiff, buildKippsteg, buildWippe } from '../../blocks/types/w6_ship.js';
import { buildSchiebetuer, buildGong } from '../../blocks/types/w6_hall.js';
import { buildKlettergitter } from '../../blocks/types/w6_grid.js';
import { buildWindfeld } from '../../blocks/types/w6_wind.js';
import { buildFoerderband } from '../../blocks/types/w6_conveyor.js';
import { buildQuetschblock } from '../../blocks/types/w6_crusher.js';
import { buildWolkenplattform } from '../../blocks/types/w6_cloud.js';
import { buildFloss } from '../../blocks/types/w6_water.js';

const N = { x: 0, y: 1, z: 0 };

// ------------------------------------------------------------------ Stachelkugel

let spikeTpl = null;
function spikeBallModel(size, color) {
  if (hasModel('stachelkugel')) return getModel('stachelkugel', { size, color: color ?? 'eisen' });
  if (!spikeTpl) {
    const parts = [];
    const core = new THREE.IcosahedronGeometry(0.5, 2);
    const a = lin(0x6a6a7a), b = lin(0xb8bcc8);
    parts.push(colorize(core, (p, n, o) => mixc(a, b, smooth(-0.6, 0.9, n.y * 0.7 + n.x * 0.3), o)));
    const ico = new THREE.IcosahedronGeometry(0.5, 0);
    const v = ico.attributes.position;
    const seen = new Set();
    for (let i = 0; i < v.count; i++) {
      const d = new THREE.Vector3(v.getX(i), v.getY(i), v.getZ(i)).normalize();
      const key = `${d.x.toFixed(2)},${d.y.toFixed(2)},${d.z.toFixed(2)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const c = new THREE.ConeGeometry(0.12, 0.34, 6);
      c.translate(0, 0.62, 0);
      c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d));
      parts.push(colorize(c.toNonIndexed(), (p, n, o) => mixc(lin(0xc8ccd8), lin(0xffffff), smooth(0.4, 0.8, p.length()), o)));
    }
    spikeTpl = { geo: merge(parts), mat: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.5 }) };
  }
  const root = new THREE.Group();
  const spin = new THREE.Group();
  const m = new THREE.Mesh(spikeTpl.geo, spikeTpl.mat);
  m.castShadow = true;
  spin.add(m);
  spin.scale.setScalar(size);
  spin.position.y = size / 2;
  root.add(spin);
  return { root, spin, update() {}, dispose() {} };
}

class Stachelkugel extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'stachelkugel');
    this.size = spec.size ?? 1.2;
    const r = this.size / 2;
    this.half.set(r * 0.8, r * 0.85, r * 0.8);
    this.enemy = true;
    this.spiky = true;
    this.shadow = r * 0.9;
    this.home = this.pos.clone();
    this.roll = 0;
    this.age = 0;
    this.life = spec.life ?? 0;
    this.respawnT = spec.respawn ?? 0;
    this.lost = 0;
    this.friction = spec.friction ?? 0.4;
    this.pm = spec.path?.length >= 2 ? new PathMover(spec.path, { speed: spec.speed ?? 3.5, mode: spec.mode === 'loop' ? 'loop' : 'pingpong', wait: spec.wait ?? 0, phase: spec.phase ?? 0 }) : null;
    this.once = spec.mode === 'once';
    if (this.pm) this.pos.set(this.pm.pos.x, this.pm.pos.y, this.pm.pos.z);
    else if (spec.vel) { this.vel.x = spec.vel[0] ?? 0; this.vel.z = spec.vel[1] ?? 0; }
    if (level.view) {
      const m = spikeBallModel(this.size, spec.color);
      this.spin = m.spin ?? null;
      this.setModel(m);
    }
  }

  update(dt) {
    if (this.hidden) return;
    if (this.lost) {
      this.lost += dt;
      if (this.respawnT > 0 && this.lost > this.respawnT) { this.lost = 0; this.pos.copy(this.home); this.vel.set(0, 0, 0); this.popT = 0.45; }
      return;
    }
    this.age += dt;
    if (this.life > 0 && this.age > this.life) { this.poof(); return; }
    const ox = this.pos.x, oz = this.pos.z;
    if (this.pm) {
      const d = this.pm.step(dt);
      this.pos.set(this.pm.pos.x, this.pm.pos.y, this.pm.pos.z);
      this.vel.set(d.dx / dt, d.dy / dt, d.dz / dt);
      if (this.once && this.pm.s >= this.pm.length - 1e-4) {
        // Bahnende: frei weiterrollen (mit dem letzten Schwung)
        this.pm = null;
      }
    } else {
      const g = this.grounded ? this.ground : null;
      if (g?.type === 'ramp') { const n = surfaceNormal(g, N); this.vel.x += n.x * 16 * dt; this.vel.z += n.z * 16 * dt; }
      const hv = Math.hypot(this.vel.x, this.vel.z);
      if (g && hv > 1e-4) { const nv = Math.max(0, hv - this.friction * dt); this.vel.x *= nv / hv; this.vel.z *= nv / hv; }
      const vx0 = this.vel.x, vz0 = this.vel.z;
      const res = this.moveWithGravity(dt, { gravity: 30, step: 0.2 });
      if (res.hitWall) {
        const n = res.wallNormal, d = vx0 * n.x + vz0 * n.z;
        if (d < 0) { this.vel.x = vx0 - n.x * d * 1.7; this.vel.z = vz0 - n.z * d * 1.7; }
      }
      if (this.removed) { this.removed = false; this.alive = true; this.fall(); return; }
      const hz = this.level.world.overlapAABB(this.center(), this.half, { filter: (s) => !!s.kill });
      if (hz.length) { this.fall(); return; }
    }
    const dist = Math.hypot(this.pos.x - ox, this.pos.z - oz);
    if (dist > 1e-5) { this.roll += dist / (this.size / 2); this.yaw = Math.atan2(-(this.pos.z - oz), this.pos.x - ox); }
  }

  fall() {
    if (this.respawnT > 0) { this.lost = 1e-3; return; }
    this.kill();
  }

  poof() {
    this.level.effects?.dust(this.center(), 6, 0.8);
    this.kill();
  }

  onPlayer() {
    if (this.hidden || this.lost) return 'none';
    return 'hurt';
  }

  onHit(kind) {
    if (this.hidden || this.lost) return;
    if (kind === 'star' || kind === 'mega' || kind === 'bomb' || kind === 'crush') {
      w6Sfx(this.level, 'brickbreak');
      this.level.effects?.debris(this.center(), 0x9aa0b0, 8);
      if (this.respawnT > 0 && kind !== 'crush') { this.lost = 1e-3; return; }
      this.kill();
      return;
    }
    w6Sfx(this.level, 'bump');
  }

  render(dt, t) {
    dt = visDt(this.level, this, dt);
    if (this.popT > 0) this.popT = Math.max(0, this.popT - dt);
    const m = this.model;
    if (!m) return;
    m.root.visible = !this.hidden && !this.lost;
    m.root.position.copy(this.pos);
    m.root.rotation.y = this.yaw;
    if (this.spin) this.spin.rotation.z = -this.roll;
    m.update?.(dt, { anim: 'roll', roll: this.roll, size: this.size });
  }

  info() { return { x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2), lost: !!this.lost, roll: +this.roll.toFixed(2) }; }
}

class StachelkugelQuelle extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'stachelkugel_quelle');
    this.touch = false;
    this.shadow = 0;
    this.every = spec.every ?? 3;
    this.t = this.every - (spec.phase ?? 0) - 0.01;
    this.spawned = 0;
    this.balls = [];
    this.running = !spec.idle;
    const d = spec.dir ?? [0, 1];
    const l = Math.hypot(d[0], d[1]) || 1;
    this.dir = { x: d[0] / l, z: d[1] / l };
    if (level.view) {
      const parts = [];
      const r = (spec.size ?? 1.2) * 0.75;
      const tube = new THREE.CylinderGeometry(r, r, 1.2, 18, 1, true); tube.rotateZ(Math.PI / 2);
      parts.push(colorize(tube.toNonIndexed(), (p, n, o) => mixc(lin(0x3a3e48), lin(0x8a90a0), smooth(-0.5, 0.8, n.y), o)));
      const rim = new THREE.TorusGeometry(r, 0.12, 8, 20); rim.rotateY(Math.PI / 2); rim.translate(0.6, 0, 0);
      parts.push(colorize(rim.toNonIndexed(), (p, n, o) => mixc(lin(0x8a6a2a), lin(0xffc83a), smooth(-0.6, 0.8, n.y), o)));
      const hole = new THREE.CircleGeometry(r * 0.96, 18); hole.rotateY(Math.PI / 2); hole.translate(0.55, 0, 0);
      parts.push(colorize(hole.toNonIndexed(), (p, n, o) => { o[0] = 0.02; o[1] = 0.02; o[2] = 0.03; }));
      const g = merge(parts);
      const m = new THREE.Mesh(g, level.view.mats.world);
      m.castShadow = true;
      m.position.y = r;
      const root = new THREE.Group();
      root.add(m);
      this.setModel({ root, update() {}, dispose() { g.dispose(); } });
      this.yaw = Math.atan2(-this.dir.z, this.dir.x);
    }
  }

  start() { this.running = true; }
  stop() { this.running = false; }

  update(dt) {
    if (this.hidden || !this.running) return;
    this.balls = this.balls.filter((b) => !b.removed);
    this.t += dt;
    if (this.t < this.every || this.balls.length >= (this.spec.max ?? 4)) return;
    this.t = 0;
    const sp = this.spec.speed ?? 4;
    const b = this.level.spawn('stachelkugel', {
      pos: [this.pos.x + this.dir.x * 0.8, this.pos.y, this.pos.z + this.dir.z * 0.8], size: this.spec.size ?? 1.2,
      vel: [this.dir.x * sp, this.dir.z * sp], life: this.spec.life ?? 14, path: this.spec.path, mode: this.spec.path ? 'once' : undefined, speed: sp,
    });
    if (b) { this.balls.push(b); this.spawned++; b.popT = 0.3; w6Sfx(this.level, 'pipe'); }
  }
}

// ------------------------------------------------------------------ Wurfball

const BALL_COL = { weiss: [0xf8f6f0, 0xd83a3a], rot: [0xe84a3a, 0xffffff], gelb: [0xffd23a, 0x3a5ae8] };

function ballModel(size, color) {
  if (hasModel('wurfball')) {
    // Registry-Ball hat Ø 0,5 m → auf size skalieren (innere Gruppe; die äußere skaliert der Auftritt)
    const m = getModel('wurfball', { color });
    const root = new THREE.Group(), inner = new THREE.Group();
    inner.scale.setScalar(size / 0.5);
    inner.add(m.root);
    root.add(inner);
    return { root, update: (dt, st) => m.update?.(dt, st), dispose: () => m.dispose?.() };
  }
  const [a, b] = (BALL_COL[color] ?? BALL_COL.weiss).map((c) => lin(c));
  const g = new THREE.SphereGeometry(size / 2, 18, 12);
  const geo = colorize(g.toNonIndexed(), (p, n, o) => {
    // Naht (zwei geschwungene Bänder wie beim Baseball)
    const seam = Math.abs(Math.sin(Math.atan2(n.z, n.x) * 2) * 0.55 - n.y) < 0.08;
    mixc(a, b, seam ? 1 : 0, o);
    const k = 0.85 + 0.15 * smooth(-1, 1, n.y);
    o[0] *= k; o[1] *= k; o[2] *= k;
  });
  const root = new THREE.Group();
  const spin = new THREE.Group();
  spin.position.y = size / 2;
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }));
  m.castShadow = true;
  spin.add(m);
  root.add(spin);
  return { root, spin, update() {}, dispose() { geo.dispose(); m.material.dispose(); } };
}

// Wurfball fliegt durch Einweg-, Auslöser- und Treibsand-Formen und durch Formen mit `ballPass` (Kraftfeld „nur Bälle“)
const BALL_IGNORE = (s) => s.oneWay || s.trigger || s.quicksand || s.ballPass;
const BALL_RAMP_AIR = 0.35;   // s Luftphase nach einem Hang-Kontakt, in der der Hangabtrieb weiter wirkt

class Wurfball extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'wurfball');
    this.size = spec.size ?? 0.45;
    const r = this.size / 2;
    this.half.set(r, r, r);
    this.carryable = true;
    this.holdStyle = 'front';
    this.pipeable = true;
    this.windK = 1;
    this.shadow = r * 1.1;
    this.home = this.pos.clone();
    this.thrown = false;
    this.thrower = null;
    this.flyT = 0;
    this.restT = 0;
    this.goneT = -1;
    this.hits = 0;
    this.lastHit = null;
    this.hitSet = new Set();
    this.roll = 0;
    this.bounces = 0;
    this.slopeAir = spec.slopeAir ?? BALL_RAMP_AIR;
    this.rampAir = this.slopeAir;
    this._touch = false;
    if (level.view) { const m = ballModel(this.size, spec.color ?? 'weiss'); this.spin = m.spin ?? null; this.setModel(m); }
  }

  onPickup() { this.thrown = false; this.goneT = -1; this.restT = 0; this.hitSet.clear(); }

  onThrow(player, o) {
    this.thrower = player;
    this.hitSet.clear();
    this.bounces = 0;
    this.restT = 0;
    if (o.gentle) { this.vel.set(o.dir.x * 1.2, 1.5, o.dir.z * 1.2); this.thrown = false; return; }
    const sp = this.spec.speed ?? 15;
    this.vel.set(o.dir.x * sp + player.vel.x * 0.3, (this.spec.lift ?? 3) + Math.max(0, player.vel.y * 0.3), o.dir.z * sp + player.vel.z * 0.3);
    this.thrown = true;
    this.flyT = 0;
    this.grounded = false;
  }

  onDrop() { this.vel.set(0, 2, 0); }

  update(dt) {
    if (this.hidden) return;
    if (this.goneT >= 0) {
      this.goneT += dt;
      const rs = this.spec.respawn ?? 1.5;
      if (rs > 0 && this.goneT >= rs) { this.goneT = -1; this.pos.copy(this.home); this.vel.set(0, 0, 0); this.thrown = false; this.restT = 0; this.popT = 0.45; this.level.effects?.sparks(this.center(), 8); }
      return;
    }
    if (this.followCarrier()) return;
    const ox = this.pos.x, oz = this.pos.z;
    const g = this.grounded ? this.ground : null;
    // Hangabtrieb am Boden – und in kurzen Luftphasen (Hüpfer) über dem Hang, den der Ball eben berührt hat
    // (Präzisierung „Motor-Feinschliff nach Welt 6“; vorher nur in Bodenschritten: auf steilen Hängen rollte er kaum an)
    let slope = g?.type === 'ramp' ? g : null;
    if (slope) this.rampAir = 0;
    else if (!g && this.rampAir < this.slopeAir && this.vel.y < 2) {
      this.rampAir += dt;
      const hit = this.level.world.raycastDown(this.pos.x, this.pos.y + 0.05, this.pos.z, 0.6, { ignore: BALL_IGNORE });
      if (hit?.shape.type === 'ramp') slope = hit.shape;
    } else if (g) this.rampAir = this.slopeAir;
    if (slope) { const n = surfaceNormal(slope, N); this.vel.x += n.x * 14 * dt; this.vel.z += n.z * 14 * dt; }
    if (g && !this.thrown) { const hv = Math.hypot(this.vel.x, this.vel.z); if (hv > 1e-4) { const nv = Math.max(0, hv - 2.5 * dt); this.vel.x *= nv / hv; this.vel.z *= nv / hv; } }
    const vx0 = this.vel.x, vy0 = this.vel.y, vz0 = this.vel.z;
    if (g?.conveyor) { this.pos.x += g.conveyor.x * dt; this.pos.z += g.conveyor.z * dt; }
    if (g?.mover) { this.pos.x += g.mover.dx; this.pos.y += g.mover.dy; this.pos.z += g.mover.dz; }
    this.vel.y = Math.max(this.vel.y - 22 * dt, -24);
    const c = this.center();
    const res = this.level.world.moveAABB(c, this.half, { x: this.vel.x * dt, y: this.vel.y * dt, z: this.vel.z * dt }, { step: 0.12, ignore: BALL_IGNORE });
    this.pos.set(c.x, c.y - this.half.y, c.z);
    const e = this.spec.bounce ?? 0.5;
    if (res.hitWall) {
      const n = res.wallNormal, d = vx0 * n.x + vz0 * n.z;
      if (d < 0) { this.vel.x = (vx0 - n.x * d * 2) * e; this.vel.z = (vz0 - n.z * d * 2) * e; this.bounces++; w6Sfx(this.level, 'bump'); }
      res.wallShape?.owner?.onBallHit?.(this, res.wallShape);
      res.wallShape?.owner?.onHit?.('throw', this);
    }
    if (res.grounded) {
      if (vy0 < -4) { this.vel.y = -vy0 * e; this.bounces++; this.grounded = false; }
      else { this.vel.y = 0; this.grounded = true; this.ground = res.ground; }
      this.vel.x *= this.thrown ? 0.92 : 1; this.vel.z *= this.thrown ? 0.92 : 1;
    } else { this.grounded = false; this.ground = null; }
    if (res.ceiling && this.vel.y > 0) { this.vel.y = -this.vel.y * 0.4; res.ceilingShape?.owner?.onBump?.(this); }
    const hv = Math.hypot(this.vel.x, this.vel.z);
    // trifft im Flug und beim schnellen Rollen (Hang hinab)
    if (hv > 2.5 || (this.thrown && this.vel.y > 2)) this.hitThings();
    if (this.thrown) { this.flyT += dt; if (this.grounded && hv <= 2.5) this.thrown = false; }
    if (this.grounded && hv < 0.3 && this.restT >= 0 && (this.flyT > 0 || this.thrower)) {
      this.restT += dt;
      const life = this.spec.life ?? 4;
      if (life > 0 && this.restT > life) this.vanish();
    }
    // Abgrund, Lava, Gift
    const hz = this.level.world.overlapAABB(this.center(), this.half, { filter: (s) => !!s.kill });
    if (this.pos.y < this.level.killY || hz.length) this.vanish();
    const dist = Math.hypot(this.pos.x - ox, this.pos.z - oz);
    if (dist > 1e-5) { this.roll += dist / (this.size / 2); this.yaw = Math.atan2(-(this.pos.z - oz), this.pos.x - ox); }
  }

  vanish() {
    if (this.goneT >= 0) return;
    this.level.effects?.dust(this.center(), 5, 0.6);
    this.goneT = 0;
    this.thrower = null;
    this.flyT = 0;
    if (!((this.spec.respawn ?? 1.5) > 0)) this.kill();
  }

  /** Treffer im Flug: Gegner, POW, Druckschalter, Stern, Münzen, Zielscheiben, Gong, onBallHit. */
  hitThings() {
    const L = this.level, c = this.center();
    for (const e of L.entities) {
      if (e === this || !e.alive || e.removed || e.hidden || this.hitSet.has(e) || e.carrier) continue;
      const dx = Math.abs(e.center().x - c.x) - e.half.x - this.half.x, dy = Math.abs(e.pos.y + e.half.y - c.y) - e.half.y - this.half.y, dz = Math.abs(e.center().z - c.z) - e.half.z - this.half.z;
      if (dx > 0.08 || dy > 0.08 || dz > 0.08) continue;
      let hit = false;
      if (e.onBallHit) { e.onBallHit(this); hit = true; }
      else if (e.kind === 'pow') { e.fire?.(); hit = true; }
      else if (e.kind === 'pswitch') { e.onPound?.(this.thrower); hit = true; }
      else if (e.kind === 'star' || e.kind === 'coin' || e.kind === 'bluecoin' || e.kind === 'starcoin' || e.kind === 'fallmuenze' || e.kind === 'schluesselmuenze') { if (this.thrower) e.onPlayer?.(this.thrower, {}); else e.collect?.(); }
      else if (e.enemy) { e.onHit?.('throw', this); hit = true; }
      if (!hit) continue;
      this.hitSet.add(e);
      this.hits++; this.lastHit = e.kind;
      w6Sfx(L, 'bump');
      L.effects?.sparks(c, 8);
      // abprallen
      this.vel.x *= -0.35; this.vel.z *= -0.35; this.vel.y = Math.max(this.vel.y, 3);
    }
    for (const gg of w6(L).gongs) {
      if (this.hitSet.has(gg)) continue;
      const q = gg.center;
      if (Math.hypot(q.x - c.x, q.y - c.y, q.z - c.z) < 1.2) { this.hitSet.add(gg); gg.ring('ball'); this.hits++; this.lastHit = 'gong'; this.vel.x *= -0.4; this.vel.z *= -0.4; }
    }
  }

  canCarry() { return this.goneT < 0; }

  render(dt) {
    dt = visDt(this.level, this, dt);
    if (this.popT > 0) this.popT = Math.max(0, this.popT - dt);
    const m = this.model;
    if (!m) return;
    m.root.visible = !this.hidden && this.goneT < 0;
    m.root.position.copy(this.pos);
    m.root.rotation.y = this.yaw;
    if (this.spin) this.spin.rotation.z = -this.roll;
    const k = this.popT > 0 ? 1 - this.popT / 0.45 : 1;
    m.root.scale.setScalar(Math.max(0.05, k));
    m.update?.(dt, { anim: this.carrier ? 'carried' : this.thrown ? 'thrown' : 'idle', roll: this.roll });
  }

  info() { return { x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2), thrown: this.thrown, hits: this.hits, lastHit: this.lastHit, gone: this.goneT >= 0, held: !!this.carrier }; }
}

// ------------------------------------------------------------------ Zielscheibe

function targetModel(size) {
  if (hasModel('zielscheibe')) return getModel('zielscheibe', { size });
  const R = size / 2;
  const red = lin(0xe83a3a), white = lin(0xffffff), back = lin(0x6a4a2a);
  // Rückseite (Holzscheibe) und Vorderseite aus Farbringen (je Ring flach gefärbt, blickt +X)
  const disc = new THREE.CylinderGeometry(R, R, 0.1, 28);
  disc.rotateZ(Math.PI / 2);
  const parts = [colorize(disc, (p, n, o) => { o[0] = back[0]; o[1] = back[1]; o[2] = back[2]; })];
  const N = 5;
  for (let i = 0; i < N; i++) {
    const r0 = (i / N) * R * 0.98, r1 = ((i + 1) / N) * R * 0.98;
    const g = i === 0 ? new THREE.CircleGeometry(r1, 24) : new THREE.RingGeometry(r0, r1, 28, 1);
    g.rotateY(Math.PI / 2);
    g.translate(0.052, 0, 0);
    const c = i % 2 ? white : red;
    parts.push(colorize(g, (p, n, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }));
  }
  const geo = merge(parts);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, emissive: 0x2aff4a, emissiveIntensity: 0 });
  const flip = new THREE.Group();
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  flip.add(m);
  const root = new THREE.Group();
  root.add(flip);
  return { root, flip, mat, update() {}, dispose() { geo.dispose(); mat.dispose(); } };
}

class Zielscheibe extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'zielscheibe');
    this.size = spec.size ?? 1.2;
    const R = this.size / 2;
    this.yaw = spec.yaw ?? -Math.PI / 2;
    const fx = Math.cos(this.yaw), fz = -Math.sin(this.yaw);
    // Hüllquader um die Scheibe (Mitte pos) – pos wird intern Fußpunkt (Mitte − R)
    this.pos.y -= R;
    this.half.set(Math.abs(fx) * 0.15 + Math.abs(fz) * R, R, Math.abs(fz) * 0.15 + Math.abs(fx) * R);
    this.touch = false;
    this.shadow = 0;
    this.group = spec.group ?? 'ziele';
    this.done = false;
    this.flipK = 0;
    this.resetT = 0;
    level.targets ??= {};
    const g = (level.targets[this.group] ??= { n: 0, of: 0, done: false, actions: [] });
    g.of++;
    if (spec.onAll) g.actions.push(spec.onAll);
    if (spec.stand > 0) this.addSolid({ type: 'box', min: [this.pos.x - 0.08, this.pos.y - spec.stand, this.pos.z - 0.08], max: [this.pos.x + 0.08, this.pos.y, this.pos.z + 0.08], tag: 'zielscheibe:pfosten' });
    this.addSolid({ type: 'box', min: [this.pos.x - this.half.x, this.pos.y, this.pos.z - this.half.z], max: [this.pos.x + this.half.x, this.pos.y + R * 2, this.pos.z + this.half.z], tag: 'zielscheibe', camIgnore: true });
    if (level.view) {
      const m = targetModel(this.size);
      this.flipG = m.flip ?? null; this.mat = m.mat ?? null;
      if (this.flipG) this.flipG.position.y = R;
      if (spec.stand > 0) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, spec.stand, 6), new THREE.MeshStandardMaterial({ color: 0x8a6a4a }));
        post.position.y = -spec.stand / 2;
        m.root.add(post);
      }
      this.setModel(m);
    }
  }

  onBallHit(ball) { this.strike('ball', ball); }
  onHit(kind, source) { if ((this.spec.by ?? 'ball') === 'alles' && kind !== 'pound') this.strike(kind, source); }
  onPound() { if ((this.spec.by ?? 'ball') === 'alles') this.strike('pound'); }

  strike(via) {
    if (this.done || this.hidden) return;
    this.done = true;
    this.resetT = 0;
    const g = this.level.targets[this.group];
    g.n++;
    w6Sfx(this.level, 'switch'); w6Sfx(this.level, 'coin');
    this.level.effects?.sparks(this.center(), 12);
    runAction(this.level, this.spec.onHit, { pos: [this.pos.x, this.pos.y + this.size + 0.5, this.pos.z], source: this, via });
    if (g.n >= g.of && !g.done) {
      g.done = true;
      w6Sfx(this.level, 'powerup_appear');
      for (const a of g.actions) runAction(this.level, a, { pos: [this.pos.x, this.pos.y + this.size + 1, this.pos.z], source: this });
    }
  }

  update(dt) {
    this.flipK += ((this.done ? 1 : 0) - this.flipK) * Math.min(1, dt * 8);
    if (this.done && this.spec.reset > 0 && !this.level.targets[this.group].done) {
      this.resetT += dt;
      if (this.resetT > this.spec.reset) { this.done = false; this.level.targets[this.group].n--; }
    }
  }

  render(dt, t) {
    super.render(dt, t);
    if (this.flipG) this.flipG.rotation.z = this.flipK * 1.25;   // getroffen: kippt nach hinten weg
    if (this.mat) this.mat.emissiveIntensity = this.flipK * 0.6;
  }
}

// ------------------------------------------------------------------ Pilz-Maske (Trage-Helm 'maske')

export const MASK = { angle: 75 };

function maskGeo() {
  const parts = [];
  // Pilzkappe über dem Kopf (rot mit weißen Tupfen), Gesichtsplatte vor dem Gesicht (hell, Augen, grimmige Brauen)
  const cap = new THREE.SphereGeometry(0.34, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  cap.scale(1, 0.75, 1);
  cap.translate(0, -0.06, 0);
  const red = lin(0xd8443a), redD = lin(0x9a2a24), white = lin(0xfff6ea);
  parts.push(colorize(cap.toNonIndexed(), (p, n, o) => {
    mixc(redD, red, smooth(-0.2, 0.9, n.y), o);
    for (const [x, y, z, r] of [[0, 0.2, 0, 0.09], [0.2, 0.08, 0.16, 0.07], [-0.18, 0.1, -0.18, 0.07], [-0.2, 0.06, 0.2, 0.06], [0.16, 0.12, -0.2, 0.06]]) if (Math.hypot(p.x - x, p.y - y, p.z - z) < r) mixc(o, white, 1, o);
  }));
  const rim = new THREE.TorusGeometry(0.33, 0.035, 6, 24); rim.rotateX(Math.PI / 2); rim.translate(0, -0.06, 0);
  parts.push(colorize(rim.toNonIndexed(), (p, n, o) => mixc(redD, red, 0.4, o)));
  const face = new THREE.SphereGeometry(0.2, 14, 10);
  face.scale(0.35, 0.95, 1.05);
  face.translate(0.25, -0.18, 0);
  const skin = lin(0xf0d8b0), dark = lin(0x2a1a14);
  parts.push(colorize(face.toNonIndexed(), (p, n, o) => {
    mixc(lin(0xd8b888), skin, smooth(-0.6, 0.8, n.x), o);
    if (n.x > 0.3) {
      for (const s of [-1, 1]) {
        if (Math.hypot(p.y + 0.14, p.z - s * 0.08) < 0.045) mixc(o, dark, 1, o);                       // Augen
        if (Math.abs(p.y + 0.07 - s * 0 + (p.z * s) * 0.4) < 0.015 && Math.abs(p.z - s * 0.08) < 0.07) mixc(o, dark, 1, o);   // Brauen
      }
      if (Math.abs(p.y + 0.27) < 0.012 && Math.abs(p.z) < 0.07) mixc(o, dark, 1, o);                    // Mund
    }
  }));
  return merge(parts);
}

function maskModel() {
  if (hasModel('helm_maske')) return getModel('helm_maske');
  if (hasModel('pilz_maske')) {
    // Registry-Maske als Kopf-Zubehör (Ursprung Kopfmitte, Gesicht +X); der Helm-Anker liegt ≈0,12 m über der Kopfmitte
    const m = getModel('pilz_maske', { mode: 'kopf', size: 0.46 });
    const root = new THREE.Group();
    m.root.position.y = -0.12;
    root.add(m.root);
    return { root, update: (dt, st) => m.update?.(dt, st), dispose: () => m.dispose?.() };
  }
  const geo = maskGeo();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 });
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  const root = new THREE.Group();
  root.add(m);
  return { root, update() {}, dispose() { geo.dispose(); mat.dispose(); } };
}

HELMETS.maske ??= {
  label: 'Pilz-Maske',
  icon: 0xd8443a,
  model: 'helm_maske',
  onWear(p) { p.helmetFx = { t: 0 }; },
  update(p, dt) { if (p.helmetFx) p.helmetFx.t += dt; },
  state() { return { anim: 'idle' }; },
  fallbackModel: () => maskModel(),
};

class MaskItem extends Gimmick {
  constructor(level, spec, kind) {
    super(level, spec, kind);
    this.half.set(0.32, 0.3, 0.32);
    this.shadow = 0.36;
    this.home = this.pos.clone();
    this.respawn = spec.respawn ?? 0;
    this.dropped = !!spec.dropped;
    if (Array.isArray(spec.vel)) this.vel.set(spec.vel[0], spec.vel[1], spec.vel[2]);
    this.bob = 0;
    this.yaw = spec.yaw ?? -Math.PI / 2;
    if (level.view) {
      this.regItem = !this.dropped && hasModel('pilz_maske');
      const item = this.regItem ? getModel('pilz_maske', { mode: 'item' }) : maskModel();
      if (!this.regItem) item.root.children.forEach((ch) => { ch.position.y += 0.42; });
      this.setModel(item);
    }
  }

  update(dt) {
    if (this.hidden) return;
    this.bob += dt;
    const res = this.moveWithGravity(dt, { gravity: 30 });
    if (this.grounded) { this.vel.x *= Math.max(0, 1 - dt * 6); this.vel.z *= Math.max(0, 1 - dt * 6); }
    if (res.hitWall) { this.vel.x *= -0.4; this.vel.z *= -0.4; }
  }

  onPlayer(player) {
    if (this.hidden || !this.alive || player.dead || player.mode === 'script') return 'none';
    if (player.helmet || player.helmetCooldown > 0) return 'none';
    if (!player.wearHelmet('maske')) return 'none';
    this.level.effects?.sparks(this.center(), 10);
    w6Sfx(this.level, 'powerup');
    if (this.respawn > 0 && !this.dropped) {
      const L = this.level, home = [this.home.x, this.home.y, this.home.z], respawn = this.respawn, kind = this.kind;
      let t = 0, done = false;
      const off = L.onStep((d) => { if (done) return; t += d; if (t < respawn) return; done = true; queueMicrotask(off); const e = L.spawn(kind, { pos: home, respawn }); if (e) e.popT = 0.45; });
    }
    this.kill();
    return 'collect';
  }

  render(dt, t) {
    super.render(dt, t);
    // eigene Optik: schweben und drehen (das Registry-Modell 'pilz_maske' im Modus item schwebt und dreht sich selbst)
    if (this.model && !this.hidden && !this.regItem) { this.model.root.position.y = this.pos.y + 0.04 + Math.sin(this.bob * 2.4) * 0.05; this.model.root.rotation.y = this.yaw + this.bob * 0.8; }
  }
}

// ------------------------------------------------------------------ Großer ?-Block (wächst zum Turm)

function towerTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#c8823a'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#a0602a';
  g.fillRect(0, 30, 64, 4); g.fillRect(30, 0, 4, 30); g.fillRect(0, 62, 64, 2); g.fillRect(14, 34, 4, 30); g.fillRect(46, 34, 4, 30);
  g.fillStyle = 'rgba(255,230,180,0.35)'; g.fillRect(2, 2, 26, 4); g.fillRect(36, 2, 26, 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

class Riesenfrageblock extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'riesenfrageblock');
    this.S = spec.size ?? 2;
    this.growTo = spec.grow ?? 6;
    this.speed = spec.speed ?? 3;
    this.height = 0;
    this.state = 'bereit';
    this.trig = new Set(spec.trigger ?? ['pound', 'bomb']);
    this.half.set(this.S / 2, this.S / 2, this.S / 2);
    this.touch = false;
    this.shadow = 0;
    this.mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: this.pos.x, cz: this.pos.z };
    const own = spec.attach ? {} : { mover: this.mover };
    this.blockShape = this.addSolid({ type: 'box', min: [0, 0, 0], max: [1, 1, 1], breakable: 'bomb', tag: 'riesenfrageblock', ...own });
    this.colShape = this.addSolid({ type: 'box', min: [0, 0, 0], max: [1, 1, 1], tag: 'riesenfrageblock:turm', ...own });
    this.place();
    if (level.view) this.buildView();
  }

  /** Formen aus pos/height (Turm unten, Block oben). */
  place() {
    const p = this.pos, S = this.S, h = this.height;
    const b = this.blockShape, c = this.colShape;
    b.min = [p.x - S / 2, p.y + h, p.z - S / 2]; b.max = [p.x + S / 2, p.y + h + S, p.z + S / 2];
    const hc = Math.max(0.01, h);
    c.min = [p.x - S / 2 + 0.05, p.y, p.z - S / 2 + 0.05]; c.max = [p.x + S / 2 - 0.05, p.y + hc, p.z + S / 2 - 0.05];
    for (const sh of [b, c]) if (sh.id && this.level.world.get(sh.id)) this.level.world.update(sh.id);
  }

  center(out = this._c) { return out.set(this.pos.x, this.pos.y + this.height + this.S / 2, this.pos.z); }

  /** Auslösen: Inhalt, dann wachsen. */
  grow(via = 'signal') {
    if (this.state !== 'bereit' || this.hidden) return false;
    this.state = 'waechst';
    this.via = via;
    w6Sfx(this.level, 'powerup_appear'); w6Sfx(this.level, 'blockhit');
    this.level.shake(0.3);
    const a = contentAction(this.spec.content ?? 'coins:5', null);
    runAction(this.level, a, { pos: [this.pos.x, this.pos.y + this.S + 0.6, this.pos.z], source: this });
    return true;
  }

  onPound(player, shape) { if (this.trig.has('pound') && (!shape || shape === this.blockShape)) this.grow('pound'); }
  onBump() { if (this.trig.has('bump')) this.grow('bump'); }
  onHit(kind) {
    if ((kind === 'bomb' && this.trig.has('bomb')) || (kind === 'mega' && this.trig.has('mega'))) this.grow(kind);
  }
  onCarried() { this.place(); }

  update(dt) {
    const m = this.mover;
    m.dx = m.dy = m.dz = m.vx = m.vy = m.vz = 0;
    if (this.state !== 'waechst') return;
    const dh = Math.min(this.growTo - this.height, this.speed * dt);
    this.height += dh;
    m.dy = dh; m.vy = dh / dt; m.cx = this.pos.x; m.cz = this.pos.z;
    this.place();
    if (Math.floor(this.height * 2) !== Math.floor((this.height - dh) * 2)) this.level.effects?.dust({ x: this.pos.x, y: this.pos.y, z: this.pos.z }, 4, 1);
    if (this.height >= this.growTo - 1e-6) {
      this.state = 'turm';
      w6Sfx(this.level, 'slam');
      runAction(this.level, this.spec.onGrow, { pos: [this.pos.x, this.pos.y + this.height + this.S + 1, this.pos.z], source: this });
    }
  }

  buildView() {
    const S = this.S;
    const root = new THREE.Group();
    let model = null;
    // Registry-Modell wächst selbst zum Turm (state.grow), sonst eigener ?-Block auf einer Ziegelsäule
    if (hasModel('riesen_frageblock')) { model = getModel('riesen_frageblock', { size: S, height: this.growTo }); root.add(model.root); this.regModel = true; }
    else {
      const q = blockTemplate('question'); q.scale.setScalar(S); root.add(q);
      const u = blockTemplate('used'); u.scale.setScalar(S); u.visible = false; root.add(u);
      this.qObj = q; this.uObj = u;
    }
    const tex = towerTexture();
    const col = new THREE.Mesh(new THREE.BoxGeometry(S - 0.1, 1, S - 0.1), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 }));
    col.castShadow = true; col.receiveShadow = true;
    col.visible = false;
    const group = new THREE.Group();
    group.add(root, col);
    this.colMesh = col; this.colTex = tex; this.blockRoot = root;
    this.setModel({ root: group, update: (dt, st) => model?.update?.(dt, st), dispose() { tex.dispose(); col.geometry.dispose(); col.material.dispose(); } });
  }

  render(dt, t) {
    dt = visDt(this.level, this, dt);
    if (this.popT > 0) this.popT = Math.max(0, this.popT - dt);
    if (!this.model) return;
    const g = this.model.root;
    g.visible = !this.hidden;
    g.position.copy(this.pos);
    const h = this.height;
    if (this.regModel) {
      this.colMesh.visible = false;
      this.model.update?.(dt, { anim: this.state === 'waechst' ? 'bump' : 'idle', grow: h / this.growTo });
      return;
    }
    this.blockRoot.position.y = h;
    this.colMesh.visible = h > 0.02;
    if (h > 0.02) { this.colMesh.scale.y = h; this.colMesh.position.y = h / 2; this.colTex.repeat.set(1, h / (this.S / 2)); }
    if (this.qObj) { const used = this.state !== 'bereit'; this.qObj.visible = !used; this.uObj.visible = used; }
    const bounce = this.state === 'waechst' ? Math.sin(t * 30) * 0.03 : 0;
    this.blockRoot.scale.set(1 + bounce, 1 - bounce, 1 + bounce);
  }

  info() { return { state: this.state, height: +this.height.toFixed(2), via: this.via ?? null }; }
}

// ------------------------------------------------------------------ Hüllen: Welt-6-Bausteine auch als kind

const BUILD = {
  kippschiff: buildKippschiff, kippsteg: buildKippsteg, wippe: buildWippe, schiebetuer: buildSchiebetuer, gong: buildGong,
  klettergitter: buildKlettergitter, windfeld: buildWindfeld, foerderband: buildFoerderband, quetschblock: buildQuetschblock,
  wolkenplattform: buildWolkenplattform, floss: buildFloss,
};

class BlockShell extends Gimmick {
  constructor(level, spec, kind) {
    super(level, spec, kind);
    this.touch = false;
    this.shadow = 0;
    this.handle = BUILD[kind]?.(level, { ...spec, type: kind }) ?? null;
    if (spec.id && this.handle) queueMicrotask(() => { if (level.named.get(spec.id) === this) level.named.set(spec.id, this.handle); });
  }
  info() { return this.handle?.info?.() ?? null; }
}

const shell = (kind) => (level, spec) => new BlockShell(level, spec, kind);

export const KINDS = {
  stachelkugel: (level, spec) => new Stachelkugel(level, spec),
  stachelkugel_quelle: (level, spec) => new StachelkugelQuelle(level, spec),
  wurfball: (level, spec) => new Wurfball(level, spec),
  zielscheibe: (level, spec) => new Zielscheibe(level, spec),
  pilz_maske: (level, spec) => new MaskItem(level, spec, 'pilz_maske'),
  helm_maske: (level, spec) => new MaskItem(level, { ...spec, dropped: spec.dropped ?? true }, 'helm_maske'),
  riesenfrageblock: (level, spec) => new Riesenfrageblock(level, spec),
  ...Object.fromEntries(Object.keys(BUILD).map((k) => [k, shell(k)])),
};
