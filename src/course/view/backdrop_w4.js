// Kulissen-Bausteine der Welt-4-Themen (theme_canyon/poison/beep/bounce/ruins/lavacastle.js): über die Haken
// theme.buildBackdrop(sky, bounds, rnd, yBase) und theme.updateBackdrop(sky, dt, camera) aus Sky.fit/Sky.update gerufen
// (sky.group = fest in der Welt, sky.domeGroup = folgt der Kamera). Je Kulisse ein bis drei verschmolzene Meshes; Tiere,
// Ballons und Lichter sind je eine Instanz-Gruppe bzw. ein Mesh mit wenigen Animationswerten.

import * as THREE from 'three';
import { colorize, merge, lin, mixc, smooth } from '../../three/world/geometry.js';
import { music } from '../../audio/index.js';

function addMesh(sky, g, mat, parent = sky.group, order = 0) {
  if (!g) return null;
  const mesh = new THREE.Mesh(sky.track(g), mat);
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  mesh.renderOrder = order;
  parent.add(mesh);
  return mesh;
}

const glowMat = (sky, opts = {}) => sky.track(new THREE.MeshBasicMaterial({ vertexColors: true, fog: opts.fog ?? true, ...opts.extra }));
const sides = (bounds) => ({ x0: bounds.min.x, x1: bounds.max.x, z0: bounds.min.z, z1: bounds.max.z });

// ------------------------------------------------------------------ Canyon

/**
 * Canyon: geschichtete Felswände beiderseits (rote, ockerfarbene und cremefarbene Bänder), Tafelberge und Felsnadeln in der
 * Ferne, tief unten ein trockenes Flussbett mit Sandbänken. o: { bands: [Farben], cap, floor, river }.
 */
export function canyonRing(sky, bounds, rnd, yBase, o = {}) {
  const parts = [];
  const { x0, x1, z0, z1 } = sides(bounds);
  const gy = (sky.theme.ground?.y ?? -34) + yBase;
  const bands = (o.bands ?? [0xc8562e, 0xe07a3e, 0xb04424, 0xf0a060, 0xd8683a, 0x9a3a20]).map(lin);
  const cap = lin(o.cap ?? 0xe8b070), shadow = lin(o.shadow ?? 0x6a2a1e);
  const bandAt = (y, x, z) => bands[Math.abs(Math.floor((y - gy) / 2.6 + Math.sin(x * 0.05 + z * 0.03) * 0.6)) % bands.length];
  const rockCol = (p, n, out) => {
    if (n.y > 0.72) { out[0] = cap[0]; out[1] = cap[1]; out[2] = cap[2]; return; }
    const b = bandAt(p.y, p.x, p.z);
    mixc(shadow, b, 0.55 + 0.45 * smooth(-0.8, 0.6, n.x * 0.5 + n.z * 0.6 + n.y * 0.3), out);
  };
  // Felswände: viele gestufte Kanten-Blöcke entlang beider Seiten (wirken wie eine zerklüftete Canyonwand)
  for (const side of [-1, 1]) {
    for (let z = z1 + 50; z > z0 - 90; z -= rnd.real(9, 15)) {
      const near = side < 0 ? x0 - rnd.real(24, 34) : x1 + rnd.real(24, 34);
      for (let row = 0; row < 3; row++) {
        const x = near + side * row * rnd.real(12, 18);
        const h = rnd.real(30, 46) + row * 8 + Math.sin(z * 0.05) * 6;
        const w = rnd.real(10, 16), d = rnd.real(12, 18);
        const tiers = 2 + Math.floor(rnd.frac() * 2);
        for (let t = 0; t < tiers; t++) {
          const th = h * (t === 0 ? 0.62 : 0.38 / (tiers - 1));
          const y = gy + (t === 0 ? 0 : h * 0.62 + (t - 1) * th);
          const sc = 1 - t * 0.22;
          const g = new THREE.CylinderGeometry(w * 0.5 * sc * 0.92, w * 0.5 * sc, th, 7, 3);
          g.scale(1, 1, d / w);
          g.rotateY(rnd.real(0, 1));
          g.translate(x, y + th / 2, z);
          parts.push(colorize(g, rockCol));
        }
      }
    }
  }
  // Tafelberge und Felsnadeln hinter dem Ziel
  for (let x = x0 - 160; x < x1 + 160; x += rnd.real(26, 44)) {
    const z = z0 - rnd.real(110, 190);
    if (rnd.frac() < 0.35) {
      // Felsnadel (Hoodoo): gestapelte, verjüngte Trommeln mit Kappe
      let y = gy, r = rnd.real(4, 7);
      const n = 3 + Math.floor(rnd.frac() * 3);
      for (let k = 0; k < n; k++) {
        const h = rnd.real(7, 12);
        const g = new THREE.CylinderGeometry(r * 0.8, r, h, 8, 2);
        g.translate(x, y + h / 2, z);
        parts.push(colorize(g, rockCol));
        y += h; r *= 0.82;
      }
      const capG = new THREE.CylinderGeometry(r * 1.6, r * 1.1, 2.4, 8);
      capG.translate(x, y + 1.2, z);
      parts.push(colorize(capG, (p, n, out) => mixc(shadow, lin(0x8a4a30), smooth(-0.5, 0.8, n.y), out)));
    } else {
      const r = rnd.real(14, 26), h = rnd.real(40, 70);
      const g = new THREE.CylinderGeometry(r * 0.86, r, h, 9, 5);
      g.scale(1, 1, rnd.real(0.6, 1));
      g.translate(x, gy + h / 2 - 2, z);
      parts.push(colorize(g, rockCol));
    }
  }
  addMesh(sky, merge(parts), sky.view.mats.world);
  // Trockenes Flussbett tief unten (Sandbänke, dunklere Rinne mit Kieseln)
  const bed = [];
  const sand = lin(o.floor ?? 0xe8b478), sand2 = lin(0xd08a52), water = lin(o.river ?? 0xa86a40);
  const w = (x1 - x0) + 600, d = (z1 - z0) + 600, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const plane = new THREE.PlaneGeometry(w, d, 60, 60);
  plane.rotateX(-Math.PI / 2);
  plane.translate(cx, gy + 0.2, cz);
  bed.push(colorize(plane, (p, n, out) => {
    const river = Math.abs(p.x - cx - Math.sin(p.z * 0.03) * 14) ;
    if (river < 3.5) { mixc(water, sand2, smooth(0, 3.5, river) * 0.7 + (Math.sin(p.z * 1.7 + p.x) > 0.6 ? 0.2 : 0), out); return; }
    mixc(sand2, sand, smooth(-1, 1, Math.sin(p.x * 0.07) * Math.cos(p.z * 0.05)), out);
  }));
  addMesh(sky, merge(bed), sky.view.mats.world);
}

/** Kreisende Geier/Vögel (Silhouetten, eine Instanz-Gruppe). Liefert ein Objekt für animateBirds. */
export function birdFlock(sky, bounds, rnd, o = {}) {
  const n = o.n ?? 7;
  const g = new THREE.BufferGeometry();
  // flaches „M“: zwei Flügel
  const v = [0, 0, 0, -1.6, 0.35, -0.5, -0.5, 0.1, 0, 0, 0, 0, 0.5, 0.1, 0, 1.6, 0.35, -0.5, 0, 0, 0, -0.5, 0.1, 0, 0, 0, -0.6, 0, 0, 0, 0, 0, -0.6, 0.5, 0.1, 0];
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  const mat = sky.track(new THREE.MeshBasicMaterial({ color: o.color ?? 0x2a1418, side: THREE.DoubleSide, fog: true }));
  const mesh = new THREE.InstancedMesh(sky.track(g), mat, n);
  mesh.frustumCulled = false;
  const { x0, x1, z0 } = sides(bounds);
  const birds = [];
  for (let i = 0; i < n; i++) birds.push({ cx: rnd.real(x0 - 20, x1 + 20), cz: rnd.real(z0 - 40, bounds.max.z), cy: bounds.max.y + rnd.real(14, 30), r: rnd.real(10, 22), a: rnd.real(0, 6.28), v: rnd.real(0.15, 0.3) * (i % 2 ? 1 : -1), s: rnd.real(0.9, 1.5), f: rnd.real(0, 6) });
  sky.group.add(mesh);
  const b = { mesh, birds, t: 0 };
  animateBirds(b, 0);
  return b;
}

const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler();
export function animateBirds(b, dt) {
  if (!b) return;
  b.t += Math.min(0.1, dt);
  b.birds.forEach((bd, i) => {
    bd.a += bd.v * Math.min(0.1, dt);
    const flap = Math.sin(b.t * 5 + bd.f) * 0.35;
    _p.set(bd.cx + Math.cos(bd.a) * bd.r, bd.cy + Math.sin(b.t * 0.7 + bd.f) * 0.8, bd.cz - Math.sin(bd.a) * bd.r);
    _e.set(flap * 0.2, bd.a + (bd.v > 0 ? 0 : Math.PI), Math.sin(bd.a) * 0.15 + (bd.v > 0 ? 0.25 : -0.25));
    _q.setFromEuler(_e);
    _s.set(bd.s, bd.s * (1 + flap), bd.s);
    _m.compose(_p, _q, _s);
    b.mesh.setMatrixAt(i, _m);
  });
  b.mesh.instanceMatrix.needsUpdate = true;
}

// ------------------------------------------------------------------ Giftwald

/** Knorrige Giftbäume (dunkle Stämme, violette Kronen) ringsum; Leuchtpilze/Glühflecken als zweites, unbeleuchtetes Mesh. */
export function poisonForest(sky, bounds, rnd, yBase, o = {}) {
  const parts = [], glow = [];
  const { x0, x1, z0, z1 } = sides(bounds);
  const gy = (sky.theme.ground?.y ?? -20) + yBase;
  const bark = lin(0x2a1a2e), barkHi = lin(0x5a3a5a);
  const crowns = (o.crowns ?? [0x6a2a9a, 0x4a1a7a, 0x8a3ab0, 0x3a5a2a]).map(lin);
  const shroom = (o.glow ?? [0x9aff5a, 0xd06aff, 0x5affd0]).map(lin);
  const tree = (x, z, h) => {
    // geschwungener Stamm aus drei Stücken
    let px = x, pz = z, py = gy, r = h * 0.06;
    const bend = rnd.real(-0.4, 0.4);
    for (let k = 0; k < 3; k++) {
      const len = h * 0.24;
      const g = new THREE.CylinderGeometry(r * 0.75, r, len, 6);
      g.translate(0, len / 2, 0);
      g.rotateZ(bend * (k + 1) * 0.35);
      g.translate(px, py, pz);
      parts.push(colorize(g, (p, n, out) => mixc(bark, barkHi, smooth(-0.4, 0.9, n.x * -0.4 + n.z * 0.5), out)));
      px += -Math.sin(bend * (k + 1) * 0.35) * len; py += Math.cos(bend * (k + 1) * 0.35) * len; r *= 0.75;
    }
    // hängende, flache Kronen (Schirm) in Lagen
    for (let k = 0; k < 3; k++) {
      const c = crowns[Math.floor(rnd.frac() * crowns.length)];
      const cr = h * rnd.real(0.22, 0.34) * (1 - k * 0.2);
      const g = new THREE.SphereGeometry(cr, 9, 5, 0, Math.PI * 2, 0, Math.PI * 0.55);
      g.scale(1, 0.55, 1);
      g.translate(px + rnd.real(-1, 1) * h * 0.1, py - k * h * 0.08 + h * 0.04, pz + rnd.real(-1, 1) * h * 0.1);
      const dark = mixc(c, [0.02, 0.01, 0.04], 0.55, [0, 0, 0]);
      parts.push(colorize(g, (p, n, out) => mixc(dark, c, smooth(-0.3, 0.8, n.y), out)));
    }
    // Leuchtpilze am Fuß
    for (let k = 0; k < 3; k++) {
      const c = shroom[Math.floor(rnd.frac() * shroom.length)];
      const s = rnd.real(0.5, 1.2);
      const g = new THREE.SphereGeometry(s, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2);
      g.scale(1, 0.6, 1);
      g.translate(x + rnd.real(-2.5, 2.5), gy + s * 0.8, z + rnd.real(-2.5, 2.5));
      glow.push(colorize(g, (p, n, out) => mixc(mixc(c, [0, 0, 0], 0.4, [0, 0, 0]), c, smooth(0, 1, n.y), out)));
    }
  };
  for (const side of [-1, 1]) {
    for (let z = z1 + 30; z > z0 - 80; z -= rnd.real(6, 10)) {
      for (let row = 0; row < 3; row++) {
        const x = side < 0 ? x0 - rnd.real(14, 26) - row * 13 : x1 + rnd.real(14, 26) + row * 13;
        tree(x, z, rnd.real(12, 20) * (1 + row * 0.2));
      }
    }
  }
  for (let x = x0 - 100; x < x1 + 100; x += rnd.real(8, 14)) tree(x, z0 - rnd.real(40, 90), rnd.real(16, 26));
  addMesh(sky, merge(parts), sky.view.mats.world);
  addMesh(sky, merge(glow), glowMat(sky));
}

/** Giftsumpf tief unten (unbeleuchtet, violette Schlieren). */
export function poisonMarsh(sky, bounds, rnd, y, o = {}) {
  const { x0, x1, z0, z1 } = sides(bounds);
  const w = (x1 - x0) + 600, d = (z1 - z0) + 600, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const g = new THREE.PlaneGeometry(w, d, 70, 70);
  g.rotateX(-Math.PI / 2);
  g.translate(cx, y, cz);
  const a = lin(o.deep ?? 0x2a0a40), b = lin(o.mid ?? 0x6a1aa0), c = lin(o.hi ?? 0xb060e0);
  const sea = colorize(g, (p, n, out) => {
    const v = Math.sin(p.x * 0.09 + Math.sin(p.z * 0.05) * 2) * 0.5 + Math.sin(p.z * 0.11 + p.x * 0.04) * 0.5;
    if (v > 0.6) mixc(b, c, smooth(0.6, 0.95, v), out); else mixc(a, b, smooth(-0.8, 0.6, v), out);
  });
  addMesh(sky, sea, glowMat(sky));
}

// ------------------------------------------------------------------ Technik-Himmel (Piep-Blöcke)

/**
 * Neon-Stadt der Piep-Welt: dunkle Türme mit leuchtenden Fensterbändern (Glow-Mesh), schwebende Neon-Ringe (Takt-Lichter,
 * färben sich rot/blau nach der gerade festen Piep-Farbe und blitzen auf jeder Zählzeit) und ein Neon-Gitter tief unten.
 * Liefert { rings: Material, beacons: Material } für animateBeat.
 */
export function techCity(sky, bounds, rnd, yBase, o = {}) {
  const parts = [], glow = [];
  const { x0, x1, z0, z1 } = sides(bounds);
  const gy = (sky.theme.ground?.y ?? -40) + yBase;
  const body = lin(0x141a3a), bodyHi = lin(0x2a3a6a), neon = (o.neon ?? [0x40e8ff, 0xff4af0, 0x7a6aff]).map(lin);
  const tower = (x, z, w, h) => {
    const g = new THREE.BoxGeometry(w, h, w * rnd.real(0.7, 1.2), 1, 4, 1);
    g.translate(x, gy + h / 2, z);
    parts.push(colorize(g, (p, n, out) => mixc(body, bodyHi, smooth(-0.6, 0.9, n.y * 0.6 - n.x * 0.3 + n.z * 0.3), out)));
    const c = neon[Math.floor(rnd.frac() * neon.length)];
    // Fensterbänder (leicht vor der Fassade)
    for (let yy = gy + 6; yy < gy + h - 3; yy += rnd.real(4, 7)) {
      const b = new THREE.BoxGeometry(w * 1.02, 0.5, w * 0.2);
      b.translate(x, yy, z + w * 0.42);
      glow.push(colorize(b, (p, n, out) => { out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; }));
    }
    // Antenne mit Spitze
    const a = new THREE.CylinderGeometry(0.15, 0.25, 6, 5);
    a.translate(x, gy + h + 3, z);
    parts.push(colorize(a, (p, n, out) => { out[0] = bodyHi[0]; out[1] = bodyHi[1]; out[2] = bodyHi[2]; }));
    const tip = new THREE.SphereGeometry(0.7, 6, 4);
    tip.translate(x, gy + h + 6.2, z);
    glow.push(colorize(tip, (p, n, out) => { out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; }));
  };
  for (const side of [-1, 1]) for (let z = z1 + 30; z > z0 - 70; z -= rnd.real(16, 26)) tower(side < 0 ? x0 - rnd.real(30, 70) : x1 + rnd.real(30, 70), z, rnd.real(6, 12), rnd.real(40, 80));
  for (let x = x0 - 140; x < x1 + 140; x += rnd.real(18, 30)) tower(x, z0 - rnd.real(80, 160), rnd.real(8, 16), rnd.real(50, 110));
  addMesh(sky, merge(parts), sky.view.mats.world);
  addMesh(sky, merge(glow), glowMat(sky));
  // Neon-Gitter tief unten (additiv)
  const lines = [];
  const gc = lin(o.grid ?? 0x3a5aff);
  const W = (x1 - x0) + 500, D = (z1 - z0) + 500, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  for (let x = cx - W / 2; x <= cx + W / 2; x += 12) { const b = new THREE.BoxGeometry(0.35, 0.05, D); b.translate(x, gy + 0.3, cz); lines.push(colorize(b, (p, n, out) => { out[0] = gc[0]; out[1] = gc[1]; out[2] = gc[2]; })); }
  for (let z = cz - D / 2; z <= cz + D / 2; z += 12) { const b = new THREE.BoxGeometry(W, 0.05, 0.35); b.translate(cx, gy + 0.3, z); lines.push(colorize(b, (p, n, out) => { out[0] = gc[0]; out[1] = gc[1]; out[2] = gc[2]; })); }
  addMesh(sky, merge(lines), sky.track(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })));
  // Takt-Lichter: schwebende Neon-Ringe beiderseits der Strecke
  const rings = [];
  for (const side of [-1, 1]) {
    for (let z = z1; z > z0 - 20; z -= rnd.real(22, 32)) {
      const x = side < 0 ? x0 - rnd.real(10, 18) : x1 + rnd.real(10, 18);
      const g = new THREE.TorusGeometry(rnd.real(2.2, 3.4), 0.18, 6, 28);
      g.rotateY(Math.PI / 2 + side * 0.4);
      g.translate(x, bounds.max.y + rnd.real(2, 9), z);
      rings.push(colorize(g, (p, n, out) => { out[0] = 1; out[1] = 1; out[2] = 1; }));
    }
  }
  const ringMat = sky.track(new THREE.MeshBasicMaterial({ vertexColors: true, color: 0xff4060, fog: false }));
  addMesh(sky, merge(rings), ringMat);
  return { rings: ringMat, t: 0 };
}

const RED = new THREE.Color(0xff3d5a), BLUE = new THREE.Color(0x3a8cff), _c = new THREE.Color();
/** Takt-Lichter: Ringe leuchten in der gerade festen Piep-Farbe, blitzen je Zählzeit, flackern in der Warnzeit. */
export function animateBeat(sky, fx, dt) {
  if (!fx) return;
  fx.t += Math.min(0.1, dt);
  const clock = sky.view?.scene?.level?.beepClock;
  let beat;
  if (clock) beat = clock.beat;
  else { try { const b = music.beat(); beat = b.playing ? b.beat : fx.t * 2; } catch { beat = fx.t * 2; } }
  const every = clock?.every ?? 8, warn = clock?.warn ?? 3;
  const cyc = Math.floor(beat / every), k = beat - cyc * every;
  const redOn = ((cyc % 2) + 2) % 2 === 0;
  const flash = Math.exp(-(beat % 1) * 4);
  const warnNow = k >= every - warn;
  _c.copy(redOn ? RED : BLUE);
  const lvl = 0.45 + flash * (warnNow ? 0.9 : 0.45);
  fx.rings.color.setRGB(_c.r * lvl, _c.g * lvl, _c.b * lvl);
}

// ------------------------------------------------------------------ Bergwiese

/** Heißluftballons in der Ferne (langsam schwebend) – eine Gruppe. */
export function balloons(sky, bounds, rnd, o = {}) {
  const grp = new THREE.Group();
  const { x0, x1, z0 } = sides(bounds);
  const cols = (o.colors ?? [0xff5a4a, 0xffc83a, 0x4aa8ff, 0x7ad04a, 0xff7ac0]).map((c) => new THREE.Color(c));
  const list = [];
  for (let i = 0; i < (o.n ?? 6); i++) {
    const c = cols[i % cols.length];
    const g = new THREE.SphereGeometry(3, 12, 10);
    g.scale(1, 1.2, 1);
    const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
    const c2 = new THREE.Color(0xffffff);
    for (let v = 0; v < pos.count; v++) {
      const a = Math.atan2(pos.getZ(v), pos.getX(v));
      const st = Math.floor((a / (Math.PI * 2)) * 8 + 8) % 2;
      const cc = st ? c : c2;
      col[v * 3] = cc.r; col[v * 3 + 1] = cc.g; col[v * 3 + 2] = cc.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const env = new THREE.Mesh(sky.track(g), sky.track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 })));
    const basket = new THREE.Mesh(sky.track(new THREE.BoxGeometry(1.1, 0.9, 1.1)), sky.track(new THREE.MeshStandardMaterial({ color: 0x8a5a2e, roughness: 0.9 })));
    basket.position.y = -5;
    const b = new THREE.Group();
    b.add(env, basket);
    const side = i % 2 ? 1 : -1;
    b.position.set(side < 0 ? x0 - rnd.real(30, 70) : x1 + rnd.real(30, 70), bounds.max.y + rnd.real(8, 26), rnd.real(z0 - 60, bounds.max.z));
    grp.add(b);
    list.push({ b, y: b.position.y, ph: rnd.real(0, 6), vx: rnd.real(-0.4, 0.4) });
  }
  sky.group.add(grp);
  return { list, t: 0 };
}

export function animateBalloons(fx, dt) {
  if (!fx) return;
  fx.t += Math.min(0.1, dt);
  for (const it of fx.list) { it.b.position.y = it.y + Math.sin(fx.t * 0.35 + it.ph) * 1.6; it.b.position.x += it.vx * Math.min(0.1, dt); it.b.rotation.y += 0.05 * Math.min(0.1, dt); }
}

/** Blumentupfen auf fernen Wiesenhügeln (Kulisse; ein Mesh, unbeleuchtet hell). */
export function meadowFlowers(sky, bounds, rnd, yBase, o = {}) {
  const parts = [];
  const { x0, x1, z0, z1 } = sides(bounds);
  const gy = (sky.theme.ground?.y ?? -26) + yBase;
  const cols = (o.colors ?? [0xffffff, 0xffe04a, 0xff7ab0, 0xb08aff]).map(lin);
  for (let i = 0; i < (o.n ?? 260); i++) {
    const side = i % 2 ? 1 : -1;
    const x = side < 0 ? rnd.real(x0 - 120, x0 - 20) : rnd.real(x1 + 20, x1 + 120);
    const z = rnd.real(z0 - 60, z1 + 40);
    const c = cols[i % cols.length];
    const g = new THREE.CircleGeometry(rnd.real(0.5, 1.1), 5);
    g.rotateX(-Math.PI / 2);
    g.translate(x, gy + 0.25, z);
    parts.push(colorize(g, (p, n, out) => { out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; }));
  }
  addMesh(sky, merge(parts), glowMat(sky));
}

// ------------------------------------------------------------------ Ruinenstadt

/** Versunkene Ruinenstadt: Säulenreihen (teils gebrochen), Bögen, bröckelnde Türme, Dschungelbäume, Ranken. */
export function ruinCity(sky, bounds, rnd, yBase, o = {}) {
  const parts = [];
  const { x0, x1, z0, z1 } = sides(bounds);
  const gy = (sky.theme.ground?.y ?? -24) + yBase;
  const stone = lin(o.stone ?? 0xe6c48a), stoneD = lin(o.stoneDark ?? 0x9a7048), moss = lin(0x5a9a3a), leaf = lin(0x3a8a3a), leafHi = lin(0x7ac84a);
  const stoneCol = (p, n, out) => {
    mixc(stoneD, stone, smooth(-0.7, 0.8, n.y * 0.5 - n.x * 0.4 + n.z * 0.4), out);
    if (n.y > 0.6) mixc(out, moss, 0.55, out);
  };
  const column = (x, z, h, r, broken) => {
    const g = new THREE.CylinderGeometry(r, r * 1.05, h, 10, 3);
    g.translate(x, gy + h / 2, z);
    parts.push(colorize(g, (p, n, out) => { stoneCol(p, n, out); const a = Math.atan2(p.z - z, p.x - x); const k = 0.9 + 0.1 * Math.cos(a * 10); out[0] *= k; out[1] *= k; out[2] *= k; }));
    const cap = new THREE.BoxGeometry(r * 2.8, r * 0.7, r * 2.8);
    cap.translate(x, gy + h + r * 0.35, z);
    if (!broken) parts.push(colorize(cap, stoneCol));
  };
  const arch = (x, z, w, h, yaw) => {
    const t = 1.4;
    const legs = [[-w / 2, 0], [w / 2, 0]];
    for (const [lx] of legs) {
      const g = new THREE.BoxGeometry(t, h, t);
      g.translate(lx, h / 2, 0); g.rotateY(yaw); g.translate(x, gy, z);
      parts.push(colorize(g, stoneCol));
    }
    const top = new THREE.TorusGeometry(w / 2, t / 2, 6, 12, Math.PI);
    top.translate(0, h, 0); top.rotateY(yaw); top.translate(x, gy, z);
    parts.push(colorize(top, stoneCol));
  };
  const tower = (x, z, w, h) => {
    const g = new THREE.BoxGeometry(w, h, w, 2, 5, 2);
    const pos = g.attributes.position;
    for (let v = 0; v < pos.count; v++) if (pos.getY(v) > h * 0.3) pos.setY(v, pos.getY(v) - Math.max(0, Math.sin(pos.getX(v) * 1.7 + pos.getZ(v)) * h * 0.18));
    g.computeVertexNormals();
    g.translate(x, gy + h / 2, z);
    parts.push(colorize(g, stoneCol));
  };
  const jungleTree = (x, z, h) => {
    const tr = new THREE.CylinderGeometry(h * 0.04, h * 0.07, h * 0.7, 6);
    tr.translate(x, gy + h * 0.35, z);
    parts.push(colorize(tr, (p, n, out) => mixc(lin(0x4a2e1a), lin(0x7a5232), smooth(-0.5, 0.8, n.x), out)));
    for (let k = 0; k < 4; k++) {
      const g = new THREE.IcosahedronGeometry(h * rnd.real(0.16, 0.24), 1);
      g.scale(1.3, 0.7, 1.3);
      g.translate(x + rnd.real(-1, 1) * h * 0.15, gy + h * (0.68 + k * 0.06), z + rnd.real(-1, 1) * h * 0.15);
      parts.push(colorize(g, (p, n, out) => mixc(mixc(leaf, [0, 0, 0], 0.4, [0, 0, 0]), leafHi, smooth(-0.4, 0.8, n.y), out)));
    }
  };
  for (const side of [-1, 1]) {
    for (let z = z1 + 30; z > z0 - 70; z -= rnd.real(10, 16)) {
      const x = side < 0 ? x0 - rnd.real(16, 30) : x1 + rnd.real(16, 30);
      const r = rnd.frac();
      if (r < 0.4) { column(x, z, rnd.real(10, 18), rnd.real(0.9, 1.4), rnd.frac() < 0.4); column(x + side * 6, z - 4, rnd.real(8, 16), rnd.real(0.9, 1.4), rnd.frac() < 0.5); }
      else if (r < 0.6) arch(x + side * 4, z, rnd.real(6, 9), rnd.real(8, 12), rnd.real(-0.3, 0.3));
      else if (r < 0.8) tower(x + side * rnd.real(6, 14), z, rnd.real(6, 10), rnd.real(18, 32));
      else jungleTree(x + side * rnd.real(0, 8), z, rnd.real(12, 20));
      if (rnd.frac() < 0.5) jungleTree(x + side * rnd.real(14, 24), z + rnd.real(-4, 4), rnd.real(14, 22));
    }
  }
  for (let x = x0 - 120; x < x1 + 120; x += rnd.real(16, 26)) {
    const z = z0 - rnd.real(60, 130);
    if (rnd.frac() < 0.5) tower(x, z, rnd.real(10, 16), rnd.real(30, 55)); else jungleTree(x, z, rnd.real(18, 28));
  }
  addMesh(sky, merge(parts), sky.view.mats.world);
}

// ------------------------------------------------------------------ Lava-Burg

/** Burgmauern mit Zinnen, glühenden Fenstern und Ketten an beiden Seiten und hinter dem Ziel; Glow-Teile als eigenes Mesh. */
export function castleWalls(sky, bounds, rnd, yBase, o = {}) {
  const parts = [], glow = [];
  const { x0, x1, z0, z1 } = sides(bounds);
  const gy = (o.y ?? -18) + yBase;
  const st = lin(o.stone ?? 0x3a2a30), stHi = lin(o.stoneHi ?? 0x6a5058), win = lin(o.window ?? 0xffa030);
  const stoneCol = (p, n, out) => {
    mixc(st, stHi, smooth(-0.7, 0.8, n.y * 0.4 - n.x * 0.3 + n.z * 0.5), out);
    const brick = (Math.floor(p.y / 1.2) + Math.floor((p.x + p.z) / 2.4)) & 1;
    if (Math.abs(n.y) < 0.3 && brick) { out[0] *= 0.88; out[1] *= 0.88; out[2] *= 0.88; }
  };
  const wall = (x, z, len, h, yaw) => {
    const g = new THREE.BoxGeometry(len, h, 4, 4, 3, 1);
    g.translate(0, h / 2, 0); g.rotateY(yaw); g.translate(x, gy, z);
    parts.push(colorize(g, stoneCol));
    // Zinnen
    for (let k = -len / 2 + 1.5; k < len / 2; k += 3) {
      const c = new THREE.BoxGeometry(1.6, 2, 4.2);
      c.translate(k, h + 1, 0); c.rotateY(yaw); c.translate(x, gy, z);
      parts.push(colorize(c, stoneCol));
    }
    // Fensterschlitze (glühend)
    for (let k = -len / 2 + 4; k < len / 2 - 2; k += rnd.real(5, 8)) {
      const w = new THREE.BoxGeometry(0.9, 2.4, 0.3);
      w.translate(k, h * rnd.real(0.45, 0.75), 2.05); w.rotateY(yaw); w.translate(x, gy, z);
      glow.push(colorize(w, (p, n, out) => { out[0] = win[0]; out[1] = win[1]; out[2] = win[2]; }));
    }
  };
  for (const side of [-1, 1]) {
    for (let z = z1 + 30; z > z0 - 60; z -= 34) {
      const x = side < 0 ? x0 - rnd.real(22, 30) : x1 + rnd.real(22, 30);
      wall(x, z, 34, rnd.real(26, 36), Math.PI / 2 * side + (side < 0 ? Math.PI : 0));
      // Turm an der Fuge
      const r = rnd.real(4, 6), h = rnd.real(36, 48);
      const t = new THREE.CylinderGeometry(r, r * 1.1, h, 10, 4);
      t.translate(x, gy + h / 2, z + 17);
      parts.push(colorize(t, stoneCol));
      const cone = new THREE.ConeGeometry(r * 1.3, r * 2.4, 10);
      cone.translate(x, gy + h + r * 1.2, z + 17);
      parts.push(colorize(cone, (p, n, out) => mixc(lin(0x2a0a10), lin(0x8a1a22), smooth(-0.3, 0.8, n.y), out)));
    }
  }
  for (let x = x0 - 60; x < x1 + 60; x += 34) wall(x, z0 - rnd.real(40, 60), 34, rnd.real(34, 46), 0);
  addMesh(sky, merge(parts), sky.view.mats.world);
  addMesh(sky, merge(glow), glowMat(sky));
}
