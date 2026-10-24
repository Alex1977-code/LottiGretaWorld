// Strandwerkstatt (0-17): jeder neue Welt-5-Baustein in einer Station mit Schild, Kameraschiene und benannten Punkten
// (marks) für tests/course_w5_blocks.mjs. Archetyp 'parcours_ride' (Parcours mit Ritt-Abschnitt), Thema beach; mit
// ?theme=<name> lässt sich jedes Welt-5-Thema ansehen (beach, bluelava, savanna, mine, cake, sneak, temple). Level verläuft
// nach −Z; Plateaus mit Oberseite y = 1.
//   S0  Start                                                            z    6 …   −6
//   S1  Schlüsselmünzen (5) → Warp-Box erscheint (zur Schwebeinsel)     z   −6 …  −24   (Schwebeinsel x 40)
//   S2  Ritt-Abschnitt: Pflaume wartet an der Station, Fluss mit Hub-    z  −24 …  −74
//       brücke, Absteigen am Ende
//   S3  Zirkus: drei Trapeze (Schwungabstand 4,5 m), Pendelplattform     z  −74 … −118
//   S4  Savanne: Röhrenkanone (40 m), Drehbrücke                         z −118 … −182
//   S5  Torte: Rot-Blau-Felder, Wechselplattformen, Schiebekugel → P-Feld z −182 … −218
//   S6  Schleich-Festung: Suchscheinwerfer                               z −218 … −236
//   S7  Tempel: Kippquader (Block, Rahmen mit Loch), 3er-Lift, Donut-    z −236 … −286
//       Blöcke über blauer Lava
//   S8  Ziel                                                             z −286 … −298

const plat = (z0, z1, top = 1, w = 26, x = 0) => ({ type: 'island', pos: [x, top - 4, (z0 + z1) / 2], size: [w, 4, Math.abs(z1 - z0)], under: 0 });
const sign = (x, y, z, text) => ({ type: 'sign', pos: [x, y, z], text });

// Fluss des Ritt-Abschnitts: gerader Kanal (Breite 8, Oberfläche y −1), Ufer = Plateaus (Oberseite 1)
const RIVER = [[0, -1, -25, 8, 2.6], [0, -1, -36, 8, 3.2], [0, -1.05, -48, 8, 3.4], [0, -1.1, -60, 8, 3.2], [0, -1.1, -72, 8, 2.6]];

export const LEVEL = {
  id: '0-17',
  world: 0,
  title: 'Strandwerkstatt',
  archetype: 'parcours_ride',
  theme: 'beach',
  music: 'course_grass',
  timeLimit: 999,
  start: { pos: [0, 1, 3], yaw: Math.PI / 2 },
  flipperStart: 'rot',
  ride: {
    section: true,
    raft: [0, -1, -27.6],
    raftYaw: -Math.PI / 2,
    beach: { min: [-8, -74], max: [8, -66.5], land: [0, 1, -76.5] },
  },
  camera: [
    { from: 8, to: -6, pitch: 42, dist: 14 },
    { from: -6, to: -24, pitch: 44, dist: 15 },
    { from: -24, to: -74, pitch: 38, dist: 12.5, ahead: 2.6 },
    { from: -74, to: -118, pitch: 34, dist: 15, height: 2.2 },
    { from: -118, to: -182, pitch: 40, dist: 16 },
    { from: -182, to: -218, pitch: 50, dist: 15 },
    { from: -218, to: -236, pitch: 52, dist: 15 },
    { from: -236, to: -300, pitch: 46, dist: 15 },
    // Schwebeinsel (Warp-Box-Ziel) abseits
    { from: 0, to: -40, pitch: 40, dist: 13, area: [30, 52] },
  ],
  segments: [
    // ---------------- S0 Start
    plat(6, -6),
    sign(-7, 1, 0, 'Strandwerkstatt'),
    { type: 'deco_w5', items: [
      { kind: 'palme', pos: [-10, 1, 3], height: 6 }, { kind: 'palme', pos: [10.5, 1, -2], height: 5.4, lean: 0.3 },
      { kind: 'sandburg', pos: [8, 1, 3.5], size: 2.2 }, { kind: 'sonnenschirm', pos: [-9, 1, -3], color: 'rot' },
      { kind: 'muscheln', pos: [0, 1, 0], size: [20, 10], n: 10 },
    ] },

    // ---------------- S1 Schlüsselmünzen → Warp-Box
    plat(-6, -24),
    sign(-11, 1, -7, 'Schlüsselmünzen'),
    { type: 'platform', pos: [8, 1, -14], size: [3, 2, 3], style: 'stone' },
    { type: 'deco_w5', items: [
      { kind: 'sandskulptur', pos: [-9, 1, -18], size: 1.6 }, { kind: 'sandskulptur', pos: [-6.5, 1, -20], size: 1.4 },
      { kind: 'liegestuhl', pos: [10, 1, -21], yaw: -0.6 }, { kind: 'palme', pos: [-11.5, 1, -12], height: 5.6 },
      { kind: 'strandball', pos: [5.5, 1, -18.5] }, { kind: 'sonnenschirm', pos: [6.5, 1, -9], color: 'blau' },
      { kind: 'muscheln', pos: [0, 1, -15], size: [16, 16], n: 8 },
    ] },
    // Schwebeinsel (Ziel der Warp-Box)
    { type: 'island', pos: [40, 2, -15], size: [10, 4, 10], under: 0, top: 'sand' },

    // ---------------- S2 Ritt-Abschnitt
    { type: 'island', pos: [-9.1, -3, -49], size: [8.2, 4, 50], under: 0 },
    { type: 'island', pos: [9.1, -3, -49], size: [8.2, 4, 50], under: 0 },
    sign(-6, 1, -26, 'Ritt: Pflaume'),
    { type: 'river', channels: [{ id: 'ritt', points: RIVER, bank: { height: 2, out: 2.5, skirt: false }, deco: 0 }] },
    { type: 'flussbruecke', id: 'hubbruecke', from: [-5.2, 0.35, -48], to: [5.2, 0.35, -48], width: 2.6, lift: 2.6, wait: 1.4, speed: 1.6 },

    // ---------------- S3 Zirkus
    plat(-74, -82),
    sign(-11, 1, -75, 'Trapeze'),
    { type: 'trapez', id: 't1', pos: [0, 7.2, -84.5], length: 3, swing: 30 },
    { type: 'trapez', id: 't2', pos: [0, 7.2, -89], length: 3, swing: 30 },
    { type: 'trapez', id: 't3', pos: [0, 7.2, -93.5], length: 3, swing: 30 },
    plat(-98, -103),
    { type: 'pendelplattform', id: 'pendel', pos: [0, 7, -108], length: 6, size: [3, 2.2], dir: [0, -1], amp: 35 },
    plat(-113, -118),

    // ---------------- S4 Savanne
    plat(-118, -126),
    sign(-11, 1, -119, 'Röhrenkanone'),
    { type: 'roehrenkanone', id: 'kanone', pos: [0, 1, -122.5], to: [0, 1, -162.5] },
    { type: 'deco_w5', items: [
      { kind: 'akazie', pos: [8.5, 1, -124.5], height: 5.5 }, { kind: 'baobab', pos: [-9.5, 1, -124], height: 5 },
      { kind: 'savannengras', pos: [0, 1, -122], size: [20, 7], n: 12, avoid: [[0, -122.5, 2.4], [0, -119, 1.5]] },
      { kind: 'felsbrocken', pos: [0, 1, -125], size: [22, 2], n: 3, avoid: [[0, -122.5, 2.6]] },
    ] },
    plat(-158, -165),
    { type: 'deco_w5', items: [{ kind: 'akazie', pos: [-9, 1, -161], height: 5 }, { kind: 'termitenhuegel', pos: [9, 1, -160], size: 1.6 }] },
    { type: 'drehbruecke', id: 'dreh', pos: [0, 1, -170.5], length: 11, width: 2.6, yaw: Math.PI / 2, mode: 'step', wait: 3, turn: 1.4 },
    plat(-176, -182),

    // ---------------- S5 Torte
    plat(-182, -184),
    sign(-11, 1, -183, 'Rot-Blau-Flipper'),
    { type: 'flipper', id: 'felder', pos: [0, 1, -190], grid: [4, 6], cell: 2 },
    plat(-196, -198),
    { type: 'flipper', id: 'wechsel', platforms: [{ pos: [0, 1, -200], size: [3, 2.2], color: 'blau' }, { pos: [0, 1, -204], size: [3, 2.2], color: 'rot' }, { pos: [0, 1, -208], size: [3, 2.2], color: 'blau' }] },
    plat(-210, -218),
    { type: 'deco_w5', items: [{ kind: 'tortenstueck', pos: [-10, 1, -214], size: 2.2 }, { kind: 'kerzen', pos: [10, 1, -213], n: 4 }] },

    // ---------------- S6 Schleich-Festung
    plat(-218, -236),
    sign(-11, 1, -219, 'Suchscheinwerfer'),
    { type: 'wall', pos: [-4, 1, -228], size: [3, 2.4, 1] },
    { type: 'platform', pos: [6, 3.2, -224], size: [4.4, 0.4, 4.4] },   // Unterstand: verdeckt die Figur vor dem Licht
    { type: 'suchscheinwerfer', id: 'licht', path: [[-8, 1, -224], [8, 1, -224]], speed: 2.4, radius: 2.0, lamp: [-2, 10, -231] },

    // ---------------- S7 Tempel
    plat(-236, -270),
    sign(-11, 1, -237, 'Kippquader'),
    { type: 'kippquader', id: 'kq1', pos: [-5, 1, -241], size: [2, 4, 2], steps: ['-z', '-z'], wait: 1.4 },
    { type: 'kippquader', id: 'kq2', pos: [5, 1, -241], size: [3, 3, 0.8], hole: [1.5, 1.5], steps: ['-z'], wait: 1.6, start: 'signal' },
    { type: 'deco_w5', items: [
      { kind: 'tempelsaeulen', from: [-11.5, 1, -242], to: [-11.5, 1, -258], every: 4 },
      { kind: 'steinkopf', pos: [10.5, 1, -250], size: 2.4, yaw: Math.PI },
      { kind: 'obelisk', pos: [10.5, 1, -258], height: 6 },
      { kind: 'steinplatten', pos: [0, 1, -250], size: [6, 6] },
      { kind: 'kristalle', pos: [-11, 1, -265], n: 4 }, { kind: 'grubenbalken', pos: [-8, 1, -258.6], width: 4, height: 3.2, yaw: Math.PI / 2 },
      { kind: 'grubenlampe', pos: [-8, 4.2, -258.6] },
    ] },
    { type: 'multilift', id: 'dreier', pos: [-8, 1, -262], rise: 4, need: 3, size: [3, 0.5, 3] },
    { type: 'platform', pos: [-8, 5, -267], size: [3, 0.6, 3] },
    { type: 'island', pos: [0, -4, -274], size: [26, 2.5, 8], under: 0 },
    { type: 'lava', pos: [0, -1.5, -274], size: [26, 1, 8], color: 'blau' },
    { type: 'donutblock', id: 'donuts', from: [0, 0, -270.5], to: [0, 0, -277.5], delay: 0.5, respawn: 3 },

    // ---------------- S8 Ziel
    plat(-278, -298),
  ],
  items: [
    // S1 Schlüsselmünzen und versteckte Warp-Box
    { kind: 'schluesselmuenze', pos: [-6, 1.2, -9], group: 'tor', onAll: { reveal: 'warp1' } },
    { kind: 'schluesselmuenze', pos: [6, 1.2, -9], group: 'tor' },
    { kind: 'schluesselmuenze', pos: [-8, 1.2, -16], group: 'tor' },
    { kind: 'schluesselmuenze', pos: [8, 3.2, -14], group: 'tor' },
    { kind: 'schluesselmuenze', pos: [0, 1.2, -20], group: 'tor' },
    { kind: 'warpbox', id: 'warp1', pos: [3, 1, -22], target: 'warp2', hidden: true },
    { kind: 'warpbox', id: 'warp2', pos: [40, 6, -12], target: 'warp1' },
    // S5 Kugel-Rätsel
    { kind: 'schiebekugel', id: 'kugel', pos: [-4, 1, -213], size: 1.6 },
    { kind: 'pfeld', id: 'kugelfeld', pos: [4, 1, -213], need: 1, size: [2.2, 2.2], on: { coins: 5 } },
    // S7 Spiegelfrüchte für den 3er-Lift
    { kind: 'powerup', pos: [-4, 1, -258], power: 'spiegel' },
  ],
  checkpoint: [0, 1, -116],
  stars: [
    [8, 4.6, -14],
    [-8, 6.4, -267],
    [0, 2.2, -192],
  ],
  goal: [0, 1, -292],
  marks: {
    keys: [0, 1, -12], warp: [3, 1, -22], station: [0, 1, -24.5], river: [0, -1, -40], beach: [0, 1, -76.5],
    trap0: [0, 1, -81], trap1: [0, 1, -84.5], pendel0: [0, 1, -102], pendel1: [0, 1, -114],
    kanone: [0, 1, -120], kanoneZiel: [0, 1, -162.5], dreh0: [0, 1, -164], dreh1: [0, 1, -177],
    felder0: [0, 1, -183], wechsel0: [0, 1, -197], kugel: [-6.5, 1, -213], licht: [0, 1, -221], dach: [6, 1, -224],
    kq: [-5, 1, -239], kqFront: [-5, 1, -245], kq2: [5, 1, -239], lift: [-8, 1.6, -262], donut0: [0, 1, -268.6],
    goal: [0, 1, -282],
  },
};
