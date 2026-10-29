// Tintling – Gegner der Bonuswelten (S-7 Unterwasser mit Strömungen, B-7 Kanonen-Helme unter Wasser). Eigene Figur: Tintenfisch-
// Dame in Bonbonrosa (Modell 'tintling', Mantel nach oben).
//
// Verhalten: schwebt im Wasser an seinem Platz (wiegt sich). Kommt eine Figur näher als sight m, **schwimmt er in Stößen auf sie
//   zu**: je Stoß (pulse s) zieht er sich zusammen (0,4 · pulse, sinkt ein wenig – Vorwarnung) und schießt dann mit speed m/s
//   los – **im Zickzack** (jeder Stoß abwechselnd zig · quer zur Richtung auf die Figur, dazu steigt/sinkt er auf ihre Höhe),
//   gleitet aus. Nach strokes Stößen (bzw. ist er der Figur näher als 1,2 m) **weicht er zurück** (back s, halbes Tempo, kleines
//   Tintenwölkchen) und beginnt von vorn. Ohne Figur in Sicht kehrt er zu seinem Platz zurück; range m (Leine um den Platz,
//   0 = frei) hält ihn in seinem Revier. Er bleibt im Wasser (Oberfläche − 0,3 m; ohne Wasser schwebt er wie in der Luft) und
//   stößt sich an Wänden und am Boden ab. Strömungen (level.currentAt) treiben ihn mit (× drift).
// Konter: **Kontakt verletzt** (seitlich und von unten). **Besiegt: Draufspringen/Stampfen von oben** (auch schwimmend von oben
//   auf ihn), Feuer, Tatze, Wurfsichel, Panzer, Wurf, Kanonenkugel (Kanonen-Helm), Explosion, Riese, Stern, Rutschen.
// Daten: { kind: 'tintling', pos (Fußpunkt = Armspitzen), sight?: 9, speed?: 4.2 (m/s je Stoß), pulse?: 1.1 (s je Stoß),
//          zig?: 0.65 (Zickzack-Anteil quer), strokes?: 3, back?: 1.6 (s Zurückweichen), range?: 8 (Leine, 0 = frei),
//          drift?: 0.6 (Strömung), phase?: 0..1 (Vorlauf im Stoß-Takt), drop?, id? }
//   Beispiel: { kind: 'tintling', pos: [0, -4, -60], sight: 8 }
// Zustände: idle → chase (Stöße) → retreat → chase … | home (zurück zum Platz) | defeated (1 s: dreht sich, sinkt) → weg.
//   Laufzeit: strokes (Stöße gesamt), retreats, side (±1, Zickzack-Seite des letzten Stoßes), inWater, info().
// Sound: 'swim' (Stoß), 'splash' (Tinte), 'stomp'.

import * as THREE from 'three';
import { EnemyW2, activeFigure, clamp } from '../EnemyW2.js';
import { getModel } from '../../models/index.js';
import { POWER_HIT, isSichel } from '../bonushelp.js';

const CONTRACT = 0.4, DEFEAT = 1.0;

class Tintling extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'tintling');
    this.half.set(0.32, 0.62, 0.32);
    this.shadow = 0;
    this.wake = 0;
    this.edges = false;
    this.home = this.pos.clone();
    this.sight = spec.sight ?? 9;
    this.speed = spec.speed ?? 4.2;
    this.pulseT = spec.pulse ?? 1.1;
    this.zig = spec.zig ?? 0.65;
    this.maxStrokes = spec.strokes ?? 3;
    this.backT = spec.back ?? 1.6;
    this.range = spec.range ?? 8;
    this.drift = spec.drift ?? 0.6;
    this.clock = (((spec.phase ?? 0) % 1) + 1) % 1 * this.pulseT;
    this.strokes = 0;
    this.leg = 0;
    this.retreats = 0;
    this.side = 1;
    this.inWater = false;
    this.state = 'idle';
    this._cur = { x: 0, y: 0, z: 0 };
    this._c = new THREE.Vector3();
    if (level.view) { this.setModel(getModel('tintling')); this.initShadows(2); }
  }

  /** Wasserform am Körper (bzw. um den Platz) → Oberfläche | null. */
  waterTop() {
    const w = this.level.waterAt?.(this.pos.x, this.pos.y + this.half.y, this.pos.z);
    this.inWater = !!w;
    return w ? w.top : null;
  }

  update(dt) {
    this.stateT += dt;
    if (this.state === 'defeated') { this.defeatStep(dt); return; }
    if (this.updateDefeat(dt)) return;
    const p = this.player;
    const near = activeFigure(p) && this.pos.distanceTo(p.pos) < this.sight;
    switch (this.state) {
      case 'idle': case 'home': {
        // zum Platz zurück, dort wiegen
        const dx = this.home.x - this.pos.x, dy = this.home.y - this.pos.y, dz = this.home.z - this.pos.z, d = Math.hypot(dx, dy, dz);
        const s = Math.min(d, 1.4 * dt);
        if (d > 0.05) { this.vel.set((dx / d) * 1.4, (dy / d) * 1.4, (dz / d) * 1.4); this.faceToward(dx, dz, dt, 4); }
        else this.vel.set(0, Math.sin(this.level.time * 1.7) * 0.15, 0);
        void s;
        this.swimMove(dt, 1);
        if (near) { this.setState('chase'); this.leg = 0; this.clock = Math.min(this.clock, 0.2); }
        break;
      }
      case 'chase': {
        this.clock += dt;
        if (this.clock >= this.pulseT) { this.clock -= this.pulseT; this.stroke(); }
        // zusammenziehen: leicht sinken; danach gleiten (Wasserwiderstand)
        const k = this.clock < CONTRACT * this.pulseT ? 2.4 : 1.6;
        this.vel.multiplyScalar(Math.exp(-k * dt));
        if (this.clock < CONTRACT * this.pulseT) this.vel.y -= 0.6 * dt;
        if (activeFigure(p)) this.faceToward(p.pos.x - this.pos.x, p.pos.z - this.pos.z, dt, 3);
        this.swimMove(dt, 1);
        if (!near && this.stateT > 0.5) this.setState('home');
        else if (this.leg >= this.maxStrokes || (activeFigure(p) && this.distanceTo(p.pos.x, p.pos.y + p.half.y, p.pos.z) < 1.2 && this.leg > 0)) this.startRetreat();
        break;
      }
      case 'retreat': {
        if (activeFigure(p)) {
          let dx = this.pos.x - p.pos.x, dz = this.pos.z - p.pos.z;
          const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
          this.vel.x += (dx * this.speed * 0.5 - this.vel.x) * Math.min(1, dt * 4);
          this.vel.z += (dz * this.speed * 0.5 - this.vel.z) * Math.min(1, dt * 4);
          this.vel.y *= Math.exp(-2 * dt);
          this.faceToward(-dx, -dz, dt, 6);
        }
        this.swimMove(dt, 1);
        if (this.stateT >= this.backT) { this.setState(near ? 'chase' : 'home'); this.leg = 0; this.clock = 0; }
        break;
      }
      default: break;
    }
  }

  /** Ein Stoß auf die Figur zu, im Zickzack (abwechselnd quer). */
  stroke() {
    const p = this.player;
    if (!activeFigure(p)) return;
    let dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z;
    const dy = (p.pos.y + p.half.y) - (this.pos.y + this.half.y);
    const dh = Math.hypot(dx, dz) || 1;
    dx /= dh; dz /= dh;
    this.side = -this.side;
    let vx = dx + -dz * this.zig * this.side, vz = dz + dx * this.zig * this.side;
    let vy = clamp(dy / Math.max(1.5, dh), -0.8, 0.8);
    const l = Math.hypot(vx, vy, vz) || 1;
    vx /= l; vy /= l; vz /= l;
    this.vel.set(vx * this.speed, vy * this.speed, vz * this.speed);
    this.strokes++;
    this.leg++;
    this.level.sfx('swim');
    this.level.effects?.dust({ x: this.pos.x, y: this.pos.y + 0.1, z: this.pos.z }, 2, 0.4);
  }

  startRetreat() {
    this.setState('retreat');
    this.retreats++;
    this.leg = 0;
    this.level.sfx('splash');
  }

  /** Bewegung mit Kollision, im Wasser (unter der Oberfläche), an der Leine, mit Strömung. */
  swimMove(dt, k = 1) {
    // Strömung
    const cur = this.level.currentAt?.(this.pos.x, this.pos.y + this.half.y, this.pos.z, this._cur);
    const cx = (cur?.x ?? 0) * this.drift, cy = (cur?.y ?? 0) * this.drift, cz = (cur?.z ?? 0) * this.drift;
    // Leine
    if (this.range > 0) {
      const ox = this.pos.x - this.home.x, oz = this.pos.z - this.home.z, od = Math.hypot(ox, oz);
      if (od > this.range) { const f = (od - this.range) * 3; this.vel.x -= (ox / od) * f * dt * 4; this.vel.z -= (oz / od) * f * dt * 4; }
    }
    const c = this._c.set(this.pos.x, this.pos.y + this.half.y, this.pos.z);
    const res = this.level.world.moveAABB(c, this.half, { x: (this.vel.x + cx) * dt * k, y: (this.vel.y + cy) * dt * k, z: (this.vel.z + cz) * dt * k }, { step: 0, ignore: (s) => !!s.water });
    this.pos.set(c.x, c.y - this.half.y, c.z);
    if (res.hitWall && res.wallNormal) { const n = res.wallNormal, d = this.vel.x * n.x + this.vel.z * n.z; if (d < 0) { this.vel.x -= 1.6 * d * n.x; this.vel.z -= 1.6 * d * n.z; } }
    if (res.grounded && this.vel.y < 0) this.vel.y = Math.abs(this.vel.y) * 0.4;
    if (res.ceiling && this.vel.y > 0) this.vel.y = 0;
    // im Wasser bleiben (Mantelspitze 0,3 m unter der Oberfläche)
    const top = this.waterTop() ?? this.level.waterAt?.(this.home.x, this.home.y + this.half.y, this.home.z)?.top ?? null;
    if (top !== null) {
      const maxY = top - 0.3 - this.half.y * 2;
      if (this.pos.y > maxY) { this.pos.y = maxY; if (this.vel.y > 0) this.vel.y = 0; }
    }
    if (this.pos.y < this.level.killY) this.fallOut('fall');
  }

  defeat(source) {
    if (this.defeated) return;
    this.setState('defeated');
    this.touch = false;
    this.vel.set(0, -0.6, 0);
    this.level.sfx('stomp');
    this.level.effects?.sparks(this.center(), 8);
    this.markDefeated();
    void source;
  }

  defeatStep(dt) {
    this.pos.y += this.vel.y * dt;
    if (this.stateT >= DEFEAT) this.kill();
  }

  onPlayer(player, contact) {
    if (this.defeated) return 'none';
    if (this.slideAttack(player, contact)) return 'none';
    if (contact.pound) { this.defeat(player); return 'none'; }
    // von oben: auch schwimmend (die Figur sinkt/schwimmt auf ihn herab)
    const above = contact.fromAbove || (player.mode === 'swim' && player.pos.y > this.pos.y + this.half.y * 1.55 && player.vel.y <= 0.5);
    if (above) { this.defeat(player); return 'stomp'; }
    if (contact.dive) { this.defeat(player); return 'none'; }
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated || kind === 'bump') return;
    if (kind === 'pound') { if (source && Math.abs(source.pos.y - this.pos.y) < 1.2) this.defeat(source); return; }
    if (POWER_HIT.has(kind) || kind === 'slide' || isSichel(kind, source)) this.defeat(source);
  }

  modelState() {
    const s = this.state;
    if (s === 'defeated') return { anim: 'defeated', progress: clamp(this.stateT / DEFEAT, 0, 1) };
    if (s === 'retreat') return { anim: 'retreat' };
    if (s === 'chase') return { anim: 'swim', pulse: clamp(this.clock / this.pulseT, 0, 1) };
    return { anim: 'swim', pulse: (this.level.time / 1.6) % 1 };
  }

  info() {
    return {
      state: this.state, strokes: this.strokes, retreats: this.retreats, side: this.side, inWater: this.inWater, defeated: this.defeated,
      x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2),
    };
  }
}

export const KINDS = { tintling: (level, spec) => new Tintling(level, spec) };
