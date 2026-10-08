// Instanz-Helfer für viele gleiche Objekte (Kurs-Modus): Münzen und Blöcke als InstancedMesh – 200 Münzen
// kosten 2 Zeichenaufrufe (+ Schattenpass) statt 400.
//
//   import { createInstanced } from '../models/lib/instanced.js';
//   const coins = createInstanced('coin', 200);     // 'coin' | 'coin_blue' | 'question_block' | 'brick_block' | 'used_block'
//   scene.add(coins.root);
//   coins.setAt(i, pos, yaw = 0, scale = 1, state = 'idle');   // pos: {x,y,z} oder [x,y,z] = Fußpunkt (wie die Einzelmodelle)
//   coins.setState(i, state);                        // nur Zustand ändern
//   coins.update(dt);                                // je Bild (Drehen, Wippen, Stoß-/Einsammel-Animationen)
//   coins.dispose();                                 // entfernt root, gibt eigene Ressourcen frei
//   coins.count, coins.root, coins.meshes            // Kapazität, Gruppe, InstancedMeshes
//
// Zustände (wie die Einzelmodelle, als String oder { anim }):
//   coin/coin_blue:   'idle' | 'collected' (hüpft hoch, wird in 0,35 s kleiner, dann unsichtbar) | 'hidden'
//   question_block:   'idle' | 'bump' (Stoß 0,25 s) | 'used' (brauner Block) | 'hidden'
//   brick_block:      'idle' | 'bump' | 'break' (Block weg, Bruchstücke fliegen 1,2 s; bis zu 4 gleichzeitig) | 'hidden'
//   used_block:       'idle' | 'bump' | 'hidden'
// Ein erneutes setState(i, 'bump') startet den Stoß neu. Nicht gesetzte Plätze sind unsichtbar.
// Münzen: Mitte bei y = 0,45 über pos, Blöcke: pos = Mitte der Unterseite.
// Leistung: Münze ≈ 300 Dreiecke (statt ≈ 1000 im Einzelmodell), Block ≈ 600–900.

import { THREE, TAU, instMesh, coinMaterials, coinBodyGeo, coinFacesGeo } from './kit.js';
import { questionGeo, usedGeo, brickGeo, brickMat, brickChunkGeo, blockMat } from './blockGeos.js';

const KINDS = ['coin', 'coin_blue', 'question_block', 'brick_block', 'used_block'];
const isCoinKind = (k) => k === 'coin' || k === 'coin_blue';
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

function bigBounds(m) {
  // Instanzen liegen überall im Level: Sichtbarkeits-Prüfung abschalten (ein Aufruf für alle lohnt sich)
  m.frustumCulled = false;
  return m;
}

/**
 * @param {'coin'|'coin_blue'|'question_block'|'brick_block'|'used_block'} name
 * @param {number} count Kapazität
 */
export function createInstanced(name, count) {
  if (!KINDS.includes(name)) throw new Error(`createInstanced: unbekannter Typ ${name}`);
  const n = Math.max(1, count | 0);
  const root = new THREE.Group();
  root.name = `instanzen:${name}`;
  const slots = Array.from({ length: n }, () => ({ on: false, pos: new THREE.Vector3(), yaw: 0, scale: 1, state: 'hidden', age: 0, phase: Math.random() * TAU }));
  const meshes = [];
  let used = 0; // höchster belegter Platz + 1 → nur so viele Instanzen werden gezeichnet
  const add = (m, shadow = true) => {
    bigBounds(m); m.castShadow = shadow; m.receiveShadow = !isCoinKind(name);
    for (let i = 0; i < m.instanceMatrix.count; i++) m.setMatrixAt(i, ZERO);
    m.count = 0; root.add(m); meshes.push(m); return m;
  };
  let t = 0;

  const isCoin = name === 'coin' || name === 'coin_blue';
  let body, faces, alt, chunks = null;
  if (isCoin) {
    const mats = coinMaterials(name);
    body = add(instMesh(coinBodyGeo(20), mats.body, n));
    faces = add(instMesh(coinFacesGeo(20), mats.face, n), false);
  } else if (name === 'question_block') {
    body = add(instMesh(questionGeo('low'), blockMat(), n));
    alt = add(instMesh(usedGeo('low'), blockMat(), n));
  } else if (name === 'brick_block') {
    body = add(instMesh(brickGeo('low'), brickMat(), n));
    chunks = { mesh: add(instMesh(brickChunkGeo(), brickMat(), 32)), breaks: [] };
    chunks.mesh.count = 32;
  } else {
    body = add(instMesh(usedGeo('low'), blockMat(), n));
  }

  const write = (i) => {
    const s = slots[i];
    const st = s.state;
    let mB = ZERO, mA = ZERO;
    if (s.on && st !== 'hidden') {
      if (isCoin) {
        let y = 0.45 + Math.sin(t * 2.6 + s.phase) * 0.045, sc = s.scale, spin = t * 2.4 + s.phase;
        if (st === 'collected') {
          const k = Math.min(1, s.age / 0.35);
          y += Math.sin(k * Math.PI * 0.6) * 1.0; sc *= 1 - k * k; spin += s.age * 25;
        }
        if (sc > 0.001) {
          _q.setFromEuler(_e.set(0, s.yaw + spin, 0));
          _m.compose(_p.set(s.pos.x, s.pos.y + y * s.scale, s.pos.z), _q, _s.setScalar(sc));
          mB = _m;
        }
      } else {
        let y = 0, sy = 1;
        if (st === 'bump' && s.age < 0.25) { const k = s.age / 0.25; y = Math.sin(k * Math.PI) * 0.3; sy = 1 + Math.sin(k * Math.PI) * 0.08; }
        if (st !== 'break') {
          _q.setFromEuler(_e.set(0, s.yaw, 0));
          _m.compose(_p.set(s.pos.x, s.pos.y + y * s.scale, s.pos.z), _q, _s.set(s.scale, s.scale * sy, s.scale));
          if (alt && st === 'used') mA = _m; else mB = _m;
        }
      }
    }
    body.setMatrixAt(i, mB);
    if (faces) faces.setMatrixAt(i, mB);
    if (alt) alt.setMatrixAt(i, mA);
  };
  const dirtyAll = () => { for (const m of meshes) m.instanceMatrix.needsUpdate = true; };

  const api = {
    root, meshes, count: n, name,
    setAt(i, pos, yaw = 0, scale = 1, state = 'idle') {
      const s = slots[i];
      if (!s) return;
      if (Array.isArray(pos)) s.pos.set(pos[0], pos[1], pos[2]); else s.pos.set(pos.x, pos.y, pos.z);
      s.yaw = yaw; s.scale = scale; s.on = true;
      if (i + 1 > used) { used = i + 1; for (const m of meshes) if (!chunks || m !== chunks.mesh) m.count = used; }
      api.setState(i, state);
      write(i); dirtyAll();
    },
    setState(i, state) {
      const s = slots[i];
      if (!s) return;
      const st = typeof state === 'string' ? state : state?.anim ?? 'idle';
      if (st !== s.state || st === 'bump') {
        if (st === 'break' && chunks && s.state !== 'break') chunks.breaks.push({ pos: s.pos.clone(), scale: s.scale, age: 0 });
        s.age = 0;
      }
      s.state = st;
      write(i); dirtyAll();
    },
    getState(i) { return slots[i]?.state; },
    hide(i) { api.setState(i, 'hidden'); },
    update(dt) {
      dt = Math.min(Math.max(dt || 0, 0), 0.1);
      t += dt;
      let dirty = isCoin;
      for (let i = 0; i < n; i++) {
        const s = slots[i];
        if (!s.on) continue;
        s.age += dt;
        if (isCoin || ((s.state === 'bump') && s.age < 0.35)) { write(i); dirty = true; }
        if (isCoin && s.state === 'collected' && s.age > 0.4) { s.state = 'hidden'; write(i); }
      }
      if (chunks) {
        chunks.breaks = chunks.breaks.filter((b) => (b.age += dt) < 1.2).slice(-4);
        const cm = chunks.mesh;
        for (let k = 0; k < 32; k++) cm.setMatrixAt(k, ZERO);
        chunks.breaks.forEach((b, bi) => {
          for (let c = 0; c < 8; c++) {
            const x0 = c & 1 ? 0.25 : -0.25, y0 = c & 2 ? 0.75 : 0.25, z0 = c & 4 ? 0.25 : -0.25;
            const a = b.age, vy = 5 + (c & 2 ? 2.5 : 0);
            _q.setFromEuler(_e.set(Math.sin(c) * 9 * a, Math.cos(c * 2) * 9 * a, Math.sin(c * 3) * 9 * a));
            const sc = Math.max(0.001, 1 - Math.max(0, a - 0.8) / 0.4) * b.scale;
            _m.compose(_p.set(b.pos.x + (x0 * 3.5) * a * b.scale, b.pos.y + (y0 + vy * a - 9 * a * a) * b.scale, b.pos.z + (z0 * 3.5) * a * b.scale), _q, _s.setScalar(sc));
            cm.setMatrixAt(bi * 8 + c, _m);
          }
        });
        cm.instanceMatrix.needsUpdate = true;
      }
      if (dirty) dirtyAll();
    },
    dispose() {
      root.removeFromParent();
      for (const m of meshes) m.dispose();
      meshes.length = 0;
    },
  };
  return api;
}
