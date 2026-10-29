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
    { from: -95, to: -200, pitch: 44, dist: 14, fov: 40, x: 0, xLock: 0.25, area: [-40, 40] },
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
    { type: 'keksrad', id: 'kleinC', pos: [-21, Y - 0.6, -69.1], radius: 1.7, speed: 0.25, icing: 'weiss', postDown: 8 },
    isl(-22.4, -20.8, -70.8, -85, Y, 1.4, { top: 'grass' }),
    isl(-20.8, -6, -83.4, -85, Y, 1.4, { top: 'grass' }),
    // stehende Laufkekse (Oberseite läuft wie ein Band nach +Z – gegenan laufen)
    { type: 'keksrad', id: 'lauf1', axis: 'x', pos: [2, Y - 2.4, -66], radius: 2.4, thick: 4, speed: 0.35, icing: 'rosa' },
    { type: 'keksrad', id: 'lauf2', axis: 'x', pos: [2, Y - 2.4, -73.6], radius: 2.4, thick: 4, speed: 0.35, icing: 'schoko' },
    isl(-6, 6, -78, -92, Y, 7, { top: 'grass' }),                                         // Platz 3 vor der Wand

    // ================================================================ 2 Zahnradwand
    isl(-12, 12, -92, -98, T, T + 6, { top: 'grass' }),                                   // die Wand (Oberkante y 16)
    isl(-8.4, -0.4, -90, -92, Y + 5.8, 1.2, { top: 'grass' }),                             // Sims (links)
    { type: 'keks_zahnrad', id: 'wand1', axis: 'z', pos: [4, Y + 3.6, -90.4], radius: 3, teeth: 8, thick: 1.6, speed: 0.4 },   // Paternoster
    { type: 'keks_zahnrad', id: 'stufe1', pos: [-6, Y + 6.3, -90.2], radius: 1.8, teeth: 8, speed: 0.5, icing: 'rosa', post: false },
    { type: 'keks_zahnrad', id: 'stufe2', pos: [-1.5, Y + 8.4, -90.2], radius: 1.8, teeth: 8, speed: -0.5, icing: 'gruen', post: false },
    { type: 'keks_zahnrad', id: 'stufe3', pos: [3, Y + 10.5, -90.2], radius: 1.8, teeth: 8, speed: 0.5, icing: 'weiss', post: false },
    { type: 'keks_zahnrad', id: 'stufe4', pos: [7.5, Y + 12.6, -90.2], radius: 1.8, teeth: 8, speed: -0.5, icing: 'schoko', post: false },
    // Zier: große Zahnräder halb in der Wand (drehen sich, unerreichbar)
    { type: 'keks_zahnrad', id: 'zier1', axis: 'z', pos: [-9.6, Y + 12.2, -92.9], radius: 2.6, teeth: 8, thick: 1.2, speed: -0.3, icing: 'schoko' },
    { type: 'keks_zahnrad', id: 'zier2', axis: 'z', pos: [10.2, Y + 9.6, -92.9], radius: 2.2, teeth: 8, thick: 1.2, speed: 0.35, icing: 'rosa' },

    // ================================================================ 3 Ameisenstraße (oben): Straße als Platte (1 m) mit zwei offenen Löchern
    isl(-8, 8, -98, -110, T, 6, { top: 'grass' }),                                        // Kontrollpunkt
    sign(-6.4, T, -101, 'Ameisenstraße', { yaw: 0.2 }),
    isl(-8, 4, -110, -117.2, T, 1, { top: 'grass', under: 0 }),
    isl(4, 8, -110, -117.2, T, 1, { top: 'grass', under: 0, xray: true }),                 // über dem Stempel-Fach (Durchsicht)
    isl(-8, 6.4, -117.2, -118.8, T, 1, { top: 'grass', under: 0 }),                       // Loch von Reihe 1 rechts (x 6,4 … 8)
    isl(-8, 8, -118.8, -140, T, 1, { top: 'grass', under: 0 }),
    isl(-8, -4, -140, -153.2, T, 1, { top: 'grass', under: 0, xray: true }),               // über dem Rätselbox-Fach (Durchsicht)
    isl(-4, 8, -140, -153.2, T, 1, { top: 'grass', under: 0 }),
    isl(-6.4, 8, -153.2, -154.8, T, 1, { top: 'grass', under: 0 }),                       // Loch von Reihe 3 links (x −8 … −6,4)
    isl(-8, 8, -154.8, -194, T, 1, { top: 'grass', under: 0 }),
    // Fach unter Reihe 1 (Stempel) und Fach unter Reihe 3 (Rätselbox), je mit Röhre zurück auf die Straße
    isl(4, 13, -112, -124, T - 4.6, 2.4, { top: 'grass' }),
    isl(12.4, 13, -112, -124, T - 3.4, 1.2, { top: 'grass', under: 0 }),
    { type: 'pipe', id: 'fach1_aus', pos: [11, T - 4.6, -114], height: 1.4, target: [5.6, T, -112.4] },
    isl(-13, -4, -148, -160, T - 4.6, 2.4, { top: 'grass' }),
    isl(-13, -12.4, -148, -160, T - 3.4, 1.2, { top: 'grass', under: 0 }),
    { type: 'pipe', id: 'fach2_aus', pos: [-5.6, T - 4.6, -149.6], height: 1.4, target: [-2.6, T, -148] },
    // Kanonen-Glasröhre am Straßenende hinüber zur Zielplattform
    { type: 'glasspipe', id: 'kanone', path: [[0, T + 1.05, -188.6], [0, T + 1.05, -193.4], [0, T + 2.4, -197.6]], oneWay: true, radius: 1, coins: 3,
      cannon: { target: [0, Y + 8, -226.5], arc: 6 } },

    // ================================================================ 4 Ziel und Kuchenplattform
    isl(-8, 8, -222, -238, Y + 8, 7, { top: 'grass' }),
    isl(-6, 6, -248, -262, Y - 4, 5, { top: 'grass' }),                                    // Kuchenplattform (tief unten)
    // Sahnerand ringsum (hält Hase und Heldin auf dem Kuchen)
    { type: 'wall', pos: [0, Y - 4, -248.3], size: [12, 0.7, 0.6], style: 0xfff6fa },
    { type: 'wall', pos: [0, Y - 4, -261.7], size: [12, 0.7, 0.6], style: 0xfff6fa },
    { type: 'wall', pos: [-5.7, Y - 4, -255], size: [0.6, 0.7, 12.8], style: 0xfff6fa },
    { type: 'wall', pos: [5.7, Y - 4, -255], size: [0.6, 0.7, 12.8], style: 0xfff6fa },
    { type: 'pipe', id: 'kuchen_aus', pos: [3.4, Y - 4, -251.6], height: 1.4, target: [5, Y + 8, -224.4] },

    // ================================================================ Rätselbox-Raum (abseits): großer Drehkeks über dem Schokoladensee
    isl(RX - 10, RX + 10, -124, -132, Y, 6, { top: 'grass' }),
    { type: 'keksrad', id: 'raum_klein', pos: [RX, Y - 0.6, -134.4], radius: 1.5, speed: 0.4, icing: 'gruen', postDown: 8 },
    { type: 'keksrad', id: 'raum_gross', pos: [RX, Y - 0.6, -141], radius: 4.4, speed: -0.35, icing: 'rosa', postDown: 8 },
  ],
  blocks: [
    { kind: 'question', pos: [-2.5, Y + 1.9, -1], content: 'sichel' },
    { kind: 'coinblock', pos: [2.5, Y + 2.4, -1], count: 6 },
    { kind: 'question', pos: [0, T + 2.4, -102], content: 'wachstumsbeere' },
    { kind: 'hidden', pos: [11.2, T - 4.6 + 2.2, -122.4], content: 'oneup' },        // Extraleben im Stempel-Fach
    { kind: 'hidden', pos: [RX + 6.5, Y + 2.6, -127], content: 'oneup' },             // Extraleben im Keks-Raum
  ],
  enemies: [
    { kind: 'riesenschnappblume', id: 'blume1', pos: [8, Y, -29.2], yaw: PI },
    { kind: 'riesenschnappblume', id: 'blume2', pos: [-8, Y, -57.2], yaw: 0 },
  ],
  items: [
    // Hörner-Ameisen marschieren in Reihen von Loch zu Loch
    { kind: 'ameisen_reihe', id: 'reihe1', from: [-7.2, T, -118], to: [7.2, T, -118], every: 2.6 },
    { kind: 'ameisen_reihe', id: 'reihe2', from: [7.2, T, -136], to: [-7.2, T, -136], lanes: 2, gap: 1.4, every: 3, phase: 0 },
    { kind: 'ameisen_reihe', id: 'reihe3', from: [-7.2, T, -154], to: [7.2, T, -154], every: 2.6 },
    { kind: 'ameisen_reihe', id: 'reihe4', from: [7.2, T, -172], to: [-7.2, T, -172], lanes: 2, gap: 1.4, every: 2.8, phase: 0 },
    // Rätselbox im Fach unter Reihe 3 → Keks-Raum
    { kind: 'warpbox', id: 'raetsel', style: 'mystery', pos: [-10.6, T - 4.6, -155.6], target: 'raetsel2' },
    { kind: 'warpbox', id: 'raetsel2', style: 'mystery', pos: [RX - 6, Y, -127.4], target: [-2.6, T, -148] },
    // Fang-Hase auf der Kuchenplattform (Stern 2)
    { kind: 'bunny', id: 'hase', pos: [-2, Y - 4, -256], star: 2, area: { min: [-5.4, -249], max: [5.4, -261.4] }, speed: 4.6 },
    // Münzen
    line([0, Y + 0.6, 2], [0, Y + 0.6, -4], 4),
    ring([0, Y + 0.6, -10.4], 1.8, 6),
    ring([0, Y + 0.6, -18.6], 1.8, 6),
    line([0, Y + 0.6, -36], [0, Y + 0.6, -48], 6),
    line([0, T + 0.6, -122], [0, T + 0.6, -132], 5),
    line([0, T + 0.6, -158], [0, T + 0.6, -168], 5),
    line([0, T + 0.6, -176], [0, T + 0.6, -186], 5),
    ring([8.5, T - 4, -118], 1.4, 6),
    ring([RX, Y + 0.6, -141], 3.2, 12),
  ],
  checkpoint: { pos: [0, T, -104], yaw: PI / 2 },
  stars: [
    [-17.9, Y + 1.2, -68],                                          // 0: in der Lücke hinter Riesenschnappblume 2
    [RX, Y + 0.5, -141],                                            // 1: Keks-Raum (Rätselbox): auf dem großen Drehkeks
    { pos: [0, Y - 3, -256], hidden: true, id: 'stern2' },          // 2: Hase auf der Kuchenplattform
  ],
  stamp: [10.4, T - 4.0, -120.4],
  goal: [0, Y + 8, -232],
  marks: { start: [0, Y, 6], platz1: [0, Y, -26], platz2: [0, Y, -52], wand: [0, Y, -86], oben: [0, T, -104], ziel: [0, Y + 8, -226], kuchen: [0, Y - 4, -260] },
};
