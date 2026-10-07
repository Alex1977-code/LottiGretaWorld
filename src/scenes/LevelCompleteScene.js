// Level geschafft: Ergebnis zeigen, dann weiter (später: Weltkarte).

import Phaser from 'phaser';
import { RENDER, Z, fit, setupUiCamera } from '../render.js';
import { GAME } from '../config.js';
import { LEVELS } from '../levels/index.js';
import { uiText, uiPanel } from '../ui.js';

export class LevelCompleteScene extends Phaser.Scene {
  constructor() {
    super('LevelComplete');
  }

  init(data) {
    this.result = data;
  }

  create() {
    const { width: w, height: h } = GAME;
    const { exit, coins, levelKey } = this.result;
    setupUiCamera(this);
    this.add.rectangle(0, 0, w, h, 0x10102a, 0.5).setOrigin(0);
    uiPanel(this, w / 2, h / 2 + 4, 250, 118);

    const title = exit === 'secret' ? 'Geheimer Ausgang!' : 'Level geschafft!';
    uiText(this, w / 2, h / 2 - 36, title, { size: 18, color: exit === 'secret' ? '#ffd23f' : '#ffffff', stroke: '#3a2a6a', thickness: 4 });
    uiText(this, w / 2, h / 2 - 16, LEVELS[levelKey]?.name ?? '', { size: 10, color: '#5a4a7a', stroke: '#ffffff', thickness: 2, shadow: false });

    // Münzen
    coins.forEach((c, i) => {
      this.add.image(w / 2 - 24 + i * 12, h / 2 + 6, 'coin_hud', c ? 'full' : 'empty').setScale(1.2 * Z);
    });

    const hint = uiText(this, w / 2, h / 2 + 40, 'Tippen oder Leertaste', { size: 9, color: '#ffffff', stroke: '#3a2a6a', thickness: 3 });
    this.tweens.add({ targets: hint, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });

    // Nicht sofort weiterklicken lassen
    this.time.delayedCall(600, () => {
      this.input.once(Phaser.Input.Events.POINTER_DOWN, this.next, this);
      this.input.keyboard.once('keydown-SPACE', this.next, this);
      this.input.keyboard.once('keydown-ENTER', this.next, this);
    });
  }

  next() {
    this.scene.stop('UI');
    this.scene.stop('Play');
    this.scene.stop();
    if (this.result.levelKey === 'test') { this.scene.start('Play', { level: 'test' }); return; }
    this.scene.start('WorldMap', { from: this.result.levelKey, exit: this.result.exit });
  }
}
