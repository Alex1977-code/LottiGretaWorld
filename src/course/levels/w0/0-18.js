// Gegnerwerkstatt Lila Strand (0-18): Testlevel für die Gegner von Welt 5 (tests/course_w5_enemies.mjs). Aufbau wie die
// Gegnerzoos 0-6/0-10/0-15: Mittelweg (x ≈ 0) nach −Z, links (x −19 … −4) und rechts (x 4 … 19) Gehege mit Schild davor,
// Reihen alle 20 m (Vorderkante z0 = −8 − 20·(r−1)):
//   1 (−8 … −22)      links Sandtaucher im Sand (Revier = Gehege) · rechts Sandtaucher im Wasserbecken mit Steg
//   2 (−28 … −42)     links Zündköpfe (Verfolger, Patrouille, Nachschub-Spender), lila Ziegelwand, Pilzling-Zielscheibe ·
//                     rechts Zündkopf zum Tragen/Werfen, lila Ziegelwand, POW-Block mit lila Ziegeln, Ziegel, Steinblock
//   3 (−48 … −62)     links Feuerring 'puls' · rechts Feuerring 'rad' (eine Lücke) und ein kleiner mit blink
//   4 (−68 … −82)     links Hackbeil-Pilze (Verfolger, Patrouille) · rechts Funkenlinge (Blockrand, Wand, wuselnd)
//   5 (−88 … −102)    links Glutbälle in blauer Lava · rechts Suchscheinwerfer mit zwei Suchkopf-Kanonen (Suchkopf-Welle)
//   6 (−108 … −122)   links/rechts: Vorhandene im Welt-5-Einsatz (Panzerkröte, Mini-Pilzling, Rammbock-Bulle,
//                     Ameisensoldat, Feuer-Werfer, Pilzlingsturm, Kreisgeist, Münzmarder, Spuk, Krabbelkäfer) und der
//                     Werferturm (Feuer-Werfer auf 9 Pilzlingen, 5-B)
//   Ziel bei z −140. Thema 'beach', Musik course_beach.
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

// Wasserbecken (Reihe 1 rechts): Wasser 1,2 m über dem Boden zwischen den Gehegemauern (h 1,6), Steg in der Mitte
const POOL = { x: 11.5, z: Z(1, 7), w: 14.4, d: 13.4, top: Y + 1.2 };
// Funkenling-Block (Reihe 4 rechts) und Wand
const FBLOCK = { pos: at(8, 4, 5), size: [3, 1.2, 3] };
const FWALL = { x: 15.5, z: Z(4, 9), w: 4, h: 3, d: 1 };

export const LEVEL = {
  id: '0-18',
  world: 0,
  title: 'Gegnerwerkstatt Lila Strand',
  archetype: 'parcours',
  theme: 'beach',
  music: 'course_beach',
  timeLimit: 999,
  start: { pos: [0, Y, 6], yaw: Math.PI / 2 },
  camera: [{ from: 14, to: -150, pitch: 45, dist: 13, yaw: 0 }],
  segments: [
    { type: 'island', pos: [0, -1, -66], size: [42, Y + 1, 162], top: 'sand' },
    { type: 'killplane', y: -16 },
    ...L(1), ...pen(4, 19, Z(1, 0), Z(1, 14), 1.6), ...L(2), ...R(2), ...L(3), ...R(3), ...L(4), ...R(4), ...L(5), ...R(5), ...L(6), ...R(6),
    // 1 rechts: Wasserbecken mit Steg
    { type: 'water', pos: [POOL.x, Y, POOL.z], size: [POOL.w, POOL.top - Y, POOL.d] },
    { type: 'platform', id: 'steg', pos: [POOL.x, Y, POOL.z], size: [2, 1.4, 2], style: 'wood' },
    // 2: lila Ziegel (Entitäten, siehe items) – davor ein Steinblock-Ziel für die Explosion
    // 3: nichts (Feuerringe stehen frei)
    // 4 rechts: Block für den Funkenling am Rand, Wand für den Funkenling an der Wand
    { type: 'platform', pos: FBLOCK.pos, size: FBLOCK.size, style: 'block', color: 'pink' },
    { type: 'wall', pos: [FWALL.x, Y, FWALL.z], size: [FWALL.w, FWALL.h, FWALL.d], style: 'stone' },
    // 5 links: Becken mit blauer Lava
    { type: 'lava', pos: at(-11.5, 5, 7), size: [9, 0.3, 7], color: 'blau' },
    // 5 rechts: Dach als Deckung vor dem Suchscheinwerfer
    { type: 'platform', id: 'dach', pos: at(15.5, 5, 7, Y + 2.2), size: [3.2, 0.4, 3.2], style: 'stone' },
    { type: 'suchscheinwerfer', id: 'licht', path: [at(7, 5, 7), at(17, 5, 7)], speed: 2.5, radius: 2, lamp: [12, Y + 10, Z(5, 15)], cooldown: 2, alarmTime: 1.5 },
    sign(-11.5, 1, 'Sandtaucher'), sign(11.5, 1, 'Sandtaucher Wasser'),
    sign(-11.5, 2, 'Zündköpfe'), sign(11.5, 2, 'Zündkopf werfen'),
    sign(-11.5, 3, 'Feuerring Puls'), sign(11.5, 3, 'Feuerring Rad'),
    sign(-11.5, 4, 'Hackbeil-Pilz'), sign(11.5, 4, 'Funkenling'),
    sign(-11.5, 5, 'Glutball'), sign(11.5, 5, 'Suchkopf-Welle'),
    sign(-11.5, 6, 'Vorhandene'), sign(11.5, 6, 'Vorhandene'),
  ],
  enemies: [
    // ---- 1 links: Sandtaucher im Sand (Revier = Gehege), rechts im Wasserbecken
    { kind: 'sandtaucher', id: 'st_sand', pos: at(-11.5, 1, 7), area: { min: [-18, Z(1, 13)], max: [-5, Z(1, 1)] } },
    { kind: 'sandtaucher', id: 'st_wasser', pos: [POOL.x + 4, POOL.top, POOL.z], area: { min: [5, Z(1, 13)], max: [18, Z(1, 1)] }, ground: 'wasser' },
    // ---- 2 links: Zündköpfe
    { kind: 'zuendkopf', id: 'zk_jaeger', pos: at(-15, 2, 4), sight: 7 },
    { kind: 'zuendkopf', id: 'zk_streife', pos: at(-14, 2, 10), behavior: 'walk', trigger: 0, path: [at(-17, 2, 10), at(-11, 2, 10)] },
    { kind: 'zuendkopf', id: 'zk_quelle', pos: at(-17.5, 2, 2), spawner: { every: 5, max: 1, first: 2, range: 12 }, behavior: 'walk', trigger: 0, dir: [1, 0] },
    { kind: 'pilzling', id: 'zk_ziel', pos: at(-7, 2, 10), speed: 0.001 },
    // ---- 2 rechts: Zündkopf zum Tragen (zündet nicht von selbst)
    { kind: 'zuendkopf', id: 'zk_wurf', pos: at(7, 2, 3), behavior: 'walk', trigger: 0, speed: 0.001 },
    // ---- 3: Feuerringe
    { kind: 'feuerring', id: 'fr_puls', pos: at(-11.5, 3, 7), mode: 'puls', radius: 4.5, period: 2.4, wait: 0.6 },
    { kind: 'feuerring', id: 'fr_rad', pos: at(11.5, 3, 7), mode: 'rad', radius: 3, gaps: 1, gap: 80, speed: 1.0 },
    { kind: 'feuerring', id: 'fr_blink', pos: at(16.5, 3, 12), mode: 'rad', radius: 1.4, gaps: 0, blink: [2, 1.2], color: 'pink', speed: -1.6 },
    // ---- 4 links: Hackbeil-Pilze
    { kind: 'hackbeil_pilz', id: 'hb_jaeger', pos: at(-15, 4, 5), dir: [1, 0] },
    { kind: 'hackbeil_pilz', id: 'hb_streife', pos: at(-14, 4, 11), behavior: 'patrol', path: [at(-17, 4, 11), at(-8, 4, 11)], sight: 0 },
    // ---- 4 rechts: Funkenlinge
    { kind: 'funkenling', id: 'fl_block', block: { pos: FBLOCK.pos, size: FBLOCK.size }, speed: 2 },
    { kind: 'funkenling', id: 'fl_wand', path: [[FWALL.x - 2, Y, FWALL.z + 0.5 + 0.28], [FWALL.x - 2, Y + FWALL.h, FWALL.z + 0.5 + 0.28], [FWALL.x + 2, Y + FWALL.h, FWALL.z + 0.5 + 0.28], [FWALL.x + 2, Y, FWALL.z + 0.5 + 0.28]], loop: true, color: 'blau', speed: 2.2 },
    { kind: 'funkenling', id: 'fl_wusel', pos: at(14, 4, 3), dir: [1, 0], color: 'pink', speed: 2.4 },
    // ---- 5 links: Glutbälle in blauer Lava (Reihe, versetzt)
    { kind: 'glutball', id: 'gb', pos: at(-14.5, 5, 7, Y + 0.3), count: 3, spacing: 3, dir: [1, 0], height: 3.2, period: 2.4, stagger: 0.2 },
    // ---- 5 rechts: Suchkopf-Kanonen (nur bei Alarm) und Welle
    { kind: 'kanone_turm', id: 'k1', pos: at(5.5, 5, 13), dir: [1, 0], shot: 'suchkopf', active: false, height: 2 },
    { kind: 'kanone_turm', id: 'k2', pos: at(18.5, 5, 13), dir: [-1, 0], shot: 'suchkopf', active: false, height: 2 },
    { kind: 'suchkopf_welle', id: 'welle', cannons: ['k1', 'k2'], shots: 2, every: 1.2, stagger: 0.4, cooldown: 3 },
    // ---- 6: Vorhandene im Welt-5-Einsatz (Bauplan-Gegnerliste)
    { kind: 'panzerkroete', id: 'v_kroete', pos: at(-16, 6, 3), path: [at(-17, 6, 3), at(-12, 6, 3)] },
    { kind: 'pilzling', id: 'v_mini', mini: true, pos: at(-9, 6, 3), path: [at(-10, 6, 3), at(-6, 6, 3)] },
    { kind: 'rammbock_bulle', id: 'v_bulle', pos: at(-11.5, 6, 10), dir: [0, 1], sight: 4 },
    { kind: 'ameisensoldat', id: 'v_ameise', antpath: [at(-17, 6, 7), at(-6, 6, 7)], speed: 1.2 },
    { kind: 'krabbelkaefer', id: 'v_kaefer', path: [at(-17, 6, 12.5), at(-6, 6, 12.5)], count: 2 },
    { kind: 'feuer_werfer', id: 'v_werfer', pos: at(15, 6, 11), axis: [1, 0], sight: 6 },
    { kind: 'pilzlingsturm', id: 'v_turm', pos: at(8, 6, 11), count: 3, behavior: 'walk', speed: 0.6 },
    { kind: 'kreisgeist', id: 'v_kreisgeist', center: at(11.5, 6, 6, Y + 0.25), radius: 2.4 },
    { kind: 'spuk', id: 'v_spuk', pos: at(17, 6, 3, Y + 0.4) },
    { kind: 'muenzmarder', id: 'v_marder', path: [at(6, 6, 2), at(17, 6, 2)], sight: 3 },
    // 5-B: Feuer-Werfer auf einem Pilzlingsturm aus 9 Pilzlingen (werferturm)
    { kind: 'werferturm', id: 'wturm', pos: at(12, 6, 12), count: 9, behavior: 'walk', speed: 0.3, path: [at(10, 6, 12), at(14, 6, 12)], riderId: 'wturm_werfer' },
  ],
  items: [
    // 2 links: lila Ziegelwand hinter den Zündköpfen; Ziegel und Steinblock daneben
    { kind: 'lila_ziegelwand', id: 'lw1', pos: at(-11.5, 2, 12.5), size: [4, 2, 1] },
    // 2 rechts: lila Ziegelwand (Wurfziel), POW mit einzelnen lila Ziegeln, gewöhnlicher Ziegel, Steinblock
    { kind: 'lila_ziegelwand', id: 'lw2', pos: at(12, 2, 9.5), size: [3, 2, 1], content: 'coin', onBreak: { coins: 5 } },
    { kind: 'pow', id: 'pow', pos: at(16.5, 2, 4), uses: 3, radius: 3.5 },
    { kind: 'lila_ziegel', id: 'lz1', pos: at(17.5, 2, 6) },
    { kind: 'lila_ziegel', id: 'lz2', pos: at(15.5, 2, 6) },
    { kind: 'brick', id: 'ziegel', pos: at(7.5, 2, 12) },
    { kind: 'steinblock', id: 'stein', pos: at(9.5, 2, 12) },
  ],
  goal: [0, Y, -140],
  marks: { pool: [POOL.x, POOL.top, POOL.z], fblock: FBLOCK.pos, fwall: [FWALL.x, Y, FWALL.z] },
};
