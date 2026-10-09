// Deko mit Leben (Sonder-Bausteine).
//
// spotter – Waldkobold mit Fernglas (1-3 „Feenwesen mit Ferngläsern in Bäumen“): reine Deko, keine Berührung.
//   Dreht sich zur Figur, schaut durchs Fernglas, sobald sie in Reichweite ist, und jubelt, wenn sie nah ist.
//   { kind: 'spotter', pos: [x, y, z] (Fußpunkt, z. B. auf einem Ast/einer Plattform), yaw (Ruhe-Blickrichtung,
//     Standard −π/2 = zur Kamera), range: 16 (m), cheer: 3 (m), scale: 1 }
//   Beispiel: { kind: 'spotter', pos: [-7, 4.2, -6] }
//
// pixelegg – Easter-Egg (1-Burg): Pixel-Relief der Heldin erscheint an einer Wand, wenn die Figur im Auslöse-
//   bereich `wait` Sekunden still steht (am Boden, kaum Bewegung). Einmalig, mit kleiner Belohnung.
//   { kind: 'pixelegg', pos: [x, y, z] (Mitte der Unterkante, an der Wandfläche), yaw (Blickrichtung des Reliefs,
//     Standard −π/2 = zur Kamera), trigger: { pos: [x, y, z], r: 2.5 } (Standard: 3 m vor dem Relief),
//     wait: 4 (s), hero: 'lotti' | 'greta' (Standard die gespielte Heldin), reward: Aktion (Standard 10 Münzen), id? }
//   Beispiel: { kind: 'pixelegg', pos: [0, 6, -12.4], trigger: { pos: [0, 6, -11], r: 2 }, wait: 4 }
// Modelle 'fairy_spotter', 'pixel_egg' (models/kinds/gimmicks.js).

import { Gimmick, runAction, visDt } from '../gimmick.js';
import { getModel } from '../../models/index.js';

class Spotter extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'spotter');
    this.touch = false;
    this.restYaw = spec.yaw ?? -Math.PI / 2;
    this.yaw = this.restYaw;
    this.range = spec.range ?? 16;
    this.cheerR = spec.cheer ?? 3;
    this.baseScale = spec.scale ?? 1;
    this.anim = 'idle';
    if (level.view) this.setModel(getModel('fairy_spotter'));
  }

  update(dt) {
    const p = this.level.player;
    let want = this.restYaw;
    this.anim = 'idle';
    if (p && !p.dead) {
      const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z, d = Math.hypot(dx, dz, p.pos.y - this.pos.y);
      if (d < this.range) {
        want = Math.atan2(-dz, dx);
        this.anim = d < this.cheerR ? 'cheer' : 'look';
      }
    }
    let d = want - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * Math.min(1, dt * 3);
  }

  modelState() { return { anim: this.anim }; }
}

class PixelEgg extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'pixelegg');
    this.touch = false;
    this.yaw = spec.yaw ?? -Math.PI / 2;
    const f = { x: Math.cos(this.yaw), z: -Math.sin(this.yaw) };
    const t = spec.trigger ?? {};
    this.trig = { p: t.pos ?? [this.pos.x + f.x * 3, this.pos.y, this.pos.z + f.z * 3], r: t.r ?? 2.5 };
    this.wait = spec.wait ?? 4;
    this.still = 0;
    this.appear = 0;
    this.shown = false;
    this.reward = spec.reward ?? { coins: 10 };
    this.hero = spec.hero ?? null;
    this.builtFor = null;
  }

  update(dt) {
    if (this.shown) { this.appear = Math.min(1, this.appear + dt / 1.2); return; }
    const p = this.level.player;
    if (!p || p.dead) return;
    const inside = Math.hypot(p.pos.x - this.trig.p[0], p.pos.z - this.trig.p[2]) <= this.trig.r && Math.abs(p.pos.y - this.trig.p[1]) < 1.5;
    if (inside && p.mode === 'ground' && p.hSpeed() < 0.4) this.still += dt; else this.still = 0;
    if (this.still >= this.wait) {
      this.shown = true;
      this.level.sfx('key');
      this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 1.8, z: this.pos.z }, 24);
      runAction(this.level, this.reward, { pos: [this.trig.p[0], this.trig.p[1], this.trig.p[2]], source: this });
    }
  }

  render(dt, t) {
    if (!this.level.view) return;
    if (this.appear <= 0) { if (this.model) this.model.root.visible = false; return; }
    const hero = this.hero ?? this.level.player?.hero ?? 'lotti';
    if (!this.model || this.builtFor !== hero) { this.builtFor = hero; this.setModel(getModel('pixel_egg', { hero })); }
    this.syncModel();
    this.model.root.visible = true;
    this.model.update?.(visDt(this.level, this, dt), { appear: this.appear });
  }
}

export const KINDS = {
  spotter: (level, spec) => new Spotter(level, spec),
  pixelegg: (level, spec) => new PixelEgg(level, spec),
};
