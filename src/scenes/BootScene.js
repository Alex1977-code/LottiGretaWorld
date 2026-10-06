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
    this.scene.start('Play', { level: this.registry.get('startLevel') ?? 'level1' });
  }
}
