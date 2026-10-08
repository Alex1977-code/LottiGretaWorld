// Baustein `pipe`: Warp-Röhre (senkrecht). Auf der Röhre stehen + Ducken → hinab, Teleport, aus der
// Zielröhre wieder heraus (bzw. am Zielpunkt absetzen). Kamera springt mit.
//
// Parameter:
//   id:      Name der Röhre (für target anderer Röhren)
//   pos:     [x, y, z]  Mitte der Unterseite
//   height:  Höhe (Standard 2)
//   radius:  Außenradius (Standard 0.9)
//   color:   'green' (Standard) | Farbe
//   target:  Id einer anderen Röhre (Figur steigt dort heraus) oder [x, y, z] (Absetzpunkt); ohne target
//            ist die Röhre nur Ausgang/Deko
// Kollision: cyl mit Flag pipe = { x, z, top, enterRadius, enter(player) }.
// Modell: getModel('pipe', { height, radius, color }) wenn vorhanden, sonst eigene Geometrie.

import * as THREE from 'three';
import { v3, hex, lin, mixc, smooth, colorize, merge, themeOf, addStatic, addObject } from '../kit.js';
import { hasModel, getModel } from '../../models/index.js';

export function buildPipe(level, spec) {
  const p = v3(spec.pos);
  const h = spec.height ?? 2, R = spec.radius ?? 0.9;
  const top = p.y + h;
  const info = { id: spec.id ?? null, x: p.x, z: p.z, top, pipe: true, enterRadius: Math.max(0.35, R * 0.6) };
  info.enter = (player) => {
    const t = spec.target;
    if (t === undefined || t === null) return;
    let exit = null;
    if (typeof t === 'string') { const other = level.named.get(t); if (other?.pipe) exit = other; }
    else exit = { pos: t };
    if (!exit) { console.warn(`[Röhre] Ziel ${t} fehlt`); return; }
    player.enterPipe({ ...info, exit });
  };
  if (spec.id) level.named.set(spec.id, info);
  level.world.add({ type: 'cyl', x: p.x, z: p.z, r: R + 0.08, y0: p.y, y1: top, pipe: spec.target !== undefined ? info : null, tag: 'pipe' });
  const color = hex(spec.color ?? 'green', 0x3cc24a);
  if (hasModel('pipe')) {
    const m = getModel('pipe', { height: h, radius: R, color });
    m.root.position.set(p.x, p.y, p.z);
    addObject(level, m.root, (dt) => m.update?.(dt, {}));
    return;
  }
  addStatic(level, pipeGeo(p.x, p.y, p.z, h, R, color), { material: 'stone' });
}

/** Röhre: Rohr mit Glanzstreifen, dickerer Rand oben, dunkle Öffnung. */
export function pipeGeo(x, y, z, h, R, color) {
  const base = lin(color), light = mixc(base, [1, 1, 1], 0.45, [0, 0, 0]), dark = mixc(base, [0, 0, 0], 0.45, [0, 0, 0]);
  const parts = [];
  const lipH = Math.min(0.55, h * 0.3);
  const body = new THREE.CylinderGeometry(R * 0.86, R * 0.86, h - lipH + 0.02, 28, 1, true);
  body.translate(x, y + (h - lipH) / 2, z);
  const shadeFn = (p, n, o) => {
    // Glanzstreifen zur Kamera/Sonne (+Z, −X), dunkel hinten
    const k = n.z * 0.6 - n.x * 0.4;
    mixc(dark, base, smooth(-0.8, 0.1, k), o);
    if (k > 0.35) mixc(o, light, smooth(0.35, 0.7, k), o);
  };
  parts.push(colorize(body, shadeFn));
  // Rand: Ring mit runder Oberkante (Lathe)
  const prof = [[R * 0.7, lipH - 0.02], [R * 0.7, lipH], [R * 0.95, lipH], [R, lipH - 0.06], [R, 0.04], [R * 0.95, 0], [R * 0.86, 0]].map(([r, yy]) => new THREE.Vector2(r, yy));
  const lip = new THREE.LatheGeometry(prof.reverse(), 28);
  lip.translate(x, y + h - lipH, z);
  parts.push(colorize(lip.toNonIndexed(), shadeFn));
  // Öffnung: dunkle Scheibe knapp unter dem Rand
  const hole = new THREE.CircleGeometry(R * 0.71, 24);
  hole.rotateX(-Math.PI / 2);
  hole.translate(x, y + h - 0.12, z);
  parts.push(colorize(hole, (p, n, o) => { o[0] = 0.02; o[1] = 0.04; o[2] = 0.02; }));
  return merge(parts);
}

export const TYPES = { pipe: buildPipe };
