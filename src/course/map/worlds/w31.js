// Kurs-Weltkarte der Halloween-Sonderwelt „Kürbisinsel“ (Weltnummer 31 = 31. Oktober, Level-Präfix 'H'; Vertrag:
// „Halloween-Welt „Kürbisinsel“ – Level-Liste und Freischaltung“). Format: docs/KURS-ARCHITEKTUR.md, „Präzisierung
// (Weltkarte)“ und „Präzisierung (Mehrwelten-Karte)“. Koordinaten in Metern, Y oben, Kamera blickt von Süden nach Norden.
//
// Kindgerecht-gruselig im Abendrot und Mondlicht: Ankunftsbucht mit der Glasröhre zurück nach Welt 1 und dem
// Kürbisfeld mit Vogelscheuche (H-1) → Holzsteg mit Laternen übers Wasser zum Gruseldorf mit beleuchteten Fenstern
// (H-2) → westlich das Kürbislabyrinth mit Krümel und Laterne (H-Kapitän), nordöstlich der Nebelfriedhof mit
// schmiedeeisernem Tor (H-3) → Steg nach Westen ins Hexenmoor mit dem schiefen Hexenturm und dem Kessel (H-4) → Stufensteg
// hinauf zum Gruselschloss auf dem Hügel (H-Burg, Fledermäuse kreisen). Die Welt ist immer offen (alwaysOpen, kein
// Sternbedarf); erreichbar über die Halloween-Röhre HW auf der Welt-1-Karte nahe der Ankunft.
//
// Bereiche (begehbar, Höhe):                 Eingänge (kind):
//   A  Ankunftsbucht            y 1            W1         Glasröhre zurück (pipe)       (−16, 1, 36)
//   A2 Kürbisfeld-Lichtung      y 1            H-1        Kürbisfeld (pumpkinfield)     (18, 1, 35)
//   B  Gruseldorf-Platz         y 2            H-2        Gruseldorf (spookvillage)     (−2, 2, −4)
//   C  Labyrinth-Wiese          y 2            H-Kapitän  Kürbislabyrinth (pumpkinmaze) (−35, 2, 1)
//   D  Friedhofsvorplatz        y 3            H-3        Nebelfriedhof (foggraveyard)  (16, 3, −33)
//   E  Hexenmoor                y 4            H-4        Hexenturm (witchtower)        (−27, 4, −50)
//   F  Schlosshügel             y 6            H-Burg     Gruselschloss (spookcastle)   (−4, 6, −88)

const PI = Math.PI;
const g = (x0, z0, x1, z1, top, opts = {}) => ({ rect: [x0, z0, x1, z1], top, ...opts });
const W = true;

export const MAP = {
  id: 'karte-31',
  world: 31,
  prefix: 'H',                   // Level-Ids „H-1“ … gehören zu Welt 31 (worldOfLevel, starsInWorld)
  alwaysOpen: true,              // Sonderwelt: immer offen, kein Sternbedarf
  worldLabel: 'Halloween',       // statt „Welt 31“ (HUD, Schild der Röhre)
  title: 'Kürbisinsel',          // Weltname „Halloween · Kürbisinsel“
  short: 'Kürbisinsel',
  travelToast: 'Auf zur Kürbisinsel!',
  archetype: 'map',
  theme: 'map_halloween',
  kit: 'halloween',
  music: 'course_halloween_map',
  fallbackMusic: 'course_map',
  base: -3,
  sea: 0,
  spawn: { pos: [-2, 1, 41], yaw: PI / 2 },
  camera: [{ from: 200, to: -300, pitch: 50, dist: 16, fov: 40, ahead: 3.6, lead: 0.7, height: 1.0 }],
  intro: { from: [6, 22, 104], look: [0, 5, -46], duration: 3.2 },
  edges: { hedge: 'hwstone', fence: 'hwpicket' },
  pathColors: [0xe2dec4, 0xd2ccb0, 0x76705a],      // helle, alte Steinplatten (im lila-warmen Abendlicht neutral)
  seaColors: [0x5aa6cc, 0x3a6cb4, 0x22327c],      // Türkis am Ufer, Violett-Nachtblau draußen
  batch: { tile: 32, origin: [-4, 6], freeTile: 96, freeOrigin: [-56, -56] },
  // Nachbarwelt am Horizont: Welt 1 (grüne Blockinsel) im Westen – dorthin führt die Rückweg-Röhre
  neighbors: [{ world: 1, pos: [-258, 70], size: [72, 50], style: 'grass' }],
  // Fledermaus-Schwärme (halloween.js HwLife): über dem Schloss, um den Hexenturm, am Friedhof, über der Bucht
  bats: [{ c: [-4, 14, -97], r: 8, n: 7 }, { c: [-26, 13, -58], r: 5.5, n: 4, speed: 0.9 }, { c: [16, 6.5, -42], r: 6, n: 3 }, { c: [0, 5, 32], r: 8, n: 3, speed: 0.5 },
    { c: [-2, 6, -6], r: 7, n: 3, speed: 0.6 }],
  fog: { n: 46 },

  // Freischaltung (Vertrag: Halloween-Welt – Level-Liste): H-1 frei, sobald die Welt offen ist (immer)
  levels: [
    { id: 'W1', world: 1, next: 1, label: 'Welt 1', stars: 0 },
    { id: 'H-1', stars: 3, stamp: true },
    { id: 'H-2', after: 'H-1', stars: 3, stamp: true },
    { id: 'H-Kapitän', after: 'H-2', stars: 3 },
    { id: 'H-3', after: 'H-2', stars: 3, stamp: true },
    { id: 'H-4', after: 'H-3', stars: 3, stamp: true },
    { id: 'H-Burg', after: 'H-4', stars: 3, stamp: true },
  ],

  ground: [
    // ---- A Ankunftsbucht, A2 Lichtung im Kürbisfeld, Felder, Strände
    g(-24, 26, 10, 46, 1, { walk: W }),
    g(10, 30, 26, 42, 1, { walk: W }),
    g(10, 18, 36, 30, 1.3, { style: 'field', edge: 'hwpicket' }),
    g(26, 30, 36, 46, 1.3, { style: 'field', edge: 'hwpicket' }),
    g(10, 42, 26, 46, 0.6, { style: 'hwbeach', noEdge: true }),
    g(-34, 46, 38, 51, 0.45, { style: 'hwbeach', noEdge: true }),
    g(-34, 30, -24, 46, 0.6, { style: 'hwbeach', noEdge: true }),
    // ---- B Gruseldorf mit Häuserzeile, Spukwald östlich
    g(-14, -8, 14, 12, 2, { style: 'cobble', walk: W }),
    g(-14, -20, 6, -8, 2.3, { style: 'village', edge: 'hwstone' }),
    g(14, -12, 30, 14, 2.6, { style: 'forest' }),
    // ---- C Labyrinth-Wiese, Wald dahinter, Strand davor
    g(-44, -10, -26, 8, 2, { style: 'maze', walk: W }),
    g(-48, -26, -24, -10, 3.4, { style: 'forest' }),
    g(-46, 8, -26, 13, 0.6, { style: 'hwbeach', noEdge: true }),
    // ---- D Friedhofsvorplatz, Friedhof (Zaun aus der Kulisse), Wald dahinter
    g(0, -40, 32, -24, 3, { style: 'graveyard', walk: W }),
    g(0, -54, 32, -40, 3.15, { style: 'graveyard', noEdge: true }),
    g(-14, -34, 0, -24, 3.6, { style: 'forest' }),
    g(32, -54, 42, -24, 2.2, { style: 'hwrock', trees: 0.6 }),
    // ---- E Hexenmoor, Felsen
    g(-40, -66, -14, -36, 4, { style: 'moor', walk: W }),
    g(-50, -70, -40, -36, 5.2, { style: 'hwrock' }),
    g(-14, -66, -6, -50, 4.8, { style: 'hwrock' }),
    // ---- F Schlosshügel, Felsen ringsum
    g(-22, -104, 14, -78, 6, { style: 'castle', walk: W }),
    g(-30, -120, 22, -104, 9.5, { style: 'hwrock', trees: 0.5 }),
    g(-30, -104, -22, -78, 7.2, { style: 'hwrock' }),
    g(14, -104, 22, -80, 7.2, { style: 'hwrock' }),
  ],

  // Zusätzlich begehbar: Stege zwischen den Inseln
  walk: [
    [-6, 12, -2, 26],          // A → B
    [-26, -2, -14, 2],         // B → C
    [8, -24, 12, -8],          // B → D
    [-14, -40, 0, -36],        // D → E
    [-20, -78, -16, -66],      // E → F
  ],

  paths: [
    [[-2, 44], [-2, 34], [-4, 30], [-4, 26]],
    [[-2, 38], [-10, 38.6], [-16, 38.6]],
    [[-2, 36], [6, 37.2], [12, 37.6], [16, 37.2], [18, 35.6]],
    [[-4, 12], [-4, 4], [-2, 0], [-2, -1.0]],
    [[-4, 4], [-10, 2], [-14, 0]],
    [[-4, 4], [4, -2], [10, -5], [10, -8]],
    [[-26, 0], [-30, 3.6], [-35, 3.6]],
    [[10, -24], [12, -28], [16, -30.0], [16, -32.9]],
    [[12, -28], [4, -34], [2, -38], [0, -38]],
    [[-14, -38], [-20, -42], [-26, -48.4], [-27, -50.9]],
    [[-20, -42], [-17.4, -50], [-17.4, -60], [-18, -66]],
    [[-18, -78], [-14, -84], [-6, -87], [-4, -88.4]],
  ],

  entrances: [
    { id: 'W1', kind: 'pipe', pos: [-16, 1, 36], decor: [-16, 1, 32.9], dress: 'halloween',
      pipe: [[0, 0, 0], [0, 3.5, 0], [-0.8, 5.6, 0.2], [-5, 6.8, 0.8], [-16, 7.4, 2.5], [-40, 7, 6], [-80, 5.5, 11], [-140, 4, 18], [-205, 1.5, 26]], pipeDetail: 'low',
      arriveCam: { up: 6, ahead: 6, drop: 2.5 } },
    { id: 'H-1', kind: 'pumpkinfield', pos: [18, 1, 33], decor: [18, 1.3, 27.6] },
    { id: 'H-2', kind: 'spookvillage', pos: [-2, 2, -3.6], decor: [-4, 2.3, -13.6] },
    { id: 'H-Kapitän', kind: 'pumpkinmaze', pos: [-35, 2, 1], decor: [-35, 2, -6.4], kruemel: [-31.2, 2, 1.6], disc: 'H-K' },
    { id: 'H-3', kind: 'foggraveyard', pos: [16, 3, -35.5], decor: [16, 3, -40.5], fence: [0.2, 31.8], ghost: [19.4, 3.15, -43] },
    { id: 'H-4', kind: 'witchtower', pos: [-27, 4, -53.5], decor: [-27, 4, -60], cauldron: [-20.6, 4, -57.4] },
    { id: 'H-Burg', kind: 'spookcastle', pos: [-4, 6, -91], decor: [-4, 6, -99.6], labelY: 2.8, disc: 'H-B' },
  ],

  gates: [
    { for: 'H-2', at: [-4, 19], axis: 'z' },
    { for: 'H-Kapitän', at: [-20, 0], axis: 'x' },
    { for: 'H-3', at: [10, -16], axis: 'z' },
    { for: 'H-4', at: [-7, -38], axis: 'x' },
    { for: 'H-Burg', at: [-18, -72], axis: 'z' },
  ],

  signs: [
    { pos: [-9.2, 1, 44.0], yaw: 0.2, text: 'Kürbis-\ninsel' },
  ],

  props: [
    // A Ankunftsbucht: Laternen am Weg, Kürbisgruppen, Spukbäume, Boot mit Laterne
    { kind: 'hwlantern', pos: [-6.4, 1, 30.4] }, { kind: 'hwlantern', pos: [-1.6, 1, 30.4], yaw: PI },
    { kind: 'hwlantern', pos: [5.2, 1, 35.0] }, { kind: 'hwlantern', pos: [-9.4, 1, 41.2] },
    { kind: 'pumpkins', pos: [-12.4, 1, 28.6], size: 1.0, face: true }, { kind: 'pumpkins', pos: [7.4, 1, 28.4], size: 0.9, yaw: -0.3 },
    { kind: 'pumpkin', pos: [2.6, 1, 44.4], size: 0.8, face: 2 }, { kind: 'pumpkin', pos: [-20.6, 1, 44.0], size: 0.7, face: 1 },
    { kind: 'hwtree', pos: [-21.6, 1, 28.6], size: 4.8, model: true, lanterns: 2 }, { kind: 'hwtree', pos: [8.6, 1, 44.2], size: 4.2 },
    { kind: 'toadstool', pos: [-18.6, 1, 28.2], solid: false }, { kind: 'candy', pos: [-6.2, 1, 44.4], size: 0.9 },
    { kind: 'hay', pos: [12.4, 1, 40.8], yaw: 0.3 }, { kind: 'pumpkin', pos: [13.6, 1, 41.0], size: 0.6, face: true },
    { kind: 'rowboat', pos: [-8, 0, 21], yaw: 0.6, solid: false }, { kind: 'hwrock', pos: [4, 0, 16.4], size: 1.4, solid: false },
    { kind: 'hwrock', pos: [-17, 0, 18], size: 1.8, solid: false },
    // Laternenkürbisse säumen den Weg, Laub, Süßigkeiten-Wagen
    { kind: 'hwlantern', pos: [-12.6, 1, 36.4] }, { kind: 'hwlantern', pos: [0.4, 1, 42.4], yaw: PI },
    { kind: 'pumpkin', pos: [-0.3, 1, 38.8], size: 0.55, face: 1 }, { kind: 'pumpkin', pos: [-3.7, 1, 35.6], size: 0.6, face: 2, yaw: 0.2 },
    { kind: 'pumpkin', pos: [10.2, 1, 35.6], size: 0.55, face: true, yaw: -0.2 }, { kind: 'pumpkin', pos: [-14.2, 1, 40.6], size: 0.6, face: 1 },
    { kind: 'leaves', pos: [-8.6, 1, 33.4], size: 1.1, solid: false, shadow: false }, { kind: 'leaves', pos: [3.4, 1, 31.4], size: 0.9, solid: false, shadow: false },
    { kind: 'leaves', pos: [-19.6, 1, 34.6], size: 1.0, solid: false, shadow: false }, { kind: 'leaves', pos: [14.6, 1, 32.4], size: 0.8, solid: false, shadow: false },
    { kind: 'candycart', pos: [6.4, 1, 42.4], yaw: -0.3 }, { kind: 'toadstool', pos: [-16.8, 1, 44.2], solid: false },
    { kind: 'grave', pos: [-22.4, 1, 39.2], size: 0.9, yaw: 0.4 }, { kind: 'cobweb', pos: [-21.6, 1.4, 29.2], size: 0.7, solid: false, shadow: false },
    // B Gruseldorf: Laternen, Bank-Kürbisse, Süßigkeiten
    { kind: 'hwlantern', pos: [-7.4, 2, 10.2] }, { kind: 'hwlantern', pos: [-0.6, 2, 10.2], yaw: PI },
    { kind: 'hwlantern', pos: [12.6, 2, -2], yaw: PI }, { kind: 'hwlantern', pos: [-12.6, 2, -3.2] },
    { kind: 'pumpkins', pos: [11.6, 2, 9.6], size: 0.8, face: true }, { kind: 'candy', pos: [-8.6, 2, 10.6], size: 1.0 },
    // Häuschen rings um den Platz (Fenster leuchten)
    { kind: 'hwhouse', pos: [-11.6, 2, 8.0], yaw: PI / 2, size: [3.2, 3], color: 0x9a7ab8, roof: 0x3a2a5a },
    { kind: 'hwhouse', pos: [-11.8, 2, -5.4], yaw: PI / 2, size: [3.0, 2.8], color: 0x6a9a9a, roof: 0x2e3e5a },
    { kind: 'hwhouse', pos: [11.6, 2, 3.2], yaw: -PI / 2, size: [3.2, 3], color: 0xc88a5a, roof: 0x4a2a4a },
    { kind: 'pumpkin', pos: [6.6, 2, 3.4], size: 0.7, face: 1 }, { kind: 'witchhat', pos: [-12.2, 2, 3.2], size: 0.9 },
    { kind: 'candycart', pos: [8.8, 2, 7.6], yaw: -0.5 }, { kind: 'leaves', pos: [5.6, 2, 9.6], size: 0.9, solid: false, shadow: false },
    { kind: 'leaves', pos: [-9.4, 2, -5.8], size: 1.0, solid: false, shadow: false }, { kind: 'pumpkin', pos: [-5.6, 2, -6.6], size: 0.6, face: 2 },
    { kind: 'pumpkin', pos: [1.8, 2, -6.8], size: 0.55, face: 1 }, { kind: 'hay', pos: [-8.6, 2, -6.8], yaw: 1.2 },
    // C Labyrinth-Wiese
    { kind: 'hwlantern', pos: [-27.4, 2, 6.6], yaw: PI }, { kind: 'pumpkins', pos: [-42.4, 2, 6.0], size: 0.9, face: true },
    { kind: 'toadstool', pos: [-42.6, 2, -1.4], solid: false }, { kind: 'pumpkin', pos: [-28.2, 2, -8.4], size: 0.6, face: 2 },
    { kind: 'leaves', pos: [-41.4, 2, 2.6], size: 1.0, solid: false, shadow: false }, { kind: 'pumpkin', pos: [-38.4, 2, 4.6], size: 0.5, face: 1 },
    // D Friedhofsvorplatz
    { kind: 'hwlantern', pos: [7.6, 3, -26.4] }, { kind: 'hwlantern', pos: [24.6, 3, -26.4], yaw: PI },
    { kind: 'hwtree', pos: [29.6, 3, -27.0], size: 4.4 }, { kind: 'grave', pos: [1.6, 3, -30.8], size: 0.9 },
    { kind: 'pumpkins', pos: [26.4, 3, -37.6], size: 0.8, face: true }, { kind: 'candles', pos: [2.6, 3, -30.2], solid: false },
    { kind: 'leaves', pos: [22.6, 3, -30.4], size: 1.0, solid: false, shadow: false }, { kind: 'pumpkin', pos: [13.2, 3, -31.2], size: 0.55, face: 2 },
    { kind: 'pumpkin', pos: [19.0, 3, -31.4], size: 0.5, face: 1 }, { kind: 'toadstool', pos: [5.2, 3, -26.6], solid: false },
    // E Hexenmoor
    { kind: 'hwlantern', pos: [-15.4, 4, -41.6], yaw: PI }, { kind: 'hwlantern', pos: [-21.6, 4, -63.6] },
    { kind: 'hwtree', pos: [-38.0, 4, -42.4], size: 4.6 }, { kind: 'hwtree', pos: [-37.4, 4, -63.4], size: 4.2 },
    { kind: 'toadstool', pos: [-33.4, 4, -43.0], solid: false }, { kind: 'toadstool', pos: [-16.4, 4, -60.4], solid: false },
    { kind: 'pumpkins', pos: [-35.8, 4, -48.4], size: 0.8, face: true }, { kind: 'witchhat', pos: [-31.6, 4, -44.2], size: 0.8 },
    { kind: 'heather', pos: [-36.4, 4, -53.6], solid: false }, { kind: 'heather', pos: [-33.2, 4, -59.4], size: 1.2, solid: false },
    { kind: 'heather', pos: [-16.6, 4, -48.2], solid: false }, { kind: 'heather', pos: [-38.0, 4, -58.8], size: 0.9, solid: false },
    { kind: 'heather', pos: [-25.4, 4, -39.2], size: 1.1, solid: false }, { kind: 'heather', pos: [-31.0, 4, -64.0], solid: false },
    { kind: 'heather', pos: [-15.6, 4, -64.2], size: 1.2, solid: false }, { kind: 'pumpkin', pos: [-29.6, 4, -50.0], size: 0.5, face: 2 },
    { kind: 'toadstool', pos: [-36.6, 4, -38.6], solid: false }, { kind: 'heather', pos: [-38.4, 4, -45.6], size: 1.0, solid: false },
    { kind: 'heather', pos: [-21.4, 4, -50.8], size: 0.9, solid: false }, { kind: 'heather', pos: [-33.6, 4, -48.6], size: 1.1, solid: false },
    { kind: 'leaves', pos: [-15.8, 4, -54.6], size: 0.9, solid: false, shadow: false }, { kind: 'candles', pos: [-23.4, 4, -62.8], solid: false },
    { kind: 'grave', pos: [-38.2, 4, -51.0], size: 0.8, yaw: 0.5 }, { kind: 'cobweb', pos: [-37.6, 5.2, -62.6], size: 0.8, solid: false, shadow: false },
    // F Schlosshügel
    { kind: 'hwlantern', pos: [-20.6, 6, -80.4] }, { kind: 'hwlantern', pos: [-15.4, 6, -80.4], yaw: PI },
    { kind: 'pumpkins', pos: [11.4, 6, -80.8], size: 1.0, face: true }, { kind: 'grave', pos: [-19.8, 6, -101.4], size: 1.0 },
    { kind: 'hwtree', pos: [10.6, 6, -101.4], size: 4.6, model: true }, { kind: 'candy', pos: [-19.4, 6, -86.4], size: 1.0 },
    { kind: 'pumpkin', pos: [-6.8, 6, -86.6], size: 0.55, face: 1 }, { kind: 'pumpkin', pos: [-1.2, 6, -86.8], size: 0.5, face: 2 },
    { kind: 'hwlantern', pos: [6.4, 6, -86.0], yaw: PI }, { kind: 'leaves', pos: [8.6, 6, -92.6], size: 1.0, solid: false, shadow: false },
    { kind: 'grave', pos: [-20.0, 6, -91.0], size: 0.9, yaw: 0.3 }, { kind: 'grave', pos: [-19.6, 6, -96.0], size: 1.0, yaw: 0.5 },
    { kind: 'hwtree', pos: [-20.2, 6, -84.0], size: 4.2 }, { kind: 'pumpkins', pos: [-12.6, 6, -80.6], size: 0.8, face: true },
    { kind: 'toadstool', pos: [12.0, 6, -89.4], solid: false }, { kind: 'witchhat', pos: [11.4, 6, -96.4], size: 0.8 },
    { kind: 'leaves', pos: [-12.4, 6, -92.4], size: 1.1, solid: false, shadow: false }, { kind: 'candles', pos: [-19.0, 6, -93.4], solid: false },
  ],

  segments: [
    { type: 'hwbridge', from: [-4, 1, 26], to: [-4, 2, 12], width: 4 },
    { type: 'hwbridge', from: [-14, 2, 0], to: [-26, 2, 0], width: 4 },
    { type: 'hwbridge', from: [10, 2, -8], to: [10, 3, -24], width: 4 },
    { type: 'hwbridge', from: [0, 3, -38], to: [-14, 4, -38], width: 4 },
    { type: 'hwbridge', from: [-18, 4, -66], to: [-18, 6, -78], width: 4 },
  ],
};
