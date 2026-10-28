// Thema `lavatower` (Welt 7: 7-5 Turm im Lavasee, Flucht vor Giftnebel und steigender Lava): ein senkrechter Turmschacht
// – tief unten der glühende Lavasee, ringsum eine runde Burgmauer über die ganze Höhe (Mauerringe, glühende
// Fensterschlitze, hängende Ketten), oben eine wabernde lila Giftnebel-Decke, aus der lila Tropfen und Funken rieseln.
// Stimmung 'flucht' (view.setMood('flucht'), z. B. giftnebel mit mood: 'flucht'): violetter, naher Dunst, Licht von der
// Lava. Gelände: dunkler Burgstein mit warmer Kante. Registriert in view/themes.js (eine Zeile).
import { lavaTowerPit, animateTower } from './backdrop_w7.js';

export const LAVATOWER_THEME = {
  label: 'Fallenturm',
  sky: [[1, 0x1a0628], [0.45, 0x2a0a32], [0.12, 0x4a1420], [0, 0x7a2410], [-0.3, 0x5a1408], [-1, 0x1a0404]],
  background: 0x2a0c1a,
  fog: { color: 0x34101e, near: 30, far: 140 },
  hemi: { sky: 0xd0a0e0, ground: 0xd04a14, intensity: 1.1 },
  sun: { color: 0xffc8b0, intensity: 1.8, dir: [-0.25, 1, 0.5] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'lavatower',
  ground: null,
  grassTop: 0x7a6a72, grassTop2: 0x6e5e66, grassRim: 0xd89a7a, grassSide: 0x4a3a42,
  dirt: 0x4a3a40, dirtDeep: 0x2a1e24, rock: 0x5e4e56, rockDeep: 0x30242a,
  checker: false,
  stone: 0xc0b0b4, stoneDark: 0x766670,
  wood: 0x8a5a3a, woodDark: 0x4a2c1c,
  climb: 0xb8988c, climbDark: 0x7a5a52,
  water: 0x3fb4ff, waterDeep: 0x1c6fd1,
  lava: 0xff6a1a,
  lights: [],
  playerLight: { color: 0xffc8a0, intensity: 8, distance: 10 },
  lanternLight: { color: 0xff8a30, intensity: 20, distance: 11 },
  moods: {
    flucht: {
      fog: { color: 0x3a1048, near: 12, far: 70 },
      background: 0x2a0838,
      hemi: { sky: 0xc87aff, ground: 0xff5a14, intensity: 1.0 },
      sun: { color: 0xe0a0ff, intensity: 1.2 },
      dome: 0x3a0c4a,
      playerLight: 1.6,
    },
  },
  buildBackdrop(sky, bounds, rnd, yBase) { sky.w7 = lavaTowerPit(sky, bounds, rnd, yBase, { y: -12 }); },
  updateBackdrop(sky, dt, camera) { animateTower(sky.w7, dt, camera); },
};
