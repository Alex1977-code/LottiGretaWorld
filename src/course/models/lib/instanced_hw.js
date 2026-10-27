// Instanz-Varianten der massenhaften Halloween-Objekte („Kürbisinsel“) mit derselben API wie createInstanced() in
// instanced.js (dort über import.meta.glob('./instanced_*.js') eingebunden; instanced.js bleibt unverändert):
//
//   const pk = createInstanced('kuerbis', 40, { face: 'lachen', lit: true });   // je Variante ein Satz
//   pk.setAt(i, pos, yaw = 0, scale = 1, state = 'idle');   // pos = Ursprung wie das Einzelmodell (Fußpunkt)
//   pk.setState(i, state); pk.getState(i); pk.hide(i); pk.update(dt); pk.dispose();
//   pk.root, pk.meshes, pk.count, pk.name      scale darf auch [sx, sy, sz] sein.
//
// Arten und Zustände (state als String oder Objekt, 'hidden' blendet aus):
//   'kuerbis'          opts { shape: 'rund'|'flach'|'hoch'|'dick', color: 'orange'|'gelb'|'weiss'|'gruen'|'rot',
//                      face: false|'lachen'|'grinsen'|'staunen'|'frech', lit (Standard true mit Gesicht) }
//                      Ø 1 m × scale (wie Modell 'kuerbis' size); state 'idle'|'hidden'.  1–2 InstancedMeshes (Körper,
//                      Leuchtgesicht). Kulisse (schlichtes Material).
//   'grabstein'        opts { kind: 'rund'|'kreuz'|'spitz' }  1 m × scale, Lachgesicht; state 'idle'|'hidden'.  1 Mesh.
//   'geisterplattform' opts { size: [w, h, d] ([2, 0,5, 2]), color: 'mint'|'lila'|'orange' }  pos = Mitte der Unterseite;
//                      state { visible: 0..1 } (weich überblendet, je Platz eigene Deckkraft) | 'hidden'.  1 Mesh.
//                      getState(i) → { visible } (aktueller, geglätteter Wert).
//   'suessigkeit'      opts { kind: 'bonbon'|'lolli'|'riegel'|'mais', color (Index) }  Mitte bei y = 0,45 über pos, dreht
//                      und wippt; state 'idle' | 'collected' (hüpft, dreht, schrumpft in 0,35 s, dann weg) | 'hidden'.  1 Mesh.
//   'maisstaude'       Büschel Maisstauden ≈2 m × scale; state 'idle'|'hidden'.  1 Mesh (zweiseitig).
// Nicht gesetzte Plätze sind unsichtbar; Sichtbarkeitsprüfung aus (Instanzen liegen überall im Level).

import { THREE, TAU, clamp, vcol } from './kit.js';
import { kulMat, glow, graveGeo, candyGeo, CANDY_KINDS, HW, noToy } from './hwGeos.js';
import { applyToyLook } from '../../../three/lib/toyLook.js';
import { kuerbisGeos, maisGeo, maisMat } from '../kinds/props_kuerbis_hw.js';
import { ghostPlatformGeo, GHOST_COLORS, CANDY_SCALE } from '../kinds/gimmicks_hw.js';

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler();
const _p = new THREE.Vector3(), _s = new THREE.Vector3();

function makeMesh(geometry, material, n, shadow, receive = true) {
  const m = new THREE.InstancedMesh(geometry, material, n);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.frustumCulled = false;
  m.castShadow = !!shadow; m.receiveShadow = receive;
  for (let i = 0; i < n; i++) m.setMatrixAt(i, ZERO);
  m.count = 0;
  return m;
}
const stName = (st) => (typeof st === 'string' ? st : st?.anim ?? (st && 'visible' in st ? 'idle' : 'idle'));

/** Gemeinsames Gerüst wie in instanced_w5.js: write(i, slot) schreibt Matrizen, tick(dt, slot, i) → true = neu schreiben. */
function base(name, n, parts, write, tick, extra = {}) {
  const root = new THREE.Group();
  root.name = `instanzen:${name}`;
  for (const p of parts) root.add(p.mesh);
  const meshes = parts.map((p) => p.mesh);
  const slots = Array.from({ length: n }, (_, i) => ({ on: false, pos: new THREE.Vector3(), quat: new THREE.Quaternion(), scale: new THREE.Vector3(1, 1, 1), state: 'hidden', st: {}, age: 9, phase: (i * 2.399) % TAU, v: 0 }));
  let used = 0;
  const dirty = () => { for (const m of meshes) m.instanceMatrix.needsUpdate = true; extra.dirty?.(); };
  const api = {
    root, meshes, count: n, name,
    setAt(i, pos, yaw = 0, scale = 1, state = 'idle') {
      const s = slots[i];
      if (!s) return;
      if (Array.isArray(pos)) s.pos.set(pos[0], pos[1], pos[2]); else s.pos.set(pos.x, pos.y, pos.z);
      if (yaw && yaw.isQuaternion) s.quat.copy(yaw); else s.quat.setFromAxisAngle(_p.set(0, 1, 0), Number(yaw) || 0);
      if (Array.isArray(scale)) s.scale.set(scale[0], scale[1], scale[2]); else s.scale.setScalar(Number(scale) || 1);
      s.on = true;
      if (i + 1 > used) { used = i + 1; for (const p of parts) p.mesh.count = used; }
      api.setState(i, state);
    },
    setState(i, state) {
      const s = slots[i];
      if (!s) return;
      const nm = stName(state);
      if (nm !== s.state) { s.age = 0; extra.onEnter?.(s, nm); }
      s.state = nm;
      s.st = typeof state === 'object' && state ? { ...state } : {};
      write(i, s); dirty();
    },
    getState(i) { const s = slots[i]; if (!s) return undefined; return extra.getState ? extra.getState(s) : s.state; },
    hide(i) { api.setState(i, 'hidden'); },
    update(dt) {
      dt = Math.min(Math.max(dt || 0, 0), 0.1);
      let d = false;
      for (let i = 0; i < used; i++) {
        const s = slots[i];
        if (!s.on || s.state === 'hidden') continue;
        s.age += dt;
        if (tick(dt, s, i)) { write(i, s); d = true; }
      }
      if (d) dirty();
    },
    dispose() {
      root.removeFromParent();
      for (const m of meshes) m.dispose();
      meshes.length = 0;
      extra.dispose?.();
    },
  };
  api._slots = slots;
  return api;
}
/** Matrix eines Platzes: Lage, Gier (+ extraQ lokal), Maßstab, Versatz dy (lokal, skaliert), Faktor k. */
const compose = (s, out, extraQ = null, dy = 0, k = 1) => {
  _q.copy(s.quat); if (extraQ) _q.multiply(extraQ);
  _p.set(0, dy * s.scale.y, 0).applyQuaternion(s.quat).add(s.pos);
  _s.copy(s.scale).multiplyScalar(k);
  return out.compose(_p, _q, _s);
};

// ------------------------------------------------------------------ statische Kulisse (Kürbis, Grabstein, Mais)
function makeKuerbis(count, opts = {}) {
  const n = Math.max(1, count | 0);
  const face = opts.face ? (typeof opts.face === 'string' ? opts.face : 'lachen') : false;
  const G = kuerbisGeos(opts.shape ?? 'rund', opts.color ?? 'orange', face, face ? opts.lit !== false : false, false, true, 0);
  const body = makeMesh(G.body, kulMat(0.45), n, true);
  const parts = [{ mesh: body }];
  let gl = null;
  if (G.glow) { gl = makeMesh(G.glow, glow(), n, false, false); parts.push({ mesh: gl }); }
  const write = (i, s) => { const m = !s.on || s.state === 'hidden' ? ZERO : compose(s, _m); body.setMatrixAt(i, m); if (gl) gl.setMatrixAt(i, m); };
  return base('kuerbis', n, parts, write, () => false);
}
function makeGrabstein(count, opts = {}) {
  const n = Math.max(1, count | 0);
  const kind = ['rund', 'kreuz', 'spitz'].includes(opts.kind) ? opts.kind : 'rund';
  const body = makeMesh(graveGeo(kind, 1, true, true), kulMat(0.7), n, true);
  const write = (i, s) => body.setMatrixAt(i, !s.on || s.state === 'hidden' ? ZERO : compose(s, _m));
  return base('grabstein', n, [{ mesh: body }], write, () => false);
}
function makeMais(count) {
  const n = Math.max(1, count | 0);
  const body = makeMesh(maisGeo(4, 2, true), maisMat(), n, true);
  const write = (i, s) => body.setMatrixAt(i, !s.on || s.state === 'hidden' ? ZERO : compose(s, _m));
  return base('maisstaude', n, [{ mesh: body }], write, () => false);
}

// ------------------------------------------------------------------ Geisterplattform (Deckkraft je Platz)
function ghostMaterial(color) {
  const C = GHOST_COLORS[color] ?? GHOST_COLORS.mint;
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, transparent: true, depthWrite: false, emissive: new THREE.Color(C.glow).multiplyScalar(0.35) });
  m.name = `hw:ghostInst:${color}`;
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float instOpacity;\nvarying float vInstOp;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvInstOp = instOpacity;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vInstOp;')
      .replace('#include <alphatest_fragment>', 'diffuseColor.a *= vInstOp;\n#include <alphatest_fragment>');
  };
  m.customProgramCacheKey = () => 'hw:ghostInst';
  return applyToyLook(m);
}
function makeGeisterplattform(count, opts = {}) {
  const n = Math.max(1, count | 0);
  const sz = Array.isArray(opts.size) ? opts.size : [2, 0.5, 2];
  const w = Math.max(0.5, sz[0] ?? 2), h = Math.max(0.15, sz[1] ?? 0.5), d = Math.max(0.5, sz[2] ?? sz[1] ?? 2);
  const color = GHOST_COLORS[opts.color] ? opts.color : 'mint';
  const geo = ghostPlatformGeo(w, h, d, color, true).clone();
  const op = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
  op.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('instOpacity', op);
  const mat = ghostMaterial(color);
  const body = makeMesh(geo, mat, n, true);
  body.renderOrder = 2;
  const target = (s) => (s.state === 'hidden' ? 0 : clamp(Number(s.st.visible ?? 1), 0, 1));
  const write = (i, s) => {
    const v = s.v;
    if (!s.on || v < 0.01) { body.setMatrixAt(i, ZERO); op.array[i] = 0; return; }
    body.setMatrixAt(i, compose(s, _m, null, Math.sin(s.age * 1.6 + s.phase) * 0.015, 1));
    _m.elements[5] *= 0.92 + v * 0.08;
    body.setMatrixAt(i, _m);
    op.array[i] = 0.82 * v;
  };
  const api = base('geisterplattform', n, [{ mesh: body }], write, (dt, s) => {
    const tg = target(s);
    const nv = Math.abs(s.v - tg) < 0.002 ? tg : s.v + (tg - s.v) * (1 - Math.exp(-14 * dt));
    const changed = nv !== s.v || nv > 0.01;
    s.v = nv;
    return changed;
  }, {
    onEnter(s, nm) { if (nm === 'hidden') s.v = 0; },
    getState: (s) => (s.state === 'hidden' ? 'hidden' : { visible: s.v }),
    dirty: () => { op.needsUpdate = true; },
    dispose: () => { geo.dispose(); mat.dispose(); },
  });
  // neuer Platz: sofort auf den Zielwert (ohne Einblenden), danach weich
  const setAt0 = api.setAt;
  api.setAt = (i, pos, yaw, scale, state) => { setAt0(i, pos, yaw, scale, state); const s = api._slots[i]; if (s) { s.v = target(s); write(i, s); body.instanceMatrix.needsUpdate = true; op.needsUpdate = true; } };
  return api;
}

// ------------------------------------------------------------------ Süßigkeit (Sammel-Item)
function makeSuessigkeit(count, opts = {}) {
  const n = Math.max(1, count | 0);
  const kind = CANDY_KINDS.includes(opts.kind) ? opts.kind : 'bonbon';
  const color = Math.abs(Math.round(opts.color ?? 0)) % HW.candy.length;
  const body = makeMesh(candyGeo(kind, color, true), vcol(0.18, {}, 'hwcandy'), n, true, false);
  let t = 0;
  const write = (i, s) => {
    if (!s.on || s.state === 'hidden') { body.setMatrixAt(i, ZERO); return; }
    let y = 0.45 + Math.sin(t * 2.6 + s.phase) * 0.05, k = CANDY_SCALE, spin = t * 2.2 + s.phase;
    if (s.state === 'collected') { const q = Math.min(1, s.age / 0.35); y += Math.sin(q * Math.PI * 0.6) * 1.0; k *= 1 - q * q; spin += s.age * 25; }
    if (k <= 0.001) { body.setMatrixAt(i, ZERO); return; }
    body.setMatrixAt(i, compose(s, _m, _q2.setFromEuler(_e.set(0, spin, Math.sin(t * 1.3 + s.phase) * 0.15)), y, k));
  };
  const api = base('suessigkeit', n, [{ mesh: body }], write, () => true);
  const up = api.update;
  api.update = (dt) => { t += Math.min(Math.max(dt || 0, 0), 0.1); up(dt); };
  return api;
}

export const INSTANCED = {
  kuerbis: makeKuerbis,
  grabstein: makeGrabstein,
  geisterplattform: makeGeisterplattform,
  suessigkeit: makeSuessigkeit,
  maisstaude: makeMais,
};
