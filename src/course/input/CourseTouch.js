// Touch-Steuerung des Kurs-Modus (in der Szene 'CourseUI', Logik-Koordinaten 480x270):
//  - links: analoger 2D-Stick, erscheint dort, wo der Daumen aufsetzt (Ruheposition unten links angedeutet)
//  - rechts: A = Sprung (groß), B = Ducken, Y = Aktion/Rennen (gehalten = Rennen)
//  - klein am rechten Rand: Kamera ⟲ ⟳ und Zoom
// Schreibt nur in CourseInput.touch. Mehrere Finger gleichzeitig (Stick + Knöpfe).

import Phaser from 'phaser';
import { GAME } from '../../config.js';
import { uiText } from '../../ui.js';

const STICK_R = 30;
const DEAD = 0.12;

export const TOUCH_LAYOUT = {
  A: { x: 438, y: 222, r: 25, color: 0x4fb833, label: 'A' },
  B: { x: 386, y: 240, r: 18, color: 0x3a7bff, label: 'B' },
  Y: { x: 412, y: 176, r: 18, color: 0xff9f1a, label: 'Y' },
  camL: { x: 464, y: 96, r: 11, label: '⟲' },
  camR: { x: 464, y: 122, r: 11, label: '⟳' },
  zoom: { x: 464, y: 148, r: 11, label: '⊕' },
  stickHome: { x: 72, y: 206 },
};

export class CourseTouch {
  /**
   * @param {Phaser.Scene} scene
   * @param {import('./CourseInput.js').CourseInput} input
   */
  constructor(scene, input) {
    this.scene = scene;
    this.touch = input.touch;
    this.visible = false;
    this.ptr = { stick: null, A: null, B: null, Y: null };
    this.origin = new Phaser.Math.Vector2();
    this.knob = new Phaser.Math.Vector2();
    this.g = scene.add.graphics().setDepth(90);
    this.labels = [];
    for (const k of ['A', 'B', 'Y', 'camL', 'camR', 'zoom']) {
      const b = TOUCH_LAYOUT[k];
      const big = k.length === 1;
      this.labels.push(uiText(scene, b.x, b.y + (big ? 0 : -0.5), b.label, { size: big ? (k === 'A' ? 15 : 11) : 9, thickness: big ? 3 : 2, shadow: false }).setDepth(91).setAlpha(0.95));
    }
    this.setVisible(false);
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    scene.input.on(Phaser.Input.Events.GAME_OUT, this.releaseAll, this);
  }

  setVisible(v) {
    this.visible = v;
    for (const l of this.labels) l.setVisible(v);
    this.draw();
  }

  hit(b, x, y, extra = 8) { return Phaser.Math.Distance.Between(x, y, b.x, b.y) <= b.r + extra; }

  onDown(pointer) {
    if (!this.visible) return;
    const x = pointer.worldX, y = pointer.worldY;
    const L = TOUCH_LAYOUT, t = this.touch;
    if (this.hit(L.camL, x, y, 5)) { t.camLeft = true; return; }
    if (this.hit(L.camR, x, y, 5)) { t.camRight = true; return; }
    if (this.hit(L.zoom, x, y, 5)) { t.zoom = true; return; }
    if (this.hit(L.A, x, y, 12) && this.ptr.A === null) { this.ptr.A = pointer.id; t.jump = true; t.jumpPressed = true; this.draw(); return; }
    if (this.hit(L.B, x, y, 9) && this.ptr.B === null) { this.ptr.B = pointer.id; t.crouch = true; t.crouchPressed = true; this.draw(); return; }
    if (this.hit(L.Y, x, y, 9) && this.ptr.Y === null) { this.ptr.Y = pointer.id; t.run = true; t.actionPressed = true; this.draw(); return; }
    if (x < GAME.width * 0.48 && y > 34 && this.ptr.stick === null) {
      this.ptr.stick = pointer.id;
      this.origin.set(x, y);
      this.knob.set(x, y);
      t.x = 0; t.y = 0; t.active = true;
      this.draw();
    }
  }

  onMove(pointer) {
    if (pointer.id !== this.ptr.stick) return;
    let dx = pointer.worldX - this.origin.x, dy = pointer.worldY - this.origin.y;
    const d = Math.hypot(dx, dy);
    // Stick wandert mit, wenn der Daumen über den Rand hinausgeht
    if (d > STICK_R) { this.origin.x = pointer.worldX - (dx / d) * STICK_R; this.origin.y = pointer.worldY - (dy / d) * STICK_R; dx = (dx / d) * STICK_R; dy = (dy / d) * STICK_R; }
    this.knob.set(this.origin.x + dx, this.origin.y + dy);
    let ax = dx / STICK_R, ay = -dy / STICK_R;
    const m = Math.hypot(ax, ay);
    if (m < DEAD) { ax = 0; ay = 0; } else { const k = (m - DEAD) / (1 - DEAD) / m; ax *= k; ay *= k; }
    this.touch.x = ax; this.touch.y = ay;
    this.draw();
  }

  onUp(pointer) {
    const t = this.touch;
    if (pointer.id === this.ptr.stick) { this.ptr.stick = null; t.x = 0; t.y = 0; t.active = false; }
    if (pointer.id === this.ptr.A) { this.ptr.A = null; t.jump = false; }
    if (pointer.id === this.ptr.B) { this.ptr.B = null; t.crouch = false; }
    if (pointer.id === this.ptr.Y) { this.ptr.Y = null; t.run = false; }
    this.draw();
  }

  releaseAll() {
    this.ptr = { stick: null, A: null, B: null, Y: null };
    Object.assign(this.touch, { x: 0, y: 0, active: false, jump: false, crouch: false, run: false });
    this.draw();
  }

  draw() {
    const g = this.g;
    g.clear();
    if (!this.visible) return;
    const L = TOUCH_LAYOUT;
    // Stick
    if (this.ptr.stick !== null) {
      g.fillStyle(0x1a1830, 0.25); g.fillCircle(this.origin.x, this.origin.y, STICK_R + 4);
      g.lineStyle(1.5, 0xffffff, 0.5); g.strokeCircle(this.origin.x, this.origin.y, STICK_R);
      g.fillStyle(0xffffff, 0.6); g.fillCircle(this.knob.x, this.knob.y, 12);
    } else {
      const h = L.stickHome;
      g.fillStyle(0x1a1830, 0.16); g.fillCircle(h.x, h.y, STICK_R + 4);
      g.lineStyle(1.2, 0xffffff, 0.28); g.strokeCircle(h.x, h.y, STICK_R);
      g.fillStyle(0xffffff, 0.3); g.fillCircle(h.x, h.y, 11);
    }
    // Aktionsknöpfe: farbiger Ring, gedrückt heller
    for (const k of ['A', 'B', 'Y']) {
      const b = L[k], down = this.ptr[k] !== null;
      g.fillStyle(0x000000, 0.18); g.fillCircle(b.x, b.y + 2, b.r);
      g.fillStyle(b.color, down ? 0.85 : 0.5); g.fillCircle(b.x, b.y, b.r);
      g.lineStyle(2, 0xffffff, down ? 0.95 : 0.6); g.strokeCircle(b.x, b.y, b.r - 1);
    }
    for (const k of ['camL', 'camR', 'zoom']) {
      const b = L[k];
      g.fillStyle(0x1a1830, 0.4); g.fillCircle(b.x, b.y, b.r);
      g.lineStyle(1, 0xffffff, 0.45); g.strokeCircle(b.x, b.y, b.r);
    }
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
