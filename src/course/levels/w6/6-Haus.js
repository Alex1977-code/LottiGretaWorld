// 6-Haus „Haus Volltreffer“ – Prüfungs-Haus der Welt 6 (Archetyp house, Bauplan 6-Haus: 5 Räume à 10 s, alles mit
// Wurfbällen, je ein Stern). In jedem Raum liegen Wurfbälle bereit (Aktion: aufheben, Aktion: werfen – flach in
// Blickrichtung). Wo die Figur nicht hindarf, flimmert ein **Kraftfeld** („NUR BÄLLE!“): Figuren prallen ab, Bälle fliegen
// hindurch. Über jedem Ausgang hängt die große Raumuhr (roter Zeiger = Restzeit), dazu eigene Tapeten je Raum.
//   1 Kullerbahn     Balkon oben, Holzrinne den Hang hinab zum Mäusehaus; nur der Ball passt durchs Mauseloch und
//                    rollt drinnen auf den Stern (links und rechts der Rinne ein Bällebad, Treppen zurück zum Balkon)
//   2 Bühne frei     Theater: der Stern steht auf einer roten Hebebühne im Orchestergraben hinter dem Kraftfeld –
//                    nur wenn die Bühne oben ist, trifft der Ball
//   3 Sprungfeld     hinter dem Kraftfeld ein Turm mit Druckschalter (Fangwand dahinter); vom Sprungfeld aus oben
//                    werfen → der Stern erscheint über dem Sprungfeld (blaue Münzen als Zugabe)
//   4 Pilzling-Gehege sechs Pilzlinge im Gehege, mittendrin ein POW-Block auf einem Sockel – Ball auf den POW-Block,
//                    alle Pilzlinge purzeln (Ziel: alle besiegen, der Stern fliegt herbei)
//   5 Schießbude     von der Wurfbühne aus fünf Schalterscheiben treffen → der Stern erscheint auf der Bühne
// Zeit abgelaufen → Haus verlassen mit den bisherigen Sternen (fail 'exit'); Tod → Raum von vorn. Thema house, Musik
// course_house. Räume bei x 0, z 0 / −64 / … / −256 (je Raum eigene Abschnitte und eigene Kamera).
// Level-Haken (LEVEL.setup, _helpers_c.js): Raumhüllen (Welt-4-hausRaum mit eigenen Tapeten), Kraftfelder, Mäusehaus,
// Bällebad, Theater, Turm, Gehege, Schießbude; Stern auf der Hebebühne, versteckte Sterne in Raum 3 und 5.

import {
  isl, blk, cyl, sph, cone, bakeParts, glowPoints, hausRaum, hausFertig, raumHaken, wimpel, levelSetup, cullStatic, farHide,
  heroShadowDiet, kraftfeld, kullerRinne, tapete, ballKorbParts, baellebad, maeusehaus, theater, lichtkegel, markise, sternFolgt,
  sternVersteckt,
} from './_helpers_c.js';

const Y = 1;          // Fußboden
const W = 14;         // Raumbreite (x −7 … 7)
const SP = 64;        // Abstand der Räume (z)
const Z0 = (i) => -SP * i;                  // Raumanfang (Startseite)
const zu = (i, u) => Z0(i) - u;             // u m in den Raum hinein
const P = (i, x, u, y = Y) => [x, y, zu(i, u)];
const floor = (i, x0, x1, u0, u1, top, h = 1.2, color = 0x8a5a3a) => isl(x0, x1, zu(i, u0), zu(i, u1), top, h, { top: 'none', under: 0, color });

// ---------------------------------------------------------------- Raum 1 Kullerbahn
const R1 = { balkon: Y + 4, rinneTop: Y + 4, rinneEnd: Y - 1.4, bad: Y - 2.6, u0: 6, u1: 18, hx: 1.2, stube: Y - 2.75, glas: Y + 10, front: Y + 0.2, len: 26, bogen: 11, luke: 1.35 };
R1.uE = R1.u1 - 1.6;        // Ende des Hangs: dann flacher Einlauf unter dem Mäusetunnel bis zur Fassade
R1.loch = 0.56;             // Mauseloch-Höhe (der Ball Ø 0,45 passt, die geduckte Figur 0,6 nicht)
const rinneY = (u) => (u >= R1.uE ? R1.rinneEnd : R1.rinneTop + (R1.rinneEnd - R1.rinneTop) * ((u - R1.u0) / (R1.uE - R1.u0)));
// ---------------------------------------------------------------- Raum 2 Bühne frei
const R2 = { feld: 8.4, graben: [9, 17.5], lift: 13, liftLo: Y - 4.5, liftHi: Y - 1.75, buehne: Y + 0.6 };
// ---------------------------------------------------------------- Raum 3 Sprungfeld
const R3 = { ball: [-1.6, 3.6], sprung: 6.5, feld: 8.6, turm: 13.5, top: Y + 5.05 };
// ---------------------------------------------------------------- Raum 4 Gehege
const R4 = { feld: 7.2, grube: Y - 1.6, gx: 5, gu: [7.4, 17], pow: 11.15, sockel: Y - 0.5 };
const PILZE4 = [[-3.4, 8.8], [3.6, 9.4], [-2.4, 13.6], [2.8, 14.6], [-4, 16.2], [4.1, 12.4]];
// ---------------------------------------------------------------- Raum 5 Schießbude
const R5 = { buehne: Y + 0.5, kante: 5.5, baelle: 4.4 };
const ZIELE5 = [[-4.6, 9.0], [-2.0, 10.8], [0.4, 10.0], [2.6, 10.6], [4.8, 8.6]];
const BAELLE5 = [-2, -1, 0, 1, 2];

/** Raumdaten (hausRaum aus den Welt-4-Hilfen; Tapete eigene): len, h, pit, Böden (Muster), Bilder, Uhren, Möbel. */
const RAEUME = [
  { id: 'r1', name: 'Kullerbahn', title: 'Kullerbahn: Roll den Ball den Hang hinab!', len: R1.len, h: 10, pit: true, paper: 'kugeln', wood: 0x3a6ad0,
    star: [R1.u1 + 5.2, R1.stube + 0.08],
    floors: [{ u0: -1, u1: 6, y: R1.balkon, style: 'puzzle' }],
    pictures: [{ wall: 'l', u: 2.5, y: R1.balkon - Y + 1.4, motif: 'lotti' }, { wall: 'r', u: 2.5, y: R1.balkon - Y + 1.4, motif: 'greta' },
      { wall: 'l', u: 14, y: 3.2, motif: 'trampolin' }, { wall: 'r', u: 14, y: 3.2, motif: 'pflaume' }],
    clocks: [{ wall: 'l', u: 8, y: R1.balkon - Y + 3.0, r: 0.42 }, { wall: 'r', u: 16, y: 4.2, r: 0.42, speed: 1.5 }],
    props: [{ kind: 'teddy', x: -5.4, u: 1.2, y: R1.balkon, yaw: 0.6 }, { kind: 'pflanze', x: 6.1, u: 0.6, y: R1.balkon },
      { kind: 'kiste', x: 5.2, u: 4.6, y: R1.balkon, size: 0.9, color: 0x5ab8ff }, { kind: 'ball', x: -5.6, u: 4.4, y: R1.balkon, color: 0xffd23d, r: 0.28 }] },
  { id: 'r2', name: 'Bühne frei', title: 'Bühne frei: Wirf, wenn die rote Bühne oben ist!', len: 24, h: 8, pit: true, paper: 'theater', wood: 0x4a1a12,
    star: [R2.lift, R2.liftHi + 0.5 + 0.06],
    floors: [{ u0: -1, u1: R2.graben[0], style: 'parkett' }, { u0: R2.graben[1], u1: 24, y: R2.buehne, style: 'holz' }],
    pictures: [{ wall: 'l', u: 3, y: 2.3, motif: 'stern' }, { wall: 'r', u: 3, y: 2.3, motif: 'kruemel' }],
    clocks: [{ wall: 'l', u: 6.5, y: 3.6, r: 0.42 }],
    props: [{ kind: 'pflanze', x: -6.1, u: 0.8, size: 1.1 }, { kind: 'pflanze', x: 6.1, u: 0.8, size: 1.1 }, { kind: 'trommel', x: 5.4, u: 20.5, y: R2.buehne },
      { kind: 'pferd', x: -5, u: 21, y: R2.buehne, yaw: 0.5 }] },
  { id: 'r3', name: 'Sprungfeld', title: 'Sprungfeld: Wirf von oben auf den Druckschalter!', len: 22, h: 12, paper: 'sterne', wood: 0x1e2a6a,
    star: [R3.sprung, Y + 4.6],
    floors: [{ u0: -1, u1: 22, style: 'teppich' }],
    pictures: [{ wall: 'l', u: 3, y: 2.3, motif: 'trampolin' }, { wall: 'r', u: 3, y: 2.3, motif: 'berg' }, { wall: 'l', u: 12, y: 6.2, motif: 'stern' }, { wall: 'r', u: 12, y: 6.2, motif: 'zielfahne' }],
    clocks: [{ wall: 'r', u: 7, y: 4.2, r: 0.45, speed: 2 }],
    props: [{ kind: 'eimer', x: 5.6, u: 1.4, color: 0xff5a5a }, { kind: 'ball', x: 5.0, u: 3.0, color: 0x5ab8ff, r: 0.3 }, { kind: 'pflanze', x: -6.1, u: 0.8 },
      { kind: 'kiste', x: 5.4, u: 19, size: 1.1, color: 0xffd23d }, { kind: 'kiste', x: -5.6, u: 18.4, size: 0.9, color: 0xff7a7a }] },
  { id: 'r4', name: 'Pilzling-Gehege', title: 'Gehege: Triff den POW-Block!', len: 24, h: 7, pit: true, paper: 'zoo', wood: 0x5a7a2a,
    star: [R4.pow, Y + 2.4],
    floors: [{ u0: -1, u1: R4.gu[0], style: 'stein' }, { u0: R4.gu[0], u1: R4.gu[1], x0: -R4.gx, x1: R4.gx, y: R4.grube, style: 'sand' }],
    pictures: [{ wall: 'l', u: 3, y: 2.3, motif: 'pilz' }, { wall: 'r', u: 3, y: 2.3, motif: 'see' }],
    clocks: [{ wall: 'l', u: 6, y: 3.4, r: 0.4 }],
    props: [{ kind: 'eimer', x: -5.6, u: 1.6, color: 0x5ac85a }, { kind: 'pflanze', x: 6.1, u: 1.2, size: 1.2 },
      { kind: 'riesenpilz', x: -6.1, u: 21.5, size: 1.1 }, { kind: 'riesenpilz', x: 6.0, u: 20.5, color: 0x4a8aff }, { kind: 'riesenpilz', x: 4.0, u: 22.5, size: 0.7, color: 0xffb02a }] },
  { id: 'r5', name: 'Schießbude', title: 'Schießbude: Triff alle fünf Schalterscheiben!', len: 22, h: 7, paper: 'kirmes', wood: 0xd8283a,
    star: [2.0, R5.buehne + 0.05],
    floors: [{ u0: -1, u1: R5.kante, x0: -4.5, x1: 4.5, y: R5.buehne, style: 'holz' }, { u0: R5.kante, u1: 22, style: 'kacheln' }],
    pictures: [{ wall: 'l', u: 2, y: 2.3, motif: 'zielfahne' }, { wall: 'r', u: 2, y: 2.3, motif: 'piep' }],
    clocks: [{ wall: 'r', u: 16, y: 3.6, r: 0.42, speed: 1.5 }],
    props: [{ kind: 'teddy', x: -5.8, u: 19.5, yaw: 0.4 }, { kind: 'teddy', x: 5.8, u: 19.5, yaw: -0.4 }, { kind: 'ball', x: -6, u: 1.5, color: 0xff5a7a, r: 0.3 },
      { kind: 'trommel', x: 6.0, u: 1.6 }] },
];

// ====================================================================== Level-Haken

function setup(level) {
  const shared = { pos: [], uv: [] }, clocks = [];
  RAEUME.forEach((r, i) => {
    const room = { ...r, index: i, z0: Z0(i), paper: 'eigene' };
    hausRaum(level, room, shared, clocks);
    tapete(level, { id: r.id, z0: Z0(i), len: r.len, h: r.h }, r.paper);
  });
  const uhren = hausFertig(level, shared, clocks);
  if (uhren) level.named.set('haus_uhren', uhren);
  const deco = [];

  // ------------------------------------------------ Raum 1: Kullerbahn, Bällebad, Mäusehaus
  maeusehaus(level, { z: zu(0, R1.u1), zBack: zu(0, R1.len), yBot: R1.bad, yTop: R1.front, yGlass: R1.glas, hx0: -R1.hx, hx1: R1.hx, hy0: R1.rinneEnd, hy1: R1.rinneEnd + R1.loch, inner: R1.hx, yIn: R1.stube });
  baellebad(level, -7, -1.45, zu(0, R1.u0 + 0.3), zu(0, R1.u1 - 0.1), R1.bad + 0.55, { seed: 3 });
  baellebad(level, 1.45, 7, zu(0, R1.u0 + 0.3), zu(0, R1.u1 - 0.1), R1.bad + 0.55, { seed: 5 });
  // Rinne: Holzplanken quer, Rand-Leisten bunt
  for (let u = R1.u0; u < R1.u1 - 0.01; u += 0.8) deco.push(blk(2.36, 0.03, 0.06, 0, rinneY(u + 0.4) + 0.005, zu(0, u + 0.4), 0x8a5a2e));
  for (const sx of [-1, 1]) for (let u = R1.u0; u < R1.uE - 0.5; u += 2) deco.push(sph(0.1, sx * 1.33, rinneY(u + 1) + 0.49, zu(0, u + 1), [0xff5a5a, 0xffd23d, 0x5ab8ff, 0x5ac85a][Math.round(u / 2) % 4]));
  // Mäusetunnel über dem Einlauf (Decke 0,56 m über der Rinne): hüpfende Bälle stoßen an die Decke und rollen hinein
  {
    const za = zu(0, R1.uE + 0.45), zb2 = zu(0, R1.u1), yc = R1.rinneEnd + R1.loch;
    level.world.add({ type: 'box', min: [-R1.hx - 0.25, yc, zb2], max: [R1.hx + 0.25, yc + 0.4, za], camIgnore: true, tag: 'maeusetunnel' });
    for (const sx of [-1, 1]) level.world.add({ type: 'box', min: [sx > 0 ? R1.hx : -R1.hx - 0.25, R1.rinneEnd, zb2], max: [sx > 0 ? R1.hx + 0.25 : -R1.hx, yc, za], camIgnore: true, tag: 'maeusetunnel' });
    deco.push(blk(2 * R1.hx + 0.5, 0.4, za - zb2, 0, yc, (za + zb2) / 2, 0xc8904a, { top: 0xe8b06a }));
    for (const sx of [-1, 1]) deco.push(blk(0.25, R1.loch, za - zb2, sx * (R1.hx + 0.125), R1.rinneEnd, (za + zb2) / 2, 0xa8743a));
    for (let k = 0; k < 3; k++) deco.push(blk(2 * R1.hx + 0.6, 0.08, 0.14, 0, yc + 0.4, za - 0.2 - k * 0.6, [0xff6a6a, 0xffd23d, 0x5ab8ff][k]));
    deco.push(sph(0.18, -0.55, yc + 0.5, za - 0.3, 0xb8b0c0), sph(0.12, -0.7, yc + 0.66, za - 0.32, 0xd8b0c8), sph(0.12, -0.4, yc + 0.66, za - 0.32, 0xd8b0c8), sph(0.04, -0.55, yc + 0.47, za - 0.14, 0xff7a9a));
  }
  // Balkon-Geländer links/rechts der Rinne (niedrig, bunt)
  for (const sx of [-1, 1]) {
    deco.push(blk(5.4, 0.12, 0.12, sx * 4.25, R1.balkon + 0.9, zu(0, 5.9), 0xffd23d));
    for (let x = 1.8; x < 7; x += 1.1) deco.push(cyl(0.05, 0.05, 0.9, sx * x, R1.balkon, zu(0, 5.9), 0xffffff, 6));
  }
  level.world.add({ type: 'box', min: [-7, R1.balkon, zu(0, 6.0)], max: [-4.6, R1.balkon + 1.0, zu(0, 5.8)], camIgnore: true, tag: 'gelaender' });
  level.world.add({ type: 'box', min: [4.6, R1.balkon, zu(0, 6.0)], max: [7, R1.balkon + 1.0, zu(0, 5.8)], camIgnore: true, tag: 'gelaender' });
  bakeParts(level, ballKorbParts(1.9, R1.balkon, zu(0, 4.6), { balls: [[0.1, 0.05, 0xff6a6a], [-0.15, -0.1, 0x5ab8ff]] }), { castShadow: false });
  // Klappwand über der Rinne: hoch fliegende Bälle prallen ab und fallen in die Rinne, darunter rollen sie hindurch
  {
    const zb = zu(0, R1.bogen), yb = rinneY(R1.bogen) + R1.luke;
    level.world.add({ type: 'box', min: [-R1.hx - 0.3, yb, zb - 0.12], max: [R1.hx + 0.3, Y + 7, zb + 0.12], camIgnore: true, tag: 'klappwand' });
    for (const sx of [-1, 1]) deco.push(blk(0.3, Y + 7.2 - R1.bad, 0.3, sx * (R1.hx + 0.45), R1.bad, zb, 0x8a5a2e, { top: 0xffd23d }));
    deco.push(blk(2 * R1.hx + 1.2, 0.36, 0.36, 0, Y + 7.0, zb, 0x8a5a2e, { top: 0xffd23d }));
    deco.push(blk(2 * R1.hx + 0.5, Y + 7 - yb, 0.1, 0, yb, zb, 0x5ab8ff, { top: 0xffffff }));
    for (let k = 0; k < 4; k++) deco.push(blk(2 * R1.hx + 0.52, 0.16, 0.12, 0, yb + 0.25 + k * ((Y + 6.6 - yb) / 4), zb, [0xffd23d, 0xff6a6a, 0x5ac85a, 0xffffff][k]));
    deco.push(sph(0.22, 0, yb + 0.12, zb + 0.08, 0xffffff), sph(0.06, -0.08, yb + 0.16, zb + 0.28, 0x2a2a34), sph(0.06, 0.08, yb + 0.16, zb + 0.28, 0x2a2a34));
  }
  // Rinne bis in die Mäusestube: Bälle rollen hangab und zur Mitte (Mauseloch)
  const rinneTop = (z) => {
    const u = Z0(0) - z;
    if (u <= R1.u1 + 0.5) return rinneY(u);
    return Math.max(R1.stube, R1.rinneEnd - 0.45 * (u - R1.u1 - 0.5));
  };
  level.named.set('r1_rinne', kullerRinne(level, { x0: -R1.hx, x1: R1.hx, z0: zu(0, R1.u0), z1: zu(0, R1.u1 + 3.5), top: rinneTop, vmax: 5, accel: 9 }));

  // ------------------------------------------------ Raum 2: Theater (Vorhänge, Scheinwerfer, Orchestergraben)
  kraftfeld(level, { x0: -7, x1: 7, z: zu(1, R2.feld), y0: Y, y1: Y + 8 });
  theater(level, { z: zu(1, R2.graben[1] + 0.1), y: R2.buehne, ox0: -4.2, ox1: 4.2, yTop: Y + 7.6 });
  lichtkegel(level, [[-5.5, Y + 7.5, zu(1, 15), 0, R2.liftHi, zu(1, R2.lift), 0xfff2b0], [5.5, Y + 7.5, zu(1, 15), 0, R2.liftHi, zu(1, R2.lift), 0xffc8f0]], { r: 0.9, k: 0.16 });
  for (const [x, u] of [[-4.6, 10.5], [-2.4, 15.5], [3.2, 10.2], [4.8, 15.8]]) {        // Notenständer im Graben
    deco.push(cyl(0.03, 0.03, 1.1, x, Y - 5, zu(1, u), 0x2a2a34, 5), blk(0.6, 0.45, 0.04, x, Y - 3.9, zu(1, u) + 0.05, 0x2a2a34), blk(0.5, 0.36, 0.02, x, Y - 3.86, zu(1, u) + 0.08, 0xfff6e0));
  }
  for (let k = 0; k < 7; k++) deco.push(sph(0.13, -6 + k * 2, Y + 0.05, zu(1, R2.graben[0] - 0.25), 0xffe680));       // Rampenlichter
  bakeParts(level, ballKorbParts(-2.2, Y, zu(1, 4.6), { balls: [[0.1, 0.1, 0xffd23d]] }), { castShadow: false });
  glowPoints(level, Array.from({ length: 7 }, (_, k) => [-6 + k * 2, Y + 0.18, zu(1, R2.graben[0] - 0.25)]), 0xffe28a, 0.7);
  sternFolgt(level, 1, 'r2_buehne');

  // ------------------------------------------------ Raum 3: Sprungturm mit Fangwand, Druckschalter, Stern erst danach
  kraftfeld(level, { x0: -7, x1: 7, z: zu(2, R3.feld), y0: Y, y1: Y + 12, labelY: 3.2 });
  const t3 = zu(2, R3.turm);
  for (let k = 0; k < 7; k++) deco.push(blk(2.44, (R3.top - Y) / 7, 2.44, 0, Y + k * (R3.top - Y) / 7, t3, k % 2 ? 0xffffff : 0xe8323a));
  deco.push(blk(2.7, 0.14, 2.7, 0, R3.top - 0.14, t3, 0x2a3a7a));
  deco.push(blk(2.9, 3.4, 0.24, 0, R3.top - 0.1, t3 - 1.45, 0x2a3a7a, { top: 0xffd23d }));                    // Fangwand
  for (const r of [1.1, 0.75, 0.4]) { const g = cyl(r, r, 0.04, 0, 0, 0, r > 1 ? 0xffffff : r > 0.6 ? 0xe8323a : 0xffd23d, 20, { rx: Math.PI / 2, center: true }); g.translate(0, R3.top + 1.6, t3 - 1.31); deco.push(g); }
  for (const sx of [-1, 1]) deco.push(blk(0.16, 0.3, 2.44, sx * 1.14, R3.top, t3, 0xffd23d));
  level.world.add({ type: 'box', min: [-1.45, R3.top, t3 - 1.57], max: [1.45, R3.top + 3.3, t3 - 1.33], camIgnore: true, tag: 'fangwand' });
  for (const sx of [-1, 1]) level.world.add({ type: 'box', min: [sx > 0 ? 1.06 : -1.22, R3.top, t3 - 1.22], max: [sx > 0 ? 1.22 : -1.06, R3.top + 0.3, t3 + 1.22], camIgnore: true, tag: 'turmrand' });
  bakeParts(level, ballKorbParts(R3.ball[0] - 0.9, Y, zu(2, R3.ball[1] - 0.3), { balls: [[0.05, 0.1, 0xffd23d], [-0.1, -0.12, 0xff6a6a]] }), { castShadow: false });
  wimpel(level, [{ z: zu(2, 10.5), y: Y + 10.2, sag: 0.7, colors: [0xffd23d, 0x5ab8ff, 0xffffff] }, { z: zu(2, 17), y: Y + 10.4, sag: 0.8 }]);
  const stern3 = sternVersteckt(level, 2);
  const schalter = level.named.get('r3_schalter');

  // ------------------------------------------------ Raum 4: Gehege (Zaun, Heu, Futtertrog)
  kraftfeld(level, { x0: -7, x1: 7, z: zu(3, R4.feld), y0: Y, y1: Y + 7 });
  const g0 = zu(3, R4.gu[0]), g1 = zu(3, R4.gu[1]);
  for (const sx of [-1, 1]) for (let u = R4.gu[0] + 0.3; u < R4.gu[1]; u += 1.3) deco.push(cyl(0.08, 0.1, 0.9, sx * (R4.gx + 0.25), Y, zu(3, u), 0x8a5a2e, 6));
  for (const sx of [-1, 1]) for (const yy of [0.35, 0.75]) deco.push(blk(0.08, 0.1, R4.gu[1] - R4.gu[0], sx * (R4.gx + 0.25), Y + yy, (g0 + g1) / 2, 0xa8743a));
  for (let x = -R4.gx; x <= R4.gx + 0.01; x += 1.25) deco.push(cyl(0.08, 0.1, 0.9, x, Y, g1 - 0.25, 0x8a5a2e, 6));
  for (const yy of [0.35, 0.75]) deco.push(blk(R4.gx * 2, 0.1, 0.08, 0, Y + yy, g1 - 0.25, 0xa8743a));
  for (const [x, u, s] of [[-6.1, 18.6, 1], [6.0, 18.2, 0.9], [-5.9, 9.4, 0.8]]) deco.push(blk(1.1 * s, 0.7 * s, 0.8 * s, x, Y, zu(3, u), 0xe8c858, { top: 0xf4dc7a }), blk(1.12 * s, 0.06, 0.82 * s, x, Y + 0.35 * s, zu(3, u), 0xc8a03a));
  deco.push(blk(1.8, 0.4, 0.6, 3.2, R4.grube, zu(3, 16.3), 0x8a5a2e, { top: 0x6a9a3a }));       // Futtertrog mit Gras
  deco.push(cyl(0.5, 0.5, 0.06, 0, R4.sockel - 0.02, zu(3, R4.pow), 0xffd23d, 16));
  bakeParts(level, ballKorbParts(-2.0, Y, zu(3, 4.6), { balls: [[0.1, 0.1, 0x5ab8ff]] }), { castShadow: false });

  // ------------------------------------------------ Raum 5: Schießbude (Wurfbühne, Markise, Preisregal, Glühbirnen)
  for (const sx of [-1, 1]) deco.push(blk(0.3, 4.2, 0.3, sx * 4.4, Y, zu(4, R5.kante - 0.2), 0xe8323a, { top: 0xffd23d }));
  deco.push(blk(5.6, 0.06, 0.7, 0, R5.buehne, zu(4, R5.baelle), 0x8a5a2e), blk(5.6, 0.12, 0.06, 0, R5.buehne, zu(4, R5.baelle + 0.33), 0xffd23d), blk(5.6, 0.12, 0.06, 0, R5.buehne, zu(4, R5.baelle - 0.33), 0xffd23d));
  markise(level, -4.6, 4.6, zu(4, R5.kante - 0.2), Y + 4.2, 1.0);
  deco.push(blk(9, 0.5, 0.12, 0, Y, zu(4, R5.kante) + 0.06, 0xffffff));
  for (let k = 0; k < 9; k++) deco.push(blk(0.5, 0.5, 0.13, -4 + k, Y, zu(4, R5.kante) + 0.07, k % 2 ? 0xe8323a : 0xffffff));
  deco.push(blk(12, 0.2, 0.6, 0, Y + 2.4, zu(4, 21.3), 0x8a5a2e), blk(12, 0.2, 0.6, 0, Y + 3.6, zu(4, 21.3), 0x8a5a2e));       // Preisregal
  for (const [x, yy, c] of [[-5, 2.6, 0xff8ab0], [-3, 2.6, 0x5ab8ff], [-1, 2.6, 0xffd23d], [1, 2.6, 0x5ac85a], [3, 2.6, 0xb87aff], [5, 2.6, 0xff9a3a],
    [-4, 3.8, 0xffffff], [-2, 3.8, 0xff5a5a], [0, 3.8, 0x5ab8ff], [2, 3.8, 0xffd23d], [4, 3.8, 0xff8ab0]]) {
    deco.push(sph(0.26, x, Y + yy + 0.26, zu(4, 21.2), c), sph(0.18, x, Y + yy + 0.66, zu(4, 21.2), c), sph(0.07, x - 0.14, Y + yy + 0.8, zu(4, 21.2), c), sph(0.07, x + 0.14, Y + yy + 0.8, zu(4, 21.2), c));
  }
  const birnen = [];
  for (let k = 0; k < 10; k++) birnen.push([-4.5 + k, Y + 4.25, zu(4, R5.kante - 0.2) + 0.05]);
  for (let k = 0; k < 6; k++) birnen.push([-6.8, Y + 1.5 + k * 0.8, zu(4, 8 + k * 2)], [6.8, Y + 1.5 + k * 0.8, zu(4, 8 + k * 2)]);
  for (const b of birnen) deco.push(sph(0.08, b[0], b[1], b[2], 0xfff2a0));
  glowPoints(level, birnen, 0xffe28a, 0.55);
  wimpel(level, [{ z: zu(4, 12), y: Y + 5.6, sag: 0.8, colors: [0xe8323a, 0xffffff, 0xffd23d] }, { z: zu(4, 18), y: Y + 5.8, sag: 0.7 }]);
  const stern5 = sternVersteckt(level, 4);

  bakeParts(level, deco, { castShadow: false });

  // ------------------------------------------------ Raum-Ereignisse: Stern 3/5 verstecken, Zielscheiben und Schalter frisch
  raumHaken(level, {
    play(i) {
      if (i === 2) {
        stern3.hide();
        if (schalter && schalter.state !== 'idle') schalter.fail();
      }
      if (i === 4) {
        stern5.hide();
        const g = level.targets?.ziele5;
        if (g && !g.done) {
          g.n = 0;
          for (const e of level.entities) if (e.kind === 'zielscheibe' && e.group === 'ziele5') e.done = false;
        }
      }
    },
  });
  // Raum 3: Druckschalter gedrückt → Stern erscheint über dem Sprungfeld (einmal je Versuch)
  let shown3 = false;
  level.onStep(() => {
    const h = level.house;
    if (!h || h.room !== 2) { shown3 = false; return; }
    if (h.phase !== 'play') { if (h.phase === 'fadein') shown3 = false; return; }
    if (!shown3 && schalter && schalter.state === 'active') { shown3 = true; stern3.reveal(P(2, 0, R3.sprung, Y + 4.6)); }
  });
  heroShadowDiet(level, 0.12);
  farHide(level, ['pilzling', 'wurfball', 'zielscheibe', 'star', 'pow', 'pswitch'], 48);
}

// ====================================================================== Level-Daten

const area = (i) => ({ min: [-W / 2 - 0.5, Y - 9, zu(i, RAEUME[i].len) - 0.5], max: [W / 2 + 0.5, Y + 14, Z0(i) + 1.5] });
const cam = (i, o = {}) => ({ pitch: o.pitch ?? 44, dist: o.dist ?? 13.5, yaw: 0, fov: o.fov ?? 44, x: 0, xLock: o.xLock ?? 0.6, ahead: o.ahead ?? 3.4, height: o.height ?? 1.0,
  ...(o.center ? { center: o.center, pull: o.pull ?? 0.45 } : {}) });
const start = (i, u = 2.4, y = Y) => ({ pos: P(i, 0, u, y), yaw: Math.PI / 2 });
const STARTS = [start(0, 2.4, R1.balkon), start(1), start(2, 1.8), start(3), start(4, 2.6, R5.buehne)];
const CAMS = [
  cam(0, { pitch: 44, dist: 15, ahead: 2.0, center: P(0, 0, 12, Y + 2), pull: 0.3 }),
  cam(1, { pitch: 44, dist: 14, ahead: 2.0, center: P(1, 0, 8, Y), pull: 0.3 }),
  cam(2, { pitch: 34, dist: 16, ahead: 1.5, center: P(2, 0, 8, Y + 3), pull: 0.35, height: 2.2 }),
  cam(3, { pitch: 48, dist: 14, ahead: 2.0, center: P(3, 0, 8, Y), pull: 0.3 }),
  cam(4, { pitch: 46, dist: 13, ahead: 2.0, center: P(4, 0, 6.5, Y), pull: 0.3 }),
];

export const LEVEL = {
  id: '6-Haus',
  world: 6,
  title: 'Haus Volltreffer',
  archetype: 'house',
  theme: 'house',
  music: 'course_house',
  timeLimit: 300,
  killY: Y - 4,
  setup: (level, scene) => { levelSetup(setup)(level, scene); cullStatic(level); },
  start: STARTS[0],
  house: {
    fail: 'exit',
    time: 10,
    rooms: RAEUME.map((r, i) => ({ id: r.id, goal: i === 3 ? 'defeatAll' : 'reach', area: area(i), start: STARTS[i], camera: CAMS[i], star: P(i, 0, r.star[0], r.star[1]), time: 10, title: r.title })),
  },
  segments: [
    // ---------------- 1 Kullerbahn: Balkon, Rinne mit Leisten, Bällebad links/rechts, Treppen, Stube im Mäusehaus
    floor(0, -7, 7, -1, R1.u0, R1.balkon, 6, 0x7a5aa8),
    { type: 'ramp', pos: [0, R1.bad, zu(0, (R1.u0 + R1.uE) / 2)], size: [2 * R1.hx, R1.rinneTop - R1.bad, R1.uE - R1.u0], axis: 'z', dir: 1, low: R1.rinneEnd - R1.bad, top: 'stone' },
    ...[-1, 1].map((sx) => ({ type: 'ramp', pos: [sx * (R1.hx + 0.125), R1.bad, zu(0, (R1.u0 + R1.uE) / 2)], size: [0.25, R1.rinneTop - R1.bad + 0.45, R1.uE - R1.u0], axis: 'z', dir: 1, low: R1.rinneEnd - R1.bad + 0.45 })),
    floor(0, -R1.hx, R1.hx, R1.uE, R1.u1, R1.rinneEnd, R1.rinneEnd - R1.bad, 0x8a5a2e),
    floor(0, -7, -R1.hx - 0.25, R1.u0, R1.u1, R1.bad, 1.5, 0x4a6ab8),
    floor(0, R1.hx + 0.25, 7, R1.u0, R1.u1, R1.bad, 1.5, 0x4a6ab8),
    { type: 'stairs', pos: [-5.7, R1.bad, zu(0, R1.u0 + 6)], dir: '+z', steps: 6, rise: 1.1, run: 1, width: 2.4, style: 0xffd23d },
    { type: 'stairs', pos: [5.7, R1.bad, zu(0, R1.u0 + 6)], dir: '+z', steps: 6, rise: 1.1, run: 1, width: 2.4, style: 0x5ab8ff },
    { type: 'ramp', pos: [0, R1.stube - 0.4, zu(0, R1.u1 + 2)], size: [2 * R1.hx, R1.rinneEnd - R1.stube + 0.4, 3], axis: 'z', dir: 1, low: 0.4, top: 'stone' },
    floor(0, -R1.hx, R1.hx, R1.u1 + 3.5, R1.len, R1.stube, 0.4, 0x9a6a3a),
    { type: 'sign', pos: [-3.6, R1.balkon, zu(0, 5.2)], text: 'Mauseloch:\nnur für Bälle!', size: [2.4, 0.9], post: 0.9 },

    // ---------------- 2 Bühne frei: Parkett, Orchestergraben mit Hebebühne, Bühne hinten
    floor(1, -7, 7, -1, R2.graben[0], Y, 1.2, 0x6a361a),
    floor(1, -7, 7, R2.graben[0], R2.graben[1], Y - 5, 1, 0x2a1a2a),
    floor(1, -7, 7, R2.graben[1], 24, R2.buehne, 6.6, 0x6a3a1a),
    { type: 'mover', id: 'r2_buehne', path: [P(1, 0, R2.lift, R2.liftLo), P(1, 0, R2.lift, R2.liftHi)], size: [2.6, 0.5, 2.6], speed: 2.75, wait: 1.6, mode: 'pingpong', color: 0xe8323a },
    { type: 'sign', pos: [3.8, Y, zu(1, 5.4)], text: 'Nur Bälle\ndürfen durch!', size: [2.4, 0.9], post: 0.9 },

    // ---------------- 3 Sprungfeld: Boden, Sprungfeld, Turm mit Druckschalter
    floor(2, -7, 7, -1, 22, Y, 1.2, 0x2a3a7a),
    { type: 'trampoline', pos: P(2, 0, R3.sprung), strength: 17, size: 1.8 },
    isl(-1.22, 1.22, zu(2, R3.turm - 1.22), zu(2, R3.turm + 1.22), R3.top, R3.top - Y, { top: 'none', under: 0, color: 0xe8323a }),

    // ---------------- 4 Gehege: Vorplatz, Grube, Ränder, Sockel für den POW-Block
    floor(3, -7, 7, -1, R4.gu[0], Y, 1.2, 0x7a7488),
    floor(3, -R4.gx, R4.gx, R4.gu[0], R4.gu[1], R4.grube, 1, 0x8a6a3a),
    floor(3, -7, -R4.gx, R4.gu[0], 24, Y, 2.8, 0x5a8a3a),
    floor(3, R4.gx, 7, R4.gu[0], 24, Y, 2.8, 0x5a8a3a),
    floor(3, -R4.gx, R4.gx, R4.gu[1], 24, Y, 2.8, 0x5a8a3a),
    isl(-0.55, 0.55, zu(3, R4.pow - 0.55), zu(3, R4.pow + 0.55), R4.sockel, R4.sockel - R4.grube, { top: 'none', under: 0, color: 0xffd23d }),

    // ---------------- 5 Schießbude: Wurfbühne, Boden
    floor(4, -7, 7, -1, 22, Y, 1.2, 0x8a3a3a),
    isl(-4.5, 4.5, zu(4, -1), zu(4, R5.kante), R5.buehne, R5.buehne - Y, { top: 'none', under: 0, color: 0xe8323a }),
    { type: 'stairs', pos: [-5.75, Y, zu(4, 2.2)], dir: '+x', steps: 2, rise: 0.25, run: 0.6, width: 2, style: 0xffd23d },
    { type: 'stairs', pos: [5.75, Y, zu(4, 2.2)], dir: '-x', steps: 2, rise: 0.25, run: 0.6, width: 2, style: 0xffd23d },
    // Raum 5: fünf Schalterscheiben (alle getroffen → Stern auf der Wurfbühne)
    { type: 'zielscheibe', group: 'ziele5', size: 1.25, stand: 0.35, onAll: { star: { index: 4, pos: P(4, 0, 2.0, R5.buehne + 0.05) } },
      targets: ZIELE5.map(([x, u], k) => ({ id: `r5_ziel${k + 1}`, pos: P(4, x, u, Y + 0.97), yaw: Math.atan2(-((zu(4, 4.3)) - zu(4, u)), 0 - x) })) },
  ],
  blocks: [],
  items: [
    // Wurfbälle (roomId: nach einem Neustart des Raums wieder an ihrem Platz)
    { kind: 'wurfball', id: 'r1_ball', roomId: 'r1', pos: P(0, 0, 4.4, R1.balkon), life: 2, respawn: 1 },
    { kind: 'wurfball', id: 'r1_ball2', roomId: 'r1', pos: P(0, 1.9, 4.6, R1.balkon), life: 2, respawn: 1, color: 'rot' },
    { kind: 'wurfball', id: 'r2_ball', roomId: 'r2', pos: P(1, -2.2, 4.6), life: 1.5, respawn: 0.8 },
    { kind: 'wurfball', id: 'r2_ball2', roomId: 'r2', pos: P(1, -1.0, 4.4), life: 1.5, respawn: 0.8, color: 'gelb' },
    { kind: 'wurfball', id: 'r2_ball3', roomId: 'r2', pos: P(1, 0.2, 4.6), life: 1.5, respawn: 0.8, color: 'rot' },
    { kind: 'wurfball', id: 'r3_ball', roomId: 'r3', pos: P(2, R3.ball[0], R3.ball[1]), life: 1.5, respawn: 0.8 },
    { kind: 'wurfball', id: 'r3_ball2', roomId: 'r3', pos: P(2, R3.ball[0] - 0.9, R3.ball[1] - 0.3), life: 1.5, respawn: 0.8, color: 'gelb' },
    { kind: 'wurfball', id: 'r4_ball', roomId: 'r4', pos: P(3, -2.0, 4.6), life: 1.5, respawn: 0.8 },
    { kind: 'wurfball', id: 'r4_ball2', roomId: 'r4', pos: P(3, -0.6, 4.6), life: 1.5, respawn: 0.8, color: 'rot' },
    ...BAELLE5.map((x, k) => ({ kind: 'wurfball', id: `r5_ball${k + 1}`, roomId: 'r5', pos: P(4, x, R5.baelle, R5.buehne), life: 1.5, respawn: 1, color: ['weiss', 'rot', 'gelb', 'rot', 'weiss'][k] })),
    // Raum 3: Druckschalter auf dem Turm (blaue Münzen als Säule über dem Sprungfeld)
    { kind: 'pswitch', id: 'r3_schalter', pos: P(2, 0, R3.turm, R3.top), time: 8, coins: [P(2, 0, R3.sprung, Y + 2.0), P(2, 0, R3.sprung, Y + 3.0), P(2, 0, R3.sprung, Y + 4.0)], reward: { coins: 3 } },
    // Raum 4: POW-Block auf dem Sockel mitten im Gehege
    { kind: 'pow', id: 'r4_pow', pos: P(3, 0, R4.pow, R4.sockel), radius: 8, height: 3 },
  ],
  enemies: [
    ...PILZE4.map(([x, u], k) => ({ kind: 'pilzling', id: `r4_pilz${k + 1}`, roomId: 'r4', pos: P(3, x, u, R4.grube), dir: [k % 2 ? 1 : -1, 0], speed: 1.2, wake: 40 })),
  ],
  marks: Object.fromEntries([
    ...STARTS.map((s, i) => [`r${i + 1}`, s.pos]),
    ['r1_ball', P(0, 0, 4.4, R1.balkon)], ['r1_rinne', P(0, 0, 12, rinneY(12))], ['r1_stern', P(0, 0, R1.u1 + 5.2, R1.stube)],
    ['r2_wurf', P(1, 0, 7.4)], ['r3_sprung', P(2, 0, R3.sprung)], ['r3_schalter', P(2, 0, R3.turm, R3.top)], ['r4_wurf', P(3, 0, 6.6)], ['r4_pow', P(3, 0, R4.pow, R4.sockel)],
    ['r5_wurf', P(4, 0, R5.kante - 0.9, R5.buehne)],
  ]),
  // Daten für Tests/Bots
  _haus: { Z0: RAEUME.map((r, i) => Z0(i)), Y, R1, R2, R3, R4, R5, ZIELE5, BAELLE5, PILZE4 },
};
