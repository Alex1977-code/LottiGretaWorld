// Thema `beep` (Welt 4: 4-3 Piep-Block-Himmelsbahn): dunkelblauer Technik-Himmel bei Nacht mit Sternen und Neon –
// ferne Türme mit leuchtenden Fensterbändern und Antennen, ein Neon-Gitter tief unten, schwebende Neon-Ringe als
// Takt-Lichter: sie leuchten in der gerade festen Piep-Farbe (rot/blau), blitzen auf jeder Zählzeit und flackern in der
// Warnzeit (Taktuhr level.beepClock bzw. music.beat()). Gelände: helle Metallplatten im 1-m-Raster mit Neon-Kante.
// Registriert in view/themes.js (eine Zeile).
import { starField } from './backdrop_w2.js';
import { techCity, animateBeat } from './backdrop_w4.js';

export const BEEP_THEME = {
  label: 'Technik-Himmel',
  sky: [[1, 0x02041a], [0.4, 0x070e36], [0.12, 0x101c5c], [0.02, 0x2c2c8c], [0, 0x4c3ca2], [-0.2, 0x0c0c3c], [-1, 0x020216]],
  background: 0x0c1242,
  fog: { color: 0x0e164a, near: 62, far: 270 },
  hemi: { sky: 0x8cb2ff, ground: 0x2c1c5c, intensity: 1.2 },
  sun: { color: 0xdae6ff, intensity: 2.0, dir: [-0.35, 1, 0.45] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'beep',
  ground: { color: 0x060a2a, y: -40 },
  grassTop: 0xbac8e8, grassTop2: 0xaab8da, grassRim: 0x7cf0ff, grassSide: 0x4c5c8c,
  dirt: 0x2c3668, dirtDeep: 0x181e42, rock: 0x4c5c8c, rockDeep: 0x2c305c,
  checker: true,
  stone: 0xdae2f6, stoneDark: 0x8c98c2,
  wood: 0xc8d0e8, woodDark: 0x7a86aa,
  climb: 0xa8b8e0, climbDark: 0x5a6a9a,
  water: 0x40c2ff, waterDeep: 0x1a62c2,
  lava: 0xff6a1a,
  lights: [],
  buildBackdrop(sky, bounds, rnd, yBase) {
    starField(sky, rnd, 700, { size: 1.9, tints: [0xffffff, 0xbfe0ff, 0xffd0f0, 0xd0c8ff] });
    sky.beat = techCity(sky, bounds, rnd, yBase);
  },
  updateBackdrop(sky, dt) { animateBeat(sky, sky.beat, dt); },
};
