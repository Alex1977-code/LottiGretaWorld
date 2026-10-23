// 3-3 „Die Mondscheinvilla“ (Parcours, Thema ghost, Musik course_ghost, 500 s) – Spukhaus nach dem Bauplan (Detail 3-3).
// Schaurig-niedlich statt gruselig: Kerzenleuchter, Spinnweben mit kleinen Spinnen, Gemälde, deren Augen wandern,
// Kürbislaternen, Grabsteine mit Herzchen, ein großer Mond über den Höfen. Licht-Helm (Bauplan „Lichtbox“) am Anfang
// jedes Abschnitts mit Geistern: sein Lichtkegel löst Spuke und Kreisgeister auf.
// Die Räume liegen getrennt (Türen und Warp-Boxen teleportieren), jeder mit eigener Kameraschiene (area) und eigenen
// 32-m-Abschnitten der statischen Geometrie (z-Bereiche überschneiden sich nicht → Culling je Raum); die Stimmung
// wechselt je Bereich (Außenhöfe: Nacht mit Mondlicht, view.setMood 'aussen').
//
// Abschnitte (Boden y 1):
//   A  Spukflur        x  −5 … 5,    z  12 … −31   Spuke, Großspuk, Licht-Helm; Spuk-Gemälde links (Warp-Box dahinter);
//                                                  Empore rechts (Rückkehr aus dem Drehraum, Sofa mit Stempel);
//                                                  Sofa-Lift links am Flurende → Sims mit der falschen Röhre;
//                                                  Spuk-Treppe fährt aus dem Podest → Tür
//   D  Drehraum        x −60,        z  40 … 52    (geheim, hinter dem Gemälde) dreht sich in Vierteldrehungen,
//                                                  Kreisgeister kreisen; Stern oben rechts; Warp-Box → Empore
//   B  Bibliothek      x  52 … 68,   z −34 … −63   Regalreihe mit verschiebbarem Regal (Durchgang), Checkpoint,
//                                                  Lesetisch; ganz links die Regalgasse – das Regal darin lässt sich
//                                                  zurückschieben → Nische mit Stern; Treppenbereich: zwei Spuk-Treppen
//                                                  steigen abwechselnd aus Boden/Podest → Galerie → Tür
//   C  Außenhof 1      x 108 … 132,  z −66 … −104  Brunnen mit Kreisgeist-Ring, Gräber, Kürbisse, Graben mit
//                                                  schwebenden Grabplatten und Kreisgeistern → Tür zurück ins Haus
//   E  Stufenhalle     x 172 … 188,  z −130 … −158 zwei Stufen (je 4 m): Spuk-Treppen steigen im Takt aus dem Boden
//                                                  (zwei im Gegentakt), dann eine auf der ersten Stufe → Außentür
//   F  Außenhof 2      x 228 … 252,  z −159 … −215 Kreisgeist-Ringe, Großspuke, Steinbrücke mit Kreisgeistern,
//                                                  falscher Zielmast („Reingelegt!“, Spuk erscheint) – er öffnet die
//                                                  versteckte Treppe zum echten Ziel
//   G  Echtes Ziel     x 228 … 252,  z −215 … −223 Terrasse (y 7,6) mit dem richtigen Zielmast
// Sterne: 0 Drehraum (ins Spuk-Gemälde am Anfang springen → Warp-Box), 1 Regalgasse ganz links (Regal zurückschieben),
//         2 falsche Röhre auf dem Sims (Sofa-Lift am Flurende). Stempel: nach Stern 0 auf dem schwebenden Sofa der Empore.
// Gegner: Spuk (12 + 1 vom falschen Zielmast), Großspuk (3), Kreisgeist (37: Ringe 6 / 10 / 8 / 8, einzeln 5).

import {
  hook, line, ring, arc, hauntWall, hauntFloor, cobweb, moonWindow, clock, sideTable, bookShelf, nightLawn, flagstones,
  graves, pumpkins, deadTree, ironFence, fountain, facade, ghostMoods, roomCull, camThrough, bake, prop, solid, PAL, readingNook, armchair,
} from './_helpers_c.js';

const Y = 1;
const CAM = { pitch: 44, dist: 13, fov: 40 };
const R = Math.PI;
const FRONT = -Math.PI / 2;            // Regal/Bild/Tür blickt zur Kamera (+Z)
// x-Bereiche der Räume (Kameraschienen, Zeichnen je Raum): A, D, B, C, E, F/G
const ROOMS = [[-20, 20], [-75, -45], [40, 80], [96, 144], [160, 200], [215, 265]];
const GHOSTS = new Set(['spuk', 'kreisgeist', 'kreisgeist_kreis', 'kreisgeist_glied', 'zielmast_spuk']);

// ------------------------------------------------------------------ Kulisse (Aufbau-Haken, wird mit verschmolzen)
function scene(level) {
  ghostMoods(level, [
    { min: [95, -110], max: [145, -60], mood: 'aussen' },
    { min: [215, -230], max: [265, -155], mood: 'aussen' },
  ]);
  const lamp = (x, y, z) => level.view?.addLantern(x, y, z);

  // ================================================================ A  Spukflur
  const pv = PAL.violett;
  hauntFloor(level, { x0: -7.6, x1: 5.6, zA: 12, zB: -31.6, y: Y, depth: 3, rug: [-1.1, 1.1, 10, -23, 0x6a1a3a] });
  hauntWall(level, { face: '+x', at: -5, from: 12, to: 2.8, y: Y, h: 8, pal: pv });
  hauntWall(level, { face: '+x', at: -5, from: 0.4, to: -31.6, y: Y, h: 8, pal: pv });
  hauntWall(level, { face: '+x', at: -5, from: 0.4, to: 2.8, y: Y + 3.4, h: 4.6, below: 0, pal: pv });          // Sturz über der Nische
  hauntWall(level, { face: '+x', at: -7.4, from: 0.4, to: 2.8, y: Y, h: 3.4, pal: PAL.rot });          // Nischen-Rückwand
  hauntWall(level, { face: '-z', at: 2.8, from: -7.4, to: -5.6, y: Y, h: 3.4, t: 0.3, visual: false });
  hauntWall(level, { face: '+z', at: 0.4, from: -7.4, to: -5.6, y: Y, h: 3.4, t: 0.3, visual: false });
  hauntWall(level, { face: '-x', at: 5, from: 12, to: -31.6, y: Y, h: 8, pal: pv });
  hauntWall(level, { face: '+z', at: -31, from: -5.6, to: 5.6, y: Y, h: 8, pal: pv });
  // Empore rechts (y 8): Rückkehr aus dem Drehraum, Sofa mit dem Stempel; Brüstung bis zum Sofa
  hauntFloor(level, { x0: 3, x1: 5, zA: 6.4, zB: -2, y: Y + 7, depth: 0.4 });
  hauntWall(level, { face: '-x', at: 3.02, from: 6.4, to: 3.4, y: Y + 7, h: 0.9, t: 0.1, below: 0, pal: pv });
  // Sims links am Flurende (y 7,6) für die falsche Röhre
  hauntFloor(level, { x0: -5, x1: -3, zA: -22.2, zB: -24.6, y: Y + 6.6, depth: 0.4 });
  // Podest vor der Tür (y 3)
  hauntFloor(level, { x0: -2.4, x1: 2.4, zA: -28.2, zB: -31, y: Y + 2, depth: 2 });
  moonWindow(level, { pos: [5, Y + 2.2, -6], face: '-x', w: 1.5, h: 2.6 });
  moonWindow(level, { pos: [-5, Y + 2.2, -12], face: '+x', w: 1.5, h: 2.6, curtain: 0x2a4a6a });
  moonWindow(level, { pos: [3.4, Y + 3.0, -31], face: '+z', w: 1.1, h: 2.2 });
  clock(level, { pos: [4.4, Y, -17], yaw: R });
  sideTable(level, -4.3, Y, 7.5); sideTable(level, 4.3, Y, -1.2); sideTable(level, -4.3, Y, -9.5); sideTable(level, 4.3, Y, -26);
  bookShelf(level, { pos: [-4.7, Y, -4], yaw: 0, w: 2.2, h: 2.8, solid: true });
  bake(level, [
    { name: 'kerze', opts: { count: 3 }, pos: [-4.3, Y + 0.9, 7.5], state: { anim: 'on' } },
    { name: 'kerze', opts: { count: 3 }, pos: [4.3, Y + 0.9, -1.2], state: { anim: 'on' } },
    { name: 'kerze', opts: { count: 1 }, pos: [-4.3, Y + 0.9, -9.5], state: { anim: 'on' } },
    { name: 'kerze', opts: { count: 3 }, pos: [4.3, Y + 0.9, -26], state: { anim: 'on' } },
    { name: 'kerze', opts: { count: 3 }, pos: [-1.8, Y + 2, -30.4], state: { anim: 'on' } },
    { name: 'kerze', opts: { count: 3 }, pos: [1.8, Y + 2, -30.4], state: { anim: 'on' } },
    { name: 'kerze', opts: { count: 1 }, pos: [4.6, Y + 7, 6.0], state: { anim: 'on' } },
    { name: 'bilderrahmen', opts: { motif: 'portraet', size: [1.3, 1.7] }, pos: [-4.92, Y + 2.4, 8.4], yaw: 0 },
    { name: 'bilderrahmen', opts: { motif: 'landschaft', size: [1.8, 1.3] }, pos: [4.92, Y + 2.6, 4.2], yaw: R },
    { name: 'bilderrahmen', opts: { motif: 'portraet', size: [1.2, 1.6] }, pos: [-4.92, Y + 2.4, -17.6], yaw: 0 },
    { name: 'bilderrahmen', opts: { motif: 'landschaft', size: [1.6, 1.2] }, pos: [4.92, Y + 2.8, -12.4], yaw: R },
  ]);
  prop(level, { name: 'bilderrahmen', opts: { motif: 'spuk', size: [1.2, 1.5] }, pos: [4.92, Y + 2.5, -21.6], yaw: R, state: { anim: 'watch' } });
  for (const [x, y, z] of [[-4.3, Y + 1.3, 7.5], [4.3, Y + 1.3, -1.2], [-4.3, Y + 1.3, -9.5], [4.3, Y + 1.3, -26], [0, Y + 3, -30], [4.4, Y + 8, 6]]) lamp(x, y, z);
  cobweb(level, [-4.98, Y + 7.8, -30.98], 0, 1.6);
  cobweb(level, [4.98, Y + 7.8, -30.98], -Math.PI / 2, 1.4);
  cobweb(level, [-4.98, Y + 7.8, 11.4], 0, 1.0);
  cobweb(level, [-7.38, Y + 3.3, 0.42], 0, 0.8);

  // ================================================================ D  Drehraum (Hülle baut der Baustein)
  lamp(-60, 7.5, 47);

  // ================================================================ B  Bibliothek
  const pg = PAL.gruen;
  hauntFloor(level, { x0: 49.4, x1: 68.6, zA: -34, zB: -63.6, y: Y, depth: 3, rug: [59.5, 66.5, -35.5, -41.5, 0x2a4a7a] });
  hauntWall(level, { face: '+x', at: 52, from: -34, to: -49.2, y: Y, h: 8, pal: pg });
  hauntWall(level, { face: '+x', at: 52, from: -51.2, to: -63.6, y: Y, h: 8, pal: pg });
  hauntWall(level, { face: '+x', at: 52, from: -49.2, to: -51.2, y: Y + 2.8, h: 5.2, below: 0, pal: pg });     // Sturz über der Nische
  hauntWall(level, { face: '+x', at: 49.6, from: -48.6, to: -51.8, y: Y, h: 2.8, pal: PAL.rot });    // Nische (Rückwand)
  hauntWall(level, { face: '-z', at: -48.6, from: 49.4, to: 51.4, y: Y, h: 2.8, t: 0.3, visual: false });
  hauntWall(level, { face: '+z', at: -51.8, from: 49.4, to: 51.4, y: Y, h: 2.8, t: 0.3, visual: false });
  hauntWall(level, { face: '-x', at: 68, from: -34, to: -63.6, y: Y, h: 8, pal: pg });
  hauntWall(level, { face: '+z', at: -63, from: 51.4, to: 68.6, y: Y, h: 8, pal: pg });
  // Regalreihe 1 (z −43) mit Lücke für das Schieberegal; Regalgasse ganz links (Reihe x 56 … 57) mit Rückwand
  solid(level, 57, 61, Y, Y + 5, -42.75, -43.25, { tag: 'regal' });
  solid(level, 63.4, 68, Y, Y + 5, -42.75, -43.25, { tag: 'regal' });
  solid(level, 56, 57, Y, Y + 5, -41, -57, { tag: 'regal' });
  solid(level, 52, 56, Y, Y + 5, -52.75, -53.25, { tag: 'regal' });
  for (const x of [58, 60]) bookShelf(level, { pos: [x, Y, -43], yaw: FRONT, w: 2, h: 5, seed: x });
  for (const x of [64.5, 66.8]) bookShelf(level, { pos: [x, Y, -43], yaw: FRONT, w: 2.3, h: 5, seed: x });
  for (const z of [-42.15, -44.45, -46.75, -49.05, -51.35, -53.65, -55.85]) bookShelf(level, { pos: [56.25, Y, z], yaw: R, w: 2.3, h: 5, seed: z });
  for (const z of [-45.6, -48, -50.4, -52.8, -55.2]) bookShelf(level, { pos: [56.75, Y, z], yaw: 0, w: 2.4, h: 4.2, seed: -z });
  bookShelf(level, { pos: [54, Y, -53.3], yaw: FRONT, w: 4, h: 5, seed: 7 });
  for (const z of [-36, -38.4]) bookShelf(level, { pos: [52.3, Y, z], yaw: 0, w: 2.3, h: 3.2, seed: z + 1 });
  for (const z of [-58.4, -60.8]) bookShelf(level, { pos: [52.3, Y, z], yaw: 0, w: 2.3, h: 3.2, seed: z + 2 });
  // Galerie: Regale links und rechts neben der Tür zum Außenhof
  for (const [x, w] of [[57.35, 1.6], [61.65, 1.9]]) bookShelf(level, { pos: [x, Y + 4, -62.7], yaw: FRONT, w, h: 3, seed: x + 3 });
  bookShelf(level, { pos: [67.7, Y, -51.8], yaw: R, w: 2.2, h: 3.4, seed: 11 });
  // Mittelpodest (y 3) und Galerie (y 5) im Treppenbereich
  hauntFloor(level, { x0: 63.5, x1: 67.6, zA: -55, zB: -59, y: Y + 2, depth: 2 });
  hauntFloor(level, { x0: 56.5, x1: 68, zA: -59, zB: -63, y: Y + 4, depth: 4 });
  moonWindow(level, { pos: [68, Y + 2.4, -47.2], face: '-x', w: 1.4, h: 2.6, curtain: 0x2a5a3a });
  moonWindow(level, { pos: [63.6, Y + 5.2, -63], face: '+z', w: 1.3, h: 2.2, curtain: 0x2a5a3a });
  clock(level, { pos: [67.3, Y, -40.4], yaw: R });
  readingNook(level, { pos: [59, Y, -49.6] });
  armchair(level, { pos: [50.9, Y, -49.4], yaw: -0.4, color: 0x7a1a3a });
  bake(level, [
    { name: 'kerze', opts: { count: 1 }, pos: [51.6, Y, -51.3], state: { anim: 'on' } },
    { name: 'kerze', opts: { count: 3 }, pos: [66.6, Y + 2, -55.6], state: { anim: 'on' } },
    { name: 'kerze', opts: { count: 3 }, pos: [59, Y + 4, -61.6], state: { anim: 'on' } },
    { name: 'bilderrahmen', opts: { motif: 'portraet', size: [1.3, 1.7] }, pos: [67.92, Y + 3.4, -57.4], yaw: R },
    { name: 'bilderrahmen', opts: { motif: 'landschaft', size: [1.8, 1.3] }, pos: [52.08, Y + 4.8, -44], yaw: 0 },
  ]);
  prop(level, { name: 'bilderrahmen', opts: { motif: 'spuk', size: [1.2, 1.6] }, pos: [67.92, Y + 3.6, -37.2], yaw: R, state: { anim: 'watch' } });
  for (const [x, y, z] of [[59, Y + 1.6, -49.6], [51.6, Y + 1, -51.3], [66.6, Y + 3.2, -55.6], [59, Y + 5.6, -61.6]]) lamp(x, y, z);
  cobweb(level, [52.02, Y + 7.8, -62.98], 0, 1.5);
  cobweb(level, [67.98, Y + 7.8, -62.98], -Math.PI / 2, 1.2);
  cobweb(level, [49.62, Y + 2.7, -48.62], 0, 0.8);

  // ================================================================ C  Außenhof 1
  nightLawn(level, { x0: 108, x1: 132, zA: -66, zB: -88, y: Y, depth: 4 });
  nightLawn(level, { x0: 108, x1: 132, zA: -97, zB: -104.6, y: Y, depth: 4 });
  facade(level, { face: '+x', at: 108, from: -64, to: -104.6, y: Y, h: 9, windows: [-70.5, -83, -92, -99.5] });
  facade(level, { face: '+z', at: -104, from: 107.2, to: 132.6, y: Y, h: 9, windows: [112.5, 126.5] });
  fountain(level, { pos: [120, Y, -78.5], r: 1.6 });
  flagstones(level, [[110, -72], [115.6, -72], [115.6, -84.6], [120, -87.4]], Y, 2);
  flagstones(level, [[120, -97.4], [120, -102.6]], Y, 2.4);
  graves(level, [
    { pos: [113.4, Y, -78.5], yaw: 0.2, kind: 'rund' }, { pos: [113.4, Y, -84.4], yaw: -0.2, kind: 'herz', tilt: 0.06 },
    { pos: [126.5, Y, -72.4], yaw: 0.1, kind: 'kreuz' }, { pos: [128.6, Y, -81.6], yaw: -0.3, kind: 'rund', tilt: -0.08 },
    { pos: [126.4, Y, -86.2], yaw: 0.3, kind: 'herz' }, { pos: [111.4, Y, -100.6], yaw: 0, kind: 'rund' },
  ]);
  pumpkins(level, [
    { pos: [110.2, Y, -75.4], yaw: 0.45 }, { pos: [118.6, Y, -69.6], yaw: 0.2, size: 0.55 }, { pos: [130.4, Y, -75], yaw: -0.3 },
    { pos: [123.8, Y, -86.6], yaw: 0.5, size: 0.38 }, { pos: [116.4, Y, -98.6], yaw: 0.3 }, { pos: [124.4, Y, -98.4], yaw: -0.5, size: 0.5 },
  ]);
  deadTree(level, { pos: [130, Y, -68.6], size: 1.1, yaw: 2.4 });
  deadTree(level, { pos: [110.4, Y, -87], size: 0.9, yaw: 0.4 });
  deadTree(level, { pos: [129.4, Y, -101], size: 1, yaw: 2.8 });
  ironFence(level, [132, Y, -66], [132, Y, -88], { solid: true });
  ironFence(level, [132, Y, -97], [132, Y, -104], { solid: true });
  ironFence(level, [108.6, Y, -66], [131.8, Y, -66], { h: 1.0 });
  lamp(120, Y + 2, -78.5);

  // ================================================================ E  Stufenhalle
  const pr = PAL.rot;
  hauntFloor(level, { x0: 171.4, x1: 188.6, zA: -130, zB: -158.6, y: Y, depth: 3, rug: [177, 183, -130.5, -137.5, 0x6a1a3a] });
  hauntFloor(level, { x0: 172, x1: 188, zA: -142, zB: -158, y: Y + 4, depth: 4 });
  hauntFloor(level, { x0: 172, x1: 188, zA: -150, zB: -158, y: Y + 8, depth: 4 });
  hauntWall(level, { face: '+x', at: 172, from: -130, to: -158.6, y: Y, h: 13, pal: pr });
  hauntWall(level, { face: '-x', at: 188, from: -130, to: -158.6, y: Y, h: 13, pal: pr });
  hauntWall(level, { face: '+z', at: -158, from: 171.4, to: 188.6, y: Y, h: 13, pal: pr });
  moonWindow(level, { pos: [188, Y + 6.2, -146], face: '-x', w: 1.6, h: 3 });
  moonWindow(level, { pos: [172, Y + 6.2, -146], face: '+x', w: 1.6, h: 3 });
  moonWindow(level, { pos: [176.5, Y + 10.2, -158], face: '+z', w: 1.4, h: 2.4 });
  clock(level, { pos: [187.3, Y, -133], yaw: R });
  sideTable(level, 172.8, Y, -136.5); sideTable(level, 187.2, Y + 4, -145.4);
  bake(level, [
    { name: 'kerze', opts: { count: 3 }, pos: [172.8, Y + 0.9, -136.5], state: { anim: 'on' } },
    { name: 'kerze', opts: { count: 3 }, pos: [187.2, Y + 4.9, -145.4], state: { anim: 'on' } },
    { name: 'kerze', opts: { count: 3 }, pos: [177.6, Y + 8, -157.4], state: { anim: 'on' } },
    { name: 'kerze', opts: { count: 3 }, pos: [182.4, Y + 8, -157.4], state: { anim: 'on' } },
    { name: 'bilderrahmen', opts: { motif: 'portraet', size: [1.6, 2.1] }, pos: [172.08, Y + 2.3, -140], yaw: 0 },
    { name: 'bilderrahmen', opts: { motif: 'landschaft', size: [2.2, 1.5] }, pos: [187.92, Y + 2.6, -138], yaw: R },
    { name: 'bilderrahmen', opts: { motif: 'portraet', size: [1.3, 1.7] }, pos: [172.08, Y + 6.4, -153], yaw: 0 },
  ]);
  prop(level, { name: 'bilderrahmen', opts: { motif: 'spuk', size: [1.4, 1.8] }, pos: [187.92, Y + 6.3, -153], yaw: R, state: { anim: 'watch' } });
  for (const [x, y, z] of [[172.8, Y + 1.4, -136.5], [187.2, Y + 5.4, -145.4], [180, Y + 9.5, -157]]) lamp(x, y, z);
  cobweb(level, [172.02, Y + 12.8, -157.98], 0, 1.8);
  cobweb(level, [187.98, Y + 12.8, -157.98], -Math.PI / 2, 1.5);

  // ================================================================ F  Außenhof 2 und G  Ziel
  nightLawn(level, { x0: 228, x1: 252, zA: -161, zB: -181, y: Y, depth: 4 });
  nightLawn(level, { x0: 228, x1: 252, zA: -190, zB: -215, y: Y, depth: 4 });
  nightLawn(level, { x0: 228, x1: 252, zA: -215, zB: -223, y: Y + 6.6, depth: 10 });
  facade(level, { face: '+x', at: 228, from: -159, to: -215, y: Y, h: 10, windows: [-164, -173, -196, -207] });
  facade(level, { face: '+z', at: -223, from: 227.2, to: 252.8, y: Y + 6.6, h: 9, windows: [231.5, 236.4, 243.6, 248.5] });
  flagstones(level, [[230, -167], [238, -167], [240, -179]], Y, 2);
  flagstones(level, [[240, -191], [240, -202], [240, -207]], Y, 2.4);
  flagstones(level, [[240, -215.4], [240, -219.2]], Y + 6.6, 3);
  flagstones(level, [[231.5, -219.6], [248.5, -219.6]], Y + 6.6, 1.3);
  graves(level, [
    { pos: [233, Y, -177], yaw: 0.3, kind: 'kreuz' }, { pos: [246.5, Y, -165.5], yaw: -0.2, kind: 'herz' },
    { pos: [233.6, Y, -193.4], yaw: 0.2, kind: 'rund', tilt: 0.07 }, { pos: [249.2, Y, -205], yaw: -0.4, kind: 'rund' },
    { pos: [246.6, Y, -193], yaw: 0.1, kind: 'herz' },
  ]);
  pumpkins(level, [
    { pos: [231, Y, -170.4], yaw: 0.35 }, { pos: [249.6, Y, -171.4], yaw: -0.3, size: 0.55 }, { pos: [233.2, Y, -203.4], yaw: 0.2 },
    { pos: [246.8, Y, -203.2], yaw: -0.5 }, { pos: [235.6, Y + 6.6, -217], yaw: 0.45, size: 0.5 }, { pos: [244.4, Y + 6.6, -217], yaw: -0.45, size: 0.5 },
  ]);
  deadTree(level, { pos: [240, Y, -172.5], size: 1.2, yaw: 1.2 });
  deadTree(level, { pos: [249, Y, -178.4], size: 0.9, yaw: 2.6, lantern: false });
  deadTree(level, { pos: [230.6, Y, -211], size: 1, yaw: 0.2 });
  ironFence(level, [252, Y, -161], [252, Y, -181], { solid: true });
  ironFence(level, [252, Y, -190], [252, Y, -215], { solid: true });
  ironFence(level, [228.6, Y, -161], [251.8, Y, -161], { h: 1.0 });
  ironFence(level, [228.6, Y + 6.6, -215.2], [238.2, Y + 6.6, -215.2], { h: 1.0, solid: true });
  ironFence(level, [241.8, Y + 6.6, -215.2], [251.8, Y + 6.6, -215.2], { h: 1.0, solid: true });
  lamp(240, Y + 3, -172.5); lamp(240, Y + 9.2, -220);
}

export const LEVEL = {
  id: '3-3',
  world: 3,
  title: 'Die Mondscheinvilla',
  archetype: 'parcours',
  theme: 'ghost',
  music: 'course_ghost',
  timeLimit: 500,
  killY: -10,
  start: { pos: [0, Y, 8], yaw: Math.PI / 2 },
  // Level-Haken: Räume getrennt zeichnen (Teleport-Räume liegen nebeneinander in x); Geister werfen keinen Schatten
  // (nur den Blob am Boden – passt zu Gespenstern und spart den Schattenpass)
  setup: (level) => {
    roomCull(level, ROOMS, { far: { spuk: 17, kreisgeist_kreis: 26, kreisgeist: 22 } });
    // Drehraum: Kamera nicht an den Brettern über der Figur hängen lassen
    camThrough(level, 'drehraum:teil', [-66, 39], [-54, 53]);
    for (const e of level.entities) if (GHOSTS.has(e.kind)) e.model?.root.traverse((m) => { if (m.isMesh) m.castShadow = false; });
    // Spuk-Treppen (viele Stufen, oft halb versunken) ohne Sonnenschatten – Budget
    for (const o of level.view?.three.children ?? []) if (o.name === 'modell:spuk_treppe') o.traverse((m) => { if (m.isMesh) m.castShadow = false; });
  },
  camera: [
    // A Spukflur
    { ...CAM, from: 16, to: -18, pitch: 44, dist: 13, area: [-20, 20] },
    { ...CAM, from: -18, to: -35, pitch: 46, dist: 12.5, area: [-20, 20] },
    // D Drehraum (frontal, flacher)
    { from: 58, to: 34, pitch: 30, dist: 15, x: -60, xLock: 0.8, fov: 40, area: [-75, -45] },
    // B Bibliothek
    { ...CAM, from: -30, to: -52, pitch: 46, dist: 13, area: [40, 80] },
    { ...CAM, from: -52, to: -66, pitch: 44, dist: 13.5, area: [40, 80] },
    // C Außenhof 1
    { ...CAM, from: -62, to: -108, pitch: 42, dist: 13, area: [96, 144] },
    // E Stufenhalle
    { ...CAM, from: -126, to: -144, pitch: 46, dist: 13.5, area: [160, 200] },
    { ...CAM, from: -144, to: -162, pitch: 44, dist: 13, area: [160, 200] },
    // F Außenhof 2 und Ziel
    { ...CAM, from: -155, to: -228, pitch: 42, dist: 13, area: [215, 265] },
  ],
  segments: [
    // ---------------- A: Spuk-Gemälde (Warp-Box in der Nische → Drehraum), Sofa-Lift, Spuk-Treppe, Tür
    { type: 'bilderrahmen', id: 'gemaelde', pos: [-5, Y + 0.05, 1.6], yaw: 0, size: [1.6, 2.0], motif: 'spuk', floor: Y,
      warp: { id: 'bild_warp', target: [-60, Y + 0.2, 50.6], pos: [-6.4, Y, 1.6] } },
    { type: 'spuk_sofa', id: 'sofa_lift', pos: [-4.4, Y, -21], yaw: 0, rise: 5.85, speed: 1.7, back: 3 },
    { type: 'pipe', id: 'falsche_roehre', pos: [-4.1, Y + 6.6, -23.5], height: 0.9, radius: 0.72, color: 0x5ab84a },
    { type: 'sign', pos: [-3.4, Y + 6.6, -24.3], text: 'Außer\nBetrieb', yaw: 0.3, size: [1.2, 0.7] },
    { type: 'spuk_treppe', id: 'treppe_a', pos: [0, Y, -25.8], yaw: Math.PI / 2, steps: 8, width: 2.2, rise: 0.25, run: 0.3, from: [0, 0, -3], mode: 'near', near: 6 },
    { type: 'spuk_tuer', id: 'tuerA', pos: [0, Y + 2, -30.75], yaw: FRONT, target: 'tuerB' },
    // Empore: Sofa mit Stempel schwebt hinunter in den Flur
    { type: 'spuk_sofa', id: 'sofa_stempel', pos: [3.9, Y + 7, 1.4], yaw: R, path: [[2.2, Y + 7.2, -0.2], [0.6, Y + 4, -2.6], [0, Y, -4.6]], speed: 1.8, back: 4 },
    { type: 'sign', pos: [-2.6, Y, 9.6], text: 'Mondscheinvilla\nSpuke mögen\nkein Licht!', yaw: 0.25 },
    { type: 'sign', pos: [-3.3, Y, -0.6], text: 'Dieses Bild\nhat Tiefgang …', yaw: 0.6, size: [1.3, 0.7] },

    // ---------------- D: Drehraum
    { type: 'drehraum', id: 'dreh', pos: [-60, Y, 46], size: [10, 12], period: 4, turn: 1.4,
      parts: [{ pos: [-2.2, 0], size: [2.4, 1.4], color: 0x6a3f26 }, { pos: [1.0, 2.2], size: [2.8, 0.5], color: 0x9a6438 }] },

    // ---------------- B: Schieberegale, Spuk-Treppen, Kronleuchter, Tür
    { type: 'spuk_tuer', id: 'tuerB', pos: [67.75, Y, -37], yaw: R, target: 'tuerA' },
    { type: 'buecherregal', id: 'regal_weg', pos: [62.2, Y, -43], yaw: FRONT, width: 2.4, height: 5, slide: [0, -1], range: [0, 2.6] },
    { type: 'buecherregal', id: 'regal_stern', pos: [54, Y, -49], yaw: FRONT, width: 3.8, height: 5, slide: [0, -1], range: [0, 3] },
    { type: 'spuk_treppe', id: 'treppe_b1', pos: [65.4, Y, -52.6], yaw: Math.PI / 2, steps: 8, width: 2, rise: 0.25, run: 0.3, from: [0, -2.1, 0], mode: 'shift', period: 3.5, speed: 4 },
    { type: 'spuk_treppe', id: 'treppe_b2', pos: [65.4, Y + 2, -56.6], yaw: Math.PI / 2, steps: 8, width: 2, rise: 0.25, run: 0.3, from: [0, -2.1, 0], mode: 'shift', period: 3.5, speed: 4, out: true },
    { type: 'kronleuchter', id: 'leuchter_b', pos: [62, Y + 9, -56.4], chain: 1.4, scale: 1.4, axis: 'x', amp: 0.25, period: 3.6 },
    { type: 'spuk_tuer', id: 'tuerB2', pos: [59.5, Y + 4, -62.75], yaw: FRONT, target: 'tuerC' },
    { type: 'sign', pos: [53.4, Y, -41.6], text: 'Regal-\ngasse', yaw: 0.3, size: [1.1, 0.7] },
    { type: 'sign', pos: [64.2, Y, -41.6], text: 'Bitte nicht\nschieben!', yaw: -0.3, size: [1.3, 0.7] },

    // ---------------- C: Außenhof 1 – Graben mit schwebenden Grabplatten
    { type: 'spuk_tuer', id: 'tuerC', pos: [108.25, Y, -74], yaw: 0, target: 'tuerB2' },
    { type: 'platform', style: 'stone', pos: [120, Y - 0.6, -89.8], size: [2.4, 0.6, 2.2] },
    { type: 'platform', style: 'stone', pos: [117.2, Y - 0.2, -92.6], size: [2.2, 0.8, 2.2] },
    { type: 'platform', style: 'stone', pos: [120.4, Y - 0.4, -95.0], size: [2.2, 0.6, 1.6] },
    { type: 'spuk_tuer', id: 'tuerC2', pos: [120, Y, -103.75], yaw: FRONT, target: 'tuerE' },
    { type: 'sign', pos: [111.6, Y, -69.4], text: 'Zum Garten', yaw: 0.6, size: [1.3, 0.6] },

    // ---------------- E: Stufenhalle – Spuk-Treppen steigen im Takt aus dem Boden
    { type: 'spuk_tuer', id: 'tuerE', pos: [172.25, Y, -134], yaw: 0, target: 'tuerC2' },
    { type: 'spuk_treppe', id: 'treppe_e1', pos: [176, Y, -138], yaw: Math.PI / 2, steps: 16, width: 2.4, rise: 0.25, run: 0.25, from: [0, -4.1, 0], mode: 'shift', period: 3.5, speed: 5 },
    { type: 'spuk_treppe', id: 'treppe_e2', pos: [184, Y, -138], yaw: Math.PI / 2, steps: 16, width: 2.4, rise: 0.25, run: 0.25, from: [0, -4.1, 0], mode: 'shift', period: 3.5, speed: 5, out: true },
    { type: 'spuk_treppe', id: 'treppe_e3', pos: [180, Y + 4, -146], yaw: Math.PI / 2, steps: 16, width: 2.6, rise: 0.25, run: 0.25, from: [0, -4.1, 0], mode: 'shift', period: 3.2, speed: 5 },
    { type: 'kronleuchter', id: 'leuchter_e', pos: [186.2, Y + 13, -136.5], chain: 1.6, scale: 1.5, axis: 'z', amp: 0.2, period: 3.4 },
    { type: 'spuk_tuer', id: 'tuerE2', pos: [180, Y + 8, -157.75], yaw: FRONT, target: 'tuerF' },

    // ---------------- F: Außenhof 2 – Steinbrücke, falscher Zielmast, versteckte Treppe zum echten Ziel
    { type: 'spuk_tuer', id: 'tuerF', pos: [228.25, Y, -167], yaw: 0, target: 'tuerE2' },
    { type: 'platform', style: 'stone', pos: [240, Y - 1, -185.5], size: [2.6, 1, 9.2] },
    { type: 'zielmast_spuk', id: 'falsch', pos: [240, Y, -206], height: 7, onTrick: { open: 'zieltreppe' } },
    { type: 'spuk_treppe', id: 'zieltreppe', pos: [240, Y, -208.5], yaw: Math.PI / 2, steps: 26, width: 3, rise: 6.6 / 26, run: 0.25, from: [0, -6.7, 0], mode: 'signal', speed: 3 },
    { type: 'sign', pos: [235.2, Y, -204], text: 'Ziel!\n(ganz ehrlich)', yaw: 0.4, size: [1.3, 0.8] },
  ],
  blocks: [
    { kind: 'question', pos: [-2.4, Y + 3.4, 4], content: 'coins:3' },
    { kind: 'question', pos: [61, Y + 3.4, -37.6], content: 'wachstumsbeere' },
    { kind: 'question', pos: [179, Y + 3.4, -134.8], content: 'coins:3' },
  ],
  enemies: [
    // A: Spuke und ein Großspuk
    { kind: 'spuk', pos: [-3, Y + 0.4, -5] }, { kind: 'spuk', pos: [3.2, Y + 0.4, -10.5] }, { kind: 'spuk', pos: [-2.6, Y + 0.4, -15.5] },
    { kind: 'spuk', size: 2.5, pos: [2, Y, -20.5] }, { kind: 'spuk', pos: [1.5, Y + 0.4, -26.4] },
    // D: Kreisgeister im Drehraum
    { kind: 'kreisgeist_kreis', id: 'ring_dreh', pos: [-60, Y + 0.25, 45.4], count: 6, radius: 2.6, speed: 1.5 },
    { kind: 'kreisgeist', center: [-60, Y + 4.4, 45.4], radius: 3.4, speed: 1.3, cw: true },
    // B: Spuke zwischen den Regalen, Kreisgeist um den Lesetisch
    { kind: 'spuk', pos: [60, Y + 0.4, -39] }, { kind: 'spuk', pos: [65, Y + 0.4, -50] }, { kind: 'spuk', pos: [59.5, Y + 0.4, -56] },
    { kind: 'kreisgeist', center: [59, Y + 0.3, -49.6], radius: 2.3, speed: 1.4 },
    // C: Ring um den Brunnen, zwei über dem Graben
    { kind: 'kreisgeist_kreis', id: 'ring_brunnen', pos: [120, Y + 0.25, -78.5], count: 10, radius: 3.4, speed: 1.5 },
    { kind: 'kreisgeist', path: [[115.6, Y + 0.5, -91.2], [122.4, Y + 0.5, -91.2]], speed: 1.6 },
    { kind: 'kreisgeist', path: [[122.6, Y + 0.6, -93.9], [115.4, Y + 0.6, -93.9]], speed: 1.4 },
    // E: Spuke auf den Stufen
    { kind: 'spuk', pos: [180, Y + 0.4, -133] }, { kind: 'spuk', pos: [175, Y + 4.4, -145] }, { kind: 'spuk', pos: [185.5, Y + 4.4, -147] },
    // F: Ringe, Großspuke, Brücke
    { kind: 'kreisgeist_kreis', id: 'ring_baum', pos: [240, Y + 0.25, -172.5], count: 8, radius: 3.2, speed: 1.4 },
    { kind: 'kreisgeist', path: [[237.2, Y + 0.5, -183], [242.8, Y + 0.5, -183]], speed: 1.5 },
    { kind: 'kreisgeist', path: [[242.8, Y + 0.5, -187.6], [237.2, Y + 0.5, -187.6]], speed: 1.3 },
    { kind: 'kreisgeist_kreis', id: 'ring_platz', pos: [240, Y + 0.25, -197], count: 8, radius: 3.6, speed: 1.6, cw: true },
    { kind: 'spuk', size: 2.5, pos: [234.5, Y, -179] }, { kind: 'spuk', size: 2.5, pos: [246, Y, -200] },
    { kind: 'spuk', pos: [233, Y + 0.4, -192] }, { kind: 'spuk', pos: [247.5, Y + 0.4, -192] },
  ],
  items: [
    // Aufbau-Haken: Gartenlaterne am Eingang von Außenhof 1 baut Wände, Böden, Möbel und Kulisse aller Räume
    hook([110.6, Y, -68.4], scene),
    // Drehraum: Warp-Box zurück auf die Empore (und von dort wieder hinein)
    { kind: 'warpbox', id: 'dreh_warp', pos: [-60, Y, 41.6], target: 'gal_warp' },
    { kind: 'warpbox', id: 'gal_warp', pos: [4, Y + 7, 4.6], target: 'dreh_warp' },
    // Licht-Helme (Bauplan „Lichtbox“): Spukflur, Außenhof 1, Stufenhalle, Außenhof 2
    { kind: 'helm_licht', id: 'licht_a', pos: [2.6, Y, 6.2], respawn: 6 },
    { kind: 'helm_licht', id: 'licht_c', pos: [112, Y, -71.6], respawn: 6 },
    { kind: 'helm_licht', id: 'licht_e', pos: [176, Y, -131.6], respawn: 6 },
    { kind: 'helm_licht', id: 'licht_f', pos: [232, Y, -166], respawn: 6 },
    // A
    line([0, Y + 0.6, 4], [0, Y + 0.6, -3], 4),
    line([0, Y + 0.6, -7], [0, Y + 0.6, -23], 6),
    line([-4, Y + 7.3, -12], [-4, Y + 7.3, -18], 3),
    // D
    ring([-60, Y + 3, 45.4], 1.2, 5),
    // B
    line([66, Y + 0.6, -37], [62.2, Y + 0.6, -41.6], 3),
    ring([62, Y + 7.4, -56.4], 1.0, 6),
    line([62, Y + 0.6, -45], [62, Y + 0.6, -51], 3),
    line([62, Y + 4.6, -61], [66, Y + 4.6, -61], 3),
    // C
    line([111, Y + 0.6, -72], [116, Y + 0.6, -72], 3),
    ...arc([120, Y, -87.6], [120, Y, -89.8], 2, 1.2), ...arc([119, Y, -91], [117.2, Y + 0.6, -92.6], 2, 1.2),
    ...arc([118.4, Y + 0.6, -94], [120.4, Y + 0.2, -95], 2, 1.2), ...arc([120.4, Y + 0.2, -95.8], [120.2, Y, -97.8], 2, 1.2),
    line([120, Y + 0.6, -99], [120, Y + 0.6, -102], 3),
    // E
    line([180, Y + 0.6, -131], [180, Y + 0.6, -136], 3),
    line([176, Y + 1.4, -138.6], [176, Y + 3.8, -141.4], 3),
    line([180, Y + 5.4, -146.6], [180, Y + 7.8, -149.4], 3),
    // F
    line([232, Y + 0.6, -167], [238, Y + 0.6, -167], 3),
    line([240, Y + 0.6, -182.4], [240, Y + 0.6, -189.2], 4),
    line([240, Y + 0.6, -201], [240, Y + 0.6, -204], 3),
  ],
  checkpoint: { pos: [65.5, Y, -46.6], yaw: Math.PI / 2 },
  stars: [
    [-58.8, Y + 5.4, 45.4],            // 0: Drehraum (Gemälde am Anfang → Warp-Box)
    [50.6, Y, -50.2],                  // 1: Nische hinter der Regalgasse ganz links
    [-4.1, Y + 7.5, -23.5],            // 2: falsche Röhre auf dem Sims (Sofa-Lift)
  ],
  stamp: [3.9, Y + 7.85, 1.4],         // auf dem schwebenden Sofa der Empore
  goal: { pos: [240, Y + 6.6, -220], height: 9 },
  marks: {
    start: [0, Y, 8], helm: [2.6, Y, 6.2], gemaelde: [-4.2, Y, 1.6], sofaLift: [-4.4, Y + 0.8, -21], sims: [-4, Y + 6.6, -22.8],
    treppeA: [0, Y, -23.6], tuerA: [0, Y + 2, -29.6], dreh: [-60, Y, 50.4], drehWarp: [-60, Y, 41.6], empore: [4, Y + 7, 4.6],
    bib: [65, Y, -37], regalWeg: [62.2, Y, -41.8], checkpoint: [65.5, Y, -46.6], gasse: [54, Y, -45], nische: [50.6, Y, -50.2],
    treppeB1: [65.4, Y, -51.6], podestB: [65.4, Y + 2, -55.6], galerie: [62, Y + 4, -61], tuerB2: [59.5, Y + 4, -61.6],
    hof1: [110, Y, -74], brunnen: [116.4, Y, -78.5], graben: [120, Y, -87.6], tuerC2: [120, Y, -102.4],
    halle: [174, Y, -134], treppeE1: [176, Y, -136.6], stufe1: [180, Y + 4, -144], treppeE3: [180, Y + 4, -145], stufe2: [180, Y + 8, -152],
    hof2: [230, Y, -167], bruecke: [240, Y, -181.4], platz: [240, Y, -193], falsch: [240, Y, -204.4], zieltreppe: [240, Y, -207.8],
    ziel: [240, Y + 6.6, -218],
  },
};
