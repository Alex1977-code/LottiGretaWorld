// Pflaume – runder lila Käfer als Reittier.
// Zustände: free (läuft umher), ridden (Heldin sitzt oben), fleeing (panische Flucht).
// Beeren-Kräfte: red = Feuerball, blue = Schweben, yellow = Stampfsprung.

import Phaser from 'phaser';
import { PFLAUME, HERO } from '../config.js';
import { Fireball } from './Fireball.js';
import { damp } from '../systems/mathUtil.js';
import { vibrate } from '../systems/haptics.js';
import { sfx, music } from '../audio/index.js';
import { Z, fit, setBodyBox, worldH } from '../render.js';

export const PflaumeState = { FREE: 'free', RIDDEN: 'ridden', FLEEING: 'fleeing' };

export class Pflaume extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, groundLayer) {
    super(scene, x, y, 'pflaume', 'idle0_none');
    fit(this);
    this.y = y - worldH(this) / 2; // Füße auf y
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.groundLayer = groundLayer;
    setBodyBox(this, PFLAUME.freeBodyWidth, PFLAUME.freeBodyHeight);
    this.body.reset(this.x, this.y);
    this.body.setCollideWorldBounds(true);
    this.setDepth(9);

    this.state_ = PflaumeState.FREE;
    this.power = 'none';
    this.dir = -1;
    this.rider = null;
    this.idleTimer = PFLAUME.idleTime;
    this.walking = false;
    this.fleeTimer = 0;
    this.hopTimer = 0;
    this.fireCooldown = 0;
    this.hoverTimer = PFLAUME.hoverTime;
    this.hovering = false;
    this.stomping = false;
    this.stompLockTimer = 0;
    this.animTimer = 0;
    this.animFrame = 0;
    this.mountCooldown = 0;       // ms, in denen nach einer Flucht kein Aufsteigen möglich ist
  }

  get isRidden() { return this.state_ === PflaumeState.RIDDEN; }
  get canMount() { return !this.isRidden && this.mountCooldown <= 0; }
  get isFleeing() { return this.state_ === PflaumeState.FLEEING; }

  frameName(base) { return `${base}_${this.power}`; }

  /** Heldin steigt auf. */
  mount(hero) {
    this.state_ = PflaumeState.RIDDEN;
    this.rider = hero;
    this.body.enable = false;
    this.hoverTimer = PFLAUME.hoverTime;
    this.stomping = false;
    this.hovering = false;
    this.setDepth(hero.depth - 1); // Käfer unter der Reiterin
    hero.setMount(this);
    this.scene.registry.set('power', this.power);
    this.scene.effects?.dust(hero.x, hero.body.bottom, 6, 0.8);
    vibrate(10);
    sfx('mount');
    music.setDrums(true);
  }

  /** Reiterin wird getroffen: absteigen, Pflaume flieht panisch in Gegenrichtung. */
  panic(fromX) {
    const hero = this.rider;
    if (!hero) return;
    this.dir = Math.sign(this.x - fromX) || -hero.facing || -1;
    this.state_ = PflaumeState.FLEEING;
    this.fleeTimer = PFLAUME.fleeTime;
    this.hopTimer = 0;
    this.mountCooldown = PFLAUME.mountCooldown;
    this.rider = null;
    this.setPosition(hero.x, hero.body.bottom - worldH(this) / 2);
    this.body.enable = true;
    this.body.reset(this.x, this.y);
    this.body.setVelocity(this.dir * PFLAUME.fleeSpeed, -PFLAUME.fleeHopVelocity);
    this.setDepth(9);
    this.setFrame(this.frameName('panic'));
    hero.clearMount(-this.dir);
    this.scene.registry.set('power', '');
    this.scene.effects?.dust(this.x, this.body.bottom, 8, 1);
    sfx('panic');
    music.setDrums(false);
  }

  /** Beere fressen → neue Kraft. */
  eat(type) {
    this.power = type;
    this.hoverTimer = PFLAUME.hoverTime;
    this.scene.registry.set('power', this.isRidden ? type : '');
    this.scene.tweens.add({ targets: this, scaleX: 1.25 * Z, scaleY: 0.8 * Z, duration: 90, yoyo: true });
    vibrate(15);
    sfx('berry');
  }

  /** Verschwindet (Flucht abgelaufen). */
  vanish() {
    this.scene.effects?.leaves(this.x, this.y, 8);
    this.scene.effects?.dust(this.x, this.y, 6, 0.6);
    sfx('vanish');
    this.destroy();
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body) return;
    if (this.mountCooldown > 0) this.mountCooldown -= delta;
    switch (this.state_) {
      case PflaumeState.FREE: this.updateFree(delta); break;
      case PflaumeState.FLEEING: this.updateFleeing(delta); break;
      case PflaumeState.RIDDEN: this.updateRidden(delta); break;
    }
  }

  /** Ohne Reiter: gemütlich hin und her, mit Pausen. */
  updateFree(delta) {
    const body = this.body;
    this.idleTimer -= delta;
    if (this.idleTimer <= 0) {
      this.walking = !this.walking;
      this.idleTimer = this.walking ? PFLAUME.idleTime * 0.8 : PFLAUME.idleTime;
      if (this.walking && Math.random() < 0.5) this.dir *= -1;
    }
    if (this.walking && body.blocked.down) {
      if (body.blocked.left) this.dir = 1; else if (body.blocked.right) this.dir = -1;
      const aheadX = this.dir > 0 ? body.right + 2 : body.left - 2;
      const tile = this.groundLayer.getTileAtWorldXY(aheadX, body.bottom + 2);
      if (!tile || !tile.collides) this.dir *= -1;
      body.setVelocityX(this.dir * PFLAUME.walkSpeed);
    } else {
      body.setVelocityX(0);
    }
    this.setFlipX(this.dir < 0); // Grafik blickt nach rechts
    this.animate(delta, this.walking ? ['walk0', 'walk1'] : ['idle0', 'idle1'], this.walking ? 160 : 500);
  }

  /** Flucht: schnell weg, kleine Hüpfer, an Wänden umdrehen, nach Ablauf weg. */
  updateFleeing(delta) {
    const body = this.body;
    this.fleeTimer -= delta;
    if (this.fleeTimer <= 0) { this.vanish(); return; }
    if (body.blocked.left) this.dir = 1; else if (body.blocked.right) this.dir = -1;
    body.setVelocityX(this.dir * PFLAUME.fleeSpeed);
    this.hopTimer -= delta;
    if (body.blocked.down && this.hopTimer <= 0) {
      body.setVelocityY(-PFLAUME.fleeHopVelocity);
      this.hopTimer = PFLAUME.fleeHopInterval;
      this.scene.effects?.dust(this.x, body.bottom, 2, 0.5);
    }
    this.setFlipX(this.dir < 0); // Grafik blickt nach rechts
    this.setFrame(this.frameName('panic'));
    // Blinken in der letzten Sekunde
    this.setAlpha(this.fleeTimer < 1000 && Math.floor(this.fleeTimer / 90) % 2 === 0 ? 0.4 : 1);
  }

  /** Beim Reiten: Position folgt Hero, Kräfte werden von Hero aus aufgerufen. */
  updateRidden(delta) {
    const hero = this.rider;
    if (!hero) return;
    if (this.fireCooldown > 0) this.fireCooldown -= delta;
    if (this.stompLockTimer > 0) this.stompLockTimer -= delta;
    if (hero.onGround) this.hoverTimer = PFLAUME.hoverTime;

    // Füße des Käfers 12 px unter den Füßen der Heldin (= Unterkante der gemeinsamen Hitbox)
    this.setPosition(hero.x, hero.y + worldH(hero) / 2 + (PFLAUME.bodyHeight - HERO.bodyHeight) - worldH(this) / 2);
    this.setFlipX(hero.facing < 0);
    this.setAlpha(hero.alpha);

    let base;
    if (this.hovering) base = 'fly';
    else if (hero.onGround && Math.abs(hero.body.velocity.x) > 8) base = null;
    else base = 'idle0';
    if (base === null) this.animate(delta, ['walk0', 'walk1'], Math.max(70, 160 - Math.abs(hero.body.velocity.x)));
    else this.setFrame(this.frameName(base));
  }

  /** Einfache Frame-Animation ohne Anim-Manager (wegen Varianten-Namen). */
  animate(delta, frames, interval) {
    this.animTimer += delta;
    if (this.animTimer >= interval) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % frames.length;
    }
    this.setFrame(this.frameName(frames[this.animFrame % frames.length]));
  }

  // ---------- Kräfte (von Hero aufgerufen) ----------

  /** Aktionstaste: Feuerball (rot) oder Stampfsprung (gelb, in der Luft). */
  useAction(hero) {
    if (this.power === 'red') {
      if (this.fireCooldown > 0) return false;
      this.fireCooldown = PFLAUME.fireCooldown;
      const dir = hero.facing;
      const fb = new Fireball(this.scene, this.x + dir * 10, this.y - 2, dir);
      this.scene.fireballs.add(fb);
      this.scene.tweens.add({ targets: this, scaleX: 1.2 * Z, scaleY: 0.9 * Z, duration: 70, yoyo: true });
      vibrate(8);
      sfx('fireball');
      return true;
    }
    if (this.power === 'yellow' && !hero.onGround && !this.stomping) {
      this.stomping = true;
      hero.body.setVelocity(hero.body.velocity.x * 0.3, PFLAUME.stompSpeed);
      hero.body.setAllowGravity(false);
      this.scene.effects?.leaves(this.x, this.y, 3);
      return true;
    }
    return false;
  }

  /** Schweben (blau): während des Fallens Sprungtaste halten. Gibt true zurück, wenn aktiv. */
  updateHover(hero, inp, dt, delta) {
    const body = hero.body;
    const want = this.power === 'blue' && !hero.onGround && inp.jumpHeld && body.velocity.y > 0 && this.hoverTimer > 0 && !this.stomping;
    if (want) {
      this.hoverTimer -= delta;
      body.setAllowGravity(false);
      body.setVelocityY(damp(body.velocity.y, PFLAUME.hoverSink, PFLAUME.hoverLerp, dt));
      if (!this.hovering) { this.scene.effects?.dust(this.x, this.y + 6, 3, 0.4); sfx('hover'); }
      this.hovering = true;
      if (Math.random() < 0.3) this.scene.effects?.dust(this.x + (Math.random() - 0.5) * 10, this.y + 7, 1, 0.3);
    } else if (this.hovering) {
      this.hovering = false;
      body.setAllowGravity(true);
    }
    return this.hovering;
  }

  /** Stampfsprung: solange true, hat Hero keine Steuerung. Landung löst den Aufprall aus. */
  updateStomp(hero) {
    if (!this.stomping) return this.stompLockTimer > 0;
    hero.body.setVelocityY(PFLAUME.stompSpeed);
    if (hero.onGround) {
      this.stomping = false;
      hero.body.setAllowGravity(true);
      this.stompLockTimer = PFLAUME.stompLock;
      this.scene.onStompLand(hero, this);
    }
    return true;
  }
}
