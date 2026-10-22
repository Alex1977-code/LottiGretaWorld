// Gegnerzoo Wüste (0-6): Testlevel für alle Gegner von Welt 2 (tests/course_w2_enemies.mjs). Aufbau wie der
// Gegnerpark 0-1: ein Mittelweg (x ≈ 0) nach −Z, links (x −19 … −4) und rechts (x 4 … 19) Gehege (niedrige Mauern
// 1,2 m, 14 m tief, alle 20 m) mit je einer Station und einem Schild davor. Reihen (Vorderkante z0 = −8 − 20·(r−1)):
//   1 (−8 … −22)      links Hackvögel (steht, patrouilliert, im Ring aus Steinblöcken) · rechts Rollpilze + Zielscheiben
//   2 (−28 … −42)     links Großrollpilz auf einer Felsinsel im Lavasee · rechts Wuschel (Pendel, Schleife, Kreis)
//   3 (−48 … −62)     links Hüpfmäuse · rechts Stachel-Hüpfmäuse
//   4 (−68 … −82)     links Marschblock-Kolonne (6, Schleife) · rechts Mini-Pilzlinge (+ ein normaler)
//   5 (−88 … −102)    links Feuer-Werfer (zwei Ebenen, Einweg-Plattform) · rechts Hammer- und Bumerang-Werfer
//   6 (−108 … −122)   links Kanonentürme (Projektilkopf, zweiseitig mit Suchkopf) · rechts Feuer-Schnappblumen
//   7 (−128 … −142)   links Lauerblöcke in einer Wand (Gang, Gegenwand zum Einklemmen, dritter oben offen) · rechts
//                     Münzmarder (Fluchtweg über einen Graben bei z −134 … −136,5)
//   Ziel bei z −160. Theme 'desert' (bis es das Wüstenthema gibt: Rückfall auf Gras), Musik course_desert.
// Hilfe Z(r, dz) = z der Reihe r, dz Meter hinter ihrer Vorderkante (auch in den Tests).

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
const sign = (x, r, text) => ({ type: 'sign', pos: [x, Y, Z(r, -0.8)], text, size: [2.6, 0.8] });
const at = (x, r, dz, y = Y) => [x, y, Z(r, dz)];

// Lauerblock-Wand (Reihe 7 links): hintere Schicht x −16 … −14, vordere Schicht x −14 … −13 mit drei Öffnungen
const LB = [4, 8, 12];
function lauerWall() {
  const out = [{ type: 'wall', pos: at(-15, 7, 7), size: [2, 2.5, 14] }];
  const cuts = [0, ...LB.flatMap((d) => [d - 0.5, d + 0.5]), 14];
  for (let i = 0; i < cuts.length; i += 2) {
    const a = cuts[i], b = cuts[i + 1];
    out.push({ type: 'wall', pos: at(-13.5, 7, (a + b) / 2), size: [1, 2.5, b - a] });
  }
  // Sturz über den ersten beiden Öffnungen; die dritte ist oben offen (auf dem Block stehen und mitfahren)
  for (const d of LB.slice(0, 2)) out.push({ type: 'wall', pos: at(-13.5, 7, d, Y + 1), size: [1, 1.5, 1] });
  return out;
}
const TRENCH = [Z(7, 6), Z(7, 8.5)];      // Graben (rechts) für den Münzmarder

export const LEVEL = {
  id: '0-6',
  world: 0,
  title: 'Gegnerzoo Wüste',
  archetype: 'parcours',
  theme: 'desert',
  music: 'course_desert',
  timeLimit: 999,
  start: { pos: [0, Y, 6], yaw: Math.PI / 2 },
  camera: [{ from: 14, to: -180, pitch: 45, dist: 13, yaw: 0 }],
  segments: [
    // Boden: links und Mitte durchgehend; rechts mit Graben (Münzmarder springt hinüber)
    { type: 'island', pos: [-9, 0, -80], size: [26, 1, 190], top: 'sand' },
    { type: 'island', pos: [13, 0, (15 + TRENCH[0]) / 2], size: [18, 1, 15 - TRENCH[0]], top: 'sand' },
    { type: 'island', pos: [13, 0, (TRENCH[1] - 175) / 2], size: [18, 1, TRENCH[1] + 175], top: 'sand' },
    { type: 'killplane', y: -16 },
    ...L(1), ...R(1), ...L(2), ...R(2), ...L(3), ...R(3), ...L(4), ...R(4), ...L(5), ...R(5),
    ...L(6, 1.8), ...R(6), ...L(7, 2.5), ...R(7),
    // 2 links: Felsinsel im Lavasee
    { type: 'lava', pos: at(-11.5, 2, 7), size: [14.5, 0.5, 13.5] },
    { type: 'island', pos: at(-11.5, 2, 7), size: [8, 1.2, 8], top: 'stone', under: 0 },
    // 5 links: Einweg-Plattform für den Feuer-Werfer (zwei Ebenen)
    { type: 'platform', pos: at(-11.5, 5, 8, Y + 2.4), size: [6, 0.4, 3], style: 'wood', oneWay: true },
    // 6 rechts: Röhre für die Röhren-Feuerblume
    { type: 'pipe', pos: at(7, 6, 11), height: 1.2, radius: 0.8 },
    // 7 links: Wand mit Lauerblöcken und Gegenwand (Gang x −13 … −10,2)
    ...lauerWall(),
    { type: 'wall', pos: at(-9.7, 7, 7), size: [1, 2.5, 14] },
    // Schilder (vor den Gehegen)
    sign(-11.5, 1, 'Hackvögel'), sign(11.5, 1, 'Rollpilze'),
    sign(-11.5, 2, 'Großrollpilz'), sign(11.5, 2, 'Wuschel'),
    sign(-11.5, 3, 'Hüpfmäuse'), sign(11.5, 3, 'Stachel-Hüpfmäuse'),
    sign(-11.5, 4, 'Marschblöcke'), sign(11.5, 4, 'Mini-Pilzlinge'),
    sign(-11.5, 5, 'Feuer-Werfer'), sign(11.5, 5, 'Hammer + Bumerang'),
    sign(-11.5, 6, 'Kanonentürme'), sign(11.5, 6, 'Feuer-Schnappblumen'),
    sign(-11.5, 7, 'Lauerblöcke'), sign(11.5, 7, 'Münzmarder'),
    { type: 'deco', items: [
      { kind: 'rock', pos: [-21, Y, 2], size: 1.2 }, { kind: 'rock', pos: [21, Y, -30], size: 1 },
      { kind: 'rock', pos: [-21, Y, -105], size: 1.4 }, { kind: 'rock', pos: [21, Y, -150], size: 1.1 },
    ] },
  ],
  blocks: [
    // 1 links: Ring aus vier Steinblöcken um den eingeschlossenen Hackvogel (der östliche hat Münzen)
    { kind: 'steinblock', pos: at(-6, 1, 6), content: 'coins:3' },
    { kind: 'steinblock', pos: at(-8, 1, 6) },
    { kind: 'steinblock', pos: at(-7, 1, 5) },
    { kind: 'steinblock', pos: at(-7, 1, 7) },
  ],
  enemies: [
    // 1 links: Hackvögel
    { kind: 'hackvogel', id: 'hv_stand', pos: at(-12, 1, 4.5), dir: [0, 1], sight: 0 },
    { kind: 'hackvogel', id: 'hv_patrol', pos: at(-14, 1, 11), path: [at(-17, 1, 11), at(-9, 1, 11)], sight: 0, period: 3.2, phase: 0.5 },
    { kind: 'hackvogel', id: 'hv_ring', pos: at(-7, 1, 6), dir: [1, 0], sight: 4, period: 1.6 },
    // 1 rechts: Rollpilze und Zielscheiben (stehende Pilzlinge)
    { kind: 'rollpilz', id: 'rp1', pos: at(9, 1, 4), path: [at(6, 1, 4), at(13, 1, 4)] },
    { kind: 'rollpilz', id: 'rp2', pos: at(8, 1, 10), dir: [1, 0], speed: 1.2 },
    { kind: 'pilzling', id: 'ziel1', pos: at(16.5, 1, 7), speed: 0 },
    { kind: 'pilzling', id: 'ziel2', pos: at(16.5, 1, 11), speed: 0 },
    // 2 links: Großrollpilz auf der Felsinsel
    { kind: 'grossrollpilz', id: 'grp', pos: at(-11.5, 2, 7, Y + 1.2), dir: [1, 0] },
    // 2 rechts: Wuschel (Pendel, Schleife mit 2, Kreis mit 3)
    { kind: 'wuschel', id: 'wu_pendel', path: [at(6, 2, 2.5, Y + 0.1), at(16, 2, 2.5, Y + 0.1)], speed: 3 },
    { kind: 'wuschel', id: 'wu_schleife', path: [at(6, 2, 6, Y + 0.4), at(10, 2, 6, Y + 0.4), at(10, 2, 11, Y + 0.4), at(6, 2, 11, Y + 0.4)], count: 2, spacing: 9 },
    { kind: 'wuschel', id: 'wu_kreis', center: at(14.5, 2, 8.5, Y + 0.3), radius: 2.6, count: 3, spacing: 5.4, speed: 2.2 },
    // 3: Hüpfmäuse
    { kind: 'huepfmaus', id: 'hm1', pos: at(-13, 3, 5), path: [at(-17, 3, 5), at(-7, 3, 5)] },
    { kind: 'huepfmaus', id: 'hm2', pos: at(-10, 3, 10), dir: [1, 0] },
    { kind: 'huepfmaus_stachel', id: 'hs1', pos: at(10, 3, 5), path: [at(6, 3, 5), at(16, 3, 5)] },
    { kind: 'huepfmaus_stachel', id: 'hs2', pos: at(12, 3, 10), dir: [-1, 0] },
    // 4 links: Marschblock-Kolonne (6 Blöcke, Schleife)
    { kind: 'marschblock', id: 'mb', path: [at(-16.5, 4, 3), at(-6.5, 4, 3), at(-6.5, 4, 11), at(-16.5, 4, 11)], count: 6, spacing: 1.3 },
    // 4 rechts: Mini-Pilzlinge
    { kind: 'pilzling', id: 'mini1', mini: true, pos: at(8, 4, 4), path: [at(6, 4, 4), at(16, 4, 4)] },
    { kind: 'pilzling', id: 'mini2', mini: true, pos: at(10, 4, 8), behavior: 'chase', sight: 5 },
    { kind: 'pilzling', id: 'mini3', mini: true, pos: at(15, 4, 11), dir: [-1, 0] },
    { kind: 'pilzling', id: 'pz_gross', pos: at(13, 4, 7.5), speed: 0 },
    // 5: Werfer
    { kind: 'feuer_werfer', id: 'wf_feuer', weapon: 'feuer', pos: at(-11.5, 5, 8), heights: [Y, Y + 2.8], pace: 1.4 },
    { kind: 'feuer_werfer', id: 'wf_hammer', weapon: 'hammer', pos: at(9, 5, 5.5), pace: 1.2 },
    { kind: 'feuer_werfer', id: 'wf_bumerang', weapon: 'bumerang', pos: at(14.5, 5, 10.5), pace: 1.2 },
    // 6 links: Kanonentürme
    { kind: 'kanone_turm', id: 'kt1', pos: at(-17, 6, 4.5), dir: [1, 0], interval: 3, shot: 'projektilkopf', range: 22 },
    { kind: 'kanone_turm', id: 'kt2', pos: at(-11.5, 6, 10.5), dir: [1, 0], sides: 2, interval: 3.5, shot: 'suchkopf', range: 16, seek: 3.5 },
    // 6 rechts: Feuer-Schnappblumen (Topf, Boden, Röhre)
    { kind: 'feuer_schnappblume', id: 'fs_topf', pos: at(10, 6, 4.5), base: 'pot', yaw: -Math.PI / 2 },
    { kind: 'feuer_schnappblume', id: 'fs_boden', pos: at(15, 6, 8), base: 'ground', yaw: Math.PI },
    { kind: 'feuer_schnappblume', id: 'fs_rohr', pos: at(7, 6, 11, Y + 1.2), base: 'pipe', yaw: 0 },
    // 7 links: Lauerblöcke (stoßen nach +X; Gegenwand bei x −10,2)
    { kind: 'lauerblock', id: 'lb1', pos: at(-13, 7, LB[0]), dir: [1, 0], reach: 2.5 },
    { kind: 'lauerblock', id: 'lb2', pos: at(-13, 7, LB[1]), dir: [1, 0], reach: 2.5, mode: 'timed', period: 2.6 },
    { kind: 'lauerblock', id: 'lb3', pos: at(-13, 7, LB[2]), dir: [1, 0], reach: 1.6, hold: 2.5 },
    // 7 rechts: Münzmarder (über den Graben)
    { kind: 'muenzmarder', id: 'marder', path: [at(7, 7, 2.5), at(15.5, 7, 2.5), at(15.5, 7, 12), at(7, 7, 12)], coins: 30 },
  ],
  items: [
    { kind: 'coins', from: [0, Y, -4], to: [0, Y, -20], n: 5 },
  ],
  stars: [[0, Y + 2, -150]],
  goal: [0, Y, -160],
  marks: {
    hack: at(-11.5, 1, 7), roll: at(11.5, 1, 7), lava: at(-11.5, 2, 7, Y + 1.2), wuschel: at(11.5, 2, 7),
    huepf: at(-11.5, 3, 7), stachel: at(11.5, 3, 7), marsch: at(-11.5, 4, 7), mini: at(11.5, 4, 7),
    feuer: at(-11.5, 5, 7), hammer: at(11.5, 5, 7), kanone: at(-11.5, 6, 7), blume: at(11.5, 6, 7),
    lauer: at(-11.6, 7, 7), marder: at(11.5, 7, 7),
  },
};
