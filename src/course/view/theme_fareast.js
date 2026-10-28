// Thema `fareast` (Welt 6: 6-3 Fernost-Halle): eigene, liebevolle Fantasie-Gestaltung – pastellfarbener Morgen (pfirsich,
// rosa, himmelblau), neblige Berge, Hallen mit geschwungenen Dächern, blühende Kirschbäume, schwebende Papierlaternen und
// fallende Blüten. Keine realen religiösen Symbole. Gelände: helle Holz-/Mattenböden, rot lackierte Kanten, dunkles Holz.
// Papier-Schiebetüren und Gong liefert w6_hall, Laternen/Bambus deco_w6. Registriert in view/themes.js (eine Zeile).
import { fareastValley, animateLanterns } from './backdrop_w6.js';
import { fallingParticles, animateFall } from './backdrop_w3.js';

export const FAREAST_THEME = {
  label: 'Fernost-Halle',
  sky: [[1, 0x4a7ad8], [0.45, 0x8ab4ee], [0.15, 0xf0c8d8], [0.03, 0xffe0c8], [0, 0xfff0e0], [-0.12, 0xf0dce8], [-1, 0xc8b8d8]],
  background: 0xfbe8e4,
  fog: { color: 0xf8e4e4, near: 60, far: 240 },
  hemi: { sky: 0xffe8f0, ground: 0x9a7a5a, intensity: 1.3 },
  sun: { color: 0xfff0d8, intensity: 2.5, dir: [-0.5, 0.8, 0.5] },
  shadows: true,
  sunDisc: true,
  clouds: true,
  backdrop: 'fareast',
  ground: null,
  grassTop: 0xe8d4a8, grassTop2: 0xdcc496, grassRim: 0xf6e8c8, grassSide: 0xb8443a,
  dirt: 0x8a5a3a, dirtDeep: 0x5a3a24, rock: 0x9a8a8a, rockDeep: 0x5e5252,
  checker: false,
  stone: 0xece4d6, stoneDark: 0xb0a490,
  wood: 0xd8a868, woodDark: 0x8a5a32,
  climb: 0xe0c08a, climbDark: 0xa07a48,
  water: 0x5ac8e8, waterDeep: 0x2a7ab8,
  lava: 0xff6a1a,
  lights: [],
  lanternLight: { color: 0xffb860, intensity: 18, distance: 10 },
  buildBackdrop(sky, bounds, rnd, yBase) {
    sky.lanterns = fareastValley(sky, bounds, rnd, yBase, { lanterns: 24 });
    sky.petals = fallingParticles(sky, rnd, { n: 120, size: 0.28, fall: 0.6, sway: 1.1, colors: [0xffb8d8, 0xffd8e8, 0xffffff], kind: 'leaf', opacity: 0.9 });
  },
  updateBackdrop(sky, dt, camera) { animateLanterns(sky.lanterns, dt); animateFall(sky.petals, dt, camera); },
};
