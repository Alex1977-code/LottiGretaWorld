// 4-Burg „Glutburg des Felsenkönigs“ – Welt-4-Finale (Archetyp boss, Bauplan 4-Burg: Lava-Burg, Boss Lavafelsen-König).
// Eine Burg mitten im Lavasee: Basaltmauern mit Glutrissen, Türme mit roten Spitzdächern, Lavafälle aus den Mauern,
// Brummbär-Banner, Fackeln und Ketten. Vom Zinnenwehrgang geht es den Hang hinab in den Vorhof, über drei
// Drehplattformen, im Glasrohr durch den Lavasee, über den langen Burgpfad und durch die Lavafunken-Reihe zur Röhre
// in den Thronsaal. Dort wartet der Lavafelsen-König – nur geworfene Lavabrocken treffen ihn. Nach dem Sieg braust
// Baron Brummbär über die Burgbrücke heran, schimpft und flieht; die Warp-Box führt zum Burgtor mit dem Zielmast.
//
// Abschnitte (Lava y 0, Burgpfad y 2, Fahrtrichtung −Z):
//   1 Hochstart        z  +9 … −41   Zinnenterrasse (y 10), Hang hinab (Lavabrocken, Ziegel), Vorhof (y 4) mit
//                                    Pilzlingsturm, Lavabrocken, Lavaschlot und zwei Druckfeldern → die Fallbrücke
//                                    kracht über den Graben zum Sternturm (Stern 1)
//   2 Drehplattformen  z −41 … −104  Treppe hinab, drei Drehplattformen über der Lava (Balken, Dreistern, Kreuz) mit
//                                    Lavafunken, roter Ring (8 rote Münzen → Extraleben); Kontrollpunkt
//   3 Lavarohr + Pfad  z −104 … −214 Glasrohr durch den Lavasee → Rohrhof: links die Kletterwand (Krallen-Anzug aus
//                                    dem ?-Block → Stempel), rechts drei Druckfelder (zwei Lavabrocken + die Figur →
//                                    Fallgitter öffnet, Stern 2); langer Pfad mit Pilzlingstürmen und Lavabrocken,
//                                    Warp-Box zum Turmbalkon (x ≈ 30: Lavabrocken von der Kante aufs Druckfeld werfen
//                                    → Trittsteine steigen aus der Lava, Stern 3), Lavafunken-Reihe, Kontrollpunkt,
//                                    Boss-Röhre (dahinter ein unsichtbarer Block mit Wachstumsbeere)
//   4 Thronsaal        z −220 … −262 Arena (Käfig r 11,5, Stimmung „innen“): Lavafelsen-König, 3 Treffer
//   5 Burgtor          z −274 … −302 Warp-Box nach dem Sieg → Terrasse vor dem Burgtor, Zielmast
// Sterne: 1 Sternturm (Fallbrücke: Lavabrocken auf ein Druckfeld, selbst aufs andere), 2 Rohrhof (drei Druckfelder),
// 3 Turmbalkon (Lavabrocken von der Kante aufs Druckfeld). Stempel: Kletterwand links nach dem Lavarohr.
// Geheimnis: unsichtbarer Block hinter der Boss-Röhre (Wachstumsbeere).
// Level-Haken (LEVEL.setup, _helpers_d.js): Lavasee, Burgmauern, Türme, Lavafälle, Banner, Fackeln, Ketten, Glut,
// Fallbrücke, Lavaschlote, Thronsaal-Boden, Stimmung, Baron-Szene, Budget (cullStatic, Instanzen, Fern-Ausblendung).

import {
  isl, line, ring, levelSetup, cullStatic, farHide, teileInstanzen, heroShadowDiet, lavaSee, lavaFaelle, glutSaum, burgBoden, burgMauer, tuerme,
  fackeln, banner, ketten, funkenFlug, thronSaal, baronStatue, teppich, fallBruecke, brockenQuelle, stimmung, baronSzene,
} from './_helpers_d.js';

const PI = Math.PI;
const Y0 = 10;     // Zinnenterrasse (Start)
const Y1 = 4;      // Vorhof
const Y = 2;       // Burgpfad
const LY = 0;      // Lava-Oberfläche
const YB = 7;      // Turmbalkon
const AZ = -240;   // Arena-Mitte (z)
const AR = 11.5;   // Käfig-Innenradius

// Lavafunke (Reihe quer zum Weg): x0 = linkes Glied
const funke = (x, z, o = {}) => ({ kind: 'lavafunke', pos: [x, LY, z], height: o.height ?? 3.6, period: o.period ?? 2.4, phase: o.phase ?? 0, count: o.count ?? 1, spacing: o.spacing ?? 1, dir: o.dir ?? [1, 0], stagger: o.stagger ?? 0.12, ...(o.id ? { id: o.id } : {}) });

function setup(level) {
  // ---------------- Lavasee, Glut über der Lava, glühender Saum an den Inseln
  lavaSee(level, { x0: -40, x1: 48, zA: 14, zB: -308, y: LY, cell: 3 });
  const rects = level.data.segments.filter((s) => s.type === 'island' && s.pos[1] < LY + 0.5).map((s) => [s.pos[0] - s.size[0] / 2, s.pos[0] + s.size[0] / 2, s.pos[2] + s.size[2] / 2, s.pos[2] - s.size[2] / 2]);
  glutSaum(level, rects, LY);
  // Burgboden (Steinplatten) auf allen begehbaren Inseln, Rampe am Hang
  const tops = level.data.segments.filter((s) => s.type === 'island' && s.top !== 'none').map((s) => ({ x0: s.pos[0] - s.size[0] / 2, x1: s.pos[0] + s.size[0] / 2, zA: s.pos[2] + s.size[2] / 2, zB: s.pos[2] - s.size[2] / 2, y: s.pos[1] + s.size[1] }));
  burgBoden(level, [...tops, { x0: -4, x1: 4, zA: -3, zB: -19, yA: Y0, yB: Y1, frame: false, cracks: 1 }]);
  funkenFlug(level, [[-14, -6, 0, -40], [-12, 12, -45, -100], [-10, 10, -104, -128], [-14, 14, -150, -215], [20, 44, -170, -200], [-28, 28, -222, -262]], LY, { n: 160 });
  // ---------------- Burgmauern und Türme
  burgMauer(level, [
    // Abschnitt 1: Wehrgang links hinter dem Sternturm, rechts am Vorhof
    { from: [-33, LY, 8], to: [-33, LY, -46], height: 9 },
    { from: [15, LY, 8], to: [15, LY, -46], height: 9 },
    // Abschnitt 2–3: Seitenmauern am Lavagraben
    { from: [-17, LY, -46], to: [-17, LY, -216], height: 8 },
    { from: [16, LY, -46], to: [16, LY, -152], height: 8 },
    { from: [47, LY, -150], to: [47, LY, -206], height: 9 },
    { from: [16, LY, -204], to: [16, LY, -216], height: 8 },
    // Querverbindungen (Kulisse, ohne Kollision auf dem Weg)
    { from: [-33, LY, -46], to: [-17, LY, -46], height: 9 },
    { from: [15, LY, -46], to: [16, LY, -46], height: 8 },
    // Thronsaal: Seitenmauern mit Toren für die Burgbrücke, Rückwand
    { from: [-31, LY, -218], to: [-31, LY, -253.6], height: 12 },
    { from: [-31, LY, -258.4], to: [-31, LY, -272], height: 12 },
    { from: [31, LY, -218], to: [31, LY, -253.6], height: 12 },
    { from: [31, LY, -258.4], to: [31, LY, -272], height: 12 },
    { from: [-31, LY, -272], to: [31, LY, -272], height: 15, face: 1 },
    // Brüstungen (niedrig, mit Zinnen): Zinnenterrasse, Vorhof, Rohrhof
    { from: [-7.3, Y0, 9], to: [-7.3, Y0, -2.6], height: 1, thick: 0.6, slits: false, glow: false },
    { from: [7.3, Y0, 9], to: [7.3, Y0, -2.6], height: 1, thick: 0.6, slits: false, glow: false },
    { from: [-7, Y0, 9.3], to: [7, Y0, 9.3], height: 1, thick: 0.6, slits: false, glow: false, face: -1 },
    { from: [8.3, Y1, -19.4], to: [8.3, Y1, -41], height: 0.9, thick: 0.6, slits: false, glow: false },
    { from: [-8.3, Y1, -19.4], to: [-8.3, Y1, -28.1], height: 0.9, thick: 0.6, slits: false, glow: false },
    { from: [-8.3, Y1, -33.9], to: [-8.3, Y1, -41], height: 0.9, thick: 0.6, slits: false, glow: false },
    { from: [10.3, Y, -125.4], to: [10.3, Y, -150.6], height: 0.9, thick: 0.6, slits: false, glow: false },
    { from: [3.2, Y, -151.3], to: [4.6, Y, -151.3], height: 0.9, thick: 0.6, slits: false, glow: false, face: 1 },
    { from: [-10.3, Y, -125.4], to: [-10.3, Y, -131.8], height: 0.9, thick: 0.6, slits: false, glow: false },
    { from: [-10.3, Y, -138.2], to: [-10.3, Y, -151], height: 0.9, thick: 0.6, slits: false, glow: false },
    { from: [-7.8, Y, -275], to: [-7.8, Y, -301], height: 0.9, thick: 0.6, slits: false, glow: false },
    { from: [7.8, Y, -275], to: [7.8, Y, -301], height: 0.9, thick: 0.6, slits: false, glow: false },
    // Burgtor (Ziel): Mauer mit Tor in der Mitte
    { from: [-14, LY, -304], to: [-2.6, LY, -304], height: 9, face: 1 },
    { from: [2.6, LY, -304], to: [14, LY, -304], height: 9, face: 1 },
  ]);
  // Säulen mit Feuerschalen rings um die Arena (stehen in der Lava, nicht zur Kamera hin)
  // Säulen rund um den Käfig; hinten (Winkel π) bleibt eine Lücke – dort hält Baron Brummbär auf der Burgbrücke
  const saeulen = [0.85, 1.55, 2.3, 3.98, 4.73, 5.43].map((a) => ({ pos: [Math.sin(a) * 15.2, LY, AZ + Math.cos(a) * 15.2], r: 1.25, height: 9.5, roof: false, solid: false }));
  tuerme(level, [
    ...saeulen,
    { pos: [-33, LY, 9], r: 3, height: 14 }, { pos: [15, LY, 9], r: 3, height: 14 },
    { pos: [-33, LY, -46], r: 2.8, height: 13 }, { pos: [15.5, LY, -46], r: 2.8, height: 13 },
    { pos: [-25, Y1, -38.5], r: 2.4, height: 9 },                                  // Sternturm
    { pos: [-17, LY, -104], r: 2.6, height: 12 }, { pos: [16, LY, -104], r: 2.6, height: 12 },
    { pos: [16, LY, -152], r: 3, height: 14 }, { pos: [47, LY, -150], r: 3, height: 13 }, { pos: [30, YB, -155.5], r: 3.6, height: 9 },
    { pos: [47, LY, -206], r: 3, height: 13 }, { pos: [-17, LY, -216], r: 3, height: 14 }, { pos: [16, LY, -216], r: 3, height: 14 },
    { pos: [-31, LY, -272], r: 3.4, height: 18 }, { pos: [31, LY, -272], r: 3.4, height: 18 },
    { pos: [-14, LY, -304], r: 3, height: 13 }, { pos: [14, LY, -304], r: 3, height: 13 },
  ]);
  // ---------------- Lavafälle aus den Mauern
  lavaFaelle(level, [
    { pos: [-32.2, LY, -12], width: 3, height: 8.2, yaw: PI / 2 },
    { pos: [14.2, LY, -6], width: 2.6, height: 8.2, yaw: -PI / 2 },
    { pos: [-16.2, LY, -70], width: 3.2, height: 7.4, yaw: PI / 2 },
    { pos: [15.2, LY, -86], width: 3.2, height: 7.4, yaw: -PI / 2 },
    { pos: [-16.2, LY, -118], width: 4, height: 7.4, yaw: PI / 2 },
    { pos: [-16.2, LY, -190], width: 3, height: 7.4, yaw: PI / 2 },
    { pos: [46.2, LY, -186], width: 4, height: 8.2, yaw: -PI / 2 },
    { pos: [-18, LY, -271.2], width: 4, height: 14.4, yaw: 0 },
    { pos: [18, LY, -271.2], width: 4, height: 14.4, yaw: 0 },
  ]);
  // ---------------- Banner, Fackeln, Ketten
  banner(level, [
    { pos: [-5.5, Y0 + 4.2, 8.4], height: 3.2, width: 1.6, yaw: 0 }, { pos: [5.5, Y0 + 4.2, 8.4], height: 3.2, width: 1.6, yaw: 0 },
    { pos: [-31.9, 7.8, -20], height: 3.6, width: 1.6, yaw: PI / 2 }, { pos: [13.9, 7.8, -30], height: 3.6, width: 1.6, yaw: -PI / 2, motif: 1 },
    { pos: [-15.9, 7, -95], height: 3.4, yaw: PI / 2 }, { pos: [14.9, 7, -60], height: 3.4, yaw: -PI / 2, motif: 1 },
    { pos: [-15.9, 7, -160], height: 3.4, yaw: PI / 2, motif: 1 }, { pos: [14.9, 7, -140], height: 3.4, yaw: -PI / 2 },
    { pos: [30, YB + 7.6, -152.2], height: 3.2, width: 1.6, yaw: 0 },
    { pos: [-8, 13, -270.9], height: 6, width: 2.6, yaw: 0 }, { pos: [8, 13, -270.9], height: 6, width: 2.6, yaw: 0 },
    { pos: [-26, 9, -270.9], height: 4, width: 1.8, yaw: 0, motif: 1 }, { pos: [26, 9, -270.9], height: 4, width: 1.8, yaw: 0, motif: 1 },
    { pos: [-6, 8.4, -303.1], height: 3.6, width: 1.8, yaw: 0 }, { pos: [6, 8.4, -303.1], height: 3.6, width: 1.8, yaw: 0 },
  ]);
  fackeln(level, [
    { pos: [-6.6, Y0, 3], post: 1.5 }, { pos: [6.6, Y0, 3], post: 1.5 },
    { pos: [-7.4, Y1, -20], post: 1.4 }, { pos: [7.4, Y1, -20], post: 1.4 }, { pos: [7.4, Y1, -40], post: 1.4 },
    { pos: [-21.9, Y1, -26], post: 1.3 }, { pos: [-21.9, Y1, -36], post: 1.3 },
    { pos: [-3.6, Y, -47.5], post: 1.2 }, { pos: [3.6, Y, -47.5], post: 1.2 },
    { pos: [-4.4, Y, -90.5], post: 1.3 }, { pos: [4.4, Y, -90.5], post: 1.3 },
    { pos: [-9.4, Y, -126], post: 1.4 }, { pos: [9.4, Y, -126], post: 1.4 }, { pos: [9.4, Y, -150], post: 1.4 },
    { pos: [-2.5, Y, -175.5], post: 1.2 }, { pos: [9.4, Y, -175.5], post: 1.2 },
    { pos: [25.6, YB, -169.4], post: 1.2 }, { pos: [34.4, YB, -169.4], post: 1.2 },
    { pos: [25.6, Y, -185.6], post: 1.3 }, { pos: [34.4, Y, -185.6], post: 1.3 }, { pos: [25.6, Y, -193.4], post: 1.3 }, { pos: [34.4, Y, -193.4], post: 1.3 },
    { pos: [-4.4, Y, -202.2], post: 1.4 }, { pos: [4.4, Y, -202.2], post: 1.4 },
    ...saeulen.map((q) => ({ pos: [q.pos[0], LY + 10.2, q.pos[2]], post: 0.3 })),
    { pos: [-7.4, Y, -276], post: 1.5 }, { pos: [7.4, Y, -276], post: 1.5 }, { pos: [-3.4, Y, -302], post: 1.6 }, { pos: [3.4, Y, -302], post: 1.6 },
  ]);
  ketten(level, [
    { from: [-16.2, 7.6, -130], to: [-16.2, 7.6, -146], sag: 2.2 },
    { from: [15.2, 7.6, -112], to: [15.2, 7.6, -128], sag: 2.2 },
    { from: [-30.2, 11, -224], to: [-30.2, 11, -250], sag: 3.4 }, { from: [30.2, 11, -224], to: [30.2, 11, -250], sag: 3.4 },
    { pos: [-4, 14.6, -271], length: 5 }, { pos: [4, 14.6, -271], length: 5 }, { pos: [-14, 14.6, -271], length: 3.4 }, { pos: [14, 14.6, -271], length: 3.4 },
  ]);
  // ---------------- Mechanik: Fallbrücke (Stern 1), Lavaschlote
  fallBruecke(level, {
    id: 'fallbruecke', x0: -21.6, x1: -8, zA: -29.2, zB: -32.8, y: Y1, hang: 6.5,
    anchors: [[-22.2, Y1 + 9.4, -33.6], [-7.4, Y1 + 9.4, -33.6], [-7.4, Y1 + 9.4, -33.2], [-22.2, Y1 + 9.4, -33.2]],
  });
  brockenQuelle(level, { id: 'schlot1', pos: [6, Y1, -25], keep: 2, area: [-8, 8, -19, -41] });
  brockenQuelle(level, { id: 'schlot2', pos: [-5.6, Y, -147], keep: 2, area: [-10, 10, -125, -151], phase: 1 });
  brockenQuelle(level, { id: 'schlot3', pos: [33.6, YB, -161.4], keep: 1, area: [25, 35, -159, -170], phase: 2, spec: { behavior: 'walk', sight: 4 } });
  // ---------------- Thronsaal, Burgtor
  thronSaal(level, { x: 0, y: Y, z: AZ, r: AR + 0.9, throne: [0, Y + 0.5, -265.5] });
  baronStatue(level, { pos: [-4.6, Y, -289], yaw: -PI / 2 + 0.35, tilt: 0.16 });
  teppich(level, { x: 0, y: Y, z0: -276.5, z1: -294.6, w: 3 });
  baronStatue(level, { pos: [-3.4, Y0, 7.6], yaw: -PI / 2 - 0.25, size: 0.7 });
  stimmung(level, [{ min: [-40, -272], max: [40, -218], mood: 'innen' }]);
  level._baron = baronSzene(level, { from: [-40, Y, -256], stop: [0, Y, -256], away: [44, Y, -256] });
  // ---------------- Budget
  teileInstanzen(level, ['pilzlingsturm', 'lavabrocken', 'lavafunke', 'pilzling'], { name: 'gegner' });
  heroShadowDiet(level, 0.12);
  farHide(level, ['lavafunke', 'pfeld', 'warpbox', 'checkpoint', 'goal', 'pilzlingsturm', 'lavabrocken'], 44);
}

const CAM_MAIN = [-32, 18];

export const LEVEL = {
  id: '4-Burg',
  world: 4,
  title: 'Glutburg des Felsenkönigs',
  archetype: 'boss',
  theme: 'lavacastle',
  music: 'course_lavacastle',
  timeLimit: 400,
  killY: -8,
  start: { pos: [0, Y0, 5], yaw: PI / 2 },
  setup: (level, scene) => { levelSetup(setup)(level, scene); cullStatic(level); },
  camera: [
    { from: 14, to: -19, pitch: 42, dist: 14, ahead: 2.6, area: CAM_MAIN },
    { from: -19, to: -42, pitch: 46, dist: 14, ahead: 2, area: CAM_MAIN },
    { from: -42, to: -104, pitch: 50, dist: 13.5, ahead: 2.4, area: CAM_MAIN },
    { from: -104, to: -151, pitch: 46, dist: 14, ahead: 2.2, area: CAM_MAIN },
    { from: -151, to: -216, pitch: 46, dist: 13.5, ahead: 2.6, area: CAM_MAIN },
    { from: -150, to: -200, pitch: 52, dist: 14, ahead: 3, area: [18, 46] },
    { from: -220, to: -262, pitch: 41, dist: 18.5, x: 0, xLock: 0.35, ahead: 0.5, lead: 0.4, height: 1.6 },
    { from: -270, to: -306, pitch: 42, dist: 12.5, ahead: 2 },
  ],
  boss: {
    id: 'koenig', name: 'Lavafelsen-König', speed: 0,
    trigger: { min: [-AR, Y - 0.5, AZ - AR], max: [AR, Y + 8, AZ + AR - 3.1] },
    warp: 'warp_sieg', warpPos: [0, Y, AZ + 7], warpTo: [0, Y + 0.3, -280], frame: 0.3, musicAfter: 'course_lavacastle',
  },
  segments: [
    // ======================================================== 1 Hochstart
    isl(-7, 7, 9, -3, Y0, 12),
    { type: 'ramp', pos: [0, Y1, -11], size: [8, Y0 - Y1, 16], axis: 'z', dir: 1, top: 'stone' },
    isl(-4, 4, -3, -19, Y1, 6, { top: 'none' }),
    isl(-8, 8, -19, -41, Y1, 6),
    isl(-28.6, -21.6, -25, -37, Y1, 6),                     // Sternturm-Plattform
    { type: 'wall', pos: [-7.4, Y1, -33.6], size: [1, 9.6, 1], style: 'stone' },        // Kettenpfosten der Fallbrücke
    { type: 'wall', pos: [-22.2, Y1, -33.6], size: [1, 9.6, 1], style: 'stone' },
    { type: 'wall', pos: [-28.6, Y1, -31], size: [1, 3.4, 12], style: 'stone' },        // Sternturm: Brüstung hinten
    { type: 'wall', pos: [-25.1, Y1, -25], size: [7, 1.1, 0.6], style: 'stone' },
    { type: 'wall', pos: [-25.1, Y1, -37], size: [7, 1.1, 0.6], style: 'stone' },
    { type: 'sign', pos: [-5.6, Y1, -23.2], text: 'Zwei Felder –\neine Brücke!' },
    // ======================================================== 2 Drehplattformen
    { type: 'stairs', pos: [0, Y, -43], dir: '+z', steps: 2, rise: 1, run: 1, width: 6, style: 'stone' },
    isl(-4, 4, -41, -48.5, Y, 6),
    { type: 'drehplattform', id: 'dreh1', axis: 'y', pos: [0, Y - 0.5, -54], arms: 2, length: 4.3, width: 2, speed: 0.7, style: 'lava' },
    isl(-3, 3, -59.5, -63.5, Y, 6),
    { type: 'drehplattform', id: 'dreh2', axis: 'y', pos: [0, Y - 0.5, -69], arms: 3, length: 4.4, width: 2, speed: -0.65, style: 'lava' },
    isl(-3, 3, -74.5, -78.5, Y, 6),
    { type: 'drehplattform', id: 'dreh3', axis: 'y', pos: [0, Y - 0.5, -84], arms: 4, length: 4.4, width: 1.9, speed: 0.8, style: 'lava' },
    isl(-5, 5, -89.5, -104, Y, 6),
    // ======================================================== 3 Lavarohr und Pfad
    { type: 'lavarohr', id: 'lavarohr', path: [[0, Y + 0.6, -102.5], [0, 0.45, -107.5], [-3.5, 0.45, -114.5], [0, 0.45, -121.5], [0, Y + 0.6, -126.6]], lava: LY, coins: 5 },
    isl(-10, 10, -125, -151, Y, 6),                          // Rohrhof
    { type: 'wall', pos: [-8.5, Y, -135], size: [3, 7, 6], climbable: true },           // Kletterwand (Stempel)
    isl(4.6, 10.4, -151, -156.4, Y, 6),                      // Nische für Stern 2 (Fallgitter zur Kamera)
    { type: 'wall', pos: [4.9, Y, -153.7], size: [0.6, 4.4, 5.4], style: 'stone' },
    { type: 'wall', pos: [10.1, Y, -153.7], size: [0.6, 4.4, 5.4], style: 'stone' },
    { type: 'wall', pos: [7.5, Y, -156.1], size: [5.8, 4.4, 0.6], style: 'stone' },
    { type: 'wall', pos: [5.2, Y + 3.6, -151.3], size: [1.2, 0.8, 0.6], style: 'stone' },
    { type: 'wall', pos: [9.8, Y + 3.6, -151.3], size: [1.2, 0.8, 0.6], style: 'stone' },
    { type: 'platform', pos: [7.5, Y + 4.4, -153.7], size: [6, 0.4, 5.6], style: 'stone' },
    { type: 'deco_w4', items: [{ kind: 'fallgitter', id: 'gitter2', pos: [7.5, Y, -151.3], width: 3.6, height: 3.6, yaw: PI / 2 }] },
    isl(-3, 3, -151, -162, Y, 6),
    isl(-3, 10, -162, -176, Y, 6),
    isl(-3, 3, -176, -188, Y, 6),
    isl(-1.1, 1.1, -189.6, -192, Y, 6),                      // Trittsteine der Lavafunken-Reihe
    isl(-1.1, 1.1, -193.6, -196, Y, 6),
    isl(-1.1, 1.1, -197.6, -200, Y, 6),
    isl(-5, 5, -201.6, -214, Y, 6),
    { type: 'pipe', id: 'boss_roehre', pos: [0, Y, -209], height: 1.2, radius: 0.95, color: 0xc8202a, target: [0, Y + 0.4, AZ + AR - 2.4] },
    { type: 'sign', pos: [-3.4, Y, -205.6], text: 'Thronsaal' },
    // Turmbalkon (Stern 3)
    isl(25, 35, -159, -170, YB, 9),
    { type: 'wall', pos: [25.25, YB, -164.5], size: [0.5, 1.1, 11], style: 'stone' },
    { type: 'wall', pos: [34.75, YB, -164.5], size: [0.5, 1.1, 11], style: 'stone' },
    isl(28.8, 31.2, -176.9, -179.5, 3, 5),                   // Säule mit Druckfeld
    isl(25, 35, -185, -194, Y, 6),                            // Stern-Podest
    { type: 'appear', id: 'weg3', style: 'stone', color: 0x6a5a60, parts: [
      { pos: [30, Y - 0.6, -172.6], size: [2.4, 0.6, 2.4] }, { pos: [27.2, Y - 0.6, -175.8], size: [2.4, 0.6, 2.4] },
      { pos: [27.2, Y - 0.6, -179.6], size: [2.4, 0.6, 2.4] }, { pos: [28.6, Y - 0.6, -183], size: [2.4, 0.6, 2.4] },
    ] },
    { type: 'sign', pos: [32.6, YB, -168.4], text: 'Brocken aufs Feld\nwerfen!' },
    // ======================================================== 4 Thronsaal (Arena)
    { type: 'arena_cage', pos: [0, Y, AZ], radius: AR, height: 4.6, floor: Y + 2, ceiling: 0, gate: PI, low: 0.9, color: 0x8a2a1e },
    isl(-31, 31, -254.4, -257.6, Y, 6),                       // Burgbrücke (Baron-Szene)
    isl(-6, 6, -261, -270, Y + 0.5, 6.5),                     // Thronpodest
    // ======================================================== 5 Burgtor (Ziel)
    isl(-7.5, 7.5, -274, -303, Y, 6),
    { type: 'deco_w4', items: [{ kind: 'fallgitter', pos: [0, LY, -304], width: 4.6, height: 6.5, yaw: PI / 2, open: true, solid: false }] },
    { type: 'sign', pos: [-5.4, Y, -279], text: 'Ausgang' },
  ],
  blocks: [
    { kind: 'question', pos: [3, Y0 + 2.2, 1.5], content: 'wachstumsbeere' },
    { kind: 'coinblock', pos: [-3, Y0 + 2.2, 1.5], count: 6 },
    { kind: 'brick', pos: [-1.5, Y1 + 3, -21.5], content: 'coin' }, { kind: 'brick', pos: [-0.5, Y1 + 3, -21.5] },
    { kind: 'question', pos: [0.5, Y1 + 3, -21.5], content: 'coins:3' }, { kind: 'brick', pos: [1.5, Y1 + 3, -21.5], content: 'coin' },
    { kind: 'brick', pos: [-6, Y1 + 2.6, -38] }, { kind: 'brick', pos: [-5, Y1 + 2.6, -38] },
    { kind: 'question', pos: [-2, Y + 2, -130.5], content: 'krallen' },
    { kind: 'brick', pos: [1, Y + 3, -166], content: 'coin' }, { kind: 'brick', pos: [2, Y + 3, -166] }, { kind: 'question', pos: [3, Y + 3, -166], content: 'wachstumsbeere' },
    { kind: 'hidden', id: 'geheim_beere', pos: [0, Y + 2.6, -211.8], content: 'wachstumsbeere' },
  ],
  enemies: [
    // 1 Hochstart
    { kind: 'lavabrocken', id: 'lb_hang', pos: [1.5, 7.5, -10], sight: 7 },
    { kind: 'lavabrocken', id: 'lb_hof1', pos: [-3, Y1, -24.5] },
    { kind: 'lavabrocken', id: 'lb_hof2', pos: [4, Y1, -37] },
    { kind: 'pilzlingsturm', id: 'turm1', pos: [3, Y1, -31], count: 3 },
    // 2 Drehplattformen: Funken an den Spitzen der Drehbalken, Reihen im Graben
    funke(-3.4, -54, { phase: 0 }), funke(3.4, -54, { phase: 0.5 }),
    funke(-3.4, -69, { phase: 0.25 }), funke(3.4, -69, { phase: 0.75 }),
    funke(-3.4, -84, { phase: 0.1 }), funke(3.4, -84, { phase: 0.6 }),
    // 3 Rohrhof und Pfad
    { kind: 'lavabrocken', id: 'lb_hof3', pos: [3, Y, -138] },
    { kind: 'lavabrocken', id: 'lb_hof4', pos: [6, Y, -148] },
    { kind: 'pilzlingsturm', id: 'turm2', pos: [0, Y, -158.5], count: 4 },
    { kind: 'lavabrocken', id: 'lb_weg1', pos: [1, Y, -170] },
    { kind: 'lavabrocken', id: 'lb_weg2', pos: [5, Y, -174] },
    { kind: 'pilzlingsturm', id: 'turm3', pos: [0, Y, -184.5], count: 3 },
    { kind: 'lavabrocken', id: 'lb_weg3', pos: [-1.5, Y, -179] },
    funke(-0.5, -188.8, { count: 2, phase: 0, period: 2.2 }), funke(-0.5, -192.8, { count: 2, phase: 0.25, period: 2.2 }),
    funke(-0.5, -196.8, { count: 2, phase: 0.5, period: 2.2 }), funke(-0.5, -200.8, { count: 2, phase: 0.75, period: 2.2 }),
    // Turmbalkon
    { kind: 'lavabrocken', id: 'lb_balkon', pos: [28, YB, -165], behavior: 'walk', sight: 4 },
    // 4 Endgegner
    { kind: 'lavafelsen_koenig', id: 'koenig', pos: [0, Y, AZ - 3], arena: { center: [0, Y, AZ], r: AR - 0.6 } },
  ],
  items: [
    { kind: 'pfeld', id: 'pf_bruecke1', pos: [-5, Y1, -27.4], size: [2.2, 2.2], group: 'bruecke', on: { drop: 'fallbruecke' } },
    { kind: 'pfeld', id: 'pf_bruecke2', pos: [-5, Y1, -34.6], size: [2.2, 2.2], group: 'bruecke' },
    { kind: 'pfeld', id: 'pf_drei1', pos: [1.5, Y, -144], size: [2.2, 2.2], group: 'drei', on: [{ open: 'gitter2' }, { sfx: 'switch' }] },
    { kind: 'pfeld', id: 'pf_drei2', pos: [4.5, Y, -144], size: [2.2, 2.2], group: 'drei' },
    { kind: 'pfeld', id: 'pf_drei3', pos: [7.5, Y, -144], size: [2.2, 2.2], group: 'drei' },
    { kind: 'pfeld', id: 'pf_balkon', pos: [30, 3, -178.2], size: [2.2, 2.2], need: 1, on: { reveal: ['weg3', 'stern3'] } },
    { kind: 'roter_ring', id: 'ring', pos: [0, Y, -61.5], yaw: PI / 2, time: 12,
      coins: [[-2, Y + 1.4, -66], [2, Y + 1.4, -66], [0, Y + 1.4, -72.5], [-1.5, Y + 0.6, -76.5], [1.5, Y + 0.6, -76.5], [-2.2, Y + 1.4, -81], [2.2, Y + 1.4, -87], [0, Y + 0.6, -91]] },
    { kind: 'warpbox', id: 'warp_weg', pos: [7.6, Y, -169], target: 'warp_balkon' },
    { kind: 'warpbox', id: 'warp_balkon', pos: [30, YB, -161.6], target: 'warp_weg' },
    { kind: 'warpbox', id: 'warp_zurueck', pos: [32.6, Y, -192], target: 'warp_weg' },
    { kind: 'warpbox', id: 'warp_sieg', pos: [0, Y, AZ + 7], target: [0, Y + 0.3, -280], hidden: true },
    line([-2, Y0 + 0.6, -1], [2, Y0 + 0.6, -1], 3),
    line([0, 8.6, -6], [0, 5.4, -15], 4),
    line([-12, Y1 + 0.6, -31], [-18, Y1 + 0.6, -31], 3),
    line([0, Y + 0.6, -44], [0, Y + 0.6, -47], 3),
    ring([0, Y + 0.6, -96.5], 2, 6),
    line([-2, Y + 0.6, -153], [2, Y + 0.6, -153], 3),
    line([-1, Y + 0.6, -177.5], [1, Y + 0.6, -177.5], 2),
    ring([0, Y + 0.6, -288], 2.4, 10),
  ],
  checkpoint: [{ pos: [0, Y, -95.5], yaw: PI / 2 }, { pos: [0, Y, -204.5], yaw: PI / 2 }],
  stars: [
    [-25, Y1 + 1.2, -31],
    [7.5, Y + 1.2, -153.6],
    { pos: [30, Y + 1.3, -189.5], hidden: true, id: 'stern3' },
  ],
  stamp: [-8.5, Y + 7.9, -135],
  goal: { pos: [0, Y, -296], height: 9 },
  marks: {
    start: [0, Y0, 5], hof: [0, Y1, -25], bruecke: [-14.8, Y1, -31], sternturm: [-25, Y1, -31], dreh1: [0, Y, -54], ring: [0, Y, -61.5],
    cp1: [0, Y, -95.5], rohr: [0, Y, -102.5], rohrhof: [0, Y, -128], wand: [-8.5, Y, -135], drei: [4.5, Y, -144], warp: [7.6, Y, -169],
    balkon: [30, YB, -165], podest: [30, Y, -189.5], funken: [0, Y, -188], cp2: [0, Y, -204.5], roehre: [0, Y, -209], arena: [0, Y, AZ], ziel: [0, Y, -296],
  },
};
