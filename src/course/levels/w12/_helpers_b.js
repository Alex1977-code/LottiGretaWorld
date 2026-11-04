// Hilfen für die Welt-Krone-Level K-Kapitän „Krümels Glutturm-Finale“ (Lavaturm-Diorama) und K-Haus „Haus Marathon“
// (Prüfungs-Haus mit 30 Räumen). Kein Level: exportiert kein LEVEL, die Level-Registry überspringt dieses Modul; nur für
// diese beiden Level (K-1 hat eigene Hilfen in _helpers_a.js). Gemeinsame Hilfsdateien anderer Welten werden nur
// importiert, nie verändert; alles Level-Lokale hängt sich über die Level-Haken (LEVEL.build/setup, level.onStep,
// view.onFrame) an.
//
//   1) Weitergereicht   Quads, brickBox, gelaender, flushQ, funken, carpet (Welt 7), Bld, litTop, gradY, glimmer, sign,
//                       line, ring, arc, onRespawn (Welt 5/6)
//   2) K-Kapitän        glutFloss (rote Plattform schwimmt auf der steigenden/sinkenden Lava und trägt die Figur),
//                       lochWolke (Wolke mit Loch als vier Wolken-Bausteine), randsteine (niedrige Bordsteine an Rampen),
//                       glutInsel (Felsunterbau des schwebenden Diorama-Kessels), kronenZier (goldene Krone, Gipfelfahne)
//   3) K-Haus           siehe unten (Raumhüllen, Raum-Mechanik, Kraftkapseln mit Schlittschuh, Raum-Sterne)

import * as THREE from 'three';
import { addObject, Rnd } from '../../blocks/kit.js';
import { visDt } from '../../entities/gimmick.js';
import { MovingBox } from '../../blocks/w2kit.js';
import { Quads, brickBox, gelaender, flushQ, funken, carpet } from '../w7/_helpers_c.js';
import { Bld, litTop, gradY, onRespawn, glimmer, sign, line, ring, arc } from '../w6/_helpers_b.js';

export { Quads, brickBox, gelaender, flushQ, funken, carpet, Bld, litTop, gradY, onRespawn, glimmer, sign, line, ring, arc };

const TAU = Math.PI * 2;
export { TAU };

// =====================================================================================================================
// 2) K-Kapitän
// =====================================================================================================================

/**
 * Glutfloß – rote Steinplatte, die auf der Lava schwimmt (Bauplan K-Kapitän „rote Plattform … warten, bis die Lava
 * steigt“): ihre Oberseite liegt immer `offset` m über dem Lavaspiegel `lava` (Griff eines lavaspiegel-Bausteins) und
 * trägt die Figur mit (Quader mit mover). Darstellung: rote Basaltplatte mit Goldkante, Glutfugen und Haltegriffen.
 * o = { id, lava: 'glut', pos: [x, z] (Mitte), size: [w, d], thick: 0.7, offset: 1.0 }. Liefert { box, top(), info() }.
 */
export function glutFloss(level, o) {
  const [cx, cz] = o.pos, [w, d] = o.size ?? [2.6, 2.6], th = o.thick ?? 0.7, off = o.offset ?? 1.0;
  const lava = () => level.named.get(o.lava ?? 'glut');
  const y0 = () => (lava()?.top ?? 0) + off - th;
  const bx = new MovingBox(level, cx, y0(), cz, w, th, d, { tag: 'glutfloss' });
  const h = { box: bx, top: () => bx.top, info: () => ({ top: +bx.top.toFixed(3), lava: +(lava()?.top ?? 0).toFixed(3), carried: bx.carried(level) }) };
  if (o.id) level.named.set(o.id, h);
  level.onStep((dt) => bx.moveTo(cx, y0(), cz, dt));
  if (level.view) {
    const b = new Bld();
    b.box(w, th * 0.75, d, 0, 0, 0, litTop(0xc8281e, 0.9), { r: 0.1 });
    b.box(w + 0.12, 0.14, d + 0.12, 0, th - 0.2, 0, 0xffc83a, { r: 0.05 });
    b.box(w - 0.3, 0.08, d - 0.3, 0, th - 0.08, 0, litTop(0xe8402a, 0.95), { r: 0.04 });
    // Ziersteine (rote Rauten) und vier goldene Eckknäufe
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.sphere(0.13, sx * (w / 2 - 0.12), th + 0.02, sz * (d / 2 - 0.12), 0xffd860, { ws: 8, hs: 6 });
    b.box(0.5, 0.06, 0.5, 0, th - 0.02, 0, 0xffc83a, { yaw: Math.PI / 4, r: 0.02 });
    const glow = new Bld();
    for (let k = 0; k < 4; k++) glow.box(w * 0.9, 0.05, 0.06, 0, th * 0.3 + k * 0.001, -d / 2 + 0.3 + k * ((d - 0.6) / 3), 0xffa030, { r: 0 });
    const g = b.geometry(), gg = glow.geometry();
    const grp = new THREE.Group();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }));
    m.castShadow = true; m.receiveShadow = true;
    grp.add(m);
    const mg = new THREE.Mesh(gg, new THREE.MeshBasicMaterial({ vertexColors: true }));
    grp.add(mg);
    grp.name = 'glutfloss';
    addObject(level, grp, () => { grp.position.set(bx.pos.x, bx.pos.y, bx.pos.z); });
  }
  return h;
}

/**
 * Wolke mit Loch (Bauplan K-Kapitän „Wolke mit Loch … durchfallen“): vier feste Wolken-Bausteine rings um ein
 * rechteckiges Loch. r = { x0, x1, z0, z1, y (Oberseite), hole: [hx0, hx1, hz0, hz1], h: 0.6 }. Liefert Segmente.
 */
export function lochWolke(r) {
  const h = r.h ?? 0.6, y = r.y - h;
  const [hx0, hx1, hz0, hz1] = r.hole;
  const c = (x0, x1, z0, z1) => ({ type: 'cloud', pos: [(x0 + x1) / 2, y, (z0 + z1) / 2], size: [x1 - x0, h, Math.abs(z1 - z0)], oneWay: false });
  return [c(r.x0, hx0, r.z0, r.z1), c(hx1, r.x1, r.z0, r.z1), c(hx0, hx1, r.z0, hz0), c(hx0, hx1, hz1, r.z1)];
}

/**
 * Bordsteine an einer Rampe (Figur ohne Sprung fällt nicht seitlich hinunter): Kette kurzer Quader entlang x von xa
 * (Höhe ya) bis xb (Höhe yb) bei z, je `h` m über der Rampenoberfläche. Kollision + Steine in Q (Quads) bzw. b (Bld).
 */
export function randsteine(level, b, o) {
  const n = Math.max(1, Math.round(Math.abs(o.xb - o.xa) / (o.step ?? 0.8)));
  const hh = o.h ?? 0.45;
  for (let i = 0; i < n; i++) {
    const xa = o.xa + ((o.xb - o.xa) * i) / n, xb = o.xa + ((o.xb - o.xa) * (i + 1)) / n;
    const ya = o.ya + ((o.yb - o.ya) * i) / n, yb = o.ya + ((o.yb - o.ya) * (i + 1)) / n;
    const top = Math.max(ya, yb) + hh, bot = Math.min(ya, yb) - 0.6;
    level.world.add({ type: 'box', min: [Math.min(xa, xb), bot, o.z - 0.12], max: [Math.max(xa, xb), top, o.z + 0.12], camIgnore: true, noWallSlide: true, tag: 'randstein' });
    b?.box(Math.abs(xb - xa) - 0.04, top - bot, 0.26, (xa + xb) / 2, bot, o.z, i % 2 ? 0x5a4a50 : 0x6e5c62, { r: 0.05 });
    b?.box(Math.abs(xb - xa) - 0.06, 0.08, 0.3, (xa + xb) / 2, top - 0.06, o.z, i % 2 ? 0xffc21a : 0x2a2228, { r: 0.02 });
  }
}

/**
 * Felsunterbau des schwebenden Diorama-Kessels: zerklüfteter Basaltkegel mit Glutadern unter der Grundfläche
 * (x0..x1, z0..z1, Unterkante y). Nur Optik (statisch, zwei Materialien: Fels und Glüh-Adern).
 */
export function glutInsel(level, o) {
  if (!level.view) return;
  const rnd = new Rnd(o.seed ?? 77);
  const b = new Bld(), g = new Bld();
  const cx = (o.x0 + o.x1) / 2, cz = (o.z0 + o.z1) / 2, W = o.x1 - o.x0, D = o.z1 - o.z0;
  const rock = gradY(0x1e1418, 0x4a3a40, o.y - 16, o.y);
  // gestufte Felsplatten nach unten schmaler
  for (let k = 0; k < 5; k++) {
    const s = 1 - k * 0.17, hh = 3.2;
    b.box(W * s, hh, D * s, cx + rnd.real(-0.8, 0.8), o.y - (k + 1) * hh, cz + rnd.real(-0.8, 0.8), rock, { r: 0.6, yaw: rnd.real(-0.05, 0.05) });
  }
  b.cone(W * 0.22, 6, cx, o.y - 22, cz, 0x1e1418, 7, { rx: Math.PI });
  // Felsbrocken am Rand und Glutadern
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * TAU + rnd.real(-0.1, 0.1);
    const r = Math.min(W, D) * rnd.real(0.36, 0.5);
    const yy = o.y - rnd.real(1, 9);
    b.sphere(rnd.real(0.9, 1.8), cx + Math.cos(a) * r, yy, cz + Math.sin(a) * r, 0x3a2c32, { s: [1, 0.7, 1], ws: 7, hs: 5 });
  }
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU + rnd.real(-0.2, 0.2);
    const side = i % 4;
    const len = rnd.real(3, 7);
    const px = side === 0 ? o.x0 - 0.05 : side === 1 ? o.x1 + 0.05 : cx + Math.cos(a) * W * 0.3;
    const pz = side === 2 ? o.z0 - 0.05 : side === 3 ? o.z1 + 0.05 : cz + Math.sin(a) * D * 0.3;
    g.box(side < 2 ? 0.08 : 0.35, len, side < 2 ? 0.35 : 0.08, px, o.y - len - rnd.real(0.5, 4), pz, 0xff7a1a, { r: 0.02 });
  }
  b.flush(level, { castShadow: false });
  g.flush(level, { material: 'glow', castShadow: false });
}

/**
 * Goldene Krone (Zier auf dem Gipfel) und Gipfelfahne mit Kronen-Wimpel: Krone (Reif, fünf Zacken, Edelsteine) auf
 * pos, Fahne daneben. Nur Optik (statisch); Leuchtsteine im Glüh-Material.
 */
export function kronenZier(level, o) {
  if (!level.view) return;
  const [x, y, z] = o.pos, s = o.size ?? 1;
  const b = new Bld(), g = new Bld();
  b.cyl(0.9 * s, 0.82 * s, 0.25 * s, x, y, z, 0xb8862a, 20);
  b.cyl(1.0 * s, 0.95 * s, 0.75 * s, x, y + 0.25 * s, z, litTop(0xffc83a, 0.9), 24, { open: true });
  b.cyl(0.94 * s, 0.94 * s, 0.7 * s, x, y + 0.27 * s, z, 0x8a1424, 20);
  b.torus(0.98 * s, 0.09 * s, x, y + 0.3 * s, z, 0xf4f0ff, { rx: Math.PI / 2 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + 0.3;
    const px = x + Math.cos(a) * 0.95 * s, pz = z + Math.sin(a) * 0.95 * s;
    b.cone(0.28 * s, 0.75 * s, px, y + 0.95 * s, pz, 0xffc83a, 6);
    b.sphere(0.12 * s, px, y + 1.75 * s, pz, 0xfff6ea, { ws: 8, hs: 6 });
    g.sphere(0.13 * s, x + Math.cos(a + 0.63) * 1.0 * s, y + 0.62 * s, z + Math.sin(a + 0.63) * 1.0 * s, [0xff2a4a, 0x3a8aff, 0x3ad86a, 0xff2a4a, 0x3a8aff][i], { ws: 8, hs: 6 });
  }
  b.sphere(0.32 * s, x, y + 1.25 * s, z, 0xffd860, { ws: 10, hs: 8 });
  if (o.flag) {
    const [fx, fy, fz] = o.flag, H = o.flagH ?? 5;
    b.cyl(0.08, 0.1, H, fx, fy, fz, 0xe8e0d0, 8);
    b.sphere(0.2, fx, fy + H + 0.1, fz, 0xffd23d, { ws: 8, hs: 6 });
    // Wimpel (zwei dünne Keile, rot und gold)
    b.box(2.2, 1.2, 0.05, fx + 1.15, fy + H - 1.4, fz, 0xd8283a, { r: 0.02 });
    b.box(1.4, 0.3, 0.06, fx + 1.0, fy + H - 0.95, fz, 0xffc83a, { r: 0.02 });
    b.box(0.5, 0.5, 0.07, fx + 1.1, fy + H - 1.25, fz, 0xffe070, { yaw: 0, rz: Math.PI / 4, r: 0.02 });
  }
  b.flush(level, { castShadow: true });
  g.flush(level, { material: 'glow', castShadow: false });
}

/** Bewegte Funkel-Uhr: liefert eine Zeitfunktion (Bildzeit, angehalten mit der Simulation). */
export function bildUhr(level) {
  const st = { t: 0 }, h = {};
  if (level.view) level.view.onFrame((dt) => { st.t += visDt(level, h, dt); });
  return () => st.t;
}
