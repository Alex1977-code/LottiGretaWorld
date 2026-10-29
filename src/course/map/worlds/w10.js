// Kurs-Weltkarte der Bonuswelt Pilz „Pilz-Remix“ (Welt 10, Level-Präfix 'P'; Vertrag: „Bonuswelten – Level-Liste und
// Freischaltung (Hauptsitzung)“, Welt Pilz). Format: docs/KURS-ARCHITEKTUR.md, „Präzisierung (Weltkarte)“ und
// „Präzisierung (Mehrwelten-Karte)“ (Notiz Welt Pilz). Koordinaten in Metern, Y oben, Kamera blickt von Süden nach Norden (−Z).
//
// Eigene Gestaltung: ein Pilzwald-Archipel in Abendstimmung. Große Pilzhüte stehen auf dicken Stielen im violett-blauen
// Abendmeer, verbunden durch Stiel- und Rankenbrücken; ringsum Riesenpilze im Meer, Glühwürmchen und Leuchtpilze im Takt der
// Kartenmusik (pilz10.js). Jeder Hut trägt eine verkleinerte, „geremixte“ Erinnerung an das Basislevel (decor_pilz.js):
// Pilzhafen mit der Glasröhre zurück ins Sternenzelt und dem Beerenhaus → Nachthügel (P-1, Basis 2-4) → Abendranken (P-2, 1-3)
// → dunkler Dschungel (P-3, 6-4) → Schattenspiel-Gasse (P-4, 2-3) → Abzweig zum Prüfungs-Haus (P-Haus) und zur Fernost-Halle
// bei Tag (P-5, 6-3, mit dem Glückshaus) → Riesen-Schiffswrack (P-6, 6-2) → Gabel: blaue Lava (P-7, 7-4, ab 310 Sternen) und
// Röhren-Insel mit der Glasröhre zur Welt Blume (frei nach P-6). Sternbedarf zählt alle Sterne (starScope 'all').
//
// Bereiche (begehbar, Hut-Höhe):                     Eingänge (kind):
//   A  Pilzhafen (Ankunft)         y 5     redcap      WS      pipe          Glasröhre zurück zur Welt Stern (−20, 5, 47)
//   N  Nachthügel                  y 5.5   nightcap    P-1     nighthills    Hügelwalze, Mond, Zeit-Uhren   (20, 5.5, 34)
//   R  Abendranken                 y 7     sunsetcap   P-2     spikybean     Stachelranken, Glockenbäume    (28, 7, 5)
//   D  dunkler Dschungel           y 8.5   darkcap     P-3     darkjungle    Teich, Floß, Lichtkegel        (24, 8.5, −27)
//   G  Schattenspiel-Gasse         y 9.5   alleycap    P-4     shadowalley   Schattenwand, Gassenhäuschen   (−15, 9.5, −27)
//   H  Haus-Hut                    y 9.5   housecap    P-Haus  brawlhouse    zehn Kampf-Räume, Boxring      (−57, 9.5, −29)
//   F  Fernost-Hut (Glückshaus)    y 11    daycap      P-5     dayhall       Halle, Gong, Sonne, Zielmast   (−24, 11, −66)
//   W  Wrack-Hut                   y 12    wreckcap    P-6     giantwreck    Riesen-Wrack, Warp-Boxen       (10, 12, −68)
//   L  Blaulava-Hut                y 13    lavacap     P-7     brokenbelt    Lavabecken, Bruchplatten (310 ★) (52, 13, −87)
//   J  Röhren-Hut                  y 12    flowercap   WB      pipe          Glasröhre zur Welt Blume       (19, 12, −116)

const PI = Math.PI;
const g = (x0, z0, x1, z1, top, opts = {}) => ({ rect: [x0, z0, x1, z1], top, ...opts });
const W = true;

export const MAP = {
  id: 'karte-10',
  world: 10,
  prefix: 'P',                  // Level-Ids „P-1“ … gehören zu Welt 10 (worldOfLevel, starsInWorld)
  worldLabel: 'Welt Pilz',      // statt „Welt 10“ (HUD, Schild der Röhre im Sternenzelt, Ankunfts-/„bald“-Meldungen)
  title: 'Pilz-Remix',
  short: 'Pilz-Remix',
  travelToast: 'Auf in den Pilz-Remix!',
  archetype: 'map',
  theme: 'map_pilz',
  kit: 'pilz',
  music: 'course_worldpilz_map',
  fallbackMusic: 'course_map',
  starScope: 'all',             // Sternschranke zählt alle gesammelten Sterne (Vertrag Bonuswelten)
  base: -3,
  sea: 0,
  seaColors: [0x5a6ad0, 0x5a6ad0, 0x2c2c80],   // Abendmeer (ohne helle Ufer: die Hüte stehen auf Stielen)
  spawn: { pos: [-4, 5, 50], yaw: PI / 2 },
  camera: [{ from: 200, to: -300, pitch: 48, dist: 16.5, fov: 40, ahead: 3.6, lead: 0.7, height: 1.0 }],
  intro: { from: [14, 34, 124], look: [8, 6, -50], duration: 3.4 },
  edges: { hedge: 'pilzhedge', fence: 'pilzrail' },
  pathColors: [0xfff2dc, 0xf2dcc0, 0xb48c6c],
  // Kacheln: je Hut eine Zone (ein Mesh je Material/Schattenwurf), außerhalb 48-m-Raster
  batch: { tile: 48, origin: [-8, 4], freeTile: 96, freeOrigin: [-56, -56], zones: [
    [-30, 26, 8, 58, 'hafen'], [8, 22, 42, 54, 'nacht'], [6, -12, 46, 22, 'ranken'], [2, -52, 44, -12, 'dschungel'],
    [-40, -50, -6, -12, 'gasse'], [-72, -48, -40, -20, 'haus'], [-48, -90, -8, -50, 'fernost'], [-2, -96, 38, -54, 'wrack'],
    [40, -116, 80, -78, 'lava'], [4, -132, 34, -96, 'roehre'],
  ] },
  // Nachbarwelten: die Sterneninseln der Welt Stern hoch am Abendhimmel im Südwesten (Rückweg-Röhre), der Blumengarten der
  // Welt Blume am Horizont im Nordosten (Röhre WB)
  neighbors: [
    { world: 9, pos: [-225, 175], size: [80, 56], style: 'sternfern', y: 72 },
    { world: 11, pos: [175, -295], size: [96, 64], style: 'blumenfern' },
  ],
  birds: [],
  // Riesenpilze im Meer (nur Optik)
  giants: [
    { pos: [-50, 18], top: 15, r: 6.5, color: 'lila' }, { pos: [-64, -6], top: 21, r: 8.5, color: 'rot' }, { pos: [62, 52], top: 13, r: 6, color: 'orange' },
    { pos: [66, 8], top: 18, r: 7.5, color: 'blau' }, { pos: [58, -40], top: 19, r: 7, color: 'rot' }, { pos: [-86, -62], top: 24, r: 10, color: 'gelb' },
    { pos: [-72, -104], top: 18, r: 8, color: 'lila' }, { pos: [-24, -114], top: 19, r: 7.5, color: 'orange' }, { pos: [52, -142], top: 22, r: 9, color: 'rosa' },
    { pos: [-6, -138], top: 14, r: 6, color: 'rot' }, { pos: [90, -96], top: 17, r: 7, color: 'blau' },
  ],
  // Glühwürmchen um die Hüte (pilz10.js PilzLife)
  fireflies: { perIsland: 12, seed: 10 },

  levels: [
    { id: 'WS', world: 9, next: 9, label: 'Welt Stern', stars: 0 },
    { id: 'P-1', stars: 3 },
    { id: 'P-2', after: 'P-1', stars: 3 },
    { id: 'P-3', after: 'P-2', stars: 3 },
    { id: 'P-4', after: 'P-3', stars: 3 },
    { id: 'P-5', after: 'P-4', stars: 3 },
    { id: 'P-Haus', after: 'P-4', stars: 10 },
    { id: 'P-6', after: 'P-5', stars: 3 },
    { id: 'P-7', after: 'P-6', minStars: 310, stars: 3 },
    { id: 'WB', after: 'P-6', world: 11, next: 11, label: 'Welt Blume', worldLabel: 'Welt Blume', stars: 0 },
  ],

  ground: [
    g(-26, 30, 4, 54, 5, { walk: W, style: 'redcap' }),
    g(12, 26, 38, 50, 5.5, { walk: W, style: 'nightcap' }),
    g(10, -8, 42, 14, 7, { walk: W, style: 'sunsetcap' }),
    g(6, -48, 40, -22, 8.5, { walk: W, style: 'darkcap' }),
    g(-36, -46, -10, -22, 9.5, { walk: W, style: 'alleycap' }),
    g(-68, -44, -48, -24, 9.5, { walk: W, style: 'housecap' }),
    g(-44, -86, -12, -60, 11, { walk: W, style: 'daycap' }),
    g(2, -92, 34, -62, 12, { walk: W, style: 'wreckcap' }),
    // Blaulava-Hut: begehbar nur rings um das Lavabecken (walk unten), der Hut selbst trägt Optik und Kollision
    g(44, -112, 76, -82, 13, { style: 'lavacap', edge: 'lavarim10' }),
    g(8, -128, 30, -108, 12, { walk: W, style: 'flowercap' }),
  ],

  // Zusätzlich begehbar: Brücken und der Ring um das Lavabecken (P-7)
  walk: [
    [4, 38, 12, 42],            // A → N (Rankenbrücke)
    [22, 14, 26, 26],           // N → R (Stiel-Brücke)
    [20, -22, 24, -8],          // R → D (Rankenbrücke)
    [-10, -36, 6, -32],         // D → G (Stiel-Brücke)
    [-48, -36, -36, -32],       // G → H (Rankenbrücke)
    [-16, -60, -12, -46],       // G → F (Stiel-Brücke)
    [-12, -76, 2, -72],         // F → W (Rankenbrücke)
    [34, -88, 44, -84],         // W → L (Stiel-Brücke)
    [17, -108, 21, -92],        // W → J (Rankenbrücke)
    [44, -96, 76, -82], [44, -112, 76, -106], [44, -106, 52, -96], [68, -106, 76, -96],   // L: Ring um das Becken
  ],

  paths: [
    [[-4, 50.5], [-4, 44], [0, 40], [4, 40]],
    [[-4, 45], [-12, 46], [-20, 49.6]],
    [[-4, 42], [-8, 38.1]],
    [[12, 40], [18, 39], [20, 36.6]],
    [[18, 39], [24, 37], [24, 26]],
    [[24, 14], [25, 9], [28, 7.6]],
    [[24, 10], [20, 3], [22, -4], [22, -8]],
    [[22, -22], [24, -24.4]],
    [[22, -24], [14, -28], [10, -34], [6, -34]],
    [[-10, -34], [-14, -30], [-15, -29.6]],
    [[-14, -32], [-22, -33], [-30, -33], [-36, -34]],
    [[-48, -34], [-55, -32], [-57, -31.6]],
    [[-15, -34], [-14, -40], [-14, -46]],
    [[-14, -60], [-18, -64], [-24, -68.6]],
    [[-18, -64], [-26, -69], [-36, -70], [-40, -71.9]],
    [[-16, -66], [-10, -72], [-6, -74], [2, -74]],
    [[2, -74], [8, -71], [10, -70.6]],
    [[8, -72], [14, -76], [26, -74], [30, -80], [34, -86]],
    [[14, -76], [12, -86], [19, -88], [19, -92]],
    [[44, -86], [50, -86], [52, -89.6]],
    [[19, -108], [19, -113.4]],
  ],

  entrances: [
    { id: 'WS', kind: 'pipe', pos: [-20, 5, 47], decor: [-20, 5, 43.9], disc: '★',
      pipe: [[0, 0, 0], [0, 3.5, 0], [-0.8, 6, 0.5], [-6, 9, 3], [-18, 14, 9], [-44, 24, 22], [-84, 40, 44], [-150, 62, 80]], pipeDetail: 'low',
      arriveCam: { up: 7, ahead: 6, drop: 3 }, signPos: [2.8, 0, 0.8], departAlong: true },
    { id: 'P-1', kind: 'nighthills', pos: [20, 5.5, 34], decor: [26, 5.5, 29.5], moon: [33, 17, 24], kugler: [17, 5.5, 44],
      mice: [[31, 5.5, 42]], clocks: [[27, 7.1, 34.6], [29, 7.4, 35.2], [31, 7.6, 35.5], [33, 7.4, 35.2], [35, 7.1, 34.6]] },
    { id: 'P-2', kind: 'spikybean', pos: [28, 7, 5], decor: [28, 7, -2.5], stalks: [[25, -3.5, 8.5], [31.4, -1.9, 6]],
      bells: [[17.5, 1], [38.5, 0], [35, -6]], sun: [27, 14, -9.6] },
    { id: 'P-3', kind: 'darkjungle', pos: [24, 8.5, -27], decor: [25, 8.5, -38], pond: 4.6 },
    { id: 'P-4', kind: 'shadowalley', pos: [-15, 9.5, -27], decor: [-26.5, 9.5, -40.5] },
    { id: 'P-Haus', kind: 'brawlhouse', pos: [-57, 9.5, -29], decor: [-58, 9.5, -38.5], ring: [-63.5, -30.5], labelY: 2.8 },
    { id: 'P-5', kind: 'dayhall', pos: [-24, 11, -66], decor: [-26, 11, -76.5], gong: [-33.5, -75.5], sun: [-20, 22, -83], pole: [-25, 18.2, -80.5] },
    { id: 'P-6', kind: 'giantwreck', pos: [10, 12, -68], decor: [20, 12, -80], ship: [47, 0.4, -67], schubser: [10, -78],
      boxes: [[8, -84], [12.5, -86.5], [25, -87.5], [30.5, -77.5], [29.5, -72.5]] },
    { id: 'P-7', kind: 'brokenbelt', pos: [52, 13, -87], decor: [60, 13, -101], pool: [52, -106, 68, -96] },
    { id: 'WB', kind: 'pipe', pos: [19, 12, -116], decor: [19, 12, -119.1], disc: 'Blume',
      pipe: [[0, 0, 0], [0, 4, 0], [0.6, 7, -0.8], [3, 10, -4], [8, 12, -12], [16, 13, -24], [30, 12, -40], [60, 10, -70], [100, 8, -110]], pipeDetail: 'low',
      arriveCam: { up: 9, ahead: 4, drop: 6 }, signPos: [2.8, 0, 0.6] },
  ],

  gates: [
    { for: 'P-2', at: [24, 20], axis: 'z' },
    { for: 'P-3', at: [22, -15], axis: 'z' },
    { for: 'P-4', at: [-2, -34], axis: 'x' },
    { for: 'P-Haus', at: [-42, -34], axis: 'x' },
    { for: 'P-5', at: [-14, -53], axis: 'z' },
    { for: 'P-6', at: [-5, -74], axis: 'x' },
    { for: 'P-7', at: [39, -86], axis: 'x' },
    { for: 'WB', at: [19, -100], axis: 'z' },
  ],

  roamers: [],

  houses: [
    { kind: 'beeren', pos: [-8, 5, 33.5], yaw: -PI / 2, item: [-8, 5, 38.1], items: ['krallen', 'funken'] },
    { kind: 'glueck', pos: [-40, 11, -79.4], yaw: -PI / 2, machine: [-40, 11, -74.6], pad: [-40, 11, -71.9], stake: 10 },
  ],

  signs: [
    { pos: [2.2, 5, 51.6], yaw: -0.2, text: 'Welt Pilz\nPilz-Remix' },
    { pos: [-12.6, 5, 37.2], yaw: 0.3, text: 'Beerenhaus' },
    { pos: [-35.4, 11, -69.6], yaw: 0.25, text: 'Glückshaus' },
    // Sternschranke: Schild mit dem Sternbedarf vor der Stiel-Brücke zum Blaulava-Hut
    { pos: [31.6, 12, -82.4], yaw: 0.3, text: 'ab 310 ★' },
  ],

  props: [
    // A Pilzhafen: Pilzlaternen, Pilzhäuschen, Pilzgrüppchen
    { kind: 'lamp10', pos: [-24, 5, 52] }, { kind: 'lamp10', pos: [2, 5, 46] }, { kind: 'lamp10', pos: [-24, 5, 32] }, { kind: 'lamp10', pos: [2, 5, 32] },
    { kind: 'house10', pos: [-18, 5, 35], size: 1.1, color: 'rot', yaw: 0.3 },
    { kind: 'shrooms10', pos: [-1.5, 5, 35], color: 'gelb' }, { kind: 'shrooms10', pos: [-24, 5, 40], color: 'lila' },
    { kind: 'glowshroom10', pos: [-13, 5, 52], tone: 1 }, { kind: 'stump10', pos: [-2, 5, 53] },
    // N Nachthügel
    { kind: 'lamp10', pos: [36.5, 5.5, 48.5] }, { kind: 'glowshroom10', pos: [13.5, 5.5, 48], tone: 1 }, { kind: 'glowshroom10', pos: [36.5, 5.5, 27.5], tone: 0 },
    // R Abendranken
    { kind: 'lamp10', pos: [40.5, 7, 12.5] }, { kind: 'lamp10', pos: [11.5, 7, 12.5] }, { kind: 'shrooms10', pos: [12, 7, -5.5], color: 'orange' },
    // D dunkler Dschungel
    { kind: 'fern10', pos: [8, 8.5, -24] }, { kind: 'fern10', pos: [38, 8.5, -24] }, { kind: 'fern10', pos: [38, 8.5, -46] }, { kind: 'fern10', pos: [9, 8.5, -46.5] },
    { kind: 'glowshroom10', pos: [12, 8.5, -40], tone: 0 }, { kind: 'glowshroom10', pos: [36, 8.5, -33], tone: 2 }, { kind: 'log10', pos: [12, 8.5, -26], size: 3 },
    // G Schattenspiel-Gasse
    { kind: 'lamp10', pos: [-11.5, 9.5, -23.5] }, { kind: 'lamp10', pos: [-34.5, 9.5, -23.5] },
    // H Haus-Hut
    { kind: 'shrooms10', pos: [-50, 9.5, -42], color: 'gelb' }, { kind: 'lamp10', pos: [-49.5, 9.5, -25.5] },
    // F Fernost-Hut
    { kind: 'lamp10', pos: [-13.5, 11, -61.5] }, { kind: 'shrooms10', pos: [-42, 11, -62], color: 'rot' }, { kind: 'stump10', pos: [-14, 11, -84] },
    // W Wrack-Hut
    { kind: 'rock10', pos: [4, 12, -64], size: 1.2 }, { kind: 'shrooms10', pos: [32, 12, -64], color: 'blau' }, { kind: 'lamp10', pos: [3.5, 12, -90.5] },
    // L Blaulava-Hut
    { kind: 'glowshroom10', pos: [46, 13, -83.5], tone: 1 }, { kind: 'glowshroom10', pos: [74.5, 13, -110.5], tone: 1 }, { kind: 'rock10', pos: [74, 13, -84], size: 1 },
    // J Röhren-Hut: Vorgeschmack auf die Welt Blume
    { kind: 'shrooms10', pos: [10, 12, -110], color: 'rosa' }, { kind: 'lamp10', pos: [28.5, 12, -109.5] }, { kind: 'glowshroom10', pos: [9.5, 12, -126.5], tone: 2 },
  ],

  segments: [
    { type: 'vinebridge', from: [4, 5, 40], to: [12, 5.5, 40], width: 4 },
    { type: 'stembridge', from: [24, 5.5, 26], to: [24, 7, 14], width: 4 },
    { type: 'vinebridge', from: [22, 7, -8], to: [22, 8.5, -22], width: 4 },
    { type: 'stembridge', from: [6, 8.5, -34], to: [-10, 9.5, -34], width: 4 },
    { type: 'vinebridge', from: [-36, 9.5, -34], to: [-48, 9.5, -34], width: 4 },
    { type: 'stembridge', from: [-14, 9.5, -46], to: [-14, 11, -60], width: 4 },
    { type: 'vinebridge', from: [-12, 11, -74], to: [2, 12, -74], width: 4 },
    { type: 'stembridge', from: [34, 12, -86], to: [44, 13, -86], width: 4 },
    { type: 'vinebridge', from: [19, 12, -92], to: [19, 12, -108], width: 4 },
  ],
};
