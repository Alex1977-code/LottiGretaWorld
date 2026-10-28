// Knochenflieger – Gegner Welt 7 „Lava-Festung“ (7-4, 7-5, 7-7): lustiger Knochen-Vogel (Modell 'knochenflieger', Ursprung =
// Körpermitte). Eigene Figur.
//
// Verhalten: fliegt seine Bahn – Kreis (center + radius), Wegpunkte (path, Runde ab 3 Punkten bzw. loop) oder schwebt an pos –
// und wippt dabei. Ist eine Figur waagerecht näher als sight m (Körpermitte) und tiefer (0,8 … reach m unter ihm), **kündigt er
// an** (warn s: hält an, dreht sich zu ihr, klappert mit dem Schnabel) und **stößt im Sturzflug herab**: ein Bogen genau durch
// die Körpermitte der Figur (tiefster Punkt in der Mitte, Ende gespiegelt hinter ihr auf Starthöhe) – dann **steigt er im
// Bogen zurück** an die Stelle seiner Bahn, an der er sie verlassen hat, und fliegt weiter (cooldown s Pause bis zum nächsten
// Sturzflug). Er fliegt frei (durch Wände). Eine zugewandte Figur mit Pilz-Maske übersieht er (maskedFrom).
// Konter: **Draufspringen** (Abprall) bzw. Stampfattacke **besiegt** ihn – er fällt klappernd auseinander –, ebenso Krallen-
// Sturzflug, Rutschen und alle Angriffe (Feuer, Tatze, Wurfsichel, Panzer, Wurf, Kanone, Explosion, Stern, Riese …).
// Seitliche Berührung (auch im Sturzflug) verletzt.
//
// Daten: { kind: 'knochenflieger', pos: [x, y, z] (Körpermitte; ohne Bahn schwebt er hier), center?: [x, y, z] + radius?: 3
//          (Kreisflug, y = Flughöhe der Körpermitte), cw?: false, path?: [[x, y, z], …] (Flugbahn, y = Flughöhe), loop?,
//          speed?: 2.4 (m/s auf der Bahn), phase?: 0..1 (Vorlauf auf Kreis/Bahn), sight?: 7, reach?: 7 (m tiefer),
//          dive?: 9 (m/s im Sturzflug), warn?: 0.5 (s Ankündigung), cooldown?: 1.8, bob?: 0.18 (m Wippen), drop? }
//   Beispiel: { kind: 'knochenflieger', center: [0, 5, -40], radius: 3.5, sight: 6 }
// Zustände: fly → warn → dive → rise → fly …; defeated (0,9 s). Laufzeit: dives, diveFrom/diveLow/diveTo (letzter Bogen),
//   mode ('circle' | 'path' | 'hover'), body() (Körpermitte), info().
// Sound: 'hover' (Ankündigung), 'swoop' (Sturzflug), 'blockhit' (Knochen fallen), 'stomp'.

import * as THREE from 'three';
import { EnemyW2, activeFigure, clamp, maskedFrom } from '../EnemyW2.js';
import { PathMover } from '../../level/PathMover.js';
import { getModel } from '../../models/index.js';

const TAU = Math.PI * 2;
const DEFEAT = 0.9;

class Knochenflieger extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'knochenflieger');
    this.half.set(0.4, 0.32, 0.4);
    this.shadow = 0.35;
    this.wake = 0;
    this.edges = false;
    this.speed = spec.speed ?? 2.4;
    this.sight = spec.sight ?? 7;
    this.reach = spec.reach ?? 7;
    this.diveSpeed = spec.dive ?? 9;
    this.warnT = spec.warn ?? 0.5;
    this.coolTime = spec.cooldown ?? 1.8;
    this.bobA = spec.bob ?? 0.18;
    this.cool = 0.6;
    this.dives = 0;
    this.diveFrom = null; this.diveLow = null; this.diveTo = null;
    this.S = new THREE.Vector3(); this.C = new THREE.Vector3(); this.E = new THREE.Vector3(); this.R = new THREE.Vector3();
    this.track = new THREE.Vector3();     // Lage auf der Bahn (Körpermitte, ohne Wippen)
    this.t0 = (spec.phase ?? 0) * 5.3;
    const p0 = spec.pos ?? spec.center ?? spec.path?.[0] ?? [0, 3, 0];
    if (spec.center) {
      const c = spec.center;
      this.mode = 'circle';
      this.circle = { x: c[0], y: c[1], z: c[2], r: spec.radius ?? 3, a: ((spec.phase ?? 0) % 1) * TAU, s: spec.cw ? -1 : 1 };
      this.placeCircle(0);
    } else if (spec.path?.length >= 2) {
      this.mode = 'path';
      this.mover = new PathMover(spec.path, { speed: this.speed, mode: (spec.loop ?? spec.path.length >= 3) ? 'loop' : 'pingpong', wait: 0.3, phase: spec.phase ?? 0 });
      const p = this.mover.pos;
      this.track.set(p.x, p.y, p.z);
    } else {
      this.mode = 'hover';
      this.track.set(p0[0], p0[1], p0[2]);
    }
    this.setBody(this.track.x, this.track.y, this.track.z);
    this.state = 'fly';
    if (level.view) this.setModel(getModel('knochenflieger'));
    this.initShadows(2);
  }

  /** Körpermitte. */
  body(out = new THREE.Vector3()) { return out.set(this.pos.x, this.pos.y + this.half.y, this.pos.z); }
  setBody(x, y, z) { this.pos.set(x, y - this.half.y, z); }

  placeCircle(dt) {
    const c = this.circle;
    c.a += (c.s * this.speed / Math.max(0.5, c.r)) * dt;
    this.track.set(c.x + Math.cos(c.a) * c.r, c.y, c.z - Math.sin(c.a) * c.r);
  }

  /** Bahn weiterfliegen (Kreis/Wegpunkte/schweben) – Lage in this.track. */
  advance(dt) {
    if (this.mode === 'circle') this.placeCircle(dt);
    else if (this.mode === 'path') { this.mover.step(dt); const p = this.mover.pos; this.track.set(p.x, p.y, p.z); }
  }

  update(dt) {
    this.stateT += dt;
    if (this.state === 'defeated') {
      this.vel.y -= 14 * dt;
      this.pos.addScaledVector(this.vel, dt);
      if (this.stateT >= DEFEAT || this.pos.y < this.level.killY) this.kill();
      return;
    }
    if (this.updateDefeat(dt)) return;
    if (this.cool > 0) this.cool -= dt;
    const bob = Math.sin(this.level.time * 2.4 + this.t0) * this.bobA;
    switch (this.state) {
      case 'fly': {
        const ox = this.pos.x, oz = this.pos.z;
        this.advance(dt);
        this.setBody(this.track.x, this.track.y + bob, this.track.z);
        if (Math.abs(this.pos.x - ox) + Math.abs(this.pos.z - oz) > 1e-6) this.yaw = Math.atan2(-(this.pos.z - oz), this.pos.x - ox);
        else this.facePlayer(dt, 3);
        if (this.cool <= 0 && this.wantsDive()) { this.setState('warn'); this.level.sfx('hover'); }
        return;
      }
      case 'warn':
        this.facePlayer(dt, 12);
        this.setBody(this.track.x, this.track.y + bob + Math.sin(this.stateT * 40) * 0.03, this.track.z);
        if (this.stateT >= this.warnT) this.startDive();
        return;
      case 'dive': {
        const u = Math.min(1, this.stateT / this.diveT);
        const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
        const S = this.S, C = this.C, E = this.E;
        const ox = this.pos.x, oz = this.pos.z;
        this.setBody(a * S.x + b * C.x + c * E.x, a * S.y + b * C.y + c * E.y, a * S.z + b * C.z + c * E.z);
        if (Math.abs(this.pos.x - ox) + Math.abs(this.pos.z - oz) > 1e-6) this.yaw = Math.atan2(-(this.pos.z - oz), this.pos.x - ox);
        if (u >= 1) this.startRise();
        return;
      }
      case 'rise': {
        const u = Math.min(1, this.stateT / this.riseT);
        const k = u * u * (3 - 2 * u);
        const A = this.R, B = this.track;
        const ox = this.pos.x, oz = this.pos.z;
        this.setBody(A.x + (B.x - A.x) * k, A.y + (B.y + bob - A.y) * k + Math.sin(u * Math.PI) * 0.8, A.z + (B.z - A.z) * k);
        if (Math.abs(this.pos.x - ox) + Math.abs(this.pos.z - oz) > 1e-6) this.yaw = Math.atan2(-(this.pos.z - oz), this.pos.x - ox);
        if (u >= 1) { this.cool = this.coolTime; this.setState('fly'); }
        return;
      }
      default: break;
    }
  }

  /** Figur in Reichweite unter ihm (und sieht ihn nicht mit Pilz-Maske an)? */
  wantsDive() {
    const p = this.player;
    if (!activeFigure(p)) return false;
    const b = this.body();
    const d = Math.hypot(p.pos.x - b.x, p.pos.z - b.z);
    const dy = b.y - (p.pos.y + p.half.y);
    return d < this.sight && dy > 0.8 && dy < this.reach && !maskedFrom(this.level, this, p);
  }

  startDive() {
    const p = this.player;
    const S = this.body(this.S);
    const T = activeFigure(p) ? new THREE.Vector3(p.pos.x, p.pos.y + p.half.y, p.pos.z) : new THREE.Vector3(S.x, S.y - 2, S.z);
    // Ende gespiegelt hinter der Figur auf Starthöhe; Kontrollpunkt so, dass der Bogen genau durch T geht
    this.E.set(2 * T.x - S.x, S.y, 2 * T.z - S.z);
    this.C.set(2 * T.x - (S.x + this.E.x) / 2, 2 * T.y - (S.y + this.E.y) / 2, 2 * T.z - (S.z + this.E.z) / 2);
    const L = Math.hypot(this.E.x - S.x, this.E.z - S.z) + 2 * (S.y - T.y);
    this.diveT = clamp(L / this.diveSpeed, 0.8, 2.2);
    const r2 = (v) => [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)];
    this.diveFrom = r2(S); this.diveLow = r2(T); this.diveTo = r2(this.E);
    this.dives++;
    this.setState('dive');
    this.level.sfx('swoop');
  }

  startRise() {
    this.body(this.R);
    const d = Math.hypot(this.R.x - this.track.x, this.R.y - this.track.y, this.R.z - this.track.z);
    this.riseT = clamp(d / 4, 0.8, 2.0);
    this.setState('rise');
  }

  defeat(source, up = 4) {
    if (this.defeated) return;
    const sx = source?.pos?.x ?? this.pos.x, sz = source?.pos?.z ?? this.pos.z;
    let ax = this.pos.x - sx, az = this.pos.z - sz;
    const l = Math.hypot(ax, az);
    if (l > 1e-3) { ax /= l; az /= l; } else { ax = 0; az = 0; }
    this.setState('defeated');
    this.touch = false;
    this.vel.set(ax * 1.5, up, az * 1.5);
    this.level.sfx('blockhit');
    this.level.effects?.dust(this.body(), 6, 0.8);
    this.markDefeated();
  }

  onPlayer(player, contact) {
    if (this.defeated) return 'none';
    if (this.slideAttack(player, contact)) return 'none';
    if (contact.pound) { this.defeat(player, 2); return 'none'; }
    if (contact.fromAbove) { this.defeat(player, 2); return 'stomp'; }
    if (contact.dive) { this.defeat(player); return 'none'; }
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated || kind === 'bump') return;
    if (kind === 'pound' && source?.pos && Math.abs(source.pos.y - this.pos.y) > 1.2) return;
    this.defeat(source, 5);
  }

  modelState() {
    const s = this.state;
    if (s === 'defeated') return { anim: 'defeated', progress: Math.min(1, this.stateT / DEFEAT) };
    if (s === 'dive') return { anim: 'dive', speed: this.diveSpeed };
    if (s === 'warn') return { anim: 'fly', speed: 9 };
    return { anim: 'fly', speed: this.speed };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    this.model.root.position.y = this.pos.y + this.half.y;
  }

  info() {
    return {
      state: this.state, mode: this.mode, dives: this.dives, defeated: this.defeated,
      x: +this.pos.x.toFixed(2), y: +(this.pos.y + this.half.y).toFixed(2), z: +this.pos.z.toFixed(2),
    };
  }
}

export const KINDS = { knochenflieger: (level, spec) => new Knochenflieger(level, spec) };
