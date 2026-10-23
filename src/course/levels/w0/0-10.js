// Gegnerzoo Schnee (0-10): Testlevel für die Gegner von Welt 3 (tests/course_w3_enemies.mjs). Aufbau wie die
// Gegnerzoos 0-1/0-6: Mittelweg (x ≈ 0) nach −Z, links (x −19 … −4) und rechts (x 4 … 19) Gehege mit Schild davor,
// Reihen alle 20 m (Vorderkante z0 = −8 − 20·(r−1)):
//   1 (−8 … −22)      links Schneesäulen (Bahn, Verfolger mit 5 Segmenten, kleine) · rechts Eisläufer auf einer
//                     Eisfläche (Kreis, Slalom, Verfolger, Reit-Eisläufer)
//   2 (−28 … −42)     links **Spukraum** (Mauern 3 m, Tür zum Mittelweg, Licht-Helm vor der Tür): 2 Spuke, 1 Großspuk
//                     · rechts Kreisgeister (Ring mit 8, einzelner auf großem Kreis) und ein Licht-Helm
//   3 (−48 … −62)     links Funkenläufer (um einen Block, Schiene, Kreis) · rechts Funkenkäfer (schwebend, Bahn)
//   4 (−68 … −82)     links Hüpfquallen (auf der Stelle, Verfolger, Bahn) · rechts Riesenkanone (feuert nach −X)
//   5–6 (−86 … −124)  **Wasserbecken** 'becken' über die ganze Breite (Wasser bis 0,8, Boden −1,6; level.setWaterLevel)
//                     mit Holzsteg in der Mitte:
//                     links Reifen-Pilzlinge und Rammfisch-Bahn, rechts Flossling-Schwarm, springende Flosslinge über
//                     dem Steg, Stachelfisch an der Oberfläche und eine **Stachelwand** (x 18) mit drei Lochschützen
//   Ziel bei z −150. Thema 'snow' (bis es das Schneethema gibt: Rückfall), Musik course_snow.
// Hilfe Z(r, dz) = z der Reihe r, dz Meter hinter ihrer Vorderkante (auch in den Tests).

const Y = 1;
export const Z = (r, dz) => -8 - 20 * (r - 1) - dz;
const POOL = { z0: -86, z1: -124, top: 0.8, bottom: -1.6 };
const PZ = (POOL.z0 + POOL.z1) / 2, PL = POOL.z0 - POOL.z1;

function pen(x0, x1, z0, z1, h = 1.2, front = h) {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z0 - z1;
  return [
    { type: 'wall', pos: [cx, Y, z0], size: [w + 0.5, front, 0.5], camIgnore: true },
    { type: 'wall', pos: [cx, Y, z1], size: [w + 0.5, h, 0.5], camIgnore: true },
    { type: 'wall', pos: [x0, Y, cz], size: [0.5, h, d], camIgnore: true },
    { type: 'wall', pos: [x1, Y, cz], size: [0.5, h, d], camIgnore: true },
  ];
}
const L = (r, h) => pen(-19, -4, Z(r, 0), Z(r, 14), h);
const R = (r, h) => pen(4, 19, Z(r, 0), Z(r, 14), h);
const sign = (x, r, text) => ({ type: 'sign', pos: [x, Y, Z(r, -0.8)], text, size: [2.6, 0.8] });
const at = (x, r, dz, y = Y) => [x, y, Z(r, dz)];

/** Spukraum (Reihe 2 links): Mauern 3 m, vorn niedrig (Kamera), Tür in der Mittelweg-Mauer (dz 5 … 8). */
function spukraum() {
  const z0 = Z(2, 0), z1 = Z(2, 14), x0 = -19, x1 = -4, h = 3;
  const cz = (z0 + z1) / 2;
  return [
    { type: 'wall', pos: [(x0 + x1) / 2, Y, z0], size: [x1 - x0 + 0.5, 1.2, 0.5], camIgnore: true },
    { type: 'wall', pos: [(x0 + x1) / 2, Y, z1], size: [x1 - x0 + 0.5, h, 0.5], camIgnore: true },
    { type: 'wall', pos: [x0, Y, cz], size: [0.5, h, 14], camIgnore: true },
    { type: 'wall', pos: [x1, Y, Z(2, 2.5)], size: [0.5, h, 5], camIgnore: true },
    { type: 'wall', pos: [x1, Y, Z(2, 11.5)], size: [0.5, h, 5], camIgnore: true },
  ];
}

export const LEVEL = {
  id: '0-10',
  world: 0,
  title: 'Gegnerzoo Schnee',
  archetype: 'parcours',
  theme: 'snow',
  music: 'course_snow',
  timeLimit: 999,
  start: { pos: [0, Y, 6], yaw: Math.PI / 2 },
  camera: [{ from: 14, to: -170, pitch: 45, dist: 13, yaw: 0 }],
  segments: [
    // Boden: vor und hinter dem Becken; Becken mit Boden und Rand
    { type: 'island', pos: [0, POOL.bottom - 1, (15 + POOL.z0) / 2], size: [42, Y - POOL.bottom + 1, 15 - POOL.z0], top: 'grass' },
    { type: 'island', pos: [0, POOL.bottom - 1, (POOL.z1 - 165) / 2], size: [42, Y - POOL.bottom + 1, POOL.z1 + 165], top: 'grass' },
    { type: 'island', pos: [0, POOL.bottom - 1, PZ], size: [42, 1, PL], top: 'sand', under: 0 },
    { type: 'wall', pos: [-20.75, POOL.bottom, PZ], size: [0.5, Y - POOL.bottom + 0.4, PL], style: 'stone' },
    { type: 'wall', pos: [20.75, POOL.bottom, PZ], size: [0.5, Y - POOL.bottom + 0.4, PL], style: 'stone' },
    { type: 'water', id: 'becken', pos: [0, POOL.bottom, PZ], size: [41, POOL.top - POOL.bottom, PL] },
    { type: 'platform', pos: [0, 0.55, PZ], size: [2.4, 0.45, PL + 0.4], style: 'wood' },
    { type: 'killplane', y: -16 },
    ...L(1), ...R(1), ...spukraum(), ...R(2), ...L(3), ...R(3), ...L(4), ...R(4),
    // 1 rechts: Eisfläche (rutschig)
    { type: 'platform', pos: at(11.5, 1, 7), size: [14.4, 0.12, 13.4], style: 'block', color: 0xbfe6ff, ice: true },
    // 3 links: Block, um den die Funkenläufer sausen
    { type: 'platform', pos: at(-14, 3, 7), size: [3, 1.2, 3], style: 'block', color: 0x6a7ad8 },
    // 6 rechts: Stachelwand im Becken (Lochschützen schießen nach −X)
    { type: 'wall', pos: [18.5, POOL.bottom, Z(6, 7)], size: [1, Y - POOL.bottom + 1.8, 12], style: 'stone' },
    sign(-11.5, 1, 'Schneesäulen'), sign(11.5, 1, 'Eisläufer'),
    sign(-11.5, 2, 'Spukraum'), sign(11.5, 2, 'Kreisgeister'),
    sign(-11.5, 3, 'Funkenläufer'), sign(11.5, 3, 'Funkenkäfer'),
    sign(-11.5, 4, 'Hüpfquallen'), sign(11.5, 4, 'Riesenkanone'),
    { type: 'sign', pos: [-4, Y, POOL.z0 + 1.2], text: 'Wasserbecken', size: [2.6, 0.8] },
    { type: 'deco', items: [
      { kind: 'tree', pos: [-22.5, Y, 2], size: 4 }, { kind: 'tree', pos: [22.5, Y, -30], size: 4.5 },
      { kind: 'rock', pos: [-22.5, Y, -60], size: 1.1 }, { kind: 'tree', pos: [22.5, Y, -140], size: 4 },
    ] },
  ],
  enemies: [
    // 1 links: Schneesäulen
    { kind: 'schneesaeule', id: 'ss_bahn', pos: at(-15, 1, 4), path: [at(-17, 1, 4), at(-7, 1, 4)], segments: 4 },
    { kind: 'schneesaeule', id: 'ss_jagd', pos: at(-9, 1, 10), segments: 5, behavior: 'chase', sight: 6 },
    { kind: 'schneesaeule', id: 'ss_klein', pos: at(-16, 1, 11), segments: 3, dir: [1, 0], speed: 0.6 },
    // 1 rechts: Eisläufer (Kreis, Slalom, Verfolger, Reit-Eisläufer)
    { kind: 'pilzling_eis', id: 'eis_kreis', pos: at(16, 1, 7, Y + 0.12), center: at(11.5, 1, 7, Y + 0.12), radius: 4.6 },
    { kind: 'pilzling_eis', id: 'eis_slalom', pos: at(8, 1, 3, Y + 0.12), dir: [1, 0], slalom: 0.9, speed: 3.6 },
    { kind: 'pilzling_eis', id: 'eis_jagd', pos: at(15, 1, 12, Y + 0.12), behavior: 'chase', sight: 6, speed: 3.4 },
    { kind: 'pilzling_eis', id: 'eis_reit', pos: at(11.5, 1, 9.5, Y + 0.12), center: at(11.5, 1, 7, Y + 0.12), radius: 2.5, ride: true, speed: 2.6 },
    // 2 links: Spukraum
    { kind: 'spuk', id: 'spuk1', pos: at(-15, 2, 4, Y + 0.4) },
    { kind: 'spuk', id: 'spuk2', pos: at(-9, 2, 11, Y + 0.4) },
    { kind: 'spuk', id: 'grossspuk', pos: at(-15.5, 2, 10.5, Y), size: 2.5 },
    // 2 rechts: Kreisgeister
    { kind: 'kreisgeist_kreis', id: 'ring', pos: at(11.5, 2, 7, Y + 0.25), count: 8, radius: 3.2, speed: 1.4 },
    { kind: 'kreisgeist', id: 'kg_gross', center: at(11.5, 2, 7, Y + 0.25), radius: 5.6, speed: 1.6, cw: true },
    // 3 links: Funkenläufer
    { kind: 'funkenlaeufer', id: 'fl_block', block: { pos: at(-14, 3, 7), size: [3, 1.2, 3] }, speed: 2.6 },
    { kind: 'funkenlaeufer', id: 'fl_schiene', path: [at(-8, 3, 2.5), at(-8, 3, 12)], speed: 3.2 },
    { kind: 'funkenlaeufer', id: 'fl_kreis', center: at(-14, 3, 7), radius: 3.6, speed: 2.4, count: 2, spacing: 11 },
    // 3 rechts: Funkenkäfer
    { kind: 'funkenkaefer', id: 'fk1', pos: at(9, 3, 6, Y + 3) },
    { kind: 'funkenkaefer', id: 'fk2', path: [at(13, 3, 4, Y + 3.2), at(17, 3, 4, Y + 3.2), at(17, 3, 11, Y + 3.2), at(13, 3, 11, Y + 3.2)] },
    // 4 links: Hüpfquallen
    { kind: 'huepfqualle', id: 'hq_stelle', pos: at(-14, 4, 4) },
    { kind: 'huepfqualle', id: 'hq_jagd', pos: at(-9, 4, 10), behavior: 'chase', period: 1.0 },
    { kind: 'huepfqualle', id: 'hq_bahn', pos: at(-16, 4, 11), path: [at(-17, 4, 11), at(-11, 4, 11)], phase: 0.5 },
    // 4 rechts: Riesenkanone (schießt quer durchs Gehege, die Gegenmauer bei x 4 fängt die Projektile)
    { kind: 'riesenkanone', id: 'rk', pos: at(17.5, 4, 7), dir: [-1, 0], height: 1.6, interval: 6, first: 1, range: 20, speed: 3.2 },
    // 5 links: Reifen-Pilzlinge
    { kind: 'pilzling_reifen', id: 'rf1', pos: [-8, POOL.top, Z(5, 4)] },
    { kind: 'pilzling_reifen', id: 'rf2', pos: [-14, POOL.top, Z(5, 9)], path: [[-17, POOL.top, Z(5, 9)], [-11, POOL.top, Z(5, 9)]] },
    // 5 rechts: Flossling-Schwarm und springende Flosslinge über dem Steg
    { kind: 'flossling', id: 'fs_schwarm', path: [[6, -0.9, Z(5, 3)], [16, -0.9, Z(5, 3)], [16, -0.9, Z(5, 8)], [6, -0.9, Z(5, 8)]], count: 4, spacing: 1.3, color: 'koralle' },
    { kind: 'flossling', id: 'fs_spring', mode: 'jump', pos: [-2.2, 0, Z(5, 12)], dir: [1, 0], dist: 4.4, height: 2.4, every: 2.2, color: 'gold' },
    // 6 links: Rammfisch-Bahn
    { kind: 'rammfisch', id: 'ramm', pos: [-15, -1.1, Z(6, 8)], path: [[-17, -1.1, Z(6, 8)], [-6, -1.1, Z(6, 8)]], sight: 8 },
    // 6 rechts: Stachelfisch (Oberfläche) und Stachelwand (Lochschützen)
    { kind: 'stachelfisch', id: 'st_jagd', pos: [9, 0, Z(6, 4)], sight: 7, speed: 2 },
    { kind: 'stachelfisch', id: 'st_w1', mode: 'wall', pos: [17.95, 0.2, Z(6, 3)], dir: [-1, 0], period: 2.4, phase: 0 },
    { kind: 'stachelfisch', id: 'st_w2', mode: 'wall', pos: [17.95, 1.6, Z(6, 7)], dir: [-1, 0], period: 2.4, phase: 0.33 },
    { kind: 'stachelfisch', id: 'st_w3', mode: 'wall', pos: [17.95, 0.2, Z(6, 11)], dir: [-1, 0], period: 2.4, phase: 0.66 },
  ],
  items: [
    { kind: 'helm_licht', id: 'licht_spuk', pos: [-2.5, Y, Z(2, 6.5)], respawn: 2 },
    { kind: 'helm_licht', id: 'licht_kreis', pos: [5.5, Y, Z(2, 1.5)], respawn: 2 },
    { kind: 'coins', from: [0, Y, -4], to: [0, Y, -20], n: 5 },
  ],
  stars: [[0, Y + 2, -146]],
  goal: [0, Y, -156],
  marks: {
    saeule: at(-11.5, 1, 7), eis: at(11.5, 1, 7, Y + 0.12), spuk: at(-11.5, 2, 7), kreis: at(11.5, 2, 7),
    funken: at(-11.5, 3, 7), kaefer: at(11.5, 3, 7), qualle: at(-11.5, 4, 7), kanone: at(11.5, 4, 7),
    becken: [0, Y, PZ], reifen: [-11, POOL.top, Z(5, 6)], ramm: [-11, POOL.top, Z(6, 8)], wand: [14, POOL.top, Z(6, 7)],
  },
};
