// Checkpoint-Pfosten: einmal berührt, wird er zum neuen Startpunkt.

import Phaser from 'phaser';

export class Checkpoint extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y - 16, 'checkpoint', 'off');
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // statisch
    this.body.setSize(12, 30).setOffset(2, 2);
    this.active_ = false;
    this.setDepth(5);
  }

  activate() {
    if (this.active_) return false;
    this.active_ = true;
    this.setFrame('on');
    this.scene.effects?.sparks(this.x + 4, this.y - 8, 10);
    this.scene.tweens.add({ targets: this, scaleX: 1.2, scaleY: 0.9, duration: 80, yoyo: true });
    return true;
  }
}
