// Einstiegspunkt: Phaser-Konfiguration und Start.

import Phaser from 'phaser';
import { GAME, PHYSICS } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { PlayScene } from './scenes/PlayScene.js';
import { UIScene } from './scenes/UIScene.js';
import { setupOrientationHint } from './systems/orientation.js';
import { registerServiceWorker } from './systems/pwa.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME.width,
  height: GAME.height,
  backgroundColor: '#1b1230',
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME.width,
    height: GAME.height,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: PHYSICS.gravity },
      debug: false,
      tileBias: 16,
    },
  },
  fps: { target: 60, min: 30, smoothStep: true },
  input: { activePointers: 3 },
  scene: [BootScene, PlayScene, UIScene],
};

const game = new Phaser.Game(config);
window.__game = game; // für Debug/Tests

setupOrientationHint(game);
registerServiceWorker();
