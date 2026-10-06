// Kleine Level-Objekte: Schlüssel, Tor, Zielfahne, Dornen.

import Phaser from 'phaser';

/** Schlüssel für den geheimen Ausgang. Folgt Pip, sobald er eingesammelt ist. */
export class Key extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y - 8, 'key', 'key');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setDepth(6);
    this.collected = false;
    this.follow = null;
    scene.tweens.add({ targets: this, y: this.y - 3, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  collect(pip) {
    if (this.collected) return;
    this.collected = true;
    this.body.enable = false;
    this.scene.tweens.killTweensOf(this);
    this.follow = pip;
    this.setDepth(12);
    this.scene.effects?.sparks(this.x, this.y, 10);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.follow) return;
    // Schwebt hinter Pip her
    const tx = this.follow.x - this.follow.facing * 12;
    const ty = this.follow.y - 14 + Math.sin(time / 200) * 2;
    this.x += (tx - this.x) * 0.15;
    this.y += (ty - this.y) * 0.15;
  }
}

/** Tor: öffnet sich nur mit Schlüssel – geheimer Ausgang. */
export class Gate extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y - 16, 'gate', 'closed');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.body.setSize(12, 28).setOffset(2, 4);
    this.setDepth(4);
    this.opened = false;
  }

  open() {
    if (this.opened) return;
    this.opened = true;
    this.setFrame('open');
    this.scene.effects?.sparks(this.x, this.y - 8, 14);
    this.scene.cameras.main.shake(150, 0.004);
  }
}

/** Zielfahne – normaler Ausgang. */
export class Flag extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y - 16, 'flag', 'flag0');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.body.setSize(10, 30).setOffset(3, 2);
    this.setDepth(4);
    if (!scene.anims.exists('flag-wave')) {
      scene.anims.create({ key: 'flag-wave', frames: ['flag0', 'flag1', 'flag2', 'flag1'].map((f) => ({ key: 'flag', frame: f })), frameRate: 6, repeat: -1 });
    }
    this.play('flag-wave');
  }
}

/** Dornen: verletzen bei Berührung (statisch, flache Hitbox). */
export class Thorns extends Phaser.Physics.Arcade.Image {
  constructor(scene, x, y) {
    super(scene, x, y - 4, 'thorns', 'thorns');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.body.setSize(14, 5).setOffset(1, 3);
    this.setDepth(3);
  }
}
