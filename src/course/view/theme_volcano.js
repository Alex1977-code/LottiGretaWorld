// Thema `volcano` (Welt 7: 7-7 Vulkan-Lavasee mit steigender/sinkender Lava, Fontänenfeld): im Krater eines Vulkans –
// rauchig-roter Himmel, ringsum die zerklüftete Kraterwand mit glühenden Adern, ein Lavasee bis zur Wand, ferne Lava-
// Fontänen, die auf und ab pulsieren, aufsteigende Rauchsäulen, fallende Asche. Gelände: dunkles Vulkangestein mit
// heller Asche-Kante. Registriert in view/themes.js (eine Zeile).
import { volcanoCrater, animateCrater } from './backdrop_w7.js';

export const VOLCANO_THEME = {
  label: 'Vulkan-Lavasee',
  sky: [[1, 0x120808], [0.45, 0x2a1210], [0.15, 0x5a2414], [0.03, 0xa04018], [0, 0xd0602a], [-0.2, 0x6a1c0a], [-1, 0x1a0604]],
  background: 0x3a140a,
  fog: { color: 0x4a1c10, near: 45, far: 190 },
  hemi: { sky: 0xffb894, ground: 0xc8401a, intensity: 1.25 },
  sun: { color: 0xffc8a0, intensity: 2.1, dir: [-0.35, 1, 0.5] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'volcano',
  ground: null,
  grassTop: 0x6a5c5c, grassTop2: 0x605252, grassRim: 0xc8b0a8, grassSide: 0x3e3234,
  dirt: 0x3e3032, dirtDeep: 0x221a1c, rock: 0x5c4e50, rockDeep: 0x2e2426,
  checker: false,
  stone: 0xb8aaa8, stoneDark: 0x6e6262,
  wood: 0x8a5a3a, woodDark: 0x4a2c1c,
  climb: 0xb09088, climbDark: 0x70564e,
  water: 0x3fb4ff, waterDeep: 0x1c6fd1,
  lava: 0xff6a1a,
  lights: [],
  buildBackdrop(sky, bounds, rnd, yBase) { sky.w7 = volcanoCrater(sky, bounds, rnd, yBase, { y: -8 }); },
  updateBackdrop(sky, dt, camera) { animateCrater(sky.w7, dt, camera); },
};
