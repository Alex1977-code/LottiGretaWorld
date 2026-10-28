// 6-3 „Schiebetüren im Kirschblütensaal“ – Parcours (Puzzle) der Wolkeninseln (Bauplan Welt 6, Detail 6-3: „Korridor
// (ca. 20 m): Schiebetüren antippen, Röhre → Dreistöckiger Saal (ca. 50 × 15 m): Pilzlinge, Rollpilze, Stachelwerfer; Gong
// im 3. Stock lässt Münzen regnen → Tempelaußenseite (ca. 70 m) per Warp-Box: Checkpoint, Propeller-Helme, Stampfsteine,
// 8 m Lücke → Oberstes Dach: Zielmast; optionaler Gong-Bereich: 5 Schlüsselmünzen auf dem Dach öffnen eine Warp-Box“).
// Thema fareast (rosiger Morgen, Laternental, fallende Kirschblüten), Musik course_fareast, 400 s, frei ab 110 Sternen.
// Eigene Fantasie-Gestaltung: Papierwände mit Holzgittern, rot lackierte Pfosten, geschwungene Dächer – keine realen
// religiösen Symbole.
//
// Abschnitte (+X = rechts im Bild):
//   1  Hof und Korridor     z  12 …  −28   drei Schiebetüren quer über den Gang (antippen bzw. Aktionstaste), links eine
//                                          Tür vor einer bemalten Wand (Münzen), rechts die Maskennische (Pilz-Maske);
//                                          am Ende die rote Röhre in den Saal
//   2  Kirschblütensaal     z −29 …  −54   drei Stockwerke im Querschnitt (vorn offen, Decken werden durchsichtig, wenn sie
//                                          die Figur verdecken): Erdgeschoss nach rechts (Pilzling, Rollpilz, Krallen-
//                                          Pilzling), Treppe, 1. Stock nach links (zwei Stachelwerfer, Pilzling), Treppe,
//                                          2. Stock nach rechts (Türenreihe mit zwei Scheinwänden → Stern 0, Gong: Münzregen
//                                          und Rätselbox → Stachelwerfer-Käfig → Stern 2), Warp-Box zur Tempelaußenseite
//   3  Tempelaußenseite     z −68 … −128   Ankunftsterrasse (Checkpoint), Dachfirst mit drei Stampfsteinen, Helm-Station
//                                          (Propeller-Helme), 8-m-Lücke (Stern 1 hoch darüber), mittleres Dach mit Wolke
//                                          (Stempel)
//   4  Oberstes Dach        z −128 … −148  zwei Dachstufen hinauf zum Zielmast; fünf Schlüsselmünzen auf den Dächern öffnen
//                                          die Warp-Box in den Gong-Garten (Nebenbereich, x ≈ 100: fünf Gongs, goldener Gong
//                                          → Extraleben)
// Pilz-Maske: Gegner, denen die Figur zugewandt ist, sehen sie nicht (Stachelwerfer werfen nicht, Krallen-Pilzlinge springen
// nicht, Pilzlinge jagen nicht) – Maskennische im Korridor und Maskensockel am Saaleingang. Auf der Tempelaußenseite bleibt
// die Maske im Saal (sie fällt beim Warp ab), damit die Propeller-Helme passen.
// Gegner: Pilzling 3, Rollpilz 2, Krallen-Pilzling 2, Stachelwerfer 3 (einer im Käfig), Stampfstein 3.
// Extraleben: ?-Block in der Nische des 1. Stocks, goldener Gong im Gong-Garten.

import * as THREE from 'three';
import {
  isl, line, ring, arc, sign, doorWall, nische, saalDecke, treppe, scheinwand, saalZier, glimmer, Bld, litTop, daecher, laternen, zier,
} from './_helpers_b.js';
import { schattenDiaet } from '../w5/_helpers_a.js';

const PI = Math.PI;
const Y0 = 1;                    // Hof, Korridor, Erdgeschoss
const F = [1, 6, 11];            // Böden der Stockwerke
const ZF = -41.5, ZB = -50.5;    // Saal: Vorderkante der Decken, Innenseite der Rückwand
const XL = -25, XR = 25;         // Saal innen
const ST = 17.6;                 // Treppenhäuser: rechts x 17,6 … 25 (EG → 1. St.), links x −25 … −17,6 (1. → 2. St.)
const PZ = -44.5;                // Laufweg im Saal (z)
const YE = 12;                   // Tempelaußenseite
const RX = 100;                  // Nebenbereiche (Käfig der Rätselbox, Gong-Garten)

// ---------------------------------------------------------------- Maße (auch für den Test)
export const M63 = {
  Y0, F, ZF, ZB, XL, XR, ST, PZ, YE, RX,
  TUEREN: [-7, -14, -21],                                       // Schiebetüren quer über den Korridor (z)
  ROHR: [0, Y0, -25.5], SAALROHR: [-22.5, Y0, -44.2],
  MASKE_KORRIDOR: [4.9, Y0, -17.5], MASKE_SAAL: [-19.5, Y0, -43.4],
  TREPPE1: { x0: 24.8, z0: -47, z1: -50.5 }, TREPPE2: { x0: -24.8, z0: -47, z1: -50.5 },
  DOORS: { 0: [-8, 8], 1: [10, -8], 2: [-6, 6, 12] },          // Türen in den Rückwänden je Stockwerk (x)
  SCHEIN: [[6, -51.6], [6, -52.6]],                             // zwei Scheinwände hinter Tür 2c
  STERN0: [6, F[2] + 0.9, -53.5],
  GONG: [23.2, F[2], -44.5], RAETSEL: [16.5, F[2], -48.4], AUSSEN: [23.4, F[2], -48.6],
  ANKUNFT: [0, YE + 0.3, -73],
  STEINE: [[-1.7, -87], [1.7, -93], [-1.7, -99]],          // Stampfsteine über dem Dachfirst (abwechselnd links/rechts)
  HELME: [[-3, YE, -105], [3, YE, -105]],
  LUECKE: [-110, -118],
  STERN1: [0, YE + 7.4, -114],
  WOLKE: [-4.4, YE + 6.8, -123], STAMP: [-4.4, YE + 8.1, -123],
  DACH: { l1: YE + 2.6, l2: YE + 5.2, top: YE + 7.8 },
  KAEFIG: { x: RX, y: F[2], z: -44 },
  GARTEN: { x: RX, y: 0, z: -112 },
};
const { DOORS } = M63;

/** Stockwerk-Rückwand mit Türen: Kollision, Papierwand, Schiebetüren davor. */
function rueckwand(level, b, k) {
  const y0 = F[k], y1 = k < 2 ? F[k + 1] : F[2] + 4.6;
  doorWall(level, b, { axis: 'x', a0: XL, a1: XR, c: ZB - 0.3, d: 0.6, y0, y1, doors: DOORS[k], dw: 2.9, dh: 3.2, face: 1 });
}

/** Schiebetür in einer Rückwand (Vorderseite zur Kamera). */
const tuer = (id, x, y, z, o = {}) => ({ type: 'schiebetuer', id, pos: [x, y, z], width: 2.4, height: 3, yaw: -PI / 2, slide: 'beide', ...o });

/** Aufbau-Haken (vor dem Verschmelzen): Korridor, Saal, Treppen, Nischen, Scheinwände, Tempel, Käfig, Garten. */
function build(level) {
  const b0 = new Bld();
  const b = b0;
  // ---------------- Korridor: Seitenwände mit zwei Türöffnungen, Querwände mit Mitteltür, Abschlusswand
  doorWall(level, b, { axis: 'z', a0: -28.6, a1: -2, c: -3.3, d: 0.6, y0: Y0, y1: Y0 + 3.4, doors: [-10.5], dw: 2.9, dh: 3.2, face: 1 });
  doorWall(level, b, { axis: 'z', a0: -28.6, a1: -2, c: 3.3, d: 0.6, y0: Y0, y1: Y0 + 3.4, doors: [-17.5], dw: 2.9, dh: 3.2, face: -1 });
  for (const z of M63.TUEREN) doorWall(level, b, { axis: 'x', a0: -3, a1: 3, c: z, d: 0.4, y0: Y0, y1: Y0 + 3.4, doors: [0], dw: 2.9, dh: 3.2, face: 1 });
  doorWall(level, b, { axis: 'x', a0: -3.6, a1: 3.6, c: -28.3, d: 0.6, y0: Y0, y1: Y0 + 3.4, doors: [], face: 1 });
  // unsichtbar über den Korridorwänden (bis 8 m): kein Sprung über Wände und Türen – die Kamera sieht hindurch
  const inv = (x0, x1, z0, z1, y0 = Y0 + 3.4, y1 = Y0 + 8) => level.world.add({ type: 'box', min: [x0, y0, z0], max: [x1, y1, z1], camIgnore: true, noWallSlide: true, tag: 'korridor-dach' });
  inv(-3.6, -3.0, -28.6, -2); inv(3.0, 3.6, -28.6, -2); inv(-3.6, 3.6, -28.6, -28.0);
  for (const z of M63.TUEREN) inv(-3, 3, z - 0.2, z + 0.2, Y0 + 3.0);
  inv(-3.6, -3.0, -11.95, -9.05, Y0 + 3.0); inv(3.0, 3.6, -18.95, -16.05, Y0 + 3.0);
  inv(3.6, 6.5, -19.3, -15.7, Y0 + 3.4);
  // Maskennische rechts (x 3,6 … 6,2): Boden kommt aus der Insel, Wände hier
  doorWall(level, b, { axis: 'x', a0: 3.6, a1: 6.5, c: -15.85, d: 0.3, y0: Y0, y1: Y0 + 3.4, doors: [], face: -1, tag: 'nische', color: 0xf6dcc8 });
  doorWall(level, b, { axis: 'x', a0: 3.6, a1: 6.5, c: -19.15, d: 0.3, y0: Y0, y1: Y0 + 3.4, doors: [], face: 1, tag: 'nische', color: 0xf6dcc8 });
  doorWall(level, b, { axis: 'z', a0: -19.3, a1: -15.7, c: 6.35, d: 0.3, y0: Y0, y1: Y0 + 3.4, doors: [], face: -1, tag: 'nische', color: 0xf6dcc8 });
  b0.box(2.5, 0.05, 3.0, 4.95, Y0, -17.5, litTop(0xc8323a, 0.85), { r: 0 });   // roter Teppich in der Nische
  b0.box(1.1, 0.5, 1.1, M63.MASKE_KORRIDOR[0], Y0, M63.MASKE_KORRIDOR[2], litTop(0x9a2a24, 0.7), { r: 0.06 });
  // ---------------- Saal: Rückwände mit Türen, Seitenwände, Decken (Durchsicht), Brüstungen, Treppen, Nischen
  for (let k = 0; k < 3; k++) rueckwand(level, b, k);
  for (const x of [XL - 0.3, XR + 0.3]) level.world.add({ type: 'box', min: [x - 0.3, Y0, ZB - 0.6], max: [x + 0.3, F[2] + 4.6, ZF + 0.6], tag: 'saalwand' });
  saalDecke(level, { x0: XL, x1: ST, z0: ZF, z1: ZB, y: F[1], lower: F[0] });
  saalDecke(level, { x0: -ST, x1: XR, z0: ZF, z1: ZB, y: F[2], lower: F[1] });
  // Treppenhaus-Kanten: Geländer an der offenen Deckenkante (damit man nicht aus Versehen hinunterfällt)
  level.world.add({ type: 'box', min: [ST - 0.3, F[1], ZF], max: [ST, F[1] + 1.0, -47.2], camIgnore: true, tag: 'bruestung' });
  for (let z = ZF - 0.1; z >= -47.2; z -= 1.14) b0.box(0.12, 0.98, 0.12, ST - 0.15, F[1], z, litTop(0xd8443a, 0.7), { r: 0 });
  b0.box(0.16, 0.12, 5.7, ST - 0.15, F[1] + 0.86, (ZF - 47.2) / 2, litTop(0xd8443a, 0.7), { r: 0 });
  treppe(level, b, { x0: M63.TREPPE1.x0, dir: -1, n: 17, run: 0.42, y0: F[0], y1: F[1], z0: M63.TREPPE1.z0, z1: M63.TREPPE1.z1 });
  treppe(level, b, { x0: M63.TREPPE2.x0, dir: 1, n: 17, run: 0.42, y0: F[1], y1: F[2], z0: M63.TREPPE2.z0, z1: M63.TREPPE2.z1 });
  // Nischen hinter den „freien“ Türen
  nische(level, b, { x: -8, y: F[0], z: ZB - 0.6, w: 2.6, depth: 1.6, h: 3.2 });
  nische(level, b, { x: 10, y: F[1], z: ZB - 0.6, w: 2.6, depth: 1.6, h: 3.2 });
  nische(level, b, { x: -6, y: F[2], z: ZB - 0.6, w: 2.6, depth: 1.6, h: 3.2 });
  nische(level, b, { x: 6, y: F[2], z: ZB - 0.6, w: 2.6, depth: 3.0, h: 3.2 });
  // zwei Scheinwände hintereinander hinter Tür 2c – erst die zweite gibt den Stern frei
  scheinwand(level, { id: 'schein1', x: M63.SCHEIN[0][0], y: F[2], z: M63.SCHEIN[0][1], w: 2.5, h: 3.2, seed: 3, onOpen: { coins: 2 } });
  scheinwand(level, { id: 'schein2', x: M63.SCHEIN[1][0], y: F[2], z: M63.SCHEIN[1][1], w: 2.5, h: 3.2, seed: 8 });
  // Sockel für Maske, Gong-Podest
  b0.box(1.1, 0.4, 1.1, M63.MASKE_SAAL[0], F[0], M63.MASKE_SAAL[2], litTop(0x9a2a24, 0.7), { r: 0.06 });
  saalZier(level, { x0: XL, x1: XR, zF: ZF, zB: ZB, floors: F, roof: F[2] + 4.6, paintings: [[-16, F[0] + 1.6], [0, F[0] + 1.6], [16, F[0] + 1.6], [-14, F[1] + 1.6], [2, F[1] + 1.6], [-14, F[2] + 1.6], [18, F[2] + 1.6]] });
  // ---------------- Käfig der Rätselbox (Nebenbereich): Wände ringsum (vorn hinter der Figur fest: Kugeln prallen ab)
  const K = M63.KAEFIG;
  const kw = (x0, x1, z0, z1, h, cam) => level.world.add({ type: 'box', min: [x0, K.y, z0], max: [x1, K.y + h, z1], camIgnore: !!cam, tag: 'kaefig' });
  kw(K.x - 7.6, K.x - 7, K.z - 7.6, K.z + 7.6, 4.5); kw(K.x + 7, K.x + 7.6, K.z - 7.6, K.z + 7.6, 4.5);
  kw(K.x - 7.6, K.x + 7.6, K.z - 7.6, K.z - 7, 4.5); kw(K.x - 7.6, K.x + 7.6, K.z + 7, K.z + 7.6, 4.5, true);
  level.world.add({ type: 'box', min: [K.x - 7.6, K.y + 4.5, K.z - 7.6], max: [K.x + 7.6, K.y + 5, K.z + 7.6], camIgnore: true, tag: 'kaefig-decke' });
  if (level.view) {
    for (let i = 0; i <= 24; i++) {
      const t = -7.3 + (i * 14.6) / 24;
      b0.cyl(0.07, 0.07, 4.5, K.x + t, K.y, K.z - 7.3, litTop(0xd8443a, 0.7), 6);
      b0.cyl(0.07, 0.07, 4.5, K.x - 7.3, K.y, K.z + t, litTop(0xd8443a, 0.7), 6);
      b0.cyl(0.07, 0.07, 4.5, K.x + 7.3, K.y, K.z + t, litTop(0xd8443a, 0.7), 6);
    }
    for (const y of [K.y + 1.2, K.y + 4.4]) {
      b0.box(14.8, 0.18, 0.18, K.x, y, K.z - 7.3, 0xffc84a, { r: 0.03 });
      b0.box(0.18, 0.18, 14.8, K.x - 7.3, y, K.z, 0xffc84a, { r: 0.03 }); b0.box(0.18, 0.18, 14.8, K.x + 7.3, y, K.z, 0xffc84a, { r: 0.03 });
    }
    b0.box(14.8, 0.9, 0.5, K.x, K.y, K.z + 7.3, litTop(0x9a2a24, 0.7), { r: 0.05 });
    // roter Läufer mit Goldkante von der Rätselbox zum Stachelwerfer
    b0.box(2.4, 0.05, 12.6, K.x, K.y, K.z + 0.4, litTop(0xc8323a, 0.85), { r: 0 });
    for (const s of [-1, 1]) b0.box(0.14, 0.06, 12.6, K.x + s * 1.2, K.y, K.z + 0.4, 0xffc84a, { r: 0 });
  }
  b0.flush(level, { castShadow: false });   // Innenwände ohne Sonnenschatten (überdachter Saal; spart den Schattenpass)
  // Dächer (sparsam): über dem Saal, unter den Tempelterrassen, auf dem obersten Dach, im Gong-Garten
  daecher(level, [
    { pos: [0, F[2] + 5.6, -57], width: 56, depth: 10, height: 4.4, color: 'blau' },
    // Dachschürzen unter den Terrassen (der First bleibt unter dem Boden, die Traufen ragen ringsum hervor)
    { pos: [0, YE - 2.6, -75], width: 20, depth: 17, height: 2.2, color: 'rot' },
    { pos: [-6.6, YE - 2.4, -92], width: 7, depth: 19, height: 2, color: 'blau' }, { pos: [6.6, YE - 2.4, -92], width: 7, depth: 19, height: 2, color: 'blau' },
    { pos: [0, YE - 2.6, -106], width: 17, depth: 10, height: 2.2, color: 'blau' },
    { pos: [0, YE - 2.6, -123], width: 19, depth: 12, height: 2.2, color: 'gruen' },
    { pos: [0, YE + 5.2, -141.5], width: 19, depth: 15, height: 2.2, color: 'rot' },
    // Pavillon hinter dem Zielmast
    { pos: [0, YE + 11.8, -146], width: 8.4, depth: 4.6, height: 2.6, color: 'rot' },
    { pos: [RX, 3.6, -128.5], width: 14, depth: 4, height: 2.2, color: 'gruen' },
  ]);
  // Laternen: Hof, Korridor (an den Wänden), Garten, Saal, Tempel, Nebenbereiche
  laternen(level, [
    { kind: 'stein', pos: [-3.8, Y0, 1.5] }, { kind: 'stein', pos: [3.8, Y0, 1.5] }, { kind: 'stein', pos: [-10, Y0, 10] },
    { kind: 'haengend', pos: [-2.4, Y0 + 3.4, -4.2] }, { kind: 'haengend', pos: [2.4, Y0 + 3.4, -11.6] }, { kind: 'haengend', pos: [-2.4, Y0 + 3.4, -18.6] }, { kind: 'haengend', pos: [2.4, Y0 + 3.4, -24.2] },
    { kind: 'stein', pos: [-11, F[0], -37.6] }, { kind: 'stein', pos: [11, F[0], -37.6] }, { kind: 'stein', pos: [-23.2, F[0], -37.6] }, { kind: 'stein', pos: [23.2, F[0], -37.6] },
    { kind: 'haengend', pos: [-15, F[1] - 0.5, -49.6] }, { kind: 'haengend', pos: [4, F[1] - 0.5, -49.6] },
    { kind: 'haengend', pos: [-2, F[2] - 0.5, -49.6] }, { kind: 'haengend', pos: [14, F[2] - 0.5, -49.6] },
    { kind: 'haengend', pos: [-9, F[2] + 4.1, -49.6] }, { kind: 'haengend', pos: [9, F[2] + 4.1, -49.6] },
    { kind: 'pfahl', pos: [-6.8, YE, -69.5] }, { kind: 'pfahl', pos: [6.2, YE, -69.5] }, { kind: 'stein', pos: [-6.6, YE, -108.6] }, { kind: 'stein', pos: [6.6, YE, -119.2] },
    { kind: 'pfahl', pos: [-7, YE + 7.8, -136] }, { kind: 'pfahl', pos: [6.4, YE + 7.8, -136] },
    { kind: 'stein', pos: [RX - 3, 0, -99.5] }, { kind: 'stein', pos: [RX + 3, 0, -99.5] }, { kind: 'pfahl', pos: [RX - 6.6, F[2], -37.2] }, { kind: 'pfahl', pos: [RX + 6, F[2], -37.2] },
  ]);  // Pavillon-Säulen hinter dem Zielmast (Kollision + Optik)
  const pav = new Bld();
  for (const x of [-3.4, 3.4]) for (const z of [-144.4, -147.6]) {
    level.world.add({ type: 'box', min: [x - 0.25, YE + 7.8, z - 0.25], max: [x + 0.25, YE + 11.8, z + 0.25], tag: 'pavillon' });
    pav.cyl(0.22, 0.26, 4, x, YE + 7.8, z, litTop(0xd8443a, 0.7), 10);
  }
  pav.box(7.4, 0.3, 0.3, 0, YE + 11.3, -144.4, 0x9a2a24, { r: 0 }); pav.box(7.4, 0.3, 0.3, 0, YE + 11.3, -147.6, 0x9a2a24, { r: 0 });
  pav.flush(level);
  // Festschmuck, Teiche, Beete
  zier(level, [
    // Hof
    { kind: 'teich', pos: [-6.5, Y0, 5.5], size: [5.4, 3.4], koi: 5 }, { kind: 'steine', pos: [0, Y0, 10.5], to: [0, Y0, 1], n: 6 },
    { kind: 'bonsai', pos: [-4.8, Y0, -0.6] }, { kind: 'bonsai', pos: [4.8, Y0, -0.6] },
    { kind: 'schirm', pos: [7.6, Y0, 6.4], color: 0xd8443a }, { kind: 'bank', pos: [7.6, Y0, 3.8], yaw: Math.PI / 2 },
    { kind: 'blumen', pos: [-11, Y0, -0.2], size: [1.6, 3.6] }, { kind: 'blumen', pos: [11, Y0, 9], size: [1.6, 3.6] },
    { kind: 'moos', pos: [-6, Y0, 9], size: [8, 3], n: 7 }, { kind: 'moos', pos: [6, Y0, 0.5], size: [6, 2.5], n: 5 },
    { kind: 'kette', pos: [-3.9, Y0 + 3.9, -1.4], to: [3.9, Y0 + 3.9, -1.4], n: 7, sag: 0.6 },
    // Garten vor dem Saal
    { kind: 'teich', pos: [1.5, F[0], -33.6], size: [7, 3.6], koi: 6 }, { kind: 'steine', pos: [-4, F[0], -30], to: [-4, F[0], -38], n: 6 },
    { kind: 'bonsai', pos: [-9, F[0], -36.5], size: 1.2 }, { kind: 'blumen', pos: [14, F[0], -37.6], size: [5, 1.2] }, { kind: 'blumen', pos: [-17, F[0], -37.6], size: [5, 1.2] },
    { kind: 'moos', pos: [-14, F[0], -32], size: [10, 5], n: 10 }, { kind: 'moos', pos: [14, F[0], -31], size: [10, 4], n: 8 },
    // Ankunftsterrasse
    { kind: 'trommel', pos: [-5.2, YE, -71.2] }, { kind: 'trommel', pos: [5.2, YE, -71.2] },
    { kind: 'schirm', pos: [5.8, YE, -79.6], color: 0x2a6ae8 }, { kind: 'kuebel', pos: [-7, YE, -81] }, { kind: 'kuebel', pos: [7, YE, -69] },
    { kind: 'kette', pos: [-6.6, YE + 2.5, -69.5], to: [6.4, YE + 2.5, -69.5], n: 9, sag: 0.9 },
    { kind: 'moos', pos: [0, YE, -75], size: [12, 9], n: 6 },
    // Helm-Station, mittleres Dach
    { kind: 'fahne', pos: [-6.4, YE, -109.2], color: 0x2a6ae8 }, { kind: 'fahne', pos: [6.4, YE, -102.8], color: 0xffc84a },
    { kind: 'kuebel', pos: [-6.2, YE, -102.8] }, { kind: 'bank', pos: [5.6, YE, -108.6] },
    { kind: 'schirm', pos: [6.4, YE, -120], color: 0xffc84a }, { kind: 'bonsai', pos: [-7, YE, -127.2] }, { kind: 'blumen', pos: [3, YE, -127.4], size: [3, 0.9] },
    // oberstes Dach
    { kind: 'fahne', pos: [-7.2, YE + 7.8, -135.8], color: 0xd8443a, height: 5.5 }, { kind: 'fahne', pos: [7.2, YE + 7.8, -135.8], color: 0x2a6ae8, height: 5.5 },
    { kind: 'kuebel', pos: [-6.8, YE + 7.8, -147] }, { kind: 'kuebel', pos: [6.8, YE + 7.8, -147] },
    { kind: 'kette', pos: [-3.4, YE + 11.2, -144.4], to: [3.4, YE + 11.2, -144.4], n: 6, sag: 0.4 },
    // Gong-Garten
    { kind: 'kuebel', pos: [RX - 6, F[2], -50] }, { kind: 'kuebel', pos: [RX + 6, F[2], -50] },
    { kind: 'blumen', pos: [RX - 6.3, F[2], -43], size: [0.9, 6] }, { kind: 'blumen', pos: [RX + 6.3, F[2], -43], size: [0.9, 6] },
    { kind: 'teich', pos: [RX, 0, -111.5], size: [6, 4], koi: 6 }, { kind: 'steine', pos: [RX, 0, -100.5], to: [RX, 0, -108.2], n: 6 },
    { kind: 'moos', pos: [RX - 7, 0, -104], size: [8, 6], n: 9, flower: 0xffb8d8 }, { kind: 'moos', pos: [RX + 7, 0, -106], size: [8, 8], n: 9, flower: 0xffe08a },
    { kind: 'blumen', pos: [RX - 10.4, 0, -114], size: [1.4, 6] }, { kind: 'blumen', pos: [RX + 10.4, 0, -114], size: [1.4, 6] },
    { kind: 'schirm', pos: [RX + 5.5, 0, -101.5], color: 0xff7ac0 }, { kind: 'bonsai', pos: [RX - 5.5, 0, -101.5] },
    { kind: 'kette', pos: [RX - 8, 3.6, -126.4], to: [RX + 8, 3.6, -126.4], n: 10, sag: 0.7 },
  ]);
}

/** Belebtes: Glühpunkte (Laternenschein im Saal, Glitzer im Gong-Garten). */
function setup(level) {
  glimmer(level, [[XL, XR, F[0] + 1, F[0] + 4, ZF, ZB + 1], [XL, XR, F[1] + 1, F[1] + 4, ZF, ZB + 1], [XL, XR, F[2] + 1, F[2] + 4, ZF, ZB + 1]], { n: 50, color: 0xffd890, size: 0.16, drift: 0.5, seed: 11 });
  glimmer(level, [[RX - 12, RX + 12, 0.8, 5, -98, -126]], { n: 36, color: 0xffe6a0, size: 0.24, seed: 5 });
  // Schiebetüren werfen keinen Sonnenschatten (spart Zeichenaufrufe; die Türen stehen im Schatten der Decken)
  // und ihr Antipp-Schein (additive Fläche) zeichnet nur, solange er leuchtet
  // Türen eines tieferen Stockwerks sind von oben ohnehin verdeckt (opake Decke dazwischen) – sie zeichnen dann nicht.
  const hints = [], doors = [];
  level.view?.three?.traverse((o) => {
    if (o.name !== 'schiebetuer') return;
    if (o.position.z < ZF && o.position.z > ZB - 2) doors.push(o);
    o.traverse((m) => { if (!m.isMesh) return; m.castShadow = false; if (m.material?.blending === THREE.AdditiveBlending) hints.push(m); });
  });
  // Im Saal leuchtet der Antipp-Schein nur an den Türen des eigenen Stockwerks (die anderen sieht man durch die Decke).
  const hintDoor = new Map();
  for (const m of hints) { let q = m; while (q && q.name !== 'schiebetuer') q = q.parent; hintDoor.set(m, q); }
  if (level.view) level.view.onFrame(() => {
    const p = level.player;
    const inHall = p && p.pos.z < ZF + 2 && p.pos.z > ZB - 3 && Math.abs(p.pos.x) < XR + 1;
    const floor = !inHall ? -1 : p.pos.y >= F[2] - 0.5 ? 2 : p.pos.y >= F[1] - 0.5 ? 1 : 0;
    for (const d of doors) d.visible = floor < 0 || d.position.y > F[floor] - 0.5;
    for (const m of hints) {
      const d = hintDoor.get(m);
      const own = floor < 0 || !d || doors.indexOf(d) < 0 || Math.abs(d.position.y - F[floor]) < 0.5;
      m.visible = own && m.material.opacity > 0.01;
    }
  });
  // Gegner im überdachten Saal ohne Sonnenschatten (Blob-Schatten bleiben) – Zeichenaufruf-Budget mit drei Stockwerken im Bild
  schattenDiaet(level, ['pilzling', 'krallen_pilzling', 'rollpilz', 'stachelwerfer', 'stachelkugel_wurf', 'pilz_maske', 'helm_maske'], 0);
  // Pilz-Maske bleibt im Saal: wer mit Maske auf der Tempelaußenseite ankommt, setzt sie ab (Platz für den Propeller-Helm)
  level.onStep(() => {
    const p = level.player;
    if (p && p.helmet === 'maske' && p.pos.z < -56 && p.pos.x < 60 && p.mode !== 'script') {
      p.dropHelmet('gone');
      level.effects?.sparks({ x: p.pos.x, y: p.pos.y + 1.2, z: p.pos.z }, 10);
      level.archetype?.hud?.banner?.('Die Pilz-Maske bleibt im Saal', { hold: 1.4 });
    }
  });
}

const KEY = (pos) => ({ kind: 'schluesselmuenze', pos, group: 'dach', onAll: { reveal: 'gongwarp' } });

export const LEVEL = {
  id: '6-3',
  world: 6,
  title: 'Schiebetüren im Kirschblütensaal',
  archetype: 'parcours',
  theme: 'fareast',
  music: 'course_fareast',
  timeLimit: 400,
  killY: -14,
  build,
  setup,
  // im überdachten Saal kein Sonnenschatten der Gegner (Blob-Schatten bleiben) – spart Zeichenaufrufe
  instances: { pilzling: { shadow: false }, krallen_pilzling: { shadow: false }, stachelwerfer: { shadow: false }, pilz_maske: { shadow: false }, helm_maske: { shadow: false }, schluesselmuenze: { shadow: false }, coin: { shadow: false } },
  start: { pos: [0, Y0, 7], yaw: PI / 2 },
  camera: [
    { from: 16, to: -30, pitch: 44, dist: 13, area: [-40, 40] },
    // Saal im Querschnitt: flacher Blick von vorn, damit alle drei Stockwerke lesbar sind
    { from: -32, to: -56, pitch: 28, dist: 15, height: 1.2, ahead: 0, area: [-40, 40] },
    { from: -60, to: -154, pitch: 42, dist: 14, area: [-40, 40] },
    { from: -28, to: -60, pitch: 50, dist: 16, x: RX, xLock: 0.6, area: [80, 125] },
    { from: -92, to: -132, pitch: 44, dist: 15, area: [80, 125] },
  ],
  segments: [
    { type: 'killplane', y: -14 },
    // ---------------- 1 Hof und Korridor
    isl(-12, 12, 12, -2, Y0, 6, { top: 'stone' }),
    isl(-3, 3, -2, -28.6, Y0, 6, { top: 'stone' }),
    isl(3, 6.5, -15.7, -19.3, Y0, 6, { top: 'stone' }),
    { type: 'schiebetuer', id: 'tuer1', pos: [0, Y0, M63.TUEREN[0]], width: 2.4, height: 3, yaw: -PI / 2, slide: 'beide', onOpen: { coins: 2 } },
    { type: 'schiebetuer', id: 'tuer2', pos: [0, Y0, M63.TUEREN[1]], width: 2.4, height: 3, yaw: -PI / 2, slide: 'beide' },
    { type: 'schiebetuer', id: 'tuer3', pos: [0, Y0, M63.TUEREN[2]], width: 2.4, height: 3, yaw: -PI / 2, slide: 'beide', onOpen: { coins: 2 } },
    { type: 'schiebetuer', id: 'tuerL', pos: [-3.3, Y0, -10.5], width: 2.4, height: 3, yaw: 0, slide: 'rechts', behind: 'wand', onOpen: { coins: 5 } },
    { type: 'schiebetuer', id: 'tuerR', pos: [3.3, Y0, -17.5], width: 2.4, height: 3, yaw: PI, slide: 'links' },
    { type: 'pipe', id: 'rohr', pos: M63.ROHR, height: 1.0, color: 0xd8443a, target: 'saalrohr' },
    sign(-6.5, Y0, 4, 'Kirschblütensaal'),
    sign(-1.8, Y0, -3.2, 'Türen antippen!', { size: [2.2, 0.8] }),
    // ---------------- 2 Saal: Erdgeschoss (mit Garten davor), Röhre, Gong
    isl(-27, 27, -28.8, -52, F[0], 6, { top: 'stone', shadow: false }),
    { type: 'pipe', id: 'saalrohr', pos: M63.SAALROHR, height: 1.2, color: 0xd8443a },
    tuer('t0a', -8, F[0], ZB - 0.3), tuer('t0b', 8, F[0], ZB - 0.3, { behind: 'wand', onOpen: { coins: 3 } }),
    tuer('t1a', 10, F[1], ZB - 0.3), tuer('t1b', -8, F[1], ZB - 0.3, { behind: 'wand', onOpen: { coins: 3 } }),
    tuer('t2a', -6, F[2], ZB - 0.3),
    tuer('t2c', 6, F[2], ZB - 0.3), tuer('t2d', 12, F[2], ZB - 0.3, { behind: 'wand', onOpen: { coins: 3 } }),
    { type: 'gong', id: 'gong', pos: M63.GONG, yaw: PI, size: 1.8, coins: 10, rain: { r: 2.6, height: 7, time: 1.6 }, onHit: { reveal: 'raetsel1' }, cooldown: 2 },
    // ---------------- 3/4 Tempelaußenseite und oberstes Dach
    isl(-8, 8, -68, -82, YE, 7, { top: 'stone' }),
    isl(-3, 3, -82, -102, YE, 5, { top: 'stone' }),
    isl(-7, 7, -102, -110, YE, 6, { top: 'stone' }),
    isl(-8, 8, -118, -128, YE, 7, { top: 'stone' }),
    isl(-4.5, 4.5, -128, -131.5, YE + 2.6, 6, { top: 'stone' }),
    isl(-4.5, 4.5, -131.5, -135, YE + 5.2, 6, { top: 'stone' }),
    isl(-8, 8, -135, -148, YE + 7.8, 8, { top: 'stone' }),
    { type: 'wolkenplattform', id: 'stempelwolke', pos: M63.WOLKE, size: [3.2, 0.6, 3.2], color: 'rosa' },
    sign(-5.5, YE, -103.5, 'Propeller-Helm', { size: [2.4, 0.8] }),
    // ---------------- Nebenbereiche: Käfig der Rätselbox, Gong-Garten
    isl(RX - 7.6, RX + 7.6, -36.4, -51.6, F[2], 5, { top: 'stone' }),
    isl(RX - 12, RX + 12, -96, -128, 0, 5),
    { type: 'gong', id: 'gong_a', pos: [RX - 8, 0, -112], yaw: 0, size: 1.6, coins: 6, cooldown: 2.5, signal: false },
    { type: 'gong', id: 'gong_b', pos: [RX - 5, 0, -119.5], yaw: -1.0, size: 1.6, coins: 6, cooldown: 2.5, signal: false },
    { type: 'gong', id: 'gong_c', pos: [RX + 5, 0, -119.5], yaw: -2.15, size: 1.6, coins: 6, cooldown: 2.5, signal: false },
    { type: 'gong', id: 'gong_d', pos: [RX + 8, 0, -112], yaw: PI, size: 1.6, coins: 6, cooldown: 2.5, signal: false },
    { type: 'gong', id: 'goldgong', pos: [RX, 0, -123], yaw: -PI / 2, size: 2.4, coins: 12, once: true, signal: false, onHit: { power: 'oneup', pos: [RX, 1.5, -119] } },
    // ---------------- Kulisse
    { type: 'deco_w6', items: [
      { kind: 'kirschbaum', pos: [-8.5, Y0, 7.5], height: 5.2 }, { kind: 'kirschbaum', pos: [9, Y0, 1], height: 4.6 },
      { kind: 'bambus', pos: [-9.5, Y0, -0.5], n: 6, height: [3.5, 5.5] }, { kind: 'paravent', pos: [8, Y0, 8], yaw: -0.4 },
      // Garten vor dem Saal
      { kind: 'kirschbaum', pos: [-18, F[0], -33], height: 5.4 }, { kind: 'kirschbaum', pos: [17, F[0], -34], height: 5 },
      { kind: 'kirschbaum', pos: [-6, F[0], -31], height: 4.2 }, { kind: 'bambus', pos: [8, F[0], -31], n: 7, height: [3, 5] },
      { kind: 'paravent', pos: [-14, F[0], -32], yaw: 0.3 },
      { kind: 'kirschbaum', pos: [-6, YE, -79.5], height: 4.4 }, { kind: 'kirschbaum', pos: [6, YE, -124.5], height: 4.2 },
      { kind: 'wolken', pos: [0, 4, -105], size: [70, 60], n: 9, shadow: false },
      // Gong-Garten
      { kind: 'kirschbaum', pos: [RX - 9, 0, -101], height: 5 }, { kind: 'kirschbaum', pos: [RX + 9.5, 0, -103], height: 5.4 },
      { kind: 'bambus', pos: [RX - 10, 0, -125], n: 7 }, { kind: 'bambus', pos: [RX + 10, 0, -125], n: 7 },
    ] },
  ],
  blocks: [
    { kind: 'question', pos: [-16, F[0] + 3.2, PZ], content: 'coins:5' },
    { kind: 'question', pos: [10, F[1] + 2.1, -52], content: 'oneup' },
    { kind: 'coinblock', pos: [-4, F[1] + 3.0, PZ], count: 6 },
    { kind: 'question', pos: [0, YE + 3.1, -106.5], content: 'coins:5' },
  ],
  enemies: [
    // Erdgeschoss
    { kind: 'pilzling', id: 'p1', pos: [-10, F[0], PZ], path: [[-14, F[0], PZ], [-4, F[0], PZ]] },
    { kind: 'rollpilz', id: 'r1', pos: [5, F[0], PZ], path: [[1, F[0], PZ], [11, F[0], PZ]] },
    { kind: 'krallen_pilzling', id: 'k1', pos: [15.5, F[0], PZ], dir: [-1, 0] },
    // 1. Stock: Stachelwerfer blicken nach rechts (der Figur entgegen) – mit Maske werfen sie nicht
    { kind: 'stachelwerfer', id: 'sw1', pos: [3, F[1], PZ - 0.8], dir: [1, 0], sight: 9, range: 8 },
    { kind: 'pilzling', id: 'p2', pos: [-6, F[1], PZ], behavior: 'chase', sight: 6 },
    { kind: 'stachelwerfer', id: 'sw2', pos: [-13, F[1], PZ - 0.8], dir: [1, 0], sight: 9, range: 8 },
    // 2. Stock
    { kind: 'krallen_pilzling', id: 'k2', pos: [-10, F[2], PZ], dir: [-1, 0] },
    { kind: 'pilzling', id: 'p3', pos: [4, F[2], PZ], path: [[2, F[2], PZ], [9, F[2], PZ]] },
    { kind: 'rollpilz', id: 'r2', pos: [15, F[2], PZ], path: [[13, F[2], PZ], [19, F[2], PZ]] },
    // Käfig der Rätselbox
    { kind: 'stachelwerfer', id: 'swk', pos: [RX, F[2], -49], dir: [0, 1], sight: 12, range: 9 },
    // Tempeldach
    ...M63.STEINE.map(([x, z], i) => ({ kind: 'stampfstein', id: `stein${i + 1}`, pos: [x, YE + 3.4, z], wait: 1.4 })),
  ],
  items: [
    { kind: 'pilz_maske', id: 'maske1', pos: M63.MASKE_KORRIDOR.map((v, i) => (i === 1 ? v + 0.5 : v)), respawn: 6 },
    { kind: 'pilz_maske', id: 'maske2', pos: M63.MASKE_SAAL.map((v, i) => (i === 1 ? v + 0.4 : v)), respawn: 6 },
    line([0, Y0 + 0.5, -4], [0, Y0 + 0.5, -6], 2), line([0, Y0 + 0.5, -9], [0, Y0 + 0.5, -12], 3), line([0, Y0 + 0.5, -16], [0, Y0 + 0.5, -19], 3),
    // Saal: Münzspuren je Stockwerk, Ringe in den Nischen
    line([-12, F[0] + 0.5, PZ], [-2, F[0] + 0.5, PZ], 5), line([12, F[0] + 0.5, PZ], [20, F[0] + 0.5, PZ], 4),
    ring([-8, F[0] + 0.6, -52], 0.7, 5),
    line([14, F[1] + 0.5, PZ], [6, F[1] + 0.5, PZ], 4), line([-9, F[1] + 0.5, PZ], [-19, F[1] + 0.5, PZ], 5),
    line([-14, F[2] + 0.5, PZ], [-2, F[2] + 0.5, PZ], 6), ring([-6, F[2] + 0.6, -52], 0.7, 5),
    // Tempel: Bogen über die Lücke, Spuren
    arc([0, YE + 0.6, -109], [0, YE + 0.6, -119], 7, 2.2),
    line([0, YE + 0.5, -122], [0, YE + 0.5, -126], 3),
    ring([0, YE + 8.4, -141], 1.6, 8),
    KEY([-6.5, YE, -80.5]), KEY([-1.7, YE, -87]), KEY([6.5, YE, -126.5]), KEY([-3.6, YE + 5.2, -133.6]), KEY([6.5, YE + 7.8, -146.5]),
    { kind: 'helm_propeller', id: 'helm1', pos: M63.HELME[0], respawn: 3 },
    { kind: 'helm_propeller', id: 'helm2', pos: M63.HELME[1], respawn: 3 },
    // Warp-Boxen: Saal → Tempel, Rätselbox (erscheint beim Gong) ↔ Käfig, Dach ↔ Gong-Garten
    { kind: 'warpbox', id: 'aussen', pos: M63.AUSSEN, target: M63.ANKUNFT },
    { kind: 'warpbox', id: 'raetsel1', style: 'mystery', pos: M63.RAETSEL, target: 'raetsel2', hidden: true },
    { kind: 'warpbox', id: 'raetsel2', style: 'mystery', pos: [RX, F[2], -38.6], target: 'raetsel1',
      task: { area: { min: [RX - 7, F[2] - 1, -51], max: [RX + 7, F[2] + 5, -37] }, ids: ['swk'], star: 2, pos: [RX, F[2] + 1.2, -44] } },
    { kind: 'warpbox', id: 'gongwarp', pos: [-5.5, YE + 7.8, -144.5], target: 'gongzurueck', hidden: true },
    { kind: 'warpbox', id: 'gongzurueck', pos: [RX, 0, -99.5], target: 'gongwarp' },
    ring([RX, 0.6, -112], 2.2, 10),
  ],
  checkpoint: { pos: [0, YE, -76.5], yaw: PI / 2 },
  stars: [
    M63.STERN0,
    M63.STERN1,
    { pos: [RX, F[2] + 1.2, -44], hidden: true, id: 'stern2' },
  ],
  stamp: M63.STAMP,
  goal: [0, YE + 7.8, -141.5],
  marks: {
    start: [0, Y0, 7], korridor: [0, Y0, -4], saal: [-21, F[0], PZ], stock1: [16, F[1], PZ], stock2: [-16, F[2], PZ],
    gong: [21, F[2], PZ], ankunft: [0, YE, -74], helme: [0, YE, -105], wolke: M63.WOLKE, ziel: [0, YE + 7.8, -139],
    kaefig: [RX, F[2], -40], garten: [RX, 0, -103],
  },
};
