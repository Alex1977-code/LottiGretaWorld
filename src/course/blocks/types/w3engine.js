// Böden für die Motor-Erweiterungen Welt 3 (Präzisierung Motor Welt 3): Eisbahn, Schneefeld, Stachelboden.
// Die Formflags dazu wirken auch an anderen Bausteinen: `ice` (island, platform, ramp: Parameter ice: true – nur Physik,
// Optik unverändert), `snow` (Schneebälle wachsen), `spikes` (verletzt beim Draufstehen; Schlittschuh/Statue sicher).
//
// eisbahn      { type: 'eisbahn', pos: [x, y, z] (Mitte der Unterseite), size: [w, h, d] (h Standard 0,3), snow?: false,
//                model?: true | false (Standard: Modell nur bis 48 m² Fläche) }
//              Kollision: box mit ice: true. Optik: kleine Bahnen mit dem Modell eisflaeche (spiegelglatte Eisplatte mit
//              Kufen-Spuren und Schneewülsten, ≈ 250 Dreiecke/m²), große als verschmolzene Platte mit Schneerand (wenige
//              Dreiecke); darunter ein Eiskörper, wenn h > 0,2. Oberkante = pos.y + h.
// schneefeld   { type: 'schneefeld', pos, size: [w, h, d] (Standard [8, 1, 8]), under: 2.5, ice?: false }
//              Insel mit Schneedecke (Schneebälle wachsen darauf); Kollision: box mit snow: true (und ice, falls gesetzt).
// stachelboden { type: 'stachelboden', pos, size: [w, h, d] (h Standard 0,25 – flach genug zum Hinauflaufen), color? }
//              Stacheln auf einem Sockel; Kollision: box mit spikes: true (Figur wird beim Draufstehen getroffen und
//              prallt nach oben ab; mit Schlittschuh, als Statue oder unverwundbar sicher). Gegner stehen darauf normal.

import * as THREE from 'three';
import { v3, sz3, box, islandParts, themeOf, addStatic, addObject, colorize, merge, lin, mixc, smooth } from '../kit.js';
import { hasModel, getModel } from '../../models/index.js';

/** Schnee-Farben für islandParts (Thema-Schlüssel wie grass). */
const SNOW = {
  grassTop: 0xf6faff, grassTop2: 0xe8f0fb, grassSide: 0xdfe9f6, grassRim: 0xffffff,
  dirt: 0x8ea3c4, dirtDeep: 0x6c80a6, rockDeep: 0x55688c,
};

function buildEisbahn(level, spec) {
  const p = v3(spec.pos), s = sz3(spec.size, [8, 0.3, 8]);
  const top = p.y + s.y;
  level.world.add({ type: 'box', min: [p.x - s.x / 2, p.y, p.z - s.z / 2], max: [p.x + s.x / 2, top, p.z + s.z / 2], ice: true, snow: !!spec.snow, tag: 'eisbahn' });
  const plate = Math.min(0.2, s.y);
  if (s.y - plate > 0.02) {
    addStatic(level, box(s.x, s.y - plate, s.z, p.x, p.y + (s.y - plate) / 2, p.z, 0x5aa7dc, { r: 0.12, topColor: 0x9ad6f5, bottomShade: 0.7 }));
  }
  const useModel = spec.model ?? (s.x * s.z <= 48);
  if (useModel && hasModel('eisflaeche')) {
    const m = getModel('eisflaeche', { size: [s.x, s.z] });
    m.root.position.set(p.x, top - 0.2, p.z);
    m.root.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
    addObject(level, m.root, (dt) => m.update?.(dt, {}));
    return;
  }
  // große Bahn: glatte Platte mit hellem Glanzstreifen und flachem Schneerand (statisch verschmolzen)
  const parts = [box(s.x, plate, s.z, p.x, top - plate / 2, p.z, 0x8fd8f8, { r: 0.05, topColor: 0xd8f6ff, sideShade: 0.02 })];
  const rim = 0.32, rh = 0.07;
  parts.push(box(s.x, rh, rim, p.x, top + rh / 2 - 0.02, p.z - s.z / 2 + rim / 2, 0xf4f9ff, { r: 0.03, seg: 1 }));
  parts.push(box(s.x, rh, rim, p.x, top + rh / 2 - 0.02, p.z + s.z / 2 - rim / 2, 0xf4f9ff, { r: 0.03, seg: 1 }));
  parts.push(box(rim, rh, s.z - rim * 2, p.x - s.x / 2 + rim / 2, top + rh / 2 - 0.02, p.z, 0xf4f9ff, { r: 0.03, seg: 1 }));
  parts.push(box(rim, rh, s.z - rim * 2, p.x + s.x / 2 - rim / 2, top + rh / 2 - 0.02, p.z, 0xf4f9ff, { r: 0.03, seg: 1 }));
  // Kufen-Spuren: feine helle Bögen
  const n = Math.max(1, Math.round(s.x * s.z / 40));
  for (let i = 0; i < n; i++) {
    const u = (((i * 0.618) % 1) - 0.5) * (s.x - 1.5), v = (((i * 0.381 + 0.17) % 1) - 0.5) * (s.z - 1.5);
    const g = new THREE.TorusGeometry(0.9 + (i % 3) * 0.4, 0.025, 3, 16, Math.PI * 0.8).toNonIndexed();
    g.rotateX(-Math.PI / 2); g.rotateY(i * 1.3);
    colorize(g, (q, nn, o) => { o[0] = 0.9; o[1] = 0.97; o[2] = 1; });
    g.translate(p.x + u, top + 0.006, p.z + v);
    parts.push(g);
  }
  addStatic(level, merge(parts), { material: 'stone', castShadow: false });
}

function buildSchneefeld(level, spec) {
  const p = v3(spec.pos), s = sz3(spec.size, [8, 1, 8]);
  const x0 = p.x - s.x / 2, x1 = p.x + s.x / 2, z0 = p.z - s.z / 2, z1 = p.z + s.z / 2, y0 = p.y, y1 = p.y + s.y;
  level.world.add({ type: 'box', min: [x0, y0, z0], max: [x1, y1, z1], snow: true, ice: !!spec.ice, tag: spec.tag ?? 'schneefeld' });
  const theme = { ...themeOf(level), ...SNOW, checker: false };
  for (const g of islandParts(x0, y0, z0, x1, y1, z1, theme, { top: 'grass', under: spec.under ?? 2.5, rnd: level.rnd })) addStatic(level, g);
}

function buildStachelboden(level, spec) {
  const p = v3(spec.pos), s = sz3(spec.size, [4, 0.25, 4]);
  const top = p.y + s.y;
  level.world.add({ type: 'box', min: [p.x - s.x / 2, p.y, p.z - s.z / 2], max: [p.x + s.x / 2, top, p.z + s.z / 2], spikes: true, tag: 'stachelboden' });
  const baseH = Math.max(0.06, s.y - 0.35);
  const parts = [box(s.x, baseH, s.z, p.x, p.y + baseH / 2, p.z, spec.color ?? 0x6a6d7a, { r: 0.06 })];
  const nx = Math.max(1, Math.round(s.x / 0.5)), nz = Math.max(1, Math.round(s.z / 0.5));
  const tip = lin(0xf2f4fa), foot = lin(0x8a8fa0);
  for (let i = 0; i < nx; i++) {
    for (let k = 0; k < nz; k++) {
      const g = new THREE.ConeGeometry(0.17, top - (p.y + baseH) + 0.02, 6, 1).toNonIndexed();
      const h = top - (p.y + baseH);
      colorize(g, (q, n, o) => mixc(foot, tip, smooth(-h / 2, h / 2, q.y), o));
      g.translate(p.x - s.x / 2 + (i + 0.5) * (s.x / nx), p.y + baseH + h / 2, p.z - s.z / 2 + (k + 0.5) * (s.z / nz));
      parts.push(g);
    }
  }
  addStatic(level, merge(parts), { material: 'stone' });
}

export const TYPES = { eisbahn: buildEisbahn, schneefeld: buildSchneefeld, stachelboden: buildStachelboden };
