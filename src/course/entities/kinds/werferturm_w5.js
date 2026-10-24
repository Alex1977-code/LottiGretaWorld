// Werferturm – Welt 5 (5-B „Fire Bros. Hideout 2“-Vorbild: „1 Feuer-Werfer auf einem Pilzlingsturm aus 9 Pilzlingen“).
// Ein hoher Pilzlingsturm (count Stufen, bis 12 – der vorhandene `pilzlingsturm` kennt nur 3–5) mit einem Werfer-Bruder
// obenauf, der von dort oben wirft. Der Turm watschelt langsam (Standard: auf die Figur zu); jede Berührung von oben bzw.
// jeder Treffer (Feuer, Krallen, Panzer, Wurf …) nimmt die oberste Stufe (wie beim Pilzlingsturm), der Werfer sinkt mit.
// Explosion, Riesentrank, Funkelstern und POW werfen den ganzen Turm um; fällt der letzte Pilzling, springt der Werfer ab
// und kämpft am Boden weiter (gewöhnlicher feuer_werfer: tänzelt, springt, wirft). Den Werfer oben besiegt man wie immer
// (draufspringen – erreichbar z. B. über steigende Steinsäulen –, Feuer, Krallen …); der Turm läuft dann ohne ihn weiter.
// Seitliche Berührung des Turms verletzt.
// Daten: { kind: 'werferturm', id?, pos, count?: 9 (1–12), speed?: 0.8, behavior?: 'chase' | 'walk', sight?: 10, path?,
//          dir?, wake?, edges?, drop?, weapon?: 'feuer' | 'hammer' | 'bumerang', rider?: false (ohne Werfer),
//          interval?, volley?, first?, throwSight?: 14 (Wurf-Sichtweite des Werfers), riderId? (level.named des Werfers) }
// Laufzeit: count, height, rider (Werfer-Entität | null), info(). Darstellung: gestapelte Registry-Modelle 'pilzlingsturm'
// (je 5 Stufen) und das Modell 'feuer_werfer' des Werfers.

import * as THREE from 'three';
import { EnemyW2, clamp } from '../EnemyW2.js';
import { getModel } from '../../models/index.js';

const STEP = 0.62;
const heightOf = (n) => (n <= 0 ? 0 : (n - 1) * STEP + 0.84);

/** Mehrere Pilzlingsturm-Modelle übereinander (je 5 Stufen) als ein Modell. */
function stackedTower(max) {
  const n = Math.max(1, Math.ceil(max / 5));
  const root = new THREE.Group();
  root.name = 'modell:werferturm';
  const parts = [];
  for (let i = 0; i < n; i++) {
    const m = getModel('pilzlingsturm', { count: 5 });
    m.root.position.y = i * 5 * STEP;
    root.add(m.root);
    parts.push(m);
  }
  return {
    root,
    update(dt, st) { parts.forEach((m, i) => m.update?.(dt, { ...st, count: clamp((st.count ?? max) - 5 * i, 0, 5) })); },
    dispose() { for (const m of parts) m.dispose?.(); },
  };
}

class Werferturm extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'werferturm');
    this.max = clamp(Math.round(spec.count ?? 9), 1, 12);
    this.count = this.max;
    this.speed = spec.speed ?? 0.8;
    this.behavior = spec.behavior ?? 'chase';
    this.sight = spec.sight ?? 10;
    this.shadow = 0.55;
    this.hitCool = 0;
    this.half.set(0.42, heightOf(this.count) / 2, 0.42);
    this.rider = null;
    if (level.view) this.setModel(stackedTower(this.max));
    if (spec.rider !== false) {
      const top = this.top();
      const w = level.spawn(spec.weapon === 'hammer' ? 'hammer_werfer' : spec.weapon === 'bumerang' ? 'bumerang_werfer' : 'feuer_werfer', {
        id: spec.riderId, pos: [top.x, top.y, top.z], wake: 999, pace: 0, sight: spec.throwSight ?? 14,
        interval: spec.interval, volley: spec.volley, first: spec.first ?? 1.5, drop: spec.riderDrop,
      });
      if (w) this.attach(w);
    }
  }

  get height() { return heightOf(this.count); }
  top() { return { x: this.pos.x, y: this.pos.y + this.height, z: this.pos.z }; }

  /** Werfer obenauf festhalten: kein Tänzeln, keine Sprünge; nach jedem seiner Schritte zurück auf die Spitze. */
  attach(w) {
    const tower = this;
    this.rider = w;
    w.riding = this;
    const upd = w.update;
    w.paceStep = function paceOnTower() { this.vel.x = 0; this.vel.z = 0; this.grounded = true; };
    w.startJump = function noJump() { this.jumpCool = this.jumpEvery; };
    w.update = function updateOnTower(dt) { upd.call(this, dt); if (tower.rider === this) tower.seat(); };
    this.seat();
  }

  seat() {
    const w = this.rider;
    if (!w) return;
    if (w.removed || w.defeated) { this.rider = null; return; }
    const t = this.top();
    w.pos.set(t.x, t.y, t.z);
    w.vel.set(0, 0, 0);
    w.grounded = true;
    w.home.set(t.x, t.y, t.z);
  }

  /** Werfer springt ab und kämpft am Boden weiter. */
  detach() {
    const w = this.rider;
    this.rider = null;
    if (!w || w.removed || w.defeated) return;
    delete w.paceStep; delete w.startJump; delete w.update;
    w.riding = null;
    w.home.set(this.pos.x, this.pos.y, this.pos.z);
    w.vel.set(1.5, 6, 0);
    w.grounded = false;
    w.setState('jump');
  }

  update(dt) {
    this.stateT += dt;
    if (this.hitCool > 0) this.hitCool -= dt;
    if (!this.updateDefeat(dt)) {
      switch (this.state) {
        case 'idle':
          if (!this.level.player || this.playerDist() < this.wake) this.setState('walk');
          this.stand(dt);
          break;
        case 'walk':
          this.walk(dt, this.speed);
          if (this.behavior === 'chase' && this.canSee(this.sight, 3)) this.setState('chase');
          break;
        case 'chase':
          this.chase(dt, this.speed);
          if (!this.canSee(this.sight * 1.6, 4)) this.setState('walk');
          break;
        default: break;
      }
    }
    this.seat();
  }

  /** Oberste Stufe abnehmen (der Pilzling fliegt seitlich weg), der Werfer sinkt mit. */
  popTop(source) {
    if (this.count <= 0) return;
    const y = this.pos.y + heightOf(this.count) - 0.84;
    this.count--;
    this.hitCool = 0.25;
    const e = this.level.spawn('pilzling', { pos: [this.pos.x, y, this.pos.z], wake: 0, yaw: this.yaw });
    if (e) {
      e.markDefeated = () => { e.defeated = true; };   // zählt nicht als eigener Gegner
      e.flip(null, 5);
      let ax = this.pos.x - (source?.pos?.x ?? this.pos.x), az = this.pos.z - (source?.pos?.z ?? this.pos.z);
      let l = Math.hypot(ax, az);
      if (l < 0.2) { ax = Math.cos(this.yaw); az = -Math.sin(this.yaw); l = 1; }
      e.vel.x = (ax / l) * 2.5; e.vel.z = (az / l) * 2.5;
    }
    this.half.y = Math.max(0.2, heightOf(this.count) / 2);
    this.seat();
    if (this.count <= 0) { this.touch = false; this.detach(); this.markDefeated(); this.kill(); }
  }

  onPlayer(player, contact) {
    if (this.defeated) return 'none';
    if (this.slideAttack(player, contact)) return 'none';
    if (contact.fromAbove || contact.pound) {
      if (this.hitCool <= 0) this.popTop(player);
      return contact.pound ? 'none' : 'stomp';
    }
    if (contact.dive) { this.onHit('claw', player); return 'none'; }
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated) return;
    if (kind === 'bomb' || kind === 'mega' || kind === 'star' || kind === 'bump' || kind === 'cannon') { this.detach(); this.flip(source); return; }
    if (kind === 'pound' && source?.pos && Math.abs(source.pos.y - this.pos.y) > 0.6) return;
    if (this.hitCool > 0) return;
    this.popTop(source);
  }

  modelState() {
    const s = this.state;
    const anim = s === 'walk' || s === 'chase' ? 'walk' : s === 'flipped' ? 'stunned' : 'idle';
    return { anim, speed: anim === 'walk' ? this.speed : 0, count: this.count };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    if (this.state === 'flipped') this.model.root.rotation.z = Math.min(Math.PI / 2, this.stateT * 4);
  }

  info() { return { state: this.state, count: this.count, height: +this.height.toFixed(2), rider: this.rider ? this.rider.state : null, x: +this.pos.x.toFixed(2), z: +this.pos.z.toFixed(2) }; }

  dispose() { if (this.rider) this.detach(); super.dispose(); }
}

export const KINDS = { werferturm: (level, spec) => new Werferturm(level, spec) };
