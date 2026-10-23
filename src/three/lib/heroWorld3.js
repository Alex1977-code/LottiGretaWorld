// Bausteine der Heldinnen-Kostüme und -Effekte für Welt 3 („Schnee und Eis“), Code-generiert:
//  - leafSolidGeo     weiches Blatt als flacher Körper (Vorder- und Rückseite, Vertexfarben: Ansatz → Mitte → Spitze,
//                     heller Rand, Mittelader) – Blatt-Ohren des Gleitblatt-Kostüms und die Blattspitze am Schweif
//  - bushyTailGeo     buschiger, geringelter Schweif entlang +Y (Fell-Büschel, Ringe, Blattspitze), mit Skin-Gewichten
//                     für eine Knochenkette (biegt sich, wedelt, dreht als „Propeller“)
//  - skinChain        Skin-Gewichte für eine Knochenkette entlang +Y
//  - StoneSkin        tauscht alle Materialien einer Figur gegen Stein (Graustufen der Vertexfarben, matt, facettiert);
//                     gleiche Zeichenaufrufe, Rücktausch stellt die jeweils aktuellen Materialien wieder her
//  - PuffFx           wenige Kügelchen in einem InstancedMesh (ein Zeichenaufruf, kein Schatten): Staubwolke beim
//                     Aufkommen der Statue, Verwandlungs-Puff, Luftbläschen unter Wasser. Lage in Weltkoordinaten
//                     (bleiben stehen bzw. steigen senkrecht, auch wenn die Figur weiterschwimmt).
// Eigene Formen und Farben (Rechtliches: keine nachgebauten Kostüme).

import * as THREE from 'three';
import { clamp, lerp, smoothstep, sphere } from './figures.js';

const _c = new THREE.Color(), _c2 = new THREE.Color();

/**
 * Blatt als flacher, geschlossener Körper: Ansatz im Ursprung, Länge entlang +Y, Breite entlang X, Dicke entlang Z
 * (Vorderseite +Z). cup > 0 wölbt die Vorderseite hohl (Ränder nach vorn), bend biegt die Spitze nach vorn (+) bzw.
 * hinten (−). colors: { base, mid, tip, rim, vein } (Hex). Attribute: position, normal, uv, color (indiziert).
 */
export function leafSolidGeo({ len, half, thick, cup = 0, bend = 0, nu = 12, nv = 6, colors, round = 0.7 }) {
  const pos = [], col = [], uv = [], idx = [];
  const C = Object.fromEntries(Object.entries(colors).map(([k, v]) => [k, new THREE.Color(v)]));
  const width = (u) => half * Math.pow(Math.sin(Math.PI * Math.pow(u, round)), 0.85);
  for (const side of [1, -1]) {
    const start = pos.length / 3;
    for (let i = 0; i <= nu; i++) {
      const u = i / nu, w = width(u);
      for (let j = 0; j <= nv; j++) {
        const v = -1 + (2 * j) / nv;
        const zc = cup * v * v * (w / half) + bend * u * u;
        const z = zc + side * thick * 0.5 * Math.sqrt(Math.max(0, 1 - v * v)) * (1 - 0.65 * u);
        pos.push(v * w, u * len, z);
        uv.push(j / nv, u);
        // Farbe: Ansatz → Mitte → Spitze, Rand heller, Mittelader hell, Rückseite etwas dunkler
        if (u < 0.5) _c.copy(C.base).lerp(C.mid, smoothstep(u / 0.5)); else _c.copy(C.mid).lerp(C.tip, smoothstep((u - 0.5) / 0.5));
        const rim = smoothstep((Math.abs(v) - 0.62) / 0.38);
        if (C.rim) _c.lerp(C.rim, 0.75 * rim);
        if (C.vein && Math.abs(v) < 0.2 && u > 0.04 && u < 0.88) _c.lerp(C.vein, 0.7 * (1 - Math.abs(v) / 0.2));
        if (side < 0) _c.multiplyScalar(0.82);
        col.push(_c.r, _c.g, _c.b);
      }
    }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const a = start + i * (nv + 1) + j, b = a + 1, c = a + nv + 1, d = c + 1;
      if (side > 0) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
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
 * Buschiger Schweif entlang +Y (Ansatz bei y = 0, Länge len): dünner Ansatz, dicker Bausch bei ~60 %, runde Spitze;
 * spiralige Fell-Büschel, dunkle Ringe (rings: Mittelpunkte als Anteil der Länge), am Ende ein Blatt (leaf: Optionen
 * für leafSolidGeo, sitzt in der Spitze). Liefert Geometrie mit position/normal/uv/color.
 */
export function bushyTailGeo({ len, r0, rMax, fur = 0.08, segs = 14, rings = 26, base, stripe, tipC, ringAt = [0.26, 0.47, 0.68], ringW = 0.075, leaf = null }) {
  const pos = [], col = [], uv = [], idx = [];
  const B = new THREE.Color(base), S = new THREE.Color(stripe), T = new THREE.Color(tipC ?? base);
  const yMax = 0.6;
  const radius = (u) => {
    if (u <= yMax) return lerp(r0, rMax, Math.sin((Math.PI / 2) * (u / yMax)) ** 1.4) * Math.sqrt(Math.min(1, u / 0.035));   // Ansatz geschlossen
    const k = (u - yMax) / (1 - yMax);
    return rMax * Math.sqrt(Math.max(0, 1 - k * k));
  };
  for (let i = 0; i <= rings; i++) {
    const u = i / rings, y = u * len;
    const R = radius(u);
    for (let j = 0; j < segs; j++) {
      const th = (j / segs) * Math.PI * 2;
      const tuft = Math.sin(7 * th + 22 * y) * 0.6 + Math.sin(4 * th - 13 * y + 1.3) * 0.4;
      const r = R * (1 + fur * tuft * (i > 0 && i < rings ? 1 : 0));
      pos.push(r * Math.sin(th), y, r * Math.cos(th));
      uv.push(j / segs, u);
      let ring = 0;
      for (const a of ringAt) ring = Math.max(ring, 1 - smoothstep((Math.abs(u - a) - ringW * 0.5) / (ringW * 0.5)));
      _c.copy(B).lerp(T, smoothstep((u - 0.8) / 0.2)).lerp(S, ring);
      _c.multiplyScalar(0.84 + 0.2 * (0.5 + 0.5 * tuft));
      col.push(_c.r, _c.g, _c.b);
    }
  }
  for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) {
    const a = i * segs + j, b = i * segs + ((j + 1) % segs), c = a + segs, d = b + segs;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  if (!leaf) return g;
  // Blattspitze: Blatt steckt mit dem Ansatz in der Schweifspitze, zwei Blätter über Kreuz (von allen Seiten lesbar)
  const parts = [g];
  for (const ry of leaf.cross ? [0, Math.PI / 2] : [0]) {
    const lg = leafSolidGeo(leaf);
    lg.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(0, len * (leaf.at ?? 0.9), 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(leaf.tilt ?? 0, ry, 0)), new THREE.Vector3(1, 1, 1)));
    parts.push(lg);
  }
  return mergeIndexed(parts);
}

/** Indizierte Geometrien mit gleichen Attributen (position/normal/uv/color) aneinanderhängen. */
export function mergeIndexed(gs) {
  const names = ['position', 'normal', 'uv', 'color'];
  const out = new THREE.BufferGeometry();
  const arrs = Object.fromEntries(names.map((n) => [n, []]));
  const idx = [];
  let off = 0;
  for (const g of gs) {
    for (const n of names) arrs[n].push(...g.attributes[n].array);
    for (const i of g.index.array) idx.push(i + off);
    off += g.attributes.position.count;
  }
  out.setAttribute('position', new THREE.Float32BufferAttribute(arrs.position, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(arrs.normal, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(arrs.uv, 2));
  out.setAttribute('color', new THREE.Float32BufferAttribute(arrs.color, 3));
  out.setIndex(idx);
  for (const g of gs) g.dispose();
  return out;
}

/** Skin-Gewichte für eine Kette von Knochen an den Höhen ys (aufsteigend, entlang +Y): linear zwischen Nachbarn. */
export function skinChain(g, ys) {
  const pos = g.attributes.position, n = pos.count, last = ys.length - 1;
  const idx = new Uint16Array(n * 4), w = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const y = pos.getY(i);
    let k = 0;
    while (k < last && y > ys[k + 1]) k++;
    if (k >= last) { idx[i * 4] = last; w[i * 4] = 1; continue; }
    const f = smoothstep((y - ys[k]) / (ys[k + 1] - ys[k]));
    idx[i * 4] = k; idx[i * 4 + 1] = k + 1;
    w[i * 4] = 1 - f; w[i * 4 + 1] = f;
  }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(w, 4));
  return g;
}

// ------------------------------------------------------------------ Stein-Haut (Statue)
const STONE = new Map();
const STONE_TINT = new THREE.Color('#e4dfd5');
/** Stein-Material zum Original: Vertexfarben → Graustufen (Shader), sonst Grau aus der Helligkeit der Grundfarbe. */
function stoneFor(orig) {
  const vcol = !!orig.vertexColors, side = orig.side ?? THREE.FrontSide;
  let lum = 0.6;
  if (!vcol && orig.color) lum = orig.color.r * 0.3 + orig.color.g * 0.59 + orig.color.b * 0.11;
  const key = vcol ? `v:${side}` : `p:${side}:${Math.round(lum * 20)}`;
  let m = STONE.get(key);
  if (m) return m;
  m = new THREE.MeshStandardMaterial({ roughness: 0.96, metalness: 0, side, flatShading: true, vertexColors: vcol, emissive: 0x302e2a });
  if (vcol) {
    m.color.copy(STONE_TINT);
    m.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', [
        '#include <color_fragment>',
        '#ifdef USE_COLOR',
        '  float stoneLum = dot( vColor.rgb, vec3( 0.3, 0.59, 0.11 ) );',
        '  diffuseColor.rgb = diffuse * mix( 0.58, 1.05, sqrt( stoneLum ) );',
        '#endif',
      ].join('\n'));
    };
    m.customProgramCacheKey = () => 'hero-stone-v1';
  } else {
    m.color.copy(STONE_TINT).multiplyScalar(lerp(0.58, 1.05, Math.sqrt(clamp(lum, 0, 1))));
  }
  m.userData.stone = true;
  STONE.set(key, m);
  return m;
}

/**
 * Stein-Haut für alle Meshes unter root (außer skip(o) und unbeleuchteten Materialien): set(true) tauscht, set(false)
 * stellt die Materialien wieder her. Läuft set(true) jedes Bild, werden zwischenzeitliche Tausche (Kostüm, Glanz)
 * übernommen und beim Rücktausch berücksichtigt. Keine zusätzlichen Zeichenaufrufe.
 */
export class StoneSkin {
  constructor(root, skip = () => false) { this.root = root; this.skip = skip; this.on = false; this.list = []; }
  set(on) {
    on = !!on;
    if (on) {
      if (!this.on) {
        this.on = true; this.list = [];
        this.root.traverse((o) => {
          if (!o.isMesh || !o.material || this.skip(o) || !o.material.isMeshStandardMaterial) return;
          this.list.push({ mesh: o, keep: o.material });
        });
      }
      for (const e of this.list) {
        const m = e.mesh.material;
        if (!m.userData?.stone) e.keep = m;
        e.mesh.material = stoneFor(e.keep);
      }
      return;
    }
    if (!this.on) return;
    this.on = false;
    for (const e of this.list) if (e.mesh.material.userData?.stone) e.mesh.material = e.keep;
    this.list = [];
  }
}

// ------------------------------------------------------------------ Puff-Effekte (Staub, Bläschen)
const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
const _inv = new THREE.Matrix4();
let PUFF_MAT = null;

/** Wenige Kügelchen (InstancedMesh, ein Zeichenaufruf, kein Schatten); Lage in Weltkoordinaten, Größe in Einheiten des Elternteils. */
export class PuffFx {
  constructor(parent, n = 8) {
    PUFF_MAT ??= new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x8f9aa6, roughness: 0.8, metalness: 0, transparent: true, opacity: 0.9, depthWrite: false });
    this.mesh = new THREE.InstancedMesh(sphere(1, 10, 8), PUFF_MAT, n);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false; this.mesh.receiveShadow = false;
    this.mesh.visible = false;
    this.mesh.userData.fx = true;
    this.mesh.renderOrder = 4;
    for (let i = 0; i < n; i++) this.mesh.setColorAt(i, _c.set(0xffffff));
    parent.add(this.mesh);
    this.parent = parent;
    this.items = [];
    this.n = n;
  }

  /**
   * Staubwolke/Puff: k Bäusche im Kreis (Radius r, Welt) um p, laufen nach außen (spread · r je s) und steigen (up · r je s);
   * size = Größe (Einheiten des Elternteils), life in s.
   */
  dust(p, r, size, k = 6, color = '#efe9dd', o = {}) {
    const spread = o.spread ?? 1.6, up = o.up ?? 0.5, life = o.life ?? 0.6, yJit = o.yJit ?? 0;
    for (let i = 0; i < k; i++) {
      const a = (i / k) * Math.PI * 2 + Math.random() * 0.5;
      this.add({ kind: 'dust', x: p.x + Math.cos(a) * r, y: p.y + (Math.random() - 0.5) * yJit, z: p.z + Math.sin(a) * r, vx: Math.cos(a) * r * spread, vy: r * up, vz: Math.sin(a) * r * spread, life: life * (0.85 + 0.3 * Math.random()), size: size * (0.8 + 0.4 * Math.random()), color });
    }
  }

  /** Luftbläschen an p (Welt): steigen mit rise (Welt/s), wackeln seitlich. */
  bubbles(p, k, size, rise) {
    for (let i = 0; i < k; i++) {
      this.add({ kind: 'bubble', x: p.x, y: p.y - i * size * 0.6, z: p.z, vx: 0, vy: rise * (0.85 + 0.3 * Math.random()), vz: 0, life: 1.3 + 0.3 * Math.random(), delay: i * 0.16, size: size * (1 - 0.25 * i), color: '#dff6ff', seed: Math.random() * 6 });
    }
  }

  add(o) {
    if (this.items.length >= this.n) this.items.shift();
    this.items.push({ t: 0, delay: 0, ...o });
  }

  clear() { this.items.length = 0; this.mesh.visible = false; }

  /** Alle Kügelchen einer Art bald platzen lassen (z. B. Bläschen, wenn die Figur aus dem Wasser ist). */
  pop(kind) { for (const b of this.items) if (b.kind === kind && b.delay <= 0) b.life = Math.min(b.life, b.t + 0.12); else if (b.kind === kind) b.life = 0; }

  update(dt) {
    const it = this.items;
    for (let i = it.length - 1; i >= 0; i--) {
      const b = it[i];
      if (b.delay > 0) { b.delay -= dt; continue; }
      b.t += dt;
      if (b.t >= b.life) { it.splice(i, 1); continue; }
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      if (b.kind === 'dust') { const f = Math.exp(-4 * dt); b.vx *= f; b.vz *= f; b.vy *= f; }
    }
    this.mesh.visible = it.length > 0;
    if (!this.mesh.visible) return;
    this.parent.updateWorldMatrix(true, false);
    _inv.copy(this.parent.matrixWorld).invert();
    this.parent.matrixWorld.decompose(_p, _q, _s);
    const ws = _s.y || 1;
    let k = 0;
    for (const b of it) {
      let sz;
      if (b.delay > 0) sz = 0.0001;
      else if (b.kind === 'dust') sz = b.size * Math.pow(Math.sin(Math.PI * Math.min(1, b.t / b.life)), 0.6) * (0.6 + 0.6 * b.t / b.life);
      else sz = b.size * smoothstep(b.t / 0.12) * (1 - smoothstep((b.t - b.life + 0.12) / 0.12));
      const wob = b.kind === 'bubble' ? Math.sin(b.t * 9 + b.seed) * b.size * ws * 0.6 : 0;
      _p.set(b.x + wob, b.y, b.z + wob * 0.5).applyMatrix4(_inv);
      _m.compose(_p, _q.identity(), _s.setScalar(Math.max(1e-4, sz)));
      this.mesh.setMatrixAt(k, _m);
      this.mesh.setColorAt(k, _c2.set(b.color));
      k++;
    }
    this.mesh.count = k;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  dispose() { this.parent.remove(this.mesh); this.mesh.dispose(); }
}
