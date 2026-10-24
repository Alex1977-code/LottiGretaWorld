// Gemeinsame Helfer für Figuren-Avatare (Heldinnen, Pflaume): modulweiter Material- und
// Geometrie-Cache, Kapsel-Gliedmaßen mit Drehpunkt, vertexgefärbte Sammel-Meshes (Augen, Gesicht –
// spart Zeichenaufrufe), weiche Blickrichtung mit leichter Drehung zur Kamera und eine
// Posen-Überblendung (Zielposen werden beim Zustandswechsel weich ineinander übergeführt).
//
// Alles hier ist bewusst unabhängig von Phaser – reine Three.js-Bausteine.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { applyToyLook } from './toyLook.js';

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
  if (!m) { m = applyToyLook(new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0, ...props })); MATS.set(key, m); }
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
    this.iterations = o.iterations ?? 2;  // Durchgänge der Abstands-/Knick-/Kollider-Bedingungen je Teilschritt
    this.strictBend = !!o.strictBend;     // Schlussdurchgang ohne Kollider (Knick bleibt sicher begrenzt)
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
    for (let it = 0; it < this.iterations; it++) {
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
    // strictBend: danach noch einmal Länge/Knick/Kegel ohne Kollider – ein Kollider-Stoß darf den Strang nicht über den
    // Knickwinkel hinaus abknicken (der Kollider wirkt im nächsten Teilschritt wieder)
    if (this.strictBend) this.relax(anchor, cosBend);
  }

  /** Länge, Wurzelkegel und Knickwinkel ohne Kollider herstellen (Schlussdurchgang für strictBend). */
  relax(anchor, cosBend) {
    let parent = anchor;
    for (let i = 0; i < this.n; i++) {
      const p = this.pos[i];
      _cd.subVectors(p, parent);
      const len = _cd.length();
      if (len < 1e-6) _cd.copy(this.rest[i]); else _cd.divideScalar(len);
      if (i === 0 && this.rootCone) this.limitRoot(_cd);
      else if (i > 0 && cosBend > -1) {
        _ct.subVectors(parent, i === 1 ? anchor : this.pos[i - 2]).normalize();
        const c = _cd.dot(_ct);
        if (c < cosBend) {
          _cv.copy(_cd).addScaledVector(_ct, -c);
          const q = _cv.length();
          if (q > 1e-6) _cd.copy(_ct).multiplyScalar(cosBend).addScaledVector(_cv, Math.sqrt(1 - cosBend * cosBend) / q);
          else _cd.copy(_ct);
        }
      }
      p.copy(parent).addScaledVector(_cd, this.lengths[i]);
      parent = p;
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

// ------------------------------------------------------------------ Spielzeug-Formen (Figurenstil „3D World“)
// Glatte, vertexgefärbte Flächen aus Parametern: Gitter mit weichen Normalen (Naht- und Polfrei), Kopfform mit
// Aufklebern (Augen, Mund, Wangen, Brauen folgen der Kopfoberfläche), Haarschale mit gerolltem Rand (sauberer
// Haaransatz statt Durchdringung zweier Kugeln). Alle Geometrien haben position/normal/uv/color (bündelbar).
const _g0 = new THREE.Vector3(), _g1 = new THREE.Vector3(), _g2 = new THREE.Vector3(), _g3 = new THREE.Vector3();
const _gc = new THREE.Color();

/**
 * Indiziertes Gitter aus point(u, v, out) (u ∈ [0, 1), v ∈ [0, 1]); wrapU schließt in u (keine Naht), Zeilen, deren Punkte
 * alle zusammenfallen (Pole), werden zu einem Punkt (keine Pol-Sterne in der Schattierung). color(u, v, p) → Color/Hex.
 * flip kehrt die Umlaufrichtung (Normalen) um. Normalen aus den Flächen (computeVertexNormals).
 */
export function gridGeo({ nu, nv, wrapU = true, point, color, flip = false }) {
  const cols = wrapU ? nu : nu + 1;
  const pos = [], col = [], uv = [], idx = [];
  const rows = [];
  for (let i = 0; i <= nv; i++) {
    const v = i / nv, pts = [];
    for (let j = 0; j < cols; j++) pts.push(point(j / nu, v, new THREE.Vector3()));
    let pole = true;
    for (const p of pts) if (p.distanceToSquared(pts[0]) > 1e-12) { pole = false; break; }
    const ids = [];
    const add = (p, u) => {
      ids.push(pos.length / 3);
      pos.push(p.x, p.y, p.z); uv.push(u, v);
      const c = color ? color(u, v, p) : 0xffffff;
      if (c && c.isColor) _gc.copy(c); else _gc.set(c);
      col.push(_gc.r, _gc.g, _gc.b);
    };
    if (pole) { add(pts[0], 0.5); for (let j = 1; j < cols; j++) ids.push(ids[0]); } else pts.forEach((p, j) => add(p, j / nu));
    rows.push(ids);
  }
  const quads = wrapU ? cols : cols - 1;
  for (let i = 0; i < nv; i++) {
    const r0 = rows[i], r1 = rows[i + 1];
    for (let j = 0; j < quads; j++) {
      const j1 = (j + 1) % cols;
      const a = r0[j], b = r0[j1], c = r1[j], d = r1[j1];
      const tri = (x, y, z) => { if (x === y || y === z || x === z) return; if (flip) idx.push(x, z, y); else idx.push(x, y, z); };
      tri(a, c, b); tri(b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * Drehkörper mit weichen Normalen ohne Naht: prof = [[r, y], …] von unten nach oben (sonst flip), Querschnitt-Ellipse
 * (sx entlang x, sz entlang z), radius(phi, y, r) moduliert (Falten, Rüschen); phi = 0 zeigt nach +X, π/2 nach +Z.
 * Profil wird per Catmull-Rom auf `steps` Punkte verfeinert, wenn smooth.
 */
export function latheGeo(prof, { segs = 32, sx = 1, sz = 1, radius = null, color = null, smooth = true, steps = 0, flip = false } = {}) {
  const pts = smooth ? smoothProfile2(prof, steps || prof.length * 4) : prof;
  return gridGeo({
    nu: segs, nv: pts.length - 1, wrapU: true, flip,
    point: (u, v, out) => {
      const k = Math.round(v * (pts.length - 1));
      const [r0, y] = pts[k], phi = u * TAU;
      const r = radius ? radius(phi, y, r0, k) : r0;
      return out.set(Math.cos(phi) * r * sx, y, Math.sin(phi) * r * sz);
    },
    color: color ? (u, v, p) => color(u * TAU, p.y, p, Math.round(v * (pts.length - 1))) : null,
  });
}

/** Profilpunkte [[r, y], …] per Catmull-Rom (zentripetal) auf n Punkte verfeinern (Endpunkte bleiben). */
export function smoothProfile2(prof, n) {
  const curve = new THREE.CatmullRomCurve3(prof.map(([r, y]) => new THREE.Vector3(r, y, 0)), false, 'centripetal');
  return curve.getPoints(Math.max(2, n - 1)).map((p) => [Math.max(0, p.x), p.y]);
}

/**
 * Kopfform: Ellipsoid um center (Halbachsen R·sx, R·sy, R·sz) mit weichen Beulen (Wangen) – liefert Punkte und Normalen
 * der Oberfläche je Richtung und bildet Aufkleber (Augen, Mund …) in einer Tangentialebene auf die Oberfläche ab.
 * bulges: [{ az, el, w (rad), a (Radius-Zuwachs), sym (beide Seiten) }]
 */
export class HeadShape {
  constructor(center, R, { sx = 1, sy = 1, sz = 1, bulges = [] } = {}) {
    this.c = center.clone(); this.R = R; this.ax = R * sx; this.ay = R * sy; this.az = R * sz; this.bulges = bulges;
  }
  /** Abstand Mitte → Oberfläche in Richtung d (normiert). */
  radius(d) {
    let r = 1 / Math.sqrt((d.x / this.ax) ** 2 + (d.y / this.ay) ** 2 + (d.z / this.az) ** 2);
    for (const b of this.bulges) {
      for (const s of b.sym ? [1, -1] : [1]) {
        const bd = dirAE(b.az * s, b.el), c = clamp(d.dot(bd), -1, 1), ang = Math.acos(c);
        r += b.a * Math.exp(-(ang * ang) / (b.w * b.w));
      }
    }
    return r;
  }
  point(d, lift = 0, out = new THREE.Vector3()) { return out.copy(d).multiplyScalar(this.radius(d) + lift).add(this.c); }
  /** Oberflächennormale in Richtung d (numerisch, auch an den Polen). */
  normal(d, out = new THREE.Vector3()) {
    const t1 = Math.abs(d.y) < 0.9 ? _g0.set(0, 1, 0).cross(d).normalize() : _g0.set(1, 0, 0).cross(d).normalize();
    const t2 = _g1.copy(d).cross(t1).normalize();
    const e = 1e-3;
    const p = (a, b) => this.point(_g3.copy(d).addScaledVector(t1, a).addScaledVector(t2, b).normalize(), 0, new THREE.Vector3());
    const du = p(e, 0).sub(p(-e, 0)), dv = p(0, e).sub(p(0, -e));
    out.crossVectors(du, dv).normalize();
    if (out.dot(d) < 0) out.negate();
    return out;
  }
  /** Tangential-Rahmen an (az, el): d (Richtung), n (Normale), T (waagerecht, wachsendes az), B (nach oben). */
  frame(az, el) {
    const d = dirAE(az, el), n = this.normal(d);
    const T = new THREE.Vector3().crossVectors(n, UPV).normalize(), B = new THREE.Vector3().crossVectors(T, n).normalize();
    return { d, n, T, B, az, el, r: this.radius(d) };
  }
  /** Tangentialebene (x entlang T, y entlang B, Einheiten) → Richtung zur Oberfläche. */
  dirAt(f, x, y, out = new THREE.Vector3()) { return out.copy(f.d).multiplyScalar(f.r).addScaledVector(f.T, x).addScaledVector(f.B, y).normalize(); }
}
const UPV = new THREE.Vector3(0, 1, 0);

/**
 * Aufkleber auf einer Kopfform: Polarraster (rings × segs) um den Rahmen f. shape(r, th) → [x, y] (Tangentialebene),
 * lift(x, y, r, th) → Abstand über der Oberfläche, color(x, y, r, th) → Farbe. Normale = Oberflächennormale, gekippt nach
 * dem Gefälle von lift (Wölbung von Augen).
 */
export function decalGeo(head, f, { rings = 4, segs = 24, shape, lift = () => 0.004, color }) {
  const d = new THREE.Vector3(), nn = new THREE.Vector3();
  const g = gridGeo({
    nu: segs, nv: rings, wrapU: true, flip: true,
    point: (u, v, out) => {
      const [x, y] = shape(v, u * TAU);
      head.dirAt(f, x, y, d);
      return head.point(d, lift(x, y, v, u * TAU), out);
    },
    color: (u, v) => color(...shape(v, u * TAU), v, u * TAU),
  });
  // Normalen: Oberfläche + Gefälle der Wölbung (weich, ohne Polstern in der Mitte)
  const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
  for (let i = 0; i < P.count; i++) {
    const v = U.getY(i), th = U.getX(i) * TAU;
    const [x, y] = shape(v, th);
    head.dirAt(f, x, y, d);
    head.normal(d, nn);
    const e = 1e-3, l0 = lift(x, y, v, th);
    const gx = (lift(x + e, y, v, th) - l0) / e, gy = (lift(x, y + e, v, th) - l0) / e;
    nn.addScaledVector(f.T, -gx).addScaledVector(f.B, -gy).normalize();
    N.setXYZ(i, nn.x, nn.y, nn.z);
  }
  return g;
}

/**
 * Streifen-Aufkleber entlang einer Kurve in der Tangentialebene: curve(t) → [x, y] (t ∈ [0, 1]), width(t) (halbe Breite),
 * lift(t, s), color(t, s) (s ∈ [−1, 1] quer). Für Lidstrich, Wimpern, Brauen, Mund.
 */
export function stripGeo(head, f, { n = 16, across = 2, curve, width, lift = () => 0.005, color }) {
  const d = new THREE.Vector3();
  const at = (t, s) => {
    const e = 1e-3, [x, y] = curve(t), [x1, y1] = curve(Math.min(1, t + e)), [x0, y0] = curve(Math.max(0, t - e));
    let tx = x1 - x0, ty = y1 - y0; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const w = width(t);
    return [x - ty * w * s, y + tx * w * s];
  };
  const g = gridGeo({
    nu: n, nv: across, wrapU: false,
    point: (u, v, out) => { const s = -1 + 2 * v, [x, y] = at(u, s); head.dirAt(f, x, y, d); return head.point(d, lift(u, s), out); },
    color: (u, v) => color(u, -1 + 2 * v),
  });
  const P = g.attributes.position, N = g.attributes.normal, nn = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) { _g2.fromBufferAttribute(P, i).sub(head.c).normalize(); head.normal(_g2, nn); N.setXYZ(i, nn.x, nn.y, nn.z); }
  return g;
}

/**
 * Haarschale über einer Kopfform: bedeckt alle Richtungen oberhalb des Randes rim(a) (Elevation je Azimut a, 0 = vorn +X),
 * Dicke thick(a, el). Am Rand ein gerollter Wulst (Halbkreis, Durchmesser = Dicke), der knapp unter der Haut ansetzt →
 * scharfer, sauberer Haaransatz. color(a, el, k) (k = 0 im Wulst … 1 oben). nA Spalten, rows Zeilen bis zum Scheitel.
 */
export function hairShellGeo(head, { rim, thick, color, nA = 72, rows = 12, lipRows = 5, aFrom = null, aTo = null }) {
  const d = new THREE.Vector3();
  const nv = lipRows + rows;
  const part = aFrom !== null;            // nur ein Azimut-Bereich (z. B. Pony unter der Kapuze)
  const A = (u) => (part ? lerp(aFrom, aTo, u) : u * TAU);
  return gridGeo({
    nu: nA, nv, wrapU: !part,
    point: (u, v, out) => {
      const a = A(u), i = Math.round(v * nv), e0 = rim(a);
      const T0 = thick(a, e0);
      const ec = e0 + (T0 * 0.5) / head.R;                 // Wulstmitte (Winkel)
      let el, t;
      if (i <= lipRows) {
        const ph = -Math.PI / 2 + (Math.PI * i) / lipRows;  // −90° (an der Haut) … +90° (Oberseite)
        el = ec - ((T0 * 0.5) / head.R) * Math.cos(ph);
        t = T0 * 0.5 + T0 * 0.5 * Math.sin(ph) - (i === 0 ? 0.004 : 0);
      } else {
        const k = (i - lipRows) / rows;
        el = lerp(ec, Math.PI / 2, Math.pow(k, 0.9));
        t = thick(a, el);
      }
      d.copy(dirAE(a, Math.min(el, Math.PI / 2)));
      return head.point(d, t, out);
    },
    color: (u, v, p) => {
      const a = A(u), i = Math.round(v * nv);
      _g2.copy(p).sub(head.c).normalize();
      return color(a, Math.asin(clamp(_g2.y, -1, 1)), i <= lipRows ? (i / lipRows) * 0.15 : 0.15 + 0.85 * ((i - lipRows) / rows));
    },
  });
}

/**
 * Aufkleber auf einer beliebigen Fläche: map(s, t, lift, out) bildet Flächenparameter (s quer, t hoch, Einheiten) auf einen
 * Punkt ab; shape(r, th) → [s, t]; Normalen aus den Flächen. Für Schürze, Latz, Blusen-Einsatz auf Drehkörpern.
 */
export function paramDecalGeo(map, { rings = 4, segs = 24, shape, lift = () => 0.005, color, flip = false }) {
  return gridGeo({
    nu: segs, nv: rings, wrapU: true, flip,
    point: (u, v, out) => { const [s, t] = shape(v, u * TAU); return map(s, t, lift(s, t, v), out); },
    color: (u, v) => color(...shape(v, u * TAU), v),
  });
}

/**
 * Comic-Augen als Aufkleber auf einer Kopfform (Figurenstil): je Auge gewölbtes Weiß, große Iris mit Verlauf (oben dunkel,
 * unten hell) und dunklem Rand, Pupille, optional Lidstrich mit Wimpern; dazu Glanzpunkte (eigene Geometrie, unbeleuchtet)
 * und geschlossene Augen (Lidbogen „◡“ mit Wimpern). Alles um eyeY nach unten verschoben (Blinzeln über scale.y).
 * o: { az, el (Augenmitte, beide Seiten ±az), w, h (halbe Breite/Höhe), iris, pupil, sclera, lid (Farbe | null), lashes (0..3),
 *      look (Iris nach vorn, Anteil von w), irisW/irisH/irisY, pupilW/pupilH, bulge, base, hlSide (+1 Glanz zur +Z-Seite) }
 */
export function toonEyeGeos(head, o) {
  const W = o.w, Hh = o.h, bulge = o.bulge ?? 0.01, base = o.base ?? 0.003;
  const iw = (o.irisW ?? 0.8) * W, ih = (o.irisH ?? 0.88) * Hh, pw = (o.pupilW ?? 0.5) * iw, ph = (o.pupilH ?? 0.54) * ih;
  const C = (c) => new THREE.Color(c);
  const irisC = C(o.iris), dark = irisC.clone().multiplyScalar(0.38), light = irisC.clone().lerp(C('#ffffff'), o.irisLight ?? 0.38), rimC = irisC.clone().multiplyScalar(0.45);
  const pupilC = C(o.pupil ?? '#140c18'), white = C(o.sclera ?? '#ffffff'), shade = white.clone().lerp(C('#b9c6db'), 0.6);
  const lidC = o.lid ? C(o.lid) : null;
  const hs = o.hlSide ?? 1;
  const open = [], hl = [], closed = [];
  const L = (x, y) => base + bulge * Math.max(0, 1 - (x / W) ** 2 - (y / Hh) ** 2);
  // Punkt in das Weiß hineinziehen (Iris/Pupille werden am Augenrand beschnitten)
  const clip = ([x, y], m = 0.965) => { const q = Math.hypot(x / W, y / Hh); return q > m ? [(x * m) / q, (y * m) / q] : [x, y]; };
  for (const s of [1, -1]) {
    const f = head.frame(o.az * s, o.el);
    const cx = -s * (o.look ?? 0.1) * W, cy = (o.irisY ?? -0.02) * Hh;
    const ell = (ex, ey, a, b, egg = 0) => (r, th) => [ex + a * r * Math.cos(th) * (1 - egg * Math.sin(th)), ey + b * r * Math.sin(th)];
    // Weiß (unten minimal breiter), oben im Schatten des Lids
    open.push(decalGeo(head, f, {
      rings: 4, segs: 24, shape: ell(0, 0, W, Hh, 0.05), lift: L,
      color: (x, y) => white.clone().lerp(shade, smoothstep((y / Hh - 0.25) / 0.75) * (lidC ? 1 : 0.25)),
    }));
    // Iris: Verlauf oben dunkel → unten hell, dunkler Rand
    const irisShape = (r, th) => clip(ell(cx, cy, iw, ih)(r, th));
    open.push(decalGeo(head, f, {
      rings: 4, segs: 24, shape: irisShape, lift: (x, y) => L(x, y) + 0.0012,
      color: (x, y, r) => {
        const k = smoothstep(((y - cy) / ih + 0.75) / 1.5);
        const c = light.clone().lerp(irisC, smoothstep(k * 1.6)).lerp(dark, smoothstep((k - 0.45) / 0.55));
        return c.lerp(rimC, smoothstep((r - 0.78) / 0.22) * 0.85);
      },
    }));
    // Pupille
    const pcx = cx - s * 0.04 * iw, pcy = cy + 0.06 * ih;
    open.push(decalGeo(head, f, { rings: 2, segs: 18, shape: (r, th) => clip(ell(pcx, pcy, pw, ph)(r, th)), lift: (x, y) => L(x, y) + 0.0024, color: () => pupilC }));
    // Glanzpunkte (unbeleuchtet): groß oben, klein unten gegenüber – beide Augen zur selben Weltseite
    const hx = hs * 0.3 * iw, hy = 0.36 * ih;
    hl.push(decalGeo(head, f, { rings: 2, segs: 14, shape: (r, th) => clip(ell(cx + hx, cy + hy, 0.27 * iw, 0.3 * ih)(r, th), 0.9), lift: (x, y) => L(x, y) + 0.0036, color: () => 0xffffff }));
    hl.push(decalGeo(head, f, { rings: 1, segs: 10, shape: (r, th) => clip(ell(cx - hs * 0.34 * iw, cy - 0.44 * ih, 0.12 * iw, 0.12 * iw)(r, th), 0.9), lift: (x, y) => L(x, y) + 0.0036, color: () => 0xffffff }));
    // Lidstrich (Mädchen): entlang des oberen Randes, außen dicker, mit Wimpern
    const lidLift = () => base + 0.003;
    if (lidC) {
      // Kontur für „außen = +x“ (innen leicht unter der Mitte → über die Oberkante → außen tiefer); fernes Auge gespiegelt
      const th0 = Math.PI + 0.12, th1 = -0.3;
      const contour = (t) => { const th = lerp(th0, th1, t); return [W * 1.03 * Math.cos(th) * (1 - 0.05 * Math.sin(th)), Hh * 1.03 * Math.sin(th)]; };
      const cont = (t) => { const [x, y] = contour(t); return [s > 0 ? x : -x, y]; };
      open.push(stripGeo(head, f, { n: 18, across: 2, curve: cont, width: (t) => lerp(0.0032, 0.0088, smoothstep(t)) * Math.min(1, t / 0.12 + 0.35), lift: lidLift, color: () => lidC }));
      const lashes = o.lashes ?? 2;
      for (let k = 0; k < lashes; k++) {
        const t0 = 0.97 - k * 0.15, [px, py] = cont(t0);
        const ang = 0.35 + k * 0.4;                         // Richtung: nach außen-oben
        const dx = (s > 0 ? 1 : -1) * Math.cos(ang), dy = Math.sin(ang), len = (o.lashLen ?? 0.024) * (1 - 0.18 * k);
        open.push(stripGeo(head, f, {
          n: 5, across: 1, curve: (t) => [px + dx * len * t, py + dy * len * t + 0.25 * len * t * t],
          width: (t) => lerp(0.0036, 0.0006, t), lift: lidLift, color: () => lidC,
        }));
      }
    }
    // geschlossen: Lidbogen ◡ (leicht gewölbt), Wimpern nach außen-unten
    const lc = lidC ?? C(o.closedColor ?? '#2b1d24');
    const arc = (t) => [(s > 0 ? 1 : -1) * W * 0.95 * (2 * t - 1), 0.004 - 0.024 * (1 - (2 * t - 1) ** 2)];
    closed.push(stripGeo(head, f, { n: 14, across: 2, curve: arc, width: (t) => 0.0048 * (0.45 + 0.55 * Math.sin(Math.PI * t)), lift: (t) => base + 0.004 + 0.5 * bulge * (1 - (2 * t - 1) ** 2), color: () => lc }));
    if (lidC) {
      for (let k = 0; k < (o.lashes ?? 2); k++) {
        const [px, py] = arc(0.92 - k * 0.14), ang = -0.35 - k * 0.35, dx = (s > 0 ? 1 : -1) * Math.cos(ang), dy = Math.sin(ang), len = 0.018;
        closed.push(stripGeo(head, f, { n: 4, across: 1, curve: (t) => [px + dx * len * t, py + dy * len * t], width: (t) => lerp(0.003, 0.0006, t), lift: () => base + 0.005, color: () => lc }));
      }
    }
  }
  const eyeY = head.point(dirAE(o.az, o.el)).y;
  const shift = new THREE.Matrix4().makeTranslation(0, -eyeY, 0);
  const merge = (gs) => { const m = mergeGeometries(gs, false); for (const g of gs) g.dispose(); m.applyMatrix4(shift); return m; };
  return { open: merge(open), hl: merge(hl), closed: merge(closed), eyeY };
}

/**
 * Weicher Körper als „verschmolzene“ Ellipsoide (glatte Vereinigung, keine Kanten an den Übergängen): blobs = [{ c: [x,y,z],
 * r: [rx,ry,rz] }], k = Breite der Verschmelzung. Die Oberfläche wird von `center` aus je Richtung gesucht (sternförmig);
 * floor: Unterseite unterhalb dieser Höhe flach gedrückt (sitzt auf). color(p) → Farbe.
 */
export function blobUnionGeo(blobs, { center, k = 0.1, nu = 28, nv = 20, color, floor = null }) {
  const c0 = new THREE.Vector3(...center), p = new THREE.Vector3();
  const sdE = (q, b) => {
    const x = (q.x - b.c[0]) / b.r[0], y = (q.y - b.c[1]) / b.r[1], z = (q.z - b.c[2]) / b.r[2];
    return (Math.sqrt(x * x + y * y + z * z) - 1) * Math.min(b.r[0], b.r[1], b.r[2]);
  };
  const smin = (a, b) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
  const sdf = (q) => blobs.reduce((d, b, i) => (i === 0 ? sdE(q, b) : smin(d, sdE(q, b))), 0);
  return gridGeo({
    nu, nv, wrapU: true,
    point: (u, v, out) => {
      const d = dirAE(u * TAU, -Math.PI / 2 + v * Math.PI);
      let lo = 0, hi = 2;
      for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; p.copy(c0).addScaledVector(d, m); if (sdf(p) < 0) lo = m; else hi = m; }
      out.copy(c0).addScaledVector(d, (lo + hi) / 2);
      if (floor !== null && out.y < floor.y) out.y = floor.y - (floor.y - out.y) * floor.k;
      return out;
    },
    color: color ? (u, v, q) => color(q) : null,
  });
}

/** Glatter Körper entlang einer Achse (x von x0 bis x1), Querschnitt-Ellipse hy(v)/hz(v), Mitte yc(v) – Schuhe, Pfoten. */
export function blobGeo({ x0, x1, hy, hz, yc = () => 0, nu = 20, nv = 14, color, deform = null }) {
  return gridGeo({
    nu, nv, wrapU: true,
    point: (u, v, out) => {
      const th = u * TAU, x = lerp(x0, x1, v);
      out.set(x, yc(v) + Math.sin(th) * hy(v), Math.cos(th) * hz(v));
      if (deform) deform(out, u, v);
      return out;
    },
    color: color ? (u, v, p) => color(p, u, v) : null,
  });
}

// ------------------------------------------------------------------ Kurs-Modus: Hilfen für Posen und Kostüme
/** Winkel auf (−π, π] falten (Salto-Rest nach einer vollen Umdrehung → 0). */
export const wrapAngle = (a) => a - TAU * Math.round(a / TAU);

/**
 * Zwei-Gelenk-IK in der Seitenebene (x vor, y hoch): Hüfte in Höhe `hipY` über dem Boden, Knöchel-Ziel
 * (ax, ay). Liefert Gelenkwinkel im Vorzeichen der Figuren-Posen: `thigh` (vor = positiv, relativ zum
 * Becken, das um `lean` gekippt ist), `knee` (Beugung ≥ 0, Knie nach vorn) und `foot` (Fuß waagerecht).
 */
export function legIK(thighLen, shinLen, hipY, ax, ay, lean = 0) {
  const dy = hipY - ay;
  const D = clamp(Math.hypot(ax, dy), 0.05, thighLen + shinLen - 1e-4);
  const phi = Math.atan2(ax, dy);
  const alpha = Math.acos(clamp((thighLen * thighLen + D * D - shinLen * shinLen) / (2 * thighLen * D), -1, 1));
  const inner = Math.acos(clamp((thighLen * thighLen + shinLen * shinLen - D * D) / (2 * thighLen * shinLen), -1, 1));
  const thighW = phi + alpha, knee = Math.PI - inner;
  return { thigh: thighW - lean, knee, foot: thighW - knee };
}

/**
 * Skin-Gewichte für eine Zwei-Knochen-Kette entlang −Y (Oberarm → Unterarm): oberhalb `yHi` ganz Knochen 0,
 * unterhalb `yLo` ganz Knochen 1, dazwischen weich gemischt (Gummiarm-Biegung ohne Knick).
 */
export function skinTwoBones(g, yHi, yLo) {
  const pos = g.attributes.position, n = pos.count;
  const idx = new Uint16Array(n * 4), w = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const k = smoothstep((yHi - pos.getY(i)) / (yHi - yLo));
    idx[i * 4] = 0; idx[i * 4 + 1] = 1;
    w[i * 4] = 1 - k; w[i * 4 + 1] = k;
  }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(w, 4));
  return g;
}

/**
 * Regenbogen-Glanz (z. B. Funkelstern): tauscht beim Einschalten die Standard-Materialien aller Meshes unter
 * `root` gegen eigene Kopien (gleiches Shader-Programm, keine zusätzlichen Zeichenaufrufe) und lässt deren
 * Eigenleuchten je Bild durch die Farben laufen – versetzt nach Höhe, damit ein Regenbogen über die Figur
 * wandert. Ausschalten stellt die Originale wieder her. Unbeleuchtete Materialien (Glanzpunkte) bleiben.
 */
export class RainbowGlow {
  constructor(root, { speed = 1.6, spread = 0.9, intensity = 0.55, flicker = 0.22 } = {}) {
    this.root = root; this.on = false; this.entries = new Map();
    this.speed = speed; this.spread = spread; this.intensity = intensity; this.flicker = flicker;
  }
  set(on) {
    on = !!on;
    if (on === this.on) return;
    this.on = on;
    if (on) {
      const box = new THREE.Box3().setFromObject(this.root);
      const h = Math.max(1e-3, box.max.y - box.min.y);
      const wp = new THREE.Vector3();
      this.root.traverse((o) => {
        if (!o.isMesh || !o.material?.isMeshStandardMaterial) return;
        let e = this.entries.get(o);
        if (e && (o.material === e.orig || o.material === e.glow)) return;
        if (e) e.glow.dispose();
        o.getWorldPosition(wp);
        const glow = o.material.clone();
        e = { mesh: o, orig: o.material, glow, k: clamp((wp.y - box.min.y) / h, 0, 1) };
        this.entries.set(o, e);
      });
    }
    for (const e of this.entries.values()) e.mesh.material = on ? e.glow : e.orig;
  }
  update(t) {
    if (!this.on) return;
    for (const e of this.entries.values()) {
      const hue = (((t * this.speed - e.k * this.spread) % 1) + 1) % 1;
      e.glow.emissive.setHSL(hue, 1, 0.5);
      e.glow.emissiveIntensity = this.intensity + this.flicker * Math.sin(t * 31 + e.k * 17);
    }
  }
  dispose() {
    this.set(false);
    for (const e of this.entries.values()) e.glow.dispose();
    this.entries.clear();
  }
}
