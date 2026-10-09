// Befreite Figur (1-Burg, Zielbereich): Krümel, Pflaumes kleiner Kaninchen-Freund, sitzt im goldenen Käfig des
// Barons. Kommt die Figur heran (radius), springt das Schloss auf, die Tür schwingt auf, Krümel hoppelt heraus,
// macht Freudensprünge und bedankt sich mit einer Sprechblase („Danke, Lotti!“ bzw. Greta). Danach hoppelt er
// neben dem Käfig weiter (rein dekorativ, kein Gegner, keine Belohnung nötig – das Ziel ist der Zielmast).
//
// Daten: { kind: 'rescue_friend', id?, pos: [x, y, z] (Fußpunkt des Käfigs), yaw?: Tür-Richtung (Standard +Z, zur
//          Kamera), name: 'Krümel', radius: 2.6, text?: eigener Dank }
// Laufzeit: state caged | opening | out | happy; freed (bool).
// Modelle 'rescue_cage' (state { open }), 'bunny_small' (state idle|hop); Sprechblase = Sprite mit Leinwand-Text.

import * as THREE from 'three';
import { CourseEntity } from '../CourseEntity.js';
import { getModel } from '../../models/index.js';

const HERO_NAME = { lotti: 'Lotti', greta: 'Greta' };

function bubbleTexture(text, sub) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0)'; g.fillRect(0, 0, 512, 256);
  const r = 46;
  g.fillStyle = '#ffffff'; g.strokeStyle = '#3a2a6a'; g.lineWidth = 10;
  g.beginPath();
  g.moveTo(30 + r, 20); g.lineTo(482 - r, 20); g.quadraticCurveTo(482, 20, 482, 20 + r); g.lineTo(482, 180 - r);
  g.quadraticCurveTo(482, 180, 482 - r, 180); g.lineTo(290, 180); g.lineTo(240, 238); g.lineTo(236, 180); g.lineTo(30 + r, 180);
  g.quadraticCurveTo(30, 180, 30, 180 - r); g.lineTo(30, 20 + r); g.quadraticCurveTo(30, 20, 30 + r, 20); g.closePath();
  g.fill(); g.stroke();
  g.fillStyle = '#3a2a6a'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'bold 64px "Nunito", "Arial Rounded MT Bold", Arial, sans-serif';
  g.fillText(text, 256, sub ? 82 : 100);
  if (sub) { g.font = 'bold 34px "Nunito", "Arial Rounded MT Bold", Arial, sans-serif'; g.fillStyle = '#e8438c'; g.fillText(sub, 256, 142); }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

class RescueFriend extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'rescue_friend');
    this.touch = false;
    this.half.set(0.95, 0.95, 0.95);
    this.shadow = 0;
    this.name = spec.name ?? 'Krümel';
    this.radius = spec.radius ?? 2.6;
    this.doorYaw = spec.yaw ?? -Math.PI / 2;
    this.yaw = this.doorYaw;
    this.state = 'caged';
    this.stateT = 0;
    this.freed = false;
    this.bunny = { x: this.pos.x, y: this.pos.y + 0.36, z: this.pos.z, yaw: this.doorYaw, hop: 0 };
    const p = this.pos;
    this.addShape({ type: 'cyl', x: p.x, z: p.z, r: 0.95, y0: p.y, y1: p.y + 0.32, tag: 'cage-base' });
    this.barsId = this.addShape({ type: 'cyl', x: p.x, z: p.z, r: 0.78, y0: p.y, y1: p.y + 2.0, camIgnore: true, tag: 'cage' });
    if (level.view) {
      this.setModel(getModel('rescue_cage'));
      this.bunnyModel = getModel('bunny_small');
      this.bunnyModel.root.scale.setScalar(1.25);
      level.view.add(this.bunnyModel.root);
      level.view.shadows.add({ pos: this.bunnyPos = new THREE.Vector3(this.bunny.x, this.pos.y, this.bunny.z), radius: 0.32, alive: () => !this.removed, visible: () => true });
      this.bubble = null;
    }
  }

  setState(s) { this.state = s; this.stateT = 0; }

  update(dt) {
    this.stateT += dt;
    const pl = this.level.player;
    const b = this.bunny;
    switch (this.state) {
      case 'caged':
        // hoppelt aufgeregt im Käfig, sobald die Figur in Sicht ist
        b.hop = pl && Math.hypot(pl.pos.x - this.pos.x, pl.pos.z - this.pos.z) < 12 ? 1 : 0;
        if (pl && !pl.dead && Math.hypot(pl.pos.x - this.pos.x, pl.pos.z - this.pos.z) < this.radius && Math.abs(pl.pos.y - this.pos.y) < 2.5) this.open();
        break;
      case 'opening':
        if (this.stateT > 0.7) { this.setState('out'); this.level.sfx('jump'); }
        break;
      case 'out': {
        // aus der Tür heraus (1,6 m in Tür-Richtung)
        const k = Math.min(1, this.stateT / 0.9);
        const fx = Math.cos(this.doorYaw), fz = -Math.sin(this.doorYaw);
        b.x = this.pos.x + fx * 1.6 * k; b.z = this.pos.z + fz * 1.6 * k;
        b.y = this.pos.y + 0.36 * (1 - k) + Math.sin(k * Math.PI) * 0.8;
        b.hop = 1;
        if (k >= 1) { this.setState('happy'); this.level.sfx('key'); this.level.effects?.sparks({ x: b.x, y: b.y + 0.6, z: b.z }, 18); }
        break;
      }
      case 'happy': {
        b.hop = 1;
        b.y = this.pos.y + Math.abs(Math.sin(this.stateT * 6)) * 0.35;
        if (pl) b.yaw = Math.atan2(-(pl.pos.z - b.z), pl.pos.x - b.x);
        break;
      }
      default: break;
    }
  }

  open() {
    if (this.freed) return;
    this.freed = true;
    this.setState('opening');
    this.removeShapeId(this.barsId);
    this.level.sfx('gate');
    this.level.effects?.sparks({ x: this.pos.x + Math.cos(this.doorYaw) * 0.8, y: this.pos.y + 1, z: this.pos.z - Math.sin(this.doorYaw) * 0.8 }, 12);
    const hero = HERO_NAME[this.level.player?.hero] ?? 'Lotti';
    this.thanks = `Danke, ${hero}!`;
    if (this.level.view) this.showBubble(this.thanks, `– ${this.name}`);
  }

  removeShapeId(id) {
    const i = this.shapes.indexOf(id);
    if (i >= 0) { this.level.world.remove(id); this.shapes.splice(i, 1); }
  }

  showBubble(text, sub) {
    const tex = bubbleTexture(text, sub);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false });
    const sp = new THREE.Sprite(mat);
    sp.scale.set(2.6, 1.3, 1);
    sp.renderOrder = 10;
    sp.userData.owned = true;
    this.bubble = sp;
    this.bubbleT = 0;
    this.level.view.add(sp);
  }

  render(dt, t) {
    this.syncModel();
    this.model?.update(dt, { open: this.state === 'caged' ? 0 : 1 });
    const b = this.bunny;
    if (this.bunnyModel) {
      const r = this.bunnyModel.root;
      const inCage = this.state === 'caged' || this.state === 'opening';
      const hopY = inCage && b.hop ? Math.abs(Math.sin(t * 7)) * 0.18 : 0;
      r.position.set(b.x, b.y + hopY, b.z);
      r.rotation.y = b.yaw;
      this.bunnyModel.update(dt, { anim: b.hop ? 'hop' : 'idle' });
      this.bunnyPos?.set(b.x, this.pos.y, b.z);
    }
    if (this.bubble) {
      this.bubbleT += dt;
      const k = Math.min(1, this.bubbleT / 0.25);
      const fade = this.bubbleT > 5 ? Math.max(0, 1 - (this.bubbleT - 5) / 0.6) : 1;
      this.bubble.position.set(b.x, b.y + 1.9 + Math.sin(this.bubbleT * 3) * 0.05, b.z);
      this.bubble.scale.set(2.6 * k, 1.3 * k, 1);
      this.bubble.material.opacity = fade;
      if (fade <= 0) { this.level.view.remove(this.bubble); this.bubble.material.map.dispose(); this.bubble.material.dispose(); this.bubble = null; }
    }
  }

  dispose() {
    if (this.bunnyModel) { this.level.view.remove(this.bunnyModel.root); this.bunnyModel.dispose(); this.bunnyModel = null; }
    if (this.bubble) { this.level.view.remove(this.bubble); this.bubble.material.map.dispose(); this.bubble.material.dispose(); this.bubble = null; }
    super.dispose();
  }
}

export const KINDS = { rescue_friend: (level, spec) => new RescueFriend(level, spec) };
