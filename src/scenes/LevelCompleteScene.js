// Level geschafft: Ergebnis zeigen, dann weiter (später: Weltkarte).

import Phaser from 'phaser';
import { GAME } from '../config.js';
import { LEVELS } from '../levels/index.js';

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
    this.add.rectangle(0, 0, w, h, 0x000000, 0.55).setOrigin(0);

    const title = exit === 'secret' ? 'Geheimer Ausgang gefunden!' : 'Level geschafft!';
    this.add.text(w / 2, h / 2 - 40, title, { fontFamily: 'monospace', fontSize: '16px', color: '#fff2a8', stroke: '#4a230a', strokeThickness: 3 }).setOrigin(0.5);
    this.add.text(w / 2, h / 2 - 18, LEVELS[levelKey]?.name ?? '', { fontFamily: 'monospace', fontSize: '10px', color: '#f3e7d3' }).setOrigin(0.5);

    // Münzen
    coins.forEach((c, i) => {
      this.add.image(w / 2 - 24 + i * 12, h / 2 + 6, 'coin_hud', c ? 'full' : 'empty').setScale(1.2);
    });

    const hint = this.add.text(w / 2, h / 2 + 40, 'Tippen oder Leertaste', { fontFamily: 'monospace', fontSize: '9px', color: '#f3e7d3' }).setOrigin(0.5);
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
