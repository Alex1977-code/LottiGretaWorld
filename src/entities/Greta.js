// Greta – hellblondes Mädchen, trägt Lotti huckepack.
// Zustände: free (läuft umher), ridden (Lotti sitzt auf ihrem Rücken), fleeing (erschrockene Flucht).
// Beeren-Kräfte: red = Feuerball, blue = Schweben, yellow = Stampfsprung.

import Phaser from 'phaser';
import { GRETA } from '../config.js';
import { Fireball } from './Fireball.js';
import { damp } from '../systems/mathUtil.js';
import { vibrate } from '../systems/haptics.js';
import { sfx, music } from '../audio/index.js';

export const GretaState = { FREE: 'free', RIDDEN: 'ridden', FLEEING: 'fleeing' };

export class Greta extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, groundLayer) {
    super(scene, x, y - 10, 'greta', 'idle0_none');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.groundLayer = groundLayer;
    this.body.setSize(GRETA.freeBodyWidth, GRETA.freeBodyHeight).setOffset(4, 2);
    this.body.setCollideWorldBounds(true);
    this.setDepth(9);

    this.state_ = GretaState.FREE;
    this.power = 'none';
    this.dir = -1;
    this.rider = null;
    this.idleTimer = GRETA.idleTime;
    this.walking = false;
    this.fleeTimer = 0;
    this.hopTimer = 0;
    this.fireCooldown = 0;
    this.hoverTimer = GRETA.hoverTime;
    this.hovering = false;
    this.stomping = false;
    this.stompLockTimer = 0;
    this.animTimer = 0;
    this.animFrame = 0;
    this.mountCooldown = 0;       // ms, in denen nach einer Flucht kein Aufsteigen möglich ist
  }

  get isRidden() { return this.state_ === GretaState.RIDDEN; }
  get canMount() { return !this.isRidden && this.mountCooldown <= 0; }
  get isFleeing() { return this.state_ === GretaState.FLEEING; }

  frameName(base) { return `${base}_${this.power}`; }

  /** Lotti klettert auf Gretas Rücken. */
  mount(lotti) {
    this.state_ = GretaState.RIDDEN;
    this.rider = lotti;
    this.body.enable = false;
    this.hoverTimer = GRETA.hoverTime;
    this.stomping = false;
    this.hovering = false;
    this.setDepth(lotti.depth + 1); // Greta vorn, Lotti schaut hinter ihr hervor
    lotti.setMount(this);
    this.scene.registry.set('power', this.power);
    this.scene.effects?.dust(lotti.x, lotti.body.bottom, 6, 0.8);
    vibrate(10);
    sfx('mount');
    music.setDrums(true);
  }

  /** Lotti wird getroffen: Greta lässt sie fallen und rennt erschrocken in Gegenrichtung davon. */
  panic(fromX) {
    const lotti = this.rider;
    if (!lotti) return;
    this.dir = Math.sign(this.x - fromX) || -lotti.facing || -1;
    this.state_ = GretaState.FLEEING;
    this.fleeTimer = GRETA.fleeTime;
    this.hopTimer = 0;
    this.mountCooldown = GRETA.mountCooldown;
    this.rider = null;
    this.setPosition(lotti.x, lotti.body.bottom - 10);
    this.body.enable = true;
    this.body.reset(this.x, this.y);
    this.body.setVelocity(this.dir * GRETA.fleeSpeed, -GRETA.fleeHopVelocity);
    this.setDepth(9);
    this.setFrame(this.frameName('panic'));
    lotti.clearMount(-this.dir);
    this.scene.registry.set('power', '');
    this.scene.effects?.dust(this.x, this.body.bottom, 8, 1);
    sfx('panic');
    music.setDrums(false);
  }

  /** Beere fressen → neue Kraft. */
  eat(type) {
    this.power = type;
    this.hoverTimer = GRETA.hoverTime;
    this.scene.registry.set('power', this.isRidden ? type : '');
    this.scene.tweens.add({ targets: this, scaleX: 1.25, scaleY: 0.8, duration: 90, yoyo: true });
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
      case GretaState.FREE: this.updateFree(delta); break;
      case GretaState.FLEEING: this.updateFleeing(delta); break;
      case GretaState.RIDDEN: this.updateRidden(delta); break;
    }
  }

  /** Ohne Reiter: gemütlich hin und her, mit Pausen. */
  updateFree(delta) {
    const body = this.body;
    this.idleTimer -= delta;
    if (this.idleTimer <= 0) {
      this.walking = !this.walking;
      this.idleTimer = this.walking ? GRETA.idleTime * 0.8 : GRETA.idleTime;
      if (this.walking && Math.random() < 0.5) this.dir *= -1;
    }
    if (this.walking && body.blocked.down) {
      if (body.blocked.left) this.dir = 1; else if (body.blocked.right) this.dir = -1;
      const aheadX = this.dir > 0 ? body.right + 2 : body.left - 2;
      const tile = this.groundLayer.getTileAtWorldXY(aheadX, body.bottom + 2);
      if (!tile || !tile.collides) this.dir *= -1;
      body.setVelocityX(this.dir * GRETA.walkSpeed);
    } else {
      body.setVelocityX(0);
    }
    this.setFlipX(this.dir > 0);
    this.animate(delta, this.walking ? ['walk0', 'walk1'] : ['idle0', 'idle1'], this.walking ? 160 : 500);
  }

  /** Flucht: schnell weg, kleine Hüpfer, an Wänden umdrehen, nach Ablauf weg. */
  updateFleeing(delta) {
    const body = this.body;
    this.fleeTimer -= delta;
    if (this.fleeTimer <= 0) { this.vanish(); return; }
    if (body.blocked.left) this.dir = 1; else if (body.blocked.right) this.dir = -1;
    body.setVelocityX(this.dir * GRETA.fleeSpeed);
    this.hopTimer -= delta;
    if (body.blocked.down && this.hopTimer <= 0) {
      body.setVelocityY(-GRETA.fleeHopVelocity);
      this.hopTimer = GRETA.fleeHopInterval;
      this.scene.effects?.dust(this.x, body.bottom, 2, 0.5);
    }
    this.setFlipX(this.dir > 0);
    this.setFrame(this.frameName('panic'));
    // Blinken in der letzten Sekunde
    this.setAlpha(this.fleeTimer < 1000 && Math.floor(this.fleeTimer / 90) % 2 === 0 ? 0.4 : 1);
  }

  /** Beim Reiten: Position folgt Lotti, Kräfte werden von Lotti aus aufgerufen. */
  updateRidden(delta) {
    const lotti = this.rider;
    if (!lotti) return;
    if (this.fireCooldown > 0) this.fireCooldown -= delta;
    if (this.stompLockTimer > 0) this.stompLockTimer -= delta;
    if (lotti.onGround) this.hoverTimer = GRETA.hoverTime;

    this.setPosition(Math.round(lotti.x + lotti.facing * 4), Math.round(lotti.y + 12));
    this.setFlipX(lotti.facing > 0);
    this.setAlpha(lotti.alpha);

    let base;
    if (this.hovering) base = 'fly';
    else if (lotti.onGround && Math.abs(lotti.body.velocity.x) > 8) base = null;
    else base = 'idle0';
    if (base === null) this.animate(delta, ['walk0', 'walk1'], Math.max(70, 160 - Math.abs(lotti.body.velocity.x)));
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

  // ---------- Kräfte (von Lotti aufgerufen) ----------

  /** Aktionstaste: Feuerball (rot) oder Stampfsprung (gelb, in der Luft). */
  useAction(lotti) {
    if (this.power === 'red') {
      if (this.fireCooldown > 0) return false;
      this.fireCooldown = GRETA.fireCooldown;
      const dir = lotti.facing;
      const fb = new Fireball(this.scene, this.x + dir * 10, this.y - 6, dir);
      this.scene.fireballs.add(fb);
      this.scene.tweens.add({ targets: this, scaleX: 1.2, scaleY: 0.9, duration: 70, yoyo: true });
      vibrate(8);
      sfx('fireball');
      return true;
    }
    if (this.power === 'yellow' && !lotti.onGround && !this.stomping) {
      this.stomping = true;
      lotti.body.setVelocity(lotti.body.velocity.x * 0.3, GRETA.stompSpeed);
      lotti.body.setAllowGravity(false);
      this.scene.effects?.leaves(this.x, this.y, 3);
      return true;
    }
    return false;
  }

  /** Schweben (blau): während des Fallens Sprungtaste halten. Gibt true zurück, wenn aktiv. */
  updateHover(lotti, inp, dt, delta) {
    const body = lotti.body;
    const want = this.power === 'blue' && !lotti.onGround && inp.jumpHeld && body.velocity.y > 0 && this.hoverTimer > 0 && !this.stomping;
    if (want) {
      this.hoverTimer -= delta;
      body.setAllowGravity(false);
      body.setVelocityY(damp(body.velocity.y, GRETA.hoverSink, GRETA.hoverLerp, dt));
      if (!this.hovering) { this.scene.effects?.dust(this.x, this.y + 6, 3, 0.4); sfx('hover'); }
      this.hovering = true;
      if (Math.random() < 0.3) this.scene.effects?.dust(this.x + (Math.random() - 0.5) * 10, this.y + 7, 1, 0.3);
    } else if (this.hovering) {
      this.hovering = false;
      body.setAllowGravity(true);
    }
    return this.hovering;
  }

  /** Stampfsprung: solange true, hat Lotti keine Steuerung. Landung löst den Aufprall aus. */
  updateStomp(lotti) {
    if (!this.stomping) return this.stompLockTimer > 0;
    lotti.body.setVelocityY(GRETA.stompSpeed);
    if (lotti.onGround) {
      this.stomping = false;
      lotti.body.setAllowGravity(true);
      this.stompLockTimer = GRETA.stompLock;
      this.scene.onStompLand(lotti, this);
    }
    return true;
  }
}
