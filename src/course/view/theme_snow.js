// Thema `snow` (Welt 3: 3-1 Schneefeld, Eisbahn): klarer Wintertag – blasser, hoher Himmel, tiefe Sonne mit warmem
// Licht und weichen blauen Schatten (blaues Bodenlicht), verschneite Hügel und Berge ringsum, sparsamer Schneefall
// (ein Punkte-Objekt vor der Kamera). Gelände: Schneedecken mit bläulicher Flanke, eisblau-grauer Fels als Körper.
// Registriert in view/themes.js (eine Zeile).
import { hillRing } from './backdrop_w2.js';
import { fallingParticles, animateFall } from './backdrop_w3.js';

export const SNOW_THEME = {
  label: 'Schneefeld',
  sky: [[1, 0x5a8ad0], [0.45, 0x84b2e6], [0.15, 0xbcd8f4], [0.03, 0xe6f0fc], [0, 0xf4f8ff], [-0.1, 0xdce8f6], [-1, 0xc0d4ec]],
  background: 0xe6f0fc,
  fog: { color: 0xe4eefa, near: 62, far: 240 },
  hemi: { sky: 0xeef4ff, ground: 0x5a7ac8, intensity: 1.3 },
  sun: { color: 0xfff0dc, intensity: 2.45, dir: [-0.45, 0.9, 0.45] },
  shadows: true,
  sunDisc: true,
  clouds: true,
  backdrop: 'snowhills',
  ground: { color: 0xeef4fc, y: -30 },
  grassTop: 0xf8fbff, grassTop2: 0xf0f5fd, grassRim: 0xffffff, grassSide: 0xbcd2ee,
  dirt: 0x8e9cb8, dirtDeep: 0x5c6a8a, rock: 0x8a94a8, rockDeep: 0x5a6478,
  checker: false,
  stone: 0xeef2fa, stoneDark: 0xb4c2d8,
  wood: 0xf4ece0, woodDark: 0xb89a7a,
  climb: 0xe8eef8, climbDark: 0xa8b8d0,
  water: 0x7ad0f0, waterDeep: 0x2a7ac8,
  lava: 0xff6a1a,
  iceBody: 0x9ac4e6,
  lights: [],
  snowfall: { n: 260, size: 0.2, fall: 1.3 },
  buildBackdrop(sky, bounds, rnd, yBase) {
    hillRing(sky, bounds, rnd, yBase, { near: [0xffffff, 0xc4d8f0], far: [0xf4f8ff, 0xb4c8e6], peaks: [0x8aa4d2, 0xffffff] });
    const sf = sky.theme.snowfall;
    if (sf) sky.snowfall = fallingParticles(sky, rnd, { n: sf.n, size: sf.size, fall: sf.fall, sway: 0.7, kind: 'snow', opacity: 0.85 });
  },
  updateBackdrop(sky, dt, camera) { animateFall(sky.snowfall, dt, camera); },
};
