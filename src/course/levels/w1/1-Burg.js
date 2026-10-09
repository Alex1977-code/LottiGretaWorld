// 1-Burg „Brummbärs Abendautobahn“ (Archetyp boss, Bauplan 1-Burg): Hochstraße über der Abendstadt. Kickbomben,
// Kanonen, eine Baustelle mit Stampfsteinen und beweglichen Plattformen, Pilzlingstürme – dann durch die Steinwand
// zur Bossstraße: Baron Brummbär rast im roten Sportwagen rückwärts vor der Heldin her und wirft Kickbomben, die sie
// zurückkicken muss (3 Treffer). Danach Warp-Box zum Rastplatz mit Zielmast und dem befreiten Krümel.
//
// Abschnitte (Straße y = 0, Fahrtrichtung −Z; Bossstraße y = 8):
//   1 Startstraße     z  +12 … −32   Start-Ampel, Krallen-?-Block, Sternenring (8 Sternmünzen → Stern 2), zwei
//                                    Kickbomben, Pilzlingsturm; links die Mautmauer (Kletterwand, oben Easter-Egg)
//   2 Kanonen-Zone    z  −32 … −64   zwei Kanonen auf Balkonen feuern Kickbomben, Betonleitwände, Ziegel mit Münzen
//   3 Gefahrenstrecke z  −64 … −110  Baustelle (6 m breit) mit drei Stampfsteinen (4 m Fall), Lücke mit zwei
//                                    beweglichen Plattformen; rechts der Turm-Hof: Krallenrad (Kletterwand) fährt
//                                    Plattformen aus dem Turm → Stern 1 oben; unten im Turm hinter grauer Blockwand
//                                    der Stempel (Kanone liefert Bomben davor)
//   4 Kurzer Weg      z −110 … −140  Checkpoint, Pilzlingsturm mit Stern 3 (5 Stufen) und zwei kleine Türme
//   5 Ziegelwand      z −140 … −160  Steinwand quer über die Straße (Überführung darüber) – Bomben hineinkicken,
//                                    dahinter die Warp-Box
//   6 Bossstraße      z −292 … −420  Ankunft unten, Treppe 8 m hoch, fahrende Straße (Laufband-Illusion), Baron
//   7 Rastplatz       z −480 … −520  befreiter Krümel im Käfig, Zielmast
// Sterne: 1 (Index 0) oben auf dem Turm (Krallenrad), 2 (Index 1) Sternenring, 3 (Index 2) Pilzlingsturm.
// Stempel: hinter der grauen Blockwand im Turm. Easter-Egg: oben auf der Mautmauer 4 s still stehen → Pixel-Heldin.
// Gegner: 9 Pilzlingstürme (22 Pilzlinge), 3 Stampfsteine, Kickbomben (2 + Kanonen-Nachschub), Baron Brummbär.

const Y = 0;          // Fahrbahn
const B = 8;          // Bossstraße
const ZB = -341;      // Wagenmitte des Barons im Kampf

export const LEVEL = {
  id: '1-Burg',
  world: 1,
  title: 'Brummbärs Abendautobahn',
  archetype: 'boss',
  theme: 'highway',
  music: 'course_boss',
  timeLimit: 500,
  start: { pos: [0, Y, 8], yaw: Math.PI / 2 },
  killY: -12,
  camera: [
    { from: 14, to: -62, pitch: 44, dist: 13.5, ahead: 2.4 },
    { from: -62, to: -110, pitch: 48, dist: 13, ahead: 2.2 },
    { from: -110, to: -165, pitch: 44, dist: 13.5, ahead: 2.4 },
    { from: -285, to: -317, pitch: 42, dist: 13, ahead: 2 },
    { from: -317, to: -360, pitch: 38, dist: 19, fov: 42, x: 0, xLock: 0.5, ahead: 1, lead: 0.3 },
    { from: -476, to: -525, pitch: 42, dist: 12.5, ahead: 2 },
  ],
  boss: {
    id: 'baron', name: 'Baron Brummbär', speed: 10,
    trigger: { min: [-7, B - 0.5, -336], max: [7, B + 6, -324.6] },
    lock: { min: [-7, B, -323.4], max: [7, B + 5, -322.8] },
    warp: 'warp_sieg', warpPos: [0, B, -330], warpTo: [0, Y + 0.3, -486],
  },
  segments: [
    { type: 'skyline' },
    { type: 'killplane', y: -12 },
    // ---------------------------------------------------------------- 1 Startstraße
    { type: 'road', from: [0, Y, 12], to: [0, Y, -2], rails: 'right', lamps: 0 },
    { type: 'road', from: [0, Y, -2], to: [0, Y, -32], lampSide: 'both' },
    // Mautmauer links (Kletterwand, nur mit Krallen) – oben das Easter-Egg
    { type: 'wall', pos: [-7.6, Y - 1.4, 4.5], size: [3.2, 7.4, 13], climbable: true },
    { type: 'hwdeco', items: [
      { kind: 'tlight', pos: [5.3, Y, 6.2], yaw: -Math.PI / 2, mode: 'start' },
      { kind: 'sign', pos: [5.4, Y, 1], slot: 1, w: 2, h: 1.4, post: 2.2 },
      { kind: 'barrier', from: [-5.5, Y, 11.5], to: [5.5, Y, 11.5] },
      { kind: 'cones', from: [-4.5, Y, 10.4], to: [4.5, Y, 10.4], n: 5 },
      { kind: 'car', pos: [-3.6, Y, -22], yaw: Math.PI / 2, color: 0x4fb0ff },
      { kind: 'gantry', z: -30, y: Y, x0: -6.6, x1: 6.6, signs: [{ slot: 0, x: -2.4, w: 4.6 }, { slot: 1, x: 2.8, w: 2.2 }] },
    ] },
    // ---------------------------------------------------------------- 2 Kanonen-Zone
    { type: 'road', from: [0, Y, -32], to: [0, Y, -64], lampSide: 'left' },
    { type: 'platform', pos: [8.7, Y - 1.4, -40], size: [5, 1.4, 7], style: 'stone' },
    { type: 'platform', pos: [-8.7, Y - 1.4, -54], size: [5, 1.4, 7], style: 'stone' },
    { type: 'hwdeco', items: [
      { kind: 'sign', pos: [5.5, Y, -33.5], slot: 2, w: 2.4, h: 1.2, post: 2.0 },
      { kind: 'barrier', from: [-3.2, Y, -46], to: [0.2, Y, -46] },
      { kind: 'barrier', from: [1.4, Y, -57.5], to: [4.6, Y, -57.5] },
      { kind: 'car', pos: [3.6, Y, -36.5], yaw: Math.PI / 2, color: 0xffcf3a },
      { kind: 'cones', from: [-5, Y, -61], to: [-1.5, Y, -61], n: 4 },
    ] },
    // ---------------------------------------------------------------- 3 Gefahrenstrecke (Baustelle)
    { type: 'road', from: [0, Y, -64], to: [0, Y, -80], width: 6, lanes: 2, lamps: 0, city: false },
    { type: 'hwdeco', items: [
      { kind: 'barrier', from: [3.4, Y, -63.2], to: [5.6, Y, -63.2] },
      { kind: 'barrier', from: [-5.6, Y, -63.2], to: [-3.4, Y, -63.2] },
      { kind: 'sign', pos: [-4.4, Y, -62.6], slot: 3, w: 2.2, h: 1.1, post: 1.8 },
      { kind: 'sign', pos: [4.4, Y, -62.6], slot: 6, w: 1.4, h: 1.4, post: 1.8 },
      { kind: 'cones', from: [-2.6, Y, -79.4], to: [2.6, Y, -79.4], n: 2 },
    ] },
    { type: 'mover', path: [[-3.6, Y - 0.5, -84], [3.6, Y - 0.5, -84]], size: [3, 0.5, 3], speed: 2.2, wait: 0.6, color: 'yellow' },
    { type: 'mover', path: [[3.6, Y - 0.5, -89.5], [-3.6, Y - 0.5, -89.5]], size: [3, 0.5, 3], speed: 2.2, wait: 0.6, color: 'orange' },
    { type: 'road', from: [0, Y, -93], to: [0, Y, -95], rails: 'left', lamps: 0, markings: false },
    { type: 'road', from: [0, Y, -95], to: [0, Y, -108], rails: 'left', lamps: 0 },
    // Turm-Hof rechts: Boden, Turm (hohl unten: Stempel-Kammer hinter grauer Blockwand), Krallenrad
    { type: 'platform', pos: [10.6, Y - 1.4, -104.5], size: [9.2, 1.4, 21], style: 'stone' },
    { type: 'wall', pos: [10.75, Y, -113], size: [1.5, 11, 6] },
    { type: 'wall', pos: [14.25, Y, -113], size: [1.5, 11, 6] },
    { type: 'wall', pos: [12.5, Y + 3, -113], size: [2, 8, 6] },
    { type: 'wall', pos: [12.5, Y, -115], size: [2, 3, 2] },
    { type: 'megawall', pos: [12.5, Y, -109.5], size: [2, 3, 1] },
    { type: 'clawwheel', id: 'krallenrad', pos: [8, Y, -104], size: [3, 6, 2], face: '+z', climb: 3,
      platforms: [
        { pos: [11.3, Y + 5.5, -113], size: [2.2, 0.5, 2.4], dir: [0, 1], length: 4.2, color: 'yellow' },
        { pos: [13.7, Y + 8, -113], size: [2.2, 0.5, 2.4], dir: [0, 1], length: 3.6, color: 'orange' },
      ] },
    // ---------------------------------------------------------------- 4 Kurzer Weg
    { type: 'road', from: [0, Y, -108], to: [0, Y, -140], lampSide: 'both' },
    { type: 'hwdeco', items: [
      { kind: 'gantry', z: -124, y: Y, x0: -6.6, x1: 6.6, signs: [{ slot: 7, x: -2.6, w: 3.4 }, { slot: 5, x: 2.4, w: 3.4 }] },
      { kind: 'car', pos: [4, Y, -116], yaw: Math.PI / 2, color: 0xff7ac0 },
    ] },
    // ---------------------------------------------------------------- 5 Ziegelwand
    { type: 'road', from: [0, Y, -140], to: [0, Y, -160], lamps: 0 },
    { type: 'platform', pos: [8.7, Y - 1.4, -141], size: [5, 1.4, 6], style: 'stone' },
    { type: 'hwdeco', items: [
      { kind: 'bridge', z: -146, y: Y + 5, x0: -22, x1: 22, width: 4, solid: true },
      { kind: 'barrier', from: [-5.2, Y, -159.4], to: [5.2, Y, -159.4] },
      { kind: 'sign', pos: [-5.4, Y, -139], slot: 2, w: 2.2, h: 1.1, post: 1.8 },
    ] },
    // ---------------------------------------------------------------- 6 Bossstraße
    { type: 'road', from: [0, Y, -290], to: [0, Y, -313], width: 10, lanes: 2, lamps: 0 },
    { type: 'stairs', pos: [0, Y, -304], dir: '-z', steps: 8, rise: 1, run: 1.2, width: 6, style: 'stone' },
    { type: 'bossroad', id: 'bossroad', from: [0, B, -313.6], to: [0, B, -440], width: 14, lanes: 4 },
    { type: 'hwdeco', items: [
      { kind: 'sign', pos: [-4.2, Y, -293], slot: 0, w: 3.2, h: 1.4, post: 1.6 },
      { kind: 'block', min: [-7, B, -348.5], max: [7, B + 6, -347.8] },
    ] },
    // ---------------------------------------------------------------- 7 Rastplatz
    { type: 'island', pos: [0, Y - 2, -500], size: [24, 2, 38], under: 3 },
    { type: 'hwdeco', items: [
      { kind: 'sign', pos: [-6, Y, -484], slot: 4, w: 3, h: 1.3, post: 2 },
      { kind: 'car', pos: [7, Y, -492], yaw: Math.PI / 2, color: 0x5ad04a },
      { kind: 'car', pos: [7, Y, -499], yaw: Math.PI / 2, color: 0xa865ff },
      { kind: 'lamp', pos: [-9.5, Y, -490], side: -1 }, { kind: 'lamp', pos: [9.5, Y, -506], side: 1 },
    ] },
    { type: 'deco', items: [
      { kind: 'tree', pos: [-9, Y, -514], size: 5, color: 'green' }, { kind: 'tree', pos: [9, Y, -515], size: 4.6 },
      { kind: 'tree', pos: [-9.5, Y, -500], size: 4.2 }, { kind: 'bush', pos: [-6.5, Y, -508], size: 0.8 },
      { kind: 'flowers', pos: [3, Y, -486], size: [4, 2], n: 10 }, { kind: 'flowers', pos: [-2, Y, -515], size: [5, 2], n: 10 },
      { kind: 'fence', from: [-11.5, Y, -482.5], to: [-11.5, Y, -517] }, { kind: 'fence', from: [11.5, Y, -482.5], to: [11.5, Y, -517] },
    ] },
  ],
  blocks: [
    { kind: 'question', pos: [-3, Y + 3.2, 1.5], content: 'krallen' },
    { kind: 'question', pos: [-1.6, Y + 3.2, 1.5], content: 'coins:3' },
    // Ziegel mit Münzen (Kanonen-Zone) – Bomben sprengen sie auch
    { kind: 'brick', pos: [-1, Y, -50.5] }, { kind: 'brick', pos: [0, Y, -50.5], content: 'coins:4' }, { kind: 'brick', pos: [1, Y, -50.5] },
    { kind: 'brick', pos: [0, Y + 1, -50.5] },
    // Krallen-Anzug vor dem Turm-Hof (falls unterwegs verloren)
    { kind: 'question', pos: [3, Y + 3.2, -97], content: 'krallen' },
    // Steinwand quer über die Straße (nur Bomben/Riesentrank)
    { kind: 'blockwand', pos: [0, Y, -146], size: [11, 5, 1] },
  ],
  enemies: [
    // 1 Startstraße
    { kind: 'kickbombe', id: 'bombe1', pos: [-2, Y, -12], path: [[-4.5, Y, -12], [1.5, Y, -12]] },
    { kind: 'kickbombe', id: 'bombe2', pos: [3, Y, -17.5], path: [[0.5, Y, -17.5], [5, Y, -17.5]] },
    { kind: 'pilzlingsturm', id: 'turm_start', pos: [0, Y, -28], count: 3 },
    // 2 Kanonen
    { kind: 'bomb_cannon', id: 'kanone1', pos: [9, Y, -40], range: 15, interval: 3.4, area: { min: [-5.2, -63], max: [5.2, -33] } },
    { kind: 'bomb_cannon', id: 'kanone2', pos: [-9, Y, -54], range: 15, interval: 3.4, first: 2.2, area: { min: [-5.2, -63], max: [5.2, -33] } },
    { kind: 'pilzlingsturm', id: 'turm_k1', pos: [-2.5, Y, -42], count: 2 },
    { kind: 'pilzlingsturm', id: 'turm_k2', pos: [2.5, Y, -61], count: 2 },
    // 3 Gefahrenstrecke
    { kind: 'stampfstein', id: 'stein1', pos: [-1.05, Y + 4, -68] },
    { kind: 'stampfstein', id: 'stein2', pos: [1.05, Y + 4, -72.5] },
    { kind: 'stampfstein', id: 'stein3', pos: [-1.05, Y + 4, -77] },
    { kind: 'pilzlingsturm', id: 'turm_g1', pos: [-3, Y, -101], count: 2 },
    { kind: 'pilzlingsturm', id: 'turm_g2', pos: [9.5, Y, -97], count: 2, behavior: 'walk', path: [[8, Y, -97], [13, Y, -97]] },
    { kind: 'bomb_cannon', id: 'kanone_hof', pos: [14, Y, -96], yaw: Math.PI, aim: [12.5, Y, -105.6], range: 13, interval: 4.2, max: 1, flight: 1.0, fuse: 4.4 },
    // 4 Kurzer Weg
    { kind: 'pilzlingsturm', id: 'turm_stern', pos: [0, Y, -129], count: 5, carries: 'star:2', sight: 10 },
    { kind: 'pilzlingsturm', id: 'turm_w1', pos: [-3.5, Y, -120], count: 2 },
    { kind: 'pilzlingsturm', id: 'turm_w2', pos: [3.5, Y, -135], count: 2 },
    // 5 Ziegelwand
    { kind: 'bomb_cannon', id: 'kanone_wand', pos: [9, Y, -141], range: 15, interval: 3.0, first: 0.6, area: { min: [-5, -144.6], max: [5, -136] }, fuse: 3.8 },
    { kind: 'pilzlingsturm', id: 'turm_z', pos: [-3, Y, -137], count: 2 },
    // 6 Bossstraße
    { kind: 'baron', id: 'baron', pos: [0, B, ZB], lane: [-4.5, 4.5], arena: { x: [-5.8, 5.8], z: [ZB + 5, ZB + 17.2] }, hp: 3, drift: 6.5 },
  ],
  items: [
    { kind: 'starring', id: 'sternenring', pos: [2.5, Y, -6], star: 1, time: 12, coins: [
      [-4, Y + 0.3, -10], [-1.5, Y + 0.3, -13.5], [1.5, Y + 0.3, -16], [0, Y + 2.9, -19],
      [-3.6, Y + 2.25, -22], [0.5, Y + 0.3, -24.5], [4, Y + 0.3, -26.5], [4.6, Y + 0.3, -9],
    ] },
    { kind: 'pixelegg', id: 'pixel', pos: [-7.6, Y + 6, -1.2], trigger: { pos: [-7.6, Y + 6, 5], r: 2.6 }, wait: 4 },
    { kind: 'coins', from: [0, Y + 0.3, -66], to: [0, Y + 0.3, -78], n: 5 },
    { kind: 'coins', pos: [0, Y + 0.3, -100.5], r: 1.4, n: 6 },
    { kind: 'coins', from: [-4, Y + 0.3, -112], to: [4, Y + 0.3, -112], n: 5 },
    // Warp-Box hinter der Steinwand → Ankunft unten an der Treppe zur Bossstraße
    { kind: 'warpbox', id: 'warp_wand', pos: [0, Y, -151], target: [0, Y + 0.3, -296] },
    // nach dem Sieg (vom Boss-Archetyp aufgedeckt) → Rastplatz
    { kind: 'warpbox', id: 'warp_sieg', pos: [0, B, -330], target: [0, Y + 0.3, -486], hidden: true },
    { kind: 'coins', from: [-2, Y + 0.3, -300], to: [2, Y + 0.3, -300], n: 3 },
    // Rastplatz: befreiter Krümel
    { kind: 'rescue_friend', id: 'kruemel', pos: [-4, Y, -497], name: 'Krümel' },
    { kind: 'coins', pos: [3, Y + 0.3, -502], r: 1.6, n: 8 },
  ],
  checkpoint: [{ pos: [-3.6, Y, -112.5] }, { pos: [0, Y, -299] }],
  stars: [[12.5, Y + 11.2, -114.2]],
  stamp: [12.5, Y + 0.3, -112.4],
  goal: { pos: [0, Y, -511], height: 8 },
  marks: {
    start: [0, Y, 8], wallTop: [-7.6, Y + 6, 5], ring: [2.5, Y, -6], cannons: [0, Y, -40], works: [0, Y, -66],
    movers: [0, Y, -80], yard: [9, Y, -100], wheel: [8, Y, -102.6], megawall: [12.5, Y, -108], towerTop: [12.5, Y + 11, -114],
    starTower: [0, Y, -129], stoneWall: [0, Y, -143], warpWall: [0, Y, -151], arrival: [0, Y, -296], stairsTop: [0, B, -315],
    bossArena: [0, B, -330], rest: [0, Y, -486], goal: [0, Y, -511],
  },
};
