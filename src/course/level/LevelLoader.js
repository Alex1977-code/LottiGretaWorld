// Level-Loader: baut ein Level aus den Daten (Format: docs/KURS-ARCHITEKTUR.md).
//   segments   → Bausteine (blocks/types/*.js, Registry getBlockType)
//   blocks     → Block-Entitäten (question, brick, hidden, used, coinblock, crystal)
//   enemies    → Gegner-Entitäten (kind)
//   items      → Items (coin, powerup, …)
//   checkpoint → Checkpoint-Fahne(n): [x,y,z] oder [[x,y,z], …] oder { pos, yaw }
//   stars      → 3 grüne Sterne: [[x,y,z] | { pos }]
//   stamp      → Stempel [x,y,z] | { pos }
//   goal       → Zielmast [x,y,z] | { pos, height }
//   marks      → benannte Punkte (nur Tests/Fehlersuche, vom Spiel ignoriert)
// Danach: statische Geometrie verschmelzen, Umriss/Absturzhöhe bestimmen, Hintergrund auslegen.

import { getBlockType } from '../blocks/index.js';

const asPos = (v) => (Array.isArray(v) && typeof v[0] === 'number' ? { pos: v } : v);
const list = (v) => {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) return [v];                       // { pos, yaw }
  return typeof v[0] === 'number' ? [v] : v;               // [x,y,z] oder Liste
};

export function buildLevel(level) {
  const d = level.data;
  for (const seg of d.segments ?? []) {
    const build = getBlockType(seg.type);
    if (!build) { console.warn(`[Level ${d.id}] unbekannter Baustein: ${seg.type}`); continue; }
    try { build(level, seg); } catch (err) { console.error(`[Level ${d.id}] Baustein ${seg.type} fehlgeschlagen:`, err); }
  }
  for (const b of d.blocks ?? []) level.spawn(b.kind ?? 'question', b);
  for (const e of d.enemies ?? []) level.spawn(e.kind, e);
  for (const it of d.items ?? []) level.spawn(it.kind ?? 'coin', it);
  for (const c of list(d.checkpoint)) level.spawn('checkpoint', asPos(c));
  (d.stars ?? []).forEach((s, i) => level.spawn('star', { ...asPos(s), index: i }));
  if (d.stamp) level.spawn('stamp', asPos(d.stamp));
  if (d.goal) level.spawn('goal', asPos(d.goal));
  const bounds = level.computeBounds();
  level.view?.finalize(bounds);
  return level;
}
