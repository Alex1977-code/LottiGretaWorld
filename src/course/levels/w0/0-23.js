// Wolkenwerkstatt (0-23): jedes neue Welt-6-Gimmick in einer Station mit Schild, Kameraschiene und benannten Punkten
// (marks) für tests/course_w6_blocks.mjs. Thema clearpipe; mit ?theme=<name> lässt sich jedes Welt-6-Thema ansehen
// (clearpipe, stonecircle, wreck, fareast, jungle, snowwind, factory, fuzzymine). Level verläuft nach −Z; Plateaus mit
// Oberseite y = 1 (ab dem Dschungel y = 0).
//   S0  Start                                                                     z    6 …   −6
//   S1  Glasröhren-Netz: Kreuzung mit Weiche, gebogene Röhren, Metallrohr mit       z   −6 …  −40
//       Fenstern; Mitnahme von Gegnern/Gegenständen
//   S2  Stachelkugeln: Bahn-Kugel, Kugel-Quelle                                    z  −40 …  −60
//   S3  Geisterschiff: Kippschiff, 1 m Kippsteg über dem Wasser                    z  −60 … −100
//   S4  Fernost-Halle: Schiebetür (antippen), Scheinwand, Gong → Pilz-Maske        z −100 … −128
//   S5  Dschungel: Floß im Giftsee, Abwärtsströmung, Wand- und Deckengitter         z −128 … −170
//   S6  Windböen über dem Abgrund                                                  z −170 … −192
//   S7  Maschinenhalle: Förderband Boden / Wand / rund                             z −192 … −222
//   S8  Mine: Quetschblöcke (hinab, seitlich), Wippe, Wolkenplattformen             z −222 … −250
//   S9  Großer ?-Block (Turm), Wurfball, Zielscheiben, POW                         z −250 … −272
//   S10 Ziel                                                                       z −272 … −290

const plat = (z0, z1, top = 1, w = 26, x = 0) => ({ type: 'island', pos: [x, top - 4, (z0 + z1) / 2], size: [w, 4, Math.abs(z1 - z0)], under: 0 });
const sign = (x, y, z, text) => ({ type: 'sign', pos: [x, y, z], text });

export const LEVEL = {
  id: '0-23',
  world: 0,
  title: 'Wolkenwerkstatt',
  archetype: 'parcours',
  theme: 'clearpipe',
  music: 'course_grass',
  timeLimit: 999,
  start: { pos: [0, 1, 3], yaw: Math.PI / 2 },
  camera: [
    { from: 8, to: -6, pitch: 42, dist: 14 },
    { from: -6, to: -40, pitch: 48, dist: 16 },
    { from: -40, to: -60, pitch: 46, dist: 15 },
    { from: -60, to: -100, pitch: 40, dist: 15 },
    { from: -100, to: -128, pitch: 42, dist: 14 },
    { from: -128, to: -170, pitch: 44, dist: 15 },
    { from: -170, to: -192, pitch: 44, dist: 15 },
    { from: -192, to: -222, pitch: 40, dist: 16 },
    { from: -222, to: -250, pitch: 42, dist: 15 },
    { from: -250, to: -292, pitch: 44, dist: 15 },
  ],
  segments: [
    // ---------------- S0 Start
    plat(6, -6),
    sign(-7, 1, 0, 'Wolkenwerkstatt'),
    { type: 'deco_w6', items: [
      { kind: 'bergkiefern', pos: [-10, 1, 1], size: [5, 8], n: 3 }, { kind: 'felsen', pos: [10, 1, 1], size: [5, 8], n: 3 },
      { kind: 'bergblumen', pos: [0, 1, 0], size: [20, 10], n: 14, avoid: [[0, 3, 2]] }, { kind: 'wolke', pos: [-9, 4.5, -3], size: 2.6 },
    ] },

    // ---------------- S1 Glasröhren-Netz
    plat(-6, -40),
    sign(-11, 1, -7, 'Glasröhren-Netz'),
    { type: 'glasnetz', id: 'netz', radius: 1,
      nodes: { A: [0, 2.05, -9], K: [0, 2.05, -17], B: [-9, 2.05, -27], C: [9, 2.05, -27], D: [0, 2.05, -33] },
      pipes: [
        { from: 'A', to: 'K', coins: 2 },
        { from: 'K', to: 'B', via: [[-4.5, 2.05, -20]] },
        { from: 'K', to: 'C', via: [[4.5, 2.05, -20]], style: 'metall', windows: true },
        { from: 'K', to: 'D' },
      ],
      weichen: { K: { to: 'C', toggle: ['C', 'D'], signal: 'weiche1' } } },
    { type: 'deco_w6', items: [{ kind: 'bergkiefer', pos: [-11, 1, -36], height: 4.5 }, { kind: 'fels', pos: [11, 1, -36], size: 1.4 }] },

    // ---------------- S2 Stachelkugeln
    plat(-40, -60),
    sign(-11, 1, -41, 'Stachelkugeln'),
    { type: 'stachelkugel', id: 'kugel1', pos: [-8, 1, -47], path: [[-8, 1, -47], [8, 1, -47]], speed: 3, mode: 'pingpong', wait: 0.3 },
    { type: 'stachelkugel_quelle', id: 'quelle', pos: [-12, 1, -55], dir: [1, 0], every: 3, speed: 4.5, max: 3, life: 7 },

    // ---------------- S3 Geisterschiff
    plat(-60, -64.4),
    sign(-11, 1, -61, 'Kippschiff'),
    { type: 'water', pos: [0, -4, -82], size: [44, 3, 36] },
    { type: 'kippschiff', id: 'schiff', pos: [0, 1, -71.5], length: 14, width: 7, maxTilt: 14, wave: { amp: 4, period: 5 } },
    { type: 'kippsteg', id: 'steg', from: [0, 1, -78.6], to: [0, 1, -89], width: 1 },
    plat(-89, -100),
    { type: 'deco_w6', items: [{ kind: 'fass', pos: [-9, 1, -93] }, { kind: 'kiste', pos: [9, 1, -94] }, { kind: 'anker', pos: [-10, 1, -97], yaw: 0.5 }, { kind: 'steuerrad', pos: [10, 1, -97.5] }] },

    // ---------------- S4 Fernost-Halle
    plat(-100, -128),
    sign(-11, 1, -101, 'Fernost-Halle'),
    { type: 'wall', pos: [-7.5, 1, -106], size: [11, 3.4, 0.6], style: 'stone' },
    { type: 'wall', pos: [7.5, 1, -106], size: [11, 3.4, 0.6], style: 'stone' },
    { type: 'schiebetuer', id: 'tuer1', pos: [0, 1, -106], width: 2.4, height: 3, yaw: -Math.PI / 2 },
    { type: 'wall', pos: [-11.2, 1, -114], size: [0.6, 3.4, 4], style: 'stone' },
    { type: 'schiebetuer', id: 'tuer2', pos: [-10.6, 1, -114], width: 2.2, height: 2.8, yaw: 0, behind: 'wand', slide: 'beide', onOpen: { coins: 3 } },
    { type: 'gong', id: 'gong', pos: [8, 1, -120], yaw: -Math.PI / 2, coins: 8, onHit: { reveal: 'maske' }, signal: 'gong' },
    { type: 'deco_w6', items: [
      { kind: 'laternenpfahl', pos: [-4, 1, -110], yaw: 0 }, { kind: 'laternenpfahl', pos: [4, 1, -110], yaw: Math.PI },
      { kind: 'bambus', pos: [-11, 1, -124], n: 7 }, { kind: 'kirschbaum', pos: [11, 1, -125], height: 4.5 },
      { kind: 'paravent', pos: [-6, 1, -126], yaw: 0.2 },
    ] },

    // ---------------- S5 Dschungel
    plat(-128, -132),
    sign(-11, 1, -129, 'Floß und Giftsee'),
    { type: 'giftwasser', pos: [0, -2, -141], size: [26, 2.4, 18] },
    { type: 'floss', id: 'floss', pos: [0, 0.4, -134], path: [[0, 0.4, -134], [0, 0.4, -146], [-6, 0.4, -150], [-6, -0.6, -161.5]], speed: 2.5 },
    { type: 'stroemung', id: 'strom', from: [-6, 0.4, -150], to: [-6, -0.6, -164], width: 6, speed: 6, fluid: 'gift' },
    { type: 'island', pos: [-11.1, -3, -157], size: [3.8, 3, 14], under: 0 },
    { type: 'island', pos: [5.2, -4, -157], size: [15.6, 4, 14], under: 0 },
    { type: 'klettergitter', id: 'decke', mode: 'decke', pos: [6, 3.8, -154.5], size: [5, 4], style: 'liane' },
    { type: 'klettergitter', id: 'gitter', mode: 'wand', pos: [9, 0, -162.4], size: [4, 4.5], yaw: -Math.PI / 2, style: 'bambus' },
    plat(-164, -176, 0),
    { type: 'deco_w6', items: [
      { kind: 'dschungelbaum', pos: [12, 0, -152], height: 8 }, { kind: 'farne', pos: [3, 0, -158], size: [4, 4], n: 4 },
      { kind: 'riesenblatt', pos: [-11, 0, -168], size: 2.2 }, { kind: 'pilze', pos: [10, 0, -170], n: 5 },
    ] },

    // ---------------- S6 Windböen
    sign(-11, 0, -171, 'Windböen'),
    { type: 'windfeld', id: 'wind', pos: [0, -2, -178.5], size: [26, 8, 7], dir: [1, 0], strength: 6, period: 4, on: 1.6, warn: 1.0, source: 'wolke' },
    plat(-181, -192, 0),
    { type: 'deco_w6', items: [{ kind: 'schneehaufen', pos: [-9, 0, -186] }, { kind: 'schneekiefer', pos: [10, 0, -188], height: 4 }] },

    // ---------------- S7 Maschinenhalle
    plat(-192, -222, 0),
    sign(-11, 0, -193, 'Förderbänder'),
    { type: 'foerderband', id: 'band1', pos: [-6, 0, -199], size: [4, 0.5, 8], dir: [0, -1], speed: 3 },
    { type: 'foerderband', id: 'bandwand', mode: 'wand', pos: [6, 0, -200], width: 3, height: 8, yaw: -Math.PI / 2, speed: 2, ledges: 2.5, ledge: 0.7 },
    { type: 'foerderband', id: 'bandrund', mode: 'rund', pos: [0, 0, -213], length: 8, height: 3, width: 3, yaw: 0, speed: 2.5, ledges: 2 },
    { type: 'deco_w6', items: [{ kind: 'zahnrad', pos: [11, 0, -206], size: 3, yaw: Math.PI / 2 }, { kind: 'rohr', from: [-12, 3, -218], to: [-12, 3, -206] }, { kind: 'warnstreifen', pos: [0, 0, -205], size: [6, 0.6] }] },

    // ---------------- S8 Mine
    plat(-222, -250, 0),
    sign(-11, 0, -223, 'Quetschblöcke'),
    { type: 'quetschblock', id: 'quetsch1', pos: [-6, 3.2, -228], size: [2, 2, 2], dir: 'down', travel: 3.2 },
    { type: 'quetschblock', id: 'quetsch2', pos: [5, 0, -228], size: [2, 2, 2], dir: '+x', travel: 2.2, style: 'metall', mode: 'signal' },
    { type: 'wall', pos: [11.2, 0, -228], size: [1.6, 3, 3] },
    { type: 'wippe', id: 'wippe', pos: [-4, 1.4, -240], length: 8, width: 2.5, yaw: Math.PI / 2, style: 'mine' },
    { type: 'wolkenplattform', id: 'wolke1', pos: [6, 2.2, -236], size: [3, 0.6, 3], vanish: 1.0, respawn: 2.5 },
    { type: 'wolkenplattform', id: 'wolke2', pos: [8, 4.6, -242], size: [3, 0.6, 3] },
    { type: 'deco_w6', items: [
      { kind: 'minenbalken_reihe', from: [-12.5, 0, -224], to: [-12.5, 0, -248], every: 6, lamp: true },
      { kind: 'kristalle', pos: [11, 0, -246], n: 4 }, { kind: 'lore', pos: [10, 0, -232], yaw: Math.PI / 2 },
      { kind: 'schienen', from: [10, 0, -224], to: [10, 0, -234] },
    ] },

    // ---------------- S9 Turm, Wurfball, Zielscheiben
    plat(-250, -272, 0),
    sign(-11, 0, -251, 'Wurfball und Turm'),
    { type: 'riesenfrageblock', id: 'riesen', pos: [-6, 0, -257], size: 2, grow: 5, content: 'coins:3' },
    { type: 'wurfball', id: 'ball', pos: [4, 0, -254] },
    { type: 'zielscheibe', group: 'ziele', onAll: { coins: 5 }, targets: [{ id: 'ziel1', pos: [3, 1.6, -264] }, { pos: [7, 1.6, -264] }], stand: 1 },

    // ---------------- S10 Ziel
    plat(-272, -290, 0),
  ],
  items: [
    { kind: 'pilz_maske', id: 'maske', pos: [4, 1, -117], hidden: true },
    { kind: 'pow', id: 'pow', pos: [-2, 0, -268] },
  ],
  checkpoint: [0, 1, -98],
  stars: [
    [9, 3.5, -14],
    [6, 6.4, -158],
    [8, 7, -242],
  ],
  goal: [0, 0, -284],
  marks: {
    netzA: [0, 1, -6.5], netzB: [-9, 1, -29], netzC: [11, 1, -27], netzD: [0, 1, -35.5],
    kugel: [0, 1, -45], quelle: [-6, 1, -55],
    dock: [0, 1, -62], schiff: [0, 1, -71.5], schiffRand: [2.6, 1, -71.5], steg: [0, 1, -82], stegEnde: [0, 1, -91],
    halle: [0, 1, -103], tuer: [0, 1, -104.5], tuer2: [-8.5, 1, -114], gong: [8, 1, -117.5], maske: [4, 1, -117],
    floss: [0, 1, -130], flossAuf: [0, 0.9, -134], ufer: [0, 0, -166],
    decke: [6, 1, -154.5], gitter: [9, 0, -161.4],
    wind0: [0, 0, -174], wind1: [0, 0, -183],
    band1: [-6, 0.6, -196], bandwand: [6, 0, -199.2], bandrund: [0, 3, -213],
    quetsch1: [-6, 0, -228], quetsch2: [7, 0, -228], wippe: [-4, 1, -237], wolke1: [6, 2.9, -236],
    riesen: [-6, 2.1, -257], ball: [4, 0, -253.2], ziele: [5, 0, -258], pow: [-2, 0, -266],
    goal: [0, 0, -280],
  },
};
