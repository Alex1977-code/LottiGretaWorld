// Instanz-Varianten der Welt-2-Modelle (über createInstanced in lib/instanced.js erreichbar, gleiche API):
//
//   createInstanced('marschblock', n, { colors?: ['red', 'blue', …] | Hex[], notes?: true, stagger?: 0 })
//       state 'march' | 'idle' | 'panic' | 'squashed' | 'hidden'  (auch { anim, speed })
//       Gleichschritt: alle Blöcke marschieren im selben Takt (stagger = Phasenversatz je Platz, Anteil 0..1).
//       Farbe je Platz reihum aus colors (Standard rot, blau, gelb, grün); api.setColor(i, farbe).
//       5 Zeichenaufrufe (Körper, Details, Glanzpunkte, Beine, Noten) + Schattenpass.
//   createInstanced('sandblock', n)
//       state 'idle' | 'shake' | 'crumble' (sackt in 0,6 s zusammen) | 'gone' | 'hidden' | { anim, crumble: 0..1 }
//       2 Zeichenaufrufe (Blöcke, Bröckchen – höchstens 4 Brösel-Wolken gleichzeitig).
//   createInstanced('kaktus', n, { variant: 'saeule'|'kugel'|'feige'|'gruppe' })   state 'idle' | 'hidden'
//       1 Zeichenaufruf; Drehung/Größe je Platz über setAt(i, pos, yaw, scale).
//   createInstanced('wuschel', n)   state 'idle' | 'move' | 'hidden'   (pos = Fußpunkt wie das Einzelmodell)
//       2 Zeichenaufrufe.
//
// Zustände/Lage wie bei den Einzelmodellen (pos = Fußpunkt). Nicht gesetzte Plätze sind unsichtbar.

import { THREE, TAU, instMesh, vcol, std, basic } from './kit.js';
import {
  MB, MB_CY, MB_COLOR_NAMES, mbColor, mbShellGeo, mbDetailGeo, mbHighlightGeo, mbLegGeo, mbNoteGeo, mbNoteMat,
  WU, wuschelGeo, wuschelHlGeo, sandblockGeo, sandCrumbGeo, sandMat, kaktusGeo, kaktusMat, KAKTUS_VARIANTS,
} from './w2Geos.js';

export const W2_KINDS = ['marschblock', 'sandblock', 'kaktus', 'wuschel'];

const _m = new THREE.Matrix4(), _l = new THREE.Matrix4(), _o = new THREE.Matrix4();
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const compose = (out, x, y, z, rx, ry, rz, sx, sy = sx, sz = sx) => {
  _q.setFromEuler(_e.set(rx, ry, rz));
  return out.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
};

export function createInstancedW2(name, count, opts = {}) {
  const n = Math.max(1, count | 0);
  const root = new THREE.Group();
  root.name = `instanzen:${name}`;
  const slots = Array.from({ length: n }, (_, i) => ({ on: false, pos: new THREE.Vector3(), yaw: 0, scale: 1, state: 'hidden', st: {}, age: 0, phase: hash(i) * TAU }));
  const meshes = [];
  const per = new Map();                         // InstancedMesh → Instanzen je Platz
  let used = 0, t = 0;
  const add = (m, k = 1, shadow = true) => {
    m.frustumCulled = false; m.castShadow = shadow; m.receiveShadow = name === 'sandblock';
    for (let i = 0; i < m.instanceMatrix.count; i++) m.setMatrixAt(i, ZERO);
    m.count = 0; root.add(m); meshes.push(m); per.set(m, k); return m;
  };
  const objMatrix = (s) => compose(_o, s.pos.x, s.pos.y, s.pos.z, 0, s.yaw, 0, s.scale);
  const visible = (s) => s.on && s.state !== 'hidden';

  let write;                                     // (i) → Matrizen des Platzes schreiben
  let animated = () => false;                    // Platz braucht Aktualisierung je Bild?
  const extra = {};

  if (name === 'marschblock') {
    const shell = add(instMesh(mbShellGeo(true), std('w2:mbInst', { color: 0xffffff, vertexColors: true, roughness: 0.4 }), n));
    const detail = add(instMesh(mbDetailGeo(true), vcol(0.4), n));
    const hl = add(instMesh(mbHighlightGeo(), basic('white', { color: 0xffffff }), n), 1, false);
    const legs = add(instMesh(mbLegGeo(true), vcol(0.4), n * 2), 2);
    const notes = opts.notes === false ? null : add(instMesh(mbNoteGeo(true), mbNoteMat(), n), 1, false);
    const palette = (opts.colors?.length ? opts.colors : ['red', 'blue', 'yellow', 'green']).map(mbColor);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) shell.setColorAt(i, c.setHex(palette[i % palette.length]));
    extra.setColor = (i, color) => { if (i >= 0 && i < n) { shell.setColorAt(i, c.setHex(mbColor(color))); shell.instanceColor.needsUpdate = true; } };
    const stagger = Number(opts.stagger ?? 0);
    animated = (s) => visible(s) && s.state !== 'squashed';
    write = (i) => {
      const s = slots[i];
      if (!visible(s)) {
        for (const m of [shell, detail, hl]) m.setMatrixAt(i, ZERO);
        legs.setMatrixAt(i * 2, ZERO); legs.setMatrixAt(i * 2 + 1, ZERO);
        if (notes) notes.setMatrixAt(i, ZERO);
        return;
      }
      const st = s.state, O = objMatrix(s);
      const marching = st === 'march' || st === 'panic';
      const speed = s.st.speed ?? (st === 'panic' ? 3.5 : 1.5);
      const ph = (marching ? t * (st === 'panic' ? 16 : 3.2 + speed * 2.4) : 0) + i * stagger * TAU;
      const sn = Math.sin(ph);
      const sq = st === 'squashed' ? Math.min(1, s.age / 0.08) : 0;
      const bob = marching ? Math.abs(sn) * 0.05 : Math.sin(t * 2.2 + s.phase) * 0.008;
      const shake = st === 'panic' ? Math.sin(t * 47 + i) * 0.05 : 0;
      compose(_l, 0, bob - sq * 0.2, 0, marching ? sn * 0.07 + shake : 0, 0, st === 'panic' ? -0.15 : marching ? -0.03 : 0, 1 + sq * 0.35, Math.max(0.05, 1 - sq * 0.75), 1 + sq * 0.35);
      _m.multiplyMatrices(O, _l);
      shell.setMatrixAt(i, _m); detail.setMatrixAt(i, _m); hl.setMatrixAt(i, _m);
      for (let k = 0; k < 2; k++) {
        const kk = k ? -sn : sn;
        const rz = marching ? Math.max(0, kk) * 0.85 - Math.max(0, -kk) * 0.25 : 0;
        if (sq > 0.9) { legs.setMatrixAt(i * 2 + k, ZERO); continue; }
        compose(_l, 0.02, MB.LEG + (marching ? Math.max(0, kk) * 0.04 : 0) - sq * 0.18, k ? -0.15 : 0.15, 0, 0, rz, 1);
        legs.setMatrixAt(i * 2 + k, _m.multiplyMatrices(O, _l));
      }
      if (notes) {
        if (st === 'march' || st === 'idle') {
          const beat = Math.abs(sn);
          compose(_l, -0.05, 1.55 + beat * 0.12 + Math.sin(t * 1.3 + s.phase) * 0.03, 0, 0, t * 1.6 + s.phase, sn * 0.25, 0.9 + beat * 0.2);
          notes.setMatrixAt(i, _m.multiplyMatrices(O, _l));
        } else notes.setMatrixAt(i, ZERO);
      }
    };
  } else if (name === 'sandblock') {
    const blocks = add(instMesh(sandblockGeo('low'), sandMat(), n));
    const crumbs = add(instMesh(sandCrumbGeo(), sandMat(), 32), 0);
    crumbs.count = 32;
    const bursts = [];
    const kOf = (s) => (s.st.crumble !== undefined ? Math.min(1, Math.max(0, s.st.crumble)) : s.state === 'crumble' ? Math.min(1, s.age / 0.6) : s.state === 'gone' ? 1 : 0);
    animated = (s) => visible(s) && (s.state === 'shake' || (s.state === 'crumble' && s.age < 0.7));
    write = (i) => {
      const s = slots[i];
      const k = visible(s) ? kOf(s) : 1;
      if (k >= 0.97) { blocks.setMatrixAt(i, ZERO); return; }
      const sh = s.state === 'shake' ? 0.03 : k > 0 ? 0.02 : 0;
      compose(_l, Math.sin(t * 47 + i) * sh, 0, Math.cos(t * 41 + i) * sh, 0, 0, 0, 1 - k * 0.3, Math.max(0.001, 1 - k * 0.9), 1 - k * 0.3);
      blocks.setMatrixAt(i, _m.multiplyMatrices(objMatrix(s), _l));
    };
    extra.onState = (i, prev, st) => {
      if (st === 'crumble' && prev !== 'crumble') { bursts.push({ pos: slots[i].pos.clone(), scale: slots[i].scale, age: 0 }); if (bursts.length > 4) bursts.shift(); }
    };
    extra.tick = (dt) => {
      for (const b of bursts) b.age += dt;
      while (bursts.length && bursts[0].age > 1.0) bursts.shift();
      for (let k = 0; k < 32; k++) crumbs.setMatrixAt(k, ZERO);
      bursts.forEach((b, bi) => {
        for (let c = 0; c < 8; c++) {
          const a = hash(c + bi) * TAU + c, r = (0.3 + hash(c + 9) * 0.25) * (1 + b.age);
          const y = Math.max(0.08, 0.9 + 2 * b.age - 7 * b.age * b.age);
          const sc = Math.max(0.001, (1 - b.age) * (0.6 + hash(c) * 0.5)) * b.scale;
          compose(_m, b.pos.x + Math.cos(a) * r * b.scale, b.pos.y + y * b.scale, b.pos.z + Math.sin(a) * r * b.scale, a * 2 + b.age * 5, a, b.age * 4, sc);
          crumbs.setMatrixAt(bi * 8 + c, _m);
        }
      });
      crumbs.instanceMatrix.needsUpdate = true;
    };
  } else if (name === 'kaktus') {
    const v = KAKTUS_VARIANTS.includes(opts.variant) ? opts.variant : 'saeule';
    const body = add(instMesh(kaktusGeo(v, 'low'), kaktusMat(), n));
    body.receiveShadow = false;
    write = (i) => { const s = slots[i]; body.setMatrixAt(i, visible(s) ? objMatrix(s) : ZERO); };
  } else if (name === 'wuschel') {
    const fur = add(instMesh(wuschelGeo(), vcol(0.55, {}, 'fur'), n));
    const hl = add(instMesh(wuschelHlGeo(), basic('white', { color: 0xffffff }), n), 1, false);
    animated = visible;
    write = (i) => {
      const s = slots[i];
      if (!visible(s)) { fur.setMatrixAt(i, ZERO); hl.setMatrixAt(i, ZERO); return; }
      const w = s.state === 'move' ? 1 : 0.4, tt = t + s.phase;
      const p = 1 + Math.sin(tt * 9) * 0.035 * w;
      // Wackeln um die Kugelmitte: Mitte anheben, kippen, zurück
      compose(_l, 0, WU.cy + Math.abs(Math.sin(tt * 6)) * 0.04 * w, 0, Math.sin(tt * 4.1) * 0.1 * w, Math.sin(tt * 1.3) * 0.25, Math.sin(tt * 5.3) * 0.12 * w, p, 2 - p, p);
      _l.multiply(compose(_m, 0, -WU.cy, 0, 0, 0, 0, 1));
      _m.multiplyMatrices(objMatrix(s), _l);
      fur.setMatrixAt(i, _m); hl.setMatrixAt(i, _m);
    };
  } else {
    throw new Error(`createInstanced: unbekannter Typ ${name}`);
  }

  const dirty = () => { for (const m of meshes) m.instanceMatrix.needsUpdate = true; };
  const setCounts = () => { for (const m of meshes) { const k = per.get(m); if (k) m.count = used * k; } };
  const api = {
    root, meshes, count: n, name,
    setAt(i, pos, yaw = 0, scale = 1, state = 'idle') {
      const s = slots[i];
      if (!s) return;
      if (Array.isArray(pos)) s.pos.set(pos[0], pos[1], pos[2]); else s.pos.set(pos.x, pos.y, pos.z);
      s.yaw = yaw; s.scale = scale; s.on = true;
      if (i + 1 > used) { used = i + 1; setCounts(); }
      api.setState(i, state ?? 'idle');
    },
    setState(i, state) {
      const s = slots[i];
      if (!s) return;
      const st = typeof state === 'string' ? { anim: state } : state ?? {};
      const anim = st.anim ?? (st.crumble !== undefined ? 'crumble' : 'idle');
      const prev = s.state;
      if (anim !== prev) s.age = 0;
      s.state = anim; s.st = st;
      extra.onState?.(i, prev, anim);
      write(i); dirty();
    },
    getState(i) { return slots[i]?.state; },
    hide(i) { api.setState(i, 'hidden'); },
    update(dt) {
      dt = Math.min(Math.max(dt || 0, 0), 0.1);
      t += dt;
      let d = false;
      for (let i = 0; i < used; i++) {
        const s = slots[i];
        if (!s.on) continue;
        s.age += dt;
        if (animated(s)) { write(i); d = true; }
        else if (s.state === 'squashed' && s.age < 0.2) { write(i); d = true; }
        else if (s.state === 'crumble' && s.age < 0.7) { write(i); d = true; }
      }
      extra.tick?.(dt);
      if (d) dirty();
    },
    dispose() {
      root.removeFromParent();
      for (const m of meshes) m.dispose();
      meshes.length = 0;
    },
  };
  if (extra.setColor) api.setColor = extra.setColor;
  if (name === 'marschblock') api.colors = MB_COLOR_NAMES;
  return api;
}
