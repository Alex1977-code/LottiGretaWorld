// Thema `ghost` (Welt 3: 3-3 Spukvilla): zwei Stimmungen (view.setMood, view/mood.js). Grundstimmung „innen“: dunkles
// Violett, warmes Kerzenlicht von oben, naher Dunst, Licht an der Figur und Laternen (Kerzen-Leuchter), Holzdielen und
// violette Tapete. Stimmung 'aussen' (Außenhof bei Nacht, z. B. Spuk-Tür mit mood: 'aussen'): kühles Mondlicht, tiefblaue
// Nacht, weiter Blick. Kulisse: großer Mond mit Schein und Sternen in der Kuppel, kahle Bäume und Grabsteine als
// Silhouetten ringsum. Registriert in view/themes.js (eine Zeile).
import { starField } from './backdrop_w2.js';
import { moon, spookyRing } from './backdrop_w3.js';

export const GHOST_THEME = {
  label: 'Spukvilla',
  sky: [[1, 0x07040f], [0.35, 0x120a26], [0.1, 0x221440], [0, 0x2c1a4a], [-0.2, 0x140a24], [-1, 0x06030c]],
  background: 0x170c28,
  fog: { color: 0x1c0f30, near: 20, far: 100 },
  hemi: { sky: 0xb898e8, ground: 0x2a1238, intensity: 0.72 },
  sun: { color: 0xffc890, intensity: 0.95, dir: [0.25, 1, 0.45] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'ghost',
  ground: { color: 0x1a1428, y: -18 },
  grassTop: 0x8a5a4a, grassTop2: 0x7c4e42, grassRim: 0xb88a6a, grassSide: 0x5a3644,
  dirt: 0x4a2c5e, dirtDeep: 0x2a163a, rock: 0x5a4a6a, rockDeep: 0x34284a,
  checker: false,
  stone: 0xc8b8dc, stoneDark: 0x7a6a92,
  wood: 0xa8785a, woodDark: 0x5a3a2a,
  climb: 0xc8b0d8, climbDark: 0x7a6090,
  water: 0x5a7ad8, waterDeep: 0x2a3a8a,
  lava: 0xff6a1a,
  lights: [],
  playerLight: { color: 0xffd09a, intensity: 16, distance: 13 },
  lanternLight: { color: 0xffb860, intensity: 18, distance: 10 },
  moods: {
    aussen: {
      fog: { color: 0x16244a, near: 40, far: 180 },
      background: 0x101c40,
      hemi: { sky: 0x7898ff, ground: 0x1a2248, intensity: 1.05 },
      sun: { color: 0x98b4ff, intensity: 1.95 },
      playerLight: 0.45,
    },
    innen: {},
  },
  buildBackdrop(sky, bounds, rnd, yBase) {
    starField(sky, rnd, 520, { size: 1.8, tints: [0xffffff, 0xd8d0ff, 0xc8e0ff] });
    moon(sky, [-0.3, 0.45, -1], 15);
    spookyRing(sky, bounds, rnd, yBase);
  },
};
