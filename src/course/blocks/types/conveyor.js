// Baustein `conveyor`: Förderband – trägt alles, was darauf steht, in Laufrichtung.
//
// Parameter:
//   pos:   [x, y, z]  Mitte der Unterseite
//   size:  [w, h, d]  Standard [3, 0.5, 8]
//   dir:   [dx, dz] Laufrichtung (Standard [0, -1])
//   speed: m/s (Standard 3)
// Kollision: box mit Flag conveyor = { x, z } (m/s).

import * as THREE from 'three';
import { v3, sz3, box, addStatic, addObject } from '../kit.js';

export function buildConveyor(level, spec) {
  const p = v3(spec.pos), s = sz3(spec.size, [3, 0.5, 8]);
  let [dx, dz] = spec.dir ?? [0, -1];
  const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  const speed = spec.speed ?? 3;
  level.world.add({ type: 'box', min: [p.x - s.x / 2, p.y, p.z - s.z / 2], max: [p.x + s.x / 2, p.y + s.y, p.z + s.z / 2], conveyor: { x: dx * speed, z: dz * speed }, tag: 'conveyor' });
  // Rahmen (statisch)
  addStatic(level, box(s.x + 0.2, s.y - 0.06, s.z + 0.2, p.x, p.y + (s.y - 0.06) / 2, p.z, 0x6b7088, { r: 0.08, topColor: 0x9aa0b8 }));
  // Band: Streifen-Textur, läuft je Bild mit
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#2d3142'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#ffcf3a';
  g.beginPath(); g.moveTo(8, 40); g.lineTo(32, 16); g.lineTo(56, 40); g.lineTo(46, 40); g.lineTo(32, 26); g.lineTo(18, 40); g.closePath(); g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const along = Math.abs(dz) >= Math.abs(dx);
  const lenAlong = along ? s.z : s.x, lenAcross = along ? s.x : s.z;
  tex.repeat.set(Math.max(1, Math.round(lenAcross / 1.2)), lenAlong / 1.2);
  const plane = new THREE.PlaneGeometry(lenAcross - 0.2, lenAlong - 0.2);
  plane.rotateX(-Math.PI / 2); // Textur-V zeigt nach −Z
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 });
  const mesh = new THREE.Mesh(plane, mat);
  mesh.receiveShadow = true;
  // Textur-Oben (+V) soll in Laufrichtung zeigen
  mesh.rotation.y = Math.atan2(-dx, -dz);
  mesh.position.set(p.x, p.y + s.y + 0.005, p.z);
  addObject(level, mesh, (dt) => { tex.offset.y -= (speed / 1.2) * dt; });
}

export const TYPES = { conveyor: buildConveyor };
