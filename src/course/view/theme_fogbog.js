// Thema `fogbog` (Bonuswelt Stern: S-8 verschneiter Spukfriedhof im Nebel): blaue Winternacht mit dichtem, hellem Nebel
// (nah), leiser Schneefall um die Kamera, ringsum Schneehügel, Grabsteine mit Schneehauben, kahle Bäume, warme Laternen und
// türkis-lila Irrlichter – eher geheimnisvoll als gruselig. Sanftes Figurenlicht (Figuren lesbar). Gelände: Schneedecken
// über schiefergrauer Erde. Registriert in view/themes.js (eine Zeile).
import { snowGraveyard, starDome, animateStar } from './backdrop_star.js';

export const FOGBOG_THEME = {
  label: 'Nebelfriedhof',
  sky: [[1, 0x0a1430], [0.45, 0x1a2a50], [0.15, 0x3a4a78], [0.02, 0x6a78a0], [0, 0x7a88b0], [-0.2, 0x4a5880], [-1, 0x1a2440]],
  background: 0x4a5a84,
  fog: { color: 0x7a88b4, near: 16, far: 92 },
  hemi: { sky: 0xb8c8ff, ground: 0x3a4060, intensity: 0.9 },
  sun: { color: 0xc8d4ff, intensity: 1.5, dir: [-0.35, 1, 0.45] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'fogbog',
  ground: null,
  grassTop: 0xf0f4ff, grassTop2: 0xe4eaf8, grassRim: 0xffffff, grassSide: 0xb8c4e0,
  dirt: 0x5a6078, dirtDeep: 0x34384c, rock: 0x6a7088, rockDeep: 0x3a4058,
  checker: false,
  stone: 0xc8d0e4, stoneDark: 0x7a84a0,
  wood: 0x8a7a8a, woodDark: 0x5a4a5a,
  climb: 0xd0d8f0, climbDark: 0x8a94b0,
  water: 0x6a9ac8, waterDeep: 0x2a4a7a,
  lava: 0xff6a1a,
  lights: [],
  playerLight: { color: 0xe0ecff, intensity: 10, distance: 9 },
  lanternLight: { color: 0xffd890, intensity: 16, distance: 9 },
  toy: { rim: 1.6, spec: 1.3, fill: 0.1 },
  buildBackdrop(sky, bounds, rnd, yBase) {
    const g = snowGraveyard(sky, bounds, rnd, yBase, { y: -3, n: 44 });
    const stars = starDome(sky, rnd, 500, { below: 0.1, size: 1.8 });
    sky.star = { t: 0, stars, dots: [g.lamps, g.wisps], embers: [g.snow] };
  },
  updateBackdrop(sky, dt, camera) { animateStar(sky.star, dt, camera); },
};
