// Welt-7-Bausteine Lava: steigende/sinkende Lava und Gitterboden (Präzisierung Motor und Bausteine Welt 7).
//
// lavaspiegel – Lava mit wechselndem Spiegel (Bauplan 7-7 „Lavasee mit steigender/sinkender Lava“, 7-5 „unten steigt die
//   Lava“). Die tödliche Form und die glühende Oberfläche folgen dem Spiegel (Figuren sterben, sobald die Füße darunter
//   sind; Gegner versinken; Lavablasen und Fontänen folgen über lavaTopAt). Vor dem Steigen brodelt und glüht die
//   Oberfläche (Vorwarnung, Klang 'rumble').
//   { type: 'lavaspiegel', id, pos: [x, y, z] (Mitte der Unterseite = Grund), size: [w, h, d] (Ruhe-Spiegel bei y + h),
//     mode: 'zyklus' | 'plan' | 'signal' | 'fest',
//     low: y + h (unterer Spiegel, absolut), high: low + 3 (oberer Spiegel, absolut),
//     zyklus: wait: 4 (s unten), warn: 1.5 (s Vorwarnung am Ende von wait), rise: 3 (s), hold: 3 (s oben), fall: 3 (s),
//             phase: 0 (s Versatz; alles auf der Level-Uhr),
//     plan: [[t, y], …] (s → Spiegel, linear dazwischen), loop: true (Plan wiederholen),
//     signal: rise: { to: high, speed: 0.6 } – start() fährt hinauf, stop() hält an, setLevel(y, speed) fährt auf y;
//             reset: true (Neustart am Checkpoint: Spiegel zurück auf low, angehalten),
//     color: 'rot' | 'blau' (Standard: Thema), bubbles: true, body: true (glühender Körper unter der Oberfläche) }
//   level.named.get(id) = { top (Spiegel y), state ('unten'|'warn'|'steigt'|'oben'|'sinkt'|'faehrt'|'ruht'), low, high,
//                           shape, setLevel(y, speed), start(), stop(), info() }; w7(level).lavas
//   Kollision: Form { kill: 'lava', lava: true, surface: Spiegel, lavaColor } bis 0,12 m unter den Spiegel (wie lava).
//
// gitterboden – begehbarer Gitterrost (Bauplan 7-7 „Fontänenfeld mit Gitterboden“): fester Boden, durch die Lücken glüht
//   die Lava darunter. Optional baut er die Lava gleich mit.
//   { type: 'gitterboden', id, pos: [x, y, z] (Mitte der Unterseite), size: [w, d] (4 × 4), thick: 0.2, cell: 0.5
//     (Maschenweite), bar: 0.07 (Stabbreite), frame: 0.22 (Randbreite, 0 = ohne), style: 'eisen' | 'rost' | 'blau',
//     lava: false | true | { depth: 2.2 (m unter der Oberseite), color, …lavaspiegel-Felder (mode, high …) } }
//   level.named.get(id) = { top, lava (Griff des lavaspiegel oder null), info() }; w7(level).grates
//   Modell aus der Registry 'gitterboden' (gimmicks_w7.js; Kacheln { size: [w/nx, d/nz], thick } von etwa tile: 2 m, Ursprung
//   Mitte der Unterseite, gebacken) – sonst eigene Stäbe (look: 'eigen').

import * as THREE from 'three';
import { v3, sz3, addObject, addStatic, merge, lin, mixc, smooth, colorize } from '../kit.js';
import { bakeModel } from '../w2kit.js';
import { visDt } from '../../entities/gimmick.js';
import { hasModel } from '../../models/index.js';
import { w7, lavaMaterial, LAVA_PAL, glowTexture, onRespawn, ease, cycle, clamp } from '../w7kit.js';
import { themeOf } from '../kit.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3();

// =====================================================================================================================
// Lavaspiegel
// =====================================================================================================================

export function buildLavaspiegel(level, spec) {
  const p = v3(spec.pos), s = sz3(spec.size, [8, 1, 8]);
  const x0 = p.x - s.x / 2, x1 = p.x + s.x / 2, z0 = p.z - s.z / 2, z1 = p.z + s.z / 2;
  const low = spec.low ?? p.y + s.y;
  const high = spec.high ?? low + 3;
  const mode = spec.mode ?? (spec.plan ? 'plan' : 'zyklus');
  const color = spec.color === 'blau' || spec.color === 'blue' || (spec.color === undefined && themeOf(level).lavaColor === 'blau') ? 'blau' : 'rot';
  const Z = { wait: spec.wait ?? 4, warn: Math.max(0, spec.warn ?? 1.5), rise: spec.rise?.time ?? (typeof spec.rise === 'number' ? spec.rise : 3), hold: spec.hold ?? 3, fall: spec.fall ?? 3 };
  const plan = cycle([{ name: 'unten', t: Math.max(0, Z.wait - Z.warn) }, { name: 'warn', t: Z.warn }, { name: 'steigt', t: Z.rise }, { name: 'oben', t: Z.hold }, { name: 'sinkt', t: Z.fall }], spec.phase ?? 0);
  const st = { top: low, state: mode === 'fest' ? 'ruht' : 'unten', target: low, speed: 0, warnK: 0, moving: false };
  const shape = { type: 'box', min: [x0, p.y - 2, z0], max: [x1, low - 0.12, z1], kill: 'lava', lava: true, surface: low, solid: false, camIgnore: true, tag: 'lavaspiegel', lavaColor: color };
  const sid = level.world.add(shape);
  const setTop = (y) => {
    y = Math.max(p.y + 0.15, y);
    if (Math.abs(y - st.top) < 1e-7) return;
    st.top = y;
    shape.max = [x1, y - 0.12, z1];
    shape.surface = y;
    level.world.update(sid);
  };
  const handle = {
    get top() { return st.top; }, get state() { return st.state; }, low, high, shape, mode,
    setLevel(y, speed = 1) { st.target = y; st.speed = speed; st.moving = true; if (speed <= 0) { setTop(y); st.moving = false; } },
    start() { handle.setLevel(spec.rise?.to ?? high, spec.rise?.speed ?? 0.6); },
    stop() { st.moving = false; st.target = st.top; },
    info: () => ({ top: +st.top.toFixed(3), state: st.state, low, high, mode }),
  };
  if (spec.id) level.named.set(spec.id, handle);
  w7(level).lavas.push(handle);
  if (mode === 'signal' && spec.reset !== false) onRespawn(level, () => { st.moving = false; st.target = low; setTop(low); st.state = 'unten'; });

  // Plan: [[t, y], …] linear
  const P = Array.isArray(spec.plan) ? spec.plan.slice().sort((a, b) => a[0] - b[0]) : null;
  const planAt = (t) => {
    const end = P[P.length - 1][0];
    if (spec.loop !== false && end > 0) t = ((t % end) + end) % end;
    if (t <= P[0][0]) return P[0][1];
    for (let i = 1; i < P.length; i++) if (t <= P[i][0]) { const [ta, a] = P[i - 1], [tb, b] = P[i]; return a + (b - a) * ease((t - ta) / Math.max(1e-6, tb - ta)); }
    return P[P.length - 1][1];
  };
  level.onStep((dt, time) => {
    if (mode === 'zyklus') {
      const ph = plan.at(time);
      if (ph.name !== st.state && ph.name === 'warn') level.sfx('rumble');
      st.state = ph.name;
      st.warnK = ph.name === 'warn' ? ph.u : 0;
      const y = ph.name === 'steigt' ? low + (high - low) * ease(ph.u) : ph.name === 'oben' ? high : ph.name === 'sinkt' ? high - (high - low) * ease(ph.u) : low;
      setTop(y);
    } else if (mode === 'plan' && P?.length) {
      const y = planAt(time + (spec.phase ?? 0));
      st.state = y > st.top + 1e-5 ? 'steigt' : y < st.top - 1e-5 ? 'sinkt' : 'ruht';
      setTop(y);
    } else if (st.moving) {
      const d = st.target - st.top, step = st.speed * dt;
      if (Math.abs(d) <= step) { setTop(st.target); st.moving = false; } else setTop(st.top + Math.sign(d) * step);
      st.state = st.moving ? 'faehrt' : st.top > low + 0.05 ? 'oben' : 'unten';
    }
  });
  if (!level.view) return handle;

  // ---------------- Darstellung: Oberfläche (Lava-Shader), glühender Körper, Blasen, Vorwarn-Glühen
  const pal = LAVA_PAL[color];
  const group = new THREE.Group();
  group.name = 'lavaspiegel';
  const g = new THREE.PlaneGeometry(s.x, s.z, 1, 1);
  g.rotateX(-Math.PI / 2);
  const surf = new THREE.Mesh(g, lavaMaterial(level, color));
  surf.receiveShadow = false;
  group.add(surf);
  let body = null;
  if (spec.body !== false) {
    const bg = new THREE.BoxGeometry(s.x - 0.02, 1, s.z - 0.02);
    bg.translate(0, 0.5, 0);
    body = new THREE.Mesh(bg, new THREE.MeshStandardMaterial({ color: pal.crust, roughness: 0.8, emissive: pal.glow, emissiveIntensity: 0.55 }));
    group.add(body);
  }
  const warn = new THREE.Mesh(new THREE.PlaneGeometry(s.x, s.z), new THREE.MeshBasicMaterial({ color: pal.hi, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  warn.rotation.x = -Math.PI / 2;
  warn.renderOrder = 2;
  group.add(warn);
  const nb = spec.bubbles === false ? 0 : clamp(Math.round((s.x * s.z) / 9), 4, 24);
  let bub = null;
  const B = [];
  if (nb) {
    bub = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 5, 0, TAU2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: pal.hi }), nb);
    bub.frustumCulled = false;
    let seed = Math.floor(p.x * 31 + p.z * 17) >>> 0;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < nb; i++) B.push({ x: x0 + 0.4 + rnd() * (s.x - 0.8), z: z0 + 0.4 + rnd() * (s.z - 0.8), t: rnd() * 2, life: 1.2 + rnd() * 1.4, r: 0.12 + rnd() * 0.2, rnd });
    group.add(bub);
  }
  const holder = {};
  let t = 0;
  addObject(level, group, (dt) => {
    const d = visDt(level, holder, dt);
    t += d;
    const top = st.top;
    surf.position.set(p.x, top - 0.03, p.z);
    if (body) { body.position.set(p.x, p.y, p.z); body.scale.y = Math.max(0.01, top - 0.08 - p.y); }
    const wk = st.state === 'warn' ? 0.25 + 0.75 * st.warnK : st.state === 'steigt' || st.state === 'faehrt' ? 0.25 : 0;
    warn.visible = wk > 0;
    warn.material.opacity = wk * (0.35 + 0.25 * Math.sin(t * 16));
    warn.position.set(p.x, top + 0.02, p.z);
    if (!bub) return;
    const fast = 1 + wk * 2.5;
    for (let i = 0; i < B.length; i++) {
      const b = B[i];
      b.t += d * fast;
      if (b.t > b.life) { b.t = 0; b.life = 1.2 + b.rnd() * 1.4; b.r = 0.12 + b.rnd() * 0.2 * (1 + wk); b.x = x0 + 0.4 + b.rnd() * (s.x - 0.8); b.z = z0 + 0.4 + b.rnd() * (s.z - 0.8); }
      const k = b.t / b.life;
      const r = b.r * Math.sin(Math.min(1, k * 1.15) * Math.PI * 0.5) * (k > 0.9 ? 0 : 1);
      _p.set(b.x, top - 0.04, b.z); _s.set(r, r * 0.75, r);
      _m.compose(_p, _q, _s);
      bub.setMatrixAt(i, _m);
    }
    bub.instanceMatrix.needsUpdate = true;
  });
  return handle;
}
const TAU2 = Math.PI * 2;

// =====================================================================================================================
// Gitterboden
// =====================================================================================================================

const GRATE = {
  eisen: { bar: 0x4a4650, hi: 0x8a8692, heat: 0xff7a2a },
  rost: { bar: 0x6a3a26, hi: 0xb07050, heat: 0xff8a3a },
  blau: { bar: 0x3a4466, hi: 0x7a8ab8, heat: 0x5ac0ff },
};

export function buildGitterboden(level, spec) {
  const p = v3(spec.pos);
  const sz = Array.isArray(spec.size) ? spec.size : [4, 4];
  const W = sz[0], D = sz.length > 2 ? sz[2] : sz[1] ?? W;
  const th = spec.thick ?? 0.2;
  const top = p.y + th;
  const x0 = p.x - W / 2, x1 = p.x + W / 2, z0 = p.z - D / 2, z1 = p.z + D / 2;
  level.world.add({ type: 'box', min: [x0, p.y, z0], max: [x1, top, z1], tag: 'gitterboden', grate: true });
  let lava = null;
  if (spec.lava) {
    const L = spec.lava === true ? {} : spec.lava;
    const depth = L.depth ?? 2.2;
    lava = buildLavaspiegel(level, { mode: 'fest', ...L, id: L.id, pos: [p.x, top - depth - 1, p.z], size: [W, 1, D], low: L.low ?? top - depth });
  }
  const handle = { top, lava, info: () => ({ top, lava: lava?.info() ?? null }) };
  if (spec.id) level.named.set(spec.id, handle);
  w7(level).grates.push(handle);
  if (!level.view) return handle;
  if (hasModel('gitterboden') && spec.look !== 'eigen') {
    // als Kacheln von etwa tile m (Rahmen gliedern die feinen Stäbe, gleiche Geometrie je Kachel)
    const tile = spec.tile ?? 2;
    const nx = Math.max(1, Math.round(W / tile)), nz = Math.max(1, Math.round(D / tile)), tw = W / nx, td = D / nz;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      bakeModel(level, 'gitterboden', { size: [tw, td], thick: th }, p.x - W / 2 + (i + 0.5) * tw, p.y, p.z - D / 2 + (j + 0.5) * td, 0, 1, {}, { castShadow: false });
    }
    return handle;
  }
  const S = GRATE[spec.style] ?? GRATE[lava?.shape?.lavaColor === 'blau' ? 'blau' : 'eisen'];
  const bar = spec.bar ?? 0.07, cell = spec.cell ?? 0.5, fr = spec.frame ?? 0.22;
  const parts = [];
  const cb = lin(S.bar), ch = lin(S.hi), heat = lin(S.heat);
  const paint = (g) => colorize(g.index ? g.toNonIndexed() : g, (q, n, o) => {
    mixc(cb, ch, smooth(-0.2, 1, n.y), o);
    if (n.y < -0.5) mixc(o, heat, 0.75, o);                  // Unterseite glüht von der Lava
    else if (Math.abs(n.y) < 0.5) mixc(o, heat, 0.25, o);
  });
  const ix0 = x0 + fr, ix1 = x1 - fr, iz0 = z0 + fr, iz1 = z1 - fr;
  // Stäbe in beiden Richtungen (die quer laufenden etwas tiefer: Rost-Optik)
  for (let x = ix0 + cell / 2; x < ix1 - 1e-3; x += cell) { const b = new THREE.BoxGeometry(bar, th, iz1 - iz0); b.translate(x, p.y + th / 2, (iz0 + iz1) / 2); parts.push(paint(b)); }
  for (let z = iz0 + cell / 2; z < iz1 - 1e-3; z += cell) { const b = new THREE.BoxGeometry(ix1 - ix0, th * 0.7, bar); b.translate((ix0 + ix1) / 2, p.y + th * 0.35, z); parts.push(paint(b)); }
  if (fr > 0) {
    for (const [cx, cz, w, d] of [[p.x, z0 + fr / 2, W, fr], [p.x, z1 - fr / 2, W, fr], [x0 + fr / 2, p.z, fr, D - fr * 2], [x1 - fr / 2, p.z, fr, D - fr * 2]]) {
      const b = new THREE.BoxGeometry(w, th * 1.15, d); b.translate(cx, p.y + th * 0.575, cz); parts.push(paint(b));
    }
    // Nieten an den Ecken
    for (const [cx, cz] of [[x0 + fr / 2, z0 + fr / 2], [x1 - fr / 2, z0 + fr / 2], [x0 + fr / 2, z1 - fr / 2], [x1 - fr / 2, z1 - fr / 2]]) {
      const r = new THREE.SphereGeometry(fr * 0.32, 6, 4); r.translate(cx, top + 0.02, cz); parts.push(paint(r));
    }
  }
  addStatic(level, merge(parts), { castShadow: spec.shadow !== false });
  return handle;
}

export const TYPES = { lavaspiegel: buildLavaspiegel, gitterboden: buildGitterboden };
