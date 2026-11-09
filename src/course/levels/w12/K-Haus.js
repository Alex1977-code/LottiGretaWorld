// K-Haus „Haus Marathon“ – Prüfungs-Haus der Welt Krone (Archetyp house, Bauplan K-Haus „Mystery House Marathon“: 30 Räume
// à 10 s am Stück, je ein Stern, meist schwerere Fassungen früherer Prüfungsräume; Raum 29 Wirbelbrocken mit 1 Treffer,
// Raum 30 gerader Münzweg mit Stern und Stempel). Dreißig Stuben hintereinander (Raster 56 m nach −Z, Boden y 1), jede mit
// eigener Tapete, Holzfarbe, Bildern, Uhren und Möbeln; über jedem Ausgang zeigt die große Raumuhr die zehn Sekunden.
// `fail: 'exit'`: wer die 10 s überzieht, verlässt das Haus mit den Sternen bis dahin (gespeichert); Tod → Raum von vorn.
// Wo der Raum ein Werkzeug braucht, gibt die Kraftkapsel neben dem Start es beim Raumbeginn (Funkenblüte, Krallen-Anzug)
// bzw. nimmt ein mitgebrachtes ab; in der Eisrutsche steigt die Figur in einen Schlittschuh.
//
//   1 Panzerparade      3 Panzerkröten besiegen                      16 Ringwand          drehende Mauer mit Lücke, Wuschel
//   2 Schaukelsaal      3 Schaukeln, Stachelwalzen am Ziel           17 Hasenjagd         Boost-Pfeile, 2 Hasen fangen
//   3 Glutfelder        3 Druckfelder, 2 Lavabrocken                 18 Sprungfeld-Wurf   Ball vom Sprungfeld auf den hohen Schalter
//   4 Fackelstube       4 Fackeln mit der Funkenblüte                19 Holzlabyrinth     rotierendes Labyrinth, Stern in der Mitte
//   5 Kreiselzimmer     Drehscheibe, gegenläufige Kreisgeister,      20 Schubser-Kessel   2 Schubser in die Lava stoßen
//                       Stern auf dem Schrank                        21 Riesen-?-Türme    3 Riesen-?-Blöcke ausfahren
//   6 Kistenlager       20 Kisten, Stern unten links rechts hinten   22 Himmelssteg       schmaler Steg, Suchköpfe von der Seite
//   7 Pilzlingsschar    Pilzling + 6 Mini-Pilzlinge (POW-Block)      23 Rankentreppe      5 Rankenschnapper als Stufen
//   8 Kullerhang        Bälle den Hang hinab, Stern unter Käfern     24 Schalterfelder    3 Schalterscheiben mit Bällen
//   9 Hackbeil-Hof      4 Hackbeil-Pilze, der rechte federt hoch     25 Topfgarten        Topf-Schnappblumen fressen die Wuschel
//  10 Stampfsteinfahrt  Stampfstein hinauf, unsichtbare Stege        26 Schnappkarussell  Drehteller mit Schnappblumen
//  11 Eisrutsche        Eishang mit Schlittschuh, Stachelstreifen    27 Scheinwerferschacht Suchscheinwerfer, schnell hinauf
//  12 Krallenschalter   Schalter rechts oben, Stern links oben       28 Donutbrücke       Donut-Brücke, 2 Walzenwerfer
//  13 Kanonenturm       Stufen hinauf zwischen Projektilköpfen       29 Wirbelbrocken     Wirbelbrocken mit einem Treffer
//  14 Piep-Treppe       Treppe aus Piep-Blöcken im Takt              30 Siegerflur        Münzweg mit Stempel und Stern
//  15 Großblock-Fall    4 Großblöcke stürzen unter der Figur ab
// Thema house, Musik course_house. Räume bei x 0, z 0 / −56 / … / −1624 (eigene Abschnitte und Kamera je Raum).
// Raumhüllen aus den Welt-4-Hilfen (hausRaum/hausFertig, nur importiert), Tapeten Welt 6 und eigene (_helpers_b.js),
// Kraftkapseln aus den Welt-Pilz-Hilfen, Kletterblöcke aus den Welt-8-Hilfen, Fackeln aus den Welt-Blume-Hilfen.

import { isl, levelSetup, cullStatic, farHide, teileInstanzen, heroShadowDiet, hausRaum, hausFertig, schaukeln, raumHaken, wimpel, blk, cyl, sph, bakeParts } from '../w4/_helpers_d.js';
import { tapete, kraftfeld, kullerRinne } from '../w6/_helpers_c.js';
import { kraftKapsel } from '../w10/_helpers_pb.js';
import { kraxelBlock } from '../w8/_helpers_c.js';
import { moorfackeln } from '../w11/_helpers_ba.js';
import { unsichtbareWolke } from '../w9/_helpers_d.js';
import { leaveSkate } from '../../player/skating.js';
import { tapeteK, versteckteSterne, drehteller, frischeWalzen, nurRaumSicht, line } from './_helpers_b.js';

const PI = Math.PI;
const Y = 1;          // Fußboden
const W = 14;         // Raumbreite (x −7 … 7)
const SP = 56;        // Abstand der Räume (z)
const N = 30;
const Z0 = (i) => -SP * i;
const zu = (i, u) => Z0(i) - u;
const P = (i, x, u, y = Y) => [x, y, zu(i, u)];
const floor = (i, x0, x1, u0, u1, top = Y, h = 1.2, color = 0x8a5a3a) => isl(x0, x1, zu(i, u0), zu(i, u1), top, h, { top: 'none', under: 0, color });
const cliff = (i, x0, x1, u0, u1, top, color) => isl(x0, x1, zu(i, u0), zu(i, u1), top, top - (Y - 7), { top: 'none', under: 0, color });

// ====================================================================== Maße je Raum (u = m in den Raum hinein)
const R2 = { swings: [11, 18.5, 26], walze: 34, star: 36.4 };
const R3 = { felder: [[-4.5, 6.5], [4.5, 6.5], [0, 12.8]], star: [0, 9.2] };
const R4 = { fackeln: [[-5, 5.5], [5, 5.5], [-5, 13.5], [5, 13.5]], star: [0, 9.5] };
const R5 = { c: 9.5, disc: 5.6, kommode: 1.8, schrankTop: Y + 0.25 + 3.0 };
const R6 = { groups: [[-4, 6], [4, 6], [-4, 12.5], [4, 12.5]] };
const R8 = { balkon: Y + 3, kraft: 6.4, rampe: [6, 13], star: 19.5 };
const R9 = { pilze: [-4.8, -1.6, 1.6, 4.8], feder: [5.2, 13.6], star: [5.2, 13.6, Y + 5.3] };
const R10 = { pad: [5, 8.6], stein: 6.8, wolken: [[11.6, 2.6], [16.6, 2.6]], ende: [20.5, 24], hoch: Y + 5 };
const R11 = { oben: Y + 5, rampe: [5, 17], stachel: [21, 25.5], star: 30.5 };
const R12 = { rechts: [3.4, 6.6], links: [-6.6, -3.4], u: [6, 9], top: Y + 4.6 };
const R13 = { tiers: [[-5, 5, 8, Y + 2.2], [-3.5, 3.5, 10.5, Y + 4.4], [-2, 2, 13, Y + 6.6]], back: 16 };
const R14 = { from: 5, steps: 7, run: 1.3, colors: ['rot', 'rot', 'blau', 'blau', 'rot', 'rot', 'blau'], every: 3, warn: 1 };
const R15 = { bloecke: [7.5, 12.5, 17.5, 22.5], ende: 25.5 };
const R16 = { c: 10, half: 3 };
const R17 = { boosts: [6, 15] };
const R18 = { ball: [-1.6, 3.6], sprung: 6.5, turm: 13.5, top: Y + 5.05 };
const R19 = { c: 10.5 };
const R20 = { insel: [-5, 5, 5.5, 15], lava: Y - 0.6 };
const R21 = { t1: [-3.6, 5.6], s1: [-2.2, 3.2, 6, 10.5, Y + 4.6], t2: [1.0, 8.3], s2: [3.2, 7, 6, 13, Y + 9.2], t3: [5.1, 10.6], t3n: 3 };
const R22 = { steg: [4, 34], kanonen: [10, 17, 22, 27, 32], takt: [0, 0.03, 0.53, 1.03, 1.53] };
const R23 = { ranken: [[-1, 5.2, 1.6], [1, 7.6, 2.8], [-1, 10, 4.0], [1, 12.4, 5.2], [-1, 14.8, 6.4]], ledge: [16.6, 20, Y + 6.6] };
const R24 = { buehne: Y + 0.8, ziele: [[-3.6, 11, Y + 1.0], [0, 11.6, Y + 1.0], [3.6, 11, Y + 1.0]], kraft: 8.4, baelle: [[-1.6, 3.4], [-0.5, 3.6], [0.6, 3.6], [1.7, 3.4]] };
const R26 = { c: 10, r: 5.2, top: Y + 0.25, sockel: Y + 1.6 };
const R27 = { leisten: [[-6.6, -0.5, 9, 12, Y + 2.2], [0.5, 6.6, 11, 14, Y + 4.4], [-6.6, -0.5, 13, 17, Y + 6.6]] };
const R28 = { bruecke: [6, 24], mitte: [12, 18], ende: 24 };
const R30 = { len: 30 };

/**
 * Raumdaten (hausRaum aus den Welt-4-Hilfen): len, h, pit, Tapete (Welt-4-Muster, Welt-6 über '…6', eigene über 'k:…'),
 * Täfelung (wood), Böden (Muster), Bilder, Uhren, Möbel, Ziel, Stern [x, u, y], Kamera, Kapsel.
 */
const RAEUME = [
  { name: 'Panzerparade', title: 'Panzerparade: Besiege alle drei Panzerkröten!', len: 16, h: 5, paper: 'wueste', wood: 0xc8783a, goal: 'defeatAll', star: [0, 8, Y + 1.6],
    floors: [{ u0: -1, u1: 16, style: 'sand' }], cam: { pitch: 50, dist: 16.5, c: 8.5 },
    pictures: [{ wall: 'l', u: 4, motif: 'kaktus' }, { wall: 'r', u: 4, motif: 'canyon' }, { wall: 'b', x: -4.4, y: 2.2, motif: 'pilz' }],
    clocks: [{ wall: 'l', u: 11, y: 3.4, r: 0.42 }], props: [{ kind: 'kaktus', x: 6.2, u: 1.2 }, { kind: 'sandburg', x: -5.4, u: 15 }, { kind: 'eimer', x: 5.8, u: 15.2, color: 0xff5a5a }] },
  { name: 'Schaukelsaal', title: 'Schaukelsaal: Drei Schaukeln – Vorsicht, Stachelwalzen!', len: 38, h: 8, pit: true, paper: 'schaukel', wood: 0x2a8a6a, star: [0, R2.star, Y + 0.25],
    floors: [{ u0: -1, u1: 6, style: 'teppich' }, { u0: 31, u1: 38, style: 'teppich' }], cam: { pitch: 40, dist: 14, follow: true },
    pictures: [{ wall: 'l', u: 3, y: 2.3, motif: 'see' }, { wall: 'r', u: 3, y: 2.3, motif: 'kruemel' }, { wall: 'b', x: -4.4, y: 2.3, motif: 'trampolin' }],
    clocks: [{ wall: 'l', u: 18.5, y: 5.6, r: 0.5 }], props: [{ kind: 'teddy', x: -5.4, u: 2.4, yaw: 0.4 }, { kind: 'pflanze', x: -5.9, u: 36.6 }] },
  { name: 'Glutfelder', title: 'Glutfelder: Tritt auf alle drei Druckfelder!', len: 18, h: 5, paper: 'k:glut', wood: 0x5a2a1a, star: [R3.star[0], R3.star[1], Y + 0.25],
    floors: [{ u0: -1, u1: 18, style: 'terrakotta' }], cam: { pitch: 52, dist: 16.5, c: 9 },
    pictures: [{ wall: 'l', u: 4, motif: 'burg' }, { wall: 'r', u: 4, motif: 'canyon' }], clocks: [{ wall: 'r', u: 12, y: 3.4, r: 0.42 }],
    props: [{ kind: 'ofen', x: 5.9, u: 1.4, yaw: -PI / 2 }, { kind: 'eimer', x: -6, u: 16, color: 0xff7a2a }] },
  { name: 'Fackelstube', title: 'Fackelstube: Zünde alle vier Fackeln an!', len: 18, h: 6, paper: 'galerie', wood: 0x4a2a1a, star: [R4.star[0], R4.star[1], Y + 0.25], kapsel: { power: 'funken' },
    floors: [{ u0: -1, u1: 18, style: 'parkett' }], cam: { pitch: 50, dist: 17, c: 9.5 },
    pictures: [{ wall: 'l', u: 9.5, motif: 'baron' }, { wall: 'r', u: 9.5, motif: 'burg' }, { wall: 'b', x: 0, y: 2.2, motif: 'stern' }], clocks: [{ wall: 'l', u: 3, y: 3.6, r: 0.42 }],
    props: [{ kind: 'ruestung', x: 6.1, u: 16.2, yaw: -0.4 }, { kind: 'ruestung', x: -6.1, u: 16.2, yaw: 0.4 }] },
  { name: 'Kreiselzimmer', title: 'Kreiselzimmer: Hinauf auf den Schrank!', len: 18, h: 7, paper: 'sterne6', wood: 0x2a1e6a, star: [0, R5.c, R5.schrankTop + 0.05],
    floors: [{ u0: -1, u1: 18, style: 'stein' }], cam: { pitch: 50, dist: 17, c: R5.c },
    pictures: [{ wall: 'l', u: 4, motif: 'stern' }, { wall: 'r', u: 4, motif: 'piep' }], clocks: [{ wall: 'r', u: 15, y: 4, r: 0.45, speed: 2 }],
    props: [{ kind: 'standuhr', x: 6.2, u: 1.4, yaw: -PI / 2 }, { kind: 'lampe', x: -6, u: 1.4 }] },
  { name: 'Kistenlager', title: 'Kistenlager: Der Stern steckt unten links in den Kisten hinten rechts!', len: 18, h: 5, paper: 'dachboden', wood: 0x8a5a2e, star: [R6.groups[3][0] - 1, R6.groups[3][1], Y + 0.1], kapsel: { power: 'krallen' },
    floors: [{ u0: -1, u1: 18, style: 'holz' }], cam: { pitch: 52, dist: 16, c: 9 },
    pictures: [{ wall: 'l', u: 3, motif: 'kruemel' }, { wall: 'r', u: 3, motif: 'pflaume' }], clocks: [{ wall: 'l', u: 9.5, y: 3.4, r: 0.4 }],
    props: [{ kind: 'truhe', x: 0, u: 16.6 }, { kind: 'spinne', x: 6.4, u: 17.4, y: Y + 4.4, solid: false }] },
  { name: 'Pilzlingsschar', title: 'Pilzlingsschar: Lock sie zum POW-Block!', len: 16, h: 5, paper: 'pilz', wood: 0x7a4a2a, goal: 'defeatAll', star: [0, 7, Y + 1.6],
    floors: [{ u0: -1, u1: 16, style: 'puzzle' }], cam: { pitch: 50, dist: 16, c: 8 },
    pictures: [{ wall: 'l', u: 4, motif: 'pilz' }, { wall: 'r', u: 4, motif: 'pilz' }], clocks: [{ wall: 'r', u: 11, y: 3.4, r: 0.4 }],
    props: [{ kind: 'riesenpilz', x: -6, u: 1.6, size: 0.7, color: 0x4a8aff }, { kind: 'riesenpilz', x: 6, u: 15, size: 0.8 }] },
  { name: 'Kullerhang', title: 'Kullerhang: Roll einen Ball zum Stern unter den Käfern!', len: 22, h: 9, paper: 'kugeln6', wood: 0x3a6ab8, star: [0, R8.star, Y + 0.15],
    floors: [{ u0: -1, u1: R8.rampe[0], y: R8.balkon, style: 'teppich' }, { u0: R8.rampe[1], u1: 22, style: 'puzzle' }], cam: { pitch: 46, dist: 17, c: 11 },
    pictures: [{ wall: 'l', u: 3, y: 5, motif: 'trampolin' }, { wall: 'r', u: 3, y: 5, motif: 'see' }], clocks: [{ wall: 'l', u: 17, y: 3.6, r: 0.45 }],
    props: [{ kind: 'ball', x: 5.6, u: 20, color: 0xff6a8a }, { kind: 'ball', x: -5.6, u: 20.6, r: 0.25, color: 0x5ab8ff }] },
  { name: 'Hackbeil-Hof', title: 'Hackbeil-Hof: Der rechte Klotz federt dich hoch!', len: 18, h: 10, paper: 'zirkus', wood: 0xa8283a, star: R9.star,
    floors: [{ u0: -1, u1: 18, style: 'parkett' }], cam: { pitch: 34, dist: 18, c: 12.5, pull: 0.65 },
    pictures: [{ wall: 'l', u: 4, motif: 'baron' }, { wall: 'r', u: 4, motif: 'trampolin' }], clocks: [{ wall: 'l', u: 13, y: 4, r: 0.45 }],
    props: [{ kind: 'trommel', x: -6, u: 1.6 }, { kind: 'stange', x: 6.3, u: 0.8, h: 3 }] },
  { name: 'Stampfsteinfahrt', title: 'Stampfsteinfahrt: Mit dem Stein hinauf – dann über unsichtbare Stege!', len: 24, h: 12, pit: true, paper: 'maschine', wood: 0x3a4a5a, star: [0, 22.5, R10.hoch + 0.25],
    floors: [{ u0: -1, u1: R10.pad[1], x0: -2.4, x1: 2.4, style: 'metall' }, { u0: R10.ende[0], u1: 24, y: R10.hoch, style: 'metall' }], cam: { pitch: 42, dist: 16, follow: true },
    pictures: [{ wall: 'l', u: 3, y: 2.4, motif: 'piep' }, { wall: 'r', u: 3, y: 2.4, motif: 'zielfahne' }], clocks: [{ wall: 'r', u: 14, y: 6, r: 0.45, speed: 3 }],
    props: [{ kind: 'rohre', x: -6.2, u: 1.2 }, { kind: 'zahnrad', x: 4.6, u: 0.2, y: Y + 1.5, r: 1.0, solid: false }] },
  { name: 'Eisrutsche', title: 'Eisrutsche: Mit dem Schlittschuh über die Stacheln!', len: 34, h: 9, paper: 'k:eis', wood: 0x2a5a9a, star: [0, R11.star, Y + 0.25],
    floors: [{ u0: -1, u1: R11.rampe[0], y: R11.oben, style: 'kacheln' }], cam: { pitch: 40, dist: 15, follow: true },
    pictures: [{ wall: 'l', u: 3, y: 6.5, motif: 'berg' }, { wall: 'r', u: 3, y: 6.5, motif: 'see' }], clocks: [{ wall: 'r', u: 30, y: 3.4, r: 0.45 }],
    props: [{ kind: 'kiste', x: -5.6, u: 32.5, size: 1, color: 0x9ad8ff }] },
  { name: 'Krallenschalter', title: 'Krallenschalter: Rechts drücken, links klettern!', len: 16, h: 9, paper: 'bauklotz', wood: 0x4a8ad8, star: [-5, 7.5, R12.top + 0.25], kapsel: { power: 'krallen' },
    floors: [{ u0: -1, u1: 16, style: 'puzzle' }], cam: { pitch: 44, dist: 16.5, c: 8 },
    pictures: [{ wall: 'l', u: 13, motif: 'lotti' }, { wall: 'r', u: 13, motif: 'greta' }], clocks: [{ wall: 'l', u: 3, y: 3.4, r: 0.4 }],
    props: [{ kind: 'teddy', x: 0, u: 15.2, yaw: 0 }, { kind: 'ball', x: 1.6, u: 14.6, color: 0xffd23d }] },
  { name: 'Kanonenturm', title: 'Kanonenturm: Stufe für Stufe – Achtung, Köpfe!', len: 18, h: 12, paper: 'kanone', wood: 0x1e2a5a, star: [0, 14.5, R13.tiers[2][3] + 0.25],
    floors: [{ u0: -1, u1: 18, style: 'stein' }], cam: { pitch: 42, dist: 17, c: 11 },
    pictures: [{ wall: 'l', u: 3, motif: 'burg' }, { wall: 'r', u: 3, motif: 'baron' }], clocks: [{ wall: 'r', u: 5, y: 3.6, r: 0.42 }],
    props: [{ kind: 'kiste', x: -5.6, u: 2, size: 1, color: 0x6a4a2a }] },
  { name: 'Piep-Treppe', title: 'Piep-Treppe: Spring, wenn die Stufe fest ist!', len: 18, h: 12, paper: 'kirmes6', wood: 0x2a2a6a, star: [0, R14.from + R14.steps * R14.run - 0.8, Y + R14.steps + 0.25],
    floors: [{ u0: -1, u1: 18, style: 'kacheln' }], cam: { pitch: 42, dist: 17, c: 10 },
    pictures: [{ wall: 'l', u: 3, y: 2.3, motif: 'piep' }, { wall: 'r', u: 3, y: 2.3, motif: 'stern' }], clocks: [{ wall: 'l', u: 14, y: 6, r: 0.45, speed: 2 }],
    props: [{ kind: 'trommel', x: -5.6, u: 1.4 }, { kind: 'stange', x: 6.2, u: 0.6, h: 3 }] },
  { name: 'Großblock-Fall', title: 'Großblock-Fall: Die Blöcke stürzen ab – weiter, weiter!', len: 30, h: 8, pit: true, paper: 'bauklotz', wood: 0xd8a83a, star: [0, 27.5, Y + 0.25],
    floors: [{ u0: -1, u1: 5, style: 'puzzle' }, { u0: R15.ende, u1: 30, style: 'puzzle' }], cam: { pitch: 42, dist: 14.5, follow: true },
    pictures: [{ wall: 'l', u: 3, y: 2.3, motif: 'zielfahne' }, { wall: 'r', u: 3, y: 2.3, motif: 'lotti' }], clocks: [{ wall: 'r', u: 15, y: 5, r: 0.45 }],
    props: [{ kind: 'teddy', x: 5.4, u: 28.5, yaw: -0.4 }] },
  { name: 'Ringwand', title: 'Ringwand: Schlüpf durch die Lücke zum Stern!', len: 20, h: 6, paper: 'k:garten', wood: 0x3a7a3a, star: [0, R16.c, Y + 0.25 + 0.25],
    floors: [{ u0: -1, u1: 20, style: 'teppich' }], cam: { pitch: 52, dist: 17, c: R16.c },
    pictures: [{ wall: 'l', u: 3, motif: 'see' }, { wall: 'r', u: 3, motif: 'berg' }], clocks: [{ wall: 'l', u: 16, y: 3.4, r: 0.42 }],
    props: [{ kind: 'pflanze', x: -6, u: 1.4 }, { kind: 'pflanze', x: 6, u: 18.4 }] },
  { name: 'Hasenjagd', title: 'Hasenjagd: Fang beide Hasen – mit Schwung!', len: 30, h: 6, paper: 'k:wolken', wood: 0x5a9ad8, goal: 'collect', star: [0, 15, Y + 1.6],
    floors: [{ u0: -1, u1: 30, style: 'teppich' }], cam: { pitch: 48, dist: 18, c: 15, pull: 0.35 },
    pictures: [{ wall: 'l', u: 4, motif: 'pflaume' }, { wall: 'r', u: 4, motif: 'trampolin' }, { wall: 'l', u: 24, motif: 'kruemel' }], clocks: [{ wall: 'r', u: 24, y: 3.4, r: 0.42 }],
    props: [{ kind: 'pflanze', x: 6, u: 28.6 }, { kind: 'pflanze', x: -6, u: 28.6 }] },
  { name: 'Sprungfeld-Wurf', title: 'Sprungfeld-Wurf: Wirf von oben auf den hohen Schalter!', len: 22, h: 13, paper: 'sterne6', wood: 0x1e2a6a, star: [0, R18.sprung, Y + 5.6],
    floors: [{ u0: -1, u1: 22, style: 'uni', color: 0x2a3a7a }], cam: { pitch: 40, dist: 17, c: 9 },
    pictures: [{ wall: 'l', u: 3, y: 2.3, motif: 'trampolin' }, { wall: 'r', u: 3, y: 2.3, motif: 'berg' }], clocks: [{ wall: 'r', u: 18, y: 6, r: 0.45 }],
    props: [{ kind: 'lampe', x: -6, u: 1.2 }] },
  { name: 'Holzlabyrinth', title: 'Holzlabyrinth: Wart auf die Öffnung, dann hinein!', len: 20, h: 6, paper: 'dachboden', wood: 0x6a4422, star: [0, R19.c, Y + 0.25 + 0.25],
    floors: [{ u0: -1, u1: 20, style: 'holz' }], cam: { pitch: 58, dist: 17, c: R19.c },
    pictures: [{ wall: 'l', u: 3, motif: 'pflaume' }, { wall: 'r', u: 3, motif: 'kruemel' }], clocks: [{ wall: 'r', u: 17, y: 3.4, r: 0.42 }],
    props: [{ kind: 'truhe', x: -5.4, u: 1.8, yaw: 0.3 }] },
  { name: 'Schubser-Kessel', title: 'Schubser-Kessel: Stoß beide Schubser in die Lava!', len: 18, h: 6, paper: 'k:glut', wood: 0x4a1e16, goal: 'defeatAll', star: [0, 4, Y + 1.6],
    floors: [{ u0: -1, u1: R20.insel[2], style: 'terrakotta' }, { u0: R20.insel[2], u1: R20.insel[3], x0: R20.insel[0], x1: R20.insel[1], style: 'stein' }], cam: { pitch: 54, dist: 16, c: 9.5 },
    pictures: [{ wall: 'l', u: 3, motif: 'burg' }, { wall: 'r', u: 3, motif: 'baron' }], clocks: [{ wall: 'l', u: 15, y: 3.6, r: 0.42 }],
    props: [{ kind: 'eimer', x: 6, u: 1.6, color: 0x5ab8ff }] },
  { name: 'Riesen-?-Türme', title: 'Riesen-?-Türme: Stampf drauf – sie fahren dich hinauf!', len: 18, h: 21, paper: 'kanone', wood: 0xd8a83a, star: [R21.t3[0], R21.t3[1], R21.s2[4] + 2 + 2 * R21.t3n + 0.25],
    floors: [{ u0: -1, u1: 18, style: 'puzzle' }], cam: { pitch: 36, dist: 18, c: 9 },
    pictures: [{ wall: 'l', u: 3, motif: 'stern' }, { wall: 'r', u: 3, motif: 'zielfahne' }], clocks: [{ wall: 'l', u: 14, y: 9, r: 0.5 }],
    props: [{ kind: 'kiste', x: 6, u: 2, size: 0.9, color: 0xffd23d }] },
  { name: 'Himmelssteg', title: 'Himmelssteg: Über den schmalen Steg – Suchköpfe!', len: 40, h: 7, pit: true, paper: 'k:wolken', wood: 0x5a9ad8, star: [0, 37.4, Y + 0.25],
    floors: [{ u0: -1, u1: 4, style: 'stein' }, { u0: 34, u1: 40, style: 'stein' }], cam: { pitch: 42, dist: 14, follow: true },
    pictures: [{ wall: 'l', u: 2, y: 2.3, motif: 'berg' }, { wall: 'r', u: 2, y: 2.3, motif: 'zielfahne' }], clocks: [{ wall: 'l', u: 37, y: 3.4, r: 0.42 }],
    props: [{ kind: 'kiste', x: 5.6, u: 37.5, size: 1, color: 0x6a8ad8 }] },
  { name: 'Rankentreppe', title: 'Rankentreppe: Die Ranken sind deine Stufen!', len: 20, h: 11, pit: true, paper: 'k:garten', wood: 0x4a6a2a, star: [0, 18.4, R23.ledge[2] + 0.25],
    floors: [{ u0: -1, u1: 4, style: 'holz' }, { u0: R23.ledge[0], u1: 20, y: R23.ledge[2], style: 'holz' }], cam: { pitch: 40, dist: 17, c: 11 },
    pictures: [{ wall: 'l', u: 2.4, y: 2.3, motif: 'kaktus' }, { wall: 'r', u: 2.4, y: 2.3, motif: 'pilz' }], clocks: [{ wall: 'r', u: 18, y: 8.6, r: 0.42 }],
    props: [{ kind: 'pflanze', x: -5.6, u: 1.8, size: 1.2 }] },
  { name: 'Schalterfelder', title: 'Schalterfelder: Triff alle drei Scheiben mit Bällen!', len: 18, h: 7, paper: 'kirmes6', wood: 0xa8283a, star: [0, 4.6, R24.buehne + 0.25],
    floors: [{ u0: -1, u1: 18, style: 'kacheln' }], cam: { pitch: 40, dist: 16, c: 8.5 },
    pictures: [{ wall: 'l', u: 3, y: 2.6, motif: 'zielfahne' }, { wall: 'r', u: 3, y: 2.6, motif: 'stern' }], clocks: [{ wall: 'l', u: 15, y: 4, r: 0.42 }],
    props: [{ kind: 'trommel', x: -5.6, u: 1.6 }, { kind: 'trommel', x: 5.6, u: 1.6 }] },
  { name: 'Topfgarten', title: 'Topfgarten: Die Topf-Schnappblumen fressen die Wuschel!', len: 18, h: 6, paper: 'k:garten', wood: 0x5a8a2a, goal: 'defeatAll', star: [0, 9, Y + 1.6],
    floors: [{ u0: -1, u1: 18, style: 'teppich' }], cam: { pitch: 52, dist: 16.5, c: 9.5 },
    pictures: [{ wall: 'l', u: 4, motif: 'pilz' }, { wall: 'r', u: 4, motif: 'kaktus' }], clocks: [{ wall: 'r', u: 15, y: 3.6, r: 0.42 }],
    props: [{ kind: 'pflanze', x: -6, u: 16.4, size: 1.2 }, { kind: 'pflanze', x: 6, u: 16.4 }] },
  { name: 'Schnappkarussell', title: 'Schnappkarussell: Hinauf auf den Sockel in der Mitte!', len: 20, h: 6, paper: 'zirkus', wood: 0xd8283a, star: [0, R26.c, R26.sockel + 0.05],
    floors: [{ u0: -1, u1: 20, style: 'parkett' }], cam: { pitch: 54, dist: 17, c: R26.c },
    pictures: [{ wall: 'l', u: 3, motif: 'trampolin' }, { wall: 'r', u: 3, motif: 'stern' }], clocks: [{ wall: 'l', u: 17, y: 3.6, r: 0.42 }],
    props: [{ kind: 'pferd', x: 5.6, u: 1.6, yaw: -0.5 }] },
  { name: 'Scheinwerferschacht', title: 'Scheinwerferschacht: Schnell hinauf, bevor das Licht dich sieht!', len: 18, h: 11, paper: 'galerie', wood: 0x2a1a3a, star: [-3.8, 15.4, R27.leisten[2][4] + 0.25],
    floors: [{ u0: -1, u1: 18, style: 'stein' }], cam: { pitch: 38, dist: 17.5, c: 11 },
    pictures: [{ wall: 'l', u: 3, motif: 'burg' }, { wall: 'r', u: 3, motif: 'baron' }], clocks: [{ wall: 'r', u: 8, y: 3.6, r: 0.42 }],
    props: [{ kind: 'buste', x: -6, u: 1.6 }] },
  { name: 'Donutbrücke', title: 'Donutbrücke: Nicht stehen bleiben – Walzen!', len: 30, h: 7, pit: true, paper: 'backstube', wood: 0xd86aa8, star: [0, 27, Y + 0.25],
    floors: [{ u0: -1, u1: R28.bruecke[0], style: 'kacheln' }, { u0: R28.ende, u1: 30, style: 'kacheln' }], cam: { pitch: 42, dist: 14.5, follow: true },
    pictures: [{ wall: 'l', u: 3, y: 2.3, motif: 'kruemel' }, { wall: 'r', u: 3, y: 2.3, motif: 'pflaume' }], clocks: [{ wall: 'r', u: 27, y: 3.6, r: 0.42 }],
    props: [{ kind: 'mehl', x: -6, u: 1.4 }, { kind: 'brote', x: 5.6, u: 1.4, yaw: -PI / 2 }] },
  { name: 'Wirbelbrocken', title: 'Wirbelbrocken: Ein Treffer genügt – wenn er taumelt!', len: 20, h: 7, paper: 'theater6', wood: 0x6a1428, star: [0, 10, Y + 0.25],
    floors: [{ u0: -1, u1: 20, style: 'laeufer' }], cam: { pitch: 52, dist: 17, c: 10 },
    pictures: [{ wall: 'l', u: 4, motif: 'baron' }, { wall: 'r', u: 4, motif: 'burg' }], clocks: [{ wall: 'l', u: 16, y: 3.6, r: 0.42 }],
    props: [{ kind: 'trommel', x: -6, u: 1.4 }, { kind: 'trommel', x: 6, u: 1.4 }] },
  { name: 'Siegerflur', title: 'Siegerflur: Der letzte Stern – und der Stempel!', len: R30.len, h: 7, paper: 'k:krone', wood: 0xb8862a, star: [0, 27.5, Y + 0.25],
    floors: [{ u0: -1, u1: R30.len, style: 'parkett' }, { u0: -1, u1: 28.5, style: 'laeufer', x0: -1.4, x1: 1.4, y: Y + 0.006 }], cam: { pitch: 40, dist: 14, follow: true },
    pictures: [{ wall: 'l', u: 6, motif: 'lotti' }, { wall: 'r', u: 6, motif: 'greta' }, { wall: 'l', u: 14, motif: 'pflaume' }, { wall: 'r', u: 14, motif: 'kruemel' },
      { wall: 'l', u: 22, motif: 'stern' }, { wall: 'r', u: 22, motif: 'zielfahne' }],
    clocks: [{ wall: 'l', u: 26, y: 4.4, r: 0.45 }],
    props: [...[4, 10, 16, 22].flatMap((u) => [{ kind: 'buste', x: -5.6, u, yaw: PI / 2, color: 0xffd860 }, { kind: 'buste', x: 5.6, u, yaw: -PI / 2, color: 0xffd860 }])] },
].map((r, i) => ({ ...r, id: `r${i + 1}`, index: i }));
const TAPETE6 = { sterne6: 'sterne', kirmes6: 'kirmes', kugeln6: 'kugeln', theater6: 'theater' };
const KAPSEL = (i) => P(i, -5.4, 1.6, RAEUME[i].kapselY ?? Y);

// ====================================================================== Raum-Inhalte (Segmente, Gegner, Gegenstände)
const SEG = [], EN = [], IT = [], BL = [];
const room = (i) => RAEUME[i].id;

// --- 1 Panzerparade: drei Panzerkröten pendeln quer durch den Raum
[[8, -5, 5], [11, 5, -5], [14, -5, 5]].forEach(([u, a, b], k) => EN.push({ kind: 'panzerkroete', id: `k1_kroete${k + 1}`, roomId: room(0), pos: P(0, (a + b) / 2, u), path: [P(0, a, u), P(0, b, u)], speed: 1.4, wake: 40 }));

// --- 2 Schaukelsaal: Podeste, Schaukeln (setup), Walzenwerfer rollt Stachelwalzen quer übers Zielpodest
SEG.push(cliff(1, -7, 7, -1, 6, Y, 0x2a6a52), cliff(1, -7, 7, 31, 38, Y, 0x2a6a52));
EN.push({ kind: 'walzenwerfer', id: 'k2_werfer', roomId: room(1), pos: P(1, 6.0, R2.walze), pillar: 0.8, dir: [-1, 0], aim: 'dir', interval: 1.6, first: 0.6, speed: 4.2, walze: 0.8, max: 2, life: 4.5, wake: 40 });

// --- 3 Glutfelder: drei Druckfelder, zwei Lavabrocken auf festen Runden
R3.felder.forEach(([x, u], k) => IT.push({ kind: 'pfeld', id: `k3_feld${k + 1}`, roomId: room(2), pos: P(2, x, u, Y), size: [2, 2], need: 1, color: 'rot' }));
EN.push({ kind: 'lavabrocken', id: 'k3_brocken1', roomId: room(2), pos: P(2, -5, 9.8), path: [P(2, -5.5, 9.8), P(2, 5.5, 9.8)], behavior: 'walk', charge: false, speed: 1.7, sight: 0, wake: 40 });
EN.push({ kind: 'lavabrocken', id: 'k3_brocken2', roomId: room(2), pos: P(2, 5, 15.2), path: [P(2, 5.5, 15.2), P(2, -5.5, 15.2)], behavior: 'walk', charge: false, speed: 1.7, sight: 0, wake: 40 });

// --- 4 Fackelstube (Fackeln im setup)
// --- 5 Kreiselzimmer: Drehdiorama mit Schrank und Kommode, zwei gegenläufige Kreisgeist-Ringe
SEG.push({ type: 'drehdiorama', id: 'k5_dreh', pos: P(4, 0, R5.c, Y + 0.25), time: 1.0, disc: { radius: R5.disc, height: 0.25, color: 0x6a4a8a },
  parts: [{ pos: [0, 0, 0], size: [1.6, 3.0, 1.2], color: 0x8a5a2e, top: 0xc89a6a }, { pos: [R5.kommode, 0, 0], size: [1.4, 1.1, 1.2], color: 0x6a3a8a, top: 0xc8a8e8 }] });
EN.push({ kind: 'kreisgeist_kreis', id: 'k5_ring1', roomId: room(4), pos: P(4, 0, R5.c, Y + 0.3), count: 3, radius: 3.1, speed: 2.0, cw: true });
EN.push({ kind: 'kreisgeist_kreis', id: 'k5_ring2', roomId: room(4), pos: P(4, 0, R5.c, Y + 0.3), count: 4, radius: 4.7, speed: 2.2, cw: false, phase: 0.12 });

// --- 6 Kistenlager: vier Gruppen à 5 Kisten (3 unten, 2 oben); hinten rechts unten links steckt der Stern
R6.groups.forEach(([cx, u], g) => {
  [-1, 0, 1].forEach((dx, k) => IT.push({ kind: 'crate', id: g === 3 && k === 0 ? 'k6_sternkiste' : `k6_kiste${g}${k}`, roomId: room(5), pos: P(5, cx + dx, u, Y), size: 1, content: g === 3 && k === 0 ? 'none' : 'coin' }));
  [-0.5, 0.5].forEach((dx, k) => IT.push({ kind: 'crate', id: `k6_kiste${g}o${k}`, roomId: room(5), pos: P(5, cx + dx, u, Y + 1), size: 1, content: 'coin' }));
});

// --- 7 Pilzlingsschar: ein großer Pilzling, sechs Mini-Pilzlinge, POW-Block in der Mitte
EN.push({ kind: 'pilzling', id: 'k7_pilz', roomId: room(6), pos: P(6, 0, 13), behavior: 'chase', sight: 14, chaseSpeed: 1.6, wake: 40 });
[[-4.5, 9], [4.5, 9], [-5, 12.5], [5, 12.5], [-2.4, 14.6], [2.4, 14.6]].forEach(([x, u], k) => EN.push({ kind: 'pilzling', mini: true, id: `k7_mini${k + 1}`, roomId: room(6), pos: P(6, x, u), behavior: 'chase', sight: 14, chaseSpeed: 2.6, wake: 40 }));
IT.push({ kind: 'pow', id: 'k7_pow', roomId: room(6), pos: P(6, 0, 7.2), uses: 2, radius: 7.5, height: 3 });

// --- 8 Kullerhang: Balkon, Hang, Kraftfeld; drei Bälle, Flatterkäfer kreisen über dem Stern
SEG.push(cliff(7, -7, 7, -1, R8.rampe[0], R8.balkon, 0x3a6ab8));
SEG.push({ type: 'ramp', pos: [0, Y, zu(7, (R8.rampe[0] + R8.rampe[1]) / 2)], size: [W, R8.balkon - Y, R8.rampe[1] - R8.rampe[0]], axis: 'z', dir: 1, top: 'stone' });
SEG.push(floor(7, -7, 7, R8.rampe[1], 22, Y, 1.2, 0x5a8ad8));
[[-1.4, 3.2], [0, 3.6], [1.4, 3.2]].forEach(([x, u], k) => IT.push({ kind: 'wurfball', id: `k8_ball${k + 1}`, roomId: room(7), pos: P(7, x, u, R8.balkon), life: 3, respawn: 0.8, color: ['weiss', 'rot', 'gelb'][k] }));
const kaeferKreis = (i, c, r, y, n = 10) => Array.from({ length: n }, (_, k) => P(i, c[0] + Math.cos((k / n) * 2 * PI) * r, c[1] + Math.sin((k / n) * 2 * PI) * r, y));
EN.push({ kind: 'flatterkaefer', id: 'k8_kaefer', roomId: room(7), path: kaeferKreis(7, [0, R8.star], 1.8, Y + 1.7), loop: true, speed: 2.2, count: 3, spacing: 3.7, color: 'pink', wake: 40 });

// --- 9 Hackbeil-Hof: vier Hackbeil-Pilze, rechts der Federklotz unter dem hohen Stern
R9.pilze.forEach((x, k) => EN.push({ kind: 'hackbeil_pilz', id: `k9_hackbeil${k + 1}`, roomId: room(8), pos: P(8, x, 9.6), path: [P(8, x, 8.2), P(8, x, 11)], behavior: 'patrol', hop: 0.7, sight: 2.6, reach: 1.7, wake: 40 }));
EN.push({ kind: 'springklotz', id: 'k9_feder', roomId: room(8), pos: P(8, R9.feder[0], R9.feder[1]), strength: 18.5, hop: false, wake: 40 });

// --- 10 Stampfsteinfahrt: Startsteg, Landeplatte, Stampfstein, zwei unsichtbare Stege (setup), Zielsims
SEG.push(cliff(9, -2.4, 2.4, -1, R10.pad[1], Y, 0x4a5a6a), cliff(9, -7, 7, R10.ende[0], 24, R10.hoch, 0x4a5a6a));
EN.push({ kind: 'stampfstein', id: 'k10_stein', roomId: room(9), pos: P(9, 0, R10.stein, Y + 3.2), size: [2.4, 2, 2.4], fall: 3.2, trigger: 0.6, wait: 0.6, rise: 3.2 });

// --- 11 Eisrutsche: oberer Start, Eishang, Eisfläche mit Stachelstreifen
SEG.push(cliff(10, -7, 7, -1, R11.rampe[0], R11.oben, 0x7ab8e8));
SEG.push({ type: 'ramp', pos: [0, Y, zu(10, (R11.rampe[0] + R11.rampe[1]) / 2)], size: [W, R11.oben - Y, R11.rampe[1] - R11.rampe[0]], axis: 'z', dir: 1, top: 'stone', ice: true });
SEG.push({ type: 'eisbahn', pos: [0, Y - 0.3, zu(10, (R11.rampe[1] + 34) / 2)], size: [W, 0.3, 34 - R11.rampe[1]] });
R11.stachel.forEach((u) => SEG.push({ type: 'stachelboden', pos: [0, Y, zu(10, u)], size: [W, 0.25, 2.2] }));

// --- 12 Krallenschalter: zwei Kletterblöcke (setup), Druckfeld oben rechts
IT.push({ kind: 'pfeld', id: 'k12_schalter', roomId: room(11), pos: P(11, 5, 7.5, R12.top), size: [1.6, 1.6], need: 1, color: 'blau' });

// --- 13 Kanonenturm: drei Stufen, auf jeder eine Kanone, die quer über die nächste Stufe feuert
R13.tiers.forEach(([x0, x1, u0, top], k) => SEG.push(floor(12, x0, x1, u0, R13.back, top, top - Y + 0.2, [0x3a4a7a, 0x4a5a8a, 0x5a6a9a][k])));
EN.push({ kind: 'kanone_turm', id: 'k13_kanone1', roomId: room(12), pos: P(12, 6.2, 9.2, Y), dir: [-1, 0], height: 2.6, interval: 2.4, first: 0.8, range: 30, max: 2, speed: 6.5 });
EN.push({ kind: 'kanone_turm', id: 'k13_kanone2', roomId: room(12), pos: P(12, -6.2, 11.6, Y), dir: [1, 0], height: 4.8, interval: 2.4, first: 1.6, range: 30, max: 2, speed: 6.5 });
EN.push({ kind: 'kanone_turm', id: 'k13_kanone3', roomId: room(12), pos: P(12, 6.2, 14.0, Y), dir: [-1, 0], height: 7.0, interval: 2.4, first: 2.4, range: 30, max: 2, speed: 6.5 });

// --- 14 Piep-Treppe
SEG.push({ type: 'piep_treppe', id: 'k14_treppe', from: P(13, 0, R14.from + R14.run / 2, Y), dir: [0, -1], steps: R14.steps, rise: 1, run: R14.run, width: 3, colors: R14.colors, every: R14.every, warn: R14.warn });

// --- 15 Großblock-Fall: Start- und Zielpodest, vier große Fallblöcke
SEG.push(cliff(14, -7, 7, -1, 5, Y, 0xd8a83a), cliff(14, -7, 7, R15.ende, 30, Y, 0xd8a83a));
SEG.push({ type: 'fallblock_bruecke', id: 'k15_bloecke', blocks: R15.bloecke.map((u) => P(14, 0, u, Y - 1)), size: [3.2, 1, 3.2], mode: 'einzeln', warn: 0.5, respawn: 3, color: 'orange' });

// --- 16 Ringwand: Drehdiorama mit vierseitiger Mauer (Lücke vorn), zwei Wuschel kreisen außen
const H16 = R16.half, T16 = 0.5, M16 = 2.2;
SEG.push({ type: 'drehdiorama', id: 'k16_ring', pos: P(15, 0, R16.c, Y + 0.25), time: 1.0, disc: { radius: 4.6, height: 0.25, color: 0x3a8a4a },
  parts: [
    { pos: [-H16, 0, 0], size: [T16, M16, 2 * H16 + T16], color: 0xe8e0c8, top: 0xffd23d }, { pos: [H16, 0, 0], size: [T16, M16, 2 * H16 + T16], color: 0xe8e0c8, top: 0xffd23d },
    { pos: [0, 0, -H16], size: [2 * H16 - T16, M16, T16], color: 0xe8e0c8, top: 0xffd23d },
    { pos: [-(H16 + 0.9) / 2 - 0.2, 0, H16], size: [H16 - 1.1, M16, T16], color: 0xe8e0c8, top: 0xffd23d }, { pos: [(H16 + 0.9) / 2 + 0.2, 0, H16], size: [H16 - 1.1, M16, T16], color: 0xe8e0c8, top: 0xffd23d },
  ] });
EN.push({ kind: 'wuschel', id: 'k16_wuschel', roomId: room(15), center: P(15, 0, R16.c, Y + 0.6), radius: 5.2, speed: 2.4, count: 2, spacing: 16.3 });

// --- 17 Hasenjagd: Boost-Pfeile, zwei flinke Hasen
R17.boosts.forEach((u) => SEG.push({ type: 'boost', pos: P(16, 0, u, Y), dir: [0, -1], speed: 16, size: [2.4, 2.4] }));
[[-3, 18], [3.5, 24]].forEach(([x, u], k) => IT.push({ kind: 'bunny', id: `k17_hase${k + 1}`, roomId: room(16), pos: P(16, x, u), area: { min: [-6.4, zu(16, 29.4)], max: [6.4, zu(16, 9)] }, speed: 5.4, alert: 6, reward: { coins: 3 } }));

// --- 18 Sprungfeld-Wurf: Sprungfeld vor dem Kraftfeld, Turm mit Druckschalter dahinter
SEG.push({ type: 'trampoline', pos: P(17, 0, R18.sprung), strength: 17, size: 1.8 });
SEG.push(isl(-1.22, 1.22, zu(17, R18.turm - 1.22), zu(17, R18.turm + 1.22), R18.top, R18.top - Y, { top: 'none', under: 0, color: 0xe8323a }));
IT.push({ kind: 'wurfball', id: 'k18_ball', roomId: room(17), pos: P(17, R18.ball[0], R18.ball[1]), life: 1.5, respawn: 0.8 });
IT.push({ kind: 'wurfball', id: 'k18_ball2', roomId: room(17), pos: P(17, R18.ball[0] - 0.9, R18.ball[1] - 0.3), life: 1.5, respawn: 0.8, color: 'gelb' });
IT.push({ kind: 'pswitch', id: 'k18_schalter', roomId: room(17), pos: P(17, 0, R18.turm, R18.top), time: 8, coins: [P(17, 0, R18.sprung, Y + 2.2), P(17, 0, R18.sprung, Y + 3.2)], reward: { coins: 2 } });

// --- 19 Holzlabyrinth: Drehdiorama mit Irrgarten-Wänden (Eingang vorn), der Stern in der Mitte
const LAB = [
  // Außenmauer, Eingang vorn links (x −3,8 … −1,8)
  [-4, 0, 0.4, 8.4], [4, 0, 0.4, 8.4], [0, -4, 8.4, 0.4], [1.2, 4, 6.0, 0.4],
  // vorderer Gang nach rechts, mittlerer Gang (mit dem Stern) nach links, hinten eine Sackgasse
  [-0.9, 1.6, 5.8, 0.4], [0.9, -1.2, 5.8, 0.4],
];
SEG.push({ type: 'drehdiorama', id: 'k19_lab', pos: P(18, 0, R19.c, Y + 0.25), time: 1.0, disc: { radius: 6.2, height: 0.25, color: 0x8a5a2e },
  parts: LAB.map(([x, z, w, d]) => ({ pos: [x, 0, z], size: [w, 1.6, d], color: 0xb07a3e, top: 0xe8b070 })) });

// --- 20 Schubser-Kessel: Insel im Lavabecken
SEG.push({ type: 'lavaspiegel', id: 'k20_lava', mode: 'fest', pos: [0, Y - 3, zu(19, 11.75)], size: [W, 3 - 0.6, 13.5], low: R20.lava, color: 'rot' });
SEG.push(floor(19, -7, 7, -1, R20.insel[2], Y, 4), floor(19, R20.insel[0], R20.insel[1], R20.insel[2], R20.insel[3], Y, 4, 0x6a5a5a));
[[-3.4, 9.5, 1], [3.4, 12.5, -1]].forEach(([x, u, d], k) => EN.push({ kind: 'schubser', id: `k20_schubser${k + 1}`, roomId: room(19), pos: P(19, x, u), dir: [d, 0], behavior: 'guard', sight: 3.2, warn: 0.9, wake: 40 }));

// --- 21 Riesen-?-Türme: Turm 1 am Boden, Turm 2 und 3 auf Simsen
SEG.push(floor(20, R21.s1[0], R21.s1[1], R21.s1[2], R21.s1[3], R21.s1[4], R21.s1[4] - Y, 0x8a6a2a), floor(20, R21.s2[0], R21.s2[1], R21.s2[2], R21.s2[3], R21.s2[4], R21.s2[4] - Y, 0x9a7a3a));
IT.push({ kind: 'riesen_frageturm', id: 'k21_turm1', roomId: room(20), pos: P(20, R21.t1[0], R21.t1[1], Y), size: 2, blocks: 1, delay: 0.18, coins: 1, content: 'coins:2' });
IT.push({ kind: 'riesen_frageturm', id: 'k21_turm2', roomId: room(20), pos: P(20, R21.t2[0], R21.t2[1], R21.s1[4]), size: 2, blocks: 1, delay: 0.18, coins: 1, content: 'coins:2' });
IT.push({ kind: 'riesen_frageturm', id: 'k21_turm3', roomId: room(20), pos: P(20, R21.t3[0], R21.t3[1], R21.s2[4]), size: 2, blocks: R21.t3n, delay: 0.18, coins: 1, content: 'coins:3', color: 'orange' });

// --- 22 Himmelssteg: Startpodest, Steg 1,4 m, Kanonen auf Simsen links/rechts, Zielpodest
SEG.push(cliff(21, -7, 7, -1, R22.steg[0], Y, 0x5a7ab8), cliff(21, -7, 7, R22.steg[1], 40, Y, 0x5a7ab8));
SEG.push(isl(-0.8, 0.8, zu(21, R22.steg[0]), zu(21, R22.steg[1]), Y, 0.6, { top: 'none', under: 0, color: 0xe8e0d0 }));
SEG.push(cliff(21, 4.8, 7, R22.steg[0] + 2, R22.steg[1], Y + 1.2, 0x3a5a9a), cliff(21, -7, -4.8, R22.steg[0] + 2, R22.steg[1], Y + 1.2, 0x3a5a9a));
R22.kanonen.forEach((u, k) => EN.push({ kind: 'kanone_turm', id: `k22_kanone${k + 1}`, roomId: room(21), pos: P(21, (k % 2 ? 1 : -1) * 5.9, u, Y + 1.2), dir: [k % 2 ? -1 : 1, 0], height: 1.6, shot: 'suchkopf',
  interval: 2.6, first: 0.4 + k * 0.6, range: 24, max: 1, speed: 6, seek: 1.0, turn: 1.0 }));

// --- 23 Rankentreppe: Rankenschnapper wachsen aus dem Giftgraben als Stufen hinauf zum Sims
SEG.push(cliff(22, -7, 7, -1, 4, Y, 0x4a6a2a), cliff(22, -7, 7, R23.ledge[0], 20, R23.ledge[2], 0x4a6a2a));
SEG.push({ type: 'lavaspiegel', id: 'k23_gift', mode: 'fest', pos: [0, Y - 6, zu(22, 10.2)], size: [W, 4.2, 12.4], low: Y - 1.8, color: 'blau' });
R23.ranken.forEach(([x, u, h], k) => EN.push({ kind: 'rankenschnapper', id: `k23_ranke${k + 1}`, roomId: room(22), pos: P(22, x < 0 ? -6.6 : 6.6, u, Y - 1.8),
  path: [P(22, x < 0 ? -6.6 : 6.6, u, Y - 1.8), P(22, x < 0 ? -5 : 5, u, Y + h - 0.8), P(22, 0, u, Y + h - 0.3), P(22, x < 0 ? 3 : -3, u, Y + h - 0.4)],
  mode: 'static', reach: 1.2, sight: 4, size: 1.1 }));

// --- 24 Schalterfelder: Kraftfeld, drei Scheiben auf Pfosten, vier Bälle
SEG.push(cliff(23, -7, 7, -1, 6.6, R24.buehne, 0xa8283a));
R24.baelle.forEach(([x, u], k) => IT.push({ kind: 'wurfball', id: `k24_ball${k + 1}`, roomId: room(23), pos: P(23, x, u, R24.buehne), life: 1.6, respawn: 1, color: ['weiss', 'rot', 'gelb', 'weiss'][k] }));
SEG.push({ type: 'zielscheibe', group: 'k24', size: 1.3, stand: 0, targets: R24.ziele.map(([x, u, y], k) => ({ id: `k24_ziel${k + 1}`, pos: P(23, x, u, y), yaw: Math.atan2(-(zu(23, 3.6) - zu(23, u)), 0 - x) })) });
R24.ziele.forEach(([x, u, y]) => SEG.push(isl(x - 0.25, x + 0.25, zu(23, u + 0.1), zu(23, u + 0.6), y - 0.75, y - 0.75 - Y, { top: 'none', under: 0, color: 0xd8a83a })));

// --- 25 Topfgarten: drei Wuschel auf kleinen Runden, zwei Topf-Schnappblumen
[[-3.6, 10.5, 1.6], [3.6, 10.5, 1.6], [0, 14.4, 1.6]].forEach(([x, u, r], k) => EN.push({ kind: 'wuschel', id: `k25_wuschel${k + 1}`, roomId: room(24), center: P(24, x, u, Y + 0.25), radius: r, speed: 1.6, cw: k % 2 === 1, phase: k * 0.3 }));
[[-1.4, 4.6], [1.4, 4.6]].forEach(([x, u], k) => IT.push({ kind: 'topfpflanze', id: `k25_topf${k + 1}`, roomId: room(24), pos: P(24, x, u), reach: 1.9, pause: 0.3 }));

// --- 26 Schnappkarussell: Drehteller (setup) mit vier Schnappblumen, Sockel in der Mitte
[0, 1, 2, 3].forEach((k) => { const a = (k / 4) * 2 * PI + PI / 4; EN.push({ kind: 'schnappblume', id: `k26_blume${k + 1}`, roomId: room(25), pos: P(25, Math.cos(a) * 3.2, R26.c + Math.sin(a) * 3.2, R26.top), base: 'pot', range: 2.6, pause: 0.6, wake: 40 }); });

// --- 27 Scheinwerferschacht: Simse im Zickzack, Suchscheinwerfer, Alarm ruft Suchköpfe
R27.leisten.forEach(([x0, x1, u0, u1, top], k) => SEG.push(floor(26, x0, x1, u0, u1, top, top - Y, [0x4a3a5a, 0x5a4a6a, 0x6a5a7a][k])));
SEG.push({ type: 'suchscheinwerfer', id: 'k27_licht', path: [P(26, -5.4, 6.2, Y), P(26, -3.6, 10.5, Y + 2.2), P(26, 3.6, 12.5, Y + 4.4), P(26, 5.4, 6.2, Y)], speed: 4.2, radius: 1.8,
  mode: 'loop', wait: 0.2, lamp: P(26, 0, 4, Y + 11), post: false, cooldown: 2.5, alarmTime: 1.5, banner: 'Entdeckt!',
  onDetect: { spawn: { kind: 'suchkopf', pos: P(26, 6.4, 6, Y + 6), dir: [-1, 0], speed: 5.5, seek: 2.2, turn: 2.0, life: 6 } } });

// --- 28 Donutbrücke: Donut-Blöcke (zwei breit), zwei Walzenwerfer am Ende
SEG.push(cliff(27, -7, 7, -1, R28.bruecke[0], Y, 0xd86aa8), cliff(27, -7, 7, R28.ende, 30, Y, 0xd86aa8));
SEG.push({ type: 'donutblock', id: 'k28_donuts', from: P(27, 0, R28.bruecke[0] + 0.5, Y - 1), to: P(27, 0, R28.mitte[0] - 0.5, Y - 1), delay: 0.5, respawn: 2.5, color: 'gelb' });
SEG.push({ type: 'donutblock', id: 'k28_donuts2', from: P(27, 0, R28.mitte[1] + 0.5, Y - 1), to: P(27, 0, R28.bruecke[1] - 0.5, Y - 1), delay: 0.5, respawn: 2.5, color: 'rosa' });
SEG.push(cliff(27, -1.6, 1.6, R28.mitte[0], R28.mitte[1], Y, 0xd86aa8));
[-1.2, 1.2].forEach((x, k) => EN.push({ kind: 'walzenwerfer', id: `k28_werfer${k + 1}`, roomId: room(27), pos: P(27, x * 3.4, 28.8), pillar: 0.6, dir: [0, 1], aim: 'dir', interval: 2.6, first: 1.0 + k * 1.3, speed: 4.0, walze: 0.75, max: 2, life: 7, wake: 40 }));

// --- 29 Wirbelbrocken: ein Treffer genügt
// kurzer Auftritt und Anlauf (sonst taumelt er erst nach gut 6 s – zu knapp für 10 s Raumzeit)
EN.push({ kind: 'wirbelbrocken', id: 'k29_wirbel', roomId: room(28), pos: P(28, 0, 11.5), arena: { center: P(28, 0, 10), r: 6 }, hp: 1, wakeR: 14, intro: 1.4, tempo: { runT: 0.8 } });

// --- 30 Siegerflur: Münzweg, Stempel, Stern; Geheimnis: unsichtbarer Block mit Extraleben über dem Läufer, Münzblock daneben
IT.push(line(P(29, 0, 4, Y + 0.6), P(29, 0, 25, Y + 0.6), 15));
BL.push({ kind: 'hidden', pos: P(29, 0, 11, Y + 2.6), content: 'oneup' }, { kind: 'coinblock', pos: P(29, -2.2, 15, Y + 2.6), count: 6 });

// ====================================================================== Level-Haken
function setup(level) {
  const shared = { pos: [], uv: [] }, clocks = [];
  RAEUME.forEach((r, i) => {
    const own = r.paper.startsWith('k:') ? r.paper.slice(2) : null;
    hausRaum(level, { ...r, index: i, z0: Z0(i), paper: TAPETE6[r.paper] || own ? 'eigene' : r.paper }, shared, clocks);
    if (TAPETE6[r.paper]) tapete(level, { id: r.id, z0: Z0(i), len: r.len, h: r.h }, TAPETE6[r.paper]);
    if (own) tapeteK(level, { id: r.id, z0: Z0(i), len: r.len, h: r.h }, own);
  });
  const uhren = hausFertig(level, shared, clocks);
  if (uhren) level.named.set('haus_uhren', uhren);
  level.world.forEach((s) => { if (s.tag === 'hauswand') s.noWallSlide = true; });
  level.named.set('kapseln', kraftKapsel(level, RAEUME.map((r, i) => ({ pos: KAPSEL(i), ...(r.kapsel ?? {}) }))));
  const deco = [];

  // 2 Schaukelsaal
  schaukeln(level, R2.swings.map((u, k) => ({ id: `k2_schaukel${k + 1}`, pos: [0, Y + 5.7, zu(1, u)], rope: 5.2, w: 2.6, d: 1.8, amp: 0.4, period: 2.2, phase: k % 2 ? 0.5 : 0 })));   // 2,2 s: Anschluss an die nächste Schaukel öfter (10 s Raumzeit)
  for (const u of R2.swings) deco.push(blk(W, 0.4, 0.4, 0, Y + 5.7, zu(1, u), 0x6a3a1a));
  // 4 Fackelstube
  moorfackeln(level, { k4: { list: R4.fackeln.map(([x, u]) => P(3, x, u)), onAll: null } }, { id: 'k4_fackeln', lights: 2 });
  // 8 Kullerhang: Kraftfeld vor dem Hang, Kullerrinne
  kraftfeld(level, { x0: -7, x1: 7, z: zu(7, R8.kraft), y0: R8.balkon, y1: Y + 8.6, label: 'NUR BÄLLE!' });
  kullerRinne(level, { x0: -6.5, x1: 6.5, z0: zu(7, R8.rampe[0] - 0.5), z1: zu(7, 21), dir: -1, accel: 5, vmax: 8, center: 0.4,
    top: (z) => { const u = Z0(7) - z; return u < R8.rampe[0] ? R8.balkon : u > R8.rampe[1] ? Y : R8.balkon - ((u - R8.rampe[0]) / (R8.rampe[1] - R8.rampe[0])) * (R8.balkon - Y); } });
  // 10 Stampfsteinfahrt: unsichtbare Stege
  R10.wolken.forEach(([u, d], k) => unsichtbareWolke(level, { id: `k10_steg${k + 1}`, pos: P(9, 0, u, R10.hoch - 0.6), size: [2.6, 0.6, d] }));
  // 12 Krallenschalter: zwei Kletterblöcke
  for (const [x0, x1] of [R12.rechts, R12.links]) kraxelBlock(level, { x0, x1, zA: zu(11, R12.u[0]), zB: zu(11, R12.u[1]), y0: Y, y1: R12.top, look: 'bauklotz', climb: true });
  // 18 Sprungfeld-Wurf: Kraftfeld vor dem Turm
  kraftfeld(level, { x0: -7, x1: 7, z: zu(17, R18.sprung + 2.4), y0: Y, y1: Y + 12, label: 'NUR BÄLLE!' });
  // 24 Schalterfelder: Kraftfeld
  kraftfeld(level, { x0: -7, x1: 7, z: zu(23, R24.kraft), y0: Y, y1: Y + 6, label: 'NUR BÄLLE!' });
  // 26 Schnappkarussell: Drehteller und Sockel
  drehteller(level, { id: 'k26_teller', pos: [0, zu(25, R26.c)], r: R26.r, top: R26.top, speed: 0.55, riders: [0, 1, 2, 3].map((k) => `k26_blume${k + 1}`) });
  level.world.add({ type: 'cyl', x: 0, z: zu(25, R26.c), r: 0.8, y0: Y, y1: R26.sockel, tag: 'k26_sockel' });
  deco.push(cyl(0.8, 0.9, R26.sockel - Y, 0, Y, zu(25, R26.c), 0xffc83a, 18), cyl(0.85, 0.85, 0.1, 0, R26.sockel - 0.1, zu(25, R26.c), 0xd8283a, 18));
  // 30 Siegerflur: Goldsäulen und Krone über dem Ausgang
  for (const u of [8, 14, 20, 26]) for (const sx of [-1, 1]) deco.push(cyl(0.22, 0.26, 4.2, sx * 3.2, Y, zu(29, u), 0xffd860, 12), sph(0.32, sx * 3.2, Y + 4.4, zu(29, u), 0xffc83a));
  // 9 Hackbeil-Hof: Leuchtpfeil über dem Federklotz zeigt zum hohen Stern
  for (let k = 0; k < 2; k++) deco.push(blk(0.18, 0.7, 0.18, R9.feder[0] + 0.9, Y + 1.8 + k * 1.3, zu(8, R9.feder[1]), 0xffd23d), cyl(0.0, 0.32, 0.4, R9.feder[0] + 0.9, Y + 2.5 + k * 1.3, zu(8, R9.feder[1]), 0xffd23d, 8));
  // Wimpelketten und Girlanden quer durch viele Räume (bunt, je Raum eigene Farben)
  const WIMPEL = [[0, 8, 4.4], [2, 9, 4.4], [3, 9, 5.4], [5, 9, 4.4], [6, 8, 4.4], [8, 6, 9.4], [11, 4, 8.4], [12, 4, 11.4], [14, 3, 7.4], [16, 10, 5.4], [16, 22, 5.4],
    [19, 4, 5.4], [23, 4, 6.4], [24, 13, 5.4], [25, 3, 5.4], [28, 6, 6.4], [28, 15, 6.4], [29, 6, 6.4], [29, 14, 6.4], [29, 22, 6.4]];
  const FARBEN = [[0xff5a5a, 0xffd23d, 0x4aa8ff], [0xd8283a, 0xffffff, 0xffc21a], [0x5ac85a, 0xffd23d, 0xff6a8a], [0xc87aff, 0x7ad8ff, 0xffffff], [0xffc83a, 0xd8283a, 0xffc83a]];
  wimpel(level, WIMPEL.map(([i, u, y], k) => ({ z: zu(i, u), y: Y + y, sag: 0.7, colors: FARBEN[i === 29 ? 4 : k % 4] })));
  bakeParts(level, deco, { castShadow: false });

  // Sterne nach Bedingung
  const named = (id) => level.named.get(id) ?? level.entities.find((e) => e.spec?.id === id && !e.removed);
  const felderAn = (ids) => ids.every((id) => { const f = named(id); return f && (f.done || f.fired || f.state === 'done' || f.triggered); });
  versteckteSterne(level, [
    { index: 2, cond: () => [1, 2, 3].every((k) => level.entities.some((e) => e.kind === 'pfeld' && e.spec?.id === `k3_feld${k}` && !e.removed && (e.done || e.fired))) },
    { index: 3, cond: () => !!level.named.get('k4_fackeln')?.groups?.k4?.done },
    { index: 5, cond: () => !level.entities.some((e) => e.kind === 'crate' && e.spec?.id === 'k6_sternkiste' && !e.removed && !e.broken) },
    { index: 11, cond: () => felderAn(['k12_schalter']) },
    { index: 17, cond: () => { const s = named('k18_schalter'); return !!s && (s.state === 'active' || s.state === 'done'); } },
    { index: 23, cond: () => !!level.targets?.k24?.done },
    { index: 28, cond: () => { const b = named('k29_wirbel'); return !!b && (b.hp <= 0 || ['defeated', 'flee', 'gone'].includes(b.state)); }, pos: P(28, 0, 10, Y + 0.25) },
  ]);

  // Raum-Ereignisse
  raumHaken(level, {
    play(i) {
      const p = level.player;
      if (i !== 10 && p?.skate) leaveSkate(p, 'off');
      if (i === 1) frischeWalzen(level, ['k2_werfer'], [0.6], [Z0(1), zu(1, 40)]);
      if (i === 10 && p && !p.skate) p.collectPowerup('schlittschuh');
      if (i === 27) frischeWalzen(level, ['k28_werfer1', 'k28_werfer2'], [1.0, 2.3], [Z0(27), zu(27, 32)]);
      if (i === 21) {
        // Himmelssteg: alte Suchköpfe weg, die Kanonen laden gestaffelt (die Köpfe kreuzen den Steg, wenn man vorbeikommt)
        for (const e of level.entities) if (e.kind === 'suchkopf' && !e.removed && e.pos.z < Z0(21) + 2 && e.pos.z > zu(21, 42)) e.kill();
        R22.kanonen.forEach((u, k) => { const kn = level.entities.find((e) => e.spec?.id === `k22_kanone${k + 1}` && !e.removed); if (kn) { kn.heads = []; kn.setState?.('idle'); kn.cool = R22.takt[k]; } });
      }
      // Drehdioramen beginnen in Grundstellung
      for (const id of ['k5_dreh', 'k16_ring', 'k19_lab']) { const d = level.named.get(id); if (d) d.t0 = level.time; }
    },
  });
  // Drehdioramen drehen sich im Takt (Vierteldrehung je takt s, nur im laufenden Raum)
  const TAKT = { k5_dreh: [4, 2.6], k16_ring: [15, 2.4], k19_lab: [18, 2.8] };
  level.onStep(() => {
    const h = level.house;
    if (!h || h.phase !== 'play') return;
    for (const [id, [ri, takt]] of Object.entries(TAKT)) {
      if (h.room !== ri) continue;
      const d = level.named.get(id);
      if (!d || d.turning) continue;
      if (level.time - (d.t0 ?? 0) >= takt) { d.t0 = level.time; d.toggle(); }
    }
  });
  nurRaumSicht(level, RAEUME.map((r, i) => [-W / 2 - 0.5, Y - 3, zu(i, r.len) - 0.6, W / 2 + 0.5, Y + r.h, Z0(i) + 1.5]));
  teileInstanzen(level, ['panzerkroete', 'pilzling', 'lavabrocken', 'hackbeil_pilz', 'kanone_turm', 'walzenwerfer', 'schubser', 'rankenschnapper', 'schnappblume', 'stachelwalze', 'suchkopf'], { name: 'haus', near: 44 });
  heroShadowDiet(level, 0.12);
  farHide(level, ['star', 'powerup', 'coin', 'wurfball', 'crate', 'pfeld', 'pow', 'bunny', 'topfpflanze', 'zielscheibe', 'pswitch', 'riesen_frageturm', 'stachelwalze', 'suchkopf', 'projektilkopf'], 46);
}

// ====================================================================== Level-Daten
const area = (i) => ({ min: [-W / 2 - 0.5, Y - 9, zu(i, RAEUME[i].len) - 0.5], max: [W / 2 + 0.5, Y + 18, Z0(i) + 1.5] });
const cam = (i) => {
  const c = RAEUME[i].cam ?? {};
  if (c.follow) return { pitch: c.pitch ?? 41, dist: c.dist ?? 13.5, yaw: 0, fov: 44, x: 0, xLock: 0.6, ahead: 3.2, height: 1.0 };
  return { pitch: c.pitch ?? 50, dist: c.dist ?? 17, yaw: 0, fov: 44, x: 0, xLock: 0.6, ahead: 0, height: 1, center: P(i, 0, c.c ?? RAEUME[i].len / 2, Y), pull: c.pull ?? 0.55 };
};
const STARTS = RAEUME.map((r, i) => ({ pos: P(i, 0, 2.4, r.startY ?? (i === 7 ? R8.balkon : i === 10 ? R11.oben : i === 23 ? R24.buehne : Y)), yaw: PI / 2 }));

export const LEVEL = {
  id: 'K-Haus',
  world: 12,
  title: 'Haus Marathon',
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
    rooms: RAEUME.map((r, i) => ({ id: r.id, goal: r.goal ?? 'reach', area: area(i), start: STARTS[i], camera: cam(i), star: P(i, r.star[0], r.star[1], r.star[2]), time: 10, title: r.title })),
  },
  segments: [
    ...RAEUME.map((r, i) => (r.pit ? null : floor(i, -7, 7, -1, r.len, Y, 1.2, r.wood))).filter((s, i) => s && ![7, 10, 19].includes(i)),
    ...SEG,
  ],
  blocks: BL,
  enemies: EN,
  items: IT,
  stamp: P(29, 0, 18.5, Y + 0.1),
  marks: Object.fromEntries(STARTS.map((s, i) => [`r${i + 1}`, s.pos])),
  // Daten für Tests/Bots
  _haus: { Z0: RAEUME.map((r, i) => Z0(i)), len: RAEUME.map((r) => r.len), names: RAEUME.map((r) => r.name), Y, SP, R2, R3, R4, R5, R6, R8, R9, R10, R11, R12, R13, R14, R15, R16, R17, R18, R19, R20, R21, R22, R23, R24, R26, R27, R28 },
};
