// Hilfen für die Halloween-Level H-1 „Kullerkürbisse im Abendrot“ und H-2 „Klingelstreich im Schlummerdorf“ (kein Level:
// exportiert kein LEVEL, die Level-Registry überspringt dieses Modul). Nur für diese beiden Level – andere Halloween-Level
// haben eigene Hilfsdateien.
//
// Oben reine Daten-Helfer (Inseln, Münz- und Süßigkeitenspuren, Schilder), darunter level-lokale Kulisse und kleine
// Entitäten, die es als Baustein nicht gibt:
//   Kürbisfeld (H-1)  rote Scheune (begehbares Dach), Windmühle mit drehenden Flügeln und Galerie, Hoftor, Ackerfurchen,
//                     Kürbis-Trittsteine (Kollision passend zum Registry-Kürbis), Winke-Kürbis (winkt zurück; Stampfen →
//                     Stern), Krümel mit Laterne (verlaufen im Mais; gefunden → Stern), Laternenpfad (Laternenpfähle gehen
//                     an, sobald die Figur vorbeikommt), Krähen auf Zaunpfählen.
//   Dorf (H-2)        siehe unten (Kirchlein, Brunnen, kichernder Geist am Grabstein …).
// Statische Teile gehen über addStatic in die Abschnitts-Meshes (keine zusätzlichen Zeichenaufrufe); belebte Teile sind je
// ein kleines Objekt ohne Sonnenschatten.

import * as THREE from 'three';
import { box, colorize, merge, lin, mixc, smooth, hex, addStatic, addObject, wedge, themeOf } from '../../blocks/kit.js';
import { CourseEntity } from '../../entities/CourseEntity.js';
import { runAction, visDt } from '../../entities/gimmick.js';
import { getModel, hasModel } from '../../models/index.js';
import { HWC, pumpkinGeo, faceGeo, softTexture, hwSfx, figures } from '../../blocks/hwkit.js';

const TAU = Math.PI * 2;
const L = (c) => lin(hex(c));
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const fill = (g, c) => { const col = Array.isArray(c) ? c : L(c); return colorize(ni(g), (p, n, o) => { o[0] = col[0]; o[1] = col[1]; o[2] = col[2]; }); };
const shadeY = (g, lo, hi, a = -0.6, b = 0.9) => { const A = L(lo), B = L(hi); return colorize(ni(g), (p, n, o) => mixc(A, B, smooth(a, b, n.y * 0.75 + n.z * 0.2 - n.x * 0.1), o)); };
const at = (g, x, y, z, yaw = 0) => { if (yaw) g.rotateY(yaw); g.translate(x, y, z); return g; };

// =====================================================================================================================
// Daten-Helfer
// =====================================================================================================================

/** Insel über ihre Grundfläche x0..x1, zA..zB (Reihenfolge egal), Oberseite top, Höhe h; o: weitere Felder (under 0). */
export function isl(x0, x1, zA, zB, top, h = 4, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  return { type: 'island', pos: [(x0 + x1) / 2, top - h, (z0 + z1) / 2], size: [x1 - x0, h, z0 - z1], under: 0, ...o };
}
/** Münzreihe von a nach b (n Münzen). */
export const line = (a, b, n) => ({ kind: 'coins', from: a, to: b, n });
/** Münzbogen von a nach b mit Scheitel h (n Münzen, Enden eingeschlossen). */
export function arc(a, b, n, h, kind = 'coin', extra = {}) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    out.push({ kind, ...extra, pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * h * t * (1 - t), a[2] + (b[2] - a[2]) * t] });
  }
  return out;
}
/** Münzring (waagerecht) um c mit Radius r. */
export const ring = (c, r, n) => ({ kind: 'coins', pos: c, r, n });
/** Süßigkeiten-Reihe von a nach b (Fußpunkte; n Stück). */
export const candy = (a, b, n, variant) => ({ kind: 'suessigkeiten', from: a, to: b, n, ...(variant ? { variant } : {}) });
/** Süßigkeiten-Kreis um c. */
export const candyRing = (c, r, n, variant) => ({ kind: 'suessigkeiten', pos: c, r, n, ...(variant ? { variant } : {}) });
/** Süßigkeiten im Bogen (einzeln; Fußpunkte, das Item schwebt darüber). */
export const candyArc = (a, b, n, h, variant) => arc(a, b, n, h, 'suessigkeit', variant ? { variant } : {});
/** Holzschild. */
export const sign = (x, y, z, text, o = {}) => ({ type: 'sign', pos: [x, y, z], text, size: o.size ?? [2.6, 0.9], yaw: o.yaw ?? 0, ...(o.post ? { post: o.post } : {}) });

// =====================================================================================================================
// Kleine Werkzeuge
// =====================================================================================================================

let glowTex = null;
function glowTexture() {
  if (glowTex) return glowTex;
  if (typeof document === 'undefined') return null;
  glowTex = softTexture();
  return glowTex;
}

/** Sprechblase (Sprite mit Leinwand-Text). */
export function bubbleSprite(text, sub, o = {}) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  const r = 46;
  g.fillStyle = o.fill ?? '#fff8ec'; g.strokeStyle = o.stroke ?? '#4a2a6a'; g.lineWidth = 10;
  g.beginPath();
  g.moveTo(30 + r, 20); g.lineTo(482 - r, 20); g.quadraticCurveTo(482, 20, 482, 20 + r); g.lineTo(482, 180 - r);
  g.quadraticCurveTo(482, 180, 482 - r, 180); g.lineTo(290, 180); g.lineTo(240, 238); g.lineTo(236, 180); g.lineTo(30 + r, 180);
  g.quadraticCurveTo(30, 180, 30, 180 - r); g.lineTo(30, 20 + r); g.quadraticCurveTo(30, 20, 30 + r, 20); g.closePath();
  g.fill(); g.stroke();
  g.fillStyle = o.ink ?? '#4a2a6a'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'bold 60px "Nunito", "Arial Rounded MT Bold", Arial, sans-serif';
  g.fillText(text, 256, sub ? 80 : 100);
  if (sub) { g.font = 'bold 36px "Nunito", "Arial Rounded MT Bold", Arial, sans-serif'; g.fillStyle = o.sub ?? '#e8641c'; g.fillText(sub, 256, 140); }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(2.4, 1.2, 1);
  sp.renderOrder = 6;
  return sp;
}

/** Nächste Figur (lebend) zu (x, z) und ihr Abstand. */
function nearest(level, x, z) {
  let best = null, d = Infinity;
  for (const f of figures(level)) { const q = Math.hypot(f.pos.x - x, f.pos.z - z); if (q < d) { d = q; best = f; } }
  return { f: best, d };
}

// =====================================================================================================================
// Kürbisfeld (H-1): Kulisse
// =====================================================================================================================

/**
 * Rampe wie der Baustein ramp (Keil mit Grasdecke), aber mit camIgnore: Die Kamera prüft Formen als Quader – hinter einer
 * Figur, die eine lange Rampe hinaufläuft, läge sonst der ganze Rampenquader im Kamerastrahl und die Kamera rückte dicht
 * heran. o: { x0, x1, z0, z1, y (Fuß), low (Höhe der Oberseite am unteren Ende über y, 0), h (oben über y), axis 'z' | 'x',
 * dir −1 | 1, top: 'grass' | 'stone', path: Breite eines Erdwegs in der Mitte (0 = keiner) }.
 */
export function rampe(level, o) {
  const th = themeOf(level);
  const x0 = Math.min(o.x0, o.x1), x1 = Math.max(o.x0, o.x1), z0 = Math.min(o.z0, o.z1), z1 = Math.max(o.z0, o.z1);
  const axis = o.axis ?? 'z', dir = o.dir ?? -1, y = o.y, lowY = y + (o.low ?? 0), top = y + o.h;
  level.world.add({ type: 'ramp', min: [x0, y, z0], max: [x1, top, z1], axis, dir, low: lowY, camIgnore: true, tag: 'rampe' });
  const topC = o.top === 'stone' ? th.stone : th.grassTop, sideC = o.top === 'stone' ? th.stoneDark : th.dirt;
  addStatic(level, wedge(x0, y, z0, x1, top, z1, axis, dir, lowY, topC, sideC));
  if (o.path) {
    // Erdweg: dünner Keil knapp über der Grasdecke
    const w = o.path / 2, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const g = axis === 'z'
      ? wedge(cx - w, y + 0.02, z0, cx + w, top + 0.025, z1, axis, dir, lowY + 0.025, 0x9a6a42, 0x7a4a2a)
      : wedge(x0, y + 0.02, cz - w, x1, top + 0.025, cz + w, axis, dir, lowY + 0.025, 0x9a6a42, 0x7a4a2a);
    addStatic(level, g, { castShadow: false });
  }
}

/**
 * Rote Scheune mit Satteldach (First entlang z), weißen Eckbalken, großem Tor mit weißem X und Heuboden-Luke. Begehbar:
 * Wände als Quader, das Dach als zwei Rampen (man kann hinauflaufen/-springen). o: { pos: [x, y, z] (Mitte am Boden),
 * w (Breite x, 7), d (Tiefe z, 8), h (Wandhöhe, 4), roof (Firsthöhe über der Wand, 2.6), color, hay: true }.
 */
export function scheune(level, o) {
  const [x, y, z] = o.pos;
  const w = o.w ?? 7, d = o.d ?? 8, h = o.h ?? 4, rh = o.roof ?? 2.6;
  const red = o.color ?? 0xc0402e, white = 0xfff2e0, roofC = 0x6a3a3a, roofHi = 0x9a5248;
  const P = [], G = [];
  // Wände (mit Plankenrillen über die Farbe)
  const wall = box(w, h, d, x, y + h / 2, z, red, { r: 0.06, seg: 1 });
  P.push(colorize(wall, (p, n, out) => { const rr = L(red); mixc(rr, [rr[0] * 0.78, rr[1] * 0.74, rr[2] * 0.74], Math.abs(Math.sin((Math.abs(n.z) > 0.5 ? p.x : p.z) * 6)) > 0.93 ? 1 : 0, out); if (n.y < -0.5) { out[0] *= 0.6; out[1] *= 0.6; out[2] *= 0.6; } }));
  // Giebel vorn und hinten (Dreiecke als Prisma)
  const gable = new THREE.BufferGeometry();
  const gv = [];
  for (const sz of [1, -1]) {
    const zz = z + sz * d / 2;
    const a = [x - w / 2, y + h, zz], b = [x + w / 2, y + h, zz], c = [x, y + h + rh, zz];
    if (sz > 0) gv.push(...a, ...b, ...c); else gv.push(...b, ...a, ...c);
  }
  gable.setAttribute('position', new THREE.Float32BufferAttribute(gv, 3));
  gable.computeVertexNormals();
  P.push(fill(gable, red));
  // Eckbalken und Torrahmen weiß
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push(box(0.3, h + 0.05, 0.3, x + sx * (w / 2 - 0.1), y + h / 2, z + sz * (d / 2 - 0.1), white, { r: 0.05, seg: 1 }));
  const dw = Math.min(3.2, w * 0.45), dh = Math.min(3.0, h * 0.72), fz = z + d / 2 + 0.06;
  P.push(box(dw + 0.3, 0.22, 0.12, x, y + dh, fz, white, { r: 0.04, seg: 1 }));
  for (const sx of [-1, 1]) P.push(box(0.22, dh, 0.12, x + sx * dw / 2, y + dh / 2, fz, white, { r: 0.04, seg: 1 }));
  P.push(box(dw - 0.1, dh - 0.1, 0.08, x, y + dh / 2, fz - 0.03, 0x8a2a20, { r: 0.02, seg: 1 }));
  for (const s of [-1, 1]) {
    const bar = box(Math.hypot(dw / 2, dh), 0.18, 0.1, 0, 0, 0, white, { r: 0.03, seg: 1 });
    bar.rotateZ(s * Math.atan2(dh, dw / 2) * 1);
    bar.translate(x + s * dw / 4, y + dh / 2, fz + 0.04);
    P.push(bar);
    const bar2 = box(Math.hypot(dw / 2, dh), 0.18, 0.1, 0, 0, 0, white, { r: 0.03, seg: 1 });
    bar2.rotateZ(-s * Math.atan2(dh, dw / 2));
    bar2.translate(x + s * dw / 4, y + dh / 2, fz + 0.04);
    P.push(bar2);
  }
  // Heuboden-Luke im Giebel mit heraushängendem Stroh
  const ly = y + h + 0.35;
  P.push(box(1.3, 1.1, 0.1, x, ly + 0.55, fz, white, { r: 0.04, seg: 1 }));
  P.push(box(1.05, 0.85, 0.06, x, ly + 0.55, fz + 0.03, 0x3a1a14, { r: 0.02, seg: 1 }));
  if (o.hay !== false) for (let i = 0; i < 7; i++) P.push(box(0.12, 0.05, 0.5, x - 0.42 + i * 0.14, ly + 0.12 + (i % 2) * 0.04, fz + 0.2, HWC.straw, { r: 0.02, seg: 1 }));
  // Dach: zwei Schrägen mit Schindelreihen
  const slope = Math.hypot(w / 2 + 0.35, rh);
  const ang = Math.atan2(rh, w / 2 + 0.35);
  for (const s of [-1, 1]) {
    const rf = new THREE.BoxGeometry(slope, 0.22, d + 0.7, 8, 1, 1);
    rf.rotateZ(-s * ang);
    rf.translate(x + s * (w / 4 + 0.1), y + h + rh / 2 + 0.08, z);
    P.push(colorize(ni(rf), (p, n, out) => { const t = (p.y - y - h) / rh; mixc(L(roofC), L(roofHi), (Math.sin(t * 20) > 0.6 ? 0.55 : 0) + (n.y > 0.3 ? 0.15 : 0), out); }));
  }
  P.push(box(0.3, 0.3, d + 0.8, x, y + h + rh + 0.06, z, 0x4a2a2a, { r: 0.1, seg: 1 }));
  // Hahn-Wetterfahne (Kürbis obendrauf)
  const pk = pumpkinGeo({ r: 0.32, color: 'orange', leaf: true });
  P.push(at(pk.body, x, y + h + rh + 0.2, z + d / 2 - 0.4));
  G.push(at(faceGeo({ r: 0.32, kind: 'lachen' }), x, y + h + rh + 0.2, z + d / 2 - 0.4, -Math.PI / 2));
  addStatic(level, merge(P));
  addStatic(level, merge(G), { material: 'glow', castShadow: false });
  // Kollision: Wände + Dach (zwei Rampen entlang x)
  level.world.add({ type: 'box', min: [x - w / 2, y, z - d / 2], max: [x + w / 2, y + h, z + d / 2], tag: 'scheune' });
  level.world.add({ type: 'ramp', axis: 'x', dir: 1, min: [x - w / 2 - 0.35, y + h, z - d / 2 - 0.35], max: [x, y + h + rh, z + d / 2 + 0.35], low: y + h, tag: 'scheune:dach' });
  level.world.add({ type: 'ramp', axis: 'x', dir: -1, min: [x, y + h, z - d / 2 - 0.35], max: [x + w / 2 + 0.35, y + h + rh, z + d / 2 + 0.35], low: y + h, tag: 'scheune:dach' });
}

/**
 * Windmühle (Holländer) mit drehenden Flügeln und umlaufender Galerie (begehbar): Turm als achteckiger Kegelstumpf,
 * Kappe, vier Gitterflügel zur Kamera (+Z), Galerie mit Geländer in Höhe gallery. o: { pos (Mitte am Boden), height (Turm,
 * 12), r0 (unten, 2.6), r1 (oben, 1.7), gallery (Höhe der Galerie über pos.y, height − 4), speed (Flügel rad/s, 0.6) }.
 * level.named 'muehle' = { y (Galerie-Oberseite), r (Galerie-Außenradius) }.
 */
export function windmuehle(level, o) {
  const [x, y, z] = o.pos;
  const H = o.height ?? 12, r0 = o.r0 ?? 2.6, r1 = o.r1 ?? 1.7;
  const gy = y + (o.gallery ?? H - 4);
  const P = [], G = [];
  const tower = new THREE.CylinderGeometry(r1, r0, H, 8, 6);
  tower.translate(x, y + H / 2, z);
  P.push(colorize(ni(tower), (p, n, out) => {
    const k = (p.y - y) / H;
    mixc(L(0xe8d8c0), L(0xfff4e4), smooth(-0.4, 0.8, n.z * 0.6 + n.x * 0.3), out);
    if (Math.abs(Math.sin(k * 30)) > 0.94) { out[0] *= 0.86; out[1] *= 0.84; out[2] *= 0.82; }
  }));
  // Fenster und Tür
  P.push(box(1.1, 2.0, 0.2, x, y + 1.0, z + r0 - 0.05, 0x7a4a2a, { r: 0.08, seg: 1 }));
  for (const [wy, wr] of [[H * 0.42, 0.55], [H * 0.66, 0.45]]) {
    const rr = r0 + (r1 - r0) * (wy / H);
    G.push(fill(at(new THREE.CircleGeometry(wr * 0.5, 10), x, y + wy, z + rr * 0.93 + 0.08), 0xffd890));
    P.push(fill(at(new THREE.RingGeometry(wr * 0.5, wr * 0.68, 10), x, y + wy, z + rr * 0.93 + 0.07), 0x7a4a2a));
  }
  // Kappe (Holz, rund) mit Spitze
  const cap = new THREE.SphereGeometry(r1 * 1.18, 12, 6, 0, TAU, 0, Math.PI / 2);
  cap.scale(1, 0.85, 1.15); cap.translate(x, y + H, z);
  P.push(shadeY(cap, 0x6a3a2a, 0xa85a3a));
  // Galerie: Boden (Ring) + Geländer
  const gr = r0 + (r1 - r0) * ((gy - y) / H) + 1.5;
  const deck = new THREE.CylinderGeometry(gr, gr, 0.3, 20, 1);
  deck.translate(x, gy - 0.15, z);
  P.push(shadeY(deck, 0x6a4424, 0xc0884a));
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * TAU;
    P.push(box(0.1, 0.9, 0.1, x + Math.cos(a) * (gr - 0.1), gy + 0.45, z + Math.sin(a) * (gr - 0.1), 0x6a4424, { r: 0.02, seg: 1 }));
  }
  const rail = new THREE.TorusGeometry(gr - 0.1, 0.06, 4, 28);
  rail.rotateX(Math.PI / 2); rail.translate(x, gy + 0.9, z);
  P.push(fill(rail, 0x8a5a30));
  // Stützstreben unter der Galerie
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.2;
    const st = new THREE.CylinderGeometry(0.07, 0.07, 2.2, 4);
    st.rotateZ(0.7); st.rotateY(-a);
    st.translate(x + Math.cos(a) * (gr - 0.9), gy - 0.9, z + Math.sin(a) * (gr - 0.9));
    P.push(fill(st, 0x5a3a20));
  }
  addStatic(level, merge(P));
  addStatic(level, merge(G), { material: 'glow', castShadow: false });
  const rm = r0 + (r1 - r0) * ((gy - y) / H);
  level.world.add({ type: 'cyl', x, z, r: (r0 + rm) / 2 + 0.05, y0: y, y1: gy - 0.3, tag: 'muehle' });
  level.world.add({ type: 'cyl', x, z, r: (rm + r1) / 2 + 0.05, y0: gy - 0.3, y1: y + H + r1, tag: 'muehle' });
  level.world.add({ type: 'cyl', x, z, r: gr, y0: gy - 0.3, y1: gy, tag: 'muehle:galerie' });
  level.named.set('muehle', { y: gy, r: gr, x, z });
  if (!level.view) return;
  // Flügel: ein Mesh, dreht sich um die Achse zur Kamera
  const sails = [];
  const hubY = y + H - 0.3, hubZ = z + r1 + 0.75;
  for (let k = 0; k < 4; k++) {
    const parts = [];
    parts.push(box(0.22, 5.6, 0.16, 0, 3.0, 0, 0x5a3a20, { r: 0.04, seg: 1 }));
    for (let i = 0; i < 9; i++) parts.push(box(1.5, 0.08, 0.06, 0.7, 1.0 + i * 0.55, 0.05, 0x8a5a30, { r: 0.01, seg: 1 }));
    parts.push(box(0.06, 4.6, 0.06, 1.42, 3.2, 0.05, 0x8a5a30, { r: 0.01, seg: 1 }));
    const cloth = new THREE.PlaneGeometry(1.3, 4.4); cloth.translate(0.72, 3.25, 0.02);
    parts.push(fill(cloth, k % 2 ? 0xfff0dc : 0xffd8c0));
    const g = merge(parts); g.rotateZ((k / 4) * TAU);
    sails.push(g);
  }
  const hub = new THREE.CylinderGeometry(0.35, 0.45, 0.6, 10); hub.rotateX(Math.PI / 2);
  sails.push(fill(hub, 0x4a2a1a));
  const mesh = new THREE.Mesh(merge(sails), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide }));
  mesh.position.set(x, hubY, hubZ);
  mesh.castShadow = true;
  mesh.name = 'muehle:fluegel';
  const holder = {};
  addObject(level, mesh, (dt) => { mesh.rotation.z -= visDt(level, holder, dt) * (o.speed ?? 0.6); });
}

/**
 * Hoftor: zwei Pfosten mit Querbalken, Kürbislaternen obenauf und einem Schild darunter (Schild über den Baustein sign).
 * o: { pos (Mitte am Boden), w (lichte Weite, 5), h (Balkenhöhe, 3.4) }. Kollision: Pfosten.
 */
export function hoftor(level, o) {
  const [x, y, z] = o.pos;
  const w = o.w ?? 5, h = o.h ?? 3.4;
  const P = [], G = [];
  for (const s of [-1, 1]) {
    const post = new THREE.CylinderGeometry(0.2, 0.24, h + 0.4, 8);
    post.translate(x + s * w / 2, y + (h + 0.4) / 2, z);
    P.push(shadeY(post, HWC.woodLow, HWC.wood));
    const pk = pumpkinGeo({ r: 0.36, color: 'orange', leaf: true });
    P.push(at(pk.body, x + s * w / 2, y + h + 0.38, z));
    G.push(at(faceGeo({ r: 0.36, kind: s < 0 ? 'lachen' : 'grinsen' }), x + s * w / 2, y + h + 0.38, z, -Math.PI / 2));
    level.world.add({ type: 'cyl', x: x + s * w / 2, z, r: 0.26, y0: y, y1: y + h + 0.4, tag: 'hoftor' });
    level.view?.addLantern?.(x + s * w / 2, y + h + 0.7, z);
  }
  P.push(box(w + 0.9, 0.32, 0.32, x, y + h, z, HWC.wood, { r: 0.08, seg: 1 }));
  addStatic(level, merge(P));
  addStatic(level, merge(G), { material: 'glow', castShadow: false });
}

/**
 * Ackerfurchen: parallele Erdwälle (rotbraun, mit kleinen Blättchen) auf dem Boden – Kürbisbeet-Optik, ohne Kollision.
 * list = [{ x0, x1, z0, z1, y, dir: 'z' (Furchen entlang z) | 'x', gap: 1.2 }].
 */
export function ackerFurchen(level, list) {
  // lange Beete in Stücke an den 16-m-Grenzen (z) teilen: so bleiben die 32-m-Abschnitte des Motors eng (Sichtprüfung)
  const parts = [];
  for (const f of list) {
    const za = Math.max(f.z0, f.z1), zb = Math.min(f.z0, f.z1);
    let z = za;
    while (z > zb + 0.01) {
      let zn = Math.floor(z / 16) * 16;
      if (zn >= z - 1e-6) zn -= 16;
      zn = Math.max(zb, zn);
      parts.push({ ...f, z0: z, z1: zn });
      z = zn;
    }
  }
  list = parts;
  const P = [];
  const soil = L(0x5a3220), soilHi = L(0x8a5634), leaf = L(0x5aa03a), bed = L(0x4a2a1a);
  for (const f of list) {
    const gap = f.gap ?? 1.2;
    const alongZ = (f.dir ?? 'z') === 'z';
    const a0 = alongZ ? Math.min(f.x0, f.x1) : Math.min(f.z0, f.z1), a1 = alongZ ? Math.max(f.x0, f.x1) : Math.max(f.z0, f.z1);
    const b0 = alongZ ? Math.min(f.z0, f.z1) : Math.min(f.x0, f.x1), b1 = alongZ ? Math.max(f.z0, f.z1) : Math.max(f.x0, f.x1);
    const len = b1 - b0;
    // dunkles Beet unter den Wällen (flach, knapp über dem Gras)
    const bg = new THREE.PlaneGeometry(a1 - a0, len); bg.rotateX(-Math.PI / 2);
    if (alongZ) bg.translate((a0 + a1) / 2, f.y + 0.012, (b0 + b1) / 2); else { bg.rotateY(Math.PI / 2); bg.translate((b0 + b1) / 2, f.y + 0.012, (a0 + a1) / 2); }
    P.push(colorize(ni(bg), (p, n, o) => { const k = 0.85 + 0.15 * Math.sin(p.x * 1.7 + p.z * 2.3); o[0] = bed[0] * k; o[1] = bed[1] * k; o[2] = bed[2] * k; }));
    for (let a = a0 + gap / 2; a < a1; a += gap) {
      // Halbzylinder (obere Hälfte) entlang z, Länge len; für dir 'x' um 90° gedreht
      const g = new THREE.CylinderGeometry(0.26, 0.26, len - 0.3, 5, 1, true, -Math.PI / 2, Math.PI);
      g.rotateX(-Math.PI / 2);
      g.scale(1, 0.55, 1);
      if (!alongZ) g.rotateY(Math.PI / 2);
      if (alongZ) g.translate(a, f.y + 0.01, (b0 + b1) / 2); else g.translate((b0 + b1) / 2, f.y + 0.01, a);
      P.push(colorize(ni(g), (p, n, o) => mixc(soil, soilHi, smooth(0.2, 1, n.y) * 0.6, o)));
      // Blättchen (kleine grüne Rauten) entlang des Walls
      for (let b = b0 + 0.6; b < b1 - 0.3; b += 1.7) {
        const lf = new THREE.CircleGeometry(0.16, 4); lf.scale(1.5, 1, 1); lf.rotateX(-Math.PI / 2 + 0.3); lf.rotateY((a * 7 + b * 3) % TAU);
        if (alongZ) lf.translate(a + Math.sin(b * 3) * 0.12, f.y + 0.17, b); else lf.translate(b, f.y + 0.17, a + Math.sin(b * 3) * 0.12);
        P.push(colorize(ni(lf), (p, n, o) => { o[0] = leaf[0]; o[1] = leaf[1]; o[2] = leaf[2]; }));
      }
    }
  }
  if (P.length) addStatic(level, merge(P), { castShadow: false });
}

/** Deterministischer Zufall (0..1) aus einer Zahl. */
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** Punkte gestreut in size [w, d] um pos (Abstand gap, meidet avoid [[x, z, r], …]); deterministisch über seed. */
function streu(pos, size, n, gap, avoid, seed) {
  const [w, d] = Array.isArray(size) ? size : [size, size];
  const out = [];
  for (let t = 0; t < n * 40 && out.length < n; t++) {
    const x = pos[0] + (hash(seed * 31 + t * 2) - 0.5) * w, z = pos[2] + (hash(seed * 31 + t * 2 + 1) - 0.5) * d;
    if (out.some((q) => Math.hypot(q[0] - x, q[1] - z) < gap)) continue;
    if ((avoid ?? []).some((a) => Math.hypot(a[0] - x, a[1] - z) < (a[2] ?? 2))) continue;
    out.push([x, z]);
  }
  return out;
}

/**
 * Sparsame Kulissen-Kürbisse (eigene Geometrie, ≈ 200–300 Dreiecke statt ≈ 2,5–5,7 k des Registry-Modells; für viele
 * Stücke). list = [{ pos, size: 0.9 (Ø), shape, color, face: false | 'lachen' | 'grinsen' | 'staunen', yaw (Gesicht;
 * Standard zur Kamera), mount: 'pfahl' (Laterne auf Pfahl), light: Punktlicht im Thema }]. o: { shadow: true }.
 */
export function kuerbisDeko(level, list, o = {}) {
  if (!level.view || !list.length) return;
  const P = [], G = [];
  list.forEach((k, i) => {
    const s = k.size ?? 0.9, r = s / 2;
    const yaw = k.yaw ?? (-Math.PI / 2 + (hash(i * 7 + 3) - 0.5) * 0.7);
    let y = k.pos[1];
    if (k.mount === 'pfahl') {
      const post = new THREE.CylinderGeometry(0.06, 0.09, 1.5, 5); post.translate(k.pos[0], y + 0.75, k.pos[2]);
      P.push(shadeY(post, HWC.woodLow, HWC.wood));
      y += 1.5;
    }
    const pk = pumpkinGeo({ r, shape: k.shape ?? 'rund', color: k.color ?? 'orange', seg: s > 1.4 ? 16 : 12, leaf: k.leaf ?? s > 0.6, leafYaw: hash(i) * TAU });
    P.push(at(pk.body, k.pos[0], y, k.pos[2], yaw + Math.PI / 2));
    if (k.face) G.push(at(faceGeo({ r, shape: k.shape ?? 'rund', kind: k.face }), k.pos[0], y, k.pos[2], yaw));
    if (k.light) level.view.addLantern?.(k.pos[0], y + r, k.pos[2]);
  });
  addStatic(level, merge(P), { castShadow: o.shadow !== false });
  if (G.length) addStatic(level, merge(G), { material: 'glow', castShadow: false });
}

/** Gestreute sparsame Kürbisse: { pos, size: [w, d], n, sizes: [0.5, 1.1], faces: 0.3, colors, seed, avoid, gap }. */
export function kuerbisStreu(level, f, o = {}) {
  const pts = streu(f.pos, f.size, f.n ?? 8, f.gap ?? 1.2, f.avoid, f.seed ?? 1);
  const [s0, s1] = f.sizes ?? [0.5, 1.1];
  const cols = f.colors ?? ['orange', 'orange', 'orange', 'gelb', 'weiss', 'orange'];
  const shapes = ['rund', 'flach', 'dick', 'rund', 'hoch'];
  const faces = ['lachen', 'grinsen', 'staunen'];
  kuerbisDeko(level, pts.map(([x, z], i) => {
    const h = hash((f.seed ?? 1) * 13 + i);
    return { pos: [x, f.pos[1], z], size: s0 + (s1 - s0) * hash(i * 3 + (f.seed ?? 1)), shape: shapes[Math.floor(h * 5)], color: cols[Math.floor(hash(i * 5 + 2) * cols.length)], face: hash(i * 11 + 5) < (f.faces ?? 0.3) ? faces[Math.floor(h * 3)] : false };
  }), o);
}

/** Ein Mais-Büschel (count Stängel) in Weltkoordinaten; liefert Geometrie-Teile. */
function maisBueschel(x, y, z, i, count, h0, h1, P, leaves = 4) {
  const stalkC = [L(0x7a8a2e), L(0xc8b860)], leafA = L(0x6e9a2c), leafB = L(0xd0bc5a), cobC = L(0xffd24a), husk = L(0xb8b060), tas = L(0xc89a4a);
  for (let k = 0; k < count; k++) {
    const a = hash(i * 9 + k) * TAU, rr = k ? 0.22 + 0.06 * k : 0;
    const sx = x + Math.cos(a) * rr, sz = z + Math.sin(a) * rr;
    const H = h0 + (h1 - h0) * hash(i * 17 + k * 3 + 1);
    const lean = (hash(i * 5 + k) - 0.5) * 0.12;
    const st = new THREE.CylinderGeometry(0.028, 0.045, H, 4, 1); st.rotateZ(lean); st.translate(sx - lean * H / 2, y + H / 2, sz);
    P.push(colorize(ni(st), (p, n, out) => mixc(stalkC[0], stalkC[1], smooth(y, y + H, p.y), out)));
    // Blätter: breite, gebogene, hängende Streifen, beidseitig
    for (let j = 0; j < leaves; j++) {
      const ly = y + H * (0.2 + j * (0.62 / leaves)), ya = a + j * 2.4 + k * 1.3;
      const len = 1.0 - j * 0.08;
      const lf = new THREE.PlaneGeometry(0.2, len, 1, 2);
      const lp = lf.attributes.position;
      for (let v = 0; v < lp.count; v++) {
        const t = (lp.getY(v) + len / 2) / len;
        lp.setX(v, lp.getX(v) * (1 - t * 0.75));
        lp.setY(v, t * 0.5 - t * t * 0.62);
        lp.setZ(v, t * len * 0.85);
      }
      lf.computeVertexNormals();
      lf.rotateY(ya); lf.translate(sx - lean * (ly - y), ly, sz);
      const tint = hash(i * 3 + j + k * 7);
      const col = (p, n, out) => mixc(leafA, leafB, 0.15 + 0.55 * tint + 0.2 * smooth(ly, ly - 0.3, p.y), out);
      P.push(colorize(ni(lf.clone()), col));
      const back = ni(lf); const pa = back.attributes.position;
      for (let t = 0; t < pa.count; t += 3) { const x1 = pa.getX(t + 1), y1 = pa.getY(t + 1), z1 = pa.getZ(t + 1); pa.setXYZ(t + 1, pa.getX(t + 2), pa.getY(t + 2), pa.getZ(t + 2)); pa.setXYZ(t + 2, x1, y1, z1); }
      back.computeVertexNormals();
      P.push(colorize(back, col));
    }
    if (k % 2 === 0) {
      const cob = new THREE.CylinderGeometry(0.055, 0.04, 0.3, 5); cob.rotateZ(0.4); cob.rotateY(a);
      cob.translate(sx + Math.cos(a) * 0.07, y + H * 0.52, sz - Math.sin(a) * 0.07);
      P.push(colorize(ni(cob), (p, n, out) => mixc(husk, cobC, smooth(-0.2, 0.8, n.y + 0.3), out)));
    }
    const t1 = new THREE.ConeGeometry(0.1, 0.36, 4); t1.translate(sx - lean * H, y + H + 0.14, sz);
    P.push(fill(t1, tas));
  }
}

/**
 * Sparsames Maisfeld (eigene Geometrie, ≈ 330 Dreiecke je Büschel aus vier Stängeln statt ≈ 1,2 k je Registry-Staude):
 * hängende Blätter, Kolben, Rispen, ohne Kollision. Gestreut: f { pos, size: [w, d], n, height: [2.0, 2.6], seed, avoid,
 * gap } bzw. in Reihen: f { x0, x1, z0, z1, y, row: 1.5 (Reihenabstand in x), step: 1.3 (in z), avoid, seed }.
 */
export function maisStreu(level, f, o = {}) {
  if (!level.view) return;
  const [h0, h1] = f.height ?? [2.0, 2.6];
  const P = [];
  let pts;
  if (f.x0 !== undefined) {
    pts = [];
    const row = f.row ?? 1.5, step = f.step ?? 1.3;
    let i = 0;
    for (let x = Math.min(f.x0, f.x1) + row / 2; x < Math.max(f.x0, f.x1); x += row) {
      for (let z = Math.min(f.z0, f.z1) + step / 2; z < Math.max(f.z0, f.z1); z += step) {
        i++;
        const jx = x + (hash(i * 3 + (f.seed ?? 1)) - 0.5) * row * 0.35, jz = z + (hash(i * 7 + (f.seed ?? 1)) - 0.5) * step * 0.4;
        if ((f.avoid ?? []).some((q) => Math.hypot(q[0] - jx, q[1] - jz) < (q[2] ?? 2))) continue;
        if (hash(i * 13 + (f.seed ?? 1)) < (f.holes ?? 0.08)) continue;
        pts.push([jx, jz]);
      }
    }
  } else pts = streu(f.pos, f.size, f.n ?? 10, f.gap ?? 1.0, f.avoid, f.seed ?? 1);
  const y = f.y ?? f.pos[1];
  // in Stücke je 16 m (z, an den 32-m-Abschnitten des Motors ausgerichtet) teilen; Schatten nur für Stücke nahe am Weg
  // (o.shadowX: [x0, x1])
  const chunks = new Map();
  pts.forEach(([x, z], i) => {
    const key = `${Math.floor(z / 16)}:${o.shadowX && (x < o.shadowX[0] || x > o.shadowX[1]) ? 0 : 1}`;
    if (!chunks.has(key)) chunks.set(key, []);
    maisBueschel(x, y, z, i + (f.seed ?? 1) * 101, f.count ?? 2, h0, h1, chunks.get(key), f.leaves ?? 4);
  });
  for (const [key, parts] of chunks) addStatic(level, merge(parts), { castShadow: o.shadow !== false && key.endsWith(':1') });
}

/**
 * Kürbis-Trittsteine: große Kulissen-Kürbisse (Baustein deco_hw, ohne eigene Kollision) bekommen eine Zylinder-Kollision,
 * deren Oberseite zur Schulter des Registry-Kürbisses passt (rund ≈ 0,74·size, dick ≈ 0,8·size, flach ≈ 0,5·size).
 * list = [{ pos: [x, y, z] (Fußpunkt), size, shape }]. Liefert die deco_hw-Einträge (solid: false) für segments.
 */
const PK_TOP = { rund: 0.74, dick: 0.8, flach: 0.5, hoch: 0.95 };
export function kuerbisSteineDeco(list) {
  return list.map((k) => ({ kind: 'kuerbis', pos: k.pos, size: k.size, shape: k.shape ?? 'rund', color: k.color ?? 'orange', face: k.face ?? false, yaw: k.yaw, solid: false }));
}
export function kuerbisSteine(level, list) {
  for (const k of list) {
    const s = k.size, top = k.pos[1] + s * (PK_TOP[k.shape ?? 'rund'] ?? 0.74);
    level.world.add({ type: 'cyl', x: k.pos[0], z: k.pos[2], r: s * 0.42, y0: k.pos[1] - 2, y1: top, tag: 'kuerbis:stein' });
  }
}
export const kuerbisTop = (k) => k.pos[1] + k.size * (PK_TOP[k.shape ?? 'rund'] ?? 0.74);

/**
 * Krähen auf Zaunpfählen bzw. der Scheune: kleine schwarze Vögel, die auffliegen, wenn die Figur näher als 4 m kommt, und
 * nach ein paar Sekunden zurückkehren. list = [[x, y, z, yaw?], …]. Ein InstancedMesh (Körper) ohne Schatten.
 */
export function kraehen(level, list) {
  if (!level.view || !list.length) return;
  const body = new THREE.SphereGeometry(0.16, 8, 6); body.scale(1.5, 1, 1);
  const head = new THREE.SphereGeometry(0.1, 8, 6); head.translate(0.2, 0.1, 0);
  const beak = new THREE.ConeGeometry(0.04, 0.12, 5); beak.rotateZ(-Math.PI / 2); beak.translate(0.33, 0.09, 0);
  const tail = new THREE.BoxGeometry(0.18, 0.03, 0.12); tail.translate(-0.26, 0.03, 0);
  const wings = new THREE.BoxGeometry(0.2, 0.03, 0.5); wings.translate(-0.02, 0.08, 0);
  const g = merge([fill(body, 0x2a2232), fill(head, 0x2a2232), fill(beak, 0xffb030), fill(tail, 0x1e1828), fill(wings, 0x342a40)]);
  const eye = new THREE.SphereGeometry(0.025, 6, 4);
  const g2 = merge([fill(eye.clone().translate(0.27, 0.14, 0.06), 0xffffff), fill(eye.clone().translate(0.27, 0.14, -0.06), 0xffffff)]);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
  const im = new THREE.InstancedMesh(merge([g, g2]), mat, list.length);
  im.name = 'kraehen';
  im.frustumCulled = false;
  const st = list.map(([x, y, z, yaw]) => ({ x, y, z, yaw: yaw ?? (-Math.PI / 2 + 0.4), k: 0, t: Math.random() * 3, out: 0 }));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  const holder = {};
  addObject(level, im, (dt) => {
    const d = visDt(level, holder, dt);
    st.forEach((c, i) => {
      c.t += d;
      const { d: dist } = nearest(level, c.x, c.z);
      if (dist < 4 && c.out <= 0) c.out = 4;
      if (c.out > 0) c.out -= d;
      c.k = Math.max(0, Math.min(1, c.k + (c.out > 0 ? d * 1.5 : -d * 0.8)));
      const k = c.k;
      const hop = k > 0 ? 0 : Math.max(0, Math.sin(c.t * 2.3)) > 0.97 ? 0.05 : 0;
      p.set(c.x - Math.sin(c.t) * 0 + k * 3 * Math.cos(c.yaw + 1), c.y + hop + k * (4 + Math.sin(c.t * 9) * 0.2), c.z + k * 3 * -Math.sin(c.yaw + 1));
      e.set(Math.sin(c.t * 18) * 0.25 * k, c.yaw + k * 1.2 + (k ? 0 : Math.sin(c.t * 0.7) * 0.4), 0);
      q.setFromEuler(e);
      m.compose(p, q, s);
      im.setMatrixAt(i, m);
    });
    im.instanceMatrix.needsUpdate = true;
  });
}

// =====================================================================================================================
// Kürbisfeld (H-1): Winke-Kürbis
// =====================================================================================================================

/** Blatt-Hand mit Ranken-Arm (lokal: Wurzel im Ursprung, Arm zeigt nach +Y). */
function leafArmGeo(len) {
  const parts = [];
  const vine = new THREE.CylinderGeometry(0.08, 0.12, len, 7, 4);
  const vp = vine.attributes.position;
  for (let i = 0; i < vp.count; i++) { const t = (vp.getY(i) + len / 2) / len; vp.setX(i, vp.getX(i) + Math.sin(t * Math.PI) * 0.12); }
  vine.computeVertexNormals();
  vine.translate(0, len / 2, 0);
  parts.push(colorize(ni(vine), (p, n, o) => mixc(L(HWC.leafLow), L(HWC.stemHi), smooth(-0.5, 0.9, n.x + n.z), o)));
  // Blatt-Hand: fünf runde Lappen (Finger) um eine Handfläche
  const palm = new THREE.SphereGeometry(0.26, 10, 6); palm.scale(1, 1, 0.38); palm.translate(0, len + 0.14, 0);
  parts.push(colorize(ni(palm), (p, n, o) => mixc(L(HWC.leafLow), L(HWC.leaf), smooth(-0.3, 0.9, n.z), o)));
  for (let i = 0; i < 5; i++) {
    const a = -1.0 + i * 0.5;
    const f = new THREE.SphereGeometry(0.13, 8, 5); f.scale(0.85, 1.55, 0.38);
    f.rotateZ(-a);
    f.translate(Math.sin(a) * 0.3, len + 0.16 + Math.cos(a) * 0.3, 0);
    parts.push(colorize(ni(f), (p, n, o) => mixc(L(HWC.leafLow), L(HWC.leaf), smooth(-0.3, 0.9, n.z) * 0.8 + 0.2, o)));
  }
  return merge(parts);
}

/**
 * Winke-Kürbis: großer Kürbis mit Lachgesicht und zwei Ranken-Armen mit Blatt-Händen. Kommt die Figur näher als 10 m,
 * winkt er eifrig zurück (und hüpft ein wenig). Eine Stampfattacke auf ihn → er kichert, plumpst zusammen und gibt content
 * (Aktion, z. B. { star: 0 }); Draufspringen allein nicht. Fest (Zylinder), oben begehbar.
 * it: { id, pos (Fußpunkt), size: 2.4, yaw (−π/2: Gesicht zur Kamera), content, color }.
 */
class WinkeKuerbis extends CourseEntity {
  constructor(level, it) {
    super(level, { pos: it.pos, id: it.id }, 'winke_kuerbis');
    this.it = it;
    const s = this.s = it.size ?? 2.4;
    this.top = this.pos.y + s * 0.74;
    this.half.set(s * 0.45, s * 0.37, s * 0.45);
    this.yaw = it.yaw ?? -Math.PI / 2;
    this.touch = false;
    this.shadow = 0;
    this.pounded = 0;
    this.given = false;
    this.wave = 0;
    this.t = 0;
    this.hopT = 0;
    this.addShape({ type: 'cyl', x: this.pos.x, z: this.pos.z, r: s * 0.44, y0: this.pos.y, y1: this.top, tag: 'winke_kuerbis' });
    if (level.view) this.build();
  }

  build() {
    const s = this.s;
    const root = new THREE.Group();
    const bodyG = new THREE.Group();
    root.add(bodyG);
    if (hasModel('kuerbis')) {
      const m = getModel('kuerbis', { size: s, shape: 'rund', color: this.it.color ?? 'orange', face: 'lachen', seed: 2 });
      m.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      bodyG.add(m.root);
      this.inner = m;
    } else {
      const pk = pumpkinGeo({ r: s / 2, color: this.it.color ?? 'orange' });
      const mb = new THREE.Mesh(pk.body, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }));
      mb.castShadow = true;
      bodyG.add(mb, new THREE.Mesh(faceGeo({ r: s / 2, kind: 'lachen' }), new THREE.MeshBasicMaterial({ vertexColors: true })));
    }
    // Arme an beiden Seiten (lokal ±Z = links/rechts des Gesichts, das nach +X schaut)
    const armMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 });
    const geo = leafArmGeo(s * 0.2);
    this.arms = [];
    for (const sd of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.06, s * 0.4, sd * s * 0.44);
      const arm = new THREE.Mesh(geo, armMat);
      arm.castShadow = true;
      pivot.add(arm);
      bodyG.add(pivot);
      this.arms.push({ pivot, sd });
    }
    // Lachblase
    this.bubble = bubbleSprite('Hihi!', 'Das kitzelt!');
    this.bubble.position.set(0, s * 0.95 + 1.0, 0);
    this.bubble.visible = false;
    root.add(this.bubble);
    this.hello = bubbleSprite('Huhu!', 'Stampf mal auf mich!');
    this.hello.position.set(0, s * 0.95 + 1.0, 0);
    this.hello.visible = false;
    root.add(this.hello);
    this.bodyG = bodyG;
    this.setModel({ root, update: () => {}, dispose() {} });
  }

  onPound() {
    this.pounded++;
    if (this.given) return;
    this.given = true;
    this.hopT = 0.01;
    hwSfx(this.level, 'buh', 'stomp');
    this.level.effects?.ring?.({ x: this.pos.x, y: this.top, z: this.pos.z }, this.s * 0.6);
    if (this.it.content) runAction(this.level, this.it.content, { pos: [this.pos.x, this.top + 1.4, this.pos.z], source: this });
  }

  update(dt) {
    this.t += dt;
    const { d } = nearest(this.level, this.pos.x, this.pos.z);
    this.near = d < 10;
    if (this.hopT > 0) this.hopT += dt;
  }

  render(dt, t) {
    this.syncModel();
    if (!this.bodyG) return;
    const h = visDt(this.level, this._vh ??= {}, dt);
    this.wave += ((this.near ? 1 : 0.25) - this.wave) * Math.min(1, h * 3);
    for (const a of this.arms) {
      // rechter Arm (vom Betrachter aus) winkt kräftig, linker schwingt leicht mit
      const strong = a.sd > 0;
      const base = a.sd * (strong ? 2.1 : 0.8);
      const w = strong ? Math.sin(t * 9) * 0.55 * this.wave : Math.sin(t * 3) * 0.15;
      a.pivot.rotation.set(a.sd * (strong ? 0.2 : 0), 0, 0);
      a.pivot.rotation.x = base * 0.5 + w * a.sd;
    }
    const k = this.hopT > 0 && this.hopT < 0.6 ? Math.sin((this.hopT / 0.6) * Math.PI) : 0;
    const bob = this.near ? Math.abs(Math.sin(t * 4.5)) * 0.06 : 0;
    this.bodyG.scale.set(1 + k * 0.18, 1 - k * 0.22, 1 + k * 0.18);
    this.bodyG.position.y = bob * this.s * 0.4;
    this.bodyG.rotation.y = this.near ? Math.sin(t * 2.2) * 0.08 : 0;
    this.inner?.update?.(h, { flicker: 1 });
    this.bubble.visible = this.given && this.hopT < 4;
    this.hello.visible = !this.given && this.near && (t % 6) < 3.2;
  }

  info() { return { pounded: this.pounded, given: this.given, near: !!this.near }; }
}

/** Winke-Kürbisse anlegen (im Haken LEVEL.build). list = [{ id, pos, size, content }]. */
export function winkeKuerbisse(level, list) {
  return list.map((it) => {
    const e = new WinkeKuerbis(level, it);
    level.entities.push(e);
    if (it.id) level.named.set(it.id, e);
    return e;
  });
}

// =====================================================================================================================
// Kürbisfeld (H-1): Krümel mit Laterne, Laternenpfad
// =====================================================================================================================

/**
 * Krümel hat sich mit seiner Laterne im Maisfeld verlaufen: er sitzt auf einem Strohballen auf einer kleinen Lichtung,
 * hält die Laterne hoch (warmer Schein, Punktlicht im Thema) und ruft „Huhu? Hier bin ich!“, sobald die Figur näher als
 * 12 m ist. Erreicht sie ihn (≤ reach m), jubelt er, und content (z. B. { star: 1 }) erscheint über ihm.
 * o: { id: 'kruemel', pos (Fußpunkt), yaw, reach: 2.2, content }. level.named.get(id) = { state, found, t }.
 */
export function kruemelLaterne(level, o) {
  const st = { state: 'lost', found: false, t: 0 };
  level.named.set(o.id ?? 'kruemel', st);
  const [x, y, z] = o.pos;
  const reach = o.reach ?? 2.2;
  level.onStep((dt) => {
    st.t += dt;
    if (st.found) return;
    const { d, f } = nearest(level, x, z);
    if (d < reach && f && Math.abs(f.pos.y - y) < 2.5) {
      st.found = true; st.state = 'happy'; st.t = 0;
      if (o.content) runAction(level, o.content, { pos: [x, y + 1.6, z], source: st });
      level.sfx('powerup_appear');
    } else st.state = d < 12 ? 'call' : 'lost';
  });
  level.view?.addLantern?.(x + 0.3, y + 1.2, z + 0.2);
  if (!level.view) return st;
  const grp = new THREE.Group();
  const bale = box(1.2, 0.6, 0.7, x, y + 0.3, z, HWC.straw, { r: 0.12, seg: 1 });
  addStatic(level, colorize(bale, (p, n, out) => mixc(L(HWC.strawLow), L(HWC.straw), 0.45 + 0.4 * Math.abs(Math.sin(p.x * 23 + p.y * 9)), out)));
  level.world.add({ type: 'box', min: [x - 0.6, y, z - 0.35], max: [x + 0.6, y + 0.6, z + 0.35], tag: 'kruemel:ballen' });
  const m = hasModel('kruemel') ? getModel('kruemel') : null;
  if (m) { m.root.scale.setScalar(1.3); m.root.position.set(x, y + 0.6, z); m.root.rotation.y = o.yaw ?? -Math.PI / 2; grp.add(m.root); }
  // Laterne in der Pfote (Registry-Modell laterne_hand bzw. eigene Glaslaterne)
  const lantern = new THREE.Group();
  let lm = null;
  if (hasModel('laterne_hand')) { lm = getModel('laterne_hand'); lm.root.scale.setScalar(0.9); lantern.add(lm.root); }
  else { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.22, 8), new THREE.MeshBasicMaterial({ color: 0xffd060 })); b.position.y = -0.14; lantern.add(b); }
  lantern.position.set(x + 0.42, y + 1.45, z + 0.12);
  grp.add(lantern);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffb050, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(2.6, 2.6, 1);
  halo.position.set(x + 0.42, y + 1.25, z + 0.12);
  grp.add(halo);
  const help = bubbleSprite('Huhu?', 'Ich hab mich verlaufen!');
  const thanks = bubbleSprite('Juhu!', 'Der Stern ist für dich!');
  for (const b of [help, thanks]) { b.position.set(x, y + 2.7, z); b.visible = false; grp.add(b); }
  level.view.shadows?.add?.({ pos: new THREE.Vector3(x, y + 0.6, z), radius: 0.3, alive: () => true, visible: () => true });
  const holder = {};
  addObject(level, grp, (dt) => {
    const d = visDt(level, holder, dt);
    const happy = st.state === 'happy';
    m?.update?.(d, { anim: happy ? (st.t < 3 ? 'cheer' : 'hop') : st.state === 'call' ? 'idle' : 'scared' });
    lm?.update?.(d, { swing: Math.sin(level.time * 2.4) * 0.25, lit: true });
    lantern.position.y = y + 1.45 + (st.state === 'call' ? Math.abs(Math.sin(level.time * 5)) * 0.25 : 0) + (happy ? Math.abs(Math.sin(level.time * 7)) * 0.2 : 0);
    halo.position.y = lantern.position.y - 0.2;
    halo.material.opacity = 0.6 + 0.1 * Math.sin(level.time * 7.3) + 0.06 * Math.sin(level.time * 13.1);
    help.visible = st.state === 'call';
    thanks.visible = happy && st.t < 6;
    const bob = Math.sin(level.time * 3) * 0.05;
    help.position.y = y + 2.7 + bob; thanks.position.y = y + 2.7 + bob;
  });
  return st;
}

/**
 * Laternenpfad: Laternen auf krummen Holzpfählen gehen nacheinander an, sobald eine Figur näher als r m kommt, und bleiben
 * an (warmer Pfad durchs Feld; Klang 'laterne'). Sparsam gezeichnet: Pfähle und Laternengehäuse statisch, alle Gläser eine
 * Instanz-Gruppe (dunkel → leuchtend), alle Scheine ein Punkt-Mesh; jede brennende Laterne wird Lichtquelle des Themas
 * (lanternLight). list = [{ id, pos (Fußpunkt), yaw (Arm-Richtung, 0 = +X), height: 2.2 }]; o: { allOn (brennen von Anfang
 * an, Dorf), id ('laternenpfad') }. level.named 'laternenpfad' =
 * { lit (Anzahl), on: [bool …], info() }.
 */
export function laternenPfad(level, list, r = 7, o = {}) {
  const st = { lit: 0, on: list.map(() => !!o.allOn), info: () => ({ lit: st.lit, of: list.length }) };
  level.named.set(o.id ?? 'laternenpfad', st);
  const lamps = list.map((l) => {
    const H = l.height ?? 2.2, yaw = l.yaw ?? 0;
    return { x: l.pos[0] + Math.cos(yaw) * 0.5, y: l.pos[1] + H - 0.12, z: l.pos[2] - Math.sin(yaw) * 0.5, fx: l.pos[0], fz: l.pos[2] };
  });
  for (const l of list) level.world.add({ type: 'cyl', x: l.pos[0], z: l.pos[2], r: 0.12, y0: l.pos[1], y1: l.pos[1] + (l.height ?? 2.2), camIgnore: true, tag: 'laterne' });
  let im = null, pts = null, colAttr = null;
  const OFF = new THREE.Color(0.22, 0.14, 0.08), ON = new THREE.Color(1, 1, 1);
  if (level.view) {
    const P = [];
    list.forEach((l, i) => {
      const H = l.height ?? 2.2, yaw = l.yaw ?? 0;
      const post = new THREE.CylinderGeometry(0.07, 0.11, H, 6, 3);
      const pp = post.attributes.position;
      for (let k = 0; k < pp.count; k++) { const y = pp.getY(k) + H / 2; pp.setX(k, pp.getX(k) + Math.sin(y * 1.8 + i) * 0.035); }
      post.computeVertexNormals();
      post.translate(0, H / 2, 0);
      const arm = new THREE.BoxGeometry(0.6, 0.08, 0.08); arm.translate(0.26, H - 0.06, 0);
      const brace = new THREE.BoxGeometry(0.34, 0.06, 0.06); brace.rotateZ(0.8); brace.translate(0.1, H - 0.22, 0);
      const { body } = lanternPartsCheap();
      body.translate(0.5, H - 0.12, 0);
      const g = merge([shadeY(post, HWC.woodLow, HWC.wood), shadeY(arm, HWC.woodLow, HWC.wood), shadeY(brace, HWC.woodLow, HWC.wood), body]);
      g.rotateY(yaw); g.translate(l.pos[0], l.pos[1], l.pos[2]);
      P.push(g);
    });
    addStatic(level, merge(P));
    const glass = lanternPartsCheap().glass;
    im = new THREE.InstancedMesh(glass, new THREE.MeshBasicMaterial({ vertexColors: true }), list.length);
    im.name = 'laternenpfad:glas';
    const m = new THREE.Matrix4();
    lamps.forEach((q, i) => {
      m.makeTranslation(q.x, q.y, q.z); im.setMatrixAt(i, m); im.setColorAt(i, st.on[i] ? ON : OFF);
      if (st.on[i]) level.view.lanternSpots?.push(new THREE.Vector3(q.x, q.y - 0.27, q.z));
    });
    im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.Float32BufferAttribute(lamps.flatMap((q) => [q.x, q.y - 0.27, q.z]), 3));
    colAttr = new THREE.Float32BufferAttribute(new Float32Array(lamps.length * 3), 3);
    pg.setAttribute('color', colAttr);
    pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 2.4, map: glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.name = 'laternenpfad:schein';
    const grp = new THREE.Group();
    grp.add(im, pts);
    const holder = {};
    addObject(level, grp, (dt) => {
      visDt(level, holder, dt);
      const t = level.time;
      lamps.forEach((q, i) => {
        const k = st.on[i] ? 0.78 + 0.1 * Math.sin(t * 7 + i * 1.7) + 0.05 * Math.sin(t * 13.3 + i) : 0;
        colAttr.setXYZ(i, k, k * 0.62, k * 0.25);
      });
      colAttr.needsUpdate = true;
    });
  }
  level.onStep(() => {
    let n = 0;
    lamps.forEach((q, i) => {
      if (!st.on[i]) {
        const { d } = nearest(level, q.fx, q.fz);
        if (d < r) {
          st.on[i] = true;
          hwSfx(level, 'laterne', 'light');
          if (level.view) {
            level.view.lanternSpots?.push(new THREE.Vector3(q.x, q.y - 0.27, q.z));
            im.setColorAt(i, ON); im.instanceColor.needsUpdate = true;
            level.effects?.sparks?.({ x: q.x, y: q.y - 0.2, z: q.z }, 6);
          }
        }
      }
      if (st.on[i]) n++;
    });
    st.lit = n;
  });
  return st;
}

/** Laternengehäuse (Eisen, Goldringe) und Glas, sparsam (Ursprung = Griff oben, hängt nach unten). */
function lanternPartsCheap(s = 1.7) {
  const dark = L(HWC.iron), hi = L(HWC.ironHi), gold = L(0xd8a040), goldHi = L(0xffe08a);
  const sh = (g, a = dark, b = hi) => colorize(ni(g), (p, n, out) => mixc(a, b, smooth(-0.5, 0.9, n.y * 0.6 + n.x * 0.4), out));
  const cap = new THREE.ConeGeometry(0.12 * s, 0.1 * s, 6); cap.translate(0, -0.1 * s, 0);
  const top = new THREE.CylinderGeometry(0.11 * s, 0.11 * s, 0.03 * s, 6); top.translate(0, -0.16 * s, 0);
  const bot = new THREE.CylinderGeometry(0.1 * s, 0.12 * s, 0.05 * s, 6); bot.translate(0, -0.39 * s, 0);
  const parts = [sh(cap), sh(top, gold, goldHi), sh(bot, gold, goldHi)];
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU + Math.PI / 4;
    const bar = new THREE.BoxGeometry(0.02 * s, 0.22 * s, 0.02 * s); bar.translate(Math.cos(a) * 0.088 * s, -0.27 * s, Math.sin(a) * 0.088 * s);
    parts.push(sh(bar));
  }
  const gl = new THREE.CylinderGeometry(0.08 * s, 0.08 * s, 0.2 * s, 6); gl.translate(0, -0.27 * s, 0);
  const glass = colorize(ni(gl), (p, n, out) => mixc(L(HWC.glowEdge), L(HWC.glowCore), smooth(-0.37 * s, -0.2 * s, p.y), out));
  return { body: merge(parts), glass };
}

// =====================================================================================================================
// Dorf (H-2): Häuschen, Marktstände, Stadtmauer, Kirchlein, Brunnen, kichernder Geist
// =====================================================================================================================

const DORF = {
  lila: { wall: 0x9a6ad8, wallLow: 0x6a42a8, roof: 0x3a2a5a, roofHi: 0x5a4a8a },
  gruen: { wall: 0x6ac08a, wallLow: 0x3a8a5a, roof: 0x5a2a3a, roofHi: 0x8a4a5a },
  orange: { wall: 0xf0a060, wallLow: 0xc06a3a, roof: 0x3a2a4a, roofHi: 0x5a4a6a },
  blau: { wall: 0x6a9ae8, wallLow: 0x3a62b8, roof: 0x4a2a2a, roofHi: 0x7a4a4a },
  rosa: { wall: 0xf0a0c8, wallLow: 0xc06a9a, roof: 0x2a3a5a, roofHi: 0x4a5a8a },
  creme: { wall: 0xf4e4c8, wallLow: 0xc8b090, roof: 0x5a3a2a, roofHi: 0x8a5a3a },
};

/** Lokale Platzierung: (lx = nach vorn, ly, lz = quer) relativ zu p mit Blickrichtung yaw (0 = +X). */
const LOC = (g, p, yaw, lx, ly, lz) => { g.translate(lx, ly, lz); g.rotateY(yaw); g.translate(p[0], p[1], p[2]); return g; };

/** Satteldach-Prisma: First entlang lz (quer), Breite d (lx), Länge len (lz), Höhe rh; Ursprung Mitte der Traufe unten. */
function roofPrism(d, len, rh) {
  const g = new THREE.BufferGeometry();
  const a = d / 2, l = len / 2;
  const v = [
    // vordere und hintere Dachfläche
    a, 0, -l, 0, rh, -l, 0, rh, l, a, 0, -l, 0, rh, l, a, 0, l,
    -a, 0, l, 0, rh, l, 0, rh, -l, -a, 0, l, 0, rh, -l, -a, 0, -l,
    // Giebel
    -a, 0, -l, 0, rh, -l, a, 0, -l,
    a, 0, l, 0, rh, l, -a, 0, l,
  ];
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * Schiefes Häuschen (Kulisse, sparsam ≈ 300 Dreiecke): Putz in Farbe mit dunklem Fachwerk, steiles Dach mit Überstand,
 * Schornstein, warm leuchtende Fenster (Glüh-Material), Rundfenster im Giebel, Tür (zu). Kollision: Quader bis zur Traufe.
 * list = [{ pos (Mitte der Vorderseite am Boden), yaw (Blick der Vorderseite, 0 = +X), w (Breite quer, 4), d (Tiefe, 3.4),
 * h (Wandhöhe, 3.2), color, windows: 2, door: true, roof (Firsthöhe über der Wand, 2) }].
 */
export function haeuschen(level, list) {
  const P = [], G = [];
  // schlichte Quader (12 Dreiecke) für Balken, Rahmen, Schornstein – die Häuschen sind Kulisse
  const bx = (w, h, d, col) => fill(new THREE.BoxGeometry(w, h, d), col);
  list.forEach((o, i) => {
    const p = o.pos, yaw = o.yaw ?? 0, w = o.w ?? 4, d = o.d ?? 3.4, h = o.h ?? 3.2, rh = o.roof ?? 2;
    const C0 = DORF[o.color ?? 'lila'] ?? DORF.lila;
    const wall = box(d, h, w, 0, 0, 0, C0.wall, { r: 0.06, seg: 1 });
    P.push(colorize(LOC(wall, p, yaw, -d / 2, h / 2, 0), (q, n, out) => mixc(L(C0.wallLow), L(C0.wall), smooth(p[1], p[1] + h * 0.8, q.y), out)));
    for (const lz of [-w / 2 + 0.1, w / 2 - 0.1]) P.push(LOC(bx(0.16, h, 0.18, 0x4a2c1c), p, yaw, 0.02, h / 2, lz));
    P.push(LOC(bx(0.14, 0.16, w, 0x4a2c1c), p, yaw, 0.03, h * 0.5, 0));
    // Dach mit Überstand, leicht schief
    const roof = roofPrism(d + 0.8, w + 0.7, rh);
    roof.rotateZ((hash(i * 7 + 1) - 0.5) * 0.06);
    P.push(colorize(ni(LOC(roof, p, yaw, -d / 2, h - 0.05, 0)), (q, n, out) => mixc(L(C0.roof), L(C0.roofHi), smooth(-0.2, 0.9, n.y) * 0.7 + (Math.sin(q.y * 9) > 0.55 ? 0.18 : 0), out)));
    P.push(colorize(ni(LOC(new THREE.BoxGeometry(0.45, 1.3, 0.45), p, yaw, -d * 0.62, h + rh * 0.55, w * 0.22)), (q, n, out) => mixc(L(0x6a3a2a), L(0xa86a52), smooth(-0.5, 0.9, n.y + n.x * 0.3), out)));
    // Fenster vorn (leuchtend) mit Kreuz und Bank, Tür, Rundfenster in den Giebeln
    const nw = o.windows ?? 2;
    const door = o.door !== false;
    const slots = nw === 1 ? [door ? w * 0.22 : 0] : nw === 2 ? [-w * 0.28, w * 0.28] : [-w * 0.32, 0, w * 0.32];
    for (const lz of slots) {
      const wy = door && Math.abs(lz) < 0.6 ? h * 0.72 : h * 0.55;
      G.push(colorize(LOC(new THREE.PlaneGeometry(0.66, 0.78).rotateY(Math.PI / 2), p, yaw, 0.03, wy, lz), (q, n, out) => mixc(L(0xff8a2a), L(0xfff0a0), smooth(p[1] + wy - 0.4, p[1] + wy + 0.4, q.y), out)));
      P.push(LOC(bx(0.05, 0.84, 0.06, 0x3a2418), p, yaw, 0.05, wy, lz));
      P.push(LOC(bx(0.05, 0.06, 0.72, 0x3a2418), p, yaw, 0.05, wy, lz));
      P.push(LOC(bx(0.16, 0.07, 0.8, 0x5a3a2a), p, yaw, 0.09, wy - 0.44, lz));
    }
    if (door) {
      const dz = nw === 1 ? -w * 0.18 : 0;
      P.push(LOC(bx(0.1, 1.9, 0.95, 0x6a3a2a), p, yaw, 0.04, 0.95, dz));
      P.push(LOC(bx(0.06, 0.06, 0.06, 0xffd060), p, yaw, 0.1, 0.95, dz + 0.3));
    }
    for (const sd of [-1, 1]) {
      const ring = new THREE.CircleGeometry(0.28, 8); ring.rotateY(sd > 0 ? 0 : Math.PI);
      G.push(fill(LOC(ring, p, yaw, -d / 2, h + 0.55, sd * (w / 2 + 0.36)), 0xffe08a));
    }
    // Kollision (Wände bis knapp über die Traufe)
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const cx = p[0] - c * d / 2, cz = p[2] + s * d / 2;
    const ex = Math.abs(c) * d / 2 + Math.abs(s) * w / 2, ez = Math.abs(s) * d / 2 + Math.abs(c) * w / 2;
    level.world.add({ type: 'box', min: [cx - ex, p[1], cz - ez], max: [cx + ex, p[1] + h + rh * 0.6, cz + ez], tag: 'haeuschen' });
  });
  addStatic(level, merge(P));
  addStatic(level, merge(G), { material: 'glow', castShadow: false });
}

/**
 * Marktstand mit gestreifter Markise, die federt (Markisen-Trampolin, bounce): Tresen mit Süßigkeiten (fest), vier
 * Pfosten, schräge Markise. o: { pos (Mitte am Boden), yaw (Tresen-Vorderseite, 0 = +X), w (3.2), d (2.2), h (Markise,
 * 2.6), colors: [a, b], bounce: 15 (m/s; 0 = fest) }. Kollision: Tresen (1 m) + Markise (dünner Quader mit bounce).
 */
export function marktstand(level, o) {
  const p = o.pos, yaw = o.yaw ?? 0, w = o.w ?? 3.2, d = o.d ?? 2.2, h = o.h ?? 2.6;
  const [ca, cb] = o.colors ?? [0xff5a8a, 0xfff2e0];
  const P = [];
  P.push(colorize(LOC(box(d * 0.55, 1.0, w, 0, 0, 0, HWC.wood, { r: 0.05, seg: 1 }), p, yaw, d * 0.12, 0.5, 0), (q, n, out) => mixc(L(HWC.woodLow), L(HWC.wood), smooth(-0.4, 0.9, n.y + n.x * 0.3) * 0.8 + (Math.sin(q.y * 14) > 0.7 ? 0.15 : 0), out)));
  for (let k = 0; k < 9; k++) {
    const b = new THREE.SphereGeometry(0.13, 6, 4);
    P.push(fill(LOC(b, p, yaw, d * 0.12 + (hash(k) - 0.5) * d * 0.4, 1.1, (k / 8 - 0.5) * (w - 0.6)), HWC.candy[k % HWC.candy.length]));
  }
  for (const lx of [-d / 2 + 0.1, d / 2 - 0.1]) for (const lz of [-w / 2 + 0.1, w / 2 - 0.1]) {
    const ph = h + (lx < 0 ? 0.3 : 0);
    P.push(shadeY(LOC(new THREE.CylinderGeometry(0.06, 0.07, ph, 5), p, yaw, lx, ph / 2, lz), HWC.woodLow, HWC.wood));
  }
  const stripes = 8, sw = (w + 0.4) / stripes;
  for (let k = 0; k < stripes; k++) {
    const g = new THREE.BoxGeometry(d + 0.5, 0.08, sw);
    const gp = g.attributes.position;
    for (let v = 0; v < gp.count; v++) gp.setY(v, gp.getY(v) - (gp.getX(v) / (d + 0.5)) * 0.35);
    g.computeVertexNormals();
    P.push(fill(LOC(g, p, yaw, 0, h + 0.17, -w / 2 - 0.2 + sw * (k + 0.5)), k % 2 ? cb : ca));
    const flap = new THREE.CylinderGeometry(sw / 2, sw / 2, 0.05, 6, 1, false, 0, Math.PI);
    flap.rotateZ(Math.PI / 2); flap.rotateX(-Math.PI / 2);
    P.push(fill(LOC(flap, p, yaw, d / 2 + 0.25, h - 0.02, -w / 2 - 0.2 + sw * (k + 0.5)), k % 2 ? cb : ca));
  }
  addStatic(level, merge(P));
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const ext = (dx, dz) => [Math.abs(c) * dx + Math.abs(s) * dz, Math.abs(s) * dx + Math.abs(c) * dz];
  const [tx, tz] = ext(d * 0.275, w / 2), tcx = p[0] + c * d * 0.12, tcz = p[2] - s * d * 0.12;
  level.world.add({ type: 'box', min: [tcx - tx, p[1], tcz - tz], max: [tcx + tx, p[1] + 1.0, tcz + tz], tag: 'marktstand' });
  const [ax, az] = ext(d / 2 + 0.25, w / 2 + 0.2);
  const shape = { type: 'box', min: [p[0] - ax, p[1] + h, p[2] - az], max: [p[0] + ax, p[1] + h + 0.22, p[2] + az], tag: 'markise' };
  if (o.bounce !== 0) shape.bounce = o.bounce ?? 15;
  level.world.add(shape);
}

/**
 * Stadtmauer quer (entlang x) mit Zinnen und geschlossenem Tor in der Mitte: Steinquader (oben begehbar), Holztor mit
 * Eisenbändern, Kürbislaterne darüber. o: { x0, x1, z (Vorderkante), depth (3), y (Boden), h (Höhe, 5), gate: true }.
 */
export function stadtmauer(level, o) {
  const x0 = o.x0, x1 = o.x1, z = o.z, D = o.depth ?? 3, y = o.y, H = o.h ?? 5;
  const P = [], G = [];
  const stone = L(0x8a84a0), stoneHi = L(0xb8b2cc), stoneLow = L(0x5a5470);
  const wall = new THREE.BoxGeometry(x1 - x0, H, D, Math.max(1, Math.round((x1 - x0) / 1.5)), Math.max(1, Math.round(H / 0.5)), 1);
  wall.translate((x0 + x1) / 2, y + H / 2, z - D / 2);
  P.push(colorize(ni(wall), (q, n, out) => {
    const row = Math.floor((q.y - y + 0.01) / 0.5);
    const shade = 0.75 + 0.25 * hash(row * 31 + Math.floor((q.x + (row % 2) * 0.75) / 1.5) * 7);
    mixc(stoneLow, stone, smooth(-0.5, 0.9, n.z * 0.5 + n.y * 0.6 + 0.3) * shade, out);
    if (n.y > 0.5) mixc(out, stoneHi, 0.3, out);
  }));
  const gap = o.backGap ?? null;
  for (const zz of [z - 0.25, z - D + 0.25]) for (let x = x0 + 0.5; x < x1 - 0.4; x += 1.4) {
    if (zz < z - 1 && gap && x + 0.6 > gap[0] && x - 0.2 < gap[1]) continue;
    P.push(box(0.8, 0.6, 0.5, x + 0.2, y + H + 0.3, zz, 0x8a84a0, { r: 0.05, seg: 1 }));
  }
  if (o.gate !== false) {
    const gx = (x0 + x1) / 2;
    P.push(colorize(box(3.0, 3.4, 0.2, gx, y + 1.7, z + 0.05, 0x6a3a22, { r: 0.05, seg: 1 }), (q, n, out) => mixc(L(0x4a2414), L(0x8a5230), Math.sin(q.x * 9) > 0.8 ? 0.2 : 0.6, out)));
    for (const yy of [0.8, 2.6]) P.push(box(3.0, 0.14, 0.08, gx, y + yy, z + 0.18, 0x2e2a36, { r: 0.02, seg: 1 }));
    const arch = new THREE.TorusGeometry(1.6, 0.25, 4, 12, Math.PI); arch.translate(gx, y + 3.4, z + 0.12);
    P.push(fill(arch, 0x5a5470));
    const pk = pumpkinGeo({ r: 0.4, color: 'orange', leaf: true });
    P.push(at(pk.body, gx, y + 4.4, z + 0.45));
    G.push(at(faceGeo({ r: 0.4, kind: 'grinsen' }), gx, y + 4.4, z + 0.45, -Math.PI / 2));
    level.view?.addLantern?.(gx, y + 4.8, z + 1);
  }
  addStatic(level, merge(P));
  if (G.length) addStatic(level, merge(G), { material: 'glow', castShadow: false });
  level.world.add({ type: 'box', min: [x0, y, z - D], max: [x1, y + H, z], tag: 'stadtmauer' });
  level.world.add({ type: 'box', min: [x0, y + H, z - 0.5], max: [x1, y + H + 0.6, z], tag: 'stadtmauer:zinnen' });
  const zb = z - D;
  if (gap) { level.world.add({ type: 'box', min: [x0, y + H, zb], max: [gap[0], y + H + 0.6, zb + 0.5], tag: 'stadtmauer:zinnen' }); level.world.add({ type: 'box', min: [gap[1], y + H, zb], max: [x1, y + H + 0.6, zb + 0.5], tag: 'stadtmauer:zinnen' }); }
  else level.world.add({ type: 'box', min: [x0, y + H, zb], max: [x1, y + H + 0.6, zb + 0.5], tag: 'stadtmauer:zinnen' });
}

/**
 * Kirchlein mit Glockenturm: Schiff (Satteldach, Rosette, Tür zur Kamera) neben dem Turm; oben eine offene Glockenstube
 * (begehbare Plattform, Brüstung hinten und seitlich, vier Pfeiler, spitzes Dach, goldene Glocke). o: { pos (Mitte der
 * Turm-Unterseite), tower: 9 (Plattform über dem Boden), nave: 'links' | 'rechts' }. level.named 'kirchturm' = { top, x, z }.
 */
export function kirchlein(level, o) {
  const [x, y, z] = o.pos;
  const T = o.tower ?? 9, tw = 3.2;
  const side = o.nave === 'rechts' ? 1 : -1;
  const P = [], G = [];
  const wallC = 0xe8dcc8, wallLow = 0xa89880, roofC = 0x4a3a6a, roofHi = 0x7a6aa8;
  P.push(colorize(box(tw, T, tw, x, y + T / 2, z, wallC, { r: 0.08, seg: 1 }), (q, n, out) => mixc(L(wallLow), L(wallC), smooth(y, y + T * 0.6, q.y), out)));
  for (const [dx, dz, w, d] of [[0, -tw / 2 + 0.12, tw, 0.24], [tw / 2 - 0.12, 0, 0.24, tw], [-tw / 2 + 0.12, 0, 0.24, tw]]) {
    P.push(box(w, 0.6, d, x + dx, y + T + 0.3, z + dz, wallC, { r: 0.04, seg: 1 }));
  }
  // Treppchen-Kante vorn (Stufe zur Glockenstube)
  P.push(box(tw, 0.12, 0.3, x, y + T + 0.06, z + tw / 2 - 0.15, 0xc8b898, { r: 0.03, seg: 1 }));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push(box(0.26, 2.6, 0.26, x + sx * (tw / 2 - 0.15), y + T + 1.3, z + sz * (tw / 2 - 0.15), wallC, { r: 0.04, seg: 1 }));
  const spire = new THREE.ConeGeometry(tw * 0.8, 3.4, 4, 1); spire.rotateY(Math.PI / 4); spire.translate(x, y + T + 2.6 + 1.7, z);
  P.push(colorize(ni(spire), (q, n, out) => mixc(L(roofC), L(roofHi), smooth(-0.2, 0.9, n.y + n.z * 0.3) * 0.7 + (Math.sin(q.y * 7) > 0.6 ? 0.15 : 0), out)));
  G.push(fill(at(new THREE.OctahedronGeometry(0.3, 0), x, y + T + 6.3, z), 0xffd040));
  const bell = new THREE.CylinderGeometry(0.22, 0.5, 0.7, 8, 1); bell.translate(x, y + T + 2.0, z);
  P.push(colorize(ni(bell), (q, n, out) => mixc(L(0xb8862a), L(0xffe08a), smooth(-0.3, 0.9, n.y + n.z * 0.4), out)));
  G.push(fill(at(new THREE.CircleGeometry(0.55, 12), x, y + T * 0.7, z + tw / 2 + 0.03), 0xfff0c0));
  P.push(fill(at(new THREE.RingGeometry(0.55, 0.72, 12), x, y + T * 0.7, z + tw / 2 + 0.04), 0x5a4a8a));
  for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; P.push(fill(at(new THREE.PlaneGeometry(0.05, 0.14), x + Math.cos(a) * 0.42, y + T * 0.7 + Math.sin(a) * 0.42, z + tw / 2 + 0.05), 0x5a4a8a)); }
  G.push(fill(at(new THREE.PlaneGeometry(0.5, 1.0), x, y + T * 0.38, z + tw / 2 + 0.03), 0xffc060));
  // Schiff
  const nw = 5, nd = 7, nh = 4.2;
  const nx = x + side * (tw / 2 + nw / 2 + (o.gap ?? 0) - 0.1), nz = z - 1.2;
  P.push(colorize(box(nw, nh, nd, nx, y + nh / 2, nz, wallC, { r: 0.08, seg: 1 }), (q, n, out) => mixc(L(wallLow), L(wallC), smooth(y, y + nh * 0.7, q.y), out)));
  const roof = roofPrism(nw + 0.8, nd + 0.6, 2.6);
  roof.translate(nx, y + nh - 0.05, nz);
  P.push(colorize(ni(roof), (q, n, out) => mixc(L(roofC), L(roofHi), smooth(-0.2, 0.9, n.y) * 0.7 + (Math.sin(q.y * 8) > 0.6 ? 0.15 : 0), out)));
  G.push(fill(at(new THREE.CircleGeometry(0.75, 14), nx, y + nh - 1.0, nz + nd / 2 + 0.03), 0xffb8e0));
  P.push(fill(at(new THREE.RingGeometry(0.75, 0.92, 14), nx, y + nh - 1.0, nz + nd / 2 + 0.04), 0x5a4a8a));
  for (const sx of [-1, 1]) G.push(fill(at(new THREE.PlaneGeometry(0.55, 1.2), nx + sx * 1.5, y + 1.8, nz + nd / 2 + 0.03), 0xffc060));
  P.push(colorize(box(1.3, 2.2, 0.12, nx, y + 1.1, nz + nd / 2 + 0.05, 0x6a3a2a, { r: 0.05, seg: 1 }), (q, n, out) => mixc(L(0x4a2418), L(0x8a5032), 0.5, out)));
  addStatic(level, merge(P));
  addStatic(level, merge(G), { material: 'glow', castShadow: false });
  level.world.add({ type: 'box', min: [x - tw / 2, y, z - tw / 2], max: [x + tw / 2, y + T, z + tw / 2], tag: 'kirchturm' });
  // Brüstung hinten und seitlich (vorn offen: dort kommt man vom Weg herauf)
  level.world.add({ type: 'box', min: [x - tw / 2, y + T, z - tw / 2], max: [x + tw / 2, y + T + 0.6, z - tw / 2 + 0.24], tag: 'kirchturm:bruestung' });
  for (const sx of [-1, 1]) level.world.add({ type: 'box', min: [x + (sx < 0 ? -tw / 2 : tw / 2 - 0.24), y + T, z - tw / 2], max: [x + (sx < 0 ? -tw / 2 + 0.24 : tw / 2), y + T + 0.6, z + tw / 2], tag: 'kirchturm:bruestung' });
  level.world.add({ type: 'box', min: [nx - nw / 2, y, nz - nd / 2], max: [nx + nw / 2, y + nh, nz + nd / 2], tag: 'kirche' });
  // steiles Satteldach (rutschig): man kann nicht darauf stehen
  level.world.add({ type: 'ramp', axis: 'x', dir: 1, min: [nx - nw / 2 - 0.4, y + nh, nz - nd / 2 - 0.3], max: [nx, y + nh + 2.6, nz + nd / 2 + 0.3], low: y + nh, ice: true, camIgnore: true, tag: 'kirche:dach' });
  level.world.add({ type: 'ramp', axis: 'x', dir: -1, min: [nx, y + nh, nz - nd / 2 - 0.3], max: [nx + nw / 2 + 0.4, y + nh + 2.6, nz + nd / 2 + 0.3], low: y + nh, ice: true, camIgnore: true, tag: 'kirche:dach' });
  level.named.set('kirchturm', { top: y + T, x, z });
}

/** Dorfbrunnen: runde Steineinfassung mit Holzdach und Eimer (fest, Rand begehbar). o: { pos, r: 1.1 }. */
export function brunnen(level, o) {
  const [x, y, z] = o.pos, r = o.r ?? 1.1;
  const P = [];
  const rim = new THREE.CylinderGeometry(r, r * 1.05, 0.9, 14, 3, true); rim.translate(x, y + 0.45, z);
  P.push(colorize(ni(rim), (q, n, out) => mixc(L(0x6a6480), L(0xa8a2bc), (Math.floor((q.y - y) * 3.3) + Math.floor((Math.atan2(q.z - z, q.x - x) + 4) * 2.2)) % 2 ? 0.35 : 0.75, out)));
  const top = new THREE.TorusGeometry(r, 0.14, 4, 16); top.rotateX(Math.PI / 2); top.translate(x, y + 0.9, z);
  P.push(fill(top, 0xb8b2cc));
  const water = new THREE.CircleGeometry(r * 0.95, 14); water.rotateX(-Math.PI / 2); water.translate(x, y + 0.5, z);
  P.push(fill(water, 0x2a3a7a));
  for (const s of [-1, 1]) P.push(box(0.14, 2.0, 0.14, x + s * r * 0.9, y + 1.9, z, HWC.wood, { r: 0.03, seg: 1 }));
  const roof = new THREE.ConeGeometry(r * 1.4, 0.9, 4); roof.rotateY(Math.PI / 4); roof.translate(x, y + 3.25, z);
  P.push(shadeY(roof, 0x5a2a3a, 0x8a4a5a));
  P.push(box(r * 1.8, 0.1, 0.1, x, y + 2.6, z, HWC.woodLow, { r: 0.02, seg: 1 }));
  P.push(fill(at(new THREE.CylinderGeometry(0.16, 0.12, 0.26, 7), x + 0.2, y + 2.0, z), 0x8a5a30));
  addStatic(level, merge(P));
  level.world.add({ type: 'cyl', x, z, r: r + 0.1, y0: y, y1: y + 0.9, tag: 'brunnen' });
}

/**
 * Kichernder Geist: ein kleiner Halloween-Spuk (Modell spuk_halloween) lugt hinter einem Grabstein hervor, kichert
 * („Hihi!“) und verschwindet blitzschnell hinter dem Stein, sobald die Figur näher als near m kommt; nach ein paar
 * Sekunden lugt er wieder hervor. Harmlos (keine Berührung). o: { pos (hinter dem Stein am Boden), side: 1 | −1, near: 5 }.
 * level.named 'kichergeist' = { hides }.
 */
export function kicherGeist(level, o) {
  const st = { k: 1, hide: 0, t: 0, hides: 0 };
  level.named.set(o.id ?? 'kichergeist', st);
  const [x, y, z] = o.pos;
  const side = o.side ?? 1, near = o.near ?? 5;
  level.onStep((dt) => {
    st.t += dt;
    const { d } = nearest(level, x, z);
    if (d < near && st.hide <= 0) { st.hide = 3.5; st.hides++; hwSfx(level, 'buh', 'ghost'); }
    if (st.hide > 0) st.hide -= dt;
  });
  if (!level.view || !hasModel('spuk_halloween')) return st;
  const m = getModel('spuk_halloween', { size: 0.7, hat: 'kuerbis' });
  const grp = new THREE.Group();
  m.root.traverse((q) => { if (q.isMesh) q.castShadow = false; });
  grp.add(m.root);
  const hihi = bubbleSprite('Hihi!', null, { ink: '#5a3a8a' });
  hihi.scale.set(1.5, 0.75, 1);
  hihi.visible = false;
  grp.add(hihi);
  const holder = {};
  addObject(level, grp, (dt) => {
    const d = visDt(level, holder, dt);
    const want = st.hide > 0 ? 0 : 1;
    st.k += (want - st.k) * Math.min(1, d * (want ? 1.6 : 9));
    const k = st.k;
    m.root.position.set(x + side * (0.1 + 0.6 * k), y + 0.3 + Math.sin(st.t * 2.4) * 0.08, z);
    m.root.rotation.set(0, -Math.PI / 2 + side * 0.5, -side * 0.3 * k);
    m.root.scale.setScalar(0.2 + 0.8 * k);
    m.root.visible = k > 0.05;
    m.update?.(d, { anim: st.hide > 0 ? 'shy' : 'idle' });
    hihi.visible = st.hide > 2.0;
    hihi.position.set(x + side * 0.5, y + 1.9, z);
  });
  return st;
}
