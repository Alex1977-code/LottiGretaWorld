// Pustewolke – Gegner Welt 6 „Wolkeninseln“ (Bauplan Gegner-Katalog „Pustewolke: bläst Spieler weg · Konter: gegen Wind
// laufen, Treffer“; 6-5 „Abhang voller Pustewolken“). Flauschige Wolke mit Pausbacken und Pudelmütze (Modell 'pustewolke',
// Ursprung = Unterkante der Wolke).
//
// Verhalten: schwebt an pos (wippt bob m; optional auf path mit speed m/s). Ist eine Figur näher als sight m, läuft ihr Takt:
//   rest (Atempause, rest s; dreht sich – turn – zur Figur, sonst feste Blasrichtung dir) → inhale (inhale s: holt Luft,
//   bläht sich – **Vorwarnung**) → blow (blow s: **pustet** einen Windkegel in Blickrichtung: reach m lang, ±angle° breit,
//   ±height m hoch) → rest …
//   Der Wind schiebt Figuren (auch Klone) mit strength m/s (vorn voll, am Kegelende 60 %), am Boden × ground (gegen den Wind
//   laufen geht langsam), in der Luft voll – Sprünge verwehen, über Abgründen gefährlich. Leichte Entitäten (windK > 0, z. B.
//   Wurfball) treiben mit. Während des Pustens meldet sie sich als Windquelle (windAt der Welt-6-Bausteine, sobald es sie
//   gibt: w6(level).winds).
// Konter: **in der Atempause** (rest/inhale) draufspringen bzw. Stampfattacke besiegt sie (Abprall); während sie pustet
//   prallt man nur ab. Treffer (Feuer, Tatze, Panzer, Wurf, Rutschen, Schwanzhieb, Kanone, Explosion, Stern, Riese …)
//   besiegen sie immer. Seitliche Berührung schadet nicht (die Wolke ist weich: kleiner Schubs).
//
// Daten: { kind: 'pustewolke', pos (Unterkante der Wolke beim Schweben), dir?: [dx, dz] | yaw (feste Blasrichtung; ohne dir:
//          zur Figur), turn?: true (in der Pause zur Figur drehen; false = immer dir), sight?: 10, reach?: 5.5, angle?: 28,
//          height?: 2.2, strength?: 7.5, ground?: 0.7, rest?: 1.6, inhale?: 0.7, blow?: 2.2, phase?: 0 (s Vorlauf im Takt),
//          path?, loop?, speed?: 1, bob?: 0.12, wake?, drop? }
//   Beispiel: { kind: 'pustewolke', pos: [6, 3, -40], dir: [-1, 0], turn: false, reach: 6 }
// Zustände: idle (keine Figur in Sicht) | rest | inhale | blow | hit | defeated. Laufzeit: blows, pushed (m, wie weit sie
//   Figuren verschoben hat), inCone(x, y, z), info().
// Sound: 'hover' (Luft holen), 'swoop' (Pusten), 'stomp', 'vanish'.

import { EnemyW2, figures, activeFigure, clamp } from '../EnemyW2.js';
import { getModel } from '../../models/index.js';
import { PathMover } from '../../level/PathMover.js';
import { shoveAABB, dirFromTo } from '../w6help.js';

const HIT = 0.3, DEFEAT = 0.9;
const DEG = Math.PI / 180;
const FREE = new Set(['ground', 'air', 'swim']);

class Pustewolke extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'pustewolke');
    this.half.set(0.62, 0.55, 0.62);
    this.shadow = 0.6;
    this.edges = false;
    this.fixed = Array.isArray(spec.dir) || typeof spec.dir === 'number' || typeof spec.yaw === 'number';
    this.turn = spec.turn ?? !this.fixed;
    this.sight = spec.sight ?? 10;
    this.reach = spec.reach ?? 5.5;
    this.angle = (spec.angle ?? 28) * DEG;
    this.height = spec.height ?? 2.2;
    this.strength = spec.strength ?? 7.5;
    this.groundK = spec.ground ?? 0.7;
    this.restT = spec.rest ?? 1.6;
    this.inhaleT = spec.inhale ?? 0.7;
    this.blowT = spec.blow ?? 2.2;
    this.bob = spec.bob ?? 0.12;
    this.baseY = this.pos.y;
    this.mover = spec.path?.length >= 2 ? new PathMover(spec.path, { speed: spec.speed ?? 1, mode: (spec.loop ?? spec.path.length >= 3) ? 'loop' : 'pingpong', wait: 0.6 }) : null;
    if (this.mover) { this.pos.set(this.mover.pos.x, this.mover.pos.y, this.mover.pos.z); this.baseY = this.pos.y; }
    this.blowDir = { x: this.dir.x, z: this.dir.z };
    this.cycle = spec.phase ?? 0;
    this.blows = 0;
    this.pushed = 0;
    this.clock = 0;
    this.state = 'idle';
    // Windquelle für die Welt-6-Bausteine (windAt): wird beim Merge mit den Bausteinen angemeldet (w6(level).winds)
    this.windHandle = {
      add: (x, y, z, out) => { if (this.state === 'blow' && this.inCone(x, y, z)) { const k = this.falloff(x, z); out.x += this.blowDir.x * this.strength * k; out.z += this.blowDir.z * this.strength * k; } return out; },
      get state() { return 'boe'; }, get k() { return 1; },
    };
    if (level.view) this.setModel(getModel('pustewolke'));
    this.initShadows(1);
  }

  /** Mitte der Wolke (Ursprung des Windkegels). */
  mouth() { return { x: this.pos.x + this.blowDir.x * 0.5, y: this.pos.y + 0.55, z: this.pos.z + this.blowDir.z * 0.5 }; }

  /** Liegt der Punkt im Windkegel? */
  inCone(x, y, z) {
    const m = this.mouth();
    const rx = x - m.x, rz = z - m.z, ry = y - m.y;
    const along = rx * this.blowDir.x + rz * this.blowDir.z;
    if (along < -0.3 || along > this.reach) return false;
    if (Math.abs(ry) > this.height) return false;
    const across = Math.abs(rx * this.blowDir.z - rz * this.blowDir.x);
    return across <= 0.7 + Math.tan(this.angle) * Math.max(0, along);
  }

  falloff(x, z) {
    const m = this.mouth();
    const along = (x - m.x) * this.blowDir.x + (z - m.z) * this.blowDir.z;
    return 1 - 0.4 * clamp(along / this.reach, 0, 1);
  }

  update(dt) {
    this.stateT += dt;
    this.clock += dt;
    if (this.state === 'hit') { if (this.stateT >= HIT) this.setState('defeated'); return; }
    if (this.state === 'defeated') { this.pos.y += dt * 0.6; if (this.stateT >= DEFEAT) this.kill(); return; }
    // schweben (Bahn, Wippen)
    if (this.mover) { this.mover.step(dt); this.pos.x = this.mover.pos.x; this.pos.z = this.mover.pos.z; this.baseY = this.mover.pos.y; }
    this.pos.y = this.baseY + Math.sin(this.clock * 1.7) * this.bob;
    const p = this.player;
    const near = activeFigure(p) && this.playerDist() < this.sight && Math.abs(p.pos.y - this.pos.y) < 6;
    if (!near && this.state !== 'blow' && this.state !== 'inhale') { if (this.state !== 'idle') this.setState('idle'); return; }
    if (this.state === 'idle') this.setState('rest');
    // Takt: rest → inhale → blow
    this.cycle += dt;
    const period = this.restT + this.inhaleT + this.blowT;
    const u = ((this.cycle % period) + period) % period;
    const want = u < this.restT ? 'rest' : u < this.restT + this.inhaleT ? 'inhale' : 'blow';
    if (want !== this.state) {
      if (want === 'inhale') this.level.sfx('hover');
      if (want === 'blow') { this.blows++; this.level.sfx('swoop'); }
      this.setState(want);
    }
    if (this.state === 'rest' || this.state === 'inhale') {
      if (this.turn && activeFigure(p) && !this.maskedNow(p)) {
        const d = dirFromTo(this.pos, p.pos, this.blowDir);
        const want2 = Math.atan2(-d.z, d.x);
        this.faceTowardYaw(want2, dt, this.state === 'inhale' ? 2.5 : 5);
      }
    } else if (this.state === 'blow') this.blowStep(dt);
    this.blowDir.x = Math.cos(this.yaw); this.blowDir.z = -Math.sin(this.yaw);
  }

  /** Pilz-Maske: eine zugewandte Figur mit Maske sieht sie nicht (dreht sich nicht zu ihr). */
  maskedNow(p) { return !this.canSee(this.sight, 6); }

  faceTowardYaw(want, dt, rate) {
    let d = want - this.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.yaw += d * Math.min(1, dt * rate);
  }

  /** Windkegel: Figuren (am Boden × ground) und leichte Entitäten schieben. */
  blowStep(dt) {
    const vx = this.blowDir.x * this.strength, vz = this.blowDir.z * this.strength;
    for (const f of figures(this.level)) {
      if (!FREE.has(f.mode) || f.dead || f.removedFigure) continue;
      const c = f.center();
      if (!this.inCone(c.x, c.y, c.z)) continue;
      const k = this.falloff(c.x, c.z) * (f.mode === 'ground' ? this.groundK : 1);
      const m = shoveAABB(this.level, f, vx * k * dt, 0, vz * k * dt);
      this.pushed += Math.hypot(m.x, m.z);
    }
    for (const e of this.level.entities) {
      if (!(e.windK > 0) || !e.alive || e.removed || e.carrier || e.hidden) continue;
      const c = e.center();
      if (!this.inCone(c.x, c.y, c.z)) continue;
      const own = new Set(e.shapes ?? []);
      const k = this.falloff(c.x, c.z) * e.windK;
      shoveAABB(this.level, e, vx * k * dt, 0, vz * k * dt, own.size ? (q) => own.has(q.id) : null);
    }
  }

  get resting() { return this.state === 'rest' || this.state === 'inhale' || this.state === 'idle'; }

  defeat() {
    if (this.defeated) return;
    this.setState('hit');
    this.touch = false;
    this.level.sfx('vanish');
    this.level.effects?.sparks(this.center(), 10);
    this.markDefeated();
  }

  onPlayer(player, contact) {
    if (this.defeated) return 'none';
    if (contact.fromAbove || contact.pound) {
      if (this.resting) { this.defeat(); return contact.pound ? 'none' : 'stomp'; }
      this.level.sfx('bounce');
      return 'stomp';
    }
    if (contact.dive) { this.onHit('claw', player); return 'none'; }
    if (this.slideAttack(player, contact)) return 'none';
    // weich: kleiner Schubs von der Wolke weg
    const d = dirFromTo(this.pos, player.pos, this.blowDir);
    shoveAABB(this.level, player, d.x * 0.05, 0, d.z * 0.05);
    return 'none';
  }

  onHit(kind, source) {
    if (this.defeated || kind === 'bump') return;
    if (kind === 'pound' && source?.pos && Math.abs(source.pos.y - this.pos.y) > 1.2) return;
    this.defeat();
  }

  modelState() {
    const s = this.state;
    if (s === 'inhale') return { anim: 'inhale', progress: Math.min(1, this.stateT / this.inhaleT) };
    if (s === 'blow') return { anim: 'blow', power: 1 };
    if (s === 'hit') return { anim: 'hit', progress: Math.min(1, this.stateT / 0.5) };
    if (s === 'defeated') return { anim: 'defeated', progress: Math.min(1, this.stateT / DEFEAT) };
    return { anim: 'idle' };
  }

  info() {
    return {
      state: this.state, blows: this.blows, pushed: +this.pushed.toFixed(2), defeated: this.defeated, yaw: +this.yaw.toFixed(2),
      dir: [+this.blowDir.x.toFixed(2), +this.blowDir.z.toFixed(2)], x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2),
    };
  }
}

export const KINDS = { pustewolke: (level, spec) => new Pustewolke(level, spec) };
