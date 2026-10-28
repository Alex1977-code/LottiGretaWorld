// Gimmick-Entitäten Welt 7 „Lava-Festung“ (Präzisierung Motor und Bausteine Welt 7).
//
// lavablase – springt im Takt aus der Lava hoch und fällt zurück (Bauplan 7-1 „Lavablase (22)“, 7-Burg „Vorhof:
//   Lavablasen“). Kurz vorher brodelt die Lava an der Stelle (Vorwarnung). Steigt Kopf voran, dreht am Scheitel um und
//   fällt Kopf voran zurück; mit `to` springt sie im Bogen zu einem zweiten Lavapunkt und beim nächsten Mal zurück. Folgt
//   steigender/sinkender Lava (lavaTopAt). Jede Berührung in der Luft verletzt; unbesiegbar außer Funkelstern, Riesentrank,
//   Explosion. Reihen: count Blasen nebeneinander (spacing m entlang dir), je Glied um stagger Takt versetzt.
//   { kind: 'lavablase', pos: [x, y, z] (Lava-Oberfläche; y Standard: Lava dort), height: 4, period: 3 (s), phase: 0 (0..1),
//     warn: 0.6 (s Brodeln vorher), to: [x, z] (Bogen; Standard senkrecht), color: 'rot' | 'blau' (Standard: Lava dort),
//     size: 1 (Faktor), count: 1, spacing: 1.6, dir: [1, 0], stagger: 0.12, follow: true (Lava folgen), id }
//   Zustände: unten (unsichtbar, harmlos) | warn (brodelt) | oben (fliegt). Laufzeit: jumps, height(), info().
//   Modell 'lavablase' ({ color, size }, Ursprung Lava-Oberfläche bzw. Tropfen-Unterkante; state { anim: 'hidden' (unten) |
//   'swell' (Vorwarnung, grow 0..1) | 'jump' | 'fall' }) – sonst 'glutball' (Welt 5, state { anim: 'rise'|'fall'|'idle'|
//   'defeated' }) bzw. eigene Feuerkugel mit Augen.
//
// wurfsichel – Geschoss des Power-ups Wurfsichel (player/powers/sichel.js; nicht in Level-Daten): fliegt in Blickrichtung
//   (14 m/s) mit leichtem Bogen bis range m (oder bis zur ersten Wand) und kehrt zur Werferin zurück (fliegt dabei durch
//   Wände), die es fängt. Unterwegs: Gegner → e.onSichelHit?.(sichel) sonst e.onHit('throw', sichel) (sichel.sichel = true,
//   sichel.owner = Figur); Münzen, blaue/Stern-/Schlüsselmünzen, grüne Sterne, Stempel und Power-ups sammelt es für die
//   Werferin ein; ?-Blöcke/Ziegel/Kisten: onHit('shell'); POW, Druckschalter, Druckknopf, Gong; alles mit onSichelHit.
//   { kind: 'wurfsichel', pos (Unterkante der Sichel; Mitte = y + 0,16), dir: [dx, dz], owner: player, speed: 14, range:
//     7.5, curve: 0.7 (m seitlicher Bogen, + = nach rechts von der Flugrichtung), life: 3.5, catch: 0.9 (m Fangradius) }
//   Zustände: hin | zurueck. Laufzeit: hits, collected, caught, info(). Modell 'wurfsichel_geschoss' (state { spin }) –
//   sonst eigene Sichel (goldene Klinge mit Blütenstern).
//
// druckknopf – großer Knopf auf einem Sockel (statt P-Schalter; Bauplan 7-Burg „P-Schalter senkt die Brücke“):
//   Draufspringen/Stampfen, Wurfsichel, geworfene Dinge, Panzer, Explosion drücken ihn → onPress (einmal; once: false =
//   springt nach reset s wieder heraus). Kann versteckt liegen (hidden + reveal, z. B. hinter einer Blockwand).
//   { kind: 'druckknopf', pos, onPress: Aktion, once: true, reset: 4 (s, once false), color: 'blau' | 'rot', id, hidden }
//   Laufzeit: pressed, presses, press(via), info(). Modell 'push_switch' (state { anim: 'idle' | 'pressed' }).
//
// kiste_wasser – zerbrechliche Kiste unter Wasser (Bauplan 7-6 „enge Gänge mit zerbrechlichen Kisten“): fest, versperrt
//   Gänge. Zerbricht durch Rammfisch (onHit('ram')), Schwimmstoß der Figur (schwimmend mit ≥ dash m/s hinein), Wurfsichel,
//   Panzer, Bombe, Riesentrank, Funkelstern, Tatze, Stampfen; Inhalt (Münzen steigen als Blasen auf). Gestapelt möglich.
//   { kind: 'kiste_wasser', pos (Mitte der Unterseite), size: 1.2, content: 'coin' | 'coins:N' | Aktion | 'none',
//     dash: 3.2 (m/s), id, hidden }   Laufzeit: broken, by, info(). Modell 'zerbrechliche_kiste' ({ size }, state { break })
//   – sonst 'crate' der Registry.
//
// Hüllen: die Welt-7-Bausteine feuerstab, lava_fontaene, lavaspiegel, gitterboden, pfeilplattform, zylinder,
//   stachelwalze_rot, pendelstachel, klappstampfer, zugbruecke, schaltfelder, giftnebel sind auch als kind in
//   enemies/items erlaubt ({ kind: 'feuerstab', … }).

import * as THREE from 'three';
import { CourseEntity } from '../CourseEntity.js';
import { EnemyW2 } from '../EnemyW2.js';
import { Gimmick, runAction, contentAction, visDt, playerOn } from '../gimmick.js';
import { getModel, hasModel } from '../../models/index.js';
import { lavaTopAt, lavaColorAt, fireBallGeo, fireMaterial, TAU } from '../../blocks/w7kit.js';
import { buildFeuerstab, buildLavaFontaene } from '../../blocks/types/w7_fire.js';
import { buildLavaspiegel, buildGitterboden } from '../../blocks/types/w7_lava.js';
import { buildPfeilplattform, buildZylinder, buildStachelwalzeRot } from '../../blocks/types/w7_platforms.js';
import { buildPendelstachel, buildKlappstampfer } from '../../blocks/types/w7_traps.js';
import { buildZugbruecke, buildSchaltfelder } from '../../blocks/types/w7_castle.js';
import { buildGiftnebel } from '../../blocks/types/w7_escape.js';

const G = 38;

// =====================================================================================================================
// Lavablase
// =====================================================================================================================

function blaseModel(color, size) {
  if (hasModel('lavablase')) return { m: getModel('lavablase', { color, size }), own: false, reg: 'lavablase' };
  if (hasModel('glutball')) return { m: getModel('glutball', { color }), own: false, reg: 'glutball' };
  // eigene: glühende Kugel mit großen Augen (Kopf = +Y)
  const root = new THREE.Group();
  const inner = new THREE.Group();
  inner.position.y = 0.32 * size;
  root.add(inner);
  const bodyMat = new THREE.MeshBasicMaterial({ vertexColors: true });
  const body = new THREE.Mesh(fireBallGeo(color === 'blau' ? 'blau' : 'rot'), bodyMat);
  body.scale.setScalar(0.32 * size);
  inner.add(body);
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff }), black = new THREE.MeshBasicMaterial({ color: 0x1a1020 });
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.09 * size, 8, 6), white);
    e.position.set(0.2 * size, 0.1 * size, s * 0.11 * size);
    const pu = new THREE.Mesh(new THREE.SphereGeometry(0.05 * size, 6, 5), black);
    pu.position.set(0.27 * size, 0.1 * size, s * 0.1 * size);
    inner.add(e, pu);
  }
  const eyes = inner.children.filter((c) => c !== body).map((c) => c.geometry);
  return { m: { root, update() {}, dispose() { for (const g of eyes) g.dispose(); bodyMat.dispose(); white.dispose(); black.dispose(); } }, own: true, inner };
}

class Lavablase extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'lavablase');
    this.flying = true;
    this.wake = 0;
    const k = spec.size ?? 1;
    this.half.set(0.3 * k, 0.3 * k, 0.3 * k);
    this.shadow = 0;
    this.base = this.pos.clone();
    this.follow = spec.follow !== false;
    if (this.follow) { const y = lavaTopAt(level, this.base.x, this.base.z, this.base.y + 1.5); if (y !== null) this.base.y = y; }
    this.to = Array.isArray(spec.to) ? { x: spec.to[0], z: spec.to[spec.to.length > 2 ? 2 : 1] } : null;
    this.period = spec.period ?? 3;
    this.phase = (((spec.phase ?? 0) % 1) + 1) % 1;
    this.jump = spec.height ?? 4;
    this.warnT = spec.warn ?? 0.6;
    let g = G;
    const tFlight = (gg) => 2 * Math.sqrt((2 * this.jump) / gg);
    if (tFlight(g) > (this.period - this.warnT) * 0.9) g = (8 * this.jump) / ((this.period - this.warnT) * 0.9) ** 2;
    this.g = g;
    this.v0 = Math.sqrt(2 * g * this.jump);
    this.flight = tFlight(g);
    this.color = spec.color === 'rot' || spec.color === 'blau' ? spec.color : lavaColorAt(level, this.base.x, this.base.z);
    this.state = 'unten';
    this.jumps = 0;
    this.touch = false;
    this.warnK = 0;
    this.headDown = false;
    if (level.view) {
      const { m, own, inner, reg } = blaseModel(this.color, k);
      this.ownLook = own;
      this.regName = reg ?? null;
      this.inner = inner ?? null;
      this.setModel(m);
      this.model.root.visible = false;
      // Brodeln an der Austrittsstelle (Vorwarnung)
      const gm = new THREE.MeshBasicMaterial({ color: this.color === 'blau' ? 0x9af0ff : 0xffc040, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      this.warnMesh = new THREE.Mesh(new THREE.CircleGeometry(0.55 * k, 14), gm);
      this.warnMesh.rotation.x = -Math.PI / 2;
      this.warnMesh.renderOrder = 2;
      level.view.add(this.warnMesh);
    }
    this.track();
  }

  /** Zeit im Takt (0 … period): erst Warten, am Ende des Wartens Brodeln, dann Flug. */
  cycleT() { return ((((this.level.time / this.period + this.phase) % 1) + 1) % 1) * this.period; }
  cycleN() { return Math.floor(this.level.time / this.period + this.phase); }
  height() { return this.pos.y + this.half.y - this.base.y; }

  track() {
    if (this.follow) { const y = lavaTopAt(this.level, this.base.x, this.base.z, this.base.y + 1.5); if (y !== null) this.base.y = y; }
    const t = this.cycleT();
    const wait = this.period - this.flight;   // Flug am Ende des Takts
    // Bogen: gerade Takte hin, ungerade zurück
    const fwd = (this.cycleN() & 1) === 0;
    const A = this.to && !fwd ? this.to : { x: this.base.x, z: this.base.z };
    const B = this.to ? (fwd ? this.to : { x: this.base.x, z: this.base.z }) : A;
    if (t >= wait) {
      const ft = t - wait, u = ft / this.flight;
      const y = this.v0 * ft - 0.5 * this.g * ft * ft;
      if (this.state !== 'oben') {
        this.setState('oben'); this.jumps++;
        this.level.effects?.sparks({ x: A.x, y: this.base.y + 0.2, z: A.z }, 5);
        if (this.level.player && Math.hypot(this.level.player.pos.x - A.x, this.level.player.pos.z - A.z) < 12) this.level.sfx('blase');
      }
      this.pos.set(A.x + (B.x - A.x) * u, this.base.y + Math.max(-0.7, y) - this.half.y, A.z + (B.z - A.z) * u);
      this.vel.y = this.v0 - this.g * ft;
      this.vel.x = (B.x - A.x) / this.flight; this.vel.z = (B.z - A.z) / this.flight;
      this.touch = y > -0.15;
      this.headDown = this.vel.y < 0;
      this.warnK = 0;
    } else {
      const w = t > wait - this.warnT ? (t - (wait - this.warnT)) / Math.max(1e-3, this.warnT) : 0;
      const name = w > 0 ? 'warn' : 'unten';
      if (this.state !== name) {
        if (this.state === 'oben') this.level.effects?.sparks({ x: this.pos.x, y: this.base.y + 0.1, z: this.pos.z }, 4);
        this.setState(name);
      }
      this.warnK = w;
      this.pos.set(A.x, this.base.y - 1, A.z);
      this.vel.set(0, 0, 0);
      this.touch = false;
    }
  }

  update(dt) {
    this.stateT += dt;
    if (this.updateDefeat(dt)) return;
    this.track();
  }

  onPlayer() { return this.defeated || !this.touch ? 'none' : 'hurt'; }

  onHit(kind, source) {
    if (this.defeated || this.state !== 'oben') return;
    if (kind === 'star' || kind === 'mega' || kind === 'bomb') this.flip(source, 5);
  }

  modelState() {
    if (this.regName === 'lavablase') {
      // Modell 'lavablase' (Welt 7): versteckt in der Lava, schwillt bei der Vorwarnung an, springt als Tropfen
      if (this.state === 'flipped') return { anim: 'fall' };
      if (this.state === 'warn') return { anim: 'swell', grow: this.warnK };
      if (this.state === 'oben') return { anim: this.vel.y > 0 ? 'jump' : 'fall' };
      return { anim: 'hidden' };
    }
    if (this.state === 'flipped') return { anim: 'defeated' };
    return { anim: this.state === 'oben' ? (this.vel.y > 0 ? 'rise' : 'fall') : 'idle', warn: this.warnK };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    const up = this.state === 'oben' || this.state === 'flipped';
    if (this.regName === 'lavablase') {
      // Ursprung = Lava-Oberfläche (Blase) bzw. Unterkante des Tropfens (= Fußpunkt pos)
      this.model.root.visible = up || this.state === 'warn';
      if (!up) this.model.root.position.set(this.pos.x, this.base.y, this.pos.z);
    } else this.model.root.visible = up;
    if (this.ownLook && this.inner) this.inner.rotation.z = this.headDown ? Math.PI : 0;
    if (this.warnMesh) {
      const w = this.state === 'warn' ? this.warnK : 0;
      this.warnMesh.visible = w > 0;
      this.warnMesh.material.opacity = w * (0.5 + 0.5 * Math.sin(this.level.time * 30));
      this.warnMesh.scale.setScalar(0.6 + w * 0.6);
      const A = this.pos;
      this.warnMesh.position.set(A.x, this.base.y + 0.04, A.z);
    }
  }

  dispose() {
    if (this.warnMesh) { this.level.view?.remove(this.warnMesh); this.warnMesh.geometry.dispose(); this.warnMesh.material.dispose(); }
    super.dispose();
  }

  info() { return { state: this.state, y: +this.pos.y.toFixed(2), h: +this.height().toFixed(2), x: +this.pos.x.toFixed(2), z: +this.pos.z.toFixed(2), jumps: this.jumps, touch: this.touch, color: this.color, base: +this.base.y.toFixed(2) }; }
}

function makeBlasen(level, spec) {
  const n = Math.max(1, Math.round(spec.count ?? 1));
  const d = Array.isArray(spec.dir) ? spec.dir : [1, 0];
  const l = Math.hypot(d[0], d[1]) || 1;
  const dx = d[0] / l, dz = d[1] / l;
  const sp = spec.spacing ?? 1.6, st = spec.stagger ?? 0.12;
  const p = spec.pos ?? [0, 0, 0];
  const first = new Lavablase(level, { ...spec, count: 1 });
  for (let i = 1; i < n; i++) {
    level.spawn('lavablase', { ...spec, id: spec.id ? `${spec.id}_${i}` : undefined, count: 1, pos: [p[0] + dx * sp * i, p[1], p[2] + dz * sp * i], phase: (spec.phase ?? 0) - st * i });
  }
  return first;
}

// =====================================================================================================================
// Wurfsichel (Geschoss)
// =====================================================================================================================

const COLLECT = new Set(['coin', 'bluecoin', 'starcoin', 'fallmuenze', 'schluesselmuenze', 'star', 'stamp', 'powerup']);
const BLOCKS = new Set(['question', 'brick', 'coinblock', 'crate', 'kiste_wasser']);

function sichelModel() {
  if (hasModel('wurfsichel_geschoss')) return getModel('wurfsichel_geschoss');
  const root = new THREE.Group();
  const spin = new THREE.Group();
  root.add(spin);
  const blade = new THREE.MeshStandardMaterial({ color: 0xffd23a, roughness: 0.25, metalness: 0.5, emissive: 0x6a4a00, emissiveIntensity: 0.4 });
  const edge = new THREE.MeshStandardMaterial({ color: 0xf4f6ff, roughness: 0.2, metalness: 0.7 });
  const flower = new THREE.MeshStandardMaterial({ color: 0xff6ab0, roughness: 0.4, emissive: 0x5a1030, emissiveIntensity: 0.4 });
  const geos = [];
  // Sichelklinge: dicker Bogen (Torus-Ausschnitt), außen eine helle Schneide, flach liegend
  const g1 = new THREE.TorusGeometry(0.3, 0.075, 6, 18, Math.PI * 1.25); g1.scale(1, 1, 0.45); g1.rotateX(Math.PI / 2); geos.push(g1);
  const g2 = new THREE.TorusGeometry(0.36, 0.025, 4, 18, Math.PI * 1.2); g2.rotateX(Math.PI / 2); g2.rotateY(-0.03); geos.push(g2);
  const m1 = new THREE.Mesh(g1, blade), m2 = new THREE.Mesh(g2, edge);
  spin.add(m1, m2);
  // Blütenstern in der Mitte
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.07 : 0.15, a = (i / 10) * TAU; if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(r, 0); }
  const g3 = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: false }); g3.rotateX(-Math.PI / 2); g3.translate(0, -0.025, 0); geos.push(g3);
  spin.add(new THREE.Mesh(g3, flower));
  for (const o of spin.children) o.castShadow = true;
  return {
    root,
    update(dt, st) { spin.rotation.y = -(st?.spin ?? 0); },
    dispose() { for (const g of geos) g.dispose(); blade.dispose(); edge.dispose(); flower.dispose(); },
  };
}

export class Wurfsichel extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'wurfsichel');
    this.half.set(0.32, 0.16, 0.32);
    this.touch = false;
    this.shadow = 0.25;
    this.sichel = true;
    this.owner = spec.owner ?? null;
    this.speed = spec.speed ?? 14;
    this.range = spec.range ?? 7.5;
    this.curve = spec.curve ?? 0.7;
    this.life = spec.life ?? 3.5;
    this.catchR = spec.catch ?? 0.9;
    const d = spec.dir ?? [1, 0];
    const l = Math.hypot(d[0], d[1]) || 1;
    this.dir = { x: d[0] / l, z: d[1] / l };
    this.side = { x: -this.dir.z, z: this.dir.x };   // rechts von der Flugrichtung (Blick −Z → +X)
    this.origin = this.pos.clone();
    this.dist = 0;
    this.state = 'hin';
    this.age = 0;
    this.spin = 0;
    this.hits = 0;
    this.collected = 0;
    this.caught = false;
    this.hitSet = new Set();
    this.y0 = this.pos.y;
    if (level.view) this.setModel(sichelModel());
  }

  center(out = this._c) { return out.set(this.pos.x, this.pos.y + this.half.y, this.pos.z); }

  update(dt) {
    this.age += dt;
    this.spin += dt * 22;
    const o = this.owner;
    if (this.age > this.life || !o || o.dead || o.removedFigure) { this.poof(); return; }
    if (this.state === 'hin') {
      // vorwärts, gegen Ende langsamer; seitlicher Bogen über sin(π·s)
      const s0 = this.dist / this.range;
      const v = this.speed * Math.max(0.3, 1 - s0 * s0 * 0.8);
      this.dist += v * dt;
      const s = Math.min(1, this.dist / this.range);
      const lat = this.curve * Math.sin(Math.PI * s);
      const tx = this.origin.x + this.dir.x * this.dist + this.side.x * lat, tz = this.origin.z + this.dir.z * this.dist + this.side.z * lat;
      const c = this.center();
      const res = this.level.world.moveAABB(c, this.half, { x: tx - this.pos.x, y: 0, z: tz - this.pos.z }, { step: 0 });
      this.pos.set(c.x, c.y - this.half.y, c.z);
      this.vel.set((tx - this.pos.x) / dt, 0, (tz - this.pos.z) / dt);
      if (res.hitWall) {
        const ow = res.wallShape?.owner;
        if (ow && !this.hitSet.has(ow) && !ow.enemy) {
          if (typeof ow.onSichelHit === 'function') ow.onSichelHit(this);
          else if (typeof ow.onHit === 'function') ow.onHit('shell', this, res.wallShape);
        }
        this.turn();
        if (ow) this.hitSet.add(ow);
      } else if (s >= 1) this.turn();
    } else {
      // zurück zur Werferin (Brusthöhe), fliegt durch Wände
      const tx = o.pos.x, ty = o.pos.y + o.half.y * 1.5 - this.half.y, tz = o.pos.z;
      const dx = tx - this.pos.x, dy = ty - this.pos.y, dz = tz - this.pos.z;
      const d = Math.hypot(dx, dy, dz);
      const back = this.age - (this.turnAt ?? this.age);
      const v = Math.min(this.speed * 1.15, 4 + back * 22);
      if (d < this.catchR || d < v * dt) { this.catchBy(o); return; }
      this.vel.set((dx / d) * v, (dy / d) * v, (dz / d) * v);
      this.pos.x += this.vel.x * dt; this.pos.y += this.vel.y * dt; this.pos.z += this.vel.z * dt;
    }
    this.hitThings();
  }

  turn() {
    if (this.state !== 'hin') return;
    this.state = 'zurueck';
    this.turnAt = this.age;
    this.hitSet.clear();
  }

  catchBy(o) {
    this.caught = true;
    o.sichelCatch = (o.sichelCatch ?? 0) + 1;
    this.level.sfx('grab');
    this.kill();
  }

  poof() {
    if (this.removed) return;
    this.level.effects?.sparks(this.center(), 6);
    this.kill();
  }

  /** Treffer unterwegs (Kopfkommentar). */
  hitThings() {
    const L = this.level, c = this.center(), o = this.owner;
    for (const e of L.entities) {
      if (e === this || e === o || !e.alive || e.removed || e.hidden || e.carrier || this.hitSet.has(e)) continue;
      if (e.kind === 'wurfsichel') continue;
      const ec = e.center();
      if (Math.abs(ec.x - c.x) > e.half.x + this.half.x + 0.06 || Math.abs(ec.y - c.y) > e.half.y + this.half.y + 0.25 || Math.abs(ec.z - c.z) > e.half.z + this.half.z + 0.06) continue;
      let hit = false;
      if (typeof e.onSichelHit === 'function') { e.onSichelHit(this); hit = true; }
      else if (COLLECT.has(e.kind)) {
        if (e.kind === 'powerup' && e.emerge > 0) continue;
        if (o) e.onPlayer?.(o, {}); else e.collect?.();
        this.collected++;
        this.hitSet.add(e);
        continue;
      } else if (e.kind === 'pow') { e.fire?.(); hit = true; }
      else if (e.kind === 'pswitch') { e.onPound?.(o); hit = true; }
      else if (e.kind === 'druckknopf') { e.press?.('sichel'); hit = true; }
      else if (BLOCKS.has(e.kind)) { e.onHit?.('shell', this); hit = true; }
      else if (e.kind === 'zielscheibe') { e.onHit?.('throw', this); hit = true; }
      else if (e.enemy && e.touch !== false && !e.defeated) { e.onHit?.('throw', this); hit = true; }
      if (!hit) continue;
      this.hitSet.add(e);
      this.hits++;
      this.lastHit = e.kind;
      L.sfx('bump');
      L.effects?.sparks(c, 8);
    }
    for (const gg of L.w6?.gongs ?? []) {
      if (this.hitSet.has(gg)) continue;
      const q = gg.center;
      if (q && Math.hypot(q.x - c.x, q.y - c.y, q.z - c.z) < 1.2) { this.hitSet.add(gg); gg.ring?.('sichel'); this.hits++; this.lastHit = 'gong'; }
    }
  }

  modelState() { return { spin: this.spin, anim: this.state }; }

  render(dt) {
    if (!this.model) return;
    this.model.root.position.set(this.pos.x, this.pos.y + this.half.y, this.pos.z);
    this.model.update?.(dt, { spin: this.spin, anim: this.state });
  }

  info() { return { state: this.state, x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2), dist: +this.dist.toFixed(2), hits: this.hits, collected: this.collected, caught: this.caught, age: +this.age.toFixed(2) }; }
}

// =====================================================================================================================
// Druckknopf
// =====================================================================================================================

class Druckknopf extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'druckknopf');
    this.half.set(0.55, 0.3, 0.55);
    this.touch = false;
    this.pressed = false;
    this.presses = 0;
    this.once = spec.once !== false;
    this.resetT = 0;
    this.wasOn = false;
    const p = this.pos;
    this.base = this.addSolid({ type: 'box', min: [p.x - 0.6, p.y, p.z - 0.6], max: [p.x + 0.6, p.y + 0.55, p.z + 0.6], tag: 'druckknopf' });
    if (level.view) this.setModel(getModel('push_switch'));
  }

  onPound() { this.press('pound'); }

  onHit(kind) { if (kind === 'throw' || kind === 'shell' || kind === 'bomb' || kind === 'mega' || kind === 'pound' || kind === 'claw' || kind === 'fire') this.press(kind); }

  onSichelHit() { this.press('sichel'); }

  press(via = 'jump') {
    if (this.pressed || this.hidden) return false;
    this.pressed = true;
    this.presses++;
    this.via = via;
    this.resetT = this.spec.reset ?? 4;
    const s = this.base;
    s.max = [s.x1, this.pos.y + 0.2, s.z1];
    if (this.shapes.length) this.level.world.update(this.shapes[0]);
    this.level.sfx('switch');
    this.level.sfx('slam');
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 0.5, z: this.pos.z }, 12);
    runAction(this.level, this.spec.onPress, { pos: [this.pos.x, this.pos.y + 0.6, this.pos.z], source: this, via });
    return true;
  }

  update(dt) {
    if (this.hidden) return;
    const on = playerOn(this.level, this);
    if (on && !this.wasOn && (this.level.player?.lastLandVy ?? 0) < -2) this.press('jump');
    this.wasOn = on;
    if (this.pressed && !this.once) {
      this.resetT -= dt;
      if (this.resetT <= 0) {
        this.pressed = false;
        const s = this.base;
        s.max = [s.x1, this.pos.y + 0.55, s.z1];
        if (this.shapes.length) this.level.world.update(this.shapes[0]);
      }
    }
  }

  modelState() { return { anim: this.pressed ? 'pressed' : 'idle' }; }

  info() { return { pressed: this.pressed, presses: this.presses, via: this.via ?? null, hidden: this.hidden }; }
}

// =====================================================================================================================
// Zerbrechliche Kiste unter Wasser
// =====================================================================================================================

const BREAK = new Set(['ram', 'throw', 'shell', 'bomb', 'mega', 'star', 'claw', 'pound', 'fire', 'cannon', 'pow']);

class KisteWasser extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'kiste_wasser');
    const s = spec.size ?? 1.2;
    this.size = s;
    this.half.set(s / 2, s / 2, s / 2);
    this.touch = false;
    this.content = contentAction(spec.content, { coins: 1 });
    this.broken = false;
    this.dash = spec.dash ?? 3.2;
    const p = this.pos;
    this.addSolid({ type: 'box', min: [p.x - s / 2, p.y, p.z - s / 2], max: [p.x + s / 2, p.y + s, p.z + s / 2], breakable: true, tag: 'kiste_wasser' });
    this.breakT = 0;
    this.regLook = hasModel('zerbrechliche_kiste');
    if (level.view) this.setModel(this.regLook ? getModel('zerbrechliche_kiste', { size: s }) : getModel('crate', { size: s }));
  }

  onHit(kind, source) {
    if (!BREAK.has(kind) || this.broken) return;
    if (kind === 'pound' && source?.pos && !(source.pos.y >= this.pos.y + this.size - 0.35)) return;
    this.smash(kind);
  }

  onSichelHit() { this.smash('sichel'); }

  /** Schwimmstoß gegen die Kiste (Player.move ruft onPush mit der Geschwindigkeit in die Wand). */
  onPush(player, dir, speed) { if (player?.mode === 'swim' && speed >= this.dash * 0.8) this.smash('swim'); }

  smash(by) {
    if (this.broken) return;
    this.broken = true;
    this.by = by;
    this.removeShapes();
    this.solids.length = 0;
    const c = { x: this.pos.x, y: this.pos.y + this.size / 2, z: this.pos.z };
    this.level.sfx('brickbreak');
    this.level.effects?.debris(c, 0xb8864a, 10);
    this.level.effects?.splash?.(c, c.y + 0.5);
    runAction(this.level, this.content, { pos: [c.x, c.y + 0.3, c.z], source: this, via: by });
    this.breakT = 0.35;
    if (!this.model) this.kill();
  }

  update(dt) {
    if (this.broken) { this.breakT -= dt; if (this.breakT <= 0) this.kill(); return; }
    if (this.hidden) return;
    // Schwimmstoß: schwimmende Figur stößt schnell hinein
    for (const f of this.level.players ?? [this.level.player]) {
      if (!f || f.dead || f.mode !== 'swim') continue;
      const v = Math.hypot(f.vel.x, f.vel.y, f.vel.z);
      if (v < this.dash) continue;
      const h = f.half, p = f.pos, s = this.size / 2 + 0.12;
      if (Math.abs(p.x - this.pos.x) < h.x + s && Math.abs(p.z - this.pos.z) < h.z + s && p.y + h.y * 2 > this.pos.y - 0.12 && p.y < this.pos.y + this.size + 0.12) { this.smash('swim'); break; }
    }
  }

  render(dt, t) {
    super.render(dt, t);
    if (this.broken && this.model && !this.regLook) { const k = Math.max(0.01, this.breakT / 0.35); this.model.root.scale.set(1 + (1 - k) * 0.4, k, 1 + (1 - k) * 0.4); }
  }

  modelState() { return { break: this.broken ? Math.min(1, 1 - this.breakT / 0.35) : 0, anim: 'idle' }; }

  info() { return { broken: this.broken, by: this.by ?? null }; }
}

// =====================================================================================================================
// Hüllen: Welt-7-Bausteine auch als kind
// =====================================================================================================================

const BUILD = {
  feuerstab: buildFeuerstab, lava_fontaene: buildLavaFontaene, lavaspiegel: buildLavaspiegel, gitterboden: buildGitterboden,
  pfeilplattform: buildPfeilplattform, zylinder: buildZylinder, stachelwalze_rot: buildStachelwalzeRot, pendelstachel: buildPendelstachel,
  klappstampfer: buildKlappstampfer, zugbruecke: buildZugbruecke, schaltfelder: buildSchaltfelder, giftnebel: buildGiftnebel,
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
  lavablase: makeBlasen,
  wurfsichel: (level, spec) => new Wurfsichel(level, spec),
  druckknopf: (level, spec) => new Druckknopf(level, spec),
  kiste_wasser: (level, spec) => new KisteWasser(level, spec),
  ...Object.fromEntries(Object.keys(BUILD).map((k) => [k, shell(k)])),
};
