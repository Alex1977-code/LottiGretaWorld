// UI-Szene: läuft über der Spiel-Szene, scrollt nicht. Enthält Touch-Steuerung
// und später das HUD (Münzen, Leben).

import Phaser from 'phaser';
import { TouchControls } from '../systems/TouchControls.js';

export class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  init(data) {
    this.ctrl = data.ctrl;
  }

  create() {
    this.touchControls = new TouchControls(this, this.ctrl);

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
}
