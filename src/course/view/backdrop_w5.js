// Kulissen-Bausteine der Welt-5-Themen (theme_beach/bluelava/savanna/mine/cake/sneak/temple.js): über die Haken
// theme.buildBackdrop(sky, bounds, rnd, yBase) und theme.updateBackdrop(sky, dt, camera) aus Sky.fit/Sky.update gerufen
// (sky.group = fest in der Welt, sky.domeGroup = folgt der Kamera). Je Kulisse ein bis drei verschmolzene Meshes.

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
const basic = (sky, extra = {}) => sky.track(new THREE.MeshBasicMaterial({ vertexColors: true, fog: true, ...extra }));
const sides = (b) => ({ x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z });

/** Rahmen um den Level-Umriss (um hole m erweitert) als Ebene auf Höhe y – der Level selbst bleibt frei. */
function frame(bounds, y, hole, E = 420, cell = 14) {
  const { x0, x1, z0, z1 } = sides(bounds);
  const ix0 = x0 - hole, ix1 = x1 + hole, iz0 = z0 - hole, iz1 = z1 + hole;
  const rect = (ax, az, bx, bz) => {
    const w = bx - ax, d = bz - az;
    const g = new THREE.PlaneGeometry(w, d, Math.max(1, Math.round(w / cell)), Math.max(1, Math.round(d / cell)));
    g.rotateX(-Math.PI / 2);
    g.translate((ax + bx) / 2, y, (az + bz) / 2);
    return g.toNonIndexed();
  };
  return merge([rect(ix0 - E, iz0 - E, ix1 + E, iz0), rect(ix0 - E, iz1, ix1 + E, iz1 + E), rect(ix0 - E, iz0, ix0, iz1), rect(ix1, iz0, ix1 + E, iz1)]);
}

/** Große Ebene unter dem Level (Boden der Kulisse). */
function plane(bounds, y, cell = 14, E = 420) {
  const { x0, x1, z0, z1 } = sides(bounds);
  const w = (x1 - x0) + E * 2, d = (z1 - z0) + E * 2;
  const g = new THREE.PlaneGeometry(w, d, Math.max(1, Math.round(w / cell)), Math.max(1, Math.round(d / cell)));
  g.rotateX(-Math.PI / 2);
  g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  return g.toNonIndexed();
}

// ------------------------------------------------------------------ Strand

/**
 * Sonnenstrand: türkises Meer bis zum Horizont (hell nah, tiefblau fern, Schaumbänder), weiße Sandbänke, lila
 * Inseln mit Klippen und Palmen-Tupfen (die „Lila Strand-Insel“), ferne Segel. o: { y, hole, islands }.
 */
export function beachSea(sky, bounds, rnd, yBase, o = {}) {
  const { x0, x1, z0, z1 } = sides(bounds);
  const y = (o.y ?? -1.2) + yBase;
  const near = lin(0x3ae8e0), mid = lin(0x1ab8d8), far = lin(0x1462b8), foam = lin(0xf0ffff), shallow = lin(0x8af6e8);
  const sea = colorize(o.hole ? frame(bounds, y, o.hole) : plane(bounds, y, 14), (p, n, out) => {
    const d = Math.hypot(Math.max(0, x0 - p.x, p.x - x1), Math.max(0, z0 - p.z, p.z - z1));
    if (d < 24) mixc(shallow, near, smooth(4, 24, d), out); else if (d < 90) mixc(near, mid, smooth(24, 90, d), out); else mixc(mid, far, smooth(90, 220, d), out);
    const w = Math.sin(p.x * 0.08 + Math.sin(p.z * 0.05) * 2) * Math.sin(p.z * 0.06 + p.x * 0.01);
    if (w > 0.8) mixc(out, foam, (w - 0.8) * 2.4, out);
  });
  addMesh(sky, sea, basic(sky));
  const parts = [];
  const sand = lin(0xfff0c8), sandD = lin(0xe8c88a), lilac = lin(0xb080e8), lilacD = lin(0x7a4ab8), green = lin(0x4ad07a), greenD = lin(0x1e8a52);
  for (let i = 0; i < (o.islands ?? 9); i++) {
    const side = i % 2 ? 1 : -1;
    const x = side < 0 ? rnd.real(x0 - 170, x0 - 55) : rnd.real(x1 + 55, x1 + 170), z = rnd.real(z0 - 190, z1 + 30);
    const r = rnd.real(10, 26);
    const beach = new THREE.SphereGeometry(1, 18, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    beach.scale(r * 1.25, r * 0.12, r);
    beach.translate(x, y, z);
    parts.push(colorize(beach.toNonIndexed(), (p, n, out) => mixc(sandD, sand, smooth(0.2, 0.9, n.y), out)));
    // lila Klippe mit grüner Kappe
    const cliff = new THREE.CylinderGeometry(r * 0.5, r * 0.65, r * rnd.real(0.5, 0.9), 9, 3);
    cliff.translate(x + rnd.real(-3, 3), y + r * 0.3, z + rnd.real(-2, 2));
    parts.push(colorize(cliff, (p, n, out) => (n.y > 0.7 ? mixc(greenD, green, 0.6, out) : mixc(lilacD, lilac, smooth(-0.6, 0.6, n.x * 0.5 + n.z * 0.5 + Math.sin(p.y * 0.8) * 0.2), out))));
    for (let k = 0; k < 3; k++) {
      const tr = new THREE.ConeGeometry(r * 0.12, r * 0.35, 6);
      tr.translate(x + rnd.real(-r * 0.4, r * 0.4), y + r * 0.62, z + rnd.real(-r * 0.3, r * 0.3));
      parts.push(colorize(tr, (p, n, out) => mixc(greenD, green, smooth(-0.3, 0.9, n.y), out)));
    }
  }
  // Segelboote am Horizont
  for (let i = 0; i < 4; i++) {
    const x = rnd.real(x0 - 120, x1 + 120), z = z0 - rnd.real(140, 230);
    const hull = new THREE.BoxGeometry(6, 1.2, 2); hull.translate(x, y + 0.5, z);
    parts.push(colorize(hull, (p, n, out) => { out[0] = 0.9; out[1] = 0.35; out[2] = 0.25; }));
    const sail = new THREE.ConeGeometry(2.4, 7, 3); sail.translate(x, y + 4.6, z);
    parts.push(colorize(sail, (p, n, out) => { out[0] = 1; out[1] = 0.98; out[2] = 0.92; }));
  }
  addMesh(sky, merge(parts), sky.view.mats.world);
}

// ------------------------------------------------------------------ Blaue Lava

/** Blauer Lavasee tief unten (unbeleuchtet, glühend) und Tropfstein-Säulen ringsum (dunkler Fels mit blauem Saum). */
export function blueLavaCave(sky, bounds, rnd, yBase, o = {}) {
  const { x0, x1, z0, z1 } = sides(bounds);
  const y = yBase + (o.y ?? -10);
  const w = (x1 - x0) + 500, d = (z1 - z0) + 500;
  const g = new THREE.PlaneGeometry(w, d, 48, 48);
  g.rotateX(-Math.PI / 2);
  g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  const hot = lin(0xc8faff), mid = lin(0x2aa8ff), dark = lin(0x0a1a6a);
  addMesh(sky, colorize(g, (p, n, out) => {
    const v = Math.sin(p.x * 0.12 + Math.sin(p.z * 0.07) * 2) * 0.5 + Math.sin(p.z * 0.11 + p.x * 0.05) * 0.5;
    if (v > 0.55) mixc(mid, hot, smooth(0.55, 0.95, v), out); else mixc(dark, mid, smooth(-0.8, 0.55, v), out);
  }), basic(sky));
  const parts = [];
  const rock = lin(0x1c1830), rockHi = lin(0x3a3458), rim = lin(0x3a8aff);
  for (const side of [-1, 1]) {
    for (let z = z1 + 30; z > z0 - 70; z -= rnd.real(9, 15)) {
      const x = side < 0 ? x0 - rnd.real(18, 46) : x1 + rnd.real(18, 46);
      const r = rnd.real(2.5, 6), h = rnd.real(30, 60);
      const c = new THREE.CylinderGeometry(r * 0.5, r, h, 8, 4);
      c.translate(x, y + h / 2, z);
      parts.push(colorize(c, (p, n, out) => { mixc(rock, rockHi, smooth(-0.6, 0.8, n.x * side * -0.6 + n.y), out); if (p.y < y + 2.5) mixc(out, rim, 0.6, out); }));
      // Tropfstein von oben
      const st = new THREE.ConeGeometry(r * 0.7, rnd.real(8, 18), 7);
      st.rotateX(Math.PI);
      st.translate(x + rnd.real(-4, 4), bounds.max.y + rnd.real(14, 24), z + rnd.real(-4, 4));
      parts.push(colorize(st, (p, n, out) => mixc(rock, rockHi, smooth(-0.6, 0.6, n.x * 0.5 + n.z * 0.5), out)));
    }
  }
  addMesh(sky, merge(parts), sky.view.mats.world);
}

// ------------------------------------------------------------------ Savanne

/** Savanne: goldene Ebene mit Graswellen, Akazien-Silhouetten am Horizont, Tafelberge und ferne blaue Berge. */
export function savannaRing(sky, bounds, rnd, yBase, o = {}) {
  const { x0, x1, z0, z1 } = sides(bounds);
  const gy = (sky.theme.ground?.y ?? -20) + yBase;
  const gold = lin(0xe8c060), goldD = lin(0xc89a40), green = lin(0xa8b850);
  const plain = colorize(plane(bounds, gy + 0.05, 12), (p, n, out) => {
    const v = Math.sin(p.x * 0.05 + Math.cos(p.z * 0.04) * 1.5) * Math.sin(p.z * 0.045);
    mixc(goldD, gold, smooth(-0.8, 0.8, v), out);
    if (Math.sin(p.x * 0.013 + p.z * 0.017) > 0.7) mixc(out, green, 0.35, out);
  });
  addMesh(sky, plain, sky.view.mats.world);
  const parts = [];
  const sil = lin(0x5a3a22), crown = lin(0x6a7a2a);
  for (let i = 0; i < (o.trees ?? 36); i++) {
    const side = i % 2 ? 1 : -1;
    const x = side < 0 ? rnd.real(x0 - 150, x0 - 30) : rnd.real(x1 + 30, x1 + 150), z = rnd.real(z0 - 160, z1 + 40);
    const H = rnd.real(6, 11);
    const tr = new THREE.CylinderGeometry(0.3, 0.45, H * 0.7, 5); tr.translate(x, gy + H * 0.35, z);
    parts.push(colorize(tr, (p, n, out) => { out[0] = sil[0]; out[1] = sil[1]; out[2] = sil[2]; }));
    const cr = new THREE.CylinderGeometry(H * 0.55, H * 0.42, H * 0.18, 9); cr.translate(x, gy + H * 0.78, z);
    parts.push(colorize(cr, (p, n, out) => mixc(sil, crown, smooth(-0.5, 0.9, n.y), out)));
  }
  const bands = [0xd88a4a, 0xc0703a, 0xe8a868].map(lin), cap = lin(0xf0c080);
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side < 0 ? x0 - rnd.real(60, 140) : x1 + rnd.real(60, 140), z = rnd.real(z0 - 120, z1);
    const r = rnd.real(10, 22), h = rnd.real(16, 34);
    const g = new THREE.CylinderGeometry(r * 0.85, r, h, 10, 5);
    g.translate(x, gy + h / 2 - 1, z);
    parts.push(colorize(g, (p, n, out) => { if (n.y > 0.7) { out[0] = cap[0]; out[1] = cap[1]; out[2] = cap[2]; return; } const b = bands[Math.abs(Math.floor((p.y - gy) / 5)) % bands.length]; out[0] = b[0]; out[1] = b[1]; out[2] = b[2]; }));
  }
  const mt = lin(0x8a9ac8), mtTop = lin(0xc8d0e8);
  for (let x = x0 - 200; x < x1 + 200; x += rnd.real(40, 70)) {
    const r = rnd.real(40, 70), h = rnd.real(50, 90);
    const g = new THREE.ConeGeometry(r, h, 9, 3);
    g.translate(x, gy + h / 2 - 4, z0 - rnd.real(230, 280));
    parts.push(colorize(g, (p, n, out) => mixc(mt, mtTop, smooth(0.6, 1, (p.y - gy) / h), out)));
  }
  addMesh(sky, merge(parts), basic(sky));
}

// ------------------------------------------------------------------ Mine

/** Mine: dunkle Felswände rechts und links mit Holz-Stützrahmen und leuchtenden Laternen, Erzadern (Glüh-Tupfen). */
export function mineShaft(sky, bounds, rnd, yBase, o = {}) {
  const { x0, x1, z0, z1 } = sides(bounds);
  const y0 = bounds.min.y - 6, y1 = bounds.max.y + 18;
  const parts = [], glow = [];
  const rock = lin(0x3a2c26), rockHi = lin(0x6a5444), wood = lin(0x8a5a2e), woodD = lin(0x4a2e18);
  for (const side of [-1, 1]) {
    for (let z = z1 + 20; z > z0 - 30; z -= rnd.real(6, 10)) {
      const x = side < 0 ? x0 - rnd.real(8, 16) : x1 + rnd.real(8, 16);
      const r = rnd.real(5, 9), h = y1 - y0;
      const c = new THREE.CylinderGeometry(r, r * 1.15, h, 7, 6);
      const pos = c.attributes.position;
      for (let i = 0; i < pos.count; i++) { const k = 1 + Math.sin(pos.getY(i) * 0.5 + z) * 0.12; pos.setX(i, pos.getX(i) * k); pos.setZ(i, pos.getZ(i) * k); }
      c.computeVertexNormals();
      c.translate(x, y0 + h / 2, z);
      parts.push(colorize(c, (p, n, out) => mixc(rock, rockHi, smooth(-0.7, 0.8, n.x * -side * 0.7 + n.y * 0.3), out)));
      if (rnd.frac() < 0.5) {
        const by = Math.max(bounds.min.y, 0) + rnd.real(0, 3);
        const post = new THREE.BoxGeometry(0.5, 6, 0.5); post.translate(x - side * r * 0.95, by + 3, z);
        parts.push(colorize(post, (p, n, out) => mixc(woodD, wood, smooth(-0.5, 0.9, n.y + n.x * 0.3), out)));
        const lamp = new THREE.SphereGeometry(0.35, 8, 6); lamp.translate(x - side * (r * 0.95 - 0.6), by + 5, z);
        glow.push(colorize(lamp, (p, n, out) => { out[0] = 1; out[1] = 0.78; out[2] = 0.36; }));
      }
      for (let k = 0; k < 3; k++) {
        const ore = new THREE.OctahedronGeometry(rnd.real(0.25, 0.5), 0);
        ore.translate(x - side * r * 0.9, rnd.real(y0 + 6, y1 - 6), z + rnd.real(-3, 3));
        const blue = rnd.frac() < 0.5;
        glow.push(colorize(ore, (p, n, out) => { out[0] = blue ? 0.35 : 1; out[1] = blue ? 0.75 : 0.62; out[2] = blue ? 1 : 0.2; }));
      }
    }
  }
  addMesh(sky, merge(parts), sky.view.mats.world);
  addMesh(sky, merge(glow), basic(sky));
}

// ------------------------------------------------------------------ Torten-Welt

/** Torten-Welt: Erdbeermilch-Boden, Riesen-Torten, Muffins und Sahnewolken am Horizont, Zuckerstangen. */
export function cakeLand(sky, bounds, rnd, yBase, o = {}) {
  const { x0, x1, z0, z1 } = sides(bounds);
  const gy = (sky.theme.ground?.y ?? -24) + yBase;
  const milk = lin(0xffc8dc), milk2 = lin(0xffe0ea);
  addMesh(sky, colorize(plane(bounds, gy + 0.1, 16), (p, n, out) => mixc(milk, milk2, 0.5 + 0.5 * Math.sin(p.x * 0.04) * Math.sin(p.z * 0.035), out)), basic(sky));
  const parts = [];
  const icing = [0xff8ac8, 0xa8e8ff, 0xfff0a0, 0xc8a8ff, 0x9af0c0].map(lin), cream = lin(0xfffaf4), sponge = lin(0xf0c070), choco = lin(0x8a4a2a);
  for (let i = 0; i < (o.cakes ?? 22); i++) {
    const side = i % 2 ? 1 : -1;
    const x = side < 0 ? rnd.real(x0 - 160, x0 - 35) : rnd.real(x1 + 35, x1 + 160), z = rnd.real(z0 - 170, z1 + 30);
    let r = rnd.real(6, 16);
    let y = gy;
    const tiers = 1 + Math.floor(rnd.frac() * 3);
    const ic = icing[i % icing.length];
    for (let t = 0; t < tiers; t++) {
      const h = r * rnd.real(0.45, 0.7);
      const c = new THREE.CylinderGeometry(r, r, h, 16, 2);
      c.translate(x, y + h / 2, z);
      parts.push(colorize(c, (p, n, out) => { if (n.y > 0.5) { out[0] = ic[0]; out[1] = ic[1]; out[2] = ic[2]; return; } const k = Math.floor((p.y - y) / (h / 4)); mixc(k % 2 ? sponge : (t % 2 ? choco : cream), ic, p.y > y + h * 0.82 ? 0.9 : 0, out); }));
      y += h; r *= 0.7;
    }
    const cherry = new THREE.SphereGeometry(r * 0.35, 8, 6); cherry.translate(x, y + r * 0.3, z);
    parts.push(colorize(cherry, (p, n, out) => mixc(lin(0x9a1020), lin(0xff3a4a), smooth(-0.3, 1, n.y), out)));
  }
  // Sahnewolken
  for (let i = 0; i < 16; i++) {
    const x = rnd.real(x0 - 150, x1 + 150), z = z0 - rnd.real(120, 230), y = gy + rnd.real(40, 80);
    for (let k = 0; k < 4; k++) {
      const s = new THREE.SphereGeometry(rnd.real(5, 10), 10, 7);
      s.translate(x + k * rnd.real(5, 8), y + rnd.real(-2, 2), z);
      parts.push(colorize(s, (p, n, out) => mixc(lin(0xffe0f0), cream, smooth(-0.4, 0.8, n.y), out)));
    }
  }
  addMesh(sky, merge(parts), basic(sky));
}

// ------------------------------------------------------------------ Tempel

/** Ruinen-Tempel: Stufenpyramiden mit Treppen, Dschungel-Kranz, Nebel-Bänke im Tal. */
export function templeRing(sky, bounds, rnd, yBase, o = {}) {
  const { x0, x1, z0, z1 } = sides(bounds);
  const gy = (sky.theme.ground?.y ?? -22) + yBase;
  const parts = [];
  const st = lin(0xd8b880), stD = lin(0x9a7a4a), moss = lin(0x6a9a3a), gold = lin(0xffd060);
  for (let i = 0; i < (o.pyramids ?? 7); i++) {
    const side = i % 2 ? 1 : -1;
    const x = side < 0 ? rnd.real(x0 - 140, x0 - 40) : rnd.real(x1 + 40, x1 + 140), z = rnd.real(z0 - 160, z1);
    let w = rnd.real(22, 40), y = gy;
    const steps = 4 + Math.floor(rnd.frac() * 3);
    for (let k = 0; k < steps; k++) {
      const h = rnd.real(4, 6);
      const b = new THREE.BoxGeometry(w, h, w * 0.9);
      b.translate(x, y + h / 2, z);
      parts.push(colorize(b, (p, n, out) => { mixc(stD, st, smooth(-0.6, 0.9, n.y * 0.6 + n.x * 0.3 + n.z * 0.2), out); if (n.y > 0.5 && Math.sin(p.x * 0.7 + p.z * 0.5) > 0.4) mixc(out, moss, 0.55, out); }));
      y += h; w *= 0.78;
    }
    const top = new THREE.BoxGeometry(w * 0.7, 5, w * 0.6); top.translate(x, y + 2.5, z);
    parts.push(colorize(top, (p, n, out) => mixc(stD, gold, smooth(0.3, 1, n.y), out)));
  }
  const leaf = lin(0x3a9a3a), leafD = lin(0x1e5a2a), trunk = lin(0x5a3a22);
  for (const side of [-1, 1]) {
    for (let z = z1 + 30; z > z0 - 70; z -= rnd.real(5, 8)) {
      for (let row = 0; row < 2; row++) {
        const x = side < 0 ? x0 - rnd.real(20, 38) - row * 12 : x1 + rnd.real(20, 38) + row * 12;
        const H = rnd.real(9, 16);
        const t = new THREE.CylinderGeometry(0.4, 0.6, H, 5); t.translate(x, gy + H / 2, z);
        parts.push(colorize(t, (p, n, out) => { out[0] = trunk[0]; out[1] = trunk[1]; out[2] = trunk[2]; }));
        const c = new THREE.IcosahedronGeometry(rnd.real(3.2, 5), 0); c.scale(1.2, 0.8, 1.2); c.translate(x, gy + H, z);
        parts.push(colorize(c, (p, n, out) => mixc(leafD, leaf, smooth(-0.6, 0.9, n.y), out)));
      }
    }
  }
  addMesh(sky, merge(parts), sky.view.mats.world);
}
