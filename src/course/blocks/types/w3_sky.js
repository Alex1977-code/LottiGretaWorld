// Welt-3-Bausteine Himmel (Bauplan 3-2 „bewegliche Kettenzäune als Plattform“, „Bröckelblöcke“, „ein Kurbelrad hebt eine
// Plattform“, „über zwei Goldringen“; 3-4 „unsichtbarer Wolkenlift direkt hinter dem Start“). Kurbelrad und Goldring sind
// Entitäten (entities/kinds/w3_gimmicks.js). Den Kletter-Modus am Zaun liefert der Motor (Baustein `kettenzaun`); die
// Kettenplattform hat dafür einen Zaun mit Flag climbable (Krallen-Anzug) und ist über level.named erreichbar.
//
// kettenplattform – fahrende Himmels-Plattform (Gitterrost, Wolken darunter, Modell 'kettenplattform') mit Zaun an der
//   Rückseite (lokal −X), fährt einen Pfad ab und trägt; optional mit sichtbarer Bahn (Stahlträger unter dem Pfad).
//   { type: 'kettenplattform', path: [[x, y, z], …] (Mitte der Unterseite) | pos, size: [w, d] ([4, 3]), yaw: 0 (90°-
//     Raster), speed: 2.5, mode: 'pingpong' | 'loop', wait: 0.6, phase: 0, fence: true, fenceHeight: 2.5,
//     climbable: true, bahn: false (Bahn zeichnen), idle: false (wartet auf { start: id }), once: false, id }
//   level.named.get(id) = { pm, box, fence, running, start(), stop(), pos }
//
// broeckelblock – Bröckelblöcke (1 m): betritt eine Figur einen, zittert er `delay` s und zerfällt (Modell
//   'broeckelblock' zerbröselt), nach `respawn` s ist er wieder da (0 = nie).
//   { type: 'broeckelblock', pos | blocks: [[x, y, z], …] | from: [x, y, z], to: [x, y, z] (Reihe, je 1 m), delay: 0.5,
//     respawn: 5, id }   level.named.get(id) = { blocks: [{ state, t }], left() }
//
// wolkenlift – Wolkenlift (Modell 'wolkenlift', Oberkante 0,55 m): zuerst unsichtbar (aber begehbar, von unten
//   durchspringbar); Berührung (reveal 'touch') bzw. Nähe (reveal 'near', near m) lässt ihn erscheinen; dann fährt er
//   nach `wait` s den Pfad einmal ab (Lift) und bleibt oben (loop: hin und her).
//   { type: 'wolkenlift', pos (Mitte der Unterseite), width: 2.6, path: [[x, y, z], …] (Pfad ab pos), speed: 2,
//     reveal: 'touch' | 'near' | 'visible', near: 3, wait: 0.5, loop: false, onReveal: Aktion, id }
//   level.named.get(id) = { shown, state ('hidden'|'reveal'|'wait'|'move'|'top'), box, reveal() }

import * as THREE from 'three';
import { v3, box, merge, addStatic, addObject } from '../kit.js';
import { MovingBox, figures, modelObject, rotXZ, snapYaw } from '../w3kit.js';
import { PathMover } from '../../level/PathMover.js';
import { runAction, visDt } from '../../entities/gimmick.js';
import { getModel } from '../../models/index.js';

// ------------------------------------------------------------------ Kettenplattform

export function buildKettenplattform(level, spec) {
  const path = spec.path ?? [spec.pos ?? [0, 0, 0]];
  const [W, D] = spec.size ?? [4, 3];
  const yaw = snapYaw(spec.yaw ?? 0);
  const alongX = Math.abs(Math.cos(yaw)) > 0.5;
  const pm = new PathMover(path, { speed: spec.speed ?? 2.5, mode: spec.mode, wait: spec.wait ?? 0.6, phase: spec.phase ?? 0 });
  const p0 = pm.pos;
  const deck = new MovingBox(level, p0.x, p0.y, p0.z, alongX ? W : D, 0.35, alongX ? D : W, { tag: 'kettenplattform' });
  const fenceOn = spec.fence !== false, FH = spec.fenceHeight ?? 2.5;
  const fo = rotXZ(-W / 2 + 0.1, 0, yaw);
  const fence = fenceOn ? new MovingBox(level, p0.x + fo.x, p0.y + 0.3, p0.z + fo.z, alongX ? 0.16 : D - 0.2, FH, alongX ? D - 0.2 : 0.16,
    { tag: 'kettenplattform:zaun', climbable: spec.climbable !== false, noWallSlide: false }) : null;
  const h = { pm, box: deck, fence, running: !spec.idle, pos: pm.pos, start() { h.running = true; }, stop() { h.running = false; } };
  if (spec.id) level.named.set(spec.id, h);
  level.onStep((dt) => {
    if (!h.running) { deck.still(); fence?.still(); return; }
    pm.step(dt);
    if (spec.once && pm.mode !== 'loop' && pm.dir < 0) { pm.s = pm.length; pm.at(pm.s, pm.pos); h.running = false; }
    const p = pm.pos;
    deck.moveTo(p.x, p.y, p.z, dt);
    fence?.moveTo(p.x + fo.x, p.y + 0.3, p.z + fo.z, dt);
  });
  if (level.view) {
    modelObject(level, 'kettenplattform', { width: W, depth: D, fence: fenceOn, fenceHeight: FH }, p0.x, p0.y, p0.z, yaw,
      () => ({ anim: h.running && pm.pause <= 0 && pm.length > 0 ? 'move' : 'idle' }),
      (root) => root.position.set(pm.pos.x, pm.pos.y, pm.pos.z));
    if (spec.bahn && path.length > 1) {
      const pts = path.map((q) => v3(q));
      if (pm.mode === 'loop' && pts.length > 2) pts.push(pts[0]);
      const parts = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, L = Math.hypot(dx, dy, dz);
        if (L < 0.1) continue;
        const g = box(L + 0.3, 0.22, 0.22, 0, 0, 0, 0x5a6a8a, { r: 0.05, seg: 1 });
        g.rotateZ(Math.atan2(dy, Math.hypot(dx, dz)));
        g.rotateY(Math.atan2(-dz, dx));
        g.translate((a.x + b.x) / 2, (a.y + b.y) / 2 - 0.55, (a.z + b.z) / 2);
        parts.push(g);
        const n = Math.max(1, Math.floor(L / 2));
        for (let k = 0; k <= n; k++) {
          const u = k / n;
          parts.push(box(0.16, 0.12, 0.16, a.x + dx * u, a.y + dy * u - 0.38, a.z + dz * u, 0xffc21a, { r: 0.04, seg: 1 }));
        }
      }
      if (parts.length) addStatic(level, merge(parts), { material: 'stone', castShadow: false });
    }
  }
  return h;
}

// ------------------------------------------------------------------ Bröckelblöcke

function crumbleTemplate() {
  const parts = [];
  for (let i = 0; i < 8; i++) {
    const x = (i & 1 ? 0.25 : -0.25) + Math.sin(i * 3.1) * 0.012, y = i & 2 ? 0.75 : 0.25, z = (i & 4 ? 0.25 : -0.25) + Math.cos(i * 2.3) * 0.012;
    const g = box(0.47, 0.47, 0.47, x, y, z, i % 3 ? 0xd6a86a : 0xc8965a, { r: 0.07, seg: 1, topColor: 0xf0d498 });
    g.rotateY(Math.sin(i * 1.7) * 0.05);
    parts.push(g);
  }
  // Risse
  for (const [x, y, z, a] of [[0, 0.62, 0.505, 0.6], [0.505, 0.35, 0, -0.4], [-0.2, 1.005, 0.1, 1.1]]) {
    const g = box(0.5, 0.04, 0.03, 0, 0, 0, 0x6a4424, { r: 0, seg: 0 });
    if (Math.abs(x) > 0.5) g.rotateY(Math.PI / 2);
    if (y > 1) g.rotateX(Math.PI / 2);
    g.rotateZ(a);
    g.translate(x, y, z);
    parts.push(g);
  }
  const root = new THREE.Group();
  root.add(new THREE.Mesh(merge(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 })));
  return root;
}

export function buildBroeckelblock(level, spec) {
  let list = spec.blocks;
  if (!list && spec.from && spec.to) {
    const a = v3(spec.from), b = v3(spec.to);
    const L = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z), n = Math.max(1, Math.round(L) + 1);
    list = Array.from({ length: n }, (_, i) => [a.x + (b.x - a.x) * (n > 1 ? i / (n - 1) : 0), a.y + (b.y - a.y) * (n > 1 ? i / (n - 1) : 0), a.z + (b.z - a.z) * (n > 1 ? i / (n - 1) : 0)]);
  }
  list ??= [spec.pos ?? [0, 0, 0]];
  const delay = spec.delay ?? 0.5, respawn = spec.respawn ?? 5;
  const pool = level.view?.pool('w3:broeckel', crumbleTemplate, { castShadow: true, capacity: 48 }) ?? null;
  const blocks = list.map((q) => {
    const p = v3(q);
    const b = { p, state: 'idle', t: 0, idx: pool ? pool.alloc() : -1, shape: null, id: null };
    b.shape = { type: 'box', min: [p.x - 0.5, p.y, p.z - 0.5], max: [p.x + 0.5, p.y + 1, p.z + 0.5], owner: b, tag: 'broeckelblock' };
    b.id = level.world.add(b.shape);
    if (pool) pool.set(b.idx, p.x, p.y, p.z);
    return b;
  });
  const h = { blocks, left: () => blocks.filter((b) => b.state !== 'gone').length };
  if (spec.id) level.named.set(spec.id, h);
  const on = (b) => figures(level).some((f) => f.mode === 'ground' && f.ground === b.shape);
  const crumble = (b) => {
    b.state = 'gone'; b.t = 0;
    if (b.id) { level.world.remove(b.id); b.id = null; }
    if (pool) pool.hide(b.idx);
    level.sfx('sand_crumble');
    level.effects?.debris({ x: b.p.x, y: b.p.y + 0.5, z: b.p.z }, 0xc8965a, 6);
    if (level.view) {
      const m = getModel('broeckelblock');
      m.root.position.set(b.p.x, b.p.y, b.p.z);
      let age = 0;
      const holder = {};
      const upd = (dt) => {
        const d = visDt(level, holder, dt);
        age += d;
        m.update(d, { anim: 'crumble' });
        if (age > 1.0) { level.view.remove(m.root); m.dispose?.(); }
      };
      addObject(level, m.root, upd);
    }
  };
  level.onStep((dt, t) => {
    for (const b of blocks) {
      b.t += dt;
      if (b.state === 'idle') {
        if (on(b)) { b.state = 'shake'; b.t = 0; level.sfx('step'); }
      } else if (b.state === 'shake') {
        if (pool) pool.set(b.idx, b.p.x + Math.sin(t * 61 + b.p.x) * 0.03, b.p.y, b.p.z + Math.cos(t * 53 + b.p.z) * 0.03);
        if (b.t >= delay) crumble(b);
      } else if (b.state === 'gone' && respawn > 0 && b.t >= respawn) {
        // nur wiederkommen, wenn niemand im Weg steht
        const blocked = figures(level).some((f) => Math.abs(f.pos.x - b.p.x) < 0.8 && Math.abs(f.pos.z - b.p.z) < 0.8 && f.pos.y < b.p.y + 1 && f.pos.y + f.half.y * 2 > b.p.y);
        if (!blocked) {
          b.state = 'idle'; b.t = 0;
          b.id = level.world.add(b.shape);
          if (pool) pool.set(b.idx, b.p.x, b.p.y, b.p.z);
          level.effects?.sparks({ x: b.p.x, y: b.p.y + 1, z: b.p.z }, 6);
        }
      }
    }
  });
  return h;
}

// ------------------------------------------------------------------ Wolkenlift

export function buildWolkenlift(level, spec) {
  const p = v3(spec.pos);
  const W = spec.width ?? 2.6, D = W * 0.7;
  const pm = spec.path?.length ? new PathMover([[p.x, p.y, p.z], ...spec.path], { speed: spec.speed ?? 2, mode: 'pingpong', wait: spec.wait ?? 0.5 }) : null;
  const bx = new MovingBox(level, p.x, p.y, p.z, W, 0.55, D, { tag: 'wolkenlift', oneWay: true });
  const reveal = spec.reveal ?? 'touch';
  const st = { shown: reveal === 'visible', state: reveal === 'visible' ? 'wait' : 'hidden', t: 0, box: bx, revealT: -1, pos: pm ? pm.pos : { x: p.x, y: p.y, z: p.z } };
  st.reveal = () => {
    if (st.shown) return;
    st.shown = true; st.state = 'reveal'; st.t = 0; st.revealT = level.time;
    level.sfx('powerup_appear');
    level.effects?.sparks({ x: st.pos.x, y: st.pos.y + 0.6, z: st.pos.z }, 16);
    runAction(level, spec.onReveal, { pos: [st.pos.x, st.pos.y + 1, st.pos.z], source: st });
  };
  st.open = st.reveal;
  st.start = st.reveal;
  if (spec.id) level.named.set(spec.id, st);
  level.onStep((dt) => {
    st.t += dt;
    if (st.state === 'hidden') {
      const near = spec.near ?? 3;
      for (const f of figures(level)) {
        if (bx.carries(f)) { st.reveal(); break; }
        if (reveal === 'near' && Math.hypot(f.pos.x - st.pos.x, f.pos.z - st.pos.z) < near && Math.abs(f.pos.y - st.pos.y) < near) { st.reveal(); break; }
      }
      bx.still();
      return;
    }
    if (st.state === 'reveal') { if (st.t >= 0.5) { st.state = 'wait'; st.t = 0; } bx.still(); return; }
    if (!pm) { bx.still(); return; }
    if (st.state === 'wait') { if (st.t >= (spec.wait ?? 0.5)) { st.state = 'move'; st.t = 0; } bx.still(); return; }
    if (st.state === 'move') {
      pm.step(dt);
      if (!spec.loop && pm.dir < 0) { pm.s = pm.length; pm.at(pm.s, pm.pos); st.state = 'top'; }
      bx.moveTo(pm.pos.x, pm.pos.y, pm.pos.z, dt);
      return;
    }
    bx.still();
  });
  if (level.view) {
    modelObject(level, 'wolkenlift', { width: W }, p.x, p.y, p.z, spec.yaw ?? -Math.PI / 2,
      () => ({ anim: !st.shown ? 'hidden' : st.state === 'reveal' ? 'reveal' : 'idle' }),
      (root) => root.position.set(st.pos.x, st.pos.y, st.pos.z));
  }
  return st;
}

export const TYPES = { kettenplattform: buildKettenplattform, broeckelblock: buildBroeckelblock, wolkenlift: buildWolkenlift };
