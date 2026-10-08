// Registry der Kurs-Level. Sammelt alle Module unter ./w*/ automatisch: jedes exportiert `LEVEL = { id, world, … }`
// (Format: docs/KURS-ARCHITEKTUR.md).
const modules = import.meta.glob('./w*/*.js', { eager: true });
const LEVELS = {};
for (const [path, mod] of Object.entries(modules)) {
  const L = mod.LEVEL;
  if (!L) continue;
  if (LEVELS[L.id]) console.warn(`[Level] doppelte Id ${L.id} in ${path}`);
  LEVELS[L.id] = L;
}
export function getLevel(id) { return LEVELS[id] ?? null; }
export function listLevels(world) {
  return Object.values(LEVELS).filter((l) => world === undefined || l.world === world).map((l) => l.id).sort();
}
