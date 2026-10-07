// Speicherstand in localStorage: Levelfortschritt, Münzen, gefundene Ausgänge.

const KEY = 'lotti-greta-save-v1';

const HEROES = ['lotti', 'greta'];
const EMPTY = () => ({ version: 1, levels: {}, current: 'level1', hero: 'lotti' });

export class SaveGame {
  constructor() {
    this.data = EMPTY();
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === 1) this.data = { ...EMPTY(), ...parsed };
      }
    } catch (_) { /* kein Speicher verfügbar */ }
  }

  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (_) { /* ignorieren */ }
  }

  reset() {
    this.data = EMPTY();
    this.save();
  }

  /** Fortschritt eines Levels (legt leeren Eintrag an). */
  level(id) {
    if (!this.data.levels[id]) this.data.levels[id] = { done: false, secret: false, coins: [false, false, false, false, false] };
    return this.data.levels[id];
  }

  /** Levelabschluss eintragen: Ausgang + gesammelte Münzen (nur hinzufügen, nie entfernen). */
  completeLevel(id, exit, coins) {
    const l = this.level(id);
    l.done = true;
    if (exit === 'secret') l.secret = true;
    coins.forEach((c, i) => { if (c) l.coins[i] = true; });
    this.save();
  }

  coinCount(id) { return this.level(id).coins.filter(Boolean).length; }

  /** Gewählte Heldin ('lotti' | 'greta'). */
  get hero() { return HEROES.includes(this.data.hero) ? this.data.hero : 'lotti'; }
  set hero(v) { if (HEROES.includes(v)) { this.data.hero = v; this.save(); } }

  /** Aktueller Punkt auf der Weltkarte. */
  get current() { return this.data.current; }
  set current(v) { this.data.current = v; this.save(); }

  /** Ist der Pfad (Kante) frei? */
  edgeUnlocked(edge) {
    const l = this.level(edge.from);
    return edge.exit === 'secret' ? l.secret : l.done;
  }

  /** Ist ein Level-Punkt erreichbar? (Start immer, sonst über eine freie Kante) */
  nodeUnlocked(world, key) {
    if (key === world.start) return true;
    return world.edges.some((e) => e.to === key && this.edgeUnlocked(e));
  }
}

export const saveGame = new SaveGame();
