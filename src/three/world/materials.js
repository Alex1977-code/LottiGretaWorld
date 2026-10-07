// Farbpalette und gemeinsame Materialien der 3D-Welt (Super Mario 3D World: kräftig, sauber,
// spielzeughaft matt). Farben als sRGB-Hex; die Geometrie-Helfer wandeln sie in lineare Vertexfarben.
// Fast alles teilt sich EIN Material mit Vertexfarben – so lassen sich Boden, Gras, Stege und Zier
// je Abschnitt zu einem einzigen Zeichenaufruf zusammenfassen.

import * as THREE from 'three';

export const PAL = {
  // Gras und Wiese
  grassLight: 0xb4fb78, grassTop: 0x72dd47, grassMid: 0x5fd13f, grassSide: 0x43a833, grassDark: 0x2f7d26,
  meadow: 0x6ccb4c,
  // Erde, Höhle, Fels
  dirt: 0xcf8a4a, dirtDeep: 0x9a6232, cave: 0x8a6a57, caveDeep: 0x55413a, caveTop: 0x5e4a3d, ceiling: 0x4e352a,
  rock: 0x6a6068, rockDeep: 0x3d3741, wall: 0x3b2b23,
  // Steinblöcke
  stoneLight: 0xeceef3, stoneMid: 0xbfc1cc, stoneDark: 0x80848f, stoneCrack: 0x4d5160, moss: 0x86de5f, mossDark: 0x3f9433,
  // Holz
  woodTop: 0xf3c98c, woodMid: 0xd9a060, woodDeep: 0x925c2c, woodSeam: 0x7d4d22,
  // Zier
  stem: 0x3f9a2a, stemLight: 0xfff3e0, stemDark: 0xd6b58f, root: 0x5e3b22, rootTip: 0x9a6a40,
  petalWhite: [0xffffff, 0xcfd3ec], petalRed: [0xff6a5a, 0xb3221a], petalYellow: [0xffe066, 0xc98700], petalPink: [0xffa6d6, 0xd45a9a],
  center: 0xffc21a, centerWhite: 0xfff6e0,
  capRed: 0xff5244, capRedDark: 0xb3221a, capOrange: 0xff9440, capOrangeDark: 0xc43f1b, dot: 0xfff8f0,
  pebble: 0xb9bbc6, pebbleDark: 0x6f737f,
  crystal: [0xa8f7ff, 0xffb3f3, 0xf0fcff],
  // Himmel, Sonne, Nebel
  skyStops: [[1, 0x2b8de8], [0.45, 0x47aefb], [0.15, 0x8cd3ff], [0.03, 0xcbeeff], [0, 0xe6f7ff], [-0.08, 0xc6e0f2], [-1, 0xa6c6dc]],
  horizon: 0xcbe9fb, fog: 0xd3ecfb, sun: 0xfff7d2,
  // Hintergrund
  hillNearTop: 0x93e46a, hillNearBase: 0x4fa842, hillMidTop: 0xa5dc8e, hillMidBase: 0x6fb467,
  hillFarTop: 0xbbe2b4, hillFarBase: 0x93c594, mountain: 0xaac4e8, mountainSnow: 0xf1f6fd,
  trunk: 0x8a5a36, trunkDark: 0x5c3a22,
  crowns: [[0xffcf7a, 0xf58f3a, 0xc45f22], [0xffa38a, 0xef5f44, 0xb33a2a], [0xfff0a6, 0xf6c54a, 0xc98d22], [0xb9f286, 0x6cc74d, 0x3d8f32]],
  cloud: 0xffffff, cloudShade: 0xd4e3f3,
};

/** Gemeinsame Materialien; `all` zum Aufräumen. */
export function makeMaterials() {
  const world = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 });
  const stone = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0 });
  const glow = new THREE.MeshBasicMaterial({ vertexColors: true });
  return { world, stone, glow, all: [world, stone, glow] };
}
