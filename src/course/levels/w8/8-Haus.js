// 8-Haus „Haus Krallenkraxel“ – Prüfungs-Haus der Welt 8 (Archetyp house, Bauplan 8-Haus: 10 Räume à 10 s, alle mit
// Krallen-Anzug-Klettern, je ein Stern). Zu Beginn jedes Raums trägt die Heldin den Krallen-Anzug (goldene Kapsel am Start;
// geht er verloren, springt nach kurzer Zeit ein neuer heraus). Kletterbar ist, was bunte Griffe hat; glatte Marmorwände
// (Glanzstreifen) lassen weder klettern noch rutschen. Über jedem Ausgang hängt die große Raumuhr (roter Zeiger = Restzeit).
//   1 Bauklotzturm    über den Riesen-Bauklotz klettern, der Stern liegt unten dahinter; oben Druckschalter (Stampfen) →
//                     Münzring um die Turmspitze
//   2 Kristallhöhle   zwei Felsstufen hinauf (Griffe aus Stein, Kristalle, Leuchtpilze), Stern oben
//   3 Piep-Wand       rote Piep-Blöcke (unten) und blaue (oben) sind nur im Wechsel fest – im richtigen Takt klettern
//   4 Glutwand        Lavagraben vor der Wand, drei Lavarinnen laufen die Wand hinab: in einer der Gassen dazwischen hinauf
//   5 Leuchtturm      rot-weiß geringelter Turm in zwei Stufen, Stern auf der Spitze
//   6 Ziegelsperre    Ziegelmauer mit dem Tatzenhieb zerschlagen, dann die Bauwand hinauf
//   7 Doppelwand      vordere Wand hinauf, hinüber an die hängende hintere Wand, weiter hinauf
//   8 Lavaquerung     über zwei Basaltsäulen im Lavasee: anspringen, hochklettern, weiter
//   9 POW-Wand        die Kletterwand ist hinter Ziegeln verborgen – ein Sprung auf den POW-Block zerschlägt sie alle (und
//                     verscheucht die Pilzlinge), dann hinauf
//  10 Bröckelturm     Wand aus großen Bauklötzen, die wackeln und herabstürzen, sobald man an ihnen hängt – schnell hinauf
// Zeit abgelaufen → Haus verlassen mit den bisherigen Sternen (fail 'exit'); Tod → Raum von vorn. Thema house, Musik
// course_house. Räume bei x 0, z 0 / −64 / … / −576 (je Raum eigene Abschnitte und eigene Kamera).
// Level-Haken (LEVEL.setup, _helpers_c.js): Raumhüllen (Welt-4-hausRaum mit Tapeten), Kraxel-Blöcke, Lavarinnen, Krallen-
// Kapseln, Bröckelwand, Piep-Blöcke kletterbar.

import {
  isl, blk, cyl, sph, cone, bakeParts, glowPoints, hausRaum, hausFertig, raumHaken, wimpel, levelSetup, cullStatic, farHide, heroShadowDiet,
  kraxelBlock, krallenHaus, lavaRinnen, broeckelWand, kristalle,
} from './_helpers_c.js';
import { tapete } from '../w6/_helpers_c.js';

const Y = 1;          // Fußboden
const W = 14;         // Raumbreite (x −7 … 7)
const SP = 64;        // Abstand der Räume (z)
const Z0 = (i) => -SP * i;
const zu = (i, u) => Z0(i) - u;
const P = (i, x, u, y = Y) => [x, y, zu(i, u)];
const floor = (i, x0, x1, u0, u1, top, h = 1.2, color = 0x8a5a3a) => isl(x0, x1, zu(i, u0), zu(i, u1), top, h, { top: 'none', under: 0, color });
const KLOTZ = [0xff5a5a, 0xffc21a, 0x4aa8ff, 0x5ac85a, 0xc87aff, 0xff9a3a];

// Raummaße (u = m in den Raum hinein)
const R1 = { turm: [6, 10], top: Y + 7, grube: Y - 3 };
const R2 = { s1: [5, 7.5], t1: Y + 6, t2: Y + 12 };
const R3 = { rot: 5.5, blau: 8.5, sims: Y + 5, top: Y + 10 };
const R4 = { graben: [4.5, 7], wand: 7, lava: Y - 1.5, top: Y + 10, rinnen: [[-5.5, 2], [0, 2], [5.5, 2]] };
const R5 = { unten: Y + 7, oben: Y + 14 };
const R6 = { ziegel: 5.5, wand: 8, top: Y + 9 };
const R7 = { a: [6, 8], aTop: Y + 8, b: 9, bBot: Y + 5, bTop: Y + 15 };
const R8 = { p1: [5, 6.5], p1Top: Y + 4.5, p2: [9, 10.5], p2Top: Y + 9, ziel: 13, zielTop: Y + 8, lava: Y - 1 };
const R9 = { pow: 3.6, ziegel: 7.5, wand: 8, top: Y + 9 };
const R10 = { u: 8, top: Y + 10 };

/** Raumdaten (hausRaum aus den Welt-4-Hilfen): len, h, pit, Tapete (Welt-4-Muster bzw. Welt-6 über tapete6), Böden, Bilder, Uhren, Möbel. */
const RAEUME = [
  { id: 'r1', name: 'Bauklotzturm', title: 'Bauklotzturm: Kletter hinüber – der Stern liegt unten!', len: 18, h: 12, pit: true, paper: 'bauklotz', wood: 0x4a8ad8,
    star: [13, R1.grube + 0.9], floors: [{ u0: -1, u1: 6, style: 'puzzle' }, { u0: 10, u1: 18, y: R1.grube, style: 'uni', color: 0x7ab8ff }],
    pictures: [{ wall: 'l', u: 3, motif: 'lotti' }, { wall: 'r', u: 3, motif: 'greta' }],
    clocks: [{ wall: 'l', u: 13, y: 4.6, r: 0.42 }],
    props: [{ kind: 'teddy', x: -5.6, u: 1.2, yaw: 0.6 }, { kind: 'ball', x: 5.4, u: 4.6, color: 0xff5a7a }, { kind: 'kiste', x: 5.6, u: 1.2, size: 0.9, color: 0x5ab8ff }] },
  { id: 'r2', name: 'Kristallhöhle', title: 'Kristallhöhle: Zwei Felsstufen hinauf!', len: 18, h: 15, paper: 'pilz', wood: 0x5a4a3a,
    star: [11.5, R2.t2 + 0.9], floors: [{ u0: -1, u1: 5, style: 'stein' }],
    pictures: [{ wall: 'l', u: 2.4, motif: 'berg' }, { wall: 'r', u: 2.4, motif: 'pilz' }],
    clocks: [{ wall: 'r', u: 4.4, y: 4.2, r: 0.4 }],
    props: [{ kind: 'riesenpilz', x: -5.8, u: 2.6, size: 0.8, color: 0x4a8aff }, { kind: 'riesenpilz', x: 5.8, u: 1.4, size: 0.6 }, { kind: 'eimer', x: 4.4, u: 3.6, color: 0xffd23d }] },
  { id: 'r3', name: 'Piep-Wand', title: 'Piep-Wand: Kletter, wenn deine Farbe fest ist!', len: 18, h: 13, paper: 'kirmes6', wood: 0x2a2a6a,
    star: [12.5, R3.top + 0.9], floors: [{ u0: -1, u1: 5, style: 'kacheln' }],
    pictures: [{ wall: 'l', u: 2.6, motif: 'piep' }, { wall: 'r', u: 2.6, motif: 'stern' }],
    clocks: [{ wall: 'l', u: 4.4, y: 3.4, r: 0.4, speed: 2 }],
    props: [{ kind: 'trommel', x: -5.6, u: 1.4 }, { kind: 'stange', x: 6.2, u: 0.6, h: 3 }, { kind: 'stange', x: -6.4, u: 4.4, h: 3 }] },
  { id: 'r4', name: 'Glutwand', title: 'Glutwand: Meide die Lavarinnen!', len: 18, h: 13, pit: true, paper: 'maschine', wood: 0x5a2a1a,
    star: [12, R4.top + 0.9], floors: [{ u0: -1, u1: R4.graben[0], style: 'terrakotta' }],
    pictures: [{ wall: 'l', u: 2.4, motif: 'burg' }, { wall: 'r', u: 2.4, motif: 'baron' }],
    clocks: [{ wall: 'r', u: 4, y: 3.6, r: 0.4 }],
    props: [{ kind: 'ofen', x: -5.4, u: 1.6, yaw: Math.PI / 2 }, { kind: 'eimer', x: 5.6, u: 3.6, color: 0xff5a3a }] },
  { id: 'r5', name: 'Leuchtturm', title: 'Leuchtturm: Hinauf zum Stern!', len: 16, h: 17, paper: 'sterne6', wood: 0x1e2a6a,
    star: [8.5, R5.oben + 0.9], floors: [{ u0: -1, u1: 16, style: 'uni', color: 0x3a8ad8 }],
    pictures: [{ wall: 'l', u: 3, motif: 'see' }, { wall: 'r', u: 3, motif: 'zielfahne' }, { wall: 'l', u: 12, y: 6, motif: 'stern' }],
    clocks: [{ wall: 'r', u: 12, y: 5.2, r: 0.42, speed: 1.5 }],
    props: [{ kind: 'truhe', x: -5.4, u: 13, yaw: 0.3 }, { kind: 'kiste', x: 5.4, u: 13.6, size: 1.1, color: 0xffd23d }, { kind: 'eimer', x: -5.6, u: 2.2, color: 0x5ab8ff }] },
  { id: 'r6', name: 'Ziegelsperre', title: 'Ziegelsperre: Tatzenhieb (Aktion), dann hinauf!', len: 18, h: 12, paper: 'dachboden', wood: 0x8a5a2e,
    star: [12, R6.top + 0.9], floors: [{ u0: -1, u1: 18, style: 'holz' }],
    pictures: [{ wall: 'l', u: 2.4, motif: 'kruemel' }, { wall: 'r', u: 2.4, motif: 'pflaume' }],
    clocks: [{ wall: 'l', u: 7, y: 3.4, r: 0.4 }],
    props: [{ kind: 'kiste', x: -5.6, u: 1.2, size: 1, color: 0xd8783a }, { kind: 'kiste', x: -5.2, u: 2.4, size: 0.7, color: 0xffc21a }, { kind: 'rohre', x: 6.4, u: 1, yaw: 0 }] },
  { id: 'r7', name: 'Doppelwand', title: 'Doppelwand: Hinauf, hinüber, hinauf!', len: 20, h: 17, paper: 'schaukel', wood: 0x3a6a2a,
    star: [14, R7.bTop + 0.9, 2.5], floors: [{ u0: -1, u1: 20, style: 'teppich' }],
    pictures: [{ wall: 'l', u: 3, motif: 'trampolin' }, { wall: 'r', u: 3, motif: 'berg' }],
    clocks: [{ wall: 'l', u: 14, y: 6.4, r: 0.45 }],
    props: [{ kind: 'pflanze', x: -6.1, u: 0.8, size: 1.1 }, { kind: 'pflanze', x: 6.1, u: 0.8 }] },
  { id: 'r8', name: 'Lavaquerung', title: 'Lavaquerung: Von Säule zu Säule!', len: 20, h: 12, pit: true, paper: 'kanone', wood: 0x4a2a2a,
    star: [16.5, R8.zielTop + 0.9], floors: [{ u0: -1, u1: 3.5, style: 'stein' }, { u0: R8.ziel, u1: 20, y: R8.zielTop, style: 'stein' }],
    pictures: [{ wall: 'l', u: 2.2, motif: 'canyon' }, { wall: 'r', u: 2.2, motif: 'kaktus' }],
    clocks: [{ wall: 'r', u: 17, y: 9.2, r: 0.42 }],
    props: [{ kind: 'ruestung', x: -5.8, u: 1.6, yaw: 0.4 }, { kind: 'ruestung', x: 5.8, u: 1.6, yaw: -0.4 }] },
  { id: 'r9', name: 'POW-Wand', title: 'POW-Wand: Spring auf den POW-Block!', len: 18, h: 12, paper: 'zirkus', wood: 0xa8283a,
    star: [12, R9.top + 0.9], floors: [{ u0: -1, u1: 18, style: 'parkett' }],
    pictures: [{ wall: 'l', u: 2.6, motif: 'pilz' }, { wall: 'r', u: 2.6, motif: 'zielfahne' }],
    clocks: [{ wall: 'r', u: 5.4, y: 3.4, r: 0.4 }],
    props: [{ kind: 'pferd', x: -5.4, u: 1.4, yaw: 0.6 }, { kind: 'trommel', x: 5.6, u: 1.6 }] },
  { id: 'r10', name: 'Bröckelturm', title: 'Bröckelturm: Schnell hinauf, bevor er bröckelt!', len: 18, h: 13, paper: 'kugeln6', wood: 0x6a2a8a,
    star: [12.5, R10.top + 0.9], floors: [{ u0: -1, u1: 18, style: 'puzzle' }],
    pictures: [{ wall: 'l', u: 2.6, motif: 'lotti' }, { wall: 'r', u: 2.6, motif: 'greta' }],
    clocks: [{ wall: 'l', u: 5.2, y: 3.6, r: 0.42, speed: 2 }],
    props: [{ kind: 'teddy', x: 5.6, u: 1.4, yaw: -0.5 }, { kind: 'ball', x: -5.6, u: 2.2, color: 0x5ac85a }, { kind: 'ball', x: -4.8, u: 1.2, r: 0.22, color: 0xffd23d }] },
];
const TAPETE6 = { kirmes6: 'kirmes', sterne6: 'sterne', kugeln6: 'kugeln' };

// ====================================================================== Aufbau (vor dem Verschmelzen): Kraxel-Blöcke, Lava, Kulisse

function build(level) {
  const kb = (i, x0, x1, u0, u1, y0, y1, o = {}) => kraxelBlock(level, { x0, x1, zA: zu(i, u0), zB: zu(i, u1), y0, y1, ...o });
  // 1 Bauklotzturm: Turm in der Mitte (kletterbar), links und rechts glatte Riesenklötze
  kb(0, -3, 3, R1.turm[0], R1.turm[1], Y - 4, R1.top, { look: 'bauklotz', color: 0x4aa8ff, alt: 0xffc21a });
  kb(0, -7, -3, R1.turm[0], R1.turm[1], Y - 4, Y + 11, { climb: false, look: 'bauklotz', color: 0xff5a5a, alt: 0x5ac85a });
  kb(0, 3, 7, R1.turm[0], R1.turm[1], Y - 4, Y + 11, { climb: false, look: 'bauklotz', color: 0xc87aff, alt: 0xff9a3a });
  // 2 Kristallhöhle: zwei Felsstufen
  kb(1, -7, 7, R2.s1[0], R2.s1[1], Y, R2.t1, { look: 'fels' });
  kb(1, -7, 7, R2.s1[1], 18, Y, R2.t2, { look: 'fels', color: 0x6a4e40, alt: 0x7a5a48, faces: ['+z'] });
  kristalle(level, [[-5.6, R2.t1, zu(1, 6.4), 0.7, 'blau'], [4.8, R2.t1, zu(1, 6.6), 0.6, 'lila'], [-4.6, R2.t2, zu(1, 9.6), 1.0, 'rosa'], [5.4, R2.t2, zu(1, 10.4), 0.9, 'blau'],
    [-6.2, Y, zu(1, 4.2), 0.8, 'lila'], [6.1, Y, zu(1, 4.4), 0.7, 'gold'], [0, R2.t2, zu(1, 15.4), 1.2, 'lila']], { solid: false });
  // 3 Piep-Wand: glatter Steinsockel unter den blauen Blöcken (Sims oben) und glatter Block hinten
  kb(2, -7, 7, 6, 9, Y, R3.sims, { climb: false, look: 'glatt' });
  kb(2, -7, 7, 9, 18, Y, R3.top, { climb: false, look: 'glatt', color: 0xc8b8e8, alt: 0xd8c8f4 });
  // 4 Glutwand: Kletterwand mit drei Lavarinnen, Lavagraben davor
  kb(3, -7, 7, R4.wand, 18, Y - 5, R4.top, { look: 'kletter', color: 0x9a4a3a, alt: 0xa85a48, faces: ['+z'] });
  lavaRinnen(level, { z: zu(3, R4.wand), y0: R4.lava, y1: R4.top, list: R4.rinnen });
  // 5 Leuchtturm: zwei Stufen, rot-weiß geringelt; Galerie-Geländer und Leuchtfeuer
  kb(4, -2.5, 2.5, 6, 11, Y, R5.unten, { look: 'turm', stripes: 1.4 });
  kb(4, -1.5, 1.5, 7, 10, R5.unten, R5.oben, { look: 'turm', stripes: 1.4 });
  {
    const T = [], cz = zu(4, 8.5);
    for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; T.push(cyl(0.04, 0.04, 0.7, Math.cos(a) * 2.2, R5.unten, cz + Math.sin(a) * 2.2, 0x2a2a34, 5)); }
    T.push(cyl(2.25, 2.25, 0.08, 0, R5.unten + 0.7, cz, 0x2a2a34, 24, { open: true }));
    for (let k = 0; k < 8; k++) T.push(blk(0.5, 0.18, 0.12, -6.4 + (k % 2) * 12.8, Y + 0.05, zu(4, 1.5 + Math.floor(k / 2) * 3.5), 0xffffff));   // Wellen-Schaum am „Meer“-Boden
    bakeParts(level, T, { castShadow: false });
    glowPoints(level, [[0, R5.oben + 2.6, cz]], 0xfff0a0, 5, { opacity: 0.5, name: 'leuchtfeuer' });
  }
  // 6 Ziegelsperre: glatte Mauer links und rechts der Ziegel, Kletterwand dahinter
  kb(5, -7, -2.5, R6.ziegel - 0.5, R6.ziegel + 0.5, Y, Y + 6, { climb: false, look: 'glatt' });
  kb(5, 2.5, 7, R6.ziegel - 0.5, R6.ziegel + 0.5, Y, Y + 6, { climb: false, look: 'glatt' });
  kb(5, -7, 7, R6.wand, 18, Y, R6.top, { look: 'kletter', color: 0xd8783a, alt: 0xc86a30, faces: ['+z'] });
  // 7 Doppelwand: vordere Wand (links), glatter Sockel und hängende hintere Wand (rechts)
  kb(6, -7, 2, R7.a[0], R7.a[1], Y, R7.aTop, { look: 'kletter', color: 0x4ab86a, alt: 0x5ac87a });
  kb(6, -2, 7, R7.b, 20, Y, R7.bBot, { climb: false, look: 'glatt' });
  kb(6, -2, 7, R7.b, 20, R7.bBot, R7.bTop, { look: 'kletter', color: 0xa86ae8, alt: 0xb87af0, faces: ['+z', '-x'] });
  // 8 Lavaquerung: zwei Basaltsäulen, glattes Zielpodest
  kb(7, -1.5, 1.5, R8.p1[0], R8.p1[1], Y - 5, R8.p1Top, { look: 'fels', color: 0x4a3c56, alt: 0x5a4864 });
  kb(7, -1.5, 1.5, R8.p2[0], R8.p2[1], Y - 5, R8.p2Top, { look: 'fels', color: 0x4a3c56, alt: 0x5a4864 });
  kb(7, -7, 7, R8.ziel, 20, Y - 5, R8.zielTop, { climb: false, look: 'glatt', color: 0x8a7a9a, alt: 0x9a8aaa });
  // 9 POW-Wand: Kletterspalte in der Mitte (hinter Ziegeln), glatte Wände daneben
  kb(8, -2.5, 2.5, R9.wand, 18, Y, R9.top, { look: 'kletter', color: 0x3a8a6a, alt: 0x4a9a7a, faces: ['+z'] });
  kb(8, -7, -2.5, R9.wand, 18, Y, R9.top, { climb: false, look: 'glatt' });
  kb(8, 2.5, 7, R9.wand, 18, Y, R9.top, { climb: false, look: 'glatt' });
  // 10 Bröckelturm: glatte Seiten und Rückblock (die Bauklötze selbst sind Bruchstücke)
  kb(9, -7, -3, R10.u - 1, R10.u + 1, Y, R10.top, { climb: false, look: 'glatt' });
  kb(9, 3, 7, R10.u - 1, R10.u + 1, Y, R10.top, { climb: false, look: 'glatt' });
  kb(9, -7, 7, R10.u + 1, 18, Y, R10.top, { climb: false, look: 'glatt', color: 0xd8c8f0, alt: 0xe8d8f8 });
  kb(9, -3, 3, R10.u - 1, R10.u + 1, Y + 8, R10.top, { look: 'bauklotz', color: 0xffc21a, alt: 0xff9a3a, faces: ['+z'] });   // feste Oberkante
}

// ====================================================================== Level-Haken

function setup(level) {
  const shared = { pos: [], uv: [] }, clocks = [];
  RAEUME.forEach((r, i) => {
    const room = { ...r, index: i, z0: Z0(i), paper: TAPETE6[r.paper] ? 'eigene' : r.paper };
    hausRaum(level, room, shared, clocks);
    if (TAPETE6[r.paper]) tapete(level, { id: r.id, z0: Z0(i), len: r.len, h: r.h }, TAPETE6[r.paper]);
  });
  const uhren = hausFertig(level, shared, clocks);
  if (uhren) level.named.set('haus_uhren', uhren);
  // Hauswände: glatt (kein Wandrutschen/Wandsprung – nur die Kraxel-Wände bringen hinauf)
  level.world.forEach((s) => { if (s.tag === 'hauswand') s.noWallSlide = true; });
  // Piep-Blöcke der Piep-Wand sind Kletterwände (nur solange sie fest sind)
  for (const b of level.piep?.boxes ?? []) b.shape.climbable = true;
  level.named.set('krallen', krallenHaus(level, RAEUME.map((r, i) => P(i, 0, 2.4))));
  level.named.set('broeckel', broeckelWand(level, 'r10_b', { warn: 0.75 }));
  // Raumstart: Druckschalter in Raum 1 zurück
  raumHaken(level, {
    play(i) {
      if (i === 0) { const s = level.named.get('r1_schalter'); if (s && s.state !== 'idle') s.fail?.(); }
    },
  });
  // kleine Kulisse: Wimpel, Glühbirnen über den Ausgängen
  wimpel(level, [{ z: zu(0, 4), y: Y + 9.6, sag: 0.7 }, { z: zu(2, 3.5), y: Y + 10.5, sag: 0.6, colors: [0xff3d55, 0x2f78ff, 0xffffff] }, { z: zu(8, 4), y: Y + 9.8, sag: 0.8, colors: [0xe8323a, 0xffffff, 0xffd23d] }]);
  heroShadowDiet(level, 0.12);
  farHide(level, ['pilzling', 'powerup', 'star', 'pow', 'pswitch', 'bruchstueck', 'brick'], 48);
}

// ====================================================================== Level-Daten

const area = (i) => ({ min: [-W / 2 - 0.5, Y - 9, zu(i, RAEUME[i].len) - 0.5], max: [W / 2 + 0.5, Y + 20, Z0(i) + 1.5] });
const cam = (o = {}) => ({ pitch: o.pitch ?? 36, dist: o.dist ?? 16, yaw: 0, fov: o.fov ?? 44, x: 0, xLock: o.xLock ?? 0.6, ahead: o.ahead ?? 1.6, height: o.height ?? 1.6,
  ...(o.center ? { center: o.center, pull: o.pull ?? 0.35 } : {}) });
const start = (i, u = 2.4, y = Y) => ({ pos: P(i, 0, u, y), yaw: Math.PI / 2 });
const STARTS = RAEUME.map((r, i) => start(i));
const CAMS = [
  cam({ pitch: 38, dist: 16, center: P(0, 0, 9, Y + 2) }),
  cam({ pitch: 34, dist: 17, center: P(1, 0, 8, Y + 5) }),
  cam({ pitch: 34, dist: 16, center: P(2, 0, 8, Y + 4) }),
  cam({ pitch: 34, dist: 16, center: P(3, 0, 8, Y + 4) }),
  cam({ pitch: 30, dist: 18, center: P(4, 0, 8, Y + 6), height: 2.4 }),
  cam({ pitch: 36, dist: 16, center: P(5, 0, 8, Y + 3) }),
  cam({ pitch: 32, dist: 18, center: P(6, 0, 9, Y + 6), height: 2.2 }),
  cam({ pitch: 52, dist: 17, center: P(7, 0, 8, Y + 3), pull: 0.3 }),
  cam({ pitch: 36, dist: 16, center: P(8, 0, 7, Y + 3) }),
  cam({ pitch: 34, dist: 16, center: P(9, 0, 8, Y + 4) }),
];

// Ziegel: Raum 6 (Sperre 5 × 6) und Raum 9 (Wand 5 × 9); Bröckel-Bauklötze in Raum 10 (2 × 4, darüber eine feste Kante)
const ZIEGEL6 = [];
for (let r = 0; r < 6; r++) for (let x = -2; x <= 2; x++) ZIEGEL6.push({ kind: 'brick', roomId: 'r6', pos: P(5, x, R6.ziegel, Y + r) });
const ZIEGEL9 = [];
for (let r = 0; r < 9; r++) for (let x = -2; x <= 2; x++) ZIEGEL9.push({ kind: 'brick', roomId: 'r9', pos: P(8, x, R9.ziegel, Y + r) });
const KLOETZE = [];
for (let r = 0; r < 4; r++) for (const [c, x] of [[0, -1.5], [1, 1.5]]) {
  KLOETZE.push({ kind: 'bruchstueck', id: `r10_b${c}${r}`, roomId: 'r10', pos: P(9, x, R10.u, Y + 2 * r), size: [3, 2, 2], climbable: true, color: KLOTZ[(c * 2 + r) % KLOTZ.length], warn: 0.75 });
}

export const LEVEL = {
  id: '8-Haus',
  world: 8,
  title: 'Haus Krallenkraxel',
  archetype: 'house',
  theme: 'house',
  music: 'course_house',
  timeLimit: 300,
  killY: Y - 8,
  build,
  setup: (level, scene) => { levelSetup(setup)(level, scene); cullStatic(level); },
  start: STARTS[0],
  house: {
    fail: 'exit',
    time: 10,
    rooms: RAEUME.map((r, i) => ({ id: r.id, goal: 'reach', area: area(i), start: STARTS[i], camera: CAMS[i], star: P(i, r.star[2] ?? 0, r.star[0], r.star[1]), time: 10, title: r.title })),
  },
  segments: [
    // ---------------- 1 Bauklotzturm: Vorplatz, Grube hinter dem Turm
    floor(0, -7, 7, -1, R1.turm[0], Y),
    floor(0, -7, 7, R1.turm[1], 18, R1.grube, 1.2, 0x3a6ab8),
    { type: 'sign', pos: P(0, 1.8, 9.4, R1.top), text: 'Stern unten ↓', size: [1.9, 0.75], post: 0.5 },
    // ---------------- 2 Kristallhöhle
    floor(1, -7, 7, -1, R2.s1[0], Y),
    // ---------------- 3 Piep-Wand: rote Blöcke unten, blaue oben (kletterbar, nur fest im Takt)
    floor(2, -7, 7, -1, R3.rot + 0.5, Y),           // Boden auch unter den roten Blöcken (sind sie aus, steht man davor)
    { type: 'piep_block', id: 'r3_rot', color: 'rot', pos: P(2, 0, R3.rot, Y), size: [14, 5, 1], every: 4, warn: 2 },
    { type: 'piep_block', id: 'r3_blau', color: 'blau', pos: P(2, 0, R3.blau, R3.sims), size: [14, 5, 1], every: 4, warn: 2 },
    // ---------------- 4 Glutwand: Start, Lavagraben
    floor(3, -7, 7, -1, R4.graben[0], Y),
    { type: 'lavaspiegel', id: 'r4_lava', mode: 'fest', pos: P(3, 0, (R4.graben[0] + R4.graben[1]) / 2, Y - 6), size: [14, 4.5, R4.graben[1] - R4.graben[0]], low: R4.lava },
    { type: 'sign', pos: P(3, -4.4, 3.4), text: 'Lavarinnen\nmeiden!', size: [2.2, 0.9], post: 0.9 },
    // ---------------- 5 Leuchtturm
    floor(4, -7, 7, -1, 16, Y),
    // ---------------- 6 Ziegelsperre
    floor(5, -7, 7, -1, 18, Y),
    { type: 'sign', pos: P(5, -4.6, 2.6), text: 'Tatzenhieb:\nAktion!', size: [2.2, 0.9], post: 0.9 },
    // ---------------- 7 Doppelwand
    floor(6, -7, 7, -1, 20, Y),
    // ---------------- 8 Lavaquerung: Start, Lavasee
    floor(7, -7, 7, -1, 3.5, Y),
    { type: 'lavaspiegel', id: 'r8_lava', mode: 'fest', pos: P(7, 0, (3.5 + R8.ziel) / 2, Y - 6), size: [14, 5, R8.ziel - 3.5], low: R8.lava },
    // ---------------- 9 POW-Wand
    floor(8, -7, 7, -1, 18, Y),
    // ---------------- 10 Bröckelturm
    floor(9, -7, 7, -1, 18, Y),
    { type: 'sign', pos: P(9, -4.6, 3.2), text: 'Achtung,\nbröckelt!', size: [2.2, 0.9], post: 0.9 },
  ],
  blocks: [...ZIEGEL6, ...ZIEGEL9],
  items: [
    // Raum 1: Druckschalter oben auf dem Turm – Stampfen gibt einen Münzring um die Turmspitze
    { kind: 'pswitch', id: 'r1_schalter', roomId: 'r1', pos: P(0, 0, 8, R1.top), time: 6, coins: { pos: [0, R1.top + 1.4, zu(0, 8)], r: 2.6, n: 8 }, reward: { coins: 3 } },
    // Raum 2: Münzen auf den Stufen
    { kind: 'coins', roomId: 'r2', from: P(1, -2, 6.2, R2.t1 + 0.4), to: P(1, 2, 6.2, R2.t1 + 0.4), n: 3 },
    // Raum 9: POW-Block vor der Ziegelwand
    { kind: 'pow', id: 'r9_pow', roomId: 'r9', pos: P(8, 0, R9.pow), uses: 2, radius: 9, height: 10 },
    // Raum 10: Bröckel-Bauklötze
    ...KLOETZE,
  ],
  enemies: [
    // Raum 9: drei Pilzlinge vor der Ziegelwand (der POW-Block wirft sie um)
    { kind: 'pilzling', id: 'r9_pilz1', roomId: 'r9', pos: P(8, -4.5, 5.2), dir: [1, 0], speed: 1.1 },
    { kind: 'pilzling', id: 'r9_pilz2', roomId: 'r9', pos: P(8, 4.5, 6.2), dir: [-1, 0], speed: 1.1 },
    { kind: 'pilzling', id: 'r9_pilz3', roomId: 'r9', pos: P(8, -5.5, 2.4), dir: [0, -1], speed: 0.8 },
  ],
  marks: Object.fromEntries(STARTS.map((s, i) => [`r${i + 1}`, s.pos])),
  // Daten für Tests/Bots
  _haus: { Z0: RAEUME.map((r, i) => Z0(i)), Y, R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, names: RAEUME.map((r) => r.name) },
};
