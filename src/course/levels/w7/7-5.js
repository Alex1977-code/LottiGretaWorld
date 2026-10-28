// 7-5 „Stampfsteinturm und Giftnebel-Flucht“ – Welt 7 „Lava-Festung“, vertikaler Parcours (Archetyp parcours, Thema
// lavatower, Musik course_traptower, 400 s; Bauplan 7-5: Turm in Lava, Stampfsteine, Knochenflieger, Zauberkröten,
// Seilbahn, Funkenflämmchen, 5 Schlüsselmünzen, Flucht vor Giftnebel von oben und steigender Lava).
//
// Zwei Festungstürme stehen im glühenden Lavaschacht. Der erste ist ein Stufenturm aus fünf Etagen (je 6 m höher und 10 m
// weiter hinten); die Stampfsteine sind hier nicht nur Gefahr, sondern Fahrstuhl: man lockt sie herunter, hüpft auf den
// liegenden Stein und fährt mit ihm eine Etage hinauf. Oben zaubern drei Zauberkröten, eine Seilbahn schwebt hinüber zum
// runden Funkenturm. Dort hüpfen Funkenflämmchen über die Turmringe, fünf Schlüsselmünzen liegen auf dem Weg nach oben –
// und wer die oberste nimmt, weckt den Giftnebel: er sinkt von oben herab, unten steigt die Lava. Schnell die Ringe auf der
// rechten Seite hinunter, über die Glutbrücke zur Warp-Box, die die fünf Schlüssel geöffnet haben – sie bringt zum Ziel.
//
// Abschnitte (Level verläuft nach −Z und steigt):
//   1  Erster Turm   z  13 …  −54   y 0 → 24   Steg, Erdgeschoss mit Stampfstein 1 (Fahrt auf Etage 1, y 6), Aufzug 1
//                                               (y 6 → 12), Fähre über den Schacht in Etage 2, Aufzug 2 mit Kletterpfeiler
//                                               (y 12 → 18, Stern 0 oben auf dem Pfeiler – nur mit Krallen-Anzug), Stampf-
//                                               stein 2 (Fahrt auf die Turmspitze, y 24); drei Zauberkröten (Stern 1);
//                                               links unten die Sinkwolke (Stempel)
//   2  Seilbahn      z −54 …  −88   y 24 → 20  Gondel hinüber zum Funkenturm, Checkpoint auf dem Vorhof
//   3  Funkenturm    z −88 … −126   y 20 → 40  Vorhof (Schlüssel 1, Wurfsichel), Treppe auf Ring 1 (Ziegel-Würfel mit
//                                               Stern 2), Sprungfeder auf Ring 2, Pfeilplattform aus der Wand auf Ring 3,
//                                               Stampfstein 3 auf die Turmkrone (Schlüssel 5)
//   4  Flucht        z −100 …  −88  y 40 → 17  Giftnebel sinkt (0,9 m/s), die Lava steigt bis knapp unter die
//                                               Warp-Terrasse: rechts die Ringe hinab (Lücken in den Zinnen wechseln die
//                                               Seiten), Treppe hinunter auf die Glutbrücke (flutet nach ≈ 28 s), Warp-Box
//   Ziel             z −136 … −156  y 30        Zinnenterrasse hinter dem Funkenturm (Warp-Box → Zielmast)
// Gegner: Stampfstein 3, Knochenflieger 3, Zauberkröte 3, Funkenflämmchen 6.

import {
  isl, line, ring, arc, column, sign, C, Quads, brickBox, slits, merlons, roundTier, flushQ, ketten, funken, aufzug, nebelLava, carpet, fernModelle,
} from './_helpers_c.js';
import { Bld, glimmer } from '../w6/_helpers_b.js';

const PI = Math.PI;
const D2R = PI / 180;
export const M75 = {
  SEA: -1,
  E0: 0, E1: 6, E2: 12, E3: 18, TOP: 24,
  G1: 20, W: 16.8, BR: 15.4, R1: 25, R2: 30, R3: 35, R4: 40, GOAL: 30,
  C2: { x: 0, z: -112 }, RR: [13, 10, 7, 4.4],
  LAVA_HIGH: 16.2,
};
const { SEA, E0, E1, E2, E3, TOP, G1, W, BR, R1, R2, R3, R4, GOAL, C2, RR, LAVA_HIGH } = M75;

/** Punkt auf einem Turmring: Winkel a in Grad (0 = vorn/+Z, 90 = rechts/+X), Radius r, Höhe y. */
export const onRing = (aDeg, r, y) => [+(C2.x + Math.sin(aDeg * D2R) * r).toFixed(3), y, +(C2.z + Math.cos(aDeg * D2R) * r).toFixed(3)];
const arcPath = (a0, a1, r, y, n = 4) => Array.from({ length: n }, (_, i) => onRing(a0 + ((a1 - a0) * i) / (n - 1), r, y));
const key = (pos, extra = {}) => ({ kind: 'schluesselmuenze', pos, group: 'tor', onAll: { reveal: 'warp' }, ...extra });
const flamme = (id, path, o = {}) => ({ kind: 'funkenflaemmchen', id, pos: path[0], path, hop: 0.8, height: 0.45, ...o });
const G = (a, b) => [a * D2R, b * D2R];

// ---------------------------------------------------------------------------------------------------------------- Aufbau
function build(level) {
  const Q = new Quads();
  const hot = SEA;
  // ---------------- Erster Turm: Etagen (Burgmauer, Plattenboden), Steg
  // Teppich (roter Läufer) zeigt den Weg zum nächsten Kniff
  brickBox(level, Q, { x0: -4.5, x1: 4.5, z0: 13, z1: 2, top: E0, y0: -3, hot, faces: '+z+x-x', stone: 'dunkel', tag: 'steg', pattern: carpet([[0, 13], [0, 2]]) });
  brickBox(level, Q, { x0: -9, x1: 9, z0: 2, z1: -12, top: E0, y0: -3, hot, faces: '+z+x-x', tag: 'etage0', pattern: carpet([[0, 2], [0, -3.5], [3.6, -7.6]]) });
  brickBox(level, Q, { x0: -9, x1: 9, z0: -12, z1: -22, top: E1, y0: -3, hot, faces: '+z+x-x', tag: 'etage1', bands: [2.4], pattern: carpet([[4, -12], [3, -16.4], [-6, -19.4], [-9, -20.5]]) });
  brickBox(level, Q, { x0: -12, x1: -4, z0: -22, z1: -32, top: E2, y0: -3, hot, faces: '+z+x-x', tag: 'etage2', bands: [8.6], pattern: carpet([[-10.5, -22], [-8, -25.5], [-4, -27]]) });
  brickBox(level, Q, { x0: 4, x1: 9, z0: -22, z1: -32, top: E2, y0: -3, hot, faces: '+z+x-x', tag: 'etage2', bands: [8.6], pattern: carpet([[4, -27], [6.4, -28], [9, -30.5]]) });
  brickBox(level, Q, { x0: -9, x1: 12, z0: -32, z1: -42, top: E3, y0: -3, hot, faces: '+z+x-x', tag: 'etage3', bands: [14.6], pattern: carpet([[10.5, -32], [6, -35.4], [-3.6, -38.4]]) });
  brickBox(level, Q, { x0: -8, x1: 8, z0: -42, z1: -54, top: TOP, y0: -3, hot, faces: '+z+x-x-z', stone: 'rot', tag: 'spitze', bands: [20.6],
    pattern: (x, z) => (Math.hypot(x, z + 48) < 2.6 && Math.hypot(x, z + 48) > 1.6) || carpet([[0, -50.6], [0, -54]])(x, z), patternColor: 0xffc23a });
  // Kletterpfeiler am Aufzug 2 (nur die linke Seite ist eine Kletterwand)
  brickBox(level, Q, { x0: 12, x1: 14.6, z0: -29, z1: -32, top: 27, y0: -3, hot, faces: '+z+x', stone: 'rot', tag: 'kletterwand', climbable: true });
  const climbFace = new Bld();
  for (let y = E2 + 0.4; y < 26.6; y += 0.7) for (let z = -31.5; z < -29.2; z += 0.75) climbFace.box(0.14, 0.18, 0.4, 11.95, y + ((z * 3) % 0.2), z + 0.2, 0xffe08a, { r: 0.04 });
  climbFace.box(0.06, 27 - E2, 2.9, 11.97, E2, -30.5, 0xd8b088, { r: 0.02 });
  climbFace.flush(level);
  // Zinnen (Brüstungen) an den Außenkanten – Lücken an Aufzügen, Stampfsteinen, Fähre, Wolke
  merlons(level, Q, [-9, 2], [-9, -12], E0, { gaps: [[0, 2]] });
  merlons(level, Q, [9, 2], [9, -12], E0, {});
  merlons(level, Q, [-4.5, 13], [-4.5, 2], E0, { h: 0.8 });
  merlons(level, Q, [4.5, 13], [4.5, 2], E0, { h: 0.8 });
  merlons(level, Q, [9, -12], [9, -22], E1, {});
  merlons(level, Q, [-9, -12], [-9, -22], E1, { gaps: [[6.6, 10]] });
  merlons(level, Q, [-12, -22], [-12, -32], E2, {});
  merlons(level, Q, [9, -22], [9, -32], E2, { gaps: [[6.6, 10]] });
  merlons(level, Q, [-9, -32], [-9, -42], E3, { gaps: [[6, 10]] });
  merlons(level, Q, [12, -32], [12, -42], E3, {});
  merlons(level, Q, [-8, -42], [-8, -54], TOP, { gaps: [[2.5, 8.5]] });
  merlons(level, Q, [8, -42], [8, -54], TOP, {});
  merlons(level, Q, [-8, -54], [8, -54], TOP, { gaps: [[6.6, 9.4]] });
  // Fensterschlitze und Wandschmuck an den Stirnseiten
  slits(level, [
    [-6, 1.6, -12, '+z'], [-1.5, 1.6, -12, '+z', 0.8, 1.8], [7.5, 2.6, -12, '+z'],
    [-10, 7.6, -22, '+z'], [6.5, 7.6, -22, '+z'], [-6, 8.2, -22, '+z', 0.8, 1.8],
    [-4, 13.6, -32, '+z'], [3, 13.6, -32, '+z', 0.8, 1.8], [8, 14.2, -32, '+z'], [-7.5, 13.2, -32, '+z'],
    [-5.5, 19.6, -42, '+z'], [5.5, 19.6, -42, '+z'], [0, 20.2, -42, '+z', 0.9, 2.0],
    [9, 2.4, -17, '+x'], [-12, 8.4, -27, '-x'], [12, 14.4, -37, '+x'], [8, 20.4, -48, '+x'], [-8, 20.4, -50, '-x'],
    [14.6, 20, -30.5, '+x', 0.5, 1.2],
  ]);
  ketten(level, [[-8.4, 5.7, -12.3, 3.2], [8.4, 5.7, -12.3, 2.4], [-11.4, 11.7, -22.3, 3.6], [3.6, 17.7, -32.3, 2.8], [-8.4, 23.7, -42.3, 3.4], [7.4, 23.7, -42.3, 2.6]]);

  // ---------------- Funkenturm: Vorhof, Warp-Terrasse, Glutbrücke, runde Stufen
  brickBox(level, Q, { x0: -10, x1: 10, z0: -88, z1: -99, top: G1, y0: -3, hot, faces: '+z+x-x', tag: 'vorhof', bands: [5.6, 11.6],
    pattern: carpet([[0, -88], [-1.6, -91.4], [-5, -92.6], [-5, -99]]) });
  brickBox(level, Q, { x0: 3, x1: 10.6, z0: -99, z1: -104, top: G1, y0: -3, hot, faces: '+x', tag: 'vorhof', skipTop: false });
  brickBox(level, Q, { x0: 16, x1: 22, z0: -88, z1: -98, top: W, y0: -3, hot, faces: '+z+x-x-z', stone: 'rot', tag: 'warpterrasse' });
  brickBox(level, Q, { x0: 10, x1: 16, z0: -89.5, z1: -96.5, top: BR, y0: -3, hot, faces: '+z-z', stone: 'basalt', tag: 'glutbruecke', cell: 1.25 });
  merlons(level, Q, [13.6, -89.5], [16, -89.5], BR, { h: 0.7 });
  merlons(level, Q, [13.6, -96.5], [16, -96.5], BR, { h: 0.7 });
  merlons(level, Q, [10, -96.5], [10, -99], G1, { h: 0.8 });
  const [r1, r2, r3, r4] = RR;
  roundTier(level, Q, { x: C2.x, z: C2.z, r: r1, top: R1, y0: -3, hot, inner: r2, gaps: [G(-28, -18), G(-6, 6), G(30, 48)], tag: 'ring1' });
  roundTier(level, Q, { x: C2.x, z: C2.z, r: r2, top: R2, y0: R1 - 0.2, inner: r3, gaps: [G(65, 86)], tag: 'ring2' });
  roundTier(level, Q, { x: C2.x, z: C2.z, r: r3, top: R3, y0: R2 - 0.2, inner: r4, gaps: [G(-100, -78), G(8, 32)], tag: 'ring3' });
  roundTier(level, Q, { x: C2.x, z: C2.z, r: r4, top: R4, y0: R3 - 0.2, gaps: [G(-14, 14), G(58, 88)], stone: 'rot', tag: 'krone' });
  merlons(level, Q, [-10, -88], [-10, -99], G1, {});
  // Kletterpfeiler oben: Brüstung außen (der Stern liegt sicher)
  merlons(level, Q, [14.6, -29], [14.6, -32], 27, { h: 0.8, step: 1.5 });
  merlons(level, Q, [12, -29], [14.6, -29], 27, { h: 0.8, step: 1.3 });
  merlons(level, Q, [22, -88], [22, -98], W, {});
  merlons(level, Q, [16, -98], [22, -98], W, {});
  merlons(level, Q, [16, -88], [22, -88], W, { gaps: [[0, 6]], h: 0.7 });
  slits(level, [
    [-6, 15.6, -88, '+z'], [6, 15.6, -88, '+z'], [0, 14.6, -88, '+z', 0.9, 2.2], [-3, 9.6, -88, '+z'], [3, 9.6, -88, '+z'],
    [19, 12.6, -88, '+z', 0.6, 1.6], [22, 12.6, -93, '+x'],
    ...[[-35, r1, 20.6], [22, r1, 20.6], [60, r1, 20.6], [-15, r2, 26.4], [32, r2, 26.4], [-40, r3, 31.4], [40, r3, 31.4], [0, r4, 36.2]].map(([a, r, y]) => {
      const q = onRing(a, r, y);
      return [q[0], y, q[2], a * D2R, 0.7, 1.7];
    }),
  ]);
  // ---------------- Zielterrasse hinter dem Funkenturm
  brickBox(level, Q, { x0: -8, x1: 8, z0: -136, z1: -156, top: GOAL, y0: -3, hot, faces: '+z+x-x-z', stone: 'rot', tag: 'ziel',
    pattern: (x, z) => Math.abs(x) < 1.1 && z > -152, patternColor: 0xd8283a });
  merlons(level, Q, [-8, -136], [-8, -156], GOAL, {});
  merlons(level, Q, [8, -136], [8, -156], GOAL, {});
  merlons(level, Q, [-8, -156], [8, -156], GOAL, {});
  merlons(level, Q, [-8, -136], [8, -136], GOAL, { h: 0.8 });
  flushQ(level, Q);

  // ---------------- Seilbahn-Stationen (Holzgestell mit Rad) und Kleinkram
  const B = new Bld();
  for (const [z, y, s, full] of [[-54.6, TOP, -1, true], [-87.6, G1, 1, false]]) {
    for (const x of [-1.9, 1.9]) {
      B.box(0.34, full ? 3.2 : 2.6, 0.34, x, y, z, 0x7a4a2a, { r: 0.05 });
      if (!full) B.cyl(0.32, 0.32, 0.14, x, y + 2.6, z, 0xd8b04a, 12, { rx: PI / 2 });
    }
    if (!full) continue;
    B.box(4.2, 0.36, 0.5, 0, y + 3.1, z, 0x8a5a32, { r: 0.06 });
    B.cyl(0.55, 0.55, 0.18, 0, y + 2.25 - 0.09 + 0.2, z + s * 0.2, 0xd8b04a, 16, { rx: PI / 2 });
    B.cyl(0.16, 0.16, 0.3, 0, y + 2.25 + 0.11, z + s * 0.2, 0x3a2a1a, 8, { rx: PI / 2 });
    B.box(1.2, 0.6, 0.12, 0, y + 3.5, z, 0xd8283a, { r: 0.04 });
  }
  // Sitzbank und Fässer auf dem Steg, Kanonenkugeln, Werkzeugkiste
  B.box(1.8, 0.12, 0.5, -3.2, 0.45, 9, 0x8a5a32).box(0.12, 0.45, 0.4, -4, 0, 9, 0x5a3a22).box(0.12, 0.45, 0.4, -2.4, 0, 9, 0x5a3a22);
  for (const [x, z] of [[3.4, 11.2], [3.7, 10.2], [-7.6, -10.4]]) B.cyl(0.4, 0.42, 0.95, x, 0, z, 0x8a5a32, 12).torus(0.41, 0.04, x, 0.3, z, 0x4a4a52, { rx: PI / 2 }).torus(0.41, 0.04, x, 0.7, z, 0x4a4a52, { rx: PI / 2 });
  for (const [x, z] of [[7.6, -9.6], [7.9, -10.3], [7.3, -10.4]]) B.sphere(0.26, x, 0.26, z, 0x2a2a30);
  // Speier (Löwenmaul-Steine) über den Lavafällen
  for (const [x, y, z, dx, dz] of [[-9.2, E1 - 1.2, -17, -1, 0], [12.2, E3 - 1.4, -37.5, 1, 0], [onRing(-110, RR[0], 0)[0], R1 - 2, onRing(-110, RR[0], 0)[2], Math.sin(-110 * D2R), Math.cos(-110 * D2R)]]) {
    B.box(1.1, 0.7, 1.1, x + dx * 0.3, y - 0.1, z + dz * 0.3, 0x6a5a62, { r: 0.12 });
    B.sphere(0.32, x + dx * 0.75, y + 0.25, z + dz * 0.75, 0xffc23a, { s: [1, 0.6, 1] });
  }
  B.flush(level);
  // Glutfunken aus dem Lavasee (rund um die Türme)
  funken(level, [[-16, 16, SEA, 8, 0, -60], [-16, 24, SEA, 12, -80, -130]], { n: 90, rise: 0.4, size: 0.22, seed: 7 });
  glimmer(level, [[-1, 1, TOP + 0.6, TOP + 1.6, -47, -49], [12.6, 14, 27.2, 28.4, -29.6, -31.4], [-16.8, -15.2, 22.2, 23.6, -46, -48]], { n: 24, color: 0xfff2a0, size: 0.18, drift: 0.4 });
}

// ---------------------------------------------------------------------------------------------------------------- Haken
function setup(level) {
  aufzug(level, 'lift1', { name: 'aufzug1' });
  aufzug(level, 'lift2', { name: 'aufzug2' });
  aufzug(level, 'sinkwolke', { name: 'wolkenfahrt', back: 1.6 });
  nebelLava(level, 'nebel', 'glutsee');
  // Leistung: Schilder, Warp-Boxen, Zielmast, Sterne und Stempel weiter als 85 m nicht zeichnen (Dunst des Turmschachts)
  fernModelle(level, 85);
}

const fackel = (x, y, z, yaw = -PI / 2) => ({ kind: 'fackel', pos: [x, y, z], yaw });
const banner = (x, y, z, L = 2.6, color) => ({ kind: 'fahne', hang: true, pos: [x, y, z], length: L, width: 1.3, yaw: -PI / 2, ...(color ? { color } : {}) });

export const LEVEL = {
  id: '7-5',
  world: 7,
  title: 'Stampfsteinturm und Giftnebel-Flucht',
  archetype: 'parcours',
  theme: 'lavatower',
  music: 'course_traptower',
  timeLimit: 400,
  killY: -14,
  start: { pos: [0, E0, 10], yaw: PI / 2 },
  build,
  setup,
  instances: { coin: { farHide: 46, shadow: false } },
  farHide: 48,
  camera: [
    { from: 16, to: 2, pitch: 31, dist: 14.5, height: 1.8, ahead: 2.2, fov: 42 },
    { from: 2, to: -54, pitch: 29, dist: 15.5, height: 2.4, ahead: 1.4, fov: 42 },
    { from: -54, to: -88, pitch: 26, dist: 16, height: 1.8, ahead: 3, fov: 42 },
    { from: -88, to: -100, pitch: 31, dist: 15, height: 2.2, ahead: 1.4, fov: 42 },
    { from: -100, to: -128, pitch: 30, dist: 16, height: 2.4, ahead: 1.2, fov: 42 },
    { from: -132, to: -160, pitch: 36, dist: 14, height: 1.6, ahead: 2, fov: 40 },
  ],
  segments: [
    // Glutsee unter allem: steigt, sobald der Giftnebel jagt (bis knapp unter die Warp-Terrasse)
    { type: 'lavaspiegel', id: 'glutsee', pos: [0, SEA - 8, -70], size: [150, 8, 270], mode: 'signal', rise: { to: LAVA_HIGH, speed: 0.6 }, reset: true },
    // ================================================================ 1 Erster Turm
    sign(-2.6, E0, 8.6, 'Stampfsteinturm\nGanz nach oben!', { size: [2.6, 0.9] }),
    sign(1.6, E0, -7.4, 'Stampfstein:\nweglocken, draufhüpfen,\nmitfahren!', { size: [2.6, 1.1] }),
    { type: 'deco_w7', items: [
      { kind: 'burgturm', pos: [-7.8, E0, 0.9], height: 5.2, radius: 1.05, solid: true }, { kind: 'burgturm', pos: [7.8, E0, 0.9], height: 5.2, radius: 1.05, solid: true },
      // Lavafälle aus Speiern an den Turmwänden (nur Optik)
      { kind: 'lavafall', pos: [-9.35, SEA, -17], width: 2.2, height: E1 - 1.2 - SEA, yaw: -PI / 2 },
      { kind: 'lavafall', pos: [12.35, SEA, -37.5], width: 2.4, height: E3 - 1.4 - SEA, yaw: PI / 2 },
      { kind: 'lavafall', pos: [onRing(-110, RR[0] + 0.3, 0)[0], SEA, onRing(-110, RR[0] + 0.3, 0)[2]], width: 3, height: R1 - 2 - SEA, yaw: -110 * D2R },
      { kind: 'fahne', pos: [5.2, E0, 11.6], height: 4.2, solid: true },
      fackel(-4.6, 1.6, 2.05), fackel(4.6, 1.6, 2.05),
      banner(-4.5, 5.6, -11.95), banner(1.2, 5.6, -11.95, 3.2, 'lila'),
      banner(-1.5, 11.6, -21.95, 3), banner(7, 11.6, -21.95, 2.6, 'lila'),
      banner(-10, 17.6, -31.95, 3), banner(-1, 17.6, -31.95, 3.2, 'lila'),
      banner(-2.5, 23.6, -41.95, 3.4), banner(3, 23.6, -41.95, 3, 'lila'),
      { kind: 'knochen', pos: [-6.5, E0, -9.6], n: 5 }, { kind: 'knochen', pos: [6.4, E2, -30.6], n: 3 }, { kind: 'knochen', pos: [-6, TOP, -52.6], n: 4 },
      { kind: 'wappen', pos: [0, 2.4, -11.95], size: 1.8 },
      { kind: 'zahnrad', pos: [-10.2, 9.5, -14.5], size: 1.6, axis: 'x' },
    ] },
    // Stampfstein 1 (Fahrt auf Etage 1) – liegt hinter einem Glutriss
    { type: 'deco_w7', items: [{ kind: 'glutriss', pos: [4, E0, -8.4], length: 2.4, yaw: 0 }] },
    // Aufzug 1 (links, y 6 → 12) und Aufzug 2 (rechts, y 12 → 18)
    { type: 'mover', id: 'lift1', path: [[-10.5, E1 - 0.5, -20.5], [-10.5, E2 - 0.5, -20.5]], size: [3, 0.5, 3], speed: 2, idle: true, wait: 0, color: 'orange' },
    { type: 'mover', id: 'lift2', path: [[10.5, E2 - 0.5, -30.5], [10.5, E3 - 0.5, -30.5]], size: [3, 0.5, 3], speed: 2, idle: true, wait: 0, color: 'orange' },
    sign(-7.2, E1, -14, 'Aufzug: draufstellen!', { size: [2.2, 0.7] }),
    // Fähre über den Schacht in Etage 2
    { type: 'mover', id: 'faehre', path: [[-2.4, E2 - 0.5, -27], [2.4, E2 - 0.5, -27]], size: [3.2, 0.5, 3.4], speed: 1.4, wait: 0.9, color: 'yellow' },
    // Sinkwolke links unter der Turmspitze (Stempel): sinkt mit der Figur zur Etage 3 hinab, fährt leer zurück
    { type: 'cloud', id: 'sinkwolke', pos: [-16, 21.4, -47], size: [3.4, 0.6, 3.4], path: [[-16, 21.4, -47], [-10.7, E3 - 0.6, -39.6]], speed: 1.7, idle: true },
    // Seilbahn hinüber zum Funkenturm
    { type: 'seilbahn', id: 'gondel', from: [0, TOP + 2.2, -55.25], to: [0, G1 + 2.2, -86.85], speed: 3.2, trigger: 'stand', mode: 'pingpong', masts: false },
    sign(-3.2, TOP, -52.6, 'Seilbahn zum\nFunkenturm', { size: [2.2, 0.8] }),

    // ================================================================ 3 Funkenturm
    sign(-6.4, G1, -89.6, '5 Schlüssel öffnen\ndie Warp-Box!', { size: [2.6, 0.9] }),
    { type: 'stairs', pos: [-5, G1, -93], dir: '-z', steps: 6, rise: (R1 - G1) / 6, run: 1.25, width: 3, style: 'stone' },
    { type: 'stairs', pos: [13.6, BR, -93], dir: '-x', steps: 4, rise: (G1 - BR) / 4, run: 0.9, width: 7, style: 'stone' },
    { type: 'trampoline', pos: onRing(-45, 11.5, R1), strength: 22, size: 1.7 },
    sign(...onRing(-62, 11.9, R1), 'Feder!', { size: [1.2, 0.6], yaw: -0.9 }),
    { type: 'pfeilplattform', id: 'pfeil', from: 'wand', pos: [C2.x - 8.5, R2 + 2.4, C2.z], size: [3, 0.4, 2.4], dir: [-1, 0], wait: 1.4, up: 4.2, warn: 0.8, style: 'stein' },
    // Flucht: Giftnebel sinkt von oben, sobald die oberste Münze genommen wird
    { type: 'giftnebel', id: 'nebel', pos: [5, 46, -107], size: [38, 42], dir: 'down', speed: 0.9, to: 24.6, delay: 1.0, start: { box: [-2.2, R4 - 0.5, C2.z - 2.2, 2.2, R4 + 3, C2.z + 2.2] }, gap: 4, mood: 'flucht', color: 'lila' },
    sign(19, W, -89.4, 'Warp-Box\nzum Ziel', { size: [1.8, 0.7] }),
    { type: 'deco_w7', items: [
      fackel(-9.4, 21.6, -88.05), fackel(9.4, 21.6, -88.05),
      banner(-4, 19.6, -87.95, 3.2), banner(4, 19.6, -87.95, 3.2, 'lila'), banner(19, 16.4, -87.95, 2.6),
      { kind: 'fahne', pos: [0, R4, C2.z - 2.6], height: 3.6 },
      { kind: 'knochen', pos: [-8.6, G1, -97.6], n: 4 }, { kind: 'knochen', pos: [20.6, W, -96.6], n: 3 },
      { kind: 'kette', pos: [12.2, 22.6, -90.2], length: 2.4 }, { kind: 'kette', pos: [14.2, 22.6, -90.2], length: 3.2 },
    ] },
    // ================================================================ Ziel
    { type: 'deco_w7', items: [
      { kind: 'burgturm', pos: [-6.4, GOAL, -154.4], height: 6, radius: 1.2, solid: true }, { kind: 'burgturm', pos: [6.4, GOAL, -154.4], height: 6, radius: 1.2, solid: true },
      { kind: 'fahne', pos: [-4, GOAL, -150], height: 4.4 }, { kind: 'fahne', pos: [4, GOAL, -150], height: 4.4, color: 'lila' },
      fackel(-6.6, GOAL, -140, -PI / 2), fackel(6.6, GOAL, -140, -PI / 2),
    ] },
  ],
  blocks: [
    { kind: 'question', pos: [-2.4, E0 + 2.6, 4.6], content: 'coins:3' },
    { kind: 'question', pos: [-8, E2 + 2.4, -26.6], content: 'wachstumsbeere' },
    { kind: 'question', pos: [6.6, E2 + 1.6, -25.6], content: 'krallen' },
    { kind: 'hidden', pos: [-7.2, E1 + 2.6, -15.2], content: 'oneup' },
    { kind: 'question', pos: [2.6, G1 + 2.2, -91.6], content: 'sichel' },
    { kind: 'question', pos: [-2.6, G1 + 2.2, -91.6], content: 'coins:3' },
    // Ziegel-Würfel auf Ring 1 (Stern 2 in der Mitte): nur zerbrechen hilft – Stampfattacke, Tatze, Wurfsichel
    ...(() => {
      const out = [];
      const [cx, , cz] = onRing(0, 11.5, R1);
      for (let iy = 0; iy < 3; iy++) for (let ix = -1; ix <= 1; ix++) for (let iz = -1; iz <= 1; iz++) {
        if (ix === 0 && iz === 0 && iy === 1) continue;
        out.push({ kind: 'brick', id: `ziegel_${ix}_${iy}_${iz}`, pos: [cx + ix, R1 + iy, cz + iz] });
      }
      return out;
    })(),
  ],
  enemies: [
    // Stampfsteine als Fahrstühle (Oberseite in Ruhe = nächste Etage)
    { kind: 'stampfstein', id: 'stampf1', pos: [4, E1 - 2, -11.1], wait: 2.6, trigger: 1.2, rise: 2.4 },
    { kind: 'stampfstein', id: 'stampf2', pos: [-4, TOP - 2, -41.1], wait: 2.6, trigger: 1.2, rise: 2.4 },
    { kind: 'stampfstein', id: 'stampf3', pos: [0, R4 - 2, C2.z + RR[3] + 0.9], wait: 2.6, trigger: 1.0, rise: 2.4 },
    // Knochenflieger über den Etagen
    { kind: 'knochenflieger', id: 'kf0', center: [-3.5, E0 + 4.4, -5], radius: 2.6, sight: 5, reach: 5.5, speed: 1.8 },
    { kind: 'knochenflieger', id: 'kf1', center: [-2, E1 + 4.6, -17], radius: 3.2, sight: 5.5, reach: 6, phase: 0.4 },
    { kind: 'knochenflieger', id: 'kf2', center: [3, E3 + 4.8, -37], radius: 3.6, sight: 5.5, reach: 6, phase: 0.7 },
    // Drei Zauberkröten auf der Turmspitze
    { kind: 'zauberkroete', id: 'zk1', spots: [[-5, TOP, -46], [3.5, TOP, -51.5], [-1, TOP, -44]] },
    { kind: 'zauberkroete', id: 'zk2', spots: [[4.5, TOP, -45.5], [-4, TOP, -51.5], [5.5, TOP, -49]] },
    { kind: 'zauberkroete', id: 'zk3', spots: [[0, TOP, -50], [-5.5, TOP, -49.5], [1.5, TOP, -46]] },
    // Funkenflämmchen auf dem Funkenturm
    flamme('ff1', [[-8.4, G1, -95.4], [-4.2, G1, -95.4]]),
    flamme('ff2', arcPath(-100, -86, 11.6, R1, 3), { phase: 0.3 }),
    flamme('ff3', arcPath(-22, 4, 8.6, R2, 4), { phase: 0.6 }),
    flamme('ff4', arcPath(40, 64, 6.2, R3, 4), { phase: 0.1 }),
    flamme('ff5', arcPath(46, 68, 9.2, R2, 4), { phase: 0.5 }),
    flamme('ff6', arcPath(50, 70, 12.2, R1, 3), { phase: 0.8 }),
  ],
  items: [
    { kind: 'task', id: 'kroetenaufgabe', area: { min: [-8, TOP - 0.5, -54], max: [8, TOP + 8, -42] }, ids: ['zk1', 'zk2', 'zk3'], star: 1, pos: [0, TOP + 0.6, -48] },
    // Schlüsselmünzen (Funkenturm, von unten nach oben; die oberste weckt den Giftnebel)
    key([-8.6, G1, -90.6]),
    key(onRing(-75, 11.6, R1)),
    key(onRing(-64, 8.6, R2)),
    key(onRing(-45, 5.7, R3)),
    key([C2.x, R4, C2.z]),
    // Warp-Box zum Ziel (erscheint mit dem fünften Schlüssel) und Ankunft auf der Zielterrasse
    { kind: 'warpbox', id: 'warp', pos: [19.4, W, -93.4], target: 'zielbox', hidden: true },
    { kind: 'warpbox', id: 'zielbox', pos: [0, GOAL, -139.6], target: 'warp' },
    // Münzen
    line([0, 0.5, 7], [0, 0.5, 3], 4),
    arc([-6, 0.5, -4], [-2, 0.5, -9], 4, 1.2),
    line([4, E1 + 2.8, -11.1], [4, E1 + 2.8, -11.1], 1),
    line([2, E1 + 0.5, -15], [-6, E1 + 0.5, -15], 5),
    column(-10.5, -20.5, E1 + 1.4, E2 + 0.8, 4),
    arc([-5, E2 + 0.5, -27], [5, E2 + 0.5, -27], 6, 1.4),
    column(10.5, -30.5, E2 + 1.4, E3 + 0.8, 4),
    line([8, E3 + 0.5, -36], [-3, E3 + 0.5, -36], 6),
    ring([-4, TOP + 0.8, -48], 1.4, 6),
    line([0, TOP + 0.8, -53], [0, TOP + 0.8, -50.5], 3),
    arc([0, G1 + 3, -58], [0, G1 + 3, -84], 7, 1.2),
    line([-2, G1 + 0.5, -95], [2, G1 + 0.5, -95], 3),
    ...[-40, -55, -88, -100].map((a) => ({ kind: 'coin', pos: onRing(a, 11.6, R1 + 0.5) })),
    ...[-30, -50, -78].map((a) => ({ kind: 'coin', pos: onRing(a, 8.6, R2 + 0.5) })),
    ...[-75, -20, -5].map((a) => ({ kind: 'coin', pos: onRing(a, 5.7, R3 + 0.5) })),
    ...[78, 50, 20].map((a) => ({ kind: 'coin', pos: onRing(a, 5.7, R3 + 0.5) })),
    ...[60, 40, 15, 0, -15].map((a) => ({ kind: 'coin', pos: onRing(a, 8.6, R2 + 0.5) })),
    ...[70, 55, 40].map((a) => ({ kind: 'coin', pos: onRing(a, 11.6, R1 + 0.5) })),
    line([11, BR + 0.6, -93], [15.4, BR + 0.6, -93], 4),
    ring([0, GOAL + 0.8, -146], 1.6, 8),
    { kind: 'powerup', pos: [5.4, GOAL, -144], power: 'oneup' },
  ],
  checkpoint: { pos: [-3.5, G1, -92.2], yaw: PI / 2 },
  stars: [
    [13.3, 27.15, -30.5],                                          // 0: oben auf dem Kletterpfeiler (Krallen-Anzug)
    { pos: [0, TOP + 0.6, -48], hidden: true, id: 'stern_kroeten' }, // 1: drei Zauberkröten besiegt
    [0, R1 + 1.15, -100.5],                                         // 2: im Ziegel-Würfel auf Ring 1
  ],
  stamp: [-16, 22.55, -47],
  goal: [0, GOAL, -149.5],
  marks: {
    stampf1: [4, E0, -8.4], etage1: [0, E1, -16], lift1: [-10.5, E1, -20.5], etage2: [-8, E2, -26], faehre: [0, E2, -27],
    lift2: [10.5, E2, -30.5], etage3: [0, E3, -36], stampf2: [-4, E3, -38.4], spitze: [0, TOP, -48], gondel: [0, TOP, -55.25],
    vorhof: [0, G1, -93], ring1: onRing(-30, 11.5, R1), ring2: onRing(-60, 8.5, R2), ring3: onRing(-60, 5.7, R3), krone: [C2.x, R4, C2.z],
    warp: [19.4, W, -93.4], ziel: [0, GOAL, -146],
  },
};
