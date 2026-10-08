// Pause-Menü des Kurs-Modus ('CoursePause'): Weiter, Neustart, Zur Weltkarte, Ton an/aus, Figur Lotti/Greta.
// Esc/P = Weiter, M = Ton. Die 3D-Ansicht bleibt (eingefroren) darunter sichtbar.

import Phaser from 'phaser';
import { GAME } from '../config.js';
import { setupUiCamera } from '../render.js';
import { sfx, engine } from '../audio/index.js';
import { uiText, uiPanel, uiButton } from '../ui.js';
import { courseSave } from './level/CourseSave.js';

export class CoursePauseScene extends Phaser.Scene {
  constructor() {
    super('CoursePause');
  }

  init(data) {
    this.course = data.course;
  }

  create() {
    const { width: w, height: h } = GAME;
    setupUiCamera(this);
    this.add.rectangle(0, 0, w, h, 0x10102a, 0.5).setOrigin(0);
    uiPanel(this, w / 2, h / 2 + 8, 200, 196);
    uiText(this, w / 2, h / 2 - 72, 'Pause', { size: 20, color: '#ffffff', stroke: '#3a2a6a', thickness: 4 });
    const title = this.course?.levelData?.title;
    if (title) uiText(this, w / 2, h / 2 - 52, `${this.course.levelId} · ${title}`, { size: 8, color: '#5a4a7a', stroke: '#ffffff', thickness: 2, shadow: false });
    let y = h / 2 - 30;
    const step = 27;
    this.button(w / 2, y, 'Weiter', () => this.resume(), 0x4fb833); y += step;
    this.button(w / 2, y, 'Neustart', () => { sfx('select'); this.course.restartLevel(); }, 0xff9f1a); y += step;
    this.button(w / 2, y, 'Zur Weltkarte', () => { sfx('select'); this.course.exitToMap(); }, 0x3a7bff); y += step;
    this.muteBtn = this.button(w / 2, y, '', () => this.toggleMute(), 0x8a6ad8); y += step;
    this.heroBtn = this.button(w / 2, y, '', () => this.switchHero(), 0xff6b9d);
    this.updateLabels();
    const kb = this.input.keyboard;
    kb.on('keydown-ESC', this.resume, this);
    kb.on('keydown-P', this.resume, this);
    kb.on('keydown-M', this.toggleMute, this);
  }

  button(x, y, label, cb, color) {
    const b = uiButton(this, x, y, label, { size: 10, color, minWidth: 140, padY: 5 });
    b.on(Phaser.Input.Events.POINTER_DOWN, cb);
    return b;
  }

  toggleMute() {
    engine.toggleMuted();
    this.updateLabels();
    sfx('select');
  }

  switchHero() {
    const next = courseSave.hero === 'lotti' ? 'greta' : 'lotti';
    this.course.setHero(next);
    this.updateLabels();
    sfx('select');
  }

  updateLabels() {
    this.muteBtn.setText(engine.muted ? 'Ton: aus' : 'Ton: an');
    this.heroBtn.setText(`Figur: ${courseSave.hero === 'lotti' ? 'Lotti' : 'Greta'}`);
  }

  resume() {
    sfx('select');
    this.course.resumeGame();
  }
}
