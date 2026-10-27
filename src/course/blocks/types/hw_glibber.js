// Halloween-Bausteine Nebelfriedhof (H-3): Glibberbach (Floßfahrt auf grünem Glibber) und Bodennebel.
//
// glibberbach – Bach aus leuchtend grünem, harmlosem Glibber für Floßfahrten: der vorhandene Rasterfluss (Baustein
//   `river` Form B, blocks/types/river.js) mit Bett, Ufern, Strömung und Fließ-Streifen – nur dass die Flüssigkeit kein
//   Schwimmwasser ist: Hineinfallen = Neustart am letzten Checkpoint (wie Giftwasser, aber ohne Brand: Form kill
//   'glibber', deathCause 'fall'). Das Gimmick-Floß `raft` (Pflaume auf dem Blatt) fährt darauf wie auf dem Fluss
//   (level.rivers). Gegner, die hineingeraten, versinken blubbernd (zählen als besiegt). Blasen ploppen an der
//   Oberfläche, Glibber-Klumpen treiben mit.
//   { type: 'glibberbach', id, path: [[x, y, z], …] (y = Oberfläche), width: 6, depth: 2, speed: 3 | speeds: […],
//     bank: 2.5, bankH: 1, banks: true, bed: true, open: ['start', 'end'], color: 'gruen' | 'lila', bubbles: 26,
//     blobs: 10 }
//   level.named.get(id) = { river (Netz wie level.rivers[i]: nearest, contains, surfaceAt, flowAt, width), sunk,
//     contains(x, z), surfaceAt(x, z), info() }
//   Floß: { kind: 'raft', pos: [x, Oberfläche, z], yaw, exit: [x, y, z] } (entities/kinds/raft.js).
// nebel – Bodennebel-Feld (rein optisch): mehrere weiche, langsam treibende Nebelschichten über dem Boden, an den Rändern
//   ausgeblendet; um die Figur dünner (Figur bleibt lesbar). Ein Zeichenaufruf je Feld.
//   { type: 'nebel', pos: [x, y, z] (Mitte, Bodenhöhe), size: [w, d] (Standard [14, 14]), height: 1.3, layers: 3,
//     density: 0.35 (0..1), color: 0xc8d2f4, drift: [0.25, 0.08] (m/s), edge: 2 (m weicher Rand) }

import * as THREE from 'three';
import { v3, hex, addObject, Rnd } from '../kit.js';
import { buildRiver } from './river.js';
import { fogTexture, HWC } from '../hwkit.js';

const GL = {
  gruen: { surface: 0x86e83a, bubble: 0xd8ff9a, blob: 0x4ab81e },
  lila: { surface: 0xa86aff, bubble: 0xf0d8ff, blob: 0x6a2ac8 },
};

export function buildGlibberbach(level, spec) {
  const pal = GL[spec.color] ?? GL.gruen;
  const world = level.world;
  const own = Object.prototype.hasOwnProperty.call(world, 'add');
  const orig = world.add;
  const kills = [];
  // Wasserzellen des Rasterflusses werden zu Glibber (tödlich, nicht schwimmbar), knapp unter der Oberfläche
  world.add = function addGlibber(s) {
    if (s.tag === 'river') {
      delete s.water;
      s.solid = false; s.camIgnore = true; s.kill = 'glibber'; s.glibber = true; s.tag = 'glibberbach';
      s.max = [s.max[0], s.max[1] - 0.12, s.max[2]];
      kills.push(s);
    } else if (s.tag === 'river:bett') s.tag = 'glibberbach:bett';
    else if (s.tag === 'river:ufer') s.tag = 'glibberbach:ufer';
    return orig.call(this, s);
  };
  let river = null;
  try {
    river = buildRiver(level, { ...spec, type: 'river', color: pal.surface, width: spec.width ?? 6, depth: spec.depth ?? 2, speed: spec.speed ?? 3, bank: spec.bank ?? 2.5 });
  } finally {
    if (own) world.add = orig; else delete world.add;
  }
  if (!river) return null;
  const st = { sunk: 0 };
  const sinking = new Map();
  const handle = {
    river, get sunk() { return st.sunk; }, kills,
    contains: (x, z, m) => river.contains(x, z, m), surfaceAt: (x, z) => river.surfaceAt(x, z),
    info: () => ({ sunk: st.sunk, cells: kills.length, width: river.width }),
  };
  if (spec.id) level.named.set(spec.id, handle);
  // Gegner versinken blubbernd
  level.onStep((dt) => {
    for (const e of level.entities) {
      if (!e.enemy || !e.alive || e.removed || e.flying || e.carrier || sinking.has(e)) continue;
      if (!river.contains(e.pos.x, e.pos.z)) continue;
      const y = river.surfaceAt(e.pos.x, e.pos.z);
      if (y === null || e.pos.y > y - 0.08 || e.pos.y < y - (spec.depth ?? 2) - 1) continue;
      sinking.set(e, 0);
      e.touch = false;
      level.sfx('splash');
    }
    for (const [e, t] of sinking) {
      if (e.removed) { sinking.delete(e); continue; }
      const nt = t + dt;
      sinking.set(e, nt);
      e.vel?.set(0, 0, 0);
      e.pos.y -= 1.1 * dt;
      if (nt > 0.7) { e.markDefeated?.(); e.fellOut = true; e.kill(); sinking.delete(e); st.sunk++; }
    }
  });
  if (!level.view) return handle;
  // Blasen und treibende Klumpen (eine InstancedMesh mit Farbe je Instanz)
  const segs = river.segs;
  const total = segs.reduce((a, s) => a + s.len, 0) || 1;
  const rnd = new Rnd(((segs[0].a.x * 73) ^ (segs[0].a.z * 37)) >>> 0);
  const W = river.width;
  const pick = (o) => {
    let u = rnd.frac() * total, i = 0;
    while (i < segs.length - 1 && u > segs[i].len) { u -= segs[i].len; i++; }
    const s = segs[i], t = Math.min(1, u / (s.len || 1));
    const lat = rnd.real(-W * 0.4, W * 0.4);
    o.x = s.a.x + (s.b.x - s.a.x) * t - s.dir.z * lat; o.z = s.a.z + (s.b.z - s.a.z) * t + s.dir.x * lat;
    o.y = s.a.y + (s.b.y - s.a.y) * t;
    o.i = i; o.u = u; o.lat = lat;
    return o;
  };
  const NB = spec.bubbles ?? 26, NK = spec.blobs ?? 10;
  const items = [];
  for (let i = 0; i < NB; i++) items.push(pick({ kind: 'b', t: rnd.real(0, 1.4), life: rnd.real(0.9, 1.6), s: rnd.real(0.12, 0.3) }));
  for (let i = 0; i < NK; i++) items.push(pick({ kind: 'k', s: rnd.real(0.35, 0.6), ph: rnd.real(0, 6.28) }));
  const g = new THREE.SphereGeometry(1, 10, 7);
  const im = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ roughness: 0.15, emissive: hex(HWC.glibberLow), emissiveIntensity: 0.35 }), items.length);
  im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false;
  const cb = new THREE.Color(pal.bubble), ck = new THREE.Color(pal.blob);
  items.forEach((it, i) => im.setColorAt(i, it.kind === 'b' ? cb : ck));
  im.instanceColor.needsUpdate = true;
  const M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
  const flow = { x: 0, z: 0 };
  let lastT = level.time;
  addObject(level, im, () => {
    const d = Math.min(0.2, Math.max(0, level.time - lastT)) || 1 / 60;
    lastT = level.time;
    let n = 0;
    for (const it of items) {
      if (it.kind === 'b') {
        it.t += d;
        if (it.t > it.life) { pick(it); it.t = 0; }
        const k = it.t / it.life;
        const s = it.s * (k < 0.85 ? 0.3 + k * 0.8 : 1.1 * (1 - (k - 0.85) * 4));
        P.set(it.x, it.y + s * 0.3, it.z); S.set(s, s * 0.85, s);
      } else {
        river.flowAt(it.x, it.z, flow);
        it.x += flow.x * d * 0.8; it.z += flow.z * d * 0.8;
        it.ph += d * 2;
        const n0 = river.nearest(it.x, it.z);
        if (!n0 || n0.d > W * 0.45 || (n0.i === segs.length - 1 && n0.t > 0.97)) { pick(it); const s0 = segs[0]; it.x = s0.a.x - s0.dir.z * it.lat + s0.dir.x * rnd.real(0, 2); it.z = s0.a.z + s0.dir.x * it.lat + s0.dir.z * rnd.real(0, 2); it.y = s0.a.y; }
        else it.y = n0.y;
        P.set(it.x, it.y - 0.04, it.z); S.set(it.s * (1 + 0.1 * Math.sin(it.ph)), it.s * 0.32, it.s * (1 - 0.1 * Math.sin(it.ph)));
      }
      M.compose(P, Q, S);
      im.setMatrixAt(n++, M);
    }
    im.count = n;
    im.instanceMatrix.needsUpdate = true;
  });
  return handle;
}

// ------------------------------------------------------------------ Bodennebel

const FOG_VERT = `
attribute float aLayer;
varying vec3 vWp;
varying float vLayer;
#include <common>
#include <fog_pars_vertex>
void main() {
  vLayer = aLayer;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWp = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FOG_FRAG = `
uniform sampler2D uTex;
uniform float uTime;
uniform vec2 uDrift;
uniform vec3 uColor;
uniform float uDensity;
uniform vec4 uRect;
uniform float uEdge;
uniform vec3 uHole;
uniform float uLayers;
varying vec3 vWp;
varying float vLayer;
#include <common>
#include <fog_pars_fragment>
void main() {
  float sp = 1.0 + vLayer * 0.35;
  vec2 q = vWp.xz * (0.07 + vLayer * 0.02) + uDrift * uTime * 0.07 * sp + vec2(vLayer * 0.37, vLayer * 0.61);
  float n = texture2D(uTex, q).a + texture2D(uTex, q * 1.7 + vec2(0.3, 0.1) - uDrift.yx * uTime * 0.05).a * 0.7;
  float e = min(uRect.z - abs(vWp.x - uRect.x), uRect.w - abs(vWp.z - uRect.y));
  float edge = smoothstep(0.0, uEdge, e);
  float lay = 1.0 - vLayer / max(1.0, uLayers) * 0.55;
  float hole = mix(0.25, 1.0, smoothstep(0.8, 2.6, length(vWp.xz - uHole.xz)));
  float a = clamp(n * 1.1, 0.0, 1.0) * uDensity * edge * lay * hole;
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor, a);
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export function buildNebel(level, spec) {
  if (!level.view) return null;
  const p = v3(spec.pos);
  const [w, d] = spec.size ?? [14, 14];
  const H = spec.height ?? 1.3, layers = Math.max(1, spec.layers ?? 3);
  const geos = [];
  for (let i = 0; i < layers; i++) {
    const g = new THREE.PlaneGeometry(w, d, 1, 1);
    g.rotateX(-Math.PI / 2);
    g.translate(p.x, p.y + 0.12 + (i / Math.max(1, layers - 1)) * (H - 0.12) * (layers > 1 ? 1 : 0), p.z);
    const n = g.attributes.position.count;
    g.setAttribute('aLayer', new THREE.Float32BufferAttribute(new Float32Array(n).fill(i), 1));
    g.deleteAttribute('uv'); g.deleteAttribute('normal');
    geos.push(g);
  }
  // Ebenen zusammenfügen (gleiche Attribute)
  const merged = new THREE.BufferGeometry();
  const pos = [], lay = [], idx = [];
  let base = 0;
  for (const g of geos) {
    pos.push(...g.attributes.position.array); lay.push(...g.attributes.aLayer.array);
    for (const k of g.index.array) idx.push(k + base);
    base += g.attributes.position.count;
    g.dispose();
  }
  merged.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  merged.setAttribute('aLayer', new THREE.Float32BufferAttribute(lay, 1));
  merged.setIndex(idx);
  const drift = spec.drift ?? [0.25, 0.08];
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog]);
  Object.assign(uniforms, {
    uTex: { value: fogTexture() }, uTime: { value: 0 }, uDrift: { value: new THREE.Vector2(drift[0], drift[1]) },
    uColor: { value: new THREE.Color(spec.color ?? 0xc8d2f4) }, uDensity: { value: spec.density ?? 0.35 },
    uRect: { value: new THREE.Vector4(p.x, p.z, w / 2, d / 2) }, uEdge: { value: spec.edge ?? 2 }, uHole: { value: new THREE.Vector3(0, -1e4, 0) },
    uLayers: { value: layers },
  });
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: FOG_VERT, fragmentShader: FOG_FRAG, transparent: true, depthWrite: false, fog: true, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(merged, mat);
  mesh.name = 'nebel';
  mesh.renderOrder = 4;
  mesh.castShadow = false; mesh.receiveShadow = false;
  addObject(level, mesh, (dt, t) => {
    uniforms.uTime.value = t;
    const f = level.player;
    if (f) uniforms.uHole.value.set(f.pos.x, f.pos.y, f.pos.z);
  });
  return { mesh };
}

export const TYPES = { glibberbach: buildGlibberbach, nebel: buildNebel };
