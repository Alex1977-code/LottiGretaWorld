// Kulissen-Bausteine der Welt-6-Themen „Wolkeninseln“ (theme_clearpipe/stonecircle/wreck/fareast/jungle/snowwind/factory/
// fuzzymine.js): über die Haken theme.buildBackdrop(sky, bounds, rnd, yBase) und theme.updateBackdrop(sky, dt, camera) aus
// Sky.fit/Sky.update gerufen (sky.group = fest in der Welt, sky.domeGroup = folgt der Kamera). Je Kulisse ein bis drei
// verschmolzene Meshes (unbeleuchtet bzw. Welt-Material), Bewegtes (Zahnräder, Laternen, Schiffe) als wenige Objekte.

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
const ni = (g) => (g.index ? g.toNonIndexed() : g);

function plane(bounds, y, cell = 14, E = 420) {
  const { x0, x1, z0, z1 } = sides(bounds);
  const w = (x1 - x0) + E * 2, d = (z1 - z0) + E * 2;
  const g = new THREE.PlaneGeometry(w, d, Math.max(1, Math.round(w / cell)), Math.max(1, Math.round(d / cell)));
  g.rotateX(-Math.PI / 2);
  g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  return g.toNonIndexed();
}

/** Punkte rund um den Level (links, rechts, hinten), Abstand zum Umriss near … far. */
function* ringSpots(bounds, rnd, n, near, far) {
  const { x0, x1, z0, z1 } = sides(bounds);
  for (let i = 0; i < n; i++) {
    const k = i % 5;
    if (k === 4) yield { x: rnd.real(x0 - far, x1 + far), z: z0 - rnd.real(near, far) };
    else { const s = k % 2 ? 1 : -1; yield { x: s < 0 ? x0 - rnd.real(near, far) : x1 + rnd.real(near, far), z: rnd.real(z0 - far * 0.6, z1 + near) }; }
  }
}

// ------------------------------------------------------------------ Wolkenmeer (Grund vieler Welt-6-Themen)

/** Wolkenmeer tief unten: helle Ebene mit Wolkenbergen (unbeleuchtet). o: { top, shade, deep, n }. */
export function cloudFloor(sky, bounds, rnd, y, o = {}) {
  const { x0, x1, z0, z1 } = sides(bounds);
  const top = lin(o.top ?? 0xffffff), shade = lin(o.shade ?? 0xd0e0f4), deep = lin(o.deep ?? 0xa8c4e8);
  const parts = [colorize(plane(bounds, y, 40), (p, n, out) => mixc(shade, deep, smooth(-1, 1, Math.sin(p.x * 0.02) * Math.cos(p.z * 0.017)) * 0.4, out))];
  for (let i = 0; i < (o.n ?? 70); i++) {
    const x = rnd.real(x0 - 160, x1 + 160), z = rnd.real(z0 - 200, z1 + 70);
    if (x > x0 - 6 && x < x1 + 6 && z > z0 - 6 && z < z1 + 6 && rnd.frac() < 0.5) continue;
    const r = rnd.real(9, 28);
    const g = new THREE.SphereGeometry(1, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2);
    g.scale(r, r * rnd.real(0.3, 0.55), r * rnd.real(0.7, 1.1));
    g.translate(x, y - 0.5, z);
    parts.push(colorize(ni(g), (p, nn, out) => mixc(deep, top, smooth(-0.1, 0.8, nn.y), out)));
  }
  return addMesh(sky, merge(parts), basic(sky));
}

// ------------------------------------------------------------------ Bergland über den Wolken (clearpipe, snowwind)

/**
 * Berggipfel, die aus dem Wolkenmeer ragen: Fels mit grünen (bzw. verschneiten) Matten, Schneekappen, Bergkiefern; dazu
 * ferne Glasröhren-Bögen zwischen den Gipfeln (clearpipe). o: { y (Wolkenmeer), snow (0..1 Schneegrenze), pipes, n }.
 */
export function cloudPeaks(sky, bounds, rnd, y, o = {}) {
  const parts = [], glass = [];
  const rock = lin(o.rock ?? 0x8a8aa0), rockD = lin(o.rockD ?? 0x5a5a72), green = lin(o.green ?? 0x6ad04a), greenD = lin(o.greenD ?? 0x3a8a3a), snow = lin(0xffffff), snowS = lin(0xc8daf4);
  const pine = lin(o.pine ?? 0x2a7a4a), pineD = lin(o.pineD ?? 0x1a4a2e);
  const peaks = [];
  for (const q of ringSpots(bounds, rnd, o.n ?? 16, 40, 150)) {
    const r = rnd.real(14, 30), h = rnd.real(30, 70);
    const g = new THREE.ConeGeometry(r, h, 9, 6);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const yy = pos.getY(i);
      const k = 1 + Math.sin(i * 1.7 + q.x) * 0.12 * (yy < h / 2 - 0.1 ? 1 : 0);
      pos.setX(i, pos.getX(i) * k); pos.setZ(i, pos.getZ(i) * k);
    }
    g.translate(q.x, y + h / 2 - 6, q.z);
    const snowLine = y + h * (o.snow ?? 0.72) - 6;
    parts.push(colorize(ni(g), (p, n, out) => {
      if (p.y > snowLine + Math.sin(p.x * 0.4 + p.z * 0.3) * 2) { mixc(snowS, snow, smooth(-0.2, 0.8, n.y), out); return; }
      const grassy = n.y > 0.35 && p.y < snowLine - 4;
      if (grassy) mixc(greenD, green, smooth(0.35, 0.8, n.y), out); else mixc(rockD, rock, smooth(-0.5, 0.9, n.x * 0.4 + n.y * 0.7), out);
    }));
    peaks.push({ ...q, h, r });
    // Bergkiefern am Fuß
    for (let k = 0; k < 4; k++) {
      const a = rnd.real(0, Math.PI * 2), d = r * rnd.real(0.55, 0.85);
      const th = rnd.real(4, 7);
      const t = new THREE.ConeGeometry(th * 0.28, th, 6);
      t.translate(q.x + Math.cos(a) * d, y + th / 2 - 1 + rnd.real(0, 6), q.z + Math.sin(a) * d);
      parts.push(colorize(ni(t), (p, n, out) => mixc(pineD, pine, smooth(-0.3, 0.9, n.y), out)));
    }
  }
  addMesh(sky, merge(parts), sky.view.mats.world);
  if (o.pipes) {
    // ferne Glasröhren-Bögen zwischen benachbarten Gipfeln (halbdurchsichtig, ein Mesh)
    for (let i = 0; i + 1 < peaks.length && glass.length < 6; i += 2) {
      const a = peaks[i], b = peaks[i + 1];
      if (Math.hypot(a.x - b.x, a.z - b.z) > 120) continue;
      const ya = y + a.h * 0.55, yb = y + b.h * 0.55, top = Math.max(ya, yb) + 14;
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(a.x, ya, a.z), new THREE.Vector3((a.x + b.x) / 2, top, (a.z + b.z) / 2), new THREE.Vector3(b.x, yb, b.z));
      glass.push(ni(new THREE.TubeGeometry(curve, 24, 1.6, 10, false)));
    }
    if (glass.length) {
      const g = merge(glass.map((x) => { for (const k of Object.keys(x.attributes)) if (k !== 'position' && k !== 'normal') x.deleteAttribute(k); return x; }));
      const m = new THREE.Mesh(sky.track(g), sky.track(new THREE.MeshBasicMaterial({ color: 0xc8f0ff, transparent: true, opacity: 0.35, depthWrite: false, fog: true })));
      m.renderOrder = 1;
      sky.group.add(m);
    }
  }
}

// ------------------------------------------------------------------ Steinkreis (stonecircle)

/** Hohe Menhire im Kreis um den Level-Umriss, Deck-Steine darüber, ferne Schwebeinseln. o: { y, n, r }. */
export function stoneRing(sky, bounds, rnd, yBase, o = {}) {
  const { x0, x1, z0, z1 } = sides(bounds);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const R = o.r ?? Math.max(x1 - x0, z1 - z0) / 2 + 16;
  const parts = [];
  const st = lin(0xb8b4c4), stD = lin(0x6a6680), moss = lin(0x6aa84a);
  const n = o.n ?? 14, gy = yBase + (o.y ?? -1);
  const tops = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd.real(-0.05, 0.05);
    const h = rnd.real(9, 14), w = rnd.real(2.4, 3.4);
    const g = new THREE.BoxGeometry(w, h, w * 0.6, 2, 4, 2);
    const pos = g.attributes.position;
    for (let k = 0; k < pos.count; k++) { const yy = pos.getY(k); const t = (yy + h / 2) / h; pos.setX(k, pos.getX(k) * (1 - t * 0.18)); pos.setZ(k, pos.getZ(k) * (1 - t * 0.18)); }
    g.rotateY(-a + Math.PI / 2);
    const x = cx + Math.cos(a) * R, z = cz + Math.sin(a) * R;
    g.translate(x, gy + h / 2 - 1, z);
    parts.push(colorize(ni(g), (p, nn, out) => { mixc(stD, st, smooth(-0.6, 0.9, nn.y * 0.5 + Math.sin(p.y * 1.3 + p.x) * 0.3), out); if (p.y < gy + 1.2) mixc(out, moss, 0.6, out); }));
    tops.push({ x, z, h });
  }
  // Decksteine (Trilithen) über jedem zweiten Paar
  for (let i = 0; i + 1 < tops.length; i += 3) {
    const a = tops[i], b = tops[i + 1];
    const L = Math.hypot(b.x - a.x, b.z - a.z) + 2;
    const g = new THREE.BoxGeometry(L, 1.6, 2.2);
    g.rotateY(Math.atan2(-(b.z - a.z), b.x - a.x));
    g.translate((a.x + b.x) / 2, gy + Math.min(a.h, b.h) - 0.6, (a.z + b.z) / 2);
    parts.push(colorize(ni(g), (p, nn, out) => mixc(stD, st, smooth(-0.6, 0.9, nn.y), out)));
  }
  // ferne Schwebeinseln
  const grass = lin(0x7ad850), grassD = lin(0x4a9a3a), dirt = lin(0xb88a5a), dirtD = lin(0x7a5a3a);
  for (const q of ringSpots(bounds, rnd, 8, 70, 170)) {
    const r = rnd.real(8, 18);
    const top = new THREE.CylinderGeometry(r, r * 0.95, 2, 12); top.translate(q.x, gy + rnd.real(-10, 25), q.z);
    const yTop = top.attributes.position.getY(0);
    const under = new THREE.ConeGeometry(r * 0.95, r * 1.6, 12); under.rotateX(Math.PI); under.translate(q.x, yTop - 1 - r * 0.8, q.z);
    parts.push(colorize(ni(top), (p, nn, out) => mixc(grassD, grass, smooth(0, 1, nn.y), out)));
    parts.push(colorize(ni(under), (p, nn, out) => mixc(dirtD, dirt, smooth(-0.8, 0.5, nn.x * 0.5 + nn.z * 0.5), out)));
  }
  addMesh(sky, merge(parts), sky.view.mats.world);
}

// ------------------------------------------------------------------ Geistermeer (wreck)

/** Dunkles, nebliges Meer mit Schaumstreifen, Felsnadeln und Silhouetten ferner Geisterschiffe (schaukeln). */
export function ghostSea(sky, bounds, rnd, y, o = {}) {
  const { x0, x1, z0, z1 } = sides(bounds);
  const near = lin(o.near ?? 0x2a6a72), far = lin(o.far ?? 0x16304a), foam = lin(0x9ad8d0);
  addMesh(sky, colorize(plane(bounds, y, 12), (p, n, out) => {
    const d = Math.hypot(Math.max(0, x0 - p.x, p.x - x1), Math.max(0, z0 - p.z, p.z - z1));
    mixc(near, far, smooth(0, 160, d), out);
    const w = Math.sin(p.x * 0.11 + Math.sin(p.z * 0.06) * 2) * Math.sin(p.z * 0.09 + p.x * 0.02);
    if (w > 0.85) mixc(out, foam, (w - 0.85) * 2.5, out);
  }), basic(sky));
  const parts = [];
  const rock = lin(0x3a3a4a), rockH = lin(0x6a6a7a);
  for (const q of ringSpots(bounds, rnd, 14, 30, 140)) {
    const h = rnd.real(8, 26), r = rnd.real(2.5, 7);
    const g = new THREE.ConeGeometry(r, h, 7, 3); g.translate(q.x, y + h / 2 - 1, q.z);
    parts.push(colorize(ni(g), (p, n, out) => mixc(rock, rockH, smooth(-0.6, 0.9, n.x * 0.5 + n.y * 0.5), out)));
  }
  addMesh(sky, merge(parts), sky.view.mats.world);
  // Schiffs-Silhouetten (je eines ein Objekt, schaukeln langsam)
  const ships = [];
  const hullC = lin(0x2a2630), sailC = lin(0x8a9a90);
  for (let i = 0; i < (o.ships ?? 4); i++) {
    const s = i % 2 ? 1 : -1;
    const x = s < 0 ? x0 - rnd.real(50, 120) : x1 + rnd.real(50, 120), z = rnd.real(z0 - 120, z1 - 10);
    const L = rnd.real(18, 28);
    const sp = [];
    const hull = new THREE.CylinderGeometry(L * 0.18, L * 0.12, L, 8, 1); hull.rotateZ(Math.PI / 2); hull.scale(1, 0.6, 1);
    sp.push(colorize(ni(hull), (p, n, out) => mixc(hullC, lin(0x4a4250), smooth(-1, 1, n.y), out)));
    for (const m of [-0.2, 0.15]) {
      const mast = new THREE.CylinderGeometry(0.25, 0.35, L * 0.75, 5); mast.translate(m * L, L * 0.38, 0); sp.push(colorize(ni(mast), (p, n, out) => mixc(hullC, hullC, 0, out)));
      const sail = new THREE.PlaneGeometry(L * 0.04 + 0.1, L * 0.3, 1, 3); sail.rotateY(Math.PI / 2); sail.scale(1, 1, 8); sail.translate(m * L + 0.4, L * 0.45, 0);
      sp.push(colorize(ni(sail), (p, n, out) => mixc(sailC, lin(0xc8d0c4), 0.3, out)));
    }
    const mesh = new THREE.Mesh(sky.track(merge(sp)), sky.track(new THREE.MeshBasicMaterial({ vertexColors: true, fog: true, side: THREE.DoubleSide })));
    mesh.position.set(x, y + 0.5, z);
    mesh.rotation.y = rnd.real(0, Math.PI * 2);
    sky.group.add(mesh);
    ships.push({ mesh, ph: rnd.real(0, 6) });
  }
  return { ships, t: 0 };
}

export function animateShips(s, dt) {
  if (!s) return;
  s.t += Math.min(0.1, dt);
  for (const q of s.ships) { q.mesh.rotation.z = Math.sin(s.t * 0.7 + q.ph) * 0.08; q.mesh.position.y += Math.sin(s.t * 0.9 + q.ph) * 0.004; }
}

// ------------------------------------------------------------------ Fernost-Tal (fareast)

/**
 * Nebliges Tal mit Bergen, Hallen mit geschwungenen Dächern (eigene Fantasie-Formen), Kirschbäumen und schwebenden Laternen
 * (leuchten, steigen langsam). Keine religiösen Symbole.
 */
export function fareastValley(sky, bounds, rnd, yBase, o = {}) {
  const gy = yBase + (o.y ?? -8);
  const parts = [], glow = [];
  const mtn = lin(0x8a9ab8), mtnF = lin(0xd8d8ec), mist = lin(0xf4e8f0);
  for (const q of ringSpots(bounds, rnd, 14, 90, 200)) {
    const r = rnd.real(30, 60), h = rnd.real(40, 90);
    const g = new THREE.ConeGeometry(r, h, 10, 4); g.translate(q.x, gy + h / 2 - 10, q.z);
    parts.push(colorize(ni(g), (p, n, out) => { mixc(mtn, mtnF, smooth(gy, gy + h, p.y), out); if (p.y < gy + 6) mixc(out, mist, 0.7, out); }));
  }
  const red = lin(0xc83a2e), redD = lin(0x8a2420), roof = lin(0x3a4a5a), roofH = lin(0x6a8aa0), wall = lin(0xf6ecd8), gold = lin(0xffc83a);
  const bark = lin(0x5a3a2e), blossom = lin(0xffb8d8), blossomH = lin(0xfff0f6);
  for (const q of ringSpots(bounds, rnd, 10, 26, 80)) {
    if (rnd.frac() < 0.5) {
      // Halle: Sockel, Wände, zwei geschwungene Dächer
      const w = rnd.real(8, 14), d = w * 0.7, h = rnd.real(4, 6), y0 = gy + rnd.real(2, 10);
      const base = new THREE.BoxGeometry(w + 1.5, 1.2, d + 1.5); base.translate(q.x, y0 + 0.6, q.z);
      parts.push(colorize(ni(base), (p, n, out) => mixc(lin(0x8a8a8a), lin(0xc8c8c8), smooth(-1, 1, n.y), out)));
      const body = new THREE.BoxGeometry(w, h, d); body.translate(q.x, y0 + 1.2 + h / 2, q.z);
      parts.push(colorize(ni(body), (p, n, out) => mixc(wall, red, Math.abs(((p.x + p.z) % 2.2)) < 0.25 ? 1 : 0, out)));
      for (let k = 0; k < 2; k++) {
        const rw = (w + 3) * (1 - k * 0.35), rd = (d + 3) * (1 - k * 0.35);
        const rf = new THREE.ConeGeometry(Math.max(rw, rd) * 0.72, 2.6, 4, 2); rf.rotateY(Math.PI / 4); rf.scale(rw / Math.max(rw, rd), 1, rd / Math.max(rw, rd));
        const ps = rf.attributes.position;
        for (let i = 0; i < ps.count; i++) { const yy = ps.getY(i); if (yy < 0) ps.setY(i, yy + Math.hypot(ps.getX(i), ps.getZ(i)) * 0.08); }   // aufgebogene Traufen
        rf.translate(q.x, y0 + 1.2 + h + 1.3 + k * 2.6, q.z);
        parts.push(colorize(ni(rf), (p, n, out) => mixc(roof, roofH, smooth(-0.2, 1, n.y), out)));
      }
      const tip = new THREE.SphereGeometry(0.4, 6, 4); tip.translate(q.x, y0 + 1.2 + h + 6.3, q.z);
      glow.push(colorize(ni(tip), (p, n, out) => mixc(gold, gold, 0, out)));
    } else {
      // Kirschbaum: geschwungener Stamm, Blütenwolken
      const h = rnd.real(4, 7), y0 = gy + rnd.real(2, 10);
      const tr = new THREE.CylinderGeometry(0.3, 0.55, h, 6); tr.rotateZ(rnd.real(-0.25, 0.25)); tr.translate(q.x, y0 + h / 2, q.z);
      parts.push(colorize(ni(tr), (p, n, out) => mixc(bark, lin(0x7a5240), smooth(-1, 1, n.x), out)));
      for (let k = 0; k < 5; k++) {
        const s = new THREE.IcosahedronGeometry(rnd.real(1.4, 2.4), 1);
        s.translate(q.x + rnd.real(-2.2, 2.2), y0 + h + rnd.real(-0.8, 1.2), q.z + rnd.real(-2.2, 2.2));
        parts.push(colorize(ni(s), (p, n, out) => mixc(blossom, blossomH, smooth(-0.3, 0.9, n.y), out)));
      }
    }
  }
  addMesh(sky, merge(parts), sky.view.mats.world);
  if (glow.length) addMesh(sky, merge(glow), sky.view.mats.glow);
  // schwebende Papierlaternen (Instanzen, steigen langsam)
  const n = o.lanterns ?? 26;
  const lg = new THREE.CylinderGeometry(0.45, 0.38, 0.8, 8);
  const im = new THREE.InstancedMesh(sky.track(lg), sky.track(new THREE.MeshBasicMaterial({ color: 0xffb84a, fog: true })), n);
  im.frustumCulled = false;
  const L = [];
  for (const q of ringSpots(bounds, rnd, n, 10, 70)) L.push({ x: q.x, z: q.z, y: gy + rnd.real(0, 40), v: rnd.real(0.25, 0.6), ph: rnd.real(0, 6) });
  sky.group.add(im);
  const f = { im, L, t: 0, y0: gy, y1: gy + 45, m: new THREE.Matrix4() };
  animateLanterns(f, 0);
  return f;
}

export function animateLanterns(f, dt) {
  if (!f) return;
  f.t += Math.min(0.1, dt);
  f.L.forEach((q, i) => {
    q.y += q.v * Math.min(0.1, dt);
    if (q.y > f.y1) q.y = f.y0;
    f.m.makeTranslation(q.x + Math.sin(f.t * 0.5 + q.ph) * 0.6, q.y, q.z + Math.cos(f.t * 0.4 + q.ph) * 0.6);
    f.im.setMatrixAt(i, f.m);
  });
  f.im.instanceMatrix.needsUpdate = true;
}

// ------------------------------------------------------------------ Dschungel (jungle)

/** Lila Giftsee bis zum Horizont, Dschungel-Ufer (Baumriesen mit Kronen, Lianen), ferne Tafelberge im Dunst. */
export function jungleLake(sky, bounds, rnd, y, o = {}) {
  const { x0, x1, z0, z1 } = sides(bounds);
  const lil = lin(0x8a2ad0), lilD = lin(0x3a0a5e), lilH = lin(0xd27aff);
  addMesh(sky, colorize(plane(bounds, y, 10), (p, n, out) => {
    const d = Math.hypot(Math.max(0, x0 - p.x, p.x - x1), Math.max(0, z0 - p.z, p.z - z1));
    const w = Math.sin(p.x * 0.18 + Math.sin(p.z * 0.11) * 2) * Math.sin(p.z * 0.15 + p.x * 0.05);
    mixc(lil, lilD, smooth(10, 140, d), out);
    if (w > 0.7) mixc(out, lilH, (w - 0.7) * 1.6, out);
  }), basic(sky));
  const parts = [];
  const bark = lin(0x5a3a22), barkH = lin(0x8a6a42), leaf = lin(0x3aa83a), leafD = lin(0x1a5a2a), leafH = lin(0x8ae05a), vine = lin(0x2a7a2a);
  for (const q of ringSpots(bounds, rnd, o.n ?? 34, 14, 90)) {
    const h = rnd.real(14, 30);
    const tr = new THREE.CylinderGeometry(0.8, 1.6, h, 7); tr.translate(q.x, y + h / 2 - 1, q.z);
    parts.push(colorize(ni(tr), (p, n, out) => mixc(bark, barkH, smooth(-1, 1, n.x * 0.6 + Math.sin(p.y * 2) * 0.3), out)));
    for (let k = 0; k < 4; k++) {
      const s = new THREE.IcosahedronGeometry(rnd.real(3.5, 6), 1); s.scale(1, 0.55, 1);
      s.translate(q.x + rnd.real(-4, 4), y + h + rnd.real(-2, 2), q.z + rnd.real(-4, 4));
      parts.push(colorize(ni(s), (p, n, out) => mixc(leafD, n.y > 0.6 ? leafH : leaf, smooth(-0.4, 0.9, n.y), out)));
    }
    for (let k = 0; k < 2; k++) {
      const vl = rnd.real(5, 12);
      const v = new THREE.CylinderGeometry(0.08, 0.08, vl, 4); v.translate(q.x + rnd.real(-3, 3), y + h - vl / 2, q.z + rnd.real(-3, 3));
      parts.push(colorize(ni(v), (p, n, out) => mixc(vine, vine, 0, out)));
    }
  }
  const mesa = lin(0x7a8a6a), mesaF = lin(0xb8c8b0);
  for (const q of ringSpots(bounds, rnd, 8, 120, 220)) {
    const r = rnd.real(20, 40), h = rnd.real(25, 50);
    const g = new THREE.CylinderGeometry(r * 0.8, r, h, 9); g.translate(q.x, y + h / 2, q.z);
    parts.push(colorize(ni(g), (p, n, out) => mixc(mesa, mesaF, smooth(y, y + h, p.y) * 0.6 + 0.2, out)));
  }
  addMesh(sky, merge(parts), sky.view.mats.world);
}

// ------------------------------------------------------------------ Maschinenhalle im Himmel (factory)

/** Stahltürme mit Gitterträgern, Rohre, riesige Zahnräder (drehen sich), Dampfwölkchen; darunter das Wolkenmeer. */
export function skyFactory(sky, bounds, rnd, yBase, o = {}) {
  const parts = [];
  const steel = lin(0x6a7486), steelH = lin(0xa8b2c4), rust = lin(0xb8642a), yellow = lin(0xffc83a);
  const towers = [];
  for (const q of ringSpots(bounds, rnd, o.n ?? 12, 30, 110)) {
    const h = rnd.real(30, 70), w = rnd.real(4, 8);
    const y0 = (bounds.min.y ?? 0) - 30;
    const g = new THREE.BoxGeometry(w, h, w); g.translate(q.x, y0 + h / 2, q.z);
    parts.push(colorize(ni(g), (p, n, out) => { mixc(steel, steelH, smooth(-1, 1, n.x * 0.5 + n.z * 0.5), out); if (Math.abs(((p.y + 100) % 6) - 3) < 0.3) mixc(out, yellow, 0.7, out); }));
    // Querträger
    for (let k = 0; k < 3; k++) {
      const b = new THREE.BoxGeometry(w * 3, 0.6, 0.6); b.rotateY(rnd.real(0, Math.PI)); b.translate(q.x, y0 + h * (0.4 + k * 0.2), q.z);
      parts.push(colorize(ni(b), (p, n, out) => mixc(rust, steel, 0.4, out)));
    }
    towers.push({ x: q.x, z: q.z, y: y0 + h, w });
  }
  // Rohre zwischen Türmen
  for (let i = 0; i + 1 < towers.length; i += 2) {
    const a = towers[i], b = towers[i + 1];
    if (Math.hypot(a.x - b.x, a.z - b.z) > 90) continue;
    const curve = new THREE.LineCurve3(new THREE.Vector3(a.x, Math.min(a.y, b.y) - 6, a.z), new THREE.Vector3(b.x, Math.min(a.y, b.y) - 6, b.z));
    parts.push(colorize(ni(new THREE.TubeGeometry(curve, 2, 1, 8, false)), (p, n, out) => mixc(steel, steelH, smooth(-1, 1, n.y), out)));
  }
  addMesh(sky, merge(parts), sky.view.mats.world);
  // Zahnräder (eigene Objekte, drehen sich)
  const gears = [];
  const gmat = sky.track(new THREE.MeshStandardMaterial({ color: 0xb8a070, roughness: 0.45, metalness: 0.6 }));
  for (let i = 0; i < (o.gears ?? 6) && i < towers.length; i++) {
    const t = towers[i];
    const R = rnd.real(5, 11);
    const geo = sky.track(gearGeo(R, Math.round(R * 2.2), R * 0.25));
    const m = new THREE.Mesh(geo, gmat);
    m.position.set(t.x + (rnd.frac() < 0.5 ? -1 : 1) * (t.w / 2 + 0.6), t.y - R - 2, t.z);
    m.rotation.y = rnd.real(0, Math.PI);
    sky.group.add(m);
    gears.push({ m, v: rnd.real(0.1, 0.35) * (i % 2 ? 1 : -1) });
  }
  return { gears };
}

/** Zahnrad-Geometrie (Scheibe mit Zähnen und Speichenlöchern, Achse = Z). */
export function gearGeo(R, teeth = 12, depth = 0.4) {
  const s = new THREE.Shape();
  const n = teeth * 4;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = (i % 4 === 1 || i % 4 === 2) ? R : R * 0.84;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  const hole = new THREE.Path(); hole.absarc(0, 0, R * 0.18, 0, Math.PI * 2, true); s.holes.push(hole);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const h = new THREE.Path(); h.absarc(Math.cos(a) * R * 0.52, Math.sin(a) * R * 0.52, R * 0.17, 0, Math.PI * 2, true); s.holes.push(h);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 6 });
  g.translate(0, 0, -depth / 2);
  return g;
}

export function animateGears(f, dt) {
  if (!f) return;
  const d = Math.min(0.1, dt);
  for (const q of f.gears) q.m.rotation.z += q.v * d;
}

// ------------------------------------------------------------------ Minenschacht nach oben (fuzzymine)

/**
 * Senkrechter Minenschacht: Felswände rings um den Level-Umriss über die ganze Höhe (und darüber), Holz-Stützrahmen in
 * Abständen, leuchtende Laternen und Kristalladern, oben eine helle Öffnung. o: { pad (m Abstand zum Umriss), up (m über
 * dem höchsten Punkt) }.
 */
export function mineShaftUp(sky, bounds, rnd, yBase, o = {}) {
  const { x0, x1, z0, z1 } = sides(bounds);
  const pad = o.pad ?? 9;
  const yb = Math.min(bounds.min.y, yBase) - 20, yt = bounds.max.y + (o.up ?? 30);
  const H = yt - yb;
  const parts = [], glow = [];
  const rock = lin(0x4a3a30), rockH = lin(0x7a6050), rockD = lin(0x2a2018), wood = lin(0x9a6a3a), woodD = lin(0x5a3a1a);
  const ax0 = x0 - pad, ax1 = x1 + pad, az0 = z0 - pad, az1 = z1 + pad + 6;
  const wallG = (w, h, x, y, z, ry) => {
    const g = new THREE.PlaneGeometry(w, h, Math.max(2, Math.round(w / 3)), Math.max(2, Math.round(h / 3)));
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 0.7 + pos.getY(i) * 0.5) * 0.9 + Math.sin(pos.getY(i) * 1.3) * 0.5);
    g.rotateY(ry); g.translate(x, y, z);
    return colorize(ni(g), (p, n, out) => { mixc(rockD, rock, smooth(-0.6, 0.6, Math.sin(p.y * 0.8 + p.x * 0.3) * 0.5 + Math.sin(p.z * 0.9) * 0.5), out); mixc(out, rockH, smooth(0.4, 1, n.y) * 0.4, out); });
  };
  parts.push(wallG(az1 - az0, H, ax0, yb + H / 2, (az0 + az1) / 2, Math.PI / 2));
  parts.push(wallG(az1 - az0, H, ax1, yb + H / 2, (az0 + az1) / 2, -Math.PI / 2));
  parts.push(wallG(ax1 - ax0, H, (ax0 + ax1) / 2, yb + H / 2, az0, 0));
  // Stützrahmen und Laternen an den Wänden
  for (let y = yb + 6; y < yt; y += rnd.real(6, 9)) {
    for (const [x, z, ry] of [[ax0 + 0.6, (az0 + az1) / 2, Math.PI / 2], [ax1 - 0.6, (az0 + az1) / 2, Math.PI / 2], [(ax0 + ax1) / 2, az0 + 0.6, 0]]) {
      const len = ry ? az1 - az0 : ax1 - ax0;
      const beam = new THREE.BoxGeometry(len, 0.5, 0.5); beam.rotateY(ry); beam.translate(x, y, z);
      parts.push(colorize(ni(beam), (p, n, out) => mixc(woodD, wood, smooth(-1, 1, n.y), out)));
    }
    if (rnd.frac() < 0.7) {
      const side = rnd.frac() < 0.5;
      const lx = side ? ax0 + 0.9 : ax1 - 0.9, lz = rnd.real(az0 + 3, az1 - 3);
      const l = new THREE.OctahedronGeometry(0.35, 0); l.scale(1, 1.4, 1); l.translate(lx, y - 0.9, lz);
      glow.push(colorize(ni(l), (p, n, out) => mixc(lin(0xffa040), lin(0xffe0a0), 0.5, out)));
    }
  }
  // senkrechte Pfosten in den Ecken
  for (const [x, z] of [[ax0 + 0.6, az0 + 0.6], [ax1 - 0.6, az0 + 0.6], [ax0 + 0.6, az1 - 2], [ax1 - 0.6, az1 - 2]]) {
    const post = new THREE.BoxGeometry(0.7, H, 0.7); post.translate(x, yb + H / 2, z);
    parts.push(colorize(ni(post), (p, n, out) => mixc(woodD, wood, smooth(-1, 1, n.x * 0.5 + n.z * 0.5), out)));
  }
  // Kristalladern
  for (let i = 0; i < 26; i++) {
    const side = i % 3;
    const y = rnd.real(yb + 4, yt - 4);
    const [x, z] = side === 0 ? [ax0 + 0.4, rnd.real(az0, az1)] : side === 1 ? [ax1 - 0.4, rnd.real(az0, az1)] : [rnd.real(ax0, ax1), az0 + 0.4];
    const c = new THREE.OctahedronGeometry(rnd.real(0.4, 0.9), 0); c.scale(1, 1.8, 1); c.rotateZ(rnd.real(-0.6, 0.6)); c.translate(x, y, z);
    glow.push(colorize(ni(c), (p, n, out) => mixc(lin(0x3a8aff), lin(0xb8f0ff), smooth(-0.6, 1, n.y), out)));
  }
  addMesh(sky, merge(parts), sky.view.mats.world);
  addMesh(sky, merge(glow), sky.view.mats.glow);
  // helle Öffnung oben (Himmel)
  const disc = new THREE.CircleGeometry(Math.max(ax1 - ax0, az1 - az0) * 0.45, 24); disc.rotateX(Math.PI / 2); disc.translate((ax0 + ax1) / 2, yt, (az0 + az1) / 2);
  addMesh(sky, colorize(ni(disc), (p, n, out) => mixc(lin(0xfff4d8), lin(0xffffff), 0.5, out)), basic(sky, { fog: false }));
}

// ------------------------------------------------------------------ Schneetreiben (snowwind)

/** Waagerechtes Schneetreiben (Punkte vor der Kamera, wehen in Windrichtung). o: { n, wind: [x, z] (m/s), size }. */
export function blizzard(sky, rnd, o = {}) {
  const n = o.n ?? 300, B = [50, 26, 50];
  const pos = new Float32Array(n * 3);
  const seeds = [];
  for (let i = 0; i < n; i++) seeds.push({ x: rnd.real(0, B[0]), y: rnd.real(0, B[1]), z: rnd.real(0, B[2]), v: rnd.real(0.7, 1.3), ph: rnd.real(0, 6) });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const cx = c.getContext('2d'); const gr = cx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = gr; cx.fillRect(0, 0, 32, 32);
  const tex = sky.track(new THREE.CanvasTexture(c));
  const pts = new THREE.Points(sky.track(g), sky.track(new THREE.PointsMaterial({ size: o.size ?? 0.24, map: tex, transparent: true, opacity: 0.85, depthWrite: false })));
  pts.frustumCulled = false;
  pts.renderOrder = 4;
  sky.group.add(pts);
  return { pts, seeds, B, t: 0, wind: o.wind ?? [6, -1], center: new THREE.Vector3() };
}

const _f = new THREE.Vector3();
export function animateBlizzard(f, dt, camera) {
  if (!f) return;
  f.t += Math.min(0.1, dt);
  camera.getWorldDirection(_f);
  f.center.copy(camera.position).addScaledVector(_f, 16);
  const [bw, bh, bd] = f.B;
  const x0 = f.center.x - bw / 2, y0 = f.center.y - bh / 2, z0 = f.center.z - bd / 2;
  const arr = f.pts.geometry.attributes.position.array, t = f.t;
  const gust = 1 + 0.6 * Math.max(0, Math.sin(t * 0.7));
  for (let i = 0; i < f.seeds.length; i++) {
    const s = f.seeds[i];
    const xx = s.x + t * f.wind[0] * s.v * gust, zz = s.z + t * f.wind[1] * s.v, yy = s.y - t * 1.2 * s.v + Math.sin(t * 2 + s.ph) * 0.5;
    arr[i * 3] = x0 + (((xx - x0) % bw) + bw) % bw;
    arr[i * 3 + 1] = y0 + (((yy - y0) % bh) + bh) % bh;
    arr[i * 3 + 2] = z0 + (((zz - z0) % bd) + bd) % bd;
  }
  f.pts.geometry.attributes.position.needsUpdate = true;
}
