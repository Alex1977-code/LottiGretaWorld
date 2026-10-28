// Welt-8-Bausteine Wasser (Präzisierung Motor und Bausteine Welt 8; Bauplan 8-5 „Unterwasser-Festung: Steigbecken (füllt und
// leert sich alle paar Sekunden) → schwebende Wasserkörper zum Checkpoint“).
//
// steigbecken – Wasserbecken, dessen Spiegel im Takt steigt und sinkt: unten (wait) → Vorwarnung (warn: es blubbert, der
//   Pegel zittert) → steigt (rise s) → oben (hold) → sinkt (fall s). Schwimmende Figuren steigen mit (Motor: setWaterLevel),
//   am Boden stehende beginnen zu schwimmen; sinkt das Wasser, landen sie wieder. Den Beckenboden/-rand baut das Level
//   (island/wall) – mit walls: true baut der Baustein einen Steinrand um das Becken.
//   { type: 'steigbecken', id, pos: [x, y, z] (Mitte des Beckenbodens), size: [w, h, d] (h = größte Tiefe), low: 0.25 (m Tiefe
//     unten), high: h, wait: 2.5, warn: 0.8, rise: 1.8, hold: 2.5, fall: 1.8, phase: 0 (s Versatz),
//     mode: 'takt' | 'signal' (start() füllt, stop() leert; speed 1.5 m/s), current: [x, y, z], walls: false (Rand: Dicke
//     0,5 m, Höhe h + 0,3), style: 'stein' | 'festung' }
//   level.named.get(id) = { top (Wasserspiegel y), k (0 unten … 1 oben), state ('unten'|'warn'|'steigt'|'oben'|'sinkt'),
//     waterId, start(), stop(), info() }; Wasserform waterId `${id}` (Standard 'steigbecken<n>'); w8(level).pools.
//   Beispiel: { type: 'steigbecken', id: 'becken', pos: [0, -4, -40], size: [12, 4.5, 10], low: 0.3, wait: 2.5, hold: 3 }
//
// wasserkoerper – schwebender Wasserwürfel mitten in der Luft: hinein springen, darin schwimmen (Unterwasser-Steuerung), oben
//   herausspringen; wer unten oder seitlich hinausschwimmt, fällt. Wabernde, durchscheinende Wände (Thema-Wasserfarben).
//   { type: 'wasserkoerper', id, pos: [x, y, z] (Mitte der Unterseite), size: [4, 4, 4] | parts: [{ pos, size }],
//     current: [x, y, z] (Strömung m/s), color (Hex, sonst Thema), wobble: 0.08 (m), look: 'eigen' }
//   level.named.get(id) = { parts: [{ box, shape }], inside(fig), info() }; Wasserformen tag 'wasserkoerper';
//   Modell: Registry 'wasserkoerper' ({ size: [w, h, d], color }, Ursprung Mitte der Unterseite; state { t }) – sonst eigener
//   durchscheinender Würfel mit Schimmer (Shader).
//   Beispiel: { type: 'wasserkoerper', id: 'wuerfel1', pos: [0, 2, -70], size: [4, 4, 4] }

import * as THREE from 'three';
import { v3, sz3, box, hex, themeOf, addObject, addStatic, merge } from '../kit.js';
import { visDt } from '../../entities/gimmick.js';
import { getModel } from '../../models/index.js';
import { TYPES as WATER } from './water.js';
import { w8, cycle, ease, clamp, figures, regModel } from '../w8kit.js';

// =====================================================================================================================
// Steigbecken
// =====================================================================================================================

let POOLS = 0;

export function buildSteigbecken(level, spec) {
  const p = v3(spec.pos), s = sz3(spec.size, [10, 4, 10]);
  const wid = spec.id ?? `steigbecken${++POOLS}`;
  const low = p.y + (spec.low ?? 0.25), high = p.y + (spec.high ?? s.y);
  const mode = spec.mode ?? 'takt';
  const T = { wait: spec.wait ?? 2.5, warn: Math.max(0, spec.warn ?? 0.8), rise: spec.rise ?? 1.8, hold: spec.hold ?? 2.5, fall: spec.fall ?? 1.8 };
  const plan = cycle([
    { name: 'unten', t: Math.max(0, T.wait - T.warn) }, { name: 'warn', t: T.warn }, { name: 'steigt', t: T.rise },
    { name: 'oben', t: T.hold }, { name: 'sinkt', t: T.fall },
  ], spec.phase ?? 0);
  // Wasserform + Darstellung über den Motor-Baustein water (folgt der Oberfläche der Form)
  WATER.water(level, { pos: [p.x, p.y, p.z], size: [s.x, high - p.y, s.z], id: `${wid}#w`, current: spec.current });
  const wkey = `${wid}#w`;
  let shape = null;
  level.world.forEach((q) => { if (q.water && q.waterId === wkey) shape = q; });
  const st = { state: 'unten', k: 0, want: false, top: low, sigK: 0 };
  const handle = {
    get top() { return st.top; }, get k() { return st.k; }, get state() { return st.state; }, waterId: wkey, shape,
    start() { st.want = true; }, stop() { st.want = false; },
    info: () => ({ state: st.state, top: +st.top.toFixed(2), k: +st.k.toFixed(2), low: +low.toFixed(2), high: +high.toFixed(2) }),
  };
  if (spec.id) level.named.set(spec.id, handle);
  w8(level).pools.push(handle);
  let lastBubble = 0;
  level.onStep((dt, time) => {
    let name, k;
    if (mode === 'signal') {
      st.sigK = clamp(st.sigK + (st.want ? 1 : -1) * dt * 1.5 / Math.max(0.5, high - low), 0, 1);
      k = st.sigK;
      name = k <= 0 ? 'unten' : k >= 1 ? 'oben' : st.want ? 'steigt' : 'sinkt';
    } else {
      const c = plan.at(time);
      name = c.name;
      k = name === 'steigt' ? ease(c.u) : name === 'oben' ? 1 : name === 'sinkt' ? 1 - ease(c.u) : 0;
    }
    if (name !== st.state) {
      if (name === 'steigt') level.sfx('splash_big');
      if (name === 'warn') level.sfx('blase');
    }
    st.state = name;
    st.k = k;
    const wob = name === 'warn' ? Math.sin(time * 30) * 0.04 : 0;
    st.top = low + (high - low) * k + wob;
    level.setWaterLevel(wkey, st.top, 0);
    if (name === 'warn' && time - lastBubble > 0.22 && level.effects) {
      lastBubble = time;
      const r = level.rnd;
      level.effects.splash({ x: p.x + r.real(-s.x / 2.5, s.x / 2.5), y: st.top, z: p.z + r.real(-s.z / 2.5, s.z / 2.5) }, st.top);
    }
  });
  // Pegel-Markierungen am Rand (zeigen, wie hoch es steigt) und optional ein Steinrand
  if (level.view) {
    const th = themeOf(level);
    const parts = [];
    if (spec.walls) {
      const H = high - p.y + 0.3, T2 = 0.5;
      const col = spec.style === 'festung' ? th.stoneDark ?? 0x8a8a9a : th.stone ?? 0xc0c0c8;
      parts.push(box(s.x + T2 * 2, H, T2, p.x, p.y + H / 2, p.z - s.z / 2 - T2 / 2, col, { r: 0.08 }));
      parts.push(box(s.x + T2 * 2, H, T2, p.x, p.y + H / 2, p.z + s.z / 2 + T2 / 2, col, { r: 0.08 }));
      parts.push(box(T2, H, s.z, p.x - s.x / 2 - T2 / 2, p.y + H / 2, p.z, col, { r: 0.08 }));
      parts.push(box(T2, H, s.z, p.x + s.x / 2 + T2 / 2, p.y + H / 2, p.z, col, { r: 0.08 }));
      level.world.add({ type: 'box', min: [p.x - s.x / 2 - T2, p.y, p.z - s.z / 2 - T2], max: [p.x + s.x / 2 + T2, p.y + H, p.z - s.z / 2], tag: 'steigbecken-rand' });
      level.world.add({ type: 'box', min: [p.x - s.x / 2 - T2, p.y, p.z + s.z / 2], max: [p.x + s.x / 2 + T2, p.y + H, p.z + s.z / 2 + T2], tag: 'steigbecken-rand' });
      level.world.add({ type: 'box', min: [p.x - s.x / 2 - T2, p.y, p.z - s.z / 2], max: [p.x - s.x / 2, p.y + H, p.z + s.z / 2], tag: 'steigbecken-rand' });
      level.world.add({ type: 'box', min: [p.x + s.x / 2, p.y, p.z - s.z / 2], max: [p.x + s.x / 2 + T2, p.y + H, p.z + s.z / 2], tag: 'steigbecken-rand' });
    }
    // Pegelstriche (gelb: hoch, blau: tief) an der Rückwand
    const glow = [];
    for (const [y, c] of [[high, 0xffd23a], [low, 0x5ad0ff]]) glow.push(box(Math.min(2.4, s.x * 0.3), 0.08, 0.06, p.x - s.x / 2 + 1.4, y, p.z - s.z / 2 + 0.04, c, { r: 0.02, seg: 0 }));
    if (parts.length) addStatic(level, merge(parts));
    addStatic(level, merge(glow), { material: 'glow', castShadow: false });
  }
  return handle;
}

// =====================================================================================================================
// Schwebender Wasserkörper
// =====================================================================================================================

const WK_MATS = new WeakMap();
/** Durchscheinendes, waberndes Wasser-Material je Ansicht und Farbe (Zeit über view.onFrame). */
function wkMaterial(level, color, deep, wobble) {
  const v = level.view;
  let cache = WK_MATS.get(v);
  if (!cache) { cache = { mats: new Map(), time: { value: 0 } }; WK_MATS.set(v, cache); v.onFrame((dt) => { cache.time.value += Math.min(0.1, dt || 0); }); }
  const key = `${color}:${deep}:${wobble}`;
  let m = cache.mats.get(key);
  if (m) return m;
  m = new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.5, roughness: 0.08, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide, emissive: new THREE.Color(deep), emissiveIntensity: 0.25 });
  const U = { uTime: cache.time, uWob: { value: wobble } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'uniform float uTime;\nuniform float uWob;\nvarying vec3 vWk;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec3 wp = (modelMatrix * vec4(transformed, 1.0)).xyz;
      transformed += normal * uWob * (sin(wp.x * 1.7 + uTime * 2.1) * 0.5 + sin(wp.y * 2.3 - uTime * 1.6) * 0.3 + sin(wp.z * 1.9 + uTime * 1.3) * 0.4);
      vWk = wp;`);
    sh.fragmentShader = 'uniform float uTime;\nvarying vec3 vWk;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float cau = sin(vWk.x * 3.1 + sin(vWk.z * 2.3 + uTime * 1.4) * 1.5 + uTime) * sin(vWk.z * 2.7 + sin(vWk.y * 2.1 - uTime) * 1.3);
      totalEmissiveRadiance += vec3(0.35, 0.55, 0.6) * smoothstep(0.55, 1.0, cau) * 0.6;
      diffuseColor.a *= 0.85 + 0.15 * cau;`);
  };
  m.customProgramCacheKey = () => 'w8wasserkoerper';
  cache.mats.set(key, m);
  return m;
}

export function buildWasserkoerper(level, spec) {
  const th = themeOf(level);
  const list = Array.isArray(spec.parts) ? spec.parts : [{ pos: spec.pos, size: spec.size }];
  const cur = Array.isArray(spec.current) ? { x: spec.current[0] ?? 0, y: spec.current[1] ?? 0, z: spec.current[2] ?? 0 } : null;
  const parts = list.map((q) => {
    const p = v3(q.pos), s = sz3(q.size ?? spec.size, [4, 4, 4]);
    const b = { x0: p.x - s.x / 2, x1: p.x + s.x / 2, y0: p.y, y1: p.y + s.y, z0: p.z - s.z / 2, z1: p.z + s.z / 2 };
    const shape = { type: 'box', min: [b.x0, b.y0, b.z0], max: [b.x1, b.y1, b.z1], water: true, solid: false, camIgnore: true, tag: 'wasserkoerper', waterId: spec.id ? `${spec.id}#w` : undefined, current: cur };
    level.world.add(shape);
    return { p, s, box: b, shape };
  });
  const handle = {
    parts,
    inside: (f) => parts.some((q) => { const b = q.box, c = f.pos.y + f.half.y; return f.pos.x > b.x0 && f.pos.x < b.x1 && f.pos.z > b.z0 && f.pos.z < b.z1 && c > b.y0 && c < b.y1; }),
    info: () => ({ parts: parts.length, inside: figures(level).some((f) => handle.inside(f)) }),
  };
  if (spec.id) level.named.set(spec.id, handle);
  w8(level).cubes.push(handle);
  if (!level.view) return handle;
  const color = spec.color !== undefined ? hex(spec.color) : th.water ?? 0x3fb4ff;
  const deep = th.waterDeep ?? 0x1c6fd1;
  for (const q of parts) {
    const root = new THREE.Group();
    root.position.set(q.p.x, q.p.y, q.p.z);
    let model = null;
    if (regModel(spec, 'wasserkoerper')) {
      model = getModel('wasserkoerper', { size: [q.s.x, q.s.y, q.s.z], color });
      root.add(model.root);
    } else {
      const seg = (l) => Math.max(2, Math.min(10, Math.round(l * 1.5)));
      const g = new THREE.BoxGeometry(q.s.x, q.s.y, q.s.z, seg(q.s.x), seg(q.s.y), seg(q.s.z));
      g.translate(0, q.s.y / 2, 0);
      const mesh = new THREE.Mesh(g, wkMaterial(level, color, deep, spec.wobble ?? 0.08));
      mesh.renderOrder = 2;
      root.add(mesh);
      // heller Rand oben (Wasseroberfläche)
      const top = new THREE.Mesh(new THREE.PlaneGeometry(q.s.x * 0.98, q.s.z * 0.98), new THREE.MeshBasicMaterial({ color: 0xdff8ff, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
      top.rotation.x = -Math.PI / 2;
      top.position.y = q.s.y - 0.02;
      top.renderOrder = 3;
      root.add(top);
    }
    const holder = {};
    let t = 0;
    addObject(level, root, (dt) => { const d = visDt(level, holder, dt); t += d; model?.update?.(d, { t }); });
  }
  return handle;
}

export const TYPES = { steigbecken: buildSteigbecken, wasserkoerper: buildWasserkoerper };
