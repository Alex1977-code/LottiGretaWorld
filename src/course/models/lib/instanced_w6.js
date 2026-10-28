// Instanz-Varianten der massenhaften Welt-6-Objekte mit derselben API wie createInstanced() in instanced.js (dort über
// import.meta.glob('./instanced_*.js') eingebunden; instanced.js bleibt unverändert):
//
//   const bits = createInstanced('gelee_brocken', 30, { color: 'silber' });
//   bits.setAt(i, pos, yaw = 0, scale = 1, state = 'idle');   // pos = Ursprung wie das Einzelmodell
//   bits.setState(i, state); bits.getState(i); bits.hide(i); bits.update(dt); bits.dispose();
//   bits.root, bits.meshes, bits.count, bits.name
//   scale darf auch [sx, sy, sz] sein.
//
// Arten und Zustände (state als String oder Objekt, 'hidden' blendet aus):
//   'gelee_brocken' opts { color (Standard 'silber'), size (Kante, 0,5) }; pos = Mitte der Unterseite;
//                   state 'idle' (wabbelt) | 'hop' (hüpft auf der Stelle, 0,6 s Zyklus) | 'fly' (überschlägt sich) | 'hidden'.
//                   1 InstancedMesh.
//   'klettergitter' 1 × 1-m-Kachel (Fläche in Y-Z, Vorderseite +X; pos = Mitte der Unterkante), schmaler Bambusrahmen;
//                   opts { frame (true) }; state 'idle' | 'shake' (0,4 s rütteln) | 'hidden'.  1 InstancedMesh.
//   'foerderband'   1 × 1-m-Kachel (Länge X, Breite Z, Dicke 0,5; pos = Mitte der Unterseite), Band läuft nach +X;
//                   opts { thick (0,5), speed (m/s, Standard 0 – nur über setOffset) }; state 'idle' | 'hidden'.
//                   Zusatz: setOffset(m) setzt die Bandstellung aller Kacheln (gemeinsame Textur), api.speed läuft in update.
//                   3 InstancedMeshes (Rahmen, Band, Rollen).
//   'stachelkugel'  opts { color ('eisen'), size (Ø, 1) }; pos = Bodenpunkt; state 'idle' | { roll } (rad, um −Z) | 'hidden'.
//                   1 InstancedMesh.
//   'bergkiefer'    Bergkiefer ≈5 m (scale skaliert); state 'idle' | 'hidden'.  1 InstancedMesh (Kulisse, ohne Spielzeug-Look).
// Nicht gesetzte Plätze sind unsichtbar; Sichtbarkeitsprüfung aus (Instanzen liegen überall im Level).

import { THREE, TAU, clamp, vcol } from './kit.js';
import {
  spikeBallGeo, spikeMat, gitterGeo, kieferGeo, kulMat, beltTexture, jellyMat, jellyColor, brockenGeo, beltFrameGeo, beltRollerGeo,
} from './w6Geos.js';

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
const stName = (st) => (typeof st === 'string' ? st : st?.anim ?? 'idle');

/** Gemeinsames Gerüst wie instanced_w5.js: parts = [{ mesh, per }], write(i, slot), tick(dt, slot, i) → neu schreiben? */
function base(name, n, parts, write, tick, extra = {}) {
  const root = new THREE.Group();
  root.name = `instanzen:${name}`;
  for (const p of parts) root.add(p.mesh);
  const meshes = parts.map((p) => p.mesh);
  const slots = Array.from({ length: n }, (_, i) => ({ on: false, pos: new THREE.Vector3(), quat: new THREE.Quaternion(), scale: new THREE.Vector3(1, 1, 1), state: 'hidden', st: {}, age: 9, phase: (i * 2.399) % TAU }));
  let used = 0;
  const dirty = () => { for (const m of meshes) m.instanceMatrix.needsUpdate = true; };
  const api = {
    root, meshes, count: n, name,
    setAt(i, pos, yaw = 0, scale = 1, state = 'idle') {
      const s = slots[i];
      if (!s) return;
      if (Array.isArray(pos)) s.pos.set(pos[0], pos[1], pos[2]); else s.pos.set(pos.x, pos.y, pos.z);
      if (yaw && yaw.isQuaternion) s.quat.copy(yaw); else s.quat.setFromAxisAngle(_p.set(0, 1, 0), Number(yaw) || 0);
      if (Array.isArray(scale)) s.scale.set(scale[0], scale[1], scale[2]); else s.scale.setScalar(Number(scale) || 1);
      s.on = true;
      if (i + 1 > used) { used = i + 1; for (const p of parts) if (!p.fixed) p.mesh.count = used * p.per; }
      api.setState(i, state);
    },
    setState(i, state) {
      const s = slots[i];
      if (!s) return;
      const nm = stName(state);
      if (nm !== s.state || nm === 'shake') s.age = 0;
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
      if (extra.afterUpdate) d = extra.afterUpdate(dt) || d;
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
const compose = (s, out, extraQ = null, dy = 0, sMul = null) => {
  _q.copy(s.quat); if (extraQ) _q.multiply(extraQ);
  _p.set(0, dy * s.scale.y, 0).applyQuaternion(s.quat).add(s.pos);
  _s.copy(s.scale); if (sMul) _s.multiply(sMul);
  return out.compose(_p, _q, _s);
};

// ------------------------------------------------------------------ Gelee-Brocken
function makeBrocken(count, opts = {}) {
  const n = Math.max(1, count | 0);
  const color = jellyColor(opts.color ?? 'silber');
  const size = Math.max(0.1, Number(opts.size ?? 0.5));
  const body = makeMesh(brockenGeo(color, true), jellyMat(color), n, true);
  const sv = new THREE.Vector3();
  const write = (i, s) => {
    if (!s.on || s.state === 'hidden') { body.setMatrixAt(i, ZERO); return; }
    const t = s.age + s.phase;
    let sy = 1 + Math.sin(t * 6) * 0.04, lift = 0, q = null;
    if (s.state === 'hop') { const p = (s.age % 0.6) / 0.6; sy = p < 0.2 ? 1 - Math.sin(p / 0.2 * Math.PI) * 0.25 : 1 + Math.sin((p - 0.2) / 0.8 * Math.PI) * 0.12; lift = Math.sin(Math.max(0, p - 0.2) / 0.8 * Math.PI) * 0.6; }
    else if (s.state === 'fly') { q = _q2.setFromEuler(_e.set(t * 6, 0, t * 9)); lift = 0.5; }
    const w = 1 / Math.sqrt(Math.max(0.3, sy));
    compose(s, _m, q, lift * size, sv.set(size * w, size * sy, size * w));
    body.setMatrixAt(i, _m);
  };
  return base('gelee_brocken', n, [{ mesh: body, per: 1 }], write, () => true);
}

// ------------------------------------------------------------------ Klettergitter (1-m-Kachel)
function makeGitter(count, opts = {}) {
  const n = Math.max(1, count | 0);
  const body = makeMesh(gitterGeo(1, 1, opts.frame !== false, true), vcol(0.55, {}, 'w6gitter'), n, true);
  const write = (i, s) => {
    if (!s.on || s.state === 'hidden') { body.setMatrixAt(i, ZERO); return; }
    compose(s, _m);
    if (s.state === 'shake' && s.age < 0.4) _m.elements[12] += Math.sin(s.age * 60) * 0.03 * (1 - s.age / 0.4);
    body.setMatrixAt(i, _m);
  };
  return base('klettergitter', n, [{ mesh: body, per: 1 }], write, (dt, s) => s.state === 'shake' && s.age < 0.45);
}

// ------------------------------------------------------------------ Förderband (1-m-Kachel)
function makeBand(count, opts = {}) {
  const n = Math.max(1, count | 0);
  const T = Math.max(0.15, Number(opts.thick ?? 0.5));
  const tex = beltTexture().clone();
  tex.needsUpdate = true;
  const bandMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 });
  const frame = makeMesh(beltFrameGeo(1, 1, T, true), vcol(0.3, { metalness: 0.3 }, 'w6steel'), n, true);
  const topGeo = new THREE.PlaneGeometry(1, 1); topGeo.rotateX(-Math.PI / 2); topGeo.translate(0, T + 0.002, 0);
  const band = makeMesh(topGeo, bandMat, n, false);
  const rollers = makeMesh(beltRollerGeo(1, T), vcol(0.35), n * 2, true);
  const rq = new THREE.Quaternion();
  let off = 0;
  const write = (i, s) => {
    if (!s.on || s.state === 'hidden') { frame.setMatrixAt(i, ZERO); band.setMatrixAt(i, ZERO); rollers.setMatrixAt(i * 2, ZERO); rollers.setMatrixAt(i * 2 + 1, ZERO); return; }
    frame.setMatrixAt(i, compose(s, _m));
    band.setMatrixAt(i, _m);
    for (let k = 0; k < 2; k++) {
      rq.setFromEuler(_e.set(0, 0, -off / (T * 0.42)));
      _q.copy(s.quat).multiply(rq);
      _p.set((k ? -1 : 1) * (0.5 - T * 0.1), T * 0.55, 0).multiply(s.scale).applyQuaternion(s.quat).add(s.pos);
      rollers.setMatrixAt(i * 2 + k, _m.compose(_p, _q, s.scale));
    }
  };
  const api = base('foerderband', n, [{ mesh: frame, per: 1 }, { mesh: band, per: 1 }, { mesh: rollers, per: 2 }], write, () => false, {
    afterUpdate: (dt) => {
      if (!api.speed) return false;
      api.setOffset(off + dt * api.speed);
      return false;
    },
    onDispose: () => { tex.dispose(); bandMat.dispose(); topGeo.dispose(); },
  });
  api.speed = Number(opts.speed ?? 0) || 0;
  api.setOffset = (v) => {
    off = Number(v) || 0;
    tex.offset.x = -off;
    for (let i = 0; i < api._slots.length; i++) if (api._slots[i].on) write(i, api._slots[i]);
    rollers.instanceMatrix.needsUpdate = true;
  };
  return api;
}

// ------------------------------------------------------------------ Stachelkugel
function makeKugel(count, opts = {}) {
  const n = Math.max(1, count | 0);
  const size = Math.max(0.2, Number(opts.size ?? 1));
  const body = makeMesh(spikeBallGeo(['eisen', 'lila', 'rot'].includes(opts.color) ? opts.color : 'eisen', true), spikeMat(), n, true);
  const rq = new THREE.Quaternion();
  const write = (i, s) => {
    if (!s.on || s.state === 'hidden') { body.setMatrixAt(i, ZERO); return; }
    rq.setFromEuler(_e.set(0, 0, -(Number(s.st.roll) || 0)));
    compose(s, _m, rq, size / 2, _s.set(size, size, size).clone());
    body.setMatrixAt(i, _m);
  };
  return base('stachelkugel', n, [{ mesh: body, per: 1 }], write, () => false);
}

// ------------------------------------------------------------------ Bergkiefer (Kulisse)
function makeKiefer(count) {
  const n = Math.max(1, count | 0);
  const body = makeMesh(kieferGeo(5, true, 1), kulMat(0.75), n, true);
  const write = (i, s) => { body.setMatrixAt(i, !s.on || s.state === 'hidden' ? ZERO : compose(s, _m)); };
  return base('bergkiefer', n, [{ mesh: body, per: 1 }], write, () => false);
}

export const INSTANCED = {
  gelee_brocken: makeBrocken,
  klettergitter: makeGitter,
  foerderband: makeBand,
  stachelkugel: makeKugel,
  bergkiefer: makeKiefer,
};
