// Touch-Steuerung:
//  - linke Hälfte: virtueller Analog-Stick, erscheint dort, wo der Daumen aufsetzt
//  - rechte Hälfte: Tippen = Springen, Halten = Gleiten, nach unten wischen = Sturzflug
//    (loslassen oder nach oben wischen = Aufschwung), Aktionsknopf am rechten Rand
// Schreibt ausschließlich in inputManager.touch – Pip bleibt eingabe-agnostisch.

import Phaser from 'phaser';
import { GAME, INPUT } from '../config.js';

export class TouchControls {
  /**
   * @param {Phaser.Scene} scene UI-Szene (scrollt nicht)
   * @param {import('./InputManager.js').InputManager} inputManager
   */
  constructor(scene, inputManager) {
    this.scene = scene;
    this.touch = inputManager.touch;
    this.w = GAME.width;
    this.h = GAME.height;

    this.stickPointer = null;   // Pointer-ID des Sticks
    this.stickOrigin = new Phaser.Math.Vector2();
    this.jumpPointer = null;    // Pointer-ID der Sprung-Hand
    this.actionPointer = null;
    this.history = [];          // {y, t} der Sprung-Hand für Wisch-Erkennung
    this.actionAvailable = false;

    // Aktionsknopf-Position (rechter Rand, etwas über der Mitte)
    this.actionPos = new Phaser.Math.Vector2(this.w - 24, this.h * 0.42);
    this.actionRadius = 15;

    this.gfx = scene.add.graphics().setDepth(100).setScrollFactor(0);
    this.actionGfx = scene.add.graphics().setDepth(100).setScrollFactor(0);
    this.drawActionButton(false);

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    scene.input.on(Phaser.Input.Events.GAME_OUT, this.releaseAll, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  /** Markiert, ob der Aktionsknopf gerade etwas bewirkt (auf Pflaume). */
  setActionAvailable(v) {
    if (this.actionAvailable === v) return;
    this.actionAvailable = v;
    this.drawActionButton(this.actionPointer !== null);
  }

  inActionButton(x, y) {
    return Phaser.Math.Distance.Between(x, y, this.actionPos.x, this.actionPos.y) <= this.actionRadius + 6;
  }

  onDown(pointer) {
    const x = pointer.x, y = pointer.y;
    if (x < this.w * 0.5) {
      if (this.stickPointer === null) {
        this.stickPointer = pointer.id;
        this.stickOrigin.set(x, y);
        this.touch.axisX = 0;
        this.drawStick(x, y, x, y);
      }
      return;
    }
    if (this.inActionButton(x, y)) {
      if (this.actionPointer === null) {
        this.actionPointer = pointer.id;
        this.touch.actionPressed = true;
        this.touch.actionHeld = true;
        this.drawActionButton(true);
      }
      return;
    }
    if (this.jumpPointer === null) {
      this.jumpPointer = pointer.id;
      this.touch.jumpPressed = true;
      this.touch.jumpHeld = true;
      this.history = [{ y, t: pointer.time }];
      this.drawTapRing(x, y);
    }
  }

  onMove(pointer) {
    if (pointer.id === this.stickPointer) {
      const r = INPUT.stickRadius;
      let dx = pointer.x - this.stickOrigin.x;
      // Stick "wandert" mit, wenn der Daumen über den Radius hinausgeht
      if (Math.abs(dx) > r) {
        this.stickOrigin.x = pointer.x - Math.sign(dx) * r;
        dx = Math.sign(dx) * r;
      }
      const dy = Phaser.Math.Clamp(pointer.y - this.stickOrigin.y, -r, r);
      let axis = dx / r;
      const dz = INPUT.stickDeadzone;
      axis = Math.abs(axis) < dz ? 0 : Math.sign(axis) * (Math.abs(axis) - dz) / (1 - dz);
      this.touch.axisX = axis;
      this.drawStick(this.stickOrigin.x, this.stickOrigin.y, this.stickOrigin.x + dx, this.stickOrigin.y + dy);
    } else if (pointer.id === this.jumpPointer) {
      this.history.push({ y: pointer.y, t: pointer.time });
      // Nur die letzten swipeTime ms behalten
      const cutoff = pointer.time - INPUT.swipeTime;
      while (this.history.length > 1 && this.history[0].t < cutoff) this.history.shift();
      // Gegen den Extremwert im Fenster vergleichen (robust bei langsamen Wischen)
      let minY = Infinity, maxY = -Infinity;
      for (const h of this.history) { if (h.y < minY) minY = h.y; if (h.y > maxY) maxY = h.y; }
      if (!this.touch.diveHeld && pointer.y - minY > INPUT.swipeThreshold) {
        // Wisch nach unten → Sturzflug
        this.touch.diveHeld = true;
        this.touch.divePressed = true;
        this.history = [{ y: pointer.y, t: pointer.time }];
      } else if (this.touch.diveHeld && maxY - pointer.y > INPUT.swipeThreshold) {
        // Wisch nach oben → hochziehen
        this.touch.diveHeld = false;
        this.history = [{ y: pointer.y, t: pointer.time }];
      }
    }
  }

  onUp(pointer) {
    if (pointer.id === this.stickPointer) {
      this.stickPointer = null;
      this.touch.axisX = 0;
      this.gfx.clear();
    } else if (pointer.id === this.jumpPointer) {
      this.jumpPointer = null;
      this.touch.jumpHeld = false;
      this.touch.jumpReleased = true;
      this.touch.diveHeld = false;
      this.history = [];
    } else if (pointer.id === this.actionPointer) {
      this.actionPointer = null;
      this.touch.actionHeld = false;
      this.drawActionButton(false);
    }
  }

  releaseAll() {
    this.stickPointer = null;
    this.jumpPointer = null;
    this.actionPointer = null;
    this.touch.axisX = 0;
    this.touch.jumpHeld = false;
    this.touch.diveHeld = false;
    this.touch.actionHeld = false;
    this.gfx.clear();
    this.drawActionButton(false);
  }

  drawStick(ox, oy, kx, ky) {
    const g = this.gfx;
    g.clear();
    g.fillStyle(0xffffff, 0.14);
    g.fillCircle(ox, oy, INPUT.stickRadius);
    g.lineStyle(1, 0xffffff, 0.35);
    g.strokeCircle(ox, oy, INPUT.stickRadius);
    g.fillStyle(0xffffff, 0.45);
    g.fillCircle(kx, ky, 9);
  }

  drawActionButton(pressed) {
    const g = this.actionGfx;
    const { x, y } = this.actionPos;
    const r = this.actionRadius;
    const base = this.actionAvailable ? 0.5 : 0.18;
    g.clear();
    g.fillStyle(this.actionAvailable ? 0xffb347 : 0xffffff, pressed ? base + 0.3 : base);
    g.fillCircle(x, y, r);
    g.lineStyle(1, 0xffffff, this.actionAvailable ? 0.8 : 0.3);
    g.strokeCircle(x, y, r);
    // Symbol: kleiner Stern/Funke
    g.fillStyle(0xffffff, this.actionAvailable ? 0.9 : 0.35);
    g.fillRect(x - 1, y - 6, 2, 12);
    g.fillRect(x - 6, y - 1, 12, 2);
    g.fillRect(x - 4, y - 4, 2, 2);
    g.fillRect(x + 2, y - 4, 2, 2);
    g.fillRect(x - 4, y + 2, 2, 2);
    g.fillRect(x + 2, y + 2, 2, 2);
  }

  /** Kurzer Ring an der Tipp-Position als Feedback. */
  drawTapRing(x, y) {
    const ring = this.scene.add.circle(x, y, 6).setStrokeStyle(1, 0xffffff, 0.6).setDepth(100).setScrollFactor(0);
    this.scene.tweens.add({ targets: ring, radius: 16, alpha: 0, duration: 220, onComplete: () => ring.destroy() });
  }

  destroy() {
    const inp = this.scene.input;
    inp.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    inp.off(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    inp.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    inp.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    inp.off(Phaser.Input.Events.GAME_OUT, this.releaseAll, this);
  }
}
