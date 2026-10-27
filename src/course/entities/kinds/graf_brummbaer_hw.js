// Graf Brummbär – Endgegner der Halloween-Welt „Kürbisinsel“ (H-Burg, Gruselschloss). Baron Brummbär im Vampirumhang auf
// dem runden Schlossdach. Lustig, nie erschreckend: Plastik-Zähnchen, Schwindel-Fledermäuse, Konfetti aus Süßigkeiten.
//
// Ablauf (Phase = maxHp − hp + 1; Werte je Phase als [P1, P2, P3]):
//   wait → begin(): intro (2,2 s, lacht) → walk: spaziert im Wunschabstand keep m um die Figur herum (immer in der Arena)
//   und **wirft gezündete Kürbis-Bomben** (throw 1,0 s; die Bombe verlässt bei 50 % die Tatze – model.hand()). Jede Bombe
//   fliegt flight s im Bogen und landet auf einer **roten Markierung** (Modell 'boss_marker') kurz vor der Figur (Phase 2/3:
//   zwei Bomben links und rechts von ihr); gelandet brennt ihre Lunte fuse s, dann explodiert sie (Radius 1,5 m, verletzt).
//   Phase 3: jeder ringEvery-te Wurf ist ein **kurzer Rundumwurf** (ring Bomben im Kreis ringR m um ihn).
//   **Die Figur hebt eine Bombe auf (Aktion bzw. Rennen + Berührung) und wirft sie zurück**: trifft die geworfene Bombe ihn
//   (onBombHit, Zielhilfe: Würfe grob in seine Richtung lenken zu ihm ein), ist das ein **Treffer** → hit (0,6 s, Zylinder
//   fliegt) → stunned (0,7 s, Schwindel-Fledermäuse) → bats (0,9 s: wickelt sich in den Umhang und verpufft) → **swarm**:
//   er fliegt als **Fledermaus-Schwarm** (swarm Fledermäuse um den Anführer mit Zylinder) in Bögen über die Arena (jeder
//   zweite Bogen zur Figur hin) –
//   Berührung verletzt (ausweichen), **Draufspringen auf eine einzelne Fledermaus gibt einen Bitcoin** – und landet
//   (land 0,9 s) an einer Stelle weit weg von der Figur → walk (Phase 2/3: mehr und schnellere Bomben, Schwarm größer).
//   3. Treffer → defeated (2,4 s: setzt sich, Fledermäuse flattern davon, **Konfetti aus Süßigkeiten**, Fanfare über den
//   Boss-Archetyp) → gone: Stern (star) erscheint, der Archetyp öffnet die Warp-Box.
//   **Nur zurückgeworfene Bomben treffen.** Draufspringen/Stampfen = Abprall ohne Schaden, Feuer, Krallen, Panzer, Stern,
//   Riese, Explosionen daneben zählen nicht; stehend (walk/throw) verletzt die Berührung, getroffen/benommen nicht.
//   Kein `enemy`, `boss: true`.
// Ansagen über arch.hud.banner: „Wirf die Kürbis-Bomben zurück!“ (erster Gang), „Ein Fledermaus-Schwarm – ausweichen!“
//   (erster Schwarm), Phase 2 „Jetzt fliegen mehr Bomben!“, Phase 3 „Vorsicht – Rundumwurf!“ (Standardtexte ersetzt).
// Boss-Archetyp-Schnittstelle wie kippquader_koenig_w5.js: begin(), reset(), state, stateT, hp, maxHp, phase, visible,
//   home (= Arenamitte, rahmt die Kampfkamera), half, carHits (0), vulnerable, info(); level.onBossHit(boss, 'bombe'),
//   level.onBossDefeated(boss). Tod im Kampf (reset): Graf 3/3 am Startplatz, Bomben, Markierungen, Schwarm weg. Ohne
//   Archetyp beginnt der Kampf ab wakeR m, drop erscheint nach 'gone' in der Arenamitte.
//
// Daten: { kind: 'graf_brummbaer', id: 'graf', pos (Start, Fußpunkt), dir?: [dx, dz] (Start-Blick, Standard +Z),
//          arena?: { center: [x, y, z], r: 9 } (Standard: center = pos; er läuft, landet und zielt nur darin), hp?: 3,
//          speed?: [1.3, 1.7, 2.1] (Gehen m/s), keep?: [3.6, 5.6] (Wunschabstand zur Figur in m),
//          every?: [2.8, 2.3, 2.0] (s zwischen Würfen), first?: 1.2 (s bis zum ersten Wurf), bombs?: [1, 2, 2] (je Wurf),
//          max?: [2, 3, 5] (lebende Bomben höchstens), flight?: [1.1, 1.0, 0.9], fuse?: [3.4, 3.0, 2.6] (s nach der
//          Landung), radius?: 1.5, ring?: [0, 0, 4], ringEvery?: 3, ringR?: 2.8,
//          swarm?: [8, 8, 12] (Fledermäuse; Index = Phase nach dem Treffer), swarmLegs?: [3, 3, 4] (Bögen),
//          swarmSpeed?: [3.6, 3.6, 4.4] (m/s), swarmSpread?: [1.3, 1.3, 1.7] (m), swarmY?: 0.95 (Höhe der Schwarmmitte),
//          star?: { pos, index } | [x, y, z], wakeR?: 10, drop?, seed? }
// Laufzeit: throws, bombsThrown, bombs (lebende), hits, hitLog, misses (Bomben-Treffer, als er nicht verwundbar war),
//   bounces (Kopfsprünge), swarms, batsDown, bats (Schwarm-Glieder), hidden (als Schwarm unterwegs), swarmPath(),
//   info(). Modelle 'graf_brummbaer', 'kuerbis_bombe', 'fledermaus_schwarm' (Anführer), 'flatterfledi' (Schwarm, eine
//   Instanz-Gruppe), 'bonbon_konfetti', 'boss_marker'.
//
// kuerbis_bombe – Kürbis-Bombe mit Zündschnur (auch einzeln im Level nutzbar). Liegt (idle, ungezündet) bzw. brennt (lit);
//   nach fuse s explodiert sie (Radius radius, Standard 1,5 m; explodeAt aus zuendkopf_w5.js: verletzt Figuren bis 0,9 ×
//   Radius, besiegt Gegner, zerbricht Zerbrechliches, zündet andere Bomben). **Tragen/Werfen** (Trage-System): Aktion in
//   Reichweite bzw. Rennen + Berührung hebt sie auf (zündet sie; die Lunte hat dann noch mindestens carryFuse s); Aktion
//   wirft sie im Bogen, Ducken + Aktion setzt sie ab. **Geworfen explodiert sie beim Aufprall** an einer Wand, an einem
//   Gegner oder Endgegner (onBombHit(bomb) vorher); sonst rutscht sie aus und brennt weiter. Zielhilfe: zielt ein Wurf
//   höchstens 40° neben einen Endgegner (≤ 10 m), fliegt die Bombe im Bogen zu ihm. Vom Endgegner geworfen (vel, owner)
//   fliegt sie ohne Lunte und brennt erst ab der Landung. Draufspringen = Abprall (zündet), seitliche Berührung tut
//   nichts. Feuer/Panzer/Explosion zünden (Explosion: 0,15 s), Tatzenhieb schlägt sie weg, Stern/Riese entschärfen.
//   Daten: { kind: 'kuerbis_bombe', pos, lit?: false, fuse?: 3, radius?: 1.5, carryFuse?: 1.6, vel?: [vx, vy, vz],
//            owner? (Entität oder id: trifft sie nicht, bis eine Figur sie geworfen hat), id? }
//   Zustände: idle | lit | air | carried | thrown | slide | explode (0,6 s) | fizzle (entschärft, 0,5 s).
//   Laufzeit: lit, fuse (s übrig), exploded, fizzled, thrownBy, assisted (Zielhilfe aktiv), info().

import * as THREE from 'three';
import { EnemyW2, figures, activeFigure, clamp, toWorld, localOffset } from '../EnemyW2.js';
import { CourseEntity } from '../CourseEntity.js';
import { spawnLoot } from '../Enemy.js';
import { explodeAt } from './zuendkopf_w5.js';
import { ballistic, LandingMarkers } from './bomb_cannon.js';
import { BatFlockView, Flatterfledi } from './flatterfledi_hw.js';
import { getModel } from '../../models/index.js';

const TAU = Math.PI * 2;
const G = 40;
const pick = (v, ph, def) => (Array.isArray(v) ? v[Math.min(v.length - 1, ph - 1)] : v ?? def[ph - 1]);

// =====================================================================================================================
// Kürbis-Bombe
// =====================================================================================================================
const EXPLODE = 0.6, FIZZLE = 0.5;
const BOMB_KINDS = new Set(['kuerbis_bombe', 'zuendkopf', 'kickbombe']);

/** Kurzer Explosionsblitz (wachsende, verblassende Kugel, lila-orange). */
function flash(level, c, r) {
  const view = level.view;
  if (!view) return;
  const mat = new THREE.MeshBasicMaterial({ color: 0xffa070, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending });
  const geo = new THREE.SphereGeometry(1, 16, 10);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(c.x, c.y, c.z);
  m.scale.setScalar(0.3);
  let t = 0;
  view.add(m, (dt) => {
    t += dt;
    const k = Math.min(1, t / 0.28);
    m.scale.setScalar(0.3 + r * 0.8 * Math.sqrt(k));
    mat.opacity = 0.6 * (1 - k);
    mat.color.setRGB(1, 0.62 - 0.25 * k, 0.44 + 0.4 * k);
    if (k >= 1) { view.remove(m); geo.dispose(); mat.dispose(); }
  });
}

class KuerbisBombe extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'kuerbis_bombe');
    this.half.set(0.3, 0.3, 0.3);
    this.shadow = 0.36;
    this.carryable = true;
    this.holdStyle = 'over';
    this.fuseTotal = spec.fuse ?? 3;
    this.radius = spec.radius ?? 1.5;
    this.carryFuse = spec.carryFuse ?? 1.6;
    this.owner = typeof spec.owner === 'string' ? level.named.get(spec.owner) ?? null : spec.owner ?? null;
    this.lit = false;
    this.fuse = this.fuseTotal;
    this.exploded = false;
    this.fizzled = false;
    this.defeated = false;
    this.thrownBy = null;
    this.target = null;
    this.assisted = false;
    this.grace = 0;
    this.state = 'idle';
    this.stateT = 0;
    if (spec.lit) this.light();
    if (Array.isArray(spec.vel)) {
      this.vel.set(spec.vel[0], spec.vel[1], spec.vel[2]);
      this.lit = true;
      this.state = 'air';
    }
    if (level.view) this.setModel(getModel('kuerbis_bombe'));
  }

  setState(s) { this.state = s; this.stateT = 0; }

  /** Lunte anzünden (bzw. auf höchstens t s verkürzen). */
  light(t) {
    if (this.exploded || this.fizzled) return;
    if (this.lit) { if (t !== undefined) this.fuse = Math.min(this.fuse, t); return; }
    this.lit = true;
    this.fuse = t ?? this.fuseTotal;
    if (this.state === 'idle') this.setState('lit');
    this.level.sfx('hover');
  }

  canCarry() { return !this.exploded && !this.fizzled && ['idle', 'lit', 'slide'].includes(this.state); }

  update(dt) {
    this.stateT += dt;
    if (this.grace > 0) this.grace -= dt;
    if (this.state === 'explode') { if (this.stateT >= EXPLODE) this.kill(); return; }
    if (this.state === 'fizzle') { if (this.stateT >= FIZZLE) this.kill(); return; }
    // Lunte brennt (nicht im Flug vom Endgegner – sie zündet erst bei der Landung)
    if (this.lit && this.state !== 'air') {
      this.fuse -= dt;
      if (this.fuse <= 0) { this.explode(); return; }
    }
    switch (this.state) {
      case 'idle': case 'lit': {
        const f = Math.exp(-6 * dt);
        this.vel.x *= f; this.vel.z *= f;
        this.moveWithGravity(dt);
        break;
      }
      case 'air': {
        this.moveWithGravity(dt, { step: 0.1 });
        if (this.removed) return;
        if (this.grounded && this.stateT > 0.05) {
          this.vel.set(0, 0, 0);
          this.setState('lit');
          this.level.effects?.dust(this.pos, 4, 0.8);
          this.level.sfx('land');
        }
        break;
      }
      case 'carried':
        if (!this.carrier) { this.setState('lit'); this.vel.set(0, 1, 0); break; }
        this.followCarrier();
        break;
      case 'thrown': this.fly(dt); break;
      case 'slide': {
        const f = Math.exp(-4 * dt);
        this.vel.x *= f; this.vel.z *= f;
        const hs = Math.hypot(this.vel.x, this.vel.z);
        const res = this.moveWithGravity(dt, { step: 0.2 });
        if (this.removed) return;
        if (this.thrownBy && hs > 3 && (res.hitWall || this.impact())) { this.explode(); return; }
        if (hs < 0.5) { this.thrownBy = null; this.setState('lit'); }
        break;
      }
      default: break;
    }
  }

  /** Geworfen: Bogen (mit Zielhilfe zum Endgegner); Aufprall an Wand/Gegner/Endgegner → Explosion, Landung → ausrutschen. */
  fly(dt) {
    const tg = this.target;
    if (tg && !tg.removed && tg.visible !== false && !tg.hidden) {
      // waagerecht nachführen: Restflugzeit bis zum geplanten Treffpunkt
      const left = Math.max(0.08, this.flightT - this.stateT);
      const vx = (tg.pos.x - this.pos.x) / left, vz = (tg.pos.z - this.pos.z) / left, hs = Math.hypot(vx, vz), max = 16;
      this.vel.x = hs > max ? (vx / hs) * max : vx;
      this.vel.z = hs > max ? (vz / hs) * max : vz;
    }
    const hs = Math.hypot(this.vel.x, this.vel.z);
    const res = this.moveWithGravity(dt, { step: 0.1 });
    if (this.removed) return;
    if (res.hitWall && hs > 3) { this.explode(); return; }
    if (this.impact()) { this.explode(); return; }
    if (this.grounded && this.stateT > 0.05) {
      this.level.effects?.dust(this.pos, 3, 0.8);
      this.setState('slide');
      this.target = null;
      this.vel.x *= 0.6; this.vel.z *= 0.6;
    }
  }

  /** Berührt die geworfene Bombe einen Gegner, Endgegner oder ein onBombHit-Ziel? (onBombHit wird gerufen) */
  impact() {
    for (const e of this.level.entities) {
      if (e === this || !e.alive || e.removed || e.defeated || e.touch === false || e.carrier) continue;
      if (e === this.owner && !this.thrownBy) continue;
      if (!e.onBombHit && !e.enemy && !e.boss) continue;
      if (BOMB_KINDS.has(e.kind)) continue;
      if (!this.overlaps(e, 0.05)) continue;
      e.onBombHit?.(this);
      return true;
    }
    return false;
  }

  /** Zielhilfe: Endgegner (onBombHit) höchstens 40° neben der Wurfrichtung, ≤ 10 m. */
  findTarget(dir) {
    let best = null, bs = Infinity;
    for (const e of this.level.entities) {
      if (!e.boss || !e.onBombHit || !e.alive || e.removed || e.hidden || e.visible === false || e.hp <= 0) continue;
      const dx = e.pos.x - this.pos.x, dz = e.pos.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d > 10 || d < 0.3) continue;
      const cos = (dx * dir.x + dz * dir.z) / d;
      if (cos < Math.cos((40 * Math.PI) / 180)) continue;
      const score = d * (2 - cos);
      if (score < bs) { bs = score; best = e; }
    }
    return best;
  }

  // ------------------------------------------------------------------ Tragen/Werfen

  onPickup() {
    this.light();
    this.fuse = Math.max(this.fuse, this.carryFuse);
    this.setState('carried');
    this.touch = false;
    this.vel.set(0, 0, 0);
  }

  onThrow(player, o) {
    this.touch = true;
    this.thrownBy = player;
    this.grace = 0.3;
    this.target = null;
    this.assisted = false;
    if (o.gentle) {
      this.pos.x = player.pos.x + o.dir.x * 0.75; this.pos.z = player.pos.z + o.dir.z * 0.75;
      this.pos.y = player.pos.y + 0.1;
      this.vel.set(0, 0, 0);
      this.thrownBy = null;
      this.setState('lit');
      return;
    }
    this.yaw = Math.atan2(-o.dir.z, o.dir.x);
    this.grounded = false;
    const tg = this.findTarget(o.dir);
    if (tg) {
      // Bogen zur Körpermitte des Ziels; Flugzeit nach Entfernung
      const d = Math.hypot(tg.pos.x - this.pos.x, tg.pos.z - this.pos.z);
      this.flightT = clamp(d / 9, 0.3, 0.85);
      const ty = tg.pos.y + Math.min(1.2, tg.half.y) - this.half.y;
      const v = ballistic([this.pos.x, this.pos.y, this.pos.z], [tg.pos.x, ty, tg.pos.z], this.flightT);
      this.vel.set(v[0], v[1], v[2]);
      this.target = tg;
      this.assisted = true;
    } else {
      this.vel.set(o.dir.x * 9 + player.vel.x * 0.3, 4.5, o.dir.z * 9 + player.vel.z * 0.3);
    }
    this.setState('thrown');
  }

  onDrop() {
    this.touch = true;
    this.vel.set(0, 2, 0);
    this.grace = 0.3;
    this.setState('lit');
  }

  /** Wegschlagen (Tatzenhieb): fliegt brennend weg wie geworfen. */
  knock(source, dx, dz, sp = 7) {
    const l = Math.hypot(dx, dz) || 1;
    this.light();
    this.vel.set((dx / l) * sp, 4, (dz / l) * sp);
    this.thrownBy = source ?? null;
    this.owner = null;
    this.target = null;
    this.grounded = false;
    this.grace = 0.3;
    this.setState('thrown');
  }

  // ------------------------------------------------------------------ Berührung und Treffer

  onPlayer(player, contact) {
    if (this.exploded || this.fizzled || ['carried', 'air', 'thrown'].includes(this.state)) return 'none';
    if (this.grace > 0) return 'none';
    if (contact.fromAbove || contact.pound) {
      this.light();
      this.grace = 0.25;
      if (this.state === 'slide') { this.vel.x = 0; this.vel.z = 0; this.thrownBy = null; this.setState('lit'); }
      return contact.pound ? 'none' : 'stomp';
    }
    if (player.input?.run && player.canPickUp?.()) { player.pickUp(this); return 'none'; }
    return 'none';
  }

  onHit(kind, source) {
    if (this.exploded || this.fizzled || this.state === 'carried' || source === this) return;
    if (kind === 'mega' || kind === 'star') { this.fizzle(); return; }
    if (kind === 'bomb') { this.light(0.15); return; }
    if (kind === 'pound' && source?.pos && Math.abs(source.pos.y - this.pos.y) > 0.6) return;
    if (kind === 'claw' && source?.facingVec) { const f = source.facingVec(); this.knock(source, f.x, f.z); return; }
    this.light();
  }

  explode() {
    if (this.exploded || this.fizzled) return;
    this.exploded = true;
    this.defeated = true;
    this.lit = false;
    if (this.carrier) { if (this.carrier.holding === this) this.carrier.holding = null; this.carrier = null; }
    this.touch = false;
    this.carryable = false;
    this.vel.set(0, 0, 0);
    this.setState('explode');
    const c = this.center().clone();
    this.explosion = explodeAt(this.level, c, this.radius, this, { fx: false });
    // eigene, kindgerechte Wirkung: lila-oranger Puff (Modell), Funken, Kürbis-Stückchen, Druckring
    const lv = this.level, fx = lv.effects;
    lv.sfx('slam');
    lv.sfx('stomp');
    lv.shake(0.35);
    fx?.sparks(c, 16);
    fx?.debris(c, 0xffa040, 3);
    fx?.dust({ x: c.x, y: c.y - 0.3, z: c.z }, 3, 1.0);
    flash(lv, c, this.radius);
  }

  /** Entschärfen (Stern/Riese, Sieg über den Grafen): Puff, keine Explosion. */
  fizzle() {
    if (this.exploded || this.fizzled) return;
    this.fizzled = true;
    this.defeated = true;
    this.lit = false;
    if (this.carrier) { if (this.carrier.holding === this) this.carrier.holding = null; this.carrier = null; }
    this.touch = false;
    this.carryable = false;
    this.vel.set(0, 0, 0);
    this.setState('fizzle');
    this.level.effects?.dust(this.center(), 2, 0.5);
    this.level.effects?.sparks(this.center(), 5);
    this.level.sfx('vanish');
  }

  // ------------------------------------------------------------------ Darstellung

  modelState() {
    const s = this.state;
    const fuse = this.lit && s !== 'air' ? clamp(this.fuse / this.fuseTotal, 0, 1) : 1;
    if (s === 'explode') return { anim: 'explode', progress: Math.min(1, this.stateT / EXPLODE) };
    if (s === 'carried') return { anim: 'carried', fuse };
    if (s === 'thrown' || s === 'air') return { anim: 'thrown', fuse };
    if (this.lit) return { anim: 'lit', fuse };
    return { anim: 'idle' };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    const k = this.state === 'fizzle' ? Math.max(0.001, 1 - this.stateT / FIZZLE) : 1;
    this.model.root.scale.setScalar(k);
  }

  info() {
    return {
      state: this.state, lit: this.lit, fuse: +this.fuse.toFixed(2), exploded: this.exploded, fizzled: this.fizzled,
      thrown: !!this.thrownBy, assisted: this.assisted, x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2),
    };
  }
}

// =====================================================================================================================
// Graf Brummbär
// =====================================================================================================================
const INTRO = 2.2, THROW = 1.0, RELEASE = 0.5, HIT = 0.6, STUN = 0.7, BATS = 0.9, LAND = 0.9, DEFEAT = 2.4, DEF_ANIM = 1.6;
const GATHER = 0.45;           // s, in denen die übrigen Fledermäuse bei der Landung zu ihm zurückfliegen
const MAX_BATS = 20;
const VULNERABLE = new Set(['walk', 'throw']);

/** Kleiner deterministischer Zufall (LCG). */
class Lcg {
  constructor(seed) { this.s = seed >>> 0 || 1; }
  next() { this.s = (Math.imul(this.s, 1664525) + 1013904223) >>> 0; return this.s / 4294967296; }
  real(a, b) { return a + (b - a) * this.next(); }
}

const quad = (A, M, B, u, out) => {
  const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
  out.x = a * A.x + b * M.x + c * B.x; out.z = a * A.z + b * M.z + c * B.z;
  return out;
};

class GrafBrummbaer extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'graf_brummbaer');
    this.enemy = false;
    this.boss = true;
    this.wake = 0;
    this.edges = false;
    this.half.set(0.7, 1.4, 0.7);
    this.shadow = 1.0;
    this.start = this.pos.clone();
    const a = spec.arena ?? {};
    const c = a.center ?? [this.start.x, this.start.y, this.start.z];
    this.arena = { x: c[0], y: c[1], z: c[2], r: a.r ?? 9 };
    this.home = new THREE.Vector3(c[0], c[1], c[2]);
    this.startYaw = Array.isArray(spec.dir) ? Math.atan2(-spec.dir[1], spec.dir[0]) : -Math.PI / 2;
    this.maxHp = spec.hp ?? 3;
    this.hp = this.maxHp;
    this.carHits = 0;
    this.visible = true;
    this.wakeR = spec.wakeR ?? 10;
    this.markers = new LandingMarkers(level);
    this.bombList = [];
    this.bats = [];
    this.flock = new BatFlockView(level, MAX_BATS);
    this.leader = null;
    this.confetti = null;
    if (level.view) {
      this.leader = getModel('fledermaus_schwarm', { count: 1, spread: 0.3, leader: true });
      this.leader.root.visible = false;
      level.view.add(this.leader.root);
      this.setModel(getModel('graf_brummbaer'));
    }
    this.initShadows(3);
    this.handOff = localOffset('graf_brummbaer:hand', this.model, { anim: 'throw', progress: 0.48, hp: 3 }, (o) => this.model.hand(o), { x: 0.3, y: 2.5, z: -0.6 });
    this.resetFields();
  }

  resetFields() {
    this.state = 'wait';
    this.stateT = 0;
    this.pos.copy(this.start);
    this.vel.set(0, 0, 0);
    this.yaw = this.startYaw;
    this.throwT = this.spec.first ?? 1.2;
    this.throws = 0; this.throwCount = 0; this.bombsThrown = 0;
    this.hits = 0; this.misses = 0; this.bounces = 0; this.swarms = 0; this.batsDown = 0;
    this.hitLog = [];
    this.hidden = false;
    this.grace = 0;
    this.hinted = false; this.swarmHinted = false;
    this.starDone = false; this.dropped = false;
    this.released = false; this.ringNow = false;
    this.strafe = 1; this.strafeT = 0;
    this.walkSpeed = 0;
    this.legs = null; this.swarmT = 0; this.swarmTotal = 0;
    this.rnd = new Lcg(this.spec.seed ?? 0x6a7f31);
  }

  get phase() { return clamp(this.maxHp - this.hp + 1, 1, 3); }
  get managed() { return !!this.level.archetype && this.level.data?.boss && (this.level.data.boss.id ?? 'baron') === this.spec.id; }
  val(key, def) { return pick(this.spec[key], this.phase, def); }
  get vulnerable() { return VULNERABLE.has(this.state) && !this.hidden && this.hp > 0; }
  get bombs() { return this.bombList.filter((b) => !b.removed && !b.exploded && !b.fizzled).length; }
  /** Der Graf bleibt auf dem Dach (Arenagrenze), Lava gibt es dort nicht. */
  checkLava() { return false; }

  setState(s) { this.state = s; this.stateT = 0; }

  // ------------------------------------------------------------------ Archetyp-Schnittstelle

  begin() {
    if (this.state !== 'wait') return;
    this.setState('intro');
    this.faceFigure(1);
    this.level.sfx('ghost');
  }

  reset() {
    for (const b of this.bombList) if (!b.removed) b.kill();
    this.bombList.length = 0;
    for (const m of this.bats) if (!m.removed) m.kill();
    this.bats.length = 0;
    this.markers.clear();
    this.dropConfetti();
    this.hp = this.maxHp;
    this.defeated = false;
    this.visible = true;
    this.touch = true;
    this.fellOut = false;
    if (this.model) this.model.root.visible = true;
    if (this.leader) this.leader.root.visible = false;
    this.resetFields();
  }

  // ------------------------------------------------------------------ Schritt

  update(dt) {
    this.stateT += dt;
    if (this.grace > 0) this.grace -= dt;
    this.bombList = this.bombList.filter((b) => !b.removed);
    this.bats = this.bats.filter((m) => !m.removed);
    this.markers.update(dt);
    if (this.confetti && this.level.time - this.confettiT0 > 2.2) this.dropConfetti();
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
        this.faceFigure(dt);
        if (this.stateT >= INTRO) this.startWalk();
        return;
      case 'walk':
        this.walkStep(dt);
        this.throwT -= dt;
        if (this.throwT <= 0) this.tryThrow();
        return;
      case 'throw':
        this.stand(dt);
        this.faceFigure(dt, 6);
        if (!this.released && this.stateT >= THROW * RELEASE) this.release();
        if (this.stateT >= THROW) { this.setState('walk'); this.throwT = this.val('every', [2.8, 2.3, 2.0]); }
        return;
      case 'hit':
        this.stand(dt);
        if (this.stateT >= HIT) this.setState(this.hp > 0 ? 'stunned' : 'defeated');
        return;
      case 'stunned':
        this.stand(dt);
        if (this.stateT >= STUN) { this.setState('bats'); this.level.sfx('vanish'); }
        return;
      case 'bats':
        this.stand(dt);
        if (this.stateT >= BATS) this.startSwarm();
        return;
      case 'swarm': this.swarmStep(dt); return;
      case 'land':
        this.stand(dt);
        this.faceFigure(dt, 4);
        if (this.stateT >= GATHER) for (const m of this.bats) if (!m.defeated) m.kill();
        if (this.stateT >= LAND) {
          this.touch = true;
          this.grace = 0.4;
          this.setState('walk');
          this.throwT = 0.8;
        }
        return;
      case 'defeated':
        this.stand(dt);
        if (this.stateT >= DEFEAT) this.vanish();
        return;
      default: this.stand(dt);
    }
  }

  /** Zur nächsten Figur drehen (k: Drehrate je s bzw. 1 = sofort mit dt-loser Rate). */
  faceFigure(dt, rate = 8) {
    const p = this.player;
    if (!activeFigure(p)) return;
    const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z;
    if (dt === 1) { this.yaw = Math.atan2(-dz, dx); return; }
    this.faceToward(dx, dz, dt, rate);
  }

  startWalk() {
    this.setState('walk');
    if (!this.hinted) {
      this.hinted = true;
      this.level.archetype?.hud?.banner?.('Wirf die Kürbis-Bomben zurück!', { hold: 2.2, size: 13, y: 0.36 });
    }
  }

  /** Im Wunschabstand um die Figur spazieren (näher → weg, weiter → hin, sonst seitlich), in der Arena bleiben. */
  walkStep(dt) {
    const p = this.player;
    let vx = 0, vz = 0;
    if (activeFigure(p)) {
      const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z, d = Math.hypot(dx, dz) || 1;
      const [k0, k1] = this.spec.keep ?? [3.6, 5.6];
      const sp = this.val('speed', [1.3, 1.7, 2.1]);
      this.strafeT -= dt;
      if (this.strafeT <= 0) { this.strafeT = 2.4; this.strafe = -this.strafe; }
      let ux = 0, uz = 0;
      if (d < k0) { ux = -dx / d; uz = -dz / d; }
      else if (d > k1) { ux = dx / d; uz = dz / d; }
      else { ux = (-dz / d) * this.strafe * 0.6; uz = (dx / d) * this.strafe * 0.6; }
      vx = ux * sp; vz = uz * sp;
      // Arena: nicht über den Rand (r − 1,2 m um die Mitte); am Rand seitlich ausweichen bzw. Richtung wechseln
      const A = this.arena, R = A.r - 1.2;
      const nx = this.pos.x + vx * dt - A.x, nz = this.pos.z + vz * dt - A.z, nd = Math.hypot(nx, nz);
      if (nd > R) {
        const ox = nx / nd, oz = nz / nd, out = vx * ox + vz * oz;
        if (out > 0) { vx -= out * ox; vz -= out * oz; }
        if (Math.hypot(this.pos.x - A.x, this.pos.z - A.z) > R) { vx -= ox * 1.5; vz -= oz * 1.5; }
        if (d > k0 && this.strafeT > 0.6) this.strafeT = 0.6;
      }
      this.faceFigure(dt, 8);
    }
    this.vel.x = vx; this.vel.z = vz;
    this.moveWithGravity(dt);
    this.walkSpeed = Math.hypot(vx, vz);
  }

  tryThrow() {
    const p = this.player;
    if (!activeFigure(p)) { this.throwT = 0.5; return; }
    if (this.bombs >= this.val('max', [2, 3, 5])) { this.throwT = 0.6; return; }
    this.throwCount++;
    const ring = this.val('ring', [0, 0, 4]);
    this.ringNow = ring > 0 && this.throwCount % (this.spec.ringEvery ?? 3) === 0;
    this.released = false;
    this.vel.x = 0; this.vel.z = 0;
    this.setState('throw');
  }

  /** Ziel in der Arena halten (r − 1 m). */
  clampArena(x, z, m = 1.0) {
    const A = this.arena, dx = x - A.x, dz = z - A.z, d = Math.hypot(dx, dz), R = A.r - m;
    return d <= R ? [x, z] : [A.x + (dx / d) * R, A.z + (dz / d) * R];
  }

  /** Bomben verlassen die Tatze (bei 50 % des Wurfs). */
  release() {
    this.released = true;
    const h = toWorld(this.pos, this.yaw, this.handOff.x, this.handOff.y, this.handOff.z, {});
    const y = this.arena.y;
    const targets = [];
    let flight = this.val('flight', [1.1, 1.0, 0.9]);
    if (this.ringNow) {
      const n = this.val('ring', [0, 0, 4]), R = this.spec.ringR ?? 2.8;
      for (let i = 0; i < n; i++) {
        const a = this.yaw + Math.PI / n + (i / n) * TAU;
        targets.push(this.clampArena(this.pos.x + Math.cos(a) * R, this.pos.z - Math.sin(a) * R));
      }
      flight = Math.min(flight, 0.75);
    } else {
      const p = this.player;
      const px = activeFigure(p) ? p.pos.x : this.arena.x, pz = activeFigure(p) ? p.pos.z : this.arena.z;
      const dx = this.pos.x - px, dz = this.pos.z - pz, d = Math.hypot(dx, dz) || 1;
      const fx = dx / d, fz = dz / d;           // von der Figur zu ihm
      const bx = px + fx * Math.min(1.3, d * 0.4), bz = pz + fz * Math.min(1.3, d * 0.4);
      const n = this.val('bombs', [1, 2, 2]);
      if (n <= 1) { const j = this.rnd.real(-0.6, 0.6); targets.push(this.clampArena(bx - fz * j, bz + fx * j)); }
      else for (let i = 0; i < n; i++) { const s = n === 2 ? (i ? 1 : -1) * 1.7 : (i - (n - 1) / 2) * 1.6; targets.push(this.clampArena(bx - fz * s, bz + fx * s)); }
    }
    const fuse = this.val('fuse', [3.4, 3.0, 2.6]);
    for (const [tx, tz] of targets) {
      const from = [h.x, h.y - 0.3, h.z];
      const v = ballistic(from, [tx, y, tz], flight);
      const b = this.level.spawn('kuerbis_bombe', { pos: from, vel: v, owner: this, fuse, radius: this.spec.radius ?? 1.5 });
      if (!b) continue;
      this.bombList.push(b);
      this.bombsThrown++;
      this.markers.add(b, tx, y, tz, flight);
    }
    this.throws++;
    this.level.sfx('swoop');
  }

  // ------------------------------------------------------------------ Treffer

  /** Von einer Bombe getroffen (die Bombe ruft das vor ihrer Explosion). Nur zurückgeworfene zählen. */
  onBombHit(bomb) {
    if (!bomb?.thrownBy) return;
    if (!this.vulnerable || this.grace > 0) { this.misses++; return; }
    this.takeHit(bomb);
  }

  takeHit(bomb) {
    this.hp = Math.max(0, this.hp - 1);
    this.hits++;
    this.hitLog.push({ t: +this.level.time.toFixed(2), hp: this.hp, assisted: !!bomb?.assisted });
    this.grace = 0.5;
    this.vel.set(0, 0, 0);
    this.level.sfx('boss_hit');
    this.level.shake(0.5);
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 2.2, z: this.pos.z }, 20);
    this.level.onBossHit?.(this, 'bombe');
    if (this.hp <= 0) {
      this.defeated = true;
      this.touch = false;
      this.setState('defeated');
      for (const b of this.bombList) if (!b.removed && b !== bomb) b.fizzle();
      this.markers.clear();
      this.level.sfx('powerdown');
      this.burstConfetti();
      this.level.onBossDefeated?.(this);
      return;
    }
    this.setState('hit');
  }

  // ------------------------------------------------------------------ Fledermaus-Schwarm

  /** Bahn aus legs Bögen über die Arena; die letzte Landestelle liegt weit weg von der Figur. */
  buildPath() {
    const A = this.arena, rho = A.r * 0.5;
    const n = this.val('swarmLegs', [3, 3, 4]);
    const speed = this.val('swarmSpeed', [3.6, 3.6, 4.4]);
    const p = this.player;
    let th = Math.atan2(-(this.pos.z - A.z), this.pos.x - A.x);
    if (Math.hypot(this.pos.x - A.x, this.pos.z - A.z) < 0.5) th = this.yaw;
    const legs = [];
    let from = { x: this.pos.x, z: this.pos.z }, t0 = 0;
    for (let i = 0; i < n; i++) {
      th += 2.5;
      let to = { x: A.x + Math.cos(th) * rho, z: A.z - Math.sin(th) * rho };
      if (i % 2 === 1 && i < n - 1 && activeFigure(p)) {
        // jeder zweite Bogen fliegt zur Figur hin (ausweichen!), höchstens 0,65 · r von der Mitte
        const px = p.pos.x - A.x, pz = p.pos.z - A.z, pd = Math.hypot(px, pz);
        const rr = Math.min(A.r * 0.65, pd);
        if (pd > 0.3) to = { x: A.x + (px / pd) * rr, z: A.z + (pz / pd) * rr };
        if (Math.hypot(to.x - from.x, to.z - from.z) < 2) to = { x: A.x + Math.cos(th) * rho, z: A.z - Math.sin(th) * rho };
      }
      if (i === n - 1 && activeFigure(p)) {
        // Landestelle: der Ringpunkt am weitesten weg von der Figur
        let best = -1;
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * TAU, q = { x: A.x + Math.cos(a) * rho, z: A.z - Math.sin(a) * rho };
          const d = Math.hypot(q.x - p.pos.x, q.z - p.pos.z);
          if (Math.hypot(q.x - from.x, q.z - from.z) > 2 && d > best) { best = d; to = q; }
        }
      }
      const dx = to.x - from.x, dz = to.z - from.z, L = Math.hypot(dx, dz) || 1;
      const side = i % 2 ? -1 : 1;
      // Ausbuchtung des Bogens: die Bogenmitte bleibt innerhalb von 0,75 · r (über dem Dach)
      let bulge = 0.45, mid;
      for (let k = 0; k < 6; k++, bulge *= 0.6) {
        mid = { x: (from.x + to.x) / 2 - (dz / L) * L * bulge * side, z: (from.z + to.z) / 2 + (dx / L) * L * bulge * side };
        const cx = (from.x + 2 * mid.x + to.x) / 4 - A.x, cz = (from.z + 2 * mid.z + to.z) / 4 - A.z;
        if (Math.hypot(cx, cz) <= A.r * 0.75) break;
      }
      let len = 0;
      const q0 = { x: from.x, z: from.z }, q1 = { x: 0, z: 0 };
      for (let s = 1; s <= 10; s++) { quad(from, mid, to, s / 10, q1); len += Math.hypot(q1.x - q0.x, q1.z - q0.z); q0.x = q1.x; q0.z = q1.z; }
      const T = Math.max(0.8, len / speed);
      legs.push({ A: from, M: mid, B: to, t0, T });
      t0 += T;
      from = to;
    }
    this.legs = legs;
    this.swarmTotal = t0;
  }

  /** Schwarmmitte (Boden) zur Zeit t. */
  swarmAt(t, out = { x: 0, z: 0 }) {
    const legs = this.legs;
    if (!legs?.length) { out.x = this.pos.x; out.z = this.pos.z; return out; }
    let L = legs[legs.length - 1];
    for (const l of legs) if (t < l.t0 + l.T) { L = l; break; }
    return quad(L.A, L.M, L.B, clamp((t - L.t0) / L.T, 0, 1), out);
  }

  startSwarm() {
    this.hidden = true;
    this.touch = false;
    this.swarms++;
    this.swarmT = 0;
    this.buildPath();
    const n = Math.min(MAX_BATS, this.val('swarm', [8, 8, 12]));
    this.swarmN = n;
    this.spread = this.val('swarmSpread', [1.3, 1.3, 1.7]);
    for (let i = 0; i < n; i++) {
      const m = new Flatterfledi(this.level, { pos: [this.pos.x, this.pos.y + 1, this.pos.z], scale: 1, drop: 'coin' }, this, i, 'graf_fledermaus');
      m.wake = 0;
      this.level.entities.push(m);
      if (m.shadow > 0 && this.level.view) this.level.view.shadows.add({ pos: m.pos, radius: m.shadow, alive: () => !m.removed, visible: () => m.alive && !m.defeated });
      this.bats.push(m);
      this.placeMember(m);
    }
    this.setState('swarm');
    this.level.sfx('panic');
    this.level.effects?.dust({ x: this.pos.x, y: this.pos.y + 1.2, z: this.pos.z }, 10, 1.6);
    if (!this.swarmHinted) {
      this.swarmHinted = true;
      this.level.archetype?.hud?.banner?.('Ein Fledermaus-Schwarm – ausweichen!', { hold: 1.8, size: 13, y: 0.36, color: '#d8b0ff' });
    }
  }

  swarmStep(dt) {
    this.swarmT += dt;
    const c = this.swarmAt(this.swarmT, this._sc ?? (this._sc = { x: 0, z: 0 }));
    const ox = this.pos.x, oz = this.pos.z;
    this.pos.set(c.x, this.arena.y, c.z);
    if (Math.abs(c.x - ox) + Math.abs(c.z - oz) > 1e-6) this.yaw = Math.atan2(-(c.z - oz), c.x - ox);
    if (this.swarmT >= this.swarmTotal) this.startLand();
  }

  startLand() {
    this.setState('land');
    this.hidden = false;
    this.vel.set(0, 0, 0);
    for (const m of this.bats) { m.touch = false; m.gatherFrom = m.pos.clone(); }
    this.level.sfx('slam');
    this.level.effects?.dust(this.pos, 10, 1.4);
    this.level.effects?.ring(this.pos, 1.8);
  }

  /** Schwarm-Glieder: Formation um die Schwarmmitte (swarm) bzw. Rückflug in den Grafen (land). */
  sync() {}

  placeMember(m) {
    const i = m.index, n = this.swarmN || 1;
    if (this.state === 'land') {
      const k = clamp(this.stateT / GATHER, 0, 1), f = m.gatherFrom ?? m.pos;
      const tx = this.pos.x, ty = this.pos.y + 1.3, tz = this.pos.z;
      m.pos.set(f.x + (tx - f.x) * k, f.y + (ty - f.y) * k, f.z + (tz - f.z) * k);
      m.batVis = 1 - k;
      return;
    }
    const t = this.swarmT;
    const a = (i / n) * TAU + t * 2.1;
    const r = this.spread * (0.55 + 0.45 * ((i * 0.618) % 1));
    const y = this.arena.y + (this.spec.swarmY ?? 0.95) + Math.sin(t * 2.6 + i * 1.9) * 0.28 + ((i % 3) - 1) * 0.16 - m.half.y;
    m.pos.set(this.pos.x + Math.cos(a) * r, y, this.pos.z - Math.sin(a) * r);
    m.yaw = a + Math.PI / 2 + Math.sin(t * 3 + i) * 0.3;
  }

  memberGone(m) {
    this.batsDown++;
  }

  // ------------------------------------------------------------------ Sieg

  /** Konfetti aus Süßigkeiten (läuft über die Simulationszeit, 1,8 s; danach weg). */
  burstConfetti() {
    this.confettiT0 = this.level.time;
    if (!this.level.view) return;
    this.dropConfetti();
    const m = getModel('bonbon_konfetti', { count: 36, radius: 3.2 });
    m.root.position.set(this.pos.x, this.pos.y + 1.8, this.pos.z);
    this.confetti = m;
    this.level.view.add(m.root);
  }

  dropConfetti() {
    if (!this.confetti) return;
    this.level.view?.remove(this.confetti.root);
    this.confetti.dispose?.();
    this.confetti = null;
  }

  vanish() {
    this.setState('gone');
    this.visible = false;
    this.touch = false;
    this.markers.clear();
    if (this.model) this.model.root.visible = false;
    this.level.effects?.dust(this.pos, 12, 1.8);
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 1.2, z: this.pos.z }, 16);
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

  // ------------------------------------------------------------------ Ansagen

  syncArch() {
    const arch = this.level.archetype;
    if (!arch || arch.boss !== this) return;
    const ph = this.phase;
    if (arch.seenPhase !== ph && this.state !== 'hit' && this.hp > 0) {
      arch.seenPhase = ph;
      if (ph === 2) arch.hud?.banner?.('Jetzt fliegen mehr Bomben!', { hold: 1.4, size: 14, color: '#ffb040' });
      if (ph === 3) arch.hud?.banner?.(this.val('ring', [0, 0, 4]) > 0 ? 'Vorsicht – Rundumwurf!' : 'Er wird schneller!', { hold: 1.6, size: 14, color: '#ff7a3a' });
    }
  }

  // ------------------------------------------------------------------ Berührung

  onHit(kind) {
    if (!this.visible || this.hidden || this.hp <= 0) return;
    if (kind !== 'pound' && kind !== 'bump' && kind !== 'bomb') { this.level.effects?.sparks(this.center(), 3); this.level.sfx('blockhit'); }
  }

  onPlayer(player, contact) {
    if (!this.visible || this.hidden || this.hp <= 0) return 'none';
    if (this.grace > 0 && player.vel.y > 0) return 'none';
    if (this.state === 'wait' || this.state === 'gone') return 'none';
    if (contact.fromAbove || contact.pound) {
      // Kopfsprung: Abprall ohne Schaden (nur zurückgeworfene Bomben treffen)
      this.bounces++;
      this.grace = 0.3;
      this.level.sfx('bounce');
      return 'stomp';
    }
    return VULNERABLE.has(this.state) || this.state === 'intro' ? 'hurt' : 'none';
  }

  // ------------------------------------------------------------------ Darstellung

  modelState() {
    const s = this.state, hp = Math.max(0, this.hp);
    if (s === 'walk') return { anim: this.walkSpeed > 0.2 ? 'walk' : 'idle', hp, speed: this.walkSpeed };
    if (s === 'throw') return { anim: 'throw', hp, progress: Math.min(1, this.stateT / THROW) };
    if (s === 'hit') return { anim: 'hit', hp, progress: Math.min(1, this.stateT / HIT) };
    if (s === 'stunned') return { anim: 'stunned', hp };
    if (s === 'bats') return { anim: 'bats', hp, progress: Math.min(1, this.stateT / BATS) };
    if (s === 'swarm') return { anim: 'bats', hp, progress: 1 };
    if (s === 'land') return { anim: 'bats', hp, progress: Math.max(0, 1 - this.stateT / LAND) };
    if (s === 'defeated' || s === 'gone') return { anim: 'defeated', hp: 0, progress: Math.min(1, this.stateT / DEF_ANIM) };
    return { anim: 'idle', hp };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    const r = this.model.root;
    r.visible = this.visible;
    if (this.state === 'hit') { const t = this.level.time; r.position.x += Math.sin(t * 61) * 0.06; r.position.z += Math.cos(t * 53) * 0.06; }
  }

  render(dt, t) {
    super.render(dt, t);
    this.markers.render(dt);
    this.flock.render(dt, this.bats, { anim: 'fly', speed: 4 });
    this.confetti?.update(dt, { anim: 'burst', progress: Math.min(1, (this.level.time - this.confettiT0) / 1.8) });
    if (this.leader) {
      const on = this.state === 'swarm' || (this.state === 'land' && this.stateT < GATHER);
      this.leader.root.visible = on;
      if (on) {
        this.leader.root.position.set(this.pos.x, this.arena.y + (this.spec.swarmY ?? 0.95) + 1.35 + Math.sin(this.level.time * 3) * 0.12, this.pos.z);
        this.leader.root.rotation.y = this.yaw;
        this.leader.update(dt, { anim: 'fly', spread: 0.3 });
      }
    }
  }

  /** Bahn des aktuellen Schwarms (für Tests/Level-Bau): Bögen mit Start, Kontrollpunkt, Ziel, Dauer. */
  swarmPath() {
    return (this.legs ?? []).map((l) => ({ from: [+l.A.x.toFixed(2), +l.A.z.toFixed(2)], to: [+l.B.x.toFixed(2), +l.B.z.toFixed(2)], T: +l.T.toFixed(2) }));
  }

  info() {
    return {
      state: this.state, hp: this.hp, maxHp: this.maxHp, phase: this.phase, throws: this.throws, bombsThrown: this.bombsThrown,
      bombs: this.bombs, hits: this.hits, misses: this.misses, bounces: this.bounces, swarms: this.swarms, batsDown: this.batsDown,
      bats: this.bats.filter((m) => !m.defeated).length, hidden: this.hidden, vulnerable: this.vulnerable,
      x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2),
    };
  }

  dispose() {
    this.markers.clear();
    this.flock.dispose();
    if (this.leader) { this.level.view?.remove(this.leader.root); this.leader.dispose?.(); this.leader = null; }
    this.dropConfetti();
    super.dispose();
  }
}

export const KINDS = {
  graf_brummbaer: (level, spec) => new GrafBrummbaer(level, spec),
  kuerbis_bombe: (level, spec) => new KuerbisBombe(level, spec),
};
