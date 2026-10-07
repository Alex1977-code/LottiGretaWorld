// Avatare der Gegner – PLATZHALTER aus Grundkörpern (werden durch die endgültigen Modelle ersetzt).
// Zustand vom Phaser-Sprite: obj.alive, Frame-Name ('walk0','walk1','squashed' | 'idle','squat','jump'),
// obj.flipY (weggeschleudert), obj.body.velocity, obj.dir.

import * as THREE from 'three';
import { Avatar3D } from '../Avatar3D.js';

export class WalkerAvatar extends Avatar3D {
  buildModel() {
    const mat = this.track(new THREE.MeshStandardMaterial({ color: 0x8a3fb0, roughness: 0.5 }));
    this.shell = new THREE.Mesh(this.track(new THREE.SphereGeometry(0.45, 18, 14)), mat);
    this.shell.scale.set(1.2, 0.8, 1); this.shell.position.y = 0.36; this.shell.castShadow = true;
    this.model.add(this.shell);
  }
  animate(dt, t) {
    const squashed = this.frameName === 'squashed';
    this.shell.scale.y = squashed ? 0.25 : 0.8 + Math.sin(t * 10) * 0.05;
    this.model.rotation.x = this.obj.flipY ? Math.PI : 0;
  }
}

export class HopperAvatar extends Avatar3D {
  buildModel() {
    const cap = this.track(new THREE.MeshStandardMaterial({ color: 0xe04a3a, roughness: 0.5 }));
    const stem = this.track(new THREE.MeshStandardMaterial({ color: 0xf7ecd8, roughness: 0.7 }));
    this.stemMesh = new THREE.Mesh(this.track(new THREE.CylinderGeometry(0.22, 0.28, 0.5, 12)), stem);
    this.stemMesh.position.y = 0.25;
    this.capMesh = new THREE.Mesh(this.track(new THREE.SphereGeometry(0.5, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2)), cap);
    this.capMesh.position.y = 0.45; this.capMesh.castShadow = true;
    this.model.add(this.stemMesh, this.capMesh);
  }
  animate() {
    const f = this.frameName;
    const squat = f === 'squat' || f === 'squashed';
    this.model.scale.y = squat ? 0.6 : 1;
    this.model.rotation.x = this.obj.flipY ? Math.PI : 0;
  }
}
