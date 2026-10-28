// Lavadrache – Gegner Welt 7 „Lava-Festung“ (7-7 Drachenbucht): freundlich-freche Lava-Seeschlange mit langem Schuppenhals
// (Modell 'lavadrache', Ursprung = Austrittspunkt an der Lava-Oberfläche, aufgetaucht ≈ 3,4 m). Eigene Figur.
//
// Verhalten: liegt verborgen im Lavasee (nur Glutring und Blasen verraten ihn; unberührbar). Ist eine Figur waagerecht ≤ sight m
// nah, **taucht er auf** (rise 1,0 s, Kopf zuerst), dreht sich zu ihr und **speit Feuerbälle in Bögen** (shots Stück je
// Auftauchen, alle interval s; Ausholen → bei der Hälfte der Speien-Bewegung verlässt die Kugel das Maul – model.mouth(): sie fliegt
// in flight s im Bogen auf die Stelle der Figur (lead m davor) und hüpft dann weiter), danach **taucht er ab** (sink 0,8 s) und
// wartet hide s – an der nächsten Auftauchstelle (spots reihum, mit aim die der Figur nächste). Die Lava darf steigen/sinken.
// Treffer: der Kopf (Kugel ≈ 0,45 m um model.userData.head()) ist die Hülle; auch der Hals verletzt bei Berührung.
// Konter: **nur Power-ups und Wurfsichel** (HOT_KILL: Tatzenhieb/Schwanzhieb/Krallen-Sturzflug, Wurfsichel, Panzer, Wurf,
// Kanone, Explosion, Stern, Riese) am aufgetauchten Kopf – hp Treffer (Standard 1; dazwischen taucht er erschrocken ab).
// **Feuer prallt ab**, Draufspringen/Stampfen verletzt (heiß!). Besiegt: Augen zu, Schwindelsterne, Dampf, er versinkt (1,6 s).
//
// Daten: { kind: 'lavadrache', pos: [x, y, z] (Austrittspunkt, y = Lava-Oberfläche), spots?: [[x, y, z], …] (Auftauchstellen;
//          pos = erste, falls pos fehlt), aim?: false, sight?: 16, hide?: 2.0, shots?: 2, interval?: 1.1, flight?: 1.15,
//          lead?: 0, speed?: 0 (m/s waagerecht beim Hüpfen der Kugel; 0 = Flugtempo), hp?: 1, phase?: 0..1 (Vorlauf im
//          Versteck), color?: 'rot' | 'blau', segments?: 7, drop? }
//   Beispiel: { kind: 'lavadrache', spots: [[-6, 0.5, -80], [6, 0.5, -84]], shots: 2, sight: 14 }
// Zustände: hidden → rise → idle → spit (× shots) → sink → hidden …; hit (0,5 s, taucht ab); defeated (1,6 s).
// Laufzeit: rises, fireballs, hits, spot (Index), head() (Weltpunkt der Kopfmitte), rise (0..1), info().
// Sound: 'burn' (Auftauchen), 'fireball', 'splash', 'boss_hit' (Treffer), 'stomp'.

import * as THREE from 'three';
import { EnemyW2, activeFigure, clamp, toWorld, localOffset } from '../EnemyW2.js';
import { getModel } from '../../models/index.js';
import { HOT_KILL, hurtsFrom, lavaAt, arcVel } from '../w7help.js';

const RISE = 1.0, SINK = 0.8, SPIT = 1.0, SPIT_AT = 0.5, IDLE = 0.35, HIT = 0.5, DEFEAT = 1.6;
const HEAD_R = 0.45;
const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

class Lavadrache extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'lavadrache');
    this.half.set(HEAD_R, HEAD_R, HEAD_R);
    this.shadow = 0;
    this.wake = 0;
    this.edges = false;
    this.color = spec.color === 'blau' ? 'blau' : 'rot';
    const sp = Array.isArray(spec.spots) && spec.spots.length ? spec.spots.map((h) => new THREE.Vector3(h[0], h[1], h[2])) : [this.pos.clone()];
    this.spots = sp;
    this.spot = 0;
    this.base = sp[0].clone();
    this.aim = !!spec.aim;
    this.sight = spec.sight ?? 16;
    this.hideT = spec.hide ?? 2.0;
    this.shots = Math.max(1, spec.shots ?? 2);
    this.interval = Math.max(SPIT, spec.interval ?? 1.1);
    this.flight = spec.flight ?? 1.15;
    this.lead = spec.lead ?? 0;
    this.maxHp = spec.hp ?? 1;
    this.hp = this.maxHp;
    this.rises = 0; this.fireballs = 0; this.hits = 0;
    this.left = 0;
    this.fired = false;
    this.riseK = 0;
    this.timer = ((((spec.phase ?? 0) % 1) + 1) % 1) * this.hideT;
    this.state = 'hidden';
    this.touch = false;
    this.headW = new THREE.Vector3();
    let model = null;
    if (level.view) model = this.setModel(getModel('lavadrache', { color: this.color, segments: spec.segments ?? 7 }));
    // Kopf- und Maulpunkt einmal vermessen (aufgetaucht; deterministisch, unabhängig vom Zeichnen)
    this.headOff = localOffset(`lavadrache:head:${spec.segments ?? 7}`, model, { anim: 'idle', rise: 1 }, (o) => model.root.userData.head(o), { x: 1.1, y: 3.0, z: 0 });
    this.mouthOff = localOffset(`lavadrache:mouth:${spec.segments ?? 7}`, model, { anim: 'spit', progress: SPIT_AT }, (o) => model.mouth(o), { x: 1.8, y: 2.9, z: 0 });
    this.initShadows(2);
    this.surface();
    this.facePlayerNow();
    this.placeHead();
  }

  /** Lava-Oberfläche an der Auftauchstelle nachführen. */
  surface() {
    const b = this.base;
    const l = lavaAt(this.level, b.x, b.z, b.y - 6, b.y + 6);
    if (l) b.y = l.top;
  }

  /** Kopfmitte (Welt) aus Auftauch-Stellung riseK. */
  head(out = this.headW) {
    const k = this.riseK;
    const o = toWorld(this.base, this.yaw, this.headOff.x * smooth((k - 0.3) / 0.7), 0, this.headOff.z, {});
    return out.set(o.x, this.base.y - 0.6 + (this.headOff.y + 0.6) * k, o.z);
  }

  /** Hülle (pos = Fußpunkt) an den Kopf setzen. */
  placeHead() {
    const h = this.head();
    this.pos.set(h.x, h.y - this.half.y, h.z);
  }

  facePlayerNow() {
    const p = this.player;
    if (activeFigure(p)) this.yaw = Math.atan2(-(p.pos.z - this.base.z), p.pos.x - this.base.x);
  }

  turnToPlayer(dt, rate = 4) {
    const p = this.player;
    if (!activeFigure(p)) return;
    const want = Math.atan2(-(p.pos.z - this.base.z), p.pos.x - this.base.x);
    let d = want - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * Math.min(1, dt * rate);
  }

  update(dt) {
    this.stateT += dt;
    switch (this.state) {
      case 'hidden': {
        this.timer += dt;
        this.riseK = 0;
        this.surface();
        this.placeHead();
        const p = this.player;
        if (this.timer >= this.hideT && activeFigure(p) && Math.hypot(p.pos.x - this.base.x, p.pos.z - this.base.z) < this.sight && p.pos.y > this.base.y - 3) this.startRise();
        return;
      }
      case 'rise':
        this.riseK = smooth(this.stateT / RISE);
        this.turnToPlayer(dt, 6);
        this.touch = this.riseK > 0.45;
        this.placeHead();
        this.neckHurt();
        if (this.stateT >= RISE) { this.riseK = 1; this.setState('idle'); }
        return;
      case 'idle':
        this.turnToPlayer(dt, 5);
        this.placeHead();
        this.neckHurt();
        if (this.stateT >= IDLE) this.startSpit();
        return;
      case 'spit':
        this.turnToPlayer(dt, this.stateT < SPIT * 0.4 ? 5 : 1);
        this.placeHead();
        this.neckHurt();
        if (!this.fired && this.stateT >= SPIT * SPIT_AT) this.fire();
        if (this.stateT >= this.interval) {
          this.left--;
          if (this.left > 0) this.startSpit(false);
          else this.startSink();
        }
        return;
      case 'hit':
      case 'sink': {
        const T = this.state === 'hit' ? HIT : SINK;
        this.riseK = 1 - smooth(this.stateT / T);
        this.touch = this.state === 'sink' && this.riseK > 0.45;
        this.placeHead();
        if (this.stateT >= T) this.hide();
        return;
      }
      case 'defeated':
        this.riseK = 1 - smooth((this.stateT / DEFEAT - 0.35) / 0.65);
        this.placeHead();
        if (this.stateT >= DEFEAT) this.kill();
        return;
      default: break;
    }
  }

  startRise() {
    this.rises++;
    this.facePlayerNow();
    this.setState('rise');
    this.level.sfx('burn');
    this.level.effects?.sparks({ x: this.base.x, y: this.base.y + 0.2, z: this.base.z }, 10);
  }

  startSpit(first = true) {
    if (first) this.left = this.shots;
    this.fired = false;
    this.setState('spit');
  }

  /** Feuerball im Bogen auf die Stelle der Figur. */
  fire() {
    this.fired = true;
    const p = this.player;
    const m = toWorld(this.base, this.yaw, this.mouthOff.x, this.mouthOff.y, this.mouthOff.z, {});
    m.y = this.base.y + this.mouthOff.y;
    let tx, ty, tz;
    if (activeFigure(p)) {
      const dx = p.pos.x - m.x, dz = p.pos.z - m.z, d = Math.hypot(dx, dz) || 1;
      tx = p.pos.x - (dx / d) * this.lead; ty = p.pos.y; tz = p.pos.z - (dz / d) * this.lead;
    } else {
      tx = m.x + Math.cos(this.yaw) * 6; ty = this.base.y; tz = m.z - Math.sin(this.yaw) * 6;
    }
    const v = arcVel({ x: m.x, y: m.y - 0.18, z: m.z }, { x: tx, y: ty, z: tz }, this.flight, 40);
    this.level.spawn('feuerkugel', { pos: [m.x, m.y - 0.18, m.z], vel: [v.x, v.y, v.z], mode: 'bounce', owner: this, color: this.color, life: this.flight + 1.6 });
    this.fireballs++;
    this.level.sfx('fireball');
  }

  startSink() {
    this.setState('sink');
    this.level.sfx('splash');
  }

  /** Abgetaucht: nächste Auftauchstelle wählen. */
  hide() {
    this.setState('hidden');
    this.touch = false;
    this.timer = 0;
    this.riseK = 0;
    const n = this.spots.length;
    if (n > 1) {
      let j = (this.spot + 1) % n;
      const p = this.player;
      if (this.aim && activeFigure(p)) {
        let bd = Infinity;
        for (let i = 0; i < n; i++) { const d = Math.hypot(this.spots[i].x - p.pos.x, this.spots[i].z - p.pos.z); if (d < bd) { bd = d; j = i; } }
      }
      this.spot = j;
      this.base.copy(this.spots[j]);
      this.surface();
    }
    this.placeHead();
  }

  /** Hals (Linie Lava → Kopf) verletzt Figuren, die ihn berühren. */
  neckHurt() {
    if (this.riseK < 0.5) return;
    const h = this.head();
    const ax = this.base.x, ay = this.base.y, az = this.base.z;
    const bx = h.x, by = h.y - 0.4, bz = h.z;
    const lx = bx - ax, ly = by - ay, lz = bz - az, L2 = lx * lx + ly * ly + lz * lz || 1;
    for (const p of [this.player]) {
      if (!activeFigure(p) || p.invuln > 0) continue;
      const c = p.center();
      const t = clamp(((c.x - ax) * lx + (c.y - ay) * ly + (c.z - az) * lz) / L2, 0, 1);
      const qx = ax + lx * t, qy = ay + ly * t, qz = az + lz * t;
      if (Math.hypot((c.x - qx) / (0.4 + p.half.x), (c.y - qy) / (0.4 + p.half.y), (c.z - qz) / (0.4 + p.half.z)) < 1) p.hurt(this);
    }
  }

  takeHit(source) {
    this.hp--;
    this.hits++;
    this.level.effects?.sparks(this.head(), 12);
    if (this.hp <= 0) {
      this.setState('defeated');
      this.touch = false;
      this.level.sfx('stomp');
      this.level.sfx('splash');
      this.markDefeated();
      return;
    }
    this.setState('hit');
    this.touch = false;
    this.level.sfx('boss_hit');
  }

  get up() { return this.state === 'rise' || this.state === 'idle' || this.state === 'spit' || this.state === 'sink'; }

  onPlayer(player, contact) {
    if (this.defeated || !this.up || this.riseK < 0.45) return 'none';
    if (hurtsFrom(contact) === 'attack') { this.onHit('claw', player); return 'none'; }
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated || !this.up) return;
    if (HOT_KILL.has(kind)) { this.takeHit(source); return; }
    if (kind === 'fire') this.level.effects?.sparks(this.head(), 3);   // Feuer prallt ab
  }

  modelState() {
    const s = this.state;
    if (s === 'hidden') return { anim: 'hidden' };
    if (s === 'rise') return { anim: 'rise', progress: clamp(this.stateT / RISE, 0, 1) };
    if (s === 'spit') return { anim: 'spit', progress: clamp(this.stateT / SPIT, 0, 1) };
    if (s === 'sink') return { anim: 'sink', progress: clamp(this.stateT / SINK, 0, 1) };
    if (s === 'hit') return { anim: 'sink', progress: clamp(this.stateT / HIT, 0, 1) };
    if (s === 'defeated') return { anim: 'defeated', progress: clamp(this.stateT / DEFEAT, 0, 1) };
    return { anim: 'idle' };
  }

  syncModel() {
    if (!this.model) return;
    this.model.root.position.copy(this.base);
    this.model.root.rotation.y = this.yaw;
  }

  info() {
    const h = this.head(new THREE.Vector3());
    return {
      state: this.state, hp: this.hp, rises: this.rises, fireballs: this.fireballs, hits: this.hits, spot: this.spot, defeated: this.defeated,
      rise: +this.riseK.toFixed(2), head: [+h.x.toFixed(2), +h.y.toFixed(2), +h.z.toFixed(2)],
    };
  }
}

export const KINDS = { lavadrache: (level, spec) => new Lavadrache(level, spec) };
