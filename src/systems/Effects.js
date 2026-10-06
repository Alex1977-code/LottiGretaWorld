// Partikel-Effekte: Staub beim Landen, Blätter beim Gleiten, Funken beim Sammeln.

import Phaser from 'phaser';

export class Effects {
  constructor(scene) {
    this.scene = scene;

    this.dustEmitter = scene.add.particles(0, 0, 'p_dust', {
      speed: { min: 20, max: 60 },
      angle: { min: 200, max: 340 },
      gravityY: 120,
      lifespan: { min: 250, max: 450 },
      scale: { start: 1, end: 0 },
      alpha: { start: 0.9, end: 0 },
      quantity: 1,
      emitting: false,
    }).setDepth(9);

    this.leafEmitter = scene.add.particles(0, 0, 'p_leaf', {
      frame: [0, 1, 2],
      speedX: { min: -25, max: 25 },
      speedY: { min: 10, max: 40 },
      gravityY: 40,
      lifespan: { min: 500, max: 900 },
      rotate: { start: 0, end: 360 },
      alpha: { start: 1, end: 0 },
      quantity: 1,
      emitting: false,
    }).setDepth(12);

    this.sparkEmitter = scene.add.particles(0, 0, 'p_spark', {
      speed: { min: 40, max: 110 },
      lifespan: { min: 200, max: 400 },
      scale: { start: 1.5, end: 0 },
      gravityY: 200,
      quantity: 1,
      emitting: false,
    }).setDepth(12);
  }

  /** Staubwolke am Boden. power skaliert Geschwindigkeit. */
  dust(x, y, count = 5, power = 1) {
    this.dustEmitter.setParticleSpeed(20 * power, 60 * power);
    this.dustEmitter.explode(count, x, y - 1);
  }

  /** Herabrieselnde Herbstblätter. */
  leaves(x, y, count = 3) {
    this.leafEmitter.explode(count, x, y);
  }

  /** Funken (Münzen etc.). */
  sparks(x, y, count = 8) {
    this.sparkEmitter.explode(count, x, y);
  }
}
