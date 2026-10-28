// Welt-8-Baustein Leuchtsteg (Präzisierung Motor und Bausteine Welt 8; Bauplan 8-4 „Nacht-Festung“: „fast alle Wege sind
// unsichtbare Stege, die nur um die Figur herum sichtbar sind und großflächig aufleuchten, wenn Suchköpfe oder Stampfsteine
// aufschlagen oder die Figur stampft“).
//
// leuchtsteg – unsichtbarer, aber immer begehbarer Steg. Sichtbar ist er nur im Umkreis `radius` jeder Figur (je Pixel, weicher
//   Rand `soft`, heller Lichtsaum an der Grenze) und großflächig für ein paar Sekunden um jeden Aufschlag: Stampfstein landet,
//   Suchkopf/Projektilkopf zerplatzt, Figur landet aus der Stampfattacke, Lavabrocken schlägt ein, Super-POW-Block, Signal
//   'aufschlag' (w8kit watchImpacts/flash). Ein gemeinsames Shader-Mesh je Level (1 Zeichenaufruf für alle Stege),
//   leuchtend (unbeleuchtet), wirft keinen Schatten. Im Dunkeln (Thema nightfort) ist er die einzige Lichtquelle.
//   { type: 'leuchtsteg', id, pos: [x, y, z] (Mitte der Unterseite), size: [w, h, d] (Standard [2, 0.4, 6])
//     | parts: [{ pos, size }, …] | from: [x, y, z], to: [x, y, z], n: 4 (Reihe/Treppe aus n Platten, size je Platte),
//     radius: 3.2 (m Sichtradius um die Figur), soft: 1.1 (m weicher Rand), flash: true (false = leuchtet bei Aufschlägen
//     nicht auf), color: 'gold' | 'tuerkis' | 'rosa' | 'weiss', hint: 0 (Grundschimmer 0..1, 0 = ganz unsichtbar),
//     always: false (immer sichtbar – zum Bauen), oneWay: false, hidden: false (reveal() lässt ihn samt Kollision
//     erscheinen, hide() verschwinden), look: 'eigen' }
//   level.named.get(id) = { parts: [{ box: { x0, x1, y0, y1, z0, z1 }, shape }], lit (Anteil der Platten, deren Mitte
//     gerade sichtbar ist), visibleAt(x, y, z) → 0..1 (wie der Shader), flash(x, y, z, r), reveal(), hide(), info() };
//   w8(level).stegs. Kollision: Quader, tag 'leuchtsteg'.
//   Modell: gibt es das Registry-Modell 'leuchtsteg' (Welt-8-Modelle, gimmicks_w8.js), zeichnen die Stege als leuchtende
//   1-m-Kacheln der Instanz-Variante createInstanced('leuchtsteg', n) (lib/instanced_w8.js; je Platte ≈ 1 m × 1 m Kacheln,
//   Dicke über den Maßstab; state { glow (Sichtbarkeit der Kachelmitte – wie visibleAt ohne Aufleuchten), flash (Anteil des
//   Aufleuchtens) }) – eine InstancedMesh je Level, Kachel für Kachel erscheinend wie im Vorbild. look: 'eigen' (bzw. ohne
//   Modell): eigenes Shader-Mesh (Glasplatte mit Laufsteg-Fugen und Randleisten, Sichtbarkeit je Pixel); color gilt nur dort.
//   Beispiel: { type: 'leuchtsteg', id: 'steg1', pos: [0, 0, -20], size: [2, 0.4, 8] };
//             Treppe: { type: 'leuchtsteg', from: [4, 0.5, -30], to: [4, 3, -36], n: 5, size: [1.6, 0.3, 1.4] }

import * as THREE from 'three';
import { v3, sz3, lin, hex, box, addObject } from '../kit.js';
import { createInstanced } from '../../models/lib/instanced.js';
import { w8, figures, flash, flashAt, watchImpacts, regModel, clamp } from '../w8kit.js';
import { smooth } from '../../../three/world/geometry.js';

const COLORS = { gold: 0xffd86a, tuerkis: 0x6af0ff, rosa: 0xff8ad8, weiss: 0xf4f0ff };
const TILE_T = 0.3;   // Dicke der Modell-Kachel (opts.thick)
const MAX_FIG = 4, MAX_FL = 6;

/** Gemeinsames Shader-Mesh der Leuchtstege eines Levels (wird beim ersten Bild bzw. nach neuen Platten verschmolzen). */
function stegBatch(level) {
  const W = w8(level);
  if (W.stegBatch) return W.stegBatch;
  const U = {
    uFig: { value: Array.from({ length: MAX_FIG }, () => new THREE.Vector4(0, -999, 0, 0)) },
    uFl: { value: Array.from({ length: MAX_FL }, () => new THREE.Vector4(0, -999, 0, 0)) },
    uFlK: { value: new Array(MAX_FL).fill(0) },
    uTime: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, toneMapped: false,
    vertexShader: `
      attribute vec3 color; attribute vec3 aLoc; attribute vec3 aHalf; attribute vec3 aOpt;
      varying vec3 vW; varying vec3 vC; varying vec3 vLoc; varying vec3 vHalf; varying vec3 vOpt;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz; vC = color; vLoc = aLoc; vHalf = aHalf; vOpt = aOpt;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      uniform vec4 uFig[${MAX_FIG}]; uniform vec4 uFl[${MAX_FL}]; uniform float uFlK[${MAX_FL}]; uniform float uTime;
      varying vec3 vW; varying vec3 vC; varying vec3 vLoc; varying vec3 vHalf; varying vec3 vOpt;
      void main() {
        // vOpt: x = Sichtradius, y = weicher Rand (negativ: leuchtet bei Aufschlägen nicht auf), z = Grundschimmer (≥ 1: immer
        // sichtbar; < 0: versteckt)
        if (vOpt.z < -0.5) discard;
        float vis = clamp(vOpt.z, 0.0, 1.0), rim = 0.0, soft = abs(vOpt.y);
        for (int i = 0; i < ${MAX_FIG}; i++) {
          vec4 f = uFig[i];
          if (f.w <= 0.0) continue;
          float d = length((vW - f.xyz) * vec3(1.0, 0.7, 1.0));
          float r = vOpt.x;
          vis = max(vis, 1.0 - smoothstep(r - soft, r, d));
          rim = max(rim, smoothstep(r - soft - 0.25, r - soft * 0.4, d) * (1.0 - smoothstep(r - 0.35, r, d)));
        }
        float fl = 0.0;
        for (int i = 0; i < ${MAX_FL}; i++) {
          vec4 q = uFl[i];
          if (q.w <= 0.0 || vOpt.y < 0.0) continue;
          float d = length((vW - q.xyz) * vec3(1.0, 0.6, 1.0));
          float k = uFlK[i] * (1.0 - smoothstep(q.w - 1.2, q.w + 0.5, d));
          fl = max(fl, k);
          rim = max(rim, uFlK[i] * smoothstep(q.w - 0.9, q.w - 0.2, d) * (1.0 - smoothstep(q.w - 0.2, q.w + 0.4, d)));
        }
        float a = max(vis, fl);
        if (a < 0.012) discard;
        vec3 e3 = vHalf - abs(vLoc);
        float mn = min(e3.x, min(e3.y, e3.z)), mx = max(e3.x, max(e3.y, e3.z));
        float mid = e3.x + e3.y + e3.z - mn - mx;
        float edge = 1.0 - smoothstep(0.03, 0.1, mid);
        // Fugen auf der Oberseite (Laufsteg-Bohlen quer) und ein sanftes Schimmern
        float plank = 1.0 - smoothstep(0.015, 0.045, abs(fract((vW.x + vW.z) * 1.25) - 0.5) - 0.44);
        float top = step(e3.y, 0.02) * step(0.0, vLoc.y);
        float shim = 0.5 + 0.5 * sin(uTime * 2.4 + (vW.x - vW.z) * 0.9);
        vec3 fill = vC * (0.32 + 0.12 * shim) + vC * plank * top * 0.35;
        vec3 col = mix(fill, vC * 1.35 + 0.18, edge);
        col = mix(col, vec3(1.0, 0.98, 0.9), clamp(rim, 0.0, 1.0) * 0.7);
        col += vC * fl * 0.35;
        float alpha = a * mix(0.5 + 0.18 * top, 0.98, max(edge, rim * 0.8));
        gl_FragColor = vec4(col, alpha);
      }`,
  });
  const B = { parts: [], mesh: null, dirty: true, U, mat, built: 0, tiles: [], tileApi: null, tilesDirty: false };
  W.stegBatch = B;
  watchImpacts(level);
  if (level.view) {
    level.view.onFrame((dt) => {
      // Modell-Kacheln (Registry 'leuchtsteg'): Instanzen neu anlegen, wenn Platten dazukamen; je Bild glow/flash je Kachel
      if (B.tilesDirty) {
        B.tilesDirty = false;
        if (B.tileApi) { level.view.remove(B.tileApi.root); B.tileApi.dispose(); B.tileApi = null; }
        if (B.tiles.length) {
          B.tileApi = createInstanced('leuchtsteg', B.tiles.length, { thick: TILE_T });
          B.tiles.forEach((t, i) => { B.tileApi.setAt(i, [t.x, t.y0, t.z], 0, [t.sx, t.sy / TILE_T, t.sz], { glow: 0 }); t.g = -1; t.f = -1; });
          B.tileApi.root.name = 'leuchtstege:kacheln';
          addObject(level, B.tileApi.root);
        }
      }
      if (B.tileApi) {
        for (let i = 0; i < B.tiles.length; i++) {
          const t = B.tiles[i], v = t.steg.vis(t.x, t.y1, t.z);
          const g = +v.glow.toFixed(2), f = +v.flash.toFixed(2);
          if (g !== t.g || f !== t.f) { t.g = g; t.f = f; B.tileApi.setState(i, { glow: Math.max(g, f), flash: f }); }
        }
        B.tileApi.update(dt);
      }
      if (B.dirty) {
        B.dirty = false;
        if (B.mesh) { level.view.remove(B.mesh); B.mesh.geometry.dispose(); B.mesh = null; }
        const gs = B.parts.map((p) => p.geo).filter(Boolean);
        if (gs.length) {
          const g = mergeKeep(gs);
          B.mesh = new THREE.Mesh(g, mat);
          B.mesh.name = 'leuchtstege';
          B.mesh.renderOrder = 4;
          B.mesh.castShadow = false; B.mesh.receiveShadow = false;
          B.mesh.frustumCulled = true;
          addObject(level, B.mesh);
          B.built++;
        }
      }
      U.uTime.value += Math.min(0.1, dt || 0);
      const figs = figures(level);
      for (let i = 0; i < MAX_FIG; i++) {
        const f = figs[i];
        if (f) U.uFig.value[i].set(f.pos.x, f.pos.y + 0.4, f.pos.z, 1); else U.uFig.value[i].w = 0;
      }
      const fl = w8(level).flashes;
      for (let i = 0; i < MAX_FL; i++) {
        const f = fl[fl.length - 1 - i];
        if (!f) { U.uFl.value[i].w = 0; U.uFlK.value[i] = 0; continue; }
        const R = f.r * Math.min(1, f.t / 0.25);
        U.uFl.value[i].set(f.x, f.y, f.z, Math.max(0.01, R));
        U.uFlK.value[i] = f.k * (1 - smooth(f.time * 0.55, f.time, f.t));
      }
    });
  }
  return B;
}

/** Verschmelzen ohne die Teile freizugeben (bleiben für ein späteres Neu-Verschmelzen erhalten). */
function mergeKeep(list) {
  let n = 0;
  for (const g of list) n += g.attributes.position.count;
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'color', 'aLoc', 'aHalf', 'aOpt']) {
    const arr = new Float32Array(n * 3);
    let o = 0;
    for (const g of list) { arr.set(g.attributes[name].array, o); o += g.attributes[name].array.length; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, 3));
  }
  out.computeBoundingSphere();
  return out;
}

/** Platten-Geometrie (Weltkoordinaten) mit den Shader-Attributen; Modell 'leuchtsteg' wenn vorhanden. */
function partGeometry(level, spec, b, color, opt) {
  const w = b.x1 - b.x0, h = b.y1 - b.y0, d = b.z1 - b.z0;
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, cz = (b.z0 + b.z1) / 2;
  let g = null;
  {
    // eigene Platte: Glasplatte mit Randleisten (die Fugen zeichnet der Shader)
    g = box(w, h, d, cx, cy, cz, color, { r: Math.min(0.06, h * 0.3), seg: 1 });
    if (g.index) g = g.toNonIndexed();
    const c = lin(hex(color));
    const col = g.attributes.color.array;
    for (let i = 0; i < col.length; i += 3) { col[i] = c[0]; col[i + 1] = c[1]; col[i + 2] = c[2]; }
  }
  const P = g.attributes.position, n = P.count;
  const loc = new Float32Array(n * 3), half = new Float32Array(n * 3), op = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    loc[i * 3] = P.getX(i) - cx; loc[i * 3 + 1] = P.getY(i) - cy; loc[i * 3 + 2] = P.getZ(i) - cz;
    half[i * 3] = w / 2; half[i * 3 + 1] = h / 2; half[i * 3 + 2] = d / 2;
    op[i * 3] = opt[0]; op[i * 3 + 1] = opt[1]; op[i * 3 + 2] = opt[2];
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(P.array), 3));
  const C = g.attributes.color;
  const carr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { carr[i * 3] = C.getX(i); carr[i * 3 + 1] = C.getY(i); carr[i * 3 + 2] = C.getZ(i); }
  out.setAttribute('color', new THREE.BufferAttribute(carr, 3));
  out.setAttribute('aLoc', new THREE.BufferAttribute(loc, 3));
  out.setAttribute('aHalf', new THREE.BufferAttribute(half, 3));
  out.setAttribute('aOpt', new THREE.BufferAttribute(op, 3));
  g.dispose();
  return out;
}

/** Platten aus den Daten: parts | from/to/n | pos/size. */
function boxesOf(spec) {
  const out = [];
  const add = (pos, size) => {
    const p = v3(pos), s = sz3(size, [2, 0.4, 6]);
    out.push({ x0: p.x - s.x / 2, x1: p.x + s.x / 2, y0: p.y, y1: p.y + s.y, z0: p.z - s.z / 2, z1: p.z + s.z / 2 });
  };
  if (Array.isArray(spec.parts)) for (const q of spec.parts) add(q.pos, q.size ?? spec.size);
  else if (spec.from && spec.to) {
    const a = v3(spec.from), b = v3(spec.to), n = Math.max(1, spec.n ?? 4);
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0 : i / (n - 1);
      add([a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, a.z + (b.z - a.z) * u], spec.size ?? [1.6, 0.3, 1.4]);
    }
  } else add(spec.pos, spec.size);
  return out;
}

export function buildLeuchtsteg(level, spec) {
  const radius = spec.radius ?? 3.2, soft = spec.soft ?? 1.1;
  const hint = spec.always ? 1 : clamp(spec.hint ?? 0, 0, 0.99);
  const color = COLORS[spec.color] ?? hex(spec.color, COLORS.gold);
  const B = stegBatch(level);
  const st = { hidden: !!spec.hidden };
  const useModel = !!level.view && regModel(spec, 'leuchtsteg');
  const stegVis = { vis: null };
  const parts = boxesOf(spec).map((b) => {
    const shape = { type: 'box', min: [b.x0, b.y0, b.z0], max: [b.x1, b.y1, b.z1], tag: 'leuchtsteg', oneWay: !!spec.oneWay };
    const part = { box: b, shape, id: st.hidden ? null : level.world.add(shape), geo: null };
    if (useModel) {
      // Kacheln ≈ 1 m (ganzzahlig je Richtung), Dicke über den Maßstab
      const w = b.x1 - b.x0, d = b.z1 - b.z0, nx = Math.max(1, Math.round(w)), nz = Math.max(1, Math.round(d));
      for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
        B.tiles.push({ x: b.x0 + (i + 0.5) * (w / nx), z: b.z0 + (k + 0.5) * (d / nz), y0: b.y0, y1: b.y1, sx: w / nx, sy: b.y1 - b.y0, sz: d / nz, steg: stegVis });
      }
      B.tilesDirty = true;
    } else if (level.view) {
      part.geo = partGeometry(level, spec, b, color, [radius, spec.flash === false ? -soft : soft, st.hidden ? -1 : hint]);
      B.parts.push(part);
      B.dirty = true;
    }
    return part;
  });
  const noFlash = spec.flash === false;
  const setOpt = (z) => {
    for (const p of parts) {
      const a = p.geo?.attributes.aOpt;
      if (!a) continue;
      for (let i = 0; i < a.count; i++) a.setZ(i, z);
    }
    B.dirty = true;
  };
  /** Sichtbarkeit am Punkt: glow (Umkreis der Figuren, Grundschimmer) und flash (Aufleuchten) je 0..1. */
  const visParts = (x, y, z, out = {}) => {
    out.glow = 0; out.flash = 0;
    if (st.hidden) return out;
    let v = hint;
    for (const f of figures(level)) {
      const d = Math.hypot(x - f.pos.x, (y - f.pos.y - 0.4) * 0.7, z - f.pos.z);
      v = Math.max(v, 1 - smooth(radius - soft, radius, d));
    }
    let fl = 0;
    if (!noFlash) for (const f of w8(level).flashes) fl = Math.max(fl, flashAt(f, x, y, z));
    out.glow = v; out.flash = fl;
    return out;
  };
  const _vo = {};
  stegVis.vis = (x, y, z) => visParts(x, y, z, _vo);
  /** Sichtbarkeit (0..1) am Punkt – wie im Shader bzw. an den Kacheln. */
  const visibleAt = (x, y, z) => { const o = visParts(x, y, z, {}); return Math.max(o.glow, o.flash); };
  const handle = {
    parts, visibleAt,
    get lit() {
      if (!parts.length) return 0;
      let n = 0;
      for (const p of parts) { const b = p.box; if (visibleAt((b.x0 + b.x1) / 2, b.y1, (b.z0 + b.z1) / 2) > 0.5) n++; }
      return n / parts.length;
    },
    flash: (x, y, z, r) => flash(level, x, y, z, r ?? 7, { by: 'steg' }),
    reveal() {
      if (!st.hidden) return;
      st.hidden = false;
      for (const p of parts) if (!p.id) p.id = level.world.add(p.shape);
      setOpt(hint);
    },
    hide() {
      if (st.hidden) return;
      st.hidden = true;
      for (const p of parts) if (p.id) { level.world.remove(p.id); p.id = null; }
      setOpt(-1);
    },
    info: () => ({ parts: parts.length, lit: +handle.lit.toFixed(2), hidden: st.hidden, flashes: w8(level).flashes.length, impacts: w8(level).impacts, radius, look: useModel ? 'modell' : 'eigen', tiles: B.tiles.length }),
  };
  for (const p of parts) p.shape.owner = handle;
  if (spec.id) level.named.set(spec.id, handle);
  w8(level).stegs.push(handle);
  return handle;
}

export const TYPES = { leuchtsteg: buildLeuchtsteg };
