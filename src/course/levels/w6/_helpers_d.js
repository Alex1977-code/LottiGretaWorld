// Hilfen für die Welt-6-Level 6-7 „Wuschelflucht im Glitzerschacht“, 6-Panzer „Kawumm-Kolonne über den Wolken“ und
// 6-C „Glibber-Gala im Wolkenzirkus“ (kein Level: exportiert kein LEVEL, die Level-Registry überspringt dieses Modul).
// Nur für diese drei Level – die anderen Welt-6-Level haben eigene Hilfsdateien. Gemeinsame Dateien werden nicht
// verändert; alles Level-Lokale hängt sich über die offiziellen Aufbau-Haken an (LEVEL.prebuild / LEVEL.build /
// LEVEL.setup, Präzisierung „Leistung und Level-Haken 2“) und über level.onStep / view.onFrame.
//
//   1) Daten-Helfer     Münzspuren, Schilder
//   2) Schacht 6-7      Felswände, Gerüstbretter (Einweg), Glaswand vorn, Nische, Felsrille, Grubentor, Wippe mit
//                       Quetschblock (der Block drückt ein Ende hinab – das andere schnellt hoch), Absturz nach der Fahrt
// Statische Teile gehen über addStatic in die Abschnitts-Meshes (keine zusätzlichen Zeichenaufrufe), belebte
// Kleinigkeiten sind je ein Mesh bzw. eine Instanz-Gruppe ohne Sonnenschatten.

import * as THREE from 'three';
import { colorize, merge, lin, mixc, smooth, hex, addStatic, addObject, Rnd } from '../../blocks/kit.js';
import { visDt } from '../../entities/gimmick.js';
import { figures } from '../../blocks/w2kit.js';

const TAU = Math.PI * 2;
const C = (c) => lin(hex(c));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ni = (g) => (g.index ? g.toNonIndexed() : g);

// =====================================================================================================================
// 1) Daten-Helfer
// =====================================================================================================================

/** Münzreihe von a nach b. */
export const line = (a, b, n) => ({ kind: 'coins', from: a, to: b, n });
/** Münzring um c. */
export const ring = (c, r, n) => ({ kind: 'coins', pos: c, r, n });
/** Münzbogen von a nach b mit Scheitel h (n Münzen). */
export function arc(a, b, n, h) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    out.push({ kind: 'coin', pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * h * t * (1 - t), a[2] + (b[2] - a[2]) * t] });
  }
  return out;
}
/** Münzsäule (senkrecht) von y0 bis y1. */
export function column(x, y0, y1, z, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ kind: 'coin', pos: [x, y0 + ((y1 - y0) * i) / Math.max(1, n - 1), z] });
  return out;
}

// =====================================================================================================================
// 2) Schacht 6-7
// =====================================================================================================================

/**
 * Felskörper (Quader x0..x1 × y0..y1 × z0..z1) mit grober Oberfläche: Würfelnetz aus Zellen ≈ cell m, Eckpunkte leicht
 * nach außen gebeult (nur Optik, Kollision bleibt der Quader), Farben in Schichten (dunkel/hell, Erzadern).
 * o: { cell 1.6, bump 0.18, colors: [dunkel, mitte, hell], vein: Farbe, seed, skip: ['+z', …] (Seiten weglassen) }
 */
export function felsGeo(x0, y0, z0, x1, y1, z1, o = {}) {
  const w = x1 - x0, h = y1 - y0, d = z1 - z0;
  const cell = o.cell ?? 1.6;
  const g = new THREE.BoxGeometry(w, h, d, Math.max(1, Math.round(w / cell)), Math.max(1, Math.round(h / cell)), Math.max(1, Math.round(d / cell)));
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const pos = g.attributes.position;
  const bump = o.bump ?? 0.18;
  const seed = o.seed ?? 1;
  const n3 = (x, y, z) => Math.sin(x * 1.7 + seed) * Math.sin(y * 1.3 + seed * 2.1) * Math.sin(z * 1.9 + seed * 0.7) + Math.sin(x * 0.6 + y * 0.9 + z * 0.4 + seed) * 0.5;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    // nur Punkte auf den Seitenflächen beulen (nicht die Unter-/Oberkante, sonst entstehen Spalten zum Nachbarn)
    const onX = Math.abs(x - x0) < 1e-3 || Math.abs(x - x1) < 1e-3, onZ = Math.abs(z - z0) < 1e-3 || Math.abs(z - z1) < 1e-3;
    const top = Math.abs(y - y1) < 1e-3, bot = Math.abs(y - y0) < 1e-3;
    if (top || bot) continue;
    const k = n3(x, y, z) * bump;
    if (onX && !onZ) pos.setX(i, x + (Math.abs(x - x0) < 1e-3 ? -k : k));
    else if (onZ && !onX) pos.setZ(i, z + (Math.abs(z - z0) < 1e-3 ? -k : k));
  }
  g.computeVertexNormals();
  let geo = ni(g);
  if (o.skip?.length) geo = dropFaces(geo, o.skip, { x0, x1, y0, y1, z0, z1 });
  const [cd, cm, ch] = (o.colors ?? [0x3a2c22, 0x5e4a3a, 0x8a7058]).map(C);
  const vein = o.vein !== undefined ? C(o.vein) : null;
  return colorize(geo, (p, n, out) => {
    const s = Math.sin(p.y * 0.9 + Math.sin(p.x * 0.5 + p.z * 0.4) * 1.3) * 0.5 + 0.5;
    mixc(cd, cm, smooth(0.15, 0.85, s), out);
    mixc(out, ch, smooth(0.45, 1, n.y) * 0.55 + smooth(0.7, 1, s) * 0.18, out);
    if (vein && Math.abs(Math.sin(p.y * 0.35 + p.x * 0.21 - p.z * 0.17) ) > 0.985) mixc(out, vein, 0.7, out);
  });
}

/** Seiten eines Quaders weglassen (nach Normalen der Dreiecke an den Außenflächen). */
function dropFaces(g, skip, b) {
  const P = g.attributes.position.array, N = g.attributes.normal.array;
  const keep = [];
  const tris = P.length / 9;
  const at = (t, k, a) => P[t * 9 + k * 3 + a];
  const on = (t, a, v) => Math.abs(at(t, 0, a) - v) < 0.4 && Math.abs(at(t, 1, a) - v) < 0.4 && Math.abs(at(t, 2, a) - v) < 0.4;
  for (let t = 0; t < tris; t++) {
    let drop = false;
    for (const s of skip) {
      if (s === '+z' && on(t, 2, b.z1)) drop = true; else if (s === '-z' && on(t, 2, b.z0)) drop = true;
      else if (s === '+x' && on(t, 0, b.x1)) drop = true; else if (s === '-x' && on(t, 0, b.x0)) drop = true;
      else if (s === '+y' && on(t, 1, b.y1)) drop = true; else if (s === '-y' && on(t, 1, b.y0)) drop = true;
    }
    if (!drop) keep.push(t);
  }
  const p = new Float32Array(keep.length * 9), n = new Float32Array(keep.length * 9);
  keep.forEach((t, i) => { p.set(P.subarray(t * 9, t * 9 + 9), i * 9); n.set(N.subarray(t * 9, t * 9 + 9), i * 9); });
  const q = new THREE.BufferGeometry();
  q.setAttribute('position', new THREE.BufferAttribute(p, 3));
  q.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  g.dispose();
  return q;
}

/** Einfarbiger Quader (Mitte x, y, z) mit leichter Schattierung oben/unten. */
function blk(w, h, d, x, y, z, color, o = {}) {
  const g = ni(new THREE.BoxGeometry(w, h, d));
  g.translate(x, y, z);
  const c = C(color), top = C(o.top ?? color), dark = [c[0] * 0.62, c[1] * 0.62, c[2] * 0.62];
  return colorize(g, (p, n, out) => {
    if (n.y > 0.5) { out[0] = top[0]; out[1] = top[1]; out[2] = top[2]; }
    else if (n.y < -0.5) { out[0] = dark[0]; out[1] = dark[1]; out[2] = dark[2]; }
    else { const k = 1 - Math.abs(n.x) * 0.12; out[0] = c[0] * k; out[1] = c[1] * k; out[2] = c[2] * k; }
  });
}

/**
 * Gerüstbretter: Bohlenboden x0..x1 × z0..z1 mit Oberseite y (Dicke 0,32), vorn ein dunkler Kantbalken, darunter zwei
 * Schrägstreben zur Rückwand (zb). Liefert Geometrie-Teile.
 */
function brettGeo(x0, x1, y, z0, z1, zb, o = {}) {
  const parts = [];
  const w = x1 - x0, T = 0.32;
  const n = Math.max(2, Math.round(w / 0.55));
  const cols = o.colors ?? [0xc08a4e, 0xa8743e, 0xd29a5a];
  for (let i = 0; i < n; i++) {
    const a = x0 + (w * i) / n, b = x0 + (w * (i + 1)) / n;
    parts.push(blk(b - a - 0.04, T, z1 - z0, (a + b) / 2, y - T / 2, (z0 + z1) / 2, cols[i % cols.length], { top: cols[(i + 1) % cols.length] }));
  }
  parts.push(blk(w + 0.1, 0.22, 0.24, (x0 + x1) / 2, y - T - 0.11, z1 - 0.12, 0x5a3a20));
  parts.push(blk(w + 0.1, 0.22, 0.24, (x0 + x1) / 2, y - T - 0.11, z0 + 0.12, 0x5a3a20));
  if (o.braces !== false && zb !== undefined) {
    for (const x of [x0 + 0.5, x1 - 0.5]) {
      const L = Math.hypot(z1 - zb, 1.6);
      const g = ni(new THREE.BoxGeometry(0.2, L, 0.2));
      g.rotateX(Math.atan2(z1 - 0.3 - zb, 1.6));
      g.translate(x, y - T - 0.8, (z1 - 0.3 + zb) / 2);
      parts.push(colorize(g, (p, nn, out) => mixc(C(0x4a2e18), C(0x7a5230), smooth(-1, 1, nn.y + nn.z), out)));
    }
  }
  // Nagelköpfe (helle Punkte) vorn – kleine Freude fürs Auge
  if (o.nails !== false) for (let i = 0; i < n; i++) parts.push(blk(0.07, 0.04, 0.07, x0 + (w * (i + 0.5)) / n, y + 0.02, z1 - 0.3, 0xd8d0c0));
  return parts;
}

/**
 * Aufbau-Haken des Schachts (LEVEL.build): Felswände, Bretter, Nische, Rille, Glaswand – alles nach LEVEL.schacht:
 *   { rocks: [{ min: [x, y, z], max: [x, y, z], skip?: ['+z'], solid?: true, vein?, cell?, colors? }],
 *     planks: [{ x0, x1, y, z0, z1, zb, oneWay: true, solid: true }],
 *     glass: [{ min, max }] (unsichtbar, camIgnore), invisible: [{ min, max }] }
 */
export function schachtBauen(level) {
  const S = level.data.schacht ?? {};
  const W = level.world;
  let seed = 3;
  for (const r of S.rocks ?? []) {
    if (r.solid !== false) W.add({ type: 'box', min: r.min, max: r.max, tag: r.tag ?? 'fels', camIgnore: !!r.camIgnore });
    if (r.visible === false) continue;
    addStatic(level, felsGeo(r.min[0], r.min[1], r.min[2], r.max[0], r.max[1], r.max[2], { seed: seed++, skip: r.skip, vein: r.vein ?? 0x58c8ff, cell: r.cell, colors: r.colors, bump: r.bump }), { castShadow: r.shadow !== false });
  }
  for (const b of S.planks ?? []) {
    W.add({ type: 'box', min: [b.x0, b.y - 0.32, b.z0], max: [b.x1, b.y, b.z1], oneWay: b.oneWay !== false, tag: b.tag ?? 'gerüst' });
    addStatic(level, merge(brettGeo(b.x0, b.x1, b.y, b.z0, b.z1, b.zb, b)));
  }
  for (const g of S.glass ?? []) W.add({ type: 'box', min: g.min, max: g.max, camIgnore: true, noWallSlide: true, tag: 'glaswand' });
}

/**
 * Zier im Schacht (LEVEL.build, nach schachtBauen): Stützrahmen an der Rückwand, Kristalle mit Leuchten, hängende
 * Ketten. cfg = { frames: [{ x0, x1, y, z }], crystals: [{ pos, size, color }], chains: [{ pos, length }] }
 */
export function schachtZier(level) {
  const S = level.data.schacht ?? {};
  if (!level.view) return;
  const wood = [], glow = [];
  for (const f of S.frames ?? []) {
    const { x0, x1, y, z } = f, h = f.h ?? 3.4;
    for (const x of [x0, x1]) wood.push(blk(0.42, h, 0.42, x, y + h / 2, z, 0x6a4424, { top: 0x8a5a30 }));
    wood.push(blk(x1 - x0 + 0.6, 0.46, 0.5, (x0 + x1) / 2, y + h + 0.2, z, 0x7a4e2a, { top: 0x9a6a3a }));
    // Eckknaggen
    for (const s of [-1, 1]) {
      const g = ni(new THREE.BoxGeometry(0.9, 0.22, 0.3));
      g.rotateZ(s * 0.75);
      g.translate(s < 0 ? x0 + 0.42 : x1 - 0.42, y + h - 0.32, z);
      wood.push(colorize(g, (p, n, out) => mixc(C(0x5a3a1e), C(0x8a5a30), smooth(-1, 1, n.y), out)));
    }
  }
  for (const c of S.crystals ?? []) {
    const [x, y, z] = c.pos, sz = c.size ?? 0.7;
    const cols = c.color === 'rosa' ? [0xff6ad0, 0xffd0f4] : c.color === 'gold' ? [0xffb020, 0xfff0a0] : [0x3a8aff, 0xb8f0ff];
    const n = c.n ?? 3;
    for (let i = 0; i < n; i++) {
      const g = new THREE.OctahedronGeometry(sz * (1 - i * 0.22), 0);
      g.scale(0.7, 1.9, 0.7);
      g.rotateZ((i - (n - 1) / 2) * 0.45 + (c.tilt ?? 0));
      g.rotateX((c.lean ?? 0.25) * (i % 2 ? -1 : 1));
      g.translate(x + (i - (n - 1) / 2) * sz * 0.55, y + sz * 0.6, z);
      glow.push(colorize(ni(g), (p, nn, out) => mixc(C(cols[0]), C(cols[1]), smooth(-0.6, 1, nn.y), out)));
    }
  }
  if (wood.length) addStatic(level, merge(wood));
  if (glow.length) addStatic(level, merge(glow), { material: 'glow', castShadow: false });
}

/**
 * Grubentor: zwei Holzflügel mit Eisenbändern in einem Balkenrahmen (quer über einen Gang entlang Z). Steht eine Figur
 * näher als `near` m davor, schwingen die Flügel auf (Durchgang frei); Tür zum Deck mit dem Zielmast (6-7).
 * spec = { pos: [x, y, z] (Mitte unten), width: 4, height: 3.6, near: 3.2, id }
 */
export class Grubentor {
  constructor(level, spec) {
    this.level = level;
    this.spec = spec;
    const [x, y, z] = spec.pos;
    this.x = x; this.y = y; this.z = z;
    this.W = spec.width ?? 4; this.H = spec.height ?? 3.6;
    this.near = spec.near ?? 3.2;
    this.k = 0; this.open = false; this.opened = 0;
    const W = this.W, H = this.H;
    // Rahmen (fest) und Flügel (Kollision, solange zu)
    level.world.add({ type: 'box', min: [x - W / 2 - 0.6, y, z - 0.35], max: [x - W / 2, y + H + 0.6, z + 0.35], tag: 'grubentor:pfosten' });
    level.world.add({ type: 'box', min: [x + W / 2, y, z - 0.35], max: [x + W / 2 + 0.6, y + H + 0.6, z + 0.35], tag: 'grubentor:pfosten' });
    level.world.add({ type: 'box', min: [x - W / 2 - 0.6, y + H, z - 0.35], max: [x + W / 2 + 0.6, y + H + 0.6, z + 0.35], tag: 'grubentor:sturz' });
    this.leafShape = { type: 'box', min: [x - W / 2, y, z - 0.12], max: [x + W / 2, y + H, z + 0.12], tag: 'grubentor:fluegel' };
    this.leafId = level.world.add(this.leafShape);
    if (spec.id) level.named.set(spec.id, this);
    if (level.view) this.buildView();
    level.onStep((dt) => this.step(dt));
  }

  buildView() {
    const { x, y, z, W, H } = this;
    const frame = [];
    frame.push(blk(0.6, H + 0.6, 0.7, x - W / 2 - 0.3, y + (H + 0.6) / 2, z, 0x5a3a20, { top: 0x7a5230 }));
    frame.push(blk(0.6, H + 0.6, 0.7, x + W / 2 + 0.3, y + (H + 0.6) / 2, z, 0x5a3a20, { top: 0x7a5230 }));
    frame.push(blk(W + 1.6, 0.6, 0.8, x, y + H + 0.3, z, 0x6a4424, { top: 0x8a5a30 }));
    // Schild über dem Tor: „Zum Deck“ als Laterne + Pfeil (Glüh-Material)
    addStatic(this.level, merge(frame));
    this.leaves = [];
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
    for (const s of [-1, 1]) {
      // Flügel in Angel-Koordinaten: Angel (x = 0) am äußeren Rand, der Flügel reicht nach −s·lw zur Tormitte
      const parts = [];
      const lw = W / 2, n = 4, at = (u) => -s * u;
      for (let i = 0; i < n; i++) parts.push(blk(lw / n - 0.03, H - 0.04, 0.16, at((lw * (i + 0.5)) / n), H / 2, 0, [0xa0683a, 0x8a5a30, 0xb4784a, 0x946036][i]));
      for (const yy of [0.5, H - 0.5]) parts.push(blk(lw - 0.1, 0.18, 0.2, at(lw / 2), yy, 0, 0x3a3a44, { top: 0x6a6a78 }));
      const diag = ni(new THREE.BoxGeometry(0.16, Math.hypot(lw, H - 1), 0.2));
      diag.rotateZ(s * Math.atan2(lw - 0.2, H - 1));
      diag.translate(at(lw / 2), H / 2, 0.02);
      parts.push(colorize(diag, (p, nn, out) => mixc(C(0x5a3a1e), C(0x7a5230), 0.5, out)));
      parts.push(blk(0.14, 0.14, 0.24, at(lw - 0.35), H * 0.5, 0.1, 0xffc83a));   // Griff
      const pivot = new THREE.Group();
      pivot.position.set(x + s * W / 2, y, z);
      const leaf = new THREE.Mesh(merge(parts), mat);
      leaf.castShadow = true; leaf.receiveShadow = true;
      pivot.add(leaf);
      addObject(this.level, pivot);
      this.leaves.push({ pivot, s });
    }
    // aufschwingen nach −Z (vom Gang weg): linker Flügel +, rechter −
    this.level.view.onFrame(() => { for (const l of this.leaves) l.pivot.rotation.y = -l.s * this.k * 1.75; });
  }

  step(dt) {
    const near = figures(this.level).some((f) => Math.abs(f.pos.x - this.x) < this.W / 2 + 2 && Math.abs(f.pos.z - this.z) < this.near && Math.abs(f.pos.y - this.y) < 3);
    if (near && !this.open) {
      this.open = true; this.opened++;
      this.level.sfx('gate');
      if (this.leafId !== null) { this.level.world.remove(this.leafId); this.leafId = null; }
    }
    this.k += ((this.open ? 1 : 0) - this.k) * Math.min(1, dt * 3.2);
  }

  info() { return { open: this.open, k: +this.k.toFixed(2), opened: this.opened }; }
}

/**
 * Wippe mit Quetschblock (6-7, Stern über der Wippe): der Quetschblock `crusher` (mode 'signal') wacht auf, sobald jemand
 * auf der Wippe steht – nach `cool` s Pause stößt er wieder, solange die Last bleibt. Solange er über dem Ende F stößt
 * bzw. ausgefahren hält, drückt er dieses Ende hinab – das andere Ende N schnellt hoch (auch mit einer Figur darauf).
 * cfg = { wippe: id, crusher: id, raise: [x, z] (Punkt auf dem Ende, das hochgeht), kick: 80 (°), cool: 1.6 (s), wake: 0.25 (s Last) }
 */
export function wippenStoss(level, cfg) {
  const w = level.named.get(cfg.wippe), q = level.named.get(cfg.crusher);
  if (!w?.tilter || !q) return null;
  const t = w.tilter;
  const st = { presses: 0, pressing: false, peak: 0, cool: 0, loadT: 0, last: q.state };
  const DEG = Math.PI / 180;
  // Winkel > 0 hebt die +Seite (TiltDeck.heightAt = y + offset · tan): N hoch = Winkel mit dem Vorzeichen von offset(N)
  const sign = t.deck.offset(cfg.raise[0], cfg.raise[1]) >= 0 ? 1 : -1;
  const k = (cfg.kick ?? 80) * DEG;
  level.onStep((dt) => {
    // aufwachen: Last auf der Wippe → Stoß (nach der Pause)
    st.loadT = t.load > 0 ? st.loadT + dt : 0;
    if (st.last === 'zurueck' && q.state === 'ruhe') st.cool = cfg.cool ?? 1.6;
    st.last = q.state;
    if (st.cool > 0) st.cool -= dt;
    if (q.state === 'ruhe' && st.cool <= 0 && st.loadT >= (cfg.wake ?? 0.25)) q.fire();
    const s = q.state;
    const press = s === 'stoss' || s === 'halt' || (s === 'zurueck' && q.k > 0.55);
    if (press && !st.pressing) st.presses++;
    st.pressing = press;
    if (!press) return;
    t.kick = sign > 0 ? Math.max(t.kick, k) : Math.min(t.kick, -k);
    st.peak = Math.max(st.peak, sign * w.angle);
  });
  return st;
}

/**
 * Nach dem Ende der senkrechten Fahrt: wer oben in den Schacht zurückfällt (unter y, im Bereich box), stürzt ab –
 * sonst fiele die Figur 80 m bis zur Sohle. cfg = { y, x: [x0, x1], z: [z0, z1] }
 */
export function schachtAbsturz(level, cfg) {
  level.onStep(() => {
    const w = level.scroll;
    if (!w || w.state !== 'done') return;
    for (const f of figures(level)) {
      if (f.mode === 'script') continue;
      if (f.pos.y < cfg.y && f.pos.x > cfg.x[0] && f.pos.x < cfg.x[1] && f.pos.z > cfg.z[0] && f.pos.z < cfg.z[1]) f.die('fall');
    }
  });
}

/**
 * Schattenpass sparen: Meshes unter benannten Objekten (Name beginnt mit einem der names, z. B. 'modell:wolkenplattform')
 * werfen keinen Sonnenschatten (der Blob bleibt). Entitäten mit kind in kinds ebenso. Läuft im Aufbau und beim ersten Bild.
 */
export function schattenDiaet(level, names = [], kinds = []) {
  if (!level.view) return;
  const run = () => {
    level.view.three?.traverse((o) => {
      if (!o.isMesh && !o.isInstancedMesh) return;
      for (let q = o; q; q = q.parent) if (q.name && names.some((n) => q.name.startsWith(n))) { o.castShadow = false; break; }
    });
    for (const e of level.entities) {
      if (!kinds.includes(e.kind)) continue;
      e.model?.root?.traverse((m) => { if (m.isMesh || m.isInstancedMesh) m.castShadow = false; });
      for (const l of e.layers ?? []) l.root?.traverse((m) => { if (m.isMesh || m.isInstancedMesh) m.castShadow = false; });
    }
  };
  run();
  let n = 0;
  level.view.onFrame(() => { if (n++ < 3) run(); });
}

/**
 * Horden zeigen, wann es zählt: eine Horde mit Auslöser (Galerie) ist unsichtbar, solange sie wartet; die Schacht-Horde
 * verschwindet, wenn die Kamera weit über ihr ist (nach der Fahrt). ids = Horden-Ids.
 */
export function hordenSicht(level, ids) {
  if (!level.view) return;
  level.view.onFrame(() => {
    const ty = level.view.rig?.target?.y ?? 0, tz = level.view.rig?.target?.z ?? 0;
    for (const id of ids) {
      const h = level.named.get(id);
      if (!h?.layers) continue;
      let vis = h.state !== 'wait';
      if (h.vertical) vis = vis && h.front > ty - 16 && Math.abs(tz - h.origin.z) < 24;
      else vis = vis && Math.abs(h.pos.z - tz) < 40;
      for (const l of h.layers) l.root.visible = vis;
    }
  });
}

/**
 * Ansage beim Abfahren des Bildfensters (statt startBanner beim Levelstart – die Fahrt beginnt erst mit dem Auslöser).
 * cfg = { text, hold, size, color }
 */
export function fahrtAnsage(level, cfg) {
  let said = false;
  level.onStep(() => {
    const w = level.scroll;
    if (said || !w || w.state === 'wait') return;
    said = true;
    level.archetype?.hud?.banner?.(cfg.text, { hold: cfg.hold ?? 1.8, size: cfg.size ?? 15, color: cfg.color ?? '#ffe066' });
    level.sfx('panic');
  });
}

/** Staubkörnchen im Lampenschein und leuchtende Augen in den Felsritzen: kleine Freuden für 6-7 (ein Objekt je Art). */
export function schachtLeben(level, cfg = {}) {
  if (!level.view) return;
  // Glühwürmchen-artige Funken, die im Schacht langsam aufsteigen (folgen dem Kamerablick)
  const n = cfg.n ?? 36;
  const g = new THREE.BufferGeometry();
  const P = new Float32Array(n * 3);
  const seeds = [];
  const rnd = new Rnd(77);
  for (let i = 0; i < n; i++) seeds.push({ x: rnd.real(-7.5, 7.5), y: rnd.real(0, 14), z: rnd.real(-3, 1.2), ph: rnd.real(0, TAU), v: rnd.real(0.3, 0.7) });
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffd890, size: 0.12, transparent: true, opacity: 0.85, depthWrite: false });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  addObject(level, pts);
  let t = 0;
  level.view.onFrame((dt) => {
    t += Math.min(dt, 0.1);
    const ty = level.view.rig?.target?.y ?? 0;
    for (let i = 0; i < n; i++) {
      const s = seeds[i];
      const y = ((s.y + t * s.v) % 14) - 7 + ty;
      P[i * 3] = s.x + Math.sin(t * 0.7 + s.ph) * 0.4; P[i * 3 + 1] = y; P[i * 3 + 2] = s.z;
    }
    g.attributes.position.needsUpdate = true;
  });
}

export { clamp, C, blk };
