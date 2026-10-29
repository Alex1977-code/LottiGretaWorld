// Schattenläuferin – Endgegner 3-Zug (Arena am Zugende; Bauplan: „teleportiert, Bumerang-Angriffe, Klone“).
// Flinke Ninja-Kätzchen-Dame. Das **Original trägt eine pinke Schleife am Ohr**, die Doppelgänger nicht.
//
// Ablauf (Phase = maxHp − hp + 1):
//   wait → begin(): intro (2,0 s, erscheint im Rauch) → Runde:
//     throw   (0,8 s) Wurfstern-Bumerang (Entität schatten_bumerang) auf die nächste Figur – Original und die ersten
//             `phase` Doppelgänger werfen zugleich; je Erscheinen 2 / 2 / 3 Würfe (vor dem Teleport fängt sie ihre
//             Wurfsterne wieder), dazwischen
//     run     (1,1 / 0,9 / 0,8 s) alle huschen gemeinsam im Kreis weiter (60°),
//     teleport (0,35 s) alle verschwinden im Rauch → hidden (0,5 s) → appear (0,8 s): sie taucht an einem neuen Platz
//             auf dem Kreis um die Arenamitte auf, **mit Doppelgängern auf den anderen Plätzen: 2 / 3 / 5**.
//   Treffer: **Draufspringen (bzw. Stampfen) auf das Original** → hit (0,6 s), alle Doppelgänger lösen sich in Rauch
//   auf → teleport … nächste Phase. Doppelgänger: Draufspringen/jeder Angriff → Rauch (Abprall, kein Schaden).
//   3 Treffer → defeated (2,2 s, sitzt benommen) → flee (0,8 s, verschwindet im Rauch) → gone.
//   Seitliche Berührung (Original und Doppelgänger) und Bumerangs verletzen. Kanonenkugel = Treffer (stark),
//   Funkelstern/Riesentrank/Feuer & Co. treffen nicht (kein `enemy`; Doppelgänger zerplatzen davon).
//
// Boss-Archetyp (archetypes/kinds/boss.js, Schnittstelle wie wirbelbrocken.js): begin(), reset(), state, stateT, hp,
// maxHp, phase, visible, home, half, carHits (0), info(); level.onBossHit(boss, 'stomp'|'cannon'),
// level.onBossDefeated(boss); eigene Ansagen bei Phase 2/3 (setzt arch.seenPhase). Ohne Archetyp beginnt der Kampf
// bei Annäherung (wakeR) und drop erscheint nach 'gone' in der Arenamitte.
//
// Daten: { kind: 'schattenlaeuferin', id: 'schatten', pos (Start = Auftrittsort), arena?: { center: [x, y, z], r: 8 },
//          ring?: 5 (Radius der Erscheinungsplätze), hp?: 3, clones?: [2, 3, 5], throws?: [2, 2, 3],
//          boomerang?: { speed: 7.5, range: 9 }, wakeR?: 8, seed?: 7, drop? }
// schatten_doppelgaenger: { owner, pos } (nur vom Boss erzeugt). schatten_bumerang: { pos (Mitte), target: [x, z],
//   owner?, speed?: 7.5, range?: 9, curve?: ±1 } – fliegt in 0,7 m Höhe im Bogen hinaus und kehrt zum Werfer zurück (fängt
//   ihn), sonst nach life s weg; verletzt bei Berührung (darüber springen); fliegt durch Wände.
// Modelle 'schattenlaeuferin' (opts { clone }, state { anim: idle|run|throw|teleport|clone|hit|defeated, speed,
// progress }, model.hand()) und 'schatten_bumerang' (state { anim: spin, speed }).
//
// Welt 8 – **Schattenläuferin 2** (8-Zug, zweiter Kampf; Präzisierung Gegner Welt 8, additiv): round: 2. Ablauf wie im ersten Kampf,
//   aber mehr Doppelgänger und schneller: Standard clones [3, 4, 6], throws [2, 3, 3], Wurfsterne speed 8.5 / range 10, alle
//   Zeiten (Pause, Huschen, Teleport, Versteck, Erscheinen) × 1 / tempo (Standard tempo 1.25), es werfen das Original und die
//   ersten phase + 1 Doppelgänger. Ansagen: „Die Schattenläuferin ist zurück!“ (Auftritt), „Noch mehr Doppelgänger!“, „Jetzt ist
//   sie noch flinker!“. Daten zusätzlich: round?: 1 | 2, tempo?: 1.25 (nur round 2), throwers?: [2, 3, 4]. Laufzeit: round.

import { EnemyW2, figures, activeFigure, localOffset, toWorld, clamp } from '../EnemyW2.js';
import { spawnLoot } from '../Enemy.js';
import { getModel } from '../../models/index.js';
import { bossManaged } from '../w6help.js';

const TAU = Math.PI * 2;
const INTRO = 2.0, THROW = 0.8, RELEASE = 0.5, TELE = 0.35, HIDDEN = 0.5, APPEAR = 0.8, HIT = 0.6, DEFEAT = 2.2, FLEE = 0.8;
const PAUSE = [0, 0.55, 0.45, 0.35];
const RUN = [0, 1.1, 0.9, 0.8];

/** kleiner deterministischer Zufall (je Boss). */
function lcg(seed) {
  let s = (seed >>> 0) || 7;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** Hand-Versatz des Modells beim Wurf (einmal vermessen). */
function handOffset(model) {
  return localOffset('schatten:hand', model, { anim: 'throw', progress: RELEASE }, model?.hand ? (o) => model.hand(o) : null, { x: 0.3, y: 1.0, z: 0.25 });
}

// =====================================================================================================================
// Wurfstern-Bumerang
// =====================================================================================================================
class SchattenBumerang extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'schatten_bumerang');
    this.enemy = false;
    this.half.set(0.3, 0.12, 0.3);
    this.shadow = 0.25;
    this.wake = 0;
    this.owner = spec.owner ?? null;
    this.speed = spec.speed ?? 7.5;
    this.curve = spec.curve ?? 1;
    this.start = this.pos.clone();
    const t = spec.target ?? [this.pos.x + 1, this.pos.z];
    const dx = t[0] - this.pos.x, dz = t[1] - this.pos.z, d = Math.hypot(dx, dz) || 1;
    this.d = { x: dx / d, z: dz / d };
    this.range = clamp(d + 1.5, 3.5, spec.range ?? 9);
    this.T = (Math.PI * this.range) / this.speed;          // hin und zurück
    this.life = spec.life ?? this.T + 3;
    this.age = 0;
    this.caught = false;
    this.y0 = this.pos.y;
    if (level.view) this.setModel(getModel('schatten_bumerang'));
  }

  // Mitte = pos (flach); Hülle: pos ist Fußpunkt der Hülle
  center(out = this._c) { return out.set(this.pos.x, this.pos.y, this.pos.z); }

  update(dt) {
    this.age += dt;
    if (this.age > this.life) { this.poof(); return; }
    const k = Math.min(1, this.age / this.T);
    const o = this.owner;
    const home = o && !o.removed && !o.poofed && o.visibleNow !== false;
    if (k < 0.5 || !home) {
      // hinaus geradewegs auf das Ziel, zurück im seitlichen Bogen
      const out = Math.sin(k * Math.PI) * this.range;
      const side = k < 0.5 ? 0 : Math.sin((k - 0.5) * TAU) * 1.4 * this.curve;
      this.pos.x = this.start.x + this.d.x * out - this.d.z * side;
      this.pos.z = this.start.z + this.d.z * out + this.d.x * side;
      this.pos.y = this.y0 + Math.sin(k * Math.PI) * 0.15;
      if (k >= 1) { this.poof(); return; }
    } else {
      // Rückweg zur Pfote des Werfers
      const tx = o.pos.x, ty = o.pos.y + 0.7, tz = o.pos.z;
      const dx = tx - this.pos.x, dy = ty - this.pos.y, dz = tz - this.pos.z, d = Math.hypot(dx, dy, dz);
      if (d < 0.6) { this.caught = true; this.kill(); return; }
      const sp = this.speed * 1.05 * dt;
      this.pos.x += (dx / d) * sp; this.pos.y += (dy / d) * sp; this.pos.z += (dz / d) * sp;
    }
  }

  onPlayer() { return this.alive ? 'hurt' : 'none'; }
  onHit() {}

  poof() {
    if (this.removed) return;
    this.level.effects?.sparks(this.pos, 4);
    this.kill();
  }

  syncModel() {
    if (!this.model) return;
    this.model.root.position.copy(this.pos);
  }

  modelState() { return { anim: 'spin', speed: 3.2 }; }
}

// =====================================================================================================================
// Doppelgänger (vom Boss gesteuert)
// =====================================================================================================================
class Doppelgaenger extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'schatten_doppelgaenger');
    this.enemy = false;
    this.owner = spec.owner;
    this.half.set(0.36, 0.7, 0.36);
    this.shadow = 0.4;
    this.wake = 0;
    this.anim = 'clone';
    this.animT = 0;
    this.poofed = false;
    this.visibleNow = true;
    // Doppelgänger werfen keinen Sonnenschatten (nur Blob) – bis zu 5 gleichzeitig
    if (level.view) { this.setModel(getModel('schattenlaeuferin', { clone: true })); this.initShadows(0); }
  }

  /** Vom Boss: Haltung setzen (Zeit läuft hier). */
  pose(anim, progress) {
    if (anim !== this.anim) { this.anim = anim; this.animT = 0; }
    this.progress = progress;
  }

  update(dt) {
    this.animT += dt;
    if (this.poofed) { if (this.animT > 0.5) this.kill(); }
  }

  poof() {
    if (this.poofed) return;
    this.poofed = true;
    this.touch = false;
    this.visibleNow = false;
    this.anim = 'teleport';
    this.animT = 0;
    this.level.effects?.dust({ x: this.pos.x, y: this.pos.y + 0.6, z: this.pos.z }, 8, 1.2);
    this.level.sfx('poof');
  }

  onPlayer(player, contact) {
    if (this.poofed || !this.touch) return 'none';
    if (contact.pound) { this.poof(); return 'none'; }
    if (contact.fromAbove) { this.poof(); return 'stomp'; }
    if (contact.dive || contact.star) { this.poof(); return 'none'; }
    return 'hurt';
  }

  onHit(kind) { if (kind !== 'bump') this.poof(); }

  get shadowVisible() { return !this.poofed; }

  modelState() {
    const a = this.anim;
    if (a === 'throw') return { anim: 'throw', progress: this.progress };
    if (a === 'run') return { anim: 'run', speed: 6 };
    return { anim: a };
  }
}

// =====================================================================================================================
// Schattenläuferin
// =====================================================================================================================
class Schattenlaeuferin extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'schattenlaeuferin');
    this.enemy = false;
    this.boss = true;
    this.wake = 0;
    this.edges = false;
    this.half.set(0.38, 0.72, 0.38);
    this.shadow = 0.45;
    this.home = this.pos.clone();
    const a = spec.arena ?? {};
    const c = a.center ?? [this.home.x, this.home.y, this.home.z];
    this.arena = { x: c[0], y: c[1], z: c[2], r: a.r ?? 8 };
    this.ringR = spec.ring ?? Math.min(5, this.arena.r - 1.5);
    this.maxHp = spec.hp ?? 3;
    this.hp = this.maxHp;
    // Welt 8: zweiter Kampf (mehr Doppelgänger, schneller)
    this.round = spec.round === 2 ? 2 : 1;
    const r2 = this.round === 2;
    this.tempo = r2 ? Math.max(0.5, spec.tempo ?? 1.25) : 1;
    this.cloneCounts = spec.clones ?? (r2 ? [3, 4, 6] : [2, 3, 5]);
    this.throwCounts = spec.throws ?? (r2 ? [2, 3, 3] : [2, 2, 3]);
    this.throwers = spec.throwers ?? (r2 ? [2, 3, 4] : [1, 2, 3]);
    this.boomCfg = spec.boomerang ?? (r2 ? { speed: 8.5, range: 10 } : {});
    this.wakeR = spec.wakeR ?? 8;
    this.seed = spec.seed ?? 7;
    this.rnd = lcg(this.seed);
    this.carHits = 0;
    this.hits = 0;
    this.hitLog = [];
    this.clones = [];
    this.boomerangs = [];
    this.appearances = 0;
    this.cloneLog = [];
    this.throwsLeft = 0;
    this.thrown = false;
    this.slotA = 0;          // Drehung der Platz-Runde
    this.mySlot = 0;
    this.slots = 1;
    this.visible = true;
    this.visibleNow = true;
    this.dropped = false;
    this.state = 'wait';
    this.yaw = -Math.PI / 2;
    this.anim = 'idle';
    if (level.view) this.setModel(getModel('schattenlaeuferin', { clone: false }));
    this.initShadows(2);
    this.hand = handOffset(this.model);
  }

  get phase() { return clamp(this.maxHp - this.hp + 1, 1, 3); }
  get managed() { return bossManaged(this.level, this.spec.id); }

  // ------------------------------------------------------------------ Archetyp-Schnittstelle

  begin() {
    if (this.state !== 'wait') return;
    this.setState('intro');
    this.facePlayerNow();
    this.level.sfx('poof');
    if (this.round === 2) this.level.archetype?.hud?.banner?.('Die Schattenläuferin ist zurück!', { hold: 1.6, size: 14, y: 0.36, color: '#ff8ad0' });
  }

  reset() {
    this.clearClones(false);
    for (const b of this.boomerangs) b.kill();
    this.boomerangs.length = 0;
    this.hp = this.maxHp;
    this.defeated = false;
    this.hits = 0;
    this.visible = true;
    this.visibleNow = true;
    this.touch = true;
    this.pos.copy(this.home);
    this.vel.set(0, 0, 0);
    this.yaw = -Math.PI / 2;
    this.rnd = lcg(this.seed);
    this.appearances = 0;
    this.cloneLog = [];
    this.setState('wait');
  }

  // ------------------------------------------------------------------ Schritt

  update(dt) {
    this.stepBoss(dt);
    // Phasen-Ansage nach dem Zustandswechsel (vor dem Archetyp, der sonst seine eigene zeigt)
    this.syncArchPhase();
  }

  stepBoss(dt) {
    this.stateT += dt * (this.round === 2 && this.state !== 'defeated' && this.state !== 'hit' && this.state !== 'flee' ? this.tempo : 1);
    this.boomerangs = this.boomerangs.filter((b) => !b.removed);
    this.clones = this.clones.filter((c) => !c.removed);
    switch (this.state) {
      case 'wait':
        this.anim = 'idle';
        this.facePlayer(dt, 3);
        if (!this.managed) {
          for (const p of figures(this.level)) if (activeFigure(p) && Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < this.wakeR) { this.begin(); break; }
        }
        return;
      case 'intro':
        this.anim = this.stateT < 0.4 ? 'teleport' : 'clone';
        this.touch = this.stateT > 0.6;
        this.facePlayer(dt, 6);
        if (this.stateT >= INTRO) this.startRound(false);
        return;
      case 'idle':
        this.anim = 'idle';
        this.faceAll(dt);
        this.poseClones('idle');
        if (this.stateT >= PAUSE[this.phase]) this.nextAction();
        return;
      case 'throw':
        this.anim = 'throw';
        this.faceAll(dt, 10);
        this.poseClones('throw', Math.min(1, this.stateT / THROW));
        if (!this.thrown && this.stateT >= RELEASE * THROW) { this.thrown = true; this.volley(); }
        if (this.stateT >= THROW) { this.throwsLeft--; this.setState(this.throwsLeft > 0 ? 'run' : 'idle2'); }
        return;
      case 'run': {
        this.anim = 'run';
        const T = RUN[this.phase];
        const k = Math.min(1, this.stateT / T);
        this.placeOnRing(this.runFrom + (Math.PI / 3) * this.runDir * (k * k * (3 - 2 * k)));
        this.poseClones('run');
        if (this.stateT >= T) { this.runFrom = this.slotA; this.setState('idle'); }
        return;
      }
      case 'idle2':
        // wartet, bis ihre Wurfsterne zurück sind (höchstens 3,5 s), dann Teleport
        this.anim = 'idle';
        this.faceAll(dt);
        this.poseClones('idle');
        if (this.stateT >= PAUSE[this.phase] + 0.3 && (!this.boomerangs.some((b) => b.owner === this) || this.stateT > 3.5)) this.startTeleport();
        return;
      case 'teleport':
        this.anim = 'teleport';
        this.touch = false;
        this.poseClones('teleport');
        if (this.stateT >= TELE) { this.visibleNow = false; this.clearClones(true); this.setState('hidden'); }
        return;
      case 'hidden':
        this.anim = 'teleport';
        if (this.stateT >= HIDDEN) this.appear();
        return;
      case 'appear':
        this.anim = 'clone';
        this.touch = this.stateT > 0.25;
        for (const c of this.clones) c.touch = !c.poofed && this.stateT > 0.25;
        this.poseClones('clone');
        this.faceAll(dt, 8);
        if (this.stateT >= APPEAR) this.setState('idle');
        return;
      case 'hit':
        this.anim = 'hit';
        if (this.stateT >= HIT) {
          if (this.hp <= 0) { this.setState('defeated'); this.level.sfx('dizzy'); }
          else this.startTeleport();
        }
        return;
      case 'defeated':
        this.anim = 'defeated';
        if (this.stateT >= DEFEAT) { this.setState('flee'); this.level.sfx('poof'); }
        return;
      case 'flee':
        this.anim = 'teleport';
        if (this.stateT >= FLEE) this.vanish();
        return;
      default: break;
    }
  }

  /** Neue Runde: Würfe je Phase, danach Teleport mit Doppelgängern. */
  startRound(withClones) {
    // nach dem Auftritt (noch ohne Platz auf dem Ring) nur ein Wurf, dann Teleport
    this.throwsLeft = withClones ? (this.throwCounts[this.phase - 1] ?? 2) : 1;
    this.runFrom = Math.atan2(this.pos.z - this.arena.z, this.pos.x - this.arena.x);
    this.slotA = this.runFrom;
    this.runDir = this.rnd() < 0.5 ? -1 : 1;
    if (!withClones) { this.slots = 1; this.mySlot = 0; }
    this.setState('idle');
  }

  nextAction() {
    if (this.throwsLeft > 0) { this.thrown = false; this.setState('throw'); this.level.sfx('swoop'); }
    else this.startTeleport();
  }

  startTeleport() {
    this.thrown = false;
    this.setState('teleport');
    this.level.sfx('poof');
    this.level.effects?.dust({ x: this.pos.x, y: this.pos.y + 0.7, z: this.pos.z }, 8, 1.2);
  }

  /** Wieder auftauchen: neuer Platz auf dem Ring, Doppelgänger auf den übrigen Plätzen. */
  appear() {
    const n = this.cloneCounts[this.phase - 1] ?? 2;
    this.slots = n + 1;
    this.mySlot = Math.floor(this.rnd() * this.slots);
    const base = this.rnd() * TAU;
    this.slotA = base;
    this.appearances++;
    for (let i = 0; i < n; i++) {
      const c = this.level.spawn('schatten_doppelgaenger', { owner: this, pos: [this.home.x, this.home.y, this.home.z] });
      if (c) { c.touch = false; this.clones.push(c); }
    }
    this.cloneLog.push(n);
    this.placeOnRing(base);
    this.visibleNow = true;
    this.touch = false;
    this.startRound(true);
    this.slotA = base;
    this.runFrom = base;
    this.setState('appear');
    this.level.sfx('poof');
  }

  /** Alle (Original + Doppelgänger) auf ihre Ring-Plätze bei Drehung a. */
  placeOnRing(a) {
    this.slotA = a;
    const A = this.arena;
    const at = (slot, out) => {
      const ang = a + (slot / this.slots) * TAU;
      out.x = A.x + Math.cos(ang) * this.ringR; out.z = A.z + Math.sin(ang) * this.ringR;
      return out;
    };
    const o = {};
    const ox = this.pos.x, oz = this.pos.z;
    at(this.mySlot, o);
    this.pos.set(o.x, this.arena.y, o.z);
    if (this.state === 'run') this.faceToward(o.x - ox, o.z - oz, 1, 1);
    let k = 0;
    for (const c of this.clones) {
      let s = k++;
      if (s >= this.mySlot) s++;
      const cx = c.pos.x, cz = c.pos.z;
      at(s, o);
      c.pos.set(o.x, this.arena.y, o.z);
      if (this.state === 'run') c.yaw = Math.atan2(-(o.z - cz), o.x - cx);
    }
  }

  /** Alle schauen zur jeweils nächsten Figur. */
  faceAll(dt, rate = 6) {
    this.facePlayer(dt, rate);
    for (const c of this.clones) {
      if (c.poofed) continue;
      const p = this.level.nearestPlayer(c.pos);
      if (p) c.faceToward(p.pos.x - c.pos.x, p.pos.z - c.pos.z, dt, rate);
    }
  }

  poseClones(anim, progress) {
    for (const c of this.clones) {
      if (c.poofed) continue;
      c.pose(anim, progress);
      if (anim === 'teleport') c.touch = false;
    }
  }

  clearClones(fx) {
    for (const c of this.clones) {
      if (fx && !c.poofed) this.level.effects?.dust({ x: c.pos.x, y: c.pos.y + 0.6, z: c.pos.z }, 6, 1.1);
      c.kill();
    }
    this.clones.length = 0;
  }

  /** Wurf-Salve: Original + die ersten `phase` Doppelgänger. */
  volley() {
    const throwers = [this, ...this.clones.filter((c) => !c.poofed).slice(0, this.throwers[this.phase - 1] ?? this.phase)];
    let i = 0;
    for (const t of throwers) {
      const p = this.level.nearestPlayer(t.pos);
      if (!activeFigure(p)) continue;
      const h = toWorld(t.pos, t.yaw, this.hand.x, this.hand.y, this.hand.z, {});
      const b = this.level.spawn('schatten_bumerang', {
        // Flughöhe 0,7 m (Mitte): trifft große und kleine Figuren, man kann darüber springen
        pos: [h.x, t.pos.y + 0.7, h.z], target: [p.pos.x, p.pos.z], owner: t,
        speed: this.boomCfg.speed ?? 7.5, range: this.boomCfg.range ?? 9, curve: (i++ % 2) ? -1 : 1,
      });
      if (b) this.boomerangs.push(b);
    }
    this.level.sfx('boomerang');
  }

  facePlayerNow() {
    const p = this.player;
    if (p) this.yaw = Math.atan2(-(p.pos.z - this.pos.z), p.pos.x - this.pos.x);
  }

  syncArchPhase() {
    const arch = this.level.archetype;
    if (!arch || arch.boss !== this) return;
    const ph = this.phase;
    if (arch.seenPhase === ph || this.state === 'hit' || this.hp <= 0) return;
    arch.seenPhase = ph;
    if (ph === 2) arch.hud?.banner?.('Noch mehr Doppelgänger!', { hold: 1.4, size: 14, color: '#ffb0e0' });
    if (ph === 3) arch.hud?.banner?.(this.round === 2 ? 'Jetzt ist sie noch flinker!' : 'Achte auf die pinke Schleife!', { hold: 1.6, size: 14, color: '#ff8ad0' });
  }

  // ------------------------------------------------------------------ Treffer

  get vulnerable() { return this.visibleNow && this.touch && this.hp > 0 && ['idle', 'idle2', 'throw', 'run', 'appear'].includes(this.state); }

  takeHit(where) {
    if (this.hp <= 0) return;
    this.hp--;
    this.hits++;
    this.hitLog.push({ where, t: +this.level.time.toFixed(2), hp: this.hp, state: this.state, clones: this.clones.length });
    // Doppelgänger lösen sich in Rauch auf
    for (const c of this.clones) c.poof();
    this.setState('hit');
    this.touch = false;
    this.level.sfx('boss_hit');
    this.level.sfx('stomp');
    this.level.shake(0.4);
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 1.2, z: this.pos.z }, 16);
    this.level.onBossHit?.(this, where);
    if (this.hp <= 0) {
      this.defeated = true;
      for (const b of this.boomerangs) b.poof();
      this.level.onBossDefeated?.(this);
    }
  }

  onCannon() { if (this.vulnerable) this.takeHit('cannon'); }

  onHit(kind, source) {
    if (kind === 'cannon') this.onCannon(source);
  }

  onPlayer(player, contact) {
    if (!this.visibleNow || this.hp <= 0 || !this.touch) return 'none';
    if (this.state === 'hit' || this.state === 'defeated' || this.state === 'flee' || this.state === 'gone') return 'none';
    if (contact.pound) { this.takeHit('stomp'); return 'none'; }
    if (contact.fromAbove) { this.takeHit('stomp'); return 'stomp'; }
    return 'hurt';
  }

  vanish() {
    this.setState('gone');
    this.visible = false;
    this.visibleNow = false;
    this.touch = false;
    if (this.model) this.model.root.visible = false;
    this.level.effects?.dust(this.pos, 10, 1.4);
    if (!this.managed && !this.dropped && this.spec.drop) {
      this.dropped = true;
      spawnLoot(this.level, this.spec.drop, this.arena.x, this.arena.y + 0.5, this.arena.z);
    }
  }

  // ------------------------------------------------------------------ Darstellung

  modelState() {
    const a = this.anim;
    if (a === 'throw') return { anim: 'throw', progress: Math.min(1, this.stateT / THROW) };
    if (a === 'run') return { anim: 'run', speed: 6 };
    return { anim: a };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    this.model.root.visible = this.state !== 'gone';
  }

  get shadowVisible() { return this.visibleNow; }

  info() {
    return {
      state: this.state, hp: this.hp, maxHp: this.maxHp, phase: this.phase, hits: this.hits, clones: this.clones.filter((c) => !c.poofed).length,
      appearances: this.appearances, cloneLog: this.cloneLog.slice(), boomerangs: this.boomerangs.length, vulnerable: this.vulnerable, round: this.round,
      x: +this.pos.x.toFixed(2), z: +this.pos.z.toFixed(2),
    };
  }
}

export const KINDS = {
  schattenlaeuferin: (level, spec) => new Schattenlaeuferin(level, spec),
  schatten_doppelgaenger: (level, spec) => new Doppelgaenger(level, spec),
  schatten_bumerang: (level, spec) => new SchattenBumerang(level, spec),
};
