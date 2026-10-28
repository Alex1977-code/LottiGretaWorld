// Hilfen für die Welt-7-Level 7-3 „Pfeilflitzer über dem Glutstrom“, 7-4 „Schubser-Rummel im Blauglutkessel“ und 7-B
// „Blaufeuer-Prinz im Glutzwinger“ (kein Level: exportiert kein LEVEL, die Level-Registry überspringt dieses Modul).
//
// Oben reine Daten-Helfer (Inseln, Münzspuren – aus Welt 6 übernommen), darunter level-lokale Kulisse und kleine Mechanik,
// die es als Baustein nicht gibt. Statische Zier entsteht im Aufbau-Haken `LEVEL.build` (vor dem Verschmelzen: landet in
// den Abschnitts-Meshes, keine zusätzlichen Zeichenaufrufe), Leuchtendes im Glüh-Material bzw. im gemeinsamen Leuchtfeld
// (glowPoints, ein Zeichenaufruf).
//
// Gemeinsam:  isl, line, ring, arc, column, Bld/litTop/gradY (Welt 5), onRespawn, glowPoints, wimpelkette (Welt 6)
//             lavaGrund (tödliche Lava-Ebene unter der Kulisse), stuetzen (Basaltpfeiler unter den Wegen bis in die Lava),
//             pfeile (Boost-Pfeile: Auslöser wie Baustein boost, Platten verschmolzen, Lauflicht-Chevrons als eine
//             Instanz-Gruppe für alle Pfeile des Levels)
// 7-3:        startTor (Renn-Startbogen mit Zielflaggen-Muster), zielTor, flaggen (Karo-Fähnchen), lavaRinne (glühende Rinne
//             in einer Weglücke), rennKulisse (Basaltnadeln, Lavafälle, Glutfunken), geheimHof (Versteck der Pilzlinge)
// 7-4:        festungBau (Steinbauten über blauer Lava: Mauerkrone, Zinnen, Fenster), blauKristalle, ketten
// 7-B:        glutZwinger (Käfig über dem Lavasee mit Glasröhren-Mündungen), prinzKampf (aus Welt 6)

import * as THREE from 'three';
import { colorize, merge, lin, mixc, smooth, hex, addStatic, addObject, Rnd } from '../../blocks/kit.js';
import { visDt } from '../../entities/gimmick.js';
import { isl, line, ring, arc, column, sign, Bld, litTop, gradY, onRespawn, prinzKampf } from '../w6/_helpers_b.js';
import { wimpelkette } from '../w6/_helpers_a.js';
import { glowPoints } from '../w5/_helpers_b.js';

export { isl, line, ring, arc, column, sign, Bld, litTop, gradY, onRespawn, prinzKampf, wimpelkette, glowPoints };

const TAU = Math.PI * 2;
const HALF_PI = Math.PI / 2;
const L = (c) => lin(hex(c));
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const fill = (g, c) => { const k = Array.isArray(c) ? c : L(c); return colorize(ni(g), (p, n, o) => { o[0] = k[0]; o[1] = k[1]; o[2] = k[2]; }); };

// =====================================================================================================================
// Gemeinsam
// =====================================================================================================================

/**
 * Tödliche Lava-Ebene (Form kill 'lava', folgt lavaTopAt) bei y – unter der Kulissen-Lava des Themas (lavarun: 9 m unter
 * dem tiefsten Teil des Levels). Unsichtbar, die Kulisse zeigt die Lava.
 */
export function lavaGrund(level, y, o = {}) {
  const [w, d] = o.size ?? [4000, 4000];
  const c = o.center ?? [0, -300];
  level.world.add({ type: 'box', min: [c[0] - w / 2, y - 60, c[1] - d / 2], max: [c[0] + w / 2, y - 0.12, c[1] + d / 2], kill: 'lava', lava: true, surface: y, lavaColor: o.color ?? 'rot', solid: false, camIgnore: true, tag: 'lava-grund' });
}

/**
 * Basaltpfeiler unter Wegen und Inseln bis hinab in die Lava (nur Optik, ohne Sonnenschatten): sechseckige Säulen mit
 * hellen Deckflächen, nach unten dunkler, am Fuß glühend. rects: [[x0, x1, zA, zB, yBottom], …]; o: { lava (y der
 * Lava), every (m Abstand), color, glow }.
 */
export function stuetzen(level, rects, o = {}) {
  if (!level.view) return;
  const yl = o.lava ?? -9, every = o.every ?? 5.5;
  const bas = L(o.color ?? 0x3a2c32), basH = L(0x6a5660), hot = L(o.glow ?? 0xff7a2a);
  const parts = [];
  const rnd = new Rnd(o.seed ?? 71);
  for (const [x0, x1, zA, zB, yb] of rects) {
    const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
    const w = x1 - x0, d = z0 - z1;
    const along = d >= w ? 'z' : 'x';
    const len = along === 'z' ? d : w, cross = along === 'z' ? w : d;
    const n = Math.max(1, Math.round(len / every));
    const r = Math.min(cross * 0.42, 1.5);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const cx = along === 'z' ? (x0 + x1) / 2 + rnd.real(-0.15, 0.15) * cross : x0 + w * t;
      const cz = along === 'z' ? z0 - d * t : (z0 + z1) / 2 + rnd.real(-0.15, 0.15) * cross;
      const rr = r * rnd.real(0.85, 1.1);
      const top = yb + 0.05, h = top - yl + 1;
      const g = new THREE.CylinderGeometry(rr * 0.92, rr * 1.12, h, 6, Math.max(1, Math.round(h / 4)));
      g.rotateY(rnd.real(0, 1));
      g.translate(cx, yl - 1 + h / 2, cz);
      parts.push(colorize(ni(g), (p, nn, out) => {
        const k = smooth(yl - 1, top, p.y);
        mixc(bas, basH, smooth(-0.7, 0.9, nn.x * 0.5 + nn.z * 0.4) * (0.4 + 0.6 * k), out);
        if (Math.abs(((p.y - yl) % 2.6)) < 0.08) mixc(out, bas, 0.7, out);
        mixc(out, hot, smooth(yl + 3.5, yl - 0.5, p.y) * 0.85, out);
      }));
      // kleine Nebensäule
      if (rnd.real(0, 1) < 0.55) {
        const r2 = rr * 0.5, h2 = h * rnd.real(0.45, 0.8);
        const a = rnd.real(0, TAU);
        const g2 = new THREE.CylinderGeometry(r2 * 0.9, r2, h2, 6);
        g2.translate(cx + Math.cos(a) * rr * 1.3, yl - 1 + h2 / 2, cz + Math.sin(a) * rr * 1.3);
        parts.push(colorize(ni(g2), (p, nn, out) => { mixc(bas, basH, smooth(-0.7, 0.9, nn.y * 0.6 + nn.x * 0.3), out); mixc(out, hot, smooth(yl + 3, yl - 0.5, p.y) * 0.85, out); }));
      }
    }
  }
  if (parts.length) addStatic(level, merge(parts), { castShadow: false });
}

/** Chevron (Pfeilspitze nach +X), flach auf dem Boden. */
function chevronGeo(w) {
  const s = new THREE.Shape();
  const a = w * 0.42, d = 0.22, t = 0.16;
  s.moveTo(-d, a); s.lineTo(-d + t, a); s.lineTo(d + t, 0); s.lineTo(-d + t, -a); s.lineTo(-d, -a); s.lineTo(d, 0); s.closePath();
  const g = new THREE.ShapeGeometry(s);
  g.rotateX(-HALF_PI);
  return g;
}

/**
 * Boost-Pfeile (Bauplan 7-3 „56 Boost-Pfeile“): jeder Eintrag wie der Baustein `boost` – nicht fester Auslöser mit
 * Motor-Flag boost { x, z, speed } (beschleunigt die Figur in Pfeilrichtung) –, aber sparsam gezeichnet: Grundplatten
 * (dunkelblau mit Goldsaum) verschmolzen in die statische Geometrie, alle Chevrons des Levels als **eine** Instanz-Gruppe
 * mit Lauflicht. list: [{ pos: [x, y, z] (Mitte, y = Boden), dir: [dx, dz] (Standard [0, −1]), size: [w, len] ([1.8, 2.4]),
 * speed: 16 }]. level.named 'pfeile' = { n, list }.
 */
export function pfeile(level, list, o = {}) {
  const items = [];
  for (const a of list) {
    const p = { x: a.pos[0], y: a.pos[1], z: a.pos[2] };
    let [dx, dz] = a.dir ?? [0, -1];
    const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const [w, len] = a.size ?? o.size ?? [1.8, 2.4];
    const speed = a.speed ?? o.speed ?? 16;
    const hx = (Math.abs(dx) * len + Math.abs(dz) * w) / 2, hz = (Math.abs(dz) * len + Math.abs(dx) * w) / 2;
    level.world.add({ type: 'box', min: [p.x - hx, p.y - 0.05, p.z - hz], max: [p.x + hx, p.y + 0.3, p.z + hz], trigger: true, solid: false, boost: { x: dx, z: dz, speed }, tag: 'boost' });
    items.push({ p, dx, dz, w, len, yaw: Math.atan2(-dz, dx) });
  }
  level.named.set(o.id ?? 'pfeile', { n: items.length, list: items });
  if (!level.view || !items.length) return;
  // Grundplatten (statisch)
  const b = new Bld();
  for (const it of items) {
    b.box(it.len, 0.07, it.w, it.p.x, it.p.y - 0.02, it.p.z, litTop(0x24308a, 0.7), { yaw: it.yaw, r: 0.03 });
    const ox = -Math.sin(it.yaw), oz = -Math.cos(it.yaw);   // quer zur Pfeilrichtung (lokal +Z)
    for (const s of [-1, 1]) b.box(it.len - 0.12, 0.03, 0.08, it.p.x + ox * s * (it.w / 2 - 0.1), it.p.y + 0.04, it.p.z + oz * s * (it.w / 2 - 0.1), 0xffc21a, { yaw: it.yaw, r: 0 });
  }
  b.flush(level, { castShadow: false });
  // Chevrons: eine Instanz-Gruppe, Lauflicht je Pfeil
  const per = o.chevrons ?? 3;
  const geo = chevronGeo(items[0].w);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const im = new THREE.InstancedMesh(geo, mat, items.length * per);
  im.name = 'boostpfeile';
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const c = new THREE.Color(), lo = new THREE.Color(0xff6a10), hi = new THREE.Color(0xfff6a0);
  items.forEach((it, k) => {
    q.setFromAxisAngle(up, it.yaw);
    s.set(1, 1, it.w / items[0].w);
    for (let i = 0; i < per; i++) {
      const u = -it.len / 2 + (i + 0.5) * (it.len / per) - 0.05;
      v.set(it.p.x + it.dx * u, it.p.y + 0.07, it.p.z + it.dz * u);
      m.compose(v, q, s);
      im.setMatrixAt(k * per + i, m);
      im.setColorAt(k * per + i, lo);
    }
  });
  im.instanceMatrix.needsUpdate = true;
  im.computeBoundingSphere?.();
  im.castShadow = false; im.receiveShadow = false;
  const holder = {};
  let t = 0;
  addObject(level, im, (dt) => {
    t += visDt(level, holder, dt);
    for (let k = 0; k < items.length; k++) {
      for (let i = 0; i < per; i++) {
        const e = Math.pow(Math.max(0, Math.sin(t * 6 - i * 1.25 - k * 0.37)), 3);
        im.setColorAt(k * per + i, c.copy(lo).lerp(hi, e));
      }
    }
    im.instanceColor.needsUpdate = true;
  });
}

/** Karo-Muster (Zielflagge) als Bld-Farbe ({ v }) nach Weltlage: Feldgröße cell, u/w aus (x, y) bzw. (z, y). */
function karoV(cell, axis = 'xy', a = 0x1a1a22, bcol = 0xffffff) {
  const A = new THREE.Color(a), B = new THREE.Color(bcol);
  return { v: (x, y, z) => ((Math.floor((axis === 'zy' ? z : x) / cell + 1000) + Math.floor((axis === 'xz' ? z : y) / cell + 1000)) & 1 ? A : B) };
}

/** Karierte Start-/Ziellinie quer über den Weg (x0 … x1) bei z, Höhe y (flach, leicht über dem Boden). */
export function karoLinie(level, x0, x1, z, y, depth = 1.2) {
  if (!level.view) return;
  const b = new Bld();
  const nx = Math.max(1, Math.round((x1 - x0) / 0.4)), nz = Math.max(1, Math.round(depth / 0.4));
  const cx = (x1 - x0) / nx, cz = depth / nz;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    b.box(cx, 0.03, cz, x0 + (i + 0.5) * cx, y + 0.002, z - depth / 2 + (j + 0.5) * cz, ((i + j) & 1) ? 0x16161e : 0xffffff, { r: 0 });
  }
  b.flush(level, { castShadow: false });
}

/**
 * Renn-Torbogen über einem Weg (7-3 Start und Ziel): zwei Basalt-Türme mit Glutfenstern und Kegeldach, darüber ein Balken
 * mit Karo-Band und Brummbär-roten Wimpeln, Fackelschalen oben. o: { x, y, z, w (lichte Weite), h (lichte Höhe), color }.
 */
export function startTor(level, o) {
  if (!level.view) return;
  const { x, y, z } = o, W = o.w ?? 6, H = o.h ?? 5;
  const b = new Bld(), g = new Bld();
  const stone = 0x4a3c44, dark = 0x2a2026, red = o.color ?? 0xe0302a, gold = 0xffc21a;
  for (const s of [-1, 1]) {
    const tx = x + s * (W / 2 + 0.8);
    b.box(1.6, H + 0.6, 1.6, tx, y, z, litTop(stone, 0.6), { r: 0.12 });
    b.box(1.9, 0.4, 1.9, tx, y, z, litTop(dark, 0.7), { r: 0.08 });
    // Quaderbänder, Goldkranz und rot-weiße Rennstreifen am Turm
    for (let k = 1; k < 4; k++) b.box(1.68, 0.12, 1.68, tx, y + k * (H / 4), z, litTop(dark, 0.7), { r: 0.03 });
    b.box(1.74, 0.16, 1.74, tx, y + H + 0.44, z, gold, { r: 0.04 });
    for (let k = 0; k < 6; k++) b.box(1.64, 0.22, 0.06, tx, y + 0.6 + k * 0.22, z + 0.81, (k & 1) ? 0xffffff : red, { r: 0 });
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.785; b.box(0.5, 0.5, 0.5, tx + Math.cos(a) * 0.7, y + H + 0.6, z + Math.sin(a) * 0.7, litTop(stone, 0.6), { r: 0.05 }); }
    b.cone(0.95, 1.8, tx, y + H + 1.1, z, litTop(red, 0.6), 8);
    b.sphere(0.16, tx, y + H + 3.05, z, gold, { ws: 8, hs: 6 });
    g.box(0.36, 0.8, 0.1, tx, y + H * 0.45, z + 0.81, 0xffb040, { r: 0.08 });
    g.box(0.36, 0.8, 0.1, tx, y + H * 0.45, z - 0.81, 0xffb040, { r: 0.08 });
  }
  // Balken mit Karo-Band (vorn und hinten)
  b.box(W + 3.4, 0.9, 0.9, x, y + H, z, litTop(dark, 0.7), { r: 0.1 });
  {
    // Karo-Band (Kästchen, vorn und hinten)
    const n = Math.round((W + 1.6) / 0.35), cw = (W + 1.6) / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) {
      b.box(cw, 0.35, 0.96, x - (W + 1.6) / 2 + (i + 0.5) * cw, y + H + 0.1 + j * 0.35, z, ((i + j) & 1) ? 0x16161e : 0xffffff, { r: 0 });
    }
  }
  // Wimpel unter dem Balken
  const cols = [0xe0302a, 0xffc21a, 0xe0302a, 0x1a1a22];
  const n = Math.round(W / 0.7);
  for (let i = 0; i < n; i++) {
    const px = x - W / 2 + (i + 0.5) * (W / n);
    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([px - 0.3, y + H - 0.45, z, px + 0.3, y + H - 0.45, z, px, y + H - 1.1, z], 3));
    tri.computeVertexNormals();
    b.add(tri, cols[i % cols.length]);
    const tri2 = tri.clone(); tri2.scale(1, 1, 1);
    const pos = tri2.getAttribute('position');
    // Rückseite (umgekehrte Reihenfolge)
    const arr = pos.array; const back = new THREE.BufferGeometry();
    back.setAttribute('position', new THREE.Float32BufferAttribute([arr[3], arr[4], arr[5], arr[0], arr[1], arr[2], arr[6], arr[7], arr[8]], 3));
    back.computeVertexNormals();
    b.add(back, cols[i % cols.length]);
  }
  // Feuerschalen auf den Türmen
  for (const s of [-1, 1]) g.sphere(0.32, x + s * (W / 2 + 0.8), y + H + 0.9 + 1.8 * 0.55, z, 0xffa020, { s: [1, 1.4, 1] });
  b.flush(level);
  g.flush(level, { material: 'glow', castShadow: false });
  glowPoints(level, [[x - W / 2 - 0.8, y + H + 2.0, z, 1.6], [x + W / 2 + 0.8, y + H + 2.0, z, 1.6]], { color: 0xff8a2a, size: 2.2, opacity: 0.8, pulse: 1.3 });
  // Kollision der Türme (der Weg zwischen ihnen bleibt frei)
  for (const s of [-1, 1]) {
    const tx = x + s * (W / 2 + 0.8);
    level.world.add({ type: 'box', min: [tx - 0.8, y, z - 0.8], max: [tx + 0.8, y + H + 0.6, z + 0.8], tag: 'starttor' });
  }
  level.world.add({ type: 'box', min: [x - W / 2 - 1.6, y + H - 0.0, z - 0.45], max: [x + W / 2 + 1.6, y + H + 0.9, z + 0.45], camIgnore: true, tag: 'starttor-balken' });
}

/**
 * Rennstrecken-Markierung auf schmalen Dämmen (nur Optik, verschmolzen): leuchtende gelbe Mittelstriche, an den Kanten
 * kleine Leitpfosten mit glühender Kappe, ab und zu ein Bitcoin-Zeichen auf dem Damm. list: [[x0, x1, zA, zB, y], …]
 * (Dämme entlang Z). o: { dash: 2.2 (Abstand), post: 6 (Abstand der Pfosten), skip: [[zA, zB], …] (ohne Striche, z. B.
 * unter Boost-Pfeilen) }.
 */
export function fahrbahn(level, list, o = {}) {
  if (!level.view) return;
  const g = new Bld(), b = new Bld();
  const skip = o.skip ?? [];
  const free = (z) => !skip.some(([a, c]) => z <= Math.max(a, c) && z >= Math.min(a, c));
  for (const [x0, x1, zA, zB, y] of list) {
    const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB), cx = (x0 + x1) / 2;
    for (let z = z0 - 1.2; z > z1 + 0.6; z -= o.dash ?? 2.2) if (free(z)) g.box(0.12, 0.02, 0.9, cx, y + 0.005, z, 0xffd84a, { r: 0 });
    const step = o.post ?? 6;
    for (let z = z0 - 1; z > z1 + 0.5; z -= step) for (const x of [x0 + 0.14, x1 - 0.14]) {
      b.box(0.16, 0.42, 0.16, x, y, z, litTop(0x2a2026, 0.7), { r: 0.03 });
      g.box(0.2, 0.12, 0.2, x, y + 0.42, z, 0xff8a2a, { r: 0.03 });
    }
  }
  b.flush(level, { castShadow: false });
  g.flush(level, { material: 'glow', castShadow: false });
}

/**
 * Karo-Fähnchen an Stangen (Rennstrecke): list [[x, y, z, h?, yaw?], …]. Statisch, Fahne flach (leicht gewellt).
 */
export function flaggen(level, list) {
  if (!level.view) return;
  const b = new Bld();
  for (const [x, y, z, h = 2.4, yaw = 0] of list) {
    b.cyl(0.045, 0.06, h, x, y, z, 0x8a8a9a, 6);
    b.sphere(0.08, x, y + h + 0.04, z, 0xffc21a, { ws: 6, hs: 4 });
    // Fahne: 4 × 3 Karo-Felder als dünne Kästchen (beidseitig richtig beleuchtet)
    const cs = 0.25;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
      const f = new THREE.BoxGeometry(cs, cs, 0.025);
      f.translate(0.06 + cs * (i + 0.5), -cs * (j + 0.5) + Math.sin(i * 1.7) * 0.03, Math.sin(i * 1.4) * 0.05);
      f.rotateY(yaw);
      f.translate(x, y + h, z);
      b.add(f, ((i + j) & 1) ? 0x16161e : 0xffffff);
    }
  }
  b.flush(level, { castShadow: false });
}

/**
 * Glühende Lavarinne unter einer Weglücke (nur Optik; tödlich ist der Sturz in die Lava darunter): ein flacher Glutstreifen
 * mit Krustenschollen zwischen den Wegkanten, tief unten, dazu Leuchtflecken. list: [[x0, x1, zA, zB, y], …].
 */
export function lavaRinne(level, list) {
  if (!level.view) return;
  const glow = [], crust = [];
  const hot = L(0xffb030), mid = L(0xff5a10), dk = L(0x3a1810);
  const pts = [];
  for (const [x0, x1, zA, zB, y] of list) {
    const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
    const g = new THREE.PlaneGeometry(x1 - x0, z0 - z1, Math.max(2, Math.round((x1 - x0) / 0.6)), Math.max(2, Math.round((z0 - z1) / 0.6)));
    g.rotateX(-HALF_PI);
    g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
    glow.push(colorize(ni(g), (p, n, o) => mixc(mid, hot, 0.5 + 0.5 * Math.sin(p.x * 2.1 + p.z * 1.3) * Math.cos(p.z * 1.7 - p.x * 0.8), o)));
    const rnd = new Rnd(Math.round(x0 * 13 + z0 * 7));
    for (let i = 0; i < Math.round((x1 - x0) * (z0 - z1) / 3); i++) {
      const r = rnd.real(0.25, 0.55);
      const s = new THREE.CylinderGeometry(r, r * 1.1, 0.12, 6);
      s.translate(rnd.real(x0 + 0.3, x1 - 0.3), y + 0.05, rnd.real(z1 + 0.3, z0 - 0.3));
      crust.push(fill(s, dk));
    }
    pts.push([(x0 + x1) / 2, y + 0.6, (z0 + z1) / 2, Math.min(2.4, (x1 - x0) * 0.5)]);
  }
  addStatic(level, merge(glow), { material: 'glow', castShadow: false });
  if (crust.length) addStatic(level, merge(crust), { castShadow: false });
  glowPoints(level, pts, { color: 0xff7a20, size: 3.2, opacity: 0.55, pulse: 0.6 });
}

/**
 * Felswand mit Lavafall (Kulisse neben der Strecke): grob gestufte Basaltwand (Höhe h) mit glühender Rinne; den Fall
 * selbst zeichnet deco_w7 'lavafall' (animiert). list: [[x, y, z, w, h, yaw], …] – nur die Wand.
 */
export function basaltWand(level, list) {
  if (!level.view) return;
  const parts = [];
  const bas = L(0x2e2228), basH = L(0x5e4a54), hot = L(0xff7a2a);
  for (const [x, y, z, w, h, yaw = 0] of list) {
    const rnd = new Rnd(Math.round(x * 31 + z * 17));
    const n = Math.max(3, Math.round(w / 1.1));
    for (let i = 0; i < n; i++) {
      const u = -w / 2 + (i + 0.5) * (w / n);
      const hh = h * rnd.real(0.75, 1.1), r = rnd.real(0.55, 0.8);
      const g = new THREE.CylinderGeometry(r, r * 1.05, hh, 6);
      g.translate(u, y + hh / 2, rnd.real(-0.3, 0.3));
      g.rotateY(yaw);
      g.translate(x, 0, z);
      const top = y + hh;
      parts.push(colorize(ni(g), (p, nn, out) => {
        mixc(bas, basH, smooth(-0.7, 1, nn.y * 0.7 + nn.x * 0.2), out);
        if (nn.y > 0.5) mixc(out, basH, 0.6, out);
        mixc(out, hot, smooth(y + 2.5, y - 0.5, p.y) * 0.8, out);
        if (Math.abs(p.y - top) < 0.05 && nn.y < 0.5) mixc(out, hot, 0.3, out);
      }));
    }
  }
  addStatic(level, merge(parts), { castShadow: false });
}

/**
 * Glutfunken, die aus der Lava aufsteigen (eine Punktwolke, frustumCulled aus, ohne Schatten): box [x0, x1, y0, y1, zA, zB].
 */
export function glutfunken(level, box, o = {}) {
  if (!level.view) return;
  const [x0, x1, y0, y1, zA, zB] = box;
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  const n = o.n ?? 160;
  const rnd = new Rnd(o.seed ?? 5);
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3), base = [];
  for (let i = 0; i < n; i++) {
    const b = { x: rnd.real(x0, x1), z: rnd.real(z1, z0), y: rnd.real(y0, y1), v: rnd.real(0.6, 1.6), ph: rnd.real(0, TAU) };
    base.push(b);
    pos.set([b.x, b.y, b.z], i * 3);
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: o.color ?? 0xffa040, size: o.size ?? 0.16, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  const holder = {};
  addObject(level, pts, (dt) => {
    const d = visDt(level, holder, dt);
    for (let i = 0; i < n; i++) {
      const b = base[i];
      b.y += b.v * d; b.ph += d * 1.3;
      if (b.y > y1) b.y = y0;
      pos[i * 3] = b.x + Math.sin(b.ph) * 0.3; pos[i * 3 + 1] = b.y; pos[i * 3 + 2] = b.z + Math.cos(b.ph * 0.8) * 0.3;
    }
    g.attributes.position.needsUpdate = true;
  });
}

/**
 * Mauerkranz/Brüstung (niedrige Mauer mit Zinnen) entlang einer Inselkante – Kollision optional. list: [[x0, x1, zA, zB,
 * y, h?], …] (Quader-Grundriss der Mauer). o: { solid, color, top, merlon }.
 */
export function bruestung(level, list, o = {}) {
  const b = new Bld();
  const stone = o.color ?? 0x5a5070, top = o.top ?? 0x8a80a8;
  for (const [x0, x1, zA, zB, y, h = 0.8] of list) {
    const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
    const w = x1 - x0, d = z0 - z1;
    if (level.view) {
      b.box(w, h, d, (x0 + x1) / 2, y, (z0 + z1) / 2, litTop(stone, 0.6), { r: 0.06 });
      const along = w > d ? 'x' : 'z', len = Math.max(w, d), n = Math.floor(len / 1.4);
      if (o.merlon !== false) for (let i = 0; i < n; i++) {
        const u = -len / 2 + (i + 0.5) * (len / n);
        const mx = along === 'x' ? (x0 + x1) / 2 + u : (x0 + x1) / 2, mz = along === 'z' ? (z0 + z1) / 2 + u : (z0 + z1) / 2;
        b.box(along === 'x' ? 0.7 : Math.min(w, 0.7), 0.4, along === 'z' ? 0.7 : Math.min(d, 0.7), mx, y + h, mz, litTop(top, 0.6), { r: 0.05 });
      }
    }
    if (o.solid !== false) level.world.add({ type: 'box', min: [x0, y, z1], max: [x1, y + h + (o.merlon !== false ? 0.4 : 0), z0], tag: 'bruestung' });
  }
  b.flush(level, o.shadow === false ? { castShadow: false } : undefined);
}

// =====================================================================================================================
// Donut-Blöcke mit sparsamer Darstellung
// =====================================================================================================================

/** Donut-Block (1 m, Mitte der Unterseite im Ursprung) mit wenigen Dreiecken (≈ 330): Keks-Sockel, Glasur-Ring, Streusel. */
function donutLowGeo(glazeHex = 0xffc83a, glazeHi = 0xfff0a8) {
  const parts = [];
  const dough = L(0xe8b070), doughD = L(0xa86a34), glaze = L(glazeHex), hi = L(glazeHi);
  const base = new THREE.BoxGeometry(0.98, 0.62, 0.98, 1, 1, 1);
  base.translate(0, 0.31, 0);
  parts.push(colorize(ni(base), (p, n, o) => mixc(doughD, dough, smooth(-0.6, 0.9, n.y + p.y * 0.5), o)));
  const rim = new THREE.CylinderGeometry(0.5, 0.49, 0.06, 8, 1, true);
  rim.translate(0, 0.6, 0);
  parts.push(colorize(ni(rim), (p, n, o) => mixc(glaze, hi, 0.25, o)));
  const tor = new THREE.TorusGeometry(0.3, 0.16, 6, 12);
  tor.rotateX(HALF_PI);
  tor.translate(0, 0.66, 0);
  parts.push(colorize(ni(tor), (p, n, o) => (n.y > -0.15 ? mixc(glaze, hi, smooth(0.4, 1, n.y) * 0.6, o) : mixc(doughD, dough, 0.6, o))));
  const SP = [0xffffff, 0x5ad0ff, 0xff5a8a, 0x6aff7a, 0xa86aff].map((c) => L(c));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + (i % 3) * 0.3, r = 0.3;
    const s = new THREE.BoxGeometry(0.11, 0.035, 0.035);
    s.rotateY(a * 1.7);
    s.translate(Math.cos(a) * r, 0.81, Math.sin(a) * r);
    parts.push(fill(s, SP[i % SP.length]));
  }
  return merge(parts);
}

/**
 * Donut-Blöcke (Bauplan 7-3 „Donut-Blöcke fallen nach kurzem Stehen“): Mechanik unverändert aus dem Baustein `donutblock`
 * (blocks/types/w5_donut.js: einsinken, zittern, fallen, wiederkommen, Signal { drop }), aber sparsam gezeichnet – je
 * Eintrag eine Instanz-Gruppe mit eigener Begrenzungskugel (wird außerhalb des Bildes nicht gezeichnet) und einem
 * Donut aus ≈ 330 statt ≈ 4500 Dreiecken. list: [{ id, blocks | from/to | grid, …Felder des Bausteins }], build = der
 * Baustein (buildDonutblock). Liefert die Griffe des Bausteins (level.named wie beim Baustein).
 */
export function donutBloecke(level, list, build) {
  const v = level.view;
  const groups = [];
  for (const spec of list) {
    level.view = null;
    let h = null;
    try { h = build(level, spec); } finally { level.view = v; }
    if (h) groups.push({ h, spec });
  }
  if (!v) return groups.map((g) => g.h);
  const geo = donutLowGeo();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pv = new THREE.Vector3();
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  for (const { h, spec } of groups) {
    const blocks = h.blocks, size = spec.size ?? 1, delay = spec.delay ?? 0.5;
    const im = new THREE.InstancedMesh(geo, mat, blocks.length);
    im.name = 'donuts';
    im.castShadow = spec.shadow !== false; im.receiveShadow = true;
    // Begrenzungskugel: alle Ruhelagen samt Fallweg (12 m)
    const bb = new THREE.Box3();
    for (const b of blocks) { bb.expandByPoint(pv.set(b.x, b.y0 + size, b.z)); bb.expandByPoint(pv.set(b.x, b.y0 - 12, b.z)); }
    bb.expandByScalar(0.8);
    im.boundingSphere = bb.getBoundingSphere(new THREE.Sphere());
    const holder = {};
    let tt = 0;
    addObject(level, im, (dt) => {
      const d = visDt(level, holder, dt);
      tt += d;
      blocks.forEach((b, i) => {
        if (b.state === 'gone') { im.setMatrixAt(i, ZERO); return; }
        if (b.pop > 0) b.pop = Math.max(0, b.pop - d);
        const k = b.pop > 0 ? 1 - b.pop / 0.35 : 1;
        const sh = b.state === 'loaded' ? 0.035 * Math.min(1, b.load / Math.max(0.05, delay)) : 0;
        pv.set(b.x + Math.sin(tt * 47 + i) * sh, b.y, b.z + Math.cos(tt * 41 + i) * sh);
        const sc = size * (k < 1 ? Math.max(0.05, Math.sin(k * Math.PI * 0.5) + Math.sin(k * Math.PI) * 0.15) : 1);
        im.setMatrixAt(i, m.compose(pv, q, s.set(sc, sc, sc)));
      });
      im.instanceMatrix.needsUpdate = true;
    });
  }
  return groups.map((g) => g.h);
}

// =====================================================================================================================
// 7-4: Steinbauten über blauer Lava
// =====================================================================================================================

/**
 * Kleine runde Steinplattform (Säule aus der Lava): Kollision als senkrechter Zylinder, Darstellung Steintrommel mit
 * Goldrand und leuchtendem Runenring. o: { x, z, r, top, bottom, color, glow }.
 */
export function rundPlatte(level, o) {
  const { x, z } = o, r = o.r ?? 1.3, top = o.top, bot = o.bottom ?? top - 4;
  level.world.add({ type: 'cyl', x, z, r, y0: bot, y1: top, tag: 'rundplatte' });
  if (!level.view) return;
  const b = new Bld(), g = new Bld();
  b.cyl(r, r * 1.08, top - bot - 0.25, x, bot, z, litTop(o.color ?? 0x7a80a8, 0.55), 16);
  b.cyl(r + 0.08, r + 0.08, 0.25, x, top - 0.25, z, litTop(0xb8bce0, 0.7), 18);
  b.torus(r + 0.06, 0.06, x, top - 0.12, z, 0xffc21a, { rx: HALF_PI, ts: 24, rs: 4 });
  for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.4; b.box(0.5, 1.2, 0.3, x + Math.cos(a) * (r + 0.1), top - 2.4, z + Math.sin(a) * (r + 0.1), litTop(0x5a6088, 0.6), { yaw: -a, r: 0.05 }); }
  g.torus(r * 0.55, 0.05, x, top + 0.012, z, o.glow ?? 0x7ad8ff, { rx: HALF_PI, ts: 20, rs: 3 });
  b.flush(level);
  g.flush(level, { material: 'glow', castShadow: false });
}

/**
 * Kippplattform (Bauplan 7-4 „Kippplattform: 3 Schubser besiegen“): Mechanik des Bausteins `wippe` (blocks/types/w6_ship.js,
 * kippt um die Querachse nach dem Gewicht der Figuren und Schubser), aber eigene Darstellung als schwere Stein-Metall-
 * Platte mit Goldkante, Warnstreifen an den Enden und leuchtenden Runen, auf einem Drehlager über einer Basaltsäule.
 * spec wie wippe (yaw π/2 = Platte entlang Z). build = Baustein-Funktion (TYPES.wippe). Liefert den Griff der Wippe.
 */
export function kippPlatte(level, spec, build) {
  const v = level.view;
  level.view = null;
  let h;
  try { h = build(level, { ...spec, stand: false }); } finally { level.view = v; }
  const p = { x: spec.pos[0], y: spec.pos[1], z: spec.pos[2] };
  const Lz = spec.length ?? 8, Wx = spec.width ?? 2.5, th = spec.thick ?? 0.4;
  // Lagerbock (fest, Kollision wie beim Baustein) und Basaltsäule bis in die Lava
  level.world.add({ type: 'box', min: [p.x - 0.5, p.y - 3.5, p.z - 0.5], max: [p.x + 0.5, p.y - th - 0.05, p.z + 0.5], tag: 'kipp:lager' });
  if (!v) return h;
  const s = new Bld();
  s.cyl(1.0, 1.5, 3.6, p.x, p.y - th - 3.6, p.z, litTop(0x4a4e72, 0.55), 8);
  s.box(1.6, 0.5, Wx * 0.5, p.x, p.y - th - 0.55, p.z, litTop(0x6a6e90, 0.6), { r: 0.08 });
  s.flush(level);
  const plate = new Bld(), glow = new Bld();
  const gold = 0xffc21a, stone = 0x8a90b8, dark = 0x3e4266;
  // lokal: Länge entlang Z, Breite entlang X, Oberseite y = 0
  plate.box(Wx, th, Lz, 0, -th, 0, { v: (x, y, z, nx, ny) => new THREE.Color(ny > 0.6 ? (((Math.floor(x / 1.25 + 100) + Math.floor(z / 1.25 + 100)) & 1) ? 0x9aa0c8 : 0x868cb4) : dark) }, { r: 0.08 });
  for (const sx of [-1, 1]) plate.box(0.16, 0.12, Lz - 0.2, sx * (Wx / 2 - 0.08), 0, 0, gold, { r: 0.03 });
  for (const sz of [-1, 1]) {
    plate.box(Wx - 0.2, 0.12, 0.16, 0, 0, sz * (Lz / 2 - 0.08), gold, { r: 0.03 });
    // Warnstreifen (gelb-schwarz) an den Enden
    const n = Math.round(Wx / 0.8);
    for (let i = 0; i < n; i++) plate.box(Wx / n * 0.98, 0.03, 0.7, -Wx / 2 + (i + 0.5) * (Wx / n), 0, sz * (Lz / 2 - 0.6), (i & 1) ? 0x1a1a22 : 0xffd23a, { r: 0 });
  }
  // Runenkreis in der Mitte (leuchtet blau)
  glow.torus(1.6, 0.07, 0, 0.015, 0, 0x7ad8ff, { rx: HALF_PI, ts: 32, rs: 3 });
  glow.torus(2.3, 0.05, 0, 0.015, 0, 0x7ad8ff, { rx: HALF_PI, ts: 36, rs: 3 });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; glow.box(0.5, 0.02, 0.14, Math.cos(a) * 1.95, 0.016, Math.sin(a) * 1.95, 0x7ad8ff, { yaw: -a, r: 0 }); }
  const mat = v.mats?.world ?? new THREE.MeshStandardMaterial({ vertexColors: true });
  const gmat = v.mats?.glow ?? new THREE.MeshBasicMaterial({ vertexColors: true });
  const root = new THREE.Group();
  root.name = 'kippplatte';
  root.position.set(p.x, p.y, p.z);
  const m1 = new THREE.Mesh(plate.geometry(), mat); m1.castShadow = true; m1.receiveShadow = true;
  const m2 = new THREE.Mesh(glow.geometry(), gmat);
  root.add(m1, m2);
  const alongX = Math.abs(Math.cos(spec.yaw ?? 0)) > 0.5;
  if (alongX) root.children.forEach((m) => { m.rotation.y = HALF_PI; });
  addObject(level, root, () => {
    const a = h.tilter.angle;
    if (alongX) { root.rotation.z = a; root.rotation.x = 0; } else { root.rotation.x = -a; root.rotation.z = 0; }
  });
  return h;
}

/**
 * Festungs-Zier auf einer Steininsel: Eckpfeiler mit Goldkappe, Zinnenkranz entlang ausgewählter Kanten (nur Optik, ohne
 * Kollision – Kanten zum Springen bleiben frei), Wandfenster mit blauem Glühen an der Inselseite.
 * list: [{ x0, x1, zA, zB, y (Oberseite), edges: 'lrbf' (links, rechts, hinten, vorn), posts: true }].
 */
export function festungRand(level, list, o = {}) {
  if (!level.view) return;
  const b = new Bld(), g = new Bld();
  const stone = o.stone ?? 0x7a7ea8, top = o.top ?? 0xa8acd0, glowC = o.glow ?? 0x6ac8ff;
  for (const it of list) {
    const z0 = Math.max(it.zA, it.zB), z1 = Math.min(it.zA, it.zB), { x0, x1, y } = it;
    const e = it.edges ?? '';
    const run = (ax, az, bx, bz) => {
      const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.floor(len / 1.3));
      const ux = (bx - ax) / len, uz = (bz - az) / len, yaw = Math.atan2(-uz, ux);
      b.box(len, 0.45, 0.45, (ax + bx) / 2, y, (az + bz) / 2, litTop(stone, 0.6), { yaw, r: 0.05 });
      for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; b.box(0.55, 0.4, 0.5, ax + ux * len * t, y + 0.45, az + uz * len * t, litTop(top, 0.6), { yaw, r: 0.05 }); }
    };
    const inset = 0.25;
    if (e.includes('l')) run(x0 + inset, z0 - 0.6, x0 + inset, z1 + 0.6);
    if (e.includes('r')) run(x1 - inset, z0 - 0.6, x1 - inset, z1 + 0.6);
    if (e.includes('b')) run(x0 + 0.6, z1 + inset, x1 - 0.6, z1 + inset);
    if (e.includes('f')) run(x0 + 0.6, z0 - inset, x1 - 0.6, z0 - inset);
    if (it.posts !== false) for (const [px, pz] of [[x0 + 0.35, z0 - 0.35], [x1 - 0.35, z0 - 0.35], [x0 + 0.35, z1 + 0.35], [x1 - 0.35, z1 + 0.35]]) {
      b.box(0.7, 1.1, 0.7, px, y, pz, litTop(stone, 0.55), { r: 0.08 });
      b.cone(0.48, 0.5, px, y + 1.1, pz, 0xffc21a, 4, { yaw: 0.785 });
    }
    // glühende Fenster in der Inselwand (vorn, zur Kamera)
    if (it.windows !== false) for (let x = x0 + 1.6; x < x1 - 1; x += 3.2) g.box(0.5, 0.8, 0.06, x, y - 1.6, z0 + 0.02, glowC, { r: 0.08 });
  }
  b.flush(level);
  g.flush(level, { material: 'glow', castShadow: false });
}

// =====================================================================================================================
// 7-B: Glutzwinger des blauen Schubser-Prinzen
// =====================================================================================================================

/** Flammen-Krone (flach, für Boden-Mosaik und Wappen): Zacken als Shape, Breite w, Höhe h. */
function crownShape(w, h) {
  const s = new THREE.Shape();
  const n = 5, b = h * 0.42;
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, b);
  for (let i = n - 1; i >= 0; i--) {
    const x0 = -w / 2 + (i / n) * w, x1 = -w / 2 + ((i + 1) / n) * w, xm = (x0 + x1) / 2;
    s.lineTo(x1 - (x1 - x0) * 0.15, b); s.quadraticCurveTo(xm + (x1 - x0) * 0.25, h * 0.75, xm, h * (i % 2 ? 0.86 : 1)); s.quadraticCurveTo(xm - (x1 - x0) * 0.25, h * 0.75, x0 + (x1 - x0) * 0.15, b);
  }
  s.lineTo(-w / 2, b); s.closePath();
  return s;
}

/**
 * Glutzwinger (7-B): Festungsplattform aus Basalt hoch über dem Lavasee, darauf ein Käfig (Innenfläche 2·half): Bodenplatten
 * mit glühenden Fugen, in der Mitte ein blaues Flammenkronen-Mosaik (Glüh-Material), schwarze Eisenstäbe mit rotglühenden
 * Spitzen auf niedrigen Basaltmauern, an den Röhrenmündungen der Seitenwände Torbögen mit blauen Feuerschalen, vorn nur eine
 * Brüstung mit Fallgitter-Tor, Festungsleib mit Glutfenstern tief hinab. Die Kollision der Käfigwände baut der Level.
 * o: { y, half, mouths: [z, …], gate (halbe Torbreite), plat: [x0, x1, z0, z1], depth }
 */
export function glutZwinger(level, o) {
  if (!level.view) return;
  const Y = o.y, W = o.half, gate = o.gate ?? 2.4;
  const [px0, px1, pz0, pz1] = o.plat;
  const bas = 0x4a3c44, basDk = 0x2a2026, basHi = 0x7a6670, iron = 0x2e2e3a, ironHi = 0x5a5a6e, gold = 0xffc21a, blue = 0x3a8aff, red = 0xc8322a;
  const b = new Bld(), g = new Bld();
  // ---- Boden: Basaltplatten mit glühenden Fugen (Fugen als schmale Glühstreifen)
  const tiles = [];
  const tA = L(0x5a4a54), tB = L(0x4a3c46), tC = L(0x66545e);
  for (let ix = -W; ix < W; ix += 2) for (let iz = -W; iz < W; iz += 2) {
    const k = ((ix / 2 + iz / 2) & 1) ? tA : (((ix * 7 + iz * 3) & 3) === 0 ? tC : tB);
    const t = new THREE.PlaneGeometry(1.9, 1.9).toNonIndexed();
    t.rotateX(-HALF_PI); t.translate(ix + 1, Y + 0.014, iz + 1);
    tiles.push(colorize(t, (p, n, c) => { c[0] = k[0]; c[1] = k[1]; c[2] = k[2]; }));
  }
  addStatic(level, merge(tiles));
  const seams = [];
  for (let v = -W; v <= W; v += 2) {
    const a = new THREE.PlaneGeometry(2 * W, 0.09); a.rotateX(-HALF_PI); a.translate(0, Y + 0.008, v); seams.push(a);
    const c = new THREE.PlaneGeometry(0.09, 2 * W); c.rotateX(-HALF_PI); c.translate(v, Y + 0.008, 0); seams.push(c);
  }
  const seamC = L(0xff6a1a);
  addStatic(level, merge(seams.map((s) => colorize(s.toNonIndexed(), (p, n, c) => { c[0] = seamC[0]; c[1] = seamC[1]; c[2] = seamC[2]; }))), { material: 'glow', castShadow: false });
  // Läufer vom Tor zur Mitte (dunkelrot mit Goldsaum), Flammenkronen-Mosaik in der Mitte (blau leuchtend)
  const cz0 = 4.2, cz1 = W + 2;
  b.box(2.8, 0.03, cz1 - cz0, 0, Y + 0.012, (cz0 + cz1) / 2, 0x7a1a22, { r: 0 });
  for (const s of [-1, 1]) b.box(0.16, 0.035, cz1 - cz0, s * 1.3, Y + 0.014, (cz0 + cz1) / 2, gold, { r: 0 });
  const ringGeo = (r0, r1, col) => { const rg = new THREE.RingGeometry(r0, r1, 56).toNonIndexed(); rg.rotateX(-HALF_PI); rg.translate(0, Y + 0.024, 0); const c = L(col); return colorize(rg, (p, n, q) => { q[0] = c[0]; q[1] = c[1]; q[2] = c[2]; }); };
  const glowFloor = [ringGeo(3.6, 3.9, 0x6ac8ff), ringGeo(2.75, 2.95, 0x6ac8ff)];
  const crown = new THREE.ShapeGeometry(crownShape(3.4, 2.6)).toNonIndexed();
  crown.rotateX(-HALF_PI); crown.translate(0, Y + 0.03, 1.2);
  const cb = L(0x9ae0ff), cb2 = L(0x2a7aff);
  glowFloor.push(colorize(crown, (p, n, q) => mixc(cb2, cb, smooth(-1.2, 1.2, p.z), q)));
  addStatic(level, merge(glowFloor), { material: 'glow', castShadow: false });
  addStatic(level, merge([ringGeo(2.95, 3.6, 0x2a1e3a)]));
  // ---- Käfig: niedrige Basaltmauern, schwarze Eisenstäbe mit glühenden Spitzen (Lücken an Röhrenmündungen und Tor)
  const H = 4.6, base = 0.9;
  const mouths = o.mouths ?? [];
  const barsAlong = (ax, az, bx, bz, holes) => {
    const len = Math.hypot(bx - ax, bz - az), n = Math.round(len / 0.62);
    const ux = (bx - ax) / len, uz = (bz - az) / len;
    for (let i = 0; i <= n; i++) {
      const s = (i / n) * len, x = ax + ux * s, z = az + uz * s;
      if (holes.some(([c, r]) => Math.abs(s - c) < r)) continue;
      b.cyl(0.06, 0.07, H - base, x, Y + base, z, litTop(iron, 0.8), 6);
      g.cone(0.1, 0.28, x, Y + H, z, 0xff6a2a, 5);
    }
    const yaw = Math.atan2(-(bz - az), bx - ax);
    b.box(len + 0.2, 0.14, 0.14, (ax + bx) / 2, Y + H - 0.25, (az + bz) / 2, litTop(ironHi, 0.6), { r: 0.03, yaw });
    b.box(len + 0.2, 0.09, 0.09, (ax + bx) / 2, Y + 2.8, (az + bz) / 2, litTop(ironHi, 0.6), { r: 0.02, yaw });
  };
  const wallSeg = (x0, x1, z0, z1, h) => b.box(Math.max(0.6, x1 - x0), h, Math.max(0.6, z1 - z0), (x0 + x1) / 2, Y, (z0 + z1) / 2, litTop(bas, 0.6), { r: 0.08 });
  for (const s of [-1, 1]) {
    const x = s * (W + 0.3);
    const holes = mouths.map((z) => [z + W + 0.3, 1.25]);
    const cuts = [-W - 0.6, ...mouths.flatMap((z) => [z - 1.15, z + 1.15]), W + 0.6];
    for (let i = 0; i < cuts.length; i += 2) wallSeg(x - 0.3, x + 0.3, cuts[i], cuts[i + 1], base);
    barsAlong(x, -W - 0.3, x, W + 0.3, holes);
    for (const z of mouths) {
      // Torbogen über der Mündung, rechts und links blaue Feuerschalen
      b.torus(1.2, 0.16, x, Y + 2.25, z, litTop(basHi, 0.6), { arc: Math.PI, yaw: HALF_PI, ts: 14, rs: 6 });
      for (const dz of [-1.35, 1.35]) {
        b.cyl(0.12, 0.16, 1.5, x - s * 0.15, Y, z + dz, litTop(iron, 0.7), 6);
        b.cyl(0.28, 0.14, 0.22, x - s * 0.15, Y + 1.5, z + dz, gold, 8);
        g.sphere(0.2, x - s * 0.15, Y + 1.82, z + dz, 0x6ac8ff, { s: [1, 1.6, 1], ws: 8, hs: 6 });
      }
    }
  }
  wallSeg(-W - 0.6, W + 0.6, -W - 0.6, -W, base);
  barsAlong(-W - 0.3, -W - 0.3, W + 0.3, -W - 0.3, []);
  // Vorn: Brüstung mit Fallgitter-Tor
  wallSeg(-W - 0.6, -gate, W, W + 0.6, base);
  wallSeg(gate, W + 0.6, W, W + 0.6, base);
  for (const s of [-1, 1]) {
    b.box(0.8, 4.4, 0.8, s * (gate + 0.4), Y, W + 0.3, litTop(bas, 0.6), { r: 0.08 });
    b.cone(0.62, 1.1, s * (gate + 0.4), Y + 4.4, W + 0.3, litTop(red, 0.6), 4, { yaw: 0.785 });
  }
  b.box(2 * gate + 1.6, 0.6, 0.8, 0, Y + 3.8, W + 0.3, litTop(basDk, 0.7), { r: 0.06 });
  for (let i = -3; i <= 3; i++) b.box(0.07, 0.5, 0.07, i * (gate / 3.5), Y + 3.3, W + 0.3, litTop(iron, 0.7), { r: 0 });   // hochgezogenes Fallgitter
  const crownBig = new THREE.ExtrudeGeometry(crownShape(1.5, 1.1), { depth: 0.16, bevelEnabled: false });
  crownBig.translate(0, 0, -0.08);
  b.add(crownBig, litTop(gold, 0.7), { p: [0, Y + 4.45, W + 0.3] });
  // Brummbär-Banner an der Rückwand (außen an den Stäben)
  for (const x of [-5.5, 0, 5.5]) {
    b.box(1.5, 2.6, 0.08, x, Y + 1.4, -W - 0.5, litTop(red, 0.7), { r: 0.02 });
    b.box(1.6, 0.14, 0.12, x, Y + 4.0, -W - 0.5, gold, { r: 0.03 });
    g.sphere(0.32, x, Y + 2.7, -W - 0.44, 0x6ac8ff, { s: [1, 1.3, 0.3], ws: 8, hs: 6 });
  }
  // ---- Festungsplattform: Zinnenrand, Festungsleib bis tief hinab mit Glutfenstern
  const D = o.depth ?? 18;
  const rim = (x0, x1, z0, z1) => b.box(x1 - x0, 0.7, z1 - z0, (x0 + x1) / 2, Y - 0.2, (z0 + z1) / 2, litTop(basDk, 0.7), { r: 0.06 });
  rim(px0, px1, pz0 - 0.5, pz0 + 0.5); rim(px0, px1, pz1 - 0.5, pz1 + 0.5);
  rim(px0 - 0.5, px0 + 0.5, pz0, pz1); rim(px1 - 0.5, px1 + 0.5, pz0, pz1);
  for (let x = px0 + 1; x < px1 - 0.5; x += 2.2) for (const z of [pz0, pz1]) b.box(0.9, 0.6, 0.9, x, Y + 0.5, z, litTop(bas, 0.6), { r: 0.06 });
  for (let z = pz0 + 1; z < pz1 - 0.5; z += 2.2) for (const x of [px0, px1]) b.box(0.9, 0.6, 0.9, x, Y + 0.5, z, litTop(bas, 0.6), { r: 0.06 });
  const body = new THREE.BoxGeometry(px1 - px0 - 1, D, pz1 - pz0 - 1, 6, 4, 6).toNonIndexed();
  body.translate((px0 + px1) / 2, Y - 4 - D / 2, (pz0 + pz1) / 2);
  const bA = L(0x4a3a44), bB = L(0x241a20), hot = L(0xff6a1a);
  addStatic(level, colorize(body, (p, n, q) => { mixc(bB, bA, smooth(Y - 4 - D, Y - 4, p.y) * (0.7 + 0.3 * Math.abs(n.x + n.z)), q); mixc(q, hot, smooth(Y - 4 - D + 3, Y - 4 - D, p.y) * 0.7, q); }), { castShadow: false });
  for (let k = 0; k < 3; k++) {
    const y = Y - 7 - k * 4.5;
    for (let x = px0 + 4; x < px1 - 3; x += 6) g.box(0.9, 1.5, 0.1, x + (k % 2) * 3, y, pz1 - 0.45, 0xffa040, { r: 0.1 });
    for (let z = pz0 + 4; z < pz1 - 3; z += 6) for (const x of [px0 + 0.45, px1 - 0.45]) g.box(0.1, 1.5, 0.9, x, y, z + (k % 2) * 3, 0xffa040, { r: 0.1 });
  }
  b.flush(level);
  g.flush(level, { material: 'glow', castShadow: false });
  // Glühen der Feuerschalen und des Mosaiks
  const pts = [[0, Y + 0.3, 0, 3]];
  for (const s of [-1, 1]) for (const z of mouths) for (const dz of [-1.35, 1.35]) pts.push([s * (W + 0.15), Y + 1.9, z + dz, 1]);
  glowPoints(level, pts, { color: 0x4ab0ff, size: 2.4, opacity: 0.6, pulse: 1.1 });
}
