// Spielfigur des Kurs-Modus: Bewegungsset nach Bauplan (Gehen/Rennen mit Schleudern, variable Sprünge,
// Dreifachsprung, Rückwärts- und Seitwärtssalto, Weitsprung, Wandrutschen + Wandsprung, Stampfattacke,
// Ducken/Rutschen, Coyote-Zeit, Sprungpuffer, Kantenhilfe, Krallen-Klettern und -Sturzflug, Bohnenranke,
// Schwimmen), Klein/Groß, Treffer, Tod, Power-up-Hooks (player/powers.js).
//
// Koordinaten: pos = Fußpunkt (Meter), vel in m/s, yaw = Blickrichtung um +Y (0 = +X, π/2 = −Z).
// Die Figur rechnet nur in festen Simulationsschritten (CourseScene, 1/120 s) und ist von der Darstellung
// getrennt (HeroRig liest `state`, `phase`, … für den Avatar).
//
// Modi (`mode`): ground | air | wall | stalk | swim | script (Röhre, Zielmast, Tod).
// Zustände (`state`, Vertrag HeroRig): idle walk run skid jump jump2 jump3 backflip sideflip longjump fall
// land crouch slide groundpound wallslide walljump climb beanstalk swim pipe hurt dead victory claw
// (+ intern 'dive' = Krallen-Sturzflug; HeroRig meldet ihn dem Avatar als 'longjump').
//
// Tragen/Werfen (Präzisierung Gegner/Power-ups): Aktion in Reichweite eines `carryable`-Objekts hebt es auf
// (`holding`), erneute Aktion wirft es in Blickrichtung (mit Ducken: absetzen); Treffer/Tod lässt es fallen.
// Rennen gehalten + Berührung greift Panzer/Kickbombe (die Entität ruft pickUp). Siehe carryAction().

import * as THREE from 'three';
import { HERO_VARIANTS } from '../../config.js';
import { MOVE, HITBOX, vFor } from './moveset.js';
import { getPower, normalizePower } from './powers.js';
import { surfaceNormal } from '../physics/shapes.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const approach = (v, t, d) => (v < t ? Math.min(t, v + d) : Math.max(t, v - d));
const wrap = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; else if (a < -Math.PI) a += TAU; return a; };
const turnToward = (a, b, max) => { const d = wrap(b - a); return Math.abs(d) <= max ? b : a + Math.sign(d) * max; };

const VARIABLE = new Set(['jump', 'jump2', 'jump3', 'walljump', 'bounce', 'stomp']);
const FLIPS = { backflip: 0.62, sideflip: 0.55, jump3: 0.6 };

export class Player {
  /**
   * @param {object} level Level-Laufzeit (world, sfx, effects, spawn, entities, runtime, controlYaw)
   * @param {{ hero?: 'lotti'|'greta', pos?: number[], yaw?: number }} opts
   */
  constructor(level, opts = {}) {
    this.level = level;
    this.world = level.world;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.half = new THREE.Vector3().copy(HITBOX.big);
    this._c = new THREE.Vector3();
    this.setHero(opts.hero ?? 'lotti');
    this.big = true;
    this.power = 'none';
    this.powerPrev = 'none';
    this.powerTime = 0;
    this.lives = 0;            // Anzeige: runtime verwaltet die Leben
    this.reset(opts.pos ?? [0, 1, 0], opts.yaw ?? Math.PI / 2);
  }

  /** Heldin wählen ('lotti' | 'greta'): Faktoren aus HERO_VARIANTS. */
  setHero(key) {
    this.hero = HERO_VARIANTS[key] ? key : 'lotti';
    const v = HERO_VARIANTS[this.hero];
    this.variant = v;
    this.jumpMult = v.jumpMult;     // Sprunghöhe
    this.speedMult = v.speedMult;   // Lauftempo
    this.airMult = v.airSpeedMult;  // Luftsteuerung
    this.fallMult = v.fallMult;     // Fallschwerkraft
  }

  /** Auf einen Punkt setzen und alle Bewegungszustände löschen (Start, Checkpoint, Teleport). */
  reset(p, yaw = this.yaw ?? Math.PI / 2) {
    this.pos.set(p[0] ?? p.x, p[1] ?? p.y, p[2] ?? p.z);
    this.prevPos = this.pos.clone();
    this.vel.set(0, 0, 0);
    this.yaw = yaw;
    this.gs = 0;                       // Bodentempo entlang der Blickrichtung
    this.mode = 'air';
    this.state = 'fall';
    this.stateTime = 0;
    this.time = 0;
    this.airTime = 0;
    this.jumpKind = null;
    this.variable = false;
    this.airMax = MOVE.walk;
    this.coyote = 0; this.buffer = 0;
    this.chainTimer = 0; this.chainKind = null;
    this.lockTime = 0; this.hurtTime = 0; this.invuln = 0;
    this.wallNormal = new THREE.Vector3(); this.wallShape = null; this.wallCoyote = 0; this.wallAway = 0;
    this.climbLeft = MOVE.climbTime;
    this.poundPhase = null;
    this.stalk = null; this.stalkAngle = 0; this.grabCooldown = 0;
    this.water = null;
    this.ground = null; this.groundNormal = { x: 0, y: 1, z: 0 };
    this.platformVel = new THREE.Vector3();
    this.boostTime = 0;
    this.crouching = false;
    this.dead = false;
    this.script = null;
    this.clawTime = 0; this.fireCooldown = 0; this.throwTime = 0;
    this.attackInfo = null;
    this.holding = null;
    this.phase = 0;
    this.landTime = 0;
    this.lastLandVy = 0;
    this.updateHalf();
  }

  // ------------------------------------------------------------------ Hilfen

  center(out = this._c) { return out.set(this.pos.x, this.pos.y + this.half.y, this.pos.z); }
  facingVec(out = { x: 0, z: 0 }) { out.x = Math.cos(this.yaw); out.z = -Math.sin(this.yaw); return out; }
  hSpeed() { return Math.hypot(this.vel.x, this.vel.z); }
  get feetY() { return this.pos.y; }
  get headY() { return this.pos.y + this.half.y * 2; }
  get powerDef() { return getPower(this.power); }
  get invulnerable() { return this.invuln > 0 || !!this.powerDef.invulnerable; }
  get climbing() { return this.state === 'climb' || this.state === 'beanstalk'; }
  get grounded() { return this.mode === 'ground'; }

  updateHalf() {
    const base = this.big ? HITBOX.big : HITBOX.small;
    this.half.x = base.x; this.half.z = base.z;
    this.half.y = this.crouching ? Math.min(base.y, this.big ? MOVE.crouchHalf : 0.26) : base.y;
  }

  setState(s) { if (s !== this.state) { this.state = s; this.stateTime = 0; } }

  // ------------------------------------------------------------------ Schritt

  /**
   * Ein Simulationsschritt. input = CourseInput.sample(); dt = 1/120.
   * Reihenfolge: Timer → Mitnahme durch Plattformen → Modus-Logik → Kollision → Auslöser.
   */
  update(dt, input) {
    this.time += dt;
    this.stateTime += dt;
    this.prevPos.copy(this.pos);
    this.prevVy = this.vel.y;
    const tick = (k) => { if (this[k] > 0) this[k] = Math.max(0, this[k] - dt); };
    tick('coyote'); tick('buffer'); tick('chainTimer'); tick('lockTime'); tick('hurtTime'); tick('invuln');
    tick('wallCoyote'); tick('grabCooldown'); tick('boostTime'); tick('clawTime'); tick('fireCooldown'); tick('landTime'); tick('throwTime');
    this.input = input;
    if (this.holding?.removed) this.holding = null;   // Getragenes ist weg (z. B. in der Hand explodiert)
    if (this.attackInfo && this.time > this.attackInfo.until) this.attackInfo = null;

    if (this.mode === 'script') { this.updateScript(dt, input); return; }

    // Zeitlich begrenzte Power-ups
    const def = this.powerDef;
    if (def.duration) {
      this.powerTime -= dt;
      if (this.powerTime <= 0) this.endTimedPower();
    }
    def.update?.(this, dt, input);

    if (input.jumpPressed) this.buffer = MOVE.buffer;
    if (input.actionPressed && !this.carryAction(input)) this.powerDef.onAction?.(this, input);

    // Wunschrichtung aus Stick und Kamera-Gier (Steuerung relativ zur Kamera)
    const cy = this.level.controlYaw ?? 0;
    const c = Math.cos(cy), s = Math.sin(cy);
    let wx = c * input.moveX - s * input.moveY;
    let wz = -s * input.moveX - c * input.moveY;
    const wl = Math.hypot(wx, wz);
    if (wl > 1e-6) { wx /= wl; wz /= wl; }
    const want = { x: wx, z: wz, mag: wl > 1e-6 ? input.mag : 0 };

    // Mitnahme durch bewegte Plattformen / Förderbänder
    if (this.mode === 'ground') this.applyCarry(dt);

    switch (this.mode) {
      case 'ground': this.updateGround(dt, input, want); break;
      case 'air': this.updateAir(dt, input, want); break;
      case 'wall': this.updateWall(dt, input, want); break;
      case 'stalk': this.updateStalk(dt, input, want); return;
      case 'swim': this.updateSwim(dt, input, want); break;
      default: break;
    }
    if (this.mode === 'script') return;
    this.move(dt, input, want);
    if (this.mode !== 'script') this.checkTriggers(dt, input, want);
    this.updatePhase();
  }

  applyCarry(dt) {
    const g = this.ground;
    this.platformVel.set(0, 0, 0);
    if (!g) return;
    if (g.mover) {
      const m = g.mover;
      if (m.dyaw) {
        const dx = this.pos.x - m.cx, dz = this.pos.z - m.cz;
        const ca = Math.cos(m.dyaw), sa = Math.sin(m.dyaw);
        // Drehung um +Y: x' = x·cos + z·sin, z' = −x·sin + z·cos
        this.pos.x = m.cx + dx * ca + dz * sa;
        this.pos.z = m.cz - dx * sa + dz * ca;
        this.yaw += m.dyaw;
      }
      this.pos.x += m.dx; this.pos.y += m.dy; this.pos.z += m.dz;
      this.platformVel.set(m.vx ?? m.dx / dt, m.vy ?? m.dy / dt, m.vz ?? m.dz / dt);
    }
    if (g.conveyor) {
      this.pos.x += g.conveyor.x * dt; this.pos.z += g.conveyor.z * dt;
      this.platformVel.x += g.conveyor.x; this.platformVel.z += g.conveyor.z;
    }
  }

  // ------------------------------------------------------------------ Boden

  updateGround(dt, input, want) {
    const runSpeed = MOVE.run * this.speedMult, walkSpeed = MOVE.walk * this.speedMult;
    // Sprung (auch vorgemerkt) – nicht während der Landestarre nach der Stampfattacke
    if (this.buffer > 0 && !(this.state === 'land' && this.poundLanded && this.landTime > 0)) {
      this.buffer = 0;
      this.startJump(input, want);
      return;
    }
    const steep = this.ground?.type === 'ramp' && this.ground.slope > MOVE.slopeSlide;
    const n = this.ground ? surfaceNormal(this.ground, this.groundNormal) : this.groundNormal;
    const downhill = Math.hypot(n.x, n.z) > 0.05;

    // Ducken / Rutschen
    if ((input.crouch || steep) && this.state !== 'land') {
      if (this.state !== 'slide' && this.state !== 'crouch') {
        if (this.gs >= MOVE.slideMin || steep) { this.setState('slide'); this.level.sfx('slide'); }
        else this.setState('crouch');
      }
      this.setCrouch(true);
    } else if (this.state === 'crouch' || this.state === 'slide') {
      if (this.setCrouch(false)) this.setState(this.gs > 0.5 ? 'walk' : 'idle');
    }

    if (this.state === 'land' && this.landTime > 0) {
      // Landestarre nach der Stampfattacke: kein Laufen
      if (this.poundLanded) { this.gs = approach(this.gs, 0, MOVE.decel * dt); this.applyGroundVel(); return; }
    }

    if (this.state === 'slide') {
      // Rutschen: wenig Reibung, hangabwärts schneller, kaum lenkbar
      if (want.mag > 0.2) this.yaw = turnToward(this.yaw, Math.atan2(-want.z, want.x), MOVE.slideTurn * dt);
      let along = 0;
      if (downhill) {
        const f = this.facingVec();
        const dl = Math.hypot(n.x, n.z);
        along = (f.x * n.x + f.z * n.z) / dl; // Anteil der Blickrichtung hangabwärts
        if (steep || along > 0.3) {
          // Blickrichtung zum Gefälle drehen
          this.yaw = turnToward(this.yaw, Math.atan2(-n.z, n.x), 3 * dt);
          this.gs += MOVE.slideSlopeAccel * dl * dt;
        } else if (along < -0.3) this.gs -= MOVE.slideSlopeAccel * dl * dt;
      }
      if (!downhill || Math.abs(along) <= 0.3) this.gs = approach(this.gs, 0, MOVE.slideDecel * dt);
      this.gs = clamp(this.gs, -4, 16);
      if (this.gs < 0.5 && !steep) this.setState(input.crouch ? 'crouch' : 'idle');
      this.applyGroundVel();
      return;
    }
    if (this.state === 'crouch') {
      this.gs = approach(this.gs, 0, MOVE.decel * dt);
      if (want.mag > 0.3) this.yaw = turnToward(this.yaw, Math.atan2(-want.z, want.x), MOVE.turnSlow * dt);
      this.applyGroundVel();
      return;
    }

    // Schleudern bei Umkehr aus hohem Tempo
    const wantYaw = Math.atan2(-want.z, want.x);
    if (this.state === 'skid') {
      this.gs = approach(this.gs, 0, MOVE.skidDecel * dt);
      if (this.gs <= 0.6 || want.mag < 0.2) {
        if (want.mag >= 0.2) { this.yaw = wantYaw; this.gs = 1; this.skidTurnTime = this.time; }
        this.setState(want.mag >= 0.2 ? 'walk' : 'idle');
      }
      this.applyGroundVel();
      return;
    }

    const ice = !!this.ground?.ice;
    let target = 0;
    if (want.mag > 0.05) {
      const analog = clamp(want.mag / 0.85, 0, 1);
      target = input.run ? runSpeed : walkSpeed * analog;
      const diff = Math.abs(wrap(wantYaw - this.yaw));
      if (this.gs >= MOVE.skidMin && diff > 2.2 && this.boostTime <= 0 && !ice) {
        this.setState('skid');
        this.skidYaw = wantYaw;
        this.level.sfx('skid');
        this.level.effects?.dust(this.pos, 4);
        this.applyGroundVel();
        return;
      }
      const turn = (this.gs < 3 ? MOVE.turnSlow : MOVE.turnSlow + (MOVE.turnFast - MOVE.turnSlow) * clamp((this.gs - 3) / 7, 0, 1)) * dt;
      if (ice) {
        // Eis: Geschwindigkeit als Vektor, träge
        const tx = want.x * target, tz = want.z * target;
        const f = this.facingVec();
        let vx = f.x * this.gs, vz = f.z * this.gs;
        const dx = tx - vx, dz = tz - vz, dl = Math.hypot(dx, dz), mx = MOVE.iceAccel * dt;
        if (dl > mx) { vx += (dx / dl) * mx; vz += (dz / dl) * mx; } else { vx = tx; vz = tz; }
        this.gs = Math.hypot(vx, vz);
        if (this.gs > 0.05) this.yaw = Math.atan2(-vz, vx);
      } else {
        this.yaw = this.boostTime > 0 ? turnToward(this.yaw, wantYaw, 2 * dt) : turnToward(this.yaw, wantYaw, turn);
        if (this.gs > target) this.gs = approach(this.gs, target, (this.boostTime > 0 ? 0 : MOVE.overDecel) * dt);
        else this.gs = approach(this.gs, target, (this.gs < walkSpeed ? MOVE.accel : MOVE.accelRun) * dt);
      }
    } else {
      const dec = ice ? MOVE.iceAccel : this.boostTime > 0 ? MOVE.overDecel : MOVE.decel;
      this.gs = approach(this.gs, 0, dec * dt);
    }
    if (this.state !== 'land' || this.landTime <= 0) {
      this.setState(this.gs < 0.3 ? 'idle' : this.gs > walkSpeed + 0.5 ? 'run' : 'walk');
    }
    this.applyGroundVel();
  }

  applyGroundVel() {
    const f = this.facingVec();
    this.vel.x = f.x * this.gs;
    this.vel.z = f.z * this.gs;
    this.vel.y = -2; // an den Boden drücken (Bodenerkennung je Schritt)
  }

  /** Ducken an/aus; Aufstehen nur mit Platz über dem Kopf. Liefert true, wenn der Wechsel gelang. */
  setCrouch(on) {
    if (on === this.crouching) return true;
    if (!on) {
      const base = this.big ? HITBOX.big : HITBOX.small;
      const c = { x: this.pos.x, y: this.pos.y + base.y + 0.02, z: this.pos.z };
      const hits = this.world.overlapAABB(c, { x: base.x - 0.02, y: base.y - 0.02, z: base.z - 0.02 }, { filter: (s) => s.solid && !s.oneWay && !s.fromBelowOnly });
      if (hits.length) return false;
    }
    this.crouching = on;
    this.updateHalf();
    return true;
  }

  // ------------------------------------------------------------------ Sprünge

  /** Sprung vom Boden: wählt Rückwärtssalto, Weitsprung, Seitwärtssalto oder Kettensprung. */
  startJump(input, want) {
    const speed = Math.max(this.gs, 0);
    const pv = this.platformVel;
    let kind = 'jump';
    if (this.state === 'crouch' && speed < 2) kind = 'backflip';
    else if ((this.state === 'slide' || this.state === 'crouch') && speed >= 4) kind = 'longjump';
    else if (this.state === 'skid' || (this.skidTurnTime && this.time - this.skidTurnTime < 0.12)) kind = 'sideflip';
    else if (this.chainTimer > 0 && speed >= MOVE.chainMinSpeed && (this.chainKind === 'jump' || this.chainKind === 'jump2')) kind = this.chainKind === 'jump' ? 'jump2' : 'jump3';
    const f = this.facingVec();
    this.setCrouch(false);
    if (kind === 'backflip') {
      this.vel.set(-f.x * MOVE.backflipBack, vFor(MOVE.backflip * this.jumpMult), -f.z * MOVE.backflipBack);
      this.airMax = MOVE.backflipBack;
      this.level.sfx('backflip');
    } else if (kind === 'longjump') {
      const sp = Math.min(14, Math.max(MOVE.longjumpSpeed, speed * 1.1)) * this.speedMult;
      this.vel.set(f.x * sp, MOVE.longjumpVy, f.z * sp);
      this.airMax = sp;
      this.level.sfx('longjump');
    } else if (kind === 'sideflip') {
      const yaw = want.mag > 0.2 ? Math.atan2(-want.z, want.x) : this.yaw + Math.PI;
      this.yaw = yaw;
      const nf = this.facingVec();
      this.vel.set(nf.x * MOVE.sideflipSpeed, vFor(MOVE.sideflip * this.jumpMult), nf.z * MOVE.sideflipSpeed);
      this.airMax = Math.max(MOVE.sideflipSpeed, MOVE.walk * this.speedMult * 0.6);
      this.level.sfx('backflip');
    } else {
      const h = kind === 'jump3' ? MOVE.jump3 : kind === 'jump2' ? MOVE.jump2 : MOVE.jump1 + MOVE.jump1Run * speed;
      this.vel.set(f.x * speed, vFor(h * this.jumpMult), f.z * speed);
      this.airMax = Math.max(speed, MOVE.walk * this.speedMult);
      this.level.sfx(kind === 'jump' ? 'jump' : kind);
    }
    // Schwung der Plattform mitnehmen
    this.vel.x += pv.x; this.vel.z += pv.z; if (pv.y > 0) this.vel.y += pv.y;
    this.enterAir(kind, VARIABLE.has(kind));
    this.coyote = 0;
    this.level.effects?.dust(this.pos, kind === 'longjump' ? 6 : 3);
  }

  enterAir(kind, variable) {
    this.mode = 'air';
    this.jumpKind = kind;
    this.variable = variable;
    this.airTime = 0;
    this.ground = null;
    this.setState(kind ?? 'fall');
    this.stateTime = 0;
  }

  // ------------------------------------------------------------------ Luft

  updateAir(dt, input, want) {
    this.airTime += dt;
    // Sprung kurz nach Verlassen der Kante / Wand
    if (this.buffer > 0 && this.coyote > 0 && this.state !== 'groundpound') {
      this.buffer = 0;
      this.mode = 'ground';
      this.startJump(input, want);
      return;
    }
    if (this.buffer > 0 && this.wallCoyote > 0) { this.buffer = 0; this.wallJump(); return; }

    // Stampfattacke (bzw. Power-up-Variante, z. B. Krallen-Sturzflug)
    if (input.crouchPressed && this.state !== 'groundpound' && this.state !== 'dive' && this.state !== 'hurt') {
      if (!this.powerDef.onAirCrouch?.(this, input)) this.startPound();
    }
    if (this.state === 'groundpound') {
      if (this.poundPhase === 'spin') {
        this.vel.set(0, 0, 0);
        if (this.stateTime >= MOVE.poundSpin) { this.poundPhase = 'drop'; this.vel.y = -MOVE.poundSpeed; }
      } else this.vel.y = -MOVE.poundSpeed;
      return;
    }
    if (this.state === 'dive') {
      this.vel.y = Math.max(MOVE.diveVy * 1.6, this.vel.y - MOVE.gFall * 0.5 * dt);
      return;
    }

    // Luftsteuerung
    const lock = this.lockTime > 0 || this.hurtTime > 0;
    const k = this.state === 'backflip' ? 0.35 : this.state === 'sideflip' ? 0.6 : this.state === 'longjump' ? 0.25 : 1;
    const ctrl = lock ? 0 : MOVE.airAccel * this.airMult * k;
    const maxS = Math.max(this.airMax, MOVE.walk * this.speedMult);
    let vx = this.vel.x, vz = this.vel.z;
    if (want.mag > 0.05 && ctrl > 0) {
      const tx = want.x * maxS, tz = want.z * maxS;
      const dx = tx - vx, dz = tz - vz, dl = Math.hypot(dx, dz), m = ctrl * dt;
      if (dl > m) { vx += (dx / dl) * m; vz += (dz / dl) * m; } else { vx = tx; vz = tz; }
      if (this.state !== 'backflip' && this.state !== 'longjump') this.yaw = turnToward(this.yaw, Math.atan2(-want.z, want.x), MOVE.airTurn * dt);
    } else if (!lock) {
      const s = Math.hypot(vx, vz);
      if (s > 1e-4) { const ns = Math.max(0, s - MOVE.airDrag * dt); vx *= ns / s; vz *= ns / s; }
    }
    this.vel.x = vx; this.vel.z = vz;
    this.applyGravity(dt, input);
    if (this.vel.y < 0 && (this.state === 'jump' || this.state === 'jump2' || this.state === 'walljump') && this.stateTime > 0.1 && this.vel.y < -6) this.setState('fall');
  }

  applyGravity(dt, input) {
    const vy = this.vel.y;
    let g;
    const long = this.state === 'longjump';
    if (vy > 0) {
      g = long ? MOVE.gLong : (this.variable && !input.jump) ? MOVE.gRelease : MOVE.gUp;
      if (!long && Math.abs(vy) < MOVE.apexBand && (input.jump || !this.variable)) g *= MOVE.apexMult;
    } else {
      g = (long ? MOVE.gLong : MOVE.gFall) * this.fallMult;
      if (!long && Math.abs(vy) < MOVE.apexBand && input.jump) g *= MOVE.apexMult;
    }
    this.vel.y = Math.max(vy - g * dt, -MOVE.maxFall);
  }

  startPound() {
    this.setState('groundpound');
    this.poundPhase = 'spin';
    this.vel.set(0, 0, 0);
    this.jumpKind = 'groundpound';
    this.variable = false;
    this.level.sfx('groundpound');
  }

  startDive() {
    const f = this.facingVec();
    this.setState('dive');
    this.vel.set(f.x * MOVE.diveSpeed * this.speedMult, MOVE.diveVy, f.z * MOVE.diveSpeed * this.speedMult);
    this.variable = false;
    this.jumpKind = 'dive';
    this.attack('claw', 0.6, 2.0);
    this.level.sfx('claw');
  }

  /** Angriffsbereich vor der Figur für `duration` s (Entitäten bekommen onHit(kind) einmal je Angriff). */
  attack(kind, reach = 1, duration = 0.2) {
    this.attackInfo = { kind, reach, until: this.time + duration, hit: new Set() };
  }

  // ------------------------------------------------------------------ Wand

  startWall(shape, normal, climb) {
    this.mode = 'wall';
    this.wallShape = shape;
    this.wallNormal.set(normal.x, 0, normal.z).normalize();
    this.wallAway = 0;
    this.yaw = Math.atan2(this.wallNormal.z, -this.wallNormal.x); // Blick zur Wand
    this.vel.x = 0; this.vel.z = 0;
    this.setState(climb ? 'climb' : 'wallslide');
    if (!climb) this.level.sfx('wallslide');
  }

  updateWall(dt, input, want) {
    const n = this.wallNormal;
    if (this.buffer > 0) { this.buffer = 0; this.wallJump(); return; }
    if (input.crouchPressed) { this.leaveWall(1.5); return; }
    const into = -(want.x * n.x + want.z * n.z);
    if (want.mag > 0.3 && into < -0.5) { this.wallAway += dt; if (this.wallAway > 0.1) { this.leaveWall(2.5); return; } } else this.wallAway = 0;
    // Wand noch da? (schmaler Fühler vor der Brust)
    const wall = this.probeWall(0);
    if (!wall) {
      if (this.state === 'climb') { this.ledgeHop(); return; }
      this.leaveWall(0.5); return;
    }
    if (this.state === 'climb') {
      const pushing = want.mag > 0.3 && (into > 0.2 || input.moveY > 0.3);
      if (pushing && this.climbLeft > 0) {
        this.vel.y = MOVE.climbSpeed;
        this.climbLeft -= dt;
        // Kopf über der Kante → hinauf
        if (!this.probeWall(this.half.y * 2 + 0.05 - this.half.y)) { this.ledgeHop(); return; }
      } else {
        this.setState('wallslide');
      }
    } else {
      if (this.powerDef.canClimb && wall.climbable && this.climbLeft > 0 && want.mag > 0.3 && into > 0.2) this.setState('climb');
      if (this.vel.y > 0) this.vel.y -= (input.jump ? MOVE.gUp : MOVE.gRelease) * dt;
      else this.vel.y = Math.max(this.vel.y - MOVE.gFall * 0.6 * dt, -MOVE.wallSlide);
    }
    // leicht an die Wand drücken (Kontakt halten)
    this.vel.x = -n.x * 0.5; this.vel.z = -n.z * 0.5;
  }

  /** Feste Wandform direkt vor der Brust (dy = Versatz zur Körpermitte) oder null. */
  probeWall(dy) {
    const n = this.wallNormal;
    const c = { x: this.pos.x - n.x * (this.half.x + 0.06), y: this.pos.y + this.half.y + dy, z: this.pos.z - n.z * (this.half.z + 0.06) };
    const hits = this.world.overlapAABB(c, { x: 0.03, y: this.half.y * 0.6, z: 0.03 }, { filter: (s) => s.solid && !s.oneWay && !s.fromBelowOnly && !s.noWallSlide });
    return hits[0] ?? null;
  }

  leaveWall(push) {
    const n = this.wallNormal;
    this.mode = 'air';
    this.vel.x = n.x * push; this.vel.z = n.z * push;
    this.airMax = Math.max(push, MOVE.walk * this.speedMult * 0.5);
    this.wallCoyote = MOVE.wallCoyote;
    this.jumpKind = null; this.variable = false;
    this.setState('fall');
  }

  wallJump() {
    const n = this.wallNormal;
    const sp = MOVE.wallJumpSpeed;
    this.vel.set(n.x * sp, vFor(MOVE.wallJump * this.jumpMult), n.z * sp);
    this.yaw = Math.atan2(-n.z, n.x);
    this.airMax = sp;
    this.lockTime = MOVE.wallJumpLock;
    this.wallCoyote = 0;
    this.enterAir('walljump', true);
    this.level.sfx('walljump');
    this.level.effects?.dust({ x: this.pos.x - n.x * 0.3, y: this.pos.y + 0.5, z: this.pos.z - n.z * 0.3 }, 3);
  }

  ledgeHop() {
    const n = this.wallNormal;
    this.mode = 'air';
    this.vel.set(-n.x * 2.6, MOVE.ledgeHop, -n.z * 2.6);
    this.airMax = 2.6;
    this.enterAir('jump', false);
    this.lockTime = 0.25;
  }

  // ------------------------------------------------------------------ Bohnenranke

  grabStalk(shape) {
    this.mode = 'stalk';
    this.stalk = shape;
    this.stalkAngle = Math.atan2(this.pos.z - shape.z, this.pos.x - shape.x);
    this.vel.set(0, 0, 0);
    this.setState('beanstalk');
    this.climbLeft = MOVE.climbTime;
  }

  updateStalk(dt, input, want) {
    const s = this.stalk;
    if (!s) { this.mode = 'air'; return; }
    const R = s.r + this.half.x + 0.05;
    if (input.jumpPressed) {
      // Absprung in Stick-Richtung, sonst von der Ranke weg
      let ox = Math.cos(this.stalkAngle), oz = Math.sin(this.stalkAngle);
      if (want.mag > 0.3) { ox = want.x; oz = want.z; }
      this.vel.set(ox * 5, vFor(3.2 * this.jumpMult), oz * 5);
      this.yaw = Math.atan2(-oz, ox);
      this.airMax = 5;
      this.grabCooldown = 0.35;
      this.stalk = null;
      this.buffer = 0;
      this.enterAir('jump', true);
      this.level.sfx('jump');
      return;
    }
    if (input.crouchPressed) { this.stalk = null; this.grabCooldown = 0.35; this.mode = 'air'; this.setState('fall'); return; }
    this.stalkAngle -= input.moveX * MOVE.stalkTurn * dt;
    const vy = input.moveY * MOVE.stalkSpeed;
    this.vel.set(0, vy, 0);
    let y = this.pos.y + vy * dt;
    const top = s.top - this.half.y * 2 + 0.3;
    y = Math.min(y, top);
    // unten angekommen: auf den Boden
    const floor = this.world.raycastDown(this.pos.x, this.pos.y + 0.05, this.pos.z, 0.3);
    if (vy < 0 && floor && y <= floor.y + 0.01) { this.stalk = null; this.pos.y = floor.y; this.mode = 'air'; this.setState('fall'); return; }
    this.pos.set(s.x + Math.cos(this.stalkAngle) * R, y, s.z + Math.sin(this.stalkAngle) * R);
    this.yaw = Math.atan2(Math.sin(this.stalkAngle), -Math.cos(this.stalkAngle)); // zur Ranke
    this.updatePhase();
  }

  // ------------------------------------------------------------------ Wasser

  updateSwim(dt, input, want) {
    const w = this.water;
    const surface = w ? w.top : this.pos.y;
    const c = this.pos.y + this.half.y;
    const depth = surface - c;
    if (input.jumpPressed) {
      if (depth < 0.45) { this.vel.y = MOVE.swimExit; this.mode = 'air'; this.enterAir('jump', true); this.water = null; this.level.sfx('jump'); this.airMax = Math.max(this.hSpeed(), MOVE.walk * this.speedMult); return; }
      this.vel.y = MOVE.swimStroke; this.level.sfx('swim');
    }
    // Waagerecht
    const maxS = MOVE.swimSpeed * this.speedMult;
    let vx = this.vel.x, vz = this.vel.z;
    const tx = want.x * maxS * Math.min(1, want.mag / 0.85), tz = want.z * maxS * Math.min(1, want.mag / 0.85);
    const dx = tx - vx, dz = tz - vz, dl = Math.hypot(dx, dz), m = MOVE.swimAccel * dt;
    if (dl > m) { vx += (dx / dl) * m; vz += (dz / dl) * m; } else { vx = tx; vz = tz; }
    this.vel.x = vx; this.vel.z = vz;
    if (want.mag > 0.1) this.yaw = turnToward(this.yaw, Math.atan2(-want.z, want.x), 8 * dt);
    // Senkrecht: Auftrieb bis zur Oberfläche, Ducken taucht ab
    if (input.crouch) this.vel.y = approach(this.vel.y, -MOVE.swimSink, 12 * dt);
    else if (depth > 0.1) this.vel.y = Math.min(this.vel.y + MOVE.buoyancy * dt, 3);
    else { this.vel.y = approach(this.vel.y, 0, 14 * dt); if (depth < -0.05) this.vel.y -= 20 * dt; }
    this.setState('swim');
  }

  // ------------------------------------------------------------------ Kollision und Übergänge

  move(dt, input, want) {
    const c = this.center();
    const vBefore = { x: this.vel.x, z: this.vel.z };
    const res = this.world.moveAABB(c, this.half, { x: this.vel.x * dt, y: this.vel.y * dt, z: this.vel.z * dt }, {
      step: this.mode === 'ground' || this.mode === 'swim' ? 0.3 : 0.32,
      snap: this.mode === 'ground' ? 0.35 : 0,
      nudge: this.mode === 'air' ? 0.16 : 0,
    });
    this.pos.set(c.x, c.y - this.half.y, c.z);
    this.lastMove = res;

    // Kopfstoß (Blöcke von unten)
    if (res.ceiling && this.vel.y > 0) {
      this.vel.y = Math.min(0, this.vel.y) - 0.5;
      const target = this.pickCeiling(res);
      if (target) {
        target.hit?.(this, target);
        target.owner?.onBump?.(this, target);
      }
    }

    // Wände: Geschwindigkeit in die Wand entfernen
    if (res.hitWall) {
      const n = res.wallNormal;
      const d = this.vel.x * n.x + this.vel.z * n.z;
      if (d < 0) { this.vel.x -= n.x * d; this.vel.z -= n.z * d; }
      if (this.mode === 'ground') { const f = this.facingVec(); const along = this.vel.x * f.x + this.vel.z * f.z; this.gs = Math.max(0, Math.min(this.gs, along)); }
    }

    if (this.mode === 'air' || this.mode === 'wall') {
      if (res.grounded && this.vel.y <= 0.01) { this.land(res, input); return; }
      if (this.mode === 'air' && res.hitWall && res.wallShape) this.tryWall(res, vBefore, want);
    } else if (this.mode === 'ground') {
      if (res.grounded) { this.ground = res.ground; }
      else {
        // Kante verlassen: Coyote-Zeit, Schwung der Plattform mitnehmen
        this.mode = 'air';
        this.coyote = MOVE.coyote;
        this.vel.y = 0;
        this.vel.x += this.platformVel.x; this.vel.z += this.platformVel.z;
        this.airMax = Math.max(this.hSpeed(), MOVE.walk * this.speedMult);
        this.jumpKind = null; this.variable = false;
        this.ground = null;
        this.setCrouch(false);
        this.setState('fall');
      }
    } else if (this.mode === 'swim') {
      if (res.grounded) this.ground = res.ground;
    }
  }

  /** Bei mehreren Formen über dem Kopf: die mit dem Mittelpunkt am nächsten zur Figur. */
  pickCeiling(res) {
    let best = res.ceilingShape, bd = Infinity;
    const head = this.pos.y + this.half.y * 2;
    for (const s of res.hits) {
      if (!(s.hit || s.owner?.onBump)) continue;
      if (Math.abs(s.bot - head) > 0.08) continue;
      const cx = s.type === 'cyl' ? s.x : (s.x0 + s.x1) / 2, cz = s.type === 'cyl' ? s.z : (s.z0 + s.z1) / 2;
      const d = Math.hypot(cx - this.pos.x, cz - this.pos.z);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  tryWall(res, vBefore, want) {
    const sh = res.wallShape, n = res.wallNormal;
    if (this.state === 'groundpound' || this.state === 'dive' || this.state === 'hurt' || sh.noWallSlide || sh.bounce) return;
    if (Math.abs(n.y) > 0.01 || (Math.abs(n.x) < 0.01 && Math.abs(n.z) < 0.01)) return;
    const tall = sh.top >= this.headY - 0.1 && sh.bot <= this.pos.y + 0.3;
    if (!tall || this.vel.y > 8) return;
    const into = want.mag > 0.3 ? -(want.x * n.x + want.z * n.z) : 0;
    const vInto = -(vBefore.x * n.x + vBefore.z * n.z);
    if (into < 0.3 && vInto < 2) return;
    const climb = !!this.powerDef.canClimb && !!sh.climbable && this.climbLeft > 0 && into > 0.3;
    this.startWall(sh, n, climb);
  }

  land(res, input) {
    const vy = this.prevVy ?? this.vel.y;
    this.lastLandVy = vy;
    const g = res.ground;
    this.ground = g;
    // Stampfattacke: Zerbrechliches durchschlagen, Schalter/Blöcke von oben auslösen
    if (this.state === 'groundpound' || this.state === 'dive') {
      let broke = false;
      for (const s of res.hits) {
        if (Math.abs(s.top - this.pos.y) > 0.06 && s.type !== 'ramp') continue;
        if (s.breakable && this.state === 'groundpound') { s.owner?.onHit?.('pound', this); broke = true; }
        else { s.owner?.onPound?.(this, s); s.pound?.(this, s); }
      }
      if (broke) { this.vel.y = -MOVE.poundSpeed * 0.6; this.level.sfx('brickbreak'); return; }
      if (this.state === 'groundpound') {
        this.level.attackArea?.(this.pos, 1.4, 'pound', this);
        this.level.effects?.ring(this.pos, 1.4);
        this.level.shake?.(0.25);
        this.level.sfx('land');
      }
    }
    // Trampolin
    if (g?.bounce) {
      const k = this.state === 'groundpound' ? 1.3 : input.jump ? 1.15 : 1;
      this.vel.y = g.bounce * k;
      this.airMax = Math.max(this.hSpeed(), MOVE.walk * this.speedMult);
      this.enterAir('bounce', false);
      this.setState('jump2');
      g.owner?.onBounce?.(this);
      this.level.sfx('bounce');
      return;
    }
    const wasPound = this.state === 'groundpound';
    const wasDive = this.state === 'dive';
    const kind = this.jumpKind;
    this.mode = 'ground';
    this.climbLeft = MOVE.climbTime;
    this.coyote = 0;
    // Bodentempo aus der Luftgeschwindigkeit (rückwärts gelandet → stehen bleiben)
    const f = this.facingVec();
    const hv = this.hSpeed();
    const along = this.vel.x * f.x + this.vel.z * f.z;
    if (wasPound) this.gs = 0;
    else if (wasDive) this.gs = Math.max(6, hv);
    else if (along < 0 || hv < 0.5) this.gs = 0;
    else { this.gs = hv; if (hv > 1) this.yaw = Math.atan2(-this.vel.z, this.vel.x); }
    this.vel.y = -2;
    // Kettensprung-Fenster
    if (kind === 'jump' || kind === 'jump2') { this.chainKind = kind; this.chainTimer = MOVE.chainWindow; } else { this.chainKind = null; this.chainTimer = 0; }
    this.poundLanded = wasPound;
    this.jumpKind = null;
    if (wasPound) { this.setState('land'); this.landTime = MOVE.poundLand; }
    else if (wasDive) { this.setState('slide'); this.setCrouch(true); }
    else {
      this.setState('land'); this.landTime = MOVE.landTime;
      if (vy < -12) { this.level.sfx('land'); this.level.effects?.dust(this.pos, 5); }
    }
  }

  // ------------------------------------------------------------------ Auslöser (Wasser, Lava, Boost, Ranke, Röhre)

  checkTriggers(dt, input, want) {
    const c = this.center();
    const hits = this.world.overlapAABB(c, this.half);
    let water = null;
    for (const s of hits) {
      if (s.kill) {
        // Lava/Abgrund: Füße in der Form (Oberseite berührt reicht bei Lava)
        if (this.pos.y <= s.top + 0.02) { this.die(s.kill === 'lava' || s.lava ? 'lava' : 'fall'); return; }
      }
      if (s.water && c.y < s.top - 0.05) water = s;
      if (s.boost && this.mode === 'ground') this.applyBoost(s.boost);
      if (s.beanstalk && this.grabCooldown <= 0 && this.mode !== 'stalk') {
        if (this.mode === 'air' || this.mode === 'wall' || (this.mode === 'ground' && input.moveY > 0.5)) { this.grabStalk(s); return; }
      }
      if (s.trigger && s.onEnter) s.onEnter(this, s);
    }
    // Röhre: auf der Röhre stehen + Ducken
    if (this.mode === 'ground' && input.crouchPressed && this.ground?.pipe) {
      const p = this.ground.pipe;
      if (Math.hypot(this.pos.x - p.x, this.pos.z - p.z) < p.enterRadius) { p.enter?.(this); return; }
    }
    if (water) {
      if (this.mode !== 'swim') {
        this.mode = 'swim'; this.water = water; this.setCrouch(false);
        this.vel.y *= 0.3; this.jumpKind = null;
        if (this.prevVy < -6) this.level.effects?.splash(this.pos, water.top);
        this.level.sfx('splash');
      }
      this.water = water;
    } else if (this.mode === 'swim') {
      this.mode = 'air'; this.water = null; this.enterAir(null, false); this.setState('fall');
      this.airMax = Math.max(this.hSpeed(), MOVE.walk * this.speedMult * 0.6);
    }
  }

  applyBoost(b) {
    const yaw = Math.atan2(-b.z, b.x);
    this.yaw = yaw;
    this.gs = Math.max(this.gs, b.speed);
    this.boostTime = 0.45;
    if (this.state !== 'run') { this.setState('run'); this.level.sfx('boost'); }
  }

  updatePhase() {
    const st = this.state;
    if (FLIPS[st]) this.phase = clamp(this.stateTime / FLIPS[st], 0, 1);
    else if (st === 'groundpound') this.phase = this.poundPhase === 'spin' ? clamp(this.stateTime / MOVE.poundSpin, 0, 1) : 1;
    else this.phase = 0;
  }

  // ------------------------------------------------------------------ Treffer, Power-ups, Tod

  /** Treffer durch Gegner/Gefahr. Groß → klein (Power-up geht verloren), klein → Tod. */
  hurt(source) {
    if (this.dead || this.mode === 'script' || this.invulnerable) return false;
    this.dropHeld();
    if (this.power !== 'none') { this.setPower('none'); this.level.sfx('powerdown'); }
    else if (this.big) { this.big = false; this.updateHalf(); this.level.sfx('powerdown'); }
    else { this.die('hit'); return true; }
    this.invuln = MOVE.invuln;
    this.hurtTime = MOVE.hurtTime;
    let ax = 0, az = 0;
    if (source?.pos) { ax = this.pos.x - source.pos.x; az = this.pos.z - source.pos.z; }
    const l = Math.hypot(ax, az) || 1;
    if (this.mode === 'wall' || this.mode === 'stalk') this.mode = 'air';
    if (this.mode === 'ground') this.mode = 'air';
    this.vel.set((ax / l) * 5, 6.5, (az / l) * 5);
    this.airMax = 5;
    this.enterAir('hurt', false);
    this.setState('hurt');
    this.level.sfx('hurt');
    return true;
  }

  /** Power-up einsammeln: wachstumsbeere | krallen | funken | riese | stern | oneup (Aliasse erlaubt). */
  collectPowerup(name) {
    const p = normalizePower(name);
    if (p === 'oneup') { this.level.addLife?.(1); this.level.sfx('oneup'); return; }
    if (p === 'wachstumsbeere') {
      if (!this.big) { this.big = true; this.updateHalf(); }
      this.level.sfx('powerup');
      return;
    }
    this.setPower(p);
    this.level.sfx('powerup');
  }

  setPower(name) {
    const old = this.powerDef;
    const def = getPower(name);
    if (def.duration) {
      // zeitlich begrenzt: vorheriges Power-up merken
      if (!old.duration) this.powerPrev = this.power;
      this.powerTime = def.duration;
    }
    old.onLose?.(this);
    this.power = def === getPower('none') && name !== 'none' ? 'none' : name;
    if (def.big !== false && this.power !== 'none') { this.big = true; this.updateHalf(); }
    def.onGain?.(this);
  }

  endTimedPower() {
    const prev = this.powerPrev ?? 'none';
    this.powerDef.onLose?.(this);
    this.power = prev;
    this.powerTime = 0;
    this.powerPrev = 'none';
  }

  /** Abprall nach Draufspringen. */
  bounceOff(input) {
    this.vel.y = input?.jump ? MOVE.stompBounceHeld : MOVE.stompBounce;
    if (this.mode !== 'air') this.mode = 'air';
    this.airMax = Math.max(this.hSpeed(), MOVE.walk * this.speedMult);
    this.enterAir('stomp', true);
    this.setState('jump');
    this.chainKind = null;
  }

  die(cause = 'hit') {
    if (this.dead) return;
    this.dropHeld();
    this.dead = true;
    this.deathCause = cause;
    this.mode = 'script';
    this.script = { type: 'dead', t: 0, cause };
    this.vel.set(0, cause === 'fall' ? 0 : 10, 0);
    this.setState('dead');
    this.level.sfx('die');
    this.level.onPlayerDeath?.(cause);
  }

  // ------------------------------------------------------------------ Tragen/Werfen (Präzisierung Gegner/Power-ups)

  /** Darf die Figur gerade etwas aufheben? (am Boden oder in der Luft, nicht beim Stampfen/Sturzflug/Treffer) */
  canPickUp() {
    return !this.holding && !this.dead && (this.mode === 'ground' || this.mode === 'air')
      && this.state !== 'groundpound' && this.state !== 'dive' && this.state !== 'hurt';
  }

  /** Aktion: Gehaltenes werfen bzw. ein Objekt in Reichweite aufheben. true = Aktion verbraucht. */
  carryAction(input) {
    if (this.holding) { this.throwHeld(input); return true; }
    if (!this.canPickUp()) return false;
    const e = this.findCarryable();
    if (!e) return false;
    this.pickUp(e);
    return true;
  }

  /** Nächstes `carryable`-Objekt vor der Figur (≤ 0,75 m vor der Brust, Höhe −0,6 … +1 m) oder null. */
  findCarryable() {
    const f = this.facingVec();
    const fx = this.pos.x + f.x * 0.45, fz = this.pos.z + f.z * 0.45;
    let best = null, bd = Infinity;
    for (const e of this.level.entities) {
      if (!e.carryable || !e.alive || e.removed || e.carrier || e.canCarry?.(this) === false) continue;
      const dy = e.pos.y - this.pos.y;
      if (dy < -0.6 || dy > 1.0) continue;
      const d = Math.hypot(e.pos.x - fx, e.pos.z - fz) - e.half.x;
      if (d < 0.75 && d < bd) { bd = d; best = e; }
    }
    return best;
  }

  /** Objekt aufheben (auch von Entitäten aus aufrufbar, z. B. Rennen + Berührung). */
  pickUp(e) {
    if (!e || !this.canPickUp()) return false;
    this.holding = e;
    e.carrier = this;
    e.onPickup?.(this);
    this.holdPoint(e, e.pos);
    this.level.sfx('mount');
    return true;
  }

  /** Gehaltenes werfen (Blickrichtung, Bogen) bzw. mit gehaltenem Ducken vor sich absetzen. */
  throwHeld(input) {
    const e = this.holding;
    if (!e) return;
    this.holding = null;
    e.carrier = null;
    const gentle = !!input?.crouch;
    this.throwTime = 0.25;
    e.onThrow?.(this, { dir: this.facingVec(), gentle });
    this.level.sfx(gentle ? 'step' : 'swoop');
  }

  /** Gehaltenes fallen lassen (Treffer, Tod). */
  dropHeld() {
    const e = this.holding;
    if (!e) return;
    this.holding = null;
    if (e.carrier === this) e.carrier = null;
    e.onDrop?.(this);
  }

  /** Fußpunkt eines getragenen Objekts: über dem Kopf der Figur, leicht vor ihr (Riesentrank: über dem großen Kopf). */
  holdPoint(e, out) {
    const f = this.facingVec();
    const top = this.half.y * 2 * (this.powerDef.scale ?? 1);
    out.set(this.pos.x + f.x * 0.12, this.pos.y + top + 0.04, this.pos.z + f.z * 0.12);
    return out;
  }

  // ------------------------------------------------------------------ Skript-Abläufe (Röhre, Zielmast, Tod)

  /**
   * Röhre betreten. pipe = { x, z, top, exit: { x, z, top, pipe:true } | { pos:[x,y,z] }, onWarp? }.
   * Ablauf: 0,55 s hinab → Teleport (Kamera springt) → 0,55 s aus der Zielröhre hinauf.
   */
  enterPipe(pipe) {
    this.mode = 'script';
    this.script = { type: 'pipe', phase: 'down', t: 0, pipe };
    this.vel.set(0, 0, 0);
    this.gs = 0;
    this.setCrouch(false);
    this.pos.x = pipe.x; this.pos.z = pipe.z;
    this.setState('pipe');
    this.level.sfx('pipe');
  }

  /** Zielmast gepackt: herunterrutschen, Siegespose, dann runtime.finish(). */
  grabPole(goal) {
    this.mode = 'script';
    this.script = { type: 'goal', phase: 'slide', t: 0, goal };
    this.vel.set(0, 0, 0);
    this.gs = 0;
    this.pos.x = goal.poleX - Math.cos(goal.yaw ?? 0) * 0.35;
    this.pos.z = goal.poleZ + Math.sin(goal.yaw ?? 0) * 0.35;
    this.yaw = Math.PI / 2;
    this.setState('climb');
  }

  updateScript(dt, input) {
    const sc = this.script;
    if (!sc) { this.mode = 'air'; return; }
    sc.t += dt;
    if (sc.type === 'dead') {
      if (sc.cause !== 'fall' && sc.t > 0.4) {
        this.vel.y -= 32 * dt;
        this.pos.y += this.vel.y * dt;
      }
      if (sc.t >= (sc.cause === 'fall' ? 1.1 : 1.9) && !sc.done) { sc.done = true; this.level.onPlayerDeathDone?.(sc.cause); }
      return;
    }
    if (sc.type === 'pipe') {
      const p = sc.pipe;
      if (sc.phase === 'down') {
        this.pos.y -= 2.2 * dt;
        if (sc.t >= 0.55) {
          const ex = p.exit;
          sc.t = 0;
          if (ex?.pipe) {
            sc.phase = 'up'; sc.exit = ex;
            this.pos.set(ex.x, ex.top - 1.2, ex.z);
          } else {
            sc.phase = 'done';
            const q = ex?.pos ?? [p.x, p.top + 1, p.z];
            this.pos.set(q[0], q[1], q[2]);
          }
          this.level.onTeleport?.();
          p.onWarp?.(this);
          this.level.sfx('pipe');
        }
      } else if (sc.phase === 'up') {
        this.pos.y += 2.2 * dt;
        if (this.pos.y >= sc.exit.top) { this.pos.y = sc.exit.top; sc.phase = 'done'; }
      }
      if (sc.phase === 'done') { this.script = null; this.mode = 'air'; this.enterAir(null, false); this.setState('fall'); this.vel.set(0, 0, 0); }
      return;
    }
    if (sc.type === 'goal') {
      const g = sc.goal;
      if (sc.phase === 'slide') {
        this.pos.y = Math.max(g.baseY, this.pos.y - 7 * dt);
        if (this.pos.y <= g.baseY + 1e-3) { sc.phase = 'victory'; sc.t = 0; this.setState('victory'); this.yaw = -Math.PI / 2; this.level.sfx('victory'); }
      } else if (sc.phase === 'victory' && sc.t > 1.6 && !sc.done) {
        sc.done = true;
        this.level.onGoalDone?.();
      }
    }
  }

  /** Kurzinfo für Tests/HUD. */
  info() {
    return {
      x: +this.pos.x.toFixed(3), y: +this.pos.y.toFixed(3), z: +this.pos.z.toFixed(3),
      vx: +this.vel.x.toFixed(2), vy: +this.vel.y.toFixed(2), vz: +this.vel.z.toFixed(2),
      mode: this.mode, state: this.state, big: this.big, power: this.power, hero: this.hero,
      dead: this.dead, invuln: +this.invuln.toFixed(2), yaw: +this.yaw.toFixed(3),
    };
  }
}
