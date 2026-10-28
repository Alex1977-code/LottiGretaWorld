// Thema `wreck` (Welt 6: 6-2 Geisterschiffe): Abendlicht über einem nebligen Meer – violetter Zenit, orangeroter Horizont,
// tiefe, warme Sonne; dunkles, grünblaues Wasser mit Schaumstreifen, Felsnadeln und schaukelnden Silhouetten ferner
// Geisterschiffe. Gelände: verwittertes Holz und dunkler Fels. Stimmungen (view/mood.js): `laderaum` (dunkler, von
// Laternen erhellter Schiffsbauch – view.setMood('laderaum')) und Unterwasser (gefluteter Laderaum: trübes Grün,
// Lichtflecken; automatisch, sobald der Kopf der Figur unter Wasser ist). Registriert in view/themes.js (eine Zeile).
import { ghostSea, animateShips } from './backdrop_w6.js';

export const WRECK_THEME = {
  label: 'Geisterschiffe',
  sky: [[1, 0x2a1a4a], [0.45, 0x5a3a7a], [0.18, 0xb85a6a], [0.04, 0xf09a5a], [0, 0xffc88a], [-0.12, 0x6a5a7a], [-1, 0x2a2a3a]],
  background: 0x6a5a78,
  fog: { color: 0x7a6a84, near: 45, far: 200 },
  hemi: { sky: 0xd0a8c8, ground: 0x2a3a4a, intensity: 1.15 },
  sun: { color: 0xffb070, intensity: 2.3, dir: [-0.5, 0.45, -0.8] },
  shadows: true,
  sunDisc: true,
  clouds: true,
  backdrop: 'ghostsea',
  ground: null,
  seaLevel: -1,
  grassTop: 0x8a7a62, grassTop2: 0x7a6a54, grassRim: 0xb8a482, grassSide: 0x5a4a3a,
  dirt: 0x5a4a44, dirtDeep: 0x34282a, rock: 0x5a5866, rockDeep: 0x34323e,
  checker: false,
  stone: 0xb8b0a8, stoneDark: 0x7a706a,
  wood: 0x8a7a62, woodDark: 0x4a3e32,
  climb: 0xa89878, climbDark: 0x6a5a44,
  water: 0x2a8a8a, waterDeep: 0x14485a,
  lava: 0xff6a1a,
  lights: [],
  lanternLight: { color: 0x9affc8, intensity: 18, distance: 10 },
  moods: {
    laderaum: {
      fog: { color: 0x1a1a22, near: 10, far: 55 },
      background: 0x14141c,
      hemi: { sky: 0x8a9ac8, ground: 0x2a2018, intensity: 0.7 },
      sun: { color: 0xffc890, intensity: 0.7 },
      dome: 0x1a1a24,
    },
  },
  underwater: {
    fog: { color: 0x14584a, near: 2, far: 34 },
    background: 0x0e4038,
    hemi: { sky: 0x8af0c8, ground: 0x0a3a30, intensity: 1.05 },
    sun: { color: 0xb8ffd8, intensity: 1.2 },
    dome: 0x1a5a4a,
    caustics: 0.4,
    color: 0xb4ffd8,
  },
  buildBackdrop(sky, bounds, rnd) {
    sky.ships = ghostSea(sky, bounds, rnd, (sky.theme.seaLevel ?? -1) - 0.4, { ships: 4 });
  },
  updateBackdrop(sky, dt) { animateShips(sky.ships, dt); },
};
