// Baum mit Versteck (Sonder-Baustein, Bauplan 1-1 „Krallen-Anzug in einem Baum“): Berührt die Figur den Baum
// (dagegen laufen, in die Krone springen, Tatzenhieb, Stampfen daneben), wackelt die Krone und der Inhalt fällt
// heraus (einmal; danach wackelt er nur noch). Stamm ist fest (Zylinder).
//   { kind: 'itemtree', pos: [x, y, z] (Fußpunkt), size: 4.5 (Höhe), color: 'green' | 'autumn',
//     content: 'krallen' (Standard) | Power-up-Name | 'coins:5' | 'star:2' | Aktion (entities/gimmick.js), id? }
//   Beispiel: { kind: 'itemtree', pos: [-6, 0, -62], content: 'krallenAnzug' }
// Modell 'item_tree' (state { shake }).

import { Gimmick, contentAction, runAction } from '../gimmick.js';
import { getModel } from '../../models/index.js';

class ItemTree extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'itemtree');
    const h = spec.size ?? 4.5;
    this.h = h;
    this.trunkH = h * 0.42;
    this.R = h * 0.26;
    this.half.set(this.R * 0.85, h / 2, this.R * 0.85);
    this.content = contentAction(spec.content ?? 'krallen', null);
    const p = this.pos;
    this.addSolid({ type: 'cyl', x: p.x, z: p.z, r: Math.max(0.3, 0.09 * h * 1.1), y0: p.y, y1: p.y + this.trunkH + this.R * 0.6, tag: 'itemtree' });
    this.shake = 0;
    this.given = false;
    this.drop = null;
    if (level.view) this.setModel(getModel('item_tree', { size: h, color: spec.color ?? 'green' }));
  }

  onPlayer() { this.rustle(); return 'none'; }
  onHit(kind) { if (kind === 'claw' || kind === 'pound' || kind === 'mega' || kind === 'fire' || kind === 'bomb') this.rustle(); }

  rustle() {
    if (this.shake > 0.3) return;
    this.shake = 1;
    this.level.sfx('bounce');
    if (this.given || !this.content) return;
    this.given = true;
    // Inhalt fällt aus der Krone (Power-ups ohne eigene Schwerkraft werden hier hinabgeführt)
    const p = this.level.player;
    let ox = 0, oz = 1;
    if (p) { const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z, l = Math.hypot(dx, dz) || 1; ox = dx / l; oz = dz / l; }
    const x = this.pos.x + ox * (this.R * 0.9 + 0.3), z = this.pos.z + oz * (this.R * 0.9 + 0.3), y = this.pos.y + this.trunkH + this.R * 0.6;
    const c = this.content;
    if (c.power) {
      const e = this.level.spawn('powerup', { pos: [x, y, z], power: c.power, dir: [ox, oz] });
      if (e) this.drop = { e, vy: 0, floor: this.level.world.raycastDown(x, y, z, 30)?.y ?? this.pos.y };
      this.level.sfx('powerup_appear');
    } else runAction(this.level, c, { pos: [x, this.pos.y, z], source: this });
  }

  update(dt) {
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 1.6);
    const d = this.drop;
    if (d && d.e.alive && !d.e.walk) {
      d.vy -= 20 * dt;
      d.e.pos.y = Math.max(d.floor, d.e.pos.y + d.vy * dt);
      if (d.e.pos.y <= d.floor) this.drop = null;
    } else this.drop = null;
  }

  modelState() { return { shake: this.shake }; }
}

export const KINDS = { itemtree: (level, spec) => new ItemTree(level, spec) };
