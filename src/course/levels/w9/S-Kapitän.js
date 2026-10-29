// S-Kapitän „Krümel im Kurbel-Karussell“ – Welt Stern „Sternenzelt“, Rätsel-Diorama (Archetyp diorama, Thema starspace,
// Musik course_diorama, 400 s, 5 Sterne; Bauplan S-Kapitän: mechanisches Diorama ca. 30 × 30 m, das per Schalter gedreht
// wird; Drehen ist Pflicht; Stern 4 nur mit gedrehter Kamera sichtbar; Gegner Funkenflämmchen (9)).
//
// Krümel (Kapitänsmütze, Rucksack) springt nicht. Mitten in einer großen Spieluhr im All dreht sich das Kurbel-Karussell:
// eine Messing-Drehscheibe mit einer hölzernen Hochbrücke (oben y 3), die an einem Ende ein Sternentor trägt. Vier
// Uhrtürme stehen rings um die Scheibe (Süd, Ost, West, Nord – oben y 3); zwischen ihnen gibt es oben keinen Weg. Wer auf
// den Kurbel-Trittschalter in der Brückenmitte tritt, dreht das Karussell um eine Vierteldrehung: das offene Brückenende
// zeigt nacheinander nach Süd → Ost → Nord → West. Krümel steht dabei in der Mitte und wartet, bis die Brücke anliegt.
//
// Aufbau (x −15 … 15, z −19 … 19,5, vorn = +z), Ebenen: Boden y 0 · Türme und Brücke y 3 · Glockenstube y 6.
//   vorn      Startplatz am Boden, Treppe auf den Südturm; links die Spieluhr-Dose mit Drehtür (eigener Trittschalter)
//   Mitte     Kurbel-Karussell (Drehscheibe r 6,6, Hochbrücke 13,2 m, Sternentor am Nordende in Grundstellung)
//   Ost/West  Uhrtürme mit Funkenflämmchen
//   hinten    Nordturm mit Treppe zur Glockenstube; dahinter der Uhrwerk-Hof (Boden)
// Sterne (Bauplan): 1 Ostturm (eine Drehung) · 2 Westturm (drei Drehungen – erst dann zeigt das offene Ende nach Westen)
//                   3 in der Spieluhr-Dose (Drehtür per Trittschalter) · 4 im Uhrwerk-Hof hinter dem Nordturm – nur zu
//                   sehen und zu fassen, wenn die Kamera von hinten blickt · 5 in der Glockenstube (zwei Drehungen)
// Gegner: Funkenflämmchen 9 (hüpfen auf festen Bahnen; jede Berührung verletzt). Schatzstellen: Startplatz, Westturm,
// Glockenstube.

import { sign, line, ring, Bld, litTop, gradY, trittschalter, zahnraeder, zahnradGeo, leuchtsterne, planetchen, funkeln, addObject, visDt } from './_helpers_a.js';
import * as THREE from 'three';

const PI = Math.PI;
export const MSK = {
  G: 0, U: 3, T: 6,
  BASE: { x0: -15, x1: 15, z0: 19.5, z1: -19 },
  R: 6.6,                                                       // Drehscheibe
  S: { x0: -3.6, x1: 3.6, z0: 11.2, z1: 6.8 },                  // Südturm (Start oben über die Treppe)
  E: { x0: 6.8, x1: 13.4, z0: 3.4, z1: -3.4 },
  W: { x0: -13.4, x1: -6.8, z0: 3.4, z1: -3.4 },
  N: { x0: -5, x1: 5, z0: -6.8, z1: -15.6 },
  GLOCKE: { x0: -3.2, x1: 3.2, z0: -12.8, z1: -15.6 },          // Glockenstube y 6
  DOSE: { x0: -13.2, x1: -8, z0: 14.2, z1: 7.8, door: 11 },      // Spieluhr-Dose (Tür auf der Ostseite x −8)
};
const { G, U, T, BASE, R, S, E, W, N, GLOCKE, DOSE } = MSK;
const FLOOR = G - 0.05;    // fester Boden knapp unter der Drehscheibe (Stufe 5 cm)

// ---------------------------------------------------------------- Farben (Spielzeug-Uhrwerk)
const C = {
  holz: 0xf2c88a, holzD: 0xc8905a, messing: 0xffc84a, messingD: 0xc8902a,
  rosa: 0xffb8dc, mint: 0xa8ecd0, gelb: 0xffe08a, blau: 0xaacbff, lila: 0xc8b4ff, weiss: 0xfff6ee,
};

/** Fester Quader mit Kollision (oben begehbar) in den Sammler b; o: { top, side, tag, camIgnore }. */
function block(level, b, x0, x1, zA, zB, y0, y1, o = {}) {
  const z0 = Math.min(zA, zB), z1 = Math.max(zA, zB);
  level.world.add({ type: 'box', min: [x0, y0, z0], max: [x1, y1, z1], tag: o.tag ?? 'uhrwerk', camIgnore: o.camIgnore || undefined });
  b.box(x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, y0, (z0 + z1) / 2, gradY(o.side ?? C.lila, o.sideTop ?? C.weiss, y0, y1), { r: o.r ?? 0.12, seg: 2 });
  if (o.top) b.box(x1 - x0 - 0.3, 0.06, z1 - z0 - 0.3, (x0 + x1) / 2, y1 - 0.04, (z0 + z1) / 2, litTop(o.top, 0.9), { r: 0.03 });
}

/** Treppe aus Stufen ≤ 0,25 m (Krümel steigt hinauf): Vorderkante bei z (bzw. x), Richtung dir '-z' | '+z'. */
function treppe(level, b, o) {
  const { x, z, y, steps, rise = 0.25, run = 0.45, width = 2.4, dir = '-z' } = o;
  const sg = dir === '-z' ? -1 : 1;
  for (let i = 0; i < steps; i++) {
    const za = z + sg * i * run, zb = z + sg * (i + 1) * run;
    const top = y + rise * (i + 1);
    level.world.add({ type: 'box', min: [x - width / 2, y - 0.2, Math.min(za, zb)], max: [x + width / 2, top, Math.max(za, zb)], tag: 'treppe' });
    b.box(width, top - y + 0.2, run, x, y - 0.2, (za + zb) / 2, gradY(C.lila, C.weiss, y, top), { r: 0.05 });
    b.box(width - 0.1, 0.05, run - 0.06, x, top - 0.03, (za + zb) / 2, litTop(i % 2 ? C.rosa : C.mint, 0.9), { r: 0.02 });
  }
  // Messing-Handläufe (nur Optik)
  for (const s of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= steps; i += Math.max(1, Math.floor(steps / 4))) pts.push([x + s * (width / 2 + 0.06), y + rise * i + 0.75, z + sg * (i * run + run * 0.5)]);
    if (pts.length > 1) b.tube(pts, 0.05, C.messing, 12, 5);
  }
}

/** Uhrturm-Optik: Ziffernblatt mit Zeigern an einer Außenwand (Mitte cx, cy, cz; Blickrichtung face '+x' | '-x' | '+z' | '-z'). */
function uhr(b, g, cx, cy, cz, face, r = 1.1) {
  const yaw = { '+z': 0, '-z': PI, '+x': PI / 2, '-x': -PI / 2 }[face];
  const nx = Math.sin(yaw), nz = Math.cos(yaw);
  b.cyl(r + 0.12, r + 0.12, 0.12, cx, cy, cz, litTop(C.messing), 24, { rx: PI / 2, yaw });
  b.cyl(r, r, 0.14, cx + nx * 0.03, cy, cz + nz * 0.03, C.weiss, 24, { rx: PI / 2, yaw });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 2 * PI, px = Math.cos(a) * r * 0.8, py = Math.sin(a) * r * 0.8;
    const wx = cx + nz * px + nx * 0.1, wz = cz - nx * px + nz * 0.1;
    g.sphere(i % 3 ? 0.05 : 0.09, wx, cy + py, wz, i % 3 ? 0x8a70e0 : 0xff5a9a);
  }
  b.box(0.08, r * 0.55, 0.06, cx + nx * 0.12, cy, cz + nz * 0.12, 0x5a3a9a, { yaw, rz: 0.5, r: 0.02 });
  b.box(0.07, r * 0.75, 0.06, cx + nx * 0.14, cy, cz + nz * 0.14, 0x3a2a7a, { yaw, rz: -1.9, r: 0.02 });
}

/** Aufbau (vor dem Verschmelzen): Spielbrett, Türme, Treppen, Glockenstube, Spieluhr-Dose, Kulisse. */
function scene(level) {
  const b = new Bld(), g = new Bld();
  // ---------------- Spielbrett (Boden) mit Messing-Rand und Zahnkranz
  block(level, b, BASE.x0, BASE.x1, BASE.z0, BASE.z1, FLOOR - 1.6, FLOOR, { side: 0x8a70e0, sideTop: C.holz, tag: 'spielbrett' });
  // Bodenfliesen (Schachbrett Lavendel/Weiß) – nur Optik, knapp über dem Boden
  for (let x = BASE.x0 + 0.5; x < BASE.x1 - 0.4; x += 2) for (let z = BASE.z1 + 0.5; z < BASE.z0 - 0.4; z += 2) {
    if (Math.hypot(x + 1 - 0, z + 1 - 0) < R + 0.6) continue;
    const odd = (Math.round((x - BASE.x0) / 2) + Math.round((z - BASE.z1) / 2)) % 2;
    b.box(1.94, 0.03, 1.94, x + 1, FLOOR - 0.01, z + 1, odd ? 0xece4ff : 0xfff8f0, { r: 0.02 });
  }
  // Rand: Geländer (Kollision) mit Messingpfosten
  const railH = 0.9;
  for (const [x0, x1, z0, z1] of [[BASE.x0, BASE.x1, BASE.z0 - 0.25, BASE.z0], [BASE.x0, BASE.x1, BASE.z1, BASE.z1 + 0.25], [BASE.x0, BASE.x0 + 0.25, BASE.z1, BASE.z0], [BASE.x1 - 0.25, BASE.x1, BASE.z1, BASE.z0]]) {
    level.world.add({ type: 'box', min: [x0, FLOOR, z0], max: [x1, FLOOR + railH, z1], tag: 'gelaender', camIgnore: true });
  }
  for (let x = BASE.x0; x <= BASE.x1 + 0.01; x += 2.5) for (const z of [BASE.z0 - 0.12, BASE.z1 + 0.12]) { b.cyl(0.09, 0.11, railH, x, FLOOR, z, litTop(C.messing), 8); g.sphere(0.13, x, FLOOR + railH + 0.06, z, [0xff8ac8, 0x8ad8ff, 0xffe070][Math.round(x) & 1 ? 0 : 1]); }
  for (let z = BASE.z1; z <= BASE.z0 + 0.01; z += 2.5) for (const x of [BASE.x0 + 0.12, BASE.x1 - 0.12]) { b.cyl(0.09, 0.11, railH, x, FLOOR, z, litTop(C.messing), 8); g.sphere(0.13, x, FLOOR + railH + 0.06, z, 0xffe070); }
  b.tube([[BASE.x0, FLOOR + railH, BASE.z0 - 0.12], [BASE.x1, FLOOR + railH, BASE.z0 - 0.12]], 0.06, C.messing, 8, 5);
  b.tube([[BASE.x0, FLOOR + railH, BASE.z1 + 0.12], [BASE.x1, FLOOR + railH, BASE.z1 + 0.12]], 0.06, C.messing, 8, 5);
  b.tube([[BASE.x0 + 0.12, FLOOR + railH, BASE.z1], [BASE.x0 + 0.12, FLOOR + railH, BASE.z0]], 0.06, C.messing, 8, 5);
  b.tube([[BASE.x1 - 0.12, FLOOR + railH, BASE.z1], [BASE.x1 - 0.12, FLOOR + railH, BASE.z0]], 0.06, C.messing, 8, 5);
  // Zahnkranz rings um das Spielbrett (Unterkante)
  for (let i = 0; i < 64; i++) {
    const t = i / 64, per = 2 * ((BASE.x1 - BASE.x0) + (BASE.z0 - BASE.z1));
    let d = t * per, x, z;
    const w = BASE.x1 - BASE.x0, dd = BASE.z0 - BASE.z1;
    if (d < w) { x = BASE.x0 + d; z = BASE.z0 + 0.1; } else if ((d -= w) < dd) { x = BASE.x1 + 0.1; z = BASE.z0 - d; } else if ((d -= dd) < w) { x = BASE.x1 - d; z = BASE.z1 - 0.1; } else { d -= w; x = BASE.x0 - 0.1; z = BASE.z1 + d; }
    b.box(0.5, 0.9, 0.5, x, FLOOR - 1.3, z, litTop(C.messing, 0.7), { r: 0.06 });
  }
  // ---------------- Uhrtürme
  block(level, b, S.x0, S.x1, S.z0, S.z1, FLOOR, U, { side: C.rosa, top: C.holz, tag: 'suedturm' });
  block(level, b, E.x0, E.x1, E.z0, E.z1, FLOOR, U, { side: C.mint, top: C.holz, tag: 'ostturm' });
  block(level, b, W.x0, W.x1, W.z0, W.z1, FLOOR, U, { side: C.gelb, top: C.holz, tag: 'westturm' });
  block(level, b, N.x0, N.x1, N.z0, N.z1, FLOOR, U, { side: C.blau, top: C.holz, tag: 'nordturm' });
  // Zinnen-Kränze aus Messing an den Turmkanten (nur Optik, unter Kniehöhe)
  for (const t of [S, E, W, N]) for (const [ax, az, bx, bz] of [[t.x0, t.z0, t.x1, t.z0], [t.x0, t.z1, t.x1, t.z1], [t.x0, t.z0, t.x0, t.z1], [t.x1, t.z0, t.x1, t.z1]]) b.tube([[ax, U + 0.02, az], [bx, U + 0.02, bz]], 0.07, C.messing, 6, 5);
  // Turmkronen: Eck-Knäufe in Bonbonfarben, eingelegtes Sternwappen in der Turmfarbe, Wimpel an einer Ecke
  const KNAUF = [0xff8ac8, 0x8ad8ff, 0xffe070, 0x9af0b0];
  for (const [i, t, col] of [[0, S, C.rosa], [1, E, C.mint], [2, W, C.gelb], [3, N, C.blau]]) {
    const cx = (t.x0 + t.x1) / 2, cz = (t.z0 + t.z1) / 2;
    [[t.x0, t.z0], [t.x1, t.z0], [t.x0, t.z1], [t.x1, t.z1]].forEach(([x, z], k) => { b.sphere(0.17, x, U + 0.12, z, litTop(KNAUF[(i + k) % 4], 0.9)); });
    // farbiger Rahmen auf dem Holzdeckel (Spielbrett-Optik)
    const w = t.x1 - t.x0, d = Math.abs(t.z0 - t.z1), fw = 0.42, fc = litTop(col, 0.8);
    b.box(w - 0.5, 0.03, fw, cx, U, Math.max(t.z0, t.z1) - 0.25 - fw / 2, fc, { r: 0.01 });
    b.box(w - 0.5, 0.03, fw, cx, U, Math.min(t.z0, t.z1) + 0.25 + fw / 2, fc, { r: 0.01 });
    b.box(fw, 0.03, d - 0.5 - 2 * fw, t.x0 + 0.25 + fw / 2, U, cz, fc, { r: 0.01 });
    b.box(fw, 0.03, d - 0.5 - 2 * fw, t.x1 - 0.25 - fw / 2, U, cz, fc, { r: 0.01 });
    if (t !== S && t !== N) {
      b.cyl(0.95, 0.95, 0.03, cx, U - 0.01, cz, litTop(col, 0.95), 20);
      g.star(0.6, 0.26, 0.012, cx, U + 0.015, cz, 0xfff2a0, { rx: -PI / 2, bevel: 0.01 });
    }
    const [fx, fz] = [t.x1 - 0.2, t.z1 + 0.2];
    b.cyl(0.04, 0.05, 1.7, fx, U, fz, litTop(C.messing), 6);
    b.box(0.62, 0.36, 0.03, fx + 0.33, U + 1.32, fz, litTop(KNAUF[(i + 2) % 4], 0.95), { r: 0.02 });
    g.sphere(0.07, fx, U + 1.74, fz, 0xfff2a0, { ws: 6, hs: 5 });
  }
  uhr(b, g, 0, 1.5, S.z0 + 0.02, '+z');
  uhr(b, g, E.x1 + 0.02, 1.5, 0, '+x');
  uhr(b, g, W.x0 - 0.02, 1.5, 0, '-x');
  uhr(b, g, 0, 1.5, N.z1 - 0.02, '-z');
  // Fenster (glühend) an den Turmseiten
  for (const [x, z, f] of [[S.x0 - 0.02, 9, '-x'], [S.x1 + 0.02, 9, '+x'], [E.x0 + 3.3, E.z0 + 0.02, '+z'], [W.x0 + 3.3, W.z0 + 0.02, '+z'], [N.x0 - 0.02, -11, '-x'], [N.x1 + 0.02, -11, '+x']]) {
    const yaw = { '+z': 0, '-z': PI, '+x': PI / 2, '-x': -PI / 2 }[f];
    g.box(0.9, 1.1, 0.06, x, 0.8, z, 0xfff0a0, { yaw, r: 0.05 });
    b.box(1.1, 0.12, 0.12, x, 1.9, z, litTop(C.messing), { yaw, r: 0.04 });
  }
  // ---------------- Treppen: Boden → Südturm (vorn), Nordturm → Glockenstube
  treppe(level, b, { x: 0, z: S.z0 + 12 * 0.45, y: FLOOR, steps: 12, rise: (U - FLOOR) / 12, dir: '-z' });
  treppe(level, b, { x: 0, z: N.z0 - 0.6, y: U, steps: 12, rise: 0.25, dir: '-z' });
  // Glockenstube: Plattform, vier Säulen, Kuppeldach mit Stern, Glocke
  block(level, b, GLOCKE.x0, GLOCKE.x1, GLOCKE.z0, GLOCKE.z1, U, T, { side: C.blau, top: C.holz, tag: 'glockenstube' });
  for (const [x, z] of [[GLOCKE.x0 + 0.3, GLOCKE.z0 - 0.3], [GLOCKE.x1 - 0.3, GLOCKE.z0 - 0.3], [GLOCKE.x0 + 0.3, GLOCKE.z1 + 0.3], [GLOCKE.x1 - 0.3, GLOCKE.z1 + 0.3]]) {
    level.world.add({ type: 'cyl', x, z, r: 0.22, y0: T, y1: T + 3.4, tag: 'saeule' });
    b.cyl(0.2, 0.24, 3.4, x, T, z, gradY(C.messingD, C.messing, T, T + 3.4), 10);
  }
  const gx = 0, gz = (GLOCKE.z0 + GLOCKE.z1) / 2;
  b.box(GLOCKE.x1 - GLOCKE.x0 + 0.4, 0.3, GLOCKE.z0 - GLOCKE.z1 + 0.4, gx, T + 3.4, gz, litTop(C.lila), { r: 0.12 });
  b.sphere(2.2, gx, T + 3.7, gz, gradY(C.rosa, C.weiss, T + 3.7, T + 5.9), { s: [1.2, 0.7, 0.9], ws: 16, hs: 8 });
  g.star(0.55, 0.24, 0.16, gx, T + 5.7, gz, 0xfff07a);
  b.cyl(0.08, 0.08, 0.6, gx, T + 2.7, gz, C.messingD, 6);
  b.cone(0.75, 1.0, gx, T + 1.75, gz, gradY(C.messingD, C.messing, T + 1.75, T + 2.75), 14);
  b.sphere(0.16, gx, T + 1.7, gz, C.messingD);
  // ---------------- Spieluhr-Dose (Stern 3): Wände, Dach mit Tänzerin, Tür nach Osten (x −8) mit Drehtür
  const D = DOSE, dh = 2.8, wt = 0.3;
  const wall = (x0, x1, z0, z1) => block(level, b, x0, x1, z0, z1, FLOOR, FLOOR + dh, { side: C.rosa, sideTop: C.weiss, tag: 'dose', r: 0.06 });
  wall(D.x0, D.x1, D.z0 - wt, D.z0);                 // vorn
  wall(D.x0, D.x1, D.z1, D.z1 + wt);                 // hinten
  wall(D.x0, D.x0 + wt, D.z1, D.z0);                 // links
  wall(D.x1 - wt, D.x1, D.z1, D.door - 1.3);         // rechts hinten (Tür 2,6 m)
  wall(D.x1 - wt, D.x1, D.door + 1.3, D.z0);         // rechts vorn
  level.world.add({ type: 'box', min: [D.x0, FLOOR + dh, D.z1], max: [D.x1, FLOOR + dh + 0.3, D.z0], tag: 'dosendach', camIgnore: true });
  b.box(D.x1 - D.x0 + 0.4, 0.3, D.z0 - D.z1 + 0.4, (D.x0 + D.x1) / 2, FLOOR + dh, (D.z0 + D.z1) / 2, litTop(C.lila), { r: 0.1 });
  b.cyl(1.5, 1.9, 0.6, (D.x0 + D.x1) / 2, FLOOR + dh + 0.3, (D.z0 + D.z1) / 2, litTop(C.gelb), 18);
  for (let i = 0; i < 10; i++) { const a = (i / 10) * 2 * PI; g.sphere(0.1, (D.x0 + D.x1) / 2 + Math.cos(a) * 1.6, FLOOR + dh + 0.6, (D.z0 + D.z1) / 2 + Math.sin(a) * 1.6, i % 2 ? 0xff8ac8 : 0x8ae8ff); }
  // Notenlinien vorn auf der Dose
  for (let k = 0; k < 5; k++) b.box(D.x1 - D.x0 - 1, 0.04, 0.03, (D.x0 + D.x1) / 2, 0.9 + k * 0.2, D.z0 + 0.02, 0x8a70e0, { r: 0 });
  for (const [x, y] of [[-12, 1.2], [-11, 1.5], [-10, 1.1], [-9.4, 1.6]]) { g.sphere(0.12, x, y, D.z0 + 0.06, 0xff5a9a, { s: [1.2, 0.9, 0.5] }); b.box(0.04, 0.45, 0.03, x + 0.1, y, D.z0 + 0.05, 0x8a70e0, { r: 0 }); }
  // ---------------- Kulisse: Zahnräder an den Turmwänden (gebacken), Federn, Kristalle
  zahnradGeo(b, { x: E.x0 + 2, y: 1.9, z: E.z1 - 0.18, r: 1.2, color: C.messing });
  zahnradGeo(b, { x: W.x1 - 2, y: 1.6, z: W.z1 - 0.18, r: 1.0, color: 0xffa8d8 });
  zahnradGeo(b, { x: N.x1 + 0.18, y: 1.8, z: -9, r: 1.1, axis: 'x', color: 0x9ad8ff });
  zahnradGeo(b, { x: S.x0 - 0.18, y: 2.0, z: 9, r: 0.9, axis: 'x', color: C.messing });
  zahnradGeo(b, { x: BASE.x1 + 0.35, y: -1.0, z: 8, r: 1.4, axis: 'x', color: C.messing });
  zahnradGeo(b, { x: BASE.x0 - 0.35, y: -1.0, z: -10, r: 1.2, axis: 'x', color: 0x9ad8ff, angle: 0.3 });
  zahnradGeo(b, { x: -4, y: -1.0, z: BASE.z0 + 0.35, r: 1.3, color: C.messing, angle: 0.2 });
  for (const [x, z, c] of [[13.6, 17.6, 0xb8e8ff], [-14, -17.6, 0xffb0e0], [13.8, -17.4, 0xc8b0ff], [-5.6, 18.2, 0xfff0a0]]) for (let k = 0; k < 3; k++) g.cone(0.26 - k * 0.05, 1.2 - k * 0.3, x + (k - 1) * 0.35, FLOOR, z + (k % 2) * 0.3, c, 5);
  // Spiralfedern (Spielzeug-Mechanik) an den Ecken
  for (const [x, z] of [[-14, 17.8], [14, 0.5], [-14, -6], [8, -17.8]]) {
    const pts = [];
    for (let i = 0; i <= 32; i++) { const a = i * 0.6; pts.push([x + Math.cos(a) * 0.35, FLOOR + i * 0.05, z + Math.sin(a) * 0.35]); }
    b.tube(pts, 0.05, 0xd8d8f0, 48, 5);
    g.sphere(0.22, x, FLOOR + 1.75, z, 0xff8ac8);
  }
  b.flush(level);
  g.flush(level, { material: 'glow', castShadow: false });
}

/** Laufzeit: Zier des Karussells (dreht mit), Drehzahnräder, Tänzerin, Funkeln, Hinweise. */
function setup(level) {
  const k = level.named.get('karussell');
  if (level.view && k) {
    // Hochbrücke: Planken, Messinggeländer mit Sternpfosten, Sternentor, Kurbel-Säule – eine drehende Gruppe
    const b = new Bld(), g = new Bld();
    for (let z = -6.4; z < 6.5; z += 0.6) b.box(2.3, 0.05, 0.54, 0, U - 0.02, z + 0.3, litTop(((z * 10) | 0) % 2 ? C.holz : 0xf8d8a0, 0.9), { r: 0.02 });
    for (const s of [-1, 1]) {
      b.tube([[s * 1.1, U + 0.72, -5.8], [s * 1.1, U + 0.72, 5.8]], 0.06, C.messing, 6, 5);
      for (let z = -5.8; z <= 5.81; z += 1.45) { b.cyl(0.07, 0.07, 0.72, s * 1.1, U, z, litTop(C.messing), 6); g.star(0.16, 0.07, 0.05, s * 1.1, U + 0.85, z, [0xff8ac8, 0x8ae8ff, 0xfff07a][Math.abs(Math.round(z)) % 3]); }
    }
    // Sternentor am Nordende (lokal −z)
    b.box(0.3, 2.4, 0.4, -1.05, U, -6.0, litTop(C.lila), { r: 0.08 });
    b.box(0.3, 2.4, 0.4, 1.05, U, -6.0, litTop(C.lila), { r: 0.08 });
    b.box(2.4, 1.6, 0.3, 0, U, -6.0, gradY(0x8a70e0, C.rosa, U, U + 1.6), { r: 0.08 });
    g.star(0.7, 0.3, 0.12, 0, U + 2.2, -6.0, 0xfff07a);
    g.star(0.45, 0.2, 0.1, 0, U + 0.9, -5.82, 0xff8ac8);
    // Pfeil am offenen Ende (+z): zeigt, wohin die Brücke führt
    g.cone(0.4, 0.7, 0, U + 0.04, 5.6, 0x7aff9a, 3, { rx: PI / 2 });
    // Säule unter der Brücke mit Zahnrad
    zahnradGeo(b, { x: 0, y: 1.3, z: 0.75, r: 0.9, color: C.messing });
    zahnradGeo(b, { x: 0, y: 1.3, z: -0.75, r: 0.9, color: C.messing });
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.15 });
    const deco = b.mesh(mat);
    deco.castShadow = true; deco.receiveShadow = true;
    const glow = g.mesh(new THREE.MeshBasicMaterial({ vertexColors: true }));
    const root = new THREE.Group();
    root.name = 'karussell-zier';
    root.add(deco, glow);
    const hd = {};
    addObject(level, root, (dt) => { visDt(level, hd, dt); root.rotation.y = k.angle; });
  }
  // Drehende Zahnräder an der Glockenstube und am Spielbrett-Rand
  zahnraeder(level, [
    { pos: [GLOCKE.x1 + 0.2, T - 1.2, -14.2], r: 1.0, axis: 'x', speed: 0.8, color: C.messing },
    { pos: [GLOCKE.x1 + 0.2, T - 2.6, -12.9], r: 0.7, axis: 'x', speed: -1.15, color: 0xffa8d8 },
  ]);
  // Tänzerin auf der Spieluhr-Dose (dreht sich)
  if (level.view) {
    const tb = new Bld();
    tb.cyl(0.04, 0.04, 0.5, 0, 0, 0, C.messing, 6);
    tb.cone(0.42, 0.45, 0, 0.45, 0, 0xffb8dc, 12, { rx: PI });
    tb.cyl(0.12, 0.16, 0.5, 0, 0.72, 0, 0xff8ac8, 8);
    tb.sphere(0.16, 0, 1.36, 0, 0xffe0c8);
    tb.box(0.9, 0.06, 0.06, 0, 1.12, 0, 0xffe0c8, { rz: 0.3, r: 0.02 });
    tb.star(0.14, 0.06, 0.04, 0, 1.6, 0, 0xfff07a);
    const tm = tb.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4 }));
    const tg = new THREE.Group();
    tg.position.set((DOSE.x0 + DOSE.x1) / 2, FLOOR + 3.4, (DOSE.z0 + DOSE.z1) / 2);
    tg.add(tm);
    addObject(level, tg, (dt) => { tm.rotation.y += visDt(level, tg, dt) * 1.4; });
  }
  funkeln(level, { center: [0, 6, 0], size: [16, 5, 18], n: 34, seed: 21, color: 0xfff0c0 });
}

export const LEVEL = {
  id: 'S-Kapitän',
  world: 9,
  title: 'Krümel im Kurbel-Karussell',
  archetype: 'diorama',
  theme: 'starspace',
  music: 'course_diorama',
  build: scene,
  setup,
  timeLimit: 400,
  killY: -12,
  start: { pos: [6, FLOOR, 17], yaw: PI / 2 },
  diorama: {
    figure: 'kruemel',
    center: [0, 2.6, -1],
    camera: { yaw: 20, pitch: 46, dist: [46, 17], follow: [0.3, 0.9], fov: 40 },
    props: [
      { kind: 'dig', pos: [10.5, FLOOR, 15.5] }, { kind: 'dig', pos: [-11.4, U, -2.2] }, { kind: 'dig', pos: [1.6, T, -14.6] },
    ],
  },
  segments: [
    // Kurbel-Karussell: Drehscheibe, Säule, Hochbrücke (y 3), Geländer, Sternentor am Nordende (lokal −z)
    { type: 'drehdiorama', id: 'karussell', pos: [0, G, 0], time: 1.4, dir: 1,
      disc: { radius: R, height: 0.6, color: 0xc8a060 },
      parts: [
        { pos: [0, 0, 0], size: [1.4, U - 0.6, 1.4], color: 0x8a70e0 },
        { pos: [0, U - 0.6, 0], size: [2.4, 0.6, 2 * R], color: C.holzD, top: C.holz },
        { pos: [-1.1, U, 0], size: [0.14, 0.72, 11.6], color: C.messing },
        { pos: [1.1, U, 0], size: [0.14, 0.72, 11.6], color: C.messing },
        { pos: [0, U, -6.0], size: [2.4, 1.6, 0.4], color: 0x8a70e0, top: C.rosa },
      ],
      items: [
        { kind: 'coin', pos: [0, U + 0.6, 3.2] }, { kind: 'coin', pos: [0, U + 0.6, 4.6] },
        { kind: 'coin', pos: [0, U + 0.6, -3.2] }, { kind: 'coin', pos: [0, U + 0.6, -4.6] },
        { kind: 'coin', pos: [3.4, G + 0.6, 3.4] }, { kind: 'coin', pos: [-3.4, G + 0.6, -3.4] }, { kind: 'coin', pos: [3.4, G + 0.6, -3.4] }, { kind: 'coin', pos: [-3.4, G + 0.6, 3.4] },
      ],
      sicht: [{ star: 'stern_hof', yaw: [135, 225] }],
    },
    // Drehtür der Spieluhr-Dose (Wand quer in der Tür; eine Vierteldrehung öffnet sie)
    { type: 'drehdiorama', id: 'drehtuer', pos: [DOSE.x1 - 0.15, FLOOR, DOSE.door], time: 0.9, dir: 1,
      parts: [{ pos: [0, 0, 0], size: [0.3, 2.5, 2.4], color: 0xff8ac8, top: 0xfff07a }] },
    sign(-2.6, U, 7.4, 'Tritt auf die Kurbel –\ndas Karussell dreht sich!', { size: [2.6, 1.0], yaw: 0.2 }),
    sign(-12.6, FLOOR, -16.2, 'Dreh die Kamera –\nwas glitzert da?', { size: [2.4, 0.9], yaw: 0.9 }),
  ],
  items: [
    // Startplatz und Treppe
    line([4.6, G + 0.5, 17.4], [1.4, G + 0.5, 17.4], 3),
    line([0, 1.2, 15], [0, 2.8, 12.2], 4),
    // Türme
    ring([10.4, U + 0.6, 0], 1.6, 6),
    line([-8.4, U + 0.5, 0], [-12.4, U + 0.5, 0], 4),
    line([0, U + 1.5, -9.6], [0, U + 2.6, -11.8], 3),
    // Boden rings um die Türme
    line([-14.2, G + 0.5, 4], [-14.2, G + 0.5, -14], 7),
    line([-6, G + 0.5, -17], [6, G + 0.5, -17], 5),
    line([14.2, G + 0.5, -4], [14.2, G + 0.5, 4], 4),
    ring([-10.6, G + 0.6, 11], 1.2, 6),
  ],
  enemies: [
    // Funkenflämmchen (9): hüpfen auf festen Bahnen neben den Wegen
    { kind: 'funkenflaemmchen', id: 'ff_ost', instancing: 'all', pos: [8.2, U, -2.5], path: [[8.2, U, -2.5], [12.6, U, -2.5]] },
    { kind: 'funkenflaemmchen', id: 'ff_west1', instancing: 'all', pos: [-12.6, U, 2.5], path: [[-12.6, U, 2.5], [-8.2, U, 2.5]] },
    { kind: 'funkenflaemmchen', id: 'ff_west2', instancing: 'all', pos: [-8.2, U, -2.6], path: [[-8.2, U, -2.6], [-12.6, U, -2.6]], phase: 0.5 },
    { kind: 'funkenflaemmchen', id: 'ff_nord', instancing: 'all', pos: [3.4, U, -8.2], path: [[3.4, U, -8.2], [3.4, U, -12]] },
    { kind: 'funkenflaemmchen', id: 'ff_glocke', instancing: 'all', pos: [2.2, T, -14.9], path: [[1.6, T, -14.9], [2.6, T, -13.4]], color: 'blau' },
    { kind: 'funkenflaemmchen', id: 'ff_hof1', instancing: 'all', pos: [-7, G, -18.3], path: [[-7, G, -18.3], [-2.4, G, -18.3]] },
    { kind: 'funkenflaemmchen', id: 'ff_hof2', instancing: 'all', pos: [7, G, -18.3], path: [[7, G, -18.3], [2.4, G, -18.3]], phase: 0.4 },
    { kind: 'funkenflaemmchen', id: 'ff_rechts', instancing: 'all', pos: [14.1, G, -7], path: [[14.1, G, -7], [14.1, G, -13]], color: 'blau' },
    { kind: 'funkenflaemmchen', id: 'ff_vorn', instancing: 'all', pos: [10.6, G, 13.4], path: [[9.2, G, 13.4], [13.6, G, 13.4]] },
  ],
  stars: [
    { pos: [10.6, U, 0.4], id: 'stern_ost', instancing: 'all' },                    // 1: Ostturm
    { pos: [-10.6, U, 0.4], id: 'stern_west', instancing: 'all' },                  // 2: Westturm (drei Drehungen)
    { pos: [-10.6, FLOOR, 11], id: 'stern_dose', instancing: 'all' },               // 3: Spieluhr-Dose (Drehtür)
    { pos: [0, FLOOR, -17.4], id: 'stern_hof', instancing: 'all' },                 // 4: Uhrwerk-Hof – nur mit gedrehter Kamera
    { pos: [-1.6, T, -14.2], id: 'stern_glocke', instancing: 'all' },               // 5: Glockenstube
  ],
  marks: {
    start: [6, FLOOR, 17], treppe: [0, FLOOR, 17.2], sued: [0, U, 8.6], mitte: [0, U, 0], ost: [10.6, U, 0], west: [-10.6, U, 0],
    nord: [0, U, -7.6], glocke: [0, T, -13.4], dose: [-6.2, FLOOR, 13], hof: [-14.2, FLOOR, -17],
  },
};

// Trittschalter: Kurbel in der Brückenmitte (dreht das Karussell), Drehtür der Spieluhr-Dose
const _setup = LEVEL.setup;
LEVEL.setup = (level, scene2) => {
  trittschalter(level, [
    { id: 'kurbel', pos: [0, U, 0], r: 0.75, color: 0xff5a9a, onPress: { toggle: 'karussell' }, ready: () => !level.named.get('karussell')?.turning },
    { id: 'tuerknopf', pos: [-5.6, FLOOR, 14.4], r: 0.75, color: 0x3a9aff, onPress: { toggle: 'drehtuer' }, ready: () => !level.named.get('drehtuer')?.turning },
  ]);
  _setup(level, scene2);
};
