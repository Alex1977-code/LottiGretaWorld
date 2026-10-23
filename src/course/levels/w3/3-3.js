// 3-3 „Die Mondscheinvilla“ (Parcours, Thema ghost, Musik course_ghost, 500 s) – Spukhaus nach dem Bauplan (Detail 3-3).
// Schaurig-niedlich statt gruselig: Kerzenleuchter, Spinnweben mit kleinen Spinnen, Gemälde, deren Augen wandern,
// Kürbislaternen, Grabsteine mit Herzchen, ein großer Mond über den Höfen. Licht-Helm (Bauplan „Lichtbox“) am Anfang
// jedes Abschnitts mit Geistern: sein Lichtkegel löst Spuke und Kreisgeister auf.
// Die Räume liegen getrennt (Türen und Warp-Boxen teleportieren), jeder mit eigener Kameraschiene (area) und eigenem
// 32-m-Abschnitt; die Stimmung wechselt je Bereich (Außenhöfe: Nacht mit Mondlicht, view.setMood 'aussen').
//
// Abschnitte (Boden y 1):
//   A  Spukflur        x  −5 … 5,    z  12 … −32   Spuke, Großspuk, Licht-Helm; Spuk-Gemälde links (Warp-Box dahinter);
//                                                  Empore rechts (Rückkehr aus dem Drehraum, Sofa mit Stempel);
//                                                  Sofa-Lift links am Flurende → Sims mit der falschen Röhre;
//                                                  verschiebbare Treppe fährt aus der Wand → Podest → Tür
//   D  Drehraum        x −60,        z  54 … 66    (geheim, hinter dem Gemälde) dreht sich in Vierteldrehungen,
//                                                  Kreisgeister kreisen; Stern oben rechts; Warp-Box → Empore
//   B  Bibliothek      x  52 … 68,   z −37 … −66   Regalreihe mit verschiebbarem Regal (Durchgang), Checkpoint,
//                                                  Lesetisch; ganz links eine Regalgasse – das Regal am Ende lässt
//                                                  sich zurückschieben → Nische mit Stern; Treppenbereich: zwei
//                                                  Spuk-Treppen steigen abwechselnd aus Boden/Podest → Galerie → Tür
//   C  Außenhof 1      x 108 … 132,  z −70 … −104  Brunnen mit Kreisgeist-Ring, Gräber, Kürbisse, Graben mit
//                                                  schwebenden Grabplatten und Kreisgeistern → Tür zurück ins Haus
//   E  Stufenhalle     x 172 … 188,  z −110 … −138 zwei Stufen (je 4 m): Spuk-Treppen steigen im Takt aus dem Boden
//                                                  (zwei im Gegentakt), dann eine auf der ersten Stufe → Außentür
//   F  Außenhof 2      x 228 … 252,  z −142 … −194 Kreisgeist-Ringe, Großspuke, Steinbrücke mit Kreisgeistern,
//                                                  falscher Zielmast („Reingelegt!“, Spuk erscheint) – er öffnet die
//                                                  versteckte Treppe zum echten Ziel
//   G  Echtes Ziel     x 234 … 246,  z −194 … −204 Terrasse (y 5) mit dem richtigen Zielmast
// Sterne: 0 Drehraum (Gemälde am Anfang hineinspringen → Warp-Box), 1 Regalgasse ganz links (Regal zurückschieben),
//         2 falsche Röhre auf dem Sims (Sofa-Lift am Flurende). Stempel: nach Stern 0 auf dem schwebenden Sofa der Empore.
// Gegner: Spuk (12 + 1 vom falschen Zielmast), Großspuk (3), Kreisgeist (36: Ringe 6 / 10 / 8 / 8, einzeln 4).

import {
  levelSetup, line, ring, arc, hauntWall, hauntFloor, cobweb, moonWindow, clock, sideTable, nightLawn, flagstones, graves,
  pumpkins, deadTree, ironFence, fountain, facade, ghostMoods, bake, prop, solid, PAL,
} from './_helpers_c.js';

const Y = 1;
const CAM = { pitch: 44, dist: 13, fov: 40 };
const R = Math.PI;

// ------------------------------------------------------------------ Kulisse (Aufbau-Haken, wird mit verschmolzen)
function scene(level) {
  ghostMoods(level, [
    { min: [95, -110], max: [145, -60], mood: 'aussen' },
    { min: [215, -210], max: [265, -136], mood: 'aussen' },
  ]);
  const V = level.view;
  const lamp = (x, y, z) => V?.addLantern(x, y, z);

  // ================================================================ A  Spukflur
  const pv = PAL.violett;
  hauntFloor(level, { x0: -7.6, x1: 5.6, zA: 12, zB: -32.6, y: Y, depth: 3, rug: [-1.1, 1.1, 10, -24, 0x6a1a3a] });
  hauntWall(level, { face: '+x', at: -5, from: 12, to: 2.8, y: Y, h: 8, pal: pv });
  hauntWall(level, { face: '+x', at: -5, from: 0.4, to: -32.6, y: Y, h: 8, pal: pv });
  hauntWall(level, { face: '+x', at: -5, from: 0.4, to: 2.8, y: Y + 2.6, h: 5.4, pal: pv });          // Sturz über der Nische
  hauntWall(level, { face: '+x', at: -7.4, from: 0.4, to: 2.8, y: Y, h: 2.6, pal: PAL.rot });          // Nischen-Rückwand
  hauntWall(level, { face: '-z', at: 2.8, from: -7.4, to: -5.6, y: Y, h: 2.6, t: 0.3, pal: PAL.rot, visual: false });
  hauntWall(level, { face: '+z', at: 0.4, from: -7.4, to: -5.6, y: Y, h: 2.6, t: 0.3, pal: PAL.rot, visual: false });
  hauntWall(level, { face: '-x', at: 5, from: 12, to: -32.6, y: Y, h: 8, pal: pv });
  hauntWall(level, { face: '+z', at: -32, from: -5.6, to: 5.6, y: Y, h: 8, pal: pv });
  // Podest vor der Tür (y 3)
  hauntFloor(level, { x0: -2.4, x1: 2.4, zA: -29.2, zB: -32, y: Y + 2, depth: 2 });
  moonWindow(level, { pos: [5, Y + 2.2, -6], face: '-x', w: 1.5, h: 2.6 });
  moonWindow(level, { pos: [-5, Y + 2.2, -12], face: '+x', w: 1.5, h: 2.6, curtain: 0x2a4a6a });
  moonWindow(level, { pos: [2.6, Y + 3.0, -32], face: '+z', w: 1.2, h: 2.2 });
  clock(level, { pos: [4.4, Y, -17], yaw: R });
  sideTable(level, -4.3, Y, 7.5); sideTable(level, 4.3, Y, -1.2); sideTable(level, -4.3, Y, -9.5); sideTable(level, 4.3, Y, -26);
  bake(level, [
    { name: 'kerze', opts: { count: 3 }, pos: [-4.3, Y + 0.9, 7.5], state: { anim: 'on' } },
    { name: 'kerze', opts: { count: 3 }, pos: [4.3, Y + 0.9, -1.2], state: { anim: 'on' } },
    { name: 'kerze', opts: { count: 1 }, pos: [-4.3, Y + 0.9, -9.5], state: { anim: 'on' } },
    { name: 'kerze', opts: { count: 3 }, pos: [4.3, Y + 0.9, -26], state: { anim: 'on' } },
    { name: 'kerze', opts: { count: 3 }, pos: [-1.8, Y + 2, -31.4], state: { anim: 'on' } },
    { name: 'kerze', opts: { count: 3 }, pos: [1.8, Y + 2, -31.4], state: { anim: 'on' } },
    { name: 'bilderrahmen', opts: { motif: 'portraet', size: [1.3, 1.7] }, pos: [-4.92, Y + 2.4, 8.4], yaw: 0 },
    { name: 'bilderrahmen', opts: { motif: 'landschaft', size: [1.8, 1.3] }, pos: [4.92, Y + 2.6, 4.2], yaw: R },
    { name: 'bilderrahmen', opts: { motif: 'portraet', size: [1.2, 1.6] }, pos: [-4.92, Y + 2.4, -17.6], yaw: 0 },
    { name: 'bilderrahmen', opts: { motif: 'landschaft', size: [1.6, 1.2] }, pos: [4.92, Y + 2.8, -12.4], yaw: R },
    { name: 'buecherregal', opts: { width: 2, height: 2.6 }, pos: [-4.7, Y, -3.6], yaw: 0 },
  ]);
  prop(level, { name: 'bilderrahmen', opts: { motif: 'spuk', size: [1.2, 1.5] }, pos: [4.92, Y + 2.5, -21.6], yaw: R, state: { anim: 'watch' } });
  for (const [x, y, z] of [[-4.3, Y + 1.3, 7.5], [4.3, Y + 1.3, -1.2], [-4.3, Y + 1.3, -9.5], [4.3, Y + 1.3, -26], [0, Y + 3, -31]]) lamp(x, y, z);
  cobweb(level, [-4.98, Y + 7.8, -31.98], 0, 1.6);
  cobweb(level, [4.98, Y + 7.8, -31.98], -Math.PI / 2, 1.4);
  cobweb(level, [-4.98, Y + 7.8, 11.4], 0, 1.0);
  cobweb(level, [-7.38, Y + 2.5, 0.42], 0, 0.7);
  empore(level, pv);
  simsDeco(level);

  // ================================================================ D  Drehraum (Hülle baut der Baustein)
  lamp(-60, 5, 63);

  // ================================================================ B  Bibliothek
  const pg = PAL.gruen;
  hauntFloor(level, { x0: 49.4, x1: 68.6, zA: -37, zB: -66.6, y: Y, depth: 3, rug: [59.5, 66.5, -38.5, -44.5, 0x2a4a7a] });
  hauntWall(level, { face: '+x', at: 52, from: -37, to: -52.2, y: Y, h: 8, pal: pg });
  hauntWall(level, { face: '+x', at: 52, from: -54.2, to: -66.6, y: Y, h: 8, pal: pg });
  hauntWall(level, { face: '+x', at: 52, from: -52.2, to: -54.2, y: Y + 2.8, h: 5.2, pal: pg });     // Sturz über der Nische
  hauntWall(level, { face: '+x', at: 49.6, from: -51.6, to: -54.8, y: Y, h: 2.8, pal: PAL.rot });    // Nische (Rückwand)
  hauntWall(level, { face: '-z', at: -51.6, from: 49.4, to: 51.4, y: Y, h: 2.8, t: 0.3, pal: PAL.rot, visual: false });
  hauntWall(level, { face: '+z', at: -54.8, from: 49.4, to: 51.4, y: Y, h: 2.8, t: 0.3, pal: PAL.rot, visual: false });
  hauntWall(level, { face: '-x', at: 68, from: -37, to: -66.6, y: Y, h: 8, pal: pg });
  hauntWall(level, { face: '+z', at: -66, from: 51.4, to: 68.6, y: Y, h: 8, pal: pg });
  // feste Regalreihe 1 (z −46) mit Lücke für das Schieberegal, Regalgasse ganz links (x 56 … 56,5)
  solid(level, 56.5, 61, Y, Y + 5, -45.75, -46.25, { tag: 'regal' });
  solid(level, 63.4, 68, Y, Y + 5, -45.75, -46.25, { tag: 'regal' });
  solid(level, 56, 56.5, Y, Y + 5, -44, -60, { tag: 'regal' });
  // Mittelpodest (y 3) und Galerie (y 5) im Treppenbereich
  hauntFloor(level, { x0: 63.5, x1: 67.6, zA: -58, zB: -62, y: Y + 2, depth: 2 });
  hauntFloor(level, { x0: 56.5, x1: 68, zA: -62, zB: -66, y: Y + 4, depth: 4 });
  // Regalgasse: Rückwand (Sackgasse hinter der Nische)
  solid(level, 52, 56, Y, Y + 5, -55.75, -56.25, { tag: 'regal' });
  moonWindow(level, { pos: [68, Y + 2.4, -50], face: '-x', w: 1.4, h: 2.6, curtain: 0x2a5a3a });
  moonWindow(level, { pos: [62.5, Y + 5.2, -66], face: '+z', w: 1.3, h: 2.2, curtain: 0x2a5a3a });
  clock(level, { pos: [67.3, Y, -43.4], yaw: R });
  sideTable(level, 59, Y, -52.6, 2, 1.1);
  bake(level, [
    // Regale: Reihe 1 (Bücher zur Kamera), Gasse ganz links (Bücher zur Gasse), an den Wänden
    ...[57.6, 59.8, 64.5, 66.8].map((x) => ({ name: 'buecherregal', opts: { width: 2.2, height: 5 }, pos: [x, Y, -46], yaw: -Math.PI / 2 })),
    ...[-45.2, -47.6, -50, -52.4, -54.8, -57.2, -59].map((z) => ({ name: 'buecherregal', opts: { width: 2.3, height: 5 }, pos: [56.25, Y, z], yaw: R })),
    ...[-39, -41.4, -43.8].map((z) => ({ name: 'buecherregal', opts: { width: 2.3, height: 3.2 }, pos: [52.3, Y, z], yaw: 0 })),
    ...[-56.8, -59.2, -61.6].map((z) => ({ name: 'buecherregal', opts: { width: 2.3, height: 3.2 }, pos: [52.3, Y, z], yaw: 0 })),
    ...[58, 60.4].map((x) => ({ name: 'buecherregal', opts: { width: 2.3, height: 3 }, pos: [x, Y + 4, -65.7], yaw: -Math.PI / 2 })),
    { name: 'buecherregal', opts: { width: 2.2, height: 3.4 }, pos: [67.7, Y, -55], yaw: R },
    { name: 'kerze', opts: { count: 3 }, pos: [59, Y + 0.9, -52.6], state: { anim: 'on' } },
    { name: 'kerze', opts: { count: 1 }, pos: [50.4, Y, -53.2], state: { anim: 'on' } },
    { name: 'kerze', opts: { count: 3 }, pos: [66.6, Y + 2, -58.6], state: { anim: 'on' } },
    { name: 'bilderrahmen', opts: { motif: 'portraet', size: [1.3, 1.7] }, pos: [67.92, Y + 3.2, -60.6], yaw: R },
    { name: 'bilderrahmen', opts: { motif: 'landschaft', size: [1.8, 1.3] }, pos: [52.08, Y + 4.6, -48], yaw: 0 },
  ]);
  prop(level, { name: 'bilderrahmen', opts: { motif: 'spuk', size: [1.2, 1.6] }, pos: [67.92, Y + 3.6, -40.2], yaw: R, state: { anim: 'watch' } });
  libraryDeco(level);
  for (const [x, y, z] of [[59, Y + 1.4, -52.6], [50.4, Y + 1, -53.2], [66.6, Y + 3.2, -58.6], [62, Y + 6, -64]]) lamp(x, y, z);
  cobweb(level, [52.02, Y + 7.8, -65.98], 0, 1.5);
  cobweb(level, [67.98, Y + 7.8, -65.98], -Math.PI / 2, 1.2);
  cobweb(level, [49.62, Y + 2.7, -51.62], 0, 0.8);

  // ================================================================ C  Außenhof 1
  nightLawn(level, { x0: 108, x1: 132, zA: -68, zB: -88, y: Y, depth: 4 });
  nightLawn(level, { x0: 108, x1: 132, zA: -97, zB: -104.6, y: Y, depth: 4 });
  facade(level, { face: '+x', at: 108, from: -66, to: -104.6, y: Y, h: 9, windows: [-70.5, -83, -92, -99.5] });
  facade(level, { face: '+z', at: -104, from: 107.2, to: 132.6, y: Y, h: 9, windows: [112.5, 126.5] });
  fountain(level, { pos: [120, Y, -79.5], r: 1.6 });
  flagstones(level, [[110, -74], [116, -74], [116.6, -84.6], [120, -87.6]], Y, 2);
  flagstones(level, [[120, -96.5], [120, -102.5]], Y, 2.4);
  graves(level, [
    { pos: [113.5, Y, -79.5], yaw: 0.2, kind: 'rund' }, { pos: [114, Y, -84.5], yaw: -0.2, kind: 'herz', tilt: 0.06 },
    { pos: [126.5, Y, -73.6], yaw: 0.1, kind: 'kreuz' }, { pos: [128.6, Y, -82.6], yaw: -0.3, kind: 'rund', tilt: -0.08 },
    { pos: [126.4, Y, -86.2], yaw: 0.3, kind: 'herz' }, { pos: [111.4, Y, -100.6], yaw: 0, kind: 'rund' },
  ]);
  pumpkins(level, [
    { pos: [110.2, Y, -77], yaw: 0.3 }, { pos: [118.6, Y, -71.2], yaw: 1.2, size: 0.55 }, { pos: [130.4, Y, -76], yaw: 2.2 },
    { pos: [123.8, Y, -86.6], yaw: 1.6, size: 0.38 }, { pos: [116.4, Y, -97.6], yaw: 1.3 }, { pos: [124.4, Y, -97.4], yaw: 1.9, size: 0.5 },
  ]);
  deadTree(level, { pos: [130, Y, -70.6], size: 1.1, yaw: 2.4 });
  deadTree(level, { pos: [110.4, Y, -87], size: 0.9, yaw: 0.4 });
  deadTree(level, { pos: [129.4, Y, -100.4], size: 1, yaw: 2.8 });
  ironFence(level, [132, Y, -68], [132, Y, -88], { solid: true });
  ironFence(level, [132, Y, -96], [132, Y, -104], { solid: true });
  ironFence(level, [108.6, Y, -68], [131.8, Y, -68], { h: 1.0 });
  lamp(120, Y + 2, -79.5);

  // ================================================================ E  Stufenhalle
  const pr = PAL.rot;
  hauntFloor(level, { x0: 171.4, x1: 188.6, zA: -110, zB: -138.6, y: Y, depth: 3, rug: [177, 183, -110.5, -117.5, 0x6a1a3a] });
  hauntFloor(level, { x0: 172, x1: 188, zA: -122, zB: -138, y: Y + 4, depth: 4 });
  hauntFloor(level, { x0: 172, x1: 188, zA: -130, zB: -138, y: Y + 8, depth: 4 });
  hauntWall(level, { face: '+x', at: 172, from: -110, to: -138.6, y: Y, h: 13, pal: pr });
  hauntWall(level, { face: '-x', at: 188, from: -110, to: -138.6, y: Y, h: 13, pal: pr });
  hauntWall(level, { face: '+z', at: -138, from: 171.4, to: 188.6, y: Y, h: 13, pal: pr });
  moonWindow(level, { pos: [188, Y + 6.2, -126], face: '-x', w: 1.6, h: 3 });
  moonWindow(level, { pos: [172, Y + 6.2, -126], face: '+x', w: 1.6, h: 3 });
  moonWindow(level, { pos: [176.5, Y + 10.2, -138], face: '+z', w: 1.4, h: 2.4 });
  clock(level, { pos: [187.3, Y, -113], yaw: R });
  sideTable(level, 172.8, Y, -116.5); sideTable(level, 187.2, Y + 4, -125.4);
  bake(level, [
    { name: 'kerze', opts: { count: 3 }, pos: [172.8, Y + 0.9, -116.5], state: { anim: 'on' } },
    { name: 'kerze', opts: { count: 3 }, pos: [187.2, Y + 4.9, -125.4], state: { anim: 'on' } },
    { name: 'kerze', opts: { count: 3 }, pos: [177.6, Y + 8, -137.4], state: { anim: 'on' } },
    { name: 'kerze', opts: { count: 3 }, pos: [182.4, Y + 8, -137.4], state: { anim: 'on' } },
    { name: 'bilderrahmen', opts: { motif: 'portraet', size: [1.6, 2.1] }, pos: [172.08, Y + 2.3, -120], yaw: 0 },
    { name: 'bilderrahmen', opts: { motif: 'landschaft', size: [2.2, 1.5] }, pos: [187.92, Y + 2.6, -118], yaw: R },
    { name: 'bilderrahmen', opts: { motif: 'portraet', size: [1.3, 1.7] }, pos: [172.08, Y + 6.4, -133], yaw: 0 },
  ]);
  prop(level, { name: 'bilderrahmen', opts: { motif: 'spuk', size: [1.4, 1.8] }, pos: [187.92, Y + 6.3, -133], yaw: R, state: { anim: 'watch' } });
  for (const [x, y, z] of [[172.8, Y + 1.4, -116.5], [187.2, Y + 5.4, -125.4], [180, Y + 9.5, -137]]) lamp(x, y, z);
  cobweb(level, [172.02, Y + 12.8, -137.98], 0, 1.8);
  cobweb(level, [187.98, Y + 12.8, -137.98], -Math.PI / 2, 1.5);
  hallDeco(level);

  // ================================================================ F  Außenhof 2 und G  Ziel
  nightLawn(level, { x0: 228, x1: 252, zA: -140, zB: -160, y: Y, depth: 4 });
  nightLawn(level, { x0: 228, x1: 252, zA: -169, zB: -194, y: Y, depth: 4 });
  nightLawn(level, { x0: 233, x1: 247, zA: -194, zB: -205, y: Y + 6.6, depth: 10 });
  facade(level, { face: '+x', at: 228, from: -138, to: -194, y: Y, h: 10, windows: [-143, -152, -175, -186] });
  facade(level, { face: '+z', at: -205, from: 227.2, to: 252.8, y: Y + 6.6, h: 9, windows: [230.5, 249.5] });
  flagstones(level, [[230, -146], [238, -146], [240, -158]], Y, 2);
  flagstones(level, [[240, -170], [240, -181], [240, -190]], Y, 2.4);
  graves(level, [
    { pos: [233, Y, -156], yaw: 0.3, kind: 'kreuz' }, { pos: [246.5, Y, -144.5], yaw: -0.2, kind: 'herz' },
    { pos: [233.6, Y, -172.4], yaw: 0.2, kind: 'rund', tilt: 0.07 }, { pos: [249.2, Y, -184], yaw: -0.4, kind: 'rund' },
    { pos: [246.6, Y, -172], yaw: 0.1, kind: 'herz' },
  ]);
  pumpkins(level, [
    { pos: [231, Y, -149.4], yaw: 0.4 }, { pos: [249.6, Y, -150.4], yaw: 2.8, size: 0.55 }, { pos: [236.6, Y, -181.6], yaw: 1.2 },
    { pos: [244.2, Y, -181.8], yaw: 1.9 }, { pos: [235.6, Y + 6.6, -196], yaw: 1.4, size: 0.5 }, { pos: [244.4, Y + 6.6, -196], yaw: 1.7, size: 0.5 },
  ]);
  deadTree(level, { pos: [240, Y, -151.5], size: 1.2, yaw: 1.2 });
  deadTree(level, { pos: [250, Y, -164.4], size: 0.9, yaw: 2.6, lantern: false });
  deadTree(level, { pos: [230.6, Y, -190], size: 1, yaw: 0.2 });
  ironFence(level, [252, Y, -140], [252, Y, -160], { solid: true });
  ironFence(level, [252, Y, -169], [252, Y, -194], { solid: true });
  ironFence(level, [228.6, Y, -140], [251.8, Y, -140], { h: 1.0 });
  ironFence(level, [233, Y + 6.6, -194.2], [237.8, Y + 6.6, -194.2], { h: 1.0, solid: true });
  ironFence(level, [242.2, Y + 6.6, -194.2], [247, Y + 6.6, -194.2], { h: 1.0, solid: true });
  lamp(240, Y + 3, -151.5); lamp(240, Y + 8.6, -200);
}

/** Empore rechts im Spukflur (y 8): Balkon mit Geländer und Konsolen. */
function empore(level, pal) {
  bake(level, [{ name: 'kerze', opts: { count: 1 }, pos: [4.6, Y + 7, 6.0], state: { anim: 'on' } }]);
  if (!level.view) return;
  // Brüstung (Optik) an der offenen Seite, Konsolen unter dem Balkon
  hauntWall(level, { face: '-x', at: 3.02, from: 6.4, to: 3.4, y: Y + 7, h: 0.9, t: 0.08, pal, visual: true });
  hauntFloor(level, { x0: 3, x1: 5, zA: 6.4, zB: -2, y: Y + 7, depth: 0.4 });
  level.view.addLantern(4.4, Y + 8, 6);
}

/** Sims mit der falschen Röhre (Optik: Bretter, Konsolen). */
function simsDeco(level) {
  hauntFloor(level, { x0: -5, x1: -3, zA: -22.2, zB: -24.6, y: Y + 6.6, depth: 0.4 });
}

/** Bibliothek: Leseecke, Globus, Bücherstapel, Leiter, Sessel. */
function libraryDeco(level) {
  if (!level.view) return;
  bake(level, [
    { name: 'kerze', opts: { count: 1 }, pos: [65.2, Y, -48.4], state: { anim: 'on' } },
  ]);
}

/** Stufenhalle: Läufer auf den Stufen, Rüstungen? (schlicht gehalten: Budget). */
function hallDeco(level) {
  void level;
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
  setup: levelSetup(scene),
  camera: [
    // A Spukflur
    { ...CAM, from: 16, to: -18, pitch: 44, dist: 13, area: [-20, 20] },
    { ...CAM, from: -18, to: -36, pitch: 46, dist: 12.5, area: [-20, 20] },
    // D Drehraum (frontal, flacher)
    { from: 72, to: 50, pitch: 30, dist: 15, x: -60, xLock: 0.8, fov: 40, area: [-75, -45] },
    // B Bibliothek
    { ...CAM, from: -34, to: -56, pitch: 46, dist: 13, area: [40, 80] },
    { ...CAM, from: -56, to: -70, pitch: 44, dist: 13.5, area: [40, 80] },
    // C Außenhof 1
    { ...CAM, from: -66, to: -108, pitch: 42, dist: 13, area: [96, 144] },
    // E Stufenhalle
    { ...CAM, from: -106, to: -124, pitch: 46, dist: 13.5, area: [160, 200] },
    { ...CAM, from: -124, to: -142, pitch: 44, dist: 13, area: [160, 200] },
    // F Außenhof 2 und Ziel
    { ...CAM, from: -136, to: -210, pitch: 42, dist: 13, area: [215, 265] },
  ],
  segments: [
    // ---------------- A: Spuk-Gemälde (Warp-Box in der Nische → Drehraum), Sofa-Lift, Spuk-Treppe, Tür
    { type: 'bilderrahmen', id: 'gemaelde', pos: [-5, Y + 0.05, 1.6], yaw: 0, size: [1.6, 2.0], motif: 'spuk', floor: Y,
      warp: { id: 'bild_warp', target: [-60, Y + 0.2, 64.6] } },
    { type: 'spuk_sofa', id: 'sofa_lift', pos: [-4.4, Y, -21], yaw: 0, rise: 5.85, speed: 1.7, back: 3 },
    { type: 'pipe', id: 'falsche_roehre', pos: [-4.1, Y + 6.6, -23.5], height: 0.9, radius: 0.72, color: 0x5ab84a },
    { type: 'sign', pos: [-3.5, Y + 6.6, -24.3], text: 'Außer\nBetrieb', yaw: 0.3, size: [1.2, 0.7] },
    { type: 'spuk_treppe', id: 'treppe_a', pos: [0, Y, -26.8], yaw: Math.PI / 2, steps: 8, width: 2.2, rise: 0.25, run: 0.3, from: [0, 0, -3], mode: 'near', near: 6 },
    { type: 'spuk_tuer', id: 'tuerA', pos: [0, Y + 2, -31.75], yaw: -Math.PI / 2, target: 'tuerB' },
    // Empore: Warp-Box zurück, Sofa mit Stempel schwebt hinunter in den Flur
    { type: 'spuk_sofa', id: 'sofa_stempel', pos: [3.9, Y + 7, 1.4], yaw: R, path: [[2.2, Y + 7.2, -0.2], [0.6, Y + 4, -2.6], [0, Y, -4.6]], speed: 1.8, back: 4 },
    { type: 'sign', pos: [-2.6, Y, 9.6], text: 'Mondscheinvilla\nSpuke mögen\nkein Licht!', yaw: 0.25 },

    // ---------------- D: Drehraum
    { type: 'drehraum', id: 'dreh', pos: [-60, Y, 60], size: [10, 12], period: 4, turn: 1.4,
      parts: [{ pos: [-3, 0], size: [2.2, 1.4], color: 0x8a5a3a }, { pos: [3, 3.2], size: [2.6, 0.5], color: 0xc89a5a }] },

    // ---------------- B: Schieberegale, Spuk-Treppen, Kronleuchter, Tür
    { type: 'spuk_tuer', id: 'tuerB', pos: [67.75, Y, -40], yaw: R, target: 'tuerA' },
    { type: 'buecherregal', id: 'regal_weg', pos: [62.2, Y, -46], yaw: -Math.PI / 2, width: 2.4, height: 5, slide: [0, -1], range: [0, 2.6] },
    { type: 'buecherregal', id: 'regal_stern', pos: [54, Y, -52], yaw: -Math.PI / 2, width: 3.8, height: 5, slide: [0, -1], range: [0, 3] },
    { type: 'spuk_treppe', id: 'treppe_b1', pos: [65.4, Y, -55.6], yaw: Math.PI / 2, steps: 8, width: 2, rise: 0.25, run: 0.3, from: [0, -2.1, 0], mode: 'shift', period: 3 },
    { type: 'spuk_treppe', id: 'treppe_b2', pos: [65.4, Y + 2, -59.6], yaw: Math.PI / 2, steps: 8, width: 2, rise: 0.25, run: 0.3, from: [0, -2.1, 0], mode: 'shift', period: 3, out: true },
    { type: 'kronleuchter', id: 'leuchter_b', pos: [62, Y + 9, -59.4], chain: 1.4, scale: 1.4, axis: 'x', amp: 0.25, period: 3.6 },
    { type: 'spuk_tuer', id: 'tuerB2', pos: [59.5, Y + 4, -65.75], yaw: -Math.PI / 2, target: 'tuerC' },
    { type: 'sign', pos: [53.4, Y, -44.6], text: 'Regal-\ngasse', yaw: 0.3, size: [1.1, 0.7] },

    // ---------------- C: Außenhof 1 – Graben mit schwebenden Grabplatten
    { type: 'spuk_tuer', id: 'tuerC', pos: [108.25, Y, -76], yaw: 0, target: 'tuerB2' },
    { type: 'platform', style: 'stone', pos: [120, Y - 0.6, -89.8], size: [2.4, 0.6, 2.2] },
    { type: 'platform', style: 'stone', pos: [117.2, Y - 0.2, -92.6], size: [2.2, 0.8, 2.2] },
    { type: 'platform', style: 'stone', pos: [120.4, Y - 0.4, -95.0], size: [2.2, 0.6, 1.6] },
    { type: 'spuk_tuer', id: 'tuerC2', pos: [120, Y, -103.75], yaw: -Math.PI / 2, target: 'tuerE' },
    { type: 'sign', pos: [111.6, Y, -71.4], text: 'Zum Garten', yaw: 0.6, size: [1.3, 0.6] },

    // ---------------- E: Stufenhalle – Spuk-Treppen steigen im Takt aus dem Boden
    { type: 'spuk_tuer', id: 'tuerE', pos: [172.25, Y, -114], yaw: 0, target: 'tuerC2' },
    { type: 'spuk_treppe', id: 'treppe_e1', pos: [176, Y, -118], yaw: Math.PI / 2, steps: 16, width: 2.4, rise: 0.25, run: 0.25, from: [0, -4.1, 0], mode: 'shift', period: 3 },
    { type: 'spuk_treppe', id: 'treppe_e2', pos: [184, Y, -118], yaw: Math.PI / 2, steps: 16, width: 2.4, rise: 0.25, run: 0.25, from: [0, -4.1, 0], mode: 'shift', period: 3, out: true },
    { type: 'spuk_treppe', id: 'treppe_e3', pos: [180, Y + 4, -126], yaw: Math.PI / 2, steps: 16, width: 2.6, rise: 0.25, run: 0.25, from: [0, -4.1, 0], mode: 'shift', period: 2.6 },
    { type: 'kronleuchter', id: 'leuchter_e', pos: [180, Y + 13, -119], chain: 1.6, scale: 1.5, axis: 'z', amp: 0.2, period: 3.4 },
    { type: 'spuk_tuer', id: 'tuerE2', pos: [180, Y + 8, -137.75], yaw: -Math.PI / 2, target: 'tuerF' },

    // ---------------- F: Außenhof 2 – Steinbrücke, falscher Zielmast, versteckte Treppe zum echten Ziel
    { type: 'spuk_tuer', id: 'tuerF', pos: [228.25, Y, -146], yaw: 0, target: 'tuerE2' },
    { type: 'platform', style: 'stone', pos: [240, Y - 1, -164.5], size: [2.6, 1, 9.2] },
    { type: 'zielmast_spuk', id: 'falsch', pos: [240, Y, -186], height: 7, onTrick: { open: 'zieltreppe' } },
    { type: 'spuk_treppe', id: 'zieltreppe', pos: [240, Y, -187.5], yaw: Math.PI / 2, steps: 26, width: 3, rise: 6.6 / 26, run: 0.25, from: [0, -6.7, 0], mode: 'signal', speed: 3 },
    { type: 'sign', pos: [235.2, Y, -183], text: 'Ziel!\n(ganz ehrlich)', yaw: 0.4, size: [1.3, 0.8] },
  ],
  blocks: [
    { kind: 'question', pos: [-2.4, Y + 3.4, 4], content: 'coins:3' },
    { kind: 'question', pos: [61, Y + 3.4, -40.6], content: 'wachstumsbeere' },
    { kind: 'question', pos: [176, Y + 3.4, -112.6], content: 'coins:3' },
  ],
  enemies: [
    // A: Spuke und ein Großspuk
    { kind: 'spuk', pos: [-3, Y + 0.4, -5] }, { kind: 'spuk', pos: [3.2, Y + 0.4, -10.5] }, { kind: 'spuk', pos: [-2.6, Y + 0.4, -15.5] },
    { kind: 'spuk', size: 2.5, pos: [2, Y, -20.5] }, { kind: 'spuk', pos: [1.5, Y + 0.4, -27.4] },
    // D: Kreisgeister im Drehraum
    { kind: 'kreisgeist_kreis', id: 'ring_dreh', pos: [-60, Y + 0.25, 59.4], count: 6, radius: 2.6, speed: 1.5 },
    { kind: 'kreisgeist', center: [-60, Y + 4.4, 59.4], radius: 3.4, speed: 1.3, cw: true },
    // B: Spuke zwischen den Regalen, Kreisgeist um den Lesetisch
    { kind: 'spuk', pos: [60, Y + 0.4, -42] }, { kind: 'spuk', pos: [65, Y + 0.4, -53] }, { kind: 'spuk', pos: [59.5, Y + 0.4, -59] },
    { kind: 'kreisgeist', center: [59, Y + 0.3, -52.6], radius: 2.2, speed: 1.4 },
    // C: Ring um den Brunnen, zwei über dem Graben
    { kind: 'kreisgeist_kreis', id: 'ring_brunnen', pos: [120, Y + 0.25, -79.5], count: 10, radius: 3.4, speed: 1.5 },
    { kind: 'kreisgeist', path: [[115.6, Y + 0.5, -91.8], [122.4, Y + 0.5, -91.8]], speed: 1.6 },
    { kind: 'kreisgeist', path: [[122.6, Y + 0.6, -94.4], [115.4, Y + 0.6, -94.4]], speed: 1.4 },
    // E: Spuke auf den Stufen
    { kind: 'spuk', pos: [180, Y + 0.4, -113] }, { kind: 'spuk', pos: [175, Y + 4.4, -125] }, { kind: 'spuk', pos: [185.5, Y + 4.4, -127] },
    // F: Ringe, Großspuke, Brücke
    { kind: 'kreisgeist_kreis', id: 'ring_baum', pos: [240, Y + 0.25, -151.5], count: 8, radius: 3.2, speed: 1.4 },
    { kind: 'kreisgeist', path: [[237.2, Y + 0.5, -162], [242.8, Y + 0.5, -162]], speed: 1.5 },
    { kind: 'kreisgeist', path: [[242.8, Y + 0.5, -166.6], [237.2, Y + 0.5, -166.6]], speed: 1.3 },
    { kind: 'kreisgeist_kreis', id: 'ring_platz', pos: [240, Y + 0.25, -176], count: 8, radius: 3.6, speed: 1.6, cw: true },
    { kind: 'spuk', size: 2.5, pos: [234.5, Y, -158] }, { kind: 'spuk', size: 2.5, pos: [246, Y, -179] },
    { kind: 'spuk', pos: [233, Y + 0.4, -168] }, { kind: 'spuk', pos: [247.5, Y + 0.4, -168] },
  ],
  items: [
    // Drehraum: Warp-Box zurück auf die Empore (und von dort wieder hinein)
    { kind: 'warpbox', id: 'dreh_warp', pos: [-57.4, Y, 64.4], target: 'gal_warp' },
    { kind: 'warpbox', id: 'gal_warp', pos: [4, Y + 7, 4.6], target: 'dreh_warp' },
    // Licht-Helme (Bauplan „Lichtbox“): Spukflur, Außenhof 1, Stufenhalle, Außenhof 2
    { kind: 'helm_licht', id: 'licht_a', pos: [2.6, Y, 6.2], respawn: 6 },
    { kind: 'helm_licht', id: 'licht_c', pos: [112, Y, -73.6], respawn: 6 },
    { kind: 'helm_licht', id: 'licht_e', pos: [176, Y, -111.6], respawn: 6 },
    { kind: 'helm_licht', id: 'licht_f', pos: [232, Y, -145], respawn: 6 },
    // A
    line([0, Y + 0.6, 4], [0, Y + 0.6, -3], 4),
    line([0, Y + 0.6, -7], [0, Y + 0.6, -24], 7),
    ring([0, Y + 3.6, -14], 1.4, 6),
    line([-4, Y + 7.3, -12], [-4, Y + 7.3, -18], 3),
    // D
    ring([-60, Y + 3, 59.4], 1.2, 5),
    // B
    line([66, Y + 0.6, -40], [62.2, Y + 0.6, -44.6], 3),
    ring([62, Y + 7.4, -59.4], 1.0, 6),
    line([62, Y + 0.6, -48], [62, Y + 0.6, -54], 3),
    line([62, Y + 4.6, -64], [66, Y + 4.6, -64], 3),
    // C
    line([111, Y + 0.6, -74], [116, Y + 0.6, -74], 3),
    ...arc([120, Y, -87.6], [120, Y, -89.8], 2, 1.2), ...arc([119, Y, -91], [117.2, Y + 0.6, -92.6], 2, 1.2),
    ...arc([118.4, Y + 0.6, -94], [120.4, Y + 0.2, -95], 2, 1.2), ...arc([120.4, Y + 0.2, -95.8], [120.2, Y, -97.8], 2, 1.2),
    line([120, Y + 0.6, -98], [120, Y + 0.6, -102], 3),
    // E
    line([180, Y + 0.6, -111], [180, Y + 0.6, -116], 3),
    line([176, Y + 3.0, -118.5], [176, Y + 4.8, -121.5], 3),
    line([180, Y + 6.8, -126.6], [180, Y + 8.8, -129.6], 3),
    // F
    line([232, Y + 0.6, -146], [238, Y + 0.6, -146], 3),
    line([240, Y + 0.6, -161], [240, Y + 0.6, -168.6], 5),
    line([240, Y + 0.6, -183], [240, Y + 0.6, -188.6], 3),
  ],
  checkpoint: { pos: [65.5, Y, -49.6], yaw: Math.PI / 2 },
  stars: [
    [-57, Y + 6.4, 59.4],              // 0: Drehraum (Gemälde am Anfang → Warp-Box)
    [50.6, Y, -53.2],                  // 1: Nische hinter der Regalgasse ganz links
    [-4.1, Y + 7.5, -23.5],            // 2: falsche Röhre auf dem Sims (Sofa-Lift)
  ],
  stamp: [3.9, Y + 7.85, 1.4],         // auf dem schwebenden Sofa der Empore
  goal: { pos: [240, Y + 6.6, -200], height: 9 },
  marks: {
    start: [0, Y, 8], helm: [2.6, Y, 6.2], gemaelde: [-4.2, Y, 1.6], sofaLift: [-4.4, Y + 0.8, -21], sims: [-4, Y + 6.6, -22.8],
    treppeA: [0, Y, -24.6], tuerA: [0, Y + 2, -30.6], dreh: [-60, Y, 64.4], empore: [4, Y + 7, 4.6],
    bib: [65, Y, -40], regalWeg: [62.2, Y, -44.8], checkpoint: [65.5, Y, -49.6], gasse: [54, Y, -48], nische: [50.6, Y, -53.2],
    treppeB1: [65.4, Y, -54.6], podestB: [65.4, Y + 2, -58.6], galerie: [62, Y + 4, -64], tuerB2: [59.5, Y + 4, -64.6],
    hof1: [110, Y, -76], brunnen: [116.6, Y, -79.5], graben: [120, Y, -88.2], tuerC2: [120, Y, -102.4],
    halle: [174, Y, -114], treppeE1: [176, Y, -116.6], stufe1: [180, Y + 4, -124], treppeE3: [180, Y + 4, -125], stufe2: [180, Y + 8, -132],
    hof2: [230, Y, -146], bruecke: [240, Y, -160.4], platz: [240, Y, -172], falsch: [240, Y, -184.4], zieltreppe: [240, Y, -186.8],
    ziel: [240, Y + 6.6, -197],
  },
};
