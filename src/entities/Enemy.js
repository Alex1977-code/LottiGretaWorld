// Basisklasse für Gegner: Leben, Plattmachen, Entfernen.

import Phaser from 'phaser';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture, frame) {
    super(scene, x, y, texture, frame);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.alive = true;
    this.stompable = true;   // durch Draufspringen besiegbar
    this.contactDamage = 1;  // Schaden bei seitlicher Berührung
    this.setDepth(8);
  }

  /** Wird vom Hero-Sprung getroffen: plattdrücken und verschwinden. */
  squash() {
    if (!this.alive) return;
    this.alive = false;
    this.body.enable = false;
    this.setFrame('squashed');
    this.scene.effects?.dust(this.x, this.body.bottom, 6, 0.8);
    this.scene.tweens.add({
      targets: this, alpha: 0, delay: 350, duration: 250,
      onComplete: () => this.destroy(),
    });
  }

  /** Von Projektil/Stampfer getroffen: wegschleudern. */
  knockOut(dirX = 1) {
    if (!this.alive) return;
    this.alive = false;
    this.body.checkCollision.none = true;
    this.body.setAllowGravity(true);
    this.body.setVelocity(dirX * 90, -220);
    this.setFlipY(true);
    this.scene.tweens.add({ targets: this, alpha: 0, delay: 500, duration: 300, onComplete: () => this.destroy() });
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    // In die Tiefe gefallen → entfernen
    if (this.y > this.scene.physics.world.bounds.bottom + 32) this.destroy();
  }

  /** Nur in Kameranähe „denken“ (Performance). */
  get nearCamera() {
    const v = this.scene.cameras.main.worldView;
    return this.x > v.x - 64 && this.x < v.right + 64;
  }
}
