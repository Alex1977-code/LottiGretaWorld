// Lavafelsen-König – Endgegner Welt 4 (4-Burg „Lava Rock Lair“-Vorbild; eigene Figur: riesiger Basalt-Fels-König mit
// Lavahaube, Krone und Umhang). Bauplan: „rollt auf die Figur zu, ruft endlos Lavabrocken. Schaden nur durch geworfene
// Lavabrocken, 3 Treffer; nach jedem Treffer wirbelt er und verstreut Feuerbrocken.“
//
// Ablauf (Phase = maxHp − hp + 1):
//   wait → begin(): intro (2,2 s, Brüllen, Beben) → Runde:
//     summon  (1,4 s) reißt die Fäuste hoch; bei 0,6 s springen Lavabrocken aus dem Boden um ihn (2 / 2 / 3, höchstens
//             3 / 3 / 4 gleichzeitig – „endlos“: jede Runde wird aufgefüllt). Sie landen und laufen auf die Figur zu.
//     roll    (2,6 / 2,8 / 3,0 s) rollt als Felskugel auf die nächste Figur zu (5 / 6 / 7 m/s, lenkt höchstens
//             1,6 rad/s – seitlich ausweichen!), prallt an der Arenagrenze und an Wänden ab; Berührung verletzt.
//     rest    (1,8 / 1,5 / 1,2 s) steht keuchend – gute Gelegenheit zum Werfen.
//   **Treffer nur durch einen geworfenen Lavabrocken** (onHit('throw', brocken); in summon/roll/rest): hit (0,6 s) →
//   spin (2,0 s, wirbelt mit ausgestreckten Fäusten und verstreut Feuerbrocken 6 / 8 / 10 im Kreis, die landen, brennen
//   2,6 s und verlöschen; Berührung verletzt) → nächste Runde. Alles andere (Draufspringen, Feuer, Kanonenkugel, Bombe,
//   Stern, Riese) zählt nicht; von oben: Abprall ohne Schaden. 3 Treffer → defeated (2,6 s, Glut erlischt, Krone fällt)
//   → gone: alle gerufenen Lavabrocken und Feuerbrocken zerfallen, star erscheint; der Boss-Archetyp öffnet die Warp-Box.
// Ansagen über arch.hud.banner (Phase 2: „Er rollt schneller!“, Phase 3: „Jetzt wird es heiß!“, Hinweis beim ersten
// Ruf: „Wirf Lavabrocken auf ihn!“). Kein `enemy` (Stern/Riese wirken nicht).
// Boss-Archetyp-Schnittstelle wie wirbelbrocken.js: begin(), reset(), state, stateT, hp, maxHp, phase, visible, home,
// half, carHits (0), info(); level.onBossHit(boss, 'brocken'), level.onBossDefeated(boss). Ohne Archetyp beginnt der
// Kampf ab wakeR m, drop nach 'gone'.
//
// Daten: { kind: 'lavafelsen_koenig', id: 'koenig', pos (Start, Fußpunkt), arena?: { center, r: 10 }, hp?: 3,
//          roll?: [5, 6, 7], rollTime?: [2.6, 2.8, 3.0], rest?: [1.8, 1.5, 1.2], summon?: [2, 2, 3], max?: [3, 3, 4],
//          sparks?: [6, 8, 10], spin?: 2.0, burn?: 2.6, star?: { pos, index } | [x, y, z], wakeR?: 9, drop? }
// Laufzeit: brocken (lebende gerufene), summoned, feuer (Feuerbrocken gesamt), hitLog, info().
//
// feuerbrocken – brennender Brocken (vom König verstreut, auch einzeln): fliegt im Bogen, landet, brennt burn s und
//   verlischt (in Wasser/Lava sofort). Berührung verletzt (die letzten 0,3 s nicht mehr). Kein Gegner.
//   Daten: { kind: 'feuerbrocken', pos, vel: [vx, vy, vz], burn?: 2.6, owner? }
//   Darstellung: eine Instanz-Gruppe je Level (2 Zeichenaufrufe für alle Feuerbrocken).

import * as THREE from 'three';
import { EnemyW2, figures, activeFigure, clamp } from '../EnemyW2.js';
import { CourseEntity } from '../CourseEntity.js';
import { spawnLoot } from '../Enemy.js';
import { getModel } from '../../models/index.js';
import { colorize, merge, lin, mixc, smooth } from '../../../three/world/geometry.js';

const TAU = Math.PI * 2;
const INTRO = 2.2, SUMMON = 1.4, SUMMON_AT = 0.6, HIT = 0.6, SPIN = 2.0, DEFEAT = 2.6;
const R = 1.15, CY = 1.3, ROLL_Y = 1.12;
const TURN = 1.6;
const pick = (v, ph, def) => (Array.isArray(v) ? v[Math.min(v.length - 1, ph - 1)] : v ?? def[ph - 1]);

class LavafelsenKoenig extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'lavafelsen_koenig');
    this.enemy = false;
    this.boss = true;
    this.wake = 0;
    this.edges = false;
    this.half.set(R - 0.05, CY - 0.05, R - 0.05);
    this.shadow = 1.25;
    this.home = this.pos.clone();
    const a = spec.arena ?? {};
    const c = a.center ?? [this.home.x, this.home.y, this.home.z];
    this.arena = { x: c[0], y: c[1], z: c[2], r: a.r ?? 10 };
    this.maxHp = spec.hp ?? 3;
    this.hp = this.maxHp;
    this.carHits = 0;
    this.hits = 0;
    this.hitLog = [];
    this.visible = true;
    this.wakeR = spec.wakeR ?? 9;
    this.state = 'wait';
    this.yaw = -Math.PI / 2;
    this.heading = { x: 0, z: 1 };
    this.rollA = 0;
    this.brocken = [];
    this.summoned = 0;
    this.summons = 0;
    this.feuer = 0;
    this.spawnedThisSummon = false;
    this.sparksDone = 0;
    this.hinted = false;
    this.dropped = false;
    this.starDone = false;
    this.rounds = 0;
    if (level.view) this.setModel(getModel('lavafelsen_koenig'));
    this.initShadows(3);
  }

  get phase() { return clamp(this.maxHp - this.hp + 1, 1, 3); }
  /** Lava schadet dem Lavafelsen-König nicht (die Arenagrenze hält ihn ohnehin auf der Insel). */
  checkLava() { return false; }
  get managed() { return !!this.level.archetype && this.level.data?.boss && (this.level.data.boss.id ?? 'baron') === this.spec.id; }
  val(key, def) { return pick(this.spec[key], this.phase, def); }

  setState(s) { this.state = s; this.stateT = 0; }

  // ------------------------------------------------------------------ Archetyp-Schnittstelle

  begin() {
    if (this.state !== 'wait') return;
    this.setState('intro');
    this.facePlayerNow();
    this.level.shake(0.4);
    this.level.sfx('slam');
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 2.4, z: this.pos.z }, 16);
  }

  reset() {
    this.clearMinions();
    this.hp = this.maxHp;
    this.defeated = false;
    this.hits = 0;
    this.hitLog = [];
    this.visible = true;
    this.touch = true;
    this.fellOut = false;
    this.hinted = false;
    this.rounds = 0;
    this.pos.copy(this.home);
    this.vel.set(0, 0, 0);
    this.half.y = CY - 0.05;
    this.yaw = -Math.PI / 2;
    if (this.model) this.model.root.visible = true;
    this.setState('wait');
  }

  /** Gerufene Lavabrocken und Feuerbrocken entfernen. */
  clearMinions(fx = false) {
    for (const e of this.level.entities) {
      if (e.removed) continue;
      if (e.kind === 'feuerbrocken' && e.owner === this) e.kill();
      if (e.kind === 'lavabrocken' && e.owner === this) {
        if (e.carrier) { const p = e.carrier; e.carrier = null; if (p.holding === e) p.holding = null; }
        if (fx) e.burst?.(); else e.kill();
      }
    }
    this.brocken.length = 0;
  }

  // ------------------------------------------------------------------ Schritt

  update(dt) {
    this.stateT += dt;
    this.brocken = this.brocken.filter((b) => !b.removed && !b.defeated);
    this.syncArch();
    switch (this.state) {
      case 'wait':
        this.stand(dt);
        if (!this.managed) {
          for (const p of figures(this.level)) if (activeFigure(p) && Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < this.wakeR) { this.begin(); break; }
        }
        return;
      case 'intro':
        this.stand(dt);
        this.facePlayer(dt, 4);
        if (this.stateT > 0.6 && this.stateT - dt <= 0.6) { this.level.shake(0.5); this.level.sfx('boss_spin'); }
        if (this.stateT >= INTRO) this.startSummon();
        return;
      case 'summon':
        this.stand(dt);
        this.facePlayer(dt, 5);
        if (!this.spawnedThisSummon && this.stateT >= SUMMON_AT) { this.spawnedThisSummon = true; this.summon(); }
        if (this.stateT >= SUMMON) this.startRoll();
        return;
      case 'roll':
        this.rollStep(dt);
        if (this.stateT >= this.val('rollTime', [2.6, 2.8, 3.0])) { this.half.y = CY - 0.05; this.setState('rest'); this.level.effects?.dust(this.pos, 8, 1.6); }
        return;
      case 'rest':
        this.stand(dt);
        this.facePlayer(dt, 3);
        if (this.stateT >= this.val('rest', [1.8, 1.5, 1.2])) this.startSummon();
        return;
      case 'hit':
        this.stand(dt);
        if (this.stateT >= HIT) { this.setState('spin'); this.sparksDone = 0; this.level.sfx('boss_spin'); }
        return;
      case 'spin': {
        this.stand(dt);
        this.yaw += dt * TAU * 2;
        this.spinHurt();
        const n = this.val('sparks', [6, 8, 10]);
        if (this.sparksDone === 0 && this.stateT >= 0.3) { this.scatter(Math.ceil(n / 2), 0); this.sparksDone = 1; }
        if (this.sparksDone === 1 && this.stateT >= 1.1) { this.scatter(Math.floor(n / 2), 0.5); this.sparksDone = 2; }
        if (this.stateT >= (this.spec.spin ?? SPIN)) {
          if (this.hp <= 0) { this.setState('defeated'); this.level.sfx('powerdown'); }
          else this.startSummon();
        }
        return;
      }
      case 'defeated':
        this.stand(dt);
        if (this.stateT >= DEFEAT) this.vanish();
        return;
      default: break;
    }
  }

  /** Eigene Phasen-Ansagen (statt der Standardtexte des Boss-Archetyps). */
  syncArch() {
    const arch = this.level.archetype;
    if (!arch || arch.boss !== this) return;
    const ph = this.phase;
    if (arch.seenPhase !== ph && this.state !== 'hit' && this.hp > 0) {
      arch.seenPhase = ph;
      if (ph === 2) arch.hud?.banner?.('Er rollt schneller!', { hold: 1.4, size: 14, color: '#ffb040' });
      if (ph === 3) arch.hud?.banner?.('Jetzt wird es heiß!', { hold: 1.6, size: 14, color: '#ff7a3a' });
    }
  }

  startSummon() {
    this.rounds++;
    this.setState('summon');
    this.spawnedThisSummon = false;
    this.level.sfx('boss_spin');
    if (!this.hinted) {
      this.hinted = true;
      this.level.archetype?.hud?.banner?.('Wirf Lavabrocken auf ihn!', { hold: 2.0, size: 13, y: 0.36 });
    }
  }

  /** Lavabrocken springen aus dem Boden um den König (auffüllen bis max). */
  summon() {
    const want = this.val('summon', [2, 2, 3]), max = this.val('max', [3, 3, 4]);
    const n = Math.max(0, Math.min(want, max - this.brocken.length));
    const p = this.player;
    // Richtung zur Figur; die Brocken landen seitlich davon (nicht direkt auf ihr)
    let ax = 0, az = 1;
    if (p) { ax = p.pos.x - this.pos.x; az = p.pos.z - this.pos.z; const l = Math.hypot(ax, az) || 1; ax /= l; az /= l; }
    const base = Math.atan2(az, ax);
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * 1.1 + (n === 1 ? 0.6 : 0) + (this.summons % 2 ? 0.35 : -0.35);
      const dx = Math.cos(a), dz = Math.sin(a);
      let x = this.pos.x + dx * (R + 0.7), z = this.pos.z + dz * (R + 0.7);
      const A = this.arena, ex = x - A.x, ez = z - A.z, ed = Math.hypot(ex, ez);
      if (ed > A.r - 1.2) { x = A.x + (ex / ed) * (A.r - 1.2); z = A.z + (ez / ed) * (A.r - 1.2); }
      const e = this.level.spawn('lavabrocken', { pos: [x, this.pos.y + 0.6, z], vel: [dx * 2.6, 8, dz * 2.6], owner: this, behavior: 'chase', sight: 14, wake: 40 });
      if (e) { this.brocken.push(e); this.summoned++; }
    }
    this.summons++;
    this.level.shake(0.25);
    this.level.sfx('slam');
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 2.6, z: this.pos.z }, 14);
  }

  startRoll() {
    this.setState('roll');
    this.half.y = ROLL_Y - 0.02;
    const p = this.player;
    let dx = 0, dz = 1;
    if (p) { dx = p.pos.x - this.pos.x; dz = p.pos.z - this.pos.z; }
    const l = Math.hypot(dx, dz) || 1;
    this.heading.x = dx / l; this.heading.z = dz / l;
    this.level.sfx('boss_spin');
  }

  rollStep(dt) {
    const sp = this.val('roll', [5, 6, 7]);
    const p = this.player;
    if (activeFigure(p)) {
      // lenkt begrenzt zur Figur
      const want = Math.atan2(p.pos.z - this.pos.z, p.pos.x - this.pos.x), cur = Math.atan2(this.heading.z, this.heading.x);
      let d = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
      d = clamp(d, -TURN * dt, TURN * dt);
      this.heading.x = Math.cos(cur + d); this.heading.z = Math.sin(cur + d);
    }
    this.vel.x = this.heading.x * sp; this.vel.z = this.heading.z * sp;
    const res = this.moveWithGravity(dt, { step: 0.3 });
    let bounced = false;
    if (res.hitWall && res.wallNormal) {
      const n = res.wallNormal, d = this.heading.x * n.x + this.heading.z * n.z;
      if (d < 0) { this.heading.x -= 2 * d * n.x; this.heading.z -= 2 * d * n.z; bounced = true; }
    }
    const A = this.arena;
    const dx = this.pos.x - A.x, dz = this.pos.z - A.z, dd = Math.hypot(dx, dz);
    if (dd > A.r - R) {
      const nx = dx / dd, nz = dz / dd, dot = this.heading.x * nx + this.heading.z * nz;
      if (dot > 0) { this.heading.x -= 2 * dot * nx; this.heading.z -= 2 * dot * nz; bounced = true; }
      this.pos.x = A.x + nx * (A.r - R); this.pos.z = A.z + nz * (A.r - R);
    }
    if (bounced) {
      const l = Math.hypot(this.heading.x, this.heading.z) || 1;
      this.heading.x /= l; this.heading.z /= l;
      this.level.sfx('blockhit');
      this.level.shake(0.15);
      this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 0.6, z: this.pos.z }, 6);
    }
    this.rollA += sp * dt / ROLL_Y;
    this.yaw = Math.atan2(-this.heading.z, this.heading.x);
  }

  /** Feuerbrocken im Kreis verstreuen. */
  scatter(n, off) {
    const burn = this.spec.burn ?? 2.6;
    for (let i = 0; i < n; i++) {
      const a = ((i + off) / n) * TAU + this.hits * 0.4;
      const sp = 3.2 + (i % 3) * 1.1;
      const dx = Math.cos(a), dz = Math.sin(a);
      this.level.spawn('feuerbrocken', { pos: [this.pos.x + dx * (R + 0.2), this.pos.y + 1.6, this.pos.z + dz * (R + 0.2)], vel: [dx * sp, 7.5, dz * sp], burn, owner: this });
      this.feuer++;
    }
    this.level.sfx('fireball');
  }

  /** Wirbelnde Fäuste: Figuren im Umkreis treffen. */
  spinHurt() {
    for (const p of figures(this.level)) {
      if (!activeFigure(p)) continue;
      const d = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
      if (d > R + 0.55 + p.half.x) continue;
      if (p.pos.y > this.pos.y + 2.4 || p.pos.y + p.half.y * 2 < this.pos.y + 0.2) continue;
      p.hurt(this);
    }
  }

  facePlayerNow() {
    const p = this.player;
    if (p) this.yaw = Math.atan2(-(p.pos.z - this.pos.z), p.pos.x - this.pos.x);
  }

  // ------------------------------------------------------------------ Treffer

  get vulnerable() { return this.hp > 0 && (this.state === 'summon' || this.state === 'roll' || this.state === 'rest'); }

  takeHit(where) {
    if (this.hp <= 0) return;
    this.hp--;
    this.hits++;
    this.hitLog.push({ where, t: +this.level.time.toFixed(2), hp: this.hp, state: this.state });
    this.setState('hit');
    this.vel.set(0, 0, 0);
    this.half.y = CY - 0.05;
    this.level.sfx('boss_hit');
    this.level.shake(0.5);
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 2, z: this.pos.z }, 18);
    this.level.onBossHit?.(this, where);
    if (this.hp <= 0) {
      this.defeated = true;
      this.level.onBossDefeated?.(this);
    }
  }

  onHit(kind, source) {
    if (kind === 'throw' && source?.kind === 'lavabrocken') {
      if (this.vulnerable) this.takeHit('brocken');
      else { this.level.effects?.sparks(this.center(), 6); this.level.sfx('blockhit'); }
      return;
    }
    // alles andere prallt ab (Feuer, Kanonenkugel, Bombe, Stern, Riese …)
    if (kind !== 'pound') { this.level.effects?.sparks(this.center(), 3); }
  }

  onPlayer(player, contact) {
    if (!this.visible || this.hp <= 0 && this.state !== 'spin') return 'none';
    switch (this.state) {
      case 'wait': case 'hit': case 'defeated': case 'gone': return 'none';
      case 'spin': return 'hurt';
      default:
        if (contact.fromAbove || contact.pound) { this.level.sfx('bounce'); return 'stomp'; }
        return 'hurt';
    }
  }

  vanish() {
    this.setState('gone');
    this.visible = false;
    this.touch = false;
    if (this.model) this.model.root.visible = false;
    this.clearMinions(true);
    this.level.effects?.dust(this.pos, 14, 2);
    this.level.effects?.debris({ x: this.pos.x, y: this.pos.y + 1, z: this.pos.z }, 0x3a2a26, 16);
    this.level.sfx('brickbreak');
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
    if (s === 'roll') return { anim: 'roll', hp, speed: this.val('roll', [5, 6, 7]), roll: this.rollA };
    if (s === 'summon' || s === 'intro') return { anim: 'summon', hp };
    if (s === 'hit') return { anim: 'hit', hp, progress: Math.min(1, this.stateT / HIT) };
    if (s === 'spin') return { anim: 'spin', hp };
    if (s === 'defeated' || s === 'gone') return { anim: 'defeated', hp };
    return { anim: 'idle', hp };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    this.model.root.visible = this.visible;
  }

  info() {
    return {
      state: this.state, hp: this.hp, maxHp: this.maxHp, phase: this.phase, hits: this.hits, rounds: this.rounds, summons: this.summons,
      brocken: this.brocken.length, summoned: this.summoned, feuer: this.feuer, vulnerable: this.vulnerable,
      x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2),
    };
  }
}

// =====================================================================================================================
// Feuerbrocken (Instanz-Gruppe je Level)
// =====================================================================================================================

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();
let GEO = null;
function feuerGeo() {
  if (GEO) return GEO;
  const parts = [];
  const rock = lin(0x5a2a1e), hot = lin(0xff6a1a), core = lin(0xfff07a), mid = lin(0xffa21a);
  const g0 = new THREE.IcosahedronGeometry(0.24, 1);
  parts.push(colorize(g0, (p, n, o) => mixc(rock, hot, smooth(-0.1, 0.25, p.y + Math.sin(p.x * 30) * 0.05), o)));
  for (const [x, z, r, h] of [[0, 0, 0.16, 0.5], [0.1, 0.06, 0.1, 0.34], [-0.09, -0.05, 0.11, 0.36]]) {
    const g = new THREE.ConeGeometry(r, h, 7, 2);
    g.translate(x, 0.12 + h / 2, z);
    parts.push(colorize(g, (p, n, o) => { const k = (p.y - 0.12) / h; return mixc(k < 0.5 ? hot : mid, k < 0.5 ? mid : core, smooth(0, 1, (k % 0.5) * 2), o); }));
  }
  GEO = merge(parts);
  return GEO;
}
const POOLS = new WeakMap();
/** Gemeinsame Instanz-Gruppe aller Feuerbrocken eines Levels (1 Zeichenaufruf). */
function feuerPool(level) {
  if (!level.view) return null;
  let pool = POOLS.get(level);
  if (pool) return pool;
  const n = 48;
  const mesh = new THREE.InstancedMesh(feuerGeo(), new THREE.MeshBasicMaterial({ vertexColors: true }), n);
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < n; i++) mesh.setMatrixAt(i, ZERO);
  mesh.count = n;
  mesh.castShadow = false;
  const free = [];
  for (let i = n - 1; i >= 0; i--) free.push(i);
  pool = { mesh, free, used: new Set() };
  level.view.add(mesh, () => { mesh.instanceMatrix.needsUpdate = true; mesh.visible = pool.used.size > 0; });
  POOLS.set(level, pool);
  return pool;
}

class Feuerbrocken extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'feuerbrocken');
    this.half.set(0.28, 0.28, 0.28);
    this.shadow = 0.25;
    this.owner = spec.owner ?? null;
    this.burnTime = spec.burn ?? 2.6;
    if (Array.isArray(spec.vel)) this.vel.set(spec.vel[0], spec.vel[1], spec.vel[2]);
    this.state = 'fly';
    this.stateT = 0;
    this.age = 0;
    this.seed = (level.time * 7.31) % 1;
    this._ign = (s) => (this.owner && s.owner === this.owner) || s.oneWay === true && this.vel.y > 0;
    this.pool = feuerPool(level);
    this.slot = this.pool ? this.pool.free.pop() ?? null : null;
    if (this.slot !== null && this.slot !== undefined) this.pool.used.add(this.slot);
  }

  update(dt) {
    this.stateT += dt;
    this.age += dt;
    if (this.state === 'fly') {
      this.vel.y = Math.max(this.vel.y - 26 * dt, -20);
      const c = this.center();
      const res = this.level.world.moveAABB(c, this.half, { x: this.vel.x * dt, y: this.vel.y * dt, z: this.vel.z * dt }, { step: 0.1, ignore: this._ign });
      this.pos.set(c.x, c.y - this.half.y, c.z);
      if (res.hitWall) { this.vel.x *= -0.3; this.vel.z *= -0.3; }
      for (const s of this.level.world.overlapAABB(c, this.half)) {
        if (s.water || s.kill) { this.level.effects?.sparks(this.center(), 4); this.kill(); return; }
      }
      if (res.grounded) { this.state = 'burn'; this.stateT = 0; this.vel.set(0, 0, 0); this.level.effects?.dust(this.pos, 2, 0.6); }
      if (this.pos.y < this.level.killY || this.age > 6) this.kill();
      return;
    }
    if (this.stateT >= this.burnTime) this.kill();
  }

  get harmless() { return this.state === 'burn' && this.stateT > this.burnTime - 0.3; }

  onPlayer() { return this.harmless ? 'none' : 'hurt'; }

  render(dt, t) {
    if (!this.pool || this.slot === null || this.slot === undefined) return;
    let k = 1, fl = 1 + Math.sin(t * 21 + this.seed * 40) * 0.12;
    if (this.state === 'burn') k = Math.max(0.02, Math.min(1, (this.burnTime - this.stateT) / 0.45)) * 1.15;
    _p.set(this.pos.x, this.pos.y + 0.2, this.pos.z);
    _q.setFromEuler(_e.set(this.state === 'fly' ? t * 7 : 0, this.seed * 6.28 + t * 0.9, 0));
    _s.set(k, k * fl, k);
    this.pool.mesh.setMatrixAt(this.slot, _m.compose(_p, _q, _s));
  }

  dispose() {
    if (this.pool && this.slot !== null && this.slot !== undefined) {
      this.pool.mesh.setMatrixAt(this.slot, ZERO);
      this.pool.used.delete(this.slot);
      this.pool.free.push(this.slot);
      this.slot = null;
    }
    super.dispose();
  }

  info() { return { state: this.state, x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2) }; }
}

export const KINDS = {
  lavafelsen_koenig: (level, spec) => new LavafelsenKoenig(level, spec),
  feuerbrocken: (level, spec) => new Feuerbrocken(level, spec),
};
