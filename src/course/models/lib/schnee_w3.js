// Geometrien und Materialien der Schnee-/Eis-Requisiten (Welt 3), geteilt von den Einzelmodellen
// (kinds/props_schnee_w3.js) und den Instanz-Varianten (lib/instanced_w3.js). Alle Ursprünge = Mitte der Unterseite.
//
//   SNOW_PARTS[name]() → [{ geometry, material, shadow }]   (für 'schneeblock', 'eisblock', 'tanne_schnee', 'eiszapfen')
//   Die Teile sind geteilt (Cache) und werden nie entsorgt.

import { THREE, TAU, Build, cached, vcol, std, metal, mix, col, smoothstep, roundedBox, SIDE } from './kit.js';
import { alongY } from './kit_w3.js';

// ------------------------------------------------------------------ Schneeblock 1 × 1 × 1 m
export function schneeblockGeo(lo = false) {
  return cached(`w3:schneeblock:${lo}`, () => {
    const b = new Build();
    // gepresster Schnee (kühles Blau) mit Schichtlinien
    b.box(0.96, 0.84, 0.96, { v: (x, y, z, nx, ny) => (Math.abs(ny) < 0.5 && Math.abs(Math.sin(y * 20)) < 0.2 ? col(0xa9c3e2) : mix(0xbcd2ec, 0xe2eefa, smoothstep(y / 0.84 + 0.5))) }, { p: [0, 0.42, 0] }, 0.1, lo ? 1 : 2);
    // glatte Schneedecke mit Überhang (Kissen) und wenigen weichen Tropfen
    b.box(1.04, 0.24, 1.04, { v: (x, y, z, nx, ny) => mix(0xd6e4f6, 0xffffff, smoothstep(ny * 0.8 + 0.45)) }, { p: [0, 0.865, 0] }, 0.115, lo ? 1 : 3);
    const drips = lo ? [[-0.3, 1, 0.09], [0.3, -1, 0.085]] : [[-0.3, 1, 0.09], [0.22, 1, 0.07], [0.3, -1, 0.085], [-0.15, -1, 0.065]];
    for (const [u, s, r] of drips) {
      b.sphere(r, 0xf2f8ff, { p: [u, 0.75, s * 0.505], s: [1, 1.5, 0.75] }, lo ? 6 : 10, lo ? 4 : 8);
      b.sphere(r * 0.9, 0xf2f8ff, { p: [s * 0.505, 0.755, -u], s: [0.75, 1.45, 1] }, lo ? 6 : 10, lo ? 4 : 8);
    }
    return b.geometry();
  });
}
export const snowMat = () => vcol(0.62, {}, 'w3snowblock');

// ------------------------------------------------------------------ Eisblock 1 × 1 × 1 m (Hülle + innere Splitter)
export function eisblockGeos() {
  return {
    shell: cached('w3:eisblock:shell', () => {
      const g = roundedBox(1, 1, 1, 0.1, SIDE.ALL, 0, 1);
      g.translate(0, 0.5, 0);
      return g;
    }),
    core: cached('w3:eisblock:core', () => {
      const b = new Build();
      const sh = [[0.0, 0.42, 0.0, 0.32, 0.2], [0.18, 0.35, -0.15, 0.2, 0.8], [-0.2, 0.55, 0.15, 0.22, 1.7], [0.1, 0.62, 0.2, 0.16, 2.4]];
      for (const [x, y, z, s, r] of sh) b.add(new THREE.OctahedronGeometry(1, 0), { v: (xx, yy) => mix(0x7ad0f8, 0xe8fbff, smoothstep(yy * 0.5 + 0.5)) }, { p: [x, y, z], s: [s * 0.6, s, s * 0.6], r: [r, r * 1.3, r * 0.7] });
      // Frostrand oben
      b.box(0.92, 0.05, 0.92, 0xffffff, { p: [0, 0.965, 0] }, 0.025, 1);
      return b.geometry();
    }),
  };
}
export const iceShellMat = () => metal('w3:iceShell', { color: 0xa8e4ff, metalness: 0.05, roughness: 0.06, transparent: true, opacity: 0.62, emissive: 0x0a3a5a, depthWrite: false }, 1.2);
export const iceCoreMat = () => vcol(0.12, { emissive: 0x0a2a40 }, 'w3icecore');

// ------------------------------------------------------------------ Tanne mit Schnee (Höhe 3,5 m)
export const FIR_H = 3.5;
export function tanneGeo(lo = false) {
  return cached(`w3:tanne:${lo}`, () => {
    const b = new Build();
    const rs = lo ? 9 : 14;
    b.cyl(0.16, 0.22, 0.75, 0x7a4a26, { p: [0, 0.37, 0] }, lo ? 6 : 10);
    const tiers = [[1.3, 1.25, 0.55], [1.05, 1.1, 1.25], [0.8, 0.95, 1.9], [0.52, 0.85, 2.5]];
    tiers.forEach(([r, h, y], i) => {
      b.cone(r, h, { v: (x, yy, z, nx, ny) => mix(0x14583a, 0x2f8a4a, smoothstep(yy / h + 0.5)) }, { p: [0, y + h / 2, 0] }, rs);
      // Schneehaube mit Wülsten am Rand
      b.cone(r * 0.82, h * 0.62, { v: (x, yy, z, nx, ny) => mix(0xdfeafa, 0xffffff, smoothstep(ny)) }, { p: [0, y + h * 0.69, 0] }, rs);
      const k = lo ? 0 : 5 + i;
      for (let j = 0; j < k; j++) {
        const a = (j / k) * TAU + i;
        b.sphere(0.11 + (j % 2) * 0.03, 0xf6faff, { p: [Math.cos(a) * r * 0.62, y + h * 0.4, Math.sin(a) * r * 0.62], s: [1.2, 0.8, 1.2] }, 7, 5);
      }
    });
    b.sphere(0.16, 0xffffff, { p: [0, 3.4, 0] }, lo ? 6 : 10, lo ? 4 : 8);
    return b.geometry();
  });
}
export const firMat = () => vcol(0.6, {}, 'w3fir');

// ------------------------------------------------------------------ Eiszapfen (Ursprung = Aufhängung oben, hängt nach −Y)
export function eiszapfenGeo(count = 3, length = 1, lo = false) {
  return cached(`w3:eiszapfen:${count}:${length}:${lo}`, () => {
    const b = new Build();
    const ice = (h) => ({ v: (x, y) => mix(0x5ab8ec, 0xe8fbff, smoothstep((y + h / 2) / h)) });
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + 0.4;
      const rr = count > 1 ? 0.13 : 0;
      const h = length * (i === 0 ? 1 : 0.55 + ((i * 37) % 10) / 25);
      const r = 0.1 * (0.7 + h / length * 0.5);
      b.add(new THREE.ConeGeometry(r, h, lo ? 6 : 8, lo ? 1 : 3), ice(h), alongY([Math.cos(a) * rr, 0, Math.sin(a) * rr], [0, -1, 0], h));
      if (!lo) b.sphere(r * 1.05, 0xf4fbff, { p: [Math.cos(a) * rr, -0.02, Math.sin(a) * rr], s: [1, 0.5, 1] }, 10, 6);
    }
    // Schneekappe an der Aufhängung
    b.sphere(0.24, 0xffffff, { p: [0, 0.0, 0], s: [1, 0.35, 1] }, lo ? 8 : 14, lo ? 5 : 8);
    return b.geometry();
  });
}
export const icicleMat = () => vcol(0.1, { emissive: 0x08283a }, 'w3icicle');

/** Teile je Instanz-Art (Einzelmodell-Optik, geteilte Geometrie/Material). */
export const SNOW_PARTS = {
  schneeblock: () => [{ geometry: schneeblockGeo(true), material: snowMat(), shadow: true }],
  eisblock: () => { const g = eisblockGeos(); return [{ geometry: g.core, material: iceCoreMat(), shadow: true }, { geometry: g.shell, material: iceShellMat(), shadow: false }]; },
  tanne_schnee: () => [{ geometry: tanneGeo(true), material: firMat(), shadow: true }],
  eiszapfen: () => [{ geometry: eiszapfenGeo(3, 1, true), material: icicleMat(), shadow: true }],
};
export { std };
