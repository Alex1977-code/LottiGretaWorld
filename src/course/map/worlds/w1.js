// Kurs-Weltkarte Welt 1 – „Grüne Blockinsel“ (Bauplan: Weltkarte & Weltstruktur, Welt 1).
// Format: docs/KURS-ARCHITEKTUR.md, „Präzisierung (Weltkarte)“. Koordinaten in Metern, Y oben, −Z = nach hinten
// (die Kamera blickt von Süden nach Norden): Der Weg führt vom Startstrand im Süden über die Felsenwiese (1-2), die
// Kreuzung (Abzweig Rammbock-Blockade 1-A), das Bohnenberg-Plateau (1-3, Abzweig Schatz-Diorama), die Brücke über die
// Bucht zum Flussufer (1-4), die Zirkuswiese (1-5) hinauf zur Burg von Baron Brummbär und zur Glasröhre nach Welt 2.
//
// Bereiche (begehbar, Grashöhe):            Eingänge:
//   A  Startstrand mit Teich        y 1        1-1  Wiesentor          (2, 1, 31)
//   N  Beerenhaus-Nische            y 1        1-2  Höhle im Felsen    (−34, 1, 3.5)
//   B  Felsenwiese                  y 1        1-A  Rammbock-Bullen    (−47 … −39, 1, −19)
//   J  Kreuzung                     y 1        1-3  Bohnenranke        (−1, 4, −26)
//   AA Festungsplatz (1-A)          y 1        1-Schatz Diorama        (1, 4, 2)
//   C  Bohnenberg-Plateau           y 4        1-4  Steg am Fluss      (31, 1, −14)
//   S  Schatz-Plateau               y 4        1-5  Zirkuszelt         (29, 1, −54)
//   D  Flussufer                    y 1        1-Burg Festung          (−18, 5, −61.5)
//   E  Zirkuswiese                  y 1        W2   Glasröhre (bald)   (−10, 5, −88)
//   F  Burgberg                     y 5
//   P  Röhrenplatz                  y 5

const PI = Math.PI;
const g = (x0, z0, x1, z1, top, opts = {}) => ({ rect: [x0, z0, x1, z1], top, ...opts });
const W = true;

export const MAP = {
  id: 'karte-1',
  world: 1,
  title: 'Grüne Blockinsel',
  archetype: 'map',
  theme: 'map',
  music: 'course_map',
  base: -3,                       // Unterkante aller Geländeblöcke (Meer bei y 0)
  sea: 0,
  spawn: { pos: [2, 1, 40.5], yaw: PI / 2 },
  camera: [{ from: 200, to: -300, pitch: 50, dist: 16, fov: 40, ahead: 3.6, lead: 0.7, height: 1.0 }],

  // Freischaltung (Vertrag: Welt 1 – Level-Liste und Freischaltung). stars/stamp = mögliche Sammelziele.
  levels: [
    { id: '1-1', stars: 3, stamp: true },
    { id: '1-2', after: '1-1', stars: 3, stamp: true },
    { id: '1-A', after: '1-2', stars: 1 },
    { id: '1-3', after: '1-2', stars: 3, stamp: true },
    { id: '1-Schatz', after: '1-3', stars: 5 },
    { id: '1-4', after: '1-3', stars: 3, stamp: true },
    { id: '1-5', after: '1-4', stars: 3, stamp: true },
    { id: '1-Burg', after: '1-5', minStars: 10, stars: 3, stamp: true },
    { id: 'W2', after: '1-Burg', world: 2, stars: 0, label: 'Welt 2', next: 2 },
  ],

  // Gelände: Blöcke mit Grasdecke (walk: begehbar). style: 'grass' | 'rock' | 'meadow' (Blumenwiese, nicht begehbar)
  ground: [
    // A – Startstrand (um den Teich herum gestückelt)
    g(-12, 22, 6, 46, 1, { walk: W }), g(13, 22, 16, 46, 1, { walk: W }), g(6, 40, 13, 46, 1, { walk: W }), g(6, 22, 13, 33, 1, { walk: W }),
    g(6, 33, 13, 40, -0.45, { style: 'pond' }),
    // Hecke zwischen Strand und Beerenhaus-Nische, Nische und Durchschlupf
    g(-14, 22, -12, 42, 1),
    g(-26, 34, -14, 46, 1, { walk: W }), g(-14, 42, -12, 46, 1, { walk: W }),
    // Weg A → B
    g(-8, 18, -4, 22, 1, { walk: W }), g(-18, 14, -4, 18, 1, { walk: W }),
    // B – Felsenwiese mit Höhlenfelsen
    g(-40, 0, -18, 18, 1, { walk: W }),
    g(-40, -10, -28, 0, 7, { style: 'rock' }),
    // Kreuzung und Festungsplatz (1-A)
    g(-22, -12, -18, 0, 1, { walk: W }), g(-26, -22, -14, -12, 1, { walk: W }),
    g(-36, -19, -26, -15, 1, { walk: W }), g(-50, -28, -36, -10, 1, { walk: W }),
    // Treppe zum Plateau (Unterbau) und Bohnenberg-Plateau
    g(-14, -19, -12, -15, 1, { walk: W }), g(-12, -19, -6, -15, 1),
    g(-6, -34, 8, -12, 4, { walk: W }),
    // Schatz-Plateau
    g(-2, -12, 2, -4, 4, { walk: W }), g(-6, -4, 8, 8, 4, { walk: W }),
    // Brückenkopf, Flussufer, Zirkuswiese
    g(8, -24, 10, -20, 4, { walk: W }),
    g(24, -36, 40, -8, 1, { walk: W }),
    g(32, -48, 36, -36, 1, { walk: W }), g(16, -66, 42, -48, 1, { walk: W }),
    // Weg zur Burg, Treppen-Unterbau, Burgberg, Röhrenplatz
    g(0, -60, 16, -56, 1, { walk: W }), g(-6, -60, 0, -56, 1),
    g(-24, -76, -6, -50, 5, { walk: W }),
    g(-12, -84, -8, -76, 5, { walk: W }), g(-18, -94, -2, -84, 5, { walk: W }),
    // Deko-Gelände (nicht begehbar): Hügel, Wald, Hochland mit Wasserfall, Blumenwiesen
    g(-4, 8, 8, 22, 2.5), g(8, -8, 24, 20, 3), g(24, -8, 40, 12, 3),
    g(-30, -40, -6, -22, 6), g(-6, -48, 10, -34, 8), g(10, -46, 24, -36, 9, { style: 'rock' }),
    g(-6, -56, 16, -48, 1, { style: 'meadow' }), g(-36, -40, -30, -28, 3.5),
    g(-18, -12, -6, 14, 4), g(-6, 8, -4, 14, 4), g(-50, -10, -40, 0, 5, { style: 'rock' }),
    // Sandstrände (nicht begehbar, ohne Hecke/Zaun am Rand)
    g(-12, 46, 16, 50, 0.45, { style: 'sand', noEdge: true }), g(-40, 18, -26, 34, 0.45, { style: 'sand', noEdge: true }),
    g(40, -48, 46, 12, 0.45, { style: 'sand', noEdge: true }), g(42, -66, 47, -48, 0.45, { style: 'sand', noEdge: true }),
    g(-30, -76, -24, -50, 0.45, { style: 'sand', noEdge: true }),
  ],

  // Zusätzlich begehbar (ohne eigenen Geländeblock): Strand inkl. Teich, Treppen, Brücke, Steg
  walk: [
    [6, 33, 13, 40],
    [-12, -19, -6, -15],
    [10, -24, 24, -20],
    [19, -16, 24, -12],
    [-6, -60, 0, -56],
  ],

  // Wege aus hellen Platten (Polylinien [x, z], 2 m breit; auf Treppen/Brücken entfallen sie)
  paths: [
    [[2, 44], [2, 31]],
    [[2, 31], [2, 25], [-6, 25], [-6, 16], [-34, 16], [-34, 3.5]],
    [[-20, 16], [-20, -17]],
    [[-20, -17], [-43, -17]],
    [[-20, -17], [2, -17]],
    [[-1, -17], [-1, -26]],
    [[0, -17], [0, 2]],
    [[2, -17], [4, -17], [4, -22], [31, -22], [31, -14]],
    [[31, -22], [34, -22], [34, -54], [29, -54]],
    [[29, -54], [29, -58], [-18, -58], [-18, -61.5]],
    [[-10, -58], [-10, -87]],
  ],

  // Eingänge: kind wählt die Kulisse; exit = Rückkehrpunkt (Standard 2,6 m vor dem Podest Richtung Kamera)
  entrances: [
    { id: '1-1', kind: 'meadow', pos: [2, 1, 31] },
    { id: '1-2', kind: 'cave', pos: [-34, 1, 3.5], decor: [-34, 1, 0] },
    { id: '1-A', kind: 'arena', pos: [-43, 1, -19.5], exit: [-38, 1, -17],
      cage: [[-49.6, -27.6, -49.6, -10.6], [-49.6, -27.6, -36.6, -27.6]] },
    { id: '1-3', kind: 'beanstalk', pos: [-1, 4, -26], decor: [2.2, 4, -28.6] },
    { id: '1-Schatz', kind: 'diorama', pos: [1, 4, 2], decor: [1, 4, -1.6] },
    { id: '1-4', kind: 'river', pos: [31, 1, -14], decor: [16.6, 0.02, -14], waterfall: { x0: 13, x1: 19, z: -36, top: 9, bottom: 0 } },
    { id: '1-5', kind: 'circus', pos: [29, 1, -54], decor: [29, 1, -60.4], exit: [29, 1, -51] },
    { id: '1-Burg', kind: 'castle', pos: [-18, 5, -61.5], decor: [-18, 5, -67], exit: [-18, 5, -58.6] },
    { id: 'W2', kind: 'pipe', pos: [-10, 5, -88.5], decor: [-10, 5, -91.6], exit: [-10, 5, -85.5],
      pipe: [[0, 0, 0], [0, 3.5, 0], [0.8, 5.6, -0.3], [5, 6.8, -1.2], [16, 7, -3.5], [40, 6.2, -9], [80, 5, -18]] },
  ],

  // Schranken: sperren den Weg zu `for`, bis er frei ist. at = [x, z], axis = Laufrichtung des Wegs.
  gates: [
    { for: '1-2', at: [-6, 20], axis: 'z' },
    { for: '1-A', at: [-31, -17], axis: 'x' },
    { for: '1-3', at: [-13, -17], axis: 'x' },
    { for: '1-Schatz', at: [0, -8], axis: 'z' },
    { for: '1-4', at: [9, -22], axis: 'x' },
    { for: '1-5', at: [34, -42], axis: 'z' },
    { for: '1-Burg', at: [10, -58], axis: 'x' },
    { for: 'W2', at: [-10, -80], axis: 'z' },
  ],

  // Wandernde Gegnergruppe: Berührung startet das Level (wenn frei); nach dem Sieg verschwindet sie.
  roamers: [
    { level: '1-A', model: 'rammbock_bulle', count: 2, from: [-47.5, 1, -19.5], to: [-38.5, 1, -19.5], speed: 2.2 },
  ],

  // Beerenhaus (versteckt in der Nische hinter der Hecke): einmal je Besuch ein Gratis-Power-up
  houses: [
    { kind: 'beeren', pos: [-21, 1, 38.2], yaw: -PI / 2, item: [-21, 1, 42.6], items: ['krallen', 'funken'] },
  ],

  // Holzschilder (Text auf der Tafel, Vorderseite nach +Z gedreht um yaw)
  signs: [
    { pos: [-2.4, 1, 42.8], yaw: 0, text: 'Welt 1\nBlockinsel' },
    { pos: [-17.2, 1, 44.6], yaw: 0.5, text: 'Beerenhaus' },
  ],

  // Standard-Bausteine (Wasser, Brücken, Treppen, Deko)
  segments: [
    { type: 'water', pos: [9.5, -0.45, 36.5], size: [7, 1.2, 7] },
    { type: 'bridge', from: [5, 1, 36.5], to: [14, 1, 36.5], width: 2.4 },
    { type: 'stairs', pos: [-12, 1, -17], dir: '+x', steps: 11, rise: 3 / 11, run: 6 / 11, width: 4 },
    { type: 'bridge', from: [10, 4, -22], to: [24, 1, -22], width: 4 },
    { type: 'platform', color: 0xc98a52, pos: [21.5, 0.55, -14], size: [5, 0.45, 4] },
    { type: 'stairs', pos: [0, 1, -58], dir: '-x', steps: 14, rise: 4 / 14, run: 6 / 14, width: 4 },
    // Spielzeug-Blöcke zum Hüpfen am Startstrand und auf dem Plateau
    { type: 'platform', pos: [-9, 1, 31], size: [2, 1, 2], color: 'red' },
    { type: 'platform', pos: [-9, 1, 28.5], size: [2, 2, 2], color: 'yellow' },
    { type: 'platform', pos: [-6.6, 1, 28.5], size: [1.6, 3, 1.6], color: 'blue' },
    { type: 'platform', pos: [-4, 4, -31], size: [2, 1, 2], color: 'orange' },
    { type: 'platform', pos: [-4, 4, -28.6], size: [2, 2, 2], color: 'purple' },
    { type: 'deco', items: [
      // Startstrand
      { kind: 'tree', pos: [-9.5, 1, 25], size: 4.6 }, { kind: 'tree', pos: [14.2, 1, 24.5], size: 4.2, color: 'green' },
      { kind: 'bush', pos: [-10, 1, 44], size: 0.8 }, { kind: 'bush', pos: [14.5, 1, 44.5], size: 0.7 },
      { kind: 'flowers', pos: [-5, 1, 40], size: [4, 3], n: 8 }, { kind: 'flowers', pos: [8, 1, 27], size: [4, 3], n: 8 },
      { kind: 'flowers', pos: [-6, 1, 31], size: [3, 3], n: 8 },
      { kind: 'rock', pos: [12, 1, 30], size: 0.5 }, { kind: 'fence', from: [-11.5, 1, 46], to: [-4, 1, 46] },
      { kind: 'fence', from: [8, 1, 46], to: [15.5, 1, 46] },
      // Nische
      { kind: 'tree', pos: [-24.5, 1, 35.5], size: 5.2, color: 'green' }, { kind: 'flowers', pos: [-17, 1, 44], size: [3, 2], n: 8 },
      { kind: 'bush', pos: [-25, 1, 45], size: 0.7 },
      // Felsenwiese
      { kind: 'tree', pos: [-38.5, 1, 16.5], size: 5 }, { kind: 'tree', pos: [-26, 1, 9], size: 4.4 },
      { kind: 'bush', pos: [-38.5, 1, 8], size: 0.8 }, { kind: 'flowers', pos: [-28, 1, 15], size: [4, 2], n: 8 },
      { kind: 'rock', pos: [-29.5, 1, 1.2], size: 0.7 }, { kind: 'rock', pos: [-38.6, 1, 1.4], size: 0.9 },
      // Kreuzung / Festungsplatz
      { kind: 'tree', pos: [-15, 1, -13], size: 4.2, color: 'green' }, { kind: 'flowers', pos: [-24.5, 1, -20.5], size: [2, 2], n: 8 },
      // Plateau
      { kind: 'tree', pos: [6.5, 4, -32.5], size: 4.6 }, { kind: 'flowers', pos: [5, 4, -14], size: [3, 2], n: 8 },
      { kind: 'bush', pos: [-5, 4, -13], size: 0.7 },
      // Schatz-Plateau
      { kind: 'tree', pos: [-4.8, 4, 6.8], size: 4.2, color: 'green' }, { kind: 'flowers', pos: [5.5, 4, 6], size: [3, 2.5], n: 8 },
      // Flussufer
      { kind: 'tree', pos: [38.5, 1, -9.5], size: 4.8 }, { kind: 'tree', pos: [38.5, 1, -34.5], size: 4.6, color: 'green' },
      { kind: 'flowers', pos: [36, 1, -24], size: [3, 4], n: 8 }, { kind: 'bush', pos: [25, 1, -34.5], size: 0.8 },
      // Zirkuswiese
      { kind: 'tree', pos: [17.5, 1, -64.5], size: 5 }, { kind: 'tree', pos: [40.5, 1, -64.5], size: 4.6, color: 'green' },
      { kind: 'flowers', pos: [20, 1, -51], size: [3, 2], n: 8 }, { kind: 'flowers', pos: [38, 1, -51], size: [3, 2], n: 8 },
      // Burgberg
      { kind: 'rock', pos: [-22.5, 5, -52], size: 0.9 }, { kind: 'rock', pos: [-7.8, 5, -74], size: 0.8 },
      { kind: 'tree', pos: [-22.5, 5, -74.5], size: 4.2 },
    ] },
  ],
};
