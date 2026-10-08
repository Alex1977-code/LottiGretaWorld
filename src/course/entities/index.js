// Registry der Entitäten des Kurs-Modus (Gegner, Items, Schalter …). Sammelt alle Module unter ./kinds/
// automatisch: jedes exportiert `KINDS = { name: (level, spec) => entity }` (Basisklasse CourseEntity).
const modules = import.meta.glob('./kinds/*.js', { eager: true });
const REGISTRY = {};
for (const [path, mod] of Object.entries(modules)) {
  for (const [name, factory] of Object.entries(mod.KINDS ?? {})) {
    if (REGISTRY[name]) console.warn(`[Entitäten] doppelte Art ${name} in ${path}`);
    REGISTRY[name] = factory;
  }
}
export function hasEntityKind(name) { return !!REGISTRY[name]; }
export function listEntityKinds() { return Object.keys(REGISTRY).sort(); }
export function getEntityKind(name) { return REGISTRY[name] ?? null; }
