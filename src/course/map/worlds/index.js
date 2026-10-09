// Registry der Kurs-Weltkarten: sammelt ./w<Welt>.js automatisch (je Datei `export const MAP = { world, … }`).
// Neue Welten sind neue Dateien (Format: docs/KURS-ARCHITEKTUR.md, „Präzisierung (Weltkarte)“).
const modules = import.meta.glob('./w*.js', { eager: true });
const MAPS = {};
for (const [path, mod] of Object.entries(modules)) {
  const M = mod.MAP;
  if (!M) continue;
  if (MAPS[M.world]) console.warn(`[Weltkarte] doppelte Welt ${M.world} in ${path}`);
  MAPS[M.world] = M;
}

export function getWorldMap(world) { return MAPS[world] ?? null; }
export function listWorldMaps() { return Object.keys(MAPS).map(Number).sort((a, b) => a - b); }
