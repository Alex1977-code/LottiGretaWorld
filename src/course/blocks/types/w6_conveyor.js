// Welt-6-Baustein Förderband (Bauplan 6-6 „Wolken und Förderband“, „hohe Förderband-Wand (25 m, nur mit Krallen-Anzug)“,
// „Rätselbox: rundem Wandförderband in 10 s folgen“, „linkes Senkrechtband hoch“). Drei Arten:
//   boden – flaches Band, trägt alles, was darauf steht (Formflag conveyor); Richtung umkehrbar, an/aus per Signal.
//   wand  – senkrechtes Band an einer Wand: die Bandfläche läuft hinauf oder hinab und nimmt die Figur an der Wand mit
//           (Wandrutschen bzw. Klettern mit dem Krallen-Anzug: die Fläche ist kletterbar); Stufen (Mitnehmer) fahren mit
//           und tragen die Figur (am Bandende fahren sie ein).
//   rund  – Band rund um einen Block in einer senkrechten Ebene: oben trägt die Fläche die Figur in Laufrichtung, Mitnehmer
//           fahren rundherum – vorne hinab, unten zurück, hinten hinauf (die Figur kann auf ihnen mitfahren).
//
// foerderband:
//   boden: { type: 'foerderband', id, pos: [x, y, z] (Mitte unten), size: [w, h, d] (3 × 0,5 × 8), dir: [dx, dz] ([0, −1]),
//            speed: 3, style: 'gelb' | 'grau' | 'rot', idle: false }
//   wand:  { type: 'foerderband', mode: 'wand', id, pos: [x, y, z] (Mitte der Unterkante der Bandfläche), width: 3,
//            height: 10, yaw: −π/2 (Bandfläche blickt dorthin; 90°-Raster), speed: 2 (m/s, + = aufwärts, − = abwärts),
//            depth: 1 (Bandkörper hinter der Fläche), ledges: 2.5 (m Abstand der Stufen, 0 = keine), ledge: 0.7 (m Tiefe),
//            climbable: true, style }
//   rund:  { type: 'foerderband', mode: 'rund', id, pos: [x, y, z] (Mitte unten des Blocks), length: 8 (entlang der
//            Laufrichtung oben), height: 3, width: 3, yaw: 0 (Laufrichtung oben: 0 = +X, π/2 = −Z; 90°-Raster), speed: 2.5,
//            ledges: 2 (m Abstand der Mitnehmer), ledge: 0.5 (m), style }
//   level.named.get(id) = { mode, speed, running, start(), stop(), toggle() (an/aus), reverse(), carried, info() }
// Modell aus der Registry, sobald es sie gibt: 'foerderband' ({ width, length, style }, Band entlang +X, Ursprung Mitte unten;
// state { offset }) für die Bodenart; sonst eigene Geometrie (Band mit wandernder Pfeil-Textur, Rollen, Mitnehmer als
// Instanzen – je Band 2–3 Zeichenaufrufe).

import * as THREE from 'three';
import { v3, sz3, box, merge, addStatic, addObject, lin, mixc, smooth, colorize } from '../kit.js';
import { MovingBox } from '../w2kit.js';
import { visDt } from '../../entities/gimmick.js';
import { hasModel, getModel } from '../../models/index.js';
import { w6, figures, shove, beltTexture, flatColor, w6Sfx } from '../w6kit.js';

const HALF_PI = Math.PI / 2;
const STYLE = {
  gelb: { frame: 0x5a6276, frameTop: 0x8a92a8, colors: ['#2d3142', '#ffcf3a', '#596080'], cleat: 0xffcf3a },
  grau: { frame: 0x4a4e58, frameTop: 0x7a7e88, colors: ['#3a3e48', '#d8dce6', '#5a5e68'], cleat: 0xd8dce6 },
  rot: { frame: 0x6a3a3a, frameTop: 0x9a5a5a, colors: ['#3a2a2e', '#ff5a3a', '#6a4a4e'], cleat: 0xff6a4a },
};

function beltMesh(geo, tex) {
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }));
  m.receiveShadow = true;
  return m;
}

// ------------------------------------------------------------------ Boden

function buildBoden(level, spec) {
  const p = v3(spec.pos), s = sz3(spec.size, [3, 0.5, 8]);
  let [dx, dz] = spec.dir ?? [0, -1];
  const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  const S = STYLE[spec.style ?? 'gelb'] ?? STYLE.gelb;
  const st = { speed: spec.speed ?? 3, sign: 1, running: !spec.idle, offset: 0 };
  const conv = { x: 0, z: 0 };
  const sync = () => { const v = st.running ? st.speed * st.sign : 0; conv.x = dx * v; conv.z = dz * v; };
  sync();
  level.world.add({ type: 'box', min: [p.x - s.x / 2, p.y, p.z - s.z / 2], max: [p.x + s.x / 2, p.y + s.y, p.z + s.z / 2], conveyor: conv, tag: 'foerderband' });
  const handle = {
    mode: 'boden', get speed() { return st.running ? st.speed * st.sign : 0; }, get running() { return st.running; },
    start() { st.running = true; sync(); }, stop() { st.running = false; sync(); }, toggle() { st.running = !st.running; sync(); },
    reverse() { st.sign *= -1; sync(); w6Sfx(level, 'switch'); },
    info: () => ({ mode: 'boden', speed: handle.speed, dir: [dx * st.sign, dz * st.sign] }),
  };
  if (spec.id) level.named.set(spec.id, handle);
  w6(level).belts.push(handle);
  if (!level.view) return handle;
  const along = Math.abs(dz) >= Math.abs(dx);
  const lenAlong = along ? s.z : s.x, lenAcross = along ? s.x : s.z;
  if (hasModel('foerderband')) {
    // Registry-Band: Ursprung Mitte unten, Oberseite y = thick, Pfeile laufen nach +X → in die Laufrichtung gedreht
    const m = getModel('foerderband', { length: lenAlong, width: lenAcross, thick: s.y });
    m.root.position.set(p.x, p.y, p.z);
    m.root.rotation.y = Math.atan2(-dz, dx);
    const hv = {};
    addObject(level, m.root, (dt) => { st.offset += handle.speed * visDt(level, hv, dt); m.update?.(0, { offset: st.offset }); });
    return handle;
  }
  // Rahmen mit Rollen an den Enden
  const parts = [box(s.x + 0.2, s.y - 0.06, s.z + 0.2, p.x, p.y + (s.y - 0.06) / 2, p.z, S.frame, { r: 0.08, topColor: S.frameTop })];
  for (const e of [-1, 1]) {
    const g = new THREE.CylinderGeometry(s.y * 0.5, s.y * 0.5, lenAcross + 0.1, 14);
    if (along) g.rotateZ(HALF_PI); else g.rotateX(HALF_PI);
    g.translate(p.x + (along ? 0 : e * (s.x / 2)), p.y + s.y * 0.5, p.z + (along ? e * (s.z / 2) : 0));
    parts.push(flatColor(g, 0x9aa0b4));
  }
  addStatic(level, merge(parts));
  const tex = beltTexture(S.colors);
  tex.repeat.set(Math.max(1, Math.round(lenAcross / 1.2)), lenAlong / 1.2);
  const plane = new THREE.PlaneGeometry(lenAcross - 0.2, lenAlong - 0.2);
  plane.rotateX(-HALF_PI);
  const mesh = beltMesh(plane, tex);
  mesh.rotation.y = Math.atan2(-dx, -dz);
  mesh.position.set(p.x, p.y + s.y + 0.005, p.z);
  const hv = {};
  addObject(level, mesh, (dt) => { tex.offset.y -= (handle.speed / 1.2) * visDt(level, hv, dt); });
  return handle;
}

// ------------------------------------------------------------------ Wand

function buildWand(level, spec) {
  const p = v3(spec.pos);
  const W = spec.width ?? 3, H = spec.height ?? 10, D = spec.depth ?? 1;
  const yaw = Math.round((spec.yaw ?? -HALF_PI) / HALF_PI) * HALF_PI;
  const nx = Math.cos(yaw), nz = -Math.sin(yaw), ax = nz, az = -nx;
  const S = STYLE[spec.style ?? 'gelb'] ?? STYLE.gelb;
  const st = { speed: spec.speed ?? 2, sign: 1, running: !spec.idle, offset: 0, carried: 0 };
  const v = () => (st.running ? st.speed * st.sign : 0);
  // Bandkörper (fest, kletterbar)
  const cx = p.x - nx * D / 2, cz = p.z - nz * D / 2;
  const ex = Math.abs(ax) * W / 2 + Math.abs(nx) * D / 2, ez = Math.abs(az) * W / 2 + Math.abs(nz) * D / 2;
  const body = { type: 'box', min: [cx - ex, p.y, cz - ez], max: [cx + ex, p.y + H, cz + ez], climbable: spec.climbable !== false, tag: 'foerderband:wand' };
  level.world.add(body);
  // Stufen (Mitnehmer)
  const gap = spec.ledges ?? 2.5, ld = spec.ledge ?? 0.7, lh = 0.3;
  const ledges = [];
  if (gap > 0) {
    const n = Math.max(1, Math.floor(H / gap));
    for (let i = 0; i < n; i++) {
      const s = (i / n) * H;
      const lw = W - 0.3;
      const bx = Math.abs(ax) * lw + Math.abs(nx) * ld, bz = Math.abs(az) * lw + Math.abs(nz) * ld;
      const mb = new MovingBox(level, p.x + nx * ld / 2, p.y + s, p.z + nz * ld / 2, bx, lh, bz, { tag: 'foerderband:stufe', camIgnore: true });
      ledges.push({ s, mb, k: 1 });
    }
  }
  const handle = {
    mode: 'wand', get speed() { return v(); }, get running() { return st.running; }, get carried() { return st.carried; }, body,
    start() { st.running = true; }, stop() { st.running = false; }, toggle() { st.running = !st.running; }, reverse() { st.sign *= -1; w6Sfx(level, 'switch'); },
    ledgeInfo: () => ledges.map((l) => +(l.mb.pos.y).toFixed(2)),
    info: () => ({ mode: 'wand', speed: v(), carried: +st.carried.toFixed(2), ledges: ledges.length }),
  };
  if (spec.id) level.named.set(spec.id, handle);
  w6(level).belts.push(handle);
  level.onStep((dt) => {
    const sp = v();
    // Figuren an der Bandfläche (Wandrutschen/Klettern) fahren mit
    if (sp) {
      for (const f of figures(level)) {
        if (f.mode !== 'wall' || f.wallShape !== body) continue;
        const m = shove(level, f, 0, sp * dt, 0);
        st.carried += Math.abs(m.y);
      }
    }
    // Stufen: wandern mit dem Band, an den Enden fahren sie ein (Tiefe → 0) und kommen am anderen Ende wieder
    for (const l of ledges) {
      l.s = (((l.s + sp * dt) % H) + H) % H;
      const edge = 0.6;
      const k = Math.max(0, Math.min(1, l.s / edge, (H - lh - l.s) / edge));
      const depth = Math.max(0.02, ld * k);
      const lw = W - 0.3;
      const bx = Math.abs(ax) * lw + Math.abs(nx) * depth, bz = Math.abs(az) * lw + Math.abs(nz) * depth;
      const jump = Math.abs(p.y + l.s - l.mb.pos.y) > 1;
      if (Math.abs(l.k - k) > 1e-4) { l.mb.resize(bx, lh, bz); l.k = k; }
      if (jump) { l.mb.moveTo(p.x + nx * depth / 2, p.y + l.s, p.z + nz * depth / 2, 0); l.mb.still(); }
      else l.mb.moveTo(p.x + nx * depth / 2, p.y + l.s, p.z + nz * depth / 2, dt);
      l.depth = depth;
    }
  });
  if (!level.view) return handle;
  // Darstellung: Körper (Rahmen), Bandfläche (Textur läuft), Stufen als Instanzen
  const parts = [];
  const frame = new THREE.BoxGeometry(W + 0.3, H, D);
  frame.translate(0, H / 2, -D / 2 - 0.02);
  parts.push(colorize(frame.toNonIndexed(), (q, n, o) => mixc(lin(S.frame), lin(S.frameTop), smooth(-1, 1, n.y * 0.4 + n.z * 0.6), o)));
  for (const y of [0.15, H - 0.15]) { const r = new THREE.CylinderGeometry(0.22, 0.22, W + 0.1, 12); r.rotateZ(HALF_PI); r.translate(0, y, 0); parts.push(flatColor(r, 0x9aa0b4)); }
  const g = merge(parts);
  const root = new THREE.Group();
  root.position.set(p.x, p.y, p.z);
  root.rotation.y = yaw + HALF_PI;   // lokal +X = entlang, lokal +Z = Bandfläche
  const fm = new THREE.Mesh(g, level.view.mats.world);
  fm.castShadow = true; fm.receiveShadow = true;
  root.add(fm);
  const tex = beltTexture(S.colors);
  tex.repeat.set(Math.max(1, Math.round(W / 1.2)), H / 1.2);
  const plane = new THREE.PlaneGeometry(W - 0.1, H - 0.1);
  plane.translate(0, H / 2, 0.005);
  root.add(beltMesh(plane, tex));
  let inst = null;
  if (ledges.length) {
    inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: S.cleat, roughness: 0.5 }), ledges.length);
    inst.castShadow = true; inst.frustumCulled = false;
    level.view.three.add(inst);
  }
  const M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), Sc = new THREE.Vector3();
  const hv = {};
  addObject(level, root, (dt) => {
    tex.offset.y -= (v() / 1.2) * visDt(level, hv, dt);
    if (!inst) return;
    ledges.forEach((l, i) => {
      const b = l.mb;
      P.set(b.pos.x, b.pos.y + b.size.y / 2, b.pos.z); Sc.set(b.size.x, b.size.y, b.size.z);
      M.compose(P, Q, Sc); inst.setMatrixAt(i, M);
    });
    inst.instanceMatrix.needsUpdate = true;
  });
  if (inst) addObject(level, inst);
  return handle;
}

// ------------------------------------------------------------------ Rund

function buildRund(level, spec) {
  const p = v3(spec.pos);
  const L = spec.length ?? 8, H = spec.height ?? 3, W = spec.width ?? 3;
  const yaw = Math.round((spec.yaw ?? 0) / HALF_PI) * HALF_PI;
  const fx = Math.cos(yaw), fz = -Math.sin(yaw);   // Laufrichtung oben
  const S = STYLE[spec.style ?? 'gelb'] ?? STYLE.gelb;
  const st = { speed: spec.speed ?? 2.5, sign: 1, running: !spec.idle, offset: 0 };
  const v = () => (st.running ? st.speed * st.sign : 0);
  // Block (fest), Oberseite = Förderfläche
  const ex = Math.abs(fx) * L / 2 + Math.abs(fz) * W / 2, ez = Math.abs(fz) * L / 2 + Math.abs(fx) * W / 2;
  const conv = { x: 0, z: 0 };
  const sync = () => { conv.x = fx * v(); conv.z = fz * v(); };
  sync();
  const block = { type: 'box', min: [p.x - ex, p.y, p.z - ez], max: [p.x + ex, p.y + H, p.z + ez], conveyor: conv, climbable: true, tag: 'foerderband:rund' };
  level.world.add(block);
  // Umlauf (in der Ebene aus Laufrichtung u und Höhe y): oben vorwärts (u −L/2 → L/2), vorn hinab, unten zurück, hinten hinauf
  const ld = spec.ledge ?? 0.5;
  const per = 2 * L + 2 * H;
  const at = (s) => {
    s = ((s % per) + per) % per;
    if (s < L) return { u: -L / 2 + s, y: H, side: 'oben' };
    s -= L; if (s < H) return { u: L / 2, y: H - s, side: 'vorn' };
    s -= H; if (s < L) return { u: L / 2 - s, y: 0, side: 'unten' };
    s -= L; return { u: -L / 2, y: s, side: 'hinten' };
  };
  const gap = spec.ledges ?? 2;
  const n = Math.max(2, Math.floor(per / gap));
  const cleats = [];
  const across = W - 0.2, th = 0.3;
  const placeCleat = (c, dt, snap) => {
    const q = at(c.s);
    let du, dy, su, sy;   // Mitte relativ (u, y) und Größe (entlang, hoch)
    if (q.side === 'oben') { du = q.u; dy = H; su = th; sy = ld; }
    else if (q.side === 'unten') { du = q.u; dy = -ld; su = th; sy = ld; }
    else if (q.side === 'vorn') { du = L / 2 + ld / 2; dy = q.y - th / 2; su = ld; sy = th; }
    else { du = -L / 2 - ld / 2; dy = q.y - th / 2; su = ld; sy = th; }
    const sx = Math.abs(fx) * su + Math.abs(fz) * across, sz = Math.abs(fz) * su + Math.abs(fx) * across;
    if (c.side !== q.side) { c.mb.resize(sx, sy, sz); snap = true; c.side = q.side; }
    const wx = p.x + fx * du, wz = p.z + fz * du, wy = p.y + dy;
    if (snap) { c.mb.moveTo(wx, wy, wz, 0); c.mb.still(); } else c.mb.moveTo(wx, wy, wz, dt);
  };
  for (let i = 0; i < n; i++) {
    const c = { s: (i / n) * per, side: null, mb: new MovingBox(level, p.x, p.y, p.z, 0.3, 0.3, 0.3, { tag: 'foerderband:mitnehmer', camIgnore: true }) };
    placeCleat(c, 0, true);
    cleats.push(c);
  }
  const handle = {
    mode: 'rund', get speed() { return v(); }, get running() { return st.running; }, block, cleats,
    start() { st.running = true; sync(); }, stop() { st.running = false; sync(); }, toggle() { st.running = !st.running; sync(); },
    reverse() { st.sign *= -1; sync(); w6Sfx(level, 'switch'); },
    info: () => ({ mode: 'rund', speed: v(), cleats: cleats.map((c) => c.side) }),
  };
  if (spec.id) level.named.set(spec.id, handle);
  w6(level).belts.push(handle);
  level.onStep((dt) => {
    const sp = v();
    for (const c of cleats) { c.s += sp * dt; placeCleat(c, dt, false); }
  });
  if (!level.view) return handle;
  // Block mit umlaufender Bandfläche (eine Fläche, V = Bogenlänge), Seitenwangen, Mitnehmer als Instanzen
  const root = new THREE.Group();
  root.position.set(p.x, p.y, p.z);
  root.rotation.y = yaw;   // lokal +X = Laufrichtung oben
  const parts = [];
  for (const s of [-1, 1]) {
    const cheek = new THREE.BoxGeometry(L + 0.4, H + 0.4, 0.2);
    cheek.translate(0, H / 2, s * (W / 2 + 0.1));
    parts.push(colorize(cheek.toNonIndexed(), (q, nn, o) => mixc(lin(S.frame), lin(S.frameTop), smooth(-1, 1, nn.y * 0.5 + nn.z * s * 0.5), o)));
    for (const [u, y] of [[-L / 2, 0], [L / 2, 0], [-L / 2, H], [L / 2, H]]) {
      const hub = new THREE.CylinderGeometry(0.28, 0.28, 0.08, 12); hub.rotateX(HALF_PI); hub.translate(u, y, s * (W / 2 + 0.22));
      parts.push(flatColor(hub, 0xffc83a));
    }
  }
  const fm = new THREE.Mesh(merge(parts), level.view.mats.world);
  fm.castShadow = true; fm.receiveShadow = true;
  root.add(fm);
  // Bandfläche rundherum
  const pos = [], uv = [], nor = [];
  const ring = [[-L / 2, H, 0, 1], [L / 2, H, 0, 1], [L / 2, 0, 1, 0], [-L / 2, 0, 0, -1], [-L / 2, H, -1, 0]];
  let vacc = 0;
  for (let i = 0; i < 4; i++) {
    const [u0, y0] = ring[i], [u1, y1] = ring[i + 1];
    const len = Math.hypot(u1 - u0, y1 - y0);
    const nn = i === 0 ? [0, 1, 0] : i === 1 ? [1, 0, 0] : i === 2 ? [0, -1, 0] : [-1, 0, 0];
    const off = 0.01;
    const A = [u0 + nn[0] * off, y0 + nn[1] * off], B = [u1 + nn[0] * off, y1 + nn[1] * off];
    const zL = -W / 2 + 0.05, zR = W / 2 - 0.05;
    const v0 = vacc / 1.2, v1 = (vacc + len) / 1.2;
    const quad = [[A[0], A[1], zL, 0, v0], [B[0], B[1], zL, 0, v1], [B[0], B[1], zR, 1, v1], [A[0], A[1], zL, 0, v0], [B[0], B[1], zR, 1, v1], [A[0], A[1], zR, 1, v0]];
    for (const q of quad) { pos.push(q[0], q[1], q[2]); uv.push(q[3] * Math.round(W / 1.2), q[4]); nor.push(...nn); }
    vacc += len;
  }
  const bg = new THREE.BufferGeometry();
  bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  bg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  bg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const tex = beltTexture(S.colors);
  const bm = beltMesh(bg, tex);
  bm.material.side = THREE.DoubleSide;
  root.add(bm);
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: S.cleat, roughness: 0.5 }), cleats.length);
  inst.castShadow = true; inst.frustumCulled = false;
  const M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), Sc = new THREE.Vector3();
  const hv = {};
  addObject(level, root, (dt) => {
    tex.offset.y -= (v() / 1.2) * visDt(level, hv, dt);
    cleats.forEach((c, i) => {
      const b = c.mb;
      P.set(b.pos.x, b.pos.y + b.size.y / 2, b.pos.z); Sc.set(b.size.x, b.size.y, b.size.z);
      M.compose(P, Q, Sc); inst.setMatrixAt(i, M);
    });
    inst.instanceMatrix.needsUpdate = true;
  });
  addObject(level, inst);
  return handle;
}

export function buildFoerderband(level, spec) {
  if (spec.mode === 'wand') return buildWand(level, spec);
  if (spec.mode === 'rund') return buildRund(level, spec);
  return buildBoden(level, spec);
}

export const TYPES = { foerderband: buildFoerderband };
