// P-6 „Riesenwracks im Morgenwind“ – Remix der Welt Pilz (Bauplan Welt Pilz P-6, Basis 6-2 „Schaukelschiffe im Nebelmeer“:
// „keine Spuke; mehr Schubser, Pustewolken, Krakenpilze; Ablauf über 5 Warp-Boxen: Wrack 1 (Sternring, rollende
// Stachelwalze) → Wrack 2 mit Riesentrank, hebt sich → kippende Trümmer → Wrack 4: 8 Schubser besiegen → Kippplattform zur
// Mastspitze. Geheimnisse: Münzen unter dem gehobenen Ende von Wrack 1; unsichtbarer Extraleben-Block vorn an Wrack 2;
// unsichtbarer Riesentrank-Block auf Wrack 4. Sterne: 1) Sternring 2) schmaler Steg rechts der Warp-Box auf Wrack 2
// 3) Stegende im 2. Bereich mit Riesentrank“).
//
// Übernimmt 6-2 als Daten (remixOf) – Anleger, Kippschiffe, Kippsteg, Wrackfelsen, Laderaum, Kippbrücken, letztes Schiff und
// Zielinsel bleiben; Änderungen an 6-2 wirken hier mit. Regeln:
//   - Morgenlicht über dem Meer (Thema wreck@morgen), Musik der Basis, kein Stempel, 400 s; keine Spuke im Laderaum.
//   - Ablauf über **fünf Warp-Boxen**: (1) Wrackfelsen → **Wrack 2** (Riesenschiff abseits bei x −110: Riesentrank-?-Block,
//     zwei Schubser, Krakenpilz, Pustewolke; am Bug **hebt** eine Hebebühne die Figur auf das hohe Vorderdeck) → (2) vom
//     Vorderdeck in den Laderaum (Bauch des Wracks, Kreisgeister) → (3) Laderaum → Checkpoint, **kippende Trümmer** (drei
//     Kippbrücken, Krakenpilz, Pustewolke mit Gegenwind) und das Trümmerschiff mit zwei Schubsern → (4) Bugfelsen →
//     **Wrack 4** (Riesen-Kippschiff mit **acht Schubsern** – alle ins Meer stoßen öffnet die Warp-Box) → (5) auf den
//     **Mastturm** der Zielinsel: die **Kippplattform** (Kippsteg) führt zur Mastspitze.
//   - Wrack 1: **Sternring** (acht Sternmünzen über Anleger, Kippschiff 1 und Kippsteg), die Stachelwalzen des Walzenwerfers
//     rollen weiter, Pustewolke am Ende des Kippstegs, Krakenpilz auf dem Wrackfelsen; neben dem Anleger ragt das gehobene
//     **Wrackheck** aus einer Sandbank – darunter liegen Bitcoins.
//   - Sterne neu: 0 Sternring · 1 Ende des schmalen Stegs rechts der Warp-Box auf dem Vorderdeck von Wrack 2 · 2 Ende des
//     langen Stegs links an Wrack 2 hinter einer Steinblock-Wand (nur als Riese mit dem Riesentrank zu zertrümmern).
import { remixOf } from '../../level/remix.js';
import { LEVEL as BASIS } from '../w6/6-2.js';
import { holzsteg } from '../w6/_helpers_a.js';
import { brandung } from '../w5/_helpers_a.js';
import { wrackheck, deckPlanken, isl, line, ring } from './_helpers_pb.js';

const Y = 1;            // Decks und Inseln (wie 6-2)
const WL = -1.4;        // Wasserlinie der Kulisse
const WX = -110;        // Wrack 2 und Wrack 4 (abseits)
const BUG = Y + 4;      // hohes Vorderdeck von Wrack 2
const TT = Y + 7.5;     // Mastturm auf der Zielinsel (Kippplattform zur Mastspitze)

/** Schaumsaum um ein Rechteck (Inselrand) auf der Wasserlinie. */
const saum = (x0, x1, zA, zB, d = 0.35) => {
  const a = [x0 - d, WL, zA + d], b = [x1 + d, WL, zA + d], c = [x1 + d, WL, zB - d], e = [x0 - d, WL, zB - d];
  return [[a, b], [b, c], [c, e], [e, a]];
};

export const M6 = {
  Y, WX, BUG, TT,
  STERN0: [0, Y + 1.6, -36.2], STERN1: [WX + 14.4, BUG + 1.2, -42.5], STERN2: [WX - 20.2, Y + 1.2, -16],
  RING: [[-2.2, Y + 0.6, -1.5], [2.2, Y + 0.6, -4.2], [-1.6, Y + 0.7, -10.5], [1.6, Y + 0.7, -14.5], [0, Y + 3.3, -19.4], [-0.8, Y + 0.9, -21.6], [0, Y + 0.7, -26.5], [0, Y + 0.7, -31.2]],
  HECK: { x0: 7.2, x1: 10.8, zLow: 2.2, zHigh: -5.6, yLow: Y + 0.15, yHigh: Y + 2.9 },
  SCHUBSER4: [[-3.5, -126.5], [3.5, -126.5], [-3.5, -132.5], [3.5, -132.5], [-3.5, -138.5], [3.5, -138.5], [-3.5, -144.5], [3.5, -144.5]],
};

const schubser4 = M6.SCHUBSER4.map(([dx, z], i) => ({
  kind: 'schubser', id: `s4_${i + 1}`, pos: [WX + dx, Y, z], behavior: 'guard', sight: 3.6, warn: 0.9, push: 6.5, lift: 4.5, wake: 300,
  group: 'wrack4', ...(i === 0 ? { onGroup: [{ reveal: 'w4_aus' }, { sfx: 'powerup_appear' }] } : {}),
}));

export const LEVEL = remixOf('6-2', {
  id: 'P-6',
  world: 10,
  title: 'Riesenwracks im Morgenwind',
  light: 'morgen',
  timeLimit: 400,
  stamp: false,
  remove: [{ kind: 'spuk' }, { id: 'aufgabe_stern' }],
  change: [
    { match: { id: 'w_lr' }, set: { target: 'w2_ein' } },
    { match: { id: 'lr_in' }, set: { target: 'w2_aus' } },
    { match: { id: 'w_ziel' }, set: { target: 'w4_ein' } },
    { match: { id: 'ziel_in' }, set: { pos: [0, TT, -162.6] } },
  ],
  camera: [
    ...BASIS.camera,
    { from: 10, to: -52, pitch: 40, dist: 14, fov: 42, x: WX, xLock: 0.35, area: [WX - 30, WX + 30] },
    { from: -104, to: -164, pitch: 40, dist: 15, fov: 42, x: WX, xLock: 0.4, area: [WX - 30, WX + 30] },
  ],
  stars: [
    { pos: M6.STERN0, hidden: true, id: 'stern_ring' },
    M6.STERN1,
    M6.STERN2,
  ],
  add: {
    segments: [
      // ---------------- Wrack 1: Sandbank mit dem gehobenen Wrackheck
      isl(6.6, 11.4, 3.4, -7.2, Y, 4, { top: 'sand' }),
      // ---------------- Wrack 2 (abseits bei x −110): Anleger, Riesenschiff, Hebebühne, hohes Vorderdeck, zwei Stege
      isl(WX - 4, WX + 4, 6, -3.2, Y, 5, { top: 'rock' }),
      { type: 'kippschiff', id: 'wrack2', pos: [WX, Y, -19], length: 30, width: 12, style: 'holz', masts: 3, rails: false, maxTilt: 6, weight: 1.0, slide: 0.5, wave: { amp: 3, period: 6.5 } },
      { type: 'mover', id: 'hebebuehne', path: [[WX, Y - 0.5, -36.4], [WX, BUG - 0.5, -36.4]], size: [4, 0.5, 4], speed: 1.4, wait: 1.4, color: 'brown' },
      isl(WX - 5, WX + 5, -38.6, -46, BUG, 6, { top: 'rock' }),
      isl(WX + 5, WX + 15, -42.2, -42.8, BUG, 0.4, { top: 'none' }),                // schmaler Steg rechts der Warp-Box (Stern 1)
      isl(WX - 18.2, WX - 6.2, -14.6, -17.4, Y, 0.5, { top: 'none' }),             // langer Steg links (Stern 2)
      isl(WX - 22, WX - 18.2, -14, -18, Y, 4, { top: 'rock' }),
      { type: 'sign', pos: [WX - 7.2, Y, -13.2], text: 'Nur für Riesen!', size: [2.4, 0.8], yaw: 0 },
      // ---------------- kippende Trümmer: Pustewolke mit Gegenwind über Kippbrücke 2
      // ---------------- Wrack 4 (abseits): Anleger, Riesen-Kippschiff mit acht Schubsern, Bugfelsen
      isl(WX - 4, WX + 4, -111, -120.4, Y, 5, { top: 'rock' }),
      { type: 'kippschiff', id: 'wrack4', pos: [WX, Y, -136], length: 30, width: 12, style: 'geist', masts: 3, rails: false, maxTilt: 6, weight: 0.8, slide: 0.5, wave: { amp: 2.5, period: 6 } },
      isl(WX - 4, WX + 4, -151.6, -158.6, Y, 5, { top: 'rock' }),
      // ---------------- Zielinsel: Mastturm und Kippplattform zur Mastspitze
      isl(-2.5, 2.5, -160.4, -165.2, TT, 8, { top: 'none', color: 0x7a5a3a }),
      { type: 'kippsteg', id: 'maststeg', from: [0, TT, -165.6], to: [0, TT, -171.2], width: 1.2, style: 'holz', wave: { amp: 5, period: 3.4 } },
      { type: 'deco_w6', items: [
        { kind: 'wrackteil', pos: [10.4, Y, 2.4], yaw: 0.6 }, { kind: 'fass', pos: [7.4, Y, -6.6] }, { kind: 'anker', pos: [WX - 3.2, Y, 4.6], yaw: 0.4 },
        { kind: 'fass', pos: [WX + 3.2, Y, 4.6] }, { kind: 'kiste', pos: [WX - 3.6, BUG, -45] }, { kind: 'steuerrad', pos: [WX + 3.8, BUG, -39.6] },
        { kind: 'fass', pos: [WX + 3.4, Y, -112.4] }, { kind: 'anker', pos: [WX - 3, Y, -157.6], yaw: -0.5 },
        { kind: 'geisterschiff', pos: [WX - 26, -1, -60], length: 16, width: 6, yaw: Math.PI / 2 - 0.2, shadow: false },
        { kind: 'wrack', pos: [WX + 22, -1.2, -128], part: 'bug', yaw: 0.9, shadow: false },
      ] },
    ],
    blocks: [
      { kind: 'question', pos: [WX - 2.6, Y + 2.6, -10.5], content: 'riesentrank' },
      { kind: 'hidden', pos: [WX, BUG + 2.6, -45.2], content: 'oneup' },                     // unsichtbar vorn an Wrack 2
      { kind: 'hidden', pos: [WX, Y + 2.6, -123.6], content: 'riesentrank' },          // unsichtbar auf Wrack 4
      { kind: 'blockwand', pos: [WX - 18.8, Y, -16], size: [1, 6, 5] },                       // Steinblock-Wand vor dem Stern 2 (höher als jeder Sprung)
    ],
    enemies: [
      // Wrack 1
      { kind: 'krakenpilz', id: 'kp1', pos: [10.2, Y, 1.6], sight: 6, interval: 3.2 },                  // bewacht das Wrackheck auf der Sandbank
      { kind: 'pustewolke', id: 'pw1', pos: [0, Y + 1.6, -38.6], dir: [0, 1], reach: 6, strength: 4.5, sight: 9 },
      // Wrack 2
      { kind: 'schubser', id: 's2a', pos: [WX + 4.2, Y, -15], behavior: 'guard', sight: 3.4, warn: 0.9, push: 6.5, lift: 4.5, wake: 300 },
      { kind: 'schubser', id: 's2b', pos: [WX - 4.2, Y, -25], behavior: 'guard', sight: 3.4, warn: 0.9, push: 6.5, lift: 4.5, wake: 300 },
      { kind: 'krakenpilz', id: 'kp2', pos: [WX - 3.6, BUG, -43.4], sight: 6, interval: 3.2 },
      { kind: 'pustewolke', id: 'pw2', pos: [WX, Y + 1.6, -28.5], dir: [0, 1], reach: 6, strength: 4, sight: 9 },
      // kippende Trümmer
      { kind: 'krakenpilz', id: 'kp3', pos: [-4.2, Y, -83.6], sight: 6, interval: 3.2 },
      { kind: 'pustewolke', id: 'pw3', pos: [0, Y + 1.6, -109.3], dir: [0, 1], reach: 7, strength: 3.8, sight: 10 },
      // Wrack 4: acht Schubser (Gruppe – alle ins Meer → Warp-Box)
      ...schubser4,
    ],
    items: [
      // Sternring über Anleger, Kippschiff 1 und Kippsteg (Stern 0)
      { kind: 'starring', id: 'sternring', pos: [-2.6, Y, 3.6], star: 0, time: 15, coins: M6.RING },
      // Münzen unter dem gehobenen Wrackheck
      line([9, Y + 0.6, -3.2], [9, Y + 0.6, -5.6], 3), { kind: 'coin', pos: [7.8, Y + 0.6, -4.4] }, { kind: 'coin', pos: [10.2, Y + 0.6, -4.4] },
      // Wrack 2
      { kind: 'warpbox', id: 'w2_ein', pos: [WX, Y, 3.2], target: 'w_lr' },
      { kind: 'warpbox', id: 'w2_aus', pos: [WX, BUG, -43.6], target: 'lr_in' },
      line([WX - 6.8, Y + 0.6, -16], [WX - 16.6, Y + 0.6, -16], 6),
      line([WX + 6, BUG + 0.6, -42.5], [WX + 12.4, BUG + 0.6, -42.5], 5),
      ring([WX, Y + 1.2, -22], 2.4, 8),
      // Wrack 4
      { kind: 'warpbox', id: 'w4_ein', pos: [WX, Y, -114], target: 'w_ziel' },
      { kind: 'warpbox', id: 'w4_aus', pos: [WX, Y, -155.4], target: 'ziel_in', hidden: true },
      ring([WX, Y + 1, -136], 3.2, 10),
      // Kippplattform zur Mastspitze
      line([0, TT + 0.7, -166.4], [0, TT + 0.7, -170.4], 3),
    ],
  },
  build(level) {
    wrackheck(level, M6.HECK);
    holzsteg(level, WX - 3.6, WX + 3.6, 5.6, -2.8, Y, { bottom: -3, seed: 21 });
    holzsteg(level, WX - 3.6, WX + 3.6, -111.4, -120, Y, { bottom: -3, seed: 23 });
    holzsteg(level, WX + 5, WX + 15, -42.2, -42.8, BUG, { bottom: Y, seed: 25 });
    holzsteg(level, WX - 18.2, WX - 6.2, -14.6, -17.4, Y, { bottom: -3, seed: 27 });
    holzsteg(level, WX - 5, WX + 5, -38.6, -46, BUG, { posts: false, seed: 29 });                 // Vorderdeck
    holzsteg(level, -2.5, 2.5, -160.4, -165.2, TT, { bottom: Y, seed: 31 });                     // Mastturm
    brandung(level, [...saum(6.6, 11.4, 3.4, -7.2), ...saum(WX - 4, WX + 4, 6, -3.2), ...saum(WX - 22, WX - 18.2, -14, -18), ...saum(WX - 4, WX + 4, -111, -120.4), ...saum(WX - 4, WX + 4, -151.6, -158.6)]);
  },
  setup(level) {
    deckPlanken(level, { pos: [WX, Y, -19], length: 30, width: 12, colors: [0xc8955a, 0xa8784a, 0x4a321e], seed: 11 });
    deckPlanken(level, { pos: [WX, Y, -136], length: 30, width: 12, colors: [0x76766a, 0x606054, 0x2a2a24], seed: 13 });
  },
  marks: {
    start: [0, Y, 6], heck: [9, Y, -4.4], wrack2: [WX, Y, 1], bug2: [WX, BUG, -42], steg2: [WX - 12, Y, -16], laderaum: [100, 4, -12],
    cp: [0, Y, -80], wrack4: [WX, Y, -116], turm: [0, TT, -162.6], ziel: [0, Y, -173],
  },
});
