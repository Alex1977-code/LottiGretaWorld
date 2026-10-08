// Baustein `mover`: bewegliche Plattform auf einem Punktpfad (hin und her oder im Kreis), optional
// drehend (Drehscheibe). Trägt Figur und Gegner mit (Verschiebung und Drehung um Y werden übertragen;
// beim Absprung wird der Plattform-Schwung mitgenommen).
//
// Parameter:
//   path:   [[x, y, z], …]  Wegpunkte (Mitte der Unterseite)
//   size:   [w, h, d]       Standard [3, 0.5, 3] (bei shape 'cyl': Durchmesser w)
//   speed:  m/s (Standard 2.5)
//   mode:   'pingpong' (Standard) | 'loop'
//   wait:   s Pause an den Enden (Standard 0.5)
//   phase:  0..1 Startpunkt auf dem Pfad
//   spin:   rad/s Drehung um Y (Drehscheibe, nur mit shape 'cyl' sinnvoll)
//   shape:  'box' (Standard) | 'cyl'
//   color:  Standard 'yellow'
// Kollision: box/cyl mit Flag mover = { dx, dy, dz, vx, vy, vz, dyaw, cx, cz } (dieser Schritt).
// Läuft in level.onStep (vor der Figur).

import * as THREE from 'three';
import { v3, sz3, box, disc, hex, merge, addObject } from '../kit.js';
import { PathMover } from '../../level/PathMover.js';

export function buildMover(level, spec) {
  const path = spec.path ?? [spec.pos ?? [0, 0, 0]];
  const s = sz3(spec.size, [3, 0.5, 3]);
  const cyl = spec.shape === 'cyl';
  const pm = new PathMover(path, { speed: spec.speed ?? 2.5, mode: spec.mode, wait: spec.wait ?? 0.5, phase: spec.phase ?? 0 });
  const spin = spec.spin ?? 0;
  const mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: pm.pos.x, cz: pm.pos.z };
  const shapeOf = (p) => (cyl
    ? { type: 'cyl', x: p.x, z: p.z, r: s.x / 2, y0: p.y, y1: p.y + s.y }
    : { type: 'box', min: [p.x - s.x / 2, p.y, p.z - s.z / 2], max: [p.x + s.x / 2, p.y + s.y, p.z + s.z / 2] });
  const id = level.world.add({ ...shapeOf(pm.pos), mover, tag: 'mover' });
  const shape = level.world.get(id);
  let yaw = 0;
  level.onStep((dt) => {
    const d = pm.step(dt);
    mover.dx = d.dx; mover.dy = d.dy; mover.dz = d.dz;
    mover.vx = d.dx / dt; mover.vy = d.dy / dt; mover.vz = d.dz / dt;
    mover.dyaw = spin * dt;
    yaw += mover.dyaw;
    mover.cx = pm.pos.x; mover.cz = pm.pos.z;
    const ns = shapeOf(pm.pos);
    if (cyl) { shape.x = ns.x; shape.z = ns.z; shape.y0 = ns.y0; shape.y1 = ns.y1; }
    else { shape.min = ns.min; shape.max = ns.max; }
    level.world.update(id);
  });
  // Darstellung
  const color = hex(spec.color ?? 'yellow', 0xffd23d);
  let g;
  if (cyl) g = disc(0, 0, 0, s.x / 2, s.y, 0xfff1a8, color, 32);
  else {
    const parts = [box(s.x, s.y, s.z, 0, s.y / 2, 0, color, { r: 0.12, topColor: 0xfff1a8 })];
    // Pfeile/Nieten an den Seiten: kleine dunkle Punkte
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(box(0.16, 0.16, 0.16, sx * (s.x / 2 - 0.25), s.y + 0.03, sz * (s.z / 2 - 0.25), 0xb88a12, { r: 0.06 }));
    g = merge(parts);
  }
  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }));
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.position.set(pm.pos.x, pm.pos.y, pm.pos.z);
  addObject(level, mesh, () => { mesh.position.set(pm.pos.x, pm.pos.y, pm.pos.z); mesh.rotation.y = yaw; });
  return { shape, mover, pm };
}

export const TYPES = { mover: buildMover };
