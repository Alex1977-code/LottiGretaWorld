// Thema `highway` (1-Burg, Autobahn am Abend): Abendhimmel (Violett → Orange am Horizont), tief stehende
// Sonne, warmes Gegenlicht, Dunst; tief unten die Stadtebene. Die Stadtsilhouette in der Ferne baut der
// Baustein `skyline` (blocks/types/highway.js), Fahrbahn, Leitplanken, Laternen und Schilder `road`/`bossroad`.
// Registriert in view/themes.js (eine Zeile). Felder wie THEMES.grass (Bausteine lesen Gelände-Farben), dazu
// Fahrbahn-Farben für blocks/types/highway.js.

export const HIGHWAY = {
  label: 'Autobahn',
  sky: [[1, 0x1f1a46], [0.55, 0x3b2f73], [0.28, 0x7a4a8e], [0.12, 0xd9707a], [0.04, 0xff9f5e], [0, 0xffc47a], [-0.08, 0xc77a6e], [-1, 0x3a2a48]],
  background: 0xe0906e,
  fog: { color: 0xc98a86, near: 80, far: 300 },
  hemi: { sky: 0xffdcc0, ground: 0x6a5e88, intensity: 1.65 },
  sun: { color: 0xffc890, intensity: 2.9, dir: [-0.55, 0.95, 0.45] },
  shadows: true,
  sunDisc: true,
  clouds: true,
  backdrop: 'none',
  ground: { color: 0x3a2f4e, y: -34 },
  // Gelände (Mittelstreifen, Böschungen, Pfeiler)
  grassTop: 0x6fbf4a, grassTop2: 0x62b143, grassRim: 0x9ee070, grassSide: 0x4b9a3a,
  dirt: 0xa7a3b0, dirtDeep: 0x6f6a7c, rock: 0x8f8a96, rockDeep: 0x55506a,
  checker: false,
  stone: 0xe4e2ea, stoneDark: 0xaeaabc,
  wood: 0xf6f4ef, woodDark: 0xc9ccd6,
  climb: 0xffe6b8, climbDark: 0xd9a86a,
  water: 0x3fb4ff, waterDeep: 0x1c6fd1,
  lava: 0xff6a1a,
  lights: [],
  // Fahrbahn
  asphalt: 0x5a586c, asphaltLight: 0x67657a, marking: 0xf5f3ee, markingYellow: 0xffcf3a,
  concrete: 0xc9c5d2, concreteDark: 0x8f8a9e, curb: 0xe6e2ea,
  rail: 0xdfe4ee, railPost: 0x6a7080, reflector: 0xff3a2a,
  lampLight: 0xffe2a0, signGreen: 0x1f8a4c, signBlue: 0x2a5fc8,
  city: [0x2c2448, 0x3a2f5c, 0x47386a, 0x332a52], cityWindow: 0xffd88a,
};
