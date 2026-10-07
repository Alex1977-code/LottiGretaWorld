// Parallax-Hintergrund: Himmel fest, drei Ebenen scrollen unterschiedlich schnell.
// Texturen kommen aus gfx/background.js.

import { GAME } from '../config.js';

export class Parallax {
  constructor(scene) {
    this.scene = scene;
    const w = GAME.width, h = GAME.height;
    scene.add.image(0, 0, 'sky').setOrigin(0).setScrollFactor(0).setDepth(-10);
    this.layers = [
      { sprite: scene.add.tileSprite(0, 0, w, h, 'bg_far').setOrigin(0).setScrollFactor(0).setDepth(-9), fx: 0.15, fy: 0.05 },
      { sprite: scene.add.tileSprite(0, 0, w, h, 'bg_mid').setOrigin(0).setScrollFactor(0).setDepth(-8), fx: 0.35, fy: 0.12 },
      { sprite: scene.add.tileSprite(0, 0, w, h, 'bg_near').setOrigin(0).setScrollFactor(0).setDepth(-7), fx: 0.6, fy: 0.25 },
    ];
  }

  /** Ebenen anhand der Kameraposition verschieben. */
  update(camera) {
    for (const l of this.layers) {
      l.sprite.tilePositionX = camera.scrollX * l.fx;
      l.sprite.tilePositionY = camera.scrollY * l.fy;
    }
  }
}
