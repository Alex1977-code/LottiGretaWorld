// Thema `river` (Welt 1, Level 1-4 „Pflaumes Wildwasserfahrt“): tropischer Fluss auf einem Dschungel-Hochplateau –
// warmes Sonnenlicht, türkisblauer Himmel, leichter Dunst über dem Wasser, Hügel des Tieflands am Horizont.
// Gelände-Farben für Inseln/Brücken/Steine dieses Levels (Holz warm braun statt weiß). Wasser, Ufer und
// Dschungel baut der Baustein `river` (blocks/types/river.js) mit eigenen Farben aus `jungle`.

export const RIVER_THEME = {
  label: 'Dschungelfluss',
  sky: [[1, 0x1f86d8], [0.45, 0x3fb2f2], [0.15, 0x86dcf6], [0.03, 0xd2f6ee], [0, 0xeafcf0], [-0.1, 0xb8e6cf], [-1, 0x8cc7a8]],
  background: 0xc7efe4,
  fog: { color: 0xc9eee2, near: 60, far: 240 },
  hemi: { sky: 0xd4f4ff, ground: 0x5f9a3c, intensity: 1.25 },
  sun: { color: 0xfff0c8, intensity: 2.8, dir: [-0.5, 1, 0.45] },
  shadows: true,
  sunDisc: true,
  clouds: true,
  backdrop: 'hills',
  ground: null,                 // Tiefland baut der Baustein river (lowland)
  // Gelände
  grassTop: 0x5fcf3c, grassTop2: 0x52bf33, grassRim: 0x93ea62, grassSide: 0x3f9c2c,
  dirt: 0xb07a48, dirtDeep: 0x7e5130, rock: 0x8c8378, rockDeep: 0x5f574f,
  checker: false,
  stone: 0xd9d2c4, stoneDark: 0xa99f8d,
  wood: 0xd99b5c, woodDark: 0x8f5a30,           // Holzsteg
  climb: 0xf0d9a8, climbDark: 0xc9a46a,
  water: 0x2fc6e0, waterDeep: 0x1384b8,
  lava: 0xff6a1a,
  lights: [],
  // Fluss und Dschungel (nur Baustein river)
  jungle: {
    water: 0x1fa6d6, waterDeep: 0x137fb6, waterEdge: 0x6fe0e6, foam: 0xf4ffff,
    bankRock: 0x7a6656, bankRockDark: 0x54463c, moss: 0x4f9f34, lip: 0x6cd43f, floor: 0x4caa34, floor2: 0x3e9a2c,
    skirt: 0x8c6a4a, skirtDark: 0x5c4532, lowland: 0x3f9a34,
    palmTrunk: 0xb0844e, palmTrunkDark: 0x7d5a32, frond: 0x47b83a, frondLight: 0x8ae05a, frondDark: 0x2d7e2a,
    canopy: [[0x6fd04a, 0x3a9a32, 0x226a22], [0x86dc52, 0x48aa36, 0x2a7426], [0x5cc246, 0x2f8a2e, 0x1d5a1e]],
    blooms: [0xff4f7a, 0xff9a2e, 0xffd23a, 0xff6ad5, 0xffffff],
  },
};
