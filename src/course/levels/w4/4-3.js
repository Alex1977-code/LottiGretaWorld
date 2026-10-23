// 4-3 „Neonsteg im Takt“ – Welt 4, Parcours im Technik-Himmel bei Nacht: Piep-Blöcke erscheinen und verschwinden im
// Takt der Musik (course_beep, Wechsel alle 8 Zählzeiten, 3 Warn-Pieps; Taktuhr level.beepClock). Thema `beep`,
// 400 s, ≈ 285 m nach −Z, 3 Sterne + Stempel. Kulisse: Neon-Bögen, Lautsprecher, Equalizer, tanzende Piep-Roboter,
// Tanzflächen und Lichtfächer im Takt, Lautsprecherturm hinter der Treppe, Discokugel, Leuchtschriften.
//
// Abschnitte (Level verläuft nach −Z, +X = rechts im Bild):
//   1 Piep-Block-Reihen   (z 10 … −134, y 1)  Start-Tanzfläche, Taktgasse (rotes Tor + blaue Brücke über einer flachen
//                                            Grube, harmlos) → Reihe 1 (Streifen rot/blau) → Insel 1 (Spiegelfrucht)
//                                            → Reihe 2 (rot, dann blau: Sprung im Wechsel) → Insel 2 (Spiegelfrucht,
//                                            Bumerang-Werfer) → Reihe 3 (Schachbrett) → Druckfeld-Insel: zwei Felder
//                                            gleichzeitig (Heldin + Klon, Klon-Automat) schalten den Laserzaun ab →
//                                            Reihe 4 (Laufwelle: vier Gruppen, je 4 Zählzeiten rückt der feste Streifen
//                                            vor) → Warp-Insel; links ein Steg am Bumerang-Werfer vorbei → **Stern 1**
//   2 Warp-Schleife       (z −109 … −137)     rechts ein Rundweg über Piep-Steine, der im Kreis zur Insel zurückführt
//                                            (Münzen, Bumerang-Werfer, unsichtbarer 1-Up-Block); geradeaus die Warp-Box
//   3 Piep-Block-Treppe   (z −150 … −193)     Lautsprecherturm; vier Treppenläufe (rot, blau, rot, rot-rot-blau-blau) aus je vier
//                                            schwebenden Stufen mit festen Absätzen, 30 m hoch, Fangnetz unter den
//                                            oberen Läufen → Checkpoint
//                                            (y 31); links der Viererlift (vier Figuren) → **Stempel** (oder Krallen-
//                                            Anzug aus dem ?-Block an der Kletterwand)
//   4 Abstieg und Rutsche (z −193 … −267)     drei Absätze hinunterspringen (Bumerang-Werfer), Piep-Platten, Warp-Box →
//                                            Uhrenplatz (y 24): Röhre neben drei Zeit-Uhren → Bonusraum (abseits, x ≈ 90):
//                                            Druckschalter, zehn blaue Münzen → **Stern 2**; rote Piep-Rutsche hinab
//                                            (nur fest, solange Rot gilt; Fangnetz darunter); unten zwei Druckfelder
//                                            (Heldin + Klon) → **Stern 3**
//   5 Schlussaufstieg     (z −267 … −296)     zwei Piep-Treppen (rot; blau-blau-rot-rot mit Sprung im Wechsel), Absatz,
//                                            Fangnetz darunter → Zielplateau mit Zielmast (y 26)
// Gegner: Bumerang-Werfer 7.

import {
  isl, line, ring, arc, column, piepBands, checker, levelSetup, flatIslands, cullStatic, instanceEnemies, farHide, zeitUhren,
  laserGate, klonAutomat, fangnetz, neonRail, modelDiet, danceBots, beatTiles, laserFans, noteFloat, neonSign, speakerTower, discoBall,
} from './_helpers_b.js';

const PI = Math.PI;
const Y = 1;          // Reihen und Inseln
const YC = 31;        // Checkpoint oben auf der Treppe
const YU = 24;        // Uhrenplatz
const YR = 11;        // Fuß der Rutsche
const YZ = 26;        // Zielplateau
const BX = 90;        // Bonusraum (Mitte x)
const BZ = -232;      // Bonusraum (Mitte z)

// ------------------------------------------------------------------ Inseln (im Haken, ohne Sonnenschatten-Wurf)
const ISLANDS = [
  isl(-8, 8, 10, -6, Y, 4, { under: 2 }),                  // Start-Tanzfläche
  isl(-3, 3, -6, -12.5, Y, 2.5, { under: 1 }),             // Taktgasse A
  isl(-3, 3, -12.5, -17.5, Y - 1.8, 1.5, { under: 1 }),    // flache Grube (harmlos)
  isl(-3, 3, -17.5, -20, Y, 2.5, { under: 1 }),            // Taktgasse B
  isl(-6, 6, -34, -44, Y, 4, { under: 2 }),                // Insel 1
  isl(-6, 6, -56, -66, Y, 4, { under: 2 }),                // Insel 2
  isl(-6.5, 6.5, -82, -94, Y, 4, { under: 2 }),            // Druckfeld-Insel
  isl(-8, 8, -109, -134, Y, 4, { under: 2.5 }),            // Warp-Insel
  isl(-18, -8, -115.2, -116.8, Y, 1, { under: 0 }),        // Steg zu Stern 1
  isl(-21.5, -18, -113.8, -118.2, Y, 2, { under: 1 }),     // Sternpodest
  // Rundweg rechts (Warp-Schleife)
  isl(11, 14.5, -113.5, -117.5, Y, 1.4, { under: 0.6 }),
  isl(21.5, 25, -113.5, -117.5, Y, 1.4, { under: 0.6 }),
  isl(21.5, 25, -128.5, -133, Y, 1.4, { under: 0.6 }),
  isl(11, 14.5, -128.5, -133, Y, 1.4, { under: 0.6 }),
  // Treppenturm
  isl(-9.5, 7.5, -150, -170, Y, 4, { under: 2.5 }),        // Turmfuß (Boden unter den unteren Läufen)
  isl(0, 3, -157.6, -161.2, 8.5, 0.6, { under: 0 }),       // Absatz 1
  isl(0, 3, -167.2, -170.8, 16, 0.6, { under: 0 }),         // Absatz 2
  isl(-9, -6, -167.2, -170.8, 23.5, 0.6, { under: 0 }),     // Absatz 3
  isl(-9.5, 13, -176.8, -193, YC, 2, { under: 1.5 }),       // Checkpoint-Plateau (Viererlift links)
  isl(-7, -1.2, -187.2, -191, YC + 7.4, 1.4, { under: 0 }), // Stempel-Sims
  // Abstieg
  isl(2, 10, -196, -201, 25, 1.2, { under: 1 }),
  isl(-3, 5, -204, -210, 19, 1.2, { under: 1 }),
  isl(-4, 6, -219, -227, 13, 2, { under: 1.5 }),
  // Uhrenplatz, Rutschenfuß, Schlussaufstieg, Ziel
  isl(-7, 7, -229, -239, YU, 2, { under: 2 }),
  isl(-7, 7, -255, -267, YR, 4, { under: 2.5 }),
  isl(-2, 2, -273, -276.5, 18.5, 0.6, { under: 0 }),
  isl(-8, 8, -282.5, -295.7, YZ, 4, { under: 3 }),
  // Bonusraum (abseits)
  isl(BX - 10, BX + 10, BZ + 10, BZ - 10, 0, 2, { under: 1.5 }),
];

/** Level-Haken: Inseln, Geländer, Laserzaun, Klon-Automaten, Fangnetz, Kulisse im Takt, Budget. */
function setup(level) {
  flatIslands(level, ISLANDS);
  // Geländer der Taktgasse (harmlose Einführung)
  neonRail(level, [-3.1, Y, -6], [-3.1, Y, -12.5]); neonRail(level, [3.1, Y, -6], [3.1, Y, -12.5]);
  neonRail(level, [-3.1, Y - 1.8, -12.5], [-3.1, Y - 1.8, -17.5], { height: 2.7 }); neonRail(level, [3.1, Y - 1.8, -12.5], [3.1, Y - 1.8, -17.5], { height: 2.7 });
  neonRail(level, [-3.1, Y, -17.5], [-3.1, Y, -20]); neonRail(level, [3.1, Y, -17.5], [3.1, Y, -20]);
  // Bonusraum: Geländer an der offenen Vorderseite
  neonRail(level, [BX - 10, 0, BZ + 9.9], [BX + 10, 0, BZ + 9.9], { color: 0x5a9aff });
  // Laserzaun hinter den Druckfeldern
  laserGate(level, { id: 'laser', pos: [0, Y, -93.5], width: 13, height: 5, beams: 7 });
  // Spiegelfrucht-Nachschub
  klonAutomat(level, [-4.6, Y, -85.5], { id: 'automat_feld' });
  klonAutomat(level, [0.6, YC, -184.6], { id: 'automat_lift' });
  klonAutomat(level, [-5, YR, -258.5], { id: 'automat_rutsche' });
  // Sicherheitsnetz unter den oberen Treppenläufen
  fangnetz(level, { x0: -9.5, x1: 0, z0: -167.2, z1: -176.6, y: 15.4 });
  // Ecke am Viererlift: Geländer hinten und links (die Figuren sammeln sich auf dem Lift)
  neonRail(level, [-6.4, YC, -187.35], [-2.6, YC, -187.35], { color: 0xff8a4a });
  neonRail(level, [-6.35, YC, -183.6], [-6.35, YC, -187.4], { color: 0xff8a4a });
  fangnetz(level, { x0: -3.4, x1: 3.4, z0: -267.2, z1: -282.5, y: YR - 0.4 });
  fangnetz(level, { x0: -3, x1: 3, z0: -239.4, z1: -254.9, y: YR - 0.4 });
  // Zeit-Uhren neben der Bonus-Röhre (+10 s)
  zeitUhren(level, [[6, YU + 1.3, -231.4], [6.2, YU + 1.3, -233.6], [6, YU + 1.3, -235.8]], { id: 'uhren' });
  // ---------------- Kulisse im Takt
  speakerTower(level, { pos: [-1.5, Y, -179.1], width: 14, depth: 3, height: YC - 2 - Y, rows: 4 });
  danceBots(level, [
    [-6.2, Y, 6.5, -0.4], [-5, Y, 8, -0.2], [5.4, Y, 7.2, PI + 0.3], [6.6, Y, 5, PI + 0.5], [-6.5, Y, -1.5, 0.3],
    [-4.8, Y, -42.4, 0.2], [4.6, Y, -36, PI - 0.3],
    [-6.4, Y, -112, 0.4], [-5.8, Y, -133, 0.1], [6.2, Y, -132, PI - 0.2], [3.5, Y, -128.6, PI + 0.5],
    [9.5, YC, -178.5, PI + 0.6], [11.5, YC, -184, PI], [10.5, YC, -190.5, PI - 0.5],
    [5.6, Y, -164, PI - 0.4], [-8.4, Y, -164.6, 0.6],
    [-6.2, YU, -235.6, 0.3], [-1.5, YZ, -293.7, -PI / 2], [1.5, YZ, -294.1, -PI / 2], [-6, YZ, -288.7, 0.2], [6.4, YZ, -291.2, PI],
    [BX - 8, 0, BZ + 8, -0.6], [BX + 8, 0, BZ - 8, PI - 0.6],
  ]);
  beatTiles(level, [
    { x0: -5, x1: 5, z0: 9, z1: 2, y: Y },
    { x0: -6, x1: 3, z0: -126, z1: -133, y: Y },
    { x0: 3, x1: 12, z0: -177, z1: -184, y: YC },
    { x0: -6, x1: 6, z0: -286.7, z1: -294.7, y: YZ },
    { x0: BX - 4, x1: BX + 4, z0: BZ + 4, z1: BZ - 4, y: 0 },
  ]);
  laserFans(level, [[-14, -6, -30], [15, -6, -78], [-16, -4, -140], [18, 0, -200], [-15, 2, -255], [14, 6, -292.7]], { beams: 4, length: 70 });
  noteFloat(level, [[-7.6, Y + 1.8, -2.5], [7.6, Y + 1.8, -2.5], [-1.5, Y + 27, -188.5], [5.6, YZ + 1.8, -292.3]], { n: 28 });
  discoBall(level, [-4.5, Y + 12, 3], 1.1);
  discoBall(level, [6, YZ + 9, -289.7], 1.0);
  neonSign(level, { pos: [-4.8, Y, 4.6], text: 'Neonsteg\nim Takt', size: [3.6, 1.6], yaw: 0.25, color: '#ff5af0' });
  neonSign(level, { pos: [5.4, Y, -4.4], text: 'Hör auf die Pieps:\nRot ↔ Blau!', size: [3.4, 1.2], yaw: -0.35, color: '#5af0ff', flicker: true });
  neonSign(level, { pos: [4.2, Y, -38.5], text: 'Spiegelfrucht:\nein Klon tanzt mit!', size: [3.8, 1.3], yaw: -0.3, color: '#5af0ff' });
  neonSign(level, { pos: [-4.6, Y, -90.8], text: 'Zwei Felder –\nzwei Figuren!', size: [3.4, 1.2], yaw: 0.35, color: '#ffe04a', flicker: true });
  neonSign(level, { pos: [12.8, Y, -112.6], text: 'Rundweg ↻', size: [3, 0.9], yaw: -0.3, color: '#7aff9a' });
  neonSign(level, { pos: [-6, Y, -122.5], text: 'Warp-Box ↓\nzum Turm', size: [3, 1.2], yaw: 0.3, color: '#ff5af0', flicker: true });
  neonSign(level, { pos: [-9.6, Y, -113.2], text: '← Stern?', size: [2.4, 0.9], yaw: 0.5, color: '#ffe04a' });
  neonSign(level, { pos: [5.6, YC, -191.4], text: 'Viererlift:\nnur zu viert!', size: [3.6, 1.3], yaw: -0.25, color: '#ff8a4a' });
  neonSign(level, { pos: [-7.6, Y, -153.4], text: 'Treppe im Takt:\nRot – Blau – Rot!', size: [3.6, 1.3], yaw: 0.3, color: '#ff5a8a', flicker: true });
  neonSign(level, { pos: [BX, 0, BZ + 8.6], text: 'Schalter drücken,\nblaue Münzen fangen!', size: [4.4, 1.3], yaw: 0, color: '#5a9aff' });
  // ---------------- Budget
  instanceEnemies(level, ['feuer_werfer'], {});
  farHide(level, ['feuer_werfer', 'pfeld', 'warpbox', 'pipe', 'goal', 'checkpoint'], 42);
  modelDiet(level, ['modell:lautsprecher', 'modell:equalizer_saeule', 'modell:neon_ring'], { far: 36, shadow: false });
}

// ------------------------------------------------------------------ Piep-Felder
const RED = 'rot', BLUE = 'blau';
// run 1,49 statt 1,5: eine Piep-Zelle je Stufe in Laufrichtung statt zwei (Dreiecks-Budget)
const STEPS = { steps: 4, rise: 1.5, run: 1.49, width: 2.4, height: 1 };
const R0 = { color: RED, phase: 0 }, B0 = { color: BLUE, phase: 0 }, R4 = { color: RED, phase: 4 }, B4 = { color: BLUE, phase: 4 };

export const LEVEL = {
  id: '4-3',
  world: 4,
  title: 'Neonsteg im Takt',
  archetype: 'parcours',
  theme: 'beep',
  music: 'course_beep',
  timeLimit: 400,
  killY: -14,
  start: { pos: [0, Y, 5], yaw: PI / 2 },
  setup: (level, scene) => { levelSetup(setup)(level, scene); cullStatic(level); },
  camera: [
    { from: 14, to: -20, pitch: 44, dist: 13 },
    { from: -20, to: -109, pitch: 46, dist: 13 },
    { from: -109, to: -146, pitch: 44, dist: 13.5 },
    { from: -146, to: -194, pitch: 38, dist: 14, height: 1.4 },          // Treppe: flacher (Ausblick), Höhe sichtbar
    { from: -194, to: -228, pitch: 48, dist: 13 },                        // Abstieg: steiler (Sprünge nach unten)
    { from: -228, to: -268, pitch: 44, dist: 13.5, ahead: 3 },            // Uhrenplatz und Rutsche
    { from: -268, to: -298.7, pitch: 44, dist: 13 },
    { from: BZ + 16, to: BZ - 16, pitch: 50, dist: 14, ahead: 1, area: [BX - 22, BX + 22] },   // Bonusraum
  ],
  segments: [
    // ======================================================== 1  Piep-Block-Reihen
    { type: 'deco_w4', items: [
      { kind: 'neonbogen', pos: [0, Y, 1.5], width: 6.5, height: 4.4, color: 0xff4af0 },
      { kind: 'lautsprecher', pos: [-7.6, Y, -2.5], yaw: -0.5 },
      { kind: 'lautsprecher', pos: [7.6, Y, -2.5], yaw: PI + 0.5 },
      { kind: 'equalizer_saeule', pos: [-7.4, Y, 8.4], height: 3.6, yaw: -0.4 },
      { kind: 'equalizer_saeule', pos: [7.4, Y, 8.4], height: 4.2, yaw: PI + 0.4 },
      { kind: 'antenne', pos: [-5.6, Y - 1.8, -37], height: 6 },
      { kind: 'neon_ring', pos: [-8.6, Y + 3, -14], radius: 1.5, color: 'magenta', yaw: -0.5 },
      { kind: 'neon_ring', pos: [8.6, Y + 3.5, -27], radius: 1.7, color: 'cyan', yaw: 0.5 },
      { kind: 'neonbogen', pos: [0, Y, -33.6], width: 5.6, height: 3.8, color: 0x40e8ff },
      { kind: 'equalizer_saeule', pos: [5.4, Y, -43], height: 3.2, yaw: PI + 0.3 },
      { kind: 'neon_ring', pos: [-9.5, Y + 4, -60], radius: 1.4, color: 'gelb', yaw: -0.6 },
      { kind: 'neonbogen', pos: [0, Y, -56.4], width: 6.6, height: 4.2, color: 0xff4af0 },
      { kind: 'lautsprecher', pos: [-5.2, Y, -64.8], yaw: -0.2 },
      { kind: 'neon_ring', pos: [9.5, Y + 4.5, -74], radius: 1.9, color: 'magenta', yaw: 0.6 },
      { kind: 'equalizer_saeule', pos: [-6, Y, -83], height: 3.8, yaw: -0.3 },
      { kind: 'equalizer_saeule', pos: [6, Y, -83], height: 3.4, yaw: PI + 0.3 },
      { kind: 'neon_ring', pos: [-9.4, Y + 4, -101], radius: 1.6, color: 'cyan', yaw: -0.6 },
      { kind: 'neonbogen', pos: [0, Y, -109.6], width: 6.6, height: 4.4, color: 0x7aff9a },
      { kind: 'antenne', pos: [7.2, Y, -132.5], height: 7 },
      { kind: 'kabel', from: [7.2, Y + 7, -132.5], to: [12.6, Y + 2.6, -132.6], sag: 1.2 },
      { kind: 'lautsprecher', pos: [-7, Y, -127], yaw: -0.3 },
    ] },
    // Taktgasse: rotes Tor, blaue Brücke über der flachen Grube
    { type: 'piep_block', id: 'tor_rot', color: RED, pos: [0, Y, -9.5], size: [6, 4, 1], cell: 2 },
    { type: 'piep_block', id: 'bruecke_blau', color: BLUE, pos: [0, Y - 1, -15], size: [6, 1, 5], cell: 2 },
    // Reihe 1: Streifen rot/blau (2 m)
    ...piepBands(0, Y, -20, 5, 2, [RED, BLUE, RED, BLUE, RED, BLUE, RED], { id: 'r1', cell: 2 }),
    // Reihe 2: erst rot, dann blau – im Wechsel hinüberspringen
    ...piepBands(0, Y, -44, 6, 6, [RED, BLUE], { id: 'r2', cell: 2 }),
    { type: 'platform', pos: [4, Y, -63.5], size: [2.4, 1.2, 2.4], style: 'stone' },   // Podest Bumerang-Werfer 1
    // Reihe 3: Schachbrett (2-m-Würfel)
    { type: 'piep_block', id: 'r3', pos: [0, Y - 2, -74], cell: 2, map: checker(4, 8) },
    // Reihe 4: Laufwelle (vier Gruppen, je 4 Zählzeiten rückt der feste Doppelstreifen vor)
    ...piepBands(0, Y, -94, 6, 3, [R0, B4, B0, R4, R0], { id: 'r4', cell: 2 }),
    // Warp-Box (geradeaus) – Rundweg rechts: Piep-Steine zwischen den Plattformen
    // (Ostseite rot, Südseite blau, Westseite rot: an jeder Plattform auf die passende Farbe warten)
    { type: 'piep_block', id: 'rw_a', color: RED, pos: [16.5, Y - 1, -115.5], size: [2, 1, 2], cell: 2 },
    { type: 'piep_block', id: 'rw_b', color: RED, pos: [19.5, Y - 1, -115.5], size: [2, 1, 2], cell: 2 },
    { type: 'piep_block', id: 'rw_c', color: BLUE, pos: [23.25, Y - 1, -119.75], size: [2, 1, 2], cell: 2 },
    { type: 'piep_block', id: 'rw_d', color: BLUE, pos: [23.25, Y - 1, -123], size: [2, 1, 2], cell: 2 },
    { type: 'piep_block', id: 'rw_e', color: BLUE, pos: [23.25, Y - 1, -126.25], size: [2, 1, 2], cell: 2 },
    { type: 'piep_block', id: 'rw_f', color: RED, pos: [19.5, Y - 1, -130.75], size: [2, 1, 2], cell: 2 },
    { type: 'piep_block', id: 'rw_g', color: RED, pos: [16.5, Y - 1, -130.75], size: [2, 1, 2], cell: 2 },
    { type: 'warpbox', id: 'warp_turm_ein', pos: [-2.5, Y, -130.5], target: 'warp_turm' },

    // ======================================================== 3  Piep-Block-Treppe (30 m hoch) zum Checkpoint
    { type: 'warpbox', id: 'warp_turm', pos: [3, Y, -153.5], target: 'warp_turm_ein' },
    // Treppenläufe: je vier schwebende Stufen (1,5 m hoch, 1,5 m tief) und ein fester Absatz – 7,5 m je Lauf
    { type: 'piep_treppe', id: 'f1', from: [-5.25, Y + 0.5, -159.2], dir: [1, 0], ...STEPS, colors: RED },
    { type: 'piep_treppe', id: 'f2', from: [1.5, 9, -161.95], dir: [0, -1], ...STEPS, colors: BLUE },
    { type: 'piep_treppe', id: 'f3', from: [-0.75, 16.5, -169], dir: [-1, 0], ...STEPS, colors: RED },
    { type: 'piep_treppe', id: 'f4', from: [-7.5, 24, -171.55], dir: [0, -1], ...STEPS, colors: [RED, RED, BLUE, BLUE] },
    // Viererlift (vier Figuren) und Kletterwand (Krallen-Anzug) zum Stempel-Sims
    { type: 'platform', pos: [-2, YC, -185.5], size: [1.6, 0.2, 3.4], style: 'stone' },
    { type: 'platform', pos: [-3.7, YC, -183], size: [5, 0.2, 1.6], style: 'stone' },
    { type: 'multilift', id: 'vierer', pos: [-4.5, YC, -185.5], size: [3.4, 0.5, 3.4], rise: 7, need: 4 },
    { type: 'wall', pos: [-1.6, YC, -189.1], size: [0.8, 7.4, 3.8], climbable: true, style: 'stone' },
    { type: 'deco_w4', items: [
      { kind: 'antenne', pos: [11.8, YC, -192], height: 6 },
      { kind: 'equalizer_saeule', pos: [12, YC, -177.2], height: 3.4, yaw: PI + 0.5 },
      { kind: 'neon_ring', pos: [14.5, YC + 4, -186], radius: 2, color: 'magenta', yaw: 0.8 },
      { kind: 'neon_ring', pos: [-12, 14, -165], radius: 1.8, color: 'cyan', yaw: -0.8 },
      { kind: 'lautsprecher', pos: [-8.2, Y, -153], yaw: -0.4 },
      { kind: 'equalizer_saeule', pos: [6.6, Y, -151.6], height: 3.8, yaw: PI + 0.4 },
    ] },

    // ======================================================== 4  Abstieg, Uhrenplatz, Rutsche
    { type: 'piep_block', id: 'ab_rot', color: RED, pos: [1, 12, -214.5], size: [6, 1, 3], cell: 2 },
    { type: 'piep_block', id: 'ab_blau', color: BLUE, pos: [1, 12, -217.5], size: [6, 1, 3], cell: 2 },
    { type: 'warpbox', id: 'warp_rein', pos: [1, 13, -224], target: 'warp_uhr' },
    { type: 'warpbox', id: 'warp_uhr', pos: [-4, YU, -231.2], target: 'warp_rein' },
    { type: 'pipe', id: 'rohr_bonus', pos: [3.6, YU, -233.6], height: 1.2, target: 'bonus_ein' },
    { type: 'piep_rutsche', id: 'rutsche', pos: [0, YR, -247], size: [3.4, YU - YR, 16], axis: 'z', dir: 1, band: 2, colors: RED },
    { type: 'deco_w4', items: [
      { kind: 'neonbogen', pos: [0, YU, -238.4], width: 6.4, height: 4.2, color: 0x40e8ff },
      { kind: 'lautsprecher', pos: [6, YR, -264.5], yaw: PI + 0.4 },
      { kind: 'equalizer_saeule', pos: [-6.2, YR, -265], height: 3.6, yaw: -0.4 },
      { kind: 'neon_ring', pos: [-9, 16, -248], radius: 2, color: 'gelb', yaw: -0.7 },
      { kind: 'neon_ring', pos: [11, 18, -246], radius: 1.6, color: 'magenta', yaw: 0.7 },
    ] },

    // ======================================================== 5  Schlussaufstieg und Ziel
    { type: 'piep_treppe', id: 'g1', from: [0, YR + 0.5, -267.75], dir: [0, -1], ...STEPS, colors: RED },
    { type: 'piep_treppe', id: 'g2', from: [0, 19, -277.25], dir: [0, -1], ...STEPS, colors: [BLUE, BLUE, RED, RED] },
    { type: 'deco_w4', items: [
      { kind: 'neonbogen', pos: [0, YZ, -283.7], width: 6.2, height: 4.4, color: 0xff4af0 },
      { kind: 'lautsprecher', pos: [-7, YZ, -293.2], yaw: -0.3 },
      { kind: 'lautsprecher', pos: [7, YZ, -293.2], yaw: PI + 0.3 },
      { kind: 'antenne', pos: [-7.2, YZ, -285.7], height: 7 },
    ] },
    { type: 'platform', pos: [5.5, YZ, -286.2], size: [2.2, 0.8, 2.2], style: 'stone' },   // Podest Bumerang-Werfer 7

    // ======================================================== Bonusraum (abseits)
    { type: 'pipe', id: 'bonus_ein', pos: [BX - 6.5, 0, BZ + 6.5], height: 1.2 },
    { type: 'pipe', id: 'bonus_aus', pos: [BX + 6.5, 0, BZ - 6.5], height: 1.2, target: 'rohr_bonus' },
    { type: 'wall', pos: [BX, 0, BZ - 10.3], size: [20.6, 4, 0.6], style: 'stone' },
    { type: 'wall', pos: [BX - 10.3, 0, BZ], size: [0.6, 4, 20.6], style: 'stone', camIgnore: true },
    { type: 'wall', pos: [BX + 10.3, 0, BZ], size: [0.6, 4, 20.6], style: 'stone', camIgnore: true },
    { type: 'deco_w4', items: [
      { kind: 'neon_ring', pos: [BX - 6, 4.2, BZ - 9.6], radius: 1.3, color: 'cyan', yaw: PI / 2 },
      { kind: 'neon_ring', pos: [BX + 6, 4.2, BZ - 9.6], radius: 1.3, color: 'magenta', yaw: PI / 2 },
      { kind: 'equalizer_saeule', pos: [BX - 9, 0, BZ - 9], height: 3.6, yaw: 0.8 },
      { kind: 'equalizer_saeule', pos: [BX + 9, 0, BZ - 9], height: 3.6, yaw: PI - 0.8 },
    ] },
  ],
  blocks: [
    { kind: 'question', pos: [3, Y + 2.3, -1.5], content: 'wachstumsbeere' },
    { kind: 'hidden', pos: [23.25, Y + 2.3, -130.75], content: 'oneup' },            // Rundweg: 1-Up-Geheimnis
    { kind: 'question', pos: [9, YC + 2.3, -180], content: 'krallen' },               // Krallen-Anzug (Kletterwand)
    { kind: 'question', pos: [4.4, YC + 2.3, -187.5], content: 'spiegel' },
    { kind: 'question', pos: [-1.5, YR + 2.3, -258.5], content: 'spiegel' },
  ],
  enemies: [
    { kind: 'feuer_werfer', id: 'bw1', weapon: 'bumerang', pos: [4, Y + 1.2, -63.5], axis: [1, 0], pace: 0.4, sight: 12 },
    { kind: 'feuer_werfer', id: 'bw2', weapon: 'bumerang', pos: [5.5, Y, -125], axis: [0, 1], pace: 1.2, sight: 10 },
    { kind: 'feuer_werfer', id: 'bw3', weapon: 'bumerang', pos: [-12.6, Y, -116], axis: [1, 0], pace: 1.4, sight: 11 },
    { kind: 'feuer_werfer', id: 'bw4', weapon: 'bumerang', pos: [23.25, Y, -132.2], axis: [1, 0], pace: 0.8, sight: 10 },
    { kind: 'feuer_werfer', id: 'bw5', weapon: 'bumerang', pos: [-1.5, 19, -209], axis: [1, 0], pace: 1.2, sight: 10 },
    { kind: 'feuer_werfer', id: 'bw6', weapon: 'bumerang', pos: [-5, YU, -237.5], axis: [1, 0], pace: 1, sight: 10 },
    { kind: 'feuer_werfer', id: 'bw7', weapon: 'bumerang', pos: [5.5, YZ + 0.8, -286.2], axis: [1, 0], pace: 0.4, sight: 12 },
  ],
  items: [
    // 1 Start, Taktgasse, Reihen
    line([0, Y + 0.6, 2], [0, Y + 0.6, -4], 4),
    line([0, Y + 0.6, -7.5], [0, Y + 0.6, -18.5], 5),
    line([0, Y + 0.6, -21], [0, Y + 0.6, -33], 7),
    { kind: 'powerup', pos: [0, Y, -38.5], power: 'spiegel' },
    ring([0, Y + 0.6, -38.5], 2.4, 6),
    line([-2, Y + 0.6, -45], [-2, Y + 0.6, -55], 5), line([2, Y + 0.6, -45], [2, Y + 0.6, -55], 5),
    { kind: 'powerup', pos: [-2.5, Y, -59.6], power: 'spiegel' },
    arc([-3, Y + 0.6, -67], [3, Y + 0.6, -81], 6, 1.6),
    // Druckfelder: zwei Felder gleichzeitig (Heldin + Klon) schalten den Laserzaun ab
    { kind: 'pfeld', id: 'pf_a', pos: [-1.1, Y, -88.5], size: [1.8, 1.8], group: 'schranke', on: [{ open: 'laser' }, { coins: 5 }] },
    { kind: 'pfeld', id: 'pf_b', pos: [1.1, Y, -88.5], size: [1.8, 1.8], group: 'schranke' },
    line([0, Y + 0.6, -95.5], [0, Y + 0.6, -107.5], 5),
    // Steg zu Stern 1 und Rundweg
    line([-9, Y + 0.6, -116], [-17, Y + 0.6, -116], 4),
    line([12.5, Y + 0.6, -115.5], [23.5, Y + 0.6, -115.5], 5),
    line([23.25, Y + 0.6, -119.75], [23.25, Y + 0.6, -126.25], 3),
    line([19.5, Y + 0.6, -130.75], [16.5, Y + 0.6, -130.75], 2),
    ring([-2.4, Y + 0.6, -61.5], 1.2, 5),
    arc([-2.5, Y + 2.2, -124], [-2.5, Y + 2.2, -129], 3, 1),
    // 3 Treppe
    arc([-5.25, 3.1, -159.2], [-0.75, 7.6, -159.2], 4, 0.8),
    arc([1.5, 10.6, -161.95], [1.5, 15.1, -166.45], 4, 0.8),
    arc([-0.75, 18.1, -169], [-5.25, 22.6, -169], 4, 0.8),
    arc([-7.5, 25.6, -171.55], [-7.5, 30.1, -176.05], 4, 0.8),
    { kind: 'coins', pos: [-4.5, YC + 8.2, -189.2], r: 1.4, n: 5 },
    // 4 Abstieg, Uhrenplatz, Rutsche
    arc([6, 25.6, -199], [1, 19.6, -207], 4, 1.4),
    line([1, 13.6, -213.5], [1, 13.6, -218.5], 3),
    line([0, YU + 0.6, -240], [0, YR + 1, -253], 7),
    // Rutschenfuß: zwei Druckfelder gleichzeitig → Stern 3
    { kind: 'pfeld', id: 'pf_s1', pos: [-1.1, YR, -261.5], size: [1.8, 1.8], group: 'sternfelder', on: { reveal: 'stern_felder' } },
    { kind: 'pfeld', id: 'pf_s2', pos: [1.1, YR, -261.5], size: [1.8, 1.8], group: 'sternfelder' },
    // 5 Schlussaufstieg
    arc([0, YR + 2.1, -267.75], [0, YR + 6.6, -272.25], 4, 0.8),
    arc([0, YR + 9.6, -277.25], [0, YR + 14.1, -281.75], 4, 0.8),
    // Bonusraum: Druckschalter → zehn blaue Münzen in 10 s → Stern 2
    { kind: 'pswitch', id: 'p_schalter', pos: [BX, 0, BZ], time: 10, star: 1,
      coins: Array.from({ length: 10 }, (_, i) => [BX + Math.cos(i * PI / 5) * 5, i % 2 ? 2.1 : 0.6, BZ - Math.sin(i * PI / 5) * 5]) },
  ],
  checkpoint: { pos: [6.5, YC, -181], yaw: PI / 2 },
  stars: [
    [-19.8, Y + 0.4, -116],                                                   // 1: am Bumerang-Werfer vorbei
    { pos: [BX, 1.2, BZ - 2.4], hidden: true, id: 'stern_bonus' },             // 2: Bonusraum (Druckschalter)
    { pos: [0, YR + 1.2, -264], hidden: true, id: 'stern_felder' },          // 3: zwei Druckfelder am Rutschenfuß
  ],
  stamp: [-4.5, YC + 7.6, -189.2],
  goal: { pos: [0, YZ, -290.7], height: 9 },
  marks: {
    start: [0, Y, 5], gasse: [0, Y, -8], r1: [0, Y, -19.5], insel1: [0, Y, -38], r2: [0, Y, -43.5], insel2: [0, Y, -60],
    r3: [0, Y, -65.5], felder: [0, Y, -88.5], r4: [0, Y, -93], warp: [-2.5, Y, -130.5], stern1: [-19.8, Y, -116],
    rundweg: [12.75, Y, -115.5], turm: [3, Y, -153.5], checkpoint: [6.5, YC, -181], lift: [-4.5, YC, -185.5],
    abstieg: [6, 25, -198], uhrenplatz: [0, YU, -233], bonus: [BX, 0, BZ], rutsche: [0, YU, -239.5], felder3: [0, YR, -261.5],
    ziel: [0, YZ, -290.7],
  },
};
