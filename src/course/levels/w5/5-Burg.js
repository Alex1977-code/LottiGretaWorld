// 5-Burg „Rumpeltempel des Kippquader-Königs“ – Welt-5-Finale (Archetyp boss, Bauplan Detail 5-Burg: Ruinen-Tempel mit
// Kippquadern, Boss Kippquader-König). Ein goldener Ruinen-Tempel am späten Nachmittag, hoch über dem Dschungel der Lila
// Strand-Insel: Steinquader mit grimmigen Gesichtern kippen rumpelnd über die Plätze – der rote Boden zeigt immer, wo sie
// landen. Durch Vorhof, Vorstrecke (Rammbock-Bullen, bewegliche Plattform, Sternring) und den Gang mit den Wandspalten
// geht es über zwei Warp-Boxen zum Kampfplatz des Kippquader-Königs: nur ein Sprung auf das blaue Sternfeld auf seinem
// Rücken trifft ihn. Danach braust Baron Brummbär heran, schimpft und flieht – Welt 5 geschafft! Parcours nach −Z,
// ≈ 215 m + Arena, Thema temple, Musik course_temple, 400 s.
//
// Abschnitte (Plätze y 2, ab der ersten Warp-Box y 4; Arena y 2):
//   1  Vorhof             z  12 …  −20   Übungs-Kippquader (kippt quer), ?-Blöcke, Tempeltor
//   2  Vorstrecke         z −26 …  −80   Bullenplatz (zwei Rammbock-Bullen, Kippquader am Rand), bewegliche Plattform über
//                                        der Schlucht, Platz mit Sternring (Stern 0), Warp-Box 1 über die eingestürzte
//                                        Brücke
//   3  Checkpoint-Bereich z −96 … −170   Galerie (Checkpoint), Gang der Wandspalten (drei Kippquader kippen aus den
//                                        Nischen), Platz der Mutprobe (Rahmen-Kippquader: im Loch stehen → Stern 1),
//                                        Würfel-Ring um den Mittelpfeiler (vom Würfel auf den Wandsims → Stempel),
//                                        zwei Bullen, Kletterwand neben Warp-Box 2 (Krallen-Anzug → Stern 2)
//   4  Bossarena          z −181 … −210  Kippquader-König, Bruchplatten-Ecken, Begleit-Kippquader; danach Baron-Szene,
//                                        Warp-Box → Zielplateau mit Zielmast
// Extraleben: unsichtbarer Block neben den ?-Blöcken im Vorhof, Kiste auf dem Mittelpfeiler des Würfel-Rings.

import {
  isl, line, ring, arc, lochStern, mutPlatz, baronAuftritt, fackeln, blk, bakeParts, glowPoints, tempelTore, mosaikWege,
  blumenKuebel, wandTuecher,
} from './_helpers_d.js';
import { bakeModel } from '../../blocks/w2kit.js';
import { hasModel } from '../../models/index.js';

const PI = Math.PI;
const Y = 2;           // Vorhof, Vorstrecke, Arena
const Y3 = 4;          // ab der ersten Warp-Box
const A = 10, C = 4;   // Arena: halbe Kantenlänge, Eckplatten
const AZ = -200;       // Arena-Mitte

// ---------------------------------------------------------------- Maße (auch für den Test)
export const MBURG = {
  Y, Y3, A, C, AZ,
  LOCH: { x: -7, z: -135.5, rect: [-7.75, -6.25, -136.25, -134.75] },     // Mut-Platz (Loch des liegenden Rahmens)
  RING: { cx: 6, cz: -141 },                                              // Würfel-Ring um den Mittelpfeiler
  SIMS: { x: 10.2, z: -141, top: Y3 + 4.8 },                              // Wandsims mit dem Stempel
  TURM: { x: -5, z: -168, top: Y3 + 7 },                                  // Kletterturm (Stern 2)
  STEG: [0, Y, AZ + A + 6.5],
};
const { LOCH, RING, SIMS, TURM } = MBURG;

const kq = (id, pos, steps, o = {}) => ({ type: 'kippquader', id, pos, size: [2, 4, 2], steps, wait: 1.5, warn: 0.75, style: 'tempel', ...o });
const bulle = (id, pos, dir, o = {}) => ({ kind: 'rammbock_bulle', id, pos, dir, sight: 10, ...o });
const sign = (x, y, z, text, o = {}) => ({ type: 'sign', pos: [x, y, z], text, size: o.size ?? [2.4, 0.9], yaw: o.yaw ?? 0 });
const wand = (x0, x1, z0, z1, y, h = 5) => ({ type: 'wall', pos: [(x0 + x1) / 2, y, (z0 + z1) / 2], size: [Math.abs(x1 - x0), h, Math.abs(z0 - z1)], style: 'stone' });

// Würfel-Ring: zwei 2-m-Würfel rollen um den Mittelpfeiler (Zellen 2 m, Schleife über die 8 Nachbarzellen)
const RING_STEPS = ['+x', '+x', '-z', '-z', '-x', '-x', '+z', '+z'];
const RING_STEPS2 = ['-x', '-x', '+z', '+z', '+x', '+x', '-z', '-z'];

/** Aufbau-Haken: Tempel-Kulisse (Säulen, Steinköpfe, Obelisken, Palmen), Fackeln, Baron-Brücke, Leuchtpunkte. */
function build(level) {
  // Baron-Brücke hinter der Arena (nur Kulisse, ohne Kollision – kein Weg an der Arena vorbei)
  const parts = [];
  parts.push(blk(70, 0.6, 3.2, 0, Y - 0.6, AZ - 19, 0xc8a46a, { top: 0xe8cc90 }));
  for (let x = -34; x <= 34; x += 4) {
    parts.push(blk(0.4, 0.9, 0.4, x, Y, AZ - 17.5, 0xd8b47a, { top: 0xf0d8a0 }));
    parts.push(blk(0.4, 0.9, 0.4, x, Y, AZ - 20.5, 0xd8b47a, { top: 0xf0d8a0 }));
    if (x % 12 === 2) parts.push(blk(1.4, 14, 1.4, x, Y - 14.6, AZ - 19, 0xa8844e));
  }
  parts.push(blk(70, 0.18, 0.25, 0, Y + 0.9, AZ - 17.5, 0xe8cc90), blk(70, 0.18, 0.25, 0, Y + 0.9, AZ - 20.5, 0xe8cc90));
  bakeParts(level, parts, { castShadow: false });
  // Reliefs: Baron Brummbär am Kletterturm und über dem Arena-Steg
  if (hasModel('brummbaer_relief')) {
    bakeModel(level, 'brummbaer_relief', { size: 0.9 }, 1.2, Y3 + 2.4, -169.82, -PI / 2);
  }
  fackeln(level, [
    { pos: [-3.2, Y, 9], post: 1.4 }, { pos: [3.2, Y, 9], post: 1.4 },
    { pos: [-3.4, Y, -18.4], post: 1.2 }, { pos: [3.4, Y, -18.4], post: 1.2 },
    { pos: [-4, Y3, -96.8], post: 1.3 }, { pos: [4, Y3, -96.8], post: 1.3 },
    { pos: [-4.6, Y3, -106.6], post: 1.1 }, { pos: [4.6, Y3, -106.6], post: 1.1 },
    { pos: [-2.6, Y, AZ + A + 8.6], post: 1.4 }, { pos: [2.6, Y, AZ + A + 8.6], post: 1.4 },
    { pos: [-3, Y, AZ - 41], post: 1.4 }, { pos: [3, Y, AZ - 41], post: 1.4 },
  ], { glow: 2 });
  // Tempeltore (Sturz wird durchsichtig, wenn er die Figur verdeckt), Mosaikwege, Blumenkübel, Wandtücher
  tempelTore(level, [
    { x: 0, y: Y, z: -18.6, width: 4.2, height: 5 },
    { x: 0, y: Y3, z: -106.3, width: 6, height: 5.5 },
    { x: 0, y: Y, z: AZ - 52.5, width: 4.4, height: 5.5 },
  ]);
  mosaikWege(level, [
    { x0: 3.4, x1: 5.8, z0: 10.4, z1: -16.6, y: Y }, { x0: -1.2, x1: 1.2, z0: -27, z1: -43.4, y: Y },
    { x0: -1.2, x1: 1.2, z0: -60.6, z1: -77.4, y: Y }, { x0: -1.2, x1: 1.2, z0: -96.4, z1: -105.6, y: Y3 },
    { x0: -2.7, x1: -0.3, z0: -138.4, z1: -151.6, y: Y3 }, { x0: -1.2, x1: 1.2, z0: -152.4, z1: -165, y: Y3 },
    { x0: -1.2, x1: 1.2, z0: AZ + A + 0.6, z1: AZ + A + 8.4, y: Y }, { x0: -1.2, x1: 1.2, z0: AZ - 36.6, z1: AZ - 45.6, y: Y },
  ]);
  blumenKuebel(level, [
    [-7, Y, 6.75, 0xff5a9a], [7, Y, 6.75, 0xffd23a], [-7, Y, -6.25, 0xb070ff], [7, Y, -6.25, 0xff5a9a],
    [-8, Y, -36, 0xffd23a], [8, Y, -40, 0xff5a9a], [-7, Y, -68, 0xb070ff], [7, Y, -69, 0xffd23a],
    [-7, Y3, -98.6, 0xff5a9a], [7, Y3, -98.6, 0xb070ff], [-6.6, Y3, -160, 0xffd23a], [6.6, Y3, -161, 0xff5a9a],
    [-6, Y, AZ - 40, 0xb070ff], [6, Y, AZ - 40, 0xff5a9a],
  ]);
  const tq = 0x1aa8b0, li = 0x8a52c8;
  wandTuecher(level, [
    { x: -5.17, y: Y3 + 3.0, z: -108.5, yaw: PI / 2, color: li, h: 2 }, { x: -5.17, y: Y3 + 3.0, z: -118, yaw: PI / 2, color: tq, h: 2 },
    { x: -5.17, y: Y3 + 3.0, z: -127.5, yaw: PI / 2, color: li, h: 2 }, { x: 5.17, y: Y3 + 3.0, z: -110, yaw: -PI / 2, color: tq, h: 2 },
    { x: 5.17, y: Y3 + 3.0, z: -126, yaw: -PI / 2, color: li, h: 2 },
    { x: 11.17, y: Y3 + 5.6, z: -134, yaw: -PI / 2, color: tq, h: 3 }, { x: 11.17, y: Y3 + 5.6, z: -148, yaw: -PI / 2, color: li, h: 3 },
    { x: -1.8, y: Y3 + 5.6, z: -169.97, yaw: 0, color: li }, { x: 4.8, y: Y3 + 5.6, z: -169.97, yaw: 0, color: tq },
  ]);
  // goldene Glitzerpunkte über dem Mut-Platz und dem Würfel-Ring (Hinweise)
  glowPoints(level, [[LOCH.x, Y3 + 2.2, LOCH.z], [SIMS.x, SIMS.top + 2, SIMS.z]], 0xfff0a0, 1.2, { opacity: 0.55, name: 'hinweis-schein' });
}

/** Level-Haken nach dem Aufbau: Stern im Loch, Mut-Platz, Baron-Szene. */
function setup(level) {
  lochStern(level, { kq: 'kq_loch', star: 1, rect: LOCH.rect, y: Y3 });
  mutPlatz(level, LOCH.x, Y3, LOCH.z, 0.62);
  baronAuftritt(level, { from: [-40, Y, AZ - 19], stop: [0, Y, AZ - 19], away: [46, Y, AZ - 19], boss: 'koenig' });
}

export const LEVEL = {
  id: '5-Burg',
  world: 5,
  title: 'Rumpeltempel des Kippquader-Königs',
  archetype: 'boss',
  theme: 'temple',
  music: 'course_temple',
  timeLimit: 400,
  killY: -10,
  start: { pos: [0, Y, 8], yaw: PI / 2 },
  build,
  setup,
  instances: { coin: { farHide: 40, shadow: false } },
  farHide: 42,
  camera: [
    { from: 16, to: -24, pitch: 42, dist: 14.5, ahead: 2.4 },
    { from: -24, to: -84, pitch: 44, dist: 14.5, ahead: 2.4 },
    { from: -92, to: -132, pitch: 45, dist: 14, ahead: 2.4 },
    { from: -132, to: -174, pitch: 44, dist: 15, ahead: 2.2 },
    { from: AZ + 26, to: AZ - 16, pitch: 50, dist: 19, x: 0, xLock: 0.3, ahead: 0.4, lead: 0.4, height: 1.8 },
    { from: AZ - 30, to: AZ - 62, pitch: 42, dist: 13.5, ahead: 2 },
  ],
  boss: {
    id: 'koenig', name: 'Kippquader-König', speed: 0,
    trigger: { min: [-A, Y - 0.5, AZ - A], max: [A, Y + 8, AZ + A - 0.6] },
    lock: { min: [-2.2, Y - 0.5, AZ + A + 0.2], max: [2.2, Y + 5, AZ + A + 0.8] },
    warp: 'warp_sieg', warpPos: [0, Y, AZ - 7.5], warpTo: [0, Y + 0.3, AZ - 44], frame: 0.45, musicAfter: 'course_temple',
    center: [0, Y, AZ], warpBanner: 'Spring in die Warp-Box!',
  },
  segments: [
    // ================================================================ 1 Vorhof
    isl(-8, 8, 12, -20, Y),
    sign(-4.2, Y, 9.6, 'Rumpeltempel des\nKippquader-Königs', { size: [3, 1.1] }),
    sign(4.6, Y, -2.6, 'Roter Boden:\nhier rumpelt’s gleich!', { size: [2.6, 0.9] }),
    kq('kq_vorhof', [-5, Y, -8], ['+x', '+x'], { wait: 1.7 }),
    { type: 'deco_w5', items: [
      { kind: 'tempelsaeulen', from: [-7, Y, 10], to: [-7, Y, -16], every: 6.5 },
      { kind: 'tempelsaeulen', from: [7, Y, 10], to: [7, Y, -16], every: 6.5 },
      { kind: 'steinkopf', pos: [-6.2, Y, 2.5], size: 2.2, yaw: -PI / 2 + 0.5 },
      { kind: 'steinkopf', pos: [6.2, Y, 2.5], size: 2.2, yaw: -PI / 2 - 0.5 },
      { kind: 'steinplatten', pos: [0, Y, 5], size: [6, 8] },
    ] },
    { type: 'bridge', from: [0, Y, -20], to: [0, Y, -26], width: 3.2, color: 0xd8b47a },

    // ================================================================ 2 Vorstrecke
    isl(-9, 9, -26, -44, Y),
    kq('kq_rand', [6.6, Y, -29.5], ['-z', '-z'], { wait: 1.6, phase: 0.6 }),
    sign(-6.6, Y, -27.4, 'Vorsicht,\nRammbock-Bullen!', { size: [2.4, 0.9] }),
    { type: 'mover', id: 'plattform', path: [[0, Y - 0.5, -46.2], [0, Y - 0.5, -57.8]], size: [3.2, 0.5, 3.2], speed: 2.2, wait: 0.9, color: 'yellow' },
    isl(-8, 8, -60, -80, Y),
    { type: 'wall', pos: [-5, Y, -75.5], size: [1.3, 1.5, 1.3], style: 'stone' },
    { type: 'wall', pos: [5, Y, -75.5], size: [1.3, 1.5, 1.3], style: 'stone' },
    // eingestürzte Brücke: Stümpfe (dazwischen 13 m Abgrund – nur die Warp-Box führt hinüber)
    isl(-1.6, 1.6, -80, -81.5, Y, 6, { top: 'rock', topColor: 0xd8b47a, sideColor: 0xa8844e }),
    isl(-1.6, 1.6, -94.5, -96, Y3, 6, { top: 'rock', topColor: 0xd8b47a, sideColor: 0xa8844e }),
    sign(3.6, Y, -77.4, 'Brücke kaputt –\nab in die Warp-Box!', { size: [2.4, 0.9] }),
    { type: 'deco_w5', items: [
      { kind: 'obelisk', pos: [-7.2, Y, -27], height: 5.5 }, { kind: 'obelisk', pos: [7.6, Y, -43], height: 5.5 },
      { kind: 'tempelsaeule', pos: [-7, Y, -62], height: 5 }, { kind: 'tempelsaeule', pos: [7, Y, -62], height: 5, broken: true },
      { kind: 'tempelsaeule', pos: [-7, Y, -79], height: 5, broken: true }, { kind: 'tempelsaeule', pos: [7, Y, -79], height: 5 },
      { kind: 'steinplatten', pos: [0, Y, -70], size: [8, 10] },
    ] },

    // ================================================================ 3 Checkpoint-Bereich
    isl(-8, 8, -96, -106, Y3),
    // Gang der Wandspalten: Boden, Seitenwände mit Nischen (je ein Kippquader darin)
    isl(-5.2, 5.2, -106, -130, Y3),
    // Seitenwände nur 3,2 m hoch: die Kamera sieht am Gang-Ende über sie hinweg auf den Platz der Mutprobe
    wand(-6.4, -5.2, -106, -110.9, Y3, 3.2), wand(-6.4, -5.2, -113.1, -122.9, Y3, 3.2), wand(-6.4, -5.2, -125.1, -130, Y3, 3.2),
    wand(5.2, 6.4, -106, -116.9, Y3, 3.2), wand(5.2, 6.4, -119.1, -130, Y3, 3.2),
    isl(-8.3, -5.2, -110.6, -113.4, Y3), wand(-8.9, -8.3, -110.4, -113.6, Y3, 6),
    isl(-8.3, -5.2, -122.6, -125.4, Y3), wand(-8.9, -8.3, -122.4, -125.6, Y3, 6),
    isl(5.2, 8.3, -116.6, -119.4, Y3), wand(8.3, 8.9, -116.4, -119.6, Y3, 6),
    kq('kq_spalte1', [-6.3, Y3, -112], ['+x', '+x'], { start: 'near', near: 12, wait: 1.5 }),
    kq('kq_spalte2', [6.3, Y3, -118], ['-x', '-x'], { start: 'near', near: 12, wait: 1.5, phase: 0.8 }),
    kq('kq_spalte3', [-6.3, Y3, -124], ['+x', '+x'], { start: 'near', near: 12, wait: 1.5, phase: 1.6 }),
    // Platz der Mutprobe, Würfel-Ring, Bullen
    isl(-11, 11, -130, -152, Y3),
    wand(11.2, 12.4, -130, -152, Y3, 7),
    { type: 'kippquader', id: 'kq_loch', pos: [LOCH.x, Y3, -133.6], size: [3, 3, 0.8], hole: [1.6, 1.6], steps: ['-z'], wait: 2.2, warn: 0.9, turn: 0.6, start: 'near', near: 10, style: 'tempel' },
    sign(-2.6, Y3, -131.4, 'Mutprobe: stell dich\nauf den grünen Stern!', { size: [2.8, 0.9] }),
    isl(RING.cx - 1, RING.cx + 1, RING.cz + 1, RING.cz - 1, Y3 + 5, 6, { top: 'rock', topColor: 0xe0c48a, sideColor: 0xb08a54 }),
    { type: 'kippquader', id: 'wuerfel1', pos: [RING.cx - 2, Y3, RING.cz + 2], size: [2, 2, 2], steps: RING_STEPS, mode: 'loop', wait: 1.1, warn: 0.6, turn: 0.5, style: 'tempel' },
    { type: 'kippquader', id: 'wuerfel2', pos: [RING.cx + 2, Y3, RING.cz - 2], size: [2, 2, 2], steps: RING_STEPS2, mode: 'loop', wait: 1.1, warn: 0.6, turn: 0.5, style: 'tempel' },
    { type: 'platform', pos: [SIMS.x, SIMS.top - 0.5, SIMS.z], size: [1.6, 0.5, 3], style: 'stone' },
    isl(-8, 8, -152, -170, Y3),
    // Kletterturm (Krallen-Anzug) neben Warp-Box 2
    isl(TURM.x - 1.5, TURM.x + 1.5, -166.5, -169.5, TURM.top, TURM.top + 4, { top: 'rock', topColor: 0xe0c48a, sideColor: 0xb08a54 }),
    { type: 'wall', pos: [TURM.x, Y3, -166.38], size: [3, 7, 0.24], climbable: true },
    wand(-8, 8, -170, -171.2, Y3, 6),
    sign(5.6, Y3, -153.4, 'Krallen-Anzug?\nDann klettern!', { size: [2.4, 0.9] }),
    { type: 'deco_w5', items: [
      { kind: 'tempelsaeulen', from: [-10, Y3, -132], to: [-10, Y3, -150], every: 6 },
      { kind: 'steinkopf', pos: [-6.4, Y3, -151], size: 2, yaw: -PI / 2 + 0.3 },
      { kind: 'obelisk', pos: [7, Y3, -154], height: 5 }, { kind: 'obelisk', pos: [-7, Y3, -154], height: 5 },
      { kind: 'tempelsaeule', pos: [7, Y3, -169], height: 5.5, solid: false },
    ] },

    // ================================================================ 4 Bossarena (wie Testlevel 0-19)
    { type: 'island', pos: [0, -2, AZ], size: [2 * A, Y + 2, 2 * A - 2 * C], top: 'stone', under: 0 },
    { type: 'island', pos: [0, -2, AZ], size: [2 * A - 2 * C, Y + 2, 2 * A], top: 'stone', under: 0 },
    { type: 'island', pos: [0, -2, AZ + A + 4.5], size: [4.4, Y + 2, 9], top: 'stone', under: 0 },
    { type: 'kippquader', id: 'kq_l', pos: [-8, Y, AZ + 1], size: [2, 4, 2], steps: ['+z', '-z'], start: 'signal', wait: 1.6, warn: 0.8, style: 'tempel' },
    { type: 'kippquader', id: 'kq_r', pos: [8, Y, AZ - 1], size: [2, 4, 2], steps: ['-z', '+z'], start: 'signal', wait: 1.6, warn: 0.8, style: 'tempel' },
    { type: 'deco_w5', shadow: false, items: [
      { kind: 'tempelsaeule', pos: [-1.75, Y, AZ + A + 8.4], height: 4.5, r: 0.45 }, { kind: 'tempelsaeule', pos: [1.75, Y, AZ + A + 8.4], height: 4.5, r: 0.45 },
      { kind: 'steinkopf', pos: [-13, Y - 4, AZ - 4], size: 3.2, yaw: 0, solid: false }, { kind: 'steinkopf', pos: [13, Y - 4, AZ - 4], size: 3.2, yaw: PI, solid: false },
    ] },
    // Zielplateau
    isl(-8, 8, AZ - 36, AZ - 54, Y),
    { type: 'deco_w5', items: [
      { kind: 'obelisk', pos: [-6, Y, AZ - 50], height: 6 }, { kind: 'obelisk', pos: [6, Y, AZ - 50], height: 6 },
    ] },
    { type: 'killplane', y: -12 },
  ],
  blocks: [
    { kind: 'question', pos: [-2, Y + 2.2, 2.5], content: 'wachstumsbeere' },
    { kind: 'question', pos: [0, Y + 2.2, 2.5], content: 'coins:3' },
    { kind: 'coinblock', pos: [2, Y + 2.2, 2.5], count: 6 },
    { kind: 'hidden', id: 'geheim_vorhof', pos: [4, Y + 2.2, 2.5], content: 'oneup' },
    { kind: 'question', pos: [-2, Y + 2.2, -66], content: 'coins:5' },
    { kind: 'question', pos: [3, Y3 + 2, -156], content: 'krallen' },
    { kind: 'question', pos: [-3, Y3 + 2.2, -100], content: 'wachstumsbeere' },
  ],
  enemies: [
    bulle('bulle1', [-4, Y, -33], [0, 1]),
    bulle('bulle2', [3.5, Y, -40.5], [0, 1]),
    bulle('bulle3', [-4, Y3, -148], [0, 1], { sight: 8 }),
    bulle('bulle4', [2.5, Y3, -149], [0, 1], { sight: 8 }),
    {
      kind: 'kippquader_koenig', id: 'koenig', pos: [0, Y, AZ - 5], dir: [0, 1], arena: { min: [-A, AZ - A], max: [A, AZ + A] },
      corners: [['ecke_vl', 'ecke_vr'], ['ecke_hl', 'ecke_hr']], escorts: ['kq_l', 'kq_r'], drop: 'coins:10',
    },
  ],
  items: [
    // ---- 1
    line([0, Y + 0.6, 6.5], [0, Y + 0.6, -1], 4),
    ...arc([5, Y + 0.6, -4], [5, Y + 0.6, -14], 5, 1.2),
    line([0, Y + 0.6, -21], [0, Y + 0.6, -25], 3),
    // ---- 2
    ring([0, Y + 0.6, -36], 2.2, 6),
    line([0, Y + 1.2, -47], [0, Y + 1.2, -57], 4),
    { kind: 'starring', id: 'sternring', pos: [0, Y, -63], yaw: PI / 2, star: 0, time: 10,
      coins: [[-5, Y + 0.6, -66], [-5, Y + 0.6, -71], [-5, Y + 2.2, -75.5], [0, Y + 0.6, -77], [5, Y + 2.2, -75.5], [5, Y + 0.6, -71], [5, Y + 0.6, -66], [0, Y + 2.4, -70.5]] },
    { kind: 'warpbox', id: 'warp1', pos: [0, Y, -78.6], target: 'warp1b' },
    // ---- 3
    { kind: 'warpbox', id: 'warp1b', pos: [0, Y3, -98.4], target: 'warp1' },
    line([0, Y3 + 0.6, -107], [0, Y3 + 0.6, -128], 7),
    ring([RING.cx, Y3 + 5.6, RING.cz], 0.7, 4),
    { kind: 'crate', id: 'kiste_pfeiler', pos: [RING.cx, Y3 + 5, RING.cz], content: 'oneup' },
    line([-3, Y3 + 0.6, -138], [-3, Y3 + 0.6, -150], 4),
    line([TURM.x, Y3 + 1.2, -163], [TURM.x, Y3 + 1.2, -165.6], 2),
    { kind: 'warpbox', id: 'warp2', pos: [2.4, Y3, -167.4], target: MBURG.STEG.map((v, i) => (i === 1 ? v + 0.3 : v)) },
    // ---- 4 Arena
    { kind: 'bruchplatte', id: 'ecke_vl', pos: [-A + C / 2, Y, AZ + A - C / 2], size: [C, C], style: 'tempel' },
    { kind: 'bruchplatte', id: 'ecke_vr', pos: [A - C / 2, Y, AZ + A - C / 2], size: [C, C], style: 'tempel' },
    { kind: 'bruchplatte', id: 'ecke_hl', pos: [-A + C / 2, Y, AZ - A + C / 2], size: [C, C], style: 'tempel' },
    { kind: 'bruchplatte', id: 'ecke_hr', pos: [A - C / 2, Y, AZ - A + C / 2], size: [C, C], style: 'tempel' },
    { kind: 'warpbox', id: 'warp_sieg', pos: [0, Y, AZ - 7.5], target: [0, Y + 0.3, AZ - 40], hidden: true },
    ring([0, Y + 0.6, AZ - 44], 2.4, 10),
  ],
  checkpoint: [{ pos: [0, Y3, -101.6], yaw: PI / 2 }, { pos: MBURG.STEG, yaw: PI / 2 }],
  stars: [
    { pos: [0, Y + 1.4, -70.5], hidden: true, id: 'stern_ring' },                 // 0: Sternring
    { pos: [LOCH.x, Y3 + 0.6, LOCH.z], hidden: true, id: 'stern_loch' },          // 1: im Loch des Kippquaders
    [TURM.x, TURM.top + 1.2, TURM.z],                                              // 2: Kletterturm neben Warp-Box 2
  ],
  stamp: [SIMS.x, SIMS.top + 0.9, SIMS.z],
  goal: { pos: [0, Y, AZ - 47], height: 9 },
  marks: {
    start: [0, Y, 8], vorhof: [0, Y, -10], bullen: [0, Y, -35], plattform: [0, Y, -45], ring: [0, Y, -63], warp1: [0, Y, -78.6],
    galerie: [0, Y3, -101.6], gang: [0, Y3, -110], loch: [LOCH.x, Y3, LOCH.z], wuerfel: [RING.cx, Y3, RING.cz], sims: [SIMS.x, SIMS.top, SIMS.z],
    turm: [TURM.x, TURM.top, TURM.z], warp2: [2.4, Y3, -167.4], steg: MBURG.STEG, arena: [0, Y, AZ], ziel: [0, Y, AZ - 47],
  },
};
