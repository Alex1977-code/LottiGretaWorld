// Instanz-Varianten der massenhaften Welt-5-Objekte mit derselben API wie createInstanced() in instanced.js (dort über
// import.meta.glob('./instanced_*.js') eingebunden; instanced.js bleibt unverändert):
//
//   const tiles = createInstanced('flipper_feld', 64, { color: 'rot', size: [1, 1], thick: 1 });   // je Farbe ein Satz
//   tiles.setAt(i, pos, yaw = 0, scale = 1, state = { flip: 0 });   // pos = Ursprung wie das Einzelmodell
//   tiles.setState(i, state); tiles.getState(i); tiles.hide(i); tiles.update(dt); tiles.dispose();
//   tiles.root, tiles.meshes, tiles.count, tiles.name
//   scale darf hier auch [sx, sy, sz] sein (z. B. Einheitsfeld auf [2, 0,35, 2] strecken – wie im Baustein flipper).
//
// Arten und Zustände (state als String oder Objekt, 'hidden' blendet aus):
//   'flipper_feld'  opts { color: 'rot'|'blau', size: [w, d] ([1, 1]), thick (1), back: 'gitter'|'farbe' }
//                   pos = Mitte des Felds; state { flip (0..1) } oder 'idle' (≙ flip 0) | 'flipped' (≙ flip 1).
//                   Zusatz: setAll(state) setzt alle belegten Plätze (Farbwechsel bei jedem Sprung).
//                   3 InstancedMeshes (Rahmen, Platte, Gitter bzw. Gegenfarbe).
//   'lila_ziegel'   1-m-Block aus lila Ziegeln (pos = Mitte der Unterseite); state 'idle'|'shake' (0,4 s)|'break' (Block
//                   weg, Bruchstücke fliegen 1,2 s; bis zu 4 gleichzeitig)|'hidden'.  2 InstancedMeshes.
//   'donut_block'   opts { color: 'rosa'|'schoko'|'gelb' }; pos = Mitte der Unterseite; state 'idle'|'shake'|'fall'|'hidden'
//                   (fall: kippelt; den Fall macht der Motor über setAt).  1 InstancedMesh.
//   'steppengras'   Büschel ≈0,7 m (scale skaliert); state 'idle'|'hidden'.  1 InstancedMesh.
//   'sahnetupfer'   Sahnetupfer ≈0,36 m (pos = Mitte unten); state 'idle'|'hidden'.  1 InstancedMesh.
// Nicht gesetzte Plätze sind unsichtbar; Sichtbarkeitsprüfung aus (Instanzen liegen überall im Level).

import { THREE, TAU, clamp } from './kit.js';
import {
  flipperGeo, flipperMats, lilaZiegelGeo, lilaChunkGeo, lilaMat, lilaTexMat, donutBlockGeo, donutMat, steppengrasGeo, grassMat,
  sahneGeo, sahneMat,
} from './w5Geos.js';

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler();
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _ax = new THREE.Vector3(1, 0, 0);

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
 * Gemeinsames Gerüst: parts = [{ mesh, per }], write(i, slot) schreibt die Matrizen, tick(dt, slot, i) → true, wenn neu
 * geschrieben werden muss. scale je Platz: Zahl oder [sx, sy, sz].
 */
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
      if (nm !== s.state || nm === 'shake') { if (extra.onEnter) extra.onEnter(s, nm); s.age = 0; }
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
  if (extra.setAll) api.setAll = (state) => { for (let i = 0; i < used; i++) if (slots[i].on && slots[i].state !== 'hidden') { const s = slots[i]; s.state = stName(state); s.st = typeof state === 'object' && state ? { ...state } : {}; write(i, s); } dirty(); };
  api._slots = slots;
  return api;
}
/** Matrix eines Platzes: Lage, Gier (+ extraQ lokal), Maßstab (Vektor) und Versatz dy (lokal, skaliert). */
const compose = (s, out, extraQ = null, dy = 0, sMul = null) => {
  _q.copy(s.quat); if (extraQ) _q.multiply(extraQ);
  _p.set(0, dy * s.scale.y, 0).applyQuaternion(s.quat).add(s.pos);
  _s.copy(s.scale); if (sMul) _s.multiply(sMul);
  return out.compose(_p, _q, _s);
};

// ------------------------------------------------------------------ Flipper-Feld
function makeFlipper(count, opts = {}) {
  const n = Math.max(1, count | 0);
  const color = opts.color === 'blau' || opts.color === 'b' ? 'blau' : 'rot';
  const sz = Array.isArray(opts.size) ? opts.size : [1, 1];
  const w = Math.max(0.2, sz[0] ?? 1), d = Math.max(0.2, sz.length >= 3 ? sz[2] : (sz[1] ?? 1)), t = Math.max(0.05, opts.thick ?? 1);
  const farbe = opts.back === 'farbe';
  const M = flipperMats();
  const solid = makeMesh(flipperGeo('solid', color, w, d, t, true), M.solid, n, true);
  const plate = makeMesh(flipperGeo('plate', color, w, d, t, true), M.plate, n, true);
  const rear = farbe ? makeMesh(flipperGeo('back', color, w, d, t, true), M.plate, n, true) : makeMesh(flipperGeo('grid', color, w, d, t, true), M.grid, n, false, false);
  if (!farbe) rear.renderOrder = 2;
  const flipOf = (s) => clamp(Number(s.st.flip ?? (s.state === 'flipped' ? 1 : 0)), 0, 1);
  const write = (i, s) => {
    if (!s.on || s.state === 'hidden') { solid.setMatrixAt(i, ZERO); plate.setMatrixAt(i, ZERO); rear.setMatrixAt(i, ZERO); return; }
    const a = flipOf(s) * Math.PI;
    compose(s, _m, _q2.setFromAxisAngle(_ax, a));
    solid.setMatrixAt(i, _m);
    const up = Math.cos(a) > 0;
    plate.setMatrixAt(i, up || farbe ? _m : ZERO);
    rear.setMatrixAt(i, !up || farbe ? _m : ZERO);
  };
  const api = base('flipper_feld', n, [{ mesh: solid, per: 1 }, { mesh: plate, per: 1 }, { mesh: rear, per: 1 }], write, () => false, {
    setAll: true,
    getState: (s) => (s.state === 'hidden' ? 'hidden' : { flip: flipOf(s) }),
  });
  api.color = color;
  return api;
}

// ------------------------------------------------------------------ Lila Ziegel (mit Bruchstücken)
function makeLila(count) {
  const n = Math.max(1, count | 0);
  const body = makeMesh(lilaZiegelGeo(1, 1, 1, true), lilaTexMat(), n, true);
  const chunks = makeMesh(lilaChunkGeo(), lilaMat(), 32, true);
  chunks.count = 32;
  let breaks = [];
  const shakeQ = new THREE.Quaternion();
  const write = (i, s) => {
    if (!s.on || s.state === 'hidden' || s.state === 'break') { body.setMatrixAt(i, ZERO); return; }
    let q = null;
    if (s.state === 'shake' && s.age < 0.4) { const k = 1 - s.age / 0.4; q = shakeQ.setFromEuler(_e.set(Math.sin(s.age * 50) * 0.06 * k, 0, Math.cos(s.age * 43) * 0.06 * k)); }
    body.setMatrixAt(i, compose(s, _m, q));
  };
  const api = base('lila_ziegel', n, [{ mesh: body, per: 1 }, { mesh: chunks, per: 1, fixed: true }], write,
    (dt, s) => s.state === 'shake' && s.age < 0.45,
    {
      onEnter: (s, nm) => { if (nm === 'break' && s.state !== 'break') breaks.push({ pos: s.pos.clone(), scale: s.scale.x, age: 0 }); },
      afterUpdate: (dt) => {
        breaks = breaks.filter((b) => (b.age += dt) < 1.2).slice(-4);
        for (let k = 0; k < 32; k++) chunks.setMatrixAt(k, ZERO);
        breaks.forEach((b, bi) => {
          for (let c = 0; c < 8; c++) {
            const x0 = c & 1 ? 0.25 : -0.25, y0 = c & 2 ? 0.75 : 0.25, z0 = c & 4 ? 0.25 : -0.25;
            const a = b.age, vy = 5 + (c & 2 ? 2.5 : 0);
            _q.setFromEuler(_e.set(Math.sin(c) * 9 * a, Math.cos(c * 2) * 9 * a, Math.sin(c * 3) * 9 * a));
            const sc = Math.max(0.001, 1 - Math.max(0, a - 0.8) / 0.4) * b.scale;
            _m.compose(_p.set(b.pos.x + x0 * 3.5 * a * b.scale, b.pos.y + (y0 + vy * a - 9 * a * a) * b.scale, b.pos.z + z0 * 3.5 * a * b.scale), _q, _s.setScalar(sc));
            chunks.setMatrixAt(bi * 8 + c, _m);
          }
        });
        chunks.instanceMatrix.needsUpdate = true;
        return false;
      },
    });
  return api;
}

// ------------------------------------------------------------------ Donut-Block
function makeDonut(count, opts = {}) {
  const n = Math.max(1, count | 0);
  const color = ['rosa', 'schoko', 'gelb'].includes(opts.color) ? opts.color : 'rosa';
  const body = makeMesh(donutBlockGeo(color, true), donutMat(), n, true);
  const qq = new THREE.Quaternion();
  const write = (i, s) => {
    if (!s.on || s.state === 'hidden') { body.setMatrixAt(i, ZERO); return; }
    if (s.state === 'shake') {
      const k = clamp(s.age / 0.5, 0, 1);
      compose(s, _m, null, -0.06 * k, _p.set(1 + 0.03 * k, 1 - 0.04 * k, 1 + 0.03 * k).clone());
      _m.elements[12] += Math.sin(s.age * 47 + s.phase) * 0.03 * k * s.scale.x;
      _m.elements[14] += Math.cos(s.age * 41 + s.phase) * 0.03 * k * s.scale.z;
    } else if (s.state === 'fall') {
      compose(s, _m, qq.setFromEuler(_e.set(Math.sin(s.age * 9 + s.phase) * 0.06, 0, Math.cos(s.age * 7 + s.phase) * 0.06)));
    } else compose(s, _m);
    body.setMatrixAt(i, _m);
  };
  return base('donut_block', n, [{ mesh: body, per: 1 }], write, (dt, s) => s.state === 'shake' || s.state === 'fall');
}

// ------------------------------------------------------------------ statische Kulisse
function makeStatic(name, geometryFn, material, shadow = true) {
  return (count) => {
    const n = Math.max(1, count | 0);
    const body = makeMesh(geometryFn(), material(), n, shadow);
    const write = (i, s) => { body.setMatrixAt(i, !s.on || s.state === 'hidden' ? ZERO : compose(s, _m)); };
    return base(name, n, [{ mesh: body, per: 1 }], write, () => false);
  };
}

export const INSTANCED = {
  flipper_feld: makeFlipper,
  lila_ziegel: makeLila,
  donut_block: makeDonut,
  steppengras: makeStatic('steppengras', () => steppengrasGeo(true), grassMat, true),
  sahnetupfer: makeStatic('sahnetupfer', () => sahneGeo(true), sahneMat, true),
};
