// 7-7 „Ebbe und Glut im Brodelkrater“ (parcours, Bauplan 7-7: Lavasee mit steigender/sinkender Lava → Glasröhre zum
// Checkpoint → Fontänenfeld mit Gitterboden und großer blauer Quadratplattform → Drachenbucht mit Lavadrachen → Ziel; 400 s).
// Thema volcano, Musik course_volcano, 3 Sterne + Stempel. Level verläuft nach −Z, Inseln mit Oberseite y = 2.
//
// Abschnitte:
//   A Start          z  +8 …   −9   Basaltplateau im Krater, ?-Block mit Wurfsichel, Pegelmesser im Lavasee, Schilder
//   B Lavasee        z  −9 …  −97   der Spiegel steigt und sinkt im Takt (Ebbe 0,2 m, Flut 1,6 m; Vorwarnung: die Lava
//                                   brodelt und glüht, es grollt). Hohe Inseln (2 m) sind immer sicher, Hochsteine (1,85 m)
//                                   auch – die **Bimsstein-Trittsteine (1 m) nur bei Ebbe**. Platschfische springen über die
//                                   Wege (zwei endlos nachkommend), Knochenflieger kreisen, Bimsstein-Enten schaukeln auf
//                                   der Lava und zeigen den Pegel; ein Steinbogen führt von Insel 3 zu Insel 4
//   C Glasröhre      z −97 … −113   hoch über die Lava zum Kontrollpunkt
//   D Fontänenfeld   z −113 … −192  Gitterrost über der Stempel-Grube, großer Gitterboden mit heißen Fontänen, zwei
//                                   tragende Fontänen (Krustenplatten) hinauf auf die Basaltterrasse, Steg zur **großen
//                                   blauen Plattform**, die quer über das Lavabecken fährt, Anleger und Treppe hinab
//   E Drachenbucht   z −190 … −246  Zickzack-Weg durch die Lavabucht, acht Lavadrachen tauchen auf und speien Feuerbälle,
//                                   Vulkanfelsen als Deckung
//   F Ziel           z −245 … −262  Forscherhütte mit Thermometer, Zielmast
// Sterne: 0 **hoch über der Lava** neben Insel 1 (erster Platschfisch-Bereich) – nur mit der Wurfsichel (im Sprung werfen)
//         · 1 **Sternenring** auf Insel 4: acht Sternmünzen, drei davon über Bimssteinen (nur bei Ebbe) · 2 **von der blauen
//         Plattform nach Süden** auf einen Basaltsockel springen. Stempel: **unter dem Gitter nach dem Kontrollpunkt** – nur
//         bei Ebbe in der Grube (durch das Loch neben dem Gitter hinab; bei Flut füllt sich die Grube mit Lava).
// Extraleben: unsichtbarer Block auf Insel 3, Säule neben der östlichen Krustenplatte.
// Gegner: Knochenflieger 7, Platschfisch 7 (zwei davon endlos nachkommend), Lavadrache 8.

import { Rnd } from '../../blocks/kit.js';
import {
  isl, line, ring, arc, column, sign, krater77, bimsEnten, pegel, Bld, basaltPflaster, glutlilien, schwefel, drachenNest, forscherZelt, blauePlatte,
} from './_helpers_d.js';
import { steamVents } from '../w4/_helpers_c.js';

const Y = 2;            // Inseln, Wege
const LOW = 0.2;        // Lavasee bei Ebbe
const HIGH = 1.6;       // Lavasee bei Flut
const EB = 1.0;         // Bimsstein-Trittsteine (nur bei Ebbe)
const HS = 1.85;        // Hochsteine (immer über der Flut)
const FL = -0.3;        // Lava im Fontänenfeld und in der Drachenbucht (fest)
const PF = 0.0;         // Boden der Stempel-Grube
const TT = 4.5;         // Basaltterrasse, Steg, blaue Plattform, Anleger

const hi = (x0, x1, zA, zB, o = {}) => isl(x0, x1, zA, zB, Y, Y + 4, { top: 'rock', ...o });
const ebbe = (x, z, w = 2.4) => ({ type: 'island', pos: [x, -4, z], size: [w, EB + 4, w], top: 'rock', under: 0, topColor: 0xb8a8a0, sideColor: 0x6e605e });
const hoch = (x, z, w = 2.6) => ({ type: 'island', pos: [x, -4, z], size: [w, HS + 4, w], top: 'rock', under: 0, topColor: 0x7a6a6a, sideColor: 0x3e3032 });

// Lavasee-Inseln (für Pegelbänder): [x0, x1, zA, zB]
const SEE = [[-6, 6, 8, -9], [-5, 5, -16.6, -26], [-7, 3, -36.2, -45.6], [2, 12, -54.2, -64], [-6, 10, -70, -80], [-6, 6, -89.2, -97]];
const EBBE = [[0.4, -28.2], [-0.6, -31.2], [0.5, -34.2], [1.2, -47.4], [3.6, -50], [6, -52.6], [-8.4, -72.4], [-8.4, -75.4], [-8.4, -78.4], [-0.8, -81.6], [0.8, -84.6], [-0.8, -87.6]];
const HOCH = [[0, -11], [0, -14.6]];
// Basaltsäulen-Zaun an der Nordkante der Terrasse und am Steg (Kollision in build)
const ZAUN = [];
for (let x = -6.2; x <= 7.6; x += 1.0) ZAUN.push([x, -165.6, TT, 0.9 + (((Math.round(x * 3) % 3) + 3) % 3) * 0.25]);
for (let z = -166.6; z >= -173.6; z -= 1.0) ZAUN.push([-6.6, z, TT, 0.9 + (((Math.round(z * 3) % 3) + 3) % 3) * 0.2]);
// Pflaster (Sechseck-Basalt) auf allen festen Inseln: [x0, x1, zA, zB, y]
const PFLASTER = [
  ...SEE.map(([x0, x1, zA, zB]) => [x0, x1, zA, zB, Y]), [5.2, 7.8, -64, -70, Y],
  [-7, 7, -112.6, -121.6, Y], [-7.4, 7.4, -129.6, -134, Y], [-7.4, -6, -121.6, -129.6, Y], [6, 7.4, -121.6, -129.6, Y],
  [-10.4, 8, -157, -166, TT], [-10.4, -7, -166, -174.4, TT], [6.4, 12, -181.6, -190, TT],
  [5, 12, -195.2, -206, Y], [0, 7, -205, -219, Y], [-5, 2, -218, -232, Y], [-3, 3, -231, -246, Y], [-8, 8, -245, -262, Y],
];

function build(level) {
  // Gitterroste: Kamera sieht hindurch (Stempel unter dem Gitter)
  level.world.forEach((s) => { if (s.tag === 'gitterboden') s.camIgnore = true; });
  const rnd = new Rnd(7717);
  const b = new Bld(), g = new Bld();
  basaltPflaster(b, g, PFLASTER, rnd, { avoid: [[-2.6, -2.6, 1.2], [2.6, -2.6, 1.2], [-3, -22.6, 1.2], [-3.6, -115.6, 1.2], [-2.4, -161.4, 1.2], [0, -256, 1.4], [-4.6, -257.6, 1.9], [0, -117.4, 1.2]] });
  glutlilien(b, g, [[4.8, Y, 6.8, 5], [-5.2, Y, -1, 4], [3.8, Y, -25, 4], [-6.2, Y, -37.2, 3], [11, Y, -55.4, 4], [-5, Y, -79, 4], [9, Y, -79, 3], [5, Y, -95.8, 4],
    [-6.4, Y, -113.4, 3], [6.6, TT, -158, 4], [11, TT, -189, 3], [11.2, Y, -205, 4], [0.8, Y, -218.4, 3], [-4.4, Y, -233, 3], [2.4, Y, -245, 4], [6.6, Y, -247, 5], [-6.8, Y, -248.6, 4]], rnd);
  schwefel(b, g, [[-4.2, Y, 2.4, 0.9], [3.4, Y, -43.6, 0.8], [9.6, Y, -60.6, 0.9], [-4.4, Y, -96, 0.7], [5.4, Y, -119.6, 0.8], [5.2, TT, -163, 0.9], [-1.2, Y, -228.6, 0.8], [5.4, Y, -258.8, 0.9]], rnd);
  drachenNest(b, g, [[10.6, Y, -202.6], [-3.6, Y, -221.4]], rnd);
  forscherZelt(b, g, -3.6, Y, 5.4, 0.2);
  b.flush(level, { castShadow: false });
  g.flush(level, { material: 'glow', castShadow: false });
  for (const [x, z, y, h] of ZAUN) level.world.add({ type: 'cyl', x, z, r: 0.42, y0: y, y1: y + h, tag: 'basaltzaun' });
  krater77(level, {
    Y, LOW, HIGH, flut: SEE,
    ebbe: EBBE.map(([x, z]) => [x, z, EB, 2.4]), hoch: HOCH.map(([x, z]) => [x, z, HS, 2.6]),
    grube: { x0: -6, x1: 6, z0: -121.6, z1: -129.6, hole: [3.4, 6], floor: PF },
    saeulen: ZAUN, huette: [-4.6, Y, -257.6],
  });
}

function setup(level) {
  bimsEnten(level, [[-11, -6, 0.4], [12.5, -22, 2.4], [-12, -40, 1.2], [15.5, -46, 3], [-13.5, -64, 0.2], [16, -82, 2], [-11.5, -92, 1.6], [9.5, 1, 2.6]], 'see');
  pegel(level, -6.8, -12.2, 'see', { LOW, HIGH });
  blauePlatte(level, 'blau', { size: [6, 0.5, 6] });
  // Dampf aus den Schwefelschloten
  steamVents(level, [[-4.2, Y + 0.4, 2.4], [3.4, Y + 0.4, -43.6], [9.6, Y + 0.4, -60.6], [-4.4, Y + 0.4, -96], [5.4, Y + 0.4, -119.6], [5.2, TT + 0.4, -163], [-1.2, Y + 0.4, -228.6], [5.4, Y + 0.4, -258.8]], { per: 5, size: 2.0, color: 0xe8dcc8 });
}

export const LEVEL = {
  id: '7-7',
  world: 7,
  title: 'Ebbe und Glut im Brodelkrater',
  archetype: 'parcours',
  theme: 'volcano',
  music: 'course_volcano',
  timeLimit: 400,
  start: { pos: [0, Y, 5], yaw: Math.PI / 2 },
  killY: -10,
  build,
  setup,
  // Budget: Sonnenschatten nur nahe der Heldin; Lavadrachen (tauchen erst ab 14 m auf) weiter als 24 m nicht zeichnen
  instances: { knochenflieger: { shadowDist: 14 }, platschfisch: { shadowDist: 12, farHide: 40 }, lavadrache: { shadowDist: 14, farHide: 24 } },
  camera: [
    { from: 14, to: -8, pitch: 44, dist: 13, ahead: 2.4 },
    { from: -8, to: -98, pitch: 47, dist: 14, ahead: 2.6 },
    { from: -98, to: -112, pitch: 44, dist: 14, ahead: 2.2 },
    { from: -112, to: -152, pitch: 48, dist: 14, ahead: 2.4 },
    { from: -152, to: -168, pitch: 46, dist: 14, ahead: 2.4 },
    { from: -168, to: -192, pitch: 44, dist: 16, x: 0, xLock: 0.3, ahead: 1.6 },
    { from: -192, to: -246, pitch: 45, dist: 14, ahead: 2.6 },
    { from: -246, to: -266, pitch: 42, dist: 13, ahead: 2 },
  ],
  segments: [
    { type: 'killplane', y: -10 },
    // ================================================================ A/B Lavasee mit Ebbe und Flut
    { type: 'lavaspiegel', id: 'see', mode: 'zyklus', pos: [0, -4, -42.5], size: [64, 4.2, 113], low: LOW, high: HIGH, wait: 4.5, warn: 1.5, rise: 2.5, hold: 3, fall: 2.5 },
    hi(-6, 6, 8, -9),                       // Start
    hoch(0, -11), hoch(0, -14.6),           // Hochsteine (Einführung: die Flut bleibt darunter)
    hi(-5, 5, -16.6, -26),                  // Insel 1 (Platschfische, Stern 0)
    isl(3.6, 4.8, -20.8, -22, Y + 1.5, 1.5, { top: 'rock', topColor: 0xb08a5a }),   // Wurf-Podest am Rand von Insel 1
    ...EBBE.slice(0, 3).map(([x, z]) => ebbe(x, z)),
    hi(-7, 3, -36.2, -45.6),                // Insel 2
    ...EBBE.slice(3, 6).map(([x, z]) => ebbe(x, z)),
    hi(2, 12, -54.2, -64),                  // Insel 3
    hi(5.2, 7.8, -64, -70, { size: [2.6, 1.4, 6], pos: [6.5, Y - 1.4, -67] }),   // Steinbogen
    hi(-6, 10, -70, -80),                   // Insel 4 (Sternenring)
    ...EBBE.slice(6).map(([x, z]) => ebbe(x, z)),
    hi(-6, 6, -89.2, -97),                  // Insel 5 (Glasröhre)
    sign(3.6, Y, 4.2, 'Brodelkrater', { yaw: -0.2 }),
    sign(-3.6, Y, -6.8, 'Bimssteine nur bei Ebbe!', { size: [3, 1], yaw: 0.2 }),
    sign(3.8, Y, -18.4, 'Wurfsichel!', { yaw: -0.5 }),
    // ================================================================ C Glasröhre zum Kontrollpunkt
    { type: 'glasspipe', id: 'roehre', path: [[0, Y + 1, -96.4], [0, Y + 1.6, -99.6], [0, Y + 4.4, -104], [0, Y + 4.4, -108.6], [0, Y + 1.2, -113.2]], radius: 1, oneWay: true, coins: 6, exitSpeed: 6 },
    // ================================================================ D Fontänenfeld
    { type: 'lavaspiegel', id: 'feld', mode: 'fest', pos: [0, -3, -180], size: [64, FL + 3, 162], low: FL },
    isl(-7, 7, -112.6, -121.6, Y, Y + 3, { top: 'rock' }),                  // Kontrollpunkt
    // Stempel-Grube unter dem Gitter: Boden, Ränder, eigene Lava (Ebbe/Flut), Gitter mit Loch daneben
    isl(-6, 6, -121.6, -129.6, PF, 2, { top: 'rock', topColor: 0x5a4446 }),
    isl(-7.4, -6, -121.6, -129.6, Y, Y + 3, { top: 'rock' }),
    isl(6, 7.4, -121.6, -129.6, Y, Y + 3, { top: 'rock' }),
    { type: 'lavaspiegel', id: 'grube', mode: 'zyklus', pos: [0, -2.4, -125.6], size: [12, 1.6, 8], low: -0.8, high: 1.4, wait: 5, warn: 1.5, rise: 2, hold: 3, fall: 2, phase: 3 },
    { type: 'gitterboden', id: 'gitter1', pos: [-1.3, Y - 0.2, -125.6], size: [9.4, 8], thick: 0.2, style: 'eisen' },
    isl(-7.4, 7.4, -129.6, -134, Y, Y + 3, { top: 'rock' }),
    // großer Gitterboden mit heißen Fontänen
    { type: 'gitterboden', id: 'gitter2', pos: [0, Y - 0.2, -142], size: [16, 16], thick: 0.2, style: 'rost' },
    { type: 'lava_fontaene', id: 'heiss1', pos: [-3.6, FL, -138], height: 4.6, radius: 0.7, mode: 'heiss', wait: 2.8, warn: 1.1, hold: 1.4, phase: 0 },
    { type: 'lava_fontaene', id: 'heiss2', pos: [3.6, FL, -141.2], height: 4.6, radius: 0.7, mode: 'heiss', wait: 2.8, warn: 1.1, hold: 1.4, phase: 1.1 },
    { type: 'lava_fontaene', id: 'heiss3', pos: [-3.6, FL, -144.6], height: 4.6, radius: 0.7, mode: 'heiss', wait: 2.8, warn: 1.1, hold: 1.4, phase: 2.2 },
    { type: 'lava_fontaene', id: 'heiss4', pos: [3.6, FL, -147.8], height: 4.6, radius: 0.7, mode: 'heiss', wait: 2.8, warn: 1.1, hold: 1.4, phase: 3.3 },
    // tragende Fontänen (Krustenplatten) hinauf auf die Basaltterrasse
    { type: 'lava_fontaene', id: 'platte1', pos: [-3, FL, -155], height: 4.75, mode: 'tragen', plate: 2.6, wait: 3.2, warn: 0.9, rise: 1.1, hold: 3.0, fall: 1.3, phase: 0 },
    { type: 'lava_fontaene', id: 'platte2', pos: [3, FL, -155], height: 4.75, mode: 'tragen', plate: 2.6, wait: 3.2, warn: 0.9, rise: 1.1, hold: 3.0, fall: 1.3, phase: 4.3 },
    isl(5.6, 7.2, -154.2, -155.8, 4.9, 6.2, { top: 'rock' }),               // Säule mit Extraleben
    isl(-10.4, 8, -157, -166, TT, TT + 4, { top: 'rock' }),                 // Basaltterrasse
    isl(-10.4, -7, -166, -174.4, TT, TT + 4, { top: 'rock' }),              // Steg zur blauen Plattform
    // große blaue Quadratplattform quer über das Lavabecken
    { type: 'mover', id: 'blau', path: [[-8.6, TT - 0.5, -178], [8.6, TT - 0.5, -178]], size: [6, 0.5, 6], speed: 2.2, wait: 1.4, color: 'blue' },
    isl(-1.4, 1.4, -171.4, -173.8, 4.0, 5.4, { top: 'rock' }),             // Sockel südlich der Bahn (Stern 2)
    isl(6.4, 12, -181.6, -190, TT, TT + 4, { top: 'rock' }),                // Anleger
    { type: 'lava_fontaene', id: 'heiss5', pos: [-4.2, FL, -185.6], height: 5.6, radius: 0.8, mode: 'heiss', wait: 2.4, hold: 1.6, phase: 0.3 },
    { type: 'lava_fontaene', id: 'heiss6', pos: [2.4, FL, -187.4], height: 6.4, radius: 0.9, mode: 'heiss', wait: 2.6, hold: 1.6, phase: 1.5 },
    { type: 'lava_fontaene', id: 'heiss7', pos: [-13.6, FL, -170], height: 7, radius: 0.9, mode: 'heiss', wait: 3.2, hold: 1.8, phase: 0.8 },
    { type: 'lava_fontaene', id: 'heiss8', pos: [14.6, FL, -172], height: 7.4, radius: 0.9, mode: 'heiss', wait: 3.0, hold: 1.8, phase: 2.1 },
    sign(-8.6, TT, -160.4, 'Blaue Plattform', { yaw: 0.3 }),
    // ================================================================ E Drachenbucht
    { type: 'stairs', pos: [9.2, Y, -195], dir: '+z', steps: 10, rise: 0.25, run: 0.5, width: 4.2, style: 'stone' },
    hi(5, 12, -190, -206), hi(0, 7, -205, -219), hi(-5, 2, -218, -232), hi(-3, 3, -231, -246),
    sign(4.2, Y, -197.8, 'Drachenbucht', { yaw: 0.4 }),
    // ================================================================ F Ziel
    hi(-8, 8, -245, -262),
    // Kulisse
    { type: 'deco_w7', items: [
      { kind: 'basaltsaeulen', pos: [-4.6, Y, 6.4], size: [2, 2], n: 3, height: [0.8, 2.2] },
      { kind: 'vulkanfelsen', pos: [4.6, Y, -2], size: [2, 3], n: 2, max: 1.2 },
      { kind: 'glutriss', pos: [1.6, Y, 0.4], length: 2.6, yaw: 0.5 },
      { kind: 'knochen', pos: [-3.6, Y, -23.6], n: 4 },
      { kind: 'basaltsaeulen', pos: [-5.8, Y, -41], size: [2, 3], n: 3, height: [0.6, 1.8] },
      { kind: 'glutriss', pos: [6.6, Y, -58], length: 3, yaw: -0.4 },
      { kind: 'vulkanfelsen', pos: [10.4, Y, -57.2], size: [1.6, 2], n: 2, max: 1.2 },
      { kind: 'glutriss', pos: [-2.6, Y, -76.6], length: 2.4, yaw: 1.2 },
      { kind: 'basaltsaeulen', pos: [-4.6, Y, -94.6], size: [2, 2], n: 3, height: [0.6, 1.6] },
      { kind: 'fackel', pos: [-5.8, Y, -113.6], mount: 'stand' }, { kind: 'fackel', pos: [5.8, Y, -113.6], mount: 'stand' },
      { kind: 'knochen', pos: [-4.4, PF, -127.6], n: 3 },
      { kind: 'basaltsaeule', pos: [-7.6, FL, -134.6], height: 2.1 }, { kind: 'basaltsaeule', pos: [7.6, FL, -134.6], height: 2.1 },
      { kind: 'basaltsaeule', pos: [-7.6, FL, -149.4], height: 2.1 }, { kind: 'basaltsaeule', pos: [7.6, FL, -149.4], height: 2.1 },
      { kind: 'basaltsaeule', pos: [0, FL, -149.4], height: 2.1 },
      { kind: 'vulkanfels', pos: [-8.6, TT, -158.4], size: 1.2 }, { kind: 'glutriss', pos: [2, TT, -161.6], length: 3, yaw: 0.3 },
      { kind: 'vulkanfels', pos: [11, Y, -198.4], size: 1.4, solid: true }, { kind: 'vulkanfels', pos: [5.8, Y, -203], size: 1.3, solid: true },
      { kind: 'vulkanfels', pos: [6.2, Y, -213.2], size: 1.4, solid: true }, { kind: 'vulkanfels', pos: [0.8, Y, -216.2], size: 1.2, solid: true },
      { kind: 'vulkanfels', pos: [1.2, Y, -224.4], size: 1.4, solid: true }, { kind: 'vulkanfels', pos: [-4.2, Y, -229.2], size: 1.3, solid: true },
      { kind: 'vulkanfels', pos: [2.4, Y, -238.2], size: 1.3, solid: true }, { kind: 'vulkanfels', pos: [-2.4, Y, -242.6], size: 1.2, solid: true },
      { kind: 'knochen', pos: [-2.2, Y, -226], n: 5 },
      { kind: 'basaltsaeulen', pos: [5.4, Y, -251], size: [3, 3], n: 4, height: [0.8, 2.4] },
    ] },
    { type: 'deco_w7', shadow: false, items: [
      { kind: 'basaltsaeulen', pos: [-22, LOW - 0.4, -24], n: 6, height: [2, 6] }, { kind: 'basaltsaeulen', pos: [23, LOW - 0.4, -60], n: 6, height: [2, 7] },
      { kind: 'basaltsaeulen', pos: [-20, LOW - 0.4, -86], n: 5, height: [2, 5] }, { kind: 'basaltsaeulen', pos: [21, FL, -140], n: 6, height: [2, 6] },
      { kind: 'basaltsaeulen', pos: [-21, FL, -200], n: 6, height: [3, 8] }, { kind: 'basaltsaeulen', pos: [22, FL, -232], n: 6, height: [2, 6] },
      { kind: 'vulkanfelsen', pos: [-24, LOW - 0.4, -50], size: [6, 10], n: 4, max: 3 }, { kind: 'vulkanfelsen', pos: [24, FL, -120], size: [6, 10], n: 4, max: 3 },
      { kind: 'vulkanfelsen', pos: [-24, FL, -160], size: [6, 10], n: 4, max: 3 }, { kind: 'vulkanfelsen', pos: [20, FL, -255], size: [6, 10], n: 3, max: 3 },
      { kind: 'lavafall', pos: [-30, -2, -70], width: 5, height: 14, yaw: 0 }, { kind: 'lavafall', pos: [30, -2, -110], width: 4, height: 12, yaw: Math.PI },
      { kind: 'lavafall', pos: [-30, -2, -190], width: 5, height: 16, yaw: 0 },
    ] },
  ],
  blocks: [
    { kind: 'question', pos: [-2.6, Y + 2.2, -2.6], content: 'sichel' },
    { kind: 'coinblock', pos: [2.6, Y + 2.2, -2.6], count: 6 },
    { kind: 'question', pos: [-3, Y + 2.2, -22.6], content: 'sichel' },
    { kind: 'hidden', pos: [4.6, Y + 2.5, -61.6], content: 'oneup' },
    { kind: 'question', pos: [-3.6, Y + 2.2, -115.6], content: 'wachstumsbeere' },
    { kind: 'question', pos: [-2.4, TT + 2.2, -161.4], content: 'sichel' },
  ],
  enemies: [
    // ---- Lavasee: Platschfische (P3/P6 endlos nachkommend), Knochenflieger
    { kind: 'platschfisch', id: 'fisch1', pos: [7.6, LOW, -18.4], dir: [0, -1], dist: 5.6, spit: 3 },
    { kind: 'platschfisch', id: 'fisch2', pos: [-7.6, LOW, -18.4], dir: [0, -1], dist: 5.6, phase: 0.5 },
    { kind: 'platschfisch', id: 'fisch3', pos: [-7.4, LOW, -50], dir: [1, 0], dist: 3.2, spawner: { every: 2.8, max: 3, hops: 5, range: 24 } },
    { kind: 'platschfisch', id: 'fisch4', pos: [15, LOW, -56], dir: [0, -1], dist: 6, phase: 0.3, spit: 2 },
    { kind: 'platschfisch', id: 'fisch5', pos: [-9.6, LOW, -64.6], dir: [1, 0], dist: 5, phase: 0.7 },
    { kind: 'platschfisch', id: 'fisch6', pos: [11.4, LOW, -84.6], dir: [-1, 0], dist: 3, spawner: { every: 3.0, max: 3, hops: 6, range: 24 } },
    { kind: 'platschfisch', id: 'fisch7', pos: [-10, LOW, -90.4], dir: [0, -1], dist: 4.4, phase: 0.2 },
    { kind: 'knochenflieger', id: 'vogel1', center: [-2, Y + 4.6, -41], radius: 3, phase: 0 },
    { kind: 'knochenflieger', id: 'vogel2', center: [7, Y + 4.6, -59], radius: 3, phase: 0.5 },
    { kind: 'knochenflieger', id: 'vogel3', center: [0, Y + 4.6, -93], radius: 2.6, phase: 0.2 },
    // ---- Fontänenfeld
    { kind: 'knochenflieger', id: 'vogel4', center: [0, TT + 4.4, -161.5], radius: 3, phase: 0.6 },
    { kind: 'knochenflieger', id: 'vogel5', center: [0, TT + 5, -178], radius: 4.6, phase: 0.1, cooldown: 2.6 },
    // ---- Drachenbucht: acht Lavadrachen (je zwei Auftauchstellen), zwei Knochenflieger
    { kind: 'lavadrache', id: 'drache1', spots: [[16.4, FL, -195], [16, FL, -201]], sight: 14, phase: 0 },
    { kind: 'lavadrache', id: 'drache2', spots: [[0.8, FL, -194.6], [0.4, FL, -199.6]], sight: 14, phase: 0.4 },
    { kind: 'lavadrache', id: 'drache3', spots: [[11.4, FL, -209], [12, FL, -215]], sight: 14, phase: 0.2 },
    { kind: 'lavadrache', id: 'drache4', spots: [[-4.4, FL, -207], [-4.2, FL, -212.4]], sight: 14, phase: 0.6 },
    { kind: 'lavadrache', id: 'drache5', spots: [[6.4, FL, -222], [7, FL, -228]], sight: 14, phase: 0.1 },
    { kind: 'lavadrache', id: 'drache6', spots: [[-9.8, FL, -221], [-9.6, FL, -228]], sight: 14, phase: 0.5 },
    { kind: 'lavadrache', id: 'drache7', spots: [[7.4, FL, -235], [8, FL, -241]], sight: 14, phase: 0.3 },
    { kind: 'lavadrache', id: 'drache8', spots: [[-7.4, FL, -235.4], [-8, FL, -241]], sight: 14, phase: 0.7 },
    { kind: 'knochenflieger', id: 'vogel6', center: [3.6, Y + 4.6, -212], radius: 2.6, phase: 0.3 },
    { kind: 'knochenflieger', id: 'vogel7', center: [0, Y + 4.6, -239], radius: 2.4, phase: 0.8 },
  ],
  items: [
    // Sternenring (Stern 1) auf Insel 4: fünf Münzen auf der Insel, drei über den Bimssteinen (nur bei Ebbe erreichbar)
    { kind: 'starring', id: 'sternring', pos: [3.4, Y, -73.4], yaw: Math.PI / 2, time: 14, star: 1, coins: [
      [8.6, Y + 0.6, -71.6], [8.6, Y + 0.6, -78.4], [2.4, Y + 0.6, -78.4], [-3.6, Y + 2.6, -75], [-8.4, EB + 0.6, -78.4], [-8.4, EB + 0.6, -75.4], [-8.4, EB + 0.6, -72.4], [-2, Y + 0.6, -71.6],
    ] },
    // Münzen: Bitcoin-Pfade über die Steine, Bogen zum Stern 0, Ringe
    line([0, Y + 0.6, 2.6], [0, Y + 0.6, -6.4], 4),
    ...arc([0, HS + 0.6, -11], [0, HS + 0.6, -14.6], 3, 0.6),
    ...arc([6.2, Y + 3.4, -21.4], [10, Y + 6, -21.4], 3, 0.5),
    ...EBBE.slice(0, 3).map(([x, z]) => ({ kind: 'coin', pos: [x, EB + 0.6, z] })),
    ring([-2, Y + 0.6, -41], 1.6, 6),
    ...EBBE.slice(3, 6).map(([x, z]) => ({ kind: 'coin', pos: [x, EB + 0.6, z] })),
    line([6.5, Y + 0.6, -64.6], [6.5, Y + 0.6, -69.4], 3),
    ...EBBE.slice(9).map(([x, z]) => ({ kind: 'coin', pos: [x, EB + 0.6, z] })),
    ring([0, Y + 0.6, -93], 1.4, 6),
    line([-5, Y + 0.6, -138], [5, Y + 0.6, -138], 5),
    line([-5, Y + 0.6, -146], [5, Y + 0.6, -146], 5),
    column(-3, -155, 1.2, 4, 3),
    ring([-2, TT + 0.6, -162], 1.4, 6),
    line([-8.6, TT + 0.6, -167], [-8.6, TT + 0.6, -173], 4),
    line([-6, TT + 1.2, -178], [6, TT + 1.2, -178], 7),
    line([9.2, TT + 0.6, -183], [9.2, TT + 0.6, -189], 3),
    line([8.5, Y + 0.6, -199], [8.5, Y + 0.6, -205], 3),
    line([3.5, Y + 0.6, -209], [3.5, Y + 0.6, -217], 4),
    line([-1.5, Y + 0.6, -221], [-1.5, Y + 0.6, -230], 4),
    line([0, Y + 0.6, -233], [0, Y + 0.6, -243], 4),
    { kind: 'powerup', id: 'leben_saeule', pos: [6.4, 4.9, -155], power: 'oneup', speed: 0 },
  ],
  checkpoint: { pos: [0, Y, -117.4], yaw: Math.PI / 2 },
  stars: [
    [12, Y + 5.4, -21.4],                                            // 0: hoch über der Lava (vom Wurf-Podest im Sprung die Wurfsichel werfen)
    { pos: [3.4, Y + 0.4, -76], hidden: true, id: 'stern_ring' },    // 1: Sternenring auf Insel 4
    [0, 4.0 + 0.4, -172.6],                                          // 2: Sockel südlich der blauen Plattform
  ],
  stamp: [-3.8, PF, -125.6],
  goal: [0, Y, -256],
  marks: {
    start: [0, Y, 5], insel1: [0, Y, -21], insel2: [-2, Y, -41], insel3: [7, Y, -59], insel4: [2, Y, -75], insel5: [0, Y, -93],
    cp: [0, Y, -117.4], gitter: [0, Y, -142], terrasse: [0, TT, -161], blau: [0, TT, -178], bucht: [3.5, Y, -212], ziel: [0, Y, -253],
  },
};
