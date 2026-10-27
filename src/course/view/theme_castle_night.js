// Thema `castle_night` (Halloween-Welt: H-Burg Gruselschloss von Graf Brummbär): Vollmondnacht über einem Gruselschloss –
// großer heller Vollmond, Sterne, Türme mit lila Spitzdächern und warmen Kerzenfenstern ringsum, Fledermäuse. Gelände:
// Schlossstein-Blöcke mit **roten Teppichen** als Decke (Goldkante), dunkles Holz. Grundstimmung 'aussen' (Dach, Höfe);
// Stimmung 'innen' (view.setMood('innen')): Gewölbe im Kerzenschein, naher warmer Dunst, Licht an der Figur kräftiger.
// Kerzen liefert deco_hw (kerzen). Registriert in view/themes.js (eine Zeile).
import { spookyCastle, faceMoon, batFlock, animateBats } from './backdrop_hw.js';
import { starField } from './backdrop_w2.js';

export const CASTLE_NIGHT_THEME = {
  label: 'Gruselschloss',
  sky: [[1, 0x050414], [0.4, 0x100c30], [0.14, 0x22184e], [0.03, 0x3a2458], [0, 0x48285e], [-0.2, 0x160e28], [-1, 0x06040e]],
  background: 0x150f32,
  fog: { color: 0x1c1438, near: 38, far: 165 },
  hemi: { sky: 0xa898e8, ground: 0x5a2a3a, intensity: 0.9 },
  sun: { color: 0xc8c8ff, intensity: 1.6, dir: [-0.25, 1, 0.5] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'castle_night',
  ground: null,
  grassTop: 0xc0303e, grassTop2: 0xb02a38, grassRim: 0xf0c050, grassSide: 0x5a5070,
  dirt: 0x5a5470, dirtDeep: 0x34304a, rock: 0x6a6480, rockDeep: 0x3a3650,
  checker: false,
  stone: 0xb8b0c8, stoneDark: 0x6a6280,
  wood: 0x8a5a3e, woodDark: 0x4a2c1e,
  climb: 0xb0a0b8, climbDark: 0x6e6078,
  water: 0x4a7ad8, waterDeep: 0x2a3a8a,
  lava: 0xff6a1a,
  lights: [],
  playerLight: { color: 0xffd0a0, intensity: 11, distance: 12 },
  lanternLight: { color: 0xffb060, intensity: 20, distance: 10 },
  moods: {
    aussen: {},
    innen: {
      fog: { color: 0x1e1022, near: 16, far: 80 },
      background: 0x140a18,
      hemi: { sky: 0xd8a888, ground: 0x6a2a2a, intensity: 0.85 },
      sun: { color: 0xffc890, intensity: 0.9 },
      dome: 0x1a0c1e,
      playerLight: 1.8,
    },
  },
  buildBackdrop(sky, bounds, rnd, yBase) {
    spookyCastle(sky, bounds, rnd, yBase);
    starField(sky, rnd, 560, { size: 1.9, tints: [0xffffff, 0xffe8d8, 0xd8d0ff] });
    faceMoon(sky, [0.32, 0.48, -1], 24, { face: false, color: 0xfff8e8 });
    sky.bats = batFlock(sky, bounds, rnd, { n: 12, color: 0x1e1230 });
  },
  updateBackdrop(sky, dt) { animateBats(sky.bats, dt); },
};
