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
import { box, colorize, merge, lin, mixc, smooth, hex, addStatic, addObject } from '../../blocks/kit.js';

// ------------------------------------------------------------------ Daten-Helfer

/** Insel über ihre Grundfläche: x0..x1, zA..zB (Reihenfolge egal), Oberseite top, Höhe h. o: weitere Felder. */
export function isl(x0, x1, zA, zB, top, h = 4, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  return { type: 'island', pos: [(x0 + x1) / 2, top - h, (z0 + z1) / 2], size: [x1 - x0, h, z0 - z1], ...o };
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
    const g = new THREE.SphereGeometry(r * S, 9, 6).toNonIndexed();
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
