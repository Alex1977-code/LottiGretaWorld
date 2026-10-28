// Schubser-Prinz – Endgegner 6-A (Bauplan „Prince Bully Blockade: Käfig ca. 20 × 20 m mit 2 × 3 Glasröhren an den Wänden.
// Schubser-Prinz rammt, spuckt nach Ausrutschen einen Feuerball. In eine Röhre rammen, nochmal rammen, er schießt gequetscht
// aus einer anderen Röhre – dann treten. 3 Tritte.“). Großer königsblauer Schubser mit Krone und Umhang (Modell
// 'schubser_prinz').
//
// Ablauf (Phase = maxHp − hp + 1; Werte je Phase als [P1, P2, P3]):
//   wait → begin(): intro (2 s, stampft, schnaubt) → aim (warn s: dreht sich zur Figur, scharrt) → charge (charge m/s,
//   höchstens chargeTime s, lenkt turn rad/s nach; Berührung **verletzt** und stößt die Figur weit weg) → skid (rutscht
//   skid s aus – „rutscht nach dem Ausweichen“) → fire (0,8 s: spuckt fire Feuerkugeln aus model.mouth(), fächerförmig, sie
//   hüpfen über den Boden) → aim …
//   **Zurückstoßen** wie beim Schubser (Draufspringen = Abprall, Stampfattacke, Sprung/Rennen gegen ihn, Angriffe): er rutscht
//   (knock m/s, Reibung 5 m/s²) und prallt von den Käfigwänden ab. Rutscht er – gestoßen, beim Ausrutschen oder im Anlauf –
//   rückwärts bzw. vorwärts **in eine Röhrenmündung** (pipes), **steckt er fest** (stuck, höchstens stuck s, strampelt; danach
//   befreit er sich). **Noch ein Stoß** (Berührung, Draufspringen, Angriff) drückt ihn hinein: er saust durch die Röhre (pipe,
//   travel m/s; entlang route sichtbar, sonst verborgen) und **schießt gequetscht** aus der anderen Röhre (to; ohne to eine
//   zufällige andere) – squeezed (0,6 s Flug in die Arena) → **benommen** (stunned stun s, Schwindelsterne): **ein Tritt**
//   (Draufspringen/Stampfattacke) = Treffer → hit (0,6 s) → recover → aim (nächste Phase: schneller, mehr Feuerkugeln).
//   3 Treffer → defeated (2 s, Krone fällt) → gone: Stern (star) erscheint; Boss-Archetyp: Fanfare, Warp-Box.
//   Feuer, Krallen, Panzer, Wurf, Explosion, Stern, Riese **schaden ihm nicht** (stoßen ihn nur); Treffer nur benommen.
//   Kein `enemy`, `boss: true`.
// Ansagen (arch.hud.banner, ersetzen die Standardtexte): „Stoß ihn in eine Glasröhre!“ (erster Anlauf), „Noch einmal
//   stoßen!“ (steckt zum ersten Mal), „Jetzt draufspringen!“ (zum ersten Mal benommen), Phase 2 „Er wird schneller!“,
//   Phase 3 „Jetzt spuckt er drei Feuerbälle!“.
// Boss-Archetyp-Schnittstelle wie graf_brummbaer_hw.js: begin(), reset(), state, stateT, hp, maxHp, phase, visible, home
//   (= Arenamitte), half, carHits (0), vulnerable, info(); level.onBossHit(boss, 'tritt'), level.onBossDefeated(boss).
//   Tod im Kampf (reset): Prinz 3/3 am Start, Feuerkugeln weg. Ohne Archetyp beginnt der Kampf ab wakeR m, drop erscheint
//   nach 'gone' in der Arenamitte.
//
// Daten: { kind: 'schubser_prinz', id: 'prinz', pos (Start, Fußpunkt), dir?: [0, 1] (Start-Blick),
//          arena?: { center: [x, y, z], size: [w, d] } | { min: [x, z], max: [x, z], y } (Käfig-Innenfläche; Standard
//                  center = pos, 18 × 18),
//          net?: 'id' eines Glasröhren-Netzes (Baustein glasnetz, Präzisierung Motor und Bausteine Welt 6): alle Öffnungen des
//                Netzes sind Mündungen (Öffnung = Knotenmitte; Mündung am Boden darunter, Richtung = aus der Röhre heraus);
//                er fährt die Röhren entlang (an Kreuzungen in Richtung der Weiche bzw. der ersten anderen Röhre) bis zur
//                nächsten Öffnung – sichtbar im Glas. Das Netz nimmt ihn nicht selbst mit (boss).
//          pipes?: [{ id?, pos: [x, y, z] (Mündung: Mitte unten an der Käfigwand), dir: [dx, dz] (Öffnung zeigt in die Arena),
//                    to?: Index | id (Ausgang), route?: [[x, y, z], …] (Röhrenmitte von dieser Mündung zur Ausgangsmündung,
//                    sichtbare Fahrt) }, …]   (statt net: eigene Mündungen, z. B. mit Baustein glasspipe als Optik),
//          hp?: 3, charge?: [6, 7, 8] (m/s), chargeTime?: [2.2, 2.0, 1.8], turn?: [0.5, 0.7, 0.9] (rad/s), warn?: [0.9, 0.7,
//          0.55], skid?: [1.0, 0.85, 0.7], fire?: [1, 2, 3], fireSpeed?: 6.5, stuck?: 3.5, stun?: [3.0, 2.6, 2.2],
//          push?: 12, lift?: 7 (Rammstoß auf die Figur), knock?: 6 (m/s Rutschen bei Draufspringen/Gegenrennen; Angriffe 7),
//          travel?: 18 (m/s in der Röhre, höchstens travelMax 2,2 s), star?: { pos, index } | [x, y, z], wakeR?: 10, drop?, seed? }
//   boss: { id: 'prinz', name: 'Schubser-Prinz', speed: 0, trigger, lock, warp, warpPos, warpTo, frame: 0.45, center }
// Laufzeit: charges, fireballs, pushes (gestoßen), stucks, trips (Röhrenfahrten), tripLog ([{ from, to }]), hits, hitLog,
//   bounces (Kopfsprünge ohne Treffer), rams (Rammstöße auf die Figur), pipe (aktuelle Röhre), info().
// Sound: 'step', 'swoop', 'slam', 'bounce', 'fireball', 'pipe', 'boss_hit', 'stomp', 'powerdown', 'vanish'.

import * as THREE from 'three';
import { EnemyW2, figures, activeFigure, clamp, toWorld, localOffset } from '../EnemyW2.js';
import { spawnLoot } from '../Enemy.js';
import { getModel } from '../../models/index.js';
import { dizzyStars } from '../../models/lib/kit.js';
import { shoveFigure, approachSpeed, dirFromTo, Lcg, bossManaged } from '../w6help.js';
import { slideStep } from './schubser_w6.js';

const pick = (v, ph, def) => (Array.isArray(v) ? v[Math.min(v.length - 1, ph - 1)] : v ?? def[ph - 1]);
const INTRO = 2.0, FIRE = 0.8, FIRE_AT = 0.45, HIT = 0.6, RECOVER = 0.6, SQUEEZE = 0.6, DEFEAT = 2.0, PUSHED_ANIM = 0.5;
const R = 1.0;   // Körperradius

class SchubserPrinz extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'schubser_prinz');
    this.enemy = false;
    this.boss = true;
    this.wake = 0;
    this.edges = false;
    this.noIce = true;
    this.half.set(R, 1.1, R);
    this.shadow = 1.15;
    this.start = this.pos.clone();
    const a = spec.arena ?? {};
    if (a.min && a.max) {
      this.box = { x0: a.min[0], z0: a.min[1], x1: a.max[0], z1: a.max[1] };
      this.home = new THREE.Vector3((a.min[0] + a.max[0]) / 2, a.y ?? this.start.y, (a.min[1] + a.max[1]) / 2);
    } else {
      const c = a.center ?? [this.start.x, this.start.y, this.start.z], s = a.size ?? [18, 18];
      this.box = { x0: c[0] - s[0] / 2, z0: c[2] - s[1] / 2, x1: c[0] + s[0] / 2, z1: c[2] + s[1] / 2 };
      this.home = new THREE.Vector3(c[0], c[1], c[2]);
    }
    this.startYaw = Array.isArray(spec.dir) ? Math.atan2(-spec.dir[1], spec.dir[0]) : -Math.PI / 2;
    this.pipeList = (spec.pipes ?? []).map((p, i) => {
      const d = p.dir ?? [0, 1], l = Math.hypot(d[0], d[1]) || 1;
      return { i, id: p.id ?? `r${i}`, x: p.pos[0], y: p.pos[1], z: p.pos[2], dx: d[0] / l, dz: d[1] / l, to: p.to, route: p.route ?? null, drop: 1 };
    });
    this.netPipes = null;
    this.maxHp = spec.hp ?? 3;
    this.hp = this.maxHp;
    this.carHits = 0;
    this.visible = true;
    this.wakeR = spec.wakeR ?? 10;
    this.slide = { x: 0, z: 0 };
    this.chargeDir = { x: 0, z: 1 };
    this.fireList = [];
    this.dizzy = null;
    if (level.view) {
      this.setModel(getModel('schubser_prinz'));
      this.dizzy = dizzyStars(0.8, 0.2);
      level.view.add(this.dizzy);
    }
    this.initShadows(3);
    const m = this.model;
    this.mouthOff = localOffset('schubser_prinz:mouth', m, { anim: 'fireball', progress: 0.5, hp: 3 }, (o) => m.mouth(o), { x: 1.35, y: 1.25, z: 0 });
    this.resetFields();
  }

  resetFields() {
    this.state = 'wait';
    this.stateT = 0;
    this.pos.copy(this.start);
    this.vel.set(0, 0, 0);
    this.slide.x = 0; this.slide.z = 0;
    this.yaw = this.startYaw;
    this.charges = 0; this.fireballs = 0; this.pushes = 0; this.stucks = 0; this.trips = 0; this.hits = 0; this.bounces = 0; this.rams = 0;
    this.tripLog = []; this.hitLog = [];
    this.pipe = null; this.exit = null; this.trip = null;
    this.bumpT = 0; this.grace = 0;
    this.hinted = {};
    this.starDone = false; this.dropped = false;
    this.fired = false;
    this.squash = 1;
    this.rnd = new Lcg(this.spec.seed ?? 0x5b1d07);
  }

  /** Mündungen: eigene (pipes) bzw. die Öffnungen des Glasröhren-Netzes (net), einmal ausgelesen. */
  get pipes() {
    if (!this.spec.net) return this.pipeList;
    if (this.netPipes) return this.netPipes;
    const net = this.level.named.get(this.spec.net);
    if (!net?.nodes) return this.pipeList;
    this.netPipes = netMouths(net);
    return this.netPipes;
  }

  get phase() { return clamp(this.maxHp - this.hp + 1, 1, 3); }
  get managed() { return bossManaged(this.level, this.spec.id); }
  val(key, def) { return pick(this.spec[key], this.phase, def); }
  get vulnerable() { return this.state === 'stunned' && this.hp > 0; }
  get slideSpeed() { return Math.hypot(this.slide.x, this.slide.z); }
  /** Im Käfig gibt es keine Lava; Absturz zählt nicht als Sieg. */
  checkLava() { return false; }

  setState(s) { this.state = s; this.stateT = 0; }

  // ------------------------------------------------------------------ Archetyp-Schnittstelle

  begin() {
    if (this.state !== 'wait') return;
    this.setState('intro');
    this.faceFigure(1);
    this.level.sfx('slam');
  }

  reset() {
    for (const f of this.fireList) if (!f.removed) f.kill();
    this.fireList.length = 0;
    this.hp = this.maxHp;
    this.defeated = false;
    this.visible = true;
    this.touch = true;
    this.fellOut = false;
    if (this.model) { this.model.root.visible = true; this.model.root.scale.setScalar(1); }
    this.resetFields();
  }

  // ------------------------------------------------------------------ Schritt

  update(dt) {
    this.stateT += dt;
    if (this.bumpT > 0) this.bumpT -= dt;
    if (this.grace > 0) this.grace -= dt;
    this.fireList = this.fireList.filter((f) => !f.removed);
    this.run(dt);
    this.syncArch();
  }

  run(dt) {
    switch (this.state) {
      case 'wait':
        this.stand(dt);
        if (!this.managed) {
          for (const p of figures(this.level)) if (activeFigure(p) && Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < this.wakeR) { this.begin(); break; }
        }
        return;
      case 'intro':
        this.stand(dt);
        this.faceFigure(dt, 4);
        if (this.stateT > 0.6 && this.stateT - dt <= 0.6) { this.level.shake(0.35); this.level.effects?.dust(this.pos, 8, 1.6); this.level.sfx('slam'); }
        if (this.stateT >= INTRO) this.startAim();
        return;
      case 'aim':
        this.stand(dt);
        this.faceFigure(dt, 9);
        if (this.stateT >= this.val('warn', [0.9, 0.7, 0.55])) this.startCharge();
        return;
      case 'charge': this.chargeStep(dt); return;
      case 'skid': this.skidStep(dt); return;
      case 'fire':
        this.stand(dt);
        this.faceFigure(dt, 6);
        if (!this.fired && this.stateT >= FIRE * FIRE_AT) this.spit();
        if (this.stateT >= FIRE) this.startAim();
        return;
      case 'pushed': {
        const { wall } = slideStep(this, dt, 5, 0.4);
        if (wall) { this.level.sfx('slam'); this.level.shake(0.15); this.level.effects?.dust(this.pos, 3, 1); }
        this.keepInside();
        if (this.checkPipe()) return;
        if (this.grounded && this.slideSpeed < 0.3 && this.stateT > 0.1) { this.slide.x = 0; this.slide.z = 0; this.setState('recover'); }
        return;
      }
      case 'recover':
        this.stand(dt);
        this.faceFigure(dt, 4);
        if (this.stateT >= RECOVER) this.startAim();
        return;
      case 'stuck': {
        const m = this.pipe;
        this.pos.set(m.x + m.dx * R * 0.55, m.y, m.z + m.dz * R * 0.55);
        this.vel.set(0, 0, 0);
        this.yaw = Math.atan2(-m.dz, m.dx);
        if (this.stateT >= (this.spec.stuck ?? 3.5)) {
          // befreit sich: hüpft aus der Mündung zurück in die Arena
          this.slide.x = m.dx * 4; this.slide.z = m.dz * 4;
          this.pipe = null;
          this.setState('pushed');
          this.level.sfx('bounce');
        }
        return;
      }
      case 'pipe': this.tripStep(dt); return;
      case 'squeezed': {
        this.vel.x = this.exit.dx * 8; this.vel.z = this.exit.dz * 8;
        if (this.stateT > 0.25) { this.vel.x *= 0.5; this.vel.z *= 0.5; }
        this.moveWithGravity(dt);
        this.keepInside();
        if (this.stateT >= SQUEEZE && this.grounded) {
          this.setState('stunned');
          this.level.sfx('land');
          this.level.effects?.dust(this.pos, 6, 1.2);
          this.hint('stun', 'Jetzt draufspringen!');
        }
        return;
      }
      case 'stunned':
        this.stand(dt);
        if (this.stateT >= this.val('stun', [3.0, 2.6, 2.2])) this.setState('recover');
        return;
      case 'hit':
        this.stand(dt);
        if (this.stateT >= HIT) this.setState(this.hp > 0 ? 'recover' : 'defeated');
        return;
      case 'defeated':
        this.stand(dt);
        if (this.stateT >= DEFEAT) this.vanish();
        return;
      default: this.stand(dt);
    }
  }

  faceFigure(dt, rate = 8) {
    const p = this.player;
    if (!activeFigure(p)) return;
    const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z;
    if (dt === 1) { this.yaw = Math.atan2(-dz, dx); return; }
    this.faceToward(dx, dz, dt, rate);
  }

  hint(key, text, o = {}) {
    if (this.hinted[key]) return;
    this.hinted[key] = true;
    this.level.archetype?.hud?.banner?.(text, { hold: 1.8, size: 13, y: 0.36, ...o });
  }

  startAim() {
    this.setState('aim');
    this.level.sfx('step');
    this.hint('first', 'Stoß ihn in eine Glasröhre!', { hold: 2.2 });
  }

  startCharge() {
    const p = this.player;
    const d = activeFigure(p) ? dirFromTo(this.pos, p.pos, this.facing({})) : this.facing({});
    this.chargeDir.x = d.x; this.chargeDir.z = d.z;
    this.target = activeFigure(p) ? { x: p.pos.x, z: p.pos.z } : null;
    this.yaw = Math.atan2(-d.z, d.x);
    this.charges++;
    this.setState('charge');
    this.level.sfx('swoop');
  }

  chargeStep(dt) {
    const p = this.player;
    const turn = this.val('turn', [0.5, 0.7, 0.9]);
    if (activeFigure(p)) {
      const t = dirFromTo(this.pos, p.pos, this.chargeDir);
      const ahead = t.x * this.chargeDir.x + t.z * this.chargeDir.z;
      if (ahead > 0.2) {
        const cross = this.chargeDir.x * t.z - this.chargeDir.z * t.x;
        const a = clamp(Math.atan2(cross, ahead), -turn * dt, turn * dt), c = Math.cos(a), s = Math.sin(a);
        const x = this.chargeDir.x * c - this.chargeDir.z * s, z = this.chargeDir.x * s + this.chargeDir.z * c;
        this.chargeDir.x = x; this.chargeDir.z = z;
      }
    }
    const v = this.val('charge', [6, 7, 8]);
    this.vel.x = this.chargeDir.x * v; this.vel.z = this.chargeDir.z * v;
    const res = this.moveWithGravity(dt);
    this.yaw = Math.atan2(-this.chargeDir.z, this.chargeDir.x);
    if (Math.floor(this.stateT * 10) !== Math.floor((this.stateT - dt) * 10)) this.level.effects?.dust(this.pos, 1, 0.8);
    if (this.checkPipe()) return;
    const edge = this.keepInside();
    if (res.hitWall || edge) { this.level.sfx('slam'); this.level.shake(0.25); this.startSkid(0); return; }
    // an der Figur vorbei (ausgewichen) oder Zeit um → ausrutschen
    const passed = this.target && ((this.target.x - this.pos.x) * this.chargeDir.x + (this.target.z - this.pos.z) * this.chargeDir.z) < -2.5;
    if (this.stateT >= this.val('chargeTime', [2.2, 2.0, 1.8]) || passed) this.startSkid(v);
  }

  startSkid(v) {
    this.skidFrom = v;
    this.setState('skid');
  }

  skidStep(dt) {
    const T = this.val('skid', [1.0, 0.85, 0.7]);
    const v = Math.max(0, this.skidFrom * (1 - this.stateT / T));
    this.vel.x = this.chargeDir.x * v; this.vel.z = this.chargeDir.z * v;
    const res = this.moveWithGravity(dt);
    if (this.checkPipe()) return;
    if (this.keepInside() || res.hitWall) this.skidFrom = 0;
    if (this.stateT >= T) this.startFire();
  }

  startFire() {
    this.fired = false;
    this.setState('fire');
  }

  /** Feuerkugeln aus dem Maul (fächerförmig zur Figur). */
  spit() {
    this.fired = true;
    const n = this.val('fire', [1, 2, 3]);
    const sp = this.spec.fireSpeed ?? 6.5;
    const m = toWorld(this.pos, this.yaw, this.mouthOff.x, this.mouthOff.y, this.mouthOff.z, {});
    const p = this.player;
    const base = activeFigure(p) ? Math.atan2(-(p.pos.z - this.pos.z), p.pos.x - this.pos.x) : this.yaw;
    const spread = n <= 1 ? 0 : n === 2 ? 0.21 : 0.32;
    for (let i = 0; i < n; i++) {
      const a = base + (n <= 1 ? 0 : -spread + (2 * spread * i) / (n - 1));
      const dx = Math.cos(a), dz = -Math.sin(a);
      const f = this.level.spawn('feuerkugel', { pos: [m.x, m.y - 0.17, m.z], vel: [dx * sp, 1.5, dz * sp], mode: 'bounce', owner: this, life: 3.2 });
      if (f) { this.fireList.push(f); this.fireballs++; }
    }
    this.level.sfx('fireball');
  }

  /** In der Käfig-Innenfläche halten (Rechteck minus Körperradius). true = an der Grenze. */
  keepInside() {
    const b = this.box, m = R + 0.05;
    let hit = false;
    if (this.pos.x < b.x0 + m) { this.pos.x = b.x0 + m; if (this.slide.x < 0) this.slide.x = -this.slide.x * 0.4; hit = true; }
    if (this.pos.x > b.x1 - m) { this.pos.x = b.x1 - m; if (this.slide.x > 0) this.slide.x = -this.slide.x * 0.4; hit = true; }
    if (this.pos.z < b.z0 + m) { this.pos.z = b.z0 + m; if (this.slide.z < 0) this.slide.z = -this.slide.z * 0.4; hit = true; }
    if (this.pos.z > b.z1 - m) { this.pos.z = b.z1 - m; if (this.slide.z > 0) this.slide.z = -this.slide.z * 0.4; hit = true; }
    return hit;
  }

  /** Rutscht/rennt er gerade in eine Röhrenmündung? → stuck. */
  checkPipe() {
    if (!this.pipes.length) return false;
    const vx = this.state === 'pushed' ? this.slide.x : this.vel.x, vz = this.state === 'pushed' ? this.slide.z : this.vel.z;
    for (const m of this.pipes) {
      const rx = this.pos.x - m.x, rz = this.pos.z - m.z;
      const along = rx * m.dx + rz * m.dz, across = Math.abs(rx * m.dz - rz * m.dx);
      if (along > R + 0.55 || along < -0.5 || across > 1.05) continue;
      if (vx * m.dx + vz * m.dz > -0.8) continue;
      this.enterStuck(m);
      return true;
    }
    return false;
  }

  enterStuck(m) {
    this.pipe = m;
    this.stucks++;
    this.slide.x = 0; this.slide.z = 0;
    this.vel.set(0, 0, 0);
    this.bumpT = 0.25;
    this.setState('stuck');
    this.level.sfx('blockhit');
    this.level.shake(0.2);
    this.level.effects?.sparks({ x: m.x, y: m.y + 1, z: m.z }, 8);
    this.hint('stuck', 'Noch einmal stoßen!');
  }

  /** Ausgang zu Mündung m: to (Index/Id) oder zufällig eine andere. */
  exitOf(m) {
    if (m.to !== undefined && m.to !== null) {
      const t = typeof m.to === 'number' ? this.pipes[m.to] : this.pipes.find((q) => q.id === m.to);
      if (t && t !== m) return t;
    }
    const back = this.pipes.find((q) => q !== m && (q.to === m.i || q.to === m.id));
    if (back) return back;
    const others = this.pipes.filter((q) => q !== m);
    return others[this.rnd.int(others.length)] ?? m;
  }

  /** Zweiter Stoß: durch die Röhre. */
  pushThrough() {
    const m = this.pipe;
    if (!m || this.state !== 'stuck') return;
    const t = this.exitOf(m);
    // Weg: route dieser Mündung, sonst umgekehrte route der Gegenseite, sonst verborgen (gerade Linie)
    let pts = m.route?.length ? m.route.map((p) => ({ x: p[0], y: p[1], z: p[2] })) : null;
    if (!pts && t.route?.length && (this.exitOf(t) === m)) pts = t.route.map((p) => ({ x: p[0], y: p[1], z: p[2] })).reverse();
    const drop = m.drop ?? 1;
    const visible = !!pts;
    if (!pts) pts = [{ x: m.x, y: m.y + 1, z: m.z }, { x: t.x, y: t.y + 1, z: t.z }];
    let L = 0;
    for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y, pts[i].z - pts[i - 1].z);
    this.trip = { from: m, to: t, pts, L, T: clamp(L / (this.spec.travel ?? 18), 0.6, this.spec.travelMax ?? 2.2), visible, drop };
    this.trips++;
    this.tripLog.push({ from: m.id, to: t.id });
    this.exit = t;
    this.pipe = null;
    this.touch = false;
    this.setState('pipe');
    this.level.sfx('pipe');
    this.level.sfx('swoop');
    this.level.effects?.dust({ x: m.x, y: m.y + 0.6, z: m.z }, 6, 1.2);
  }

  tripStep() {
    const tr = this.trip;
    const k = clamp(this.stateT / tr.T, 0, 1);
    // Lage entlang der Röhre (Fußpunkt = Mitte − 1)
    let s = k * tr.L;
    let q = tr.pts[tr.pts.length - 1];
    for (let i = 1; i < tr.pts.length; i++) {
      const a = tr.pts[i - 1], b = tr.pts[i], l = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
      if (s <= l || i === tr.pts.length - 1) {
        const u = l > 0 ? clamp(s / l, 0, 1) : 1;
        q = { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u };
        if (l > 0.01) this.yaw = Math.atan2(-(b.z - a.z), b.x - a.x);
        break;
      }
      s -= l;
    }
    this.pos.set(q.x, q.y - tr.drop, q.z);
    if (k >= 1) {
      const t = tr.to;
      this.pos.set(t.x + t.dx * (R + 0.2), t.y, t.z + t.dz * (R + 0.2));
      this.yaw = Math.atan2(-t.dz, t.dx);
      this.vel.set(t.dx * 8, 5, t.dz * 8);
      this.grounded = false;
      this.touch = true;
      this.trip = null;
      this.setState('squeezed');
      this.level.sfx('pipe');
      this.level.sfx('bounce');
      this.level.effects?.dust({ x: t.x, y: t.y + 0.8, z: t.z }, 8, 1.4);
    }
  }

  // ------------------------------------------------------------------ Stoßen und Treffer

  shoveBy(source, speed, how = 'hit') {
    if (!['aim', 'charge', 'skid', 'fire', 'pushed', 'recover'].includes(this.state)) return false;
    const sp = source?.pos ?? this.pos;
    const d = dirFromTo(sp, this.pos, source?.facingVec ? source.facingVec() : this.facing({}));
    if (source?.vel && (how === 'stomp' || how === 'pound' || how === 'bump')) {
      const hs = Math.hypot(source.vel.x, source.vel.z);
      if (hs > 1.5) { d.x = d.x * 0.4 + (source.vel.x / hs) * 0.6; d.z = d.z * 0.4 + (source.vel.z / hs) * 0.6; const l = Math.hypot(d.x, d.z) || 1; d.x /= l; d.z /= l; }
    }
    this.slide.x = d.x * speed; this.slide.z = d.z * speed;
    this.yaw = Math.atan2(d.z, -d.x);
    this.pushes++;
    this.bumpT = 0.3;
    this.setState('pushed');
    this.level.sfx('bounce');
    this.level.effects?.dust(this.pos, 5, 1.1);
    return true;
  }

  takeHit() {
    if (this.hp <= 0) return;
    this.hp = Math.max(0, this.hp - 1);
    this.hits++;
    this.hitLog.push({ t: +this.level.time.toFixed(2), hp: this.hp, trip: this.tripLog[this.tripLog.length - 1] ?? null });
    this.grace = 0.4;
    this.vel.set(0, 0, 0);
    this.setState('hit');
    this.level.sfx('boss_hit');
    this.level.sfx('stomp');
    this.level.shake(0.5);
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 2.2, z: this.pos.z }, 20);
    this.level.onBossHit?.(this, 'tritt');
    if (this.hp <= 0) {
      this.defeated = true;
      this.touch = false;
      for (const f of this.fireList) if (!f.removed) f.poof?.();
      this.level.sfx('powerdown');
      this.level.onBossDefeated?.(this);
    }
  }

  onHit(kind, source) {
    if (!this.visible || this.hp <= 0) return;
    if (this.state === 'stuck' && kind !== 'bump') { this.pushThrough(); return; }
    if (kind === 'bump' || this.state === 'stunned') return;
    if (kind === 'pound' && source?.pos && Math.abs(source.pos.y - this.pos.y) > 1.2) return;
    if (this.shoveBy(source, kind === 'bomb' || kind === 'cannon' ? 10 : kind === 'star' || kind === 'mega' ? 9 : 7, kind)) {
      this.level.effects?.sparks(this.center(), 4);
    }
  }

  onPlayer(player, contact) {
    if (!this.visible || this.hp <= 0) return 'none';
    const s = this.state;
    if (s === 'wait' || s === 'gone' || s === 'pipe' || s === 'hit' || s === 'defeated') return 'none';
    if (this.grace > 0 && player.vel.y > 0) return 'none';
    if (s === 'stunned') {
      if (contact.fromAbove || contact.pound) { this.takeHit(); return 'stomp'; }
      return 'none';
    }
    if (s === 'stuck') {
      if (contact.fromAbove || contact.pound) { this.pushThrough(); return 'stomp'; }
      if (this.bumpT > 0) return 'none';
      this.pushThrough();
      const back = dirFromTo(this.pos, player.pos);
      shoveFigure(player, back.x, back.z, 3, 3.5, 0.15);
      return 'none';
    }
    if (s === 'intro' || s === 'squeezed') {
      if (contact.fromAbove || contact.pound) { this.bounces++; this.grace = 0.3; return 'stomp'; }
      return 'none';
    }
    if (contact.fromAbove || contact.pound) {
      this.bounces++;
      this.grace = 0.3;
      this.shoveBy(player, contact.pound ? 8 : (this.spec.knock ?? 6), contact.pound ? 'pound' : 'stomp');
      return 'stomp';
    }
    if (contact.dive) { this.onHit('claw', player); return 'none'; }
    if (this.bumpT > 0) return 'none';
    if (s === 'charge') {
      // Rammstoß: verletzt und schleudert weit weg
      if (player.hurt(this)) {
        const away = dirFromTo(this.pos, player.pos, this.chargeDir);
        const x = this.chargeDir.x * 0.6 + away.x * 0.4, z = this.chargeDir.z * 0.6 + away.z * 0.4, l = Math.hypot(x, z) || 1;
        if (!player.dead) { player.vel.x = (x / l) * (this.spec.push ?? 12); player.vel.z = (z / l) * (this.spec.push ?? 12); player.vel.y = this.spec.lift ?? 7; player.airMax = this.spec.push ?? 12; }
        this.rams++;
      }
      this.bumpT = 0.4;
      this.startSkid(this.val('charge', [6, 7, 8]) * 0.5);
      return 'none';
    }
    const ap = approachSpeed(player, this);
    if (ap >= 2.5 || (player.mode === 'air' && ap >= 1.5) || (player.state === 'slide' && player.hSpeed?.() >= 2)) {
      this.shoveBy(player, clamp(ap * 1.0, this.spec.knock ?? 6, 9), 'bump');
      const back = dirFromTo(this.pos, player.pos);
      shoveFigure(player, back.x, back.z, 3, 3.5, 0.15);
      return 'none';
    }
    // langsame Berührung: er schiebt die Figur weg (ohne Schaden)
    const away = dirFromTo(this.pos, player.pos, this.facing({}));
    shoveFigure(player, away.x, away.z, 7, 4.5, 0.25);
    this.bumpT = 0.3;
    this.level.sfx('bounce');
    return 'none';
  }

  // ------------------------------------------------------------------ Ansagen, Sieg

  syncArch() {
    const arch = this.level.archetype;
    if (!arch || arch.boss !== this) return;
    const ph = this.phase;
    if (arch.seenPhase !== ph && this.state !== 'hit' && this.hp > 0) {
      arch.seenPhase = ph;
      if (ph === 2) arch.hud?.banner?.('Er wird schneller!', { hold: 1.4, size: 14, color: '#ffb040' });
      if (ph === 3) arch.hud?.banner?.(this.val('fire', [1, 2, 3]) >= 3 ? 'Jetzt spuckt er drei Feuerbälle!' : 'Er wird wütend!', { hold: 1.6, size: 14, color: '#ff7a3a' });
    }
  }

  vanish() {
    this.setState('gone');
    this.visible = false;
    this.touch = false;
    if (this.model) this.model.root.visible = false;
    this.level.effects?.dust(this.pos, 12, 1.8);
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 1.2, z: this.pos.z }, 16);
    this.level.sfx('vanish');
    const st = this.spec.star;
    if (st && !this.starDone) {
      this.starDone = true;
      const pos = Array.isArray(st) ? st : st.pos;
      this.level.spawn('star', { pos, index: Array.isArray(st) ? 0 : (st.index ?? 0) });
      this.level.effects?.sparks({ x: pos[0], y: pos[1] + 0.6, z: pos[2] }, 24);
    }
    if (!this.managed && !this.dropped && this.spec.drop) {
      this.dropped = true;
      spawnLoot(this.level, this.spec.drop, this.home.x, this.home.y + 0.5, this.home.z);
    }
  }

  // ------------------------------------------------------------------ Darstellung

  modelState() {
    const s = this.state, hp = Math.max(0, this.hp);
    if (s === 'charge') return { anim: 'charge', hp, speed: this.val('charge', [6, 7, 8]) };
    if (s === 'aim') return { anim: 'charge', hp, speed: 0.8 };
    if (s === 'skid') return { anim: 'skid', hp };
    if (s === 'fire') return { anim: 'fireball', hp, progress: Math.min(1, this.stateT / FIRE) };
    if (s === 'pushed') return this.stateT < PUSHED_ANIM ? { anim: 'hit', hp, progress: 0.15 + 0.5 * this.stateT / PUSHED_ANIM } : { anim: 'skid', hp };
    if (s === 'stuck') return { anim: 'stuck', hp };
    if (s === 'pipe') return { anim: 'squeezed', hp, progress: 0.1 };
    if (s === 'squeezed') return { anim: 'squeezed', hp, progress: Math.min(1, this.stateT / SQUEEZE) };
    if (s === 'hit') return { anim: 'hit', hp, progress: Math.min(1, this.stateT / HIT) };
    if (s === 'defeated' || s === 'gone') return { anim: 'defeated', hp: 0, progress: Math.min(1, this.stateT / 1.2) };
    return { anim: 'idle', hp };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    const r = this.model.root;
    r.visible = this.visible && !(this.state === 'pipe' && !this.trip?.visible);
    // in der Röhre gequetscht
    r.scale.setScalar(this.state === 'pipe' ? 0.6 : 1);
    if (this.state === 'stunned') r.rotation.z = Math.sin(this.level.time * 5) * 0.06;
    else r.rotation.z = 0;
  }

  render(dt, t) {
    super.render(dt, t);
    const d = this.dizzy;
    if (d) {
      d.visible = this.state === 'stunned' && this.visible;
      if (d.visible) { d.position.set(this.pos.x, this.pos.y + 2.95, this.pos.z); d.rotation.y += dt * 3.5; }
    }
  }

  info() {
    return {
      state: this.state, hp: this.hp, maxHp: this.maxHp, phase: this.phase, charges: this.charges, fireballs: this.fireballs,
      pushes: this.pushes, stucks: this.stucks, trips: this.trips, hits: this.hits, bounces: this.bounces, rams: this.rams,
      pipe: this.pipe?.id ?? null, vulnerable: this.vulnerable, x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2),
    };
  }

  dispose() {
    if (this.dizzy) { this.level.view?.remove(this.dizzy); this.dizzy = null; }
    super.dispose();
  }
}

/**
 * Mündungen aus einem Glasröhren-Netz (glasnetz-Handle { nodes, edges, R, switchOf }): je Öffnung { id, x, y (Boden unter der
 * Öffnung), z, dx, dz (aus der Röhre heraus), to (Name der erreichten Öffnung), route (Röhrenmitte dorthin) }.
 */
function netMouths(net) {
  const { nodes, edges } = net;
  const R = net.R ?? 1;
  const ptsOf = (e, fromA) => { const l = e.tr.pts.map((q) => [q.x, q.y, q.z]); return fromA ? l : l.reverse(); };
  const out = [];
  for (const n of nodes) {
    if (!n.end || !n.out) continue;
    // der Röhre folgen bis zur nächsten Öffnung
    let cur = n, e = edges[n.edges[0]], route = [], guard = 0;
    for (;;) {
      const fromA = e.a === cur.i;
      route = route.concat(ptsOf(e, fromA));
      const next = nodes[fromA ? e.b : e.a];
      if (next.end || ++guard > 32) { cur = next; break; }
      const want = net.switchOf?.(next.name);
      let ne = null;
      for (const ei of next.edges) {
        if (ei === e.i) continue;
        const f = edges[ei], other = nodes[f.a === next.i ? f.b : f.a];
        if (!ne || other.name === want) ne = f;
      }
      if (!ne) { cur = next; break; }
      cur = next; e = ne;
    }
    const l = Math.hypot(n.out.x, n.out.z) || 1;
    out.push({ i: out.length, id: n.name, x: n.pos.x, y: n.pos.y - R, z: n.pos.z, dx: n.out.x / l, dz: n.out.z / l, to: cur.name, route, drop: R });
  }
  return out;
}

export const KINDS = { schubser_prinz: (level, spec) => new SchubserPrinz(level, spec) };
