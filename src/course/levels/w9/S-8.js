// S-8 „Geisterreigen im Schneenebelmoor“ (Bauplan S-8: Parcours mit Geistern, 400 s, ca. 300 m – verschneiter Spukfriedhof im
// Nebel, Boden erscheint/verschwindet, Floßfahrt auf dem Giftfluss; eigene Gestaltung). Thema fogbog, Musik course_fogbog.
//
// 1. Schneefriedhof (≈ 100 × 60 m, x −30 … 30, z 16 … −86): Gräberreihen, Grüfte, Kapelle, Schneemänner, Laternen. Das
//    Friedhofstor im Norden öffnet erst mit fünf Schlüsselmünzen (Lampen auf dem Torbogen zeigen den Stand):
//      a) gleich beim Start auf einem Felsen im Kreisgeist-Ring (durch eine Lücke springen)
//      b) über der Großblock-Treppe, die nach einem POW-Treffer erscheint
//      c) auf einer unsichtbaren Wolke links (vom Dach der Westgruft hinüberspringen – die Wolke zeigt sich erst beim Betreten)
//      d) hinter der vermauerten Nordgruft (Ziegelwand): einen Schneeball durch das Gitter auf den POW-Block werfen
//      e) auf dem Felssims ganz rechts – Zugang nur durch die Tür der Gruft am linken Zaun
//    Türen in Nebenbereiche: linke Gruft-Tür → Felssims rechts; Kapellentür rechts → Kerzenkammer (Bitcoins, Extraleben).
//    Stern 0: auf das Grablicht vor dem großen Grabstein stampfen → Funkelstern; damit den Geisterring um Krümel vertreiben.
// 2. Floßfahrt (z −94 … −172): Holzfloß über den lila Giftsumpf, vorbei an Grabinseln mit Kreisgeist-Ringen; Kontrollpunkt
//    davor am Steg.
// 3. Landeinsel (z −174 … −190): Kontrollpunkt; Rätselbox → Nebelkammer: vier Zielscheiben aus der Ferne mit Schneebällen
//    treffen → Stern 1.
// 4. Nebelplattformen (z −190 … −265): Steinplatten steigen aus dem Nebel und sinken wieder (Welle), zwei Spuren (eine
//    blinkt), Rastinseln, zum Schluss aufsteigende Platten bis zum Steg.
// 5. Boost-Steg (z −266 … −306): Holzsteg mit Boost-Pfeilen über dem Nebel; links ein Balkon mit Schneebällen – die
//    Sternlaterne daneben (Stern 2) trifft man nur aus der Ferne; Stempel am Ende des Stegs rechts.
// 6. Warp-Box zum Ziel (Kapellenhügel, x ≈ 70).
// Gegner: Kreisgeister (5 einzeln, 5 Ringe mit 32 Geistern).

import { PI, line, ring, arc, column, sign, isl, Bld, litTop, grablicht, kruemelAngst, unsichtbareWolke, sternlaterne,
  friedhofstor, schneebaelle, eisenzaun, gruft, kapelle, schneemann, baenke, kerzen, steg, graeber, wege, tannen, laternen,
  eisteiche, irrlichter, lichterkette, winterbeete, eiszapfen, sumpfZier } from './_helpers_d.js';

const XK = 100;           // Kerzenkammer (Nebenbereich hinter der Kapellentür)
const XR = -100;          // Nebelkammer (Rätselbox)
const XZ = 70;            // Kapellenhügel (Ziel)
const YS = 3.2;           // Höhe des Boost-Stegs

const FELS = { topColor: 0xc2c6e6, sideColor: 0x9296bc, color: 0x7c7ea8 };     // Schneefelsen (hell, bläulich)
const MOOR = { topColor: 0xa898c8, sideColor: 0x7a6a9a, color: 0x5a4a7a };     // Grabinseln im Giftsumpf (lila Stein)

const geist = (id, c, r, o = {}) => ({ kind: 'kreisgeist', id, center: c, radius: r, speed: o.speed ?? 1.4, cw: o.cw ?? false, phase: o.phase ?? 0 });
const kreis = (id, p, count, r, o = {}) => ({ kind: 'kreisgeist_kreis', id, pos: p, count, radius: r, speed: o.speed ?? 1.2, cw: o.cw ?? false, phase: o.phase ?? 0 });

/** Gräberreihe (eigene Gräber mit Schmuck) von (x0, z) nach (x1, z) mit n Gräbern. */
function reihe(x0, x1, z, n, o = {}) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = x0 + ((x1 - x0) * i) / Math.max(1, n - 1);
    out.push({ pos: [x, o.y ?? 0, z + (i % 2 ? 0.3 : -0.2)], yaw: o.yaw ?? Math.sin(x * 3.1 + z) * 0.18, size: o.size ?? (1.1 + ((i * 7 + Math.round(z)) % 3) * 0.14) });
  }
  return out;
}

// Gräberfelder zwischen den Wegen (frei bleiben: Mittelweg x ±2, Seitenwege, Anläufe und Landeflächen der Route)
const GRAEBER = [
  ...reihe(-26, -18, 12, 3), ...reihe(-26, -17, -1, 3), ...reihe(18, 26, 12, 3), ...reihe(20, 27, -4, 3),
  ...reihe(-26, -8, -12, 5), ...reihe(-26, -9, -34, 5), ...reihe(-26, -9, -40, 4),
  ...reihe(21.5, 27, -28, 2), ...reihe(21.5, 27, -34, 2), ...reihe(4, 9, -30, 2),
  ...reihe(-26, -9, -52, 5), ...reihe(3.5, 8.5, -54, 2), ...reihe(22, 27, -54, 2),
  ...reihe(-26, -21, -76, 2), ...reihe(-12, -5, -77, 3), ...reihe(3.5, 8, -78, 2), ...reihe(19, 27, -79, 3),
  // Gräber direkt am Mittelweg (Lücken an den Seitenwegen)
  ...reihe(-6.6, -4.4, 1.4, 2, { yaw: 0.5, size: 1.05 }), ...reihe(4.4, 6.6, -2.6, 2, { yaw: -0.5, size: 1.05 }), ...reihe(-6.4, -4.4, -14, 2, { yaw: 0.5, size: 1.05 }),
  ...reihe(4.4, 6.4, -16, 2, { yaw: -0.5, size: 1.05 }), ...reihe(-6.4, -4.4, -27, 2, { yaw: 0.5, size: 1.05 }), ...reihe(4.4, 6.4, -24, 2, { yaw: -0.5, size: 1.05 }),
  ...reihe(-6.4, -4.4, -36, 2, { yaw: 0.5, size: 1.05 }), ...reihe(4.4, 6.4, -44.6, 2, { yaw: -0.5, size: 1.05 }), ...reihe(-6.4, -4.4, -52, 2, { yaw: 0.5, size: 1.05 }),
  ...reihe(4.4, 6.4, -68, 2, { yaw: -0.5, size: 1.05 }), ...reihe(-6.4, -4.4, -70.6, 2, { yaw: 0.5, size: 1.05 }), ...reihe(4.4, 6.4, -74, 2, { yaw: -0.5, size: 1.05 }),
  // Grabinseln im Giftsumpf, Nebelstufen, Kapellenhügel, Nebelkammer
  { pos: [-11.5, 0.4, -118], size: 1 }, { pos: [-10.2, 0.4, -120.4], size: 0.8 }, { pos: [10.4, 0.4, -147.6], size: 1 }, { pos: [11.6, 0.4, -149.6], size: 0.8 },
  { pos: [-2.8, 0, -216.8], size: 0.8 }, { pos: [3.4, 0, -244.4], size: 0.8, kind: 'kreuz' },
  { pos: [XZ - 6, 0, -326], size: 0.9 }, { pos: [XZ + 6.4, 0, -328], size: 1, kind: 'herz' }, { pos: [XZ - 7, 0, -334], size: 0.8 },
  { pos: [XR - 5.6, -0.8, -191.6], size: 0.9 }, { pos: [-3.4, YS, -318], size: 0.8 }, { pos: [3.6, YS, -312.6], size: 0.7, kind: 'herz' },
];

// Irrlichter (bunt, wippend; ein Points-Objekt)
const IR = { rosa: 0xff8ad8, mint: 0x7affd0, lila: 0xc8a0ff, gelb: 0xffe27a, blau: 0x8ad8ff };
const IRRLICHTER = [
  [-14, 2.2, -14, 'mint'], [16, 2.8, -36, 'lila'], [-22, 2.4, -72, 'rosa'], [20, 3.2, -80, 'mint'], [10, 2.2, 0, 'lila'], [-20, 2.6, 10, 'gelb'],
  [22, 2.4, -8, 'rosa'], [-16, 2.8, -50, 'gelb'], [-24, 2.2, -30, 'blau'], [10, 2.6, -60, 'rosa'],
  [-8, 1.6, -132, 'lila'], [9, 1.8, -126, 'gelb'], [-6, 1.4, -164, 'mint'], [8, 1.6, -104, 'rosa'], [-9, 1.8, -146, 'blau'],
  [-6, 1.4, -197, 'rosa'], [6.2, 1.8, -204, 'mint'], [-5.5, 2.2, -221, 'gelb'], [6, 1.6, -231, 'lila'], [-6, 2.6, -250, 'mint'], [6, 3, -257, 'rosa'],
  [-4.8, 4.6, -272, 'gelb'], [4.8, 4.8, -286, 'rosa'], [-5.4, 4.4, -296, 'mint'], [5.8, 4.6, -308, 'lila'],
  [XK - 4, 2.6, -60, 'gelb'], [XK + 4, 3, -62, 'lila'], [XR, 2.6, -190, 'mint'], [XR - 5, 2.2, -176, 'rosa'],
  [XZ, 4.2, -344, 'mint'], [XZ - 6, 2.4, -338, 'rosa'], [XZ + 6, 2.6, -326, 'gelb'],
].map(([x, y, z, c]) => ({ pos: [x, y, z], color: IR[c] }));

// Winterbeete (Christrosen, Krokusse, Beerensträucher) – Farbe am Wegrand
const BEETE = [
  [-3.4, 8, 'rosen'], [3.4, 5.4, 'krokus'], [-3.4, -2.6, 'beeren'], [3.2, -12.6, 'rosen'], [-3.2, -16.4, 'krokus'], [3.3, -21.4, 'beeren'],
  [-3.3, -30, 'rosen'], [3.3, -33.4, 'krokus'], [-3.3, -40.4, 'beeren'], [3.3, -49.6, 'rosen'], [-3.3, -54.4, 'krokus'], [3.3, -57.4, 'beeren'],
  [-3.3, -64, 'rosen'], [3.3, -66.4, 'krokus'], [-3.3, -73.4, 'beeren'], [3.3, -79.6, 'rosen'],
  [-9.2, 3.2, 'krokus'], [8.6, -7.8, 'rosen'], [-10.6, -22.2, 'beeren'], [-20.2, -18.2, 'rosen'], [14.6, -16.4, 'krokus'], [7.4, -35.4, 'beeren'],
  [-19.6, -43.4, 'krokus'], [-13.4, -60.6, 'rosen'], [19.4, -59.4, 'beeren'], [-21.6, -26.4, 'krokus'],
  [-5.4, -86.6, 'rosen'], [5.4, -86.6, 'beeren'], [-6.2, -178.4, 'krokus'], [6.6, -176.2, 'rosen'], [-3, -186.6, 'beeren'],
  [2.8, -212.2, 'rosen'], [-2.8, -217.8, 'krokus'], [3.4, -241.8, 'beeren'], [-3.4, -242.6, 'rosen'],
  [-4.4, -312.4, 'krokus'], [4.4, -310.6, 'rosen'],
  [XZ - 3, -327, 'rosen'], [XZ + 3, -329, 'krokus'], [XZ - 3, -333, 'beeren'], [XZ + 3.2, -335.4, 'rosen'],
].map(([x, z, kind]) => ({ pos: [x, z < -300 && z > -321 ? YS : 0, z], kind, r: kind === 'beeren' ? 0.6 : 0.85, n: 8 }));

// Pflasterwege (Mittelweg und Abzweige zu den Schlüsseln)
const WEGE = [
  { x0: -1.5, x1: 1.5, z0: 14, z1: -83 },
  { x0: -6, x1: -1.5, z0: 6, z1: 4 }, { x0: 1.5, x1: 12, z0: -9, z1: -11 }, { x0: -14, x1: -1.5, z0: -19, z1: -21 },
  { x0: 1.5, x1: 9, z0: -36.6, z1: -38.6 }, { x0: -24.4, x1: -1.5, z0: -45, z1: -47 }, { x0: -16, x1: -1.5, z0: -57, z1: -59 },
  { x0: 1.5, x1: 21, z0: -61, z1: -63 }, { x0: -2, x1: 2, z0: -84.6, z1: -93 },
  { x0: -2, x1: 2, z0: -174, z1: -189 }, { x0: XZ - 1.5, x1: XZ + 1.5, z0: -320, z1: -336 },
];

function build(level) {
  // ------------------------------------------------ Zäune um den Friedhof (springbar, Lücke am Start), Lichterketten
  eisenzaun(level, [
    { from: [-29.6, 15.6], to: [-29.6, -42.6] }, { from: [-29.6, -49.4], to: [-29.6, -83.4] },
    { from: [29.6, 15.6], to: [29.6, -83.4] },
    { from: [-29.6, 15.6], to: [-4, 15.6], lights: true }, { from: [4, 15.6], to: [29.6, 15.6], lights: true },
    // innen: Gehege um die Krümel-Lichtung (offen nach Süden)
    { from: [17.6, -38.6], to: [17.6, -50], h: 0.9, lights: true }, { from: [6.4, -50], to: [17.6, -50], h: 0.9, lights: true },
  ]);
  graeber(level, GRAEBER);
  wege(level, WEGE);
  tannen(level, [
    { pos: [-27.4, 0, 14], lights: true }, { pos: [27.4, 0, 13.4], height: 5.6, lights: true }, { pos: [-27.6, 0, -20], height: 6 }, { pos: [27.4, 0, -14], height: 5 },
    { pos: [-27.6, 0, -62], height: 5.5 }, { pos: [27.6, 0, -40], height: 6.2, lights: true }, { pos: [27.4, 0, -60], height: 4.8 }, { pos: [-27.4, 0, -80], height: 5.4 },
    { pos: [27.4, 0, -81], height: 5.8 }, { pos: [-6.6, 0, -91.6], height: 4.2, lights: true }, { pos: [6.6, 0, -91.6], height: 4.4, lights: true },
    { pos: [-8.4, 0, -188.2], height: 4.4 }, { pos: [8.4, 0, -175.4], height: 4.8 }, { pos: [XZ - 8.4, 0, -320], height: 5.4, lights: true }, { pos: [XZ + 8.4, 0, -344], height: 6, lights: true },
    { pos: [XK + 7.4, 0, -67.2], height: 3.6, solid: false, lights: true }, { pos: [XK - 7.4, 0, -67.2], height: 3.6, solid: false, lights: true },
  ]);
  laternen(level, [
    { pos: [-2.6, 0, 2] }, { pos: [2.6, 0, -16] }, { pos: [-2.6, 0, -32] }, { pos: [2.6, 0, -48] }, { pos: [-2.6, 0, -66] },
    { pos: [-3.6, 0, -81.6], color: 'lila' }, { pos: [3.6, 0, -81.6], color: 'lila' }, { pos: [9.6, 0, -37.6], color: 'mint' }, { pos: [-14.6, 0, -24], color: 'lila' },
    { pos: [-23.6, 0, -48.6], color: 'rosa' }, { pos: [38.2, 6.5, -61.8], color: 'mint' }, { pos: [20.4, 0, -64.6] }, { pos: [-13.6, 0, -59.6], color: 'rosa' },
    { pos: [-2.6, 0, -89] }, { pos: [2.6, 0, -89] }, { pos: [-12.6, 0.4, -116], color: 'lila' }, { pos: [12, 0.4, -145.4], color: 'mint' },
    { pos: [-3.6, 0, -176.4] }, { pos: [3.6, 0, -188.6], color: 'lila' }, { pos: [3, 0, -212.4], color: 'mint' }, { pos: [-3.6, 0, -244.8] },
    { pos: [-4.4, YS, -317.4], color: 'lila' }, { pos: [4.4, YS, -317.4], color: 'lila' }, { pos: [XZ - 3, 0, -321.6] }, { pos: [XZ + 3, 0, -321.6] },
    { pos: [XR - 6, 0, -173.4], color: 'mint' }, { pos: [XR + 6, 0, -173.4], color: 'mint' }, { pos: [XK - 7, 0, -54], color: 'rosa' },
  ]);
  eisteiche(level, [{ pos: [16, 0, 3.4], r: 3.2 }, { pos: [XZ + 5.6, 0, -340], r: 2.2 }]);
  // ------------------------------------------------ Farbe und Leben: Irrlichter, Lichterbögen, Winterbeete, Eiszapfen
  irrlichter(level, IRRLICHTER);
  lichterkette(level, [
    // Lichterbögen über dem Mittelweg (mit Stern), über dem Steg-Platz und am Kapellenhügel
    ...[12.4, -6, -28.4, -52.4, -76].map((z) => ({ from: [-2.3, 3.0, z], to: [2.3, 3.0, z], sag: -0.7, posts: 0, star: true, gap: 0.42 })),
    { from: [-2.6, 3.5, -89], to: [2.6, 3.5, -89], sag: 0.45 },
    { from: [XZ - 3, 3.5, -321.6], to: [XZ + 3, 3.5, -321.6], sag: 0.5 },
    // Girlanden auf der Friedhofsmauer (Bögen zwischen den Mauerblenden)
    ...[-1, 1].flatMap((sd) => [0, 1, 2, 3, 4, 5].map((i) => ({ from: [sd * (4.2 + i * 4.3), 3.7, -83.2], to: [sd * (4.2 + (i + 1) * 4.3), 3.7, -83.2], sag: 0.5, wire: false }))),
    // Geländer-Lichter am Boost-Steg (Lücken: Balkon links, Stempel-Plattform rechts)
    ...[[-266.6, -271.6], [-271.6, -277.6], [-284.4, -290], [-290, -295.6], [-295.6, -301]].map(([z0, z1]) => ({ from: [-1.0, YS + 1.0, z0], to: [-1.0, YS + 1.0, z1], sag: 0.22, posts: YS })),
    ...[[-266.6, -271.6], [-271.6, -277.6], [-277.6, -283.6], [-283.6, -289.6], [-289.6, -295.2], [-295.2, -300.2]].map(([z0, z1]) => ({ from: [1.0, YS + 1.0, z0], to: [1.0, YS + 1.0, z1], sag: 0.22, posts: YS })),
    // Kerzenkammer: Lichter über dem Altar
    { from: [XK - 7.6, 4.2, -67.8], to: [XK + 7.6, 4.2, -67.8], sag: 0.7 },
  ]);
  winterbeete(level, BEETE);
  eiszapfen(level, [
    { from: [-29.8, 3.62, -83.32], to: [-4.2, 3.62, -83.32], len: 0.55 }, { from: [4.2, 3.62, -83.32], to: [29.8, 3.62, -83.32], len: 0.55 },
  ]);
  // ------------------------------------------------ Giftsumpf: leuchtende Pilze auf den Grabinseln, Schilf am Ufer
  sumpfZier(level, [
    { pos: [-13.2, 0.4, -114.8] }, { pos: [-9.8, 0.4, -121.2], n: 4 }, { pos: [8.8, 0.4, -150.2] }, { pos: [12.2, 0.4, -144.8], n: 4 },
    { pos: [13.2, 0.3, -110.8], n: 4 }, { pos: [9.8, 0.3, -115.2] }, { pos: [-12.2, 0.3, -152.8] }, { pos: [-8.8, 0.3, -157.2], n: 4 },
    { pos: [-5.4, 0, -92.6], n: 4, r: 0.5 }, { pos: [5.6, 0, -173.8], n: 4, r: 0.5 },
    ...[[-7.4, -95.2], [7.2, -95.6], [-11, -95], [-9.4, -171.6], [9.4, -171.8], [-14.6, -118], [13.6, -147.6], [14.6, -113], [-13.6, -155], [-15, -134], [14.4, -130]]
      .map(([x, z]) => ({ pos: [x, -0.6, z], kind: 'schilf', n: 6, r: 0.8 })),
  ]);
  // ------------------------------------------------ Nebelfeld: Gräber, Laternen und Tannen ragen aus dem Nebel
  graeber(level, [
    { pos: [-8.6, -1.1, -196], size: 1.2 }, { pos: [9, -1.1, -201], size: 1.3, kind: 'kreuz' }, { pos: [-9.4, -1.1, -219], size: 1.25, kind: 'herz' },
    { pos: [9.6, -1.1, -229], size: 1.2 }, { pos: [-8.8, -1.1, -244], size: 1.3, kind: 'spitz' }, { pos: [8.8, -1.1, -247], size: 1.1 },
    { pos: [-9.2, -1.1, -256], size: 1.2, kind: 'kreuz' }, { pos: [9.4, -1.1, -262], size: 1.3 },
  ]);
  laternen(level, [
    { pos: [-6.4, -1.2, -201], height: 3.4, color: 'lila' }, { pos: [6.6, -1.2, -224], height: 3.4, color: 'mint' }, { pos: [-6.6, -1.2, -229], height: 3.4, color: 'rosa' },
    { pos: [6.4, -1.2, -252], height: 3.6 }, { pos: [-6.4, -1.2, -259], height: 3.8, color: 'lila' },
  ]);
  tannen(level, [
    { pos: [-12.5, -1.4, -198], height: 6.5, solid: false }, { pos: [12.5, -1.4, -206], height: 7, solid: false }, { pos: [-13, -1.4, -232], height: 7.5, solid: false },
    { pos: [13, -1.4, -238], height: 6, solid: false }, { pos: [-12, -1.4, -262], height: 6.8, solid: false }, { pos: [12, -1.4, -258], height: 7.2, solid: false },
    { pos: [-10, -1.6, -284], height: 6.4, solid: false }, { pos: [10.5, -1.6, -296], height: 7, solid: false },
  ]);
  // ------------------------------------------------ Grüfte, Kapelle, Mauer
  gruft(level, { pos: [-19, 0, -22], size: [5, 3, 4], face: '+z', door: 'zu' });                         // Westgruft (Dach → Wolke)
  gruft(level, { pos: [-27.5, 0, -46], size: [4, 3.2, 5], face: '+x', roof: 'kuppel' });                // Gruft am linken Zaun (Tür → Sims)
  gruft(level, { pos: [-17, 0, -68], size: [6, 3.4, 5], face: '+z', opening: { w: 3, h: 2, depth: 2.4 } });   // vermauerte Nordgruft
  gruft(level, { pos: [14, 0, -78], size: [4.4, 2.8, 3.6], face: '+z', door: 'zu', roof: 'kuppel', color: 0xd0c8e4 });
  kapelle(level, { pos: [23, 0, -68], size: [6, 4, 7] });
  // Felstor hinter der Sims-Tür (Wand, an der die Tür lehnt)
  const fb = new Bld();
  fb.box(1.6, 4.2, 4, 38.6, 6.5, -58, litTop(0x7a809a), { r: 0.3 });
  fb.sphere(1.2, 38.6, 10.9, -58, 0xf4f8ff, { s: [0.9, 0.4, 1.8] });
  fb.flush(level, { castShadow: true });
  level.world.add({ type: 'box', min: [37.8, 6.5, -60], max: [39.4, 10.7, -56], tag: 'felstor' });
  // Friedhofsmauer im Norden (mit unsichtbarer Sperre darüber – nur das Tor führt weiter)
  const mb = new Bld();
  for (const [a, b2] of [[-30, -3.9], [3.9, 30]]) {
    const cx = (a + b2) / 2, w = b2 - a;
    mb.box(w, 3.6, 1.2, cx, 0, -84, litTop(0xa8b0c8), { r: 0.1 });
    mb.box(w + 0.2, 0.3, 1.5, cx, 3.6, -84, 0x8a92b0);
    mb.box(w, 0.32, 1.3, cx, 3.9, -84, 0xf6f9ff, { r: 0.14 });
    for (let x = a + 2; x < b2 - 1; x += 4) mb.box(0.7, 0.5, 0.25, x, 1.6, -83.38, 0x8a92b0);
    level.world.add({ type: 'box', min: [Math.min(a, b2) - (a < 0 ? 4 : 0), 0, -84.6], max: [Math.max(a, b2) + (a > 0 ? 4 : 0), 14, -83.4], tag: 'mauer' });
  }
  mb.flush(level, { castShadow: true });
  // ------------------------------------------------ POW-Käfig (Gitter: Figuren bleiben draußen, Schneebälle fliegen hindurch)
  {
    const x = -11, z = -63, s = 1.2;
    level.world.add({ type: 'box', min: [x - s, 0, z - s], max: [x + s, 2.6, z + s], ballPass: true, camIgnore: true, noWallSlide: true, tag: 'powkaefig' });
    const b = new Bld();
    for (let i = 0; i <= 6; i++) for (const sd of [-1, 1]) {
      const u = -s + (i / 6) * 2 * s;
      b.cyl(0.035, 0.035, 2.5, x + u, 0, z + sd * s, 0x2a2e48, 5);
      b.cyl(0.035, 0.035, 2.5, x + sd * s, 0, z + u, 0x2a2e48, 5);
    }
    b.box(2 * s + 0.2, 0.14, 2 * s + 0.2, x, 2.5, z, 0x3a3e58, { r: 0.05 });
    b.box(2 * s + 0.1, 0.12, 2 * s + 0.1, x, 2.64, z, 0xf6f9ff, { r: 0.05 });
    b.box(2 * s + 0.2, 0.12, 2 * s + 0.2, x, 0, z, 0x3a3e58);
    b.flush(level, { castShadow: true });
  }
  // ------------------------------------------------ Kerzenkammer (Nebenbereich): Rückwand, Seitenwände, Gewölbe-Andeutung
  {
    const b = new Bld();
    b.box(16, 5, 1, XK, 0, -68.5, litTop(0x8a7aa8), { r: 0.1 });
    for (const sx of [-1, 1]) b.box(1, 5, 16, XK + sx * 8.5, 0, -60.5, litTop(0x8a7aa8), { r: 0.1 });
    for (let i = -2; i <= 2; i++) { b.cyl(0.32, 0.36, 4.6, XK + i * 3.2, 0, -67.6, 0xc8c0e0, 10); b.box(0.9, 0.3, 0.9, XK + i * 3.2, 4.6, -67.6, 0xd8a840); }
    b.box(3.6, 1.2, 1.4, XK, 0, -66.6, 0x6a5a8a, { r: 0.08 });
    b.box(4, 0.2, 1.8, XK, 1.2, -66.6, 0xd8a840);
    b.box(2.2, 2.6, 0.2, XK, 2.0, -67.9, 0x4a3a6a);
    // roter Läufer von der Tür zum Altar (goldene Borte), bunte Wandbehänge
    b.box(2.2, 0.04, 11.4, XK, 0, -59.8, 0xd8a840, { r: 0 });
    b.box(1.9, 0.06, 11.2, XK, 0, -59.8, 0xc8304a, { r: 0 });
    for (const [sx, z, c] of [[-1, -57, 0xff6aa8], [-1, -62.5, 0x5ad8c8], [1, -57, 0x8a6aff], [1, -62.5, 0xffc83a]]) {
      b.box(0.08, 2.2, 1.4, XK + sx * 7.96, 1.6, z, c, { r: 0 });
      b.cone(0.7, 0.5, XK + sx * 7.96, 1.1, z, c, 3, { rx: PI, s: [0.12, 1, 1] });
      b.box(0.12, 0.12, 1.6, XK + sx * 7.94, 3.8, z, 0xd8a840, { r: 0 });
    }
    b.flush(level, { castShadow: false });
    level.world.add({ type: 'box', min: [XK - 9, 0, -69], max: [XK + 9, 6, -68] });
    for (const sx of [-1, 1]) level.world.add({ type: 'box', min: [XK + sx * 8.5 - 0.5, 0, -69], max: [XK + sx * 8.5 + 0.5, 6, -52.5] });
    level.world.add({ type: 'box', min: [XK - 1.8, 0, -67.3], max: [XK + 1.8, 1.4, -65.9], tag: 'altar' });
  }
  // ------------------------------------------------ Ufer des Giftsumpfs: Grabinselchen, Schilf (Kulisse)
  schneemann(level, [
    { pos: [6, 0, 6], yaw: PI * 0.75, lamp: true }, { pos: [-23, 0, -76], yaw: PI * 0.3, hat: 'muetze', scarf: 0x6ac8ff, size: 0.9 },
    { pos: [XZ - 6, 0, -330], yaw: PI * 0.6, lamp: true, scarf: 0xffd23a }, { pos: [XK - 5.5, 0, -63], yaw: PI * 0.4, size: 0.7, hat: 'muetze' },
    { pos: [-3.2, 0, -238.6], yaw: PI * 0.4, size: 0.7, hat: 'muetze', scarf: 0x9aff6a },
  ]);
  baenke(level, [{ pos: [-5, 0, -4], yaw: PI / 2 }, { pos: [5.2, 0, -30], yaw: PI / 2 }, { pos: [XZ + 5, 0, -332], yaw: 0 }, { pos: [-6, 0, -88] }]);
  kerzen(level, [
    { pos: [3.6, 0, -40.6], n: 3 }, { pos: [6.4, 0, -40.6], n: 3 }, { pos: [-14.5, 0, -66.2], n: 2 }, { pos: [-19.5, 0, -66.2], n: 2 },
    { pos: [XK - 1.2, 1.4, -66.6], n: 3, r: 0.3 }, { pos: [XK + 1.2, 1.4, -66.6], n: 3, r: 0.3 }, { pos: [XK - 6, 0, -66], n: 4, r: 0.4 }, { pos: [XK + 6, 0, -66], n: 4, r: 0.4 },
    { pos: [XK - 6, 0, -56], n: 3 }, { pos: [XK + 6, 0, -56], n: 3 }, { pos: [XZ - 2, 0, -337.6], n: 3 }, { pos: [XZ + 2, 0, -337.6], n: 3 },
  ]);
  // Holzsteg (Boost-Steg) mit Balkon und Stempel-Plattform, Steinstufe davor
  steg(level, [
    { x0: -1.1, x1: 1.1, z0: -266.2, z1: -306.2, top: YS, post: -1.6 },
    { x0: -3.8, x1: -1.1, z0: -278.4, z1: -283.6, top: YS, post: -1.6 },
    { x0: 3.0, x1: 5.6, z0: -300.6, z1: -305, top: YS, post: -1.6 },
  ]);
  sternlaterne(level, { pos: [-8.6, 1.9, -281], size: 1.6, post: [-11.2, -281], postY: -1.6, arm: 1.1 });
  // Bänke/Kerzen in der Nebelkammer, Schneehaufen bei den Schneebällen (Kulisse)
  const sh = new Bld();
  for (const [x, y, z, r] of [[-7.8, 0, -57.6, 0.9], [XR, 0, -180.2, 1.0], [-2.7, YS, -280.4, 0.7]]) {
    sh.sphere(r, x, y - r * 0.35, z, 0xf8faff, { s: [1.3, 0.65, 1.1], ws: 12, hs: 8 });
    sh.sphere(r * 0.55, x + r * 0.6, y - 0.05, z + r * 0.3, 0xeef2fc, { s: [1, 0.7, 1] });
  }
  sh.flush(level, { castShadow: false });
  // Eigene Arten: Grablicht, Krümel im Geisterring, unsichtbare Wolke, Friedhofstor
  grablicht(level, { id: 'grablicht', pos: [5, 0, -38.6], recharge: 14 });
  kruemelAngst(level, { id: 'kruemel', pos: [12, 0, -44], ring: 'kr', count: 8, onFree: { reveal: 'kruemelstern' } });
  unsichtbareWolke(level, { id: 'wolke', pos: [-19, 4.2, -29], size: [3, 0.6, 3] });
  friedhofstor(level, { id: 'tor', pos: [0, 0, -84], width: 6, height: 3.4, group: 'tor', lamps: 5 });
}

function setup(level) {
  schneebaelle(level, ['sb1', 'sb2', 'sb3', 'sb4', 'sb5']);
}

export const LEVEL = {
  id: 'S-8',
  world: 9,
  title: 'Geisterreigen im Schneenebelmoor',
  archetype: 'parcours',
  theme: 'fogbog',
  music: 'course_fogbog',
  timeLimit: 400,
  killY: -14,
  farHide: 56,
  instances: { coin: { farHide: 44, shadow: false } },
  build,
  setup,
  start: { pos: [0, 0, 9], yaw: PI / 2 },
  camera: [
    { from: 22, to: -36, pitch: 44, dist: 14, fov: 40, area: [-40, 50] },
    { from: -36, to: -86, pitch: 44, dist: 14.5, fov: 40, area: [-40, 50] },
    { from: -86, to: -174, pitch: 40, dist: 14, fov: 40, height: 1.4, area: [-40, 50] },
    { from: -174, to: -266, pitch: 46, dist: 13.5, fov: 40, height: 1.2, area: [-40, 50] },
    { from: -266, to: -324, pitch: 40, dist: 14, fov: 40, height: 1.4, area: [-40, 50] },
    // Kerzenkammer, Nebelkammer, Kapellenhügel
    { from: -48, to: -72, pitch: 36, dist: 14, fov: 42, height: 1.6, x: XK, xLock: 0.6, area: [XK - 30, XK + 30] },
    { from: -168, to: -198, pitch: 42, dist: 13, fov: 42, height: 1.2, x: XR, xLock: 0.5, area: [XR - 30, XR + 30] },
    { from: -316, to: -350, pitch: 38, dist: 14, fov: 42, height: 1.6, area: [XZ - 30, XZ + 30] },
  ],
  segments: [
    // ================================================================ 1 Schneefriedhof
    isl(-30, 30, 16, -84.6, 0, 6),
    isl(-8, 8, -84.6, -94, 0, 4),                                                  // Steg-Platz hinter dem Tor
    isl(-13.3, -10.7, 6.3, 3.7, 1.3, 1.3, { top: 'rock', under: 0, ...FELS }),             // Felsen im Kreisgeist-Ring (Schlüssel a)
    isl(31, 39, -53, -63, 6.5, 9, { top: 'rock', under: 4, ...FELS }),                     // Felssims ganz rechts (Schlüssel e)
    isl(-16.3, -14.9, -19.3, -20.7, 1.4, 1.4, { top: 'rock', under: 0, ...FELS }),         // Grabsockel vor der Westgruft (Tritt zum Dach)
    sign(-3.4, 0, 11.4, 'Nebelfriedhof', { yaw: 0.2 }),
    sign(3.6, 0, 11, '5 Schlüssel\nöffnen das Tor', { size: [2.6, 1.1], yaw: -0.2 }),
    sign(1.6, 0, -36.6, 'Stampf aufs\nGrablicht!', { size: [2.4, 1.05], yaw: 0.3 }),
    sign(-3.8, 0, -60.6, 'Schneebälle:\nAktion = werfen', { size: [2.8, 1.05], yaw: 0.15 }),
    { type: 'pow', id: 'pow_treppe', pos: [13, 0, -12], uses: 3, radius: 4, onUse: { reveal: 'grosstreppe' } },
    { type: 'appear', id: 'grosstreppe', style: 'stone', parts: [
      { pos: [19, 0, -15.8], size: [2.4, 1.2, 2.4] }, { pos: [19, 0, -18.4], size: [2.4, 2.4, 2.4] },
      { pos: [19, 0, -21], size: [2.4, 3.6, 2.4] }, { pos: [19, 0, -23.6], size: [2.4, 4.8, 2.4] },
    ], delay: 0.18 },
    { type: 'pow', id: 'pow_kaefig', pos: [-11, 0, -63], uses: 3, radius: 8, height: 3 },
    { type: 'deco_star', items: [
      { kind: 'grabstein', pos: [5, 0, -40.4], size: 1.9, variant: 'kreuz', solid: true },   // großer Grabstein mit dem Grablicht (Lachgesicht)
      { kind: 'grabstein', pos: [-9.6, 0, 7.4], size: 0.9, variant: 'rund' }, { kind: 'grabstein', pos: [9.2, 0, -12.8], size: 0.9, variant: 'spitz' },
      { kind: 'grabstein', pos: [-5.6, 0, -24.2], size: 1, variant: 'rund' }, { kind: 'grabstein', pos: [-5.4, 0, -61.4], size: 0.9, variant: 'kreuz' },
      // kahle Bäume, Schneehügel, Nebelbänke
      { kind: 'kahler_baum', pos: [-24, 0, 7], height: 5.5 }, { kind: 'kahler_baum', pos: [23.6, 0, 8], height: 5 }, { kind: 'kahler_baum', pos: [-24, 0, -27.6], height: 6 },
      { kind: 'kahler_baum', pos: [8, 0, -72], height: 6.5 }, { kind: 'kahler_baum', pos: [25, 0, -46], height: 5 }, { kind: 'kahler_baum', pos: [-6.4, 0, -42.6], height: 4.5 },
      { kind: 'schneehuegel', pos: [-20, 0, 5], radius: 2.2 }, { kind: 'schneehuegel', pos: [23.4, 0, -19], radius: 2 }, { kind: 'schneehuegel', pos: [-4.6, 0, -70], radius: 1.8 },
      { kind: 'schneehuegel', pos: [24, 0, 2.4], radius: 1.8 },
      { kind: 'nebelbank', pos: [-16, 0, -8], size: [14, 8], opacity: 0.32 }, { kind: 'nebelbank', pos: [14, 0, -58], size: [14, 9], opacity: 0.3 },
    ] },
    // ================================================================ 2 Floßfahrt über den Giftsumpf
    { type: 'giftwasser', id: 'giftsumpf', pos: [0, -3, -134], size: [44, 2.4, 84], bubbles: true },
    { type: 'floss', id: 'floss', pos: [0, -0.6, -96.4], speed: 3.4, size: [3, 3], style: 'holz',
      path: [[0, -0.6, -96.4], [0, -0.6, -105], [-5, -0.6, -115], [-5, -0.6, -127], [3, -0.6, -139], [3, -0.6, -153], [0, -0.6, -162], [0, -0.6, -171.4]] },
    isl(-14, -9, -114, -122, 0.4, 3, { top: 'rock', under: 0, ...MOOR }), isl(8, 13, -144, -151, 0.4, 3, { top: 'rock', under: 0, ...MOOR }),
    isl(9, 14, -110, -116, 0.3, 3, { top: 'rock', under: 0, ...MOOR }), isl(-13, -8, -152, -158, 0.3, 3, { top: 'rock', under: 0, ...MOOR }),
    { type: 'deco_star', items: [
      { kind: 'kahler_baum', pos: [11.6, 0.3, -113], height: 5 }, { kind: 'kahler_baum', pos: [-10.6, 0.3, -155], height: 5.5 },
      { kind: 'nebelbank', pos: [-12, -0.6, -134], size: [12, 10], opacity: 0.35 }, { kind: 'nebelbank', pos: [12, -0.6, -160], size: [12, 10], opacity: 0.35 },
    ] },
    // ================================================================ 3 Landeinsel
    isl(-10, 10, -172.8, -190, 0, 4),
    sign(-6.5, 0, -176.4, 'Nebelstufen', { yaw: 0.2 }),
    // ================================================================ 4 Nebelplattformen
    { type: 'nebelboden', id: 'nebelboden', pos: [0, -1.0, -228], size: [34, 78], depth: 1.5, kill: 'fall', density: 0.6, color: 0xdcd2f8,
      parts: [{ pos: [6.5, -0.6, -214.5], size: [2.6, 0.4, 2.6], up: 3, down: 2 }, { pos: [-6.5, -0.6, -214.5], size: [2.6, 0.4, 2.6], up: 3, down: 2, phase: 2.5 }] },
    { type: 'nebelplattform', id: 'nebelA', from: [0, 0, -193.6], to: [0, 0, -208.6], n: 5, depth: 3, up: 3.0, down: 1.6, move: 1.0, stagger: -1.1 },
    isl(-4, 4, -211, -219, 0, 3, { under: 0 }),
    { type: 'nebelplattform', id: 'nebelB1', mode: 'blinken', from: [-3, 0, -222.6], to: [-3, 0, -234], n: 4, up: 2.4, down: 1.4, stagger: -0.6 },
    { type: 'nebelplattform', id: 'nebelB2', from: [3, 0, -222.6], to: [3, 0, -234], n: 4, depth: 3, up: 3.0, down: 1.6, move: 1.0, stagger: -1.1, phase: 0.4 },
    isl(-4.5, 4.5, -237.5, -245.5, 0, 3, { under: 0 }),
    { type: 'nebelplattform', id: 'nebelC', depth: 3, up: 3.2, down: 1.4, move: 1.0,
      parts: [{ pos: [0, 0.7, -249], phase: 0 }, { pos: [0, 1.5, -253], phase: -1.1 }, { pos: [0, 2.3, -257], phase: -2.2 }, { pos: [0, 3.1, -261], phase: -3.3 }] },
    isl(-1.5, 1.5, -263.6, -266.4, YS, 4, { top: 'rock', under: 0, ...FELS }),
    { type: 'deco_star', items: [
      { kind: 'kahler_baum', pos: [3.6, 0, -239.4], height: 4.2 },
      { kind: 'kahler_baum', pos: [-10.5, -1.2, -208], height: 5.5 }, { kind: 'kahler_baum', pos: [10.8, -1.2, -219], height: 6 }, { kind: 'kahler_baum', pos: [-10.4, -1.2, -250], height: 5 },
      { kind: 'nebelbank', pos: [0, -1, -226], size: [18, 10], opacity: 0.3 }, { kind: 'nebelbank', pos: [-6, -1, -280], size: [12, 12], opacity: 0.3, color: 0xe0d0ff },
      { kind: 'nebelbank', pos: [-9, -1, -204], size: [10, 10], opacity: 0.34, color: 0xdcc8ff }, { kind: 'nebelbank', pos: [9, -1, -248], size: [10, 10], opacity: 0.34, color: 0xc8f0ff },
    ] },
    // ================================================================ 5 Boost-Steg, Ende
    { type: 'boost', pos: [0, YS, -269.6], dir: [0, -1], speed: 15, size: [1.8, 2.4] },
    { type: 'boost', pos: [0, YS, -289.6], dir: [0, -1], speed: 16, size: [1.8, 2.4] },
    isl(-6, 6, -306.2, -320, YS, 5),
    sign(-4, YS, -308.6, 'Zum Kapellenhügel', { size: [2.8, 0.95], yaw: 0.2 }),
    { type: 'deco_star', items: [
      { kind: 'schneehuegel', pos: [4, YS, -318.4], radius: 1.4 },
    ] },
    // ================================================================ Kerzenkammer (Nebenbereich)
    isl(XK - 9, XK + 9, -52, -69, 0, 4),
    // ================================================================ Nebelkammer (Rätselbox)
    isl(XR - 7, XR + 7, -172, -182, 0, 4),
    { type: 'nebelboden', pos: [XR, -1.6, -184], size: [14, 4], depth: 1.4, kill: 'fall', density: 0.7, color: 0xdcd2f8 },
    isl(XR - 7, XR + 7, -186, -193, -0.8, 3.2),
    { type: 'deco_star', items: [{ kind: 'kahler_baum', pos: [XR + 5.6, -0.8, -191.4], height: 4.4 }] },
    sign(XR - 4, 0, -174.6, 'Triff alle\nvier Scheiben!', { size: [2.6, 1.05], yaw: 0.2 }),
    // ================================================================ 6 Kapellenhügel (Ziel)
    isl(XZ - 10, XZ + 10, -318, -346, 0, 5),
    { type: 'deco_star', items: [
      { kind: 'kahler_baum', pos: [XZ - 7, 0, -342], height: 5 }, { kind: 'kahler_baum', pos: [XZ + 7.5, 0, -337], height: 5.5 },
      { kind: 'schneehuegel', pos: [XZ + 6, 0, -320], radius: 1.8 },
    ] },
    { type: 'deco_star', kind: 'modell', pos: [XZ, 0, -343], name: 'sternen_torbogen', opts: { width: 7, height: 5.5 }, yaw: -PI / 2 },
  ],
  blocks: [
    { kind: 'blockwand', pos: [-17, 0, -66], size: [3, 2, 1], block: 'brick' },          // Ziegelwand vor der Nordgruft
    { kind: 'hidden', pos: [XK + 3, 2.6, -58], content: 'oneup' },                        // Extraleben in der Kerzenkammer
    { kind: 'coinblock', pos: [XK - 3, 2.6, -58], count: 8 },
    { kind: 'hidden', pos: [-2.4, 2.6, -241.5], content: 'oneup' },                       // Extraleben auf der Rastinsel
    { kind: 'hidden', pos: [XZ + 4, 2.6, -326], content: 'oneup' },                       // Extraleben am Kapellenhügel
    { kind: 'question', pos: [-2.6, 2.4, -2], content: 'coins:5' },
  ],
  enemies: [
    kreis('fr', [-12, 0.25, 5], 7, 2.9, { speed: 1.2 }),                    // um den Schlüssel-Felsen
    kreis('kr', [12, 0.2, -44], 8, 2.4, { speed: 1.0, cw: true }),         // um Krümel
    kreis('baum', [8, 0.3, -72], 6, 2.6, { speed: 1.3 }),                   // um den kahlen Baum
    kreis('sumpf1', [-11.5, 0.6, -118], 5, 2.4, { speed: 1.1 }), kreis('sumpf2', [10.5, 0.6, -147.5], 6, 2.6, { speed: 1.2, cw: true }),
    geist('g1', [-13, 0.7, -6], 2.2), geist('g2', [24, 0.7, -50], 2.4, { cw: true }), geist('g3', [-12, 0.8, -38], 2.2, { phase: 0.5 }),
    geist('g4', [0, 1.0, -228.3], 1.2, { speed: 1.2 }), geist('g5', [XZ + 4, 1.2, -336], 2.2, { speed: 1.0 }),
  ],
  items: [
    // Schlüsselmünzen (5) → Friedhofstor
    { kind: 'schluesselmuenze', id: 'ka', group: 'tor', pos: [-12, 1.5, 5], onAll: { open: 'tor' } },
    { kind: 'schluesselmuenze', id: 'kb', group: 'tor', pos: [19, 6.2, -23.6] },
    { kind: 'schluesselmuenze', id: 'kc', group: 'tor', pos: [-19, 5.2, -29] },
    { kind: 'schluesselmuenze', id: 'kd', group: 'tor', pos: [-17, 0.3, -67.4] },
    { kind: 'schluesselmuenze', id: 'ke', group: 'tor', pos: [33.6, 6.7, -58] },
    // Türen: Gruft am linken Zaun ↔ Felssims; Kapelle ↔ Kerzenkammer
    { kind: 'tuer', id: 'tuer_links', pos: [-25.2, 0, -46], yaw: 0, style: 'stein', target: 'tuer_sims', open: true },
    { kind: 'tuer', id: 'tuer_sims', pos: [37.6, 6.5, -58], yaw: PI, style: 'stein', target: 'tuer_links', open: true },
    { kind: 'tuer', id: 'tuer_kapelle', pos: [23, 0, -64.4], yaw: -PI / 2, style: 'holz', target: 'tuer_kammer', open: true },
    { kind: 'tuer', id: 'tuer_kammer', pos: [XK, 0, -53.2], yaw: PI / 2, style: 'holz', target: 'tuer_kapelle', open: true },
    // Schneebälle (Wurfbälle)
    { kind: 'wurfball', id: 'sb1', pos: [-7.4, 0, -58.6], size: 0.5, life: 3, respawn: 1.2 },
    { kind: 'wurfball', id: 'sb2', pos: [-8.4, 0, -57.2], size: 0.5, life: 3, respawn: 1.2 },
    { kind: 'wurfball', id: 'sb3', pos: [XR - 1.4, 0, -180.4], size: 0.5, life: 2.5, respawn: 1 },
    { kind: 'wurfball', id: 'sb4', pos: [XR + 1.4, 0, -180.4], size: 0.5, life: 2.5, respawn: 1 },
    { kind: 'wurfball', id: 'sb5', pos: [-2.6, YS, -281.6], size: 0.5, life: 2.5, respawn: 1 },
    // Zielscheiben in der Nebelkammer (Stern 1)
    ...[-4.5, -1.5, 1.5, 4.5].map((dx) => ({ kind: 'zielscheibe', group: 'nebelziele', pos: [XR + dx, -0.15, -187.4], size: 1.2, onAll: { reveal: 'raetselstern' } })),
    // Warp-Boxen: Rätselbox ↔ Nebelkammer, Ende ↔ Kapellenhügel
    { kind: 'warpbox', id: 'raetsel', style: 'mystery', pos: [6.5, 0, -183], target: 'raetsel_raum' },
    { kind: 'warpbox', id: 'raetsel_raum', style: 'mystery', pos: [XR + 4.5, 0, -174.6], target: 'raetsel' },
    { kind: 'warpbox', id: 'zielwarp', pos: [0, YS, -315], target: 'zielankunft' },
    { kind: 'warpbox', id: 'zielankunft', pos: [XZ, 0, -322.4], target: 'zielwarp' },
    // Bitcoin-Pfade
    line([0, 0.6, 5], [0, 0.6, -12], 7), ring([6, 0.6, 6], 2.2, 8), column(19, -23.6, 5.4, 5.4, 1),
    line([16, 0.6, -14], [18.4, 0.6, -14], 2), line([19, 1.8, -15.8], [19, 5.4, -21], 3),
    line([-15.6, 2.0, -20], [-19, 3.9, -22.4], 3), line([0, 0.6, -20], [0, 0.6, -34], 6),
    ring([12, 0.6, -44], 1.0, 6), line([0, 0.6, -46], [0, 0.6, -80], 10), line([-27, 0.6, -40], [-27, 0.6, -36], 2),
    line([32, 7.1, -55], [32, 7.1, -61], 3), line([-10, 0.6, -58], [-14, 0.6, -58], 3),
    line([0, 0.6, -86], [0, 0.6, -92], 3),
    ...arc([0, 0.4, -104], [-5, 0.4, -116], 5, 1.4), ...arc([-5, 0.4, -128], [3, 0.4, -138], 5, 1.4), ...arc([3, 0.4, -152], [0, 0.4, -164], 5, 1.4),
    ring([0, 0.6, -182], 2.4, 8),
    line([0, 1.2, -193.6], [0, 1.2, -208.6], 5), ring([0, 0.6, -215], 2, 6), line([3, 1.2, -222.6], [3, 1.2, -234], 4), line([-3, 1.2, -222.6], [-3, 1.2, -234], 4),
    line([0, 1.8, -249], [0, 4.3, -261], 4), line([0, YS + 0.6, -272], [0, YS + 0.6, -300], 10), line([-2.6, YS + 0.6, -279], [-2.6, YS + 0.6, -283], 2),
    ring([0, YS + 0.6, -313], 2.2, 8),
    ring([XK, 0.6, -60], 3, 12), line([XK - 6, 0.6, -64], [XK + 6, 0.6, -64], 6),
    ring([XZ, 0.6, -330], 2.6, 10),
  ],
  checkpoint: [{ pos: [0, 0, -88.6], yaw: PI / 2 }, { pos: [0, 0, -186.4], yaw: PI / 2 }],
  stars: [
    { pos: [12, 1.4, -44], hidden: true, id: 'kruemelstern' },          // 0: Krümel im Geisterring (Funkelstern vom Grablicht)
    { pos: [XR, 0.4, -177.6], hidden: true, id: 'raetselstern' },       // 1: Nebelkammer – alle vier Zielscheiben getroffen
    [-8.6, 2.15, -281],                                                 // 2: in der Sternlaterne neben dem Steg (Schneeball)
  ],
  stamp: [4.3, YS + 0.3, -302.8],
  goal: [XZ, 0, -337],
  marks: {
    start: [0, 0, 9], fels: [-12, 0, 9.4], pow: [13, 0, -9], treppe: [19, 0, -13.4], gruftW: [-15.6, 0, -18], wolke: [-19, 4.8, -29],
    licht: [5, 0, -38.6], kruemel: [12, 0, -44], tuerL: [-23.6, 0, -46], sims: [34, 6.5, -58], kapelle: [23, 0, -62.6], kammer: [XK, 0, -56],
    baelle: [-7.8, 0, -56.2], nordgruft: [-17, 0, -63.6], tor: [0, 0, -81.4], steg: [0, 0, -90], floss: [0, -0.18, -96.4],
    landung: [0, 0, -176.6], raetsel: [6.5, 0, -180.6], raum: [XR, 0, -176.6], nebel: [0, 0, -190.6], rast1: [0, 0, -215], rast2: [0, 0, -241.5],
    stufe: [0, YS, -265], balkon: [-2.6, YS, -281], stempel: [4.3, YS, -302.8], ende: [0, YS, -310], ziel: [XZ, 0, -326],
  },
};
