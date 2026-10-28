// Kulissen-Bausteine der Welt-7-Themen „Lava-Festung“ (theme_darkruins/lavarun/lavatower/lavamachine/reef/volcano.js): über
// die Haken theme.buildBackdrop(sky, bounds, rnd, yBase) und theme.updateBackdrop(sky, dt, camera) aus Sky.fit/Sky.update
// gerufen (sky.group = fest in der Welt, sky.domeGroup = folgt der Kamera). Je Kulisse wenige verschmolzene Meshes
// (Welt-Material bzw. unbeleuchtet/glühend), Bewegtes (Lava-Fluss im Shader, Funken, Rauch, Zahnräder, Kolben, Blasen) als
// wenige Objekte. Jede Funktion liefert ein Objekt für ihre animate…-Funktion (oder null).
//
//   flowLava(sky, bounds, y, o)        Lavasee tief unten (Shader: wandernde Adern, Fluss flow [vx, vz] m/s), Farbe rot|blau
//   darkTemple(sky, bounds, rnd, yBase, o)    unterirdischer Tempel: Säulenring, Bögen, Tropfsteine, Fackel-Glühen
//   lavaRunway(sky, bounds, rnd, yBase, o)    Sprintstrecke: Basaltsäulen am Rand, Vulkane mit Glut, Funkenstrom
//   lavaTowerPit(sky, bounds, rnd, yBase, o)  Turm im Lavasee: Rundmauer mit Fenstern, Ketten, Giftnebel-Decke
//   lavaMachine(sky, bounds, rnd, yBase, o)   Maschinen in Lava: Zahnräder (drehen), Kolben (pumpen), Rohre, Schlote
//   volcanoReef(sky, bounds, rnd, yBase, o)   Vulkan-Riff unter Wasser: Meeresboden, Korallen, glühende Schlote, Blasen
//   volcanoCrater(sky, bounds, rnd, yBase, o) Vulkan-Krater: Kraterwand mit Glutadern, ferne Fontänen, Rauchsäulen
//   embers(sky, rnd, o) / animateEmbers(f, dt, camera)   Funken/Asche/Blasen, die um die Kamera strömen (auch rückwärts:
//                                      flow [vx, vy, vz] m/s – Funkenstrom der Sprintstrecke)

import * as THREE from 'three';
import { colorize, merge, lin, mixc, smooth } from '../../three/world/geometry.js';
import { gearGeo } from './backdrop_w6.js';

function addMesh(sky, g, mat, parent = sky.group, order = 0) {
  if (!g) return null;
  const mesh = new THREE.Mesh(sky.track(g), mat);
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  mesh.renderOrder = order;
  parent.add(mesh);
  return mesh;
}
const basic = (sky, extra = {}) => sky.track(new THREE.MeshBasicMaterial({ vertexColors: true, fog: true, ...extra }));
const sides = (b) => ({ x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z });
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const TAU = Math.PI * 2;

/** Punkte rund um den Level (links, rechts, hinten), Abstand zum Umriss near … far. */
function* ringSpots(bounds, rnd, n, near, far) {
  const { x0, x1, z0, z1 } = sides(bounds);
  for (let i = 0; i < n; i++) {
    const k = i % 5;
    if (k === 4) yield { x: rnd.real(x0 - far, x1 + far), z: z0 - rnd.real(near, far) };
    else { const s = k % 2 ? 1 : -1; yield { x: s < 0 ? x0 - rnd.real(near, far) : x1 + rnd.real(near, far), z: rnd.real(z0 - far * 0.6, z1 + near) }; }
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
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
});
const smokeTex = (sky) => canvasTex(sky, 128, (g, s) => {
  for (let i = 0; i < 14; i++) {
    const x = s / 2 + Math.sin(i * 2.3) * s * 0.18, y = s / 2 + Math.cos(i * 1.7) * s * 0.18, r = s * (0.18 + (i % 4) * 0.05);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.32)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
  }
});

// ------------------------------------------------------------------ Lava-Fluss (Grund vieler Welt-7-Themen)

const PAL = {
  rot: { deep: 0x6a1004, mid: 0xff5010, hi: 0xffc838, white: 0xfff0b0 },
  blau: { deep: 0x0a1460, mid: 0x2a88ff, hi: 0x9ae8ff, white: 0xf0ffff },
};

/**
 * Glühender Lavasee als große Ebene (unbeleuchtet; Muster im Shader in Weltkoordinaten, fließt mit flow m/s). Die Zeit
 * läuft über animateLava(f, dt). o: { color 'rot'|'blau', flow [vx, vz], scale (Musterdichte), E (Rand m), hole (Level-
 * Umriss aussparen, m) }.
 */
export function flowLava(sky, bounds, y, o = {}) {
  const { x0, x1, z0, z1 } = sides(bounds);
  const E = o.E ?? 420;
  const g = new THREE.PlaneGeometry((x1 - x0) + E * 2, (z1 - z0) + E * 2, 1, 1);
  g.rotateX(-Math.PI / 2);
  g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  const pal = PAL[o.color === 'blau' ? 'blau' : 'rot'];
  const U = {
    uTime: { value: 0 }, uFlow: { value: new THREE.Vector2(...(o.flow ?? [0.15, 0.4])) }, uScale: { value: o.scale ?? 0.09 },
    uDeep: { value: new THREE.Color(pal.deep) }, uMid: { value: new THREE.Color(pal.mid) }, uHi: { value: new THREE.Color(pal.hi) }, uWhite: { value: new THREE.Color(pal.white) },
  };
  const mat = sky.track(new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true }));
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec3 vB7p;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vB7p = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    sh.fragmentShader = 'uniform float uTime;\nuniform vec2 uFlow;\nuniform float uScale;\nuniform vec3 uDeep;\nuniform vec3 uMid;\nuniform vec3 uHi;\nuniform vec3 uWhite;\nvarying vec3 vB7p;\n'
      + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      vec2 q = (vB7p.xz - uFlow * uTime) * uScale;
      float n1 = sin(q.x * 2.1 + sin(q.y * 1.7 + uTime * 0.25) * 1.8) * 0.5 + sin(q.y * 2.5 + sin(q.x * 1.3 - uTime * 0.2) * 1.5) * 0.5;
      float n2 = sin(q.x * 5.3 + sin(q.y * 2.9) * 1.6 + uTime * 0.3) * sin(q.y * 4.1 + sin(q.x * 2.3) * 1.4 - uTime * 0.2) * 0.5 + 0.5;
      vec3 c7 = mix(uDeep, uMid, smoothstep(-0.9, 0.25, n1));
      c7 = mix(c7, uHi, smoothstep(0.3, 0.95, n1) * 0.85);
      c7 = mix(c7, uWhite, smoothstep(0.87, 1.0, n1) * 0.45);
      c7 = mix(c7, uDeep * 0.55, smoothstep(0.8, 1.0, n2) * smoothstep(0.2, -0.4, n1) * 0.7);
      diffuseColor.rgb = c7;`);
  };
  mat.customProgramCacheKey = () => 'w7backlava';
  addMesh(sky, g, mat, sky.group, -1);
  return { U };
}
export function animateLava(f, dt) { if (f) f.U.uTime.value += Math.min(0.1, dt); }

// ------------------------------------------------------------------ Funken / Asche / Blasen um die Kamera

/**
 * Teilchen in einem Kasten vor der Kamera (wiederholt sich nahtlos), strömen mit flow [vx, vy, vz] m/s (+ Wackeln sway).
 * o: { n, box: [w, h, d], ahead, flow, sway, size, colors, opacity, additive }.
 */
export function embers(sky, rnd, o = {}) {
  const n = o.n ?? 160;
  const [bw, bh, bd] = o.box ?? [44, 24, 44];
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const seeds = [];
  const colors = (o.colors ?? [0xffa030, 0xff6010, 0xffe080]).map((c) => new THREE.Color(c));
  for (let i = 0; i < n; i++) {
    seeds.push({ x: rnd.real(0, bw), y: rnd.real(0, bh), z: rnd.real(0, bd), ph: rnd.real(0, TAU), v: rnd.real(0.7, 1.3) });
    const c = colors[i % colors.length];
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = sky.track(new THREE.PointsMaterial({ size: o.size ?? 0.2, map: softDot(sky), vertexColors: true, transparent: true, opacity: o.opacity ?? 0.9, depthWrite: false, blending: o.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending }));
  const pts = new THREE.Points(sky.track(g), mat);
  pts.frustumCulled = false;
  pts.renderOrder = 4;
  sky.group.add(pts);
  const f = { pts, seeds, box: [bw, bh, bd], ahead: o.ahead ?? 14, flow: o.flow ?? [0, 1.2, 0], sway: o.sway ?? 0.5, t: 0, center: new THREE.Vector3() };
  return f;
}

const _f = new THREE.Vector3();
export function animateEmbers(f, dt, camera) {
  if (!f) return;
  f.t += Math.min(0.1, dt);
  camera.getWorldDirection(_f);
  f.center.copy(camera.position).addScaledVector(_f, f.ahead);
  const [bw, bh, bd] = f.box, [vx, vy, vz] = f.flow;
  const x0 = f.center.x - bw / 2, y0 = f.center.y - bh / 2, z0 = f.center.z - bd / 2;
  const arr = f.pts.geometry.attributes.position.array;
  const t = f.t;
  for (let i = 0; i < f.seeds.length; i++) {
    const s = f.seeds[i];
    const xx = s.x + t * vx * s.v + Math.sin(t * 1.1 * s.v + s.ph) * f.sway;
    const yy = s.y + t * vy * s.v;
    const zz = s.z + t * vz * s.v + Math.cos(t * 0.9 * s.v + s.ph) * f.sway;
    arr[i * 3] = x0 + (((xx - x0) % bw) + bw) % bw;
    arr[i * 3 + 1] = y0 + (((yy - y0) % bh) + bh) % bh;
    arr[i * 3 + 2] = z0 + (((zz - z0) % bd) + bd) % bd;
  }
  f.pts.geometry.attributes.position.needsUpdate = true;
}

// ------------------------------------------------------------------ Fackel-Glühen (Punkte, flackern gemeinsam)

function glowPoints(sky, list, o = {}) {
  if (!list.length) return null;
  const pos = new Float32Array(list.length * 3);
  list.forEach((p, i) => { pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = sky.track(new THREE.PointsMaterial({ size: o.size ?? 3.2, map: softDot(sky), color: o.color ?? 0xff9a3a, transparent: true, opacity: o.opacity ?? 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  const pts = new THREE.Points(sky.track(g), mat);
  pts.frustumCulled = false;
  pts.renderOrder = 3;
  sky.group.add(pts);
  return { pts, base: mat.opacity, t: 0 };
}
function animateGlow(f, dt) {
  if (!f) return;
  f.t += Math.min(0.1, dt);
  f.pts.material.opacity = f.base * (0.82 + 0.12 * Math.sin(f.t * 9.3) + 0.06 * Math.sin(f.t * 23.7));
}

// ------------------------------------------------------------------ Unterirdischer Tempel (darkruins)

/**
 * Dunkler Tempel unter der Erde: ein Ring mächtiger Säulen (teils gebrochen) mit Bändern und Kapitellen, Steinbögen
 * dazwischen, Tropfsteine von der Decke, ein ferner Steinboden mit glimmenden Fugen; Fackeln an den Säulen glühen und
 * flackern. o: { y (Boden unter yBase), n (Säulen) }.
 */
export function darkTemple(sky, bounds, rnd, yBase, o = {}) {
  const gy = yBase + (o.y ?? -10);
  const top = bounds.max.y + (o.ceil ?? 22);
  const parts = [], glow = [], torches = [];
  const st = lin(0x6a5c4e), stH = lin(0xa89478), stD = lin(0x2e2620), band = lin(0xc8a060), moss = lin(0x3a5a3a);
  // Boden mit Platten und glimmenden Fugen
  const { x0, x1, z0, z1 } = sides(bounds);
  const fl = new THREE.PlaneGeometry((x1 - x0) + 260, (z1 - z0) + 260, 40, 40);
  fl.rotateX(-Math.PI / 2); fl.translate((x0 + x1) / 2, gy, (z0 + z1) / 2);
  const ember = lin(0x8a3a10);
  parts.push(colorize(ni(fl), (p, n, out) => {
    const fx = Math.abs(((p.x + 1000) % 6) - 3) < 0.18, fz = Math.abs(((p.z + 1000) % 6) - 3) < 0.18;
    mixc(stD, st, 0.35 + 0.15 * Math.sin(p.x * 0.3) * Math.sin(p.z * 0.27), out);
    if (fx || fz) mixc(out, ember, 0.5, out);
  }));
  const cols = [];
  for (const q of ringSpots(bounds, rnd, o.n ?? 26, 9, 55)) {
    const R = rnd.real(1.4, 2.6), broken = rnd.frac() < 0.3;
    const H = broken ? rnd.real(8, 16) : top - gy;
    const c = new THREE.CylinderGeometry(R, R * 1.08, H, 12, Math.max(2, Math.round(H / 3)));
    const pos = c.attributes.position;
    if (broken) for (let i = 0; i < pos.count; i++) if (pos.getY(i) > H / 2 - 0.01) pos.setY(i, pos.getY(i) + Math.sin(pos.getX(i) * 3 + pos.getZ(i) * 2) * 0.8);
    c.translate(q.x, gy + H / 2, q.z);
    parts.push(colorize(ni(c), (p, n, out) => {
      const yy = p.y - gy;
      mixc(stD, st, smooth(-0.8, 0.9, n.x * 0.5 + n.z * 0.6), out);
      if (Math.abs(((yy + 100) % 5.5) - 2.75) < 0.22) mixc(out, band, 0.55, out);
      if (yy < 2.5) mixc(out, moss, 0.35 * (1 - yy / 2.5), out);
      // senkrechte Kanneluren
      const a = Math.atan2(p.z - q.z, p.x - q.x);
      if (Math.abs(Math.sin(a * 6)) > 0.93) mixc(out, stD, 0.35, out);
    }));
    // Sockel und Kapitell
    const base = new THREE.BoxGeometry(R * 2.6, 1.2, R * 2.6); base.translate(q.x, gy + 0.6, q.z);
    parts.push(colorize(ni(base), (p, n, out) => mixc(stD, stH, smooth(-1, 1, n.y), out)));
    if (!broken) {
      const cap = new THREE.BoxGeometry(R * 2.8, 1.1, R * 2.8); cap.translate(q.x, top - 0.6, q.z);
      parts.push(colorize(ni(cap), (p, n, out) => mixc(stD, stH, smooth(-1, 1, n.y), out)));
    }
    // Fackel an der Säule (Halter + Flamme), zur Level-Mitte gewandt
    if (rnd.frac() < 0.7) {
      const cx = (x0 + x1) / 2, cz = Math.min(z1, Math.max(z0, q.z));
      const d = Math.hypot(cx - q.x, cz - q.z) || 1, ux = (cx - q.x) / d, uz = (cz - q.z) / d;
      const ty = gy + rnd.real(9, 13) - (gy < yBase - 6 ? 0 : 0);
      const ty2 = Math.max(yBase + 1.5, Math.min(top - 4, yBase + rnd.real(2.5, 6)));
      const tyy = Math.max(ty2, Math.min(ty, top - 3));
      const hx = q.x + ux * (R + 0.3), hz = q.z + uz * (R + 0.3);
      const h = new THREE.CylinderGeometry(0.12, 0.2, 0.9, 6); h.rotateZ(0.5); h.translate(hx, tyy, hz);
      parts.push(colorize(ni(h), (p, n, out) => mixc(lin(0x2a1a10), lin(0x6a4a2a), smooth(-1, 1, n.y), out)));
      const fl2 = new THREE.ConeGeometry(0.28, 0.8, 7); fl2.translate(hx, tyy + 0.75, hz);
      glow.push(colorize(ni(fl2), (p, n, out) => mixc(lin(0xff5a10), lin(0xffe070), smooth(tyy + 1.1, tyy + 0.45, p.y), out)));
      torches.push({ x: hx, y: tyy + 0.8, z: hz });
    }
    cols.push({ ...q, R, broken });
  }
  // Bögen zwischen benachbarten ganzen Säulen
  for (let i = 0; i + 1 < cols.length; i += 2) {
    const a = cols[i], b = cols[i + 1];
    if (a.broken || b.broken) continue;
    const d = Math.hypot(a.x - b.x, a.z - b.z);
    if (d > 26) continue;
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(a.x, top - 7, a.z), new THREE.Vector3((a.x + b.x) / 2, top - 1, (a.z + b.z) / 2), new THREE.Vector3(b.x, top - 7, b.z));
    parts.push(colorize(ni(new THREE.TubeGeometry(curve, 10, 0.9, 6, false)), (p, n, out) => mixc(stD, stH, smooth(-1, 1, n.y) * 0.7, out)));
  }
  // Decke: dunkle Ebene mit Tropfsteinen
  const ceil = new THREE.PlaneGeometry((x1 - x0) + 200, (z1 - z0) + 200, 1, 1); ceil.rotateX(Math.PI / 2); ceil.translate((x0 + x1) / 2, top + 0.5, (z0 + z1) / 2);
  parts.push(colorize(ni(ceil), (p, n, out) => { out[0] = stD[0] * 0.6; out[1] = stD[1] * 0.6; out[2] = stD[2] * 0.6; }));
  for (let i = 0; i < (o.drips ?? 60); i++) {
    const x = rnd.real(x0 - 60, x1 + 60), z = rnd.real(z0 - 70, z1 + 30);
    if (x > x0 - 4 && x < x1 + 4 && rnd.frac() < 0.6) continue;
    const L = rnd.real(3, 9);
    const c = new THREE.ConeGeometry(rnd.real(0.6, 1.4), L, 6); c.rotateX(Math.PI); c.translate(x, top - L / 2, z);
    parts.push(colorize(ni(c), (p, n, out) => mixc(stD, st, smooth(-0.6, 0.7, n.x * 0.5 + n.z * 0.5), out)));
  }
  addMesh(sky, merge(parts), sky.view.mats.world);
  if (glow.length) addMesh(sky, merge(glow), sky.view.mats.glow);
  return { glow: glowPoints(sky, torches, { size: 4.2, color: 0xff9a3a, opacity: 0.75 }) };
}
export function animateTemple(f, dt) { animateGlow(f?.glow, dt); }

// ------------------------------------------------------------------ Sprintstrecke über Lava (lavarun)

/**
 * Glühende Lava-Landschaft für die Sprintstrecke: Lavasee (fließt dem Spieler entgegen – Tempo-Gefühl), sechseckige
 * Basaltsäulen-Gruppen am Rand mit glühenden Kanten, ferne Vulkane mit Glutspitze. o: { y, flow }.
 */
export function lavaRunway(sky, bounds, rnd, yBase, o = {}) {
  const y = yBase + (o.y ?? -9);
  const lava = flowLava(sky, bounds, y, { flow: o.flow ?? [0, 3.2], scale: 0.1, color: o.color });
  const parts = [], glow = [];
  const bas = lin(0x2a2228), basH = lin(0x5a4a52), edge = lin(0xff7a2a);
  for (const q of ringSpots(bounds, rnd, o.n ?? 40, 7, 70)) {
    const k = Math.round(rnd.real(3, 7));
    for (let j = 0; j < k; j++) {
      const r = rnd.real(0.9, 1.6), h = rnd.real(4, 16);
      const c = new THREE.CylinderGeometry(r, r, h, 6);
      c.translate(q.x + rnd.real(-3, 3), y + h / 2 - 1, q.z + rnd.real(-3, 3));
      const topY = y + h - 1;
      parts.push(colorize(ni(c), (p, n, out) => { mixc(bas, basH, smooth(-0.6, 1, n.y * 0.6 + n.x * 0.3), out); if (n.y > 0.5) mixc(out, basH, 0.5, out); if (p.y < y + 0.6) mixc(out, edge, 0.8, out); if (Math.abs(p.y - topY) < 0.02 && n.y < 0.5) mixc(out, edge, 0.4, out); }));
    }
  }
  const rock = lin(0x2a1a18), rockT = lin(0x5a2a1a), hot = lin(0xffa040);
  for (const q of ringSpots(bounds, rnd, 10, 120, 220)) {
    const r = rnd.real(30, 60), h = rnd.real(40, 90);
    const c = new THREE.CylinderGeometry(r * 0.2, r, h, 14, 5);
    c.translate(q.x, y + h / 2, q.z);
    parts.push(colorize(ni(c), (p, n, out) => {
      const t = (p.y - y) / h;
      mixc(rock, rockT, smooth(0.2, 0.95, t), out);
      // Lavaströme die Flanke hinab
      const a = Math.atan2(p.z - q.z, p.x - q.x);
      if (Math.sin(a * 5 + t * 3) > 0.92) mixc(out, hot, 0.8 * (1 - t * 0.5), out);
    }));
    const cap = new THREE.CylinderGeometry(r * 0.17, r * 0.22, 2, 12); cap.translate(q.x, y + h, q.z);
    glow.push(colorize(ni(cap), (p, n, out) => mixc(lin(0xff6010), lin(0xffe070), smooth(-0.2, 1, n.y), out)));
  }
  addMesh(sky, merge(parts), sky.view.mats.world);
  if (glow.length) addMesh(sky, merge(glow), sky.view.mats.glow);
  // Funkenstrom: fliegt dem Spieler entgegen (+Z) und steigt – Geschwindigkeitsgefühl
  const sparks = embers(sky, rnd, { n: 190, flow: [0.4, 1.6, 9], sway: 0.4, size: 0.22, box: [40, 22, 50], ahead: 16 });
  return { lava, sparks };
}
export function animateRunway(f, dt, camera) { animateLava(f?.lava, dt); animateEmbers(f?.sparks, dt, camera); }

// ------------------------------------------------------------------ Turm im Lavasee (lavatower)

/**
 * Turm im Lavasee: tief unten Lava, um den Level eine runde Burgmauer über die ganze Höhe (Zinnen-Ringe, glühende
 * Fensterschlitze, Ketten), oben eine wabernde lila Giftnebel-Decke. o: { y (Lava), pad, up }.
 */
export function lavaTowerPit(sky, bounds, rnd, yBase, o = {}) {
  const { x0, x1, z0, z1 } = sides(bounds);
  const y = yBase + (o.y ?? -12);
  const lava = flowLava(sky, bounds, y, { flow: [0.1, 0.25], scale: 0.08, color: o.color });
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const R = Math.max(x1 - x0, z1 - z0) / 2 + (o.pad ?? 16);
  const top = bounds.max.y + (o.up ?? 18);
  const H = top - y;
  const parts = [], glow = [];
  const st = lin(0x4a3e46), stH = lin(0x8a7a84), stD = lin(0x241c22), hot = lin(0xff6a1a);
  const wall = new THREE.CylinderGeometry(R, R * 1.04, H, 48, Math.max(4, Math.round(H / 4)), true);
  wall.translate(cx, y + H / 2, cz);
  parts.push(colorize(ni(wall), (p, n, out) => {
    const yy = p.y - y;
    const a = Math.atan2(p.z - cz, p.x - cx);
    const row = Math.floor(yy / 1.2);
    const brick = Math.abs(((a * R + (row % 2) * 1.2 + 1000) % 2.4) - 1.2) < 0.06 || (yy % 1.2) < 0.08;
    mixc(st, stH, 0.3 + 0.25 * Math.sin(a * 13 + yy * 0.7), out);
    if (brick) mixc(out, stD, 0.6, out);
    mixc(out, hot, smooth(6, 0, yy) * 0.7, out);   // unten glüht die Mauer von der Lava
  }));
  // Fensterschlitze (glühen), Zinnen-Ringe
  for (let yy = y + 8; yy < top - 4; yy += rnd.real(7, 11)) {
    const ring = new THREE.TorusGeometry(R * 0.985, 0.6, 4, 48); ring.rotateX(Math.PI / 2); ring.translate(cx, yy, cz);
    parts.push(colorize(ni(ring), (p, n, out) => mixc(stD, stH, smooth(-1, 1, n.y), out)));
    for (let k = 0; k < 8; k++) {
      const a = rnd.real(0, TAU);
      const w = new THREE.PlaneGeometry(0.9, 2.2);
      w.rotateY(-a - Math.PI / 2);
      w.translate(cx + Math.cos(a) * (R * 0.97), yy + 3, cz + Math.sin(a) * (R * 0.97));
      glow.push(colorize(ni(w), (p, n, out) => mixc(lin(0xff8a2a), lin(0xffd070), 0.4, out)));
    }
  }
  // hängende Ketten
  for (let i = 0; i < 14; i++) {
    const a = rnd.real(0, TAU), rr = R * rnd.real(0.75, 0.95);
    const L = rnd.real(8, 20);
    const c = new THREE.CylinderGeometry(0.12, 0.12, L, 4); c.translate(cx + Math.cos(a) * rr, top - L / 2, cz + Math.sin(a) * rr);
    parts.push(colorize(ni(c), (p, n, out) => mixc(lin(0x2a2a30), lin(0x6a6a74), smooth(-1, 1, n.x), out)));
  }
  addMesh(sky, merge(parts), sky.view.mats.world);
  if (glow.length) addMesh(sky, merge(glow), sky.view.mats.glow);
  // Giftnebel-Decke: zwei wabernde Schichten (Shader, durchscheinend)
  const U = { uTime: { value: 0 } };
  const fogMat = sky.track(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  fogMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec3 vT7p;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vT7p = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    sh.fragmentShader = 'uniform float uTime;\nvarying vec3 vT7p;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      vec2 q = vT7p.xz * 0.06;
      float n = sin(q.x * 3.1 + uTime * 0.25 + sin(q.y * 2.3 - uTime * 0.2) * 2.0) * 0.5 + sin(q.y * 2.7 - uTime * 0.18 + sin(q.x * 1.9) * 1.6) * 0.5;
      diffuseColor.rgb = mix(vec3(0.32, 0.08, 0.5), vec3(0.8, 0.45, 1.0), smoothstep(-0.4, 1.0, n));
      diffuseColor.a = 0.55 + 0.35 * smoothstep(-0.8, 0.8, n);`);
  };
  fogMat.customProgramCacheKey = () => 'w7giftdecke';
  for (const [dy, s] of [[0, 1], [3, 1.1]]) {
    const d = new THREE.CircleGeometry(R * s, 40); d.rotateX(Math.PI / 2); d.translate(cx, top + dy, cz);
    addMesh(sky, d, fogMat, sky.group, 5);
  }
  const drops = embers(sky, rnd, { n: 110, flow: [0, -0.9, 0], sway: 0.8, size: 0.16, colors: [0xc87aff, 0x8a3ad8, 0xffa040], opacity: 0.7, box: [40, 26, 40] });
  return { lava, U, drops };
}
export function animateTower(f, dt, camera) { animateLava(f?.lava, dt); if (f) f.U.uTime.value += Math.min(0.1, dt); animateEmbers(f?.drops, dt, camera); }

// ------------------------------------------------------------------ Maschinen in Lava (lavamachine)

/**
 * Maschinen-Diorama in der Lava: Lavasee, gemauerte Sockel mit riesigen Zahnrädern (drehen sich), Kolben (pumpen auf und
 * ab), Rohrbögen, Schlote mit Glut. o: { y, gears, pistons }.
 */
export function lavaMachine(sky, bounds, rnd, yBase, o = {}) {
  const y = yBase + (o.y ?? -8);
  const lava = flowLava(sky, bounds, y, { flow: [0.3, 0.2], scale: 0.1, color: o.color });
  const parts = [], glow = [];
  const brick = lin(0x6a4a42), brickH = lin(0xa8806a), iron = lin(0x3a3a44), ironH = lin(0x8a8a9a), brass = lin(0xc8a048), hot = lin(0xff7a2a);
  const spots = [...ringSpots(bounds, rnd, o.n ?? 14, 12, 70)];
  const gears = [], pistons = [];
  const gmat = sky.track(new THREE.MeshStandardMaterial({ color: 0xc8a050, roughness: 0.45, metalness: 0.55 }));
  const pmat = sky.track(new THREE.MeshStandardMaterial({ color: 0x9aa0ae, roughness: 0.35, metalness: 0.6 }));
  spots.forEach((q, i) => {
    const w = rnd.real(5, 10), h = rnd.real(6, 18);
    const b = new THREE.BoxGeometry(w, h, w); b.translate(q.x, y + h / 2 - 1, q.z);
    parts.push(colorize(ni(b), (p, n, out) => { mixc(brick, brickH, smooth(-1, 1, n.y * 0.6 + n.x * 0.3), out); if (Math.abs(((p.y + 100) % 1.6) - 0.8) < 0.07) mixc(out, iron, 0.5, out); if (p.y < y + 0.8) mixc(out, hot, 0.7, out); }));
    if (i % 3 === 0 && gears.length < (o.gears ?? 4)) {
      const R = rnd.real(3.5, 7);
      const m = new THREE.Mesh(sky.track(gearGeo(R, Math.round(R * 2.4), R * 0.22)), gmat);
      m.position.set(q.x, y + h - 1 + R * 0.55, q.z);
      m.rotation.y = rnd.real(0, Math.PI);
      sky.group.add(m);
      gears.push({ m, v: rnd.real(0.15, 0.4) * (i % 2 ? 1 : -1) });
    } else if (i % 3 === 1 && pistons.length < (o.pistons ?? 3)) {
      const cyl = new THREE.CylinderGeometry(1.1, 1.1, 3, 10); cyl.translate(q.x, y + h - 1 + 1.5, q.z);
      parts.push(colorize(ni(cyl), (p, n, out) => mixc(iron, ironH, smooth(-1, 1, n.x * 0.6 + n.y * 0.4), out)));
      const rg = new THREE.CylinderGeometry(0.45, 0.45, 4, 8); rg.translate(0, 2, 0);
      const hg = new THREE.BoxGeometry(2.4, 0.8, 2.4); hg.translate(0, 4.2, 0);
      const grp = new THREE.Mesh(sky.track(merge([ni(rg), ni(hg)])), pmat);
      grp.position.set(q.x, y + h - 1 + 1, q.z);
      sky.group.add(grp);
      pistons.push({ g: grp, y0: grp.position.y, ph: rnd.real(0, TAU), f: rnd.real(1.2, 2.2) });
    } else {
      // Schlot mit Glut
      const sh = rnd.real(6, 12);
      const c = new THREE.CylinderGeometry(0.9, 1.3, sh, 10); c.translate(q.x, y + h - 1 + sh / 2, q.z);
      parts.push(colorize(ni(c), (p, n, out) => { mixc(iron, ironH, smooth(-1, 1, n.x * 0.5 + n.z * 0.5), out); if (Math.abs(((p.y + 100) % 2.5) - 1.25) < 0.12) mixc(out, brass, 0.7, out); }));
      const r = new THREE.CylinderGeometry(0.75, 0.75, 0.3, 10); r.translate(q.x, y + h - 1 + sh + 0.1, q.z);
      glow.push(colorize(ni(r), (p, n, out) => mixc(lin(0xff5a10), lin(0xffd060), 0.5, out)));
    }
  });
  // Rohrbögen zwischen Sockeln
  for (let i = 0; i + 1 < spots.length; i += 2) {
    const a = spots[i], b = spots[i + 1];
    if (Math.hypot(a.x - b.x, a.z - b.z) > 50) continue;
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(a.x, y + 5, a.z), new THREE.Vector3((a.x + b.x) / 2, y + 16, (a.z + b.z) / 2), new THREE.Vector3(b.x, y + 5, b.z));
    parts.push(colorize(ni(new THREE.TubeGeometry(curve, 12, 0.7, 8, false)), (p, n, out) => { mixc(iron, ironH, smooth(-1, 1, n.y), out); }));
  }
  addMesh(sky, merge(parts), sky.view.mats.world);
  if (glow.length) addMesh(sky, merge(glow), sky.view.mats.glow);
  const sparks = embers(sky, rnd, { n: 90, flow: [0, 1.4, 0], sway: 0.6, size: 0.16 });
  return { lava, gears, pistons, sparks, t: 0 };
}
export function animateMachine(f, dt, camera) {
  if (!f) return;
  const d = Math.min(0.1, dt);
  f.t += d;
  animateLava(f.lava, dt);
  for (const q of f.gears) q.m.rotation.z += q.v * d;
  for (const p of f.pistons) p.g.position.y = p.y0 + Math.max(0, Math.sin(f.t * p.f + p.ph)) * 1.6;
  animateEmbers(f.sparks, dt, camera);
}

// ------------------------------------------------------------------ Vulkan-Riff unter Wasser (reef)

/**
 * Vulkan-Riff: sandig-dunkler Meeresboden, Korallenstöcke (rosa, orange, lila, gelb), Seetang, Vulkanfelsen mit glühenden
 * Rissen und Schloten, aus denen warme Blasen steigen; oben die Wasseroberfläche (von unten hell). o: { y (Boden),
 * surface (Wasseroberfläche), n }.
 */
export function volcanoReef(sky, bounds, rnd, yBase, o = {}) {
  const { x0, x1, z0, z1 } = sides(bounds);
  const gy = yBase + (o.y ?? -6);
  const parts = [], glow = [];
  const sand = lin(0xc8a878), sandD = lin(0x5a4a48), rock = lin(0x3a3036), rockH = lin(0x6a5a5e), hot = lin(0xff7a2a);
  const fl = new THREE.PlaneGeometry((x1 - x0) + 300, (z1 - z0) + 300, 50, 50);
  const fp = fl.attributes.position;
  for (let i = 0; i < fp.count; i++) fp.setZ(i, Math.sin(fp.getX(i) * 0.08) * Math.cos(fp.getY(i) * 0.07) * 1.6);
  fl.rotateX(-Math.PI / 2); fl.translate((x0 + x1) / 2, gy, (z0 + z1) / 2);
  parts.push(colorize(ni(fl), (p, n, out) => mixc(sandD, sand, 0.45 + 0.35 * Math.sin(p.x * 0.11 + p.z * 0.07), out)));
  const coral = [[0xff6ab0, 0xffb8d8], [0xff8a3a, 0xffd08a], [0xa86aff, 0xd8b8ff], [0xffd23a, 0xfff0a0], [0x3ad8c8, 0xa8fff0]].map(([a, b]) => [lin(a), lin(b)]);
  const vents = [];
  for (const q of ringSpots(bounds, rnd, o.n ?? 44, 6, 70)) {
    const r = rnd.frac();
    if (r < 0.55) {
      // Korallenstock: Äste (Zylinder mit Kugelspitzen) oder Fächer
      const [ca, cb] = coral[Math.floor(rnd.frac() * coral.length)];
      const k = Math.round(rnd.real(4, 8));
      for (let j = 0; j < k; j++) {
        const h = rnd.real(1.2, 3.6), tilt = rnd.real(-0.5, 0.5), a = rnd.real(0, TAU);
        const bx = q.x + rnd.real(-1, 1), bz = q.z + rnd.real(-1, 1);
        const c = new THREE.CylinderGeometry(0.14, 0.24, h, 6); c.translate(0, h / 2, 0);
        const tip = new THREE.SphereGeometry(0.3, 7, 5); tip.translate(0, h, 0);
        for (const g of [c, tip]) {
          g.rotateZ(tilt); g.rotateY(a); g.translate(bx, gy, bz);
          parts.push(colorize(ni(g), (p, n, out) => mixc(ca, cb, smooth(gy, gy + 3.5, p.y), out)));
        }
      }
      const fan = new THREE.CircleGeometry(rnd.real(1.4, 2.6), 10, 0, Math.PI); fan.rotateY(rnd.real(0, TAU)); fan.translate(q.x + rnd.real(-1.5, 1.5), gy, q.z + rnd.real(-1.5, 1.5));
      parts.push(colorize(ni(fan), (p, n, out) => mixc(ca, cb, 0.5 + 0.3 * Math.sin(p.x * 4 + p.y * 5), out)));
    } else if (r < 0.8) {
      // Seetang
      for (let j = 0; j < 4; j++) {
        const h = rnd.real(3, 8);
        const c = new THREE.CylinderGeometry(0.08, 0.16, h, 4, 4); c.translate(q.x + rnd.real(-1.2, 1.2), gy + h / 2, q.z + rnd.real(-1.2, 1.2));
        const ps = c.attributes.position;
        for (let i = 0; i < ps.count; i++) ps.setX(i, ps.getX(i) + Math.sin(ps.getY(i) * 0.9) * 0.4);
        parts.push(colorize(ni(c), (p, n, out) => mixc(lin(0x1a6a3a), lin(0x6ad06a), smooth(gy, gy + h, p.y), out)));
      }
    } else {
      // Vulkanfels mit glühenden Rissen und Schlot
      const s = rnd.real(2, 5);
      const g = new THREE.DodecahedronGeometry(s, 1); g.scale(1, rnd.real(0.6, 1.2), 1); g.translate(q.x, gy + s * 0.4, q.z);
      parts.push(colorize(ni(g), (p, n, out) => { mixc(rock, rockH, smooth(-0.6, 0.9, n.y), out); if (Math.abs(Math.sin(p.x * 2.1 + p.y * 1.7) * Math.sin(p.z * 1.9)) > 0.93) mixc(out, hot, 0.9, out); }));
      const vent = new THREE.CylinderGeometry(0.35, 0.55, 0.4, 8); vent.translate(q.x, gy + s * 0.95, q.z);
      glow.push(colorize(ni(vent), (p, n, out) => mixc(lin(0xff6010), lin(0xffd070), 0.5, out)));
      vents.push({ x: q.x, y: gy + s, z: q.z });
    }
  }
  addMesh(sky, merge(parts), sky.view.mats.world);
  if (glow.length) addMesh(sky, merge(glow), sky.view.mats.glow);
  // Wasseroberfläche oben (von unten hell, unbeleuchtet)
  if (o.surface !== false) {
    const sy = o.surface ?? bounds.max.y + 6;
    const s = new THREE.PlaneGeometry((x1 - x0) + 300, (z1 - z0) + 300, 1, 1); s.rotateX(Math.PI / 2); s.translate((x0 + x1) / 2, sy, (z0 + z1) / 2);
    addMesh(sky, s, sky.track(new THREE.MeshBasicMaterial({ color: 0x8ae8f0, transparent: true, opacity: 0.35, depthWrite: false, fog: true })), sky.group, 2);
  }
  const vg = glowPoints(sky, vents, { size: 5, color: 0xff8a3a, opacity: 0.6 });
  const bubbles = embers(sky, rnd, { n: 140, flow: [0, 1.3, 0], sway: 0.35, size: 0.18, colors: [0xd8ffff, 0xa8e8ff, 0xffd8a8], opacity: 0.6, additive: false, box: [36, 22, 36] });
  return { vg, bubbles };
}
export function animateReef(f, dt, camera) { animateGlow(f?.vg, dt); animateEmbers(f?.bubbles, dt, camera); }

// ------------------------------------------------------------------ Vulkan-Krater (volcano)

/**
 * Vulkan-Krater: Lavasee bis zur Kraterwand, ringsum die zerklüftete Kraterwand mit glühenden Adern, darüber Rauchsäulen
 * (wandernde Rauch-Ebenen), ferne Lava-Fontänen (pulsieren), fallende Asche. o: { y (Lava), pad }.
 */
export function volcanoCrater(sky, bounds, rnd, yBase, o = {}) {
  const { x0, x1, z0, z1 } = sides(bounds);
  const y = yBase + (o.y ?? -8);
  const lava = flowLava(sky, bounds, y, { flow: [0.2, 0.3], scale: 0.085, color: o.color });
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const RX = (x1 - x0) / 2 + (o.pad ?? 40), RZ = (z1 - z0) / 2 + (o.pad ?? 40);
  const parts = [], glow = [];
  const rock = lin(0x3a2a2a), rockH = lin(0x7a5a52), rockD = lin(0x1a1012), hot = lin(0xff6a1a), ash = lin(0x8a8288);
  const N = 64, H = 70;
  const wall = new THREE.CylinderGeometry(1, 1.25, H, N, 8, true);
  const wp = wall.attributes.position;
  for (let i = 0; i < wp.count; i++) {
    const x = wp.getX(i), z = wp.getZ(i), yy = wp.getY(i);
    const a = Math.atan2(z, x);
    const jag = 1 + Math.sin(a * 7) * 0.05 + Math.sin(a * 17 + yy * 0.2) * 0.03;
    wp.setX(i, x * RX * jag); wp.setZ(i, z * RZ * jag);
    if (yy > H / 2 - 0.01) wp.setY(i, yy + Math.sin(a * 5) * 10 + Math.sin(a * 11) * 5);
  }
  wall.translate(cx, y + H / 2 - 2, cz);
  parts.push(colorize(ni(wall), (p, n, out) => {
    const yy = p.y - y;
    mixc(rockD, rock, smooth(-1, 1, Math.sin(p.x * 0.07 + p.z * 0.05) + yy * 0.02), out);
    mixc(out, rockH, smooth(40, 70, yy) * 0.6, out);
    const vein = Math.abs(Math.sin(Math.atan2(p.z - cz, p.x - cx) * 23 + yy * 0.15));
    if (vein > 0.985 && yy < 45) mixc(out, hot, 0.9, out);
    mixc(out, hot, smooth(5, 0, yy) * 0.8, out);
  }));
  // Felsen-Inseln im Lavasee am Rand
  for (const q of ringSpots(bounds, rnd, 16, 14, 50)) {
    const s = rnd.real(2.5, 6);
    const g = new THREE.DodecahedronGeometry(s, 0); g.scale(1, rnd.real(0.6, 1.4), 1); g.translate(q.x, y + s * 0.3, q.z);
    parts.push(colorize(ni(g), (p, n, out) => { mixc(rockD, rock, smooth(-0.5, 0.9, n.y), out); if (n.y > 0.7) mixc(out, ash, 0.35, out); if (p.y < y + 0.6) mixc(out, hot, 0.8, out); }));
  }
  addMesh(sky, merge(parts), sky.view.mats.world);
  // ferne Lava-Fontänen (pulsieren) und Rauchsäulen – je eine Instanz-Gruppe
  const fgeo = sky.track(new THREE.CylinderGeometry(0.6, 1.4, 1, 8, 1, true));
  fgeo.translate(0, 0.5, 0);
  const F = [...ringSpots(bounds, rnd, 6, 25, 60)].map((q) => ({ x: q.x, z: q.z, h: rnd.real(8, 16), ph: rnd.real(0, TAU), f: rnd.real(0.4, 0.8) }));
  const fim = new THREE.InstancedMesh(fgeo, sky.track(new THREE.MeshBasicMaterial({ color: 0xffb040, fog: true })), F.length);
  fim.frustumCulled = false;
  sky.group.add(fim);
  const S = [];
  for (const q of ringSpots(bounds, rnd, 8, 40, 110)) for (let k = 0; k < 4; k++) S.push({ x: q.x, z: q.z, y0: y + 30, ph: k / 4, s: rnd.real(18, 30) });
  const sim = new THREE.InstancedMesh(sky.track(new THREE.PlaneGeometry(1, 1)), sky.track(new THREE.MeshBasicMaterial({ map: smokeTex(sky), color: 0x4a3a3e, transparent: true, opacity: 0.7, depthWrite: false, fog: true })), S.length);
  sim.frustumCulled = false;
  sim.renderOrder = 6;
  sky.group.add(sim);
  const ashes = embers(sky, rnd, { n: 150, flow: [0.3, -0.7, 0.2], sway: 0.9, size: 0.14, colors: [0x8a8288, 0x5a5258, 0xff8a3a], opacity: 0.75, additive: false });
  return { lava, y, F, fim, S, sim, ashes, t: 0, m: new THREE.Matrix4(), p: new THREE.Vector3(), s: new THREE.Vector3(), q: new THREE.Quaternion() };
}
export function animateCrater(f, dt, camera) {
  if (!f) return;
  const d = Math.min(0.1, dt);
  f.t += d;
  animateLava(f.lava, dt);
  const I = f.q;
  f.F.forEach((q, i) => {
    f.p.set(q.x, f.y, q.z);
    f.s.set(1, Math.max(0.05, q.h * Math.max(0, Math.sin(f.t * q.f + q.ph))), 1);
    f.m.compose(f.p, I, f.s);
    f.fim.setMatrixAt(i, f.m);
  });
  f.fim.instanceMatrix.needsUpdate = true;
  f.S.forEach((s, i) => {
    const u = (f.t * 0.03 + s.ph) % 1;
    f.p.set(s.x + u * 10, s.y0 + u * 50, s.z);
    const k = s.s * (0.6 + u);
    f.s.set(k, k, 1);
    f.m.compose(f.p, camera.quaternion, f.s);
    f.sim.setMatrixAt(i, f.m);
  });
  f.sim.instanceMatrix.needsUpdate = true;
  animateEmbers(f.ashes, dt, camera);
}
