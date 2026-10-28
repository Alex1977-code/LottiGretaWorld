// Thema `reef` (Welt 7: 7-6 Rammfisch-Riff unter Wasser mit Vulkaninsel): ein Vulkan-Riff – über dem Wasser ein warmer,
// dunstiger Abendhimmel; unter Wasser (automatisch, sobald der Kopf der Figur unter Wasser ist; view/mood.js) tiefes
// Blaugrün mit warmem Glimmen von glühenden Vulkanschloten, Lichtflecken von oben. Kulisse: Meeresboden mit bunten
// Korallen (rosa, orange, lila, gelb, türkis), Seetang, Vulkanfelsen mit glühenden Rissen, aufsteigende Blasen; oben die
// Wasseroberfläche. Gelände: Vulkangestein mit Sand. Das Wasser selbst baut der Level (water / lagune).
// Registriert in view/themes.js (eine Zeile).
import { volcanoReef, animateReef } from './backdrop_w7.js';

export const REEF_THEME = {
  label: 'Vulkan-Riff',
  sky: [[1, 0x1a3a6a], [0.45, 0x3a6a9a], [0.12, 0x8aa8b8], [0.02, 0xf0b07a], [0, 0xffc08a], [-0.15, 0x2a7a8a], [-1, 0x0a3a4a]],
  background: 0x1a5a6a,
  fog: { color: 0x2a6a7a, near: 40, far: 170 },
  hemi: { sky: 0xd0f0ff, ground: 0x3a6a5a, intensity: 1.3 },
  sun: { color: 0xffe0c0, intensity: 2.4, dir: [-0.35, 1, 0.45] },
  shadows: true,
  sunDisc: true,
  clouds: false,
  backdrop: 'reef',
  ground: null,
  seaLevel: 0,
  grassTop: 0xc8b48a, grassTop2: 0xbca87e, grassRim: 0xf0dcae, grassSide: 0x6a5a5a,
  dirt: 0x5a4a4e, dirtDeep: 0x34282c, rock: 0x5a4c50, rockDeep: 0x2e2428,
  checker: false,
  stone: 0xd8ccb8, stoneDark: 0x8a7c72,
  wood: 0xb08a5a, woodDark: 0x6a4a2a,
  climb: 0xd0b890, climbDark: 0x8a7050,
  water: 0x3ac8d8, waterDeep: 0x147a9a,
  lava: 0xff6a1a,
  sandBed: 0xc8a878, sandBedTop: 0xdcc090,
  lights: [],
  underwater: {
    fog: { color: 0x0c4658, near: 3, far: 40 },
    background: 0x083444,
    hemi: { sky: 0x98e0f0, ground: 0x8a4a2a, intensity: 1.15 },
    sun: { color: 0xffe0c0, intensity: 1.3 },
    dome: 0x14566a,
    caustics: 0.28,
    color: 0xffe8c8,
    playerLight: 1.0,
  },
  buildBackdrop(sky, bounds, rnd, yBase) { sky.w7 = volcanoReef(sky, bounds, rnd, yBase, { y: -6, surface: (sky.theme.seaLevel ?? 0) + 0.05 }); },
  updateBackdrop(sky, dt, camera) { animateReef(sky.w7, dt, camera); },
};
