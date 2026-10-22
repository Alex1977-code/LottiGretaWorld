// Schattenspiel (Bauplan 2-3 „Shadow-Play“): helle Wand im Hintergrund, auf der die Schatten der Objekte davor
// erscheinen – auch von Wegen, die es nur als Schatten gibt (unsichtbare, feste Platten).
//
// schattenwand – Wand in der XY-Ebene bei z = pos.z, Vorderseite +Z (zur Kamera). Alles in der Zone davor (Tiefe
//   `depth`) wirft einen flachen, dunklen Schatten auf die Wand: die Figur (Scherenschnitt-Puppe mit Zöpfen bzw.
//   Pferdeschwanz, Arme/Beine bewegt), Entitäten (Kugel/Quader/Stern je nach Art), Kollisionsformen (Quader,
//   Zylinder; auch bewegte) und zusätzliche Schattenformen ohne Körper (casters). Projektion parallel entlang `dir`
//   (Standard waagerecht, leicht schräg von rechts) – so zeigt die Wand eine 2D-Seitenansicht mit echten Höhen; mit
//   `light` (Punkt oder Id eines scheinwerfer) werden Schatten näher am Licht größer. Günstig fürs Handy: 1 Wandfläche
//   + höchstens 4 Instanz-Meshes, kein zusätzlicher Schattenpass, Schatten an den Wandrand geschnitten.
//   { type: 'schattenwand', id, pos: [x, y, z] (Mitte der Unterkante), size: [w, h] ([16, 8]), depth: 12,
//     dir: [0.05, 0, -1] (Lichtrichtung zur Wand; y < 0 = Licht von oben, Schatten fallen mit Abstand tiefer),
//     light: [x, y, z] | 'scheinwerfer-id' (optional, Punktlicht),
//     color: '#fff1d6' (Wand), shade: '#2c1f2a' (Schatten), frame: true (Holzrahmen), solid: true (dünne feste Wand
//     hinter der Fläche), player: true, entities: true, shapes: true (Kollisionsformen der Zone),
//     casters: [{ pos: [x, y, z] (Mitte), size: [w, h, d], shape: 'box'|'ball'|'star'|'cyl', id?, hidden? }] }
//   level.named.get(id) = { zone, count (Schatten im letzten Bild), casters, camera (Vorschlag für LEVEL.camera),
//     project(x, y, z) → [x, y] (Schattenlage eines Punkts), show(casterId), hide(casterId) }
//   Kamera-Hinweis: in der Zone frontal auf die Wand schauen, z. B. LEVEL.camera-Eintrag
//     { from: z + depth, to: z, pitch: 14, dist: 16, height: 2.6, ahead: 0, yaw: 0 } (handle.camera).
//
// schattenweg – Platten, die nur als Schatten zu sehen sind (unsichtbar, aber fest; die Schattenwand zeigt sie):
//   { type: 'schattenweg', id, parts: [{ pos: [x, y, z] (Mitte der Unterseite), size: [w, h, d] }, …] (oder pos/size),
//     hint: 0 (0..1 Deckkraft eines Glasumrisses, wenn die Figur nah ist), hidden: false (true → erst per reveal) }
//   level.named.get(id) = { parts, reveal(), hide() }
//
// scheinwerfer – Bühnenscheinwerfer auf Dreibein (Modell 'scheinwerfer'), Kopf zeigt bei yaw 0 nach +X:
//   { type: 'scheinwerfer', id, pos (Fußpunkt), yaw: π/2 (Standard: leuchtet nach −Z auf die Wand), aim: −0.15
//     (Neigung, negativ = nach unten), height: 1.8, cone: true, length: 6, on: true, solid: true }
//   level.named.get(id) = { on, light: { x, y, z } (Kopf), toggle() }  (Signal { toggle: id } schaltet)

import * as THREE from 'three';
import { v3, sz3, box, hex, merge, addStatic, addObject } from '../kit.js';
import { modelObject } from '../w2kit.js';

const MAXI = { ball: 96, box: 96, star: 8, cyl: 24 };

function starGeo() {
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? 0.45 : 1;
    if (i === 0) sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); else sh.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false });
  g.translate(0, 0, -0.15);
  return g;
}

const _m = new THREE.Matrix4(), _w = new THREE.Matrix4(), _P = new THREE.Matrix4(), _S = new THREE.Matrix4(), _T = new THREE.Matrix4(), _T2 = new THREE.Matrix4();
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Vector3();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

/** Parallelprojektion entlang d auf die Ebene z = zw (+ eps). */
function projMatrix(out, d, zw) {
  const kx = d.x / d.z, ky = d.y / d.z;
  return out.set(
    1, 0, -kx, kx * zw,
    0, 1, -ky, ky * zw,
    0, 0, 0, zw,
    0, 0, 0, 1,
  );
}

export function buildSchattenwand(level, spec) {
  const p = v3(spec.pos);
  const [W, H] = Array.isArray(spec.size) ? spec.size : [16, 8];
  const depth = spec.depth ?? 12;
  const zw = p.z;
  const x0 = p.x - W / 2, x1 = p.x + W / 2, y0 = p.y, y1 = p.y + H;
  const zone = { x0, x1, y0: y0 - 3, y1: y1 + 6, z0: zw, z1: zw + depth };
  const dv = spec.dir ?? [0.05, 0, -1];
  const dir = new THREE.Vector3(dv[0], dv[1], dv[2]).normalize();
  if (dir.z > -0.2) dir.z = -0.2;
  const handle = {
    zone, count: 0, casters: [], hiddenCasters: new Set(),
    camera: { from: zw + depth, to: zw, pitch: 14, dist: 16, height: 2.6, ahead: 0, yaw: 0 },
  };
  handle.show = (id) => handle.hiddenCasters.delete(id);
  handle.hide = (id) => handle.hiddenCasters.add(id);
  handle.lightPos = () => {
    const L = spec.light;
    if (!L) return null;
    if (typeof L === 'string') { const s = level.named.get(L); return s?.on === false ? null : s?.light ?? null; }
    return { x: L[0], y: L[1], z: L[2] };
  };
  /** Schattenlage eines Punkts (Wand-Koordinaten x, y). */
  handle.project = (x, y, z) => {
    const L = handle.lightPos();
    if (L) { const k = (zw - L.z) / (z - L.z); return [L.x + (x - L.x) * k, L.y + (y - L.y) * k]; }
    return [x - (dir.x / dir.z) * (z - zw), y - (dir.y / dir.z) * (z - zw)];
  };
  if (spec.id) level.named.set(spec.id, handle);
  if (spec.solid !== false) level.world.add({ type: 'box', min: [x0, y0, zw - 0.6], max: [x1, y1, zw], noShadow: true, tag: 'schattenwand' });
  for (const c of spec.casters ?? []) {
    handle.casters.push({ ...c, c: v3(c.pos), s: sz3(c.size, [1, 1, 1]), shape: c.shape ?? 'box' });
    if (c.hidden && c.id) handle.hiddenCasters.add(c.id);
  }
  if (!level.view) return handle;

  // ---- Wandfläche: warmer Lichtfleck (unbeleuchtet, damit sie im dunklen Thema hell bleibt)
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 128;
  const g2 = canvas.getContext('2d');
  const wallCol = new THREE.Color(hex(spec.color ?? 0xfff1d6));
  const css = (c, k) => `rgb(${Math.round(Math.min(1, c.r * k) * 255)},${Math.round(Math.min(1, c.g * k) * 255)},${Math.round(Math.min(1, c.b * k) * 255)})`;
  const sc = wallCol.clone().convertLinearToSRGB();
  const grad = g2.createRadialGradient(128, 70, 8, 128, 64, 150);
  grad.addColorStop(0, css(sc, 1.04)); grad.addColorStop(0.55, css(sc, 0.92)); grad.addColorStop(1, css(sc, 0.55));
  g2.fillStyle = grad; g2.fillRect(0, 0, 256, 128);
  // feine Putz-Struktur
  for (let i = 0; i < 260; i++) { g2.fillStyle = `rgba(120,80,40,${0.03 + (i % 5) * 0.008})`; g2.fillRect((i * 97) % 256, (i * 57) % 128, 2 + (i % 3), 1 + (i % 2)); }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex, fog: false }));
  wall.position.set(p.x, p.y + H / 2, zw);
  wall.receiveShadow = false;
  addObject(level, wall);
  if (spec.frame !== false) {
    const wood = 0x8a5a32, woodHi = 0xc08a52;
    const parts = [
      box(W + 0.7, 0.35, 0.4, p.x, y1 + 0.17, zw + 0.05, wood, { r: 0.08, topColor: woodHi }),
      box(W + 0.7, 0.3, 0.4, p.x, y0 - 0.15, zw + 0.05, wood, { r: 0.08, topColor: woodHi }),
      box(0.35, H + 0.6, 0.4, x0 - 0.17, p.y + H / 2, zw + 0.05, wood, { r: 0.08 }),
      box(0.35, H + 0.6, 0.4, x1 + 0.17, p.y + H / 2, zw + 0.05, wood, { r: 0.08 }),
      box(W + 1.2, H + 1.2, 0.3, p.x, p.y + H / 2, zw - 0.5, 0x4a3a40, { r: 0.05 }),
    ];
    addStatic(level, merge(parts));
  }

  // ---- Schatten: Instanz-Meshes je Grundform, an den Wandrand geschnitten
  level.view.renderer.localClippingEnabled = true;
  const planes = [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), -x0), new THREE.Plane(new THREE.Vector3(-1, 0, 0), x1),
    new THREE.Plane(new THREE.Vector3(0, 1, 0), -y0), new THREE.Plane(new THREE.Vector3(0, -1, 0), y1),
  ];
  const mat = new THREE.MeshBasicMaterial({ color: hex(spec.shade ?? 0x2c1f2a), clippingPlanes: planes, fog: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const geos = {
    ball: new THREE.SphereGeometry(1, 14, 10),
    box: new THREE.BoxGeometry(1, 1, 1),
    star: starGeo(),
    cyl: new THREE.CylinderGeometry(1, 1, 1, 16),
  };
  const meshes = {};
  for (const k of Object.keys(geos)) {
    const im = new THREE.InstancedMesh(geos[k], mat, MAXI[k]);
    im.frustumCulled = false;
    im.count = 0;
    im.renderOrder = 1;
    im.userData.owned = true;
    meshes[k] = im;
    level.view.add(im);
  }
  const zEps = zw + 0.02;
  const counts = { ball: 0, box: 0, star: 0, cyl: 0 };
  /** Proxy (Weltmatrix w, Mitte c) → projizierte Instanz. */
  const emit = (kind, w, cx, cy, cz) => {
    if (counts[kind] >= MAXI[kind]) return;
    const L = handle.lightPos();
    if (L) {
      if (L.z <= cz + 0.05) return;
      const d = _c.set(cx - L.x, cy - L.y, cz - L.z).normalize();
      if (d.z > -0.05) return;
      projMatrix(_P, d, zEps);
      const k = (L.z - zw) / (L.z - cz);
      const t = (zw - L.z) / (cz - L.z);
      const px = L.x + (cx - L.x) * t, py = L.y + (cy - L.y) * t;
      _T.makeTranslation(px, py, 0); _S.makeScale(k, k, 1); _T2.makeTranslation(-px, -py, 0);
      _m.multiplyMatrices(_T, _S).multiply(_T2).multiply(_P).multiply(w);
    } else {
      projMatrix(_P, dir, zEps);
      _m.multiplyMatrices(_P, w);
    }
    meshes[kind].setMatrixAt(counts[kind]++, _m);
  };
  const inZone = (x, y, z, r = 0) => x + r > zone.x0 - 2 && x - r < zone.x1 + 2 && z + r > zone.z0 && z - r < zone.z1 && y + r > zone.y0 && y - r < zone.y1;
  const ellipsoid = (cx, cy, cz, rx, ry, rz, yaw = 0, rotX = 0, rotZ = 0, kind = 'ball') => {
    _e.set(rotX, yaw, rotZ, 'YXZ'); _q.setFromEuler(_e);
    _w.compose(_p.set(cx, cy, cz), _q, _s.set(rx, ry, rz));
    emit(kind, _w, cx, cy, cz);
  };

  // Scherenschnitt-Puppe der Figur (lokal: +X = Blickrichtung)
  const puppet = { phase: 0, lastX: 0, lastZ: 0 };
  const _pm = new THREE.Matrix4(), _lm = new THREE.Matrix4();
  const part = (pm, lx, ly, lz, rx, ry, rz, rotZ = 0, rotX = 0) => {
    _e.set(rotX, 0, rotZ, 'XYZ'); _q.setFromEuler(_e);
    _lm.compose(_p.set(lx, ly, lz), _q, _s.set(rx, ry, rz));
    _w.multiplyMatrices(pm, _lm);
    _c.setFromMatrixPosition(_w);
    emit('ball', _w, _c.x, _c.y, _c.z);
  };
  const drawPlayer = (pl, dt) => {
    if (!pl || pl.dead || pl.script?.type === 'pipe') return;
    const P = pl.pos;
    if (!inZone(P.x, P.y + 0.5, P.z, 0.6)) return;
    const k = pl.big ? 1 : 0.7;
    const sp = Math.hypot(pl.vel.x, pl.vel.z);
    if (pl.mode === 'ground') puppet.phase += sp * dt * 2.6;
    const air = pl.mode === 'air' || pl.mode === 'wall';
    const st = pl.state;
    const crouch = st === 'crouch' || st === 'slide' || st === 'groundpound';
    _e.set(0, pl.yaw, 0); _q.setFromEuler(_e);
    _pm.compose(_p.set(P.x, P.y, P.z), _q, _s.set(k, crouch ? k * 0.7 : k, k));
    const sw = air ? 0 : Math.sin(puppet.phase) * Math.min(1, sp / 4);
    // Beine
    const legA = air ? 0.7 : sw * 0.6;
    part(_pm, Math.sin(legA) * 0.1 + 0.02, 0.17, 0.09, 0.075, 0.18, 0.075, legA);
    part(_pm, -Math.sin(legA) * 0.1 + (air ? 0.06 : 0.02), air ? 0.2 : 0.17, -0.09, 0.075, 0.18, 0.075, air ? -0.5 : -legA);
    // Kleid/Rumpf
    part(_pm, 0, 0.45, 0, 0.19, 0.22, 0.17);
    // Arme
    const armA = air ? 2.5 : sw * 0.8;
    part(_pm, 0, 0.5 + (air ? 0.12 : 0), 0.21, 0.055, 0.17, 0.055, armA, -0.25);
    part(_pm, 0, 0.5 + (air ? 0.12 : 0), -0.21, 0.055, 0.17, 0.055, air ? -2.5 : -armA, 0.25);
    // Kopf
    part(_pm, 0.02, 0.82, 0, 0.21, 0.2, 0.2);
    if (pl.hero === 'greta') part(_pm, -0.21, 0.84, 0, 0.13, 0.07, 0.07, -0.6 - sw * 0.2);      // Pferdeschwanz
    else {
      part(_pm, -0.06, 0.7, 0.22, 0.06, 0.15, 0.06, 0, -0.5 - sw * 0.1);                         // Zöpfe
      part(_pm, -0.06, 0.7, -0.22, 0.06, 0.15, 0.06, 0, 0.5 + sw * 0.1);
    }
  };

  const STARRY = new Set(['star', 'starcoin']);
  const BOXY = (e) => /block|crate|kiste|chest|kristall|wand|lauer|stein|pow|warpbox|endless|roulette/.test(e.kind);
  const cands = [];
  const shadowFrame = (dt) => {
    for (const k of Object.keys(counts)) counts[k] = 0;
    if (spec.player !== false) drawPlayer(level.player, dt);
    if (spec.entities !== false) {
      for (const e of level.entities) {
        if (!e.alive || e.removed || e.hidden || e.shadowProxy === false || e.kind === 'checkpoint' || e.kind === 'goal') continue;
        if (e.shapes?.length && !e.enemy) continue;       // feste Entitäten zeichnen sich über ihre Formen
        const h = e.half, c = e.center();
        if (!inZone(c.x, c.y, c.z, Math.max(h.x, h.y))) continue;
        if (STARRY.has(e.kind)) ellipsoid(c.x, c.y, c.z, 0.55, 0.55, 0.55, 0, 0, Math.sin(level.time * 2) * 0.2, 'star');
        else if (BOXY(e)) ellipsoid(c.x, c.y, c.z, h.x * 2, h.y * 2, h.z * 2, e.yaw ?? 0, 0, 0, 'box');
        else ellipsoid(c.x, c.y, c.z, h.x * 1.05, h.y, h.z * 1.05, e.yaw ?? 0);
      }
    }
    if (spec.shapes !== false) {
      cands.length = 0;
      level.world.candidates(zone.x0 - 2, zone.z0, zone.x1 + 2, zone.z1, cands);
      for (const s of cands) {
        if (!s.solid || s.noShadow || s.trigger || s.water || s.kill || s._big) continue;
        if (s.z1 <= zone.z0 + 0.01 || s.z0 >= zone.z1 || s.top < zone.y0 || s.bot > zone.y1) continue;
        if (s.owner?.level === level && s.owner?.kind && s.owner.enemy) continue;
        if (s.type === 'cyl') {
          _w.compose(_p.set(s.x, (s.y0 + s.y1) / 2, s.z), _q.identity(), _s.set(s.r, s.y1 - s.y0, s.r));
          emit('cyl', _w, s.x, (s.y0 + s.y1) / 2, s.z);
        } else {
          const cx = (s.x0 + s.x1) / 2, cy = (s.bot + s.top) / 2, cz = (s.z0 + s.z1) / 2;
          _w.compose(_p.set(cx, cy, cz), _q.identity(), _s.set(s.x1 - s.x0, s.top - s.bot, s.z1 - s.z0));
          emit('box', _w, cx, cy, cz);
        }
      }
    }
    for (const c of handle.casters) {
      if (c.id && handle.hiddenCasters.has(c.id)) continue;
      ellipsoid(c.c.x, c.c.y, c.c.z, c.shape === 'ball' ? c.s.x / 2 : c.s.x, c.shape === 'ball' ? c.s.y / 2 : c.s.y, c.shape === 'ball' ? c.s.z / 2 : c.s.z, 0, 0, 0, c.shape === 'star' ? 'star' : c.shape === 'cyl' ? 'cyl' : c.shape === 'ball' ? 'ball' : 'box');
    }
    let n = 0;
    for (const k of Object.keys(meshes)) {
      const im = meshes[k];
      for (let i = counts[k]; i < im.count; i++) im.setMatrixAt(i, ZERO);
      im.count = counts[k];
      im.instanceMatrix.needsUpdate = true;
      im.visible = counts[k] > 0;
      n += counts[k];
    }
    handle.count = n;
    handle.counts = { ...counts };
  };
  const holder = {};
  level.view.onFrame((dt) => {
    const d = Math.min(0.1, Math.max(dt, level.time - (holder.t ?? level.time)));
    holder.t = level.time;
    shadowFrame(d);
  });
  handle.refresh = () => shadowFrame(0);
  return handle;
}

// ------------------------------------------------------------------ Schattenweg

export function buildSchattenweg(level, spec) {
  const list = spec.parts ?? [{ pos: spec.pos, size: spec.size }];
  const parts = list.map((q) => {
    const p = v3(q.pos), s = sz3(q.size, [2, 0.4, 2]);
    return { p, s, shape: { type: 'box', min: [p.x - s.x / 2, p.y, p.z - s.z / 2], max: [p.x + s.x / 2, p.y + s.y, p.z + s.z / 2], camIgnore: true, tag: 'schattenweg' }, id: null };
  });
  const h = { parts, shown: !spec.hidden };
  const place = (on) => {
    for (const q of parts) {
      if (on && !q.id) q.id = level.world.add(q.shape);
      else if (!on && q.id) { level.world.remove(q.id); q.id = null; }
    }
    h.shown = on;
  };
  h.reveal = () => { if (!h.shown) { place(true); level.sfx('switch'); } };
  h.hide = () => { if (h.shown) { place(false); level.sfx('vanish'); } };
  place(h.shown);
  if (spec.id) level.named.set(spec.id, h);
  const hint = spec.hint ?? 0;
  if (hint > 0 && level.view) {
    const g = merge(parts.map((q) => { const b = new THREE.BoxGeometry(q.s.x, q.s.y, q.s.z).toNonIndexed(); b.translate(q.p.x, q.p.y + q.s.y / 2, q.p.z); return b; }));
    const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: 0, depthWrite: false }));
    mesh.renderOrder = 2;
    addObject(level, mesh, () => {
      const pl = level.player;
      let near = 99;
      if (pl) for (const q of parts) near = Math.min(near, Math.hypot(pl.pos.x - q.p.x, pl.pos.z - q.p.z) - Math.max(q.s.x, q.s.z) / 2);
      mesh.material.opacity = h.shown ? hint * 0.35 * Math.max(0, Math.min(1, 1 - near / 3)) : 0;
      mesh.visible = mesh.material.opacity > 0.005;
    });
  }
  return h;
}

// ------------------------------------------------------------------ Scheinwerfer

export function buildScheinwerfer(level, spec) {
  const p = v3(spec.pos);
  const H = spec.height ?? 1.8;
  const yaw = spec.yaw ?? Math.PI / 2;
  const aim = spec.aim ?? -0.15;
  const h = { on: spec.on !== false, light: { x: p.x + Math.cos(yaw) * 0.35, y: p.y + H + Math.sin(aim) * 0.35, z: p.z - Math.sin(yaw) * 0.35 } };
  h.toggle = () => { h.on = !h.on; level.sfx('switch'); };
  h.start = () => { h.on = true; };
  h.stop = () => { h.on = false; };
  if (spec.id) level.named.set(spec.id, h);
  if (spec.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.3, y0: p.y, y1: p.y + H, noShadow: true, tag: 'scheinwerfer' });
  modelObject(level, 'scheinwerfer', { height: H, cone: spec.cone !== false, length: spec.length ?? 6 }, p.x, p.y, p.z, yaw, () => ({ on: h.on, aim }));
  return h;
}

export const TYPES = { schattenwand: buildSchattenwand, schattenweg: buildSchattenweg, scheinwerfer: buildScheinwerfer };
