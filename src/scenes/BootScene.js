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
    this.createPipAnimations();
    const level = this.registry.get('startLevel');
    if (level) this.scene.start('Play', { level });
    else this.scene.start('WorldMap', {});
  }

  /** Pip-Animationen werden auch auf der Weltkarte gebraucht. */
  createPipAnimations() {
    const a = this.anims;
    const mk = (key, frames, frameRate, repeat = -1) => {
      if (a.exists(key)) return;
      a.create({ key, frames: frames.map((f) => ({ key: 'pip', frame: f })), frameRate, repeat });
    };
    mk('pip-idle', ['idle0', 'idle0', 'idle0', 'idle1'], 2);
    mk('pip-run', ['run0', 'run1', 'run2', 'run3'], 12);
  }
}
