// Kulissen-Bausteine der Themen der Bonuswelt Stern „Sternenzelt“ (theme_starspace/rainbow/galaxy/woodspace/blockland/
// honeycomb/grotto/fogbog/cosmic/bossblitz.js; Präzisierung „Motor und Bausteine Bonuswelten“): über die Haken
// theme.buildBackdrop(sky, bounds, rnd, yBase) und theme.updateBackdrop(sky, dt, camera) aus Sky.fit/Sky.update gerufen
// (sky.group = fest in der Welt, sky.domeGroup = folgt der Kamera). Je Kulisse wenige verschmolzene Meshes (unbeleuchtet
// bzw. Welt-Material), Bewegtes (Sternschnuppen, Funkeln, Schnee, Lichter) als wenige Objekte. Alles eigene Gestaltung,
// kindgerecht bunt und gut lesbar.
//
//   starDome(sky, rnd, n, o)                 Sternenkugel rundum (auch unten – für die Draufsicht), funkelt
//   shootingStars(sky, rnd, n, o)            Sternschnuppen (eine LineSegments mit Kopf und Schweif), ziehen und verblassen
//   pastelNebulae(sky, list)                 weiche Nebel in Pastellfarben (Kuppel)
//   rainbowArcs(sky, o)                      große Regenbogen-Bögen am Himmel (Kuppel)
//   planetoids(sky, bounds, rnd, yBase, o)   kleine schwebende Planeten mit Grasdecke, Bäumchen und Ringen rund ums Level
//   woodDrift(sky, bounds, rnd, yBase, o)    treibende Holzbalken, Kisten und Walzen im All
//   blockScape(sky, bounds, rnd, yBase, o)   Riesenblock-Landschaft: bunte Riesenblöcke, runde Hügel, Retro-Wolken und -Büsche
//   honeyDeep(sky, bounds, rnd, yBase, o)    Wabengitter tief unten, Honig-Tropfen und Planeten (Draufsicht)
//   jungleGiants(sky, bounds, rnd, yBase, o) Riesendschungel: übergroße Blätter, Riesenpilze, Stämme, Lianen
//   snowGraveyard(sky, bounds, rnd, yBase, o) verschneiter Friedhof: Schneehügel, Grabsteine, kahle Bäume, Irrlichter
//   cosmicStation(sky, bounds, rnd, yBase, o) futuristische Raumstation: Neon-Ringe, Türme, Gitter, Lichtstrahlen
//   arenaNight(sky, bounds, rnd, yBase, o)   Nacht-Arena im All: Lichtmasten im Ring, Scheinwerfer-Kegel, großer Mond
//   animateStar(f, dt, camera)               gemeinsamer Animations-Haken (f = sky.star)

import * as THREE from 'three';
import { colorize, merge, lin, mixc, smooth, Rnd } from '../../three/world/geometry.js';
import { nebulae, farPlanets } from './backdrop_w2.js';
import { embers, animateEmbers } from './backdrop_w7.js';

const TAU = Math.PI * 2;
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const C = (h) => lin(h);
const fill = (g, col) => { const c = Array.isArray(col) ? col : C(col); return colorize(ni(g), (p, n, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }); };
const shade = (g, lo, hi, a = -0.6, b = 0.8) => { const L = Array.isArray(lo) ? lo : C(lo), H = Array.isArray(hi) ? hi : C(hi); return colorize(ni(g), (p, n, o) => mixc(L, H, smooth(a, b, n.y * 0.6 + n.z * 0.3 - n.x * 0.2), o)); };
const basic = (sky, extra = {}) => sky.track(new THREE.MeshBasicMaterial({ vertexColors: true, fog: true, ...extra }));
const world = (sky, extra = {}) => sky.track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, ...extra }));

function addMesh(sky, g, mat, parent = sky.group, order = 0) {
  if (!g) return null;
  const mesh = new THREE.Mesh(sky.track(g), mat);
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  mesh.renderOrder = order;
  mesh.frustumCulled = parent !== sky.domeGroup;
  parent.add(mesh);
  return mesh;
}

/** Punkte rund um den Level (links, rechts, hinten) im Abstand near … far. */
function* around(bounds, rnd, n, near, far) {
  const x0 = bounds.min.x, x1 = bounds.max.x, z0 = bounds.min.z, z1 = bounds.max.z;
  for (let i = 0; i < n; i++) {
    const k = i % 5;
    if (k === 4) yield { x: rnd.real(x0 - far, x1 + far), z: z0 - rnd.real(near, far) };
    else { const s = k % 2 ? 1 : -1; yield { x: s < 0 ? x0 - rnd.real(near, far) : x1 + rnd.real(near, far), z: rnd.real(z0 - far * 0.5, z1 + near) }; }
  }
}

function canvasTex(sky, size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = sky.track(new THREE.CanvasTexture(c));
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const softDot = (sky) => canvasTex(sky, 64, (g, s) => {
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
});

/** Leuchtpunkte (eine Points-Wolke, additiv) in der Welt bzw. Kuppel. */
function glowDots(sky, list, o = {}) {
  if (!list.length) return null;
  const pos = new Float32Array(list.length * 3), col = new Float32Array(list.length * 3);
  list.forEach((p, i) => {
    pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
    const c = new THREE.Color(p.c ?? o.color ?? 0xffffff);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = sky.track(new THREE.PointsMaterial({ size: o.size ?? 2.5, map: softDot(sky), vertexColors: true, transparent: true, opacity: o.opacity ?? 0.9, depthWrite: false, blending: THREE.AdditiveBlending, fog: o.fog ?? true, sizeAttenuation: o.attenuate ?? true }));
  const pts = new THREE.Points(sky.track(g), mat);
  pts.frustumCulled = false;
  pts.renderOrder = o.order ?? 3;
  (o.parent ?? sky.group).add(pts);
  return { pts, base: mat.opacity, t: 0, blink: o.blink ?? 0 };
}

// ===================================================================== Himmel (Kuppel)

/** Sterne gleichmäßig auf der ganzen Kugel (Draufsicht sieht nach unten), farbig getönt, funkeln. */
export function starDome(sky, rnd, n = 1200, o = {}) {
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const tints = (o.tints ?? [0xffffff, 0xd8e4ff, 0xffe8d0, 0xf0d8ff, 0xd0fff0]).map((c) => new THREE.Color(c));
  const lo = o.below ?? -1;
  for (let i = 0; i < n; i++) {
    const u = rnd.real(lo, 1), a = rnd.real(0, TAU), r = Math.sqrt(1 - u * u);
    pos[i * 3] = Math.cos(a) * r * 300; pos[i * 3 + 1] = u * 300; pos[i * 3 + 2] = Math.sin(a) * r * 300;
    const c = tints[i % tints.length], k = rnd.real(0.5, 1);
    col[i * 3] = c.r * k; col[i * 3 + 1] = c.g * k; col[i * 3 + 2] = c.b * k;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = sky.track(new THREE.PointsMaterial({ size: o.size ?? 2.4, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false, transparent: true, map: softDot(sky) }));
  const pts = new THREE.Points(sky.track(g), mat);
  pts.frustumCulled = false;
  pts.renderOrder = -9;
  sky.domeGroup.add(pts);
  return { pts, size: o.size ?? 2.4 };
}

/** Sternschnuppen: n Streifen (Kopf hell, Schweif verblassend) in der Kuppel, die nacheinander ziehen. */
export function shootingStars(sky, rnd, n = 4, o = {}) {
  const pos = new Float32Array(n * 6), col = new Float32Array(n * 6);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = sky.track(new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  const lines = new THREE.LineSegments(sky.track(g), mat);
  lines.frustumCulled = false;
  lines.renderOrder = -8;
  sky.domeGroup.add(lines);
  const tint = (o.tints ?? [0xffffff, 0xffe8a0, 0xa8e0ff, 0xffb8e8]).map((c) => new THREE.Color(c));
  const streaks = Array.from({ length: n }, (_, i) => ({ i, t: -rnd.real(0, 4) - i * 1.3, dur: rnd.real(0.9, 1.6), rnd: new Rnd(77 + i * 31), c: tint[i % tint.length] }));
  return { lines, streaks, every: o.every ?? 2.6 };
}

function placeStreak(f, s) {
  const r = s.rnd;
  const az = r.real(-1.2, 1.2) - Math.PI / 2, el = r.real(0.18, 0.62);
  s.a = new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)).multiplyScalar(290);
  const dir = new THREE.Vector3(r.real(-1, 1), r.real(-0.7, -0.25), r.real(-0.3, 0.3)).normalize();
  s.d = dir.multiplyScalar(r.real(55, 90));
}

/** Weiche Nebel in Pastellfarben (Liste wie nebulae: { dir, size, color, aspect }). */
export function pastelNebulae(sky, list) { return nebulae(sky, list); }

/** Regenbogen-Bögen am Himmel (Kuppel): halbe Ringe mit sieben Farbbändern. */
export function rainbowArcs(sky, o = {}) {
  const parts = [];
  const cols = (o.colors ?? [0xff5a6a, 0xff9a3a, 0xffd23a, 0x5ad86a, 0x3ab8ff, 0x6a7aff, 0xc86aff]).map(C);
  for (const arc of o.arcs ?? [{ dir: [-0.3, 0.05, -1], r: 140, w: 26 }]) {
    const d = new THREE.Vector3(...arc.dir).normalize().multiplyScalar(arc.dist ?? 280);
    const g = new THREE.RingGeometry(arc.r - arc.w, arc.r, 64, 7, 0, Math.PI);
    g.lookAt(d.clone().negate());
    g.translate(d.x, d.y + (arc.lift ?? -30), d.z);
    parts.push(colorize(ni(g), (p, n, out) => {
      const lp = p.clone().sub(new THREE.Vector3(d.x, d.y + (arc.lift ?? -30), d.z));
      const rr = lp.length();
      const k = Math.min(6, Math.max(0, Math.floor(((arc.r - rr) / arc.w) * 7)));
      const c = cols[k];
      out[0] = c[0]; out[1] = c[1]; out[2] = c[2];
    }));
  }
  const mat = sky.track(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: o.opacity ?? 0.55, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  return addMesh(sky, merge(parts), mat, sky.domeGroup, -8);
}

// ===================================================================== Planetoiden

/** Kleine Planeten mit Grasdecke rund ums Level: Kugel + Grashaube + ein, zwei Bäumchen bzw. Ring; verschmolzen. */
export function planetoids(sky, bounds, rnd, yBase, o = {}) {
  const parts = [];
  const pal = o.palette ?? [[0x8ad85a, 0xc89a6a], [0xffb0d0, 0xa87ab8], [0x8ac8ff, 0x6a7ab8], [0xffe07a, 0xd8905a], [0xb8f0d8, 0x7ab0a0]];
  const n = o.n ?? 16;
  let i = 0;
  for (const q of around(bounds, rnd, n, o.near ?? 26, o.far ?? 90)) {
    const r = rnd.real(3, 9) * (o.scale ?? 1);
    const y = yBase + rnd.real(-25, 30);
    const [top, side] = pal[i++ % pal.length].map(C);
    const g = new THREE.SphereGeometry(r, 18, 12);
    g.translate(q.x, y, q.z);
    parts.push(colorize(ni(g), (p, n, out) => { const k = smooth(0.25, 0.55, n.y); mixc(mixc(side, [0.15, 0.12, 0.25], 0.25 * (1 - n.y), [0, 0, 0]), top, k, out); }));
    if (rnd.chance(0.6)) {
      const tr = new THREE.CylinderGeometry(0.25 * r * 0.12 + 0.2, 0.35, r * 0.5, 6);
      tr.translate(q.x + r * 0.15, y + r + r * 0.2, q.z);
      parts.push(fill(tr, 0x8a5a3a));
      const cr = new THREE.SphereGeometry(r * 0.32, 10, 8);
      cr.translate(q.x + r * 0.15, y + r + r * 0.55, q.z);
      parts.push(shade(cr, 0x3aa84a, 0x8ae86a));
    }
    if (rnd.chance(0.35)) {
      const ring = new THREE.TorusGeometry(r * 1.55, r * 0.08, 4, 32);
      ring.rotateX(Math.PI / 2 + rnd.real(-0.4, 0.4)); ring.rotateZ(rnd.real(-0.3, 0.3));
      ring.translate(q.x, y, q.z);
      parts.push(fill(ring, rnd.pick([0xfff0a0, 0xffc8e8, 0xc8e8ff])));
    }
  }
  return addMesh(sky, merge(parts), world(sky, { roughness: 0.7, emissive: 0x161028 }));
}

/** Treibende Holzteile im All (Balken, Kisten, kleine Walzen) – Holz-Athletik. */
export function woodDrift(sky, bounds, rnd, yBase, o = {}) {
  const parts = [];
  for (const q of around(bounds, rnd, o.n ?? 26, 18, 80)) {
    const y = yBase + rnd.real(-20, 25);
    const k = rnd.int(0, 2);
    let g;
    if (k === 0) { g = new THREE.BoxGeometry(rnd.real(4, 9), 0.6, 1.2); g.rotateY(rnd.real(0, TAU)); g.rotateZ(rnd.real(-0.5, 0.5)); }
    else if (k === 1) { const s = rnd.real(1.4, 3); g = new THREE.BoxGeometry(s, s, s); g.rotateY(rnd.real(0, 1)); g.rotateX(rnd.real(0, 1)); }
    else { g = new THREE.CylinderGeometry(rnd.real(0.8, 1.8), rnd.real(0.8, 1.8), rnd.real(3, 7), 12); g.rotateZ(Math.PI / 2); g.rotateY(rnd.real(0, TAU)); }
    g.translate(q.x, y, q.z);
    parts.push(colorize(ni(g), (p, n, out) => { const w = Math.sin(p.x * 3.1 + p.y * 1.7 + p.z * 2.3) * 0.5 + 0.5; mixc(C(0x9a5e2a), C(0xe0a868), 0.4 + w * 0.3 + smooth(-0.5, 0.9, n.y) * 0.3, out); }));
  }
  return addMesh(sky, merge(parts), world(sky, { roughness: 0.85, emissive: 0x1a0e04 }));
}

// ===================================================================== Blockland

/** Riesenblock-Landschaft (eigene Retro-Gestaltung): bunte Riesenblöcke mit Nieten-Ecken, runde Hügel mit Augen-Punkten,
 *  Retro-Wolken (aus Kugeln) und Büsche – auf einer weiten Wiese weit unter dem Level. */
export function blockScape(sky, bounds, rnd, yBase, o = {}) {
  const parts = [], clouds = [];
  const gy = yBase + (o.y ?? -18);
  const cols = [0xff6a3a, 0x3ab8ff, 0xffd23a, 0x5ad86a, 0xff7ad8, 0xffffff];
  for (const q of around(bounds, rnd, o.n ?? 30, 16, 110)) {
    const s = rnd.real(4, 11), h = s * rnd.int(1, 3);
    const c = rnd.pick(cols);
    const g = new THREE.BoxGeometry(s, h, s);
    g.translate(q.x, gy + h / 2, q.z);
    parts.push(colorize(ni(g), (p, n, out) => { const base = C(c); const k = n.y > 0.5 ? 1.08 : n.y < -0.5 ? 0.6 : (Math.abs(n.x) > 0.5 ? 0.8 : 0.92); const edge = (Math.abs(((p.y - gy) % s) - s / 2) > s / 2 - 0.25) ? 0.82 : 1; out[0] = base[0] * k * edge; out[1] = base[1] * k * edge; out[2] = base[2] * k * edge; }));
  }
  // runde Hügel mit Gesichtspunkten (zwei Augen) – eigene Form, kein Vorbild
  for (const q of around(bounds, rnd, 10, 40, 140)) {
    const r = rnd.real(14, 26);
    const g = new THREE.SphereGeometry(r, 20, 12, 0, TAU, 0, Math.PI / 2);
    g.scale(1, rnd.real(0.9, 1.5), 1);
    g.translate(q.x, gy, q.z);
    parts.push(colorize(ni(g), (p, n, out) => mixc(C(0x3aa84a), C(0x8ae86a), smooth(0, 1, n.y), out)));
  }
  // Wiese
  const pl = new THREE.PlaneGeometry(bounds.max.x - bounds.min.x + 500, bounds.max.z - bounds.min.z + 500);
  pl.rotateX(-Math.PI / 2); pl.translate((bounds.min.x + bounds.max.x) / 2, gy, (bounds.min.z + bounds.max.z) / 2);
  parts.push(colorize(ni(pl), (p, n, out) => { const k = ((Math.floor(p.x / 8) + Math.floor(p.z / 8)) & 1) ? 1 : 0.92; const c = C(0x6ad84a); out[0] = c[0] * k; out[1] = c[1] * k; out[2] = c[2] * k; }));
  // Retro-Wolken: drei Kugeln in einer Reihe mit flacher Unterseite
  for (const q of around(bounds, rnd, 14, 10, 90)) {
    const y = yBase + rnd.real(12, 30), s = rnd.real(2.2, 4);
    for (let k = -1; k <= 1; k++) {
      const g = new THREE.SphereGeometry(s * (k === 0 ? 1.2 : 0.95), 12, 8);
      g.translate(q.x + k * s * 1.3, y + (k === 0 ? s * 0.3 : 0), q.z);
      clouds.push(colorize(ni(g), (p, n, out) => mixc(C(0xd8e8ff), C(0xffffff), smooth(-0.6, 0.3, n.y), out)));
    }
  }
  const mesh = addMesh(sky, merge(parts), world(sky, { roughness: 0.6 }));
  const cm = addMesh(sky, merge(clouds), basic(sky));
  return { mesh, clouds: cm };
}

// ===================================================================== Waben (Draufsicht)

/** Tief unten ein leuchtendes Wabengitter (Linien), Honig-Tropfen und Planeten – für die Kamera von oben. */
export function honeyDeep(sky, bounds, rnd, yBase, o = {}) {
  const y = yBase + (o.y ?? -40);
  const cx = (bounds.min.x + bounds.max.x) / 2, cz = (bounds.min.z + bounds.max.z) / 2;
  const W = bounds.max.x - bounds.min.x + 240, D = bounds.max.z - bounds.min.z + 240;
  const R = o.cell ?? 9, ri = (Math.sqrt(3) / 2) * R;
  const pos = [];
  for (let row = 0; row * 1.5 * R < D; row++) {
    for (let col = 0; col * 2 * ri < W; col++) {
      const x = cx - W / 2 + col * 2 * ri + (row % 2 ? ri : 0), z = cz - D / 2 + row * 1.5 * R;
      for (let k = 0; k < 6; k++) {
        const a0 = (k / 6) * TAU + Math.PI / 6, a1 = ((k + 1) / 6) * TAU + Math.PI / 6;
        pos.push(x + Math.cos(a0) * R, y, z + Math.sin(a0) * R, x + Math.cos(a1) * R, y, z + Math.sin(a1) * R);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const mat = sky.track(new THREE.LineBasicMaterial({ color: o.color ?? 0xffc83a, transparent: true, opacity: 0.45, fog: true }));
  const lines = new THREE.LineSegments(sky.track(g), mat);
  lines.frustumCulled = false;
  sky.group.add(lines);
  const drops = [];
  for (let i = 0; i < 60; i++) drops.push({ x: cx + rnd.real(-W / 2, W / 2), y: y + rnd.real(2, 30), z: cz + rnd.real(-D / 2, D / 2), c: rnd.pick([0xffd23a, 0xffb02a, 0xfff0a0]) });
  const glow = glowDots(sky, drops, { size: 3.2, opacity: 0.8, blink: 1 });
  return { lines, mat, glow };
}

// ===================================================================== Riesendschungel

/** Übergroßer Dschungel: Riesenblätter, Riesenpilze, dicke Stämme mit Lianen (rund ums Level, vom Boden tief unten). */
export function jungleGiants(sky, bounds, rnd, yBase, o = {}) {
  const parts = [];
  const gy = yBase + (o.y ?? -14);
  for (const q of around(bounds, rnd, o.n ?? 26, 14, 80)) {
    const kind = rnd.int(0, 2);
    if (kind === 0) {
      // Riesenstamm mit Blätterkrone
      const h = rnd.real(30, 55), r = rnd.real(2.2, 4.2);
      const t = new THREE.CylinderGeometry(r * 0.8, r * 1.25, h, 10);
      t.translate(q.x, gy + h / 2, q.z);
      parts.push(colorize(ni(t), (p, n, out) => mixc(C(0x5a3a22), C(0x9a6a3a), 0.4 + 0.3 * Math.sin(p.y * 0.8 + Math.atan2(n.z, n.x) * 3), out)));
      for (let k = 0; k < 5; k++) {
        const s = new THREE.SphereGeometry(rnd.real(6, 10), 10, 7);
        s.scale(1, 0.55, 1);
        s.translate(q.x + rnd.real(-6, 6), gy + h + rnd.real(-3, 4), q.z + rnd.real(-6, 6));
        parts.push(shade(s, 0x1a7a3a, 0x6ad86a));
      }
    } else if (kind === 1) {
      // Riesenpilz (gepunkteter Hut)
      const h = rnd.real(8, 18), r = rnd.real(5, 10);
      const st = new THREE.CylinderGeometry(r * 0.22, r * 0.3, h, 10);
      st.translate(q.x, gy + h / 2, q.z);
      parts.push(shade(st, 0xd8c8a8, 0xfff4e0));
      const cap = new THREE.SphereGeometry(r, 16, 8, 0, TAU, 0, Math.PI / 2);
      cap.scale(1, 0.6, 1); cap.translate(q.x, gy + h - 0.4, q.z);
      const hc = rnd.pick([0xff5a4a, 0xff9a3a, 0xa86aff, 0x3ab8ff]);
      parts.push(colorize(ni(cap), (p, n, out) => { const dot = Math.sin(p.x * 0.9) * Math.sin(p.z * 0.9) > 0.55; const c = dot ? C(0xffffff) : C(hc); const k = 0.75 + 0.25 * n.y; out[0] = c[0] * k; out[1] = c[1] * k; out[2] = c[2] * k; }));
    } else {
      // Riesenblatt (gebogene, flache Ellipse am Stiel)
      const L = rnd.real(12, 22);
      const g = new THREE.SphereGeometry(1, 14, 6);
      g.scale(L * 0.3, 0.25, L * 0.5);
      g.rotateX(rnd.real(-0.6, -0.2)); g.rotateY(rnd.real(0, TAU));
      g.translate(q.x, gy + rnd.real(6, 20), q.z);
      parts.push(colorize(ni(g), (p, n, out) => mixc(C(0x2a9a4a), C(0x9af07a), smooth(-0.4, 0.9, n.y) * 0.8 + (Math.abs(Math.sin(p.x * 0.6 + p.z * 0.6)) < 0.08 ? 0.3 : 0), out)));
    }
  }
  // Lianen (dünne Zylinder) vom Himmel
  for (const q of around(bounds, rnd, 14, 8, 40)) {
    const h = rnd.real(18, 34);
    const v = new THREE.CylinderGeometry(0.18, 0.18, h, 5);
    v.translate(q.x, yBase + 26 - h / 2, q.z);
    parts.push(fill(v, 0x3a8a3a));
  }
  return addMesh(sky, merge(parts), world(sky, { roughness: 0.8 }));
}

// ===================================================================== Verschneiter Spukfriedhof

/** Schneehügel, Grabsteine, kahle Bäume, Laternen und Irrlichter (sanft, nicht gruselig) rund ums Level. */
export function snowGraveyard(sky, bounds, rnd, yBase, o = {}) {
  const parts = [];
  const gy = yBase + (o.y ?? -3);
  const pl = new THREE.PlaneGeometry(bounds.max.x - bounds.min.x + 400, bounds.max.z - bounds.min.z + 400, 1, 1);
  pl.rotateX(-Math.PI / 2); pl.translate((bounds.min.x + bounds.max.x) / 2, gy - 0.5, (bounds.min.z + bounds.max.z) / 2);
  parts.push(fill(pl, 0xdfe6f4));
  for (const q of around(bounds, rnd, 14, 18, 90)) {
    const r = rnd.real(8, 18);
    const g = new THREE.SphereGeometry(r, 14, 8, 0, TAU, 0, Math.PI / 2);
    g.scale(1, rnd.real(0.35, 0.7), 1); g.translate(q.x, gy - 0.5, q.z);
    parts.push(shade(g, 0xb8c4e0, 0xffffff));
  }
  const lights = [];
  for (const q of around(bounds, rnd, o.n ?? 40, 5, 45)) {
    const k = rnd.int(0, 3);
    if (k <= 1) {
      // Grabstein (runder Kopf) mit Schneehaube
      const w = rnd.real(0.9, 1.6), h = rnd.real(1.2, 2.2);
      const b = new THREE.BoxGeometry(w, h, 0.35); b.translate(0, h / 2, 0);
      const top = new THREE.CylinderGeometry(w / 2, w / 2, 0.35, 12, 1, false, 0, Math.PI); top.rotateX(Math.PI / 2); top.rotateZ(-Math.PI / 2); top.rotateY(Math.PI / 2); top.translate(0, h, 0);
      const cap = new THREE.SphereGeometry(w * 0.5, 10, 6, 0, TAU, 0, Math.PI / 2); cap.scale(1.05, 0.35, 0.6); cap.translate(0, h + w * 0.42, 0);
      const yaw = rnd.real(-0.3, 0.3), tilt = rnd.real(-0.12, 0.12);
      for (const [g, c0, c1] of [[b, 0x7a809a, 0xb8c0d8], [top, 0x7a809a, 0xb8c0d8], [cap, 0xe8eeff, 0xffffff]]) {
        g.rotateZ(tilt); g.rotateY(yaw); g.translate(q.x, gy, q.z);
        parts.push(shade(g, c0, c1));
      }
    } else if (k === 2) {
      // kahler Baum (Stamm + drei Äste)
      const h = rnd.real(4, 7);
      const t = new THREE.CylinderGeometry(0.2, 0.35, h, 6); t.translate(q.x, gy + h / 2, q.z);
      parts.push(fill(t, 0x4a3a4a));
      for (let i = 0; i < 3; i++) {
        const a = new THREE.CylinderGeometry(0.06, 0.14, h * 0.45, 5);
        a.translate(0, h * 0.22, 0); a.rotateZ((i - 1) * 0.9 + rnd.real(-0.2, 0.2)); a.rotateY(rnd.real(0, TAU));
        a.translate(q.x, gy + h * (0.55 + i * 0.12), q.z);
        parts.push(fill(a, 0x4a3a4a));
      }
    } else {
      // Laterne (Pfahl) mit warmem Licht
      const t = new THREE.CylinderGeometry(0.08, 0.1, 2.6, 6); t.translate(q.x, gy + 1.3, q.z);
      parts.push(fill(t, 0x3a3a4a));
      lights.push({ x: q.x, y: gy + 2.7, z: q.z, c: 0xffd890 });
    }
  }
  // Irrlichter (bläulich-türkis, schweben)
  const wisps = [];
  for (const q of around(bounds, rnd, 18, 4, 30)) wisps.push({ x: q.x, y: gy + rnd.real(1.5, 5), z: q.z, c: rnd.pick([0x9af0ff, 0xc8b0ff, 0xb0ffd8]) });
  const mesh = addMesh(sky, merge(parts), world(sky, { roughness: 0.9 }));
  return { mesh, lamps: glowDots(sky, lights, { size: 2.2, opacity: 0.9 }), wisps: glowDots(sky, wisps, { size: 1.6, opacity: 0.85, blink: 1 }), snow: embers(sky, rnd, { n: 260, box: [44, 22, 44], colors: [0xffffff, 0xeef4ff], size: 0.16, flow: [0.25, -1.4, 0.1], sway: 0.6, additive: false, opacity: 0.85 }) };
}

// ===================================================================== Futuristischer Weltraum

/** Raumstation: Neon-Ringe, schlanke Türme mit Leuchtköpfen, Gitterflächen, Lichtstrahlen – rund ums Level. */
export function cosmicStation(sky, bounds, rnd, yBase, o = {}) {
  const parts = [], neon = [];
  const neonCols = [0x3af0ff, 0xff4ad8, 0x8aff6a, 0xffd23a];
  for (const q of around(bounds, rnd, o.n ?? 22, 18, 100)) {
    const k = rnd.int(0, 2);
    const y = yBase + rnd.real(-30, 10);
    if (k === 0) {
      const r = rnd.real(8, 18);
      const ring = new THREE.TorusGeometry(r, r * 0.06, 6, 40);
      ring.rotateX(rnd.real(0, 1.2)); ring.rotateY(rnd.real(0, TAU)); ring.translate(q.x, y + r, q.z);
      neon.push(fill(ring, rnd.pick(neonCols)));
      const hub = new THREE.SphereGeometry(r * 0.25, 12, 8); hub.translate(q.x, y + r, q.z);
      parts.push(shade(hub, 0x3a3e5a, 0xc8d0e8));
    } else if (k === 1) {
      const h = rnd.real(20, 45);
      const t = new THREE.CylinderGeometry(0.8, 2.2, h, 8); t.translate(q.x, y + h / 2, q.z);
      parts.push(shade(t, 0x2a2e48, 0xa8b0d0));
      const head = new THREE.OctahedronGeometry(2.2); head.translate(q.x, y + h + 2, q.z);
      neon.push(fill(head, rnd.pick(neonCols)));
    } else {
      const w = rnd.real(14, 28);
      const plate = new THREE.BoxGeometry(w, 0.6, w * 0.6); plate.rotateY(rnd.real(0, TAU)); plate.translate(q.x, y, q.z);
      parts.push(colorize(ni(plate), (p, n, out) => { const grid = (Math.abs(Math.sin(p.x * 1.2)) < 0.12 || Math.abs(Math.sin(p.z * 1.2)) < 0.12) && n.y > 0.5; const c = grid ? C(0x3af0ff) : C(0x3a3e5a); out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; }));
    }
  }
  // Lichtstrahlen (schmale, durchscheinende Säulen)
  const beams = [];
  for (const q of around(bounds, rnd, 8, 20, 70)) {
    const b = new THREE.CylinderGeometry(0.6, 1.6, 120, 8, 1, true); b.translate(q.x, yBase + 40, q.z);
    beams.push(fill(b, rnd.pick(neonCols)));
  }
  const mesh = addMesh(sky, merge(parts), world(sky, { roughness: 0.4, metalness: 0.3 }));
  const nm = addMesh(sky, merge(neon), basic(sky));
  const bm = addMesh(sky, merge(beams), basic(sky, { transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), sky.group, 5);
  return { mesh, neon: nm, beams: bm, beamMat: bm?.material };
}

// ===================================================================== Nacht-Arena

/** Nacht-Arena im All: Lichtmasten im Ring um die Levelmitte, Scheinwerfer-Kegel, schwebende Tribünen-Ringe. */
export function arenaNight(sky, bounds, rnd, yBase, o = {}) {
  const parts = [], lamps = [], cones = [];
  const cx = (bounds.min.x + bounds.max.x) / 2, cz = (bounds.min.z + bounds.max.z) / 2;
  const R = Math.max(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z) / 2 + (o.margin ?? 24);
  const n = o.n ?? 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, x = cx + Math.cos(a) * R, z = cz + Math.sin(a) * R;
    const h = 22;
    const m = new THREE.CylinderGeometry(0.5, 1, h, 8); m.translate(x, yBase - 6 + h / 2, z);
    parts.push(shade(m, 0x3a3e5a, 0x9aa0c0));
    const head = new THREE.BoxGeometry(3, 1.4, 1.4); head.lookAt(new THREE.Vector3(cx - x, 0, cz - z)); head.translate(x, yBase - 6 + h + 0.7, z);
    parts.push(shade(head, 0x2a2e48, 0x6a7090));
    lamps.push({ x, y: yBase - 6 + h + 0.8, z, c: i % 2 ? 0xfff0c0 : 0xc8e0ff });
    // Lichtkegel zur Mitte
    const L = Math.hypot(cx - x, cz - z) * 0.8;
    const c = new THREE.ConeGeometry(L * 0.18, L, 16, 1, true);
    c.translate(0, -L / 2, 0);
    c.rotateX(-Math.atan2(L, h * 0.9) + Math.PI / 2);
    c.rotateY(Math.atan2(cx - x, cz - z));
    c.translate(x, yBase - 6 + h, z);
    cones.push(fill(c, i % 2 ? 0xfff0c0 : 0xa8c8ff));
  }
  // schwebende Ringe (Tribünen-Andeutung)
  for (let k = 0; k < 2; k++) {
    const t = new THREE.TorusGeometry(R + 10 + k * 16, 1.2, 6, 64); t.rotateX(Math.PI / 2); t.translate(cx, yBase - 14 - k * 8, cz);
    parts.push(fill(t, k ? 0x5a4ab8 : 0x3a6ad8));
  }
  const mesh = addMesh(sky, merge(parts), world(sky, { roughness: 0.5, metalness: 0.2 }));
  const cm = addMesh(sky, merge(cones), basic(sky, { transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), sky.group, 5);
  return { mesh, cones: cm, coneMat: cm?.material, lamps: glowDots(sky, lamps, { size: 5, opacity: 0.95 }) };
}

// ===================================================================== Animation

const _v = new THREE.Vector3();
/** Gemeinsamer Animations-Haken der Stern-Kulissen (f = { stars, shooting, dots[], embers[], t, …}). */
export function animateStar(f, dt, camera) {
  if (!f) return;
  const d = Math.min(0.1, dt);
  f.t = (f.t ?? 0) + d;
  if (f.stars) f.stars.pts.material.size = f.stars.size + Math.sin(f.t * 1.6) * 0.3;
  const S = f.shooting;
  if (S) {
    const pos = S.lines.geometry.attributes.position.array, col = S.lines.geometry.attributes.color.array;
    for (const s of S.streaks) {
      s.t += d;
      if (s.t >= s.dur) { s.t = -S.every * (0.6 + s.rnd.frac()); placeStreak(S, s); }
      if (!s.a) placeStreak(S, s);
      const u = Math.max(0, s.t) / s.dur, on = s.t > 0;
      const head = _v.copy(s.a).addScaledVector(s.d, u);
      const i = s.i * 6;
      pos[i] = head.x; pos[i + 1] = head.y; pos[i + 2] = head.z;
      const tail = head.clone().addScaledVector(s.d, -0.35);
      pos[i + 3] = tail.x; pos[i + 4] = tail.y; pos[i + 5] = tail.z;
      const k = on ? Math.sin(Math.PI * u) : 0;
      col[i] = s.c.r * k; col[i + 1] = s.c.g * k; col[i + 2] = s.c.b * k;
      col[i + 3] = 0; col[i + 4] = 0; col[i + 5] = 0;
    }
    S.lines.geometry.attributes.position.needsUpdate = true;
    S.lines.geometry.attributes.color.needsUpdate = true;
  }
  for (const L of f.dots ?? []) {
    if (!L) continue;
    L.t += d;
    L.pts.material.opacity = L.base * (L.blink ? 0.7 + 0.3 * Math.sin(L.t * (1.8 + L.blink)) : 1);
  }
  for (const e of f.embers ?? []) animateEmbers(e, dt, camera);
  if (f.beamMat) f.beamMat.opacity = 0.1 + 0.04 * Math.sin(f.t * 1.3);
  if (f.coneMat) f.coneMat.opacity = 0.07 + 0.025 * Math.sin(f.t * 0.9);
  if (f.honeyMat) f.honeyMat.opacity = 0.38 + 0.12 * Math.sin(f.t * 1.1);
  if (f.spin) for (const s of f.spin) s.m.rotation.y += s.v * d;
}

/** Bequeme Zusammenstellung: Sterne, Sternschnuppen, Nebel, Planeten (Kuppel) → Animationsobjekt. */
export function spaceSky(sky, rnd, o = {}) {
  const f = { dots: [], embers: [] };
  f.stars = o.stars === false ? null : starDome(sky, rnd, o.stars ?? 1300, { below: o.below ?? -1, size: o.starSize ?? 2.4 });
  if (o.nebulae) pastelNebulae(sky, o.nebulae);
  if (o.planets) farPlanets(sky, o.planets);
  if (o.shooting !== 0) f.shooting = shootingStars(sky, rnd, o.shooting ?? 4);
  return f;
}
