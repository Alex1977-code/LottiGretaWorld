// Thema `inferno` (Welt 8: 8-7 Lava-Inferno mit Kristall-Felsklötzen): ein glühender Lavasee bis zum Horizont, schwarze
// Felsnadeln mit leuchtenden lila und eisblauen Kristallgruppen, ferne Vulkane mit glühendem Krater, aufsteigende Funken.
// Gelände: dunkles Vulkangestein mit lila Kristallkante. Lava baut der Level (lavaspiegel/lava). Registriert in view/themes.js
// (eine Zeile).
import { crystalInferno, animateW8 } from './backdrop_w8.js';

export const INFERNO_THEME = {
  label: 'Lava-Inferno',
  sky: [[1, 0x14060e], [0.45, 0x2a0a1e], [0.15, 0x5a1424], [0.03, 0xa8301a], [0, 0xd8502a], [-0.2, 0x7a1a0a], [-1, 0x1a0604]],
  background: 0x3a0e14,
  fog: { color: 0x4a1418, near: 40, far: 180 },
  hemi: { sky: 0xffb0c8, ground: 0xd8401a, intensity: 1.25 },
  sun: { color: 0xffc0a0, intensity: 2.0, dir: [-0.35, 1, 0.5] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'inferno',
  ground: null,
  grassTop: 0x5a4a5e, grassTop2: 0x524256, grassRim: 0xc89ae8, grassSide: 0x34263a,
  dirt: 0x34263a, dirtDeep: 0x1e1422, rock: 0x4a3a50, rockDeep: 0x261c2a,
  checker: false,
  stone: 0xb8a0c0, stoneDark: 0x6a5470,
  wood: 0x7a4a3a, woodDark: 0x40241c,
  climb: 0xa890b0, climbDark: 0x6a5470,
  water: 0x3fb4ff, waterDeep: 0x1c6fd1,
  lava: 0xff6a1a,
  lights: [],
  buildBackdrop(sky, bounds, rnd, yBase) { sky.w8 = crystalInferno(sky, bounds, rnd, yBase, { y: -10, lavaY: -9 }); },
  updateBackdrop(sky, dt, camera) { animateW8(sky.w8, dt, camera); },
};
