// Thema `lavamachine` (Welt 7: 7-Kapitän Maschinen-Diorama in der Lava): ein Maschinenpark im glühenden Lavasee – gemauerte
// Sockel mit riesigen Messing-Zahnrädern (drehen sich), stampfende Kolben, Rohrbögen, Schlote mit Glut, aufsteigende
// Funken; warmes, eher helles Werkstattlicht, damit das Diorama gut lesbar bleibt. Gelände: Ziegel und Stahlplatten.
// Registriert in view/themes.js (eine Zeile).
import { lavaMachine, animateMachine } from './backdrop_w7.js';

export const LAVAMACHINE_THEME = {
  label: 'Lava-Maschinenpark',
  sky: [[1, 0x1a0a0a], [0.45, 0x3a1410], [0.12, 0x8a3418], [0.02, 0xd86a2a], [0, 0xf09a4a], [-0.3, 0x8a3010], [-1, 0x2a0a04]],
  background: 0x5a2010,
  fog: { color: 0x6a2a14, near: 50, far: 200 },
  hemi: { sky: 0xffd0a8, ground: 0xc8501a, intensity: 1.35 },
  sun: { color: 0xffe0c0, intensity: 2.4, dir: [-0.4, 1, 0.55] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'lavamachine',
  ground: null,
  grassTop: 0x9a8a8a, grassTop2: 0x8e7e7e, grassRim: 0xd8b088, grassSide: 0x5a4a4a,
  dirt: 0x8a5a48, dirtDeep: 0x4a2e24, rock: 0x6a5a5a, rockDeep: 0x3a2e2e,
  checker: false,
  stone: 0xc8bcb8, stoneDark: 0x7a6e6e,
  wood: 0xa87a4a, woodDark: 0x5a3a1e,
  climb: 0xc0a088, climbDark: 0x806454,
  water: 0x3fb4ff, waterDeep: 0x1c6fd1,
  lava: 0xff6a1a,
  lights: [],
  buildBackdrop(sky, bounds, rnd, yBase) { sky.w7 = lavaMachine(sky, bounds, rnd, yBase, { y: -8 }); },
  updateBackdrop(sky, dt, camera) { animateMachine(sky.w7, dt, camera); },
};
