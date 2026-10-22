// Thema `lava` (Welt 2: 2-A Felsinsel im Lavasee): glühend roter Abendhimmel, Rauchdunst, warmes Licht; tief unten
// ein glühender Lavasee (unbeleuchtet, leuchtet von selbst) und Vulkankegel am Horizont (Kulisse über
// theme.buildBackdrop, zwei Meshes). Gelände: dunkler Fels mit rötlicher Kante. Die tödliche Lava im Spiel bleibt der
// Baustein `lava`. Registriert in view/themes.js (eine Zeile).
import { lavaSea } from './backdrop_w2.js';

export const LAVA_THEME = {
  label: 'Lavasee',
  sky: [[1, 0x140404], [0.4, 0x340a06], [0.12, 0x7a200e], [0.03, 0xd04a18], [0, 0xff7a2a], [-0.2, 0x8a2410], [-1, 0x2a0604]],
  background: 0x4a1208,
  fog: { color: 0x5a1a0c, near: 50, far: 210 },
  hemi: { sky: 0xffb080, ground: 0xb03a14, intensity: 1.25 },
  sun: { color: 0xffc8a0, intensity: 2.2, dir: [-0.3, 1, 0.5] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'lava',
  ground: null,
  grassTop: 0x9a8478, grassTop2: 0x8a7468, grassRim: 0xc89070, grassSide: 0x5a4a44,
  dirt: 0x4a3a36, dirtDeep: 0x2a1e1c, rock: 0x6a5a56, rockDeep: 0x3a2e2c,
  checker: false,
  stone: 0xc8b4aa, stoneDark: 0x8a7470,
  wood: 0xb0784a, woodDark: 0x6a4024,
  climb: 0xd8b090, climbDark: 0x9a7050,
  water: 0x3fb4ff, waterDeep: 0x1c6fd1,
  lava: 0xff6a1a,
  lights: [],
  buildBackdrop(sky, bounds, rnd, yBase) {
    lavaSea(sky, bounds, rnd, yBase, { y: -10 });
  },
};
