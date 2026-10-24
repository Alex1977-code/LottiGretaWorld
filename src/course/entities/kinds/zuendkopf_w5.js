// Zündkopf und lila Ziegel – Welt 5 (5-5 „Höhle mit Zündköpfen, POW-Blöcken, lila Ziegelwand“). Eigene Figur.
//
// zuendkopf – zwiebelrunder Keramik-Zünder mit Zündschnur. Läuft (Patrouille bzw. auf die Figur zu); kommt eine Figur
//   näher als trigger m oder wird er berührt/getroffen/draufgesprungen, **glimmt die Zündschnur** (lit): er rennt der
//   Figur nach (2,4 m/s), blinkt in der letzten Sekunde und **explodiert nach fuse s** (Standard 3). Explosion (Radius
//   radius, Standard 2 m): verletzt Figuren bis 0,9 × Radius, besiegt Gegner (onHit('bomb')), zündet andere Zündköpfe
//   und Kickbomben (Kettenreaktion), **zerstört lila Ziegel** (`lila_ziegel`, `lila_ziegelwand`) und alle Formen mit
//   `breakable`/`mega` (Ziegel, Kristall, graue Steinblöcke, Holzwände …); danach level.onExplosion(center, radius, src).
//   **Tragen/Werfen** (Trage-System des Motors): Aktion in Reichweite hebt ihn auf (zündet), Rennen gehalten + Berührung
//   ebenso; Aktion wirft ihn im Bogen – geworfen explodiert er **beim Aufprall an einer Wand, an einem Gegner oder an
//   einem Endgegner** (`onBombHit(src)` wird vorher gerufen), sonst rutscht er aus und brennt weiter; Ducken + Aktion
//   setzt ihn ab. Tatzenhieb schlägt ihn brennend weg (wie ein Wurf). Draufspringen zündet (Abprall), seitliche
//   Berührung zündet und schubst ihn weg (kein Schaden). Feuer, Panzer, Wurf, Stampfwelle zünden; Explosion daneben zündet
//   mit 0,12 s Lunte. Funkelstern/Riesentrank **entschärfen** ihn (fliegt weg, zählt als besiegt). Eine Explosion zählt
//   nicht als besiegter Gegner (wie die Kickbombe).
//   Daten: { kind: 'zuendkopf', pos, path?, loop?, dir?, speed?: 1.2, behavior?: 'walk' | 'chase' (Standard), sight?: 7,
//            trigger?: 2.2 (Nähe zündet; 0 = nie), fuse?: 3, radius?: 2, lit?: false, litSpeed?: 2.4,
//            vel?: [vx, vy, vz] (startet im Flug, z. B. aus einer Röhre), owner?, wake?, edges?, drop?,
//            spawner?: { every: 4, max: 2, first: 0.5, range: 30 } (Nachschub: ein unsichtbarer Spender erzeugt an pos
//            alle every s einen Zündkopf, solange weniger als max leben und eine Figur ≤ range m nah ist) }
//   Zustände: idle → walk → lit → (carried | thrown → slide) → explode; flipped (entschärft). Laufzeit: lit, fuse (s übrig),
//   exploded, thrownBy, info(). Spender: spawned, alive, start(), stop(), info().
//   Modell 'zuendkopf' (state { anim: walk|idle|lit|blink|explode|carried|thrown, speed, fuse 0..1, lit, progress }).
//
// lila_ziegel / lila_ziegelwand – lila Ziegelblock (1 m) bzw. Wand aus w × h × d Blöcken. Fest, begehbar. **Nur
//   Explosion (Zündkopf, Kickbombe), Tatzenhieb (Krallen-Anzug, Schwanzhieb), Riesentrank, Kanonenkugel und POW-Block**
//   zerbrechen ihn – Kopfstoß und Stampfattacke lassen ihn nur wackeln. Explosionen zerbrechen alle Blöcke im Radius,
//   der Tatzenhieb den getroffenen, der POW-Block alle in seinem Umkreis. Kollisionsformen mit `breakable: 'bomb'`.
//   Daten: { kind: 'lila_ziegel', pos (Mitte der Unterseite), content? (Beute je Block: 'coin', Power-up, 'star:I' …), id? }
//          { kind: 'lila_ziegelwand', pos (Mitte der Unterseite), size?: [4, 3, 1] (ganze Blöcke w × h × d),
//            content?, onBreak? (Aktion, wenn der letzte Block zerbricht, z. B. { reveal: 'warp' }), id? }
//   Laufzeit: count (Blöcke), left (heile), broken, breakAt(x, y, z, r) → Zahl, info(). Darstellung: eine gemeinsame
//   Instanz-Gruppe 'lila_ziegel' je Level (2 Zeichenaufrufe für alle lila Ziegel).
//
// Gemeinsame Hilfe für andere Module: explodeAt(level, center, radius, source, opts) – Explosion wie oben.

import * as THREE from 'three';
import { EnemyW2, figures, activeFigure, clamp } from '../EnemyW2.js';
import { CourseEntity } from '../CourseEntity.js';
import { spawnLoot } from '../Enemy.js';
import { runAction } from '../gimmick.js';
import { getModel } from '../../models/index.js';
import { createInstanced } from '../../models/lib/instanced.js';

const FUSE = 3, BLINK = 1.0, EXPLODE = 0.7, RADIUS = 2;

// =====================================================================================================================
// Explosion
// =====================================================================================================================

/** Abstand Punkt → Hüllquader einer Kollisionsform. */
function shapeDist(s, c) {
  if (s.type === 'cyl') {
    const r = Math.max(0, Math.hypot(c.x - s.x, c.z - s.z) - s.r);
    const dy = Math.max(s.bot - c.y, 0, c.y - s.top);
    return Math.hypot(r, dy);
  }
  const dx = Math.max(s.x0 - c.x, 0, c.x - s.x1), dy = Math.max(s.bot - c.y, 0, c.y - s.top), dz = Math.max(s.z0 - c.z, 0, c.z - s.z1);
  return Math.hypot(dx, dy, dz);
}

/** Kurzer Explosionsblitz (wachsende, verblassende Kugel). */
function flash(level, c, r) {
  const view = level.view;
  if (!view) return;
  const mat = new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending });
  const geo = new THREE.SphereGeometry(1, 16, 10);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(c.x, c.y, c.z);
  m.scale.setScalar(0.3);
  let t = 0;
  view.add(m, (dt) => {
    t += dt;
    const k = Math.min(1, t / 0.32);
    m.scale.setScalar(0.3 + r * 0.85 * Math.sqrt(k));
    mat.opacity = 0.75 * (1 - k);
    if (k >= 1) { view.remove(m); geo.dispose(); mat.dispose(); }
  });
}

/**
 * Explosion bei c (Radius R): Entitäten im Radius → onHit('bomb', source); Formen mit breakable/mega → owner.onHit('bomb',
 * source, form); Figuren bis hurtK × R → hurt(source); Effekte; level.onExplosion(c, R, source). source.blast = { x, y,
 * z, r } (für Wände aus vielen Blöcken). opts: { hurtK: 0.9, fx: true, exclude: Entität }. → { entities, shapes, hurt }.
 */
export function explodeAt(level, c, R, source, opts = {}) {
  const center = { x: c.x, y: c.y, z: c.z };
  if (source) source.blast = { x: center.x, y: center.y, z: center.z, r: R };
  const out = { entities: 0, shapes: 0, hurt: 0 };
  if (opts.fx !== false) {
    level.sfx('slam');
    level.sfx('brickbreak');
    level.shake(0.5);
    const fx = level.effects;
    fx?.ring({ x: center.x, y: center.y - 0.3, z: center.z }, R * 0.85);
    fx?.dust({ x: center.x, y: center.y - 0.35, z: center.z }, 10, 2);
    fx?.sparks(center, 24);
    fx?.debris(center, 0x2a3aa8, 6);
    flash(level, center, R);
  }
  const done = new Set([source, opts.exclude].filter(Boolean));
  for (const e of level.entities.slice()) {
    if (done.has(e) || !e.alive || e.removed) continue;
    if (e.distanceTo(center.x, center.y, center.z) > R) continue;
    done.add(e);
    e.onHit?.('bomb', source);
    out.entities++;
  }
  for (const s of level.world.overlapAABB(center, { x: R, y: R, z: R })) {
    const o = s.owner;
    if (!o || done.has(o) || !(s.breakable || s.mega)) continue;
    if (shapeDist(s, center) > R) continue;
    done.add(o);
    o.onHit?.('bomb', source, s);
    out.shapes++;
  }
  const hk = opts.hurtK ?? 0.9;
  for (const p of figures(level)) {
    if (!activeFigure(p)) continue;
    const pc = p.center();
    const dx = Math.max(0, Math.abs(pc.x - center.x) - p.half.x), dy = Math.max(0, Math.abs(pc.y - center.y) - p.half.y), dz = Math.max(0, Math.abs(pc.z - center.z) - p.half.z);
    if (Math.hypot(dx, dy, dz) < R * hk && p.hurt(source)) out.hurt++;
  }
  level.onExplosion?.(center, R, source);
  return out;
}

// =====================================================================================================================
// Zündkopf
// =====================================================================================================================

class Zuendkopf extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'zuendkopf');
    this.half.set(0.32, 0.38, 0.32);
    this.shadow = 0.4;
    this.carryable = true;
    this.holdStyle = 'over';
    this.speed = spec.speed ?? 1.2;
    this.litSpeed = spec.litSpeed ?? 2.4;
    this.behavior = spec.behavior ?? 'chase';
    this.sight = spec.sight ?? 7;
    this.trigger = spec.trigger ?? 2.2;
    this.fuseTotal = spec.fuse ?? FUSE;
    this.radius = spec.radius ?? RADIUS;
    this.owner = typeof spec.owner === 'string' ? level.named.get(spec.owner) ?? null : spec.owner ?? null;
    this.lit = false;
    this.fuse = 0;
    this.grace = 0;
    this.exploded = false;
    this.thrownBy = null;
    this.explosion = null;
    this.state = 'idle';
    if (spec.lit) this.light();
    if (Array.isArray(spec.vel)) {
      this.vel.set(spec.vel[0], spec.vel[1], spec.vel[2]);
      this.state = 'air';
      this.grounded = false;
    }
    if (level.view) this.setModel(getModel('zuendkopf'));
    this.initShadows(2);
  }

  /** Lunte anzünden (bzw. auf höchstens t s verkürzen). */
  light(t) {
    if (this.exploded || this.defeated) return;
    if (this.lit) { if (t !== undefined) this.fuse = Math.min(this.fuse, t); return; }
    this.lit = true;
    this.fuse = t ?? this.fuseTotal;
    if (this.state === 'walk' || this.state === 'idle') this.setState('lit');
    this.level.sfx('hover');
  }

  canCarry() { return !this.exploded && !this.defeated && ['idle', 'walk', 'lit', 'slide'].includes(this.state); }

  update(dt) {
    this.stateT += dt;
    if (this.grace > 0) this.grace -= dt;
    if (this.state === 'explode') { if (this.stateT >= EXPLODE) this.kill(); return; }
    if (this.updateDefeat(dt)) return;
    if (this.lit) {
      this.fuse -= dt;
      if (this.fuse <= 0) { this.explode(); return; }
    }
    switch (this.state) {
      case 'idle':
        this.stand(dt);
        if (!this.level.player || this.playerDist() < this.wake) this.setState(this.lit ? 'lit' : 'walk');
        break;
      case 'walk':
        if (this.behavior === 'chase' && this.canSee(this.sight, 2.5)) this.chase(dt, this.speed);
        else this.walk(dt, this.speed);
        if (this.trigger > 0 && this.canSee(this.trigger, 1.5)) this.light();
        break;
      case 'lit':
        if (this.canSee(this.sight * 1.5, 3)) this.chase(dt, this.litSpeed);
        else this.walk(dt, this.litSpeed * 0.7);
        break;
      case 'carried':
        if (!this.carrier) { this.setState('lit'); this.vel.set(0, 1, 0); break; }
        this.followCarrier();
        break;
      case 'air': {
        // aus einer Röhre/vom Spender: landet (unbrennend) und läuft los
        this.vel.x *= Math.exp(-0.5 * dt); this.vel.z *= Math.exp(-0.5 * dt);
        this.moveWithGravity(dt);
        if (this.grounded && this.stateT > 0.05) { this.level.effects?.dust(this.pos, 3, 0.7); this.setState(this.lit ? 'lit' : 'walk'); }
        break;
      }
      case 'thrown': this.fly(dt); break;
      case 'slide': {
        const f = Math.exp(-4 * dt);
        this.vel.x *= f; this.vel.z *= f;
        const hs = Math.hypot(this.vel.x, this.vel.z);
        const res = this.moveWithGravity(dt, { step: 0.25 });
        if (this.removed) return;
        if (this.thrownBy && hs > 3 && (res.hitWall || this.impact())) { this.explode(); return; }
        if (hs < 0.5) { this.thrownBy = null; this.setState('lit'); }
        break;
      }
      default: break;
    }
  }

  /** Geworfen: Bogen; Aufprall an Wand/Gegner/Endgegner → Explosion, Landung → ausrutschen. */
  fly(dt) {
    const hs = Math.hypot(this.vel.x, this.vel.z);
    const res = this.moveWithGravity(dt, { step: 0.1 });
    if (this.removed) return;
    if (res.hitWall && hs > 3) { this.explode(); return; }
    if (this.impact()) { this.explode(); return; }
    if (this.grounded && this.stateT > 0.05) {
      this.level.effects?.dust(this.pos, 3, 0.8);
      this.setState('slide');
      this.vel.x *= 0.6; this.vel.z *= 0.6;
    }
  }

  /** Berührt der geworfene Zündkopf einen Gegner, Endgegner oder ein onBombHit-Ziel? (onBombHit wird gerufen) */
  impact() {
    for (const e of this.level.entities) {
      if (e === this || !e.alive || e.removed || e.defeated || e.touch === false || e.carrier) continue;
      if (e === this.owner && !this.thrownBy) continue;
      if (!e.onBombHit && !e.enemy && !e.boss) continue;
      if (e.kind === 'zuendkopf' || e.kind === 'kickbombe') continue;
      if (!this.overlaps(e, 0.05)) continue;
      e.onBombHit?.(this);
      return true;
    }
    return false;
  }

  /** Wegschlagen (Tatzenhieb): fliegt brennend weg wie geworfen. */
  knock(source, dx, dz, sp = 7) {
    const l = Math.hypot(dx, dz) || 1;
    this.light();
    this.vel.set((dx / l) * sp, 4, (dz / l) * sp);
    this.thrownBy = source ?? null;
    this.owner = null;
    this.grounded = false;
    this.grace = 0.3;
    this.setState('thrown');
  }

  // ------------------------------------------------------------------ Tragen/Werfen

  onPickup() {
    this.light();
    this.setState('carried');
    this.touch = false;
    this.vel.set(0, 0, 0);
  }

  onThrow(player, o) {
    this.touch = true;
    this.thrownBy = player;
    this.owner = null;
    this.grace = 0.4;
    if (o.gentle) {
      this.pos.x = player.pos.x + o.dir.x * 0.75; this.pos.z = player.pos.z + o.dir.z * 0.75;
      this.pos.y = player.pos.y + 0.1;
      this.vel.set(0, 0, 0);
      this.thrownBy = null;
      this.setState('lit');
      return;
    }
    this.vel.set(o.dir.x * 8.5 + player.vel.x * 0.3, 4.5, o.dir.z * 8.5 + player.vel.z * 0.3);
    this.yaw = Math.atan2(-o.dir.z, o.dir.x);
    this.grounded = false;
    this.setState('thrown');
  }

  onDrop() {
    this.touch = true;
    this.vel.set(0, 2, 0);
    this.grace = 0.4;
    this.setState('lit');
  }

  // ------------------------------------------------------------------ Berührung und Treffer

  onPlayer(player, contact) {
    if (this.defeated || this.exploded || this.state === 'carried') return 'none';
    if ((this.state === 'air' || this.state === 'thrown') && !contact.fromAbove) return 'none';
    if (this.grace > 0) return 'none';
    if (contact.fromAbove || contact.pound) {
      this.light();
      this.grace = 0.2;
      if (this.state === 'slide' || this.state === 'thrown') { this.vel.x = 0; this.vel.z = 0; this.thrownBy = null; this.setState('lit'); }
      return contact.pound ? 'none' : 'stomp';
    }
    if (player.input?.run && player.canPickUp?.()) { player.pickUp(this); return 'none'; }
    // seitlich: zünden und wegschubsen (kein Schaden)
    this.light();
    const dx = this.pos.x - player.pos.x, dz = this.pos.z - player.pos.z, l = Math.hypot(dx, dz) || 1;
    this.vel.x = (dx / l) * 3; this.vel.z = (dz / l) * 3; this.vel.y = 2.5;
    this.grounded = false;
    this.setState('slide');
    this.grace = 0.35;
    return 'none';
  }

  onHit(kind, source) {
    if (this.defeated || this.exploded || this.state === 'carried' || source === this) return;
    if (kind === 'mega' || kind === 'star') { this.lit = false; this.flip(source, 7); return; }
    if (kind === 'bomb') { this.light(0.12); return; }
    if (kind === 'pound' && source?.pos && Math.abs(source.pos.y - this.pos.y) > 0.6) return;
    if (kind === 'claw' && source?.facingVec) { const f = source.facingVec(); this.knock(source, f.x, f.z); return; }
    this.light();
  }

  /** Eine Explosion zählt nicht als besiegter Gegner; Entschärfen (Stern/Riese) schon. */
  markDefeated() {
    if (this.exploded) { this.defeated = true; return; }
    super.markDefeated();
  }

  explode() {
    if (this.exploded) return;
    this.exploded = true;
    this.defeated = true;
    this.lit = false;
    if (this.carrier) { if (this.carrier.holding === this) this.carrier.holding = null; this.carrier = null; }
    this.touch = false;
    this.carryable = false;
    this.vel.set(0, 0, 0);
    this.setState('explode');
    const c = this.center().clone();
    this.explosion = explodeAt(this.level, c, this.radius, this);
  }

  // ------------------------------------------------------------------ Darstellung

  modelState() {
    const s = this.state;
    const fuse = this.lit ? clamp(this.fuse / this.fuseTotal, 0, 1) : 1;
    if (s === 'explode') return { anim: 'explode', progress: Math.min(1, this.stateT / EXPLODE) };
    if (s === 'carried') return { anim: 'carried', fuse, lit: true };
    if (s === 'thrown') return { anim: 'thrown', fuse, lit: true };
    if (s === 'flipped') return { anim: 'idle', lit: false };
    if (this.lit) return { anim: this.fuse < BLINK ? 'blink' : 'lit', speed: Math.hypot(this.vel.x, this.vel.z), fuse, lit: true };
    if (s === 'walk' || s === 'air') return { anim: 'walk', speed: this.speed };
    return { anim: 'idle' };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    this.model.root.rotation.z = this.state === 'flipped' ? Math.PI : 0;
  }

  info() {
    return {
      state: this.state, lit: this.lit, fuse: +this.fuse.toFixed(2), exploded: this.exploded, defeated: this.defeated,
      x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2), explosion: this.explosion,
    };
  }
}

/** Nachschub-Spender (unsichtbar): erzeugt an pos Zündköpfe. */
class ZuendkopfQuelle extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'zuendkopf_quelle');
    this.touch = false;
    this.shadow = 0;
    const sp = spec.spawner === true ? {} : spec.spawner;
    this.every = sp.every ?? 4;
    this.max = sp.max ?? 2;
    this.range = sp.range ?? 30;
    this.t = this.every - (sp.first ?? 0.5);
    this.running = sp.idle !== true;
    this.spawned = 0;
    this.kids = [];
    const { spawner, id, ...rest } = spec;
    this.childSpec = rest;
  }

  start() { this.running = true; }
  stop() { this.running = false; }

  update(dt) {
    this.kids = this.kids.filter((k) => !k.removed && !k.exploded && !k.defeated);
    if (!this.running) return;
    this.t += dt;
    if (this.t < this.every || this.kids.length >= this.max) return;
    const near = figures(this.level).some((p) => Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) <= this.range);
    if (!near) return;
    this.t = 0;
    const e = this.level.spawn('zuendkopf', { ...this.childSpec, pos: [this.pos.x, this.pos.y, this.pos.z], wake: 0 });
    if (e) { this.kids.push(e); this.spawned++; this.level.effects?.dust(this.pos, 4, 0.8); }
  }

  info() { return { spawned: this.spawned, alive: this.kids.length, running: this.running }; }
}

// =====================================================================================================================
// Lila Ziegel
// =====================================================================================================================

const POOLS = new WeakMap();
/** Gemeinsame Instanz-Gruppe aller lila Ziegel eines Levels. */
function lilaPool(level) {
  if (!level.view) return null;
  let groups = POOLS.get(level);
  if (!groups) { groups = []; POOLS.set(level, groups); }
  let g = groups.find((x) => x.free.length);
  if (!g) {
    const n = 160;
    const inst = createInstanced('lila_ziegel', n);
    const free = [];
    for (let i = n - 1; i >= 0; i--) free.push(i);
    g = { inst, free };
    level.view.add(inst.root, (dt) => inst.update(dt));
    groups.push(g);
  }
  return g;
}

const lilaShake = (inst, i) => inst?.setState(i, 'shake');

class LilaWand extends CourseEntity {
  constructor(level, spec, single) {
    super(level, spec, single ? 'lila_ziegel' : 'lila_ziegelwand');
    this.touch = false;
    this.shadow = 0;
    this.powBreak = true;   // POW-Block zerbricht ihn (pow.js)
    const s = single ? [1, 1, 1] : (spec.size ?? [4, 3, 1]);
    const w = Math.max(1, Math.round(s[0])), h = Math.max(1, Math.round(s[1])), d = Math.max(1, Math.round(s[2] ?? 1));
    this.dims = [w, h, d];
    const p = this.pos;
    this.half.set(w / 2, h / 2, d / 2);
    this.blocks = [];
    const x0 = p.x - w / 2, z0 = p.z - d / 2;
    for (let iy = 0; iy < h; iy++) for (let iz = 0; iz < d; iz++) for (let ix = 0; ix < w; ix++) {
      const b = { x: x0 + ix + 0.5, y: p.y + iy, z: z0 + iz + 0.5, ok: true, sid: null, slot: null, g: null };
      b.sid = this.addShape({ type: 'box', min: [b.x - 0.5, b.y, b.z - 0.5], max: [b.x + 0.5, b.y + 1, b.z + 0.5], breakable: 'bomb', tag: 'lila_ziegel' });
      this.blocks.push(b);
    }
    this.broken = 0;
    for (const b of this.blocks) {
      const g = lilaPool(level);
      if (!g) break;
      b.g = g; b.slot = g.free.pop();
      g.inst.setAt(b.slot, { x: b.x, y: b.y, z: b.z }, 0, 1, 'idle');
    }
  }

  get count() { return this.blocks.length; }
  get left() { return this.count - this.broken; }

  blockOf(shape) { return shape ? this.blocks.find((b) => b.ok && b.sid === shape.id) ?? null : null; }

  /** Abstand Punkt → Block (Würfel). */
  static dist(b, x, y, z) {
    const dx = Math.max(0, Math.abs(x - b.x) - 0.5), dy = Math.max(0, Math.abs(y - (b.y + 0.5)) - 0.5), dz = Math.max(0, Math.abs(z - b.z) - 0.5);
    return Math.hypot(dx, dy, dz);
  }

  /** Alle heilen Blöcke im Abstand r um (x, y, z) zerbrechen → Zahl. */
  breakAt(x, y, z, r) {
    let n = 0;
    for (const b of this.blocks) if (b.ok && LilaWand.dist(b, x, y, z) <= r) { this.breakBlock(b); n++; }
    return n;
  }

  nearest(x, y, z, max = 1.6) {
    let best = null, bd = max;
    for (const b of this.blocks) { if (!b.ok) continue; const d = LilaWand.dist(b, x, y, z); if (d < bd) { bd = d; best = b; } }
    return best;
  }

  onHit(kind, source, shape) {
    const b0 = this.blockOf(shape);
    if (kind === 'bomb') {
      const bl = source?.blast ?? (source?.center ? { ...source.center(), r: source.radius ?? 2.5 } : null);
      if (bl) { if (!this.breakAt(bl.x, bl.y, bl.z, bl.r) && b0) this.breakBlock(b0); }
      else if (b0) this.breakBlock(b0);
      return;
    }
    if (kind === 'pound' && source?.kind === 'pow') {
      const R = source.radius ?? 8, H = source.reachY ?? 3;
      for (const b of this.blocks) if (b.ok && Math.hypot(b.x - source.pos.x, b.z - source.pos.z) <= R && Math.abs(b.y - source.pos.y) <= H) this.breakBlock(b);
      return;
    }
    if (kind === 'claw' || kind === 'mega' || kind === 'cannon') {
      let b = b0;
      if (!b && source?.pos) {
        const f = source.facingVec?.() ?? { x: 0, z: 0 };
        b = this.nearest(source.pos.x + f.x * 0.9, source.pos.y + (source.half?.y ?? 0.5), source.pos.z + f.z * 0.9, kind === 'mega' ? 2 : 1.2);
      }
      if (b) this.breakBlock(b);
      return;
    }
    // Kopfstoß, Panzer, Feuer, Stampfen: nur wackeln
    if (b0) lilaShake(b0.g?.inst, b0.slot);
  }

  onBump(player, shape) { const b = this.blockOf(shape); if (b) { lilaShake(b.g?.inst, b.slot); this.level.sfx('blockhit'); } }
  onPound(player, shape) { const b = this.blockOf(shape); if (b) { lilaShake(b.g?.inst, b.slot); this.level.sfx('blockhit'); } }

  breakBlock(b) {
    if (!b.ok) return;
    b.ok = false;
    this.broken++;
    this.level.world.remove(b.sid);
    const k = this.shapes.indexOf(b.sid);
    if (k >= 0) this.shapes.splice(k, 1);
    b.g?.inst.setState(b.slot, 'break');
    this.level.effects?.debris({ x: b.x, y: b.y + 0.5, z: b.z }, 0x9a4ad8, 6);
    this.level.sfx('brickbreak');
    if (this.spec.content) spawnLoot(this.level, this.spec.content, b.x, b.y, b.z);
    if (this.left === 0) {
      if (this.spec.onBreak) runAction(this.level, this.spec.onBreak, { pos: [this.pos.x, this.pos.y + this.half.y, this.pos.z], source: this });
    }
  }

  info() { return { count: this.count, left: this.left, broken: this.broken }; }

  dispose() {
    for (const b of this.blocks) {
      if (!b.g || b.slot === null) continue;
      b.g.inst.setState(b.slot, 'hidden');
      b.g.free.push(b.slot);
      b.slot = null;
    }
    super.dispose();
  }
}

export const KINDS = {
  zuendkopf: (level, spec) => (spec.spawner ? new ZuendkopfQuelle(level, spec) : new Zuendkopf(level, spec)),
  lila_ziegel: (level, spec) => new LilaWand(level, spec, true),
  lila_ziegelwand: (level, spec) => new LilaWand(level, spec, false),
};
