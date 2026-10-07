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

// ------------------------------------------------------------------ Vertexfarben (gemischt)
/**
 * Wie mergeTinted, aber Teile mit `color === null` behalten ihre eigene Vertexfarbe (z. B. prozedural
 * schattierte Flächen). Alle Teile brauchen position/normal/uv (und bei null bereits `color`).
 */
export function mergeColored(parts) {
  const gs = parts.map(([g, c, m]) => {
    if (c !== null && c !== undefined) return tinted(g, c, m);
    const out = g.clone();
    if (m) out.applyMatrix4(m);
    return out;
  });
  const merged = mergeGeometries(gs, false);
  for (const g of gs) g.dispose();
  return merged;
}

// ------------------------------------------------------------------ Hängende Ketten (Zöpfe, Bänder)
const _ca = new THREE.Vector3(), _cr = new THREE.Vector3(), _cv = new THREE.Vector3();
const _cacc = new THREE.Vector3(), _cd = new THREE.Vector3(), _ct = new THREE.Vector3();
const _cq = new THREE.Quaternion();

/**
 * Verlet-Kette in Weltkoordinaten für hängende, nachschwingende Teile (Zöpfe, Bänder, Schnüre).
 * Die Partikel sind die Gliederenden; die Aufhängung (anchor) wird je Bild von außen gesetzt und
 * zwischen zwei Bildern linear interpoliert. Fester Zeitschritt (stabil, bildratenunabhängig),
 * Schwerkraft, quadratischer Luftwiderstand (Wehen bei Tempo, Hochfliegen beim Fallen – die
 * Partikelgeschwindigkeit enthält die Bewegung der Figur, also wirkt die Trägheit von selbst),
 * lineare Dämpfung (Ausschwingen), Feder zur Ruhelage (Steifigkeit am Ansatz) und Kugel-Kollider
 * (Kopf, Schultern). Springt die Aufhängung weit (Teleport), wird die Kette ruhend neu abgelegt.
 *
 *   chain.rest[i]   Ruherichtung je Glied (Welt, normiert) – vor update() setzen
 *   chain.dirs[i]   Ist-Richtung je Glied nach update() (Welt, normiert)
 *   chain.frame     Weltdrehung der Aufhängung (Quaternion) – vor update() setzen, wenn rootCone genutzt wird
 *   chain.rootCone  Grenzwinkel (rad, von „unten“ aus) für das erste Glied im Aufhängungs-System
 *                   { back, front, out, inward, zSign } (x vor, y hoch, z·zSign außen): verhindert, dass ein
 *                   Zopf über den Kopf klappt oder ins Gesicht schwingt
 *   chain.maxBend   größter Knickwinkel (rad) zwischen aufeinanderfolgenden Gliedern (Steifigkeit des Strangs)
 *   chain.addCollider(r, from) → { c: Vector3, r, from } – c je Bild auf die Weltposition setzen;
 *                   `from` = erstes Glied, für das der Kollider gilt (Standard 0)
 */
export class HangChain {
  /**
   * @param {number[]} lengths Gliedlängen (Einheiten)
   * @param {{gravity?:number, drag?:number, damping?:number, stiffness?:number, step?:number, maxSteps?:number,
   *          maxBend?:number, straighten?:number, rootCone?:{back:number,front:number,out:number,inward:number,zSign?:number}}} o
   */
  constructor(lengths, o = {}) {
    this.lengths = lengths.slice();
    this.n = lengths.length;
    this.gravity = o.gravity ?? 32;      // Einheiten/s²
    this.drag = o.drag ?? 0.3;           // 1/Einheit – quadratischer Luftwiderstand
    this.damping = o.damping ?? 2.5;     // 1/s – lineare Dämpfung
    this.stiffness = o.stiffness ?? 40;  // 1/s² – Feder zur Ruhelage
    this.step = o.step ?? 1 / 120;
    this.maxSteps = o.maxSteps ?? 8;
    this.maxBend = o.maxBend ?? 0;       // 0 = unbegrenzt
    this.straighten = o.straighten ?? 0; // 1/s² – Feder, die jedes Glied in die Richtung des vorigen zieht (Biegesteifigkeit)
    this.rootCone = o.rootCone ? { zSign: 1, ...o.rootCone } : null;
    this.frame = new THREE.Quaternion();
    this.pos = lengths.map(() => new THREE.Vector3());
    this.prev = lengths.map(() => new THREE.Vector3());
    this.dirs = lengths.map(() => new THREE.Vector3(0, -1, 0));
    this.rest = lengths.map(() => new THREE.Vector3(0, -1, 0));
    this.colliders = [];
    this.anchor = new THREE.Vector3(); this.prevAnchor = new THREE.Vector3();
    this.acc = 0; this.started = false;
  }

  addCollider(r, from = 0) { const col = { c: new THREE.Vector3(), r, from }; this.colliders.push(col); return col; }

  /** Kette ruhend entlang der Ruherichtungen von der Aufhängung aus ablegen. */
  reset(anchor) {
    this.anchor.copy(anchor); this.prevAnchor.copy(anchor);
    let p = anchor;
    for (let i = 0; i < this.n; i++) {
      this.pos[i].copy(p).addScaledVector(this.rest[i], this.lengths[i]);
      this.prev[i].copy(this.pos[i]);
      this.dirs[i].copy(this.rest[i]);
      p = this.pos[i];
    }
    this.acc = 0; this.started = true; this.resets = (this.resets ?? 0) + 1;
  }

  /** Einen Bildschritt rechnen; anchor = Weltposition der Aufhängung, dt in Sekunden. */
  update(anchor, dt) {
    if (!this.started || anchor.distanceToSquared(this.prevAnchor) > 9) { this.reset(anchor); return; } // Sprung > 3 Einheiten = Teleport
    this.anchor.copy(anchor);
    this.acc += Math.max(0, dt);
    let steps = Math.floor(this.acc / this.step);
    if (steps > this.maxSteps) { steps = this.maxSteps; this.acc = 0; } else this.acc -= steps * this.step;
    for (let s = 1; s <= steps; s++) {
      _ca.lerpVectors(this.prevAnchor, anchor, s / steps);
      this.substep(_ca, this.step);
    }
    this.prevAnchor.copy(anchor);
    let p = anchor;
    for (let i = 0; i < this.n; i++) {
      _cd.subVectors(this.pos[i], p);
      if (_cd.lengthSq() > 1e-12) this.dirs[i].copy(_cd).normalize();
      p = this.pos[i];
    }
  }

  substep(anchor, h) {
    const keep = Math.max(0, 1 - this.damping * h);
    // Kräfte und Verlet-Schritt (Ruhelage des Glieds i = Aufhängung + Summe der Ruhevektoren bis i)
    _cr.copy(anchor);
    for (let i = 0; i < this.n; i++) {
      const p = this.pos[i], q = this.prev[i];
      _cr.addScaledVector(this.rest[i], this.lengths[i]);
      _cv.subVectors(p, q).divideScalar(h);
      _cacc.set(0, -this.gravity, 0);
      _cd.subVectors(_cr, p); _cacc.addScaledVector(_cd, this.stiffness);
      if (i > 0 && this.straighten > 0) {
        // gestreckte Lage: Ende des vorigen Glieds + dessen aktuelle Richtung · eigene Länge
        _ct.subVectors(this.pos[i - 1], i === 1 ? anchor : this.pos[i - 2]).normalize();
        _cd.copy(this.pos[i - 1]).addScaledVector(_ct, this.lengths[i]).sub(p);
        _cacc.addScaledVector(_cd, this.straighten);
      }
      _cacc.addScaledVector(_cv, -this.drag * _cv.length());
      _ct.copy(p);
      p.addScaledVector(_cv, keep * h).addScaledVector(_cacc, h * h);
      q.copy(_ct);
    }
    // Abstandsbedingungen von der Aufhängung aus (Richtung begrenzt: Wurzelkegel, Knickwinkel),
    // dazwischen Kollider; zwei Durchgänge
    const cosBend = this.maxBend > 0 ? Math.cos(this.maxBend) : -2;
    for (let it = 0; it < 2; it++) {
      let parent = anchor;
      for (let i = 0; i < this.n; i++) {
        const p = this.pos[i];
        _cd.subVectors(p, parent);
        const len = _cd.length();
        if (len < 1e-6) _cd.copy(this.rest[i]); else _cd.divideScalar(len);
        if (i === 0 && this.rootCone) this.limitRoot(_cd);
        else if (i > 0 && cosBend > -1) {
          // Knick zum vorigen Glied begrenzen: Richtung auf den Kegel um die Elternrichtung ziehen
          _ct.subVectors(parent, i === 1 ? anchor : this.pos[i - 2]).normalize();
          const c = _cd.dot(_ct);
          if (c < cosBend) {
            _cv.copy(_cd).addScaledVector(_ct, -c);          // Anteil quer zur Elternrichtung
            const q = _cv.length();
            if (q > 1e-6) _cd.copy(_ct).multiplyScalar(cosBend).addScaledVector(_cv, Math.sqrt(1 - cosBend * cosBend) / q);
            else _cd.copy(_ct);
          }
        }
        p.copy(parent).addScaledVector(_cd, this.lengths[i]);
        for (const col of this.colliders) {
          if (i < (col.from ?? 0)) continue;
          _cd.subVectors(p, col.c);
          const d2 = _cd.lengthSq();
          if (d2 < col.r * col.r && d2 > 1e-12) p.copy(col.c).addScaledVector(_cd, col.r / Math.sqrt(d2));
        }
        parent = p;
      }
    }
  }

  /**
   * Richtung des ersten Glieds (Welt, normiert) auf den Kegel im Aufhängungs-System begrenzen: Der größte
   * Auslenkwinkel θmax von „unten“ hängt glatt vom Azimut ab (elliptische Mischung der vier Grenzen hinten/
   * vorn/außen/innen) – eine sternförmige, eckenlose Grenzfläche, auf der ein Glied frei entlanggleitet
   * (eine Box mit Ecken ließe es an einer Kante hängen bleiben). Senkrecht nach oben weicht es nach hinten aus.
   */
  limitRoot(d) {
    const c = this.rootCone;
    _cq.copy(this.frame).invert();
    d.applyQuaternion(_cq);
    const x = d.x, z = d.z * c.zSign; // z > 0 = außen
    const horiz = Math.hypot(x, z);
    let cosPhi = -1, sinPhi = 0;      // Azimut: 0 = vorn, π = hinten, +π/2 = außen
    if (horiz > 1e-6) { cosPhi = x / horiz; sinPhi = z / horiz; }
    const theta = Math.atan2(horiz, -d.y); // 0 = unten, π = oben
    const tx = cosPhi > 0 ? c.front : c.back, tz = sinPhi > 0 ? c.out : c.inward;
    const thetaMax = 1 / Math.sqrt((cosPhi * cosPhi) / (tx * tx) + (sinPhi * sinPhi) / (tz * tz));
    if (theta > thetaMax) {
      const s = Math.sin(thetaMax);
      d.set(s * cosPhi, -Math.cos(thetaMax), s * sinPhi * c.zSign);
    }
    d.applyQuaternion(this.frame);
  }
}
