// Glotzfisch – Gegner Welt 6 „Wolkeninseln“ (6-5 „Glotzfisch-Zone“: Eisseen mit Löchern). Praller blauer Fisch mit riesigen
// Glotzaugen (Modell 'glotzfisch', Ursprung = Bauch, Körpermitte y = 0,3).
//
// Verhalten: wartet verborgen unter Wasser bzw. unter dem Eis und **springt im Takt** (every s, phase) in einem hohen Bogen
// (height m über der Oberfläche, flight s) aus einem Loch ins nächste: reihum durch holes (zwei Löcher = hin und her) bzw.
// ohne holes zwischen pos und pos + dir · dist. Vorwarnung: peek s vor dem Sprung lugen seine Glotzaugen aus dem Loch
// (Blubbern). Mit aim springt er in das Loch, das der Figur am nächsten liegt (sie steht ≤ sight m davon), sonst reihum.
// Konter: **von oben** (Draufspringen/Stampfattacke während des Sprungs: Abprall, er kippt auf den Rücken und plumpst), alle
// Angriffe (Feuer, Tatze, Panzer, Wurf, Schwanzhieb, Kanone, Explosion, Stern, Riese …) im Sprung oder beim Lugen. Verborgen
// unberührbar. **Berührung im Sprung verletzt** (seitlich, von unten).
//
// Daten: { kind: 'glotzfisch', pos: [x, y, z] (Loch bzw. Wasserstelle, y = Oberfläche), holes?: [[x, y, z], …] (pos = erstes
//          Loch, falls pos fehlt), dir?: [dx, dz], dist?: 4 (ohne holes), height?: 2.4, every?: 2.6, flight?: 1.1,
//          phase?: 0..1 (Vorlauf im Takt), peek?: 0.45, aim?: false, sight?: 6, color?: 'blau' | 'gelb' | 'rosa', drop? }
//   Beispiel: { kind: 'glotzfisch', holes: [[-3, 1, -60], [3, 1, -60]], height: 2.6, phase: 0.5 }
// Zustände: wait (verborgen) → peek → jump → wait …; defeated (kippt, fällt; 1,4 s). Laufzeit: jumps, hole (Index),
//   apex (höchste Höhe über der Oberfläche im letzten Sprung), info().
// Sound: 'splash_big' (Aus- und Eintauchen), 'bounce', 'stomp'.

import * as THREE from 'three';
import { EnemyW2, activeFigure, clamp } from '../EnemyW2.js';
import { getModel } from '../../models/index.js';

const DEFEAT = 1.4;

class Glotzfisch extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'glotzfisch');
    this.half.set(0.36, 0.3, 0.36);
    this.shadow = 0.35;
    this.wake = 0;
    this.edges = false;
    let holes = Array.isArray(spec.holes) && spec.holes.length ? spec.holes.map((h) => new THREE.Vector3(h[0], h[1], h[2])) : null;
    if (!holes) {
      const p = this.pos.clone(), d = this.dir, L = spec.dist ?? 4;
      holes = [p, new THREE.Vector3(p.x + d.x * L, p.y, p.z + d.z * L)];
    }
    if (holes.length === 1) holes.push(holes[0].clone());
    this.holes = holes;
    this.hole = 0;
    this.height = spec.height ?? 2.4;
    this.every = spec.every ?? 2.6;
    this.flight = Math.min(spec.flight ?? 1.1, this.every - 0.2);
    this.peekT = spec.peek ?? 0.45;
    this.aim = !!spec.aim;
    this.sight = spec.sight ?? 6;
    this.timer = (((spec.phase ?? 0) % 1) + 1) % 1 * this.every;
    this.jumps = 0;
    this.apex = 0;
    this.from = new THREE.Vector3();
    this.to = new THREE.Vector3();
    this.next = 1;
    this.state = 'wait';
    this.touch = false;
    this.place(this.holes[0], -0.9);
    if (level.view) this.setModel(getModel('glotzfisch', { color: spec.color ?? 'blau' }));
    this.initShadows(1);
  }

  /** Fußpunkt (Bauch) relativ zur Oberfläche des Lochs h. */
  place(h, dy) { this.pos.set(h.x, h.y + dy, h.z); }

  get hidden() { return this.state === 'wait'; }

  update(dt) {
    this.stateT += dt;
    if (this.state === 'defeated') {
      this.vel.y -= 30 * dt;
      this.pos.x += this.vel.x * dt; this.pos.y += this.vel.y * dt; this.pos.z += this.vel.z * dt;
      if (this.stateT >= DEFEAT || this.pos.y < this.level.killY) this.kill();
      return;
    }
    this.timer += dt;
    const lead = this.every - this.peekT - this.flight;   // Wartezeit im Takt
    switch (this.state) {
      case 'wait':
        this.place(this.holes[this.hole], -0.9);
        if (this.timer >= lead) this.startPeek();
        return;
      case 'peek':
        this.place(this.holes[this.hole], -0.22 + Math.sin(this.stateT * 18) * 0.03);
        if (this.timer >= lead + this.peekT) this.startJump();
        return;
      case 'jump': {
        const k = clamp(this.stateT / this.flight, 0, 1);
        const a = this.from, b = this.to;
        const base = -0.35;
        this.pos.set(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k + base + 4 * (this.height - base) * k * (1 - k), a.z + (b.z - a.z) * k);
        this.apex = Math.max(this.apex, this.pos.y - Math.max(a.y, b.y));
        if (k >= 1) this.splashDown();
        return;
      }
      default: break;
    }
  }

  startPeek() {
    this.setState('peek');
    this.touch = true;
    const h = this.holes[this.hole];
    this.level.effects?.splash?.({ x: h.x, y: h.y, z: h.z }, h.y);
  }

  /** Ziel: nächstes Loch reihum bzw. (aim) das Loch nächst der Figur. */
  pickTarget() {
    const n = this.holes.length;
    let j = (this.hole + 1) % n;
    if (this.aim) {
      const p = this.player;
      if (activeFigure(p) && this.canSee(99, 8)) {
        let best = -1, bd = this.sight;
        for (let i = 0; i < n; i++) {
          if (i === this.hole) continue;
          const d = Math.hypot(this.holes[i].x - p.pos.x, this.holes[i].z - p.pos.z);
          if (d < bd) { bd = d; best = i; }
        }
        if (best >= 0) j = best;
      }
    }
    return j;
  }

  startJump() {
    this.next = this.pickTarget();
    this.from.copy(this.holes[this.hole]);
    this.to.copy(this.holes[this.next]);
    const dx = this.to.x - this.from.x, dz = this.to.z - this.from.z;
    if (Math.abs(dx) + Math.abs(dz) > 1e-3) this.yaw = Math.atan2(-dz, dx);
    this.apex = 0;
    this.jumps++;
    this.setState('jump');
    this.touch = true;
    this.level.sfx('splash_big');
    this.level.effects?.splash?.(this.from, this.from.y);
  }

  splashDown() {
    this.hole = this.next;
    this.timer = 0;
    this.setState('wait');
    this.touch = false;
    this.level.effects?.splash?.(this.to, this.to.y);
    this.level.sfx('splash_big');
  }

  defeat(source, up = 5) {
    if (this.defeated) return;
    const sx = source?.pos?.x ?? this.pos.x, sz = source?.pos?.z ?? this.pos.z;
    let ax = this.pos.x - sx, az = this.pos.z - sz;
    const l = Math.hypot(ax, az);
    if (l > 1e-3) { ax /= l; az /= l; } else { ax = 0; az = 0; }
    this.setState('defeated');
    this.touch = false;
    this.vel.set(ax * 2, up, az * 2);
    this.level.sfx('stomp');
    this.level.effects?.sparks(this.center(), 6);
    this.markDefeated();
  }

  onPlayer(player, contact) {
    if (this.defeated || this.hidden) return 'none';
    if (contact.fromAbove || contact.pound) { this.defeat(player, 3); return contact.pound ? 'none' : 'stomp'; }
    if (contact.dive) { this.onHit('claw', player); return 'none'; }
    if (this.slideAttack(player, contact)) return 'none';
    if (this.state === 'peek') return 'none';
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated || this.hidden || kind === 'bump') return;
    if (kind === 'pound' && source?.pos && Math.abs(source.pos.y - this.pos.y) > 1.2) return;
    this.defeat(source, 6);
  }

  modelState() {
    const s = this.state;
    if (s === 'jump') return { anim: 'jump', progress: clamp(this.stateT / this.flight, 0, 1) };
    if (s === 'defeated') return { anim: 'defeated' };
    return { anim: 'swim', speed: 1 };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    this.model.root.visible = this.state !== 'wait';
  }

  info() {
    return {
      state: this.state, jumps: this.jumps, hole: this.hole, apex: +this.apex.toFixed(2), defeated: this.defeated,
      x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2),
    };
  }
}

export const KINDS = { glotzfisch: (level, spec) => new Glotzfisch(level, spec) };
