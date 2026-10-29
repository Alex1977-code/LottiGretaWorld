// 8-6 „Finsterfahrt im Spiegelspukhaus“ (parcours, Bauplan 8-6: stockdunkles Spukhaus mit Licht-Helm-Pflicht; Start mit
// 4 Licht-Helmen und runder Aufzugplattform → erste Fahrt mit Spuken, Kreisgeistern, POW-Block; Großspuk am Ende mit Licht
// besiegen, großer Spiegel → zweite Fahrt, roter Ring → Checkpoint-Raum, schnell steigende Plattform an Statuen vorbei →
// Türreihe, Großspuk jagt zur Ausgangstür; Sprung auf den Zielmast; 400 s). Thema darkghost, Musik course_beamdark,
// 3 Sterne + Stempel. Level verläuft nach −Z; Böden y 1, oberes Stockwerk y 15.
//
// Abschnitte:
//   A Helmhalle       z  +7 …   −9   vier Licht-Helme am Regal, Kerzen, Läufer; Figurenschalter (nur Greta) lässt eine
//                                    rosa Leuchttreppe zur Empore mit dem Stempel erscheinen; runde Aufzugplattform 1
//   B Erste Fahrt     z  −9 …  −66   die runde Plattform (fährt los, sobald man draufsteht) schwebt durchs Dunkel an
//                                    Kerzen-Inseln vorbei; drei Kreisgeist-Ringe, drei Spuke, Knochenflieger; der POW-Block
//                                    fährt mit – seine Erschütterung lässt die kleinen Geister im Umkreis verpuffen
//   C Spiegelsaal     z −66 …  −87   Großspuk (nur mit Licht zu besiegen) bewacht die Tür; großer Spiegel über dem Graben:
//                                    im Spiegelbild sieht man Stufen und Stern 0, im Saal sind sie unsichtbar
//   D Zweite Fahrt    x  +8 …  +16   Aufzugplattform 2 mit rotem Ring (acht rote Münzen auf der Fahrt → Extraleben), zwei
//                     z −66 … −126   Kreisgeist-Ringe, Knochenflieger
//   E Checkpoint-Raum z −126 … −146  Kontrollpunkt, schnell steigende Plattform im Statuenschacht; auf halber Höhe links ein
//                                    Sims mit der Rätselbox (Spukzimmer: sechs Spuke mit Licht besiegen → Stern 1)
//   F Türreihe        z −143 … −200  oberes Stockwerk: vier Flügeltüren, einzelne Kreisgeister kreisen dazwischen; am Ende
//   (y 15)                           des Gangs liegt Stern 2; hinter der letzten Tür erwacht Großspuk 2 (Jäger, lauerte in der
//                                    Wand) und jagt zur Ausgangstür (rechts) – wer zum Stern will, muss ihn mit Licht bannen
//   G Ziel            x  +3 …  +15   Balkon hinter der Ausgangstür, Sprung hinüber auf den Turm mit dem Zielmast
// Rätselbox-Raum x 60 … 76, z −134 … −150 (eigene Kameraschiene).
// Sterne: 0 Spiegelbild im großen Spiegel (unsichtbare Spiegelstufen über dem Graben) · 1 Rätselbox: sechs Spuke mit Licht
//         besiegen · 2 Ende des letzten Gangs bei Großspuk 2. Stempel: Figurenschalter für Greta in der Helmhalle.
// Gegner: Spuk 10 + Großspuk 2, Kreisgeist 44 (Ringe 3 × 8 + 2 × 6, einzeln 8), Knochenflieger 10.

import {
  sign, line, coinsAt, aufzugStart, aufzugSchmuck, mitfahren, geisterSchreck, kerzenInseln, helmRegal, bakeParts, blk, cyl, sph, glowPoints,
  levelSetup, farHide,
} from './_helpers_c.js';
import { hauntWall, hauntFloor, cobweb, bookShelf, sideTable, PAL } from '../w3/_helpers_c.js';
import { baronStatue } from '../w4/_helpers_d.js';

const Y = 1, YU = 15;                     // Erdgeschoss, oberes Stockwerk
const R = 2.4;                            // Radius der runden Aufzugplattformen
const P1 = [[0, Y - 0.5, -11.6], [0, Y - 0.5, -22], [-5, Y - 0.5, -28], [-5, Y - 0.5, -40], [1, Y - 0.5, -48], [1, Y - 0.5, -57], [0, Y - 0.5, -63.55]];
const P2 = [[13, Y - 0.5, -72], [13, Y - 0.5, -88], [6, Y - 0.5, -95], [6, Y - 0.5, -108], [0, Y - 0.5, -114], [0, Y - 0.5, -123.55]];
const RB = 68;                            // Rätselbox-Raum (x-Mitte)
const DOORS = [-152, -162, -172, -182];   // Türreihe (z)
const GHOSTS = ['spuk', 'kreisgeist', 'kreisgeist_kreis', 'kreisgeist_glied', 'knochenflieger'];
const RED = [[13, -80], [13, -82.5], [13, -85], [13, -87.5], [11.6, -89.4], [10.1, -90.9], [8.6, -92.4], [7.1, -93.9]];

const kreis = (id, x, z, n, r, o = {}) => ({ kind: 'kreisgeist_kreis', id, pos: [x, Y + 0.25, z], count: n, radius: r, speed: o.speed ?? 1.5, cw: !!o.cw, phase: o.phase ?? 0 });
const einzel = (id, x, y, z, r, o = {}) => ({ kind: 'kreisgeist', id, center: [x, y, z], radius: r, speed: o.speed ?? 1.4, cw: !!o.cw, phase: o.phase ?? 0 });
const flieger = (id, x, y, z, o = {}) => ({ kind: 'knochenflieger', id, center: [x, y, z], radius: o.r ?? 2.8, speed: 2, sight: o.sight ?? 4, reach: o.reach ?? 6, cw: !!o.cw, phase: o.phase ?? 0 });

function build(level) {
  const pv = PAL.violett, pr = PAL.rot, pg = PAL.gruen;
  // ================================================================ A Helmhalle
  hauntFloor(level, { x0: -7, x1: 7, zA: 7, zB: -9.2, y: Y, depth: 3, rug: [-1.2, 1.2, 6.4, -8.8, 0x6a1a3a] });
  hauntWall(level, { face: '+x', at: -7, from: 7, to: -9.2, y: Y, h: 8, pal: pv });
  hauntWall(level, { face: '-x', at: 7, from: 7, to: -9.2, y: Y, h: 8, pal: pv });
  hauntFloor(level, { x0: 4.2, x1: 7, zA: -5.9, zB: -8.9, y: Y + 6.3, depth: 0.6 });          // Empore (Stempel)
  helmRegal(level, { x: -3.6, y: Y, z: 1.2 });
  bookShelf(level, { pos: [-6.6, Y, -4.5], yaw: 0, w: 2.4, h: 3, solid: true, seed: 3 });
  sideTable(level, 6.2, Y, 4.2);
  cobweb(level, [-7, Y + 8, 7], 0, 1.6); cobweb(level, [7, Y + 8, -9.2], Math.PI, 1.4);
  // ================================================================ C Spiegelsaal
  hauntFloor(level, { x0: -8, x1: 8, zA: -65.9, zB: -79, y: Y, depth: 3, rug: [-1.2, 1.2, -66.4, -78.6, 0x3a1a6a] });
  hauntFloor(level, { x0: -4.4, x1: 4.4, zA: -84.4, zB: -86.6, y: Y, depth: 3 });              // Spiegel-Sims hinter dem Graben
  hauntWall(level, { face: '+x', at: -8, from: -65.9, to: -86.6, y: Y, h: 9, pal: pr });
  hauntWall(level, { face: '-x', at: 8, from: -65.9, to: -70.4, y: Y, h: 9, pal: pr });
  hauntWall(level, { face: '-x', at: 8, from: -73.6, to: -86.6, y: Y, h: 9, pal: pr });
  hauntWall(level, { face: '-x', at: 8, from: -70.4, to: -73.6, y: Y + 3.4, h: 5.6, below: 0, pal: pr });
  hauntWall(level, { face: '+z', at: -86.6, from: -8, to: 8, y: Y, h: 9, pal: pr });
  hauntFloor(level, { x0: 8.6, x1: 10.6, zA: -68.6, zB: -75.4, y: Y, depth: 1.2 });            // Anleger der zweiten Fahrt
  // ================================================================ E Checkpoint-Raum mit Statuenschacht
  // Boden; die steigende Plattform steht unten als flache Stufe (0,25 m) darauf
  hauntFloor(level, { x0: -8, x1: 8, zA: -125.9, zB: -146, y: Y, depth: 3, rug: [-1.1, 1.1, -126.4, -139.6, 0x1a4a3a] });
  hauntWall(level, { face: '+x', at: -8, from: -125.9, to: -146, y: Y, h: 15, pal: pg });
  hauntWall(level, { face: '-x', at: 8, from: -125.9, to: -146, y: Y, h: 15, pal: pg });
  hauntWall(level, { face: '+z', at: -146.2, from: -8, to: 8, y: Y, h: 13, pal: pg });
  hauntFloor(level, { x0: -5.8, x1: -2.6, zA: -140.2, zB: -143.4, y: Y + 8, depth: 0.5 });      // Sims der Rätselbox
  hauntFloor(level, { x0: 2.6, x1: 5.8, zA: -139.6, zB: -143.4, y: Y + 4.2, depth: 0.5 });      // Statuen-Sims rechts unten
  hauntFloor(level, { x0: 2.6, x1: 5.8, zA: -139.6, zB: -143.4, y: Y + 11, depth: 0.5 });       // Statuen-Sims rechts oben
  baronStatue(level, { pos: [-5.4, Y, -142.4], yaw: 0.5, size: 0.8 });
  baronStatue(level, { pos: [4.2, Y + 4.2, -141.6], yaw: Math.PI - 0.5, size: 0.62 });
  baronStatue(level, { pos: [4.2, Y + 11, -141.6], yaw: Math.PI - 0.3, size: 0.62, tilt: 0.12 });
  // ================================================================ F Türreihe (oberes Stockwerk)
  hauntFloor(level, { x0: -3, x1: 3, zA: -143.2, zB: -200, y: YU, depth: 1, rug: [-1, 1, -143.6, -199.6, 0x6a1a3a] });
  hauntWall(level, { face: '+x', at: -3, from: -143.2, to: -200, y: YU, h: 5, pal: pv });
  hauntWall(level, { face: '-x', at: 3, from: -143.2, to: -188.4, y: YU, h: 5, pal: pv });
  hauntWall(level, { face: '-x', at: 3, from: -191.6, to: -200, y: YU, h: 5, pal: pv });
  hauntWall(level, { face: '-x', at: 3, from: -188.4, to: -191.6, y: YU + 3.3, h: 1.7, below: 0, pal: pv });
  hauntWall(level, { face: '+z', at: -200, from: -3, to: 3, y: YU, h: 5, pal: pv });
  for (const z of DOORS) {
    hauntWall(level, { face: '+z', at: z, from: -3, to: -1.4, y: YU, h: 5, t: 0.4, pal: pv });
    hauntWall(level, { face: '+z', at: z, from: 1.4, to: 3, y: YU, h: 5, t: 0.4, pal: pv });
    hauntWall(level, { face: '+z', at: z, from: -1.4, to: 1.4, y: YU + 3.3, h: 1.7, t: 0.4, below: 0, pal: pv });
  }
  // ================================================================ G Balkon und Zielturm
  hauntFloor(level, { x0: 3.6, x1: 9, zA: -186.5, zB: -193.5, y: YU, depth: 1 });
  const turm = [];
  turm.push(blk(4, YU - (Y - 8), 4, 13, Y - 8, -190, 0x3a2c44, { top: 0x5a4864 }));
  for (let k = 0; k < 6; k++) turm.push(blk(4.1, 0.14, 4.1, 13, Y - 6 + k * 3.6, -190, 0x5a4864));
  for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) turm.push(blk(0.5, 0.8, 0.5, 13 + dx * 0.9, YU, -190 + dz * 0.9, 0x5a4864, { top: 0xc8983a }));
  bakeParts(level, turm, { castShadow: false });
  level.world.add({ type: 'box', min: [11, Y - 8, -192], max: [15, YU, -188], tag: 'zielturm' });
  // Balkongeländer (niedrig, fest) an der Vorder- und Rückkante
  const rail = [];
  for (const z of [-186.6, -193.4]) {
    rail.push(blk(5.2, 0.1, 0.12, 6.3, YU + 0.9, z, 0xc8983a));
    for (let x = 3.9; x < 9; x += 0.7) rail.push(cyl(0.04, 0.04, 0.9, x, YU, z, 0x2a1e30, 5));
    level.world.add({ type: 'box', min: [3.6, YU, z - 0.1], max: [9, YU + 1, z + 0.1], camIgnore: true, tag: 'gelaender' });
  }
  bakeParts(level, rail, { castShadow: false });
  // ================================================================ Rätselbox-Raum (Spukzimmer)
  hauntFloor(level, { x0: RB - 8, x1: RB + 8, zA: -134, zB: -150, y: Y, depth: 3, rug: [RB - 4, RB + 4, -137, -147, 0x6a1a3a] });
  hauntWall(level, { face: '+x', at: RB - 8, from: -134, to: -150, y: Y, h: 6, pal: pr });
  hauntWall(level, { face: '-x', at: RB + 8, from: -134, to: -150, y: Y, h: 6, pal: pr });
  hauntWall(level, { face: '+z', at: -150, from: RB - 8, to: RB + 8, y: Y, h: 6, pal: pr });
  bookShelf(level, { pos: [RB - 7.5, Y, -144], yaw: 0, w: 2.4, h: 3, solid: true, seed: 7 });
  cobweb(level, [RB - 8, Y + 6, -150], 0, 1.4);
}

function setup(level) {
  aufzugStart(level, 'lift1');
  aufzugStart(level, 'lift2');
  aufzugSchmuck(level, 'lift1', R);
  aufzugSchmuck(level, 'lift2', R);
  mitfahren(level, 'pow1', 'lift1');
  kerzenInseln(level, [
    [-3.6, Y - 0.2, -16], [3.6, Y - 0.4, -26], [-9, Y - 0.4, -30], [-1.4, Y - 0.2, -36], [-9, Y - 0.2, -44], [5.6, Y - 0.3, -44], [-3.4, Y - 0.4, -54], [5, Y, -60],
    [9.4, Y - 0.3, -78], [16.6, Y - 0.2, -92], [9.6, Y - 0.3, -102], [2.4, Y - 0.3, -104], [-3.4, Y - 0.3, -118], [4, Y - 0.2, -120],
  ]);
  // Laternenlicht an den Kerzenleuchtern (deco_w8) und auf dem Balkon
  for (const p of [[-5.6, Y + 1.7, 4.8], [5.6, Y + 1.7, -7.6], [-6.4, Y + 1.7, -67.4], [6.4, Y + 1.7, -67.4], [-3, Y + 1.7, -84.9], [3, Y + 1.7, -84.9],
    [-6.6, Y + 1.7, -128], [6.6, Y + 1.7, -128], [-2.4, YU + 1.7, -147], [2.4, YU + 1.7, -158], [-2.4, YU + 1.7, -168], [2.4, YU + 1.7, -178], [-2.4, YU + 1.7, -192],
    [8.4, YU + 1.7, -187.2], [13, YU + 2.2, -191.6], [RB - 6, Y + 1.7, -136], [RB + 6, Y + 1.7, -136]]) level.view?.addLantern(...p);
  // Kronleuchter schweben über den Fahrten (Kerzen leuchten als Punkte, Laternenlicht an jedem zweiten)
  {
    const KR = [[3.2, -20], [-8.2, -36], [4.6, -50], [9.2, -84], [9.4, -106], [-2.8, -116]];
    const parts = [], flames = [];
    for (const [x, z] of KR) {
      const yk = Y + 6.2;
      parts.push(cyl(0.03, 0.03, 3.4, x, yk + 0.2, z, 0x8a6a2a, 4));
      const ring = cyl(1.0, 1.0, 0.08, x, yk, z, 0xc8983a, 20, { open: true });
      parts.push(ring, cyl(0.25, 0.12, 0.5, x, yk - 0.4, z, 0xc8983a, 8));
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2, cx = x + Math.cos(a) * 1.0, cz = z + Math.sin(a) * 1.0;
        parts.push(cyl(0.05, 0.05, 0.26, cx, yk + 0.06, cz, 0xfff6e0, 6));
        flames.push([cx, yk + 0.42, cz]);
      }
      parts.push(sph(0.12, x, yk - 0.75, z, 0xb8e8ff));
    }
    bakeParts(level, parts, { castShadow: false });
    glowPoints(level, flames, 0xffc860, 0.5, { opacity: 0.95, name: 'kronleuchter-flammen' });
    glowPoints(level, KR.map(([x, z]) => [x, Y + 6.4, z]), 0xff9a40, 4.5, { opacity: 0.3, name: 'kronleuchter-schein' });
    KR.forEach(([x, z], i) => { if (i % 2 === 0) level.view?.addLantern(x, Y + 5.6, z); });
  }
  // Geisteraugen-Schimmer der Ringe (ein Leuchtpunkt je Ring – sichtbar im Dunkel, bevor sie heran sind)
  glowPoints(level, [[5.2, Y + 0.9, -18], [-10.4, Y + 0.9, -34], [6.4, Y + 0.9, -52.5], [18.4, Y + 0.9, -84], [0.6, Y + 0.9, -102]], 0x9ad8ff, 3.6, { opacity: 0.25, name: 'ring-schimmer' });
  farHide(level, ['knochenflieger'], 30);
}

export const LEVEL = {
  id: '8-6',
  world: 8,
  title: 'Finsterfahrt im Spiegelspukhaus',
  archetype: 'parcours',
  theme: 'darkghost',
  music: 'course_beamdark',
  timeLimit: 400,
  start: { pos: [0, Y, 5], yaw: Math.PI / 2 },
  killY: Y - 12,
  build,
  setup: levelSetup(setup),
  instances: { knochenflieger: { shadowDist: 10 }, coin: { shadow: false } },
  camera: [
    { from: 10, to: -9, pitch: 44, dist: 12.5, ahead: 2.2 },
    { from: -9, to: -64, pitch: 46, dist: 13.5, ahead: 2.6 },
    { from: -64, to: -88, pitch: 30, dist: 12.5, height: 1.8, ahead: 2.4, area: [-10, 8.3] },
    { from: -64, to: -88, pitch: 46, dist: 13.5, ahead: 2.6, area: [8.3, 22] },
    { from: -88, to: -125, pitch: 46, dist: 13.5, ahead: 2.6 },
    { from: -125, to: -143, pitch: 40, dist: 14, ahead: 1.6, height: 1.6 },
    { from: -143, to: -202, pitch: 42, dist: 11.5, ahead: 2.6, area: [-4, 3.2] },
    { from: -183, to: -197, pitch: 40, dist: 12.5, ahead: 2.2, area: [3.2, 18] },
    { from: -130, to: -154, pitch: 50, dist: 14, ahead: 1.6, area: [55, 81] },
  ],
  segments: [
    { type: 'killplane', y: Y - 12 },
    // ================================================================ A Helmhalle
    sign(3.2, Y, 5.6, 'Licht-Helm aufsetzen:\nLicht vertreibt Geister!', { size: [3.4, 1.1], yaw: -0.25 }),
    { type: 'leuchtsteg', id: 'stempeltreppe', from: [5.5, Y + 0.6, -0.6], to: [5.5, Y + 5.1, -5.4], n: 6, size: [1.6, 0.3, 1.1], color: 'rosa', hidden: true, always: true },
    { type: 'mover', id: 'lift1', shape: 'cyl', path: P1, size: [2 * R, 0.5, 2 * R], speed: 2.4, idle: true, once: true, color: 0x5a2a7a },
    { type: 'deco_w8', items: [
      { kind: 'kerzenleuchter', pos: [-5.6, Y, 4.8] }, { kind: 'kerzenleuchter', pos: [5.6, Y + 6.3, -7.6] },
      { kind: 'bilderrahmen', pos: [-6.9, Y + 2.4, -1], yaw: 0 }, { kind: 'bilderrahmen', pos: [6.9, Y + 2.4, 0.6], yaw: Math.PI },
      { kind: 'standuhr', pos: [6.2, Y, -2.6], yaw: Math.PI, solid: true },
      { kind: 'spinnennetz', pos: [-6.9, Y + 7.6, -9], yaw: 0 },
    ] },
    // ================================================================ C Spiegelsaal
    { type: 'grosser_spiegel', id: 'spiegel', pos: [0, Y + 1.72, -85.7], size: [3.6, 5], dir: [0, 1], reach: 10, near: 22, star: 'spiegelstern',
      parts: [{ pos: [-1.0, Y + 0.9, -80.4], size: [1.4, 0.3, 1.4] }, { pos: [0.6, Y + 2.1, -82.0], size: [1.4, 0.3, 1.4] }] },
    { type: 'deco_w8', items: [
      { kind: 'kerzenleuchter', pos: [-6.4, Y, -67.4] }, { kind: 'kerzenleuchter', pos: [6.4, Y, -67.4] },
      { kind: 'kerzenleuchter', pos: [-3, Y, -84.9] }, { kind: 'kerzenleuchter', pos: [3, Y, -84.9] },
      { kind: 'standuhr', pos: [-7.3, Y, -76.4], yaw: 0, solid: true },
      { kind: 'bilderrahmen', pos: [-7.9, Y + 2.6, -71], yaw: 0 }, { kind: 'bilderrahmen', pos: [7.9, Y + 2.6, -79], yaw: Math.PI },
      { kind: 'spinnennetz', pos: [-7.9, Y + 8.6, -86.4], yaw: 0 }, { kind: 'spinnennetz', pos: [7.9, Y + 8.6, -86.4], yaw: Math.PI },
      { kind: 'modell', name: 'kronleuchter', opts: { chain: 1.4 }, state: { anim: 'idle' }, pos: [-4.8, Y + 8.8, -68.6] },
      { kind: 'modell', name: 'kronleuchter', opts: { chain: 1.4 }, state: { anim: 'idle' }, pos: [4.8, Y + 8.8, -68.6] },
    ] },
    sign(-4.6, Y, -66.8, 'Schau in den Spiegel!', { size: [2.8, 0.95], yaw: 0.25 }),
    // ================================================================ D Zweite Fahrt
    { type: 'mover', id: 'lift2', shape: 'cyl', path: P2, size: [2 * R, 0.5, 2 * R], speed: 2.4, idle: true, once: true, color: 0x5a2a7a },
    // ================================================================ E Checkpoint-Raum: steigende Plattform
    { type: 'mover', id: 'steig', path: [[0, Y - 0.25, -141.6], [0, YU - 0.5, -141.6]], size: [3, 0.5, 3], speed: 5, wait: 1.4, mode: 'pingpong', color: 0xc8983a },
    { type: 'deco_w8', items: [
      { kind: 'kerzenleuchter', pos: [-6.6, Y, -128] }, { kind: 'kerzenleuchter', pos: [6.6, Y, -128] },
      { kind: 'bilderrahmen', pos: [-7.9, Y + 2.6, -134], yaw: 0 }, { kind: 'bilderrahmen', pos: [7.9, Y + 2.6, -133], yaw: Math.PI },
    ] },
    sign(-4.6, Y, -127.2, 'Schnell-Aufzug ↑', { size: [2.4, 0.9], yaw: 0.2 }),
    // ================================================================ F Türreihe
    { type: 'deco_w8', items: [
      { kind: 'kerzenleuchter', pos: [-2.4, YU, -147] }, { kind: 'kerzenleuchter', pos: [2.4, YU, -158] }, { kind: 'kerzenleuchter', pos: [-2.4, YU, -168] },
      { kind: 'kerzenleuchter', pos: [2.4, YU, -178] }, { kind: 'kerzenleuchter', pos: [-2.4, YU, -192] }, { kind: 'kerzenleuchter', pos: [8.4, YU, -187.2] },
      { kind: 'bilderrahmen', pos: [-2.9, YU + 2.4, -157], yaw: 0 }, { kind: 'bilderrahmen', pos: [2.9, YU + 2.4, -167], yaw: Math.PI }, { kind: 'bilderrahmen', pos: [-2.9, YU + 2.4, -177], yaw: 0 },
      { kind: 'spinnennetz', pos: [-2.9, YU + 4.6, -199.6], yaw: 0 },
    ] },
    // ================================================================ Rätselbox-Raum
    { type: 'deco_w8', items: [
      { kind: 'kerzenleuchter', pos: [RB - 6, Y, -136] }, { kind: 'kerzenleuchter', pos: [RB + 6, Y, -136] },
      { kind: 'standuhr', pos: [RB + 7.2, Y, -146], yaw: Math.PI, solid: true }, { kind: 'bilderrahmen', pos: [RB, Y + 2.8, -149.8], yaw: -Math.PI / 2 },
    ] },
  ],
  blocks: [
    { kind: 'hidden', pos: [RB - 5.5, Y + 2.4, -136], content: 'oneup' },
    { kind: 'question', pos: [-1.6, Y + 2.4, -131], content: 'coins:5' },
  ],
  enemies: [
    // Erste Fahrt
    kreis('ringA', 5.2, -18, 8, 2.6), kreis('ringB', -10.4, -34, 8, 2.8, { cw: true, phase: 0.3 }), kreis('ringC', 6.4, -52.5, 8, 2.8, { phase: 0.6 }),
    { kind: 'spuk', id: 'spuk1', pos: [-6, Y, -20] }, { kind: 'spuk', id: 'spuk2', pos: [5, Y, -38] }, { kind: 'spuk', id: 'spuk3', pos: [-8, Y, -50] },
    flieger('flieger1', -2, Y + 5, -30), flieger('flieger2', 8, Y + 5.5, -52, { cw: true, sight: 3.5 }), flieger('flieger3', 8.5, Y + 5.4, -16, { phase: 0.5, sight: 3.5 }),
    // Spiegelsaal
    { kind: 'spuk', id: 'grossspuk1', pos: [0, Y, -74.5], size: 2.5, sight: 9, speed: 1.0 },
    einzel('geist1', -5, Y + 0.4, -71.5, 1.5), einzel('geist2', 5, Y + 0.4, -77, 1.5, { cw: true }),
    flieger('flieger4', 4.5, Y + 5.6, -69, { r: 2.2 }),
    // Zweite Fahrt
    kreis('ringD', 18.4, -84, 6, 2.8), kreis('ringE', 0.6, -102, 6, 2.8, { cw: true, phase: 0.4 }),
    flieger('flieger5', 5, Y + 5.5, -80, { sight: 3.5 }), flieger('flieger6', 10, Y + 5.2, -100, { cw: true }), flieger('flieger7', -6, Y + 5.4, -112, { phase: 0.4, sight: 3 }),
    // Checkpoint-Raum
    einzel('geist3', -5.2, Y + 0.4, -131, 1.6), einzel('geist4', 5.2, Y + 0.4, -134, 1.6, { cw: true }), einzel('geist5', -4.2, Y + 8.4, -137.6, 1.2),
    flieger('flieger8', -4, Y + 6, -131, { r: 2.4 }),
    // Türreihe
    einzel('geist6', 0, YU + 0.35, -157, 1.7, { speed: 1.3 }), einzel('geist7', 0, YU + 0.35, -167, 1.7, { speed: 1.3, cw: true }), einzel('geist8', 0, YU + 0.35, -177, 1.7, { speed: 1.3, phase: 0.5 }),
    { kind: 'spuk', id: 'spuk4', pos: [2, YU, -166] },
    // Großspuk 2 als Jäger: lauert in der linken Gangwand, erwacht hinter der letzten Tür und jagt zur Ausgangstür
    { kind: 'spuk', id: 'grossspuk2', pos: [-4.8, YU, -167], size: 2.5, hunt: true, huntSpeed: 2.4, giveUp: 30,
      trigger: { min: [-3, YU - 1, -187], max: [3, YU + 4, -183] } },
    flieger('flieger9', 0, YU + 4.2, -170, { r: 1.6 }), flieger('flieger10', 0, YU + 4.2, -186, { r: 1.6, cw: true }),
    // Rätselbox-Raum: sechs Spuke
    ...[[RB - 6, -139], [RB + 6, -139], [RB - 5, -147], [RB + 5, -147], [RB, -148.5], [RB - 2, -143]].map(([x, z], i) => ({ kind: 'spuk', id: `rbspuk${i + 1}`, pos: [x, Y, z], sight: 16 })),
  ],
  items: [
    // Licht-Helme am Regal (kommen nach 3 s wieder, wenn einer verloren geht)
    ...[-5.4, -4.2, -3.0, -1.8].map((x) => ({ kind: 'helm_licht', pos: [x, Y, 1.2], respawn: 3 })),
    { kind: 'figurenschalter', id: 'schalter', pos: [4.6, Y, 2.2], hero: 'greta', on: { reveal: 'stempeltreppe' } },
    // POW-Block fährt auf der ersten Aufzugplattform mit (Erschütterung verscheucht die kleinen Geister)
    { kind: 'pow', id: 'pow1', pos: [1.3, Y, -12.4], uses: 3, radius: 9, height: 4, onUse: geisterSchreck(9) },
    // Roter Ring auf der zweiten Fahrt
    { kind: 'roter_ring', id: 'rotring', pos: [13, Y, -77.4], yaw: Math.PI / 2, time: 12, coins: RED.map(([x, z]) => [x, Y + 0.45, z]) },
    // Türreihe (öffnen sich beim Herankommen) und Ausgangstür zum Balkon
    ...DOORS.map((z, i) => ({ kind: 'spuk_tuer', id: `tuer${i + 1}`, pos: [0, YU, z], yaw: -Math.PI / 2 })),
    { kind: 'spuk_tuer', id: 'ausgang', pos: [3.1, YU, -190], yaw: 0, open: true },
    // Tür im Spiegelsaal: verschlossen, bis Großspuk 1 besiegt ist
    { kind: 'spuk_tuer', id: 'saaltuer', pos: [8.1, Y, -72], yaw: 0, locked: true, key: 'grossspuk1' },
    // Rätselbox auf dem Sims im Statuenschacht und Rückweg aus dem Spukzimmer
    { kind: 'warpbox', id: 'rb', style: 'mystery', pos: [-4.2, Y + 8, -141.8], target: 'rb2' },
    { kind: 'warpbox', id: 'rb2', style: 'mystery', pos: [RB, Y, -136.4], target: 'rb',
      task: { area: { min: [RB - 8.5, Y - 1, -150.5], max: [RB + 8.5, Y + 8, -133.5] }, star: 1, pos: [RB, Y + 1.4, -143] } },
    // Bitcoins
    line([-1.6, Y + 0.5, 3], [1.6, Y + 0.5, 3], 4),
    ...coinsAt([[0, Y + 0.5, -16], [0, Y + 0.5, -19], [-2.5, Y + 0.5, -25], [-5, Y + 0.5, -31], [-5, Y + 0.5, -34], [-5, Y + 0.5, -37], [-2, Y + 0.5, -44], [1, Y + 0.5, -51], [1, Y + 0.5, -54]]),
    line([-3, Y + 0.5, -68.5], [3, Y + 0.5, -68.5], 5),
    ...coinsAt([[9.5, Y + 0.5, -98.5], [6, Y + 0.5, -101], [6, Y + 0.5, -104], [3, Y + 0.5, -111], [0, Y + 0.5, -117], [0, Y + 0.5, -120]]),
    line([0, YU + 0.5, -146], [0, YU + 0.5, -150], 3), line([5, YU + 0.5, -190], [8.4, YU + 0.5, -190], 3),
  ],
  checkpoint: [[0, Y, -130]],
  stars: [
    { pos: [0.5, Y + 4.4, -82.3], id: 'spiegelstern' },                 // 0: nur im Spiegel zu sehen (über der zweiten Spiegelstufe)
    { pos: [RB, Y + 1.4, -143], hidden: true, id: 'rbstern' },           // 1: Rätselbox (sechs Spuke mit Licht)
    [0, YU + 1.0, -198.4],                                              // 2: Ende des letzten Gangs (Großspuk 2)
  ],
  stamp: [5.6, Y + 7.0, -7.4],
  goal: [13, YU, -190],
  marks: {
    start: [0, Y, 5], lift1: [0, Y, -11.6], saal: [0, Y, -70], lift2: [13, Y, -72], cp: [0, Y, -130], steig: [0, Y, -141.6], gang: [0, YU, -146], balkon: [6, YU, -190],
    rb: [RB, Y, -140],
  },
  _spuk: { Y, YU, R, P1, P2, RB, DOORS, RED, GHOSTS },
};
