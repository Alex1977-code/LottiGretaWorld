// Welt-3-Bausteine Spukhaus (Bauplan 3-3 „Spukhaus, verschiebbare Treppen“, „Sofa am Flurende fährt als Lift“,
// „Warp-Box hinter dem Gemälde → Drehraum mit Kreisgeistern“). Regal, Gemälde, falscher Zielmast und Spuk-Tür sind
// Entitäten (entities/kinds/w3_gimmicks.js).
//
// spuk_treppe – verschiebbare Holztreppe (Modell 'spuk_treppe'): steigt nach lokal +X an (yaw im 90°-Raster), fährt
//   bei Annäherung, per Signal oder im Takt von der Versteck-Lage (`from`, z. B. in der Wand) an ihren Platz `pos`.
//   { type: 'spuk_treppe', pos (Mitte der unteren Vorderkante am Ziel), yaw: 0, steps: 4, width: 2, rise: 0.5, run: 0.6,
//     from: [dx, dy, dz] (Versatz der Versteck-Lage, Standard [0, 0, −3]), mode: 'near' (Standard, Figur in near m) |
//     'signal' ({ open|start|toggle: id }) | 'shift' (pendelt alle period s zwischen beiden Lagen), near: 5, speed: 2,
//     period: 3, back: 0 (s ohne Figur in der Nähe → zurück; 0 = bleibt), out: false (beginnt am Ziel), id }
//   level.named.get(id) = { k (0 = Versteck … 1 = Ziel), out, open(), close(), toggle(), start() }
//
// spuk_sofa – schwebendes Sofa als Lift (Modell 'spuk_sofa', Sitz 0,75 m, Lehne lokal −X): steht eine Figur darauf,
//   hebt es nach `delay` s ab und schwebt `rise` m hoch (bzw. den `path` entlang), oben wartet es; ohne Figur sinkt es
//   nach `back` s wieder.
//   { type: 'spuk_sofa', pos (Mitte der Unterseite), yaw: −π/2 (Lehne hinten), rise: 4, path: [[x, y, z], …],
//     speed: 1.6, delay: 0.4, back: 2.5 (0 = bleibt oben), id }   level.named.get(id) = { k, y, state, box }
//
// kronleuchter – schwingender Kronleuchter als Plattform (Modell 'kronleuchter', Ursprung = Aufhängung an der Decke):
//   pendelt um die Aufhängung (amp rad, period s) entlang `axis`; der Ring trägt (Zylinder, Figur schwingt mit).
//   { type: 'kronleuchter', pos (Aufhängung), chain: 1.2, scale: 1.6, axis: 'x' | 'z', amp: 0.35, period: 3.2,
//     phase: 0, light: true, id }
//
// drehraum – Drehraum (3-3 Stern 1): quadratischer Raum, der sich in Vierteldrehungen um seine Längsachse (z) dreht –
//   Boden wird Wand, Wand wird Decke. Die Hülle ist im Querschnitt quadratisch (Kollision gleich), die Einbauten
//   (`parts`, Querschnitt-Lage x/y) drehen mit: während der Drehung sind sie nicht fest, danach fest an ihrer neuen
//   Lage (eine darin steckende Figur wird hinaufgeschoben). Vorderseite (+z) offen für die Kamera (unsichtbare Wand).
//   { type: 'drehraum', id, pos: [x, y, z] (Mitte des Bodens), size: [s (Querschnitt), länge z] ([12, 16]),
//     parts: [{ pos: [x, y] (Mitte unten im Querschnitt, x −s/2…s/2, y 0…s), size: [w, h], z: [z0, z1] (lokal,
//     Standard ganze Länge), color }], period: 4 (s Pause), turn: 1.4 (s Drehung), dir: 1 (+1 gegen den Uhrzeigersinn
//     von vorn), auto: true (dreht im Takt, sobald eine Figur im Raum ist) | false (nur per Signal start/toggle),
//     back: true (Rückwand), wall: 'tapete' }
//   level.named.get(id) = { quarter (0..3), turning, turns, angle, start(), stop(), toggle(), turnNow() }

import * as THREE from 'three';
import { v3, box, merge, lin, mixc, colorize, hex, addObject } from '../kit.js';
import { MovingBox, figures, modelObject, rotXZ, snapYaw } from '../w3kit.js';
import { visDt } from '../../entities/gimmick.js';

import { PathMover } from '../../level/PathMover.js';

// ------------------------------------------------------------------ Verschiebbare Treppe

export function buildSpukTreppe(level, spec) {
  const p = v3(spec.pos);
  const yaw = snapYaw(spec.yaw ?? 0);
  const n = Math.max(1, Math.round(spec.steps ?? 4)), W = spec.width ?? 2, rise = spec.rise ?? 0.5, run = spec.run ?? 0.6;
  const off = spec.from ?? [0, 0, -3];
  const speed = spec.speed ?? 2;
  const mode = spec.mode ?? 'near';
  const D = Math.hypot(off[0], off[1], off[2]) || 1;
  const st = { k: spec.out ? 1 : 0, out: !!spec.out, t: 0, away: 0, moving: false };
  // Stufen als bewegte Quader (lokal: x = i·run … (i+1)·run, Höhe (i+1)·rise)
  const steps = [];
  for (let i = 0; i < n; i++) {
    const c = rotXZ((i + 0.5) * run, 0, yaw);
    const alongX = Math.abs(Math.cos(yaw)) > 0.5;
    steps.push({ dx: c.x, dz: c.z, bx: new MovingBox(level, p.x + c.x, p.y, p.z + c.z, alongX ? run : W, (i + 1) * rise + 0.08, alongX ? W : run, { tag: 'spuk_treppe' }) });
  }
  const where = (k) => ({ x: p.x + off[0] * (1 - k), y: p.y + off[1] * (1 - k), z: p.z + off[2] * (1 - k) });
  const place = (dt) => {
    const w = where(st.k);
    for (const s of steps) s.bx.moveTo(w.x + s.dx, w.y, w.z + s.dz, dt);
  };
  place(0);
  for (const s of steps) s.bx.still();
  st.open = () => { st.out = true; };
  st.close = () => { st.out = false; };
  st.toggle = () => { st.out = !st.out; };
  st.start = st.open;
  st.stop = st.close;
  if (spec.id) level.named.set(spec.id, st);
  const hx = p.x + rotXZ(n * run / 2, 0, yaw).x, hz = p.z + rotXZ(n * run / 2, 0, yaw).z;
  level.onStep((dt) => {
    st.t += dt;
    if (mode === 'near') {
      let near = false;
      for (const f of figures(level)) if (Math.hypot(f.pos.x - hx, f.pos.z - hz) < (spec.near ?? 5) && Math.abs(f.pos.y - p.y) < 4) near = true;
      if (near) { st.out = true; st.away = 0; } else if (spec.back > 0) { st.away += dt; if (st.away > spec.back) st.out = false; }
    } else if (mode === 'shift') {
      const per = spec.period ?? 3;
      st.out = Math.floor(st.t / per) % 2 === (spec.out ? 0 : 1);
    }
    const target = st.out ? 1 : 0;
    const k0 = st.k;
    if (st.k !== target) st.k = target > st.k ? Math.min(1, st.k + (speed / D) * dt) : Math.max(0, st.k - (speed / D) * dt);
    st.moving = st.k !== k0;
    if (st.moving) { place(dt); if (k0 === 0 || k0 === 1) level.sfx('step'); }
    else for (const s of steps) s.bx.still();
  });
  if (level.view) {
    const w0 = where(st.k);
    modelObject(level, 'spuk_treppe', { steps: n, width: W, rise, run }, w0.x, w0.y, w0.z, yaw,
      () => ({ anim: st.moving ? 'move' : 'idle' }),
      (root) => { const w = where(st.k); root.position.set(w.x, w.y, w.z); });
  }
  return st;
}

// ------------------------------------------------------------------ Spuk-Sofa (Lift)

export function buildSpukSofa(level, spec) {
  const p = v3(spec.pos);
  const yaw = snapYaw(spec.yaw ?? -Math.PI / 2);
  const speed = spec.speed ?? 1.6;
  const rise = spec.rise ?? 4;
  const pm = spec.path?.length ? new PathMover([[p.x, p.y, p.z], ...spec.path], { speed, mode: 'pingpong', wait: 0 }) : null;
  const L = pm ? pm.length : rise;
  const ext = rotXZ(0.5, 1.12, yaw);
  const SX = Math.abs(ext.x) * 2, SZ = Math.abs(ext.z) * 2;
  const back = rotXZ(-0.38, 0, yaw), bext = rotXZ(0.16, 1.1, yaw);
  const seat = new MovingBox(level, p.x, p.y, p.z, SX, 0.75, SZ, { tag: 'spuk_sofa' });
  const rest = new MovingBox(level, p.x + back.x, p.y, p.z + back.z, Math.abs(bext.x) * 2, 1.22, Math.abs(bext.z) * 2, { tag: 'spuk_sofa:lehne' });
  const st = { s: 0, state: 'idle', t: 0, empty: 0, up: 0, pos: { x: p.x, y: p.y, z: p.z }, box: seat };
  Object.defineProperty(st, 'k', { get: () => st.s / L });
  Object.defineProperty(st, 'y', { get: () => st.pos.y });
  if (spec.id) level.named.set(spec.id, st);
  const at = (s) => {
    if (pm) { pm.at(s, st.pos); return st.pos; }
    st.pos.x = p.x; st.pos.y = p.y + s; st.pos.z = p.z;
    return st.pos;
  };
  const occupied = () => figures(level).some((f) => seat.carries(f) || rest.carries(f));
  level.onStep((dt) => {
    const on = occupied();
    st.t += dt;
    let v = 0;
    switch (st.state) {
      case 'idle': if (on) { if (st.t > (spec.delay ?? 0.4)) { st.state = 'up'; level.sfx('ghost'); } } else st.t = 0; break;
      case 'up': v = speed; if (st.s >= L) { st.state = 'top'; st.t = 0; } break;
      case 'top':
        if (on) st.empty = 0; else st.empty += dt;
        if ((spec.back ?? 2.5) > 0 && st.empty > (spec.back ?? 2.5)) { st.state = 'down'; st.empty = 0; }
        break;
      case 'down': v = -speed; if (on) st.state = 'up'; if (st.s <= 0) { st.state = 'idle'; st.t = 0; } break;
      default: break;
    }
    const s0 = st.s;
    st.s = Math.max(0, Math.min(L, st.s + v * dt));
    if (st.s !== s0) {
      const q = at(st.s);
      seat.moveTo(q.x, q.y, q.z, dt);
      rest.moveTo(q.x + back.x, q.y, q.z + back.z, dt);
    } else { seat.still(); rest.still(); }
  });
  if (level.view) {
    const holder = {};
    modelObject(level, 'spuk_sofa', {}, p.x, p.y, p.z, yaw,
      () => ({ anim: st.state === 'idle' && st.s === 0 && !occupied() ? 'idle' : 'float' }),
      (root, d) => {
        const dd = visDt(level, holder, d);
        const fl = !(st.state === 'idle' && st.s === 0);
        st.up += ((fl ? 1 : 0) - st.up) * Math.min(1, dd * 3);
        root.position.set(st.pos.x, st.pos.y - st.up * 0.25, st.pos.z);
      });
  }
  return st;
}

// ------------------------------------------------------------------ Kronleuchter (Pendel-Plattform)

export function buildKronleuchter(level, spec) {
  const p = v3(spec.pos);
  const chain = spec.chain ?? 1.2, S = spec.scale ?? 1.6;
  const D = S * (chain + 0.42);                // Aufhängung → Plattform-Oberkante
  const r = 0.78 * S;
  const amp = spec.amp ?? 0.35, per = spec.period ?? 3.2;
  const axX = spec.axis !== 'z';
  const mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: p.x, cz: p.z };
  const st = { theta: 0, x: p.x, y: p.y - D, z: p.z };
  const shape = { type: 'cyl', x: p.x, z: p.z, r, y0: p.y - D - 0.35, y1: p.y - D, mover, tag: 'kronleuchter' };
  const id = level.world.add(shape);
  if (spec.id) level.named.set(spec.id, st);
  const pose = (t) => {
    const th = amp * Math.sin((t / per) * Math.PI * 2 + (spec.phase ?? 0) * Math.PI * 2);
    return { th, x: p.x + (axX ? Math.sin(th) * D : 0), y: p.y - Math.cos(th) * D, z: p.z + (axX ? 0 : Math.sin(th) * D) };
  };
  const q0 = pose(0);
  st.x = q0.x; st.y = q0.y; st.z = q0.z; st.theta = q0.th;
  shape.x = q0.x; shape.z = q0.z; shape.y0 = q0.y - 0.35; shape.y1 = q0.y;
  level.world.update(id);
  level.onStep((dt, t) => {
    const q = pose(t);
    mover.dx = q.x - st.x; mover.dy = q.y - st.y; mover.dz = q.z - st.z;
    mover.vx = mover.dx / dt; mover.vy = mover.dy / dt; mover.vz = mover.dz / dt;
    mover.cx = q.x; mover.cz = q.z;
    st.x = q.x; st.y = q.y; st.z = q.z; st.theta = q.th;
    shape.x = q.x; shape.z = q.z; shape.y0 = q.y - 0.35; shape.y1 = q.y;
    level.world.update(id);
  });
  if (level.view) {
    modelObject(level, 'kronleuchter', { chain }, p.x, p.y, p.z, 0, () => ({ anim: spec.light === false ? 'off' : 'idle' }),
      (root) => {
        root.scale.setScalar(S);
        root.rotation.set(axX ? 0 : -st.theta, 0, axX ? st.theta : 0);
      });
  }
  return st;
}

// ------------------------------------------------------------------ Drehraum

function wallpaper(theme) {
  return { a: lin(theme === 'gruen' ? 0x2e5a4a : 0x4a2a6a), b: lin(theme === 'gruen' ? 0x3a6a58 : 0x5a3a7e), trim: lin(0xc89a3a), floor: lin(0x8a5a32), floor2: lin(0x7a4c2a) };
}

/** Hülle des Drehraums (lokal: Querschnitt x/y um die Achse, Mitte bei y = s/2; Länge entlang z). */
function roomShellGeo(s, len, opts) {
  const c = wallpaper(opts.wall);
  const parts = [];
  const t = 0.4;
  const plank = (g, horiz) => colorize(g, (pp, n, o) => {
    const u = horiz ? pp.x : pp.y;
    const k = Math.floor((u + 50) / 0.5) & 1;
    mixc(c.floor, c.floor2, k ? 0.7 : 0, o);
  });
  const paper = (g) => colorize(g, (pp, n, o) => {
    const k = Math.floor((pp.z + 50) / 0.8) & 1;
    mixc(c.a, c.b, k, o);
  });
  // Boden (Dielen) unten, Tapete an Wänden und Decke, Zierleisten an den Kanten
  const floor = new THREE.BoxGeometry(s + t * 2, t, len, 8, 1, 4); floor.translate(0, -s / 2 - t / 2, 0);
  parts.push(plank(floor.toNonIndexed(), true));
  const ceil = new THREE.BoxGeometry(s + t * 2, t, len, 1, 1, 4); ceil.translate(0, s / 2 + t / 2, 0);
  parts.push(paper(ceil.toNonIndexed()));
  for (const sx of [-1, 1]) {
    const w = new THREE.BoxGeometry(t, s, len, 1, 4, 4); w.translate(sx * (s / 2 + t / 2), 0, 0);
    parts.push(paper(w.toNonIndexed()));
  }
  if (opts.back !== false) {
    const b = new THREE.BoxGeometry(s + t * 2, s + t * 2, t); b.translate(0, 0, -len / 2 - t / 2);
    parts.push(paper(b.toNonIndexed()));
    // Rückwand: großes Spukauge-Rad (Kreis-Ornament), zeigt die Drehung
    const ring = new THREE.TorusGeometry(s * 0.3, 0.12, 6, 32); ring.translate(0, 0, -len / 2 + 0.05);
    parts.push(colorize(ring.toNonIndexed(), (pp, n, o) => { o[0] = c.trim[0]; o[1] = c.trim[1]; o[2] = c.trim[2]; }));
    const bar = new THREE.BoxGeometry(s * 0.56, 0.18, 0.1); bar.translate(0, 0, -len / 2 + 0.05);
    parts.push(colorize(bar.toNonIndexed(), (pp, n, o) => { o[0] = c.trim[0]; o[1] = c.trim[1]; o[2] = c.trim[2]; }));
  }
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const e = new THREE.BoxGeometry(0.22, 0.22, len); e.translate(sx * (s / 2 - 0.05), sy * (s / 2 - 0.05), 0);
    parts.push(colorize(e.toNonIndexed(), (pp, n, o) => { o[0] = c.trim[0]; o[1] = c.trim[1]; o[2] = c.trim[2]; }));
  }
  // Wandleuchter an der linken Wand (lokal), damit man die Drehung sieht
  for (let i = 0; i < 3; i++) {
    const z = -len / 2 + (i + 0.5) * (len / 3);
    const g = new THREE.SphereGeometry(0.22, 10, 8); g.translate(-s / 2 + 0.25, s * 0.15, z);
    parts.push(colorize(g.toNonIndexed(), (pp, n, o) => { o[0] = 1; o[1] = 0.85; o[2] = 0.45; }));
  }
  return merge(parts);
}

export function buildDrehraum(level, spec) {
  const p = v3(spec.pos);
  const sz = spec.size ?? [12, 16];
  const S = sz[0], len = sz[1];
  const cx = p.x, cy = p.y + S / 2, cz = p.z;          // Drehachse (Raummitte)
  const z0 = p.z - len / 2, z1 = p.z + len / 2;
  const T = 0.4;
  // Hülle: Boden, Decke, Wände, Rückwand, unsichtbare Vorderwand (Kamera sieht hindurch)
  const shell = [
    { min: [cx - S / 2 - T, p.y - T, z0], max: [cx + S / 2 + T, p.y, z1] },
    { min: [cx - S / 2 - T, p.y + S, z0], max: [cx + S / 2 + T, p.y + S + T, z1] },
    { min: [cx - S / 2 - T, p.y, z0], max: [cx - S / 2, p.y + S, z1] },
    { min: [cx + S / 2, p.y, z0], max: [cx + S / 2 + T, p.y + S, z1] },
  ];
  if (spec.back !== false) shell.push({ min: [cx - S / 2 - T, p.y - T, z0 - T], max: [cx + S / 2 + T, p.y + S + T, z0] });
  if (spec.front !== false) shell.push({ min: [cx - S / 2 - T, p.y - T, z1], max: [cx + S / 2 + T, p.y + S + T, z1 + T], camIgnore: true, noWallSlide: true });
  for (const b of shell) level.world.add({ type: 'box', ...b, tag: 'drehraum' });
  // Einbauten: lokaler Querschnitt (Mitte unten), Rechteck um die Achse gedreht (Viertel q)
  const parts = (spec.parts ?? []).map((pt) => {
    const [px, py] = pt.pos, [w, h] = pt.size ?? [2, 0.5];
    const lz = pt.z ?? [-len / 2, len / 2];
    return { x0: px - w / 2, x1: px + w / 2, y0: py - S / 2, y1: py + h - S / 2, z0: cz + lz[0], z1: cz + lz[1], color: pt.color, id: null };
  });
  const st = { quarter: 0, turning: false, turns: 0, angle: 0, t: 0, auto: spec.auto !== false, running: spec.auto !== false, turnT: 0 };
  const dir = spec.dir < 0 ? -1 : 1;
  const period = spec.period ?? 4, turnTime = spec.turn ?? 1.4;
  // Rechteck (x0..x1, y0..y1 relativ zur Achse) um q Vierteldrehungen (gegen den Uhrzeigersinn von vorn)
  const rot = (r, q) => {
    let { x0, x1, y0, y1 } = r;
    for (let i = 0; i < ((q % 4) + 4) % 4; i++) { const nx0 = -y1, nx1 = -y0, ny0 = x0, ny1 = x1; x0 = nx0; x1 = nx1; y0 = ny0; y1 = ny1; }
    return { x0, x1, y0, y1 };
  };
  const solidify = () => {
    for (const r of parts) {
      const q = rot(r, st.quarter * dir);
      const min = [cx + q.x0, cy + q.y0, r.z0], max = [cx + q.x1, cy + q.y1, r.z1];
      if (r.id) level.world.remove(r.id);
      r.id = level.world.add({ type: 'box', min, max, tag: 'drehraum:teil' });
      // eine Figur, die darin steckt, obendrauf setzen
      for (const f of figures(level)) {
        const c = f.pos;
        if (c.x + f.half.x > min[0] && c.x - f.half.x < max[0] && c.z + f.half.z > min[2] && c.z - f.half.z < max[2]
          && c.y + f.half.y * 2 > min[1] && c.y < max[1]) { f.pos.y = max[1] + 0.01; f.vel.y = 0; }
      }
    }
  };
  const unsolid = () => { for (const r of parts) { if (r.id) level.world.remove(r.id); r.id = null; } };
  solidify();
  const inside = () => figures(level).some((f) => Math.abs(f.pos.x - cx) < S / 2 && f.pos.y > p.y - 0.5 && f.pos.y < p.y + S && f.pos.z > z0 && f.pos.z < z1);
  st.turnNow = () => {
    if (st.turning) return;
    st.turning = true; st.turnT = 0;
    unsolid();
    level.sfx('ghost'); level.shake?.(0.2);
  };
  st.start = () => { st.running = true; st.t = period; };
  st.stop = () => { st.running = false; };
  st.toggle = () => { if (st.running && !st.auto) st.stop(); else st.turnNow(); };
  if (spec.id) level.named.set(spec.id, st);
  level.onStep((dt) => {
    if (st.turning) {
      st.turnT += dt;
      const k = Math.min(1, st.turnT / turnTime);
      st.angle = (st.quarter + k * k * (3 - 2 * k)) * (Math.PI / 2) * dir;
      if (k >= 1) {
        st.turning = false; st.quarter = (st.quarter + 1) % 4; st.turns++; st.t = 0;
        st.angle = st.quarter * (Math.PI / 2) * dir;
        solidify();
        level.sfx('land');
        level.shake?.(0.3);
      }
      return;
    }
    if (!st.running) return;
    if (st.auto && !inside()) { st.t = 0; return; }
    st.t += dt;
    if (st.t >= period) st.turnNow();
  });
  if (level.view) {
    const root = new THREE.Group();
    root.position.set(cx, cy, cz);
    const shellMesh = new THREE.Mesh(roomShellGeo(S, len, spec), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }));
    shellMesh.receiveShadow = true;
    root.add(shellMesh);
    const pg = [];
    for (const r of parts) {
      pg.push(box(r.x1 - r.x0, r.y1 - r.y0, r.z1 - r.z0, (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, (r.z0 + r.z1) / 2 - cz, hex(r.color, 0xc89a5a), { r: 0.08, topColor: 0xe8c890 }));
    }
    if (pg.length) {
      const pm = new THREE.Mesh(merge(pg), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }));
      pm.castShadow = true; pm.receiveShadow = true;
      root.add(pm);
    }
    addObject(level, root, () => { root.rotation.z = st.angle; });
  }
  return st;
}

export const TYPES = { spuk_treppe: buildSpukTreppe, spuk_sofa: buildSpukSofa, kronleuchter: buildKronleuchter, drehraum: buildDrehraum };
