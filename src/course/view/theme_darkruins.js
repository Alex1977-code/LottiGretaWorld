// Thema `darkruins` (Welt 7: 7-2 dunkler unterirdischer Tempel mit Kipp-Schaltfeldern): tiefes, warmes Dunkel unter der
// Erde – ein Ring mächtiger Säulen mit Bögen, Tropfsteine von der Decke, ein ferner Steinboden mit glimmenden Fugen,
// Fackeln an den Säulen (flackerndes Glühen). Damit die Figuren gut lesbar bleiben: kräftiges Licht an der Figur, warmes
// Himmelslicht von oben, Laternenlicht an Fackeln (view.addLantern, deco_w7 fackel), schwebende Glutfunken. Gelände:
// sandfarbene Tempelplatten über dunklem Quaderstein. Eigene Fantasie-Gestaltung ohne reale religiöse Symbole.
// Registriert in view/themes.js (eine Zeile).
import { darkTemple, animateTemple, embers, animateEmbers } from './backdrop_w7.js';

export const DARKRUINS_THEME = {
  label: 'Dunkler Tempel',
  sky: [[1, 0x050408], [0.35, 0x0c0912], [0.05, 0x1a1218], [0, 0x221812], [-1, 0x060406]],
  background: 0x120d10,
  fog: { color: 0x160f12, near: 20, far: 92 },
  hemi: { sky: 0xa890c8, ground: 0x3a2418, intensity: 0.68 },
  sun: { color: 0xffd0a0, intensity: 0.55, dir: [-0.25, 1, 0.45] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'darktemple',
  ground: null,
  grassTop: 0x8e7c66, grassTop2: 0x84725e, grassRim: 0xd0b482, grassSide: 0x56483c,
  dirt: 0x5a4a3e, dirtDeep: 0x2e241e, rock: 0x6a5a50, rockDeep: 0x34282a,
  checker: false,
  stone: 0xd2c0a0, stoneDark: 0x8a7860,
  wood: 0x9a6a3a, woodDark: 0x5a3a1e,
  climb: 0xc8ac80, climbDark: 0x8a7050,
  water: 0x3fb4ff, waterDeep: 0x1c6fd1,
  lava: 0xff6a1a,
  lights: [],
  playerLight: { color: 0xffdcb0, intensity: 18, distance: 12 },
  lanternLight: { color: 0xff9a3a, intensity: 18, distance: 9 },
  toy: { rim: 1.35 },
  buildBackdrop(sky, bounds, rnd, yBase) {
    sky.w7 = darkTemple(sky, bounds, rnd, yBase, { y: -10 });
    sky.w7dust = embers(sky, rnd, { n: 70, flow: [0.1, 0.35, 0], sway: 0.9, size: 0.11, colors: [0xffc070, 0xff8a3a], opacity: 0.55 });
  },
  updateBackdrop(sky, dt, camera) { animateTemple(sky.w7, dt); animateEmbers(sky.w7dust, dt, camera); },
};
