// Pause-Menü: Weiter oder zurück zur Weltkarte.

import Phaser from 'phaser';
import { RENDER, Z, fit, setupUiCamera } from '../render.js';
import { GAME } from '../config.js';
import { sfx, engine } from '../audio/index.js';
import { saveGame } from '../systems/SaveGame.js';
import { uiText, uiPanel, uiButton } from '../ui.js';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create() {
    const { width: w, height: h } = GAME;
    setupUiCamera(this);
    this.add.rectangle(0, 0, w, h, 0x10102a, 0.55).setOrigin(0);
    uiPanel(this, w / 2, h / 2 + 14, 180, 160);
    uiText(this, w / 2, h / 2 - 52, 'Pause', { size: 20, color: '#ffffff', stroke: '#3a2a6a', thickness: 4 });
    this.button(w / 2, h / 2 - 22, 'Weiter', () => this.resume(), 0x4fb833);
    this.button(w / 2, h / 2 + 6, 'Zur Weltkarte', () => this.toMap(), 0x3a7bff);
    this.muteBtn = this.button(w / 2, h / 2 + 34, '', () => { engine.toggleMuted(); this.muteBtn.setText(engine.muted ? 'Ton: aus' : 'Ton: an'); sfx('select'); }, 0xff9f1a);
    this.heroBtn = this.button(w / 2, h / 2 + 62, '', () => this.switchHero(), 0xff6b9d);
    this.updateHeroLabel();
    this.muteBtn.setText(engine.muted ? 'Ton: aus' : 'Ton: an');
    this.input.keyboard.on('keydown-M', () => { engine.toggleMuted(); this.muteBtn.setText(engine.muted ? 'Ton: aus' : 'Ton: an'); });
    this.input.keyboard.on('keydown-ESC', this.resume, this);
    this.input.keyboard.on('keydown-P', this.resume, this);
  }

  button(x, y, label, cb, color) {
    const b = uiButton(this, x, y, label, { size: 10, color, minWidth: 120, padY: 4 });
    b.on(Phaser.Input.Events.POINTER_DOWN, cb);
    return b;
  }

  /** Figur auch mitten im Level wechseln (wirkt sofort). */
  switchHero() {
    const next = saveGame.hero === 'lotti' ? 'greta' : 'lotti';
    saveGame.hero = next;
    this.scene.get('Play')?.hero?.setHeroKey(next);
    this.updateHeroLabel();
    sfx('select');
  }

  updateHeroLabel() {
    this.heroBtn.setText(`Figur: ${saveGame.hero === 'lotti' ? 'Lotti' : 'Greta'}`);
  }

  resume() {
    sfx('select');
    this.scene.resume('Play');
    this.scene.resume('UI');
    this.scene.stop();
  }

  toMap() {
    this.scene.stop('UI');
    this.scene.stop('Play');
    this.scene.stop();
    this.scene.start('WorldMap', {});
  }
}
