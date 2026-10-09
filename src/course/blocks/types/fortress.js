// Festungs-Bausteine (1-A „Arena“, Welt 1): runder Käfigraum auf einer Festungsplattform, Wimpel, Fackeln und
// Zuschauer-Tribünen. Rein für Arenen gedacht, aber wiederverwendbar (andere Farben/Größen).
//
// arena_cage  Runde Festungsplattform mit gelbem Gitterkäfig.
//   { type: 'arena_cage', pos: [x, y, z] (Mitte der Bodenoberfläche), radius: 11 (Innenradius), height: 5 (Gitter),
//     floor: 2.4 (Plattform unter der Oberfläche), ceiling: 6.4 (unsichtbare Decke über dem Boden, 0 = keine),
//     gate: π (Tor-Richtung in rad um +Y; 0 = zur Kamera +Z, π = hinten), low: 0.85 (halber Winkel des niedrigen
//     Geländers zur Kamera, darüber Maschengitter), color: 0xffcf2a (Gitter) }
//   Kollision: Boden (cyl), Gitterstäbe als Zylinder (camIgnore, Abstand < Figurbreite), Decke (box, camIgnore).
// pennants    Fahnenmasten mit flatternden Wimpeln (ein Mesh, Wellen je Bild).
//   { type: 'pennants', items: [{ pos: [x, y, z], color: 0xe8322a, h: 6 }] }
// torches     Feuerschalen auf Pfosten, Flammen flackern (eine Instanz-Gruppe).
//   { type: 'torches', items: [[x, y, z], …], h: 1.6 }
// crowd       Tribünen mit Zuschauern (kleine runde Wichtel in bunten Farben, wippen; jubeln auf Zuruf).
//   { type: 'crowd', id: 'crowd', stands: [{ from: [x, y, z], to: [x, y, z], rows: 3, face: [dx, dz] }] }
//   level.named.get(id).cheer(stärke 0..1, dauer s) – Zuschauer springen und winken (Arena-Archetyp ruft das).

import * as THREE from 'three';
import { v3, box, lin, mixc, smooth, colorize, merge, addStatic, addObject, Rnd } from '../kit.js';

const FLAT = { r: 0, seg: 0 };
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ arena_cage

export function buildArenaCage(level, spec) {
  const c = v3(spec.pos), R = spec.radius ?? 11, H = spec.height ?? 5, F = spec.floor ?? 2.4;
  const gate = spec.gate ?? Math.PI;
  const bar = spec.color ?? 0xffcf2a;
  // Kollision: Boden, Gitter, Decke
  level.world.add({ type: 'cyl', x: c.x, z: c.z, r: R + 0.9, y0: c.y - F, y1: c.y, tag: 'arena-floor' });
  const N = Math.ceil((TAU * R) / 0.95);
  const posts = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU;
    const x = c.x + Math.sin(a) * (R + 0.15), z = c.z + Math.cos(a) * (R + 0.15);
    posts.push([x, z, a]);
    level.world.add({ type: 'cyl', x, z, r: 0.34, y0: c.y, y1: c.y + H + 0.6, camIgnore: true, noWallSlide: true, tag: 'cage' });
  }
  const ceil = spec.ceiling ?? 6.4;
  if (ceil > 0) level.world.add({ type: 'box', min: [c.x - R - 1, c.y + ceil, c.z - R - 1], max: [c.x + R + 1, c.y + ceil + 0.5, c.z + R + 1], camIgnore: true, tag: 'cage-roof' });

  // Plattform: Steinsockel mit Fugen, goldener Rand, Zinnen
  const parts = [], glow = [];
  const stone = lin(0xb9b3c4), stoneDk = lin(0x8a8498), mortar = lin(0x6e687c);
  const base = new THREE.CylinderGeometry(R + 0.9, R + 0.4, F, 48, 4, true);
  base.translate(c.x, c.y - F / 2, c.z);
  parts.push(colorize(base.toNonIndexed(), (p, n, o) => {
    const yy = c.y - p.y;
    const row = Math.floor(yy / 0.6);
    const a = Math.atan2(p.x - c.x, p.z - c.z) + (row % 2) * 0.06;
    const seam = Math.abs(((a / TAU) * 52) % 1) < 0.07 || (yy % 0.6) < 0.06;
    mixc(stone, stoneDk, smooth(0, F, yy) * 0.6, o);
    if (seam) mixc(o, mortar, 0.7, o);
  }));
  // Boden: Ringe aus Platten (creme/gelb), Mitte mit Stern
  const rings = [[0, 2.2, 0xffe48a], [2.2, 4.6, 0xf3eedf], [4.6, 7.4, 0xffd85a], [7.4, R + 0.9, 0xf3eedf]];
  for (const [r0, r1, col] of rings) {
    const g = new THREE.RingGeometry(Math.max(0.001, r0), r1, 48, 1);
    g.rotateX(-Math.PI / 2);
    g.translate(c.x, c.y + 0.004, c.z);
    const L = lin(col), Ld = mixc(L, [0, 0, 0], 0.12, [0, 0, 0]);
    parts.push(colorize(g.toNonIndexed(), (p, n, o) => {
      const a = Math.atan2(p.x - c.x, p.z - c.z);
      const k = Math.floor(((a + Math.PI) / TAU) * (r1 > 7 ? 32 : 16)) & 1;
      mixc(L, Ld, k, o);
    }));
  }
  // Fugen-Ringe und Stern in der Mitte
  for (const r of [2.2, 4.6, 7.4]) {
    const t = new THREE.RingGeometry(r - 0.06, r + 0.06, 48, 1);
    t.rotateX(-Math.PI / 2); t.translate(c.x, c.y + 0.008, c.z);
    parts.push(colorize(t.toNonIndexed(), (p, n, o) => { o[0] = mortar[0]; o[1] = mortar[1]; o[2] = mortar[2]; }));
  }
  {
    const s = new THREE.Shape();
    for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 0.7 : 1.6; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; if (i === 0) s.moveTo(x, y); else s.lineTo(x, y); }
    const g = new THREE.ShapeGeometry(s);
    g.rotateX(-Math.PI / 2); g.translate(c.x, c.y + 0.012, c.z);
    const col = lin(0xff9a2e);
    parts.push(colorize(g.toNonIndexed(), (p, n, o) => { o[0] = col[0]; o[1] = col[1]; o[2] = col[2]; }));
  }
  // Rand: goldener Ring + Zinnen außen
  const rim = new THREE.TorusGeometry(R + 0.55, 0.22, 6, 64);
  rim.rotateX(Math.PI / 2); rim.translate(c.x, c.y + 0.05, c.z);
  parts.push(colorize(rim.toNonIndexed(), (p, n, o) => mixc(lin(0xd89a1a), lin(0xffd84a), smooth(-0.5, 0.8, n.y), o)));
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU + 0.13;
    parts.push(box(1.0, 0.9, 0.7, 0, 0, 0, 0xa9a2b8, { r: 0.08, seg: 1 }));
    const g = parts[parts.length - 1];
    g.translate(0, 0.45, 0);
    g.rotateY(a); g.translate(c.x + Math.sin(a) * (R + 1.0), c.y, c.z + Math.cos(a) * (R + 1.0));
  }
  addStatic(level, merge(parts));

  // Gitter: Stäbe (oben nach innen gebogen), Ringe, dicke Pfosten mit Kugeln, Tor. Im Bogen zur Kamera (±low um
  // +Z) nur ein niedriges Geländer und darüber ein durchscheinendes Maschengitter – so verdeckt der Käfig die Figur
  // nicht (die Kollision ist ringsum gleich hoch).
  const cage = [];
  const barCol = bar;
  const low = spec.low ?? 0.85, lowH = 1.5;
  const isLow = (a) => Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < low;
  const gold = lin(barCol), goldDk = lin(0xd8a010), ringCol = lin(0xffb81a);
  for (const [x, z, a] of posts) {
    const h = isLow(a) ? lowH : H;
    const g = new THREE.CylinderGeometry(0.075, 0.09, h, 6, 1, true);
    g.translate(x, c.y + h / 2, z);
    cage.push(colorize(g.toNonIndexed(), (p, n, o) => mixc(goldDk, gold, smooth(c.y, c.y + 1.2, p.y), o)));
    if (isLow(a)) continue;
    // Bogen nach innen
    const top = new THREE.CylinderGeometry(0.07, 0.075, 1.3, 5, 1, true);
    top.translate(0, 0.65, 0);
    top.rotateX(-0.75);
    top.rotateY(a);
    top.translate(x, c.y + H, z);
    cage.push(colorize(top.toNonIndexed(), (p, n, o) => { o[0] = gold[0]; o[1] = gold[1]; o[2] = gold[2]; }));
  }
  const torus = (y, r, t, full) => {
    const g = full ? new THREE.TorusGeometry(r, t, 5, 72) : new THREE.TorusGeometry(r, t, 5, 60, TAU - 2 * low);
    g.rotateX(Math.PI / 2);
    if (!full) g.rotateY(-(Math.PI / 2 + low));
    g.translate(c.x, c.y + y, c.z);
    cage.push(colorize(g.toNonIndexed(), (p, n, o) => { o[0] = ringCol[0]; o[1] = ringCol[1]; o[2] = ringCol[2]; }));
  };
  torus(0.35, R + 0.15, 0.12, true);
  torus(lowH, R + 0.15, 0.1, true);
  torus(H * 0.6, R + 0.15, 0.09, false);
  torus(H, R + 0.15, 0.12, false);
  torus(H + 0.95, R - 0.75, 0.09, false);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + TAU / 16;
    const x = c.x + Math.sin(a) * (R + 0.35), z = c.z + Math.cos(a) * (R + 0.35);
    const h = isLow(a) ? lowH + 0.3 : H + 0.4;
    cage.push(box(0.5, h, 0.5, x, c.y + h / 2, z, 0xe8a81a, { r: 0.1, seg: 1 }));
    const sp = new THREE.SphereGeometry(isLow(a) ? 0.32 : 0.42, 10, 8);
    sp.translate(x, c.y + h + 0.3, z);
    cage.push(colorize(sp.toNonIndexed(), (p, n, o) => mixc(lin(0xd88a10), lin(0xfff08a), smooth(-0.3, 0.9, n.y), o)));
  }
  // Tor (geschlossen, hinten): Steinbogen, Fallgitter, Wappenschild
  {
    const gx = c.x + Math.sin(gate) * (R + 0.2), gz = c.z + Math.cos(gate) * (R + 0.2);
    const loc = [];
    loc.push(box(0.8, H + 1.2, 0.8, -2.2, (H + 1.2) / 2, 0, 0x8a8498, { r: 0.1, seg: 1 }));
    loc.push(box(0.8, H + 1.2, 0.8, 2.2, (H + 1.2) / 2, 0, 0x8a8498, { r: 0.1, seg: 1 }));
    loc.push(box(5.2, 0.9, 0.9, 0, H + 0.9, 0, 0x8a8498, { r: 0.12, seg: 1 }));
    for (const s of [-1, 1]) loc.push(box(0.9, 0.6, 0.9, s * 2.2, H + 1.5, 0, 0x9a94a8, { r: 0.1, seg: 1 }));
    for (let x = -1.5; x <= 1.51; x += 0.5) loc.push(box(0.12, H - 0.2, 0.12, x, (H - 0.2) / 2, 0.05, 0x5a5466, FLAT));
    for (const y of [1.2, 2.6, 4.0]) loc.push(box(3.4, 0.12, 0.12, 0, y, 0.05, 0x5a5466, FLAT));
    loc.push(box(1.4, 1.1, 0.14, 0, H + 0.9, -0.5, 0xffcf2a, { r: 0.08, seg: 1 }));
    loc.push(box(0.5, 0.5, 0.06, 0, H + 0.9, -0.6, 0xe8322a, FLAT));
    const g = merge(loc);
    g.rotateY(gate); g.translate(gx, c.y, gz);
    cage.push(g);
  }
  addStatic(level, merge(cage), { material: 'stone' });
  // Maschengitter im Bogen zur Kamera (durchscheinend)
  if (level.view && low > 0) {
    const tex = meshTexture();
    const arc = 2 * low * (R + 0.15), hh = H + 0.6 - lowH;
    tex.repeat.set(arc / 0.9, hh / 0.9);
    const g = new THREE.CylinderGeometry(R + 0.15, R + 0.15, hh, 40, 1, true, -low, 2 * low);
    g.translate(c.x, c.y + lowH + hh / 2, c.z);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, color: 0xffd84a, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }));
    m.renderOrder = 4;
    addObject(level, m);
  }
}

/** Rauten-Maschendraht (Alpha-Textur, wiederholbar). */
function meshTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, 64, 64);
  g.strokeStyle = 'rgba(255,255,255,0.95)';
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, 32); g.lineTo(32, 0); g.lineTo(64, 32); g.lineTo(32, 64); g.closePath(); g.stroke();
  g.beginPath(); g.moveTo(0, 0); g.lineTo(2, 0); g.moveTo(62, 64); g.lineTo(64, 64); g.stroke();
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ------------------------------------------------------------------ pennants

export function buildPennants(level, spec) {
  const items = spec.items ?? [];
  const poles = [];
  const flags = [];
  for (const it of items) {
    const p = v3(it.pos), h = it.h ?? 6;
    poles.push(box(0.16, h, 0.16, p.x, p.y + h / 2, p.z, 0xf4f2ec, { r: 0.05, seg: 1 }));
    const ball = new THREE.SphereGeometry(0.2, 8, 6);
    ball.translate(p.x, p.y + h + 0.15, p.z);
    poles.push(colorize(ball.toNonIndexed(), (pp, n, o) => mixc(lin(0xd89a1a), lin(0xfff08a), smooth(-0.3, 0.9, n.y), o)));
    // Wimpel: Dreieck aus Streifen (wird je Bild gewellt), weht nach +X
    const g = new THREE.PlaneGeometry(2.2, 1.2, 8, 2);
    g.translate(1.1, 0, 0);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i); P.setY(i, y * (1 - x / 2.35)); }
    const ng = g.toNonIndexed();
    const col = lin(it.color ?? 0xe8322a), stripe = lin(0xffffff);
    colorize(ng, (pp, n, o) => { const s = Math.abs(pp.y) < 0.09 && pp.x > 0.2; mixc(col, stripe, s ? 1 : 0, o); });
    ng.translate(p.x + 0.08, p.y + h - 0.7, p.z);
    flags.push({ g: ng, x0: p.x + 0.08, phase: (p.x * 0.7 + p.z * 0.3) % TAU });
  }
  addStatic(level, merge(poles));
  if (!level.view || !flags.length) return;
  const geo = merge(flags.map((f) => f.g.clone()));
  const base = geo.attributes.position.array.slice();
  // je Ecke: Abstand vom Mast (für die Welle) und Phase
  const n = geo.attributes.position.count;
  const dist = new Float32Array(n), ph = new Float32Array(n);
  let off = 0;
  for (const f of flags) {
    const cnt = f.g.attributes.position.count;
    for (let i = 0; i < cnt; i++) { dist[off + i] = base[(off + i) * 3] - f.x0; ph[off + i] = f.phase; }
    off += cnt;
    f.g.dispose();
  }
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  const pos = geo.attributes.position;
  addObject(level, mesh, (dt, t) => {
    const a = pos.array;
    for (let i = 0; i < n; i++) {
      const d = dist[i];
      a[i * 3 + 2] = base[i * 3 + 2] + Math.sin(t * 6 - d * 2.2 + ph[i]) * 0.18 * d;
      a[i * 3 + 1] = base[i * 3 + 1] - d * d * 0.03 + Math.sin(t * 4.3 - d * 1.7 + ph[i]) * 0.05 * d;
    }
    pos.needsUpdate = true;
  });
}

// ------------------------------------------------------------------ torches

let FLAME = null;
function torchFlameGeo() {
  if (FLAME) return FLAME;
  const parts = [];
  for (const [x, z, r, h] of [[0, 0, 0.28, 0.9], [0.15, 0.08, 0.17, 0.6], [-0.14, -0.06, 0.18, 0.65]]) {
    const g = new THREE.ConeGeometry(r, h, 7, 2);
    g.translate(x, h / 2, z);
    parts.push(colorize(g.toNonIndexed(), (p, n, o) => mixc(lin(0xff5a1a), lin(0xfff07a), smooth(0, h, p.y), o)));
  }
  FLAME = merge(parts);
  return FLAME;
}

export function buildTorches(level, spec) {
  const items = (spec.items ?? []).map(v3);
  const h = spec.h ?? 1.6;
  const parts = [];
  for (const p of items) {
    parts.push(box(0.26, h, 0.26, p.x, p.y + h / 2, p.z, 0x6a6278, { r: 0.05, seg: 1 }));
    const bowl = new THREE.CylinderGeometry(0.48, 0.26, 0.42, 10, 1);
    bowl.translate(p.x, p.y + h + 0.2, p.z);
    parts.push(colorize(bowl.toNonIndexed(), (pp, n, o) => mixc(lin(0x5a4a3a), lin(0xd8a01a), smooth(p.y + h, p.y + h + 0.4, pp.y), o)));
    level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.3, y0: p.y, y1: p.y + h + 0.4, tag: 'torch' });
  }
  addStatic(level, merge(parts));
  if (!level.view || !items.length) return;
  const im = new THREE.InstancedMesh(torchFlameGeo(), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false }), items.length);
  const glowG = new THREE.SphereGeometry(0.7, 10, 8);
  const gl = new THREE.InstancedMesh(glowG, new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }), items.length);
  im.frustumCulled = false; gl.frustumCulled = false;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pv = new THREE.Vector3(), e = new THREE.Euler();
  const group = new THREE.Group();
  group.add(im, gl);
  addObject(level, group, (dt, t) => {
    items.forEach((p, i) => {
      const f = 1 + Math.sin(t * 17 + i * 2.1) * 0.12 + Math.sin(t * 29 + i) * 0.08;
      q.setFromEuler(e.set(0, t * 1.5 + i, 0));
      im.setMatrixAt(i, m.compose(pv.set(p.x, p.y + h + 0.36, p.z), q, s.set(1, f, 1)));
      gl.setMatrixAt(i, m.compose(pv.set(p.x, p.y + h + 0.75, p.z), q, s.setScalar(0.9 + f * 0.2)));
    });
    im.instanceMatrix.needsUpdate = true; gl.instanceMatrix.needsUpdate = true;
  });
}

// ------------------------------------------------------------------ crowd

let FAN = null;
function fanGeo() {
  if (FAN) return FAN;
  const parts = [];
  const add = (g, fn) => parts.push(colorize(g.toNonIndexed(), fn));
  const solid = (hex) => { const k = lin(hex); return (p, n, o) => { o[0] = k[0]; o[1] = k[1]; o[2] = k[2]; }; };
  const body = new THREE.SphereGeometry(0.34, 8, 5); body.scale(1, 1.05, 0.9); body.translate(0, 0.36, 0);
  add(body, (p, n, o) => mixc(lin(0xffffff), lin(0xfff2d8), n.z > 0.45 && p.y < 0.45 ? 1 : 0, o));
  const head = new THREE.SphereGeometry(0.28, 8, 6); head.translate(0, 0.84, 0);
  add(head, (p, n, o) => mixc(lin(0xffe6c8), lin(0xffffff), smooth(0.92, 1.0, p.y) , o));
  for (const s of [-1, 1]) {
    const eye = new THREE.SphereGeometry(0.055, 4, 3); eye.scale(0.8, 1.3, 0.6); eye.translate(s * 0.09, 0.85, 0.25);
    add(eye, solid(0x1a1420));
    const arm = new THREE.CylinderGeometry(0.06, 0.07, 0.46, 4, 1, true); arm.rotateZ(s * 0.5); arm.translate(s * 0.37, 0.64, 0.02);
    add(arm, solid(0xffffff));
  }
  FAN = merge(parts);
  return FAN;
}

const FAN_COLORS = [0xff5a4a, 0x4a9aff, 0x5ad04a, 0xffc21a, 0xff7ac0, 0xa865ff, 0xff9a2e, 0x40d8f0];

export function buildCrowd(level, spec) {
  const rnd = new Rnd(spec.seed ?? 0xc0ffee);
  const parts = [];
  const fans = [];
  for (const st of spec.stands ?? []) {
    const a = v3(st.from), b = v3(st.to);
    const rows = st.rows ?? 3;
    const L = Math.hypot(b.x - a.x, b.z - a.z);
    const ux = (b.x - a.x) / L, uz = (b.z - a.z) / L;
    let fx = st.face?.[0] ?? -uz, fz = st.face?.[1] ?? ux;
    const fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl;
    const yaw = Math.atan2(fx, fz);
    for (let r = 0; r < rows; r++) {
      // Stufe: Holzbank, je Reihe 0,8 m höher und 1 m weiter hinten
      const off = -r * 1.0, y = a.y + r * 0.8;
      const cx = (a.x + b.x) / 2 + fx * off, cz = (a.z + b.z) / 2 + fz * off;
      const hr = 0.8 * (r + 1);
      const g = box(L + 0.6, hr, 1.0, 0, a.y + hr / 2, 0, r % 2 ? 0xc77a3a : 0xd88a46, { r: 0.06, seg: 1 });
      g.rotateY(yaw);
      g.translate(cx, 0, cz);
      parts.push(g);
      // Wimpelkette vorn an der Stufe
      const n = Math.max(1, Math.round(L / 0.85));
      for (let i = 0; i < n; i++) {
        if (rnd.chance(0.12)) continue;
        const t = (i + 0.5) / n - 0.5;
        fans.push({ x: cx + ux * t * L + rnd.real(-0.08, 0.08), y: y + 0.8, z: cz + uz * t * L, yaw: yaw + rnd.real(-0.25, 0.25), color: rnd.pick(FAN_COLORS), ph: rnd.real(0, TAU), s: rnd.real(0.85, 1.1) });
      }
    }
    // Banner hinter der obersten Reihe (rot-gelbe Streifen)
    const top = a.y + rows * 0.8;
    const bx = (a.x + b.x) / 2 - fx * rows, bz = (a.z + b.z) / 2 - fz * rows;
    const ban = [];
    for (let i = 0; i < Math.round(L / 1.2); i++) ban.push(box(1.1, 1.2, 0.08, -L / 2 + 0.6 + i * 1.2, 0.6, 0, i % 2 ? 0xffcf2a : 0xe8322a, FLAT));
    const bg = merge(ban);
    bg.rotateY(yaw); bg.translate(bx, top, bz);
    parts.push(bg);
  }
  addStatic(level, merge(parts));
  const ctl = { cheerT: 0, cheerK: 0, cheer(k = 1, dur = 1.6) { this.cheerK = Math.max(this.cheerK, k); this.cheerT = Math.max(this.cheerT, dur); } };
  if (spec.id) level.named.set(spec.id, ctl);
  if (!level.view || !fans.length) return ctl;
  const im = new THREE.InstancedMesh(fanGeo(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), fans.length);
  im.frustumCulled = false;
  const col = new THREE.Color();
  fans.forEach((f, i) => im.setColorAt(i, col.setHex(f.color)));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pv = new THREE.Vector3(), e = new THREE.Euler();
  addObject(level, im, (dt, t) => {
    if (ctl.cheerT > 0) ctl.cheerT -= dt; else ctl.cheerK = Math.max(0, ctl.cheerK - dt * 2);
    const k = ctl.cheerK;
    fans.forEach((f, i) => {
      const bob = Math.abs(Math.sin(t * 3 + f.ph)) * 0.05;
      const jump = k > 0 ? Math.abs(Math.sin(t * 9 + f.ph * 2)) * 0.45 * k : 0;
      q.setFromEuler(e.set(0, f.yaw + Math.sin(t * 2 + f.ph) * 0.15, Math.sin(t * 7 + f.ph) * 0.12 * k));
      im.setMatrixAt(i, m.compose(pv.set(f.x, f.y + bob + jump, f.z), q, s.setScalar(f.s)));
    });
    im.instanceMatrix.needsUpdate = true;
  });
  return ctl;
}

export const TYPES = { arena_cage: buildArenaCage, pennants: buildPennants, torches: buildTorches, crowd: buildCrowd };
