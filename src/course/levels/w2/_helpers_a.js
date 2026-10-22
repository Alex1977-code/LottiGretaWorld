// Hilfen für die Level-Daten 2-1 und 2-2 (kein Level: exportiert kein LEVEL, die Level-Registry überspringt dieses
// Modul). Alles liefert reine Daten im Format von docs/KURS-ARCHITEKTUR.md – bis auf die kleinen Szenen-Hilfen am
// Ende (level-lokaler Code, der über eine Aktion aufgerufen wird).

import * as THREE from 'three';
import { modelObject } from '../../blocks/w2kit.js';
import { getBlockType } from '../../blocks/index.js';
import { hex, lin, mixc, colorize, merge } from '../../blocks/kit.js';

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
 * Aufbau-Haken für level-lokalen Code: eine Laterne, die beim Aufbau schon brennt – ihr onLit (Aktion als Funktion,
 * entities/gimmick.js) ruft fn(level) genau einmal auf; danach verschwindet sie (vor dem ersten Bild). hide = Punkt
 * im Inneren eines Felskörpers innerhalb des Level-Umrisses (die Laterne hat kurz eine Kollisionsform, die den
 * Umriss – Kulisse, Absturzhöhe – nicht vergrößern soll). In LEVEL.items eintragen: ...setupHook(fn, hide).
 * (Die Daten-Formate kennen sonst keinen Aufbau-Haken für Parcours-Level.)
 */
export function setupHook(fn, hide = [0, -8, 0]) {
  return [{ kind: 'lantern', pos: hide, lit: true, onLit: (level, ctx) => { ctx?.source?.kill?.(); fn(level); } }];
}

/**
 * Ferne Kulisse ohne Sonnenschatten: baut die Bausteine segs (Level-Format, z. B. deco_w2 mit Felstürmen und Dünen tief
 * unten) so, dass ihre statische Geometrie keinen Schatten wirft – eigener Topf im StaticBatcher, nicht im
 * Schattenpass (spart Dreiecke; die Abschnitte mit Schattenwurf bleiben klein und werden besser ausgesondert).
 * Muss beim Aufbau laufen (setupHook), bevor die statische Geometrie verschmolzen wird.
 */
export function shadowless(level, segs) {
  const v = level.view;
  if (!v) return;
  const orig = v.addStatic;
  v.addStatic = (g, o = {}) => orig.call(v, g, { ...o, castShadow: false });
  try {
    for (const seg of segs) getBlockType(seg.type)?.(level, seg);
  } finally { v.addStatic = orig; }
}

/**
 * Fernsicht:Gegner-Modelle der Arten kinds, die weiter als dist m (waagerecht) von der Figur entfernt sind, werden
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
 * ohne Sonnenschatten (im Aufbau-Haken aufrufen).
 */
export function asteroids(level, list) {
  if (!level.view) return;
  const parts = [];
  let seed = 5;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const [x, y, z, r] of list) {
    const g = new THREE.IcosahedronGeometry(1, 1).toNonIndexed();
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
  level.view.addStatic(merge(parts), { castShadow: false });
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
