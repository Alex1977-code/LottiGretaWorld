// Kulissen-Bausteine der Welt-2-Themen (theme_desert/space/shadow/pinkgrass/lava.js): werden über den Haken
// theme.buildBackdrop(sky, bounds, rnd, yBase) aus Sky.fit gerufen (sky.group = fest in der Welt, sky.domeGroup =
// folgt der Kamera wie die Himmelskuppel). Je Kulisse ein bis zwei verschmolzene Meshes.

import * as THREE from 'three';
import { colorize, merge, lin, mixc, smooth } from '../../three/world/geometry.js';

function addMesh(sky, g, mat, parent = sky.group, order = 0) {
  if (!g) return null;
  const mesh = new THREE.Mesh(sky.track(g), mat);
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  mesh.renderOrder = order;
  parent.add(mesh);
  return mesh;
}

/**
 * Hügel/Dünen-Kranz um den Level-Umriss (wie Sky.buildHills, aber mit eigenen Farben und Formen).
 * o: { near: [top, base], far: [top, base], peaks: [low, high] | null, flat: 0..1 (Dünen flacher), mesas: n }
 */
export function hillRing(sky, bounds, rnd, yBase, o) {
  const parts = [];
  const th = sky.theme;
  const gy = (th.ground?.y ?? -30) + yBase;
  const flat = o.flat ?? 0;
  const hill = (x, z, rx, ry, rz, top, base) => {
    const g = new THREE.SphereGeometry(1, 16, 9);
    g.scale(rx, ry * (1 - flat * 0.55), rz);
    g.translate(x, gy - ry * 0.15, z);
    const a = lin(top), b = lin(base);
    parts.push(colorize(g, (p, n, out) => mixc(b, a, smooth(-0.1, 0.9, n.y), out)));
  };
  const x0 = bounds.min.x, x1 = bounds.max.x, z0 = bounds.min.z, z1 = bounds.max.z;
  for (const side of [-1, 1]) {
    const xs = side < 0 ? x0 - 70 : x1 + 70;
    for (let z = z1 + 40; z > z0 - 60; z -= rnd.real(28, 42)) {
      const r = rnd.real(26, 40);
      hill(xs + side * rnd.real(0, 30), z, r, rnd.real(30, 48), r * 0.9, o.near[0], o.near[1]);
    }
  }
  for (let x = x0 - 120; x < x1 + 120; x += rnd.real(30, 44)) {
    const r = rnd.real(30, 46);
    hill(x, z0 - rnd.real(110, 150), r, rnd.real(40, 70), r * 0.8, o.far[0], o.far[1]);
  }
  if (o.peaks) {
    const mb = lin(o.peaks[0]), ms = lin(o.peaks[1]);
    for (let x = x0 - 160; x < x1 + 160; x += rnd.real(40, 60)) {
      const r = rnd.real(36, 52), h = rnd.real(70, 100);
      const g = new THREE.SphereGeometry(1, 14, 10);
      g.scale(r, h, r * 0.8);
      const z = z0 - rnd.real(200, 240);
      g.translate(x, gy - 6, z);
      parts.push(colorize(g, (p, n, out) => mixc(mb, ms, smooth(0.62, 0.92, (p.y - gy + 6) / h), out)));
    }
  }
  // Tafelberge (geschichteter Sandstein) zwischen den Dünen
  if (o.mesas) {
    const bands = (o.mesaColors ?? [0xd8743a, 0xc0582c, 0xe89a5a, 0xb04e26]).map(lin);
    const cap = lin(o.mesaCap ?? 0xf0b070);
    for (let i = 0; i < o.mesas; i++) {
      const side = i % 2 ? 1 : -1;
      const x = side < 0 ? x0 - rnd.real(45, 110) : x1 + rnd.real(45, 110);
      const z = rnd.real(z0 - 60, z1 + 20);
      const r = rnd.real(9, 20), h = rnd.real(22, 46);
      const g = new THREE.CylinderGeometry(r * 0.85, r, h, 10, 6);
      g.translate(x, gy + h / 2 - 2, z);
      parts.push(colorize(g, (p, n, out) => {
        if (n.y > 0.7) { out[0] = cap[0]; out[1] = cap[1]; out[2] = cap[2]; return; }
        const b = bands[Math.abs(Math.floor((p.y - gy) / 4)) % bands.length];
        out[0] = b[0]; out[1] = b[1]; out[2] = b[2];
      }));
    }
  }
  return addMesh(sky, merge(parts), sky.view.mats.world);
}

/** Sternenhimmel (ein Punkte-Objekt in der Kuppel, folgt der Kamera). */
export function starField(sky, rnd, n = 900, opts = {}) {
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const tints = (opts.tints ?? [0xffffff, 0xcfe0ff, 0xffe6c8, 0xe6d0ff]).map((c) => new THREE.Color(c));
  for (let i = 0; i < n; i++) {
    // gleichmäßig auf der Kugel, oberhalb des Horizonts dichter
    const u = rnd.real(-0.35, 1), a = rnd.real(0, Math.PI * 2);
    const r = Math.sqrt(1 - u * u);
    pos[i * 3] = Math.cos(a) * r * 300; pos[i * 3 + 1] = u * 300; pos[i * 3 + 2] = Math.sin(a) * r * 300;
    const c = tints[i % tints.length], k = rnd.real(0.45, 1);
    col[i * 3] = c.r * k; col[i * 3 + 1] = c.g * k; col[i * 3 + 2] = c.b * k;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = sky.track(new THREE.PointsMaterial({ size: opts.size ?? 2.2, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false, transparent: true }));
  const pts = new THREE.Points(sky.track(g), mat);
  pts.frustumCulled = false;
  pts.renderOrder = -9;
  sky.domeGroup.add(pts);
  return pts;
}

/** Ferne Planeten mit Streifen und Ring (Kuppel, unbeleuchtet, ein Mesh). list: [{ dir: [x, y, z], r, colors, ring }] */
export function farPlanets(sky, list) {
  const parts = [];
  for (const pl of list) {
    const d = new THREE.Vector3(...pl.dir).normalize().multiplyScalar(pl.dist ?? 270);
    const [c0, c1, c2] = pl.colors.map(lin);
    const g = new THREE.SphereGeometry(pl.r, 24, 16);
    g.rotateZ(pl.tilt ?? 0.3);
    parts.push(colorize(g, (p, n, out) => {
      const band = Math.sin((p.y / pl.r) * 9 + Math.sin(p.x * 0.3) * 0.8) * 0.5 + 0.5;
      mixc(c0, c1, band, out);
      // Licht von oben links, Schattenseite dunkel
      const k = 0.35 + 0.65 * smooth(-0.6, 0.8, n.y * 0.6 - n.x * 0.5 + n.z * 0.3);
      out[0] *= k; out[1] *= k; out[2] *= k;
    }));
    parts[parts.length - 1].translate(d.x, d.y, d.z);
    if (pl.ring) {
      const rg = new THREE.RingGeometry(pl.r * 1.35, pl.r * 1.9, 40, 1);
      rg.rotateX(-Math.PI / 2 + 0.35);
      rg.rotateZ(pl.tilt ?? 0.3);
      parts.push(colorize(rg, (p, n, out) => { const k = 0.8 + 0.2 * Math.sin(Math.hypot(p.x, p.z) * 1.6); out[0] = c2[0] * k; out[1] = c2[1] * k; out[2] = c2[2] * k; }));
      parts[parts.length - 1].translate(d.x, d.y, d.z);
    }
  }
  const mat = sky.track(new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, depthWrite: false, side: THREE.DoubleSide }));
  const mesh = addMesh(sky, merge(parts), mat, sky.domeGroup, -8);
  if (mesh) mesh.frustumCulled = false;
  return mesh;
}

/** Leuchtende Nebel (additive Scheiben in der Kuppel, ein Mesh). list: [{ dir, size, color }] */
export function nebulae(sky, list) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const c2 = canvas.getContext('2d');
  const grad = c2.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.75)'); grad.addColorStop(0.4, 'rgba(255,255,255,0.28)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  c2.fillStyle = grad; c2.fillRect(0, 0, 128, 128);
  const tex = sky.track(new THREE.CanvasTexture(canvas));
  tex.colorSpace = THREE.SRGBColorSpace;
  const parts = [];
  for (const nb of list) {
    const d = new THREE.Vector3(...nb.dir).normalize().multiplyScalar(285);
    const g = new THREE.PlaneGeometry(nb.size, nb.size * (nb.aspect ?? 0.6));
    g.lookAt(d.clone().negate());
    g.translate(d.x, d.y, d.z);
    const c = lin(nb.color);
    const n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2]; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    parts.push(g.toNonIndexed());
  }
  const g = merge(parts);
  const mat = sky.track(new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  const mesh = addMesh(sky, g, mat, sky.domeGroup, -8);
  if (mesh) mesh.frustumCulled = false;
  return mesh;
}

/** Lichtkegel von oben (additiv, warm, ein Mesh) entlang des Levels. */
export function lightCones(sky, bounds, rnd, opts = {}) {
  const parts = [];
  const color = lin(opts.color ?? 0xffc880);
  const x0 = bounds.min.x, x1 = bounds.max.x, z0 = bounds.min.z, z1 = bounds.max.z;
  const yTop = bounds.max.y + (opts.above ?? 10), yBot = bounds.min.y - 2;
  const cx = (x0 + x1) / 2, span = Math.max(6, (x1 - x0) / 2);
  let i = 0;
  for (let z = z1 - 6; z > z0 + 2; z -= rnd.real(opts.every?.[0] ?? 13, opts.every?.[1] ?? 19), i++) {
    const x = cx + (i % 2 ? 1 : -1) * rnd.real(span * 0.15, span * 0.85);
    const h = yTop - yBot, rTop = rnd.real(0.5, 0.9), rBot = rnd.real(2.6, 4.2);
    const g = new THREE.CylinderGeometry(rTop, rBot, h, 18, 6, true);
    g.rotateZ(rnd.real(-0.12, 0.12));
    g.translate(x, yBot + h / 2, z);
    parts.push(colorize(g, (p, n, out) => {
      const t = (p.y - yBot) / h;                     // 0 unten … 1 oben
      const k = (opts.strength ?? 0.22) * smooth(0, 0.65, t) * (1 - smooth(0.92, 1, t) * 0.6);
      out[0] = color[0] * k; out[1] = color[1] * k; out[2] = color[2] * k;
    }));
  }
  const mat = sky.track(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  const mesh = addMesh(sky, merge(parts), mat, sky.group, 5);
  if (mesh) mesh.frustumCulled = false;
  return mesh;
}

/** Glühender Lavasee tief unten (unbeleuchtet) und Vulkankegel am Horizont. */
export function lavaSea(sky, bounds, rnd, yBase, opts = {}) {
  const x0 = bounds.min.x, x1 = bounds.max.x, z0 = bounds.min.z, z1 = bounds.max.z;
  const y = yBase + (opts.y ?? -9);
  const w = (x1 - x0) + 600, d = (z1 - z0) + 600;
  const g = new THREE.PlaneGeometry(w, d, 48, 48);
  g.rotateX(-Math.PI / 2);
  g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  const hot = lin(0xffb030), mid = lin(0xff5a14), dark = lin(0x8a1a08);
  const sea = colorize(g, (p, n, out) => {
    const v = Math.sin(p.x * 0.11 + Math.sin(p.z * 0.07) * 2) * 0.5 + Math.sin(p.z * 0.13 + p.x * 0.05) * 0.5;
    if (v > 0.55) mixc(mid, hot, smooth(0.55, 0.95, v), out); else mixc(dark, mid, smooth(-0.8, 0.55, v), out);
  });
  const seaMat = sky.track(new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }));
  addMesh(sky, sea, seaMat);
  const parts = [];
  const rock = lin(0x2a1814), rockTop = lin(0x5a2a1a), glow = lin(0xff6a1a);
  for (let x = x0 - 160; x < x1 + 160; x += rnd.real(50, 80)) {
    const r = rnd.real(30, 55), h = rnd.real(40, 80);
    const c = new THREE.CylinderGeometry(r * 0.22, r, h, 12, 4);
    const z = z0 - rnd.real(150, 230);
    c.translate(x, y + h / 2, z);
    parts.push(colorize(c, (p, n, out) => {
      const t = (p.y - y) / h;
      mixc(rock, rockTop, smooth(0.2, 0.95, t), out);
      if (t > 0.93) mixc(out, glow, 0.8, out);
    }));
  }
  addMesh(sky, merge(parts), sky.view.mats.world);
}
