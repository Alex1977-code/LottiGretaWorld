// Lavawerkstatt (0-26): jedes neue Welt-7-Gimmick und das Power-up Wurfsichel in einer Station mit Schild, Kameraschiene und
// benannten Punkten (marks) für tests/course_w7_blocks.mjs. Thema volcano; mit ?theme=<name> lässt sich jedes Welt-7-Thema
// ansehen (darkruins, lavarun, lavatower, lavamachine, reef, volcano). Level verläuft nach −Z; Plateaus mit Oberseite y = 0.
//   S0  Start: Wurfsichel (Item und ?-Block)                                          z    6 …   −8
//   S1  Wurfsichel-Bahn: Münzen über der Lava, Pilzlinge, ?-Block, Wand               z   −8 …  −28
//   S2  Feuerstäbe: Stein-Block, ?-Block mit Anheben (zwei Arme)                      z  −28 …  −48
//   S3  Lavablasen: rot senkrecht, blau, Bogen                                        z  −48 …  −62
//   S4  Pfeilplattformen: Reihe aus der Lava, eine aus der Wand, eine per Signal      z  −62 …  −86
//   S5  Zylinder, rotierende Stachelwalze, Pendelstachel                              z  −86 … −112
//   S6  Steigende/sinkende Lava, Gitterboden, Fontänen (heiß, tragend)               z −112 … −142
//   S7  Klappstampfer (Stacheln; Stampfplatte mit Loch)                               z −142 … −158
//   S8  Zugbrücke mit Druckknopf über dem Lavagraben                                  z −158 … −178
//   S9  Schaltfeld-Gruppe macht den Weg sichtbar (dunkler Tempel)                     z −178 … −198
//   S10 Giftnebel-Flucht                                                              z −198 … −220
//   S11 Unterwasser: zerbrechliche Kisten                                             z −220 … −238
//   S12 Ziel                                                                          z −238 … −252

const plat = (z0, z1, top = 0, w = 26, x = 0) => ({ type: 'island', pos: [x, top - 4, (z0 + z1) / 2], size: [w, 4, Math.abs(z1 - z0)], under: 0 });
const sign = (x, y, z, text) => ({ type: 'sign', pos: [x, y, z], text });

export const LEVEL = {
  id: '0-26',
  world: 0,
  title: 'Lavawerkstatt',
  archetype: 'parcours',
  theme: 'volcano',
  music: 'course_volcano',
  timeLimit: 999,
  start: { pos: [0, 0, 3], yaw: Math.PI / 2 },
  camera: [
    { from: 8, to: -8, pitch: 42, dist: 14 },
    { from: -8, to: -28, pitch: 46, dist: 15 },
    { from: -28, to: -48, pitch: 48, dist: 15 },
    { from: -48, to: -62, pitch: 46, dist: 15 },
    { from: -62, to: -86, pitch: 46, dist: 16 },
    { from: -86, to: -112, pitch: 42, dist: 15 },
    { from: -112, to: -142, pitch: 48, dist: 17 },
    { from: -142, to: -158, pitch: 44, dist: 15 },
    { from: -158, to: -178, pitch: 44, dist: 16 },
    { from: -178, to: -198, pitch: 46, dist: 15 },
    { from: -198, to: -220, pitch: 44, dist: 15 },
    { from: -220, to: -238, pitch: 40, dist: 14 },
    { from: -238, to: -254, pitch: 44, dist: 15 },
  ],
  segments: [
    // ---------------- S0 Start
    plat(6, -8),
    sign(-7, 0, 1, 'Lavawerkstatt'),
    { type: 'deco_w7', items: [
      { kind: 'burgturm', pos: [-11, 0, -4], height: 7, radius: 1.5, solid: true }, { kind: 'fahne', pos: [9, 0, 2], height: 5 },
      { kind: 'fackel', pos: [-4, 0, 4], mount: 'stand' }, { kind: 'fackel', pos: [4, 0, 4], mount: 'stand' },
      { kind: 'vulkanfelsen', pos: [10, 0, -4], size: [5, 6], n: 3 }, { kind: 'basaltsaeulen', pos: [-24, -6, -12], n: 8, height: [3, 9], shadow: false },
    ] },

    // ---------------- S1 Wurfsichel-Bahn
    plat(-8, -14),
    sign(-11, 0, -9, 'Wurfsichel'),
    { type: 'lava', pos: [0, -2, -16], size: [26, 1.5, 4] },
    plat(-18, -28),
    { type: 'wall', pos: [-8, 0, -26], size: [5, 3, 1], style: 'stone' },
    { type: 'deco_w7', items: [{ kind: 'knochen', pos: [-9, 0, -24], n: 5 }, { kind: 'glutriss', pos: [-6, 0, -20], length: 3 }, { kind: 'wappen', pos: [-8, 1.6, -25.45], size: 1.6 }] },

    // ---------------- S2 Feuerstäbe
    plat(-28, -48),
    sign(-11, 0, -29, 'Feuerstab'),
    { type: 'feuerstab', id: 'stab1', pos: [-5, 0, -34], block: 'stein', length: 6, speed: 1.6 },
    { type: 'feuerstab', id: 'stab2', pos: [5, 0, -42], block: 'frage', length: 5, arms: 2, speed: -1.2, content: 'coins:3', lift: 3 },
    { type: 'deco_w7', items: [{ kind: 'zinnen', from: [-13, 0, -47], to: [-8, 0, -47], height: 2 }, { kind: 'kette', pos: [11, 6, -36], length: 4 }, { kind: 'fackel', pos: [-12.5, 1.6, -40], yaw: 0 }] },

    // ---------------- S3 Lavablasen
    plat(-48, -51),
    sign(-11, 0, -49, 'Lavablasen'),
    { type: 'lava', pos: [0, -2, -55], size: [26, 1.5, 8] },
    { type: 'island', pos: [0, -4, -55], size: [2.4, 4, 2.4], under: 0 },
    { type: 'lavablase', height: 4, period: 3, list: [{ id: 'blase1', pos: [-4, -0.5, -55], phase: 0 }, { id: 'blase2', pos: [4, -0.5, -55], color: 'blau', phase: 0.5 }] },
    { type: 'lavablase', id: 'blase3', pos: [-9, -0.5, -53], to: [-9, -57], height: 3, period: 2.4 },
    plat(-59, -62),
    { type: 'deco_w7', items: [{ kind: 'vulkanfels', pos: [11, -0.5, -56], size: 2 }, { kind: 'basaltsaeulen', pos: [-12, -0.5, -58], n: 4, height: [0.6, 1.6] }] },

    // ---------------- S4 Pfeilplattformen
    plat(-62, -65),
    sign(-11, 0, -63, 'Pfeilplattformen'),
    { type: 'lava', pos: [0, -2, -73], size: [26, 1.5, 16], color: 'blau' },
    { type: 'pfeilplattform', id: 'pfeil1', pos: [0, -0.4, -68], size: [3, 0.4, 3], arrow: [0, -1], phase: 0, wait: 2, up: 3.2 },
    { type: 'pfeilplattform', id: 'pfeil2', pos: [0, -0.4, -72], size: [3, 0.4, 3], arrow: [0, -1], phase: -1.2, wait: 2, up: 3.2 },
    { type: 'pfeilplattform', id: 'pfeil3', pos: [0, -0.4, -76], size: [3, 0.4, 3], arrow: [0, -1], phase: -2.4, wait: 2, up: 3.2 },
    { type: 'wall', pos: [11.5, -2, -72], size: [3, 6, 6], style: 'stone' },
    { type: 'pfeilplattform', id: 'pfeilwand', from: 'wand', pos: [8.5, 0.6, -72], size: [3, 0.4, 2.4], dir: [-1, 0], wait: 1.6, up: 3 },
    { type: 'pfeilplattform', id: 'pfeilsig', mode: 'signal', pos: [-6, -0.4, -74], size: [3, 0.4, 3], arrow: [0, -1] },
    plat(-81, -86),
    { type: 'deco_w7', items: [{ kind: 'basaltsaeule', pos: [-11, -0.5, -70], height: 2 }, { kind: 'basaltsaeule', pos: [-10, -0.5, -78], height: 1.4 }] },

    // ---------------- S5 Zylinder, Stachelwalze, Pendel
    sign(-11, 0, -84, 'Zylinder und Walzen'),
    { type: 'lava', pos: [0, -2.5, -91], size: [26, 1.5, 10] },
    { type: 'zylinder', id: 'zylinder', pos: [0, -1.6, -91], radius: 2.5, length: 9, axis: 'x', speed: 0.5 },
    plat(-96, -112),
    { type: 'stachelwalze_rot', id: 'walze', pos: [0, 0.55, -100], radius: 1.1, length: 7, axis: 'x', speed: 1.3 },
    { type: 'pendelstachel', id: 'pendel', pos: [0, 5.4, -107], length: 4.6, radius: 0.6, swing: 55, period: 3 },
    { type: 'deco_w7', items: [{ kind: 'zahnrad', pos: [11, 0, -102], size: 3, axis: 'x' }, { kind: 'rohr', from: [-12, 3, -110], to: [-12, 3, -98] }, { kind: 'schlot', pos: [-11, 0, -104], height: 4 },
      { kind: 'zinnen', from: [-3, 5.6, -107], to: [3, 5.6, -107], height: 0.6, thick: 0.8, solid: false }] },

    // ---------------- S6 Steigende Lava, Gitterboden, Fontänen
    plat(-112, -114),
    sign(-11, 0, -113, 'Steigende Lava'),
    { type: 'lavaspiegel', id: 'spiegel', pos: [0, -4, -127], size: [26, 2.5, 26], low: -1.5, high: 0.4, wait: 4, warn: 1.5, rise: 2.5, hold: 3, fall: 2.5 },
    { type: 'island', pos: [-8, -4, -118], size: [3, 5.2, 3], under: 0 },
    { type: 'island', pos: [0, -4, -118], size: [3, 3.6, 3], under: 0 },
    { type: 'gitterboden', id: 'gitter', pos: [7, 0.3, -120], size: [6, 6], thick: 0.2 },
    { type: 'island', pos: [7, -4, -116], size: [6, 4.3, 2], under: 0 },
    { type: 'lava_fontaene', id: 'fontaene1', pos: [-6, -1.5, -128], height: 5, radius: 0.7, mode: 'heiss', wait: 2.5, phase: 0 },
    { type: 'lava_fontaene', id: 'fontaene2', pos: [3, -1.5, -132], height: 5.5, mode: 'tragen', plate: 2.6, wait: 3, hold: 2.5, phase: 1 },
    { type: 'island', pos: [3, -4, -137], size: [4, 8.2, 3], under: 0 },
    plat(-140, -142),
    { type: 'deco_w7', items: [{ kind: 'lavafall', pos: [-12.5, -1.5, -134], width: 3, height: 7, yaw: Math.PI / 2 }, { kind: 'vulkanfelsen', pos: [11, 0, -141], size: [4, 2], n: 2 }] },

    // ---------------- S7 Klappstampfer
    plat(-142, -158),
    sign(-11, 0, -143, 'Klappstampfer'),
    { type: 'klappstampfer', id: 'klapp1', pos: [-4, 0, -150], width: 3.4, length: 4, dir: [0, 1], spikes: true, damage: 'treffer', wait: 2.4, phase: 0 },
    { type: 'klappstampfer', id: 'klapp2', pos: [4, 0, -150], width: 3.4, length: 4, dir: [0, 1], spikes: false, damage: 'tod', hole: [-0.7, 0.7, 1.4, 2.8], wait: 2.4, phase: 1.2, style: 'metall' },
    { type: 'deco_w7', items: [{ kind: 'zinnen', from: [-13, 0, -156], to: [13, 0, -156], height: 1.2, solid: false }, { kind: 'fackel', pos: [-12, 0, -146], mount: 'stand' }, { kind: 'fackel', pos: [12, 0, -146], mount: 'stand' }] },

    // ---------------- S8 Zugbrücke
    plat(-158, -162),
    sign(-11, 0, -159, 'Zugbrücke'),
    { type: 'lava', pos: [0, -2.5, -166], size: [26, 1.5, 8] },
    { type: 'zugbruecke', id: 'bruecke', pos: [0, 0, -162], length: 8, width: 3, dir: [0, -1], schalter: { id: 'knopf', pos: [6, 0, -160] } },
    plat(-170, -178),
    { type: 'deco_w7', items: [{ kind: 'burgturm', pos: [-6, 0, -172], height: 6, radius: 1.3 }, { kind: 'burgturm', pos: [6, 0, -172], height: 6, radius: 1.3 }, { kind: 'fahne', pos: [0, 4.2, -174.5], hang: true, length: 2.6 }] },

    // ---------------- S9 Schaltfeld-Gruppe
    plat(-178, -184),
    sign(-11, 0, -179, 'Schaltfelder'),
    { type: 'lava', pos: [0, -2.5, -188], size: [26, 1.5, 8] },
    { type: 'schaltfelder', id: 'schalt', pos: [0, 0, -181], grid: [2, 2], spacing: 1.8,
      weg: [{ pos: [0, -0.4, -185.5], size: [2.4, 0.4, 2.4] }, { pos: [0, -0.4, -188.3], size: [2.4, 0.4, 2.4] }, { pos: [0, -0.4, -191], size: [2.4, 0.4, 2.4] }] },
    plat(-192, -198),
    { type: 'deco_w7', items: [{ kind: 'fackel', pos: [-3, 0, -183], mount: 'stand' }, { kind: 'fackel', pos: [3, 0, -183], mount: 'stand' }] },

    // ---------------- S10 Giftnebel-Flucht
    plat(-198, -220),
    sign(-11, 0, -199, 'Giftnebel'),
    { type: 'giftnebel', id: 'nebel', pos: [0, 4, -197], size: [26, 9], dir: '-z', speed: 2.2, to: 22, delay: 0.8, start: { box: [-13, -1, -204, 13, 6, -200] }, gap: 3 },
    { type: 'deco_w7', items: [{ kind: 'kette', pos: [-10, 7, -210], length: 5 }, { kind: 'knochen', pos: [9, 0, -214], n: 4 }] },

    // ---------------- S11 Unterwasser
    plat(-220, -222),
    sign(-11, 0, -221, 'Unterwasser-Kisten'),
    { type: 'island', pos: [0, -8, -230], size: [26, 2, 16], under: 0 },
    { type: 'water', pos: [0, -6, -230], size: [26, 5.6, 16] },
    { type: 'wall', pos: [-7.1, -6, -230], size: [11.8, 6, 1], style: 'stone' },
    { type: 'wall', pos: [7.1, -6, -230], size: [11.8, 6, 1], style: 'stone' },
    { type: 'wall', pos: [0, -3.6, -230], size: [2.4, 3.6, 1], style: 'stone' },
    { type: 'kiste_wasser', kisten: [{ id: 'kiste1', pos: [-0.6, -6, -230], content: 'coins:2' }, { pos: [0.6, -6, -230] }, { pos: [-0.6, -4.8, -230] }, { pos: [0.6, -4.8, -230], content: 'coins:2' }] },
    { type: 'deco_w7', items: [{ kind: 'korallen', pos: [-6, -6, -226], size: [6, 4], n: 4 }, { kind: 'seetang', pos: [7, -6, -235], height: 3 }, { kind: 'koralle', pos: [5, -6, -226], color: 'tuerkis' }] },
    plat(-238, -252),

    // Rand: Kulisse am Weg (nur Optik)
    { type: 'deco_w7', shadow: false, items: [
      { kind: 'basaltsaeulen', pos: [-22, -5, -60], n: 6, height: [4, 10] }, { kind: 'basaltsaeulen', pos: [22, -5, -120], n: 6, height: [4, 10] },
      { kind: 'vulkanfelsen', pos: [-20, -3, -170], size: [6, 10], n: 4, max: 3 }, { kind: 'vulkanfelsen', pos: [20, -3, -210], size: [6, 10], n: 4, max: 3 },
    ] },
  ],
  blocks: [
    { kind: 'question', pos: [-3, 3, -4], content: 'sichel' },
    { kind: 'question', id: 'qsichel', pos: [-5, 1.25, -23.5], content: 'coins:2' },
  ],
  enemies: [
    { kind: 'pilzling', id: 'pilz1', pos: [10.3, 0, -20], path: [[10.3, 0, -20], [10.3, 0, -24]], speed: 1 },
  ],
  items: [
    { kind: 'powerup', id: 'sichel_item', pos: [3, 0, -2], power: 'sichel' },
    { kind: 'coins', from: [0, 0.4, -13.4], to: [0, 0.4, -16.6], n: 3 },
    { kind: 'coins', from: [-0.6, -5.6, -232], to: [0.6, -5.6, -232], n: 2 },
  ],
  checkpoint: [0, 0, -113],
  stars: [
    [5, 5.2, -42],
    [3, 5.4, -137],
    [0, -5, -234],
  ],
  goal: [0, 0, -248],
  marks: {
    sichel: [0, 0, -10], sichelWand: [-8, 0, -21], pilz: [10.3, 0, -18.5], qsichel: [-5, 0, -19.5],
    stab1: [-5, 0, -30], stab2: [5, 0, -44.5], stab2Top: [5, 1.05, -42],
    blasen: [0, 0, -50], blase1: [-4, -0.5, -55], insel: [0, 0, -55],
    pfeile: [0, 0, -64], pfeil1: [0, 0.2, -68], pfeilwand: [8.5, 1.2, -72],
    zylinder: [0, 1, -91], walze: [0, 0, -97], walzeOben: [0, 1.75, -100], pendel: [0, 0, -103.5],
    spiegel: [0, 0, -113.5], saeuleHoch: [-8, 1.2, -118], saeuleTief: [0, -0.4, -118], gitter: [7, 0.5, -120], fontaene1: [-6, 0, -128], fontaene2: [3, 0, -132],
    klapp: [0, 0, -145], klapp1: [-4, 0, -148], klapp2: [4, 0, -148], klappLoch: [4, 0, -147.9],
    bruecke: [0, 0, -159.5], knopf: [6, 0, -160], ufer2: [0, 0, -172],
    schalt: [0, 0, -180], weg: [0, 0, -191.5],
    nebel: [0, 0, -199], nebelStart: [0, 0, -202],
    wasser: [0, 0, -221], kisten: [0, -3, -228],
    goal: [0, 0, -244],
  },
};
