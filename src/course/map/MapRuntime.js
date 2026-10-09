// Laufzeit der Kurs-Weltkarte – ersetzt LevelRuntime im Level-Objekt der Karte (gleiche Schnittstelle, die
// Level/Player/Entitäten aufrufen): kein Timer, keine Sterne/Zielmast, Münzen gehen direkt in den Speicherstand.
// Fällt die Figur doch einmal (Meer, Absturz), kostet das kein Leben: Sie erscheint am letzten sicheren Punkt.

export class MapRuntime {
  /**
   * @param {object} level Level der Karte
   * @param {object} save CourseSave
   * @param {{ safePoint(): { pos: number[], yaw: number } }} host Karten-Szene
   */
  constructor(level, save, host) {
    this.level = level;
    this.save = save;
    this.host = host;
    this.status = 'play';
    this.timeLimit = 0;
    this.timeLeft = 0;
    this.elapsed = 0;
    this.coins = 0;
    this.stars = [false, false, false];
    this.starsSaved = [false, false, false];
    this.stamp = false;
    this.stampSaved = false;
    this.checkpoint = null;
    this.deaths = 0;
  }

  get lives() { return this.save.lives; }

  update(dt) { this.elapsed += dt; }

  addCoins(n = 1) {
    this.coins += n;
    if (this.save.addCoins(n) > 0) this.level.sfx('oneup');
  }

  addLife(n = 1) { this.save.lives = this.save.lives + n; }
  collectStar() {}
  collectStamp() {}
  setCheckpoint() {}
  reachGoal() { return false; }
  finish() { return null; }

  respawnPoint() { return this.host.safePoint(); }

  onPlayerDeath() { if (this.status === 'play') this.status = 'dying'; }

  /** Nach der Absturz-Animation: am letzten sicheren Punkt weiter, ohne Leben abzuziehen. */
  onPlayerDeathDone() {
    this.deaths++;
    this.respawn();
  }

  respawn() {
    const p = this.level.player;
    const r = this.respawnPoint();
    p.dead = false;
    p.reset(r.pos, r.yaw);
    p.invuln = 1.0;
    this.status = 'play';
    this.level.onTeleport();
  }

  info() {
    return { status: this.status, coins: this.coins, lives: this.save.lives, deaths: this.deaths };
  }
}
