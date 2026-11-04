// B-8 „Turbo-Piep über dem Neonsteg“ – Remix von 4-3 „Neonsteg im Takt“ (Bauplan Welt Blume, Detail B-8: Piep-Blöcke 4×
// schneller, ohne Warn-Pieptöne; Gleitblätter statt Spiegelfrüchte; viele Stacheln; Sterne: Ende Bereich 1 über einem ?-Block,
// Sternring am Checkpoint, mitten auf der Piep-Block-Rutsche; 400 s). Basis als Daten (remixOf, levels/w4/4-3.js bleibt
// unverändert). Musik der Basis (course_beep, Takt-Kopplung: die Musik bleibt die Uhr der Piep-Blöcke), Thema beep, kein Stempel.
//
// Remix-Regel beepSpeed 4 / beepWarn false: alle Piep-Blöcke wechseln alle 2 statt 8 Zählzeiten (128 BPM ≈ 0,94 s je Farbe) und
//   blinken vorher nicht mehr. Damit das fair bleibt, liegen zwischen den langen Reihen feste Neon-Absätze (je Abschnitt höchstens
//   ein Farbwechsel nötig), und überall gibt es **Gleitblätter** (statt der Spiegelfrüchte: ?-Blöcke, Automaten, Inseln) – mit dem
//   Blatt gleitet man über eine ganze Reihe.
// Klon-Rätsel entfallen (keine Spiegelfrüchte): der Laserzaun braucht nur noch ein Druckfeld, die Druckfelder am Rutschenfuß
//   (Stern 3 der Basis) entfallen; der Viererlift bleibt Kulisse (der Stempel entfällt).
// Viele Stacheln: Stachelböden an den Inselrändern, Stachelstangen auf den Inseln und am Uhrenplatz, wandernde Stachelblöcke im
//   Rundweg und am Schlussaufstieg.
// Sterne (Index): 0 Ende Bereich 1 auf der Warp-Insel hoch über einem ?-Block (auf den Block, dann hinauf), 1 Sternring am
//   Checkpoint (acht Sternmünzen im Kreis um ihn, jede zweite mit Hüpfer, 14 s), 2 mitten auf der Piep-Block-Rutsche (jetzt
//   rot/blau gestreift – wer im richtigen Takt losrutscht, nimmt ihn mit).

import { remixOf } from '../../level/remix.js';
import { line } from './_helpers_bb.js';

const Y = 1, YC = 31, YU = 24, YR = 11, YZ = 26;
const PI = Math.PI;

/** fester Neon-Absatz in einer Piep-Reihe (Oberkante y 1, Mitte x/z, Breite w, Tiefe d). */
const neon = (x, z, w, d) => ({ type: 'platform', style: 'block', color: 0x8a7cff, pos: [x, Y - 1, z], size: [w, 1, d] });
const stachelboden = (x, y, z, w, d) => ({ type: 'stachelboden', pos: [x, y, z], size: [w, 0.3, d] });

export const LEVEL = remixOf('4-3', {
  id: 'B-8',
  world: 11,
  title: 'Turbo-Piep über dem Neonsteg',
  timeLimit: 400,
  stamp: false,
  beepSpeed: 4,
  beepWarn: false,
  remove: [
    { id: ['pf_b', 'pf_s1', 'pf_s2'] },          // Klon-Druckfelder (ohne Spiegelfrüchte)
  ],
  // feste Neon-Absätze in den Reihen: je Teilstück genügt ein Lauf in einer Farbphase (≈ 0,94 s)
  replace: [
    { match: { id: 'r1_3' }, with: neon(0, -27, 5, 2) },
    { match: { id: 'r4_1' }, with: neon(0, -98.5, 6, 3) },
    { match: { id: 'r4_3' }, with: neon(0, -104.5, 6, 3) },
    { match: { id: 'r2_0' }, with: (e) => [{ ...e, pos: [0, Y - 1, -46.5], size: [6, 1, 5] }, neon(0, -50, 6, 2)] },
    { match: { id: 'r2_1' }, with: (e) => ({ ...e, pos: [0, Y - 1, -53.5], size: [6, 1, 5] }) },
  ],
  change: [
    // Gleitblätter statt Spiegelfrüchte (Inseln, ?-Blöcke)
    { match: { kind: 'powerup', where: (e) => e.power === 'spiegel' }, set: { power: 'gleitblatt' } },
    { match: { kind: 'question', where: (e) => e.content === 'spiegel' }, set: { content: 'gleitblatt' } },
    // Rutsche: rot/blau gestreift (es ist immer jeder zweite Streifen fest)
    { match: { id: 'rutsche' }, set: { colors: 'wechsel' } },
    // Reihe 1: erst drei rote Streifen, fester Absatz, dann drei blaue (statt rot/blau im Wechsel)
    { match: { id: ['r1_0', 'r1_1', 'r1_2'] }, set: { color: 'rot' } },
    { match: { id: ['r1_4', 'r1_5', 'r1_6'] }, set: { color: 'blau' } },
    // Treppen: Stufen rot/blau im Wechsel – man hüpft im Takt von Stufe zu Stufe (vorher ganze Läufe einer Farbe)
    { match: { id: ['f1', 'f2', 'f3', 'f4', 'g1', 'g2'] }, set: { colors: 'wechsel' } },
  ],
  stars: [
    [5, Y + 6.4, -120],                                         // 0: Warp-Insel, hoch über dem ?-Block
    { pos: [3, YC + 1.2, -186], hidden: true, id: 'stern_ring' }, // 1: Sternring am Checkpoint
    [0, 18.6, -247],                                            // 2: mitten auf der Piep-Block-Rutsche
  ],
  add: {
    segments: [
      // viele Stacheln: Stachelböden an den Inselrändern (abseits der Laufwege), Stachelstangen auf den Inseln
      stachelboden(-4.8, Y, -39, 2.2, 6), stachelboden(4.8, Y, -39, 2.2, 6),
      stachelboden(-5.0, Y, -63.6, 1.8, 3.6), stachelboden(5.2, Y, -58.2, 1.6, 2.4),
      stachelboden(-5.4, Y, -86, 2.0, 4), stachelboden(5.4, Y, -86, 2.0, 4),
      stachelboden(-6.6, Y, -112, 2.6, 4.2), stachelboden(6.6, Y, -132.4, 2.6, 2.6),
      stachelboden(5.6, Y, -166.6, 3.2, 5.6),
      stachelboden(11.6, YC, -191.8, 2.4, 2.2), stachelboden(-8.4, YC, -177.8, 2, 1.6),
      stachelboden(-5.6, YU, -230.4, 2.4, 2.2), stachelboden(5.6, YU, -238, 2.4, 1.6),
      stachelboden(-5.4, YR, -261, 2.4, 6), stachelboden(5.4, YR, -258, 2.4, 4.6),
      stachelboden(-6.4, YZ, -283.6, 2.6, 1.8), stachelboden(6.6, YZ, -294.2, 2.4, 2.2),
      { type: 'stachelstange', id: 'stange_warp', pos: [4.6, Y, -127.4], height: 0.9, length: 3, arms: 2, balls: 3, speed: 1.0 },
      { type: 'stachelstange', id: 'stange_insel2', pos: [3.4, Y, -59.6], height: 0.9, length: 2.2, arms: 1, balls: 2, speed: -1.3 },
      { type: 'stachelstange', id: 'stange_cp', pos: [10.6, YC, -182.6], height: 0.9, length: 2.2, arms: 2, balls: 2, speed: 1.1 },
    ],
    blocks: [
      // Ende Bereich 1: ?-Block (Gleitblatt) unter Stern 0
      { kind: 'question', pos: [5, Y + 2.0, -120], content: 'gleitblatt' },
      // Gleitblatt gleich am Start
      { kind: 'question', pos: [-3, Y + 2.3, -1.5], content: 'gleitblatt' },
    ],
    items: [
      // Sternring am Checkpoint: acht Sternmünzen auf dem Plateau
      { kind: 'starring', id: 'sternring', pos: [3, YC, -186.5], star: 1, time: 14,
        coins: Array.from({ length: 8 }, (_, i) => [3.5 + 4.2 * Math.cos(i * PI / 4), YC + (i % 2 ? 1.9 : 0.6), -186 - 4.2 * Math.sin(i * PI / 4)]) },
      line([0, 18.4, -243], [0, 15, -251], 3),
    ],
  },
  // Spiegelfrucht-Automaten der Basis geben jetzt Gleitblätter
  prebuild(level) {
    const sp = level.spawn.bind(level);
    level.spawn = (kind, spec = {}) => sp(kind, kind === 'powerup' && spec.power === 'spiegel' ? { ...spec, power: 'gleitblatt' } : spec);
  },
  marks: {
    start: [0, Y, 5], gasse: [0, Y, -8], r1: [0, Y, -19.5], insel1: [0, Y, -38], r2: [0, Y, -43.5], insel2: [0, Y, -60], felder: [0, Y, -88.5],
    warp: [-2.5, Y, -130.5], qblock: [5, Y, -120], turm: [3, Y, -153.5], checkpoint: [6.5, YC, -181], ring: [3, YC, -186.5],
    uhrenplatz: [0, YU, -233], rutsche: [0, YU, -239.5], rutschenfuss: [0, YR, -258], ziel: [0, YZ, -290.7],
  },
});
