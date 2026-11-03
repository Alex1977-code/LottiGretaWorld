// P-3 „Spukfloß im Finsterdschungel“ – Remix von 6-4 „Floßfahrt durch den Giftsee-Dschungel“ (Bauplan Welt Pilz, Detail P-3:
// stockdunkel; 4 Licht-Helme am Start (Licht und Waffe); Floßfahrt mit Spuken, Großspuken und Kreisgeistern; am Ende 3 Großspuke
// besiegen → Ziel-Warp-Box; 400 s). Basis als Daten (remixOf, levels/w6/6-4.js bleibt unverändert). Musik der Basis
// (course_jungle) mit Klang-Variante 'dunkel', Thema jungle@dunkel (fast schwarz, naher Nebel, kräftiges Figurenlicht), kein
// Stempel.
//
// Ablauf wie in der Basis: Startufer → Floß 1 (≈ 92 m) → Checkpoint-Insel → Floß 2 (≈ 92 m) mit Abwärtsströmung → Landeinsel →
//   (Warp-Box) Ruinenplateau mit Zielmast. Statt der Brummer schweben Spuke und Großspuke über dem Floßweg (sie folgen, wenn
//   man wegschaut; der Lichtkegel des Licht-Helms löst sie auf), statt der Rankenschnapper kreisen Kreisgeister über dem
//   Gift. Auf der Landeinsel warten drei Großspuke: erst wenn alle im Licht verblasst sind (Kampfraum), erscheint die
//   Ziel-Warp-Box. Licht-Helme: vier am Start, zwei auf der Checkpoint-Insel, einer auf der Landeinsel (liegen nach dem
//   Aufheben wieder da).
// Sterne (Index): 0 nahe dem Start über einer Kettenreihe (Kettenzaun im Gift links vom Steg: hinaufklettern, über ihm
//   springen), 1 unsichtbare Plattform im 2. Abschnitt (über dem Floßweg; der Lichtkegel macht sie sichtbar – vom Floß
//   hinaufspringen), 2 über der Ziel-Warp-Box per Wandsprung (zwei Felswände neben der Box).
// Weggefallen: Sternenring, Baumhaus-Stern und Felswand-Stern der Basis, Stempel.

import { remixOf } from '../../level/remix.js';
import { lichtplattformen, line } from './_helpers_pa.js';

const WS = 0.4, Y1 = 1.0, YL = -3.0;
const WARP = [5, YL, -256];

/** Spuk bzw. Großspuk über dem Floßweg. */
const spuk = (id, x, y, z, o = {}) => ({ kind: 'spuk', id, pos: [x, y, z], sight: 11, ...o });
const gross = (id, x, y, z, o = {}) => spuk(id, x, y, z, { size: 2.5, speed: 0.85, fade: 2.2, ...o });
/** Kreisgeist über dem Gift (kreist um center). */
const kreis = (id, x, z, o = {}) => ({ kind: 'kreisgeist', id, center: [x, 1.4, z], radius: 2.4, speed: 1.5, ...o });
const helm = (id, x, y, z) => ({ kind: 'helm_licht', id, pos: [x, y, z], respawn: 5 });

export const LEVEL = remixOf('6-4', {
  id: 'P-3',
  world: 10,
  title: 'Spukfloß im Finsterdschungel',
  light: 'dunkel',
  music: { variant: 'dunkel' },
  timeLimit: 400,
  stamp: false,
  remove: [
    { kind: ['brummer', 'rankenschnapper', 'starring'] },
  ],
  // die End-Warp-Box erscheint erst, wenn die drei Großspuke der Landeinsel besiegt sind
  change: [{ match: { id: 'warp' }, set: { hidden: true } }],
  stars: [
    [-11.4, 5.9, -10.6],                       // 0: über der Kettenreihe links vom Steg
    [-5, 4.4, -40.4],                          // 1: auf der unsichtbaren Plattform über dem Floßweg
    [WARP[0], YL + 8.6, WARP[2]],              // 2: über der Ziel-Warp-Box (Wandsprung)
  ],
  add: {
    segments: [
      // Kettenreihe: drei Kettenzäune im Gift links vom Steg (Stern 0 darüber)
      { type: 'kettenzaun', id: 'kette1', pos: [-5.0, WS - 0.8, -10.6], size: [3, 4.2], solid: true },
      { type: 'kettenzaun', id: 'kette2', pos: [-8.2, WS - 0.8, -10.6], size: [3, 4.2], solid: true },
      { type: 'kettenzaun', id: 'kette3', pos: [-11.4, WS - 0.8, -10.6], size: [3, 4.2], solid: true },
      // Felswände neben der Ziel-Warp-Box (Wandsprung-Schacht, Stern 2 darüber)
      { type: 'wall', pos: [WARP[0] - 2.2, YL, WARP[2]], size: [0.8, 8, 3], style: 'stone' },
      { type: 'wall', pos: [WARP[0] + 2.2, YL, WARP[2]], size: [0.8, 8, 3], style: 'stone' },
      { type: 'sign', pos: [4.6, Y1, 2.6], text: 'Licht-Helm\naufsetzen!', size: [2.2, 0.8] },
      { type: 'sign', pos: [-8.6, YL, -251], text: 'Drei Großspuke –\nleuchte sie weg!', size: [2.8, 0.9] },
    ],
    enemies: [
      // Floß 1: Spuke und Großspuke über dem Weg (statt der Brummer)
      spuk('spuk1', -3, 2.2, -30),
      gross('gspuk1', 2, 2.4, -50, { sight: 10 }),
      spuk('spuk2', 4, 2.2, -70),
      spuk('spuk3', -1, 2.2, -88),
      // Floß 2: Kreisgeister über dem Gift (statt der Rankenschnapper), ein Großspuk
      kreis('kg1', 0, -126), kreis('kg2', 6, -147, { cw: true, phase: 0.3 }), kreis('kg3', 6, -153.5, { phase: 0.7 }),
      kreis('kg4', -4, -175, { cw: true, phase: 0.2 }), kreis('kg5', 0, -197, { phase: 0.5 }),
      gross('gspuk2', -1, 2.4, -165, { sight: 10 }),
      // Landeinsel: drei Großspuke bewachen die Ziel-Warp-Box
      gross('ende1', -6, YL + 1.2, -258),
      gross('ende2', 0, YL + 1.2, -262),
      gross('ende3', 7.5, YL + 1.2, -260.5),
    ],
    items: [
      // vier Licht-Helme am Start, Nachschub auf der Checkpoint-Insel und der Landeinsel
      helm('helm1', -2.4, Y1, 2.2), helm('helm2', -0.8, Y1, 2.8), helm('helm3', 0.8, Y1, 2.8), helm('helm4', 2.4, Y1, 2.2),
      helm('helm5', 1, Y1, -102.6), helm('helm6', 3, Y1, -102.6),
      helm('helm7', -9, YL, -253),
      { kind: 'kampfraum', id: 'grossspuke', area: { min: [-12.5, YL - 2, -266.5], max: [12.5, YL + 9, -248] }, ids: ['ende1', 'ende2', 'ende3'],
        onClear: { reveal: 'warp' }, banner: 'Alle Großspuke vertrieben!' },
      line([-5, 4.3, -34.4], [-5, 4.3, -38.4], 3),
    ],
  },
  build(level) {
    // unsichtbare Plattform über dem Floßweg (x −5, z −32 … −42): von unten durchspringbar, im Lichtkegel sichtbar
    lichtplattformen(level, [{ id: 'lichtsteg', pos: [-5, 3.3, -37], size: [2.2, 0.4, 10] }]);
  },
  marks: {
    start: [0, Y1, 6], kette: [-5, Y1, -6.4], steg: [0, Y1, -7.4], floss1: [0, WS, -9.5], cp: [-2, Y1, -100], floss2: [0, WS, -116.3],
    landung: [0, YL, -250], warp: WARP, ziel: [0, 9, -284],
  },
});
