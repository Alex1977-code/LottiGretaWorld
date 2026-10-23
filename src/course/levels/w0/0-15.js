// Gegnerzoo Canyon (0-15): Testlevel für die Gegner von Welt 4 (tests/course_w4_enemies.mjs). Aufbau wie die
// Gegnerzoos 0-6/0-10: Mittelweg (x ≈ 0) nach −Z, links (x −19 … −4) und rechts (x 4 … 19) Gehege mit Schild davor,
// Reihen alle 20 m (Vorderkante z0 = −8 − 20·(r−1)):
//   1 (−8 … −22)      links Ameisen am Boden (Kolonne auf Rundweg, Hörner-Ameise, Träger-Ameise ride: true, frei
//                     laufende) · rechts **Ameisenwand**: Block 6 × 4 × 2 m, Ameisen laufen über ihn (Ameisenpfad mit
//                     Flächennormalen: Boden → Vorderwand hoch → Oberseite → Rückwand runter), Hörner-Ameise daneben
//   2 (−28 … −42)     links **Riesenameisen-Strom** über einem Stachelfeld (Spawner, Deck als Laufuntergrund) · rechts
//                     Rankenschnapper (Zyklus aus einem Giftwasser-Tümpel über den Weg, drei feste als Stufen, ein
//                     hängender unter einer Decke)
//   3 (−48 … −62)     links Lavabrocken (zwei, Druckfeld 'lbfeld', Zielscheibe Pilzling) · rechts Walzenwerfer auf einer
//                     Säule hinter einer Rampe (Walzen rollen hinab und zerbrechen an der Gehegemauer) und einer am Boden
//   4 (−68 … −82)     links Stachelpanzer, Springklötze (einer hüpft) mit hohem Sims · rechts Lavabecken mit einer Reihe
//                     Lavafunken im Takt
//   5 (−88 … −102)    links Flatterkäfer-Rad (senkrecht, 8 Käfer) · rechts Vorhandene im Welt-4-Einsatz: Bumerang-Werfer,
//                     Pilzlingsturm, Rollpilz
//   Ziel bei z −125. Thema 'canyon', Musik course_canyon.
// Hilfe Z(r, dz) = z der Reihe r, dz Meter hinter ihrer Vorderkante (auch in den Tests).

const Y = 1;
export const Z = (r, dz) => -8 - 20 * (r - 1) - dz;

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

// Ameisenwand (Reihe 1 rechts): Block, Mitte der Unterseite (x, Y, z), Breite 6 (x), Höhe 4, Tiefe 2 (z)
const WALL = { x: 11.5, z: Z(1, 8), w: 6, h: 4, d: 2 };
/** Ameisenpfad über den Block als Liste (antpath-Format, wie antPathOver) – für die Hörner-Ameise. */
function over(x, from = 3, to = 3) {
  const zf = WALL.z + WALL.d / 2, zb = WALL.z - WALL.d / 2, y0 = Y, y1 = Y + WALL.h;
  return [
    [x, y0, zf + from, 0, 1, 0], [x, y0, zf, 0, 1, 0], [x, y0, zf, 0, 0, 1], [x, y1, zf, 0, 0, 1], [x, y1, zf, 0, 1, 0],
    [x, y1, zb, 0, 1, 0], [x, y1, zb, 0, 0, -1], [x, y0, zb, 0, 0, -1], [x, y0, zb, 0, 1, 0], [x, y0, zb - to, 0, 1, 0],
  ];
}

export const WALL_INFO = WALL;

export const LEVEL = {
  id: '0-15',
  world: 0,
  title: 'Gegnerzoo Canyon',
  archetype: 'parcours',
  theme: 'canyon',
  music: 'course_canyon',
  timeLimit: 999,
  start: { pos: [0, Y, 6], yaw: Math.PI / 2 },
  camera: [{ from: 14, to: -140, pitch: 45, dist: 13, yaw: 0 }],
  segments: [
    { type: 'island', pos: [0, -1, -60], size: [42, Y + 1, 150], top: 'grass' },
    { type: 'killplane', y: -16 },
    ...L(1), ...R(1), ...L(2), ...R(2), ...L(3), ...R(3), ...L(4), ...R(4), ...L(5), ...R(5),
    // 1 rechts: Ameisenwand
    { type: 'wall', pos: [WALL.x, Y, WALL.z], size: [WALL.w, WALL.h, WALL.d], style: 'stone' },
    // Ameisenpfad über den Block als Baustein (Spur, level.named 'wandweg') – die Ameise 'amw' liest ihn per Id
    { type: 'ameisenweg', id: 'wandweg', over: { pos: [WALL.x, Y, WALL.z], size: [WALL.w, WALL.h, WALL.d] }, along: 'z', at: WALL.x + 1.5 },
    // 2 links: Stachelfeld unter dem Riesenameisen-Strom
    { type: 'stachelboden', pos: at(-11.5, 2, 7), size: [14.4, 0.25, 6] },
    // 2 rechts: Giftwasser-Tümpel an der Wurzel des Zyklus-Rankenschnappers (er wurzelt darin, andere Gegner versinken)
    { type: 'giftwasser', id: 'gift', pos: at(6.6, 2, 3), size: [3.2, 0.25, 2.6] },
    // 2 rechts: Decke für den hängenden Rankenschnapper
    { type: 'platform', pos: at(16.5, 2, 7, Y + 3.6), size: [3, 0.5, 2.4], style: 'stone' },
    // 3 rechts: Rampe vor der Walzenwerfer-Säule (steigt nach −Z)
    { type: 'ramp', pos: at(11.5, 3, 7.5), size: [4.4, 1.2, 7], axis: 'z', dir: -1, top: 'stone' },
    // 4 links: hoher Sims (nur mit dem Springklotz erreichbar)
    { type: 'platform', pos: at(-6.5, 4, 11.5, Y + 4.2), size: [2.6, 0.5, 2.4], style: 'block', color: 'orange' },
    // 4 rechts: Lavabecken
    { type: 'lava', pos: at(11.5, 4, 7), size: [14.4, 0.3, 13.4] },
    sign(-11.5, 1, 'Ameisen'), sign(11.5, 1, 'Ameisenwand'),
    sign(-11.5, 2, 'Riesenameisen'), sign(11.5, 2, 'Rankenschnapper'),
    sign(-11.5, 3, 'Lavabrocken'), sign(11.5, 3, 'Walzenwerfer'),
    sign(-11.5, 4, 'Stachelpanzer'), sign(11.5, 4, 'Lavafunken'),
    sign(-11.5, 5, 'Käfer-Rad'), sign(11.5, 5, 'Vorhandene'),
  ],
  enemies: [
    // ---- 1 links: Ameisen am Boden
    { kind: 'ameisensoldat', id: 'amf', count: 3, spacing: 1.7, antpath: { loop: true, path: [at(-16, 1, 3), at(-7, 1, 3), at(-7, 1, 9), at(-16, 1, 9)] } },
    { kind: 'ameisensoldat_horn', id: 'amh', antpath: [at(-16, 1, 6), at(-7, 1, 6)], speed: 1.3 },
    { kind: 'ameisensoldat', id: 'amr', ride: true, antpath: [at(-16, 1, 12), at(-7, 1, 12)], speed: 1.2 },
    { kind: 'ameisensoldat_horn', id: 'amfrei', pos: at(-12, 1, 11), dir: [1, 0], ride: false },
    // ---- 1 rechts: Ameisenwand
    { kind: 'ameisensoldat', id: 'amw', antpath: 'wandweg', speed: 1.5 },
    { kind: 'ameisensoldat_horn', id: 'amwh', antpath: over(WALL.x - 1.5), speed: 1.2, phase: 0.55 },
    // ---- 2 links: Riesenameisen-Strom über dem Stachelfeld (Höhle links, Weg nach −X)
    { kind: 'riesenameise', id: 'strom', spawner: { every: 3.6, max: 6 }, path: [at(-5.6, 2, 7), at(-18, 2, 7)], speed: 2 },
    // ---- 2 rechts: Rankenschnapper
    { kind: 'rankenschnapper', id: 'rs_zyklus', pos: at(6.2, 2, 3), dir: [1, 0], length: 7.5, grow: { out: 1.4, hold: 2.4, back: 1.2, wait: 1.6 } },
    { kind: 'rankenschnapper', id: 'rs_stufe1', pos: at(6.5, 2, 11), dir: [1, 0], length: 2.8, height: 0.8, mode: 'static' },
    { kind: 'rankenschnapper', id: 'rs_stufe2', pos: at(9.5, 2, 11), dir: [1, 0], length: 2.8, height: 1.7, mode: 'static' },
    { kind: 'rankenschnapper', id: 'rs_stufe3', pos: at(12.5, 2, 11), dir: [1, 0], length: 2.8, height: 2.6, mode: 'static' },
    { kind: 'rankenschnapper', id: 'rs_haengend', pos: at(16.5, 2, 7, Y + 3.6), hang: true, dir: [-1, 0], length: 3.8, height: 1.2, mode: 'sense', sight: 6 },
    // ---- 3 links: Lavabrocken, Druckfeld, Zielscheibe
    { kind: 'lavabrocken', id: 'lb1', pos: at(-15, 3, 4), behavior: 'walk', path: [at(-16, 3, 4), at(-12, 3, 4)] },
    { kind: 'lavabrocken', id: 'lb2', pos: at(-9, 3, 9) },
    { kind: 'pilzling', id: 'lb_ziel', pos: at(-7, 3, 4), speed: 0.001 },   // Zielscheibe (steht)
    // ---- 3 rechts: Walzenwerfer
    { kind: 'walzenwerfer', id: 'ww_saeule', pos: at(11.5, 3, 12.2), pillar: 2.6, dir: [0, 1], aim: 'dir', interval: 2.6, sight: 30 },
    { kind: 'walzenwerfer', id: 'ww_boden', pos: at(17, 3, 3), dir: [-1, 0], aim: 'player', sight: 9, interval: 3 },
    // ---- 4 links: Stachelpanzer und Springklötze
    { kind: 'stachelpanzer', id: 'sp1', pos: at(-15, 4, 4), path: [at(-16, 4, 4), at(-10, 4, 4)] },
    { kind: 'stachelpanzer', id: 'sp2', pos: at(-12, 4, 9), behavior: 'chase', sight: 5 },
    { kind: 'springklotz', id: 'sk1', pos: at(-6.5, 4, 8) },
    { kind: 'springklotz', id: 'sk2', pos: at(-16, 4, 12), hop: true, dir: [1, 0] },
    // ---- 4 rechts: Lavafunken (Reihe im Takt)
    { kind: 'lavafunke', id: 'funke', pos: at(7, 4, 7, Y + 0.3), count: 5, spacing: 2.1, dir: [1, 0], height: 3.4, period: 2.4, stagger: 0.14 },
    // ---- 5 links: Flatterkäfer-Rad
    { kind: 'flatterkaefer_rad', id: 'rad', center: at(-11.5, 5, 7, Y + 4.2), count: 8, radius: 3, speed: 1.8 },
    // ---- 5 rechts: Vorhandene (Welt 4: Bumerang-Werfer 4-3, Pilzlingsturm/Rollpilz 4-5, 4-Burg)
    { kind: 'feuer_werfer', id: 'bumerang', weapon: 'bumerang', pos: at(14, 5, 8), axis: [1, 0] },
    { kind: 'pilzlingsturm', id: 'turm', pos: at(8, 5, 10), count: 3, behavior: 'walk' },
    { kind: 'rollpilz', id: 'rp', pos: at(8, 5, 4), path: [at(6, 5, 4), at(10, 5, 4)] },
  ],
  items: [
    { kind: 'pfeld', id: 'lbfeld', pos: at(-14.5, 3, 11), size: [2, 2], need: 1, on: { coins: 3 } },
    { kind: 'coins', pos: at(-6.5, 4, 11.5, Y + 5.2), r: 0.8, n: 5 },
  ],
  goal: [0, Y, -125],
  marks: { wall: [WALL.x, Y, WALL.z] },
};
