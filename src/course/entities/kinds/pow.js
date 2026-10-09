// POW-Block („Wumm-Block“, Bauplan 1-3): Draufspringen, Kopfstoß von unten oder Stampfen löst eine Erschütterung
// aus: Gegner am Boden im Umkreis werden besiegt (onHit('bump', pow) – fliegende Gegner mit `flying = true`
// bleiben verschont), Ziegel und Holzkisten im Umkreis zerbrechen (onHit('pound')). Danach ist er etwas flacher;
// nach `uses` Benutzungen verschwindet er. Kamera wackelt.
//
//   { kind: 'pow', pos: [x, y, z] (Mitte der Unterseite), uses: 3, radius: 8 (m, Wirkung waagerecht),
//     height: 3 (m, senkrechte Reichweite über/unter dem Block), onUse?: Aktion je Benutzung, id?, hidden? }
//   Beispiel: { kind: 'pow', pos: [2, 4, -60], uses: 3, radius: 9 }  (Ziegel um eine Warp-Röhre, 1-3 POW-Hang)
// Modell 'pow_block' (state { anim: 'idle'|'hit', uses, n }). Kollision: Quader, Höhe schrumpft mit den Benutzungen.

import { Gimmick, playerOn, runAction } from '../gimmick.js';
import { getModel } from '../../models/index.js';

const heightFor = (uses) => (uses <= 0 ? 0 : 0.45 + (uses / 3) * 0.55);

class Pow extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'pow');
    this.uses = spec.uses ?? 3;
    this.radius = spec.radius ?? 8;
    this.reachY = spec.height ?? 3;
    this.half.set(0.5, 0.5, 0.5);
    this.touch = false;
    const p = this.pos;
    this.shape = this.addSolid({ type: 'box', min: [p.x - 0.5, p.y, p.z - 0.5], max: [p.x + 0.5, p.y + heightFor(this.uses), p.z + 0.5], tag: 'pow' });
    this.cool = 0;
    this.wasOn = false;
    this.n = 0;
    this.anim = 'idle';
    this.goneT = -1;
    if (level.view) this.setModel(getModel('pow_block'));
  }

  update(dt) {
    if (this.cool > 0) this.cool -= dt;
    if (this.goneT >= 0) { this.goneT += dt; if (this.goneT > 0.6) this.kill(); return; }
    // Draufspringen: Landung auf dem Block
    const on = playerOn(this.level, this);
    if (on && !this.wasOn && this.level.player.lastLandVy < -2) this.fire();
    this.wasOn = on;
  }

  onBump() { this.fire(); }
  onPound() { this.fire(); }
  onHit(kind) { if (kind === 'mega' || kind === 'bomb' || kind === 'shell' || kind === 'fire') this.fire(); }

  fire() {
    if (this.cool > 0 || this.uses <= 0 || this.hidden) return;
    this.cool = 0.35;
    this.uses--;
    this.n++;
    this.anim = 'hit';
    const lv = this.level;
    lv.shake(0.6);
    lv.sfx('slam');
    lv.effects?.ring(this.pos, 3);
    const R2 = this.radius * this.radius;
    for (const e of lv.entities) {
      if (!e.alive || e === this) continue;
      const dx = e.pos.x - this.pos.x, dz = e.pos.z - this.pos.z;
      if (dx * dx + dz * dz > R2 || Math.abs(e.pos.y - this.pos.y) > this.reachY) continue;
      if (e.enemy) { if (!e.flying) e.onHit?.('bump', this); }
      else if (e.kind === 'brick') e.onHit?.('pound', this);
      else if (e.kind === 'crate') e.onHit?.('pow', this);
    }
    runAction(lv, this.spec.onUse, { pos: [this.pos.x, this.pos.y + 1, this.pos.z], source: this });
    // Höhe anpassen bzw. verschwinden
    const s = this.shape;
    if (this.uses <= 0) { this.removeShapes(); this.goneT = 0; }
    else { s.max = [s.x0 + 1, this.pos.y + heightFor(this.uses), s.z0 + 1]; s.min = [s.x0, this.pos.y, s.z0]; if (s.id) lv.world.update(s.id); }
  }

  modelState() { return { anim: this.anim, uses: this.uses, n: this.n }; }
}

export const KINDS = { pow: (level, spec) => new Pow(level, spec) };
