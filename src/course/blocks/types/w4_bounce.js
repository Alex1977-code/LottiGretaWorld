// Trampoline Welt 4 (4-4 „Bergwiese“, „Riesentrampolin-Fahrt“).
//
// riesentrampolin – großes, federndes Trampolin, das einen Pfad durch den Himmel fliegt. Startet beim ersten
//   Draufspringen (oder sofort/auf Signal); die Figur federt darauf (gehaltene Sprungtaste ×1,15 wie beim Trampolin,
//   **getimtes Drücken** kurz vor der Landung ×boost), in der Luft fährt sie mit dem Trampolin mit (bleibt über der
//   Matte, eigene Steuerung relativ dazu). Gegner/Gegenstände stehen darauf und werden getragen (Flag mover).
//   { type: 'riesentrampolin', id, pos: [x, y, z] (Fußpunkt der Mitte; ohne path = Start), size: 6 (Durchmesser),
//     height: 0.9 (Matte über pos), strength: 15 (m/s ≈ 4,5 m), boost: 1.4 (getimt), path: [[x, y, z], …] (Wegpunkte,
//     weich verbunden; erster = Start), speed: 4 (m/s), mode: 'once' | 'loop' | 'pingpong', wait: 1 (s an den Enden),
//     start: 'bounce' | 'auto' | 'signal' ({ start: id }), reset: true (nach dem Tod der Figur zurück an den Start),
//     carry: true (in der Luft mitfahren), carryR: size/2 + 1.5 }
//   Laufzeit: level.named.get(id) = { pos, s, L, running, done, bounces, riders, start(), stop(), reset(), info() }.
// trampolin_orange – starke Federplattform (Sprunghöhe je Stärke), auch schräg (schleudert dann in Richtung dir).
//   { type: 'trampolin_orange', id, pos (Fußpunkt), size: 1.8 (Durchmesser), strength: 21 (m/s) | height: m (gewünschte
//     Sprunghöhe, rechnet strength), angle: 0 (Neigung der Matte in Grad, 0–60), dir: [0, -1] (Schleuderrichtung bei
//     Neigung), boost: 1.3 (getimtes Drücken) }
// Modelle: 'riesentrampolin' ({ size }, state { squash, speed }), 'trampolin_orange' ({ size }, state { squash, angle });
// bis es sie gibt: eigene Geometrie (Rahmen mit Streifen, Matte, Propeller bzw. orange Feder-Pauke).

import * as THREE from 'three';
import { v3, lin, mixc, smooth, colorize, merge, hex, addObject } from '../kit.js';
import { smoothPath } from '../w4kit.js';
import { visDt } from '../../entities/gimmick.js';
import { hasModel, getModel } from '../../models/index.js';

const G_UP = 27;   // Steig-Schwerkraft nach dem Abprall (Motor: enterAir('bounce', false) → gUp)

/** Getimtes Drücken: Sprung kurz vor der Landung gedrückt (Puffer des Motors) bzw. gerade gedrückt. */
function timed(p) { return (p.buffer ?? 0) > 0 || !!p.input?.jumpPressed; }

// ------------------------------------------------------------------ Riesentrampolin

function bigTrampolineModel(size) {
  const r = size / 2;
  const root = new THREE.Group();
  const red = lin(0xff4a3d), white = lin(0xfff6ee), dark = lin(0x8a1d16), gold = lin(0xffd23d), blue = lin(0x2e7bff), blueL = lin(0x8ac8ff);
  // Unterbau: Pauke mit Streifen, Goldrand
  const skirt = new THREE.CylinderGeometry(r * 0.98, r * 0.86, 0.62, 40, 1, true);
  skirt.translate(0, 0.31, 0);
  const sk = colorize(skirt, (p, n, o) => {
    const st = Math.floor((Math.atan2(p.z, p.x) / (Math.PI * 2)) * 16 + 16) % 2;
    mixc(st ? red : white, dark, smooth(0.3, 0, p.y) * 0.4, o);
  });
  const bottom = new THREE.CircleGeometry(r * 0.86, 32);
  bottom.rotateX(Math.PI / 2);
  const bt = colorize(bottom, (p, n, o) => mixc(dark, red, 0.3, o));
  const ring = new THREE.TorusGeometry(r * 0.95, 0.2, 8, 40);
  ring.rotateX(Math.PI / 2);
  ring.translate(0, 0.66, 0);
  const rg = colorize(ring, (p, n, o) => {
    const st = Math.floor((Math.atan2(p.z, p.x) / (Math.PI * 2)) * 24 + 24) % 2;
    mixc(st ? gold : white, white, smooth(0.2, 0.9, n.y) * 0.4, o);
  });
  const body = new THREE.Mesh(merge([sk, bt, rg]), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }));
  body.castShadow = true; body.receiveShadow = true;
  root.add(body);
  // Matte: helle und dunkle blaue Ringe, goldener Stern in der Mitte (eigene, leicht erhabene Form)
  const matG = new THREE.RingGeometry(0.001, r * 0.84, 40, 6);
  matG.rotateX(-Math.PI / 2);
  const ringCol = new Float32Array(matG.attributes.position.count * 3);
  const mp = matG.attributes.position;
  for (let i = 0; i < mp.count; i++) {
    const d = Math.hypot(mp.getX(i), mp.getZ(i)) / (r * 0.84);
    const k = Math.round(d * 6) % 2 ? 0.55 : 0;
    const o = mixc(blue, blueL, k, [0, 0, 0]);
    ringCol[i * 3] = o[0]; ringCol[i * 3 + 1] = o[1]; ringCol[i * 3 + 2] = o[2];
  }
  matG.setAttribute('color', new THREE.BufferAttribute(ringCol, 3));
  const sh = new THREE.Shape();
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI / 2 + (i / 10) * Math.PI * 2, rr = (i % 2 ? 0.42 : 1) * r * 0.36;
    if (i === 0) sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  const starG = new THREE.ShapeGeometry(sh);
  starG.rotateX(-Math.PI / 2);
  starG.translate(0, 0.012, 0);
  const sg = colorize(starG, (p, n, o) => { o[0] = gold[0]; o[1] = gold[1]; o[2] = gold[2]; });
  matG.deleteAttribute('uv');
  const mat = new THREE.Mesh(merge([matG.toNonIndexed(), sg]), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }));
  mat.position.y = 0.62;
  mat.receiveShadow = true;
  root.add(mat);
  // Propeller unter dem Rand (vier Stück)
  const props = [];
  const hubG = new THREE.CylinderGeometry(0.16, 0.22, 0.35, 10);
  const bladeG = new THREE.BoxGeometry(1.5, 0.04, 0.22);
  const pm = new THREE.MeshStandardMaterial({ color: 0x5a6070, roughness: 0.4, metalness: 0.5 });
  const bm = new THREE.MeshStandardMaterial({ color: 0xfff6ee, roughness: 0.5 });
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const g = new THREE.Group();
    g.position.set(Math.cos(a) * r * 0.62, -0.18, Math.sin(a) * r * 0.62);
    const hub = new THREE.Mesh(hubG, pm);
    const blades = new THREE.Group();
    blades.position.y = -0.2;
    for (let k = 0; k < 2; k++) { const b = new THREE.Mesh(bladeG, bm); b.rotation.y = k * Math.PI / 2; blades.add(b); }
    g.add(hub, blades);
    root.add(g);
    props.push(blades);
  }
  return {
    root,
    update(dt, st) {
      const s = st.squash ?? 0;
      mat.position.y = 0.62 - s * 0.28;
      body.scale.set(1 + s * 0.04, 1 - s * 0.1, 1 + s * 0.04);
      const spin = 10 + (st.speed ?? 0) * 3;
      for (const b of props) b.rotation.y += spin * dt;
    },
    dispose() { body.geometry.dispose(); mat.geometry.dispose(); hubG.dispose(); bladeG.dispose(); pm.dispose(); bm.dispose(); },
  };
}

export function buildRiesentrampolin(level, spec) {
  const size = spec.size ?? 6, r = size / 2, H = spec.height ?? 0.9;
  const strength = spec.strength ?? 15, boost = spec.boost ?? 1.4;
  const pts = spec.path ?? [spec.pos ?? [0, 0, 0]];
  const path = smoothPath(pts);
  const speed = spec.speed ?? 4, mode = spec.mode ?? 'once', wait = spec.wait ?? 1;
  const startMode = spec.start ?? 'bounce';
  const carryR = spec.carryR ?? r + 1.5;
  const pos = path.at(0);
  const st = { s: 0, dir: 1, pause: 0, running: startMode === 'auto', done: false, bounces: 0, squash: 0, speedNow: 0 };
  const mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: pos.x, cz: pos.z };
  const riders = new Set();
  const owner = {
    onBounce(p) {
      st.squash = 1;
      st.bounces++;
      if (!st.running && !st.done && startMode === 'bounce') st.running = true;
      if (timed(p)) {
        p.vel.y = strength * boost;
        p.buffer = 0;
        level.effects?.ring({ x: p.pos.x, y: p.pos.y, z: p.pos.z }, 1.6);
        level.sfx('jump3');
      }
      if (spec.carry !== false) riders.add(p);
    },
  };
  const shape = { type: 'cyl', x: pos.x, z: pos.z, r, y0: pos.y, y1: pos.y + H, bounce: strength, mover, owner, tag: 'riesentrampolin' };
  const sid = level.world.add(shape);
  const np = new THREE.Vector3();
  let wasDead = false;
  const handle = {
    get pos() { return pos; }, get s() { return st.s; }, L: path.L, get running() { return st.running; }, get done() { return st.done; },
    get bounces() { return st.bounces; }, riders, shape,
    start() { if (!st.done) st.running = true; }, stop() { st.running = false; },
    reset() { st.s = 0; st.dir = 1; st.pause = 0; st.running = startMode === 'auto'; st.done = false; riders.clear(); place(path.at(0, np), 0); },
    info: () => ({ x: +pos.x.toFixed(3), y: +pos.y.toFixed(3), z: +pos.z.toFixed(3), s: +st.s.toFixed(3), L: +path.L.toFixed(3), running: st.running, done: st.done, bounces: st.bounces, riders: riders.size }),
  };
  if (spec.id) level.named.set(spec.id, handle);
  function place(q, dt) {
    mover.dx = q.x - pos.x; mover.dy = q.y - pos.y; mover.dz = q.z - pos.z;
    const k = dt > 0 ? 1 / dt : 0;
    mover.vx = mover.dx * k; mover.vy = mover.dy * k; mover.vz = mover.dz * k;
    pos.copy(q);
    mover.cx = pos.x; mover.cz = pos.z;
    shape.x = pos.x; shape.z = pos.z; shape.y0 = pos.y; shape.y1 = pos.y + H;
    level.world.update(sid);
  }
  level.onStep((dt) => {
    // Neustart nach dem Tod der Figur: zurück an den Start
    const dead = !!level.player?.dead;
    if (wasDead && !dead && spec.reset !== false && (st.running || st.done || st.s > 0)) handle.reset();
    wasDead = dead;
    let ns = st.s;
    if (st.running && path.L > 0) {
      if (st.pause > 0) st.pause -= dt;
      else if (mode === 'loop') ns = (st.s + speed * dt) % path.L;
      else {
        ns = st.s + speed * dt * st.dir;
        if (ns >= path.L) {
          ns = path.L;
          if (mode === 'once') { st.running = false; st.done = true; } else { st.dir = -1; st.pause = wait; }
        } else if (ns <= 0) { ns = 0; st.dir = 1; st.pause = wait; }
      }
    }
    st.speedNow = Math.abs(ns - st.s) / dt;
    st.s = ns;
    place(path.at(st.s, np), dt);
    // Figuren in der Luft über der Matte fahren mit (sonst fiele sie beim Federn zurück)
    for (const p of riders) {
      if (p.dead || p.removedFigure || p.mode === 'script') { riders.delete(p); continue; }
      if (p.mode !== 'air') { if (p.ground !== shape) riders.delete(p); continue; }
      const dx = p.pos.x - pos.x, dz = p.pos.z - pos.z;
      if (dx * dx + dz * dz > carryR * carryR || p.pos.y < pos.y - 1) { riders.delete(p); continue; }
      p.pos.x += mover.dx; p.pos.y += Math.max(0, mover.dy); p.pos.z += mover.dz;
    }
  });
  // Darstellung
  if (level.view) {
    const m = hasModel('riesentrampolin') ? getModel('riesentrampolin', { size }) : bigTrampolineModel(size);
    m.root.position.copy(pos);
    const holder = {};
    addObject(level, m.root, (dt) => {
      const d = visDt(level, holder, dt);
      st.squash = Math.max(0, st.squash - d * 3.2);
      const sq = Math.sin(st.squash * Math.PI) * st.squash;
      m.root.position.copy(pos);
      m.update?.(d, { squash: sq, speed: st.speedNow, moving: st.running });
    });
  }
  return handle;
}

// ------------------------------------------------------------------ Oranges Trampolin

function orangeModel(size) {
  const r = size / 2;
  const root = new THREE.Group();
  const tilt = new THREE.Group();
  root.add(tilt);
  const orange = lin(0xff8a1e), orangeD = lin(0xc24e08), cream = lin(0xfff2d8), black = lin(0x2a2228), steel = lin(0xb8bcc8);
  // Sockel und Feder
  const base = new THREE.CylinderGeometry(r * 0.7, r * 0.8, 0.14, 20);
  base.translate(0, 0.07, 0);
  const coil = new THREE.TorusGeometry(r * 0.42, 0.06, 6, 18);
  const coils = [];
  for (let i = 0; i < 3; i++) { const c = coil.clone(); c.rotateX(Math.PI / 2); c.translate(0, 0.2 + i * 0.13, 0); coils.push(colorize(c, (p, n, o) => mixc(steel, lin(0xffffff), smooth(-0.2, 0.9, n.y) * 0.5, o))); }
  coil.dispose();
  const lower = new THREE.Mesh(merge([colorize(base, (p, n, o) => mixc(black, steel, 0.2, o)), ...coils]), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.4 }));
  lower.castShadow = true;
  root.add(lower);
  // Pauke (dreht mit der Neigung): orange mit Creme-Streifen, schwarzer Rand, cremefarbene Matte mit orangem Ring
  const drum = new THREE.CylinderGeometry(r, r * 0.92, 0.3, 28, 1, true);
  drum.translate(0, 0.15, 0);
  const dg = colorize(drum, (p, n, o) => {
    const st = Math.floor((Math.atan2(p.z, p.x) / (Math.PI * 2)) * 10 + 10) % 2;
    mixc(st ? orange : cream, orangeD, smooth(0.15, 0, p.y) * 0.5, o);
  });
  const rim = new THREE.TorusGeometry(r * 0.96, 0.08, 6, 28);
  rim.rotateX(Math.PI / 2); rim.translate(0, 0.3, 0);
  const rimG = colorize(rim, (p, n, o) => mixc(black, lin(0x5a4a50), smooth(0, 1, n.y) * 0.5, o));
  const top = new THREE.CircleGeometry(r * 0.9, 28);
  top.rotateX(-Math.PI / 2); top.translate(0, 0.28, 0);
  const tg = colorize(top, (p, n, o) => { const d = Math.hypot(p.x, p.z) / (r * 0.9); mixc(cream, orange, d > 0.62 && d < 0.8 ? 1 : d < 0.22 ? 0.85 : 0, o); });
  const drumMesh = new THREE.Mesh(merge([dg, rimG, tg]), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 }));
  drumMesh.castShadow = true; drumMesh.receiveShadow = true;
  drumMesh.position.y = 0.55;
  tilt.add(drumMesh);
  return {
    root,
    update(dt, st) {
      const s = st.squash ?? 0;
      drumMesh.position.y = 0.55 - s * 0.16;
      lower.scale.y = 1 - s * 0.25;
      tilt.rotation.set(st.tiltX ?? 0, 0, st.tiltZ ?? 0);
    },
    dispose() { lower.geometry.dispose(); drumMesh.geometry.dispose(); },
  };
}

export function buildTrampolinOrange(level, spec) {
  const p = v3(spec.pos);
  const size = spec.size ?? 1.8, r = size / 2;
  const H = 0.88;
  const strength = spec.height ? Math.sqrt(2 * G_UP * spec.height) * 0.94 : (spec.strength ?? 21);
  const ang = Math.max(0, Math.min(60, spec.angle ?? 0)) * Math.PI / 180;
  const d = spec.dir ?? [0, -1], dl = Math.hypot(d[0], d[1]) || 1;
  const dx = d[0] / dl, dz = d[1] / dl;
  const vUp = strength * Math.cos(ang), vSide = strength * Math.sin(ang);
  const boost = spec.boost ?? 1.3;
  const st = { squash: 0, bounces: 0 };
  const owner = {
    onBounce(pl) {
      st.squash = 1;
      st.bounces++;
      let k = pl.vel.y / Math.max(1e-6, vUp);
      if (timed(pl)) { k = Math.max(k, boost); pl.vel.y = vUp * k; pl.buffer = 0; level.sfx('jump3'); }
      if (vSide > 0.01) {
        pl.vel.x = dx * vSide * k; pl.vel.z = dz * vSide * k;
        pl.airMax = Math.max(pl.airMax ?? 0, vSide * k);
        pl.yaw = Math.atan2(-dz, dx);
      }
      level.effects?.dust(pl.pos, 4);
    },
  };
  level.world.add({ type: 'cyl', x: p.x, z: p.z, r, y0: p.y, y1: p.y + H, bounce: vUp, owner, tag: 'trampolin_orange' });
  const handle = { strength, vUp, vSide, get bounces() { return st.bounces; } };
  if (spec.id) level.named.set(spec.id, handle);
  if (level.view) {
    const m = hasModel('trampolin_orange') ? getModel('trampolin_orange', { size }) : orangeModel(size);
    m.root.position.set(p.x, p.y, p.z);
    // Neigung: Matte kippt zur Schleuderrichtung (Drehachse quer dazu)
    const tiltX = ang * dz, tiltZ = -ang * dx;
    const holder = {};
    addObject(level, m.root, (dt) => {
      const dd = visDt(level, holder, dt);
      st.squash = Math.max(0, st.squash - dd * 4);
      m.update?.(dd, { squash: Math.sin(st.squash * Math.PI) * st.squash, angle: ang, tiltX, tiltZ, dir: [dx, dz] });
    });
    m.update?.(0, { squash: 0, angle: ang, tiltX, tiltZ, dir: [dx, dz] });
  }
  return handle;
}

export const TYPES = { riesentrampolin: buildRiesentrampolin, trampolin_orange: buildTrampolinOrange };
