// Items des Kurs-Modus: coin (Bitcoin), coins (Reihe/Kreis), star (grüner Stern), stamp (Stempel),
// powerup (Wachstumsbeere, Krallen-Anzug, Funkenblüte, Riesentrank, Funkelstern, 1-Up).
//
// coin:    { kind:'coin', pos }                       pos = Fußpunkt (Münze 0,8 m hoch)
// coins:   { kind:'coins', from, to, n }              n Münzen gleichmäßig auf der Strecke
//          { kind:'coins', pos, r, n }                 n Münzen im Kreis (Radius r) um pos
// star:    { pos, index }                              (Loader: LEVEL.stars[i])
// stamp:   { pos }                                     (Loader: LEVEL.stamp)
// powerup: { kind:'powerup', pos, power, emerge }     power = wachstumsbeere | krallen | funken | riese | stern |
//          oneup (Aliasse wie krallenAnzug erlaubt); emerge = steigt aus einem Block auf
// Münzen werden als Instanzen gezeichnet (Pool 'coin', Modell 'coin' falls vorhanden), Sterne/Stempel/Power-ups
// über getModel ('star', 'stamp', 'powerup_*', 'oneup') mit eigenem Rückfall (entities/visuals.js).
// Bereits gespeicherte Sterne/Stempel erscheinen durchscheinend und zählen erneut nur für diesen Lauf.

import { CourseEntity } from '../CourseEntity.js';
import { coinTemplate, starModel, stampModel, powerupModel } from '../visuals.js';
import { normalizePower } from '../../player/powers.js';

class Coin extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'coin');
    this.half.set(0.38, 0.42, 0.38);
    this.pool = level.view?.pool('coin', coinTemplate, { castShadow: false, capacity: 64 }) ?? null;
    this.idx = this.pool ? this.pool.alloc() : -1;
    this.phase = (this.pos.x * 1.7 + this.pos.z * 0.9) % 6.28;
    this.render(0, 0);
  }

  render(dt, t) {
    if (this.idx < 0) return;
    this.pool.set(this.idx, this.pos.x, this.pos.y + Math.sin(t * 2.6 + this.phase) * 0.05, this.pos.z, t * 2.6 + this.phase);
  }

  onPlayer() {
    this.collect();
    return 'collect';
  }

  onHit(kind) { if (kind === 'claw' || kind === 'mega' || kind === 'fire') this.collect(); }

  collect() {
    if (!this.alive) return;
    this.level.addCoins(1);
    this.level.sfx('coin');
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 0.45, z: this.pos.z }, 6);
    this.kill();
  }

  dispose() {
    if (this.idx >= 0) this.pool.release(this.idx);
    this.idx = -1;
    super.dispose();
  }
}

class Star extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'star');
    this.index = spec.index ?? 0;
    this.half.set(0.5, 0.6, 0.5);
    this.ghost = !!level.runtime.starsSaved[this.index];
    if (level.view) this.setModel(starModel({ ghost: this.ghost }));
  }

  onPlayer() {
    if (!this.alive) return 'none';
    this.level.runtime.collectStar(this.index);
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 0.6, z: this.pos.z }, 16);
    this.kill();
    return 'collect';
  }
}

class Stamp extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'stamp');
    this.half.set(0.5, 0.6, 0.5);
    this.ghost = level.runtime.stampSaved;
    if (level.view) this.setModel(stampModel({ ghost: this.ghost }));
  }

  onPlayer() {
    if (!this.alive) return 'none';
    this.level.runtime.collectStamp();
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 0.6, z: this.pos.z }, 14);
    this.kill();
    return 'collect';
  }
}

const WALKERS = new Set(['wachstumsbeere', 'oneup']);

class Powerup extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'powerup');
    this.power = normalizePower(spec.power ?? spec.content ?? 'wachstumsbeere');
    this.half.set(0.38, 0.4, 0.38);
    this.shadow = 0.4;
    this.emerge = spec.emerge ? 0.6 : 0;      // s, steigt aus dem Block
    this.baseY = this.pos.y;
    if (this.emerge) { this.pos.y -= 0.85; this.touch = false; }
    this.walk = WALKERS.has(this.power) ? (spec.speed ?? 2.6) : 0;
    const f = spec.dir ?? [1, 0];
    const l = Math.hypot(f[0], f[1]) || 1;
    this.dir = { x: f[0] / l, z: f[1] / l };
    this.bounce = this.power === 'stern';
    if (level.view) this.setModel(powerupModel(this.power));
  }

  update(dt) {
    if (this.emerge > 0) {
      this.emerge -= dt;
      this.pos.y = this.baseY - 0.85 * Math.max(0, this.emerge / 0.6);
      if (this.emerge <= 0) { this.pos.y = this.baseY; this.touch = true; this.grounded = false; }
      return;
    }
    if (!this.walk && !this.bounce) return;
    if (this.walk) { this.vel.x = this.dir.x * this.walk; this.vel.z = this.dir.z * this.walk; }
    if (this.bounce) { this.vel.x = this.dir.x * 3; this.vel.z = this.dir.z * 3; }
    const res = this.moveWithGravity(dt);
    if (res.hitWall) { const n = res.wallNormal; const d = this.dir.x * n.x + this.dir.z * n.z; this.dir.x -= 2 * d * n.x; this.dir.z -= 2 * d * n.z; }
    if (this.bounce && res.grounded) this.vel.y = 8;
  }

  onPlayer(player) {
    if (!this.alive || this.emerge > 0) return 'none';
    player.collectPowerup(this.power);
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 0.4, z: this.pos.z }, 10);
    this.kill();
    return 'collect';
  }
}

/** Mehrere Münzen auf einer Strecke oder im Kreis (erzeugt einzelne coin-Entitäten). */
function coins(level, spec) {
  const n = spec.n ?? 5;
  if (spec.from && spec.to) {
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      level.spawn('coin', { pos: spec.from.map((a, k) => a + (spec.to[k] - a) * t) });
    }
  } else {
    const p = spec.pos ?? [0, 0, 0], r = spec.r ?? 1.5;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; level.spawn('coin', { pos: [p[0] + Math.cos(a) * r, p[1], p[2] + Math.sin(a) * r] }); }
  }
  return null;
}

export const KINDS = {
  coin: (level, spec) => new Coin(level, spec),
  coins,
  star: (level, spec) => new Star(level, spec),
  stamp: (level, spec) => new Stamp(level, spec),
  powerup: (level, spec) => new Powerup(level, spec),
};
