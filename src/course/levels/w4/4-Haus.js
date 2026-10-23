// 4-Haus „Haus Sausewind“ – Prüfungs-Haus der Welt 4 (Archetyp house, Bauplan 4-Haus: 10 Räume à 10 s, je ein Stern).
// Zehn lange Sprint-Räume (30–44 m, Fahrtrichtung −Z), jeder mit eigener Tapete, eigenem Boden, eigenen Möbeln und
// Bildern; über jedem Ausgang hängt eine große Raumuhr, deren roter Zeiger die zehn Sekunden des Raums abläuft (der
// kleine Zeiger zeigt die Raumnummer), dazu tickende Wanduhren. Ziel jedes Raums: den Stern am Ende erreichen.
//   1 Bauklotz-Zimmer     Sprungfelder an Klippen aus Riesen-Bauklötzen (über zwei Schluchten hinauf)
//   2 Sandkasten-Diele    Sandweg, vier Bahnen Hörner-Ameisen marschieren aus Röhren quer über den Weg
//   3 Ahnengalerie        enger Galeriegang: Flucht vor einem Riesenprojektil, Samtkordeln überspringen
//   4 Backstube           Weg zwischen fünf Walzenwerfern auf den Backtheken (Walzen rollen quer)
//   5 Seiltänzer-Saal     dünner Steg über dem Abgrund, darüber ein Münzblock
//   6 Maschinenhalle      Boost-Pfeile unter acht Stampfsteinen im engen Maschinengang
//   7 Schaukelzimmer      drei Schaukeln über dem Abgrund (gegenläufig)
//   8 Pilzlingsparade     Pilzlinge marschieren in Reihen heran, Mini-Pilzlinge flitzen dazwischen
//   9 Kanonengang         dünner Weg über dem Abgrund, seitlich feuern Kanonen Suchköpfe
//  10 Dachboden           Bröckelblöcke über dem Abgrund, vom Ende rollen Stachelwalzen heran
// Zeit abgelaufen → Haus verlassen mit den bisherigen Sternen (fail 'exit'); Tod → Raum von vorn. Thema house,
// Musik course_house. Räume bei x 0, z 0 / −64 / … / −576 (je Raum eigene 32-m-Abschnitte und eigene Kamera).
// Level-Haken (LEVEL.setup, _helpers_d.js): Raumhüllen (Tapeten, Täfelung, Böden, Bilder, Uhren, Möbel), Röhren,
// Stellwände, Theken, Maschinen, Schaukeln, Pilze, Dachbalken; Riesenprojektil in Raum 3 (raumHaken); Budget.

import {
  isl, levelSetup, cullStatic, farHide, teileInstanzen, heroShadowDiet, hausRaum, hausFertig, schaukeln, raumHaken, bakeParts, blk, cyl, sph,
} from './_helpers_d.js';

const Y = 1;          // Fußboden
const W = 14;         // Raumbreite (x −7 … 7)
const SP = 64;        // Abstand der Räume (z)
const BOT = -6;       // Unterkante der Schacht-Klippen
const Z0 = (i) => -SP * i;                  // Raumanfang (Startseite)
const zu = (i, u) => Z0(i) - u;             // u m in den Raum hinein
const P = (i, x, u, y = Y) => [x, y, zu(i, u)];
const floor = (i, u0, u1, o = {}) => isl(o.x0 ?? -W / 2, o.x1 ?? W / 2, zu(i, u0), zu(i, u1), o.y ?? Y, o.h ?? 1.2, { top: 'none', under: 0, color: o.color ?? 0x8a5a3a });
const cliff = (i, x0, x1, u0, u1, top, color) => isl(x0, x1, zu(i, u0), zu(i, u1), top, top - BOT, { top: 'none', under: 0, color });

// ====================================================================== Räume

const R1A = Y + 3.5, R1B = Y + 6;           // Bauklotz-Klippen
const KLOTZ_A = [0xff5a5a, 0xffc83a, 0x4a8aff, 0x4ac86a], KLOTZ_B = [0x4a8aff, 0x4ac86a, 0xff5a5a, 0xffc83a];
const LANES2 = [9, 16, 23, 30];             // Ameisenbahnen (u)
const ROPES3 = [13, 21, 29];                // Samtkordeln (u)
const LANES4 = [9, 15, 21, 27, 33];         // Walzenwerfer (u), abwechselnd links/rechts
const STONES6 = Array.from({ length: 8 }, (_, k) => 12 + k * 2.6);
const SWING7 = [11, 18.5, 26];
const CAN9 = [10, 17, 22, 27, 32];
const KANONEN_TAKT = [0, 0.03, 0.53, 1.03, 1.53];   // s nach dem Start bis zum Laden je Kanone (Kopf kreuzt den Steg kurz vor der Figur)

/**
 * Raumdaten: len (m), h (Wandhöhe), pit (Abgrund statt Boden), Tapete/Täfelung, Böden (Muster), Bilder, Uhren, Möbel,
 * Kamera, Stern (u, y) und Titel.
 */
const RAEUME = [
  { id: 'r1', name: 'Bauklotz-Zimmer', title: 'Bauklotz-Zimmer: Über die Klippen!', len: 40, h: 9, pit: true, paper: 'bauklotz', wood: 0x4a8ad8,
    star: [36.5, R1B + 1.2],
    floors: [{ u0: -1, u1: 8, style: 'puzzle' },
      ...[0, 1, 2, 3].flatMap((k) => [{ u0: 14, u1: 21, x0: -7 + k * 3.5, x1: -3.5 + k * 3.5, y: R1A, style: 'uni', color: KLOTZ_A[k] },
        { u0: 27, u1: 40, x0: -7 + k * 3.5, x1: -3.5 + k * 3.5, y: R1B, style: 'uni', color: KLOTZ_B[k] }])],
    pictures: [{ wall: 'l', u: 3.5, motif: 'lotti' }, { wall: 'r', u: 3.5, motif: 'greta' }, { wall: 'l', u: 24, y: 4.2, motif: 'trampolin' }, { wall: 'r', u: 24, y: 4.2, motif: 'pflaume' },
      { wall: 'b', x: -4.2, y: 7.0, motif: 'stern' }, { wall: 'b', x: 4.2, y: 7.0, motif: 'kruemel' }],
    clocks: [{ wall: 'l', u: 12, y: 5.2, r: 0.45 }, { wall: 'r', u: 31, y: 7.4, r: 0.45, speed: 1.5 }],
    props: [{ kind: 'teddy', x: -5.2, u: 1.6, yaw: 0.5 }, { kind: 'ball', x: 4.6, u: 4.2, color: 0xff5a7a }, { kind: 'ball', x: 5.6, u: 1.4, r: 0.22, color: 0x5ab8ff },
      { kind: 'kiste', x: -5.2, u: 16, y: R1A, size: 1, color: 0xffd23d }, { kind: 'kiste', x: 5.4, u: 19.5, y: R1A, size: 0.8, color: 0xff7a7a },
      { kind: 'pferd', x: -4.6, u: 33.5, y: R1B, yaw: 0.4 }, { kind: 'teddy', x: 5.2, u: 38.6, y: R1B, yaw: -0.4 }, { kind: 'pflanze', x: 6.1, u: 30, y: R1B }] },
  { id: 'r2', name: 'Sandkasten-Diele', title: 'Sandkasten-Diele: Vorsicht, Hörner-Ameisen!', len: 40, h: 5, paper: 'wueste', wood: 0xc8783a,
    star: [37, Y + 1.2],
    floors: [{ u0: -1, u1: 40, style: 'sand' }],
    pictures: [{ wall: 'l', u: 4, motif: 'kaktus' }, { wall: 'r', u: 4, motif: 'canyon' }, { wall: 'l', u: 34.5, motif: 'zielfahne' }, { wall: 'r', u: 34.5, motif: 'berg' },
      { wall: 'b', x: -4.4, y: 2.0, motif: 'pilz' }],
    clocks: [{ wall: 'l', u: 19.5, y: 3.0, r: 0.4 }, { wall: 'r', u: 26.5, y: 3.0, r: 0.4, speed: 2 }],
    props: [{ kind: 'sandburg', x: -4.6, u: 4.5 }, { kind: 'sandburg', x: 4.8, u: 36 }, { kind: 'kaktus', x: 5.8, u: 12.5 }, { kind: 'kaktus', x: -5.8, u: 26.5, size: 1.2 },
      { kind: 'eimer', x: 4.2, u: 2.2, color: 0xff5a5a }, { kind: 'eimer', x: -4.8, u: 34, color: 0x3a8aff }, { kind: 'ball', x: -5.6, u: 19.5, color: 0xffd23d, r: 0.25 }] },
  { id: 'r3', name: 'Ahnengalerie', title: 'Ahnengalerie: Lauf!', len: 44, h: 6, paper: 'galerie', wood: 0x4a2a1a, frontHole: [-1.35, 1.35, Y + 0.9, Y + 3.45],
    star: [41.5, Y + 1.7],
    floors: [{ u0: -1, u1: 44, style: 'parkett' }, { u0: -1, u1: 41, style: 'laeufer', x0: -1.1, x1: 1.1, y: Y + 0.006 }],
    pictures: [
      ...[['lotti', 8], ['baron', 17], ['burg', 25], ['see', 33]].map(([m, u]) => ({ wall: 'l', at: 1.5, u, y: 1.15, w: 1.2, h: 0.95, motif: m })),
      ...[['greta', 11], ['pflaume', 19], ['kruemel', 27], ['berg', 36]].map(([m, u]) => ({ wall: 'r', at: 1.5, u, y: 1.15, w: 1.2, h: 0.95, motif: m })),
      { wall: 'l', u: 3, y: 2.4, w: 1.6, h: 1.2, motif: 'canyon' }, { wall: 'r', u: 3, y: 2.4, w: 1.6, h: 1.2, motif: 'piep' },
      { wall: 'b', x: -4.6, y: 2.2, w: 1.4, h: 1.1, motif: 'baron' }, { wall: 'b', x: 4.6, y: 2.2, w: 1.4, h: 1.1, motif: 'zielfahne' }],
    clocks: [{ wall: 'l', u: 22, y: 3.6, r: 0.5 }, { wall: 'r', u: 14, y: 3.6, r: 0.5, speed: 0.5 }],
    props: [
      ...[7, 15, 23, 31, 38].map((u, k) => ({ kind: 'buste', x: -4.4, u, yaw: Math.PI / 2, color: [0xd8d0c8, 0xc8a878, 0xd0d8e0][k % 3] })),
      ...[10, 18, 26, 34].map((u) => ({ kind: 'ruestung', x: 4.4, u, yaw: -Math.PI / 2 })),
      ...ROPES3.map((u) => ({ kind: 'kordel', x: 0, u, len: 3.0, solid: false })),
      { kind: 'pflanze', x: -5.8, u: 42.5, size: 1.2 }, { kind: 'pflanze', x: 5.8, u: 42.5, size: 1.2 }, { kind: 'standuhr', x: -5.8, u: 1.5, yaw: Math.PI / 2 }] },
  { id: 'r4', name: 'Backstube', title: 'Backstube: Zwischen den Walzenwerfern durch!', len: 40, h: 5, paper: 'backstube', wood: 0x3a6ad0,
    star: [37, Y + 1.2],
    floors: [{ u0: -1, u1: 40, style: 'kacheln' }, { u0: 5, u1: 37, style: 'holz', x0: 4.6, x1: 7, y: Y + 1 }, { u0: 5, u1: 37, style: 'holz', x0: -7, x1: -4.6, y: Y + 1 }],
    pictures: [{ wall: 'b', x: -4.4, y: 2.2, motif: 'pilz' }, { wall: 'b', x: 4.4, y: 2.2, motif: 'see' }, { wall: 'l', u: 2.5, y: 2.4, motif: 'kruemel' }, { wall: 'r', u: 2.5, y: 2.4, motif: 'pflaume' }],
    clocks: [{ wall: 'l', u: 18, y: 3.4, r: 0.42 }, { wall: 'r', u: 24, y: 3.4, r: 0.42, speed: 1.5 }],
    props: [
      { kind: 'ofen', x: -5.8, u: 12, y: Y + 1, yaw: Math.PI / 2 }, { kind: 'ofen', x: 5.8, u: 24, y: Y + 1, yaw: -Math.PI / 2 }, { kind: 'ofen', x: -5.8, u: 30, y: Y + 1, yaw: Math.PI / 2 },
      { kind: 'brote', x: 5.9, u: 18, y: Y + 1, yaw: -Math.PI / 2 }, { kind: 'brote', x: -5.9, u: 18, y: Y + 1, yaw: Math.PI / 2 }, { kind: 'brote', x: 5.9, u: 30, y: Y + 1, yaw: -Math.PI / 2 },
      { kind: 'mehl', x: -6.2, u: 6.2, y: Y + 1 }, { kind: 'mehl', x: 6.2, u: 35.6, y: Y + 1 }, { kind: 'mehl', x: 6.2, u: 11.8, y: Y + 1 },
      { kind: 'tisch', x: -4.6, u: 1.6, w: 1.8, d: 1.0, cloth: 0xffffff, plates: 2 }] },
  { id: 'r5', name: 'Seiltänzer-Saal', title: 'Seiltänzer-Saal: Über den Steg!', len: 38, h: 7, pit: true, paper: 'zirkus', wood: 0xd8283a,
    star: [35.5, Y + 1.2],
    floors: [{ u0: -1, u1: 5, style: 'holz' }, { u0: 33, u1: 38, style: 'holz' },
      ...[[5, 15], [16.6, 26], [27.6, 33]].map(([u0, u1]) => ({ u0, u1, x0: -0.5, x1: 0.5, style: 'uni', color: 0xd8283a }))],
    pictures: [{ wall: 'l', u: 3, y: 2.3, motif: 'trampolin' }, { wall: 'r', u: 3, y: 2.3, motif: 'stern' }, { wall: 'b', x: -4.4, y: 2.3, motif: 'lotti' }, { wall: 'b', x: 4.4, y: 2.3, motif: 'greta' }],
    clocks: [{ wall: 'l', u: 20, y: 4.0, r: 0.5 }, { wall: 'r', u: 14, y: 4.0, r: 0.5, speed: 2 }],
    props: [{ kind: 'trommel', x: -5.4, u: 2.4 }, { kind: 'trommel', x: 5.4, u: 1.6 }, { kind: 'ball', x: 3.6, u: 3.6, color: 0xffd23d, r: 0.35 },
      { kind: 'stange', x: -0.85, u: 4.8, h: 2.6 }, { kind: 'stange', x: 0.85, u: 4.8, h: 2.6 }, { kind: 'stange', x: -0.85, u: 33.2, h: 2.6 }, { kind: 'stange', x: 0.85, u: 33.2, h: 2.6 },
      { kind: 'pferd', x: -4.8, u: 35.6, yaw: 0.5 }, { kind: 'trommel', x: 5.4, u: 36 }] },
  { id: 'r6', name: 'Maschinenhalle', title: 'Maschinenhalle: Mit Schwung unter den Stampfsteinen durch!', len: 40, h: 6, paper: 'maschine', wood: 0x3a4a5a,
    star: [37, Y + 1.2],
    floors: [{ u0: -1, u1: 40, style: 'metall' }, { u0: 10, u1: 32, x0: -7, x1: -1.2, y: Y + 2.6, style: 'uni', color: 0x6a7a90 }, { u0: 10, u1: 32, x0: 1.2, x1: 7, y: Y + 2.6, style: 'uni', color: 0x6a7a90 }],
    pictures: [{ wall: 'l', u: 4, y: 2.4, motif: 'piep' }, { wall: 'r', u: 4, y: 2.4, motif: 'burg' }, { wall: 'b', x: -4.6, y: 2.2, motif: 'berg' }],
    clocks: [{ wall: 'l', u: 36, y: 3.4, r: 0.45 }, { wall: 'r', u: 36, y: 3.4, r: 0.45, speed: 3 }],
    props: [{ kind: 'rohre', x: -6.2, u: 2 }, { kind: 'rohre', x: 6.2, u: 6.5 }, { kind: 'kiste', x: 5.4, u: 2, size: 1.1, color: 0xd8a83a }, { kind: 'kiste', x: -5.2, u: 37.5, size: 0.9, color: 0xd8a83a },
      { kind: 'zahnrad', x: -4, u: 10.05, y: Y + 1.3, r: 0.9, yaw: 0, solid: false }, { kind: 'zahnrad', x: 4.2, u: 10.05, y: Y + 1.4, r: 1.0, solid: false }] },
  { id: 'r7', name: 'Schaukelzimmer', title: 'Schaukelzimmer: Von Schaukel zu Schaukel!', len: 38, h: 8, pit: true, paper: 'schaukel', wood: 0x2a8a6a,
    star: [35, Y + 1.2],
    floors: [{ u0: -1, u1: 6, style: 'teppich' }, { u0: 31, u1: 38, style: 'teppich' }],
    pictures: [{ wall: 'l', u: 3, y: 2.3, motif: 'see' }, { wall: 'r', u: 3, y: 2.3, motif: 'kruemel' }, { wall: 'b', x: -4.4, y: 2.3, motif: 'trampolin' }, { wall: 'b', x: 4.4, y: 2.3, motif: 'pflaume' }],
    clocks: [{ wall: 'l', u: 18.5, y: 5.6, r: 0.5 }, { wall: 'r', u: 18.5, y: 5.6, r: 0.5, speed: 0.5 }],
    props: [{ kind: 'teddy', x: -5.4, u: 2.4, yaw: 0.4 }, { kind: 'lampe', x: 5.8, u: 1.2 }, { kind: 'pflanze', x: -5.9, u: 36.6 }, { kind: 'ball', x: 4.6, u: 34, color: 0xff6a8a, r: 0.3 }] },
  { id: 'r8', name: 'Pilzlingsparade', title: 'Pilzlingsparade: Hindurch!', len: 38, h: 5, paper: 'pilz', wood: 0x7a4a2a,
    star: [35.5, Y + 1.2],
    floors: [{ u0: -1, u1: 38, style: 'stein' }],
    pictures: [{ wall: 'l', u: 3, y: 2.3, motif: 'pilz' }, { wall: 'r', u: 3, y: 2.3, motif: 'pilz' }, { wall: 'b', x: -4.4, y: 2.3, motif: 'stern' }, { wall: 'b', x: 4.4, y: 2.3, motif: 'zielfahne' }],
    clocks: [{ wall: 'l', u: 20, y: 3.4, r: 0.42 }, { wall: 'r', u: 20, y: 3.4, r: 0.42, speed: 1.5 }],
    props: [{ kind: 'riesenpilz', x: -6.0, u: 7, size: 1.2 }, { kind: 'riesenpilz', x: 6.0, u: 14, color: 0x4a8aff }, { kind: 'riesenpilz', x: -6.0, u: 22, color: 0xffb02a, size: 0.9 },
      { kind: 'riesenpilz', x: 6.0, u: 29, size: 1.3 }, { kind: 'trommel', x: -5.2, u: 36.4 }, { kind: 'trommel', x: 5.2, u: 36.4 }, { kind: 'riesenpilz', x: 5.8, u: 1.6, size: 0.7, color: 0x5ac85a }] },
  { id: 'r9', name: 'Kanonengang', title: 'Kanonengang: Vorsicht, Suchköpfe!', len: 40, h: 6, pit: true, paper: 'kanone', wood: 0x1e2a5a,
    star: [37, Y + 1.2],
    floors: [{ u0: -1, u1: 4, style: 'stein' }, { u0: 34, u1: 40, style: 'stein' }, { u0: 6, u1: 34, style: 'metall', x0: 4.8, x1: 7, y: Y + 1.2 }, { u0: 6, u1: 34, style: 'metall', x0: -7, x1: -4.8, y: Y + 1.2 }],
    pictures: [{ wall: 'l', u: 2, y: 2.3, motif: 'burg' }, { wall: 'r', u: 2, y: 2.3, motif: 'baron' }, { wall: 'b', x: -4.4, y: 2.3, motif: 'zielfahne' }, { wall: 'b', x: 4.4, y: 2.3, motif: 'stern' }],
    clocks: [{ wall: 'l', u: 36.5, y: 3.4, r: 0.42 }, { wall: 'r', u: 36.5, y: 3.4, r: 0.42, speed: 2 }],
    props: [{ kind: 'kiste', x: -5.6, u: 1.8, size: 1.0, color: 0x6a4a2a }, { kind: 'kiste', x: 5.6, u: 37.5, size: 1.0, color: 0x6a4a2a }] },
  { id: 'r10', name: 'Dachboden', title: 'Dachboden: Schnell, die Blöcke bröckeln!', len: 38, h: 7, pit: true, paper: 'dachboden', wood: 0x5a3a1e,
    star: [32.6, Y + 1.2],
    floors: [{ u0: -1, u1: 5, style: 'holz' }, { u0: 31, u1: 38, style: 'holz' }],
    pictures: [{ wall: 'l', u: 2.5, y: 2.3, motif: 'piep' }, { wall: 'r', u: 2.5, y: 2.3, motif: 'see' }, { wall: 'b', x: -4.6, y: 3.6, motif: 'baron' }, { wall: 'b', x: 4.6, y: 3.6, motif: 'burg' }],
    clocks: [{ wall: 'l', u: 18, y: 4.4, r: 0.45 }],
    props: [{ kind: 'truhe', x: -5.4, u: 2.2, yaw: 0.3 }, { kind: 'kiste', x: 5.2, u: 1.6, size: 1.1 }, { kind: 'kiste', x: 5.6, u: 3.2, size: 0.8 }, { kind: 'pferd', x: -5, u: 35.5, yaw: 0.6 },
      { kind: 'truhe', x: 5.0, u: 35.8, yaw: -0.3 }, { kind: 'lampe', x: -6.2, u: 33 }, { kind: 'spinne', x: -6.4, u: 0.2, y: Y + 6.2, solid: false }, { kind: 'spinne', x: 6.4, u: 37.4, y: Y + 6.2, solid: false }] },
];

// ====================================================================== Level-Haken

function setup(level) {
  const shared = { pos: [], uv: [] }, clocks = [];
  RAEUME.forEach((r, i) => hausRaum(level, { ...r, index: i, z0: Z0(i) }, shared, clocks));
  const uhren = hausFertig(level, shared, clocks);
  if (uhren) level.named.set('haus_uhren', uhren);
  const deco = [];
  // 1 Bauklotz-Zimmer: Noppen auf den Klötzen, Kanten hell
  for (let k = 0; k < 4; k++) {
    const x0 = -7 + k * 3.5;
    for (const [u0, u1, top, col] of [[14, 21, R1A, KLOTZ_A[k]], [27, 40, R1B, KLOTZ_B[k]]]) {
      for (let a = 0; a < 2; a++) for (let b = 0; b < Math.floor((u1 - u0) / 2.6); b++) deco.push(cyl(0.3, 0.3, 0.1, x0 + 0.95 + a * 1.6, top, zu(0, u0 + 1.3 + b * 2.6), col, 12));
      deco.push(blk(3.46, 0.1, 0.1, x0 + 1.75, top - 0.1, zu(0, u0) + 0.03, 0xffffff));
    }
  }
  // 2 Sandkasten-Diele: Röhren in den Seitenwänden (Ameisen kommen heraus und verschwinden drüben)
  for (const u of LANES2) {
    for (const sx of [-1, 1]) {
      deco.push(cyl(0.62, 0.62, 1.1, sx * 6.45, Y + 0.62, zu(1, u), 0x3fae4a, 14, { rz: Math.PI / 2, center: true }));
      deco.push(cyl(0.72, 0.72, 0.3, sx * 5.95, Y + 0.62, zu(1, u), 0x5ac85a, 14, { rz: Math.PI / 2, center: true }));
      deco.push(cyl(0.5, 0.5, 0.02, sx * 5.79, Y + 0.62, zu(1, u), 0x0a140a, 12, { rz: Math.PI / 2, center: true }));
    }
    deco.push(blk(12, 0.02, 1.0, 0, Y + 0.012, zu(1, u), 0xd0ae6a));   // Ameisenspur im Sand
  }
  // 3 Ahnengalerie: Stellwände (fest) mit Goldleiste, Podest für den Stern
  for (const sx of [-1, 1]) {
    deco.push(blk(0.4, 2.4, 35, sx * 1.7, Y, zu(2, 22.5), 0x5a2a1e), blk(0.48, 0.1, 35, sx * 1.7, Y + 2.4, zu(2, 22.5), 0xd8a83a), blk(0.44, 0.12, 35, sx * 1.7, Y, zu(2, 22.5), 0x3a1a10));
    level.world.add({ type: 'box', min: [sx > 0 ? 1.5 : -1.9, Y, zu(2, 40)], max: [sx > 0 ? 1.9 : -1.5, Y + 2.4, zu(2, 5)], tag: 'stellwand' });
  }
  deco.push(blk(1.4, 0.5, 1.4, 0, Y, zu(2, 41.5), 0xd8a83a, { top: 0xffd860 }));
  for (const u of ROPES3) level.world.add({ type: 'box', min: [-1.5, Y, zu(2, u) - 0.15], max: [1.5, Y + 0.72, zu(2, u) + 0.15], camIgnore: true, tag: 'kordel' });
  // 4 Backstube: Thekenfronten (Kacheln) und Brezel-Schilder
  for (const sx of [-1, 1]) {
    deco.push(blk(0.06, 0.9, 32, sx * 4.62, Y + 0.05, zu(3, 21), 0x5a8ad8));
    for (let k = 0; k < 8; k++) deco.push(blk(0.07, 0.08, 0.8, sx * 4.6, Y + 0.5, zu(3, 7 + k * 4), 0xffffff));
  }
  // 5 Seiltänzer-Saal: Steg rot-weiß
  for (const [u0, u1] of [[5, 15], [16.6, 26], [27.6, 33]]) for (let u = u0; u < u1 - 0.01; u += 1) deco.push(blk(1.02, 0.06, Math.min(1, u1 - u) * 0.5, 0, Y - 0.03, zu(4, u + 0.25), 0xffffff));
  // 6 Maschinenhalle: Warnstreifen, Rohre auf den Gehäusen, Lämpchen
  for (const sx of [-1, 1]) {
    for (let k = 0; k < 7; k++) deco.push(blk(0.42, 0.42, 0.06, sx * (1.5 + k * 0.8), Y + 2.2, zu(5, 10) + 0.03, k % 2 ? 0x1a1a1a : 0xffc21a));
    deco.push(cyl(0.22, 0.22, 21, sx * 4.2, Y + 2.85, zu(5, 21), 0x9aa8b8, 10, { rx: Math.PI / 2, center: true }));
    deco.push(cyl(0.16, 0.16, 21, sx * 5.6, Y + 2.8, zu(5, 21), 0xc8783a, 8, { rx: Math.PI / 2, center: true }));
    for (let k = 0; k < 6; k++) deco.push(blk(0.8, 0.5, 0.8, sx * 2.6, Y + 2.6, zu(5, 12 + k * 3.6), 0x6a7a90, { top: 0x8a9ab0 }));
  }
  // 7 Schaukelzimmer: Deckenbalken für die Schaukeln
  for (const u of SWING7) deco.push(blk(W, 0.4, 0.4, 0, Y + 5.7, zu(6, u), 0x6a3a1a));
  // 9 Kanonengang: Steg aus Planken, Geländer der Kanonensimse
  for (let u = 4; u < 34; u += 0.6) deco.push(blk(1.62, 0.05, 0.54, 0, Y - 0.02, zu(8, u + 0.3), (u * 10) % 12 < 6 ? 0x9a6a3e : 0x8a5a32));
  for (const sx of [-1, 1]) deco.push(blk(0.1, 0.5, 28, sx * 4.85, Y + 1.2, zu(8, 20), 0xd8a83a));
  // 10 Dachboden: Dachbalken und Stützen
  for (const u of [8, 20, 28]) {
    deco.push(blk(W, 0.3, 0.3, 0, Y + 6.2, zu(9, u), 0x6a4422));
    for (const sx of [-1, 1]) deco.push(blk(0.3, 6.2, 0.3, sx * 6.7, Y - 7, zu(9, u), 0x6a4422));
  }
  bakeParts(level, deco, { castShadow: false });
  // Schaukeln (Raum 7): gegenläufig, Bretter tragen die Figur
  schaukeln(level, SWING7.map((u, k) => ({ id: `schaukel${k + 1}`, pos: [0, Y + 5.7, zu(6, u)], rope: 5.2, w: 2.6, d: 1.8, amp: 0.4, period: 2.5, phase: k % 2 ? 0.5 : 0 })));
  // Raum 3: Riesenprojektil 1 s nach dem Countdown-Start hinter der Figur (durch die Öffnung der Vorderwand); Raum 10: Bröckelblöcke frisch
  const kugel = { bullet: null, t: -1, shots: 0, maxNear: 0 };
  level.named.set('r3_kugel', kugel);
  // Walzen-Räume beginnen frisch: alte Walzen zerfallen, die Werfer holen erst nach `first` s aus (fair und gleich
  // für jeden Versuch – auch nach einem Neustart)
  // takt: je Werfer die Zeit (s nach dem Start), zu der er die erste Walze loslässt (Ausholen 1,2 s + 0,3 s Wurf)
  const frischeWalzen = (i, ids, takt) => {
    const zA = Z0(i) + 2, zB = zu(i, RAEUME[i].len) - 2;
    for (const e of level.entities) if (e.kind === 'stachelwalze' && !e.removed && e.pos.z < zA && e.pos.z > zB) e.kill();
    ids.forEach((id, k) => {
      const w = level.named.get(id);
      if (!w || w.removed || w.defeated) return;
      w.walzen = [];
      const r = takt?.[k];
      if (r !== undefined && r < 1.5 && w.setState) { w.setState('spit'); w.stateT = 1.5 - r; w.cool = w.interval; }
      else { w.cool = r !== undefined ? r - 1.5 : (w.spec.first ?? 0.8); w.setState?.('idle'); }
    });
  };
  raumHaken(level, {
    play(i) {
      if (i === 2) kugel.t = 1.0;
      if (i === 3) frischeWalzen(3, LANES4.map((u, k) => `r4_werfer${k + 1}`), LANES4.map((u, k) => 0.3 + k * 0.4));
      if (i === 8) {
        // Kanonengang: alte Suchköpfe weg, die Kanonen laden gestaffelt (die Köpfe kreuzen den Steg, wenn man vorbeikommt)
        for (const e of level.entities) if (e.kind === 'suchkopf' && !e.removed && e.pos.z < Z0(8) + 2 && e.pos.z > zu(8, 42)) e.kill();
        CAN9.forEach((u, k) => { const kn = level.named.get(`r9_kanone${k + 1}`); if (kn && !kn.removed) { kn.heads = []; kn.setState?.('idle'); kn.cool = KANONEN_TAKT[k]; } });
      }
      if (i === 9) {
        frischeWalzen(9, ['r10_werfer'], [0.6]);
        for (const id of ['broeckel_a', 'broeckel_b']) for (const b of level.named.get(id)?.blocks ?? []) {
          if (b.state === 'gone') b.t = 1e9;
          else if (b.state === 'shake') { b.state = 'idle'; b.t = 0; }
        }
      }
    },
    leave(i) {
      if (i !== 2) return;
      kugel.t = -1;
      if (kugel.bullet && !kugel.bullet.removed) kugel.bullet.kill();
      kugel.bullet = null;
    },
  });
  level.onStep((dt) => {
    if (kugel.t > 0) {
      kugel.t -= dt;
      if (kugel.t <= 0) {
        kugel.t = -1;
        kugel.bullet = level.spawn('riesenprojektil', { pos: [0, Y + 0.95, zu(2, -1.2)], dir: [0, -1], speed: 7.5, life: 9 });
        kugel.shots++;
        level.sfx('cannon');
        level.effects?.ring({ x: 0, y: Y + 2.1, z: zu(2, -0.6) }, 2.2);
      }
    }
    const b = kugel.bullet, p = level.player;
    if (b && !b.removed && p) kugel.near = (b.pos.z - 2.3) - p.pos.z;   // Abstand Nase → Figur (m, > 0: Figur vorn)
  });
  teileInstanzen(level, ['pilzling', 'stampfstein', 'walzenwerfer', 'kanone_turm', 'stachelwalze', 'suchkopf'], { name: 'haus', near: 46 });
  heroShadowDiet(level, 0.12);
  farHide(level, ['pilzling', 'stampfstein', 'walzenwerfer', 'kanone_turm', 'stachelwalze', 'suchkopf', 'ameisensoldat_horn', 'riesenprojektil', 'star'], 52);
}

// ====================================================================== Level-Daten

const area = (i) => ({ min: [-W / 2 - 0.5, BOT - 3, zu(i, RAEUME[i].len) - 0.5], max: [W / 2 + 0.5, Y + 14, Z0(i) + 1.5] });
const cam = (i, o = {}) => ({ pitch: o.pitch ?? 41, dist: o.dist ?? 13.5, yaw: 0, fov: o.fov ?? 44, x: 0, xLock: o.xLock ?? 0.55, ahead: o.ahead ?? 3.2, height: o.height ?? 1.0 });
const start = (i) => ({ pos: P(i, 0, 2.5), yaw: Math.PI / 2 });
const CAMS = [cam(0, { pitch: 44, dist: 15 }), cam(1), cam(2, { pitch: 44, dist: 12.5, xLock: 0.8 }), cam(3), cam(4, { pitch: 40 }), cam(5, { pitch: 43 }),
  cam(6, { pitch: 37, dist: 14.5 }), cam(7), cam(8, { pitch: 42 }), cam(9, { pitch: 40 })];

export const LEVEL = {
  id: '4-Haus',
  world: 4,
  title: 'Haus Sausewind',
  archetype: 'house',
  theme: 'house',
  music: 'course_house',
  timeLimit: 300,
  killY: -4,
  setup: (level, scene) => { levelSetup(setup)(level, scene); cullStatic(level); },
  start: start(0),
  house: {
    fail: 'exit',
    time: 10,
    rooms: RAEUME.map((r, i) => ({ id: r.id, goal: 'reach', area: area(i), start: start(i), camera: CAMS[i], star: P(i, 0, r.star[0], r.star[1]), time: 10, title: r.title })),
  },
  segments: [
    // 1 Bauklotz-Zimmer: Startboden, Klippe A (y 4,5) und Klippe B (y 7) aus Riesen-Bauklötzen, Sprungfelder
    cliff(0, -7, 7, -1, 8, Y, 0xe8c890),
    ...[0, 1, 2, 3].flatMap((k) => [
      cliff(0, -7 + k * 3.5, -3.5 + k * 3.5, 14, 21, R1A, KLOTZ_A[k]),
      cliff(0, -7 + k * 3.5, -3.5 + k * 3.5, 27, 40, R1B, KLOTZ_B[k]),
    ]),
    { type: 'sprungfeld', id: 'r1_sf1', pos: P(0, 0, 5.5), to: P(0, 0, 17, R1A), arc: 2.5 },
    { type: 'sprungfeld', id: 'r1_sf2', pos: P(0, 0, 19, R1A), to: P(0, 0, 30.5, R1B), arc: 2.5 },
    // 2 Sandkasten-Diele
    floor(1, -1, 40, { color: 0xe2c47e }),
    // 3 Ahnengalerie
    floor(2, -1, 44, { color: 0x6a361a }),
    // 4 Backstube: Boden und Backtheken links/rechts (Walzenwerfer darauf)
    floor(3, -1, 40, { color: 0xd8d4c8 }),
    isl(4.6, 7, zu(3, 5), zu(3, 37), Y + 1, 1, { top: 'none', under: 0, color: 0xe8e4dc }),
    isl(-7, -4.6, zu(3, 5), zu(3, 37), Y + 1, 1, { top: 'none', under: 0, color: 0xe8e4dc }),
    // 5 Seiltänzer-Saal: Startpodest, dünner Steg (1 m) in drei Stücken, Zielpodest
    cliff(4, -7, 7, -1, 5, Y, 0xa86a3a),
    ...[[5, 15], [16.6, 26], [27.6, 33]].map(([a, b]) => isl(-0.5, 0.5, zu(4, a), zu(4, b), Y, 0.5, { top: 'none', under: 0, color: 0xd8283a })),
    cliff(4, -7, 7, 33, 38, Y, 0xa86a3a),
    // 6 Maschinenhalle: Boden, Maschinengehäuse links/rechts (enger Gang 2,4 m), Boost-Pfeile
    floor(5, -1, 40, { color: 0x6a7688 }),
    isl(-7, -1.2, zu(5, 10), zu(5, 32), Y + 2.6, 2.6, { top: 'none', under: 0, color: 0x5a6a80 }),
    isl(1.2, 7, zu(5, 10), zu(5, 32), Y + 2.6, 2.6, { top: 'none', under: 0, color: 0x5a6a80 }),
    { type: 'boost', pos: P(5, 0, 7), dir: [0, -1], speed: 18, size: [1.8, 2.4] },
    { type: 'boost', pos: P(5, 0, 19.6), dir: [0, -1], speed: 18, size: [1.8, 2.0] },
    // 7 Schaukelzimmer: Start- und Zielpodest (Schaukeln im Level-Haken)
    cliff(6, -7, 7, -1, 6, Y, 0x2a6a52),
    cliff(6, -7, 7, 31, 38, Y, 0x2a6a52),
    // 8 Pilzlingsparade
    floor(7, -1, 38, { color: 0x8a7e92 }),
    // 9 Kanonengang: Startpodest, schmaler Steg (1,6 m), Kanonensimse, Zielpodest
    cliff(8, -7, 7, -1, 4, Y, 0x3a4a7a),
    isl(-0.8, 0.8, zu(8, 4), zu(8, 34), Y, 0.6, { top: 'none', under: 0, color: 0x8a5a32 }),
    cliff(8, 4.8, 7, 6, 34, Y + 1.2, 0x2a3a6a),
    cliff(8, -7, -4.8, 6, 34, Y + 1.2, 0x2a3a6a),
    cliff(8, -7, 7, 34, 40, Y, 0x3a4a7a),
    // 10 Dachboden: Startpodest, zwei Reihen Bröckelblöcke (26 m), Zielpodest mit Walzenwerfer
    cliff(9, -7, 7, -1, 5, Y, 0x7a5232),
    { type: 'broeckelblock', id: 'broeckel_a', from: P(9, -0.5, 5.5, Y - 1), to: P(9, -0.5, 30.5, Y - 1), delay: 0.5, respawn: 3 },
    { type: 'broeckelblock', id: 'broeckel_b', from: P(9, 0.5, 5.5, Y - 1), to: P(9, 0.5, 30.5, Y - 1), delay: 0.5, respawn: 3 },
    cliff(9, -7, 7, 31, 38, Y, 0x7a5232),
  ],
  enemies: [
    // 2 Hörner-Ameisen: vier Bahnen, abwechselnd von links und rechts aus den Röhren
    ...LANES2.map((u, k) => ({ kind: 'ameisensoldat_horn', id: `r2_strom${k + 1}`, antpath: [[(k % 2 ? 1 : -1) * 6.6, Y, zu(1, u)], [(k % 2 ? -1 : 1) * 6.6, Y, zu(1, u)]], speed: 2.6, spawner: { every: 3.4, max: 3, first: 0.4 + k * 0.85 } })),
    // 4 Walzenwerfer auf den Theken, werfen quer über den Weg
    ...LANES4.map((u, k) => ({ kind: 'walzenwerfer', id: `r4_werfer${k + 1}`, roomId: 'r4', pos: P(3, (k % 2 ? 1 : -1) * 5.8, u, Y + 1), dir: [k % 2 ? -1 : 1, 0], aim: 'dir', interval: 1.4, first: 0.3 + k * 0.55, speed: 4, walze: 0.8, max: 2, life: 4.5 })),
    // 6 acht Stampfsteine über dem Maschinengang
    ...STONES6.map((u, k) => ({ kind: 'stampfstein', id: `r6_stein${k + 1}`, roomId: 'r6', pos: P(5, 0, u, Y + 2.75), fall: 2.75, wait: 0.9 })),
    // 8 Pilzlingsparade: vier Reihen marschieren heran, Mini-Pilzlinge flitzen
    ...[[12, [-4.5, -1.5, 1.5, 4.5]], [18, [-3, 0, 3]], [24, [-4.5, -1.5, 1.5, 4.5]], [30, [-3, 0, 3]]].flatMap(([u, xs], r) => xs.map((x, k) => ({
      kind: 'pilzling', id: `r8_p${r + 1}${k + 1}`, roomId: 'r8', pos: P(7, x, u), dir: [0, 1], speed: 1.1, wake: 30 }))),
    ...[[-5, 21], [5, 21], [-2.2, 33], [2.2, 33]].map(([x, u], k) => ({ kind: 'pilzling', mini: true, id: `r8_mini${k + 1}`, roomId: 'r8', pos: P(7, x, u), behavior: 'chase', sight: 7, chaseSpeed: 3.2, wake: 31 })),
    // 9 Kanonen auf den Simsen: Suchköpfe von der Seite
    ...CAN9.map((u, k) => ({ kind: 'kanone_turm', id: `r9_kanone${k + 1}`, roomId: 'r9', pos: P(8, (k % 2 ? 1 : -1) * 5.9, u, Y + 1.2), dir: [k % 2 ? -1 : 1, 0], height: 1.6, shot: 'suchkopf',
      interval: 2.6, first: 0.4 + k * 0.6, range: 24, max: 1, speed: 6, seek: 1.8, turn: 1.6 })),
    // 10 Walzenwerfer am Ende des Dachbodens: Walzen rollen über die Bröckelblöcke heran
    { kind: 'walzenwerfer', id: 'r10_werfer', roomId: 'r10', pos: P(9, 0, 37, Y), pillar: 1.4, dir: [0, 1], aim: 'dir', interval: 1.1, first: 0.5, speed: 3.8, walze: 0.8, max: 3, life: 9 },
  ],
  blocks: [
    // 5 Münzblock über dem Steg
    { kind: 'coinblock', pos: P(4, 0, 10, Y + 2.7), count: 8 },
  ],
  items: [
    // kleine Münz-Belohnungen am Wegrand (kein Ziel, nur Würze)
    { kind: 'coins', from: P(0, 0, 32, R1B + 0.7), to: P(0, 0, 34.5, R1B + 0.7), n: 3 },
    { kind: 'coins', from: P(5, -2.4, 34, Y + 0.6), to: P(5, 2.4, 34, Y + 0.6), n: 3 },
  ],
  marks: Object.fromEntries([
    ...RAEUME.map((r, i) => [`r${i + 1}`, start(i).pos]),
    ...RAEUME.map((r, i) => [`r${i + 1}_ende`, P(i, 0, r.len - 6, r.star[1] - 1.2)]),
    ['r1_klippe', P(0, 0, 17, R1A)], ['r5_steg', P(4, 0, 12)], ['r6_gang', P(5, 0, 16)], ['r7_schaukel', P(6, 0, 4)], ['r9_steg', P(8, 0, 18)], ['r10_bloecke', P(9, 0, 12)],
  ]),
  // Daten für Tests/Bots
  _haus: { Z0: RAEUME.map((r, i) => Z0(i)), len: RAEUME.map((r) => r.len), LANES2, ROPES3, LANES4, STONES6, SWING7, CAN9, R1A, R1B, Y },
};
