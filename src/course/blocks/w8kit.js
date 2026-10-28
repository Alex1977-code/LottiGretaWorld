// Gemeinsame Hilfen der Welt-8-Bausteine „Brummbär-Rummelplatz“ (blocks/types/w8_*.js, deco_w8.js,
// entities/kinds/w8_gimmicks.js, CreditsScene). Liegt bewusst außerhalb von types/ (die Registry sammelt nur types/*.js).
//
//   w8(level)                       Sammelstelle je Level: { stegs, rocks, pools, cubes, spikes, cookies, gears, fields, wheels,
//                                   rains, mirrors, pows, bridges, flashes, impacts }
//   flash(level, x, y, z, r, o)     Aufleuchten der Leuchtstege um (x, y, z) mit Radius r (m): breitet sich in 0,25 s aus,
//                                   hält, verblasst über o.time (Standard 2,2 s). Auch per Signal: level.signal('aufschlag',
//                                   { pos: [x, y, z], radius }) – so melden neue Gegner ihren Aufschlag (Gegner-Agent).
//   watchImpacts(level)             einmal je Level: Aufschläge erkennen und als flash melden – Stampfstein landet (state
//                                   'land'), Suchkopf/Projektilkopf zerplatzt oder schlägt auf, Figur landet aus der
//                                   Stampfattacke, Lavabrocken-Regen schlägt ein; Zähler w8(level).impacts
//   regModel(spec, name)            Registry-Modell `name` nutzbar (hasModel und spec.look !== 'eigen')?
//   pathOf(spec, p0)                Pfad-Punkte [{ x, y, z }] (spec.path ab pos, sonst [pos]) mit kumulierten Längen
//   pathAt(path, s, out)            Lage auf dem Pfad bei Weglänge s (m, geklemmt) → { x, y, z, dx, dz, seg, end }
//   stdMat(color, o)                MeshStandardMaterial mit Vertexfarben (geteilt je Schlüssel)
//   spikeGeo(n, len, r, col)        Stachel-Kegel (Spitze +Y, Fuß bei y = 0) mit Licht-Schattierung
//   + aus w7kit: figures, modelOr, hurtFigures, killFigures, sphereTouches, boxTouches, cycle, ease, clamp, TAU, onRespawn,
//     glowTexture, lavaTopAt, lavaMaterial, fireMaterial, fireBallGeo, rotXZ, flatColor, shadeGeo, pulse, shove

import * as THREE from 'three';
import { hasModel, getModel } from '../models/index.js';
import { lin, mixc, smooth, colorize, addStatic } from './kit.js';
import {
  figures, modelOr, hurtFigures, killFigures, sphereTouches, boxTouches, cycle, ease, clamp, TAU, onRespawn, glowTexture,
  lavaTopAt, lavaMaterial, fireMaterial, fireBallGeo, rotXZ, flatColor, shadeGeo, pulse, shove,
} from './w7kit.js';

export {
  figures, modelOr, hurtFigures, killFigures, sphereTouches, boxTouches, cycle, ease, clamp, TAU, onRespawn, glowTexture,
  lavaTopAt, lavaMaterial, fireMaterial, fireBallGeo, rotXZ, flatColor, shadeGeo, pulse, shove,
};

/** Sammelstelle der Welt-8-Bausteine je Level. */
export function w8(level) {
  return (level.w8 ??= {
    stegs: [], rocks: [], pools: [], cubes: [], spikes: [], cookies: [], gears: [], fields: [], wheels: [], rains: [], mirrors: [],
    pows: [], bridges: [], flashes: [], impacts: 0, watching: false,
  });
}

/** Registry-Modell nutzbar? (look: 'eigen' erzwingt die eigene Geometrie) */
export const regModel = (spec, name) => spec?.look !== 'eigen' && hasModel(name);

// ------------------------------------------------------------------ Aufleuchten (Leuchtstege)

export const FLASH = { grow: 0.25, time: 2.2, max: 6 };

/** Leuchtstege um (x, y, z) im Radius r aufleuchten lassen (o.time s Dauer, o.k Stärke 0..1, o.by Ursache). */
export function flash(level, x, y, z, r = 7, o = {}) {
  const W = w8(level);
  const f = { x, y, z, r, t: 0, time: o.time ?? FLASH.time, k: o.k ?? 1, by: o.by ?? null };
  W.flashes.push(f);
  if (W.flashes.length > FLASH.max) W.flashes.shift();
  W.impacts++;
  return f;
}

/** Stärke eines Aufleuchtens f am Punkt (x, y, z): 0..1 (wächst in FLASH.grow s auf r, verblasst am Ende). */
export function flashAt(f, x, y, z) {
  const R = f.r * Math.min(1, f.t / FLASH.grow);
  const d = Math.hypot(x - f.x, (y - f.y) * 0.6, z - f.z);
  if (d > R + 0.5) return 0;
  const fade = 1 - smooth(f.time * 0.55, f.time, f.t);
  return f.k * fade * (1 - smooth(R - 1.2, R + 0.5, d));
}

const STATE_IMPACT = { stampfstein: 'land' };

/**
 * Aufschläge erkennen (einmal je Level): Stampfstein landet, Suchkopf/Projektilkopf zerplatzt/schlägt auf, Figur landet aus
 * der Stampfattacke; dazu das Signal 'aufschlag' ({ pos, radius }). Jeder Aufschlag → flash(…, radius 7).
 */
export function watchImpacts(level) {
  const W = w8(level);
  if (W.watching) return;
  W.watching = true;
  const last = new WeakMap();
  const heads = new Set();
  level.onSignal?.('aufschlag', (data) => {
    const p = data?.pos ?? [0, 0, 0];
    const v = Array.isArray(p) ? p : [p.x, p.y, p.z];
    flash(level, v[0], v[1], v[2], data?.radius ?? 7, { by: data?.by ?? 'signal' });
  });
  level.onStep((dt) => {
    for (const f of W.flashes) f.t += dt;
    while (W.flashes.length && W.flashes[0].t > W.flashes[0].time) W.flashes.shift();
    // Figuren: Landung aus der Stampfattacke
    for (const f of figures(level)) {
      const pounded = f.state === 'land' && f.poundLanded && f.mode === 'ground';
      const was = last.get(f);
      if (pounded && !was) flash(level, f.pos.x, f.pos.y, f.pos.z, 7.5, { by: 'stampfen' });
      last.set(f, pounded);
    }
    // Gegner: Stampfstein landet (state 'land'); Suchkopf/Projektilkopf zerplatzt (burst – auch nach dem Entfernen aus
    // der Liste, darum werden die Köpfe gemerkt)
    for (const e of level.entities) {
      const k = e.kind;
      if (k === 'suchkopf' || k === 'projektilkopf') { heads.add(e); continue; }
      if (!STATE_IMPACT[k]) continue;
      const prev = last.get(e);
      if (e.state !== prev) {
        if (STATE_IMPACT[k] === e.state) flash(level, e.pos.x, e.pos.y, e.pos.z, 8, { by: k });
        last.set(e, e.state);
      }
    }
    for (const e of heads) {
      if (e.burst) { flash(level, e.pos.x, e.pos.y, e.pos.z, 6.5, { by: e.kind }); heads.delete(e); }
      else if (e.removed) heads.delete(e);
    }
  });
}

// ------------------------------------------------------------------ Pfade

/** Pfad-Punkte (spec.path; Standard [pos]) mit kumulierten Längen: { pts: [{ x, y, z, s }], length }. */
export function pathOf(spec, p0) {
  const raw = Array.isArray(spec.path) && spec.path.length ? spec.path : [[p0.x, p0.y, p0.z]];
  const pts = raw.map((q) => ({ x: q[0], y: q[1] ?? p0.y, z: q[2] ?? q[1] }));
  if (raw[0] && raw[0].length === 2) for (const q of pts) { q.z = q.y; q.y = p0.y; }
  if (Math.hypot(pts[0].x - p0.x, pts[0].y - p0.y, pts[0].z - p0.z) > 0.01) pts.unshift({ x: p0.x, y: p0.y, z: p0.z });
  let s = 0;
  pts[0].s = 0;
  for (let i = 1; i < pts.length; i++) { s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y, pts[i].z - pts[i - 1].z); pts[i].s = s; }
  return { pts, length: s };
}

/** Lage auf dem Pfad bei Weglänge s (geklemmt): { x, y, z, dx, dz (waagerechte Richtung), dy, seg, end }. */
export function pathAt(path, s, out = {}) {
  const P = path.pts;
  if (P.length === 1 || s <= 0) {
    const a = P[0], b = P[1] ?? P[0];
    const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    return Object.assign(out, { x: a.x, y: a.y, z: a.z, dx: (b.x - a.x) / l, dz: (b.z - a.z) / l, dy: 0, seg: 0, end: P.length === 1 });
  }
  if (s >= path.length) {
    const b = P[P.length - 1], a = P[P.length - 2];
    const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    return Object.assign(out, { x: b.x, y: b.y, z: b.z, dx: (b.x - a.x) / l, dz: (b.z - a.z) / l, dy: 0, seg: P.length - 2, end: true });
  }
  let i = 1;
  while (i < P.length - 1 && P[i].s < s) i++;
  const a = P[i - 1], b = P[i];
  const L = b.s - a.s || 1, u = (s - a.s) / L;
  const hl = Math.hypot(b.x - a.x, b.z - a.z);
  const dx = hl > 1e-4 ? (b.x - a.x) / hl : out.dx ?? 0, dz = hl > 1e-4 ? (b.z - a.z) / hl : out.dz ?? -1;
  return Object.assign(out, { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u, dx, dz, dy: (b.y - a.y) / L, seg: i - 1, end: false });
}

// ------------------------------------------------------------------ Darstellung

const MATS = new Map();
/** Geteiltes Vertexfarben-Material (Standard) je Schlüssel. */
export function stdMat(key = 'w8', o = {}) {
  let m = MATS.get(key);
  if (!m) { m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: o.roughness ?? 0.6, metalness: o.metalness ?? 0.05 }); MATS.set(key, m); }
  return m;
}

/** Stachel-Kegel: Fuß bei y = 0, Spitze bei y = len (radial r), schattiert von dunkel (Fuß) nach hell (Spitze). */
export function spikeGeo(len = 0.45, r = 0.16, colA = 0xe8eef6, colB = 0x7a8496, seg = 6) {
  const g = new THREE.ConeGeometry(r, len, seg);
  g.translate(0, len / 2, 0);
  const A = lin(colA), B = lin(colB);
  return colorize(g.toNonIndexed(), (p, n, o) => mixc(B, A, smooth(0, len, p.y) * 0.7 + smooth(-0.5, 0.8, n.y) * 0.3, o));
}

/** Leinwand-Textur (geteilt je Schlüssel), draw(ctx, w, h). */
const TEX = new Map();
export function canvasTexture(key, w, h, draw) {
  let t = TEX.get(key);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  TEX.set(key, t);
  return t;
}

const _bm = new THREE.Matrix4(), _bi = new THREE.Matrix4(), _bc = new THREE.Color();
/**
 * Registry-Modell in die statische Geometrie backen (wie bakeModel in w2kit, zusätzlich mit Instanzfarben – Wimpel,
 * Glühbirnen): undurchsichtige Teile ins Welt-Material (Vertexfarben), MeshBasicMaterial ins Glüh-Material; durchsichtige
 * und texturierte Teile entfallen. Liefert die Dreieckszahl (0 ohne Ansicht).
 */
export function bakeW8(level, name, opts, x, y, z, yaw = 0, scale = 1, state = {}, o = {}) {
  if (!level.view) return 0;
  const m = getModel(name, opts);
  m.update?.(0, state);
  const root = m.root;
  root.position.set(x, y, z);
  root.rotation.set(0, yaw, 0);
  if (Array.isArray(scale)) root.scale.set(scale[0], scale[1], scale[2]); else root.scale.setScalar(scale);
  root.updateMatrixWorld(true);
  let tris = 0;
  const parts = { world: [], glow: [] };
  root.traverse((ob) => {
    if (!ob.isMesh || !ob.visible) return;
    for (let q = ob.parent; q; q = q.parent) if (!q.visible) return;
    const mat = Array.isArray(ob.material) ? ob.material[0] : ob.material;
    if (!mat || mat.map || mat.transparent || mat.visible === false) return;
    const kind = mat.isMeshBasicMaterial ? 'glow' : 'world';
    const list = [];
    if (ob.isInstancedMesh) {
      for (let i = 0; i < ob.count; i++) {
        ob.getMatrixAt(i, _bi);
        if (Math.abs(_bi.determinant()) < 1e-9) continue;
        let col = null;
        if (ob.instanceColor) { ob.getColorAt(i, _bc); col = _bc.clone(); }
        list.push({ M: _bm.clone().multiplyMatrices(ob.matrixWorld, _bi), col });
      }
    } else list.push({ M: ob.matrixWorld.clone(), col: null });
    for (const { M, col } of list) {
      const g = ob.geometry.index ? ob.geometry.toNonIndexed() : ob.geometry.clone();
      for (const a of Object.keys(g.attributes)) if (a !== 'position' && a !== 'normal' && a !== 'color') g.deleteAttribute(a);
      if (!g.attributes.normal) g.computeVertexNormals();
      const c = mat.color ?? new THREE.Color(1, 1, 1), e = mat.emissive;
      const tint = [c.r * (col ? col.r : 1), c.g * (col ? col.g : 1), c.b * (col ? col.b : 1)];
      const em = e ? [e.r, e.g, e.b] : [0, 0, 0];
      const n = g.attributes.position.count;
      const old = mat.vertexColors && g.attributes.color ? g.attributes.color.array : null;
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) {
        arr[i * 3 + k] = old ? old[i * 3 + k] * tint[k] : Math.min(1, tint[k] + em[k] * 0.5);
      }
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      g.applyMatrix4(M);
      tris += n / 3;
      parts[kind].push(g);
    }
  });
  m.dispose?.();
  const cast = o.castShadow !== false;
  for (const g of parts.world) addStatic(level, g, { material: 'world', castShadow: cast });
  for (const g of parts.glow) addStatic(level, g, { material: 'glow', castShadow: false });
  return tris;
}
