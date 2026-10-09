// Thema `diorama` (Welt 1, Level 1-Schatz „Pflaume und der Wolkenwürfel“): ein Graswürfel schwebt hoch im
// Himmel, weiche Wolken treiben darunter. Heller, freundlicher Himmel ringsum (kein Boden, keine Hügel), Sonne
// schräg von vorn-links, damit die Würfelseiten unterschiedlich hell sind und der Bau gut lesbar bleibt.

export const DIORAMA_THEME = {
  label: 'Wolkenwürfel',
  sky: [[1, 0x3a8ff0], [0.5, 0x5fb2fb], [0.2, 0x9fd6ff], [0.05, 0xd6efff], [0, 0xeaf7ff], [-0.2, 0xd9ecfb], [-1, 0xbcd8f2]],
  background: 0xd4ecfc,
  fog: { color: 0xdcefff, near: 80, far: 300 },
  hemi: { sky: 0xd8eeff, ground: 0x9cc48a, intensity: 1.35 },
  sun: { color: 0xfff2d8, intensity: 2.6, dir: [-0.55, 1, 0.6] },
  shadows: true,
  sunDisc: true,
  clouds: true,
  backdrop: 'none',
  ground: null,
  // Gelände
  grassTop: 0x74dc4a, grassTop2: 0x68d042, grassRim: 0xaaf274, grassSide: 0x4cb436,
  dirt: 0xc98a52, dirtDeep: 0x9a6236, rock: 0x948e9a, rockDeep: 0x625d6a,
  checker: false,
  stone: 0xece6da, stoneDark: 0xbdb3a2,
  wood: 0xe2a866, woodDark: 0x9a6338,
  climb: 0xf0d9a8, climbDark: 0xc9a46a,
  water: 0x3fb4ff, waterDeep: 0x1c6fd1,
  lava: 0xff6a1a,
  lights: [],
};
