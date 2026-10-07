// Basisklasse für 3D-Avatare: spiegelt ein Phaser-Sprite (Position, Blickrichtung, Neigung,
// Squash & Stretch, Sichtbarkeit) auf eine Three.js-Gruppe. Unterklassen bauen das Modell im
// Konstruktor (buildModel) und animieren es in animate().
//
// Konventionen für Modelle:
//  - Ursprung der Gruppe = Fußpunkt der Figur (Unterkante des Phaser-Frames), Spielebene Z = 0.
//  - Modelle blicken nach +X (rechts); die Blickrichtung wird über die Y-Drehung der Gruppe gesetzt.
//  - Maße in Tiles: 1 Einheit = 16 Weltpixel. Eine 24-px-Figur ist also ~1,5 Einheiten hoch.

import * as THREE from 'three';
import { Z } from '../render.js';
import { toX, toY } from './View3D.js';

const lerpAngle = (a, b, t) => a + (b - a) * t;

export class Avatar3D {
  /**
   * @param {import('./View3D.js').View3D} view
   * @param {Phaser.GameObjects.Sprite} obj gespiegeltes Phaser-Objekt
   */
  constructor(view, obj) {
    this.view = view;
    this.obj = obj;
    this.textureKey = obj.texture.key;
    this.root = new THREE.Group();
    this.model = new THREE.Group();   // eigentliches Modell (wird gedreht/gestaucht)
    this.root.add(this.model);
    this.disposables = [];            // Geometrien/Materialien, die nur dieser Avatar nutzt
    this.yaw = 0;                     // aktuelle Drehung (Blickrichtung), weich geführt
    this.turnSpeed = 14;              // 1/s – wie schnell die Figur sich umdreht (0 = sofort)
    this.usesFacing = true;           // flipX → Drehung um Y
    this.usesAngle = true;            // sprite.angle → Neigung um Z
    this.usesSquash = true;           // Skalierung des Sprites (Squash & Stretch) übernehmen
    this.zOffset = 0;                 // Lage vor/hinter der Spielebene
    this.buildModel();
  }

  /** Modell aufbauen (Unterklassen). */
  buildModel() {}

  /** Je Frame: Modell animieren (Unterklassen). t = Sekunden seit Start der Ansicht. */
  animate(dt, t) {}

  /** Fußpunkt (Unterkante des unskalierten Frames) in Weltpixeln. */
  get feetY() { return this.obj.y + (this.obj.height * Z) / 2; }

  /** Blickrichtung des Sprites: 1 = rechts, -1 = links. */
  get facing() { return this.obj.flipX ? -1 : 1; }

  /** Frame-Name des Sprites (z. B. 'run0', 'squashed', 'idle0_red'). */
  get frameName() { return this.obj.frame?.name ?? ''; }

  /** Geometrie/Material zum Aufräumen vormerken. */
  track(...items) { this.disposables.push(...items); return items[0]; }

  /** Transform vom Sprite übernehmen und animieren. */
  sync(dt, t) {
    const o = this.obj;
    this.root.position.set(toX(o.x), toY(this.feetY), this.zOffset);
    this.root.visible = o.visible && o.alpha > 0.5; // Blinken (Unverwundbarkeit) als An/Aus

    if (this.usesFacing) {
      const want = this.facing < 0 ? Math.PI : 0;
      this.yaw = this.turnSpeed > 0 ? lerpAngle(this.yaw, want, Math.min(1, this.turnSpeed * dt)) : want;
      this.model.rotation.y = this.yaw;
    }
    if (this.usesAngle) {
      // Phaser: Winkel im Uhrzeigersinn (Y nach unten) → Three: gegen den Uhrzeigersinn, bei Linksblick gespiegelt
      const a = -THREE.MathUtils.degToRad(o.angle);
      this.model.rotation.z = this.facing < 0 ? -a : a;
    }
    if (this.usesSquash) {
      const sx = o.scaleX / Z, sy = o.scaleY / Z;
      this.model.scale.set(Math.abs(sx), sy, Math.abs(sx));
    }
    this.animate(dt, t);
  }

  dispose() {
    for (const d of this.disposables) d.dispose?.();
    this.disposables.length = 0;
  }
}
