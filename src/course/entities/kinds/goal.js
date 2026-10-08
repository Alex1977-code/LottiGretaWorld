// Zielmast: Sockelblock (1 m, fest) und Mast. Greift die Figur den Mast, zählt die Greifhöhe (0..1 über dem
// Sockel → Punkte, Spitze → Extraleben), die Figur rutscht hinunter, Siegespose, dann Ergebnis.
// Modell 'goal_pole' (state { flag: 0..1 Fahnenhöhe, grabbed }) oder eigener Rückfall.
//   { pos: [x, y, z] (Fußpunkt des Sockels), height: 9 (Mast über dem Sockel), yaw?: Seite der Figur }

import { CourseEntity } from '../CourseEntity.js';
import { goalModel } from '../visuals.js';

class Goal extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'goal');
    this.H = spec.height ?? 9;
    // Berührbereich: Mast über dem Sockel (+ etwas Spielraum)
    this.half.set(0.55, this.H / 2 + 0.3, 0.55);
    this.baseTop = this.pos.y + 1;
    this.flag = 1;
    this.grabbed = false;
    this.addShape({ type: 'box', min: [this.pos.x - 0.5, this.pos.y, this.pos.z - 0.5], max: [this.pos.x + 0.5, this.baseTop, this.pos.z + 0.5], tag: 'goalbase' });
    if (level.view) this.setModel(goalModel({ height: this.H }));
  }

  center(out = this._c) { return out.set(this.pos.x, this.baseTop + this.half.y - 0.3, this.pos.z); }

  update(dt) {
    if (this.grabbed && this.flag > 0) this.flag = Math.max(0, this.flag - dt * 0.9);
  }

  onPlayer(player) {
    if (this.grabbed || player.dead) return 'none';
    const frac = (player.pos.y + player.half.y - this.baseTop) / this.H;
    if (!this.level.runtime.reachGoal(frac)) return 'none';
    this.grabbed = true;
    this.touch = false;
    player.grabPole({ poleX: this.pos.x, poleZ: this.pos.z, baseY: this.baseTop, yaw: 0 });
    this.level.effects?.sparks({ x: this.pos.x, y: player.pos.y + 1, z: this.pos.z }, 18);
    return 'none';
  }

  modelState() { return { flag: this.flag, grabbed: this.grabbed }; }
}

export const KINDS = { goal: (level, spec) => new Goal(level, spec) };
