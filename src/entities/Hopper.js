// Hüpfender Pilz: wartet, duckt sich, springt in Richtung Hero.

import { Enemy } from './Enemy.js';
import { ENEMIES } from '../config.js';

export class Hopper extends Enemy {
  constructor(scene, x, y, target) {
    super(scene, x, y - 8, 'hopper', 'idle');
    this.target = target;
    this.body.setSize(12, 14).setOffset(2, 2);
    this.body.setCollideWorldBounds(true);
    this.phase = 'idle';
    this.timer = ENEMIES.hopperIdleTime * (0.6 + Math.random() * 0.8);
    this.dir = -1;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.alive || !this.body) return;
    const body = this.body;
    if (!this.nearCamera) return;

    switch (this.phase) {
      case 'idle':
        body.setVelocityX(0);
        this.timer -= delta;
        if (this.timer <= 0) {
          this.phase = 'squat';
          this.timer = ENEMIES.hopperSquatTime;
          this.setFrame('squat');
        }
        break;
      case 'squat':
        this.timer -= delta;
        if (this.timer <= 0) {
          // Richtung: zu Hero, wenn er in der Nähe ist
          if (this.target && Math.abs(this.target.x - this.x) < ENEMIES.hopperSightRange) {
            this.dir = this.target.x < this.x ? -1 : 1;
          } else {
            this.dir *= -1;
          }
          body.setVelocity(this.dir * ENEMIES.hopperSpeedX, -ENEMIES.hopperJumpVelocity);
          this.setFrame('jump');
          this.phase = 'air';
          this.airTime = 0;
        }
        break;
      case 'air':
        this.airTime += delta;
        if (body.blocked.left || body.blocked.right) {
          this.dir *= -1;
          body.setVelocityX(this.dir * ENEMIES.hopperSpeedX);
        }
        if (this.airTime > 60 && body.blocked.down) {
          this.phase = 'idle';
          this.timer = ENEMIES.hopperIdleTime;
          this.setFrame('idle');
          body.setVelocityX(0);
          this.scene.effects?.dust(this.x, body.bottom, 3, 0.5);
        }
        break;
    }
    this.setFlipX(this.dir < 0); // Grafik blickt nach rechts
  }
}
