// Kulissen der Halloween-Themen „Kürbisinsel“ (theme_pumpkin / candyvillage / graveyard / witchtower / castle_night /
// pumpkin_night.js): über die Haken theme.buildBackdrop(sky, bounds, rnd, yBase) und theme.updateBackdrop(sky, dt, camera)
// aus Sky.fit/Sky.update gerufen (sky.group = fest in der Welt, sky.domeGroup = folgt der Kamera). Je Kulisse ein bis
// drei verschmolzene Meshes; Leuchtendes (Kürbisgesichter, Fenster) unbeleuchtet in einem eigenen Mesh. Kindgerecht:
// runde Formen, warme Lichter, Mond mit freundlichem Gesicht – nichts Erschreckendes.
//
//   pumpkinFields(sky, bounds, rnd, yBase, { night })   Kürbisfelder mit Furchen, Kürbissen (nachts mit leuchtenden
//                                                        Gesichtern), Maisreihen, Scheune, Windrad, lila Hügel
//   faceMoon(sky, dir, r, { face, color })              Mond (mit schläfrig-lächelndem Gesicht) und Schein in der Kuppel
//   candyTown(sky, bounds, rnd, yBase)                  schiefe Häuschen mit warmen Fenstern, Bäume, Laternen
//   graveHills(sky, bounds, rnd, yBase)                 Friedhofshügel: Grabsteine, Kreuze, kahle Bäume, Kapelle
//   fogBanks(sky, bounds, rnd, y, o) / animateFog       Bodennebel-Bänke um den Level (treibend)
//   stormClouds(sky, bounds, rnd, yBase) / animateStorm  Wolkenbänke mit sanftem lila Blitzschimmer, schiefe Türme mit
//                                                        grünen Fenstern
//   spookyCastle(sky, bounds, rnd, yBase)               Gruselschloss: Türme mit lila Spitzdächern, Kerzenfenster
//   batFlock(sky, bounds, rnd, o) / animateBats         flatternde Fledermäuse (eine Instanz-Gruppe)

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
const fill = (g, c) => colorize(ni(g), (p, n, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; });

function spriteTex(sky, draw, size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = sky.track(new THREE.CanvasTexture(c));
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
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

/** Punkte um den Level herum (seitlich und hinter dem Ziel), Abstand von bis. */
function ringPoints(bounds, rnd, n, near, far, back = 1) {
  const { x0, x1, z0, z1 } = sides(bounds);
  const out = [];
  for (let i = 0; i < n; i++) {
    const side = i % 3;
    if (side < 2 || !back) {
      const sd = side ? 1 : -1;
      out.push([sd < 0 ? x0 - rnd.real(near, far) : x1 + rnd.real(near, far), rnd.real(z0 - far * 0.6, z1 + near)]);
    } else out.push([rnd.real(x0 - far, x1 + far), z0 - rnd.real(near, far)]);
  }
  return out;
}

/** Einfacher Kürbis (Rippen) für die Kulisse: Weltlage, Radius r. */
function pk(x, y, z, r, col, colLo) {
  const g = new THREE.SphereGeometry(r, 10, 7);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
    const a = Math.atan2(pz, px), k = 0.9 + 0.1 * Math.abs(Math.cos(a * 4));
    pos.setXYZ(i, px * k, py * 0.78, pz * k);
  }
  g.computeVertexNormals();
  g.translate(x, y + r * 0.7, z);
  return colorize(ni(g), (p, n, o) => mixc(colLo, col, smooth(-0.5, 0.9, n.y * 0.6 + n.x * 0.3), o));
}

// ------------------------------------------------------------------ Kürbisfelder

export function pumpkinFields(sky, bounds, rnd, yBase, o = {}) {
  const { x0, x1, z0, z1 } = sides(bounds);
  const gy = (sky.theme.ground?.y ?? -18) + yBase;
  const night = !!o.night;
  const soil = lin(night ? 0x2a1a2a : 0x6a3a2a), soil2 = lin(night ? 0x3a2a3a : 0x8a5434), vine = lin(night ? 0x2a4a3a : 0x6a9a3a);
  // Boden mit Furchen (Feldreihen in Streifen, je Feld andere Richtung)
  addMesh(sky, colorize(plane(bounds, gy + 0.05, 6), (p, n, out) => {
    const fx = Math.floor(p.x / 40), fz = Math.floor(p.z / 40);
    const dirX = ((fx * 7 + fz * 3) & 1) === 0;
    const rows = Math.sin((dirX ? p.x : p.z) * 1.2) > 0.2;
    mixc(soil, soil2, rows ? 0.8 : 0.1, out);
    if (!rows && Math.sin(p.x * 0.4 + p.z * 0.33) > 0.3) mixc(out, vine, 0.55, out);
  }), sky.view.mats.world);
  const parts = [], glow = [];
  const orange = lin(night ? 0xc8601a : 0xff8a1a), orangeLo = lin(night ? 0x6a2a10 : 0xc0500a);
  // Kürbisse auf den Feldern
  for (const [x, z] of ringPoints(bounds, rnd, o.pumpkins ?? 120, 12, 120)) {
    const r = rnd.real(0.6, 1.6);
    parts.push(pk(x, gy, z, r, orange, orangeLo));
    if (night && rnd.frac() < 0.45) {
      // leuchtendes Gesicht zur Mitte des Levels
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const a = Math.atan2(cz - z, cx - x);
      for (const sd of [-1, 1]) {
        const e = new THREE.CircleGeometry(r * 0.2, 3);
        e.rotateY(-a + Math.PI / 2);
        e.translate(x + Math.cos(a) * r * 0.92 - Math.sin(a) * sd * r * 0.32, gy + r * 0.85, z + Math.sin(a) * r * 0.92 + Math.cos(a) * sd * r * 0.32);
        glow.push(fill(e, lin(0xffd040)));
      }
      const m = new THREE.CircleGeometry(r * 0.32, 8, Math.PI, Math.PI);
      m.rotateY(-a + Math.PI / 2);
      m.translate(x + Math.cos(a) * r * 0.92, gy + r * 0.6, z + Math.sin(a) * r * 0.92);
      glow.push(fill(m, lin(0xffb030)));
    }
  }
  // Maisreihen (schmale Kegel), Scheune, Windrad
  const corn = lin(night ? 0x5a5a2a : 0xc8b04a), cornLo = lin(night ? 0x3a3a1a : 0x8a7a2a);
  for (const [x, z] of ringPoints(bounds, rnd, o.corn ?? 60, 30, 110)) {
    for (let k = 0; k < 5; k++) {
      const h = rnd.real(2.2, 3.2);
      const c = new THREE.ConeGeometry(0.5, h, 5);
      c.translate(x + k * 1.2, gy + h / 2, z + rnd.real(-0.4, 0.4));
      parts.push(colorize(ni(c), (p, n, out) => mixc(cornLo, corn, smooth(-0.5, 0.8, n.y + n.x * 0.3), out)));
    }
  }
  const barnRed = lin(night ? 0x5a1a2a : 0xb83a3a), barnRoof = lin(night ? 0x2a1a2a : 0x4a2a3a);
  for (let i = 0; i < 3; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side < 0 ? x0 - rnd.real(60, 110) : x1 + rnd.real(60, 110), z = rnd.real(z0 - 40, z1);
    const b = new THREE.BoxGeometry(10, 7, 14); b.translate(x, gy + 3.5, z);
    parts.push(colorize(ni(b), (p, n, out) => mixc(barnRed, lin(0xffffff), Math.abs(n.y) > 0.5 ? 0 : (Math.sin(p.y * 4) > 0.9 ? 0.3 : 0), out)));
    const r = new THREE.CylinderGeometry(0.1, 7.5, 5, 4, 1); r.rotateY(Math.PI / 4); r.scale(1, 1, 1.3); r.translate(x, gy + 9.5, z);
    parts.push(fill(r, barnRoof));
    const w = new THREE.BoxGeometry(0.2, 2, 2); w.translate(x + side * -5.05, gy + 4.5, z);
    glow.push(fill(w, lin(night ? 0xffc050 : 0xffe0a0)));
  }
  // lila Hügel am Horizont
  const hill = lin(night ? 0x2a1a4a : 0x6a4a8a), hillHi = lin(night ? 0x4a3a6a : 0x9a7ab8);
  for (let x = x0 - 220; x < x1 + 220; x += rnd.real(36, 56)) {
    const r = rnd.real(30, 50), h = rnd.real(18, 34);
    const g = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    g.scale(r, h, r * 0.7); g.translate(x, gy - 1, z0 - rnd.real(170, 230));
    parts.push(colorize(ni(g), (p, n, out) => mixc(hill, hillHi, smooth(0.2, 1, n.y) * 0.5, out)));
  }
  addMesh(sky, merge(parts), sky.view.mats.world);
  if (glow.length) addMesh(sky, merge(glow), basic(sky));
}

// ------------------------------------------------------------------ Mond mit Gesicht

export function faceMoon(sky, dir = [-0.35, 0.42, -1], r = 18, o = {}) {
  const d = new THREE.Vector3(...dir).normalize().multiplyScalar(300);
  const face = o.face !== false;
  const tex = spriteTex(sky, (c, s) => {
    const g = c.createRadialGradient(s * 0.42, s * 0.4, s * 0.05, s / 2, s / 2, s * 0.47);
    g.addColorStop(0, '#fffbe8'); g.addColorStop(1, '#f6e2a8');
    c.fillStyle = g; c.beginPath(); c.arc(s / 2, s / 2, s * 0.46, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(214,196,150,0.55)';
    for (const [x, y, rr] of [[0.3, 0.3, 0.06], [0.7, 0.68, 0.08], [0.66, 0.28, 0.05], [0.28, 0.7, 0.05]]) { c.beginPath(); c.arc(x * s, y * s, rr * s, 0, Math.PI * 2); c.fill(); }
    if (face) {
      // schläfrig-freundliches Gesicht: geschlossene Augenbögen, Lächeln, rosa Wangen
      c.strokeStyle = '#8a6a4a'; c.lineWidth = s * 0.025; c.lineCap = 'round';
      for (const x of [0.38, 0.62]) { c.beginPath(); c.arc(x * s, 0.45 * s, s * 0.06, Math.PI * 0.15, Math.PI * 0.85); c.stroke(); }
      c.beginPath(); c.arc(0.5 * s, 0.56 * s, s * 0.11, Math.PI * 0.2, Math.PI * 0.8); c.stroke();
      c.fillStyle = 'rgba(255,140,140,0.45)';
      for (const x of [0.3, 0.7]) { c.beginPath(); c.arc(x * s, 0.56 * s, s * 0.05, 0, Math.PI * 2); c.fill(); }
    }
  }, 256);
  const disc = new THREE.Mesh(sky.track(new THREE.CircleGeometry(r, 40)), sky.track(new THREE.MeshBasicMaterial({ map: tex, color: o.color ?? 0xffffff, fog: false, depthWrite: false, transparent: true })));
  disc.position.copy(d);
  disc.lookAt(0, 0, 0);
  disc.renderOrder = -9;
  const glowTex = spriteTex(sky, (c, s) => {
    const g = c.createRadialGradient(s / 2, s / 2, s * 0.12, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,240,200,0.6)'); g.addColorStop(0.45, 'rgba(220,200,255,0.18)'); g.addColorStop(1, 'rgba(160,150,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, s, s);
  });
  const glow = new THREE.Sprite(sky.track(new THREE.SpriteMaterial({ map: glowTex, color: o.glow ?? 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
  glow.scale.set(r * 6, r * 6, 1);
  glow.position.copy(d).multiplyScalar(0.98);
  glow.renderOrder = -8;
  sky.domeGroup.add(disc, glow);
  return disc;
}

// ------------------------------------------------------------------ Süßes-oder-Saures-Dorf

export function candyTown(sky, bounds, rnd, yBase, o = {}) {
  const { x0, x1, z0, z1 } = sides(bounds);
  const gy = (sky.theme.ground?.y ?? -16) + yBase;
  const parts = [], glow = [];
  const walls = [0x8a6ab8, 0xb8784a, 0x5a8a7a, 0x7a7ab8, 0xa85a6a].map(lin);
  const roofs = [0x3a2a5a, 0x4a2a3a, 0x2a3a4a].map(lin);
  const win = lin(0xffc860), winHi = lin(0xfff0b0);
  addMesh(sky, colorize(plane(bounds, gy + 0.05, 10), (p, n, out) => mixc(lin(0x2a3a3a), lin(0x3a4a3a), 0.5 + 0.5 * Math.sin(p.x * 0.07) * Math.sin(p.z * 0.06), out)), sky.view.mats.world);
  const house = (x, z, s, yaw) => {
    const w = 6 * s, d = 6 * s, h = rnd.real(5, 8) * s;
    const lean = rnd.real(-0.06, 0.06);
    const wc = walls[Math.floor(rnd.frac() * walls.length)], rc = roofs[Math.floor(rnd.frac() * roofs.length)];
    const b = new THREE.BoxGeometry(w, h, d); b.translate(0, h / 2, 0); b.rotateZ(lean);
    const r = new THREE.ConeGeometry(w * 0.82, h * 0.7, 4); r.rotateY(Math.PI / 4); r.rotateZ(lean * 2); r.translate(lean * -h, h + h * 0.35, 0);
    const ch = new THREE.BoxGeometry(0.9 * s, 2.4 * s, 0.9 * s); ch.translate(w * 0.25, h + 0.8 * s, d * 0.15);
    for (const [g, c] of [[b, wc], [r, rc], [ch, lin(0x6a3a2a)]]) { g.rotateY(yaw); g.translate(x, gy, z); parts.push(colorize(ni(g), (p, n, out) => mixc([c[0] * 0.55, c[1] * 0.55, c[2] * 0.55], c, smooth(-0.6, 0.9, n.y * 0.5 + n.x * 0.3 + n.z * 0.3), out))); }
    // Fenster (warm leuchtend) auf allen vier Seiten
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2;
      for (const fy of h > 6 * s ? [0.3, 0.68] : [0.4]) {
        if (rnd.frac() < 0.3) continue;
        const wg = new THREE.PlaneGeometry(1.1 * s, 1.3 * s);
        wg.translate(rnd.real(-1.2, 1.2) * s, h * fy, d / 2 + 0.03);
        wg.rotateY(a + yaw); wg.translate(x, gy, z);
        glow.push(colorize(ni(wg), (p, n, out) => mixc(win, winHi, smooth(gy + h * fy - 0.6 * s, gy + h * fy + 0.6 * s, p.y), out)));
      }
    }
  };
  for (const side of [-1, 1]) {
    for (let z = z1 + 30; z > z0 - 60; z -= rnd.real(9, 14)) {
      for (let row = 0; row < 2; row++) {
        const x = side < 0 ? x0 - rnd.real(14, 22) - row * 16 : x1 + rnd.real(14, 22) + row * 16;
        house(x, z + rnd.real(-2, 2), rnd.real(0.8, 1.3), rnd.real(-0.3, 0.3) + (side < 0 ? Math.PI / 2 : -Math.PI / 2));
      }
    }
  }
  for (let x = x0 - 80; x < x1 + 80; x += rnd.real(12, 18)) house(x, z0 - rnd.real(30, 60), rnd.real(0.9, 1.4), rnd.real(-0.3, 0.3));
  // runde Bäume (dunkel) und Hügel dahinter
  const tree = lin(0x1e3a3a), treeHi = lin(0x3a5a4a), trunk = lin(0x2a1a1a);
  for (const [x, z] of ringPoints(bounds, rnd, 40, 20, 90)) {
    const H = rnd.real(5, 9);
    const t = new THREE.CylinderGeometry(0.3, 0.4, H * 0.5, 5); t.translate(x, gy + H * 0.25, z);
    parts.push(fill(t, trunk));
    const c = new THREE.SphereGeometry(H * 0.32, 8, 6); c.translate(x, gy + H * 0.62, z);
    parts.push(colorize(ni(c), (p, n, out) => mixc(tree, treeHi, smooth(-0.3, 1, n.y), out)));
  }
  for (let x = x0 - 220; x < x1 + 220; x += rnd.real(40, 60)) {
    const r = rnd.real(30, 50), h = rnd.real(20, 34);
    const g = new THREE.SphereGeometry(1, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2);
    g.scale(r, h, r * 0.7); g.translate(x, gy - 1, z0 - rnd.real(170, 230));
    parts.push(colorize(ni(g), (p, n, out) => mixc(lin(0x1a1a3a), lin(0x2a2a5a), smooth(0.2, 1, n.y), out)));
  }
  addMesh(sky, merge(parts), sky.view.mats.world);
  addMesh(sky, merge(glow), basic(sky));
}

// ------------------------------------------------------------------ Nebelfriedhof

export function graveHills(sky, bounds, rnd, yBase, o = {}) {
  const { x0, x1, z0 } = sides(bounds);
  const gy = (sky.theme.ground?.y ?? -16) + yBase;
  const parts = [], glow = [];
  const dark = lin(o.color ?? 0x232846), hi = lin(o.hi ?? 0x4a4e7a), stone = lin(0x6a6a8a), stoneHi = lin(0x9a9ab8);
  addMesh(sky, colorize(plane(bounds, gy + 0.05, 10), (p, n, out) => mixc(lin(0x1a2a3a), lin(0x2a3a4a), 0.5 + 0.5 * Math.sin(p.x * 0.05 + p.z * 0.04), out)), sky.view.mats.world);
  // Hügel mit Grabsteinen und Kreuzen
  for (const [x, z] of ringPoints(bounds, rnd, o.hills ?? 18, 26, 110)) {
    const r = rnd.real(12, 24), h = rnd.real(4, 9);
    const g = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    g.scale(r, h, r); g.translate(x, gy - 0.5, z);
    parts.push(colorize(ni(g), (p, n, out) => mixc(dark, hi, smooth(0.2, 1, n.y) * 0.7, out)));
    for (let k = 0; k < 6; k++) {
      const a = rnd.real(0, 6.28), d = rnd.real(0, r * 0.7);
      const gx = x + Math.cos(a) * d, gz = z + Math.sin(a) * d;
      const top = gy + h * Math.sqrt(Math.max(0, 1 - (d / r) ** 2)) - 0.3;
      const s = rnd.real(1, 1.8);
      if (rnd.frac() < 0.3) {
        const v = new THREE.BoxGeometry(0.3 * s, 1.8 * s, 0.3 * s); v.translate(gx, top + 0.9 * s, gz);
        const hz = new THREE.BoxGeometry(0.3 * s, 0.3 * s, 1.1 * s); hz.translate(gx, top + 1.25 * s, gz);
        parts.push(colorize(ni(v), (p, n, out) => mixc(stone, stoneHi, smooth(-0.3, 1, n.y), out)), colorize(ni(hz), (p, n, out) => mixc(stone, stoneHi, smooth(-0.3, 1, n.y), out)));
      } else {
        const b = new THREE.BoxGeometry(0.35 * s, 1.1 * s, 0.9 * s); b.translate(gx, top + 0.55 * s, gz);
        const c = new THREE.CylinderGeometry(0.45 * s, 0.45 * s, 0.35 * s, 10, 1, false, 0, Math.PI); c.rotateX(Math.PI / 2); c.rotateZ(Math.PI / 2); c.rotateY(Math.PI / 2); c.translate(gx, top + 1.1 * s, gz);
        for (const q of [b, c]) parts.push(colorize(ni(q), (p, n, out) => mixc(stone, stoneHi, smooth(-0.3, 1, n.y * 0.6 + n.x * 0.3), out)));
      }
    }
  }
  // kahle Bäume
  const branch = (x, y, z, len, a, b, depth) => {
    const g = new THREE.CylinderGeometry(len * 0.03, len * 0.06, len, 5);
    g.translate(0, len / 2, 0); g.rotateZ(a); g.rotateY(b); g.translate(x, y, z);
    parts.push(colorize(ni(g), (p, n, out) => mixc(dark, hi, smooth(-0.5, 0.9, n.y * 0.5), out)));
    if (depth > 0) {
      const ex = x - Math.sin(a) * len * Math.cos(b), ey = y + Math.cos(a) * len, ez = z + Math.sin(a) * len * Math.sin(b);
      branch(ex, ey, ez, len * 0.64, a + rnd.real(0.4, 0.9), b + rnd.real(-0.6, 0.6), depth - 1);
      branch(ex, ey, ez, len * 0.6, a - rnd.real(0.4, 0.9), b + rnd.real(-0.6, 0.6), depth - 1);
    }
  };
  for (const [x, z] of ringPoints(bounds, rnd, o.trees ?? 16, 22, 70)) branch(x, gy, z, rnd.real(6, 10), rnd.real(-0.12, 0.12), rnd.real(0, 6.28), 3);
  // Kapelle mit warmem Fenster hinter dem Ziel
  const cx = (x0 + x1) / 2 + rnd.real(-30, 30), cz = z0 - rnd.real(90, 130);
  const body = new THREE.BoxGeometry(10, 9, 14); body.translate(cx, gy + 4.5, cz);
  const roof = new THREE.CylinderGeometry(0.1, 8, 6, 4); roof.rotateY(Math.PI / 4); roof.scale(1, 1, 1.3); roof.translate(cx, gy + 12, cz);
  const tower = new THREE.BoxGeometry(4, 16, 4); tower.translate(cx, gy + 8, cz + 7);
  const spire = new THREE.ConeGeometry(3.2, 7, 4); spire.rotateY(Math.PI / 4); spire.translate(cx, gy + 19.5, cz + 7);
  for (const g of [body, roof, tower, spire]) parts.push(colorize(ni(g), (p, n, out) => mixc(dark, hi, smooth(-0.4, 1, n.y * 0.5 + n.z * 0.4), out)));
  for (const [dx, dy] of [[-2.5, 4], [2.5, 4], [0, 12]]) {
    const w = new THREE.CircleGeometry(dy > 10 ? 0.9 : 1.1, 10); w.translate(cx + dx, gy + dy, cz + (dy > 10 ? 9.05 : 7.05));
    glow.push(fill(w, lin(0xffc060)));
  }
  addMesh(sky, merge(parts), sky.view.mats.world);
  addMesh(sky, merge(glow), basic(sky));
}

/** Bodennebel-Bänke rings um den Level (weiche, langsam treibende Flächen), y = Höhe. Liefert ein Objekt für animateFog. */
export function fogBanks(sky, bounds, rnd, y, o = {}) {
  const { x0, x1, z0, z1 } = sides(bounds);
  const tex = spriteTex(sky, (c, s) => {
    c.clearRect(0, 0, s, s);
    for (let i = 0; i < 40; i++) {
      const x = rnd.real(0, s), yy = rnd.real(0, s), r = rnd.real(s * 0.1, s * 0.25), a = rnd.real(0.08, 0.22);
      for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) {
        const g = c.createRadialGradient(x + ox, yy + oy, 0, x + ox, yy + oy, r);
        g.addColorStop(0, `rgba(255,255,255,${a.toFixed(2)})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.fillRect(x + ox - r, yy + oy - r, r * 2, r * 2);
      }
    }
  }, 128);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const layers = [];
  for (let i = 0; i < (o.layers ?? 2); i++) {
    const w = (x1 - x0) + 260, d = (z1 - z0) + 260;
    const g = new THREE.PlaneGeometry(w, d, 1, 1);
    g.rotateX(-Math.PI / 2);
    g.translate((x0 + x1) / 2, y + i * (o.step ?? 2.2), (z0 + z1) / 2);
    const t = tex.clone(); t.needsUpdate = true; sky.track(t);
    t.repeat.set(w / 40, d / 40);
    const m = new THREE.Mesh(sky.track(g), sky.track(new THREE.MeshBasicMaterial({ map: t, color: o.color ?? 0xc8d0ff, transparent: true, opacity: o.opacity ?? 0.55, depthWrite: false, fog: true })));
    m.renderOrder = 1;
    sky.group.add(m);
    layers.push({ m, t, v: [rnd.real(0.004, 0.01) * (i % 2 ? 1 : -1), rnd.real(0.002, 0.006)] });
  }
  return { layers };
}

export function animateFog(f, dt) {
  if (!f) return;
  for (const l of f.layers) { l.t.offset.x += l.v[0] * dt; l.t.offset.y += l.v[1] * dt; }
}

// ------------------------------------------------------------------ Hexenturm: Wolken, Blitzschimmer, schiefe Türme

export function stormClouds(sky, bounds, rnd, yBase, o = {}) {
  const { x0, x1, z0, z1 } = sides(bounds);
  const parts = [], glow = [];
  const cTop = lin(0x5a4a8a), cLow = lin(0x221a3a), cRim = lin(0x9a7ad8);
  const puff = (x, y, z, r) => {
    const g = new THREE.SphereGeometry(r, 10, 7);
    g.scale(1, 0.62, 1); g.translate(x, y, z);
    parts.push(colorize(ni(g), (p, n, out) => { mixc(cLow, cTop, smooth(-0.6, 0.8, n.y), out); if (n.y > 0.55) mixc(out, cRim, (n.y - 0.55) * 1.4, out); }));
  };
  const ymin = bounds.min.y, ymax = bounds.max.y;
  for (const [x, z] of ringPoints(bounds, rnd, o.banks ?? 22, 18, 90)) {
    const y = rnd.real(ymin - 14, ymax + 10);
    const n = 3 + Math.floor(rnd.frac() * 3);
    for (let k = 0; k < n; k++) puff(x + rnd.real(-8, 8), y + rnd.real(-1.5, 1.5), z + rnd.real(-6, 6), rnd.real(4, 9));
  }
  // Wolkenmeer tief unten
  for (let i = 0; i < 40; i++) puff(rnd.real(x0 - 120, x1 + 120), ymin - rnd.real(16, 22), rnd.real(z0 - 140, z1 + 60), rnd.real(10, 20));
  // schiefe Hexentürme in der Ferne mit grünen Fenstern
  const tw = lin(0x2a2040), twHi = lin(0x4a3a6a), roof = lin(0x3a1a5a);
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side < 0 ? x0 - rnd.real(70, 130) : x1 + rnd.real(70, 130), z = rnd.real(z0 - 60, z1);
    const h = rnd.real(40, 70), r = rnd.real(4, 7), lean = rnd.real(-0.12, 0.12);
    const t = new THREE.CylinderGeometry(r * 0.85, r, h, 10, 5); t.translate(0, h / 2, 0); t.rotateZ(lean);
    const c = new THREE.ConeGeometry(r * 1.4, r * 3, 10); const cp = c.attributes.position;
    for (let k = 0; k < cp.count; k++) { const yy = cp.getY(k) + r * 1.5; cp.setX(k, cp.getX(k) + yy * yy * 0.03); }
    c.computeVertexNormals(); c.translate(-Math.sin(lean) * h, h + r * 1.5, 0);
    for (const g of [t, c]) { g.translate(x, ymin - 20, z); parts.push(colorize(ni(g), (p, n, out) => mixc(g === c ? [roof[0] * 0.6, roof[1] * 0.6, roof[2] * 0.6] : tw, g === c ? roof : twHi, smooth(-0.4, 0.9, n.y * 0.5 + n.x * 0.4), out))); }
    for (let k = 0; k < 4; k++) {
      const w = new THREE.PlaneGeometry(1.4, 2); const yy = rnd.real(0.3, 0.9) * h;
      w.translate(-Math.sin(lean) * yy, yy, r * 0.95); w.rotateY(rnd.real(-0.8, 0.8)); w.translate(x, ymin - 20, z);
      glow.push(fill(w, lin(0x8aff6a)));
    }
  }
  const cloudMat = basic(sky);
  const mesh = addMesh(sky, merge(parts), cloudMat);
  addMesh(sky, merge(glow), basic(sky));
  // Blitzschimmer: ein weicher lila Schein in den Wolken (additiv), sanft an und aus
  const flashTex = spriteTex(sky, (c, s) => { const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(230,210,255,0.9)'); g.addColorStop(1, 'rgba(160,120,255,0)'); c.fillStyle = g; c.fillRect(0, 0, s, s); });
  const flash = new THREE.Sprite(sky.track(new THREE.SpriteMaterial({ map: flashTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
  flash.scale.set(120, 80, 1);
  flash.renderOrder = -7;
  sky.domeGroup.add(flash);
  return { mesh, mat: cloudMat, flash, t: 0, next: 4 + rnd.real(0, 4), k: 0, rnd };
}

export function animateStorm(s, dt) {
  if (!s) return;
  const d = Math.min(0.1, dt);
  s.t += d;
  s.next -= d;
  if (s.next <= 0) { s.k = 1; s.next = s.rnd.real(6, 11); const a = s.rnd.real(-1, 1); s.flash.position.set(Math.sin(a) * 260, 90 + s.rnd.real(0, 50), -Math.cos(a) * 260); }
  // sanftes An- und Abschwellen (kein harter Blitz): 0,3 s an, 0,9 s aus, kleines Nachflackern
  s.k = Math.max(0, s.k - d / 1.2);
  const u = 1 - s.k;
  const glow = s.k > 0 ? Math.sin(Math.min(1, u * 4) * Math.PI * 0.5) * s.k * (1 + 0.25 * Math.sin(u * 30)) : 0;
  s.flash.material.opacity = 0.55 * glow;
  s.mat.color.setScalar(1 + 0.45 * glow);
}

// ------------------------------------------------------------------ Gruselschloss

export function spookyCastle(sky, bounds, rnd, yBase, o = {}) {
  const { x0, x1, z0, z1 } = sides(bounds);
  const gy = (o.y ?? -16) + yBase;
  const parts = [], glow = [];
  const st = lin(0x3a3450), stHi = lin(0x6a6488), roof = lin(0x4a2a7a), roofHi = lin(0x8a5ac8), win = lin(0xffc050);
  const stoneCol = (p, n, out) => { mixc(st, stHi, smooth(-0.7, 0.8, n.y * 0.4 - n.x * 0.3 + n.z * 0.5), out); if (Math.abs(n.y) < 0.3 && ((Math.floor(p.y / 1.2) + Math.floor((p.x + p.z) / 2.4)) & 1)) { out[0] *= 0.9; out[1] *= 0.9; out[2] *= 0.9; } };
  const tower = (x, z, r, h) => {
    const t = new THREE.CylinderGeometry(r, r * 1.08, h, 12, 4); t.translate(x, gy + h / 2, z);
    parts.push(colorize(ni(t), stoneCol));
    const c = new THREE.ConeGeometry(r * 1.35, r * 3, 12); const cp = c.attributes.position;
    for (let k = 0; k < cp.count; k++) { const yy = cp.getY(k) + r * 1.5; cp.setX(k, cp.getX(k) + yy * yy * 0.025); }
    c.computeVertexNormals(); c.translate(x, gy + h + r * 1.5, z);
    parts.push(colorize(ni(c), (p, n, out) => mixc(roof, roofHi, smooth(-0.3, 0.9, n.y + n.x * 0.3), out)));
    for (let k = 0; k < 3; k++) {
      const a = rnd.real(0, 6.28), yy = gy + rnd.real(0.35, 0.85) * h;
      const w = new THREE.PlaneGeometry(1.2, 2.2); w.translate(0, 0, r + 0.05); w.rotateY(a); w.translate(x, yy, z);
      glow.push(fill(w, win));
    }
  };
  for (const side of [-1, 1]) {
    for (let z = z1 + 30; z > z0 - 60; z -= rnd.real(26, 36)) {
      const x = side < 0 ? x0 - rnd.real(24, 34) : x1 + rnd.real(24, 34);
      const h = rnd.real(28, 44);
      const wl = new THREE.BoxGeometry(5, h * 0.6, 28); wl.translate(x, gy + h * 0.3, z - 14);
      parts.push(colorize(ni(wl), stoneCol));
      tower(x, z, rnd.real(3.5, 5.5), h);
    }
  }
  // Hauptburg hinter dem Ziel
  const cx = (x0 + x1) / 2, cz = z0 - rnd.real(60, 80);
  const keep = new THREE.BoxGeometry(40, 30, 20); keep.translate(cx, gy + 15, cz);
  parts.push(colorize(ni(keep), stoneCol));
  for (const dx of [-22, -8, 8, 22]) tower(cx + dx, cz + 8, rnd.real(4, 6), rnd.real(36, 56));
  for (let k = 0; k < 10; k++) {
    const w = new THREE.PlaneGeometry(1.6, 2.6); w.translate(cx + rnd.real(-18, 18), gy + rnd.real(8, 26), cz + 10.05);
    glow.push(fill(w, win));
  }
  addMesh(sky, merge(parts), sky.view.mats.world);
  addMesh(sky, merge(glow), basic(sky));
}

// ------------------------------------------------------------------ Fledermäuse

export function batFlock(sky, bounds, rnd, o = {}) {
  const n = o.n ?? 10;
  const sh = new THREE.Shape();
  sh.moveTo(0, 0.1); sh.lineTo(0.08, 0.2); sh.lineTo(0.12, 0.06); sh.quadraticCurveTo(0.35, 0.22, 0.6, 0.1);
  sh.quadraticCurveTo(0.46, 0.0, 0.5, -0.1); sh.quadraticCurveTo(0.32, -0.04, 0.22, -0.12); sh.quadraticCurveTo(0.08, -0.06, 0, -0.18);
  sh.quadraticCurveTo(-0.08, -0.06, -0.22, -0.12); sh.quadraticCurveTo(-0.32, -0.04, -0.5, -0.1); sh.quadraticCurveTo(-0.46, 0.0, -0.6, 0.1);
  sh.quadraticCurveTo(-0.35, 0.22, -0.12, 0.06); sh.lineTo(-0.08, 0.2); sh.closePath();
  const g = new THREE.ShapeGeometry(sh, 4);
  g.rotateX(-Math.PI / 2);
  const mat = sky.track(new THREE.MeshBasicMaterial({ color: o.color ?? 0x2a1a3a, side: THREE.DoubleSide, fog: true }));
  const mesh = new THREE.InstancedMesh(sky.track(g), mat, n);
  mesh.frustumCulled = false;
  const { x0, x1, z0 } = sides(bounds);
  const bats = [];
  for (let i = 0; i < n; i++) bats.push({ cx: rnd.real(x0 - 10, x1 + 10), cz: rnd.real(z0 - 30, bounds.max.z), cy: bounds.max.y + rnd.real(6, 18), r: rnd.real(6, 14), a: rnd.real(0, 6.28), v: rnd.real(0.35, 0.6) * (i % 2 ? 1 : -1), s: rnd.real(1.2, 2), f: rnd.real(0, 6) });
  sky.group.add(mesh);
  const b = { mesh, bats, t: 0 };
  animateBats(b, 0);
  return b;
}

const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler();
export function animateBats(b, dt) {
  if (!b) return;
  b.t += Math.min(0.1, dt);
  b.bats.forEach((bt, i) => {
    bt.a += bt.v * Math.min(0.1, dt);
    const flap = Math.sin(b.t * 14 + bt.f);
    _p.set(bt.cx + Math.cos(bt.a) * bt.r, bt.cy + Math.sin(b.t * 1.3 + bt.f) * 1.2, bt.cz - Math.sin(bt.a) * bt.r);
    _e.set(0, bt.a + (bt.v > 0 ? Math.PI / 2 : -Math.PI / 2), 0);
    _q.setFromEuler(_e);
    _s.set(bt.s * (0.55 + 0.45 * Math.abs(flap)), bt.s, bt.s);
    _m.compose(_p, _q, _s);
    b.mesh.setMatrixAt(i, _m);
  });
  b.mesh.instanceMatrix.needsUpdate = true;
}
