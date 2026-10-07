// Licht der 3D-Welt: warme Sonne (gerichtet, von vorn-oben-links) mit Schatten, deren Schattenkamera
// dem Kameraziel folgt (auf Schatten-Texel gerastert, damit Schattenkanten beim Scrollen nicht
// flimmern), und ein Hemisphärenlicht (Himmelblau von oben, Grasgrün von unten) als weiche Füllung.

import * as THREE from 'three';
import { RENDER3D } from '../../render3d.js';

export class Lighting {
  /** @param {{group: THREE.Group}} ctx */
  constructor(ctx) {
    this.hemi = new THREE.HemisphereLight(0xbfe4ff, 0x86b85a, RENDER3D.hemiIntensity);
    this.sun = new THREE.DirectionalLight(0xfff0d2, RENDER3D.sunIntensity);
    this.sun.castShadow = RENDER3D.shadows;
    const r = RENDER3D.shadowRadius;
    const sc = this.sun.shadow.camera;
    sc.left = -r; sc.right = r; sc.top = r * 0.7; sc.bottom = -r * 0.7; sc.near = 1; sc.far = 90;
    this.sun.shadow.mapSize.set(RENDER3D.shadowMapSize, RENDER3D.shadowMapSize);
    this.sun.shadow.bias = RENDER3D.shadowBias;
    this.sun.shadow.normalBias = RENDER3D.shadowNormalBias;
    this.offset = new THREE.Vector3(-9, 18, 12);
    this.texel = (2 * r) / RENDER3D.shadowMapSize;
    ctx.group.add(this.hemi, this.sun, this.sun.target);
  }

  /** Sonne und Schattenbereich mit dem Kameraziel mitführen. */
  update(target) {
    const t = this.texel;
    const x = Math.round(target.x / t) * t, y = Math.round(target.y / t) * t;
    this.sun.target.position.set(x, y, 0);
    this.sun.position.set(x + this.offset.x, y + this.offset.y, this.offset.z);
  }

  dispose() {
    this.sun.shadow.map?.dispose();
  }
}
