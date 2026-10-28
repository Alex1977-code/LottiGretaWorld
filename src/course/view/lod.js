// Detailstufen für ferne Exemplare (Präzisierung „Leistung und Level-Haken 2“). Nur Darstellung, gleiche Materialien
// wie die Vorlage – nur sparsamere Geometrie.
//
// Entitäts-Modelle (EntityInstancer, nach Art; Entität `lod = false` schaltet ab, `lod = { dist, make, anchor, keep }`
// setzt eine eigene):
//   flatterkaefer, krabbelkaefer   Registry-Käfer ≈ 4500 Dreiecke → sparsame Nachbildung ≈ 650 (Panzer mit Punkten,
//                                  Kopf, Augen, Fühler, Beine) ab 22 m Kameraabstand (Entität `lodDist` ändert den
//                                  Abstand); die Flügel des Modells bleiben
//   stachelkugel, stachelkugel_wurf  Registry-Stachelkugel ≈ 5,7 k Dreiecke → die sparsame Kugel derselben Bibliothek
//                                  (spikeBallGeo lo, ≈ 0,9 k, gleiche Farben/Stacheln) ab 24 m Kameraabstand
//                                  (Präzisierung „Motor-Feinschliff nach Welt 6“)
//
// Schatten-Stellvertreter (shadowStandIn(geometry) → sparsame Geometrie | null): Geometrien, deren Umriss auch sparsam
// gleich aussieht, zeichnen im Schattenpass (EntityInstancer) immer die Vorlage – Stachelkugel (hi → lo).
//
// Motor-Pools nach Pool-Name (view.pool übernimmt sie automatisch, solange der Aufrufer keine eigene `lod`-Angabe
// macht):
//   coin                     Münze (Motor-Vorlage, ≈ 430 Dreiecke) → ≈ 110 Dreiecke ab 30 m
//   block:question|coinblock ?-Block (Registry question_block, ≈ 3 k) → Modell-Stufe 'low' ab 28 m
//   block:used, block:brick  benutzter Block / Ziegel → Modell-Stufe 'low' ab 28 m
// Die Modell-Stufen ('low') liefert models/lib/blockGeos.js selbst (für Instanzen gedacht); erkannt wird die Vorlage
// an ihrer Geometrie – passt sie nicht (Modell geändert), gibt es keine Detailstufe.

import * as THREE from 'three';
import { questionGeo, usedGeo, brickGeo } from '../models/lib/blockGeos.js';
import { colorize, merge, lin, mixc, smooth } from '../../three/world/geometry.js';
import { hex } from '../blocks/kit.js';
import { spikeBallGeo } from '../models/lib/w6Geos.js';

const cache = new Map();
const once = (k, f) => { let v = cache.get(k); if (!v) { v = f(); cache.set(k, v); } return v; };

function meshesOf(root) {
  const out = [];
  root.traverse((o) => { if (o.isMesh && !o.isInstancedMesh) out.push(o); });
  return out;
}

/** Münze: gleiche Form (Rand, Wulst, Prägefläche), 10 statt 18 Segmente, gröberes Randprofil. */
function coinLow(base) {
  const ms = meshesOf(base);
  if (ms.length !== 2) return null;
  const [body, faces] = ms;
  const root = new THREE.Group();
  const bg = once('coin:low:body', () => {
    const prof = [[0, 0.055], [0.3, 0.06], [0.36, 0.07], [0.4, 0.03], [0.4, -0.03], [0.36, -0.07], [0.3, -0.06], [0, -0.055]];
    const g = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 10);
    g.rotateX(Math.PI / 2);
    return g;
  });
  const fg = once('coin:low:faces', () => {
    const a = new THREE.CircleGeometry(0.3, 10); a.translate(0, 0, 0.057);
    const b = new THREE.CircleGeometry(0.3, 10); b.rotateY(Math.PI); b.translate(0, 0, -0.057);
    const g = new THREE.BufferGeometry();
    const pos = [], nor = [], uv = [];
    for (const x of [a, b]) { const ni = x.toNonIndexed(); pos.push(...ni.attributes.position.array); nor.push(...ni.attributes.normal.array); uv.push(...ni.attributes.uv.array); }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    return g;
  });
  const m1 = new THREE.Mesh(bg, body.material); m1.position.copy(body.position);
  const m2 = new THREE.Mesh(fg, faces.material); m2.position.copy(faces.position);
  root.add(m1, m2);
  return root;
}

/** Block mit genau einem Körper-Mesh aus blockGeos ('high') → gleiche Lage, Geometrie 'low'. */
function blockLow(base) {
  const ms = meshesOf(base);
  if (ms.length !== 1) return null;
  const m = ms[0];
  const pairs = [[questionGeo('high'), () => questionGeo('low')], [usedGeo('high'), () => usedGeo('low')], [brickGeo('high'), () => brickGeo('low')]];
  const hit = pairs.find(([g]) => g === m.geometry);
  if (!hit) return null;
  base.updateMatrixWorld(true);
  const root = new THREE.Group();
  const low = new THREE.Mesh(hit[1](), m.material);
  low.matrixAutoUpdate = false;
  low.matrix.copy(base.matrixWorld).invert().multiply(m.matrixWorld);
  root.add(low);
  return root;
}

const POOL_LOD = {
  coin: { dist: 30, make: coinLow },
  'block:question': { dist: 28, make: blockLow },
  'block:coinblock': { dist: 28, make: blockLow },
  'block:used': { dist: 28, make: blockLow },
  'block:brick': { dist: 28, make: blockLow },
};

/** Detailstufe für einen Motor-Pool (oder null); make(base) bekommt die Vorlage. */
export function poolLod(name) { return POOL_LOD[name] ?? null; }

// ------------------------------------------------------------------ Entitäts-Modelle

const L = (c) => lin(hex(c));
const litFn = (c, k = 0.72) => {
  const M = L(c), T = [M[0] * 1.12, M[1] * 1.12, M[2] * 1.12], D = [M[0] * k, M[1] * k, M[2] * k];
  return (p, n, o) => (n.y >= 0 ? mixc(M, T, smooth(0, 0.9, n.y), o) : mixc(M, D, smooth(0, -0.9, n.y), o));
};
const fillc = (c) => (p, n, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; };
function sphere(r, x, y, z, color, o = {}) {
  const g = new THREE.SphereGeometry(r, o.ws ?? 8, o.hs ?? 6).toNonIndexed();
  g.scale(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1);
  g.translate(x, y, z);
  return colorize(g, litFn(color));
}
function cylC(r, h, color, seg) {
  return colorize(new THREE.CylinderGeometry(r, r, h, seg, 1, false).toNonIndexed(), litFn(color));
}
function plate(w, h, d, x, y, z, color) {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  const base = L(color), top = [base[0] * 1.1, base[1] * 1.1, base[2] * 1.1], low = [base[0] * 0.8, base[1] * 0.8, base[2] * 0.8];
  colorize(g, (p, n, out) => { const c = n.y > 0.5 ? top : n.y < -0.5 ? low : base; const k = 1 - Math.abs(n.x) * 0.06; out[0] = c[0] * k; out[1] = c[1] * k; out[2] = c[2] * k; });
  g.translate(x, y + h / 2, z);
  return g;
}

/** Sparsame Käfer-Nachbildung (Modellraum des Registry-Käfers, ≈ 650 Dreiecke; aus levels/w3/_helpers_b.js übernommen). */
function bugLowGeo(kind, color) {
  return once(`bug:low:${kind}:${color}`, () => {
    const COLS = { blue: 0x2f9bff, red: 0xff3a3a, green: 0x3ccf4a, yellow: 0xffcf22, pink: 0xff6fc0 };
    const shell = COLS[color] ?? COLS.blue, dark = 0x1f2a4a;
    const p = [];
    const cx = -0.03, cy = 0.17, rx = 0.3, ry = 0.3, rz = 0.27;
    const sh = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.56).toNonIndexed();
    sh.scale(rx, ry, rz); sh.translate(cx, cy, 0);
    p.push(colorize(sh, fillc(L(shell))));
    p.push(sphere(1, 0, 0.16, 0, dark, { sx: 0.28, sy: 0.12, sz: 0.25, ws: 8, hs: 4 }));
    for (const [az, el, r] of [[2.3, 0.75, 0.075], [-2.3, 0.75, 0.075], [1.55, 0.35, 0.065], [-1.55, 0.35, 0.065], [Math.PI, 0.25, 0.06], [0.9, 0.55, 0.055], [-0.9, 0.55, 0.055]]) {
      const dx = Math.cos(el) * Math.cos(az), dy = Math.sin(el), dz = Math.cos(el) * Math.sin(az);
      p.push(sphere(r * 0.9, cx + dx * rx * 0.99, cy + dy * ry * 0.99, dz * rz * 0.99, 0xffffff, { ws: 6, hs: 3, sy: 0.3 }));
    }
    p.push(sphere(0.16, 0.25, 0.22, 0, dark, { ws: 8, hs: 6 }));
    for (const s of [1, -1]) {
      p.push(sphere(0.075, 0.355, 0.255, s * 0.075, 0xffffff, { ws: 6, hs: 4, sy: 1.2 }), sphere(0.042, 0.415, 0.265, s * 0.088, 0x2a1a4a, { ws: 5, hs: 3 }));
      const ant = cylC(0.014, 0.24, dark, 4);
      ant.rotateZ(-0.45); ant.rotateX(s * 0.35); ant.translate(0.35, 0.43, s * 0.085);
      p.push(ant, sphere(0.04, 0.4, 0.54, s * 0.13, shell, { ws: 5, hs: 3 }));
      for (let i = 0; i < 3; i++) {
        const leg = plate(0.05, 0.14, 0.05, 0, -0.07, 0, dark);
        leg.rotateX(s * (kind === 'flatterkaefer' ? 0.6 : 0.35));
        leg.translate(0.13 - i * 0.13, 0.1, s * 0.19);
        p.push(leg);
      }
    }
    return merge(p);
  });
}

const bugMat = () => once('bug:low:mat', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 }));
const BUG_COLORS = new Set(['blue', 'red', 'green', 'yellow', 'pink']);
const BUG = {
  dist: 22,
  all: true,                                  // durchsichtige Flügel dürfen mit instanziert werden
  make(e) {
    const def = e.kind === 'flatterkaefer' ? 'pink' : 'blue';
    const c = BUG_COLORS.has(e.spec?.color) ? e.spec.color : def;
    const m = new THREE.Mesh(bugLowGeo(e.kind, c), bugMat());
    m.castShadow = true; m.receiveShadow = true;
    const root = new THREE.Group();
    root.add(m);
    return root;
  },
  anchor: (root) => root.children[0] ?? root, // Haltungs-Gelenk: Schweben und Plattdrücken wie das Modell
  keep: (m) => !!m.material?.transparent,     // Flügel
};

// ------------------------------------------------------------------ Stachelkugel (Welt 6)

const SPIKE_COLORS = new Set(['eisen', 'lila', 'rot']);
const STAND_IN = new Map();   // Geometrie → sparsame Geometrie (Schattenpass)

/** Registry-Stachelkugel: Kugel-Mesh mit der vollen Bibliotheks-Geometrie suchen (sonst keine Detailstufe). */
function spikeMeshOf(e) {
  const color = SPIKE_COLORS.has(e.spec?.color) ? e.spec.color : 'eisen';
  const hi = spikeBallGeo(color, false);
  let hit = null;
  e.model?.root?.traverse((o) => { if (!hit && o.isMesh && !o.isInstancedMesh && o.geometry === hi) hit = o; });
  if (!hit) return null;
  const lo = spikeBallGeo(color, true);
  STAND_IN.set(hi, lo);
  return { mesh: hit, lo };
}

const SPIKE = {
  dist: 24,
  make(e) {
    const s = spikeMeshOf(e);
    if (!s) return null;
    // Vorlage im Raum des Gelenks (anchor), das die Kugel dreht und skaliert
    const m = new THREE.Mesh(s.lo, s.mesh.material);
    m.matrixAutoUpdate = false;
    m.matrix.copy(s.mesh.matrix);
    m.castShadow = s.mesh.castShadow; m.receiveShadow = s.mesh.receiveShadow;
    const root = new THREE.Group();
    root.add(m);
    return root;
  },
  anchor: (root) => {
    let a = null;
    root.traverse((o) => { if (!a && o.isMesh && STAND_IN.has(o.geometry)) a = o.parent; });
    return a ?? root;
  },
  keep: (m) => m.renderOrder !== 0 || !!m.material?.transparent,   // Staubwolke beim Zerplatzen
};

/** Sparsame Geometrie für den Schattenpass (oder null). */
export function shadowStandIn(geo) { return STAND_IN.get(geo) ?? null; }

const MODEL_LOD = { flatterkaefer: BUG, krabbelkaefer: BUG, stachelkugel: SPIKE, stachelkugel_wurf: SPIKE };

/** Detailstufe für das Modell einer Entität (oder null). */
export function modelLod(e) {
  if (e.lod === false || e.spec?.lod === false) return null;
  return (e.lod && typeof e.lod === 'object' ? e.lod : null) ?? MODEL_LOD[e.kind] ?? null;
}
