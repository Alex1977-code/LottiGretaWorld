// Schlangenkönig – Endgegner 3-B (Zirkuszelt-Arena; Bauplan: „bricht aus dem Boden, schleudert Steine; ruft
// Diener-Schlangen mit Tellern auf dem Kopf. Auf einen Teller springen, von dort auf den Kopf. Rissige Teller brechen,
// herabfallende Steine zerschlagen Teller; gelegentlich Krallen-Anzug auf einem Teller (an Schlangen hochklettern).
// Danach Stern und Röhre zum Ziel.“).
//
// Königsschlange auf einem drehenden Zirkus-Sockel (Ø 4,8 m, 1,4 m hoch, fest; wer daraufspringt, wird
// heruntergeschubst – kein Schaden). Ablauf (Phase = maxHp − hp + 1):
//   wait → begin(): rise (1,0 s, bricht aus dem Sockel, Beben) → roar (1,0 s) → Runde:
//     throw   2 / 3 / 4 Steine (felsbrocken) je 1,0 s im Bogen auf die nächste Figur (Landeanzeige am Boden; Aufprall
//             verletzt im Umkreis 1 m, zerschlägt Teller)
//     summon  (1,2 s, Krone glüht) Diener-Schlangen steigen an den Löchern nahe der Figur auf: 3 / 3 / 4, davon
//             rissig 0 / 1 / 2; bei jedem zweiten Ruf trägt ein Teller einen Krallen-Anzug (claw)
//     lean    Fenster (7 / 6,5 / 6 s): der Kopf neigt sich über den Teller nahe der Figur (Kopfmitte plate + 2,7 m) –
//             vom Boden unerreichbar, **vom Teller aus draufspringen = Treffer**; ab Phase 2 fallen dabei Steine von
//             der Zeltkuppel (alle 2,6 / 2,0 s, zerschlagen Teller)
//     → Treffer: hit (0,6 s) → Diener versinken → retreat (1,0 s) → nächste Runde (Ansage bei Phase 2/3)
//     → Zeit um: strike (1,2 s, stößt nach der Figur – der Kopf verletzt) → Diener versinken → nächste Runde
//   3 Treffer → defeated (2,5 s, Krone fällt) → sink (1,0 s, verschwindet im Sockel) → gone; star erscheint.
// Kopf: von oben = Treffer (nur im Fenster lean/summon, sonst nur Abprall), sonst harmloses Anstoßen; im Stoß
// (strike) verletzt er. Kanonenkugel auf den Kopf = Treffer (im Fenster). Kein `enemy` (Stern/Riese wirken nicht).
//
// Boss-Archetyp-Schnittstelle wie wirbelbrocken.js: begin(), reset(), state, stateT, hp, maxHp, phase, visible, home,
// half, carHits (0), info(); level.onBossHit(boss, 'stomp'|'cannon'), level.onBossDefeated(boss); eigene Ansagen.
// Ohne Archetyp: Kampf ab wakeR m, drop nach 'gone'.
//
// Daten: { kind: 'schlangenkoenig', id: 'koenig', pos (Sockelmitte am Boden), arena?: { center, r: 11 }, hp?: 3,
//          plate?: 2.8 (Tellerhöhe der Diener über dem Boden), spots?: [[x, z], …] (Diener-Löcher; Standard 6 auf
//          einem Ring r = min(6, arena.r − 3) um pos), segments?: 14, claw?: true, star?: { pos, index } | [x, y, z],
//          wakeR?: 10, seed?: 3, drop? }
//   Laufzeit: servants (lebende Diener), rocks, rounds, summons, headWorld(), target (Teller unter dem Kopf).
//
// dienerschlange – Diener mit Porzellanteller auf dem Kopf (auch einzeln für Level-Bauer): steigt aus dem Boden
//   (0,6 s), der Teller (Ø 1,4 m, Einweg-Oberseite auf height) trägt Figuren, der Körper ist eine Kletter-Säule
//   (climbable, Krallen-Anzug). Rissiger Teller: steht eine Figur 0,45 s darauf, zerspringt er. Ein Stein, der auf dem
//   Teller landet, zerschlägt ihn (ein Krallen-Anzug darauf fällt daneben zu Boden). Ohne Teller versinkt der Diener
//   (0,6 s). Diener sind harmlos (keine Berührung).
//   Daten: { kind: 'dienerschlange', pos (Bodenloch), height?: 2.8, cracked?: false, claw?: false (Krallen-Anzug auf dem
//            Teller), up?: true (sofort oben; false = wartet auf rise()), owner? }
//   Methoden: rise(), sink(), breakPlate(why); Zustände hidden → rise → up → (crack) → broken → sink → hidden.
//   Laufzeit: plateTop, standing (Figuren auf dem Teller), broken, brokenBy.
// felsbrocken – Wurfstein: { pos (Unterkante), vel: [vx, vy, vz], owner?, radius?: 1.0 (Aufprall) } – fliegt mit
//   Schwerkraft, verletzt bei Berührung, zerspringt beim Aufprall (verletzt Figuren im Umkreis, zerschlägt Teller).
// Modelle 'schlangenkoenig' (opts { segments }, state { anim, progress, headPos, turn }, model.head()),
// 'dienerschlange' (opts { height, cracked }, state { anim: idle|rise|sink|hit, progress }), 'felsbrocken'.

import { EnemyW2, figures, activeFigure, clamp, wrapAngle } from '../EnemyW2.js';
import { CourseEntity } from '../CourseEntity.js';
import { spawnLoot } from '../Enemy.js';
import { ballistic, LandingMarkers } from './bomb_cannon.js';
import { getModel } from '../../models/index.js';

const TAU = Math.PI * 2;
const DRUM_R = 2.4, DRUM_H = 1.4, BASE_Y = 1.1;
const RISE = 1.0, ROAR = 1.0, THROW = 1.0, RELEASE = 0.45, SUMMON = 1.2, HIT = 0.6, RETREAT = 1.0, STRIKE = 1.2;
const DEFEAT = 2.5, SINK = 1.0, GAP = 0.8;
const HEAD_UP = 2.7;          // Kopfmitte über der Telleroberseite im Fenster
const PHASES = [
  null,
  { rocks: 2, servants: 3, cracked: 0, window: 7.0, rain: 0 },
  { rocks: 3, servants: 3, cracked: 1, window: 6.5, rain: 2.6 },
  { rocks: 4, servants: 4, cracked: 2, window: 6.0, rain: 2.0 },
];
const smooth = (k) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };

// =====================================================================================================================
// Felsbrocken
// =====================================================================================================================
class Felsbrocken extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'felsbrocken');
    this.half.set(0.42, 0.42, 0.42);
    this.shadow = 0.45;
    this.owner = spec.owner ?? null;
    this.radius = spec.radius ?? 1.0;
    if (Array.isArray(spec.vel)) this.vel.set(spec.vel[0], spec.vel[1], spec.vel[2]);
    this.state = 'air';
    this.stateT = 0;
    this.plateHit = null;
    this._ign = (s) => (this.owner && s.owner === this.owner) || s.water;
    if (level.view) this.setModel(getModel('felsbrocken'));
  }

  update(dt) {
    this.stateT += dt;
    if (this.state === 'break') { if (this.stateT > 0.9) this.kill(); return; }
    this.vel.y = Math.max(this.vel.y - 40 * dt, -26);
    const c = this.center();
    const res = this.level.world.moveAABB(c, this.half, { x: this.vel.x * dt, y: this.vel.y * dt, z: this.vel.z * dt }, { step: 0, ignore: this._ign });
    this.pos.set(c.x, c.y - this.half.y, c.z);
    if (this.pos.y < this.level.killY) { this.kill(); return; }
    if (res.grounded || res.hitWall || res.ceiling) this.impact(res);
  }

  impact(res) {
    if (this.state !== 'air') return;
    this.state = 'break';
    this.stateT = 0;
    this.touch = false;
    const g = res.ground ?? res.wallShape;
    const o = g?.owner;
    if (o && typeof o.breakPlate === 'function' && g.tag === 'teller') { o.breakPlate('rock'); this.plateHit = o; }
    // Splitter verletzen im Umkreis
    for (const p of figures(this.level)) {
      if (!activeFigure(p)) continue;
      if (Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < this.radius && Math.abs(p.pos.y - this.pos.y) < 1.3) p.hurt(this);
    }
    this.level.effects?.dust(this.pos, 8, 1.4);
    this.level.effects?.debris(this.center(), 0x8a7a68, 8);
    this.level.sfx('brickbreak');
    this.level.shake(0.15);
  }

  onPlayer() { return this.state === 'air' ? 'hurt' : 'none'; }

  modelState() { return { anim: this.state === 'break' ? 'break' : 'fall' }; }
}

// =====================================================================================================================
// Diener-Schlange
// =====================================================================================================================
const SRISE = 0.6, SSINK = 0.6, CRACK = 0.45;

class Dienerschlange extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'dienerschlange');
    this.touch = false;
    this.shadow = 0;
    this.height = spec.height ?? 2.8;
    this.cracked = !!spec.cracked;
    this.claw = !!spec.claw;
    this.owner = spec.owner ?? null;
    this.half.set(0.72, this.height / 2, 0.72);
    this.state = 'hidden';
    this.stateT = 0;
    this.broken = false;
    this.brokenBy = null;
    this.standT = 0;
    this.standing = 0;
    this.plateId = null;
    this.bodyId = null;
    this.item = null;
    this.yaw = spec.yaw ?? 0;
    if (level.view) this.setModel(getModel('dienerschlange', { height: this.height, cracked: this.cracked }));
    if (spec.up !== false && !this.owner) { this.state = 'up'; this.addShapesUp(); this.placeItem(); }
  }

  get plateTop() { return this.pos.y + this.height; }

  rise() {
    if (this.state !== 'hidden') return;
    this.state = 'rise';
    this.stateT = 0;
    this.level.effects?.dust(this.pos, 6, 1.2);
    this.level.sfx('dig');
  }

  sink() {
    if (this.state === 'sink' || this.state === 'hidden') return;
    this.state = 'sink';
    this.stateT = 0;
    this.removeShapes();
    this.plateId = this.bodyId = null;
    if (this.item && !this.item.removed) this.item.kill();
    this.item = null;
  }

  addShapesUp() {
    const p = this.pos, t = this.plateTop;
    this.plateId = this.addShape({ type: 'cyl', x: p.x, z: p.z, r: 0.72, y0: t - 0.14, y1: t, oneWay: true, camIgnore: true, tag: 'teller' });
    this.bodyId = this.addShape({ type: 'cyl', x: p.x, z: p.z, r: 0.26, y0: p.y, y1: t - 0.32, climbable: true, camIgnore: true, noWallSlide: false, tag: 'diener' });
  }

  placeItem() {
    if (!this.claw || this.item) return;
    this.item = this.level.spawn('powerup', { pos: [this.pos.x, this.plateTop + 0.02, this.pos.z], power: 'krallen', emerge: false });
  }

  /** Teller zerspringt (rissig betreten, Stein); der Diener versinkt danach. */
  breakPlate(why = 'step') {
    if (this.broken || this.state !== 'up') return;
    this.broken = true;
    this.brokenBy = why;
    if (this.plateId !== null) { this.level.world.remove(this.plateId); this.shapes = this.shapes.filter((id) => id !== this.plateId); this.plateId = null; }
    this.level.effects?.debris({ x: this.pos.x, y: this.plateTop, z: this.pos.z }, 0xf0f4fa, 12);
    this.level.sfx('brickbreak');
    // Krallen-Anzug fällt neben dem Diener zu Boden und bleibt liegen
    if (this.item && !this.item.removed) {
      const it = this.item;
      const a = this.yaw + Math.PI;
      it.pos.set(this.pos.x + Math.cos(a) * 0.9, this.pos.y, this.pos.z - Math.sin(a) * 0.9);
      it.baseY = it.pos.y;
      this.item = null;
    }
    this.state = 'broken';
    this.stateT = 0;
  }

  update(dt) {
    this.stateT += dt;
    switch (this.state) {
      case 'rise':
        if (this.stateT >= SRISE) { this.state = 'up'; this.stateT = 0; this.addShapesUp(); this.placeItem(); }
        break;
      case 'up': {
        let n = 0;
        for (const p of figures(this.level)) if (p.mode === 'ground' && p.ground?.owner === this && p.ground.tag === 'teller') n++;
        this.standing = n;
        if (this.cracked && n > 0) {
          this.standT += dt;
          if (this.standT >= CRACK) this.breakPlate('step');
        } else this.standT = Math.max(0, this.standT - dt * 0.5);
        break;
      }
      case 'broken':
        this.standing = 0;
        if (this.stateT >= 0.45) this.sink();
        break;
      case 'sink':
        if (this.stateT >= SSINK) { this.state = 'hidden'; this.stateT = 0; if (this.owner) this.kill(); }
        break;
      default: break;
    }
  }

  onPlayer() { return 'none'; }
  onHit() {}

  kill() {
    if (this.item && !this.item.removed) this.item.kill();
    this.item = null;
    super.kill();
  }

  modelState() {
    const s = this.state;
    if (s === 'hidden') return { anim: 'rise', progress: 0 };
    if (s === 'rise') return { anim: 'rise', progress: Math.min(1, this.stateT / SRISE) };
    if (s === 'sink') return { anim: 'sink', progress: Math.min(1, this.stateT / SSINK) };
    if (s === 'broken') return { anim: 'hit' };
    return { anim: this.standT > 0 && this.cracked ? 'hit' : 'idle' };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    // zerbrochener Teller: Porzellan weg (Modell zeichnet den Teller sonst weiter)
    const plate = this.model.root.children[2];
    if (plate) plate.scale.setScalar(this.broken ? 0.001 : 1);
    // rissiger Teller wackelt unter der Figur
    this.model.root.position.x += this.state === 'up' && this.cracked && this.standT > 0 ? Math.sin(this.level.time * 60) * 0.03 : 0;
  }

  info() { return { state: this.state, cracked: this.cracked, broken: this.broken, by: this.brokenBy, standing: this.standing, top: +this.plateTop.toFixed(2), claw: !!this.item && !this.item.removed }; }
}

// =====================================================================================================================
// Schlangenkönig
// =====================================================================================================================
class Schlangenkoenig extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'schlangenkoenig');
    this.enemy = false;
    this.boss = true;
    this.wake = 0;
    this.edges = false;
    this.shadow = 0;
    this.half.set(0.55, 0.42, 0.55);
    this.home = this.pos.clone();
    const a = spec.arena ?? {};
    const c = a.center ?? [this.home.x, this.home.y, this.home.z];
    this.arena = { x: c[0], y: c[1], z: c[2], r: a.r ?? 11 };
    this.maxHp = spec.hp ?? 3;
    this.hp = this.maxHp;
    this.plateH = spec.plate ?? 2.8;
    this.segments = spec.segments ?? 14;
    this.clawOn = spec.claw !== false;
    this.wakeR = spec.wakeR ?? 10;
    const R = Math.min(6, this.arena.r - 3);
    this.spots = (spec.spots ?? Array.from({ length: 6 }, (_, i) => { const t = Math.PI / 6 + (i / 6) * TAU; return [this.home.x + Math.cos(t) * R, this.home.z - Math.sin(t) * R]; }))
      .map(([x, z]) => ({ x, z }));
    this.carHits = 0;
    this.hits = 0;
    this.hitLog = [];
    this.rounds = 0;
    this.summons = 0;
    this.servants = [];
    this.rocks = [];
    this.rocksThrown = 0;
    this.rocksFallen = 0;
    this.target = null;
    this.visible = true;
    this.dropped = false;
    this.starDone = false;
    // Kopf-Pose (Gier um die Sockelmitte, Abstand, Höhe über dem Boden)
    this.az = -Math.PI / 2;
    this.hr = 0;
    this.hy = BASE_Y - 0.6;
    this.drumA = 0;
    this.anim = 'rise';
    this.progress = 0;
    this.state = 'wait';
    this.touch = false;
    this._hw = { x: 0, y: 0, z: 0 };
    this.markers = new LandingMarkers(level);
    const p = this.home;
    this.drumId = this.addShape({ type: 'cyl', x: p.x, z: p.z, r: DRUM_R, y0: p.y, y1: p.y + DRUM_H, tag: 'koenig_sockel' });
    if (level.view) this.setModel(getModel('schlangenkoenig', { segments: this.segments }));
    this.initShadows(3);
    this.placeHead();
  }

  get phase() { return clamp(this.maxHp - this.hp + 1, 1, 3); }
  get P() { return PHASES[this.phase]; }
  get managed() { return !!this.level.archetype && this.level.data?.boss && (this.level.data.boss.id ?? 'baron') === this.spec.id; }

  /** Weltlage der Kopfmitte. */
  headWorld(out = this._hw) {
    out.x = this.home.x + Math.cos(this.az) * this.hr;
    out.y = this.home.y + this.hy;
    out.z = this.home.z - Math.sin(this.az) * this.hr;
    return out;
  }

  /** Trefferzone (pos/half) an den Kopf legen. */
  placeHead() {
    const h = this.headWorld();
    this.pos.set(h.x, h.y - this.half.y, h.z);
  }

  // ------------------------------------------------------------------ Archetyp-Schnittstelle

  begin() {
    if (this.state !== 'wait') return;
    this.setState('rise');
    this.az = this.azTo(this.player) ?? this.az;
    this.level.shake(0.5);
    this.level.effects?.dust({ x: this.home.x, y: this.home.y + DRUM_H, z: this.home.z }, 14, 2);
    this.level.effects?.debris({ x: this.home.x, y: this.home.y + DRUM_H + 0.4, z: this.home.z }, 0x8a7a68, 12);
    this.level.sfx('slam');
  }

  reset() {
    this.clearRound(true);
    this.markers.clear();
    this.hp = this.maxHp;
    this.defeated = false;
    this.hits = 0;
    this.rounds = 0;
    this.summons = 0;
    this.visible = true;
    this.touch = false;
    this.hr = 0; this.hy = BASE_Y - 0.6;
    this.anim = 'rise'; this.progress = 0;
    this.setState('wait');
    this.placeHead();
  }

  // ------------------------------------------------------------------ Schritt

  update(dt) {
    this.stateT += dt;
    this.drumA += dt * (this.state === 'defeated' || this.state === 'gone' ? 0 : 0.3);
    this.servants = this.servants.filter((s) => !s.removed);
    this.rocks = this.rocks.filter((r) => !r.removed);
    this.markers.update(dt);
    this.shove();
    const p = this.player;
    switch (this.state) {
      case 'wait':
        this.anim = 'rise'; this.progress = 0;
        if (!this.managed) {
          for (const f of figures(this.level)) if (activeFigure(f) && Math.hypot(f.pos.x - this.home.x, f.pos.z - this.home.z) < this.wakeR) { this.begin(); break; }
        }
        break;
      case 'rise': {
        const k = Math.min(1, this.stateT / RISE);
        this.anim = 'rise'; this.progress = k;
        this.poseTo(dt, this.azTo(p) ?? this.az, 1.6 * smooth(k), BASE_Y - 0.6 + (4.6 - BASE_Y + 0.6) * smooth(k), 99);
        if (k >= 1) { this.touch = true; this.setState('roar'); this.level.sfx('boss_spin'); }
        break;
      }
      case 'roar':
        this.anim = 'summon'; this.progress = Math.min(1, this.stateT / ROAR);
        this.idlePose(dt, p, 0.8, 5.6);
        if (this.stateT >= ROAR) this.startRound();
        break;
      case 'throw': {
        const k = Math.min(1, this.stateT / THROW);
        this.anim = 'strike'; this.progress = k * 0.75;
        // ausholen (zurück, hoch), Peitschen nach vorn, zurück
        const r = k < 0.3 ? 1.6 - 0.9 * smooth(k / 0.3) : k < 0.5 ? 0.7 + 1.6 * smooth((k - 0.3) / 0.2) : 2.3 - 0.7 * smooth((k - 0.5) / 0.5);
        const y = k < 0.3 ? 4.6 + 1.0 * smooth(k / 0.3) : k < 0.5 ? 5.6 - 1.2 * smooth((k - 0.3) / 0.2) : 4.4 + 0.2 * smooth((k - 0.5) / 0.5);
        this.poseTo(dt, this.azTo(p) ?? this.az, r, y, 2.5);
        if (!this.released && k >= RELEASE) { this.released = true; this.throwRock(p); }
        if (k >= 1) {
          this.rocksLeft--;
          if (this.rocksLeft > 0) { this.released = false; this.setState('throw'); }
          else this.setState('summon');
        }
        break;
      }
      case 'summon':
        this.anim = 'summon'; this.progress = Math.min(1, this.stateT / SUMMON);
        this.idlePose(dt, p, 0.8, 5.8);
        if (this.stateT > 0.3 && !this.summoned) { this.summoned = true; this.summon(); }
        if (this.stateT >= SUMMON) { this.setState('lean'); this.retarget(true); this.rainT = this.P.rain || 0; }
        break;
      case 'lean':
        this.anim = 'idle';
        this.leanStep(dt);
        if (this.stateT >= this.P.window) { this.strikeAz = this.azTo(p) ?? this.az; this.strikeFig = p; this.setState('strike'); this.level.sfx('swoop'); }
        break;
      case 'strike': {
        const k = Math.min(1, this.stateT / STRIKE);
        this.anim = 'strike'; this.progress = k;
        const f = this.strikeFig;
        const fd = f ? Math.hypot(f.pos.x - this.home.x, f.pos.z - this.home.z) : 4;
        const reach = clamp(fd, DRUM_R + 1, this.arena.r - 1);
        const fy = f ? f.pos.y - this.home.y + 0.55 : 0.9;
        let r, y;
        if (k < 0.3) { r = 1.6 - 1.0 * smooth(k / 0.3); y = 4.6 + 1.0 * smooth(k / 0.3); }
        else if (k < 0.5) { const u = smooth((k - 0.3) / 0.2); r = 0.6 + (reach - 0.6) * u; y = 5.6 + (fy - 5.6) * u; }
        else if (k < 0.7) { r = reach; y = fy; }
        else { const u = smooth((k - 0.7) / 0.3); r = reach + (1.6 - reach) * u; y = fy + (4.6 - fy) * u; }
        this.poseTo(dt, this.strikeAz, r, y, 99);
        if (k >= 1) { this.clearRound(false); this.setState('gap'); }
        break;
      }
      case 'gap':
        this.anim = 'idle';
        this.idlePose(dt, p, 1.6, 4.6);
        if (this.stateT >= GAP) this.startRound();
        break;
      case 'hit':
        this.anim = 'hit';
        this.poseTo(dt, this.az, this.hr, this.hy + dt * 0.8, 4);
        if (this.stateT >= HIT) {
          this.clearRound(false);
          if (this.hp <= 0) { this.setState('defeated'); this.level.sfx('dizzy'); }
          else this.setState('retreat');
        }
        break;
      case 'retreat':
        this.anim = 'idle';
        this.idlePose(dt, p, 1.6, 4.6);
        if (this.stateT >= RETREAT) this.startRound();
        break;
      case 'defeated':
        this.anim = 'defeated';
        this.idlePose(dt, null, 1.6, 4.6);
        if (this.stateT >= DEFEAT) { this.setState('sink'); this.level.sfx('dig'); }
        break;
      case 'sink': {
        const k = Math.min(1, this.stateT / SINK);
        this.anim = 'rise'; this.progress = 1 - k;
        this.poseTo(dt, this.az, 1.6 * (1 - smooth(k)), BASE_Y - 0.6 + (2.2 - BASE_Y + 0.6) * (1 - smooth(k)), 99);
        if (k >= 1) this.vanish();
        break;
      }
      default: break;
    }
    this.placeHead();
    // Phasen-Ansage nach dem Zustandswechsel (vor dem Archetyp, der sonst seine eigene zeigt)
    this.syncArchPhase();
  }

  /** Kopf weich auf (az, r, y) führen; rate 99 = sofort. */
  poseTo(dt, az, r, y, rate) {
    const k = rate >= 99 ? 1 : Math.min(1, dt * rate);
    this.az += wrapAngle(az - this.az) * k;
    this.hr += (r - this.hr) * k;
    this.hy += (y - this.hy) * k;
  }

  /** Ruhe-Pose: zur Figur gewandt, leichtes Wiegen. */
  idlePose(dt, p, r, y) {
    const t = this.level.time;
    this.poseTo(dt, (this.azTo(p) ?? this.az) + Math.sin(t * 0.9) * 0.15, r, y + Math.sin(t * 1.4) * 0.12, 2.5);
  }

  azTo(p) {
    if (!p || !activeFigure(p)) return null;
    const dx = p.pos.x - this.home.x, dz = p.pos.z - this.home.z;
    if (Math.hypot(dx, dz) < 0.5) return null;
    return Math.atan2(-dz, dx);
  }

  startRound() {
    this.rounds++;
    this.rocksLeft = this.P.rocks;
    this.released = false;
    this.summoned = false;
    this.setState('throw');
  }

  /** Stein aus dem Maul im Bogen auf die Figur (Landeanzeige). */
  throwRock(p) {
    const h = this.headWorld();
    const fx = Math.cos(this.az), fz = -Math.sin(this.az);
    const from = [h.x + fx * 0.7, h.y - 0.45, h.z + fz * 0.7];
    let tx = this.home.x + fx * 6, tz = this.home.z + fz * 6, ty = this.home.y;
    if (activeFigure(p)) { tx = p.pos.x + p.vel.x * 0.3; tz = p.pos.z + p.vel.z * 0.3; ty = p.pos.y; }
    // im Ring halten, nicht auf den Sockel
    const dx = tx - this.home.x, dz = tz - this.home.z, d = Math.hypot(dx, dz) || 1;
    const rr = clamp(d, DRUM_R + 0.8, this.arena.r - 0.8);
    tx = this.home.x + (dx / d) * rr; tz = this.home.z + (dz / d) * rr;
    const T = 1.0;
    const v = ballistic(from, [tx, ty, tz], T);
    const r = this.level.spawn('felsbrocken', { pos: [from[0], from[1] - 0.42, from[2]], vel: v, owner: this });
    if (r) { this.rocks.push(r); this.markers.add(r, tx, ty, tz, T); }
    this.rocksThrown++;
    this.level.sfx('throw');
  }

  /** Stein fällt von der Zeltkuppel (Phase 2/3 im Fenster): abwechselnd auf die Figur bzw. einen Teller. */
  rainRock() {
    const p = this.player;
    const up = this.servants.filter((s) => s.state === 'up' && !s.broken);
    let x, z, y = this.home.y;
    const plate = this.rocksFallen % 2 === 1 && up.length ? up[this.rocksFallen % up.length] : null;
    if (plate) { x = plate.pos.x; z = plate.pos.z; y = plate.plateTop; }
    else if (activeFigure(p)) { x = p.pos.x; z = p.pos.z; y = p.pos.y; }
    else return;
    const r = this.level.spawn('felsbrocken', { pos: [x, this.home.y + 9.5, z], vel: [0, -2, 0], owner: this });
    if (r) {
      this.rocks.push(r);
      const T = Math.sqrt((2 * Math.max(0.5, this.home.y + 9.5 - y)) / 40);
      this.markers.add(r, x, y, z, T);
    }
    this.rocksFallen++;
  }

  /** Diener rufen (an den Löchern nahe der Figur). */
  summon() {
    this.summons++;
    const p = this.player;
    const P = this.P;
    const ref = activeFigure(p) ? p.pos : this.home;
    const order = this.spots.map((s, i) => ({ s, i, d: Math.hypot(s.x - ref.x, s.z - ref.z) })).sort((a, b) => a.d - b.d || a.i - b.i);
    const pick = order.slice(0, Math.min(P.servants, order.length));
    // rissig: die am weitesten entfernten; Krallen-Anzug: bei jedem zweiten Ruf auf dem fernsten heilen Teller
    const cracked = new Set(pick.slice(pick.length - P.cracked).map((o) => o.i));
    const wantClaw = this.clawOn && this.summons % 2 === 0 && !(activeFigure(p) && p.power === 'krallen');
    const healthy = pick.filter((o) => !cracked.has(o.i));
    const clawI = wantClaw && healthy.length ? healthy[healthy.length - 1].i : -1;
    for (const o of pick) {
      const sv = this.level.spawn('dienerschlange', {
        pos: [o.s.x, this.home.y, o.s.z], height: this.plateH, cracked: cracked.has(o.i), claw: o.i === clawI, owner: this, up: false,
        yaw: Math.atan2(-(this.home.z - o.s.z), this.home.x - o.s.x),
      });
      if (sv) { sv.rise(); this.servants.push(sv); }
    }
    this.level.sfx('boss_spin');
  }

  /** Teller unter dem Kopf wählen (nahe der Figur, heil). */
  retarget(force) {
    const p = this.player;
    const up = this.servants.filter((s) => (s.state === 'up' || s.state === 'rise') && !s.broken);
    if (!up.length) { this.target = null; return; }
    if (!force && this.target && up.includes(this.target) && this.stateT - (this.targetT ?? 0) < 1.6) return;
    const ref = activeFigure(p) ? p.pos : this.home;
    up.sort((a, b) => Math.hypot(a.pos.x - ref.x, a.pos.z - ref.z) - Math.hypot(b.pos.x - ref.x, b.pos.z - ref.z));
    // steht die Figur schon auf einem Teller, bleibt der Kopf dort
    const on = up.find((s) => s.standing > 0);
    this.target = on ?? up[0];
    this.targetT = this.stateT;
  }

  leanStep(dt) {
    this.retarget(false);
    const t = this.target;
    if (t) {
      const dx = t.pos.x - this.home.x, dz = t.pos.z - this.home.z, d = Math.hypot(dx, dz);
      const az = Math.atan2(-dz, dx);
      // langsam drehen (max. 1,4 rad/s), damit die Figur mitkommt
      const da = wrapAngle(az - this.az), m = 1.4 * dt;
      this.az += Math.max(-m, Math.min(m, da));
      this.hr += (Math.max(DRUM_R + 0.4, d - 1.0) - this.hr) * Math.min(1, dt * 2.5);
      this.hy += (this.plateH + HEAD_UP + Math.sin(this.level.time * 1.6) * 0.1 - this.hy) * Math.min(1, dt * 2.5);
    } else this.idlePose(dt, this.player, 1.6, 4.6);
    if (this.P.rain > 0) {
      this.rainT -= dt;
      if (this.rainT <= 0) { this.rainT = this.P.rain; this.rainRock(); }
    }
  }

  /** Runde aufräumen: Diener versinken, Steine (optional) weg. */
  clearRound(all) {
    for (const s of this.servants) { if (all) s.kill(); else s.sink(); }
    if (all) {
      this.servants.length = 0;
      for (const r of this.rocks) r.kill();
      this.rocks.length = 0;
    }
    this.target = null;
  }

  /** Wer auf dem Sockel landet, wird heruntergeschubst (kein Schaden). */
  shove() {
    if (this.state === 'wait' || this.state === 'gone') return;
    for (const p of figures(this.level)) {
      if (!activeFigure(p) || p.mode !== 'ground' || p.ground?.owner !== this) continue;
      if (typeof p.knockback === 'function') p.knockback({ pos: { x: this.home.x, y: this.home.y, z: this.home.z } });
      p.vel.x *= 1.4; p.vel.z *= 1.4;
      this.shoves = (this.shoves ?? 0) + 1;
      this.level.sfx('bounce');
    }
  }

  syncArchPhase() {
    const arch = this.level.archetype;
    if (!arch || arch.boss !== this) return;
    const ph = this.phase;
    if (arch.seenPhase === ph || this.state === 'hit' || this.hp <= 0) return;
    arch.seenPhase = ph;
    if (ph === 2) arch.hud?.banner?.('Vorsicht, rissige Teller!', { hold: 1.4, size: 14, color: '#ffd080' });
    if (ph === 3) arch.hud?.banner?.('Steine fallen von der Kuppel!', { hold: 1.6, size: 14, color: '#ffb040' });
  }

  // ------------------------------------------------------------------ Treffer

  get vulnerable() { return this.hp > 0 && (this.state === 'lean' || this.state === 'summon'); }

  takeHit(where) {
    if (this.hp <= 0) return;
    this.hp--;
    this.hits++;
    this.hitLog.push({ where, t: +this.level.time.toFixed(2), hp: this.hp, state: this.state });
    this.setState('hit');
    this.level.sfx('boss_hit');
    this.level.sfx('stomp');
    this.level.shake(0.5);
    const h = this.headWorld();
    this.level.effects?.sparks({ x: h.x, y: h.y + 0.4, z: h.z }, 18);
    this.level.onBossHit?.(this, where);
    if (this.hp <= 0) {
      this.defeated = true;
      this.touch = false;
      this.level.onBossDefeated?.(this);
    }
  }

  onCannon() { if (this.vulnerable) this.takeHit('cannon'); }

  onHit(kind, source) { if (kind === 'cannon') this.onCannon(source); }

  onPlayer(player, contact) {
    if (!this.touch || this.hp <= 0) return 'none';
    const s = this.state;
    if (s === 'hit' || s === 'defeated' || s === 'sink' || s === 'gone' || s === 'wait' || s === 'rise') return 'none';
    if (contact.fromAbove || contact.pound) {
      if (this.vulnerable) { this.takeHit('stomp'); return contact.pound ? 'none' : 'stomp'; }
      this.level.sfx('bounce');
      return 'stomp';
    }
    if (s === 'strike') return 'hurt';
    return 'none';
  }

  vanish() {
    this.setState('gone');
    this.visible = false;
    this.touch = false;
    this.markers.clear();
    const st = this.spec.star;
    if (st && !this.starDone) {
      this.starDone = true;
      const pos = Array.isArray(st) ? st : st.pos;
      this.level.spawn('star', { pos, index: Array.isArray(st) ? 0 : (st.index ?? 0) });
      this.level.effects?.sparks({ x: pos[0], y: pos[1] + 0.6, z: pos[2] }, 24);
      this.level.sfx('powerup_appear');
    }
    if (!this.managed && !this.dropped && this.spec.drop) {
      this.dropped = true;
      spawnLoot(this.level, this.spec.drop, this.arena.x, this.arena.y + 0.5, this.arena.z + DRUM_R + 1.5);
    }
  }

  // ------------------------------------------------------------------ Darstellung

  render(dt, t) {
    super.render(dt, t);
    this.markers.render(dt);
  }

  modelState() {
    return {
      anim: this.anim, progress: this.progress,
      headPos: [this.hr, this.hy, 0],
      turn: this.drumA - this.az,
    };
  }

  syncModel() {
    if (!this.model) return;
    const r = this.model.root;
    r.position.copy(this.home);
    r.rotation.y = this.az;
  }

  dispose() {
    this.markers.clear();
    super.dispose();
  }

  info() {
    const h = this.headWorld({});
    return {
      state: this.state, hp: this.hp, maxHp: this.maxHp, phase: this.phase, hits: this.hits, rounds: this.rounds, summons: this.summons,
      servants: this.servants.filter((s) => s.state === 'up').length, rocks: this.rocks.length, thrown: this.rocksThrown, fallen: this.rocksFallen,
      vulnerable: this.vulnerable, head: { x: +h.x.toFixed(2), y: +h.y.toFixed(2), z: +h.z.toFixed(2) }, shoves: this.shoves ?? 0,
    };
  }
}

export const KINDS = {
  schlangenkoenig: (level, spec) => new Schlangenkoenig(level, spec),
  dienerschlange: (level, spec) => new Dienerschlange(level, spec),
  felsbrocken: (level, spec) => new Felsbrocken(level, spec),
};
