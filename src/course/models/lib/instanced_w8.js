// Instanz-Varianten der massenhaften Welt-8-Objekte mit derselben API wie createInstanced() in instanced.js (dort über
// import.meta.glob('./instanced_*.js') eingebunden; instanced.js bleibt unverändert):
//
//   const steg = createInstanced('leuchtsteg', 60);
//   steg.setAt(i, pos, yaw = 0, scale = 1, state = 'idle');   // pos = Ursprung wie das Einzelmodell; scale auch [sx, sy, sz]
//   steg.setState(i, state); steg.getState(i); steg.hide(i); steg.update(dt); steg.dispose();
//   steg.root, steg.meshes, steg.count, steg.name
//
// Arten und Zustände (state als String oder Objekt, 'hidden' blendet aus):
//   'leuchtsteg'        1 × 1-m-Kachel des unsichtbaren Stegs (Oberseite y = thick, pos = Mitte der Unterseite), additiv
//                       leuchtend; opts { thick (0,3) }; state { glow (0..1), flash (0..1) } – glow 0 = unsichtbar;
//                       'idle' = voll sichtbar.  1 InstancedMesh (Helligkeit als Instanzfarbe).
//   'knochenflieger'    Knochenflieger aus den Teilen des Welt-7-Modells (Rumpf+Kopf, Glanzpunkte, zwei Flügel), pos =
//                       Körpermitte, yaw = Blickrichtung; state 'fly' | { anim: 'fly', flap? } (schlägt versetzt) | 'dive'
//                       (Flügel angelegt, Nase unten) | { anim: 'bones', progress } (fällt auseinander, 0..1 in 0,9 s, danach
//                       weg) | { anim: 'assemble', progress } (setzt sich zusammen, 1,4 s) | 'hidden'.  4 InstancedMeshes.
//   'brummbaer_ballon'  schwebender Brummbär-Ballon (Kopf mit Zylinder, wie das Einzelmodell) an kurzer Schnur, pos =
//                       Schnurende unten; opts { color: 'rot' | 'gelb' | 'blau' | 'lila' (Standard: bunt gemischt, Instanz i
//                       bekommt Farbe i mod 4) }; state 'idle' (wiegt sich) | 'hidden'.  2 bzw. 5 InstancedMeshes (eine je
//                       Farbe; Kulisse, ohne Spielzeug-Look).
// Nicht gesetzte Plätze sind unsichtbar; Sichtbarkeitsprüfung aus (Instanzen liegen überall im Level).

import { THREE, TAU, clamp, vcol, basic, Build, cached, smoothstep, lerp } from './kit.js';
import { kfParts, kulMat8, taperTube, num } from './w8Geos.js';
import { stegGeo } from '../kinds/gimmicks_w8.js';
import { balloonGeo, BALLOON_COLORS } from '../kinds/props_rummel_w8.js';

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler();
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color(), _w = new THREE.Matrix4(), _o = new THREE.Vector3();

function makeMesh(geometry, material, n, shadow, receive = true) {
  const m = new THREE.InstancedMesh(geometry, material, n);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.frustumCulled = false;
  m.castShadow = !!shadow; m.receiveShadow = receive;
  for (let i = 0; i < n; i++) m.setMatrixAt(i, ZERO);
  m.count = 0;
  return m;
}
const stName = (st) => (typeof st === 'string' ? st : st?.anim ?? (st && st.glow !== undefined ? 'glow' : 'idle'));

/** Gemeinsames Gerüst wie instanced_w7.js: parts = [{ mesh, per }], write(i, slot), tick(dt, slot, i) → neu schreiben? */
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
const compose = (s, out) => out.compose(s.pos, s.quat, s.scale);

// ------------------------------------------------------------------ Leuchtsteg (1-m-Kachel)
function makeSteg(count, opts = {}) {
  const n = Math.max(1, count | 0);
  const t = Math.max(0.05, Number(opts.thick ?? 0.3));
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const body = makeMesh(stegGeo(1, 1, t, true), mat, n, false, false);
  for (let i = 0; i < n; i++) body.setColorAt(i, _c.setScalar(0));
  const write = (i, s) => {
    const g = s.state === 'hidden' || !s.on ? 0 : clamp(num(s.st.glow, s.state === 'idle' ? 1 : 0), 0, 1);
    const k = g <= 0 ? 0 : clamp(g * (0.85 + Math.sin(s.age * 3 + s.phase) * 0.08) + clamp(num(s.st.flash, 0), 0, 1) * 0.6, 0, 1.6);
    body.setMatrixAt(i, k <= 0.01 ? ZERO : compose(s, _m));
    body.setColorAt(i, _c.setScalar(k));
  };
  return base('leuchtsteg', n, [{ mesh: body, per: 1 }], write, () => true, { onDispose: () => mat.dispose() });
}

// ------------------------------------------------------------------ Knochenflieger
function makeFlieger(count) {
  const n = Math.max(1, count | 0);
  const P = kfParts();
  const lit = vcol(0.34, {}, 'w8kf');
  const core = makeMesh(P.core.lit, lit, n, true);
  const hl = makeMesh(P.core.hl, basic('white', { color: 0xffffff }), n, false, false);
  const wings = P.wings.map((w) => makeMesh(w.geo, lit, n, true));
  const hideAll = (i) => { core.setMatrixAt(i, ZERO); hl.setMatrixAt(i, ZERO); for (const w of wings) w.setMatrixAt(i, ZERO); };
  const write = (i, s) => {
    if (!s.on || s.state === 'hidden') { hideAll(i); return; }
    const t = s.age + s.phase;
    const dive = s.state === 'dive' ? 1 : 0;
    const bones = s.state === 'bones', asm = s.state === 'assemble';
    const pr = clamp(num(s.st.progress, Math.min(1, s.age / (asm ? 1.4 : 0.9))), 0, 1);
    if (bones && pr >= 0.999) { hideAll(i); return; }
    const k = bones ? smoothstep(pr) : asm ? 1 - smoothstep(pr) : 0;
    const f = s.st.flap !== undefined ? clamp(num(s.st.flap, 0.5), 0, 1) : 0.5 + 0.5 * Math.sin(t * TAU * 2.2);
    const g = bones ? pr * pr * 1.6 : asm ? (1 - pr) * (1 - pr) * 1.2 : 0;
    _p.set(0, (1 - dive) * Math.sin(t * TAU * 2.2 - 0.6) * 0.05 - g, 0);
    _q2.setFromEuler(_e.set(k * 2.4, 0, -0.55 * dive + k * 3));
    const sc = bones ? Math.max(0.001, 1 - smoothstep((pr - 0.55) / 0.45)) : asm ? 0.3 + 0.7 * smoothstep(pr * 1.4) : 1;
    _m2.compose(_p, _q2, _s.setScalar(sc));
    compose(s, _m).multiply(_m2);
    core.setMatrixAt(i, _m); hl.setMatrixAt(i, _m);
    const flapA = lerp(-0.55, 0.85, f) * (1 - dive) + dive * 0.25;
    P.wings.forEach((w, j) => {
      const sg = j ? -1 : 1;
      _o.copy(w.at).add(_s.set(-k * 0.2, k * 0.3, sg * k * 0.7));
      _w.compose(_o, _q.setFromEuler(_e.set(-sg * flapA - sg * k * 2, sg * -dive * 1.05, -dive * 0.25)), _s.setScalar(1));
      wings[j].setMatrixAt(i, _m2.copy(_m).multiply(_w));
    });
  };
  return base('knochenflieger', n, [{ mesh: core, per: 1 }, { mesh: hl, per: 1 }, ...wings.map((m) => ({ mesh: m, per: 1 }))], write, () => true);
}

// ------------------------------------------------------------------ Brummbär-Ballon
const stringGeo = () => cached('w8:inst:balloon:str', () => new Build().add(taperTube([[0, 0, 0], [0.05, 0.6, 0.02], [0, 1.2, 0]], 0.012, 10, 3), 0xf0f0f0).geometry());
function makeBallon(count, opts = {}) {
  const n = Math.max(1, count | 0);
  const colors = BALLOON_COLORS[opts.color] ? [opts.color] : Object.keys(BALLOON_COLORS);
  const heads = colors.map((c) => makeMesh(balloonGeo(c, true), kulMat8(0.25), n, true));
  const str = makeMesh(stringGeo(), kulMat8(0.7), n, false, false);
  const H = new THREE.Matrix4().makeTranslation(0, 1.2 + 0.72, 0);
  const write = (i, s) => {
    const mine = heads[i % heads.length];
    for (const h of heads) h.setMatrixAt(i, ZERO);
    if (!s.on || s.state === 'hidden') { str.setMatrixAt(i, ZERO); return; }
    const t = s.age + s.phase;
    _q2.setFromEuler(_e.set(Math.sin(t * 0.9) * 0.08, Math.sin(t * 0.4) * 0.3, Math.sin(t * 1.1) * 0.1));
    _m2.compose(_p.set(0, Math.sin(t * 0.7) * 0.08, 0), _q2, _s.setScalar(1));
    compose(s, _m).multiply(_m2);
    str.setMatrixAt(i, _m);
    mine.setMatrixAt(i, _m.multiply(H));
  };
  return base('brummbaer_ballon', n, [...heads.map((m) => ({ mesh: m, per: 1 })), { mesh: str, per: 1 }], write, () => true);
}

export const INSTANCED = {
  leuchtsteg: makeSteg,
  knochenflieger: makeFlieger,
  brummbaer_ballon: makeBallon,
};
