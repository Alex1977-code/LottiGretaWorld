// Baustein `boost`: Boost-Pfeil im Boden – beschleunigt die Figur in Pfeilrichtung (kurz kaum lenkbar).
//
// Parameter:
//   pos:   [x, y, z]  Mitte, y = Bodenhöhe
//   dir:   [dx, dz] Richtung (Standard [0, -1] = nach vorn/−Z) oder Gier in rad
//   speed: m/s (Standard 16)
//   size:  [Breite, Länge] (Standard [1.8, 2.4])
// Kollision: nicht fester Auslöser (trigger) mit Flag boost = { x, z, speed }.
// Modell: getModel('boost_arrow', { size }) wenn vorhanden (Blick nach +X), sonst leuchtende Pfeile.

import * as THREE from 'three';
import { v3, addObject } from '../kit.js';
import { hasModel, getModel } from '../../models/index.js';

export function buildBoost(level, spec) {
  const p = v3(spec.pos);
  let dx = 0, dz = -1;
  if (Array.isArray(spec.dir)) { dx = spec.dir[0]; dz = spec.dir[1]; }
  else if (typeof spec.dir === 'number') { dx = Math.cos(spec.dir); dz = -Math.sin(spec.dir); }
  const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  const [w, len] = spec.size ?? [1.8, 2.4];
  const speed = spec.speed ?? 16;
  const hx = (Math.abs(dx) * len + Math.abs(dz) * w) / 2, hz = (Math.abs(dz) * len + Math.abs(dx) * w) / 2;
  level.world.add({ type: 'box', min: [p.x - hx, p.y - 0.05, p.z - hz], max: [p.x + hx, p.y + 0.3, p.z + hz], trigger: true, solid: false, boost: { x: dx, z: dz, speed }, tag: 'boost' });
  const yaw = Math.atan2(-dz, dx);
  let root, mat = null, model = null;
  if (hasModel('boost_arrow')) {
    model = getModel('boost_arrow', { size: [w, len] });
    root = model.root;
  } else {
    root = new THREE.Group();
    // Grundplatte + drei Chevrons (Pfeilspitzen nach +X)
    const plate = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, w), new THREE.MeshStandardMaterial({ color: 0x2a2f55, roughness: 0.6 }));
    plate.position.y = 0.03;
    plate.receiveShadow = true;
    root.add(plate);
    const shape = new THREE.Shape();
    shape.moveTo(-0.25, -0.55); shape.lineTo(0.1, 0); shape.lineTo(-0.25, 0.55); shape.lineTo(-0.02, 0.55); shape.lineTo(0.33, 0); shape.lineTo(-0.02, -0.55); shape.closePath();
    const chev = new THREE.ShapeGeometry(shape);
    chev.rotateX(-Math.PI / 2);
    const geos = [];
    for (let i = 0; i < 3; i++) { const g = chev.clone(); g.scale(1, 1, w / 1.4); g.translate(-len / 2 + 0.45 + i * (len - 0.6) / 3, 0.075, 0); geos.push(g); }
    mat = new THREE.MeshBasicMaterial({ color: 0xffe14a });
    for (const g of geos) root.add(new THREE.Mesh(g, mat));
  }
  root.position.set(p.x, p.y, p.z);
  root.rotation.y = yaw;
  let t = Math.random();
  addObject(level, root, (dt) => {
    t += dt;
    if (mat) mat.color.setHSL(0.13 - 0.05 * (0.5 + 0.5 * Math.sin(t * 8)), 1, 0.55 + 0.1 * Math.sin(t * 8));
    model?.update?.(dt, { t });
  });
}

export const TYPES = { boost: buildBoost };
