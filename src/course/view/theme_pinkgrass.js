// Thema `pinkgrass` (Welt 2: 2-5 rosa Grasland mit Spiegelfrucht): heller Frühlingshimmel mit rosa Horizont,
// weiches Licht, rosa Grasdecken mit hellen Säumen, sanfte rosa Hügel und lila Berge mit Schneekappen
// (Kulisse über theme.buildBackdrop). Blütenbäume liefert deco_w2 (bluetenbaum). Registriert in view/themes.js.
import { hillRing } from './backdrop_w2.js';

export const PINKGRASS_THEME = {
  label: 'Rosa Grasland',
  sky: [[1, 0x3f86ec], [0.45, 0x72b4ff], [0.15, 0xbcdfff], [0.03, 0xffdcef], [0, 0xffe8f4], [-0.1, 0xf2cfe6], [-1, 0xd8a8cc]],
  background: 0xf8e2f0,
  fog: { color: 0xf6dcee, near: 70, far: 260 },
  hemi: { sky: 0xffe8f6, ground: 0xc87ab0, intensity: 1.3 },
  sun: { color: 0xfff0e8, intensity: 2.7, dir: [-0.42, 1, 0.5] },
  shadows: true,
  sunDisc: true,
  clouds: true,
  backdrop: 'pinkhills',
  ground: { color: 0xf0a2d0, y: -36 },
  grassTop: 0xff9ad2, grassTop2: 0xf68ac6, grassRim: 0xffcfe8, grassSide: 0xe06cae,
  dirt: 0xd08a6a, dirtDeep: 0x96524e, rock: 0xa890a8, rockDeep: 0x6a5470,
  checker: false,
  stone: 0xf6eef4, stoneDark: 0xc8b6c8,
  wood: 0xf6f4ef, woodDark: 0xd6c4d4,
  climb: 0xffe0ee, climbDark: 0xd8a0c0,
  water: 0x5ac4ff, waterDeep: 0x2a7ad8,
  lava: 0xff6a1a,
  lights: [],
  buildBackdrop(sky, bounds, rnd, yBase) {
    hillRing(sky, bounds, rnd, yBase, { near: [0xffb6dc, 0xd86aa8], far: [0xf6cde6, 0xc89ac0], peaks: [0xb8a0e8, 0xfff4fc] });
  },
};
