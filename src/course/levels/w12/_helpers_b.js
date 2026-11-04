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

// =====================================================================================================================
// 3) K-Haus
// =====================================================================================================================

/** Eigene Tapeten der Marathon-Räume (128-px-Kachel = 1 m): Krone, Eis, Glut, Garten, Wolken. */
const TAPETEN_K = {
  krone(g, S) {      // Siegerflur: Weinrot mit goldenen Kronen und Sternchen
    g.fillStyle = '#7a1428'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#8a1e32'; for (let i = 0; i < 4; i++) g.fillRect(i * 32, 0, 14, S);
    const crown = (x, y, s) => {
      g.fillStyle = '#ffc83a';
      g.beginPath(); g.moveTo(x - s, y + s * 0.6); g.lineTo(x - s, y - s * 0.3); g.lineTo(x - s * 0.5, y + s * 0.1); g.lineTo(x, y - s * 0.6);
      g.lineTo(x + s * 0.5, y + s * 0.1); g.lineTo(x + s, y - s * 0.3); g.lineTo(x + s, y + s * 0.6); g.closePath(); g.fill();
      g.fillStyle = '#ff4a6a'; g.beginPath(); g.arc(x, y + s * 0.25, s * 0.16, 0, TAU); g.fill();
    };
    crown(32, 36, 14); crown(96, 98, 14);
    g.fillStyle = '#ffe9a0';
    for (const [x, y] of [[96, 30], [30, 96]]) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 3 : 7; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.fill(); }
  },
  eis(g, S) {        // Eisrutsche: Hellblau mit Schneeflocken
    g.fillStyle = '#d8f0ff'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#c4e4fa'; for (let i = 0; i < 8; i++) g.fillRect(0, i * 16 + 6, S, 3);
    g.strokeStyle = '#7ab8e8'; g.lineWidth = 3;
    for (const [x, y, r] of [[32, 34, 16], [96, 96, 16], [96, 30, 8], [30, 98, 8]]) for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI; g.beginPath(); g.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.stroke();
    }
  },
  glut(g, S) {       // Glutzimmer: dunkles Rotbraun mit glühenden Rissen
    g.fillStyle = '#3a1612'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#4a1e16'; for (let i = 0; i < 4; i++) g.fillRect(i * 32 + 2, 0, 28, S);
    g.strokeStyle = '#ff7a2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(10, 0); g.lineTo(26, 40); g.lineTo(14, 78); g.lineTo(34, 128); g.stroke();
    g.beginPath(); g.moveTo(86, 0); g.lineTo(100, 52); g.lineTo(84, 90); g.lineTo(104, 128); g.stroke();
    g.strokeStyle = '#ffd04a'; g.lineWidth = 1; g.beginPath(); g.moveTo(26, 40); g.lineTo(48, 52); g.stroke(); g.beginPath(); g.moveTo(84, 90); g.lineTo(64, 100); g.stroke();
  },
  garten(g, S) {     // Topfgarten: Mintgrün mit Blättern und Blüten
    g.fillStyle = '#c8f0c8'; g.fillRect(0, 0, S, S);
    for (const [x, y, c] of [[30, 30, '#ff6a8a'], [94, 94, '#ffd23d'], [94, 30, '#7ab8ff'], [30, 94, '#c87aff']]) {
      g.fillStyle = '#5ab85a'; g.beginPath(); g.ellipse(x - 9, y + 10, 8, 4, 0.6, 0, TAU); g.fill(); g.beginPath(); g.ellipse(x + 9, y + 10, 8, 4, -0.6, 0, TAU); g.fill();
      g.fillStyle = c; for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; g.beginPath(); g.arc(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 5, 0, TAU); g.fill(); }
      g.fillStyle = '#fff4a0'; g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill();
    }
  },
  wolken(g, S) {     // Himmelssteg: Himmelblau mit Wolken
    const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, '#7ec8ff'); gr.addColorStop(1, '#bfe6ff'); g.fillStyle = gr; g.fillRect(0, 0, S, S);
    g.fillStyle = '#ffffff';
    for (const [x, y] of [[32, 40], [96, 100]]) for (const [dx, dy, r] of [[-12, 4, 10], [0, -4, 13], [13, 3, 10], [4, 8, 9]]) { g.beginPath(); g.arc(x + dx, y + dy, r, 0, TAU); g.fill(); }
  },
};

function uvQuadK(acc, x, y, z, w, h, face, uv) {
  let c;
  if (face === '+z') c = [[x - w / 2, y, z], [x + w / 2, y, z], [x + w / 2, y + h, z], [x - w / 2, y + h, z]];
  else if (face === '+x') c = [[x, y, z + w / 2], [x, y, z - w / 2], [x, y + h, z - w / 2], [x, y + h, z + w / 2]];
  else c = [[x, y, z - w / 2], [x, y, z + w / 2], [x, y + h, z + w / 2], [x, y + h, z - w / 2]];
  const [u0, v0, u1, v1] = uv;
  const t = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
  for (const k of [0, 1, 2, 0, 2, 3]) { acc.pos.push(...c[k]); acc.uv.push(...t[k]); }
}

/** Eigene Tapete eines Raums (wie tapete der Welt 6): r = { id, z0, len, h, y: 1, w: 14 }, style ∈ TAPETEN_K. */
export function tapeteK(level, r, style) {
  if (!level.view || !TAPETEN_K[style] || typeof document === 'undefined') return;
  const W = r.w ?? 14, H = r.h ?? 5, y = r.y ?? 1, x0 = -W / 2, x1 = W / 2, zEnd = r.z0 - r.len;
  const zMid = (r.z0 + 1 + zEnd) / 2, zLen = r.len + 1, hh = H - 1.08 - 0.14;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  TAPETEN_K[style](c.getContext('2d'), 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 4;
  const acc = { pos: [], uv: [] };
  uvQuadK(acc, 0, y + 1.08, zEnd + 0.012, W, hh, '+z', [0, 0, W / 2, hh / 2]);
  uvQuadK(acc, x0 + 0.012, y + 1.08, zMid, zLen, hh, '+x', [0, 0, zLen / 2, hh / 2]);
  uvQuadK(acc, x1 - 0.012, y + 1.08, zMid, zLen, hh, '-x', [0, 0, zLen / 2, hh / 2]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(acc.pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(acc.uv, 2));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
  m.receiveShadow = true;
  m.name = `tapete:${r.id}`;
  addObject(level, m);
}
export const TAPETEN_K_NAMEN = Object.keys(TAPETEN_K);

/**
 * Raum-Sterne, die erst nach einer Bedingung erscheinen (Fackeln an, Schalter gedrückt, Kiste zerbrochen, Wirbelbrocken
 * besiegt …): list [{ index, cond: (level) => bool, pos?: [x, y, z] }]. Beim Einblenden des Raums (auch nach einem
 * Neustart) wird der Stern versteckt; sobald cond() gilt, erscheint er (Funken, Klang, Ring) an pos bzw. seinem Platz.
 * Liefert { shown: Set(index), reveals }.
 */
export function versteckteSterne(level, list) {
  const st = { shown: new Set(), reveals: 0, last: '' };
  const find = (i) => level.entities.find((e) => e.kind === 'star' && e.index === i && !e.removed);
  const hide = (i) => { const s = find(i); if (!s || level.runtime.stars[i]) return; s.hidden = true; s.touch = false; if (s.model) s.model.root.visible = false; st.shown.delete(i); };
  for (const r of list) hide(r.index);
  level.onStep(() => {
    const h = level.house;
    if (!h) return;
    const r = list.find((q) => q.index === h.room);
    const key = `${h.room}|${h.phase}`;
    if (key !== st.last) {
      if (r && h.phase === 'fadein') hide(r.index);
      st.last = key;
    }
    if (!r || h.phase !== 'play' || st.shown.has(r.index) || level.runtime.stars[r.index]) return;
    if (!r.cond(level)) return;
    const s = find(r.index);
    if (!s) return;
    s.reveal(r.pos);
    level.effects?.ring({ x: s.pos.x, y: s.pos.y - 0.3, z: s.pos.z }, 1.8);
    st.shown.add(r.index); st.reveals++;
  });
  return st;
}

/**
 * Drehteller (K-Haus Raum 26): flache runde Scheibe (Zylinder r, Oberseite top) dreht sich stetig um ihre Mitte und nimmt
 * Figuren mit (mover.dyaw); Entitäten in riders (Ids, z. B. Schnappblumen) werden mitgedreht (Lage und Blick).
 * o = { id, pos: [x, z], r, top, speed: 0.6 (rad/s), riders: [Id …] }. Darstellung: Holzscheibe mit Goldrand und Speichen.
 */
export function drehteller(level, o) {
  const [cx, cz] = o.pos, r = o.r, top = o.top, w = o.speed ?? 0.6;
  const mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx, cz };
  const shape = { type: 'cyl', x: cx, z: cz, r, y0: top - 0.4, y1: top, mover, tag: 'drehteller' };
  level.world.add(shape);
  const st = { angle: 0, mover, riders: null };
  if (o.id) level.named.set(o.id, st);
  level.onStep((dt) => {
    const da = w * dt;
    st.angle += da;
    mover.dyaw = da;
    if (!st.riders) st.riders = (o.riders ?? []).map((id) => level.entities.find((e) => e.spec?.id === id)).filter(Boolean);
    const ca = Math.cos(da), sa = Math.sin(da);
    for (let k = 0; k < st.riders.length; k++) {
      let e = st.riders[k];
      if (e.removed) { e = level.entities.find((q) => q.spec?.id === e.spec?.id && !q.removed); if (!e) continue; st.riders[k] = e; }
      const dx = e.pos.x - cx, dz = e.pos.z - cz;
      e.pos.x = cx + dx * ca + dz * sa; e.pos.z = cz - dx * sa + dz * ca;
      e.yaw = (e.yaw ?? 0) + da;
    }
  });
  if (level.view) {
    const b = new Bld();
    b.cyl(r, r, 0.4, 0, -0.4, 0, litTop(0xc8904a, 0.8), 36);
    b.cyl(r + 0.08, r + 0.08, 0.12, 0, -0.1, 0, 0xffc83a, 36);
    for (let k = 0; k < 8; k++) b.box(r * 1.9, 0.03, 0.18, 0, -0.005, 0, k % 2 ? 0x9a6a36 : 0xb07a3e, { yaw: (k / 8) * Math.PI, r: 0 });
    b.cyl(r * 0.55, r * 0.55, 0.04, 0, 0, 0, 0xe8b070, 30);
    const g = b.geometry();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }));
    m.receiveShadow = true; m.castShadow = true; m.name = 'drehteller';
    m.position.set(cx, top, cz);
    addObject(level, m, () => { m.rotation.y = st.angle; });
  }
  return st;
}

/**
 * Nur der laufende Raum (Prüfungs-Haus mit vielen Räumen hintereinander): die Kamera zeichnet je Bild nur so weit, wie der
 * laufende Raum reicht (Fernebene knapp hinter seiner hintersten unteren Ecke) – die folgenden Räume liegen dahinter und
 * fallen samt Gegnern, Sternen und Instanzen aus der Sicht- und Schattenprüfung (sichtbar war von ihnen hinter Rückwand und
 * Vorhang ohnehin nichts). boxes[i] = [x0, y0, z0, x1, y1, z1] je Raum. Liefert { far }.
 */
export function nurRaumSicht(level, boxes, o = {}) {
  const st = { far: 0 };
  if (!level.view) return st;
  const cam = level.view.camera, base = cam.far;
  const d = new THREE.Vector3(), q = new THREE.Vector3();
  level.view.onFrame(() => {
    const h = level.house, b = h ? boxes[h.room] : null;
    if (!b) { if (cam.far !== base) { cam.far = base; cam.updateProjectionMatrix(); } return; }
    cam.getWorldDirection(d);
    let far = 0;
    for (const x of [b[0], b[3]]) for (const y of [b[1], b[4]]) for (const z of [b[2], b[5]]) far = Math.max(far, q.set(x, y, z).sub(cam.position).dot(d));
    far = Math.max(20, far + (o.margin ?? 3));
    if (Math.abs(far - cam.far) > 0.05) { cam.far = far; cam.updateProjectionMatrix(); }
    st.far = far;
  });
  // Objekte ohne Sichtprüfung (frustumCulled false, z. B. Instanz-Gruppen der Donut-Blöcke), die ganz in einem Raum liegen,
  // zeichnen nur in diesem Raum
  const own = [];
  const bb = new THREE.Box3(), mb = new THREE.Box3(), M = new THREE.Matrix4();
  for (const m of level.view.three.children) {
    if (!m.isMesh || m.frustumCulled !== false || !m.geometry) continue;
    m.updateMatrixWorld(true);
    m.geometry.computeBoundingBox();
    bb.makeEmpty();
    if (m.isInstancedMesh) for (let k = 0; k < m.count; k++) { m.getMatrixAt(k, M); mb.copy(m.geometry.boundingBox).applyMatrix4(M).applyMatrix4(m.matrixWorld); bb.union(mb); }
    else bb.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld);
    if (bb.isEmpty()) continue;
    const ri = boxes.findIndex((b) => bb.min.z >= b[2] - 2 && bb.max.z <= b[5] + 2);
    if (ri >= 0) own.push([m, ri]);
  }
  st.own = own.length;
  level.view.onFrame(() => { const r = level.house?.room; for (const [m, ri] of own) m.visible = r === undefined || r === ri; });
  return st;
}

/** Walzenwerfer eines Raums beginnen frisch (alte Walzen in zBox [zA, zB] zerfallen, erster Wurf nach takt[k] s). */
export function frischeWalzen(level, ids, takt, zBox) {
  for (const e of level.entities) if (e.kind === 'stachelwalze' && !e.removed && e.pos.z < zBox[0] && e.pos.z > zBox[1]) e.kill();
  ids.forEach((id, k) => {
    const w = level.named.get(id) ?? level.entities.find((e) => e.spec?.id === id && !e.removed);
    if (!w || w.removed || w.defeated) return;
    w.walzen = [];
    const r = takt?.[k];
    if (r !== undefined && r < 1.5 && w.setState) { w.setState('spit'); w.stateT = 1.5 - r; w.cool = w.interval; }
    else { w.cool = r !== undefined ? r - 1.5 : (w.spec.first ?? 0.8); w.setState?.('idle'); }
  });
}
