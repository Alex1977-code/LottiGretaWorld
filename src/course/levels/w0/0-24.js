// Wolken-Gegnerzoo (0-24): Testlevel für die Gegner der Welt 6 „Wolkeninseln“ (tests/course_w6_enemies.mjs). Aufbau wie die
// Gegnerwerkstätten 0-18/0-21: Mittelweg (x ≈ 0) nach −Z, links (x −19 … −4) und rechts (x 4 … 19) Gehege mit Schild davor,
// Reihen alle 20 m (Vorderkante z0 = −8 − 20·(r−1)):
//   1 (−8 … −22)      links Schubser auf einem Steinpodest im Lavasee · rechts Schubser-Streife auf einem Podest im Wasser
//   2 (−28 … −42)     links Pustewolke mit fester Blasrichtung (+X) · rechts sich drehende Pustewolke und eine zum Besiegen
//   3 (−48 … −62)     links Eissee mit drei Löchern (Glotzfisch reihum) · rechts Wasserbecken mit Steg (zielender und
//                     pendelnder Glotzfisch)
//   4 (−68 … −82)     links Stachelwerfer (Kugeln prallen an der Gehegewand ab) · rechts Stachelwerfer oben an einer Rampe
//   5 (−88 … −102)    Werfer-Brüder wie 6-B: links Hammer- und Bumerang-Werfer · rechts Feuer-, Hammer-, Bumerang-Werfer
//   6 (−108 … −122)   links senkrechter Schacht mit Wolkenstufen und Wuschel-Horde von unten · rechts waagerechte Horde
//   7 (−128 … −142)   Pilz-Maske: links Pilzling-Verfolger, Krallen-Pilzling, Spuk · rechts Schubser, Stachelwerfer,
//                     Pustewolke, Hackbeil-Pilz (alle „sehenden“ Gegner)
//   8 (−148 … −162)   Bestand für die Welt-6-Liste: Wuschel, Kreisgeist, Rankenschnapper, Brummer, Projektilkopf-Kanone,
//                     Zündkopf, Marschblock · Rollpilz, Pilzling, Schnappblume, Feuer-Schnappblume, Walzenwerfer,
//                     Stampfstein, Gelee-Brocken, Spuk
//   Ziel bei z −172. Hilfe Z(r, dz) = z der Reihe r, dz Meter hinter ihrer Vorderkante (auch in den Tests).

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

// Reihe 1: Podeste (Oberseite 2,5) im Lavasee bzw. im Wasser
const POD = 2.5;
// Reihe 3: Eissee (Wasser 1 … 2, Eisschollen 1,8 … 2,1) mit drei Löchern 2 × 2 m bei z = Z(3, 7)
const ICE = 2.1, LAKE = 2.0, HZ = Z(3, 7), HOLES = [-16, -11.5, -7];
const ice = (x0, x1, z0, z1) => ({ type: 'platform', pos: [(x0 + x1) / 2, ICE - 0.3, (z0 + z1) / 2], size: [x1 - x0, 0.3, Math.abs(z1 - z0)], color: '#d6f2ff', ice: true });
// Reihe 6 links: Wolkenstufen im Schacht
const STEPS = [[-15, 3.2, 3], [-10, 5.6, 6], [-15, 8.0, 9], [-10, 10.4, 11]];

export const LEVEL = {
  id: '0-24',
  world: 0,
  title: 'Wolken-Gegnerzoo',
  archetype: 'parcours',
  theme: 'clearpipe',
  music: 'course_grass',
  timeLimit: 999,
  start: { pos: [0, Y, 6], yaw: Math.PI / 2 },
  camera: [{ from: 14, to: -180, pitch: 45, dist: 13, yaw: 0 }],
  segments: [
    { type: 'island', pos: [0, -1, -83], size: [42, Y + 1, 186] },
    { type: 'killplane', y: -16 },
    ...L(1), ...R(1), ...L(2), ...R(2), ...L(3), ...R(3), ...L(4), ...R(4), ...L(5), ...R(5), ...L(6), ...R(6), ...L(7), ...R(7), ...L(8), ...R(8),
    // 1 links: Lavasee mit Steinpodest · rechts: Wasser mit Steinpodest
    { type: 'lava', pos: [-11.5, Y, Z(1, 7)], size: [14.4, 0.3, 13.4] },
    { type: 'platform', id: 'podest_lava', pos: [-11.5, Y, Z(1, 7)], size: [7, POD - Y, 7], style: 'stone' },
    { type: 'water', pos: [11.5, Y, Z(1, 7)], size: [14.4, 1.2, 13.4] },
    { type: 'platform', id: 'podest_wasser', pos: [11.5, Y, Z(1, 7)], size: [7, POD - Y, 7], style: 'stone' },
    // 3 links: Eissee mit Löchern · rechts: Wasserbecken mit Holzsteg
    { type: 'water', pos: [-11.5, Y, Z(3, 7)], size: [14.4, LAKE - Y, 13.4] },
    ice(-19, -4, Z(3, 0.3), HZ + 1),
    ice(-19, -4, HZ - 1, Z(3, 13.7)),
    ice(-19, -17, HZ + 1, HZ - 1), ice(-15, -12.5, HZ + 1, HZ - 1), ice(-10.5, -8, HZ + 1, HZ - 1), ice(-6, -4, HZ + 1, HZ - 1),
    { type: 'water', pos: [11.5, Y, Z(3, 7)], size: [14.4, 1.2, 13.4] },
    { type: 'platform', id: 'steg', pos: [10, 2.2, Z(3, 7)], size: [11.5, 0.35, 1.6], style: 'wood' },
    // 4 rechts: Rampe zum Werferpodest (steigt nach +X)
    { type: 'ramp', pos: [11.5, Y, Z(4, 7)], size: [6, 2, 6], axis: 'x', dir: 1, top: 'stone' },
    { type: 'platform', id: 'werferpodest', pos: [16.6, Y, Z(4, 7)], size: [4.2, 2, 6], style: 'stone' },
    // 5: Einweg-Plattformen für die Werfer (zwei Ebenen)
    { type: 'platform', pos: [-11.5, 3.6, Z(5, 9)], size: [5, 0.6, 2], oneWay: true, style: 'wood' },
    { type: 'platform', pos: [11.5, 3.6, Z(5, 9)], size: [5, 0.6, 2], oneWay: true, style: 'wood' },
    // 6 links: Wolkenstufen im Schacht
    ...STEPS.map(([x, y, dz]) => ({ type: 'platform', pos: [x, y, Z(6, dz)], size: [3, 0.6, 3], style: 'cloud' })),
    sign(-11.5, 1, 'Schubser\nLavasee'), sign(11.5, 1, 'Schubser\nWasser'),
    sign(-11.5, 2, 'Pustewolke\nfest'), sign(11.5, 2, 'Pustewolke\ndreht sich'),
    sign(-11.5, 3, 'Glotzfisch\nEissee'), sign(11.5, 3, 'Glotzfisch\nBecken'),
    sign(-11.5, 4, 'Stachelwerfer'), sign(11.5, 4, 'Stachelwerfer\nRampe'),
    sign(-11.5, 5, 'Hammer- und\nBumerang-Werfer'), sign(11.5, 5, 'Werfer-Brüder'),
    sign(-11.5, 6, 'Wuschel-Horde\nSchacht'), sign(11.5, 6, 'Wuschel-Horde'),
    sign(-11.5, 7, 'Pilz-Maske'), sign(11.5, 7, 'Pilz-Maske'),
    sign(-11.5, 8, 'Bestand 1'), sign(11.5, 8, 'Bestand 2'),
  ],
  enemies: [
    // ---- 1 Schubser
    { kind: 'schubser', id: 'sb_lava', pos: [-11.5, POD, Z(1, 5.5)], dir: [0, 1], behavior: 'guard', sight: 6 },
    { kind: 'schubser', id: 'sb_wasser', pos: [10, POD, Z(1, 7)], behavior: 'patrol', path: [[9, POD, Z(1, 7)], [14, POD, Z(1, 7)]], sight: 5 },
    // ---- 2 Pustewolken
    { kind: 'pustewolke', id: 'pw_fest', pos: at(-16, 2, 5, Y + 1.2), dir: [1, 0], reach: 6, phase: 0 },
    { kind: 'pustewolke', id: 'pw_dreh', pos: at(11.5, 2, 5, Y + 1.4), sight: 9 },
    { kind: 'pustewolke', id: 'pw_ziel', pos: at(15.5, 2, 11, Y + 1.2), dir: [-1, 0], phase: 2.5 },
    // ---- 3 Glotzfische
    { kind: 'glotzfisch', id: 'gf_eis', holes: HOLES.map((x) => [x, LAKE, HZ]), height: 2.6, every: 2.4, phase: 0.1 },
    { kind: 'glotzfisch', id: 'gf_ziel', holes: [at(7.5, 3, 4, 2.2), at(7.5, 3, 10.5, 2.2), at(13.5, 3, 4, 2.2), at(13.5, 3, 10.5, 2.2)], aim: true, sight: 7, color: 'gelb', every: 2.6 },
    { kind: 'glotzfisch', id: 'gf_pendel', pos: at(17, 3, 3, 2.2), dir: [0, -1], dist: 8, height: 2.0, color: 'rosa', phase: 0.5 },
    // ---- 4 Stachelwerfer
    { kind: 'stachelwerfer', id: 'sw_wand', pos: at(-17, 4, 4), dir: [1, 0], sight: 11, interval: 2.4 },
    { kind: 'stachelwerfer', id: 'sw_hang', pos: [17.2, 3, Z(4, 7)], dir: [-1, 0], aim: 'dir', sight: 14, interval: 2.6, range: 5 },
    // ---- 5 Werfer-Brüder (6-B)
    { kind: 'hammer_werfer', id: 'wf_hammer', pos: at(-14, 5, 7), heights: [1, 4.2] },
    { kind: 'bumerang_werfer', id: 'wf_bumerang', pos: at(-9, 5, 7) },
    { kind: 'feuer_werfer', id: 'wf_feuer', pos: at(8, 5, 7) },
    { kind: 'hammer_werfer', id: 'wf_hammer2', pos: at(11.5, 5, 9), heights: [1, 4.2] },
    { kind: 'bumerang_werfer', id: 'wf_bumerang2', pos: at(15, 5, 7) },
    // ---- 6 Wuschel-Horden (Jagd beginnt beim Betreten des Geheges)
    { kind: 'wuschel_horde', id: 'horde_y', pos: [-11.5, -0.5, Z(6, 7)], axis: 'y', size: [14, 13], speed: 1.2, end: 13,
      trigger: { min: [-19, 0, Z(6, 14)], max: [-4, 20, Z(6, 0)] } },
    { kind: 'wuschel_horde', id: 'horde_z', pos: [11.5, Y, Z(6, -2)], axis: '-z', size: [14, 3], speed: 2, end: Z(6, 13),
      trigger: { min: [4, 0, Z(6, 14)], max: [19, 6, Z(6, 0)] }, count: 40 },
    // ---- 7 Pilz-Maske: sehende Gegner
    { kind: 'pilzling', id: 'pm_pilz', pos: at(-14, 7, 7), behavior: 'chase', sight: 7, speed: 0.001 },
    { kind: 'krallen_pilzling', id: 'pm_krall', pos: at(-9, 7, 7), dir: [0, 1], speed: 0.001 },
    { kind: 'spuk', id: 'pm_spuk', pos: at(-11.5, 7, 11.5, Y + 0.4), sight: 9 },
    { kind: 'schubser', id: 'pm_schubser', pos: at(8, 7, 5), dir: [0, 1], behavior: 'guard', sight: 6 },
    { kind: 'stachelwerfer', id: 'pm_stachel', pos: at(15, 7, 5), dir: [0, 1], sight: 9 },
    { kind: 'pustewolke', id: 'pm_wolke', pos: at(11.5, 7, 11, Y + 1.3), sight: 8 },
    { kind: 'hackbeil_pilz', id: 'pm_hack', pos: at(16, 7, 11), dir: [-1, 0], sight: 6 },
    // ---- 8 Bestand der Welt-6-Liste
    { kind: 'wuschel', id: 'b_wuschel', center: at(-16, 8, 3, Y + 0.3), radius: 1.6, speed: 2 },
    { kind: 'kreisgeist', id: 'b_kreisgeist', center: at(-11, 8, 3, Y + 0.25), radius: 1.5 },
    { kind: 'rankenschnapper', id: 'b_ranke', pos: at(-7, 8, 2.5), dir: [-1, 0], length: 2.5, mode: 'static' },
    { kind: 'brummer', id: 'b_brummer', center: at(-16, 8, 9, Y + 2.4), radius: 1.4 },
    { kind: 'kanone_turm', id: 'b_kanone', pos: at(-18, 8, 13), dir: [1, 0], interval: 3.5, range: 18 },
    { kind: 'zuendkopf', id: 'b_zuend', pos: at(-11.5, 8, 9), behavior: 'walk', dir: [1, 0], trigger: 0 },
    { kind: 'marschblock', id: 'b_marsch', path: [at(-9, 8, 7.5), at(-5.5, 8, 7.5), at(-5.5, 8, 12.5), at(-9, 8, 12.5)], count: 3 },
    { kind: 'rollpilz', id: 'b_rollpilz', pos: at(6, 8, 3), path: [at(5, 8, 3), at(9, 8, 3)] },
    { kind: 'pilzling', id: 'b_pilzling', pos: at(12, 8, 3), path: [at(11, 8, 3), at(14, 8, 3)] },
    { kind: 'schnappblume', id: 'b_schnapp', pos: at(17, 8, 3), yaw: Math.PI / 2 },
    { kind: 'feuer_schnappblume', id: 'b_feuerblume', pos: at(17, 8, 8), yaw: Math.PI },
    { kind: 'walzenwerfer', id: 'b_walze', pos: at(6, 8, 12.5), dir: [1, 0], aim: 'dir', interval: 3 },
    { kind: 'stampfstein', id: 'b_stampf', pos: at(12, 8, 8, Y + 3.5) },
    { kind: 'gelee_brocken', id: 'b_gelee', pos: at(9, 8, 8), behavior: 'chase', color: 'blau' },
    { kind: 'spuk', id: 'b_spuk', pos: at(16, 8, 12.5, Y + 0.4) },
  ],
  items: [
    // 7: Pilz-Maske (Baustein der Welt 6) auf dem Mittelweg
    { kind: 'pilz_maske', id: 'maske', pos: [0, Y, Z(7, 1)] },
  ],
  goal: [0, Y, -172],
  marks: { lava: [-11.5, POD, Z(1, 7)], wasser: [11.5, POD, Z(1, 7)], eis: [-11.5, ICE, HZ], steg: [10, 2.55, Z(3, 7)] },
};
