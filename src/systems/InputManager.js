// Vereinheitlichte Eingabe: Tastatur (PC) + Touch (TouchControls schreibt in `touch`).
// Pip liest nur diese Flags, nie direkt Tasten/Pointer.
// Flanken (gerade gedrückt/losgelassen) kommen aus Tastatur-Events, damit auch
// sehr kurze Tipps innerhalb eines Frames nicht verloren gehen.

import Phaser from 'phaser';

export class InputManager {
  constructor(scene) {
    this.scene = scene;
    const KC = Phaser.Input.Keyboard.KeyCodes;
    const kb = scene.input.keyboard;
    this.keys = kb.addKeys({
      left: KC.LEFT, right: KC.RIGHT, up: KC.UP, down: KC.DOWN,
      space: KC.SPACE, x: KC.X, d: KC.D, r: KC.R,
    });
    // Browser-Standardverhalten (Scrollen) für Spieltasten unterbinden
    kb.addCapture([KC.LEFT, KC.RIGHT, KC.UP, KC.DOWN, KC.SPACE]);

    // Vorgemerkte Flanken bis zum nächsten update()
    this.pending = { jump: false, jumpRelease: false, dive: false, action: false, debug: false, reset: false };
    const press = (flag) => (ev) => { if (!ev.repeat) this.pending[flag] = true; };
    kb.on('keydown-SPACE', press('jump'));
    kb.on('keydown-UP', press('jump'));
    kb.on('keyup-SPACE', press('jumpRelease'));
    kb.on('keyup-UP', press('jumpRelease'));
    kb.on('keydown-DOWN', press('dive'));
    kb.on('keydown-X', press('action'));
    kb.on('keydown-D', press('debug'));
    kb.on('keydown-R', press('reset'));

    // Öffentliche Zustände (pro Frame aktualisiert)
    this.axisX = 0;              // -1..1
    this.jumpHeld = false;
    this.jumpJustPressed = false;
    this.jumpJustReleased = false;
    this.diveHeld = false;
    this.diveJustPressed = false;
    this.actionJustPressed = false;
    this.actionHeld = false;
    this.debugJustPressed = false;
    this.resetJustPressed = false;

    // Touch-Zustand – wird von TouchControls gesetzt
    this.touch = {
      axisX: 0, jumpHeld: false, jumpPressed: false, jumpReleased: false,
      diveHeld: false, divePressed: false, actionPressed: false, actionHeld: false,
    };
  }

  update() {
    const k = this.keys;
    const p = this.pending;
    const t = this.touch;

    let ax = 0;
    if (k.left.isDown) ax -= 1;
    if (k.right.isDown) ax += 1;
    if (ax === 0) ax = t.axisX;
    this.axisX = Phaser.Math.Clamp(ax, -1, 1);

    this.jumpHeld = k.space.isDown || k.up.isDown || t.jumpHeld;
    this.jumpJustPressed = p.jump || t.jumpPressed;
    this.jumpJustReleased = p.jumpRelease || t.jumpReleased;

    this.diveHeld = k.down.isDown || t.diveHeld;
    this.diveJustPressed = p.dive || t.divePressed;

    this.actionHeld = k.x.isDown || t.actionHeld;
    this.actionJustPressed = p.action || t.actionPressed;

    this.debugJustPressed = p.debug;
    this.resetJustPressed = p.reset;

    // Einmal-Flags zurücksetzen
    for (const key of Object.keys(p)) p[key] = false;
    t.jumpPressed = false; t.jumpReleased = false; t.divePressed = false; t.actionPressed = false;
  }
}
