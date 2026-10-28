// Instanz-Varianten der massenhaften Welt-7-Objekte mit derselben API wie createInstanced() in instanced.js (dort über
// import.meta.glob('./instanced_*.js') eingebunden; instanced.js bleibt unverändert):
//
//   const grid = createInstanced('gitterboden', 40);
//   grid.setAt(i, pos, yaw = 0, scale = 1, state = 'idle');   // pos = Ursprung wie das Einzelmodell; scale auch [sx, sy, sz]
//   grid.setState(i, state); grid.getState(i); grid.hide(i); grid.update(dt); grid.dispose();
//   grid.root, grid.meshes, grid.count, grid.name
//
// Arten und Zustände (state als String oder Objekt, 'hidden' blendet aus):
//   'gitterboden'          1 × 1-m-Kachel (Oberseite y = thick, pos = Mitte der Unterseite); opts { thick (0,15) };
//                          state 'idle' | 'hidden'.  1 InstancedMesh.
//   'basaltsaeule'         Basaltsäulen-Gruppe (3 Säulen, höchste 3 m, Radius 0,7 – scale skaliert), Glut am Fuß;
//                          opts { glow: 'rot' (Standard) | 'blau' | false }; state 'idle' | 'hidden'.  2 InstancedMeshes
//                          (Kulisse, ohne Spielzeug-Look).
//   'lavablase'            Lavablase wie das Einzelmodell (Ø 1 · scale), pos = Lava-Oberfläche; opts { color: 'rot' | 'blau' };
//                          state 'idle' (blubbert) | { anim: 'swell', grow } | { anim: 'jump'|'fall', progress? } (Tropfen,
//                          der Aufrufer setzt die Höhe über pos) | 'hidden'.  2 InstancedMeshes (Blase, Glanz).
//   'zerbrechliche_kiste'  Kiste wie das Einzelmodell (Kante 1 · scale, pos = Mitte der Unterseite); state 'idle' |
//                          { break } (0..1: schrumpft wirbelnd weg – die Bretter-Explosion zeigt das Einzelmodell) | 'hidden'.
//                          1 InstancedMesh.
// Nicht gesetzte Plätze sind unsichtbar; Sichtbarkeitsprüfung aus (Instanzen liegen überall im Level).

import { THREE, TAU, clamp, vcol, Build, cached, mix, smoothstep } from './kit.js';
import { grateGeo, crateGeo, LAVA7, lavaKey, glow7, kulMat7, hash1, taperTube } from './w7Geos.js';
import { basaltGeo } from '../kinds/props_festung_w7.js';

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
const stName = (st) => (typeof st === 'string' ? st : st?.anim ?? (st && st.break !== undefined ? 'break' : 'idle'));

/** Gemeinsames Gerüst wie instanced_w6.js: parts = [{ mesh, per }], write(i, slot), tick(dt, slot, i) → neu schreiben? */
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
      if (i + 1 > used) { used = i + 1; for (const p of parts) p.mesh.count = used * p.per; }
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
const compose = (s, out, extraQ = null, dy = 0, sMul = null) => {
  _q.copy(s.quat); if (extraQ) _q.multiply(extraQ);
  _p.set(0, dy * s.scale.y, 0).applyQuaternion(s.quat).add(s.pos);
  _s.copy(s.scale); if (sMul) _s.multiply(sMul);
  return out.compose(_p, _q, _s);
};

// ------------------------------------------------------------------ Gitterboden (1-m-Kachel)
function makeGitter(count, opts = {}) {
  const n = Math.max(1, count | 0);
  const t = Math.max(0.05, Number(opts.thick ?? 0.15));
  const body = makeMesh(grateGeo(1, 1, t, true), vcol(0.38, { metalness: 0.4 }, 'w7grate'), n, true);
  const write = (i, s) => { body.setMatrixAt(i, !s.on || s.state === 'hidden' ? ZERO : compose(s, _m)); };
  return base('gitterboden', n, [{ mesh: body, per: 1 }], write, () => false);
}

// ------------------------------------------------------------------ Basaltsäulen (Kulisse)
function basaltGlowLo(key) {
  const L = LAVA7[key];
  return cached(`w7:basalt:glowlo:${key}`, () => {
    const b = new Build();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU + 0.4;
      const pts = [0, 1, 2].map((k) => { const rr = 0.35 + k * 0.3; const aa = a + Math.sin(k * 2.1 + i) * 0.2; return [Math.cos(aa) * rr, 0.02, Math.sin(aa) * rr]; });
      b.add(taperTube(pts, (t) => 0.05 * (1 - t * 0.7), 6, 3), { v: (x, y, z) => mix(L.white, L.hot, smoothstep(Math.hypot(x, z) / 1.0)) });
    }
    return b.geometry();
  });
}
function makeBasalt(count, opts = {}) {
  const n = Math.max(1, count | 0);
  const body = makeMesh(basaltGeo(3, 0.7, 3, 2, true), kulMat7(0.8), n, true);
  const parts = [{ mesh: body, per: 1 }];
  let glow = null;
  if (opts.glow !== false) { glow = makeMesh(basaltGlowLo(lavaKey(opts.glow)), glow7(), n, false, false); parts.push({ mesh: glow, per: 1 }); }
  const write = (i, s) => {
    const m = !s.on || s.state === 'hidden' ? ZERO : compose(s, _m);
    body.setMatrixAt(i, m);
    if (glow) glow.setMatrixAt(i, m);
  };
  return base('basaltsaeule', n, parts, write, () => false);
}

// ------------------------------------------------------------------ Lavablase
function blobLoGeo(key) {
  const L = LAVA7[key];
  return cached(`w7:blob:lo:${key}`, () => new Build().sphere(0.5, { v: (x, y, z, nx, ny) => mix(mix(L.deep, L.hot, smoothstep(ny * 0.6 + 0.5)), L.white, smoothstep((nx * 0.4 + ny * 0.7 - 0.55) / 0.4)) }, {}, 16, 10).geometry());
}
const shineLoGeo = () => cached('w7:blob:shine:lo', () => new Build().sphere(1, 0xffffff, { p: [0.12, 0.36, -0.17], s: [0.12, 0.07, 0.08], r: [0.3, 0.6, 0] }, 8, 6).geometry());
function makeBlase(count, opts = {}) {
  const n = Math.max(1, count | 0);
  const key = lavaKey(opts.color);
  const blob = makeMesh(blobLoGeo(key), glow7(), n, false, false);
  const shine = makeMesh(shineLoGeo(), vcol(0.08, {}, 'w7shine'), n, false, false);
  const sv = new THREE.Vector3();
  const write = (i, s) => {
    if (!s.on || s.state === 'hidden') { blob.setMatrixAt(i, ZERO); shine.setMatrixAt(i, ZERO); return; }
    const t = s.age + s.phase;
    let bs = 0.42 + (Math.sin(t * 2.6) + 1) * 0.06, sy = 0.9, by = -0.14;
    if (s.state === 'swell') { const g = clamp(Number(s.st.grow ?? Math.min(1, s.age / 1.2)), 0, 1); bs = 0.45 + g * 0.55; by = -0.14 + g * 0.09; }
    else if (s.state === 'jump' || s.state === 'fall') { bs = 0.62; sy = 1.05; by = 0.31; }
    compose(s, _m, null, by, sv.set(bs * (2 - sy), bs * sy, bs * (2 - sy)));
    blob.setMatrixAt(i, _m); shine.setMatrixAt(i, _m);
  };
  return base('lavablase', n, [{ mesh: blob, per: 1 }, { mesh: shine, per: 1 }], write, () => true);
}

// ------------------------------------------------------------------ Zerbrechliche Kiste
function makeKiste(count) {
  const n = Math.max(1, count | 0);
  const body = makeMesh(crateGeo(1, true), vcol(0.62, {}, 'w7crate'), n, true);
  const sv = new THREE.Vector3();
  const write = (i, s) => {
    if (!s.on || s.state === 'hidden') { body.setMatrixAt(i, ZERO); return; }
    const br = s.state === 'break' ? clamp(Number(s.st.break ?? 1), 0, 1) : 0;
    if (br >= 0.999) { body.setMatrixAt(i, ZERO); return; }
    const k = 1 - smoothstep(br);
    _q2.setFromEuler(_e.set(0, br * 6, br * 0.8));
    compose(s, _m, br > 0 ? _q2 : null, br * 0.4, sv.set(k, k, k));
    body.setMatrixAt(i, _m);
  };
  return base('zerbrechliche_kiste', n, [{ mesh: body, per: 1 }], write, () => false);
}

export const INSTANCED = {
  gitterboden: makeGitter,
  basaltsaeule: makeBasalt,
  lavablase: makeBlase,
  zerbrechliche_kiste: makeKiste,
};
