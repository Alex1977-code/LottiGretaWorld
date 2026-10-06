// Vereinheitlichte Eingabe: Tastatur (PC) + Touch (wird in Etappe 2 ergänzt).
// Pip liest nur diese Flags, nie direkt Tasten/Pointer.

import Phaser from 'phaser';

export class InputManager {
  constructor(scene) {
    this.scene = scene;
    const KC = Phaser.Input.Keyboard.KeyCodes;
    this.keys = scene.input.keyboard.addKeys({
      left: KC.LEFT, right: KC.RIGHT, up: KC.UP, down: KC.DOWN,
      space: KC.SPACE, x: KC.X, d: KC.D, r: KC.R,
    });
    // Browser-Standardverhalten (Scrollen) für Spieltasten unterbinden
    scene.input.keyboard.addCapture([KC.LEFT, KC.RIGHT, KC.UP, KC.DOWN, KC.SPACE]);

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

    // Touch-Zustand – wird von TouchControls gesetzt (Etappe 2)
    this.touch = {
      axisX: 0, jumpHeld: false, jumpPressed: false, jumpReleased: false,
      diveHeld: false, divePressed: false, actionPressed: false, actionHeld: false,
    };
  }

  update() {
    const k = this.keys;
    const JD = Phaser.Input.Keyboard.JustDown;
    const JU = Phaser.Input.Keyboard.JustUp;
    const t = this.touch;

    let ax = 0;
    if (k.left.isDown) ax -= 1;
    if (k.right.isDown) ax += 1;
    if (ax === 0) ax = t.axisX;
    this.axisX = Phaser.Math.Clamp(ax, -1, 1);

    const kbJumpHeld = k.space.isDown || k.up.isDown;
    this.jumpHeld = kbJumpHeld || t.jumpHeld;
    this.jumpJustPressed = JD(k.space) || JD(k.up) || t.jumpPressed;
    this.jumpJustReleased = JU(k.space) || JU(k.up) || t.jumpReleased;

    this.diveHeld = k.down.isDown || t.diveHeld;
    this.diveJustPressed = JD(k.down) || t.divePressed;

    this.actionHeld = k.x.isDown || t.actionHeld;
    this.actionJustPressed = JD(k.x) || t.actionPressed;

    this.debugJustPressed = JD(k.d);
    this.resetJustPressed = JD(k.r);

    // Einmal-Flags der Touch-Eingabe zurücksetzen
    t.jumpPressed = false; t.jumpReleased = false; t.divePressed = false; t.actionPressed = false;
  }
}
