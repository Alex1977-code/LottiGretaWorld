// Gruselwerkstatt (0-21): Testlevel für die Gegner der Halloween-Welt „Kürbisinsel“ (tests/course_hw_enemies.mjs). Aufbau
// wie die Gegnerwerkstätten 0-15/0-18: Mittelweg (x ≈ 0) nach −Z, links (x −19 … −4) und rechts (x 4 … 19) Gehege mit
// Schild davor, Reihen alle 20 m (Vorderkante z0 = −8 − 20·(r−1)):
//   1 (−8 … −22)      links Kürblinge (Verfolger, Streife) · rechts Riesenkürbling (2 Treffer, zerfällt in 3 kleine)
//   2 (−28 … −42)     links Klapperknochen (Streife, Verfolger) · rechts Klapperknochen zum Besiegen (Stampfattacke, Feuer)
//   3 (−48 … −62)     links Flatterfledis hängen unter einem Balken (Sturzflug-Bogen) · rechts kreisender Schwarm und
//                     eine einzelne kreisende Flatterfledi
//   4 (−68 … −82)     links Hexenhut-Hüpfer (Verfolger, Streife) und ein hohes Podest (Krempen-Abprall) · rechts
//                     Kürbis-Bomben zum Tragen/Werfen, Pilzling-Zielscheibe, Ziegel und Steinblock
//   5 (−88 … −102)    links Halloween-Spuk und Großspuk (Hexenhut) · rechts Halloween-Kreisgeist und Kreisgeist-Kreis
//   Ziel bei z −118. LEVEL.halloween: true (Spuke/Kreisgeister in Halloween-Optik wie in der Halloween-Welt).
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
const sign = (x, r, text) => ({ type: 'sign', pos: [x, Y, Z(r, -0.8)], text, size: [2.8, 0.8] });
const at = (x, r, dz, y = Y) => [x, y, Z(r, dz)];

// Reihe 3 links: Balken, unter dem die Flatterfledis hängen (Unterkante 2,8 m über dem Boden – höher sieht die Kurs-Kamera sie kaum)
const BEAM = { x: -11.5, z: Z(3, 7), y: Y + 2.8, w: 12, d: 1 };
// Reihe 4 links: hohes Podest (nur mit dem Krempen-Abprall erreichbar)
const PODEST = { x: -16, z: Z(4, 11), h: 3.2, w: 2.4, d: 2.4 };

export const LEVEL = {
  id: '0-21',
  world: 0,
  title: 'Gruselwerkstatt',
  archetype: 'parcours',
  theme: 'autumn',
  music: 'course_pumpkin',
  halloween: true,
  timeLimit: 999,
  start: { pos: [0, Y, 6], yaw: Math.PI / 2 },
  camera: [{ from: 14, to: -130, pitch: 45, dist: 13, yaw: 0 }],
  segments: [
    { type: 'island', pos: [0, -1, -54], size: [42, Y + 1, 140] },
    { type: 'killplane', y: -16 },
    ...L(1), ...R(1), ...L(2), ...R(2), ...L(3), ...R(3), ...L(4), ...R(4), ...L(5), ...R(5),
    // 3 links: Balken für die hängenden Flatterfledis (auf zwei Pfosten)
    { type: 'platform', id: 'balken', pos: [BEAM.x, BEAM.y, BEAM.z], size: [BEAM.w, 0.4, BEAM.d], style: 'wood' },
    { type: 'wall', pos: [BEAM.x - BEAM.w / 2 + 0.3, Y, BEAM.z], size: [0.4, BEAM.y - Y, 0.4], style: 0x7a4a2a },
    { type: 'wall', pos: [BEAM.x + BEAM.w / 2 - 0.3, Y, BEAM.z], size: [0.4, BEAM.y - Y, 0.4], style: 0x7a4a2a },
    // 4 links: hohes Podest
    { type: 'platform', id: 'podest', pos: [PODEST.x, Y, PODEST.z], size: [PODEST.w, PODEST.h, PODEST.d], style: 'stone' },
    sign(-11.5, 1, 'Kürbling'), sign(11.5, 1, 'Riesenkürbling'),
    sign(-11.5, 2, 'Klapperknochen'), sign(11.5, 2, 'Klapperknochen\nbesiegen'),
    sign(-11.5, 3, 'Flatterfledi'), sign(11.5, 3, 'Fledermaus-Schwarm'),
    sign(-11.5, 4, 'Hexenhut-Hüpfer'), sign(11.5, 4, 'Kürbis-Bomben'),
    sign(-11.5, 5, 'Halloween-Spuk'), sign(11.5, 5, 'Kreisgeister'),
  ],
  enemies: [
    // ---- 1 links: Kürblinge (Verfolger, Streife) · rechts Riesenkürbling
    { kind: 'kuerbling', id: 'kb_jaeger', pos: at(-11.5, 1, 6), sight: 7 },
    { kind: 'kuerbling', id: 'kb_streife', pos: at(-14, 1, 11), behavior: 'patrol', path: [at(-17, 1, 11), at(-7, 1, 11)], sight: 0, coins: 2 },
    { kind: 'kuerbling', id: 'kb_riese', riese: true, pos: at(11.5, 1, 8), sight: 8 },
    // ---- 2 links: Klapperknochen (Streife, Verfolger) · rechts zum endgültigen Besiegen
    { kind: 'klapperknochen', id: 'kk_streife', pos: at(-12, 2, 5), path: [at(-17, 2, 5), at(-7, 2, 5)] },
    { kind: 'klapperknochen', id: 'kk_jaeger', pos: at(-11.5, 2, 11), behavior: 'chase', sight: 6 },
    { kind: 'klapperknochen', id: 'kk_stampf', pos: at(8, 2, 6), dir: [0, 1], speed: 0.001 },
    { kind: 'klapperknochen', id: 'kk_feuer', pos: at(15, 2, 6), dir: [0, 1], speed: 0.001, drop: 'coin' },
    { kind: 'klapperknochen', id: 'kk_bombe', pos: at(11.5, 2, 11), dir: [1, 0], speed: 0.001 },
    // ---- 3 links: hängende Flatterfledis · rechts Schwarm und Kreisflug
    { kind: 'flatterfledi', id: 'ff_haeng', pos: [BEAM.x + 2.5, BEAM.y, BEAM.z], sight: 5 },
    { kind: 'flatterfledi', id: 'ff_haeng2', pos: [BEAM.x - 3.5, BEAM.y, BEAM.z], sight: 4, cooldown: 2.5 },
    { kind: 'flatterfledi_schwarm', id: 'ff_schwarm', pos: at(10.5, 3, 7, Y + 0.9), count: 6, radius: 2.6, speed: 2 },
    { kind: 'flatterfledi', id: 'ff_kreis', center: at(16, 3, 11.5, Y + 0.7), radius: 1.6, flySpeed: 1.8 },
    // ---- 4 links: Hexenhut-Hüpfer · rechts Bomben-Zielscheibe
    { kind: 'hexenhut_huepfer', id: 'hh_jaeger', pos: at(-11, 4, 6), sight: 7 },
    { kind: 'hexenhut_huepfer', id: 'hh_streife', pos: at(-10, 4, 11.5), behavior: 'patrol', path: [at(-13, 4, 11.5), at(-6, 4, 11.5)], sight: 0 },
    { kind: 'pilzling', id: 'kbb_ziel', pos: at(15.5, 4, 9), speed: 0.001 },
    // ---- 5 links: Halloween-Spuk und Großspuk · rechts Kreisgeister
    { kind: 'spuk', id: 'hw_spuk', pos: at(-15, 5, 5, Y + 0.4) },
    { kind: 'spuk', id: 'hw_grossspuk', pos: at(-9, 5, 10, Y + 0.4), size: 2.5, hat: 'hexe' },
    { kind: 'kreisgeist', id: 'hw_kreisgeist', center: at(8, 5, 4, Y + 0.25), radius: 1.8 },
    { kind: 'kreisgeist_kreis', id: 'hw_kreis', pos: at(13, 5, 9, Y + 0.2), count: 8, radius: 3 },
  ],
  items: [
    // 4 rechts: Kürbis-Bomben (ungezündet) zum Tragen/Werfen, Ziegel und Steinblock
    { kind: 'kuerbis_bombe', id: 'kbb_1', pos: at(7, 4, 3) },
    { kind: 'kuerbis_bombe', id: 'kbb_2', pos: at(9, 4, 3) },
    { kind: 'kuerbis_bombe', id: 'kbb_3', pos: at(7, 4, 11) },
    { kind: 'brick', id: 'ziegel', pos: at(17, 4, 12.5) },
    { kind: 'steinblock', id: 'stein', pos: at(15, 4, 12.5) },
  ],
  goal: [0, Y, -118],
  marks: { beam: [BEAM.x, BEAM.y, BEAM.z], podest: [PODEST.x, Y + PODEST.h, PODEST.z] },
};
