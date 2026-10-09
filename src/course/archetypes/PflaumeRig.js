// Darstellung der Diorama-Figur (Archetyp `diorama`, über createRig): Pflaume als Schatzsucherin mit Stirnlampe und
// Rucksack (PflaumeAvatar im Kurs-Modus, course.gear = 'lamp'). Muster wie HeroRig: Hülle (Fußpunkt, Gier weich,
// Maßstab SIZE/1,5 groß bzw. ×0,78 klein, Federn bei Landung), je Bild proxy.course füllen und animate() rufen.
// Zustände: idle | walk (bis 2,8 m/s) | run | jump (in der Luft, Treffer) | dig (Buddeln) | victory (Siegesablauf);
// Tod: Freudensprung-Pose rückwärts gedreht und Blinken (Pflaume hat keine eigene Todes-Pose).

import * as THREE from 'three';
import { createAvatar } from '../../three/avatars/index.js';

const AVATAR_H = 1.5;
const SIZE = 1.3;                 // Pflaume als Hauptfigur etwas größer als im Floß-Level (≈ 0,9 m mit Ohren)
const TAU = Math.PI * 2;
const wrap = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; else if (a < -Math.PI) a += TAU; return a; };
const damp = (c, t, r, dt) => c + (t - c) * (1 - Math.exp(-r * dt));

export class PflaumeRig {
  constructor(view, player) {
    this.view = view;
    this.player = player;
    this.hull = new THREE.Group();
    this.hull.name = 'pflaume';
    view.three.add(this.hull);
    this.proxy = {
      texture: { key: 'pflaume' }, key: 'pflaume',
      x: 0, y: 0, width: 0, height: 0, angle: 0, scaleX: 1, scaleY: 1, alpha: 1, visible: true, flipX: false,
      body: { velocity: { x: 0, y: 0 }, blocked: { down: true }, touching: { down: true } }, power: 'none',
      course: { state: 'idle', speed: 0, vy: 0, grounded: true, power: 'none', gear: 'lamp', rider: null },
    };
    this.avatar = null;
    try {
      this.avatar = createAvatar(view, this.proxy);
      this.avatar.setCourseMode?.(true);
      this.hull.add(this.avatar.root);
    } catch (err) { console.error('Pflaume-Avatar fehlgeschlagen:', err); }
    this.yaw = player.yaw;
    this.scale = SIZE / AVATAR_H;
    this.squash = 0; this.squashV = 0;
    this.lastMode = player.mode;
    this.spin = 0;
  }

  update(dt, t) {
    const p = this.player, c = this.proxy.course;
    this.hull.position.copy(p.pos);
    this.yaw += wrap(p.yaw - this.yaw) * (1 - Math.exp(-16 * dt));
    const speed = Math.hypot(p.vel.x, p.vel.z);
    let state;
    if (p.treasure || p.state === 'victory') state = 'victory';
    else if (p.dead) state = 'jump';
    else if (p.mode === 'air') state = 'jump';
    else if (p.digging) state = 'dig';
    else state = speed < 0.3 ? 'idle' : speed < 2.8 ? 'walk' : 'run';
    c.state = state;
    c.speed = speed;
    c.vy = p.vel.y;
    c.grounded = p.mode === 'ground' || p.mode === 'script';
    c.power = 'none';
    c.gear = 'lamp';
    // Landung federt
    if (this.lastMode === 'air' && p.mode === 'ground') this.squashV -= Math.min(5, 1.5 + Math.abs(p.lastLandVy ?? 0) * 0.25);
    this.lastMode = p.mode;
    this.squashV += (-90 * this.squash - 12 * this.squashV) * dt;
    this.squash += this.squashV * dt;
    const sq = Math.max(-0.3, Math.min(0.3, this.squash));
    this.scale = damp(this.scale, (SIZE / AVATAR_H) * (p.big ? 1 : 0.78), 10, dt);
    this.hull.scale.set(this.scale * (1 - sq * 0.5), this.scale * (1 + sq), this.scale * (1 - sq * 0.5));
    this.spin = p.dead ? this.spin + dt * 9 : 0;
    this.hull.rotation.set(0, this.yaw + this.spin, 0);
    const blink = (p.invuln > 0 && Math.floor(t * 16) % 2 === 0) || (p.dead && p.deathCause === 'fall' && p.script?.t > 0.3);
    this.hull.visible = !blink;
    if (!this.avatar) return;
    try { this.avatar.animate(dt, t); } catch (err) { console.error('Pflaume-Animation fehlgeschlagen:', err); this.avatar = null; }
  }

  dispose() {
    this.avatar?.dispose();
    this.avatar = null;
    this.hull.parent?.remove(this.hull);
  }
}
