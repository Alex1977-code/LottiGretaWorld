// Welt-3-Bausteine Schnee und Eis (Bauplan 3-1 Schneefeld, Eisbahn): Eisfläche, Iglu, Block-Reihen.
// Interaktive Einzelteile (Schnee-/Eisblock, Eiszapfen, Schneehaufen, Tanne) sind Entitäten (entities/kinds/w3_snow.js,
// auch als segments-type über w3_misc.js); die Kulisse (Tannen, Schneemänner, Felsen …) liefert deco_w3.
//
// eisflaeche – spiegelglatte Eisfläche: Kollision mit Flag `ice` (der Motor liest es: träges Beschleunigen/Bremsen,
//   kein Schleudern). Oberseite y + h; darunter ein Körper (Schnee mit Eiskante bzw. Fels) bis pos.y.
//   { type: 'eisflaeche', pos: [x, y, z] (Mitte der Unterseite), size: [w, h, d] ([8, 1, 8]; h ≥ 0,2),
//     body: 'snow' (Standard) | 'rock' | 'none', edge: false (Schneewulst-Kanten 'eiskante' ringsum, nur Optik),
//     under: 0 (verjüngter Unterbau, m), tag }
//   Beispiel: { type: 'eisflaeche', pos: [0, 0, -40], size: [10, 1, 16], edge: true }
//
// iglu – Iglu aus Schneeziegeln (Ø size, 1,8 m hoch bei 3,4), Eingang nach +X lokal (yaw). Kuppel begehbar.
//   { type: 'iglu', pos (Fußpunkt Mitte), size: 3.4, yaw: 0, solid: true }
//
// schneebloecke – Reihe/Feld aus Schnee- oder Eisblöcken (Entitäten schneeblock/eisblock, Instanzen).
//   { type: 'schneebloecke', kind: 'schneeblock'|'eisblock', pos: [x, y, z] (Mitte der Unterseite des Feldes),
//     grid: [nx, ny, nz] ([3, 1, 1]), blocks: [[x, y, z], …] (statt grid), content: 'none' (für alle),
//     contents: { 'i,j,k': Inhalt }, hits, id }   level.named.get(id) = { blocks, left() }

import { v3, sz3, islandParts, themeOf, addStatic, addObject, hex } from '../kit.js';
import { bakeModel } from '../w3kit.js';
import { getModel } from '../../models/index.js';

export function buildEisflaeche(level, spec) {
  const p = v3(spec.pos), s = sz3(spec.size, [8, 1, 8]);
  const h = Math.max(0.2, s.y);
  const x0 = p.x - s.x / 2, x1 = p.x + s.x / 2, z0 = p.z - s.z / 2, z1 = p.z + s.z / 2;
  level.world.add({ type: 'box', min: [x0, p.y, z0], max: [x1, p.y + h, z1], ice: true, tag: spec.tag ?? 'eisflaeche' });
  if (!level.view) return;
  const th = themeOf(level);
  if (h > 0.21 && spec.body !== 'none') {
    const rock = spec.body === 'rock';
    const parts = islandParts(x0 + 0.04, p.y, z0 + 0.04, x1 - 0.04, p.y + h - 0.18, z1 - 0.04, th, {
      top: 'grass', under: spec.under ?? 0, rnd: level.rnd, capH: 0.3,
      bodyColor: rock ? th.rock : hex(th.iceBody ?? th.dirt), sideColor: rock ? th.rockDeep : th.grassSide,
    });
    for (const g of parts) addStatic(level, g);
  }
  const m = getModel('eisflaeche', { size: [s.x, s.z] });
  m.root.position.set(p.x, p.y + h - 0.2, p.z);
  addObject(level, m.root);
  if (spec.edge) {
    const y = p.y + h - 0.02;
    const sides = [
      [x0, z1, 0, s.x], [x1, z0, Math.PI, s.x], [x0, z0, -Math.PI / 2, s.z], [x1, z1, Math.PI / 2, s.z],
    ];
    for (const [x, z, yaw, len] of sides) bakeModel(level, 'eiskante', { length: len }, x, y, z, yaw, 1);
  }
}

export function buildIglu(level, spec) {
  const p = v3(spec.pos);
  const D = spec.size ?? 3.4, k = D / 3.4, yaw = spec.yaw ?? 0;
  bakeModel(level, 'iglu', { size: D }, p.x, p.y, p.z, yaw, 1);
  if (spec.solid !== false) {
    for (const [y0, y1, r] of [[0, 0.6, 1.62], [0.6, 1.2, 1.4], [1.2, 1.78, 0.92]]) {
      level.world.add({ type: 'cyl', x: p.x, z: p.z, r: r * k, y0: p.y + y0 * k, y1: p.y + y1 * k, tag: 'iglu' });
    }
  }
}

export function buildSchneebloecke(level, spec) {
  const kind = spec.kind === 'eisblock' ? 'eisblock' : 'schneeblock';
  const p = v3(spec.pos);
  const out = [];
  const contents = spec.contents ?? {};
  const make = (x, y, z, keys) => {
    let c = spec.content;
    for (const k of keys) if (contents[k] !== undefined) { c = contents[k]; break; }
    const e = level.spawn(kind, { pos: [x, y, z], content: c, hits: spec.hits, hidden: spec.hidden });
    if (e) out.push(e);
  };
  if (spec.blocks) spec.blocks.forEach((b, i) => make(b[0], b[1], b[2], [String(i)]));
  else {
    const [nx, ny, nz] = [spec.grid?.[0] ?? 3, spec.grid?.[1] ?? 1, spec.grid?.[2] ?? 1];
    const g = spec.gap ?? 0;
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) {
      const keys = [`${i},${j},${k}`];
      if (k === 0) keys.push(`${i},${j}`);
      if (k === 0 && j === 0) keys.push(`${i}`);
      make(p.x + (i - (nx - 1) / 2) * (1 + g), p.y + j * (1 + g), p.z + (k - (nz - 1) / 2) * (1 + g), keys);
    }
  }
  const h = { blocks: out, left: () => out.filter((e) => !e.removed && !e.broken).length };
  if (spec.id) level.named.set(spec.id, h);
  return h;
}

export const TYPES = { eisflaeche: buildEisflaeche, iglu: buildIglu, schneebloecke: buildSchneebloecke };
