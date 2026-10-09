// Baron Brummbär – Endgegner Welt 1 (1-Burg, Bossstraße). Fährt im roten Sportwagen vor der Figur her (der Wagen
// blickt zur Figur, +Z; die Straße läuft als Laufband-Illusion unter beiden durch), schwenkt über die Fahrspuren
// und wirft Kickbomben in hohem Bogen auf die Figur (Ankündigung: Ausholen 0,5 s, roter Landering am Boden).
// Die Figur kickt eine gelandete Bombe zurück (hineinlaufen; Rennen + Berührung = aufheben, Aktion = werfen).
// Trifft die Bombe ihn (`onBombHit`):
//   - vorn/Cockpit (Bombe trifft die vordere Wagenhälfte) → voller Treffer: Hut fliegt, Baron taumelt (hit 0,6 s,
//     dann benommen 1,5 s, keine Würfe);
//   - Seite/Heck → Blechschaden; drei Blechschäden zählen als ein voller Treffer (Bauplan: „am Auto erst nach drei
//     Treffern“).
// 3 volle Treffer → besiegt: sackt zusammen, Auto qualmt, dann flieht er nach vorn in die Ferne (state 'gone').
// Muster steigern sich mit den Treffern (Phase = maxHp − hp + 1):
//   Phase 1: ein Wurf alle 3,2 s, langsames Pendeln (folgt der Figur ein wenig)
//   Phase 2: Würfe alle 2,5 s, jeder zweite ein Doppelwurf (links/rechts der Figur), schnelleres Pendeln
//   Phase 3: Würfe alle 2,7 s im Wechsel mit Schlangenlinien – Ankündigung 0,8 s (Reifen qualmen, Hupe), dann legen
//            die Vorderreifen Feuerspuren (Entität fire_trail), die mit der Straße auf die Figur zu wandern.
// Berührung: Wagen/Baron verletzt die Figur (draufspringen = nur Abprall). Funkelstern/Riesentrank wirken nicht
// (kein `enemy`), Explosionen in der Nähe zählen nicht – nur direkte Treffer (onBombHit).
// Zielhilfe: zurückgekickte Bomben, die grob auf ihn zurollen, lenken leicht zu ihm ein (kinderfreundlich).
//
// Daten: { kind: 'baron', id: 'baron', pos: [x, y, z] (Wagenmitte auf der Fahrbahn im Kampf),
//          lane: [xMin, xMax] (Fahrbereich der Wagenmitte, Standard [−4.5, 4.5]),
//          arena: { x: [xMin, xMax], z: [zMin, zMax] } (Bereich der Figur → Wurfziele), hp: 3,
//          drift: 6 (m/s, Wanderung der Feuerspur), seed? }
// Steuerung (Boss-Archetyp): begin() Auftritt, reset() Kampf neu (Tod der Figur), state, hp, phase, carHits,
//   throws, hits, bombs (lebende eigene), trail (fire_trail).
// Zustände: wait (unsichtbar) → intro (fährt heran, 2,4 s) → drive ⇄ throw | swerve (warn → fire) → hit → stunned →
//   drive … → hit → defeated (1,8 s) → flee (2,8 s) → gone.
// Modell 'baron_brummbaer' (mit Auto), Landeanzeige 'boss_marker'.

import { CourseEntity } from '../CourseEntity.js';
import { getModel } from '../../models/index.js';
import { ballistic, LandingMarkers } from './bomb_cannon.js';
import { Rnd } from '../../../three/world/geometry.js';

const YAW = -Math.PI / 2;          // Wagen blickt nach +Z (zur Figur)
const THROW = 1.0, RELEASE = 0.5;  // Wurfanimation (s), Bombe verlässt die Tatze bei 50 %
const HIT = 0.6, STUN = 1.5, DEFEAT = 1.8, FLEE = 2.8, INTRO = 2.4;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ease = (k) => 1 - (1 - k) * (1 - k) * (1 - k);

const PHASES = [
  null,
  { interval: 3.2, double: 0, sway: 2.2, swayW: 0.9, follow: 0.55, speed: 2.6, flight: 1.05, fuse: 2.7, swerve: false },
  { interval: 2.5, double: 2, sway: 4.0, swayW: 1.3, follow: 0.25, speed: 4.0, flight: 0.95, fuse: 2.45, swerve: false },
  { interval: 2.7, double: 3, sway: 3.2, swayW: 1.6, follow: 0.4, speed: 4.5, flight: 0.95, fuse: 2.35, swerve: true },
];

class Baron extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'baron');
    this.enemy = false;
    this.boss = true;
    this.half.set(1.25, 1.45, 2.45);
    this.shadow = 0;
    this.home = this.pos.clone();
    this.yaw = YAW;
    this.lane = spec.lane ?? [-4.5, 4.5];
    const ar = spec.arena ?? {};
    this.arena = { x: ar.x ?? [this.lane[0] - 1, this.lane[1] + 1], z: ar.z ?? [this.home.z + 5, this.home.z + 20] };
    this.maxHp = spec.hp ?? 3;
    this.hp = this.maxHp;
    this.defeated = false;
    this.carHits = 0;
    this.throws = 0;
    this.bombsThrown = 0;
    this.hits = 0;
    this.hitLog = [];
    this.state = 'wait';
    this.stateT = 0;
    this.clock = 0;
    this.throwCool = 1.6;
    this.throwCount = 0;
    this.swerveCool = 0;
    this.released = false;
    this.steer = 0;
    this.hitGrace = 0;
    this.shake = 0;
    this.touch = false;
    this.visible = false;
    this.rnd = new Rnd(spec.seed ?? 0xb4a7);
    this.bombs = [];
    this.markers = new LandingMarkers(level);
    this.trail = level.spawn('fire_trail', { drift: [0, 0, spec.drift ?? 6], life: 2.4, zMax: this.arena.z[1] + 2 });
    this.swerveDir = 1;
    this.fireT = 0;
    if (level.view) {
      this.setModel(getModel('baron_brummbaer', { withCar: true }));
      this.model.root.visible = false;
    }
  }

  get phase() { return clamp(this.maxHp - this.hp + 1, 1, 3); }
  get P() { return PHASES[this.phase]; }
  get active() { return this.state === 'drive' || this.state === 'throw' || this.state === 'swerve'; }

  setState(s) { this.state = s; this.stateT = 0; this.released = false; }

  /** Auftritt: der Wagen rast von vorn heran und bremst vor der Figur. */
  begin() {
    if (this.state !== 'wait') return;
    this.visible = true;
    if (this.model) this.model.root.visible = true;
    this.pos.set(this.home.x, this.home.y, this.home.z - 46);
    this.setState('intro');
    this.level.sfx('panic');
  }

  /** Kampf zurücksetzen (Tod der Figur): volle Lebenspunkte, Bomben/Feuer weg, Auftritt erneut. */
  reset() {
    this.hp = this.maxHp;
    this.defeated = false;
    this.carHits = 0;
    this.throwCool = 1.6;
    this.swerveCool = 0;
    this.throwCount = 0;
    for (const b of this.bombs) if (!b.removed) b.kill();
    this.bombs.length = 0;
    this.markers.clear();
    this.trail?.clear();
    this.visible = false;
    if (this.model) this.model.root.visible = false;
    this.touch = false;
    this.pos.copy(this.home);
    this.setState('wait');
  }

  // ------------------------------------------------------------------ Schritt

  update(dt) {
    this.stateT += dt;
    this.clock += dt;
    if (this.hitGrace > 0) this.hitGrace -= dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 2.5);
    this.bombs = this.bombs.filter((b) => !b.removed);
    this.markers.update(dt);
    switch (this.state) {
      case 'wait': return;
      case 'intro': {
        const k = Math.min(1, this.stateT / INTRO);
        this.pos.z = this.home.z - 46 * (1 - ease(k));
        this.steer = Math.sin(this.stateT * 5) * (1 - k) * 0.6;
        if (k >= 1) { this.touch = true; this.setState('drive'); this.level.sfx('slam'); this.level.effects?.dust(this.pos, 8, 1.6); }
        return;
      }
      case 'drive': this.drive(dt); this.aimAssist(dt); this.maybeAttack(dt); return;
      case 'throw': this.drive(dt, 0.4); this.aimAssist(dt); this.doThrow(); return;
      case 'swerve': this.doSwerve(dt); this.aimAssist(dt); return;
      case 'hit': this.drive(dt, 0); if (this.stateT >= HIT) this.setState(this.hp <= 0 ? 'defeated' : 'stunned'); return;
      case 'stunned':
        this.drive(dt, 0.25);
        if (this.stateT >= STUN) { this.setState('drive'); this.throwCool = 0.9; }
        return;
      case 'defeated':
        if (this.stateT % 0.25 < dt) this.level.effects?.dust({ x: this.pos.x, y: this.pos.y + 1.3, z: this.pos.z - 2 }, 2, 0.6);
        if (this.stateT >= DEFEAT) { this.setState('flee'); this.level.sfx('panic'); }
        return;
      case 'flee': {
        const k = this.stateT;
        this.pos.z = this.home.z - 2.2 * k * k * k - 2 * k;
        this.pos.x += (0 - this.pos.x) * Math.min(1, dt * 1.5);
        this.steer = Math.sin(k * 9) * 0.5;
        if (this.stateT % 0.12 < dt) this.level.effects?.dust({ x: this.pos.x, y: this.pos.y + 1.4, z: this.pos.z - 2.2 }, 2, 0.4);
        if (this.stateT >= FLEE) { this.setState('gone'); this.visible = false; if (this.model) this.model.root.visible = false; }
        return;
      }
      default: break;
    }
  }

  /** Seitliches Pendeln (folgt der Figur ein wenig), k = Tempo-Faktor. */
  drive(dt, k = 1) {
    const P = this.P;
    const pl = this.level.player;
    const px = pl && !pl.dead ? pl.pos.x : 0;
    const want = clamp(px * P.follow + Math.sin(this.clock * P.swayW) * P.sway, this.lane[0], this.lane[1]);
    this.moveX(want, P.speed * k, dt);
    this.pos.z += (this.home.z - this.pos.z) * Math.min(1, dt * 2);
  }

  moveX(want, speed, dt) {
    const d = clamp(want - this.pos.x, -speed * dt, speed * dt);
    this.pos.x += d;
    this.steer += ((dt > 0 ? d / dt / Math.max(1, speed) : 0) - this.steer) * Math.min(1, dt * 6);
  }

  maybeAttack(dt) {
    this.throwCool -= dt;
    if (this.swerveCool > 0) this.swerveCool -= dt;
    const pl = this.level.player;
    if (this.throwCool > 0 || !pl || pl.dead || pl.mode === 'script') return;
    if (this.P.swerve && this.swerveCool <= 0 && this.throwCount > 0 && this.throwCount % 2 === 0) {
      this.setState('swerve');
      this.swerveDir = this.pos.x > 0 ? -1 : 1;
      this.swerveCool = 6;
      this.level.sfx('panic');
      return;
    }
    if (this.bombs.length >= 4) { this.throwCool = 0.5; return; }
    this.setState('throw');
    this.level.sfx('swoop');
  }

  /** Wurf: bei 50 % der Animation verlässt die Bombe (bzw. zwei) die rechte Tatze. */
  doThrow() {
    if (!this.released && this.stateT >= THROW * RELEASE) {
      this.released = true;
      const P = this.P;
      this.throwCount++;
      const dbl = P.double && this.throwCount % P.double === 0;
      const pl = this.level.player;
      const base = pl ? [pl.pos.x, this.home.y, pl.pos.z] : [this.home.x, this.home.y, this.home.z + 10];
      // etwas vor die Figur (Richtung Baron) – sie kann die Bombe direkt zurückkicken
      base[2] -= 1.6;
      if (dbl) {
        this.throwBomb([base[0] - 2.2, base[1], base[2]], P);
        this.throwBomb([base[0] + 2.2, base[1], base[2] + 0.6], P);
      } else {
        this.throwBomb([base[0] + this.rnd.real(-0.6, 0.6), base[1], base[2]], P);
      }
      this.throws++;
    }
    if (this.stateT >= THROW) { this.setState('drive'); this.throwCool = this.P.interval; }
  }

  /** Weltposition der Wurf-Tatze (deterministisch; Modell: rechte Tatze über der Schulter). */
  handPos() {
    // lokal (vorn +X, oben +Y, rechts +Z) → Welt bei Gier −π/2: x = −lokalZ, z = +lokalX
    return [this.pos.x - 0.62, this.pos.y + 2.75, this.pos.z - 0.6];
  }

  throwBomb(target, P) {
    const t = [clamp(target[0], this.arena.x[0], this.arena.x[1]), target[1], clamp(target[2], this.arena.z[0], this.arena.z[1])];
    const h = this.handPos();
    const v = ballistic(h, t, P.flight);
    const b = this.level.spawn('kickbombe', { pos: h, vel: v, owner: this, fuse: P.flight + P.fuse });
    if (!b) return;
    this.bombs.push(b);
    this.bombsThrown++;
    this.markers.add(b, t[0], t[1], t[2], P.flight);
  }

  /** Phase 3: Schlangenlinie mit Feuerspur. warn 0,8 s → fahren 2,6 s. */
  doSwerve(dt) {
    const warn = 0.8, run = 2.6;
    if (this.stateT < warn) {
      this.shake = 0.6;
      if (this.stateT % 0.1 < dt) this.level.effects?.dust({ x: this.pos.x, y: this.pos.y, z: this.pos.z + 1.5 }, 2, 0.8);
      this.drive(dt, 0.3);
      return;
    }
    const t = this.stateT - warn;
    const want = this.swerveDir * Math.sin(t * Math.PI * 2 / 1.6) * (this.lane[1] - 0.3);
    this.moveX(clamp(want, this.lane[0], this.lane[1]), 8, dt);
    this.fireT -= dt;
    if (this.fireT <= 0 && this.trail) {
      this.fireT = 0.075;
      for (const s of [-1, 1]) this.trail.emit(this.pos.x + s * 1.02, this.home.y, this.pos.z + 1.7);
    }
    if (t >= run) { this.setState('drive'); this.throwCool = 0.8; this.throwCount++; }
  }

  /** Zurückgekickte Bomben, die grob auf den Wagen zurollen (±50°), lenken zu ihm ein (max. 2 rad/s). */
  aimAssist(dt) {
    for (const e of this.level.entities) {
      if (e.kind !== 'kickbombe' || !e.kicker || e.state !== 'kicked' || e.removed) continue;
      const dx = this.pos.x - e.pos.x, dz = this.pos.z - e.pos.z, d = Math.hypot(dx, dz);
      if (d > 18 || d < 0.5) continue;
      const tx = dx / d, tz = dz / d;
      const dot = e.dir.x * tx + e.dir.z * tz;
      if (dot < 0.64) continue;
      const cross = e.dir.x * tz - e.dir.z * tx;
      const a = Math.max(-2 * dt, Math.min(2 * dt, Math.asin(clamp(cross, -1, 1))));
      const c = Math.cos(a), s = Math.sin(a);
      const nx = e.dir.x * c - e.dir.z * s, nz = e.dir.x * s + e.dir.z * c;
      e.dir.x = nx; e.dir.z = nz;
    }
  }

  // ------------------------------------------------------------------ Treffer

  /** Von einer gekickten/geworfenen Kickbombe getroffen (Kickbombe ruft das vor ihrer Explosion). */
  onBombHit(bomb) {
    if (!this.active && this.state !== 'stunned') return;
    if (this.hitGrace > 0) return;
    const rz = bomb.pos.z - this.pos.z, rx = bomb.pos.x - this.pos.x;
    const front = rz > -0.8 && Math.abs(rx) < 1.35;
    this.hitGrace = 0.4;
    if (!front) {
      this.carHits++;
      this.shake = 1;
      this.level.sfx('blockhit');
      this.level.effects?.debris({ x: bomb.pos.x, y: this.pos.y + 0.8, z: bomb.pos.z }, 0xe8202a, 6);
      this.hitLog.push({ kind: 'car', t: this.level.time });
      if (this.carHits < 3) return;
      this.carHits = 0;
    }
    this.takeHit(front ? 'driver' : 'car');
  }

  takeHit(where) {
    this.hp = Math.max(0, this.hp - 1);
    this.hits++;
    this.hitLog.push({ kind: where, t: this.level.time, hp: this.hp });
    this.setState('hit');
    this.shake = 1;
    this.level.sfx('slam');
    this.level.sfx('stomp');
    this.level.shake(0.6);
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 3, z: this.pos.z }, 20);
    this.level.onBossHit?.(this, where);
    if (this.hp <= 0) {
      this.defeated = true;
      this.touch = false;
      for (const b of this.bombs) if (!b.removed && !b.kicker) b.light(0.6);
      this.trail?.clear();
      this.level.onBossDefeated?.(this);
    }
  }

  onHit() { /* Explosionen in der Nähe, Feuer, Krallen: zählen nicht */ }

  onPlayer(player, contact) {
    if (!this.visible || this.hp <= 0) return 'none';
    if (contact.fromAbove) { this.level.sfx('bounce'); return 'stomp'; }
    return 'hurt';
  }

  // ------------------------------------------------------------------ Darstellung

  modelState() {
    const s = this.state;
    const driving = s !== 'defeated' && s !== 'wait' && s !== 'gone';
    const speed = driving ? 9 : 0;
    let anim = 'drive', progress;
    if (s === 'throw') { anim = 'throw'; progress = Math.min(1, this.stateT / THROW); }
    else if (s === 'hit') { anim = 'hit'; progress = Math.min(1, this.stateT / HIT); }
    else if (s === 'stunned' || s === 'flee') anim = 'stunned';
    else if (s === 'defeated') anim = 'defeated';
    return { anim, speed, steer: this.steer, progress };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    const r = this.model.root;
    r.visible = this.visible;
    if (this.shake > 0) { r.position.x += Math.sin(this.clock * 60) * 0.08 * this.shake; r.rotation.z = Math.sin(this.clock * 47) * 0.03 * this.shake; }
    else r.rotation.z = 0;
    r.rotation.y = YAW + this.steer * 0.12;
  }

  render(dt, t) {
    super.render(dt, t);
    this.markers.render(dt);
  }

  info() {
    return { state: this.state, hp: this.hp, maxHp: this.maxHp, phase: this.phase, carHits: this.carHits, throws: this.throws, bombs: this.bombsThrown, hits: this.hits, fire: this.trail?.count ?? 0, x: +this.pos.x.toFixed(2), z: +this.pos.z.toFixed(2) };
  }

  dispose() {
    this.markers.clear();
    super.dispose();
  }
}

export const KINDS = { baron: (level, spec) => new Baron(level, spec) };
