// Kurs-Weltkarte der Bonuswelt Krone „Kronen-Gipfel“ (Welt 12, Level-Präfix 'K'; Vertrag: „Bonuswelten – Level-Liste und
// Freischaltung (Hauptsitzung)“, Welt Krone – die Abschlussprüfung). Format: docs/KURS-ARCHITEKTUR.md, „Präzisierung
// (Weltkarte)“ und „Präzisierung (Mehrwelten-Karte)“ (Notiz Welt Krone). Koordinaten in Metern, Y oben, Kamera blickt nach −Z.
//
// Eigene Gestaltung: ein goldener Gipfel über den Wolken – ein festlicher Abschluss-Ort. Von der Ankunfts-Terrasse (Glasröhre
// zurück in den Blumen-Remix) führen goldene Treppen mit rotem Teppich zu den Seiten-Terrassen mit K-Kapitän (Lavaturm-Diorama)
// und K-Haus (Marathon-Haus) – beide gleich frei – und die große Treppe hinauf zum Siegerplatz: Siegerpodest mit Krone, großer
// Pokal, Zuschauer-Tribüne mit allen Freunden, Fahnen, Konfetti-Kanonen im Takt der Kartenmusik und am Nordrand der Startbogen
// der Champion-Strecke (K-1). K-1 hat die Sammel-Schranke „vollständige Sammlung“ (alle Sterne und Stempel aller anderen
// Welten, unlock.collection) mit Fortschritts-Tafel neben dem Bogen. Kulissen: decor_krone.js, Gelände/Leben: krone12.js.
//
// Bereiche (begehbar, Höhe):                  Eingänge (kind):
//   A  Ankunfts-Terrasse    y 10    marble      WB         pipe           Glasröhre zurück zur Welt Blume   (−10, 10, 46)
//   W  West-Terrasse        y 12.5  goldstone   K-Kapitän  lavadiorama    Lavaturm-Diorama                  (−36, 12.5, 43)
//   E  Ost-Terrasse         y 12.5  goldstone   K-Haus     marathonhouse  Marathon-Haus der 30 Räume        (36, 12.5, 43)
//   S  Siegerplatz          y 16    summit      K-1        championarch   Startbogen der Champion-Strecke (vollständige Sammlung) (0, 16, −15)

const PI = Math.PI;
const g = (x0, z0, x1, z1, top, opts = {}) => ({ rect: [x0, z0, x1, z1], top, ...opts });
const W = true;

export const MAP = {
  id: 'karte-12',
  world: 12,
  prefix: 'K',                  // Level-Ids „K-1“, „K-Kapitän“, „K-Haus“ gehören zu Welt 12
  worldLabel: 'Welt Krone',     // statt „Welt 12“ (HUD, Schild der Röhre im Blumen-Remix, Ankunfts-/„bald“-Meldungen)
  title: 'Kronen-Gipfel',
  short: 'Kronen-Gipfel',
  travelToast: 'Auf zum Kronen-Gipfel!',
  archetype: 'map',
  theme: 'map_krone',
  kit: 'krone',
  music: 'course_worldkrone_map',
  fallbackMusic: 'course_map',
  starScope: 'all',
  base: -3,
  sea: 0,                       // Wolkenmeer (krone12.js: CloudSea wie Welt 6)
  seaColors: [0xffffff, 0xfff6ec, 0xf2e4dc],
  spawn: { pos: [2, 10, 49], yaw: PI / 2 },
  camera: [{ from: 200, to: -300, pitch: 46, dist: 17, fov: 40, ahead: 3.4, lead: 0.7, height: 1.0 }],
  intro: { from: [0, 30, 118], look: [0, 12, -20], duration: 3.2 },
  edges: { hedge: 'kronehedge', fence: 'kronerail' },
  pathColors: [0xfff6e0, 0xf6e8c8, 0xd8b878],
  batch: { tile: 48, origin: [-8, 4], freeTile: 96, freeOrigin: [-56, -56], zones: [
    [-20, 26, 20, 56, 'ankunft'], [-50, 22, -22, 52, 'west'], [22, 22, 50, 52, 'ost'], [-22, -30, 22, 9, 'gipfel'], [-14, 9, 14, 30, 'fels'],
  ] },
  // Nachbarwelt: der Blumengarten tief unter den Wolken im Südwesten (Rückweg-Röhre)
  neighbors: [{ world: 11, pos: [-215, 175], size: [110, 76], style: 'blumenfern', y: -14 }],
  birds: [],
  // ferne Gipfel mit goldenen Spitzen (nur Optik)
  peaks: [
    { pos: [-62, -56], h: 46, r: 18 }, { pos: [64, -66], h: 56, r: 20 }, { pos: [0, -104], h: 74, r: 26, snow: 0.3 }, { pos: [-96, 6], h: 40, r: 16 },
    { pos: [98, 4], h: 42, r: 17 }, { pos: [-44, -132], h: 52, r: 20 }, { pos: [52, -140], h: 50, r: 18 }, { pos: [-80, -90], h: 36, r: 14 },
  ],
  // Fahnen (wehen) und Konfetti-Kanonen (schießen im Takt)
  flags: [
    [-16.5, 16, 6.5, 4.5, 'rot'], [16.5, 16, 6.5, 4.5, 'blau'], [-16.5, 16, -24.5, 5, 'gold'], [16.5, 16, -24.5, 5, 'gruen'],
    [-14.5, 10, 50.5, 4, 'lila'], [14.5, 10, 50.5, 4, 'rosa'], [-44.5, 12.5, 46.5, 4, 'rot'], [44.5, 12.5, 46.5, 4, 'blau'],
    [-5, 16, -24.5, 4.2, 'rot'], [5, 16, -24.5, 4.2, 'blau'],
  ],
  confetti: [{ pos: [-15, 16, -21], dir: [0.6, 0.8] }, { pos: [15, 16, -21], dir: [-0.6, 0.8] }, { pos: [-15, 16, 4], dir: [0.6, -0.8] }, { pos: [15, 16, 4], dir: [-0.6, -0.8] }],

  levels: [
    { id: 'WB', world: 11, next: 11, label: 'Welt Blume', stars: 0 },
    { id: 'K-Kapitän', stars: 5, stamp: true },
    { id: 'K-Haus', stars: 30 },
    { id: 'K-1', collection: true, stars: 3, stamp: true },
  ],

  ground: [
    g(-16, 30, 16, 52, 10, { walk: W, style: 'marble' }),
    g(-46, 26, -26, 48, 12.5, { walk: W, style: 'goldstone' }),
    g(26, 26, 46, 48, 12.5, { walk: W, style: 'goldstone' }),
    g(-18, -26, 18, 8, 16, { walk: W, style: 'summit' }),
    // Fels unter der großen Treppe (nicht begehbar, verbindet Terrasse und Gipfel zu einem Berg)
    g(-12, 9.5, 12, 29.5, 9, { style: 'peakrock' }),
  ],

  walk: [
    [-26, 36, -16, 40],         // A → W (Goldtreppe)
    [16, 36, 26, 40],           // A → E (Goldtreppe)
    [-3, 8, 3, 30],             // A → S (große Treppe)
  ],

  paths: [
    [[2, 49.5], [2, 44], [0, 40], [0, 30]],
    [[2, 46], [-6, 46], [-10, 48.6]],
    [[0, 38], [-8, 38], [-16, 38]],
    [[0, 38], [8, 38], [16, 38]],
    [[-26, 38], [-32, 40], [-36, 41.4]],
    [[26, 38], [32, 40], [36, 41.4]],
    [[0, 8], [0, 0], [0, -13.4]],
    [[0, 2], [-6, -2], [-10, -4]],
    [[0, 2], [6, -2], [8.5, -3.6]],
  ],

  entrances: [
    { id: 'WB', kind: 'pipe', pos: [-10, 10, 46], decor: [-10, 10, 42.9], disc: 'Blume',
      pipe: [[0, 0, 0], [0, 3.5, 0], [-0.8, 5.4, 0.5], [-6, 5.6, 3], [-18, 3, 9], [-44, -6, 22], [-84, -16, 44], [-150, -26, 80]], pipeDetail: 'low',
      arriveCam: { up: 7, ahead: 6, drop: 3 }, signPos: [2.8, 0, 0.8], departAlong: true },
    { id: 'K-Kapitän', kind: 'lavadiorama', pos: [-36, 12.5, 43], decor: [-36, 12.5, 32.5], disc: 'K-K' },
    { id: 'K-Haus', kind: 'marathonhouse', pos: [36, 12.5, 43], decor: [36, 12.5, 32.5], labelY: 2.8 },
    { id: 'K-1', kind: 'championarch', pos: [0, 16, -15], decor: [0, 16, -22.5], board: [-6.4, -19.6], podest: [8.5, -6], pokal: [13.5, -14], tribune: [-10.5, -6], labelY: 2.8 },
  ],

  gates: [],
  roamers: [],
  houses: [],

  signs: [
    { pos: [6.2, 10, 51.4], yaw: -0.2, text: 'Welt Krone\nKronen-Gipfel' },
    { pos: [4.4, 16, -13.4], yaw: -0.3, text: 'Champion-\nStrecke' },
  ],

  props: [
    // A Ankunfts-Terrasse: Säulen, Goldvasen, Laternen
    { kind: 'pillar12', pos: [-14.6, 10, 31.4], size: 4 }, { kind: 'pillar12', pos: [14.6, 10, 31.4], size: 4 },
    { kind: 'lamp12', pos: [-14.5, 10, 44] }, { kind: 'lamp12', pos: [14.5, 10, 44] },
    { kind: 'urn12', pos: [-3.5, 10, 32] }, { kind: 'urn12', pos: [3.5, 10, 32] }, { kind: 'flowers12', pos: [9, 10, 51] },
    // W/E: Laternen, Blumenkübel
    { kind: 'lamp12', pos: [-27.5, 12.5, 46.5] }, { kind: 'lamp12', pos: [27.5, 12.5, 46.5] },
    { kind: 'flowers12', pos: [-44, 12.5, 40] }, { kind: 'flowers12', pos: [44, 12.5, 40] },
    // S Siegerplatz: Säulen an den Ecken, Laternen, Wimpelmasten, Wolkenpuffs am Rand
    { kind: 'pillar12', pos: [-16.6, 16, -9], size: 4.6 }, { kind: 'pillar12', pos: [16.6, 16, -9], size: 4.6 },
    { kind: 'lamp12', pos: [-4.6, 16, 6] }, { kind: 'lamp12', pos: [4.6, 16, 6] }, { kind: 'lamp12', pos: [-16.5, 16, -2] }, { kind: 'lamp12', pos: [16.5, 16, -2] },
    { kind: 'banner12', pos: [-10, 16, -24.6], size: 5 }, { kind: 'banner12', pos: [10, 16, -24.6], size: 5 },
    { kind: 'urn12', pos: [-3.6, 16, -24.4] }, { kind: 'urn12', pos: [3.6, 16, -24.4] },
    { kind: 'cloud12', pos: [-22, 13, -14], size: 1.4, solid: false }, { kind: 'cloud12', pos: [23, 13.5, -20], size: 1.6, solid: false },
  ],

  segments: [
    { type: 'goldstairs', from: [-16, 10, 38], to: [-26, 12.5, 38], width: 4 },
    { type: 'goldstairs', from: [16, 10, 38], to: [26, 12.5, 38], width: 4 },
    { type: 'goldstairs', from: [0, 10, 30], to: [0, 16, 8], width: 6 },
  ],
};
