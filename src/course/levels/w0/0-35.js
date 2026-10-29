// Bonus-Gegnerzoo (0-35): Testlevel für die Gegner der Bonuswelten Stern, Pilz, Blume, Krone (tests/course_bonus_enemies.mjs).
// Aufbau wie die Gegnerzoos 0-24/0-32: Mittelweg (x ≈ 0) nach −Z, links (x −19 … −4) und rechts (x 4 … 19) Gehege mit Schild
// davor, Reihen alle 20 m (Vorderkante z0 = −8 − 20·(r−1)):
//   1   Krakenpilz: links hüpft und spuckt Steinchen · rechts auf einem gleitenden Block (mover) und auf einem Sockel
//   2   Krakenpilz: links patrouilliert/jagt · rechts Stachelkugler oben an einer Rampe (rollt hinab, pendelt im Gehege)
//   3   Stachelkugler: links Pendel · rechts Bahn (Runde)
//   4   Tintling: links Becken mit zwei Tintlingen · rechts Becken mit Strömung
//   5   Riesenhase (B-5): links Riesenhase mit Stern und Items · rechts kleiner und großer Hase (unverändert)
//   6   links Laufbomben (Kickbombe look 'laufbombe') vor einer lila Ziegelwand · rechts Pilzlingsturm aus 30 Pilzlingen (P-4)
//   7   links Pilzlingsturm mit Feuer-Werfer obenauf (B-9) · rechts Topfpflanze und Wuschel (K-1 „frisst Wuschel“)
//   8–12 Kampfräume (P-Haus, je Gehege ein 'kampfraum' → Signal 'kampfraumFrei'): 8 Rammbock-Bullen | Schneesäulen,
//        9 Flieger (Flatterkäfer, Brummer) | Bumerang-Werfer, 10 Münzmarder | Pilzlingstürme, 11 Funkenflämmchen | Zauberkröten,
//        12 Rankenschnapper | Hammer-Werfer
//   13  Bestand geprüft: links Glotzfisch (Becken mit Löchern) und Kreisgeist-Ring · rechts Großrollpilz, Hackbeil-Pilz, Wuschel
//   Ziel bei z −272. Hilfe Z(r, dz) = z der Reihe r, dz Meter hinter ihrer Vorderkante (auch in den Tests).
// Thema 'space' (Bonuswelt-Stimmung), Musik course_galaxy (Rückfall des Musiksystems, falls es das Thema noch nicht gibt).

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
/** Boden in Streifen (x0 … x1) von z 14 bis −282, ausgespart: holes [[zOben, zUnten], …] (Becken). */
function strips(x0, x1, holes) {
  const out = [];
  let z = 14;
  for (const [a, b] of holes) {
    if (z > a) out.push({ type: 'island', pos: [(x0 + x1) / 2, -1, (z + a) / 2], size: [x1 - x0, Y + 1, z - a], top: 'grass', under: 1.5 });
    z = b;
  }
  if (z > -282) out.push({ type: 'island', pos: [(x0 + x1) / 2, -1, (z - 282) / 2], size: [x1 - x0, Y + 1, z + 282], top: 'grass', under: 1.5 });
  return out;
}
/** Kampfraum über einem Gehege (links x < 0, rechts x > 0). */
const raum = (id, side, r) => ({ kind: 'kampfraum', id, area: { min: [side < 0 ? -19 : 4, Y - 1, Z(r, 14)], max: [side < 0 ? -4 : 19, Y + 8, Z(r, 0)] } });

export const MARKS = { Y };

export const LEVEL = {
  id: '0-35',
  world: 0,
  title: 'Bonus-Gegnerzoo',
  archetype: 'parcours',
  theme: 'space',
  music: 'course_galaxy',
  timeLimit: 999,
  start: { pos: [0, Y, 6], yaw: Math.PI / 2 },
  camera: [{ from: 14, to: -290, pitch: 45, dist: 13, yaw: 0 }],
  segments: [
    ...strips(-4, 4, []), ...strips(-21, -4, [[Z(4, 0), Z(4, 14)], [Z(13, 0), Z(13, 14)]]), ...strips(4, 21, [[Z(4, 0), Z(4, 14)]]),
    { type: 'killplane', y: -16 },
    ...L(1), ...R(1), ...L(2), ...R(2), ...L(3), ...R(3), ...L(4, 0.6), ...R(4, 0.6), ...L(5, 1.6), ...R(5), ...L(6), ...R(6), ...L(7), ...R(7),
    ...L(8), ...R(8), ...L(9), ...R(9), ...L(10), ...R(10), ...L(11), ...R(11), ...L(12), ...R(12), ...L(13, 0.6), ...R(13),
    // 1 rechts: gleitender Block (MovingBox) mit Krakenpilz, Sockel daneben
    { type: 'mover', id: 'gleiter', path: [[7.5, Y + 0.6, Z(1, 9)], [15.5, Y + 0.6, Z(1, 9)]], size: [2.4, 0.5, 2.4], speed: 1.6, wait: 0.4, color: 'purple' },
    { type: 'platform', pos: [11.5, Y, Z(1, 3.5)], size: [2.2, 1.2, 2.2], style: 'block', color: 'blue' },
    // 2 rechts: Rampe (steigt nach −Z) – der Stachelkugler rollt hinab ins Gehege
    { type: 'ramp', pos: [11.5, Y, Z(2, 9)], size: [6, 3, 9], axis: 'z', dir: -1, top: 'stone' },
    { type: 'platform', pos: [11.5, Y, Z(2, 12.6)], size: [6, 3, 1.8], style: 'stone' },
    // 4: Wasserbecken (Boden 3 m unter Y), rechts mit Strömung
    { type: 'water', pos: [-12.5, Y - 3, Z(4, 7)], size: [17, 2.8, 14] },
    { type: 'water', pos: [12.5, Y - 3, Z(4, 7)], size: [17, 2.8, 14], current: [1.2, 0, 0] },
    { type: 'island', pos: [-12.5, Y - 4, Z(4, 7)], size: [17, 1, 14], top: 'sand', under: 0 },
    { type: 'island', pos: [12.5, Y - 4, Z(4, 7)], size: [17, 1, 14], top: 'sand', under: 0 },
    // 6 links: lila Ziegelwand (Laufbomben sprengen sie)
    // 13 links: Becken mit Löchern für den Glotzfisch
    { type: 'water', pos: [-12.5, Y - 2, Z(13, 7)], size: [17, 1.8, 14] },
    { type: 'island', pos: [-12.5, Y - 3, Z(13, 7)], size: [17, 1, 14], top: 'sand', under: 0 },
    sign(-11.5, 1, 'Krakenpilz\nspuckt'), sign(11.5, 1, 'Krakenpilz\ngleitender Block'),
    sign(-11.5, 2, 'Krakenpilz\npatrouilliert'), sign(11.5, 2, 'Stachelkugler\nHang'),
    sign(-11.5, 3, 'Stachelkugler\nPendel'), sign(11.5, 3, 'Stachelkugler\nBahn'),
    sign(-11.5, 4, 'Tintlinge'), sign(11.5, 4, 'Tintling\nStrömung'),
    sign(-11.5, 5, 'Riesenhase'), sign(11.5, 5, 'Hasen'),
    sign(-11.5, 6, 'Laufbomben'), sign(11.5, 6, 'Pilzlingsturm 30'),
    sign(-11.5, 7, 'Turm mit\nFeuer-Werfer'), sign(11.5, 7, 'Topfpflanze\nfrisst Wuschel'),
    sign(-11.5, 8, 'Kampfraum\nRammbock-Bullen'), sign(11.5, 8, 'Kampfraum\nSchneesäulen'),
    sign(-11.5, 9, 'Kampfraum\nFlieger'), sign(11.5, 9, 'Kampfraum\nBumerang-Werfer'),
    sign(-11.5, 10, 'Kampfraum\nMünzmarder'), sign(11.5, 10, 'Kampfraum\nPilzlingstürme'),
    sign(-11.5, 11, 'Kampfraum\nFunkenflämmchen'), sign(11.5, 11, 'Kampfraum\nZauberkröten'),
    sign(-11.5, 12, 'Kampfraum\nRankenschnapper'), sign(11.5, 12, 'Kampfraum\nHammer-Werfer'),
    sign(-11.5, 13, 'Glotzfisch\nKreisgeister'), sign(11.5, 13, 'Bestand'),
  ],
  enemies: [
    // ---- 1 Krakenpilz
    { kind: 'krakenpilz', id: 'kp1', pos: at(-14, 1, 8), sight: 12, dir: [0, 1] },
    { kind: 'krakenpilz', id: 'kp2', pos: at(-9, 1, 10), sight: 12, first: 1.6, dir: [0, 1] },
    { kind: 'krakenpilz', id: 'kp_gleit', pos: at(7.5, 1, 9, Y + 1.15), sight: 12, dir: [0, 1] },
    { kind: 'krakenpilz', id: 'kp_sockel', pos: at(11.5, 1, 3.5, Y + 1.25), sight: 12, spit: false, dir: [0, 1] },
    // ---- 2
    { kind: 'krakenpilz', id: 'kp_patrol', pos: at(-15, 2, 4), path: [at(-16, 2, 4), at(-7, 2, 4)], spit: false },
    { kind: 'krakenpilz', id: 'kp_chase', pos: at(-11.5, 2, 11), behavior: 'chase', sight: 9, spit: false },
    { kind: 'stachelkugler', id: 'sk_hang', pos: at(11.5, 2, 12.4, Y + 3), dir: [0, 1], wake: 40 },
    // ---- 3
    { kind: 'stachelkugler', id: 'sk_pendel', pos: at(-11.5, 3, 7), mode: 'pendel', dir: [1, 0], dist: 4, wake: 40 },
    { kind: 'stachelkugler', id: 'sk_bahn', pos: at(7, 3, 3), path: [at(7, 3, 3), at(16, 3, 3), at(16, 3, 11), at(7, 3, 11)], loop: true, wake: 40 },
    // ---- 4 Tintling
    { kind: 'tintling', id: 'tl1', pos: at(-14, 4, 7, Y - 2.6), sight: 9 },
    { kind: 'tintling', id: 'tl2', pos: at(-8, 4, 10, Y - 2.4), sight: 9, phase: 0.5 },
    { kind: 'tintling', id: 'tl_strom', pos: at(11.5, 4, 7, Y - 2.6), sight: 8, range: 4 },
    // ---- 6 rechts: 30er-Turm
    { kind: 'pilzlingsturm', id: 'turm30', pos: at(11.5, 6, 9), count: 30, behavior: 'walk', speed: 0.6, dir: [1, 0], topple: ['bomb', 'mega', 'star', 'bump', 'cannon'] },
    // ---- 6 links: Laufbomben
    { kind: 'kickbombe', look: 'laufbombe', id: 'lb1', pos: at(-14, 6, 5), dir: [1, 0], speed: 1.1 },
    { kind: 'kickbombe', look: 'laufbombe', id: 'lb2', pos: at(-8, 6, 5), dir: [-1, 0], speed: 1.1, trigger: 0 },
    // ---- 7
    { kind: 'pilzlingsturm', id: 'turm_werfer', pos: at(-11.5, 7, 7), count: 3, behavior: 'walk', speed: 0.5, dir: [1, 0], rider: { kind: 'feuer_werfer', id: 'werfer_turm', sight: 12, interval: 2.4 } },
    { kind: 'wuschel', id: 'wu_topf', center: at(11.5, 7, 7, Y + 0.1), radius: 2.2, speed: 1.6 },
    // ---- 8–12 Kampfräume (P-Haus)
    { kind: 'rammbock_bulle', id: 'kr_bulle1', pos: at(-16, 8, 7) }, { kind: 'rammbock_bulle', id: 'kr_bulle2', pos: at(-11.5, 8, 10) }, { kind: 'rammbock_bulle', id: 'kr_bulle3', pos: at(-7, 8, 7) },
    { kind: 'schneesaeule', id: 'kr_saeule1', pos: at(7, 8, 7) }, { kind: 'schneesaeule', id: 'kr_saeule2', pos: at(11.5, 8, 10) }, { kind: 'schneesaeule', id: 'kr_saeule3', pos: at(16, 8, 7) },
    { kind: 'flatterkaefer', id: 'kr_flieger1', path: [at(-16, 9, 6, Y + 2.2), at(-7, 9, 6, Y + 2.2)], loop: false },
    { kind: 'brummer', id: 'kr_flieger2', center: at(-11.5, 9, 9, Y + 2.4), radius: 2.5 },
    { kind: 'bumerang_werfer', id: 'kr_bum1', pos: at(7, 9, 9) }, { kind: 'bumerang_werfer', id: 'kr_bum2', pos: at(11.5, 9, 11) }, { kind: 'bumerang_werfer', id: 'kr_bum3', pos: at(16, 9, 9) },
    { kind: 'muenzmarder', id: 'kr_marder', path: [at(-16, 10, 3), at(-7, 10, 3), at(-7, 10, 11), at(-16, 10, 11)], coins: 6 },
    { kind: 'pilzlingsturm', id: 'kr_turm1', pos: at(7, 10, 7), count: 3 }, { kind: 'pilzlingsturm', id: 'kr_turm2', pos: at(11.5, 10, 10), count: 3 }, { kind: 'pilzlingsturm', id: 'kr_turm3', pos: at(16, 10, 7), count: 3 },
    { kind: 'funkenflaemmchen', id: 'kr_funke1', pos: at(-16, 11, 7), dir: [1, 0] }, { kind: 'funkenflaemmchen', id: 'kr_funke2', pos: at(-11.5, 11, 10), dir: [-1, 0] }, { kind: 'funkenflaemmchen', id: 'kr_funke3', pos: at(-7, 11, 5), dir: [0, 1] },
    { kind: 'zauberkroete', id: 'kr_kroete1', spots: [at(7, 11, 5), at(9, 11, 11)] }, { kind: 'zauberkroete', id: 'kr_kroete2', spots: [at(12, 11, 4), at(14, 11, 11)] }, { kind: 'zauberkroete', id: 'kr_kroete3', spots: [at(17, 11, 6), at(16, 11, 12)] },
    { kind: 'rankenschnapper', id: 'kr_ranke1', pos: at(-17.5, 12, 4), dir: [1, 0], length: 4 }, { kind: 'rankenschnapper', id: 'kr_ranke2', pos: at(-17.5, 12, 10), dir: [1, 0], length: 4 },
    { kind: 'rankenschnapper', id: 'kr_ranke3', pos: at(-5.5, 12, 7), dir: [-1, 0], length: 4 },
    { kind: 'hammer_werfer', id: 'kr_hammer1', pos: at(7, 12, 9) }, { kind: 'hammer_werfer', id: 'kr_hammer2', pos: at(11.5, 12, 11) }, { kind: 'hammer_werfer', id: 'kr_hammer3', pos: at(16, 12, 9) },
    // ---- 13 Bestand
    { kind: 'glotzfisch', id: 'glotz', holes: [at(-15, 13, 7, Y - 0.2), at(-11.5, 13, 7, Y - 0.2), at(-8, 13, 7, Y - 0.2)], height: 2.6, every: 2.4 },
    { kind: 'kreisgeist_kreis', id: 'kreis', pos: at(-11.5, 13, 10, Y + 0.2), count: 8, radius: 2.4, speed: 1.2 },
    { kind: 'grossrollpilz', id: 'gross', pos: at(7, 13, 8), behavior: 'walk', dir: [1, 0] },
    { kind: 'hackbeil_pilz', id: 'hackbeil', pos: at(15, 13, 4), dir: [-1, 0] },
    { kind: 'wuschel', id: 'wu_bestand', center: at(14, 13, 10, Y + 0.1), radius: 2, speed: 2 },
  ],
  items: [
    // 5 Hasen
    { kind: 'bunny', id: 'riesenhase', size: 'giant', pos: at(-11.5, 5, 7), area: { min: [-18.5, Z(5, 13.5)], max: [-4.5, Z(5, 0.5)] }, star: 0, items: ['wachstumsbeere', 'funken', 'krallen', 'coins:5'] },
    { kind: 'bunny', id: 'hase_klein', pos: at(8, 5, 7), area: { min: [4.5, Z(5, 13.5)], max: [11, Z(5, 0.5)] } },
    { kind: 'bunny', id: 'hase_gross', size: 'big', pos: at(15, 5, 7), area: { min: [11.5, Z(5, 13.5)], max: [18.5, Z(5, 0.5)] } },
    // 6 lila Ziegelwand vor den Laufbomben
    { kind: 'lila_ziegelwand', id: 'ziegel', pos: at(-11.5, 6, 12), size: [6, 2, 1] },
    // 7 Topfpflanze (frisst Wuschel)
    { kind: 'topfpflanze', id: 'topf', pos: at(11.5, 7, 7) },
    // Kampfräume
    raum('raum_bullen', -1, 8), raum('raum_saeulen', 1, 8), raum('raum_flieger', -1, 9), raum('raum_bumerang', 1, 9),
    raum('raum_marder', -1, 10), raum('raum_tuerme', 1, 10), raum('raum_funken', -1, 11), raum('raum_kroeten', 1, 11),
    raum('raum_ranken', -1, 12), raum('raum_hammer', 1, 12),
  ],
  goal: [0, Y, -272],
};
