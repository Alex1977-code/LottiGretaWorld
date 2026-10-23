// Hüpfqualle (3-Zug: hüpft im Takt über die Waggons).
//
// Rosa Glocke auf vier Bandfüßchen. Hüpft im festen Takt (alle Quallen eines Levels mit gleichem period springen
// gleichzeitig – Takt aus der Level-Uhr, phase verschiebt): ducken (0,14 s) → Sprung (height m hoch, hop m weit in
// Laufrichtung bzw. zur nächsten Figur) → landen (0,1 s) → warten. Auf fahrenden Waggons (attach/mover) fährt sie mit.
// Draufspringen besiegt sie (platt, Abprall), ebenso Stampfen, Feuer, Krallen, Panzer, Wurf, Rutschen,
// Schwanzhieb, Kanonenkugel, Explosion, Riesentrank, Funkelstern. Seitliche Berührung verletzt.
//
// Daten: { kind: 'huepfqualle', pos, period?: 1.2 s, phase?: 0..1, height?: 1.4 m, hop?: 0 m (0 = auf der Stelle;
//          mit dir/path: Weite je Sprung, Standard dann 1.2), behavior?: 'hop' | 'chase' (springt zur nächsten
//          Figur in sight m), sight?: 7, dir?, path?, edges?: true (springt nicht über Kanten), wake?, drop? }
//   Beispiel: { kind: 'huepfqualle', pos: [0, 2.4, -30], period: 1.0, behavior: 'chase' }
// Zustände: idle → crouch → air → land → idle …; squashed | flipped. Laufzeit: hops.
// Modell 'huepfqualle' (state { anim: idle|hop|squashed, progress } – progress 0..0,2 ducken, ..0,85 Flug, ..1 landen).

import { EnemyW2, activeFigure } from '../EnemyW2.js';
import { getModel } from '../../models/index.js';

const CROUCH = 0.14, LAND = 0.1, G = 40;

class Huepfqualle extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'huepfqualle');
    this.half.set(0.38, 0.4, 0.38);
    this.shadow = 0.42;
    this.period = Math.max(0.6, spec.period ?? 1.2);
    this.phase = spec.phase ?? 0;
    this.height = spec.height ?? 1.4;
    const moving = !!(spec.path || spec.dir !== undefined || spec.yaw !== undefined);
    this.hopDist = spec.hop ?? (moving ? 1.2 : 0);
    this.behavior = spec.behavior ?? 'hop';
    this.sight = spec.sight ?? 7;
    this.hops = 0;
    this.beat = this.beatNow();
    this.airT = 0;
    this.flight = (2 * Math.sqrt(2 * this.height / G));
    this.state = 'idle';
    this.hopDir = { x: this.dir.x, z: this.dir.z };
    if (level.view) this.setModel(getModel('huepfqualle'));
    this.initShadows(1);
  }

  beatNow() { return Math.floor(this.level.time / this.period + this.phase); }

  update(dt) {
    this.stateT += dt;
    if (this.updateDefeat(dt)) return;
    switch (this.state) {
      case 'idle': {
        this.stand(dt);
        const b = this.beatNow();
        if (b !== this.beat) {
          this.beat = b;
          const awake = !this.level.player || this.playerDist() < this.wake;
          if (awake && this.grounded) this.setState('crouch');
        }
        break;
      }
      case 'crouch':
        this.stand(dt);
        if (this.stateT >= CROUCH) this.launch();
        break;
      case 'air':
        this.airT += dt;
        this.moveWithGravity(dt, { gravity: G });
        if (this.grounded && this.airT > 0.05) { this.setState('land'); this.level.effects?.dust(this.pos, 2, 0.5); }
        break;
      case 'land':
        this.stand(dt);
        if (this.stateT >= LAND) { this.setState('idle'); this.beat = this.beatNow(); }
        break;
      default: break;
    }
  }

  launch() {
    let dx = 0, dz = 0, dist = this.hopDist;
    if (this.behavior === 'chase' && activeFigure(this.player) && this.canSee(this.sight, 3)) {
      const t = this.toPlayer(this._tp ?? (this._tp = {}));
      dx = t.x; dz = t.z; dist = Math.min(Math.max(this.hopDist, 1.2), t.d);
    } else if (dist > 0) {
      if (this.path) this.followPath();
      dx = this.dir.x; dz = this.dir.z;
      // Kante voraus: umdrehen statt hinunterzuspringen
      if (this.edges && !this.groundAhead(dx, dz, dist, 1.4)) { this.turn(); dx = this.dir.x; dz = this.dir.z; }
    }
    const v = dist / this.flight;
    this.vel.set(dx * v, Math.sqrt(2 * G * this.height), dz * v);
    if (dx || dz) this.yaw = Math.atan2(-dz, dx);
    this.grounded = false;
    this.airT = 0;
    this.hops++;
    this.setState('air');
  }

  onStomp() { if (!this.defeated) { this.squash(0.7); this.vel.set(0, 0, 0); } }

  onHit(kind, source) {
    if (this.defeated || kind === 'bump') return;
    if (kind === 'pound') {
      if (source?.pos && Math.abs(source.pos.y - this.pos.y) < 0.6) { this.squash(0.7); this.level.sfx('stomp'); }
      return;
    }
    this.flip(source);
  }

  /** Fortschritt im Hüpfzyklus des Modells (0..0,2 ducken, ..0,85 Flug, ..1 landen). */
  progress() {
    const s = this.state;
    if (s === 'crouch') return Math.min(1, this.stateT / CROUCH) * 0.2;
    if (s === 'air') return 0.2 + Math.min(1, this.airT / this.flight) * 0.65;
    if (s === 'land') return 0.85 + Math.min(1, this.stateT / LAND) * 0.15;
    return 0;
  }

  modelState() {
    const s = this.state;
    if (s === 'squashed' || s === 'flipped') return { anim: 'squashed' };
    if (s === 'crouch' || s === 'air' || s === 'land') return { anim: 'hop', progress: this.progress() };
    return { anim: 'idle' };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    const r = this.model.root;
    // das Modell hebt die Glocke im Flug selbst um bis zu 0,5 m – die echte Flugbahn kommt aus der Simulation
    if (this.state === 'air') { const k = Math.min(1, this.airT / this.flight); r.position.y -= Math.sin(k * Math.PI) * 0.5; }
    r.rotation.z = this.state === 'flipped' ? Math.PI : 0;
  }

  info() { return { state: this.state, hops: this.hops, y: +this.pos.y.toFixed(2), x: +this.pos.x.toFixed(2), z: +this.pos.z.toFixed(2), defeated: this.defeated }; }
}

export const KINDS = { huepfqualle: (level, spec) => new Huepfqualle(level, spec) };
