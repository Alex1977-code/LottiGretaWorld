// Boot des Kurs-Modus: erzeugt wie die Klassik-Boot-Szene alle prozeduralen Texturen und Animationen (die
// Klassik-Karte und die Figur-Porträts brauchen sie) und startet dann ein Kurs-Level (?course=<id>) oder sonst
// die Kurs-Weltkarte 'CourseMap'. Erweitert die Klassik-BootScene, ohne sie zu verändern.

import { BootScene } from '../scenes/BootScene.js';
import { GAME } from '../config.js';
import { createAllTextures } from '../gfx/textures.js';

export class CourseBootScene extends BootScene {
  create() {
    createAllTextures(this, GAME.width, GAME.height);
    this.createHeroAnimations();
    const id = this.registry.get('startCourse');
    if (id) this.scene.start('Course', { id });
    else this.scene.start('CourseMap', {});
  }
}
