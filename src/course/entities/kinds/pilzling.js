// Referenzgegner Pilzling (Muster für Gegner): läuft geradeaus oder patrouilliert zwischen Wegpunkten, dreht an
// Kanten und Wänden um. Draufspringen besiegt ihn (platt), seitliche Berührung verletzt die Figur. Stampfattacke,
// Krallen, Feuer, Panzer, Explosion, Riesentrank, Funkelstern besiegen ihn ebenfalls.
//
// Daten: { kind: 'pilzling', pos: [x, y, z],
//          path?: [[x,y,z], …]       Patrouille zwischen den Punkten (sonst geradeaus in dir), loop?: true = Runde
//          dir?: [dx, dz] | yaw (rad) Laufrichtung (Standard: zur Kamera, +Z)
//          speed?: 1.6 m/s, edges?: true (an Kanten umdrehen), wake?: 18 m (erst ab dieser Nähe zur Figur aktiv)
//          behavior?: 'walk' (Standard) | 'patrol' (= walk mit path) | 'chase'
//          sight?: 7 m (chase: ab dieser Nähe bemerkt er die Figur), chaseSpeed?: 2.6 m/s, drop? (siehe Enemy.js) }
//
// Zustandsautomat: idle (schläft außer Reichweite) → walk → [chase: alert (0,5 s Hüpfer mit „!“) → chase (verfolgt,
// bleibt an Kanten stehen; verliert die Figur ab 1,8 × sight → walk)] → squashed (0,6 s platt, dann weg) |
// flipped (fliegt weg). Modell 'pilzling' (state { anim: 'walk'|'idle'|'squashed'|'stunned'|'alert', speed }).

import { Enemy } from '../Enemy.js';
import { getModel } from '../../models/index.js';

class Pilzling extends Enemy {
  constructor(level, spec) {
    super(level, spec, 'pilzling');
    this.half.set(0.42, 0.42, 0.42);
    this.shadow = 0.5;
    this.speed = spec.speed ?? 1.6;
    this.behavior = spec.behavior ?? (spec.chase ? 'chase' : 'walk');
    this.sight = spec.sight ?? 7;
    this.chaseSpeed = spec.chaseSpeed ?? 2.6;
    if (level.view) this.setModel(getModel('pilzling', { size: [0.9, 0.85, 0.9] }));
  }

  update(dt) {
    this.stateT += dt;
    if (this.updateDefeat(dt)) return;
    switch (this.state) {
      case 'idle':
        if (!this.level.player || this.playerDist() < this.wake) this.setState('walk');
        this.stand(dt);
        break;
      case 'walk':
        this.walk(dt, this.speed);
        if (this.behavior === 'chase' && this.grounded && this.canSee(this.sight, 2)) {
          this.setState('alert');
          this.vel.y = 4.5; // kleiner Hüpfer
          this.grounded = false;
        }
        break;
      case 'alert':
        this.facePlayer(dt, 14);
        this.stand(dt);
        if (this.stateT > 0.5 && this.grounded) this.setState('chase');
        break;
      case 'chase':
        this.chase(dt, this.chaseSpeed);
        if (!this.canSee(this.sight * 1.8, 3.5)) { this.setState('walk'); this.turnCooldown = 0.3; }
        break;
      default: break;
    }
  }

  modelState() {
    const s = this.state;
    const anim = s === 'walk' || s === 'chase' ? 'walk' : s === 'squashed' ? 'squashed' : s === 'flipped' ? 'stunned' : s === 'alert' ? 'alert' : 'idle';
    return { anim, speed: s === 'walk' ? this.speed : s === 'chase' ? this.chaseSpeed : 0 };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    const r = this.model.root;
    // Rückfall-Optik für Platzhalter: platt drücken bzw. umdrehen
    if (this.model.placeholder) {
      r.scale.set(1, this.state === 'squashed' ? 0.25 : 1, 1);
      r.rotation.z = this.state === 'flipped' ? Math.PI : 0;
    }
  }
}

export const KINDS = { pilzling: (level, spec) => new Pilzling(level, spec) };
