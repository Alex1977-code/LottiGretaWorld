// P-Haus „Haus Zehnkampf“ – Kampf-Haus der Welt Pilz (Archetyp house, Bauplan P-Haus: „10 Kampf-Räume à 10 s, je Raum alle
// Gegner besiegen: 3 Rammbock-Bullen, 3 Schneesäulen, 2 Flieger, 3 Bumerang-Werfer, 1 Münz-Dieb, 3 Pilzlingstürme,
// 3 Funkenflämmchen, 3 Zauberkröten, 3 Rankenschnapper, 3 Hammer-Werfer“, je ein Stern). Jeder Raum ist eine kleine Kampfstube
// (14 × 16 m) mit eigener Tapete, eigenem Boden, Bildern, Wanduhren und der großen Raumuhr über der Rückwand (roter Zeiger =
// Restzeit). Ziel: alle Gegner des Raums besiegen – dann fliegt der Stern zur Figur. Wo es das Vorbild nahelegt, gibt eine
// **Kraftkapsel** neben dem Start beim Raumbeginn das passende Werkzeug (geht es verloren, kommt nach 1,2 s ein neues):
//   1 Bullenstall      3 Rammbock-Bullen       Riesentrank – als Riese überrennen (sonst je 3× draufspringen)
//   2 Eisstube         3 Schneesäulen          Funkenblüte – ein Feuerball schmilzt die ganze Säule
//   3 Flugstube        Flatterkäfer + Brummer  ohne Kapsel – draufspringen (der Brummer sticht nach Ankündigung herab)
//   4 Bumerangbahn     3 Bumerang-Werfer       Krallen-Anzug – Tatzenhieb (Aktion) aus der Nähe
//   5 Münzflur         1 Münzmarder            ohne Kapsel – rennend einholen, zweimal berühren (Münzregen)
//   6 Turmzimmer       3 Pilzlingstürme        ohne Kapsel – die Türme herankommen lassen, dann auf den POW-Block springen
//                                              (oder Stufe für Stufe abtragen)
//   7 Glutküche        3 Funkenflämmchen       Funkelstern – heiß von allen Seiten, nur der Stern (oder Tatze, Wurf …) besiegt sie
//   8 Zauberzimmer     3 Zauberkröten          Funkenblüte – treffen, solange sie sichtbar sind
//   9 Rankengarten     3 Rankenschnapper       ohne Kapsel – Stampfattacke auf die Köpfe
//  10 Hammerhalle      3 Hammer-Werfer         Pilz-Maske – zugewandt sehen sie die Figur nicht: anspringen
// Zeit abgelaufen → Haus verlassen mit den bisherigen Sternen (fail 'exit'); Tod → Raum von vorn. Thema house, Musik
// course_house, kein Stempel. Räume bei x 0, z 0 / −64 / … / −576 (eigene Abschnitte und eigene Kamera je Raum).
// Raumhüllen aus den Welt-4-Hilfen (hausRaum/hausFertig, nur importiert), Kraftkapseln aus _helpers_pb.js.

import { isl, levelSetup, cullStatic, farHide, teileInstanzen, heroShadowDiet, hausRaum, hausFertig, wimpel } from '../w4/_helpers_d.js';
import { tapete } from '../w6/_helpers_c.js';
import { kraftKapsel } from './_helpers_pb.js';

const Y = 1;          // Fußboden
const W = 14;         // Raumbreite (x −7 … 7)
const LEN = 16;       // Raumtiefe
const SP = 64;        // Abstand der Räume (z)
const Z0 = (i) => -SP * i;
const zu = (i, u) => Z0(i) - u;
const P = (i, x, u, y = Y) => [x, y, zu(i, u)];
const floor = (i, color) => isl(-W / 2, W / 2, zu(i, -1), zu(i, LEN), Y, 1.2, { top: 'none', under: 0, color });

/** Raumdaten: Tapete (Welt-4-Muster bzw. Welt-6 über tapete6), Täfelung, Boden, Bilder, Uhren, Möbel, Kraftkapsel. */
const RAEUME = [
  { id: 'r1', name: 'Bullenstall', title: 'Bullenstall: Als Riese die Bullen umrennen!', paper: 'wueste', wood: 0x8a5a2e, kapsel: { power: 'riese' },
    floors: [{ u0: -1, u1: LEN, style: 'sand' }],
    pictures: [{ wall: 'l', u: 4, motif: 'canyon' }, { wall: 'r', u: 4, motif: 'kaktus' }, { wall: 'b', x: -4.4, y: 2.4, motif: 'berg' }],
    clocks: [{ wall: 'l', u: 11, y: 3.4, r: 0.42 }],
    props: [{ kind: 'kaktus', x: 6.2, u: 1.2, size: 1.1 }, { kind: 'kaktus', x: -6.2, u: 15, size: 0.9 }, { kind: 'eimer', x: 6.2, u: 15, color: 0x8a5a2e }] },
  { id: 'r2', name: 'Eisstube', title: 'Eisstube: Schmilz die Schneesäulen mit Feuer!', paper: 'kanone', wood: 0x2a4a8a, kapsel: { power: 'funken' },
    floors: [{ u0: -1, u1: LEN, style: 'kacheln' }],
    pictures: [{ wall: 'l', u: 4, motif: 'berg' }, { wall: 'r', u: 4, motif: 'see' }, { wall: 'b', x: 4.4, y: 2.4, motif: 'stern' }],
    clocks: [{ wall: 'r', u: 11, y: 3.4, r: 0.42, speed: 1.5 }],
    props: [{ kind: 'ofen', x: 5.9, u: 1.4, yaw: -Math.PI / 2 }, { kind: 'kiste', x: -6.1, u: 15, size: 0.9, color: 0x9ad8ff }] },
  { id: 'r3', name: 'Flugstube', title: 'Flugstube: Spring auf die Flieger!', paper: 'schaukel', wood: 0x3a8a6a, kapsel: {},
    floors: [{ u0: -1, u1: LEN, style: 'teppich' }],
    pictures: [{ wall: 'l', u: 4, motif: 'trampolin' }, { wall: 'r', u: 4, motif: 'see' }, { wall: 'b', x: -4.4, y: 2.6, motif: 'zielfahne' }],
    clocks: [{ wall: 'l', u: 11, y: 3.6, r: 0.4 }],
    props: [{ kind: 'pflanze', x: -6.1, u: 1.4, size: 1.1 }, { kind: 'pflanze', x: 6.1, u: 15 }, { kind: 'ball', x: 6, u: 1.2, color: 0x5ab8ff }] },
  { id: 'r4', name: 'Bumerangbahn', title: 'Bumerangbahn: Tatzenhieb mit dem Krallen-Anzug!', paper: 'zirkus', wood: 0xa8283a, kapsel: { power: 'krallen' },
    floors: [{ u0: -1, u1: LEN, style: 'parkett' }],
    pictures: [{ wall: 'l', u: 4, motif: 'baron' }, { wall: 'r', u: 4, motif: 'pilz' }, { wall: 'b', x: 4.4, y: 2.6, motif: 'zielfahne' }],
    clocks: [{ wall: 'r', u: 11, y: 3.4, r: 0.42 }],
    props: [{ kind: 'pferd', x: 5.8, u: 1.4, yaw: -0.6 }, { kind: 'trommel', x: -6, u: 15 }, { kind: 'stange', x: 6.3, u: 15.2, h: 3 }] },
  { id: 'r5', name: 'Münzflur', title: 'Münzflur: Hol den Münzmarder ein!', paper: 'galerie', wood: 0x5a2a1a, kapsel: {},
    floors: [{ u0: -1, u1: LEN, style: 'laeufer' }],
    pictures: [{ wall: 'l', u: 4, motif: 'baron' }, { wall: 'r', u: 4, motif: 'burg' }, { wall: 'l', u: 12, motif: 'lotti' }, { wall: 'r', u: 12, motif: 'greta' }],
    clocks: [{ wall: 'l', u: 8, y: 3.6, r: 0.42, speed: 2 }],
    props: [{ kind: 'buste', x: -6.1, u: 1.4 }, { kind: 'buste', x: 6.1, u: 1.4, color: 0xc8b8a8 }, { kind: 'truhe', x: 0, u: 15.2 }] },
  { id: 'r6', name: 'Turmzimmer', title: 'Turmzimmer: Lock die Türme zum POW-Block!', paper: 'pilz', wood: 0x5a8a2a, kapsel: {},
    floors: [{ u0: -1, u1: LEN, style: 'puzzle' }],
    pictures: [{ wall: 'l', u: 4, motif: 'pilz' }, { wall: 'r', u: 4, motif: 'kruemel' }, { wall: 'b', x: -4.4, y: 2.6, motif: 'pflaume' }],
    clocks: [{ wall: 'r', u: 11, y: 3.4, r: 0.4 }],
    props: [{ kind: 'riesenpilz', x: -6, u: 1.4, size: 0.7, color: 0x4a8aff }, { kind: 'riesenpilz', x: 6.1, u: 15.1, size: 0.6 }, { kind: 'teddy', x: 6.1, u: 1.2, yaw: -0.5 }] },
  { id: 'r7', name: 'Glutküche', title: 'Glutküche: Mit dem Funkelstern durch die Flämmchen!', paper: 'backstube', wood: 0x6a3a1a, kapsel: { power: 'stern' },
    floors: [{ u0: -1, u1: LEN, style: 'terrakotta' }],
    pictures: [{ wall: 'l', u: 4, motif: 'burg' }, { wall: 'r', u: 4, motif: 'stern' }],
    clocks: [{ wall: 'l', u: 11, y: 3.4, r: 0.42, speed: 1.5 }],
    props: [{ kind: 'ofen', x: 5.9, u: 1.4, yaw: -Math.PI / 2 }, { kind: 'brote', x: -6, u: 15 }, { kind: 'mehl', x: 6.1, u: 15 }] },
  { id: 'r8', name: 'Zauberzimmer', title: 'Zauberzimmer: Triff die Kröten, solange sie sichtbar sind!', paper: 'sterne6', wood: 0x2a1e6a, kapsel: { power: 'funken' },
    floors: [{ u0: -1, u1: LEN, style: 'stein' }],
    pictures: [{ wall: 'l', u: 4, motif: 'stern' }, { wall: 'r', u: 4, motif: 'piep' }],
    clocks: [{ wall: 'r', u: 11, y: 3.6, r: 0.42, speed: 0.75 }],
    props: [{ kind: 'standuhr', x: 6.2, u: 1.4, yaw: -Math.PI / 2 }, { kind: 'kommode', x: -6.2, u: 15, yaw: Math.PI / 2, color: 0x4a3a8a }] },
  { id: 'r9', name: 'Rankengarten', title: 'Rankengarten: Stampfattacke auf die Köpfe!', paper: 'dachboden', wood: 0x4a6a2a, kapsel: {},
    floors: [{ u0: -1, u1: LEN, style: 'holz' }],
    pictures: [{ wall: 'l', u: 4, motif: 'kaktus' }, { wall: 'r', u: 4, motif: 'berg' }],
    clocks: [{ wall: 'l', u: 8, y: 3.6, r: 0.4 }],
    props: [{ kind: 'pflanze', x: 6.1, u: 1.4, size: 1.2 }, { kind: 'pflanze', x: -6.1, u: 1.4, size: 1.0 },
      ...[-4.5, 0, 4.5].map((x) => ({ kind: 'eimer', x, u: x === 0 ? 14.6 : 13.2, color: 0xc86a3a, solid: false }))] },
  { id: 'r10', name: 'Hammerhalle', title: 'Hammerhalle: Mit der Pilz-Maske anspringen!', paper: 'maschine', wood: 0x3a4a5a, kapsel: { helmet: 'maske' },
    floors: [{ u0: -1, u1: LEN, style: 'metall' }],
    pictures: [{ wall: 'l', u: 4, motif: 'burg' }, { wall: 'r', u: 4, motif: 'zielfahne' }],
    clocks: [{ wall: 'r', u: 8, y: 3.6, r: 0.45, speed: 2 }],
    props: [{ kind: 'zahnrad', x: -6.7, u: 4.5, y: Y + 3.2, yaw: Math.PI / 2, r: 0.9, solid: false }, { kind: 'rohre', x: 6.4, u: 1, yaw: 0 }, { kind: 'ruestung', x: 6.1, u: 15, yaw: -0.4 }] },
];
const TAPETE6 = { sterne6: 'sterne' };
const KAPSEL = (i) => P(i, -5.4, 1.6);

// ====================================================================== Gegner je Raum
const werfer = (kind, i, x, u, k, o = {}) => ({ kind, id: `r${i + 1}_w${k}`, roomId: `r${i + 1}`, pos: P(i, x, u), sight: 14, interval: 2.8, first: 1.6 + k * 0.5, wake: 40, ...o });
const REIHE = [[-4.5, 11.5], [0, 13.5], [4.5, 11.5]];
const marderBahn = [];
for (let lap = 0; lap < 3; lap++) marderBahn.push(P(4, -5, 4.5), P(4, -5, 14), P(4, 5, 14), P(4, 5, 4.5));
marderBahn.push(P(4, -5, 4.5));

const ENEMIES = [
  // 1 Bullenstall
  ...REIHE.map(([x, u], k) => ({ kind: 'rammbock_bulle', id: `r1_b${k + 1}`, roomId: 'r1', pos: P(0, x, u + 0.5), dir: [0, 1], sight: 13, wake: 40 })),
  // 2 Eisstube
  ...REIHE.map(([x, u], k) => ({ kind: 'schneesaeule', id: `r2_s${k + 1}`, roomId: 'r2', pos: P(1, x, u), segments: 4, behavior: 'chase', sight: 13, chaseSpeed: 1.2, wake: 40 })),
  // 3 Flugstube: Flatterkäfer pendelt quer, Brummer kreist
  { kind: 'flatterkaefer', id: 'r3_kaefer', roomId: 'r3', path: [P(2, -4.5, 8.5, Y + 2.0), P(2, 4.5, 8.5, Y + 2.0)], loop: false, speed: 1.8, color: 'pink', wake: 40 },
  { kind: 'brummer', id: 'r3_brummer', roomId: 'r3', center: P(2, 0, 12.5, Y + 2.3), radius: 2.2, speed: 2, sight: 6, wake: 40 },
  // 4 Bumerangbahn
  ...REIHE.map(([x, u], k) => werfer('bumerang_werfer', 3, x, u, k + 1)),
  // 5 Münzflur
  { kind: 'muenzmarder', id: 'r5_marder', roomId: 'r5', path: marderBahn, speed: 6.5, sight: 7, lead: 12, hp: 2, coins: 12 },
  // 6 Turmzimmer
  ...REIHE.map(([x, u], k) => ({ kind: 'pilzlingsturm', id: `r6_t${k + 1}`, roomId: 'r6', pos: P(5, x, u + 0.8), count: 3, behavior: 'chase', speed: 1.6, sight: 14, wake: 40 })),
  // 7 Glutküche
  ...REIHE.map(([x, u], k) => ({ kind: 'funkenflaemmchen', id: `r7_f${k + 1}`, roomId: 'r7', pos: P(6, x, u), behavior: 'chase', sight: 13, phase: k * 0.3 })),
  // 8 Zauberzimmer: je Kröte zwei Auftrittspunkte
  { kind: 'zauberkroete', id: 'r8_k1', roomId: 'r8', spots: [P(7, -4.5, 9.5), P(7, -2.5, 13.5)], hidden: 1.0, sight: 16, wake: 40 },
  { kind: 'zauberkroete', id: 'r8_k2', roomId: 'r8', spots: [P(7, 0, 11.5), P(7, 1.5, 14.5)], hidden: 1.0, sight: 16, wake: 40 },
  { kind: 'zauberkroete', id: 'r8_k3', roomId: 'r8', spots: [P(7, 4.5, 9.5), P(7, 2.5, 13.5)], hidden: 1.0, sight: 16, wake: 40 },
  // 9 Rankengarten: Ranken aus Blumentöpfen, immer ausgewachsen, Köpfe zur Figur
  ...[[-4.5, 13.2], [0, 14.6], [4.5, 13.2]].map(([x, u], k) => ({ kind: 'rankenschnapper', id: `r9_r${k + 1}`, roomId: 'r9', pos: P(8, x, u, Y + 0.4), dir: [0, 1], length: 3.4, height: 1.3, mode: 'static', reach: 1.8, sight: 6 })),
  // 10 Hammerhalle
  ...[[-3.5, 9], [0, 10.5], [3.5, 9]].map(([x, u], k) => werfer('hammer_werfer', 9, x, u, k + 1, { pace: 0.5, jumpEvery: 9, interval: 3.2 })),
];

// ====================================================================== Level-Haken

function setup(level) {
  const shared = { pos: [], uv: [] }, clocks = [];
  RAEUME.forEach((r, i) => {
    hausRaum(level, { ...r, index: i, z0: Z0(i), len: LEN, h: 6, paper: TAPETE6[r.paper] ? 'eigene' : r.paper }, shared, clocks);
    if (TAPETE6[r.paper]) tapete(level, { id: r.id, z0: Z0(i), len: LEN, h: 6 }, TAPETE6[r.paper]);
  });
  const uhren = hausFertig(level, shared, clocks);
  if (uhren) level.named.set('haus_uhren', uhren);
  level.world.forEach((s) => { if (s.tag === 'hauswand') s.noWallSlide = true; });
  level.named.set('kapseln', kraftKapsel(level, RAEUME.map((r, i) => ({ pos: KAPSEL(i), ...r.kapsel }))));
  wimpel(level, [{ z: zu(0, 5), y: Y + 5.4, sag: 0.6 }, { z: zu(3, 5), y: Y + 5.4, sag: 0.7, colors: [0xe8323a, 0xffffff, 0xffd23d] }, { z: zu(6, 5), y: Y + 5.4, sag: 0.6, colors: [0xff8a2a, 0xffd23d, 0xffffff] }]);
  teileInstanzen(level, ['rammbock_bulle', 'schneesaeule', 'feuer_werfer', 'pilzlingsturm', 'funkenflaemmchen', 'zauberkroete', 'rankenschnapper'], { name: 'haus', near: 40 });
  heroShadowDiet(level, 0.12);
  farHide(level, ['star', 'powerup', 'coin', 'muenze_flug', 'pow', 'zauberkugel', 'krakenpilz_stein'], 44);
}

// ====================================================================== Level-Daten

const area = (i) => ({ min: [-W / 2 - 0.5, Y - 3, zu(i, LEN) - 0.5], max: [W / 2 + 0.5, Y + 10, Z0(i) + 1.5] });
const cam = (i, o = {}) => ({ pitch: o.pitch ?? 50, dist: o.dist ?? 17, yaw: 0, fov: 44, x: 0, xLock: 0.6, ahead: 0, height: 1, center: P(i, 0, o.c ?? 8.5, Y), pull: o.pull ?? 0.55 });
const start = (i) => ({ pos: P(i, 0, 2.4), yaw: Math.PI / 2 });
const STARTS = RAEUME.map((r, i) => start(i));

export const LEVEL = {
  id: 'P-Haus',
  world: 10,
  title: 'Haus Zehnkampf',
  archetype: 'house',
  theme: 'house',
  music: 'course_house',
  timeLimit: 300,
  killY: Y - 8,
  setup: (level, scene) => { levelSetup(setup)(level, scene); cullStatic(level); },
  start: STARTS[0],
  house: {
    fail: 'exit',
    time: 10,
    rooms: RAEUME.map((r, i) => ({ id: r.id, goal: 'defeatAll', area: area(i), start: STARTS[i], camera: cam(i), star: P(i, 0, 7.5, Y + 1.6), time: 10, title: r.title })),
  },
  segments: [
    ...RAEUME.map((r, i) => floor(i, r.wood)),
    { type: 'sign', pos: P(5, -4.6, 3.4), text: 'POW!', size: [1.4, 0.7], post: 0.8 },
  ],
  enemies: ENEMIES,
  items: [
    // Turmzimmer: POW-Block in der Raummitte (zweimal benutzbar, wirft Türme im Umkreis um)
    { kind: 'pow', id: 'r6_pow', roomId: 'r6', pos: P(5, 0, 7.5), uses: 2, radius: 6, height: 3 },
  ],
  marks: Object.fromEntries(STARTS.map((s, i) => [`r${i + 1}`, s.pos])),
  // Daten für Tests/Bots
  _haus: { Z0: RAEUME.map((r, i) => Z0(i)), Y, LEN, names: RAEUME.map((r) => r.name), kapseln: RAEUME.map((r) => r.kapsel) },
};
