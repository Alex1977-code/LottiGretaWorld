// Reit-Level „Fluss“ (Bauplan 1-4): Blatt-Floß mit Pflaume und Temposchwelle.
//
// raft – Blatt-Floß, auf dem Pflaume steht; die Heldin reitet auf Pflaume (player.mount). Aufsitzen: auf das Floß
//   springen. Im Sattel trägt die Strömung des Flusses (Baustein river) beide; der Stick lenkt (steer m/s quer zur
//   Strömung), Sprung lässt Floß und Reiterin hüpfen, Rampen werden zu Sprungschanzen, Wasserfälle zu Abstürzen.
//   Berührungen laufen normal (Münzen, Gegner); ein Treffer kostet nur das Power-up/die Größe. Fällt die Figur ins
//   Wasser, wartet das Floß; schwimmend wieder aufspringen. Am Ziel (exit) oder auf einem Strand steigt sie ab.
//   Nach einem Neustart am Checkpoint legt das Floß am nächsten Flusspunkt an (sonst an seinem Start).
//   { kind: 'raft', pos: [x, y, z] (y = Wasseroberfläche), yaw: π/2 (Blick, Standard flussabwärts −z),
//     steer: 4 (m/s Lenken), jump: 9.5 (m/s Hüpfer), exit: [x, y, z] (Absteigepunkt, Radius exitR 3), id? }
//   Beispiel: { kind: 'raft', id: 'floss', pos: [0, 0, -4], exit: [12, -8, -108] }
//
// speedwave – Temposchwelle (Strömungspfeil): fährt das Floß darüber, schießt es für `time` s schneller voran.
//   { kind: 'speedwave', pos: [x, y, z] (Wasseroberfläche), dir: [dx, dz] (Standard: Strömungsrichtung),
//     boost: 7 (m/s zusätzlich), time: 1.4 }
//   Beispiel: { kind: 'speedwave', pos: [0, 0, -30] }
// Modelle 'leaf_raft' (models/kinds/gimmicks.js), Pflaume = PflaumeAvatar (src/three/avatars, Reitpose),
// 'speed_wave'. Die Heldin zeigt im Sattel ihre Reitpose (HeroRig setzt proxy.mount).

import * as THREE from 'three';
import { Gimmick, visDt } from '../gimmick.js';
import { getModel } from '../../models/index.js';
import { createAvatar } from '../../../three/avatars/index.js';

const DECK = 0.2;       // Oberseite des Blatts über der Wasserlinie
const SEAT = 0.5;       // Fußpunkt der Reiterin über Pflaumes Fußpunkt (wie im Klassik-Spiel 0,75 Avatar-Einheiten)
const RAD = 1.3;        // Radius des Floßes (Kollision)
const G = 30;           // Schwerkraft beim Hüpfen/Fallen
const AVATAR_H = 1.5;   // Avatar-Einheiten je Meter-Figur (wie HeroRig)

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const toward = (v, t, d) => v + clamp(t - v, -d, d);

/** Pflaume als Avatar (Klassik-PflaumeAvatar über einen Stellvertreter, wie HeroRig die Heldin). */
function makePflaume(level) {
  const proxy = {
    texture: { key: 'pflaume' }, key: 'pflaume', x: 0, y: 0, width: 0, height: 0, angle: 0, scaleX: 1, scaleY: 1, alpha: 1,
    visible: true, flipX: false, power: 'none', isRidden: false, rider: null, isFleeing: false, stomping: false, hovering: false,
    walking: false, body: { velocity: { x: 0, y: 0 }, blocked: { down: true }, touching: { down: true } },
    course: { state: 'idle', speed: 0, grounded: true },
  };
  let av = null;
  try { av = createAvatar(level.view, proxy); } catch (err) { console.warn('[Floß] Pflaume-Avatar fehlt:', err); }
  const hull = new THREE.Group();
  hull.name = 'pflaume';
  hull.scale.setScalar(1 / AVATAR_H);
  if (av) { av.setCourseMode?.(true); hull.add(av.root); }
  level.view.add(hull);
  return { hull, av, proxy };
}

class Raft extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'raft');
    this.half.set(1.2, 0.3, 1.2);
    this.touch = false;
    this.shadow = 0;
    this.home = this.pos.clone();
    this.homeYaw = spec.yaw ?? Math.PI / 2;
    this.yaw = this.homeYaw;
    this.steer = spec.steer ?? 4;
    this.jumpV = spec.jump ?? 9.5;
    const e = spec.exit;
    this.exit = e ? { x: e[0], y: e[1], z: e[2], r: spec.exitR ?? 3 } : null;
    this.vy = 0; this.air = false; this.climb = 0; this.onWater = true;
    this.boostT = 0; this.boostV = 0; this.boostDir = { x: 0, z: 0 }; this.boostCool = 0;
    this.rider = null; this.landT = 0; this.parked = false; this.wasDead = false; this.mountCool = 0;
    this.mv = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: 0, cz: 0 };
    const p = this.pos;
    this.shape = this.addSolid({ type: 'cyl', x: p.x, z: p.z, r: RAD, y0: p.y - 0.25, y1: p.y + DECK, mover: this.mv, camIgnore: true, tag: 'raft' });
    this._wc = new THREE.Vector3();
    this.avatarMount = { hovering: false };
    if (level.view) {
      this.setModel(getModel('leaf_raft'));
      this.pfl = makePflaume(level);
    }
  }

  /** Der Fluss unter/nahe dem Floß (oder null). */
  river() {
    const rs = this.level.rivers;
    if (!rs?.length) return null;
    let best = null, bd = Infinity;
    for (const r of rs) { const n = r.nearest(this.pos.x, this.pos.z); if (n && n.d < bd) { bd = n.d; best = r; } }
    return bd <= best.width / 2 + 2 ? best : null;
  }

  /** Boden unter (x, z): Wasseroberfläche des Flusses oder feste Form (höchste gewinnt). */
  floorAt(x, z) {
    let floor = -Infinity, water = false;
    const r = this.river();
    if (r) { const n = r.nearest(x, z); if (n && n.d <= r.width / 2 + 0.6) { floor = n.y - 0.05; water = true; } }
    const w = this.level.world, k = RAD * 0.45;
    const ign = (s) => s.owner === this || s.water;
    for (const [ox, oz] of [[0, 0], [k, 0], [-k, 0], [0, k], [0, -k]]) {
      const h = w.raycastDown(x + ox, this.pos.y + 0.6, z + oz, 80, { ignore: ign });
      if (h && h.y > floor + 0.02) { floor = h.y; water = false; }
    }
    return { floor, water };
  }

  /** Temposchwelle: kurzzeitig schneller in Richtung dir. */
  boost(dir, v, t) {
    if (this.boostCool > 0) return;
    const l = Math.hypot(dir.x, dir.z) || 1;
    this.boostDir.x = dir.x / l; this.boostDir.z = dir.z / l;
    this.boostV = v; this.boostT = t; this.boostCool = 0.5;
    this.level.sfx('boost');
    this.level.effects?.splash(this.pos, this.pos.y + 0.1);
  }

  /** Draufspringen auf einen Gegner im Sattel: Floß hüpft. */
  bounce(input) { this.vy = input?.jump ? 11 : 9; this.air = true; }

  onDismount() { this.rider = null; }

  /** Steuerung im Sattel (aus Player.updateMount, vor den Entitäten). */
  control(p, dt, input, want) {
    this.rider = p;
    const r = this.river();
    let tx = 0, tz = 0;
    if (r && this.onWater) { const f = r.flowAt(this.pos.x, this.pos.z); tx = f.x; tz = f.z; }
    if (want.mag > 0.1 && (this.onWater || this.air)) { const k = this.steer * Math.min(1, want.mag / 0.85); tx += want.x * k; tz += want.z * k; }
    if (this.boostT > 0) { const k = Math.min(1, this.boostT / 0.4); tx += this.boostDir.x * this.boostV * k; tz += this.boostDir.z * this.boostV * k; }
    const acc = (this.air ? 3 : this.onWater ? 9 : 14) * dt;
    this.vel.x = toward(this.vel.x, this.onWater || this.air ? tx : 0, acc);
    this.vel.z = toward(this.vel.z, this.onWater || this.air ? tz : 0, acc);
    if (input.jumpPressed && !this.air) { this.vy = this.jumpV; this.air = true; this.level.sfx('jump'); this.level.effects?.splash(this.pos, this.pos.y + 0.1); }
    this.physics(dt);
    p.pos.set(this.pos.x, this.pos.y + DECK + SEAT, this.pos.z);
    p.vel.set(this.vel.x, this.air ? this.vy : 0, this.vel.z);
    p.yaw = this.yaw;
    p.setState(this.air ? 'jump' : 'ride');
    // Absteigen: am Ziel oder auf festem Land
    const atExit = this.exit && Math.hypot(this.pos.x - this.exit.x, this.pos.z - this.exit.z) <= this.exit.r && !this.air;
    if (atExit || this.landT > 0.35) {
      const f = { x: Math.cos(this.yaw), z: -Math.sin(this.yaw) };
      this.parked = true;
      this.mountCool = 1.2;
      this.vel.set(0, 0, 0);
      p.dismount(f.x * 5, 9, f.z * 5);
      this.level.sfx('mount');
    }
    return true;
  }

  /** Bewegung: waagerecht mit Wänden (Ufer, Felsen), senkrecht auf Wasser/Boden, Hüpfen, Schanzen, Abstürze. */
  physics(dt) {
    const ox = this.pos.x, oy = this.pos.y, oz = this.pos.z;
    if (this.boostT > 0) this.boostT -= dt;
    if (this.boostCool > 0) this.boostCool -= dt;
    // waagerecht: Quader 0,5 m über der Wasserlinie (niedrige Schanzen/Strände sind keine Wand)
    const c = this._wc.set(ox, oy + 0.5 + 0.35, oz);
    const res = this.level.world.moveAABB(c, { x: 1.0, y: 0.35, z: 1.0 }, { x: this.vel.x * dt, y: 0, z: this.vel.z * dt }, { step: 0, ignore: (s) => s.owner === this });
    if (res.hitWall) {
      const n = res.wallNormal, d = this.vel.x * n.x + this.vel.z * n.z;
      if (d < 0) { this.vel.x -= n.x * d * 1.4; this.vel.z -= n.z * d * 1.4; }
    }
    this.pos.x = c.x; this.pos.z = c.z;
    // senkrecht
    const f = this.floorAt(this.pos.x, this.pos.z);
    if (this.air) {
      this.vy = Math.max(this.vy - G * dt, -24);
      this.pos.y += this.vy * dt;
      if (this.vy <= 0 && this.pos.y <= f.floor) {
        this.pos.y = f.floor;
        if (this.vy < -7 && f.water) { this.level.effects?.splash(this.pos, f.floor + 0.1); this.level.sfx('splash'); }
        this.vy = 0; this.air = false;
      }
    } else {
      const dy = f.floor - this.pos.y;
      if (dy >= -0.08 && dy <= 0.7) {
        this.climb = this.climb * 0.8 + (dy / dt) * 0.2;
        this.pos.y = f.floor;
      } else if (dy < -0.08) {
        // Boden weg (Schanzenende, Wasserfall): mit der Steiggeschwindigkeit abheben
        this.air = true;
        this.vy = Math.max(0, this.climb);
        this.climb = 0;
      }
    }
    this.onWater = f.water;
    this.landT = !this.air && !f.water ? this.landT + dt : 0;
    if (this.pos.y < this.level.killY) this.goHome();
    // Blickrichtung in Fahrtrichtung
    const sp = Math.hypot(this.vel.x, this.vel.z);
    if (sp > 0.6) {
      let d = Math.atan2(-this.vel.z, this.vel.x) - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * Math.min(1, dt * 4);
    }
    // Kollisionsform und Mitnahme
    const m = this.mv;
    m.dx = this.pos.x - ox; m.dy = this.pos.y - oy; m.dz = this.pos.z - oz;
    m.vx = m.dx / dt; m.vy = m.dy / dt; m.vz = m.dz / dt; m.cx = this.pos.x; m.cz = this.pos.z;
    const s = this.shape;
    s.x = this.pos.x; s.z = this.pos.z; s.y0 = this.pos.y - 0.25; s.y1 = this.pos.y + DECK;
    if (this.shapes[0]) this.level.world.update(this.shapes[0]);
  }

  /** An den Start (bzw. an einen Punkt) zurück. */
  goHome(at = null) {
    const h = at ?? this.home;
    this.pos.set(h.x, h.y, h.z);
    this.vel.set(0, 0, 0); this.vy = 0; this.air = false; this.climb = 0; this.landT = 0; this.parked = false;
    this.yaw = this.homeYaw;
    this.physics(1 / 120);
  }

  update(dt) {
    const p = this.level.player;
    if (this.rider && (p.mode !== 'mount' || p.mountObj !== this)) this.rider = null;
    // Neustart am Checkpoint: Floß legt am nächsten Flusspunkt an
    if (p) {
      if (this.wasDead && !p.dead && !this.rider) {
        const r = this.level.rivers?.[0] ? this.level.rivers.reduce((a, b) => (b.nearest(p.pos.x, p.pos.z).d < a.nearest(p.pos.x, p.pos.z).d ? b : a)) : null;
        const n = r?.nearest(p.pos.x, p.pos.z);
        this.goHome(n && n.d < 14 ? { x: n.x, y: n.y - 0.05, z: n.z } : null);
      }
      this.wasDead = p.dead;
    }
    // Aufsitzen: auf dem Floß gelandet (nicht gleich nach dem Absteigen am Ziel)
    if (this.mountCool > 0) this.mountCool -= dt;
    if (!this.rider && this.mountCool <= 0 && p && !p.dead && p.mode === 'ground' && p.ground?.owner === this) {
      this.rider = p; this.parked = false; this.landT = 0;
      p.mount(this);
      this.level.sfx('mount');
      return;
    }
    if (this.rider) return; // bewegt sich in control() (Player.updateMount)
    // ohne Reiterin: treibt nicht ab, wartet (nur ausrollen, schwimmen, fallen)
    const k = Math.exp(-3 * dt);
    this.vel.x *= k; this.vel.z *= k;
    this.physics(dt);
  }

  modelState() { return { tilt: clamp((this.vel.x * Math.sin(this.yaw) + this.vel.z * Math.cos(this.yaw)) * 0.02, -0.15, 0.15), bob: this.air ? 0 : 1 }; }

  render(dt, t) {
    super.render(dt, t);
    const pf = this.pfl;
    if (!pf) return;
    pf.hull.position.set(this.pos.x, this.pos.y + DECK, this.pos.z);
    pf.hull.rotation.y = this.yaw;
    const pr = pf.proxy;
    const heroProxy = this.level.scene?.rig?.proxy ?? null;
    pr.isRidden = !!this.rider && !!heroProxy;
    pr.rider = pr.isRidden ? heroProxy : null;
    const sp = Math.hypot(this.vel.x, this.vel.z);
    pr.course.state = this.rider ? (sp > 0.5 ? 'paddle' : 'ride') : 'idle';
    pr.course.speed = sp;
    if (pf.av) {
      try { pf.av.animate(visDt(this.level, pf, dt), t); } catch (err) { console.error('Pflaume-Animation:', err); pf.av = null; return; }
      pf.av.root.rotation.y = -pf.av.model.rotation.y; // 3/4-Drehung der Klassik-Ansicht ausgleichen → Blick +X
    }
  }

  dispose() {
    if (this.pfl) { this.level.view?.remove(this.pfl.hull); this.pfl.av?.dispose?.(); this.pfl = null; }
    if (this.rider?.mountObj === this) this.rider.mountObj = null;
    super.dispose();
  }
}

class SpeedWave extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'speedwave');
    this.touch = false;
    this.boostV = spec.boost ?? 7;
    this.time = spec.time ?? 1.4;
    this.dir = spec.dir ? { x: spec.dir[0], z: spec.dir[1] } : null;
    if (this.dir) this.yaw = Math.atan2(-this.dir.z, this.dir.x);
    if (level.view) this.setModel(getModel('speed_wave'));
  }

  update() {
    if (!this.dir) {
      const r = this.level.rivers?.[0] && this.level.rivers.reduce((a, b) => (b.nearest(this.pos.x, this.pos.z).d < a.nearest(this.pos.x, this.pos.z).d ? b : a));
      const f = r ? r.flowAt(this.pos.x, this.pos.z) : { x: 0, z: -1 };
      this.dir = Math.hypot(f.x, f.z) > 0.1 ? { x: f.x, z: f.z } : { x: 0, z: -1 };
      this.yaw = Math.atan2(-this.dir.z, this.dir.x);
    }
    for (const e of this.level.entities) {
      if (e.kind !== 'raft' || !e.alive) continue;
      if (Math.abs(e.pos.x - this.pos.x) < 1.6 && Math.abs(e.pos.z - this.pos.z) < 1.6 && Math.abs(e.pos.y - this.pos.y) < 1.2) e.boost(this.dir, this.boostV, this.time);
    }
  }
}

export const KINDS = {
  raft: (level, spec) => new Raft(level, spec),
  speedwave: (level, spec) => new SpeedWave(level, spec),
};
