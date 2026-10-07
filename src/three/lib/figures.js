// Gemeinsame Helfer für Figuren-Avatare (Heldinnen, Pflaume): modulweiter Material- und
// Geometrie-Cache, Kapsel-Gliedmaßen mit Drehpunkt, vertexgefärbte Sammel-Meshes (Augen, Gesicht –
// spart Zeichenaufrufe), weiche Blickrichtung mit leichter Drehung zur Kamera und eine
// Posen-Überblendung (Zielposen werden beim Zustandswechsel weich ineinander übergeführt).
//
// Alles hier ist bewusst unabhängig von Phaser – reine Three.js-Bausteine.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const TAU = Math.PI * 2;
export const damp = (c, t, rate, dt) => c + (t - c) * (1 - Math.exp(-rate * dt));
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const smoothstep = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
export const lerp = (a, b, t) => a + (b - a) * t;

// ------------------------------------------------------------------ Material-Cache
const MATS = new Map();

/** Geteiltes MeshStandardMaterial (modulweit, lebt so lange wie die Seite). */
export function mat(key, props = {}) {
  let m = MATS.get(key);
  if (!m) { m = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0, ...props }); MATS.set(key, m); }
  return m;
}

/** Geteiltes unbeleuchtetes Material (Glanzpunkte, Schnüre). */
export function basicMat(key, props = {}) {
  const k = `basic:${key}`;
  let m = MATS.get(k);
  if (!m) { m = new THREE.MeshBasicMaterial(props); MATS.set(k, m); }
  return m;
}

export function lineMat(key, props = {}) {
  const k = `line:${key}`;
  let m = MATS.get(k);
  if (!m) { m = new THREE.LineBasicMaterial(props); MATS.set(k, m); }
  return m;
}

// ------------------------------------------------------------------ Geometrie-Cache
const GEOS = new Map();

/** Geteilte Geometrie unter einem Schlüssel (wird einmal gebaut). */
export function geo(key, make) {
  let g = GEOS.get(key);
  if (!g) { g = make(); GEOS.set(key, g); }
  return g;
}
export const sphere = (r, ws = 16, hs = 12) => geo(`sph:${r}:${ws}:${hs}`, () => new THREE.SphereGeometry(r, ws, hs));
export const capsule = (r, len, cs = 4, rs = 8) => geo(`cap:${r}:${len}:${cs}:${rs}`, () => new THREE.CapsuleGeometry(r, len, cs, rs));
export const cylinder = (rt, rb, h, rs = 10) => geo(`cyl:${rt}:${rb}:${h}:${rs}`, () => new THREE.CylinderGeometry(rt, rb, h, rs));
export const cone = (r, h, rs = 10) => geo(`cone:${r}:${h}:${rs}`, () => new THREE.ConeGeometry(r, h, rs));
export const torus = (r, tube, rs = 8, ts = 16, arc = TAU) => geo(`tor:${r}:${tube}:${rs}:${ts}:${arc}`, () => new THREE.TorusGeometry(r, tube, rs, ts, arc));
export const unitSphere = () => sphere(1, 16, 12);

/** Mesh mit Lage, Skalierung, Drehung und Schattenwurf in einem Aufruf. */
export function mesh(g, m, o = {}) {
  const me = new THREE.Mesh(g, m);
  me.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0);
  me.scale.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1);
  me.rotation.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
  me.castShadow = !!o.shadow;
  return me;
}

/**
 * Gliedmaße: Gruppe als Gelenk, Kapsel hängt vom Drehpunkt nach -Y (Mitte der oberen Kugel liegt im
 * Drehpunkt, das untere Gelenk liegt bei y = -len). Liefert die Gruppe; die Kapsel ist `group.limbMesh`.
 */
export function limb(r, len, material, shadow = true) {
  const pivot = new THREE.Group();
  const me = mesh(capsule(r, len), material, { y: -len / 2, shadow });
  pivot.add(me);
  pivot.limbMesh = me;
  return pivot;
}

// ------------------------------------------------------------------ Transformationen
const _up = new THREE.Vector3(0, 1, 0);
const _side = new THREE.Vector3(1, 0, 0);
const _zero = new THREE.Vector3();
const _rot = new THREE.Matrix4();
const _q = new THREE.Quaternion();

/** Matrix: Einheitskugel → Ellipsoid `scale` (x quer, y hoch, z entlang `dir`) mit Mittelpunkt `center`. */
export function placed(center, dir, scale) {
  const d = dir.clone().normalize();
  const up = Math.abs(d.y) > 0.95 ? _side : _up;
  _rot.lookAt(d, _zero, up); // lokale +Z zeigt entlang d
  _q.setFromRotationMatrix(_rot);
  return new THREE.Matrix4().compose(center, _q, scale);
}

/** Richtung aus Azimut (um Y, 0 = +X, positiv → +Z) und Elevation. */
export const dirAE = (az, el) => new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));

// ------------------------------------------------------------------ Vertexfarben
/** Kopie der Geometrie mit konstanter Vertexfarbe (optional transformiert). */
export function tinted(g, color, matrix) {
  const c = new THREE.Color(color);
  const out = g.clone();
  if (matrix) out.applyMatrix4(matrix);
  const n = out.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  out.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return out;
}

/** Mehrere [geometrie, farbe, matrix] zu einem vertexgefärbten Mesh-Körper verschmelzen. */
export function mergeTinted(parts) {
  const gs = parts.map(([g, c, m]) => tinted(g, c, m));
  const merged = mergeGeometries(gs, false);
  for (const g of gs) g.dispose();
  return merged;
}

/** Mehrere [geometrie, matrix] (gleiches Material) verschmelzen. */
export function mergePlain(parts) {
  const gs = parts.map(([g, m]) => { const c = g.clone(); if (m) c.applyMatrix4(m); return c; });
  const merged = mergeGeometries(gs, false);
  for (const g of gs) g.dispose();
  return merged;
}

/** Material für vertexgefärbte Sammel-Meshes (Augen, Gesicht). */
export const vcolMat = (roughness = 0.35, side = THREE.FrontSide) => mat(`vcol:${roughness}:${side}`, { vertexColors: true, roughness, side });

/**
 * Augenpaar als zwei Meshes: [Weiß+Iris+Pupille vertexgefärbt, Glanzpunkte unbeleuchtet].
 * o: { center (Kopfmitte), r (Kopfradius), az, el (Lage auf dem Kopf), look (Iris Richtung Blick),
 *      white, iris, pupil, hl (Radien), irisColor, pupilColor }
 * Beide Meshes haben ihren Ursprung in der Kopfmitte auf Augenhöhe (für Blinzeln per scale.y).
 */
export function buildEyes(o) {
  const parts = [], hls = [];
  const c = o.center;
  for (const s of [1, -1]) {
    const dW = dirAE(o.az * s, o.el);
    const dI = dirAE((o.az - o.look) * s, o.el - 0.04);
    const dP = dirAE((o.az - o.look * 1.1) * s, o.el - 0.05);
    parts.push([unitSphere(), '#ffffff', placed(c.clone().addScaledVector(dW, o.r - o.white * 0.25), dW, new THREE.Vector3(o.white, o.white * 1.15, o.white * 0.55))]);
    parts.push([unitSphere(), o.irisColor, placed(c.clone().addScaledVector(dI, o.r + o.white * 0.22), dI, new THREE.Vector3(o.iris, o.iris * 1.08, o.iris * 0.4))]);
    parts.push([unitSphere(), o.pupilColor ?? '#1b1222', placed(c.clone().addScaledVector(dP, o.r + o.white * 0.36), dP, new THREE.Vector3(o.pupil, o.pupil * 1.05, o.pupil * 0.4))]);
    const hc = c.clone().addScaledVector(dP, o.r + o.white * 0.5).add(new THREE.Vector3(0.006, o.pupil * 0.55, 0.004 * s));
    hls.push([unitSphere(), new THREE.Matrix4().compose(hc, new THREE.Quaternion(), new THREE.Vector3(o.hl, o.hl, o.hl * 0.5))]);
  }
  // Ursprung auf Augenhöhe legen, damit scale.y (Blinzeln) um die Augenmitte wirkt
  const eyeY = c.y + Math.sin(o.el) * o.r;
  const shift = new THREE.Matrix4().makeTranslation(0, -eyeY, 0);
  const eyesGeo = mergeTinted(parts); eyesGeo.applyMatrix4(shift);
  const hlGeo = mergePlain(hls); hlGeo.applyMatrix4(shift);
  const eyes = new THREE.Mesh(eyesGeo, vcolMat(0.25));
  const hl = new THREE.Mesh(hlGeo, basicMat('white', { color: 0xffffff }));
  eyes.position.y = eyeY; hl.position.y = eyeY;
  return { eyes, hl, eyeY };
}

// ------------------------------------------------------------------ Blickrichtung
/**
 * Eigene Blickrichtung: Figur dreht sich beim Umdrehen durch die Vorderseite (Gesicht zur Kamera) und
 * steht sonst leicht zur Kamera gedreht (bias), damit beide Augen sichtbar sind (3/4-Ansicht wie im
 * Vorbild). Modelle blicken nach +X; die Kamera steht bei +Z.
 */
export class Facing {
  constructor(bias = 0.42, rate = 11) {
    this.bias = bias; this.rate = rate; this.yaw = null;
  }
  target(facing) { return facing < 0 ? -Math.PI + this.bias : -this.bias; }
  update(dt, facing) {
    const want = this.target(facing);
    if (this.yaw === null) this.yaw = want;
    else this.yaw = damp(this.yaw, want, this.rate, dt);
    return this.yaw;
  }
}

// ------------------------------------------------------------------ Posen
/**
 * Überblendet Zielposen: Beim Zustandswechsel wird die aktuelle Pose eingefroren und über `dur`
 * Sekunden weich (smoothstep) auf die lebende Zielpose geführt. Innerhalb eines Zustands folgt
 * die Ausgabe der Zielpose exakt (Laufzyklen bleiben knackig).
 */
export class PoseBlender {
  constructor(defaults, dur = 0.18) {
    this.defaults = defaults;
    this.keys = Object.keys(defaults);
    this.cur = { ...defaults };
    this.from = { ...defaults };
    this.t = 1; this.dur = dur; this.state = null;
  }
  /** Neue Zielpose mit Standardwerten. */
  pose(o = {}) { return { ...this.defaults, ...o }; }
  update(state, live, dt, dur = this.dur) {
    if (state !== this.state) { this.state = state; this.from = { ...this.cur }; this.t = 0; this.dur = dur; }
    this.t += dt;
    const k = smoothstep(this.t / this.dur);
    const cur = this.cur, from = this.from;
    for (const key of this.keys) cur[key] = from[key] + (live[key] - from[key]) * k;
    return cur;
  }
}

/** Blinzel-Steuerung: liefert einen Skalierungsfaktor für die Augen (1 offen, ~0.08 zu). */
export class Blinker {
  constructor(seed = Math.random()) { this.timer = 1.5 + seed * 3; this.phase = 0; }
  update(dt, allowed = true) {
    if (this.phase > 0) {
      this.phase -= dt;
      const p = this.phase / 0.14;
      return p > 0.5 ? lerp(0.08, 1, (p - 0.5) * 2) : lerp(1, 0.08, p * 2);
    }
    this.timer -= dt;
    if (this.timer <= 0 && allowed) { this.phase = 0.14; this.timer = 2 + Math.random() * 3.5; }
    return 1;
  }
}
