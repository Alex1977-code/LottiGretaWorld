// Thema `circus` (Level 1-5, Zirkuszelt): Nachthimmel-Dunkel im Zelt, warmes Licht von oben (großer
// Deckenscheinwerfer als „Sonne“), Verfolger-Scheinwerfer über der Heldin, keine Wolken/Hügel. Die Zeltbahnen,
// Manegen, Ränge, Masten, Lichterketten und Scheinwerferkegel baut das Level selbst (Baustein deco_w1b,
// Arten tent/stage/spotlight/bunting …). themes.js übernimmt diese Werte über `{ ...GRASS, ...CIRCUS }`.
// Gelände-Farben: „Gras“ = roter Teppich mit Goldkante, „Erde“ = dunkles Holz.

export const CIRCUS = {
  label: 'Zirkus',
  sky: [[1, 0x120a24], [0.4, 0x1c0f34], [0.1, 0x2c1238], [0, 0x381430], [-0.2, 0x26101e], [-1, 0x12080e]],
  background: 0x1e0e26,
  fog: { color: 0x241028, near: 60, far: 210 },
  hemi: { sky: 0xffe6c8, ground: 0x6a2a4e, intensity: 1.25 },
  sun: { color: 0xfff1dc, intensity: 2.5, dir: [0.18, 1, 0.42] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'none',
  ground: null,
  grassTop: 0xd23440, grassTop2: 0xc22c3a, grassRim: 0xffc94a, grassSide: 0xa61f30,
  dirt: 0x6e2c3c, dirtDeep: 0x3c1626, rock: 0x8a6a8a, rockDeep: 0x4a2a44,
  stone: 0xf6eefc, stoneDark: 0xbfaed6,
  wood: 0xfff4e0, woodDark: 0xd9b98e,
  climb: 0xf6e0b0, climbDark: 0xc9a46a,
  water: 0x3fb4ff, waterDeep: 0x1c6fd1,
  lava: 0xff6a1a,
  lights: [],
  // Verfolger-Scheinwerfer: warmes Punktlicht über der Heldin (CourseView: 3,2 m darüber, 1,4 m davor)
  playerLight: { color: 0xfff0d0, intensity: 16, distance: 11 },
};
