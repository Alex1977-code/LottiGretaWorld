// Thema `rainfort` (Welt 8: 8-1 regnerische Außenfestung mit Stachelbrücken): eine Burg im Dauerregen – grau-violetter
// Gewitterhimmel ohne Schreck (nur sanftes Wetterleuchten hinter den Wolken, keine Blitze), Regenstriche um die Kamera, ringsum
// Türme und Mauern im Dunst mit warmen Fensterlichtern, deren Spiegelbilder im nassen Burggraben schimmern; tiefe Wolkenbänke.
// Gelände: nasser Schieferstein mit Moos, glänzend (Spielzeug-Look mit kräftigem Glanzlicht = nass). Registriert in
// view/themes.js (eine Zeile).
import { rainFort, rain, animateRain, softStorm, animateSoftStorm, animateW8 } from './backdrop_w8.js';

export const RAINFORT_THEME = {
  label: 'Regenfestung',
  sky: [[1, 0x2a2a44], [0.45, 0x3e4260], [0.15, 0x5a6080], [0.03, 0x7a8098], [0, 0x8a90a6], [-0.2, 0x4a5066], [-1, 0x1e2232]],
  background: 0x5a6078,
  fog: { color: 0x6a7088, near: 32, far: 150 },
  hemi: { sky: 0xc0c8e8, ground: 0x4a5262, intensity: 1.2 },
  sun: { color: 0xe0e4ff, intensity: 1.5, dir: [-0.3, 1, 0.45] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'rainfort',
  ground: null,
  grassTop: 0x6a8a6a, grassTop2: 0x5e7e60, grassRim: 0x9ab89a, grassSide: 0x4a5a5e,
  dirt: 0x4a5058, dirtDeep: 0x2a2e36, rock: 0x5a6070, rockDeep: 0x30343e,
  checker: false,
  stone: 0xa8b0c4, stoneDark: 0x5e667a,
  wood: 0x7a5a42, woodDark: 0x4a3424,
  climb: 0x9aa0b4, climbDark: 0x5a6074,
  water: 0x5a8ab8, waterDeep: 0x2a4a7a,
  lava: 0xff6a1a,
  lights: [],
  toy: { spec: 2.1, rim: 1.35 },
  buildBackdrop(sky, bounds, rnd, yBase) {
    sky.w8 = rainFort(sky, bounds, rnd, yBase, { y: -14 });
    sky.w8rain = rain(sky, rnd, { n: 520, fall: 15 });
    sky.w8storm = softStorm(sky, rnd, { strength: 0.4 });
  },
  updateBackdrop(sky, dt, camera) { animateW8(sky.w8, dt, camera); animateRain(sky.w8rain, dt, camera); animateSoftStorm(sky.w8storm, dt); },
};
