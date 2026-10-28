// Thema `cookie` (Welt 8: 8-3 Keks-Fabrik mit drehenden Keksen und Keks-Zahnrädern): warm und süß – eine riesige Fabrikhalle
// mit Wänden in Zuckerguss-Streifen (rosa, vanille, minze), große Keks-Zahnräder drehen sich an den Wänden, Förderbänder mit
// Keksen, Schornsteine mit Zuckerdampf, rieselnder Puderzucker. Gelände: Zuckerguss-Decke (rosa) auf Keksteig. Registriert in
// view/themes.js (eine Zeile).
import { cookieFactory, animateW8 } from './backdrop_w8.js';

export const COOKIE_THEME = {
  label: 'Keksfabrik',
  sky: [[1, 0xf0c8d8], [0.5, 0xffd8e0], [0.15, 0xffe8d8], [0, 0xfff0e0], [-1, 0xd8a888]],
  background: 0xffe0d8,
  fog: { color: 0xffe4d8, near: 50, far: 200 },
  hemi: { sky: 0xfff0f0, ground: 0xc88a5a, intensity: 1.35 },
  sun: { color: 0xfff0d8, intensity: 2.3, dir: [-0.4, 1, 0.5] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'cookie',
  ground: null,
  grassTop: 0xf8b8d0, grassTop2: 0xf0acc6, grassRim: 0xfff0f6, grassSide: 0xd08e4e,
  dirt: 0xd89a52, dirtDeep: 0xa0602e, rock: 0xc88a5a, rockDeep: 0x8a5a32,
  checker: false,
  stone: 0xfff0e0, stoneDark: 0xd8b898,
  wood: 0xe8b07a, woodDark: 0xa8703a,
  climb: 0xf0c890, climbDark: 0xb88a50,
  water: 0x8ad8ff, waterDeep: 0x4a9ad8,
  lava: 0xff6a1a,
  lights: [],
  buildBackdrop(sky, bounds, rnd, yBase) { sky.w8 = cookieFactory(sky, bounds, rnd, yBase, { y: -12 }); },
  updateBackdrop(sky, dt, camera) { animateW8(sky.w8, dt, camera); },
};
