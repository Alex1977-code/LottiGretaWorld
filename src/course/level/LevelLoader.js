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
//
// Aufbau-Haken (Präzisierung „Leistung und Level-Haken 2“), beide optional, je fn(level):
//   LEVEL.prebuild  vor dem ersten Baustein (z. B. lokale Themen-Variante, deren Farben die Bausteine schon nutzen)
//   LEVEL.build     nach Bausteinen, Blöcken und Gegnern, vor den Items (Münzen, Power-ups, Checkpoint, Sterne,
//                   Stempel, Ziel) und vor dem Verschmelzen: addStatic landet in den Abschnitts-Meshes,
//                   Kollisionsformen zählen für Umriss/Absturzhöhe und den Hintergrund. Spieler, Kamera und Archetyp
//                   gibt es hier noch nicht (dafür LEVEL.setup).
//
// Schattenwurf je Baustein (Präzisierung „Leistung und Level-Haken 2“): `shadow: false` bzw. `castShadow: false` an einem
// Eintrag in segments – alles, was dieser Baustein zeichnet (statische Geometrie, eigene Objekte, Registry-Modelle,
// Modelle seiner Entitäten), wirft keinen Sonnenschatten (empfängt ihn aber). Für Inseln, Plattformen, Deko und Kulisse,
// deren Schatten man nicht sieht oder nicht braucht.

import { getBlockType } from '../blocks/index.js';

const asPos = (v) => (Array.isArray(v) && typeof v[0] === 'number' ? { pos: v } : v);
const list = (v) => {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) return [v];                       // { pos, yaw }
  return typeof v[0] === 'number' ? [v] : v;               // [x,y,z] oder Liste
};

/** Baustein bauen; ohne Schattenwurf, wenn spec.shadow/castShadow === false. */
function buildSegment(level, build, seg) {
  const v = level.view;
  if (!v || (seg.shadow !== false && seg.castShadow !== false)) { build(level, seg); return; }
  const addStatic = v.addStatic, add = v.add;
  v.addStatic = (g, o) => addStatic.call(v, g, { ...(o ?? {}), castShadow: false });
  v.add = (obj, update) => { obj?.traverse?.((m) => { if (m.isMesh) m.castShadow = false; }); return add.call(v, obj, update); };
  try { build(level, seg); } finally { v.addStatic = addStatic; v.add = add; }
}

function runHook(level, name) {
  const fn = level.data[name];
  if (typeof fn !== 'function') return;
  try { fn(level); } catch (err) { console.error(`[Level ${level.data.id}] LEVEL.${name} fehlgeschlagen:`, err); }
}

export function buildLevel(level) {
  const d = level.data;
  runHook(level, 'prebuild');
  for (const seg of d.segments ?? []) {
    const build = getBlockType(seg.type);
    if (!build) { console.warn(`[Level ${d.id}] unbekannter Baustein: ${seg.type}`); continue; }
    try { buildSegment(level, build, seg); } catch (err) { console.error(`[Level ${d.id}] Baustein ${seg.type} fehlgeschlagen:`, err); }
  }
  for (const b of d.blocks ?? []) level.spawn(b.kind ?? 'question', b);
  for (const e of d.enemies ?? []) level.spawn(e.kind, e);
  runHook(level, 'build');
  for (const it of d.items ?? []) level.spawn(it.kind ?? 'coin', it);
  for (const c of list(d.checkpoint)) level.spawn('checkpoint', asPos(c));
  (d.stars ?? []).forEach((s, i) => level.spawn('star', { ...asPos(s), index: i }));
  if (d.stamp) level.spawn('stamp', asPos(d.stamp));
  if (d.goal) level.spawn('goal', asPos(d.goal));
  const bounds = level.computeBounds();
  level.view?.finalize(bounds);
  return level;
}
