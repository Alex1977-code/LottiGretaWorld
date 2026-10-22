// Instanz-Varianten der massenhaften Welt-3-Requisiten (Schnee-/Eisblöcke, Tannen, Eiszapfen) mit derselben API wie
// createInstanced() in instanced.js (dort über import.meta.glob('./instanced_*.js') eingebunden):
//
//   const trees = createInstanced('tanne_schnee', 60);   // 'schneeblock' | 'eisblock' | 'tanne_schnee' | 'eiszapfen'
//   trees.setAt(i, pos, yaw = 0, scale = 1, state = 'idle');   // pos = Ursprung wie das Einzelmodell
//   trees.setState(i, state); trees.getState(i); trees.hide(i); trees.update(dt); trees.dispose();
//   trees.root, trees.meshes, trees.count, trees.name
//
// Zustände: alle 'idle' | 'hidden'; Blöcke zusätzlich 'bump' (Stoß 0,25 s); Tannen und Eiszapfen 'shake' (Wackeln 0,7 s).
// Ursprung: Blöcke/Tannen = Mitte der Unterseite, Eiszapfen = Aufhängung oben (Bündel aus 3, Länge 1 m × scale).
// Leistung: 1 InstancedMesh je Teil (Eisblock 2, sonst 1); Schatten wie die Einzelmodelle.

import { THREE } from './kit.js';
import { SNOW_PARTS } from './schnee_w3.js';

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();

function makeSnowInstanced(name, count) {
  const n = Math.max(1, count | 0);
  const root = new THREE.Group();
  root.name = `instanzen:${name}`;
  const parts = SNOW_PARTS[name]();
  const meshes = parts.map(({ geometry, material, shadow }) => {
    const m = new THREE.InstancedMesh(geometry, material, n);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false;
    m.castShadow = !!shadow; m.receiveShadow = name !== 'eiszapfen';
    for (let i = 0; i < n; i++) m.setMatrixAt(i, ZERO);
    m.count = 0;
    root.add(m);
    return m;
  });
  const slots = Array.from({ length: n }, () => ({ on: false, pos: new THREE.Vector3(), yaw: 0, scale: 1, state: 'hidden', age: 9 }));
  const isBlock = name === 'schneeblock' || name === 'eisblock';
  let used = 0;
  const write = (i) => {
    const s = slots[i];
    let M = ZERO;
    if (s.on && s.state !== 'hidden') {
      let y = 0, sy = 1, rx = 0, rz = 0;
      if (s.state === 'bump' && s.age < 0.25) { const k = s.age / 0.25; y = Math.sin(k * Math.PI) * 0.3; sy = 1 + Math.sin(k * Math.PI) * 0.08; }
      if (s.state === 'shake' && s.age < 0.7) { const k = 1 - s.age / 0.7; rx = Math.sin(s.age * 40) * 0.06 * k; rz = Math.cos(s.age * 33) * 0.06 * k; }
      _q.setFromEuler(_e.set(rx, s.yaw, rz, 'YXZ'));
      M = _m.compose(_p.set(s.pos.x, s.pos.y + y * s.scale, s.pos.z), _q, _s.set(s.scale, s.scale * sy, s.scale));
    }
    for (const m of meshes) m.setMatrixAt(i, M);
  };
  const dirty = () => { for (const m of meshes) m.instanceMatrix.needsUpdate = true; };
  const api = {
    root, meshes, count: n, name,
    setAt(i, pos, yaw = 0, scale = 1, state = 'idle') {
      const s = slots[i];
      if (!s) return;
      if (Array.isArray(pos)) s.pos.set(pos[0], pos[1], pos[2]); else s.pos.set(pos.x, pos.y, pos.z);
      s.yaw = yaw; s.scale = scale; s.on = true;
      if (i + 1 > used) { used = i + 1; for (const m of meshes) m.count = used; }
      api.setState(i, state);
    },
    setState(i, state) {
      const s = slots[i];
      if (!s) return;
      let st = typeof state === 'string' ? state : state?.anim ?? 'idle';
      if (st === 'bump' && !isBlock) st = 'shake';
      if (st !== s.state || st === 'bump' || st === 'shake') s.age = 0;
      s.state = st;
      write(i); dirty();
    },
    getState(i) { return slots[i]?.state; },
    hide(i) { api.setState(i, 'hidden'); },
    update(dt) {
      dt = Math.min(Math.max(dt || 0, 0), 0.1);
      let d = false;
      for (let i = 0; i < used; i++) {
        const s = slots[i];
        if (!s.on) continue;
        const was = s.age;
        s.age += dt;
        if ((s.state === 'bump' && was < 0.3) || (s.state === 'shake' && was < 0.75)) { write(i); d = true; }
      }
      if (d) dirty();
    },
    dispose() {
      root.removeFromParent();
      for (const m of meshes) m.dispose();
      meshes.length = 0;
    },
  };
  return api;
}

export const INSTANCED = {
  schneeblock: (n) => makeSnowInstanced('schneeblock', n),
  eisblock: (n) => makeSnowInstanced('eisblock', n),
  tanne_schnee: (n) => makeSnowInstanced('tanne_schnee', n),
  eiszapfen: (n) => makeSnowInstanced('eiszapfen', n),
};
