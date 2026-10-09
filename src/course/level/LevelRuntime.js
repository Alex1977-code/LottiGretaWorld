// Level-Laufzeit: Timer, Münzen, Sterne, Stempel, Leben, Checkpoint, Tod → Neustart am Checkpoint,
// Zielmast → Ergebnis. Liest/schreibt CourseSave. Status: play | dying | goal | done | gameover.
//
// Tod: Leben −1 nach der Todesanimation; Leben 0 → Spielende (Leben wieder 5, zur Weltkarte).
// Neustart am Checkpoint (sonst Start): Figur groß ohne Power-up, Timer wieder voll, eingesammelte Münzen,
// Sterne und besiegte Gegner bleiben (kinderfreundlich, Präzisierung Motor).
// Zielmast: Anteil der Greifhöhe 0..1 → Punkte 100 … 5000; Spitze (≥ 0,95) → Extraleben.

import { courseSave, START_LIVES } from './CourseSave.js';

export const POLE_POINTS = [[0.95, 5000], [0.8, 2000], [0.6, 1000], [0.4, 800], [0.2, 400], [0, 100]];

export class LevelRuntime {
  constructor(level, save = courseSave) {
    this.level = level;
    this.save = save;
    const d = level.data;
    this.timeLimit = d.timeLimit ?? 400;
    this.timeLeft = this.timeLimit;
    this.elapsed = 0;
    this.coins = 0;
    const saved = save.peek(d.id);
    this.starCount = Array.isArray(d.stars) ? d.stars.length : 0;
    this.stars = Array.from({ length: Math.max(3, this.starCount) }, () => false);
    this.starsSaved = (saved?.stars ?? [false, false, false]).slice();
    this.stamp = false;
    this.stampSaved = !!saved?.stamp;
    this.checkpoint = null;
    this.status = 'play';
    this.pole = null;
    this.points = 0;
    this.warned = false;
    this.deaths = 0;
    this.livesGained = 0;
  }

  get lives() { return this.save.lives; }

  update(dt) {
    if (this.status !== 'play') return;
    this.elapsed += dt;
    this.timeLeft -= dt;
    if (!this.warned && this.timeLeft <= 100 && this.timeLimit > 120) { this.warned = true; this.level.sfx('timewarn'); }
    if (this.timeLeft <= 0) { this.timeLeft = 0; this.level.player.die('time'); }
  }

  addCoins(n = 1) {
    this.coins += n;
    const lives = this.save.addCoins(n);
    if (lives > 0) { this.livesGained += lives; this.level.sfx('oneup'); }
  }

  addLife(n = 1) { this.save.lives = this.save.lives + n; this.livesGained += n; }

  collectStar(i) {
    if (i < 0 || i >= this.stars.length) return;
    this.stars[i] = true;
    this.level.sfx('star');
  }

  collectStamp() { this.stamp = true; this.level.sfx('stamp'); }

  setCheckpoint(pos, yaw) {
    const first = !this.checkpoint || this.checkpoint.pos.some((v, i) => Math.abs(v - pos[i]) > 0.01);
    this.checkpoint = { pos: pos.slice(), yaw: yaw ?? Math.PI / 2 };
    if (first) this.level.sfx('checkpoint');
  }

  /** Startpunkt für Neustart (Checkpoint oder Levelstart). */
  respawnPoint() {
    if (this.checkpoint) return this.checkpoint;
    const s = this.level.data.start ?? {};
    return { pos: s.pos ?? [0, 1, 0], yaw: s.yaw ?? Math.PI / 2 };
  }

  onPlayerDeath() {
    if (this.status === 'play' || this.status === 'goal') this.status = 'dying';
  }

  /** Nach der Todesanimation: Leben abziehen, neu starten oder Spielende. */
  onPlayerDeathDone() {
    this.deaths++;
    const lives = this.save.lives - 1;
    if (lives <= 0) {
      this.save.lives = START_LIVES;
      this.status = 'gameover';
      this.level.scene?.onGameOver?.();
      return;
    }
    this.save.lives = lives;
    this.respawn();
  }

  respawn() {
    const p = this.level.player;
    const r = this.respawnPoint();
    p.dead = false;
    p.big = true;
    p.power = 'none';
    p.powerTime = 0;
    p.reset(r.pos, r.yaw);
    p.invuln = 1.0;
    this.timeLeft = this.timeLimit;
    this.warned = false;
    this.status = 'play';
    this.level.onTeleport();
  }

  /** Zielmast berührt (frac = Greifhöhe 0..1). */
  reachGoal(frac) {
    if (this.status !== 'play') return false;
    this.status = 'goal';
    this.pole = Math.max(0, Math.min(1, frac));
    this.points = POLE_POINTS.find(([f]) => this.pole >= f)[1];
    this.top = this.pole >= 0.95;
    if (this.top) { this.addLife(1); this.level.sfx('oneup'); }
    this.level.sfx('goalpole');
    return true;
  }

  /** Siegessequenz vorbei: speichern, Ergebnis zeigen. */
  finish() {
    if (this.status === 'done') return this.result;
    this.status = 'done';
    const d = this.level.data;
    const nStars = Math.max(3, this.starCount);   // Dioramen haben 5 Sterne, Arenen 1
    const entry = this.save.completeLevel(d.id, { stars: this.stars.slice(0, nStars), stamp: this.stamp, time: this.elapsed, pole: this.pole ?? 0 });
    this.result = {
      id: d.id, title: d.title, world: d.world, pole: this.pole ?? 0, points: this.points, top: !!this.top,
      coins: this.coins, stars: this.stars.slice(0, nStars), starsSaved: this.starsSaved, stamp: this.stamp, stampSaved: this.stampSaved,
      time: this.elapsed, timeLeft: this.timeLeft, bestTime: entry.bestTime, lives: this.save.lives,
    };
    this.level.scene?.onLevelDone?.(this.result);
    return this.result;
  }

  info() {
    return {
      status: this.status, time: +this.timeLeft.toFixed(2), coins: this.coins, stars: this.stars.slice(), stamp: this.stamp,
      lives: this.save.lives, checkpoint: this.checkpoint?.pos ?? null, pole: this.pole, points: this.points,
    };
  }
}
