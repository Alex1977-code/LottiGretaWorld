// Boss-Marathon-Probe (0-36): Testlevel für B-12 „Boss Blitz“ (tests/course_bonus_enemies.mjs, Teil 3) – so, wie der Level-Agent
// B-12 nur mit Daten baut (Präzisierung Gegner Bonuswelten, „Hinweise für Level-Bauer“). Archetyp 'boss' mit sechs Kämpfen
// (LEVEL.bosses), Nacht-Weltraum (Thema 'bossblitz'), 500 s für alles (die Zeit läuft im Hub weiter).
//   Hub (Mitte, 20 × 20 m, 'weltraum_arena' eckig) mit 6 Warp-Boxen (Entität 'bossblitz_hub' legt sie an): unten links
//     Kippquader-König, oben links Schattenläuferin, oben rechts Lavafelsen-König, unten rechts Wirbelbrocken, Mitte beide
//     Schlangenkönige (grün + rosa, 'boss_gruppe'), hinten die verschlossene Box der Würfelblase (mehr, schnellere Schockwellen).
//   Arena-Räume (je eine 'weltraum_arena'): KQ (x −80, z 40, eckig 20 × 20 mit Bruchplatten-Ecken), Schattenläuferin (−80, −50,
//     r 9), Lavafelsen-König (80, −50, r 10, Stern 1), Wirbelbrocken (80, 40, r 10), Schlangenkönige (0, −110, r 13, Stern 2),
//     Würfelblase (0, 110, r 11,5, Stern 3). Jeder Sieg: Schlüssel steigt in der Arenamitte auf → Rück-Warp-Box → zurück aus
//     der Box des Kampfs, die Box ist erledigt. Alle 5 Schlüssel: die letzte Box öffnet sich. Nach der Würfelblase: Rück-Warp-Box
//     zum Zielplatz (z 150).
// Neustart nach Tod: am Eingang des Arena-Raums (der Hub setzt den Checkpoint beim Hineinspringen), Kampf von vorn.

const Y = 2;
export const ROOMS = {
  hub: [0, Y, 0],
  kq: [-80, Y, 40], schatten: [-80, Y, -50], lava: [80, Y, -50], wirbel: [80, Y, 40], koenige: [0, Y, -110], blase: [0, Y, 110],
  ziel: [0, Y, 150],
};
const R = { schatten: 9, lava: 10, wirbel: 10, koenige: 13, blase: 11.5 };
const KQ_A = 10, KQ_C = 4;
const P = (k, dx = 0, dz = 0, dy = 0) => [ROOMS[k][0] + dx, ROOMS[k][1] + dy, ROOMS[k][2] + dz];
/** Auslöser eines runden Arena-Raums (vorn bleibt ein Streifen frei – dort kommt man an). */
const trig = (k, r, front = 2.2) => ({ min: [ROOMS[k][0] - r, Y - 0.5, ROOMS[k][2] - r], max: [ROOMS[k][0] + r, Y + 9, ROOMS[k][2] + r - front] });
const fight = (id, name, k, r, o = {}) => ({ id, name, speed: 0, trigger: trig(k, r, o.front), center: ROOMS[k], frame: o.frame ?? 0.4, warpBanner: '', musicAfter: 'course_bossblitz' });

export const MARKS = { Y, ROOMS };

export const LEVEL = {
  id: '0-36',
  world: 0,
  title: 'Boss-Marathon-Probe',
  archetype: 'boss',
  theme: 'bossblitz',
  music: 'course_bossblitz',
  timeLimit: 500,
  start: { pos: [0, Y, 8.5], yaw: Math.PI / 2 },
  camera: [
    { from: 14, to: -14, pitch: 56, dist: 20, x: 0, xLock: 0.5, area: [-14, 14] },
    { from: 58, to: 24, pitch: 50, dist: 18, x: -80, xLock: 0.4, area: [-100, -60] },
    { from: -36, to: -64, pitch: 50, dist: 17, x: -80, xLock: 0.4, area: [-100, -60] },
    { from: -36, to: -64, pitch: 50, dist: 17, x: 80, xLock: 0.4, area: [60, 100] },
    { from: 58, to: 24, pitch: 50, dist: 17, x: 80, xLock: 0.4, area: [60, 100] },
    { from: -92, to: -128, pitch: 50, dist: 20, x: 0, xLock: 0.4, area: [-20, 20] },
    { from: 128, to: 94, pitch: 50, dist: 19, x: 0, xLock: 0.4, area: [-20, 20] },
    { from: 165, to: 138, pitch: 42, dist: 12.5, ahead: 2, area: [-15, 15] },
  ],
  bosses: [
    { ...fight('kq', 'Kippquader-König', 'kq', KQ_A, { front: 3.6, frame: 0.45 }) },
    fight('schatten', 'Schattenläuferin', 'schatten', R.schatten, { frame: 0.3 }),
    fight('lava', 'Lavafelsen-König', 'lava', R.lava),
    fight('wirbel', 'Wirbelbrocken', 'wirbel', R.wirbel),
    fight('koenige', 'Schlangenkönige', 'koenige', R.koenige, { front: 2.6, frame: 0.25 }),
    fight('blase', 'Würfelblase', 'blase', R.blase, { frame: 0.4 }),
  ],
  segments: [
    // Hub mit Leuchtkreisen für die sechs Boxen
    { type: 'weltraum_arena', id: 'hub', pos: P('hub'), shape: 'eckig', size: [20, 20], color: 'violett', star: true,
      pads: [[-6, 5.5], [-6, -5.5], [6, -5.5], [6, 5.5], [0, 0], [0, -7.5]] },
    { type: 'weltraum_arena', id: 'raum_kq', pos: P('kq'), shape: 'eckig', size: [2 * KQ_A, 2 * KQ_A], corners: KQ_C, color: 'gold' },
    { type: 'weltraum_arena', id: 'raum_schatten', pos: P('schatten'), r: R.schatten, color: 'blau' },
    { type: 'weltraum_arena', id: 'raum_lava', pos: P('lava'), r: R.lava, color: 'rot' },
    { type: 'weltraum_arena', id: 'raum_wirbel', pos: P('wirbel'), r: R.wirbel, color: 'gruen' },
    { type: 'weltraum_arena', id: 'raum_koenige', pos: P('koenige'), r: R.koenige, color: 'rosa', lamps: 10 },
    { type: 'weltraum_arena', id: 'raum_blase', pos: P('blase'), r: R.blase, color: 'violett' },
    { type: 'weltraum_arena', id: 'zielplatz', pos: P('ziel'), shape: 'eckig', size: [14, 16], color: 'gold', wall: 0, lamps: 6 },
    { type: 'killplane', y: -18 },
  ],
  enemies: [
    { kind: 'kippquader_koenig', id: 'kq', pos: P('kq', 0, -5), dir: [0, 1], arena: { min: [ROOMS.kq[0] - KQ_A, ROOMS.kq[2] - KQ_A], max: [ROOMS.kq[0] + KQ_A, ROOMS.kq[2] + KQ_A] },
      corners: [['kq_ecke_vl', 'kq_ecke_vr'], ['kq_ecke_hl', 'kq_ecke_hr']] },
    { kind: 'schattenlaeuferin', id: 'schatten', pos: P('schatten', 0, -3.5), arena: { center: P('schatten'), r: R.schatten - 0.4 }, ring: 5 },
    { kind: 'lavafelsen_koenig', id: 'lava', pos: P('lava', 0, -4), arena: { center: P('lava'), r: R.lava - 0.5 }, star: { pos: P('lava', 0, 5, 0.4), index: 0 } },
    { kind: 'wirbelbrocken', id: 'wirbel', pos: P('wirbel', 0, -3), arena: { center: P('wirbel'), r: R.wirbel - 0.5 } },
    { kind: 'schlangenkoenig', id: 'sk_gruen', pos: P('koenige', -5.5, -1), arena: { center: P('koenige'), r: R.koenige - 0.5 },
      spots: [[-11, -106], [-11, -114], [-7, -103.5], [-7, -117.5], [-2, -105], [-2, -116]].map(([x, z]) => [x, z]) },
    { kind: 'schlangenkoenig', id: 'sk_rosa', color: 'rosa', pos: P('koenige', 5.5, -1), arena: { center: P('koenige'), r: R.koenige - 0.5 },
      spots: [[11, -106], [11, -114], [7, -103.5], [7, -117.5], [2, -105], [2, -116]] },
    { kind: 'boss_gruppe', id: 'koenige', members: ['sk_gruen', 'sk_rosa'], pos: P('koenige'), star: { pos: P('koenige', 0, 8, 0.4), index: 1 } },
    { kind: 'wuerfelblase', id: 'blase', pos: P('blase', 0, -3), arena: { center: P('blase'), r: R.blase - 0.4 }, waves: 3, waveGap: 0.4, shockSpeed: 9.5, shockR: 9,
      star: { pos: P('blase', 0, 6.5, 0.4), index: 2 } },
  ],
  items: [
    { kind: 'bruchplatte', id: 'kq_ecke_vl', pos: P('kq', -KQ_A + KQ_C / 2, KQ_A - KQ_C / 2), size: [KQ_C, KQ_C], style: 'stein' },
    { kind: 'bruchplatte', id: 'kq_ecke_vr', pos: P('kq', KQ_A - KQ_C / 2, KQ_A - KQ_C / 2), size: [KQ_C, KQ_C], style: 'stein' },
    { kind: 'bruchplatte', id: 'kq_ecke_hl', pos: P('kq', -KQ_A + KQ_C / 2, -KQ_A + KQ_C / 2), size: [KQ_C, KQ_C], style: 'stein' },
    { kind: 'bruchplatte', id: 'kq_ecke_hr', pos: P('kq', KQ_A - KQ_C / 2, -KQ_A + KQ_C / 2), size: [KQ_C, KQ_C], style: 'stein' },
    {
      kind: 'bossblitz_hub', id: 'hub', pos: P('hub'), radius: 11, start: [0, Y, 8.5],
      fights: [
        { boss: 'kq', box: P('hub', -6, 5.5), to: P('kq', 0, 8.6), ret: P('kq', 0, 5) },
        { boss: 'schatten', box: P('hub', -6, -5.5), to: P('schatten', 0, 7.6), ret: P('schatten', 0, 4) },
        { boss: 'lava', box: P('hub', 6, -5.5), to: P('lava', 0, 8.6), ret: P('lava', 3, 4) },
        { boss: 'wirbel', box: P('hub', 6, 5.5), to: P('wirbel', 0, 8.6), ret: P('wirbel', 0, 4) },
        { boss: 'koenige', box: P('hub', 0, 0), to: P('koenige', 0, 11.6), ret: P('koenige', 3, 6), key: P('koenige', 0, 4) },
        { boss: 'blase', box: P('hub', 0, -7.5), to: P('blase', 0, 10), ret: P('blase', 3, 5), final: true, back: P('ziel', 0, 4, 0.3) },
      ],
    },
    { kind: 'coins', pos: P('ziel', 0, 1, 0.3), r: 2.2, n: 8 },
  ],
  goal: P('ziel', 0, -4),
  marks: { hub: P('hub'), start: [0, Y, 8.5] },
};
