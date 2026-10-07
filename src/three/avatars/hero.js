// Avatare der Heldinnen (Lotti, Greta) und des Reittiers Pflaume – PLATZHALTER aus Grundkörpern.
// Die endgültigen Modelle (Super-Mario-3D-World-Look) ersetzen buildModel/animate; die
// Schnittstelle (Avatar3D) bleibt. Zustand kommt vom Phaser-Sprite:
//   Hero:    obj.moveState ('ground'|'air'|'glide'|'dive'), obj.body.velocity, obj.onGround,
//            obj.mount (reitet), obj.swooping, obj.leaf.visible (Schirm offen), obj.key ('lotti'|'greta')
//   Pflaume: obj.power ('none'|'red'|'blue'|'yellow'), obj.isRidden, obj.isFleeing, obj.hovering,
//            Frame-Name (idle0_red, walk1_none, panic_blue, fly_yellow …)

import * as THREE from 'three';
import { Avatar3D } from '../Avatar3D.js';
import { POWER_COLORS } from '../../gfx/palette.js';

const HERO_COLORS = {
  lotti: { hair: 0xb98a3c, dress: 0x3d8ef0, skin: 0xffd9b8 },
  greta: { hair: 0xf2dc8a, dress: 0x4fb833, skin: 0xffd9b8 },
};

export class HeroAvatar extends Avatar3D {
  buildModel() {
    const c = HERO_COLORS[this.textureKey] ?? HERO_COLORS.lotti;
    const skin = this.track(new THREE.MeshStandardMaterial({ color: c.skin, roughness: 0.6 }));
    const dress = this.track(new THREE.MeshStandardMaterial({ color: c.dress, roughness: 0.6 }));
    const hair = this.track(new THREE.MeshStandardMaterial({ color: c.hair, roughness: 0.7 }));
    const body = new THREE.Mesh(this.track(new THREE.ConeGeometry(0.42, 0.75, 16)), dress);
    body.position.y = 0.45; body.castShadow = true;
    const head = new THREE.Mesh(this.track(new THREE.SphereGeometry(0.4, 20, 16)), skin);
    head.position.y = 1.12; head.castShadow = true;
    const hairCap = new THREE.Mesh(this.track(new THREE.SphereGeometry(0.42, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.55)), hair);
    hairCap.position.y = 1.16;
    this.model.add(body, head, hairCap);
    this.body = body;
    // Blätterschirm
    const leafMat = this.track(new THREE.MeshStandardMaterial({ color: 0xd8702c, roughness: 0.8, side: THREE.DoubleSide }));
    this.umbrella = new THREE.Mesh(this.track(new THREE.ConeGeometry(0.9, 0.4, 10)), leafMat);
    this.umbrella.position.y = 1.9; this.umbrella.visible = false;
    this.model.add(this.umbrella);
  }

  animate(dt, t) {
    const o = this.obj;
    this.umbrella.visible = !!o.leaf?.visible;
    const running = o.moveState === 'ground' && Math.abs(o.body.velocity.x) > 8;
    this.body.rotation.z = running ? Math.sin(t * 16) * 0.12 : 0;
  }
}

export class PflaumeAvatar extends Avatar3D {
  buildModel() {
    const fur = this.track(new THREE.MeshStandardMaterial({ color: 0x1a1a1f, roughness: 0.9 }));
    const white = this.track(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }));
    this.collarMat = this.track(new THREE.MeshStandardMaterial({ color: 0x9a6cd8, roughness: 0.5 }));
    const body = new THREE.Mesh(this.track(new THREE.SphereGeometry(0.55, 20, 16)), fur);
    body.scale.set(1.3, 0.9, 1); body.position.y = 0.5; body.castShadow = true;
    const chest = new THREE.Mesh(this.track(new THREE.SphereGeometry(0.3, 16, 12)), white);
    chest.position.set(0.45, 0.4, 0.2);
    const head = new THREE.Mesh(this.track(new THREE.SphereGeometry(0.38, 20, 16)), fur);
    head.position.set(0.7, 0.85, 0); head.castShadow = true;
    const earGeo = this.track(new THREE.CapsuleGeometry(0.1, 0.5, 4, 8));
    const earL = new THREE.Mesh(earGeo, fur); earL.position.set(0.5, 0.55, 0.3); earL.rotation.x = 0.4;
    const earR = new THREE.Mesh(earGeo, fur); earR.position.set(0.5, 0.55, -0.3); earR.rotation.x = -0.4;
    const collar = new THREE.Mesh(this.track(new THREE.TorusGeometry(0.33, 0.07, 8, 20)), this.collarMat);
    collar.position.set(0.5, 0.7, 0); collar.rotation.y = Math.PI / 2;
    this.model.add(body, chest, head, earL, earR, collar);
    this.ears = [earL, earR];
  }

  animate(dt, t) {
    const o = this.obj;
    const col = POWER_COLORS[o.power]?.Z ?? '#9a6cd8';
    this.collarMat.color.set(col);
    const flap = o.hovering ? Math.sin(t * 30) * 0.8 : 0;
    this.ears[0].rotation.z = flap; this.ears[1].rotation.z = -flap;
  }
}
