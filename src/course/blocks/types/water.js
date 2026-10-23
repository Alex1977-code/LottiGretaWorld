// Baustein `water`: Wasserbecken zum Schwimmen (Auftrieb, Schwimmzüge mit Sprung, Ducken taucht ab,
// Sprung an der Oberfläche springt heraus).
//
// Parameter:
//   pos:  [x, y, z]  Mitte der Unterseite (Beckenboden)
//   size: [w, h, d]  h = Wassertiefe; Oberfläche bei y + h
//   (Präzisierung Motor Welt 3, alle optional:)
//   id:      Name → Form-Flag waterId: level.setWaterLevel(id, y, speed) fährt den Wasserspiegel; level.named.get(id) =
//            { start() (fährt auf rise.to), stop(), setLevel(y, speed), top }
//   current: [x, y, z] Strömung in m/s (versetzt schwimmende Figuren; level.currentAt für Gegner/Gegenstände)
//   rise:    { to: y, speed: 1.5, auto: false }  Ziel-Oberfläche für das Signal start (auto: gleich beim Start)
//   show:    false → unsichtbar (z. B. Strömungsbereich in einem größeren Becken)
// Kollision: nicht feste Form mit Flag water. Den Beckenboden/-rand baut das Level (island/wall).
// Die Darstellung folgt der Oberfläche der Form (steigendes/sinkendes Wasser); die Oberfläche ist von unten sichtbar.

import * as THREE from 'three';
import { v3, sz3, themeOf, addObject } from '../kit.js';

export function buildWater(level, spec) {
  const p = v3(spec.pos), s = sz3(spec.size, [6, 2, 6]);
  const th = themeOf(level);
  const top = p.y + s.y;
  const cur = Array.isArray(spec.current) ? { x: spec.current[0] ?? 0, y: spec.current[1] ?? 0, z: spec.current[2] ?? 0 } : null;
  const sid = level.world.add({ type: 'box', min: [p.x - s.x / 2, p.y, p.z - s.z / 2], max: [p.x + s.x / 2, top, p.z + s.z / 2], water: true, solid: false, camIgnore: true, tag: 'water', waterId: spec.id, current: cur });
  const shape = level.world.get(sid);
  if (spec.id) {
    const rise = spec.rise ?? null;
    const handle = {
      shape, get top() { return shape.top; },
      setLevel: (y, speed) => level.setWaterLevel?.(spec.id, y, speed),
      start() { if (rise) level.setWaterLevel?.(spec.id, rise.to, rise.speed ?? 1.5); },
      stop() { level.setWaterLevel?.(spec.id, shape.top, 0); },
    };
    if (!level.named.has(spec.id)) level.named.set(spec.id, handle);
    if (rise?.auto) handle.start();
  }
  if (spec.show === false) return;
  const group = new THREE.Group();
  // Wasserkörper (durchscheinend) und bewegte Oberfläche
  const body = new THREE.Mesh(new THREE.BoxGeometry(s.x - 0.02, s.y - 0.06, s.z - 0.02), new THREE.MeshStandardMaterial({ color: th.waterDeep, transparent: true, opacity: 0.45, roughness: 0.2, depthWrite: false }));
  body.position.set(0, (s.y - 0.06) / 2, 0);
  const nx = Math.max(2, Math.round(s.x)), nz = Math.max(2, Math.round(s.z));
  const surfGeo = new THREE.PlaneGeometry(s.x - 0.02, s.z - 0.02, nx, nz);
  surfGeo.rotateX(-Math.PI / 2);
  const surf = new THREE.Mesh(surfGeo, new THREE.MeshStandardMaterial({ color: th.water, transparent: true, opacity: 0.72, roughness: 0.12, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide }));
  surf.position.y = s.y - 0.04;
  surf.receiveShadow = true;
  body.renderOrder = 1; surf.renderOrder = 1;
  group.add(body, surf);
  group.position.set(p.x, p.y, p.z);
  const pos = surfGeo.attributes.position;
  const base = Float32Array.from(pos.array);
  let t = 0, lastTop = top;
  addObject(level, group, (dt) => {
    t += dt;
    if (shape.top !== lastTop) {
      // Wasserspiegel hat sich bewegt (level.setWaterLevel): Körper und Oberfläche anpassen
      lastTop = shape.top;
      const h = Math.max(0.08, lastTop - p.y);
      body.scale.y = Math.max(0.01, (h - 0.06) / Math.max(0.01, s.y - 0.06));
      body.position.y = (h - 0.06) / 2;
      surf.position.y = h - 0.04;
    }
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      pos.array[i * 3 + 1] = base[i * 3 + 1] + Math.sin(x * 1.7 + t * 2.2) * 0.04 + Math.cos(z * 1.3 + t * 1.7) * 0.04;
    }
    pos.needsUpdate = true;
  });
}

export const TYPES = { water: buildWater };
