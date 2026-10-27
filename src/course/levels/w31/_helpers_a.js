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

/**
 * Gegner der Halloween-Welt mit Ersatz: Arten, die es (noch) nicht gibt, werden durch fallback (Standard pilzling)
 * ersetzt; Zusatzfelder bleiben. Für LEVEL.build: spawnt die Liste selbst.
 */
export function spawnEnemies(level, list) {
  for (const e of list) {
    const kind = level.hasKind(e.kind) ? e.kind : (e.fallback ?? 'pilzling');
    const { fallback, ...spec } = e;
    level.spawn(kind, spec);
  }
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
 * Laternenpfad: Laternenpfähle (Entitäten laternenpfahl mit on: false) gehen an, sobald eine Figur näher als r m kommt,
 * und bleiben an (warmer Pfad durchs Feld). ids: Liste der Daten-Ids. Liefert { lit: Anzahl }.
 */
export function laternenPfad(level, ids, r = 7) {
  const st = { lit: 0 };
  level.named.set('laternenpfad', st);
  level.onStep(() => {
    let n = 0;
    for (const id of ids) {
      const e = level.named.get(id);
      if (!e) continue;
      if (!e.on) { const { d } = nearest(level, e.pos.x, e.pos.z); if (d < r) e.start(); }
      if (e.on) n++;
    }
    st.lit = n;
  });
  return st;
}
