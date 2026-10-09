// Säule der grauen Blockwand (Baustein `megawall`, blocks/types/megawall.js): 1 × h × 1 m aus grauen
// Hartstein-Blöcken. Hält Sprünge, Stampfen, Krallen und Feuer aus; nur eine Bombe (level.attackArea(pos, r,
// 'bomb'), z. B. Kickbombe) oder der Riesentrank ('mega') zerlegt sie. Kollision mit Flag breakable: 'bomb'
// (Player.land stampft sie nicht durch, der Riesentrank zertrümmert alle breakable-Formen).
//   { kind: 'megacolumn', pos: [x, y, z] (Mitte der Unterseite), height: 3, breakable: 'bomb', wall?: Gruppe }
// Darstellung: Instanzen des Modells 'mega_block' (ein Zeichenaufruf für alle Wände).

import { Gimmick } from '../gimmick.js';
import { getModel } from '../../models/index.js';

class MegaColumn extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'megacolumn');
    this.h = Math.max(1, Math.round(spec.height ?? 3));
    this.half.set(0.5, this.h / 2, 0.5);
    this.touch = false;
    this.wall = spec.wall ?? null;
    const p = this.pos;
    this.addSolid({ type: 'box', min: [p.x - 0.5, p.y, p.z - 0.5], max: [p.x + 0.5, p.y + this.h, p.z + 0.5], breakable: spec.breakable ?? 'bomb', tag: 'megawall' });
    this.pool = level.view?.pool('mega_block', () => getModel('mega_block').root, { castShadow: true, capacity: 32 }) ?? null;
    this.idx = [];
    if (this.pool) for (let i = 0; i < this.h; i++) this.idx.push(this.pool.alloc());
    this.drawn = false;
    this.render();
  }

  onHit(kind) {
    if (kind !== 'bomb' && kind !== 'mega') {
      if (kind === 'pound' || kind === 'claw' || kind === 'fire') this.level.sfx('blockhit');
      return;
    }
    this.crumble();
  }

  crumble() {
    if (!this.alive || this.hidden) return;
    this.removeShapes();
    for (let i = 0; i < this.h; i++) this.level.effects?.debris({ x: this.pos.x, y: this.pos.y + i + 0.2, z: this.pos.z }, 0x9a9eae, 4);
    this.level.effects?.dust(this.pos, 6, 1.6);
    this.level.sfx('brickbreak');
    this.level.shake(0.3);
    this.kill();
    this.wall?.onColumnBroken?.(this);
  }

  render() {
    if (!this.pool) return;
    if (this.hidden) { if (this.drawn) { for (const i of this.idx) this.pool.hide(i); this.drawn = false; } return; }
    if (this.drawn) return; // statisch
    this.idx.forEach((i, k) => this.pool.set(i, this.pos.x, this.pos.y + k, this.pos.z, 0, 1));
    this.drawn = true;
  }

  dispose() {
    if (this.pool) for (const i of this.idx) this.pool.release(i);
    this.idx = [];
    super.dispose();
  }
}

export const KINDS = { megacolumn: (level, spec) => new MegaColumn(level, spec) };
