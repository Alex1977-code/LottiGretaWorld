// Thema `house` (Welt 2: 2-Haus Prüfungs-Haus, 5 Räume à 10 s): Innenraum – kein Himmel, dunkles Violett hinter den
// Räumen, warmes Deckenlicht, Holzdielen als Boden („Gras“), Tapeten-Violett als Wandkörper, Licht an der Figur.
// Räume/Türen bauen room, tuer (entities/kinds/w2_gimmicks.js) usw. Registriert in view/themes.js (eine Zeile).

export const HOUSE_THEME = {
  label: 'Prüfungs-Haus',
  sky: [[1, 0x120a20], [0, 0x24163a], [-1, 0x0c0816]],
  background: 0x1a1028,
  fog: { color: 0x1a1028, near: 34, far: 130 },
  hemi: { sky: 0xfff0e0, ground: 0x5a3a6a, intensity: 1.15 },
  sun: { color: 0xfff4e0, intensity: 2.1, dir: [0.2, 1, 0.5] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'none',
  ground: null,
  grassTop: 0xd8a868, grassTop2: 0xc89858, grassRim: 0xf0c890, grassSide: 0x9a6a3a,
  dirt: 0x8a5a7a, dirtDeep: 0x5a3a52, rock: 0x8a7a92, rockDeep: 0x5a4a62,
  checker: false,
  stone: 0xf0e6f4, stoneDark: 0xb8a8c4,
  wood: 0xe0b078, woodDark: 0x8a5a32,
  climb: 0xf0d9a8, climbDark: 0xc9a46a,
  water: 0x3fb4ff, waterDeep: 0x1c6fd1,
  lava: 0xff6a1a,
  lights: [],
  playerLight: { color: 0xfff0d0, intensity: 9, distance: 12 },
};
