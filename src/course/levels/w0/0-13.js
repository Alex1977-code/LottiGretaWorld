// Winterwerkstatt (0-13): jeder Welt-3-Baustein in einer Station mit Schild, Kameraschiene und benannten Punkten
// (marks) für tests/course_w3_blocks.mjs. Thema snow; mit ?theme=<name> lässt sich jedes Welt-3-Thema ansehen.
// Level verläuft nach −Z; Plateaus (Oberseite y = 1, ab dem Rutschhang y = −3).
//   S0  Start (Iglu, Schneemann, Laternen)                       z    6 …   −6
//   S1  Schnee und Eis (Blöcke, Eiszapfen, Haufen, Tanne, Eis)   z   −6 …  −34
//   S2  Schienen (Weiche, Schalttafel, Schaltblock)              z  −34 …  −80   (Lücke −42 … −72)
//   S3  Spukhaus (Regal, Treppe, Sofa, Kronleuchter, Gemälde,    z  −80 … −140   (Drehraum x 60, Türhof x 90)
//       falscher Zielmast, Spuk-Tür)
//   S4  Lagune (Wasserschalter, Holzsteg, Steg, Röhren-Netz,     z −140 … −192
//       Korallen, Seetang, Blasen, Wrack, Wandriss)
//   S5  Rennstrecke (Startbogen, Boost-Tor/-Schräge, Sprungfeld, z −192 … −244   (Lücke −206 … −213)
//       Pilztrampolin, Banden, Rutschhang)
//   S6  Himmel (Kurbelrad, Bröckelblöcke, Goldring,              z −244 … −300   (Lücke −262 … −284), y −3
//       Kettenplattform, Wolkenlift)
//   S7  Zug, Zirkus, Pastell (Lok/Wagen/Flachwagen, Bahnsteig,   z −300 … −360
//       Parallelgleis, Zelt, Manege, Podest, Seilbahn, Pastell-
//       Blöcke, Endlos-Münzblock)
//   S8  Ziel                                                     z −360 … −372

const plat = (z0, z1, top = 1, w = 26, x = 0) => ({ type: 'island', pos: [x, top - 4, (z0 + z1) / 2], size: [w, 4, Math.abs(z1 - z0)], under: 0 });
const sign = (x, y, z, text) => ({ type: 'sign', pos: [x, y, z], text });

export const LEVEL = {
  id: '0-13',
  world: 0,
  title: 'Winterwerkstatt',
  archetype: 'parcours',
  theme: 'snow',
  music: 'course_snow',
  timeLimit: 999,
  start: { pos: [0, 1, 3], yaw: Math.PI / 2 },
  camera: [
    { from: 8, to: -6, pitch: 44, dist: 14 },
    { from: -6, to: -34, pitch: 48, dist: 15 },
    { from: -34, to: -80, pitch: 50, dist: 16 },
    { from: -80, to: -140, pitch: 48, dist: 15 },
    { from: -140, to: -192, pitch: 52, dist: 16 },
    { from: -192, to: -244, pitch: 48, dist: 16 },
    { from: -244, to: -300, pitch: 48, dist: 16 },
    { from: -300, to: -360, pitch: 48, dist: 17 },
    { from: -360, to: -374, pitch: 44, dist: 14 },
    // Räume abseits: Drehraum (x 60), Türhof (x 90)
    { from: -100, to: -120, pitch: 30, dist: 15, x: 60, xLock: 0.8, area: [52, 68] },
    { from: -116, to: -136, pitch: 46, dist: 13, x: 90, xLock: 0.6, area: [80, 100] },
  ],
  segments: [
    // ---------------- Kulisse (Schneefeld nur unter Start und S1; sonst offener Abgrund, damit die Kulisse jedes Themas
    // zu sehen ist – ?theme=…)
    { type: 'deco_w3', kind: 'schneeflaeche', pos: [0, -3, -14], size: [120, 50] },
    { type: 'deco_w3', shadow: false, items: [
      { kind: 'schneehuegel', pos: [-38, -3, -14], size: [30, 44], n: 8, height: [1, 3] },
      { kind: 'schneehuegel', pos: [38, -3, -14], size: [30, 44], n: 8, height: [1, 3] },
      { kind: 'tannen', pos: [-24, -3, -14], size: [10, 44], n: 9, scale: [0.9, 1.6] },
      { kind: 'tannen', pos: [24, -3, -14], size: [10, 44], n: 9, scale: [0.9, 1.6] },
      { kind: 'felsen', pos: [-46, -3, -14], size: [8, 40], n: 4, height: [2, 5] },
      { kind: 'felsen', pos: [46, -3, -14], size: [8, 40], n: 4, height: [2, 5] },
      { kind: 'herbstbaeume', pos: [15, -3, -310], size: [7, 12], n: 3 },
      { kind: 'korallen', pos: [-2, -3.4, -172], size: [10, 20], n: 5, gap: 2 },
    ] },

    // ---------------- S0 Start
    plat(6, -6),
    sign(-7, 1, 0, 'Winterwerkstatt'),
    { type: 'iglu', pos: [-8, 1, -2], yaw: -Math.PI / 2 },
    { type: 'deco_w3', items: [
      { kind: 'schneemann', pos: [8, 1, 0] },
      { kind: 'laternen', pos: [11, 1, 4], from: [11, 1, 4], to: [11, 1, -30], every: 8 },
      { kind: 'tanne', pos: [-11, 1, 4], size: 4 },
    ] },

    // ---------------- S1 Schnee und Eis
    plat(-6, -34),
    sign(-11, 1, -7, 'Schnee und Eis'),
    { type: 'schneebloecke', id: 'sbr', kind: 'schneeblock', pos: [-5, 3.2, -10], grid: [3, 1, 1], contents: { 1: 'coin' } },
    { type: 'eisblock', id: 'eis_hoch', pos: [-1, 3.2, -10], content: 'coins:3' },
    { type: 'eisblock', id: 'eis_f', pos: [2, 1, -12], content: 'coin' },
    { type: 'platform', pos: [8, 5.5, -14], size: [6, 0.6, 4], style: 'stone' },
    { type: 'eiszapfen', id: 'ez1', pos: [7, 5.5, -14] },
    { type: 'eiszapfen', id: 'ez2', pos: [9, 5.5, -14], length: 1.3 },
    { type: 'schneehaufen', id: 'haufen', pos: [-8, 1, -20], coins: 5 },
    { type: 'tanne', id: 'tanne1', pos: [-3, 1, -20], content: 'coins:3' },
    { type: 'eisflaeche', pos: [6, 1, -27], size: [8, 0.2, 10], edge: true },

    // ---------------- S2 Schienen
    plat(-34, -42),
    plat(-72, -80),
    sign(-9, 1, -35, 'Schienen'),
    { type: 'schiene', net: 'n1', path: [[0, 0.4, -37], [0, 0.4, -74]] },
    { type: 'schiene', net: 'n1', path: [[0, 0.4, -50], [-6, 0.4, -57], [-6, 0.4, -74]], radius: 3 },
    { type: 'schiene', net: 'n1', path: [[0, 0.4, -50], [6, 0.4, -57], [6, 0.4, -74]], radius: 3 },
    { type: 'schalttafel', id: 'tafel', net: 'n1', at: [0, 0.4, -38.5] },
    { type: 'schaltblock', id: 'sblock', pos: [4, 3.6, -38], net: 'n1' },

    // ---------------- S3 Spukhaus
    plat(-80, -140),
    sign(-11, 1, -82, 'Spukhaus'),
    { type: 'buecherregal', id: 'regal', pos: [-6, 1, -86], yaw: -Math.PI / 2, slide: [1, 0], range: [0, 2.5], onOpen: { reveal: 'stern_regal' } },
    { type: 'spuk_treppe', id: 'treppe', pos: [5, 1, -88], yaw: 0, steps: 4, from: [0, 0, -3], near: 4 },
    { type: 'wall', pos: [6.2, 1, -91.2], size: [3.2, 2.6, 2.6] },   // Versteck der Treppe (sie fährt aus der Wand)
    { type: 'spuk_sofa', id: 'sofa', pos: [0, 1, -98], yaw: -Math.PI / 2, rise: 4, back: 2.5 },
    { type: 'kronleuchter', id: 'leuchter', pos: [-8, 9, -100], chain: 1.2, scale: 1.6, axis: 'x', amp: 0.3, period: 3.2 },
    // Wand mit Nische hinter dem Gemälde (Lücke x 6.9 … 9.1, Rückwand z −108)
    { type: 'wall', pos: [5.45, 1, -106], size: [2.9, 5, 1] },
    { type: 'wall', pos: [10.55, 1, -106], size: [2.9, 5, 1] },
    { type: 'wall', pos: [8, 3.4, -106], size: [2.2, 2.6, 1] },
    { type: 'wall', pos: [8, 1, -108.5], size: [2.2, 2.4, 1] },
    { type: 'bilderrahmen', id: 'bild', pos: [8, 1.05, -105.5], yaw: -Math.PI / 2, size: [1.6, 2.0], warp: { id: 'bild_warp', target: [60, 1.2, -108] } },
    { type: 'deco_w3', items: [
      { kind: 'kerze', pos: [4, 1, -105], count: 3 },
      { kind: 'spinnweben', pos: [4.05, 6, -105.5], yaw: -Math.PI / 2 },
    ] },
    { type: 'drehraum', id: 'dreh', pos: [60, 1, -110], size: [10, 12], parts: [{ pos: [-2.5, 0], size: [3, 1.2] }, { pos: [2.5, 3.5], size: [2, 0.6] }], period: 4, turn: 1.4 },
    { type: 'zielmast_spuk', id: 'falsch', pos: [-5, 1, -122], height: 6 },
    { type: 'spuk_tuer', id: 'tuerA', pos: [6, 1, -128], yaw: -Math.PI / 2, target: 'tuerB', mood: 'aussen' },
    plat(-118, -134, 1, 14, 90),
    { type: 'spuk_tuer', id: 'tuerB', pos: [90, 1, -124], yaw: -Math.PI / 2, target: 'tuerA', mood: null },

    // ---------------- S4 Lagune
    plat(-140, -148),
    sign(-11, 1, -142, 'Lagune'),
    { type: 'island', pos: [-10.5, -3, -166], size: [5, 4, 36], under: 0 },
    { type: 'island', pos: [10.5, -3, -166], size: [5, 4, 36], under: 0 },
    { type: 'lagune', id: 'see', pos: [0, -3.4, -166], size: [16, 2.8, 36] },
    { type: 'wasserschalter', id: 'wschalter', pos: [10.5, 1, -158], water: { id: 'see', y: 0.9, speed: 1.5 } },
    { type: 'holzsteg', id: 'hsteg', pos: [-6, -1.8, -172], yaw: 0, length: 6, width: 2, hub: 2.2 },
    { type: 'steg', pos: [-8, -0.6, -152], yaw: 0, length: 5, height: 1.6 },
    { type: 'rohrnetz', id: 'rohr', path: [[4, 1.6, -145], [4, 1.6, -150], [4, -1.8, -156], [4, -1.8, -176], [4, 2.2, -181]], coins: 4, branches: [{ at: 3, path: [[-3, -1.8, -176]] }] },
    { type: 'koralle', pos: [-3, -3.4, -160], kind: 'ast' },
    { type: 'koralle', pos: [1.5, -3.4, -168], kind: 'faecher', scale: 1.2 },
    { type: 'seetang', pos: [6.5, -3.4, -164], height: 2.4 },
    { type: 'blasen', pos: [-4, -3.4, -178], height: 3 },
    { type: 'schiffswrack', pos: [-26, -6, -168], yaw: 0.4, size: 1.2, shadow: false },
    plat(-184, -192),
    { type: 'wandriss', id: 'riss', pos: [-6, 1, -188], size: [3, 3, 1], onBreak: { coins: 3 } },

    // ---------------- S5 Rennstrecke
    plat(-192, -206),
    sign(-11, 1, -193, 'Rennstrecke'),
    { type: 'start_bogen', id: 'ampel', pos: [0, 1, -194], yaw: Math.PI / 2, width: 8, mode: 'pass' },
    { type: 'boost_tor', pos: [0, 1, -199], yaw: Math.PI / 2, width: 4 },
    { type: 'boost_rampe', pos: [7, 1, -197], yaw: Math.PI / 2, length: 3, height: 1 },
    { type: 'sprungfeld', id: 'sf', pos: [0, 1, -204.5], to: [0, 1, -215] },
    plat(-213, -228),
    { type: 'pilztrampolin', id: 'pilz', pos: [-6, 1, -220] },
    { type: 'bande', path: [[12, 1, -192], [12, 1, -206]] },
    { type: 'bande', path: [[12, 1, -213], [12, 1, -228]] },
    { type: 'rutschhang', pos: [0, -3, -236], size: [10, 4, 16], axis: 'z', dir: 1 },

    // ---------------- S6 Himmel
    plat(-244, -262, -3),
    sign(-11, -3, -245, 'Himmel'),
    { type: 'kurbelrad', id: 'kurbel', pos: [-8, -3, -250], platform: { pos: [-11.5, -3, -254], size: [2.5, 0.5, 2.5], rise: 4 } },
    { type: 'broeckelblock', id: 'bb', from: [5, -3, -248], to: [8, -3, -248], delay: 0.5, respawn: 3 },
    { type: 'goldring', id: 'ring', pos: [0, -1.75, -257], yaw: Math.PI / 2, radius: 1.2 },
    { type: 'kettenplattform', id: 'kp', path: [[0, -3.35, -264], [0, -3.35, -282]], size: [4, 3], speed: 2.5, wait: 0.6 },
    { type: 'kettenbahn', path: [[0, -3.35, -264], [0, -3.35, -282]] },
    plat(-284, -300, -3),
    { type: 'wolkenlift', id: 'wl', pos: [-6, -3, -290], path: [[-6, 2, -290]] },

    // ---------------- S7 Zug, Zirkus, Pastell
    plat(-300, -360, -3, 40),
    sign(-17, -3, -302, 'Zug und Zirkus'),
    { type: 'track', path: [[-14, -3, -302], [-14, -3, -358]], buffer: 'both' },
    { type: 'parallelgleis', path: [[-14, -3, -302], [-14, -3, -358]], offset: -5.5 },
    { type: 'vehicle', id: 'lok', style: 'lok', pos: [-14, -3, -307], dir: [0, -1] },
    { type: 'vehicle', id: 'wagen', style: 'wagen', pos: [-14, -3, -318], dir: [0, -1] },
    { type: 'vehicle', id: 'flach', style: 'flach', pos: [-14, -3, -329], dir: [0, -1] },
    { type: 'bahnsteig', pos: [-9, -3, -318], size: [5, 1.1, 24], edge: 'left', sign: 'Gleis 3' },
    { type: 'zirkuszelt', pos: [34, -7, -330], radius: 9, height: 10, walls: false },
    { type: 'manege', pos: [10, -3, -330], radius: 3 },
    { type: 'zirkuspodest', pos: [10, -3, -330], radius: 1.2, height: 0.9 },
    { type: 'seilbahn', id: 'gondel', from: [4, -0.7, -338], to: [4, 3.2, -352], speed: 3 },
    { type: 'rosa_gras', pos: [-4, -3, -342], size: [2, 1, 2] },
    { type: 'bunter_stein', pos: [-4, -3, -346], size: [2, 1.5, 2] },
    { type: 'pastell_blume', pos: [-1.5, -3, -341] },
    { type: 'pastell_blume', pos: [-0.8, -3, -343.5] },
    { type: 'hecken_hase', pos: [0, -3, -350], yaw: -Math.PI / 2 },

    // ---------------- S8 Ziel
    plat(-360, -372, -3),
  ],
  blocks: [
    { kind: 'endlessblock', id: 'endlos', pos: [-2, -0.6, -355] },
  ],
  items: [
    { kind: 'coins', from: [-2, 1.4, -66], to: [2, 1.4, -66], n: 3 },
  ],
  stars: [
    { pos: [-3.5, 1.4, -86], hidden: true, id: 'stern_regal' },
    [0, 6.4, -98],
    [-6, 3.3, -290],
  ],
  goal: [0, -3, -367],
  marks: {
    sb: [-5, 1, -10], eis_f: [2, 1, -9.5], ez: [7, 1, -14], haufen: [-8, 1, -20], tanne: [-3, 1, -20], eis: [6, 1.2, -24],
    tafel: [0, 1.2, -38.5], regal_push: [-7.4, 1, -86], treppe: [6, 1, -86], sofa: [0, 1.8, -98], bild: [8, 1, -105.05],
    dreh: [60, 1.2, -106], falsch: [-5, 1, -120.6], tuerA: [6, 1, -126.6], schalter: [10.5, 1.6, -158], rohr: [4, 1, -143],
    tor: [0, 1, -197], rampe: [7, 1, -195.5], sf: [0, 1.3, -204.5], pilz: [-6, 4, -220], hang: [0, 0.6, -230.5],
    kurbel: [-6.6, -3, -250], bb: [6, -1.6, -248], ring: [0, -3, -254], kp: [0, -2.8, -264], wl: [-6, -1.5, -290],
    gondel: [4, -2.4, -338], endlos: [-2, -3, -355], goal: [0, -3, -362],
  },
};
