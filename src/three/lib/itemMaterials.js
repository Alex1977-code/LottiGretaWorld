// Gemeinsame Bausteine der Gegner- und Objekt-Avatare (enemies.js, items.js):
//  - modulweite Caches für Materialien, Geometrien und Canvas-Texturen (werden nie entsorgt, klein),
//  - eine prozedurale Umgebungs-Textur (PMREM aus einem Himmel/Boden-Farbverlauf mit Sonne) für
//    metallische Oberflächen (Münze, Schlüssel, Beschläge) – ohne sie wirken Metalle ohne
//    Umgebungsspiegelung fast schwarz. Sie wird NICHT als scene.environment gesetzt, sondern nur
//    als envMap einzelner Materialien, damit die Welt- und Figuren-Module unberührt bleiben.
//  - kleine Animations-Helfer (damp).

import * as THREE from 'three';

const materials = new Map();
const geometries = new Map();
const textures = new Map();

/** Gecachtes MeshStandardMaterial (key eindeutig je Parametersatz). */
export function stdMat(key, params) {
  let m = materials.get(key);
  if (!m) { m = new THREE.MeshStandardMaterial(params); materials.set(key, m); }
  return m;
}

/** Gecachtes MeshBasicMaterial (unbeleuchtet: Glut, Glanz, Schein). */
export function basicMat(key, params) {
  let m = materials.get(key);
  if (!m) { m = new THREE.MeshBasicMaterial(params); materials.set(key, m); }
  return m;
}

/** Gecachte Geometrie; factory wird nur beim ersten Zugriff aufgerufen. */
export function geo(key, factory) {
  let g = geometries.get(key);
  if (!g) { g = factory(); geometries.set(key, g); }
  return g;
}

/**
 * Gecachte CanvasTexture: draw(ctx, w, h) zeichnet einmalig. Farbtexturen laufen in sRGB.
 * @param {string} key
 * @param {number} w
 * @param {number} h
 * @param {(ctx: CanvasRenderingContext2D, w: number, h: number) => void} draw
 * @param {{ srgb?: boolean, repeat?: boolean }} [opts]
 */
export function canvasTexture(key, w, h, draw, opts = {}) {
  let t = textures.get(key);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  t = new THREE.CanvasTexture(c);
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  if (opts.repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  textures.set(key, t);
  return t;
}

// ---------------------------------------------------------------------------------------------
// Umgebungs-Textur für Metalle
// ---------------------------------------------------------------------------------------------

let envTexture = null;
let envFailed = false;

/**
 * Liefert eine weiche Umgebungs-Textur (Himmelblau oben, warmer Horizont, Wiesengrün unten,
 * eine helle Sonne) – einmalig je Seite erzeugt. null, wenn der Renderer sie nicht erzeugen kann.
 * @param {THREE.WebGLRenderer} renderer
 */
export function getEnvMap(renderer) {
  if (envTexture || envFailed || !renderer) return envTexture;
  try {
    const scene = new THREE.Scene();
    const sky = new THREE.SphereGeometry(40, 32, 16);
    const pos = sky.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const top = new THREE.Color(0x4f9fe8), hor = new THREE.Color(0xfff1dc), bot = new THREE.Color(0x6f9d4a), deep = new THREE.Color(0x4a6a3a);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 40;
      if (y >= 0) c.copy(hor).lerp(top, Math.pow(y, 0.55));
      else c.copy(hor).lerp(bot, Math.min(1, -y * 3)).lerp(deep, Math.max(0, -y - 0.3));
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    sky.setAttribute('color', new THREE.BufferAttribute(col, 3));
    scene.add(new THREE.Mesh(sky, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    // Sonne (hell, HDR) oben links vorn – wie das gerichtete Licht der Welt
    const sun = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 5.6, 4.8) }));
    sun.position.set(-14, 26, 22);
    scene.add(sun);
    // zweiter, schwächerer Lichtfleck rechts, damit Kanten auf beiden Seiten glänzen
    const fill = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.7, 1.9) }));
    fill.position.set(22, 10, 18);
    scene.add(fill);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const target = pmrem.fromScene(scene, 0.05);
    pmrem.dispose();
    sky.dispose(); sun.geometry.dispose(); fill.geometry.dispose();
    envTexture = target.texture;
  } catch (e) {
    envFailed = true;
    envTexture = null;
  }
  return envTexture;
}

/** Metallisches Material mit Umgebungsspiegelung (gecacht; envMap wird nachgereicht, sobald ein Renderer da ist). */
export function metalMat(key, params, renderer, intensity = 1) {
  const m = stdMat(key, params);
  if (!m.envMap) {
    const env = getEnvMap(renderer);
    if (env) { m.envMap = env; m.envMapIntensity = intensity; m.needsUpdate = true; }
  }
  return m;
}

// ---------------------------------------------------------------------------------------------
// Geometrie zusammenführen (statische Teile mit gleichem Material → ein Mesh, ein Zeichenaufruf)
// ---------------------------------------------------------------------------------------------

const _mm = new THREE.Matrix4(), _mq = new THREE.Quaternion(), _me = new THREE.Euler(), _mp = new THREE.Vector3(), _ms = new THREE.Vector3();

/**
 * Führt mehrere Geometrien (jeweils mit Lage) zu einer nicht-indizierten BufferGeometry zusammen.
 * Die Eingaben werden entsorgt. Attribute: position, normal, uv.
 * @param {Array<[THREE.BufferGeometry, { pos?: number[], rot?: number[], scale?: number | number[] }?]>} parts
 */
export function mergeGeos(parts) {
  const pos = [], nor = [], uv = [];
  for (const [g0, o = {}] of parts) {
    const g = g0.index ? g0.toNonIndexed() : g0.clone();
    _mp.set(...(o.pos ?? [0, 0, 0]));
    _mq.setFromEuler(_me.set(...(o.rot ?? [0, 0, 0])));
    const sc = o.scale ?? 1;
    if (typeof sc === 'number') _ms.setScalar(sc); else _ms.set(...sc);
    g.applyMatrix4(_mm.compose(_mp, _mq, _ms));
    pos.push(g.attributes.position.array); nor.push(g.attributes.normal.array);
    uv.push(g.attributes.uv ? g.attributes.uv.array : new Float32Array(g.attributes.position.count * 2));
    g0.dispose();
  }
  const cat = (arrs) => {
    let n = 0; for (const a of arrs) n += a.length;
    const out = new Float32Array(n); let off = 0;
    for (const a of arrs) { out.set(a, off); off += a.length; }
    return out;
  };
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(cat(pos), 3));
  out.setAttribute('normal', new THREE.BufferAttribute(cat(nor), 3));
  out.setAttribute('uv', new THREE.BufferAttribute(cat(uv), 2));
  return out;
}

/** Instanz-Matrix aus Lage/Drehung/Skalierung setzen (für kleine animierte InstancedMeshes). */
export function setInstance(mesh, i, x, y, z, rx = 0, ry = 0, rz = 0, s = 1) {
  _mp.set(x, y, z); _mq.setFromEuler(_me.set(rx, ry, rz));
  if (typeof s === 'number') _ms.setScalar(s); else _ms.set(...s);
  mesh.setMatrixAt(i, _mm.compose(_mp, _mq, _ms));
}

/**
 * InstancedMesh mit festem Sichtbarkeits-Volumen: Die Instanzen bewegen sich nur wenig, also reicht
 * eine großzügige Kugel um den Fußpunkt – so bleibt das Frustum-Culling (Zeichenaufrufe!) erhalten.
 */
export function instanced(geometry, material, count, radius = 1.2, cy = 0.5) {
  const m = new THREE.InstancedMesh(geometry, material, count);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, cy, 0), radius);
  m.boundingBox = new THREE.Box3(new THREE.Vector3(-radius, cy - radius, -radius), new THREE.Vector3(radius, cy + radius, radius));
  return m;
}

// ---------------------------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------------------------

/** Exponentielle Annäherung an ein Ziel (bildratenunabhängig). lambda ≈ 1/s. */
export function damp(current, target, lambda, dt) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
}

/** Vektor/Euler-Komponenten weich an Zielwerte führen. */
export function dampVec(v, x, y, z, lambda, dt) {
  v.x = damp(v.x, x, lambda, dt);
  v.y = damp(v.y, y, lambda, dt);
  v.z = damp(v.z, z, lambda, dt);
}

// ---------------------------------------------------------------------------------------------
// Gemeinsame Texturen
// ---------------------------------------------------------------------------------------------

/** Weiches Leuchten (radialer Verlauf, weiß) – als additive Fläche für Schein/Glanz. */
export function glowTexture() {
  return canvasTexture('glow', 64, 64, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }, { srgb: false });
}

/** Vierzackiger Glitzerstern (weiß auf transparent). */
export function sparkleTexture() {
  return canvasTexture('sparkle', 64, 64, (ctx, w, h) => {
    const cx = w / 2, cy = h / 2, r = w * 0.48, k = w * 0.07;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(cx, cy - r);
    ctx.quadraticCurveTo(cx + k, cy - k, cx + r, cy); ctx.quadraticCurveTo(cx + k, cy + k, cx, cy + r);
    ctx.quadraticCurveTo(cx - k, cy + k, cx - r, cy); ctx.quadraticCurveTo(cx - k, cy - k, cx, cy - r);
    ctx.fill();
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.5);
    g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }, { srgb: false });
}

/**
 * Cartoon-Auge als Kugeltextur: Weiß mit dunkler Pupille und Glanzpunkt. Auf einer SphereGeometry
 * liegt die Texturmitte (u 0,5 / v 0,5) in +X-Richtung – also blickt das Auge nach vorn.
 * @param {string} key
 * @param {number} pupil Winkel-Radius der Pupille (rad)
 * @param {number} dy Blick nach oben/unten (-1..1)
 */
export function eyeTexture(key, pupil = 0.42, dy = 0) {
  return canvasTexture(key, 128, 64, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
    const rx = (pupil / (2 * Math.PI)) * w, ry = (pupil / Math.PI) * h;
    const cx = w / 2, cy = h / 2 - dy * h * 0.08;
    ctx.fillStyle = '#1a1020';
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a3a66';
    ctx.beginPath(); ctx.ellipse(cx, cy + ry * 0.25, rx * 0.6, ry * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(cx - rx * 0.38, cy - ry * 0.38, rx * 0.26, ry * 0.26, 0, 0, Math.PI * 2); ctx.fill();
  });
}

/** Material für Augenkugeln (gecacht je Textur). */
export function eyeMat(key = 'eye', pupil = 0.42, dy = 0) {
  return stdMat(`eyeMat:${key}`, { map: eyeTexture(`eyeTex:${key}`, pupil, dy), roughness: 0.15, metalness: 0 });
}
