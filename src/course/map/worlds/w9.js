// Kurs-Weltkarte der Bonuswelt Stern „Sternenzelt“ (Welt 9, Level-Präfix 'S'; Vertrag: „Bonuswelten – Level-Liste und
// Freischaltung (Hauptsitzung)“, Welt Stern). Format: docs/KURS-ARCHITEKTUR.md, „Präzisierung (Weltkarte)“ und
// „Präzisierung (Mehrwelten-Karte)“. Koordinaten in Metern, Y oben, Kamera blickt von Süden nach Norden (−Z).
//
// Eigene Gestaltung, kindgerecht und zum Staunen: Inseln schweben im Weltraum über einem tiefen Sternenmeer, verbunden durch
// Regenbogenwege und Sternenbrücken; Planeten drehen sich zwischen den Inseln, Spielzeugraketen kreisen, Sternschnuppen sausen
// vorbei, und rund um die Inseln funkeln Sterne im Takt der Kartenmusik (sterne9.js). Der Weg steigt im Zickzack nach Norden:
// Sternenhafen mit der Glasröhre zurück zum Brummbär-Rummelplatz und dem Beerenhaus → Regenbogeninsel (S-1) →
// Planetoiden-Plattenfeld (S-2) mit Abzweig zu Krümels Drehdiorama (S-Kapitän) → Holz-Walzen-Insel (S-3) → Wolkeninsel mit dem
// fliegenden Zielmast (S-4) → Retro-Blockland mit dem Glückshaus (S-5) → Wabeninsel (S-6) → Riesen-Dschungel (S-7) →
// verschneiter Nebelfriedhof (S-8) → futuristische Kanonen-Station (S-9, ab 280 Sternen) bzw. Röhren-Insel mit der Glasröhre
// zur Welt Pilz (frei nach S-8). Sternbedarf zählt alle Sterne (starScope 'all'). Kulissen der Eingänge: decor_star.js.
//
// Bereiche (begehbar, Höhe):                 Eingänge (kind):
//   A  Sternenhafen (Ankunft)  y 10            W8         pipe            Glasröhre zurück nach Welt 8 (−20, 10, 47)
//   A2 Regenbogeninsel         y 10.5          S-1        rainbowisle     Sternentor, Regenbogen      (18, 10.5, 34)
//   B  Planetoiden-Plattenfeld y 12            S-2        platefield      Farb-/Drehplatten, Planetoiden (28, 12, 4)
//   K  Diorama-Insel           y 12.5          S-Kapitän  spindiorama     Krümels Drehdiorama         (63, 12.5, 7.5)
//   C  Holz-Walzen-Insel       y 13.5          S-3        rollerisle      Schienenwalzen              (21, 13.5, −30)
//   D  Wolkeninsel             y 14.5          S-4        goalcloud       fliegender Zielmast         (−14, 14.5, −27)
//   E  Retro-Blockland         y 16            S-5        blockland       Riesenblöcke, ?-Turm        (−26, 16, −66)
//   F  Wabeninsel              y 17            S-6        honeycomb       Waben, Wabensäulen          (16, 17, −70)
//   G  Riesen-Dschungel        y 18            S-7        giantjungle     Riesenpflanzen              (59, 18, −86)
//   H  Nebelfriedhof           y 19.5          S-8        fogyard         Schneegräber, Nebel         (34, 19.5, −124)
//   I  Kanonen-Station         y 21            S-9        cannonstation   Kuppel, Schienenbrett (280 ★) (−14, 21, −138)
//   J  Röhren-Insel            y 19.5          WP         pipe            Glasröhre zur Welt Pilz     (38, 19.5, −157)

const PI = Math.PI;
const g = (x0, z0, x1, z1, top, opts = {}) => ({ rect: [x0, z0, x1, z1], top, ...opts });
const W = true;

export const MAP = {
  id: 'karte-9',
  world: 9,
  prefix: 'S',                  // Level-Ids „S-1“ … gehören zu Welt 9 (worldOfLevel, starsInWorld)
  worldLabel: 'Welt Stern',     // statt „Welt 9“ (HUD, Schild der Röhre in Welt 8, Ankunfts-/„bald“-Meldungen)
  title: 'Sternenzelt',
  short: 'Sternenzelt',
  travelToast: 'Auf ins Sternenzelt!',
  archetype: 'map',
  theme: 'map_star',
  kit: 'star',
  music: 'course_worldstar_map',
  fallbackMusic: 'course_map',
  starScope: 'all',             // Sternschranke zählt alle gesammelten Sterne (Vertrag Bonuswelten)
  base: -3,
  sea: 0,                       // „Meer“ = Sternenmeer tief unter den schwebenden Inseln (sterne9.js StarSea)
  spawn: { pos: [-4, 10, 50], yaw: PI / 2 },
  camera: [{ from: 200, to: -300, pitch: 48, dist: 16.5, fov: 40, ahead: 3.6, lead: 0.7, height: 1.0 }],
  intro: { from: [14, 44, 128], look: [10, 16, -60], duration: 3.4 },
  edges: { hedge: 'starhedge', fence: 'starrail' },
  pathColors: [0xfff0c8, 0xf4dca4, 0x9a7ac8],     // helle Sternenstaub-Platten (gut lesbar auf den farbigen Inseln)
  // Kacheln: je Insel eine Zone (ein Mesh je Material/Schattenwurf), außerhalb 48-m-Raster
  batch: { tile: 48, origin: [-8, 4], freeTile: 96, freeOrigin: [-56, -56], zones: [
    [-30, 26, 8, 58, 'hafen'], [8, 22, 40, 52, 'regenbogen'], [4, -10, 46, 22, 'platten'], [46, -10, 80, 18, 'diorama'],
    [0, -50, 42, -10, 'walzen'], [-40, -50, 0, -18, 'wolke'], [-50, -90, -8, -50, 'retro'], [-8, -92, 34, -50, 'waben'],
    [34, -110, 82, -70, 'dschungel'], [12, -146, 56, -110, 'nebel'], [-38, -164, 6, -124, 'station'], [26, -172, 52, -146, 'pilzroehre'],
  ] },
  // Nachbarwelt am Horizont: der Brummbär-Rummelplatz (Welt 8) tief unten im Südwesten – dorthin führt die Rückweg-Röhre
  neighbors: [{ world: 8, pos: [-230, 150], size: [80, 56], style: 'rummelfern', y: -26 }],
  birds: [],

  // ---- lebendige Kulisse (sterne9.js StarLife)
  // Planeten (Registry 'planet' mit kind) schweben zwischen den Inseln und drehen sich; der Pilz-Planet am Ende der Pilz-Röhre
  planets: [
    { kind: 'blume', pos: [-4, 3, 16], size: 8, speed: 0.06 },
    { kind: 'ring', pos: [-12, 4, -92], size: 11, speed: 0.05 },
    { kind: 'eis', pos: [64, 9, -126], size: 8, speed: -0.07 },
    { kind: 'pilz', pos: [72, 30, -196], size: 16, speed: 0.04 },
  ],
  // Spielzeugraketen kreisen um Inseln (Mitte, Radius, Höhe über der Mitte schwankt um h)
  rockets: [{ c: [46, 16, -40], r: 9, h: 3, speed: 0.42, color: 'rot' }, { c: [-30, 24, -104], r: 10, h: 3, speed: -0.36, color: 'blau' }],
  // Sternschnuppen: sausen in Abständen schräg durchs Bild (relativ zum Blickpunkt der Kamera)
  shooting: { n: 2, period: 7.5 },
  // funkelnde Sterne rings um die Inseln (Gruppen leuchten im Takt der Kartenmusik nacheinander auf)
  twinkle: { perIsland: 14, seed: 9 },

  levels: [
    { id: 'W8', world: 8, next: 8, label: 'Welt 8', stars: 0 },
    { id: 'S-1', stars: 3, stamp: true },
    { id: 'S-2', after: 'S-1', stars: 3, stamp: true },
    { id: 'S-Kapitän', after: 'S-2', stars: 5 },
    { id: 'S-3', after: 'S-2', stars: 3, stamp: true },
    { id: 'S-4', after: 'S-3', stars: 3, stamp: true },
    { id: 'S-5', after: 'S-4', stars: 3, stamp: true },
    { id: 'S-6', after: 'S-5', stars: 3, stamp: true },
    { id: 'S-7', after: 'S-6', stars: 3, stamp: true },
    { id: 'S-8', after: 'S-7', stars: 3, stamp: true },
    { id: 'S-9', after: 'S-8', minStars: 280, stars: 3, stamp: true },
    { id: 'WP', after: 'S-8', world: 10, next: 10, label: 'Welt Pilz', worldLabel: 'Welt Pilz', stars: 0 },
  ],

  ground: [
    // ---- A Sternenhafen (Ankunft), A2 Regenbogeninsel
    g(-26, 30, 4, 54, 10, { walk: W, style: 'starplaza' }),
    g(12, 26, 36, 48, 10.5, { walk: W, style: 'rainbow' }),
    // ---- B Planetoiden-Plattenfeld, K Diorama-Insel
    g(8, -8, 42, 14, 12, { walk: W, style: 'galaxy' }),
    g(54, -6, 74, 14, 12.5, { walk: W, style: 'diorama' }),
    // ---- C Holz-Walzen-Insel, D Wolkeninsel
    g(4, -46, 38, -22, 13.5, { walk: W, style: 'wood' }),
    g(-34, -44, -10, -22, 14.5, { walk: W, style: 'cloud' }),
    // ---- E Retro-Blockland, F Wabeninsel
    g(-44, -84, -12, -58, 16, { walk: W, style: 'retro' }),
    g(2, -88, 30, -62, 17, { walk: W, style: 'honey' }),
    // ---- G Riesen-Dschungel, H Nebelfriedhof
    g(44, -106, 76, -74, 18, { walk: W, style: 'jungle' }),
    g(18, -140, 52, -116, 19.5, { walk: W, style: 'snowfog' }),
    // ---- I Kanonen-Station, J Röhren-Insel zur Welt Pilz
    g(-32, -158, 2, -128, 21, { walk: W, style: 'tech' }),
    g(30, -166, 46, -150, 19.5, { walk: W, style: 'starplaza' }),
  ],

  // Zusätzlich begehbar: Regenbogenwege und Sternenbrücken
  walk: [
    [4, 38, 12, 42],          // A → A2 (Regenbogenweg)
    [22, 14, 26, 26],         // A2 → B (Sternenbrücke)
    [42, 1, 54, 5],           // B → K (Sternenbrücke)
    [20, -22, 24, -8],        // B → C (Regenbogenweg)
    [-10, -34, 4, -30],       // C → D (Sternenbrücke)
    [-26, -58, -22, -44],     // D → E (Regenbogenweg)
    [-12, -74, 2, -70],       // E → F (Sternenbrücke)
    [30, -82, 44, -78],       // F → G (Regenbogenweg)
    [46, -116, 50, -106],     // G → H (Sternenbrücke)
    [2, -134, 18, -130],      // H → I (Regenbogenweg)
    [36, -150, 40, -140],     // H → J (Sternenbrücke)
  ],

  paths: [
    [[-4, 50.5], [-4, 44], [0, 40], [4, 40]],
    [[-4, 45], [-12, 46], [-20, 49.6]],
    [[-4, 42], [-8, 38.1]],
    [[12, 40], [18, 40], [18, 36.6]],
    [[18, 40], [26, 38], [27, 31], [24, 26]],
    [[24, 14], [24, 10], [28, 6.6]],
    [[24, 10], [34, 7], [38, 3], [42, 3]],
    [[24, 10], [18, 3], [20, -4], [22, -8]],
    [[54, 3], [60, 7], [63, 10.1]],
    [[22, -22], [21, -27.4]],
    [[22, -24], [12, -28], [4, -32]],
    [[-10, -32], [-14, -29.6]],
    [[-12, -32], [-18, -37], [-24, -44]],
    [[-24, -58], [-26, -63.4]],
    [[-24, -61], [-18, -66], [-12, -72]],
    [[-26, -62], [-34, -66], [-38, -71.9]],
    [[2, -72], [10, -68], [16, -67.4]],
    [[10, -68], [22, -71], [27, -80], [30, -80]],
    [[44, -80], [52, -82], [59, -83.4]],
    [[52, -82], [48, -94], [48, -106]],
    [[48, -116], [40, -120], [34, -121.4]],
    [[40, -120], [24, -126], [18, -132]],
    [[40, -120], [42, -132], [38, -140]],
    [[2, -132], [-8, -134], [-14, -135.4]],
    [[38, -150], [38, -154.4]],
  ],

  entrances: [
    { id: 'W8', kind: 'pipe', pos: [-20, 10, 47], decor: [-20, 10, 43.9],
      pipe: [[0, 0, 0], [0, 3.5, 0], [-0.8, 5.8, 0.5], [-6, 7, 3], [-18, 6, 9], [-44, 2, 22], [-84, -6, 44], [-150, -18, 80]], pipeDetail: 'low',
      arriveCam: { up: 7, ahead: 6, drop: 3 }, signPos: [2.8, 0, 0.8], departAlong: true },
    { id: 'S-1', kind: 'rainbowisle', pos: [18, 10.5, 34], decor: [18, 10.5, 29.4], mice: [[30, 10.5, 42], [14.5, 10.5, 43]], ring: [31, 13.5, 33] },
    { id: 'S-2', kind: 'platefield', pos: [28, 12, 4], decor: [31, 12, -2.5], flips: [[10, -7.6], [14, -7.6]], steps: [39.5, 12, 2.4], planet: [5, 14.5, 3.5] },
    { id: 'S-Kapitän', kind: 'spindiorama', pos: [63, 12.5, 7.5], decor: [64, 12.5, -0.5], disc: 'S-K' },
    { id: 'S-3', kind: 'rollerisle', pos: [21, 13.5, -30], decor: [21, 13.5, -39], side: [32, 13.5, -33] },
    { id: 'S-4', kind: 'goalcloud', pos: [-14, 14.5, -27], decor: [-25, 14.5, -31], fly: [-20, 14.7, -31.5, 4.2] },
    { id: 'S-5', kind: 'blockland', pos: [-26, 16, -66], decor: [-26, 16, -75], tower: [-15, 16, -80] },
    { id: 'S-6', kind: 'honeycomb', pos: [16, 17, -70], decor: [16, 17, -79] },
    { id: 'S-7', kind: 'giantjungle', pos: [59, 18, -86], decor: [60, 18, -94], roll: [68.5, -83, 4] },
    { id: 'S-8', kind: 'fogyard', pos: [34, 19.5, -124], decor: [28, 19.5, -133] },
    { id: 'S-9', kind: 'cannonstation', pos: [-14, 21, -138], decor: [-16, 21, -148], rail: [-28, 21.4, -134, 22] },
    { id: 'WP', kind: 'pipe', pos: [38, 19.5, -157], decor: [38, 19.5, -160.1],
      pipe: [[0, 0, 0], [0, 4, 0], [0.6, 7, -0.8], [3, 12, -4], [8, 16, -12], [16, 20, -24], [26, 22, -36], [44, 22, -60], [70, 20, -100]], pipeDetail: 'low',
      arriveCam: { up: 9, ahead: 4, drop: 6 }, signPos: [2.8, 0, 0.6] },
  ],

  gates: [
    { for: 'S-2', at: [24, 20], axis: 'z' },
    { for: 'S-Kapitän', at: [48, 3], axis: 'x' },
    { for: 'S-3', at: [22, -15], axis: 'z' },
    { for: 'S-4', at: [-3, -32], axis: 'x' },
    { for: 'S-5', at: [-24, -51], axis: 'z' },
    { for: 'S-6', at: [-5, -72], axis: 'x' },
    { for: 'S-7', at: [37, -80], axis: 'x' },
    { for: 'S-8', at: [48, -111], axis: 'z' },
    { for: 'S-9', at: [10, -132], axis: 'x' },
    { for: 'WP', at: [38, -145], axis: 'z' },
  ],

  roamers: [],

  houses: [
    { kind: 'beeren', pos: [-8, 10, 33.5], yaw: -PI / 2, item: [-8, 10, 38.1], items: ['krallen', 'funken'] },
    { kind: 'glueck', pos: [-38, 16, -79.4], yaw: -PI / 2, machine: [-38, 16, -74.6], pad: [-38, 16, -71.9], stake: 10 },
  ],

  signs: [
    { pos: [2.2, 10, 51.6], yaw: -0.2, text: 'Welt Stern\nSternenzelt' },
    { pos: [-12.6, 10, 37.2], yaw: 0.3, text: 'Beerenhaus' },
    { pos: [-33.4, 16, -69.6], yaw: 0.25, text: 'Glückshaus' },
    // Sternschranke: Schild mit dem Sternbedarf vor dem Regenbogenweg zur Kanonen-Station
    { pos: [21, 19.5, -127.4], yaw: 0.3, text: 'ab 280 ★' },
  ],

  props: [
    // A Sternenhafen: Sternenlaternen, Spielzeugrakete, Kristalle, Sternstatue
    { kind: 'lamp9', pos: [-24, 10, 52] }, { kind: 'lamp9', pos: [2, 10, 46] }, { kind: 'lamp9', pos: [-24, 10, 32] }, { kind: 'lamp9', pos: [2, 10, 32] },
    { kind: 'rocket9', pos: [-17, 10, 35], color: 'gruen', size: 4 },
    { kind: 'star9', pos: [-1, 10, 34.5], size: 1.2 },
    { kind: 'scope9', pos: [-23, 10, 50.5], yaw: 0.8 }, { kind: 'pad9', pos: [-17, 10, 35], shadow: false },
    { kind: 'crystal9', pos: [-24, 10, 40], size: 0.9, tone: 0 }, { kind: 'crystal9', pos: [-14.5, 10, 31.6], size: 0.7, tone: 1 },
    // A2 Regenbogeninsel
    { kind: 'lamp9', pos: [34, 10.5, 46.4] }, { kind: 'crystal9', pos: [34, 10.5, 27.6], size: 0.8, tone: 2 },
    // B Plattenfeld
    { kind: 'lamp9', pos: [40, 12, 12.4] }, { kind: 'lamp9', pos: [9.6, 12, 12.4] }, { kind: 'rocket9', pos: [11, 12, -5], color: 'lila', size: 3.6 },
    // K Diorama-Insel
    { kind: 'lamp9', pos: [56, 12.5, 12.4] }, { kind: 'lamp9', pos: [72.4, 12.5, 12.4] },
    // C Holz-Walzen-Insel: Holzkisten, Laternen
    { kind: 'crates9', pos: [7, 13.5, -24.4] }, { kind: 'lamp9', pos: [36.4, 13.5, -23.6] }, { kind: 'crates9', pos: [35.6, 13.5, -44] },
    // D Wolkeninsel: Boost-Pfeile, Donut-Blöcke
    { kind: 'boost9', pos: [-15, 14.5, -33], yaw: PI / 2 }, { kind: 'boost9', pos: [-15, 14.5, -37], yaw: PI / 2 },
    { kind: 'donut9', pos: [-31.5, 14.5, -24.5] }, { kind: 'donut9', pos: [-29, 14.5, -24.5] }, { kind: 'donut9', pos: [-31.5, 15.5, -24.5] },
    { kind: 'lamp9', pos: [-11, 14.5, -42.5] }, { kind: 'lamp9', pos: [-33, 14.5, -42.5] }, { kind: 'cloud9', pos: [-30, 18.5, -38] }, { kind: 'cloud9', pos: [-13, 19, -40], size: 0.8 },
    // E Retro-Blockland: Retro-Büsche, Blockstapel
    { kind: 'rbush9', pos: [-41.5, 16, -61], size: 3 }, { kind: 'rbush9', pos: [-15, 16, -60.5], size: 2.6, seed: 1 },
    { kind: 'rblock9', pos: [-42, 16, -83], n: 2, block: 'hart' }, { kind: 'rblock9', pos: [-14, 16, -83], n: 1, block: 'ziegel' },
    // F Wabeninsel: Waben-Säulen
    { kind: 'hexpillar9', pos: [3.6, 17, -86.4], h: 6, hex: 'normal' }, { kind: 'hexpillar9', pos: [28.4, 17, -86.4], h: 4.5, hex: 'eis' },
    { kind: 'hexpillar9', pos: [28.4, 17, -63.6], h: 3.2, hex: 'lava' },
    // G Riesen-Dschungel: Riesenblätter, Farne
    { kind: 'plant9', pos: [45.5, 18, -104.5], plant: 'blatt', size: 6, yaw: 0.6 }, { kind: 'plant9', pos: [74.5, 18, -75.5], plant: 'blatt', size: 5, yaw: -2.4 },
    { kind: 'fern9', pos: [46, 18, -76] }, { kind: 'fern9', pos: [74, 18, -104] }, { kind: 'fern9', pos: [53.5, 18, -88] }, { kind: 'fern9', pos: [64.5, 18, -76.5] },
    { kind: 'plant9', pos: [47, 18, -88], plant: 'blume', size: 5, yaw: 0.9 }, { kind: 'plant9', pos: [73.5, 18, -92], plant: 'pilz', size: 3.6, yaw: -0.5 },
    // H Nebelfriedhof: Schneetannen, Schneegräber
    { kind: 'fir9', pos: [19.6, 19.5, -117.6], size: 4.2 }, { kind: 'fir9', pos: [50.4, 19.5, -138.4], size: 5 }, { kind: 'fir9', pos: [50.4, 19.5, -117.8], size: 3.6 },
    { kind: 'grave9', pos: [44, 19.5, -126], grave: 'kreuz', tilt: 0.1 }, { kind: 'grave9', pos: [46.5, 19.5, -124], grave: 'rund' },
    { kind: 'lamp9', pos: [19.6, 19.5, -138.4] }, { kind: 'lamp9', pos: [44.4, 19.5, -117.6] },
    // I Kanonen-Station: Antenne, Neonlampen
    { kind: 'antenna9', pos: [-30, 21, -156] }, { kind: 'neon9', pos: [0, 21, -129.6] }, { kind: 'neon9', pos: [-30.4, 21, -129.6] },
    // J Röhren-Insel: Riesenpilze (Vorgeschmack auf die Welt Pilz), Laternen
    { kind: 'plant9', pos: [32, 19.5, -164], plant: 'pilz', size: 4.2, yaw: 0.4 }, { kind: 'plant9', pos: [44.4, 19.5, -152], plant: 'pilz', size: 3, yaw: 2 },
    { kind: 'lamp9', pos: [31.6, 19.5, -151.6] },
  ],

  segments: [
    { type: 'rainbowway', from: [4, 10, 40], to: [12, 10.5, 40], width: 4 },
    { type: 'starbridge', from: [24, 10.5, 26], to: [24, 12, 14], width: 4 },
    { type: 'starbridge', from: [42, 12, 3], to: [54, 12.5, 3], width: 4 },
    { type: 'rainbowway', from: [22, 12, -8], to: [22, 13.5, -22], width: 4 },
    { type: 'starbridge', from: [4, 13.5, -32], to: [-10, 14.5, -32], width: 4 },
    { type: 'rainbowway', from: [-24, 14.5, -44], to: [-24, 16, -58], width: 4 },
    { type: 'starbridge', from: [-12, 16, -72], to: [2, 17, -72], width: 4 },
    { type: 'rainbowway', from: [30, 17, -80], to: [44, 18, -80], width: 4 },
    { type: 'starbridge', from: [48, 18, -106], to: [48, 19.5, -116], width: 4 },
    { type: 'rainbowway', from: [18, 19.5, -132], to: [2, 21, -132], width: 4 },
    { type: 'starbridge', from: [38, 19.5, -140], to: [38, 19.5, -150], width: 4 },
  ],
};
