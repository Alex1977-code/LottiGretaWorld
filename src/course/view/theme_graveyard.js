// Thema `graveyard` (Halloween-Welt: H-3 Nebelfriedhof): Mondnacht in kühlem Blau-Lila – heller Mond mit Schein, Sterne,
// Bodennebel in Bänken rund um den Friedhof (treibt langsam), Hügel mit Grabsteinen und Kreuzen, kahle Bäume, eine
// kleine Kapelle mit warmem Fenster, schwebende Irrlichter. Kühles Mondlicht, Licht an der Figur und an Laternen
// (Laternenlicht macht Geisterplattformen sichtbar). Gelände: blau-grünes Gras, kühler Stein. Bodennebel im Level:
// Baustein `nebel`. Registriert in view/themes.js (eine Zeile).
import { graveHills, fogBanks, animateFog, faceMoon } from './backdrop_hw.js';
import { starField } from './backdrop_w2.js';
import { fallingParticles, animateFall } from './backdrop_w3.js';

export const GRAVEYARD_THEME = {
  label: 'Nebelfriedhof',
  sky: [[1, 0x050818], [0.4, 0x0e1838], [0.14, 0x1e2a5a], [0.03, 0x3a3a78], [0, 0x4a4888], [-0.2, 0x1a1a3a], [-1, 0x080814]],
  background: 0x161c3e,
  fog: { color: 0x26305e, near: 30, far: 145 },
  hemi: { sky: 0x98a8ff, ground: 0x2a2450, intensity: 0.95 },
  sun: { color: 0xb0c0ff, intensity: 1.75, dir: [-0.3, 1, 0.42] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'graveyard',
  ground: { color: 0x182432, y: -16 },
  grassTop: 0x5a907e, grassTop2: 0x508472, grassRim: 0x9ad0c0, grassSide: 0x3a5e56,
  dirt: 0x4a3e5e, dirtDeep: 0x2a2440, rock: 0x6a6a8a, rockDeep: 0x3a3a58,
  checker: false,
  stone: 0xc0c0d8, stoneDark: 0x7a7a98,
  wood: 0xa88a6a, woodDark: 0x5a4a3a,
  climb: 0xb8b0c8, climbDark: 0x7a7090,
  water: 0x4a7ad8, waterDeep: 0x2a3a8a,
  lava: 0xff6a1a,
  lights: [],
  playerLight: { color: 0xd0d8ff, intensity: 8, distance: 10 },
  lanternLight: { color: 0xffb860, intensity: 18, distance: 10 },
  buildBackdrop(sky, bounds, rnd, yBase) {
    graveHills(sky, bounds, rnd, yBase);
    starField(sky, rnd, 520, { size: 1.8, tints: [0xffffff, 0xd8e0ff, 0xc8d0ff] });
    faceMoon(sky, [-0.4, 0.4, -1], 19, { face: false, color: 0xf0f4ff });
    sky.fogBanks = fogBanks(sky, bounds, rnd, Math.min(bounds.min.y, 0) - 2.5, { layers: 2, opacity: 0.5, color: 0xc0c8f0 });
    sky.wisps = fallingParticles(sky, rnd, { n: 40, size: 0.18, fall: -0.12, sway: 1.2, colors: [0xa8f0ff, 0xd8ffe8], opacity: 0.85 });
  },
  updateBackdrop(sky, dt, camera) { animateFog(sky.fogBanks, dt); animateFall(sky.wisps, dt, camera); },
};
