// 7-6 „Rammfisch-Riff am Feuerberg“ – Welt 7 „Lava-Festung“, Unterwasser-Parcours (Archetyp parcours, Thema reef, Musik
// course_rammreef, 400 s; Bauplan 7-6: Rammfisch-Riff unter Wasser mit engen Gängen und zerbrechlichen Kisten → Warp zur
// Vulkaninsel mit Wutkaulquappen und Checkpoint → Finale mit auf und ab ziehenden und zwei großen rotierenden Rammfischen).
//
// Vor dem Feuerberg liegt ein Korallenriff: bullige Rammfische patrouillieren zwischen den Riffwänden und rammen alles, was
// sie sehen – auch die Holzkisten, die die engen Durchgänge versperren (Schwimmstoß zerbricht sie ebenfalls). Eine Warp-Box
// bringt zur Vulkaninsel: dampfende Felsen, glühende Risse, Gezeitenbecken voller Wutkaulquappen, über die man auf
// Trittsteinen springt. Von der Klippe geht es hinab ins Finale – Rammfische ziehen auf und ab, zwei Riesen-Rammfische
// kreisen vor dem Zielriff; dort wartet in einer Glasröhre der dritte Stern hinter einer Stachelkugel (die Funkenblüte
// verbrennt sie).
//
// Abschnitte (Level verläuft nach −Z; Meeresspiegel y 0):
//   1  Riff          z  14 …  −92  Strand (y 1), Becken bis y −8: Kammer A (Nische hinter Kisten: Stern 0), Riffwand 1
//                                  (Kistentunnel oder Rammfisch-Lücke), Kammer B (Rammfisch mit dem Stern in der Blase:
//                                  Stern 1, Kiste mit Extraleben), Riffwand 2 (Kistentunnel), Kammer C (Zickzack-Gänge),
//                                  Felsplattform mit Warp-Box
//   2  Vulkaninsel   z −98 … −160  Ankunft am Strand mit Checkpoint, zwei Gezeitenbecken mit Wutkaulquappen (Trittsteine
//                                  über das zweite), Feuerberg mit Glutkrater, Klippe ins Finale
//   3  Finale        z −160 … −244 Becken bis y −9: drei auf und ab ziehende Rammfische (Stempel oben auf dem Felsturm
//                                  zwischen ihnen), zwei große kreisende Rammfische vor dem Zielriff, Glasröhre mit
//                                  Stachelkugel (Funkenblüte aus dem ?-Block) – Stern 2, Zielmast auf dem Zielriff
// Gegner: Rammfisch 10 (davon 2 groß, 3 auf und ab, 1 mit Stern), Wutkaulquappe 3.

import { isl, line, ring, arc, column, sign, Quads, flushQ, glimmer, funken, onRespawn, fernSicht } from './_helpers_c.js';
import { glasgang } from '../w6/_helpers_a.js';
import { gegnerSicht } from '../w3/_helpers_d.js';
import { Bld } from '../w6/_helpers_b.js';
import { colorize, merge, lin, mixc, smooth, hex, addStatic, Rnd } from '../../blocks/kit.js';
import * as THREE from 'three';

const PI = Math.PI;
export const M76 = { SEA: 0, FLOOR: -8, FLOOR2: -9, BEACH: 1, ISLE: 1.2, POOL: 0.5 };
const { SEA, FLOOR, FLOOR2, BEACH, ISLE } = M76;

const ROCK = { topColor: 0x6a5a62, sideColor: 0x4a3a44 };
const rock = (x0, x1, zA, zB, top, bottom, o = {}) => isl(x0, x1, zA, zB, top, top - bottom, { top: 'rock', ...ROCK, ...o });
const sand = (x0, x1, zA, zB, top, bottom, o = {}) => isl(x0, x1, zA, zB, top, top - bottom, { top: 'sand', ...o });
const water = (x0, x1, zA, zB, y0, y1, o = {}) => ({ type: 'water', pos: [(x0 + x1) / 2, y0, (zA + zB) / 2], size: [x1 - x0, y1 - y0, Math.abs(zA - zB)], ...o });
const kiste = (x, y, z, content) => ({ pos: [x, y, z], ...(content ? { content } : {}) });
const fisch = (id, o) => ({ kind: 'rammfisch', id, ...o });

/** Riff-Zier: leichte Korallen (Kegel, Kugeln, Fächer) als statische Geometrie. list [[x, y, z, art, größe, farbe]] */
function korallen(level, list) {
  if (!level.view) return;
  const B = new Bld();
  const COL = { rosa: 0xff7ab0, orange: 0xff9a3a, lila: 0xb070ff, gelb: 0xffd24a, tuerkis: 0x3ad8c8, rot: 0xff4a4a };
  for (const [x, y, z, art, s = 1, farbe = 'rosa'] of list) {
    const c = COL[farbe] ?? farbe;
    if (art === 'baum') {
      B.cyl(0.12 * s, 0.18 * s, 0.9 * s, x, y, z, c, 6);
      for (const [dx, dz, h] of [[0.35, 0, 0.7], [-0.3, 0.2, 0.55], [0.05, -0.32, 0.8]]) B.cyl(0.07 * s, 0.1 * s, h * s, x + dx * s, y + 0.5 * s, z + dz * s, c, 5, { rz: dx * 0.9, rx: dz * 0.9 }).sphere(0.12 * s, x + dx * s * 1.6, y + (0.5 + h) * s, z + dz * s * 1.6, c);
    } else if (art === 'hirn') {
      B.sphere(0.55 * s, x, y + 0.2 * s, z, c, { s: [1, 0.6, 1] });
    } else if (art === 'faecher') {
      B.cyl(0.9 * s, 0.9 * s, 0.08, x, y + 0.9 * s, z, c, 10, { rx: PI / 2 }).cyl(0.06, 0.08, 0.5 * s, x, y, z, c, 5);
    } else {
      for (let k = 0; k < 4; k++) { const a = k * 1.7; B.cyl(0.11 * s, 0.14 * s, (0.6 + k * 0.18) * s, x + Math.cos(a) * 0.22 * s, y, z + Math.sin(a) * 0.22 * s, c, 6); }
    }
  }
  B.flush(level, { castShadow: false });
}

/** Glühende Risse auf Felsflächen (Vulkaninsel): flache Leuchtbänder im Glüh-Material. list [[x, y, z, länge, yaw]] */
function glutrisse(level, list) {
  if (!level.view) return;
  const parts = [];
  const a = lin(0xff4a10), b = lin(0xffd060);
  for (const [x, y, z, L, yaw] of list) {
    const n = 5;
    for (let i = 0; i < n; i++) {
      const g = new THREE.PlaneGeometry(L / n, 0.16 + 0.1 * Math.sin(i * 2.1));
      g.rotateX(-PI / 2);
      g.rotateY(yaw + Math.sin(i * 1.9) * 0.35);
      g.translate(x + Math.cos(yaw) * (i - n / 2) * L / n, y + 0.02, z - Math.sin(yaw) * (i - n / 2) * L / n);
      parts.push(colorize(g.toNonIndexed(), (p, nn, o) => mixc(a, b, 0.5 + 0.4 * Math.sin(i * 1.3), o)));
    }
  }
  addStatic(level, merge(parts), { material: 'glow' });
}

/** Feuerberg: Kegel aus Vulkangestein mit glühendem Krater (Kollision: Zylinder-Stufen). */
function feuerberg(level, x, z, y, r, h) {
  for (let k = 0; k < 4; k++) {
    const rr = r * (1 - k * 0.22);
    level.world.add({ type: 'cyl', x, z, r: rr, y0: y - 1, y1: y + (h * (k + 1)) / 4, tag: 'feuerberg', camIgnore: true });
  }
  if (!level.view) return;
  const prof = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    prof.push(new THREE.Vector2(r * (1 - t * 0.78) + Math.sin(t * 9) * 0.25, y - 1 + h * t));
  }
  prof.push(new THREE.Vector2(r * 0.18, y + h - 0.6));
  const g = new THREE.LatheGeometry(prof, 28).toNonIndexed();
  g.translate(x, 0, z);
  const d = lin(0x3a2e34), m = lin(0x6a5258), hot = lin(0xff5a18);
  const rnd = new Rnd(31);
  void rnd;
  addStatic(level, colorize(g, (p, n, o) => {
    const t = (p.y - y + 1) / h;
    mixc(d, m, 0.4 + 0.3 * Math.sin(Math.atan2(p.z - z, p.x - x) * 7 + p.y * 1.3), o);
    const vein = Math.abs(Math.sin(Math.atan2(p.z - z, p.x - x) * 5 + p.y * 0.6)) < 0.08 ? 1 : 0;
    mixc(o, hot, Math.max(vein * 0.85, smooth(0.85, 1, t) * 0.9), o);
  }));
  const lava = new THREE.CircleGeometry(r * 0.24, 20).toNonIndexed();
  lava.rotateX(-PI / 2); lava.translate(x, y + h - 0.7, z);
  addStatic(level, colorize(lava, (p, n, o) => mixc(lin(0xff6a1a), lin(0xffe070), 0.4, o)), { material: 'glow' });
}

function build(level) {
  const Q = new Quads();
  korallen(level, [
    // Kammer A
    [-11, FLOOR, -2, 'baum', 1.3, 'rosa'], [-6, FLOOR, -14, 'hirn', 1.2, 'gelb'], [9, FLOOR, -4, 'roehre', 1.4, 'lila'], [12, FLOOR, -18, 'faecher', 1.2, 'orange'],
    [3, FLOOR, -9, 'baum', 1, 'tuerkis'], [-13.6, FLOOR, -17, 'roehre', 1.2, 'orange'],
    // Kammer B
    [-12, FLOOR, -30, 'faecher', 1.4, 'lila'], [11, FLOOR, -34, 'baum', 1.4, 'gelb'], [-4, FLOOR, -44, 'hirn', 1.4, 'rosa'], [6, FLOOR, -50, 'roehre', 1.5, 'tuerkis'],
    [-9, FLOOR, -52, 'baum', 1.1, 'orange'], [13, FLOOR, -48, 'faecher', 1, 'rosa'],
    // Kammer C
    [-12, FLOOR, -62, 'baum', 1.2, 'tuerkis'], [9, FLOOR, -68, 'hirn', 1.3, 'lila'], [-6, FLOOR, -80, 'roehre', 1.2, 'gelb'], [12, FLOOR, -84, 'baum', 1.2, 'rosa'],
    // Finale
    [-12, FLOOR2, -168, 'baum', 1.5, 'rosa'], [12, FLOOR2, -172, 'faecher', 1.4, 'gelb'], [-10, FLOOR2, -196, 'hirn', 1.5, 'tuerkis'], [11, FLOOR2, -200, 'roehre', 1.5, 'orange'],
    [-13, FLOOR2, -210, 'faecher', 1.3, 'lila'], [13, FLOOR2, -208, 'baum', 1.3, 'rosa'],
  ]);
  glutrisse(level, [[-6, ISLE, -106, 4, 0.3], [9, ISLE, -110, 3, -0.4], [-11, ISLE, -128, 3.4, 0.9], [4, ISLE, -146, 4, 0.2], [-2, ISLE, -152, 3, -0.6], [12, ISLE, -150, 2.6, 0.5]]);
  feuerberg(level, -10.5, -150, ISLE, 6.4, 8.5);
  // Glasröhre mit Stachelkugel auf dem Zielriff (Eingang links offen, rechts geschlossen)
  glasgang(level, { axis: 'x', z: -219, a: -12.2, b: -4.2, y: BEACH, closed: ['b'] });
  flushQ(level, Q);
  // Blasen, Glut
  glimmer(level, [[-15, 15, -7, -0.5, 2, -90], [-15, 15, -8, -0.5, -162, -214]], { n: 90, color: 0xd8f4ff, size: 0.2, drift: 0.5, speed: 0.6, opacity: 0.7 });
  funken(level, [[-12.5, -8.5, ISLE + 7, ISLE + 12, -148, -152]], { n: 40, rise: 0.6, size: 0.24, seed: 5 });
}

function setup(level) {
  // Unterwasser klarer als im Thema: weitere Sicht, zartere Lichtflecken (Riff und Rammfische gut lesbar)
  const mood = level.view?.mood;
  if (mood?.uwSpec) {
    mood.uwSpec.caustics = 0.12;
    const u = mood.uw;
    if (u) {
      u.fogNear = 7; u.fogFar = 58;
      u.fogColor?.set?.(0x0e5674); u.background?.set?.(0x0c4a64);
      u.hemiSky?.set?.(0xe8f8ff); u.hemiGround?.set?.(0xb07048); u.hemiI = 1.45; u.sunI = 1.9; u.sunColor?.set?.(0xfff0d8);
    }
  }
  // Leistung: unter Wasser reicht die Sicht ≈ 58 m – fernere Abschnitte nicht zeichnen; Fische und Kisten ohne Sonnenschatten
  fernSicht(level, 62);
  gegnerSicht(level, { rammfisch: { shadow: false, dist: 60 }, wutkaulquappe: { shadow: false, dist: 40 } });
  // Funkenblüte verbrennt die Stachelkugel in der Glasröhre (Seeigel aus Riff-Stacheln)
  const kugel = level.named.get('seeigel') ?? level.entities.find((e) => e.spec?.id === 'seeigel');
  if (kugel) {
    const orig = kugel.onHit.bind(kugel);
    kugel.onHit = (kind, src) => orig(kind === 'fire' ? 'bomb' : kind, src);
  }
  void onRespawn;
}

export const LEVEL = {
  id: '7-6',
  world: 7,
  title: 'Rammfisch-Riff am Feuerberg',
  archetype: 'parcours',
  theme: 'reef',
  music: 'course_rammreef',
  timeLimit: 400,
  killY: -16,
  start: { pos: [0, BEACH, 10], yaw: PI / 2 },
  build,
  setup,
  underwater: { color: 0x0e5674, near: 7, far: 58, tint: 0.05 },
  instances: { coin: { farHide: 40, shadow: false } },
  farHide: 40,
  camera: [
    { from: 16, to: 3, pitch: 34, dist: 13, height: 1.4, ahead: 2.2, fov: 40 },
    { from: 3, to: -88, pitch: 10, dist: 9, height: 0.7, ahead: 2.4, fov: 48 },
    { from: -88, to: -94, pitch: 32, dist: 12, height: 1.4, ahead: 2, fov: 40 },
    { from: -97, to: -158, pitch: 40, dist: 13.5, height: 1.4, ahead: 2, fov: 40 },
    { from: -161, to: -212, pitch: 10, dist: 9, height: 0.7, ahead: 2.4, fov: 48 },
    { from: -214, to: -246, pitch: 36, dist: 13, height: 1.4, ahead: 2, fov: 40 },
  ],
  segments: [
    // ================================================================ 1 Riff
    sand(-6, 6, 14, 3, BEACH, FLOOR - 1),
    sand(-16, 16, 3, -92, FLOOR, FLOOR - 2),
    water(-16, 16, 3, -92, FLOOR, SEA),
    // Seitenklippen (über das Wasser hinaus)
    rock(-19, -16, 14, -92, 2.4, FLOOR - 2), rock(16, 19, 14, -92, 2.4, FLOOR - 2),
    rock(-16, -6, 14, 3, 1.6, FLOOR - 1), rock(6, 16, 14, 3, 1.6, FLOOR - 1),
    // Kammer A: Nische hinter Kisten (Stern 0) an der linken Klippe
    rock(-16, -12.6, -5.6, -7.4, FLOOR + 3.6, FLOOR), rock(-16, -12.6, -8.6, -10.4, FLOOR + 3.6, FLOOR), rock(-16, -12.6, -5.6, -10.4, FLOOR + 4.6, FLOOR + 2.4),
    // Riffwand 1 (z −24) mit Kistentunnel (x −2 … 1) und Rammfisch-Lücke (x 9 … 12)
    rock(-16, -1.1, -23, -25.4, 1.2, FLOOR), rock(0.1, 9, -23, -25.4, 1.2, FLOOR), rock(12, 16, -23, -25.4, 1.2, FLOOR),
    rock(-1.1, 0.1, -23, -25.4, 1.2, FLOOR + 2.4),
    // Riffwand 2 (z −56) mit engem Kistentunnel (x −1,2 … 1,2)
    rock(-16, -0.6, -55, -57.4, 1.2, FLOOR), rock(0.6, 16, -55, -57.4, 1.2, FLOOR), rock(-0.6, 0.6, -55, -57.4, 1.2, FLOOR + 2.4),
    // Kammer C: Zickzack-Gänge
    rock(-16, 7, -64, -66, 1.2, FLOOR), rock(-7, 16, -73, -75, 1.2, FLOOR), rock(-16, 7, -81, -83, 1.2, FLOOR),
    // Sandrampe aus dem Wasser hinauf zur Felsplattform
    { type: 'ramp', pos: [0, FLOOR, -85.5], size: [6, BEACH - FLOOR, 5], axis: 'z', dir: -1, low: 5.4, top: 'stone' },
    // Felsplattform mit Warp-Box
    rock(-6, 6, -88, -92.5, BEACH, FLOOR), rock(-16, -6, -92, -95.5, 2.4, FLOOR - 2), rock(6, 16, -92, -95.5, 2.4, FLOOR - 2), rock(-6, 6, -92.5, -95.5, 3, FLOOR - 2),
    { type: 'kiste_wasser', kisten: [
      // Nische (Stern 0)
      kiste(-12, FLOOR, -8), kiste(-12, FLOOR + 1.2, -8, 'coins:3'),
      // Tunnel in Riffwand 1
      kiste(-0.5, FLOOR, -24.2, 'coins:2'), kiste(-0.5, FLOOR + 1.2, -24.2),
      // Tunnel in Riffwand 2
      kiste(0, FLOOR, -56.2, 'coins:2'), kiste(0, FLOOR + 1.2, -56.2),
      // Extraleben in Kammer B (Kiste am rechten Rand)
      kiste(14.2, FLOOR, -40.6, { power: 'oneup' }),
    ] },
    { type: 'deco_w7', shadow: false, items: [
      { kind: 'seetang', pos: [-8, FLOOR, -6], height: 3.4 }, { kind: 'seetang', pos: [7, FLOOR, -15], height: 4 }, { kind: 'seetang', pos: [-14, FLOOR, -36], height: 4.2 },
      { kind: 'seetang', pos: [4, FLOOR, -42], height: 3.6 }, { kind: 'seetang', pos: [-3, FLOOR, -69], height: 3.2 }, { kind: 'seetang', pos: [10, FLOOR, -78], height: 3.8 },
      { kind: 'seetang', pos: [-6, FLOOR2, -178], height: 4.2 }, { kind: 'seetang', pos: [8, FLOOR2, -192], height: 4.6 },
    ] },
    sign(-3.2, BEACH, 7.6, 'Rammfisch-Riff\nTief Luft holen!', { size: [2.4, 0.9] }),
    sign(3.4, BEACH, -89.4, 'Warp-Box zur\nVulkaninsel', { size: [2.2, 0.8] }),

    // ================================================================ 2 Vulkaninsel
    rock(-18, 18, -95.5, -113, ISLE, FLOOR - 2, { tag: 'insel' }),
    rock(-18, -11, -113, -123, ISLE, FLOOR - 2, { tag: 'insel' }), rock(-1, 18, -113, -123, ISLE, FLOOR - 2, { tag: 'insel' }),
    rock(-18, 18, -123, -132.5, ISLE, FLOOR - 2, { tag: 'insel' }),
    rock(-18, 18, -139.5, -160, ISLE, FLOOR - 2, { tag: 'insel' }),
    // Gezeitenbecken 1 (links) und 2 (quer, mit Trittsteinen); Sandgrund 3,4 m unter der Insel
    sand(-11, -1, -113, -123, ISLE - 3.4, FLOOR - 2), sand(-18, 18, -132.5, -139.5, ISLE - 3.4, FLOOR - 2),
    water(-11, -1, -113, -123, ISLE - 3.4, ISLE - 0.5),
    water(-18, 18, -132.5, -139.5, ISLE - 3.4, ISLE - 0.5),
    // Trittsteine (Basaltsäulen) über Becken 2
    rock(-1, 1, -135, -137, ISLE, ISLE - 3.4), rock(11, 13, -135, -137, ISLE, ISLE - 3.4), rock(-13, -11, -135, -137, ISLE, ISLE - 3.4),
    { type: 'deco_w7', items: [
      { kind: 'basaltsaeulen', pos: [12, ISLE, -104], n: 5, height: [1.2, 3.4], solid: true },
      { kind: 'vulkanfelsen', pos: [12, ISLE, -122], size: [5, 6], n: 4, solid: true },
      { kind: 'vulkanfels', pos: [-15, ISLE, -102], size: 2 },
      { kind: 'koralle', pos: [-15.5, ISLE, -140], color: 'rosa' },
    ] },
    sign(-2.8, ISLE, -101.6, 'Vulkaninsel\nVorsicht, Wutkaulquappen!', { size: [2.8, 0.9] }),

    // ================================================================ 3 Finale
    sand(-16, 16, -160, -214, FLOOR2, FLOOR2 - 2),
    water(-16, 16, -160, -214, FLOOR2, SEA),
    rock(-19, -16, -158, -246, 2.4, FLOOR2 - 2), rock(16, 19, -158, -246, 2.4, FLOOR2 - 2),
    // Riffwand mit drei Fenstern, in denen Rammfische auf und ab ziehen; dahinter der Felsturm (Stempel oben)
    rock(-16, -4.6, -178, -180, 1.2, FLOOR2), rock(-2.2, 2.2, -178, -180, 1.2, FLOOR2), rock(4.6, 7.4, -178, -180, 1.2, FLOOR2), rock(9.8, 16, -178, -180, 1.2, FLOOR2),
    rock(2.4, 4.4, -183, -185, -2.4, FLOOR2),
    // Seitenfelsen bei den großen Rammfischen (nur zwischen ihnen hindurch)
    rock(-16, -11.4, -197, -209, 1.2, FLOOR2), rock(11.4, 16, -197, -209, 1.2, FLOOR2),
    // Felsen, um die die großen Rammfische kreisen
    rock(-6.6, -4.4, -202, -204.2, -3.6, FLOOR2), rock(4.4, 6.6, -202, -204.2, -3.6, FLOOR2),
    // Zielriff mit Sandrampe aus dem Wasser
    sand(-16, 16, -214, -246, BEACH, FLOOR2 - 2, { tag: 'zielriff' }),
    { type: 'ramp', pos: [0, FLOOR2, -211], size: [6, BEACH - FLOOR2, 6], axis: 'z', dir: -1, low: 6.4, top: 'stone' },
    sign(-14, BEACH, -216.4, 'Glasröhre:\nFunkenblüte hilft!', { size: [2.2, 0.8] }),
  ],
  blocks: [
    { kind: 'question', pos: [-1.6, BEACH + 2.4, 6.6], content: 'coins:3' },
    { kind: 'question', pos: [-14.4, BEACH + 2.0, -216.6], content: 'funken' },
    { kind: 'hidden', pos: [6, ISLE + 2.6, -108], content: 'oneup' },
  ],
  enemies: [
    // Kammer A/B: patrouillierende Rammfische (rammen, sobald sie die Figur sehen – auch Kisten)
    fisch('rf1', { pos: [10.5, FLOOR + 1.5, -30], path: [[10.5, FLOOR + 1.5, -30], [10.5, FLOOR + 1.5, -18]], speed: 1.3, sight: 7 }),
    fisch('rf_stern', { pos: [-10, FLOOR + 3, -40], path: [[-10, FLOOR + 3, -40], [10, FLOOR + 3, -40]], speed: 1.1, ram: false, carries: 'star:1' }),
    fisch('rf2', { pos: [0, FLOOR + 1, -50], path: [[-8, FLOOR + 1, -50], [8, FLOOR + 1, -50]], speed: 1.2, sight: 7 }),
    fisch('rf3', { pos: [0, FLOOR + 1.5, -60], path: [[-12, FLOOR + 1.5, -60], [12, FLOOR + 1.5, -60]], speed: 1.4, sight: 6 }),
    fisch('rf4', { pos: [0, FLOOR + 2, -78.5], path: [[-12, FLOOR + 2, -78.5], [12, FLOOR + 2, -78.5]], speed: 1.4, sight: 6 }),
    // Vulkaninsel: Wutkaulquappen in den Becken
    { kind: 'wutkaulquappe', id: 'wq1', pos: [-6, ISLE - 1.6, -118], center: [-6, ISLE - 1.6, -118], radius: 2.4, sight: 5, range: 4.5 },
    { kind: 'wutkaulquappe', id: 'wq2', pos: [-6, ISLE - 1.6, -136], center: [-6, ISLE - 1.6, -136], radius: 2, sight: 5, range: 5 },
    { kind: 'wutkaulquappe', id: 'wq3', pos: [8, ISLE - 1.6, -136], center: [8, ISLE - 1.6, -136], radius: 2, sight: 5, range: 5, cw: true },
    // Finale: auf und ab ziehende Rammfische (rammen nicht), zwei große kreisende
    fisch('rf_v1', { pos: [-3.4, FLOOR2 + 0.3, -179], path: [[-3.4, FLOOR2 + 0.3, -179], [-3.4, -1.0, -179]], speed: 2, ram: false, phase: 0 }),
    fisch('rf_v2', { pos: [3.4, FLOOR2 + 0.3, -179], path: [[3.4, FLOOR2 + 0.3, -179], [3.4, -1.0, -179]], speed: 2, ram: false, phase: 0.5 }),
    fisch('rf_v3', { pos: [8.6, FLOOR2 + 0.3, -179], path: [[8.6, FLOOR2 + 0.3, -179], [8.6, -1.0, -179]], speed: 1.8, ram: false, phase: 0.25 }),
    fisch('rf_gross1', { pos: [-5.5, -2.4, -203.1], center: [-5.5, -2.4, -203.1], radius: 5, size: 2.2, speed: 1.6 }),
    fisch('rf_gross2', { pos: [5.5, -2.4, -203.1], center: [5.5, -2.4, -203.1], radius: 5, size: 2.2, speed: 1.6, cw: true, phase: 0.5 }),
    // Stachelkugel (lila Seeigel) rollt in der Glasröhre hin und her – Funkenblüte verbrennt sie
    { kind: 'stachelkugel', id: 'seeigel', pos: [-8.5, BEACH, -219], path: [[-10.4, BEACH, -219], [-5.4, BEACH, -219]], speed: 2, size: 1.3, color: 'lila' },
  ],
  items: [
    { kind: 'warpbox', id: 'warp_riff', pos: [0, BEACH, -90.4], target: 'warp_insel' },
    { kind: 'warpbox', id: 'warp_insel', pos: [0, ISLE, -99.6], target: 'warp_riff' },
    // Münzen: Riff
    line([2, -2, -2], [2, -4.5, -8], 4),
    ring([-6, FLOOR + 2.5, -14], 1.4, 6),
    line([-0.5, FLOOR + 1, -20], [-0.5, FLOOR + 1, -28], 4),
    arc([10.5, -2, -21], [10.5, -2, -28], 4, -2),
    ring([0, FLOOR + 3, -46], 1.6, 8),
    line([0, FLOOR + 1, -52], [0, FLOOR + 1, -60], 4),
    line([-12, -3, -69.5], [12, -3, -69.5], 8),
    line([12, -3, -78.5], [-12, -3, -78.5], 6),
    line([-12, -2, -87], [-3, -2, -87], 4),
    // Vulkaninsel
    line([0, ISLE + 0.6, -104], [0, ISLE + 0.6, -112], 4),
    ring([-6, ISLE - 0.8, -118], 2.2, 8),
    line([-12, ISLE + 2.4, -135.5], [12, ISLE + 2.4, -135.5], 9),
    line([0, ISLE + 0.6, -142], [0, ISLE + 0.6, -154], 5),
    // Finale
    column(0, -164, -1, -6, 4),
    ring([3.4, -3.6, -184], 1.2, 6),
    line([-8, -5, -194], [8, -5, -194], 6),
    line([0, -1.2, -197], [0, -1.2, -211], 6),
    line([-11.8, BEACH + 0.6, -219], [-6, BEACH + 0.6, -219], 5),
    ring([4, BEACH + 0.8, -228], 1.6, 8),
  ],
  checkpoint: { pos: [3.2, ISLE, -104], yaw: PI / 2 },
  stars: [
    [-14.2, FLOOR + 0.2, -8],                    // 0: Nische hinter Kisten nahe dem Start
    { pos: [-10, FLOOR + 5, -40], hidden: true, id: 'stern_blase' },   // 1: trägt der Rammfisch in der Blase (Platzhalter, versteckt)
    [-5, BEACH, -219],                            // 2: hinten in der Glasröhre (Stachelkugel mit Funkenblüte verbrennen)
  ],
  stamp: [3.4, -2.4, -184],
  goal: [6, BEACH, -236],
  marks: {
    strand: [0, BEACH, 8], nische: [-14.2, FLOOR, -8], wand1: [-0.5, FLOOR, -24.2], kammerB: [0, -4, -40], wand2: [0, FLOOR, -56.2],
    warp: [0, BEACH, -90.4], insel: [0, ISLE, -104], becken2: [0, ISLE, -136], klippe: [0, ISLE, -158], turm: [3.4, -2.4, -184],
    grosse: [0, -2, -203], glasroehre: [-8.5, BEACH, -219], ziel: [6, BEACH, -236],
  },
};
