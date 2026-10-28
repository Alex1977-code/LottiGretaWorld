// Würfelblase – Endgegner 6-C (Bauplan „Motley Bossblob's Big Battle: Zirkuszelt; sammelt Gelee-Brocken zu einem silbernen
// Riesen, springt mehrfach; beim letzten Sprung trennt sie sich und flieht – dann verwundbar. Brocken treffen verkleinert den
// nächsten Riesen. 3 Kopftreffer.“). Wabbeliger Gelee-Würfel mit lila Melone (Modell 'wuerfelblase'), bunte Gelee-Brocken
// ('gelee_brocken', Instanz-Gruppen je Farbe), silberner Gelee-Riese ('gelee_riese').
//
// Ablauf (Phase = maxHp − hp + 1; Werte je Phase als [P1, P2, P3]):
//   wait → begin(): intro (2,4 s; bei 0,7 s ploppen bits Gelee-Brocken aus ihr und landen verstreut) →
//   gather: die Brocken hüpfen zu ihr (1,5-fach schneller) und gehen in ihr auf (merge 0,35 s); sie hüpft auf der Stelle und
//     ist **geschützt** (Draufspringen = Abprall). Höchstens 6 s, dann fliegen Nachzügler direkt hinein. Sind alle Brocken
//     besiegt, gibt es keinen Riesen – sie flieht sofort.
//   form (0,7 s): die Brocken fügen sich zum **silbernen Gelee-Riesen** (Kante S = minSize … size, je nach Zahl der
//     aufgegangenen Brocken: S = minSize + (size − minSize) · n / bits[Phase]) – **besiegte Brocken verkleinern ihn**.
//   Riese: jumps Sprünge (gcrouch 0,35 s → gair air s: hoher Bogen height m auf die Stelle der Figur, rote **Landemarke**
//     (boss_marker, Grundriss) und Schatten → gland: Aufprall verletzt im Grundriss, **Schockwelle** (Ring 0,45 m hoch,
//     wächst mit shockSpeed m/s bis shockR m – drüberspringen) → grest rest s).
//   Beim **letzten** Sprung platzt der Riese (split 0,8 s): die Brocken fliegen auseinander und hüpfen herum (Berührung
//     verletzt, Draufspringen besiegt sie: 1 Bitcoin), **die Würfelblase trennt sich und flieht** (flee s, fleeSpeed m/s, von
//     der Figur weg, bleibt in der Arena) – jetzt ist **ihr Hut verwundbar**: Draufspringen/Stampfattacke = Treffer → hit
//     (0,6 s) → neue Brocken ploppen heraus (bits[Phase] − bits[Phase − 1] mehr) → gather … Flieht sie unversehrt, sammelt
//     sie die Brocken wieder ein (gather, gleiche Phase).
//   3 Treffer → defeated (1,6 s, zerläuft, Hut fällt; übrige Brocken zerplatzen) → gone: Stern (star) erscheint;
//   Boss-Archetyp: Fanfare (course_clear), Warp-Box.
//   Riese: Berührung verletzt (seitlich und im Flug), oben drauf = Abprall. Fliehende Würfelblase: seitliche Berührung harmlos.
//   Feuer, Krallen, Panzer, Wurf, Explosion, Stern, Riesentrank schaden ihr nicht (Brocken besiegen sie aber). Kein `enemy`,
//   `boss: true`.
// Ansagen (arch.hud.banner): „Weich dem Riesen aus – spring über die Welle!“ (erster Riese), „Spring auf ihren Hut!“ (erste
//   Flucht), „Der nächste Riese wird kleiner!“ (erster besiegter Brocken), Phase 2 „Mehr Gelee-Brocken!“, Phase 3 „Jetzt
//   springt der Riese noch öfter!“.
// Boss-Archetyp-Schnittstelle wie graf_brummbaer_hw.js: begin(), reset(), state, stateT, hp, maxHp, phase, visible, home
//   (= Arenamitte), half, carHits (0), vulnerable, info(); level.onBossHit(boss, 'hut'), level.onBossDefeated(boss). Tod im
//   Kampf (reset): alles zurück (Brocken, Wellen, Marke weg), 3/3 am Start.
//
// Daten: { kind: 'wuerfelblase', id: 'blase', pos (Start, Fußpunkt), arena?: { center: [x, y, z], r: 11 } (Standard center =
//          pos), hp?: 3, bits?: [10, 13, 16], jumps?: [3, 4, 5], size?: 3.2 (Kante des vollen Riesen), minSize?: 1.6,
//          bitSpeed?: [1.6, 1.9, 2.2] (m/s), air?: [1.2, 1.05, 0.9] (s Sprungflug), rest?: [0.9, 0.75, 0.6], height?: 5,
//          shockR?: 6, shockSpeed?: 7, flee?: [4.5, 4.0, 3.5] (s), fleeSpeed?: [3.0, 3.6, 4.2], colors?: ['rot', 'blau',
//          'gruen', 'gelb'] (Brocken), giantColor?: 'silber', star?: { pos, index } | [x, y, z], wakeR?: 12, drop?, seed? }
//   boss: { id: 'blase', name: 'Würfelblase', speed: 0, trigger, lock, warp, warpPos, warpTo, frame: 0.4, center }
// Laufzeit: giants (Riesen), giantSize (Kante des letzten Riesen), sizes ([…] je Riese), jumpsDone, landings, waves, merged,
//   bitsDown (besiegte Brocken), splits, flees, hits, hitLog, bounces, misses (Hut-Sprünge außerhalb der Flucht), info().
//
// gelee_brocken – kleiner Gelee-Würfel (auch einzeln im Level): hüpft (Hüpfer height m hoch, speed m/s) zufällig umher bzw.
//   (behavior 'chase') auf eine Figur in sight m zu, an Kanten nicht hinunter. Draufspringen/Stampfattacke besiegt ihn (platt,
//   Abprall, coins Bitcoins), alle Angriffe ebenso; seitliche Berührung verletzt; im Flug harmlos.
//   Daten: { kind: 'gelee_brocken', pos, size?: 0.5, color?: 'silber' (Standard ohne Boss), speed?: 1.6, height?: 0.55,
//            behavior?: 'hop' | 'chase', sight?: 7, coins?: 1, vel? [vx, vy, vz] (startet im Flug), owner?, wake?, edges?, drop? }
//   Zustände: rest | crouch | hop | air | merge | squashed | flipped. Laufzeit: hops, info().
// Sound: 'hover' (Ploppen), 'bounce', 'slam', 'swoop', 'panic' (Flucht), 'boss_hit', 'stomp', 'powerdown', 'vanish'.

import * as THREE from 'three';
import { EnemyW2, figures, activeFigure, clamp, sharedSlot } from '../EnemyW2.js';
import { spawnLoot } from '../Enemy.js';
import { getModel } from '../../models/index.js';
import { createInstanced } from '../../models/lib/instanced.js';
import { dirFromTo, Lcg, bossManaged } from '../w6help.js';

const TAU = Math.PI * 2;
const G = 40;
const pick = (v, ph, def) => (Array.isArray(v) ? v[Math.min(v.length - 1, ph - 1)] : v ?? def[ph - 1]);
const INTRO = 2.4, POP_AT = 0.7, GATHER_MAX = 6, FORM = 0.7, CROUCH = 0.35, LAND = 0.25, SPLIT = 0.8, HIT = 0.6, DEFEAT = 1.6;
const MERGE = 0.35, SQUASH = 0.45;
const BLOB = 1.2;   // Kante der Würfelblase

// =====================================================================================================================
// Instanz-Gruppen der Brocken (je Farbe eine Gruppe, 1 Zeichenaufruf)
// =====================================================================================================================
class BitPools {
  constructor(level, n = 24) {
    this.level = level;
    this.n = n;
    this.byColor = new Map();
  }

  alloc(color) {
    if (!this.level.view) return null;
    let g = this.byColor.get(color);
    if (!g) {
      const inst = createInstanced('gelee_brocken', this.n, { color });
      const free = [];
      for (let i = this.n - 1; i >= 0; i--) free.push(i);
      this.level.view.add(inst.root, (dt) => inst.update(dt));
      g = { inst, free };
      this.byColor.set(color, g);
    }
    const i = g.free.pop();
    if (i === undefined) return null;
    const inst = g.inst;
    return {
      set(pos, yaw, scale, state) { inst.setAt(i, pos, yaw, scale, state); },
      release() { inst.setState(i, 'hidden'); g.free.push(i); },
    };
  }

  dispose() {
    for (const g of this.byColor.values()) { this.level.view?.remove(g.inst.root); g.inst.dispose(); }
    this.byColor.clear();
  }
}

// =====================================================================================================================
// Gelee-Brocken
// =====================================================================================================================
let bitSeed = 1;

class GeleeBrocken extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'gelee_brocken');
    this.owner = typeof spec.owner === 'string' ? level.named.get(spec.owner) ?? null : spec.owner ?? null;
    this.size = spec.size ?? 0.5;
    this.half.set(this.size * 0.5, this.size * 0.5, this.size * 0.5);
    this.shadow = this.size * 0.6;
    this.wake = spec.wake ?? 0;
    this.speed = spec.speed ?? 1.6;
    this.height = spec.height ?? 0.55;
    this.behavior = spec.behavior ?? 'hop';
    this.sight = spec.sight ?? 7;
    this.coins = spec.coins ?? 1;
    this.color = spec.color ?? 'silber';
    this.rnd = new Lcg(spec.seed ?? (bitSeed = (bitSeed * 7919 + 13) % 100003));
    this.goal = null;
    this.hops = 0;
    this.hopDir = { x: 0, z: 1 };
    this.restT = this.rnd.real(0.1, 0.5);
    this.state = 'rest';
    this.merging = null;
    if (Array.isArray(spec.vel)) { this.vel.set(spec.vel[0], spec.vel[1], spec.vel[2]); this.state = 'air'; this.grounded = false; }
    // ohne Boss: eigene Instanz-Gruppe je Farbe (Präzisierung „Motor-Feinschliff nach Welt 6“; vorher immer silbern)
    this.slot = this.owner?.pools ? this.owner.pools.alloc(this.color) : sharedSlot(level, 'gelee_brocken', { color: this.color });
  }

  get arena() { return this.owner?.arena ?? null; }

  update(dt) {
    this.stateT += dt;
    if (this.updateDefeat(dt)) return;
    switch (this.state) {
      case 'air':
        this.moveWithGravity(dt, { step: 0.1 });
        this.keepIn();
        if (this.grounded && this.stateT > 0.05) { this.vel.set(0, 0, 0); this.land(); }
        return;
      case 'rest':
        this.stand(dt);
        if (this.stateT >= this.restT) this.setState('crouch');
        return;
      case 'crouch':
        this.stand(dt);
        if (this.stateT >= 0.1) this.jump();
        return;
      case 'hop':
        this.moveWithGravity(dt, { step: 0.1 });
        this.keepIn();
        if (this.grounded && this.stateT > 0.05) { this.vel.x = 0; this.vel.z = 0; this.land(); }
        return;
      case 'merge': {
        const m = this.merging, k = clamp(this.stateT / MERGE, 0, 1);
        const t = this.owner ? this.owner.mergePoint() : m.to;
        this.pos.set(m.from.x + (t.x - m.from.x) * k, m.from.y + (t.y - m.from.y) * k + Math.sin(k * Math.PI) * 1.2, m.from.z + (t.z - m.from.z) * k);
        if (k >= 1) { this.owner?.absorb(this); this.touch = false; this.kill(); }
        return;
      }
      default: this.stand(dt);
    }
  }

  land() {
    this.hops++;
    this.restT = this.goal ? this.rnd.real(0.05, 0.15) : this.rnd.real(0.15, 0.45);
    this.setState('rest');
  }

  /** Nächster Hüpfer: zum Ziel (goal), zur Figur (chase) oder zufällig; an Kanten/Arenarand umkehren. */
  jump() {
    let dx, dz, sp = this.speed;
    if (this.goal) {
      const d = dirFromTo(this.pos, this.goal);
      dx = d.x; dz = d.z; sp *= 1.5;
      const dist = Math.hypot(this.goal.x - this.pos.x, this.goal.z - this.pos.z);
      sp = Math.min(sp, dist / 0.42 + 0.2);
    } else if (this.behavior === 'chase' && this.canSee(this.sight, 2.5)) {
      const p = this.player, a = this.rnd.real(-0.45, 0.45);
      const d = dirFromTo(this.pos, p.pos), c = Math.cos(a), s = Math.sin(a);
      dx = d.x * c - d.z * s; dz = d.x * s + d.z * c;
    } else {
      const a = this.rnd.real(0, TAU);
      dx = Math.cos(a); dz = Math.sin(a);
    }
    const A = this.arena;
    if (A && !this.goal) {
      const ox = this.pos.x - A.x, oz = this.pos.z - A.z, od = Math.hypot(ox, oz);
      if (od > A.r - 1.6 && (dx * ox + dz * oz) > 0) { dx = -ox / od; dz = -oz / od; }
    }
    if (this.edges && this.grounded && !this.goal && !this.groundAhead(dx, dz, 0.5, 1.2)) { dx = -dx; dz = -dz; }
    this.hopDir.x = dx; this.hopDir.z = dz;
    this.vel.set(dx * sp, Math.sqrt(2 * G * this.height), dz * sp);
    this.grounded = false;
    this.yaw = Math.atan2(-dz, dx);
    this.setState('hop');
  }

  keepIn() {
    const A = this.arena;
    if (!A) return;
    const dx = this.pos.x - A.x, dz = this.pos.z - A.z, d = Math.hypot(dx, dz), R = A.r - 0.6;
    if (d > R) { this.pos.x = A.x + (dx / d) * R; this.pos.z = A.z + (dz / d) * R; }
  }

  /** In den Endgegner fliegen (aufgehen). */
  mergeInto(owner) {
    if (this.defeated || this.state === 'merge') return;
    this.merging = { from: this.pos.clone(), to: owner.mergePoint() };
    this.touch = false;
    this.setState('merge');
  }

  squashBit() {
    if (this.defeated) return;
    this.setState('squashed');
    this.squashTime = SQUASH;
    this.touch = false;
    this.vel.set(0, 0, 0);
    this.level.effects?.dust(this.pos, 3, 0.6);
    this.level.sfx('stomp');
    this.markDefeated();
  }

  markDefeated() {
    if (this.defeated) return;
    super.markDefeated();
    if (this.coins > 0) spawnLoot(this.level, this.coins === 1 ? 'coin' : `coins:${this.coins}`, this.pos.x, this.pos.y + 0.2, this.pos.z);
    this.owner?.onBitDown?.(this);
  }

  onPlayer(player, contact) {
    if (this.defeated || this.state === 'air' || this.state === 'merge') return 'none';
    if (contact.pound) { this.squashBit(); return 'none'; }
    if (contact.fromAbove) { this.squashBit(); return 'stomp'; }
    if (this.slideAttack(player, contact)) return 'none';
    if (contact.dive) { this.onHit('claw', player); return 'none'; }
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated || kind === 'bump' || this.state === 'merge') return;
    if (kind === 'pound' && source?.pos && Math.abs(source.pos.y - this.pos.y) > 0.8) return;
    if (kind === 'pound') { this.squashBit(); return; }
    this.flip(source, 6);
  }

  render() {
    if (!this.slot || this.removed) return;
    const s = this.state;
    let sc = 1, st = 'idle';
    if (s === 'squashed') sc = [1.25, Math.max(0.15, 0.35 * (1 - this.stateT / SQUASH)), 1.25];
    else if (s === 'crouch') sc = [1.15, 0.78, 1.15];
    else if (s === 'hop') sc = this.vel.y > 0 ? [0.9, 1.16, 0.9] : [1.02, 0.98, 1.02];
    else if (s === 'air' || s === 'flipped') st = 'fly';
    else if (s === 'merge') { st = 'fly'; sc = Math.max(0.05, 1 - clamp(this.stateT / MERGE, 0, 1) * 0.8); }
    this.slot.set(this.pos, this.yaw, Array.isArray(sc) ? sc.map((v) => v * (this.size / 0.5)) : sc * (this.size / 0.5), st);
  }

  dispose() {
    this.slot?.release();
    this.slot = null;
    super.dispose();
  }

  info() { return { state: this.state, hops: this.hops, x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2), defeated: this.defeated }; }
}

// =====================================================================================================================
// Würfelblase
// =====================================================================================================================
class Wuerfelblase extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'wuerfelblase');
    this.enemy = false;
    this.boss = true;
    this.wake = 0;
    this.edges = false;
    this.shadow = 0;
    this.half.set(BLOB / 2, 0.85, BLOB / 2);
    this.start = this.pos.clone();
    const a = spec.arena ?? {};
    const c = a.center ?? [this.start.x, this.start.y, this.start.z];
    this.arena = { x: c[0], y: c[1], z: c[2], r: a.r ?? 11 };
    this.home = new THREE.Vector3(c[0], c[1], c[2]);
    this.maxHp = spec.hp ?? 3;
    this.hp = this.maxHp;
    this.carHits = 0;
    this.visible = true;
    this.wakeR = spec.wakeR ?? 12;
    this.pools = new BitPools(level, 24);
    this.bits = [];
    this.waves = [];
    this.giant = null;
    this.marker = null;
    this.shadowSrc = null;
    if (level.view) {
      this.setModel(getModel('wuerfelblase', { size: BLOB }));
      this.giantBase = spec.size ?? 3.2;
      this.giant = getModel('gelee_riese', { size: this.giantBase, color: spec.giantColor ?? 'silber' });
      this.giant.root.visible = false;
      level.view.add(this.giant.root);
      this.marker = getModel('boss_marker');
      this.marker.root.visible = false;
      level.view.add(this.marker.root);
      const self = this;
      this.shadowSrc = level.view.shadows.add({ pos: this.pos, radius: 0.75, alive: () => !self.removed, visible: () => self.visible && !self.removed });
    }
    this.initShadows(1);
    this.resetFields();
  }

  resetFields() {
    this.state = 'wait';
    this.stateT = 0;
    this.pos.copy(this.start);
    this.vel.set(0, 0, 0);
    this.yaw = -Math.PI / 2;
    this.form = 0;
    this.S = 0;
    this.merged = 0;
    this.giants = 0; this.sizes = []; this.jumpsDone = 0; this.jumpsLeft = 0; this.landings = 0; this.wavesN = 0;
    this.bitsDown = 0; this.splits = 0; this.flees = 0; this.hits = 0; this.bounces = 0; this.misses = 0;
    this.hitLog = [];
    this.splitT = -1; this.splitN = 0;
    this.popped = false;
    this.jump = null;
    this.grace = 0;
    this.hinted = {};
    this.starDone = false; this.dropped = false;
    this.half.set(BLOB / 2, 0.85, BLOB / 2);
    this.rnd = new Lcg(this.spec.seed ?? 0x3b10b5);
  }

  get phase() { return clamp(this.maxHp - this.hp + 1, 1, 3); }
  get managed() { return bossManaged(this.level, this.spec.id); }
  val(key, def) { return pick(this.spec[key], this.phase, def); }
  get vulnerable() { return this.state === 'flee' && this.grace <= 0 && this.hp > 0; }
  get isGiant() { return ['form', 'gcrouch', 'gair', 'gland', 'grest'].includes(this.state); }
  get liveBits() { return this.bits.filter((b) => !b.removed && !b.defeated && b.state !== 'merge'); }
  checkLava() { return false; }

  setState(s) { this.state = s; this.stateT = 0; }

  // ------------------------------------------------------------------ Archetyp-Schnittstelle

  begin() {
    if (this.state !== 'wait') return;
    this.setState('intro');
    this.faceFigure(1);
    this.level.sfx('bounce');
  }

  reset() {
    for (const b of this.bits) if (!b.removed) { b.touch = false; b.kill(); }
    this.bits.length = 0;
    this.waves.length = 0;
    this.hp = this.maxHp;
    this.defeated = false;
    this.visible = true;
    this.touch = true;
    this.fellOut = false;
    if (this.model) this.model.root.visible = true;
    if (this.giant) this.giant.root.visible = false;
    if (this.marker) this.marker.root.visible = false;
    this.resetFields();
  }

  // ------------------------------------------------------------------ Schritt

  update(dt) {
    this.stateT += dt;
    if (this.grace > 0) this.grace -= dt;
    this.bits = this.bits.filter((b) => !b.removed);
    this.stepWaves(dt);
    if (this.splitT >= 0) {
      this.splitT += dt;
      if (this.splitT >= SPLIT) { this.splitT = -1; this.scatter(this.splitN); }
    }
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
        if (!this.popped && this.stateT >= POP_AT) { this.popped = true; this.popBits(this.val('bits', [10, 13, 16])); }
        if (this.stateT >= INTRO) this.startGather();
        return;
      case 'gather': this.gatherStep(dt); return;
      case 'form':
        this.stand(dt);
        this.form = 0.45 + 0.55 * clamp(this.stateT / FORM, 0, 1);
        if (this.stateT >= FORM) { this.form = 1; this.jumpsLeft = this.val('jumps', [3, 4, 5]); this.setState('grest'); this.restFor = 0.5; this.hint('giant', 'Weich dem Riesen aus – spring über die Welle!', { hold: 2.2 }); }
        return;
      case 'gcrouch':
        this.stand(dt);
        this.faceFigure(dt, 5);
        if (this.stateT >= CROUCH) { this.setState('gair'); this.level.sfx('swoop'); }
        return;
      case 'gair': this.airStep(dt); return;
      case 'gland':
        this.stand(dt);
        if (this.stateT >= LAND) {
          if (this.jumpsLeft <= 0) this.split();
          else { this.restFor = this.val('rest', [0.9, 0.75, 0.6]); this.setState('grest'); }
        }
        return;
      case 'grest':
        this.stand(dt);
        this.faceFigure(dt, 4);
        if (this.stateT >= (this.restFor ?? 0.8)) this.startJump();
        return;
      case 'flee': this.fleeStep(dt); return;
      case 'hit':
        this.stand(dt);
        if (this.stateT >= HIT) {
          if (this.hp <= 0) { this.setState('defeated'); return; }
          // neue Brocken je Phase: bits[P] − bits[P − 1]
          const bitsNow = this.val('bits', [10, 13, 16]);
          const prev = pick(this.spec.bits, Math.max(1, this.phase - 1), [10, 13, 16]);
          this.popBits(Math.max(0, bitsNow - prev));
          this.startGather();
        }
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

  /** n Brocken ploppen aus ihr heraus und landen verstreut (Ring, 2,5 … 6 m weit). */
  popBits(n) {
    if (n <= 0) return;
    const colors = this.spec.colors ?? ['rot', 'blau', 'gruen', 'gelb'];
    const sp = this.val('bitSpeed', [1.6, 1.9, 2.2]);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + this.rnd.real(-0.25, 0.25);
      const dist = this.rnd.real(2.5, 6), T = 0.75;
      let tx = this.pos.x + Math.cos(a) * dist, tz = this.pos.z - Math.sin(a) * dist;
      [tx, tz] = this.clampArena(tx, tz, 1.0);
      const y0 = this.pos.y + 1.0;
      const v = [(tx - this.pos.x) / T, (this.arena.y - y0 + 0.5 * G * T * T) / T, (tz - this.pos.z) / T];
      const b = this.level.spawn('gelee_brocken', { pos: [this.pos.x, y0, this.pos.z], vel: v, owner: this, color: colors[(this.bitsSpawned = (this.bitsSpawned ?? 0) + 1) % colors.length], speed: sp, behavior: 'chase', sight: 6, seed: 1000 + this.bitsSpawned * 17 });
      if (b) this.bits.push(b);
    }
    this.level.sfx('hover');
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 1, z: this.pos.z }, 8);
  }

  clampArena(x, z, m = 1.0) {
    const A = this.arena, dx = x - A.x, dz = z - A.z, d = Math.hypot(dx, dz), R = A.r - m;
    return d <= R ? [x, z] : [A.x + (dx / d) * R, A.z + (dz / d) * R];
  }

  // ------------------------------------------------------------------ Sammeln und Riese

  startGather() {
    this.setState('gather');
    this.merged = 0;
    this.half.set(BLOB / 2, 0.85, BLOB / 2);
    for (const b of this.liveBits) b.goal = this.pos;
  }

  mergePoint() { return { x: this.pos.x, y: this.pos.y + 0.6, z: this.pos.z }; }

  gatherStep(dt) {
    this.stand(dt);
    this.faceFigure(dt, 3);
    const live = this.liveBits;
    for (const b of live) {
      b.goal = this.pos;
      const near = Math.hypot(b.pos.x - this.pos.x, b.pos.z - this.pos.z) < BLOB / 2 + 0.9;
      if ((near && b.grounded) || this.stateT >= GATHER_MAX) b.mergeInto(this);
    }
    const pending = this.bits.filter((b) => !b.removed && !b.defeated).length;
    if (pending > 0) return;
    if (this.merged <= 0) { this.startFlee(true); return; }
    // Riese aus den aufgegangenen Brocken: weniger Brocken → kleiner
    const full = this.val('bits', [10, 13, 16]);
    const size = this.spec.size ?? 3.2, minS = this.spec.minSize ?? 1.6;
    this.S = minS + (size - minS) * clamp(this.merged / full, 0, 1);
    this.giants++;
    this.sizes.push(+this.S.toFixed(2));
    this.half.set(this.S / 2, this.S / 2 + 0.15, this.S / 2);
    this.form = 0.45;
    this.setState('form');
    this.level.sfx('slam');
    this.level.effects?.dust(this.pos, 8, 1.4);
  }

  /** Ein Brocken ist in ihr aufgegangen. */
  absorb() {
    this.merged++;
    this.level.sfx('bounce');
  }

  onBitDown() {
    if (this.hp <= 0) return;                             // nach dem Sieg zerplatzen die übrigen nur
    this.bitsDown++;
    this.hint('small', 'Der nächste Riese wird kleiner!', { hold: 1.6 });
  }

  /** Rote Landemarke sichtbar? (Riese holt aus bzw. fliegt) */
  get markerShown() { return (this.state === 'gcrouch' || this.state === 'gair') && !!this.jump; }

  startJump() {
    const p = this.player;
    let tx = this.pos.x, tz = this.pos.z;
    if (activeFigure(p)) { tx = p.pos.x + p.vel.x * 0.25; tz = p.pos.z + p.vel.z * 0.25; }
    [tx, tz] = this.clampArena(tx, tz, this.S / 2 + 0.3);
    this.jump = { x0: this.pos.x, z0: this.pos.z, x1: tx, z1: tz, T: this.val('air', [1.2, 1.05, 0.9]), H: this.spec.height ?? 5 };
    this.setState('gcrouch');
    this.markerK = 0;
  }

  airStep() {
    const j = this.jump, k = clamp(this.stateT / j.T, 0, 1);
    this.pos.set(j.x0 + (j.x1 - j.x0) * k, this.arena.y + 4 * j.H * k * (1 - k), j.z0 + (j.z1 - j.z0) * k);
    this.vel.set(0, 0, 0);
    this.grounded = false;
    if (k >= 1) this.landGiant();
  }

  landGiant() {
    this.pos.y = this.arena.y;
    this.grounded = true;
    this.jumpsDone++;
    this.jumpsLeft--;
    this.landings++;
    this.setState('gland');
    this.level.sfx('slam');
    this.level.shake(0.6);
    this.level.effects?.ring(this.pos, 2.2);
    this.level.effects?.dust(this.pos, 10, 1.8);
    // Aufprall im Grundriss verletzt (und schiebt hinaus)
    const h = this.S / 2 + 0.2;
    for (const p of figures(this.level)) {
      if (!activeFigure(p)) continue;
      if (Math.abs(p.pos.x - this.pos.x) < h + p.half.x && Math.abs(p.pos.z - this.pos.z) < h + p.half.z && p.pos.y < this.pos.y + this.S) p.hurt({ pos: { x: this.pos.x, y: this.pos.y, z: this.pos.z } });
    }
    // Schockwelle
    this.wavesN++;
    this.waves.push({ x: this.pos.x, z: this.pos.z, y: this.arena.y, r: this.S / 2, rMax: this.spec.shockR ?? 6, hit: new Set() });
  }

  stepWaves(dt) {
    if (!this.waves.length) return;
    const sp = this.spec.shockSpeed ?? 7;
    const fx = this.level.effects;
    for (const w of this.waves) {
      w.r += sp * dt;
      w.dustT = (w.dustT ?? 0) - dt;
      if (fx && w.dustT <= 0) {
        w.dustT = 0.08;
        const n = Math.max(5, Math.round(w.r * 1.6));
        for (let k = 0; k < n; k++) { const a = (k / n) * TAU + w.r * 0.5; fx.dust({ x: w.x + Math.cos(a) * w.r, y: w.y, z: w.z + Math.sin(a) * w.r }, 1, 0.4); }
      }
      for (const p of figures(this.level)) {
        if (!activeFigure(p) || w.hit.has(p)) continue;
        if (p.pos.y > w.y + 0.45 || p.pos.y + p.half.y * 2 < w.y - 0.2) continue;
        const d = Math.hypot(p.pos.x - w.x, p.pos.z - w.z);
        if (Math.abs(d - w.r) < 0.3 + p.half.x && p.hurt({ pos: { x: w.x, y: w.y, z: w.z } })) w.hit.add(p);
      }
    }
    this.waves = this.waves.filter((w) => w.r < w.rMax);
  }

  /** Letzter Sprung: der Riese platzt, die Würfelblase trennt sich und flieht. */
  split() {
    this.splits++;
    this.splitN = this.merged;
    this.merged = 0;
    this.splitT = 0;
    this.form = 0;
    this.half.set(BLOB / 2, 0.85, BLOB / 2);
    this.level.sfx('vanish');
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + this.S * 0.6, z: this.pos.z }, 14);
    this.startFlee(false);
  }

  /** Brocken nach dem Platzen: fliegen auseinander und hüpfen herum. */
  scatter(n) {
    if (this.hp <= 0 || this.state === 'wait') return;   // besiegt bzw. Neustart: keine Brocken mehr
    const colors = this.spec.colors ?? ['rot', 'blau', 'gruen', 'gelb'];
    const sp = this.val('bitSpeed', [1.6, 1.9, 2.2]);
    const S = Math.max(this.S, 1.6);
    for (let i = 0; i < n; i++) {
      const a = (i / Math.max(1, n)) * TAU + this.rnd.real(-0.3, 0.3);
      const r = this.rnd.real(0.75, 1.5) * S;
      const [x, z] = this.clampArena(this.splitAt.x + Math.cos(a) * r, this.splitAt.z - Math.sin(a) * r, 1.0);
      const b = this.level.spawn('gelee_brocken', { pos: [x, this.arena.y + 0.4, z], vel: [Math.cos(a) * 1.5, 3, -Math.sin(a) * 1.5], owner: this, color: colors[(this.bitsSpawned = (this.bitsSpawned ?? 0) + 1) % colors.length], speed: sp, behavior: 'chase', sight: 6, seed: 2000 + this.bitsSpawned * 31 });
      if (b) this.bits.push(b);
    }
  }

  startFlee(direct) {
    this.flees++;
    this.splitAt = { x: this.pos.x, z: this.pos.z };
    if (!direct) {
      // aus dem platzenden Riesen heraus: oben herausspringen
      this.vel.y = 6;
      this.grounded = false;
    }
    this.grace = direct ? 0 : 0.35;
    this.fleeDir = null;
    this.setState('flee');
    this.level.sfx('panic');
    this.hint('flee', 'Spring auf ihren Hut!', { hold: 2.0, color: '#ffe080' });
  }

  fleeStep(dt) {
    const p = this.player;
    const sp = this.val('fleeSpeed', [3.0, 3.6, 4.2]);
    let ux = 0, uz = 0;
    if (activeFigure(p)) {
      const d = dirFromTo(p.pos, this.pos, { x: Math.cos(this.yaw), z: -Math.sin(this.yaw) });
      ux = d.x; uz = d.z;
      // am Arenarand entlang ausweichen (vom Rand weg, quer zur Figur)
      const A = this.arena, ox = this.pos.x - A.x, oz = this.pos.z - A.z, od = Math.hypot(ox, oz) || 1;
      if (od > A.r - 2.2) {
        const nx = ox / od, nz = oz / od, out = ux * nx + uz * nz;
        if (out > 0) {
          ux -= out * nx * 1.6; uz -= out * nz * 1.6;
          const tx = -nz, tz = nx, side = (ux * tx + uz * tz) >= 0 ? 1 : -1;
          ux += tx * side * 0.8; uz += tz * side * 0.8;
        }
        const l = Math.hypot(ux, uz) || 1; ux /= l; uz /= l;
      }
    }
    this.vel.x = ux * sp; this.vel.z = uz * sp;
    this.moveWithGravity(dt);
    const [x, z] = this.clampArena(this.pos.x, this.pos.z, 1.0);
    this.pos.x = x; this.pos.z = z;
    if (Math.abs(ux) + Math.abs(uz) > 0.01) this.faceToward(ux, uz, dt, 10);
    if (this.stateT >= this.val('flee', [4.5, 4.0, 3.5])) this.startGather();
  }

  // ------------------------------------------------------------------ Treffer

  takeHit() {
    if (this.hp <= 0) return;
    this.hp = Math.max(0, this.hp - 1);
    this.hits++;
    this.hitLog.push({ t: +this.level.time.toFixed(2), hp: this.hp, giant: this.sizes[this.sizes.length - 1] ?? null });
    this.grace = 0.5;
    this.vel.set(0, 0, 0);
    this.setState('hit');
    this.level.sfx('boss_hit');
    this.level.sfx('stomp');
    this.level.shake(0.45);
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 1.6, z: this.pos.z }, 18);
    this.level.onBossHit?.(this, 'hut');
    if (this.hp <= 0) {
      this.defeated = true;
      this.touch = false;
      for (const b of this.bits) if (!b.removed && !b.defeated) b.flip(this, 5);
      this.waves.length = 0;
      this.level.sfx('powerdown');
      this.level.onBossDefeated?.(this);
    }
  }

  onHit(kind) {
    if (!this.visible || this.hp <= 0) return;
    if (kind !== 'pound' && kind !== 'bump' && kind !== 'bomb') { this.level.effects?.sparks(this.center(), 3); this.level.sfx('blockhit'); }
  }

  onPlayer(player, contact) {
    if (!this.visible || this.hp <= 0) return 'none';
    const s = this.state;
    if (s === 'wait' || s === 'gone' || s === 'hit' || s === 'defeated') return 'none';
    if (this.grace > 0 && player.vel.y > 0) return 'none';
    if (s === 'flee') {
      if (contact.fromAbove || contact.pound) {
        if (this.vulnerable) { this.takeHit(); return 'stomp'; }
        this.bounces++;
        return 'stomp';
      }
      return 'none';
    }
    if (contact.fromAbove || contact.pound) {
      this.bounces++;
      if (s === 'gather' || s === 'intro') this.misses++;
      this.grace = 0.3;
      this.level.sfx('bounce');
      return 'stomp';
    }
    if (this.isGiant && s !== 'form') return 'hurt';
    return 'none';
  }

  // ------------------------------------------------------------------ Ansagen, Sieg

  syncArch() {
    const arch = this.level.archetype;
    if (!arch || arch.boss !== this) return;
    const ph = this.phase;
    if (arch.seenPhase !== ph && this.state !== 'hit' && this.hp > 0) {
      arch.seenPhase = ph;
      if (ph === 2) arch.hud?.banner?.('Mehr Gelee-Brocken!', { hold: 1.4, size: 14, color: '#ffb040' });
      if (ph === 3) arch.hud?.banner?.('Jetzt springt der Riese noch öfter!', { hold: 1.6, size: 14, color: '#ff7a3a' });
    }
  }

  vanish() {
    this.setState('gone');
    this.visible = false;
    this.touch = false;
    if (this.model) this.model.root.visible = false;
    this.level.effects?.dust(this.pos, 12, 1.6);
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 1, z: this.pos.z }, 16);
    const st = this.spec.star;
    if (st && !this.starDone) {
      this.starDone = true;
      const pos = Array.isArray(st) ? st : st.pos;
      this.level.spawn('star', { pos, index: Array.isArray(st) ? 0 : (st.index ?? 0) });
      this.level.effects?.sparks({ x: pos[0], y: pos[1] + 0.6, z: pos[2] }, 24);
    }
    if (!this.managed && !this.dropped && this.spec.drop) {
      this.dropped = true;
      spawnLoot(this.level, this.spec.drop, this.arena.x, this.arena.y + 0.5, this.arena.z);
    }
  }

  // ------------------------------------------------------------------ Darstellung

  modelState() {
    const s = this.state, hp = Math.max(0, this.hp);
    if (s === 'flee') return { anim: 'flee', hp };
    if (s === 'gather') return { anim: 'hop', hp };
    if (s === 'hit') return { anim: 'hit', hp, progress: Math.min(1, this.stateT / HIT) };
    if (s === 'defeated' || s === 'gone') return { anim: 'defeated', hp: 0, progress: Math.min(1, this.stateT / 1.2) };
    return { anim: 'idle', hp };
  }

  giantState() {
    const s = this.state;
    if (this.splitT >= 0) return { anim: 'split', progress: Math.min(1, this.splitT / SPLIT) };
    if (s === 'form') return { anim: 'idle', form: this.form };
    if (s === 'gcrouch') return { anim: 'hop', progress: 0.22 * clamp(this.stateT / CROUCH, 0, 1) };
    if (s === 'gair') return { anim: 'hop', progress: 0.22 + 0.58 * clamp(this.stateT / this.jump.T, 0, 1) };
    if (s === 'gland') return { anim: 'hop', progress: 0.8 + 0.2 * clamp(this.stateT / LAND, 0, 1) };
    return { anim: 'idle', form: 1 };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    const giant = this.isGiant;
    this.model.root.visible = this.visible && !giant;
  }

  render(dt, t) {
    super.render(dt, t);
    const g = this.giant;
    if (g) {
      const on = this.visible && (this.isGiant || this.splitT >= 0);
      g.root.visible = on;
      if (on) {
        const at = this.splitT >= 0 ? { x: this.splitAt.x, y: this.arena.y, z: this.splitAt.z } : this.pos;
        g.root.position.set(at.x, at.y, at.z);
        g.root.rotation.y = this.yaw;
        g.root.scale.setScalar((this.S || this.giantBase) / this.giantBase);
        g.update(dt, this.giantState());
      }
    }
    const m = this.marker;
    if (m) {
      const on = this.markerShown;
      m.root.visible = on;
      if (on) {
        const k = this.state === 'gair' ? clamp(this.stateT / this.jump.T, 0, 1) : 0;
        m.root.position.set(this.jump.x1, this.arena.y + 0.03, this.jump.z1);
        m.root.scale.setScalar(Math.max(1, this.S / 1.6));
        m.update(dt, { k });
      }
    }
    if (this.shadowSrc) this.shadowSrc.radius = this.isGiant ? this.S * 0.62 : 0.75;
  }

  info() {
    return {
      state: this.state, hp: this.hp, maxHp: this.maxHp, phase: this.phase, giants: this.giants, giantSize: +(this.S || 0).toFixed(2),
      sizes: this.sizes.slice(), jumpsDone: this.jumpsDone, landings: this.landings, waves: this.wavesN, merged: this.merged,
      bits: this.liveBits.length, bitsDown: this.bitsDown, splits: this.splits, flees: this.flees, hits: this.hits,
      bounces: this.bounces, misses: this.misses, vulnerable: this.vulnerable,
      x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2),
    };
  }

  dispose() {
    if (this.giant) { this.level.view?.remove(this.giant.root); this.giant.dispose?.(); this.giant = null; }
    if (this.marker) { this.level.view?.remove(this.marker.root); this.marker.dispose?.(); this.marker = null; }
    this.pools.dispose();
    super.dispose();
  }
}

export const KINDS = {
  wuerfelblase: (level, spec) => new Wuerfelblase(level, spec),
  gelee_brocken: (level, spec) => new GeleeBrocken(level, spec),
};
