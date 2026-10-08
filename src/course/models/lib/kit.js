// Werkzeugkasten der Kurs-Modelle (src/course/models/kinds/*.js).
//
//  - Material-Cache (modulweit geteilt, lebt so lange wie die Seite): std(), basic(), vcol(), metal(),
//    spriteMat(). Nur modell-eigene Materialien (z. B. für Ausblenden/Aufleuchten geklont) gibt das
//    Modell in dispose() frei.
//  - Geometrie-Cache je Modelltyp: cached(key, make) – Geometrien werden einmal gebaut und von allen
//    Exemplaren geteilt (nie entsorgt, klein).
//  - Build: vertexgefärbte Sammel-Meshes. Viele Grundkörper (Kugel, Kapsel, Quader mit runden Kanten,
//    Zylinder, Kegel, Torus, Drehkörper, Extrusion) mit je eigener Farbe und Lage → EINE Geometrie,
//    ein Zeichenaufruf. Farbe als Hex, als Funktion je Dreieck (scharfe Muster: Punkte, Streifen) oder
//    { v: fn } je Ecke (weiche Verläufe). Muster-Funktionen bekommen die Koordinaten des Grundkörpers
//    VOR dem Verschieben (bei Kugeln also die Richtung).
//  - Augen (Weiß, Iris, Pupille vertexgefärbt + unbeleuchtete Glanzpunkte), Schwindel-Sterne,
//    Ausrufezeichen, Formen (Stern, Funkel, Herz, Pfote), Bitcoin-Prägung.
//  - Zustands-Uhr (Zeit seit Zustandswechsel), Hilfen für Animation (damp, wave).
//
// Maßstab: 1 Einheit = 1 m, Ursprung = Fußpunkt, Blick nach +X (siehe docs/KURS-ARCHITEKTUR.md).

import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { roundedBox, SIDE } from '../../../three/world/geometry.js';
import { placed, Blinker, damp, clamp, smoothstep, lerp } from '../../../three/lib/figures.js';
import { getEnvMap, canvasTexture, glowTexture, sparkleTexture } from '../../../three/lib/itemMaterials.js';
import { getRenderer } from '../../../three/renderer.js';

export { THREE, roundedBox, SIDE, placed, Blinker, damp, clamp, smoothstep, lerp, canvasTexture, glowTexture, sparkleTexture };
export const TAU = Math.PI * 2;

// ------------------------------------------------------------------ Farben
const LIN = new Map();
/** Hex/String/Color → THREE.Color (linear, gecacht für Hex und Strings). */
export function col(c) {
  if (c && c.isColor) return c;
  let v = LIN.get(c);
  if (!v) { v = new THREE.Color(c); LIN.set(c, v); }
  return v;
}
/** Mischfarbe (neue Color). */
export const mix = (a, b, t) => col(a).clone().lerp(col(b), clamp(t, 0, 1));

// ------------------------------------------------------------------ Materialien
const MATS = new Map();
function cachedMat(key, make) {
  let m = MATS.get(key);
  if (!m) { m = make(); m.name = key; MATS.set(key, m); }
  return m;
}
/** Geteiltes MeshStandardMaterial (Spielzeug-Look: glatt, leicht glänzend). */
export const std = (key, props = {}) => cachedMat(`std:${key}`, () => new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0, ...props }));
/** Geteiltes unbeleuchtetes Material (Glanzpunkte, Glut, Schein). */
export const basic = (key, props = {}) => cachedMat(`basic:${key}`, () => new THREE.MeshBasicMaterial(props));
/** Material für vertexgefärbte Sammel-Meshes. */
export const vcol = (roughness = 0.42, extra = {}, key = '') => cachedMat(`vcol:${roughness}:${key}`, () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness, metalness: 0, ...extra }));
/** Geteiltes Sprite-Material (Schein, Funkeln; blickt immer zur Kamera). */
export const spriteMat = (key, props = {}) => cachedMat(`sprite:${key}`, () => new THREE.SpriteMaterial({ transparent: true, depthWrite: false, ...props }));

let envTried = false, env = null;
/** Umgebungs-Textur für Metalle (einmal je Seite, aus dem gemeinsamen Renderer); null, wenn nicht möglich. */
export function envMap() {
  if (!envTried) {
    envTried = true;
    try { env = getEnvMap(getRenderer().renderer); } catch { env = null; }
  }
  return env;
}
/** Metall mit Umgebungsspiegelung (Gold, Chrom, Eisen). */
export function metal(key, props, intensity = 1) {
  return cachedMat(`metal:${key}`, () => {
    const m = new THREE.MeshStandardMaterial({ metalness: 0.7, roughness: 0.3, ...props });
    const e = envMap();
    if (e) { m.envMap = e; m.envMapIntensity = intensity; }
    return m;
  });
}
export const gold = () => metal('gold', { color: 0xffc21a, metalness: 0.75, roughness: 0.26, emissive: 0x2a1a00 }, 1.1);

// ------------------------------------------------------------------ Geometrie-Cache
const GEOS = new Map();
/** Geometrie je Schlüssel einmal bauen und teilen. */
export function cached(key, make) {
  let g = GEOS.get(key);
  if (!g) { g = make(); g.computeBoundingSphere(); GEOS.set(key, g); }
  return g;
}

// ------------------------------------------------------------------ Transformationen
const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3();
/** Matrix aus { p: [x,y,z], r: [rx,ry,rz], s: n | [sx,sy,sz], order }. */
export function xf(o = {}) {
  if (o.isMatrix4) return o;
  const p = o.p ?? [0, 0, 0], r = o.r ?? [0, 0, 0], s = o.s ?? 1;
  _q.setFromEuler(_e.set(r[0], r[1], r[2], o.order ?? 'XYZ'));
  if (typeof s === 'number') _s.setScalar(s); else _s.set(s[0], s[1], s[2]);
  return new THREE.Matrix4().compose(_p.set(p[0], p[1], p[2]), _q, _s);
}
/** Ellipsoid-Matrix: Einheitskugel → Halbachsen (quer, hoch, entlang dir) mit Mitte c. */
export const along = (c, dir, sc) => placed(new THREE.Vector3(...c), new THREE.Vector3(...dir), new THREE.Vector3(...sc));

// ------------------------------------------------------------------ Vertexfarben
const _c = new THREE.Color();
function toColor(v, out) {
  if (v && v.isColor) return out.copy(v);
  return out.copy(col(v));
}
/**
 * Färbt eine nicht-indizierte Geometrie: c = Hex/String/Color (einfarbig), Funktion (x,y,z,nx,ny,nz) je
 * Dreieck (Schwerpunkt, scharfe Kanten) oder { v: fn } je Ecke (weiche Verläufe).
 */
export function paint(g, c) {
  const P = g.attributes.position, N = g.attributes.normal;
  const n = P.count, arr = new Float32Array(n * 3);
  if (typeof c === 'function') {
    for (let i = 0; i < n; i += 3) {
      const cx = (P.getX(i) + P.getX(i + 1) + P.getX(i + 2)) / 3;
      const cy = (P.getY(i) + P.getY(i + 1) + P.getY(i + 2)) / 3;
      const cz = (P.getZ(i) + P.getZ(i + 1) + P.getZ(i + 2)) / 3;
      const nx = N.getX(i) + N.getX(i + 1) + N.getX(i + 2), ny = N.getY(i) + N.getY(i + 1) + N.getY(i + 2), nz = N.getZ(i) + N.getZ(i + 1) + N.getZ(i + 2);
      const l = Math.hypot(nx, ny, nz) || 1;
      toColor(c(cx, cy, cz, nx / l, ny / l, nz / l), _c);
      for (let k = 0; k < 3; k++) { arr[(i + k) * 3] = _c.r; arr[(i + k) * 3 + 1] = _c.g; arr[(i + k) * 3 + 2] = _c.b; }
    }
  } else if (c && typeof c === 'object' && typeof c.v === 'function') {
    for (let i = 0; i < n; i++) {
      toColor(c.v(P.getX(i), P.getY(i), P.getZ(i), N.getX(i), N.getY(i), N.getZ(i)), _c);
      arr[i * 3] = _c.r; arr[i * 3 + 1] = _c.g; arr[i * 3 + 2] = _c.b;
    }
  } else {
    toColor(c ?? 0xffffff, _c);
    for (let i = 0; i < n; i++) { arr[i * 3] = _c.r; arr[i * 3 + 1] = _c.g; arr[i * 3 + 2] = _c.b; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

/** Sammel-Geometrie aus farbigen Grundkörpern (siehe Kopfkommentar). Eingabe-Geometrien werden verbraucht. */
export class Build {
  constructor() { this.parts = []; }
  /** Beliebige Geometrie (wird entsorgt) mit Farbe und Lage ({p,r,s} oder Matrix4). */
  add(g0, color, o) {
    const g = g0.index ? g0.toNonIndexed() : g0.clone();
    g0.dispose();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    g.clearGroups();
    paint(g, color);
    if (o) g.applyMatrix4(xf(o));
    this.parts.push(g);
    return this;
  }
  sphere(r, color, o, ws = 18, hs = 12) { return this.add(new THREE.SphereGeometry(r, ws, hs), color, o); }
  /** Kugelausschnitt (Kuppel): theta = Öffnungswinkel von oben (π/2 = Halbkugel). */
  dome(r, color, o, theta = Math.PI / 2, ws = 20, hs = 8) { return this.add(new THREE.SphereGeometry(r, ws, hs, 0, TAU, 0, theta), color, o); }
  capsule(r, len, color, o, cs = 4, rs = 12) { return this.add(new THREE.CapsuleGeometry(r, len, cs, rs), color, o); }
  cyl(rt, rb, h, color, o, rs = 16, open = false) { return this.add(new THREE.CylinderGeometry(rt, rb, h, rs, 1, open), color, o); }
  cone(r, h, color, o, rs = 12) { return this.add(new THREE.ConeGeometry(r, h, rs), color, o); }
  torus(R, t, color, o, rs = 10, ts = 24, arc = TAU) { return this.add(new THREE.TorusGeometry(R, t, rs, ts, arc), color, o); }
  /** Quader mit runden Kanten (Mitte im Ursprung). */
  box(w, h, d, color, o, r = 0.05, seg = 2) { return this.add(r > 0 ? roundedBox(w, h, d, r, SIDE.ALL, 0, seg) : new THREE.BoxGeometry(w, h, d), color, o); }
  /** Drehkörper aus [r, y]-Punkten um die Y-Achse (smooth > 0: Profil per Catmull-Rom verfeinern). */
  lathe(pts, color, o, seg = 24, smooth = 0) {
    const pp = smooth > 0 ? smoothProfile(pts, smooth) : pts;
    return this.add(new THREE.LatheGeometry(pp.map(([x, y]) => new THREE.Vector2(x, y)), seg), color, o);
  }
  /** Extrusion einer Form (Fläche in XY, Tiefe entlang +Z, mittig zentriert). */
  extrude(shape, depth, color, o, bevel = 0, curveSegments = 6, bevelSegments = 2, smooth = false) {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments, curveSegments });
    g.translate(0, 0, -depth / 2);
    return this.add(smooth ? smoothNormals(g) : g, color, o);
  }
  tube(points, r, color, o, seg = 24, rs = 8) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    return this.add(new THREE.TubeGeometry(curve, seg, r, rs, false), color, o);
  }
  /** Alle Teile zu einer Geometrie (position, normal, color). */
  geometry() {
    const g = mergeGeometries(this.parts, false);
    for (const p of this.parts) p.dispose();
    this.parts = [];
    g.computeBoundingSphere();
    return g;
  }
}

/** Kugelkappe (Einheitskugel, Öffnungswinkel theta um +Z) – für Augen/Aufkleber, von denen nur die Vorderseite zu sehen ist. */
export function capGeo(theta = Math.PI / 2, ws = 12, hs = 4) {
  const g = new THREE.SphereGeometry(1, ws, hs, 0, TAU, 0, theta);
  g.rotateX(Math.PI / 2);
  return g;
}

/** Mesh mit Lage und Schattenwurf. */
export function mesh(g, m, o = {}, shadow = false) {
  const me = new THREE.Mesh(g, m);
  const p = o.p ?? [0, 0, 0], r = o.r ?? [0, 0, 0];
  me.position.set(p[0], p[1], p[2]);
  me.rotation.set(r[0], r[1], r[2]);
  if (o.s !== undefined) { if (typeof o.s === 'number') me.scale.setScalar(o.s); else me.scale.set(...o.s); }
  me.castShadow = !!shadow;
  return me;
}

/** Gruppe (Gelenk) an Position p mit Kindern. */
export function joint(p = [0, 0, 0], ...children) {
  const g = new THREE.Group();
  g.position.set(p[0], p[1], p[2]);
  for (const c of children) if (c) g.add(c);
  return g;
}

// ------------------------------------------------------------------ Muster-Hilfen
/** Punkte auf einer Kugel/Kuppel: dirs = [[x,y,z], …] (Richtungen), rad = Winkelradius. */
export function spots(base, spot, dirs, rad = 0.35) {
  const ds = dirs.map((d) => new THREE.Vector3(...d).normalize());
  const cosR = Math.cos(rad);
  return (x, y, z) => {
    const l = Math.hypot(x, y, z) || 1;
    for (const d of ds) if ((x * d.x + y * d.y + z * d.z) / l > cosR) return spot;
    return base;
  };
}
/** Richtung aus Azimut (0 = +X, π/2 = +Z) und Höhe (0 = Äquator). */
export const dirAE = (az, el) => [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)];

/**
 * Punkt und Normale auf einem Drehkörper (Profil [[r, y], …]): Strahl von (0, yc, 0) in Richtung (az, el).
 * Liefert { p, n } (Vector3) oder null.
 */
export function onLathe(pts, yc, az, el) {
  const dx = Math.cos(el), dy = Math.sin(el);
  let best = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const [r0, y0] = pts[i], [r1, y1] = pts[i + 1];
    const ex = r1 - r0, ey = y1 - y0;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((r0) * ey - (y0 - yc) * ex) / den;
    const u = ((r0) * dy - (y0 - yc) * dx) / den;
    if (t > 0 && u >= 0 && u <= 1 && (!best || t < best.t)) best = { t, ex, ey };
  }
  if (!best) return null;
  const rr = dx * best.t, yy = yc + dy * best.t;
  // Normale des Profilsegments (nach außen), um az gedreht
  let nr = best.ey, ny = -best.ex;
  const l = Math.hypot(nr, ny) || 1; nr /= l; ny /= l;
  if (nr * dx + ny * dy < 0) { nr = -nr; ny = -ny; }
  return { p: new THREE.Vector3(rr * Math.cos(az), yy, rr * Math.sin(az)), n: new THREE.Vector3(nr * Math.cos(az), ny, nr * Math.sin(az)).normalize() };
}
/** Punkt und Normale auf einem Ellipsoid (Mitte c, Halbachsen rad) in Richtung (az, el). */
export function onEllipsoid(c, rad, az, el) {
  const d = dirAE(az, el);
  const p = new THREE.Vector3(c[0] + d[0] * rad[0], c[1] + d[1] * rad[1], c[2] + d[2] * rad[2]);
  const n = new THREE.Vector3(d[0] / rad[0], d[1] / rad[1], d[2] / rad[2]).normalize();
  return { p, n };
}
/**
 * Aufkleber auf eine Fläche setzen: hits = [{ p, n, r?, color?, spin? }], r = Radius, thick = Dicke (Anteil von r),
 * shape = 'sphere' (flache Kugel) | 'hex' (Sechseck-Platte) | 'star' (Sternchen) | 'disc'. Gleiche Farbe, ein Build.
 */
export function decals(b, hits, r, color, thick = 0.25, shape = 'sphere') {
  for (const h of hits) {
    if (!h) continue;
    const rr = h.r ?? r;
    let g;
    if (shape === 'hex') { g = new THREE.CylinderGeometry(1, 1, 1, 6); g.rotateX(Math.PI / 2); }
    else if (shape === 'disc') { g = new THREE.CylinderGeometry(1, 1, 1, 18); g.rotateX(Math.PI / 2); }
    else if (shape === 'star') { g = puffyStarGeo(1, 0.48, 0.5, 0.18); }
    else g = capGeo(Math.PI / 2, 12, 3);
    if (h.spin) g.rotateZ(h.spin);
    const m = placed(h.p.clone().addScaledVector(h.n, -rr * thick * 0.35), h.n, new THREE.Vector3(rr, rr, rr * thick));
    b.add(g, h.color ?? color, m);
  }
  return b;
}
/** Profil verfeinern (Catmull-Rom durch die Stützpunkte, n Zwischenschritte je Abschnitt). */
export function smoothProfile(pts, n = 3) {
  const v = pts.map(([x, y]) => new THREE.Vector2(x, y));
  const out = [];
  for (let i = 0; i < v.length - 1; i++) {
    const p0 = v[Math.max(0, i - 1)], p1 = v[i], p2 = v[i + 1], p3 = v[Math.min(v.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([Math.max(0, f(p0.x, p1.x, p2.x, p3.x)), f(p0.y, p1.y, p2.y, p3.y)]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/**
 * InstancedMesh mit festem Sichtbarkeits-Volumen (Kugel um (0, cy, 0)), damit sich bewegende Instanzen
 * nicht falsch weggeschnitten werden. Instanzen über setMatrixAt / setInst setzen.
 */
export function instMesh(geometry, material, count, radius = 1.5, cy = 0.5) {
  const m = new THREE.InstancedMesh(geometry, material, count);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, cy, 0), radius);
  m.boundingBox = new THREE.Box3(new THREE.Vector3(-radius, cy - radius, -radius), new THREE.Vector3(radius, cy + radius, radius));
  return m;
}
const _im = new THREE.Matrix4();
/** Instanz-Matrix aus Lage, Drehung (Euler XYZ) und Skalierung. */
export function setInst(m, i, x, y, z, rx = 0, ry = 0, rz = 0, s = 1) {
  _q.setFromEuler(_e.set(rx, ry, rz));
  if (typeof s === 'number') _s.setScalar(s); else _s.set(s[0], s[1], s[2]);
  m.setMatrixAt(i, _im.compose(_p.set(x, y, z), _q, _s));
}

// ------------------------------------------------------------------ Formen
/** Stern mit n Zacken (Außenradius R, Innenradius r), Spitze nach +Y. */
export function starShape(R, r, n = 5) {
  const s = new THREE.Shape();
  for (let i = 0; i <= n * 2; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / n;
    const rr = i % 2 ? r : R;
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  return s;
}
/** Vierzackiger Funkel (konkave Kanten), Radius R. */
export function sparkShape(R, k = 0.16) {
  const s = new THREE.Shape(), c = R * k;
  s.moveTo(0, R);
  s.quadraticCurveTo(c, c, R, 0); s.quadraticCurveTo(c, -c, 0, -R);
  s.quadraticCurveTo(-c, -c, -R, 0); s.quadraticCurveTo(-c, c, 0, R);
  return s;
}
/** Herz (Breite ≈ 2·w), Spitze unten, Mitte etwa im Ursprung. */
export function heartShape(w) {
  const s = new THREE.Shape();
  s.moveTo(0, -w * 0.95);
  s.bezierCurveTo(w * 0.35, -w * 0.55, w * 1.05, -w * 0.15, w * 1.0, w * 0.35);
  s.bezierCurveTo(w * 0.95, w * 0.85, w * 0.3, w * 0.98, 0, w * 0.55);
  s.bezierCurveTo(-w * 0.3, w * 0.98, -w * 0.95, w * 0.85, -w * 1.0, w * 0.35);
  s.bezierCurveTo(-w * 1.05, -w * 0.15, -w * 0.35, -w * 0.55, 0, -w * 0.95);
  return s;
}
/** Kreis als Form. */
export function circleShape(r, x = 0, y = 0, sx = 1, sy = 1) {
  const s = new THREE.Shape();
  s.absellipse(x, y, r * sx, r * sy, 0, TAU, false, 0);
  return s;
}
/** Weiche Normalen: gleiche Positionen verschmelzen, Normalen mitteln (für puffige Extrusionen). */
export function smoothNormals(g0) {
  const g = g0.index ? g0.toNonIndexed() : g0.clone();
  g0.dispose();
  for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k);
  const m = mergeVertices(g, 1e-4);
  g.dispose();
  m.computeVertexNormals();
  const out = m.toNonIndexed();
  m.dispose();
  return out;
}
/** Puffiger Stern (extrudiert mit runder Fase, weiche Normalen), Fläche zeigt nach +Z, Mitte im Ursprung. */
export function puffyStarGeo(R, r, depth, bevel, n = 5) {
  const g = new THREE.ExtrudeGeometry(starShape(R, r, n), { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.9, bevelSegments: 5, curveSegments: 1 });
  g.translate(0, 0, -depth / 2);
  return smoothNormals(g);
}

// ------------------------------------------------------------------ Augen
const EYE_SETS = new Map(); // Augen-Geometrien je Schlüssel (o.key)
/**
 * Augenpaar (oder mehr) als zwei Meshes in einer Gruppe auf Augenhöhe: [Weiß+Iris+Pupille vertexgefärbt,
 * Glanzpunkte unbeleuchtet]. Blinzeln: group.userData.blink(k) skaliert die Augen in Y (k = 1 offen).
 * list: [{ p: [x,y,z], r, sy?, dir? }] – dir Standard: von der Kopfmitte o.center aus (oder +X).
 * o: { center, iris, pupil (Anteil von r), slit, pupilColor, white, depth, look: [dy, dz], key }
 */
export function eyes(list, o = {}) {
  const make = () => {
    const w = new Build(), h = new Build();
    const eyeY = list.reduce((a, e) => a + e.p[1], 0) / list.length;
    const up = new THREE.Vector3(0, 1, 0);
    for (const e of list) {
      const p = new THREE.Vector3(e.p[0], e.p[1] - eyeY, e.p[2]);
      const d = new THREE.Vector3(...(e.dir ?? (o.center ? [e.p[0] - o.center[0], e.p[1] - o.center[1], e.p[2] - o.center[2]] : [1, 0, 0]))).normalize();
      const r = e.r, sy = e.sy ?? o.sy ?? 1.2, dep = o.depth ?? 0.55;
      const side = new THREE.Vector3().crossVectors(up, d).normalize(); // bei Blick +X: −Z
      const lk = o.look ?? [0, 0];
      const off = new THREE.Vector3().addScaledVector(up, lk[0] * r).addScaledVector(side, -lk[1] * r * Math.sign(e.p[2] || 1));
      const front = p.clone().addScaledVector(d, r * dep).add(off);
      w.add(capGeo(Math.PI * 0.62, 16, 7), o.white ?? 0xffffff, placed(p, d, new THREE.Vector3(r, r * sy, r * dep)));
      const pr = r * (o.pupil ?? 0.5);
      if (o.iris) w.add(capGeo(Math.PI / 2, 14, 4), o.iris, placed(front.clone().addScaledVector(d, -pr * 0.5), d, new THREE.Vector3(pr * 1.45, pr * 1.45 * sy, pr * 0.62)));
      const pw = o.slit ? pr * 0.42 : pr;
      w.add(capGeo(Math.PI / 2, 12, 4), o.pupilColor ?? 0x15101c, placed(front.clone().addScaledVector(d, -pr * 0.36), d, new THREE.Vector3(pw, pr * sy * (o.slit ? 1.3 : 1.05), pr * 0.6)));
      const h1 = front.clone().addScaledVector(d, pr * 0.2).addScaledVector(up, pr * sy * 0.42).addScaledVector(side, pr * 0.42);
      const h2 = front.clone().addScaledVector(d, pr * 0.2).addScaledVector(up, -pr * sy * 0.5).addScaledVector(side, -pr * 0.35);
      h.add(capGeo(Math.PI / 2, 8, 3), 0xffffff, placed(h1, d, new THREE.Vector3(r * 0.2, r * 0.24, r * 0.12)));
      h.add(capGeo(Math.PI / 2, 6, 2), 0xffffff, placed(h2, d, new THREE.Vector3(r * 0.09, r * 0.09, r * 0.06)));
    }
    return { w: w.geometry(), h: h.geometry(), eyeY };
  };
  let geos = o.key ? EYE_SETS.get(o.key) : null;
  if (!geos) { geos = make(); if (o.key) EYE_SETS.set(o.key, geos); }
  const eyeMesh = new THREE.Mesh(geos.w, vcol(0.16, {}, 'eye'));
  const hl = new THREE.Mesh(geos.h, basic('white', { color: 0xffffff }));
  const g = new THREE.Group();
  g.position.y = geos.eyeY;
  g.add(eyeMesh, hl);
  g.userData.blink = (k) => { eyeMesh.scale.y = Math.max(0.06, k); hl.visible = k > 0.5; };
  g.userData.eyes = eyeMesh; g.userData.hl = hl;
  return g;
}

// ------------------------------------------------------------------ Schwindel-Sterne, Ausrufezeichen
/** Drei kreisende gelbe Sternchen (ein Mesh). Drehen: mesh.rotation.y. */
export function dizzyStars(R = 0.3, size = 0.08) {
  const g = cached(`dizzy:${R}:${size}`, () => {
    const b = new Build();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU;
      b.add(puffyStarGeo(size, size * 0.45, size * 0.35, size * 0.12), i === 1 ? 0xfff3a0 : 0xffd21f, { p: [Math.cos(a) * R, Math.sin(a * 2) * 0.03, Math.sin(a) * R], r: [0, -a + Math.PI / 2, 0.3] });
    }
    return b.geometry();
  });
  const m = new THREE.Mesh(g, vcol(0.3, { emissive: 0x6a5000 }, 'glow1'));
  m.visible = false;
  return m;
}
/** Rotes Ausrufezeichen mit weißem Rand (Alarm), Unterkante bei y = 0, ≈ 0,45 hoch. */
export function alertMark(s = 1) {
  const g = cached(`alert:${s}`, () => {
    const b = new Build();
    b.capsule(0.055 * s, 0.17 * s, 0xff2a2a, { p: [0, 0.27 * s, 0] });
    b.sphere(0.06 * s, 0xff2a2a, { p: [0, 0.07 * s, 0] }, 12, 8);
    b.capsule(0.085 * s, 0.17 * s, 0xffffff, { p: [-0.02, 0.27 * s, 0], s: [0.6, 1.05, 1.25] });
    b.sphere(0.09 * s, 0xffffff, { p: [-0.02, 0.07 * s, 0], s: [0.6, 1, 1.25] }, 12, 8);
    return b.geometry();
  });
  const m = new THREE.Mesh(g, vcol(0.4, { emissive: 0x401010 }, 'alert'));
  m.visible = false;
  return m;
}

/** Leuchtender Schein (Sprite, additiv). */
export function glowSprite(color = 0xffffff, size = 1, opacity = 0.7) {
  const sp = new THREE.Sprite(spriteMat(`glow:${color}:${opacity}`, { map: glowTexture(), color, blending: THREE.AdditiveBlending, opacity }));
  sp.scale.setScalar(size);
  return sp;
}
/** Funkel-Sprite (vierzackig, additiv). */
export function sparkleSprite(color = 0xffffff, size = 0.4) {
  const sp = new THREE.Sprite(spriteMat(`sparkle:${color}`, { map: sparkleTexture(), color, blending: THREE.AdditiveBlending }));
  sp.scale.setScalar(size);
  return sp;
}

// ------------------------------------------------------------------ Bitcoin-Prägung (wie src/three/avatars/items.js)
function btcPath(ctx, color, lw) {
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-1.0, -2.3); ctx.lineTo(-1.0, 2.3);
  ctx.moveTo(-1.0, -2.3); ctx.lineTo(0.3, -2.3);
  ctx.arc(0.3, -1.15, 1.15, -Math.PI / 2, Math.PI / 2); ctx.lineTo(-1.0, 0);
  ctx.moveTo(-1.0, 0); ctx.lineTo(0.55, 0);
  ctx.arc(0.55, 1.15, 1.15, -Math.PI / 2, Math.PI / 2); ctx.lineTo(-1.0, 2.3);
  for (const x of [-0.35, 0.55]) { ctx.moveTo(x, -3.0); ctx.lineTo(x, -2.3); ctx.moveTo(x, 2.3); ctx.lineTo(x, 3.0); }
  ctx.stroke();
}
/** Münzfläche mit ₿-Relief (base = Grundfarbe, shadow/light = Reliefkanten als rgba-Strings). */
export function coinFaceTexture(key, base, shadow, light, glyph = '#fff8ee') {
  return canvasTexture(`cm:coinFace:${key}`, 256, 256, (ctx, w, h) => {
    const cx = w / 2, cy = h / 2, r = w / 2;
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    const ring = ctx.createLinearGradient(0, 0, 0, h);
    ring.addColorStop(0, shadow); ring.addColorStop(0.5, 'rgba(0,0,0,0.05)'); ring.addColorStop(1, light);
    ctx.lineWidth = r * 0.12; ctx.strokeStyle = ring;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.93, 0, TAU); ctx.stroke();
    const s = r * 0.215, lw = 0.95;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(0.2); ctx.scale(s, s);
    ctx.save(); ctx.translate(0.17, 0.17); btcPath(ctx, shadow, lw); ctx.restore();
    ctx.save(); ctx.translate(-0.09, -0.09); btcPath(ctx, light, lw); ctx.restore();
    btcPath(ctx, glyph, lw);
    ctx.restore();
  });
}
/** Münzkörper-Profil (Randwulst, leicht vertiefte Flächen); detail = Segmente. Achse Y (vor dem Drehen). */
export function coinBodyGeo(detail = 40) {
  return cached(`coinBody:${detail}`, () => {
    const prof = detail >= 32
      ? [[0, 0.055], [0.29, 0.055], [0.32, 0.068], [0.36, 0.07], [0.385, 0.055], [0.4, 0.025], [0.4, -0.025], [0.385, -0.055], [0.36, -0.07], [0.32, -0.068], [0.29, -0.055], [0, -0.055]]
      : [[0, 0.055], [0.3, 0.055], [0.36, 0.07], [0.4, 0.03], [0.4, -0.03], [0.36, -0.07], [0.3, -0.055], [0, -0.055]];
    const g = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), detail);
    g.rotateX(Math.PI / 2); // Achse → Z (Flächen zeigen nach ±Z)
    return g;
  });
}
/** Beide ₿-Flächen (Kreise bei z = ±0,058, Rückseite gedreht). */
export function coinFacesGeo(detail = 36) {
  return cached(`coinFaces:${detail}`, () => {
    const a = new THREE.CircleGeometry(0.305, detail); a.translate(0, 0, 0.058);
    const b = new THREE.CircleGeometry(0.305, detail); b.rotateY(Math.PI); b.translate(0, 0, -0.058);
    const g = mergeGeometries([a, b], false); a.dispose(); b.dispose();
    return g;
  });
}

/** Münz-Stile (Bitcoin orange, Schalter-Münze blau) und ihre geteilten Materialien. */
export const COIN_STYLE = {
  coin: { body: 0xf7931a, emissive: 0x2a1200, face: ['orange', '#f7931a', 'rgba(110,50,0,0.6)', 'rgba(255,235,200,0.7)'] },
  coin_blue: { body: 0x2f7ae8, emissive: 0x06142e, face: ['blue', '#2f7ae8', 'rgba(10,30,90,0.6)', 'rgba(200,225,255,0.75)'] },
};
export function coinMaterials(kind) {
  const c = COIN_STYLE[kind] ?? COIN_STYLE.coin;
  return {
    body: metal(`coinBody:${kind}`, { color: c.body, metalness: 0.55, roughness: 0.28, emissive: c.emissive }, 1.0),
    face: metal(`coinFace:${kind}`, { map: coinFaceTexture(...c.face), metalness: 0.35, roughness: 0.32, emissive: c.emissive, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }, 0.9),
  };
}

// ------------------------------------------------------------------ Zustand und Modell
/** state normalisieren: String → { anim }, fehlend → {}. */
export const S = (state) => (typeof state === 'string' ? { anim: state } : state ?? {});

/** Zeit seit Start und seit dem letzten Zustandswechsel. */
export class Clock {
  constructor() { this.t = Math.random() * 10; this.age = 0; this.anim = undefined; this.prev = undefined; this.entered = false; }
  tick(dt, anim) {
    this.t += dt;
    if (anim !== this.anim) { this.prev = this.anim; this.anim = anim; this.age = 0; this.entered = true; }
    else { this.age += dt; this.entered = false; }
    return this;
  }
}

/** Sinus-Welle (Frequenz in Hz). */
export const wave = (t, hz, phase = 0) => Math.sin(t * hz * TAU + phase);

/**
 * Modell-Objekt nach Vertrag: { root, update(dt, state), dispose() }.
 * own = modell-eigene Ressourcen (Materialien/Geometrien), die dispose() freigibt.
 */
export function makeModel(name, root, update, own = [], extra = {}) {
  root.name = `modell:${name}`;
  root.userData.modelName = name;
  const model = {
    root,
    update(dt, state) { update(Math.min(Math.max(dt || 0, 0), 0.1), S(state)); },
    dispose() {
      // Instanz-Puffer (Beine, Räder, Splitter …) gehören dem Modell; Geometrien/Materialien sind geteilt
      root.traverse((o) => { if (o.isInstancedMesh && !own.includes(o)) o.dispose(); });
      for (const x of own) x?.dispose?.();
      own.length = 0;
      root.removeFromParent();
    },
    ...extra,
  };
  model.update(0, { anim: extra.initial });
  return model;
}

/** Schatten für alle Meshes einer Gruppe setzen (Körper). */
export function shadows(obj, cast = true, receive = false) {
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = receive; } });
  return obj;
}
