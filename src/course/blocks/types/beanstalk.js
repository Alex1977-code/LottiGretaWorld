// Baustein `beanstalk`: Bohnenranke – immer kletterbar (anspringen oder davor stehen + hoch drücken).
// Klettern: hoch/runter mit dem Stick, links/rechts um die Ranke, Sprung springt ab, Ducken lässt los.
//
// Parameter:
//   pos:    [x, y, z]  Fußpunkt
//   height: Höhe (Standard 8)
// Kollision: nicht fester Zylinder (r 0,35) mit Flag beanstalk.
// Modell: getModel('beanstalk', { height }) wenn vorhanden, sonst eigene Geometrie (Stängel + Blätter).

import * as THREE from 'three';
import { v3, lin, mixc, smooth, colorize, merge, addStatic, addObject } from '../kit.js';
import { hasModel, getModel } from '../../models/index.js';

export function buildBeanstalk(level, spec) {
  const p = v3(spec.pos);
  const h = spec.height ?? 8;
  level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.35, y0: p.y, y1: p.y + h, beanstalk: true, solid: false, camIgnore: true, tag: 'beanstalk' });
  if (hasModel('beanstalk')) {
    const m = getModel('beanstalk', { height: h });
    m.root.position.set(p.x, p.y, p.z);
    addObject(level, m.root, (dt) => m.update?.(dt, {}));
    return;
  }
  const parts = [];
  const g0 = lin(0x2f9a2c), g1 = lin(0x7be04f), leaf = lin(0x4fcf3c), leafLight = lin(0xa8f27a);
  // Stängel: leicht gewundene Röhre
  const pts = [];
  for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push(new THREE.Vector3(Math.sin(t * 9) * 0.08, t * (h + 0.3), Math.cos(t * 9) * 0.08)); }
  const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.17, 8, false);
  parts.push(colorize(tube.toNonIndexed(), (pp, n, o) => mixc(g0, g1, smooth(-0.3, 0.8, n.x * -0.5 + n.z * 0.6), o)));
  // Blätter abwechselnd rundherum
  for (let y = 0.8, k = 0; y < h; y += 0.9, k++) {
    const a = k * 2.4;
    const lf = new THREE.SphereGeometry(0.42, 8, 5);
    lf.scale(1, 0.18, 0.55);
    lf.translate(0.42, 0, 0);
    lf.rotateZ(0.35);
    lf.rotateY(a);
    lf.translate(0, y, 0);
    parts.push(colorize(lf.toNonIndexed(), (pp, n, o) => mixc(leaf, leafLight, smooth(0, 0.9, n.y), o)));
  }
  const g = merge(parts);
  g.translate(p.x, p.y, p.z);
  addStatic(level, g);
}

export const TYPES = { beanstalk: buildBeanstalk };
