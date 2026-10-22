// Baustein `multilift` – Mehrfigur-Lift (Präzisierung Motor Welt 2; Bauplan 2-5 „Viererlift … fährt erst mit vier
// Figuren“). Eine Plattform fährt ihren Weg nur, solange mindestens `need` Figuren gleichzeitig darauf stehen
// (Spiegelfrucht-Klone zählen); eine Tafel an der Plattform zeigt „2/4“. Sind es zu wenige, hält sie an und fährt
// nach `wait` s zurück zum Start (back: true) bzw. bleibt stehen (back: false). Am Ziel wartet sie, bis niemand mehr
// darauf steht, dann geht es zurück. Trägt Figuren und Gegner mit (mover-Flag wie `mover`).
//
// Parameter:
//   pos:   [x, y, z]  Mitte der Unterseite (Start);  path: [[x, y, z], …] statt pos (Start = erster Punkt)
//   rise:  m  (ohne path: Ziel = pos + [0, rise, 0], Standard 6)
//   size:  [w, h, d] Standard [3, 0.5, 3]
//   need:  4         Figuren gleichzeitig
//   speed: 2.5 m/s,  back: true,  wait: 1.0 s,  color: 'purple'
//   id:    Name → level.named.get(id) = { count, need, s, length, state ('wait'|'up'|'stop'|'down'|'top'), shape }
// Beispiel: { type: 'multilift', pos: [0, 1, -60], rise: 7, need: 4 }

import * as THREE from 'three';
import { v3, sz3, box, hex, merge, addObject } from '../kit.js';
import { Badge, figuresOn } from '../../entities/kinds/figuren.js';

export function buildMultilift(level, spec) {
  const p0 = v3(spec.path?.[0] ?? spec.pos);
  const pts = spec.path?.length >= 2 ? spec.path.map(v3) : [p0, { x: p0.x, y: p0.y + (spec.rise ?? 6), z: p0.z }];
  const s = sz3(spec.size, [3, 0.5, 3]);
  const need = Math.max(1, spec.need ?? 4);
  const speed = spec.speed ?? 2.5, back = spec.back !== false, wait = spec.wait ?? 1.0;
  const segs = [];
  let L = 0;
  for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], l = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z); segs.push({ a, b, l, s0: L }); L += l; }
  const at = (d, out) => {
    let k = segs.length - 1;
    for (let i = 0; i < segs.length; i++) if (d <= segs[i].s0 + segs[i].l) { k = i; break; }
    const g = segs[k], t = g.l > 0 ? Math.max(0, Math.min(1, (d - g.s0) / g.l)) : 0;
    out.x = g.a.x + (g.b.x - g.a.x) * t; out.y = g.a.y + (g.b.y - g.a.y) * t; out.z = g.a.z + (g.b.z - g.a.z) * t;
    return out;
  };
  const pos = at(0, {});
  const mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: pos.x, cz: pos.z };
  const lift = { count: 0, need, s: 0, length: L, state: 'wait', idle: 0, trips: 0, shape: null };
  const shape = { type: 'box', min: [pos.x - s.x / 2, pos.y, pos.z - s.z / 2], max: [pos.x + s.x / 2, pos.y + s.y, pos.z + s.z / 2], mover, owner: lift, tag: 'multilift' };
  const id = level.world.add(shape);
  lift.shape = shape;
  if (spec.id) level.named.set(spec.id, lift);
  level.onStep((dt) => {
    lift.count = figuresOn(level, lift);
    const ok = lift.count >= need;
    let v = 0;
    if (ok && lift.s < L) { v = speed; lift.state = 'up'; lift.idle = 0; }
    else if (ok) { lift.state = 'top'; lift.idle = 0; }
    else {
      lift.idle += dt;
      if (lift.s >= L - 1e-6 && lift.count > 0) { lift.state = 'top'; lift.idle = 0; }
      else if (back && lift.s > 0 && lift.idle >= wait) { v = -speed; lift.state = 'down'; }
      else lift.state = lift.s > 0 ? 'stop' : 'wait';
    }
    const before = lift.s;
    lift.s = Math.max(0, Math.min(L, lift.s + v * dt));
    if (before < L && lift.s >= L) lift.trips++;
    const o = { x: pos.x, y: pos.y, z: pos.z };
    at(lift.s, pos);
    mover.dx = pos.x - o.x; mover.dy = pos.y - o.y; mover.dz = pos.z - o.z;
    mover.vx = mover.dx / dt; mover.vy = mover.dy / dt; mover.vz = mover.dz / dt;
    mover.cx = pos.x; mover.cz = pos.z;
    if (mover.dx || mover.dy || mover.dz) {
      shape.min = [pos.x - s.x / 2, pos.y, pos.z - s.z / 2];
      shape.max = [pos.x + s.x / 2, pos.y + s.y, pos.z + s.z / 2];
      level.world.update(id);
    }
  });
  // Darstellung: Plattform mit Figur-Punkten, Tafel „n/need“
  if (level.view) {
    const col = hex(spec.color ?? 'purple', 0xa865ff);
    const parts = [box(s.x, s.y, s.z, 0, s.y / 2, 0, col, { r: 0.12, topColor: 0xd8b8ff })];
    const n = need, stepX = Math.min(0.6, (s.x - 0.5) / n);
    for (let i = 0; i < n; i++) parts.push(box(0.26, 0.04, 0.26, (i - (n - 1) / 2) * stepX, s.y + 0.02, s.z / 2 - 0.35, 0xffffff, { r: 0.06, seg: 1 }));
    const mesh = new THREE.Mesh(merge(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }));
    mesh.castShadow = true; mesh.receiveShadow = true;
    const badge = new Badge(level, { w: 1.2, h: 0.6, color: '#c77dff' });
    lift.badge = badge;
    addObject(level, mesh, () => {
      mesh.position.set(pos.x, pos.y, pos.z);
      const full = lift.count >= need;
      badge.show(`${Math.min(lift.count, need)}/${need}`, full ? '#5fcf6a' : '#c77dff');
      badge.at(pos.x, pos.y + s.y + 2.0, pos.z + s.z / 2 - 0.2);
    });
  }
  return lift;
}

export const TYPES = { multilift: buildMultilift };
