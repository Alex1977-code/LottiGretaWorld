// Baustein `trampoline`: Sprungfeld – Landen schleudert hoch (gehaltene Sprungtaste ×1,15,
// Stampfattacke ×1,3).
//
// Parameter:
//   pos:      [x, y, z]  Mitte der Unterseite (auf dem Boden)
//   strength: Absprunggeschwindigkeit in m/s (Standard 17 ≈ 5,4 m Höhe)
//   size:     Durchmesser (Standard 1.6)
// Kollision: cyl (Höhe 0,55) mit Flag bounce = strength.
// Modell: getModel('trampoline', { size }) wenn vorhanden (state { squash }), sonst eigene Geometrie.

import * as THREE from 'three';
import { v3, lin, colorize, merge, mixc, smooth, addObject } from '../kit.js';
import { hasModel, getModel } from '../../models/index.js';

const H = 0.55;

export function buildTrampoline(level, spec) {
  const p = v3(spec.pos);
  const size = spec.size ?? 1.6, r = size / 2;
  const owner = { squash: 0, onBounce() { this.squash = 1; } };
  level.world.add({ type: 'cyl', x: p.x, z: p.z, r, y0: p.y, y1: p.y + H, bounce: spec.strength ?? 17, owner, tag: 'trampoline' });
  let root, top, model = null;
  if (hasModel('trampoline')) {
    model = getModel('trampoline', { size });
    root = model.root;
  } else {
    root = new THREE.Group();
    const base = new THREE.CylinderGeometry(r, r * 1.05, H - 0.12, 20);
    base.translate(0, (H - 0.12) / 2, 0);
    const red = lin(0xff4a3d), white = lin(0xfff6ee), dark = lin(0x8a1d16);
    const baseG = colorize(base.toNonIndexed(), (pp, n, o) => {
      const stripe = Math.floor((Math.atan2(pp.z, pp.x) / (Math.PI * 2)) * 12 + 12) % 2;
      mixc(stripe ? red : white, dark, n.y < -0.5 ? 0.5 : 0, o);
    });
    const ring = new THREE.TorusGeometry(r * 0.92, 0.08, 6, 24);
    ring.rotateX(Math.PI / 2);
    ring.translate(0, H - 0.1, 0);
    const ringG = colorize(ring.toNonIndexed(), (pp, n, o) => mixc(lin(0xc9ccd6), white, smooth(-0.5, 0.8, n.y), o));
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 });
    const m = new THREE.Mesh(merge([baseG, ringG]), mat);
    m.castShadow = true; m.receiveShadow = true;
    root.add(m);
    const pad = new THREE.CylinderGeometry(r * 0.86, r * 0.86, 0.1, 20);
    top = new THREE.Mesh(pad, new THREE.MeshStandardMaterial({ color: 0x3d8bff, roughness: 0.4 }));
    top.position.y = H - 0.08;
    top.receiveShadow = true;
    root.add(top);
  }
  root.position.set(p.x, p.y, p.z);
  addObject(level, root, (dt) => {
    owner.squash = Math.max(0, owner.squash - dt * 4);
    const s = Math.sin(owner.squash * Math.PI) * owner.squash;
    if (model) model.update?.(dt, { squash: s });
    else { top.position.y = H - 0.08 - s * 0.18; root.scale.set(1 + s * 0.08, 1 - s * 0.12, 1 + s * 0.08); }
  });
}

export const TYPES = { trampoline: buildTrampoline };
