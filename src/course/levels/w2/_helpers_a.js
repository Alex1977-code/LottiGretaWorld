// Hilfen für die Level-Daten 2-1 und 2-2 (kein Level: exportiert kein LEVEL, die Level-Registry überspringt dieses
// Modul). Alles liefert reine Daten im Format von docs/KURS-ARCHITEKTUR.md – bis auf die kleinen Szenen-Hilfen am
// Ende (level-lokaler Code, der über eine Aktion aufgerufen wird).

import * as THREE from 'three';
import { modelObject } from '../../blocks/w2kit.js';
import { getBlockType } from '../../blocks/index.js';
import { hex, lin, mixc, colorize, merge } from '../../blocks/kit.js';
import { Build } from '../../models/lib/kit.js';
import { kaktusGeo } from '../../models/lib/w2Geos.js';

/**
 * Insel über ihre Grundfläche: x0..x1, zA..zB (Reihenfolge egal), Oberseite top, Höhe h (Unterkante top − h).
 * o: weitere Felder des Bausteins (top: 'stone'|'sand'|'none', under, color …).
 */
export function isl(x0, x1, zA, zB, top, h = 3, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  return { type: 'island', pos: [(x0 + x1) / 2, top - h, (z0 + z1) / 2], size: [x1 - x0, h, z0 - z1], under: 0, ...o };
}

/** Münzen in einer Reihe (Loader-Format). */
export const line = (from, to, n) => ({ kind: 'coins', from, to, n });

/** Münzring um pos. */
export const ring = (pos, r, n) => ({ kind: 'coins', pos, r, n });

/** Münzbogen von a nach b (Fußpunkte) mit Scheitel h über der Verbindungslinie – zeigt einen Sprung an. */
export function arc(a, b, n, h = 2) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    out.push({ kind: 'coin', pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * h * t * (1 - t), a[2] + (b[2] - a[2]) * t] });
  }
  return out;
}

/** Senkrechte Münzsäule. */
export function column(x, z, y0, y1, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ kind: 'coin', pos: [x, y0 + ((y1 - y0) * i) / Math.max(1, n - 1), z] });
  return out;
}

/** Ring aus 8 Blöcken (3 × 3 ohne Mitte) um (x, y, z); contents: { 'dx,dz': Inhalt } (dx, dz ∈ −1 … 1). */
export function blockRing(kind, x, y, z, contents = {}) {
  const out = [];
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const c = contents[`${dx},${dz}`];
      out.push({ kind, pos: [x + dx, y, z + dz], ...(c !== undefined ? { content: c } : {}) });
    }
  }
  return out;
}

// ------------------------------------------------------------------ level-lokale Szenen (Code)

/**
 * Geometrie für view.addStatic vorbereiten (wie der StaticBatcher): nicht indiziert, nur position/normal/color.
 */
function staticReady(g) {
  if (g.index) g = g.toNonIndexed();
  for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'color') g.deleteAttribute(name);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.color) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
  return g;
}

/** Fertige Geometrien (Weltkoordinaten) als eigene Meshes ohne Sonnenschatten zeigen – je Material ein Mesh. */
function shadowlessMeshes(level, list) {
  const byMat = new Map();
  for (const [g, o] of list) {
    const m = o?.material ?? 'world';
    if (!byMat.has(m)) byMat.set(m, []);
    byMat.get(m).push(staticReady(g));
  }
  for (const [m, parts] of byMat) {
    const geo = merge(parts);
    if (!geo) continue;
    const mesh = new THREE.Mesh(geo, level.view.mats?.[m] ?? level.view.mats?.world);
    mesh.castShadow = false; mesh.receiveShadow = m !== 'glow';
    mesh.matrixAutoUpdate = false; mesh.updateMatrix();
    mesh.name = `kulisse:${m}`;
    mesh.userData.owned = true;
    level.view.add(mesh);
  }
}

/**
 * Ferne Kulisse ohne Sonnenschatten: baut die Bausteine segs (Level-Format, z. B. deco_w2 mit Felstürmen und Dünen tief
 * unten) und zeigt ihre statische Geometrie als eigene Meshes, die keinen Schatten werfen (nicht im Schattenpass, je
 * Baustein ein Mesh). Für LEVEL.setup gedacht (dann ist die übrige statische Geometrie schon verschmolzen); die
 * Bausteine dürfen keine Kollision anlegen (deco_w2 ohne solid).
 */
export function shadowless(level, segs) {
  const v = level.view;
  if (!v) return;
  const orig = v.addStatic;
  for (const seg of segs) {
    const got = [];
    v.addStatic = (g, o) => { if (g) got.push([g, o]); };
    try { getBlockType(seg.type)?.(level, seg); } finally { v.addStatic = orig; }
    shadowlessMeshes(level, got);
  }
}

/**
 * Fernsicht: Gegner-Modelle der Arten kinds, die weiter als dist m (waagerecht) von der Figur entfernt sind, werden
 * nicht gezeichnet (im Dunst ohnehin winzig; spart Dreiecke und Zeichenaufrufe auf langen Sichtachsen). Nur
 * Darstellung – die Gegner laufen weiter.
 */
export function farHide(level, kinds, dist = 50) {
  if (!level.view) return;
  const set = new Set(kinds);
  const hidden = new Set();
  level.view.onFrame(() => {
    const p = level.player;
    if (!p) return;
    for (const e of level.entities) {
      if (!set.has(e.kind) || !e.model?.root) continue;
      const far = !e.removed && Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) > dist;
      if (far) { if (e.model.root.visible) { e.model.root.visible = false; hidden.add(e); } }
      else if (hidden.has(e)) { e.model.root.visible = true; hidden.delete(e); }
    }
  });
}

/**
 * Hilfsfigur mit Modell (z. B. Krümel): steht an pos, Blick yaw, Zustand über state() (je Bild). Liefert das Modell.
 * Nur Darstellung, keine Kollision.
 */
export function figure(level, name, pos, yaw, state, opts = {}) {
  return modelObject(level, name, opts, pos[0], pos[1], pos[2], yaw, state);
}

// ------------------------------------------------------------------ kleine Kulissen-Tiere (Wüste)

/** Einfarbige Kugel/Ellipsoid (Mitte x, y, z; Halbachsen rx, ry, rz) mit Licht von oben, Weltkoordinaten lokal. */
function blob(rx, ry, rz, x, y, z, color, seg = 10) {
  const g = new THREE.SphereGeometry(1, seg, Math.max(5, Math.round(seg * 0.6)));
  g.scale(rx, ry, rz); g.translate(x, y, z);
  const c = lin(hex(color)), dk = [c[0] * 0.72, c[1] * 0.72, c[2] * 0.72], lt = [Math.min(1, c[0] * 1.15), Math.min(1, c[1] * 1.15), Math.min(1, c[2] * 1.15)];
  return colorize(g.toNonIndexed(), (p, n, o) => (n.y >= 0 ? mixc(c, lt, n.y, o) : mixc(c, dk, -n.y, o)));
}
/** Schräger Zylinder (Stab) von a nach b (lokal), Radius r0 → r1. */
function stick(a, b, r0, r1, color, seg = 7) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz);
  const g = new THREE.CylinderGeometry(r1, r0, L, seg, 1);
  g.translate(0, L / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / L, dy / L, dz / L));
  g.applyQuaternion(q); g.translate(a[0], a[1], a[2]);
  const c = lin(hex(color)), dk = [c[0] * 0.75, c[1] * 0.75, c[2] * 0.75];
  return colorize(g.toNonIndexed(), (p, n, o) => mixc(dk, c, 0.5 + n.y * 0.5, o));
}

/**
 * Dünenkamel (Kulisse, ohne Kollision): stehendes Wüstenkamel mit zwei Höckern und bunter Decke, Blick nach +X.
 * Zwei Teile (Körper, Kopf/Hals nickt beim Kauen) – 2 Zeichenaufrufe, kein Sonnenschatten (Blob am Boden).
 * opts: scale (1), yaw, color, blanket [Farbe1, Farbe2], phase.
 */
export function camel(level, pos, opts = {}) {
  if (!level.view) return null;
  const C = opts.color ?? 0xd8a25e, D = 0xb07a3e, L = 0xf0c888;
  const [b1, b2] = opts.blanket ?? [0xe0443a, 0x2fb8b0];
  const body = [
    blob(0.78, 0.4, 0.38, 0, 1.38, 0, C, 12),
    blob(0.3, 0.3, 0.28, -0.3, 1.72, 0, L, 10), blob(0.28, 0.3, 0.26, 0.26, 1.7, 0, L, 10),
    blob(0.55, 0.12, 0.42, -0.02, 1.62, 0, b1, 10), blob(0.5, 0.08, 0.44, -0.02, 1.55, 0, b2, 10),
    stick([0.55, 1.15, 0.2], [0.58, 0, 0.22], 0.1, 0.07, D), stick([0.55, 1.15, -0.2], [0.5, 0, -0.22], 0.1, 0.07, D),
    stick([-0.5, 1.15, 0.2], [-0.56, 0, 0.22], 0.1, 0.07, D), stick([-0.5, 1.15, -0.2], [-0.46, 0, -0.22], 0.1, 0.07, D),
    blob(0.09, 0.05, 0.09, 0.58, 0.04, 0.22, 0x7a5028, 6), blob(0.09, 0.05, 0.09, 0.5, 0.04, -0.22, 0x7a5028, 6),
    blob(0.09, 0.05, 0.09, -0.56, 0.04, 0.22, 0x7a5028, 6), blob(0.09, 0.05, 0.09, -0.46, 0.04, -0.22, 0x7a5028, 6),
    stick([-0.76, 1.42, 0], [-0.92, 0.95, 0], 0.04, 0.03, D, 5), blob(0.05, 0.1, 0.05, -0.93, 0.92, 0, 0x6a4020, 5),
  ];
  const head = [
    stick([0, 0, 0], [0.32, 0.55, 0], 0.13, 0.1, C),
    blob(0.24, 0.15, 0.15, 0.42, 0.62, 0, C, 10), blob(0.13, 0.11, 0.12, 0.62, 0.57, 0, L, 8),
    blob(0.04, 0.05, 0.04, 0.47, 0.72, 0.12, 0x2a1a10, 5), blob(0.04, 0.05, 0.04, 0.47, 0.72, -0.12, 0x2a1a10, 5),
    blob(0.04, 0.07, 0.03, 0.32, 0.78, 0.1, D, 5), blob(0.04, 0.07, 0.03, 0.32, 0.78, -0.1, D, 5),
  ];
  const mat = level.view.mats?.world ?? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
  const root = new THREE.Group();
  const mb = new THREE.Mesh(merge(body), mat);
  const hg = new THREE.Group(); hg.position.set(0.62, 1.42, 0);
  hg.add(new THREE.Mesh(merge(head), mat));
  root.add(mb, hg);
  const s = opts.scale ?? 1;
  root.scale.setScalar(s);
  root.position.set(pos[0], pos[1], pos[2]);
  root.rotation.y = opts.yaw ?? 0;
  root.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; o.userData.owned = true; } });
  let t = opts.phase ?? 0;
  level.view.add(root, (dt) => {
    t += Math.min(dt, 0.1);
    // kauen und nicken, ab und zu den Kopf heben
    const look = Math.max(0, Math.sin(t * 0.35)) ** 6;
    hg.rotation.z = -0.15 + Math.sin(t * 2.4) * 0.04 + look * 0.35;
    hg.rotation.y = Math.sin(t * 0.5) * 0.25 * look;
    mb.position.y = Math.sin(t * 1.2) * 0.01;
  });
  level.view.shadows?.add({ pos: { x: pos[0], y: pos[1], z: pos[2] }, radius: 0.9 * s, alive: () => true, visible: () => true });
  return root;
}

/**
 * Steppenläufer: ein Knäuel aus trockenen Zweigen rollt im Wind über die Fläche (path: [[x, y, z], [x, y, z]]
 * Bodenpunkte), springt dabei leicht und beginnt nach pause s von vorn. 1 Zeichenaufruf, nur Darstellung.
 */
export function tumbleweed(level, from, to, opts = {}) {
  if (!level.view) return null;
  const parts = [];
  const col = [0xb88a4a, 0xa0763c, 0xc89c58];
  for (let i = 0; i < 7; i++) {
    const g = new THREE.TorusGeometry(0.36 - i * 0.02, 0.022, 4, 14);
    g.rotateX(i * 0.9); g.rotateY(i * 1.37); g.rotateZ(i * 0.53);
    const c = lin(col[i % 3]);
    parts.push(colorize(g.toNonIndexed(), (p, n, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }));
  }
  const mesh = new THREE.Mesh(merge(parts), level.view.mats?.world ?? new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.castShadow = false; mesh.userData.owned = true;
  const speed = opts.speed ?? 3.2, pause = opts.pause ?? 4, L = Math.hypot(to[0] - from[0], to[2] - from[2]);
  let t = opts.phase ?? 0;
  const pos = { x: from[0], y: from[1], z: from[2] };
  level.view.add(mesh, (dt) => {
    t += Math.min(dt, 0.1);
    const cycle = L / speed + pause, u = (t % cycle) * speed;
    const k = Math.min(1, u / L);
    pos.x = from[0] + (to[0] - from[0]) * k; pos.z = from[2] + (to[2] - from[2]) * k;
    const hop = Math.abs(Math.sin(u * 1.3)) * 0.35 * (k < 1 ? 1 : 0);
    pos.y = from[1] + (to[1] - from[1]) * k + 0.36 + hop;
    mesh.position.set(pos.x, pos.y, pos.z);
    mesh.rotation.z = -u / 0.36;
    mesh.rotation.y = Math.atan2(-(to[2] - from[2]), to[0] - from[0]);
    mesh.visible = k < 1;
  });
  level.view.shadows?.add({ pos, radius: 0.3, alive: () => true, visible: () => mesh.visible });
  return mesh;
}

// ------------------------------------------------------------------ Weltraum-Kulisse

/**
 * Fernrohr auf Dreibein (Kulisse, ohne Kollision): blickt in Richtung yaw schräg nach oben zu den Planeten und
 * schwenkt langsam hin und her. 1 Zeichenaufruf (+ Blob-Schatten).
 */
export function telescope(level, pos, yaw = 0) {
  if (!level.view) return null;
  const legs = [
    stick([0, 1.15, 0], [0.42, 0, 0.24], 0.04, 0.03, 0x8a5a2a, 5), stick([0, 1.15, 0], [-0.42, 0, 0.24], 0.04, 0.03, 0x8a5a2a, 5),
    stick([0, 1.15, 0], [0, 0, -0.48], 0.04, 0.03, 0x8a5a2a, 5), blob(0.09, 0.07, 0.09, 0, 1.18, 0, 0xd8b04a, 8),
  ];
  const tube = [
    stick([-0.55, 0, 0], [0.75, 0, 0], 0.11, 0.15, 0x3a5ad8, 10), stick([0.72, 0, 0], [0.86, 0, 0], 0.17, 0.17, 0xffc21a, 10),
    stick([-0.7, 0, 0], [-0.55, 0, 0], 0.06, 0.06, 0x2a2a3a, 6), stick([-0.1, 0, 0], [0.2, 0, 0], 0.125, 0.135, 0xffc21a, 10),
    stick([0.05, 0.12, 0], [0.4, 0.26, 0], 0.035, 0.035, 0x6a7ad8, 6),
  ];
  const mat = level.view.mats?.world ?? new THREE.MeshStandardMaterial({ vertexColors: true });
  const root = new THREE.Group();
  root.add(new THREE.Mesh(merge(legs), mat));
  const head = new THREE.Group(); head.position.y = 1.2;
  const tm = new THREE.Mesh(merge(tube), mat); tm.rotation.z = 0.55;
  head.add(tm); root.add(head);
  root.position.set(pos[0], pos[1], pos[2]); root.rotation.y = yaw;
  root.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.userData.owned = true; } });
  let t = 0;
  level.view.add(root, (dt) => { t += Math.min(dt, 0.1); head.rotation.y = Math.sin(t * 0.3) * 0.35; tm.rotation.z = 0.5 + Math.sin(t * 0.21) * 0.08; });
  level.view.shadows?.add({ pos: { x: pos[0], y: pos[1], z: pos[2] }, radius: 0.5, alive: () => true, visible: () => true });
  return root;
}

/**
 * Sternschnuppen: alle paar Sekunden zieht ein leuchtender Schweif durch den Himmel über dem Bereich (center ± size).
 * Ein Objekt (1 Zeichenaufruf), additiv, ohne Schatten.
 */
export function shootingStars(level, center, size = [80, 30, 120], opts = {}) {
  if (!level.view) return null;
  const n = opts.n ?? 3;
  const pos = new Float32Array(n * 6 * 3), col = new Float32Array(n * 6 * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false; mesh.userData.owned = true; mesh.renderOrder = 1;
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const st = [];
  for (let i = 0; i < n; i++) st.push({ t: -i * 2.3 - 1, dur: 1.2, a: [0, 0, 0], d: [0, 0, 0] });
  const spawn = (s) => {
    s.a = [center[0] + (rnd() - 0.5) * size[0], center[1] + size[1] * 0.5 + rnd() * size[1] * 0.5, center[2] + (rnd() - 0.5) * size[2]];
    const ang = rnd() * Math.PI * 2;
    s.d = [Math.cos(ang) * 34, -10 - rnd() * 8, Math.sin(ang) * 12];
    s.t = 0; s.dur = 0.9 + rnd() * 0.6;
  };
  level.view.add(mesh, (dt) => {
    dt = Math.min(dt, 0.1);
    const cam = level.view.camera;
    for (let i = 0; i < n; i++) {
      const s = st[i];
      s.t += dt;
      if (s.t > s.dur + 2.5 + i) spawn(s);
      const k = Math.max(0, Math.min(1, s.t / s.dur));
      const on = s.t >= 0 && s.t <= s.dur;
      const head = [s.a[0] + s.d[0] * k, s.a[1] + s.d[1] * k, s.a[2] + s.d[2] * k];
      const tl = 0.28, tail = [head[0] - s.d[0] * tl, head[1] - s.d[1] * tl, head[2] - s.d[2] * tl];
      // Band quer zur Blickrichtung
      const vx = head[0] - tail[0], vy = head[1] - tail[1], vz = head[2] - tail[2];
      const cx = head[0] - cam.position.x, cy = head[1] - cam.position.y, cz = head[2] - cam.position.z;
      let px = vy * cz - vz * cy, py = vz * cx - vx * cz, pz = vx * cy - vy * cx;
      const pl = Math.hypot(px, py, pz) || 1, w = 0.35;
      px = (px / pl) * w; py = (py / pl) * w; pz = (pz / pl) * w;
      const quad = [[head[0] + px, head[1] + py, head[2] + pz], [head[0] - px, head[1] - py, head[2] - pz], [tail[0], tail[1], tail[2]]];
      const fade = on ? Math.sin(k * Math.PI) : 0;
      const verts = [quad[0], quad[1], quad[2], quad[2], quad[1], quad[0]];
      for (let v = 0; v < 6; v++) {
        const o = (i * 6 + v) * 3;
        pos[o] = verts[v][0]; pos[o + 1] = verts[v][1]; pos[o + 2] = verts[v][2];
        const tip = v === 2 || v === 3 ? 0 : 1;
        col[o] = fade * (0.6 + 0.4 * tip); col[o + 1] = fade * (0.7 + 0.3 * tip); col[o + 2] = fade;
      }
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
  });
  return mesh;
}

/**
 * Kleine Asteroiden (Kulisse): grob facettierte Brocken an den Punkten list ([[x, y, z, r], …]), statisch verschmolzen
 * ohne Sonnenschatten (1 Mesh; in LEVEL.setup aufrufen).
 */
export function asteroids(level, list) {
  if (!level.view) return;
  const parts = [];
  let seed = 5;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const [x, y, z, r] of list) {
    const g = new THREE.IcosahedronGeometry(1, 1);   // Polyeder sind schon nicht indiziert
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const k = 0.8 + 0.35 * Math.sin(P.getX(i) * 3.1 + x) * Math.cos(P.getZ(i) * 2.7 + z);
      P.setXYZ(i, P.getX(i) * k * r, P.getY(i) * k * r * 0.8, P.getZ(i) * k * r);
    }
    g.rotateY(rnd() * 6); g.rotateX(rnd() * 2);
    g.computeVertexNormals();
    g.translate(x, y, z);
    const a = lin(0x9a86c8), b = lin(0x5a4a88), c = lin(0xd8c8ff);
    parts.push(colorize(g, (p, n, o) => (n.y > 0.5 ? mixc(a, c, (n.y - 0.5) * 2, o) : mixc(b, a, (n.y + 1) / 1.5, o))));
  }
  shadowlessMeshes(level, [[merge(parts), { material: 'world' }]]);
}

/**
 * Sprechblase über einem Punkt (Sprite mit Leinwand-Text), blendet nach life s aus. Liefert das Sprite.
 */
export function bubble(level, pos, text, sub = '', life = 4) {
  if (!level.view) return null;
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  const r = 46;
  g.fillStyle = '#ffffff'; g.strokeStyle = '#6a3a1a'; g.lineWidth = 10;
  g.beginPath();
  g.moveTo(30 + r, 20); g.lineTo(482 - r, 20); g.quadraticCurveTo(482, 20, 482, 20 + r); g.lineTo(482, 180 - r);
  g.quadraticCurveTo(482, 180, 482 - r, 180); g.lineTo(290, 180); g.lineTo(240, 238); g.lineTo(236, 180); g.lineTo(30 + r, 180);
  g.quadraticCurveTo(30, 180, 30, 180 - r); g.lineTo(30, 20 + r); g.quadraticCurveTo(30, 20, 30 + r, 20); g.closePath();
  g.fill(); g.stroke();
  g.fillStyle = '#6a3a1a'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'bold 60px "Nunito", "Arial Rounded MT Bold", Arial, sans-serif';
  g.fillText(text, 256, sub ? 82 : 100);
  if (sub) { g.font = 'bold 34px "Nunito", "Arial Rounded MT Bold", Arial, sans-serif'; g.fillStyle = '#d0702a'; g.fillText(sub, 256, 142); }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  sp.scale.set(2.6, 1.3, 1);
  sp.position.set(pos[0], pos[1], pos[2]);
  sp.renderOrder = 5;
  sp.userData.owned = true;
  let t = 0;
  level.view.add(sp, (dt) => {
    t += Math.min(dt, 0.1);
    const k = Math.min(1, t / 0.2);
    sp.scale.set(2.6 * k, 1.3 * k, 1);
    sp.material.opacity = t > life ? Math.max(0, 1 - (t - life) / 0.6) : 1;
    sp.visible = sp.material.opacity > 0.01;
  });
  return sp;
}

// ================================================================== Wüstenzier (2-1): Level-Haken, nur Optik
//
// Liebevolle Details für die Tafelberg-Plateaus der Rieselschlucht, ohne das Spiel zu verändern: keine neue Kollision
// (die Kakteen behalten über `cacti` genau ihre bisherigen Formen), alles wird in LEVEL.setup nach dem Verschmelzen
// gebaut und an die vorhandenen Abschnitts-Meshes gehängt.
//   islandBoxes     Quader der Plateaus/Felswände aus den Level-Segmenten (+ Zusatzquader: Treibsand, Oase, Wand)
//   desertTops      Sanddecken neu einfärben (weiche Flecken, Windstreifen, dunkler Wandfuß, nasser Oasenrand mit
//                   Grasflecken) – nur die Vertexfarben der vorhandenen Raster, 0 Dreiecke mehr
//   strataParts     Sandstein-Schichten in drei Rottönen (Welt-Höhen, gewellt, über die Schlucht hinweg gleich) auf den
//                   sichtbaren Seitenflächen; meldet die Wandfüße (für Geröll und Grasbüschel)
//   rubbleParts     Geröll und Kiesel an den Wandfüßen;  tuftParts  trockene Grasbüschel
//   rippleParts     Windrippel (heller Kamm, dunkle Mulde) als flache Streifen
//   trackParts      Tierspuren (Hackvogel, Kamel, Echse);  seamParts  Fugen-Abdeckungen (Oase)
//   Requisiten      jar, bone, shell, cloth, signpost, stall, parasol, pennant, flagstones, shoreStones, reeds …
//   cacti           Kakteen mit wenig Dreiecken (Kollision wie deco_w2)
//   lizard          Echse an einer Wand (Liegestütze, Kopfdrehen, kurzer Sprint) – ein Zeichenaufruf in der Nähe
//   bakeDeco        Teile an die Abschnitts-Meshes hängen (mit Schattenwurf, 0 Zeichenaufrufe mehr) bzw. flache Zier
//                   als schattenlose Stücke je 64 m (ein Aufruf je sichtbarem Stück, nicht im Schattenpass)
//   cullStatic      je Bild: statische Meshes per Quader gegen Kamera- und Schatten-Sichtkörper prüfen (Fern-
//                   Ausblendung; die 32-m-Abschnitte reichen mit ihren Begrenzungskugeln sonst weit in den Schattenpass)

const C = (c) => lin(hex(c));
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const sstep = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const fract = (v) => v - Math.floor(v);
const hash1 = (x) => fract(Math.sin(x * 91.7 + 13.1) * 43758.5453);
const hash2 = (x, z) => fract(Math.sin(x * 127.1 + z * 311.7) * 43758.5453);
/** Kleiner deterministischer Zufall. */
function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  const f = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.real = (a, b) => a + (b - a) * f();
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  return f;
}

/** Dreiecks-Sammler (Weltkoordinaten, nicht indiziert, position/normal/color). */
class Tris {
  constructor() { this.p = []; this.n = []; this.c = []; }
  v(x, y, z, nx, ny, nz, c) { this.p.push(x, y, z); this.n.push(nx, ny, nz); this.c.push(c[0], c[1], c[2]); }
  /** Flaches Dreieck (Normale nach oben, Umlauf wird passend gedreht). */
  flat(ax, az, bx, bz, cx, cz, y, ca, cb = ca, cc = ca) {
    if ((bz - az) * (cx - ax) - (bx - ax) * (cz - az) > 0) { this.v(ax, y, az, 0, 1, 0, ca); this.v(bx, y, bz, 0, 1, 0, cb); this.v(cx, y, cz, 0, 1, 0, cc); }
    else { this.v(ax, y, az, 0, 1, 0, ca); this.v(cx, y, cz, 0, 1, 0, cc); this.v(bx, y, bz, 0, 1, 0, cb); }
  }
  geometry() {
    if (!this.p.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    return g;
  }
}

// ------------------------------------------------------------------ Quader und Sandfarben

/**
 * Quader der Inseln (Baustein island) aus den Segmenten: { x0, x1, z0, z1, y0, y1, top, faces, tops } (z0 < z1).
 * extra: weitere Quader im selben Format (z. B. Treibsand, Oase, Kletterwand) – Standard faces/tops: false (nur Nachbarn).
 */
export function islandBoxes(segments, extra = []) {
  const out = [];
  for (const s of segments) {
    if (s.type !== 'island') continue;
    const [px, py, pz] = s.pos, [w, h, d] = s.size;
    const top = s.top ?? 'grass';
    out.push({ x0: px - w / 2, x1: px + w / 2, z0: pz - d / 2, z1: pz + d / 2, y0: py, y1: py + h, top, faces: top !== 'stone', tops: top === 'grass' || top === 'sand' });
  }
  for (const e of extra) out.push({ faces: false, tops: false, ...e });
  return out;
}

const SAND = { light: C(0xfadfa2), mid: C(0xefc37c), shade: C(0xd79a58), streak: C(0xfeebc0), wet: C(0xc39352), grass: C(0xa6b24e) };
const rectDist = (x, z, r) => Math.hypot(Math.max(r.x0 - x, 0, x - r.x1), Math.max(r.z0 - z, 0, z - r.z1));

/** Abstand zur nächsten Wand, die über die Höhe top aufragt (für den dunklen Wandfuß). */
function wallDist(x, z, top, boxes, max = 2) {
  let d = max;
  for (const B of boxes) {
    if (B.y1 < top + 0.45 || B.y0 > top + 0.2 || B.soft) continue;
    if (x < B.x0 - max || x > B.x1 + max || z < B.z0 - max || z > B.z1 + max) continue;
    d = Math.min(d, rectDist(x, z, B));
  }
  return d;
}

/** Sandfarbe an (x, z) einer Decke in Höhe top (lineare Farbe in out). ctx: { boxes, pools: [{ x0, x1, z0, z1, y }] }. */
export function sandAt(x, z, top, ctx, out = [0, 0, 0]) {
  const n = 0.5 + 0.34 * Math.sin(x * 0.37 + z * 0.21 + 1.3) * Math.sin(z * 0.29 - x * 0.17 + 0.6) + 0.2 * Math.sin(x * 0.83 + z * 0.61 + 2.1);
  mixc(SAND.light, SAND.mid, clamp01(n), out);
  // lange Windstreifen (hell), quer zur Schlucht leicht gebogen
  const s = Math.sin((x * 0.3 + z * 0.92) * 0.85 + Math.sin(x * 0.23 + 1) * 1.4);
  if (s > 0.55) mixc(out, SAND.streak, (s - 0.55) * 0.8, out);
  // Wandfuß: Schatten und roter Geröllstaub
  const dw = wallDist(x, z, top, ctx.boxes, 1.8);
  if (dw < 1.8) mixc(out, SAND.shade, (1 - sstep(0, 1.8, dw)) * 0.5, out);
  // Oase: Grasflecken und nasser Sand am Wasser
  for (const p of ctx.pools ?? []) {
    if (Math.abs(top - p.y) > 0.3) continue;
    const d = rectDist(x, z, p);
    if (d > 3.6) continue;
    const patch = clamp01(0.45 + 0.6 * Math.sin(x * 1.3 + z * 0.9) * Math.sin(z * 1.1 - x * 0.4 + 0.5));
    mixc(out, SAND.grass, (1 - sstep(1.0, 3.4, d)) * patch * 0.6, out);
    mixc(out, SAND.wet, (1 - sstep(0.1, 1.4, d)) * 0.85, out);
  }
  return out;
}

/**
 * Sanddecken der Plateaus neu einfärben (Vertexfarben der vorhandenen 1-m-Raster in den Abschnitts-Meshes): Quader mit
 * tops: true; je Rasterzelle bleibt ein Hauch Kachel-Schimmer. Vor bakeDeco aufrufen (nur ursprüngliche Geometrie).
 */
export function desertTops(level, ctx) {
  const v = level.view;
  if (!v) return 0;
  const rects = ctx.boxes.filter((b) => b.tops);
  const out = [0, 0, 0];
  let n = 0;
  for (const m of v.static.meshes) {
    const g = m.geometry, P = g.attributes.position?.array, N = g.attributes.normal?.array, Col = g.attributes.color?.array;
    if (!P || !N || !Col) continue;
    let touched = false;
    for (let i = 0; i < P.length; i += 9) {
      if (N[i + 1] < 0.999 || N[i + 4] < 0.999 || N[i + 7] < 0.999) continue;
      const y = P[i + 1];
      if (Math.abs(P[i + 4] - y) > 1e-4 || Math.abs(P[i + 7] - y) > 1e-4) continue;
      const cx = (P[i] + P[i + 3] + P[i + 6]) / 3, cz = (P[i + 2] + P[i + 5] + P[i + 8]) / 3;
      let r = null;
      for (const q of rects) if (Math.abs(y - q.y1 - 0.004) < 0.002 && cx > q.x0 - 0.3 && cx < q.x1 + 0.3 && cz > q.z0 - 0.3 && cz < q.z1 + 0.3) { r = q; break; }
      if (!r) continue;
      const tile = 0.975 + 0.05 * hash2(Math.floor(cx), Math.floor(cz));
      touched = true; n++;
      for (let k = 0; k < 9; k += 3) {
        sandAt(P[i + k], P[i + k + 2], r.y1, ctx, out);
        Col[i + k] = out[0] * tile; Col[i + k + 1] = out[1] * tile; Col[i + k + 2] = out[2] * tile;
      }
    }
    // Sandhügel (Baustein mound): Kuppel in den Sandfarben, oben vom Wind heller
    for (const h of ctx.mounds ?? []) {
      for (let i = 0; i < P.length; i += 3) {
        const x = P[i], y = P[i + 1], z = P[i + 2];
        const d = Math.hypot(x - h.x, z - h.z);
        if (d > h.r + 0.05 || y < h.y - 0.01 || y > h.y + h.h + 0.05 || N[i + 1] < 0.2) continue;
        sandAt(x, z, h.y, ctx, out);
        const k = 0.97 + 0.12 * clamp01((y - h.y) / h.h);
        Col[i] = Math.min(1, out[0] * k); Col[i + 1] = Math.min(1, out[1] * k); Col[i + 2] = Math.min(1, out[2] * k);
        touched = true;
      }
    }
    if (touched) g.attributes.color.needsUpdate = true;
  }
  return n;
}

// ------------------------------------------------------------------ Sandstein-Schichten an den Seitenflächen

// Schichtfolge (Dicke m, Farbe) – wiederholt sich alle ≈ 6,2 m; Grenzen in Welt-Höhe, damit die Schichten über die
// ganze Schlucht durchlaufen.
const STRATA = [[0.9, 0xeaa060], [0.3, 0xf7d8a2], [1.1, 0xd06e3c], [0.55, 0xe48e50], [0.22, 0xa24c2c], [0.95, 0xc6643a], [0.5, 0xefb070], [1.05, 0xb85a32], [0.6, 0xdc844a]];
const STRATA_SUM = STRATA.reduce((a, s) => a + s[0], 0);
const STRATA_C = STRATA.map((s) => C(s[1]));
const STRATA_Y = [];
{ let y = 0; for (const s of STRATA) { STRATA_Y.push(y); y += s[0]; } }
const layerY = (K) => { const p = Math.floor(K / 9); return p * STRATA_SUM + STRATA_Y[K - p * 9]; };
const layerWob = (K, s) => 0.09 * Math.sin(s * 0.55 + K * 2.1) + 0.05 * Math.sin(s * 1.7 + K * 0.7);
const BODY = [C(0xd9864a), C(0xa8562c)];

/** Farbe einer Schicht K in Höhe y (info: top, depth, floor, lo, bodyH, capH). */
function strataColor(K, y, info, out) {
  const c = STRATA_C[((K % 9) + 9) % 9], k0 = 0.94 + 0.1 * hash1(K);
  out[0] = c[0] * k0; out[1] = c[1] * k0; out[2] = c[2] * k0;
  const d = info.top - y;
  let k = 1 - 0.28 * sstep(0.6, info.depth, d);
  if (info.floor) k *= 0.72 + 0.28 * sstep(info.lo, info.lo + 0.55, y);
  out[0] *= k; out[1] *= k; out[2] *= k;
  if (!info.floor) {
    // zum unteren Rand hin in die Körperfarbe des Bausteins übergehen
    const f = sstep(info.depth - 2.5, info.depth, d);
    if (f > 0) {
      const db = Math.max(0, d - info.capH);
      const b = mixc(BODY[0], BODY[1], sstep(0, Math.max(2.5, info.bodyH), db) * 0.75, [0, 0, 0]);
      mixc(out, b, f, out);
    }
  }
  return out;
}

/** Schicht-Bänder zwischen zwei senkrechten Linien A, B ({ x, z, nx, nz, s }) von lo bis hi. */
function strataColumn(acc, A, B, lo, hi, info) {
  const flip = (-(B.z - A.z)) * A.nx + (B.x - A.x) * A.nz < 0;
  const ca = [0, 0, 0], cb = [0, 0, 0], cc = [0, 0, 0], cd = [0, 0, 0];
  const quad = (K, a0, a1, b0, b1) => {
    strataColor(K, a0, info, ca); strataColor(K, b0, info, cb); strataColor(K, b1, info, cc); strataColor(K, a1, info, cd);
    const P = [[A, a0, ca], [B, b0, cb], [B, b1, cc], [A, a1, cd]];
    const tri = (i, j, k) => { for (const q of flip ? [P[i], P[k], P[j]] : [P[i], P[j], P[k]]) acc.v(q[0].x, q[1], q[0].z, q[0].nx, 0, q[0].nz, q[2]); };
    tri(0, 1, 2); tri(0, 2, 3);
  };
  const K0 = Math.floor((lo - 0.5) / STRATA_SUM) * 9 - 1, K1 = Math.ceil((hi + 0.5) / STRATA_SUM) * 9 + 1;
  const split = info.floor ? lo + 0.55 : null;
  for (let K = K0; K < K1; K++) {
    const a0 = Math.min(hi, Math.max(lo, layerY(K) + layerWob(K, A.s))), b0 = Math.min(hi, Math.max(lo, layerY(K) + layerWob(K, B.s)));
    const a1 = Math.max(a0, Math.min(hi, layerY(K + 1) + layerWob(K + 1, A.s))), b1 = Math.max(b0, Math.min(hi, layerY(K + 1) + layerWob(K + 1, B.s)));
    if (a1 - a0 < 0.003 && b1 - b0 < 0.003) continue;
    if (split !== null && a0 < split - 0.02 && a1 > split + 0.02 && b0 < split - 0.02 && b1 > split + 0.02) { quad(K, a0, split, b0, split); quad(K, split, a1, split, b1); }
    else quad(K, a0, a1, b0, b1);
  }
}

/**
 * Sandstein-Schichten auf den Seitenflächen der Quader mit faces: true. Gezeichnet werden nur Flächen zur Kamera (+Z)
 * und zur Schluchtmitte (±X); verdeckt ist, was ein Nachbarquader abdeckt (Fläche erst über dessen Oberkante). Liefert
 * { parts, bases } – bases = Wandfüße [{ a: [x, z], b: [x, z], y, n: [nx, nz] }] für Geröll/Grasbüschel.
 * o: depth (Schichten bis so tief unter die Oberkante, 11), mid (Grenze der ±X-Flächen, 4)
 */
export function strataParts(boxes, o = {}) {
  const mid = o.mid ?? 12, off = 0.025, step = o.step ?? 2.5;
  const parts = [], bases = [];
  for (const B of boxes) {
    if (!B.faces) continue;
    // hohe Felswände/Säulen (Körper ≥ 20 m) tiefer schichten – man blickt an ihnen in die Schlucht hinab
    const depth = B.y1 - B.y0 >= 20 ? (o.deep ?? 16) : (o.depth ?? 11);
    const faces = ['pz'];
    if (B.x1 < mid) faces.push('px');
    if (B.x0 > -mid) faces.push('nx');
    for (const face of faces) {
      const acc = new Tris();
      const capH = Math.min(0.42, B.y1 - B.y0), r = Math.min(0.3, (B.x1 - B.x0) / 4, (B.z1 - B.z0) / 4);
      const isX = face !== 'pz', sgn = face === 'nx' ? -1 : 1;
      const c = isX ? (sgn > 0 ? B.x1 : B.x0) : B.z1;
      const sA = isX ? B.z0 : B.x0, sB = isX ? B.z1 : B.x1;
      const nx = isX ? sgn : 0, nz = isX ? 0 : 1;
      const probe = c + sgn * 0.05;
      const nearQ = (Q) => (isX ? Q.x0 <= probe && probe <= Q.x1 : Q.z0 <= probe && probe <= Q.z1);
      const covers = (Q, s) => nearQ(Q) && (isX ? Q.z0 <= s && s <= Q.z1 : Q.x0 <= s && s <= Q.x1);
      const nTop = (s) => { let t = -Infinity; for (const Q of boxes) if (Q !== B && Q.y0 < B.y1 - 0.05 && covers(Q, s)) t = Math.max(t, Q.y1); return t; };
      const hi = B.y1 - capH;
      const pts = new Set([sA + r, sB - r]);
      for (let s = sA + r + step; s < sB - r - 0.6; s += step) pts.add(s);
      for (const Q of boxes) {
        if (Q === B || !nearQ(Q)) continue;
        for (const e of isX ? [Q.z0, Q.z1] : [Q.x0, Q.x1]) if (e > sA + r && e < sB - r) pts.add(e);
      }
      const S = [...pts].sort((a, b) => a - b);
      const line = (s) => (isX ? { x: c + nx * off, z: s, nx, nz, s } : { x: s, z: c + nz * off, nx, nz, s });
      const cols = [];
      for (let i = 0; i < S.length - 1; i++) {
        const s0 = S[i], s1 = S[i + 1];
        if (s1 - s0 < 0.02) continue;
        const nt = nTop((s0 + s1) / 2);
        const lo = Math.max(B.y1 - depth, B.y0, nt);
        if (hi - lo < 0.12) continue;
        const floor = nt >= B.y1 - depth && nt > B.y0;
        const info = { top: B.y1, depth, floor, lo, bodyH: B.y1 - B.y0 - capH, capH };
        const A = line(s0), Bl = line(s1);
        strataColumn(acc, A, Bl, lo, hi, info);
        cols.push({ s0, s1, info });
        if (floor) bases.push({ a: [A.x - nx * off, A.z - nz * off], b: [Bl.x - nx * off, Bl.z - nz * off], y: nt, n: [nx, nz] });
      }
      // halbe Viertelrundung an beiden Enden (die Körper sind an den senkrechten Kanten mit r gerundet)
      if (r > 0.05) {
        for (const [end, col] of [[-1, cols[0]], [1, cols[cols.length - 1]]]) {
          if (!col || (end < 0 ? col.s0 > sA + r + 1e-6 : col.s1 < sB - r - 1e-6)) continue;
          const sE = end < 0 ? sA + r : sB - r;
          const cx = isX ? c - sgn * r : sE, cz = isX ? sE : c - r;
          const tx = isX ? 0 : end, tz = isX ? end : 0;
          let prev = null;
          for (let k = 0; k <= 2; k++) {
            const th = (k / 2) * (Math.PI / 4), co = Math.cos(th), si = Math.sin(th);
            const dx = nx * co + tx * si, dz = nz * co + tz * si;
            const L2 = { x: cx + dx * (r + off), z: cz + dz * (r + off), nx: dx, nz: dz, s: sE + end * r * th };
            if (prev) { if (end < 0) strataColumn(acc, L2, prev, col.info.lo, hi, col.info); else strataColumn(acc, prev, L2, col.info.lo, hi, col.info); }
            prev = L2;
          }
        }
      }
      const g = acc.geometry();
      if (g) parts.push(g);
    }
  }
  return { parts, bases };
}

// ------------------------------------------------------------------ Geröll, Grasbüschel, Rippel, Spuren, Fugen

const ROCK = [0xc8642e, 0xa94c26, 0xd8834a, 0x9c5e34, 0xe0b07a, 0xb87844].map(C);
/** Ein Stein (Ikosaeder/Oktaeder) in Weltkoordinaten. */
function rock(x, y, z, s, rnd, flat = 0.6, palette = ROCK) {
  const g = (s > 0.16 ? new THREE.IcosahedronGeometry(1, 0) : new THREE.OctahedronGeometry(1, 0));
  g.scale(s * rnd.real(0.8, 1.25), s * flat * rnd.real(0.8, 1.2), s * rnd.real(0.8, 1.25));
  g.rotateY(rnd.real(0, 6.28)); g.rotateX(rnd.real(-0.25, 0.25));
  g.translate(x, y + s * flat * 0.35, z);
  const base = rnd.pick(palette), dk = [base[0] * 0.62, base[1] * 0.62, base[2] * 0.62], lt = [Math.min(1, base[0] * 1.18), Math.min(1, base[1] * 1.18), Math.min(1, base[2] * 1.18)];
  return colorize(g, (p, n, o) => (n.y >= 0 ? mixc(base, lt, n.y, o) : mixc(base, dk, -n.y, o)));
}

const nearAny = (x, z, avoid) => (avoid ?? []).some((a) => Math.hypot(a[0] - x, a[1] - z) < (a[2] ?? 1));
const insideAny = (x, z, y, boxes) => boxes.some((B) => B.y1 > y + 0.1 && B.y0 < y + 0.1 && x > B.x0 - 0.05 && x < B.x1 + 0.05 && z > B.z0 - 0.05 && z < B.z1 + 0.05);

/** Geröll an den Wandfüßen (bases aus strataParts). o: every (m, 1.3), avoid [[x, z, r]], boxes, seed. */
export function rubbleParts(bases, o = {}) {
  const rnd = rng(o.seed ?? 7), parts = [];
  for (const b of bases) {
    const dx = b.b[0] - b.a[0], dz = b.b[1] - b.a[1], len = Math.hypot(dx, dz);
    const n = Math.floor(len / (o.every ?? 1.3) + rnd());
    for (let i = 0; i < n; i++) {
      const t = (i + rnd.real(0.1, 0.9)) / Math.max(1, n);
      const k = rnd.real(0.1, 0.42);
      const x = b.a[0] + dx * t + b.n[0] * k, z = b.a[1] + dz * t + b.n[1] * k;
      if (nearAny(x, z, o.avoid) || (o.boxes && insideAny(x, z, b.y, o.boxes))) continue;
      const big = rnd() < 0.35;
      parts.push(rock(x, b.y, z, big ? rnd.real(0.17, 0.3) : rnd.real(0.07, 0.14), rnd));
      if (rnd() < 0.6) {
        const a = rnd.real(0, 6.28), d = rnd.real(0.2, 0.45);
        const x2 = x + Math.cos(a) * d + b.n[0] * 0.1, z2 = z + Math.sin(a) * d + b.n[1] * 0.1;
        if (!(o.boxes && insideAny(x2, z2, b.y, o.boxes))) parts.push(rock(x2, b.y, z2, rnd.real(0.05, 0.11), rnd));
      }
    }
  }
  return parts;
}

/** Einzelne Steine/Kiesel an Punkten [[x, y, z, Größe], …] (Farben wie das Geröll oder palette). */
export function stoneParts(list, seed = 13, palette = ROCK, flat = 0.6) {
  const rnd = rng(seed), pal = palette.map((c) => (typeof c === 'number' ? C(c) : c));
  return list.map(([x, y, z, s]) => rock(x, y, z, s, rnd, flat, pal));
}

/** Trockene Grasbüschel (je ≈ 14 Dreiecke, beidseitig) an den Punkten list [[x, y, z, Größe?], …]. */
export function tuftParts(list, seed = 3) {
  const rnd = rng(seed), acc = new Tris();
  const base = C(0x7d8a36), mid = C(0xb0b050), tip = C(0xeedc8c), base2 = C(0x5f9a3a);
  for (const [x, y, z, s = 1] of list) {
    const n = 6 + Math.floor(rnd() * 3), green = rnd() < 0.4;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + rnd.real(-0.3, 0.3), h = s * rnd.real(0.28, 0.5), lean = s * rnd.real(0.1, 0.24);
      const ca = Math.cos(a), sa = Math.sin(a), w = 0.035 * s;
      const bx = x + ca * 0.03, bz = z + sa * 0.03;
      const P0 = [bx - sa * w, y, bz + ca * w], P1 = [bx + sa * w, y, bz - ca * w], T = [x + ca * lean, y + h, z + sa * lean];
      const nrm = [ca * 0.45, 0.85, sa * 0.45];
      const cb = green ? base2 : base, ct = mixc(mid, tip, rnd(), [0, 0, 0]);
      for (const [p, cc] of [[P0, cb], [P1, cb], [T, ct]]) acc.v(p[0], p[1], p[2], nrm[0], nrm[1], nrm[2], cc);
      for (const [p, cc] of [[P0, cb], [T, ct], [P1, cb]]) acc.v(p[0], p[1], p[2], nrm[0], nrm[1], nrm[2], cc);
    }
  }
  const g = acc.geometry();
  return g ? [g] : [];
}

/** Grasbüschel-Punkte entlang der Wandfüße (etwa alle every m, abseits von avoid). */
export function tuftSpots(bases, o = {}) {
  const rnd = rng(o.seed ?? 11), out = [];
  for (const b of bases) {
    const dx = b.b[0] - b.a[0], dz = b.b[1] - b.a[1], len = Math.hypot(dx, dz);
    const n = Math.floor(len / (o.every ?? 5) + rnd() * 0.8);
    for (let i = 0; i < n; i++) {
      const t = rnd(), k = rnd.real(0.25, 0.7);
      const x = b.a[0] + dx * t + b.n[0] * k, z = b.a[1] + dz * t + b.n[1] * k;
      if (nearAny(x, z, o.avoid) || (o.boxes && insideAny(x, z, b.y, o.boxes))) continue;
      out.push([x, b.y, z, rnd.real(0.75, 1.15)]);
    }
  }
  return out;
}

/**
 * Windrippel: Felder aus leicht gewellten Linien quer zum Wind (wind = Richtung in x/z) – je Linie ein heller Kamm
 * und eine dunkle Mulde als flache Streifen (≈ 28 Dreiecke). fields: [[x, y, z, r?, n?], …]; ctx für die Sandfarbe;
 * Linien bleiben auf einer Decke (Rand 0,35 m) und nicht unter höheren Quadern.
 */
export function rippleParts(fields, ctx, o = {}) {
  const rnd = rng(o.seed ?? 5), acc = new Tris();
  const wind = o.wind ?? [0.3, -0.95], wl = Math.hypot(wind[0], wind[1]);
  const vx = wind[0] / wl, vz = wind[1] / wl, ux = -vz, uz = vx;
  const sc = [0, 0, 0], c1 = [0, 0, 0];
  const onTop = (x, z, y) => ctx.boxes.some((B) => B.tops && !B.noRipples && Math.abs(B.y1 - y) < 0.05 && x > B.x0 + 0.35 && x < B.x1 - 0.35 && z > B.z0 + 0.35 && z < B.z1 - 0.35)
    && !ctx.boxes.some((B) => B.y1 > y + 0.1 && B.y0 < y + 0.1 && x > B.x0 - 0.2 && x < B.x1 + 0.2 && z > B.z0 - 0.2 && z < B.z1 + 0.2);
  for (const [fx, fy, fz, R = 1.8, nl = 5] of fields) {
    const phase = rnd.real(0, 6.28);
    for (let j = 0; j < nl; j++) {
      const off = (j - (nl - 1) / 2) * 0.46 + rnd.real(-0.06, 0.06);
      const L = 2 * R * Math.sqrt(Math.max(0.15, 1 - (off / (R * 0.9)) ** 2)) * rnd.real(0.65, 1);
      const c0 = rnd.real(-0.4, 0.4);
      const K = 5, pts = [];
      for (let k = 0; k <= K; k++) {
        const t = (k / K - 0.5) * L + c0, wv = 0.13 * Math.sin(t * 1.5 + phase + j * 0.7);
        pts.push([fx + ux * t + vx * (off + wv), fz + uz * t + vz * (off + wv), (k / K) * 2 - 1]);
      }
      if (!pts.every((p) => onTop(p[0], p[1], fy))) continue;
      for (const [dv, w0, crest] of [[-0.04, 0.06, true], [0.055, 0.07, false]]) {
        const y = fy + (crest ? 0.014 : 0.011);
        for (let k = 0; k < K; k++) {
          const p = pts[k], q = pts[k + 1];
          const wp = w0 * Math.pow(Math.max(0, 1 - p[2] * p[2]), 0.6), wq = w0 * Math.pow(Math.max(0, 1 - q[2] * q[2]), 0.6);
          const pcx = p[0] + vx * dv, pcz = p[1] + vz * dv, qcx = q[0] + vx * dv, qcz = q[1] + vz * dv;
          sandAt((pcx + qcx) / 2, (pcz + qcz) / 2, fy, ctx, sc);
          const k1 = crest ? 1.09 : 0.84;
          c1[0] = Math.min(1, sc[0] * k1); c1[1] = Math.min(1, sc[1] * k1 * (crest ? 1 : 0.98)); c1[2] = Math.min(1, sc[2] * (crest ? 1.14 : 0.78));
          const a = [pcx - vx * wp, pcz - vz * wp], b = [pcx + vx * wp, pcz + vz * wp], cq = [qcx + vx * wq, qcz + vz * wq], d = [qcx - vx * wq, qcz - vz * wq];
          acc.flat(a[0], a[1], b[0], b[1], cq[0], cq[1], y, c1);
          acc.flat(a[0], a[1], cq[0], cq[1], d[0], d[1], y, c1);
        }
      }
    }
  }
  const g = acc.geometry();
  return g ? [g] : [];
}

/** Rippelfelder auf den Decken streuen (etwa ein Feld je per m²), abseits von avoid und Wänden. */
export function rippleFields(ctx, o = {}) {
  const rnd = rng(o.seed ?? 9), out = [];
  const per = o.per ?? 40;
  for (const B of ctx.boxes) {
    if (!B.tops || B.noRipples) continue;
    const w = B.x1 - B.x0, d = B.z1 - B.z0;
    if (w < 3 || d < 3) continue;
    const n = Math.round(((w * d) / per) * (B.y1 > 2.5 ? 0.6 : 1));
    for (let i = 0, tries = 0; i < n && tries < n * 12; tries++) {
      const x = rnd.real(B.x0 + 1, B.x1 - 1), z = rnd.real(B.z0 + 1, B.z1 - 1);
      if (nearAny(x, z, o.avoid) || wallDist(x, z, B.y1, ctx.boxes, 1.2) < 1.2) continue;
      if (out.some((f) => Math.hypot(f[0] - x, f[2] - z) < 3.4)) continue;
      out.push([x, B.y1, z, rnd.real(1.3, 2.1), 3 + Math.floor(rnd() * 3)]);
      i++;
    }
  }
  return out;
}

/**
 * Tierspuren (flach): list [{ kind: 'vogel'|'huf'|'echse', path: [[x, z], …], y, step?, scale? }]. Vogel: drei Zehen
 * und ein Sporn, Huf: zwei Ovale, Echse: kleine Tupfen und eine geschwungene Schwanzspur. Farbe = Sand, dunkler.
 */
export function trackParts(list, ctx) {
  const acc = new Tris(), sc = [0, 0, 0], dk = [0, 0, 0];
  const dot = (x, z, y, rx, rz, a, c, seg = 6) => {
    const ca = Math.cos(a), sa = Math.sin(a);
    const p = (t) => [x + Math.cos(t) * rx * ca - Math.sin(t) * rz * sa, z + Math.cos(t) * rx * sa + Math.sin(t) * rz * ca];
    for (let k = 0; k < seg; k++) {
      const A = p((k / seg) * 6.283), B = p(((k + 1) / seg) * 6.283);
      acc.flat(x, z, A[0], A[1], B[0], B[1], y, c);
    }
  };
  for (const T of list) {
    const s = T.scale ?? 1, step = (T.step ?? (T.kind === 'huf' ? 0.85 : T.kind === 'echse' ? 0.16 : 0.3)) * s;
    const spread = 0.07 * s * (T.kind === 'huf' ? 2.6 : T.kind === 'echse' ? 1.3 : 1);
    const pts = T.path, y = T.y + 0.009;
    let along = 0, side = 1;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const L = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / L, dz = (bz - az) / L, a = Math.atan2(dz, dx);
      for (; along < L; along += step) {
        side = -side;
        const x = ax + dx * along - dz * side * spread, z = az + dz * along + dx * side * spread;
        sandAt(x, z, T.y, ctx, sc);
        const k = T.kind === 'huf' ? 0.8 : 0.74;
        dk[0] = sc[0] * k; dk[1] = sc[1] * k * 0.97; dk[2] = sc[2] * k * 0.92;
        if (T.kind === 'vogel') {
          for (const da of [-0.55, 0, 0.55]) {
            const aa = a + da, l = 0.13 * s, w = 0.018 * s;
            acc.flat(x - Math.sin(aa) * w, z + Math.cos(aa) * w, x + Math.sin(aa) * w, z - Math.cos(aa) * w, x + Math.cos(aa) * l, z + Math.sin(aa) * l, y, dk);
          }
          acc.flat(x - Math.sin(a) * 0.012, z + Math.cos(a) * 0.012, x + Math.sin(a) * 0.012, z - Math.cos(a) * 0.012, x - Math.cos(a) * 0.06 * s, z - Math.sin(a) * 0.06 * s, y, dk);
        } else if (T.kind === 'huf') {
          for (const sd of [-1, 1]) dot(x - Math.sin(a) * 0.055 * s * sd, z + Math.cos(a) * 0.055 * s * sd, y, 0.09 * s, 0.05 * s, a, dk, 6);
        } else {
          dot(x, z, y, 0.025 * s, 0.025 * s, 0, dk, 5);
        }
      }
      along -= L;
    }
    if (T.kind === 'echse') {
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
        const L = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.round(L / 0.15));
        const dx = (bx - ax) / L, dz = (bz - az) / L, hw = 0.009 * s;
        for (let k = 0; k < n; k++) {
          const t0 = (k / n) * L, t1 = ((k + 1) / n) * L, w0 = Math.sin(t0 * 9) * 0.03 * s, w1 = Math.sin(t1 * 9) * 0.03 * s;
          const p0 = [ax + dx * t0 - dz * w0, az + dz * t0 + dx * w0], p1 = [ax + dx * t1 - dz * w1, az + dz * t1 + dx * w1];
          sandAt(p0[0], p0[1], T.y, ctx, sc); dk[0] = sc[0] * 0.8; dk[1] = sc[1] * 0.78; dk[2] = sc[2] * 0.74;
          acc.flat(p0[0] - dz * hw, p0[1] + dx * hw, p0[0] + dz * hw, p0[1] - dx * hw, p1[0] + dz * hw, p1[1] - dx * hw, y, dk);
          acc.flat(p0[0] - dz * hw, p0[1] + dx * hw, p1[0] + dz * hw, p1[1] - dx * hw, p1[0] - dz * hw, p1[1] + dx * hw, y, dk);
        }
      }
    }
  }
  const g = acc.geometry();
  return g ? [g] : [];
}

/**
 * Fugen-Abdeckungen: flache Streifen [{ x0, x1, z0, z1, y }] knapp über den Decken, gefärbt wie die neu eingefärbten
 * Decken (sandAt) – überdecken die gerundeten Kappenkanten, wo Teilstücke aneinanderstoßen (keine Nahtlinien mehr).
 */
export function seamParts(strips, ctx) {
  const acc = new Tris(), c = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const S of strips) {
    const xs = [S.x0]; for (let x = Math.floor(S.x0) + 1; x < S.x1 - 0.05; x++) xs.push(x); xs.push(S.x1);
    const zs = [S.z0]; for (let z = Math.floor(S.z0) + 1; z < S.z1 - 0.05; z++) zs.push(z); zs.push(S.z1);
    const y = S.y + 0.008;
    for (let j = 0; j < zs.length - 1; j++) for (let i = 0; i < xs.length - 1; i++) {
      const ax = xs[i], bx = xs[i + 1], az = zs[j], bz = zs[j + 1];
      const tile = 0.975 + 0.05 * hash2(Math.floor((ax + bx) / 2), Math.floor((az + bz) / 2));
      [[ax, az], [bx, az], [bx, bz], [ax, bz]].forEach(([x, z], k) => { sandAt(x, z, S.y, ctx, c[k]); c[k][0] *= tile; c[k][1] *= tile; c[k][2] *= tile; });
      acc.flat(ax, az, bx, az, bx, bz, y, c[0], c[1], c[2]);
      acc.flat(ax, az, bx, bz, ax, bz, y, c[0], c[2], c[3]);
    }
  }
  const g = acc.geometry();
  return g ? [g] : [];
}

/**
 * Nasses Ufer um einen Teich (Rechteck pool, Oberkante y): flacher Streifen (nasser Sand, w m breit) und eine kurze
 * Böschung ins Wasser – überdeckt die helle Kappenkante am Beckenrand.
 */
export function bankParts(pool, ctx, w = 0.4) {
  const acc = new Tris(), y = pool.y;
  const ring = (d, yy) => [[pool.x0 - d, pool.z0 - d], [pool.x1 + d, pool.z0 - d], [pool.x1 + d, pool.z1 + d], [pool.x0 - d, pool.z1 + d]].map(([x, z]) => [x, yy, z]);
  const rings = [ring(w, y + 0.011), ring(-0.07, y + 0.011), ring(-0.2, y - 0.17)];
  const wetDeep = C(0x96683a);
  const colAt = (p, k) => (k < 2 ? sandAt(p[0], p[2], y, ctx, [0, 0, 0]) : wetDeep);
  for (let r = 0; r < 2; r++) {
    const A = rings[r], B = rings[r + 1];
    for (let i = 0; i < 4; i++) {
      const a0 = A[i], a1 = A[(i + 1) % 4], b0 = B[i], b1 = B[(i + 1) % 4];
      const n = Math.max(1, Math.round(Math.hypot(a1[0] - a0[0], a1[2] - a0[2])));
      for (let k = 0; k < n; k++) {
        const t0 = k / n, t1 = (k + 1) / n, L = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
        const q = [L(a0, a1, t0), L(a0, a1, t1), L(b0, b1, t1), L(b0, b1, t0)];
        const cs = [colAt(q[0], r), colAt(q[1], r), colAt(q[2], r + 1), colAt(q[3], r + 1)];
        if (r === 0) { for (const c of cs) { c[0] *= 0.97; c[1] *= 0.96; c[2] *= 0.94; } }
        for (const [i0, i1, i2] of [[0, 1, 2], [0, 2, 3]]) {
          const P0 = q[i0], P1 = q[i1], P2 = q[i2];
          const ux = P1[0] - P0[0], uy = P1[1] - P0[1], uz = P1[2] - P0[2], vx = P2[0] - P0[0], vy = P2[1] - P0[1], vz = P2[2] - P0[2];
          let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
          const l = Math.hypot(nx, ny, nz) || 1;
          nx /= l; ny /= l; nz /= l;
          const order = ny < 0 ? [i0, i2, i1] : [i0, i1, i2];
          if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
          for (const j of order) acc.v(q[j][0], q[j][1], q[j][2], nx, ny, nz, cs[j]);
        }
      }
    }
  }
  const g = acc.geometry();
  return g ? [g] : [];
}

// ------------------------------------------------------------------ Requisiten (mit Schattenwurf, verschmolzen)

const P = { clay: 0xd9773e, clayL: 0xf0a868, clayD: 0xa8502a, cream: 0xf6e2b8, teal: 0x2fb8b0, red: 0xe0443a, yellow: 0xffc21a, wood: 0xb07a46, woodD: 0x7a4a24, bone: 0xf8f0dc, shellA: 0xffc8b8, shellB: 0xf6e6d6, white: 0xfff6ee, green: 0x3fae4a };

/** Umgedrehte Flächen (Rückseite sichtbar, Normalen umgekehrt) – für Unterseiten ohne doppelseitiges Material. */
function flipGeo(g0) {
  const g = g0.index ? g0.toNonIndexed() : g0;
  const P = g.attributes.position, N = g.attributes.normal;
  for (let i = 0; i < P.count; i += 3) {
    for (const A of [P, N]) { const x = A.getX(i + 1), y = A.getY(i + 1), z = A.getZ(i + 1); A.setXYZ(i + 1, A.getX(i + 2), A.getY(i + 2), A.getZ(i + 2)); A.setXYZ(i + 2, x, y, z); }
  }
  for (let i = 0; i < N.count; i++) N.setXYZ(i, -N.getX(i), -N.getY(i), -N.getZ(i));
  return g;
}

/** Build-Geometrie an Weltlage setzen. */
function placed(b, x, y, z, yaw = 0, s = 1, tilt = 0) {
  const g = b.geometry();
  if (s !== 1) g.scale(s, s, s);
  if (tilt) g.rotateZ(tilt);
  if (yaw) g.rotateY(yaw);
  g.translate(x, y, z);
  return g;
}

/**
 * Tonkrüge: list [{ pos, kind: 'amphore'|'krug'|'topf', yaw, size, lie (liegt umgekippt), band (Farbe des Zierbands),
 * broken (Scherben daneben) }].
 */
export function jarParts(list) {
  const out = [];
  const PROF = {
    amphore: [[0, 0], [0.12, 0.02], [0.22, 0.16], [0.25, 0.32], [0.2, 0.52], [0.1, 0.66], [0.11, 0.75], [0.06, 0.74], [0, 0.73]],
    krug: [[0, 0], [0.15, 0.01], [0.22, 0.15], [0.22, 0.32], [0.14, 0.46], [0.13, 0.55], [0.07, 0.54], [0, 0.53]],
    topf: [[0, 0], [0.2, 0.01], [0.28, 0.14], [0.27, 0.28], [0.22, 0.37], [0.24, 0.42], [0.14, 0.4], [0, 0.39]],
  };
  for (const J of list) {
    const kind = J.kind ?? 'krug', pts = PROF[kind], top = pts[pts.length - 3][1];
    const band = J.band ?? P.teal;
    const b = new Build();
    b.lathe(pts, { v: (x, y, z) => {
      const r = Math.hypot(x, z);
      if (y > top - 0.06 && r < 0.09) return 0x3a2010;                     // Öffnung
      if (Math.abs(y - top * 0.5) < top * 0.06) return band;                // Zierband
      if (Math.abs(y - top * 0.5) < top * 0.1) return P.cream;
      return y > top * 0.8 ? P.clayL : y < top * 0.15 ? P.clayD : P.clay;
    } }, {}, 8);
    if (kind !== 'topf') {
      for (const sd of [-1, 1]) b.torus(0.07, 0.022, P.clay, { p: [sd * (kind === 'amphore' ? 0.15 : 0.19), top * 0.75, 0], r: [0, 0, sd > 0 ? -Math.PI / 2 : Math.PI / 2] }, 3, 5, Math.PI);
    }
    const [x, y, z] = J.pos;
    const s = J.size ?? 1;
    if (J.lie) out.push(placed(b, x, y + 0.2 * s, z, J.yaw ?? 0, s, Math.PI / 2 * 0.92));
    else out.push(placed(b, x, y, z, J.yaw ?? 0, s));
    if (J.broken) {
      const rnd = rng(Math.floor(x * 13 + z * 7));
      for (let i = 0; i < 4; i++) {
        const sb = new Build();
        sb.box(0.12, 0.025, 0.09, i % 2 ? P.clay : P.clayL, { r: [rnd.real(-0.3, 0.3), rnd.real(0, 6), rnd.real(-0.3, 0.3)] }, 0);
        const a = rnd.real(0, 6.28), d = rnd.real(0.3, 0.6);
        out.push(placed(sb, x + Math.cos(a) * d, y + 0.015, z + Math.sin(a) * d));
      }
    }
  }
  return out;
}

/** Ausgeblichene, niedliche Knochen (Hundeknochen-Form), halb im Sand: list [[x, y, z, yaw, size?], …]. */
export function boneParts(list) {
  return list.map(([x, y, z, yaw, s = 1]) => {
    const b = new Build();
    b.cyl(0.035, 0.035, 0.3, { v: (xx, yy, zz, nx, ny) => (ny > 0.3 ? P.white : P.bone) }, { p: [0, 0.035, 0], r: [0, 0, Math.PI / 2] }, 7);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.sphere(0.05, { v: (xx, yy, zz, nx, ny) => (ny > 0.2 ? P.white : 0xe0d4b4) }, { p: [sx * 0.16, 0.035, sz * 0.035] }, 6, 4);
    return placed(b, x, y, z, yaw, s);
  });
}

/** Muscheln (Jakobsmuschel, Schneckenhaus): list [{ pos, kind: 'kamm'|'schnecke', yaw, size }]. */
export function shellParts(list) {
  return list.map((S) => {
    const b = new Build();
    if ((S.kind ?? 'kamm') === 'kamm') {
      const g = new THREE.SphereGeometry(0.13, 9, 3, 0, Math.PI, 0, Math.PI / 2);
      g.scale(1, 0.32, 0.9);
      b.add(g, { v: (x, y, z) => ((Math.floor(((Math.atan2(z, x) + 0.0001) / Math.PI) * 9) & 1) ? S.color ?? P.shellA : P.shellB) }, { r: [0, 0, 0] });
      b.box(0.07, 0.03, 0.05, S.color ?? P.shellA, { p: [0, 0.012, -0.015] }, 0.01, 1);
    } else {
      b.sphere(0.07, { v: (x, y, z) => ((Math.floor((y + 0.07) * 40) & 1) ? 0xe8b878 : P.shellB) }, { p: [0, 0.06, 0], s: [1, 0.85, 1] }, 9, 6);
      b.cone(0.05, 0.1, 0xc88a50, { p: [0.03, 0.11, 0], r: [0, 0, -0.6] }, 7);
    }
    const [x, y, z] = S.pos;
    return placed(b, x, y, z, S.yaw ?? 0, S.size ?? 1);
  });
}

/**
 * Stoffbahn zwischen zwei Punkten (Aufhängung oben, hängt mit Durchhang sag durch, Breite w nach unten, Zacken-Saum,
 * beidseitig, Querstreifen in colors) – list [{ from, to, sag, w, colors }].
 */
export function clothParts(list) {
  const out = [];
  for (const S of list) {
    const acc = new Tris();
    const [ax, ay, az] = S.from, [bx, by, bz] = S.to;
    const n = S.n ?? 12, w = S.w ?? 0.45, sag = S.sag ?? 0.5, cols = (S.colors ?? [0xe0443a, 0xffc21a, 0x2fb8b0, 0xfff6ee]).map(C);
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1, px = -dz / L, pz = dx / L;
    const top = (t) => [ax + dx * t, ay + (by - ay) * t - sag * 4 * t * (1 - t), az + dz * t];
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, p0 = top(t0), p1 = top(t1);
      const col = cols[i % cols.length], dk = [col[0] * 0.8, col[1] * 0.8, col[2] * 0.8];
      const h0 = w, h1 = w, hm = w + 0.08;                    // Zacke in der Mitte jeder Bahn
      const pm = top((t0 + t1) / 2);
      const q = [[p0[0], p0[1], p0[2]], [p1[0], p1[1], p1[2]], [p1[0], p1[1] - h1, p1[2]], [pm[0], pm[1] - hm, pm[2]], [p0[0], p0[1] - h0, p0[2]]];
      const tris = [[0, 1, 2], [0, 2, 3], [0, 3, 4]];
      for (const side of [1, -1]) {
        for (const [i0, i1, i2] of tris) {
          const order = side > 0 ? [i0, i2, i1] : [i0, i1, i2];
          for (const j of order) acc.v(q[j][0] + px * 0.004 * side, q[j][1], q[j][2] + pz * 0.004 * side, px * side, 0.15, pz * side, j >= 2 ? dk : col);
        }
      }
    }
    // Quasten an den Aufhängepunkten
    const b = new Build();
    for (const p of [S.from, S.to]) b.sphere(0.05, P.yellow, { p: [p[0], p[1] + 0.02, p[2]] }, 6, 4);
    out.push(acc.geometry(), b.geometry());
  }
  return out;
}

/** Wegweiser: Pfosten mit bunten Pfeilbrettern (je { yaw, color, y }) und Dach-Spitze. */
export function signpostParts(list) {
  return list.map((S) => {
    const b = new Build();
    b.cyl(0.055, 0.07, 1.75, { v: (x, y) => (y > 0 ? P.wood : P.woodD) }, { p: [0, 0.875, 0] }, 7);
    b.cone(0.11, 0.16, P.red, { p: [0, 1.82, 0] }, 6);
    for (const A of S.arms ?? [{ yaw: 0, color: P.teal, y: 1.45 }]) {
      const yaw = A.yaw, cy = Math.cos(yaw), sy = Math.sin(yaw), h = A.y;
      const at = (d) => [cy * d, h, -sy * d];
      b.box(0.62, 0.17, 0.045, A.color, { p: at(0.38), r: [0, yaw, 0] }, 0.02, 1);
      b.box(0.15, 0.15, 0.044, A.color, { p: at(0.69), r: [0, yaw, Math.PI / 4] }, 0.015, 1);
      b.sphere(0.035, P.white, { p: [at(0.28)[0] - sy * 0.03, h, at(0.28)[2] - cy * 0.03] }, 6, 4);
      b.sphere(0.035, P.white, { p: [at(0.28)[0] + sy * 0.03, h, at(0.28)[2] + cy * 0.03] }, 6, 4);
    }
    const [x, y, z] = S.pos;
    return placed(b, x, y, z, 0, S.size ?? 1);
  });
}

/** Marktstand-Rest: Pfosten, gestreiftes Sonnendach (eine Ecke abgerissen), Theke mit Melonen, Datteln und Krügen. */
export function stallParts(S) {
  const b = new Build();
  const W = 2.2, D = 1.3;
  for (const [x, z, h] of [[-W / 2, -D / 2, 1.85], [W / 2, -D / 2, 1.85], [-W / 2, D / 2, 1.5], [W / 2, D / 2, 1.42]]) b.cyl(0.05, 0.06, h, P.wood, { p: [x, h / 2, z] }, 6);
  // Theke aus Brettern
  b.box(W * 0.92, 0.75, 0.5, { v: (x, y, z, nx, ny) => (ny > 0.5 ? P.clayL : (Math.floor((y + 0.375) / 0.19) & 1 ? P.wood : P.woodD)) }, { p: [0, 0.375, D / 2 - 0.2] }, 0.03, 1);
  // Melonen und Datteln
  for (const [x, r] of [[-0.6, 0.16], [-0.32, 0.14], [-0.46, 0.13]]) b.sphere(r, { v: (xx, yy, zz) => ((Math.floor((Math.atan2(zz, xx) / Math.PI + 1) * 6) & 1) ? 0x2f8a3a : 0x7ac850) }, { p: [x, 0.75 + r * 0.8, D / 2 - 0.2 + (x === -0.46 ? -0.12 : 0.05)], s: [1, 0.9, 1] }, 9, 6);
  b.cyl(0.17, 0.14, 0.13, 0xc98a52, { p: [0.35, 0.82, D / 2 - 0.2] }, 9);
  for (let i = 0; i < 6; i++) b.sphere(0.045, 0x6a3a1c, { p: [0.35 + Math.cos(i) * 0.08, 0.9, D / 2 - 0.2 + Math.sin(i) * 0.08] }, 5, 3);
  b.lathe([[0, 0], [0.1, 0.01], [0.13, 0.1], [0.08, 0.2], [0.09, 0.23], [0, 0.22]], P.clay, { p: [0.75, 0.75, D / 2 - 0.22] }, 8);
  // Sonnendach: Bahnen rot/weiß, vorn Zacken, hintere rechte Ecke abgerissen (hängt herab)
  const acc = new Tris(), red = C(P.red), wh = C(P.white), redD = C(0xb0302a), whD = C(0xd8ccc0);
  const y0 = 1.85, y1 = 1.46, nS = 8;
  const pt = (u, v) => [-W / 2 - 0.1 + (W + 0.2) * u, y0 + (y1 - y0) * v - Math.sin(u * Math.PI) * 0.06, -D / 2 - 0.15 + (D + 0.35) * v];
  for (let i = 0; i < nS; i++) {
    const u0 = i / nS, u1 = (i + 1) / nS, top = (i & 1) ? wh : red, bot = (i & 1) ? whD : redD;
    let q = [pt(u0, 0), pt(u1, 0), pt(u1, 1), pt(u0, 1)];
    if (i === nS - 1) q = [q[0], q[1], [q[1][0] - 0.05, q[1][1] - 0.55, q[1][2] + 0.5], q[3]];   // abgerissene Ecke
    for (const [a, c2, d] of [[0, 1, 2], [0, 2, 3]]) {
      for (const j of [a, d, c2]) acc.v(q[j][0], q[j][1], q[j][2], 0, 1, 0.25, top);
      for (const j of [a, c2, d]) acc.v(q[j][0], q[j][1] - 0.01, q[j][2], 0, -1, 0, bot);
    }
    // Zacken vorn
    const f0 = pt(u0, 1), f1 = pt(u1, 1), fm = pt((u0 + u1) / 2, 1);
    if (i < nS - 1) {
      const tip = [fm[0], fm[1] - 0.16, fm[2] + 0.02];
      acc.v(f0[0], f0[1], f0[2], 0, 0, 1, top); acc.v(tip[0], tip[1], tip[2], 0, 0, 1, top); acc.v(f1[0], f1[1], f1[2], 0, 0, 1, top);
      acc.v(f0[0], f0[1], f0[2], 0, 0, -1, bot); acc.v(f1[0], f1[1], f1[2], 0, 0, -1, bot); acc.v(tip[0], tip[1], tip[2], 0, 0, -1, bot);
    }
  }
  const g1 = acc.geometry();
  const [x, y, z] = S.pos, yaw = S.yaw ?? 0;
  g1.rotateY(yaw); g1.translate(x, y, z);
  return [placed(b, x, y, z, yaw), g1];
}

/** Sonnenschirm (bunte Segmente) mit Stange: { pos, r, h, tilt, colors }. */
export function parasolParts(S) {
  const b = new Build();
  const r = S.r ?? 1.05, h = S.h ?? 2.1, cols = S.colors ?? [P.red, P.white, P.yellow, P.white];
  b.cyl(0.035, 0.035, h, P.woodD, { p: [0, h / 2, 0] }, 6);
  const g = new THREE.ConeGeometry(r, 0.38, 10, 1, true);
  b.add(g, (x, y, z) => cols[Math.floor(((Math.atan2(z, x) / (Math.PI * 2) + 1) * 10) % 10) % cols.length], { p: [0, h, 0] });
  b.add(flipGeo(new THREE.ConeGeometry(r * 0.98, 0.37, 10, 1, true)), 0xd8c8b8, { p: [0, h - 0.006, 0] });   // Unterseite
  b.sphere(0.06, P.yellow, { p: [0, h + 0.21, 0] }, 6, 4);
  const [x, y, z] = S.pos;
  return [placed(b, x, y, z, S.yaw ?? 0, 1, S.tilt ?? 0)];
}

/** Wimpelmast (Fahnenstange mit dreieckigem Wimpel, beidseitig): { pos, h, color, yaw }. */
export function pennantParts(S) {
  const b = new Build();
  const h = S.h ?? 2.4;
  b.cyl(0.04, 0.05, h, P.wood, { p: [0, h / 2, 0] }, 6);
  b.sphere(0.07, P.yellow, { p: [0, h + 0.04, 0] }, 6, 4);
  const acc = new Tris(), c = C(S.color ?? P.red), c2 = C(P.yellow);
  const pts = [[0.04, h - 0.08, 0], [0.04, h - 0.6, 0], [0.95, h - 0.42, 0.06], [0.5, h - 0.3, 0.03]];
  for (const side of [1, -1]) {
    const tri = side > 0 ? [[0, 1, 3], [1, 2, 3]] : [[0, 3, 1], [1, 3, 2]];
    for (const t of tri) for (const j of t) acc.v(pts[j][0], pts[j][1], pts[j][2] + 0.003 * side, 0, 0.1, side, j === 2 ? c2 : c);
  }
  const [x, y, z] = S.pos;
  const g = acc.geometry(); g.rotateY(S.yaw ?? 0); g.translate(x, y, z);
  return [placed(b, x, y, z), g];
}

/** Trittplatten aus Sandstein (flach, leicht versenkt) entlang from → to: { from, to, n, size }. */
export function flagstoneParts(list) {
  const out = [];
  for (const F of list) {
    const rnd = rng(Math.floor(F.from[0] * 31 + F.from[2] * 17) >>> 0);
    const n = F.n ?? 6, s0 = F.size ?? 0.32;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const x = F.from[0] + (F.to[0] - F.from[0]) * t + rnd.real(-0.1, 0.1), z = F.from[2] + (F.to[2] - F.from[2]) * t + rnd.real(-0.1, 0.1);
      const y = F.from[1] + (F.to[1] - F.from[1]) * t;
      const s = s0 * rnd.real(0.85, 1.15);
      const g = new THREE.SphereGeometry(1, 10, 3, 0, Math.PI * 2, 0, Math.PI / 2);
      g.scale(s * rnd.real(0.95, 1.2), 0.09, s * rnd.real(0.75, 0.95));
      g.rotateY(rnd.real(0, 6.28));
      g.translate(x, y - 0.02, z);
      const top = C(rnd.pick([0xf0cf9a, 0xe8c48a, 0xf4d8a8])), edge = C(rnd.pick([0xc4905a, 0xb88450]));
      out.push(colorize(g.toNonIndexed(), (p, nn, o) => mixc(edge, top, sstep(0.35, 0.95, nn.y), o)));
    }
  }
  return out;
}

/** Schilf mit Rohrkolben (Halme beidseitig) an Punkten [[x, y, z, Höhe?], …]. */
export function reedParts(list, seed = 17) {
  const rnd = rng(seed), acc = new Tris(), b = new Build();
  const g0 = C(0x3f8a34), g1 = C(0x8ccf5a);
  for (const [x, y, z, h0 = 1.1] of list) {
    const n = 5 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const a = rnd.real(0, 6.28), h = h0 * rnd.real(0.7, 1.15), lean = rnd.real(0.05, 0.25), w = 0.03;
      const ca = Math.cos(a), sa = Math.sin(a), bx = x + ca * rnd.real(0, 0.12), bz = z + sa * rnd.real(0, 0.12);
      const P0 = [bx - sa * w, y - 0.1, bz + ca * w], P1 = [bx + sa * w, y - 0.1, bz - ca * w], T = [bx + ca * lean, y + h, bz + sa * lean];
      for (const [p, c] of [[P0, g0], [P1, g0], [T, g1]]) acc.v(p[0], p[1], p[2], ca * 0.4, 0.8, sa * 0.4, c);
      for (const [p, c] of [[P0, g0], [T, g1], [P1, g0]]) acc.v(p[0], p[1], p[2], ca * 0.4, 0.8, sa * 0.4, c);
      if (i < 2) b.cyl(0.035, 0.035, 0.2, 0x7a4424, { p: [bx + ca * lean * 0.85, y + h * 0.82, bz + sa * lean * 0.85], r: [Math.sin(a) * lean, 0, -Math.cos(a) * lean] }, 5);
    }
  }
  return [acc.geometry(), b.parts.length ? b.geometry() : null].filter(Boolean);
}

/**
 * Verlorene Hackvogel-Federn (flach im Sand, leicht gewölbt): list [[x, y, z, yaw, Größe?, Farbe?], …] – blau mit
 * dunklen Querstreifen, flaumigem hellem Ansatz und rot-oranger Spitze (wie der Federschopf).
 */
export function featherParts(list) {
  const acc = new Tris();
  const fluff = C(0xe8eeff), tipC = C(0xff6a2a), shaft = C(0xf4f0e0);
  for (const [x, y, z, yaw, s = 1, color = 0x3a6ad8] of list) {
    const base = C(color), dark = [base[0] * 0.6, base[1] * 0.6, base[2] * 0.7];
    const L = 0.36 * s, W = 0.075 * s, n = 6, ca = Math.cos(yaw), sa = Math.sin(yaw);
    const P = (u, v) => { const lx = u * L, lz = v; return [x + lx * ca - lz * sa, z + lx * sa + lz * ca]; };
    const colAt = (t) => (t < 0.18 ? fluff : t > 0.82 ? tipC : (Math.floor(t * 7) & 1 ? dark : base));
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      const w0 = W * Math.sin(Math.PI * Math.min(1, 0.12 + t0 * 0.95)), w1 = W * Math.sin(Math.PI * Math.min(1, 0.12 + t1 * 0.95));
      const y0 = y + 0.012 + Math.sin(t0 * Math.PI) * 0.02 * s, y1 = y + 0.012 + Math.sin(t1 * Math.PI) * 0.02 * s;
      const a0 = P(t0, -w0), b0 = P(t0, w0), a1 = P(t1, -w1 * 0.9), b1 = P(t1, w1), c0 = P(t0, 0), c1 = P(t1, 0);
      const k0 = colAt(t0), k1 = colAt(t1);
      // zwei Fahnen-Hälften (die eine etwas schmaler – Federn sind unsymmetrisch), Kiel hell
      for (const [p, q, r, cp, cq, cr, yy] of [[a0, c0, c1, k0, shaft, shaft, [y0, y0, y1]], [a0, c1, a1, k0, shaft, k1, [y0, y1, y1]], [c0, b0, b1, shaft, k0, k1, [y0, y0, y1]], [c0, b1, c1, shaft, k1, shaft, [y0, y1, y1]]]) {
        const pts = [[p, cp, yy[0]], [q, cq, yy[1]], [r, cr, yy[2]]];
        const cross = (q[1] - p[1]) * (r[0] - p[0]) - (q[0] - p[0]) * (r[1] - p[1]);
        const ord = cross > 0 ? [0, 1, 2] : [0, 2, 1];
        for (const j of ord) acc.v(pts[j][0][0], pts[j][2], pts[j][0][1], 0, 1, 0, pts[j][1]);
      }
    }
  }
  const g = acc.geometry();
  return g ? [g] : [];
}

/** Vogelnest mit gesprenkelten Eiern auf einem Sims: { pos, eggs }. */
export function nestParts(S) {
  const b = new Build();
  b.torus(0.2, 0.08, { v: (x, y, z) => ((Math.floor(Math.atan2(z, x) * 5) & 1) ? 0xb08a50 : 0x8a6236) }, { p: [0, 0.07, 0], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.8] }, 5, 12);
  b.sphere(0.17, 0x9a7444, { p: [0, 0.05, 0], s: [1, 0.35, 1] }, 8, 4);
  for (let i = 0; i < (S.eggs ?? 3); i++) b.sphere(0.06, { v: (x, y, z) => (fract(Math.sin(x * 91 + y * 47 + z * 13) * 999) > 0.8 ? 0x5a8ab0 : 0xbfe4f4) }, { p: [Math.cos(i * 2.1) * 0.07, 0.11, Math.sin(i * 2.1) * 0.07], s: [1, 1.25, 1] }, 7, 5);
  const [x, y, z] = S.pos;
  return [placed(b, x, y, z, S.yaw ?? 0, S.size ?? 1)];
}

// ------------------------------------------------------------------ Kakteen mit wenig Dreiecken

/** Baustein nur mit seiner Kollision bauen (Geometrie verworfen) – z. B. deco_w2 für dieselben Kaktus-Formen. */
export function colliderOnly(level, seg) {
  const v = level.view, build = getBlockType(seg.type);
  if (!build) return;
  if (!v) { build(level, seg); return; }
  const orig = v.addStatic;
  v.addStatic = (g) => g?.dispose?.();
  try { build(level, seg); } finally { v.addStatic = orig; }
}

/**
 * Kakteen (Liste wie deco_w2 kaktus: { pos, variant, size, yaw }): Kollision genau wie der Baustein, Darstellung
 * aus der sparsamen Kaktus-Geometrie (≈ ¼ der Dreiecke). Liefert die Geometrien (für bakeDeco).
 */
export function cacti(level, items) {
  colliderOnly(level, { type: 'deco_w2', items: items.map((it) => ({ ...it, kind: 'kaktus' })) });
  if (!level.view) return [];
  return items.map((it) => {
    const g = kaktusGeo(it.variant ?? 'saeule', 'low').clone();
    const s = it.size ?? 1;
    g.scale(s, s, s); g.rotateY(it.yaw ?? 0); g.translate(it.pos[0], it.pos[1], it.pos[2]);
    return g;
  });
}

// ------------------------------------------------------------------ Echse (animiert, ein Zeichenaufruf)

/**
 * Wüstengecko an einer Wand oder auf einem Stein: pos (Bauchmitte), normal [nx, ny, nz] (Fläche), dir (Blickrichtung
 * auf der Fläche, z. B. [0, 1, 0] = Kopf nach oben). Macht Liegestütze, wackelt mit dem Kopf und flitzt ab und zu
 * ein Stück und zurück. Nur in der Nähe der Figur sichtbar (near m). Ohne Kollision und Schattenwurf.
 */
export function lizard(level, pos, o = {}) {
  const v = level.view;
  if (!v) return null;
  const b = new Build();
  const body = o.color ?? 0xf2a23e, spot = 0x9a4f22, belly = 0xffe2a6;
  b.sphere(1, { v: (x, y, z, nx, ny) => (ny < -0.3 ? belly : body) }, { p: [0, 0.05, 0], s: [0.17, 0.055, 0.075] }, 10, 6);
  b.sphere(1, body, { p: [0.19, 0.06, 0], s: [0.075, 0.045, 0.06] }, 8, 5);
  for (const sz of [-1, 1]) {
    b.sphere(0.022, 0x1a1008, { p: [0.21, 0.085, sz * 0.042] }, 6, 4);
    b.sphere(0.008, 0xffffff, { p: [0.224, 0.095, sz * 0.05] }, 4, 3);
  }
  for (const [x, z] of [[-0.05, 0.03], [0.06, -0.035], [-0.1, -0.02], [0.02, 0.04]]) b.sphere(1, spot, { p: [x, 0.098, z], s: [0.03, 0.012, 0.022] }, 6, 3);
  b.cone(0.04, 0.32, body, { p: [-0.31, 0.04, 0], r: [0, 0, Math.PI / 2] }, 6);
  for (const [x, sz, a] of [[0.1, 1, 0.5], [0.1, -1, -0.5], [-0.09, 1, -0.4], [-0.09, -1, 0.4]]) {
    b.cyl(0.014, 0.014, 0.11, body, { p: [x + a * 0.04, 0.03, sz * 0.09], r: [Math.PI / 2 * sz, 0, a] }, 4);
    b.sphere(0.018, body, { p: [x + a * 0.07, 0.012, sz * 0.14] }, 5, 3);
  }
  const mesh = new THREE.Mesh(b.geometry(), v.mats?.world);
  mesh.castShadow = false; mesh.userData.owned = true;
  const s = o.scale ?? 1.5;
  mesh.scale.setScalar(s);
  const root = new THREE.Group();
  root.add(mesh);
  // Ausrichtung: lokal +Y = Normale, lokal +X = Blickrichtung
  const N = new THREE.Vector3(...(o.normal ?? [0, 1, 0])).normalize();
  const D = new THREE.Vector3(...(o.dir ?? [1, 0, 0]));
  D.addScaledVector(N, -D.dot(N)).normalize();
  const Z = new THREE.Vector3().crossVectors(D, N);
  root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(D, N, Z));
  root.position.set(pos[0], pos[1], pos[2]);
  root.userData.owned = true;
  let t = o.phase ?? 0;
  const near = o.near ?? 30, dash = o.dash ?? 0.7;
  v.add(root, (dt) => {
    t += Math.min(dt, 0.1);
    const p = level.player;
    root.visible = !p || Math.hypot(p.pos.x - pos[0], p.pos.z - pos[2]) < near;
    if (!root.visible) return;
    const cyc = t % 7;
    // Liegestütze (drei schnelle), Kopf wackeln, kurzer Sprint und zurück
    const push = cyc < 1.2 ? Math.abs(Math.sin(cyc * Math.PI * 2.5)) * 0.035 : 0;
    const run = cyc > 3.6 && cyc < 4.1 ? (cyc - 3.6) / 0.5 : cyc >= 4.1 && cyc < 5.6 ? 1 : cyc >= 5.6 && cyc < 6.3 ? 1 - (cyc - 5.6) / 0.7 : 0;
    mesh.position.set(run * dash / s, push / s, 0);
    mesh.rotation.y = Math.sin(t * 1.7) * 0.12 + (cyc > 1.6 && cyc < 3.4 ? Math.sin((cyc - 1.6) * 3.5) * 0.25 : 0);
  });
  return root;
}

/**
 * Pillendreher: ein schillernder Käfer rollt eine Sandkugel (rückwärts schiebend, wie echte Mistkäfer) zwischen from und
 * to hin und her ([x, y, z] Bodenpunkte), dreht am Ende um. Zwei Zeichenaufrufe, nur in der Nähe sichtbar (near m).
 */
export function beetle(level, from, to, o = {}) {
  const v = level.view;
  if (!v) return null;
  const b = new Build();
  b.sphere(1, { v: (x, y, z, nx, ny) => (ny > 0.55 ? 0x6a9ae8 : ny > 0.1 ? 0x2c4a9a : 0x1a2440) }, { p: [0, 0.07, 0], s: [0.12, 0.075, 0.09] }, 10, 6);
  b.box(0.012, 0.01, 0.17, 0x1a2440, { p: [0.0, 0.142, 0] }, 0);                          // Naht der Flügeldecken
  b.sphere(1, 0x1e2a58, { p: [0.13, 0.06, 0], s: [0.05, 0.04, 0.06] }, 7, 4);
  for (const sz of [-1, 1]) {
    b.sphere(0.012, 0xffffff, { p: [0.165, 0.075, sz * 0.03] }, 4, 3);
    b.cone(0.012, 0.06, 0x1a2440, { p: [0.18, 0.08, sz * 0.045], r: [sz * 0.6, 0, -1.1] }, 3);
    for (const [x, a] of [[0.07, 0.6], [0, 0], [-0.07, -0.6]]) b.cyl(0.008, 0.008, 0.11, 0x141a30, { p: [x + a * 0.02, 0.035, sz * 0.1], r: [sz * 1.1, a, 0] }, 3);
  }
  const mat = v.mats?.world;
  const body = new THREE.Mesh(b.geometry(), mat);
  const bb = new Build();
  const R = o.ball ?? 0.16;
  bb.sphere(R, { v: (x, y, z) => (fract(Math.sin(x * 431 + y * 197 + z * 77) * 9999) > 0.82 ? 0xa8783e : 0xe0b46a) }, {}, 9, 7);
  const ball = new THREE.Mesh(bb.geometry(), mat);
  const root = new THREE.Group();
  root.add(body, ball);
  root.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.userData.owned = true; } });
  const s = o.scale ?? 1.6;
  root.scale.setScalar(s);
  const L = Math.hypot(to[0] - from[0], to[2] - from[2]), speed = o.speed ?? 0.45, near = o.near ?? 26;
  let t = o.phase ?? 0;
  v.add(root, (dt) => {
    t += Math.min(dt, 0.1);
    const p = level.player;
    root.visible = !p || Math.hypot(p.pos.x - (from[0] + to[0]) / 2, p.pos.z - (from[2] + to[2]) / 2) < near;
    if (!root.visible) return;
    // hin (rollen), kurze Pause, zurück; der Käfer steht hinter der Kugel und schiebt rückwärts
    const T = L / speed, cyc = (T + 1.2) * 2, u = t % cyc;
    const fwd = u < T + 1.2;
    const k = fwd ? Math.min(1, u / T) : 1 - Math.min(1, (u - T - 1.2) / T);
    const dx = (to[0] - from[0]) / L, dz = (to[2] - from[2]) / L, dir = fwd ? 1 : -1;
    const x = from[0] + (to[0] - from[0]) * k, z = from[2] + (to[2] - from[2]) * k, y = from[1] + (to[1] - from[1]) * k;
    root.position.set(x, y, z);
    root.rotation.y = Math.atan2(-dz * dir, dx * dir);
    ball.position.set(R * 1.15 / 1, R, 0);
    body.position.set(-0.08, Math.abs(Math.sin(t * 14)) * 0.008, 0);
    body.rotation.y = Math.PI;                              // rückwärts: Kopf von der Kugel weg
    body.rotation.z = -0.35;                                // Hinterbeine oben an der Kugel
    ball.rotation.z = -(k * L) / (R * s) * dir;
  });
  return root;
}

/**
 * Sandfall: wo fließender Treibsand über eine Kante stürzt, ein Vorhang aus rieselndem Sand (Textur läuft nach unten,
 * unten durchsichtig). o: x (Kante), z0, z1, y (Oberkante), drop (Fallhöhe), out (+1/−1: Richtung über die Kante).
 * Ein Zeichenaufruf, ohne Schatten.
 */
export function sandfall(level, o) {
  const v = level.view;
  if (!v) return null;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#e8c26e'; g.fillRect(0, 0, 64, 128);
  let seed = 3;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 26; i++) {
    const x = rnd() * 64, w = 1 + rnd() * 3, l = 20 + rnd() * 60, y = rnd() * 128;
    g.fillStyle = rnd() < 0.5 ? 'rgba(255,240,200,0.55)' : 'rgba(150,100,40,0.35)';
    g.fillRect(x, y, w, l); g.fillRect(x, y - 128, w, l);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const nz = 6, ny = 8, out = o.out ?? 1, drop = o.drop ?? 9;
  const pos = [], uv = [], col = [], idx = [];
  for (let j = 0; j <= ny; j++) {
    const t = j / ny;
    for (let i = 0; i <= nz; i++) {
      const z = o.z0 + (o.z1 - o.z0) * (i / nz);
      // Wurfparabel: der Sand verlässt die Kante mit der Fließgeschwindigkeit (speed m/s)
      const bulge = (o.speed ?? 1.7) * Math.sqrt((2 * drop * t) / 9.8) - 0.12 + Math.sin(i * 1.7 + j) * 0.06 * t;
      pos.push(o.x + out * bulge, o.y + 0.04 - drop * t, z);
      uv.push((i / nz) * 2, -t * drop / 3);
      const edge = Math.min(1, Math.min(i, nz - i) / 1.2);
      col.push(1, 1, 1, (1 - t) ** 1.1 * (0.4 + 0.6 * edge));
    }
  }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nz; i++) {
    const a = j * (nz + 1) + i, b2 = a + 1, cc = a + nz + 1, d = cc + 1;
    idx.push(a, cc, b2, b2, cc, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ map: tex, vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = false; mesh.receiveShadow = false; mesh.userData.owned = true; mesh.name = 'sandfall';
  let t = 0;
  v.add(mesh, (dt) => { t += Math.min(dt, 0.1); tex.offset.y = t * 1.1; });
  return mesh;
}

// ------------------------------------------------------------------ Verschmelzen und Fern-Ausblendung

const ZIER = new WeakMap();

/**
 * Fertige Teile (Weltkoordinaten) einbauen: cast (Standard) → an das vorhandene Abschnitts-Mesh (Material world,
 * Schattenwurf) mit der passenden z-Spanne anhängen (0 zusätzliche Zeichenaufrufe); cast: false → schattenlose Meshes
 * je chunk m entlang z (flache Zier: ein Aufruf je sichtbarem Stück, nie im Schattenpass). Liefert die Dreieckszahl.
 */
export function bakeDeco(level, parts, o = {}) {
  const v = level.view, list = parts.filter(Boolean);
  if (!v) { for (const g of list) g.dispose(); return 0; }
  const ready = list.map(staticReady);
  let tris = 0;
  const center = (g) => { g.computeBoundingBox(); const b = g.boundingBox; return [(b.min.x + b.max.x) / 2, (b.min.z + b.max.z) / 2]; };
  if (o.cast !== false) {
    const hosts = v.static.meshes.filter((m) => m.material === v.mats.world && (m.userData.cast0 ?? m.castShadow));
    for (const h of hosts) h.geometry.computeBoundingBox();
    const groups = new Map();
    for (const g of ready) {
      const [cx, cz] = center(g);
      let best = null, bd = Infinity;
      for (const h of hosts) {
        const b = h.geometry.boundingBox;
        if (cz < b.min.z - 1 || cz > b.max.z + 1 || cx < b.min.x - 1 || cx > b.max.x + 1) continue;
        const d = Math.abs((b.min.z + b.max.z) / 2 - cz);
        if (d < bd) { bd = d; best = h; }
      }
      if (!best) { g.dispose(); continue; }
      if (!groups.has(best)) groups.set(best, []);
      groups.get(best).push(g);
      tris += g.attributes.position.count / 3;
    }
    for (const [h, gs] of groups) { h.geometry = merge([h.geometry, ...gs]); h.geometry.computeBoundingBox(); }
    return tris;
  }
  // je Dreieck (Schwerpunkt) in Stücke von chunk m entlang z verteilen – auch lange Teile (Wände, Rippel-Sammlungen)
  const chunk = o.chunk ?? 64, groups = new Map();
  for (const g of ready) {
    const Pa = g.attributes.position.array, Na = g.attributes.normal.array, Ca = g.attributes.color.array;
    for (let i = 0; i < Pa.length; i += 9) {
      const k = Math.floor(-(Pa[i + 2] + Pa[i + 5] + Pa[i + 8]) / 3 / chunk);
      let acc = groups.get(k);
      if (!acc) { acc = new Tris(); groups.set(k, acc); }
      for (let j = 0; j < 9; j++) { acc.p.push(Pa[i + j]); acc.n.push(Na[i + j]); acc.c.push(Ca[i + j]); }
    }
    tris += Pa.length / 9;
    g.dispose();
  }
  if (!ZIER.has(level)) ZIER.set(level, []);
  for (const [k, acc] of groups) {
    const geo = acc.geometry();
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, v.mats.world);
    mesh.castShadow = false; mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false; mesh.updateMatrix();
    mesh.name = `zier:${o.name ?? 'flach'}:${k}`;
    mesh.userData.owned = true;
    v.add(mesh);
    ZIER.get(level).push(mesh);
  }
  return tris;
}

/**
 * Fern-Ausblendung der statischen Meshes je Bild: jedes Abschnitts-Mesh (auch die Zier-Stücke und die Kulisse aus
 * shadowless) wird mit seinem Quader gegen die Sichtpyramide der Kamera und den Sichtkörper der Sonnenschatten-Kamera
 * geprüft – außerhalb der Kamera unsichtbar, außerhalb des Schattenkörpers ohne Schattenwurf. Die Begrenzungskugeln
 * der 32-m-Abschnitte (Radius ≈ 35 m) reichen sonst weit über beide hinaus. Nur Darstellung.
 */
// o: floorY (−6: tiefer fallende Schatten zählen nicht), groups [{ name, boxes: [[x0, y0, z0, x1, y1, z1], …] }].
export function cullStatic(level, o = {}) {
  const v = level.view;
  if (!v) return;
  const items = [];
  // Schatten fallen entlang −sunDir (nach +X und −Z): sichtbar wird ein Schatten nur, wenn der in Lichtrichtung
  // verlängerte Quader (oberhalb von floorY, wo Schatten noch auffallen) die Kamera-Pyramide schneidet.
  const d = v.sunDir.clone().negate().normalize();
  const floorY = o.floorY ?? -6;
  const add = (m) => {
    m.geometry.computeBoundingBox();
    const cast = m.userData.cast0 ?? m.castShadow;
    m.userData.cast0 = cast;
    const b = m.geometry.boundingBox.clone().expandByScalar(0.6);
    let sw = null;
    if (cast && b.max.y > floorY) {
      const c = b.clone(); c.min.y = Math.max(c.min.y, floorY);
      const t = (c.max.y - floorY) / Math.max(0.2, -d.y);
      sw = c.clone().union(c.clone().translate(d.clone().multiplyScalar(t)));
      sw.min.y = Math.max(sw.min.y, floorY);
    }
    items.push({ m, b, sw, cast });
  };
  for (const m of v.static.meshes) add(m);
  for (const m of ZIER.get(level) ?? []) add(m);
  for (const m of v.three.children) if (m.isMesh && m.name.startsWith('kulisse:')) add(m);
  // Instanz-Gruppen ohne Sichtprüfung (z. B. Fliesen-Pool, Sandblöcke): nur zeichnen, wenn einer ihrer Bereiche in der
  // Kamera liegt oder seinen Schatten hineinwirft
  const groups = (o.groups ?? []).map((G) => ({
    name: G.name,
    boxes: G.boxes.map(([x0, y0, z0, x1, y1, z1]) => new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1))),
  }));
  for (const G of groups) {
    G.sw = G.boxes.map((b) => {
      const c = b.clone(); c.min.y = Math.max(c.min.y, floorY);
      const w = c.clone().union(c.clone().translate(d.clone().multiplyScalar((c.max.y - floorY) / Math.max(0.2, -d.y))));
      w.min.y = Math.max(w.min.y, floorY);
      return w;
    });
  }
  const fc = new THREE.Frustum(), fs = new THREE.Frustum(), M = new THREE.Matrix4();
  const sc = new THREE.OrthographicCamera();
  v.onFrame(() => {
    const cam = v.camera;
    cam.updateMatrixWorld();
    fc.setFromProjectionMatrix(M.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const s = v.sun.shadow.camera, shadows = v.sun.castShadow;
    if (shadows) {
      sc.left = s.left; sc.right = s.right; sc.top = s.top; sc.bottom = s.bottom; sc.near = s.near; sc.far = s.far;
      sc.updateProjectionMatrix();
      sc.position.copy(v.sun.position); sc.lookAt(v.sun.target.position); sc.updateMatrixWorld();
      fs.setFromProjectionMatrix(M.multiplyMatrices(sc.projectionMatrix, sc.matrixWorldInverse));
    }
    for (const it of items) {
      const inC = fc.intersectsBox(it.b), inS = it.cast && shadows && !!it.sw && fs.intersectsBox(it.b) && fc.intersectsBox(it.sw);
      it.m.visible = inC || inS;
      if (it.cast) it.m.castShadow = inS;
    }
    for (const G of groups) {
      const on = G.boxes.some((b) => fc.intersectsBox(b)) || (shadows && G.sw.some((b) => fc.intersectsBox(b)));
      for (const ob of v.three.children) if (ob.name === G.name) ob.visible = on;
    }
  });
}
