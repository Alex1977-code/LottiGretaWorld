// Pause-Menü: Weiter oder zurück zur Weltkarte.

import Phaser from 'phaser';
import { RENDER, Z, fit, setupUiCamera } from '../render.js';
import { GAME } from '../config.js';
import { sfx, engine } from '../audio/index.js';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create() {
    const { width: w, height: h } = GAME;
    setupUiCamera(this);
    this.add.rectangle(0, 0, w, h, 0x000000, 0.6).setOrigin(0);
    this.add.text(w / 2, h / 2 - 40, 'Pause', { fontFamily: 'monospace', resolution: RENDER.scale, fontSize: '16px', color: '#fff2a8', stroke: '#4a230a', strokeThickness: 3 }).setOrigin(0.5);
    this.button(w / 2, h / 2, 'Weiter', () => this.resume());
    this.button(w / 2, h / 2 + 28, 'Zur Weltkarte', () => this.toMap());
    this.muteBtn = this.button(w / 2, h / 2 + 56, '', () => { engine.toggleMuted(); this.muteBtn.setText(engine.muted ? 'Ton: aus' : 'Ton: an'); sfx('select'); });
    this.muteBtn.setText(engine.muted ? 'Ton: aus' : 'Ton: an');
    this.input.keyboard.on('keydown-M', () => { engine.toggleMuted(); this.muteBtn.setText(engine.muted ? 'Ton: aus' : 'Ton: an'); });
    this.input.keyboard.on('keydown-ESC', this.resume, this);
    this.input.keyboard.on('keydown-P', this.resume, this);
  }

  button(x, y, label, cb) {
    const t = this.add.text(x, y, label, { fontFamily: 'monospace', resolution: RENDER.scale, fontSize: '11px', color: '#f3e7d3', backgroundColor: '#4a230a', padding: { x: 10, y: 5 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    t.on(Phaser.Input.Events.POINTER_DOWN, cb);
    return t;
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
