// Registry der Kurs-Weltkarten: sammelt ./w<Welt>.js automatisch (je Datei `export const MAP = { world, … }`).
// Neue Welten sind neue Dateien (Format: docs/KURS-ARCHITEKTUR.md, „Präzisierung (Weltkarte)“).
// Sonderwelten mit Buchstaben-Präfix (Halloween-Welt: MAP.world = 31, MAP.prefix = 'H', Level-Ids „H-1“ …): die
// Präfix-Tabelle entsteht aus den Weltdaten – worldOfLevel('H-1') → 31, worldOfLevel('2-3') → 2.
const modules = import.meta.glob('./w*.js', { eager: true });
const MAPS = {};
const PREFIX = {};   // Präfix (z. B. 'H') → Weltnummer
for (const [path, mod] of Object.entries(modules)) {
  const M = mod.MAP;
  if (!M) continue;
  if (MAPS[M.world]) console.warn(`[Weltkarte] doppelte Welt ${M.world} in ${path}`);
  MAPS[M.world] = M;
  if (M.prefix) PREFIX[M.prefix] = M.world;
}

export function getWorldMap(world) { return MAPS[world] ?? null; }
export function listWorldMaps() { return Object.keys(MAPS).map(Number).sort((a, b) => a - b); }

/** Präfix der Level-Ids einer Welt: MAP.prefix (Sonderwelt) bzw. die Weltnummer als Text. */
export function worldPrefix(world) { return MAPS[world]?.prefix ?? String(world); }

/** Welt einer Level-Id („3-2“ → 3, „H-Burg“ → 31 über MAP.prefix); null, wenn unbekannt. */
export function worldOfLevel(id) {
  const head = String(id ?? '').split('-')[0];
  if (Object.prototype.hasOwnProperty.call(PREFIX, head)) return PREFIX[head];
  const n = parseInt(head, 10);
  return Number.isFinite(n) ? n : null;
}
