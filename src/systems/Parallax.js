// Parallax-Hintergrund: Himmel fest, mehrere Ebenen scrollen unterschiedlich schnell.
// Texturen und Ebenen-Liste kommen aus gfx/background.js (einmalig beim Start erzeugt).
// Je Ebene werden nur die Zeilenbänder mit Inhalt als TileSprite gezeichnet (Füllrate).

import { GAME } from '../config.js';
import { RENDER, Z, fit, FIXED_OFFSET } from '../render.js';
import { PARALLAX_LAYERS } from '../gfx/background.js';

export class Parallax {
  constructor(scene) {
    this.scene = scene;
    const w = GAME.width, h = GAME.height;
    const S = RENDER.scale;
    const ox = FIXED_OFFSET.x, oy = FIXED_OFFSET.y; // bildschirmfeste Objekte bei gezoomter Kamera
    fit(scene.add.image(ox, oy, 'sky')).setOrigin(0).setScrollFactor(0).setDepth(-10);
    this.layers = [];
    for (const l of PARALLAX_LAYERS) {
      const texH = scene.textures.get(l.key).getSourceImage().height / S; // in Weltpixeln
      // Texturen sind höher als der Bildschirm; so weit darf die Ebene nach oben rutschen, ohne umzubrechen
      const maxY = Math.max(0, texH - h);
      for (const [top, bottom = texH] of l.bands ?? [[0, texH]]) {
        const sprite = scene.add.tileSprite(ox, oy + top, w, bottom - top, l.key).setOrigin(0).setScrollFactor(0).setDepth(l.depth).setTileScale(Z);
        sprite.tilePositionY = top * S;
        this.layers.push({ sprite, top: oy + top, fx: l.fx, fy: l.fy, maxY });
      }
    }
  }

  /** Ebenen anhand der Kameraposition verschieben (nur zwei Zuweisungen je Sprite). */
  update(camera) {
    // worldView statt scrollX/Y: bei gezoomter Kamera ist scroll um FIXED_OFFSET versetzt
    const vx = camera.worldView.x, vy = camera.worldView.y;
    for (const l of this.layers) {
      l.sprite.tilePositionX = vx * l.fx * RENDER.scale;
      l.sprite.y = l.top - Math.min(Math.max(0, vy * l.fy), l.maxY);
    }
  }
}
