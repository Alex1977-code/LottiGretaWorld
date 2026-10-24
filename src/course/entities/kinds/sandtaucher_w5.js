// Sandtaucher – Gegner Welt 5 (5-1 „Strand“, Höhlenfluss mit Pflaume). Eigene Figur: rundlicher Wühlfisch, der verborgen
// im Sand bzw. Wasser schwimmt – sichtbar ist nur die lila Rückenflosse mit einer Sandwelle bzw. einem Wellenring.
//
// Verhalten: schwimmt verborgen (harmlos, unangreifbar) auf seiner Bahn bzw. in Kreisen um seinen Platz; ist eine Figur in
// Sichtweite (sight m, innerhalb seines Reviers), folgt er ihr unter der Oberfläche. Ist sie trigger m nah, schaut er
// kurz heraus (peek 0,45 s – Vorwarnung: Augen und Stirn) und **springt im Bogen** auf die Stelle zu, an der sie gleich
// sein wird (lead s Vorhalt, höchstens leap m weit, Landepunkt im Revier). Der Sprung dauert 1,1 s (Modell-Takt), die
// Sprunghöhe height m macht das Modell (root.userData.bodyY). Danach taucht er wieder ab (dive 0,35 s) und wartet
// cooldown s bis zum nächsten Sprung.
// Konter: **Draufspringen bzw. Stampfen in der Sprungphase** besiegt ihn (platt, Abprall; er fällt auf die Oberfläche und
//   liegt 1,2 s mit Schwindelsternen); Feuer, Krallen, Panzer, Wurf, Rutschen, Kanone, Explosion, Riesentrank, Stern
//   besiegen ihn ebenfalls im Sprung. Verborgen: nur eine Stampfwelle daneben (≤ 1,4 m) oder eine Explosion scheucht ihn
//   heraus (besiegt). **Seitliche Berührung im Sprung verletzt.**
//
// Daten: { kind: 'sandtaucher', pos: [x, y, z] (y = Sand-/Wasseroberfläche), ground?: 'sand' | 'wasser' (Standard: Wasser,
//          wenn an pos eine Wasserform ist, sonst Sand), path?: [[x,y,z], …] (Bahn verborgen), loop?, speed?: 2 (m/s
//          verborgen), chaseSpeed?: 3 (folgen), sight?: 8, trigger?: 3.4 (Sprung ab dieser Nähe), leap?: 4.5 (größte
//          Sprungweite), height?: 1.5 (Sprunghöhe der Körpermitte), lead?: 0.35 (s Vorhalt), cooldown?: 1.4, peek?: 0.45,
//          range?: 6 (Revier: Kreis um pos) | area?: { min: [x, z], max: [x, z] } (Revier: Rechteck), phase?: 0..1, id?, drop? }
//   Wasser: die Oberfläche folgt dem Wasserspiegel (level.waterAt, auch bei steigendem Wasser).
// Zustände: swim → peek → jump → dive → swim …; squashed | flipped. Laufzeit: jumps, surf (Oberfläche), bodyY, info().
// Modell 'sandtaucher' (opts { ground }, state { anim: hide|peek|jump|squashed, speed, height, progress }).

import { EnemyW2, STRONG, activeFigure, clamp } from '../EnemyW2.js';
import { PathMover } from '../../level/PathMover.js';
import { getModel } from '../../models/index.js';

const JUMP = 1.1, DIVE = 0.35, SQUASH = 1.2, HY = 0.36, HIDE_Y = -0.44;

class Sandtaucher extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'sandtaucher');
    this.half.set(0.4, HY, 0.4);
    this.shadow = 0.42;
    this.touch = false;
    this.flying = true;            // POW/Giftwasser/Lava-Regeln: verborgen nicht betroffen
    this.edges = false;
    const p = spec.pos ?? [0, 0, 0];
    this.home = { x: p[0], z: p[2] };
    this.surf = p[1];
    const w = level.waterAt?.(p[0], p[1] - 0.15, p[2]);
    this.groundKind = spec.ground ?? (w ? 'wasser' : 'sand');
    this.water = this.groundKind === 'wasser';
    this.speed = spec.speed ?? 2;
    this.chaseSpeed = spec.chaseSpeed ?? 3;
    this.sight = spec.sight ?? 8;
    this.trigger = spec.trigger ?? 3.4;
    this.leap = spec.leap ?? 4.5;
    this.jumpH = spec.height ?? 1.5;
    this.lead = spec.lead ?? 0.35;
    this.coolTime = spec.cooldown ?? 1.4;
    this.peekT = spec.peek ?? 0.45;
    this.range = spec.range ?? 6;
    this.area = spec.area ?? null;
    this.cool = 0.6;
    this.jumps = 0;
    this.bodyY = HIDE_Y;
    this.moveSpeed = 0;
    this.from = { x: 0, z: 0 };
    this.to = { x: 0, z: 0 };
    this.airY = 0; this.airV = 0;
    this.wanderA = ((spec.phase ?? 0) % 1) * Math.PI * 2;
    this.mover = spec.path?.length >= 2
      ? new PathMover(spec.path, { speed: this.speed, mode: (spec.loop ?? spec.path.length >= 3) ? 'loop' : 'pingpong', wait: 0.3, phase: spec.phase ?? 0 })
      : null;
    if (this.mover) { this.pos.x = this.mover.pos.x; this.pos.z = this.mover.pos.z; }
    this.state = 'swim';
    this.place();
    if (level.view) this.setModel(getModel('sandtaucher', { ground: this.groundKind }));
    this.initShadows(2);
  }

  /** Schatten-Blob nur in der Luft. */
  get shadowVisible() { return this.state === 'jump' || this.state === 'squashed' && this.airY > 0.05; }

  /** Oberfläche (Wasser: aktueller Wasserspiegel). */
  updateSurface() {
    if (!this.water || !this.level.waterAt) return;
    const w = this.level.waterAt(this.pos.x, this.surf - 0.15, this.pos.z) ?? this.level.waterAt(this.pos.x, this.surf + 0.4, this.pos.z);
    if (w) this.surf = w.top;
  }

  /** Hüllquader an die Körperhöhe setzen (pos = Fußpunkt der Hülle). */
  place() { this.pos.y = this.surf + this.bodyY - HY; }

  /** Punkt im Revier? (margin: Rand-Zugabe) */
  inArea(x, z, margin = 0) {
    if (this.area) {
      const a = this.area;
      return x >= a.min[0] - margin && x <= a.max[0] + margin && z >= a.min[1] - margin && z <= a.max[1] + margin;
    }
    return Math.hypot(x - this.home.x, z - this.home.z) <= this.range + margin;
  }

  /** Punkt ins Revier ziehen. */
  clampArea(o) {
    if (this.area) {
      const a = this.area;
      o.x = clamp(o.x, a.min[0], a.max[0]); o.z = clamp(o.z, a.min[1], a.max[1]);
      return o;
    }
    const dx = o.x - this.home.x, dz = o.z - this.home.z, d = Math.hypot(dx, dz);
    if (d > this.range) { o.x = this.home.x + (dx / d) * this.range; o.z = this.home.z + (dz / d) * this.range; }
    return o;
  }

  /** Verfolgbare Figur (aktiv, in Sicht, im Revier, ungefähr auf Höhe der Oberfläche) oder null. */
  prey() {
    const p = this.player;
    if (!activeFigure(p)) return null;
    if (Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) > this.sight) return null;
    if (!this.inArea(p.pos.x, p.pos.z, 1.5)) return null;
    if (p.pos.y < this.surf - 1 || p.pos.y > this.surf + 3.5) return null;
    return p;
  }

  update(dt) {
    this.stateT += dt;
    if (this.cool > 0) this.cool -= dt;
    this.updateSurface();
    if (this.state === 'squashed') {
      this.airV -= 30 * dt;
      this.airY = Math.max(0, this.airY + this.airV * dt);
      this.bodyY = this.airY;
      this.place();
      if (this.stateT >= SQUASH) this.kill();
      return;
    }
    if (this.updateDefeat(dt)) return;
    switch (this.state) {
      case 'swim': this.swim(dt); break;
      case 'peek': {
        this.moveSpeed = 0;
        const p = this.player;
        if (activeFigure(p)) this.faceToward(p.pos.x - this.pos.x, p.pos.z - this.pos.z, dt, 12);
        this.bodyY = HIDE_Y;
        if (this.stateT >= this.peekT) this.startJump();
        break;
      }
      case 'jump': this.jumpStep(); break;
      case 'dive':
        this.bodyY = HIDE_Y;
        if (this.stateT >= DIVE) this.setState('swim');
        break;
      default: break;
    }
    this.place();
  }

  swim(dt) {
    this.bodyY = HIDE_Y;
    const p = this.prey();
    let tx, tz, sp;
    if (p) {
      tx = p.pos.x; tz = p.pos.z; sp = this.chaseSpeed;
      const d = Math.hypot(tx - this.pos.x, tz - this.pos.z);
      if (d < this.trigger * 0.45) sp = 0;
      if (this.cool <= 0 && d <= this.trigger) { this.setState('peek'); if (!this.water) this.level.sfx('sand_crumble'); return; }
    } else if (this.mover) {
      this.mover.step(dt);
      tx = this.mover.pos.x; tz = this.mover.pos.z; sp = this.speed * 1.5;
    } else {
      // Kreise um den Platz (Radius ≤ 1,6 m)
      const r = Math.min(1.6, this.range * 0.4);
      this.wanderA += (this.speed * 0.6 / Math.max(0.5, r)) * dt;
      tx = this.home.x + Math.cos(this.wanderA) * r; tz = this.home.z - Math.sin(this.wanderA) * r;
      sp = this.speed;
    }
    const o = this.clampArea({ x: tx, z: tz });
    const dx = o.x - this.pos.x, dz = o.z - this.pos.z, d = Math.hypot(dx, dz);
    const m = Math.min(d, sp * dt);
    if (d > 1e-4 && m > 0) {
      this.pos.x += (dx / d) * m; this.pos.z += (dz / d) * m;
      this.faceToward(dx, dz, dt, 8);
    }
    this.moveSpeed = dt > 0 ? m / dt : 0;
  }

  startJump() {
    const p = this.player;
    let ax, az;
    if (activeFigure(p)) {
      ax = p.pos.x + (p.vel?.x ?? 0) * this.lead; az = p.pos.z + (p.vel?.z ?? 0) * this.lead;
    } else {
      const f = this.facing({}); ax = this.pos.x + f.x * 2.5; az = this.pos.z + f.z * 2.5;
    }
    let dx = ax - this.pos.x, dz = az - this.pos.z;
    let d = Math.hypot(dx, dz);
    if (d < 1e-3) { const f = this.facing({}); dx = f.x; dz = f.z; d = 1; }
    const L = clamp(d, 0.8, this.leap);
    const e = this.clampArea({ x: this.pos.x + (dx / d) * L, z: this.pos.z + (dz / d) * L });
    this.from.x = this.pos.x; this.from.z = this.pos.z;
    this.to.x = e.x; this.to.z = e.z;
    this.yaw = Math.atan2(-(e.z - this.pos.z), e.x - this.pos.x);
    this.jumps++;
    this.touch = true;
    this.setState('jump');
    this.burst(this.from);
    this.level.sfx(this.water ? 'splash_big' : 'sand_crumble');
  }

  jumpStep() {
    const k = Math.min(1, this.stateT / JUMP);
    this.pos.x = this.from.x + (this.to.x - this.from.x) * k;
    this.pos.z = this.from.z + (this.to.z - this.from.z) * k;
    this.bodyY = HIDE_Y + 4 * k * (1 - k) * (this.jumpH - HIDE_Y);
    this.vel.y = (4 * (1 - 2 * k) * (this.jumpH - HIDE_Y)) / JUMP;
    if (k >= 1) {
      this.touch = false;
      this.bodyY = HIDE_Y;
      this.vel.y = 0;
      this.cool = this.coolTime;
      this.setState('dive');
      this.burst(this.pos);
    }
  }

  burst(at) {
    const fx = this.level.effects;
    if (!fx) return;
    if (this.water) fx.splash?.({ x: at.x, y: this.surf, z: at.z }, this.surf);
    else fx.dust({ x: at.x, y: this.surf, z: at.z }, 5, 0.9);
  }

  // ------------------------------------------------------------------ Treffer

  squashFish() {
    if (this.defeated) return;
    this.airY = Math.max(0, this.bodyY);
    this.airV = 0;
    this.touch = false;
    this.setState('squashed');
    this.level.effects?.dust({ x: this.pos.x, y: this.surf, z: this.pos.z }, 5);
    this.markDefeated();
  }

  onPlayer(player, contact) {
    if (this.defeated || this.state !== 'jump') return 'none';
    if (this.slideAttack(player, contact)) return 'none';
    if (contact.pound) { this.squashFish(); return 'none'; }
    if (contact.fromAbove) { this.squashFish(); return 'stomp'; }
    if (contact.dive) { this.onHit('claw', player); return 'none'; }
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated) return;
    if (this.state === 'jump') { this.flip(source, 6); return; }
    // verborgen: nur Stampfwelle daneben (gleiche Höhe) und starke Treffer scheuchen ihn heraus
    if (kind === 'pound') {
      if (source?.pos && Math.abs(source.pos.y - this.surf) < 0.8) { this.bodyY = 0; this.squashFish(); this.level.sfx('stomp'); }
      return;
    }
    if (STRONG.has(kind) && kind !== 'star') { this.bodyY = 0; this.squashFish(); }
  }

  // ------------------------------------------------------------------ Darstellung

  modelState() {
    const s = this.state;
    if (s === 'jump') return { anim: 'jump', progress: Math.min(1, this.stateT / JUMP), height: this.jumpH };
    if (s === 'peek') return { anim: 'peek' };
    if (s === 'squashed') return { anim: 'squashed' };
    if (s === 'flipped') return { anim: 'jump', progress: 0.5, height: 0.2 };
    return { anim: 'hide', speed: this.moveSpeed };
  }

  syncModel() {
    if (!this.model) return;
    const r = this.model.root;
    if (this.state === 'flipped') r.position.set(this.pos.x, this.pos.y + HY, this.pos.z);
    else r.position.set(this.pos.x, this.surf + (this.state === 'squashed' ? this.airY : 0), this.pos.z);
    r.rotation.y = this.yaw;
    r.rotation.z = this.state === 'flipped' ? Math.PI : 0;
  }

  info() {
    return {
      state: this.state, x: +this.pos.x.toFixed(2), z: +this.pos.z.toFixed(2), surf: +this.surf.toFixed(2), bodyY: +this.bodyY.toFixed(2),
      jumps: this.jumps, touch: this.touch, defeated: this.defeated, ground: this.groundKind, to: [+this.to.x.toFixed(2), +this.to.z.toFixed(2)],
    };
  }
}

export const KINDS = { sandtaucher: (level, spec) => new Sandtaucher(level, spec) };

/** Für Tests/andere Module: Sprungdauer (s) und Körperhöhe im Versteck. */
export const SANDTAUCHER = { JUMP, HIDE_Y, DIVE };
