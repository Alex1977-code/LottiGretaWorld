// B-3 „Fackelnacht am Lila Nebelmoor“ – Welt Blume (Remix-Welt 2), Remix von 4-2 „Das Lila Nebelmoor“ (Bauplan Welt Blume
// B-3: „Nacht, kein Untergrund-Teil; 23 Fackeln in drei Bereichen (8/12/3) mit der Funkenblüte anzünden = Sterne;
// Schiebeplattformen schneller und weiter auseinander; Geheimröhre ersetzt durch unsichtbare Wolken in Bereich 2 →
// Geheimbereich mit Extraleben“). Basis als Daten über remixOf (level/remix.js) – 4-2 bleibt unverändert. Thema poison@nacht
// (Mond, Sterne, Figurenlicht), Musik der Basis mit der Klang-Variante nacht, 400 s, kein Stempel.
//
// Remix-Regeln:
//   • Nacht über dem ganzen Moor; kein Untergrund: die Höhle ist eine offene Schlucht unter dem Sternenhimmel (Überhänge,
//     Tropfsteine an der Decke, hängende Rankenschnapper, Warp-Box und Sternkammer entfallen; keine Höhlen-Stimmung), der
//     Moorkeller samt Röhre und Röhren-Rankenschnapper ebenso.
//   • 23 Moorfackeln: Bereich 1 Giftpfad (8), Bereich 2 Schlucht, Rückkehr und Moorsee (12), Bereich 3 Oberland und
//     Plattformfahrt (3). Nur Feuerbälle der Funkenblüte zünden sie (Funkenblüten: ?-Blöcke am Start, auf I3, am
//     Schluchteingang, am Kontrollpunkt, am Moorsee und im Oberland; der Roulette-Block bleibt).
//   • Schiebeplattformen (mp1–mp4) fahren 1,35× so schnell, sind kleiner (2,3 statt 3 m) und ihre Wege enden an den Inseln
//     0,2 m weiter draußen: jede Lücke ist 0,55–0,7 m breiter; die Paare bleiben im Takt (Tempo des Partners nach Weglänge).
//   • Geheimnis Bereich 2: vom Sims über dem Giftbecken (vier Stufen-Ranken hinauf) führen drei unsichtbare Wolken (je eine
//     Münze schwebt darüber) auf die rechte Schluchtwand – dort oben der Geheimgarten mit Extraleben.
//   • Der Welt-Warp hinter dem Giftwasserfall entfällt (Remix-Welt): hinter dem Vorhang liegt ein Münzschatz.
// Sterne (neu): 0 alle 8 Fackeln im Giftpfad → Stern auf der letzten Insel vor der Schlucht · 1 alle 12 Fackeln in
//   Schlucht, Rückkehr und Moorsee → Stern auf der Insel mit der Röhre hinauf · 2 alle 3 Fackeln im Oberland → Stern auf
//   der Insel mit der Zielröhre.
import { remixOf } from '../../level/remix.js';
import { M42 } from '../w4/4-2.js';
import {
  isl, levelSetupLate, cullStatic, rockLids, swampHut, logs, reeds, fogBanks, dragonflies, glowCrystals, stalactites,
  fireflies, tintWater, lilies, frogs, creeperInstances, chunkBackdrop, gegnerSicht, heroShadowDiet,
} from '../w4/_helpers_a.js';
import { moorfackeln, line, ring } from './_helpers_ba.js';

const PI = Math.PI;
const Y = 1, PY = 0.2, W = 0, U = 5;
const { SHELF, LAKE, FINAL, GOAL, WARP } = M42;
const WT = W + 0.6;                 // Inseln im Moorsee
const GARTEN = { x0: 10.5, x1: 15.5, z0: -72, z1: -86, top: Y + 12.1 };   // Geheimgarten auf der rechten Schluchtwand

// ---------------------------------------------------------------- Fackeln (Fußpunkte)
const FACKELN = {
  giftpfad: [
    [4.6, Y, -3.6], [-5.0, Y, 0.4], [0.9, Y, -19.8], [-6.3, Y, -21.8], [-8.3, Y, -36.2], [3.9, Y, -31.8], [-4.2, Y, -44.8], [9.6, Y, -49.4],
  ],
  schlucht: [
    [-6.1, Y, -66.8], [8.6, Y, -64.0], [-6.1, Y, -81.2], [3.2, SHELF.top, -87.0], [9.4, Y, -97.0], [-6.1, Y, -96.6], [0.0, Y, -92.4],
    [5.0, Y, -101.4], [-5.0, Y, -128.6],
    [-7.2, WT, -140.4], [5.2, WT, -152.2], [-5.6, WT, -161.2],
  ],
  oberland: [[6.8, U, -183.2], [9.6, U, -213.8], [-9.0, U, -230.0]],
};
const STERNE = [[0, Y + 0.2, -55.4], [-1.8, WT + 0.2, -178.6], [-5.4, U + 0.2, -232.6]];

// ---------------------------------------------------------------- unsichtbare Wolken zum Geheimgarten (Mitte unten)
const WOLKEN = [[7.4, SHELF.top + 1.5, -85.6], [9.4, SHELF.top + 3.3, -82.4], [8.0, SHELF.top + 5.1, -79.0]];

/** Kulisse und Budget wie die Basis (ohne Höhlen-/Kammer-Stimmungen, Deckentropfsteine und Kammer-Kristalle). */
function setup(level) {
  rockLids(level, { top: 0x74648a, side: 0x55475f });
  swampHut(level, -11.6, PY - 0.4, 3.6, { deck: Y + 0.4, yaw: 0.35 });
  logs(level, [[8.4, Y, 4.6, 2.6, 0.4, 0.38], [-7.2, Y, -18.6, 2.2, 1.2, 0.34], [5.4, Y, -50.4, 2.4, -0.3, 0.36], [-3.6, Y, -105.6, 2.4, 0.2, 0.36]], { solid: true });
  reeds(level, [
    [6.4, PY, 8.2, 6, 1.7], [-6.6, PY, -4.4, 5, 1.5], [2.4, PY, -12.6, 4, 1.4], [-10, PY, -22, 6, 1.6], [-4.6, PY, -29.2, 4, 1.3],
    [5.4, PY, -33.4, 5, 1.6], [0.6, PY, -42.4, 4, 1.4], [7.6, PY, -44, 5, 1.6], [-6, PY, -52.6, 6, 1.7], [2.6, PY, -56.4, 4, 1.4],
    [-3, PY, -110, 5, 1.5], [3, PY, -118, 5, 1.6], [-3.2, PY, -122.6, 4, 1.4], [4, PY, -200, 5, 1.6], [-7, PY, -214, 6, 1.7],
  ]);
  fogBanks(level, [
    { pos: [0, PY + 0.25, -25], size: [36, 60], n: 22, scale: 5, drift: [0.22, 0.05] },
    { pos: [0, PY + 0.25, -116], size: [28, 20], n: 10, scale: 4.5, drift: [-0.2, 0] },
    { pos: [0, PY + 0.3, -212], size: [34, 44], n: 18, scale: 5, drift: [0.18, -0.04] },
    { pos: [-24, PY + 0.3, -188], size: [24, 22], n: 8, scale: 5, drift: [0.15, 0] },
  ]);
  dragonflies(level, [
    { pos: [4, Y + 1.6, 2], r: 2.4 }, { pos: [-4.6, Y + 1.8, -24], r: 2 }, { pos: [6, Y + 1.4, -38], r: 2.6 }, { pos: [-2, W + 1.4, -140], r: 2.8 },
    { pos: [4, W + 1.2, -158], r: 2.2 }, { pos: [-6, W + 1.6, -170], r: 2.4 }, { pos: [2, U + 1.8, -210], r: 3 }, { pos: [-4, GOAL.top + 1.6, -252], r: 2.4 },
  ]);
  // Schlucht (offen): Leuchtkristalle am Boden und auf dem Sims, Felsspitzen nur vom Boden aus
  glowCrystals(level, [
    [-6.4, Y, -62, 1.2, 0x7ae8ff], [-6.5, Y, -79, 1.0, 0xd88aff], [0.6, Y, -66, 0.8, 0x9aff6a], [-6.3, Y, -94, 1.3, 0x7ae8ff],
    [9.8, SHELF.top, -87.2, 0.8, 0xd88aff], [2.6, SHELF.top, -83.2, 0.9, 0x7ae8ff], [0.8, Y, -97.4, 0.9, 0xd88aff],
    [14.4, GARTEN.top, -74.6, 1.0, 0x9aff6a], [11.2, GARTEN.top, -85.0, 0.9, 0xd88aff],
  ]);
  stalactites(level, [[-6.3, Y, -86, 1.2, 0.45], [0.7, Y, -59.6, 0.9, 0.4], [10, Y, -95, 1.3, 0.5]]);
  fireflies(level, [
    { pos: [-2, Y + 1, -70], size: [10, 4, 20], n: 18 }, { pos: [4, Y + 2, -90], size: [10, 5, 16], n: 14 },
    { pos: [13, GARTEN.top + 0.8, -79], size: [4, 2, 12], n: 10 },
    { pos: [0, W + 1, -150], size: [22, 3, 40], n: 16 }, { pos: [0, GOAL.top + 1, -254], size: [18, 3, 14], n: 12 },
  ], { color: 0xc8ff7a });
  tintWater(level);
  lilies(level, [
    [-6, W, -138, 0.7, 1], [-4.6, W, -139.4, 0.5, 0], [8.6, W, -137, 0.8, 0xffffff], [-9, W, -150, 0.6, 1], [-7.8, W, -152, 0.55, 0],
    [4, W, -146, 0.6, 0], [9.4, W, -158, 0.7, 1], [-10, W, -166, 0.8, 0xffffff], [-3.4, W, -157, 0.5, 1], [7.6, W, -168, 0.6, 0],
    [-7, W, -176, 0.7, 1], [9.6, W, -176, 0.6, 0],
  ]);
  frogs(level, [[-6, W + 0.03, -138, -0.6, 1], [9.4, W + 0.03, -158, 2.4, 0.9], [-10, W + 0.03, -166, 0.4, 1.1], [4.4, U, -186.6, -1.2, 0.9]]);
  creeperInstances(level, { far: 40 });
  chunkBackdrop(level, { far: 150, chunk: 96 });
  gegnerSicht(level, { brummer: { dist: 28, shadow: false } });
  heroShadowDiet(level, 0.16);
}

// Schiebeplattformen: 1,35× so schnell, 2,3 statt 3 m groß und die Wege an den Anschlüssen zu den Inseln 0,2 m weiter weg –
// jede Lücke wird 0,55–0,7 m breiter. Die Partner im Paar (mp1/mp2, mp3/mp4) brauchen weiter gleich lange für ihren Weg.
const K = 1.35, SZ = [2.3, 0.5, 2.3];
const len = (path) => path.slice(1).reduce((a, q, i) => a + Math.hypot(q[0] - path[i][0], q[1] - path[i][1], q[2] - path[i][2]), 0);
const PFADE = {
  mp1: [[0, U - 0.5, -195.6], [0, U - 0.5, -203.4]],
  mp2: [[6.6, U - 0.5, -206.4], [0, U - 0.5, -206.4]],
  mp3: [[6.4, U - 0.5, -217.8], [-2.6, U + 0.6, -217.8]],
  mp4: [[-5.6, U - 0.5, -227.2], [-5.6, U + 0.1, -220.6]],
};
const TEMPO = { mp1: 2.2 * K, mp3: 2 * K };
TEMPO.mp2 = len(PFADE.mp2) / (len(PFADE.mp1) / TEMPO.mp1);
TEMPO.mp4 = len(PFADE.mp4) / (len(PFADE.mp3) / TEMPO.mp3);
const schieben = (e) => ({ ...e, path: PFADE[e.id], speed: TEMPO[e.id], size: SZ });

export const LEVEL = remixOf('4-2', {
  id: 'B-3',
  world: 11,
  title: 'Fackelnacht am Lila Nebelmoor',
  light: 'nacht',
  music: { variant: 'nacht' },
  timeLimit: 400,
  stamp: false,
  baseHooks: { setup: false },
  remove: [
    // Untergrund: hängende Rankenschnapper, Wächter und Warp-Box der Höhle, Moorkeller-Röhre samt Röhren-Ranke, Sternring der
    // Basis, Welt-Warp hinter dem Giftwasserfall
    { id: ['rs_h1', 'rs_h2', 'rs_h3', 'rs_h4', 'rs_h5', 'rs_wache1', 'rs_wache2', 'wb_hoehle', 'wb_kammer', 'p_keller_ein', 'rs_roehre', 'p_keller', 'p_keller_aus', 'sternring', 'p_welt5'] },
    // Überhänge der Höhle (Felsvorsprünge, Decke über dem Sims)
    { type: 'wall', box: [-8, -100, 11, -58] },
    // Sternkammer und Moorkeller (Räume abseits des Wegs)
    { box: [55, -100, 95, -25] },
    { in: 'deco', box: [55, -100, 95, -25] },
  ],
  replace: [
    // Schiebeplattformen schneller, kleiner und weiter auseinander, Paare im selben Takt
    { match: { id: ['mp1', 'mp2', 'mp3', 'mp4'] }, with: schieben },
  ],
  change: [
    // Funkenblüte statt Wachstumsbeere am Kontrollpunkt
    { match: { kind: 'question', box: [-3.5, Y + 2, -104, -2.5, Y + 3, -103] }, set: { content: 'funken' } },
    { match: { type: 'sign', where: (s) => /Nebelmoor/.test(s.text ?? '') }, set: { text: 'Fackelnacht\nim Moor' } },
    { match: { type: 'sign', where: (s) => /hängende/.test(s.text ?? '') }, set: { text: 'Fackeln an –\nmit Funken!', size: [2.6, 0.9] } },
  ],
  stars: STERNE.map((pos, i) => ({ pos, hidden: true, id: `b3_stern${i}` })),
  add: {
    segments: [
      // Geheimgarten oben auf der rechten Schluchtwand und unsichtbare Wolken vom Sims dorthin
      isl(GARTEN.x0, GARTEN.x1, GARTEN.z0, GARTEN.z1, GARTEN.top, 1.2),
      ...WOLKEN.map((pos, i) => ({ type: 'wolkenlift', id: `b3_wolke${i + 1}`, pos, width: 2.6, reveal: 'touch' })),
      { type: 'sign', pos: [12.2, GARTEN.top, -74.2], text: 'Geheim-\ngarten', size: [1.8, 0.8], yaw: PI / 2 },
      { type: 'deco_w4', items: [
        { kind: 'leuchtpilze', pos: [14.2, GARTEN.top, -77.6], n: 5 }, { kind: 'giftpilze', pos: [11.6, GARTEN.top, -82.6], size: [1.6, 1.6], n: 3 },
        { kind: 'sumpfgras', pos: [13, GARTEN.top, -79], size: [4, 10], n: 6 }, { kind: 'giftbaum', pos: [14.4, GARTEN.top, -84.4], height: 4.5 },
      ] },
    ],
    blocks: [
      // Funkenblüten zum Nachfüllen: Schluchteingang, Moorsee, Oberland
      { kind: 'question', pos: [3.0, Y + 2.4, -61.2], content: 'funken' },
      { kind: 'question', pos: [2.0, WT + 2.4, -133.0], content: 'funken' },
      { kind: 'question', pos: [1.0, U + 2.4, -188.8], content: 'funken' },
    ],
    items: [
      // je eine Münze über den unsichtbaren Wolken (Hinweis), Geheimgarten mit Extraleben (bleibt liegen)
      ...WOLKEN.map(([x, y, z]) => ({ kind: 'coin', pos: [x, y + 1.45, z] })),
      { kind: 'powerup', pos: [13.2, GARTEN.top + 0.1, -79.2], power: 'oneup', speed: 0 },
      ring([13.0, GARTEN.top + 1.0, -79.2], 1.6, 6),
      // Münzschatz hinter dem Giftwasserfall (statt des Welt-Warps)
      ring([WARP.face - 2.8, WARP.top + 1.0, -186.5], 1.3, 8),
      line([-3, Y + 0.6, -62], [-3, Y + 0.6, -72], 4),
    ],
  },
  build(level) {
    // rechte Schluchtwand über dem Sims ohne Wandrutschen/Wandsprung (der Geheimgarten nur über die Wolken)
    level.world.add({ type: 'box', min: [GARTEN.x0 - 0.18, SHELF.top - 2, -92], max: [GARTEN.x0, GARTEN.top - 0.1, -70], noWallSlide: true, tag: 'schluchtwand' });
    moorfackeln(level, {
      giftpfad: { list: FACKELN.giftpfad, onAll: { star: 0 }, at: STERNE[0] },
      schlucht: { list: FACKELN.schlucht, onAll: { star: 1 }, at: STERNE[1] },
      oberland: { list: FACKELN.oberland, onAll: { star: 2 }, at: STERNE[2] },
    }, { id: 'fackeln' });
  },
  setup: levelSetupLate(setup, (level) => { cullStatic(level); }),
  marks: {
    garten: [13, GARTEN.top, -79], sims: [5.0, SHELF.top, -85.4], schlucht: [-3, Y, -62], see: [0, WT, -133], oberland: [0, U, -188],
    final: [-2, FINAL.top, -231],
  },
});

export const M_B3 = { FACKELN, STERNE, WOLKEN, GARTEN, LAKE };
