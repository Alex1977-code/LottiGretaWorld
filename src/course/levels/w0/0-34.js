// Sternenwerkstatt (0-34): jedes Gimmick der Bonuswelt Stern „Sternenzelt“ in einer Station mit Schild, Kameraschiene und
// benannten Punkten (marks) für tests/course_star_blocks.mjs (SB_PART=mech). Thema starspace; mit ?theme=<name> lässt sich
// jedes Stern-Thema ansehen (starspace, rainbow, galaxy, woodspace, blockland, honeycomb, grotto, fogbog, cosmic, bossblitz).
// Level verläuft nach −Z; Plateaus mit Oberseite y = 0.
//   S0  Start: Sternen-Kulisse, Zeit-Uhren, Sternenglanz (Signal)                                 z    6 …   −8
//   S1  Drehplatten-Feld und Boost-Strecke auf Drehplatten                                        z   −8 …  −44
//   S2  Farbplatten (alle umfärben → Stern 0)                                                     z  −44 …  −62
//   S3  Plattenwand (Takt) und Plattentreppe (klappt aus, wenn man nah kommt)                     z  −62 …  −84
//   S4  Schienenwalze                                                                              z  −84 … −126
//   S5  Walzenraum mit Druckknopf                                                                  z −126 … −150
//   S6  Scheinziel und fliegender Zielmast                                                         z −150 … −206
//   S7  Riesen-?-Turm, Felsblock, Laufbombe                                                        z −206 … −236
//   S8  Draufsicht über Waben-Platten (normal, Lava, Eis, hoch)                                    z −236 … −276
//   S9  Nebelboden mit erscheinenden Bodenstücken, Nebelplattformen                                z −276 … −312
//   S10 Schienenbrett mit Weiche (Kanonen-Helm)                                                    z −312 … −354
//   S11 Kanonenkugel-Wand                                                                          z −354 … −374
//   S12 Drehdiorama mit Druckknopf und Blick-Stern                                                 z −374 … −402
//   S13 Ziel (Sternenglanz beim Abschluss)                                                         z −402 … −414

const plat = (z0, z1, top = 0, w = 26, x = 0) => ({ type: 'island', pos: [x, top - 4, (z0 + z1) / 2], size: [w, 4, Math.abs(z1 - z0)], under: 0 });
const sign = (x, y, z, text) => ({ type: 'sign', pos: [x, y, z], text });

export const LEVEL = {
  id: '0-34',
  world: 0,
  title: 'Sternenwerkstatt',
  archetype: 'parcours',
  theme: 'starspace',
  music: 'course_rainbow',
  timeLimit: 999,
  start: { pos: [0, 0, 3], yaw: Math.PI / 2 },
  killY: -24,
  camera: [
    { from: 8, to: -8, pitch: 38, dist: 15 },
    { from: -8, to: -44, pitch: 46, dist: 15 },
    { from: -44, to: -62, pitch: 52, dist: 14 },
    { from: -62, to: -84, pitch: 30, dist: 17, height: 3 },
    { from: -84, to: -126, pitch: 40, dist: 15 },
    { from: -126, to: -150, pitch: 36, dist: 15 },
    { from: -150, to: -206, pitch: 34, dist: 17, height: 2 },
    { from: -206, to: -236, pitch: 38, dist: 16 },
    { from: -236, to: -276, pitch: 46, dist: 15 },
    { from: -276, to: -312, pitch: 40, dist: 15 },
    { from: -312, to: -354, pitch: 44, dist: 16 },
    { from: -354, to: -374, pitch: 22, dist: 19, height: 4 },
    { from: -374, to: -402, pitch: 44, dist: 17 },
    { from: -402, to: -416, pitch: 40, dist: 15 },
  ],
  segments: [
    // ---------------- S0 Start
    plat(6, -8),
    sign(-7, 0, 1, 'Sternenwerkstatt'),
    { type: 'zeituhren', id: 'uhren', list: [[4, 1.2, -2], [6, 1.2, -2]], sec: 10 },
    { type: 'sternenglanz', id: 'glanz_signal', outfit: 'stern_probe', when: 'signal', banner: false },
    { type: 'deco_star', items: [
      { kind: 'rakete', pos: [-9, 0, -3], height: 4, color: 'rot', solid: true }, { kind: 'stern', pos: [9, 0, 2], pole: 2.4, size: 1.2 },
      { kind: 'kristall', pos: [10, 0, -5], n: 5, color: 'lila' }, { kind: 'regenbogen', pos: [0, 0, -7.5], width: 7, height: 3.4 },
      { kind: 'planet', pos: [-14, 5, -8], radius: 2.4, color: 'mint' }, { kind: 'sterne', pos: [0, 2, -2], size: [22, 10], n: 10, height: 4 },
    ] },

    // ---------------- S1 Drehplatten
    plat(-8, -12),
    sign(-11, 0, -9, 'Drehplatten'),
    { type: 'drehplatte', id: 'dreh', pos: [0, 0, -16.5], grid: [3, 2], spacing: 2.4, delay: 0.45, hold: 1.2 },
    plat(-20, -24),
    sign(-11, 0, -21, 'Boost-Strecke'),
    { type: 'boost', pos: [0, 0, -22.6], dir: [0, -1], speed: 16 },
    { type: 'drehplatte', id: 'boostbahn', from: [0, 0, -25.4], to: [0, 0, -37.4], n: 6, size: [2.2, 0.3, 2.2], delay: 0.25, color: 'rot', color2: 'weiss' },
    plat(-38.8, -44),

    // ---------------- S2 Farbplatten
    sign(-11, 0, -41, 'Farbplatten'),
    { type: 'farbplatten', id: 'farb', pos: [0, 0, -51.5], grid: [3, 3], spacing: 2.3, from: 'blau', to: 'gelb', star: 0 },
    plat(-55.2, -62),

    // ---------------- S3 Plattenwand
    plat(-62, -84),
    sign(-11, 0, -63, 'Plattenwand'),
    { type: 'plattenwand', id: 'wand', pos: [-3, 0, -78], size: [6, 8], grid: [3, 4], mode: 'takt', period: 5, out: 2.4, stagger: 0.45 },
    { type: 'plattenwand', id: 'treppe', pos: [7, 0, -78], size: [4, 8], grid: [2, 4], mode: 'treppe', near: 4, color: 'blau' },

    // ---------------- S4 Schienenwalze
    sign(-11, 0, -83, 'Schienenwalze'),
    { type: 'schienenwalze', id: 'walze', path: [[0, -1.4, -86.8], [0, -1.4, -117]], radius: 1.4, length: 6, speed: 2.6, roll: 1.1, respawn: 2 },
    plat(-119.6, -126),
    { type: 'deco_star', items: [{ kind: 'holzkiste', pos: [-9, 0, -122], solid: true }, { kind: 'holzbalken', pos: [9, 0, -121], length: 4, yaw: 0.3 }, { kind: 'walzenstapel', pos: [10, 0, -124.5] }] },

    // ---------------- S5 Walzenraum
    plat(-126, -150),
    sign(-11, 0, -127, 'Walzenraum'),
    { type: 'deco_star', items: [
      { kind: 'riesenpflanze', pos: [-10, 0, -146], size: 4 }, { kind: 'riesenpilz', pos: [10, 0, -146], height: 4.5, radius: 2.6, solid: true },
      { kind: 'riesenblume', pos: [-10, 0, -134], height: 4, color: 'gold' }, { kind: 'liane', from: [-6, 9, -134], to: [6, 9, -144], sag: 2 },
    ] },
    { type: 'walzenraum', id: 'raum', pos: [0, 4, -139], radius: 4, length: 8, axis: 'z',
      parts: [{ u: 2.4, v: -1.6, w: 2.4, h: 0.4, color: 0x8ad0ff }, { u: -2.6, v: 0.4, w: 0.4, h: 2.4, color: 0xffb0d8 }],
      items: [{ kind: 'coin', u: 2.4, v: -0.9, a: 0 }], schalter: { pos: [6, 0, -131], id: 'raumknopf' } },

    // ---------------- S6 Scheinziel und fliegender Zielmast
    plat(-150, -206),
    sign(-11, 0, -151, 'Fliegender Zielmast'),
    { type: 'deco_star', shadow: false, items: [{ kind: 'komet', pos: [-14, 9, -175], size: 1.2, dir: [1, -0.3, 0] }, { kind: 'retro_wolke', pos: [11, 6, -170], size: 2.2 }, { kind: 'retro_wolke', pos: [-12, 5, -190], size: 1.8 }] },
    { type: 'scheinziel', id: 'schein', pos: [0, 0, -156], mast: 'flugmast' },
    { type: 'fliegender_zielmast', id: 'flugmast', pos: [4, 0, -164], path: [[4, 3, -176], [-4, 3, -188], [-7, 0, -199]], start: 'signal', speed: 6, near: 9, far: 18 },

    // ---------------- S7 Riesen-?-Turm, Felsblock, Laufbombe
    plat(-206, -236),
    sign(-11, 0, -207, 'Riesen-?-Turm, Felsblock'),
    { type: 'deco_star', items: [{ kind: 'riesenblock', pos: [11, 0, -232], size: 3, color: 'blau', solid: true }, { kind: 'retro_busch', pos: [-10, 0, -220] }, { kind: 'roehre_deko', pos: [10, 0, -216], radius: 1, height: 2.4, solid: true }] },
    { type: 'riesen_frageturm', id: 'turm', pos: [-5, 2.6, -214], size: 2, blocks: 4, content: 'coins:5' },
    { type: 'riesen_frageturm', id: 'turm2', pos: [5, 0, -211], size: 2, blocks: 3, color: 'orange' },
    { type: 'felsblock', id: 'fels', pos: [5, 0, -224], size: 2.6, content: 'coins:3' },
    { type: 'felsblock', id: 'felswand', pos: [-5, 0, -230], size: [4, 3, 1.2], look: 'wand', content: { star: 1 } },

    // ---------------- S8 Draufsicht und Waben
    sign(-11, 0, -237, 'Draufsicht, Waben'),
    { type: 'draufsicht', id: 'oben', area: [-16, -242, 16, -270], height: 24 },
    plat(-236, -241),
    { type: 'deco_star', items: [{ kind: 'wabe', pos: [-11, 0, -239], radius: 0.9, height: 1.6 }, { kind: 'honigtopf', pos: [10, 0, -238.5] }] },
    { type: 'waben', id: 'waben', pos: [-6.2, 0, -243.2], size: 1.4,
      map: ['nnnnnn', 'nnllnn', 'niinnn', 'nniinh', 'nnnnnn', 'nlnnnn', 'nnnnnn', 'nnnnnn', 'nnnnnn', 'nnnnnn', 'nnnnnn', 'nnnnnn', 'nnnnnn'] },
    plat(-270, -276),

    // ---------------- S9 Nebel
    sign(-11, 0, -277, 'Nebelplattformen'),
    { type: 'deco_star', items: [
      { kind: 'grabstein', pos: [-9, 0, -272], yaw: 0.2 }, { kind: 'grabstein', pos: [-6.5, 0, -273], size: 0.8, round: false }, { kind: 'kahler_baum', pos: [10, 0, -273], height: 4.5 },
      { kind: 'schneehuegel', pos: [7, 0, -275], radius: 1.6 }, { kind: 'laterne', pos: [4, 0, -272] }, { kind: 'irrlicht', pos: [-4, 1.6, -285] }, { kind: 'irrlicht', pos: [5, 2.2, -296], color: 0xc8b0ff },
    ] },
    { type: 'nebelboden', id: 'nebelboden', pos: [0, -0.6, -293], size: [26, 32], depth: 1.4, density: 0.5, color: 0xc8d4f0, parts: [{ pos: [-6, -0.4, -284], size: [3, 0.4, 3] }, { pos: [-6, -0.4, -290], size: [3, 0.4, 3], phase: 1.5 }] },
    { type: 'nebelplattform', id: 'nebel', from: [0, 0, -281], to: [0, 0, -305], n: 5, depth: 3, up: 3, down: 1.5, move: 1, stagger: 0.9 },
    plat(-308, -314),

    // ---------------- S10 Schienenbrett
    sign(-11, 0, -310, 'Schienenbrett'),
    { type: 'deco_star', items: [{ kind: 'antenne', pos: [10, 0, -311], yaw: -0.6 }, { kind: 'neonring', pos: [-9, 0, -352], radius: 1.6, color: 'pink' }, { kind: 'leuchtsaeule', pos: [11, 0, -351], height: 5 }] },
    { type: 'schienenbrett', id: 'brett', start: 'A', next: 'B',
      // Abzweige im Winkel der Modell-Weiche (≈ 20° links/rechts): Zielscheibe am Signalmast links neben der Weiche
      nodes: { A: [0, 0.2, -316], B: [0, 0.2, -327], C: [-3.6, 0.2, -337], D: [3.6, 0.2, -337], E: [3.6, 0.2, -347] },
      rails: [['A', 'B'], ['B', 'C'], ['B', 'D'], ['D', 'E']], weichen: { B: { to: ['C', 'D'], pos: [0, 1.45, -330] } }, speed: 5, respawn: 2 },
    plat(-350, -354, 0, 26),

    // ---------------- S11 Kanonenkugel-Wand
    plat(-354, -374),
    sign(-11, 0, -355, 'Kanonenkugel-Wand'),
    { type: 'kanonenkugel_wand', id: 'kugeln', pos: [-9, 0.6, -366], dir: [1, 0], rows: 5, rise: 2.1, range: 14, speed: 3, period: 3.2, stagger: 0.55 },
    { type: 'platform', pos: [8, 10.2, -366], size: [4, 0.5, 4] },

    // ---------------- S12 Drehdiorama
    plat(-374, -378),
    sign(-11, 0, -375, 'Drehdiorama'),
    { type: 'drehdiorama', id: 'diorama', pos: [0, 0, -388], disc: { radius: 5.5, height: 0.6, color: 0xc8a060 },
      parts: [{ pos: [0, 0, -3], size: [8, 1.2, 1.4], color: 0x8ab0ff }, { pos: [0, 0, 2.8], size: [1.6, 3.4, 1.6], color: 0xffb0d8 }],
      schalter: { pos: [8, 0, -377], id: 'drehknopf' }, items: [{ kind: 'coin', pos: [0, 1.7, -3] }],
      sicht: [{ star: 'blickstern', yaw: [100, 180] }] },
    plat(-398, -416),

    // ---------------- S13 Ziel
    sign(-11, 0, -403, 'Ziel'),
    { type: 'sternenglanz', id: 'glanz', outfit: 'stern', when: 'ziel' },
  ],
  enemies: [
    { kind: 'laufbombe', id: 'bombe', pos: [1, 0, -218], dir: [1, 0], speed: 0 },
  ],
  items: [
    { kind: 'coins', from: [-3, 0.5, -136], to: [-3, 0.5, -144], n: 4 },
    { kind: 'helm_kanone', id: 'helm', pos: [-4, 0, -311], respawn: 4 },
  ],
  checkpoint: [0, 0, -152],
  stars: [
    { pos: [0, 1.6, -51.5], hidden: true, id: 'farbstern' },
    { pos: [-5, 1, -230], hidden: true, id: 'felsstern' },
    { pos: [0, 0.4, -388 + 4.2], id: 'blickstern' },
  ],
  goal: [0, 0, -410],
  marks: {
    start: [0, 0, -2],
    dreh: [0, 0, -10], drehMitte: [0, 0.02, -15.3], drehVor: [0, 0, -11],
    boost: [0, 0, -22], boostEnde: [0, 0, -40],
    farb: [0, 0, -45], farbAus: [0, 0, -57],
    wand: [-3, 0, -73], treppe: [7, 0, -73],
    walze: [0, 0, -84.4], walzeOben: [0, 0.02, -86.8],
    raum: [0, 0.2, -133], raumInnen: [0, 0.2, -139], raumKnopf: [6, 0, -129.5],
    schein: [0, 0, -153], mast: [4, 0, -164],
    turm: [-5, 0, -214], fels: [5, 0, -220], felswand: [-5, 0, -227.5],
    waben: [0, 0, -238.5], wabeLava: [-0.6, 0.02, -245.8],
    nebel: [0, 0, -274], nebelErste: [0, 0.02, -281],
    brett: [0, 0, -312], brettA: [0, 0.6, -316],
    kugeln: [0, 0, -357],
    diorama: [0, 0, -376], dioramaMitte: [3, 0.02, -388],
    goal: [0, 0, -405],
  },
};
