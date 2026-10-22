// Wasserstand ändern (Aktion `{ water: { id, y, speed } }`, Präzisierung Bausteine Welt 3). Liegt bewusst außerhalb von
// types/ (die Registry sammelt nur types/*.js) und importiert nichts aus entities/ (gimmick.js nutzt es).
//
//   setWaterLevel(level, { id, y, speed = 1.5, dy })  →  true, wenn ein Ziel gefunden wurde
//     1) benanntes Objekt mit setLevel(y, speed) (Baustein `lagune`, Motor-Baustein `water` mit id) – beide fahren über
//        den Motor-Haken level.setWaterLevel, sofern vorhanden
//     2) level.setWaterLevel(id, y, speed) (Motor) – alle Wasserformen mit waterId = id
//     3) Rückfall: benanntes Objekt mit Wasserform (`shape`) bzw. Wasserformen mit waterId/tag = id werden direkt
//        angehoben (Oberkante gleitet mit speed m/s auf y; nur die Kollisionsform – die Optik bleibt)
//   dy statt y: relativ zur aktuellen Oberkante.
// waterTop(level, id) → aktuelle Oberkante (m) oder null.

/** Wasserformen eines Namens (Rückfall). */
function waterShapes(level, id) {
  const out = [];
  const o = level.named.get(id);
  if (o?.shape?.water) out.push(o.shape);
  if (Array.isArray(o?.shapes)) for (const s of o.shapes) if (s?.water) out.push(s);
  if (!out.length) level.world.forEach((s) => { if (s.water && (s.waterId === id || s.tag === id)) out.push(s); });
  return out;
}

export function waterTop(level, id) {
  const o = level.named.get(id);
  if (typeof o?.top === 'number') return o.top;
  if (typeof level.waterLevel === 'function') { const y = level.waterLevel(id); if (typeof y === 'number') return y; }
  const sh = waterShapes(level, id);
  return sh.length ? Math.max(...sh.map((s) => s.top)) : null;
}

export function setWaterLevel(level, w) {
  if (!w) return false;
  const id = w.id;
  const speed = w.speed ?? 1.5;
  const o = id !== undefined ? level.named.get(id) : null;
  const cur = waterTop(level, id);
  const y = w.y ?? (cur !== null ? cur + (w.dy ?? 0) : null);
  if (y === null || y === undefined) { console.warn(`[Wasserstand] Ziel „${id}“ fehlt`); return false; }
  if (typeof o?.setLevel === 'function') { o.setLevel(y, speed); return true; }
  if (typeof level.setWaterLevel === 'function' && level.waterLevel?.(id) != null) {
    if (level.setWaterLevel(id, y, speed)) return true;
  }
  const shapes = waterShapes(level, id);
  if (!shapes.length) { console.warn(`[Wasserstand] Wasser „${id}“ fehlt`); return false; }
  // Rückfall: Formen direkt anheben (eine laufende Bewegung je Name)
  level._waterMoves ??= new Map();
  const mv = { shapes, y, speed };
  const had = level._waterMoves.has(id);
  level._waterMoves.set(id, mv);
  if (!had) {
    const off = level.onStep((dt) => {
      const m = level._waterMoves.get(id);
      if (!m) { off(); return; }
      let done = true;
      for (const s of m.shapes) {
        const top = s.top, d = m.y - top, st = m.speed * dt;
        const ny = Math.abs(d) <= st ? m.y : top + Math.sign(d) * st;
        if (ny !== m.y) done = false;
        if (s.type === 'cyl') s.y1 = ny; else s.max = [s.x1, ny, s.z1];
        if (s.id) level.world.update(s.id);
      }
      if (done) { level._waterMoves.delete(id); off(); }
    });
  }
  return true;
}
