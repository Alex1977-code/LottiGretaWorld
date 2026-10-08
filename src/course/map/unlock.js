// Freischaltung der Kurs-Weltkarte (reine Logik, ohne Phaser/Three – auch in Node nutzbar).
//
// Regeln je Eingang (Weltdaten `levels`, siehe docs/KURS-ARCHITEKTUR.md „Präzisierung (Weltkarte)“):
//   { id: '1-3', after: '1-2' | ['1-2', …] (alle müssen geschafft sein), minStars: 10 (Sterne dieser Welt) }
//   - pathOpen(id):  Weg zum Eingang frei (alle `after` geschafft) → Schranke weg, man kann hinlaufen.
//   - unlocked(id):  Eingang frei (pathOpen und genug Sterne) → Level startbar, sofern es das Level gibt.
//   - reason(id):    null | 'locked' (Weg zu) | 'stars' (zu wenig Sterne) – für Hinweise.
// `save` ist ein CourseSave (oder eine Attrappe mit peek(id) und starsInWorld(world)).

const asList = (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);

export function levelRule(worldDef, id) {
  return worldDef.levels.find((l) => l.id === id) ?? null;
}

export function isDone(save, id) {
  return !!save.peek(id)?.done;
}

/** Weg zum Eingang frei: alle Vorgänger geschafft. */
export function pathOpen(worldDef, save, id) {
  const rule = levelRule(worldDef, id);
  if (!rule) return false;
  return asList(rule.after).every((a) => isDone(save, a));
}

/** Sterne dieser Welt (alle gespeicherten Sterne der Level-Ids `<welt>-…`). */
export function worldStars(worldDef, save) {
  return save.starsInWorld(worldDef.world);
}

/** Mögliche Sterne der Welt (Summe der `stars` aller Eingänge, die zur Welt gehören). */
export function worldStarsMax(worldDef) {
  return worldDef.levels.filter((l) => (l.world ?? worldDef.world) === worldDef.world).reduce((n, l) => n + (l.stars ?? 0), 0);
}

/** Eingang frei (startbar, sofern das Level existiert). */
export function unlocked(worldDef, save, id) {
  return reason(worldDef, save, id) === null;
}

/** Warum gesperrt? null = frei, 'locked' = Vorgänger fehlen, 'stars' = zu wenig Sterne. */
export function reason(worldDef, save, id) {
  const rule = levelRule(worldDef, id);
  if (!rule) return 'locked';
  if (!pathOpen(worldDef, save, id)) return 'locked';
  if (rule.minStars && worldStars(worldDef, save) < rule.minStars) return 'stars';
  return null;
}

/** Gesammelte Sterne / Stempel eines Levels aus dem Speicherstand. */
export function levelProgress(save, id) {
  const l = save.peek(id);
  return { done: !!l?.done, stars: l ? l.stars.filter(Boolean).length : 0, starFlags: l?.stars?.slice() ?? [], stamp: !!l?.stamp };
}
