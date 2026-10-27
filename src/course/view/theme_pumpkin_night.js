// Thema `pumpkin_night` (Halloween-Welt: H-Kapitän, Diorama „Kürbislabyrinth bei Nacht“): dieselben Kürbisfelder wie
// `pumpkin`, aber in tiefblau-lila Nacht unter einem Mond mit freundlichem Gesicht; überall leuchten geschnitzte
// Kürbisgesichter, Glühwürmchen tanzen. Kühles Mondlicht von oben, warme Lichter (Laternen, Kürbislaternen) – Figuren
// bleiben über das Figurenlicht und das Spielzeug-Randlicht gut lesbar. Für Dioramen: weiter Blick, kein Bodennebel.
// Registriert in view/themes.js (eine Zeile).
import { pumpkinFields, faceMoon } from './backdrop_hw.js';
import { starField } from './backdrop_w2.js';
import { fallingParticles, animateFall } from './backdrop_w3.js';

export const PUMPKIN_NIGHT_THEME = {
  label: 'Kürbisnacht',
  sky: [[1, 0x080620], [0.4, 0x15103a], [0.14, 0x2a1e5a], [0.03, 0x4a2a6a], [0, 0x5a3070], [-0.2, 0x1e1238], [-1, 0x0a0614]],
  background: 0x161036,
  fog: { color: 0x1c1440, near: 40, far: 180 },
  hemi: { sky: 0x9a90e8, ground: 0x4a2a40, intensity: 0.9 },
  sun: { color: 0xb8c0ff, intensity: 1.5, dir: [-0.35, 1, 0.5] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'pumpkin_night',
  ground: { color: 0x22182a, y: -20 },
  grassTop: 0x6a9a58, grassTop2: 0x5e8c50, grassRim: 0xa8d090, grassSide: 0x3a5a3a,
  dirt: 0x5a3a3a, dirtDeep: 0x34202a, rock: 0x5a5070, rockDeep: 0x34304a,
  checker: false,
  stone: 0xc0b8d8, stoneDark: 0x7a7090,
  wood: 0xb8845a, woodDark: 0x6a4630,
  climb: 0xc8a888, climbDark: 0x8a6a58,
  water: 0x4a7ad8, waterDeep: 0x2a3a8a,
  lava: 0xff6a1a,
  lights: [],
  playerLight: { color: 0xffd0a0, intensity: 12, distance: 12 },
  lanternLight: { color: 0xffa040, intensity: 20, distance: 11 },
  buildBackdrop(sky, bounds, rnd, yBase) {
    pumpkinFields(sky, bounds, rnd, yBase, { night: true });
    starField(sky, rnd, 520, { size: 1.8, tints: [0xffffff, 0xffe8c8, 0xd8d0ff] });
    faceMoon(sky, [-0.3, 0.42, -1], 17);
    sky.flies = fallingParticles(sky, rnd, { n: 60, size: 0.16, fall: -0.15, sway: 1.4, colors: [0xd8ff6a, 0xffe060], opacity: 0.9 });
  },
  updateBackdrop(sky, dt, camera) { animateFall(sky.flies, dt, camera); },
};
