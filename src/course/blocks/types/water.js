// Baustein `water`: Wasserbecken zum Schwimmen (Auftrieb, Schwimmzüge mit Sprung, Ducken taucht ab,
// Sprung an der Oberfläche springt heraus).
//
// Parameter:
//   pos:  [x, y, z]  Mitte der Unterseite (Beckenboden)
//   size: [w, h, d]  h = Wassertiefe; Oberfläche bei y + h
// Kollision: nicht feste Form mit Flag water. Den Beckenboden/-rand baut das Level (island/wall).

import * as THREE from 'three';
import { v3, sz3, themeOf, addObject } from '../kit.js';

export function buildWater(level, spec) {
  const p = v3(spec.pos), s = sz3(spec.size, [6, 2, 6]);
  const th = themeOf(level);
  const top = p.y + s.y;
  level.world.add({ type: 'box', min: [p.x - s.x / 2, p.y, p.z - s.z / 2], max: [p.x + s.x / 2, top, p.z + s.z / 2], water: true, solid: false, camIgnore: true, tag: 'water' });
  const group = new THREE.Group();
  // Wasserkörper (durchscheinend) und bewegte Oberfläche
  const body = new THREE.Mesh(new THREE.BoxGeometry(s.x - 0.02, s.y - 0.06, s.z - 0.02), new THREE.MeshStandardMaterial({ color: th.waterDeep, transparent: true, opacity: 0.45, roughness: 0.2, depthWrite: false }));
  body.position.set(0, (s.y - 0.06) / 2, 0);
  const nx = Math.max(2, Math.round(s.x)), nz = Math.max(2, Math.round(s.z));
  const surfGeo = new THREE.PlaneGeometry(s.x - 0.02, s.z - 0.02, nx, nz);
  surfGeo.rotateX(-Math.PI / 2);
  const surf = new THREE.Mesh(surfGeo, new THREE.MeshStandardMaterial({ color: th.water, transparent: true, opacity: 0.72, roughness: 0.12, metalness: 0.1, depthWrite: false }));
  surf.position.y = s.y - 0.04;
  surf.receiveShadow = true;
  body.renderOrder = 1; surf.renderOrder = 1;
  group.add(body, surf);
  group.position.set(p.x, p.y, p.z);
  const pos = surfGeo.attributes.position;
  const base = Float32Array.from(pos.array);
  let t = 0;
  addObject(level, group, (dt) => {
    t += dt;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      pos.array[i * 3 + 1] = base[i * 3 + 1] + Math.sin(x * 1.7 + t * 2.2) * 0.04 + Math.cos(z * 1.3 + t * 1.7) * 0.04;
    }
    pos.needsUpdate = true;
  });
}

export const TYPES = { water: buildWater };
