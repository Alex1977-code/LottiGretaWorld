// Große Sammelmünze (5 pro Level). Bereits gespeicherte Münzen erscheinen halbtransparent.

import Phaser from 'phaser';

export class Coin extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, index, alreadySaved) {
    super(scene, x, y - 8, 'coin', 'coin0');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.body.setSize(10, 10).setOffset(1, 1);
    this.index = index;
    this.setDepth(6);
    if (alreadySaved) this.setAlpha(0.45);
    if (!scene.anims.exists('coin-spin')) {
      scene.anims.create({ key: 'coin-spin', frames: ['coin0', 'coin1', 'coin2', 'coin3'].map((f) => ({ key: 'coin', frame: f })), frameRate: 8, repeat: -1 });
    }
    this.play('coin-spin');
    this.anims.setProgress(Math.random());
  }

  /** Eingesammelt: hochfliegen, verblassen, Funken. */
  collect() {
    this.body.enable = false;
    this.scene.effects?.sparks(this.x, this.y, 12);
    this.scene.tweens.add({ targets: this, y: this.y - 18, alpha: 0, scaleX: 1.4, scaleY: 1.4, duration: 350, ease: 'Quad.out', onComplete: () => this.destroy() });
  }
}
