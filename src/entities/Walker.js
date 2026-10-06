// Laufkäfer: läuft hin und her, dreht an Wänden und Kanten um.

import { Enemy } from './Enemy.js';
import { ENEMIES } from '../config.js';

export class Walker extends Enemy {
  constructor(scene, x, y, groundLayer) {
    super(scene, x, y - 8, 'walker', 'walk0');
    this.groundLayer = groundLayer;
    this.body.setSize(12, 9).setOffset(2, 7);
    this.dir = -1;
    this.speed = ENEMIES.walkerSpeed;
    this.body.setCollideWorldBounds(true);
    if (!scene.anims.exists('walker-walk')) {
      scene.anims.create({ key: 'walker-walk', frames: [{ key: 'walker', frame: 'walk0' }, { key: 'walker', frame: 'walk1' }], frameRate: 6, repeat: -1 });
    }
    this.play('walker-walk');
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.alive || !this.body) return;
    const body = this.body;

    if (!this.nearCamera) {
      body.setVelocityX(0);
      return;
    }

    // An Wänden umdrehen
    if (body.blocked.left) this.dir = 1;
    else if (body.blocked.right) this.dir = -1;

    // An Kanten umdrehen: Tile vor den Füßen prüfen
    if (body.blocked.down) {
      const aheadX = this.dir > 0 ? body.right + 2 : body.left - 2;
      const tile = this.groundLayer.getTileAtWorldXY(aheadX, body.bottom + 2);
      if (!tile || !tile.collides) this.dir *= -1;
    }

    body.setVelocityX(this.dir * this.speed);
    this.setFlipX(this.dir > 0);
  }
}
