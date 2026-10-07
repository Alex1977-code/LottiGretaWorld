// Feuerball (rote Beere): fliegt in Blickrichtung, hüpft über den Boden, erledigt Gegner.

import Phaser from 'phaser';
import { PFLAUME } from '../config.js';
import { fit, setBodyBox } from '../render.js';

export class Fireball extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, dir) {
    super(scene, x, y, 'fireball', 'fire0');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    fit(this);
    setBodyBox(this, 6, 6, 1, 1);
    this.body.setBounce(0, PFLAUME.fireBounce);
    this.body.setVelocity(dir * PFLAUME.fireSpeed, -PFLAUME.fireLift);
    this.dir = dir;
    this.life = PFLAUME.fireLifetime;
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
    b.setVelocityX(this.dir * PFLAUME.fireSpeed);
    if (b.blocked.down && Math.abs(b.velocity.y) < 40) b.setVelocityY(-PFLAUME.fireLift * 2);
    if (this.life <= 0 || b.blocked.left || b.blocked.right) this.pop();
    else if (Math.random() < 0.5) this.scene.effects?.sparks(this.x, this.y, 1);
  }

  pop() {
    this.scene.effects?.sparks(this.x, this.y, 6);
    this.destroy();
  }
}
