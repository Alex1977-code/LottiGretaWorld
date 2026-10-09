// Grundriss einer Kurs-Weltkarte aus den Weltdaten (reine Logik, auch in Node nutzbar):
// begehbares Raster, Schranken-Rechtecke, Eingänge, Rückkehrpunkte, Erreichbarkeit.

import { WalkGrid } from './walkgrid.js';

export const GATE_DEPTH = 1.0;      // Dicke einer Schranke entlang des Wegs (m)
export const PODIUM_R = 1.6;        // Radius eines Eingangs-Podests (m)
export const ENTER_R = 1.35;        // so nah an der Podestmitte gilt die Figur als „auf dem Eingang“

/** Alle begehbaren Rechtecke (Geländeblöcke mit walk + zusätzliche walk-Flächen). */
export function walkRects(map) {
  const out = [];
  for (const b of map.ground ?? []) if (b.walk) out.push(b.rect.slice());
  for (const r of map.walk ?? []) out.push(r.slice());
  return out;
}

export function buildWalkGrid(map) {
  return new WalkGrid(walkRects(map), { cell: 0.5, margin: 4 });
}

/** Schranken mit Rechteck [x0, z0, x1, z1] (quer über die Engstelle) und Id. */
export function gateRects(map, grid) {
  return (map.gates ?? []).map((gt, i) => {
    const [x, z] = gt.at;
    const [a, b] = grid.span(x, z, gt.axis);
    const h = GATE_DEPTH / 2;
    const rect = gt.axis === 'x' ? [x - h, a, x + h, b] : [a, z - h, b, z + h];
    return { ...gt, id: gt.id ?? `tor:${gt.for}`, index: i, rect, width: b - a };
  });
}

/** Rückkehrpunkt vor einem Eingang (Standard: 2,6 m Richtung Kamera, +Z). */
export function exitPoint(entrance) {
  if (entrance.exit) return entrance.exit.slice();
  const [x, y, z] = entrance.pos;
  return [x, y, z + 2.6];
}

export function entranceById(map, id) {
  return (map.entrances ?? []).find((e) => e.id === id) ?? null;
}

/**
 * Erreichbare Eingänge ab dem Startpunkt, wenn die Schranken zu den Ids in `open` offen sind (alle anderen zu).
 * Für Tests der Weltdaten: Eine Schranke muss ihren Bereich vollständig abriegeln.
 */
export function reachable(map, grid, open = new Set()) {
  const gates = gateRects(map, grid);
  const closed = new Set();
  for (const gt of gates) {
    if (open.has(gt.for)) continue;
    const [x0, z0, x1, z1] = gt.rect;
    for (let x = x0 + grid.cell / 2; x < x1; x += grid.cell) for (let z = z0 + grid.cell / 2; z < z1; z += grid.cell) closed.add(grid.cellOf(x, z));
  }
  const [sx, , sz] = map.spawn.pos;
  const seen = grid.flood(sx, sz, (k) => closed.has(k));
  const out = [];
  for (const e of map.entrances ?? []) {
    const pts = [e.pos, exitPoint(e)];
    if (pts.some(([x, , z]) => seen.has(grid.cellOf(x, z)))) out.push(e.id);
  }
  for (const r of map.roamers ?? []) {
    if (out.includes(r.level)) continue;
    if ([r.from, r.to].some(([x, , z]) => seen.has(grid.cellOf(x, z)))) out.push(r.level);
  }
  return { ids: out, cells: seen };
}
