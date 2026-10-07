// UI-Bausteine im 3D-World-Look: runde fette Schrift mit dunkler Kontur, abgerundete Panels und Knöpfe.

import Phaser from 'phaser';
import { RENDER } from './render.js';

export const UI_FONT = '"Nunito", "Arial Rounded MT Bold", "Trebuchet MS", "Segoe UI", Arial, sans-serif';

/** Textstil: fett, weiß, dunkle Kontur, weicher Schatten. */
export function textStyle({ size = 10, color = '#ffffff', stroke = '#2a2550', thickness = 3, align = 'center', shadow = true } = {}) {
  return {
    fontFamily: UI_FONT,
    fontStyle: 'bold',
    fontSize: `${size}px`,
    color,
    stroke,
    strokeThickness: thickness,
    align,
    resolution: RENDER.scale,
    shadow: shadow ? { offsetX: 0, offsetY: 1, color: 'rgba(0,0,0,0.35)', blur: 2, fill: true, stroke: true } : undefined,
  };
}

export function uiText(scene, x, y, str, opts = {}) {
  return scene.add.text(x, y, str, textStyle(opts)).setOrigin(opts.originX ?? 0.5, opts.originY ?? 0.5);
}

/** Abgerundetes Panel (Hintergrund) mit weichem Schatten. */
export function uiPanel(scene, x, y, w, h, { color = 0xfff6e8, alpha = 0.96, radius = 8, shadow = true, border = 0xd9c7a8 } = {}) {
  const g = scene.add.graphics();
  if (shadow) {
    g.fillStyle(0x000000, 0.25);
    g.fillRoundedRect(x - w / 2 + 1, y - h / 2 + 3, w, h, radius);
  }
  g.fillStyle(color, alpha);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, radius);
  if (border) {
    g.lineStyle(1, border, 0.9);
    g.strokeRoundedRect(x - w / 2 + 0.5, y - h / 2 + 0.5, w - 1, h - 1, radius);
  }
  return g;
}

/**
 * Knopf: abgerundete Pille mit Lichtkante oben, Text in der Mitte. Reagiert auf pointerdown
 * mit (pointer, lx, ly, event) wie ein normales interaktives GameObject; setText() passt die Breite an.
 */
export class UiButton extends Phaser.GameObjects.Container {
  constructor(scene, x, y, label, { size = 9, color = 0x4fb833, textColor = '#ffffff', minWidth = 0, padX = 8, padY = 4, dark = false } = {}) {
    super(scene, x, y);
    scene.add.existing(this);
    this.opts = { size, color, textColor, minWidth, padX, padY, dark };
    this.bg = scene.add.graphics();
    this.label = scene.add.text(0, 0, label, textStyle({ size, color: textColor, thickness: dark ? 2 : 3, shadow: false })).setOrigin(0.5);
    this.add([this.bg, this.label]);
    this.layout();
    this.on(Phaser.Input.Events.POINTER_DOWN, () => this.scene.tweens.add({ targets: this, scaleX: 0.94, scaleY: 0.94, duration: 60, yoyo: true }));
  }

  layout() {
    const { color, minWidth, padX, padY, dark } = this.opts;
    const w = Math.max(minWidth, this.label.width + padX * 2);
    const h = this.label.height + padY * 2;
    const r = h / 2;
    const g = this.bg;
    g.clear();
    if (dark) {
      g.fillStyle(0x1a1830, 0.55);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
      g.lineStyle(1, 0xffffff, 0.25);
      g.strokeRoundedRect(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1, r);
    } else {
      const c = Phaser.Display.Color.IntegerToColor(color);
      const darker = Phaser.Display.Color.GetColor(c.red * 0.6, c.green * 0.6, c.blue * 0.6);
      const lighter = Phaser.Display.Color.GetColor(Math.min(255, c.red * 1.25 + 30), Math.min(255, c.green * 1.25 + 30), Math.min(255, c.blue * 1.25 + 30));
      g.fillStyle(0x000000, 0.25);
      g.fillRoundedRect(-w / 2, -h / 2 + 2.5, w, h, r);       // Schatten
      g.fillStyle(darker, 1);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, r);             // dunkler Rand/Unterseite
      g.fillStyle(color, 1);
      g.fillRoundedRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 3, r - 1);
      g.fillStyle(lighter, 0.55);
      g.fillRoundedRect(-w / 2 + 3, -h / 2 + 2, w - 6, h * 0.35, r - 2); // Lichtkante
    }
    this.setSize(w, h);
    // Trefffläche in ursprungs-normierten Koordinaten (Phaser addiert displayOrigin): oben links = (0,0)
    if (!this.input) this.setInteractive({ hitArea: new Phaser.Geom.Rectangle(0, 0, w, h), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
    else { this.input.hitArea.setTo(0, 0, w, h); }
  }

  setText(str) {
    this.label.setText(str);
    this.layout();
    return this;
  }
}

export function uiButton(scene, x, y, label, opts) {
  return new UiButton(scene, x, y, label, opts);
}
