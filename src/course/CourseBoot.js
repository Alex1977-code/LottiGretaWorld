// Boot für den Direktstart eines Kurs-Levels (?course=<id>): erzeugt wie die Klassik-Boot-Szene alle
// prozeduralen Texturen und Animationen (Weltkarte/Klassik brauchen sie später) und startet dann 'Course'.
// Erweitert die Klassik-BootScene, ohne sie zu verändern.

import { BootScene } from '../scenes/BootScene.js';
import { GAME } from '../config.js';
import { createAllTextures } from '../gfx/textures.js';

export class CourseBootScene extends BootScene {
  create() {
    createAllTextures(this, GAME.width, GAME.height);
    this.createHeroAnimations();
    this.scene.start('Course', { id: this.registry.get('startCourse') });
  }
}
