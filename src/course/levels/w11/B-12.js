// B-12 „Fünf Schlüssel im Sternenzelt“ – Boss-Marathon der Welt Blume (Bauplan Welt Blume, Detail B-12: 500 s für alles; Hub
// ca. 20 × 20 m mit 6 Warp-Boxen, eine verschlossen; 5 Bosse frei wählbar – unten links Kippquader-König, oben links
// Schattenläuferin, oben rechts Lavafelsen-König, unten rechts Wirbelbrocken, Mitte beide Schlangenkönige zusammen; jeder Sieg
// gibt einen Schlüssel, alle 5 öffnen die letzte Box zur Würfelblase mit weiteren, schnelleren Schockwellen; alle Kämpfe im
// Weltraum bei Nacht). Kein Remix: nur Daten nach „Präzisierung (Gegner Bonuswelten): Boss-Marathon B-12“ (Archetyp boss mit
// LEVEL.bosses, Bausteine weltraum_arena, bossblitz_hub, boss_gruppe; Probe 0-36). Thema bossblitz (Nacht-Weltraum-Arena),
// Musik course_bossblitz, 500 s (die Uhr läuft auch im Hub weiter), kein Stempel.
//
// Aufbau (oben = −Z, unten = +Z zur Kamera):
//   Sternenkuppel-Hub (x 0, z 0, y 2; 20 × 20 m, violett) mit sechs Warp-Boxen auf Leuchtkreisen – unten links Kippquader-König,
//   oben links Schattenläuferin, oben rechts Lavafelsen-König, unten rechts Wirbelbrocken, in der Mitte die Schlangenkönige,
//   hinten die verschlossene Box der Würfelblase unter einem Sternentor. An den hinteren Hubecken Sternensäulen, Planeten und
//   Sternschnuppen ringsum.
//   Arena-Räume (je weltraum_arena, ≥ 80 m auseinander, eigene Kameraschiene): Kippquader-König (x −80, z 40, eckig 20 × 20
//   mit Bruchplatten-Ecken, gold), Schattenläuferin (−80, −50, r 9, blau), Lavafelsen-König (80, −50, r 10, rot),
//   Wirbelbrocken (80, 40, r 10, grün), Schlangenkönige (0, −110, r 13, rosa), Würfelblase (0, 110, r 11,5, violett) und der
//   Zielplatz (0, 150, gold). Sieg → Schlüssel steigt auf → Rück-Warp-Box in den Hub (die Box des Kampfs ist dann erledigt);
//   alle fünf Schlüssel → die letzte Box springt auf; nach der Würfelblase bringt die Rück-Warp-Box zum Zielplatz.
// Sterne (Index): 0 nach dem Lavafelsen-König, 1 nach den Schlangenkönigen, 2 nach der Würfelblase (je in der Arena).
// Tod im Kampf: Neustart am Eingang des Raums, der Kampf beginnt von vorn; Schlüssel und erledigte Boxen bleiben.

const Y = 2;
export const ROOMS = {
  hub: [0, Y, 0],
  kq: [-80, Y, 40], schatten: [-80, Y, -50], lava: [80, Y, -50], wirbel: [80, Y, 40], koenige: [0, Y, -110], blase: [0, Y, 110],
  ziel: [0, Y, 150],
};
const R = { schatten: 9, lava: 10, wirbel: 10, koenige: 13, blase: 11.5 };
const KQ_A = 10, KQ_C = 4;
const P = (k, dx = 0, dz = 0, dy = 0) => [ROOMS[k][0] + dx, ROOMS[k][1] + dy, ROOMS[k][2] + dz];
/** Auslöser eines Arena-Raums (vorn bleibt ein Streifen frei – dort kommt man an). */
const trig = (k, r, front = 2.2) => ({ min: [ROOMS[k][0] - r, Y - 0.5, ROOMS[k][2] - r], max: [ROOMS[k][0] + r, Y + 9, ROOMS[k][2] + r - front] });
const fight = (id, name, k, r, o = {}) => ({ id, name, speed: 0, trigger: trig(k, r, o.front), center: ROOMS[k], frame: o.frame ?? 0.4, warpBanner: '', musicAfter: 'course_bossblitz' });

/** Kulisse eines Arena-Raums: Planeten und Sterne in der Tiefe, zwei Sternschnuppen. */
const raumDeko = (k, planet, color, seed) => [
  { kind: 'planet', pos: P(k, -18, -16, -9), radius: 5, variant: planet, color, shadow: false },
  { kind: 'planet', pos: P(k, 20, -10, -14), radius: 3, variant: 'ring', color: 'lila', shadow: false },
  { kind: 'komet', pos: P(k, -12, -20, 6), size: 1.2, dir: [1, -0.3, 0.4] },
  { kind: 'sterne', pos: P(k, 0, 0, -6), size: [40, 40], n: 16, height: 4, seed },
];

export const LEVEL = {
  id: 'B-12',
  world: 11,
  title: 'Fünf Schlüssel im Sternenzelt',
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
    fight('kq', 'Kippquader-König', 'kq', KQ_A, { front: 3.6, frame: 0.45 }),
    fight('schatten', 'Schattenläuferin', 'schatten', R.schatten, { frame: 0.3 }),
    fight('lava', 'Lavafelsen-König', 'lava', R.lava),
    fight('wirbel', 'Wirbelbrocken', 'wirbel', R.wirbel),
    fight('koenige', 'Schlangenkönige', 'koenige', R.koenige, { front: 2.6, frame: 0.25 }),
    fight('blase', 'Würfelblase', 'blase', R.blase, { frame: 0.4 }),
  ],
  segments: [
    // Sternenkuppel-Hub mit Leuchtkreisen für die sechs Boxen
    { type: 'weltraum_arena', id: 'hub', pos: P('hub'), shape: 'eckig', size: [20, 20], color: 'violett', star: true, lamps: 10,
      pads: [[-6, 5.5], [-6, -5.5], [6, -5.5], [6, 5.5], [0, 0], [0, -7.5]] },
    { type: 'weltraum_arena', id: 'raum_kq', pos: P('kq'), shape: 'eckig', size: [2 * KQ_A, 2 * KQ_A], corners: KQ_C, color: 'gold' },
    { type: 'weltraum_arena', id: 'raum_schatten', pos: P('schatten'), r: R.schatten, color: 'blau' },
    { type: 'weltraum_arena', id: 'raum_lava', pos: P('lava'), r: R.lava, color: 'rot' },
    { type: 'weltraum_arena', id: 'raum_wirbel', pos: P('wirbel'), r: R.wirbel, color: 'gruen' },
    { type: 'weltraum_arena', id: 'raum_koenige', pos: P('koenige'), r: R.koenige, color: 'rosa', lamps: 10 },
    { type: 'weltraum_arena', id: 'raum_blase', pos: P('blase'), r: R.blase, color: 'violett' },
    { type: 'weltraum_arena', id: 'zielplatz', pos: P('ziel'), shape: 'eckig', size: [14, 16], color: 'gold', wall: 0, lamps: 6 },
    { type: 'killplane', y: -18 },
    // Kulisse: Sternentor am Hub-Eingang, Sternensäulen an den Hub-Ecken, Planeten, Raketen, Sternschnuppen
    { type: 'deco_star', items: [
      { kind: 'torbogen', pos: [0, Y, -11.4], width: 6, height: 5 },
      { kind: 'leuchtsaeule', pos: [-10.6, Y, -10.6], height: 6 }, { kind: 'leuchtsaeule', pos: [10.6, Y, -10.6], height: 6 },
      { kind: 'planet', pos: [-26, -6, -24], radius: 7, variant: 'ring', color: 'rosa', shadow: false },
      { kind: 'planet', pos: [28, -9, -20], radius: 5, variant: 'eis', color: 'blau', shadow: false },
      { kind: 'planet', pos: [24, -4, 22], radius: 3.5, variant: 'blume', color: 'gold', shadow: false },
      { kind: 'planet', pos: [-24, -8, 20], radius: 4, variant: 'pilz', color: 'mint', shadow: false },
      { kind: 'rakete', pos: [-16, -3, -2], height: 4, color: 'rot', yaw: 0.6 },
      { kind: 'rakete', pos: [17, -2, 2], height: 3.5, color: 'blau', yaw: -0.8 },
      { kind: 'komet', pos: [-14, 9, -18], size: 1.4, dir: [1, -0.25, 0.3] },
      { kind: 'komet', pos: [16, 11, -14], size: 1.1, dir: [-1, -0.3, 0.2] },
      { kind: 'sterne', pos: [0, Y, 0], size: [44, 44], n: 22, height: 6, seed: 3 },
      ...raumDeko('kq', 'pilz', 'gold', 11), ...raumDeko('schatten', 'eis', 'blau', 12), ...raumDeko('lava', 'ring', 'rosa', 13),
      ...raumDeko('wirbel', 'blume', 'mint', 14), ...raumDeko('koenige', 'ring', 'gold', 15), ...raumDeko('blase', 'pilz', 'lila', 16),
      { kind: 'torbogen', pos: P('ziel', 0, -6.4), width: 6, height: 5 },
      { kind: 'rakete', pos: P('ziel', -5.6, -5.2), height: 4, color: 'weiss', yaw: 0.3 },
      { kind: 'kristall', pos: P('ziel', 5.4, -5.2), n: 5, color: 'gold', size: 1 },
    ] },
    { type: 'sign', pos: [3.6, Y, -9.4], text: 'Die letzte Box:\nfünf Schlüssel!', size: [2.4, 0.85], yaw: -0.2 },
  ],
  enemies: [
    { kind: 'kippquader_koenig', id: 'kq', pos: P('kq', 0, -5), dir: [0, 1], arena: { min: [ROOMS.kq[0] - KQ_A, ROOMS.kq[2] - KQ_A], max: [ROOMS.kq[0] + KQ_A, ROOMS.kq[2] + KQ_A] },
      corners: [['kq_ecke_vl', 'kq_ecke_vr'], ['kq_ecke_hl', 'kq_ecke_hr']] },
    { kind: 'schattenlaeuferin', id: 'schatten', pos: P('schatten', 0, -3.5), arena: { center: P('schatten'), r: R.schatten - 0.4 }, ring: 5 },
    { kind: 'lavafelsen_koenig', id: 'lava', pos: P('lava', 0, -4), arena: { center: P('lava'), r: R.lava - 0.5 }, star: { pos: P('lava', 0, 5, 0.4), index: 0 } },
    { kind: 'wirbelbrocken', id: 'wirbel', pos: P('wirbel', 0, -3), arena: { center: P('wirbel'), r: R.wirbel - 0.5 } },
    { kind: 'schlangenkoenig', id: 'sk_gruen', pos: P('koenige', -5.5, -1), arena: { center: P('koenige'), r: R.koenige - 0.5 },
      spots: [[-11, -106], [-11, -114], [-7, -103.5], [-7, -117.5], [-2, -105], [-2, -116]] },
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
        { boss: 'lava', box: P('hub', 6, -5.5), to: P('lava', 0, 8.6), ret: P('lava', 4.6, 3) },
        { boss: 'wirbel', box: P('hub', 6, 5.5), to: P('wirbel', 0, 8.6), ret: P('wirbel', 0, 4) },
        { boss: 'koenige', box: P('hub', 0, 0), to: P('koenige', 0, 11.6), ret: P('koenige', 4.8, 5), key: P('koenige', 0, 4) },
        { boss: 'blase', box: P('hub', 0, -7.5), to: P('blase', 0, 10), ret: P('blase', 0, 0.5), final: true, back: P('ziel', 0, 4, 0.3) },
      ],
    },
    // Bitcoins im Hub (Ring um den Goldstern) und auf dem Zielplatz
    { kind: 'coins', pos: P('hub', 0, 3, 0.6), r: 1.4, n: 6 },
    { kind: 'coins', pos: P('ziel', 0, 1, 0.3), r: 2.2, n: 8 },
  ],
  goal: P('ziel', 0, -4),
  marks: {
    hub: P('hub'), start: [0, Y, 8.5], kq: P('kq'), schatten: P('schatten'), lava: P('lava'), wirbel: P('wirbel'), koenige: P('koenige'),
    blase: P('blase'), ziel: P('ziel'),
  },
};
