// Hilfen für die Welt-6-Level 6-7 „Wuschelflucht im Glitzerschacht“, 6-Panzer „Kawumm-Kolonne über den Wolken“ und
// 6-C „Glibber-Gala im Wolkenzirkus“ (kein Level: exportiert kein LEVEL, die Level-Registry überspringt dieses Modul).
// Nur für diese drei Level – die anderen Welt-6-Level haben eigene Hilfsdateien. Gemeinsame Dateien werden nicht
// verändert; alles Level-Lokale hängt sich über die offiziellen Aufbau-Haken an (LEVEL.prebuild / LEVEL.build /
// LEVEL.setup, Präzisierung „Leistung und Level-Haken 2“) und über level.onStep / view.onFrame.
//
//   1) Daten-Helfer     Münzspuren, Schilder
//   2) Schacht 6-7      Felswände, Gerüstbretter (Einweg), Glaswand vorn, Nische, Felsrille, Grubentor, Wippe mit
//                       Quetschblock (der Block drückt ein Ende hinab – das andere schnellt hoch), Absturz nach der Fahrt
//   3) Kolonne 6-Panzer Fahrplan (Bildfenster gleitet an der Kolonne entlang, Haltepunkte), Panzer-Bausteine, Wolken-
//                       straße, Schwebeinseln, Wolkenburg, Regenbogen, Mitfahr-Regeln (Werfer, Zündköpfe)
//   4) Zirkus 6-C       Sternenhimmel mit Mond, Zerrspiegel (Spiegelkabinett), Plakat „Glibber-Gala“, Seilbahn-Rückruf,
//                       Feuerwerk, Riesenrad
// Statische Teile gehen über addStatic in die Abschnitts-Meshes (keine zusätzlichen Zeichenaufrufe), belebte
// Kleinigkeiten sind je ein Mesh bzw. eine Instanz-Gruppe ohne Sonnenschatten.

import * as THREE from 'three';
import { colorize, merge, lin, mixc, smooth, hex, addStatic, addObject, Rnd } from '../../blocks/kit.js';
import { visDt, runAction } from '../../entities/gimmick.js';
import { figures } from '../../blocks/w2kit.js';
import { ScrollWindow } from '../../archetypes/ScrollWindow.js';

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
  const [cd, cm, ch] = (o.colors ?? [0x4a3426, 0x76563c, 0xae8660]).map(C);
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
    const vein = r.vein ?? [0x58c8ff, 0xff7ad8, 0x7affc8, 0xffd04a][seed % 4];
    addStatic(level, felsGeo(r.min[0], r.min[1], r.min[2], r.max[0], r.max[1], r.max[2], { seed: seed++, skip: r.skip, vein, cell: r.cell, colors: r.colors ?? S.rockColors, bump: r.bump }), { castShadow: r.shadow !== false });
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
    level.world.add({ type: 'box', min: [x - W / 2 - 0.6, y, z - 0.35], max: [x - W / 2, y + H + 0.6, z + 0.35], tag: 'grubentor:pfosten', camIgnore: true });
    level.world.add({ type: 'box', min: [x + W / 2, y, z - 0.35], max: [x + W / 2 + 0.6, y + H + 0.6, z + 0.35], tag: 'grubentor:pfosten', camIgnore: true });
    level.world.add({ type: 'box', min: [x - W / 2 - 0.6, y + H, z - 0.35], max: [x + W / 2 + 0.6, y + H + 0.6, z + 0.35], tag: 'grubentor:sturz', camIgnore: true });
    this.leafShape = { type: 'box', min: [x - W / 2, y, z - 0.12], max: [x + W / 2, y + H, z + 0.12], tag: 'grubentor:fluegel', camIgnore: true };
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
    if (w.state === 'done' || w.clock > 2) { said = true; return; }   // (Bildfenster versetzt, z. B. Tests)
    said = true;
    level.archetype?.hud?.banner?.(cfg.text, { hold: cfg.hold ?? 1.8, size: cfg.size ?? 15, color: cfg.color ?? '#ffe066' });
    level.sfx('panic');
  });
}

/**
 * „Glitzer“-Variante des Themas fuzzymine (6-7): etwas helleres, wärmeres Licht, kräftigere Laternen und ein hellerer
 * Lichtkreis um die Heldin – der Schacht bleibt dunkel, aber freundlich. Aufbau-Haken (LEVEL.prebuild); das gemeinsame
 * Thema bleibt unverändert.
 */
export function glitzerThema(level, o = {}) {
  const v = level.view;
  if (!v) return;
  const base = v.theme;
  const th = {
    ...base,
    hemi: { ...base.hemi, sky: o.hemiSky ?? 0xf4d0a0, intensity: o.hemi ?? 1.08 },
    sun: { ...base.sun, intensity: o.sun ?? 1.5 },
    lanternLight: { ...(base.lanternLight ?? {}), intensity: o.lantern ?? 30, distance: o.lanternDist ?? 12.5 },
    playerLight: { ...(base.playerLight ?? {}), intensity: o.player ?? 28, distance: o.playerDist ?? 15 },
  };
  v.theme = th;
  if (v.hemi) { v.hemi.color.set(th.hemi.sky); v.hemi.intensity = th.hemi.intensity; }
  if (v.sun) v.sun.intensity = th.sun.intensity;
  if (v.playerLight) { v.playerLight.intensity = th.playerLight.intensity; v.playerLight.distance = th.playerLight.distance; }
}

/** Punkt auf einer durchhängenden Leine a → b bei u (0..1), Durchhang sag m. */
function sagAt(a, b, u, sag) {
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - Math.sin(u * Math.PI) * sag, a[2] + (b[2] - a[2]) * u];
}

/**
 * Lichterketten und Wimpelleinen (statisch, ohne Schatten): eine dunkle Leine von a nach b (Durchhang sag) mit bunten
 * Glühbirnen (Glüh-Material) bzw. Dreieckswimpeln. list: [{ a: [x, y, z], b: [x, y, z], sag: 0.8, every: 0.7, kind: 'licht' |
 * 'wimpel', colors }]. Ein Zeichenaufruf je Material und 32-m-Abschnitt.
 */
export function lichterketten(level, list) {
  if (!level.view) return;
  const wire = [], glow = [], flags = [];
  const LIGHT = [0xff5a7a, 0xffd23a, 0x5ae0ff, 0x8aff6a, 0xc07aff, 0xff9a3a];
  const FLAG = [0xff4f7a, 0xffd23a, 0x3ac8f0, 0x6ad04a, 0xb070ff, 0xff9a2e];
  for (const L of list) {
    const a = L.a, b = L.b, sag = L.sag ?? 0.8;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const n = Math.max(2, Math.round(len / (L.every ?? 0.7)));
    const segs = Math.max(6, Math.round(len / 0.8));
    for (let i = 0; i < segs; i++) {
      const p = sagAt(a, b, i / segs, sag), q = sagAt(a, b, (i + 1) / segs, sag);
      const d = new THREE.Vector3(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
      const l = d.length();
      const g = new THREE.CylinderGeometry(0.02, 0.02, l, 3);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
      g.translate((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2);
      wire.push(colorize(ni(g), (pp, nn, out) => { out[0] = 0.04; out[1] = 0.03; out[2] = 0.03; }));
    }
    const cols = (L.colors ?? (L.kind === 'wimpel' ? FLAG : LIGHT)).map(C);
    for (let i = 1; i < n; i++) {
      const p = sagAt(a, b, i / n, sag), c = cols[i % cols.length];
      if (L.kind === 'wimpel') {
        // Dreieck (Vorder- und Rückseite)
        const dx = (b[0] - a[0]) / len, dz = (b[2] - a[2]) / len, w = 0.24;
        const A = [p[0] - dx * w, p[1], p[2] - dz * w], B = [p[0] + dx * w, p[1], p[2] + dz * w], D = [p[0], p[1] - 0.5, p[2]];
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute([...A, ...B, ...D, ...A, ...D, ...B], 3));
        g.computeVertexNormals();
        flags.push(colorize(g, (pp, nn, out) => { out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; }));
      } else {
        const g = new THREE.OctahedronGeometry(0.11, 0);
        g.scale(1, 1.35, 1);
        g.translate(p[0], p[1] - 0.14, p[2]);
        glow.push(colorize(ni(g), (pp, nn, out) => { out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; }));
      }
    }
  }
  if (wire.length) addStatic(level, merge(wire), { castShadow: false });
  if (glow.length) addStatic(level, merge(glow), { material: 'glow', castShadow: false });
  if (flags.length) addStatic(level, merge(flags), { castShadow: false });
}

/** Lampenpfosten (Holzpfosten mit Querholz und Grubenlampe, leuchtet): pts [[x, y, z, seite (±1: Arm nach innen)], …]. */
export function lampenPfosten(level, pts, h = 3.4) {
  if (!level.view) return;
  const wood = [], glow = [];
  for (const [x, y, z, s = 1] of pts) {
    wood.push(blk(0.26, h, 0.26, x, y + h / 2, z, 0x6a4424, { top: 0x8a5a30 }));
    wood.push(blk(0.9, 0.16, 0.18, x + s * 0.4, y + h - 0.12, z, 0x7a4e2a));
    wood.push(blk(0.3, 0.32, 0.3, x + s * 0.75, y + h - 0.5, z, 0x3a3a44, { top: 0x5a5a66 }));
    const b = new THREE.SphereGeometry(0.13, 8, 6);
    b.translate(x + s * 0.75, y + h - 0.52, z);
    glow.push(colorize(ni(b), (p, n, out) => mixc(C(0xffb040), C(0xfff0b0), 0.5, out)));
    level.view.addLantern(x + s * 0.75, y + h - 0.6, z);
  }
  addStatic(level, merge(wood));
  addStatic(level, merge(glow), { material: 'glow', castShadow: false });
}

/** Himmelsbild (Leinwand): Blau-Verlauf, Sonne, Schäfchenwolken, schwebende Inseln mit Gras und Bäumchen, Regenbogen. */
function himmelsBild(w = 512, h = 384) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#3a8cf0'); sky.addColorStop(0.55, '#8ccaff'); sky.addColorStop(1, '#eaf6ff');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  // Regenbogen
  const cols = ['#ff5a5a', '#ffa03a', '#ffe84a', '#6ad84a', '#4ab0ff', '#9a6aff'];
  cols.forEach((col, i) => { g.strokeStyle = col; g.globalAlpha = 0.5; g.lineWidth = 9; g.beginPath(); g.arc(w * 0.62, h * 1.02, h * 0.62 - i * 9, Math.PI, Math.PI * 2); g.stroke(); });
  g.globalAlpha = 1;
  // Sonne
  const sun = g.createRadialGradient(w * 0.2, h * 0.2, 4, w * 0.2, h * 0.2, 46);
  sun.addColorStop(0, '#fffbe0'); sun.addColorStop(0.45, '#fff2a0'); sun.addColorStop(1, 'rgba(255,240,160,0)');
  g.fillStyle = sun; g.fillRect(0, 0, w * 0.5, h * 0.5);
  // schwebende Inseln
  const isle = (x, y, s) => {
    g.fillStyle = '#8a5a3a'; g.beginPath(); g.moveTo(x - 40 * s, y); g.lineTo(x + 40 * s, y); g.lineTo(x + 8 * s, y + 34 * s); g.lineTo(x - 6 * s, y + 30 * s); g.closePath(); g.fill();
    g.fillStyle = '#6ad04a'; g.beginPath(); g.ellipse(x, y, 42 * s, 9 * s, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#3aa040'; for (const dx of [-18, 6, 22]) { g.beginPath(); g.arc(x + dx * s, y - 12 * s, 9 * s, 0, Math.PI * 2); g.fill(); }
  };
  isle(w * 0.78, h * 0.42, 1.0); isle(w * 0.36, h * 0.6, 0.7); isle(w * 0.1, h * 0.72, 0.5);
  // Wolken
  const cloud = (x, y, s) => { g.fillStyle = '#ffffff'; for (const [dx, dy, r] of [[0, 0, 22], [22, 4, 18], [-22, 5, 16], [10, -10, 16], [-8, -8, 14]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); g.fill(); } };
  cloud(w * 0.5, h * 0.25, 1.1); cloud(w * 0.88, h * 0.18, 0.8); cloud(w * 0.15, h * 0.45, 0.9); cloud(w * 0.62, h * 0.82, 1.3); cloud(w * 0.3, h * 0.9, 1.0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Ausblick ins Freie am Ende des Decks (6-7): Rundbogen aus Balken in der Felswand, dahinter Himmel mit Wolken, Inseln und
 * Regenbogen (ein ungeleuchtetes Bild ohne Nebel), davor ein Geländer. cfg = { pos: [x, y, z] (Mitte unten, Wandfläche),
 * width: 9, height: 6.5 }
 */
export function himmelsfenster(level, cfg) {
  if (!level.view) return;
  const [x, y, z] = cfg.pos, W = cfg.width ?? 9, H = cfg.height ?? 6.5;
  const tex = himmelsBild();
  const shape = new THREE.Shape();
  shape.moveTo(-W / 2, 0); shape.lineTo(W / 2, 0); shape.lineTo(W / 2, H - W / 2);
  shape.absarc(0, H - W / 2, W / 2, 0, Math.PI, false);
  shape.lineTo(-W / 2, 0);
  const g = new THREE.ShapeGeometry(shape, 24);
  const uv = g.attributes.uv, pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + W / 2) / W, pos.getY(i) / H);
  const mat = new THREE.MeshBasicMaterial({ map: tex, fog: false, toneMapped: false });
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z + 0.05);
  m.renderOrder = -1;
  addObject(level, m);
  // Bogen aus Balken
  const parts = [];
  for (const s of [-1, 1]) parts.push(blk(0.5, H - W / 2, 0.6, x + s * (W / 2 + 0.25), y + (H - W / 2) / 2, z + 0.3, 0x6a4424, { top: 0x8a5a30 }));
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI, a1 = ((i + 1) / n) * Math.PI, am = (a0 + a1) / 2;
    const r = W / 2 + 0.25;
    const seg = ni(new THREE.BoxGeometry(0.5, (Math.PI * r) / n + 0.06, 0.6));
    seg.rotateZ(am);
    seg.translate(x + Math.cos(am) * r, y + H - W / 2 + Math.sin(am) * r, z + 0.3);
    parts.push(colorize(seg, (p, nn, out) => mixc(C(0x5a3a1e), C(0x8a5a30), smooth(-1, 1, nn.y + nn.z), out)));
  }
  // Geländer davor
  for (let i = 0; i <= 6; i++) parts.push(blk(0.14, 1.0, 0.14, x - W / 2 + (W * i) / 6, y + 0.5, z + 0.9, 0x7a4e2a));
  parts.push(blk(W + 0.3, 0.16, 0.18, x, y + 1.0, z + 0.9, 0x9a6a3a, { top: 0xb88450 }));
  parts.push(blk(W + 0.3, 0.12, 0.14, x, y + 0.55, z + 0.9, 0x8a5a30));
  addStatic(level, merge(parts));
  level.world.add({ type: 'box', min: [x - W / 2 - 0.2, y, z + 0.8], max: [x + W / 2 + 0.2, y + 1.1, z + 1.0], tag: 'geländer' });
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

// =====================================================================================================================
// 3) Panzerkolonne 6-Panzer
// =====================================================================================================================
//
// Konvoi-Koordinate c: Meter entlang der Kolonne nach vorn (−Z) ab dem Heck des ersten Panzers, gemessen beim Fahrtbeginn
// (Weltlage z = −c). Alle Panzer fahren mit vt, das Bildfenster schneller (vw) und gleitet an der Kolonne entlang nach vorn;
// an „Haltepunkten“ (holds: { c, T }) fährt es T s lang genau mit der Kolonne (Zeit für die Rätsel mit den Zündköpfen).
// Am Ende halten Fenster und Panzer gemeinsam (Fenstermitte über dem Kommandopanzer bei cEnd).

/**
 * Fahrplan der Kolonne mit derselben Mathematik wie das Spiel (ScrollWindow): o = { vt, vw, zp, cw0, cEnd, accel, brake,
 * holds: [{ c, T }] } → { speeds (LEVEL.scroll.speeds), start, end (Pfadlänge), T (s Fahrt bis zum Halt), ride (m Fahrstrecke
 * der Panzer bis zum Halt), holdS: [Pfadlänge je Haltepunkt] }.
 */
export function kolonnenFahrplan(o) {
  const { vt, vw, zp, cw0, cEnd } = o;
  const accel = o.accel ?? 6, brake = o.brake ?? 3;
  const start = zp + cw0;
  const speeds = [];
  const holdS = [];
  const run = (end, until) => {
    const w = new ScrollWindow({ path: [[0, 0, zp], [0, 0, -5000]], start, end, speed: vw, speeds: speeds.slice(), accel, delay: 0 });
    let n = 0;
    while (w.state !== 'done' && n < 120 * 900) {
      w.step(1 / 120);
      n++;
      if (until && until(w)) return w;
    }
    return w;
  };
  // Haltepunkte nacheinander einplanen: bei Erreichen von c fährt das Fenster T s lang mit Kolonnentempo
  for (const h of [...(o.holds ?? [])].sort((a, b) => a.c - b.c)) {
    const w = run(start + 4000, (ww) => ww.s - zp - vt * ww.clock >= h.c);
    holdS.push(w.s);
    speeds.push({ from: w.s, speed: vt }, { from: w.s + vt * h.T, speed: vw });
  }
  // Ende so wählen, dass die Fenstermitte beim Halt über cEnd steht
  let travel = cEnd - cw0 + 60, T = 0;
  for (let k = 0; k < 12; k++) {
    const w = run(start + travel);
    T = w.clock;
    const cw = start + travel - zp - vt * T;
    travel += cEnd - cw;
    if (Math.abs(cEnd - cw) < 1e-4) break;
  }
  const ride = vt * T + (vt * vt) / (2 * brake) / 2;
  return { speeds, start, end: start + travel, T, ride, holdS, brake };
}

/**
 * Panzer als Baustein (Kolonne 6-Panzer): t = { id, c (Mitte), len, w, h (Deckhöhe), x (Spur), color, parts: [{ dc, dx, y,
 * size, color, tag, climbable }] }, f = Fahrplan (kolonnenFahrplan) + { vt, zp }.
 */
export function panzer6(t, f) {
  const parts = (t.parts ?? []).map((q) => ({ pos: [q.dx ?? 0, q.y ?? t.h, -(q.dc ?? 0)], size: q.size, color: q.color, solid: q.solid, climbable: q.climbable, tag: q.tag, oneWay: q.oneWay }));
  return {
    type: 'vehicle', id: t.id, style: 'tank', size: [t.w, t.h, t.len], at: f.zp + t.c, speed: f.vt, stop: f.zp + t.c + f.ride, brake: f.brake,
    offset: [t.x ?? 0, 0], color: t.color ?? 'rot', parts,
  };
}

/** Weltpunkt (Fahrtbeginn) zu Konvoi-Koordinate c, seitlich x, Höhe y. */
export const kP = (c, x = 0, y = 0) => [x, y, -c];
/** Punkt auf einem Panzer (dc nach vorn, dx seitlich, y Höhe; Standard: Deck). */
export const aufPanzer = (t, dc, dx, y = t.h) => [(t.x ?? 0) + dx, y, -(t.c + dc)];

/**
 * Wolkenstraße: weiche, weiße Wolkenbank, auf der die Kolonne rollt (nur Optik – wer zwischen die Panzer fällt, plumpst
 * hindurch). cfg = { z0, z1 (Strecke), width: 15, y: 0 (Oberfläche), seed }. Dazu Wolkenbäusche an den Rändern.
 */
export function wolkenStrasse(level, cfg) {
  if (!level.view) return;
  const W = cfg.width ?? 15, y = cfg.y ?? 0;
  const z0 = Math.max(cfg.z0, cfg.z1), z1 = Math.min(cfg.z0, cfg.z1), L = z0 - z1;
  const nx = Math.max(4, Math.round(W / 1.2)), nz = Math.max(4, Math.round(L / 1.6));
  const g = new THREE.PlaneGeometry(W, L, nx, nz);
  g.rotateX(-Math.PI / 2);
  g.translate(cfg.x ?? 0, y, (z0 + z1) / 2);
  const pos = g.attributes.position;
  const cx = cfg.x ?? 0, sd = cfg.seed ?? 1;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i), pz = pos.getZ(i);
    const u = Math.abs(px - cx) / (W / 2);                     // 0 Mitte … 1 Rand
    const puff = Math.sin(pz * 0.9 + sd) * Math.sin(px * 1.3 + pz * 0.21) * 0.22 + Math.sin(pz * 0.37 + px * 0.6) * 0.18;
    pos.setY(i, y + puff * (1 - u * 0.4) - Math.pow(u, 3) * 1.6);
  }
  g.computeVertexNormals();
  // zarte Pastell-Flecken (rosa, himmelblau) im Weiß
  const pink = C(0xffe2f0), blau = C(0xdcebff), weiss = C(0xffffff), schatten = C(0xb4cdf0), tmp = [0, 0, 0];
  const geo = colorize(ni(g), (p, n, out) => {
    const k = Math.sin(p.x * 0.31 + p.z * 0.13 + sd) * Math.sin(p.z * 0.07 - p.x * 0.11);
    mixc(weiss, k > 0 ? pink : blau, Math.min(1, Math.abs(k) * 1.6) * 0.75, tmp);
    mixc(schatten, tmp, smooth(0.2, 0.95, n.y) * 0.8 + smooth(-1.4, y + 0.3, p.y) * 0.2, out);
  });
  const parts = [geo];
  // Wolkenwülste an beiden Rändern: ein bauschiger Schlauch je Seite (weiche Normalen), ab und zu ein großer Bausch
  for (const s of [-1, 1]) {
    const nzr = Math.max(8, Math.round(L / 0.7));
    const tube = new THREE.CylinderGeometry(1, 1, L, 14, nzr, true);
    tube.rotateX(Math.PI / 2);
    const tp = tube.attributes.position;
    for (let i = 0; i < tp.count; i++) {
      const vx = tp.getX(i), vy = tp.getY(i), vz = tp.getZ(i);
      const zz = vz + (z0 + z1) / 2;
      const r = 0.95 + 0.42 * Math.abs(Math.sin(zz * 0.62 + s * 1.3 + sd)) + 0.16 * Math.sin(zz * 1.9 + s);
      const flat = vy < 0 ? 0.55 : 0.85;
      tp.setXYZ(i, vx * r * 1.15, vy * r * flat, vz);
    }
    tube.computeVertexNormals();
    tube.translate(cx + s * (W / 2 - 0.1), y - 0.05, (z0 + z1) / 2);
    parts.push(colorize(ni(tube), (p, n, out) => {
      const k = Math.sin(p.z * 0.045 + s * 2 + sd);
      mixc(weiss, k > 0.4 ? pink : blau, smooth(0.4, 1, Math.abs(k)) * 0.6, tmp);
      mixc(schatten, tmp, smooth(-0.5, 0.7, n.y), out);
    }));
  }
  const rnd = new Rnd(cfg.seed ?? 5);
  for (let z = z0 - rnd.real(2, 8); z > z1; z -= rnd.real(9, 16)) {
    const s = rnd.real(0, 1) < 0.5 ? -1 : 1;
    for (let j = 0; j < 3; j++) {
      const r = rnd.real(1.0, 1.7) * (j === 1 ? 1.25 : 1);
      const b = new THREE.SphereGeometry(r, 12, 8);
      b.scale(1.2, 0.8, 1.1);
      b.translate(cx + s * (W / 2 + 0.6 + rnd.real(0, 0.8)), y + 0.4 + (j === 1 ? 0.5 : 0), z + (j - 1) * r * 1.2);
      parts.push(colorize(ni(b), (p, n, out) => mixc(schatten, weiss, smooth(-0.5, 0.7, n.y), out)));
    }
  }
  addStatic(level, merge(parts), { castShadow: false });
}

/**
 * Heißluftballons (Zierde über den Wolken, ohne Kollision/Schatten): gestreifte Hülle, Korb, Seile. Schweben sanft auf
 * und ab (eine gemeinsame Instanz je Ballon wäre teurer – alle Ballons sind ein Mesh, das als Ganzes wippt).
 * list: [{ x, y, z, r: 2, colors: [a, b] }]
 */
export function heissluftballons(level, list) {
  if (!level.view) return;
  const parts = [];
  for (const it of list) {
    const r = it.r ?? 2, [ca, cb] = (it.colors ?? [0xff4a6a, 0xffe04a]).map(C);
    const env = new THREE.SphereGeometry(r, 16, 12);
    const ep = env.attributes.position;
    for (let i = 0; i < ep.count; i++) {
      const vx = ep.getX(i), vy = ep.getY(i), vz = ep.getZ(i);
      const u = vy / r;                                         // −1 unten … 1 oben
      const k = u < 0 ? 1 - 0.62 * smooth(0, 1, -u) : 1;        // unten zum Hals verjüngt
      ep.setXYZ(i, vx * k, vy * (u < 0 ? 1.35 : 1.05), vz * k);
    }
    env.computeVertexNormals();
    env.translate(it.x, it.y, it.z);
    parts.push(colorize(ni(env), (p, n, out) => {
      const a = Math.atan2(p.z - it.z, p.x - it.x);
      const stripe = Math.floor(((a + Math.PI) / TAU) * 12) % 2;
      const c = stripe ? ca : cb;
      out[0] = c[0] * (0.82 + 0.18 * n.y); out[1] = c[1] * (0.82 + 0.18 * n.y); out[2] = c[2] * (0.82 + 0.18 * n.y);
    }));
    const by = it.y - r * 1.35 - r * 0.55;
    parts.push(blk(r * 0.42, r * 0.3, r * 0.42, it.x, by, it.z, 0x9a6a3a));
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const rope = new THREE.CylinderGeometry(0.025, 0.025, r * 0.62, 3);
      rope.translate(it.x + sx * r * 0.19, by + r * 0.15 + r * 0.31, it.z + sz * r * 0.19);
      parts.push(colorize(ni(rope), (p, n, out) => { const c = C(0x5a4030); out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; }));
    }
  }
  const mesh = new THREE.Mesh(merge(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }));
  mesh.castShadow = false; mesh.receiveShadow = false;
  mesh.userData.owned = true;
  let t = 0;
  addObject(level, mesh, (dt) => { t += Math.min(dt, 0.1); mesh.position.y = Math.sin(t * 0.7) * 0.35; });
}

/**
 * Schwebende Inselchen links und rechts der Wolkenstraße (fahren an der Kolonne vorbei): Felsunterseite, Grasdecke,
 * Bäumchen, Blumen, mal ein Fähnchen. list: [{ x, y, z, r, h }]. Statisch, ohne Sonnenschatten.
 */
export function schwebeInseln(level, list, o = {}) {
  if (!level.view) return;
  const parts = [], rnd = new Rnd(o.seed ?? 9);
  for (const it of list) {
    const { x, y, z } = it, r = it.r ?? 4, h = it.h ?? 4;
    const top = new THREE.CylinderGeometry(r, r * 0.92, 0.7, 12);
    top.translate(x, y - 0.35, z);
    parts.push(colorize(ni(top), (p, n, out) => mixc(C(0x58b83a), C(0x8ae25a), smooth(0, 1, n.y), out)));
    const cone = new THREE.ConeGeometry(r * 0.92, h, 10, 2);
    cone.rotateX(Math.PI);
    cone.translate(x, y - 0.7 - h / 2, z);
    const cp = cone.attributes.position;
    for (let i = 0; i < cp.count; i++) { const k = 1 + Math.sin(cp.getX(i) * 2.1 + cp.getZ(i) * 1.7) * 0.08; cp.setX(i, x + (cp.getX(i) - x) * k); cp.setZ(i, z + (cp.getZ(i) - z) * k); }
    cone.computeVertexNormals();
    parts.push(colorize(ni(cone), (p, n, out) => mixc(C(0x7a5a44), C(0xb48a62), smooth(y - 0.7 - h, y - 0.7, p.y), out)));
    // Bäumchen (runde Krone) und Blumen
    const nt = it.trees ?? Math.round(rnd.real(1, 3.2));
    for (let i = 0; i < nt; i++) {
      const a = rnd.real(0, TAU), d = rnd.real(0, r * 0.55);
      const tx = x + Math.cos(a) * d, tz = z + Math.sin(a) * d, th = rnd.real(1.6, 2.6);
      parts.push(blk(0.28, th, 0.28, tx, y + th / 2, tz, 0x8a5a30));
      const crown = new THREE.IcosahedronGeometry(rnd.real(0.9, 1.4), 1);
      crown.translate(tx, y + th + 0.5, tz);
      const cc = [0x5ad04a, 0x7ae05a, 0xff9ac8, 0xffd04a][Math.floor(rnd.real(0, 4))];
      parts.push(colorize(ni(crown), (p, n, out) => mixc(C(cc).map((v) => v * 0.7), C(cc), smooth(-0.5, 0.9, n.y), out)));
    }
    for (let i = 0; i < 6; i++) {
      const a = rnd.real(0, TAU), d = rnd.real(r * 0.3, r * 0.85);
      const f = new THREE.OctahedronGeometry(0.16, 0);
      f.translate(x + Math.cos(a) * d, y + 0.12, z + Math.sin(a) * d);
      const fc = [0xff5a7a, 0xffe04a, 0xffffff, 0xb07aff][i % 4];
      parts.push(colorize(ni(f), (p, n, out) => { const c = C(fc); out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; }));
    }
  }
  addStatic(level, merge(parts), { castShadow: false });
}

/**
 * Wolkenburg (6-Panzer): schwebender Felsen mit Wolkensockel, darauf der runde Kampfplatz (Bodenplatte, Kollision) und
 * vier Türme mit Spitzdächern und Wimpeln; Treppenstufen aus Wolken als Zier. cfg = { pos: [x, y, z] (Mitte der
 * Bodenoberseite), r: 13 (Plattform), towers: true }
 */
export function wolkenBurg(level, cfg) {
  const [x, y, z] = cfg.pos, R = cfg.r ?? 13;
  level.world.add({ type: 'cyl', x, z, r: R, y0: y - 3, y1: y, tag: 'wolkenburg' });
  if (!level.view) return;
  const stone = [], roof = [], cloud = [];
  const top = new THREE.CylinderGeometry(R, R, 0.6, 32);
  top.translate(x, y - 0.3, z);
  stone.push(colorize(ni(top), (p, n, out) => {
    const r = Math.hypot(p.x - x, p.z - z), ring = Math.floor(r / 1.6) % 2;
    mixc(C(ring ? 0xe8dcc8 : 0xd8c8b0), C(0xf8f0e0), smooth(0.5, 1, n.y) * 0.4, out);
  }));
  const body = new THREE.CylinderGeometry(R * 0.98, R * 0.5, 9, 16, 3);
  body.translate(x, y - 0.6 - 4.5, z);
  const bp = body.attributes.position;
  for (let i = 0; i < bp.count; i++) { const k = 1 + Math.sin(bp.getY(i) * 1.3 + bp.getX(i) * 0.7) * 0.06; bp.setX(i, x + (bp.getX(i) - x) * k); bp.setZ(i, z + (bp.getZ(i) - z) * k); }
  body.computeVertexNormals();
  stone.push(colorize(ni(body), (p, n, out) => mixc(C(0x8a7a96), C(0xc8b8d4), smooth(-0.6, 0.6, n.y + Math.sin(p.y * 1.4) * 0.3), out)));
  if (cfg.towers !== false) {
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      const tx = x + Math.cos(a) * (R + 1.2), tz = z + Math.sin(a) * (R + 1.2);
      const t = new THREE.CylinderGeometry(1.6, 1.8, 9, 12);
      t.translate(tx, y + 4.5 - 1, tz);
      stone.push(colorize(ni(t), (p, n, out) => mixc(C(0xd8ccc0), C(0xf4ece0), smooth(-1, 1, n.x * 0.5 + n.z * 0.5), out)));
      const r = new THREE.ConeGeometry(2.2, 3.4, 12);
      r.translate(tx, y + 8 + 1.7, tz);
      roof.push(colorize(ni(r), (p, n, out) => mixc(C(i % 2 ? 0x3a6aff : 0xff4a6a), C(i % 2 ? 0x8ab0ff : 0xff9ab0), smooth(-0.3, 0.9, n.y), out)));
    }
  }
  // Wolkenkranz unter der Burg
  const rnd = new Rnd(31);
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * TAU + rnd.real(-0.1, 0.1), d = R * rnd.real(0.75, 1.05);
    const b = new THREE.IcosahedronGeometry(rnd.real(1.8, 3.0), 1);
    b.scale(1.3, 0.75, 1.3);
    b.translate(x + Math.cos(a) * d, y - 3.6 + rnd.real(-0.8, 0.8), z + Math.sin(a) * d);
    cloud.push(colorize(ni(b), (p, n, out) => mixc(C(0xc8dcf4), C(0xffffff), smooth(-0.4, 0.8, n.y), out)));
  }
  addStatic(level, merge(stone), { material: 'stone' });
  addStatic(level, merge(roof));
  addStatic(level, merge(cloud), { castShadow: false });
}

/**
 * Level-Haken 6-Panzer (LEVEL.setup): übernimmt die Mitfahr-Regeln der Welt-2-Kolonne (panzerSetup: Marschblock-Kolonnen
 * mit `ride`, Neues über einem Deck fährt mit, Luke, Holzwand, Wimpel, Staub, Sparmaßnahmen) und ergänzt:
 *   · Werfer-Brüder mit `ride: '<Panzer>'` tänzeln um einen Platz, der mit dem Panzer mitfährt,
 *   · Zündköpfe (auch geworfene) über einem Deck fahren mit diesem Panzer,
 *   · weiße Wolkenfahnen statt Sandstaub, Ansagen (Zündkopf-Tipp, große ?-Blöcke).
 */
export function kolonnenSetup(level, panzerSetup) {
  level._panzerBuilt = true;                      // kein Wüsten-Abendrot (Welt-2-Haken)
  panzerSetup(level);
  const st = level._panzer;
  if (!st) return;
  const vehicles = st.vehicles;
  const byId = (id) => level.named.get(id);
  // Staubfahnen als Wolkenfetzen
  if (st.dust?.mat) { st.dust.mat.color.set(0xffffff); st.dust.mat.opacity = 0.62; }
  // Werfer mit ride: Platz (home) fährt mit
  const riders = [];
  for (const e of level.entities) {
    if (!e.spec?.ride || !e.home || e.kind === 'marschblock') continue;
    const v = byId(e.spec.ride);
    if (v) riders.push({ e, v, p0: v.pos.clone(), h0: e.home.clone() });
  }
  const seen = new WeakSet();
  const hud = () => level.archetype?.hud;
  let tipp = false;
  level.onStep(() => {
    for (const r of riders) {
      if (r.e.removed) continue;
      r.e.home.set(r.h0.x + r.v.pos.x - r.p0.x, r.h0.y + r.v.pos.y - r.p0.y, r.h0.z + r.v.pos.z - r.p0.z);
    }
    // Zündköpfe ohne attach über einem Deck: mitnehmen
    for (const e of level.entities) {
      if (e.kind !== 'zuendkopf' || e.removed || seen.has(e)) continue;
      if (e.spec?.attach) { seen.add(e); continue; }
      const v = vehicles.find((q) => !q.removed && Math.abs(e.pos.x - q.pos.x) < q.size.w / 2 + 0.4 && Math.abs(e.pos.z - q.pos.z) < q.size.d / 2 + 0.4 && e.pos.y > q.pos.y - 0.5);
      if (v) { e.spec.attach = v.spec.id; v.scanned = -1; seen.add(e); }
    }
    const p = level.player;
    if (!tipp && p?.holding?.kind === 'zuendkopf') {
      tipp = true;
      hud()?.banner?.('Wirf den Zündkopf! (Aktion)', { hold: 2.0, size: 13, y: 0.32, color: '#ffe066' });
    }
  });
}

/**
 * Festschmuck an der Wolkenstraße: rot-weiß geringelte Masten mit Goldknauf links und rechts (alle `every` m), dazwischen
 * Wimpelketten entlang der Straße – sie ziehen an der Kolonne vorbei (Fahrtgefühl). cfg = { z0, z1, every: 16, x: 8.8,
 * y: 0.4 (Fuß), h: 4.6 }
 */
export function strassenSchmuck(level, cfg) {
  if (!level.view) return;
  const every = cfg.every ?? 16, X = cfg.x ?? 8.8, y0 = cfg.y ?? 0.4, H = cfg.h ?? 4.6;
  const z0 = Math.max(cfg.z0, cfg.z1), z1 = Math.min(cfg.z0, cfg.z1);
  const poles = [], gold = [], ketten = [];
  const red = C(0xe8304a), white = C(0xfff4f0), blue = C(0x3a7aff);
  let i = 0;
  for (let z = z0; z >= z1; z -= every, i++) {
    for (const s of [-1, 1]) {
      const x = s * X;
      const g = new THREE.CylinderGeometry(0.13, 0.16, H, 8, 12);
      g.translate(x, y0 + H / 2, z);
      const alt = (i + (s > 0 ? 1 : 0)) % 2 ? blue : red;
      poles.push(colorize(ni(g), (p, n, out) => {
        const k = Math.floor((p.y - y0) * 2.2 + Math.atan2(p.z - z, p.x - x) / Math.PI) % 2;
        const c = k ? white : alt; out[0] = c[0]; out[1] = c[1]; out[2] = c[2];
      }));
      const ball = new THREE.SphereGeometry(0.26, 10, 8);
      ball.translate(x, y0 + H + 0.2, z);
      gold.push(colorize(ni(ball), (p, n, out) => mixc(C(0xd89a10), C(0xfff0a0), smooth(-0.3, 1, n.y), out)));
      if (z - every >= z1) ketten.push({ a: [x, y0 + H - 0.25, z], b: [x, y0 + H - 0.25, z - every], sag: 1.2, kind: 'wimpel', every: 0.75 });
    }
  }
  addStatic(level, merge(poles), { castShadow: false });
  addStatic(level, merge(gold), { castShadow: false, material: 'glow' });
  lichterketten(level, ketten);
}

/**
 * Regenbogen (Zierde, ohne Kollision und Schatten): Halbbogen aus sieben Farbbändern. cfg = { pos: [x, y, z] (Mitte am
 * Fuß), r: 8 (Außenradius), band: 0.45, yaw: 0 (Bogen in der XY-Ebene) }
 */
export function regenbogen(level, cfg) {
  if (!level.view) return;
  const [x, y, z] = cfg.pos, R = cfg.r ?? 8, b = cfg.band ?? 0.45;
  const cols = [0xff4a4a, 0xff9a3a, 0xffe04a, 0x5ad85a, 0x4ab0ff, 0x5a6aff, 0xb07aff];
  const parts = cols.map((col, i) => {
    const g = new THREE.TorusGeometry(R - b * (i + 0.5), b * 0.5, 4, 40, Math.PI);
    g.scale(1, 1, 0.6);
    if (cfg.yaw) g.rotateY(cfg.yaw);
    g.translate(x, y, z);
    return colorize(ni(g), (p, n, out) => { const c = C(col); out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; });
  });
  addStatic(level, merge(parts), { castShadow: false, material: 'glow' });
}

/** Einmal eine Aktion auslösen, sobald die benannte Entität `id` zerstört ist (Steinblock gesprengt → Stern erscheint). */
export function beiZerstoerung(level, id, action) {
  let done = false;
  level.onStep(() => {
    if (done) return;
    const e = level.named.get(id);
    if (!e || (!e.removed && e.alive !== false)) return;
    done = true;
    runAction(level, action, { pos: [e.pos.x, e.pos.y, e.pos.z], source: e });
  });
}

// =====================================================================================================================
// 4) Wolkenzirkus 6-C
// =====================================================================================================================

/** Weicher Leuchtpunkt (Canvas-Textur) für Sterne und Glühwürmchen. */
let DOT = null;
function dotTex() {
  if (DOT || typeof document === 'undefined') return DOT;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  DOT = new THREE.CanvasTexture(c);
  DOT.colorSpace = THREE.SRGBColorSpace;
  return DOT;
}

/**
 * Sternenhimmel über dem Nacht-Zirkus: funkelnde Punkte auf einer Kuppel um center (ohne Nebel, additiv, ein
 * Zeichenaufruf), dazu ein großer, blasser Mond. cfg = { center: [x, y, z], r: 170, n: 520, seed, moon: [x, y, z] }
 */
export function sternenhimmel(level, cfg) {
  if (!level.view) return;
  const [cx, cy, cz] = cfg.center ?? [0, 0, 0], R = cfg.r ?? 170, n = cfg.n ?? 520;
  const rnd = new Rnd(cfg.seed ?? 66);
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const pal = [0xffffff, 0xfff2c0, 0xc8e0ff, 0xffd0f0];
  for (let i = 0; i < n; i++) {
    const a = rnd.real(0, TAU), h = rnd.real(0.08, 1);
    const r = Math.sqrt(1 - h * h);
    pos[i * 3] = cx + Math.cos(a) * r * R; pos[i * 3 + 1] = cy + h * R * 0.55; pos[i * 3 + 2] = cz + Math.sin(a) * r * R;
    const c = new THREE.Color(pal[i % pal.length]).multiplyScalar(rnd.real(0.45, 1));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.PointsMaterial({ size: cfg.size ?? 2.6, map: dotTex(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, sizeAttenuation: true });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  pts.renderOrder = -5;
  pts.userData.owned = true;
  let t = 0;
  addObject(level, pts, (dt) => { t += Math.min(dt, 0.1); m.opacity = 0.82 + Math.sin(t * 1.7) * 0.12; });
  if (cfg.moon) {
    const [mx, my, mz] = cfg.moon;
    const moon = new THREE.Mesh(new THREE.CircleGeometry(cfg.moonR ?? 9, 40), new THREE.MeshBasicMaterial({ color: 0xfff4d8, fog: false, transparent: true, opacity: 0.95 }));
    moon.position.set(mx, my, mz);
    moon.lookAt(cx, cy + 10, cz);
    const halo = new THREE.Mesh(new THREE.CircleGeometry((cfg.moonR ?? 9) * 1.9, 40), new THREE.MeshBasicMaterial({ color: 0xffe8c0, fog: false, transparent: true, opacity: 0.16, depthWrite: false }));
    halo.position.copy(moon.position); halo.quaternion.copy(moon.quaternion); halo.translateZ(-0.5);
    for (const o of [moon, halo]) { o.userData.owned = true; o.renderOrder = -4; }
    addObject(level, moon);
    addObject(level, halo);
  }
}

/**
 * Zerrspiegel (Spiegelkabinett der Spiegelbühne): ovale Spiegel mit Goldrahmen auf Ständern, die Fläche schimmert
 * (Glüh-Material, Farbverlauf mit hellen Streifen). list: [{ pos: [x, y, z] (Fuß), yaw (Fläche zeigt dorthin, 0 = +Z),
 * w: 1.5, h: 2.4, tint: 0x9ad8ff, wave: 0 (Wellen des Zerrspiegels) }]
 */
export function zerrspiegel(level, list) {
  if (!level.view) return;
  const frame = [], glass = [];
  for (const it of list) {
    const [x, y, z] = it.pos, w = it.w ?? 1.5, h = it.h ?? 2.4, yaw = it.yaw ?? 0, wave = it.wave ?? 0;
    const lift = 0.5;
    const place = (g) => { g.rotateY(yaw); g.translate(x, y, z); return g; };
    // Ständer und Fuß
    frame.push(place(blk(0.16, lift + 0.3, 0.16, 0, (lift + 0.3) / 2, -0.12, 0x6a3a1a)));
    frame.push(place(blk(0.9, 0.12, 0.6, 0, 0.06, -0.12, 0x8a4a22)));
    // Rahmen: Ellipsenring
    const ring = new THREE.TorusGeometry(1, 0.07, 6, 32);
    ring.scale(w / 2, h / 2, 1);
    ring.translate(0, lift + h / 2, 0);
    frame.push(place(colorize(ni(ring), (p, n, out) => mixc(C(0xb07a10), C(0xffe080), smooth(-0.6, 0.9, n.y + n.z * 0.4), out))));
    // Spiegelfläche (Wellen: leicht gewölbt)
    const disc = new THREE.CircleGeometry(1, 28, 0, TAU);
    disc.scale(w / 2 - 0.04, h / 2 - 0.04, 1);
    const dp = disc.attributes.position;
    for (let i = 0; i < dp.count; i++) dp.setZ(i, 0.02 + Math.sin(dp.getY(i) * 3.2) * 0.05 * wave);
    disc.translate(0, lift + h / 2, 0.01);
    const tc = C(it.tint ?? 0x9ad8ff), hi = C(0xffffff);
    glass.push(place(colorize(ni(disc), (p, n, out) => {
      const s = Math.sin(p.x * 2.6 + p.y * 1.8) * 0.5 + 0.5;
      mixc(tc.map((v) => v * 0.55), hi, smooth(0.55, 1, s) * 0.7 + smooth(lift + h * 0.7, lift + h, p.y - y) * 0.2, out);
    })));
    // Krönchen oben
    const crown = new THREE.ConeGeometry(0.16, 0.34, 5);
    crown.translate(0, lift + h + 0.2, 0);
    frame.push(place(colorize(ni(crown), (p, n, out) => { const c = C(0xffd04a); out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; })));
  }
  addStatic(level, merge(frame), { castShadow: false });
  addStatic(level, merge(glass), { material: 'glow', castShadow: false });
}

/** Leinwand-Plakat „Glibber-Gala“ (eigene Gestaltung: bunter Gelee-Würfel mit Melonen-Hut, Sterne). */
function galaTexture() {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 320;
  const g = c.getContext('2d');
  g.fillStyle = '#2a1050'; g.fillRect(0, 0, 256, 320);
  g.fillStyle = '#ffc21a'; g.fillRect(8, 8, 240, 304);
  g.fillStyle = '#5a1a8a'; g.fillRect(16, 16, 224, 288);
  // Sterne
  g.fillStyle = '#fff2a0';
  for (const [x, y, r] of [[40, 40, 6], [210, 52, 8], [34, 150, 5], [222, 168, 6], [128, 34, 5]]) { g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); }
  // Gelee-Würfel (bunte Stückchen)
  const cols = ['#ff4a6a', '#3a8aff', '#5ad85a', '#ffd04a'];
  for (let i = 0; i < 4; i++) { g.fillStyle = cols[i]; g.fillRect(78 + (i % 2) * 50, 104 + Math.floor(i / 2) * 50, 50, 50); }
  g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.strokeRect(78, 104, 100, 100);
  // Augen
  g.fillStyle = '#fff'; g.beginPath(); g.arc(108, 140, 12, 0, TAU); g.arc(148, 140, 12, 0, TAU); g.fill();
  g.fillStyle = '#111'; g.beginPath(); g.arc(110, 142, 6, 0, TAU); g.arc(150, 142, 6, 0, TAU); g.fill();
  // Melonen-Hut
  g.fillStyle = '#7a3ad8'; g.fillRect(96, 78, 64, 26); g.fillRect(84, 100, 88, 8);
  g.fillStyle = '#ff9ad0'; g.fillRect(96, 92, 64, 6);
  g.fillStyle = '#fff6d0'; g.textAlign = 'center';
  g.font = 'bold 30px "Nunito", Arial, sans-serif'; g.fillText('Glibber-Gala', 128, 250);
  g.font = 'bold 22px "Nunito", Arial, sans-serif'; g.fillText('heute Nacht!', 128, 282);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Plakatwand „Glibber-Gala“ auf zwei Pfosten. cfg = { pos: [x, y, z] (Fuß), yaw } */
export function galaPlakat(level, cfg) {
  if (!level.view) return;
  const [x, y, z] = cfg.pos, yaw = cfg.yaw ?? 0;
  const posts = [-1.15, 1.15].map((dx) => { const g = blk(0.14, 3.3, 0.14, dx, 1.65, -0.05, 0x5a3a2a); g.rotateY(yaw); g.translate(x, y, z); return g; });
  addStatic(level, merge(posts));
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.6), new THREE.MeshLambertMaterial({ map: galaTexture(), emissive: 0x302040 }));
  pl.position.set(x, y + 2.0, z);
  pl.rotation.y = yaw;
  pl.position.x += Math.sin(yaw) * 0.04; pl.position.z += Math.cos(yaw) * 0.04;
  pl.userData.owned = true;
  addObject(level, pl);
}

/**
 * Seilbahn-Rückruf (wie 3-B): wartet die Gondel leer am oberen Ende und steht eine Figur an der Talstation, fährt sie
 * nach 0,8 s zurück. cfg = { id (Seilbahn), station: { x0, x1, z0, z1, y } }
 */
export function gondelRuf(level, cfg) {
  const g = level.named.get(cfg.id);
  if (!g) return;
  const s = cfg.station;
  let t = 0;
  level.onStep((dt) => {
    const p = level.player;
    if (!p || p.dead) return;
    const at = p.pos.x > s.x0 && p.pos.x < s.x1 && p.pos.z > s.z0 && p.pos.z < s.z1 && Math.abs(p.pos.y - s.y) < 1.5;
    t = at && g.state === 'wait' && g.u >= 1 ? t + dt : 0;
    if (t > 0.8) { g.state = 'move'; g.dir = -1; g.needEmpty = false; t = 0; level.sfx('switch'); }
  });
}

/** Feuerwerk (Funkenbälle) über einem Platz, solange near(Figur) gilt. cfg = { x, z, y, near, r: [4, 12] } */
export function feuerwerk(level, cfg) {
  let t = 0;
  level.onStep((dt) => {
    const p = level.player;
    if (!level.view || !p || !cfg.near(p)) return;
    t -= dt;
    if (t > 0) return;
    t = 0.5;
    const a = level.rnd.real(0, TAU), r = level.rnd.real(...(cfg.r ?? [4, 12]));
    level.effects?.sparks({ x: cfg.x + Math.cos(a) * r, y: cfg.y + level.rnd.real(9, 15), z: cfg.z + Math.sin(a) * r * 0.5 }, 26);
  });
}

/**
 * Riesenrad (Zierde im Hinterhof): Gestell (statisch) und ein sich langsam drehendes Rad mit Speichen, Leuchtkugeln und
 * bunten Gondeln, die waagerecht hängen bleiben (ein Mesh fürs Rad, ein Instanz-Mesh für die Gondeln). Ohne Kollision.
 * cfg = { pos: [x, y, z] (Fuß, Mitte), r: 7, yaw: 0 (Rad in der XY-Ebene), n: 10 }
 */
export function riesenrad(level, cfg) {
  if (!level.view) return;
  const [x, y, z] = cfg.pos, R = cfg.r ?? 7, n = cfg.n ?? 10, yaw = cfg.yaw ?? 0, H = R + 1.6;
  // Gestell: zwei schräge Stützenpaare
  const legs = [];
  for (const sz of [-0.9, 0.9]) for (const sx of [-1, 1]) {
    const a = new THREE.Vector3(x + sx * R * 0.55, y, z + sz), b = new THREE.Vector3(x, y + H, z + sz);
    const d = b.clone().sub(a), l = d.length();
    const g = new THREE.CylinderGeometry(0.16, 0.22, l, 6);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
    g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    legs.push(colorize(ni(g), (p, nn, out) => mixc(C(0x8a8aa6), C(0xd8d8ec), smooth(-0.5, 0.8, nn.y + nn.x * 0.3), out)));
  }
  const st = merge(legs);
  if (yaw) { st.translate(-x, -y, -z); st.rotateY(yaw); st.translate(x, y, z); }
  addStatic(level, st, { castShadow: false });
  // Rad (lokal um die Nabe)
  const wheel = [], glow = [];
  for (const dz of [-0.6, 0.6]) {
    const ring = new THREE.TorusGeometry(R, 0.12, 6, 48);
    ring.translate(0, 0, dz);
    wheel.push(colorize(ni(ring), (p, nn, out) => { const c = C(0xe8304a); out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; }));
  }
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    for (const dz of [-0.6, 0.6]) {
      const sp = new THREE.CylinderGeometry(0.05, 0.05, R, 4);
      sp.translate(0, R / 2, dz); sp.rotateZ(a - Math.PI / 2);
      wheel.push(colorize(ni(sp), (p, nn, out) => { const c = C(0xfff2e0); out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; }));
    }
    for (let k = 0; k < 3; k++) {
      const b = new THREE.SphereGeometry(0.13, 6, 4);
      const aa = a + (k / 3) * (TAU / n);
      b.translate(Math.cos(aa) * (R + 0.18), Math.sin(aa) * (R + 0.18), 0.65);
      glow.push(colorize(ni(b), (p, nn, out) => { const c = C([0xffe060, 0xff7ad8, 0x7ae0ff][k]); out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; }));
    }
  }
  const hub = new THREE.CylinderGeometry(0.5, 0.5, 1.6, 12);
  hub.rotateX(Math.PI / 2);
  wheel.push(colorize(ni(hub), (p, nn, out) => { const c = C(0xffc21a); out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; }));
  const group = new THREE.Group();
  group.position.set(x, y + H, z);
  group.rotation.y = yaw;
  const rot = new THREE.Group();
  const wm = new THREE.Mesh(merge(wheel), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }));
  const gm = new THREE.Mesh(merge(glow), new THREE.MeshBasicMaterial({ vertexColors: true }));
  rot.add(wm, gm);
  // Gondeln: kleine bunte Körbe (Instanzen), hängen immer senkrecht
  const cab = merge([blk(1.1, 0.8, 1.0, 0, -0.9, 0, 0xffffff), blk(1.3, 0.12, 1.2, 0, -0.08, 0, 0xffffff)]);
  const cm = new THREE.InstancedMesh(cab, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), n);
  const pal = [0xff4a6a, 0x3a8aff, 0xffd04a, 0x5ad85a, 0xb07aff];
  for (let i = 0; i < n; i++) cm.setColorAt(i, new THREE.Color(pal[i % pal.length]));
  cm.frustumCulled = false;
  group.add(rot, cm);
  group.traverse((o) => { if (o.isMesh) { o.userData.owned = true; o.castShadow = false; } });
  const M = new THREE.Matrix4();
  let t = 0;
  addObject(level, group, (dt) => {
    t += Math.min(dt, 0.1);
    const w = t * 0.18;
    rot.rotation.z = w;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + w;
      M.makeTranslation(Math.cos(a) * R, Math.sin(a) * R, 0);
      cm.setMatrixAt(i, M);
    }
    cm.instanceMatrix.needsUpdate = true;
  });
}

export { clamp, C, blk };
