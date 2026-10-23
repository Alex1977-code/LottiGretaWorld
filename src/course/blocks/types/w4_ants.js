// Baustein `ameisenweg` (4-1 „Ameisen laufen auch an den Wänden“): legt einen benannten Ameisen-Laufpfad über Böden und
// senkrechte Wände an (Datenformat und Hilfen: blocks/antpath.js) und zeichnet auf Wunsch eine Ameisenspur (kleine
// Trittspuren/Krümel, verschmolzen, ohne Schatten). Das Verhalten der Ameisen baut der Gegner-Agent; er liest den Pfad
// über spec.antpath = id (resolveAntPath(level, 'id')).
//
//   { type: 'ameisenweg', id,
//     path: [[x, y, z, nx, ny, nz], …]                     Datenformat (siehe antpath.js)
//     | over: { pos, size }, along: 'z', at, from: 3, to: 3   über eine Wand/einen Block hinweg (antPathOver)
//     | around: { pos, size }, along: 'z', at               Rundweg um einen Block (antPathAround, loop)
//     loop: false, round: 0.35 (m Kantenrundung der Normale), show: true (Spur), color: 0x5a3a22, every: 0.32 }
//   level.named.get(id) = { path, L, loop, data, at(s, out), place(root, s, dir) }

import * as THREE from 'three';
import { lin, colorize, merge, hex, addStatic } from '../kit.js';
import { antPath, antPathAt, antPathOver, antPathAround, antOrient, placeOnAntPath } from '../antpath.js';

export function buildAmeisenweg(level, spec) {
  let data = spec.path;
  if (!data && spec.over) data = antPathOver(spec.over, spec);
  if (!data && spec.around) data = antPathAround(spec.around, spec);
  const path = antPath(data ?? [], { loop: spec.loop, round: spec.round });
  const handle = {
    path, data, get L() { return path.L; }, loop: path.loop,
    at: (s, out) => antPathAt(path, s, out),
    place: (root, s, dir) => placeOnAntPath(root, path, s, dir),
  };
  if (spec.id) level.named.set(spec.id, handle);
  if (!level.view || spec.show === false || path.L <= 0) return handle;
  // Spur: abwechselnd links/rechts versetzte, flache Tupfen (Trittspuren) knapp über der Fläche
  const col = lin(hex(spec.color ?? 0x5a3a22));
  const parts = [];
  const every = spec.every ?? 0.32;
  const at = { pos: new THREE.Vector3(), normal: new THREE.Vector3(), tangent: new THREE.Vector3(), s: 0, face: 0 };
  const q = new THREE.Quaternion(), side = new THREE.Vector3();
  const n = Math.min(600, Math.floor(path.L / every));
  for (let i = 0; i <= n; i++) {
    antPathAt(path, i * every, at);
    antOrient(at.normal, at.tangent, q);
    side.crossVectors(at.tangent, at.normal).normalize();
    const off = (i % 2 ? 1 : -1) * 0.14;
    const g = new THREE.CircleGeometry(0.065, 6);
    g.rotateX(-Math.PI / 2);
    g.scale(1.4, 1, 0.8);
    g.applyQuaternion(q);
    g.translate(at.pos.x + side.x * off + at.normal.x * 0.02, at.pos.y + side.y * off + at.normal.y * 0.02, at.pos.z + side.z * off + at.normal.z * 0.02);
    parts.push(colorize(g, (p, nn, o) => { o[0] = col[0]; o[1] = col[1]; o[2] = col[2]; }));
  }
  if (parts.length) addStatic(level, merge(parts), { castShadow: false });
  return handle;
}

export const TYPES = { ameisenweg: buildAmeisenweg };
