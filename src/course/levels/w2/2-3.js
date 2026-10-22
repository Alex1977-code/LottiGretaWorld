// 2-3 „Scherenschnittkeller“ – unterirdisches Schattentheater (Bauplan: Detail 2-3). Warmes Laternenlicht,
// Puppentheater-Anmutung: rote Vorhänge, Rampenlichter, Leinwände, auf denen die Schatten mitspielen.
// Level verläuft nach −Z; die große Bühne (Abschnitt 4) läuft quer nach +X (2D-Ansicht frontal auf die Leinwand).
//
// Abschnitte:
//   1  Foyer             z   8 … −24  (x −10 … 10) Leinwand links hinten: drei Bühnenkisten und der Schatten eines
//                                      Sterns, den man sonst nicht sieht (Stern 0). Wuschel, Schnappblumen, Mini-
//                                      Pilzlinge, ?-Block mit Funkenblüte. Krümel winkt am Eingang und hoppelt voraus.
//   2  Fahrplattformen   z −24 … −57  Schlucht mit drei fahrenden Plattformen und einer Felsinsel (Lücken 2–4 m),
//                                      Feuer-Schnappblumen auf Seitensimsen, Wuschel kreist um die Insel.
//   3  Checkpoint        z −57 … −72  Fahne, Topfpflanze zum Tragen (frisst Gegner und die Münzen im Käfig),
//                                      ?-Block mit Krallen-Anzug; Gang in die Seitenbühne (z −72 … −85).
//   4  Schattenbühne     x −4 … 66 bei z −85 … −90 (Leinwand 70 × 9 m): Steuern über die Schatten – Wege aus
//                                      unsichtbaren Platten, Wuschel auf Bahnen, Riesenschnappblume, Feuer-Schnappblume
//                                      auf der Konsole, Münzen und Extraleben in unsichtbaren Blöcken (nur ihr Schatten
//                                      verrät sie).
//                                      Unter der Bühne (Falltür links der Riesenschnappblume) Kisten → Stempel.
//                                      Schattenstufen hinauf aufs Podest, Tür → hinter die Kulissen.
//   5  Hinter den Kulissen  x ≈ 112, z −18 … −74: Rätselbox, Gasse mit Lauerblöcken, Fahrplattformen über dem
//                                      Schacht, Ausgangstür. Davor eine Lücke hinter dem Vorhang (links): Krümel zittert
//                                      vor der Holz-Silhouette des Barons – umwerfen → Krümel schenkt Stern 2.
//   6  Ausgang/Ziel      x ≈ 112, z −75 … −105: Höhlenausgang, Zielmast.
//   Abseits: Rätselbox-Raum (x ≈ 190): Lauerblock-Gasse, Druckfeld → unsichtbare Treppe und Stern 1 erscheinen als
//            Schatten auf der Leinwand.
//   Lage: Kulissen, Ziel und Rätselbox-Raum liegen seitlich bzw. „hinter“ der Bühnenkamera (die Türen teleportieren),
//   damit die flache Bühnenkamera sie nicht mitzeichnet.
// Sterne (Index): 0 Schattenstern im Foyer, 1 Rätselbox (Druckfeld, Schatten), 2 Krümel hinter der Silhouette.
// Stempel: unter der Bühne hinter zwei Kisten (Funkenblüte oder Krallen-Anzug).

import {
  isl, line, ring, arc, column, deco, decoW1, hook, Kruemel, shadowStars, cullShadowWalls, curtain, valance, footlights, carpet, bake,
  prop,
} from './_helpers_b.js';

const Y = 1;            // Foyer, Hinter den Kulissen, Ziel
const YC = 2.5;         // Checkpoint, Bühne
const ZB = -90;         // Leinwand der Bühne (Vorderseite)
const ROCK = 0x6e4a38, ROCK2 = 0x5a3c30;
const CAM = { pitch: 44, dist: 13, fov: 40 };

/** Felswand (zerklüftet, fest) über ihre Grundfläche. */
const rock = (x0, x1, zA, zB, y0, y1, o = {}) => ({
  kind: 'rockwall', pos: [(x0 + x1) / 2, y0, (zA + zB) / 2], size: [x1 - x0, y1 - y0, Math.abs(zA - zB)], color: o.color ?? ROCK, ...o,
});
/** Bühnenboden (Holzbohlen) x0..x1 über die ganze Bühnentiefe. */
const boards = (x0, x1, top = YC, z0 = -85, z1 = ZB) => ({ type: 'platform', style: 'wood', pos: [(x0 + x1) / 2, top - 1, (z0 + z1) / 2], size: [x1 - x0, 1, Math.abs(z0 - z1)] });
/** Unsichtbare Platte (nur Schatten) über die Bühnentiefe: Mitte x, Breite w, Oberkante top. */
const sp = (x, w, top, h = 0.4, z0 = -85, z1 = ZB) => ({ pos: [x, top - h, (z0 + z1) / 2], size: [w, h, Math.abs(z0 - z1)] });

// Lauerblock-Gasse: Wand mit Öffnungen (Blockgröße 1 m) – hintere Schicht voll, vordere mit Öffnungen + Sturz.
function lauerWall(xFace, side, zFrom, zTo, holes, h = 2.4) {
  // side −1: Wand liegt links (x < xFace), Blöcke stoßen nach +X; side +1: rechts, stoßen nach −X
  const out = [];
  const xb0 = side < 0 ? xFace - 2 : xFace + 1, xb1 = side < 0 ? xFace - 1 : xFace + 2;
  const xf0 = side < 0 ? xFace - 1 : xFace, xf1 = side < 0 ? xFace : xFace + 1;
  out.push({ type: 'wall', pos: [(xb0 + xb1) / 2, Y, (zFrom + zTo) / 2], size: [1, h, Math.abs(zFrom - zTo)] });
  const zs = [...holes].sort((a, b) => b - a);
  let z = zFrom;
  for (const hz of zs) {
    const a = hz + 0.5, b = hz - 0.5;
    if (z > a + 0.01) out.push({ type: 'wall', pos: [(xf0 + xf1) / 2, Y, (z + a) / 2], size: [1, h, z - a] });
    out.push({ type: 'wall', pos: [(xf0 + xf1) / 2, Y + 1, hz], size: [1, h - 1, 1] });
    z = b;
  }
  if (z > zTo + 0.01) out.push({ type: 'wall', pos: [(xf0 + xf1) / 2, Y, (z + zTo) / 2], size: [1, h, z - zTo] });
  return out;
}

// ------------------------------------------------------------------ Szene (Aufbau-Haken)
function scene(level) {
  // Krümel winkt im Foyer und hoppelt voraus; hinter dem Vorhang zittert er vor dem Baron-Aufsteller
  new Kruemel(level, { pos: [-6.2, Y, 3.2], near: 3.4, speed: 4.4,
    flee: [[-6.2, Y, 3.2], [-3, Y, -1], [2.6, Y, -5.4], [8.8, Y, -12], [8.8, Y, -21], [7.4, Y, -25.5]] });
  const k2 = new Kruemel(level, { pos: [100.2, Y, -66.2], yaw: Math.PI, mode: 'scared', help: 'Hilfe…', helpSub: 'Der Baron!', helpR: 7.5 });
  level.named.set('kruemel2', k2);
  shadowStars(level, [0, 1]);
  cullShadowWalls(level);

  // Theater-Kulisse: Vorhänge an Leinwänden, Durchgängen und Bühne
  curtain(level, { pos: [-9.6, Y, -21.6], w: 1.8, h: 7.2, tie: 0.42, side: 'left' });
  curtain(level, { pos: [2.6, Y, -21.6], w: 1.8, h: 7.2, tie: 0.42, side: 'right' });
  valance(level, { pos: [-3.5, 7.7, -21.4], w: 13.6, h: 1 });
  curtain(level, { pos: [3.4, Y, -24.6], w: 1.4, h: 5.4, tie: 0.42, side: 'left' });
  curtain(level, { pos: [10.4, Y, -24.6], w: 1.4, h: 5.4, tie: 0.42, side: 'right' });
  // Bühnenportal: Vorhänge an beiden Enden, Rampenlichter an der Bühnenkante
  curtain(level, { pos: [-3.4, YC, -85.3], w: 1.6, h: 9.4, tie: 0.45, side: 'left' });
  curtain(level, { pos: [65.4, 7, -85.3], w: 1.6, h: 5.4, tie: 0.45, side: 'right' });
  valance(level, { pos: [31, 12.2, -85.2], w: 72, h: 0.9 });
  footlights(level, 2.6, 10, YC, -85.2);
  footlights(level, 22, 29, YC, -85.2);
  footlights(level, 31.5, 33.2, YC, -85.2);
  footlights(level, 46.8, 54, YC, -85.2);
  footlights(level, 59.6, 64.6, 7, -85.2);
  // Rätselbox-Raum und Kulissen hinten
  curtain(level, { pos: [182.6, Y, -127.6], w: 1.4, h: 7.6, tie: 0.45, side: 'left' });
  curtain(level, { pos: [197.4, Y, -127.6], w: 1.4, h: 7.6, tie: 0.45, side: 'right' });
  valance(level, { pos: [190, 8.2, -127.4], w: 16, h: 0.9 });
  curtain(level, { pos: [104.2, Y, -66.25], w: 2.6, h: 4.4, axis: 'z', folds: 7 });     // verdeckt die Lücke
  valance(level, { pos: [112, 5, -73.2], w: 16, h: 0.8 });
  curtain(level, { pos: [105.6, Y, -73.2], w: 3, h: 4, tie: 0.4, side: 'left' });
  curtain(level, { pos: [118.4, Y, -73.2], w: 3, h: 4, tie: 0.4, side: 'right' });
  // Foyer: Läufer, Kerzenleuchter, Gemälde, Spinnweben
  carpet(level, -1.1, 1.1, 7, -6.5, Y);
  carpet(level, 1.1, 8.6, -5, -7.2, Y);
  bake(level, [
    { name: 'kerze', opts: { count: 3 }, pos: [-8.6, Y + 1.0, -2.6] },
    { name: 'kerze', opts: { count: 3 }, pos: [8.7, Y + 1.0, 1.6] },
    { name: 'bilderrahmen', opts: { motif: 'portraet', size: [1.4, 1.8] }, pos: [-9.9, 2.6, -6.5], yaw: 0 },
    { name: 'bilderrahmen', opts: { motif: 'landschaft', size: [1.8, 1.4] }, pos: [9.9, 2.8, -3.5], yaw: Math.PI },
    { name: 'kerze', opts: { count: 3 }, pos: [7.2, YC + 0.8, -58.8] },
    { name: 'spinnweben', opts: { size: 1.2 }, pos: [104.1, 4.8, -22], yaw: 0 },
    { name: 'buecherregal', opts: { width: 2, height: 2.6 }, pos: [104.5, Y, -24.4], yaw: 0 },
    { name: 'kerze', opts: { count: 3 }, pos: [117.6, 3.6, -36] },
    { name: 'kerze', opts: { count: 3 }, pos: [95.6, Y + 0.8, -63.4] },
  ]);
  prop(level, { name: 'kerze', opts: { count: 1 }, pos: [7.6, YC, -70.6], state: { anim: 'on' } });
}

export const LEVEL = {
  id: '2-3',
  world: 2,
  title: 'Scherenschnittkeller',
  archetype: 'parcours',
  theme: 'shadow',
  music: 'course_shadow',
  timeLimit: 400,
  start: { pos: [0, Y, 5], yaw: Math.PI / 2 },
  killY: -14,
  camera: [
    { ...CAM, from: 12, to: -6, pitch: 42, area: [-40, 40] },
    { ...CAM, from: -8, to: -22, pitch: 38, dist: 13.5, area: [-40, 40] },
    { ...CAM, from: -26, to: -56, pitch: 46, area: [-40, 40] },
    { ...CAM, from: -57, to: -75, pitch: 44, dist: 12.5, area: [-40, 40] },
    // Schattenbühne: frontal auf die Leinwand (Vorschlag der Schattenwand)
    { from: -84, to: -92, pitch: 14, dist: 16, height: 2.6, ahead: 0, fov: 40, area: [-10, 72] },
    // hinter den Kulissen und Ziel (x ≈ 112, z −18 … −105: außerhalb des Blickfelds der Bühnenkamera)
    { ...CAM, from: -17, to: -44, pitch: 46, dist: 12.5, area: [88, 135] },
    { ...CAM, from: -44, to: -74, pitch: 44, dist: 13.5, area: [88, 135] },
    { ...CAM, from: -75, to: -109, pitch: 42, dist: 13, area: [88, 135] },
    // Rätselbox-Raum (x ≈ 190): Gasse, dann flacher auf die Leinwand
    { from: -94, to: -114, pitch: 48, dist: 12, fov: 40, area: [175, 210] },
    { from: -118, to: -130, pitch: 20, dist: 14, height: 2.2, ahead: 0, fov: 40, area: [175, 210] },
  ],
  segments: [
    // =============================================================== 1  Foyer
    isl(-10, 10, 8, -24, Y, 3, { under: 2 }),
    { type: 'schattenwand', id: 'sw_foyer', pos: [-3.5, Y, -22], size: [11, 6.5], depth: 10 },
    // drei Bühnenkisten (Treppe zum Schattenstern)
    { type: 'platform', style: 'wood', pos: [-7.6, Y, -16], size: [1.8, 1, 1.8] },
    { type: 'platform', style: 'wood', pos: [-5.3, Y, -16], size: [1.8, 2, 1.8] },
    { type: 'platform', style: 'wood', pos: [-3, Y, -16], size: [1.8, 3, 1.8] },
    // Kulissen-Schattenfiguren (Mond und Baum ohne Körper)
    { type: 'sign', pos: [-3.6, Y, 4.4], text: 'Heute:\nSchattenspiel!' },
    { type: 'sign', pos: [0.4, Y, -12.2], text: 'Was der Schatten\nzeigt, ist da!' },
    deco([
      { kind: 'lantern', pos: [8.6, Y, -1] }, { kind: 'lantern', pos: [-8.6, Y, -10] },
      { kind: 'lantern', pos: [9, Y, -16] }, { kind: 'lantern', pos: [3.4, Y, -22.6] },
    ]),
    decoW1([
      rock(-12.5, -10, 9, -26, Y, 10.5), rock(10, 12.5, 9, -26, Y, 10.5, { color: ROCK2 }),
      rock(-10, 2.6, -22.8, -26, Y, 8.6),
      { kind: 'stalactites', pos: [-10.3, 10, -8], size: [0.8, 30], n: 10, len: [1, 2.8] },
      { kind: 'stalactites', pos: [10.3, 10, -8], size: [0.8, 30], n: 10, len: [1, 2.8] },
      { kind: 'mushrooms', pos: [-8.8, Y, 6], size: 0.8, color: 'gold', glow: true },
      { kind: 'mushrooms', pos: [8.8, Y, -8.6], size: 0.7, color: 'orange', glow: true },
      { kind: 'crystals', pos: [-9, Y, -20], size: 0.8, color: 'gold' },
      { kind: 'pebbles', from: [3.4, Y, -8.6], to: [8.4, Y, -19.4], n: 7, size: 0.4 },
      { kind: 'fireflies', pos: [0, Y + 1, -8], size: [16, 4, 26], n: 12, colors: [0xffd27a, 0xffb050, 0xfff2a0] },
      { kind: 'bunting', from: [-9.6, 7.4, -1], to: [9.6, 7.4, -1], sag: 0.8, colors: [0xd8202a, 0xffc83a, 0xfff2d6] },
    ]),
    { type: 'platform', style: 'wood', pos: [-8.6, Y, -2.6], size: [1, 1, 1] },       // Tischchen (Kerzen)
    { type: 'platform', style: 'wood', pos: [8.7, Y, 1.6], size: [1, 1, 1] },

    // =============================================================== 2  Fahrplattformen
    isl(2.6, 10, -24, -28.5, Y, 3, { under: 2 }),
    // m1 und m2 haben denselben Takt (7,5 s): steht m1 links, wartet m2 vorn – dann hinüberspringen
    { type: 'mover', id: 'm1', path: [[7.6, 0.5, -32], [1.6, 0.5, -32]], size: [3, 0.5, 3], speed: 2, wait: 0.75, color: 'orange' },
    { type: 'mover', id: 'm2', path: [[2.2, 1, -42.2], [2.2, 1, -36.6]], size: [3, 0.5, 3], speed: 2, wait: 0.95, color: 'red' },
    isl(-0.4, 4.8, -45.4, -50.4, 2, 3, { top: 'stone', under: 3 }),
    { type: 'mover', id: 'm3', path: [[2.2, -0.2, -53.6], [2.2, 2.2, -53.6]], size: [3, 0.5, 2.6], speed: 1.4, wait: 0.9, color: 'yellow' },   // Aufzug
    // Seitensimse der Feuer-Schnappblumen
    isl(-8, -4.4, -34.6, -39.4, 2.5, 3.5, { top: 'stone', under: 2 }),
    isl(7.6, 10.6, -45, -49.4, 2.6, 3.5, { top: 'stone', under: 2 }),
    isl(8, 11, -52.4, -56.6, 3.2, 3.5, { top: 'stone', under: 2 }),
    { type: 'pipe', pos: [9.1, 2.6, -47.2], height: 1.0, color: 0xc0462a },
    deco([
      { kind: 'lantern', pos: [-7.4, 2.5, -38.8] }, { kind: 'lantern', pos: [10.2, 3.2, -56] },
      { kind: 'lantern', pos: [4.2, 2, -49.8] },
    ]),
    decoW1([
      rock(-12, -8, -24, -58, -7, 9), rock(11, 14, -24, -58, -7, 9.5, { color: ROCK2 }),
      { kind: 'stalactites', pos: [-8.3, 9, -41], size: [0.8, 32], n: 11, len: [1.2, 3.4] },
      { kind: 'stalactites', pos: [11.3, 9.5, -41], size: [0.8, 32], n: 11, len: [1.2, 3.4] },
      { kind: 'crystals', pos: [-6.6, 2.5, -35.6], size: 0.8, color: 'gold' },
      { kind: 'crystals', pos: [10, 3.2, -53.2], size: 0.7, color: 'pink' },
      { kind: 'mushrooms', pos: [0.4, 2, -46.2], size: 0.6, color: 'orange', glow: true },
      { kind: 'fireflies', pos: [2, -1, -41], size: [16, 6, 30], n: 14, colors: [0xffd27a, 0xffb050] },
    ]),
    { type: 'killplane', y: -8, pos: [2, -8, -40], size: [40, 40] },

    // =============================================================== 3  Checkpoint und Seitenbühne
    isl(-8, 8, -57, -72, YC, 4, { under: 2 }),
    isl(-2.2, 2.2, -72, -85, YC, 4, { under: 2 }),
    { type: 'sign', pos: [-6.4, YC, -60.2], text: 'Topfpflanze:\nY tragen, Y werfen' },
    { type: 'sign', pos: [-3.6, YC, -70.4], text: 'Zur Bühne!\nSchau auf die Wand.' },
    // Käfig mit Münzen (nur die Topfpflanze kommt durch die Gitter)
    { type: 'schattenweg', parts: [{ pos: [5.6, YC, -67.4], size: [1.8, 2.2, 1.8] }] },
    { type: 'platform', style: 'wood', pos: [7.2, YC, -58.8], size: [1, 0.8, 1] },
    deco([
      { kind: 'lantern', pos: [-7.2, YC, -58.2] }, { kind: 'lantern', pos: [7.4, YC, -64] },
      { kind: 'lantern', pos: [-2.9, YC, -72.8] },
    ]),
    decoW1([
      rock(-11, -8, -56, -73, -2, 6.5), rock(8, 11, -56, -73, -2, 6.5, { color: ROCK2 }),   // niedrig: Bühnenkamera steht darüber
      rock(-8, -2.2, -72, -74, YC, 6), rock(2.2, 8, -72, -74, YC, 6, { color: ROCK2 }),
      { kind: 'stalactites', pos: [-8.3, 6.5, -62], size: [0.8, 10], n: 4, len: [0.8, 2] },
      { kind: 'mushrooms', pos: [-7, YC, -69.6], size: 0.8, color: 'gold', glow: true },
      { kind: 'crystals', pos: [7.2, YC, -71], size: 0.8, color: 'violet' },
      { kind: 'tufts', pos: [0, YC, -64], size: [12, 10], n: 8 },
    ]),

    // =============================================================== 4  Schattenbühne (2D, frontal)
    { type: 'schattenwand', id: 'sw_buehne', pos: [31, YC, ZB], size: [70, 9], depth: 5,
      casters: [
        { pos: [5, 9.8, -88], size: [1.8, 1.8, 1.8], shape: 'ball' },                        // Mond
        { pos: [65, 8.6, -88], size: [0.4, 3.4, 0.4], shape: 'cyl' },                        // Baum (Stamm)
        { pos: [65, 11, -88], size: [2.6, 2.4, 2.6], shape: 'ball' },                        // Krone
        { pos: [-1.6, 4, -88], size: [0.3, 3, 0.3], shape: 'cyl' },
        { pos: [-1.6, 5.8, -88], size: [1.8, 1.8, 1.8], shape: 'ball' },
      ] },
    boards(-4, 10), boards(22, 29), boards(31.5, 47), boards(47, 54),
    // Podest am Bühnenende (Oberkante 4,5 m über der Bühne): nur über die Schattenstufen erreichbar
    { type: 'platform', style: 'wood', pos: [62.75, -1, -87.5], size: [6.5, 8, 5] },
    // Wege, die es nur als Schatten gibt (A–C über die erste Lücke, D–G über die Riesenschnappblume, H–I hinauf zum Podest)
    { type: 'schattenweg', id: 'sw_weg', hint: 0.35, parts: [
      sp(12.3, 2.2, 3.5), sp(15.9, 2.2, 4.8), sp(19.5, 2.2, 3.6),
      sp(34, 2, 5.0), sp(37.3, 2.2, 6.6), sp(41.7, 2.2, 6.6), sp(45, 2, 5.0),
      sp(55.6, 2, 4.3), sp(58.2, 1.8, 5.7),
    ] },
    // Konsole der Feuer-Schnappblume
    { type: 'platform', style: 'stone', pos: [51.6, 5.6, -89.2], size: [1.6, 0.4, 1.4] },
    // Rampe vorn: unsichtbare Schranke vor dem Orchestergraben (außerhalb der Schattenzone)
    { type: 'schattenweg', parts: [
      { pos: [-3.1, -2, -84.8], size: [1.8, 14, 0.4] },
      { pos: [34.1, -2, -84.8], size: [63.8, 14, 0.4] },
      { pos: [-4.3, -2, -87.5], size: [0.4, 14, 5] }, { pos: [66.3, -2, -87.5], size: [0.4, 14, 5] },
    ] },
    { type: 'tuer', id: 'tuer_a', pos: [63.4, 7, -89.1], target: 'tuer_b', style: 'holz' },
    // Unterbühne (Falltür x 29 … 31,5): Kisten vor der Nische mit dem Stempel
    isl(25.4, 36, -85, ZB, -1.5, 2, { top: 'stone', under: 1 }),
    { type: 'wall', pos: [25.7, -1.5, -87.5], size: [0.6, 3, 5], style: 'grass' },
    { type: 'wall', pos: [33.3, -1.5, -85.95], size: [0.6, 3, 1.9], style: 'grass' },
    { type: 'wall', pos: [33.3, -1.5, -89.05], size: [0.6, 3, 1.9], style: 'grass' },
    { type: 'wall', pos: [33.3, 0.5, -87.5], size: [0.6, 1, 1.2], style: 'grass' },
    { type: 'wall', pos: [35.7, -1.5, -87.5], size: [0.6, 3, 5], style: 'grass' },
    { type: 'platform', style: 'wood', pos: [30.25, -1.5, -87.5], size: [1.6, 1.3, 2.4] },
    deco([{ kind: 'lantern', pos: [27, -1.5, -89.3] }]),
    decoW1([
      rock(-6, 70, ZB - 0.6, ZB - 3, -6, 13, { color: ROCK2 }),
      rock(-8, -4.4, -84, ZB, -6, 13), rock(66.4, 70, -84, ZB, -6, 13, { color: ROCK2 }),
      { kind: 'mushrooms', pos: [34.6, -1.5, -85.6], size: 0.5, color: 'gold', glow: true },
      { kind: 'crystals', pos: [26.4, -1.5, -85.6], size: 0.6, color: 'gold' },
    ]),
    { type: 'killplane', y: -6, pos: [31, -6, -86], size: [80, 30] },

    // =============================================================== 5  Hinter den Kulissen (x ≈ 112)
    isl(104, 120, -18, -45, Y, 3, { under: 2 }),
    { type: 'tuer', id: 'tuer_b', pos: [112, Y, -21.2], yaw: Math.PI / 2, target: 'tuer_a', style: 'holz' },
    { type: 'sign', pos: [116.6, Y, -23], text: 'Rätselbox' },
    // Lauerblock-Gasse (x 110,5 … 113,5)
    ...lauerWall(110.5, -1, -28, -44, [-30, -35, -40]),
    ...lauerWall(113.5, 1, -28, -44, [-32.5, -37.5, -42.5]),
    // Schacht mit Fahrplattformen
    // zwei Fähren im Gegentakt: sie kreuzen sich in der Mitte – dort hinüberspringen
    { type: 'mover', id: 'm4', path: [[107.4, 0.5, -48.6], [116.6, 0.5, -48.6]], size: [3, 0.5, 3], speed: 2.3, wait: 0.8, color: 'orange' },
    { type: 'mover', id: 'm5', path: [[116.6, 0.5, -53.2], [107.4, 0.5, -53.2]], size: [3, 0.5, 3], speed: 2.3, wait: 0.8, color: 'red' },
    isl(119.2, 121.6, -51.6, -55.6, 2, 3, { top: 'stone', under: 2 }),
    isl(104, 120, -56.4, -73, Y, 3, { under: 2 }),
    { type: 'tuer', id: 'tuer_c', pos: [112, Y, -72.2], target: 'tuer_d', style: 'stein' },
    // versteckte Nische hinter dem Vorhang (x 94 … 104)
    isl(94, 104, -62, -72, Y, 3, { under: 2 }),
    { type: 'holz_silhouette', id: 'baron', pos: [96.4, Y, -66.6], yaw: 0, onFall: [
      (level) => level.named.get('kruemel2')?.rescue(),
      { star: { index: 2, pos: [100.8, Y + 0.5, -64.6] } },
    ] },
    deco([
      { kind: 'lantern', pos: [105, Y, -19] }, { kind: 'lantern', pos: [119, Y, -27] },
      { kind: 'lantern', pos: [105, Y, -61.6] }, { kind: 'lantern', pos: [119, Y, -69] },
    ]),
    decoW1([
      rock(101.5, 104, -17, -65, Y, 7.5), rock(101.5, 104, -67.5, -75, Y, 7.5),
      rock(120, 122.5, -17, -75, -6, 8, { color: ROCK2 }),
      rock(104, 110.5, -27.6, -28.6, Y, 3.4), rock(113.5, 120, -27.6, -28.6, Y, 3.4, { color: ROCK2 }),
      rock(104, 108.5, -28, -44, Y, 3.6), rock(115.5, 120, -28, -44, Y, 3.6, { color: ROCK2 }),
      rock(104, 120, -73.4, -75.4, Y, 5),
      rock(91.5, 94, -59, -75, Y, 7.5), rock(94, 101.5, -72, -75, Y, 7.5),
      rock(94, 101.5, -59.6, -62, Y, 3.2, { camIgnore: true }),
      { kind: 'stalactites', pos: [104.3, 7, -48], size: [0.8, 40], n: 12, len: [1, 2.8] },
      { kind: 'stalactites', pos: [120.3, 8, -48], size: [0.8, 40], n: 12, len: [1, 2.8] },
      { kind: 'crystals', pos: [119, Y, -61.6], size: 0.9, color: 'gold' },
      { kind: 'mushrooms', pos: [94.8, Y, -62.8], size: 0.7, color: 'gold', glow: true },
      { kind: 'fireflies', pos: [112, -2, -52], size: [14, 6, 14], n: 10, colors: [0xffd27a, 0xffb050] },
      { kind: 'bunting', from: [104.2, 5.6, -45], to: [119.8, 5.6, -45], sag: 0.7, colors: [0xd8202a, 0xffc83a, 0x3a2a6a] },
    ]),
    { type: 'killplane', y: -7, pos: [112, -7, -53], size: [40, 20] },

    // =============================================================== 6  Ausgang und Ziel
    isl(104, 120, -75.4, -105, Y, 3, { under: 2 }),
    { type: 'tuer', id: 'tuer_d', pos: [112, Y, -76.4], yaw: Math.PI / 2, target: 'tuer_c', style: 'stein' },
    { type: 'stairs', pos: [112, Y, -87], dir: '-z', steps: 2, rise: 0.8, run: 1.4, width: 6, style: 'stone' },
    isl(104, 120, -89.8, -105, Y + 1.6, 3, { top: 'stone', under: 0 }),
    { type: 'sign', pos: [107.4, Y, -81], text: 'Vorhang zu –\nApplaus!' },
    deco([
      { kind: 'lantern', pos: [105.4, Y, -79] }, { kind: 'lantern', pos: [118.6, Y, -79] },
      { kind: 'lantern', pos: [106, Y + 1.6, -101] }, { kind: 'lantern', pos: [118, Y + 1.6, -101] },
    ]),
    decoW1([
      rock(101.5, 104, -75, -107, Y, 9), rock(120, 122.5, -75, -107, Y, 9, { color: ROCK2 }),
      rock(104, 120, -105, -107.5, Y + 1.6, 12),
      { kind: 'opening', pos: [112, Y + 1.6, -104.9], size: [8, 7.5] },
      { kind: 'crystals', pos: [105, Y + 1.6, -103.6], size: 1.2, color: 'gold' },
      { kind: 'crystals', pos: [119, Y + 1.6, -103.6], size: 1, color: 'pink' },
      { kind: 'mushrooms', pos: [105.6, Y, -85], size: 0.8, color: 'gold', glow: true },
      { kind: 'bunting', from: [104.4, 6, -91], to: [119.6, 6, -91], sag: 0.8, colors: [0xd8202a, 0xffc83a, 0xfff2d6] },
      { kind: 'fireflies', pos: [112, Y + 1, -95], size: [14, 5, 16], n: 14, colors: [0xffd27a, 0xfff2a0] },
    ]),

    // =============================================================== Rätselbox-Raum (abseits, x ≈ 190)
    isl(182, 198, -96, -129, Y, 3, { under: 2 }),
    ...lauerWall(188.5, -1, -104, -116, [-106, -110, -114], 2.2),
    ...lauerWall(191.5, 1, -104, -116, [-108, -112], 2.2),
    { type: 'schattenwand', id: 'sw_raetsel', pos: [190, Y, -128.4], size: [14, 7], depth: 9,
      casters: [{ pos: [184.5, 6.6, -126], size: [1.4, 1.4, 1.4], shape: 'ball' }] },
    { type: 'schattenweg', id: 'weg_stern', hidden: true, hint: 0.35, parts: [
      { pos: [188.6, 2.0, -123.4], size: [2, 0.4, 2.2] }, { pos: [191.2, 3.4, -123.4], size: [2, 0.4, 2.2] },
      { pos: [193.8, 4.8, -123.4], size: [2, 0.4, 2.2] },
    ] },
    { type: 'sign', pos: [184.2, Y, -118.6], text: 'Aufs Feld treten –\ndann zur Wand schauen!' },
    deco([
      { kind: 'lantern', pos: [183, Y, -97.4] }, { kind: 'lantern', pos: [197, Y, -97.4] },
      { kind: 'lantern', pos: [197, Y, -118] },
    ]),
    decoW1([
      rock(179.5, 182, -94, -131, Y, 8), rock(198, 200.5, -94, -131, Y, 8, { color: ROCK2 }),
      rock(182, 198, -94, -96, Y, 3, { camIgnore: true }),
      rock(182, 186.5, -103.6, -116, Y, 3.4), rock(193.5, 198, -103.6, -116, Y, 3.4, { color: ROCK2 }),
      { kind: 'crystals', pos: [183, Y, -103], size: 0.9, color: 'violet' },
      { kind: 'crystals', pos: [197, Y, -103], size: 0.9, color: 'gold' },
      { kind: 'mushrooms', pos: [196.6, Y, -126], size: 0.7, color: 'gold', glow: true },
    ]),
  ],
  blocks: [
    // 1: Funkenblüte in Sichtweite des Starts, Münzziegel
    { kind: 'question', pos: [-2.4, 3.4, -4.4], content: 'funkenbluete' },
    { kind: 'brick', pos: [-1.4, 3.4, -4.4], content: 'coins:4' },
    { kind: 'question', pos: [-0.4, 3.4, -4.4], content: 'coins:3' },
    // 3: Krallen-Anzug (Kisten unter der Bühne, Holz-Silhouette)
    { kind: 'question', pos: [3.4, 5, -61], content: 'krallenAnzug' },
    // 4: Extraleben im unsichtbaren Block (sein Schatten verrät ihn), Münzen-Block daneben
    { kind: 'hidden', pos: [61.2, 10.6, -87.5], content: 'oneup' },
    { kind: 'hidden', pos: [8, 6.2, -87.5], content: 'coins:5' },
    // 5: Wachstumsbeere vor der Gasse
    { kind: 'question', pos: [108, 3.4, -24.6], content: 'wachstumsbeere' },
  ],
  enemies: [
    // Wuschel (11)
    { kind: 'wuschel', path: [[-8.6, 1.1, -19.6], [1.2, 1.1, -19.6]], speed: 2.2, wait: 0.4 },
    { kind: 'wuschel', center: [5.6, 1.2, -9.4], radius: 2.4, speed: 2.4 },
    { kind: 'wuschel', center: [2.2, 2.3, -47.9], radius: 3.6, speed: 2.4 },
    { kind: 'wuschel', path: [[-1, 1.6, -39.4], [5.4, 1.6, -39.4]], speed: 2.2, wait: 0.3 },
    { kind: 'wuschel', path: [[14.1, 1.6, -87.5], [14.1, 7.2, -87.5]], speed: 2.4, wait: 0.2 },
    { kind: 'wuschel', path: [[22.6, 2.62, -87.5], [28.4, 2.62, -87.5]], speed: 2.2, wait: 0.3 },
    { kind: 'wuschel', path: [[56.9, 2.62, -87.5], [56.9, 7.6, -87.5]], speed: 2, wait: 0.3 },
    { kind: 'wuschel', center: [112, 1.6, -50.9], radius: 3, speed: 2.2 },
    { kind: 'wuschel', path: [[104.6, 1.2, -46.6], [104.6, 1.2, -55.6]], speed: 2.4, wait: 0.4 },
    { kind: 'wuschel', path: [[109.6, 1.1, -65.4], [117.6, 1.1, -65.4]], speed: 2.2, wait: 0.2 },
    { kind: 'wuschel', center: [190, 1.3, -100], radius: 2.2, speed: 2 },
    // Schnappblumen (3) und die Riesenschnappblume
    { kind: 'schnappblume', pos: [3.4, Y, -18.4] },
    { kind: 'schnappblume', pos: [49.4, YC, -87.5] },
    { kind: 'schnappblume', pos: [118.4, Y, -63.6] },
    { kind: 'riesenschnappblume', id: 'riese', pos: [39.6, YC, -87.5] },
    // Feuer-Schnappblumen (4)
    { kind: 'feuer_schnappblume', pos: [-6, 2.5, -37], base: 'pot', range: 10 },
    { kind: 'feuer_schnappblume', pos: [9.1, 3.6, -47.2], base: 'pipe', range: 10 },
    { kind: 'feuer_schnappblume', pos: [51.6, 6, -89.2], base: 'pot', range: 9, pause: 1.8 },
    { kind: 'feuer_schnappblume', pos: [120.4, 2, -53.6], base: 'pot', range: 9 },
    // Mini-Pilzlinge (3)
    { kind: 'pilzling', mini: true, pos: [-6, Y, -4], path: [[-8.4, Y, -4], [-3.4, Y, -4]] },
    { kind: 'pilzling', mini: true, pos: [6.4, Y, -15], path: [[4.4, Y, -15], [9.2, Y, -15]] },
    { kind: 'pilzling', mini: true, pos: [2.6, YC, -66], path: [[0.6, YC, -66], [4.2, YC, -66]] },
    // Lauerblöcke (11): Gasse hinter den Kulissen (6), Rätselbox-Gasse (5)
    { kind: 'lauerblock', pos: [110.5, Y, -30], dir: [1, 0], reach: 2.5 },
    { kind: 'lauerblock', pos: [113.5, Y, -32.5], dir: [-1, 0], reach: 2.5, mode: 'timed', period: 2.4 },
    { kind: 'lauerblock', pos: [110.5, Y, -35], dir: [1, 0], reach: 2.5, mode: 'timed', period: 2.4, phase: 0.5 },
    { kind: 'lauerblock', pos: [113.5, Y, -37.5], dir: [-1, 0], reach: 2.5 },
    { kind: 'lauerblock', pos: [110.5, Y, -40], dir: [1, 0], reach: 2.5, mode: 'timed', period: 2.2, phase: 0.25 },
    { kind: 'lauerblock', pos: [113.5, Y, -42.5], dir: [-1, 0], reach: 2.5 },
    { kind: 'lauerblock', pos: [188.5, Y, -106], dir: [1, 0], reach: 2.5, mode: 'timed', period: 2.4 },
    { kind: 'lauerblock', pos: [191.5, Y, -108], dir: [-1, 0], reach: 2.5 },
    { kind: 'lauerblock', pos: [188.5, Y, -110], dir: [1, 0], reach: 2.5, mode: 'timed', period: 2.4, phase: 0.5 },
    { kind: 'lauerblock', pos: [191.5, Y, -112], dir: [-1, 0], reach: 2.5 },
    { kind: 'lauerblock', pos: [188.5, Y, -114], dir: [1, 0], reach: 2.5, mode: 'timed', period: 2, phase: 0.2 },
  ],
  items: [
    // Aufbau-Haken (brennende Laterne am Start): Krümel, Schattensterne, Vorhänge, Kulisse
    hook([-8.8, Y, 6.8], scene),
    // 1: Foyer
    line([0, 1.5, 2], [0, 1.5, -2], 3),
    line([2.6, 1.5, -7], [7.6, 1.5, -12], 4),
    line([8.6, 1.5, -15], [8.6, 1.5, -22], 4),
    ...arc([-7.6, 2.5, -16], [-5.3, 3.5, -16], 2, 0.8), ...arc([-5.3, 3.5, -16], [-3, 4.5, -16], 2, 0.8),
    // 2: Bögen über die Lücken
    ...arc([6.4, 1.6, -28.4], [5, 1.6, -32], 3, 1.2),
    ...arc([2.6, 1.6, -33.8], [2.2, 2, -37], 3, 1.2),
    ...arc([2.2, 2.1, -42.4], [2.2, 2.6, -45.6], 3, 1.2),
    ring([2.2, 2.8, -47.9], 1.2, 5),
    ...arc([2.2, 2.6, -50.6], [2.4, 2.5, -53.6], 3, 1.2),
    ...arc([3.2, 2.5, -55], [2, 3.2, -57.6], 2, 1),
    // 3: Käfig (Topfpflanze), Gang
    ring([5.6, YC + 0.7, -67.4], 0.45, 5),
    { kind: 'topfpflanze', pos: [-3.6, YC, -64.4], respawn: 6 },
    // 4: Kisten vor der Stempel-Nische (unter der Bühne)
    { kind: 'crate', pos: [33.3, -1.5, -87.5], content: 'coin' },
    { kind: 'crate', pos: [33.3, -0.5, -87.5], content: 'coins:2' },
    line([0, YC + 0.6, -74], [0, YC + 0.6, -82], 4),
    // 4: Bühne
    line([3, YC + 0.6, -87.5], [9, YC + 0.6, -87.5], 4),
    { kind: 'coin', pos: [12.3, 4.2, -87.5] }, { kind: 'coin', pos: [15.9, 5.5, -87.5] }, { kind: 'coin', pos: [19.5, 4.3, -87.5] },
    line([23, YC + 0.6, -87.5], [28, YC + 0.6, -87.5], 3),
    { kind: 'coin', pos: [37.3, 7.3, -87.5] }, { kind: 'coin', pos: [41.7, 7.3, -87.5] },
    line([47.6, YC + 0.6, -87.5], [53.2, YC + 0.6, -87.5], 3),
    { kind: 'coin', pos: [55.6, 5, -87.5] }, { kind: 'coin', pos: [58.2, 6.4, -87.5] },
    line([60.4, 7.6, -87.5], [62, 7.6, -87.5], 2),
    line([27, -0.9, -87.5], [31.6, -0.9, -87.5], 3),
    // 5: Gasse, Schacht, Spur zur Lücke hinter dem Vorhang
    line([112, 1.6, -26.6], [112, 1.6, -44], 7),
    ...arc([112, 1.6, -45.2], [112, 1.6, -48.6], 2, 1),
    ...arc([112, 1.6, -50.2], [112, 1.6, -51.8], 2, 1),
    ...arc([112, 1.6, -54.8], [112, 1.6, -57.6], 2, 1),
    line([107.4, 1.6, -66.2], [105, 1.6, -66.2], 3),
    // 6: Ziel
    line([112, 1.6, -79], [112, 1.6, -85], 3),
    // Rätselbox (hin und zurück)
    { kind: 'warpbox', id: 'rb1', style: 'mystery', pos: [117, Y, -25.6], target: 'rb2' },
    { kind: 'warpbox', id: 'rb2', style: 'mystery', pos: [190, Y, -98.8], target: 'rb1' },
    { kind: 'pfeld', id: 'pf_licht', pos: [185.6, Y, -122.6], need: 1, on: { reveal: ['weg_stern', 'stern_raetsel'] } },
    line([190, 1.6, -103.6], [190, 1.6, -115.6], 4),
  ],
  checkpoint: [0, YC, -62.6],
  stars: [
    [-0.6, 6.0, -16],                                                     // 0: Schattenstern im Foyer
    { pos: [196.2, 5.9, -123.4], hidden: true, id: 'stern_raetsel' },    // 1: Rätselbox (Druckfeld)
    //                                                                      2: Krümel (Holz-Silhouette, onFall)
  ],
  stamp: [34.7, -1.5, -87.5],
  goal: { pos: [112, Y + 1.6, -96.6], height: 9 },
  marks: {
    start: [0, Y, 5],
    foyer: [2, Y, -8],
    podest: [-3, 4, -16],
    gap: [6.4, Y, -27.6],
    island: [2.2, 2, -47.6],
    checkpoint: [0, YC, -62],
    pot: [-3.6, YC, -64.4],
    cage: [5.6, YC, -67.4],
    wings: [0, YC, -80],
    stage: [2, YC, -87.5],
    stageA: [9.4, YC, -87.5],
    giant: [30.2, YC, -87.5],
    hole: [30.25, YC, -87.5],
    under: [27.4, -1.5, -87.5],
    crates: [32.4, -1.5, -87.5],
    stageEnd: [52, YC, -87.5],
    podium: [61, 7, -87.5],
    door: [63.4, 7, -88.2],
    back: [112, Y, -23],
    lane: [112, Y, -28],
    shaft: [112, Y, -44.6],
    landing: [112, Y, -61.6],
    nook: [104.6, Y, -66.2],
    baron: [96.4, Y, -66.6],
    exit: [112, Y, -71.4],
    goal: [112, Y, -83],
    mystery: [190, Y, -101],
    hall: [188, Y, -120.5],
  },
};
