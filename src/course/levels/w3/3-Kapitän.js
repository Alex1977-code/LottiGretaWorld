// 3-Kapitän „Krümel und der Röhrensee“ (Archetyp diorama, Thema diorama, Musik course_diorama) – Rätsel-Diorama nach
// dem Bauplan (3-Kapitän: See-Diorama, 400 s). Krümel, Pflaumes kleiner Kaninchen-Freund, ist als Kapitän unterwegs
// (Kapitänsmütze, Rucksack mit Karte; im Wasser mit Schwimmring). Er springt nicht (Figur des Archetyps), schwimmt aber
// an der Oberfläche – tauchen kann er nicht: unter Wasser bringen ihn die Glasröhren.
//
// Aufbau (ca. 26 × 26 m, schwebt über dem Wolkenmeer): unten der See (Boden y −4, Wasser −1,4; vorn und links
// Aquarium-Scheiben, durch die man unter Wasser schaut), in der Mitte Ufer (y 0) und der Holzsteg, oben die Wiese (y 4)
// mit dem großen Bauwerk, der Seewarte (Turm mit Dachterrasse, y 10,2). Ein Glasröhren-Netz verbindet alles:
//   Mauseloch unter der Seewarte (Ufer hinten) → Röhre taucht unter dem Ufer in den See →
//     Gabelung G1 (unter Wasser): links nach oben → an der Klippe hinauf auf die Dachterrasse der Seewarte
//     Kreuzung G2 (Seemitte, unter Wasser): geradeaus → Ausgang am Seegrund (Krümel steigt im Wasser auf)
//                                           rechts → hinauf in die Glaskuppel auf der Felssäule (Wasserschalter)
//                                           links  → hinauf ans Ufer hinten links
//   Kuppel → kurze Röhre zum rechten Ufer.
// Der Wasserschalter in der Kuppel hebt den See (−1,4 → −0,1) und mit ihm den Holzsteg bis auf Uferhöhe.
//
// Sterne (Bauplan): 1 gegenüber dem Start (Ufer hinten links), 2 Loch unter dem Bau ins Rohr, an G1 nach oben
// (Dachterrasse), 3 an der Kreuzung geradeaus ins Wasser (Seegrund), 4 Schalter im Rohr (Kuppel: fällt aus der Röhre
// auf den Schalter, der Stern erscheint), 5 über den gehobenen Holzsteg auf das Leuchtturm-Inselchen.
// Gegner: Rammfisch (1) im See. Schatzstellen (rotes Kreuz): stehen bleiben → Krümel buddelt Bitcoins aus.
// Koordinaten: x −13 … 13, z −13 … 13 (vorn = +z), Ebenen y −4 (Seegrund) / 0 (Ufer) / 4 (Wiese) / 10,2 (Terrasse).

import {
  hook, isl, line, ring, decoW1, useKruemel, glassWall, seeTower, glassDome, sandRamp, lilyPads, ducks, lighthouse,
  rowboat, parasol,
} from './_helpers_c.js';

const W0 = -1.4, W1 = -0.1;        // Wasserstand vor / nach dem Schalter
const HEDGE = { style: 'grass' };
const hedge = (x0, x1, z0, z1, y = 0) => ({ type: 'wall', pos: [(x0 + x1) / 2, y, (z0 + z1) / 2], size: [x1 - x0, 0.9, Math.abs(z1 - z0)], ...HEDGE });

// Glasröhren-Netz (Hauptlinie: Mauseloch → G1 (Index 5) → G2 (Index 6) → Ausgang am Seegrund)
const MAIN = [
  [-5, 0.6, -6.6], [-5, 0.45, -7.5], [-5, -1.7, -7.3], [-5, -2.8, -5.6], [-5, -2.8, -3.6],
  [-5, -2.8, -1.5], [-5, -2.8, 2.5], [-5, -3.1, 4.4], [-5, -2.0, 5.1],
];
const UP = [[-6.6, -2.4, -1.8], [-7.6, -0.2, -2.1], [-7.9, 2.4, -2.5], [-7.9, 3.8, -4.2], [-7.9, 5.8, -5.0], [-7.9, 9.6, -5.1], [-7.3, 10.9, -6.6], [-6.0, 10.75, -8.4]];
const RIGHT = [[-3.0, -2.8, 2.7], [-1.0, -2.3, 3.6], [0.0, 0.6, 4.6], [0.5, 3.0, 5.4], [1.1, 3.9, 5.5], [1.5, 3.6, 5.5], [1.5, 2.3, 5.5]];
const LEFT = [[-7.0, -2.8, 2.4], [-10.0, -2.3, 0.6], [-10.6, -0.6, -1.6], [-10.6, 0.4, -3.0], [-10.6, 0.6, -4.3]];

function scene(level) {
  // Aquarium-Scheiben vorn und links (Blick unter Wasser), mit Holzrahmen
  glassWall(level, [
    { min: [-13, -5, 12], max: [6, 0.45, 13] },
    { min: [-13, -5, -3], max: [-12, 0.45, 12] },
  ]);
  seeTower(level, { pos: [-5, 4, -9.5], r: 3, h: 6.2, gap: [3.5, 4.3], door: Math.PI / 2 - 0.5, telescope: [-3.4, 10.2, -8.4], flag: [-6.4, 10.2, -11.2] });
  glassDome(level, { pos: [1.5, 0.3, 5.5], r: 1.7, h: 2.3, rock: -5, open: 0 });
  sandRamp(level, { x0: 0, x1: 6, zA: -3, zB: 3, yLow: -2.6, yHigh: 0, base: -5, dir: 1 });
  lighthouse(level, { pos: [-11, 0, 11], h: 3.2 });
  rowboat(level, { pos: [4.2, 11], yaw: 0.25, waterId: 'see', y0: W0 });
  parasol(level, { pos: [8, 0, -1.8], yaw: 0.6 });
  lilyPads(level, 'see', [[-2.2, 0.8, 0.5, true], [-9.2, -1.2, 0.45], [-6.6, 3.6, 0.38], [3.4, 8.9, 0.5, true], [-9.6, 4.6, 0.36, true], [-1.2, 10.8, 0.42]], W0);
  ducks(level, { center: [-7.8, 1.6], r: 2.2, waterId: 'see', y0: W0, phase: 0.4 });
}

export const LEVEL = {
  id: '3-Kapitän',
  world: 3,
  title: 'Krümel und der Röhrensee',
  archetype: 'diorama',
  theme: 'diorama',
  music: 'course_diorama',
  timeLimit: 400,
  killY: -16,
  start: { pos: [9.5, 0, 9.5], yaw: Math.PI },
  diorama: {
    // Mitte etwas nach hinten und oben: die Seewarte (bis y ≈ 12) bleibt in der Übersicht ganz im Bild
    center: [-0.5, 4, -4],
    camera: { yaw: 28, pitch: 46, dist: [46, 15], follow: [0.3, 0.9], fov: 40 },
    props: [
      // Wiese: Häuschen des Seewärters, Pilze, Wimpel
      { kind: 'house', pos: [7.4, 4, -10.2], yaw: -0.3, size: [3.4, 2.6, 3], roof: 0x3a8bff, wall: 0xfff6e6 },
      { kind: 'mushroom', pos: [10.8, 4, -7.4], size: 0.6 }, { kind: 'mushroom', pos: [11.4, 4, -8.2], size: 0.4, color: 0xffb02a },
      { kind: 'mushroom', pos: [-11.6, 4, -7.2], size: 0.5, color: 0xa865ff }, { kind: 'mushroom', pos: [12, 0, 11.6], size: 0.55 },
      { kind: 'banner', pos: [12.3, 4, -12.3], color: 0xff7ac0 }, { kind: 'banner', pos: [-12.3, 0, -3.4], color: 0xffd23a, yaw: 0.6 },
      { kind: 'banner', pos: [12.4, 0, 12.4], color: 0x3a8bff },
      // Schatzstellen
      { kind: 'dig', pos: [9.4, 4, -7.6] }, { kind: 'dig', pos: [10.8, 0, 11.2] }, { kind: 'dig', pos: [-9.4, 0, 7.6] },
      // Wolkenmeer, schwebende Inselchen in der Ferne
      { kind: 'cloudsea', pos: [0, -14, 0], r: 48, n: 52 },
      { kind: 'islet', pos: [-32, 2, -16], size: 3.4 }, { kind: 'islet', pos: [29, -3, 18], size: 2.6 }, { kind: 'islet', pos: [24, 7, -30], size: 3 },
      { kind: 'islet', pos: [-27, -5, 25], size: 2.2 },
    ],
  },
  // Level-Haken: Krümel statt Pflaume (nur die Darstellung, Archetyp unverändert); Budget: Holzsteg und Schalter ohne
  // Sonnenschatten (Blob bleibt)
  setup: (level, sc) => {
    useKruemel(level, sc);
    const quiet = (root) => root?.traverse((m) => { if (m.isMesh) m.castShadow = false; });
    for (const o of level.view?.three.children ?? []) if (o.name === 'modell:holzsteg') quiet(o);
    for (const e of level.entities) if (e.kind === 'wasserschalter' || e.kind === 'lantern') quiet(e.model?.root);
  },
  segments: [
    // ---------------- Würfelkörper: Wiese (y 4) mit Mauseloch unter der Seewarte, Ufer (y 0), Erde unter dem See
    { type: 'island', pos: [-9.5, -6.5, -9.5], size: [7, 10.5, 7], under: 0 },
    { type: 'island', pos: [4.5, -6.5, -9.5], size: [17, 10.5, 7], under: 0 },
    { type: 'island', pos: [-5, -6.5, -10.1], size: [2, 10.5, 5.8], under: 0 },
    { type: 'island', pos: [-5, 1.8, -6.6], size: [2, 2.2, 1.2], under: 0 },
    { type: 'island', pos: [-5, -6.5, -6.6], size: [2, 6.5, 1.2], under: 0, top: 'stone' },
    isl(-13, 13, -6, -3, 0, 6.5, { under: 0 }),
    isl(6, 13, -3, 13, 0, 6.5, { under: 0 }),
    isl(-13, 6, -3, 13, -5, 1.5, { under: 0, top: 'none' }),
    // Inselchen mit Leuchtturm (vorn links), fest bis zum Seegrund
    isl(-12, -8, 6, 12, 0, 5, { under: 0 }),
    // See (Seegrund y −4, Sandbett, Lichtflecken) – Wasserstand über den Schalter
    { type: 'lagune', id: 'see', pos: [-3, -4, 4.5], size: [18, 2.6, 15], bed: 1, caustics: 0.45 },
    // Holzsteg in zwei Stücken (rechtes Ufer → Inselchen), schwimmt auf; bei hohem Wasser auf Uferhöhe (Deck 0)
    { type: 'holzsteg', id: 'stegA', pos: [-8, -2.7, 9], yaw: 0, length: 7, width: 2, hub: 2.2, float: 0.1 },
    { type: 'holzsteg', id: 'stegB', pos: [-1, -2.7, 9], yaw: 0, length: 7, width: 2, hub: 2.2, float: 0.1 },
    // Glasröhren-Netz
    { type: 'glasspipe', id: 'roehre', path: MAIN, radius: 0.9, speed: 9, enter: ['start'],
      branches: [{ at: 5, path: UP }, { at: 6, path: RIGHT, enter: false }, { at: 6, path: LEFT, enter: false }] },
    { type: 'glasspipe', id: 'roehre2', path: [[2.7, 0.95, 5.5], [4.9, 0.95, 5.5], [7.0, 0.95, 5.5]], radius: 0.9, speed: 8, coins: 2 },
    // Treppe vom rechten Ufer auf die Wiese (Stufen 0,25 m: Krümel springt nicht)
    { type: 'stairs', pos: [11, 0, 0], dir: '-z', steps: 16, rise: 0.25, run: 0.375, width: 3, style: 'grass' },
    // Hecken an den Außenkanten (kein Absturz ins Wolkenmeer)
    hedge(12.6, 13, -3, 13), hedge(6, 12.6, 12.6, 13), hedge(-13, -12.6, -6, -3), hedge(12.6, 13, -6, -3),
    hedge(-13, -12.6, -13, -6, 4), hedge(-12.6, 12.6, -13, -12.6, 4), hedge(12.6, 13, -13, -6, 4),
    // Unterwasser- und Uferzier
    { type: 'deco_w3', items: [{ kind: 'korallen', pos: [-4, -4, 8.5], size: [7, 4], n: 5, gap: 1.6, shadow: false }] },
    { type: 'seetang', pos: [-9.6, -4, 3.4], height: 2.2, count: 3 },
    { type: 'seetang', pos: [-1.6, -4, 11.2], height: 2.0, count: 3 },
    { type: 'blasen', pos: [-6.4, -4, 0.4], height: 2.4, count: 8 },
    decoW1([
      { kind: 'reeds', pos: [6.5, 0, 10.6], n: 7, size: 1.3 }, { kind: 'reeds', pos: [-12.2, 0, -3.4], n: 6 },
      { kind: 'reeds', pos: [-8.4, 0, 6.4], n: 5, size: 1.1 }, { kind: 'reeds', pos: [6.4, 0, 3.6], n: 5 },
      { kind: 'bellflowers', pos: [9, 0, 6], size: [2.4, 1.6], n: 7 }, { kind: 'bellflowers', pos: [-2, 4, -7.4], size: [3, 1.2], n: 8 },
      { kind: 'daisies', pos: [3, 4, -9.5], size: [6, 4], n: 24 }, { kind: 'daisies', pos: [9.5, 0, 8], size: [5, 6], n: 18 },
      { kind: 'tufts', pos: [0, 0, -4.5], size: [20, 2.4], n: 12 }, { kind: 'tufts', pos: [-10, 4, -9], size: [5, 6], n: 7 },
      { kind: 'picnic', pos: [0.6, 4, -10.6], yaw: 0.3 },
      { kind: 'stump', pos: [12, 0, 1.2], size: 0.45 },
      { kind: 'butterflies', pos: [4, 5, -9], n: 4, r: 3, h: 1.4 },
      { kind: 'pebbles', from: [7.5, 0, 12], to: [7.5, 0, 2], n: 6, size: 0.3 },
    ]),
    { type: 'deco', items: [
      { kind: 'tree', pos: [11.6, 4, -11.4], size: 3.6, color: 'green' }, { kind: 'tree', pos: [-11.4, 4, -11.6], size: 3.2, color: 'autumn' },
      { kind: 'tree', pos: [11.8, 0, 3.4], size: 3, color: 'green' }, { kind: 'bush', pos: [-12, 0, -5.4], size: 0.6 },
      { kind: 'bush', pos: [6.8, 0, -2.4], size: 0.5 }, { kind: 'bush', pos: [-8.8, 4, -7], size: 0.5 },
{ kind: 'lantern', pos: [-2.4, 0, -5.5] }, { kind: 'lantern', pos: [9.2, 4, -6.6] },
      { kind: 'lantern', pos: [-9.6, 0, 9.4] },
      { kind: 'fence', from: [-12.4, 4, -6.3], to: [-6.4, 4, -6.3] }, { kind: 'fence', from: [-3.6, 4, -6.3], to: [8.8, 4, -6.3] },
    ] },
    { type: 'sign', pos: [8.6, 0, 11.4], text: 'Kapitän Krümel\nsticht in See!', yaw: -0.5 },
    { type: 'sign', pos: [-3.4, 0, -5.2], text: 'Röhren-Bahnhof', yaw: 0.2 },
  ],
  items: [
    // Aufbau-Haken: Laterne am rechten Ufer baut Scheiben, Seewarte, Kuppel, Strand und Zier
    hook([6.6, 0, 8.2], scene),
    // Ufer und Wiese
    line([8.6, 0.3, 7.5], [8.6, 0.3, 1], 4),
    line([4, 0.3, -4.5], [-3, 0.3, -4.5], 4),
    line([11, 2.2, -1.6], [11, 3.6, -4.6], 3),
    ring([2.5, 4.3, -9.2], 1.4, 6),
    // Röhren-Netz (unter Wasser zwischen G1 und G2 – nur aus der Röhre zu holen)
    line([-5, -3.25, -1], [-5, -3.25, 2], 4),
    // über dem Holzsteg (erst bei hohem Wasser erreichbar)
    line([3.5, 0.6, 9], [-6, 0.6, 9], 6),
    { kind: 'chest', pos: [5.8, 4, -12], content: 'coins:5', yaw: 0.3 },
    { kind: 'chest', pos: [-11, 0, 8.4], content: 'coins:5', yaw: 1.2 },
  ],
  blocks: [
    // Wasserschalter in der Glaskuppel: hebt See und Holzsteg, Stern 4 erscheint
    { kind: 'wasserschalter', id: 'schalter', pos: [1.5, 0.3, 5.5], water: { id: 'see', y: W1, speed: 1.2 }, onPress: { reveal: 'stern4' } },
  ],
  enemies: [
    { kind: 'rammfisch', id: 'ramm', pos: [-4, -3.5, 9.2], path: [[-7.2, -3.5, 9.2], [-0.8, -3.5, 9.2]], sight: 6.5 },
  ],
  stars: [
    [-11.6, 0, -4.8],                                         // 1: gegenüber dem Start (Ufer hinten links)
    [-4.2, 10.2, -10.4],                                      // 2: Dachterrasse der Seewarte (Röhre, an G1 nach oben)
    [-5, -2.0, 5.6],                                          // 3: Seegrund – Kreuzung geradeaus ins Wasser
    { pos: [2.1, 0.3, 4.4], hidden: true, id: 'stern4' },     // 4: Schalter in der Kuppel
    [-10.2, 0, 9.6],                                          // 5: Leuchtturm-Inselchen über den Holzsteg
  ],
  marks: {
    start: [9.5, 0, 9.5], star1: [-11.6, 0, -4.8], hole: [-5, 0, -5.2], holeIn: [-5, 0, -7], g1: MAIN[5], g2: MAIN[6],
    terrace: [-4.5, 10.2, -9.6], pipeTop: UP[UP.length - 1], beach: [3, -1.3, 0], dome: [1.5, 0.3, 5.5], domeExit: [7.0, 0.95, 5.5],
    stegStart: [5.6, 0, 9], islet: [-10, 0, 9], meadow: [8, 4, -9], stairsFoot: [11, 0, 1], lakeFront: [-4, -1.4, 10],
  },
};
