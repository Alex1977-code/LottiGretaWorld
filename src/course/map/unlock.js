// Freischaltung der Kurs-Weltkarte (reine Logik, ohne Phaser/Three – auch in Node nutzbar).
//
// Regeln je Eingang (Weltdaten `levels`, siehe docs/KURS-ARCHITEKTUR.md „Präzisierung (Weltkarte)“):
//   { id: '1-3', after: '1-2' | ['1-2', …] (alle müssen geschafft sein), minStars: 10 }
//   minStars zählt die Sterne dieser Welt – oder alle gesammelten Sterne, wenn die Weltdaten starScope: 'all' setzen
//   (Welt 2+: „Sternbedarf zählt alle gesammelten Sterne“).
//   Glasröhre zur nächsten Welt: { id: 'W2', after: '1-Burg', next: 2 } – ihr Weg ist zusätzlich frei, sobald die
//   Welt `next` schon offen ist (bereist oder per Welt-Warp-Röhre freigeschaltet, save.worldOpened(n)).
//   - pathOpen(id):  Weg zum Eingang frei (alle `after` geschafft) → Schranke weg, man kann hinlaufen.
//   - unlocked(id):  Eingang frei (pathOpen und genug Sterne) → Level startbar, sofern es das Level gibt.
//   - reason(id):    null | 'locked' (Weg zu) | 'stars' (zu wenig Sterne) – für Hinweise.
//   - worldOpen(getMap, save, n): Welt n betretbar (Welt 1 immer; sonst schon offen oder die Glasröhre der Welt n−1
//                    dorthin ist frei). Sonderwelten mit MAP.alwaysOpen (Halloween-Welt 31) sind immer offen.
// `save` ist ein CourseSave (oder eine Attrappe mit peek(id), starsInWorld(world), totalStars(), worldOpened(n)).

const asList = (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);

export function levelRule(worldDef, id) {
  return worldDef.levels.find((l) => l.id === id) ?? null;
}

export function isDone(save, id) {
  return !!save.peek(id)?.done;
}

/** Weg zum Eingang frei: alle Vorgänger geschafft (Glasröhre: oder die Zielwelt ist schon offen). */
export function pathOpen(worldDef, save, id) {
  const rule = levelRule(worldDef, id);
  if (!rule) return false;
  if (rule.next && save.worldOpened?.(rule.next)) return true;
  return asList(rule.after).every((a) => isDone(save, a));
}

/** Sterne dieser Welt (alle gespeicherten Sterne der Level-Ids `<welt>-…`). */
export function worldStars(worldDef, save) {
  return save.starsInWorld(worldDef.world);
}

/** Sterne, die für minStars zählen: dieser Welt (Standard) oder alle (starScope: 'all'). */
export function gateStars(worldDef, save) {
  return worldDef.starScope === 'all' ? (save.totalStars?.() ?? save.starsInWorld(worldDef.world)) : save.starsInWorld(worldDef.world);
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
  if (rule.next && save.worldOpened?.(rule.next)) return null;
  if (rule.minStars && gateStars(worldDef, save) < rule.minStars) return 'stars';
  return null;
}

/**
 * Welt n betretbar? Welt 1 immer; sonst, wenn sie schon offen ist (save.worldOpened) oder die Glasröhre der Welt n−1
 * zu ihr frei ist. getMap(n) liefert die Weltdaten (worlds/index.js getWorldMap) – so bleibt dieses Modul rein.
 */
export function worldOpen(getMap, save, n) {
  if (n === 1) return true;
  if (!getMap(n)) return false;
  if (getMap(n).alwaysOpen) return true;   // Sonderwelt (Halloween): immer offen, kein Sternbedarf
  if (save.worldOpened?.(n)) return true;
  const prev = getMap(n - 1);
  const rule = prev?.levels.find((l) => l.next === n);
  return !!rule && reason(prev, save, rule.id) === null;
}

/** Gesammelte Sterne / Stempel eines Levels aus dem Speicherstand. */
export function levelProgress(save, id) {
  const l = save.peek(id);
  return { done: !!l?.done, stars: l ? l.stars.filter(Boolean).length : 0, starFlags: l?.stars?.slice() ?? [], stamp: !!l?.stamp };
}
