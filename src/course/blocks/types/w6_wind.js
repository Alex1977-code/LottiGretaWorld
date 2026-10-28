// Welt-6-Baustein Windfeld / Windböe (Bauplan 6-5 „Abgrund mit Windböen (Lücken 4–6 m)“, „Abhang voller Pustewolken“).
// Ein Quader, in dem der Wind gerichtet schiebt: periodische Böen mit Vorwarnung (feine Windlinien und Rauschen, dann
// kräftige Linien), Dauerwind oder Böe auf Signal. Figuren (auch Klone) werden mitgeschoben – am Boden schwächer (gegen den
// Wind laufen geht langsam), in der Luft voll (ein Sprung über den Abgrund verweht). Leichte Entitäten (windK > 0, z. B.
// Wurfball) treiben mit. Gegner (Pustewolke) können den Wind über windAt(level, x, y, z) aus blocks/w6kit.js lesen.
//
// windfeld:
//   { type: 'windfeld', id, pos: [x, y, z] (Mitte unten), size: [w, h, d] (8 × 6 × 6), dir: [dx, dz] | [dx, dy, dz]
//     (Schubrichtung), strength: 7 (m/s), mode: 'boe' | 'dauer' | 'signal', period: 4.5 (s), on: 1.8 (s Böe),
//     warn: 1.0 (s Vorwarnung), phase: 0 (s Versatz), ramp: 0.25 (s An-/Abschwellen), ground: 0.7 (Faktor am Boden),
//     items: true, streaks: 36 (Windlinien), source: 'none' | 'wolke' | 'ventil' (Quelle am Rand, gegen den Wind),
//     idle: false (steht bis start()) }
//   level.named.get(id) = { state ('ruhe'|'warn'|'boe'), k (0..1), gusts, pushed (m), start(), stop(), gust(), add(x,y,z,out),
//                           info() }; w6(level).winds = alle Windfelder.
// Modelle aus der Registry, sobald es sie gibt: 'windquelle_w6' ({ kind: 'wolke'|'ventil', size }, Blick +X = Windrichtung).

import * as THREE from 'three';
import { v3, sz3, lin, mixc, smooth, colorize, merge, addObject, addStatic, Rnd } from '../kit.js';
import { visDt } from '../../entities/gimmick.js';
import { hasModel, getModel } from '../../models/index.js';
import { w6, figures, shove, flatColor } from '../w6kit.js';

const FREE = new Set(['ground', 'air', 'swim']);

export function buildWindfeld(level, spec) {
  const p = v3(spec.pos), s = sz3(spec.size, [8, 6, 6]);
  const d0 = spec.dir ?? [1, 0];
  let dx = d0.length === 3 ? d0[0] : d0[0], dy = d0.length === 3 ? d0[1] : 0, dz = d0.length === 3 ? d0[2] : d0[1];
  const dl = Math.hypot(dx, dy, dz) || 1; dx /= dl; dy /= dl; dz /= dl;
  const strength = spec.strength ?? 7;
  const mode = spec.mode ?? 'boe';
  const period = spec.period ?? 4.5, on = Math.min(spec.on ?? 1.8, period), warn = Math.min(spec.warn ?? 1.0, period - on);
  const ramp = spec.ramp ?? 0.25;
  const gk = spec.ground ?? 0.7;
  const box = { x0: p.x - s.x / 2, x1: p.x + s.x / 2, y0: p.y, y1: p.y + s.y, z0: p.z - s.z / 2, z1: p.z + s.z / 2 };
  const inside = (x, y, z) => x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1 && z >= box.z0 && z <= box.z1;
  const st = { t: spec.phase ?? 0, state: 'ruhe', k: 0, warnK: 0, gusts: 0, pushed: 0, running: !spec.idle && mode !== 'signal', single: -1 };

  /** Zustand zur Zeit u im Takt (0 … period). */
  const phaseOf = (u) => {
    if (mode === 'dauer') return { state: 'boe', k: 1, w: 0 };
    const a = period - on - warn, b = period - on;
    if (u < a) return { state: 'ruhe', k: 0, w: 0 };
    if (u < b) return { state: 'warn', k: 0, w: (u - a) / Math.max(0.01, warn) };
    const v = u - b;
    const k = Math.min(1, v / Math.max(0.01, ramp), (on - v) / Math.max(0.01, ramp));
    return { state: 'boe', k: Math.max(0, k), w: 1 };
  };

  const handle = {
    get state() { return st.state; }, get k() { return st.k; }, get gusts() { return st.gusts; }, get pushed() { return st.pushed; },
    dir: { x: dx, y: dy, z: dz }, strength, box,
    start() { if (mode === 'signal') handle.gust(); else st.running = true; },
    stop() { st.running = false; st.single = -1; },
    toggle() { if (st.running) handle.stop(); else handle.start(); },
    /** Eine einzelne Böe (Vorwarnung, Böe) – Modus 'signal' oder von außen. */
    gust() { st.single = 0; },
    add(x, y, z, out) { if (st.k > 0 && inside(x, y, z)) { const f = strength * st.k; out.x += dx * f; out.y += dy * f; out.z += dz * f; } return out; },
    info: () => ({ state: st.state, k: +st.k.toFixed(2), gusts: st.gusts, pushed: +st.pushed.toFixed(2), t: +st.t.toFixed(2) }),
  };
  w6(level).winds.push(handle);
  if (spec.id) level.named.set(spec.id, handle);

  level.onStep((dt) => {
    let ph;
    if (st.single >= 0) {
      st.single += dt;
      const u = period - on - warn + st.single;
      ph = st.single < on + warn ? phaseOf(u) : { state: 'ruhe', k: 0, w: 0 };
      if (st.single >= on + warn) st.single = -1;
    } else if (st.running) {
      st.t += dt;
      ph = phaseOf(((st.t % period) + period) % period);
    } else ph = { state: 'ruhe', k: 0, w: 0 };
    if (ph.state !== st.state) {
      if (ph.state === 'warn') level.sfx('wind');
      if (ph.state === 'boe') { st.gusts++; level.sfx('gust'); }
    }
    st.state = ph.state; st.k = ph.k; st.warnK = ph.w;
    if (st.k <= 0) return;
    const f = strength * st.k * dt;
    for (const fig of figures(level)) {
      if (!FREE.has(fig.mode)) continue;
      const c = fig.center();
      if (!inside(c.x, c.y, c.z)) continue;
      const k = fig.mode === 'ground' ? gk : 1;
      const m = shove(level, fig, dx * f * k, dy * f * k, dz * f * k);
      st.pushed += Math.hypot(m.x, m.y, m.z);
      if (dy > 0.3 && fig.mode === 'air' && fig.vel.y < 0) fig.vel.y *= 0.96;   // Aufwind bremst den Fall
    }
    if (spec.items !== false) {
      for (const e of level.entities) {
        if (!(e.windK > 0) || !e.alive || e.removed || e.carrier || e.hidden) continue;
        const c = e.center();
        if (!inside(c.x, c.y, c.z)) continue;
        const own = new Set(e.shapes ?? []);
        shove(level, e, dx * f * e.windK, dy * f * e.windK, dz * f * e.windK, own.size ? (q) => own.has(q.id) : null);
      }
    }
  });

  if (level.view) buildWindVisual(level, spec, p, s, { x: dx, y: dy, z: dz }, st);
  return handle;
}

function buildWindVisual(level, spec, p, s, dir, st) {
  const n = spec.streaks ?? 36;
  const rnd = new Rnd(Math.floor(p.x * 17 + p.z * 29 + p.y * 3) >>> 0);
  // Windlinien: kurze, gebogene Bänder (LineSegments), wandern in Windrichtung durch den Quader
  const seeds = [];
  for (let i = 0; i < n; i++) seeds.push({ u: rnd.frac(), y: rnd.frac(), w: rnd.frac(), len: rnd.real(0.8, 2.2), sp: rnd.real(0.8, 1.3), ph: rnd.real(0, 6.28) });
  const seg = 4;
  const pos = new Float32Array(n * seg * 2 * 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: true });
  const lines = new THREE.LineSegments(g, mat);
  lines.frustumCulled = false;
  lines.renderOrder = 4;
  // Achsen des Quaders: entlang der Windrichtung (waagerechter Anteil) und quer
  const hx = dir.x, hz = dir.z, hl = Math.hypot(hx, hz);
  const ax = hl > 0.1 ? { x: hx / hl, z: hz / hl } : { x: 1, z: 0 };
  const L = Math.abs(ax.x) * s.x + Math.abs(ax.z) * s.z, Wd = Math.abs(ax.z) * s.x + Math.abs(ax.x) * s.z;
  const holder = {};
  let tt = 0;
  addObject(level, lines, (dt) => {
    tt += visDt(level, holder, dt);
    const vis = Math.max(st.k, st.state === 'warn' ? 0.25 + 0.2 * st.warnK : 0);
    mat.opacity = st.state === 'boe' ? 0.35 + 0.4 * st.k : st.state === 'warn' ? 0.12 + 0.14 * Math.abs(Math.sin(tt * 9)) : 0;
    lines.visible = vis > 0.01;
    if (!lines.visible) return;
    let k = 0;
    const speed = st.state === 'boe' ? 14 : 5;
    for (let i = 0; i < n; i++) {
      const sd = seeds[i];
      const use = st.state === 'boe' || i % 3 === 0;
      const along = (((sd.u * L + tt * speed * sd.sp) % L) + L) % L - L / 2;
      const across = (sd.w - 0.5) * Wd;
      const y = p.y + 0.4 + sd.y * (s.y - 0.8);
      for (let j = 0; j < seg; j++) {
        const a0 = along - (sd.len * j) / seg, a1 = along - (sd.len * (j + 1)) / seg;
        const w0 = Math.sin(tt * 3 + sd.ph + j * 0.8) * 0.12, w1 = Math.sin(tt * 3 + sd.ph + (j + 1) * 0.8) * 0.12;
        const base = k * 6;
        if (!use) { pos.fill(0, base, base + 6); k++; continue; }
        pos[base] = p.x + ax.x * a0 - ax.z * across; pos[base + 1] = y + w0 + dir.y * a0; pos[base + 2] = p.z + ax.z * a0 + ax.x * across;
        pos[base + 3] = p.x + ax.x * a1 - ax.z * across; pos[base + 4] = y + w1 + dir.y * a1; pos[base + 5] = p.z + ax.z * a1 + ax.x * across;
        k++;
      }
    }
    g.attributes.position.needsUpdate = true;
  });
  // Quelle am Rand (gegen den Wind)
  const src = spec.source ?? 'none';
  if (src !== 'none') {
    const q = { x: p.x - ax.x * (L / 2 + 0.6), y: p.y + s.y * 0.45, z: p.z - ax.z * (L / 2 + 0.6) };
    const yaw = Math.atan2(-ax.z, ax.x);
    if (hasModel('windquelle_w6')) {
      const m = getModel('windquelle_w6', { kind: src, size: Math.min(s.y, Wd) * 0.6 });
      m.root.position.set(q.x, q.y - s.y * 0.3, q.z); m.root.rotation.y = yaw;
      const hv = {};
      addObject(level, m.root, (dt) => m.update?.(visDt(level, hv, dt), { k: st.k, warn: st.state === 'warn' }));
    } else if (src === 'ventil') {
      const R = Math.min(s.y, Wd) * 0.3;
      const ring = new THREE.TorusGeometry(R, R * 0.14, 8, 24); ring.rotateY(Math.PI / 2);
      const housing = new THREE.CylinderGeometry(R, R, 0.6, 20, 1, true); housing.rotateZ(Math.PI / 2);
      const parts = [flatColor(ring, 0x5a6476), flatColor(housing, 0x7a8698)];
      const geo = merge(parts); geo.rotateY(yaw); geo.translate(q.x, q.y, q.z);
      addStatic(level, geo);
      const fan = new THREE.Group();
      for (let i = 0; i < 4; i++) { const b = new THREE.BoxGeometry(0.06, R * 1.7, R * 0.4); const m = new THREE.Mesh(b, new THREE.MeshStandardMaterial({ color: 0xffc83a, roughness: 0.5 })); m.rotation.x = (i * Math.PI) / 4; fan.add(m); }
      fan.position.set(q.x, q.y, q.z); fan.rotation.y = yaw;
      const hv = {};
      addObject(level, fan, (dt) => { const d = visDt(level, hv, dt); fan.children.forEach((c) => { c.rotation.x += d * (2 + 22 * st.k); }); });
    } else {
      // Wolkenbank (weiche Bäusche), leicht pustend
      const parts = [];
      const r0 = Math.min(s.y, Wd) * 0.28;
      const white = lin(0xffffff), shade = lin(0xc8d8ec);
      for (let i = 0; i < 6; i++) {
        const sp = new THREE.SphereGeometry(r0 * rnd.real(0.6, 1), 10, 7);
        sp.translate(-ax.z * (i - 2.5) * r0 * 0.9, rnd.real(-0.3, 0.4) * r0, ax.x * (i - 2.5) * r0 * 0.9);
        parts.push(colorize(sp.toNonIndexed(), (pp, nn, o) => mixc(shade, white, smooth(-0.6, 0.6, nn.y), o)));
      }
      const cl = new THREE.Mesh(merge(parts), level.view.mats.world);
      cl.position.set(q.x, q.y, q.z);
      const hv = {};
      let t2 = 0;
      addObject(level, cl, (dt) => { t2 += visDt(level, hv, dt); const k = 1 + 0.08 * st.k + (st.state === 'warn' ? 0.04 * Math.sin(t2 * 12) : 0); cl.scale.set(k, 1 + 0.05 * Math.sin(t2 * 2), k); });
    }
  }
}

export const TYPES = { windfeld: buildWindfeld };
