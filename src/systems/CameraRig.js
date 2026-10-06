// Kamera-Steuerung: weiches Folgen, Vorausschauen in Laufrichtung.

import Phaser from 'phaser';
import { CAMERA } from '../config.js';

export class CameraRig {
  /**
   * @param {Phaser.Scene} scene
   * @param {Phaser.GameObjects.Sprite} target
   */
  constructor(scene, target) {
    this.scene = scene;
    this.target = target;
    this.cam = scene.cameras.main;
    this.lookX = 0;

    this.cam.startFollow(target, true, CAMERA.lerpX, CAMERA.lerpY);
    this.cam.setDeadzone(CAMERA.deadzoneWidth, CAMERA.deadzoneHeight);
    this.cam.setFollowOffset(0, 0);
  }

  update() {
    const t = this.target;
    // Ziel-Vorausschau nach Blickrichtung, nur wenn sich Lotti bewegt
    const moving = Math.abs(t.body.velocity.x) > 10;
    const want = moving ? t.facing * CAMERA.lookAhead : this.lookX;
    this.lookX = Phaser.Math.Linear(this.lookX, want, CAMERA.lookAheadLerp);
    // followOffset wird von der Zielposition abgezogen → negatives Offset = Blick nach vorn
    this.cam.setFollowOffset(-this.lookX, 0);
  }
}
