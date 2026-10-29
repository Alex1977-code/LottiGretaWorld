// 8-3 „Keksräder in der Zuckerfabrik“ (Bauplan 8-3: Parcours, 400 s, ca. 240 m – Keks-Thema, drehende Kekse als Plattformen).
// Thema cookie, Musik course_cookie.
//
// Baron Brummbärs Keksfabrik: Riesenkekse drehen sich wie Teller, Keks-Zahnräder greifen ineinander, eine 15 m hohe
// Zahnradwand führt hinauf zur Ameisenstraße. Abschnitte (nach −Z, Laufhöhe y 1, oben y 16, Absturz unter y −8):
//   1. Keksräder (z 10 … −92): zwei Drehkekse, Riesenschnappblume 1, zwei ineinandergreifende Keks-Zahnräder,
//      Riesenschnappblume 2 – dahinter zwei kleine Kekse und die Lücke mit Stern 0 (Weitsprung oder Wurfsichel), stehende
//      Laufkekse (wie Förderbänder) zur Zahnradwand.
//   2. Zahnradwand (z −92 … −98, 15 m hoch): drei stehende Keks-Zahnräder als Paternoster, Simse dazwischen.
//   3. Ameisenstraße (z −98 … −196, oben): Kontrollpunkt; Reihen von Hörner-Ameisen marschieren quer von Loch zu Loch; die
//      Löcher sind begehbar – unter Reihe 1 ein Fach mit dem Stempel, unter Reihe 3 die Rätselbox (Stern 1 auf einem großen
//      Keks); am Ende die Kanonen-Glasröhre hinüber zur Zielplattform.
//   4. Zielplattform (z −222 … −236) und – hinter dem Zielmast, tief unten – die Kuchenplattform mit dem Hasen (Stern 2),
//      eine Röhre führt zurück hinauf.

import { isl, line, ring, arc, column, sign } from './_helpers_a.js';

const Y = 1;            // Fabrikboden
const T = 16;           // oben (Ameisenstraße)
const PI = Math.PI;
const RX = 70;          // Rätselbox-Raum (abseits)

export const LEVEL = {
  id: '8-3',
  world: 8,
  title: 'Keksräder in der Zuckerfabrik',
  archetype: 'parcours',
  theme: 'cookie',
  music: 'course_cookie',
  timeLimit: 400,
  killY: -8,
  farHide: 60,
  instances: { coin: { farHide: 44, shadow: false } },
  start: { pos: [0, Y, 6], yaw: PI / 2 },
  camera: [
    { from: 16, to: -84, pitch: 44, dist: 13.5, fov: 40, x: 0, xLock: 0.25, area: [-40, 40] },
    { from: -84, to: -95, pitch: 24, dist: 17, fov: 42, x: 0, xLock: 0.3, height: 2.4, area: [-40, 40] },
    { from: -95, to: -200, pitch: 44, dist: 14, fov: 40, x: 0, xLock: 0.3, area: [-40, 40] },
    { from: -200, to: -280, pitch: 40, dist: 14, fov: 40, x: 0, xLock: 0.3, area: [-40, 40] },
    { from: -100, to: -180, pitch: 46, dist: 14, fov: 40, x: RX, xLock: 0.5, area: [RX - 25, RX + 25] },
  ],
  segments: [
    // ================================================================ 1 Keksräder
    isl(-7, 7, 11, -5, Y, 7, { top: 'grass' }),
    sign(-5, Y, 3.6, 'Keksfabrik', { yaw: 0.25 }),
    { type: 'keksrad', id: 'keks1', pos: [0, Y - 0.6, -10.4], radius: 3, speed: 0.5 },
    { type: 'keksrad', id: 'keks2', pos: [0, Y - 0.6, -18.6], radius: 3, speed: -0.55, icing: 'weiss' },
    isl(-6, 6, -23.6, -34, Y, 7, { top: 'grass' }),                                       // Platz 1
    isl(6, 10, -27, -31.4, Y, 6, { top: 'grass' }),                                        // Sockel der Riesenschnappblume 1
    { type: 'keks_zahnrad', id: 'zahnA', pos: [0, Y - 0.6, -39.4], radius: 2.4, teeth: 8, speed: 0.45 },
    { type: 'keks_zahnrad', id: 'zahnB', pos: [0, Y - 0.6, -44.7], radius: 2.4, teeth: 8, speed: -0.45 },
    isl(-6, 6, -50, -62, Y, 7, { top: 'grass' }),                                         // Platz 2
    isl(-10, -6, -55, -59.4, Y, 6, { top: 'grass' }),                                      // Sockel der Riesenschnappblume 2
    // hinter der Blume: zwei kleine Kekse, die Stern-Lücke (6,2 m), Landekeks, Zuckerguss-Steg zurück zu Platz 3
    { type: 'keksrad', id: 'kleinA', pos: [-9.6, Y - 0.6, -64.4], radius: 1.4, speed: 0.3, icing: 'gruen', postDown: 8 },
    { type: 'keksrad', id: 'kleinB', pos: [-13.4, Y - 0.6, -66.4], radius: 1.4, speed: -0.3, icing: 'schoko', postDown: 8 },
    { type: 'keksrad', id: 'kleinC', pos: [-22.4, Y - 0.6, -69.6], radius: 1.7, speed: 0.25, icing: 'weiss', postDown: 8 },
    isl(-23.2, -21.6, -71.2, -85, Y, 1.4, { top: 'grass' }),
    isl(-21.6, -6, -83.4, -85, Y, 1.4, { top: 'grass' }),
    // stehende Laufkekse (Oberseite läuft wie ein Band nach +Z – gegenan laufen)
    { type: 'keksrad', id: 'lauf1', axis: 'x', pos: [2, Y - 2.4, -66], radius: 2.4, thick: 4, speed: 0.35, icing: 'rosa' },
    { type: 'keksrad', id: 'lauf2', axis: 'x', pos: [2, Y - 2.4, -73.6], radius: 2.4, thick: 4, speed: 0.35, icing: 'schoko' },
    isl(-6, 6, -78, -92, Y, 7, { top: 'grass' }),                                         // Platz 3 vor der Wand

    // ================================================================ 2 Zahnradwand
    isl(-12, 12, -92, -98, T, T + 6, { top: 'grass' }),                                   // die Wand (Oberkante y 16)
    isl(-8.4, -0.4, -90, -92, Y + 5.8, 1.2, { top: 'grass' }),                             // Sims (links)
    { type: 'keks_zahnrad', id: 'wand1', axis: 'z', pos: [4, Y + 3.6, -90.4], radius: 3, teeth: 8, thick: 1.6, speed: 0.4 },   // Paternoster
    { type: 'keks_zahnrad', id: 'stufe1', pos: [-6, Y + 7.7, -90.2], radius: 1.8, teeth: 8, speed: 0.5, icing: 'rosa', post: false },
    { type: 'keks_zahnrad', id: 'stufe2', pos: [-1.2, Y + 10.2, -90.2], radius: 1.8, teeth: 8, speed: -0.5, icing: 'gruen', post: false },
    { type: 'keks_zahnrad', id: 'stufe3', pos: [3.6, Y + 12.7, -90.2], radius: 1.8, teeth: 8, speed: 0.5, icing: 'weiss', post: false },
    // Zier: große Zahnräder halb in der Wand (drehen sich, unerreichbar)
    { type: 'keks_zahnrad', id: 'zier1', axis: 'z', pos: [-9.6, Y + 12.2, -92.9], radius: 2.6, teeth: 8, thick: 1.2, speed: -0.3, icing: 'schoko' },
    { type: 'keks_zahnrad', id: 'zier2', axis: 'z', pos: [10.2, Y + 9.6, -92.9], radius: 2.2, teeth: 8, thick: 1.2, speed: 0.35, icing: 'rosa' },

    // ================================================================ 3 Ameisenstraße (oben)
    isl(-8, 8, -98, -196, T, 6, { top: 'grass' }),
    sign(-6.4, T, -101, 'Ameisenstraße', { yaw: 0.2 }),

    // ================================================================ 4 Ziel und Kuchenplattform
    isl(-8, 8, -222, -238, Y + 8, 7, { top: 'grass' }),
    isl(-6, 6, -256, -270, Y - 4, 5, { top: 'grass' }),                                    // Kuchenplattform (tief unten)

    // ================================================================ Rätselbox-Raum (abseits)
    isl(RX - 10, RX + 10, -130, -150, Y, 6, { top: 'grass' }),
  ],
  blocks: [
    { kind: 'question', pos: [-2.5, Y + 1.9, -1], content: 'sichel' },
    { kind: 'coinblock', pos: [2.5, Y + 2.4, -1], count: 6 },
    { kind: 'question', pos: [0, T + 2.4, -102], content: 'wachstumsbeere' },
  ],
  enemies: [
    { kind: 'riesenschnappblume', id: 'blume1', pos: [8, Y, -29.2], yaw: PI },
    { kind: 'riesenschnappblume', id: 'blume2', pos: [-8, Y, -57.2], yaw: 0 },
  ],
  items: [
    { kind: 'warpbox', id: 'raetsel', style: 'mystery', pos: [5, T, -150], target: 'raetsel2' },
    { kind: 'warpbox', id: 'raetsel2', style: 'mystery', pos: [RX - 6, Y, -133], target: [5, T, -146] },
    line([0, Y + 0.6, 2], [0, Y + 0.6, -4], 4),
    ring([0, Y + 0.6, -10.4], 1.8, 6),
    ring([0, Y + 0.6, -18.6], 1.8, 6),
    line([0, Y + 0.6, -36], [0, Y + 0.6, -48], 6),
  ],
  checkpoint: { pos: [0, T, -104], yaw: PI / 2 },
  stars: [
    [-17.9, Y + 1.2, -68],                                          // 0: in der Lücke hinter Riesenschnappblume 2
    { pos: [RX, Y + 2.6, -142], hidden: true, id: 'stern1' },       // 1: Rätselbox (auf dem großen Keks)
    { pos: [0, Y - 3, -266], hidden: true, id: 'stern2' },          // 2: Hase auf der Kuchenplattform
  ],
  stamp: [0, T - 3, -122],
  goal: [0, Y + 8, -230],
  marks: { start: [0, Y, 6], platz1: [0, Y, -26], platz2: [0, Y, -52], wand: [0, Y, -86], oben: [0, T, -104], ziel: [0, Y + 8, -226], kuchen: [0, Y - 4, -260] },
};
