// Thema `nightfort` (Welt 8: 8-4 Nacht-Festung mit unsichtbaren Leuchtstegen): sehr dunkel – fast schwarzer Nachthimmel mit
// blassen Sternen, ringsum schwarze Turm-Silhouetten mit ganz wenigen Fensterlichtern. Die Leuchtstege (Baustein leuchtsteg)
// sind die einzige richtige Lichtquelle; die Figuren bleiben trotzdem lesbar: kühles Licht an der Figur und ein kräftiges
// Randlicht (Spielzeug-Look). Gelände: schwarzblauer Festungsstein. Registriert in view/themes.js (eine Zeile).
import { nightFort, animateW8 } from './backdrop_w8.js';

export const NIGHTFORT_THEME = {
  label: 'Nacht-Festung',
  sky: [[1, 0x020208], [0.4, 0x05060e], [0.1, 0x0a0c18], [0, 0x10121e], [-1, 0x020206]],
  background: 0x05060c,
  fog: { color: 0x05060c, near: 22, far: 90 },
  hemi: { sky: 0x4a5a8a, ground: 0x0a0a14, intensity: 0.32 },
  sun: { color: 0x8a9ad8, intensity: 0.22, dir: [-0.3, 1, 0.4] },
  shadows: false,
  sunDisc: false,
  clouds: false,
  backdrop: 'nightfort',
  ground: null,
  grassTop: 0x2a3044, grassTop2: 0x262c3e, grassRim: 0x4a5270, grassSide: 0x161a26,
  dirt: 0x1a1e2a, dirtDeep: 0x0c0e16, rock: 0x262a38, rockDeep: 0x12141c,
  checker: false,
  stone: 0x4a5068, stoneDark: 0x262a3a,
  wood: 0x3a2a22, woodDark: 0x1e1612,
  climb: 0x3a4058, climbDark: 0x20242e,
  water: 0x2a4a7a, waterDeep: 0x10203a,
  lava: 0xff6a1a,
  lights: [],
  playerLight: { color: 0xd8e4ff, intensity: 16, distance: 9 },
  lanternLight: { color: 0xffd890, intensity: 14, distance: 8 },
  toy: { rim: 1.9, spec: 1.4, fill: 0.12 },
  buildBackdrop(sky, bounds, rnd, yBase) { sky.w8 = nightFort(sky, bounds, rnd, yBase, { y: -16 }); },
  updateBackdrop(sky, dt, camera) { animateW8(sky.w8, dt, camera); },
};
