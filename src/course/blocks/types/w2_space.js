// Welt-2-Bausteine Weltraum (Bauplan 2-2): Tastenstein, Propellerplattform, Antipp-Plattform.
//
// taststein – Tastenstein (achteckige Säule im Bodenring, Modell 'taststein'): Betreten (oder Antippen) drückt ihn,
//   er leuchtet und fährt um `rise` m hoch (trägt die Figur). Gruppen: alle Steine mit derselben `group` bilden eine
//   Melodie/Treppe; sind alle gedrückt, löst die Gruppe einmal `onAll` aus.
//   { type: 'taststein', pos: [x, y, z] (Fußpunkt, y = Boden; Oberkante anfangs y + 1), rise: 1 (m Hub), speed: 2.5
//     (m/s), group: 'name' (Gruppen-Id, level.named), note: 0 (Ton-Index), tap: true (antippbar), reach: 3
//     (Aktionstaste wirkt bis …), stay: true (false → fährt zurück, wenn die Figur `back` s weg ist; Standard 1.5),
//     id }
//   Gruppe auf einen Schlag: { type: 'taststeine', id: 'melodie', stones: [{ pos, rise? }, …], order: false
//     (true → nur in Listenreihenfolge, falscher Stein setzt alle zurück), onAll: Aktion, at: [x, y, z], stay, speed }
//   level.named.get(gruppe) = { stones, count, done, reset() }; Stein: { on, k (0..1 Hub), press(), release() }
//   Beispiel Treppe: { type: 'taststeine', id: 'treppe', stones: [{ pos: [0, 1, -10], rise: 1 }, { pos: [2, 1, -12], rise: 2 },
//     { pos: [4, 1, -14], rise: 3 }], onAll: { star: 1 } }
//
// propellerplattform – schwebende Plattform mit Propeller darunter (Modell 'propellerplattform', Oberseite = pos.y +
//   thick). Kollision: Quader mit mover (trägt mit).
//   { type: 'propellerplattform', pos: [x, y, z] (Mitte der Unterseite der Platte), size: [3, 3] (x, z), thick: 0.4,
//     mode: 'sink' (Standard: sinkt mit `sink` m/s, solange jemand darauf steht, höchstens `drop` m; danach steigt
//            sie mit `back` m/s zurück) | 'rise' (steigt beim Draufstehen mit `climb` m/s bis `height` m, sinkt zurück)
//          | 'path' (fliegt `path` ab: Punkte = Mitte der Unterseite, speed 2, wait 0.8, loop: false → hin und her)
//          | 'float' (schwebt auf der Stelle),
//     sink: 0.8, drop: 6, back: 1.2, climb: 1.6, height: 6, bob: 0.06 (m Wippen), id, idle (path: wartet auf start) }
//   level.named.get(id) = { box (MovingBox), offset, start(), stop() }
//   Beispiel: { type: 'propellerplattform', pos: [0, 3, -40], mode: 'sink', drop: 4 }
//
// antipp – Antipp-Plattform (Touch: auf dem Bildschirm antippen; ohne Touch: Aktionstaste in Reichweite):
//   { type: 'antipp', pos: [x, y, z] (Mitte der Unterseite), size: [2.5, 0.5, 2.5], mode: 'appear' (Standard: vorher
//     nur Umriss, Antippen → fest) | 'slide' (fährt um `length` m in `dir` aus, z. B. aus einer Säule) | 'lift' (fährt
//     `length` m hoch), dir: [dx, dz] | [dx, dy, dz] (slide, Standard [1, 0]), length: 3, speed: 6 (m/s),
//     time: 0 (s bis zum Zurückfahren/Verschwinden; 0 = bleibt), toggle: false (erneut antippen → zurück), reach: 4.5,
//     color: 'cyan', onTap: Aktion, id }
//   level.named.get(id) = { state ('off'|'on'|'out'|'back'), tap(), reset(), box }
//   Beispiel: { type: 'antipp', pos: [0, 2, -60], mode: 'appear', time: 6 }

import * as THREE from 'three';
import { v3, sz3, box, hex, merge, addObject } from '../kit.js';
import { MovingBox, modelObject } from '../w2kit.js';
import { runAction, playerOn, visDt } from '../../entities/gimmick.js';
import { tapTargets } from '../../entities/tap.js';
import { PathMover } from '../../level/PathMover.js';

// ------------------------------------------------------------------ Tastenstein

function stoneGroup(level, id, spec = {}) {
  let g = id ? level.named.get(id) : null;
  if (g?.stones) { if (spec.onAll && !g.onAll) g.onAll = spec.onAll; return g; }
  g = { stones: [], count: 0, done: false, next: 0, order: !!spec.order, onAll: spec.onAll ?? null, at: spec.at ?? null, id };
  g.press = (st) => {
    if (g.done) return true;
    if (g.order && st.idx !== g.next) {
      // falscher Ton: alle zurück, dieser Stein zählt nur, wenn er der erste ist
      for (const s of g.stones) if (s.on) s.release(true);
      g.next = 0;
      level.sfx('vanish');
      if (st.idx !== 0) return false;
    }
    g.next = st.idx + 1;
    return true;
  };
  g.update = () => {
    g.count = g.stones.filter((s) => s.on).length;
    if (!g.done && g.stones.length && g.count === g.stones.length) {
      g.done = true;
      level.sfx('key');
      const at = g.at ? v3(g.at) : (() => { const s = g.stones[g.stones.length - 1]; return { x: s.p.x, y: s.top() + 0.2, z: s.p.z }; })();
      level.effects?.sparks({ x: at.x, y: at.y + 1, z: at.z }, 20);
      runAction(level, g.onAll, { pos: [at.x, at.y, at.z], source: g });
    }
  };
  g.reset = () => { for (const s of g.stones) s.release(true); g.done = false; g.next = 0; g.count = 0; };
  if (id) level.named.set(id, g);
  return g;
}

export function buildTaststein(level, spec, group = null) {
  const p = v3(spec.pos);
  const riseH = spec.rise ?? 1;
  const speed = spec.speed ?? group?.speed ?? 2.5;
  const stay = spec.stay ?? group?.stay ?? true;
  const backT = spec.back ?? 1.5;
  const grp = group?.handle ?? (spec.group ? stoneGroup(level, spec.group) : null);
  const st = { p, on: false, k: 0, idle: 0, idx: grp ? grp.stones.length : 0, note: spec.note ?? (grp ? grp.stones.length : 0), group: grp, flash: 0 };
  st.top = () => p.y + 1 + st.k * riseH;
  const mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: p.x, cz: p.z };
  const shape = { type: 'cyl', x: p.x, z: p.z, r: 0.8, y0: p.y, y1: st.top(), mover, owner: st, tag: 'taststein' };
  const id = level.world.add(shape);
  level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 1.0, y0: p.y, y1: p.y + 0.14, tag: 'taststein:ring' });
  st.press = () => {
    if (st.on) return;
    if (grp && !grp.press(st)) return;
    st.on = true;
    st.idle = 0;
    st.flash = 1;
    level.sfx('select');
    level.sfx(`note${st.note % 8}`);
    level.effects?.sparks({ x: p.x, y: st.top() + 0.1, z: p.z }, 8);
    grp?.update();
  };
  st.release = (quiet) => { if (!st.on) return; st.on = false; if (!quiet) level.sfx('vanish'); grp?.update(); };
  if (grp) grp.stones.push(st);
  if (spec.id) level.named.set(spec.id, st);
  level.onStep((dt) => {
    const onIt = playerOn(level, st);
    if (onIt) { st.press(); st.idle = 0; } else if (st.on) st.idle += dt;
    if (st.on && !stay && st.idle > backT && !(grp?.done)) st.release();
    const target = st.on ? 1 : 0;
    const k0 = st.k;
    if (st.k !== target) st.k = target > st.k ? Math.min(target, st.k + (speed / riseH) * dt) : Math.max(target, st.k - (speed / riseH) * dt);
    const dy = (st.k - k0) * riseH;
    mover.dy = dy; mover.vy = dt > 0 ? dy / dt : 0;
    if (dy) { shape.y1 = st.top(); level.world.update(id); }
  });
  if (spec.tap !== false) {
    tapTargets(level).add({
      owner: st, reach: spec.reach ?? 3,
      box: () => ({ min: [p.x - 0.8, p.y, p.z - 0.8], max: [p.x + 0.8, st.top(), p.z + 0.8] }),
      enabled: () => !st.on,
      onTap: () => st.press(),
    });
  }
  modelObject(level, 'taststein', { rise: riseH }, p.x, p.y, p.z, 0, () => ({ anim: st.on ? 'on' : 'off', rise: st.k }));
  return st;
}

export function buildTaststeine(level, spec) {
  const handle = stoneGroup(level, spec.id ?? `taststeine:${level.named.size}`, spec);
  handle.order = !!spec.order;
  for (const s of spec.stones ?? []) buildTaststein(level, { tap: spec.tap, reach: spec.reach, ...s }, { handle, speed: spec.speed, stay: spec.stay });
  return handle;
}

// ------------------------------------------------------------------ Propellerplattform

export function buildPropeller(level, spec) {
  const p = v3(spec.pos);
  const sz = Array.isArray(spec.size) ? spec.size : [spec.size ?? 3, spec.size ?? 3];
  const thick = spec.thick ?? 0.4;
  const mode = spec.mode ?? 'sink';
  const bx = new MovingBox(level, p.x, p.y, p.z, sz[0], thick, sz[1], { tag: 'propellerplattform' });
  const h = { box: bx, offset: 0, vel: 0, running: !spec.idle, spin: 16, mode };
  h.start = () => { h.running = true; };
  h.stop = () => { h.running = false; };
  let pm = null;
  if (mode === 'path' && spec.path?.length) pm = new PathMover(spec.path, { speed: spec.speed ?? 2, wait: spec.wait ?? 0.8, mode: spec.loop ? 'loop' : 'pingpong', phase: spec.phase ?? 0 });
  const bob = spec.bob ?? 0.06;
  let t = (p.x * 0.37 + p.z * 0.19) % 6.28;
  if (spec.id) level.named.set(spec.id, h);
  level.onStep((dt) => {
    t += dt;
    const on = bx.carries(level.player);
    let base = { x: p.x, y: p.y, z: p.z };
    if (mode === 'path' && pm) {
      if (h.running) pm.step(dt);
      base = { x: pm.pos.x, y: pm.pos.y, z: pm.pos.z };
      h.spin = 18;
    } else if (mode === 'sink') {
      const drop = spec.drop ?? 6;
      if (on) h.offset = Math.max(-drop, h.offset - (spec.sink ?? 0.8) * dt);
      else h.offset = Math.min(0, h.offset + (spec.back ?? 1.2) * dt);
      h.spin = on ? 9 : 16;
    } else if (mode === 'rise') {
      const height = spec.height ?? 6;
      if (on) h.offset = Math.min(height, h.offset + (spec.climb ?? 1.6) * dt);
      else h.offset = Math.max(0, h.offset - (spec.back ?? 1.2) * dt);
      h.spin = on ? 24 : 16;
    }
    // Wippen nur im Ruhezustand (weich ein-/ausgeblendet)
    const calm = mode === 'float' || mode === 'path' || (Math.abs(h.offset) < 0.01 && !on);
    h.bobK = Math.max(0, Math.min(1, (h.bobK ?? 1) + (calm ? dt : -dt) * 2));
    const by = Math.sin(t * 1.7) * bob * h.bobK;
    bx.moveTo(base.x, base.y + h.offset + by, base.z, dt);
  });
  modelObject(level, 'propellerplattform', { size: sz, thick }, p.x, p.y, p.z, 0, () => ({ spin: h.spin }),
    (root) => root.position.set(bx.pos.x, bx.pos.y, bx.pos.z));
  return h;
}

// ------------------------------------------------------------------ Antipp-Plattform

export function buildAntipp(level, spec) {
  const p = v3(spec.pos), s = sz3(spec.size, [2.5, 0.5, 2.5]);
  const mode = spec.mode ?? 'appear';
  const len = spec.length ?? 3;
  const speed = spec.speed ?? 6;
  const time = spec.time ?? 0;
  let d = spec.dir ?? (mode === 'lift' ? [0, 1, 0] : [1, 0]);
  d = d.length === 3 ? { x: d[0], y: d[1], z: d[2] } : { x: d[0], y: 0, z: d[1] };
  const dl = Math.hypot(d.x, d.y, d.z) || 1; d.x /= dl; d.y /= dl; d.z /= dl;
  const appear = mode === 'appear';
  const bx = new MovingBox(level, p.x, p.y, p.z, s.x, s.y, s.z, { tag: 'antipp', solid: !appear });
  const h = { state: 'off', k: 0, t: 0, box: bx, pop: 0, blink: false };
  h.tap = (via) => {
    if (h.state === 'off') {
      h.state = appear ? 'on' : 'out';
      h.t = 0;
      if (appear) { bx.setSolid(true); h.pop = 0; }
      level.sfx('switch');
      level.effects?.sparks({ x: bx.pos.x, y: bx.top, z: bx.pos.z }, 10);
      runAction(level, spec.onTap, { pos: [bx.pos.x, bx.top, bx.pos.z], source: h, via });
    } else if (spec.toggle) h.retract();
  };
  h.retract = () => {
    if (appear) { h.state = 'off'; bx.setSolid(false); level.sfx('vanish'); }
    else { h.state = 'back'; level.sfx('vanish'); }
  };
  h.reset = () => { h.k = 0; h.state = 'off'; if (appear) bx.setSolid(false); bx.moveTo(p.x, p.y, p.z, 0); };
  if (spec.id) level.named.set(spec.id, h);
  level.onStep((dt) => {
    h.t += dt;
    if (appear) {
      h.blink = h.state === 'on' && time > 0 && h.t > time - 1.5;
      if (h.state === 'on' && time > 0 && h.t >= time) h.retract();
      bx.still();
      return;
    }
    const k0 = h.k;
    if (h.state === 'out') {
      h.k = Math.min(1, h.k + (speed / len) * dt);
      if (h.k >= 1 && time > 0 && h.t >= time + len / speed) h.state = 'back';
    } else if (h.state === 'back') {
      h.k = Math.max(0, h.k - (speed / len) * dt * 0.6);
      if (h.k <= 0) h.state = 'off';
    }
    h.blink = h.state === 'out' && time > 0 && h.t > time + len / speed - 1.2;
    if (h.k !== k0 || bx.mover.dx || bx.mover.dy || bx.mover.dz) bx.moveTo(p.x + d.x * len * h.k, p.y + d.y * len * h.k, p.z + d.z * len * h.k, dt);
  });
  tapTargets(level).add({
    owner: h, reach: spec.reach ?? 4.5,
    box: () => ({ min: [bx.pos.x - s.x / 2, bx.pos.y, bx.pos.z - s.z / 2], max: [bx.pos.x + s.x / 2, bx.pos.y + s.y, bx.pos.z + s.z / 2] }),
    enabled: () => h.state === 'off' || (!!spec.toggle && (h.state === 'on' || h.state === 'out')),
    onTap: (via) => h.tap(via),
  });
  if (level.view) {
    const col = hex(spec.color ?? 'cyan', 0x40d8f0);
    const parts = [box(s.x, s.y, s.z, 0, s.y / 2, 0, col, { r: Math.min(0.14, s.y * 0.3), topColor: 0xe8fbff })];
    // Hand-Symbol: weißer Kreis mit Punkt auf der Oberseite
    const ring = new THREE.RingGeometry(Math.min(s.x, s.z) * 0.22, Math.min(s.x, s.z) * 0.3, 24).rotateX(-Math.PI / 2).toNonIndexed();
    ring.translate(0, s.y + 0.012, 0);
    const dot = new THREE.CircleGeometry(Math.min(s.x, s.z) * 0.1, 16).rotateX(-Math.PI / 2).toNonIndexed();
    dot.translate(0, s.y + 0.012, 0);
    for (const g of [ring, dot]) {
      const n = g.attributes.position.count, c = new Float32Array(n * 3).fill(1);
      g.setAttribute('color', new THREE.BufferAttribute(c, 3));
      g.deleteAttribute('uv');
    }
    const mesh = new THREE.Mesh(merge(parts.concat([ring, dot])), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, emissive: 0x0a3a44 }));
    mesh.castShadow = true; mesh.receiveShadow = true;
    const ghost = new THREE.Mesh(new THREE.BoxGeometry(s.x, s.y, s.z), new THREE.MeshBasicMaterial({ color: 0x9af0ff, transparent: true, opacity: 0.25, depthWrite: false }));
    ghost.renderOrder = 2;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(s.x, s.y, s.z)), new THREE.LineBasicMaterial({ color: 0xe8ffff, transparent: true, opacity: 0.8 }));
    ghost.add(edges);
    const grp = new THREE.Group();
    grp.add(mesh, ghost);
    grp.position.set(p.x, p.y, p.z);
    ghost.position.y = s.y / 2;
    addObject(level, grp, (dt, tt) => {
      dt = visDt(level, h, dt);
      grp.position.set(bx.pos.x, bx.pos.y, bx.pos.z);
      const shown = !appear || h.state === 'on';
      if (shown) h.pop = Math.min(1, h.pop + dt * 4); else h.pop = 0;
      const k = !appear ? 1 : h.pop < 1 ? Math.max(0.05, Math.sin(h.pop * Math.PI * 0.5) + Math.sin(h.pop * Math.PI) * 0.15) : 1;
      mesh.scale.setScalar(k);
      mesh.visible = shown && !(h.blink && Math.floor(tt * 10) % 2 === 0);
      ghost.visible = appear && !shown;
      ghost.material.opacity = 0.18 + Math.max(0, Math.sin(tt * 3)) * 0.12;
    });
  }
  return h;
}

export const TYPES = {
  taststein: (level, spec) => buildTaststein(level, spec),
  taststeine: buildTaststeine,
  propellerplattform: buildPropeller,
  antipp: buildAntipp,
};
