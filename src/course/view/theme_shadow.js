// Thema `shadow` (Welt 2: 2-3 Schattenspiel, unterirdisch): dunkel-warmes Gewölbe – kaum Himmel, warmer Dunst,
// gedämpftes Licht von oben, Licht an der Figur (wie cave), Laternen; ringsum fallen warme Lichtkegel von oben durch
// die Dunkelheit (Kulisse über theme.buildBackdrop, ein additives Mesh). Gelände: gestampfter Lehm, dunkles Holz.
// Die Schattenwände selbst baut der Baustein `schattenwand` (blocks/types/w2_shadow.js). Registriert in themes.js.
import { lightCones } from './backdrop_w2.js';

export const SHADOW_THEME = {
  label: 'Schattengasse',
  sky: [[1, 0x0c0604], [0.3, 0x1a0e0a], [0, 0x2a1810], [-1, 0x0a0604]],
  background: 0x1c100c,
  fog: { color: 0x22140e, near: 22, far: 100 },
  hemi: { sky: 0xffc896, ground: 0x3a2018, intensity: 0.8 },
  sun: { color: 0xffd2a0, intensity: 1.15, dir: [-0.2, 1, 0.6] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'cones',
  ground: null,
  grassTop: 0xc49464, grassTop2: 0xb4865a, grassRim: 0xe4b47e, grassSide: 0x8a5a3a,
  dirt: 0x6a4030, dirtDeep: 0x3a2018, rock: 0x7a5a48, rockDeep: 0x4a3028,
  checker: false,
  stone: 0xd8c0a0, stoneDark: 0x9a7a60,
  wood: 0xc8884e, woodDark: 0x7a4a26,
  climb: 0xe0c090, climbDark: 0xa07a50,
  water: 0x3a9ac8, waterDeep: 0x1a5a8a,
  lava: 0xff6a1a,
  lights: [],
  playerLight: { color: 0xffb870, intensity: 18, distance: 12 },
  lanternLight: { color: 0xffa040, intensity: 20, distance: 11 },
  buildBackdrop(sky, bounds, rnd) {
    lightCones(sky, bounds, rnd, { color: 0xffc070, strength: 0.2 });
  },
};
