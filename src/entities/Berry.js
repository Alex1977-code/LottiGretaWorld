// Beere: Futter für Pflaume. Typ red/blue/yellow bestimmt die Kraft.

import Phaser from 'phaser';
import { fit } from '../render.js';

export class Berry extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type) {
    super(scene, x, y - 5, 'berry', `berry_${type}`);
    fit(this);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.berryType = type;
    this.setDepth(6);
    // Leichtes Auf-und-Ab
    scene.tweens.add({ targets: this, y: this.y - 2, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  /** Gefressen: Funken, weg. */
  consume() {
    this.scene.effects?.sparks(this.x, this.y, 10);
    this.destroy();
  }
}
