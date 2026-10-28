// Thema `darkghost` (Welt 8: 8-6 stockdunkles Spukhaus, Licht-Helm-Pflicht, großer Spiegel): fast völlige Dunkelheit – nur
// schemenhafte Wände mit Vorhangfalten, freundliche Geisteraugen, die im Dunkeln blinzeln, schwebender Staub. Licht gibt es
// nur nah an der Figur (schwaches Figurenlicht, kräftiges Randlicht) und vom Licht-Helm (Kegel), von Kerzen (deco_w8
// kerzenleuchter → Laternenlicht) und Leuchtstegen. Gelände: dunkles Parkett, violette Tapete. Registriert in view/themes.js
// (eine Zeile).
import { ghostDark, animateW8 } from './backdrop_w8.js';

export const DARKGHOST_THEME = {
  label: 'Finsteres Spukhaus',
  sky: [[1, 0x000000], [0.3, 0x030206], [0, 0x06040a], [-1, 0x000000]],
  background: 0x030206,
  fog: { color: 0x030206, near: 9, far: 42 },
  hemi: { sky: 0x5a4a8a, ground: 0x08060c, intensity: 0.14 },
  sun: { color: 0x8a7ac8, intensity: 0.1, dir: [-0.3, 1, 0.4] },
  shadows: false,
  sunDisc: false,
  clouds: false,
  backdrop: 'darkghost',
  ground: null,
  grassTop: 0x4a3a2a, grassTop2: 0x443424, grassRim: 0x6a5a4a, grassSide: 0x2a1e2e,
  dirt: 0x2a1e2e, dirtDeep: 0x140e18, rock: 0x2e2434, rockDeep: 0x18121c,
  checker: false,
  stone: 0x5a4a6a, stoneDark: 0x2e2438,
  wood: 0x5a3a24, woodDark: 0x2e1c12,
  climb: 0x4a3a52, climbDark: 0x2a2030,
  water: 0x3a5a8a, waterDeep: 0x1a2a4a,
  lava: 0xff6a1a,
  lights: [],
  playerLight: { color: 0xc8b8ff, intensity: 7, distance: 5.5 },
  lanternLight: { color: 0xffc070, intensity: 16, distance: 7 },
  toy: { rim: 2.0, spec: 1.2, fill: 0.1 },
  buildBackdrop(sky, bounds, rnd, yBase) { sky.w8 = ghostDark(sky, bounds, rnd, yBase, { y: -6 }); },
  updateBackdrop(sky, dt, camera) { animateW8(sky.w8, dt, camera); },
};
