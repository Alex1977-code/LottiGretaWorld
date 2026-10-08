// Registry der Level-Bausteine des Kurs-Modus. Sammelt alle Module unter ./types/ automatisch:
// jedes exportiert `TYPES = { name: build(level, spec) }`. Parameter dokumentiert jede Datei im Kopfkommentar.
const modules = import.meta.glob('./types/*.js', { eager: true });
const REGISTRY = {};
for (const [path, mod] of Object.entries(modules)) {
  for (const [name, build] of Object.entries(mod.TYPES ?? {})) {
    if (REGISTRY[name]) console.warn(`[Bausteine] doppelter Typ ${name} in ${path}`);
    REGISTRY[name] = build;
  }
}
export function hasBlockType(name) { return !!REGISTRY[name]; }
export function listBlockTypes() { return Object.keys(REGISTRY).sort(); }
export function getBlockType(name) { return REGISTRY[name] ?? null; }
