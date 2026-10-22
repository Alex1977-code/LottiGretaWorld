// Motor-Ergänzungen Welt 2 (Präzisierung Motor Welt 2), die als Entität leben, auch in LEVEL.segments verwendbar:
// { type: 'pfeld', … } ≙ { kind: 'pfeld', … } in items/blocks. Parameter: siehe die jeweilige Datei unter
// entities/kinds/ (figuren.js, helme.js, topfpflanze.js, holzwand.js, sandblock.js).
//   pfeld, figurenschalter (figuren.js) · helm_kanone, helm_propeller, helm_licht, testgeist (helme.js)
//   topfpflanze (topfpflanze.js) · holzwand (holzwand.js)
//   sandblock (sandblock.js) – als Baustein zusätzlich mehrere auf einmal:
//     { type: 'sandblock', blocks: [[x, y, z], …] }                         einzelne Blöcke (Mitte der Unterseite)
//     { type: 'sandblock', from: [x, y, z], to: [x, y, z] }                 Reihe im Abstand `size` (Brücke)
//     { type: 'sandblock', pos: [x, y, z], grid: [nx, nz] | [nx, ny, nz] }  Feld/Wand ab pos (Mitte der ersten Zelle)
//   gemeinsame Felder (size, delay, respawn, once) gelten für alle Blöcke.
// Bausteine mit eigener Datei: quicksand.js (Treibsand), multilift.js (Viererlift).

const KINDS = ['pfeld', 'figurenschalter', 'helm_kanone', 'helm_propeller', 'helm_licht', 'testgeist', 'topfpflanze', 'holzwand'];

function sandblocks(level, spec) {
  const size = spec.size ?? 1;
  const base = { size, delay: spec.delay, respawn: spec.respawn, once: spec.once };
  const out = [];
  const add = (p, i) => out.push(level.spawn('sandblock', { ...base, pos: p, id: spec.id ? `${spec.id}${i}` : undefined }));
  if (Array.isArray(spec.blocks)) spec.blocks.forEach(add);
  else if (spec.from && spec.to) {
    const d = Math.hypot(spec.to[0] - spec.from[0], spec.to[1] - spec.from[1], spec.to[2] - spec.from[2]);
    const n = Math.max(1, Math.round(d / size) + 1);
    for (let i = 0; i < n; i++) { const t = n === 1 ? 0 : i / (n - 1); add(spec.from.map((a, k) => a + (spec.to[k] - a) * t), i); }
  } else if (spec.grid) {
    const g = spec.grid, nx = g[0] ?? 1, ny = g.length >= 3 ? g[1] : 1, nz = g.length >= 3 ? g[2] : (g[1] ?? 1);
    const p = spec.pos ?? [0, 0, 0];
    let i = 0;
    for (let y = 0; y < ny; y++) for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) add([p[0] + x * size, p[1] + y * size, p[2] - z * size], i++);
  } else add(spec.pos ?? [0, 0, 0], 0);
  return out;
}

export const TYPES = {
  ...Object.fromEntries(KINDS.map((k) => [k, (level, spec) => level.spawn(k, spec)])),
  sandblock: sandblocks,
};
