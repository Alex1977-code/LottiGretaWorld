// Checkpoint-Fahne: Berühren aktiviert sie (Neustart nach einem Tod hier). Modell 'checkpoint_flag'
// (state { active }) oder eigener Rückfall.
//   { pos: [x, y, z] (Fußpunkt), yaw?: Blickrichtung beim Neustart (Standard π/2 = nach −Z) }

import { CourseEntity } from '../CourseEntity.js';
import { checkpointModel } from '../visuals.js';

class Checkpoint extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'checkpoint');
    this.half.set(0.7, 1.3, 0.7);
    this.active = false;
    this.respawnYaw = spec.yaw ?? Math.PI / 2;
    if (level.view) this.setModel(checkpointModel());
  }

  onPlayer() {
    if (!this.active) {
      this.active = true;
      this.level.runtime.setCheckpoint([this.pos.x, this.pos.y + 0.05, this.pos.z + 0.6], this.respawnYaw);
      this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 2.2, z: this.pos.z }, 14);
      for (const e of this.level.entities) if (e !== this && e.kind === 'checkpoint') e.active = false;
    }
    return 'none';
  }

  modelState() { return { active: this.active }; }
}

export const KINDS = { checkpoint: (level, spec) => new Checkpoint(level, spec) };
