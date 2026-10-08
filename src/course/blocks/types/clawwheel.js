// Baustein `clawwheel`: Krallenrad (1-Burg) – eine Kletterwand mit großem Rad. Klettert die Figur mit dem
// Krallen-Anzug daran hoch, dreht sich das Rad, und die verbundenen Plattformen fahren aus (Fortschritt =
// gekletterte Meter / climb). Ohne Krallen-Anzug: nur Wandrutschen/Wandsprung, nichts bewegt sich.
//
// Parameter:
//   pos:       [x, y, z]  Mitte der Unterseite der Wand;  size: [w, h, d] (Standard [3, 6, 1])
//   face:      '+z' (Standard, Kletterseite zur Kamera) | '-z' | '+x' | '-x'  – dort sitzt das Rad
//   radius:    Radius des Rads (Standard min(w, h) / 2 − 0,2)
//   platforms: [{ pos, size: [w, h, d], dir: [dx, dz] | [dx, dy, dz], length: 3, color }]  fahren um length in dir
//              aus (Startlage = eingefahren)
//   climb:     3      Meter Klettern bis ganz ausgefahren
//   retract:   0      Anteil je s, um den die Plattformen ohne Klettern zurückfahren (0 = bleiben draußen)
//   onFull:    Aktion (entities/gimmick.js), sobald ganz ausgefahren
//   id:        Name → level.named: { progress, set(p) }
// Kollision: Wand = climbable-Quader (owner = Rad), Plattformen = Quader mit mover-Flag.
// Beispiel:
//   { type: 'clawwheel', pos: [0, 1, -70], size: [3, 7, 1], climb: 3,
//     platforms: [{ pos: [3.5, 4, -70.5], size: [2, 0.5, 2], dir: [1, 0], length: 3 }] }
// Modell 'claw_wheel' (state { angle, glow }).

import * as THREE from 'three';
import { v3, sz3, box, hex, merge, themeOf, addStatic, addObject } from '../kit.js';
import { runAction, visDt } from '../../entities/gimmick.js';
import { getModel } from '../../models/index.js';

const FACES = { '+z': [0, 1], '-z': [0, -1], '+x': [1, 0], '-x': [-1, 0] };

export function buildClawWheel(level, spec) {
  const p = v3(spec.pos), s = sz3(spec.size, [3, 6, 1]);
  const th = themeOf(level);
  const [fx, fz] = FACES[spec.face ?? '+z'] ?? FACES['+z'];
  const R = spec.radius ?? Math.max(0.6, Math.min(s.x, s.y) / 2 - 0.2);
  const climbM = spec.climb ?? 3;
  const wheel = { progress: 0, angle: 0, lastY: null, full: false, glow: 0 };
  const wall = { type: 'box', min: [p.x - s.x / 2, p.y, p.z - s.z / 2], max: [p.x + s.x / 2, p.y + s.y, p.z + s.z / 2], climbable: true, owner: wheel, tag: 'clawwheel' };
  level.world.add(wall);
  // Plattformen
  const plats = (spec.platforms ?? []).map((q) => {
    const b = v3(q.pos), sz = sz3(q.size, [2, 0.5, 2]);
    const dir = q.dir?.length === 3 ? { x: q.dir[0], y: q.dir[1], z: q.dir[2] } : { x: q.dir?.[0] ?? 1, y: 0, z: q.dir?.[1] ?? 0 };
    const l = Math.hypot(dir.x, dir.y, dir.z) || 1; dir.x /= l; dir.y /= l; dir.z /= l;
    const mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: b.x, cz: b.z };
    const shape = { type: 'box', min: [b.x - sz.x / 2, b.y, b.z - sz.z / 2], max: [b.x + sz.x / 2, b.y + sz.y, b.z + sz.z / 2], mover, tag: 'clawwheel:plattform' };
    const id = level.world.add(shape);
    return { b, sz, dir, len: q.length ?? 3, mover, shape, id, cur: { x: b.x, y: b.y, z: b.z }, color: q.color };
  });
  wheel.set = (v) => { wheel.progress = Math.max(0, Math.min(1, v)); };
  if (spec.id) level.named.set(spec.id, wheel);
  level.onStep((dt) => {
    const pl = level.player;
    const climbing = pl && !pl.dead && pl.mode === 'wall' && pl.state === 'climb' && pl.wallShape?.owner === wheel;
    const before = wheel.progress;
    if (climbing) {
      if (wheel.lastY !== null && pl.pos.y > wheel.lastY) wheel.progress = Math.min(1, wheel.progress + (pl.pos.y - wheel.lastY) / climbM);
      wheel.lastY = pl.pos.y;
      wheel.glow = Math.min(1, wheel.glow + dt * 4);
    } else {
      wheel.lastY = null;
      wheel.glow = Math.max(0, wheel.glow - dt * 2);
      if (spec.retract > 0) wheel.progress = Math.max(0, wheel.progress - spec.retract * dt);
    }
    const dp = wheel.progress - before;
    wheel.angle += dp * Math.PI * 4;
    if (dp > 0 && Math.floor(before * 8) !== Math.floor(wheel.progress * 8)) level.sfx('step');
    if (wheel.progress >= 1 && !wheel.full) { wheel.full = true; level.sfx('key'); runAction(level, spec.onFull, { pos: [p.x + fx * (s.z / 2 + 1), p.y + s.y, p.z + fz * (s.z / 2 + 1)], source: wheel }); }
    for (const q of plats) {
      const k = wheel.progress * q.len;
      const nx = q.b.x + q.dir.x * k, ny = q.b.y + q.dir.y * k, nz = q.b.z + q.dir.z * k;
      const m = q.mover;
      m.dx = nx - q.cur.x; m.dy = ny - q.cur.y; m.dz = nz - q.cur.z;
      m.vx = m.dx / dt; m.vy = m.dy / dt; m.vz = m.dz / dt;
      m.cx = nx; m.cz = nz;
      q.cur.x = nx; q.cur.y = ny; q.cur.z = nz;
      if (m.dx || m.dy || m.dz) {
        q.shape.min = [nx - q.sz.x / 2, ny, nz - q.sz.z / 2]; q.shape.max = [nx + q.sz.x / 2, ny + q.sz.y, nz + q.sz.z / 2];
        level.world.update(q.id);
      }
    }
  });
  if (level.view) {
    // Wand: helle Kletterwand mit dunklem Rahmen
    const parts = [box(s.x, s.y, s.z, p.x, p.y + s.y / 2, p.z, th.climb, { r: 0.12, topColor: 0xfff3d6 })];
    for (const sx of [-1, 1]) parts.push(box(0.2, s.y, s.z + 0.06, p.x + sx * (s.x / 2 - 0.1), p.y + s.y / 2, p.z, th.climbDark, { r: 0.06 }));
    addStatic(level, merge(parts));
    const m = getModel('claw_wheel', { radius: R });
    const off = (fx ? s.x : s.z) / 2 + 0.02;
    m.root.position.set(p.x + fx * off, p.y + s.y / 2, p.z + fz * off);
    m.root.rotation.y = Math.atan2(-fz, fx); // Achse (+X des Modells) zeigt aus der Wand heraus
    addObject(level, m.root, (dt) => m.update(visDt(level, m, dt), { angle: wheel.angle, glow: wheel.glow }));
    for (const q of plats) {
      const col = hex(q.color ?? 'yellow', 0xffd23d);
      const g = merge([box(q.sz.x, q.sz.y, q.sz.z, 0, q.sz.y / 2, 0, col, { r: 0.1, topColor: 0xfff1a8 }), box(0.3, q.sz.y * 0.6, q.sz.z * 0.8, -q.dir.x * q.sz.x * 0.5, q.sz.y * 0.5, -q.dir.z * q.sz.z * 0.5, 0x8a8d9a, { r: 0.04 })]);
      const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }));
      mesh.castShadow = true; mesh.receiveShadow = true;
      addObject(level, mesh, () => mesh.position.set(q.cur.x, q.cur.y, q.cur.z));
      mesh.position.set(q.cur.x, q.cur.y, q.cur.z);
    }
  }
  return wheel;
}

export const TYPES = { clawwheel: buildClawWheel };
