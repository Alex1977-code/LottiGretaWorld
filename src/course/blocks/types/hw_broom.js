// Halloween-Baustein Besen-Plattform (H-4 Hexenturm): fliegende Hexenbesen mit Sitzbrett fliegen Bahnen und tragen die
// Figur (bewegte Plattform, mover wie `mover`). Sie wippen sanft (auch in der Kollision), neigen sich beim Steigen/Sinken
// und zur Seite der Figur, drehen sich an den Enden um (Besen zeigt in Flugrichtung) und ziehen Funkelsterne nach.
//
//   { type: 'besen_plattform', id, path: [[x, y, z], …] (Wegpunkte = Mitte der Unterseite der Lauffläche),
//     size: [3, 1.3] (Länge entlang des Besenstiels × Breite), thick: 0.35, axis: 'auto' | 'x' | 'z' (Stiel-Richtung;
//     auto = Hauptrichtung der Bahn), speed: 2.5 (m/s), wait: 0.8 (s an den Enden), mode: 'pingpong' | 'loop',
//     phase: 0 (0..1 Startpunkt), start: 'auto' | 'stand' (fliegt los, sobald eine Figur draufsteht) | 'signal'
//     ({ start: id }), once: false (nur einmal bis zum Ende), bob: 0.06 (m Wippen), tilt: 7 (Grad Neigung),
//     reset: true (nach dem Tod der Figur zurück an den Start, außer start 'auto'), color: 'lila' | 'rot' | 'gruen',
//     trail: true (Funkelsterne) }
//   level.named.get(id) = { pos, mover, shape, running, riders, rides, start(), stop(), reset(), info() }
// Modell 'besen_plattform' aus der Registry ({ length, width, color }; Ursprung = Mitte der Lauffläche unten, Stiel
// entlang +X; state { tilt (rad, Nase hoch +), roll (rad), speed, moving }), sonst eigene Geometrie.

import * as THREE from 'three';
import { v3, lin, mixc, smooth, colorize, merge, hex, box, addObject } from '../kit.js';
import { PathMover } from '../../level/PathMover.js';
import { visDt } from '../../entities/gimmick.js';
import { modelOr, HWC, figures } from '../hwkit.js';

const CUSH = { lila: [0x8a4ae0, 0xc59aff], rot: [0xd83a4a, 0xff8a8a], gruen: [0x3aa85a, 0x9af0a0] };

/** Besen mit Sitzbrett (lokal: Stiel entlang +X, Ursprung = Mitte der Unterseite der Lauffläche). */
function broomGeo(L, W, T, color) {
  const parts = [];
  const C = (h) => lin(hex(h));
  const [cu, cuHi] = (CUSH[color] ?? CUSH.lila).map(C);
  // Sitzbrett (Holz) mit Kissen obenauf
  const board = box(L * 0.82, T * 0.45, W, -L * 0.04, T * 0.22, 0, HWC.wood, { r: 0.06, seg: 1, topColor: HWC.woodHi });
  parts.push(board);
  const cush = box(L * 0.74, T * 0.5, W * 0.9, -L * 0.04, T * 0.7, 0, 0xffffff, { r: 0.12, seg: 2 });
  parts.push(colorize(cush, (p, n, o) => { mixc(cu, cuHi, smooth(0.3, 1, n.y) * 0.6, o); const st = Math.sin((p.x) * 9) > 0.85; if (st && n.y > 0.5) mixc(o, C(0xffe070), 0.5, o); }));
  // Quasten an den Ecken
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const t = new THREE.ConeGeometry(0.06, 0.2, 6); t.translate(-L * 0.04 + sx * L * 0.37, T * 0.45, sz * W * 0.45);
    parts.push(colorize(t.toNonIndexed(), (p, n, o) => mixc(C(0xd8a030), C(0xffe070), 0.5, o)));
  }
  // Besenstiel (unter dem Brett, vorn heraus mit Knauf)
  const sl = L * 1.25;
  const stick = new THREE.CylinderGeometry(0.075, 0.09, sl, 8); stick.rotateZ(Math.PI / 2); stick.translate(L * 0.08, 0.02, 0);
  parts.push(colorize(stick.toNonIndexed(), (p, n, o) => mixc(C(HWC.woodLow), C(HWC.woodHi), smooth(-0.6, 0.9, n.y), o)));
  const knob = new THREE.SphereGeometry(0.12, 8, 6); knob.translate(L * 0.08 + sl / 2, 0.02, 0);
  parts.push(colorize(knob.toNonIndexed(), (p, n, o) => mixc(C(0xb8862a), C(0xffe08a), smooth(-0.4, 1, n.y), o)));
  // Reisigbündel hinten mit Bändern
  const br = new THREE.ConeGeometry(W * 0.42, L * 0.5, 14, 3, true); br.rotateZ(-Math.PI / 2); br.translate(-L * 0.55, 0.02, 0);
  const bp = br.attributes.position;
  for (let i = 0; i < bp.count; i++) { const y = bp.getY(i), z = bp.getZ(i), x = bp.getX(i); const k = 1 + 0.12 * Math.sin(Math.atan2(z, y) * 9); bp.setY(i, y * k); bp.setZ(i, z * k); bp.setX(i, x); }
  br.computeVertexNormals();
  parts.push(colorize(br.toNonIndexed(), (p, n, o) => { mixc(C(HWC.strawLow), C(HWC.straw), smooth(-0.8, 0.8, n.y + Math.sin(p.y * 40 + p.z * 37) * 0.3), o); }));
  const cap = new THREE.CircleGeometry(W * 0.42, 14); cap.rotateY(-Math.PI / 2); cap.translate(-L * 0.8, 0.02, 0);
  parts.push(colorize(cap.toNonIndexed(), (p, n, o) => mixc(C(HWC.strawLow), C(HWC.straw), 0.3, o)));
  for (const u of [0.32, 0.4]) {
    const tie = new THREE.TorusGeometry(W * 0.2 + (0.4 - u) * 0.5, 0.035, 5, 14); tie.rotateY(Math.PI / 2); tie.translate(-L * u - 0.05, 0.02, 0);
    parts.push(colorize(tie.toNonIndexed(), (p, n, o) => mixc(C(0x8a2a5a), C(0xd85a9a), 0.5, o)));
  }
  return merge(parts);
}

export function buildBesenPlattform(level, spec) {
  const pts = (spec.path ?? [spec.pos ?? [0, 0, 0]]).map((q) => [q[0], q[1], q[2]]);
  const [L, W] = spec.size ?? [3, 1.3];
  const T = spec.thick ?? 0.35;
  let axis = spec.axis ?? 'auto';
  if (axis === 'auto') {
    let ex = 0, ez = 0;
    for (let i = 1; i < pts.length; i++) { ex += Math.abs(pts[i][0] - pts[i - 1][0]); ez += Math.abs(pts[i][2] - pts[i - 1][2]); }
    axis = ez > ex ? 'z' : 'x';
  }
  const sx = axis === 'x' ? L : W, sz = axis === 'x' ? W : L;
  const pm = new PathMover(pts, { speed: spec.speed ?? 2.5, mode: spec.mode, wait: spec.wait ?? 0.8, phase: spec.phase ?? 0 });
  const startMode = spec.start ?? 'auto';
  const bob = spec.bob ?? 0.06;
  const mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: pm.pos.x, cz: pm.pos.z };
  const st = { running: startMode === 'auto', t: 0, y: pm.pos.y, rides: 0, done: false };
  const riders = new Set();
  const cur = { x: pm.pos.x, y: pm.pos.y, z: pm.pos.z };
  const handle = {
    pos: cur, mover, riders, get running() { return st.running; }, get rides() { return st.rides; }, pm,
    start() { if (!st.done) st.running = true; }, stop() { st.running = false; },
    reset() { pm.s = (spec.phase ?? 0) * pm.length; pm.dir = 1; pm.pause = 0; pm.at(pm.s, pm.pos); st.running = startMode === 'auto'; st.done = false; place(0); },
    info: () => ({ x: +cur.x.toFixed(2), y: +cur.y.toFixed(2), z: +cur.z.toFixed(2), running: st.running, riders: riders.size, rides: st.rides, s: +pm.s.toFixed(2), axis }),
  };
  const shape = { type: 'box', min: [0, 0, 0], max: [1, 1, 1], mover, tag: 'besen_plattform', owner: handle };
  const box3 = (x, y, z) => { shape.min = [x - sx / 2, y, z - sz / 2]; shape.max = [x + sx / 2, y + T, z + sz / 2]; };
  box3(cur.x, cur.y, cur.z);
  const sid = level.world.add(shape);
  handle.shape = shape;
  if (spec.id) level.named.set(spec.id, handle);
  function place(dt) {
    const yb = cur.y;
    const ox = cur.x, oz = cur.z;
    const b = bob * Math.sin(st.t * 2.3);
    cur.x = pm.pos.x; cur.z = pm.pos.z; cur.y = pm.pos.y + b;
    mover.dx = cur.x - ox; mover.dy = cur.y - yb; mover.dz = cur.z - oz;
    if (dt > 0) { mover.vx = mover.dx / dt; mover.vy = mover.dy / dt; mover.vz = mover.dz / dt; } else { mover.vx = mover.vy = mover.vz = 0; mover.dx = mover.dy = mover.dz = 0; }
    mover.cx = cur.x; mover.cz = cur.z;
    box3(cur.x, cur.y, cur.z);
    level.world.update(sid);
  }
  let wasDead = false;
  level.onStep((dt) => {
    riders.clear();
    for (const f of figures(level)) if (f.mode === 'ground' && f.ground === shape) riders.add(f);
    if (!st.running && startMode === 'stand' && riders.size && !st.done) { st.running = true; st.rides++; }
    const dead = !!level.player?.dead;
    if (wasDead && !dead && spec.reset !== false && startMode !== 'auto') handle.reset();
    wasDead = dead;
    st.t += dt;
    if (st.running) {
      pm.step(dt);
      if (spec.once && pm.mode !== 'loop' && pm.dir < 0) { pm.s = pm.length; pm.at(pm.s, pm.pos); st.running = false; st.done = true; }
    }
    place(dt);
  });
  if (level.view) {
    const root = new THREE.Group();
    root.name = 'besen';
    const model = modelOr('besen_plattform', { length: L, width: W, color: spec.color ?? 'lila' }, () => {
      const m = new THREE.Mesh(broomGeo(L, W, T, spec.color ?? 'lila'), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65 }));
      m.castShadow = true; m.receiveShadow = true;
      return { root: m };
    });
    const tilter = new THREE.Group();
    tilter.add(model.root);
    root.add(tilter);
    const hold = {};
    let yaw = axis === 'x' ? 0 : -Math.PI / 2, tilt = 0, roll = 0, trailT = 0, lastY = cur.y;
    addObject(level, root, (dt, t) => {
      const d = visDt(level, hold, dt);
      root.position.set(cur.x, cur.y, cur.z);
      // Blickrichtung: in Flugrichtung entlang der Stielachse (dreht an den Enden um)
      const vx = mover.vx, vz = mover.vz;
      if (Math.hypot(vx, vz) > 0.3) {
        const want = axis === 'x' ? (vx >= 0 ? 0 : Math.PI) : (vz <= 0 ? Math.PI / 2 : -Math.PI / 2);
        let dy = want - yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        yaw += dy * Math.min(1, d * 5);
      }
      root.rotation.y = yaw;
      const vy = d > 0 ? (cur.y - lastY) / d : 0;
      lastY = cur.y;
      const maxT = (spec.tilt ?? 7) * Math.PI / 180;
      tilt += (Math.max(-maxT, Math.min(maxT, vy * 0.25 + Math.sin(t * 1.3) * 0.02)) - tilt) * Math.min(1, d * 4);
      // Neigung zur Seite der Figur(en)
      let side = 0;
      for (const f of riders) { const lx = (f.pos.x - cur.x) * Math.sin(yaw) + (f.pos.z - cur.z) * Math.cos(yaw); side += lx; }
      roll += (Math.max(-0.12, Math.min(0.12, side * 0.08 + Math.sin(t * 1.7) * 0.025)) - roll) * Math.min(1, d * 5);
      tilter.rotation.set(roll, 0, tilt, 'YXZ');
      model.update?.(d, { tilt, roll, speed: Math.hypot(vx, mover.vy, vz), moving: st.running });
      // Funkelsterne am Reisig
      if (spec.trail !== false && st.running && (trailT -= d) <= 0) {
        trailT = 0.18;
        const bx = cur.x - Math.cos(yaw) * L * 0.75, bz = cur.z + Math.sin(yaw) * L * 0.75;
        level.effects?.sparks({ x: bx, y: cur.y + 0.05, z: bz }, 1);
      }
    });
  }
  return handle;
}

export const TYPES = { besen_plattform: buildBesenPlattform };
