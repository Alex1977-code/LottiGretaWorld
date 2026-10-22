// Gemeinsame Hilfen für die Welt-2-Level 2-5, 2-A und 2-Haus (kein Level: exportiert kein LEVEL, die Level-Registry
// überspringt dieses Modul). Neben reinen Daten-Helfern (Inseln, Münzspuren) liegt hier die level-lokale Kulisse, die
// es als Baustein nicht gibt (Blütenblätter, nachwachsende Spiegelfrucht, Glutfunken, Vulkane, Möbel …).
//
// Level-Haken: `hook(pos, fn)` liefert eine brennende Laterne ({ kind: 'lantern', lit: true, onLit }) – die Laterne
// zündet schon im Konstruktor und ruft dabei onLit(level) auf, also während des Levelaufbaus (nach segments, blocks,
// enemies und den items davor, vor dem Verschmelzen der statischen Geometrie). So kann ein Level eigene Geometrie
// (view.addStatic), animierte Objekte (view.add), Schritt-Funktionen (level.onStep) und Haken (level.onEnemyDefeated,
// runtime.respawn) anlegen, ohne Motor-Dateien zu ändern. Die Laterne bleibt als Zier stehen (Platz bewusst wählen).

import * as THREE from 'three';
import { box, colorize, merge, lin, mixc, smooth, hex, addStatic, addObject, islandParts, themeOf } from '../../blocks/kit.js';

// ------------------------------------------------------------------ Daten-Helfer

/** Insel über ihre Grundfläche: x0..x1, zA..zB (Reihenfolge egal), Oberseite top, Höhe h. o: weitere Felder. */
export function isl(x0, x1, zA, zB, top, h = 4, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  return { type: 'island', pos: [(x0 + x1) / 2, top - h, (z0 + z1) / 2], size: [x1 - x0, h, z0 - z1], ...o };
}

/**
 * Inseln wie der Baustein `island` (Kollision: Quader), aber ohne Sonnenschatten-Wurf: specs im Format von isl().
 * Spart im Schattenpass viele Dreiecke (große Verschmelz-Abschnitte liegen sonst oft im Schattenkegel); die
 * Oberseiten empfangen weiter Schatten von Figuren, Bäumen und Hecken.
 */
export function flatIslands(level, specs) {
  const th = themeOf(level);
  for (const spec of specs) {
    const [px, py, pz] = spec.pos, [w, h, d] = spec.size;
    const x0 = px - w / 2, x1 = px + w / 2, z0 = pz - d / 2, z1 = pz + d / 2, y0 = py, y1 = py + h;
    level.world.add({ type: 'box', min: [x0, y0, z0], max: [x1, y1, z1], tag: 'island' });
    if (!level.view) continue;
    for (const g of islandParts(x0, y0, z0, x1, y1, z1, th, { top: spec.top, under: spec.under ?? 2.5, bodyColor: spec.color, rnd: level.rnd })) addStatic(level, g, { castShadow: false });
  }
}

/** Münzen in einer Reihe. */
export const line = (from, to, n) => ({ kind: 'coins', from, to, n });
/** Münzring um pos. */
export const ring = (pos, r, n) => ({ kind: 'coins', pos, r, n });
/** Münzbogen von a nach b mit Scheitel h über der Verbindungslinie (zeigt einen Sprung an). */
export function arc(a, b, n, h = 2) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    out.push({ kind: 'coin', pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * h * t * (1 - t), a[2] + (b[2] - a[2]) * t] });
  }
  return out;
}

/** Level-Haken beim Aufbau (siehe Kopfkommentar). */
export function hook(pos, fn, o = {}) {
  return { kind: 'lantern', pos, lit: true, radius: 0.1, hanging: !!o.hanging, onLit: (level) => fn(level) };
}

// ------------------------------------------------------------------ kleine Geometrie-Bausteine (Weltkoordinaten)

const L = (c) => lin(hex(c));
/** Licht von oben: oben hell, unten dunkel. */
const litFn = (c, k = 0.72) => {
  const M = L(c), T = [M[0] * 1.12, M[1] * 1.12, M[2] * 1.12], D = [M[0] * k, M[1] * k, M[2] * k];
  return (p, n, o) => (n.y >= 0 ? mixc(M, T, smooth(0, 0.9, n.y), o) : mixc(M, D, smooth(0, -0.9, n.y), o));
};

export function cyl(rTop, rBot, h, x, y, z, color, seg = 12, o = {}) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, !!o.open).toNonIndexed();
  if (o.rx) g.rotateX(o.rx);
  if (o.rz) g.rotateZ(o.rz);
  g.translate(x, y + (o.center ? 0 : h / 2), z);
  return colorize(g, o.fn ?? litFn(color));
}

export function sphere(r, x, y, z, color, o = {}) {
  const g = new THREE.SphereGeometry(r, o.ws ?? 8, o.hs ?? 6).toNonIndexed();
  g.scale(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1);
  g.translate(x, y, z);
  return colorize(g, o.fn ?? litFn(color));
}

export function cone(r, h, x, y, z, color, seg = 10) {
  const g = new THREE.ConeGeometry(r, h, seg).toNonIndexed();
  g.translate(x, y + h / 2, z);
  return colorize(g, litFn(color));
}

/** Quader (Mitte unten) ohne Rundung – sparsame Kleinteile. */
export function block(w, h, d, x, y, z, color, o = {}) {
  return box(w, h, d, x, y + h / 2, z, color, { r: o.r ?? 0.04, seg: o.seg ?? 1, topColor: o.top });
}

// ------------------------------------------------------------------ Blütenbäume (sparsam: ≈ 0,9 k Dreiecke je Baum)

const BLOSSOM = [[0xffd6ea, 0xff9ccc, 0xd8649e], [0xffe4f0, 0xffb2d6, 0xe07aae], [0xfff0f6, 0xffc4de, 0xd88ab4]];

/**
 * Kirschblütenbaum (eigene, sparsame Geometrie statt des Registry-Modells mit ≈ 3,8 k Dreiecken): gebogener Stamm mit
 * zwei Ästen, Krone aus sieben rosa Ballen, weiße Blütentupfer, Grasfleck am Fuß. Stamm fest (Zylinder).
 * Liefert Geometrien (Weltkoordinaten) in parts. size = Höhe (≈ 4).
 */
export function blossomTree(level, parts, x, y, z, size = 4, seed = 0, o = {}) {
  const S = size / 4;
  const rnd = (i) => { const v = Math.sin((seed + 1) * 91.7 + i * 12.9898) * 43758.5453; return v - Math.floor(v); };
  const bark = L(0x7a4a32), barkL = L(0x9a6444);
  const trunkFn = (p, n, out) => mixc(bark, barkL, smooth(-0.4, 0.8, n.x * 0.6 + n.z * 0.4), out);
  const lean = (rnd(1) - 0.5) * 0.25;
  const t = new THREE.CylinderGeometry(0.11 * S, 0.19 * S, 2.6 * S, 7, 2, true).toNonIndexed();
  t.rotateZ(lean);
  t.translate(x - Math.sin(lean) * 1.3 * S, y + 1.3 * S, z);
  parts.push(colorize(t, trunkFn));
  for (const [ax, az, h] of [[-0.55, 0.15, 1.9], [0.5, -0.2, 2.1]]) {
    const b = new THREE.CylinderGeometry(0.05 * S, 0.08 * S, 0.9 * S, 5, 1, true).toNonIndexed();
    b.rotateZ(-Math.sign(ax) * 0.9);
    b.translate(x + ax * 0.7 * S, y + h * S + 0.25 * S, z + az * S);
    parts.push(colorize(b, trunkFn));
  }
  const pal = BLOSSOM[Math.floor(rnd(2) * BLOSSOM.length) % BLOSSOM.length].map(L);
  const cy = y + 2.75 * S;
  const crownFn = (p, n, out) => mixc(pal[2], mixc(pal[1], pal[0], smooth(0.1, 0.9, n.y), out), smooth(-0.7, 0.2, n.y), out);
  const blobs = [[0, 0.35, 0, 1.0], [-0.8, 0.02, 0.32, 0.72], [0.75, 0.08, -0.25, 0.74], [0.12, 0.0, 0.78, 0.64], [0.05, 0.05, -0.78, 0.64], [-0.32, 0.82, -0.2, 0.62], [0.42, 0.76, 0.3, 0.56]];
  for (const [bx, by, bz, r] of blobs) {
    const g = new THREE.SphereGeometry(r * S, 7, 5).toNonIndexed();
    g.translate(x + bx * S, cy + by * S, z + bz * S);
    parts.push(colorize(g, crownFn));
  }
  const white = L(0xffffff), pinkDot = L(0xff6aa8);
  for (let i = 0; i < 10; i++) {
    const a = rnd(10 + i) * Math.PI * 2, el = rnd(30 + i) * 1.1 - 0.15;
    const g = new THREE.OctahedronGeometry(0.09 * S, 0);
    g.translate(x + Math.cos(a) * Math.cos(el) * 1.05 * S, cy + (0.3 + Math.sin(el) * 0.9) * S, z + Math.sin(a) * Math.cos(el) * 1.05 * S);
    parts.push(colorize(g, (p, n, out) => { const c = i % 3 ? white : pinkDot; out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; }));
  }
  if (o.patch !== false) {
    const d = new THREE.CircleGeometry(0.7 * S, 10).toNonIndexed();
    d.rotateX(-Math.PI / 2);
    d.translate(x, y + 0.02, z);
    const gr = L(o.patch ?? 0x5fbf4a);
    parts.push(colorize(d, (p, n, out) => { out[0] = gr[0]; out[1] = gr[1]; out[2] = gr[2]; }));
  }
  if (o.solid !== false) level.world.add({ type: 'cyl', x, z, r: 0.2 * S, y0: y, y1: y + 2.2 * S, tag: 'bluetenbaum' });
}

/**
 * Bäume in die statische Geometrie: list = [[x, y, z, size?], …] oder Streuungen { at: [x, y, z], size: [w, d], n,
 * scale: [a, b], gap, avoid } (deterministisch je Level).
 */
export function blossomTrees(level, list) {
  if (!level.view) { for (const t of list) if (Array.isArray(t)) level.world.add({ type: 'cyl', x: t[0], z: t[2], r: 0.2 * (t[3] ?? 4) / 4, y0: t[1], y1: t[1] + 2.2, tag: 'bluetenbaum' }); return; }
  let seed = 0;
  // je Baum eine Geometrie: der Verschmelzer ordnet sie ihrem 32-m-Abschnitt zu (Culling je Abschnitt)
  const one = (x, y, z, s) => { const parts = []; blossomTree(level, parts, x, y, z, s, seed++); addStatic(level, merge(parts)); };
  for (const t of list) {
    if (Array.isArray(t)) { one(t[0], t[1], t[2], t[3] ?? 4); continue; }
    const [w, d] = t.size, n = t.n ?? 3, gap = t.gap ?? 3.2;
    const pts = [];
    for (let k = 0; k < n * 30 && pts.length < n; k++) {
      const x = t.at[0] + level.rnd.real(-w / 2, w / 2), z = t.at[2] + level.rnd.real(-d / 2, d / 2);
      if (pts.some((q) => Math.hypot(q[0] - x, q[1] - z) < gap)) continue;
      if ((t.avoid ?? []).some((a) => Math.hypot(a[0] - x, a[1] - z) < (a[2] ?? 2))) continue;
      pts.push([x, z]);
    }
    const [s0, s1] = t.scale ?? [3.4, 4.6];
    for (const [x, z] of pts) one(x, t.at[1], z, level.rnd.real(s0, s1));
  }
}

// ------------------------------------------------------------------ Blumenbeete (sparsam, ohne Schattenwurf)

const FLOWER_COLS = [0xff5a8a, 0xffffff, 0xffd23d, 0xff9ccc, 0xb07aff, 0xff7a4a];

/**
 * Blumenbeete: beds = [[x, y, z, w, d, n, colors?], …] (Mitte, Fläche w × d, n Blumen). Je Blume ≈ 18 Dreiecke
 * (Stiel, sechsblättrige Blüte mit hellem Herz, zwei Blätter); je Beet eine Geometrie ohne Schattenwurf.
 */
export function flowerBeds(level, beds) {
  if (!level.view) return;
  const rnd = level.rnd;
  const stemC = L(0x3f9a3f), leafC = L(0x5cc84a);
  for (const [bx, by, bz, w, d, n, colors] of beds) {
    const parts = [];
    const pal = (colors ?? FLOWER_COLS).map(L);
    for (let i = 0; i < n; i++) {
      const x = bx + rnd.real(-w / 2, w / 2), z = bz + rnd.real(-d / 2, d / 2), h = rnd.real(0.26, 0.42);
      const stem = new THREE.CylinderGeometry(0.018, 0.024, h, 3, 1, true).toNonIndexed();
      stem.translate(x, by + h / 2, z);
      parts.push(colorize(stem, (p, nn, o) => { o[0] = stemC[0]; o[1] = stemC[1]; o[2] = stemC[2]; }));
      const leaf = new THREE.CircleGeometry(0.07, 3).toNonIndexed();
      leaf.scale(1.6, 0.6, 1);
      leaf.rotateX(-Math.PI / 2 + 0.5);
      leaf.rotateY(rnd.real(0, 6.28));
      leaf.translate(x, by + h * 0.35, z);
      parts.push(colorize(leaf, (p, nn, o) => { o[0] = leafC[0]; o[1] = leafC[1]; o[2] = leafC[2]; }));
      const c = pal[i % pal.length], ctr = L(0xffe27a);
      const bl = new THREE.CircleGeometry(0.09, 6).toNonIndexed();
      bl.rotateX(-Math.PI / 2 + rnd.real(0.25, 0.6));
      bl.rotateY(rnd.real(0, 6.28));
      bl.translate(x, by + h, z);
      parts.push(colorize(bl, (p, nn, o) => { const r = Math.hypot(p.x - x, p.y - by - h, p.z - z); mixc(ctr, c, smooth(0.015, 0.05, r), o); }));
    }
    addStatic(level, merge(parts), { castShadow: false });
  }
}

// ------------------------------------------------------------------ Spiegelfrucht-Strauch (wächst nach)

/**
 * Strauch mit einer Spiegelfrucht obenauf, die every s nach dem Pflücken nachwächst (Nachschub vor Mehrfigur-Rätseln:
 * Klone gehen leicht verloren). Statische Zier + level.onStep. pos = Fußpunkt.
 */
export function fruitBush(level, pos, o = {}) {
  const [x, y, z] = pos;
  const every = o.every ?? 3;
  const parts = [];
  const leaf = [0x5ac85a, 0x3fa84a, 0x7ad86a];
  for (const [dx, dy, dz, r, c] of [[0, 0.32, 0, 0.42, 0], [-0.34, 0.24, 0.12, 0.3, 1], [0.34, 0.24, -0.1, 0.3, 2], [0.05, 0.22, 0.3, 0.28, 1], [-0.05, 0.25, -0.3, 0.28, 2]]) {
    parts.push(sphere(r, x + dx, y + dy, z + dz, leaf[c], { sy: 0.8 }));
  }
  // kleine Blüten im Laub
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4, r = 0.36;
    parts.push(sphere(0.06, x + Math.cos(a) * r, y + 0.28 + (i % 3) * 0.07, z + Math.sin(a) * r, i % 2 ? 0xffffff : 0xff8fc8, { ws: 5, hs: 3 }));
  }
  addStatic(level, merge(parts));
  // flach genug, um hinaufzulaufen (Stufenhilfe 0,3 m) – die Frucht obenauf wird im Vorbeilaufen gepflückt
  level.world.add({ type: 'cyl', x, z, r: 0.45, y0: y, y1: y + 0.28, tag: 'fruchtstrauch' });
  const top = [x, y + 0.42, z];
  const st = { fruit: null, t: 0, grown: 0 };
  const grow = () => {
    st.fruit = level.spawn('powerup', { pos: top, power: 'spiegel' });
    st.grown++;
  };
  grow();
  level.onStep((dt) => {
    if (st.fruit && st.fruit.alive && !st.fruit.removed) return;
    st.t += dt;
    if (st.t < every) return;
    st.t = 0;
    grow();
    level.effects?.sparks({ x, y: y + 0.9, z }, 10);
  });
  if (o.id) level.named.set(o.id, st);
  return st;
}

// ------------------------------------------------------------------ fallende Blütenblätter (ein Punkte-Objekt)

let petalTex = null;
function petalTexture() {
  if (petalTex) return petalTex;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  g.translate(16, 16);
  g.rotate(-0.5);
  const grad = g.createLinearGradient(0, -12, 0, 12);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, '#ffd0e6');
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(0, -13);
  g.bezierCurveTo(10, -8, 9, 8, 0, 13);
  g.bezierCurveTo(-9, 8, -10, -8, 0, -13);
  g.fill();
  petalTex = new THREE.CanvasTexture(c);
  petalTex.colorSpace = THREE.SRGBColorSpace;
  return petalTex;
}

/**
 * Blütenblätter, die um das Blickziel der Kamera herum langsam taumelnd fallen (Kasten size, wandern mit).
 * Ein THREE.Points-Objekt (1 Zeichenaufruf, kein Schatten). o: n (70), size [w, h, d], colors.
 */
export function petals(level, o = {}) {
  if (!level.view || typeof document === 'undefined') return;
  const n = o.n ?? 70, [W, H, D] = o.size ?? [30, 12, 26];
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const seed = [];
  const cols = (o.colors ?? [0xffc0dc, 0xff9ccc, 0xffe4f0, 0xffffff]).map((c) => new THREE.Color(c));
  const rnd = level.rnd;
  for (let i = 0; i < n; i++) {
    seed.push({ x: rnd.real(-W / 2, W / 2), y: rnd.real(0, H), z: rnd.real(-D / 2, D / 2), ph: rnd.real(0, 6.28), sp: rnd.real(0.5, 1.0), sw: rnd.real(0.4, 1.2) });
    const c = cols[i % cols.length];
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size: o.dot ?? 0.26, map: petalTexture(), vertexColors: true, transparent: true, alphaTest: 0.3, depthWrite: false, sizeAttenuation: true });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.name = 'bluetenblaetter';
  const rig = level.view.rig;
  let t = 0;
  addObject(level, pts, (dt) => {
    t += Math.min(dt, 0.1);
    const cx = rig?.target?.x ?? 0, cy = (rig?.target?.y ?? 0) - 2, cz = rig?.target?.z ?? 0;
    for (let i = 0; i < n; i++) {
      const s = seed[i];
      // fallen, taumeln; relativ zum wandernden Kasten umlaufen
      const fy = ((s.y - t * s.sp) % H + H) % H;
      let lx = s.x + Math.sin(t * 0.7 * s.sw + s.ph) * 1.2 + t * 0.35, lz = s.z + Math.cos(t * 0.5 * s.sw + s.ph) * 0.8;
      lx = ((lx - cx + W / 2) % W + W) % W - W / 2;
      lz = ((lz - cz + D / 2) % D + D) % D - D / 2;
      pos[i * 3] = cx + lx; pos[i * 3 + 1] = cy + fy; pos[i * 3 + 2] = cz + lz;
    }
    geo.attributes.position.needsUpdate = true;
  });
  return pts;
}

// ------------------------------------------------------------------ Glutfunken und Lavablasen (Arena 2-A)

let glowTex = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.7)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

/**
 * Aufsteigende Glutfunken über einem Kreisring (Lavasee um die Insel): center [x, y, z], r0..r1 (Ring), n, h.
 * Additive Punkte, ein Objekt.
 */
export function embers(level, o = {}) {
  if (!level.view || typeof document === 'undefined') return;
  const [cx, cy, cz] = o.center ?? [0, 0, 0];
  const n = o.n ?? 90, r0 = o.r0 ?? 12, r1 = o.r1 ?? 26, H = o.h ?? 14;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const rnd = level.rnd, seed = [];
  const pal = [new THREE.Color(0xffd070), new THREE.Color(0xff8a2a), new THREE.Color(0xff5a1a)];
  for (let i = 0; i < n; i++) {
    const a = rnd.real(0, Math.PI * 2), r = rnd.real(r0, r1);
    seed.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, t0: rnd.real(0, 4), sp: rnd.real(1.2, 2.6), ph: rnd.real(0, 6.28) });
    const c = pal[i % 3];
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size: o.dot ?? 0.32, map: glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.name = 'glutfunken';
  let t = 0;
  addObject(level, pts, (dt) => {
    t += Math.min(dt, 0.1);
    for (let i = 0; i < n; i++) {
      const s = seed[i];
      const life = H / s.sp;
      const k = ((t + s.t0 * life) % life) / life;            // 0..1 Aufstieg
      pos[i * 3] = cx + s.x + Math.sin(t * 1.3 + s.ph) * 0.6 * k;
      pos[i * 3 + 1] = cy + k * H;
      pos[i * 3 + 2] = cz + s.z + Math.cos(t * 1.1 + s.ph) * 0.6 * k;
    }
    geo.attributes.position.needsUpdate = true;
    mat.opacity = 0.9;
  });
  return pts;
}

// ------------------------------------------------------------------ Arena 2-A: Felsinsel, Lavasee, Kraterwand, Vulkane

/** Weiche Pseudo-Zufallsfunktion (deterministisch) für Gelände-Farben. */
const hash2 = (x, z) => { const v = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return v - Math.floor(v); };
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Umriss-Radius der Felsinsel in Richtung a (rad). */
export function islandRadius(o, a) {
  const R = o.R ?? 10.5, k = o.wobble ?? [0.08, 0.05, 0.035], ph = o.phase ?? [0.4, 1.7, 2.9];
  return R * (1 + k[0] * Math.sin(3 * a + ph[0]) + k[1] * Math.sin(5 * a + ph[1]) + k[2] * Math.sin(2 * a + ph[2]));
}

/**
 * Organische Felsinsel (Oberseite top, flach): Draufsicht als welliger Kreis, Fels mit Flecken und Rissen, glühender
 * Fuß, Randsteine. Kollision: Kreis-Vereinigung (Mitte + Randzylinder, folgt dem Umriss auf ≈ 0,15 m genau).
 * o: center [x, z], top, R, depth (5), wobble, phase, N (48), lavaY.
 */
export function rockIsland(level, o) {
  const [cx, cz] = o.center ?? [0, 0];
  const top = o.top ?? 2, depth = o.depth ?? 5, N = o.N ?? 48;
  const rad = (a) => islandRadius(o, a);
  let rMin = Infinity;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, r = rad(a), rr = 1.4;
    rMin = Math.min(rMin, r);
    level.world.add({ type: 'cyl', x: cx + Math.cos(a) * (r - rr), z: cz + Math.sin(a) * (r - rr), r: rr, y0: top - depth, y1: top, tag: 'felsinsel' });
  }
  level.world.add({ type: 'cyl', x: cx, z: cz, r: rMin - 1.0, y0: top - depth, y1: top, tag: 'felsinsel' });
  if (!level.view) return;
  const rockA = L(0x8c7a70), rockB = L(0x6e5e57), rockC = L(0xa6948a), crack = L(0x3a2a26), rim = L(0xb8a294);
  const topCol = (x, z, edge) => {
    const n = vnoise(x * 0.35, z * 0.35), m = vnoise(x * 1.3 + 7, z * 1.3 - 3);
    const out = [0, 0, 0];
    mixc(rockB, rockA, smooth(0.25, 0.7, n), out);
    mixc(out, rockC, smooth(0.65, 0.95, m) * 0.6, out);
    if (Math.abs(vnoise(x * 0.6 + 20, z * 0.6) - 0.5) < 0.035) mixc(out, crack, 0.7, out);
    mixc(out, rim, smooth(0.75, 1, edge) * 0.5, out);
    return out;
  };
  const RINGS = 6;
  const posA = [], colA = [];
  const P = (k, i) => { const a = (i / N) * Math.PI * 2, r = rad(a) * (k / RINGS); return [cx + Math.cos(a) * r, top, cz + Math.sin(a) * r, k / RINGS]; };
  const push = (q) => { posA.push(q[0], q[1], q[2]); const c = topCol(q[0], q[2], q[3]); colA.push(c[0], c[1], c[2]); };
  for (let k = 0; k < RINGS; k++) {
    for (let i = 0; i < N; i++) {
      const a0 = P(k, i), a1 = P(k, i + 1), b0 = P(k + 1, i), b1 = P(k + 1, i + 1);
      if (k === 0) { push(a0); push(b1); push(b0); continue; }
      push(a0); push(b1); push(b0);
      push(a0); push(a1); push(b1);
    }
  }
  const gTop = new THREE.BufferGeometry();
  gTop.setAttribute('position', new THREE.Float32BufferAttribute(posA, 3));
  gTop.setAttribute('color', new THREE.Float32BufferAttribute(colA, 3));
  gTop.computeVertexNormals();
  addStatic(level, gTop, { castShadow: false });
  const sp = [], scol = [];
  const glowY = o.lavaY ?? -0.5;
  const sideCol = (y, x, z) => {
    const out = [0, 0, 0];
    const n = vnoise(x * 0.8, y * 1.2 + z * 0.8);
    mixc(rockB, rockA, n, out);
    mixc(out, L(0x40241c), smooth(top, glowY - 0.3, y) * 0.8, out);
    if (y < glowY + 0.8) mixc(out, L(0xff7a2a), smooth(glowY + 0.8, glowY - 0.1, y) * 0.9, out);
    return out;
  };
  const LAY = [[0, 0], [0.9, 0.04], [2.4, 0.1], [depth, 0.2]];
  for (let i = 0; i < N; i++) {
    for (let l = 0; l < LAY.length - 1; l++) {
      const v = [];
      for (const [ii, ll] of [[i, l], [i + 1, l], [i, l + 1], [i + 1, l + 1]]) {
        const a = (ii / N) * Math.PI * 2, r = rad(a) * (1 - LAY[ll][1]) + (vnoise(ii * 0.7, ll * 3.1) - 0.5) * 0.35 * (ll > 0 ? 1 : 0);
        v.push([cx + Math.cos(a) * r, top - LAY[ll][0], cz + Math.sin(a) * r]);
      }
      for (const q of [v[0], v[2], v[1], v[1], v[2], v[3]]) { sp.push(q[0], q[1], q[2]); const c = sideCol(q[1], q[0], q[2]); scol.push(c[0], c[1], c[2]); }
    }
  }
  const gSide = new THREE.BufferGeometry();
  gSide.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  gSide.setAttribute('color', new THREE.Float32BufferAttribute(scol, 3));
  gSide.computeVertexNormals();
  addStatic(level, gSide, { castShadow: true });
  const parts = [];
  for (let i = 0; i < N; i += 2) {
    if (hash2(i, 3) < 0.35) continue;
    const a = ((i + hash2(i, 5)) / N) * Math.PI * 2, r = rad(a) - 0.25;
    const s = 0.25 + hash2(i, 9) * 0.3;
    const g = new THREE.DodecahedronGeometry(s, 0);
    g.scale(1.2, 0.6, 1);
    g.rotateY(hash2(i, 11) * 3);
    g.translate(cx + Math.cos(a) * r, top + s * 0.15, cz + Math.sin(a) * r);
    parts.push(colorize(g, litFn(hash2(i, 13) < 0.5 ? 0x7a6a62 : 0x958278)));
  }
  if (parts.length) addStatic(level, merge(parts), { castShadow: false });
}

let lavaTex = null;
function lavaTexture() {
  if (lavaTex) return lavaTex;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#c8320e';
  g.fillRect(0, 0, 256, 256);
  const rnd = (i) => { const v = Math.sin(i * 91.17) * 43758.5453; return v - Math.floor(v); };
  for (let k = 0; k < 3; k++) {
    for (let i = 0; i < 26; i++) {
      const x = rnd(i * 3 + k * 101) * 256, y = rnd(i * 7 + k * 53) * 256, r = 10 + rnd(i * 11 + k) * 24;
      for (const [dx, dy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256]]) {
        const grd = g.createRadialGradient(x + dx, y + dy, r * 0.2, x + dx, y + dy, r);
        if (k === 0) { grd.addColorStop(0, 'rgba(255,232,120,0.95)'); grd.addColorStop(1, 'rgba(255,140,30,0)'); }
        else if (k === 1) { grd.addColorStop(0, 'rgba(90,20,8,0.75)'); grd.addColorStop(1, 'rgba(120,30,10,0)'); }
        else { grd.addColorStop(0, 'rgba(255,160,40,0.7)'); grd.addColorStop(1, 'rgba(255,100,20,0)'); }
        g.fillStyle = grd;
        g.beginPath(); g.arc(x + dx, y + dy, r, 0, Math.PI * 2); g.fill();
      }
    }
  }
  lavaTex = new THREE.CanvasTexture(c);
  lavaTex.colorSpace = THREE.SRGBColorSpace;
  lavaTex.wrapS = lavaTex.wrapT = THREE.RepeatWrapping;
  return lavaTex;
}

/**
 * Lavasee: tödliche Fläche (kill 'lava', besiegt Welt-2-Gegner) als Quader unter der Oberfläche y und eine große,
 * langsam fließende Glutfläche (Kanvas-Textur, unbeleuchtet, 2 Dreiecke je Lage). o: center [x, z], size, y.
 */
export function lavaLake(level, o = {}) {
  const [cx, cz] = o.center ?? [0, 0], S = o.size ?? 120, y = o.y ?? -0.5;
  level.world.add({ type: 'box', min: [cx - S / 2, y - 6, cz - S / 2], max: [cx + S / 2, y - 0.12, cz + S / 2], kill: 'lava', solid: false, camIgnore: true, tag: 'lavasee' });
  if (!level.view || typeof document === 'undefined') return;
  const tex = lavaTexture();
  const mk = (rep, op, yy) => {
    const t = tex.clone();
    t.needsUpdate = true;
    t.repeat.set(rep, rep);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(S, S), new THREE.MeshBasicMaterial({ map: t, transparent: op < 1, opacity: op, depthWrite: op >= 1, fog: true }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(cx, yy, cz);
    m.name = 'lavasee';
    return m;
  };
  const a = mk(S / 14, 1, y - 0.05), b = mk(S / 22, 0.45, y - 0.02);
  b.material.blending = THREE.AdditiveBlending;
  let t = 0;
  addObject(level, a, (dt) => { t += Math.min(dt, 0.1); a.material.map.offset.set(t * 0.012, t * 0.007); });
  addObject(level, b, () => { b.material.map.offset.set(-t * 0.009, t * 0.013); b.material.opacity = 0.35 + Math.sin(t * 1.7) * 0.1; });
}

/**
 * Kraterwand rund um den Lavasee (zackige Felszähne, oben dunkler, unten glühend) – Kulisse ohne Kollision.
 * o: center [x, z], r0 (Innenradius 30), r1 (Außenradius 44), n (Zähne 26), h [min, max], y (Lavahöhe), gap [a0, a1]
 * (Winkelbereich ohne Zähne, z. B. zur Kamera hin).
 */
export function calderaWall(level, o = {}) {
  if (!level.view) return;
  const [cx, cz] = o.center ?? [0, 0];
  const r0 = o.r0 ?? 30, r1 = o.r1 ?? 44, n = o.n ?? 26, [h0, h1] = o.h ?? [6, 16], y = o.y ?? -0.5;
  const parts = [];
  const dark = L(0x2e201c), mid = L(0x5a443c), hot = L(0xff6a24);
  for (let i = 0; i < n; i++) {
    const a = ((i + hash2(i, 1) * 0.6) / n) * Math.PI * 2;
    if (o.gap && a > o.gap[0] && a < o.gap[1]) continue;
    const r = r0 + hash2(i, 2) * (r1 - r0) * 0.4, h = h0 + hash2(i, 3) * (h1 - h0), w = 4 + hash2(i, 4) * 5;
    const g = new THREE.ConeGeometry(w, h + 2, 6, 3);
    g.translate(0, (h + 2) / 2, 0);
    g.scale(1, 1, 0.7 + hash2(i, 6) * 0.5);
    g.rotateY(-a);
    g.translate(cx + Math.cos(a) * (r + w * 0.6), y - 2, cz + Math.sin(a) * (r + w * 0.6));
    parts.push(colorize(g, (p, nn, out) => {
      const t = (p.y - y) / h;
      mixc(mid, dark, smooth(0.1, 0.9, t), out);
      if (p.y < y + 0.9) mixc(out, hot, smooth(y + 0.9, y, p.y) * 0.85, out);
    }));
  }
  addStatic(level, merge(parts), { castShadow: false });
}

/**
 * Vulkane (Kulisse): Kegel mit Krater, glühende Lavarinnen, Rauch (gemeinsames Punkte-Objekt). list = [[x, y, z, r, h], …].
 */
export function volcanoes(level, list) {
  if (!level.view || typeof document === 'undefined') return;
  const rock = L(0x3a2622), rockT = L(0x5a3a30), glow = L(0xff7a22), glowH = L(0xffd060);
  const smokes = [];
  for (const [x, y, z, r, h] of list) {
    const rt = r * 0.22;
    const g = new THREE.CylinderGeometry(rt, r, h, 14, 5, true);
    g.translate(x, y + h / 2, z);
    addStatic(level, colorize(g, (p, n, out) => {
      const t = (p.y - y) / h;
      mixc(rock, rockT, smooth(0.3, 1, t), out);
      const a = Math.atan2(p.z - z, p.x - x);
      const vein = Math.max(0, Math.cos(a * 3 + 0.6)) ** 8;
      if (t > 0.35) mixc(out, glow, vein * smooth(0.35, 0.9, t), out);
    }), { castShadow: false });
    const c = new THREE.CircleGeometry(rt * 0.95, 14);
    c.rotateX(-Math.PI / 2);
    c.translate(x, y + h - 0.3, z);
    addStatic(level, colorize(c, (p, n, out) => mixc(glowH, glow, smooth(0, rt, Math.hypot(p.x - x, p.z - z)), out)), { material: 'glow', castShadow: false });
    smokes.push([x, y + h, z, rt]);
  }
  const n = smokes.length * 10;
  const pos = new Float32Array(n * 3), seed = [];
  for (let i = 0; i < n; i++) seed.push({ v: smokes[Math.floor(i / 10)], ph: (i % 10) / 10 + hash2(i, 2) * 0.05, dx: hash2(i, 3) - 0.5, dz: hash2(i, 4) - 0.5 });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ size: 9, map: glowTexture(), color: 0x6a5a58, transparent: true, opacity: 0.55, depthWrite: false, sizeAttenuation: true, fog: true });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.name = 'vulkanrauch';
  let t = 0;
  addObject(level, pts, (dt) => {
    t += Math.min(dt, 0.1);
    for (let i = 0; i < n; i++) {
      const s = seed[i], k = (t * 0.08 + s.ph) % 1, [x, y, z, rt] = s.v;
      pos[i * 3] = x + s.dx * rt * 2 + k * 10;
      pos[i * 3 + 1] = y + k * 22;
      pos[i * 3 + 2] = z + s.dz * rt * 2 + k * 3;
    }
    geo.attributes.position.needsUpdate = true;
  });
}

/** Blubbernde Lavablasen auf dem See (eine Instanz-Gruppe): o: center [x, z], r0, r1, n, y. */
export function lavaBubbles(level, o = {}) {
  if (!level.view) return;
  const [cx, cz] = o.center ?? [0, 0], n = o.n ?? 14, y = o.y ?? -0.5;
  const geo = new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffa040 });
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  mesh.name = 'lavablasen';
  mesh.frustumCulled = false;
  const b = [];
  for (let i = 0; i < n; i++) {
    const a = hash2(i, 21) * Math.PI * 2, r = (o.r0 ?? 12) + hash2(i, 22) * ((o.r1 ?? 26) - (o.r0 ?? 12));
    b.push({ x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r, ph: hash2(i, 23), sp: 0.35 + hash2(i, 24) * 0.3, s: 0.25 + hash2(i, 25) * 0.35 });
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3();
  let t = 0;
  addObject(level, mesh, (dt) => {
    t += Math.min(dt, 0.1);
    for (let i = 0; i < n; i++) {
      const B = b[i], k = (t * B.sp + B.ph) % 1;
      const s = k < 0.8 ? B.s * smooth(0, 0.8, k) : B.s * (1 + (k - 0.8) * 3) * (1 - smooth(0.8, 1, k));
      sv.set(s + 1e-4, s * 0.8 + 1e-4, s + 1e-4);
      pv.set(B.x, y - 0.06, B.z);
      m.compose(pv, q, sv);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
}

/**
 * Wellen für die Arena (level-lokal): Gegner mit den Ids aus waves[1..] warten unsichtbar und ohne Wirkung, bis alle
 * Gegner der vorigen Welle besiegt sind; dann fallen sie nach pause s vom Himmel an ihren Startpunkt (Staub, Beben,
 * Ansage). Der Arena-Archetyp zählt alle Wellen von Anfang an (HUD „noch N“). Nach einem Tod setzt die Arena alle Gegner
 * neu (runtime.respawn) – die Wellen beginnen dann wieder bei 1. Muss beim Aufbau laufen (vor arena.setup), damit die
 * Arena unsere Hülle von runtime.respawn umhüllt (ihre neuen Gegner entstehen vor unserem Parken).
 * waves = [['id1'], ['id2', 'id3']]; o: pause (1.6 s), drop (12 m), banner(level, welle), id ('wellen').
 */
export function arenaWaves(level, waves, o = {}) {
  const st = { wave: 0, timer: -1, dropping: [], log: [], landed: 0 };
  const ent = (id) => level.named.get(id);
  const park = (e) => {
    if (!e || e.parked) return;
    e.parked = { update: e.update, home: e.pos.clone(), touch: e.touch };
    e.update = () => {};
    e.touch = false;
    e.shadowVisible = false;
    e.pos.set(e.parked.home.x, e.parked.home.y + 60, e.parked.home.z);
    e.vel?.set(0, 0, 0);
    if (e.model) e.model.root.visible = false;
  };
  const release = (e) => {
    if (!e?.parked) return;
    const P = e.parked;
    delete e.update;                       // Methode der Klasse wieder sichtbar
    if (e.update !== P.update) e.update = P.update;
    e.touch = P.touch ?? true;
    e.shadowVisible = true;
    e.pos.set(P.home.x, P.home.y + (o.drop ?? 12), P.home.z);
    e.vel?.set(0, -2, 0);
    e.grounded = false;
    e.wake = Math.max(e.wake ?? 0, 60);
    if (e.state === 'idle') e.setState?.('walk');
    if (e.model) e.model.root.visible = true;
    e.parked = null;
    st.dropping.push(e);
  };
  const reset = () => {
    st.wave = 0; st.timer = -1; st.dropping = [];
    for (let w = 1; w < waves.length; w++) for (const id of waves[w]) park(ent(id));
  };
  const rt = level.runtime;
  const respawn = rt.respawn.bind(rt);
  rt.respawn = () => { reset(); respawn(); };
  reset();
  level.onStep((dt) => {
    for (const e of st.dropping.slice()) {
      if (e.removed || e.defeated) { st.dropping.splice(st.dropping.indexOf(e), 1); continue; }
      if (e.grounded) {
        st.dropping.splice(st.dropping.indexOf(e), 1);
        st.landed++;
        level.effects?.dust(e.pos, 10, 2.2);
        level.shake?.(0.35);
        level.sfx('groundpound');
      }
    }
    if (st.wave + 1 >= waves.length) return;
    const cur = waves[st.wave].map(ent);
    const down = cur.every((e) => !e || e.defeated || e.removed || !e.alive);
    if (down && st.timer < 0) st.timer = o.pause ?? 1.6;
    if (st.timer >= 0) {
      st.timer -= dt;
      if (st.timer <= 0) {
        st.timer = -1;
        st.wave++;
        for (const id of waves[st.wave]) release(ent(id));
        st.log.push({ wave: st.wave + 1, t: +level.time.toFixed(2) });
        o.banner?.(level, st.wave + 1);
      }
    }
  });
  level.named.set(o.id ?? 'wellen', st);
  return st;
}

/** Felsstümpfe im Lavasee (pos = Oberseite-Mitte), fest; unten glühend. o: r (0.8), lavaY. */
export function rockStumps(level, list, o = {}) {
  const r = o.r ?? 0.8, ly = o.lavaY ?? -0.5;
  const parts = [];
  for (const [x, y, z] of list) {
    level.world.add({ type: 'cyl', x, z, r, y0: ly - 3, y1: y, tag: 'felsstumpf' });
    if (!level.view) continue;
    const g = new THREE.CylinderGeometry(r * 0.85, r * 1.25, y - ly + 1.2, 7, 2);
    g.translate(x, (y + ly - 1.2) / 2, z);
    parts.push(colorize(g, (p, n, out) => {
      mixc(L(0x4a3830), L(0x7a665c), smooth(ly, y, p.y), out);
      if (p.y < ly + 0.6) mixc(out, L(0xff6a24), smooth(ly + 0.6, ly - 0.2, p.y) * 0.85, out);
    }));
  }
  if (parts.length) addStatic(level, merge(parts), { castShadow: false });
}

// ------------------------------------------------------------------ Prüfungs-Haus 2-Haus: Tapeten, Bilder, Uhren, Möbel

/** Kanvas-Kachel (size px) mit Zeichenfunktion → wiederholbare Textur. */
function tileTexture(size, draw, repeat = true) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** Tapetenmuster (128-px-Kachel, Breite 1 m an der Wand). */
const WALLPAPER = {
  wolken(g, S) {   // Kinderzimmer: hellblau mit Wölkchen und Sternen
    g.fillStyle = '#a8d8ff'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#ffffff';
    for (const [x, y, r] of [[30, 34, 13], [44, 30, 15], [58, 36, 11], [96, 92, 12], [108, 88, 14], [120, 95, 10]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    g.fillStyle = '#ffe066';
    const star = (x, y, r) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); };
    star(96, 30, 9); star(26, 96, 8); star(70, 70, 5);
  },
  buecher(g, S) {  // Bibliothek: dunkelgrün mit goldenen Streifen und Lilienpunkten
    g.fillStyle = '#2f6a4a'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#3f7d5a'; g.fillRect(0, 0, S / 2, S);
    g.fillStyle = '#d8b04a'; g.fillRect(S / 2 - 3, 0, 6, S); g.fillRect(S - 3, 0, 3, S); g.fillRect(0, 0, 3, S);
    g.fillStyle = 'rgba(216,176,74,0.8)';
    for (const [x, y] of [[S / 4, S / 4], [S / 4, (3 * S) / 4], [(3 * S) / 4, S / 2], [(3 * S) / 4, 0], [(3 * S) / 4, S]]) { g.beginPath(); g.ellipse(x, y, 5, 9, 0, 0, 7); g.fill(); }
  },
  kacheln(g, S) {  // Küche: weiße Kacheln mit blauen Ornamenten
    g.fillStyle = '#f4f2ea'; g.fillRect(0, 0, S, S);
    g.strokeStyle = '#c8c4b8'; g.lineWidth = 3;
    for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * S / 2, 0); g.lineTo(i * S / 2, S); g.stroke(); g.beginPath(); g.moveTo(0, i * S / 2); g.lineTo(S, i * S / 2); g.stroke(); }
    g.strokeStyle = '#3a6ad0'; g.lineWidth = 3;
    for (const [x, y] of [[S / 4, S / 4], [(3 * S) / 4, (3 * S) / 4]]) { g.beginPath(); g.arc(x, y, 14, 0, 7); g.stroke(); g.beginPath(); g.moveTo(x - 9, y); g.lineTo(x + 9, y); g.moveTo(x, y - 9); g.lineTo(x, y + 9); g.stroke(); }
    g.fillStyle = '#3a6ad0';
    for (const [x, y] of [[(3 * S) / 4, S / 4], [S / 4, (3 * S) / 4]]) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); }
  },
  uhren(g, S) {    // Uhrenstube: weinrot mit goldenen Rauten und kleinen Zifferblättern
    g.fillStyle = '#7a2440'; g.fillRect(0, 0, S, S);
    g.strokeStyle = 'rgba(232,190,90,0.85)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(S / 2, 0); g.lineTo(S, S / 2); g.lineTo(S / 2, S); g.lineTo(0, S / 2); g.closePath(); g.stroke();
    g.fillStyle = '#f6e8c8';
    g.beginPath(); g.arc(S / 2, S / 2, 14, 0, 7); g.fill();
    g.strokeStyle = '#5a2030'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(S / 2, S / 2); g.lineTo(S / 2, S / 2 - 9); g.moveTo(S / 2, S / 2); g.lineTo(S / 2 + 7, S / 2); g.stroke();
  },
  kamin(g, S) {    // Kaminzimmer: warmes Rot mit goldenen Ranken-Punkten
    g.fillStyle = '#b8483a'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#c85a48'; for (let i = 0; i < 4; i++) g.fillRect(i * S / 4, 0, S / 8, S);
    g.fillStyle = '#f0c060';
    for (const [x, y] of [[S / 8, S / 4], [S / 8 + S / 2, (3 * S) / 4], [S / 8 + S / 4, S / 2 + 6], [S / 8 + (3 * S) / 4, 6]]) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }
  },
};

/** Bilder-Atlas (512 × 512, 4 × 4 Felder à 128 px): Motive für Bilderrahmen, Zifferblätter, Teppiche, Fenster. */
const MOTIFS = ['huegel', 'pflaume', 'blumen', 'meer', 'gesucht', 'berg', 'lottigreta', 'haus', 'uhr', 'teppich_rund', 'teppich_bunt', 'teppich_rot', 'fenster', 'kuchen', 'globus', 'teppich_gruen'];
let houseAtlas = null;
function drawMotif(g, name) {
  const S = 128;
  const sky = (top, bot) => { const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, S, S); };
  const circ = (x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
  switch (name) {
    case 'huegel': sky('#7cc8ff', '#d8f0ff'); circ(98, 30, 14, '#ffe066'); g.fillStyle = '#5ac85a'; g.beginPath(); g.ellipse(40, 128, 70, 46, 0, 0, 7); g.fill(); g.fillStyle = '#3fa84a'; g.beginPath(); g.ellipse(110, 128, 60, 36, 0, 0, 7); g.fill(); break;
    case 'pflaume': sky('#ffd6ea', '#fff0f6'); g.fillStyle = '#f2e6f0'; g.beginPath(); g.ellipse(48, 40, 10, 28, -0.2, 0, 7); g.ellipse(80, 40, 10, 28, 0.2, 0, 7); g.fill(); circ(64, 78, 32, '#f2e6f0'); circ(52, 72, 4, '#3a2a3a'); circ(76, 72, 4, '#3a2a3a'); circ(64, 84, 4, '#ff8fb0'); circ(44, 86, 6, 'rgba(255,140,180,0.5)'); circ(84, 86, 6, 'rgba(255,140,180,0.5)'); break;
    case 'blumen': sky('#fff6e0', '#ffe8c8'); g.fillStyle = '#5a8ad0'; g.fillRect(48, 82, 32, 40); for (const [x, y, c] of [[50, 50, '#ff5a8a'], [72, 42, '#ffd23d'], [86, 60, '#ff8fcc'], [40, 66, '#b07aff'], [64, 62, '#ffffff']]) { g.strokeStyle = '#3f9a3f'; g.lineWidth = 3; g.beginPath(); g.moveTo(64, 84); g.lineTo(x, y); g.stroke(); circ(x, y, 9, c); circ(x, y, 3, '#ffe27a'); } break;
    case 'meer': sky('#ffd8a8', '#ffb8c8'); circ(64, 70, 22, '#ff9a5a'); g.fillStyle = '#3a8ad8'; g.fillRect(0, 74, S, 54); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(40, 86); g.lineTo(76, 86); g.lineTo(70, 96); g.lineTo(46, 96); g.fill(); g.beginPath(); g.moveTo(58, 84); g.lineTo(58, 56); g.lineTo(74, 82); g.fill(); break;
    case 'gesucht': g.fillStyle = '#f0dcae'; g.fillRect(0, 0, S, S); g.fillStyle = '#6a3a1a'; g.font = 'bold 20px sans-serif'; g.textAlign = 'center'; g.fillText('GESUCHT', 64, 22); circ(64, 70, 30, '#8a5a3a'); circ(42, 46, 10, '#8a5a3a'); circ(86, 46, 10, '#8a5a3a'); circ(64, 80, 14, '#c89a6a'); circ(54, 64, 4, '#1a1010'); g.strokeStyle = '#d8b040'; g.lineWidth = 2; g.beginPath(); g.arc(76, 64, 7, 0, 7); g.stroke(); circ(64, 76, 5, '#1a1010'); g.fillStyle = '#1a1a1a'; g.fillRect(44, 24, 40, 14); g.fillRect(36, 36, 56, 5); g.font = 'bold 13px sans-serif'; g.fillStyle = '#6a3a1a'; g.fillText('Baron Brummbär', 64, 118); break;
    case 'berg': sky('#8ac8ff', '#e0f4ff'); g.fillStyle = '#7a6aa8'; g.beginPath(); g.moveTo(10, 120); g.lineTo(60, 30); g.lineTo(118, 120); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(46, 56); g.lineTo(60, 30); g.lineTo(75, 57); g.lineTo(66, 52); g.lineTo(58, 60); g.fill(); g.fillStyle = '#5ac85a'; g.fillRect(0, 110, S, 18); break;
    case 'lottigreta': g.fillStyle = '#ffffff'; g.fillRect(0, 0, S, S); g.lineWidth = 4; for (const [x, c, hair] of [[42, '#ff5a5a', '#e8b040'], [88, '#5a8aff', '#8a4a2a']]) { circ(x, 44, 14, '#ffd8b8'); g.strokeStyle = hair; g.beginPath(); g.moveTo(x - 14, 40); g.lineTo(x - 22, 64); g.moveTo(x + 14, 40); g.lineTo(x + 22, 64); g.stroke(); g.fillStyle = c; g.beginPath(); g.moveTo(x, 58); g.lineTo(x - 16, 100); g.lineTo(x + 16, 100); g.fill(); g.strokeStyle = '#3a2a2a'; g.beginPath(); g.moveTo(x - 6, 100); g.lineTo(x - 8, 118); g.moveTo(x + 6, 100); g.lineTo(x + 8, 118); g.stroke(); } circ(64, 18, 9, '#ffd23d'); break;
    case 'haus': g.fillStyle = '#fffef6'; g.fillRect(0, 0, S, S); g.fillStyle = '#ff7a5a'; g.beginPath(); g.moveTo(24, 62); g.lineTo(64, 24); g.lineTo(104, 62); g.fill(); g.fillStyle = '#ffd23d'; g.fillRect(32, 62, 64, 50); g.fillStyle = '#8a5a3a'; g.fillRect(56, 82, 16, 30); g.fillStyle = '#7ac8ff'; g.fillRect(38, 70, 12, 12); g.fillRect(78, 70, 12, 12); g.fillStyle = '#5ac85a'; g.fillRect(0, 112, S, 16); break;
    case 'uhr': { circ(64, 64, 62, '#c89a40'); circ(64, 64, 55, '#fbf4e2'); g.fillStyle = '#3a2a2a'; g.font = 'bold 16px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; for (let i = 1; i <= 12; i++) { const a = (i / 12) * Math.PI * 2 - Math.PI / 2; g.fillText(String(i), 64 + Math.cos(a) * 43, 64 + Math.sin(a) * 43); } for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2; g.fillRect(64 + Math.cos(a) * 52 - 1, 64 + Math.sin(a) * 52 - 1, 2, 2); } break; }
    case 'teppich_rund': for (let r = 64, i = 0; r > 0; r -= 9, i++) circ(64, 64, r, ['#e85a7a', '#ffd23d', '#5ab8e8', '#ffffff', '#b07aff', '#5ac85a', '#ff9a4a', '#e85a7a'][i % 8]); break;
    case 'teppich_bunt': for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = ['#ff7a7a', '#ffd23d', '#7ad87a', '#7ab8ff', '#c89aff'][(x + y * 2) % 5]; g.fillRect(x * 32, y * 32, 32, 32); } g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.strokeRect(4, 4, 120, 120); break;
    case 'teppich_rot': g.fillStyle = '#9a2a2a'; g.fillRect(0, 0, S, S); g.strokeStyle = '#e8c070'; g.lineWidth = 5; g.strokeRect(8, 8, 112, 112); g.lineWidth = 2; g.strokeRect(16, 16, 96, 96); g.fillStyle = '#2a4a8a'; g.beginPath(); g.moveTo(64, 28); g.lineTo(100, 64); g.lineTo(64, 100); g.lineTo(28, 64); g.fill(); g.fillStyle = '#e8c070'; g.beginPath(); g.moveTo(64, 44); g.lineTo(84, 64); g.lineTo(64, 84); g.lineTo(44, 64); g.fill(); break;
    case 'teppich_gruen': g.fillStyle = '#3f7a4a'; g.fillRect(0, 0, S, S); g.strokeStyle = '#f0e0a8'; g.lineWidth = 4; g.strokeRect(6, 6, 116, 116); for (let i = 0; i < 4; i++) { g.strokeStyle = i % 2 ? '#f0e0a8' : '#c8a04a'; g.beginPath(); g.arc(64, 64, 14 + i * 11, 0, 7); g.stroke(); } break;
    case 'fenster': sky('#1a2a6a', '#4a3a8a'); circ(92, 34, 14, '#fff6c8'); circ(98, 30, 12, '#1a2a6a'); g.fillStyle = '#ffffff'; for (let i = 0; i < 14; i++) g.fillRect((i * 37) % 120 + 4, (i * 53) % 90 + 6, 2, 2); g.fillStyle = '#2a1a4a'; g.beginPath(); g.ellipse(30, 128, 60, 26, 0, 0, 7); g.fill(); break;
    case 'kuchen': sky('#fff0e0', '#ffe0d0'); g.fillStyle = '#c88a5a'; g.fillRect(28, 64, 72, 40); g.fillStyle = '#ffb8d0'; g.fillRect(28, 56, 72, 12); for (let i = 0; i < 5; i++) circ(36 + i * 14, 56, 6, '#ffb8d0'); circ(64, 46, 8, '#e83a4a'); break;
    case 'globus': sky('#e8dcc0', '#d8c8a0'); circ(64, 60, 40, '#3a8ad8'); g.fillStyle = '#5ac85a'; g.beginPath(); g.ellipse(52, 48, 16, 12, 0.4, 0, 7); g.ellipse(80, 74, 12, 16, -0.3, 0, 7); g.fill(); g.fillStyle = '#8a5a3a'; g.fillRect(58, 102, 12, 16); break;
    default: g.fillStyle = '#888'; g.fillRect(0, 0, S, S);
  }
}
function atlasTexture() {
  if (houseAtlas) return houseAtlas;
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  MOTIFS.forEach((m, i) => { g.save(); g.translate((i % 4) * 128, Math.floor(i / 4) * 128); g.beginPath(); g.rect(0, 0, 128, 128); g.clip(); drawMotif(g, m); g.restore(); });
  houseAtlas = new THREE.CanvasTexture(c);
  houseAtlas.colorSpace = THREE.SRGBColorSpace;
  houseAtlas.anisotropy = 4;
  return houseAtlas;
}
const motifUV = (name) => { const i = Math.max(0, MOTIFS.indexOf(name)); const u0 = (i % 4) / 4, v1 = 1 - Math.floor(i / 4) / 4; return [u0 + 0.004, v1 - 0.25 + 0.004, u0 + 0.25 - 0.004, v1 - 0.004]; };

/** Rechteck (Weltkoordinaten) als zwei Dreiecke mit UV; Normale n ('+z' Wand hinten zeigt nach +z, 'y' Boden …). */
function quad(posA, uvA, x, y, z, w, h, face, uv) {
  // face: '+z' (Fläche zeigt nach +z, steht in der Ebene z), '+x', '-x', 'y' (liegt, zeigt nach oben)
  let c;
  if (face === '+z') c = [[x - w / 2, y, z], [x + w / 2, y, z], [x + w / 2, y + h, z], [x - w / 2, y + h, z]];
  else if (face === '+x') c = [[x, y, z + w / 2], [x, y, z - w / 2], [x, y + h, z - w / 2], [x, y + h, z + w / 2]];
  else if (face === '-x') c = [[x, y, z - w / 2], [x, y, z + w / 2], [x, y + h, z + w / 2], [x, y + h, z - w / 2]];
  else c = [[x - w / 2, y, z + h / 2], [x + w / 2, y, z + h / 2], [x + w / 2, y, z - h / 2], [x - w / 2, y, z - h / 2]];
  const [u0, v0, u1, v1] = uv;
  const t = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
  for (const k of [0, 1, 2, 0, 2, 3]) { posA.push(...c[k]); uvA.push(...t[k]); }
}

/** Möbel in lokalen Koordinaten (Fußpunkt 0, Vorderseite +z) bauen; liefert { parts, solids: [[x0,y0,z0,x1,y1,z1]] }. */
const FURN = {
  bett(o) { const p = [], s = []; const c = o.color ?? 0x5a8ad8;
    p.push(block(1.6, 0.45, 2.4, 0, 0, 0, 0xb07a4a), block(1.5, 0.25, 2.3, 0, 0.45, 0, 0xffffff), block(1.5, 0.12, 1.6, 0, 0.7, 0.35, c), block(0.9, 0.18, 0.5, 0, 0.7, -0.85, 0xfff4e0), block(1.6, 1.1, 0.12, 0, 0, -1.24, 0x9a6a3a));
    s.push([-0.8, 0, -1.3, 0.8, 0.82, 1.2]); return { p, s }; },
  kiste(o) { const p = [], s = []; p.push(block(1.2, 0.7, 0.7, 0, 0, 0, o.color ?? 0xe85a5a), block(1.26, 0.12, 0.76, 0, 0.7, 0, 0xffd23d)); for (const [x, c] of [[-0.25, 0x5ab8e8], [0.2, 0x7ad87a]]) p.push(sphere(0.16, x, 0.92, 0, c)); s.push([-0.6, 0, -0.35, 0.6, 0.82, 0.35]); return { p, s }; },
  bausteine(o) { const p = []; const cols = [0xff5a5a, 0xffd23d, 0x5ab8e8, 0x7ad87a, 0xc89aff]; let k = 0; for (const [x, y, z] of [[0, 0, 0], [0.42, 0, 0.05], [0.2, 0.4, 0.02], [-0.45, 0, 0.3]]) p.push(block(0.4, 0.4, 0.4, x, y, z, cols[(k++ + (o.seed ?? 0)) % 5], { r: 0.05 })); return { p, s: [] }; },
  tisch(o) { const p = [], s = []; const w = o.w ?? 2.2, d = o.d ?? 1.2, h = o.h ?? 0.9; p.push(block(w, 0.1, d, 0, h - 0.1, 0, o.color ?? 0xb07a4a)); for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) p.push(block(0.1, h - 0.1, 0.1, x * (w / 2 - 0.12), 0, z * (d / 2 - 0.12), 0x8a5a32)); if (o.cloth) p.push(block(w * 0.7, 0.02, d + 0.06, 0, h, 0, o.cloth)); s.push([-w / 2, h - 0.12, -d / 2, w / 2, h, d / 2]); return { p, s }; },
  stuhl(o) { const p = []; const c = o.color ?? 0x9a6a3a; p.push(block(0.5, 0.06, 0.5, 0, 0.45, 0, c), block(0.5, 0.6, 0.06, 0, 0.5, -0.22, c)); for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) p.push(block(0.05, 0.45, 0.05, x * 0.2, 0, z * 0.2, 0x7a4a2a)); return { p, s: [[-0.25, 0, -0.25, 0.25, 0.5, 0.25]] }; },
  regal(o) { const p = [], s = []; const w = o.w ?? 2, h = o.h ?? 2.4, d = 0.45; p.push(block(w, h, 0.05, 0, 0, -d / 2 + 0.03, 0x6a4022), block(0.08, h, d, -w / 2, 0, 0, 0x7a4a2a), block(0.08, h, d, w / 2, 0, 0, 0x7a4a2a));
    const cols = [0xc83a3a, 0x3a6ad0, 0x3fa84a, 0xe8b040, 0x8a4ac8, 0xe86a2a, 0x2a8a8a];
    for (let k = 0; k < 4; k++) { const y = (k * h) / 4; p.push(block(w, 0.05, d, 0, y, 0, 0x7a4a2a)); let x = -w / 2 + 0.08; let i = k * 3 + (o.seed ?? 0); while (x < w / 2 - 0.15) { const bw = 0.08 + ((i * 37) % 7) * 0.012, bh = h / 4 * (0.6 + ((i * 13) % 5) * 0.06); p.push(block(bw, bh, 0.3, x + bw / 2, y + 0.05, 0.02, cols[i % cols.length], { r: 0.01 })); x += bw + 0.01; i++; } }
    p.push(block(w + 0.1, 0.06, d + 0.05, 0, h, 0, 0x7a4a2a)); s.push([-w / 2, 0, -d / 2, w / 2, h, d / 2]); return { p, s }; },
  sofa(o) { const p = [], s = []; const c = o.color ?? 0x8a3a6a, w = o.w ?? 2.4; p.push(block(w, 0.45, 0.9, 0, 0, 0, c), block(w, 0.55, 0.25, 0, 0.45, -0.32, c), block(0.25, 0.3, 0.9, -w / 2 + 0.12, 0.45, 0, c), block(0.25, 0.3, 0.9, w / 2 - 0.12, 0.45, 0, c)); for (const x of [-w / 4, w / 4]) p.push(block(w / 2 - 0.3, 0.12, 0.6, x, 0.45, 0.08, 0xf0d8e0, { r: 0.06 })); s.push([-w / 2, 0, -0.45, w / 2, 0.57, 0.45]); return { p, s }; },
  sessel(o) { return FURN.sofa({ ...o, w: 1.1 }); },
  kamin(o) { const p = [], s = []; const w = o.w ?? 2.6; p.push(block(w, 1.6, 0.6, 0, 0, 0, 0xc86a4a), block(w + 0.3, 0.15, 0.75, 0, 1.6, 0.05, 0xf0e0c8), block(1.4, 1.0, 0.1, 0, 0.1, 0.27, 0x2a1a14)); for (let k = 0; k < 3; k++) p.push(block(0.9, 0.12, 0.12, 0, 0.12 + k * 0.1, 0.18 + (k % 2) * 0.05, 0x6a3a1a)); p.push(cone(0.28, 0.6, -0.2, 0.25, 0.25, 0xff8a2a, 6), cone(0.22, 0.48, 0.25, 0.25, 0.22, 0xffd060, 6)); s.push([-w / 2, 0, -0.3, w / 2, 1.6, 0.3]); return { p, s, glow: [cone(0.18, 0.4, 0.02, 0.25, 0.28, 0xffe080, 6)] }; },
  pflanze(o) { const p = []; const S = o.size ?? 1; p.push(cyl(0.22 * S, 0.16 * S, 0.4 * S, 0, 0, 0, o.pot ?? 0xd8784a, 8)); for (const [x, y, z, r] of [[0, 0.75, 0, 0.32], [-0.18, 0.6, 0.1, 0.24], [0.17, 0.62, -0.08, 0.25], [0.02, 0.98, -0.05, 0.22]]) p.push(sphere(r * S, x * S, y * S, z * S, 0x4fb84a, { ws: 7, hs: 5 })); p.push(cyl(0.03 * S, 0.04 * S, 0.5 * S, 0, 0.35 * S, 0, 0x6a4a2a, 5)); return { p, s: [[-0.22 * S, 0, -0.22 * S, 0.22 * S, 0.4 * S, 0.22 * S]] }; },
  stehlampe(o) { const p = []; p.push(cyl(0.2, 0.22, 0.05, 0, 0, 0, 0x5a4a3a, 8), cyl(0.03, 0.03, 1.6, 0, 0.05, 0, 0x5a4a3a, 5), cyl(0.18, 0.32, 0.36, 0, 1.6, 0, o.color ?? 0xfff0b0, 10)); return { p, s: [] }; },
  standuhr(o) { const p = [], s = []; p.push(block(0.7, 2.3, 0.45, 0, 0, 0, 0x6a3a1a), block(0.8, 0.2, 0.5, 0, 2.3, 0, 0x8a4a22), block(0.5, 1.0, 0.04, 0, 0.5, 0.23, 0x3a2010), cyl(0.07, 0.07, 0.02, 0, 0.75, 0.25, 0xe8c050, 10, { rx: Math.PI / 2, center: true })); s.push([-0.35, 0, -0.22, 0.35, 2.5, 0.22]); return { p, s }; },
  herd(o) { const p = [], s = []; p.push(block(1.2, 0.9, 0.7, 0, 0, 0, 0xf0f0f0), block(1.2, 0.04, 0.7, 0, 0.9, 0, 0x3a3a3a), block(0.9, 0.5, 0.04, 0, 0.18, 0.35, 0x2a2a2a)); for (const x of [-0.3, 0.3]) p.push(cyl(0.18, 0.18, 0.02, x, 0.94, 0, 0x8a2a2a, 10)); p.push(cyl(0.22, 0.2, 0.3, 0.3, 0.96, 0, 0xb0b0b8, 10)); s.push([-0.6, 0, -0.35, 0.6, 0.94, 0.35]); return { p, s }; },
  schrank(o) { const p = [], s = []; const w = o.w ?? 2.4, h = o.h ?? 0.9; p.push(block(w, h, 0.65, 0, 0, 0, o.color ?? 0xf0d8a8), block(w + 0.05, 0.06, 0.7, 0, h, 0, 0xc8a070)); for (let i = 0; i < Math.round(w / 0.6); i++) p.push(block(0.04, 0.12, 0.04, -w / 2 + 0.3 + i * 0.6, h * 0.7, 0.34, 0x8a6a4a)); s.push([-w / 2, 0, -0.33, w / 2, h + 0.06, 0.33]); return { p, s }; },
  kuehlschrank() { const p = []; p.push(block(0.8, 1.9, 0.7, 0, 0, 0, 0xe8f0f8), block(0.04, 0.4, 0.04, 0.3, 1.2, 0.36, 0x9aa0a8), block(0.04, 0.3, 0.04, 0.3, 0.5, 0.36, 0x9aa0a8), block(0.78, 0.02, 0.02, 0, 1.0, 0.355, 0xb8c0c8)); return { p, s: [[-0.4, 0, -0.35, 0.4, 1.9, 0.35]] }; },
  globus() { const p = []; p.push(cyl(0.25, 0.3, 0.06, 0, 0, 0, 0x6a4022, 8), cyl(0.04, 0.05, 0.7, 0, 0.06, 0, 0x6a4022, 5), sphere(0.35, 0, 1.05, 0, 0x3a8ad8, { ws: 12, hs: 8 })); return { p, s: [] }; },
  kronleuchter(o) { const p = []; const h = o.h ?? 1.2; p.push(cyl(0.02, 0.02, h, 0, -h, 0, 0x8a7a40, 4), cyl(0.5, 0.35, 0.12, 0, -h - 0.1, 0, 0xd8b040, 10)); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; p.push(cyl(0.05, 0.05, 0.16, Math.cos(a) * 0.45, -h + 0.02, Math.sin(a) * 0.45, 0xfff4d8, 5)); } return { p, s: [], glow: Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2; return sphere(0.06, Math.cos(a) * 0.45, -h + 0.22, Math.sin(a) * 0.45, 0xffe8a0, { ws: 5, hs: 4 }); }) }; },
  topf(o) { const p = []; p.push(cyl(0.2, 0.18, 0.22, 0, 0, 0, o.color ?? 0x9aa0a8, 10), block(0.3, 0.03, 0.04, 0.3, 0.15, 0, 0x3a3a3a)); return { p, s: [] }; },
  galerie(o) { const p = [], s = []; const w = o.w ?? 6, d = o.d ?? 2.4, h = o.h ?? 2.8;   // Holzgalerie (Einweg-Fläche baut das Level)
    for (let i = 0; i <= Math.round(w / 0.5); i++) p.push(block(0.06, 0.7, 0.06, -w / 2 + i * (w / Math.round(w / 0.5)), h, d / 2 - 0.05, 0xf0e0c8));
    p.push(block(w, 0.08, 0.1, 0, h + 0.7, d / 2 - 0.05, 0xc89a60)); for (const x of [-w / 2 + 0.15, w / 2 - 0.15]) p.push(block(0.2, h, 0.2, x, 0, d / 2 - 0.15, 0xa87a4a)); return { p, s }; },
};

/**
 * Raum-Ausstattung des Prüfungs-Hauses: Parkett, Sockelleiste/Täfelung, Tapete (je Raum ein Muster, Kanvas-Kachel),
 * Bilder mit Rahmen und Wanduhren (gemeinsamer Bilder-Atlas, Uhrzeiger animiert), Teppiche, Möbel (statisch, mit
 * Kollision je Möbelstück). room: { x, z, w (Innenbreite), d (Innentiefe), h (Wandhöhe), y (Boden), paper, floor:
 * [Farbe1, Farbe2], wood, pictures: [{ wall: 'back'|'left'|'right', at, y, w, h, motif }], clocks: [{ wall, at, y, r }],
 * rugs: [{ x, z, w, d, motif }], furniture: [{ kind, x, z, yaw, … }] } (x/z relativ zur Raummitte).
 * Liefert { clocks } für die Animation (houseClocks).
 */
export function houseRoom(level, room, shared) {
  const { x: cx, z: cz, w, d, h = 4, y = 1 } = room;
  const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2;
  const parts = [], glow = [];
  // Parkett: Dielen (2 Dreiecke je Diele, Farbe je Diele), leicht über dem Boden
  const [fa, fb] = (room.floor ?? [0xd8a868, 0xc89458]).map(L);
  const plank = 0.32, len = 2.2;
  const fp = [], fc = [];
  for (let r = 0; r * plank < d; r++) {
    const za = z0 + r * plank, zb = Math.min(cz + d / 2, za + plank - 0.012);
    let xs = x0 - ((r * 0.73) % 1) * len;
    for (let k = 0; xs < x1; k++, xs += len) {
      const xa = Math.max(x0, xs), xb = Math.min(x1, xs + len - 0.012);
      if (xb <= xa) continue;
      const t = hash2(r, k), col = [0, 0, 0];
      mixc(fa, fb, t, col);
      const q = [[xa, za], [xb, za], [xb, zb], [xa, zb]];
      for (const i of [0, 3, 2, 0, 2, 1]) { fp.push(q[i][0], y + 0.006, q[i][1]); fc.push(col[0], col[1], col[2]); }
    }
  }
  const gF = new THREE.BufferGeometry();
  gF.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
  gF.setAttribute('color', new THREE.Float32BufferAttribute(fc, 3));
  gF.computeVertexNormals();
  addStatic(level, gF, { castShadow: false });
  // Täfelung (1 m) und Sockelleiste an Rück- und Seitenwänden
  const wood = room.wood ?? 0x8a5a3a;
  parts.push(block(w, 1.0, 0.08, cx, y, z0 + 0.04, wood), block(w, 0.08, 0.14, cx, y + 1.0, z0 + 0.07, 0xf0e0c8));
  for (const sx of [-1, 1]) parts.push(block(0.08, 1.0, d, cx + sx * (w / 2 - 0.04), y, cz, wood), block(0.14, 0.08, d, cx + sx * (w / 2 - 0.07), y + 1.0, cz, 0xf0e0c8));
  // Möbel
  for (const f of room.furniture ?? []) {
    const mk = FURN[f.kind];
    if (!mk) continue;
    const { p, s, glow: gl } = mk(f);
    const yaw = f.yaw ?? 0, fx = cx + (f.x ?? 0), fz = cz + (f.z ?? 0), fy = y + (f.y ?? 0);
    for (const g of p) { g.rotateY(yaw); g.translate(fx, fy, fz); parts.push(g); }
    for (const g of gl ?? []) { g.rotateY(yaw); g.translate(fx, fy, fz); glow.push(g); }
    if (f.solid !== false) for (const b of s) {
      const c = Math.cos(yaw), sn = Math.sin(yaw);
      const xs = [b[0], b[3]].flatMap((px) => [b[2], b[5]].map((pz) => px * c + pz * sn));
      const zs = [b[0], b[3]].flatMap((px) => [b[2], b[5]].map((pz) => -px * sn + pz * c));
      level.world.add({ type: 'box', min: [fx + Math.min(...xs), fy + b[1], fz + Math.min(...zs)], max: [fx + Math.max(...xs), fy + b[4], fz + Math.max(...zs)], camIgnore: true, tag: `moebel:${f.kind}` });
    }
  }
  // Bilderrahmen (Geometrie) – die Bildflächen kommen in den gemeinsamen Atlas-Mesh
  const wallPos = (wall, at, yy) => (wall === 'back' ? [cx + at, y + yy, z0 + 0.1, '+z'] : wall === 'left' ? [x0 + 0.1, y + yy, cz + at, '+x'] : [x1 - 0.1, y + yy, cz + at, '-x']);
  for (const pic of room.pictures ?? []) {
    const [px, py, pz, face] = wallPos(pic.wall, pic.at, pic.y ?? 1.9);
    const fw = pic.w ?? 1.2, fh = pic.h ?? 1.0, fr = pic.frame ?? 0xc89a40;
    if (face === '+z') parts.push(block(fw + 0.16, fh + 0.16, 0.06, px, py - 0.08, pz - 0.02, fr));
    else parts.push(block(0.06, fh + 0.16, fw + 0.16, px + (face === '+x' ? -0.02 : 0.02), py - 0.08, pz, fr));
    quad(shared.pos, shared.uv, px + (face === '+x' ? 0.02 : face === '-x' ? -0.02 : 0), py, pz + (face === '+z' ? 0.02 : 0), fw, fh, face, motifUV(pic.motif));
  }
  for (const r of room.rugs ?? []) quad(shared.pos, shared.uv, cx + r.x, y + 0.012, cz + r.z, r.w, r.d, 'y', motifUV(r.motif));
  const clocks = [];
  for (const ck of room.clocks ?? []) {
    const [px, py, pz, face] = wallPos(ck.wall, ck.at, ck.y ?? 2.6);
    const r = ck.r ?? 0.45;
    const nx = face === '+x' ? 1 : face === '-x' ? -1 : 0, nz = face === '+z' ? 1 : 0;
    const rim = new THREE.CylinderGeometry(r + 0.06, r + 0.06, 0.08, 18);
    rim.rotateX(Math.PI / 2);
    if (face !== '+z') rim.rotateY(Math.PI / 2);
    rim.translate(px - nx * 0.01, py, pz - nz * 0.01);
    parts.push(colorize(rim, litFn(0x8a5a2a)));
    quad(shared.pos, shared.uv, px + nx * 0.035, py - r, pz + nz * 0.035, 2 * r, 2 * r, face, motifUV('uhr'));
    clocks.push({ x: px + nx * 0.05, y: py, z: pz + nz * 0.05, r, face, speed: ck.speed ?? 1, room: room.id });
  }
  if (parts.length) addStatic(level, merge(parts), { castShadow: true });
  if (glow.length) addStatic(level, merge(glow), { material: 'glow', castShadow: false });
  // Tapete: Rück- und Seitenwände oberhalb der Täfelung (eigener Mesh je Raum, Kachel 1 m)
  if (level.view && typeof document !== 'undefined' && WALLPAPER[room.paper]) {
    const tex = tileTexture(128, WALLPAPER[room.paper]);
    const posA = [], uvA = [];
    const hh = h - 1.08;
    quad(posA, uvA, cx, y + 1.08, z0 + 0.012, w, hh, '+z', [0, 0, w, hh]);
    quad(posA, uvA, x0 + 0.012, y + 1.08, cz, d, hh, '+x', [0, 0, d, hh]);
    quad(posA, uvA, x1 - 0.012, y + 1.08, cz, d, hh, '-x', [0, 0, d, hh]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(posA, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvA, 2));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
    m.receiveShadow = true;
    m.name = `tapete:${room.id}`;
    addObject(level, m);
  }
  return clocks;
}

/** Gemeinsamer Mesh für Bilder, Teppiche und Zifferblätter (ein Zeichenaufruf) und animierte Uhrzeiger. */
export function houseFinish(level, shared, clocks) {
  if (!level.view || typeof document === 'undefined') return;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(shared.pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(shared.uv, 2));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: atlasTexture(), roughness: 0.85 }));
  m.receiveShadow = true;
  m.name = 'bilder';
  addObject(level, m);
  // Zeiger: je Uhr Minuten- und Stundenzeiger (Instanzen eines dünnen Quaders, Drehpunkt am Ende)
  const n = clocks.length * 2;
  if (!n) return;
  const hg = new THREE.BoxGeometry(1, 1, 1);
  hg.translate(0, 0.5, 0);
  const hands = new THREE.InstancedMesh(hg, new THREE.MeshStandardMaterial({ color: 0x2a1a14, roughness: 0.6 }), n);
  hands.name = 'uhrzeiger';
  hands.frustumCulled = false;
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), E = new THREE.Euler();
  let t = 0;
  addObject(level, hands, (dt) => {
    t += Math.min(dt, 0.1);
    clocks.forEach((c, i) => {
      for (let k = 0; k < 2; k++) {
        const len = c.r * (k ? 0.55 : 0.85), ang = -(t * c.speed * (k ? 0.08 : 1) + (k ? 1.3 : 0)) * Math.PI * 2 / (k ? 1 : 10);
        // Drehung in der Wandebene: Wand +z → um z; Seitenwände → um x
        if (c.face === '+z') E.set(0, 0, ang); else E.set(c.face === '+x' ? -ang : ang, 0, 0);
        Q.setFromEuler(E);
        S.set(c.face === '+z' ? (k ? 0.05 : 0.035) : 0.02, len, c.face === '+z' ? 0.02 : (k ? 0.05 : 0.035));
        P.set(c.x, c.y, c.z);
        M.compose(P, Q, S);
        hands.setMatrixAt(i * 2 + k, M);
      }
    });
    hands.instanceMatrix.needsUpdate = true;
  });
}

// ------------------------------------------------------------------ Rosenhecken

const ROSE_COLS = [0xff4a6a, 0xff8fb0, 0xffffff, 0xffc0d8, 0xd8306a];

/**
 * Rosenhecken: list = [[x0, x1, zA, zB, y, h], …] (Grundfläche, Fuß y, Höhe h). Kollision: Quader. Darstellung:
 * Heckenkörper (Grün mit hellen Spitzen), Laubbuckel entlang der Oberkante, Rosen auf Oberseite und Flanken (ohne
 * Schattenwurf). Je Hecke eine Geometrie (Culling je Abschnitt).
 */
export function hedges(level, list, o = {}) {
  const leafA = L(0x3f9a4f), leafB = L(0x5cbf5a), leafD = L(0x2a7a3a);
  for (const [xa, xb, zA, zB, y, h] of list) {
    const x0 = Math.min(xa, xb), x1 = Math.max(xa, xb), z0 = Math.min(zA, zB), z1 = Math.max(zA, zB);
    level.world.add({ type: 'box', min: [x0, y, z0], max: [x1, y + h, z1], camIgnore: !!o.camIgnore, tag: 'hecke' });
    if (!level.view) continue;
    const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const parts = [];
    const body = box(w, h - 0.15, d, cx, y + (h - 0.15) / 2, cz, 0x3f9a4f, { r: 0.18, topColor: 0x5cbf5a });
    parts.push(body);
    // Laubbuckel auf der Oberkante
    const along = w > d ? 'x' : 'z', len = Math.max(w, d), n = Math.max(2, Math.round(len / 0.9));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const px = along === 'x' ? x0 + t * w : cx + (hash2(i, x0) - 0.5) * w * 0.3;
      const pz = along === 'z' ? z0 + t * d : cz + (hash2(i, z0) - 0.5) * d * 0.3;
      const r = Math.min(w, d) * 0.42 + hash2(i, 7) * 0.12;
      parts.push(sphere(r, px, y + h - 0.2, pz, 0x4fb04f, { sy: 0.55, ws: 7, hs: 4, fn: (p, nn, out) => mixc(leafD, mixc(leafA, leafB, smooth(-0.2, 0.9, nn.y), out), smooth(-0.6, 0.1, nn.y), out) }));
    }
    addStatic(level, merge(parts), { castShadow: true });
    // Rosen: Oberseite und beide Längsflanken
    const roses = [];
    const nr = Math.round(len * (o.density ?? 1.6));
    for (let i = 0; i < nr; i++) {
      const t = hash2(i, len * 3.1 + x0), side = i % 3;   // 0 oben, 1/2 Flanken
      const c = ROSE_COLS[Math.floor(hash2(i, 9.3 + z0) * ROSE_COLS.length)];
      let px, py, pz;
      if (along === 'x') { px = x0 + t * w; pz = side === 0 ? cz + (hash2(i, 2) - 0.5) * d * 0.6 : side === 1 ? z1 + 0.05 : z0 - 0.05; }
      else { pz = z0 + t * d; px = side === 0 ? cx + (hash2(i, 2) - 0.5) * w * 0.6 : side === 1 ? x1 + 0.05 : x0 - 0.05; }
      py = side === 0 ? y + h + 0.02 : y + 0.5 + hash2(i, 4) * (h - 0.9);
      roses.push(sphere(0.09 + hash2(i, 5) * 0.04, px, py, pz, c, { ws: 5, hs: 4 }));
    }
    if (roses.length) addStatic(level, merge(roses), { castShadow: false });
  }
}

// ------------------------------------------------------------------ Zierteich (nur Optik, begehbar wie Wiese)

/**
 * Kleiner Zierteich als flache Wasserscheibe knapp über der Wiese (keine Kollision – die Figur läuft darüber wie über
 * eine Pfütze), Kieselrand, Seerosenblätter mit Blüten, Schilf. list = [[x, y, z, rx, rz], …].
 */
export function ponds(level, list) {
  if (!level.view) return;
  const deep = L(0x2f8ae0), shallow = L(0x7ad0ff);
  for (const [x, y, z, rx, rz] of list) {
    const parts = [];
    const g = new THREE.CircleGeometry(1, 28);
    g.rotateX(-Math.PI / 2);
    g.scale(rx, 1, rz);
    g.translate(x, y + 0.025, z);
    parts.push(colorize(g, (p, n, out) => mixc(deep, shallow, smooth(0.2, 1, Math.hypot((p.x - x) / rx, (p.z - z) / rz)), out)));
    const nS = Math.round((rx + rz) * 4.2);
    for (let i = 0; i < nS; i++) {
      const a = (i / nS) * Math.PI * 2 + hash2(i, x) * 0.1, s = 0.16 + hash2(i, z) * 0.12;
      const st = new THREE.DodecahedronGeometry(s, 0);
      st.scale(1.3, 0.55, 1);
      st.translate(x + Math.cos(a) * (rx + 0.08), y + s * 0.2, z + Math.sin(a) * (rz + 0.08));
      parts.push(colorize(st, litFn(hash2(i, 3) < 0.5 ? 0xe8dce4 : 0xc8bcc8)));
    }
    for (let i = 0; i < 4; i++) {
      const a = hash2(i, 11 + x) * Math.PI * 2, r = 0.35 + hash2(i, 12) * 0.4;
      const px = x + Math.cos(a) * rx * r, pz = z + Math.sin(a) * rz * r, s = 0.22 + hash2(i, 13) * 0.12;
      const pad = new THREE.CircleGeometry(s, 9, 0.5, Math.PI * 2 - 0.5);
      pad.rotateX(-Math.PI / 2);
      pad.rotateY(hash2(i, 14) * 6);
      pad.translate(px, y + 0.04, pz);
      parts.push(colorize(pad, (p, n, out) => { const c = L(0x4fb84a); out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; }));
      if (i % 2 === 0) parts.push(sphere(0.07, px + 0.05, y + 0.09, pz, i ? 0xffffff : 0xff8fc8, { ws: 6, hs: 4, sy: 0.6 }));
    }
    addStatic(level, merge(parts), { castShadow: false });

  }
}

// ------------------------------------------------------------------ Gartenleuchten

/**
 * Gartenleuchte: heller Pfosten mit Sockel, leuchtende Glaskugel unter einem rosa Hütchen (die Engine-Laterne aus
 * `deco` ist bei Tag ein dunkler Kasten). Kollision: schmaler Zylinder. list = [[x, y, z], …]; je Leuchte eine
 * Geometrie (Culling je Abschnitt).
 */
export function gardenLamps(level, list) {
  const glow = L(0xffe6a0);
  const lampFn = (p, n, out) => { out[0] = glow[0] * 1.5; out[1] = glow[1] * 1.45; out[2] = glow[2] * 1.3; };
  for (const [x, y, z] of list) {
    level.world.add({ type: 'cyl', x, z, r: 0.16, y0: y, y1: y + 2.3, tag: 'leuchte' });
    if (!level.view) continue;
    addStatic(level, merge([
      cyl(0.2, 0.26, 0.24, x, y, z, 0xd8c8d4, 8),
      cyl(0.055, 0.07, 1.9, x, y + 0.24, z, 0xf4e8f0, 8),
      cyl(0.16, 0.1, 0.08, x, y + 2.1, z, 0xd8c8d4, 8),
      sphere(0.24, x, y + 2.38, z, 0xffe6a0, { ws: 10, hs: 7, fn: lampFn }),
      cone(0.3, 0.26, x, y + 2.56, z, 0xff8fbf, 10),
      sphere(0.05, x, y + 2.86, z, 0xff8fbf, { ws: 6, hs: 4 }),
    ]), { castShadow: true });
  }
}
