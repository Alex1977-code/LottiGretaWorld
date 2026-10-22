// Thema `fortress` (Welt 3: 3-A rote Käfig-Festung; auch für spätere Festungen): finsterer Abend in der Festung –
// tiefroter, rauchiger Himmel, glühender Lavaschein von unten (Lavasee tief unten, unbeleuchtet), ferne Burgtürme mit
// glühenden Fenstern (ein Mesh), Fackel-Licht (Laternen). Gelände: grauer Steinboden, dunkelroter Backstein. Die roten
// Käfiggitter baut der Level (Baustein arena_cage). Registriert in view/themes.js (eine Zeile).
import { lavaSea } from './backdrop_w2.js';
import { towerRing } from './backdrop_w3.js';

export const FORTRESS_THEME = {
  label: 'Festung',
  sky: [[1, 0x10030a], [0.4, 0x260712], [0.12, 0x52121e], [0.02, 0x842428], [0, 0xa23a2a], [-0.2, 0x440c14], [-1, 0x12030a]],
  background: 0x3a0c16,
  fog: { color: 0x3a0e18, near: 42, far: 175 },
  hemi: { sky: 0xffc4ac, ground: 0x5a1426, intensity: 1.15 },
  sun: { color: 0xffd4b8, intensity: 2.2, dir: [-0.3, 1, 0.5] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'fortress',
  ground: null,
  grassTop: 0x8c8696, grassTop2: 0x7c7686, grassRim: 0xb8acbc, grassSide: 0x5a5466,
  dirt: 0x7a2a2c, dirtDeep: 0x48141a, rock: 0x6a5a62, rockDeep: 0x3a2e34,
  checker: false,
  stone: 0xc8bcc8, stoneDark: 0x8a7a8a,
  wood: 0xa8704a, woodDark: 0x5a3820,
  climb: 0xd8b8a8, climbDark: 0x9a7060,
  water: 0x3fb4ff, waterDeep: 0x1c6fd1,
  lava: 0xff6a1a,
  lights: [],
  lanternLight: { color: 0xff9040, intensity: 20, distance: 11 },
  buildBackdrop(sky, bounds, rnd, yBase) {
    lavaSea(sky, bounds, rnd, yBase, { y: -16 });
    towerRing(sky, bounds, rnd, yBase + 6);
  },
};
