// Canyonwerkstatt (0-14): jeder Welt-4-Baustein in einer Station mit Schild, Kameraschiene und benannten Punkten (marks)
// für tests/course_w4_blocks.mjs. Thema canyon; mit ?theme=<name> lässt sich jedes Welt-4-Thema ansehen (canyon, poison,
// beep, bounce, ruins, lavacastle). Level verläuft nach −Z; Plateaus mit Oberseite y = 1.
//   S0  Start (Canyon-Kulisse)                                         z    6 …   −6
//   S1  Piep-Blöcke (Felder rot/blau, Farbkarte, Treppe, Rutsche)      z   −6 …  −52
//   S2  Trampoline (orange gerade/schräg, Riesentrampolin-Fahrt)       z  −52 … −104
//   S3  Ruinen (Stachelstangen, auch auf fahrender Plattform,         z −104 … −152
//       Schwankplattform, Drehteller, Wende-Plattform)
//   S4  Giftwald (Giftwasser, Giftfall, Roulette-Block, Sternring)     z −152 … −200
//   S5  Lava-Burg (Drehbalken über Lava, Lavafall, Lava-Glasrohr)      z −200 … −240
//   S6  Ameisenweg (Laufpfad über eine Wand, Spur)                     z −240 … −262
//   S7  Ziel                                                           z −262 … −274

const plat = (z0, z1, top = 1, w = 26, x = 0) => ({ type: 'island', pos: [x, top - 4, (z0 + z1) / 2], size: [w, 4, Math.abs(z1 - z0)], under: 0 });
const sign = (x, y, z, text) => ({ type: 'sign', pos: [x, y, z], text });

export const LEVEL = {
  id: '0-14',
  world: 0,
  title: 'Canyonwerkstatt',
  archetype: 'parcours',
  theme: 'canyon',
  music: 'course_canyon',
  timeLimit: 999,
  start: { pos: [0, 1, 3], yaw: Math.PI / 2 },
  camera: [
    { from: 8, to: -6, pitch: 42, dist: 14 },
    { from: -6, to: -52, pitch: 46, dist: 15 },
    { from: -52, to: -104, pitch: 44, dist: 16 },
    { from: -104, to: -152, pitch: 46, dist: 15 },
    { from: -152, to: -200, pitch: 48, dist: 15 },
    { from: -200, to: -240, pitch: 48, dist: 16 },
    { from: -240, to: -276, pitch: 44, dist: 15 },
  ],
  segments: [
    // ---------------- S0 Start
    plat(6, -6),
    sign(-7, 1, 0, 'Canyonwerkstatt'),
    { type: 'deco_w4', items: [
      { kind: 'felsnadel', pos: [-10.5, 1, 2], height: 7, size: 1.6, solid: true },
      { kind: 'felsnadel', pos: [11, 1, -3], height: 5, size: 1.3, solid: true },
      { kind: 'trockenbuesche', pos: [9, 1, 3], size: [5, 5], n: 4 },
      { kind: 'geroell', pos: [-9, 1, -4], size: [5, 4], n: 7 },
      { kind: 'canyonwand', from: [-15, 1, 6], to: [-15, 1, -6], height: 9, depth: 3 },
      { kind: 'canyonwand', from: [15, 1, 6], to: [15, 1, -6], height: 11, depth: 3 },
    ] },

    // ---------------- S1 Piep-Blöcke
    plat(-6, -12),
    sign(-11, 1, -7, 'Piep-Blöcke'),
    { type: 'deco_w4', items: [
      { kind: 'neonbogen', pos: [0, 1, -7.5], width: 7, height: 4.2, color: 0x40e8ff },
      { kind: 'lautsprecher', pos: [-10, 1, -10], yaw: -0.4 },
      { kind: 'lautsprecher', pos: [10, 1, -10], yaw: Math.PI + 0.4 },
      { kind: 'antenne', pos: [-11.5, 1, -21], height: 6 },
      { kind: 'antenne', pos: [11.5, 1, -34], height: 7, color: 0x40a0ff },
      { kind: 'kabel', from: [-11.5, 7, -21], to: [11.5, 8, -34], sag: 2.5 },
    ] },
    { type: 'piep_block', id: 'pr', color: 'rot', pos: [0, 0, -14], size: [6, 1, 4] },
    { type: 'piep_block', id: 'pb', color: 'blau', pos: [0, 0, -18], size: [6, 1, 4] },
    plat(-20, -52),
    { type: 'piep_block', id: 'pk', pos: [-7, 1, -25], map: ['rbrb', 'brbr', 'rbrb'] },
    { type: 'piep_treppe', id: 'ptr', from: [7, 1, -24], dir: [0, -1], steps: 5, rise: 1, run: 1.2, width: 2 },
    { type: 'piep_block', id: 'pein', color: 'blau', blocks: [[0, 1, -30], [1, 1, -30], [2, 1, -30], [0, 2, -30]] },
    { type: 'piep_rutsche', id: 'prs', pos: [-6, 1, -42], size: [4, 4, 12], axis: 'z', dir: 1, band: 2 },

    // ---------------- S2 Trampoline
    plat(-52, -64),
    sign(-11, 1, -53, 'Trampoline'),
    { type: 'deco_w4', items: [
      { kind: 'wiesenblumen', pos: [-9, 1, -59], size: [6, 9], n: 26 },
      { kind: 'wiesenblumen', pos: [9.5, 1, -60], size: [5, 7], n: 20 },
      { kind: 'bergfichten', pos: [-11, 1, -58], size: [3, 10], n: 3, scale: [0.9, 1.3] },
      { kind: 'heuballen', pos: [10, 1, -55] },
      { kind: 'heuballen', pos: [11.4, 1, -56.4], yaw: 1.2, size: 1.2 },
      { kind: 'zaun', from: [8, 1, -62.5], to: [12.5, 1, -62.5] },
      { kind: 'windrad', pos: [11, 1, -99], height: 6, yaw: Math.PI / 2 },
    ] },
    { type: 'trampolin_orange', id: 'to1', pos: [-5, 1, -57], strength: 21 },
    { type: 'trampolin_orange', id: 'to2', pos: [5, 1, -57], angle: 35, dir: [0, -1], strength: 19 },
    { type: 'riesentrampolin', id: 'rt', path: [[0, 0.1, -67.5], [1.5, 2.5, -76], [0, 3, -85], [0, 0.1, -93]], size: 6, speed: 4 },
    plat(-96, -104),

    // ---------------- S3 Ruinen
    plat(-104, -126),
    sign(-11, 1, -105, 'Ruinen'),
    { type: 'deco_w4', items: [
      { kind: 'saeulen', from: [-11.5, 1, -108], to: [-11.5, 1, -124], every: 4, height: 5, broken: 0.4 },
      { kind: 'ruinenbogen', pos: [0, 1, -125.2], width: 5, height: 4.6 },
      { kind: 'ruinenmauer', from: [9, 1, -124.5], to: [12.5, 1, -124.5], height: 2.4 },
      { kind: 'statue', pos: [11, 1, -106], size: 2.2, yaw: Math.PI },
      { kind: 'truemmer', pos: [-8, 1, -119], size: [4, 5], n: 6 },
      { kind: 'ranken', pos: [0, 5.4, -125.2], length: 2.4, count: 5, width: 4 },
    ] },
    { type: 'stachelstange', id: 'ss1', pos: [-5, 1, -112], length: 3.2, arms: 2, balls: 3, speed: 1.1 },
    { type: 'mover', id: 'm1', path: [[5, 1, -110], [5, 1, -120]], size: [4, 0.5, 4], speed: 2, color: 'orange' },
    { type: 'stachelstange', id: 'ss2', pos: [5, 1.5, -110], attach: 'm1', length: 1.7, arms: 1, balls: 2, speed: 1.6, height: 0.9 },
    { type: 'schwankplattform', id: 'schwank', pos: [0, 1, -130.5], size: [6, 3], axis: 'x' },
    plat(-133, -138),
    { type: 'drehplattform', id: 'dteller', axis: 'y', pos: [0, 0.5, -142], arms: 2, length: 4, width: 1.8, speed: 0.5 },
    plat(-146, -152),
    { type: 'drehplattform', id: 'dflip', axis: 'x', pos: [8, 0.5, -142], size: [3, 3], mode: 'flip', wait: 2.5, turn: 1.1 },

    // ---------------- S4 Giftwald
    plat(-152, -160),
    sign(-11, 1, -153, 'Giftwald'),
    { type: 'deco_w4', items: [
      { kind: 'giftbaum', pos: [-11, 1, -163], height: 7.5 },
      { kind: 'giftbaum', pos: [11.5, 1, -175], height: 6.5 },
      { kind: 'giftbaeume', pos: [11, 1, -164], size: [3, 6], n: 2, scale: [0.7, 1] },
      { kind: 'leuchtpilze', pos: [-8, 1, -176], n: 6 },
      { kind: 'leuchtpilze', pos: [8, 1, -158], n: 4, size: 1.2 },
      { kind: 'sumpfgras', pos: [-6.6, 1, -170], size: [1, 16], n: 8 },
      { kind: 'sumpfgras', pos: [6.6, 1, -168], size: [1, 14], n: 7 },
    ] },
    { type: 'island', pos: [-9.5, -3, -170], size: [7, 4, 20], under: 0 },
    { type: 'island', pos: [9.5, -3, -170], size: [7, 4, 20], under: 0 },
    { type: 'island', pos: [0, -3.6, -170], size: [12, 2, 20], under: 0 },
    { type: 'giftwasser', id: 'gift', pos: [0, -1.6, -170], size: [12, 2.2, 20], flow: [0.4, 0] },
    { type: 'giftfall', id: 'gfall', pos: [0, 0.4, -179.4], width: 4, height: 7, yaw: 0, kill: true },
    { type: 'wall', pos: [0, 1, -180.6], size: [6, 7, 1] },
    plat(-180, -200),
    { type: 'roulette_block', id: 'roul', pos: [-6, 3.4, -156], items: ['wachstumsbeere', 'krallen', 'funken', 'stern'] },
    { type: 'sternring', id: 'sring', pos: [6, 1, -188], coins: { pos: [6, 1.3, -194], r: 3, n: 8 }, star: 1, time: 10 },

    // ---------------- S5 Lava-Burg
    plat(-200, -206),
    sign(-11, 1, -201, 'Lava-Burg'),
    { type: 'deco_w4', items: [
      { kind: 'burgzinne', from: [-13, 1, -201], to: [-13, 1, -205.5], height: 3.5, thick: 1.2 },
      { kind: 'burgzinne', from: [13, 1, -201], to: [13, 1, -205.5], height: 3.5, thick: 1.2 },
      { kind: 'fackeln', from: [-12.35, 2.6, -202], to: [-12.35, 2.6, -205], every: 3, yaw: 0 },
      { kind: 'fackeln', from: [12.35, 2.6, -202], to: [12.35, 2.6, -205], every: 3, yaw: Math.PI },
      { kind: 'banner', pos: [-12.3, 4.4, -203.5], yaw: Math.PI / 2, height: 2.6 },
      { kind: 'ketten', from: [-3, 7, -230.5], to: [3, 7, -230.5], every: 3, length: 3 },
      { kind: 'lavasteine', pos: [9, 1, -235], size: [5, 4], n: 5 },
    ] },
    { type: 'lava', pos: [0, -1, -218], size: [24, 1.5, 24] },
    { type: 'drehplattform', id: 'dlava', axis: 'y', pos: [-4, 0.3, -214], arms: 4, length: 3.6, width: 1.6, speed: 0.55, style: 'lava' },
    { type: 'lavafall', id: 'lfall', pos: [-11, 0.4, -220], width: 3, height: 7, yaw: Math.PI / 2 },
    { type: 'lavarohr', id: 'lrohr', path: [[6, 1.6, -204.5], [6, 0.4, -209], [6, 0.4, -226], [6, 1.6, -231]], coins: 4, lava: 0.5 },
    plat(-230, -240),

    // ---------------- S6 Ameisenweg
    plat(-240, -262),
    sign(-11, 1, -241, 'Ameisenweg'),
    { type: 'deco_w4', items: [
      { kind: 'geroell', pos: [7, 1, -246], size: [5, 6], n: 8 },
      { kind: 'trockenbuesche', pos: [-10, 1, -257], size: [4, 6], n: 3 },
      { kind: 'tafelberg', pos: [10, 1, -257], size: [5, 4], height: 3, solid: true },
    ] },
    { type: 'wall', pos: [0, 1, -250], size: [6, 4, 2] },
    { type: 'ameisenweg', id: 'aw', over: { pos: [0, 1, -250], size: [6, 4, 2] }, at: 1 },
    { type: 'ameisenweg', id: 'aw2', around: { pos: [-7, 3, -250], size: [2, 2, 3] }, at: -7 },
    { type: 'platform', pos: [-7, 3, -250], size: [2, 2, 3], style: 'stone' },

    // ---------------- S7 Ziel
    plat(-262, -274),
  ],
  items: [],
  stars: [
    [0, 6.4, -24],
    { pos: [6, 1.6, -194], hidden: true, id: 'stern_ring' },
    [0, 5, -150],
  ],
  goal: [0, 1, -269],
  marks: {
    pr: [0, 1, -14], pb: [0, 1, -18], ptr: [7, 1, -24], pein: [1, 1, -30], prs: [-6, 5.2, -47.6],
    to1: [-5, 3, -57], to2: [5, 3, -57], rt: [0, 3, -67.5], ss1: [-5, 1, -112], schwank: [0, 1.2, -130.5],
    dteller: [0, 1.2, -142], dflip: [8, 1.2, -142], gift: [-3, 1.5, -170], roul: [-6, 1, -156], sring: [6, 1, -186],
    lava: [-4, 1.2, -214], lrohr: [6, 1, -202], aw: [0, 1, -246], goal: [0, 1, -264],
  },
};
