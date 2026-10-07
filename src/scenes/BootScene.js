// Boot-Szene: erzeugt alle prozeduralen Texturen und startet das Spiel.

import Phaser from 'phaser';
import { GAME } from '../config.js';
import { createAllTextures } from '../gfx/textures.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    createAllTextures(this, GAME.width, GAME.height);
    this.createHeroAnimations();
    const level = this.registry.get('startLevel');
    if (level) this.scene.start('Play', { level });
    else this.scene.start('WorldMap', {});
  }

  /** Idle/Run-Animationen beider Heldinnen (für die Weltkarte). */
  createHeroAnimations() {
    const a = this.anims;
    for (const tex of ['lotti', 'greta']) {
      const mk = (name, frames, frameRate, repeat = -1) => {
        const key = `${tex}-${name}`;
        if (a.exists(key)) return;
        a.create({ key, frames: frames.map((f) => ({ key: tex, frame: f })), frameRate, repeat });
      };
      mk('idle', ['idle0', 'idle0', 'idle0', 'idle1'], 2);
      mk('run', ['run0', 'run1', 'run2', 'run3'], 12);
    }
  }
}
