// Gemeinsame Grundlage der Gegner des Kurs-Modus (Präzisierung Gegner/Power-ups). Erweitert CourseEntity um
// einen Zustandsautomaten (state, stateT), Laufen mit Kanten-/Wandumkehr, Patrouille auf Wegpunkten, Verfolgen,
// die Standard-Konter und Beute. Je Gegnertyp eine Datei unter entities/kinds/ (Muster: pilzling.js).
//
// Gemeinsame spec-Felder aller Gegner (Level-Daten):
//   id      Name (level.named)              pos   [x, y, z] Fußpunkt
//   dir     [dx, dz] oder Gier (rad)        yaw   Gier (rad) – Alternative zu dir; Standard: Blick zur Kamera (+Z)
//   path    [[x,y,z], …] Wegpunkte (Patrouille hin und her; loop: true = Runde)
//   wake    m – erst ab dieser Nähe zur Figur aktiv (Standard 18)
//   edges   false = an Kanten nicht umdrehen (Standard true)
//   drop    Beute beim Besiegen: 'coin' | 'coins:N' | Power-up-Name (wachstumsbeere, krallen, …) | 'star:I'
// Laufzeit-Felder: state, stateT (s seit Zustandswechsel), defeated (true, sobald besiegt), dir {x, z}.
// Hook: level.onEnemyDefeated?.(enemy) – einmal je besiegtem Gegner (Arena-Archetyp zählt mit).
//
// Standard-Konter (überschreibbar): draufspringen → platt (squashed, 'stomp' = Abprall), Stampfattacke von oben →
// platt, Krallen-Sturzflug → wegfliegen, seitlich → Treffer der Figur. onHit: fire | claw | shell | throw | bomb |
// mega | star | bump → wegfliegen (flipped); pound (Stampfwelle daneben) → platt, wenn auf gleicher Höhe.

import { CourseEntity } from './CourseEntity.js';

const TAU = Math.PI * 2;
export const wrapAngle = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; else if (a < -Math.PI) a += TAU; return a; };
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** Laufrichtung aus spec.dir ([dx, dz] oder Gier) bzw. spec.yaw; Standard +Z (zur Kamera). */
export function dirOf(spec, def = [0, 1]) {
  let dx = def[0], dz = def[1];
  if (Array.isArray(spec.dir)) { dx = spec.dir[0]; dz = spec.dir[1]; }
  else if (typeof spec.dir === 'number') { dx = Math.cos(spec.dir); dz = -Math.sin(spec.dir); }
  else if (typeof spec.yaw === 'number') { dx = Math.cos(spec.yaw); dz = -Math.sin(spec.yaw); }
  const l = Math.hypot(dx, dz) || 1;
  return { x: dx / l, z: dz / l };
}

/** Beute-/Inhaltsangabe → Entitäten erzeugen ('coin', 'coins:N', 'star:I', Power-up-Name). */
export function spawnLoot(level, what, x, y, z) {
  if (!what) return;
  if (typeof what === 'object') {
    if (what.star !== undefined) level.spawn('star', { pos: [x, y, z], index: what.star });
    else if (what.coins) spawnLoot(level, `coins:${what.coins}`, x, y, z);
    else if (what.power) level.spawn('powerup', { pos: [x, y, z], power: what.power, emerge: false });
    return;
  }
  const s = String(what);
  let m;
  if (s === 'coin') { level.spawn('coin', { pos: [x, y + 0.2, z] }); return; }
  if ((m = /^coins?:(\d+)$/.exec(s))) {
    const n = +m[1];
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU; level.spawn('coin', { pos: [x + Math.cos(a) * 0.9, y + 0.2, z + Math.sin(a) * 0.9] }); }
    return;
  }
  if ((m = /^star(?::(\d+))?$/.exec(s))) { level.spawn('star', { pos: [x, y + 0.2, z], index: +(m[1] ?? 0) }); return; }
  level.spawn('powerup', { pos: [x, y, z], power: s, emerge: false });
}

export class Enemy extends CourseEntity {
  constructor(level, spec = {}, kind = 'enemy') {
    super(level, spec, kind);
    this.enemy = true;
    this.state = 'idle';
    this.stateT = 0;
    this.defeated = false;
    this.turnCooldown = 0;
    this.wake = spec.wake ?? 18;
    this.edges = spec.edges !== false;
    this.dir = dirOf(spec);
    this.yaw = Math.atan2(-this.dir.z, this.dir.x);
    this.path = spec.path?.length >= 2 ? spec.path.map((p) => ({ x: p[0], y: p[1], z: p[2] })) : null;
    this.loop = !!spec.loop;
    this.target = 1;
    this.pathStep = 1;
    this.squashTime = 0.6;
  }

  setState(s) { this.state = s; this.stateT = 0; }

  get player() { return this.level.player; }

  /** Figur lebt und ist steuerbar (keine Röhre/Ziel/Tod)? */
  playerActive() {
    const p = this.level.player;
    return !!p && !p.dead && p.mode !== 'script';
  }

  /** Waagerechter Abstand zur Figur (Infinity ohne aktive Figur). */
  playerDist() {
    const p = this.level.player;
    if (!p) return Infinity;
    return Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
  }

  /** Figur in Sichtweite (waagerecht < range, Höhenunterschied < dy)? */
  canSee(range, dy = 2.5) {
    if (!this.playerActive()) return false;
    const p = this.level.player;
    return this.playerDist() < range && Math.abs(p.pos.y - this.pos.y) < dy;
  }

  /** Richtung zur Figur (Einheitsvektor in out.x/out.z, out.d = Abstand). */
  toPlayer(out = {}) {
    const p = this.level.player;
    const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z, d = Math.hypot(dx, dz) || 1e-6;
    out.x = dx / d; out.z = dz / d; out.d = d;
    return out;
  }

  /** Gier weich zur Richtung (dx, dz) drehen. */
  faceToward(dx, dz, dt, rate = 10) {
    if (Math.abs(dx) + Math.abs(dz) < 1e-6) return;
    const want = Math.atan2(-dz, dx);
    this.yaw += wrapAngle(want - this.yaw) * Math.min(1, dt * rate);
  }

  facePlayer(dt, rate = 10) {
    if (!this.level.player) return;
    const t = this.toPlayer(this._tp ?? (this._tp = {}));
    this.faceToward(t.x, t.z, dt, rate);
  }

  // ------------------------------------------------------------------ Bewegung

  /** Gehen in this.dir (Patrouille: zum nächsten Wegpunkt) mit Umkehr an Kanten und Wänden. */
  walk(dt, speed, opts = {}) {
    if (this.turnCooldown > 0) this.turnCooldown -= dt;
    if (this.path) this.followPath();
    if (this.edges && this.grounded && this.turnCooldown <= 0 && !this.groundAhead(this.dir.x, this.dir.z, 0.15, 1.1)) this.turn();
    this.vel.x = this.dir.x * speed;
    this.vel.z = this.dir.z * speed;
    const res = this.moveWithGravity(dt, opts);
    if (res.hitWall && this.turnCooldown <= 0) this.turn(res);
    this.faceToward(this.dir.x, this.dir.z, dt);
    return res;
  }

  /** Auf die Figur zu (bleibt an Kanten stehen statt hinunterzulaufen). */
  chase(dt, speed, opts = {}) {
    const t = this.toPlayer(this._tp ?? (this._tp = {}));
    if (t.d > 0.25) { this.dir.x = t.x; this.dir.z = t.z; }
    let s = t.d > 0.25 ? speed : 0;
    if (this.edges && this.grounded && !this.groundAhead(this.dir.x, this.dir.z, 0.15, 1.1)) s = 0;
    this.vel.x = this.dir.x * s;
    this.vel.z = this.dir.z * s;
    const res = this.moveWithGravity(dt, opts);
    this.faceToward(this.dir.x, this.dir.z, dt);
    return res;
  }

  /** Stehen (Schwerkraft, Plattformen tragen mit). */
  stand(dt) {
    this.vel.x = 0; this.vel.z = 0;
    return this.moveWithGravity(dt);
  }

  followPath() {
    const t = this.path[this.target];
    const dx = t.x - this.pos.x, dz = t.z - this.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.25) this.nextTarget();
    else { this.dir.x = dx / d; this.dir.z = dz / d; }
  }

  nextTarget() {
    const n = this.path.length;
    if (this.loop) { this.target = (this.target + this.pathStep + n) % n; return; }
    if (this.target + this.pathStep >= n || this.target + this.pathStep < 0) this.pathStep = -this.pathStep;
    this.target += this.pathStep;
  }

  /** Umdrehen (Kante/Wand). Mit Wand-Normale: Spiegelung, sonst Umkehr. */
  turn(res) {
    if (this.path) {
      const n = this.path.length;
      this.pathStep = -this.pathStep;
      this.target = this.loop ? (this.target + this.pathStep + n) % n : clamp(this.target + this.pathStep, 0, n - 1);
      const t = this.path[this.target];
      const dx = t.x - this.pos.x, dz = t.z - this.pos.z, d = Math.hypot(dx, dz) || 1;
      this.dir.x = dx / d; this.dir.z = dz / d;
    } else if (res?.wallNormal && (res.wallNormal.x || res.wallNormal.z)) {
      const n = res.wallNormal, d = this.dir.x * n.x + this.dir.z * n.z;
      if (d < 0) { this.dir.x -= 2 * d * n.x; this.dir.z -= 2 * d * n.z; } else { this.dir.x = -this.dir.x; this.dir.z = -this.dir.z; }
    } else {
      this.dir.x = -this.dir.x; this.dir.z = -this.dir.z;
    }
    this.turnCooldown = 0.25;
  }

  // ------------------------------------------------------------------ Niederlagen

  /** Einmal je Gegner: als besiegt melden, Beute erzeugen. */
  markDefeated() {
    if (this.defeated) return;
    this.defeated = true;
    const d = this.spec.drop;
    if (d) spawnLoot(this.level, d, this.pos.x, this.pos.y, this.pos.z);
    this.level.onEnemyDefeated?.(this);
  }

  /** Platt (draufgesprungen): liegt kurz, verschwindet dann. */
  squash(dur = this.squashTime) {
    if (this.defeated) return;
    this.setState('squashed');
    this.squashTime = dur;
    this.touch = false;
    this.vel.set(0, 0, 0);
    this.level.effects?.dust(this.pos, 5);
    this.markDefeated();
  }

  /** Wegfliegen (Feuer, Krallen, Panzer, Explosion …), von source weg. */
  flip(source, up = 8) {
    if (this.defeated) return;
    this.setState('flipped');
    this.touch = false;
    let ax = this.pos.x - (source?.pos?.x ?? this.pos.x), az = this.pos.z - (source?.pos?.z ?? this.pos.z);
    const l = Math.hypot(ax, az);
    if (l < 1e-4) { ax = 0; az = 0; } else { ax /= l; az /= l; }
    this.vel.set(ax * 3, up, az * 3);
    this.level.sfx('stomp');
    this.level.effects?.sparks(this.center(), 6);
    this.markDefeated();
  }

  /** squashed/flipped abarbeiten. true = erledigt (update() kann zurückkehren). */
  updateDefeat(dt) {
    if (this.state === 'squashed') {
      // platt liegen bleiben – in der Luft (z. B. im Sprung getroffen) fällt er herunter, Plattformen tragen mit
      this.vel.x = 0; this.vel.z = 0;
      this.moveWithGravity(dt);
      if (this.stateT > this.squashTime) this.kill();
      return true;
    }
    if (this.state === 'flipped') {
      this.vel.y -= 30 * dt;
      this.pos.x += this.vel.x * dt; this.pos.y += this.vel.y * dt; this.pos.z += this.vel.z * dt;
      if (this.stateT > 1.5 || this.pos.y < this.level.killY) this.kill();
      return true;
    }
    return false;
  }

  // ------------------------------------------------------------------ Standard-Konter

  onPlayer(player, contact) {
    if (this.defeated) return 'none';
    if (contact.pound) { this.onStomp(player, true); return 'none'; }
    if (contact.fromAbove) { this.onStomp(player, false); return 'stomp'; }
    if (contact.dive) { this.onHit('claw', player); return 'none'; }
    return 'hurt';
  }

  onStomp() { this.squash(); }

  onHit(kind, source) {
    if (this.defeated) return;
    if (kind === 'pound') {
      if (source && Math.abs(source.pos.y - this.pos.y) < 0.6) { this.squash(); this.level.sfx('stomp'); }
      else this.flip(source);
      return;
    }
    this.flip(source);
  }

  /** Stampfattacke der Figur gerade neben diesem Gegner gelandet (eigener, größerer Radius als attackArea)? */
  poundLandedNear(radius) {
    const p = this.level.player;
    // stateTime ist im Schritt der Landung genau 0 (setState in Player.land) → nur einmal je Stampfattacke
    if (!p || p.dead || p.state !== 'land' || !p.poundLanded || p.stateTime > 0.004) return false;
    if (Math.abs(p.pos.y - this.pos.y) > 1.2) return false;
    return this.distanceTo(p.pos.x, this.pos.y + this.half.y, p.pos.z) < radius;
  }
}
