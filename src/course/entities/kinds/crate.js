// Holzkiste und Schatztruhe (Sonder-Bausteine, Bauplan 1-1 Tunnel mit Holzkisten, 1-5 Kistenraum).
//
// crate – Holzkiste, fest (man kann draufstehen). Zerbricht durch Funkenblüte (onHit 'fire'), Tatzenhieb/Sturzflug
//   ('claw'), Stampfattacke von oben ('pound'), Riesentrank ('mega'), Bombe ('bomb'), POW-Block, Panzer ('shell').
//   Kopfstoß von unten lässt sie nur wackeln. Inhalt erscheint beim Zerbrechen. Ohne Halt (z. B. auf einer
//   zerbrochenen Kiste gestapelt) fällt sie herunter. Stampfen wirkt nur direkt von oben (nicht die Druckwelle).
//   { kind: 'crate', pos: [x, y, z] (Mitte der Unterseite), size: 1 (Kantenlänge),
//     content: 'coin' (Standard) | 'coins:3' | 'star:1' | Power-up-Name | 'none' | Aktion (entities/gimmick.js),
//     hidden?, id? }
//   Beispiel: { kind: 'crate', pos: [-4, 0, -60], content: 'star:1' }   (Stern 2 im Kistenraum 1-5)
//
// chest – Schatztruhe: Berühren öffnet den Deckel, der Inhalt springt heraus (einmal). Fest wie eine Kiste.
//   { kind: 'chest', pos, yaw (Vorderseite, Standard −π/2 = zur Kamera/+Z), content: wie crate (Standard 'coins:5'),
//     hidden: true + id → erscheint per Signal (z. B. Kipp-Schaltfelder onAll: { reveal: 'truhe1' }) }
//   Beispiel: { kind: 'chest', id: 'truhe1', hidden: true, pos: [0, 1, -30], content: { star: 0 } }
// Modelle 'crate', 'chest' (models/kinds/gimmicks.js).

import { Gimmick, contentAction, runAction } from '../gimmick.js';
import { getModel } from '../../models/index.js';

const BREAKERS = new Set(['fire', 'claw', 'pound', 'mega', 'bomb', 'shell', 'star', 'pow']);

class Crate extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'crate');
    const s = spec.size ?? 1;
    this.size = s;
    this.half.set(s / 2, s / 2, s / 2);
    this.touch = false;
    this.content = contentAction(spec.content, { coins: 1 });
    const p = this.pos;
    this.addSolid({ type: 'box', min: [p.x - s / 2, p.y, p.z - s / 2], max: [p.x + s / 2, p.y + s, p.z + s / 2], breakable: true, tag: 'crate' });
    this.anim = 'idle';
    this.n = 0;
    this.vy = 0;
    if (level.view) this.setModel(getModel('crate', { size: s }));
  }

  onBump() { this.anim = 'bump'; this.n++; this.level.sfx('blockhit'); }

  onHit(kind, source) {
    if (!BREAKERS.has(kind)) return;
    // Stampfen: nur wer von oben auf der Kiste landet (nicht die Druckwelle daneben)
    if (kind === 'pound' && source?.pos && !(source.pos.y >= this.pos.y + this.size - 0.35 && Math.abs(source.pos.x - this.pos.x) < this.size / 2 + 0.35 && Math.abs(source.pos.z - this.pos.z) < this.size / 2 + 0.35)) return;
    this.smash();
  }

  /** Höchste Oberfläche unter der Kiste (ohne sie selbst). */
  supportY() {
    const k = this.size * 0.35, w = this.level.world;
    let best = null;
    for (const [ox, oz] of [[0, 0], [-k, -k], [k, -k], [-k, k], [k, k]]) {
      const h = w.raycastDown(this.pos.x + ox, this.pos.y + 0.01, this.pos.z + oz, 40, { ignore: (sh) => sh.owner === this });
      if (h && (best === null || h.y > best)) best = h.y;
    }
    return best;
  }

  update(dt) {
    if (this.hidden || !this.alive) return;
    const top = this.supportY();
    if (top !== null && top >= this.pos.y - 0.005 && this.vy === 0) return;
    this.vy = Math.max(-20, this.vy - 30 * dt);
    let ny = this.pos.y + this.vy * dt;
    if (top !== null && ny <= top) { ny = top; this.vy = 0; }
    this.pos.y = ny;
    const sh = this.solids[0];
    sh.min[1] = ny; sh.max[1] = ny + this.size;
    if (this.shapes[0]) this.level.world.update(this.shapes[0]);
    if (ny < this.level.killY) this.kill();
  }

  smash() {
    if (!this.alive || this.hidden) return;
    this.removeShapes();
    const c = { x: this.pos.x, y: this.pos.y + this.size * 0.5, z: this.pos.z };
    this.level.effects?.debris(c, 0xd99a50, 8);
    this.level.effects?.dust(this.pos, 5);
    this.level.sfx('brickbreak');
    runAction(this.level, this.content, { pos: [c.x, this.pos.y + 0.1, c.z], source: this });
    this.kill();
  }

  modelState() { return { anim: this.anim, n: this.n }; }
}

class Chest extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'chest');
    this.yaw = spec.yaw ?? -Math.PI / 2;
    this.half.set(0.75, 0.55, 0.75);
    this.content = contentAction(spec.content, { coins: 5 });
    const p = this.pos;
    this.addSolid({ type: 'box', min: [p.x - 0.5, p.y, p.z - 0.5], max: [p.x + 0.5, p.y + 0.9, p.z + 0.5], tag: 'chest' });
    this.open = false;
    this.openT = 0;
    if (level.view) this.setModel(getModel('chest'));
  }

  onPlayer() {
    if (!this.open) this.unlock();
    return 'none';
  }

  onHit(kind) { if (BREAKERS.has(kind)) this.unlock(); }

  unlock() {
    if (this.open || this.hidden) return;
    this.open = true;
    this.openT = 0;
    this.level.sfx('key');
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 1, z: this.pos.z }, 14);
  }

  update(dt) {
    if (!this.open || this.given) return;
    this.openT += dt;
    if (this.openT > 0.35) {
      this.given = true;
      // vor die Truhe (zur Figur hin), damit Power-ups nicht in der Truhe stecken
      const f = { x: Math.cos(this.yaw), z: -Math.sin(this.yaw) };
      runAction(this.level, this.content, { pos: [this.pos.x + f.x * 1.1, this.pos.y + 0.05, this.pos.z + f.z * 1.1], source: this });
    }
  }

  modelState() { return { anim: this.open ? 'open' : 'closed' }; }
}

export const KINDS = {
  crate: (level, spec) => new Crate(level, spec),
  chest: (level, spec) => new Chest(level, spec),
};
