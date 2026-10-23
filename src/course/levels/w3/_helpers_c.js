// Hilfen für 3-3 „Die Mondscheinvilla“ (Spukhaus, Thema ghost) und 3-Kapitän „Krümel und der Röhrensee“
// (See-Diorama, Thema diorama). Kein Level: exportiert kein LEVEL, die Level-Registry überspringt dieses Modul.
//
// Allgemein
//   levelSetup(fn)            Level-Haken mit Verschmelzen der statischen Teile (aus w2/_helpers_c.js)
//   isl, line, ring, arc, column, deco, decoW1, planks, carpet, bake, prop   (aus w1/_helpers.js, w2/_helpers_b.js)
//   solid(level, x0, x1, y0, y1, zA, zB, flags)   unsichtbarer Kollisionsquader
//
// Spukhaus (Thema ghost) – alles statisch verschmolzen (Abschnitts-Culling), Kollision nur, wo genannt
//   hauntFloor(level, o)      Dielenboden mit Steinsockel (fest): { x0, x1, zA, zB, y, depth, rug? }
//   hauntWall(level, o)       Wand mit Tapete, Holzvertäfelung, Zierleisten (fest): { face, at, from, to, y, h, t, pal }
//   cobweb(level, pos, yaw)   Eck-Spinnennetz aus feinen Fäden (Ursprung = Raumecke oben, spannt nach −Y und +lokal Z)
//   moonWindow(level, o)      Fenster mit Mondschein (leuchtende Scheiben, Kreuzsprossen, Vorhänge)
//   clock(level, o)           Standuhr mit leuchtendem Zifferblatt (fest)
//   nightLawn(level, o)       Rasen bei Nacht (fest): { x0, x1, zA, zB, y, depth }
//   flagstones(level, pts, o) Plattenweg (Optik) entlang einer Linie
//   graves / pumpkins / deadTree / ironFence / fountain / facade   Außenhof-Kulisse
//   ghostMoods(level, zones)  Stimmung je Bereich: [{ min: [x, z], max: [x, z], mood }] (Außenhöfe 'aussen')
//
// See-Diorama
//   KruemelRig                Darstellung der Diorama-Figur als Krümel (Modell 'kruemel' mit Kapitänsmütze, Rucksack,
//                             Schwimmring) – ersetzt im Level-Haken den PflaumeRig des Archetyps (useKruemel)
//   useKruemel(level, scene)  Rig tauschen (Archetyp diorama bleibt unverändert)
//   glassWall(level, boxes)   Aquarium-Scheiben (ein durchsichtiges Mesh) mit Holzrahmen
//   seeTower(level, o)        Seewarte: runder Turm mit Dachterrasse, Zinnen (Lücke für die Glasröhre), Fahne
//   glassDome(level, o)       Glaskuppel auf Felssäule (Schalterkammer), Wand mit Öffnung für die Ausgangsröhre
//   sandRamp(level, o)        Sandstrand (Rampe, fest) mit Muscheln
//   lilyPads / ducks          Seerosen und Entenfamilie auf dem Wasser (folgen dem Wasserstand)
//   lighthouse / rowboat / parasol   Zier

import * as THREE from 'three';
import { box, merge, lin, mixc, smooth, colorize, hex, wedge, addStatic, addObject, themeOf, islandParts, alignedGrid } from '../../blocks/kit.js';
import { bakeModel } from '../../blocks/w3kit.js';
import { getModel } from '../../models/index.js';
import { Build, TAU } from '../../models/lib/kit.js';

export { levelSetup } from '../w2/_helpers_c.js';
export { isl, line, ring, arc, column, deco, decoW1 } from '../w1/_helpers.js';
export { planks, carpet, bake, prop } from '../w2/_helpers_b.js';

const FLAT = { r: 0, seg: 0 };

/**
 * Aufbau-Haken während des Levelaufbaus (vor dem Verschmelzen der statischen Geometrie): eine schon brennende
 * Laterne (echte Laterne an pos), deren onLit beim Aufbau genau einmal fn(level) ruft – so landen alle Kulissenteile
 * im richtigen 32-m-Abschnitt (Culling je Raum). Muster wie w2/_helpers_b.js hook.
 */
export const hook = (pos, fn) => ({ kind: 'lantern', pos, lit: true, radius: 0.1, onLit: (level) => fn(level) });
const hash = (a, b = 0, c = 0) => { const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return s - Math.floor(s); };

/** Unsichtbarer, fester Quader (x0..x1, y0..y1, zA..zB). */
export function solid(level, x0, x1, y0, y1, zA, zB, flags = {}) {
  return level.world.add({ type: 'box', min: [Math.min(x0, x1), y0, Math.min(zA, zB)], max: [Math.max(x0, x1), y1, Math.max(zA, zB)], tag: flags.tag ?? 'wand', ...flags });
}

/** Build → statische Geometrie (Abschnitt wird über die Mitte bestimmt). */
function bake(level, b, opts) {
  if (!level.view || !b.parts.length) { b.parts.length = 0; return; }
  addStatic(level, b.geometry(), opts);
}

// =====================================================================================================================
// Spukhaus
// =====================================================================================================================

export const PAL = {
  violett: { a: 0x4c2c6a, b: 0x40245c, pin: 0x7a5a9a, wood: 0x5a3422, wood2: 0x6e4228, trim: 0xc8983a, outer: 0x24142e, base: 0x2a160e },
  gruen: { a: 0x2c4a44, b: 0x24403a, pin: 0x5a8a6a, wood: 0x4a2c1c, wood2: 0x5e3a24, trim: 0xc8983a, outer: 0x1a2424, base: 0x22140c },
  rot: { a: 0x5a2434, b: 0x4c1c2c, pin: 0x8a4a5a, wood: 0x4e2a1c, wood2: 0x643822, trim: 0xd0a040, outer: 0x2a1418, base: 0x24120c },
};

const FACE_YAW = { '+z': 0, '+x': Math.PI / 2, '-x': -Math.PI / 2, '-z': Math.PI };

/**
 * Wand eines Innenraums. face = Richtung, in die die Innenseite zeigt ('+x' linke Wand, '-x' rechte Wand, '+z'
 * Rückwand mit Blick zur Kamera, '-z'), at = Lage der Innenfläche (x bzw. z), from..to = Ausdehnung entlang der Wand,
 * y = Boden, h = Höhe, t = Dicke (nach außen), below = Wandfuß unter y (0,5; Stürze 0). pal = PAL.violett … Kollision: ein Quader.
 */
export function hauntWall(level, o) {
  const face = o.face ?? '+z', h = o.h ?? 6, t = o.t ?? 0.6, y = o.y ?? 1, pal = o.pal ?? PAL.violett;
  const a = Math.min(o.from, o.to), c = Math.max(o.from, o.to), len = c - a, mid = (a + c) / 2;
  const sx = face === '+x' ? -1 : face === '-x' ? 1 : 0, sz = face === '+z' ? -1 : face === '-z' ? 1 : 0;
  // Kollision (Wandkörper liegt hinter der Innenfläche)
  const below = o.below ?? 0.5;            // Wandfuß reicht etwas unter den Boden (Stürze/Fensterbögen: below 0)
  if (sx) solid(level, o.at, o.at + sx * t, y - below, y + h, a, c, { tag: 'spukwand' });
  else solid(level, a, c, y - below, y + h, o.at, o.at + sz * t, { tag: 'spukwand' });
  if (!level.view || o.visual === false) return;
  // lokal: Wand entlang x (−len/2 … len/2), Innenfläche bei z = 0 (zeigt nach +z), Körper bei z < 0
  const b = new Build();
  b.box(len, h, t, pal.outer, { p: [0, h / 2, -t / 2] }, 0);
  // Tapete: Streifen (je Dreieck gefärbt) mit feinen Nadelstreifen und dunklerem oberen Rand
  const nSeg = Math.max(1, Math.round(len / 0.18));
  const paperH = h - 1.2;
  const pa = new THREE.Color(pal.a), pb = new THREE.Color(pal.b), pp = new THREE.Color(pal.pin);
  const tmp = new THREE.Color();
  b.add(new THREE.PlaneGeometry(len, paperH, nSeg, 1), (x, yy) => {
    const k = Math.floor((x + len / 2) / 0.18 + 1e-4);
    const m = k % 6;
    tmp.copy(m === 0 ? pp : m < 3 ? pa : pb);
    const dk = 1 - Math.max(0, (yy / paperH + 0.5) - 0.7) * 0.6;
    return tmp.clone().multiplyScalar(dk);
  }, { p: [0, 1.2 + paperH / 2, 0.01] });
  // Holzvertäfelung unten mit Rahmenleisten (Stile alle 1,2 m), Zierleiste, Fußleiste, Kranzleiste oben
  b.box(len, 1.12, 0.07, pal.wood, { p: [0, 0.56, 0.035] }, 0);
  for (let x = -len / 2 + 0.06; x <= len / 2; x += 1.2) b.box(0.1, 0.92, 0.04, pal.wood2, { p: [x, 0.58, 0.085] }, 0);
  b.box(len, 0.1, 0.12, pal.wood2, { p: [0, 1.17, 0.06] }, 0);
  b.box(len, 0.035, 0.13, pal.trim, { p: [0, 1.23, 0.065] }, 0);
  b.box(len, 0.16, 0.11, pal.base, { p: [0, 0.08, 0.055] }, 0);
  b.box(len, 0.22, 0.2, pal.wood, { p: [0, h - 0.11, 0.1] }, 0);
  b.box(len, 0.05, 0.24, pal.trim, { p: [0, h - 0.25, 0.12] }, 0);
  const g = b.geometry();
  g.rotateY(FACE_YAW[face]);
  if (sx) g.translate(o.at, y, mid);
  else g.translate(mid, y, o.at);
  addStatic(level, g);
}

/**
 * Dielenboden mit Steinsockel (fest): Rechteck x0..x1 × zA..zB, Oberkante y, Sockel depth m tief (sichtbare
 * Vorderkante). o.rug: [x0, x1, zA, zB, color] Läufer; o.colors: Dielenfarben.
 */
export function hauntFloor(level, o) {
  const z0 = Math.min(o.zA, o.zB), z1 = Math.max(o.zA, o.zB), y = o.y ?? 1, d = o.depth ?? 3;
  solid(level, o.x0, o.x1, y - d, y, z0, z1, { tag: 'dielen' });
  if (!level.view) return;
  const b = new Build();
  const W = o.x1 - o.x0, D = z1 - z0;
  b.box(W, d - 0.06, D, o.stone ?? 0x3a2c44, { p: [(o.x0 + o.x1) / 2, y - d / 2 - 0.03, (z0 + z1) / 2] }, 0.08);
  // Mauerwerk an der Vorderkante (zur Kamera)
  for (let row = 0; row < Math.floor((d - 0.2) / 0.5); row++) {
    const yy = y - 0.35 - row * 0.5;
    for (let x = o.x0 + (row % 2 ? 0.45 : 0.05); x < o.x1 - 0.5; x += 0.9) {
      b.box(0.82, 0.42, 0.06, hash(x, row) > 0.5 ? 0x4a3a56 : 0x403250, { p: [x + 0.41, yy, z1 + 0.02] }, 0);
    }
  }
  bake(level, b);
  planksOn(level, o.x0 + 0.02, o.x1 - 0.02, z0 + 0.02, z1 - 0.02, y, o.colors);
  if (o.rug) {
    const [rx0, rx1, rzA, rzB, rc] = o.rug;
    rug(level, rx0, rx1, rzA, rzB, y, rc);
  }
}

/** Dielen (Optik) – gestoßene Bretter längs z. */
function planksOn(level, x0, x1, z0, z1, y, colors) {
  const cols = colors ?? [0x6a4026, 0x5c3820, 0x734a2c, 0x56341e, 0x684226];
  const b = new Build();
  b.add(new THREE.PlaneGeometry(x1 - x0, z1 - z0), 0x2a180e, { p: [(x0 + x1) / 2, y + 0.008, (z0 + z1) / 2], r: [-Math.PI / 2, 0, 0] });
  let i = 0;
  for (let x = x0; x < x1 - 0.1; x += 0.6, i++) {
    const xa = x + 0.025, xb = Math.min(x + 0.6, x1) - 0.025;
    let z = z0, k = 0, next = z0 + 0.8 + hash(i) * 2.4;
    while (z < z1 - 0.05) {
      const e = Math.min(next, z1);
      b.add(new THREE.PlaneGeometry(xb - xa, e - z - 0.05), cols[(i * 3 + k) % cols.length], { p: [(xa + xb) / 2, y + 0.022, (z + e) / 2], r: [-Math.PI / 2, 0, 0] });
      z = e; next = e + 3.2; k++;
    }
  }
  bake(level, b, { castShadow: false });
}

/** Läufer mit Goldkante und Fransen. */
function rug(level, x0, x1, zA, zB, y, color = 0x7a1a3a) {
  const z0 = Math.min(zA, zB), z1 = Math.max(zA, zB);
  const b = new Build();
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
  b.box(w, 0.03, d, color, { p: [cx, y + 0.04, cz] }, 0);
  b.box(w - 0.5, 0.032, d - 0.5, new THREE.Color(color).multiplyScalar(0.7), { p: [cx, y + 0.042, cz] }, 0);
  for (const s of [-1, 1]) b.box(0.08, 0.034, d - 0.2, 0xd8a840, { p: [cx + s * (w / 2 - 0.14), y + 0.044, cz] }, 0);
  for (let x = x0 + 0.1; x < x1 - 0.05; x += 0.16) for (const zz of [z0 - 0.06, z1 + 0.06]) b.box(0.04, 0.02, 0.12, 0xe8d8b0, { p: [x, y + 0.03, zz] }, 0);
  // Rautenmuster in der Mitte
  for (let z = z0 + 0.8; z < z1 - 0.6; z += 1.6) b.add(new THREE.CylinderGeometry(0.28, 0.28, 0.01, 4), 0xd8a840, { p: [cx, y + 0.06, z] });
  bake(level, b, { castShadow: false });
}

/** Eck-Spinnennetz (Ursprung = Raumecke oben; Netz spannt in −Y und lokal +Z, Gier yaw dreht um Y). */
export function cobweb(level, pos, yaw = 0, size = 1.3) {
  if (!level.view) return;
  const b = new Build();
  const c = 0xe8e0f4;
  const spokes = 6, rings = 4;
  const P = (ang, r) => [0.02, -Math.sin(ang) * r, Math.cos(ang) * r];
  for (let i = 0; i <= spokes; i++) {
    const ang = (i / spokes) * (Math.PI / 2);
    const e = P(ang, size);
    const len = size, mx = [e[0] / 2, e[1] / 2, e[2] / 2];
    b.add(new THREE.BoxGeometry(0.008, 0.008, len), c, { p: mx, r: [ang, 0, 0] });
  }
  for (let k = 1; k <= rings; k++) {
    const r = (k / rings) * size * 0.92;
    for (let i = 0; i < spokes; i++) {
      const a0 = (i / spokes) * (Math.PI / 2), a1 = ((i + 1) / spokes) * (Math.PI / 2);
      const p0 = P(a0, r), p1 = P(a1, r);
      const sag = 0.06 * r;
      const m = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 - sag * 0.4, (p0[2] + p1[2]) / 2 - sag * 0.4];
      const L = Math.hypot(p1[1] - p0[1], p1[2] - p0[2]);
      b.add(new THREE.BoxGeometry(0.007, 0.007, L), c, { p: m, r: [Math.atan2(-(p1[1] - p0[1]), p1[2] - p0[2]), 0, 0] });
    }
  }
  // kleine Spinne am Faden
  b.add(new THREE.BoxGeometry(0.006, 0.6, 0.006), c, { p: [0.03, -size * 0.55 - 0.3, size * 0.45] });
  b.sphere(0.05, 0x2a1a30, { p: [0.03, -size * 0.55 - 0.62, size * 0.45] }, 8, 6);
  for (const s of [-1, 1]) for (let l = 0; l < 3; l++) b.box(0.012, 0.012, 0.09, 0x2a1a30, { p: [0.03, -size * 0.55 - 0.62 + (l - 1) * 0.03, size * 0.45 + s * 0.06], r: [s * 0.5, 0, 0] }, 0);
  const g = b.geometry();
  g.rotateY(yaw);
  g.translate(pos[0], pos[1], pos[2]);
  addStatic(level, g, { castShadow: false });
}

/**
 * Fenster mit Mondschein (leuchtende Scheiben) in einer Wand: { pos (Mitte unten), face (wie hauntWall), w, h,
 * curtain: Farbe }. Leuchtet über das glow-Material (0 zusätzliche Zeichenaufrufe).
 */
export function moonWindow(level, o) {
  if (!level.view) return;
  const w = o.w ?? 1.4, h = o.h ?? 2.2;
  const b = new Build(), gl = new Build();
  // Rahmen
  b.box(w + 0.3, 0.16, 0.16, 0x3a2418, { p: [0, -0.08, 0.06] }, 0.02);
  b.box(w + 0.3, 0.16, 0.16, 0x3a2418, { p: [0, h + 0.08, 0.06] }, 0.02);
  for (const s of [-1, 1]) b.box(0.16, h + 0.3, 0.16, 0x3a2418, { p: [s * (w / 2 + 0.07), h / 2, 0.06] }, 0.02);
  b.box(0.06, h, 0.08, 0x3a2418, { p: [0, h / 2, 0.08] }, 0);
  b.box(w, 0.06, 0.08, 0x3a2418, { p: [0, h * 0.62, 0.08] }, 0);
  // Bogen oben
  b.add(new THREE.TorusGeometry(w / 2, 0.08, 6, 16, Math.PI), 0x3a2418, { p: [0, h, 0.06] });
  // Scheiben: kühles Mondlicht (oben heller)
  gl.add(new THREE.PlaneGeometry(w, h, 1, 4), { v: (x, y) => new THREE.Color(0x6a88d8).lerp(new THREE.Color(0xc8d8ff), THREE.MathUtils.clamp(y / h + 0.5, 0, 1)) }, { p: [0, h / 2, 0.02] });
  gl.add(new THREE.CircleGeometry(w / 2, 14, 0, Math.PI), 0xb8ccff, { p: [0, h, 0.02] });
  // Mond in der Scheibe
  gl.add(new THREE.CircleGeometry(0.22, 14), 0xfff6d8, { p: [w * 0.18, h * 0.82, 0.03] });
  // Vorhänge (gerafft)
  const cc = o.curtain ?? 0x7a1a3a;
  for (const s of [-1, 1]) {
    b.box(0.34, h + 0.2, 0.08, cc, { p: [s * (w / 2 + 0.3), h / 2 + 0.05, 0.16] }, 0.04);
    b.box(0.4, 0.08, 0.1, 0xd8a840, { p: [s * (w / 2 + 0.3), h * 0.45, 0.2] }, 0.02);
  }
  b.box(w + 1.0, 0.3, 0.12, cc, { p: [0, h + 0.32, 0.18] }, 0.05);
  const place = (g) => { g.rotateY(FACE_YAW[o.face ?? '+z']); g.translate(o.pos[0], o.pos[1], o.pos[2]); return g; };
  addStatic(level, place(b.geometry()));
  addStatic(level, place(gl.geometry()), { material: 'glow', castShadow: false });
}

/** Standuhr (fest) mit leuchtendem Zifferblatt: { pos, yaw }. */
export function clock(level, o) {
  const [x, y, z] = o.pos;
  level.world.add({ type: 'box', min: [x - 0.35, y, z - 0.35], max: [x + 0.35, y + 2.4, z + 0.35], tag: 'standuhr' });
  if (!level.view) return;
  const b = new Build(), gl = new Build();
  b.box(0.7, 0.3, 0.6, 0x3a2016, { p: [0, 0.15, 0] }, 0.04);
  b.box(0.56, 1.5, 0.46, 0x5a3220, { p: [0, 1.05, 0] }, 0.03);
  b.box(0.66, 0.66, 0.54, 0x4a2a1a, { p: [0, 2.05, 0] }, 0.05);
  b.add(new THREE.CylinderGeometry(0.33, 0.33, 0.56, 16, 1, false, 0, Math.PI), 0x4a2a1a, { p: [0, 2.38, 0], r: [Math.PI / 2, 0, Math.PI / 2] });
  b.box(0.04, 0.9, 0.02, 0xd8a840, { p: [0, 0.95, 0.24] }, 0);
  b.sphere(0.1, 0xd8a840, { p: [0, 0.55, 0.24] }, 10, 8);
  b.box(0.03, 0.18, 0.02, 0x1a1010, { p: [0.03, 2.1, 0.3], r: [0, 0, -0.6] }, 0);
  b.box(0.03, 0.12, 0.02, 0x1a1010, { p: [-0.02, 2.06, 0.3], r: [0, 0, 0.9] }, 0);
  gl.add(new THREE.CircleGeometry(0.24, 18), 0xfff0c8, { p: [0, 2.05, 0.275] });
  const place = (g) => { g.rotateY(o.yaw ?? 0); g.translate(x, y, z); return g; };
  addStatic(level, place(b.geometry()));
  addStatic(level, place(gl.geometry()), { material: 'glow', castShadow: false });
}

/** Kleiner Beistelltisch (fest, Höhe 0,9) – darauf stehen Leuchter. */
export function sideTable(level, x, y, z, w = 1, d = 0.7) {
  level.world.add({ type: 'box', min: [x - w / 2, y, z - d / 2], max: [x + w / 2, y + 0.9, z + d / 2], tag: 'tisch' });
  if (!level.view) return;
  const b = new Build();
  b.box(w, 0.08, d, 0x6a3c24, { p: [x, y + 0.86, z] }, 0.03);
  b.box(w - 0.1, 0.1, d - 0.1, 0x4a2a18, { p: [x, y + 0.77, z] }, 0.02);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl(0.035, 0.05, 0.78, 0x4a2a18, { p: [x + sx * (w / 2 - 0.08), y + 0.39, z + sz * (d / 2 - 0.08)] }, 6);
  b.box(w * 0.9, 0.005, d * 0.6, 0xe8e0d0, { p: [x, y + 0.905, z] }, 0);
  bake(level, b);
}

/**
 * Bücherregal (statisch, sparsam: Bücher als schlichte Quader): { pos (Mitte unten), yaw (Bücher blicken nach lokal +X),
 * w (Breite entlang lokal Z), h (Höhe), solid: true → Kollisionsquader, seed }. ≈ 1,5–2 k Dreiecke.
 */
export function bookShelf(level, o) {
  const [x, y, z] = o.pos, w = o.w ?? 2.2, h = o.h ?? 3.2, yaw = o.yaw ?? 0, seed = o.seed ?? x * 7 + z * 3;
  if (o.solid) {
    const c = Math.abs(Math.cos(yaw)) > 0.5;
    const hx = c ? 0.28 : w / 2, hz = c ? w / 2 : 0.28;
    level.world.add({ type: 'box', min: [x - hx, y, z - hz], max: [x + hx, y + h, z + hz], tag: 'regal' });
  }
  if (!level.view) return;
  const b = new Build(), bk = new Build();
  const wood = 0x4a2a1a, wood2 = 0x5e3622;
  const BOOKS = [0x8a2a2a, 0x2a4a8a, 0x2a6a3a, 0x8a6a2a, 0x5a2a6a, 0x2a6a6a, 0xa8482a, 0x3a3a5a, 0x7a3a4a];
  b.box(0.5, h, 0.06, wood, { p: [0, h / 2, -w / 2 + 0.03] }, 0);
  b.box(0.5, h, 0.06, wood, { p: [0, h / 2, w / 2 - 0.03] }, 0);
  b.box(0.04, h, w, 0x2a1810, { p: [-0.23, h / 2, 0] }, 0);
  b.box(0.58, 0.14, w + 0.12, wood2, { p: [0.02, h - 0.02, 0] }, 0);
  b.box(0.54, 0.1, w + 0.04, wood2, { p: [0.02, 0.05, 0] }, 0);
  const rows = Math.max(2, Math.floor((h - 0.25) / 0.72));
  const rh = (h - 0.2) / rows;
  for (let r = 0; r < rows; r++) {
    const y0 = 0.1 + r * rh;
    b.box(0.48, 0.04, w - 0.1, wood2, { p: [0, y0, 0] }, 0);
    let zz = -w / 2 + 0.08, k = 0;
    while (zz < w / 2 - 0.12) {
      const j = hash(seed, r, k);
      const bw = 0.06 + j * 0.07, bh = Math.min(rh - 0.1, 0.36 + hash(k, r, seed) * 0.26);
      if (j > 0.93 && zz < w / 2 - 0.5) { zz += 0.3; k++; continue; }          // Lücke
      const tilt = j > 0.86 ? 0.25 : 0;
      const bc = BOOKS[Math.floor(hash(r, k, seed + 1) * BOOKS.length)], bd = 0.32 + j * 0.06;
      if (tilt) bk.box(bd, bh, bw, bc, { p: [0.05, y0 + 0.02 + bh / 2, zz + bw / 2], r: [tilt, 0, 0] }, 0);
      else {
        bk.add(new THREE.PlaneGeometry(bw, bh), bc, { p: [0.05 + bd / 2, y0 + 0.02 + bh / 2, zz + bw / 2], r: [0, Math.PI / 2, 0] });
        bk.add(new THREE.PlaneGeometry(bd, bw), new THREE.Color(bc).multiplyScalar(0.8), { p: [0.05, y0 + 0.02 + bh, zz + bw / 2], r: [-Math.PI / 2, 0, 0] });
      }
      if (j > 0.5 && j < 0.56) bk.add(new THREE.PlaneGeometry(bw, 0.025), 0xe0b040, { p: [0.052 + bd / 2, y0 + 0.02 + bh * 0.8, zz + bw / 2], r: [0, Math.PI / 2, 0] });
      zz += bw + 0.012 + tilt * 0.12; k++;
    }
  }
  for (const [bb, cast] of [[b, true], [bk, false]]) {
    const g = bb.geometry();
    g.rotateY(yaw);
    g.translate(x, y, z);
    addStatic(level, g, { castShadow: cast });
  }
}

/**
 * Leseecke der Bibliothek (fest: Tisch): Lesetisch mit aufgeschlagenem Buch und Leuchter, Globus auf Ständer,
 * Bücherstapel, Rollleiter. { pos (Tischmitte am Boden) }.
 */
export function readingNook(level, o) {
  const [x, y, z] = o.pos;
  level.world.add({ type: 'box', min: [x - 1, y, z - 0.55], max: [x + 1, y + 0.9, z + 0.55], tag: 'lesetisch' });
  if (!level.view) return;
  const b = new Build(), gl = new Build();
  b.box(2, 0.1, 1.1, 0x6a3c24, { p: [x, y + 0.85, z] }, 0.03);
  b.box(1.8, 0.12, 0.9, 0x4a2a18, { p: [x, y + 0.74, z] }, 0.02);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl(0.05, 0.07, 0.78, 0x4a2a18, { p: [x + sx * 0.88, y + 0.39, z + sz * 0.44] }, 6);
  // aufgeschlagenes Buch mit Lesezeichen, Tintenfass mit Feder
  for (const s of [-1, 1]) b.box(0.34, 0.03, 0.46, 0xf4ead0, { p: [x - 0.3 + s * 0.17, y + 0.92, z + 0.05], r: [0, 0, s * -0.08] }, 0);
  b.box(0.7, 0.025, 0.5, 0x7a1a2a, { p: [x - 0.3, y + 0.905, z + 0.05] }, 0);
  b.box(0.03, 0.005, 0.3, 0xd84a4a, { p: [x - 0.3, y + 0.94, z + 0.3] }, 0);
  b.cyl(0.05, 0.06, 0.08, 0x1a1a2a, { p: [x + 0.45, y + 0.94, z - 0.2] }, 8);
  b.box(0.02, 0.32, 0.06, 0xffffff, { p: [x + 0.48, y + 1.1, z - 0.18], r: [0, 0, -0.35] }, 0);
  // Globus auf Ständer
  b.cyl(0.04, 0.2, 0.9, 0x5a3220, { p: [x + 1.7, y + 0.45, z + 0.3] }, 8);
  b.add(new THREE.SphereGeometry(0.34, 14, 10), (px, py, pz) => (Math.sin(px * 9) + Math.cos(pz * 8 + py * 5) > 0.6 ? 0x5aa84a : 0x3a6ab8), { p: [x + 1.7, y + 1.22, z + 0.3] });
  b.torus(0.38, 0.018, 0xe0b040, { p: [x + 1.7, y + 1.22, z + 0.3], r: [0, 0, 0.4] }, 4, 24);
  // Bücherstapel am Boden
  const C = [0x8a2a2a, 0x2a4a8a, 0x2a6a3a, 0x8a6a2a, 0x5a2a6a];
  for (let i = 0; i < 5; i++) b.box(0.42 - i * 0.03, 0.09, 0.3, C[i], { p: [x - 1.6, y + 0.045 + i * 0.09, z + 0.6], r: [0, i * 0.3, 0] }, 0);
  for (let i = 0; i < 3; i++) b.box(0.38, 0.08, 0.28, C[(i + 2) % 5], { p: [x + 1.2, y + 0.04 + i * 0.08, z - 1.0], r: [0, -i * 0.4, 0] }, 0);
  gl.sphere(0.06, 0xfff2b0, { p: [x + 0.6, y + 1.2, z + 0.2] }, 8, 6);
  b.cyl(0.05, 0.09, 0.3, 0xe0b040, { p: [x + 0.6, y + 1.0, z + 0.2] }, 8);
  addStatic(level, b.geometry());
  addStatic(level, gl.geometry(), { material: 'glow', castShadow: false });
}

/** Ohrensessel (fest): { pos, yaw (Sitz blickt nach lokal +X), color }. */
export function armchair(level, o) {
  const [x, y, z] = o.pos;
  level.world.add({ type: 'box', min: [x - 0.5, y, z - 0.5], max: [x + 0.5, y + 1.1, z + 0.5], tag: 'sessel' });
  if (!level.view) return;
  const b = new Build(), c = o.color ?? 0x7a1a3a;
  b.box(0.9, 0.42, 0.9, c, { p: [0.05, 0.36, 0] }, 0.1);
  b.box(0.22, 1.3, 0.92, c, { p: [-0.36, 0.65, 0] }, 0.1);
  for (const s of [-1, 1]) { b.box(0.8, 0.32, 0.18, c, { p: [0, 0.68, s * 0.42] }, 0.08); b.box(0.24, 0.5, 0.2, c, { p: [-0.32, 1.2, s * 0.36] }, 0.08); }
  b.box(0.6, 0.12, 0.7, new THREE.Color(c).multiplyScalar(0.8), { p: [0.1, 0.6, 0] }, 0.05);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl(0.04, 0.03, 0.16, 0xe0b040, { p: [sx * 0.35, 0.08, sz * 0.35] }, 6);
  b.sphere(0.12, 0xf0c890, { p: [0.15, 0.78, 0.15], s: [1, 0.8, 1] }, 8, 6);   // Kissen
  const g = b.geometry();
  g.rotateY(o.yaw ?? 0);
  g.translate(x, y, z);
  addStatic(level, g);
}

// ------------------------------------------------------------------ Außenhof

/** Rasen bei Nacht (fest): x0..x1 × zA..zB, Oberkante y, Körper depth tief (Erdschichten an den Seiten). */
export function nightLawn(level, o) {
  const z0 = Math.min(o.zA, o.zB), z1 = Math.max(o.zA, o.zB), y = o.y ?? 1, d = o.depth ?? 4;
  level.world.add({ type: 'box', min: [o.x0, y - d, z0], max: [o.x1, y, z1], tag: 'rasen' });
  if (!level.view) return;
  const th = themeOf(level);
  const t2 = { ...th, grassTop: 0x3c5a48, grassTop2: 0x34503f, grassRim: 0x5a7a62, grassSide: 0x2a4234, dirt: 0x3a2a40, dirtDeep: 0x22182a };
  for (const g of islandParts(o.x0, y - d, z0, o.x1, y, z1, t2, { top: 'grass', under: o.under ?? 0, rnd: level.rnd })) addStatic(level, g);
}

/** Plattenweg (Optik) über Punkte [[x, z], …] auf Höhe y, Breite w. */
export function flagstones(level, pts, y, w = 2) {
  if (!level.view) return;
  const b = new Build();
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
    for (let s = 0.3; s < L; s += 0.62) {
      for (let q = -w / 2 + 0.3; q < w / 2 - 0.1; q += 0.62) {
        const j = hash(i, s, q);
        if (j < 0.08) continue;
        const px = ax + ux * s - uz * q + (j - 0.5) * 0.1, pz = az + uz * s + ux * q + (hash(q, s) - 0.5) * 0.1;
        const c = j > 0.6 ? 0x6a6478 : j > 0.3 ? 0x5e586c : 0x726c80;
        b.box(0.52, 0.06, 0.52, c, { p: [px, y + 0.03, pz], r: [0, Math.atan2(-uz, ux) + (j - 0.5) * 0.2, 0] }, 0);
      }
    }
  }
  bake(level, b, { castShadow: false });
}

/** Grabsteine (fest, Höhe ~1 m): [{ pos, yaw, kind: 'rund'|'kreuz'|'herz', tilt }]. Freundlich: Geistergesicht, Herz, „Buh!“. */
export function graves(level, list) {
  const b = new Build();
  for (const gv of list) {
    const [x, y, z] = gv.pos;
    level.world.add({ type: 'box', min: [x - 0.45, y, z - 0.45], max: [x + 0.45, y + 0.95, z + 0.45], tag: 'grabstein' });
    const loc = new Build();
    const stone = gv.color ?? 0x8a8498;
    loc.box(0.9, 0.16, 0.5, 0x5a5468, { p: [0, 0.08, 0] }, 0.04);
    if (gv.kind === 'kreuz') {
      loc.box(0.18, 1.0, 0.18, stone, { p: [0, 0.66, 0] }, 0.04);
      loc.box(0.62, 0.18, 0.18, stone, { p: [0, 0.86, 0] }, 0.04);
    } else {
      loc.box(0.74, 0.62, 0.22, stone, { p: [0, 0.47, 0] }, 0.05);
      loc.add(new THREE.CylinderGeometry(0.37, 0.37, 0.22, 16, 1, false, -Math.PI / 2, Math.PI), stone, { p: [0, 0.78, 0], r: [Math.PI / 2, 0, 0] });
      // Gravur: Geistergesicht oder Herz
      const dk = new THREE.Color(stone).multiplyScalar(0.55);
      if (gv.kind === 'herz') {
        loc.box(0.14, 0.14, 0.02, 0xc84a6a, { p: [-0.05, 0.62, 0.115], r: [0, 0, Math.PI / 4] }, 0);
        loc.box(0.14, 0.14, 0.02, 0xc84a6a, { p: [0.05, 0.62, 0.115], r: [0, 0, Math.PI / 4] }, 0);
      } else {
        loc.box(0.07, 0.11, 0.02, dk, { p: [-0.1, 0.7, 0.115] }, 0);
        loc.box(0.07, 0.11, 0.02, dk, { p: [0.1, 0.7, 0.115] }, 0);
        loc.add(new THREE.TorusGeometry(0.09, 0.02, 4, 10, Math.PI), dk, { p: [0, 0.56, 0.115], r: [0, 0, Math.PI] });
      }
      loc.box(0.5, 0.04, 0.02, dk, { p: [0, 0.4, 0.115] }, 0);
      loc.box(0.36, 0.04, 0.02, dk, { p: [0, 0.32, 0.115] }, 0);
    }
    // Moos und Blümchen am Fuß
    loc.sphere(0.12, 0x4a7a4a, { p: [0.3, 0.16, 0.18], s: [1.4, 0.5, 1] }, 8, 5);
    for (let k = 0; k < 3; k++) loc.sphere(0.035, [0xffd0e8, 0xfff4b0, 0xd8c8ff][k], { p: [-0.32 + k * 0.08, 0.2, 0.24] }, 6, 4);
    const g = loc.geometry();
    g.rotateZ(gv.tilt ?? 0);
    g.rotateY(gv.yaw ?? 0);
    g.translate(x, y, z);
    b.parts.push(g);
  }
  bake(level, b);
}

/** Kürbislaternen mit leuchtendem Gesicht (Kollision klein): [{ pos, yaw (0 = Gesicht zur Kamera +Z), size }]. */
export function pumpkins(level, list) {
  for (const pk of list) {
    const [x, y, z] = pk.pos, s = pk.size ?? 0.45;
    level.world.add({ type: 'cyl', x, z, r: s * 0.9, y0: y, y1: y + s * 1.3, tag: 'kuerbis' });
  }
  pumpkinParts(level, list);
}

/** Kürbis-Geometrie (Körper in world, Gesichter im glow-Material). */
function pumpkinParts(level, list) {
  if (!level.view) return;
  const body = [], glow = [];
  for (const pk of list) {
    const [x, y, z] = pk.pos, s = pk.size ?? 0.45;
    const loc = new Build(), lg = new Build();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      loc.sphere(s * 0.62, i % 2 ? 0xe8781a : 0xf08a24, { p: [Math.cos(a) * s * 0.32, s * 0.62, Math.sin(a) * s * 0.32], s: [0.8, 1, 0.8] }, 8, 5);
    }
    loc.cyl(s * 0.07, s * 0.1, s * 0.3, 0x5a7a2a, { p: [0, s * 1.3, 0], r: [0, 0, 0.3] }, 6);
    const fx = s * 0.93;
    for (const sz of [-1, 1]) lg.add(new THREE.CircleGeometry(s * 0.14, 3), 0xffe070, { p: [fx, s * 0.84, sz * s * 0.22], r: [0, Math.PI / 2, 0] });
    lg.add(new THREE.CircleGeometry(s * 0.3, 10, Math.PI, Math.PI), 0xffc040, { p: [fx, s * 0.56, 0], r: [0, Math.PI / 2, 0] });
    const a = loc.geometry(), g = lg.geometry();
    for (const q of [a, g]) { q.rotateY((pk.yaw ?? 0) - Math.PI / 2); q.translate(x, y, z); }
    body.push(a); glow.push(g);
  }
  addStatic(level, merge(body), { castShadow: false });
  addStatic(level, merge(glow), { material: 'glow', castShadow: false });
}

/** Kahler, krummer Baum (Kulisse, Stamm fest) mit Laterne am Ast: { pos, size, yaw, lantern }. */
export function deadTree(level, o) {
  const [x, y, z] = o.pos, s = o.size ?? 1;
  level.world.add({ type: 'cyl', x, z, r: 0.3 * s, y0: y, y1: y + 3 * s, tag: 'baum' });
  if (!level.view) return;
  const b = new Build(), gl = new Build();
  const bark = 0x3a2a34;
  b.tube([[0, 0, 0], [0.15 * s, 1.2 * s, 0.05], [-0.1 * s, 2.4 * s, 0.1 * s], [0.2 * s, 3.4 * s, 0]], 0.26 * s, bark, null, 12, 7);
  b.cone(0.5 * s, 0.6 * s, bark, { p: [0, 0.2 * s, 0] }, 7);
  const branches = [
    [[0.05, 2.2, 0.05], [0.9, 2.9, 0.2], [1.6, 3.1, 0.1], [1.9, 3.5, 0]],
    [[-0.05, 2.6, 0], [-0.8, 3.2, -0.2], [-1.2, 3.9, -0.1]],
    [[0.1, 3.1, 0], [0.4, 3.9, 0.3], [0.2, 4.4, 0.4]],
    [[0, 1.6, 0], [-0.7, 1.9, 0.4], [-1.1, 2.4, 0.5]],
  ];
  for (const br of branches) b.tube(br.map((p) => [p[0] * s, p[1] * s, p[2] * s]), 0.09 * s, bark, null, 8, 5);
  if (o.lantern !== false) {
    const lx = 1.6 * s, ly = 3.1 * s;
    b.box(0.01, 0.4, 0.01, 0x222222, { p: [lx, ly - 0.2, 0.1] }, 0);
    b.box(0.26, 0.05, 0.26, 0x2a2a2a, { p: [lx, ly - 0.42, 0.1] }, 0);
    b.box(0.3, 0.06, 0.3, 0x2a2a2a, { p: [lx, ly - 0.78, 0.1] }, 0);
    gl.box(0.2, 0.3, 0.2, 0xffd890, { p: [lx, ly - 0.6, 0.1] }, 0);
  }
  const place = (g) => { g.rotateY(o.yaw ?? 0); g.translate(x, y, z); return g; };
  addStatic(level, place(b.geometry()));
  if (gl.parts.length) addStatic(level, place(gl.geometry()), { material: 'glow', castShadow: false });
  if (o.lantern !== false) {
    const off = new THREE.Vector3(1.6 * s, 3.1 * s - 0.6, 0.1).applyAxisAngle(new THREE.Vector3(0, 1, 0), o.yaw ?? 0);
    level.view.addLantern(x + off.x, y + off.y, z + off.z);
  }
}

/** Schmiedeeiserner Zaun (Kulisse) von a nach b ([x, y, z]), Höhe h; solid: Kollision. */
export function ironFence(level, a, c, o = {}) {
  const h = o.h ?? 1.3;
  const L = Math.hypot(c[0] - a[0], c[2] - a[2]), ux = (c[0] - a[0]) / L, uz = (c[2] - a[2]) / L;
  if (o.solid) {
    const xs = [a[0], c[0]], zs = [a[2], c[2]];
    level.world.add({ type: 'box', min: [Math.min(...xs) - 0.08, a[1], Math.min(...zs) - 0.08], max: [Math.max(...xs) + 0.08, a[1] + h, Math.max(...zs) + 0.08], tag: 'zaun' });
  }
  if (!level.view) return;
  const b = new Build();
  const yaw = Math.atan2(-uz, ux);
  const iron = 0x2a2434, gold = 0xc8983a;
  for (const yy of [0.18, h - 0.2]) b.box(L, 0.05, 0.05, iron, { p: [(a[0] + c[0]) / 2, a[1] + yy, (a[2] + c[2]) / 2], r: [0, yaw, 0] }, 0);
  for (let s = 0; s <= L + 1e-6; s += 0.24) {
    const px = a[0] + ux * s, pz = a[2] + uz * s;
    const post = Math.abs((s / 2.4) - Math.round(s / 2.4)) < 0.01;
    b.box(post ? 0.1 : 0.035, post ? h + 0.15 : h, post ? 0.1 : 0.035, iron, { p: [px, a[1] + (post ? h + 0.15 : h) / 2, pz] }, 0);
    b.cone(post ? 0.07 : 0.04, 0.12, gold, { p: [px, a[1] + (post ? h + 0.21 : h + 0.06), pz] }, 4);
  }
  bake(level, b);
}

/** Springbrunnen (fest): Becken r 1,6, Säule mit Schale; leuchtendes Wasser. { pos, r } */
export function fountain(level, o) {
  const [x, y, z] = o.pos, r = o.r ?? 1.6;
  level.world.add({ type: 'cyl', x, z, r: r + 0.1, y0: y, y1: y + 0.6, tag: 'brunnen' });
  level.world.add({ type: 'cyl', x, z, r: 0.3, y0: y, y1: y + 2.2, tag: 'brunnen' });
  if (!level.view) return;
  const b = new Build(), gl = new Build();
  b.add(new THREE.CylinderGeometry(r + 0.1, r + 0.2, 0.6, 24, 1, true), 0x7a748a, { p: [x, y + 0.3, z] });
  b.torus(r + 0.05, 0.13, 0x8a8498, { p: [x, y + 0.6, z], r: [Math.PI / 2, 0, 0] }, 6, 28);
  b.cyl(r, r, 0.1, 0x3a3448, { p: [x, y + 0.05, z] }, 24);
  b.cyl(0.22, 0.3, 1.7, 0x8a8498, { p: [x, y + 0.85, z] }, 10);
  b.lathe([[0.01, 0], [0.7, 0.1], [0.8, 0.3], [0.7, 0.32], [0.01, 0.2]], 0x9a94a8, { p: [x, y + 1.7, z] }, 16);
  b.sphere(0.2, 0xc8983a, { p: [x, y + 2.2, z] }, 10, 8);
  gl.cyl(r - 0.05, r - 0.05, 0.02, 0x5a8ad8, { p: [x, y + 0.45, z] }, 24);
  gl.cyl(0.66, 0.66, 0.02, 0x7aa8f0, { p: [x, y + 1.98, z] }, 16);
  addStatic(level, b.geometry());
  addStatic(level, gl.geometry(), { material: 'glow', castShadow: false });
}

/**
 * Hausfassade (Außenhof) entlang x oder z mit erleuchteten Fenstern: { axis: 'x'|'z', at, from, to, y, h, face,
 * windows: [u…] (Lage entlang der Fassade), roof: true }. Kollision: Quader.
 */
export function facade(level, o) {
  const face = o.face ?? '+z', h = o.h ?? 8, t = o.t ?? 0.8, y = o.y ?? 1;
  const a = Math.min(o.from, o.to), c = Math.max(o.from, o.to), len = c - a, mid = (a + c) / 2;
  const sx = face === '+x' ? -1 : face === '-x' ? 1 : 0, sz = face === '+z' ? -1 : face === '-z' ? 1 : 0;
  if (sx) solid(level, o.at, o.at + sx * t, y - 0.5, y + h, a, c, { tag: 'fassade' });
  else solid(level, a, c, y - 0.5, y + h, o.at, o.at + sz * t, { tag: 'fassade' });
  if (!level.view) return;
  const b = new Build(), gl = new Build();
  // Bruchstein unten, Holzverschalung oben, Dachkante
  b.box(len, h, t, 0x3a2a44, { p: [0, h / 2, -t / 2] }, 0);
  for (let row = 0; row < 4; row++) for (let u = -len / 2 + (row % 2 ? 0.5 : 0.1); u < len / 2 - 0.6; u += 1.0) {
    b.box(0.9, 0.4, 0.08, hash(u, row) > 0.5 ? 0x5a5068 : 0x4e4660, { p: [u + 0.45, 0.25 + row * 0.45, 0.03] }, 0);
  }
  for (let u = -len / 2 + 0.2; u < len / 2; u += 0.36) b.box(0.32, h - 1.9, 0.06, hash(u) > 0.5 ? 0x3e2c4e : 0x46325a, { p: [u + 0.16, 1.9 + (h - 1.9) / 2, 0.02] }, 0);
  b.box(len + 0.6, 0.3, 0.9, 0x2a1a2a, { p: [0, h + 0.1, 0.25] }, 0.05);
  for (let u = -len / 2; u < len / 2; u += 0.5) b.box(0.48, 0.12, 0.3, (Math.round(u * 2) & 1) ? 0x5a2a3a : 0x4e2434, { p: [u + 0.25, h + 0.3, 0.55], r: [0.3, 0, 0] }, 0);
  // Fenster: Lage in Weltkoordinaten entlang der Fassade → lokal (Fassade läuft entlang lokal x, Mitte 0)
  const toLocal = (w) => (face === '+z' ? w - mid : face === '-z' ? mid - w : face === '+x' ? mid - w : w - mid);
  for (const u of (o.windows ?? []).map(toLocal)) {
    const wy = o.windowY ?? 3.4, ww = 1.3, wh = 1.8;
    gl.add(new THREE.PlaneGeometry(ww, wh), { v: (xx, yy) => new THREE.Color(0xffb84a).lerp(new THREE.Color(0xffe8a8), THREE.MathUtils.clamp(yy / wh + 0.5, 0, 1)) }, { p: [u, wy + wh / 2, 0.05] });
    b.box(ww + 0.24, 0.14, 0.18, 0x2a1a14, { p: [u, wy - 0.06, 0.1] }, 0.02);
    b.box(ww + 0.24, 0.14, 0.18, 0x2a1a14, { p: [u, wy + wh + 0.06, 0.1] }, 0.02);
    for (const s of [-1, 1]) b.box(0.12, wh, 0.16, 0x2a1a14, { p: [u + s * (ww / 2 + 0.05), wy + wh / 2, 0.1] }, 0);
    b.box(0.05, wh, 0.1, 0x2a1a14, { p: [u, wy + wh / 2, 0.1] }, 0);
    b.box(ww, 0.05, 0.1, 0x2a1a14, { p: [u, wy + wh * 0.55, 0.1] }, 0);
    // Fensterläden
    for (const s of [-1, 1]) b.box(0.5, wh + 0.1, 0.06, 0x2a4a5a, { p: [u + s * (ww / 2 + 0.36), wy + wh / 2, 0.12], r: [0, s * 0.35, 0] }, 0.02);
  }
  const place = (g) => { g.rotateY(FACE_YAW[face]); if (sx) g.translate(o.at, y, mid); else g.translate(mid, y, o.at); return g; };
  addStatic(level, place(b.geometry()));
  if (gl.parts.length) addStatic(level, place(gl.geometry()), { material: 'glow', castShadow: false });
}

/**
 * Räume einzeln zeichnen (Teleport-Level wie 3-3): rooms = [[xMin, xMax], …] (getrennte x-Bereiche). Je Bild werden
 * statische Abschnitts-Meshes (Mitte ihres Umrisses) und Gegner-/Gimmick-Modelle (Lage der Entität) in einem anderen
 * Raum als die Figur ausgeblendet (ihr Schatten ebenso); beim Zurückkehren erscheinen sie wieder. o.far = { kind: m }:
 * diese Modelle auch im selben Raum erst ab m Nähe zeigen (Spuke tauchen auf, wenn man näher kommt). Nur Darstellung.
 */
export function roomCull(level, rooms, o = {}) {
  const far = o.far ?? {};            // { kind: m } – diese Modelle weiter als m von der Figur nicht zeichnen
  const v = level.view;
  if (!v) return;
  const roomOf = (x) => rooms.findIndex(([a, b]) => x >= a && x <= b);
  const statics = v.static.meshes.map((m) => {
    m.geometry.computeBoundingBox();
    const bb = m.geometry.boundingBox;
    return { m, room: roomOf((bb.min.x + bb.max.x) / 2) };
  });
  const hidden = new Set();
  let last = -2;
  v.onFrame(() => {
    const p = level.player;
    if (!p) return;
    const cur = roomOf(p.pos.x);
    if (cur !== last) {
      last = cur;
      for (const s of statics) s.m.visible = cur < 0 || s.room < 0 || s.room === cur;
    }
    for (const e of level.entities) {
      const root = e.model?.root;
      if (!root) continue;
      const r = roomOf(e.pos.x);
      const lim = far[e.kind];
      const away = !e.removed && ((cur >= 0 && r >= 0 && r !== cur) || (lim > 0 && Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) > lim));
      if (away) { if (root.visible) { root.visible = false; hidden.add(e); } }
      else if (hidden.has(e)) { root.visible = true; hidden.delete(e); }
    }
  });
}

/**
 * Stimmung je Bereich (Simulationstakt): zones = [{ min: [x, z], max: [x, z], mood: 'aussen'|null }]. Wechselt die
 * Figur den Bereich (auch nach Tür, Warp, Neustart), blendet die Ansicht über view.setMood. level.moodNow (Tests).
 */
export function ghostMoods(level, zones) {
  level.moodNow = undefined;
  const pick = (p) => {
    for (const zn of zones) if (p.pos.x >= zn.min[0] && p.pos.x <= zn.max[0] && p.pos.z >= zn.min[1] && p.pos.z <= zn.max[1]) return zn.mood ?? null;
    return null;
  };
  const apply = (fast) => {
    const p = level.player;
    if (!p) return;
    const m = pick(p);
    if (m === level.moodNow) return;
    level.moodNow = m;
    level.view?.setMood?.(m, { time: fast ? 0 : 0.8 });
  };
  apply(true);
  level.onStep(() => apply(false));
}

// =====================================================================================================================
// See-Diorama: Krümel als Spielfigur
// =====================================================================================================================

const KRUEMEL_SCALE = 1.35;       // Modell ≈ 0,55 m Kopf, Ohren bis 0,78 m → ≈ 0,75 / 1,05 m
const wrap = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; else if (a < -Math.PI) a += TAU; return a; };
const damp = (c, t, r, dt) => c + (t - c) * (1 - Math.exp(-r * dt));

/** Kapitänsmütze, Rucksack mit Karte, Schwimmring (lokal wie das Hasenmodell: Blick +X, Fußpunkt 0). */
function kruemelGear() {
  const cap = new Build();
  cap.cyl(0.068, 0.082, 0.07, 0xfaf8f2, { p: [0, 0.035, 0] }, 14);
  cap.cyl(0.071, 0.071, 0.018, 0xfaf8f2, { p: [0, 0.075, 0], s: [1.15, 1, 1.05] }, 14);
  cap.cyl(0.084, 0.084, 0.022, 0x1e2a5a, { p: [0, 0.012, 0] }, 14);
  cap.add(new THREE.CylinderGeometry(0.09, 0.09, 0.012, 14, 1, false, -Math.PI / 2, Math.PI), 0x1e2a5a, { p: [0.03, 0.002, 0], r: [0, Math.PI / 2, 0] });
  // goldener Anker vorn
  cap.box(0.006, 0.034, 0.01, 0xffc21a, { p: [0.083, 0.04, 0] }, 0);
  cap.box(0.006, 0.008, 0.026, 0xffc21a, { p: [0.083, 0.052, 0] }, 0);
  cap.torus(0.012, 0.004, 0xffc21a, { p: [0.083, 0.028, 0], r: [0, Math.PI / 2, Math.PI] }, 4, 8, Math.PI);
  const pack = new Build();
  pack.box(0.1, 0.13, 0.15, 0x9a5a2a, { p: [0, 0, 0] }, 0.025);
  pack.box(0.03, 0.08, 0.11, 0x7a4420, { p: [-0.06, -0.01, 0] }, 0.012);
  pack.cyl(0.028, 0.028, 0.17, 0xf6e8c0, { p: [0.005, 0.085, 0], r: [Math.PI / 2, 0, 0] }, 10);
  pack.cyl(0.03, 0.03, 0.012, 0xc84a3a, { p: [0.005, 0.085, 0.06], r: [Math.PI / 2, 0, 0] }, 10);
  for (const s of [-1, 1]) pack.box(0.11, 0.012, 0.016, 0x6a3a1a, { p: [0.08, 0.02, s * 0.06], r: [0, 0, -0.5] }, 0);
  const ring = new Build();
  for (let i = 0; i < 8; i++) ring.torus(0.19, 0.05, i % 2 ? 0xffffff : 0xe8322a, { r: [Math.PI / 2, 0, (i / 8) * TAU] }, 6, 6, TAU / 8 + 0.02);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 });
  const mk = (b) => new THREE.Mesh(b.geometry(), mat);
  return { cap: mk(cap), pack: mk(pack), ring: mk(ring), mat };
}

export class KruemelRig {
  constructor(view, player) {
    this.view = view;
    this.player = player;
    this.kind = 'kruemel';
    this.hull = new THREE.Group();
    this.hull.name = 'kruemel';
    this.tilt = new THREE.Group();
    this.hull.add(this.tilt);
    view.three.add(this.hull);
    this.model = getModel('kruemel');
    // Sonnenschatten nur vom Körper (Augen, Ohren, Glitzer ohne: Budget)
    let body = null;
    this.model.root.traverse((o) => { if (o.isMesh) { o.castShadow = false; if (!body || o.geometry.attributes.position.count > body.geometry.attributes.position.count) body = o; } });
    if (body) body.castShadow = true;
    this.tilt.add(this.model.root);
    // Hüpf-Gelenk des Hasenmodells (bunny_small → hop), daran hängen Mütze und Rucksack
    const hop = this.model.root.children[0]?.children?.[0] ?? this.model.root;
    this.gear = kruemelGear();
    this.gear.cap.position.set(0.16, 0.5, 0);
    this.gear.cap.rotation.set(0, 0, -0.28);
    this.gear.pack.position.set(-0.14, 0.26, 0);
    hop.add(this.gear.cap, this.gear.pack);
    this.gear.ring.position.set(0.04, 0.2, 0);
    this.gear.ring.visible = false;
    this.tilt.add(this.gear.ring);
    this.yaw = player.yaw;
    this.scale = KRUEMEL_SCALE;
    this.squash = 0; this.squashV = 0;
    this.lastMode = player.mode;
    this.anim = 'idle';
    this.swimK = 0;
    this.t = 0;
  }

  update(dt, t) {
    const p = this.player;
    this.t += dt;
    this.hull.position.copy(p.pos);
    this.yaw += wrap(p.yaw - this.yaw) * (1 - Math.exp(-14 * dt));
    const speed = Math.hypot(p.vel.x, p.vel.z);
    const swim = p.mode === 'swim';
    const pipe = p.mode === 'script' && p.state === 'pipe';
    let anim;
    if (p.treasure || p.state === 'victory') anim = 'cheer';
    else if (p.dead || (p.invuln > 1.2 && p.mode === 'air')) anim = 'scared';
    else if (swim || pipe || p.digging) anim = 'idle';
    else if (p.mode === 'air') anim = 'hop';
    else anim = speed < 0.3 ? 'idle' : 'hop';
    this.anim = swim ? 'swim' : pipe ? 'pipe' : p.digging ? 'dig' : anim;
    // Schwimmen: Schwimmring sichtbar, Krümel sitzt tiefer im Wasser und wippt; Röhre: liegt in Fahrtrichtung
    this.swimK = damp(this.swimK, swim ? 1 : 0, 8, dt);
    this.gear.ring.visible = this.swimK > 0.2;
    let tx = 0, tz = 0, ty = 0;
    if (swim) { ty = -0.32 + Math.sin(this.t * 4.2) * 0.03; tz = Math.sin(this.t * 6) * 0.06; }
    else if (pipe) { tz = -0.5; }
    else if (p.digging) { tz = -0.45 + Math.sin(this.t * 22) * 0.12; ty = -0.04; }
    this.tilt.position.y = damp(this.tilt.position.y, ty, 10, dt);
    this.tilt.rotation.z = damp(this.tilt.rotation.z, tz, 10, dt);
    this.tilt.rotation.x = damp(this.tilt.rotation.x, tx, 10, dt);
    if (p.digging && Math.floor(this.t * 6) !== Math.floor((this.t - dt) * 6)) this.view.effects?.dust({ x: p.pos.x, y: p.pos.y, z: p.pos.z }, 2, 0.5);
    if (swim && Math.floor(this.t * 2.5) !== Math.floor((this.t - dt) * 2.5) && speed > 0.6) this.view.effects?.ring?.({ x: p.pos.x, y: (p.water?.top ?? p.pos.y + 0.4) + 0.02, z: p.pos.z }, 0.5);
    // Landung federt
    if (this.lastMode === 'air' && p.mode === 'ground') this.squashV -= Math.min(5, 1.5 + Math.abs(p.lastLandVy ?? 0) * 0.25);
    this.lastMode = p.mode;
    this.squashV += (-90 * this.squash - 12 * this.squashV) * dt;
    this.squash += this.squashV * dt;
    const sq = Math.max(-0.3, Math.min(0.3, this.squash));
    this.scale = damp(this.scale, KRUEMEL_SCALE * (p.big ? 1 : 0.78), 10, dt);
    this.hull.scale.set(this.scale * (1 - sq * 0.5), this.scale * (1 + sq), this.scale * (1 - sq * 0.5));
    this.hull.rotation.set(0, this.yaw + (p.dead ? this.t * 9 : 0), 0);
    const blink = (p.invuln > 0 && Math.floor(t * 16) % 2 === 0) || (p.dead && p.deathCause === 'fall' && p.script?.t > 0.3);
    this.hull.visible = !blink;
    try { this.model.update(dt, { anim }); } catch (err) { console.error('Krümel-Animation fehlgeschlagen:', err); }
  }

  info() { return { kind: this.kind, anim: this.anim, ring: this.gear.ring.visible, cap: !!this.gear.cap.parent, pack: !!this.gear.pack.parent }; }

  dispose() {
    for (const k of ['cap', 'pack', 'ring']) this.gear[k].geometry.dispose();
    this.gear.mat.dispose();
    this.model.dispose?.();
    this.hull.parent?.remove(this.hull);
  }
}

/**
 * Krümel statt Pflaume (Level-Haken des See-Dioramas): der Archetyp `diorama` baut seine Figur (DioramaController,
 * springt nicht) unverändert; hier wird nur die Darstellung getauscht.
 */
export function useKruemel(level, scene) {
  if (!scene?.rig || !level.view) return null;
  const old = scene.rig;
  const rig = new KruemelRig(level.view, scene.player);
  scene.rig = rig;
  scene.squad?.rigs?.set(scene.player, rig);
  old.dispose?.();
  return rig;
}

// =====================================================================================================================
// See-Diorama: Bauwerke und Zier
// =====================================================================================================================

/** Glasscheiben (ein durchsichtiges Mesh) mit Holz-/Messingrahmen: boxes [{ min: [x,y,z], max: [x,y,z] }], fest. */
export function glassWall(level, boxes, o = {}) {
  for (const bx of boxes) level.world.add({ type: 'box', min: bx.min, max: bx.max, camIgnore: true, tag: 'glas' });
  if (!level.view) return;
  const geos = [];
  const frame = new Build();
  for (const bx of boxes) {
    const w = bx.max[0] - bx.min[0], h = bx.max[1] - bx.min[1], d = bx.max[2] - bx.min[2];
    const cx = (bx.min[0] + bx.max[0]) / 2, cy = (bx.min[1] + bx.max[1]) / 2, cz = (bx.min[2] + bx.max[2]) / 2;
    const g = new THREE.BoxGeometry(w * (d < w ? 1 : 0.4), h, d * (d < w ? 0.4 : 1));
    g.translate(cx, cy, cz);
    geos.push(g);
    // Rahmen: Holzbalken oben, Messingleiste, Pfosten an den Enden und alle 4 m
    const top = bx.max[1];
    frame.box(w + 0.1, 0.18, d + 0.1, 0x9a6338, { p: [cx, top + 0.09, cz] }, 0.05);
    frame.box(w + 0.12, 0.05, d + 0.12, 0xe0b040, { p: [cx, top - 0.03, cz] }, 0.01);
    const along = w > d ? 'x' : 'z', L = Math.max(w, d);
    for (let s = 0; s <= L + 1e-6; s += Math.max(2, L / Math.max(1, Math.round(L / 4)))) {
      const px = along === 'x' ? bx.min[0] + s : cx, pz = along === 'z' ? bx.min[2] + s : cz;
      frame.box(0.16, h, 0.16, 0x8a5630, { p: [px, cy, pz] }, 0.04);
      frame.box(0.22, 0.12, 0.22, 0xe0b040, { p: [px, top + 0.2, pz] }, 0.04);
    }
  }
  const mesh = new THREE.Mesh(merge(geos.map((g) => g.toNonIndexed())), new THREE.MeshStandardMaterial({ color: 0xcfefff, transparent: true, opacity: o.opacity ?? 0.16, roughness: 0.05, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide }));
  mesh.renderOrder = 3;
  mesh.castShadow = false; mesh.receiveShadow = false;
  addObject(level, mesh);
  addStatic(level, frame.geometry());
}

/**
 * Seewarte (großes Bauwerk): runder Turm { pos (Fuß), r, h }, Dachterrasse (fest) mit Zinnen, Lücke gap: [von, bis]
 * (Winkel in rad um die Turmachse, 0 = +X, gegen den Uhrzeigersinn von oben) für die Glasröhre; Tür, Fenster,
 * Fernrohr, Fahne (eigenes Objekt, weht). Kollision: Zylinder + Zinnen-Segmente.
 */
export function seeTower(level, o) {
  const [x, y, z] = o.pos, r = o.r ?? 3, h = o.h ?? 6.2, top = y + h;
  level.world.add({ type: 'cyl', x, z, r, y0: y, y1: top, tag: 'seewarte' });
  const gap = o.gap ?? [0, 0];
  const inGap = (a) => { let u = ((a - gap[0]) % TAU + TAU) % TAU, w = ((gap[1] - gap[0]) % TAU + TAU) % TAU; return u <= w; };
  const N = 16;
  for (let i = 0; i < N; i++) {
    const a = ((i + 0.5) / N) * TAU;
    if (inGap(a)) continue;
    const cx = x + Math.cos(a) * (r - 0.2), cz = z - Math.sin(a) * (r - 0.2);
    level.world.add({ type: 'box', min: [cx - 0.45, top, cz - 0.45], max: [cx + 0.45, top + 0.9, cz + 0.45], tag: 'zinne' });
  }
  if (!level.view) return;
  const b = new Build(), gl = new Build();
  // Bruchstein-Sockel, weiß gekalkter Schaft mit Bändern
  b.add(new THREE.CylinderGeometry(r + 0.1, r + 0.25, 1.6, 28, 3, true), (px, py, pz) => (hash(Math.round(Math.atan2(pz, px) * 8), Math.round(py * 2)) > 0.5 ? 0x8a8090 : 0x9a90a2), { p: [x, y + 0.8, z] });
  b.add(new THREE.CylinderGeometry(r, r + 0.05, h - 1.6, 28, 1, true), 0xf4eee2, { p: [x, y + 1.6 + (h - 1.6) / 2, z] });
  for (const yy of [2.6, 4.4]) b.torus(r + 0.02, 0.07, 0x3a8bd8, { p: [x, y + yy, z], r: [Math.PI / 2, 0, 0] }, 4, 40);
  b.cyl(r + 0.3, r + 0.3, 0.3, 0xd8d0c4, { p: [x, top - 0.15, z] }, 32);
  b.cyl(r - 0.05, r - 0.05, 0.02, 0xc8b088, { p: [x, top + 0.01, z] }, 28);
  // Terrassenboden: Holzdielen-Ring
  for (let i = 0; i < 10; i++) b.box(r * 1.7, 0.012, 0.28, i % 2 ? 0xc8945a : 0xb8844e, { p: [x, top + 0.025, z + (i - 4.5) * 0.31] }, 0);
  for (let i = 0; i < N; i++) {
    const a = ((i + 0.5) / N) * TAU;
    if (inGap(a)) continue;
    const cx = x + Math.cos(a) * (r - 0.2), cz = z - Math.sin(a) * (r - 0.2);
    b.box(0.85, 0.9, 0.85, i % 2 ? 0xe8e0d4 : 0xf4eee2, { p: [cx, top + 0.45, cz], r: [0, a, 0] }, 0.08);
    b.box(0.9, 0.08, 0.9, 0x3a8bd8, { p: [cx, top + 0.92, cz], r: [0, a, 0] }, 0.03);
  }
  // Tür (zur Kamera, +Z) mit Bogen, Fenster mit blauen Läden
  const door = o.door ?? Math.PI / 2 + 0.6;
  const dp = (a, rr, yy) => [x + Math.cos(a) * rr, y + yy, z - Math.sin(a) * rr];
  b.box(1.2, 2.0, 0.2, 0x8a5630, { p: dp(-door, r + 0.02, 1.0), r: [0, -door + Math.PI / 2, 0] }, 0.05);
  b.add(new THREE.CylinderGeometry(0.6, 0.6, 0.22, 14, 1, false, 0, Math.PI), 0x8a5630, { p: dp(-door, r + 0.02, 2.0), r: [Math.PI / 2, 0, -door] });
  b.sphere(0.06, 0xffc21a, { p: dp(-door + 0.12, r + 0.14, 1.0) }, 8, 6);
  for (const [a, yy] of [[-door + 1.1, 3.4], [-door - 1.0, 4.8], [-door + 2.3, 5.2], [-door - 2.2, 3.0]]) {
    const pp = dp(a, r + 0.02, yy);
    gl.box(0.62, 0.8, 0.06, 0xffe8a0, { p: pp, r: [0, a + Math.PI / 2, 0] }, 0.02);
    for (const s of [-1, 1]) b.box(0.32, 0.86, 0.06, 0x3a8bd8, { p: dp(a + s * 0.17, r + 0.08, yy), r: [0, a + Math.PI / 2, 0] }, 0.02);
    b.box(0.8, 0.08, 0.16, 0xd8d0c4, { p: dp(a, r + 0.08, yy - 0.44), r: [0, a + Math.PI / 2, 0] }, 0.02);
  }
  // Fernrohr auf Dreibein und Bank auf der Terrasse
  const tp = o.telescope ?? [x + 0.9, top, z + 0.9];
  for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; b.cyl(0.025, 0.025, 1.0, 0x6a4020, { p: [tp[0] + Math.cos(a) * 0.22, tp[1] + 0.48, tp[2] + Math.sin(a) * 0.22], r: [Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25] }, 5); }
  b.cyl(0.07, 0.1, 0.8, 0xe0b040, { p: [tp[0], tp[1] + 1.05, tp[2]], r: [0, 0, 1.2] }, 10);
  addStatic(level, b.geometry());
  addStatic(level, gl.geometry(), { material: 'glow', castShadow: false });
  // Fahne am Mast (eigenes Objekt, weht)
  const fp = o.flag ?? [x - 1.2, top, z - 1.2];
  const pole = new Build();
  pole.cyl(0.05, 0.06, 3.2, 0xf4eee2, { p: [0, 1.6, 0] }, 8);
  pole.sphere(0.12, 0xffc21a, { p: [0, 3.25, 0] }, 10, 8);
  const poleMesh = new THREE.Mesh(pole.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }));
  const flagGeo = new THREE.PlaneGeometry(1.4, 0.8, 8, 1);
  flagGeo.translate(0.7, 2.7, 0);
  const fcol = new Float32Array(flagGeo.attributes.position.count * 3);
  for (let i = 0; i < flagGeo.attributes.position.count; i++) {
    const fx = flagGeo.attributes.position.getX(i), fy = flagGeo.attributes.position.getY(i);
    const c = new THREE.Color(Math.abs(fy - 2.7) < 0.12 ? 0xffffff : 0x3a8bd8);
    if (Math.hypot(fx - 0.55, fy - 2.7) < 0.2) c.set(0xffc21a);
    fcol[i * 3] = c.r; fcol[i * 3 + 1] = c.g; fcol[i * 3 + 2] = c.b;
  }
  flagGeo.setAttribute('color', new THREE.BufferAttribute(fcol, 3));
  const flag = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide }));
  const grp = new THREE.Group();
  grp.add(poleMesh, flag);
  grp.position.set(fp[0], fp[1], fp[2]);
  grp.rotation.y = o.flagYaw ?? 0.4;
  const base = Float32Array.from(flagGeo.attributes.position.array);
  let tt = 0;
  addObject(level, grp, (dt) => {
    tt += dt;
    const P = flagGeo.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const fx = base[i * 3];
      P.array[i * 3 + 2] = Math.sin(fx * 3.2 - tt * 5) * 0.12 * fx;
    }
    P.needsUpdate = true;
  });
}

/**
 * Glaskuppel auf einer Felssäule (Schalterkammer): { pos (Mitte, Oberkante Boden), r, h, rock (Säulenfuß y), open:
 * Winkel (rad, 0 = +X) der Wandöffnung für die Ausgangsröhre }. Kollision: Säule, Glaswand-Segmente.
 */
export function glassDome(level, o) {
  const [x, y, z] = o.pos, r = o.r ?? 1.7, h = o.h ?? 2.3, y0 = o.rock ?? y - 5;
  level.world.add({ type: 'cyl', x, z, r: r + 0.1, y0, y1: y, tag: 'felssaeule' });
  const N = 14, open = o.open ?? 0, ow = o.openWidth ?? 0.62;
  for (let i = 0; i < N; i++) {
    const a = ((i + 0.5) / N) * TAU;
    let d = Math.abs(((a - open) % TAU + TAU + Math.PI) % TAU - Math.PI);
    if (d < ow) continue;
    const cx = x + Math.cos(a) * r, cz = z - Math.sin(a) * r;
    level.world.add({ type: 'box', min: [cx - 0.3, y, cz - 0.3], max: [cx + 0.3, y + h, cz + 0.3], camIgnore: true, tag: 'kuppel' });
  }
  if (!level.view) return;
  const b = new Build();
  // Felssäule (Kanten-Brocken) mit Muscheln und Seepocken
  b.add(new THREE.CylinderGeometry(r + 0.15, r + 0.55, y - y0, 10, 4), (px, py, pz) => (hash(Math.round(px * 2), Math.round(py * 2), Math.round(pz * 2)) > 0.5 ? 0x7a7488 : 0x6a6478), { p: [x, (y + y0) / 2, z] });
  b.cyl(r + 0.3, r + 0.3, 0.22, 0xe0b040, { p: [x, y - 0.1, z] }, 24);
  b.cyl(r, r, 0.03, 0xe8dcc0, { p: [x, y + 0.01, z] }, 24);
  for (let i = 0; i < 6; i++) { const a = i * 1.1; b.sphere(0.12, 0xf0e6d8, { p: [x + Math.cos(a) * (r + 0.5), y0 + 1 + i * 0.6, z + Math.sin(a) * (r + 0.5)], s: [1, 0.6, 1] }, 8, 5); }
  // Messingrippen der Kuppel
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    b.add(new THREE.TorusGeometry(r, 0.035, 4, 16, Math.PI / 2), 0xe0b040, { p: [x, y + h, z], r: [0, a, Math.PI / 2], s: [1, 0.55, 1] });
    b.cyl(0.035, 0.035, h, 0xe0b040, { p: [x + Math.cos(a) * r, y + h / 2, z - Math.sin(a) * r] }, 5);
  }
  b.torus(r, 0.05, 0xe0b040, { p: [x, y + h, z], r: [Math.PI / 2, 0, 0] }, 4, 28);
  addStatic(level, b.geometry());
  const glass = new THREE.Group();
  const gm = new THREE.MeshStandardMaterial({ color: 0xd8f4ff, transparent: true, opacity: 0.2, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 28, 1, true, open + ow + Math.PI / 2, TAU - 2 * ow), gm);
  wall.position.set(x, y + h / 2, z);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 8, 0, TAU, 0, Math.PI / 2), gm);
  cap.scale.set(1, 0.55, 1);
  cap.position.set(x, y + h, z);
  glass.add(wall, cap);
  glass.traverse((m) => { if (m.isMesh) { m.renderOrder = 3; m.castShadow = false; } });
  addObject(level, glass);
}

/** Sandstrand als Rampe (fest): { x0, x1, zA, zB, yLow, yHigh, dir: +1 (steigt nach +X) }, Muscheln, Seesterne. */
export function sandRamp(level, o) {
  const z0 = Math.min(o.zA, o.zB), z1 = Math.max(o.zA, o.zB), base = o.base ?? o.yLow - 1;
  const dir = o.dir ?? 1;
  level.world.add({ type: 'ramp', min: [o.x0, base, z0], max: [o.x1, o.yHigh, z1], axis: 'x', dir, low: o.yLow, tag: 'strand' });
  if (!level.view) return;
  addStatic(level, wedge(o.x0, base, z0, o.x1, o.yHigh, z1, 'x', dir, o.yLow, 0xf3dc96, 0xd8b878));
  const b = new Build();
  const hAt = (x) => { const k = (dir > 0 ? x - o.x0 : o.x1 - x) / (o.x1 - o.x0); return o.yLow + (o.yHigh - o.yLow) * k; };
  for (let i = 0; i < 14; i++) {
    const x = o.x0 + 0.5 + hash(i, 1) * (o.x1 - o.x0 - 1), z = z0 + 0.4 + hash(i, 2) * (z1 - z0 - 0.8), y = hAt(x);
    const kind = i % 3;
    if (kind === 0) b.add(new THREE.ConeGeometry(0.12, 0.12, 6), i % 2 ? 0xffc8d8 : 0xfff0e0, { p: [x, y + 0.04, z], r: [Math.PI / 2, 0, hash(i) * 6] });
    else if (kind === 1) for (let k = 0; k < 5; k++) b.box(0.18, 0.03, 0.06, 0xff8a5a, { p: [x, y + 0.03, z], r: [0, (k / 5) * TAU, 0] }, 0.015);
    else b.sphere(0.07, 0xe8e0f0, { p: [x, y + 0.02, z], s: [1, 0.5, 1.3] }, 8, 5);
  }
  bake(level, b, { castShadow: false });
}

/**
 * Seerosen auf dem Wasser (ein Objekt): folgen dem Wasserstand von waterId. list: [[x, z, size, blüte?]].
 */
export function lilyPads(level, waterId, list, y0) {
  if (!level.view) return;
  const b = new Build();
  for (const [x, z, s, flower] of list) {
    b.add(new THREE.CylinderGeometry(s, s, 0.03, 14, 1, false, 0.4, TAU - 0.6), 0x4aa84a, { p: [x, 0.015, z], r: [0, hash(x, z) * 6, 0] });
    if (flower) {
      for (let k = 0; k < 6; k++) b.sphere(0.09, k % 2 ? 0xffd0e4 : 0xffffff, { p: [x + Math.cos(k) * 0.08, 0.08, z + Math.sin(k) * 0.08], s: [0.6, 1, 1.4], r: [0, k, 0.5] }, 6, 4);
      b.sphere(0.05, 0xffd23a, { p: [x, 0.1, z] }, 6, 4);
    }
  }
  const mesh = new THREE.Mesh(b.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }));
  mesh.position.y = y0;
  let t = 0;
  addObject(level, mesh, (dt) => {
    t += dt;
    const top = level.waterLevel?.(waterId);
    if (Number.isFinite(top)) mesh.position.y = top + Math.sin(t * 1.3) * 0.015;
  });
}

/**
 * Entenfamilie (Mutter und drei Küken in einer Reihe, ein Mesh ohne Schatten) zieht Kreise auf dem Wasser und folgt dem
 * Wasserstand von waterId: { center: [x, z], r, waterId, y0, phase }.
 */
export function ducks(level, o) {
  if (!level.view) return;
  const r = o.r ?? 3;
  const all = new Build();
  const duck = (s, body, bill, dz) => {
    // Blick entlang −Z (Fahrtrichtung auf dem Kreis gegen den Uhrzeigersinn), Abstand dz hinter der Mutter
    all.sphere(0.22 * s, body, { p: [r, 0.1 * s, dz], s: [1, 0.8, 1.35] }, 12, 8);
    all.sphere(0.13 * s, body, { p: [r, 0.3 * s, dz - 0.2 * s] }, 10, 8);
    all.box(0.09 * s, 0.04 * s, 0.12 * s, bill, { p: [r, 0.28 * s, dz - 0.33 * s] }, 0.015);
    for (const sx of [-1, 1]) all.sphere(0.025 * s, 0x1a1010, { p: [r + sx * 0.07 * s, 0.34 * s, dz - 0.28 * s] }, 6, 4);
    all.cone(0.07 * s, 0.14 * s, body, { p: [r, 0.17 * s, dz + 0.3 * s], r: [-1.0, 0, 0] }, 6);
  };
  duck(1.3, 0xffffff, 0xffa020, 0);
  for (let i = 0; i < 3; i++) duck(0.65, 0xffe066, 0xff9a20, 0.6 + i * 0.42);
  const mesh = new THREE.Mesh(all.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }));
  mesh.castShadow = false;
  const grp = new THREE.Group();
  grp.add(mesh);
  grp.position.set(o.center[0], o.y0, o.center[1]);
  let t = o.phase ?? 0;
  addObject(level, grp, (dt) => {
    t += dt;
    const top = level.waterLevel?.(o.waterId);
    grp.position.y = (Number.isFinite(top) ? top : o.y0) - 0.03 + Math.sin(t * 2.3) * 0.012;
    grp.rotation.y = t * (0.9 / r);
  });
}

/** Kleiner Leuchtturm (Inselchen, fest): { pos, h }. */
export function lighthouse(level, o) {
  const [x, y, z] = o.pos, h = o.h ?? 3.2;
  level.world.add({ type: 'cyl', x, z, r: 0.75, y0: y, y1: y + h, tag: 'leuchtturm' });
  if (!level.view) return;
  const b = new Build(), gl = new Build();
  const n = 5;
  for (let i = 0; i < n; i++) {
    const r0 = 0.75 - (i / n) * 0.25, r1 = 0.75 - ((i + 1) / n) * 0.25;
    b.cyl(r1, r0, h / n, i % 2 ? 0xe8322a : 0xffffff, { p: [x, y + (i + 0.5) * (h / n), z] }, 18);
  }
  b.cyl(0.62, 0.62, 0.1, 0x3a3a48, { p: [x, y + h + 0.05, z] }, 18);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; b.cyl(0.02, 0.02, 0.6, 0x3a3a48, { p: [x + Math.cos(a) * 0.4, y + h + 0.4, z + Math.sin(a) * 0.4] }, 4); }
  gl.cyl(0.36, 0.36, 0.55, 0xfff2a0, { p: [x, y + h + 0.38, z] }, 12);
  b.cone(0.5, 0.45, 0xe8322a, { p: [x, y + h + 0.92, z] }, 14);
  b.sphere(0.07, 0xffc21a, { p: [x, y + h + 1.2, z] }, 8, 6);
  b.box(0.36, 0.7, 0.06, 0x3a8bd8, { p: [x, y + 0.35, z + 0.66] }, 0.03);
  addStatic(level, b.geometry());
  addStatic(level, gl.geometry(), { material: 'glow', castShadow: false });
}

/** Ruderboot (Kulisse, schwimmt mit dem Wasser): { pos: [x, z], yaw, waterId, y0 }. */
export function rowboat(level, o) {
  if (!level.view) return;
  const b = new Build();
  b.add(new THREE.SphereGeometry(1, 16, 8, 0, TAU, Math.PI / 2, Math.PI / 2), 0x9a5a2a, { s: [1.4, 0.45, 0.55] });
  b.add(new THREE.CylinderGeometry(1, 1, 0.06, 16, 1, true), 0xf4eee2, { s: [1.4, 1, 0.55], p: [0, 0.0, 0] });
  b.box(0.2, 0.06, 0.9, 0xc8945a, { p: [0.2, -0.05, 0] }, 0.02);
  b.box(0.2, 0.06, 0.9, 0xc8945a, { p: [-0.6, -0.05, 0] }, 0.02);
  for (const s of [-1, 1]) b.cyl(0.03, 0.03, 1.6, 0xc8945a, { p: [-0.1, 0.05, s * 0.55], r: [0, 0, 1.35] }, 5);
  b.box(0.22, 0.03, 0.12, 0xc8945a, { p: [-0.9, 0.0, 0.62] }, 0.01);
  const mesh = new THREE.Mesh(b.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }));
  mesh.rotation.y = o.yaw ?? 0;
  mesh.position.set(o.pos[0], o.y0, o.pos[1]);
  let t = 0;
  addObject(level, mesh, (dt) => {
    t += dt;
    const top = level.waterLevel?.(o.waterId);
    mesh.position.y = (Number.isFinite(top) ? top : o.y0) + 0.05 + Math.sin(t * 1.6) * 0.03;
    mesh.rotation.z = Math.sin(t * 1.1) * 0.04;
  });
}

/** Sonnenschirm mit Handtuch (Strand, Kulisse): { pos, yaw }. */
export function parasol(level, o) {
  if (!level.view) return;
  const [x, y, z] = o.pos;
  const b = new Build();
  b.cyl(0.04, 0.04, 2.1, 0xf4eee2, { p: [0, 1.05, 0] }, 6);
  for (let i = 0; i < 8; i++) b.add(new THREE.ConeGeometry(1.2, 0.45, 8, 1, true, (i / 8) * TAU, TAU / 8), i % 2 ? 0xffffff : 0xff6a8a, { p: [0, 2.2, 0] });
  b.box(0.8, 0.02, 1.5, 0x3a8bd8, { p: [0.7, 0.02, 0.3] }, 0);
  for (let k = 0; k < 4; k++) b.box(0.8, 0.022, 0.12, 0xffffff, { p: [0.7, 0.022, -0.3 + k * 0.4] }, 0);
  b.sphere(0.18, 0xffd23a, { p: [-0.5, 0.18, 0.5] }, 10, 8);
  const g = b.geometry();
  g.rotateY(o.yaw ?? 0);
  g.translate(x, y, z);
  addStatic(level, g);
}
