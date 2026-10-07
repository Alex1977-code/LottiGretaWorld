// UI-Szene: läuft über der Spiel-Szene, scrollt nicht. Enthält Touch-Steuerung
// und später das HUD (Münzen, Leben).

import Phaser from 'phaser';
import { TouchControls } from '../systems/TouchControls.js';
import { STATE_KEYS } from '../systems/GameState.js';
import { GAME } from '../config.js';
import { Z, fit, setupUiCamera } from '../render.js';
import { uiPanel } from '../ui.js';

export class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  init(data) {
    this.ctrl = data.ctrl;
  }

  create() {
    setupUiCamera(this);
    this.touchControls = new TouchControls(this, this.ctrl);
    this.createHearts();
    this.powerIcon = fit(this.add.image(0, 11, 'berry', 'berry_none'), 1.4).setDepth(50).setVisible(false);
    this.updatePower();
    this.createCoins();
    this.createPauseButton();
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
    this.heartPanel?.destroy();
    this.heartPanel = uiPanel(this, 6 + (max * 13) / 2 + 2, 11, max * 13 + 10, 16, { color: 0x1a1830, alpha: 0.45, radius: 8, shadow: false, border: 0 }).setDepth(49);
    for (let i = 0; i < max; i++) {
      this.hearts.push(fit(this.add.image(12 + i * 13, 11, 'heart', 'full'), 1.4).setDepth(50));
    }
    this.updateHearts();
  }

  /** Pause-Knopf (zwei Balken) oben in der Mitte. */
  createPauseButton() {
    const { width } = GAME;
    const g = this.add.graphics().setDepth(50);
    g.fillStyle(0x1a1830, 0.45);
    g.fillCircle(width / 2, 11, 9);
    g.lineStyle(1, 0xffffff, 0.35);
    g.strokeCircle(width / 2, 11, 9);
    g.fillStyle(0xffffff, 0.85);
    g.fillRoundedRect(width / 2 - 4.5, 6.5, 3, 9, 1);
    g.fillRoundedRect(width / 2 + 1.5, 6.5, 3, 9, 1);
    const zone = this.add.zone(width / 2, 11, 26, 22).setInteractive();
    zone.on(Phaser.Input.Events.POINTER_DOWN, (p, lx, ly, ev) => {
      ev.stopPropagation();
      this.scene.get('Play').pauseGame();
    });
  }

  /** Fünf Münzplätze oben rechts. */
  createCoins() {
    const { width } = GAME;
    this.coinIcons = [];
    uiPanel(this, width - 6 - (5 * 13) / 2 - 2, 11, 5 * 13 + 10, 16, { color: 0x1a1830, alpha: 0.45, radius: 8, shadow: false, border: 0 }).setDepth(49);
    for (let i = 0; i < 5; i++) {
      this.coinIcons.push(fit(this.add.image(width - 12 - (4 - i) * 13, 11, 'coin_hud', 'empty'), 1.4).setDepth(50));
    }
    this.updateCoins();
  }

  updateCoins() {
    const coins = this.registry.get(STATE_KEYS.coins) ?? [];
    this.coinIcons.forEach((c, i) => {
      const full = !!coins[i];
      if (full !== (c.frame.name === 'full')) {
        c.setFrame(full ? 'full' : 'empty');
        if (full) this.tweens.add({ targets: c, scaleX: 2.2 * Z, scaleY: 2.2 * Z, duration: 120, yoyo: true });
      }
    });
  }

  /** Beeren-Kraft neben den Herzen anzeigen (nur beim Reiten). */
  updatePower() {
    const power = this.registry.get(STATE_KEYS.power) || '';
    const max = this.registry.get(STATE_KEYS.maxHearts) ?? 3;
    this.powerIcon.setX(12 + max * 13 + 6);
    if (!power) { this.powerIcon.setVisible(false); return; }
    this.powerIcon.setVisible(true).setFrame(`berry_${power}`);
    this.tweens.add({ targets: this.powerIcon, scaleX: 2.2 * Z, scaleY: 2.2 * Z, duration: 120, yoyo: true });
  }

  updateHearts() {
    const n = this.registry.get(STATE_KEYS.hearts) ?? 0;
    this.hearts.forEach((h, i) => {
      const full = i < n;
      if (full !== (h.frame.name === 'full')) {
        h.setFrame(full ? 'full' : 'empty');
        if (!full) this.tweens.add({ targets: h, scaleX: 2 * Z, scaleY: 2 * Z, duration: 90, yoyo: true });
      }
    });
  }
}
