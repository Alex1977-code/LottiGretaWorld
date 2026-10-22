// Lauerblock (Bauplan 2-3: Lauerblöcke in Wänden – fahren heraus und schieben).
//
// Ein violetter Steinblock wartet in einer Wandöffnung (Vorderseite bündig mit der Wand). Kommt eine Figur in seine
// Bahn (vor der Öffnung, bis reach + 0,6 m), späht er kurz (peek 0,3 s: schiebt sich 0,1 m vor und zittert – fair
// angekündigt), stößt dann heraus (push, 0,15 s auf reach m), bleibt hold s draußen und fährt langsam zurück (back,
// 0,5 s), danach cool s Pause. Mit mode 'timed' stößt er stattdessen im Takt (period s, phase 0..1).
// Kollision: bewegter Quader (mover) – man kann auf ihm stehen und wird mitgenommen (auch Gegner). Er schiebt
// Figuren vor sich her; wer dabei gegen eine Wand (feste Form) gedrückt wird, ist eingeklemmt = Treffer (er fährt
// dann sofort zurück). Unzerstörbar – nur der Riesentrank zertrümmert ihn (Form mit mega). Kein Gegner (enemy
// false): zählt nicht für Arenen und Aufgaben, Funkelstern und Kanonenkugel wirken nicht.
//
// Daten: { kind: 'lauerblock', pos: [x, y, z] (Mitte der Unterkante der Vorderseite = Wandfläche),
//          yaw?|dir? (Stoßrichtung; Standard zur Kamera +Z), reach?: 2 m, size?: 1 m (Würfel), hold?: 0.7 s,
//          cool?: 0.8 s, mode?: 'sense' | 'timed', period?: 3 s, phase?: 0..1, sense?: reach + 0.6 m }
//   Beispiel: { kind: 'lauerblock', pos: [-4, 1, -60], dir: [1, 0], reach: 2.5 }
// Zustände: wait → peek → push → hold → back → wait …; broken. Laufzeit: out (m ausgefahren), pushes, crushes.
// Modell 'lauerblock' (opts { reach, size }, state { anim: wait|peek|push|back, out 0..1 }).

import { EnemyW2, figures, activeFigure } from '../EnemyW2.js';
import { getModel } from '../../models/index.js';

const PEEK = 0.3, PUSH = 0.15, BACK = 0.5;

class Lauerblock extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'lauerblock');
    this.size = spec.size ?? 1;
    this.reach = spec.reach ?? 2;
    this.holdT = spec.hold ?? 0.7;
    this.coolT = spec.cool ?? 0.8;
    this.mode = spec.mode === 'timed' ? 'timed' : 'sense';
    this.period = spec.period ?? 3;
    this.clock = 0;
    this.next = (spec.phase ?? 0) * this.period + 0.5;   // Takt: nächster Stoß (s Laufzeit)
    this.sense = spec.sense ?? this.reach + 0.6;
    this.touch = false;
    this.enemy = false;           // Falle, kein Gegner (zählt nicht für Arenen/Aufgaben)
    this.shadow = 0;
    this.wake = 0;
    this.out = 0;
    this.cool = 0.3;
    this.pushes = 0;
    this.crushes = 0;
    this.state = 'wait';
    this.face = { x: this.dir.x, z: this.dir.z };
    this.side = { x: -this.face.z, z: this.face.x };
    this.wall = this.pos.clone();
    this.half.set(0.5 * this.size, 0.5 * this.size, 0.5 * this.size);
    this.mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: 0, cz: 0 };
    this.shapeId = this.addShape({ type: 'box', min: [0, 0, 0], max: [1, 1, 1], mover: this.mover, mega: true, camIgnore: true, tag: 'lauerblock' });
    this.syncShape();
    this._others = (s) => s.owner !== this && s.solid !== false && !s.oneWay && !s.trigger && !s.water && !s.kill;
    this.unstep = level.onStep((dt) => this.stepMove(dt));
    if (level.view) this.setModel(getModel('lauerblock', { reach: this.reach, size: this.size }));
    this.initShadows(1);
  }

  /** Mitte des Blocks (Welt) bei Ausfahrweg out. */
  blockCenter(out = this.out, o = {}) {
    const k = out - this.size / 2;
    o.x = this.wall.x + this.face.x * k; o.y = this.wall.y + this.size / 2; o.z = this.wall.z + this.face.z * k;
    return o;
  }

  syncShape() {
    const sh = this.level.world.get(this.shapeId);
    if (!sh) return;
    const c = this.blockCenter();
    const h = this.size / 2;
    sh.min = [c.x - h, this.wall.y, c.z - h];
    sh.max = [c.x + h, this.wall.y + this.size, c.z + h];
    this.pos.set(c.x, this.wall.y, c.z);
    this.level.world.update(this.shapeId);
  }

  /** Bewegung im Plattform-Takt (vor den Figuren), damit sie mitgenommen bzw. geschoben werden. */
  stepMove(dt) {
    if (this.removed) return;
    this.stateT += dt;
    if (this.cool > 0) this.cool -= dt;
    this.clock += dt;
    const o0 = this.out;
    switch (this.state) {
      case 'wait':
        if (this.mode === 'timed') {
          if (this.clock >= this.next) {
            while (this.next <= this.clock) this.next += this.period;
            this.setState('peek');
          }
        } else if (this.cool <= 0 && this.figureInLane()) this.setState('peek');
        break;
      case 'peek':
        this.out = Math.min(0.1, this.stateT / PEEK * 0.1);
        if (this.stateT >= PEEK) { this.setState('push'); this.pushes++; this.level.sfx('slam'); }
        break;
      case 'push':
        this.out = Math.min(this.reach, 0.1 + (this.stateT / PUSH) * (this.reach - 0.1));
        if (this.stateT >= PUSH) { this.out = this.reach; this.setState('hold'); this.level.shake(0.12); this.level.effects?.dust(this.blockCenter(), 3, 0.8); }
        break;
      case 'hold':
        if (this.stateT >= this.holdT) this.setState('back');
        break;
      case 'back':
        this.out = Math.max(0, this.reach * (1 - this.stateT / BACK));
        if (this.out <= 0) { this.out = 0; this.setState('wait'); this.cool = this.coolT; }
        break;
      default: break;
    }
    const d = this.out - o0;
    const m = this.mover;
    m.dx = this.face.x * d; m.dz = this.face.z * d; m.dy = 0;
    m.vx = m.dx / dt; m.vz = m.dz / dt; m.vy = 0;
    if (d !== 0) {
      this.syncShape();
      if (d > 0) this.shove();
    }
  }

  /** Steht eine Figur in der Bahn vor der Öffnung? */
  figureInLane() {
    for (const p of figures(this.level)) {
      if (!activeFigure(p)) continue;
      const rx = p.pos.x - this.wall.x, rz = p.pos.z - this.wall.z;
      const along = rx * this.face.x + rz * this.face.z;
      const across = Math.abs(rx * this.side.x + rz * this.side.z);
      if (along < -0.1 || along > this.sense + p.half.x) continue;
      if (across > this.size / 2 + p.half.x + 0.1) continue;
      if (p.pos.y + p.half.y * 2 < this.wall.y + 0.05 || p.pos.y > this.wall.y + this.size - 0.05) continue;
      return true;
    }
    return false;
  }

  /** Figuren vor der Vorderseite mitschieben; gegen eine Wand gedrückt = eingeklemmt (Treffer). */
  shove() {
    const c = this.blockCenter();
    const h = this.size / 2;
    for (const p of figures(this.level)) {
      if (!p || p.dead || p.mode === 'script') continue;
      const ph = p.half;
      const rx = p.pos.x - c.x, rz = p.pos.z - c.z;
      const along = rx * this.face.x + rz * this.face.z;
      const across = Math.abs(rx * this.side.x + rz * this.side.z);
      if (across >= h + ph.x - 0.02) continue;
      if (p.pos.y >= this.wall.y + this.size - 0.05 || p.pos.y + ph.y * 2 <= this.wall.y + 0.02) continue;
      const pen = h + ph.x - along;          // Überlappung entlang der Stoßrichtung
      if (along < -0.05 || pen <= 0) continue;
      p.pos.x += this.face.x * (pen + 0.01);
      p.pos.z += this.face.z * (pen + 0.01);
      // eingeklemmt? (Figur steckt nach dem Schieben in einer festen Form)
      const pc = p.center();
      const hit = this.level.world.overlapAABB(pc, { x: ph.x - 0.04, y: ph.y - 0.06, z: ph.z - 0.04 }, { filter: this._others });
      if (hit.length) {
        this.crushes++;
        p.hurt(this);
        this.level.sfx('slam');
        // zurück aus der Wand: an die Vorderseite des Blocks setzen und Block sofort einziehen
        p.pos.x -= this.face.x * (pen + 0.01);
        p.pos.z -= this.face.z * (pen + 0.01);
        this.setState('back');
        this.stateT = BACK * (1 - this.out / this.reach);
      }
    }
  }

  onPlayer() { return 'none'; }

  onHit(kind) {
    if (kind === 'mega' || kind === 'star') this.smash();
  }

  smash() {
    if (this.defeated) return;
    this.removeShapes();
    this.level.effects?.debris(this.blockCenter(), 0x7a4ad8, 10);
    this.level.sfx('brickbreak');
    this.markDefeated();
    this.kill();
  }

  modelState() {
    const s = this.state;
    const anim = s === 'peek' ? 'peek' : s === 'push' || s === 'hold' ? 'push' : s === 'back' ? 'back' : 'wait';
    return { anim, out: this.reach > 0 ? this.out / this.reach : 0 };
  }

  syncModel() {
    if (!this.model) return;
    const r = this.model.root;
    r.position.copy(this.wall);
    r.rotation.y = this.yaw;
    if (this.state === 'peek') r.position.x += Math.sin(this.stateT * 80) * 0.01;
  }

  dispose() {
    this.unstep?.();
    super.dispose();
  }

  info() { return { state: this.state, out: +this.out.toFixed(3), pushes: this.pushes, crushes: this.crushes }; }
}

export const KINDS = { lauerblock: (level, spec) => new Lauerblock(level, spec) };
