// Gemeinsame Hilfen der Bausteine der Bonuswelt Stern „Sternenzelt“ (blocks/types/star_*.js, deco_star.js,
// entities/kinds/star_gimmicks.js) und der Remix-Technik. Liegt bewusst außerhalb von types/ (die Registry sammelt nur
// types/*.js). Präzisierung „Motor und Bausteine Bonuswelten“.
//
//   star(level)                     Sammelstelle je Level: { clocks, plates, colors, walls, rollers, drums, poles, towers,
//                                   topdown, combs, fogs, boards, cannons, dioramas, rocks, rewards }
//   unlockOutfit(name, from)        Kostüm freischalten (courseSave.data.outfits[name] = { from, at }, additiv) → true, wenn neu
//   hasOutfit(name), outfits()      freigeschaltet? / Liste der Namen
//   camYawAt(level, x, z)           Blickrichtung der Kamera auf den Punkt (Grad, wie CameraRig: 0 = Kamera bei +Z, + = nach +X)
//   yawIn(yaw, [a, b])              liegt die Gier (Grad) im Bereich a … b (Grad, auch über ±180°)?
//   PAL                             Regenbogen-/Pastellfarben der Welt Stern (Hex)
//   plateGeos(w, h, d, frame)       Platten-Geometrie: Kern (weiß, je Instanz getönt) + weißer Rahmen
//   PlateSet                        Instanz-Platten (Kern + Rahmen = 2 Zeichenaufrufe für alle Platten eines Bausteins)
//   standerOn(level, owner)         Figur, die auf einer Form dieses Besitzers steht (oder null)
//   figureInside(level, box)        Figur, die im Quader steckt (vor dem Wieder-fest-Werden einer Form)
//   defineHandle(handle, props)     Felder samt Gettern in einen Griff übernehmen
//   useModel(spec, name)            Registry-Modell verwenden? (vorhanden und spec.look !== 'eigen')
//   modelColor(c, d)                Plattenfarbe für die Stern-Modelle (Name aus PANEL oder Hex)
//   sphereOf(pts, pad)              Hüllkugel über Punkte → { center, radius }
//   instancedModel(level, name, n, opts, sphere)   Instanz-Variante (createInstanced, models/lib/instanced_star.js) mit
//                                   fester Hüllkugel und Animation je Bild
//   ModelSet                        Instanz-Gruppe aus einem beliebigen Registry-Modell (je Mesh ein InstancedMesh; Lagen
//                                   je Schlüssel-Zustand gemessen und gemischt): set(i, x, y, z, yaw, k, scale), hide,
//                                   setCount(n), commit, cull(center, radius)
//   bakeRoot(level, model, state)   Modell mit beliebiger Lage (auch geneigt) in die statische Geometrie backen
//   + aus w8kit/w7kit/w2kit: figures, MovingBox, regModel, stdMat, pathOf, pathAt, canvasTexture, bakeW8, hurtFigures,
//     killFigures, sphereTouches, boxTouches, cycle, onRespawn, ease, clamp, TAU, modelOr, glowTexture, spikeGeo
//   + Geometrie: lin, mixc, smooth, colorize, merge, roundedBox, SIDE

import * as THREE from 'three';
import { courseSave } from '../level/CourseSave.js';
import { MovingBox, figures } from './w2kit.js';
import {
  regModel, stdMat, pathOf, pathAt, canvasTexture, bakeW8, hurtFigures, killFigures, sphereTouches, boxTouches, cycle, onRespawn,
  ease, clamp, TAU, modelOr, glowTexture, spikeGeo,
} from './w8kit.js';
import { roundedBox, colorize, merge, lin, mixc, smooth, SIDE } from '../../three/world/geometry.js';
import { addObject } from './kit.js';
import { visDt } from '../entities/gimmick.js';
import { hasModel, getModel } from '../models/index.js';
import { createInstanced } from '../models/lib/instanced.js';

export {
  MovingBox, figures, regModel, stdMat, pathOf, pathAt, canvasTexture, bakeW8, hurtFigures, killFigures, sphereTouches, boxTouches,
  cycle, onRespawn, ease, clamp, TAU, modelOr, glowTexture, spikeGeo, lin, mixc, smooth, colorize, merge, roundedBox, SIDE,
};

/** Felder (auch Getter/Setter) in einen Griff übernehmen – anders als Object.assign bleiben Getter lebendig. */
export function defineHandle(handle, props) { return Object.defineProperties(handle, Object.getOwnPropertyDescriptors(props)); }

/** Sammelstelle der Stern-Bausteine je Level. */
export function star(level) {
  return (level.star ??= {
    clocks: [], plates: [], colors: [], walls: [], rollers: [], drums: [], poles: [], towers: [], topdown: [], combs: [], fogs: [],
    boards: [], cannons: [], dioramas: [], rocks: [], rewards: [],
  });
}

/** Regenbogen- und Pastellfarben (Weltraum-Wege, Platten, Kulisse). */
export const PAL = {
  rainbow: [0xff5a6a, 0xff9a3a, 0xffd23a, 0x5ad86a, 0x3ab8ff, 0x8a6aff, 0xff7ad8],
  pastel: [0xffb8d8, 0xffd8a8, 0xfff0a0, 0xb8f0c0, 0xa8dcff, 0xd0c0ff],
  plate: { blau: 0x3a8aff, gelb: 0xffd23a, rot: 0xff4a5a, gruen: 0x4ad86a, lila: 0xa86aff, weiss: 0xf4f2ff, rosa: 0xff7ac0, orange: 0xff9a2e, tuerkis: 0x3ad8e0 },
};
/** Farbname oder Hex → Hex. */
export const plateColor = (c, d = 0x3a8aff) => (typeof c === 'number' ? c : PAL.plate[c] ?? d);

// ------------------------------------------------------------------ Kostüme (Sternenglanz)

/** Kostüm freischalten (additiv im Spielstand: data.outfits = { name: { from, at } }). → true, wenn neu. */
export function unlockOutfit(name, from = null) {
  const d = courseSave.data;
  d.outfits ??= {};
  if (d.outfits[name]) return false;
  d.outfits[name] = { from, at: Date.now() };
  courseSave.save();
  return true;
}
export const hasOutfit = (name) => !!courseSave.data.outfits?.[name];
export const outfits = () => Object.keys(courseSave.data.outfits ?? {});

// ------------------------------------------------------------------ Kamera-Blick

const DEG = 180 / Math.PI;
/** Gier der Kamera, von (x, z) aus gesehen (Grad; 0 = Kamera bei +Z, positiv = Kamera nach +X) – null ohne Ansicht. */
export function camYawAt(level, x, z) {
  const cam = level.view?.camera;
  if (!cam) return null;
  return Math.atan2(cam.position.x - x, cam.position.z - z) * DEG;
}

/** Gier (Grad) im Bereich [a, b] (Grad; a > b = über ±180° hinweg)? */
export function yawIn(yaw, r) {
  if (yaw === null || yaw === undefined || !Array.isArray(r)) return false;
  const n = (v) => ((v % 360) + 540) % 360 - 180;
  const y = n(yaw), a = n(r[0]), b = n(r[1]);
  return a <= b ? y >= a && y <= b : y >= a || y <= b;
}

// ------------------------------------------------------------------ Platten-Darstellung (Instanzen)

const PLATE_GEO = new Map();
/** Platten-Geometrie (Ursprung Mitte, Größe w × h × d): Kern (Vertexfarbe weiß, wird je Instanz getönt) und Rahmen (weiß). */
export function plateGeos(w, h, d, frame = 0.16) {
  const key = `${w}|${h}|${d}|${frame}`;
  let g = PLATE_GEO.get(key);
  if (g) return g;
  const inset = frame > 0 ? frame * 1.2 : 0;
  const core = colorize(roundedBox(w - inset, h, d - inset, Math.min(0.08, h * 0.3), SIDE.ALL, 0, 2), (p, n, o) => { const k = n.y > 0.5 ? 1 : n.y < -0.5 ? 0.5 : 0.78; o[0] = k; o[1] = k; o[2] = k; });
  const parts = [];
  if (frame > 0) {
    const fh = h + 0.04;
    for (const [fw, fd, x, z] of [[w, frame, 0, d / 2 - frame / 2], [w, frame, 0, -d / 2 + frame / 2], [frame, d - frame * 2, w / 2 - frame / 2, 0], [frame, d - frame * 2, -w / 2 + frame / 2, 0]]) {
      const b = roundedBox(fw, fh, fd, Math.min(0.06, frame * 0.4), SIDE.ALL, 0, 1);
      b.translate(x, 0.02, z);
      parts.push(b);
    }
  }
  const fr = parts.length ? colorize(merge(parts), (p, n, o) => { const k = n.y > 0.5 ? 1 : 0.8; o[0] = k; o[1] = k * 0.98; o[2] = k * 0.95; }) : null;
  g = { core, frame: fr };
  PLATE_GEO.set(key, g);
  return g;
}

const _pm = new THREE.Matrix4(), _pq = new THREE.Quaternion(), _pe = new THREE.Euler(), _pv = new THREE.Vector3(), _ps = new THREE.Vector3();
const _pc = new THREE.Color(), _white = new THREE.Color(1, 1, 1);

/**
 * Instanz-Platten (ein Zeichenaufruf für den Kern, einer für den Rahmen): n Platten der Größe size; set(i, { x, y, z (Mitte),
 * rx, rz (Kippwinkel), ry, color (Hex), glow (0..1 heller), scale }) und commit(); render(fn) ruft fn(d) je Bild und übernimmt.
 */
export class PlateSet {
  constructor(level, n, size, o = {}) {
    this.level = level;
    this.n = n;
    this.size = size;
    this.mesh = null;
    this.frameMesh = null;
    if (!level.view || !n) return;
    const g = plateGeos(size[0], size[1], size[2], o.frame ?? 0.16);
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: o.roughness ?? 0.45, metalness: 0.05, emissive: new THREE.Color(o.emissive ?? 0x000000) });
    this.mesh = new THREE.InstancedMesh(g.core, mat, n);
    this.mesh.name = o.name ?? 'platten';
    this.mesh.castShadow = o.shadow !== false;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    for (let i = 0; i < n; i++) this.mesh.setColorAt(i, _pc.setHex(0xffffff));
    addObject(level, this.mesh);
    if (g.frame) {
      const fm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, color: new THREE.Color(o.frameColor ?? 0xffffff), emissive: new THREE.Color(o.frameGlow ?? 0x1a1a24) });
      this.frameMesh = new THREE.InstancedMesh(g.frame, fm, n);
      this.frameMesh.name = `${this.mesh.name}_rahmen`;
      this.frameMesh.castShadow = false;
      this.frameMesh.frustumCulled = false;
      addObject(level, this.frameMesh);
    }
  }

  set(i, s) {
    if (!this.mesh) return;
    _pv.set(s.x, s.y, s.z);
    _pe.set(s.rx ?? 0, s.ry ?? 0, s.rz ?? 0, 'YXZ');
    _pq.setFromEuler(_pe);
    const k = s.scale ?? 1;
    _ps.set(k, k, k);
    _pm.compose(_pv, _pq, _ps);
    this.mesh.setMatrixAt(i, _pm);
    this.frameMesh?.setMatrixAt(i, _pm);
    if (s.color !== undefined) {
      _pc.setHex(s.color);
      if (s.glow) _pc.lerp(_white, Math.min(1, s.glow) * 0.5);
      this.mesh.setColorAt(i, _pc);
    }
  }

  commit() {
    if (!this.mesh) return;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    if (this.frameMesh) this.frameMesh.instanceMatrix.needsUpdate = true;
  }

  /** Je Bild fn(d) (d = Darstellungs-Schritt, folgt der Simulation) aufrufen und danach übernehmen. */
  render(fn) {
    if (!this.mesh) return;
    const holder = {};
    fn(0);
    this.commit();
    // Hüllkugel aus der Grundlage + Spielraum (Kippen/Ausklappen) – Sichtprüfung statt immer zeichnen
    const pad = Math.max(...this.size) + 0.5;
    cullSphere(this.mesh, null, 0, pad);
    if (this.frameMesh) { this.frameMesh.boundingSphere = this.mesh.boundingSphere; this.frameMesh.frustumCulled = true; }
    this.level.view.onFrame((dt) => { fn(visDt(this.level, holder, dt)); this.commit(); });
  }
}

/**
 * Sichtprüfung für Instanz-Gruppen: feste Hüllkugel (Weltkoordinaten; die Gruppe selbst steht im Ursprung) über alle Lagen,
 * die ihre Exemplare einnehmen können – so zeichnet die Gruppe nur, wenn ihr Bereich im Bild ist. Ohne center/radius: aus den
 * aktuellen Exemplaren + pad.
 */
export function cullSphere(mesh, center = null, radius = 0, pad = 0) {
  if (!mesh) return;
  if (center) mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(center.x, center.y, center.z), radius + pad);
  else { mesh.computeBoundingSphere(); if (mesh.boundingSphere) mesh.boundingSphere.radius += pad; }
  mesh.frustumCulled = true;
}

// ------------------------------------------------------------------ Registry-Modelle (Modelle Bonuswelten)

/** Registry-Modell verwenden? (vorhanden und nicht spec.look === 'eigen') */
export const useModel = (spec, name) => spec?.look !== 'eigen' && hasModel(name);

/** Plattenfarbe für die Stern-Modelle: benannte Modellfarbe (PANEL) oder Hex. */
const PANEL_NAMES = new Set(['blau', 'rot', 'gelb', 'gruen', 'lila', 'weiss', 'gold', 'tuerkis']);
export const modelColor = (c, d) => (typeof c === 'string' && PANEL_NAMES.has(c) ? c : plateColor(c, d));

/** Hüllkugel (Weltkoordinaten) über Punkte [{ x, y, z }] + pad → { center, radius } */
export function sphereOf(pts, pad = 0) {
  if (!pts.length) return { center: { x: 0, y: 0, z: 0 }, radius: pad };
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y), zs = pts.map((p) => p.z);
  const c = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2, z: (Math.min(...zs) + Math.max(...zs)) / 2 };
  let r = 0;
  for (const p of pts) r = Math.max(r, Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z));
  return { center: c, radius: r + pad };
}

/**
 * Instanz-Variante eines Stern-Modells (createInstanced aus models/lib/instanced_star.js: drehplatte, farbplatte, wabe,
 * retro_block) ins Level setzen. Das Modell schaltet die Sichtprüfung ab; hier bekommt jede Gruppe eine feste Hüllkugel
 * (sphere = { center, radius }), damit sie nur im Bild zeichnet. update läuft je Bild mit der Darstellungs-Zeit.
 */
export function instancedModel(level, name, n, opts, sphere = null) {
  const api = createInstanced(name, Math.max(1, n), opts);
  const holder = {};
  addObject(level, api.root, (dt) => api.update(visDt(level, holder, dt)));
  if (sphere) for (const m of api.meshes) cullSphere(m, sphere.center, sphere.radius);
  return api;
}

const _mq = new THREE.Quaternion(), _mq2 = new THREE.Quaternion(), _mv = new THREE.Vector3(), _mv2 = new THREE.Vector3(), _ms = new THREE.Vector3(), _ms2 = new THREE.Vector3();
const _mm = new THREE.Matrix4(), _mm2 = new THREE.Matrix4(), _mzero = new THREE.Matrix4().makeScale(0, 0, 0), _myaw = new THREE.Vector3(0, 1, 0);

/**
 * Instanz-Gruppe aus einem Registry-Modell (für Modelle ohne eigene Instanz-Variante): jedes Mesh des Modells wird ein
 * InstancedMesh (gleiche Geometrie, gleiches Material) – n Exemplare kosten so viele Zeichenaufrufe wie ein Modell. Lagen
 * der Teile werden je Schlüssel-Zustand (keys, z. B. [{ out: 0 }, { out: 1 }]) einmal gemessen; set(i, …, k) mischt
 * zwischen den Schlüsseln (k = 0 … keys.length − 1, Bruchteile erlaubt). Eigene Animationen des Modells (Blinken, Rauch,
 * Funken – innere Instanz-Meshes, Sprites) entfallen. o.skip(mesh) lässt Teile weg; o.shadow false wirft keinen Schatten.
 */
export class ModelSet {
  constructor(level, name, opts, n, keys = ['idle'], o = {}) {
    this.level = level;
    this.n = Math.max(1, n);
    this.meshes = [];
    this.parts = [];
    if (!level.view || !hasModel(name)) return;
    const m = getModel(name, opts ?? {});
    this.model = m;
    const list = [];
    m.root.traverse((ob) => { if (ob.isMesh && !ob.isInstancedMesh && !(o.skip && o.skip(ob))) list.push(ob); });
    this.keys = keys.map((s) => {
      m.update?.(0, s ?? 'idle'); m.update?.(0.5, s ?? 'idle');
      m.root.updateMatrixWorld(true);
      const inv = m.root.matrixWorld.clone().invert();
      return list.map((ob) => {
        const rel = inv.clone().multiply(ob.matrixWorld);
        const p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
        rel.decompose(p, q, sc);
        let vis = ob.visible;
        for (let a = ob.parent; a && a !== m.root; a = a.parent) vis = vis && a.visible;
        return { p, q, s: sc, vis };
      });
    });
    for (const ob of list) {
      const im = new THREE.InstancedMesh(ob.geometry, ob.material, this.n);
      im.name = `${name}:${ob.name || 'teil'}`;
      im.castShadow = o.shadow === false ? false : ob.castShadow;
      im.receiveShadow = ob.receiveShadow;
      im.renderOrder = ob.renderOrder;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      for (let i = 0; i < this.n; i++) im.setMatrixAt(i, _mzero);
      im.frustumCulled = false;
      addObject(level, im);
      this.meshes.push(im);
    }
  }

  /** Exemplar i: Ursprung (x, y, z) wie das Modell, Gier yaw, Schlüssel k (Mischung), scale (Zahl oder [sx, sy, sz]). */
  set(i, x, y, z, yaw = 0, k = 0, scale = 1, o = null) {
    if (!this.meshes.length) return;
    const nk = this.keys.length - 1;
    k = clamp(k, 0, nk);
    const k0 = Math.floor(k), k1 = Math.min(nk, k0 + 1), f = k - k0;
    _mq.setFromAxisAngle(_myaw, yaw);
    if (o?.quat) _mq.multiply(o.quat);
    if (Array.isArray(scale)) _ms.set(scale[0], scale[1], scale[2]); else _ms.setScalar(scale);
    _mm.compose(_mv.set(x, y, z), _mq, _ms);
    const A = this.keys[k0], B = this.keys[k1];
    for (let j = 0; j < this.meshes.length; j++) {
      const a = A[j], b = B[j];
      const vis = f < 0.5 ? a.vis : b.vis;
      if (!vis) { this.meshes[j].setMatrixAt(i, _mzero); continue; }
      _mv2.copy(a.p).lerp(b.p, f);
      _mq2.copy(a.q).slerp(b.q, f);
      _ms2.copy(a.s).lerp(b.s, f);
      _mm2.compose(_mv2, _mq2, _ms2);
      this.meshes[j].setMatrixAt(i, _mm2.premultiply(_mm));
    }
  }

  hide(i) { for (const im of this.meshes) im.setMatrixAt(i, _mzero); }

  /** Nur die ersten n Exemplare zeichnen (verborgene ans Ende packen spart Dreiecke – auch unsichtbare zählen sonst mit). */
  setCount(n) { for (const im of this.meshes) im.count = Math.max(0, Math.min(this.n, n)); }

  commit() { for (const im of this.meshes) im.instanceMatrix.needsUpdate = true; }

  /** Feste Hüllkugel (Weltkoordinaten) für alle Teile – sonst zeichnet die Gruppe immer. */
  cull(center, radius) { for (const im of this.meshes) cullSphere(im, center, radius); }

  get ok() { return this.meshes.length > 0; }
}

const _bm = new THREE.Matrix4(), _bi = new THREE.Matrix4(), _bc = new THREE.Color();
/**
 * Ein Registry-Modell (oder irgendein Objekt) mit seiner aktuellen Lage (root.position/rotation/scale, auch geneigt) in die
 * statische Geometrie backen – wie bakeW8, aber mit beliebiger Drehung: undurchsichtige Teile ins Welt-Material
 * (Vertexfarben), MeshBasicMaterial ins Glüh-Material; durchsichtige und texturierte Teile entfallen. m = { root, update?,
 * dispose? } (wird danach freigegeben). → Dreiecke
 */
export function bakeRoot(level, m, state = null, o = {}) {
  if (!level.view) { m.dispose?.(); return 0; }
  if (state) m.update?.(0, state);
  const root = m.root;
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
      for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) arr[i * 3 + k] = old ? old[i * 3 + k] * tint[k] : Math.min(1, tint[k] + em[k] * 0.5);
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      g.applyMatrix4(M);
      tris += n / 3;
      parts[kind].push(g);
    }
  });
  m.dispose?.();
  const cast = o.castShadow !== false;
  for (const g of parts.world) level.view.addStatic(g, { material: 'world', castShadow: cast });
  for (const g of parts.glow) level.view.addStatic(g, { material: 'glow', castShadow: false });
  return tris;
}

/** Steht eine Figur (am Boden) auf einer Form mit diesem owner? → Figur | null */
export function standerOn(level, owner) {
  for (const f of figures(level)) if (f.mode === 'ground' && f.ground?.owner === owner) return f;
  return null;
}

/** Steckt eine Figur im Quader { x0, x1, y0, y1, z0, z1 }? (vor dem Wieder-fest-Werden einer Form) */
export function figureInside(level, b, pad = 0.02) {
  for (const f of figures(level)) {
    const h = f.half, p = f.pos;
    if (p.x + h.x > b.x0 + pad && p.x - h.x < b.x1 - pad && p.z + h.z > b.z0 + pad && p.z - h.z < b.z1 - pad && p.y + h.y * 2 > b.y0 + pad && p.y < b.y1 - pad) return f;
  }
  return null;
}
