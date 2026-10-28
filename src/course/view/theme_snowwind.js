// Thema `snowwind` (Welt 6: 6-5 Windböen über verschneiten Wolkenbergen): kalter, windiger Tag – blassblau-grauer Himmel,
// tiefe, weiße Sonne; verschneite Gipfel ragen aus dem Wolkenmeer, waagerechtes Schneetreiben weht vorbei (Böen).
// Gelände: Schneedecken mit eisblauer Flanke, blaugrauer Fels. Registriert in view/themes.js (eine Zeile).
import { cloudFloor, cloudPeaks, blizzard, animateBlizzard } from './backdrop_w6.js';

export const SNOWWIND_THEME = {
  label: 'Windige Schneegipfel',
  sky: [[1, 0x4a6aa8], [0.45, 0x7a9ac8], [0.15, 0xb8cce4], [0.03, 0xe0eaf6], [0, 0xf0f4fa], [-0.12, 0xd4e0ee], [-1, 0xb0c4dc]],
  background: 0xe2eaf6,
  fog: { color: 0xdce6f2, near: 55, far: 230 },
  hemi: { sky: 0xeef4ff, ground: 0x6a86c0, intensity: 1.3 },
  sun: { color: 0xfff6ec, intensity: 2.3, dir: [-0.5, 0.75, 0.45] },
  shadows: true,
  sunDisc: true,
  clouds: true,
  backdrop: 'snowpeaks',
  ground: null,
  grassTop: 0xf6faff, grassTop2: 0xeef4fc, grassRim: 0xffffff, grassSide: 0xb4cae8,
  dirt: 0x8a98b4, dirtDeep: 0x56648a, rock: 0x8a94a8, rockDeep: 0x5a6478,
  checker: false,
  stone: 0xeef2fa, stoneDark: 0xb4c2d8,
  wood: 0xf0e6d8, woodDark: 0xa8906e,
  climb: 0xe8eef8, climbDark: 0xa8b8d0,
  water: 0x7ad0f0, waterDeep: 0x2a7ac8,
  lava: 0xff6a1a,
  iceBody: 0x9ac4e6,
  lights: [],
  buildBackdrop(sky, bounds, rnd, yBase) {
    const y = Math.min(bounds.min.y, yBase) - 26;
    cloudFloor(sky, bounds, rnd, y, { n: 60, shade: 0xdce6f2, deep: 0xb4c4dc });
    cloudPeaks(sky, bounds, rnd, y, { n: 16, snow: 0.3, green: 0xd8e6f8, greenD: 0xa8bcd8, pine: 0x3a6a5a, pineD: 0x22443a });
    sky.blizzard = blizzard(sky, rnd, { n: 280, wind: [7, -1.5] });
  },
  updateBackdrop(sky, dt, camera) { animateBlizzard(sky.blizzard, dt, camera); },
};
