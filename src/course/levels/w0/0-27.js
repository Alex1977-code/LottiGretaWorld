// Lava-Gegnerzoo (0-27): Testlevel für die Gegner der Welt 7 „Lava-Festung“ (tests/course_w7_enemies.mjs). Aufbau wie die
// Gegnerzoos 0-18/0-21/0-24: Mittelweg (x ≈ 0) nach −Z, links (x −19 … −4) und rechts (x 4 … 19) Gehege mit Schild davor, Reihen
// alle 20 m (Vorderkante z0 = −8 − 20·(r−1)):
//   1 (−8 … −22)      links Knochenflieger im Kreis · rechts Knochenflieger auf einer Bahn und ein schwebender
//   2 (−28 … −42)     Platschfische im Lavabecken: links Pendel über ein Steinpodest (spuckt jedes 2. Mal) und ein zielender
//                     · rechts „endlos nachkommende“ (Spender) vor einem Steg
//   3 (−48 … −62)     Lavadrachen: links rot mit zwei Auftauchstellen · rechts blau (blaue Lava, 2 Treffer, 3 Feuerbälle)
//   4 (−68 … −82)     tiefe Wasserbecken: links Wutkaulquappe am Platz · rechts kreisende Wutkaulquappe und Insel
//   5 (−88 … −102)    Funkenflämmchen: links auf einem Steinpodest (Bahn, geradeaus mit Kantenumkehr) · rechts am Boden
//                     (verfolgend, blau)
//   6 (−108 … −122)   Bestand Welt 7: links Stachelpanzer, Zauberkröte, Pilzlingsturm · rechts Feuer-Werfer (blaue Kugeln),
//                     Hammer-Werfer, Bumerang-Werfer mit Wurfsichel
//   7 (−128 … −142)   tiefe Wasserbecken: links großer kreisender Rammfisch · rechts Rammfisch mit Stern in der Blase und
//                     auf- und abziehender Rammfisch
//   8 (−148 … −162)   Bestand 2: Stampfstein, Projektilkopf-Kanone, Marschblöcke, Lavabrocken, Schubser · Glutbälle (blaue
//                     Lava), Funkenling, Feuer-Schnappblume, Lavafunken
//   Ziel bei z −172. Hilfe Z(r, dz) = z der Reihe r, dz Meter hinter ihrer Vorderkante (auch in den Tests).
// Thema 'lava' (Lavasee unter dem Zoo), Musik course_volcano.

const Y = 1;
export const Z = (r, dz) => -8 - 20 * (r - 1) - dz;

function pen(x0, x1, z0, z1, h = 1.2) {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z0 - z1;
  return [
    { type: 'wall', pos: [cx, Y, z0], size: [w + 0.5, h, 0.5], camIgnore: true },
    { type: 'wall', pos: [cx, Y, z1], size: [w + 0.5, h, 0.5], camIgnore: true },
    { type: 'wall', pos: [x0, Y, cz], size: [0.5, h, d], camIgnore: true },
    { type: 'wall', pos: [x1, Y, cz], size: [0.5, h, d], camIgnore: true },
  ];
}
const L = (r, h) => pen(-19, -4, Z(r, 0), Z(r, 14), h);
const R = (r, h) => pen(4, 19, Z(r, 0), Z(r, 14), h);
const sign = (x, r, text) => ({ type: 'sign', pos: [x, Y, Z(r, -0.8)], text, size: [2.8, 0.8] });
const at = (x, r, dz, y = Y) => [x, y, Z(r, dz)];

// Lava in einem Gehege: Fläche auf dem Boden (Oberfläche Y + 0,3; Kollisions-Oberkante Y + 0,18)
const LAVA = Y + 0.18;
const lavaPen = (cx, r, color) => ({ type: 'lava', pos: [cx, Y, Z(r, 7)], size: [14.4, 0.3, 13.4], ...(color ? { color } : {}) });
// Tiefe Becken (Reihen 4 und 7): Boden Y − 5, Wasser bis Y + 0,8
const DEEP = Y - 5, WTOP = Y + 0.8;
const deepRow = (r) => [
  { type: 'island', pos: [0, -1, Z(r, 7)], size: [8.5, Y + 1, 14.2], top: 'rock', under: 0 },
  { type: 'island', pos: [-20, -1, Z(r, 7)], size: [2.5, Y + 1, 14.2], top: 'rock', under: 0 },
  { type: 'island', pos: [20, -1, Z(r, 7)], size: [2.5, Y + 1, 14.2], top: 'rock', under: 0 },
  { type: 'island', pos: [-11.5, DEEP - 1, Z(r, 7)], size: [15, 1, 14.2], top: 'sand', under: 0 },
  { type: 'island', pos: [11.5, DEEP - 1, Z(r, 7)], size: [15, 1, 14.2], top: 'sand', under: 0 },
  { type: 'water', pos: [-11.5, DEEP, Z(r, 7)], size: [14.6, WTOP - DEEP, 13.6] },
  { type: 'water', pos: [11.5, DEEP, Z(r, 7)], size: [14.6, WTOP - DEEP, 13.6] },
];
// Bodenstücke zwischen den tiefen Reihen (z von a bis b, a > b)
const floor = (a, b) => ({ type: 'island', pos: [0, -1, (a + b) / 2], size: [42, Y + 1, a - b], top: 'rock', under: 1.5 });

export const LEVEL = {
  id: '0-27',
  world: 0,
  title: 'Lava-Gegnerzoo',
  archetype: 'parcours',
  theme: 'lava',
  music: 'course_volcano',
  timeLimit: 999,
  start: { pos: [0, Y, 6], yaw: Math.PI / 2 },
  camera: [{ from: 14, to: -180, pitch: 45, dist: 13, yaw: 0 }],
  segments: [
    floor(12, Z(4, 0) + 0.1), ...deepRow(4), floor(Z(4, 14) - 0.1, Z(7, 0) + 0.1), ...deepRow(7), floor(Z(7, 14) - 0.1, -180),
    { type: 'lava', pos: [0, -8.6, -84], size: [140, 0.6, 240] },
    { type: 'killplane', y: -16 },
    ...L(1), ...R(1), ...L(2), ...R(2), ...L(3), ...R(3), ...L(4), ...R(4), ...L(5), ...R(5), ...L(6), ...R(6), ...L(7), ...R(7), ...L(8), ...R(8),
    // 2: Lavabecken mit Steinpodest bzw. Steg
    lavaPen(-11.5, 2), lavaPen(11.5, 2),
    { type: 'platform', id: 'podest_pf', pos: [-11.5, Y, Z(2, 7)], size: [3.6, 1.5, 3.6], style: 'stone' },
    { type: 'platform', id: 'steg_pf', pos: [11.5, Y, Z(2, 11)], size: [13, 1.2, 2.4], style: 'stone' },
    // 3: Lavaseen mit Standplatz vorn (rechts blaue Lava)
    lavaPen(-11.5, 3), lavaPen(11.5, 3, 'blau'),
    { type: 'platform', id: 'stand_ld', pos: [-11.5, Y, Z(3, 2.2)], size: [13, 1.2, 3.2], style: 'stone' },
    { type: 'platform', id: 'stand_ldb', pos: [11.5, Y, Z(3, 2.2)], size: [13, 1.2, 3.2], style: 'stone' },
    // 4 rechts: kleine Insel im Becken
    { type: 'platform', id: 'insel_wq', pos: [15.5, DEEP, Z(4, 3)], size: [3, WTOP - DEEP + 0.4, 3], style: 'stone' },
    // 5 links: Steinpodest für die Funkenflämmchen
    { type: 'platform', id: 'podest_ff', pos: [-11.5, Y, Z(5, 7)], size: [10, 1, 7], style: 'stone' },
    // 8 rechts: blaue Lava für Glutbälle, Lavarinne für Lavafunken
    { type: 'lava', pos: [-15.5, Y, Z(8, 11)], size: [6.6, 0.3, 4.6], color: 'blau' },
    { type: 'lava', pos: [13.5, Y, Z(8, 11.5)], size: [10.6, 0.3, 3.6] },
    sign(-11.5, 1, 'Knochenflieger\nKreis'), sign(11.5, 1, 'Knochenflieger\nBahn'),
    sign(-11.5, 2, 'Platschfisch'), sign(11.5, 2, 'Platschfisch\nendlos'),
    sign(-11.5, 3, 'Lavadrache'), sign(11.5, 3, 'Lavadrache\nblau'),
    sign(-11.5, 4, 'Wutkaulquappe'), sign(11.5, 4, 'Wutkaulquappe\nKreis'),
    sign(-11.5, 5, 'Funkenflämmchen'), sign(11.5, 5, 'Funkenflämmchen\nJäger'),
    sign(-11.5, 6, 'Bestand\nWelt 7'), sign(11.5, 6, 'Werfer-Brüder'),
    sign(-11.5, 7, 'Rammfisch\ngroß'), sign(11.5, 7, 'Rammfisch\nmit Stern'),
    sign(-11.5, 8, 'Bestand 2'), sign(11.5, 8, 'Bestand 3'),
  ],
  enemies: [
    // ---- 1 Knochenflieger
    { kind: 'knochenflieger', id: 'kf_kreis', center: at(-11.5, 1, 7, Y + 4.4), radius: 3, sight: 6.5, reach: 6.5 },
    { kind: 'knochenflieger', id: 'kf_bahn', path: [at(6.5, 1, 3, Y + 4.2), at(12, 1, 3, Y + 4.2), at(12, 1, 7, Y + 4.2), at(6.5, 1, 7, Y + 4.2)], loop: true, sight: 5 },
    { kind: 'knochenflieger', id: 'kf_schwebt', pos: at(16, 1, 11.5, Y + 2.6), sight: 0, bob: 0.1 },
    // ---- 2 Platschfische
    { kind: 'platschfisch', id: 'pf_pendel', pos: at(-17, 2, 7, LAVA), dir: [1, 0], dist: 11, height: 2.2, every: 2.6, spit: 2, sight: 9 },
    { kind: 'platschfisch', id: 'pf_ziel', pos: at(-11.5, 2, 11.5, LAVA), aim: true, dist: 3, range: 4, height: 2.4, every: 2.4, phase: 0.5, sight: 7 },
    { kind: 'platschfisch', id: 'pf_strom', pos: at(5.5, 2, 6.5, LAVA), dir: [1, 0], dist: 4, height: 2.6, spawner: { every: 2.0, max: 3, hops: 3 } },
    // ---- 3 Lavadrachen
    { kind: 'lavadrache', id: 'ld_rot', spots: [at(-10, 3, 9.5, LAVA), at(-15, 3, 11, LAVA)], shots: 2, sight: 13, hide: 1.6 },
    { kind: 'lavadrache', id: 'ld_blau', pos: at(11.5, 3, 10, LAVA), color: 'blau', shots: 3, hp: 2, sight: 13, hide: 1.8, interval: 1.0 },
    // ---- 4 Wutkaulquappen
    { kind: 'wutkaulquappe', id: 'wq_platz', pos: at(-11.5, 4, 7, Y - 2), sight: 6.5 },
    { kind: 'wutkaulquappe', id: 'wq_kreis', pos: at(9.5, 4, 8, Y - 2.4), center: at(9.5, 4, 8, Y - 2.4), radius: 2.4, sight: 6, size: 1.1 },
    // ---- 5 Funkenflämmchen
    { kind: 'funkenflaemmchen', id: 'ff_bahn', pos: at(-15, 5, 5, Y + 1), path: [at(-15.5, 5, 5, Y + 1), at(-8, 5, 5, Y + 1)] },
    { kind: 'funkenflaemmchen', id: 'ff_gerade', pos: at(-12, 5, 9, Y + 1), dir: [1, 0], phase: 0.4 },
    { kind: 'funkenflaemmchen', id: 'ff_jaeger', pos: at(11.5, 5, 9), behavior: 'chase', sight: 6 },
    { kind: 'funkenflaemmchen', id: 'ff_blau', pos: at(16, 5, 4), dir: [0, -1], color: 'blau', hop: 1.0, height: 0.6 },
    // ---- 6 Bestand Welt 7
    { kind: 'stachelpanzer', id: 'b_stachelpanzer', pos: at(-15, 6, 4), path: [at(-16, 6, 4), at(-11, 6, 4)] },
    { kind: 'zauberkroete', id: 'b_zauber', spots: [at(-8, 6, 5), at(-8, 6, 11), at(-12, 6, 11)] },
    { kind: 'pilzlingsturm', id: 'b_turm', pos: at(-16, 6, 11), count: 4, behavior: 'walk', speed: 0.5 },
    { kind: 'feuer_werfer', id: 'w_feuer', pos: at(7, 6, 7), fireColor: 'blau' },
    { kind: 'hammer_werfer', id: 'w_hammer', pos: at(11.5, 6, 10) },
    { kind: 'bumerang_werfer', id: 'w_sichel', pos: at(16, 6, 7), sichel: true },
    // ---- 7 Rammfische
    { kind: 'rammfisch', id: 'rf_gross', center: at(-11.5, 7, 7, Y - 4.2), radius: 3.4, size: 2, speed: 1.6 },
    { kind: 'rammfisch', id: 'rf_stern', pos: at(7, 7, 4, Y - 3.4), path: [at(7, 7, 4, Y - 3.4), at(16, 7, 4, Y - 3.4)], carries: 'star:0', ram: false, speed: 1.2 },
    { kind: 'rammfisch', id: 'rf_hoch', pos: at(15.5, 7, 10.5, Y - 4.4), path: [at(15.5, 7, 10.5, Y - 4.4), at(15.5, 7, 10.5, Y - 1.1)], speed: 1.4, sight: 6, range: 6 },
    // ---- 8 Bestand 2/3
    { kind: 'stampfstein', id: 'b_stampf', pos: at(-16, 8, 4, Y + 3.5) },
    { kind: 'kanone_turm', id: 'b_kanone', pos: at(-18, 8, 7.5), dir: [1, 0], interval: 3.5, range: 18 },
    { kind: 'marschblock', id: 'b_marsch', path: [at(-11, 8, 3), at(-7, 8, 3), at(-7, 8, 7), at(-11, 8, 7)], count: 2 },
    { kind: 'lavabrocken', id: 'b_brocken', pos: at(-9, 8, 11), behavior: 'walk', path: [at(-11, 8, 11), at(-6, 8, 11)] },
    { kind: 'schubser', id: 'b_schubser', pos: at(-6, 8, 7), dir: [-1, 0], behavior: 'guard', sight: 3 },
    { kind: 'glutball', id: 'b_glut', pos: [-15.5, Y + 0.3, Z(8, 11)], count: 2, spacing: 2.5, dir: [1, 0], height: 3, period: 2.4, color: 'blau' },
    { kind: 'funkenling', id: 'b_funkenling', pos: at(7, 8, 4), dir: [1, 0], speed: 2 },
    { kind: 'feuer_schnappblume', id: 'b_feuerblume', pos: at(17, 8, 4), yaw: Math.PI },
    { kind: 'lavafunke', id: 'b_lavafunke', pos: [9.5, Y + 0.3, Z(8, 11.5)], count: 3, spacing: 3, dir: [1, 0], height: 3.2, period: 2.4 },
  ],
  items: [],
  goal: [0, Y, -172],
  marks: { podest: [-11.5, Y + 1.5, Z(2, 7)], steg: [11.5, Y + 1.2, Z(2, 11)], stand: [-11.5, Y + 1.2, Z(3, 2.2)], standB: [11.5, Y + 1.2, Z(3, 2.2)], ffPodest: [-11.5, Y + 1, Z(5, 7)] },
};
