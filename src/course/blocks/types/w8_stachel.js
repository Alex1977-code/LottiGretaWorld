// Welt-8-Bausteine Stachelblöcke (Präzisierung Motor und Bausteine Welt 8; Bauplan 8-5 „blaue Stachelblöcke → … rote
// Stachelblöcke → wandernde Stachelwände“).
//
// stachelblock – fester Block mit Stacheln auf den gewählten Seiten, der seinen Pfad abfährt. Die Stacheln verletzen (Rückstoß
//   von der Seite weg), unbestachelte Seiten sind normale Wände bzw. (oben) begehbar – der Block trägt Figuren mit. Schiebt der
//   Block eine Figur gegen eine Wand, wird sie herausgeschoben (damage 'tod': zerquetscht, deathCause 'crush').
//   color 'blau' – Takt: fährt von Pfad-Punkt zu Pfad-Punkt und hält dort `wait` s; vor jeder Fahrt Vorwarnung (`warn` s:
//     zittert, Stacheln blinken hell).
//   color 'rot' – wandert ohne Pause (Standard mode 'loop' bei ≥ 3 Punkten), schneller, Stacheln glühen.
//   { type: 'stachelblock', id, pos: [x, y, z] (Mitte der Unterseite), size: [2, 2, 2], color: 'blau' | 'rot',
//     spikes: 'alle' | ['+x', '-x', '+z', '-z', 'oben', 'unten'] (auch 'rechts' = +x, 'links' = −x, 'vorn' = +z zur Kamera,
//     'hinten' = −z; Standard 'alle' bzw. bei stachelwand ['+z']), spikeLen: 0.45, path: [[x, y, z], …] (ab pos) |
//     move: [dx, dy, dz] (hin und zurück), speed: blau 3 / rot 2.2, wait: blau 1.2 / rot 0, warn: 0.5,
//     mode: 'pingpong' | 'loop', phase: 0 (s Versatz), idle: false, damage: 'treffer' | 'tod', look: 'eigen' }
//   level.named.get(id) = { state ('wartet'|'warn'|'faehrt'|'steht'), mb, spikes, hits, crushes, start(), stop(), info() };
//   w8(level).spikes. Kollision: MovingBox (mover, tag 'stachelblock').
//   Modelle: Registry 'stachelblock_blau' / 'stachelblock_rot' ({ size: [w, h, d], spikes: [Seiten], spikeLen }, Ursprung Mitte
//   der Unterseite; state { warn, t }) – sonst eigener Metallblock mit Nieten, Gesicht und Stachelreihen.
//   Beispiel: { type: 'stachelblock', id: 'blau1', pos: [-3, 0, -40], color: 'blau', move: [6, 0, 0], wait: 1.2 }
//
// stachelwand – wandernde Stachelwand: wie stachelblock mit Standard size [10, 4, 1], spikes ['+z'] (zur Kamera), color 'blau',
//   move [0, 0, 6] (rückt vor und weicht zurück), speed 2, wait 1.5. Beispiel:
//   { type: 'stachelwand', id: 'wand1', pos: [0, 0, -120], size: [12, 4, 1], move: [0, 0, 7], spikes: ['+z'] }

import * as THREE from 'three';
import { v3, sz3, lin, mixc, smooth, colorize, merge, hex, addObject } from '../kit.js';
import { MovingBox } from '../w2kit.js';
import { figuresIn, pushOutOf } from '../w4kit.js';
import { visDt } from '../../entities/gimmick.js';
import { getModel } from '../../models/index.js';
import { w8, figures, hurtFigures, boxTouches, regModel, stdMat, spikeGeo, ease, clamp } from '../w8kit.js';

const FACE = {
  '+x': [1, 0, 0], '-x': [-1, 0, 0], '+z': [0, 0, 1], '-z': [0, 0, -1], oben: [0, 1, 0], unten: [0, -1, 0],
  rechts: [1, 0, 0], links: [-1, 0, 0], vorn: [0, 0, 1], hinten: [0, 0, -1], '+y': [0, 1, 0], '-y': [0, -1, 0],
};
const ALL = ['+x', '-x', '+z', '-z', 'oben', 'unten'];
const PAL = {
  blau: { body: 0x3a5ab8, hi: 0x7a9af0, lo: 0x1a2a68, rivet: 0xc8d8ff, eye: 0xfff6c0, spike: 0xe8f0ff, spikeLo: 0x6a7aa8, warn: 0xffffff },
  rot: { body: 0xc83a2a, hi: 0xff7a5a, lo: 0x681a12, rivet: 0xffd0a0, eye: 0xfff0a0, spike: 0xfff0e8, spikeLo: 0xa86a5a, warn: 0xffd23a },
};

function faceKey(f) {
  const d = FACE[f];
  if (!d) return null;
  return d[0] > 0 ? '+x' : d[0] < 0 ? '-x' : d[2] > 0 ? '+z' : d[2] < 0 ? '-z' : d[1] > 0 ? 'oben' : 'unten';
}

/** Eigener Block (lokal, Ursprung Mitte der Unterseite): Körper mit Nieten und Gesicht; Stacheln getrennt (blinken). */
function blockGeo(s, color, faces, len) {
  const P = PAL[color] ?? PAL.blau;
  const body = lin(hex(P.body)), hi = lin(hex(P.hi)), lo = lin(hex(P.lo)), rv = lin(hex(P.rivet)), eye = lin(hex(P.eye));
  const parts = [], spikes = [];
  const g = new THREE.BoxGeometry(s.x, s.y, s.z, 2, 2, 2).toNonIndexed();
  g.translate(0, s.y / 2, 0);
  parts.push(colorize(g, (p, n, o) => {
    mixc(lo, body, smooth(0, s.y, p.y) * 0.6 + 0.4 * smooth(-1, 1, n.y), o);
    const e = Math.min(s.x / 2 - Math.abs(p.x), s.z / 2 - Math.abs(p.z), Math.abs(p.y - s.y / 2) > s.y / 2 - 0.01 ? 9 : s.y / 2 - Math.abs(p.y - s.y / 2));
    if (e < 0.12) mixc(o, hi, 0.5, o);
  }));
  // Nieten an den Ecken jeder Seite
  for (const k of ['+x', '-x', '+z', '-z']) {
    const d = FACE[k];
    const w = d[0] ? s.z : s.x;
    for (const u of [-1, 1]) for (const v of [0.18, 0.82]) {
      const r = new THREE.SphereGeometry(0.07, 6, 4);
      const off = d[0] ? [d[0] * (s.x / 2 + 0.01), v * s.y, u * (w / 2 - 0.18)] : [u * (w / 2 - 0.18), v * s.y, d[2] * (s.z / 2 + 0.01)];
      r.translate(off[0], off[1], off[2]);
      parts.push(colorize(r.toNonIndexed(), (p, n, o) => { o[0] = rv[0]; o[1] = rv[1]; o[2] = rv[2]; }));
    }
  }
  // grimmige Augen auf der ersten unbestachelten Seite zur Kamera (+z), sonst oben drüber
  const faceSide = !faces.includes('+z') ? '+z' : !faces.includes('+x') ? '+x' : null;
  if (faceSide) {
    const d = FACE[faceSide];
    for (const u of [-1, 1]) {
      const e = new THREE.CircleGeometry(Math.min(0.22, s.y * 0.12), 12);
      const pos = d[0] ? [s.x / 2 + 0.015, s.y * 0.6, u * Math.min(0.42, s.z * 0.2)] : [u * Math.min(0.42, s.x * 0.2), s.y * 0.6, s.z / 2 + 0.015];
      if (d[0]) e.rotateY(Math.PI / 2);
      e.translate(pos[0], pos[1], pos[2]);
      parts.push(colorize(e.toNonIndexed(), (p, n, o) => { o[0] = eye[0]; o[1] = eye[1]; o[2] = eye[2]; }));
      const pu = new THREE.CircleGeometry(Math.min(0.1, s.y * 0.055), 8);
      if (d[0]) pu.rotateY(Math.PI / 2);
      pu.translate(pos[0] + d[0] * 0.01, pos[1] - 0.03, pos[2] + d[2] * 0.01);
      parts.push(colorize(pu.toNonIndexed(), (p, n, o) => { o[0] = 0.02; o[1] = 0.02; o[2] = 0.03; }));
      const brow = new THREE.BoxGeometry(d[0] ? 0.04 : 0.4, 0.08, d[0] ? 0.4 : 0.04);
      brow.rotateX(d[0] ? u * 0.4 : 0); brow.rotateZ(d[0] ? 0 : -u * 0.4);
      brow.translate(pos[0] + d[0] * 0.02, pos[1] + 0.26, pos[2] + d[2] * 0.02);
      parts.push(colorize(brow.toNonIndexed(), (p, n, o) => { o[0] = lo[0] * 0.5; o[1] = lo[1] * 0.5; o[2] = lo[2] * 0.5; }));
    }
  }
  // Stacheln: Raster je bestachelter Seite (Abstand ≈ 0,5 m)
  for (const k of faces) {
    const d = FACE[k];
    const a = d[0] ? s.z : s.x, b = d[1] ? s.z : s.y;
    const na = Math.max(1, Math.round(a / 0.5)), nb = Math.max(1, Math.round(b / 0.5));
    for (let i = 0; i < na; i++) for (let j = 0; j < nb; j++) {
      const u = -a / 2 + (i + 0.5) * (a / na), v = -b / 2 + (j + 0.5) * (b / nb);
      const c = spikeGeo(len, Math.min(0.2, (a / na) * 0.42), P.spike, P.spikeLo, 6);
      if (d[0]) { c.rotateZ(-d[0] * Math.PI / 2); c.translate(d[0] * s.x / 2, s.y / 2 + v, u); }
      else if (d[2]) { c.rotateX(d[2] * Math.PI / 2); c.translate(u, s.y / 2 + v, d[2] * s.z / 2); }
      else if (d[1] > 0) c.translate(u, s.y, v);
      else { c.rotateX(Math.PI); c.translate(u, 0, v); }
      spikes.push(c);
    }
  }
  return { body: merge(parts), spikes: merge(spikes) };
}

function buildSpiky(level, spec, kind) {
  const wall = kind === 'stachelwand';
  const p0 = v3(spec.pos);
  const color = spec.color === 'rot' ? 'rot' : 'blau';
  const s = sz3(spec.size, wall ? [10, 4, 1] : [2, 2, 2]);
  const faces = [...new Set((spec.spikes === 'alle' || (!spec.spikes && !wall) ? ALL : Array.isArray(spec.spikes) ? spec.spikes : wall ? ['+z'] : [spec.spikes]).map(faceKey).filter(Boolean))];
  const len = spec.spikeLen ?? 0.45;
  // Pfad: path ab pos, sonst move (hin und zurück)
  const pts = [[p0.x, p0.y, p0.z]];
  if (Array.isArray(spec.path)) for (const q of spec.path) pts.push([q[0], q[1] ?? p0.y, q[2] ?? p0.z]);
  else if (Array.isArray(spec.move)) pts.push([p0.x + (spec.move[0] ?? 0), p0.y + (spec.move[1] ?? 0), p0.z + (spec.move[2] ?? 0)]);
  else if (wall) pts.push([p0.x, p0.y, p0.z + 6]);
  const loop = (spec.mode ?? (color === 'rot' && pts.length >= 3 ? 'loop' : 'pingpong')) === 'loop';
  const speed = spec.speed ?? (wall ? 2 : color === 'rot' ? 2.2 : 3);
  const wait = spec.wait ?? (wall ? 1.5 : color === 'rot' ? 0 : 1.2);
  const warn = Math.min(wait, spec.warn ?? 0.5);
  // Fahrplan: Abschnitte i → i+1 (pingpong: hin und zurück), je Halt wait s (die letzten warn s davon Vorwarnung)
  const legs = [];
  const order = loop ? [...pts.keys(), 0] : [...pts.keys(), ...[...pts.keys()].reverse().slice(1)];
  for (let i = 0; i + 1 < order.length; i++) {
    const a = pts[order[i]], b = pts[order[i + 1]];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    legs.push({ a, b, wait, move: L / Math.max(0.1, speed) });
  }
  const total = legs.reduce((t, l) => t + l.wait + l.move, 0) || 1;
  const st = { state: 'wartet', running: !spec.idle, t: (spec.phase ?? 0), hits: 0, crushes: 0, warnK: 0 };
  const mb = new MovingBox(level, p0.x, p0.y, p0.z, s.x, s.y, s.z, { tag: kind });
  const handle = {
    get state() { return st.state; }, get hits() { return st.hits; }, get crushes() { return st.crushes; }, mb, spikes: faces, color,
    start() { st.running = true; }, stop() { st.running = false; },
    info: () => ({ state: st.state, x: +mb.pos.x.toFixed(2), y: +mb.pos.y.toFixed(2), z: +mb.pos.z.toFixed(2), hits: st.hits, crushes: st.crushes, spikes: faces.join(',') }),
  };
  mb.shape.owner = handle;
  if (spec.id) level.named.set(spec.id, handle);
  w8(level).spikes.push(handle);

  const where = (time) => {
    if (!legs.length) return { x: p0.x, y: p0.y, z: p0.z, state: 'steht', warn: 0 };
    let u = ((time % total) + total) % total;
    for (const l of legs) {
      if (u < l.wait) {
        const w = l.wait - u < warn ? 1 - (l.wait - u) / Math.max(0.01, warn) : 0;
        return { x: l.a[0], y: l.a[1], z: l.a[2], state: w > 0 ? 'warn' : 'wartet', warn: w };
      }
      u -= l.wait;
      if (u < l.move) {
        const k = color === 'rot' && !wait ? u / l.move : ease(u / l.move);
        return { x: l.a[0] + (l.b[0] - l.a[0]) * k, y: l.a[1] + (l.b[1] - l.a[1]) * k, z: l.a[2] + (l.b[2] - l.a[2]) * k, state: 'faehrt', warn: 0 };
      }
      u -= l.move;
    }
    const a = legs[0].a;
    return { x: a[0], y: a[1], z: a[2], state: 'wartet', warn: 0 };
  };
  /** Stachel-Zone einer Seite (Quader vor der Fläche, spikeLen tief). */
  const zone = (k, x, y, z) => {
    const d = FACE[k], e = len * 0.9, pad = 0.04;
    const b = { x0: x - s.x / 2 + pad, x1: x + s.x / 2 - pad, y0: y + pad, y1: y + s.y - pad, z0: z - s.z / 2 + pad, z1: z + s.z / 2 - pad };
    if (d[0] > 0) { b.x0 = x + s.x / 2; b.x1 = b.x0 + e; }
    if (d[0] < 0) { b.x1 = x - s.x / 2; b.x0 = b.x1 - e; }
    if (d[2] > 0) { b.z0 = z + s.z / 2; b.z1 = b.z0 + e; }
    if (d[2] < 0) { b.z1 = z - s.z / 2; b.z0 = b.z1 - e; }
    if (d[1] > 0) { b.y0 = y + s.y; b.y1 = b.y0 + e; }
    if (d[1] < 0) { b.y1 = y; b.y0 = b.y1 - e; }
    return b;
  };
  level.onStep((dt) => {
    if (st.running) st.t += dt;
    const w = where(st.t);
    st.state = st.running ? w.state : 'steht';
    st.warnK = w.warn;
    const shake = w.state === 'warn' ? Math.sin(st.t * 80) * 0.03 : 0;
    mb.moveTo(w.x + shake, w.y, w.z, dt);
    const { x, y, z } = mb.pos;
    // Stacheln: Berührung verletzt (Rückstoß von der Fläche weg)
    for (const k of faces) {
      const b = zone(k, x, y, z), d = FACE[k];
      hurtFigures(level, (f) => { if (!boxTouches(f, b, 0)) return false; st.hits++; return true; },
        (f) => ({ pos: { x: f.pos.x - d[0] * 2, y: f.pos.y - d[1] * 2 + 0.5, z: f.pos.z - d[2] * 2 } }));
    }
    // Eingeklemmt: herausschieben; geht das nicht (gegen eine Wand) → treffer bzw. tod (zerquetscht)
    const body = { x0: x - s.x / 2, x1: x + s.x / 2, y0: y, y1: y + s.y, z0: z - s.z / 2, z1: z + s.z / 2 };
    for (const f of figuresIn(level, body, 0.08)) {
      const moved = pushOutOf(level, f, body, dt, 12);
      if (moved && figuresIn(level, body, 0.3).includes(f)) {
        if (spec.damage === 'tod') { st.crushes++; f.die('crush'); }
        else if (!f.invulnerable && f.invuln <= 0) { st.hits++; f.hurt({ pos: { x, y: y + s.y / 2, z } }); }
      }
    }
  });

  if (!level.view) return handle;
  // ---------------- Darstellung
  const root = new THREE.Group();
  root.name = kind;
  const P = PAL[color];
  let model = null, spikeMat = null;
  const reg = `stachelblock_${color}`;
  if (regModel(spec, reg)) {
    model = getModel(reg, { size: [s.x, s.y, s.z], spikes: faces, spikeLen: len });
    root.add(model.root);
  } else {
    const g = blockGeo(s, color, faces, len);
    const body = new THREE.Mesh(g.body, stdMat('w8spike', { roughness: 0.45, metalness: 0.25 }));
    body.castShadow = true; body.receiveShadow = true;
    root.add(body);
    if (g.spikes) {
      spikeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.4, emissive: new THREE.Color(P.warn), emissiveIntensity: 0 });
      const sp = new THREE.Mesh(g.spikes, spikeMat);
      sp.castShadow = true;
      root.add(sp);
    }
  }
  const holder = {};
  let t = 0;
  addObject(level, root, (dt) => {
    const d = visDt(level, holder, dt);
    t += d;
    root.position.set(mb.pos.x, mb.pos.y, mb.pos.z);
    if (spikeMat) spikeMat.emissiveIntensity = color === 'rot' ? 0.18 + 0.12 * Math.sin(t * 6) : st.warnK > 0 ? (Math.sin(t * 40) > 0 ? 0.9 : 0.2) * clamp(st.warnK * 2, 0, 1) : 0;
    model?.update?.(d, { warn: st.state === 'warn', t });
  });
  return handle;
}

export const buildStachelblock = (level, spec) => buildSpiky(level, spec, 'stachelblock');
export const buildStachelwand = (level, spec) => buildSpiky(level, spec, 'stachelwand');

export const TYPES = { stachelblock: buildStachelblock, stachelwand: buildStachelwand };
