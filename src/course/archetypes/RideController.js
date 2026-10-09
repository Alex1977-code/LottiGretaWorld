// Spielfigur des Reit-Levels (Archetyp `ride`, Präzisierung Ritt/Diorama): Unterklasse von Player.
//
// Zu Fuß (Steg am Start, Strand am Ende) gilt das normale Bewegungsset (Player). Auf dem Blatt-Floß („riding“)
// rechnet sie eigene Floß-Physik über das Fluss-Netz `level.river` (RiverNet), keine Kollisionsformen:
//   - Strömung trägt flussabwärts (Tempo je Kanalpunkt); Stick lenkt quer (5,6 m/s) und bremst/beschleunigt längs
//     (±35 % des Strömungstempos) – relativ zur Kamera (level.controlYaw), zerlegt in Fließrichtung/quer.
//   - A = Floß-Hüpfer (1,6 m, Lotti ×1,08; gehalten höher), Rampen schleudern (kick), Temposchwellen beschleunigen.
//   - Ufer (Kanal-Korridore) und Felsen blockieren mit Abprall; Rampen-Seiten ebenso.
//   - Kaskaden und die Klippe: Oberfläche fällt weg → freier Fall (ab 4 m Fall „plunging“: langsamere Schwerkraft,
//     damit der Absturz wirkt; Kamera folgt), Landung mit großer Gischt.
//   - Treffer (aufgetauchter Wühler seitlich): Power-up → keines, groß → klein, klein → Tod; Stoß zur Seite, kleiner
//     Hopser, Figur bleibt auf dem Floß. Draufspringen (von oben) besiegt den Wühler und federt ab.
// Auf-/Absteigen als Skriptabläufe: am Steg genügt es, das wartende Floß zu berühren (oder ins Wasser zu fallen);
// im Strand-Bereich springt die Heldin automatisch an Land (Floß bleibt liegen).
//
// Daten (LEVEL.ride): raft: [x, y, z] (wartendes Floß), raftYaw, dock: { min: [x, z], max: [x, z] } (zu Fuß),
//   beach: { min, max, land: [x, y, z] (Landepunkt), raft?: [x, y, z] } (Absteigen).
// Zusätzliche Felder: riding, raftPos, raftMoored, dismounted, plunging, boostTime, bumpTime, landImpact, flow (letzte
// Abfrage), camYaw (Kamera-Gier, in Simulationsschritten geglättet – deterministische Steuerung).

import * as THREE from 'three';
import { Player } from '../player/Player.js';
import { MOVE, vFor } from '../player/moveset.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const approach = (v, t, d) => (v < t ? Math.min(t, v + d) : Math.max(t, v - d));
const TAU = Math.PI * 2;
const wrap = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; else if (a < -Math.PI) a += TAU; return a; };
const turnToward = (a, b, max) => { const d = wrap(b - a); return Math.abs(d) <= max ? b : a + Math.sign(d) * max; };

export const RIDE = {
  radius: 0.62,            // m Floß-Kreis (Ufer, Felsen)
  halfBig: { x: 0.62, y: 0.72, z: 0.62 },    // Hülle für Berührungen: Floß + Pflaume + Heldin (groß)
  halfSmall: { x: 0.62, y: 0.6, z: 0.62 },
  steer: 5.6,              // m/s quer bei vollem Ausschlag
  steerAccel: 20,          // m/s² Lenken
  latDrag: 9,              // m/s² Querdrift abbauen ohne Lenken
  alongRate: 2.6,          // 1/s Angleichen an das Strömungstempo
  brake: 0.35,             // Anteil der Strömung, um den der Stick bremst/beschleunigt
  hop: 1.6,                // m Floß-Hüpfer
  gUp: 24, gRelease: 34, gFall: 30, maxFall: 22,
  plungeG: 16, plungeMax: 18,
  kickHeld: 2.6,           // m/s zusätzlicher Rampen-Schwung mit gehaltener Sprungtaste
  bankBounce: 0.45, rockBounce: 0.6,
  boostTime: 1.15,         // s Schub einer Temposchwelle
  mountTime: 0.5, dismountTime: 0.65,
};

const inZone = (z, x, zz) => !!z && x >= z.min[0] && x <= z.max[0] && zz >= z.min[1] && zz <= z.max[1];

export class RideController extends Player {
  constructor(level, opts = {}) {
    super(level, opts);
  }

  get net() { return this.level.river ?? null; }
  get cfg() { return this.level.data?.ride ?? {}; }

  initRide() {
    if (this.raftPos) return;
    this.raftPos = new THREE.Vector3();
    this.raftYaw = Math.PI / 2;
    this.flow = { dx: 0, dz: -1, speed: 0, y: 0, ok: false };
    this._f = {}; this._g = {}; this._rc = {}; this._ld = {};
    this.camYaw = 0;
    this.boostAmt = 0;
  }

  /** Auf einen Punkt setzen: Steg/Strand → zu Fuß; im Fluss → sofort auf dem Floß (Checkpoint, Teleport). */
  reset(p, yaw) {
    super.reset(p, yaw);
    this.initRide();
    this.riding = false;
    this.plunging = false;
    this.boostTime = 0; this.bumpTime = 0; this.bumpCd = 0; this.landImpact = 0; this.hopTime = 0;
    this.takeoffY = this.pos.y;
    this.onRamp = null;
    const cfg = this.cfg, net = this.net;
    if (!net || !net.channels.length) return;
    const x = this.pos.x, z = this.pos.z;
    if (inZone(cfg.dock, x, z) || !cfg.dock && !this.started) {
      const r = cfg.raft ?? [x, this.pos.y, z];
      this.raftPos.set(r[0], r[1], r[2]);
      this.raftYaw = cfg.raftYaw ?? Math.PI / 2;
      this.raftMoored = true;
      this.dismounted = false;
      this.started = true;
      return;
    }
    this.started = true;
    if (inZone(cfg.beach, x, z)) {
      const b = cfg.beach;
      const r = b.raft ?? [b.land[0], (b.land[1] ?? this.pos.y) - 0.4, b.land[2] + 2];
      this.raftPos.set(r[0], r[1], r[2]);
      this.raftMoored = false;
      this.dismounted = true;
      return;
    }
    const f = net.sample(x, z, this._f);
    if (f.ok && f.norm < 1.25) this.beginRide(true);
  }

  updateHalf() {
    if (!this.riding) { super.updateHalf(); return; }
    const h = this.big ? RIDE.halfBig : RIDE.halfSmall;
    this.half.set(h.x, h.y, h.z);
  }

  /** Floß übernehmen: an der aktuellen Stelle ins Wasser setzen, Strömung aufnehmen. */
  beginRide(snap = false) {
    const net = this.net;
    this.riding = true;
    this.raftMoored = false;
    this.dismounted = false;
    this.script = null;
    this.mode = 'ground';
    this.ground = null;
    this.setCrouch(false);
    this.crouching = false;
    this.updateHalf();
    if (snap) net.constrain(this.pos, RIDE.radius, this._rc);
    const f = net.sample(this.pos.x, this.pos.z, this._f);
    const g = net.ground(this.pos.x, this.pos.z, f.y, this._g);
    this.pos.y = g.y;
    this.vel.set(f.dx * f.speed * (snap ? 1 : 0.35), 0, f.dz * f.speed * (snap ? 1 : 0.35));
    this.yaw = Math.atan2(-f.dz, f.dx);
    this.flow = f;
    this.raftPos.copy(this.pos);
    this.raftYaw = this.yaw;
    this.camYaw = Math.atan2(-f.dx, -f.dz);
    this.lookYaw();
    this.camYaw = this.camYawTarget;
    this.setState('ride');
  }

  // ------------------------------------------------------------------ Schritt

  update(dt, input) {
    if (!this.riding) {
      super.update(dt, input);
      if (this.raftPos && !this.dead && this.mode !== 'script' && this.raftMoored) this.checkMount();
      this.updateFootCam(dt);
      return;
    }
    this.updateRide(dt, input);
  }

  /** Zu Fuß: Kamera-Gier sanft auf die Schiene zurück (Steg/Strand blicken nach −Z). */
  updateFootCam(dt) {
    if (!this.raftPos) return;
    this.camYaw += wrap((this.cfg.footCamYaw ?? 0) - this.camYaw) * (1 - Math.exp(-1.5 * dt));
  }

  checkMount() {
    const rp = this.raftPos;
    const d = Math.hypot(this.pos.x - rp.x, this.pos.z - rp.z);
    const near = d < 1.75 && this.pos.y > rp.y - 0.8 && this.pos.y < rp.y + 2.6;
    const fell = this.mode === 'swim' || (this.pos.y < rp.y - 0.3 && this.net?.sample(this.pos.x, this.pos.z, this._f).inside);
    if (near || fell) this.startMount();
  }

  startMount() {
    this.mode = 'script';
    this.script = { type: 'mount', t: 0, from: this.pos.clone(), to: this.raftPos.clone() };
    this.vel.set(0, 0, 0);
    this.water = null;
    this.setState('jump');
    this.level.sfx('jump');
  }

  startDismount() {
    const b = this.cfg.beach;
    this.raftPos.copy(this.pos);
    this.raftYaw = this.yaw;
    this.riding = false;
    this.dismounted = true;
    this.plunging = false;
    this.updateHalf();
    this.mode = 'script';
    this.script = { type: 'dismount', t: 0, from: this.pos.clone(), to: new THREE.Vector3(b.land[0], b.land[1], b.land[2]) };
    this.vel.set(0, 0, 0);
    this.setState('jump');
    this.level.sfx('jump');
  }

  updateScript(dt, input) {
    const sc = this.script;
    if (sc?.type === 'mount' || sc?.type === 'dismount') {
      sc.t += dt;
      const dur = sc.type === 'mount' ? RIDE.mountTime : RIDE.dismountTime;
      const k = Math.min(1, sc.t / dur);
      const arc = (sc.type === 'mount' ? 1.1 : 1.6) * Math.sin(Math.PI * k);
      this.pos.lerpVectors(sc.from, sc.to, k);
      this.pos.y += arc;
      this.vel.set((sc.to.x - sc.from.x) / dur, Math.cos(Math.PI * k) * arc * 3, (sc.to.z - sc.from.z) / dur);
      const dx = sc.to.x - sc.from.x, dz = sc.to.z - sc.from.z;
      if (Math.hypot(dx, dz) > 0.2) this.yaw = turnToward(this.yaw, Math.atan2(-dz, dx), 10 * dt);
      this.setState(k < 0.5 ? 'jump' : 'fall');
      if (k >= 1) {
        if (sc.type === 'mount') {
          this.beginRide(false);
          this.level.sfx('land');
          this.level.effects?.splash(this.pos, this.pos.y);
          this.landImpact = 0.8;
        } else {
          this.script = null;
          this.mode = 'air';
          this.enterAir(null, false);
          this.setState('fall');
          const l = Math.hypot(dx, dz) || 1;
          this.vel.set((dx / l) * 1.5, 0, (dz / l) * 1.5);
          this.airMax = MOVE.walk * this.speedMult;
        }
      }
      return;
    }
    super.updateScript(dt, input);
  }

  tickTimers(dt) {
    this.time += dt;
    this.stateTime += dt;
    this.prevPos.copy(this.pos);
    this.prevVy = this.vel.y;
    const tick = (k) => { if (this[k] > 0) this[k] = Math.max(0, this[k] - dt); };
    tick('buffer'); tick('hurtTime'); tick('invuln'); tick('boostTime'); tick('bumpTime'); tick('bumpCd'); tick('hopTime');
    this.landImpact = Math.max(0, this.landImpact - dt * 2.5);
  }

  updateRide(dt, input) {
    this.tickTimers(dt);
    this.input = input;
    const net = this.net;
    if (this.mode === 'script') {
      this.updateScript(dt, input);
      this.driftRaft(dt);
      return;
    }
    const def = this.powerDef;
    if (def.duration) { this.powerTime -= dt; if (this.powerTime <= 0) this.endTimedPower(); }
    if (input.jumpPressed) this.buffer = MOVE.buffer;

    const f = net.sample(this.pos.x, this.pos.z, this._f, this.pos.y);
    this.flow = f;
    const dx = f.dx, dz = f.dz, rx = -dz, rz = dx;
    // Stick → Welt (relativ zur Kamera), dann in Fließrichtung/quer zerlegen
    const cy = this.level.controlYaw ?? 0, c = Math.cos(cy), s = Math.sin(cy);
    const wx = c * input.moveX - s * input.moveY, wz = -s * input.moveX - c * input.moveY;
    const along = clamp(wx * dx + wz * dz, -1, 1), lat = clamp(wx * rx + wz * rz, -1, 1);
    const grounded = this.mode === 'ground';
    let va = this.vel.x * dx + this.vel.z * dz, vl = this.vel.x * rx + this.vel.z * rz;
    const lock = this.hurtTime > 0;
    if (grounded) {
      const boost = this.boostTime > 0 ? this.boostAmt : 0;
      const target = f.speed * (1 + RIDE.brake * (lock ? 0 : along)) + boost;
      va += (target - va) * (1 - Math.exp(-RIDE.alongRate * dt * (va > target ? 1.5 : 1)));
      const tl = lock ? 0 : RIDE.steer * this.speedMult * lat;
      vl = approach(vl, tl, (Math.abs(lat) > 0.05 && !lock ? RIDE.steerAccel : RIDE.latDrag) * dt);
    } else if (!lock) {
      vl = approach(vl, RIDE.steer * lat, 7 * this.airMult * dt);
    }
    this.vel.x = dx * va + rx * vl;
    this.vel.z = dz * va + rz * vl;
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (hs > 0.4) this.yaw = turnToward(this.yaw, Math.atan2(-this.vel.z, this.vel.x), 3.2 * dt);

    // waagerecht bewegen, Ufer/Felsen/Rampen-Seiten
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.collideBanks();
    this.collideRocks();
    this.collideRampSides();

    // senkrecht: Wasser/Rampe als Boden
    const f2 = net.sample(this.pos.x, this.pos.z, this._f, this.pos.y);
    const g = net.ground(this.pos.x, this.pos.z, f2.y, this._g);
    if (this.mode === 'ground') {
      if (this.buffer > 0 && !lock) {
        this.buffer = 0;
        const rampVy = this.onRamp ? Math.max(0, this.vel.y) : 0;
        this.vel.y = vFor(RIDE.hop * this.jumpMult, RIDE.gUp) + rampVy;
        this.leaveWater('jump');
        this.hopTime = 0.25;
        this.level.sfx('jump');
        this.level.effects?.splash(this.pos, this.pos.y);
      } else {
        const drop = this.pos.y - g.y;
        if (drop > 0.3) {
          // Boden fällt weg: Rampenende (Schwung) oder Kaskade/Klippe (frei fallen)
          if (this.onRamp) {
            this.vel.y = Math.max(this.vel.y, 0) + this.onRamp.kick + (input.jump ? RIDE.kickHeld : 0);
            this.leaveWater('jump');
            this.level.sfx('jump2');
          } else {
            this.vel.y = Math.min(this.vel.y, 0);
            this.leaveWater('fall');
          }
        } else {
          this.vel.y = clamp((g.y - this.pos.y) / dt, -10, 14);
          this.pos.y = g.y;
        }
      }
    } else {
      // Luft
      const plunge = this.plunging || this.pos.y < this.takeoffY - 4;
      if (plunge && !this.plunging) { this.plunging = true; this.level.sfx('fall'); }
      let gg;
      if (plunge) gg = RIDE.plungeG;
      else if (this.vel.y > 0) gg = (this.jumpKind === 'hop' && !input.jump) ? RIDE.gRelease : RIDE.gUp;
      else gg = RIDE.gFall * this.fallMult;
      this.vel.y = Math.max(this.vel.y - gg * dt, -(plunge ? RIDE.plungeMax : RIDE.maxFall));
      this.pos.y += this.vel.y * dt;
      if (this.vel.y < -1 && this.state === 'jump') this.setState('fall');
      if (this.pos.y <= g.y && this.vel.y <= 0) this.landWater(g);
    }
    this.onRamp = this.mode === 'ground' ? g.ramp : null;

    // Temposchwelle
    if (this.mode === 'ground') {
      const w = net.waveAt(this.pos.x, this.pos.z);
      if (w) {
        if (this.boostTime < RIDE.boostTime - 0.2) { this.level.sfx('boost'); this.level.effects?.splash(this.pos, this.pos.y); }
        this.boostTime = RIDE.boostTime;
        this.boostAmt = w.boost;
      }
    }
    if (this.mode === 'ground' && this.state !== 'ride' && this.stateTime > 0.05) this.setState('ride');
    this.raftPos.copy(this.pos);
    this.raftYaw = this.yaw;
    this.lookYaw();
    this.camYaw += wrap(this.camYawTarget - this.camYaw) * (1 - Math.exp(-(this.plunging ? 0.6 : 1.4) * dt));
    // Strand erreicht: absteigen
    if (!this.dead && inZone(this.cfg.beach, this.pos.x, this.pos.z) && this.mode === 'ground') this.startDismount();
  }

  /** Kamera-Gier: hinter dem Floß entlang der mittleren Fließrichtung der nächsten ~26 m. */
  lookYaw() {
    const f = this.flow;
    if (!f?.ch) { this.camYawTarget = this.camYaw; return; }
    const d = this.net.lookDir(f.ch, f.s - 4, 26, this._ld);
    this.camYawTarget = Math.atan2(-d.x, -d.z);
  }

  leaveWater(kind) {
    this.mode = 'air';
    this.jumpKind = kind === 'jump' ? 'hop' : null;
    this.takeoffY = this.pos.y;
    this.setState(kind);
  }

  landWater(g) {
    const vy = this.vel.y;
    this.pos.y = g.y;
    this.mode = 'ground';
    this.vel.y = 0;
    this.jumpKind = null;
    const hard = vy < -6;
    this.landImpact = clamp(-vy / 16, 0.25, 1);
    if (this.plunging) {
      this.plunging = false;
      for (let k = 0; k < 4; k++) this.level.effects?.splash({ x: this.pos.x + (k - 1.5) * 0.6, y: 0, z: this.pos.z + (k % 2 - 0.5) }, g.y);
      this.level.shake?.(0.6);
      this.level.sfx('splash');
      this.level.sfx('land');
    } else if (hard) {
      this.level.effects?.splash(this.pos, g.y);
      this.level.sfx('splash');
    } else this.level.sfx('land');
    this.setState('ride');
  }

  /** Ufer: Kanal-Korridore (Vereinigung) – hinausgeschoben, Geschwindigkeit gespiegelt. */
  collideBanks() {
    const hit = this.net.constrain(this.pos, RIDE.radius, this._rc);
    if (!hit) return;
    const vn = this.vel.x * hit.nx + this.vel.z * hit.nz;
    if (vn > 0) {
      this.vel.x -= (1 + RIDE.bankBounce) * vn * hit.nx;
      this.vel.z -= (1 + RIDE.bankBounce) * vn * hit.nz;
      if (vn > 1.2 && this.bumpCd <= 0) this.bump(hit.nx, hit.nz, vn);
    }
  }

  collideRocks() {
    for (const r of this.net.rocks) {
      if (this.pos.y > r.top - 0.15) continue;
      const dx = this.pos.x - r.x, dz = this.pos.z - r.z, d = Math.hypot(dx, dz), min = r.r + RIDE.radius;
      if (d >= min || d < 1e-6) continue;
      const nx = dx / d, nz = dz / d;
      this.pos.x = r.x + nx * min; this.pos.z = r.z + nz * min;
      const vn = this.vel.x * nx + this.vel.z * nz;
      if (vn < 0) {
        this.vel.x -= (1 + RIDE.rockBounce) * vn * nx;
        this.vel.z -= (1 + RIDE.rockBounce) * vn * nz;
        if (-vn > 1.2 && this.bumpCd <= 0) this.bump(-nx, -nz, -vn);
      }
    }
  }

  collideRampSides() {
    for (const r of this.net.ramps) {
      const dx = this.pos.x - r.x, dz = this.pos.z - r.z;
      const a = dx * r.ax + dz * r.az, b = dx * r.bx + dz * r.bz;
      const hw = r.wid / 2 + RIDE.radius * 0.8;
      if (Math.abs(b) >= hw || a < -r.len / 2 || a > r.len / 2) continue;
      if (Math.abs(b) < r.wid / 2 - 0.15) continue; // auf der Rampe
      const h = r.base + r.h * ((a + r.len / 2) / r.len);
      if (this.pos.y > h - 0.45) continue;
      const sg = b >= 0 ? 1 : -1;
      const push = hw - Math.abs(b);
      this.pos.x += r.bx * sg * push; this.pos.z += r.bz * sg * push;
      const vn = (this.vel.x * r.bx + this.vel.z * r.bz) * sg;
      if (vn < 0) { this.vel.x -= (1 + RIDE.bankBounce) * vn * r.bx * sg; this.vel.z -= (1 + RIDE.bankBounce) * vn * r.bz * sg; }
    }
  }

  /** Anstoßen (Ufer/Felsen): Gischt, Geräusch, kurzes Kippen der Darstellung. */
  bump(nx, nz, speed) {
    this.bumpCd = 0.3;
    this.bumpTime = 0.3;
    this.bumpSide = nx * Math.cos(this.yaw + Math.PI / 2) - nz * Math.sin(this.yaw + Math.PI / 2) > 0 ? 1 : -1;
    this.level.sfx('bump');
    this.level.effects?.splash({ x: this.pos.x + nx * 0.6, y: 0, z: this.pos.z + nz * 0.6 }, this.pos.y);
    if (speed > 4) this.level.shake?.(0.15);
  }

  /** Floß ohne Fahrerin (Tod): treibt langsam aus. */
  driftRaft(dt) {
    if (!this.net || !this.raftPos) return;
    const f = this.net.sample(this.raftPos.x, this.raftPos.z, this._g2 ?? (this._g2 = {}), this.raftPos.y);
    if (!f.ok) return;
    this.raftPos.x += f.dx * f.speed * 0.3 * dt;
    this.raftPos.z += f.dz * f.speed * 0.3 * dt;
    this.net.constrain(this.raftPos, RIDE.radius, this._rc);
    this.raftPos.y = f.y;
  }

  // ------------------------------------------------------------------ Treffer, Abprall

  hurt(source) {
    if (!this.riding) return super.hurt(source);
    if (this.dead || this.mode === 'script' || this.invulnerable) return false;
    if (this.power !== 'none') { this.setPower('none'); this.level.sfx('powerdown'); }
    else if (this.big) { this.big = false; this.updateHalf(); this.level.sfx('powerdown'); }
    else { this.die('hit'); return true; }
    this.invuln = MOVE.invuln;
    this.hurtTime = 0.35;
    let ax = 0, az = 0;
    if (source?.pos) { ax = this.pos.x - source.pos.x; az = this.pos.z - source.pos.z; }
    const l = Math.hypot(ax, az) || 1;
    this.vel.x += (ax / l) * 4; this.vel.z += (az / l) * 4;
    if (this.mode === 'ground') { this.vel.y = 4.5; this.leaveWater('fall'); }
    this.level.sfx('hurt');
    this.level.effects?.splash(this.pos, this.pos.y);
    return true;
  }

  bounceOff(input) {
    if (!this.riding) { super.bounceOff(input); return; }
    this.vel.y = input?.jump ? 12 : 9;
    this.leaveWater('jump');
    this.jumpKind = 'stomp';
    this.level.sfx('bounce');
  }

  info() {
    const i = super.info();
    i.riding = !!this.riding;
    i.moored = !!this.raftMoored;
    i.dismounted = !!this.dismounted;
    i.plunging = !!this.plunging;
    i.boost = +(this.boostTime ?? 0).toFixed(2);
    i.flow = this.flow?.ok ? +this.flow.speed.toFixed(2) : 0;
    i.channel = this.flow?.ch?.id ?? null;
    return i;
  }
}
