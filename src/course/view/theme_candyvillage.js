// Thema `candyvillage` (Halloween-Welt: H-2 Süßes-oder-Saures-Dorf): sternklare Nacht über einem kleinen Dorf – tiefblau-
// violetter Himmel, großer Mond mit schläfrig-lächelndem Gesicht, ringsum schiefe Häuschen mit warm leuchtenden
// Fenstern, runde dunkle Bäume, Fledermäuse flattern über dem Dorf. Kühles Mondlicht, warmes Licht an der Figur und an
// den Laternen. Gelände: dunkles Gras, helles Kopfsteinpflaster (stone), warmes Holz. Registriert in view/themes.js.
import { candyTown, faceMoon, batFlock, animateBats } from './backdrop_hw.js';
import { starField } from './backdrop_w2.js';

export const CANDYVILLAGE_THEME = {
  label: 'Süßes-Dorf',
  sky: [[1, 0x060a24], [0.4, 0x121848], [0.14, 0x2a2464], [0.03, 0x4a2c70], [0, 0x5a3478], [-0.2, 0x1a1238], [-1, 0x080616]],
  background: 0x181442,
  fog: { color: 0x1e1a4a, near: 40, far: 170 },
  hemi: { sky: 0x9898e8, ground: 0x5a3050, intensity: 0.9 },
  sun: { color: 0xc0c8ff, intensity: 1.55, dir: [0.3, 1, 0.5] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'candyvillage',
  ground: { color: 0x1e2a30, y: -16 },
  grassTop: 0x5e9a62, grassTop2: 0x548e58, grassRim: 0x9ad09a, grassSide: 0x3a6a4a,
  dirt: 0x6a4a5a, dirtDeep: 0x3a2a3a, rock: 0x6a6a8a, rockDeep: 0x3a3a5a,
  checker: false,
  stone: 0xd8ccd8, stoneDark: 0x8a7a92,
  wood: 0xc8946a, woodDark: 0x7a5038,
  climb: 0xd8b898, climbDark: 0x9a7a62,
  water: 0x4a7ad8, waterDeep: 0x2a3a8a,
  lava: 0xff6a1a,
  lights: [],
  playerLight: { color: 0xffd8a8, intensity: 12, distance: 12 },
  lanternLight: { color: 0xffb050, intensity: 20, distance: 11 },
  buildBackdrop(sky, bounds, rnd, yBase) {
    candyTown(sky, bounds, rnd, yBase);
    starField(sky, rnd, 640, { size: 2, tints: [0xffffff, 0xfff0c8, 0xd8e0ff] });
    faceMoon(sky, [0.25, 0.45, -1], 20);
    sky.bats = batFlock(sky, bounds, rnd, { n: 8 });
  },
  updateBackdrop(sky, dt) { animateBats(sky.bats, dt); },
};
