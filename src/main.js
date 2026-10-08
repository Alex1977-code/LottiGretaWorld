// Einstiegspunkt: Phaser-Konfiguration und Start.

import Phaser from 'phaser';
import { GAME, PHYSICS } from './config.js';
import { RENDER } from './render.js';
import { RENDER3D } from './render3d.js';
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
import { CourseBootScene } from './course/CourseBoot.js';
import { CourseScene } from './course/CourseScene.js';
import { CourseUIScene } from './course/CourseUIScene.js';
import { CoursePauseScene } from './course/CoursePauseScene.js';
import { CourseResultScene } from './course/CourseResultScene.js';
import { getLevel as getCourseLevel } from './course/levels/index.js';

// Kurs-Modus: ?course=<id> startet ein Kurs-Level direkt (Boot erzeugt weiter alle Texturen)
const params = new URLSearchParams(window.location.search);
const wantedCourse = params.get('course');
const startCourse = wantedCourse && getCourseLevel(wantedCourse) ? wantedCourse : null;
if (wantedCourse && !startCourse) console.warn(`[Kurs] unbekanntes Level: ${wantedCourse}`);
const COURSE_SCENES = [CourseScene, CourseUIScene, CoursePauseScene, CourseResultScene];

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  // Gerendert wird mit RENDER.scale-facher Auflösung; die Kameras zoomen entsprechend (Logik bleibt 480x270)
  width: GAME.width * RENDER.scale,
  height: GAME.height * RENDER.scale,
  backgroundColor: '#1b1230',
  transparent: RENDER3D.enabled, // 3D-Ansicht liegt auf einer eigenen Leinwand darunter
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
  scene: [startCourse ? CourseBootScene : BootScene, WorldMapScene, PlayScene, UIScene, LevelCompleteScene, PauseScene, ...COURSE_SCENES],
};

const game = new Phaser.Game(config);
window.__game = game; // für Debug/Tests
window.__audio = { engine: audioEngine, music };
game.registry.set('renderScale', RENDER.scale);
game.registry.set('render3d', RENDER3D.enabled);

// Level per URL wählen (?level=test), Standard: erstes Level
const wanted = params.get('level');
game.registry.set('startLevel', wanted && LEVELS[wanted] ? wanted : null);
game.registry.set('startCourse', startCourse);

setupOrientationHint(game);
registerServiceWorker();
installAudioUnlock();
