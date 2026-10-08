// Bausteine `cloud` (Wolkenplattform) und `cloudcannon` (Wolkenkanone in den Münzhimmel), Bauplan 1-2/1-3.
//
// cloud – weiche Wolke zum Draufstehen, standardmäßig Einweg (von unten durchspringbar), optional fahrend.
//   pos:    [x, y, z]  Mitte der Unterseite;  size: [w, h, d] (Standard [3, 0.6, 3])
//   oneWay: true       false → von allen Seiten fest
//   path:   [[x, y, z], …]  fährt wie eine bewegliche Plattform (speed 2, mode 'pingpong'|'loop', wait, phase)
//   id:     Name (fahrend: level.named wie mover → start/stop, idle: true wartet auf Signal)
//   Beispiel: { type: 'cloud', pos: [0, 4, -30], size: [3, 0.6, 2.5] }
//             { type: 'cloud', pos: [0, 6, -40], path: [[-4, 6, -40], [4, 6, -40]], speed: 2 }
//
// cloudcannon – Wolke mit Rohr: auf die Öffnung springen → die Figur wird geladen (0,45 s) und in hohem Bogen
//   zum Ziel geschossen (Münzhimmel hoch über dem Level; Rückweg per Fall, Röhre oder Glasröhre).
//   pos:    [x, y, z]  Fußpunkt;  target: [x, y, z] Landepunkt (Fußpunkt), arc: 4 (m über dem höheren Punkt)
//   onFire: Aktion (entities/gimmick.js) beim Abschuss, id?
//   Beispiel: { type: 'cloudcannon', pos: [-6, 1, -90], target: [-6, 40, -100] }
// Kollision: Wolkensockel (Zylinder r 1,05, 1 m) + Rohr (Zylinder r 0,62 bis 2,2 m; Oberseite = Öffnung).
// Modell 'cloud_cannon' (state idle/load/fire).

import * as THREE from 'three';
import { v3, sz3, lin, mixc, smooth, colorize, merge, addStatic, addObject, Rnd } from '../kit.js';
import { PathMover } from '../../level/PathMover.js';
import { flightCtl, playerOn, runAction, visDt } from '../../entities/gimmick.js';
import { getModel } from '../../models/index.js';

/** Wolke: Kugelgruppe in Plattformgröße mit flacher, heller Oberseite (lokal: Mitte der Unterseite = 0). */
export function cloudGeo(s, seed = 1) {
  const rnd = new Rnd(seed >>> 0);
  const parts = [];
  const white = lin(0xffffff), shade = lin(0xc9dcf0), rim = lin(0xeaf4ff);
  const nx = Math.max(1, Math.round(s.x / 1.1)), nz = Math.max(1, Math.round(s.z / 1.1));
  const cw = s.x / nx, cd = s.z / nz;
  const puff = (r, x, y, z, sy) => {
    const g = new THREE.SphereGeometry(r, 12, 8);
    g.scale(1, sy, 1);
    g.translate(x, y, z);
    parts.push(colorize(g.toNonIndexed(), (p, n, o) => mixc(shade, n.y > 0.4 ? white : rim, smooth(-0.7, 0.5, n.y), o)));
  };
  for (let i = 0; i < nx; i++) {
    for (let k = 0; k < nz; k++) {
      const r = Math.min(cw, cd) * 0.72;
      puff(r, -s.x / 2 + (i + 0.5) * cw, s.y * 0.55, -s.z / 2 + (k + 0.5) * cd, (s.y * 0.62) / r);
    }
  }
  // Randbäusche unten (weiche Silhouette)
  const nRim = Math.max(4, Math.round((s.x + s.z) * 0.9));
  for (let i = 0; i < nRim; i++) {
    const a = (i / nRim) * Math.PI * 2 + rnd.real(-0.2, 0.2);
    const r = Math.min(s.x, s.z) * rnd.real(0.18, 0.26);
    puff(r, Math.cos(a) * s.x * 0.42, s.y * 0.3, Math.sin(a) * s.z * 0.42, 0.75);
  }
  // flache Deckschicht (Oberseite gut lesbar)
  const top = new THREE.CylinderGeometry(1, 1, 0.08, 20);
  top.scale(s.x * 0.47, 1, s.z * 0.47);
  top.translate(0, s.y - 0.04, 0);
  parts.push(colorize(top.toNonIndexed(), (p, n, o) => mixc(rim, white, n.y > 0 ? 1 : 0, o)));
  return merge(parts);
}

export function buildCloud(level, spec) {
  const p = v3(spec.pos ?? spec.path?.[0] ?? [0, 0, 0]), s = sz3(spec.size, [3, 0.6, 3]);
  const oneWay = spec.oneWay ?? true;
  const seed = Math.floor(p.x * 13 + p.z * 7 + p.y * 3) >>> 0;
  if (!spec.path) {
    level.world.add({ type: 'box', min: [p.x - s.x / 2, p.y, p.z - s.z / 2], max: [p.x + s.x / 2, p.y + s.y, p.z + s.z / 2], oneWay, camIgnore: true, tag: 'cloud' });
    const g = cloudGeo(s, seed);
    g.translate(p.x, p.y, p.z);
    addStatic(level, g, { castShadow: true });
    return null;
  }
  // fahrende Wolke
  const pm = new PathMover(spec.path, { speed: spec.speed ?? 2, mode: spec.mode, wait: spec.wait ?? 0.5, phase: spec.phase ?? 0 });
  const mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: pm.pos.x, cz: pm.pos.z };
  const shapeOf = (q) => ({ min: [q.x - s.x / 2, q.y, q.z - s.z / 2], max: [q.x + s.x / 2, q.y + s.y, q.z + s.z / 2] });
  const id = level.world.add({ type: 'box', ...shapeOf(pm.pos), oneWay, camIgnore: true, mover, tag: 'cloud' });
  const shape = level.world.get(id);
  const handle = { pm, mover, shape, origin: { ...pm.pos }, running: !spec.idle, start() { handle.running = true; }, stop() { handle.running = false; } };
  if (spec.id) level.named.set(spec.id, handle);
  level.onStep((dt) => {
    const d = handle.running ? pm.step(dt) : { dx: 0, dy: 0, dz: 0 };
    mover.dx = d.dx; mover.dy = d.dy; mover.dz = d.dz;
    mover.vx = d.dx / dt; mover.vy = d.dy / dt; mover.vz = d.dz / dt;
    mover.cx = pm.pos.x; mover.cz = pm.pos.z;
    Object.assign(shape, shapeOf(pm.pos));
    level.world.update(id);
  });
  if (level.view) {
    const mesh = new THREE.Mesh(cloudGeo(s, seed), level.view.mats.world);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData.owned = true;
    level.view.add(mesh, () => mesh.position.set(pm.pos.x, pm.pos.y, pm.pos.z));
    mesh.position.set(pm.pos.x, pm.pos.y, pm.pos.z);
  }
  return handle;
}

export function buildCloudCannon(level, spec) {
  const p = v3(spec.pos);
  const target = v3(spec.target ?? [p.x, p.y + 30, p.z]);
  const top = p.y + 2.2;
  const owner = { kind: 'cloudcannon', anim: 'idle', animT: 0 };
  level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 1.05, y0: p.y, y1: p.y + 1.0, tag: 'cloudcannon' });
  level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.62, y0: p.y + 1.0, y1: top, owner, tag: 'cloudcannon:rohr' });
  const fire = (player) => {
    owner.anim = 'load'; owner.animT = 0;
    level.sfx('pipe');
    let t = 0, fly = null;
    const from = { x: p.x, y: top, z: p.z };
    player.ride({
      step(pl, dt) {
        if (fly) return fly.step(pl, dt);
        t += dt;
        pl.pos.set(p.x, top - Math.min(1, t / 0.35) * 1.0, p.z);
        pl.vel.set(0, -2, 0);
        if (t >= 0.45) {
          fly = flightCtl(level, from, target, { arc: spec.arc ?? 4 });
          owner.anim = 'fire'; owner.animT = 0;
          level.sfx('swoop');
          level.shake(0.3);
          level.effects?.dust({ x: p.x, y: top, z: p.z }, 8, 1.5);
          runAction(level, spec.onFire, { pos: [p.x, top, p.z], source: owner });
        }
        return false;
      },
      exit(pl) { fly?.exit(pl); },
    }, { state: 'pipe', kind: 'cloudcannon' });
  };
  owner.fire = fire;
  if (spec.id) level.named.set(spec.id, owner);
  level.onStep((dt) => {
    owner.animT += dt;
    if (owner.anim === 'fire' && owner.animT > 0.6) owner.anim = 'idle';
    if (owner.anim === 'idle' && playerOn(level, owner)) fire(level.player);
  });
  if (level.view) {
    const m = getModel('cloud_cannon');
    m.root.position.set(p.x, p.y, p.z);
    m.root.rotation.y = spec.yaw ?? -Math.PI / 2;
    addObject(level, m.root, (dt) => m.update(visDt(level, m, dt), { anim: owner.anim }));
  }
  return owner;
}

export const TYPES = { cloud: buildCloud, cloudcannon: buildCloudCannon };
