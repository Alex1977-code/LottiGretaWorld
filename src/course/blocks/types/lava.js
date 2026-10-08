// Baustein `lava`: glühende Fläche, Berührung = Tod (Neustart am Checkpoint).
//
//   pos:  [x, y, z]  Mitte der Unterseite
//   size: [w, h, d]  Oberfläche bei y + h (Standard [4, 0.5, 4])
// Kollision: nicht feste Form mit kill = 'lava' (Füße unter der Oberfläche → Tod).

import * as THREE from 'three';
import { v3, sz3, addObject } from '../kit.js';

export function buildLava(level, spec) {
  const p = v3(spec.pos), s = sz3(spec.size, [4, 0.5, 4]);
  const top = p.y + s.y;
  level.world.add({ type: 'box', min: [p.x - s.x / 2, p.y - 2, p.z - s.z / 2], max: [p.x + s.x / 2, top - 0.12, p.z + s.z / 2], kill: 'lava', solid: false, camIgnore: true, tag: 'lava' });
  const nx = Math.max(2, Math.round(s.x * 1.5)), nz = Math.max(2, Math.round(s.z * 1.5));
  const g = new THREE.PlaneGeometry(s.x, s.z, nx, nz);
  g.rotateX(-Math.PI / 2);
  const col = new Float32Array(g.attributes.position.count * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(g, mat);
  mesh.position.set(p.x, top - 0.05, p.z);
  // Rand/Körper unter der Oberfläche (dunkle Kruste)
  const body = new THREE.Mesh(new THREE.BoxGeometry(s.x, s.y, s.z), new THREE.MeshStandardMaterial({ color: 0x7a1d08, roughness: 0.9, emissive: 0x3a0800 }));
  body.position.set(p.x, p.y + s.y / 2 - 0.06, p.z);
  const group = new THREE.Group();
  group.add(mesh, body);
  const pos = g.attributes.position;
  const base = Float32Array.from(pos.array);
  const hot = new THREE.Color(0xffd23a), mid = new THREE.Color(0xff6a1a), cool = new THREE.Color(0xc0280c);
  const c = new THREE.Color();
  let t = Math.random() * 10;
  addObject(level, group, (dt) => {
    t += dt;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      const w = Math.sin(x * 2.1 + t * 1.6) * 0.5 + Math.cos(z * 1.7 - t * 1.3) * 0.5;
      pos.array[i * 3 + 1] = base[i * 3 + 1] + w * 0.05;
      const k = 0.5 + 0.5 * Math.sin(x * 3.3 + z * 2.7 + t * 2.4);
      if (k > 0.5) c.copy(mid).lerp(hot, (k - 0.5) * 2); else c.copy(cool).lerp(mid, k * 2);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    pos.needsUpdate = true;
    g.attributes.color.needsUpdate = true;
  });
}

export const TYPES = { lava: buildLava };
