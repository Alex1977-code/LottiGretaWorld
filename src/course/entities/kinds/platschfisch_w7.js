// Platschfisch – Gegner Welt 7 „Lava-Festung“ (7-7 Lavasee, 7-A Arena des hellen Lavafelsen-Königs): glühender Lavafisch unter
// Basaltschollen (Modell 'platschfisch', Ursprung = Bauch, Körpermitte y = 0,3). Eigene Figur.
//
// Verhalten: wartet verborgen in der Lava (unberührbar), lugt kurz heraus (peek s, Glutblasen) und **springt im Takt** (every s,
// phase) in einem hohen Bogen (height m über der Lava, flight s) zur nächsten Sprungstelle: reihum durch holes (zwei = hin und
// her) bzw. ohne holes zwischen pos und pos + dir · dist. Mit aim springt er dist m auf die Figur zu (nur wenn dort Lava ist;
// höchstens range m von pos weg, sonst zurück). **Spucken** (spit): jeder n-te Takt taucht er an seiner Stelle auf, bläht die
// Backen und spuckt eine Feuerkugel geradeaus auf die Figur (spitSpeed m/s, Farbe wie er), dann taucht er ab.
// Die Lava darf steigen und sinken (7-7): er folgt der Oberfläche (Lava-Form unter der Sprungstelle).
// **Endlos nachkommend** (spawner): ein unsichtbarer Spender an pos lässt alle every s einen neuen Platschfisch heraus, der hops
// Bögen zu je dist m in Richtung dir springt und danach abtaucht (höchstens max gleichzeitig; nur wenn eine Figur ≤ range m nah ist).
// Konter: **nicht von oben** – Draufspringen/Stampfen verletzt (heiß!). **Nur Power-ups und Wurfsichel** besiegen ihn (Tatzenhieb,
// Schwanzhieb, Krallen-Sturzflug, Wurfsichel, Panzer, Wurf, Kanone, Explosion, Stern, Riese; HOT_KILL in entities/w7help.js) –
// er kühlt zu Stein ab, dreht sich auf den Rücken und plumpst in die Lava. **Feuer prallt ab.** Berührung (aufgetaucht, im
// Sprung, beim Spucken) verletzt.
//
// Daten: { kind: 'platschfisch', pos: [x, y, z] (Lavastelle, y = Lava-Oberfläche), holes?: [[x, y, z], …] (pos = erstes Loch,
//          falls pos fehlt), dir?: [dx, dz], dist?: 4, height?: 2.6, every?: 2.4, flight?: 1.1, phase?: 0..1, peek?: 0.4,
//          aim?: false, sight?: 9, range?: 2·dist, spit?: 0 (n: jeder n-te Takt spuckt; true = 2), spitSpeed?: 7,
//          color?: 'rot' | 'blau', drop?,
//          spawner?: { every: 2.2, max: 4, hops: 3, first: 0, range: 30 } }
//   Beispiele: { kind: 'platschfisch', pos: [0, 0.6, -40], dir: [1, 0], dist: 5, spit: 2 }
//              { kind: 'platschfisch', pos: [-8, 0.6, -60], dir: [1, 0], dist: 4, spawner: { every: 2.5, max: 3, hops: 4 } }
// Zustände: wait → peek → jump → wait …; wait → peek → surface → spit → wait; defeated (1,4 s); Spender: source.
// Laufzeit: jumps, spits, hole, apex, spawned (Spender), info(). Sound: 'splash', 'burn', 'fireball', 'stomp'.

import * as THREE from 'three';
import { EnemyW2, activeFigure, clamp, toWorld, localOffset } from '../EnemyW2.js';
import { getModel } from '../../models/index.js';
import { HOT_KILL, hurtsFrom, lavaAt } from '../w7help.js';

const DEFEAT = 1.4, SPIT = 0.8, SPIT_AT = 0.5, BASE = -0.55;

class Platschfisch extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'platschfisch');
    this.half.set(0.42, 0.3, 0.42);
    this.shadow = 0.35;
    this.wake = 0;
    this.edges = false;
    this.color = spec.color === 'blau' ? 'blau' : 'rot';
    let holes = Array.isArray(spec.holes) && spec.holes.length ? spec.holes.map((h) => new THREE.Vector3(h[0], h[1], h[2])) : null;
    const d = this.dir, L = spec.dist ?? 4;
    if (!holes) {
      const p = this.pos.clone();
      holes = [p, new THREE.Vector3(p.x + d.x * L, p.y, p.z + d.z * L)];
    }
    if (holes.length === 1) holes.push(holes[0].clone());
    this.holes = holes;
    this.home = holes[0].clone();
    this.hole = 0;
    this.once = !!spec.once;               // Spender-Fisch: Löcher einmal durch, dann weg
    this.dist = L;
    this.height = spec.height ?? 2.6;
    this.every = spec.every ?? 2.4;
    this.flight = Math.min(spec.flight ?? 1.1, Math.max(0.4, this.every - 0.2));
    this.peekT = spec.peek ?? 0.4;
    this.aim = !!spec.aim;
    this.sight = spec.sight ?? 9;
    this.range = spec.range ?? L * 2;
    this.spitEvery = spec.spit === true ? 2 : Math.max(0, Math.round(spec.spit ?? 0));
    this.spitSpeed = spec.spitSpeed ?? 7;
    this.timer = ((((spec.phase ?? 0) % 1) + 1) % 1) * this.every;
    this.cycle = 0;
    this.jumps = 0;
    this.spits = 0;
    this.apex = 0;
    this.from = new THREE.Vector3();
    this.to = new THREE.Vector3();
    this.cur = holes[0].clone();          // aktuelle Stelle (Lava-Oberfläche)
    this.next = 1;
    this.owner = spec.owner ?? null;
    this.state = 'wait';
    this.touch = false;
    this.surface(this.cur);
    this.place(this.cur, -0.9);
    let model = null;
    if (level.view) model = this.setModel(getModel('platschfisch', { color: this.color }));
    this.mouth = localOffset('platschfisch:mouth', model, { anim: 'spit', progress: SPIT_AT }, (o) => model.mouth(o), { x: 0.5, y: 0.3, z: 0 });
    this.initShadows(1);
  }

  /** Lava-Oberfläche an h nachführen (steigende/sinkende Lava). */
  surface(h) {
    const l = lavaAt(this.level, h.x, h.z, h.y - 6, h.y + 6);
    if (l) h.y = l.top;
    return h;
  }

  place(h, dy) { this.pos.set(h.x, h.y + dy, h.z); }

  /** Offene Lava an t (keine Plattform darüber)? */
  openLava(t) {
    const l = lavaAt(this.level, t.x, t.z, t.y - 2, t.y + 2);
    if (!l) return false;
    const hit = this.level.world.raycastDown(t.x, l.top + 4, t.z, 4);
    return !hit || !!hit.shape.kill || hit.y <= l.top + 0.05;
  }

  get hidden() { return this.state === 'wait'; }

  update(dt) {
    this.stateT += dt;
    if (this.state === 'defeated') {
      this.vel.y -= 26 * dt;
      this.pos.addScaledVector(this.vel, dt);
      if (this.stateT >= DEFEAT || this.pos.y < this.level.killY) this.kill();
      return;
    }
    this.timer += dt;
    const lead = Math.max(0, this.every - this.peekT - this.flight);
    switch (this.state) {
      case 'wait':
        this.place(this.cur, -0.9);
        if (this.timer >= lead) this.startPeek();
        return;
      case 'peek':
        this.place(this.cur, -0.3 + Math.sin(this.stateT * 16) * 0.04);
        if (this.timer >= lead + this.peekT) {
          if (this.spitEvery && this.cycle % this.spitEvery === this.spitEvery - 1 && activeFigure(this.player) && this.canSee(this.sight + 3, 9)) this.startSpit();
          else this.startJump();
        }
        return;
      case 'surface':
      case 'spit': {
        this.place(this.cur, 0.02);
        this.facePlayer(dt, 10);
        if (this.state === 'surface') { if (this.stateT >= 0.2) this.setState('spit'); return; }
        if (!this.spat && this.stateT >= SPIT * SPIT_AT) this.spit();
        if (this.stateT >= SPIT) this.dive();
        return;
      }
      case 'jump': {
        const k = clamp(this.stateT / this.flight, 0, 1);
        const a = this.from, b = this.to;
        this.pos.set(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k + BASE + 4 * (this.height - BASE) * k * (1 - k), a.z + (b.z - a.z) * k);
        this.apex = Math.max(this.apex, this.pos.y - Math.max(a.y, b.y));
        if (k >= 1) this.splashDown();
        return;
      }
      default: break;
    }
  }

  startPeek() {
    this.surface(this.cur);
    this.setState('peek');
    this.touch = true;
    this.level.effects?.sparks({ x: this.cur.x, y: this.cur.y + 0.1, z: this.cur.z }, 3);
  }

  /** Ziel: nächstes Loch reihum bzw. (aim) dist m auf die Figur zu, wenn dort Lava ist. */
  pickTarget() {
    const n = this.holes.length;
    if (this.aim) {
      const p = this.player;
      const t = new THREE.Vector3();
      if (activeFigure(p) && this.canSee(this.sight, 9)) {
        const dx = p.pos.x - this.cur.x, dz = p.pos.z - this.cur.z, d = Math.hypot(dx, dz) || 1;
        for (const k of [1, 0.6, 0.35]) {
          const s = Math.min(this.dist * k, d);
          t.set(this.cur.x + (dx / d) * s, this.cur.y, this.cur.z + (dz / d) * s);
          if (Math.hypot(t.x - this.home.x, t.z - this.home.z) > this.range) continue;
          if (this.openLava(t)) return { pos: t, hole: -1 };
        }
      }
      // Figur in Sicht, aber kein näherer Platz: auf der Stelle springen; sonst zurück Richtung Ausgangsstelle
      if (activeFigure(p) && this.canSee(this.sight, 9)) return { pos: this.cur.clone(), hole: -1 };
      const hx = this.home.x - this.cur.x, hz = this.home.z - this.cur.z, hd = Math.hypot(hx, hz);
      if (hd > 0.5) { const s = Math.min(this.dist, hd); t.set(this.cur.x + (hx / hd) * s, this.cur.y, this.cur.z + (hz / hd) * s); return { pos: t, hole: -1 }; }
      return { pos: this.cur.clone(), hole: -1 };
    }
    const j = this.once ? this.hole + 1 : (this.hole + 1) % n;
    return { pos: this.holes[Math.min(j, n - 1)].clone(), hole: j };
  }

  startJump() {
    const t = this.pickTarget();
    this.next = t.hole;
    this.from.copy(this.cur);
    this.to.copy(this.surface(t.pos));
    const dx = this.to.x - this.from.x, dz = this.to.z - this.from.z;
    if (Math.abs(dx) + Math.abs(dz) > 1e-3) this.yaw = Math.atan2(-dz, dx);
    this.apex = 0;
    this.jumps++;
    this.cycle++;
    this.setState('jump');
    this.touch = true;
    this.level.sfx('splash');
    this.level.effects?.sparks({ x: this.from.x, y: this.from.y + 0.2, z: this.from.z }, 5);
  }

  splashDown() {
    if (this.next >= 0) this.hole = this.next;
    this.cur.copy(this.to);
    this.timer = 0;
    this.setState('wait');
    this.touch = false;
    this.level.effects?.sparks({ x: this.to.x, y: this.to.y + 0.2, z: this.to.z }, 5);
    this.level.sfx('splash');
    if (this.once && this.hole >= this.holes.length - 1) { this.touch = false; this.kill(); }
  }

  startSpit() {
    this.spat = false;
    this.cycle++;
    this.setState('surface');
    this.level.sfx('burn');
  }

  /** Feuerkugel geradeaus auf die Figur (aus dem Maul). */
  spit() {
    this.spat = true;
    const p = this.player;
    if (!activeFigure(p)) return;
    const m = toWorld(this.pos, this.yaw, this.mouth.x, this.mouth.y, this.mouth.z, {});
    const c = p.center();
    c.y += p.half.y * 0.5;     // auf die obere Körperhälfte (über Plattformkanten hinweg)
    let dx = c.x - m.x, dy = c.y - m.y, dz = c.z - m.z;
    const d = Math.hypot(dx, dy, dz) || 1;
    dx /= d; dy /= d; dz /= d;
    const s = this.spitSpeed;
    // Kugel knapp über der Lava starten (sonst erlischt sie sofort in ihr)
    const y0 = Math.max(m.y - 0.17, this.cur.y + 0.22);
    this.level.spawn('feuerkugel', { pos: [m.x, y0, m.z], vel: [dx * s, dy * s, dz * s], mode: 'straight', owner: this, color: this.color, life: 2.6 });
    this.lastShot = { mode: 'straight', v: s, dir: [+dx.toFixed(2), +dy.toFixed(2), +dz.toFixed(2)] };
    this.spits++;
    this.level.sfx('fireball');
  }

  dive() {
    this.timer = 0;
    this.setState('wait');
    this.touch = false;
    this.level.effects?.sparks({ x: this.cur.x, y: this.cur.y + 0.1, z: this.cur.z }, 3);
  }

  defeat(source) {
    if (this.defeated) return;
    const sx = source?.pos?.x ?? this.pos.x, sz = source?.pos?.z ?? this.pos.z;
    let ax = this.pos.x - sx, az = this.pos.z - sz;
    const l = Math.hypot(ax, az);
    if (l > 1e-3) { ax /= l; az /= l; } else { ax = 0; az = 0; }
    this.setState('defeated');
    this.touch = false;
    this.vel.set(ax * 1.5, 5, az * 1.5);
    this.level.sfx('stomp');
    this.level.effects?.sparks(this.center(), 8);
    this.markDefeated();
  }

  onPlayer(player, contact) {
    if (this.defeated || this.hidden) return 'none';
    if (hurtsFrom(contact) === 'attack') { this.onHit('claw', player); return 'none'; }
    return 'hurt';   // heiß – auch von oben
  }

  onHit(kind, source) {
    if (this.defeated || this.hidden) return;
    if (HOT_KILL.has(kind)) { this.defeat(source); return; }
    if (kind === 'fire') this.level.effects?.sparks(this.center(), 3);   // Feuer prallt ab
  }

  modelState() {
    const s = this.state;
    if (s === 'jump') return { anim: 'jump', progress: clamp(this.stateT / this.flight, 0, 1) };
    if (s === 'spit') return { anim: 'spit', progress: clamp(this.stateT / SPIT, 0, 1) };
    if (s === 'defeated') return { anim: 'defeated' };
    return { anim: 'swim', speed: 1.5 };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    this.model.root.visible = this.state !== 'wait';
  }

  info() {
    return {
      state: this.state, jumps: this.jumps, spits: this.spits, hole: this.hole, apex: +this.apex.toFixed(2), defeated: this.defeated,
      x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2),
    };
  }
}

/** Unsichtbarer Spender: „endlos nachkommende“ Platschfische. */
class PlatschQuelle extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'platschfisch');
    this.enemy = false;
    this.touch = false;
    this.wake = 0;
    this.half.set(0.1, 0.1, 0.1);
    const s = spec.spawner === true ? {} : spec.spawner;
    this.every = s.every ?? 2.2;
    this.max = s.max ?? 4;
    this.hops = Math.max(1, s.hops ?? 3);
    this.rangeS = s.range ?? 30;
    this.cool = s.first ?? 0;
    this.kids = [];
    this.spawned = 0;
    this.state = 'source';
    this.isSource = true;
  }

  update(dt) {
    this.kids = this.kids.filter((k) => !k.removed);
    this.cool -= dt;
    if (this.cool > 0) return;
    const p = this.player;
    if (!activeFigure(p) || Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) > this.rangeS) { this.cool = 0.25; return; }
    if (this.kids.length >= this.max) { this.cool = 0.25; return; }
    this.cool = this.every;
    const sp = this.spec, d = this.dir, L = sp.dist ?? 4;
    const holes = [];
    for (let i = 0; i <= this.hops; i++) holes.push([this.pos.x + d.x * L * i, this.pos.y, this.pos.z + d.z * L * i]);
    const flight = sp.flight ?? 1.1;
    const k = this.level.spawn('platschfisch', {
      holes, once: true, height: sp.height, every: flight + (sp.peek ?? 0.4) + 0.12, flight, phase: 0.999, peek: sp.peek, color: sp.color,
      spit: sp.spit, spitSpeed: sp.spitSpeed, sight: sp.sight, owner: this, drop: sp.drop,
    });
    if (k) { this.kids.push(k); this.spawned++; }
  }

  onPlayer() { return 'none'; }
  onHit() {}
  info() { return { state: 'source', spawned: this.spawned, alive: this.kids.length }; }
}

export const KINDS = {
  platschfisch: (level, spec) => (spec.spawner ? new PlatschQuelle(level, spec) : new Platschfisch(level, spec)),
};
