// Pilzlinge Welt 3: Eisläufer-Pilzling (3-1) und Reifen-Pilzling (3-5).
//
// pilzling_eis – Eisläufer-Pilzling: gleitet schnell in weiten Bögen (Lenkung mit begrenzter Drehrate, auf Eis kaum
//   Reibung): auf einer Bahn (path, Runde), im Kreis/Oval um center (radius, rz) oder im Slalom geradeaus (Bögen um
//   dir). behavior 'chase': sieht er eine Figur (sight), fährt er in Bögen auf sie zu (überholt sich, wendet weit).
//   Abseits vom Eis läuft er langsam (eigene Gleitphysik, noIce). Draufspringen → besiegt (platt) und er **lässt einen
//   Schlittschuh zurück** (Entität 'schlittschuh' des Motors an seiner Stelle; fehlt sie, Rückfall: 3 Münzen, skateDrop
//   'fehlt').
//   Mit ride: true trägt er eine Einweg-Oberseite: man landet auf ihm und **fährt mit** (Bauplan 3-1); die
//   Stampfattacke auf ihm besiegt ihn (Schlittschuh). Seitlich = Treffer. Feuer, Krallen, Panzer, Wurf, Biss,
//   Rutschen, Schwanzhieb, Kanonenkugel, Explosion, Riesentrank, Funkelstern besiegen ihn (fliegt weg, Schlittschuh
//   bleibt nur beim Draufspringen/Stampfen – Standard skate: 'stomp'; skate: 'always' | false).
//   Daten: { kind: 'pilzling_eis', pos, path?, loop?, center?, radius?: 4, rz? (Oval), cw?: false, dir?,
//            speed?: 4.2 (Eis), walk?: 1.4 (ohne Eis), turn?: 2.2 rad/s (Lenkung), slalom?: 1.2 (Bogenweite rad),
//            behavior?: 'skate' | 'chase', sight?: 9, ride?: false, skate?: 'stomp', edges?: true, wake?, drop? }
//   Zustände: idle → skate | walk → alert (0,4 s, „!“) → chase …; squashed | flipped. Laufzeit: riders, skateDrop.
//   Modell 'pilzling_eis' (state { anim: skate|walk|idle|alert|spin|squashed|stunned, speed }).
//
// pilzling_reifen – Reifen-Pilzling: treibt im Schwimmreifen auf dem Wasser (Ursprung = Wasserlinie, folgt steigendem
//   Wasser) und paddelt zur nächsten Figur in Sichtweite – nur so weit das Wasser reicht. Draufspringen → platt
//   (Abprall), seitliche Berührung (auch schwimmend) = Treffer. Feuer, Krallen … wie oben.
//   Daten: { kind: 'pilzling_reifen', pos (y = Wasseroberfläche; ohne Wasser bleibt er auf dieser Höhe), speed?: 1.6,
//            sight?: 8, path? (treibt ohne Figur auf der Bahn), wake?, drop? }
//   Zustände: float → paddle (Figur in Sicht) …; squashed | flipped. Modell 'pilzling_reifen'
//   (state { anim: float|paddle|squashed|stunned, speed }).

import * as THREE from 'three';
import { EnemyW2, STRONG, wrapAngle, waterAt, activeFigure, spawnLoot } from '../EnemyW2.js';
import { PathMover } from '../../level/PathMover.js';
import { getModel } from '../../models/index.js';

const H = 0.48;           // halbe Höhe (≈ 0,95 m)

// =====================================================================================================================
// Eisläufer-Pilzling
// =====================================================================================================================
class PilzlingEis extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'pilzling_eis');
    this.half.set(0.4, H, 0.4);
    this.shadow = 0.48;
    this.skateSpeed = spec.speed ?? 4.2;
    this.walkSpeed = spec.walk ?? 1.4;
    this.turnRate = spec.turn ?? 2.2;
    this.slalom = spec.slalom ?? 1.2;
    this.behavior = spec.behavior ?? 'skate';
    this.sight = spec.sight ?? 9;
    this.skateMode = spec.skate ?? 'stomp';
    this.ride = !!spec.ride;
    this.heading = Math.atan2(-this.dir.z, this.dir.x);
    this.baseHeading = this.heading;
    this.cur = 0;            // aktuelle Bahngeschwindigkeit
    this.riders = 0;
    this.skateDrop = null;
    this.circle = null;
    this.mover = null;
    if (spec.center) {
      const c = spec.center;
      this.circle = { x: c[0], z: c[2], r: spec.radius ?? 4, rz: spec.rz ?? spec.radius ?? 4, cw: !!spec.cw, a: 0 };
      // Start auf dem Kreis (Winkel aus pos)
      this.circle.a = Math.atan2(-(this.pos.z - c[2]) / this.circle.rz, (this.pos.x - c[0]) / this.circle.r);
    }
    this.wp = this.path ? 1 : 0;
    this.shapeId = null;
    if (this.ride) {
      this.mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: this.pos.x, cz: this.pos.z };
      this.shapeId = this.addShape({ type: 'box', min: [0, 0, 0], max: [1, 1, 1], oneWay: true, mover: this.mover, camIgnore: true, ice: false, tag: 'pilzling_eis' });
      this.syncShape();
    }
    this._ownIgnore = (s) => s.owner === this;
    this.noIce = true;          // eigene Gleitphysik (entities/ice.js nicht zusätzlich)
    this.yaw = this.heading;
    if (level.view) this.setModel(getModel('pilzling_eis'));
    this.initShadows(2);
  }

  syncShape() {
    const sh = this.shapeId !== null ? this.level.world.get(this.shapeId) : null;
    if (!sh) return;
    const p = this.pos;
    sh.min = [p.x - 0.42, p.y + 0.62, p.z - 0.42];
    sh.max = [p.x + 0.42, p.y + 0.92, p.z + 0.42];
    this.level.world.update(this.shapeId);
  }

  get onIce() { return !!this.ground?.ice || (!this.grounded && this.wasIce); }

  /** Gewünschte Fahrtrichtung (Gier) je nach Fahrweise. */
  wantHeading() {
    if (this.state === 'chase') {
      const p = this.player;
      return Math.atan2(-(p.pos.z - this.pos.z), p.pos.x - this.pos.x);
    }
    if (this.path) {
      const t = this.path[this.wp];
      const dx = t.x - this.pos.x, dz = t.z - this.pos.z;
      if (Math.hypot(dx, dz) < 1.4) { this.wp = (this.wp + 1) % this.path.length; }
      const u = this.path[this.wp];
      return Math.atan2(-(u.z - this.pos.z), u.x - this.pos.x);
    }
    if (this.circle) {
      // Zielpunkt etwas voraus auf dem Oval
      const c = this.circle, s = c.cw ? -1 : 1;
      const a = Math.atan2(-(this.pos.z - c.z) / c.rz, (this.pos.x - c.x) / c.r) + s * 0.55;
      const tx = c.x + Math.cos(a) * c.r, tz = c.z - Math.sin(a) * c.rz;
      return Math.atan2(-(tz - this.pos.z), tx - this.pos.x);
    }
    // Slalom: Bögen um die Grundrichtung
    return this.baseHeading + Math.sin(this.level.time * 1.3 + this.pos.x * 0.1) * this.slalom;
  }

  update(dt) {
    this.stateT += dt;
    if (this.updateDefeat(dt)) { this.syncRide(dt, true); return; }
    switch (this.state) {
      case 'idle':
        this.stand(dt);
        if (!this.level.player || this.playerDist() < this.wake) this.setState('skate');
        break;
      case 'skate':
      case 'chase':
        this.drive(dt);
        if (this.state === 'skate' && this.behavior === 'chase' && this.canSee(this.sight, 2.5)) { this.setState('alert'); this.vel.y = 3.5; this.grounded = false; }
        else if (this.state === 'chase' && !this.canSee(this.sight * 1.7, 3.5)) this.setState('skate');
        break;
      case 'alert':
        this.vel.x *= Math.max(0, 1 - dt * 3); this.vel.z *= Math.max(0, 1 - dt * 3);
        this.moveWithGravity(dt);
        this.facePlayer(dt, 10);
        if (this.stateT > 0.4 && this.grounded) { this.heading = this.yaw; this.setState('chase'); }
        break;
      default: break;
    }
    this.syncRide(dt, false);
  }

  /** Fahren: Richtung mit begrenzter Drehrate, Tempo weich (auf Eis wenig Reibung). */
  drive(dt) {
    const ice = this.onIce;
    const want = this.wantHeading();
    const d = wrapAngle(want - this.heading), m = this.turnRate * dt * (ice ? 1 : 2);
    this.heading += Math.max(-m, Math.min(m, d));
    const target = ice ? this.skateSpeed : this.walkSpeed;
    this.cur += Math.max(-6 * dt, Math.min((ice ? 2.5 : 8) * dt, target - this.cur));
    let hx = Math.cos(this.heading), hz = -Math.sin(this.heading);
    // Kante voraus: wenden (auf Eis weiter Bogen, sonst sofort)
    if (this.edges && this.grounded && this.turnCooldown <= 0 && !this.groundAhead(hx, hz, 0.25 + this.cur * 0.12, 1.1)) {
      this.heading = wrapAngle(this.heading + Math.PI);
      this.baseHeading = wrapAngle(this.baseHeading + Math.PI);
      this.vel.x *= -0.3; this.vel.z *= -0.3;
      this.cur *= 0.5;
      this.turnCooldown = 0.4;
      hx = Math.cos(this.heading); hz = -Math.sin(this.heading);
    }
    if (this.turnCooldown > 0) this.turnCooldown -= dt;
    // Eis: Geschwindigkeit dreht nur langsam mit (Driften), sonst direkt
    const k = ice ? Math.min(1, dt * 3) : 1;
    this.vel.x += (hx * this.cur - this.vel.x) * k;
    this.vel.z += (hz * this.cur - this.vel.z) * k;
    const res = this.moveWithGravity(dt);
    if (this.grounded) this.wasIce = !!this.ground?.ice;
    if (res.hitWall && res.wallNormal) {
      const n = res.wallNormal, hd = hx * n.x + hz * n.z;
      if (hd < 0) { const rx = hx - 2 * hd * n.x, rz = hz - 2 * hd * n.z; this.heading = Math.atan2(-rz, rx); this.baseHeading = wrapAngle(this.baseHeading + Math.PI); this.cur *= 0.7; }
    }
    this.yaw = this.heading;
  }

  /** Reit-Oberseite mitführen (mover = Verschiebung dieses Schritts). */
  syncRide(dt, off) {
    if (!this.mover) return;
    const m = this.mover;
    if (off) { if (this.shapeId !== null) { this.removeShapes(); this.shapeId = null; } return; }
    const sh = this.level.world.get(this.shapeId);
    const ox = sh ? (sh.min[0] + sh.max[0]) / 2 : this.pos.x, oz = sh ? (sh.min[2] + sh.max[2]) / 2 : this.pos.z;
    const oy = sh ? sh.min[1] - 0.62 : this.pos.y;
    m.dx = this.pos.x - ox; m.dy = this.pos.y - oy; m.dz = this.pos.z - oz;
    m.vx = m.dx / dt; m.vy = m.dy / dt; m.vz = m.dz / dt;
    this.syncShape();
  }

  /** Stampfattacke landet auf der Reit-Oberseite. */
  onPound(player) { if (!this.defeated) { this.defeat(player, 'stomp'); this.level.sfx('stomp'); } }

  /** Steht eine Figur auf ihm (Reiten)? */
  riding(p) { return this.ride && p.mode === 'ground' && p.ground?.owner === this; }

  onPlayer(player, contact) {
    if (this.defeated) return 'none';
    if (this.riding(player)) {
      if (contact.pound || player.state === 'groundpound') { this.defeat(player, 'stomp'); this.level.sfx('stomp'); }
      return 'none';
    }
    if (this.ride && player.pos.y >= this.pos.y + 0.8 && player.vel.y <= 0.5) return 'none';   // landet gleich oben
    if (this.slideAttack(player, contact)) return 'none';
    if (contact.pound) { this.defeat(player, 'stomp'); return 'none'; }
    if (contact.fromAbove) { this.defeat(player, 'stomp'); return 'stomp'; }
    if (contact.dive) { this.onHit('claw', player); return 'none'; }
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated || kind === 'bump') return;
    if (kind === 'pound') {
      // Stampfwelle: auf gleicher Höhe daneben oder oben auf ihm (Reiten) = platt; sonst nichts
      const dy = source?.pos ? source.pos.y - this.pos.y : 0;
      if (Math.abs(dy) < 0.6 || (dy > 0.5 && dy < 1.4)) { this.defeat(source, 'stomp'); this.level.sfx('stomp'); }
      return;
    }
    this.defeat(source, STRONG.has(kind) ? 'strong' : 'hit');
  }

  /** Besiegt: platt (Draufspringen) bzw. wegfliegen; Schlittschuh bleibt zurück. */
  defeat(source, how) {
    if (this.defeated) return;
    const x = this.pos.x, y = this.pos.y, z = this.pos.z;
    if (how === 'stomp') this.squash(); else this.flip(source);
    if (this.skateMode === 'always' || (this.skateMode !== false && how === 'stomp')) this.dropSkate(x, y, z);
    this.syncRide(0, true);
  }

  dropSkate(x, y, z) {
    if (this.skateDrop) return;
    if (this.level.hasKind('schlittschuh')) {
      // Entität des Motors (liegt, funkelt; verloren → nach 4 s wieder an dieser Stelle)
      const e = this.level.spawn('schlittschuh', { pos: [x, y + 0.05, z], yaw: this.yaw });
      this.skateDrop = e ? 'schlittschuh' : 'fehlt';
      this.skateEntity = e;
    } else {
      // Rückfall, solange der Motor den Schlittschuh noch nicht hat: Münzen als Platzhalter
      spawnLoot(this.level, 'coins:3', x, y, z);
      this.skateDrop = 'fehlt';
      if (!PilzlingEis.warned) { PilzlingEis.warned = true; console.info('[pilzling_eis] Entität schlittschuh fehlt – Münzen als Platzhalter'); }
    }
  }

  modelState() {
    const s = this.state;
    if (s === 'squashed') return { anim: 'squashed' };
    if (s === 'flipped') return { anim: 'stunned' };
    if (s === 'alert') return { anim: 'alert' };
    if (s === 'idle') return { anim: 'idle' };
    const sp = Math.hypot(this.vel.x, this.vel.z);
    return { anim: this.onIce ? 'skate' : 'walk', speed: sp };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    const r = this.model.root;
    // in die Kurve legen
    r.rotation.x = 0;
    r.rotation.z = this.state === 'flipped' ? Math.PI : 0;
  }

  info() {
    return { state: this.state, speed: +Math.hypot(this.vel.x, this.vel.z).toFixed(2), ice: this.onIce, x: +this.pos.x.toFixed(2), z: +this.pos.z.toFixed(2), skate: this.skateDrop, defeated: this.defeated };
  }
}

// =====================================================================================================================
// Reifen-Pilzling
// =====================================================================================================================
class PilzlingReifen extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'pilzling_reifen');
    // Hülle: Reifen in der Wasserlinie (Ursprung = Wasserlinie), Hut bis ≈ 0,62 m darüber
    this.half.set(0.48, 0.42, 0.48);
    this.shadow = 0;
    this.speed = spec.speed ?? 1.6;
    this.sight = spec.sight ?? 8;
    this.state = 'float';
    this.cur = new THREE.Vector2();
    this.surface = this.pos.y;
    this.mover = spec.path?.length >= 2
      ? new PathMover(spec.path, { speed: this.speed * 0.6, mode: (spec.loop ?? spec.path.length >= 3) ? 'loop' : 'pingpong', wait: 0.6 })
      : null;
    if (this.mover) { const p = this.mover.pos; this.pos.x = p.x; this.pos.z = p.z; }
    this.findSurface();
    if (level.view) this.setModel(getModel('pilzling_reifen'));
    this.initShadows(1);
  }

  /** Fußpunkt der Hülle liegt 0,22 m unter der Wasserlinie (Stiel im Wasser). */
  get line() { return this.pos.y + 0.22; }

  findSurface() {
    const w = waterAt(this.level, this.pos.x, this.line, this.pos.z, 1.2);
    if (w) this.surface = w.top;
    this.pos.y = this.surface - 0.22;
    return w;
  }

  /** Liegt (x, z) im Wasser (gleiche Oberfläche ±0,3 m) und ohne Hindernis in der Wasserlinie (Steg, Mauer)? */
  wet(x, z) {
    const w = waterAt(this.level, x, this.surface, z, 0.6);
    if (!w || Math.abs(w.top - this.surface) >= 0.35) return false;
    return !this.level.world.overlapAABB({ x, y: this.surface + 0.25, z }, { x: 0.12, y: 0.2, z: 0.12 }).some((s) => s.solid && !s.water && s.owner !== this);
  }

  update(dt) {
    this.stateT += dt;
    if (this.state === 'squashed') {
      // sinkt mit dem Reifen langsam ein
      this.pos.y -= dt * 0.5;
      if (this.stateT > 0.8) this.kill();
      return;
    }
    if (this.updateDefeat(dt)) return;
    this.findSurface();
    const p = this.player;
    let tx = 0, tz = 0;
    if (activeFigure(p) && this.playerDist() < this.sight && Math.abs(p.pos.y - this.surface) < 3) {
      const t = this.toPlayer(this._tp ?? (this._tp = {}));
      if (t.d > 0.3) { tx = t.x * this.speed; tz = t.z * this.speed; }
      if (this.state !== 'paddle') this.setState('paddle');
    } else {
      if (this.state !== 'float') this.setState('float');
      if (this.mover) {
        const ox = this.mover.pos.x, oz = this.mover.pos.z;
        this.mover.step(dt);
        tx = (this.mover.pos.x - ox) / dt; tz = (this.mover.pos.z - oz) / dt;
      }
    }
    // weich beschleunigen (Wasser)
    const k = Math.min(1, dt * 2.5);
    this.cur.x += (tx - this.cur.x) * k; this.cur.y += (tz - this.cur.y) * k;
    const nx = this.pos.x + this.cur.x * dt, nz = this.pos.z + this.cur.y * dt;
    const ahead = 0.55;
    const l = Math.hypot(this.cur.x, this.cur.y) || 1;
    if (this.wet(nx + (this.cur.x / l) * ahead, nz + (this.cur.y / l) * ahead)) { this.pos.x = nx; this.pos.z = nz; }
    else { this.cur.set(0, 0); }
    if (l > 0.2) this.faceToward(this.cur.x, this.cur.y, dt, 5);
  }

  onPlayer(player, contact) {
    if (this.defeated) return 'none';
    if (this.slideAttack(player, contact)) return 'none';
    if (contact.pound) { this.squashIt(); return 'none'; }
    if (contact.fromAbove) { this.squashIt(); return 'stomp'; }
    if (contact.dive) { this.onHit('claw', player); return 'none'; }
    return 'hurt';
  }

  squashIt() {
    this.squash(0.8);
    this.level.effects?.splash?.(this.pos, this.surface);
    this.level.sfx('splash');
  }

  onHit(kind, source) {
    if (this.defeated || kind === 'bump') return;
    if (kind === 'pound' && source?.pos && Math.abs(source.pos.y - this.line) < 0.8) { this.squashIt(); return; }
    this.flip(source, 7);
  }

  modelState() {
    const s = this.state;
    if (s === 'squashed') return { anim: 'squashed' };
    if (s === 'flipped') return { anim: 'stunned' };
    return { anim: s === 'paddle' ? 'paddle' : 'float', speed: Math.hypot(this.cur.x, this.cur.y) };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    const r = this.model.root;
    r.position.y = this.line;
    r.rotation.z = this.state === 'flipped' ? Math.PI : 0;
  }

  info() { return { state: this.state, x: +this.pos.x.toFixed(2), y: +this.line.toFixed(2), z: +this.pos.z.toFixed(2), surface: +this.surface.toFixed(2), defeated: this.defeated }; }
}

export const KINDS = {
  pilzling_eis: (level, spec) => new PilzlingEis(level, spec),
  pilzling_reifen: (level, spec) => new PilzlingReifen(level, spec),
};
