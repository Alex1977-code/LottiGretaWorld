// Kulissen-Bausteine der Welt-3-Themen (theme_snow/skyway/ghost/plaza/fortress/water/race/autumn/train.js): über die
// Haken theme.buildBackdrop(sky, bounds, rnd, yBase) und theme.updateBackdrop(sky, dt, camera) aus Sky.fit/Sky.update
// gerufen (sky.group = fest in der Welt, sky.domeGroup = folgt der Kamera). Je Kulisse ein bis zwei Meshes; fallende
// Teilchen (Schnee, Laub) sind je ein Punkte-Objekt in einem Kasten vor der Kamera.

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

function spriteTex(sky, draw, size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = sky.track(new THREE.CanvasTexture(c));
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ------------------------------------------------------------------ Fallende Teilchen (Schnee, Laub)

/**
 * Fallende Teilchen in einem Kasten um einen Punkt vor der Kamera (wiederholt sich nahtlos). o: { n, box: [w, h, d],
 * ahead (m vor der Kamera), fall (m/s), sway, size, color | colors, kind: 'snow'|'leaf', opacity }.
 * Liefert ein Objekt für animateFall(sky, f, dt, camera).
 */
export function fallingParticles(sky, rnd, o = {}) {
  const n = o.n ?? 320;
  const [bw, bh, bd] = o.box ?? [46, 26, 46];
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const seeds = [];
  const colors = (o.colors ?? [o.color ?? 0xffffff]).map((c) => new THREE.Color(c));
  for (let i = 0; i < n; i++) {
    seeds.push({ x: rnd.real(0, bw), y: rnd.real(0, bh), z: rnd.real(0, bd), ph: rnd.real(0, 6.28), v: rnd.real(0.75, 1.25) });
    const c = colors[i % colors.length];
    const k = o.kind === 'leaf' ? rnd.real(0.75, 1.1) : 1;
    col[i * 3] = c.r * k; col[i * 3 + 1] = c.g * k; col[i * 3 + 2] = c.b * k;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const tex = o.kind === 'leaf'
    ? spriteTex(sky, (c, s) => {
      c.translate(s / 2, s / 2); c.rotate(0.6);
      c.fillStyle = '#ffffff';
      c.beginPath(); c.ellipse(0, 0, s * 0.42, s * 0.2, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(120,60,20,0.6)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-s * 0.38, 0); c.lineTo(s * 0.38, 0); c.stroke();
    })
    : spriteTex(sky, (c, s) => {
      const gr = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr; c.fillRect(0, 0, s, s);
    }, 32);
  const mat = sky.track(new THREE.PointsMaterial({ size: o.size ?? 0.22, map: tex, vertexColors: true, transparent: true, opacity: o.opacity ?? 0.9, depthWrite: false, alphaTest: 0.02 }));
  const pts = new THREE.Points(sky.track(g), mat);
  pts.frustumCulled = false;
  pts.renderOrder = 4;
  sky.group.add(pts);
  return { pts, seeds, box: [bw, bh, bd], ahead: o.ahead ?? 16, fall: o.fall ?? 1.4, sway: o.sway ?? 0.6, t: 0, center: new THREE.Vector3() };
}

const _f = new THREE.Vector3();
export function animateFall(f, dt, camera) {
  if (!f) return;
  f.t += Math.min(0.1, dt);
  camera.getWorldDirection(_f);
  f.center.copy(camera.position).addScaledVector(_f, f.ahead);
  const [bw, bh, bd] = f.box;
  const x0 = f.center.x - bw / 2, y0 = f.center.y - bh / 2, z0 = f.center.z - bd / 2;
  const arr = f.pts.geometry.attributes.position.array;
  const t = f.t;
  for (let i = 0; i < f.seeds.length; i++) {
    const s = f.seeds[i];
    // Weltlage aus Saat + Fallweg, in den Kasten gewickelt (folgt der Kamera, ohne zu springen)
    const yy = s.y - t * f.fall * s.v;
    const xx = s.x + Math.sin(t * 0.9 * s.v + s.ph) * f.sway + t * 0.25;
    const zz = s.z + Math.cos(t * 0.7 * s.v + s.ph) * f.sway * 0.6;
    arr[i * 3] = x0 + (((xx - x0) % bw) + bw) % bw;
    arr[i * 3 + 1] = y0 + (((yy - y0) % bh) + bh) % bh;
    arr[i * 3 + 2] = z0 + (((zz - z0) % bd) + bd) % bd;
  }
  f.pts.geometry.attributes.position.needsUpdate = true;
}

// ------------------------------------------------------------------ Himmelskörper

/** Mond (Scheibe mit Kratern und weichem Schein) in der Kuppel. dir = Richtung von der Kamera. */
export function moon(sky, dir = [-0.35, 0.42, -1], r = 16, color = 0xfff6d8) {
  const d = new THREE.Vector3(...dir).normalize().multiplyScalar(300);
  const tex = spriteTex(sky, (c, s) => {
    c.fillStyle = '#fff8e0'; c.beginPath(); c.arc(s / 2, s / 2, s * 0.46, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(200,190,170,0.55)';
    for (const [x, y, rr] of [[0.38, 0.4, 0.09], [0.6, 0.55, 0.12], [0.45, 0.68, 0.06], [0.66, 0.32, 0.05]]) { c.beginPath(); c.arc(x * s, y * s, rr * s, 0, Math.PI * 2); c.fill(); }
  }, 128);
  const disc = new THREE.Mesh(sky.track(new THREE.CircleGeometry(r, 32)), sky.track(new THREE.MeshBasicMaterial({ map: tex, color, fog: false, depthWrite: false, transparent: true })));
  disc.position.copy(d);
  disc.lookAt(0, 0, 0);
  disc.renderOrder = -9;
  const glowTex = spriteTex(sky, (c, s) => {
    const g = c.createRadialGradient(s / 2, s / 2, s * 0.1, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,245,210,0.55)'); g.addColorStop(0.5, 'rgba(200,190,255,0.16)'); g.addColorStop(1, 'rgba(160,150,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, s, s);
  }, 128);
  const glow = new THREE.Sprite(sky.track(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
  glow.scale.set(r * 6, r * 6, 1);
  glow.position.copy(d).multiplyScalar(0.98);
  glow.renderOrder = -8;
  sky.domeGroup.add(disc, glow);
  return disc;
}

// ------------------------------------------------------------------ Böden und Ringe

/** Wolkenmeer tief unter den Inseln (unbeleuchtet hell, mit Wolkenbergen). */
export function cloudSea(sky, bounds, rnd, y, o = {}) {
  const x0 = bounds.min.x, x1 = bounds.max.x, z0 = bounds.min.z, z1 = bounds.max.z;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const parts = [];
  const top = lin(o.top ?? 0xffffff), shade = lin(o.shade ?? 0xc8dcf4), deep = lin(o.deep ?? 0xa6c4ea);
  const plane = new THREE.PlaneGeometry((x1 - x0) + 700, (z1 - z0) + 700, 1, 1);
  plane.rotateX(-Math.PI / 2);
  plane.translate(cx, y, cz);
  parts.push(colorize(plane, (p, n, out) => { out[0] = shade[0]; out[1] = shade[1]; out[2] = shade[2]; }));
  const n = o.n ?? 70;
  for (let i = 0; i < n; i++) {
    const x = rnd.real(x0 - 140, x1 + 140), z = rnd.real(z0 - 180, z1 + 60);
    const r = rnd.real(9, 26);
    const g = new THREE.SphereGeometry(1, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2);
    g.scale(r, r * rnd.real(0.35, 0.6), r * rnd.real(0.7, 1.1));
    g.translate(x, y - 0.5, z);
    parts.push(colorize(g.toNonIndexed(), (p, nn, out) => mixc(deep, top, smooth(-0.1, 0.8, nn.y), out)));
  }
  const mat = sky.track(new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }));
  return addMesh(sky, merge(parts), mat);
}

/** Meer bis zum Horizont (Lagune): helles Türkis nah, tiefes Blau fern, sanfte Wellenbänder; Inseln am Rand. */
export function seaPlane(sky, bounds, rnd, y, o = {}) {
  const x0 = bounds.min.x, x1 = bounds.max.x, z0 = bounds.min.z, z1 = bounds.max.z;
  // Meer als Rahmen um den (um hole m erweiterten) Level-Umriss: das Wasser im Level bauen die Bausteine selbst
  const h = o.hole ?? 0, E = 400;
  const ix0 = x0 - h, ix1 = x1 + h, iz0 = z0 - h, iz1 = z1 + h;
  const rect = (ax, az, bx, bz) => {
    const w = bx - ax, d = bz - az;
    const g = new THREE.PlaneGeometry(w, d, Math.max(1, Math.round(w / 14)), Math.max(1, Math.round(d / 14)));
    g.rotateX(-Math.PI / 2);
    g.translate((ax + bx) / 2, y, (az + bz) / 2);
    return g.toNonIndexed();
  };
  const g = merge([
    rect(ix0 - E, iz0 - E, ix1 + E, iz0), rect(ix0 - E, iz1, ix1 + E, iz1 + E),
    rect(ix0 - E, iz0, ix0, iz1), rect(ix1, iz0, ix1 + E, iz1),
  ]);
  const near = lin(o.near ?? 0x5ae0e8), far = lin(o.far ?? 0x1a7ac8), foam = lin(0xe8fbff);
  const sea = colorize(g, (p, n, out) => {
    const d = Math.hypot(Math.max(0, x0 - p.x, p.x - x1), Math.max(0, z0 - p.z, p.z - z1));
    mixc(near, far, smooth(10, 160, d), out);
    const w = Math.sin(p.x * 0.09 + Math.sin(p.z * 0.05) * 2) * Math.sin(p.z * 0.07);
    if (w > 0.82) mixc(out, foam, (w - 0.82) * 2, out);
  });
  addMesh(sky, sea, sky.track(new THREE.MeshBasicMaterial({ vertexColors: true, fog: true })));
  // Inseln mit Palmen-Andeutung am Horizont
  const parts = [];
  const sand = lin(0xf6e2a8), green = lin(0x3ac86a), greenDark = lin(0x1a8a4a);
  for (let i = 0; i < (o.islands ?? 7); i++) {
    const side = i % 2 ? 1 : -1;
    const x = side < 0 ? rnd.real(x0 - 140, x0 - 50) : rnd.real(x1 + 50, x1 + 140), z = rnd.real(z0 - 160, z1 + 20);
    const r = rnd.real(10, 24);
    const isl = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    isl.scale(r, r * 0.28, r * 0.8);
    isl.translate(x, y - 0.3, z);
    parts.push(colorize(isl.toNonIndexed(), (p, n, out) => mixc(sand, greenDark, smooth(0.5, 0.95, n.y) * 0.4, out)));
    const hill = new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    hill.scale(r * 0.6, r * rnd.real(0.5, 0.9), r * 0.5);
    hill.translate(x + rnd.real(-3, 3), y + r * 0.15, z);
    parts.push(colorize(hill.toNonIndexed(), (p, n, out) => mixc(greenDark, green, smooth(-0.2, 0.9, n.y), out)));
  }
  addMesh(sky, merge(parts), sky.view.mats.world);
}

/** Ring aus einfachen Bäumen um den Level (Herbstwald, Tannen) – ein Mesh, ohne Schatten. */
export function treeRing(sky, bounds, rnd, yBase, o = {}) {
  const parts = [];
  const gy = (sky.theme.ground?.y ?? -20) + yBase;
  const x0 = bounds.min.x, x1 = bounds.max.x, z0 = bounds.min.z, z1 = bounds.max.z;
  const cols = (o.colors ?? [0xe8602a, 0xf0a020, 0xd83a2a, 0xf6c040]).map(lin);
  const trunk = lin(o.trunk ?? 0x5a3a22);
  const fir = !!o.fir;
  const snow = lin(0xffffff);
  for (const side of [-1, 1]) {
    for (let z = z1 + 30; z > z0 - 80; z -= rnd.real(5, 9)) {
      for (let row = 0; row < 3; row++) {
        const x = side < 0 ? x0 - rnd.real(16, 30) - row * 14 : x1 + rnd.real(16, 30) + row * 14;
        const h = rnd.real(9, 16) * (1 + row * 0.25);
        const y = gy + (o.lift ?? 0);
        const tr = new THREE.CylinderGeometry(h * 0.04, h * 0.06, h * 0.45, 6);
        tr.translate(x, y + h * 0.22, z);
        parts.push(colorize(tr.toNonIndexed(), (p, n, out) => { out[0] = trunk[0]; out[1] = trunk[1]; out[2] = trunk[2]; }));
        const c = cols[Math.floor(rnd.frac() * cols.length)];
        const dark = mixc(c, [0.05, 0.03, 0.03], 0.5, [0, 0, 0]);
        if (fir) {
          const cone = new THREE.ConeGeometry(h * 0.3, h * 0.85, 8);
          cone.translate(x, y + h * 0.6, z);
          parts.push(colorize(cone.toNonIndexed(), (p, n, out) => { mixc(dark, c, smooth(-0.3, 0.6, n.y), out); if (n.y > 0.35 && (p.y - y) > h * 0.4) mixc(out, snow, 0.75, out); }));
        } else {
          const crown = new THREE.IcosahedronGeometry(h * 0.32, 1);
          crown.scale(1, 1.15, 1);
          crown.translate(x, y + h * 0.66, z);
          parts.push(colorize(crown, (p, n, out) => mixc(dark, c, smooth(-0.5, 0.7, n.y), out)));
        }
      }
    }
  }
  return addMesh(sky, merge(parts), sky.view.mats.world);
}

/** Ferne Burgtürme mit glühenden Fenstern (Festung) – ein Mesh. */
export function towerRing(sky, bounds, rnd, yBase, o = {}) {
  const parts = [];
  const gy = (sky.theme.ground?.y ?? -24) + yBase;
  const x0 = bounds.min.x, x1 = bounds.max.x, z0 = bounds.min.z, z1 = bounds.max.z;
  const stone = lin(o.stone ?? 0x3a2a3a), stoneHi = lin(o.stoneHi ?? 0x6a4a5a), roof = lin(o.roof ?? 0x8a1a2a), win = lin(o.window ?? 0xffb040);
  const tower = (x, z, r, h) => {
    const g = new THREE.CylinderGeometry(r, r * 1.08, h, 10, 6);
    g.translate(x, gy + h / 2, z);
    parts.push(colorize(g.toNonIndexed(), (p, n, out) => {
      mixc(stone, stoneHi, smooth(-0.6, 0.8, n.x * -0.6 + n.z * 0.5), out);
      const yy = p.y - gy, a = Math.atan2(p.z - z, p.x - x);
      if (Math.abs(n.y) < 0.2 && (Math.floor(yy / 4) % 2 === 1) && Math.abs(Math.sin(a * 2.5)) < 0.25 && yy < h - 3) mixc(out, win, 0.9, out);
    }));
    const cone = new THREE.ConeGeometry(r * 1.25, r * 2.2, 10);
    cone.translate(x, gy + h + r * 1.1, z);
    parts.push(colorize(cone.toNonIndexed(), (p, n, out) => mixc(mixc(roof, [0, 0, 0], 0.5, [0, 0, 0]), roof, smooth(-0.3, 0.8, n.y), out)));
  };
  for (let x = x0 - 120; x < x1 + 120; x += rnd.real(24, 40)) tower(x, z0 - rnd.real(90, 150), rnd.real(5, 9), rnd.real(30, 60));
  for (const side of [-1, 1]) for (let z = z1 + 20; z > z0 - 60; z -= rnd.real(30, 46)) tower(side < 0 ? x0 - rnd.real(50, 90) : x1 + rnd.real(50, 90), z, rnd.real(4, 7), rnd.real(24, 44));
  return addMesh(sky, merge(parts), sky.view.mats.world);
}

/** Wimpel-/Fahnenmasten entlang der Strecke (Bergrennen) – ein Mesh. */
export function flagPoles(sky, bounds, rnd, yBase, o = {}) {
  const parts = [];
  const x0 = bounds.min.x, x1 = bounds.max.x, z0 = bounds.min.z, z1 = bounds.max.z;
  const cols = (o.colors ?? [0xe8283a, 0xffd21f, 0x2a7ae8, 0x3ac85a, 0xffffff]).map(lin);
  const pole = lin(0xd8dce8);
  for (const side of [-1, 1]) {
    for (let z = z1; z > z0; z -= rnd.real(14, 22)) {
      const x = side < 0 ? x0 - rnd.real(6, 12) : x1 + rnd.real(6, 12);
      const y = (o.y ?? bounds.min.y) + rnd.real(-2, 1);
      const h = rnd.real(7, 11);
      const g = new THREE.CylinderGeometry(0.12, 0.15, h, 6);
      g.translate(x, y + h / 2, z);
      parts.push(colorize(g.toNonIndexed(), (p, n, out) => { out[0] = pole[0]; out[1] = pole[1]; out[2] = pole[2]; }));
      const c = cols[Math.floor(rnd.frac() * cols.length)];
      const f = new THREE.PlaneGeometry(2.4, 1.4, 4, 1);
      const pa = f.attributes.position;
      for (let v = 0; v < pa.count; v++) pa.setZ(v, Math.sin(pa.getX(v) * 1.6) * 0.25);
      f.translate(1.2, 0, 0);
      f.rotateY(side < 0 ? 0.5 : Math.PI - 0.5);
      f.translate(x, y + h - 0.8, z);
      parts.push(colorize(f.toNonIndexed(), (p, n, out) => { out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; }));
    }
  }
  const mat = sky.track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide }));
  return addMesh(sky, merge(parts), mat);
}

/** Kahle Bäume und Grabsteine als dunkle Silhouetten (Spukhof) – ein Mesh. */
export function spookyRing(sky, bounds, rnd, yBase, o = {}) {
  const parts = [];
  const gy = (sky.theme.ground?.y ?? -16) + yBase;
  const x0 = bounds.min.x, x1 = bounds.max.x, z0 = bounds.min.z, z1 = bounds.max.z;
  const dark = lin(o.color ?? 0x241a38), hi = lin(o.hi ?? 0x46386a);
  const branch = (x, y, z, len, a, b, depth) => {
    const g = new THREE.CylinderGeometry(len * 0.03, len * 0.06, len, 5);
    g.translate(0, len / 2, 0);
    g.rotateZ(a); g.rotateY(b);
    g.translate(x, y, z);
    parts.push(colorize(g.toNonIndexed(), (p, n, out) => mixc(dark, hi, smooth(-0.5, 0.9, n.x * -0.5 + n.y * 0.5), out)));
    if (depth > 0) {
      const ex = x - Math.sin(a) * len * Math.cos(b), ey = y + Math.cos(a) * len, ez = z + Math.sin(a) * len * Math.sin(b);
      branch(ex, ey, ez, len * 0.62, a + rnd.real(0.4, 0.8), b + rnd.real(-0.6, 0.6), depth - 1);
      branch(ex, ey, ez, len * 0.6, a - rnd.real(0.4, 0.8), b + rnd.real(-0.6, 0.6), depth - 1);
    }
  };
  for (const side of [-1, 1]) {
    for (let z = z1 + 20; z > z0 - 50; z -= rnd.real(12, 20)) {
      const x = side < 0 ? x0 - rnd.real(18, 40) : x1 + rnd.real(18, 40);
      branch(x, gy, z, rnd.real(6, 10), rnd.real(-0.1, 0.1), rnd.real(0, 6.28), 3);
      // Grabsteine
      for (let k = 0; k < 2; k++) {
        const g = new THREE.BoxGeometry(1.2, 1.8, 0.4);
        g.translate(x + rnd.real(-6, 6), gy + 0.9, z + rnd.real(-5, 5));
        parts.push(colorize(g.toNonIndexed(), (p, n, out) => mixc(dark, hi, 0.4 + n.y * 0.3, out)));
      }
    }
  }
  return addMesh(sky, merge(parts), sky.view.mats.world);
}
