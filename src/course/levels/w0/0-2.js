// Bausteinpark (0-2): jeder Sonder-Baustein für Welt 1 in einer eigenen kleinen Station mit Schild, eigener
// Kameraschiene und benannten Punkten (marks) für tests/course_blocks.mjs. Level verläuft nach −Z.
//   S0  Start                         z    6 …   −6
//   S1  Glasröhre (Gabelung, Kanone)   z   −6 …  −38
//   S2  Kipp-Schaltfelder              z  −38 …  −70   (fest: Weg erscheint; fahrend + Wechselschalter: Stern, Absturz)
//   S3  Laternen                       z  −70 …  −90
//   S4  Unsichtbare Blockkette         z  −90 … −106   (Stempel auf dem Sims)
//   S5  Kristall-Raum                  z −106 … −124
//   S6  Warp-Box / Rätselbox           z −124 … −140   (Räume abseits bei x 80 und x 110)
//   S7  POW-Block                      z −140 … −156   (Röhre unter Ziegeln → Druckschalter-Raum bei x 140)
//   S9  Wolken, Wolkenkanone           z −156 … −196   (Münzhimmel bei y ≈ 40)
//   S10 Sternenring, Zeitring          z −196 … −214
//   S11 Fang-Hasen                     z −214 … −238
//   S12 Endlos-/Roulette-Block         z −238 … −252
//   S13 Fallende Plattformen           z −252 … −286
//   S14 Krallenrad                     z −286 … −306
//   S15 Graue Blockwand                z −306 … −322
//   S16 Kobold, Pixel-Ei               z −322 … −338
//   S17 Kisten, Truhe, Baum            z −338 … −354
//   S18 Ziel                           z −354 … −370
//   S19 Fluss (Reit-Level 1-4)         abseits x −74 … −54, z −6 … −86 (Floß mit Pflaume, Temposchwelle, Schanze,
//                                      Felsen, Kehre, Wasserfall 6 m, Ausstieg am Ufer)

const sign = (x, z, text, y = 1) => ({ type: 'sign', pos: [x, y, z], text });
const ground = (z0, z1, w = 28, x = 0) => ({ type: 'island', pos: [x, 0, (z0 + z1) / 2], size: [w, 1, Math.abs(z1 - z0)], under: 2 });
const line = (from, to, n) => ({ kind: 'coins', from, to, n });

export const LEVEL = {
  id: '0-2',
  world: 0,
  title: 'Bausteinpark',
  archetype: 'parcours',
  theme: 'grass',
  music: 'course_grass',
  timeLimit: 999,
  start: { pos: [0, 1, 3], yaw: Math.PI / 2 },
  camera: [
    { from: 8, to: -6, pitch: 46, dist: 14 },
    { from: -6, to: -38, pitch: 50, dist: 16 },
    { from: -38, to: -70, pitch: 50, dist: 15 },
    { from: -70, to: -90, pitch: 48, dist: 14 },
    { from: -90, to: -106, pitch: 46, dist: 15, yaw: -10 },
    { from: -106, to: -124, pitch: 52, dist: 14 },
    { from: -124, to: -140, pitch: 48, dist: 14 },
    { from: -140, to: -156, pitch: 50, dist: 15 },
    { from: -156, to: -196, pitch: 50, dist: 15 },
    { from: -196, to: -214, pitch: 50, dist: 15 },
    { from: -214, to: -238, pitch: 54, dist: 16 },
    { from: -238, to: -252, pitch: 46, dist: 13 },
    { from: -252, to: -286, pitch: 50, dist: 15 },
    { from: -286, to: -306, pitch: 44, dist: 16, yaw: -12 },
    { from: -306, to: -322, pitch: 48, dist: 14 },
    { from: -322, to: -338, pitch: 44, dist: 13 },
    { from: -338, to: -354, pitch: 48, dist: 14 },
    { from: -354, to: -372, pitch: 46, dist: 15 },
    // Räume abseits (Warp-Box, Rätselbox, Druckschalter)
    { from: -120, to: -146, pitch: 54, dist: 13, x: 80, xLock: 0.5, area: [68, 94] },
    { from: -120, to: -146, pitch: 54, dist: 13, x: 110, xLock: 0.5, area: [98, 124] },
    { from: -136, to: -162, pitch: 54, dist: 13, x: 140, xLock: 0.5, area: [128, 154] },
    { from: -4, to: -90, pitch: 48, dist: 16, area: [-90, -45] },
  ],
  segments: [
    // ---------------- S0 Start
    ground(6, -6),
    sign(-6, 0, 'Bausteinpark'),
    { type: 'deco', items: [{ kind: 'tree', pos: [10, 1, 2], size: 4.4 }, { kind: 'flowers', pos: [6, 1, 0], size: [3, 2], n: 10 }, { kind: 'bush', pos: [-10, 1, 3] }] },

    // ---------------- S1 Glasröhre
    ground(-6, -38),
    sign(-11, -8, 'Glasröhre'),
    { type: 'glasspipe', id: 'gp1', radius: 1, speed: 12, coins: 4,
      path: [[-8, 2, -9], [-8, 2, -16], [-8, 4, -22], [-2, 4, -26], [3, 2, -30], [7, 2, -30]],
      branches: [{ at: 1, path: [[-11, 2, -19], [-12, 2, -26]] }] },
    sign(5, -6.5, 'Kanone', 1),
    { type: 'glasspipe', id: 'gp2', radius: 1, oneWay: true,
      path: [[5, 2, -9], [5, 2, -14], [5, 3, -18]], cannon: { target: [10, 3, -35], arc: 5 } },
    { type: 'platform', pos: [10, 1, -35], size: [3, 2, 3], color: 'red' },
    // Spülrohr: Gegner, die hineinlaufen, werden hindurchgespült
    { type: 'glasspipe', id: 'gp3', radius: 1, flush: true, path: [[12, 2, -13], [12, 2, -18], [12, 2.6, -23]] },

    // ---------------- S2 Kipp-Schaltfelder
    ground(-38, -70),
    sign(-11, -40, 'Kipp-Schaltfelder'),
    { type: 'switchtiles', id: 'sw_a', pos: [-6, 1, -45], grid: [3, 2], onAll: { reveal: 'weg_s2' } },
    { type: 'appear', id: 'weg_s2', color: 'blue', parts: [
      { pos: [-6, 1, -50], size: [2.4, 1.2, 2] }, { pos: [-6, 1, -52.5], size: [2.4, 2.4, 2] },
      { pos: [-6, 1, -55], size: [2.4, 3.6, 2] }, { pos: [-6, 1, -57.5], size: [2.4, 4.8, 2] }] },
    { type: 'platform', pos: [-6, 1, -61.5], size: [4, 5, 4], style: 'stone' },
    { type: 'switchtiles', id: 'sw_b', toggle: true, grid: [2, 2],
      platform: { id: 'lift_b', path: [[6, 3, -47], [6, 3, -59]], size: [4, 0.5, 4], speed: 1.6, wait: 1, color: 'purple' },
      onAll: { star: 0, drop: 'fp_s2' } },
    { type: 'fallplatform', id: 'fp_s2', trigger: 'signal', pos: [11, 4, -66], size: [3, 0.5, 3], respawn: 0, color: 'yellow' },

    // ---------------- S3 Laternen
    ground(-70, -90),
    sign(-11, -72, 'Laterne'),
    { type: 'platform', pos: [5, 6, -84], size: [3, 0.4, 0.6], style: 'wood' },
    { type: 'wall', pos: [6.3, 1, -84], size: [0.4, 5.4, 0.4], style: 'wood' },

    // ---------------- S4 Unsichtbare Blockkette
    ground(-90, -106),
    sign(-11, -92, 'Unsichtbare\nBlockkette'),
    { type: 'hiddenchain', id: 'chain', hint: true, lead: { pos: [-4, 1, -98], size: [3, 1, 1] },
      blocks: [[-1, 3, -98], [1.5, 5, -98], [4, 7, -98]] },
    { type: 'platform', pos: [8, 1, -98], size: [3, 7, 3], style: 'stone' },

    // ---------------- S5 Kristall-Raum
    ground(-106, -124),
    sign(-11, -108, 'Kristall-Raum'),
    { type: 'room', pos: [0, 1, -116], size: [6, 3, 6], top: 'grass', hatch: { at: [0, 0], size: [2, 2] } },
    { type: 'stairs', pos: [-8.5, 1, -116], dir: '+x', steps: 5, rise: 1, run: 1, width: 3 },

    // ---------------- S6 Warp-Box / Rätselbox
    ground(-124, -140),
    sign(-11, -126, 'Warp-Box\nRätselbox'),
    { type: 'warpbox', id: 'wb1', pos: [-5, 1, -132], target: 'wb2' },
    { type: 'warpbox', id: 'rb1', style: 'mystery', pos: [5, 1, -132], target: 'rb2' },
    // Warp-Raum (x 80)
    { type: 'room', pos: [80, 1, -132], size: [12, 3, 12], ceiling: false, open: ['+z'] },
    { type: 'warpbox', id: 'wb2', pos: [80, 1, -128], target: 'wb1' },
    // Rätselbox-Raum (x 110) mit Aufgabe: beide Pilzlinge besiegen → Stern
    { type: 'room', pos: [110, 1, -132], size: [12, 3, 12], ceiling: false },
    { type: 'warpbox', id: 'rb2', style: 'mystery', pos: [110, 1, -128], target: 'rb1',
      task: { area: { min: [104, 0, -138], max: [116, 5, -126] }, star: 1, pos: [110, 2.2, -135] } },

    // ---------------- S7 POW-Block (Röhre unter Ziegeln → Druckschalter-Raum)
    ground(-140, -156),
    sign(-11, -142, 'POW-Block'),
    { type: 'pipe', id: 'p_pow', pos: [7, 1, -151], height: 1.5, target: 'p_ps' },
    // Druckschalter-Raum (x 140)
    { type: 'room', pos: [140, 1, -148], size: [12, 3, 12], ceiling: false },
    { type: 'pipe', id: 'p_ps', pos: [135, 1, -144], height: 1.5, target: 'p_pow' },

    // ---------------- S9 Wolken, Wolkenkanone, Münzhimmel
    ground(-156, -164),
    sign(-11, -158, 'Wolken\nWolkenkanone'),
    { type: 'cloud', pos: [-6, 3, -160], size: [3, 0.6, 3] },
    { type: 'cloud', pos: [-2, 1.4, -167], size: [3, 0.6, 3] },
    { type: 'cloud', pos: [-2, 2.4, -171], size: [3, 0.6, 3] },
    { type: 'cloud', id: 'cloud_mov', path: [[-5, 3, -175.5], [2, 3, -175.5]], size: [3, 0.6, 3], speed: 2 },
    { type: 'cloud', pos: [-1, 2.4, -180], size: [3, 0.6, 3] },
    ground(-184, -196),
    { type: 'cloudcannon', pos: [8, 1, -160], target: [8, 39.8, -170], arc: 4 },
    { type: 'cloud', pos: [8, 39, -172], size: [6, 0.8, 10] },
    { type: 'cloud', pos: [8, 39.5, -181], size: [5, 0.8, 5] },
    { type: 'cloud', pos: [8, 40, -188], size: [5, 0.8, 5] },
    { type: 'pipe', id: 'p_sky', pos: [9.5, 40.8, -188.5], height: 1.2, target: [8, 1.2, -188] },

    // ---------------- S10 Sternenring, Zeitring
    ground(-196, -214),
    sign(-11, -198, 'Sternenring\nZeitring'),

    // ---------------- S11 Fang-Hasen
    ground(-214, -238),
    sign(-11, -216, 'Fang-Hase'),
    { type: 'deco', items: [{ kind: 'fence', from: [-12, 1, -219], to: [-2, 1, -219] }, { kind: 'flowers', pos: [-6, 1, -232], size: [4, 2], n: 12 }] },

    // ---------------- S12 Endlos-/Roulette-Block
    ground(-238, -252),
    sign(-11, -240, 'Endlos-Block\nRoulette-Block'),

    // ---------------- S13 Fallende Plattformen
    ground(-252, -260),
    sign(-11, -254, 'Fallende\nPlattform'),
    { type: 'fallplatform', id: 'fall1', pos: [0, 1, -263], size: [2.5, 0.5, 2.5] },
    { type: 'fallplatform', pos: [0, 1.5, -267], size: [2.5, 0.5, 2.5] },
    { type: 'fallplatform', pos: [0, 1, -271], size: [2.5, 0.5, 2.5] },
    ground(-274, -286),

    // ---------------- S14 Krallenrad
    ground(-286, -306),
    sign(-11, -288, 'Krallenrad'),
    { type: 'clawwheel', id: 'wheel', pos: [0, 1, -298], size: [3, 7, 1], climb: 3,
      platforms: [
        { pos: [0.5, 4, -298], size: [2.5, 0.5, 1], dir: [1, 0], length: 3.5 },
        { pos: [0.5, 6.5, -298], size: [2.5, 0.5, 1], dir: [1, 0], length: 5.5, color: 'orange' }] },
    { type: 'platform', pos: [9, 1, -298], size: [3, 8.5, 3], style: 'stone' },

    // ---------------- S15 Graue Blockwand
    ground(-306, -322),
    sign(-11, -308, 'Graue\nBlockwand'),
    { type: 'megawall', id: 'mw', pos: [0, 1, -316], size: [6, 3, 1] },
    { type: 'wall', pos: [-4.5, 1, -316], size: [3, 3, 1], style: 'stone' },
    { type: 'wall', pos: [4.5, 1, -316], size: [3, 3, 1], style: 'stone' },

    // ---------------- S16 Kobold, Pixel-Ei
    ground(-322, -338),
    sign(-11, -324, 'Kobold\nPixel-Ei'),
    { type: 'platform', pos: [7, 1, -327], size: [2, 2, 2], style: 'wood' },
    { type: 'wall', pos: [0, 1, -337], size: [10, 5, 1], style: 'stone' },
    { type: 'deco', items: [{ kind: 'tree', pos: [-8, 1, -330], size: 4.6, color: 'green' }] },

    // ---------------- S17 Kisten, Truhe, Baum
    ground(-338, -354),
    sign(-11, -340, 'Kisten\nTruhe, Baum'),

    // ---------------- S18 Ziel
    ground(-354, -370),
    { type: 'killplane', y: -14 },

    // ---------------- S19 Fluss (abseits bei x ≈ −64): Floß mit Pflaume, Temposchwelle, Schanze, Felsen, Kehre,
    // Wasserfall, Ausstieg
    { type: 'island', pos: [-70, 0, -9.25], size: [14, 1, 6.5], top: 'stone', under: 0 },
    sign(-74, -7, 'Fluss\nFloß mit Pflaume'),
    { type: 'river', id: 'fluss', width: 8, depth: 2.5, speed: 4, open: ['start'],
      path: [[-70, 0.6, -12], [-70, 0.6, -46], [-58, 0.6, -46], [-58, 0.6, -60], [-58, -5.4, -61], [-58, -5.4, -82]] },
    { type: 'ramp', pos: [-70, -1.9, -34], size: [4, 3.3, 4], axis: 'z', dir: -1 },
    { type: 'riverrock', pos: [-72.6, 0.6, -26], size: 1 },
    { type: 'riverrock', pos: [-60.5, 0.6, -52], size: 0.9 },
    { type: 'island', pos: [-58, -8, -85], size: [8, 2.9, 5], top: 'sand', under: 0 },   // Strand am Ende
  ],
  blocks: [
    { kind: 'question', pos: [-6, 3.4, -290], content: 'krallenAnzug' },
    { kind: 'question', pos: [-6, 3.4, -311], content: 'riesentrank' },
    // Ziegel über der Röhre (POW legt sie frei)
    { kind: 'brick', pos: [6.5, 2.5, -151.5] }, { kind: 'brick', pos: [7.5, 2.5, -151.5] },
    { kind: 'brick', pos: [6.5, 2.5, -150.5] }, { kind: 'brick', pos: [7.5, 2.5, -150.5] },
  ],
  enemies: [
    { kind: 'pilzling', id: 'pz_flush', pos: [12, 1, -8.5], dir: [0, -1], speed: 1.6 },
    { kind: 'pilzling', id: 'pz_room1', pos: [107, 1, -135], path: [[106, 1, -135], [109, 1, -135]] },
    { kind: 'pilzling', id: 'pz_room2', pos: [113, 1, -135], path: [[111, 1, -135], [114, 1, -135]] },
    { kind: 'pilzling', id: 'pz_pow1', pos: [-2, 1, -145], path: [[-4, 1, -145], [0, 1, -145]] },
    { kind: 'pilzling', id: 'pz_pow2', pos: [-6, 1, -152], path: [[-8, 1, -152], [-4, 1, -152]] },
  ],
  items: [
    // S2 Truhe auf dem Sockel hinter dem erscheinenden Weg
    { kind: 'chest', pos: [-6, 6, -61.5], content: 'coins:5' },
    // S3 Laternen und versteckte Münzen
    { kind: 'lantern', id: 'lant1', pos: [-3, 1, -78], radius: 7 },
    { ...line([-1, 1.3, -80], [3, 1.3, -80], 5), hiddenUntilLit: true },
    { kind: 'lantern', id: 'lant2', pos: [5, 3.6, -84], hanging: true, radius: 5, duration: 8 },
    { kind: 'coins', pos: [5, 1.3, -86.5], r: 1.5, n: 6, hiddenUntilLit: true },
    // S5 im Kristall-Raum
    { kind: 'coins', pos: [0, 1.3, -116], r: 1.8, n: 6 },
    { kind: 'crate', pos: [2, 1, -118], content: 'oneup' },
    // S6 Warp-Raum
    { kind: 'coins', pos: [80, 1.3, -134], r: 3, n: 8 },
    // S7 POW
    { kind: 'pow', id: 'pow1', pos: [2, 1, -148], uses: 3, radius: 9 },
    // S8 Druckschalter-Raum
    { kind: 'pswitch', id: 'ps1', pos: [140, 1, -150], star: 0, time: 10,
      coins: { from: [136, 1.3, -153], to: [144, 1.3, -153], n: 8 } },
    // S9 Münzhimmel
    line([8, 40.3, -170], [8, 40.3, -176], 6),
    line([8, 40.8, -179.5], [8, 40.8, -182.5], 4),
    { kind: 'powerup', pos: [6.5, 40.8, -189], power: 'oneup' },
    // S10 Sternenring (8 Sternmünzen) und Zeitring (blaue Münzen)
    { kind: 'starring', id: 'ring1', pos: [-5, 1, -201], star: 2, time: 10,
      coins: [[-7, 1.2, -204], [-3, 1.2, -204], [-7, 1.2, -207], [-3, 1.2, -207], [-7, 1.2, -210], [-3, 1.2, -210], [-7, 1.2, -213], [-3, 1.2, -213]] },
    { kind: 'timering', id: 'ring2', pos: [5, 1, -201], time: 10, reward: { power: 'oneup' },
      coins: { pos: [5, 1.2, -208], r: 3, n: 8 } },
    // S11 Hasen
    { kind: 'bunny', id: 'bunny1', pos: [-5, 1, -226], star: 1, area: { pos: [-5, 1, -226], r: 6 } },
    { kind: 'bunny', id: 'bunny2', size: 'big', pos: [6, 1, -229], area: { pos: [6, 1, -229], r: 5 } },
    // S12 Blöcke
    { kind: 'endlessblock', id: 'endless', pos: [-3, 3.4, -245], window: 1.2 },
    { kind: 'rouletteblock', id: 'roulette', pos: [3, 3.4, -245], contents: ['wachstumsbeere', 'krallen', 'funken', 'stern'], period: 0.5 },
    // S14 Belohnung oben am Krallenrad
    line([8.2, 10.3, -297], [9.8, 10.3, -299], 3),
    // S15 hinter der Blockwand
    line([-2, 1.3, -319], [2, 1.3, -319], 5),
    // S16 Kobolde und Pixel-Ei
    { kind: 'spotter', pos: [-6, 1, -331] },
    { kind: 'spotter', pos: [7, 3, -327] },
    { kind: 'pixelegg', id: 'egg', pos: [0, 1.4, -336.45], trigger: { pos: [0, 1, -333.5], r: 2 }, wait: 4 },
    // S17 Kisten, Truhe, Baum
    { kind: 'crate', id: 'crate1', pos: [-5, 1, -344], content: 'coins:3' },
    { kind: 'crate', pos: [-4, 1, -344], content: 'coin' },
    { kind: 'crate', pos: [-4.5, 2, -344], content: 'wachstumsbeere' },
    { kind: 'chest', id: 'chest1', pos: [3, 1, -346], content: 'coins:5' },
    { kind: 'itemtree', id: 'tree1', pos: [8, 1, -348], content: 'krallen' },
    // S19 Fluss
    { kind: 'raft', id: 'floss', pos: [-70, 0.6, -15.5] },
    { kind: 'speedwave', pos: [-70, 0.6, -21] },
    line([-70, 1.6, -24], [-70, 1.6, -30], 4),
    line([-66, 1.6, -46], [-61, 1.6, -46], 3),
    line([-58, -4.4, -66], [-58, -4.4, -74], 4),
  ],
  checkpoint: [0, 1, -158],
  stars: [],
  stamp: [8, 8.2, -98],
  goal: [0, 1, -364],
  marks: {
    gp_in: [-8, 1, -6.8],
    gp_out_main: [7, 2, -30],
    gp_out_branch: [-12, 2, -26],
    cannon_in: [5, 1, -6.8],
    cannon_target: [10, 3, -35],
    tiles_a: [-6, 1, -45],
    weg_top: [-6, 6, -61.5],
    lift_b: [6, 3.5, -47],
    fp_s2: [11, 4.5, -66],
    lantern1: [-3, 1, -76.6],
    lantern2: [5, 1, -84],
    chain_lead: [-4, 2, -98],
    room_top: [0, 5, -116],
    wb1: [-5, 2.2, -132],
    rb1: [5, 2.2, -132],
    wb2: [80, 1, -126],
    rb_room: [110, 1, -131],
    pow: [2, 1, -146.8],
    pow_pipe: [7, 2.5, -151],
    ps: [140, 1, -150],
    cannon_cloud: [8, 3.2, -160],
    sky: [8, 39.8, -170],
    cloud_mov: [-5, 3.6, -175.5],
    cloud_low: [-6, 1, -160],
    ring1: [-5, 1, -199],
    ring2: [5, 1, -199],
    bunny1: [-5, 1, -226],
    bunny2: [6, 1, -229],
    endless: [-3, 1, -245],
    roulette: [3, 1, -245],
    fall1: [0, 1.5, -263],
    wheel: [0, 1, -296.8],
    megawall: [0, 1, -314],
    egg: [0, 1, -333.5],
    crate1: [-5, 1, -342.4],
    chest1: [3, 1, -344.4],
    tree1: [8, 1, -345.6],
    goal: [0, 1, -361],
    dock: [-70, 1, -11],
    raft: [-70, 0.6, -15.5],
    beach: [-58, -5.1, -85],
  },
};
