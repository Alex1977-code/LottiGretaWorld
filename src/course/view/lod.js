// Detailstufen für ferne Exemplare (Präzisierung „Leistung und Level-Haken 2“). Nur Darstellung, gleiche Materialien
// wie die Vorlage – nur sparsamere Geometrie. Für Motor-Pools nach Pool-Name (view.pool übernimmt sie automatisch,
// solange der Aufrufer keine eigene `lod`-Angabe macht):
//   coin                     Münze (Motor-Vorlage, ≈ 430 Dreiecke) → ≈ 110 Dreiecke ab 24 m
//   block:question|coinblock ?-Block (Registry question_block, ≈ 3 k) → Modell-Stufe 'low' ab 28 m
//   block:used, block:brick  benutzter Block / Ziegel → Modell-Stufe 'low' ab 28 m
// Die Modell-Stufen ('low') liefert models/lib/blockGeos.js selbst (für Instanzen gedacht); erkannt wird die Vorlage
// an ihrer Geometrie – passt sie nicht (Modell geändert), gibt es keine Detailstufe.

import * as THREE from 'three';
import { questionGeo, usedGeo, brickGeo } from '../models/lib/blockGeos.js';

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
  coin: { dist: 24, make: coinLow },
  'block:question': { dist: 28, make: blockLow },
  'block:coinblock': { dist: 28, make: blockLow },
  'block:used': { dist: 28, make: blockLow },
  'block:brick': { dist: 28, make: blockLow },
};

/** Detailstufe für einen Motor-Pool (oder null); make(base) bekommt die Vorlage. */
export function poolLod(name) { return POOL_LOD[name] ?? null; }
