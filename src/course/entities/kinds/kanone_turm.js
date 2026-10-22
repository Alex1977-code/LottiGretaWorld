// Kanonenturm (Bauplan Welt 2: „Kanone“ für Projektil-/Suchköpfe, 2-Panzer; zerstörbar mit dem Kanonen-Helm).
//
// Fester Turm (Oberseite begehbar). Ist eine Figur näher als range m (und weiter als minRange m), lädt er alle
// interval s (charge 0,5 s: Rohr zittert, Mündung glüht – Ankündigung) und feuert (fire 0,6 s: Rückstoß, Blitz,
// Rauch) einen Kopf aus der Mündung (model.muzzle()) in Rohrrichtung. sides: 2 → zwei Rohre (vorn/hinten), er feuert
// aus dem Rohr, das zur Figur zeigt. track: true → der Kopf dreht sich zur Figur (1,5 rad/s). Höchstens max eigene
// Köpfe gleichzeitig. Unverwundbar gegen Springen, Feuer, Krallen, Panzer; zerstört nur durch Kanonenkugel
// (Kanonen-Helm, onHit('cannon')/onCannon), Explosion und Riesentrank.
//
// Daten: { kind: 'kanone_turm', id?, pos (Fußpunkt), yaw?|dir? (Rohr 0; Standard zur Kamera +Z), height?: 2,
//          sides?: 1 | 2, shot?: 'projektilkopf' | 'suchkopf' | 'wechsel' (abwechselnd) | 'riesenprojektil' (Welt 3),
//          interval?: 3.0 s,
//          first?: 1.0 s, range?: 26 m, minRange?: 1.6 m, max?: 3, speed? (Kopf-Tempo), seek?/turn? (Suchkopf),
//          ride? (Projektilkopf), track?: false, charge?: 0.5 s, active?: true, drop? }
//   Beispiel: { kind: 'kanone_turm', pos: [6, 1, -40], dir: [-1, 0], interval: 2.5, shot: 'suchkopf' }
// Zustände: idle → charge → fire → idle …; broken. Laufzeit: shots (abgefeuert), heads (lebende), aim, setActive(b).
// Modell 'kanone_turm' (opts { height, sides }, state { anim: idle|charge|fire, aim, progress }).

import { EnemyW2, localOffset, toWorld, wrapAngle, activeFigure } from '../EnemyW2.js';
import { getModel } from '../../models/index.js';

const FIRE = 0.6;

class KanoneTurm extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'kanone_turm');
    this.height = Math.max(1.4, spec.height ?? 2);
    this.sides = spec.sides === 2 ? 2 : 1;
    this.half.set(0.6, this.height / 2, 0.6);
    this.touch = false;
    this.shadow = 0;
    this.wake = 0;
    this.shot = spec.shot ?? 'projektilkopf';
    this.interval = spec.interval ?? 3.0;
    this.cool = spec.first ?? 1.0;
    this.range = spec.range ?? 26;
    this.minRange = spec.minRange ?? 1.6;
    this.maxHeads = spec.max ?? 3;
    this.chargeT = spec.charge ?? 0.5;
    this.track = !!spec.track;
    this.active = spec.active !== false;
    this.aim = 0;
    this.side = 0;
    this.shots = 0;
    this.heads = [];
    this.state = 'idle';
    const p = this.pos;
    this.addShape({ type: 'box', min: [p.x - 0.6, p.y, p.z - 0.6], max: [p.x + 0.6, p.y + this.height, p.z + 0.6], tag: 'kanone_turm' });
    let model = null;
    if (level.view) model = this.setModel(getModel('kanone_turm', { height: this.height, sides: this.sides }));
    this.initShadows(3);
    this.muzzle = localOffset(`kanone:${this.height}`, model, { anim: 'idle', aim: 0 }, (o) => model.muzzle(o, 0), { x: 0.78, y: this.height - 0.57, z: 0 });
  }

  setActive(b) { this.active = !!b; if (!b) this.setState('idle'); }

  update(dt) {
    this.stateT += dt;
    if (this.defeated) return;
    this.heads = this.heads.filter((h) => !h.removed && h.state !== 'fall');
    const p = this.aimTarget();
    if (p && this.track) {
      const want = wrapAngle(Math.atan2(-(p.pos.z - this.pos.z), p.pos.x - this.pos.x) - this.yaw);
      const d = wrapAngle(want - this.aim), m = 1.5 * dt;
      this.aim += Math.max(-m, Math.min(m, d));
    }
    switch (this.state) {
      case 'idle':
        if (this.cool > 0) this.cool -= dt;
        if (this.active && this.cool <= 0 && p && this.heads.length < this.maxHeads) {
          this.side = this.pickSide(p);
          this.setState('charge');
          this.level.sfx('fuse');
        }
        break;
      case 'charge':
        if (this.stateT >= this.chargeT) { this.fire(); this.setState('fire'); }
        break;
      case 'fire':
        if (this.stateT >= FIRE) { this.setState('idle'); this.cool = Math.max(0, this.interval - this.chargeT - FIRE); }
        break;
      default: break;
    }
  }

  /** Nächste aktive Figur in Reichweite (nicht zu nah) oder null. */
  aimTarget() {
    const p = this.player;
    if (!activeFigure(p)) return null;
    const d = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
    return d <= this.range && d >= this.minRange ? p : null;
  }

  /** Zwei Rohre: das, das zur Figur zeigt. */
  pickSide(p) {
    if (this.sides < 2) return 0;
    const a = this.yaw + this.aim;
    const dot = Math.cos(a) * (p.pos.x - this.pos.x) - Math.sin(a) * (p.pos.z - this.pos.z);
    return dot >= 0 ? 0 : 1;
  }

  /** Weltpunkt der Mündung (side 1 = hinteres Rohr) und Schussrichtung. */
  muzzlePos(side = this.side, out = {}) {
    const a = this.yaw + this.aim + (side ? Math.PI : 0);
    toWorld(this.pos, a, this.muzzle.x, this.muzzle.y, this.muzzle.z, out);
    out.dx = Math.cos(a); out.dz = -Math.sin(a);
    return out;
  }

  fire() {
    const m = this.muzzlePos(this.side);
    let kind = this.shot;
    if (kind === 'wechsel') kind = this.shots % 2 ? 'suchkopf' : 'projektilkopf';
    // Riesenprojektil (Welt 3): Rumpfmitte 1,2 m über der Unterkante, Heck an der Mündung
    const big = kind === 'riesenprojektil';
    const ahead = big ? 2.4 : 0.15;
    const spec = { pos: [m.x + m.dx * ahead, m.y - (big ? 1.2 : 0.33), m.z + m.dz * ahead], dir: [m.dx, m.dz], owner: this };
    for (const k of ['speed', 'seek', 'turn', 'ride', 'life']) if (this.spec[k] !== undefined) spec[k] = this.spec[k];
    const h = this.level.spawn(kind, spec);
    if (h) this.heads.push(h);
    this.shots++;
    this.level.sfx('bullet');
    this.level.shake(0.08);
    this.level.effects?.dust({ x: m.x, y: m.y - 0.3, z: m.z }, 4, 0.9);
  }

  // ------------------------------------------------------------------ Treffer

  onCannon(ball) { this.onHit('cannon', ball); }

  onHit(kind, source) {
    if (this.defeated) return;
    if (kind === 'cannon' || kind === 'bomb' || kind === 'mega') this.destroy();
  }

  destroy() {
    if (this.defeated) return;
    this.setState('broken');
    this.removeShapes();
    this.level.effects?.debris(this.center(), 0x8a1a2a, 14);
    this.level.effects?.dust(this.pos, 10, 1.6);
    this.level.sfx('brickbreak');
    this.level.shake(0.3);
    this.markDefeated();
    this.kill();
  }

  onPlayer() { return 'none'; }

  modelState() {
    const s = this.state;
    if (s === 'charge') return { anim: 'charge', aim: this.aim, progress: Math.min(1, this.stateT / this.chargeT) };
    if (s === 'fire') return { anim: 'fire', aim: this.aim, progress: Math.min(1, this.stateT / FIRE) };
    return { anim: 'idle', aim: this.aim };
  }

  info() { return { state: this.state, shots: this.shots, heads: this.heads.length, aim: +this.aim.toFixed(3), defeated: this.defeated }; }
}

export const KINDS = { kanone_turm: (level, spec) => new KanoneTurm(level, spec) };
