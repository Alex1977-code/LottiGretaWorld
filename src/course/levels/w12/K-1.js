// K-1 „Siegerstraße über dem Wolkenmeer“ – Welt Krone „Kronen-Gipfel“ (Bonuswelt 12, die Abschlussprüfung; Bauplan: Detail K-1,
// eigene Gestaltung). Der längste und schwerste Kurs des Spiels: ≈ 950 m nach −Z hoch über einem goldenen Wolkenmeer, 500 s,
// **kein Kontrollpunkt, keine Power-ups, vier Warp-Boxen** – fast alle Gimmicks des Spiels hintereinander, mit Erholungsinseln
// (Marmor mit Goldkanten) und Bitcoin-Pfaden als Wegweiser. Thema skyway mit lokaler Variante „Kronen-Gipfel“ (LEVEL.prebuild),
// Musik course_champion; die Piep-Blöcke folgen dem Takt dieser Musik (150 BPM, Wechsel jeden Takt = doppeltes Tempo).
//
// Abschnitte (z, Höhe):
//   1 Schiebeblock-Auftakt (z 9 … −127, y 0 → 3): bunte Schwebeblöcke, dazwischen Schiebeblöcke, die von der Seite in die Lücke
//     gleiten, kurz verweilen und wieder hinausfahren (Lücken 3 m), Krakenpilze auf vier Schiebeblöcken und zwei Rastinseln,
//     ein Fahrblock in Laufrichtung. Startbogen mit Ampel.
//   2 Aufzugsschacht (z −127 … −213, y 3 → 29): Glasröhre hinauf zum ersten Sims, drei Aufzüge im goldenen Gerüst, zwei 1 m
//     schmale Stege mit je zwei rennenden Pilzlingen, drei Feuer-Werfer (je einer an den Aufzugs-Simsen und auf dem Gipfel),
//     Warp-Box 1.
//   3 Piep-Block-Strecke und Zauberarena (z −217 … −375, y 14 → 18.5 → 16 → 14): rote und blaue Piep-Blöcke wechseln in
//     **jedem Takt** (doppeltes Tempo), Treppe, Zickzack-Feld, Trittsteine; Glasröhren-Kanone in die Zauberarena (25 × 25 m:
//     Marmorring um ein Feld nachwachsender Bröckelblöcke, vier Feuerstäbe, drei Zauberkröten; alle besiegt → Warp-Box 2).
//   4 Graue Plattformen (z −385 … −545, y 9 → 10.5): Pendelstacheln, rotierende Stachelwalzen, Wuschel-Schwärme; die
//     Topf-Schnappblume vom Start frisst Wuschel. Stern 2 und Warp-Box 3 am Ende.
//   5 Wandsprung-Turm und Wasserwürfel (z −556 … −720, y 4 → 35 → 36): Federplattform, Wandsprung-Schacht, Hörner-Ameisen als
//     Stufen an der Turmwand, Rankenschnapper-Kette; drei schwebende Wasserwürfel mit blauen (Takt) und roten (ohne Pause)
//     Stachelblöcken; Glasröhre hinab zum Finale.
//   6 Boost-Finale (z −737 … −946, y 12 → 16): goldene Bahn mit Boost-Pfeilen und Lücken, Feuerring-Schockwellen zum
//     Überspringen, fünf Schlüsselmünzen öffnen Warp-Box 4 auf dem Platz (20 × 22 m) → Siegerplatz mit Goldtreppe und dem
//     **goldenen Zielmast** (Krone, Kronenfahne), Feier mit Konfetti, Feuerwerk und jubelnden Freunden.
//
// Sterne: 0 hinter der Piep-Block-Strecke (hinter der Kanonen-Insel über drei Piep-Blöcke zum Sternsockel) · 1 Sternplatz am
//         Ende der grauen Plattformen, umkreist von einem dichten Wuschel-Ring – die Topf-Schnappblume frisst ihn auf · 2 am
//         Ende der Boost-Strecke: hinter dem Platz über den schmalen Goldsteg zwischen zwei Feuerring-Schockwellen zum Sockel.
// Stempel: zweite Stufe der Goldtreppe vor der Zielfahne (rechts). Extraleben: unsichtbare Blöcke auf Rastinsel 2, auf dem
// Aufzugs-Gipfel und auf der Erholungsinsel der grauen Plattformen.
// Gegner: Krakenpilz 6, Pilzling 4 (rennen auf den Stegen), Feuer-Werfer 3, Zauberkröte 3, Wuschel 22 (Schwärme), Hörner-
// Ameise 6, Rankenschnapper 3, Stachelblöcke 7 (blau 4, rot 3), Feuerringe 9, Feuerstäbe 4, Pendelstacheln 7, Stachelwalzen 2.

import {
  PI, line, ring, arc, column, sign, marmor, block, kronenHimmel, goldkanten, sternchen, geruest, sockel, fahnen, ballons,
  zauberkreis, piepTakt, goldenerZielmast, siegesfeier, fernAus, Bld, GOLD, gradY,
} from './_helpers_a.js';

// ---------------------------------------------------------------- Höhen
const Y1 = 0;        // Start, Schiebeblöcke (steigt bis 3)
const YS = 3;        // Ende Abschnitt 1, Glasröhre
const YA = 10, YB = 17, YC = 23, YG = 29;   // Aufzugsschacht: Sims A, Steg 1, Steg 2, Gipfel
const YP = 14, YT = 18, YK = 16;          // Piep-Strecke, Treppe oben, Kanonen-Insel
const YR = 14;       // Zauberarena
const YG4 = 9;       // graue Plattformen
const YF = 4, YL1 = 11, YL2 = 20, YL3 = 28, YL4 = 35;   // Turm
const YW = 35;       // Wasserwürfel (Oberkante)
const YBO = 12, YPL = 16, YZ = 24;   // Boost-Bahn, Platz, Siegerplatz

// ---------------------------------------------------------------- Maße (auch für den Test)
export const MK1 = {
  START: { x0: -7, x1: 7, z0: 9, z1: -5, top: Y1 },
  R1: { x0: -4.5, x1: 4.5, z0: -32, z1: -42, top: Y1 },
  R2: { x0: -4.5, x1: 4.5, z0: -69, z1: -80, top: 2 },
  R3: { x0: -5, x1: 5, z0: -115, z1: -127, top: YS },
  SIMS_A: { x0: -2.5, x1: 2.5, z0: -136, z1: -141, top: YA },
  SIMS_B: { x0: -2.5, x1: 2.5, z0: -162, z1: -168.7, top: YB },
  SIMS_C: { x0: -2.5, x1: 2.5, z0: -190, z1: -196.7, top: YC },
  GIPFEL: { x0: -4.5, x1: 4.5, z0: -199.9, z1: -213, top: YG },
  TAKT: { x0: -3.5, x1: 3.5, z0: -217, z1: -227, top: YP },
  R4: { x0: -3.5, x1: 3.5, z0: -255, z1: -267, top: YT },
  R5: { x0: -5, x1: 5, z0: -300, z1: -312, top: YK },
  ARENA: { x: 0, z: -362, half: 12.5, inner: 7, top: YR },
  G0: { x0: -4.5, x1: 4.5, z0: -385, z1: -395, top: YG4 },
  ERHOLUNG: { x0: -4, x1: 4, z0: -450, z1: -460, top: YG4 },
  STERNPLATZ: { x0: -6, x1: 6, z0: -520, z1: -545, top: 10.5 },
  TURMFUSS: { x0: -6, x1: 6, z0: -556, z1: -568, top: YF },
  P1: { x0: -3, x1: 3, z0: -629.5, z1: -637.5, top: 35.5 },
  P2: { x0: -3, x1: 3, z0: -669.5, z1: -677, top: 36 },
  P3: { x0: -5, x1: 5, z0: -706.5, z1: -720, top: 36 },
  PLATZ: { x0: -10, x1: 10, z0: -915, z1: -937, top: YPL },
  SIEGER: { x0: -9, x1: 9, z0: -957, z1: -975, top: YZ },
};
const M = MK1;

// ---------------------------------------------------------------- Abschnitt 1: Schiebeblöcke
// Schiebeblock (mover 3 × 1 × 3): gleitet von der Seite (sx) in die Lücke bei x 0 und wieder hinaus; z = Mitte, top = Oberseite
const slider = (id, z, top, sx, color, o = {}) => ({ type: 'mover', id, path: [[sx, top - 1, z], [0, top - 1, z]], size: [3, 1, 3], speed: o.speed ?? 3, wait: o.wait ?? 1.6, phase: o.phase ?? 0, color });
export const SLIDERS = {
  s1: { z: -15.5, top: 0, sx: -5 }, s2: { z: -27.5, top: 0, sx: 5 }, s3: { z: -52.5, top: 1, sx: -5 }, s4: { z: -58.5, top: 1, sx: 5 },
  s6: { z: -110.5, top: 3, sx: -5 },
};

// ---------------------------------------------------------------- Abschnitt 3: Piep-Blöcke (jeder Takt = 4 Zählzeiten)
const BEEP = { every: 4, warn: 2 };
const piep = (id, color, pos, size, o = {}) => ({ type: 'piep_block', id, color, pos, size, ...BEEP, ...o });

// ---------------------------------------------------------------- Abschnitt 3: Zauberarena (Bröckelblöcke im Innenfeld)
const A = M.ARENA;
export const FEUERSTAB_ORTE = [[-3.5, -358.5], [3.5, -358.5], [-3.5, -365.5], [3.5, -365.5]];
// Bröckelbrücken: ein Kreuz aus drei Block breiten Stegen vom Marmorring zum Mittelsockel; dazwischen geht es in die Tiefe, die
// Feuerstäbe kreisen über den Stegen
const arenaFeld = () => {
  const out = [];
  for (let ix = 0; ix < 14; ix++) for (let iz = 0; iz < 14; iz++) {
    const x = -6.5 + ix, z = A.z + 6.5 - iz;
    if (Math.abs(x) < 1.6 && Math.abs(z - A.z) < 1.6) continue;                                   // Mittelsockel
    if (Math.abs(x) > 1.6 && Math.abs(z - A.z) > 1.6) continue;                                   // nur das Kreuz
    out.push([x, YR - 1, z]);
  }
  return out;
};

// ---------------------------------------------------------------- Abschnitt 5: Hörner-Ameisen an der Turmwand (Gesicht z −582)
// Hörner-Ameisen-Strom: kommt aus einem Loch am Fuß der Turmwand, klettert hinauf und verschwindet oben in einem Loch (nur aufwärts –
// niemand kommt entgegen)
const ameisenWand = (x) => ({ path: [[x, YL2, -582, 0, 0, 1], [x, YL3, -582, 0, 0, 1], [x, YL3, -582, 0, 1, 0], [x, YL3, -584.6, 0, 1, 0]] });
// Rankenschnapper-Kette: drei Ranken wachsen nacheinander waagerecht aus der Turmwand (z −590) zur Kamera hin (Köpfe vorn), Stufen
// im Zickzack hinauf; Wurzel hinten an der Wand = sicherer Stand, der Kopf schnappt erst vorn
const ranke = (id, x, y, phase) => ({ kind: 'rankenschnapper', id, pos: [x, y, -590], path: [[x, y, -590], [x, y + 0.1, -587.5], [x, y + 0.2, -585]], size: 1.5, grow: [1.0, 4.2, 0.9, 1.4], phase });

// ---------------------------------------------------------------- Abschnitt 6: Feuerringe
const fring = (id, x, z, top, o = {}) => ({ kind: 'feuerring', id, pos: [x, top, z], radius: o.radius ?? 4, height: 0.7, period: o.period ?? 2.4, wait: o.wait ?? 0.8, phase: o.phase ?? 0, color: o.color ?? 'rot', farHide: 52 });

/** Aufbau nach den Bausteinen: Goldkanten, Gerüst, Sockel, Fahnen, Ballons, Zauberkreis, Sternchen. */
function build(level) {
  goldkanten(level);
  geruest(level, { x0: -4.2, x1: 4.2, z0: -133, z1: -199, y0: -14, y1: 31, every: 11, rails: [[0, -143.3, YA, YB], [0, -170.3, YB, YC], [0, -198.3, YC, YG]] });
  sockel(level, [
    [-6.2, 7.6, Y1 + 0.01, 3, 0.5], [6.2, 7.6, Y1 + 0.01, 3, 0.5],
    // Sternsockel hinter der Kanonen-Insel (Stern 0) – Säule bis in die Wolken
    [-10, -321, YK, 22, 1.4],
    // Säulen der Zauberarena (Ecken)
    [-12, -350, YR + 4, 4, 0.55], [12, -350, YR + 4, 4, 0.55], [-12, -374, YR + 4, 4, 0.55], [12, -374, YR + 4, 4, 0.55],
    // Sockel des dritten Sterns
    [0, -947, YPL, 20, 1.8],
  ]);
  zauberkreis(level, A.x, YR + 0.02, A.z, 9.4);
  fahnen(level, [
    [-6.6, Y1, 3, 4.6, 'rot'], [6.6, Y1, 3, 4.6, 'blau'], [-4.2, 2, -70, 4, 'gold'], [4.2, 2, -70, 4, 'gruen'],
    [-4.6, YS, -116, 4, 'lila'], [4.6, YS, -116, 4, 'rosa'], [-4.2, YG, -202, 4.4, 'rot'], [4.2, YG, -202, 4.4, 'blau'],
    [-3.2, YP, -218, 4, 'gold'], [3.2, YP, -218, 4, 'lila'], [-4.6, YK, -301, 4, 'rot'], [4.6, YK, -301, 4, 'blau'],
    [-12, YR + 4.02, -350, 3, 'lila'], [12, YR + 4.02, -350, 3, 'lila'], [-12, YR + 4.02, -374, 3, 'rosa'], [12, YR + 4.02, -374, 3, 'rosa'],
    [-4.2, YG4, -386, 4, 'gruen'], [4.2, YG4, -386, 4, 'gold'], [-3.6, YG4, -451, 3.6, 'rot'], [3.6, YG4, -451, 3.6, 'blau'],
    [-5.6, 10.5, -521, 4.2, 'gold'], [5.6, 10.5, -521, 4.2, 'rot'], [-5.6, YF, -557, 4, 'blau'], [5.6, YF, -557, 4, 'gruen'],
    [-5.6, YL4, -591, 5, 'rot'], [5.6, YL4, -591, 5, 'gold'], [-4.6, 36, -709, 4, 'lila'], [4.6, 36, -709, 4, 'rosa'],
    [-9.6, YPL, -916, 5, 'rot'], [9.6, YPL, -916, 5, 'blau'], [-9.6, YPL, -936, 5, 'gold'], [9.6, YPL, -936, 5, 'gruen'],
    [-8.6, YZ, -958, 5.4, 'rot'], [8.6, YZ, -958, 5.4, 'blau'], [-5.6, YZ + 4, -985, 6, 'gold'], [5.6, YZ + 4, -985, 6, 'gold'],
  ]);
  ballons(level, [
    [-11, 6, -20, 5], [12, 8, -60, 4], [-12, 12, -150, 5], [11, 20, -185, 4], [-10, 20, -250, 5], [13, 22, -330, 4],
    [-14, 14, -420, 5], [12, 14, -500, 4], [-11, 30, -620, 5], [12, 33, -690, 4], [-12, 18, -800, 5], [12, 20, -880, 4],
    [-13, 30, -965, 6], [13, 31, -980, 6],
  ]);
  sternchen(level, [
    [0, 5.2, -2.5, 0.5], [-3, 3.2, -36, 0.35], [3.2, 5, -74, 0.35], [-2, 34, -206, 0.4], [2.5, 22, -262, 0.35],
    [0, YR + 6, A.z, 0.7, 0xffd0ff], [-4, 14, -455, 0.35], [0, 40, -593, 0.5], [0, 22, -925, 0.45], [0, 34, -966, 0.6],
  ]);
  // Sockelzier der Siegertreppe: rote Teppichbahn
  if (level.view) {
    const b = new Bld();
    for (let i = 0; i < 3; i++) b.box(2.2, 0.04, 3, 0, YZ + 1 + i, -976.5 - 3 * i, 0xd8283a, { r: 0.01 });
    b.box(2.2, 0.04, 17, 0, YZ, -966.5, 0xd8283a, { r: 0.01 });
    b.box(2.2, 0.04, 11, 0, YZ + 4, -990, 0xd8283a, { r: 0.01 });
    b.flush(level, { castShadow: false });
  }
}

/** Haken nach Figur/Kamera: goldener Zielmast, Siegesfeier, Pieps im Musiktakt. */
function setup(level) {
  goldenerZielmast(level);
  siegesfeier(level, {
    goal: [0, YZ + 4, -990],
    cannons: [[-5.4, YZ + 4, -985.4, 0.5, 0.8], [5.4, YZ + 4, -985.4, -0.5, 0.8], [-5.4, YZ + 4, -995, 0.5, -0.2], [5.4, YZ + 4, -995, -0.5, -0.2]],
    friends: [
      { pos: [-5.4, YZ, -970], yaw: -PI / 2 + 0.5, model: 'kruemel' }, { pos: [5.4, YZ, -970], yaw: -PI / 2 - 0.5, model: 'bunny_small' },
      { pos: [-7, YZ, -963.5], yaw: -PI / 2 + 0.7, model: 'bunny_small' }, { pos: [7, YZ, -963.5], yaw: -PI / 2 - 0.7, model: 'kruemel' },
    ],
  });
  piepTakt(level, [[-14, -215, 14, -330]]);
  fernAus(level, /^(feuerstab|pendelstachel|stachelwalze_rot|stachelblock|modell:boost_arrow|modell:trampoline)$/, 62);
}

export const LEVEL = {
  id: 'K-1',
  world: 12,
  title: 'Siegerstraße über dem Wolkenmeer',
  archetype: 'parcours',
  theme: 'skyway',
  music: 'course_champion',
  beepTheme: 'course_champion',
  timeLimit: 500,
  start: { pos: [0, Y1, 6], yaw: PI / 2 },
  killY: -14,
  checkpoint: null,
  instances: { coin: { farHide: 48, shadow: false } },
  farHide: 46,
  prebuild: (level) => kronenHimmel(level, { crowns: [{ pos: [0, 58, -1010], r: 9, h: 9 }, { pos: [-120, 40, -420], r: 7, h: 7 }, { pos: [130, 46, -700], r: 8, h: 8 }] }),
  build,
  setup,
  camera: [
    { from: 14, to: -128, pitch: 44, dist: 13, fov: 40, ahead: 2.2 },
    { from: -128, to: -214, pitch: 36, dist: 14, fov: 42, height: 1.4, ahead: 2.2 },
    { from: -214, to: -314, pitch: 46, dist: 13, fov: 40, ahead: 2.4 },
    { from: -314, to: -347, pitch: 44, dist: 15, fov: 42, ahead: 3 },
    { from: -347, to: -380, pitch: 54, dist: 17, fov: 42, x: 0, xLock: 0.5, ahead: 1.5 },
    { from: -380, to: -548, pitch: 44, dist: 13, fov: 40, ahead: 2.4 },
    { from: -548, to: -598, pitch: 28, dist: 15, fov: 44, height: 2, ahead: 1.2, x: 0, xLock: 0.4 },
    { from: -598, to: -724, pitch: 40, dist: 13.5, fov: 40, ahead: 2.4 },
    { from: -724, to: -950, pitch: 38, dist: 14, fov: 42, ahead: 3.6, lead: 0.7 },
    { from: -950, to: -1000, pitch: 34, dist: 15, fov: 42, height: 1.6, ahead: 2 },
  ],
  segments: [
    // =================================================================================== 1 Schiebeblock-Auftakt
    marmor(M.START.x0, M.START.x1, M.START.z0, M.START.z1, Y1, 3),
    { type: 'start_bogen', id: 'startbogen', pos: [0, Y1, -2.6], yaw: PI / 2, width: 9, mode: 'pass' },
    sign(-4.8, Y1, 5.6, 'Siegerstraße über\ndem Wolkenmeer', { size: [3.4, 1.15], yaw: 0.25 }),
    sign(4.4, Y1, -3.4, 'Kein Kontrollpunkt –\ndu schaffst das!', { size: [3, 1], yaw: -0.25 }),
    block(-1.5, 1.5, -8, -11, Y1, 'red'),
    slider('s1', SLIDERS.s1.z, 0, SLIDERS.s1.sx, 'yellow'),
    block(-1.5, 1.5, -20, -23, Y1, 'blue'),
    slider('s2', SLIDERS.s2.z, 0, SLIDERS.s2.sx, 'green', { phase: 0.5 }),
    marmor(M.R1.x0, M.R1.x1, M.R1.z0, M.R1.z1, Y1, 3),
    block(-1.5, 1.5, -45, -48, 1, 'orange'),
    slider('s3', SLIDERS.s3.z, 1, SLIDERS.s3.sx, 'pink'),
    slider('s4', SLIDERS.s4.z, 1, SLIDERS.s4.sx, 'cyan'),
    block(-1.5, 1.5, -63, -66, 2, 'purple'),
    marmor(M.R2.x0, M.R2.x1, M.R2.z0, M.R2.z1, 2, 3),
    block(-1.5, 1.5, -83, -86, 2, 'red'),
    { type: 'mover', id: 's5', path: [[0, 1, -90.5], [0, 1, -98.5]], size: [3, 1, 3], speed: 2.5, wait: 1.1, color: 'yellow' },
    block(-1.5, 1.5, -103, -106, YS, 'blue'),
    slider('s6', SLIDERS.s6.z, YS, SLIDERS.s6.sx, 'green', { phase: 0.3 }),
    marmor(M.R3.x0, M.R3.x1, M.R3.z0, M.R3.z1, YS, 3),
    sign(-3.4, YS, -117, 'Ab in die Röhre –\nhinauf zum Aufzug!', { size: [2.8, 0.95], yaw: 0.2 }),

    // =================================================================================== 2 Aufzugsschacht
    { type: 'glasspipe', id: 'roehre_schacht', path: [[0, YS + 1, -122.5], [0, YS + 1, -127.5], [0, 6.5, -130.4], [0, YA + 1, -132.6], [0, YA + 1, -137.2]], radius: 1, speed: 12, oneWay: true, coins: 4 },
    marmor(M.SIMS_A.x0, M.SIMS_A.x1, M.SIMS_A.z0, M.SIMS_A.z1, YA, 2, { under: 1 }),
    { type: 'mover', id: 'lift1', path: [[0, YA - 0.5, -143.3], [0, YB - 0.5, -143.3]], size: [2.6, 0.5, 2.6], speed: 2.4, wait: 1.3, color: 'yellow' },
    marmor(-0.5, 0.5, -144.9, -162, YB, 0.8, { under: 0 }),
    marmor(M.SIMS_B.x0, M.SIMS_B.x1, M.SIMS_B.z0, M.SIMS_B.z1, YB, 2, { under: 1 }),
    { type: 'mover', id: 'lift2', path: [[0, YB - 0.5, -170.3], [0, YC - 0.5, -170.3]], size: [2.6, 0.5, 2.6], speed: 2.4, wait: 1.3, color: 'yellow', phase: 0.5 },
    marmor(-0.5, 0.5, -171.9, -190, YC, 0.8, { under: 0 }),
    marmor(M.SIMS_C.x0, M.SIMS_C.x1, M.SIMS_C.z0, M.SIMS_C.z1, YC, 2, { under: 1 }),
    { type: 'mover', id: 'lift3', path: [[0, YC - 0.5, -198.3], [0, YG - 0.5, -198.3]], size: [2.6, 0.5, 2.6], speed: 2.4, wait: 1.3, color: 'yellow' },
    marmor(M.GIPFEL.x0, M.GIPFEL.x1, M.GIPFEL.z0, M.GIPFEL.z1, YG, 3),

    // =================================================================================== 3 Piep-Block-Strecke
    marmor(M.TAKT.x0, M.TAKT.x1, M.TAKT.z0, M.TAKT.z1, YP, 3),
    sign(-3, YP, -219.4, 'Piep-Blöcke: jeder\nTakt ein Wechsel!', { size: [2.8, 0.95], yaw: 0.2 }),
    piep('p1', 'rot', [0, YP - 1, -230], [3, 1, 6]),
    marmor(-1.5, 1.5, -233, -235, YP, 1, { under: 0 }),
    piep('p2', 'blau', [0, YP - 1, -238], [3, 1, 6]),
    piep('p3', 'rot', [0, YP - 1, -244], [3, 1, 6]),
    marmor(-1.5, 1.5, -247, -249, YP, 1, { under: 0 }),
    { type: 'piep_treppe', id: 'ptreppe', from: [0, YP, -249.75], dir: [0, -1], steps: 4, rise: 1, run: 1.5, width: 3, colors: ['rot', 'rot', 'blau', 'blau'], ...BEEP },
    marmor(M.R4.x0, M.R4.x1, M.R4.z0, M.R4.z1, YT, 3),
    // Zickzack-Feld (Zellen 2 m): rote Spur links, blaue Spur rechts, zweimal hinüber
    { type: 'piep_block', id: 'pfeld', pos: [0, YT - 2, -275], cell: 2, map: ['rr..', 'rr..', 'rrbb', '..bb', '..bb', 'rrbb', 'rr..', 'rr..'], ...BEEP },
    marmor(-2, 2, -283, -285, YT, 1, { under: 0 }),
    piep('t1', 'blau', [0, YT - 1.5, -288], [3, 1, 3]),
    piep('t2', 'rot', [0, YT - 2.2, -292.5], [3, 1, 3]),
    piep('t3', 'blau', [0, YT - 2.9, -297], [3, 1, 3]),
    marmor(M.R5.x0, M.R5.x1, M.R5.z0, M.R5.z1, YK, 3),
    sign(3.6, YK, -302, 'Kanone zur\nZauberarena', { size: [2.4, 0.9], yaw: -0.2 }),
    // hinter der Kanonen-Insel: drei Piep-Blöcke zum Sternsockel (Stern 0)
    piep('ps1', 'rot', [-3.8, YK - 1, -314.6], [2, 1, 2]),
    piep('ps2', 'blau', [-6.6, YK - 1, -317.2], [2, 1, 2]),
    marmor(-11.4, -8.6, -319.6, -322.4, YK, 2, { under: 0 }),
    { type: 'glasspipe', id: 'kanone_arena', path: [[0, YK + 1, -305.4], [0, YK + 1, -309.6], [0, YK + 2.4, -311.6]], radius: 1, speed: 12, oneWay: true, cannon: { target: [0, YR, -351.6], arc: 6 } },

    // =================================================================================== 3b Zauberarena
    marmor(-A.half, A.half, A.z + A.half, A.z + A.inner, YR, 3),                // Nordring
    marmor(-A.half, A.half, A.z - A.inner, A.z - A.half, YR, 3),                // Südring
    marmor(-A.half, -A.inner, A.z + A.inner, A.z - A.inner, YR, 3, { under: 0 }),
    marmor(A.inner, A.half, A.z + A.inner, A.z - A.inner, YR, 3, { under: 0 }),
    marmor(-1.5, 1.5, A.z + 1.5, A.z - 1.5, YR, 1.4, { under: 0, gold: false }),   // Mittelsockel (Warp-Box 2)
    { type: 'broeckelblock', id: 'arenafeld', blocks: arenaFeld(), delay: 0.45, respawn: 3.5 },
    ...FEUERSTAB_ORTE.map(([x, z], i) => ({ type: 'feuerstab', id: `stab${i + 1}`, pos: [x, YR, z], block: 'stein', length: 7, arms: 2, speed: i % 2 ? -1.5 : 1.5, angle: i * PI / 4 })),

    // =================================================================================== 4 Graue Plattformen
    marmor(M.G0.x0, M.G0.x1, M.G0.z0, M.G0.z1, YG4, 3),
    sign(-3.4, YG4, -387, 'Topf-Schnappblume:\nsie frisst Wuschel!', { size: [2.8, 0.95], yaw: 0.2 }),
    block(-2, 2, -398, -402, YG4, 'gray'),
    { type: 'pendelstachel', id: 'pendel1', pos: [0, YG4 + 6.6, -400], length: 5.4, swing: 55, period: 2.8, plane: 'x' },
    { type: 'mover', id: 'g2', path: [[0, YG4 - 1, -406.5], [0, YG4 - 1, -413.5]], size: [3, 1, 3], speed: 2.2, wait: 0.8, color: 'gray' },
    block(-2.5, 2.5, -417, -422, YG4, 'gray'),
    block(-2, 2, -425, -429, YG4, 'gray'),
    { type: 'pendelstachel', id: 'pendel2', pos: [0, YG4 + 6.6, -427], length: 5.4, swing: 55, period: 2.8, phase: 0.5, plane: 'x' },
    block(-2.5, 2.5, -432, -444, YG4, 'gray'),
    { type: 'stachelwalze_rot', id: 'walze1', pos: [0, YG4 + 1.1, -435.5], axis: 'x', length: 5, radius: 1.0, speed: 1.6 },
    { type: 'stachelwalze_rot', id: 'walze2', pos: [0, YG4 + 1.1, -440.5], axis: 'x', length: 5, radius: 1.0, speed: -1.6 },
    { type: 'mover', id: 'g6', path: [[-3.6, YG4 - 1, -447], [3.6, YG4 - 1, -447]], size: [3, 1, 4], speed: 2.2, wait: 0.6, color: 'gray', phase: 0.5 },
    marmor(M.ERHOLUNG.x0, M.ERHOLUNG.x1, M.ERHOLUNG.z0, M.ERHOLUNG.z1, YG4, 3),
    sign(-3, YG4, -452, 'Erholungsinsel', { size: [2.2, 0.8], yaw: 0.2 }),
    block(-1.5, 1.5, -463, -466, YG4 + 0.5, 'gray'),
    { type: 'pendelstachel', id: 'pendel3', pos: [0, YG4 + 7.1, -464.5], length: 5.4, swing: 60, period: 2.6, plane: 'x' },
    block(-1.5, 1.5, -469, -472, YG4 + 1, 'gray'),
    { type: 'pendelstachel', id: 'pendel4', pos: [0, YG4 + 7.6, -470.5], length: 5.4, swing: 60, period: 2.6, phase: 0.33, plane: 'x' },
    block(-1.5, 1.5, -475, -478, YG4 + 1.5, 'gray'),
    { type: 'pendelstachel', id: 'pendel5', pos: [0, YG4 + 8.1, -476.5], length: 5.4, swing: 60, period: 2.6, phase: 0.66, plane: 'x' },
    { type: 'mover', id: 'g9', path: [[0, YG4 + 0.5, -482.5], [0, YG4 + 0.5, -494.5]], size: [3, 1, 3], speed: 2.4, wait: 1, color: 'gray' },
    block(-2, 2, -498, -502, 10.5, 'gray'),
    marmor(-0.75, 0.75, -505, -517, 10.5, 1, { under: 0 }),
    { type: 'pendelstachel', id: 'pendel6', pos: [0, 10.5 + 6.6, -508.5], length: 5.4, swing: 55, period: 3, plane: 'x' },
    { type: 'pendelstachel', id: 'pendel7', pos: [0, 10.5 + 6.6, -513.5], length: 5.4, swing: 55, period: 3, phase: 0.5, plane: 'x' },
    marmor(M.STERNPLATZ.x0, M.STERNPLATZ.x1, M.STERNPLATZ.z0, M.STERNPLATZ.z1, 10.5, 3),
    sign(3.2, 10.5, -522, 'Sternplatz', { size: [2, 0.8], yaw: -0.2 }),

    // =================================================================================== 5 Wandsprung-Turm
    marmor(M.TURMFUSS.x0, M.TURMFUSS.x1, M.TURMFUSS.z0, M.TURMFUSS.z1, YF, 3),
    sign(-4, YF, -558, 'Federplattform,\ndann Wandsprung!', { size: [2.6, 0.95], yaw: 0.2 }),
    { type: 'trampoline', id: 'feder', pos: [0, YF, -565.6], strength: 21, size: 1.8 },
    marmor(-6, 6, -568, -574, YL1, YL1 + 8, { under: 0 }),
    { type: 'wall', pos: [-2.1, YL1, -571.5], size: [1, 11, 5], style: 'stone' },
    { type: 'wall', pos: [2.1, YL1, -571.5], size: [1, 11, 5], style: 'stone' },
    marmor(-6, 6, -574, -582, YL2, YL2 + 8, { under: 0 }),
    { type: 'ameisenweg', id: 'aw_l', path: ameisenWand(-2.2).path, show: true },
    { type: 'ameisenweg', id: 'aw_r', path: ameisenWand(2.2).path, show: true },
    marmor(-6, 6, -582, -590, YL3, YL3 + 8, { under: 0 }),
    marmor(-6, 6, -590, -597, YL4, YL4 + 8, { under: 0 }),

    // =================================================================================== 5b Wasserwürfel
    { type: 'wasserkoerper', id: 'wuerfel1', pos: [0, YW - 7, -614], size: [8, 7, 30] },
    { type: 'stachelblock', id: 'sb1', pos: [0, YW - 7, -606], size: [8, 2.4, 1.2], color: 'blau', move: [0, 4.6, 0], wait: 1.3, speed: 3, look: 'eigen' },
    { type: 'stachelblock', id: 'sb2', pos: [0, YW - 7 + 4.6, -614], size: [8, 2.4, 1.2], color: 'blau', move: [0, -4.6, 0], wait: 1.3, speed: 3, look: 'eigen' },
    { type: 'stachelblock', id: 'sb3', pos: [0, YW - 7, -622], size: [8, 2.4, 1.2], color: 'blau', move: [0, 4.6, 0], wait: 1.3, speed: 3, phase: 1.5, look: 'eigen' },
    marmor(M.P1.x0, M.P1.x1, M.P1.z0, M.P1.z1, M.P1.top, 2, { under: 0 }),
    { type: 'wasserkoerper', id: 'wuerfel2', pos: [0, M.P1.top - 7, -654], size: [8, 7, 30] },
    { type: 'stachelblock', id: 'sb4', pos: [-2.4, M.P1.top - 6.6, -647], size: [2.4, 2.4, 2.4], color: 'rot', path: [[-2.4, M.P1.top - 6.6, -647], [2.4, M.P1.top - 6.6, -647], [2.4, M.P1.top - 2.8, -647], [-2.4, M.P1.top - 2.8, -647]], mode: 'loop', speed: 2.4 },
    { type: 'stachelblock', id: 'sb5', pos: [2.4, M.P1.top - 2.8, -661], size: [2.4, 2.4, 2.4], color: 'rot', path: [[2.4, M.P1.top - 2.8, -661], [-2.4, M.P1.top - 2.8, -661], [-2.4, M.P1.top - 6.6, -661], [2.4, M.P1.top - 6.6, -661]], mode: 'loop', speed: 2.4 },
    marmor(M.P2.x0, M.P2.x1, M.P2.z0, M.P2.z1, M.P2.top, 2, { under: 0 }),
    { type: 'wasserkoerper', id: 'wuerfel3', pos: [0, M.P2.top - 7, -692], size: [8, 7, 28] },
    { type: 'stachelblock', id: 'sb6', pos: [0, M.P2.top - 7, -686], size: [8, 2.4, 1.2], color: 'blau', move: [0, 4.6, 0], wait: 1.1, speed: 3.2, look: 'eigen' },
    { type: 'stachelblock', id: 'sb7', pos: [-2.4, M.P2.top - 4.8, -697], size: [2.4, 2.4, 2.4], color: 'rot', move: [4.8, 0, 0], speed: 2.6 },
    marmor(M.P3.x0, M.P3.x1, M.P3.z0, M.P3.z1, M.P3.top, 3),
    sign(-3.6, M.P3.top, -710, 'Röhre zum\nBoost-Finale', { size: [2.4, 0.9], yaw: 0.2 }),
    { type: 'glasspipe', id: 'roehre_finale', path: [[0, M.P3.top + 1, -716.6], [0, M.P3.top + 1, -721.5], [0, 33, -724.5], [0, 22, -727.5], [0, YBO + 2, -731.5], [0, YBO + 1, -735], [0, YBO + 1, -739.5]], radius: 1, speed: 14, oneWay: true, coins: 5 },

    // =================================================================================== 6 Boost-Finale
    marmor(-3, 3, -737, -790, YBO, 3),
    { type: 'boost', pos: [0, YBO, -744], dir: [0, -1], speed: 17 },
    marmor(-12, -8, -764, -770, YBO + 0.5, 2),
    { type: 'boost', pos: [0, YBO, -785.5], dir: [0, -1], speed: 18 },
    marmor(-3, 3, -797, -850, YBO, 3),
    marmor(8, 12, -826, -832, YBO + 1, 2),
    { type: 'boost', pos: [0, YBO, -845.5], dir: [0, -1], speed: 18 },
    marmor(-2.5, 2.5, -857, -905, YBO, 3),
    block(-1, 1, -879, -881, YBO + 2.5, 'yellow', { h: 2.5 }),
    { type: 'ramp', pos: [0, YBO, -910], size: [5, YPL - YBO, 10], axis: 'z', dir: -1, top: 'stone' },
    marmor(M.PLATZ.x0, M.PLATZ.x1, M.PLATZ.z0, M.PLATZ.z1, YPL, 3),
    marmor(-0.9, 0.9, -937, -944.5, YPL, 1, { under: 0 }),
    marmor(-1.8, 1.8, -944.5, -949.5, YPL, 1, { under: 0, gold: false }),
    { type: 'schluesselmuenzen', group: 'krone', coins: [[-10, YBO + 0.5, -767], [0, YBO + 1.8, -812], [10, YBO + 1, -829], [0, YBO + 2.5, -880], [-6, YPL, -931]], onAll: { reveal: 'warp4' } },

    // =================================================================================== Siegerplatz
    marmor(M.SIEGER.x0, M.SIEGER.x1, M.SIEGER.z0, M.SIEGER.z1, YZ, 4),
    marmor(-4, 4, -975, -978, YZ + 1, 2, { under: 0 }),
    marmor(-4, 4, -978, -981, YZ + 2, 3, { under: 0 }),
    marmor(-4, 4, -981, -984, YZ + 3, 4, { under: 0 }),
    marmor(-6, 6, -984, -996, YZ + 4, 5),
    { type: 'deco_star', shadow: false, items: [
      { kind: 'modell', name: 'krone_podest', pos: [-4.4, YZ + 4, -993.5], scale: 0.7 },
      { kind: 'modell', name: 'pokal_gross', pos: [4.4, YZ + 4, -993.5], opts: { size: 2.6 } },
    ] },
    { type: 'deco_w8', items: [
      { kind: 'wimpel', from: [-8.6, YZ + 5.2, -958], to: [8.6, YZ + 5.2, -958], sag: 0.9 },
      { kind: 'wimpel', from: [-5.6, YZ + 9.8, -985], to: [5.6, YZ + 9.8, -985], sag: 0.8 },
      { kind: 'wimpel', from: [-9.6, YPL + 4.8, -916], to: [9.6, YPL + 4.8, -916], sag: 1 },
      { kind: 'wimpel', from: [-6.6, Y1 + 4.4, 3], to: [6.6, Y1 + 4.4, 3], sag: 0.7 },
    ] },
  ],
  blocks: [
    { kind: 'coinblock', pos: [0, Y1 + 2.4, 1.5], count: 6 },
    { kind: 'hidden', pos: [-2.5, 2 + 2.6, -77], content: 'oneup' },
    { kind: 'hidden', pos: [-3, YG + 2.6, -211], content: 'oneup' },
    { kind: 'hidden', pos: [2.5, YG4 + 2.6, -457.5], content: 'oneup' },
    { kind: 'question', pos: [-1, YT + 2.4, -262], content: 'coins:5' },
    { kind: 'question', pos: [1, M.P3.top + 2.4, -712], content: 'coins:5' },
  ],
  enemies: [
    // Abschnitt 1: Krakenpilze (vier auf Schiebeblöcken, zwei auf Rastinseln)
    { kind: 'krakenpilz', id: 'kp_s2', pos: [SLIDERS.s2.sx, 0, SLIDERS.s2.z], sight: 8, first: 1.2 },
    { kind: 'krakenpilz', id: 'kp_r1', pos: [3, Y1, -38.5], sight: 8, first: 1.6 },
    { kind: 'krakenpilz', id: 'kp_s4', pos: [SLIDERS.s4.sx, 1, SLIDERS.s4.z], sight: 7, first: 0.9 },
    { kind: 'krakenpilz', id: 'kp_r2', pos: [-3, 2, -77.5], sight: 8, first: 1.4 },
    { kind: 'krakenpilz', id: 'kp_s5', pos: [0, 2, -90.5], sight: 8, first: 1.5 },
    { kind: 'krakenpilz', id: 'kp_s6', pos: [SLIDERS.s6.sx, YS, SLIDERS.s6.z], sight: 7, first: 1.1 },
    // Abschnitt 2: rennende Pilzlinge auf den Stegen, Feuer-Werfer an den Simsen
    { kind: 'pilzling', id: 'lauf1', pos: [0, YB, -149], path: [[0, YB, -147.5], [0, YB, -160.5]], speed: 2.6 },
    { kind: 'pilzling', id: 'lauf2', pos: [0, YB, -158], path: [[0, YB, -160.5], [0, YB, -147.5]], speed: 2.6 },
    { kind: 'pilzling', id: 'lauf3', pos: [0, YC, -176], path: [[0, YC, -174.5], [0, YC, -188.5]], speed: 2.8 },
    { kind: 'pilzling', id: 'lauf4', pos: [0, YC, -186], path: [[0, YC, -188.5], [0, YC, -174.5]], speed: 2.8 },
    { kind: 'feuer_werfer', id: 'werfer1', pos: [0, YB, -166.6], axis: [1, 0], pace: 1.2, sight: 11, interval: 2.4, first: 1.4 },
    { kind: 'feuer_werfer', id: 'werfer2', pos: [0, YC, -194.6], axis: [1, 0], pace: 1.2, sight: 11, interval: 2.4, first: 1.4 },
    { kind: 'feuer_werfer', id: 'werfer3', pos: [2, YG, -206], axis: [1, 0], pace: 1.4, sight: 11, interval: 2.2, first: 1.2 },
    // Zauberarena
    { kind: 'zauberkroete', id: 'zk1', spots: [[-10, YR, -352.5], [10, YR, -352.5], [10, YR, -371.5]], hidden: 1.4 },
    { kind: 'zauberkroete', id: 'zk2', spots: [[-10, YR, -371.5], [-10, YR, -362], [10, YR, -362]], hidden: 1.6 },
    { kind: 'zauberkroete', id: 'zk3', spots: [[0, YR, -352.5], [0, YR, -371.5], [-5, YR, -371.5]], hidden: 1.8 },
    // Graue Plattformen: Wuschel-Schwärme
    { kind: 'wuschel', id: 'w_g3', center: [0, YG4 + 0.2, -419.5], radius: 3, count: 3, spacing: 6.3, speed: 2 },
    { kind: 'wuschel', id: 'w_luft1', path: [[-5, YG4 + 1.6, -404], [5, YG4 + 1.6, -404]], count: 2, spacing: 2, speed: 2.2 },
    { kind: 'wuschel', id: 'w_g5', path: [[-2, YG4 + 0.2, -443], [2, YG4 + 0.2, -443]], count: 1, speed: 1.6 },
    { kind: 'wuschel', id: 'w_g9', path: [[-4, YG4 + 1.4, -486], [4, YG4 + 1.4, -490], [-4, YG4 + 1.4, -492]], loop: true, count: 3, spacing: 4, speed: 2.4 },
    { kind: 'wuschel', id: 'w_steg', path: [[-3, 10.7, -503.5], [3, 10.7, -503.5]], count: 2, spacing: 2.2, speed: 2 },
    { kind: 'wuschel', id: 'w_stern', center: [-3.4, 10.7, -531], radius: 1.7, count: 8, spacing: 1.33, speed: 1.4 },
    { kind: 'wuschel', id: 'w_platz', path: [[3.4, 10.7, -526], [3.4, 10.7, -538]], count: 3, spacing: 2.5, speed: 1.8 },
    // Turm: Hörner-Ameisen als Stufen, Rankenschnapper-Kette
    { kind: 'ameisensoldat_horn', id: 'strom_l', antpath: 'aw_l', speed: 1.4, spawner: { every: 4.2, max: 4 } },
    { kind: 'ameisensoldat_horn', id: 'strom_r', antpath: 'aw_r', speed: 1.4, spawner: { every: 4.2, max: 4, first: 2.1 } },
    ranke('ranke1', -2.4, YL3 + 1.55, 0.3), ranke('ranke2', 0, YL3 + 3.55, 0.18), ranke('ranke3', 2.4, YL3 + 5.55, 0.06),
    // Boost-Finale: Feuerring-Schockwellen
    fring('fr1', 0, -758, YBO), fring('fr2', 0, -776, YBO, { phase: 0.5 }),
    fring('fr3', 0, -812, YBO), fring('fr4', 0, -838, YBO, { phase: 0.4 }),
    fring('fr5', 0, -870, YBO, { radius: 3.6 }), fring('fr6', 0, -893, YBO, { radius: 3.6, phase: 0.5 }),
    fring('fr7', -5, -922, YPL, { radius: 5, period: 2.8 }), fring('fr8', 5, -930, YPL, { radius: 5, period: 2.8, phase: 0.5 }),
    fring('fr9', 3.4, -941, YPL, { radius: 3.4, period: 2.2, phase: 0.25, color: 'pink' }),
  ],
  items: [
    // Bitcoin-Pfade
    line([0, Y1 + 0.8, 1], [0, Y1 + 0.8, -4], 3),
    ...arc([0, Y1 + 1, -11.5], [0, Y1 + 1, -14], 2, 1.2),
    ...arc([0, Y1 + 1, -23.5], [0, Y1 + 1, -26], 2, 1.2),
    ring([0, Y1 + 0.9, -37], 2.4, 8),
    line([0, 2, -45.5], [0, 2, -47.5], 2),
    line([0, 2.8, -63.5], [0, 2.8, -65.5], 2),
    line([-2, 2.8, -72], [2, 2.8, -72], 3),
    line([0, 2.8, -83.5], [0, 2.8, -85.5], 2),
    line([0, 3.8, -103.5], [0, 3.8, -105.5], 2),
    line([-3, YS + 0.8, -120], [3, YS + 0.8, -120], 4),
    line([0, YB + 0.8, -148], [0, YB + 0.8, -159], 6),
    line([0, YC + 0.8, -175], [0, YC + 0.8, -187], 6),
    ring([0, YG + 1, -207], 2.2, 8),
    line([0, YP + 0.8, -228], [0, YP + 0.8, -246], 8),
    ...[0, 1, 2, 3].map((i) => ({ kind: 'coin', pos: [0, YP + 1.8 + i, -249.75 - i * 1.5] })),
    line([-2, YT + 0.8, -268], [-2, YT + 0.8, -272], 3),
    line([2, YT + 0.8, -273], [2, YT + 0.8, -277], 3),
    line([-2, YT + 0.8, -278], [-2, YT + 0.8, -282], 3),
    line([-3.8, YK + 0.8, -314.6], [-6.6, YK + 0.8, -317.2], 2),
    ring([0, YR + 1, A.z], 4.6, 10, { kind: 'coins' }),
    line([0, YG4 + 0.8, -399], [0, YG4 + 0.8, -401], 2),
    line([0, YG4 + 0.8, -433], [0, YG4 + 0.8, -443], 5),
    ring([0, YG4 + 0.9, -455], 2.2, 8),
    line([0, YG4 + 1.5, -464.5], [0, YG4 + 2.5, -476.5], 4),
    line([0, 11.3, -506], [0, 11.3, -516], 5),
    column(0, -565.6, YF + 2, YL1 + 1, 4),
    column(0, -571.5, YL1 + 1.5, YL2 + 1, 5),
    ...[0, 1, 2].map((i) => ({ kind: 'coin', pos: [-2.4 + i * 2.4, YL3 + 2.8 + i * 2, -588.4] })),
    line([0, YW - 1.5, -602], [0, YW - 1.5, -626], 6),
    line([0, M.P1.top - 3.5, -642], [0, M.P1.top - 3.5, -666], 6),
    line([0, M.P2.top - 1.5, -681], [0, M.P2.top - 1.5, -703], 5),
    line([0, YBO + 0.8, -740], [0, YBO + 0.8, -754], 5),
    line([0, YBO + 0.8, -780], [0, YBO + 0.8, -788], 3),
    ...arc([0, YBO + 1, -790], [0, YBO + 1, -797], 4, 2),
    line([0, YBO + 0.8, -820], [0, YBO + 0.8, -834], 5),
    ...arc([0, YBO + 1, -850], [0, YBO + 1, -857], 4, 2),
    line([0, YBO + 0.8, -895], [0, YBO + 0.8, -903], 3),
    ring([0, YPL + 1, -926], 3, 10),
    line([0, YZ + 0.8, -960], [0, YZ + 0.8, -972], 5),
    // Warp-Boxen (eine Richtung)
    { kind: 'warpbox', id: 'warp1', pos: [0, YG, -210.4], target: [0, YP, -221.4] },
    { kind: 'warpbox', id: 'warp2', pos: [0, YR, A.z], target: [0, YG4, -389], hidden: true },
    { kind: 'warpbox', id: 'warp3', pos: [0, 10.5, -541.4], target: [0, YF, -560] },
    { kind: 'warpbox', id: 'warp4', pos: [0, YPL, -933.6], target: [0, YZ, -961.6], hidden: true },
    // Zauberarena: alle Zauberkröten besiegt → Warp-Box 2 erscheint
    { kind: 'kampfraum', id: 'arena', area: { min: [-13, YR - 2, -375], max: [13, YR + 9, -349] }, ids: ['zk1', 'zk2', 'zk3'], onClear: [{ reveal: 'warp2' }, { coins: 5 }], banner: 'Zauberarena geschafft!' },
    // Topf-Schnappblumen (frisst Wuschel): am Start der grauen Plattformen und als Ersatz auf der Erholungsinsel
    { kind: 'topfpflanze', id: 'topf1', pos: [2.4, YG4, -391.6], respawn: 4 },
    { kind: 'topfpflanze', id: 'topf2', pos: [2.6, YG4, -458.6], respawn: 4 },
  ],
  stars: [
    { pos: [-10, YK + 0.9, -321], id: 'stern_piep' },                       // 0 hinter der Piep-Block-Strecke
    { pos: [-3.4, 11.3, -531], id: 'stern_wuschel' },                        // 1 im Wuschel-Ring am Sternplatz
    { pos: [0, YPL + 0.9, -947], id: 'stern_schockwelle' },                  // 2 hinter dem Platz am Ende der Boost-Strecke
  ],
  stamp: [3.3, YZ + 3.2, -979.5],
  goal: { pos: [0, YZ + 4, -990], height: 10 },
  marks: {
    start: [0, Y1, 6], r1: [0, Y1, -36], r2: [0, 2, -72], r3: [0, YS, -118], simsA: [0, YA, -138], simsB: [0, YB, -164],
    simsC: [0, YC, -192], gipfel: [0, YG, -204], takt: [0, YP, -221], r4: [0, YT, -261], r5: [0, YK, -303], arena: [0, YR, -352],
    g0: [0, YG4, -389], erholung: [0, YG4, -453], sternplatz: [0, 10.5, -524], turm: [0, YF, -560], l2: [0, YL2, -577],
    l3: [0, YL3, -585], l4: [0, YL4, -593], p1: [0, M.P1.top, -633], p2: [0, M.P2.top, -673], p3: [0, M.P3.top, -712],
    bahn: [0, YBO, -740], platz: [0, YPL, -918], sieger: [0, YZ, -961],
  },
};
