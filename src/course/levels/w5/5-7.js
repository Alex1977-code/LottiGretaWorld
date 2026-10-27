// 5-7 „Auf Zehenspitzen durch die Glutfestung“ – Schleich-Level der Lila Strand-Insel (Bauplan Welt 5, Detail 5-7).
// Nacht über Baron Brummbärs Lava-Festung: Suchscheinwerfer fahren ihre Lichtflecken über die Höfe. Wer ins Licht tritt,
// wird entdeckt – die Alarmlampen blinken, und die Suchkopf-Kanonen auf den Mauern feuern eine Welle Suchköpfe
// (draufspringen, ausweichen oder unter einem Dach verstecken). Hackbeil-Pilze bewachen die Arkaden und Gassen.
// Parcours nach −Z, ≈ 215 m, Thema sneak, Musik course_sneak, 400 s.
//
// Abschnitte (+X = rechts im Bild; Burghof y 2, Lava y 0,6; Treppe 15 m hinauf):
//   1  Startplattform        z  13 …   −6   Übungs-Scheinwerfer (ohne Kanonen), Markise als Versteck, Zugbrücke
//   2  Gefahrenstrecke I     z −12 …  −62   Hof der Arkaden (Lichtfleck im Viereck, unter den Arkaden bleibt man im
//                                          Schatten; Sprungfeder vor dem Torturm → Stern 0), Hof der Wachhäuser (zwei
//                                          Lichter queren den Weg, dazwischen das Wachhaus)
//   3  Bastion (Checkpoint)  z −68 …  −84   Stempel über drei ?-Blöcken – genau im Lichtkegel
//   4  Gefahrenstrecke II    z −88 … −146   Hof der rissigen Mauer (Suchkopf gegen den Riss lenken → Rätselbox in den
//                                          Kletterraum, Stern 1: Steinblock-Treppe hinauf, bevor die Suchköpfe sie
//                                          zertrümmern), Säulengang mit Verfolger-Licht, Lavagräben mit schmalen Stegen
//   5  Treppe                z −146 … −184  drei Treppenläufe (15 m), Wachlicht auf dem Absatz
//   6  Turmterrasse (Ziel)   z −184 … −204  Steinblock-Mauer mit Stern 2 (ein Suchkopf von hinten zertrümmert sie),
//                                          Krümel im Käfig, Zielmast
// Gegner: Hackbeil-Pilz 8, Suchkopf-Kanone 13 (11 an den Lichtern, 2 im Kletterraum), Suchscheinwerfer 11.
// Extraleben: unsichtbarer Block über der Zugbrücke, Kiste auf der Lavainsel rechts im Graben.

import {
  isl, line, ring, arc, pfosten, roof, daecher, hofPflaster, laternen, festungsMauern, alarmLampen, rissWand, kletterRaum,
  steinStern, schleichZaehler, scheinwerferSparen, gluehwuermchen, lavaSee, lavaFaelle, glutSaum, tuerme, fackeln, banner, ketten, funkenFlug,
  wimpelLeinen, blumenKuebel,
} from './_helpers_d.js';
import { bakeModel } from '../../blocks/w2kit.js';
import { hasModel } from '../../models/index.js';

const PI = Math.PI;
const Y = 2;            // Burghof
const LY = 0.6;         // Lava
const Y1 = Y + 5.1, Y2 = Y + 10.2, YT = Y + 15.3;   // Treppenabsätze, Turmterrasse
const RX = 72, RZ = -104;                            // Kletterraum (abseits)

// ---------------------------------------------------------------- Maße (auch für den Test)
export const M57 = {
  Y, LY, YT, RX, RZ,
  TOWER: { x0: 1.8, x1: 6.6, z0: -35.4, z1: -39.6, top: Y + 7.2 },     // Torturm (Stern 0)
  TRAMP: [4.2, Y, -31.8],
  STAMP_BLOCKS: [-1.05, 0, 1.05].map((x) => [x, Y + 2.1, -77]),
  RISS: { x: -8, z: -96, w: 6, h: 4 },                                  // graue Mauer vor der Nische
  STEINSTERN: [-5.5, YT, -190.5],
};
const { TOWER, TRAMP, RISS } = M57;

/** Hackbeil-Pilz: Streife auf einer Bahn (sight = Reichweite des Blicks) oder Jäger. */
const hack = (id, pos, o = {}) => ({ kind: 'hackbeil_pilz', id, pos, ...o });
/** Suchkopf-Kanone (still bis zum Alarm). */
const kanone = (id, pos, dir, o = {}) => ({ kind: 'kanone_turm', id, pos, dir, shot: 'suchkopf', active: false, height: 2, range: 30, speed: 4.0, seek: 3.6, life: 6.5, max: 2, ...o });
/** Suchkopf-Welle an Scheinwerfern. */
const welle = (id, lights, cannons, o = {}) => ({ kind: 'suchkopf_welle', id, lights, cannons, shots: 2, every: 1.5, stagger: 0.45, cooldown: 4, range: 32, ...o });
const sign = (x, y, z, text, o = {}) => ({ type: 'sign', pos: [x, y, z], text, size: o.size ?? [2.4, 0.9], yaw: o.yaw ?? 0 });
const licht = (id, path, lamp, o = {}) => ({ type: 'suchscheinwerfer', id, path, lamp, radius: 2.3, speed: 2.4, cooldown: 3.5, alarmTime: 1.8, ...o });

// Kletterraum: Steinblock-Treppe entlang +X (zwei Blöcke tief), Höhen 1 … 5 m; Stern 1 über der obersten Säule
const KR_BLOCKS = [];
for (let i = 0; i < 5; i++) for (let h = 0; h <= i; h++) for (const dz of [0.5, -0.5]) KR_BLOCKS.push([RX - 4.5 + i, Y + h, RZ + dz]);
// Steinblock-Mauer auf der Turmterrasse (3 × 2), Stern 2 im unteren mittleren Block
const STEIN_MAUER = [];
for (const dx of [-1, 0, 1]) for (const dy of [0, 1]) STEIN_MAUER.push({ kind: 'steinblock', id: dx === 0 && dy === 0 ? 'stein_stern' : undefined, pos: [M57.STEINSTERN[0] + dx, YT + dy, M57.STEINSTERN[2]] });

// Markisen-Dächer (Unterstände: verdecken die Figur vor den Scheinwerfern; durchscheinend, wenn sie die Figur verdecken)
const ROOFS = {
  start: { x0: -6.5, x1: -3.5, zA: -0.6, zB: -5.4, floor: Y, h: 2.6, colors: [0x2a7ad8, 0xfff2e0] },
  arkadeL: { x0: -10, x1: -6.6, zA: -13, zB: -35.2, floor: Y, h: 2.8, colors: [0xd8283a, 0xffd23a], posts: [[-6.9, -13.5], [-6.9, -18.8], [-6.9, -24.1], [-6.9, -29.4], [-6.9, -34.7]] },
  arkadeR: { x0: 6.6, x1: 10, zA: -13, zB: -30, floor: Y, h: 2.8, colors: [0x2fbf4a, 0xfff2e0], posts: [[6.9, -13.5], [6.9, -18.8], [6.9, -24.1], [6.9, -29.5]] },
  wachhaus: { x0: -2.2, x1: 2.2, zA: -46.8, zB: -51.2, floor: Y, h: 2.6, colors: [0xd8283a, 0xfff2e0] },
  standL: { x0: -10, x1: -7, zA: -40, zB: -46, floor: Y, h: 2.6, colors: [0x9a3ad8, 0xfff2e0] },
  standR: { x0: 7, x1: 10, zA: -52, zB: -58, floor: Y, h: 2.6, colors: [0xffc21a, 0xd8283a] },
  torhaus: { x0: -2.4, x1: 2.4, zA: -83.6, zB: -88.4, floor: Y, h: 2.8, colors: [0xd8283a, 0xffc21a], posts: [[-2.1, -83.9], [2.1, -83.9], [-2.1, -88.1], [2.1, -88.1]] },
  saeulen: { x0: 6, x1: 10, zA: -100, zB: -114, floor: Y, h: 2.8, colors: [0x2a7ad8, 0xffd23a], posts: [[6.3, -100.3], [6.3, -104.9], [6.3, -109.5], [6.3, -113.7]] },
  absatz: { x0: -5, x1: -1, zA: -170.2, zB: -174.4, floor: Y + 10.2, h: 2.6, colors: [0x2fbf4a, 0xffd23a] },
};

/** Aufbau-Haken (vor dem Verschmelzen): Lava, Pflaster, Mauern, Türme, Fackeln, Banner, Ketten, Glut, Dächer. */
function build(level) {
  // Lavasee unter der ganzen Festung, glühender Saum an den Inselrändern
  lavaSee(level, { x0: -30, x1: 34, zA: 30, zB: -230, y: LY, cell: 3 });
  const islands = level.data.segments.filter((s) => s.type === 'island' && s.pos[0] < 40);
  const rects = islands.map((s) => [s.pos[0] - s.size[0] / 2, s.pos[0] + s.size[0] / 2, s.pos[2] + s.size[2] / 2, s.pos[2] - s.size[2] / 2]);
  glutSaum(level, rects, LY);
  hofPflaster(level, islands.filter((s) => s.top === 'stone' && s.size[0] > 6).map((s) => ({ x0: s.pos[0] - s.size[0] / 2, x1: s.pos[0] + s.size[0] / 2, zA: s.pos[2] + s.size[2] / 2, zB: s.pos[2] - s.size[2] / 2, y: s.pos[1] + s.size[1], path: [-1.3, 1.3], cracks: 1 })));
  daecher(level, Object.values(ROOFS).map(roof));
  funkenFlug(level, [[-28, -11, 20, -220], [11, 32, 20, -220], [-10, 10, -6, -12], [-10, 10, -62, -68], [-10, 10, -122, -128], [-10, 10, -134, -140]], LY, { n: 150 });
  // Festungsmauern (schiefer-lila, Zinnen): Seiten der Höfe, Torwand, Rückwand der Nische
  festungsMauern(level, [
    { from: [-10.5, Y, -12], to: [-10.5, Y, -36], height: 6 }, { from: [10.5, Y, -12], to: [10.5, Y, -36], height: 6 },
    { from: [-10.5, Y, -37.5], to: [-10.5, Y, -62], height: 5 }, { from: [10.5, Y, -37.5], to: [10.5, Y, -62], height: 5 },
    // Torwand (links vom Tor, rechts der Torturm)
    { from: [-10, Y, -36.75], to: [-1.6, Y, -36.75], height: 5, thick: 1.5, zinnen: false },
    { from: [6.6, Y, -36.75], to: [10, Y, -36.75], height: 5, thick: 1.5, zinnen: false },
    { from: [-13, Y, -88], to: [-13, Y, -116], height: 7 }, { from: [10.5, Y, -88], to: [10.5, Y, -98], height: 5 },
    { from: [-10.5, Y, -116.5], to: [-10.5, Y, -146], height: 4, solid: false }, { from: [10.5, Y, -116.5], to: [10.5, Y, -146], height: 4, solid: false },
    // Turmterrasse: Brüstung hinten
    { from: [-9, YT, -204.4], to: [9, YT, -204.4], height: 1.2, thick: 0.8 },
  ]);
  // Rundtürme an den Ecken (Basalt, rote Dächer, glühende Fenster)
  tuerme(level, [
    { pos: [-11.5, Y, -11.5], r: 2.2, height: 9 }, { pos: [11.5, Y, -11.5], r: 2.2, height: 9 },
    { pos: [-11.5, Y, -62.5], r: 2.4, height: 9.5 }, { pos: [11.5, Y, -62.5], r: 2.4, height: 9.5 },
    { pos: [-13.5, Y, -87], r: 2.4, height: 10 }, { pos: [11.5, Y, -87.5], r: 2.2, height: 9 },
    { pos: [-11.8, Y, -146.5], r: 2.2, height: 8 }, { pos: [11.8, Y, -146.5], r: 2.2, height: 8 },
    { pos: [-10.5, YT - 6, -205], r: 2.8, height: 16, flag: true }, { pos: [10.5, YT - 6, -205], r: 2.8, height: 16 },
    { pos: [0, YT, -212], r: 4.2, height: 14 },                      // Bergfried hinter dem Ziel
  ], { solid: false });
  // Lavafälle aus den Mauern, Fackeln, Banner, Ketten
  lavaFaelle(level, [
    { pos: [-14.5, LY, -70], width: 3.2, height: 9, yaw: PI / 2 }, { pos: [14.5, LY, -76], width: 3, height: 9, yaw: -PI / 2 },
    { pos: [-14.6, LY, -130], width: 3, height: 8, yaw: PI / 2 }, { pos: [14.6, LY, -138], width: 3.2, height: 8, yaw: -PI / 2 },
  ]);
  const FACKELN = [
    { pos: [-5.8, Y, 11], post: 1.4 }, { pos: [5.8, Y, 11], post: 1.4 },
    { pos: [-1.9, Y + 3.2, -36], yaw: PI / 2 }, { pos: [1.9, Y + 3.2, -36], yaw: PI / 2 },
    { pos: [-9.9, Y + 3.8, -22], yaw: 0 }, { pos: [9.9, Y + 3.8, -26], yaw: PI },
    { pos: [-9.9, Y + 3.4, -50], yaw: 0 }, { pos: [9.9, Y + 3.4, -46], yaw: PI },
    { pos: [-7.4, Y, -69], post: 1.3 }, { pos: [7.4, Y, -69], post: 1.3 },
    { pos: [-12.4, Y + 4, -106], yaw: 0 }, { pos: [9.9, Y + 3.4, -92], yaw: PI },
    { pos: [-4.5, Y1, -156], post: 1.2 }, { pos: [4.5, Y2, -170.2], post: 1.2 },
    { pos: [-8.4, YT, -186], post: 1.3 }, { pos: [8.4, YT, -186], post: 1.3 }, { pos: [-3, YT, -203.6], post: 1.5 }, { pos: [3, YT, -203.6], post: 1.5 },
    { pos: [RX - 7.2, Y + 3, RZ - 2], yaw: 0 }, { pos: [RX + 7.2, Y + 3, RZ - 2], yaw: PI }, { pos: [RX - 7.2, Y + 3, RZ + 5], yaw: 0 },
  ];
  fackeln(level, FACKELN);
  // warme Lichtpfützen an den Fackeln (Laternenlicht des Themas, die nächsten vier leuchten)
  laternen(level, FACKELN.map((f) => [f.pos[0], f.pos[1] + (f.post ?? 0.3) + 0.4, f.pos[2]]));
  banner(level, [
    { pos: [-6, Y + 4.6, -36.0], height: 3, width: 1.4, yaw: 0 }, { pos: [8.3, Y + 4.6, -36.0], height: 3, width: 1.4, yaw: 0 },
    { pos: [-12.4, Y + 6.6, -102], height: 3.6, width: 1.6, yaw: PI / 2 }, { pos: [-12.4, Y + 6.6, -110], height: 3.6, width: 1.6, yaw: PI / 2 },
    { pos: [0, YT + 9, -207.6], height: 4.4, width: 2.2, yaw: 0 },
  ]);
  ketten(level, [
    { from: [-1.6, Y + 5, -36], to: [1.6, Y + 5, -36], sag: 0.6 },
    { pos: [-12.3, Y + 6.8, -94], length: 2.6 }, { pos: [-12.3, Y + 6.8, -98], length: 3.4 },
  ]);
  // Brummbär-Reliefs an der Torwand und am Bergfried
  if (hasModel('brummbaer_relief')) {
    bakeModel(level, 'brummbaer_relief', { size: 0.9 }, -6, Y + 1.2, -35.95, -PI / 2);
    bakeModel(level, 'brummbaer_relief', { size: 1.2 }, 0, YT + 3, -207.7, -PI / 2);
  }
  // Glühwürmchen über den Arkaden und dem Säulengang (Mondnacht)
  gluehwuermchen(level, [[-10, -6, -14, -34, Y], [6, 10, -100, -114, Y], [-5, 5, -186, -200, YT]], { n: 36 });
  // Festschmuck des Barons (die Festung feiert – und schläft halb): Wimpelleinen über den Höfen, Blumenkübel
  wimpelLeinen(level, [
    { a: [-10.4, Y + 5.6, -17], b: [10.4, Y + 5.6, -19], sag: 1.0 }, { a: [-10.4, Y + 5.6, -29], b: [10.4, Y + 5.6, -27], sag: 1.0 },
    { a: [-10.4, Y + 4.6, -44], b: [10.4, Y + 4.6, -46], sag: 0.9 }, { a: [-10.4, Y + 4.6, -56], b: [10.4, Y + 4.6, -54], sag: 0.9 },
    { a: [-12.9, Y + 5.6, -91], b: [10.4, Y + 4.6, -93], sag: 1.1 },
    { a: [-8.6, YT + 4.4, -188], b: [8.6, YT + 4.4, -188], sag: 0.8 },
  ]);
  blumenKuebel(level, [
    [-5.4, Y, 2, 0xff5a9a], [5.4, Y, 2, 0xb070ff],
    [-7.9, YT, -186.4, 0xff5a9a], [7.9, YT, -186.4, 0xffd23a], [-7.9, YT, -202.4, 0xb070ff], [7.9, YT, -202.4, 0xff5a9a],
  ]);
}

/** Level-Haken nach dem Aufbau: Alarmlampen, Riss, Kletterraum, Stern im Steinblock, Entdeckungen zählen. */
function setup(level) {
  alarmLampen(level, [
    { pos: [-3.2, Y + 4.2, -36], yaw: PI / 2 },
    { pos: [10, Y + 3.8, -49], yaw: PI },
    { pos: [-12.5, Y + 5, -108], yaw: 0 },
    { pos: [5, YT + 0.9, -204], yaw: PI / 2 },
  ]);
  scheinwerferSparen(level, 34);
  rissWand(level, { wall: 'risswand', x: RISS.x + 0.5, y: Y, z: RISS.z, w: RISS.w, h: RISS.h, face: '+x' });
  kletterRaum(level, { area: [RX - 8, RX + 8, RZ - 8, RZ + 8], blocks: KR_BLOCKS, star: 1 });
  steinStern(level, 'stein_stern', 2);
  schleichZaehler(level, [
    { z0: -13, z1: -35.5, lights: ['licht1'], text: 'Unentdeckt durch den Arkadenhof!' },
    { z0: -38, z1: -61.5, lights: ['licht2', 'licht3'], text: 'Psst – keiner hat dich gesehen!' },
  ]);
}

export const LEVEL = {
  id: '5-7',
  world: 5,
  title: 'Auf Zehenspitzen durch die Glutfestung',
  archetype: 'parcours',
  theme: 'sneak',
  music: 'course_sneak',
  timeLimit: 400,
  killY: -6,
  start: { pos: [0, Y, 9], yaw: PI / 2 },
  build,
  setup,
  instances: { coin: { farHide: 38, shadow: false } },
  farHide: 40,
  camera: [
    { from: 18, to: -12, pitch: 42, dist: 14, ahead: 2.4, area: [-30, 40] },
    { from: -12, to: -37, pitch: 44, dist: 14.5, ahead: 2.6, area: [-30, 40] },        // Arkadenhof
    { from: -37, to: -63, pitch: 44, dist: 14.5, ahead: 2.6, area: [-30, 40] },        // Wachhaus-Hof
    { from: -63, to: -88, pitch: 43, dist: 14, ahead: 2.4, area: [-30, 40] },          // Bastion
    { from: -88, to: -117, pitch: 44, dist: 15, ahead: 2.6, area: [-30, 40] },         // Hof der rissigen Mauer
    { from: -117, to: -147, pitch: 48, dist: 14, ahead: 2.4, area: [-30, 40] },        // Lavagräben
    { from: -147, to: -185, pitch: 38, dist: 14.5, height: 1.8, ahead: 2.6, area: [-30, 40] }, // Treppe
    { from: -185, to: -210, pitch: 42, dist: 14, ahead: 2.2, area: [-30, 40] },        // Turmterrasse
    { from: -88, to: -120, pitch: 52, dist: 15, area: [55, 95] },          // Kletterraum
  ],
  segments: [
    // ================================================================ 1 Startplattform
    isl(-6.5, 6.5, 13, -6, Y),
    sign(-4.4, Y, 9.6, 'Auf Zehenspitzen\ndurch die Glutfestung', { size: [3.2, 1.1] }),
    sign(3.6, Y, 0.4, 'Psst!\nNicht ins Licht!', { size: [2, 0.9] }),
    ...pfosten(ROOFS.start),
    licht('licht0', [[-1.5, Y, -3], [5.5, Y, -3]], [6, Y + 8.5, -5.6], { speed: 2 }),
    { type: 'bridge', from: [0, Y, -6], to: [0, Y, -12], width: 3.2, color: 0x8a5a3a },

    // ================================================================ 2a Hof der Arkaden
    isl(-10, 10, -12, -37.5, Y),
    ...pfosten(ROOFS.arkadeL), ...pfosten(ROOFS.arkadeR),
    licht('licht1', [[-4, Y, -16], [4, Y, -16], [4, Y, -31], [-4, Y, -31]], [-5.5, Y + 12, -36.75], { mode: 'loop', speed: 2.6 }),
    // Torturm (Stern 0 oben – nur mit der Sprungfeder) und Tor
    isl(TOWER.x0, TOWER.x1, TOWER.z0, TOWER.z1, TOWER.top, TOWER.top + 4, { top: 'rock', topColor: 0x6a6488, sideColor: 0x4a4468 }),
    { type: 'trampoline', id: 'feder', pos: TRAMP, strength: 20, size: 1.7 },
    sign(-3.6, Y, -14.2, 'Unter den Arkaden\nsieht dich keiner', { size: [2.6, 0.9] }),

    // ================================================================ 2b Hof der Wachhäuser
    isl(-10, 10, -37.5, -62, Y),
    ...pfosten(ROOFS.wachhaus), ...pfosten(ROOFS.standL), ...pfosten(ROOFS.standR),
    licht('licht2', [[-8.5, Y, -43.4], [8.5, Y, -43.4]], [-10.5, Y + 10, -45.5], { speed: 3.1, wait: 0.35 }),
    licht('licht3', [[8.5, Y, -55], [-8.5, Y, -55]], [10.5, Y + 10, -57], { speed: 3.1, wait: 0.35, phase: 0.5 }),
    { type: 'bridge', from: [0, Y, -62], to: [0, Y, -68], width: 3.2, color: 0x8a5a3a },

    // ================================================================ 3 Bastion (Checkpoint, Stempel im Licht)
    isl(-8, 8, -68, -84, Y),
    licht('licht4', [[-5, Y, -77], [5, Y, -77]], [6.2, Y + 12, -80.5], { speed: 2.1, radius: 2.6 }),
    sign(-5.6, Y, -71.2, 'Stempel im Licht –\nmutig?', { size: [2.4, 0.9] }),
    // überdachte Brücke (Torhaus) zum nächsten Hof
    { type: 'bridge', from: [0, Y, -84], to: [0, Y, -88], width: 3.4, color: 0x8a5a3a },
    ...pfosten(ROOFS.torhaus),

    // ================================================================ 4a Hof der rissigen Mauer
    isl(-12.5, 10, -88, -116, Y),
    // Nische links: Seitenwände, Dach, graue Mauer mit Riss davor (dahinter die Rätselbox)
    { type: 'wall', pos: [-10.5, Y, -92.7], size: [4, 4.6, 0.6], style: 'stone' },
    { type: 'wall', pos: [-10.5, Y, -99.3], size: [4, 4.6, 0.6], style: 'stone' },
    { type: 'platform', pos: [-10.5, Y + 4.35, -96], size: [4.6, 0.5, 7.4], style: 'stone' },
    { type: 'megawall', id: 'risswand', pos: [RISS.x, Y, RISS.z], size: [1, RISS.h, RISS.w] },
    sign(-5.2, Y, -90.2, 'Die Mauer\nhat einen Riss …', { size: [2.2, 0.9] }),
    licht('licht5', [[-6, Y, -91.5], [-6, Y, -100.5]], [-2.5, Y + 11, -104], { speed: 1.9 }),
    // Säulengang rechts, Verfolger-Licht in der Mitte
    ...pfosten(ROOFS.saeulen),
    licht('licht6', [[-4, Y, -104], [3, Y, -111]], [-1, Y + 12, -119.5], { speed: 2.3, trackSpeed: 4.4 }),

    // ================================================================ 4b Lavagräben mit Stegen
    isl(-10, 10, -116, -122, Y),
    { type: 'bridge', from: [-5, Y, -122], to: [-5, Y, -128], width: 2, color: 0x8a5a3a },
    isl(-10, 10, -128, -134, Y),
    isl(12, 15.4, -129.4, -132.6, Y, 6, { top: 'rock', topColor: 0x6a6488, sideColor: 0x4a4468 }),   // Lavainsel (Extraleben)
    { type: 'bridge', from: [5, Y, -134], to: [5, Y, -140], width: 2, color: 0x8a5a3a },
    isl(-10, 10, -140, -146, Y),
    licht('licht7', [[-5, Y, -119], [-5, Y, -131]], [-8, Y + 10, -129.5], { speed: 2.2 }),
    licht('licht8', [[5, Y, -131], [5, Y, -143]], [8, Y + 10, -141.5], { speed: 2.4, phase: 0.5 }),

    // ================================================================ 5 Treppe (15 m hinauf)
    { type: 'stairs', pos: [0, Y, -146], dir: '-z', steps: 17, rise: 0.3, run: 0.55, width: 6, style: 'stone' },
    isl(-3, 3, -146, -155.35, Y, 6, { top: 'none' }),
    isl(-5, 5, -155.35, -160.35, Y1),
    isl(-3, 3, -160.35, -169.7, Y1, 6, { top: 'none' }),
    { type: 'stairs', pos: [0, Y1, -160.35], dir: '-z', steps: 17, rise: 0.3, run: 0.55, width: 6, style: 'stone' },
    isl(-5, 5, -169.7, -174.7, Y2),
    ...pfosten(ROOFS.absatz),
    isl(-3, 3, -174.7, -184.05, Y2, 6, { top: 'none' }),
    { type: 'stairs', pos: [0, Y2, -174.7], dir: '-z', steps: 17, rise: 0.3, run: 0.55, width: 6, style: 'stone' },
    licht('licht_treppe', [[-4, Y1, -157.8], [4, Y1, -157.8]], [-4.4, Y2 + 8, -174.2], { speed: 2.2 }),

    // ================================================================ 6 Turmterrasse (Ziel)
    isl(-9, 9, -184.05, -204, YT),
    licht('licht9', [[-7, YT, -187], [7, YT, -187]], [0, YT + 10, -203.4], { speed: 2.4 }),
    sign(-8, YT, -185.4, 'Lass den Suchkopf\ndie Steine knacken!', { size: [2.6, 0.9] }),

    // ================================================================ Kletterraum (Rätselbox, abseits)
    { type: 'room', pos: [RX, Y, RZ], size: [16, 7, 16], ceiling: false, style: 0x4a3a5e, top: 'stone' },
    sign(RX + 4.6, Y, RZ + 6.4, 'Schnell hinauf,\nbevor die Steine brechen!', { size: [2.8, 0.9] }),
  ],
  blocks: [
    { kind: 'question', pos: [-1.5, Y + 2.2, 4], content: 'wachstumsbeere' },
    { kind: 'coinblock', pos: [1.5, Y + 2.2, 4], count: 6 },
    { kind: 'hidden', id: 'geheim_bruecke', pos: [0, Y + 2.5, -9], content: 'oneup' },
    ...M57.STAMP_BLOCKS.map((p, i) => ({ kind: 'question', pos: p, content: i === 1 ? 'coins:5' : 'coins:2' })),
    { kind: 'question', pos: [0, Y + 2.2, -114.2], content: 'wachstumsbeere' },
    ...KR_BLOCKS.map((p, i) => ({ kind: 'steinblock', id: `kr_stein${i}`, pos: p })),
    ...STEIN_MAUER,
  ],
  enemies: [
    // Hackbeil-Pilze 8
    hack('hb1', [-8.3, Y, -16], { behavior: 'patrol', path: [[-8.3, Y, -15.5], [-8.3, Y, -33]], sight: 3.4 }),
    hack('hb2', [8.3, Y, -27], { behavior: 'patrol', path: [[8.3, Y, -15.5], [8.3, Y, -28.5]], sight: 3.4 }),
    hack('hb3', [-4, Y, -49], { sight: 5 }),
    hack('hb4', [5, Y, -59], { behavior: 'patrol', path: [[-6, Y, -59.5], [6, Y, -59.5]], sight: 3.6 }),
    hack('hb5', [-2, Y, -107], { sight: 5 }),
    hack('hb6', [8, Y, -103], { behavior: 'patrol', path: [[8, Y, -101], [8, Y, -113]], sight: 3.4 }),
    hack('hb7', [0, Y, -131], { behavior: 'patrol', path: [[-7, Y, -131], [7, Y, -131]], sight: 3.6 }),
    hack('hb8', [2, Y2, -172.2], { behavior: 'patrol', path: [[-1.5, Y2, -172.2], [4, Y2, -172.2]], sight: 3.4 }),
    // Suchkopf-Kanonen (still, bis ein Scheinwerfer Alarm gibt)
    kanone('k1', [-8.6, Y + 5, -36.75], [0.3, 1]), kanone('k2', [8.4, Y + 5, -36.75], [-0.3, 1]),
    kanone('k3', [-7.6, Y, -61.2], [0, 1]), kanone('k4', [7.6, Y, -61.2], [0, 1]),
    kanone('k5', [-6.6, Y, -83.2], [0.2, 1]), kanone('k6', [6.6, Y, -83.2], [-0.2, 1]),
    kanone('k7', [8.6, Y, -96], [-1, 0], { breaks: true, seek: 4.2, life: 7 }),
    kanone('k8', [-8.6, Y, -115.2], [0.4, 1]),
    kanone('k9', [-8, Y, -145.2], [0.3, 1]),
    kanone('k10', [4.4, Y2, -174.2], [-0.2, 1]),
    kanone('k11', [M57.STEINSTERN[0], YT, -198], [0, 1], { breaks: true, seek: 4.5, life: 7 }),
    // Kletterraum: zwei Kanonen an der Rückwand (scharf, solange man drin ist), Köpfe zertrümmern Steinblöcke
    { kind: 'kanone_turm', id: 'kr_k1', pos: [RX - 6.2, Y, RZ - 6.4], dir: [0.3, 1], shot: 'suchkopf', height: 2, interval: 2.6, first: 1.4, range: 18, max: 2, speed: 3.6, seek: 3.2, life: 6, breaks: true },
    { kind: 'kanone_turm', id: 'kr_k2', pos: [RX + 6.2, Y, RZ - 6.4], dir: [-0.3, 1], shot: 'suchkopf', height: 2, interval: 2.6, first: 2.6, range: 18, max: 2, speed: 3.6, seek: 3.2, life: 6, breaks: true },
    // Suchkopf-Wellen
    welle('welle1', ['licht1'], ['k1', 'k2']),
    welle('welle2', ['licht2', 'licht3'], ['k3', 'k4']),
    welle('welle3', ['licht4'], ['k5', 'k6']),
    welle('welle4', ['licht5'], ['k7'], { shots: 2, every: 2.2, cooldown: 2.5 }),
    welle('welle5', ['licht6'], ['k8']),
    welle('welle6', ['licht7', 'licht8'], ['k9']),
    welle('welle7', ['licht_treppe'], ['k10']),
    welle('welle8', ['licht9'], ['k11'], { shots: 2, every: 2, cooldown: 2.5 }),
  ],
  items: [
    // ---- 1
    line([0, Y + 0.6, 7], [0, Y + 0.6, 1], 4),
    line([-5, Y + 0.6, -1.4], [-5, Y + 0.6, -4.6], 3),
    // ---- 2a: Spur unter den Arkaden (sicher), Köder im Licht
    line([-8.3, Y + 0.6, -15], [-8.3, Y + 0.6, -33], 8),
    ring([0, Y + 0.6, -23.5], 2, 6),
    line([8.3, Y + 0.6, -16], [8.3, Y + 0.6, -27], 5),
    line([TOWER.x0 + 0.8, TOWER.top + 0.6, -36.4], [TOWER.x1 - 0.8, TOWER.top + 0.6, -36.4], 4),
    // ---- 2b
    ring([0, Y + 0.6, -49], 1.3, 5),
    line([-8.5, Y + 0.6, -41], [-8.5, Y + 0.6, -45], 3),
    line([8.5, Y + 0.6, -53], [8.5, Y + 0.6, -57], 3),
    { kind: 'crate', pos: [-8.6, Y, -60.2], content: 'coins:3' }, { kind: 'crate', pos: [8.6, Y, -40.2], content: 'coins:3' },
    // ---- 3
    ...arc([0, Y + 0.6, -64], [0, Y + 0.6, -67.5], 3, 0.5),
    // ---- 4a
    line([7.7, Y + 0.6, -101.5], [7.7, Y + 0.6, -113], 6),
    ring([-1, Y + 0.6, -108], 1.8, 6),
    // ---- 4b
    line([-5, Y + 0.6, -122.6], [-5, Y + 0.6, -127.4], 3),
    line([5, Y + 0.6, -134.6], [5, Y + 0.6, -139.4], 3),
    ...arc([10.4, Y + 0.6, -131], [12.6, Y + 0.6, -131], 3, 0.9),
    { kind: 'crate', id: 'kiste_leben', pos: [14, Y, -131], content: 'oneup' },
    // ---- 5 Treppe
    line([0, Y + 2, -149], [0, Y1 + 0.6, -155], 5),
    line([0, Y1 + 2, -163], [0, Y2 + 0.6, -169], 5),
    line([0, Y2 + 2, -177], [0, YT + 0.6, -183.5], 5),
    // ---- 6
    ring([0, YT + 0.6, -192], 2.2, 8),
    // Rätselbox hinter der rissigen Mauer ↔ Kletterraum
    { kind: 'warpbox', id: 'rb_riss', style: 'mystery', pos: [-10.6, Y, -96], target: 'rb_raum' },
    { kind: 'warpbox', id: 'rb_raum', style: 'mystery', pos: [RX + 5, Y, RZ + 5.2], target: 'rb_riss' },
    line([RX - 4.5, Y + 0.6, RZ + 3], [RX + 1.5, Y + 0.6, RZ + 3], 5),
    // Krümel im Käfig auf der Turmterrasse
    { kind: 'rescue_friend', id: 'kruemel', pos: [6, YT, -199], yaw: PI * 0.75, name: 'Krümel' },
  ],
  checkpoint: [{ pos: [0, Y, -70.6], yaw: PI / 2 }, { pos: [0, Y1, -157], yaw: PI / 2 }],
  stars: [
    [(TOWER.x0 + TOWER.x1) / 2, TOWER.top + 1.2, -37.8],                       // 0: Torturm (Sprungfeder)
    [RX - 0.5, Y + 5.8, RZ],                                                    // 1: Kletterraum (oben auf der Steinblock-Treppe)
    { pos: [M57.STEINSTERN[0], YT + 0.6, M57.STEINSTERN[2]], hidden: true, id: 'stern2' },   // 2: im Steinblock
  ],
  stamp: [0, Y + 4.5, -77],
  goal: { pos: [0, YT, -197], height: 9 },
  marks: {
    start: [0, Y, 9], arkade: [-8.3, Y, -14], torturm: [4.2, TOWER.top, -37.5], feder: TRAMP, wachhaus: [0, Y, -49],
    bastion: [0, Y, -70.6], stempel: [0, Y, -77], riss: [-6.6, Y, -96], raum: [RX, Y, RZ], saeulen: [8, Y, -101],
    graben: [-5, Y, -125], treppe: [0, Y, -145.5], absatz1: [0, Y1, -157], absatz2: [0, Y2, -172], terrasse: [0, YT, -188],
    steinmauer: [M57.STEINSTERN[0], YT, -188.6], ziel: [0, YT, -195],
  },
};
