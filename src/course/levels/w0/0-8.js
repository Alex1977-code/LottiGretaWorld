// Wüstenwerkstatt (0-8): jeder Welt-2-Baustein in einer eigenen Station mit Schild, Kameraschiene und benannten
// Punkten (marks) für tests/course_w2_blocks.mjs. Plateaus (Oberseite y = 1, Decke in Themenfarbe – im Thema desert Sand)
// über einer Sandebene (y = −3),
// Level verläuft nach −Z.
//   S0  Start (Sandsteinbogen)              z    6 …   −6
//   S1  Tastensteine (Treppe, Melodie)      z   −6 …  −26
//   S2  Antipp-Plattformen, -Block, -Münze  z  −26 …  −46   (Lücke −32 … −40)
//   S3  Propellerplattformen                z  −46 …  −66   (Lücke −50 … −60)
//   S4  Kristallwände                       z  −66 …  −86
//   S5  Fliesenbrücken, schmale Brücke      z  −86 … −124   (Lücken −86 … −102, −106 … −118)
//   S6  Goldröhre (Bonusraum x 80), Oase    z −124 … −140
//   S7  Zahnräder, Rollwalzen, Drehrad      z −140 … −178
//   S8  Farbfeld                            z −178 … −192
//   S9  Wachsender ?-Block                  z −192 … −204
//   S10 Roter Ring                          z −204 … −222
//   S11 Kistenfeld                          z −222 … −234
//   S12 Türen (Raum x 110)                  z −234 … −246
//   S13 Schattenspiel                       z −246 … −274
//   S14 Ziel                                z −274 … −294

const plateau = (z0, z1, w = 26, x = 0) => ({ type: 'island', pos: [x, -3, (z0 + z1) / 2], size: [w, 4, Math.abs(z1 - z0)], under: 0 });
const sign = (x, z, text) => ({ type: 'sign', pos: [x, 1, z], text });

export const LEVEL = {
  id: '0-8',
  world: 0,
  title: 'Wüstenwerkstatt',
  archetype: 'parcours',
  theme: 'desert',
  music: 'course_desert',
  timeLimit: 999,
  start: { pos: [0, 1, 3], yaw: Math.PI / 2 },
  camera: [
    { from: 8, to: -6, pitch: 44, dist: 14 },
    { from: -6, to: -26, pitch: 46, dist: 14 },
    { from: -26, to: -46, pitch: 48, dist: 15 },
    { from: -46, to: -66, pitch: 46, dist: 16 },
    { from: -66, to: -86, pitch: 46, dist: 14 },
    { from: -86, to: -124, pitch: 50, dist: 16 },
    { from: -124, to: -140, pitch: 46, dist: 15 },
    { from: -140, to: -178, pitch: 46, dist: 16 },
    { from: -178, to: -204, pitch: 50, dist: 14 },
    { from: -204, to: -222, pitch: 50, dist: 15 },
    { from: -222, to: -246, pitch: 48, dist: 14 },
    { from: -246, to: -254, pitch: 40, dist: 15 },
    // Schattenspiel: frontal auf die Wand (Vorschlag aus level.named.get('sw').camera)
    { from: -258, to: -273, pitch: 14, dist: 16, height: 2.6, ahead: 0 },
    { from: -276, to: -296, pitch: 44, dist: 14 },
    // Räume abseits
    { from: -120, to: -144, pitch: 50, dist: 13, x: 80, xLock: 0.6, area: [68, 94] },
    { from: -230, to: -250, pitch: 46, dist: 12, x: 110, xLock: 0.6, area: [100, 122] },
  ],
  segments: [
    { type: 'deco_w2', items: [
      { kind: 'sandflaeche', pos: [0, -3, -140], size: [150, 340] },
      { kind: 'duenen', pos: [-40, -3, -140], size: [30, 300], n: 18, height: [1.5, 4] },
      { kind: 'duenen', pos: [40, -3, -140], size: [30, 300], n: 18, height: [1.5, 4] },
      { kind: 'felsen', pos: [-58, -3, -120], size: [20, 220], n: 7, height: [6, 16] },
      { kind: 'felsen', pos: [58, -3, -160], size: [20, 220], n: 7, height: [6, 16] },
      { kind: 'pyramide', pos: [-36, -3, -60], size: 16, steps: 6 },
      { kind: 'pyramide', pos: [44, -3, -230], size: 20, steps: 7 },
      { kind: 'kakteen', pos: [-22, -3, -40], size: [10, 60], n: 10 },
      { kind: 'kakteen', pos: [22, -3, -110], size: [10, 60], n: 10 },
      { kind: 'palmen', pos: [20, -3, -20], size: [8, 20], n: 3 },
      { kind: 'ruinen', pos: [-21, -3, -200], size: [8, 40], n: 6 },
      { kind: 'ruinen', pos: [21, -3, -250], size: [8, 30], n: 4 },
      { kind: 'bluetenbaum', pos: [-21, -3, -150] },
      { kind: 'planet', pos: [-30, 14, -40], radius: 3, color: 'violet' },
    ] },

    // ---------------- S0 Start
    plateau(6, -6),
    sign(-7, 0, 'Wüstenwerkstatt'),
    { type: 'deco_w2', items: [{ kind: 'bogen', pos: [0, 1, -4], width: 6, height: 4.6, yaw: Math.PI / 2 }, { kind: 'kaktus', pos: [9, 1, 2], variant: 'saeule' }, { kind: 'kaktus', pos: [-10, 1, 3], variant: 'kugel' }] },

    // ---------------- S1 Tastensteine
    plateau(-6, -26),
    sign(-10, -8, 'Tastensteine'),
    { type: 'taststeine', id: 'treppe', stones: [{ pos: [-6, 1, -11], rise: 0.5 }, { pos: [-6, 1, -14], rise: 1.5 }, { pos: [-6, 1, -17], rise: 2.5 }],
      onAll: { star: { index: 0, pos: [-6, 4.7, -21] } } },
    { type: 'platform', pos: [-6, 1, -21], size: [3, 3.6, 2.5], style: 'stone' },
    { type: 'taststeine', id: 'melodie', order: true, stones: [{ pos: [3, 1, -12] }, { pos: [6, 1, -14] }, { pos: [9, 1, -12] }], onAll: { coins: 5 } },

    // ---------------- S2 Antipp
    plateau(-26, -32),
    plateau(-40, -46),
    sign(-10, -27, 'Antippen'),
    { type: 'antipp', id: 'ap1', pos: [0, 0.5, -36], size: [3, 0.5, 3], mode: 'appear' },
    { type: 'antipp', id: 'ap3', pos: [-7, 0.5, -36], size: [2.5, 0.5, 2.5], mode: 'appear', time: 4, color: 'pink' },
    { type: 'antipp', id: 'ap2', pos: [8, 0.5, -33.6], size: [2.5, 0.5, 2.5], mode: 'slide', dir: [0, -1], length: 3.5, color: 'yellow' },
    { type: 'antipp_block', id: 'ab1', pos: [-8, 1, -28.5], content: 'coins:3' },
    { type: 'antipp_block', id: 'ab2', pos: [-6.6, 1, -28.5], content: 'coin', look: 'sand' },
    { type: 'antipp_muenze', id: 'am1', pos: [-4, 2.4, -43] },

    // ---------------- S3 Propellerplattformen
    plateau(-46, -50),
    plateau(-60, -66),
    sign(-10, -47, 'Propeller'),
    { type: 'propellerplattform', id: 'pp_sink', pos: [-6, 1.6, -55], mode: 'sink', drop: 3 },
    { type: 'propellerplattform', id: 'pp_rise', pos: [0, 0.6, -55], mode: 'rise', height: 4 },
    { type: 'propellerplattform', id: 'pp_path', pos: [6, 0.6, -52], mode: 'path', path: [[6, 0.6, -52], [6, 0.6, -58]], speed: 2 },

    // ---------------- S4 Kristallwände
    plateau(-66, -86),
    sign(-10, -67, 'Kristallwand'),
    { type: 'kristallwand', id: 'kw1', pos: [-5, 1, -73], size: [3, 2, 2], onBreak: { coins: 5 } },
    { type: 'kristallwand', id: 'kw2', pos: [5, 1, -74], size: [3, 3, 1], breakable: 'cannon', color: 'violet', onBreak: { reveal: 'truhe_kw' } },
    { type: 'chest', id: 'truhe_kw', hidden: true, pos: [5, 1, -77], content: 'coins:5' },
    { type: 'kristallwand', id: 'kw3', pos: [0, 1, -80], size: [2, 4, 1], climbable: true, color: 'pink' },

    // ---------------- S5 Fliesenbrücken, schmale Brücke
    sign(-11, -84, 'Fliesenbrücken'),
    { type: 'fliesenbruecke', id: 'fb_slide', from: [0, 1, -86.6], to: [0, 1, -101.4], mode: 'slide', slide: { amp: 1.2, period: 3 } },
    { type: 'fliesenbruecke', id: 'fb_shift', from: [-8, 1, -86.6], to: [-8, 1, -101.4], mode: 'shift', shift: 2.2 },
    { type: 'fliesenbruecke', id: 'fb_build', from: [8, 1, -86.6], to: [8, 1, -101.4], mode: 'build', ahead: 2 },
    plateau(-102, -106),
    { type: 'schmale_bruecke', from: [0, 1, -106], to: [0, 1, -118] },
    { type: 'fliese', id: 'fl_drop', pos: [-6, 0.6, -112], size: [2, 2], mode: 'drop', respawn: 3 },
    plateau(-118, -124),

    // ---------------- S6 Goldröhre, Oase
    plateau(-124, -140, 16.5, -5.75),
    sign(-12, -126, 'Goldröhre\nOase'),
    { type: 'goldroehre', id: 'gold_ein', pos: [-7, 1, -131], height: 1.6, target: 'gold_aus' },
    { type: 'oase', id: 'oase1', pos: [7, 1, -132], size: [5, 4], depth: 1.6, rim: 2, base: 2.4, palms: 3 },
    // Bonusraum (abseits)
    { type: 'island', pos: [80, -3, -131], size: [16, 4, 14], top: 'stone', under: 0 },
    { type: 'goldroehre', id: 'gold_aus', pos: [74, 1, -126], height: 1.6, target: 'gold_ein' },
    { type: 'goldschalter', id: 'gs1', pos: [80, 1, -131], area: { pos: [82, 1, -133], size: [8, 6] }, time: 6, rate: 8 },

    // ---------------- S7 Zahnräder, Rollwalzen, Drehrad
    plateau(-140, -178),
    sign(-11, -142, 'Zahnräder\nRollwalzen'),
    { type: 'zahnradplattform', id: 'zr_y', pos: [-7, 1.3, -147], radius: 2.6, thick: 0.6, axis: 'y', speed: 0.8 },
    { type: 'zahnradplattform', id: 'zr_x', pos: [6, 3.7, -147], radius: 2.6, thick: 2.2, axis: 'x', speed: 0.7 },
    { type: 'rollwalze', id: 'rw1', pos: [0, 1, -158], radius: 2, length: 7, speed: 2 },
    { type: 'rollwalze', id: 'rw2', pos: [-8, 1, -164], radius: 1.1, length: 3, style: 'holz', path: [[-8, 1, -164], [-8, 1, -175]], rollSpeed: 3 },
    { type: 'drehrad', id: 'dr1', pos: [6, 6.3, -169], radius: 3.4, platforms: 4, speed: 0.45, plank: [2, 1.2] },

    // ---------------- S8 Farbfeld
    plateau(-178, -192),
    sign(-10, -180, 'Farbfeld'),
    { type: 'farbfeld', id: 'ff1', pos: [0, 1, -185], grid: [3, 3], cell: 1.8, onAll: { star: { index: 1, pos: [5, 1.2, -185] } } },

    // ---------------- S9 Wachsender ?-Block
    plateau(-192, -204),
    sign(-10, -194, 'Wachsender Block'),
    { type: 'wachs_block', id: 'wb1', pos: [-3, 3.3, -198], height: 4, last: 'krallen' },

    // ---------------- S10 Roter Ring
    plateau(-204, -222),
    sign(-10, -206, 'Roter Ring'),
    { type: 'roter_ring', id: 'rr1', pos: [0, 1, -208], coins: { pos: [0, 1.3, -215], r: 3, n: 8 }, time: 12, reward: { star: { index: 2, pos: [0, 1.3, -215] } } },

    // ---------------- S11 Kistenfeld
    plateau(-222, -234),
    sign(-10, -224, 'Kistenfeld'),
    { type: 'kistenfeld', id: 'kf1', pos: [0, 1, -228], grid: [4, 3], contents: { '1,1': 'funken', '3,0': 'coins:3' } },

    // ---------------- S12 Türen
    plateau(-234, -246),
    sign(-10, -236, 'Türen'),
    { type: 'tuer', id: 'tuer_a', pos: [-4, 1, -242], target: 'tuer_b' },
    { type: 'tuer', id: 'tuer_c', pos: [4, 1, -242], locked: true, style: 'stein' },
    { type: 'island', pos: [110, -3, -240], size: [14, 4, 12], top: 'stone', under: 0 },
    { type: 'tuer', id: 'tuer_b', pos: [110, 1, -244], target: 'tuer_a' },

    // ---------------- S13 Schattenspiel
    plateau(-246, -274),
    sign(-11, -248, 'Schattenspiel'),
    { type: 'scheinwerfer', id: 'lampe', pos: [10, 1, -256], yaw: Math.PI / 2 + 0.35, aim: -0.12 },
    { type: 'schattenwand', id: 'sw', pos: [0, 1, -272], size: [20, 8], depth: 14,
      casters: [{ id: 'sternschatten', pos: [7.5, 7.6, -264], size: [1, 1, 1], shape: 'star' }] },
    { type: 'schattenweg', id: 'sweg', parts: [
      { pos: [-4, 2.3, -264], size: [2.2, 0.4, 2] }, { pos: [-1, 3.7, -264], size: [2.2, 0.4, 2] }, { pos: [2, 5.1, -264], size: [2.2, 0.4, 2] }] },
    { type: 'platform', pos: [5.6, 6.2, -264], size: [2.6, 0.4, 2.6], style: 'stone' },
    { type: 'holz_silhouette', id: 'hs1', pos: [-8, 1, -251], onFall: { coins: 5 } },

    // ---------------- S14 Ziel
    plateau(-274, -294),
    { type: 'deco_w2', items: [{ kind: 'palme', pos: [-8, 1, -282] }, { kind: 'palme', pos: [8, 1, -286], height: 5 }, { kind: 'ruine', pos: [-9, 1, -290] }] },
  ],
  items: [
    { kind: 'coins', from: [5.6, 7, -264], to: [5.6, 7, -264], n: 1 },
    { kind: 'coins', from: [0, 1.4, -18], to: [0, 1.4, -24], n: 4 },
  ],
  stars: [
    { pos: [-6, 4.7, -21], hidden: true, id: 'stern_treppe' },
    { pos: [5, 1.2, -185], hidden: true, id: 'stern_farbe' },
    { pos: [0, 1.3, -215], hidden: true, id: 'stern_ring' },
  ],
  goal: [0, 1, -288],
  marks: {
    ts1: [-6, 1, -11], ts2: [-6, 1, -14], ts3: [-6, 1, -17], mel1: [3, 1, -12], mel2: [6, 1, -14], mel3: [9, 1, -12],
    ap_stand: [0, 1, -30.5], ap_target: [0, 1, -36], ap_far: [0, 1, -42], ap2_stand: [8, 1, -31], ab_stand: [-8, 1, -30.5],
    pp_sink: [-6, 2, -55], pp_rise: [0, 1, -55], pp_path: [6, 1, -52],
    kw1_top: [-5, 3, -73], kw2_top: [5, 4, -74],
    fb_start: [0, 1, -85], fb_shift_start: [-8, 1, -85], fb_build_start: [8, 1, -85],
    zr_y: [-7, 1.6, -147], zr_x: [6, 6.3, -147], rw1: [0, 5, -158], rw2_lane: [-8, 1, -169], dr1: [6, 6.3, -169],
    ff_center: [0, 1, -185], wb_under: [-3, 1, -198], rr_start: [0, 1, -205], kf: [0, 1, -228],
    tuer_a: [-4, 1, -240.5], tuer_b: [110, 1, -242.5], tuer_c: [4, 1, -240.5],
    sw_step: [-4, 3, -264], sw_view: [0, 1, -258], hs: [-8, 1, -251],
    goal: [0, 1, -280],
  },
};
