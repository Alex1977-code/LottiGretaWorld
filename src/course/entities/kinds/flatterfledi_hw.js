// Flatterfledi – runde Lila-Fledermaus der Halloween-Welt „Kürbisinsel“. Eigene Figur.
//
// flatterfledi – Standard: **hängt kopfüber** am Aufhängepunkt pos (Ast, Decke, Balken; die Hülle hängt darunter) und
//   schläft. Kommt eine Figur näher als sight m (waagerecht) und ist sie darunter (bis reach m tiefer), **wacht sie auf**
//   (0,35 s), fliegt einen **Sturzflug-Bogen** durch die Stelle der Figur (Körpermitte; tiefster Punkt in der Mitte des
//   Bogens, gleiche Höhe am Ende auf der anderen Seite), **kehrt im Bogen zurück** und hängt sich wieder auf (cooldown s
//   Pause, dann erneut). Sie fliegt frei (durch Wände, wie Geister). Ohne Aufhängen: center + radius (kreist), path
//   (Flugbahn) oder hang: false (schwebt an pos).
//   **Draufspringen** (bzw. Stampfattacke, Sturzflug, Feuer, Krallen, Panzer, Explosion, Stern, Riese) **besiegt** sie
//   (dreht sich funkelnd weg), seitliche Berührung verletzt.
//   Daten: { kind: 'flatterfledi', pos (Aufhängepunkt bzw. Fußpunkt beim Fliegen), hang?: true, sight?: 5, reach?: 7,
//            speed?: 6 (m/s im Sturzflug), cooldown?: 1.5, center?: [x, y, z] + radius?: 2.5 (Kreisflug, y = Fußpunkt),
//            flySpeed?: 2.2 (m/s im Kreis/auf der Bahn), cw?, phase?: 0..1, path?, loop?, scale?: 1, drop? }
//   Zustände: hang → wake → dive → return → hang; fly (Kreis/Bahn/schweben); defeated (0,6 s). Laufzeit: dives,
//   diveFrom/diveLow/diveTo (letzter Bogen), anchor, info(). Modell 'flatterfledi' (Ursprung = Füße; state
//   { anim: fly|dive|hang|defeated }); beim Wechsel hängen ↔ fliegen bleibt die Körpermitte an ihrer Stelle.
//
// flatterfledi_schwarm – **kreisender Schwarm**: count Flatterfledis kreisen (gegeneinander versetzt, wippend) um pos,
//   jede ist eine eigene Entität ('flatterfledi_glied', Treffer/Konter wie oben); gezeichnet als **eine Instanz-Gruppe**
//   (BatFlockView, ≈ 5 Zeichenaufrufe für alle). Besiegte fehlen im Schwarm.
//   Daten: { kind: 'flatterfledi_schwarm', id?, pos (Mitte, y = Fußpunkt der Fledermäuse), count?: 6, radius?: 2.5,
//            speed?: 2 (m/s am Umfang), cw?, phase?: 0..1, bob?: 0.35 (m auf und ab), scale?: 1 }
//   Laufzeit: angle, alive, members, info().
//
// Hilfen für andere Module (Graf Brummbär): BatFlockView (Instanz-Gruppe für viele Fledermäuse), Flatterfledi (Klasse;
//   mit flock = { sync(), placeMember(m), memberGone(m) } und kind ein Schwarm-Glied).

import * as THREE from 'three';
import { EnemyW2, activeFigure, clamp, modelInstances, maskedFrom } from '../EnemyW2.js';
import { PathMover } from '../../level/PathMover.js';
import { getModel } from '../../models/index.js';

const TAU = Math.PI * 2;
const FF_CY = 0.3;            // Körpermitte über dem Modell-Ursprung (fliegend)
const WAKE = 0.35, DEFEAT = 0.6;
const damp = (a, b, k, dt) => b + (a - b) * Math.exp(-k * dt);

/** Viele Fledermäuse als eine Instanz-Gruppe ('flatterfledi', gleiche Pose; Lage/Gier/Größe je Glied). */
export class BatFlockView {
  constructor(level, n) {
    this.level = level;
    this.n = n;
    this.mi = level.view ? modelInstances(level, 'flatterfledi', {}, n, 1) : null;
    this._p = { x: 0, y: 0, z: 0 };
  }

  /** members[i] = { pos, half, yaw, batScale, batVis (0..1) } | null; state = Modellzustand der Vorlage. */
  render(dt, members, state = { anim: 'fly' }) {
    if (!this.mi) return;
    for (let i = 0; i < this.n; i++) {
      const m = members[i];
      const vis = m && !m.removed ? (m.batVis ?? 1) : 0;
      if (vis <= 0.001) { this.mi.hide(i); continue; }
      const s = m.batScale ?? 1;
      this._p.x = m.pos.x; this._p.y = m.pos.y + m.half.y - FF_CY * s; this._p.z = m.pos.z;
      this.mi.set(i, this._p, m.yaw + (m.spin ?? 0), s * vis);
    }
    this.mi.update(dt, state);
  }

  dispose() { this.mi?.dispose(); this.mi = null; }
}

// =====================================================================================================================
// Flatterfledi
// =====================================================================================================================
export class Flatterfledi extends EnemyW2 {
  constructor(level, spec, flock = null, index = 0, kind = 'flatterfledi_glied') {
    super(level, spec, flock ? kind : 'flatterfledi');
    this.flock = flock;
    this.index = index;
    const s = this.batScale = spec.scale ?? 1;
    this.half.set(0.32 * s, 0.28 * s, 0.32 * s);
    this.shadow = flock ? 0.22 * s : 0.3 * s;
    this.edges = false;
    this.sight = spec.sight ?? 5;
    this.reach = spec.reach ?? 7;
    this.diveSpeed = spec.speed ?? 6;
    this.flySpeed = spec.flySpeed ?? 2.2;
    this.cool = 0;
    this.coolTime = spec.cooldown ?? 1.5;
    this.dives = 0;
    this.batVis = 1;
    this.spin = 0;
    this.hangK = 0;
    this.mover = null;
    this.circle = null;
    this.diveFrom = null; this.diveLow = null; this.diveTo = null;
    this._c = new THREE.Vector3();
    this.S = new THREE.Vector3(); this.C = new THREE.Vector3(); this.E = new THREE.Vector3();
    if (flock) { this.mode = 'flock'; this.state = 'fly'; }
    else if (spec.center) {
      const c = spec.center;
      this.mode = 'circle';
      this.circle = { x: c[0], y: c[1], z: c[2], r: spec.radius ?? 2.5, a: (spec.phase ?? 0) * TAU, s: spec.cw ? -1 : 1 };
      this.state = 'fly';
      this.placeCircle(0);
    } else if (spec.path?.length >= 2) {
      this.mode = 'path';
      this.mover = new PathMover(spec.path, { speed: this.flySpeed, mode: (spec.loop ?? spec.path.length >= 3) ? 'loop' : 'pingpong', wait: 0.2, phase: spec.phase ?? 0 });
      const p = this.mover.pos; this.pos.set(p.x, p.y, p.z);
      this.state = 'fly';
    } else if (spec.hang === false) {
      this.mode = 'hover';
      this.state = 'fly';
    } else {
      this.mode = 'hang';
      this.anchor = this.pos.clone();
      this.pos.y = this.anchor.y - 2 * this.half.y;
      this.home = this.pos.clone();
      this.state = 'hang';
      this.hangK = 1;
    }
    this.t0 = (spec.phase ?? index * 0.37) * 7;
    if (!flock && level.view) this.setModel(getModel('flatterfledi'));
    if (this.model) this.model.root.scale.setScalar(s);
    this.initShadows(1);
  }

  /** Körpermitte. */
  body(out = this._c) { return out.set(this.pos.x, this.pos.y + this.half.y, this.pos.z); }
  setBody(x, y, z) { this.pos.set(x, y - this.half.y, z); }

  placeCircle(dt) {
    const c = this.circle;
    c.a += (c.s * this.flySpeed / c.r) * dt;
    const x0 = this.pos.x, z0 = this.pos.z;
    const bob = Math.sin(this.level.time * 2.2 + this.t0) * 0.2;
    this.pos.set(c.x + Math.cos(c.a) * c.r, c.y + bob, c.z - Math.sin(c.a) * c.r);
    if (dt > 0) this.yaw = Math.atan2(-(this.pos.z - z0), this.pos.x - x0);
  }

  update(dt) {
    this.stateT += dt;
    if (this.state === 'defeated') {
      this.batVis = Math.max(0, 1 - this.stateT / DEFEAT);
      this.spin += dt * 16;
      this.pos.y += dt * 0.6;
      if (this.stateT >= DEFEAT) this.kill();
      return;
    }
    if (this.updateDefeat(dt)) return;
    if (this.cool > 0) this.cool -= dt;
    switch (this.mode) {
      case 'flock': this.flock.sync(); this.flock.placeMember(this); return;
      case 'circle': this.placeCircle(dt); return;
      case 'path': {
        const ox = this.pos.x, oz = this.pos.z;
        this.mover.step(dt);
        const p = this.mover.pos;
        this.pos.set(p.x, p.y + Math.sin(this.level.time * 2.2 + this.t0) * 0.15, p.z);
        if (Math.abs(p.x - ox) + Math.abs(p.z - oz) > 1e-6) this.yaw = Math.atan2(-(p.z - oz), p.x - ox);
        return;
      }
      case 'hover': this.facePlayer(dt, 3); return;
      default: this.hangStep(dt);
    }
  }

  hangStep(dt) {
    switch (this.state) {
      case 'hang':
        this.pos.copy(this.home);
        if (this.cool <= 0 && this.wantsDive()) { this.setState('wake'); this.level.sfx('hover'); }
        return;
      case 'wake': {
        // entfaltet sich, sinkt ein Stück und dreht sich zur Figur
        const k = Math.min(1, this.stateT / WAKE);
        this.pos.y = this.home.y - 0.25 * Math.sin(k * Math.PI * 0.5);
        this.facePlayer(dt, 10);
        if (this.stateT >= WAKE) this.startDive();
        return;
      }
      case 'dive': {
        const u = Math.min(1, this.stateT / this.diveT);
        const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
        const S = this.S, C = this.C, E = this.E;
        const ox = this.pos.x, oz = this.pos.z;
        this.setBody(a * S.x + b * C.x + c * E.x, a * S.y + b * C.y + c * E.y, a * S.z + b * C.z + c * E.z);
        if (Math.abs(this.pos.x - ox) + Math.abs(this.pos.z - oz) > 1e-6) this.yaw = Math.atan2(-(this.pos.z - oz), this.pos.x - ox);
        if (u >= 1) this.startReturn();
        return;
      }
      case 'return': {
        const u = Math.min(1, this.stateT / this.retT);
        const k = u * u * (3 - 2 * u);
        const A = this.retFrom, B = this.anchorBody();
        const ox = this.pos.x, oz = this.pos.z;
        this.setBody(A.x + (B.x - A.x) * k, A.y + (B.y - A.y) * k + Math.sin(u * Math.PI) * 0.9, A.z + (B.z - A.z) * k);
        if (Math.abs(this.pos.x - ox) + Math.abs(this.pos.z - oz) > 1e-6) this.yaw = Math.atan2(-(this.pos.z - oz), this.pos.x - ox);
        if (u >= 1) { this.pos.copy(this.home); this.cool = this.coolTime; this.setState('hang'); }
        return;
      }
      default: break;
    }
  }

  anchorBody() { return new THREE.Vector3(this.home.x, this.home.y + this.half.y, this.home.z); }

  /** Figur in Reichweite unter ihr? */
  wantsDive() {
    const p = this.player;
    if (!activeFigure(p)) return false;
    const d = Math.hypot(p.pos.x - this.anchor.x, p.pos.z - this.anchor.z);
    const dy = this.anchor.y - (p.pos.y + p.half.y);
    return d < this.sight && dy > 0.6 && dy < this.reach && !maskedFrom(this.level, this, p);   // Pilz-Maske (Welt 6)
  }

  startDive() {
    const p = this.player;
    const S = this.body(this.S);
    const T = activeFigure(p) ? new THREE.Vector3(p.pos.x, p.pos.y + p.half.y, p.pos.z) : new THREE.Vector3(S.x, S.y - 2, S.z);
    // Ende: gespiegelt hinter der Figur, auf Starthöhe; Kontrollpunkt so, dass der Bogen genau durch T geht
    this.E.set(2 * T.x - S.x, S.y, 2 * T.z - S.z);
    this.C.set(2 * T.x - (S.x + this.E.x) / 2, 2 * T.y - (S.y + this.E.y) / 2, 2 * T.z - (S.z + this.E.z) / 2);
    const L = Math.hypot(this.E.x - S.x, this.E.z - S.z) + 2 * (S.y - T.y);
    this.diveT = clamp(L / this.diveSpeed, 1.0, 2.4);
    this.diveFrom = [+S.x.toFixed(2), +S.y.toFixed(2), +S.z.toFixed(2)];
    this.diveLow = [+T.x.toFixed(2), +T.y.toFixed(2), +T.z.toFixed(2)];
    this.diveTo = [+this.E.x.toFixed(2), +this.E.y.toFixed(2), +this.E.z.toFixed(2)];
    this.dives++;
    this.setState('dive');
    this.level.sfx('swoop');
  }

  startReturn() {
    this.retFrom = this.body(new THREE.Vector3());
    const d = this.retFrom.distanceTo(this.anchorBody());
    this.retT = clamp(d / 4, 0.8, 2);
    this.setState('return');
  }

  defeat(source) {
    if (this.defeated) return;
    this.setState('defeated');
    this.touch = false;
    this.level.effects?.sparks(this.body(), 10);
    this.level.sfx('vanish');
    this.markDefeated();
    this.flock?.memberGone?.(this);
  }

  onPlayer(player, contact) {
    if (this.defeated) return 'none';
    if (this.slideAttack(player, contact)) return 'none';
    if (contact.pound) { this.defeat(player); return 'none'; }
    if (contact.fromAbove) { this.defeat(player); return 'stomp'; }
    if (contact.dive) { this.defeat(player); return 'none'; }
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated) return;
    if (kind === 'pound' && source?.pos && Math.abs(source.pos.y - this.pos.y) > 0.8) return;
    this.defeat(source);
  }

  render(dt, t) {
    if (this.flock) return;            // Schwarm zeichnet alle Glieder als Instanzen
    // Körpermitte bleibt beim Wechsel hängen ↔ fliegen an ihrer Stelle (Modell blendet mit Rate 10 über)
    this.hangK = damp(this.hangK, this.state === 'hang' ? 1 : 0, 10, dt);
    super.render(dt, t);
  }

  modelState() {
    const s = this.state;
    if (s === 'defeated') return { anim: 'defeated' };
    if (s === 'hang') return { anim: 'hang' };
    if (s === 'dive') return { anim: this.stateT < this.diveT * 0.5 ? 'dive' : 'fly', speed: this.diveSpeed };
    return { anim: 'fly', speed: s === 'return' ? 3 : this.flySpeed };
  }

  syncModel() {
    if (!this.model) return;
    const r = this.model.root, s = this.batScale;
    const off = (FF_CY - 0.6 * this.hangK) * s;   // Modell: Körpermitte bei y = 0,3 (fliegend) bzw. −0,3 (hängend)
    r.position.set(this.pos.x, this.pos.y + this.half.y - off, this.pos.z);
    r.rotation.y = this.yaw;
  }

  info() {
    return {
      state: this.state, mode: this.mode, dives: this.dives, defeated: this.defeated,
      x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2), body: +(this.pos.y + this.half.y).toFixed(2),
    };
  }
}

// =====================================================================================================================
// Kreisender Schwarm
// =====================================================================================================================
class FlatterflediSchwarm extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'flatterfledi_schwarm');
    this.enemy = false;
    this.touch = false;
    this.shadow = 0;
    this.count = Math.max(1, Math.min(24, Math.round(spec.count ?? 6)));
    this.radius = Math.max(0.6, spec.radius ?? 2.5);
    this.speed = spec.speed ?? 2;
    this.dirSign = spec.cw ? -1 : 1;
    this.angle = (spec.phase ?? 0) * TAU;
    this.bob = spec.bob ?? 0.35;
    this.t = level.time;
    this.half.set(this.radius + 0.4, 0.5, this.radius + 0.4);
    this.view = new BatFlockView(level, this.count);
    this.members = [];
    const s = spec.scale ?? 1;
    for (let i = 0; i < this.count; i++) {
      const m = new Flatterfledi(level, { pos: [this.pos.x, this.pos.y, this.pos.z], scale: s, id: spec.id ? `${spec.id}_${i}` : undefined, drop: spec.drop }, this, i, 'flatterfledi_glied');
      level.entities.push(m);
      if (m.spec.id) level.named.set(m.spec.id, m);
      if (m.shadow > 0 && level.view) level.view.shadows.add({ pos: m.pos, radius: m.shadow, alive: () => !m.removed, visible: () => m.alive && !m.defeated });
      this.members.push(m);
      this.placeMember(m);
    }
  }

  /** Drehung einmal je Simulationsschritt weiterrücken (wer zuerst fragt, rechnet). */
  sync() {
    const now = this.level.time;
    if (now === this.t) return;
    const dt = now - this.t;
    this.t = now;
    this.angle += this.dirSign * (this.speed / this.radius) * dt;
  }

  placeMember(m) {
    const i = m.index;
    const a = this.angle + (i / this.count) * TAU;
    const r = this.radius * (0.86 + 0.28 * ((i * 0.618) % 1));
    const y = this.pos.y + Math.sin(this.level.time * 2.1 + i * 2.3) * this.bob + ((i % 3) - 1) * 0.15;
    m.pos.set(this.pos.x + Math.cos(a) * r, y, this.pos.z - Math.sin(a) * r);
    // Blick in Flugrichtung (Tangente)
    m.yaw = a + this.dirSign * Math.PI / 2;
  }

  memberGone() {}

  update() {
    this.sync();
    if (this.members.every((m) => m.removed)) super.kill();
  }

  get aliveCount() { return this.members.filter((m) => !m.defeated).length; }

  kill() { for (const m of this.members) m.kill(); super.kill(); }

  onPlayer() { return 'none'; }
  onHit() {}

  render(dt) { this.view.render(dt, this.members, { anim: 'fly', speed: this.speed }); }

  info() { return { angle: +this.angle.toFixed(3), alive: this.aliveCount, count: this.count }; }

  dispose() { this.view.dispose(); super.dispose(); }
}

export const KINDS = {
  flatterfledi: (level, spec) => new Flatterfledi(level, spec),
  flatterfledi_schwarm: (level, spec) => new FlatterflediSchwarm(level, spec),
};
