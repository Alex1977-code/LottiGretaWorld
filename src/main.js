// Einstiegspunkt: Phaser-Konfiguration und Start.

import Phaser from 'phaser';
import { GAME, PHYSICS } from './config.js';
import { RENDER } from './render.js';
import { BootScene } from './scenes/BootScene.js';
import { PlayScene } from './scenes/PlayScene.js';
import { UIScene } from './scenes/UIScene.js';
import { LevelCompleteScene } from './scenes/LevelCompleteScene.js';
import { WorldMapScene } from './scenes/WorldMapScene.js';
import { PauseScene } from './scenes/PauseScene.js';
import { LEVELS } from './levels/index.js';
import { setupOrientationHint } from './systems/orientation.js';
import { registerServiceWorker } from './systems/pwa.js';
import { installAudioUnlock, engine as audioEngine, music } from './audio/index.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  // Gerendert wird mit RENDER.scale-facher Auflösung; die Kameras zoomen entsprechend (Logik bleibt 480x270)
  width: GAME.width * RENDER.scale,
  height: GAME.height * RENDER.scale,
  backgroundColor: '#1b1230',
  pixelArt: false,
  roundPixels: false,
  antialias: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME.width * RENDER.scale,
    height: GAME.height * RENDER.scale,
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
  scene: [BootScene, WorldMapScene, PlayScene, UIScene, LevelCompleteScene, PauseScene],
};

const game = new Phaser.Game(config);
window.__game = game; // für Debug/Tests
window.__audio = { engine: audioEngine, music };
game.registry.set('renderScale', RENDER.scale);

// Level per URL wählen (?level=test), Standard: erstes Level
const wanted = new URLSearchParams(window.location.search).get('level');
game.registry.set('startLevel', wanted && LEVELS[wanted] ? wanted : null);

setupOrientationHint(game);
registerServiceWorker();
installAudioUnlock();
