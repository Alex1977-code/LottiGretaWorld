// Schubser – Gegner Welt 6 „Wolkeninseln“ (Bauplan Gegner-Katalog „Schubser: rammt in Lava · Konter: zurückstoßen“;
// 6-2 Geisterschiffe, später 7-4). Runde lila Kugel auf Hufen (Modell 'schubser').
//
// Verhalten: Sieht er eine Figur (sight m, Höhenunterschied < 2 m), dreht er sich zu ihr und **scharrt** (warn s: tief
// geduckt, Dampf – die Vorwarnung) und **rammt** dann auf sie zu (charge m/s, höchstens chargeTime s, lenkt leicht nach).
// Erwischt er sie, stößt er sie **ohne Schaden** weit weg (push m/s waagerecht, lift m/s hoch, 0,4 s ohne Steuerung) – von
// Plattformen, in Lava, ins Wasser. An Kanten bremst er (skid) und fällt nie von selbst hinunter; Wände stoppen ihn. Danach
// verschnauft er (cool s). Ohne Figur in Sicht: behavior 'chase' (Standard ohne path) watschelt auf eine Figur in 1,5 · sight
// zu, 'patrol' läuft path bzw. geradeaus (Umkehr an Kanten/Wänden), 'guard' steht und kehrt nach dem Rammen heim.
//
// Konter **zurückstoßen** – er rutscht dann davon (Reibung friction m/s², auf Eis 1,2), prallt von Wänden ab und **fällt über
// Kanten**: Absturz, Lava und Wasser besiegen ihn (zählt für Arenen, level.onEnemyDefeated):
//   Draufspringen         Abprall (federt), er rutscht 5,5 m/s in Sprungrichtung – **besiegt ihn nicht**
//   Stampfattacke         Abprall, er rutscht 8 m/s
//   Sprung/Rennen gegen ihn (≥ 3 m/s auf ihn zu, in der Luft ≥ 1,5)   er rutscht mit dem 1,1-fachen Tempo (4 … 9 m/s), die Figur
//                         prallt leicht zurück
//   Angriffe              Feuer, Tatze, Panzer, Wurf, Rutschen, Schwanzhieb, Faust, Biss, Stampfwelle daneben: 7 m/s;
//                         Explosion/Kanonenkugel: 11 m/s im Bogen
//   Funkelstern, Riesentrank   besiegen ihn (dreht sich und verpufft)
// Langsame Berührung (beide gehen) stößt die Figur sanft weg (0,55 · push) und ihn ein Stück zurück. Rammt er, ist jede
// Berührung ein Stoß. Nach jedem Stoß 0,3 s Ruhe für Berührungen (kein Mehrfach-Stoß).
//
// Daten: { kind: 'schubser', pos, dir|yaw, behavior?: 'chase' | 'patrol' | 'guard', path?, loop?, speed?: 1.5 (gehen),
//          charge?: 5.5 (m/s), chargeTime?: 1.8, sight?: 8, warn?: 0.55, cool?: 0.9, push?: 11, lift?: 6.5,
//          friction?: 6 (m/s² Rutschen), weight?: 1 (> 1 rutscht kürzer), size?: 1, wake?, edges?, drop? }
//   Beispiel: { kind: 'schubser', pos: [0, 1, -20], sight: 7 }
// Zustände: idle | walk | warn | charge | skid | cool | pushed | fall | recover | defeated. Laufzeit: rams (Stöße auf die
//   Figur), pushes (von der Figur gestoßen), slide (Rutschtempo m/s), fellBy ('fall'|'lava'|'wasser'), info().
// Sound: 'step' (scharren), 'swoop' (Anlauf), 'bounce' (Stoß), 'slam' (Wand), 'splash_big' (Wasser), 'stomp', 'vanish'.

import { EnemyW2, clamp } from '../EnemyW2.js';
import { getModel } from '../../models/index.js';
import { shoveFigure, approachSpeed, dirFromTo, waterIn } from '../w6help.js';

const PUSHED_ANIM = 0.5, RECOVER = 0.4, DEFEAT = 0.85, BUMP = 0.3;
const SOFT = new Set(['bump']);

/**
 * Gemeinsame Rutsch-Physik der Schubser (auch Schubser-Prinz): slide {x, z} m/s, Reibung am Boden, Abprall an Wänden.
 * → { res, wall } (wall = an einer Wand abgeprallt).
 */
export function slideStep(e, dt, friction, bounce = 0.45) {
  e.vel.x = e.slide.x; e.vel.z = e.slide.z;
  const res = e.moveWithGravity(dt, { step: 0.25 });
  let wall = false;
  if (res.hitWall && res.wallNormal) {
    const n = res.wallNormal, d = e.slide.x * n.x + e.slide.z * n.z;
    if (d < 0) { e.slide.x -= (1 + bounce) * d * n.x; e.slide.z -= (1 + bounce) * d * n.z; wall = true; }
  }
  if (e.grounded) {
    const fr = e.ground?.ice ? Math.min(friction, 1.2) : friction;
    const s = Math.hypot(e.slide.x, e.slide.z);
    if (s > 1e-4) { const ns = Math.max(0, s - fr * dt); e.slide.x *= ns / s; e.slide.z *= ns / s; }
  }
  return { res, wall };
}

export class Schubser extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'schubser');
    this.size = spec.size ?? 1;
    this.half.set(0.43 * this.size, 0.48 * this.size, 0.43 * this.size);
    this.shadow = 0.45 * this.size;
    this.noIce = true;                 // eigene Rutsch-Physik
    this.behavior = spec.behavior ?? (this.path ? 'patrol' : 'chase');
    this.speed = spec.speed ?? 1.5;
    this.chargeSpeed = spec.charge ?? 5.5;
    this.chargeTime = spec.chargeTime ?? 1.8;
    this.sight = spec.sight ?? 8;
    this.warn = spec.warn ?? 0.55;
    this.coolT = spec.cool ?? 0.9;
    this.push = spec.push ?? 11;
    this.lift = spec.lift ?? 6.5;
    this.friction = spec.friction ?? 6;
    this.weight = Math.max(0.3, spec.weight ?? 1);
    this.home = this.pos.clone();
    this.chargeDir = { x: this.dir.x, z: this.dir.z };
    this.slide = { x: 0, z: 0 };
    this.bumpT = 0;
    this.rams = 0;
    this.pushes = 0;
    this.fellBy = null;
    this.skidFrom = 0;
    this.state = 'idle';
    if (level.view) this.setModel(getModel('schubser', { size: this.size }));
    this.initShadows(1);
  }

  setState(s) { this.state = s; this.stateT = 0; }

  get slideSpeed() { return Math.hypot(this.slide.x, this.slide.z); }

  update(dt) {
    this.stateT += dt;
    if (this.bumpT > 0) this.bumpT -= dt;
    if (this.state === 'defeated') {
      this.vel.y -= 20 * dt;
      this.pos.x += this.vel.x * dt; this.pos.y += this.vel.y * dt; this.pos.z += this.vel.z * dt;
      if (this.stateT >= DEFEAT) this.kill();
      return;
    }
    if (this.updateDefeat(dt)) return;
    switch (this.state) {
      case 'idle':
        this.stand(dt);
        if (this.playerActive() && this.playerDist() < this.wake) this.setState(this.behavior === 'patrol' ? 'walk' : 'cool');
        break;
      case 'walk': case 'cool': this.roam(dt); break;
      case 'warn':
        this.stand(dt);
        if (this.playerActive()) this.facePlayer(dt, 12);
        if (this.stateT >= this.warn) this.startCharge();
        break;
      case 'charge': this.chargeStep(dt); break;
      case 'skid': {
        // abbremsen in Laufrichtung, an Kanten sofort stehen
        const v = Math.max(0, this.skidFrom * (1 - this.stateT / 0.45));
        const ok = !this.grounded || this.groundAhead(this.chargeDir.x, this.chargeDir.z, 0.15 + v * dt, 1.1);
        this.vel.x = ok ? this.chargeDir.x * v : 0; this.vel.z = ok ? this.chargeDir.z * v : 0;
        this.moveWithGravity(dt);
        if (this.stateT >= 0.45) this.setState('cool');
        break;
      }
      case 'pushed': case 'fall': {
        const { wall } = slideStep(this, dt, this.friction);
        if (wall) { this.level.sfx('slam'); this.level.effects?.dust(this.pos, 3, 0.8); }
        if (this.removed) return;
        if (this.inWaterNow()) return;
        if (!this.grounded && this.vel.y < -2.5 && this.state !== 'fall') this.setState('fall');
        else if (this.grounded && this.state === 'fall') this.setState('pushed');
        if (this.grounded && this.slideSpeed < 0.25 && this.stateT > 0.1) { this.slide.x = 0; this.slide.z = 0; this.setState('recover'); }
        break;
      }
      case 'recover':
        this.stand(dt);
        if (this.stateT >= RECOVER) this.setState('cool');
        break;
      default: this.stand(dt);
    }
    if (this.state !== 'pushed' && this.state !== 'fall') this.inWaterNow();
  }

  /** Gehen bzw. Verschnaufen; sieht er eine Figur → warn. */
  roam(dt) {
    const coolDone = this.state !== 'cool' || this.stateT >= this.coolT;
    if (coolDone && this.canSee(this.sight, 2)) { this.vel.x = 0; this.vel.z = 0; this.startWarn(); return; }
    if (this.state === 'cool' && !coolDone) { this.stand(dt); return; }
    if (this.behavior === 'patrol') { this.walk(dt, this.speed); this.state = 'walk'; return; }
    if (this.behavior === 'chase' && this.canSee(this.sight * 1.5, 2.5)) { this.chase(dt, this.speed); this.state = 'walk'; return; }
    if (this.behavior === 'guard' && Math.hypot(this.home.x - this.pos.x, this.home.z - this.pos.z) > 0.4) {
      const d = dirFromTo(this.pos, this.home);
      this.dir.x = d.x; this.dir.z = d.z;
      this.vel.x = d.x * this.speed; this.vel.z = d.z * this.speed;
      this.moveWithGravity(dt);
      this.faceToward(d.x, d.z, dt);
      this.state = 'walk';
      return;
    }
    this.stand(dt);
    if (this.state === 'walk' && this.behavior !== 'patrol') this.state = 'cool';
  }

  startWarn() {
    this.setState('warn');
    this.level.sfx('step');
    this.level.effects?.dust(this.pos, 2, 0.6);
  }

  startCharge() {
    const p = this.player;
    const d = p ? dirFromTo(this.pos, p.pos, this.facing({})) : this.facing({});
    this.chargeDir.x = d.x; this.chargeDir.z = d.z;
    this.yaw = Math.atan2(-d.z, d.x);
    this.setState('charge');
    this.level.sfx('swoop');
  }

  chargeStep(dt) {
    const p = this.player;
    // leicht nachlenken (≤ 0,8 rad/s), solange die Figur vor ihm ist
    if (p && this.playerActive()) {
      const t = dirFromTo(this.pos, p.pos, this.chargeDir);
      const ahead = (t.x * this.chargeDir.x + t.z * this.chargeDir.z);
      if (ahead > 0.3) {
        const cross = this.chargeDir.x * t.z - this.chargeDir.z * t.x;
        const a = clamp(Math.atan2(cross, ahead), -0.8 * dt, 0.8 * dt), c = Math.cos(a), s = Math.sin(a);
        const x = this.chargeDir.x * c - this.chargeDir.z * s, z = this.chargeDir.x * s + this.chargeDir.z * c;
        this.chargeDir.x = x; this.chargeDir.z = z;
      }
    }
    const v = this.chargeSpeed;
    // an der Kante bremsen (nicht hinunter)
    if (this.grounded && !this.groundAhead(this.chargeDir.x, this.chargeDir.z, 0.2 + v * dt * 2, 1.1)) {
      this.vel.x = 0; this.vel.z = 0;
      this.moveWithGravity(dt);
      this.startSkid(0);
      return;
    }
    this.vel.x = this.chargeDir.x * v; this.vel.z = this.chargeDir.z * v;
    const res = this.moveWithGravity(dt);
    this.yaw = Math.atan2(-this.chargeDir.z, this.chargeDir.x);
    if (this.stateT > 0.08 && Math.floor(this.stateT * 8) !== Math.floor((this.stateT - dt) * 8)) this.level.effects?.dust(this.pos, 1, 0.5);
    if (res.hitWall) { this.level.sfx('slam'); this.level.shake(0.1); this.startSkid(0); return; }
    if (this.stateT >= this.chargeTime) this.startSkid(v);
  }

  startSkid(v) {
    this.skidFrom = v;
    this.setState('skid');
  }

  /** Im Wasser versunken? → besiegt (zählt). */
  inWaterNow() {
    if (this.removed || this.defeated) return false;
    if (!waterIn(this.level, this, 0.35)) return false;
    this.level.effects?.splash?.(this.pos, this.pos.y + 0.4);
    this.level.sfx('splash_big');
    this.fellBy = 'wasser';
    this.fallOut('wasser');
    return true;
  }

  fallOut(cause) {
    if (!this.fellBy) this.fellBy = cause;
    super.fallOut(cause);
  }

  // ------------------------------------------------------------------ Stoßen

  /**
   * Von source gestoßen: rutscht mit speed m/s davon (Richtung: von source weg; bewegt sich die Figur, in ihre Bewegungs-
   * richtung gemischt). up: Sprung nach oben (Explosion).
   */
  shoveBy(source, speed, how = 'hit', up = 0) {
    if (this.defeated) return;
    const sp = source?.pos ?? this.pos;
    const d = dirFromTo(sp, this.pos, source?.facingVec ? source.facingVec() : this.facing({}));
    if (source?.vel && (how === 'stomp' || how === 'pound' || how === 'bump')) {
      const hs = Math.hypot(source.vel.x, source.vel.z);
      if (hs > 1.5) { d.x = d.x * 0.4 + (source.vel.x / hs) * 0.6; d.z = d.z * 0.4 + (source.vel.z / hs) * 0.6; const l = Math.hypot(d.x, d.z) || 1; d.x /= l; d.z /= l; }
    }
    const v = speed / this.weight;
    this.slide.x = d.x * v; this.slide.z = d.z * v;
    if (up > 0) { this.vel.y = up; this.grounded = false; }
    this.yaw = Math.atan2(d.z, -d.x);          // blickt zur Quelle, rutscht rückwärts
    this.pushes++;
    this.bumpT = BUMP;
    this.setState('pushed');
    this.level.effects?.dust(this.pos, 4, 0.9);
    if (!SOFT.has(how)) this.level.sfx('bounce');
  }

  /** Er rammt die Figur: Stoß ohne Schaden. */
  ram(player) {
    const away = dirFromTo(this.pos, player.pos, this.chargeDir);
    const x = this.chargeDir.x * 0.7 + away.x * 0.3, z = this.chargeDir.z * 0.7 + away.z * 0.3;
    if (shoveFigure(player, x, z, this.push, this.lift, 0.4)) {
      this.rams++;
      this.level.sfx('bounce');
      this.level.effects?.sparks(player.center(), 6);
    }
    this.bumpT = BUMP;
    this.startSkid(this.chargeSpeed * 0.5);
  }

  onPlayer(player, contact) {
    if (this.defeated || this.state === 'defeated') return 'none';
    if (contact.pound) { this.shoveBy(player, 8, 'pound'); return 'stomp'; }
    if (contact.fromAbove) { this.shoveBy(player, 5.5, 'stomp'); return 'stomp'; }
    if (contact.dive) { this.onHit('claw', player); return 'none'; }
    if (this.slideAttack(player, contact)) return 'none';
    if (this.bumpT > 0) return 'none';
    if (this.state === 'charge') { this.ram(player); return 'none'; }
    const ap = approachSpeed(player, this);
    if (ap >= 3 || (player.mode === 'air' && ap >= 1.5)) {
      this.shoveBy(player, clamp(ap * 1.1, 4, 9), 'bump');
      const back = dirFromTo(this.pos, player.pos);
      shoveFigure(player, back.x, back.z, 3, 3.5, 0.15);
      return 'none';
    }
    // langsame Berührung: auseinander
    const away = dirFromTo(this.pos, player.pos, this.facing({}));
    shoveFigure(player, away.x, away.z, this.push * 0.55, 4.5, 0.25);
    this.slide.x = -away.x * 1.5 / this.weight; this.slide.z = -away.z * 1.5 / this.weight;
    this.bumpT = BUMP;
    if (this.state !== 'pushed') this.setState('pushed');
    this.level.sfx('bounce');
    return 'none';
  }

  onHit(kind, source) {
    if (this.defeated || this.state === 'defeated') return;
    if (kind === 'star' || kind === 'mega') { this.defeat(source); return; }
    if (kind === 'bump') { if (this.grounded) { this.vel.y = 6; this.grounded = false; } return; }
    if (kind === 'pound' && source?.pos && Math.abs(source.pos.y - this.pos.y) > 1.2) return;
    if (kind === 'bomb' || kind === 'cannon') { this.shoveBy(source, 11, kind, 7); return; }
    this.shoveBy(source, kind === 'pound' ? 6 : 7, kind);
  }

  /** Besiegt (Funkelstern/Riesentrank): dreht sich, schrumpft und verpufft. */
  defeat(source) {
    const d = dirFromTo(source?.pos ?? this.pos, this.pos, this.facing({}));
    this.setState('defeated');
    this.touch = false;
    this.vel.set(d.x * 2.5, 5, d.z * 2.5);
    this.level.sfx('stomp');
    this.level.sfx('vanish');
    this.level.effects?.sparks(this.center(), 10);
    this.markDefeated();
  }

  modelState() {
    const s = this.state;
    if (s === 'walk') return { anim: 'walk', speed: this.speed };
    if (s === 'warn') return { anim: 'charge', speed: 0.6 };
    if (s === 'charge') return { anim: 'charge', speed: this.chargeSpeed };
    if (s === 'skid') return { anim: 'skid' };
    if (s === 'pushed') return this.stateT < PUSHED_ANIM ? { anim: 'pushed', progress: this.stateT / PUSHED_ANIM } : { anim: 'skid' };
    if (s === 'fall') return { anim: 'fall' };
    if (s === 'defeated') return { anim: 'defeated', progress: Math.min(1, this.stateT / DEFEAT) };
    if (s === 'flipped') return { anim: 'fall' };
    return { anim: 'idle' };
  }

  info() {
    return {
      state: this.state, rams: this.rams, pushes: this.pushes, slide: +this.slideSpeed.toFixed(2), defeated: this.defeated,
      fellBy: this.fellBy, x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2),
    };
  }
}

export const KINDS = { schubser: (level, spec) => new Schubser(level, spec) };
