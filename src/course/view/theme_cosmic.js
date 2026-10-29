// Thema `cosmic` (Bonuswelt Stern: S-9 futuristischer Weltraum mit Kanonen-Helm, Schienenbrettern und Kugelwand): tiefes
// Violett-Schwarz mit Neon-Raumstation ringsum – leuchtende Ringe, schlanke Türme mit Kristallköpfen, Gitterflächen,
// sanft pulsierende Lichtstrahlen –, Sterne, Sternschnuppen und ein cyanfarbener Gasplanet. Gelände: helles Metall mit
// Cyan-Kanten. Registriert in view/themes.js (eine Zeile).
import { spaceSky, cosmicStation, animateStar } from './backdrop_star.js';

export const COSMIC_THEME = {
  label: 'Kanonen-Kosmos',
  sky: [[1, 0x04020e], [0.5, 0x0c0626], [0.15, 0x1e0e4a], [0.02, 0x3a1a6a], [0, 0x441e78], [-0.25, 0x14082e], [-1, 0x04020c]],
  background: 0x0e0624,
  fog: { color: 0x1e0e40, near: 100, far: 360 },
  hemi: { sky: 0xc8e8ff, ground: 0x5a3aa8, intensity: 1.25 },
  sun: { color: 0xf0f4ff, intensity: 2.6, dir: [-0.4, 1, 0.5] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'cosmic',
  ground: null,
  grassTop: 0xe6ecf8, grassTop2: 0xd8e0f0, grassRim: 0x8af4ff, grassSide: 0x7a84a8,
  dirt: 0x4a4e70, dirtDeep: 0x2a2c48, rock: 0x6a6e90, rockDeep: 0x3a3c58,
  checker: false,
  stone: 0xeef2fa, stoneDark: 0x9aa2c0,
  wood: 0xdfe6f4, woodDark: 0x8a94b0,
  climb: 0xd8e4ff, climbDark: 0x8a9ac8,
  water: 0x4ae8ff, waterDeep: 0x1a6ad8,
  lava: 0xff4ad8,
  lights: [],
  toy: { rim: 1.4, spec: 1.7 },
  buildBackdrop(sky, bounds, rnd, yBase) {
    const f = spaceSky(sky, rnd, {
      stars: 1300, shooting: 4,
      nebulae: [{ dir: [-0.6, 0.3, -1], size: 230, color: 0xff3ad8, aspect: 0.45 }, { dir: [0.6, 0.25, -1], size: 210, color: 0x3ac8ff, aspect: 0.4 }],
      planets: [{ dir: [0.55, 0.32, -1], r: 28, colors: [0x3ae0ff, 0xa8f8ff, 0xff8ae8], ring: true, tilt: -0.4 }],
    });
    const st = cosmicStation(sky, bounds, rnd, yBase, { n: 22 });
    f.beamMat = st.beamMat;
    sky.star = f;
  },
  updateBackdrop(sky, dt, camera) { animateStar(sky.star, dt, camera); },
};
