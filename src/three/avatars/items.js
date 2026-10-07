// Avatare der Level-Objekte – PLATZHALTER aus Grundkörpern (werden durch die endgültigen Modelle ersetzt).
// Zustand vom Phaser-Sprite: Coin: obj.index, obj.alpha (gespeicherte Münze halbtransparent),
// Key: obj.collected (folgt der Heldin), Gate: Frame 'closed'|'open', Flag: Frames flag0..2,
// Checkpoint: Frame 'off'|'on', Berry: Frame 'berry_red'|'berry_blue'|'berry_yellow', Fireball: Frames fire0/1.

import * as THREE from 'three';
import { Avatar3D } from '../Avatar3D.js';

class StaticAvatar extends Avatar3D {
  constructor(view, obj) { super(view, obj); this.usesFacing = false; this.usesAngle = false; this.turnSpeed = 0; }
}

export class CoinAvatar extends StaticAvatar {
  buildModel() {
    this.mat = this.track(new THREE.MeshStandardMaterial({ color: 0xf7931a, metalness: 0.6, roughness: 0.3, transparent: true }));
    this.disc = new THREE.Mesh(this.track(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 24)), this.mat);
    this.disc.rotation.x = Math.PI / 2; this.disc.position.y = 0.5; this.disc.castShadow = true;
    this.model.add(this.disc);
  }
  animate(dt, t) {
    this.disc.rotation.y = t * 3 + this.obj.index;
    this.mat.opacity = this.obj.alpha;
    this.root.visible = this.obj.visible && this.obj.alpha > 0.05;
  }
}

export class KeyAvatar extends StaticAvatar {
  buildModel() {
    const mat = this.track(new THREE.MeshStandardMaterial({ color: 0xffd34a, metalness: 0.7, roughness: 0.3 }));
    const ring = new THREE.Mesh(this.track(new THREE.TorusGeometry(0.2, 0.06, 8, 16)), mat);
    ring.position.y = 0.75;
    const shaft = new THREE.Mesh(this.track(new THREE.BoxGeometry(0.1, 0.5, 0.1)), mat);
    shaft.position.y = 0.35;
    this.model.add(ring, shaft);
  }
  animate(dt, t) { this.model.rotation.y = t * 2; }
}

export class GateAvatar extends StaticAvatar {
  buildModel() {
    const mat = this.track(new THREE.MeshStandardMaterial({ color: 0x8c6a3f, roughness: 0.8 }));
    this.door = new THREE.Mesh(this.track(new THREE.BoxGeometry(0.9, 1.8, 0.2)), mat);
    this.door.position.y = 0.9; this.door.castShadow = true;
    this.model.add(this.door);
  }
  animate() { this.door.rotation.y = this.frameName === 'open' ? -1.4 : 0; }
}

export class FlagAvatar extends StaticAvatar {
  buildModel() {
    const pole = new THREE.Mesh(this.track(new THREE.CylinderGeometry(0.05, 0.05, 2, 8)), this.track(new THREE.MeshStandardMaterial({ color: 0xeeeeee })));
    pole.position.y = 1;
    this.cloth = new THREE.Mesh(this.track(new THREE.PlaneGeometry(0.8, 0.5)), this.track(new THREE.MeshStandardMaterial({ color: 0xe03a3a, side: THREE.DoubleSide })));
    this.cloth.position.set(0.45, 1.7, 0);
    this.model.add(pole, this.cloth);
  }
  animate(dt, t) { this.cloth.rotation.y = Math.sin(t * 4) * 0.3; }
}

export class ThornsAvatar extends StaticAvatar {
  buildModel() {
    const mat = this.track(new THREE.MeshStandardMaterial({ color: 0x5a3a2a, roughness: 0.9 }));
    const geo = this.track(new THREE.ConeGeometry(0.12, 0.35, 6));
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(-0.35 + i * 0.23, 0.17, (i % 2) * 0.2 - 0.1);
      this.model.add(m);
    }
  }
}

export class CheckpointAvatar extends StaticAvatar {
  buildModel() {
    const pole = new THREE.Mesh(this.track(new THREE.CylinderGeometry(0.06, 0.06, 2, 8)), this.track(new THREE.MeshStandardMaterial({ color: 0xb08050 })));
    pole.position.y = 1;
    this.lampMat = this.track(new THREE.MeshStandardMaterial({ color: 0x777777, emissive: 0x000000 }));
    const lamp = new THREE.Mesh(this.track(new THREE.SphereGeometry(0.22, 12, 10)), this.lampMat);
    lamp.position.y = 2;
    this.model.add(pole, lamp);
  }
  animate() {
    const on = this.frameName === 'on';
    this.lampMat.color.set(on ? 0x4fd34a : 0x777777);
    this.lampMat.emissive.set(on ? 0x2a8a2a : 0x000000);
  }
}

const BERRY_COLORS = { berry_red: 0xe03a3a, berry_blue: 0x3a7ae0, berry_yellow: 0xf0c020 };

export class BerryAvatar extends StaticAvatar {
  buildModel() {
    this.mat = this.track(new THREE.MeshStandardMaterial({ color: BERRY_COLORS[this.frameName] ?? 0xe03a3a, roughness: 0.3 }));
    const b = new THREE.Mesh(this.track(new THREE.SphereGeometry(0.28, 16, 12)), this.mat);
    b.position.y = 0.32; b.castShadow = true;
    this.model.add(b);
  }
  animate(dt, t) { this.model.rotation.y = t; }
}

export class FireballAvatar extends StaticAvatar {
  buildModel() {
    const m = new THREE.Mesh(this.track(new THREE.SphereGeometry(0.25, 12, 10)), this.track(new THREE.MeshBasicMaterial({ color: 0xffa020 })));
    m.position.y = 0.25;
    this.model.add(m);
  }
}
