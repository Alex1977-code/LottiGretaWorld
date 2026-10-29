// Kurs-Weltkarte der Bonuswelt Blume „Blumen-Remix“ (Welt 11, Level-Präfix 'B'; Vertrag: „Bonuswelten – Level-Liste und
// Freischaltung (Hauptsitzung)“, Welt Blume). Format: docs/KURS-ARCHITEKTUR.md, „Präzisierung (Weltkarte)“ und
// „Präzisierung (Mehrwelten-Karte)“ (Notiz Welt Blume). Koordinaten in Metern, Y oben, Kamera blickt von Süden nach Norden (−Z).
//
// Eigene Gestaltung: ein riesiger Blumengarten über einem Seerosenteich. Die Inseln sind Blütenblätter riesiger Blumen (je
// auf Kelch und Stängel), verbunden durch Gießkannen- und Stängel-Brücken; Schmetterlinge flattern im Takt der Kartenmusik,
// Blütenblätter segeln herab, im Teich treiben Seerosen, ringsum stehen Riesenblumen (blume11.js). Jedes Blatt trägt eine
// verkleinerte, „geremixte“ Erinnerung an das Basislevel (decor_blume.js). Weg: Gartentor mit der Glasröhre zurück in den
// Pilz-Remix und dem Beerenhaus → Zirkus mit Funken (B-1) → Gabel: Savanne am Morgen (B-5, gleich nach B-1) und
// Wasserwürfel-Mine (B-2) → Fackeln bei Nacht (B-3) → Werferburg mit großer Uhr (B-4) → Spukhaus in Schwarz-Weiß (B-6, mit
// dem Glückshaus) → Lagune mit Kanonen-Helm (B-7) → Piep-Block-Himmelsweg (B-8) → Sonnenuntergangs-Strand (B-9) → Waben am
// Taghimmel (B-10) → Stachelbrücke mit Suchscheinwerfer (B-11) → Boss-Marathon-Sternenkuppel (B-12) → Röhren-Blatt mit der
// Glasröhre zur Welt Krone (nach B-12 und ab 330 Sternen). Sternbedarf zählt alle Sterne (starScope 'all').
//
// Bereiche (begehbar, Blatt-Höhe):                   Eingänge (kind):
//   A   Gartentor (Ankunft)      y 3     petal_rose    WP     pipe          Glasröhre zurück zur Welt Pilz  (−20, 3, 47)
//   B1  Zirkus-Blatt             y 3.5   petal_red     B-1    sparkcircus   Zelt, Schaltfelder, Funken      (20, 3.5, 34)
//   B5  Savannen-Blatt           y 4.5   petal_yellow  B-5    bunnysavanna  Akazien, Hasen, Morgensonne     (60, 4.5, 22)
//   B2  Minen-Blatt              y 5     petal_blue    B-2    cubemine      Fördergerüst, Wasserwürfel      (28, 5, 5)
//   B3  Nacht-Blatt              y 6.5   petal_violet  B-3    torchcreek    Mond, Fackeln, Giftwasser       (24, 6.5, −27)
//   B4  Burg-Blatt               y 7.5   petal_orange  B-4    clockfort     blaue Burg, große Uhr           (−15, 7.5, −27)
//   B6  Spuk-Blatt (Glückshaus)  y 9     petal_gray    B-6    graymansion   Spukhaus in Grau                (−24, 9, −66)
//   B7  Lagunen-Blatt            y 9.5   petal_teal    B-7    cannonlagoon  Lagune, Kanonen-Helm, Rammfisch (10, 9.5, −68)
//   B8  Piep-Blatt               y 10.5  petal_pink    B-8    beepskyway    Piep-Blöcke, Lautsprecher       (52, 10.5, −87)
//   B9  Strand-Blatt             y 11.5  petal_sand    B-9    sunsetbeach   Abendsonne, Strandkorb, Turm    (50, 11.5, −130)
//   B10 Waben-Blatt              y 12.5  petal_honey   B-10   dayhive       Waben, Sonne, Wolken            (14, 12.5, −140)
//   B11 Brücken-Blatt            y 13.5  petal_night   B-11   spotbridge    Stachelbrücke, Suchscheinwerfer (−30, 13.5, −140)
//   B12 Kuppel-Blatt             y 15    petal_star    B-12   bossdome      Sternenkuppel, sechs Warp-Boxen (−22, 15, −178)
//   K   Röhren-Blatt             y 15    petal_white   WK     pipe          Glasröhre zur Welt Krone (330 ★) (14, 15, −192)

const PI = Math.PI;
const g = (x0, z0, x1, z1, top, opts = {}) => ({ rect: [x0, z0, x1, z1], top, ...opts });
const W = true;

export const MAP = {
  id: 'karte-11',
  world: 11,
  prefix: 'B',                  // Level-Ids „B-1“ … gehören zu Welt 11 (worldOfLevel, starsInWorld)
  worldLabel: 'Welt Blume',     // statt „Welt 11“ (HUD, Schild der Röhre im Pilz-Remix, Ankunfts-/„bald“-Meldungen)
  title: 'Blumen-Remix',
  short: 'Blumen-Remix',
  travelToast: 'Auf in den Blumen-Remix!',
  archetype: 'map',
  theme: 'map_blume',
  kit: 'blume',
  music: 'course_worldblume_map',
  fallbackMusic: 'course_map',
  starScope: 'all',
  base: -3,
  sea: 0,
  seaColors: [0x5ac8c0, 0x5ac8c0, 0x2a8aa8],   // Seerosenteich (ohne helle Ufer: die Blätter stehen auf Stängeln)
  spawn: { pos: [-4, 3, 50], yaw: PI / 2 },
  camera: [{ from: 200, to: -320, pitch: 48, dist: 16.5, fov: 40, ahead: 3.6, lead: 0.7, height: 1.0 }],
  intro: { from: [10, 32, 124], look: [4, 6, -70], duration: 3.4 },
  edges: { hedge: 'blumenhedge', fence: 'blumenrail' },
  pathColors: [0xfffaf0, 0xf4ecd8, 0xc8b89a],
  batch: { tile: 48, origin: [-8, 4], freeTile: 96, freeOrigin: [-56, -56], zones: [
    [-30, 26, 8, 58, 'tor'], [8, 22, 42, 54, 'zirkus'], [46, 0, 84, 34, 'savanne'], [6, -12, 46, 22, 'mine'], [2, -52, 44, -12, 'nacht'],
    [-40, -50, -6, -12, 'burg'], [-48, -90, -8, -50, 'spuk'], [-2, -96, 38, -54, 'lagune'], [40, -116, 80, -78, 'piep'],
    [36, -154, 76, -116, 'strand'], [-6, -164, 34, -128, 'waben'], [-50, -164, -10, -128, 'bruecke'], [-42, -204, -2, -166, 'kuppel'],
    [0, -210, 28, -182, 'roehre'],
  ] },
  // Nachbarwelten: der Pilzwald-Archipel am Horizont im Südwesten (Rückweg-Röhre), der goldene Kronen-Gipfel über den Wolken im
  // Nordosten (Röhre WK)
  neighbors: [
    { world: 10, pos: [-235, 150], size: [100, 70], style: 'pilzfern' },
    { world: 12, pos: [150, -360], size: [90, 70], style: 'kronefern', y: 10 },
  ],
  birds: [],
  // Riesenblumen im Teich (nur Optik)
  blooms: [
    { pos: [-50, 16], top: 12, r: 7, color: 'gelb' }, { pos: [-62, -14], top: 16, r: 8, color: 'rosa' }, { pos: [62, 52], top: 10, r: 6, color: 'lila' },
    { pos: [96, 10], top: 14, r: 7, color: 'orange' }, { pos: [58, -40], top: 15, r: 7, color: 'blau' }, { pos: [-84, -60], top: 18, r: 9, color: 'rot' },
    { pos: [-70, -104], top: 15, r: 8, color: 'gelb' }, { pos: [92, -120], top: 13, r: 7, color: 'rosa' }, { pos: [-66, -150], top: 17, r: 8, color: 'lila' },
    { pos: [48, -186], top: 18, r: 8, color: 'weiss' }, { pos: [-60, -200], top: 14, r: 7, color: 'orange' },
  ],
  butterflies: { perIsland: 3, seed: 11 },
  petals: { n: 46 },

  levels: [
    { id: 'WP', world: 10, next: 10, label: 'Welt Pilz', stars: 0 },
    { id: 'B-1', stars: 3 },
    { id: 'B-2', after: 'B-1', stars: 3 },
    { id: 'B-5', after: 'B-1', stars: 3 },
    { id: 'B-3', after: 'B-2', stars: 3 },
    { id: 'B-4', after: 'B-3', stars: 3 },
    { id: 'B-6', after: 'B-4', stars: 3 },
    { id: 'B-7', after: 'B-6', stars: 3 },
    { id: 'B-8', after: 'B-7', stars: 3 },
    { id: 'B-9', after: 'B-8', stars: 3 },
    { id: 'B-10', after: 'B-9', stars: 3 },
    { id: 'B-11', after: 'B-10', stars: 3 },
    { id: 'B-12', after: 'B-11', stars: 3 },
    { id: 'WK', after: 'B-12', minStars: 330, world: 12, next: 12, label: 'Welt Krone', worldLabel: 'Welt Krone', stars: 0 },
  ],

  ground: [
    g(-26, 30, 4, 54, 3, { walk: W, style: 'petal_rose', tip: 'W' }),
    g(12, 26, 38, 50, 3.5, { walk: W, style: 'petal_red', tip: 'E' }),
    g(52, 4, 80, 30, 4.5, { walk: W, style: 'petal_yellow', tip: 'E' }),
    g(10, -8, 42, 14, 5, { walk: W, style: 'petal_blue', tip: 'E' }),
    g(6, -48, 40, -22, 6.5, { walk: W, style: 'petal_violet', tip: 'E' }),
    g(-36, -46, -10, -22, 7.5, { walk: W, style: 'petal_orange', tip: 'W' }),
    g(-44, -86, -12, -60, 9, { walk: W, style: 'petal_gray', tip: 'W' }),
    g(2, -92, 34, -62, 9.5, { walk: W, style: 'petal_teal', tip: 'S' }),
    g(44, -112, 76, -82, 10.5, { walk: W, style: 'petal_pink', tip: 'E' }),
    g(40, -150, 72, -124, 11.5, { walk: W, style: 'petal_sand', tip: 'E' }),
    g(-2, -160, 30, -134, 12.5, { walk: W, style: 'petal_honey', tip: 'N' }),
    g(-46, -160, -14, -134, 13.5, { walk: W, style: 'petal_night', tip: 'W' }),
    g(-38, -200, -6, -172, 15, { walk: W, style: 'petal_star', tip: 'W' }),
    g(4, -206, 24, -186, 15, { walk: W, style: 'petal_white', tip: 'E' }),
  ],

  walk: [
    [4, 38, 12, 42],            // A → B1 (Gießkanne)
    [38, 26, 52, 30],           // B1 → B5 (Stängel)
    [22, 14, 26, 26],           // B1 → B2 (Gießkanne)
    [20, -22, 24, -8],          // B2 → B3 (Stängel)
    [-10, -36, 6, -32],         // B3 → B4 (Gießkanne)
    [-16, -60, -12, -46],       // B4 → B6 (Stängel)
    [-12, -76, 2, -72],         // B6 → B7 (Gießkanne)
    [34, -88, 44, -84],         // B7 → B8 (Stängel)
    [56, -124, 60, -112],       // B8 → B9 (Gießkanne)
    [30, -146, 40, -142],       // B9 → B10 (Stängel)
    [-14, -148, -2, -144],      // B10 → B11 (Gießkanne)
    [-24, -172, -20, -160],     // B11 → B12 (Stängel)
    [-6, -198, 4, -194],        // B12 → K (Gießkanne)
  ],

  paths: [
    [[-4, 50.5], [-4, 44], [0, 40], [4, 40]],
    [[-4, 45], [-12, 46], [-20, 49.6]],
    [[-4, 42], [-8, 38.1]],
    [[12, 40], [18, 39], [20, 36.6]],
    [[18, 39], [24, 37], [24, 26]],
    [[24, 37], [33, 33], [38, 28]],
    [[52, 28], [58, 26], [60, 24.6]],
    [[24, 14], [25, 9], [28, 7.6]],
    [[24, 10], [20, 3], [22, -4], [22, -8]],
    [[22, -22], [24, -24.4]],
    [[22, -24], [14, -28], [10, -34], [6, -34]],
    [[-10, -34], [-14, -30], [-15, -29.6]],
    [[-15, -34], [-14, -40], [-14, -46]],
    [[-14, -60], [-18, -64], [-24, -68.6]],
    [[-18, -64], [-26, -69], [-36, -70], [-40, -71.9]],
    [[-16, -66], [-10, -72], [-6, -74], [2, -74]],
    [[2, -74], [8, -71], [10, -70.6]],
    [[8, -72], [14, -76], [26, -74], [30, -80], [34, -86]],
    [[44, -86], [50, -86], [52, -89.6]],
    [[50, -88], [56, -96], [58, -104], [58, -112]],
    [[58, -124], [54, -127], [50, -132.6]],
    [[54, -128], [44, -138], [40, -144]],
    [[30, -144], [22, -142], [14, -142.6]],
    [[14, -144], [6, -146], [-2, -146]],
    [[-14, -146], [-22, -144], [-30, -142.6]],
    [[-26, -146], [-22, -152], [-22, -160]],
    [[-22, -172], [-22, -180.6]],
    [[-22, -182], [-14, -190], [-6, -196]],
    [[4, -196], [10, -194], [14, -194.6]],
  ],

  entrances: [
    { id: 'WP', kind: 'pipe', pos: [-20, 3, 47], decor: [-20, 3, 43.9], disc: 'Pilz',
      pipe: [[0, 0, 0], [0, 3.5, 0], [-0.8, 5.6, 0.5], [-6, 6.8, 3], [-18, 7, 9], [-44, 6.2, 22], [-84, 5, 44], [-150, 4, 80]], pipeDetail: 'low',
      arriveCam: { up: 7, ahead: 6, drop: 3 }, signPos: [2.8, 0, 0.8], departAlong: true },
    { id: 'B-1', kind: 'sparkcircus', pos: [20, 3.5, 34], decor: [28, 3.5, 30.5] },
    { id: 'B-5', kind: 'bunnysavanna', pos: [60, 4.5, 22], decor: [67, 4.5, 13], sun: [76, 10.5, 5], giant: [64, 18.5],
      acacias: [[59, 8, 4.6], [73, 6, 5.2]], lifts: [[57, 7.5, 6], [66, 9, 4.8]] },
    { id: 'B-2', kind: 'cubemine', pos: [28, 5, 5], decor: [29, 5, -1.5], hordes: [[16, 3.5, 0.3], [38, 7, -0.5]] },
    { id: 'B-3', kind: 'torchcreek', pos: [24, 6.5, -27], decor: [25, 6.5, -38], moon: [17, 17, -45], pond: [27, -39.5] },
    { id: 'B-4', kind: 'clockfort', pos: [-15, 7.5, -27], decor: [-25, 7.5, -40] },
    { id: 'B-6', kind: 'graymansion', pos: [-24, 9, -66], decor: [-26, 9, -77] },
    { id: 'B-7', kind: 'cannonlagoon', pos: [10, 9.5, -68], decor: [20, 9.5, -79], lagoon: 4.2 },
    { id: 'B-8', kind: 'beepskyway', pos: [52, 10.5, -87], decor: [62, 10.5, -97] },
    { id: 'B-9', kind: 'sunsetbeach', pos: [50, 11.5, -130], decor: [58, 11.5, -140], sun: [47, 17, -149], tower: [58, -143.5] },
    { id: 'B-10', kind: 'dayhive', pos: [14, 12.5, -140], decor: [14, 12.5, -151] },
    { id: 'B-11', kind: 'spotbridge', pos: [-30, 13.5, -140], decor: [-29, 13.5, -151], lamp: [-36.5, -154] },
    { id: 'B-12', kind: 'bossdome', pos: [-22, 15, -178], decor: [-22, 15, -191], labelY: 2.8 },
    { id: 'WK', kind: 'pipe', pos: [14, 15, -192], decor: [14, 15, -195.1], disc: 'Krone',
      pipe: [[0, 0, 0], [0, 4, 0], [0.6, 7, -0.8], [3, 11, -4], [8, 15, -12], [16, 20, -24], [30, 25, -44], [60, 30, -80], [110, 32, -130]], pipeDetail: 'low',
      arriveCam: { up: 9, ahead: 4, drop: 6 }, signPos: [2.8, 0, 0.6] },
  ],

  gates: [
    { for: 'B-5', at: [45, 28], axis: 'x' },
    { for: 'B-2', at: [24, 20], axis: 'z' },
    { for: 'B-3', at: [22, -15], axis: 'z' },
    { for: 'B-4', at: [-2, -34], axis: 'x' },
    { for: 'B-6', at: [-14, -53], axis: 'z' },
    { for: 'B-7', at: [-5, -74], axis: 'x' },
    { for: 'B-8', at: [39, -86], axis: 'x' },
    { for: 'B-9', at: [58, -118], axis: 'z' },
    { for: 'B-10', at: [35, -144], axis: 'x' },
    { for: 'B-11', at: [-8, -146], axis: 'x' },
    { for: 'B-12', at: [-22, -166], axis: 'z' },
    { for: 'WK', at: [-1, -196], axis: 'x' },
  ],

  roamers: [],

  houses: [
    { kind: 'beeren', pos: [-8, 3, 33.5], yaw: -PI / 2, item: [-8, 3, 38.1], items: ['funken', 'krallen'] },
    { kind: 'glueck', pos: [-40, 9, -79.4], yaw: -PI / 2, machine: [-40, 9, -74.6], pad: [-40, 9, -71.9], stake: 10 },
  ],

  signs: [
    { pos: [2.2, 3, 51.6], yaw: -0.2, text: 'Welt Blume\nBlumen-Remix' },
    { pos: [-12.6, 3, 37.2], yaw: 0.3, text: 'Beerenhaus' },
    { pos: [-35.4, 9, -69.6], yaw: 0.25, text: 'Glückshaus' },
    // Sternschranke: Schild mit dem Sternbedarf vor der Gießkannen-Brücke zum Röhren-Blatt
    { pos: [-8.6, 15, -191.4], yaw: 0.3, text: 'ab 330 ★' },
  ],

  props: [
    // A Gartentor
    { kind: 'lamp11', pos: [-24, 3, 52] }, { kind: 'lamp11', pos: [2, 3, 46] }, { kind: 'lamp11', pos: [-24, 3, 32] }, { kind: 'lamp11', pos: [2, 3, 32] },
    { kind: 'gnome11', pos: [-16, 3, 34.5], yaw: 0.4 }, { kind: 'flowers11', pos: [-1.5, 3, 35.5], color: 'rot' }, { kind: 'bush11', pos: [-23.5, 3, 40.5] },
    { kind: 'can11', pos: [-13, 3, 52.5], size: 1.1, yaw: 0.6 }, { kind: 'bench11', pos: [-2, 3, 53], yaw: PI },
    // B1 Zirkus
    { kind: 'lamp11', pos: [36.5, 3.5, 48.5] }, { kind: 'flowers11', pos: [13.5, 3.5, 47.5], color: 'gelb' },
    // B5 Savanne
    { kind: 'sunflower11', pos: [54, 4.5, 6], size: 3.4 }, { kind: 'sunflower11', pos: [78, 4.5, 28], size: 3 },
    // B2 Mine
    { kind: 'lamp11', pos: [40.5, 5, 12.5] }, { kind: 'lamp11', pos: [11.5, 5, 12.5] }, { kind: 'bush11', pos: [12, 5, -5.5] },
    // B3 Nacht
    { kind: 'lamp11', pos: [8, 6.5, -24] }, { kind: 'lamp11', pos: [38, 6.5, -24] },
    // B4 Burg
    { kind: 'flowers11', pos: [-12, 7.5, -44], color: 'blau' }, { kind: 'lamp11', pos: [-34.5, 7.5, -23.5] },
    // B6 Spuk (grau)
    { kind: 'bench11', pos: [-14, 9, -84], yaw: -0.3 },
    // B7 Lagune
    { kind: 'lamp11', pos: [3.5, 9.5, -90.5] }, { kind: 'flowers11', pos: [32, 9.5, -64], color: 'rosa' },
    // B8 Piep
    { kind: 'lamp11', pos: [46, 10.5, -83.5] }, { kind: 'flowers11', pos: [74, 10.5, -110], color: 'lila' },
    // B9 Strand
    { kind: 'can11', pos: [69.5, 11.5, -126.5] },
    // B10 Waben
    { kind: 'sunflower11', pos: [0.5, 12.5, -136], size: 3.2 }, { kind: 'flowers11', pos: [28, 12.5, -158], color: 'gelb' },
    // B11 Brücke
    { kind: 'lamp11', pos: [-15.5, 13.5, -135.5] },
    // B12 Kuppel
    { kind: 'lamp11', pos: [-7.5, 15, -173.5] }, { kind: 'lamp11', pos: [-36.5, 15, -173.5] },
    // K Röhren-Blatt
    { kind: 'flowers11', pos: [6, 15, -188], color: 'weiss' }, { kind: 'flowers11', pos: [22, 15, -204], color: 'gelb' },
  ],

  segments: [
    { type: 'canbridge', from: [4, 3, 40], to: [12, 3.5, 40], width: 4 },
    { type: 'stembridge11', from: [38, 3.5, 28], to: [52, 4.5, 28], width: 4 },
    { type: 'canbridge', from: [24, 3.5, 26], to: [24, 5, 14], width: 4 },
    { type: 'stembridge11', from: [22, 5, -8], to: [22, 6.5, -22], width: 4 },
    { type: 'canbridge', from: [6, 6.5, -34], to: [-10, 7.5, -34], width: 4 },
    { type: 'stembridge11', from: [-14, 7.5, -46], to: [-14, 9, -60], width: 4 },
    { type: 'canbridge', from: [-12, 9, -74], to: [2, 9.5, -74], width: 4 },
    { type: 'stembridge11', from: [34, 9.5, -86], to: [44, 10.5, -86], width: 4 },
    { type: 'canbridge', from: [58, 10.5, -112], to: [58, 11.5, -124], width: 4 },
    { type: 'stembridge11', from: [40, 11.5, -144], to: [30, 12.5, -144], width: 4 },
    { type: 'canbridge', from: [-2, 12.5, -146], to: [-14, 13.5, -146], width: 4 },
    { type: 'stembridge11', from: [-22, 13.5, -160], to: [-22, 15, -172], width: 4 },
    { type: 'canbridge', from: [-6, 15, -196], to: [4, 15, -196], width: 4 },
  ],
};
