// Thema `dungeon` (Welt 8: 8-5 Unterwasser-Festung mit Steigbecken, schwebenden Wasserkörpern und Stachelblöcken): eine
// versunkene Festung – Bogenmauern aus blaugrünem Stein, vergitterte Fenster glimmen türkis, Ketten hängen von oben, schräge
// Lichtschächte, Seetang, aufsteigende Blasen. Über Wasser: dämmriges Festungsblau; unter Wasser (automatisch, sobald der
// Kopf der Figur unter Wasser ist; view/mood.js) tiefes Türkis mit Lichtflecken. Gelände: moosiger blauer Stein.
// Registriert in view/themes.js (eine Zeile).
import { dungeonDeep, animateW8 } from './backdrop_w8.js';

export const DUNGEON_THEME = {
  label: 'Unterwasser-Festung',
  sky: [[1, 0x061a24], [0.4, 0x0c2a38], [0.1, 0x14404e], [0, 0x1a4a58], [-1, 0x061820]],
  background: 0x0e3442,
  fog: { color: 0x123a48, near: 24, far: 110 },
  hemi: { sky: 0x9ad8e8, ground: 0x1a3a40, intensity: 1.05 },
  sun: { color: 0xd8f0ff, intensity: 1.4, dir: [-0.25, 1, 0.4] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'dungeon',
  ground: null,
  seaLevel: 0,
  grassTop: 0x4a8a7a, grassTop2: 0x42806e, grassRim: 0x7ab8a8, grassSide: 0x2a4a54,
  dirt: 0x2a4a54, dirtDeep: 0x162a32, rock: 0x3a5a66, rockDeep: 0x1e323a,
  checker: false,
  stone: 0x8ab8c0, stoneDark: 0x4a6a74,
  wood: 0x6a5a3a, woodDark: 0x3a3020,
  climb: 0x7aa0a8, climbDark: 0x4a6a70,
  water: 0x3ac8d8, waterDeep: 0x147a9a,
  lava: 0xff6a1a,
  lights: [],
  playerLight: { color: 0xc8f8ff, intensity: 6, distance: 9 },
  lanternLight: { color: 0x6ae8ff, intensity: 14, distance: 8 },
  underwater: {
    fog: { color: 0x0a3e4e, near: 3, far: 38 },
    background: 0x062e3a,
    hemi: { sky: 0x98e8f0, ground: 0x2a5a5a, intensity: 1.1 },
    sun: { color: 0xd0f8ff, intensity: 1.2 },
    dome: 0x0e4a5a,
    caustics: 0.32,
    color: 0xd8fff8,
    playerLight: 1.3,
  },
  buildBackdrop(sky, bounds, rnd, yBase) { sky.w8 = dungeonDeep(sky, bounds, rnd, yBase, { y: -10 }); },
  updateBackdrop(sky, dt, camera) { animateW8(sky.w8, dt, camera); },
};
