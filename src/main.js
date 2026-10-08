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
import { CourseMapScene } from './course/map/CourseMapScene.js';
import { getLevel as getCourseLevel } from './course/levels/index.js';

// Startfluss (Präzisierung Weltkarte):
//   ?course=<id>   Kurs-Level direkt          ?map=1      Kurs-Weltkarte
//   ?classic=1     Klassik-Weltkarte           ?level=<k>  Klassik-Level direkt
//   ohne Parameter Kurs-Weltkarte – braucht die 3D-Darstellung (WebGL2), sonst Klassik-Weltkarte.
// Der Kurs-Boot erzeugt wie der Klassik-Boot alle Texturen (die Klassik-Karte bleibt jederzeit erreichbar).
const params = new URLSearchParams(window.location.search);
const wantedCourse = params.get('course');
const startCourse = wantedCourse && getCourseLevel(wantedCourse) ? wantedCourse : null;
if (wantedCourse && !startCourse) console.warn(`[Kurs] unbekanntes Level: ${wantedCourse}`);
const wanted = params.get('level');
const startLevel = wanted && LEVELS[wanted] ? wanted : null;
const classicStart = params.has('classic') && params.get('classic') !== '0';
const mapStart = params.get('map') === '1';
const courseBoot = !!startCourse || (!startLevel && !classicStart && (mapStart || RENDER3D.enabled));
const COURSE_SCENES = [CourseScene, CourseUIScene, CoursePauseScene, CourseResultScene, CourseMapScene];

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
  scene: [courseBoot ? CourseBootScene : BootScene, WorldMapScene, PlayScene, UIScene, LevelCompleteScene, PauseScene, ...COURSE_SCENES],
};

const game = new Phaser.Game(config);
window.__game = game; // für Debug/Tests
window.__audio = { engine: audioEngine, music };
game.registry.set('renderScale', RENDER.scale);
game.registry.set('render3d', RENDER3D.enabled);

// Level per URL wählen (?level=test), Standard: Weltkarte
game.registry.set('startLevel', startLevel);
game.registry.set('startCourse', startCourse);

setupOrientationHint(game);
registerServiceWorker();
installAudioUnlock();
