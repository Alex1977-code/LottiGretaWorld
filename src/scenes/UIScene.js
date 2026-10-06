// UI-Szene: läuft über der Spiel-Szene, scrollt nicht. Enthält Touch-Steuerung
// und später das HUD (Münzen, Leben).

import Phaser from 'phaser';
import { TouchControls } from '../systems/TouchControls.js';
import { STATE_KEYS } from '../systems/GameState.js';

export class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  init(data) {
    this.ctrl = data.ctrl;
  }

  create() {
    this.touchControls = new TouchControls(this, this.ctrl);
    this.createHearts();
    this.powerIcon = this.add.image(0, 8, 'berry', 'berry_none').setDepth(50).setScrollFactor(0).setVisible(false);
    this.updatePower();
    this.createCoins();
    this.registry.events.on(Phaser.Data.Events.CHANGE_DATA_KEY + STATE_KEYS.coins, this.updateCoins, this);
    this.registry.events.on(Phaser.Data.Events.CHANGE_DATA_KEY + STATE_KEYS.power, this.updatePower, this);
    this.registry.events.on(Phaser.Data.Events.CHANGE_DATA_KEY + STATE_KEYS.hearts, this.updateHearts, this);
    this.registry.events.on(Phaser.Data.Events.CHANGE_DATA_KEY + STATE_KEYS.maxHearts, this.createHearts, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.registry.events.off(Phaser.Data.Events.CHANGE_DATA_KEY + STATE_KEYS.hearts, this.updateHearts, this);
      this.registry.events.off(Phaser.Data.Events.CHANGE_DATA_KEY + STATE_KEYS.power, this.updatePower, this);
      this.registry.events.off(Phaser.Data.Events.CHANGE_DATA_KEY + STATE_KEYS.coins, this.updateCoins, this);
      this.registry.events.off(Phaser.Data.Events.CHANGE_DATA_KEY + STATE_KEYS.maxHearts, this.createHearts, this);
    });

    // Android: beim ersten Tippen Vollbild anfordern (iOS kennt das nicht → PWA installieren)
    const dev = this.sys.game.device;
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone;
    if (dev.os.android && dev.fullscreen.available && !standalone) {
      this.input.once(Phaser.Input.Events.POINTER_DOWN, () => {
        if (!this.scale.isFullscreen) {
          try { this.scale.startFullscreen(); } catch (_) { /* ignorieren */ }
        }
      });
    }
  }

  createHearts() {
    this.hearts?.forEach((h) => h.destroy());
    const max = this.registry.get(STATE_KEYS.maxHearts) ?? 3;
    this.hearts = [];
    for (let i = 0; i < max; i++) {
      this.hearts.push(this.add.image(8 + i * 10, 8, 'heart', 'full').setDepth(50).setScrollFactor(0));
    }
    this.updateHearts();
  }

  /** Fünf Münzplätze oben rechts. */
  createCoins() {
    const { width } = this.scale.gameSize;
    this.coinIcons = [];
    for (let i = 0; i < 5; i++) {
      this.coinIcons.push(this.add.image(width - 8 - (4 - i) * 10, 8, 'coin_hud', 'empty').setDepth(50).setScrollFactor(0));
    }
    this.updateCoins();
  }

  updateCoins() {
    const coins = this.registry.get(STATE_KEYS.coins) ?? [];
    this.coinIcons.forEach((c, i) => {
      const full = !!coins[i];
      if (full !== (c.frame.name === 'full')) {
        c.setFrame(full ? 'full' : 'empty');
        if (full) this.tweens.add({ targets: c, scaleX: 1.6, scaleY: 1.6, duration: 120, yoyo: true });
      }
    });
  }

  /** Beeren-Kraft neben den Herzen anzeigen (nur beim Reiten). */
  updatePower() {
    const power = this.registry.get(STATE_KEYS.power) || '';
    const max = this.registry.get(STATE_KEYS.maxHearts) ?? 3;
    this.powerIcon.setX(8 + max * 10 + 4);
    if (!power) { this.powerIcon.setVisible(false); return; }
    this.powerIcon.setVisible(true).setFrame(`berry_${power}`);
    this.tweens.add({ targets: this.powerIcon, scaleX: 1.6, scaleY: 1.6, duration: 120, yoyo: true });
  }

  updateHearts() {
    const n = this.registry.get(STATE_KEYS.hearts) ?? 0;
    this.hearts.forEach((h, i) => {
      const full = i < n;
      if (full !== (h.frame.name === 'full')) {
        h.setFrame(full ? 'full' : 'empty');
        if (!full) this.tweens.add({ targets: h, scaleX: 1.5, scaleY: 1.5, duration: 90, yoyo: true });
      }
    });
  }
}
