// Thema `bossblitz` (Bonuswelt Blume: B-12 Boss-Marathon im Weltraum bei Nacht): Nacht-Weltraum-Arena – tiefes Blauschwarz
// mit großem, kühlem Mond, Sternen und Sternschnuppen; ringsum Lichtmasten mit warmen und kalten Scheinwerfer-Kegeln zur
// Mitte und schwebende Ringe (Tribünen-Andeutung). Kräftiges Randlicht an den Figuren. Gelände: dunkelvioletter Arena-Stein
// mit goldenen Kanten. Registriert in view/themes.js (eine Zeile).
import { spaceSky, arenaNight, animateStar } from './backdrop_star.js';

export const BOSSBLITZ_THEME = {
  label: 'Blitz-Arena',
  sky: [[1, 0x020210], [0.5, 0x060828], [0.15, 0x101848], [0.02, 0x22306a], [0, 0x2a3878], [-0.25, 0x0c1030], [-1, 0x02020c]],
  background: 0x0a0e2a,
  fog: { color: 0x141a40, near: 90, far: 330 },
  hemi: { sky: 0xb8c8ff, ground: 0x4a3a7a, intensity: 1.05 },
  sun: { color: 0xd8e4ff, intensity: 2.2, dir: [-0.35, 1, 0.45] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'bossblitz',
  ground: null,
  grassTop: 0x6a5aa8, grassTop2: 0x5e4e9a, grassRim: 0xffd86a, grassSide: 0x3a2e6a,
  dirt: 0x3a2e5a, dirtDeep: 0x1e1838, rock: 0x4a4268, rockDeep: 0x2a2440,
  checker: false,
  stone: 0xc8c0e8, stoneDark: 0x6a62a0,
  wood: 0xb8a0d8, woodDark: 0x6a5a98,
  climb: 0xa898d8, climbDark: 0x5a4a90,
  water: 0x4ab8ff, waterDeep: 0x1a4ab8,
  lava: 0xff6a1a,
  lights: [],
  toy: { rim: 1.7, spec: 1.4, fill: 0.1 },
  buildBackdrop(sky, bounds, rnd, yBase) {
    const f = spaceSky(sky, rnd, {
      stars: 1400, shooting: 5,
      nebulae: [{ dir: [0.5, 0.3, -1], size: 220, color: 0x4a5aff, aspect: 0.45 }],
      planets: [{ dir: [-0.45, 0.38, -1], r: 40, colors: [0xe8eeff, 0xb8c4e8, 0xffffff], ring: false, tilt: 0.1 }],
    });
    const a = arenaNight(sky, bounds, rnd, yBase, { n: 12 });
    f.coneMat = a.coneMat;
    f.dots.push(a.lamps);
    sky.star = f;
  },
  updateBackdrop(sky, dt, camera) { animateStar(sky.star, dt, camera); },
};
