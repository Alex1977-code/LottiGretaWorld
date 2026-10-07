// Parallax-Hintergrund: Himmel fest, mehrere Ebenen scrollen unterschiedlich schnell.
// Texturen und Ebenen-Liste kommen aus gfx/background.js (einmalig beim Start erzeugt).
// Je Ebene werden nur die Zeilenbänder mit Inhalt als TileSprite gezeichnet (Füllrate).

import { GAME } from '../config.js';
import { PARALLAX_LAYERS } from '../gfx/background.js';

export class Parallax {
  constructor(scene) {
    this.scene = scene;
    const w = GAME.width, h = GAME.height;
    scene.add.image(0, 0, 'sky').setOrigin(0).setScrollFactor(0).setDepth(-10);
    this.layers = [];
    for (const l of PARALLAX_LAYERS) {
      const texH = scene.textures.get(l.key).getSourceImage().height;
      // Texturen sind höher als der Bildschirm; so weit darf die Ebene nach oben rutschen, ohne umzubrechen
      const maxY = Math.max(0, texH - h);
      for (const [top, bottom = texH] of l.bands ?? [[0, texH]]) {
        const sprite = scene.add.tileSprite(0, top, w, bottom - top, l.key).setOrigin(0).setScrollFactor(0).setDepth(l.depth);
        sprite.tilePositionY = top;
        this.layers.push({ sprite, top, fx: l.fx, fy: l.fy, maxY });
      }
    }
  }

  /** Ebenen anhand der Kameraposition verschieben (nur zwei Zuweisungen je Sprite). */
  update(camera) {
    for (const l of this.layers) {
      l.sprite.tilePositionX = camera.scrollX * l.fx;
      l.sprite.y = l.top - Math.min(camera.scrollY * l.fy, l.maxY);
    }
  }
}
