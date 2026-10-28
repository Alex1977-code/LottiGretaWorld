// 7-Burg „Kampfwagen-Duell in der Glutfeste“ (Archetyp boss, Bauplan 7-Burg: Lava-Burg ≈ 200 m + Bossstraße ≈ 150 m; 500 s;
// frei nach 7-7 und ab 150 Sternen). Thema lavacastle, Musik course_keep, 3 Sterne + Stempel. Level verläuft nach −Z,
// Burghöfe mit Oberseite y = 2 über einem Lavasee (y = 0); Bossstraße y = 2 über Lava (y = −1,2).
//
// Abschnitte:
//   A Start        z  +8 …   −6   Vorplatz vor der Glutfeste; links zwei Mauerpfeiler über der Lava (Wandsprung-Schacht)
//   B Vorhof       z  −6 …  −50   Brücke mit Lavablasen-Bögen, erster Hof mit Bumerang-Werfern (einer trägt eine goldene
//                                 Wurfsichel – besiegt lässt er sie fallen), Trittsteine, zweiter Hof zwischen Lavabecken
//                                 (Lavablasen springen quer hinüber), Brücke zum Burggraben-Ufer
//   C Zugbrücke    z −50 …  −73   Wachturm mit grauer Blockwand: die Burgkanone auf dem Torhaus schießt Kickbomben vor den
//                                 Turm – eine Kickbombe gegen die Wand legt den Druckknopf frei, er senkt die Zugbrücke
//                                 (nochmal drücken hebt sie wieder). Im Graben ein Eisengitter vor der hochgezogenen Brücke
//   D Wachbereich  z −73 … −124   Kontrollpunkt im Wachhof (Feuer-Werfer auf der Brüstung, Gitter-Vordach über der Lava),
//                                 Klappstampfer-Gang über der Lava, zweiter Hof
//   E Steg         z −124 … −164  schmaler Steg mit Lavablasen-Bögen zur Hammer-Bühne: zwei Hammer-Werfer besiegen → die
//                                 Warp-Box zum Boss erscheint
//   F Bossstraße   z −198 … −360  Startplatz (Kontrollpunkt), Boss-Straße mit Lavalücken, Mittellücke und Stachelfallen:
//                                 **Baron Brummbär im Kampfwagen** (Kickbomben zurückkicken, Wurfsichel kratzt; 9 Treffer)
//   G Ziel         z −378 … −398  Siegerplateau mit befreitem Krümel und Zielmast (Warp-Box nach dem Sieg)
// Sterne: 0 **nahe dem Start per Wandsprung** zwischen den Mauerpfeilern über der Lava (oben auf dem inneren Pfeiler) ·
//         1 **oben auf der Zugbrücke, bevor sie gesenkt ist** (Wandsprung zwischen Grabengitter und Brücke) · 2 **nach dem
//         Kontrollpunkt über der Lava mit der Wurfsichel** – unter dem Gitter-Vordach (Springen stößt an das Gitter).
// Stempel: im Wachturm **per Wandsprung über dem Druckknopf** (der Schacht hinter der Blockwand).
// Extraleben: unsichtbarer Block auf der Hammer-Bühne. Power-ups: Wachstumsbeere am Start, Wurfsichel vom Bumerang-Werfer
// und im ?-Block am Kontrollpunkt.
// Gegner: Bumerang-Werfer 3 (einer mit Wurfsichel), Feuer-Werfer 2, Hammer-Werfer 2, Lavablasen 12, Klappstampfer 3,
// Baron Brummbär im Kampfwagen.

import { Rnd } from '../../blocks/kit.js';
import {
  isl, line, ring, arc, sign, Bld, litTop, burgMauer, burgFassaden, eisenGitter, burgBanner, basaltPflaster, kacheln, FESTE, baerStatue, lavaBrunnen,
} from './_helpers_d.js';
import { wappenMosaik, werferKram } from './_helpers_a.js';

const Y = 2;            // Burghöfe, Wege
const LAVA = 0;         // Lavasee der Burg
const RL = Y - 3.2;     // Lava unter der Boss-Straße
const ZC = -210, LEN = 150, ZE = ZC - LEN;   // Boss-Straße: Anfang, Länge, Ende (−360)
const TW = { x0: 7.4, x1: 9.6, z0: -54.4, z1: -61.2 };   // Wachturm-Schacht (innen; der Turm steht hinten im Graben)

const cast = (x0, x1, zA, zB, top = Y, o = {}) => isl(x0, x1, zA, zB, top, top - LAVA + 3, { top: 'stone', ...o });
const blase = (x, z, o = {}) => ({ kind: 'lavablase', pos: [x, LAVA, z], height: o.height ?? 3.4, period: o.period ?? 3.2, phase: o.phase ?? 0, ...o });

function build(level) {
  const W = level.world;
  // ---------------- Kollision der Burgteile
  // Wachturm: Wände um den Schacht (7,5 m), oben über der Blockwand ein Eisengitter (Kamera sieht hindurch)
  W.add({ type: 'box', min: [6.6, Y, -53.6], max: [TW.x0, Y + 7.5, -62], tag: 'wachturm' });
  W.add({ type: 'box', min: [TW.x1, Y, -53.6], max: [10.4, Y + 7.5, -62], tag: 'wachturm' });
  W.add({ type: 'box', min: [6.6, Y, -62], max: [10.4, Y + 7.5, TW.z1], tag: 'wachturm' });
  W.add({ type: 'box', min: [TW.x0, Y + 3, -53.6], max: [TW.x1, Y + 7.5, TW.z0], camIgnore: true, tag: 'turmgitter' });
  // Grabengitter vor der hochgezogenen Brücke (Wandsprung-Schacht zur Brückenspitze)
  // (hängt 2,2 m über dem Brückendeck: gesenkt geht man darunter durch)
  W.add({ type: 'box', min: [-1.9, Y + 2.2, -65.0], max: [1.9, Y + 9, -64.6], camIgnore: true, tag: 'grabengitter' });
  for (const x of [-2.25, 2.25]) W.add({ type: 'cyl', x, z: -64.8, r: 0.22, y0: LAVA - 1, y1: Y + 9.2, camIgnore: true, tag: 'gitterpfosten' });
  // Torhaus: zwei Mauerblöcke (begehbarer Wehrgang oben), Sturz über dem Tor
  W.add({ type: 'box', min: [-12, Y, -73], max: [-1.9, Y + 7, -68], tag: 'torhaus' });
  W.add({ type: 'box', min: [1.9, Y, -73], max: [12, Y + 7, -68], tag: 'torhaus' });
  W.add({ type: 'box', min: [-1.9, Y + 4.4, -73], max: [1.9, Y + 7, -68.45], tag: 'torsturz' });
  // Gitter-Vordach über der Lava (Stern 2: nur die Wurfsichel reicht darunter hin)
  W.add({ type: 'box', min: [9, Y + 2.0, -87.6], max: [18.2, Y + 2.4, -81.4], camIgnore: true, tag: 'vordach' });
  for (const z of [-81.6, -87.4]) W.add({ type: 'cyl', x: 18, z, r: 0.25, y0: LAVA - 1, y1: Y + 2.0, tag: 'vordach-pfosten' });
  // Kanzeln der Werfer (Einweg)
  W.add({ type: 'box', min: [-8.4, Y + 2.0, -89.2], max: [-4.6, Y + 2.4, -86.8], oneWay: true, tag: 'bruestung' });
  W.add({ type: 'box', min: [-6.2, Y + 2.2, -159.2], max: [-2.6, Y + 2.6, -156.8], oneWay: true, tag: 'buehne' });
  W.add({ type: 'box', min: [2.6, Y + 2.2, -159.2], max: [6.2, Y + 2.6, -156.8], oneWay: true, tag: 'buehne' });

  // ---------------- Kulisse (verschmolzen)
  const rnd = new Rnd(7777);
  const b = new Bld(), g = new Bld();
  burgFassaden(b, g, [
    [-7, 7, 8, -6, Y], [-1.4, 1.4, -6, -12, Y, 'lx'], [-9, 9, -12, -28, Y], [-2.3, -0.1, -29.1, -31.3, Y], [0.1, 2.3, -31.5, -33.7, Y],
    [-6, 6, -34, -46, Y, 'lx'], [-1.4, 1.4, -46, -50, Y, 'lx'], [-10, 10, -50, -60, Y], [-4.6, -2.4, -63.0, -65.4, Y - 0.5, 'fxlb'],
    [-9, 9, -73, -92, Y, 'lx'], [-3.6, 3.6, -92, -112, Y, 'lx'], [-8, 8, -112, -124, Y, 'lx'], [-1.1, 1.1, -124, -150, Y, 'lx'], [-8, 8, -150, -164, Y],
    [-12.4, -10.4, 0.6, -5.2, Y + 9.5, 'fxlb'], [-7.8, -7, -1.0, -5.2, Y + 7, 'fl'], [-10.4, -7.8, 0.4, -4.4, Y - 1.4, 'f'],
  ], LAVA, rnd);
  kacheln(b, -7, 7, 8, -6, Y + 0.005, [0xb49888, 0x7c6264], rnd, { cell: 1.4, avoid: [[-1.1, 1.1, 8, -6]] });
  kacheln(b, -9, 9, -12, -28, Y + 0.005, [0xb49888, 0x7c6264], rnd, { cell: 1.4, avoid: [[-1.1, 1.1, -12, -28], [3.6, 6.6, -23, -26]] });
  kacheln(b, -6, 6, -34, -46, Y + 0.005, [0xb49888, 0x7c6264], rnd, { cell: 1.4, avoid: [[-1.1, 1.1, -34, -46]] });
  kacheln(b, -10, 10, -50, -60, Y + 0.005, [0xb49888, 0x7c6264], rnd, { cell: 1.4, avoid: [[-1.1, 1.1, -50, -60], [6.6, 10.4, -53.6, -59]] });
  kacheln(b, -9, 9, -73, -92, Y + 0.005, [0xb8a090, 0x806668], rnd, { cell: 1.4, avoid: [[-1.1, 1.1, -73, -92]] });
  kacheln(b, -8, 8, -112, -124, Y + 0.005, [0xb8a090, 0x806668], rnd, { cell: 1.4, avoid: [[-1.1, 1.1, -112, -124]] });
  kacheln(b, -8, 8, -150, -164, Y + 0.005, [0xb8a090, 0x806668], rnd, { cell: 1.4, avoid: [[-1.1, 1.1, -150, -164]] });
  // roter Läufer durch die ganze Burg
  for (const [zA, zB] of [[7.6, -6], [-6, -12], [-12, -28], [-34, -46], [-46, -50], [-50, -60], [-73, -92], [-112, -124], [-150, -164]]) {
    const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
    b.box(2.0, 0.03, z0 - z1, 0, Y + 0.01, (z0 + z1) / 2, FESTE.red, { r: 0 });
    for (const s of [-1, 1]) b.box(0.12, 0.035, z0 - z1, s * 0.94, Y + 0.012, (z0 + z1) / 2, FESTE.gold, { r: 0 });
  }
  // Wachturm: Ziegel außen, Zinnen, Gitter über der Blockwand, Schacht-Innenwände mit Fackel-Glut
  burgMauer(level, b, g, { from: [7.0, -53.6], to: [7.0, -62], y: Y, h: 7.5, t: 0.8, faces: [-1, 1], solid: false }, rnd);
  burgMauer(level, b, g, { from: [10.0, -53.6], to: [10.0, -62], y: Y, h: 7.5, t: 0.8, faces: [-1, 1], solid: false }, rnd);
  burgMauer(level, b, g, { from: [6.6, -61.6], to: [10.4, -61.6], y: Y, h: 7.5, t: 0.8, faces: [1], solid: false }, rnd);
  eisenGitter(b, { axis: 'x', at: -54, a0: TW.x0, a1: TW.x1, y0: Y + 3, y1: Y + 7.5 });
  b.box(2.4, 0.3, 0.9, (TW.x0 + TW.x1) / 2, Y + 2.95, -54, litTop(FESTE.cap, 0.6), { r: 0 });
  // Grabengitter im Burggraben (Pfosten in der Lava)
  eisenGitter(b, { axis: 'x', at: -64.8, a0: -1.9, a1: 1.9, y0: Y + 2.2, y1: Y + 9 });
  for (const x of [-2.25, 2.25]) { b.cyl(0.22, 0.26, Y + 9.2 - LAVA + 0.4, x, LAVA - 0.4, -64.8, litTop(FESTE.ironHi, 0.6), 8); b.sphere(0.3, x, Y + 9.3, -64.8, FESTE.gold, { ws: 10, hs: 7 }); }
  // Torhaus: Ziegelfront, Wehrgang-Zinnen, Torbogen mit hochgezogenem Fallgitter, Banner
  for (const [x0, x1] of [[-12, -1.9], [1.9, 12]]) {
    burgMauer(level, b, g, { from: [x0, -68.4], to: [x1, -68.4], y: Y, h: 7, t: 0.8, faces: [1], solid: false, merlons: true }, rnd);
    b.box(x1 - x0, 0.2, 4.6, (x0 + x1) / 2, Y + 6.8, -70.8, litTop(FESTE.capDark, 0.7), { r: 0 });
    burgMauer(level, b, g, { from: [x0, -72.6], to: [x1, -72.6], y: Y, h: 7, t: 0.8, faces: [-1], solid: false, slits: false }, rnd);
  }
  b.box(4.6, 2.6, 0.9, 0, Y + 4.4, -68.85, litTop(FESTE.cap, 0.62), { r: 0 });
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (i / 6);
    b.box(0.5, 0.5, 0.95, Math.cos(a) * 2.2, Y + 4.1 + Math.sin(a) * 0.9, -68.8, litTop(FESTE.cap, 0.6), { r: 0 });
  }
  eisenGitter(b, { axis: 'x', at: -72.4, a0: -1.9, a1: 1.9, y0: Y + 3.6, y1: Y + 4.4, cell: 0.38 });
  burgBanner(b, g, [[-6.6, Y + 6.2, -68.0, -Math.PI / 2], [6.6, Y + 6.2, -68.0, -Math.PI / 2, 0x8a4ad8], [-3.2, Y + 6.2, -68.0, -Math.PI / 2, 0x8a4ad8], [3.2, Y + 6.2, -68.0, -Math.PI / 2]]);
  // Wachhof: Brüstung mit Werfer-Kanzel, Vordach-Gitter, Zinnenmauern an den Seiten
  eisenGitter(b, { axis: 'y', at: Y + 2.0, x0: 9, x1: 18.2, z0: -87.6, z1: -81.4 });
  for (const z of [-81.6, -87.4]) b.cyl(0.25, 0.3, Y + 2.4 - LAVA + 1, 18, LAVA - 1, z, litTop(FESTE.ironHi, 0.6), 8);
  b.box(3.8, 0.4, 2.4, -6.5, Y + 2.0, -88, litTop(0x9a6038, 0.7), { r: 0.03 });
  for (const x of [-8.2, -4.8]) b.cyl(0.14, 0.16, 2.0, x, Y, -88, litTop(0x5a3820, 0.7), 6);
  burgMauer(level, b, g, { from: [-9, -73.4], to: [-9, -92], y: Y, h: 2.4, t: 0.7, faces: [1] }, rnd);
  burgMauer(level, b, g, { from: [9, -88.2], to: [9, -92], y: Y, h: 2.4, t: 0.7, faces: [-1] }, rnd);
  burgMauer(level, b, g, { from: [9, -73.4], to: [9, -80.8], y: Y, h: 2.4, t: 0.7, faces: [-1] }, rnd);
  // Hammer-Bühne: zwei Holzkanzeln
  for (const x of [-4.4, 4.4]) {
    b.box(3.6, 0.4, 2.4, x, Y + 2.2, -158, litTop(0x9a6038, 0.7), { r: 0.03 });
    for (const dx of [-1.6, 1.6]) b.cyl(0.14, 0.16, 2.2, x + dx, Y, -158, litTop(0x5a3820, 0.7), 6);
  }
  burgBanner(b, g, [[0, Y + 4.2, -164.2, -Math.PI / 2]]);
  b.box(8, 4.4, 0.8, 0, Y, -164.4, litTop(FESTE.capDark, 0.7), { r: 0 });
  // Höfe: niedrige Zinnenmauern an den Seiten, Brummbär-Statuen, Lava-Brunnen, Wappen-Mosaike, Lager der Bande
  const M = (from, to, faces, h = 1.2) => burgMauer(level, b, g, { from, to, y: Y, h, t: 0.7, faces }, rnd);
  M([-8.65, -12.4], [-8.65, -27.6], [1]); M([8.65, -12.4], [8.65, -27.6], [-1]);
  M([-5.65, -34.4], [-5.65, -45.6], [1, -1], 1.0); M([5.65, -34.4], [5.65, -45.6], [1, -1], 1.0);
  M([-9.65, -50.4], [-9.65, -59.6], [1]);
  M([-7.65, -112.4], [-7.65, -123.6], [1]); M([7.65, -112.4], [7.65, -123.6], [-1]);
  M([-7.65, -150.4], [-7.65, -163.6], [1]); M([7.65, -150.4], [7.65, -163.6], [-1]);
  const statue = (x, z, yaw = -Math.PI / 2, sc = 1) => { baerStatue(b, g, x, Y, z, yaw, sc); W.add({ type: 'box', min: [x - 0.76 * sc, Y, z - 0.76 * sc], max: [x + 0.76 * sc, Y + 3.3 * sc, z + 0.76 * sc], tag: 'statue' }); };
  statue(-6.4, -14.6); statue(6.4, -14.6);
  statue(-6.2, -122.4); statue(6.2, -122.4);
  statue(-5.2, -199.2, -Math.PI / 2, 0.9); statue(5.2, -199.2, -Math.PI / 2, 0.9);
  const brunnen = (x, z, r) => { lavaBrunnen(b, g, x, Y, z, r); W.add({ type: 'cyl', x, z, r: r + 0.15, y0: Y, y1: Y + 0.85, tag: 'brunnen' }); };
  brunnen(-6.2, -25.2, 1.4); brunnen(5.6, -76.4, 1.3); brunnen(4.8, -393.8, 1.5);
  wappenMosaik(b, 0, Y + 0.02, -20, 1.6); wappenMosaik(b, 0, Y + 0.02, -55, 1.5); wappenMosaik(b, 0, Y + 0.02, -118, 1.6); wappenMosaik(b, 0, Y + 0.02, -390, 1.8);
  werferKram(b, g, [[7.2, Y, -17.6, -0.4], [-7.6, Y, -52.6, 0.5], [-6.4, Y, -114.4, 0.3]], rnd);
  // Bossstraße: Startplatz und Siegerplateau gepflastert
  basaltPflaster(b, g, [[-7, 7, -198, -210, Y], [-8, 8, -378, -398, Y]], rnd, { R: 0.7, seam: 0x6a1a08, avoid: [[0, -204, 1.2], [0, -393, 1.4], [-4.6, -388, 1.8], [4.8, -393.8, 1.8], [-5.2, -199.2, 1.2], [5.2, -199.2, 1.2], [0, -390, 2]] });
  b.flush(level, { castShadow: false });
  g.flush(level, { material: 'glow', castShadow: false });
}

function setup(level) {
  // Burgkanone schweigt, sobald die Blockwand gesprengt ist (sonst drückten Explosionen den Knopf)
  const wand = level.named.get('turmwand');
  const kanone = level.named.get('kanone');
  level.onStep(() => { if (wand?.broken && kanone?.active) kanone.setActive(false); });
}

export const LEVEL = {
  id: '7-Burg',
  world: 7,
  title: 'Kampfwagen-Duell in der Glutfeste',
  archetype: 'boss',
  theme: 'lavacastle',
  music: 'course_keep',
  timeLimit: 500,
  start: { pos: [0, Y, 5], yaw: Math.PI / 2 },
  killY: -10,
  build,
  setup,
  instances: { lavablase: { shadowDist: 12 } },
  camera: [
    { from: 14, to: -6, pitch: 44, dist: 13.5, ahead: 2.4 },
    { from: -6, to: -50, pitch: 46, dist: 14, ahead: 2.6 },
    { from: -50, to: -74, pitch: 43, dist: 15.5, ahead: 2.2 },
    { from: -74, to: -124, pitch: 47, dist: 14, ahead: 2.6 },
    { from: -124, to: -170, pitch: 45, dist: 14, ahead: 2.6 },
    { from: -194, to: -366, pitch: 40, dist: 17, x: 0, xLock: 0.45, ahead: 1.2, lead: 0.4, height: 1.4 },
    { from: -372, to: -402, pitch: 42, dist: 12.5, ahead: 2 },
  ],
  boss: {
    id: 'baron', name: 'Baron Brummbär', speed: 0,
    trigger: { min: [-6, Y - 0.5, ZC - 5], max: [6, Y + 6, ZC - 1] },
    warp: 'warp_sieg', warpPos: [3.5, Y, ZE + 14], warpTo: [0, Y + 0.3, -383], frame: 0.5, center: [0, Y, ZC - 70],
    musicAfter: 'course_grass', warpBanner: 'Ab in die Warp-Box!',
  },
  segments: [
    { type: 'killplane', y: -10 },
    { type: 'lavaspiegel', id: 'burgsee', mode: 'fest', pos: [0, -3, -82], size: [84, 3, 204], low: LAVA },
    { type: 'lavaspiegel', id: 'strassensee', mode: 'fest', pos: [0, -4.5, -300], size: [90, RL + 4.5, 232], low: RL },
    // ================================================================ A Start, Wandsprung-Schacht (Stern 0)
    cast(-7, 7, 8, -6),
    cast(-12.4, -10.4, 0.6, -5.2, Y + 9.5),     // äußerer Mauerpfeiler (hoch)
    cast(-7.8, -7, -1.0, -5.2, Y + 7),          // innerer Mauerpfeiler (oben Stern 0)
    cast(-10.4, -7.8, 0.4, -4.4, Y - 1.4),      // Fels unten im Schacht (Absprung für die Wandsprünge)
    sign(3.8, Y, 4.8, 'Glutfeste', { yaw: -0.2 }),
    sign(-4.6, Y, 2.6, 'Wandsprung?', { size: [2.2, 0.8], yaw: 0.35 }),
    // ================================================================ B Vorhof
    cast(-1.4, 1.4, -6, -12),
    cast(-9, 9, -12, -28),
    cast(3.6, 6.6, -23, -26, Y + 1.6),           // Podest des zweiten Bumerang-Werfers
    cast(-2.3, -0.1, -29.1, -31.3), cast(0.1, 2.3, -31.5, -33.7),
    cast(-6, 6, -34, -46),
    cast(-1.4, 1.4, -46, -50),
    // ================================================================ C Zugbrücke
    cast(-10, 10, -50, -60),
    cast(6.6, 10.4, -60, -62),                   // Wachturm-Sockel im Graben
    { type: 'megawall', id: 'turmwand', pos: [8.5, Y, -54], size: [2, 3, 1], onBreak: { sfx: 'gate' } },
    sign(4.2, Y, -51, 'Kickbombe an die Wand!', { size: [3, 1], yaw: -0.3 }),
    cast(-4.6, -2.4, -63.0, -65.4, Y - 0.5),      // Trittstein im Graben (zum Wandsprung-Schacht vor der Brücke)
    { type: 'zugbruecke', id: 'bruecke', pos: [0, Y, -68], length: 8, width: 3.8, thick: 0.4, dir: [0, 1], state: 'oben', time: 2.5, style: 'holz' },
    cast(-12, 12, -68, -73),
    // ================================================================ D Wachbereich
    cast(-9, 9, -73, -92),
    cast(-3.6, 3.6, -92, -112),
    { type: 'klappstampfer', id: 'klapp1', pos: [-1.8, Y, -97], width: 3.4, length: 3.6, dir: [0, 1], spikes: true, damage: 'treffer', wait: 2.6, phase: 0 },
    { type: 'klappstampfer', id: 'klapp2', pos: [1.8, Y, -103], width: 3.4, length: 3.6, dir: [0, 1], spikes: true, damage: 'treffer', wait: 2.6, phase: 1.3 },
    { type: 'klappstampfer', id: 'klapp3', pos: [0, Y, -110], width: 7.2, length: 4, dir: [0, 1], spikes: false, damage: 'treffer', hole: [-0.8, 0.8, 1.2, 2.8], wait: 2.8, phase: 2.2, style: 'metall' },
    cast(-8, 8, -112, -124),
    // ================================================================ E Steg und Hammer-Bühne
    cast(-1.1, 1.1, -124, -150),
    cast(-8, 8, -150, -164),
    sign(-5.4, Y, -151, 'Hammer-Werfer', { yaw: 0.3 }),
    // ================================================================ F Bossstraße (Startplatz; die Straße ist eine Entität)
    cast(-7, 7, -198, -210, Y, { top: 'none' }),
    // ================================================================ G Ziel
    cast(-8, 8, -378, -398, Y, { top: 'none' }),
    { type: 'pennants', items: [
      { pos: [-7.4, Y, -379], color: 0xff4a3d, h: 4.4 }, { pos: [7.4, Y, -379], color: 0xffc21a, h: 4.4 },
      { pos: [-7.4, Y, -397], color: 0x3d8bff, h: 5 }, { pos: [7.4, Y, -397], color: 0x4fd04a, h: 5 },
    ] },
    { type: 'torches', h: 1.5, items: [[-2.6, Y, -380], [2.6, Y, -380]] },
    // Kulisse
    { type: 'deco_w7', items: [
      { kind: 'burgturm', pos: [-9.6, Y - 1.4, 7.2], height: 7, radius: 1.4 }, { kind: 'burgturm', pos: [9.6, Y - 1.4, 7.2], height: 7, radius: 1.4 },
      { kind: 'fackel', pos: [-5.8, Y, 6], mount: 'stand' }, { kind: 'fackel', pos: [5.8, Y, 6], mount: 'stand' },
      { kind: 'burgturm', pos: [-10.4, Y - 1.4, -13], height: 8, radius: 1.5 }, { kind: 'burgturm', pos: [10.4, Y - 1.4, -13], height: 8, radius: 1.5 },
      { kind: 'fahne', pos: [-8.2, Y, -26.6], height: 5 }, { kind: 'fahne', pos: [8.2, Y, -26.6], height: 5, color: 'lila' },
      { kind: 'knochen', pos: [-6.4, Y, -16], n: 4 },
      { kind: 'fackel', pos: [-4.8, Y, -45.2], mount: 'stand' }, { kind: 'fackel', pos: [4.8, Y, -45.2], mount: 'stand' },
      { kind: 'burgturm', pos: [-13, Y - 1, -70.5], height: 12, radius: 1.9 }, { kind: 'burgturm', pos: [13, Y - 1, -70.5], height: 12, radius: 1.9 },
      { kind: 'kette', pos: [-1.6, Y + 6.8, -68.6], length: 3.2 }, { kind: 'kette', pos: [1.6, Y + 6.8, -68.6], length: 3.2 },
      { kind: 'fackel', pos: [-8.6, Y + 1.6, -78], mount: 'wand', yaw: 0 }, { kind: 'fackel', pos: [8.6, Y + 1.6, -76], mount: 'wand', yaw: Math.PI },
      { kind: 'knochen', pos: [6.4, Y, -90.4], n: 3 },
      { kind: 'burgturm', pos: [-9.4, Y - 1.4, -122], height: 9, radius: 1.5 }, { kind: 'burgturm', pos: [9.4, Y - 1.4, -122], height: 9, radius: 1.5 },
      { kind: 'fackel', pos: [-7, Y, -152], mount: 'stand' }, { kind: 'fackel', pos: [7, Y, -152], mount: 'stand' },
      { kind: 'fahne', pos: [-6.6, Y, -200], height: 5 }, { kind: 'fahne', pos: [6.6, Y, -200], height: 5, color: 'lila' },
      { kind: 'fackel', pos: [-6.6, Y, -380], mount: 'stand' }, { kind: 'fackel', pos: [6.6, Y, -380], mount: 'stand' },
    ] },
    { type: 'deco_w7', shadow: false, items: [
      { kind: 'burgturm', pos: [-26, LAVA - 1, -30], height: 16, radius: 2.6 }, { kind: 'burgturm', pos: [27, LAVA - 1, -60], height: 18, radius: 2.8 },
      { kind: 'burgturm', pos: [-28, LAVA - 1, -110], height: 15, radius: 2.4 }, { kind: 'burgturm', pos: [26, LAVA - 1, -140], height: 17, radius: 2.6 },
      { kind: 'lavafall', pos: [-20, LAVA, -84], width: 4, height: 14, yaw: 0 }, { kind: 'lavafall', pos: [22, LAVA, -112], width: 3.6, height: 12, yaw: Math.PI },
      { kind: 'vulkanfelsen', pos: [-22, RL, -250], size: [8, 30], n: 5, max: 3 }, { kind: 'vulkanfelsen', pos: [22, RL, -300], size: [8, 30], n: 5, max: 3 },
      { kind: 'lavafall', pos: [-24, RL, -280], width: 5, height: 16, yaw: 0 }, { kind: 'lavafall', pos: [24, RL, -330], width: 5, height: 16, yaw: Math.PI },
    ] },
  ],
  blocks: [
    { kind: 'question', pos: [-3, Y + 2.2, 2.6], content: 'wachstumsbeere' },
    { kind: 'coinblock', pos: [3, Y + 2.2, 2.6], count: 6 },
    { kind: 'question', pos: [-3.4, Y + 2.2, -79], content: 'sichel' },
    { kind: 'hidden', pos: [6.4, Y + 2.5, -162], content: 'oneup' },
    { kind: 'coinblock', pos: [0, Y + 2.2, -116], count: 5 },
  ],
  enemies: [
    // Vorhof: Bumerang-Werfer (der erste trägt die goldene Wurfsichel)
    { kind: 'bumerang_werfer', id: 'bumerang1', pos: [-3, Y, -20], axis: [1, 0], pace: 1.4, sichel: true, sight: 13, interval: 2.4, first: 1.6, jumpEvery: 3.8 },
    { kind: 'bumerang_werfer', id: 'bumerang2', pos: [5.1, Y + 1.6, -24.5], axis: [1, 0], pace: 0.8, sight: 13, interval: 2.8, first: 2.6, jumpEvery: 4.4 },
    { kind: 'bumerang_werfer', id: 'bumerang3', pos: [0, Y, -41.4], axis: [1, 0], pace: 2.2, sight: 13, interval: 2.6, first: 2.2, jumpEvery: 4.0 },
    // Wachbereich: Feuer-Werfer auf der Brüstung und im zweiten Hof
    { kind: 'feuer_werfer', id: 'feuer1', pos: [-6.5, Y + 2.4, -88], axis: [1, 0], pace: 1.2, heights: [Y, Y + 2.4], sight: 14, interval: 2.8, first: 2.0, jumpEvery: 4.0 },
    { kind: 'feuer_werfer', id: 'feuer2', pos: [0, Y, -119], axis: [1, 0], pace: 2.4, sight: 14, interval: 2.6, first: 1.8, jumpEvery: 3.8 },
    // Hammer-Bühne: zwei Hammer-Werfer (beide besiegt → Warp-Box zum Boss)
    { kind: 'hammer_werfer', id: 'hammer1', pos: [-4.4, Y + 2.6, -158], axis: [1, 0], pace: 1.2, heights: [Y, Y + 2.6], sight: 16, interval: 2.8, first: 2.4, jumpEvery: 4.2 },
    { kind: 'hammer_werfer', id: 'hammer2', pos: [4.4, Y + 2.6, -158], axis: [1, 0], pace: 1.2, heights: [Y, Y + 2.6], sight: 16, interval: 3.0, first: 3.2, jumpEvery: 4.6 },
    // Lavablasen
    blase(-4.6, -8.2, { to: [4.6, -8.2], height: 3.2, period: 3.4 }), blase(4.6, -10, { to: [-4.6, -10], height: 3.2, period: 3.4, phase: 0.5 }),
    blase(-4.4, -31, { height: 3.6, period: 2.8 }), blase(4.4, -32.4, { height: 3.6, period: 2.8, phase: 0.5 }),
    blase(-7.6, -37, { to: [7.6, -40], height: 4.6, period: 4.2 }), blase(7.6, -43, { to: [-7.6, -41], height: 4.6, period: 4.2, phase: 0.5 }),
    blase(-3, -48, { height: 3, period: 3, phase: 0.25 }), blase(3, -48, { height: 3, period: 3, phase: 0.75 }),
    blase(-4.6, -129, { to: [4.6, -131], height: 3.4, period: 3.4 }), blase(4.6, -137, { to: [-4.6, -137], height: 3.4, period: 3.4, phase: 0.4 }),
    blase(-4.6, -144, { to: [4.6, -146], height: 3.4, period: 3.4, phase: 0.75 }),
    blase(12.6, -84.5, { height: 2.6, period: 2.6, color: 'rot' }),
    // Boss: Baron Brummbär im Kampfwagen
    { kind: 'baron_kampfwagen', id: 'baron', road: 'strasse', pos: [0, Y, ZC - 14] },
  ],
  items: [
    // Burgkanone auf dem Torhaus: Kickbomben vor den Wachturm (bis die Blockwand fällt)
    { kind: 'bomb_cannon', id: 'kanone', pos: [5.4, Y + 7, -70.2], aim: [8.5, Y, -51.6], interval: 5, first: 1.5, range: 26, flight: 1.3, spread: 0.3, max: 1, fuse: 6 },
    { kind: 'druckknopf', id: 'knopf', pos: [(TW.x0 + TW.x1) / 2, Y, -60.2], once: false, reset: 1.5, onPress: { toggle: 'bruecke' } },
    // Hammer-Werfer besiegt → Warp-Box zum Boss
    { kind: 'task', id: 'aufgabe_warp', area: { pos: [0, Y, -157], r: 10 }, ids: ['hammer1', 'hammer2'], reward: [{ reveal: 'warp_boss' }, { sfx: 'switch' }] },
    { kind: 'warpbox', id: 'warp_boss', pos: [0, Y, -161.4], target: [0, Y + 0.3, -201], hidden: true },
    // Boss-Straße und Siegerplateau
    {
      kind: 'kampfwagen_strasse', id: 'strasse', from: [0, Y, ZC], length: LEN, width: 12,
      gaps: [{ at: 26, width: 3 }, { at: 64, width: 2.6 }, { at: 104, width: 3 }],
      middle: [{ from: 76, to: 98, width: 2 }],
      traps: [{ at: 8, x: -3 }, { at: 15, x: 3 }, { at: 34, x: 0 }, { at: 46, x: -3.5 }, { at: 54, x: 3.5 }, { at: 71, x: 0 },
        { at: 84, x: -3.6 }, { at: 92, x: 3.6 }, { at: 113, x: -2.5 }, { at: 124, x: 2.5 }, { at: 134, x: 0 }],
    },
    { kind: 'warpbox', id: 'warp_sieg', pos: [3.5, Y, ZE + 14], target: [0, Y + 0.3, -383], hidden: true },
    { kind: 'rescue_friend', id: 'kruemel', pos: [-4.6, Y, -388], yaw: 0.5, name: 'Krümel' },
    // Münzen
    line([0, Y + 0.6, 1], [0, Y + 0.6, -5], 4),
    line([0, Y + 0.6, -7], [0, Y + 0.6, -11], 3),
    ring([-5, Y + 0.6, -16], 1.4, 6),
    ...arc([-1.2, Y + 0.6, -28.6], [1.2, Y + 0.6, -34.2], 4, 1.2),
    line([-3.6, Y + 0.6, -36], [3.6, Y + 0.6, -36], 4),
    line([0, Y + 0.6, -51], [0, Y + 0.6, -58], 4),
    ring([0, Y + 0.6, -84], 1.6, 8),
    line([0, Y + 0.6, -94], [0, Y + 0.6, -110], 6),
    line([0, Y + 0.6, -126], [0, Y + 0.6, -148], 7),
    ring([0, Y + 0.6, -156], 1.4, 6),
    ...arc([10, Y + 0.6, -84.5], [14, Y + 0.6, -84.5], 3, 0.2),
    ring([0, Y + 0.6, -204], 1.6, 6),
    ring([0, Y + 0.6, -386], 2.2, 8),
  ],
  checkpoint: [{ pos: [0, Y, -77], yaw: Math.PI / 2 }, { pos: [0, Y, -204], yaw: Math.PI / 2 }],
  stars: [
    [-7.55, Y + 7, -3.1],                // 0: oben auf dem inneren Mauerpfeiler (Wandsprung über der Lava)
    [0, Y + 8.1, -67.8],                 // 1: oben auf der hochgezogenen Zugbrücke
    [16.2, Y + 0.9, -84.5],              // 2: unter dem Gitter-Vordach über der Lava (Wurfsichel)
  ],
  stamp: [(TW.x0 + TW.x1) / 2, Y + 6.2, -59.2],
  goal: [0, Y, -393],
  marks: {
    start: [0, Y, 5], vorhof: [0, Y, -20], hof2: [0, Y, -40], ufer: [0, Y, -55], turm: [8.5, Y, -51], tor: [0, Y, -71],
    cp: [0, Y, -77], gang: [0, Y, -100], hof3: [0, Y, -118], steg: [0, Y, -137], buehne: [0, Y, -157],
    bossStart: [0, Y, -204], strasseEnde: [0, Y, ZE], ziel: [0, Y, -388],
  },
};
