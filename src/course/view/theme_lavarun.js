// Thema `lavarun` (Welt 7: 7-3 Sprintstrecke über der Lava, 100 s): glühend heißer Himmel (tiefrot oben, orange am
// Horizont), tief unten ein hell glühender Lavasee, der dem Spieler entgegenfließt, und ein Funkenstrom, der an der
// Kamera vorbeischießt (Geschwindigkeitsgefühl); am Rand Gruppen sechseckiger Basaltsäulen mit glühendem Fuß, am Horizont
// Vulkane mit Lavaströmen. Gelände: dunkler Basalt mit glühend oranger Kante (gut lesbare Laufwege).
// Registriert in view/themes.js (eine Zeile).
import { lavaRunway, animateRunway } from './backdrop_w7.js';

export const LAVARUN_THEME = {
  label: 'Glutpiste',
  sky: [[1, 0x1a0406], [0.4, 0x4c0c08], [0.14, 0xa02a10], [0.03, 0xf0601a], [0, 0xff9a3a], [-0.2, 0xc0400e], [-1, 0x3a0a04]],
  background: 0x6a1a08,
  fog: { color: 0x8a2a0e, near: 55, far: 230 },
  hemi: { sky: 0xffc090, ground: 0xff4a10, intensity: 1.3 },
  sun: { color: 0xffd0a0, intensity: 2.3, dir: [-0.3, 1, 0.55] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'lavarunway',
  ground: null,
  grassTop: 0x5c4c52, grassTop2: 0x544448, grassRim: 0xffa050, grassSide: 0x3a2a30,
  dirt: 0x3e2e30, dirtDeep: 0x22181a, rock: 0x5a4a4e, rockDeep: 0x2e2226,
  checker: false,
  stone: 0xb8a4a0, stoneDark: 0x6a5656,
  wood: 0x9a6a44, woodDark: 0x5a3a24,
  climb: 0xb89080, climbDark: 0x7a5a50,
  water: 0x3fb4ff, waterDeep: 0x1c6fd1,
  lava: 0xff6a1a,
  lights: [],
  buildBackdrop(sky, bounds, rnd, yBase) { sky.w7 = lavaRunway(sky, bounds, rnd, yBase, { y: -9 }); },
  updateBackdrop(sky, dt, camera) { animateRunway(sky.w7, dt, camera); },
};
