// Rummel-Gegnerzoo (0-32): Testlevel für die Gegner der Welt 8 „Brummbär-Rummelplatz“ (tests/course_w8_enemies.mjs). Aufbau wie
// die Gegnerzoos 0-24/0-27: Mittelweg (x ≈ 0) nach −Z, links (x −19 … −4) und rechts (x 4 … 19) Gehege mit Schild davor, Reihen
// alle 20 m (Vorderkante z0 = −8 − 20·(r−1)):
//   1 (−8 … −22)      Sandflosser auf Sandboden: links pendelnd mit Stern (8-2 Stern 1) · rechts zielend und kreisend
//   2 (−28 … −42)     Knochenflieger-Gruppen: links Ring (5) auf einer Kreisbahn · rechts Linie/Kette (4) auf einer Bahn
//   3 (−48 … −62)     Knochenflieger-Gruppen: links Welle (5, schwebt, über einem Podest) · rechts Keil (5) ohne Neu-Zusammensetzen
//   4 (−68 … −82)     Sandfiguren: links Baron-Sandstatue mit Stern, Pilzling-Sandskulptur mit Mini-Pilzlingen · rechts Flatterkäfer
//                     mit Stern (8-2 Stern 2)
//   5 (−88 … −102)    Geister: links zwei Kreisgeist-Ringe (je 11) · rechts Großspuk als Jäger (Auslöser vor dem Gehege), Spuk
//   6 (−108 … −122)   8-3 Keksfabrik: links Hörner-Ameisen-Reihen aus Löchern (2 Reihen) · rechts Riesenschnappblume, Hackvogel
//   7 (−128 … −142)   8-Zug/8-Burg: links Schubser auf erhöhten Plattformen (Gruppe 'rad', fallDefeat) · rechts Mini-Pilzlinge,
//                     Krallen-Pilzling
//   8 (−148 … −162)   Bestand: links Feuer-Werfer, Hammer-Werfer · rechts Wandstücke (bruchstueck) zum Prüfen
//   9 (−168 … −200)   Massen-Feld (ohne Gehege): vier Kreisgeist-Ringe (44 Kreisgeister) und drei Knochenflieger-Gruppen (24) –
//                     Kennzahlen (Zeichenaufrufe)
//   Ziel bei z −210. Hilfe Z(r, dz) = z der Reihe r, dz Meter hinter ihrer Vorderkante (auch in den Tests).
// Thema 'desert', Musik course_dunes.

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

export const LEVEL = {
  id: '0-32',
  world: 0,
  title: 'Rummel-Gegnerzoo',
  archetype: 'parcours',
  theme: 'desert',
  music: 'course_dunes',
  timeLimit: 999,
  start: { pos: [0, Y, 6], yaw: Math.PI / 2 },
  camera: [{ from: 14, to: -220, pitch: 45, dist: 13, yaw: 0 }],
  segments: [
    { type: 'island', pos: [0, -1, -97], size: [42, Y + 1, 230], top: 'sand', under: 1.5 },
    { type: 'killplane', y: -16 },
    ...L(1), ...R(1), ...L(2), ...R(2), ...L(3), ...R(3), ...L(4), ...R(4), ...L(5), ...R(5), ...L(6), ...R(6), ...L(7), ...R(7), ...L(8), ...R(8),
    // 3 links: Podest unter der Welle (von oben besiegbar)
    { type: 'platform', id: 'podest_kg', pos: [-11.5, Y, Z(3, 7)], size: [4, 1.6, 4], style: 'stone' },
    // 7 links: erhöhte Plattformen der Schubser (Riesenrad-Ersatz)
    { type: 'platform', id: 'rad1', pos: [-15, Y + 2.2, Z(7, 5)], size: [3.4, 0.5, 3], style: 'block', color: 'red' },
    { type: 'platform', id: 'rad2', pos: [-8.5, Y + 2.2, Z(7, 9)], size: [3.4, 0.5, 3], style: 'block', color: 'yellow' },
    sign(-11.5, 1, 'Sandflosser\nmit Stern'), sign(11.5, 1, 'Sandflosser\nzielt'),
    sign(-11.5, 2, 'Knochenflieger\nRing'), sign(11.5, 2, 'Knochenflieger\nKette'),
    sign(-11.5, 3, 'Knochenflieger\nWelle'), sign(11.5, 3, 'Knochenflieger\nKeil'),
    sign(-11.5, 4, 'Sandfiguren'), sign(11.5, 4, 'Flatterkäfer\nmit Stern'),
    sign(-11.5, 5, 'Kreisgeister'), sign(11.5, 5, 'Großspuk\nJäger'),
    sign(-11.5, 6, 'Hörner-Ameisen\nReihen'), sign(11.5, 6, 'Bestand\nKeksfabrik'),
    sign(-11.5, 7, 'Schubser\nRiesenrad'), sign(11.5, 7, 'Mini-Pilzlinge'),
    sign(-11.5, 8, 'Werfer'), sign(11.5, 8, 'Wandstücke'),
    sign(0, 9, 'Massen-Feld'),
  ],
  enemies: [
    // ---- 1 Sandflosser
    { kind: 'sandflosser', id: 'sf_stern', pos: at(-16, 1, 7), dir: [1, 0], dist: 9, every: 3.2, jump: 4.5, height: 2.6, star: 0 },
    { kind: 'sandflosser', id: 'sf_ziel', pos: at(11.5, 1, 4), aim: true, sight: 9, every: 3.0, phase: 0.5 },
    { kind: 'sandflosser', id: 'sf_kreis', pos: at(11.5, 1, 9), center: at(11.5, 1, 9), radius: 3.2, every: 3.6, jump: 4, phase: 0.2 },
    // ---- 2 Knochenflieger-Gruppen
    { kind: 'knochenflieger_gruppe', id: 'kg_ring', pos: at(-11.5, 2, 7, Y + 4.6), count: 5, formation: 'ring', radius: 1.8, center: at(-11.5, 2, 7, Y + 4.6), orbit: 2.4, sight: 6, respawn: 4 },
    { kind: 'knochenflieger_gruppe', id: 'kg_linie', count: 4, formation: 'linie', path: [at(7, 2, 3, Y + 4.4), at(16, 2, 3, Y + 4.4), at(16, 2, 11, Y + 4.4), at(7, 2, 11, Y + 4.4)], loop: true, sight: 5.5 },
    // ---- 3 Knochenflieger-Gruppen
    { kind: 'knochenflieger_gruppe', id: 'kg_welle', pos: at(-11.5, 3, 7, Y + 3.4), count: 5, formation: 'welle', spacing: 1.4, sight: 0 },
    { kind: 'knochenflieger_gruppe', id: 'kg_keil', pos: at(11.5, 3, 7, Y + 4.6), count: 5, formation: 'keil', respawn: false, sight: 6 },
    // ---- 4 Flatterkäfer mit Stern
    { kind: 'flatterkaefer', id: 'fk_stern', path: [at(7, 4, 4, Y + 2.2), at(16, 4, 4, Y + 2.2), at(16, 4, 10, Y + 2.2), at(7, 4, 10, Y + 2.2)], loop: true, speed: 1.6, star: 2 },
    // ---- 5 Geister
    { kind: 'kreisgeist_kreis', id: 'kgk1', pos: at(-14.5, 5, 5, Y + 0.6), count: 11, radius: 2.4, speed: 1.4 },
    { kind: 'kreisgeist_kreis', id: 'kgk2', pos: at(-8.5, 5, 10, Y + 0.6), count: 11, radius: 2.4, speed: 1.4, cw: true },
    { kind: 'spuk', id: 'gs_jaeger', pos: at(15, 5, 11, Y + 0.4), size: 2.5, hunt: true, trigger: { min: [4, Y - 0.5, Z(5, 3)], max: [19, Y + 4, Z(5, -1)] }, huntSpeed: 2.2 },
    { kind: 'spuk', id: 'spuk8', pos: at(8, 5, 11, Y + 0.4) },
    // ---- 6 Keksfabrik
    { kind: 'riesenschnappblume', id: 'b_riesen', pos: at(9, 6, 7) },
    { kind: 'hackvogel', id: 'b_hack', pos: at(15.5, 6, 6), dir: [-1, 0], period: 2.0 },
    // ---- 7 Schubser auf Plattformen, Mini-Pilzlinge
    { kind: 'schubser', id: 'sb1', pos: [-15, Y + 2.7, Z(7, 5)], behavior: 'guard', sight: 3, group: 'rad', fallDefeat: 1.6 },
    { kind: 'schubser', id: 'sb2', pos: [-8.5, Y + 2.7, Z(7, 9)], behavior: 'guard', sight: 3, group: 'rad', fallDefeat: 1.6 },
    { kind: 'pilzling', id: 'mini1', mini: true, pos: at(8, 7, 5), path: [at(6, 7, 5), at(12, 7, 5)] },
    { kind: 'pilzling', id: 'mini2', mini: true, pos: at(10, 7, 9), behavior: 'chase', sight: 6 },
    { kind: 'pilzling', id: 'mini3', mini: true, pos: at(14, 7, 11), behavior: 'chase', sight: 6 },
    { kind: 'krallen_pilzling', id: 'b_krallen', pos: at(16, 7, 5) },
    // ---- 8 Werfer
    { kind: 'feuer_werfer', id: 'w_feuer8', pos: at(-15, 8, 7) },
    { kind: 'hammer_werfer', id: 'w_hammer8', pos: at(-8, 8, 7) },
    // ---- 9 Massen-Feld: 44 Kreisgeister, 24 Knochenflieger
    { kind: 'kreisgeist_kreis', id: 'm_kg1', pos: at(-10, 9, 6, Y + 0.6), count: 11, radius: 2.6 },
    { kind: 'kreisgeist_kreis', id: 'm_kg2', pos: at(-4, 9, 16, Y + 0.6), count: 11, radius: 2.6, cw: true },
    { kind: 'kreisgeist_kreis', id: 'm_kg3', pos: at(4, 9, 6, Y + 0.6), count: 11, radius: 2.6 },
    { kind: 'kreisgeist_kreis', id: 'm_kg4', pos: at(10, 9, 16, Y + 0.6), count: 11, radius: 2.6, cw: true },
    { kind: 'knochenflieger_gruppe', id: 'm_kf1', pos: at(-10, 9, 22, Y + 5), count: 8, formation: 'ring', radius: 2.4, sight: 0 },
    { kind: 'knochenflieger_gruppe', id: 'm_kf2', pos: at(0, 9, 24, Y + 5.5), count: 8, formation: 'welle', spacing: 1.4, sight: 0 },
    { kind: 'knochenflieger_gruppe', id: 'm_kf3', pos: at(10, 9, 22, Y + 5), count: 8, formation: 'keil', sight: 0 },
  ],
  items: [
    // ---- 4 Sandfiguren
    { kind: 'baron_sandstatue', id: 'statue', pos: at(-15, 4, 7), star: 1 },
    { kind: 'pilzling_sandskulptur', id: 'skulptur', pos: at(-8, 4, 7), minis: 2 },
    // ---- 6 Hörner-Ameisen-Reihen
    { kind: 'ameisen_reihe', id: 'ameisen', from: at(-17, 6, 3), to: at(-6, 6, 11), lanes: 2, gap: 1.4, every: 2.4 },
    // ---- 8 Wandstücke
    { kind: 'bruchstueck', id: 'bs_wand', pos: at(9, 8, 7), size: [2, 2.4, 0.8], climbable: true },
    { kind: 'bruchstueck', id: 'bs_steg', pos: at(15, 8, 7, Y + 2), size: [3, 0.6, 3], look: 'holz' },
  ],
  stars: [],
  goal: [0, Y, -210],
  marks: { podest: [-11.5, Y + 1.6, Z(3, 7)], rad1: [-15, Y + 2.7, Z(7, 5)], rad2: [-8.5, Y + 2.7, Z(7, 9)] },
};
