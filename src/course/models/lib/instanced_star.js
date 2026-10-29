// Instanz-Varianten der massenhaften Bonuswelt-Objekte (Welt Stern) mit derselben API wie createInstanced() in instanced.js (dort
// über import.meta.glob('./instanced_*.js') eingebunden; instanced.js bleibt unverändert):
//
//   const waben = createInstanced('wabe', 120, { kind: 'lava' });
//   waben.setAt(i, pos, yaw = 0, scale = 1, state = 'idle');   // pos = Ursprung wie das Einzelmodell; scale auch [sx, sy, sz]
//   waben.setState(i, state); waben.getState(i); waben.hide(i); waben.update(dt); waben.dispose();
//   waben.root, waben.meshes, waben.count, waben.name
//
// Arten und Zustände (state als String oder Objekt, 'hidden' blendet aus):
//   'wabe'        Wabenplatte (wie das Einzelmodell, sparsamer), pos = Mitte der Unterseite; opts { kind: 'normal'|'lava'|'eis',
//                 size (Umkreisradius, 1), thick (0,5) }; state 'idle' | { press (0..1), flash (0..1) } | 'hidden'.
//                 Lava pulsiert je Instanz versetzt.  2 InstancedMeshes (Körper, Deckfläche).
//   'farbplatte'  Farbplatte, pos = Mitte der Unterseite; opts { size: [x, z] | n (2), thick (0,25), colors: [a, b] (['rot', 'blau']) };
//                 state 'idle' (Farbe a) | { color (0..1), flash (0..1) } | 'hidden'.  2 InstancedMeshes (Rahmen, Platte; Farbe als
//                 Instanzfarbe).
//   'drehplatte'  Drehplatte, pos = Mitte der Unterseite; opts { size, thick, axis, color, back } wie das Einzelmodell;
//                 state 'idle' | { tilt (rad), shake (0..1) } | 'hidden'.  1 InstancedMesh.
//   'retro_block' Pixel-Retro-Block, pos = Mitte der Unterseite; opts { kind: 'gras'|'erde'|'ziegel'|'frage'|'hart', size (2) };
//                 state 'idle' | { anim: 'bump', progress? } (hüpft 0,25 s) | 'hidden'.  1 InstancedMesh (Kulisse, ohne Spielzeug-Look).
// Nicht gesetzte Plätze sind unsichtbar; Sichtbarkeitsprüfung aus (Instanzen liegen überall im Level).

import { THREE, TAU, clamp, smoothstep } from './kit.js';
import { num, sz2, toyS, glowS, panelColor } from './starGeos.js';
import { wabeBodyGeo, wabeTopGeo, wabeLitMat, wabeIceMat, WABE_KINDS, farbFrameGeo, farbPanelGeo, farbColors, farbMix, drehGeo } from '../kinds/gimmicks_star.js';
import { retroBlockGeo, retroMat, RETRO_KINDS } from '../kinds/props_retro_star.js';

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();

function makeMesh(geometry, material, n, shadow, receive = true) {
  const m = new THREE.InstancedMesh(geometry, material, n);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.frustumCulled = false;
  m.castShadow = !!shadow; m.receiveShadow = receive;
  for (let i = 0; i < n; i++) m.setMatrixAt(i, ZERO);
  m.count = 0;
  return m;
}
const stName = (st) => (typeof st === 'string' ? st : st?.anim ?? 'idle');

/** Gerüst wie instanced_w8.js: parts = [{ mesh, per }], write(i, slot), tick(dt, slot, i) → neu schreiben? */
function base(name, n, parts, write, tick, extra = {}) {
  const root = new THREE.Group();
  root.name = `instanzen:${name}`;
  for (const p of parts) root.add(p.mesh);
  const meshes = parts.map((p) => p.mesh);
  const slots = Array.from({ length: n }, (_, i) => ({ on: false, pos: new THREE.Vector3(), quat: new THREE.Quaternion(), scale: new THREE.Vector3(1, 1, 1), state: 'hidden', st: {}, age: 9, phase: (i * 2.399) % TAU }));
  let used = 0;
  const dirty = () => { for (const m of meshes) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; } };
  const api = {
    root, meshes, count: n, name,
    setAt(i, pos, yaw = 0, scale = 1, state = 'idle') {
      const s = slots[i];
      if (!s) return;
      if (Array.isArray(pos)) s.pos.set(pos[0], pos[1], pos[2]); else s.pos.set(pos.x, pos.y, pos.z);
      if (yaw && yaw.isQuaternion) s.quat.copy(yaw); else s.quat.setFromAxisAngle(_p.set(0, 1, 0), Number(yaw) || 0);
      if (Array.isArray(scale)) s.scale.set(scale[0], scale[1], scale[2]); else s.scale.setScalar(Number(scale) || 1);
      s.on = true;
      if (i + 1 > used) { used = i + 1; for (const p of parts) p.mesh.count = Math.ceil(used * p.per); }
      api.setState(i, state);
    },
    setState(i, state) {
      const s = slots[i];
      if (!s) return;
      const nm = stName(state);
      if (nm !== s.state) s.age = 0;
      s.state = nm;
      s.st = typeof state === 'object' && state ? { ...state } : {};
      write(i, s); dirty();
    },
    getState(i) { const s = slots[i]; return s ? s.state : undefined; },
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
      extra.onDispose?.();
    },
  };
  api._slots = slots;
  return api;
}
const compose = (s, out) => out.compose(s.pos, s.quat, s.scale);

// ------------------------------------------------------------------ Wabe
function makeWabe(count, opts = {}) {
  const n = Math.max(1, count | 0);
  const kind = WABE_KINDS.includes(opts.kind) ? opts.kind : 'normal';
  const r = clamp(num(opts.size, 1), 0.3, 10), t = clamp(num(opts.thick, 0.5), 0.1, 5);
  const lit = kind === 'eis' ? wabeIceMat() : wabeLitMat();
  const body = makeMesh(wabeBodyGeo(kind, r, t, true), lit, n, true);
  const topMat = kind === 'lava' ? glowS() : lit;
  const top = makeMesh(wabeTopGeo(kind, r, true), topMat, n, false, kind !== 'lava');
  for (let i = 0; i < n; i++) top.setColorAt(i, _c.setScalar(1));
  const lift = new THREE.Matrix4();
  const write = (i, s) => {
    if (!s.on || s.state === 'hidden') { body.setMatrixAt(i, ZERO); top.setMatrixAt(i, ZERO); return; }
    const pr = clamp(num(s.st.press, 0), 0, 1), fl = clamp(num(s.st.flash, 0), 0, 1);
    _m2.makeTranslation(0, -pr * 0.08, 0);
    compose(s, _m).multiply(_m2);
    body.setMatrixAt(i, _m);
    lift.makeTranslation(0, t + 0.004, 0);
    top.setMatrixAt(i, _m.multiply(lift));
    const k = kind === 'lava' ? 0.82 + Math.sin(s.age * 2.3 + s.phase) * 0.12 + fl * 0.3 : 1 + fl * 0.4;
    top.setColorAt(i, _c.setScalar(k));
  };
  return base('wabe', n, [{ mesh: body, per: 1 }, { mesh: top, per: 1 }], write, () => kind === 'lava');
}

// ------------------------------------------------------------------ Farbplatte
function makeFarb(count, opts = {}) {
  const n = Math.max(1, count | 0);
  const [w, d] = sz2(opts.size, [2, 2]);
  const t = clamp(num(opts.thick, 0.25), 0.08, 2);
  const [A, B] = farbColors(opts.colors);
  const frame = makeMesh(farbFrameGeo(w, d, t - 0.05, true), toyS(0.3, 'farbrahmen'), n, true);
  const panel = makeMesh(farbPanelGeo(w, d, t, true), toyS(0.28, 'farbinst'), n, false);
  for (let i = 0; i < n; i++) panel.setColorAt(i, A);
  const up = new THREE.Matrix4().makeTranslation(0, t - 0.06, 0);
  const write = (i, s) => {
    if (!s.on || s.state === 'hidden') { frame.setMatrixAt(i, ZERO); panel.setMatrixAt(i, ZERO); return; }
    compose(s, _m);
    frame.setMatrixAt(i, _m);
    panel.setMatrixAt(i, _m2.copy(_m).multiply(up));
    const c = clamp(num(s.st.color, 0), 0, 1), fl = clamp(num(s.st.flash, 0), 0, 1);
    farbMix(A, B, c, _c);
    _c.multiplyScalar(1 + fl * 0.5);
    panel.setColorAt(i, _c);
  };
  return base('farbplatte', n, [{ mesh: frame, per: 1 }, { mesh: panel, per: 1 }], write, () => false);
}

// ------------------------------------------------------------------ Drehplatte
function makeDreh(count, opts = {}) {
  const n = Math.max(1, count | 0);
  const [w, d] = sz2(opts.size, [2, 2]);
  const t = clamp(num(opts.thick, 0.3), 0.08, 2);
  const axis = opts.axis === 'x' ? 'x' : 'z';
  const plate = makeMesh(drehGeo(w, d, t, opts.color ?? 'blau', opts.back ?? 'lila', axis, true), toyS(0.3, 'dreh'), n, true);
  const write = (i, s) => {
    if (!s.on || s.state === 'hidden') { plate.setMatrixAt(i, ZERO); return; }
    const tilt = num(s.st.tilt, 0) + clamp(num(s.st.shake, 0), 0, 1) * Math.sin(s.age * 38 + s.phase) * 0.035;
    _q.setFromEuler(axis === 'z' ? _e.set(0, 0, tilt) : _e.set(tilt, 0, 0));
    _m2.compose(_p.set(0, t / 2, 0), _q, _s.set(1, 1, 1));
    plate.setMatrixAt(i, compose(s, _m).multiply(_m2));
  };
  return base('drehplatte', n, [{ mesh: plate, per: 1 }], write, (dt, s) => num(s.st.shake, 0) > 0);
}

// ------------------------------------------------------------------ Retro-Block
function makeRetro(count, opts = {}) {
  const n = Math.max(1, count | 0);
  const kind = RETRO_KINDS.includes(opts.kind) ? opts.kind : 'gras';
  const S = clamp(num(opts.size, 2), 0.2, 30);
  const block = makeMesh(retroBlockGeo(kind, S, true), retroMat(), n, true);
  const write = (i, s) => {
    if (!s.on || s.state === 'hidden') { block.setMatrixAt(i, ZERO); return; }
    let dy = 0;
    if (s.state === 'bump') { const p = s.st.progress !== undefined ? clamp(num(s.st.progress, 0), 0, 1) : clamp(s.age / 0.25, 0, 1); dy = Math.sin(p * Math.PI) * 0.18 * S; }
    _m2.makeTranslation(0, dy, 0);
    block.setMatrixAt(i, compose(s, _m).multiply(_m2));
  };
  return base('retro_block', n, [{ mesh: block, per: 1 }], write, (dt, s) => s.state === 'bump' && s.age < 0.3);
}

void smoothstep; void panelColor;
export const INSTANCED = {
  wabe: makeWabe,
  farbplatte: makeFarb,
  drehplatte: makeDreh,
  retro_block: makeRetro,
};
