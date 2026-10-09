// Darstellung des Reit-Levels (Archetyp `ride`, über createRig): Pflaume paddelt auf dem Blatt-Floß, die Heldin
// sitzt mit Angel und Möhre auf ihrem Rücken. Beide Avatare (src/three/avatars/hero.js) im Kurs-Modus:
//   raftGroup (Lage des Floßes, Gier weich, Kippen nach Querfahrt/Anstoßen, Nicken nach Steigen/Fallen, Federn)
//   ├ pflHull (Maßstab PFL_SCALE/1,5)  └ PflaumeAvatar: course { state: 'paddle', speed, power, rider }
//   └ heroHull (Reiterhöhe aus HeroAvatar.courseAnchors, auf Pflaumes Rücken)  └ HeroAvatar: course { state: 'ride' }
// Zu Fuß (Steg, Auf-/Absteigen, Strand, Tod) steht die Heldin wie bei HeroRig frei in der Szene (Kurs-Zustände aus
// der Spielfigur). Nach dem Absteigen hüpft Pflaume hinterher (eigene kleine Folge-Logik, Boden per raycastDown); das
// Blatt bleibt am Ufer liegen (zweiter PflaumeAvatar, nur das Floß sichtbar). Am Zielmast: Freudensprung.
// Effekte: Kielwasser (Schaumringe, eine InstancedMesh), kleine Spritzer im Paddeltakt, Gischt bei Schub.

import * as THREE from 'three';
import { createAvatar } from '../../three/avatars/index.js';
import { HeroAvatar } from '../../three/avatars/hero.js';

const AVATAR_H = 1.5;
const PFL_SCALE = 1.08;          // Pflaume etwas größer: Floß ≈ 1,5 m lang
const TAU = Math.PI * 2;
const wrap = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; else if (a < -Math.PI) a += TAU; return a; };
const damp = (c, t, r, dt) => c + (t - c) * (1 - Math.exp(-r * dt));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const STATE_MAP = { dive: 'longjump', ride: 'idle' };
const POWER_TO_SCARF = { funken: 'red', riese: 'red', krallen: 'yellow', stern: 'blue' };
const WAKE_N = 40;

function makeProxy(key) {
  return {
    texture: { key }, key,
    x: 0, y: 0, width: 0, height: 0, angle: 0, scaleX: 1, scaleY: 1, alpha: 1, visible: true,
    flipX: false, body: { velocity: { x: 0, y: 0 }, blocked: { down: true }, touching: { down: true } }, moveState: 'ground', onGround: true,
    mount: null, leaf: { visible: false }, swooping: false, dead: false, locked: false, power: 'none',
    course: { state: 'idle', speed: 0, vy: 0, grounded: true, phase: 0, power: 'none', big: true, holding: false, climbing: false },
  };
}

export class RideRig {
  constructor(view, player) {
    this.view = view;
    this.player = player;
    this.root = new THREE.Group();
    this.root.name = 'ritt';
    view.three.add(this.root);
    this.raftGroup = new THREE.Group();
    this.root.add(this.raftGroup);
    this.pflHull = new THREE.Group();
    this.pflHull.scale.setScalar(PFL_SCALE / AVATAR_H);
    this.raftGroup.add(this.pflHull);
    this.heroHull = new THREE.Group();
    this.raftGroup.add(this.heroHull);
    this.heroProxy = makeProxy(player.hero);
    this.pflProxy = makeProxy('pflaume');
    this.pfl = null; this.hero = null; this.leaf = null;
    try {
      this.pfl = createAvatar(view, this.pflProxy);
      this.pfl.setCourseMode?.(true);
      this.pflHull.add(this.pfl.root);
    } catch (err) { console.error('Pflaume-Avatar fehlgeschlagen:', err); }
    this.buildHero(player.hero);
    this.yaw = player.raftYaw ?? player.yaw;
    this.heroYaw = player.yaw;
    this.roll = 0; this.pitch = 0; this.heave = 0; this.heaveV = 0; this.squash = 0;
    this.attached = null;
    // Pflaume an Land (nach dem Absteigen)
    this.pflFree = false;
    this.pflPos = new THREE.Vector3();
    this.pflVel = new THREE.Vector3();
    this.pflYaw = 0;
    this.pflState = 'idle';
    this.pflAir = 0;
    this.buildWake();
    this.lastPad = 0;
    this.sprayT = 0;
    this.wakeT = 0;
  }

  buildHero(key) {
    if (this.hero) { this.heroHull.remove(this.hero.root); this.hero.dispose(); this.hero = null; }
    this.key = key;
    this.heroProxy.texture.key = key;
    this.heroProxy.key = key;
    try {
      this.hero = createAvatar(this.view, this.heroProxy);
      this.hero.setCourseMode?.(true);
      this.heroHull.add(this.hero.root);
    } catch (err) { console.error('Heldin-Avatar fehlgeschlagen:', err); }
    if (this.pfl && this.hero) this.pflProxy.course.rider = this.hero;
  }

  /** Kielwasser: flache Schaumringe hinter dem Floß, wachsen und verblassen. */
  buildWake() {
    const g = new THREE.RingGeometry(0.55, 0.8, 18);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false });
    this.wake = new THREE.InstancedMesh(g, m, WAKE_N);
    this.wake.frustumCulled = false;
    this.wake.renderOrder = 2;
    this.wake.name = 'kielwasser';
    this.wakeItems = Array.from({ length: WAKE_N }, () => ({ life: 0, max: 1, x: 0, y: 0, z: 0, s: 1, sx: 1 }));
    this.wakeNext = 0;
    const Z = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < WAKE_N; i++) this.wake.setMatrixAt(i, Z);
    this.root.add(this.wake);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3();
  }

  emitWake(x, y, z, s, life = 1.1, sx = 1) {
    const it = this.wakeItems[this.wakeNext];
    this.wakeNext = (this.wakeNext + 1) % WAKE_N;
    it.life = it.max = life; it.x = x; it.y = y; it.z = z; it.s = s; it.sx = sx;
  }

  updateWake(dt) {
    const Z = this._m;
    for (let i = 0; i < WAKE_N; i++) {
      const it = this.wakeItems[i];
      if (it.life <= 0) { Z.makeScale(0, 0, 0); this.wake.setMatrixAt(i, Z); continue; }
      it.life -= dt;
      const k = 1 - Math.max(0, it.life) / it.max;
      const s = it.s * (0.5 + 1.6 * k) * (it.life > 0 ? 1 : 0);
      this._p.set(it.x, it.y + 0.05, it.z);
      this._s.set(s * it.sx, 1, s * (1 - 0.6 * k));
      this._q.identity();
      this._m.compose(this._p, this._q, this._s);
      this.wake.setMatrixAt(i, this._m);
    }
    this.wake.instanceMatrix.needsUpdate = true;
    this.wake.material.opacity = 0.5;
  }

  /** Reiterhöhe: Hüfte auf Pflaumes Rücken (Anker der Avatare, beide Hüllen 1,5 Einheiten → 1 m). */
  rideHeight(big) {
    const a = HeroAvatar.courseAnchors?.(true)?.rideHeight ?? 0.5;
    const k = big ? 1 : 0.7;
    // Rücken bei 0,95 Einheiten (Pflaume) – Becken der Reiterin 0,22 Einheiten über ihrem Fußpunkt (Reitpose)
    return a * PFL_SCALE - (1 - k) * 0.22 / AVATAR_H - 0.02;
  }

  update(dt, t) {
    const p = this.player;
    if (p.hero !== this.key) this.buildHero(p.hero);
    const riding = !!p.riding && !p.dead;
    const onRaft = riding && p.mode !== 'script';
    // ---- Floß
    const rp = p.raftPos ?? p.pos;
    if (!this.pflFree) {
      this.raftGroup.position.copy(rp);
      this.yaw += wrap((p.raftYaw ?? p.yaw) - this.yaw) * (1 - Math.exp(-8 * dt));
      this.raftGroup.rotation.order = 'YXZ';
      // Kippen: Querfahrt relativ zur Blickrichtung, Anstoßen; Nicken: Steigen/Fallen
      const fx = Math.cos(this.yaw), fz = -Math.sin(this.yaw);
      const latV = onRaft ? (p.vel.x * -fz + p.vel.z * fx) : 0;
      const wantRoll = clamp(-latV * 0.05, -0.22, 0.22) + (p.bumpTime > 0 ? (p.bumpSide ?? 1) * 0.25 * Math.sin((p.bumpTime / 0.3) * Math.PI) : 0);
      const wantPitch = onRaft && p.mode !== 'ground' ? clamp(p.vel.y * 0.035, -0.45, 0.35) : (p.onRamp ? 0.25 : 0);
      this.roll = damp(this.roll, wantRoll, 8, dt);
      this.pitch = damp(this.pitch, p.plunging ? -0.7 : wantPitch, p.plunging ? 2 : 6, dt);
      // Federn bei Landung
      if (p.landImpact > 0.2 && !this.landed) { this.heaveV -= 3.2 * p.landImpact; this.landed = true; }
      if (p.landImpact < 0.1) this.landed = false;
      this.heaveV += (-70 * this.heave - 9 * this.heaveV) * dt;
      this.heave += this.heaveV * dt;
      this.raftGroup.rotation.set(-this.roll * 0, this.yaw, 0);
      this.raftGroup.rotation.x = this.roll;
      this.raftGroup.rotation.z = this.pitch;
      this.raftGroup.position.y += clamp(this.heave, -0.25, 0.25) + (onRaft && p.mode === 'ground' ? 0.03 * Math.sin(t * 2.3) : 0);
      const sq = clamp(this.heave * 1.4, -0.18, 0.18);
      this.raftGroup.scale.set(1 - sq * 0.4, 1 + sq, 1 - sq * 0.4);
    }
    // ---- Heldin
    const heroOnRaft = onRaft;
    if (heroOnRaft !== this.attached) {
      this.attached = heroOnRaft;
      (heroOnRaft ? this.raftGroup : this.root).add(this.heroHull);
      this.heroYaw = p.yaw;
    }
    const hs = (p.big ? 1 : 0.7) / AVATAR_H;
    const blink = p.invuln > 0 && !p.powerDef.invulnerable && Math.floor(t * 16) % 2 === 0;
    this.heroHull.visible = !blink && !(p.dead && p.deathCause === 'fall' && p.script?.t > 0.3);
    if (heroOnRaft) {
      this.heroHull.position.set(-0.06, this.rideHeight(p.big), 0);
      this.heroHull.rotation.set(0, 0, 0);
      this.heroHull.scale.setScalar(hs);
    } else {
      this.heroHull.position.copy(p.pos);
      const targetYaw = p.yaw + (p.state === 'wallslide' ? Math.PI : 0);
      this.heroYaw += wrap(targetYaw - this.heroYaw) * (1 - Math.exp(-24 * dt));
      this.heroHull.rotation.set(0, this.heroYaw, 0);
      this.heroHull.scale.setScalar(hs);
    }
    this.fillHero(p, heroOnRaft);
    try { this.hero?.animate(dt, t); } catch (err) { console.error('Heldin-Animation fehlgeschlagen:', err); this.hero = null; }

    // ---- Pflaume
    const c = this.pflProxy.course;
    const scarf = POWER_TO_SCARF[p.power] ?? 'none';
    c.power = scarf;
    c.gear = null;
    c.rider = this.hero;
    if (!this.pflFree && p.dismounted && !p.riding && p.script?.type !== 'dismount' && p.raftPos) this.freePflaume(p);
    if (!this.pflFree) {
      const speed = onRaft ? Math.hypot(p.vel.x, p.vel.z) : 0;
      c.state = 'paddle';
      c.speed = Math.min(4, speed * 0.55);
      c.vy = p.vel.y;
      c.grounded = p.mode === 'ground';
    } else {
      this.updateFollower(dt, t, p);
    }
    const pblink = blink && heroOnRaft;
    this.pflHull.visible = !pblink;
    try { this.pfl?.animate(dt, t); } catch (err) { console.error('Pflaume-Animation fehlgeschlagen:', err); this.pfl = null; }
    if (this.leaf) {
      this.leaf.root.position.set(0, 0, 0);
      this.leafGroup.position.set(rp.x, rp.y + 0.02 * Math.sin(t * 1.7), rp.z);
      try { this.leaf.animate(dt, t); } catch (_) { /* nur Optik */ }
      this.leaf.body.visible = false;
    }

    // ---- Effekte
    this.updateEffects(dt, t, p, onRaft);
    this.updateWake(dt);
  }

  fillHero(p, onRaft) {
    const c = this.heroProxy.course;
    const speed = Math.hypot(p.vel.x, p.vel.z);
    if (onRaft) {
      c.state = 'ride';
      c.speed = 0;
      c.vy = 0;
      c.grounded = true;
      c.phase = 0;
    } else {
      c.state = p.throwTime > 0 && !p.dead ? 'throw' : p.clawTime > 0 && p.state !== 'dive' && !p.dead ? 'claw' : (p.state === 'ride' ? 'idle' : STATE_MAP[p.state] ?? p.state);
      if (c.state === 'idle' && p.state === 'ride') c.state = 'idle';
      c.speed = p.mode === 'stalk' || p.mode === 'wall' ? 0 : speed;
      c.vy = p.vel.y;
      c.grounded = p.mode === 'ground';
      c.phase = c.state === 'throw' ? Math.min(1, Math.max(0.01, 1 - p.throwTime / (p.throwDur || 0.25)))
        : c.state === 'claw' ? Math.min(1, Math.max(0.01, 1 - p.clawTime / 0.3)) : p.phase;
    }
    c.power = p.power;
    c.big = p.big;
    c.holding = p.holding ? (p.holding.holdStyle ?? 'over') : false;
    c.climbing = !onRaft && p.climbing;
    const pr = this.heroProxy;
    pr.dead = p.dead;
    pr.onGround = onRaft || c.grounded;
    pr.moveState = pr.onGround ? 'ground' : 'air';
    pr.body.velocity.x = speed * 16;
    pr.body.velocity.y = -p.vel.y * 16;
  }

  /** Pflaume springt vom Blatt an Land; das Blatt bleibt (zweiter Avatar, nur Floß sichtbar). */
  freePflaume(p) {
    this.pflFree = true;
    const wp = new THREE.Vector3();
    this.pflHull.getWorldPosition(wp);
    this.root.add(this.pflHull);
    this.pflHull.position.copy(wp);
    this.pflHull.rotation.set(0, this.yaw, 0);
    this.pflPos.copy(wp);
    this.pflYaw = this.yaw;
    const land = p.cfg?.beach?.land;
    const tx = land ? land[0] + 1.2 : p.pos.x, tz = land ? land[2] + 1.4 : p.pos.z;
    this.pflVel.set((tx - wp.x) / 0.6, 6.5, (tz - wp.z) / 0.6);
    this.pflAir = 1;
    this.view.effects?.splash(wp, wp.y);
    // Blatt bleibt liegen
    try {
      const proxy = makeProxy('pflaume');
      proxy.course.state = 'paddle';
      this.leaf = createAvatar(this.view, proxy);
      this.leaf.setCourseMode?.(true);
      this.leaf.animate(0.016, 0);
      this.leaf.body.visible = false;
      this.leafGroup = new THREE.Group();
      this.leafGroup.scale.setScalar(PFL_SCALE / AVATAR_H);
      this.leafGroup.rotation.y = this.yaw;
      this.leafGroup.add(this.leaf.root);
      this.root.add(this.leafGroup);
    } catch (err) { console.error('Blatt-Floß fehlgeschlagen:', err); this.leaf = null; }
    this.raftGroup.visible = true;
  }

  /** Pflaume an Land: hoppelt der Heldin nach (bleibt ~1,6 m hinter ihr), am Ziel Freudensprünge. */
  updateFollower(dt, t, p) {
    const c = this.pflProxy.course;
    const world = p.level?.world;
    const goal = p.state === 'victory' || p.script?.type === 'goal';
    let tx = p.pos.x - Math.cos(p.yaw) * 1.6, tz = p.pos.z + Math.sin(p.yaw) * 1.6;
    if (goal && this.goalSpot) { tx = this.goalSpot.x; tz = this.goalSpot.z; }
    if (goal && !this.goalSpot) {
      // neben dem Mast am Boden
      this.goalSpot = new THREE.Vector3(p.pos.x + 2.2, 0, p.pos.z + 1.8);
      tx = this.goalSpot.x; tz = this.goalSpot.z;
    }
    const dx = tx - this.pflPos.x, dz = tz - this.pflPos.z, d = Math.hypot(dx, dz);
    if (this.pflAir > 0) {
      this.pflVel.y -= 26 * dt;
      this.pflPos.addScaledVector(this.pflVel, dt);
      const hit = world?.raycastDown(this.pflPos.x, this.pflPos.y + 0.6, this.pflPos.z, 3);
      if (hit && this.pflPos.y <= hit.y && this.pflVel.y <= 0) { this.pflPos.y = hit.y; this.pflAir = 0; this.pflVel.set(0, 0, 0); }
      c.state = 'jump';
      c.vy = this.pflVel.y;
      c.speed = Math.hypot(this.pflVel.x, this.pflVel.z);
    } else {
      const want = d > 0.4 ? Math.min(6.5, d * 2.2) : 0;
      const sp = want;
      if (d > 0.01) {
        this.pflPos.x += (dx / d) * sp * dt;
        this.pflPos.z += (dz / d) * sp * dt;
        if (sp > 0.3) this.pflYaw += wrap(Math.atan2(-dz, dx) - this.pflYaw) * (1 - Math.exp(-10 * dt));
      }
      const hit = world?.raycastDown(this.pflPos.x, this.pflPos.y + 1.2, this.pflPos.z, 4);
      if (hit) this.pflPos.y = damp(this.pflPos.y, hit.y, 18, dt);
      if (goal && d < 0.6) {
        c.state = 'victory';
        this.pflYaw += wrap(Math.PI / 2 * -1 - this.pflYaw) * (1 - Math.exp(-6 * dt));
      } else c.state = sp > 3.2 ? 'run' : sp > 0.3 ? 'walk' : 'idle';
      c.speed = sp;
      c.vy = 0;
    }
    c.grounded = this.pflAir <= 0;
    this.pflHull.position.copy(this.pflPos);
    this.pflHull.rotation.set(0, this.pflYaw, 0);
  }

  updateEffects(dt, t, p, onRaft) {
    if (!onRaft || p.mode !== 'ground') return;
    const fx = Math.cos(this.yaw), fz = -Math.sin(this.yaw);
    const sp = Math.hypot(p.vel.x, p.vel.z);
    this.wakeT -= dt;
    if (sp > 1.5 && this.wakeT <= 0) {
      this.wakeT = clamp(0.5 / sp, 0.05, 0.16);
      this.emitWake(p.pos.x - fx * 0.85, p.pos.y, p.pos.z - fz * 0.85, 0.7, 1.2, 1.1);
    }
    // Paddelschlag: kleiner Spritzring auf der Seite des Paddels
    const pad = this.pfl?.padPhase ?? 0;
    if (Math.floor(pad) !== Math.floor(this.lastPad)) {
      const side = Math.floor(pad) % 2 ? -1 : 1;
      const rx = -fz, rz = fx;
      this.emitWake(p.pos.x + fx * 0.35 + rx * side * 0.75, p.pos.y, p.pos.z + fz * 0.35 + rz * side * 0.75, 0.35, 0.6);
    }
    this.lastPad = pad;
    // Gischt am Bug bei Schub
    this.sprayT -= dt;
    if (p.boostTime > 0 && this.sprayT <= 0) {
      this.sprayT = 0.16;
      this.view.effects?.splash({ x: p.pos.x + fx * 0.9, y: 0, z: p.pos.z + fz * 0.9 }, p.pos.y);
    }
  }

  dispose() {
    this.hero?.dispose(); this.pfl?.dispose(); this.leaf?.dispose();
    this.hero = null; this.pfl = null; this.leaf = null;
    this.wake.geometry.dispose(); this.wake.material.dispose(); this.wake.dispose();
    this.root.parent?.remove(this.root);
  }
}
