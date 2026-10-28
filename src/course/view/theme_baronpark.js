// Thema `baronpark` (Welt 8: 8-Burg, Rummelplatz um den großen Turm – das Finale): Abendhimmel in Violett und Orange über
// einem Rummelplatz – hinten in der Mitte der große Turm des Barons mit leuchtenden Fenstern, ein Riesenrad (dreht sich) mit
// Glühbirnen, Achterbahn-Bögen, bunte Zelte mit Lichterketten, erste Sterne. Gelände: Rummel-Pflaster und Abendgras.
// Registriert in view/themes.js (eine Zeile).
import { baronPark, animateW8 } from './backdrop_w8.js';

export const BARONPARK_THEME = {
  label: 'Brummbär-Rummelplatz',
  sky: [[1, 0x140e3a], [0.45, 0x2e1a5a], [0.15, 0x7a3a7a], [0.04, 0xe8706a], [0, 0xffa070], [-0.2, 0x8a3a5a], [-1, 0x1a0e24]],
  background: 0x5a2a5a,
  fog: { color: 0x6a3460, near: 50, far: 210 },
  hemi: { sky: 0xffc8e0, ground: 0x4a3a5a, intensity: 1.2 },
  sun: { color: 0xffb890, intensity: 2.1, dir: [-0.6, 0.5, 0.5] },
  shadows: true,
  sunDisc: true,
  clouds: true,
  backdrop: 'baronpark',
  ground: null,
  grassTop: 0x5ab85a, grassTop2: 0x52ac52, grassRim: 0x8ad88a, grassSide: 0x4a3a5a,
  dirt: 0x5a4a6a, dirtDeep: 0x34283e, rock: 0x6a5a7a, rockDeep: 0x3a3048,
  checker: false,
  stone: 0xd8c8e0, stoneDark: 0x8a7a9a,
  wood: 0xc87a4a, woodDark: 0x7a4426,
  climb: 0xc8a8c0, climbDark: 0x8a6a80,
  water: 0x5ab4ff, waterDeep: 0x2a6ad1,
  lava: 0xff6a1a,
  lights: [],
  lanternLight: { color: 0xffd890, intensity: 14, distance: 8 },
  buildBackdrop(sky, bounds, rnd, yBase) { sky.w8 = baronPark(sky, bounds, rnd, yBase, { y: -14 }); },
  updateBackdrop(sky, dt, camera) { animateW8(sky.w8, dt, camera); },
};
