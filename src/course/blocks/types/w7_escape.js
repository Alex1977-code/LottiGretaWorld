// Welt-7-Baustein Giftnebel-Flucht (Präzisierung Motor und Bausteine Welt 7; Bauplan 7-5 „Flucht: nach der obersten Münze
// jagt Giftnebel von oben; unten steigt die Lava“).
//
// giftnebel – dichte, wabernde Nebelwand, die wie eine Autoscroll-Front nachrückt (von oben nach unten oder waagerecht).
//   Wer hineingerät, stirbt (damage 'tod', deathCause 'gift') bzw. wird verletzt und herausgeschoben ('treffer'). Start per
//   Signal (Aktion { start: id } / level.signal), automatisch oder sobald eine Figur einen Bereich betritt. Nach einem
//   Neustart am Checkpoint steht die Front gap m hinter dem Neustart-Punkt (und wartet delay s), war die Jagd schon im Gang.
//   { type: 'giftnebel', id, pos: [x, y, z] (Mitte der Front zu Beginn), size: [a, b] (Fläche der Front: bei 'down'/'up'
//     [Breite x, Tiefe z], bei '±z' [Breite x, Höhe y], bei '±x' [Tiefe z, Höhe y]; Standard [16, 16]), dir: 'down' | 'up' |
//     '-z' | '+z' | '-x' | '+x', speed: 1.2 (m/s), speeds: [{ at: s, speed }] (Tempowechsel nach Jagdzeit), plan: [[t, m]]
//     (Front-Lage m nach Jagdzeit s, statt speed), to: 40 (m bis zum Ende), depth: 0 (m Nebel hinter der Front; 0 = bis
//     zum Start), delay: 1.2 (s nach dem Start), start: 'signal' | 'auto' | { box: [x0, y0, z0, x1, y1, z1] }, signal: Name
//     (zusätzlich: level.signal(Name) startet), gap: 4, damage: 'tod' | 'treffer', color: 'lila' | 'gruen', puffs: 30,
//     mood: Stimmung des Themas beim Start (z. B. 'flucht' im Thema lavatower), visible: false (vor dem Start zeigen) }
//   level.named.get(id) = { state ('wartet'|'verzoegert'|'jagt'|'ende'), front (m ab Start entlang dir), frontPos → {x,y,z},
//                           start(), stop(), reset(), inside(fig) → bool, kills, resets, info() }; w7(level).fogs
//   Der Nebelkörper (durchscheinender Shader) hinter der Front ist immer eigen; die Front zeigt das Registry-Modell
//   'giftnebel_wand' (gimmicks_w7.js; facing 'vorn' { width = a, height = b, depth ≤ 2,5 } im Front-Rahmen, bei dir 'down'
//   facing 'unten' { width = b, depth = a, height ≤ 3 }; state { density }, dünner, wenn die Kamera im Nebel ist) – sonst eigene Wolkenkarten (look: 'eigen').

import * as THREE from 'three';
import { v3, addObject } from '../kit.js';
import { visDt } from '../../entities/gimmick.js';
import { hasModel, getModel } from '../../models/index.js';
import { w7, figures, onRespawn, clamp, TAU } from '../w7kit.js';

const DIRS = { down: [0, -1, 0], up: [0, 1, 0], '-z': [0, 0, -1], '+z': [0, 0, 1], '-x': [-1, 0, 0], '+x': [1, 0, 0] };
const COLORS = { lila: { fog: 0x8a3ac8, hi: 0xd89aff, puff: 0xa85ae0 }, gruen: { fog: 0x4aa83a, hi: 0xc8ff8a, puff: 0x6ac85a } };

export function buildGiftnebel(level, spec) {
  const o = v3(spec.pos);
  const dk = spec.dir in DIRS ? spec.dir : 'down';
  const D = DIRS[dk];
  const [sa, sb] = Array.isArray(spec.size) ? spec.size : [16, 16];
  const to = spec.to ?? 40, depth = spec.depth ?? 0;
  const delay = spec.delay ?? 1.2, gap = spec.gap ?? 4;
  const damage = spec.damage === 'treffer' ? 'treffer' : 'tod';
  const st = { state: 'wartet', front: 0, clock: 0, waitT: 0, kills: 0, resets: 0, speedNow: 0 };
  // Querachsen der Front (Halbmaße ha, hb)
  const vert = D[1] !== 0;
  const axA = vert ? [1, 0, 0] : D[2] !== 0 ? [1, 0, 0] : [0, 0, 1];
  const axB = vert ? [0, 0, 1] : [0, 1, 0];
  const dot = (p, a) => p.x * a[0] + p.y * a[1] + p.z * a[2];
  const along = (p) => dot({ x: p.x - o.x, y: p.y - o.y, z: p.z - o.z }, D);
  /** Vorderster Punkt der Figur entgegen der Laufrichtung (der Teil, den der Nebel zuerst erreicht). */
  const leadOf = (f) => {
    const c = { x: f.pos.x, y: f.pos.y + f.half.y, z: f.pos.z };
    return along(c) - (Math.abs(D[0]) * f.half.x + Math.abs(D[1]) * f.half.y + Math.abs(D[2]) * f.half.z);
  };
  const inCross = (f) => {
    const c = { x: f.pos.x - o.x, y: f.pos.y + f.half.y - o.y, z: f.pos.z - o.z };
    return Math.abs(dot(c, axA)) < sa / 2 + 0.2 && Math.abs(dot(c, axB)) < sb / 2 + 0.2;
  };
  const inside = (f) => {
    if (!inCross(f)) return false;
    const a = leadOf(f);
    return a < st.front - 0.15 && (depth <= 0 || a > st.front - depth);
  };
  const frontPos = () => ({ x: o.x + D[0] * st.front, y: o.y + D[1] * st.front, z: o.z + D[2] * st.front });
  const go = () => { if (st.state === 'wartet') { st.state = 'verzoegert'; st.waitT = 0; level.sfx('wind'); if (spec.mood) level.view?.setMood?.(spec.mood, { time: 1.2 }); } };
  const handle = {
    get state() { return st.state; }, get front() { return st.front; }, get frontPos() { return frontPos(); },
    get kills() { return st.kills; }, get resets() { return st.resets; },
    start: go,
    stop() { if (st.state === 'jagt' || st.state === 'verzoegert') st.state = 'ende'; },
    reset() { st.state = 'wartet'; st.front = 0; st.clock = 0; if (spec.mood) level.view?.setMood?.(null, { time: 1 }); },
    inside,
    info: () => ({ state: st.state, front: +st.front.toFixed(2), clock: +st.clock.toFixed(2), kills: st.kills, resets: st.resets, dir: dk }),
  };
  if (spec.id) level.named.set(spec.id, handle);
  if (spec.signal) level.onSignal(spec.signal, go);
  w7(level).fogs.push(handle);
  if (spec.start === 'auto') go();
  const box = spec.start?.box ?? null;
  onRespawn(level, () => {
    st.resets++;
    if (st.state === 'wartet') return;
    const r = level.runtime.respawnPoint();
    const ra = along({ x: r.pos[0], y: r.pos[1] + 0.5, z: r.pos[2] }) - (vert ? 0.5 : 0.3);
    if (ra - gap <= 0) {
      // Neustart vor dem Nebel-Bereich: alles zurück, die Jagd beginnt wieder beim Auslösen
      st.state = 'wartet'; st.front = 0; st.clock = 0;
      if (spec.mood) level.view?.setMood?.(null, { time: 0.6 });
      if (spec.start === 'auto') go();
      return;
    }
    st.front = clamp(Math.min(st.front, ra - gap), 0, to);
    // Uhr passend zur Lage zurückdrehen (plan/speeds)
    st.clock = 0;
    if (Array.isArray(spec.plan)) { let t = 0; const tEnd = spec.plan[spec.plan.length - 1][0]; while (t < tEnd && planAt(t) < st.front) t += 0.05; st.clock = t; }
    st.state = 'verzoegert'; st.waitT = 0;
  });
  const planAt = (t) => {
    const P = spec.plan;
    if (t <= P[0][0]) return P[0][1];
    for (let i = 1; i < P.length; i++) if (t <= P[i][0]) { const [ta, a] = P[i - 1], [tb, b] = P[i]; return a + (b - a) * ((t - ta) / Math.max(1e-6, tb - ta)); }
    return P[P.length - 1][1];
  };
  const speedAt = (t) => { let s = spec.speed ?? 1.2; for (const e of spec.speeds ?? []) if (t >= (e.at ?? 0)) s = e.speed; return s; };

  level.onStep((dt) => {
    if (st.state === 'wartet') {
      if (box) for (const f of figures(level)) if (f.pos.x > box[0] && f.pos.x < box[3] && f.pos.y > box[1] && f.pos.y < box[4] && f.pos.z > box[2] && f.pos.z < box[5]) { go(); break; }
      if (st.state === 'wartet') return;
    }
    if (st.state === 'verzoegert') { st.waitT += dt; if (st.waitT >= delay) st.state = 'jagt'; }
    if (st.state === 'jagt') {
      st.clock += dt;
      const nf = Array.isArray(spec.plan) ? Math.max(st.front, planAt(st.clock)) : st.front + speedAt(st.clock) * dt;
      st.speedNow = (nf - st.front) / dt;
      st.front = Math.min(to, nf);
      if (st.front >= to) st.state = 'ende';
    }
    for (const f of figures(level)) {
      if (f.dead || f.mode === 'script' || !inside(f)) continue;
      if (damage === 'tod') { st.kills++; f.die('gift'); continue; }
      if (f.invulnerable) continue;
      if (f.hurt({ pos: { x: f.pos.x - D[0] * 2, y: f.pos.y - D[1] * 2, z: f.pos.z - D[2] * 2 } })) st.kills++;
      // aus dem Nebel herausschieben (vor die Front)
      const out = st.front + 0.3 - leadOf(f);
      if (out > 0) { f.pos.x += D[0] * out; f.pos.y += D[1] * out; f.pos.z += D[2] * out; }
    }
  });

  if (!level.view) return handle;
  // ---------------- Darstellung: Nebelkörper (Shader, durchscheinend) hinter der Front + wabernde Wolken an der Front
  const C = COLORS[spec.color] ?? COLORS.lila;
  const root = new THREE.Group();
  root.name = 'giftnebel';
  const bodyLen = depth > 0 ? depth : Math.max(8, to + 6);
  // lokale Lage: Front-Ebene bei x = 0, Nebel nach −X (hinten), Front blickt +X; Ausdehnung y (b) und z (a)
  const g = new THREE.BoxGeometry(bodyLen, 1, 1, 1, 1, 1);
  g.translate(-bodyLen / 2, 0, 0);
  const U = { uTime: { value: 0 }, uFog: { value: new THREE.Color(C.fog) }, uHi: { value: new THREE.Color(C.hi) } };
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.8 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec3 vW7n;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vW7n = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    sh.fragmentShader = 'uniform float uTime;\nuniform vec3 uFog;\nuniform vec3 uHi;\nvarying vec3 vW7n;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      vec3 q = vW7n * 0.35;
      float n = sin(q.x * 1.7 + uTime * 0.6 + sin(q.y * 1.3 - uTime * 0.4) * 1.5) * 0.5 + sin(q.z * 1.9 - uTime * 0.5 + sin(q.x * 1.1 + uTime * 0.3) * 1.3) * 0.5;
      float m = sin(q.y * 2.3 + q.z * 1.7 + uTime * 0.9) * 0.5 + 0.5;
      diffuseColor.rgb = mix(uFog, uHi, smoothstep(0.2, 1.0, n) * 0.55 + m * 0.12);
      diffuseColor.a *= (0.55 + 0.3 * smoothstep(-0.8, 0.8, n)) * smoothstep(2.5, 9.0, length(vW7n - cameraPosition));`);
  };
  mat.customProgramCacheKey = () => 'w7giftnebel';
  const body = new THREE.Mesh(g, mat);
  body.scale.set(1, sb, sa);
  body.renderOrder = 4;
  const frontG = new THREE.Group();
  frontG.add(body);
  let model = null, modelFree = false;
  if (hasModel('giftnebel_wand') && spec.look !== 'eigen') {
    // Modell (gimmicks_w7.js): weiche Nebelkarten mit Wulst und Giftbläschen, Ursprung Mitte der Front (unten).
    // Von oben ('down'): facing 'unten' frei in der Welt (Breite entlang Z = b-Achse, Tiefe entlang X = a-Achse);
    // sonst facing 'vorn' im Front-Rahmen (lokal +X = Laufrichtung, y = b-Achse, z = a-Achse)
    const color = spec.color === 'gruen' ? 'gruen' : 'lila';
    if (dk === 'down') {
      model = getModel('giftnebel_wand', { width: sb, height: Math.min(bodyLen, 3), depth: sa, facing: 'unten', color });
      root.add(model.root);
      modelFree = true;
    } else {
      model = getModel('giftnebel_wand', { width: sa, height: sb, depth: Math.min(bodyLen, 2.5), facing: 'vorn', color });
      model.root.position.y = -sb / 2;
      frontG.add(model.root);
    }
  }
  const np = model ? 0 : Math.max(0, spec.puffs ?? 30);
  let puffs = null;
  const pd = [];
  if (np) {
    // weiche Nebelschwaden: Ebenen zur Kamera mit Wolken-Textur (eine Instanz-Gruppe)
    puffs = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: puffTexture(), color: C.puff, transparent: true, opacity: 0.85, depthWrite: false }), np);
    puffs.frustumCulled = false;
    puffs.renderOrder = 5;
    let seed = 1234567;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < np; i++) pd.push({ a: (rnd() - 0.5) * sa * 0.95, b: (rnd() - 0.5) * sb * 0.95, r: 1.4 + rnd() * 1.6, ph: rnd() * TAU, f: 0.6 + rnd() * 0.8 });
    frontG.add(puffs);
  }
  // lokal (+X = Laufrichtung, y = b-Achse, z = a-Achse) → Welt
  const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(...D), new THREE.Vector3(...axB), new THREE.Vector3(...axA));
  if (basis.determinant() < 0) basis.makeBasis(new THREE.Vector3(...D), new THREE.Vector3(...axB), new THREE.Vector3(...axA).negate());
  frontG.quaternion.setFromRotationMatrix(basis);
  root.add(frontG);
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _qc = new THREE.Quaternion(), _w = new THREE.Vector3();
  const cam = level.view.camera;
  const holder = {};
  let t = 0;
  addObject(level, root, (dt) => {
    const d = visDt(level, holder, dt);
    t += d;
    U.uTime.value = t;
    const fp = frontPos();
    frontG.position.set(fp.x, fp.y, fp.z);
    frontG.updateMatrixWorld();
    const visible = st.state !== 'wartet' || spec.visible === true;
    root.visible = visible;
    if (modelFree) model.root.position.set(fp.x, fp.y, fp.z);
    if (model) {
      // Kamera im Nebel dicht hinter der Front: Schwaden ausdünnen (sonst stehen Nebelkarten direkt vor der Kamera)
      const ac = (cam.position.x - o.x) * D[0] + (cam.position.y - o.y) * D[1] + (cam.position.z - o.z) * D[2] - st.front;
      model.update?.(d, { density: ac < 0 ? Math.min(1, Math.max(0.25, (-ac - 3.5) / 3)) : 1 });
    }
    if (!puffs) return;
    // Ausrichtung zur Kamera im lokalen Raum der Front
    frontG.getWorldQuaternion(_qc).invert().multiply(cam.quaternion);
    for (let i = 0; i < pd.length; i++) {
      const q = pd[i];
      const w = Math.sin(t * q.f + q.ph);
      _p.set(-0.3 + w * 0.35, q.b + Math.cos(t * q.f * 0.7 + q.ph) * 0.3, q.a + Math.sin(t * q.f * 0.5 + q.ph * 2) * 0.4);
      // nahe der Kamera klein (die Kamera blickt sonst durch große Wolken)
      _w.set(_p.x, _p.y, _p.z).applyMatrix4(frontG.matrixWorld);
      const near = Math.min(1, Math.max(0, (_w.distanceTo(cam.position) - 3) / 6));
      const r = q.r * (1 + w * 0.12) * near;
      _s.set(r * 1.3, r, 1);
      _m.compose(_p, _qc, _s);
      puffs.setMatrixAt(i, _m);
    }
    puffs.instanceMatrix.needsUpdate = true;
  });
  return handle;
}

let PUFF = null;
/** Wolken-Textur der Nebelschwaden (weiche Kleckse, geteilt). */
function puffTexture() {
  if (PUFF) return PUFF;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  for (let i = 0; i < 12; i++) {
    const x = 64 + Math.sin(i * 2.3) * 26, y = 64 + Math.cos(i * 1.7) * 18, r = 26 + (i % 4) * 7;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  }
  PUFF = new THREE.CanvasTexture(c);
  PUFF.colorSpace = THREE.SRGBColorSpace;
  return PUFF;
}

export const TYPES = { giftnebel: buildGiftnebel };
