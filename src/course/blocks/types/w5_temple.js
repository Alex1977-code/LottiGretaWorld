// Kippquader (Bauplan 5-Burg „Ruinen-Tempel mit Kippquadern“; Gegner-Katalog „Kippquader: fällt um, Loch im Rahmen“).
//
// kippquader – großer Steinquader, der in seiner Laufrichtung über die vordere Unterkante kippt (Vierteldrehung, wird
//   dabei schneller: Aufschlag), dann `wait` s ruht und weiterkippt – Bahn auf einem Raster aus Richtungen. Stehend
//   wird er liegend, liegend wieder stehend (wie ein rollender Würfel aus ungleichen Kanten). Vor jedem Kippen zittert er
//   `warn` s und zeigt mit `hint` einen roten Landeboden-Hinweis (blocks/w5kit.js landingHint) dort, wo er aufschlägt.
//   - Man kann auf ihm stehen (feste Quader, Oberseite begehbar). Steht eine Figur auf ihm, wenn er kippt, wird sie
//     mitgenommen (gesteuerter Ablauf, solo) und landet auf seiner neuen Oberseite.
//   - Kippt er auf eine Figur (sie steckt beim Aufschlag im neuen Körper), ist das ein Treffer (player.hurt) und sie wird
//     hinausgeschoben; Gegner darunter bekommen onHit('mega'). Mit `hole` (Rahmen mit Loch, wie im Vorbild) ist die
//     Stelle im Loch sicher.
//   { type: 'kippquader', id, pos: [x, y, z] (Mitte der Unterseite), size: [sx, sy, sz] ([2, 4, 2]; lokal: Breite,
//     Höhe, Tiefe – stehend), hole: [w, h] (optional: Loch durch die Tiefe, z. B. [1.6, 1.6]), steps: ['-z', '-z', …]
//     (Kipprichtungen der Bahn; Standard ['-z', '-z']), mode: 'pingpong' (Standard: hin und zurück) | 'loop' | 'once',
//     wait: 1.2 (s Ruhe), turn: 0.55 (s Kippen), warn: 0.7 (s Zittern + Hinweis), phase: 0 (s Versatz beim Start),
//     start: 'auto' | 'near' (sobald eine Figur near m nah ist) | 'signal' ({ start: id } bzw. tip(dir)), near: 9,
//     hint: true, style: 'tempel' | 'stein', face: true (Gesicht vorn, blaues Rückenfeld hinten) }
//   level.named.get(id) = { state ('wait' | 'warn' | 'tip' | 'done'), tips, hits, carried, box (Hüllquader), boxes,
//     nextRects() (Grundrisse nach dem nächsten Kippen), tip(dir) (sofort kippen, 'signal'), start(), stop(), hint
//     (landingHint), onLand(fn(boxes)) → abmelden, info() } – Schnittstelle für den Kippquader-König (Gegner-Agent).
// Modell aus der Registry, sobald es den Namen gibt: 'kippquader' ({ size, hole, style }, Ursprung = Mitte des Körpers,
// state { anim: 'idle' | 'warn' | 'tip', k }); sonst eigene Geometrie.

import * as THREE from 'three';
import { v3, lin, mixc, smooth, colorize, merge, hex, box, addObject } from '../kit.js';
import { figures } from '../w2kit.js';
import { penetrates } from '../w4kit.js';
import { landingHint, rot90 } from '../w5kit.js';
import { visDt } from '../../entities/gimmick.js';
import { hasModel, getModel } from '../../models/index.js';

const DIRS = { '+x': [1, 0], '-x': [-1, 0], '+z': [0, 1], '-z': [0, -1] };
const NEG = { '+x': '-x', '-x': '+x', '+z': '-z', '-z': '+z' };
const STYLE = {
  tempel: { body: 0xd8b878, dark: 0x8a6a3e, edge: 0xf0dcae, back: 0x4aa8ff, eye: 0x2a2030 },
  stein: { body: 0xb8b4c0, dark: 0x6a6676, edge: 0xdedae6, back: 0x4aa8ff, eye: 0x1e1a28 },
};

/** Lokale Teilquader (Mitte des Körpers im Ursprung): ganz oder als Rahmen um ein Loch durch die Tiefe (lokal z). */
function localParts(sx, sy, sz, hole) {
  if (!hole) return [{ min: [-sx / 2, -sy / 2, -sz / 2], max: [sx / 2, sy / 2, sz / 2] }];
  const hw = Math.min(sx - 0.4, hole[0]) / 2, hh = Math.min(sy - 0.4, hole[1]) / 2;
  return [
    { min: [-sx / 2, -sy / 2, -sz / 2], max: [-hw, sy / 2, sz / 2] },
    { min: [hw, -sy / 2, -sz / 2], max: [sx / 2, sy / 2, sz / 2] },
    { min: [-hw, hh, -sz / 2], max: [hw, sy / 2, sz / 2] },
    { min: [-hw, -sy / 2, -sz / 2], max: [hw, -hh, sz / 2] },
  ];
}

const _v = new THREE.Vector3();
/** Weltquader eines lokalen Teils unter der Drehung R (Matrix4, 90°-Raster) und der Mitte c. */
function worldBox(part, R, c) {
  const b = { x0: Infinity, y0: Infinity, z0: Infinity, x1: -Infinity, y1: -Infinity, z1: -Infinity };
  for (let i = 0; i < 8; i++) {
    _v.set(i & 1 ? part.max[0] : part.min[0], i & 2 ? part.max[1] : part.min[1], i & 4 ? part.max[2] : part.min[2]).applyMatrix4(R);
    b.x0 = Math.min(b.x0, _v.x + c.x); b.x1 = Math.max(b.x1, _v.x + c.x);
    b.y0 = Math.min(b.y0, _v.y + c.y); b.y1 = Math.max(b.y1, _v.y + c.y);
    b.z0 = Math.min(b.z0, _v.z + c.z); b.z1 = Math.max(b.z1, _v.z + c.z);
  }
  return b;
}

function hull(boxes) {
  const h = { x0: Infinity, y0: Infinity, z0: Infinity, x1: -Infinity, y1: -Infinity, z1: -Infinity };
  for (const b of boxes) { h.x0 = Math.min(h.x0, b.x0); h.y0 = Math.min(h.y0, b.y0); h.z0 = Math.min(h.z0, b.z0); h.x1 = Math.max(h.x1, b.x1); h.y1 = Math.max(h.y1, b.y1); h.z1 = Math.max(h.z1, b.z1); }
  return h;
}

/** Körper-Geometrie (lokal): Steinquader mit Kanten, vorn (lokal −z) ein Gesicht, hinten (lokal +z) das blaue Rückenfeld. */
function bodyGeo(parts, sx, sy, sz, style, face) {
  const S = STYLE[style] ?? STYLE.tempel;
  const body = lin(hex(S.body)), dark = lin(hex(S.dark)), edge = lin(hex(S.edge)), back = lin(hex(S.back)), eye = lin(hex(S.eye));
  const geos = [];
  for (const p of parts) {
    const w = p.max[0] - p.min[0], h = p.max[1] - p.min[1], d = p.max[2] - p.min[2];
    const g = box(w, h, d, (p.min[0] + p.max[0]) / 2, (p.min[1] + p.max[1]) / 2, (p.min[2] + p.max[2]) / 2, S.body, { r: 0.09, seg: 2 });
    geos.push(colorize(g, (q, n, o) => {
      const ex = Math.min(sx / 2 - Math.abs(q.x), sy / 2 - Math.abs(q.y), sz / 2 - Math.abs(q.z));
      mixc(body, dark, 0.25 + 0.35 * smooth(0.6, -0.6, n.y + n.x * 0.3), o);
      // Steinfugen (Raster 1 m) und helle Kanten
      const gx = Math.abs(((q.x + 50) % 1) - 0.5) > 0.47, gy = Math.abs(((q.y + 50) % 1) - 0.5) > 0.47;
      if ((gx || gy) && Math.abs(n.z) > 0.5) mixc(o, dark, 0.45, o);
      if (ex < 0.12) mixc(o, edge, 0.55, o);
      if (face !== false && n.z > 0.5 && Math.abs(q.x) < sx / 2 - 0.3 && Math.abs(q.y) < sy / 2 - 0.3) mixc(o, back, 0.8, o);
    }));
  }
  if (face !== false) {
    // Gesicht vorn: zwei Augenhöhlen und grimmige Brauen (lokal −z)
    const ey = sy * 0.18, ex = Math.min(sx * 0.24, 0.7);
    for (const s of [-1, 1]) {
      const e = new THREE.CircleGeometry(Math.min(0.28, sx * 0.12), 12);
      e.rotateY(Math.PI);
      e.translate(s * ex, ey, -sz / 2 - 0.012);
      geos.push(colorize(e.toNonIndexed(), (q, n, o) => { o[0] = eye[0]; o[1] = eye[1]; o[2] = eye[2]; }));
      const b = new THREE.BoxGeometry(Math.min(0.62, sx * 0.28), 0.12, 0.06);
      b.rotateZ(s * 0.35);
      b.translate(s * ex, ey + 0.36, -sz / 2 - 0.02);
      geos.push(colorize(b.toNonIndexed(), (q, n, o) => { o[0] = dark[0]; o[1] = dark[1]; o[2] = dark[2]; }));
    }
    const m = new THREE.BoxGeometry(Math.min(1.1, sx * 0.5), 0.14, 0.06);
    m.translate(0, -sy * 0.12, -sz / 2 - 0.02);
    geos.push(colorize(m.toNonIndexed(), (q, n, o) => { o[0] = eye[0]; o[1] = eye[1]; o[2] = eye[2]; }));
  }
  return merge(geos);
}

class Kippquader {
  constructor(level, spec) {
    this.level = level;
    this.spec = spec;
    const p = v3(spec.pos);
    const s = spec.size ?? [2, 4, 2];
    this.size = s;
    this.parts = localParts(s[0], s[1], s[2], spec.hole ?? null);
    this.R = new THREE.Matrix4();          // Körper → Welt (90°-Raster)
    this.c = new THREE.Vector3(p.x, p.y + s[1] / 2, p.z);
    this.home = { c: this.c.clone(), R: this.R.clone() };
    this.steps = (spec.steps ?? ['-z', '-z']).filter((d) => DIRS[d]);
    this.mode = spec.mode ?? 'pingpong';
    this.wait = spec.wait ?? 1.2; this.turn = spec.turn ?? 0.55; this.warnT = spec.warn ?? 0.7;
    this.startMode = spec.start ?? 'auto';
    this.near = spec.near ?? 9;
    this.state = 'wait';
    this.t = -(spec.phase ?? 0);
    this.idx = 0; this.dirSign = 1;          // pingpong: Richtung durch die Schrittliste
    this.running = this.startMode === 'auto';
    this.tips = 0; this.hits = 0; this.carried = 0;
    this.sids = [];
    this.riders = [];
    this.landFns = new Set();
    this.anim = null;                       // { dir, k, pivot, axis, sign, R0, c0 }
    this.queue = null;
    this.hint = spec.hint === false ? null : landingHint(level);
    this.place();
    if (spec.id) level.named.set(spec.id, this);
    level.onStep((dt) => this.step(dt));
    if (level.view) this.buildView();
  }

  get boxes() { return this.parts.map((pt) => worldBox(pt, this.R, this.c)); }
  get box() { return hull(this.boxes); }

  /** Kollisionsformen an die aktuelle Lage setzen (feste Quader, Oberseite begehbar). */
  place() {
    for (const id of this.sids) this.level.world.remove(id);
    this.sids = [];
    for (const b of this.boxes) {
      this.sids.push(this.level.world.add({ type: 'box', min: [b.x0, b.y0, b.z0], max: [b.x1, b.y1, b.z1], tag: 'kippquader', owner: this, camIgnore: true, noWallSlide: false }));
    }
  }

  unplace() { for (const id of this.sids) this.level.world.remove(id); this.sids = []; }

  /** Nächste Kipprichtung der Bahn (ohne weiterzuzählen) oder null (Ende bei 'once'). */
  peekDir() {
    if (this.queue) return this.queue;
    if (!this.steps.length) return null;
    const d = this.steps[this.idx];
    return this.dirSign > 0 ? d : NEG[d];
  }

  advance() {
    if (this.queue) { this.queue = null; return; }
    const n = this.steps.length;
    if (this.mode === 'loop') { this.idx = (this.idx + 1) % n; return; }
    if (this.mode === 'once') { this.idx++; if (this.idx >= n) { this.idx = n - 1; this.state = 'done'; } return; }
    // pingpong: vorwärts durch die Liste, dann rückwärts mit umgekehrten Richtungen
    if (this.dirSign > 0) { if (this.idx < n - 1) this.idx++; else this.dirSign = -1; }
    else if (this.idx > 0) this.idx--; else this.dirSign = 1;
  }

  /** Drehachse, Drehsinn und Kippkante für die Richtung dir (aus dem aktuellen Hüllquader). */
  pivotFor(dir) {
    const [dx, dz] = DIRS[dir];
    const h = this.box;
    // Achse = oben × Richtung: −z → −x, +z → +x, +x → −z, −x → +z (jeweils +90°)
    if (dz) return { axis: 'x', sign: dz < 0 ? -1 : 1, pivot: new THREE.Vector3(0, h.y0, dz < 0 ? h.z0 : h.z1), dx, dz };
    return { axis: 'z', sign: dx > 0 ? -1 : 1, pivot: new THREE.Vector3(dx > 0 ? h.x1 : h.x0, h.y0, 0), dx, dz };
  }

  /** Lage nach dem Kippen in Richtung dir: { R, c, boxes }. */
  afterTip(dir) {
    const P = this.pivotFor(dir);
    const Rq = rot90(P.axis, P.sign);
    const R = new THREE.Matrix4().multiplyMatrices(Rq, this.R);
    const rel = this.c.clone().sub(P.pivot);
    if (P.axis === 'x') rel.x = 0; else rel.z = 0;
    rel.applyMatrix4(Rq);
    const c = this.c.clone();
    if (P.axis === 'x') { c.y = P.pivot.y + rel.y; c.z = P.pivot.z + rel.z; } else { c.y = P.pivot.y + rel.y; c.x = P.pivot.x + rel.x; }
    // ganzzahlige Ränder (Raster 0,01 m) gegen Rundungsfehler
    c.set(Math.round(c.x * 100) / 100, Math.round(c.y * 100) / 100, Math.round(c.z * 100) / 100);
    return { R, c, boxes: this.parts.map((pt) => worldBox(pt, R, c)), pivot: P };
  }

  /** Grundrisse nach dem nächsten Kippen (für den roten Landeboden-Hinweis). */
  nextRects() {
    const d = this.peekDir();
    if (!d) return [];
    return this.afterTip(d).boxes.map((b) => ({ x0: b.x0, z0: b.z0, x1: b.x1, z1: b.z1 }));
  }

  /** Sofort in Richtung dir kippen (Signal/Boss); ohne dir die nächste der Bahn. */
  tip(dir) {
    if (this.state === 'tip') return false;
    if (dir) this.queue = dir;
    this.running = true;
    this.state = 'warn'; this.t = this.wait;
    return true;
  }

  start() { this.running = true; }
  stop() { this.running = false; }
  onLand(fn) { this.landFns.add(fn); return () => this.landFns.delete(fn); }

  step(dt) {
    if (this.state === 'done') return;
    if (!this.running) {
      if (this.startMode === 'near') {
        const h = this.box, cx = (h.x0 + h.x1) / 2, cz = (h.z0 + h.z1) / 2;
        if (figures(this.level).some((f) => Math.hypot(f.pos.x - cx, f.pos.z - cz) < this.near)) this.running = true;
      }
      if (!this.running) return;
    }
    this.t += dt;
    if (this.state === 'wait') {
      if (this.t >= this.wait - this.warnT && this.peekDir()) {
        this.state = 'warn';
        if (this.hint) this.hint.show(this.nextRects(), this.box.y0, 0.4);
        this.level.sfx('rumble');
      }
      return;
    }
    if (this.state === 'warn') {
      const k = Math.min(1, (this.t - (this.wait - this.warnT)) / Math.max(0.05, this.warnT));
      if (this.hint) this.hint.show(this.nextRects(), this.box.y0, 0.4 + 0.6 * k);
      if (this.t >= this.wait) this.beginTip();
      return;
    }
    if (this.state === 'tip') this.updateTip(dt);
  }

  beginTip() {
    const dir = this.peekDir();
    if (!dir) { this.state = 'done'; this.hint?.hide(); return; }
    const after = this.afterTip(dir);
    this.anim = { dir, k: 0, after, R0: this.R.clone(), c0: this.c.clone() };
    this.state = 'tip';
    this.t = 0;
    // Mitfahrer: Figuren, die auf ihm stehen
    this.riders = [];
    for (const f of figures(this.level)) {
      if (f.mode !== 'ground' || f.ground?.owner !== this) continue;
      this.riders.push({ f, p0: f.pos.clone() });
      this.carry(f);
    }
    this.unplace();
  }

  /** Mitfahrt: gesteuerter Ablauf (solo), die Figur folgt der Drehung und landet auf der neuen Oberseite. */
  carry(f) {
    const self = this;
    const r = this.riders[this.riders.length - 1];
    this.carried++;
    f.ride({
      step(q) {
        const a = self.anim;
        if (!a) return true;
        const P = a.after.pivot, ang = (Math.PI / 2) * P.sign * self.ease(a.k);
        const rel = r.p0.clone().sub(P.pivot);
        const m = new THREE.Matrix4();
        if (P.axis === 'x') { rel.x = 0; m.makeRotationX(ang); } else { rel.z = 0; m.makeRotationZ(ang); }
        rel.applyMatrix4(m);
        const rot = r.p0.clone();
        if (P.axis === 'x') { rot.y = P.pivot.y + rel.y; rot.z = P.pivot.z + rel.z; } else { rot.y = P.pivot.y + rel.y; rot.x = P.pivot.x + rel.x; }
        // Ziel: auf der neuen Oberseite (über dem Hüllquader), etwas nach innen
        const h = hull(a.after.boxes), inset = 0.35;
        const tx = Math.min(h.x1 - inset, Math.max(h.x0 + inset, rot.x)), tz = Math.min(h.z1 - inset, Math.max(h.z0 + inset, rot.z));
        const w = smooth(0.35, 1, a.k);
        q.pos.set(rot.x + (tx - rot.x) * w, Math.max(rot.y, h.y1 * w + rot.y * (1 - w)) + 0.02, rot.z + (tz - rot.z) * w);
        q.vel.set(0, 0, 0);
        q.setState('fall');
        return a.k >= 1;
      },
      exit(q) { q.vel.set(0, -1, 0); },
    }, { state: 'fall', kind: 'kippquader', solo: true });
  }

  ease(k) { return k * k; }   // wird schneller (Aufschlag)

  updateTip(dt) {
    const a = this.anim;
    a.k = Math.min(1, a.k + dt / this.turn);
    if (a.k < 1) return;
    // Aufschlag: neue Lage, Formen, Treffer
    this.R.copy(a.after.R);
    this.c.copy(a.after.c);
    this.anim = null;
    this.tips++;
    this.hint?.hide();
    const boxes = this.boxes;
    const riders = new Set(this.riders.map((r) => r.f));
    for (const f of figures(this.level)) {
      if (riders.has(f) || f.mode === 'script') continue;
      const hitBox = boxes.find((b) => penetrates(f.pos, f.half, b, 0.05));
      if (!hitBox) continue;
      this.hits++;
      const h = hull(boxes);
      f.hurt({ pos: { x: (h.x0 + h.x1) / 2, y: h.y0, z: (h.z0 + h.z1) / 2 }, kippquader: this });
      this.pushOut(f, boxes);
    }
    for (const e of this.level.entities) {
      if (!e.enemy || !e.alive || e.defeated || e.removed) continue;
      if (boxes.some((b) => penetrates(e.pos, e.half, b, 0.05))) e.onHit?.('mega', this);
    }
    this.place();
    this.riders = [];
    const h = hull(boxes);
    this.level.shake(0.4);
    this.level.sfx('stomp'); this.level.sfx('land');
    this.level.effects?.ring({ x: (h.x0 + h.x1) / 2, y: h.y0 + 0.05, z: (h.z0 + h.z1) / 2 }, Math.max(h.x1 - h.x0, h.z1 - h.z0) * 0.6);
    this.level.effects?.dust({ x: (h.x0 + h.x1) / 2, y: h.y0, z: (h.z0 + h.z1) / 2 }, 10, 1.4);
    for (const fn of [...this.landFns]) fn(boxes);
    this.advance();
    if (this.state !== 'done') { this.state = 'wait'; this.t = 0; }
  }

  /** Figur aus dem Körper schieben (zur nächsten freien Seite, waagerecht). */
  pushOut(f, boxes) {
    for (let k = 0; k < 4; k++) {
      const b = boxes.find((q) => penetrates(f.pos, f.half, q, 0.02));
      if (!b) return;
      const opts = [[b.x0 - f.half.x - 0.05 - f.pos.x, 0], [b.x1 + f.half.x + 0.05 - f.pos.x, 0], [0, b.z0 - f.half.z - 0.05 - f.pos.z], [0, b.z1 + f.half.z + 0.05 - f.pos.z]];
      opts.sort((u, v) => Math.hypot(u[0], u[1]) - Math.hypot(v[0], v[1]));
      f.pos.x += opts[0][0]; f.pos.z += opts[0][1];
    }
  }

  buildView() {
    const level = this.level, s = this.size;
    const root = new THREE.Group();
    const inner = new THREE.Group();
    root.add(inner);
    let model = null;
    if (hasModel('kippquader')) { model = getModel('kippquader', { size: s, hole: this.spec.hole ?? null, style: this.spec.style ?? 'tempel' }); inner.add(model.root); }
    else {
      const m = new THREE.Mesh(bodyGeo(this.parts, s[0], s[1], s[2], this.spec.style ?? 'tempel', this.spec.face), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, emissive: 0xff3a1a, emissiveIntensity: 0 }));
      m.castShadow = true; m.receiveShadow = true;
      inner.add(m);
      this.mesh = m;
    }
    const holder = {};
    let tt = 0;
    const M = new THREE.Matrix4(), T = new THREE.Matrix4(), Ti = new THREE.Matrix4(), Rm = new THREE.Matrix4();
    root.matrixAutoUpdate = false;
    addObject(level, root, (dt) => {
      const d = visDt(level, holder, dt);
      tt += d;
      const a = this.anim;
      if (a) {
        const P = a.after.pivot, ang = (Math.PI / 2) * P.sign * this.ease(a.k);
        const px = P.axis === 'x' ? 0 : P.pivot.x, pz = P.axis === 'x' ? P.pivot.z : 0;
        if (P.axis === 'x') Rm.makeRotationX(ang); else Rm.makeRotationZ(ang);
        // Welt = T(Kante) · Drehung · T(−Kante) · [R0, c0]  (nur die Kippachse; die andere Koordinate bleibt)
        T.makeTranslation(P.axis === 'x' ? 0 : px, P.pivot.y, P.axis === 'x' ? pz : 0);
        Ti.makeTranslation(P.axis === 'x' ? 0 : -px, -P.pivot.y, P.axis === 'x' ? -pz : 0);
        M.copy(a.R0).setPosition(a.c0);
        root.matrix.copy(T).multiply(Rm).multiply(Ti).multiply(M);
      } else {
        root.matrix.copy(this.R).setPosition(this.c);
        if (this.state === 'warn') {
          const sh = 0.04;
          root.matrix.elements[12] += Math.sin(tt * 57) * sh; root.matrix.elements[14] += Math.cos(tt * 49) * sh;
        }
      }
      root.matrixWorldNeedsUpdate = true;
      if (this.mesh) this.mesh.material.emissiveIntensity = this.state === 'warn' ? 0.12 + 0.12 * Math.sin(tt * 18) : 0;
      model?.update?.(d, { anim: a ? 'tip' : this.state === 'warn' ? 'warn' : 'idle', k: a ? a.k : 0 });
    });
  }

  info() {
    const h = this.box;
    return { state: this.state, tips: this.tips, hits: this.hits, carried: this.carried, box: [h.x0, h.y0, h.z0, h.x1, h.y1, h.z1].map((v) => +v.toFixed(2)), next: this.peekDir(), hint: this.hint?.info() ?? null };
  }
}

export function buildKippquader(level, spec) { return new Kippquader(level, spec); }

export const TYPES = { kippquader: buildKippquader };
