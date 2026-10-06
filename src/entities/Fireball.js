// Feuerball (rote Beere): fliegt in Blickrichtung, hüpft über den Boden, erledigt Gegner.

import Phaser from 'phaser';
import { GRETA } from '../config.js';

export class Fireball extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, dir) {
    super(scene, x, y, 'fireball', 'fire0');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setCircle(3, 1, 1);
    this.body.setBounce(0, GRETA.fireBounce);
    this.body.setVelocity(dir * GRETA.fireSpeed, -GRETA.fireLift);
    this.dir = dir;
    this.life = GRETA.fireLifetime;
    this.setDepth(9);
    if (!scene.anims.exists('fireball')) {
      scene.anims.create({ key: 'fireball', frames: [{ key: 'fireball', frame: 'fire0' }, { key: 'fireball', frame: 'fire1' }], frameRate: 12, repeat: -1 });
    }
    this.play('fireball');
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body) return;
    this.life -= delta;
    const b = this.body;
    // Geschwindigkeit in Flugrichtung halten (Boden bremst nicht)
    b.setVelocityX(this.dir * GRETA.fireSpeed);
    if (b.blocked.down && Math.abs(b.velocity.y) < 40) b.setVelocityY(-GRETA.fireLift * 2);
    if (this.life <= 0 || b.blocked.left || b.blocked.right) this.pop();
    else if (Math.random() < 0.5) this.scene.effects?.sparks(this.x, this.y, 1);
  }

  pop() {
    this.scene.effects?.sparks(this.x, this.y, 6);
    this.destroy();
  }
}
