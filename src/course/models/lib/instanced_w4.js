// Instanz-Varianten der massenhaften Welt-4-Objekte mit derselben API wie createInstanced() in instanced.js (dort über
// import.meta.glob('./instanced_*.js') eingebunden; instanced.js bleibt unverändert):
//
//   const blocks = createInstanced('piep_block', 120, { color: 'rot' });   // je Farbe ein Satz
//   blocks.setAt(i, pos, yaw = 0, scale = 1, state = { on: 1 });           // pos = Ursprung wie das Einzelmodell
//   blocks.setState(i, state); blocks.getState(i); blocks.hide(i); blocks.update(dt); blocks.dispose();
//   blocks.root, blocks.meshes, blocks.count, blocks.name
//
// Arten und Zustände (state als String oder Objekt, 'hidden' blendet aus):
//   'piep_block'          opts { color: 'rot'|'blau' }  state { on (0..1), warn (0..1) } wie das Einzelmodell.
//                         Zusatz: setAll(state) setzt alle belegten Plätze auf einmal (Taktwechsel). getState(i) → 'hidden'
//                         oder { on, warn }. 3 InstancedMeshes (fest, Umriss, Füllung).
//   'ameisensoldat'       state 'walk'|'idle'|'carry'|'squashed' oder { anim, speed } wie das Einzelmodell; Beine laufen
//   'ameisensoldat_horn'  im Dreifuß-Gang (je Ameise eigene Phase). yaw darf auch ein THREE.Quaternion sein (volle
//                         Ausrichtung, z. B. an Wänden: lokales +Y = Flächennormale, +X = Laufrichtung).
//                         2 InstancedMeshes (Körper inkl. Helm/Augen, Beine 6 je Ameise).
//   'ruinen_saeule'       opts { height (3), broken (false) }  state 'idle'|'hidden'.  1 InstancedMesh.
//   'felsnadel'           opts { height (5) }                  state 'idle'|'hidden'.  1 InstancedMesh.
//   'giftpilz'            (2 m, scale skaliert)                state 'idle'|'shake'|'hidden'.  2 InstancedMeshes.
// Nicht gesetzte Plätze sind unsichtbar; Sichtbarkeitsprüfung aus (Instanzen liegen überall im Level).

import { THREE, TAU, clamp, smoothstep } from './kit.js';
import {
  piepSolidGeo, piepOutlineGeo, piepFillGeo, piepMats, antInstGeo, antLegGeo, antLegPose, ruinSaeuleGeo,
  felsnadelGeo, canyonMat,
} from './w4Geos.js';
import { vcol } from './kit.js';
import { giftpilzGeos, giftpilzMats } from './w4Props.js';

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler();
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();

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

/**
 * Gemeinsames Gerüst: parts = [{ mesh, per (Instanzen je Platz) }], write(i, slot) schreibt die Matrizen,
 * tick(dt, slot, i) → true, wenn neu geschrieben werden muss.
 */
function base(name, n, parts, write, tick, extra = {}) {
  const root = new THREE.Group();
  root.name = `instanzen:${name}`;
  for (const p of parts) root.add(p.mesh);
  const meshes = parts.map((p) => p.mesh);
  const slots = Array.from({ length: n }, () => ({ on: false, pos: new THREE.Vector3(), quat: new THREE.Quaternion(), scale: 1, state: 'hidden', st: {}, age: 9, phase: Math.random() * TAU }));
  let used = 0;
  const dirty = () => { for (const m of meshes) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; } };
  const api = {
    root, meshes, count: n, name,
    setAt(i, pos, yaw = 0, scale = 1, state = 'idle') {
      const s = slots[i];
      if (!s) return;
      if (Array.isArray(pos)) s.pos.set(pos[0], pos[1], pos[2]); else s.pos.set(pos.x, pos.y, pos.z);
      if (yaw && yaw.isQuaternion) s.quat.copy(yaw); else s.quat.setFromAxisAngle(_p.set(0, 1, 0), Number(yaw) || 0);
      s.scale = scale; s.on = true;
      if (i + 1 > used) { used = i + 1; for (const p of parts) p.mesh.count = used * p.per; }
      api.setState(i, state);
    },
    setState(i, state) {
      const s = slots[i];
      if (!s) return;
      const nm = stName(state);
      if (nm !== s.state || nm === 'shake' || nm === 'bump') s.age = 0;
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
      if (extra.afterUpdate) d = extra.afterUpdate(dt) || d;
      if (d) dirty();
    },
    dispose() {
      root.removeFromParent();
      for (const m of meshes) m.dispose();
      meshes.length = 0;
    },
  };
  if (extra.setAll) api.setAll = (state) => { for (let i = 0; i < used; i++) if (slots[i].on) { const s = slots[i]; s.state = stName(state); s.st = typeof state === 'object' && state ? { ...state } : {}; write(i, s); } dirty(); };
  api._slots = slots;
  return api;
}
const compose = (s, out, dy = 0, sy = 1, extraQ = null) => {
  _q.copy(s.quat); if (extraQ) _q.multiply(extraQ);
  _p.set(0, dy * s.scale, 0).applyQuaternion(s.quat).add(s.pos);
  return out.compose(_p, _q, _s.set(s.scale, s.scale * sy, s.scale));
};

// ------------------------------------------------------------------ Piep-Block
function makePiep(count, opts = {}) {
  const n = Math.max(1, count | 0);
  const color = opts.color === 'blau' ? 'blau' : 'rot';
  const mats = piepMats(color);
  const solid = makeMesh(piepSolidGeo(color, true), mats.solid, n, true);
  const outline = makeMesh(piepOutlineGeo(), mats.outline, n, false, false);
  const fill = makeMesh(piepFillGeo(), mats.fill, n, false, false);
  outline.renderOrder = 3; fill.renderOrder = 2;
  for (const m of [solid, outline, fill]) { m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3); m.instanceColor.setUsage(THREE.DynamicDrawUsage); }
  let t = 0;
  const write = (i, s) => {
    if (!s.on || s.state === 'hidden') { solid.setMatrixAt(i, ZERO); outline.setMatrixAt(i, ZERO); fill.setMatrixAt(i, ZERO); return; }
    const on = clamp(Number(s.st.on ?? (s.state === 'off' ? 0 : 1)), 0, 1), warn = clamp(Number(s.st.warn ?? 0), 0, 1);
    const k = smoothstep(on);
    const blink = warn > 0 ? (Math.sin(t * TAU * (5 + warn * 5)) > 0 ? 1 : 0) * warn : 0;
    if (on > 0.02) {
      const sc = 0.55 + 0.45 * k;
      _q.copy(s.quat);
      _p.set(0, 0.5 * s.scale * (1 - sc), 0).applyQuaternion(s.quat).add(s.pos);
      solid.setMatrixAt(i, _m.compose(_p, _q, _s.setScalar(s.scale * sc)));
      solid.setColorAt(i, _c.setScalar(1 + blink * 0.9));
    } else solid.setMatrixAt(i, ZERO);
    if (on < 0.98) {
      compose(s, _m);
      outline.setMatrixAt(i, _m); fill.setMatrixAt(i, _m);
      outline.setColorAt(i, _c.setScalar((1 - k) * (1 - blink * 0.5) + blink * 0.6));
      fill.setColorAt(i, _c.setScalar((1 - k) * (1 + warn * 1.5 + blink)));
    } else { outline.setMatrixAt(i, ZERO); fill.setMatrixAt(i, ZERO); }
  };
  const api = base('piep_block', n, [{ mesh: solid, per: 1 }, { mesh: outline, per: 1 }, { mesh: fill, per: 1 }], write,
    (dt, s) => Number(s.st.warn ?? 0) > 0,
    {
      setAll: true,
      getState: (s) => (s.state === 'hidden' ? 'hidden' : { on: Number(s.st.on ?? 1), warn: Number(s.st.warn ?? 0) }),
      afterUpdate: (dt) => { t += dt; return false; },
    });
  api.color = color;
  return api;
}

// ------------------------------------------------------------------ Ameisen
function makeAnts(name, horn) {
  return (count) => {
    const n = Math.max(1, count | 0);
    const body = makeMesh(antInstGeo(horn), vcol(0.3), n, true);
    const legs = makeMesh(antLegGeo(true), vcol(0.45), n * 6, true);
    const write = (i, s) => {
      if (!s.on || s.state === 'hidden') { body.setMatrixAt(i, ZERO); for (let k = 0; k < 6; k++) legs.setMatrixAt(i * 6 + k, ZERO); return; }
      const flat = s.state === 'squashed', carry = s.state === 'carry', moving = s.state === 'walk' || carry;
      const sy = flat ? 0.34 : 1;
      const bob = moving ? Math.abs(Math.sin(s.phase)) * 0.018 : 0;
      const low = carry ? 0.04 : 0;
      // Körper: Ursprung Boden; Wippen und Absenken entlang lokalem +Y
      _q.copy(s.quat);
      _p.set(0, (bob - low) * s.scale, 0).applyQuaternion(s.quat).add(s.pos);
      _m2.compose(_p, _q, _s.set(s.scale * (flat ? 1.25 : 1), s.scale * sy, s.scale * (flat ? 1.3 : 1)));
      body.setMatrixAt(i, _m2);
      const a = carry ? 0.28 : 0.36;
      const amp = moving ? a : 0, lift = moving ? 0.45 : 0;
      for (let k = 0; k < 6; k++) {
        antLegPose(k, s.phase, amp, lift, flat ? 1.1 : 0, 0.3 - low, 1, _m);
        legs.setMatrixAt(i * 6 + k, _m.premultiply(_m2));
      }
    };
    const tick = (dt, s) => {
      const moving = s.state === 'walk' || s.state === 'carry';
      if (!moving) return s.age < 0.05;
      const speed = Number(s.st.speed ?? (s.state === 'carry' ? 1.2 : 1.5));
      const a = s.state === 'carry' ? 0.28 : 0.36;
      s.phase += dt * (Math.max(0.3, speed) / (4 * a * 0.36)) * TAU;
      return true;
    };
    return base(name, n, [{ mesh: body, per: 1 }, { mesh: legs, per: 6 }], write, tick);
  };
}

// ------------------------------------------------------------------ statische Kulisse (Säulen, Felsnadeln, Giftpilze)
function makeStatic(name, partsFn, shake = false) {
  return (count, opts = {}) => {
    const n = Math.max(1, count | 0);
    const parts = partsFn(opts).map(({ geometry, material, shadow }) => ({ mesh: makeMesh(geometry, material, n, shadow), per: 1 }));
    const shakeQ = new THREE.Quaternion();
    const write = (i, s) => {
      let M = ZERO;
      if (s.on && s.state !== 'hidden') {
        let q = null;
        if (shake && s.state === 'shake' && s.age < 0.8) {
          const k = 1 - s.age / 0.8;
          q = shakeQ.setFromEuler(_e.set(Math.sin(s.age * 30) * 0.1 * k, 0, Math.cos(s.age * 26) * 0.1 * k));
        }
        M = compose(s, _m, 0, 1, q);
      }
      for (const p of parts) p.mesh.setMatrixAt(i, M);
    };
    const tick = (dt, s) => shake && s.state === 'shake' && s.age < 0.85;
    return base(name, n, parts, write, tick);
  };
}

export const INSTANCED = {
  piep_block: makePiep,
  ameisensoldat: makeAnts('ameisensoldat', false),
  ameisensoldat_horn: makeAnts('ameisensoldat_horn', true),
  ruinen_saeule: makeStatic('ruinen_saeule', (o) => [{ geometry: ruinSaeuleGeo(clamp(Math.round((o.height ?? 3) * 10) / 10, 1, 20), !!o.broken, true), material: vcol(0.75, {}, 'w4stone'), shadow: true }]),
  felsnadel: makeStatic('felsnadel', (o) => [{ geometry: felsnadelGeo(clamp(Math.round((o.height ?? 5) * 2) / 2, 1.5, 40), true), material: canyonMat(), shadow: true }]),
  giftpilz: makeStatic('giftpilz', () => { const g = giftpilzGeos(true), m = giftpilzMats(); return [{ geometry: g.body, material: m.body, shadow: true }, { geometry: g.glow, material: m.glow, shadow: false }]; }, true),
};
