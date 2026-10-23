// Thema `poison` (Welt 4: 4-2 Rankenschnapper-Bach): lila-grüner Giftwald im Dämmerlicht – violetter Himmel, dichter
// lila Dunst (naher Nebel), grünliches Licht, glimmende Sporen steigen auf. Kulisse: knorrige Giftbäume mit violetten
// Schirmkronen, Leuchtpilze am Fuß (unbeleuchtet hell), tief unten ein lila Giftsumpf mit Schlieren. Gelände: dunkles
// Moosgrün auf violetter Erde. Das tödliche Giftwasser im Spiel ist der Baustein `giftwasser`. Registriert in themes.js.
import { poisonForest, poisonMarsh } from './backdrop_w4.js';
import { fallingParticles, animateFall } from './backdrop_w3.js';

export const POISON_THEME = {
  label: 'Giftwald',
  sky: [[1, 0x140a28], [0.45, 0x2c164c], [0.15, 0x4e2c70], [0.03, 0x705284], [0, 0x80708a], [-0.2, 0x2e2a36], [-1, 0x0c0a16]],
  background: 0x4c3c62,
  fog: { color: 0x5c4a72, near: 28, far: 150 },
  hemi: { sky: 0xccacff, ground: 0x3c5e2c, intensity: 1.05 },
  sun: { color: 0xdcf2aa, intensity: 1.7, dir: [-0.3, 1, 0.5] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'poison',
  ground: { color: 0x2a1a3a, y: -24 },
  grassTop: 0x5c9c4c, grassTop2: 0x4e8e46, grassRim: 0x8eca6c, grassSide: 0x3c6c3c,
  dirt: 0x5c3c6c, dirtDeep: 0x361e46, rock: 0x6c5c7c, rockDeep: 0x3c2e4c,
  checker: false,
  stone: 0xcac2da, stoneDark: 0x8c7ca2,
  wood: 0x9c7c6c, woodDark: 0x5c4238,
  climb: 0x8cb26c, climbDark: 0x4c6c3c,
  water: 0x6c4cb2, waterDeep: 0x2c1a6c,
  lava: 0xff6a1a,
  lights: [],
  playerLight: { color: 0xc8ff9a, intensity: 7, distance: 9 },
  buildBackdrop(sky, bounds, rnd, yBase) {
    poisonMarsh(sky, bounds, rnd, yBase + (this.ground?.y ?? -24) + 1.5);
    poisonForest(sky, bounds, rnd, yBase);
    sky.spores = fallingParticles(sky, rnd, { n: 170, size: 0.17, fall: -0.45, sway: 0.9, colors: [0xbaff6a, 0xe2a2ff, 0x8affd8], opacity: 0.85 });
  },
  updateBackdrop(sky, dt, camera) { animateFall(sky.spores, dt, camera); },
};
