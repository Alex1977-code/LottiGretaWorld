// Zusatz-Werkzeuge für die Welt-3-Modelle (src/course/models/kinds/*_w3.js). Ergänzt kit.js, ändert nichts daran.
//
//  - alongY(p, d, len)        Matrix: Grundkörper mit Achse +Y (Kegel, Zylinder, Kapsel) entlang d, Fuß bei p.
//  - stick(b, g, color, …)    Aufkleber/Teil auf eine Ellipsoid-Fläche setzen (Mund, Wangen, Flecken).
//  - snowV / iceV             Vertexfarben für Schnee (weiß → kühles Blau unten) und Eis.
//  - pilzStem3 / pilzCap3     Pilzling-Körper (wie Welt 1, eigene Cache-Schlüssel) für Eis- und Reifen-Pilzling.
//  - Puffs                    kleine Wolken-/Rauch-/Schneepuffs als EIN InstancedMesh (Teleport, Bruch, Dampf).
//  - fadeMats(group)          Materialien einer Gruppe (z. B. Augen) durch eigene, ausblendbare Kopien ersetzen.
//  - chainTexture()           Maschendraht-Textur (Rauten, Alpha) für Kettenzäune.
//  - spine(...)               Punkte/Tangenten auf einer kubischen Bézier-Kurve (Schlangenkörper).

import {
  THREE, TAU, Build, cached, col, mix, smoothstep, clamp, onLathe, decals, instMesh, canvasTexture, placed,
} from './kit.js';

const _up = new THREE.Vector3(0, 1, 0);

/** Matrix für einen Grundkörper mit Achse +Y (mittig im Ursprung, Länge len): Achse entlang d, Fuß bei p. */
export function alongY(p, d, len, s = 1) {
  const dd = new THREE.Vector3(...(Array.isArray(d) ? d : [d.x, d.y, d.z])).normalize();
  const pp = new THREE.Vector3(...(Array.isArray(p) ? p : [p.x, p.y, p.z]));
  const q = new THREE.Quaternion().setFromUnitVectors(_up, dd);
  const sc = typeof s === 'number' ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s);
  return new THREE.Matrix4().compose(pp.addScaledVector(dd, len / 2), q, sc);
}

/** Richtung (az um Y ab +X, el Höhe) → Punkt und Normale auf einem Ellipsoid (Mitte c, Halbachsen r). */
export function onEll(c, r, az, el) {
  const d = [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)];
  const p = new THREE.Vector3(c[0] + d[0] * r[0], c[1] + d[1] * r[1], c[2] + d[2] * r[2]);
  const n = new THREE.Vector3(d[0] / r[0], d[1] / r[1], d[2] / r[2]).normalize();
  return { p, n };
}

/**
 * Teil auf eine Fläche kleben: hit = { p, n } (z. B. aus onEll/onLathe), size = [quer, hoch, dick],
 * inset = wie tief es einsinkt (Anteil der Dicke). g Standard: Kugelkappe nach +Z (flacher Aufkleber).
 */
export function stick(b, hit, color, size, inset = 0.35, g = null, spin = 0) {
  if (!hit) return b;
  const geo = g ?? (() => { const s = new THREE.SphereGeometry(1, 14, 6, 0, TAU, 0, Math.PI / 2); s.rotateX(Math.PI / 2); return s; })();
  if (spin) geo.rotateZ(spin);
  const m = placed(hit.p.clone().addScaledVector(hit.n, -size[2] * inset), hit.n, new THREE.Vector3(size[0], size[1], size[2]));
  return b.add(geo, color, m);
}

/** Ungerade ganze Zahl (auch für negative Werte; Math.floor(x) % 2 liefert dort −1). */
export const odd = (v) => (((Math.floor(v) % 2) + 2) % 2) === 1;

/** Schnee: oben weiß, unten kühles Blau (Normale y). */
export const snowV = (lo = 0xc4d8f0, hi = 0xffffff, k = 1.1) => ({ v: (x, y, z, nx, ny) => mix(lo, hi, smoothstep((ny + 0.55) / k)) });
/** Eis: hell türkis, an steilen Flächen tiefer. */
export const iceV = (lo = 0x5ab8ec, hi = 0xc8f4ff) => ({ v: (x, y, z, nx, ny) => mix(lo, hi, smoothstep(ny * 0.6 + 0.5)) });

// ------------------------------------------------------------------ Pilzling-Körper (Welt 3)
export const PZ3 = {
  cap: 0xff7a1f, spot: 0xfff1c4, gill: 0xffd29a, stem: 0xfbe2bd, stemLow: 0xefc492,
  ink: 0x3a2216, foot: 0x6b3a22, tooth: 0xffffff,
};
const STEM_PTS = [[0, 0.08], [0.17, 0.085], [0.245, 0.14], [0.275, 0.25], [0.268, 0.36], [0.24, 0.45], [0.19, 0.52], [0.1, 0.56], [0, 0.565]];
export const CAP3_PTS = [[0, 0.02], [0.2, 0.0], [0.34, 0.03], [0.415, 0.08], [0.435, 0.13], [0.425, 0.19], [0.38, 0.26], [0.3, 0.32], [0.18, 0.365], [0, 0.38]];
export const PILZ3 = { capY: 0.46, capTilt: 0.17 };
/** Stiel mit Gesicht in einen Build schreiben (Ursprung Fußpunkt des Stiels, y0 verschiebt). */
export function pilzStem3(b, y0 = 0, cheeks = 0) {
  b.lathe(STEM_PTS, { v: (x, y) => (y < 0.2 ? col(PZ3.stemLow).clone().lerp(col(PZ3.stem), (y - 0.08) / 0.12) : PZ3.stem) }, { p: [0, y0, 0] }, 28);
  for (const s of [1, -1]) b.capsule(0.03, 0.1, PZ3.ink, { p: [0.248, y0 + 0.47, s * 0.085], r: [Math.PI / 2 - s * 0.5, -0.35 * s, 0], order: 'YXZ' });
  b.torus(0.05, 0.014, PZ3.ink, { p: [0.262, y0 + 0.265, 0], r: [0, Math.PI / 2, 0] }, 6, 12, Math.PI);
  b.cone(0.018, 0.04, PZ3.tooth, { p: [0.272, y0 + 0.27, 0.025], r: [0, 0, -0.2] }, 6);
  if (cheeks) {
    for (const s of [1, -1]) {
      const h = onLathe(STEM_PTS, 0.3, s * 0.62, -0.05);
      if (h) { h.p.y += y0; stick(b, h, cheeks, [0.05, 0.035, 0.02], 0.3); }
    }
  }
  return b;
}
/** Hut (orange, Cremepunkte) in einen Build schreiben; Lage wie im Pilzling (capY, capTilt) plus y0. */
export function pilzCap3(b, y0 = 0, spots = true, extra = null) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(-0.02, y0 + PILZ3.capY, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, PILZ3.capTilt)), new THREE.Vector3(1, 1, 1));
  const cb = new Build();
  cb.lathe(CAP3_PTS, (x, y, z, nx, ny) => (ny < -0.4 ? PZ3.gill : PZ3.cap), null, 32, 2);
  if (spots) {
    const hits = [[0, Math.PI / 2, 0.085], [0, 0.62, 0.08], [1.25, 0.55, 0.08], [-1.25, 0.55, 0.08], [2.5, 0.6, 0.08], [-2.5, 0.6, 0.08],
      [0.62, 0.08, 0.065], [-0.62, 0.08, 0.065], [1.9, 0.1, 0.065], [-1.9, 0.1, 0.065], [Math.PI, 0.12, 0.065]]
      .map(([az, el, r]) => ({ ...onLathe(CAP3_PTS, 0.08, az, el), r }));
    decals(cb, hits, 0.08, PZ3.spot, 0.22);
  }
  if (extra) extra(cb);
  const g = cb.geometry();
  g.applyMatrix4(m);
  b.parts.push(g);
  return b;
}
/** Augenliste des Pilzlings (relativ zum Fußpunkt, + y0). */
export const pilzEyes3 = (y0 = 0) => [
  { p: [0.215, y0 + 0.37, 0.085], r: 0.078, sy: 1.35, dir: [1, 0.22, 0.42] },
  { p: [0.215, y0 + 0.37, -0.085], r: 0.078, sy: 1.35, dir: [1, 0.22, -0.42] },
];

// ------------------------------------------------------------------ Puffs (Rauch, Schnee, Dampf)
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
/**
 * n kleine Kugel-Puffs in einem InstancedMesh. burst(center, opts) startet einen Schwall; step(dt) bewegt.
 * Material: eigenes (wird mit dem Modell entsorgt) – color, opacity.
 */
export class Puffs {
  constructor(n = 12, color = 0xffffff, opts = {}) {
    this.n = n;
    this.mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9, transparent: true, opacity: opts.opacity ?? 0.9, emissive: opts.emissive ?? 0x000000, depthWrite: false });
    // detail 0: kantige Brocken (Ikosaeder), sonst weiche Kugeln
    this.mesh = instMesh(cached(`w3:puff:${opts.detail ?? 1}`, () => (opts.detail === 0 ? new THREE.IcosahedronGeometry(1, 0) : new THREE.SphereGeometry(1, 10, 7))), this.mat, n, opts.radius ?? 3, opts.cy ?? 0.6);
    this.mesh.renderOrder = 3;
    this.items = Array.from({ length: n }, () => ({ age: 9, life: 1, p: new THREE.Vector3(), v: new THREE.Vector3(), s: 0.2, grow: 1 }));
    for (let i = 0; i < n; i++) this.mesh.setMatrixAt(i, ZERO);
    this.mesh.visible = false;
    this.gravity = opts.gravity ?? 0;
  }
  /** Schwall: c = Mitte, o = { count, speed, up, size, life, spread (Kugelradius) }. */
  burst(c, o = {}) {
    const k = Math.min(this.n, o.count ?? this.n);
    let j = 0;
    for (let i = 0; i < this.n && j < k; i++) {
      const it = this.items[i];
      if (it.age < it.life && !o.force) continue;
      const a = (j / k) * TAU + Math.random() * 0.5, el = (Math.random() - 0.3) * 1.2;
      const d = new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
      it.p.set(c.x ?? c[0], c.y ?? c[1], c.z ?? c[2]).addScaledVector(d, (o.spread ?? 0.2) * Math.random());
      it.v.copy(d).multiplyScalar((o.speed ?? 1.2) * (0.6 + Math.random() * 0.6));
      it.v.y += o.up ?? 0.6;
      it.s = (o.size ?? 0.22) * (0.7 + Math.random() * 0.6);
      it.life = (o.life ?? 0.7) * (0.75 + Math.random() * 0.5);
      it.grow = o.grow ?? 1.6;
      it.age = 0;
      j++;
    }
    this.mesh.visible = true;
  }
  step(dt) {
    let any = false;
    this.items.forEach((it, i) => {
      if (it.age >= it.life) { this.mesh.setMatrixAt(i, ZERO); return; }
      it.age += dt;
      const k = clamp(it.age / it.life, 0, 1);
      it.v.multiplyScalar(Math.exp(-2.5 * dt));
      it.v.y -= this.gravity * dt;
      it.p.addScaledVector(it.v, dt);
      const sc = it.s * (0.5 + k * it.grow) * (1 - smoothstep((k - 0.6) / 0.4));
      if (sc < 0.002 || k >= 1) { this.mesh.setMatrixAt(i, ZERO); return; }
      any = true;
      this.mesh.setMatrixAt(i, _m.compose(_p.copy(it.p), _q.setFromEuler(_e.set(i, i * 2, 0)), _s.setScalar(sc)));
    });
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.visible = any;
  }
  dispose() { this.mat.dispose(); }
}

// ------------------------------------------------------------------ Ausblendbare Materialien
/** Ersetzt die Materialien aller Meshes in obj durch eigene transparente Kopien; liefert die Liste (für dispose/opacity). */
export function fadeMats(obj) {
  const list = [];
  obj.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material.clone();
    m.transparent = true;
    o.material = m;
    list.push(m);
  });
  return list;
}
export function setOpacity(mats, a) {
  for (const m of mats) { m.opacity = a; m.depthWrite = a > 0.95; m.visible = a > 0.01; }
}

// ------------------------------------------------------------------ Maschendraht
/** Rauten-Maschendraht (silbern, Alpha), wiederholbar; 1 Kachel = 0,25 m. */
export function chainTexture() {
  const t = canvasTexture('w3:chain', 128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const draw = (color, lw, off) => {
      ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0 + off, h / 2 + off); ctx.lineTo(w / 2 + off, 0 + off); ctx.lineTo(w + off, h / 2 + off); ctx.lineTo(w / 2 + off, h + off); ctx.closePath();
      ctx.moveTo(-w / 2 + off, 0 + off); ctx.lineTo(0 + off, h / 2 + off); ctx.lineTo(-w / 2 + off, h + off);
      ctx.moveTo(w * 1.5 + off, 0 + off); ctx.lineTo(w + off, h / 2 + off); ctx.lineTo(w * 1.5 + off, h + off);
      ctx.stroke();
    };
    draw('rgba(40,50,70,0.55)', 11, 2);
    draw('#c8d2e2', 8, 0);
    draw('#ffffff', 3, -1.2);
  }, { repeat: true });
  return t;
}

// ------------------------------------------------------------------ Bézier-Rückgrat
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
/** Punkt auf kubischer Bézier-Kurve (p0..p3: Vector3) bei t → out. */
export function bezier(p0, p1, p2, p3, t, out) {
  const u = 1 - t;
  out.set(0, 0, 0)
    .addScaledVector(p0, u * u * u).addScaledVector(p1, 3 * u * u * t)
    .addScaledVector(p2, 3 * u * t * t).addScaledVector(p3, t * t * t);
  return out;
}
/** n Punkte gleichmäßig nach Bogenlänge (Näherung über 48 Stützstellen); liefert [{ p, d }] (d = Tangente). */
export function spinePoints(p0, p1, p2, p3, n, outList) {
  const N = 48, pts = [], len = [0];
  for (let i = 0; i <= N; i++) pts.push(bezier(p0, p1, p2, p3, i / N, new THREE.Vector3()));
  for (let i = 1; i <= N; i++) len.push(len[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const L = len[N];
  for (let k = 0; k < n; k++) {
    const target = n > 1 ? (k / (n - 1)) * L : 0;
    let i = 1; while (i < N && len[i] < target) i++;
    const f = (target - len[i - 1]) / Math.max(1e-6, len[i] - len[i - 1]);
    const o = outList[k];
    o.p.copy(pts[i - 1]).lerp(pts[i], clamp(f, 0, 1));
    o.d.copy(pts[i]).sub(pts[i - 1]).normalize();
  }
  return L;
}
export { _a as tmpA, _b as tmpB, _c as tmpC };

// ------------------------------------------------------------------ Zirkus-Sockel (Trommel)
/**
 * Runde Zirkus-Trommel (Ursprung Mitte Unterseite): rot-weiße Senkrechtstreifen, Goldränder, Goldsterne,
 * violette Deckfläche mit Goldring; hole > 0 → dunkles Loch in der Mitte (Radius hole).
 */
export function circusDrumGeo(R = 2.4, H = 1.4, hole = 0) {
  return cached(`w3:drum:${R}:${H}:${hole}`, () => {
    const b = new Build();
    const n = Math.max(12, Math.round(R * 10));
    b.cyl(R, R * 1.03, H, (x, y, z, nx, ny) => (Math.abs(ny) > 0.5 ? 0x6a2a9a : Math.floor(((Math.atan2(z, x) / TAU) + 1) * n) % 2 ? 0xe8283a : 0xfff6ee), { p: [0, H / 2, 0] }, n * 2);
    b.torus(R * 1.0, 0.09, 0xffc21a, { p: [0, H, 0], r: [Math.PI / 2, 0, 0] }, 8, n * 2);
    b.torus(R * 1.03, 0.09, 0xffc21a, { p: [0, 0.06, 0], r: [Math.PI / 2, 0, 0] }, 8, n * 2);
    b.torus(R * 0.7, 0.04, 0xffd84a, { p: [0, H + 0.005, 0], r: [Math.PI / 2, 0, 0] }, 6, n * 2);
    // Goldsterne rundum
    const k = Math.max(4, Math.round(R * 2.5));
    for (let i = 0; i < k; i++) {
      const a = ((i + 0.5) / k) * TAU;
      const g = new THREE.ExtrudeGeometry(starShapeW3(0.2 * Math.min(1.6, H / 1.4 + 0.3), 0.09 * Math.min(1.6, H / 1.4 + 0.3)), { depth: 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 });
      b.add(g, 0xffd21f, { p: [Math.cos(a) * (R + 0.02), H * 0.5, Math.sin(a) * (R + 0.02)], r: [0, Math.PI / 2 - a, 0] });
    }
    if (hole > 0) {
      b.cyl(hole + 0.12, hole + 0.12, 0.06, 0xffc21a, { p: [0, H + 0.03, 0] }, 28);
      b.cyl(hole, hole, 0.02, 0x140a1e, { p: [0, H + 0.065, 0] }, 28);
    }
    return b.geometry();
  });
}
function starShapeW3(R, r, n = 5) {
  const s = new THREE.Shape();
  for (let i = 0; i <= n * 2; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / n, rr = i % 2 ? r : R;
    if (i === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  return s;
}
