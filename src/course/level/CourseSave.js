// Speicherstand des Kurs-Modus (localStorage 'lotti-greta-course-v1', Vertrag):
//   { hero, lives, coins, world, mapPos, levels: { '1-1': { done, stars: [b,b,b], stamp, bestTime, bestPole } } }
// Sterne/Stempel werden beim Levelabschluss übernommen (nur hinzufügen, nie entfernen); Bestzeit = kleinste
// verbrauchte Zeit (s), bestPole = höchster Zielmast-Anteil (0..1). Leben: Standard 5, Spielende → wieder 5.
// Freischaltung (für die Weltkarte): unlocked(id, chain) + starsInWorld(world).

import { saveGame } from '../../systems/SaveGame.js';

const KEY = 'lotti-greta-course-v1';
export const START_LIVES = 5;
const HEROES = ['lotti', 'greta'];

const empty = () => ({ version: 1, hero: null, lives: START_LIVES, coins: 0, world: 1, mapPos: null, levels: {} });

export class CourseSave {
  constructor() {
    this.data = empty();
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === 1) this.data = { ...empty(), ...parsed, levels: { ...(parsed.levels ?? {}) } };
      }
    } catch (_) { /* kein Speicher verfügbar */ }
    if (!HEROES.includes(this.data.hero)) this.data.hero = saveGame.hero ?? 'lotti';
  }

  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (_) { /* ignorieren */ }
  }

  reset() { this.data = empty(); this.data.hero = saveGame.hero ?? 'lotti'; this.save(); }

  get hero() { return HEROES.includes(this.data.hero) ? this.data.hero : 'lotti'; }
  set hero(v) {
    if (!HEROES.includes(v)) return;
    this.data.hero = v;
    this.save();
    try { saveGame.hero = v; } catch (_) { /* Klassik-Spielstand optional */ }
  }

  get lives() { return this.data.lives ?? START_LIVES; }
  set lives(v) { this.data.lives = Math.max(0, Math.min(99, v | 0)); this.save(); }

  get coins() { return this.data.coins ?? 0; }

  /** Münzen gutschreiben; je volle 100 ein Extraleben. Liefert die Zahl gewonnener Leben. */
  addCoins(n) {
    const before = this.coins;
    this.data.coins = before + n;
    const lives = Math.floor(this.data.coins / 100) - Math.floor(before / 100);
    if (lives > 0) this.data.lives = Math.min(99, this.lives + lives);
    this.save();
    return lives;
  }

  /** Eintrag eines Levels (legt einen leeren an). */
  level(id) {
    let l = this.data.levels[id];
    if (!l) { l = { done: false, stars: [false, false, false], stamp: false, bestTime: null, bestPole: 0 }; this.data.levels[id] = l; }
    return l;
  }

  peek(id) { return this.data.levels[id] ?? null; }

  /** Levelabschluss eintragen: { stars: [b,b,b], stamp, time (verbrauchte s), pole (0..1) }. */
  completeLevel(id, { stars = [], stamp = false, time = null, pole = 0 } = {}) {
    const l = this.level(id);
    l.done = true;
    stars.forEach((s, i) => { if (s) l.stars[i] = true; });
    if (stamp) l.stamp = true;
    if (time !== null && (l.bestTime === null || time < l.bestTime)) l.bestTime = Math.round(time * 100) / 100;
    if (pole > (l.bestPole ?? 0)) l.bestPole = pole;
    this.save();
    return l;
  }

  starsInWorld(world) {
    let n = 0;
    for (const [id, l] of Object.entries(this.data.levels)) if (id.startsWith(`${world}-`)) n += l.stars.filter(Boolean).length;
    return n;
  }

  totalStars() { let n = 0; for (const l of Object.values(this.data.levels)) n += l.stars.filter(Boolean).length; return n; }

  /** Freischaltung: erstes Level der Kette frei, sonst Vorgänger geschafft; minStars für Burg/Boss. */
  unlocked(id, chain = [], minStars = 0, world = null) {
    const i = chain.indexOf(id);
    if (i > 0 && !this.peek(chain[i - 1])?.done) return false;
    if (minStars && this.starsInWorld(world ?? id.split('-')[0]) < minStars) return false;
    return true;
  }
}

export const courseSave = new CourseSave();
