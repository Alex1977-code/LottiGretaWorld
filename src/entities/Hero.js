// Hero – die spielbare Heldin (Lotti oder Greta, gleiche Fähigkeiten). Komplette Bewegungslogik:
// Beschleunigen/Bremsen, variable Sprunghöhe, Coyote Time, Jump Buffer,
// Blätterschirm (Gleiten), Sturzflug und Aufschwung.

import Phaser from 'phaser';
import { HERO, PHYSICS, ENEMIES, DAMAGE, PFLAUME, HERO_VARIANTS } from '../config.js';
import { approach, damp, sign } from '../systems/mathUtil.js';
import { vibrate } from '../systems/haptics.js';
import { sfx } from '../audio/index.js';
import { Z, fit, setBodyBox, worldW, worldH } from '../render.js';

export const HeroState = {
  GROUND: 'ground',
  AIR: 'air',
  GLIDE: 'glide',
  DIVE: 'dive',
};

// Leere Eingabe (für Rückstoß/Tod)
const NO_INPUT = Object.freeze({ axisX: 0, jumpHeld: false, jumpJustPressed: false, diveHeld: false, diveJustPressed: false, actionJustPressed: false });

export class Hero extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x Fußpunkt X
   * @param {number} y Fußpunkt Y (Unterkante)
   * @param {string} heroKey Textur-Key der Heldin ('hero' | 'greta')
   * @param {import('../systems/InputManager.js').InputManager} input
   * @param {import('../systems/Effects.js').Effects} effects
   */
  constructor(scene, x, y, heroKey, input, effects) {
    super(scene, x, y, heroKey, 'idle0');
    this.key = heroKey;
    this.variant = HERO_VARIANTS[heroKey] ?? HERO_VARIANTS.lotti;
    fit(this);
    this.y = y - worldH(this) / 2; // Füße auf y
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.ctrl = input;
    this.effects = effects;

    this.applyHeroBody();
    this.body.setMaxVelocityY(PHYSICS.hardMaxSpeed); // Sturzflug/Stampfer dürfen schneller sein als normales Fallen
    this.body.setCollideWorldBounds(true);
    this.body.onWorldBounds = false;
    this.setDepth(10);

    this.moveState = HeroState.GROUND;
    this.facing = 1;              // 1 = rechts, -1 = links
    this.coyoteTimer = 0;         // ms
    this.jumpBufferTimer = 0;     // ms
    this.isJumping = false;       // Sprung läuft (für variable Höhe)
    this.wasOnGround = false;
    this.prevVy = 0;              // Fallgeschw. vor dem Aufprall
    this.diveStartY = 0;
    this.swooping = false;        // Aufschwung nach Sturzflug läuft
    this.airTime = 0;             // ms in der Luft
    this.leafTimer = 0;           // Blätter-Partikel beim Gleiten
    this.spawnPoint = new Phaser.Math.Vector2(x, y);
    this.respawnLock = false;
    this.invincibleTimer = 0;     // ms Unverwundbarkeit nach Treffer
    this.controlLockTimer = 0;    // ms ohne Steuerung (Rückstoß)
    this.blinkTimer = 0;
    this.dead = false;
    this.mount = null;            // Pflaume, wenn Hero reitet
    this.locked = false;          // keine Eingabe (Levelende)

    // Blätterschirm als eigenes Sprite über Hero
    this.leaf = fit(scene.add.sprite(x, y, 'leaf', 'leaf0')).setDepth(11).setVisible(false);

    // Squash & Stretch nur für die Darstellung: Die Skalierung wird erst nach dem
    // Physik-Schritt gesetzt und vor dem nächsten zurückgenommen, damit die Hitbox
    // nicht mitskaliert.
    this.squashX = 1;
    this.squashY = 1;
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.applySquash, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.applySquash, this));

    this.createAnimations();
    this.play(`${this.key}-idle`);
  }

  /** Figur wechseln (Lotti ↔ Greta): Textur und Animationen tauschen, Zustand bleibt. */
  setHeroKey(key) {
    if (key === this.key) return;
    this.key = key;
    this.variant = HERO_VARIANTS[key] ?? HERO_VARIANTS.lotti;
    this.setTexture(key, 'idle0');
    this.createAnimations();
    this.play(`${key}-idle`, true);
  }

  /** Normale Hitbox: mittig, Unterkante = Frame-Unterkante. */
  applyHeroBody() {
    setBodyBox(this, HERO.bodyWidth, HERO.bodyHeight);
  }

  createAnimations() {
    const a = this.scene.anims;
    const tex = this.key;
    const mk = (name, frames, frameRate, repeat = -1) => {
      const key = `${tex}-${name}`;
      if (a.exists(key)) return;
      a.create({ key, frames: frames.map((f) => ({ key: tex, frame: f })), frameRate, repeat });
    };
    mk('idle', ['idle0', 'idle0', 'idle0', 'idle1'], 2);
    mk('run', ['run0', 'run1', 'run2', 'run3'], 12);
    mk('jump', ['jump'], 1, 0);
    mk('fall', ['fall'], 1, 0);
    mk('glide', ['glide'], 1, 0);
    mk('ride', ['ride'], 1, 0);
    mk('dive', ['dive'], 1, 0);
    if (!a.exists('leaf-sway')) {
      a.create({ key: 'leaf-sway', frames: [{ key: 'leaf', frame: 'leaf0' }, { key: 'leaf', frame: 'leaf1' }], frameRate: 5, repeat: -1 });
    }
  }

  /** Setzt Hero an den Startpunkt zurück. */
  respawn() {
    if (this.mount) {
      const m = this.mount;
      this.mount = null;
      this.applyHeroBody();
      this.scene.registry.set('power', '');
      m.destroy();
    }
    this.setPosition(this.spawnPoint.x, this.spawnPoint.y - worldH(this) / 2);
    this.body.reset(this.spawnPoint.x, this.spawnPoint.y - worldH(this) / 2);
    this.body.setVelocity(0, 0);
    this.moveState = HeroState.AIR;
    this.isJumping = false;
    this.swooping = false;
    this.leaf.setVisible(false);
    this.respawnLock = false;
    this.squash(1, 1);
    this.dead = false;
    this.invincibleTimer = DAMAGE.invincibleTime; // kurze Schonfrist nach dem Respawn
    this.controlLockTimer = 0;
    this.setAlpha(1);
    this.leaf.setAlpha(1);
  }

  get invincible() { return this.invincibleTimer > 0; }

  /** Auf Pflaume aufsteigen: größere Hitbox (beide zusammen), kleiner Hüpfer. */
  setMount(pflaume) {
    this.mount = pflaume;
    this.leaf.setVisible(false);
    this.moveState = HeroState.AIR;
    this.swooping = false;
    // Hitbox nach unten verlängern (Pflaume darunter), Heldin rutscht optisch nach oben
    this.y -= PFLAUME.bodyHeight - HERO.bodyHeight;
    setBodyBox(this, PFLAUME.bodyWidth, PFLAUME.bodyHeight, (worldW(this) - PFLAUME.bodyWidth) / 2, worldH(this) - HERO.bodyHeight);
    this.body.reset(this.x, this.y);
    this.body.setVelocityY(-PFLAUME.mountHop);
    this.body.setAllowGravity(true);
  }

  /** Absteigen (Treffer): zurück zur normalen Hitbox, Hero wird weggeschleudert. */
  clearMount(dirX) {
    if (!this.mount) return;
    this.mount = null;
    this.applyHeroBody();
    this.body.setAllowGravity(true);
    this.body.setVelocity(dirX * PFLAUME.throwOffVelocityX, -PFLAUME.throwOffVelocityY);
    this.moveState = HeroState.AIR;
    this.isJumping = false;
    this.invincibleTimer = DAMAGE.invincibleTime * 0.6;
    this.controlLockTimer = DAMAGE.controlLock;
    this.squash(1.2, 0.8);
    vibrate([20, 30, 20]);
  }

  /** Rückstoß und Unverwundbarkeit nach einem Treffer. Liefert false, wenn gerade immun. */
  hurt(fromX) {
    if (this.invincible || this.dead || this.respawnLock) return false;
    const dir = this.x < fromX ? -1 : 1;
    this.body.setVelocity(dir * DAMAGE.knockbackX, -DAMAGE.knockbackY);
    this.body.setAllowGravity(true);
    this.moveState = HeroState.AIR;
    this.leaf.setVisible(false);
    this.isJumping = false;
    this.swooping = false;
    this.invincibleTimer = DAMAGE.invincibleTime;
    this.controlLockTimer = DAMAGE.controlLock;
    this.squash(1.2, 0.8);
    vibrate([30, 40, 30]);
    sfx('hurt');
    return true;
  }

  /** Abprall nach dem Besiegen eines Gegners. */
  bounce(jumpHeld) {
    this.body.setVelocityY(-(jumpHeld ? ENEMIES.stompBounceHeld : ENEMIES.stompBounce));
    this.body.setAllowGravity(true);
    this.moveState = HeroState.AIR;
    this.isJumping = true;       // erlaubt variable Höhe wie beim Sprung
    this.swooping = false;
    this.leaf.setVisible(false);
    this.squash(0.85, 1.2);
    vibrate(12);
  }

  setSpawn(x, y) { this.spawnPoint.set(x, y); }

  get onGround() {
    return this.body.blocked.down || this.body.touching.down;
  }

  /** Visuelle Verformung setzen (wirkt erst nach dem Physik-Schritt). */
  squash(x, y) { this.squashX = x; this.squashY = y; }

  applySquash() { super.setScale(this.squashX * Z, this.squashY * Z); }

  preUpdate(time, delta) {
    super.setScale(Z, Z); // Physik sieht immer die Grundskalierung
    super.preUpdate(time, delta);
    const dt = Math.min(delta, 50) / 1000; // Schutz vor Riesensprüngen (Tab-Wechsel)
    const body = this.body;
    const onGround = this.onGround;

    // Timer für Treffer-Rückstoß / Unverwundbarkeit
    if (this.controlLockTimer > 0) this.controlLockTimer -= delta;
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= delta;
      this.blinkTimer += delta;
      if (this.blinkTimer >= DAMAGE.blinkInterval) {
        this.blinkTimer = 0;
        this.setAlpha(this.alpha < 1 ? 1 : 0.35);
      }
      if (this.invincibleTimer <= 0) this.setAlpha(1);
    }
    this.leaf.setAlpha(this.alpha);

    // Während des Rückstoßes (oder tot) keine Eingabe
    const inp = (this.controlLockTimer > 0 || this.dead || this.locked) ? NO_INPUT : this.ctrl;

    // --- Landung erkennen ---
    if (onGround && !this.wasOnGround) this.onLand();
    if (!onGround) this.airTime += delta; else this.airTime = 0;

    // --- Blickrichtung ---
    if (inp.axisX !== 0 && this.moveState !== HeroState.DIVE) this.facing = sign(inp.axisX);

    // --- Reittier: Aktion (Feuer/Stampfen), Stampf-Sperre ---
    let locked = false;
    if (this.mount) {
      if (inp.actionJustPressed) this.mount.useAction(this);
      locked = this.mount.updateStomp(this);
    }
    const ctrl = locked ? NO_INPUT : inp;

    // --- Zustandswechsel ---
    this.updateState(onGround, ctrl, delta);

    // --- Horizontal ---
    this.updateHorizontal(onGround, ctrl, dt);

    // --- Vertikal ---
    if (!(this.mount && this.mount.stomping)) this.updateVertical(onGround, ctrl, dt, delta);
    if (this.mount) this.mount.updateHover(this, ctrl, dt, delta);

    // --- Darstellung ---
    this.updateVisuals(onGround, dt, delta);

    this.wasOnGround = onGround;
    this.prevVy = body.velocity.y;
  }

  updateState(onGround, inp, delta) {
    const body = this.body;
    const vy = body.velocity.y;

    if (onGround) {
      if (this.moveState !== HeroState.GROUND) {
        this.moveState = HeroState.GROUND;
        this.swooping = false;
        this.isJumping = false;
      }
      return;
    }

    switch (this.moveState) {
      case HeroState.GROUND:
        // Kante verlassen ohne Sprung
        this.moveState = HeroState.AIR;
        break;
      case HeroState.AIR:
        if (vy >= 0) this.swooping = false;
        // Schirm öffnen: halten + fallen (nicht beim Reiten – da schwebt Pflaume)
        if (!this.mount && inp.jumpHeld && vy > HERO.glideMinFallSpeed) this.startGlide();
        break;
      case HeroState.GLIDE:
        if (!inp.jumpHeld) this.stopGlide();
        else if (inp.diveJustPressed) this.startDive();
        break;
      case HeroState.DIVE:
        if (!inp.diveHeld) this.endDive(inp);
        break;
    }
  }

  updateHorizontal(onGround, inp, dt) {
    const body = this.body;
    const ax = inp.axisX;
    let vx = body.velocity.x;
    let accel, decel, maxSpeed;

    switch (this.moveState) {
      case HeroState.GROUND:
        accel = HERO.groundAccel; decel = HERO.groundDecel; maxSpeed = HERO.runSpeed * this.variant.speedMult; break;
      case HeroState.GLIDE:
        accel = HERO.glideAccel; decel = HERO.glideDecel; maxSpeed = HERO.glideMaxSpeed * this.variant.airSpeedMult; break;
      case HeroState.DIVE:
        accel = HERO.diveSteerAccel; decel = 0; maxSpeed = HERO.airMaxSpeed * this.variant.airSpeedMult; break;
      default:
        accel = HERO.airAccel; maxSpeed = HERO.airMaxSpeed * this.variant.airSpeedMult;
        decel = this.swooping ? HERO.swoopAirDecel : HERO.airDecel;
    }

    if (ax !== 0) {
      const target = ax * maxSpeed;
      const sameDir = sign(vx) === sign(ax);
      if (sameDir && Math.abs(vx) > maxSpeed) {
        // Überschuss (z.B. nach Aufschwung) nur sanft abbauen – Schwung behalten
        vx = approach(vx, target, (this.swooping ? HERO.swoopAirDecel : decel) * dt);
      } else {
        const turning = vx !== 0 && !sameDir;
        if (turning && onGround && Math.abs(vx) > 70) this.effects?.dust(this.x - sign(vx) * 4, this.body.bottom, 2, 0.6);
        const a = accel * (turning && onGround ? HERO.turnBoost : 1);
        vx = approach(vx, target, a * dt);
      }
    } else {
      vx = approach(vx, 0, decel * dt);
    }
    body.setVelocityX(vx);
  }

  updateVertical(onGround, inp, dt, delta) {
    const body = this.body;

    // Timer: Coyote & Jump Buffer
    if (onGround) this.coyoteTimer = HERO.coyoteTime; else this.coyoteTimer -= delta;
    if (inp.jumpJustPressed) this.jumpBufferTimer = HERO.jumpBuffer; else this.jumpBufferTimer -= delta;

    // Absprung (auch kurz nach Verlassen der Kante, auch kurz vor der Landung)
    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0 && this.moveState !== HeroState.DIVE) {
      this.doJump();
    }

    let vy = body.velocity.y;

    switch (this.moveState) {
      case HeroState.GLIDE: {
        body.setAllowGravity(false);
        body.setGravityY(0);
        // Weich auf Gleit-Sinkgeschwindigkeit einschwingen ("Schirm öffnet sich")
        vy = damp(vy, HERO.glideFallSpeed, HERO.glideOpenLerp, dt);
        body.setVelocityY(vy);
        break;
      }
      case HeroState.DIVE: {
        body.setAllowGravity(false);
        body.setGravityY(0);
        vy = approach(vy, HERO.diveMaxSpeed, HERO.diveAccel * dt);
        body.setVelocityY(vy);
        break;
      }
      default: {
        body.setAllowGravity(true);
        // Variable Sprunghöhe: früh loslassen kappt die Aufwärtsgeschwindigkeit
        if (this.isJumping && !inp.jumpHeld && vy < -HERO.jumpCutVelocity * this.variant.jumpMult) {
          vy = -HERO.jumpCutVelocity * this.variant.jumpMult;
          body.setVelocityY(vy);
          this.isJumping = false;
        }
        if (this.isJumping && vy >= 0) this.isJumping = false;

        // Normales Fallen begrenzen (Sturzflug/Stampfer sind davon ausgenommen)
        if (vy > PHYSICS.maxFallSpeed && !this.swooping) {
          vy = PHYSICS.maxFallSpeed;
          body.setVelocityY(vy);
        }

        // Zusatz-Schwerkraft: schneller fallen, leichter am Scheitelpunkt
        let extra = 0;
        if (!onGround) {
          if (vy > 0) extra = PHYSICS.gravity * (HERO.fallMultiplier * this.variant.fallMult - 1);
          else if (Math.abs(vy) < HERO.apexThreshold && this.isJumping) extra = PHYSICS.gravity * (HERO.apexGravityMult - 1);
        }
        body.setGravityY(extra);
      }
    }
  }

  doJump() {
    const body = this.body;
    body.setVelocityY(-HERO.jumpVelocity * this.variant.jumpMult);
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.isJumping = true;
    this.swooping = false;
    this.moveState = HeroState.AIR;
    // Squash & Stretch: beim Absprung lang ziehen
    this.squash(0.85, 1.18);
    this.effects?.dust(this.x, this.body.bottom, 3, 0.5);
    sfx('jump');
  }

  startGlide() {
    this.moveState = HeroState.GLIDE;
    this.isJumping = false;
    this.swooping = false;
    this.leaf.setVisible(true).play('leaf-sway');
    this.leaf.setScale(0.6 * Z, 0.6 * Z);
    this.effects?.leaves(this.x, this.y - 12, 5);
    sfx('glideOpen');
  }

  stopGlide() {
    this.moveState = HeroState.AIR;
    this.leaf.setVisible(false);
  }

  startDive() {
    this.moveState = HeroState.DIVE;
    this.diveStartY = this.y;
    this.leaf.setVisible(false);
    // Der Sturzflug "faltet" den Schirm zusammen – bisheriger Sinkflug wird zu Fahrt
    const body = this.body;
    body.setVelocityY(Math.max(body.velocity.y, 80));
    this.effects?.leaves(this.x, this.y - 10, 3);
    sfx('dive');
  }

  /** Beendet den Sturzflug. Je tiefer der Sturz, desto höher der Aufschwung. */
  endDive(inp) {
    const body = this.body;
    const depth = this.y - this.diveStartY;
    if (depth >= HERO.diveMinDepth) {
      const v = Math.min(HERO.swoopMaxVelocity, Math.sqrt(2 * PHYSICS.gravity * depth * HERO.swoopEfficiency));
      body.setVelocityY(-v);
      // Schub in Blickrichtung – Höhe wird teilweise in Weite umgesetzt
      const dir = this.facing;
      let vx = body.velocity.x + dir * HERO.swoopSpeedBoost;
      if (Math.abs(vx) > HERO.swoopMaxSpeed) vx = dir * HERO.swoopMaxSpeed;
      body.setVelocityX(vx);
      this.swooping = true;
      this.squash(0.8, 1.25);
      this.effects?.leaves(this.x, this.y, 6);
      vibrate(8);
      sfx('swoop');
    }
    this.moveState = HeroState.AIR;
    body.setAllowGravity(true);
    // Schirm bleibt zu, bis die Fallbedingung wieder greift (jumpHeld + Fallen)
  }

  onLand() {
    const impact = this.prevVy;
    this.leaf.setVisible(false);
    if (impact > HERO.hardLandSpeed) {
      this.squash(1.3, 0.7);
      this.effects?.dust(this.x, this.body.bottom, 10, 1);
      this.scene.cameras.main.shake(80, 0.004);
      vibrate(20);
      sfx('hardLand');
    } else if (impact > HERO.landDustMinSpeed) {
      this.squash(1.18, 0.84);
      this.effects?.dust(this.x, this.body.bottom, 5, 0.7);
      vibrate(6);
      sfx('land');
    }
  }

  updateVisuals(onGround, dt, delta) {
    const body = this.body;
    const vx = body.velocity.x;
    const vy = body.velocity.y;

    // Squash & Stretch zurück zur Normalform
    this.squash(damp(this.squashX, 1, 14, dt), damp(this.squashY, 1, 14, dt));

    this.setFlipX(this.facing < 0);

    // Animation wählen
    let anim;
    switch (this.moveState) {
      case HeroState.GROUND:
        if (Math.abs(vx) > 8) {
          anim = `${this.key}-run`;
          // Laufanimation an Geschwindigkeit koppeln
          this.anims.timeScale = Phaser.Math.Clamp(Math.abs(vx) / HERO.runSpeed, 0.5, 1.3);
        } else {
          anim = `${this.key}-idle`;
          this.anims.timeScale = 1;
        }
        break;
      case HeroState.GLIDE: anim = `${this.key}-glide`; break;
      case HeroState.DIVE: anim = `${this.key}-dive`; break;
      default: anim = (vy < 0 || this.mount?.hovering) ? `${this.key}-jump` : `${this.key}-fall`;
    }
    if (this.mount) anim = `${this.key}-ride`; // sitzt auf Pflaume
    if (this.anims.currentAnim?.key !== anim) this.play(anim, true);

    // Leichte Neigung in Flugrichtung beim Gleiten/Aufschwung
    if (this.moveState === HeroState.GLIDE) this.setAngle(vx * 0.06);
    else if (this.swooping) this.setAngle(-this.facing * 10);
    else this.setAngle(0);

    // Blätterschirm positionieren
    if (this.leaf.visible) {
      this.leaf.setScale(damp(this.leaf.scaleX, Z, 18, dt), damp(this.leaf.scaleY, Z, 18, dt));
      this.leaf.setPosition(this.x - this.facing * 1, this.y - worldH(this) / 2 - 5);
      this.leaf.setFlipX(this.facing < 0);
      this.leaf.setAngle(vx * 0.1);
      // Blätter rieseln
      this.leafTimer += delta;
      if (this.leafTimer > 140) {
        this.leafTimer = 0;
        this.effects?.leaves(this.leaf.x + Phaser.Math.Between(-8, 8), this.leaf.y + 4, 1);
      }
    }
  }

  destroy(fromScene) {
    this.leaf?.destroy();
    super.destroy(fromScene);
  }
}
