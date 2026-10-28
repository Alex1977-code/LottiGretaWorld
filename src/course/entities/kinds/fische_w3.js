// Wasser-Gegner Welt 3 (3-5 Lagune, 3-Kapitän): Flossling, Stachelfisch, Rammfisch.
// Alle bleiben im Wasser (Formen mit `water`; steigt/fällt der Wasserspiegel, folgen sie ihm) und verletzen bei
// Berührung – auch eine schwimmende Figur.
//
// flossling – runder Fisch, schwimmt in Schwärmen.
//   mode 'swim' (Standard): fährt eine Bahn unter Wasser (path, Runde ab 3 Punkten; y = Schwimmhöhe der Unterkante)
//     oder kreist (center + radius); count > 1 = Schwarm hintereinander (spacing m). behavior 'chase': schwimmt eine
//     Figur im Wasser in Sichtweite, folgt er ihr (bleibt unter der Oberfläche) und kehrt danach zur Bahn zurück.
//   mode 'jump': wartet knapp unter der Oberfläche und **springt im Takt** (every s, phase) im Bogen aus dem Wasser
//     (height m hoch, dist m weit in dir), beim nächsten Mal zurück (pendelt) – über Stege und Röhren hinweg.
//   Draufspringen (aus dem Wasser), Feuer, Krallen, Panzer, Wurf, Rutschen, Schwanzhieb, Kanone … besiegen ihn. Landet
//   er auf dem Trockenen (Wasser weg), zappelt er (flop) und ist harmlos, bis er wieder ins Wasser springt.
//   Daten: { kind: 'flossling', pos?, path?, loop?, center?, radius?: 3, cw?, speed?: 2.2, count?: 1, spacing?: 1.2,
//            phase?: 0..1, color?: 'tuerkis'|'koralle'|'gold', mode?: 'swim'|'jump', behavior?: 'swim'|'chase',
//            sight?: 5, every?: 2.4, height?: 2.6, dist?: 4, dir?, drop? }
//   Zustände: swim | chase | wait → jump → splash …; flop; flipped. Modell 'flossling' (opts { color },
//   state { anim: swim|jump|flop|defeated, speed }).
//
// stachelfisch – Stachel-Kugelfisch, nur mit starken Treffern zu besiegen (Kanonenkugel, Explosion, Riesentrank,
//   Funkelstern); Draufspringen verletzt (Stacheln). Bläst sich in Figurennähe auf (puff).
//   mode 'surface' (Standard): treibt an der Wasseroberfläche und **verfolgt** die nächste Figur (in oder über dem
//     Wasser, waagerecht < sight), nur so weit das Wasser reicht.
//   mode 'swim': Bahn unter Wasser wie der Flossling.
//   mode 'wall': **schießt im Takt aus einem Wandloch** (3-5 Stachelwand): versteckt → lugt heraus (0,35 s, bläst sich
//     auf) → schießt reach m in dir (shoot m/s) → hält out s → zieht sich zurück (back m/s, schneller, falls der Zyklus
//     sonst nicht in period passt) → versteckt … (genau period s je Zyklus; phase = Vorlauf im Takt; versteckt
//     unberührbar).
//   Daten: { kind: 'stachelfisch', pos (surface/swim: Unterkante; wall: Lochmitte = Fischmitte), size?: 1 (wall 0.45),
//            mode?: 'surface'|'swim'|'wall', speed?: 2.2, sight?: 9, path?, loop?, dir? (wall: Schussrichtung),
//            period?: 2.4, phase?: 0..1, reach?: 3.5, shoot?: 9, back?: 4, out?: 0.35, drop? }
//   Zustände: surface: drift ⇄ chase (puff in Nähe); wall: hide → peek → shoot → hold → back → hide …; flipped.
//   Laufzeit: shots. Modell 'stachelfisch' (opts { size }, Mitte bei y = 0,7·size; state { anim: swim|chase|puff|defeated }).
//
// rammfisch – bulliger Rammfisch (3-Kapitän): patrouilliert (path bzw. hin und her in dir), sieht er eine Figur vor
//   sich (sight, im/am Wasser, Kegel ±35°), dreht er sich zu ihr (turn 0,5 s, Ankündigung) und **rammt** geradeaus
//   (charge m/s, steigt dabei auf die Höhe der Figur – auch knapp unter die Oberfläche), bis er an eine Wand/ans Ufer
//   stößt oder range m weit ist → **betäubt** (stun s, Sterne, harmlos) →
//   dreht um → weiter. Berührung verletzt (außer betäubt). Nur starke Treffer besiegen ihn.
//   Daten: { kind: 'rammfisch', pos (Unterkante, Schwimmhöhe), path?, dir?, speed?: 1.4, charge?: 7, sight?: 8,
//            range?: 12, stun?: 1.3, drop? }
//   Zustände: swim → turn → charge → stunned → swim …; flipped. Laufzeit: rams. Modell 'rammfisch'
//   (state { anim: swim|charge|turn|stunned }).
//   Welt 7 (additiv, Präzisierung Gegner Welt 7, 7-6 Rammfisch-Riff):
//     size?: 1          Größe (Modell und Hülle × size; „große“ Rammfische z. B. 2,2).
//     center?: [x, y, z] + radius?: 4 + cw?   kreist ruhig um center (große rotierende Rammfische; rammt dann nicht,
//                       außer ram: true); y = Schwimmhöhe der Unterkante.
//     path mit Höhen    Wegpunkte, deren y sich unterscheiden (oder vertical: true), werden räumlich abgefahren –
//                       „auf und ab ziehende“ Rammfische (z. B. [[x, 1, z], [x, 6, z]]); nach einem Rammstoß schwimmt er zur Bahn
//                       zurück (state 'back').
//     ram?: true        false = rammt nie (nur Bahn/Kreis; Berührung verletzt trotzdem).
//     carries?: 'star:I'  trägt Stern I in einer Blase auf dem Rücken (Stern berühren = einsammeln, die Blase platzt; LEVEL.stars
//                       listet ihn nicht). Besiegt (STRONG) bleibt der Stern an seiner Stelle.
//     Wurfsichel, Feuer, Krallen, Panzer prallen ab (nur STRONG besiegt ihn). Rammt er eine Unterwasser-Kiste (kiste_wasser),
//     zerbricht sie (onHit('ram')).

import * as THREE from 'three';
import { EnemyW2, STRONG, activeFigure, waterAt, wrapAngle, clamp } from '../EnemyW2.js';
import { PathMover } from '../../level/PathMover.js';
import { getModel } from '../../models/index.js';

const TAU = Math.PI * 2;

/** Wasserform, die den Punkt enthält (oder null). */
function waterIn(level, x, y, z) {
  for (const s of level.world.overlapAABB({ x, y, z }, { x: 0.02, y: 0.02, z: 0.02 })) if (s.water) return s;
  return null;
}

/** Figur im Wasser oder knapp darüber (bis 1,5 m)? */
function nearWater(level, p) {
  return p.mode === 'swim' || !!waterAt(level, p.pos.x, p.pos.y, p.pos.z, 1.5);
}

function circlePath(c, r, n = 24, cw = false) {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU * (cw ? -1 : 1); pts.push([c[0] + Math.cos(a) * r, c[1], c[2] - Math.sin(a) * r]); }
  return pts;
}

/** Bahn aus spec (path | center) → PathMover | null. */
function moverOf(spec, speed) {
  const pts = spec.center ? circlePath(spec.center, spec.radius ?? 3, 28, !!spec.cw) : spec.path;
  if (!(pts?.length >= 2)) return null;
  const loop = spec.center ? true : (spec.loop ?? pts.length >= 3);
  return new PathMover(pts, { speed, mode: loop ? 'loop' : 'pingpong', wait: 0.3, phase: (((spec.phase ?? 0) % 1) + 1) % 1 });
}

// =====================================================================================================================
// Flossling
// =====================================================================================================================
class Flossling extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'flossling');
    this.half.set(0.3, 0.28, 0.3);
    this.shadow = 0;
    this.wake = 0;
    this.edges = false;
    this.speed = spec.speed ?? 2.2;
    this.mode = spec.mode === 'jump' ? 'jump' : 'swim';
    this.behavior = spec.behavior ?? 'swim';
    this.sight = spec.sight ?? 5;
    this.every = spec.every ?? 2.4;
    this.height = spec.height ?? 2.6;
    this.dist = spec.dist ?? 4;
    this.jumps = 0;
    this.mover = this.mode === 'swim' ? moverOf(spec, this.speed) : null;
    if (this.mover) { const p = this.mover.pos; this.pos.set(p.x, p.y, p.z); }
    this.home = this.pos.clone();
    this.jumpDir = 1;
    this.jumpFrom = new THREE.Vector3();
    this.jumpTo = new THREE.Vector3();
    this.flight = 2 * Math.sqrt((2 * this.height) / 30);
    this.wait = (((spec.phase ?? 0) % 1) + 1) % 1 * this.every;
    this.state = this.mode === 'jump' ? 'wait' : 'swim';
    if (this.mode === 'jump') this.toSurface();
    if (level.view) this.setModel(getModel('flossling', { color: spec.color ?? 'tuerkis' }));
    this.initShadows(1);
  }

  /** Sprung-Fisch: knapp unter die Oberfläche setzen. */
  toSurface() {
    const w = waterAt(this.level, this.pos.x, this.pos.y + 0.3, this.pos.z, 3);
    if (w) this.pos.y = w.top - 0.45;
  }

  update(dt) {
    this.stateT += dt;
    if (this.updateDefeat(dt)) return;
    switch (this.state) {
      case 'swim': this.swim(dt); break;
      case 'chase': this.chaseSwim(dt); break;
      case 'wait':
        this.toSurface();
        this.wait -= dt;
        if (this.wait <= 0) this.startJump();
        break;
      case 'jump': this.jumpStep(dt); break;
      case 'flop': this.flop(dt); break;
      default: break;
    }
  }

  swim(dt) {
    if (this.mover) {
      const ox = this.pos.x, oz = this.pos.z;
      this.mover.step(dt);
      const p = this.mover.pos;
      this.pos.set(p.x, p.y, p.z);
      this.faceToward(p.x - ox, p.z - oz, dt, 8);
    }
    if (this.behavior === 'chase') {
      const p = this.player;
      if (activeFigure(p) && p.mode === 'swim' && Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z, (p.pos.y - this.pos.y) * 0.8) < this.sight) this.setState('chase');
    }
    this.checkDry();
  }

  chaseSwim(dt) {
    const p = this.player;
    const tooFar = !activeFigure(p) || p.mode !== 'swim' || Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) > this.sight * 1.6;
    // Ziel: Figur bzw. zurück zur Bahn
    const tx = tooFar ? (this.mover?.pos.x ?? this.home.x) : p.pos.x;
    const ty = tooFar ? (this.mover?.pos.y ?? this.home.y) : p.pos.y + 0.2;
    const tz = tooFar ? (this.mover?.pos.z ?? this.home.z) : p.pos.z;
    const dx = tx - this.pos.x, dy = ty - this.pos.y, dz = tz - this.pos.z, d = Math.hypot(dx, dy, dz);
    if (tooFar && d < 0.3) { this.setState('swim'); return; }
    const sp = Math.min(d, this.speed * 1.15 * dt);
    const nx = this.pos.x + (dx / (d || 1)) * sp, ny = this.pos.y + (dy / (d || 1)) * sp, nz = this.pos.z + (dz / (d || 1)) * sp;
    const w = waterIn(this.level, nx, ny + 0.28, nz);
    if (w && ny + 0.56 < w.top) this.pos.set(nx, ny, nz);
    this.faceToward(dx, dz, dt, 6);
  }

  /** Wasser weg (Spiegel gesunken)? → zappeln. */
  checkDry() {
    const c = this.center();
    if (!waterIn(this.level, c.x, c.y, c.z)) { this.setState('flop'); this.vel.set(0, 0, 0); }
  }

  flop(dt) {
    this.vel.x = 0; this.vel.z = 0;
    this.moveWithGravity(dt);
    const c = this.center();
    if (waterIn(this.level, c.x, c.y, c.z)) this.setState(this.mode === 'jump' ? 'wait' : 'swim');
    else if (this.grounded && this.stateT > 0.8) { this.vel.y = 3; this.grounded = false; this.stateT = 0; }
  }

  startJump() {
    this.jumpFrom.copy(this.pos);
    const d = this.dir;
    this.jumpTo.set(this.pos.x + d.x * this.dist * this.jumpDir, this.pos.y, this.pos.z + d.z * this.dist * this.jumpDir);
    this.yaw = Math.atan2(-d.z * this.jumpDir, d.x * this.jumpDir);
    this.jumps++;
    this.setState('jump');
    this.level.effects?.splash?.(this.pos, this.pos.y + 0.45);
    this.level.sfx('splash');
  }

  jumpStep() {
    const k = Math.min(1, this.stateT / this.flight);
    const a = this.jumpFrom, b = this.jumpTo;
    this.pos.set(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k + 4 * (this.height + 0.45) * k * (1 - k), a.z + (b.z - a.z) * k);
    if (k >= 1) {
      this.jumpDir = -this.jumpDir;
      this.wait = Math.max(0.2, this.every - this.flight);
      this.level.effects?.splash?.(this.pos, this.pos.y + 0.45);
      this.setState('wait');
    }
  }

  get outOfWater() {
    const c = this.center();
    return !waterIn(this.level, c.x, c.y, c.z);
  }

  onPlayer(player, contact) {
    if (this.defeated) return 'none';
    if (this.state === 'flop') {
      if (contact.fromAbove || contact.pound) { this.flip(player, 5); return contact.pound ? 'none' : 'stomp'; }
      return 'none';
    }
    if (this.slideAttack(player, contact)) return 'none';
    if ((contact.fromAbove || contact.pound) && this.outOfWater) { this.flip(player, 5); return contact.pound ? 'none' : 'stomp'; }
    if (contact.dive) { this.onHit('claw', player); return 'none'; }
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated || kind === 'bump') return;
    if (kind === 'pound' && source?.pos && Math.abs(source.pos.y - this.pos.y) > 0.8) return;
    this.flip(source, 6);
  }

  modelState() {
    const s = this.state;
    if (s === 'flipped') return { anim: 'defeated' };
    if (s === 'flop') return { anim: 'flop' };
    if (s === 'jump') return { anim: 'jump' };
    return { anim: 'swim', speed: s === 'chase' ? this.speed * 1.15 : this.speed };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    const r = this.model.root;
    // Sprung: Nase folgt der Flugbahn
    if (this.state === 'jump') { const k = Math.min(1, this.stateT / this.flight); r.rotation.z = (1 - 2 * k) * 0.9; }
    else r.rotation.z = this.state === 'flipped' ? Math.PI : 0;
  }

  info() { return { state: this.state, jumps: this.jumps, x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2), defeated: this.defeated }; }
}

function makeFlossling(level, spec) {
  const n = Math.max(1, Math.round(spec.count ?? 1));
  const first = new Flossling(level, { ...spec, count: 1 });
  if (n > 1 && first.mover) {
    const L = first.mover.length || 1, sp = spec.spacing ?? 1.2;
    for (let i = 1; i < n; i++) level.spawn('flossling', { ...spec, id: spec.id ? `${spec.id}_${i}` : undefined, count: 1, phase: (spec.phase ?? 0) - (i * sp) / L });
  } else if (n > 1 && first.mode === 'jump') {
    // Sprung-Schwarm: nebeneinander, leicht versetzt im Takt
    const d = first.dir;
    for (let i = 1; i < n; i++) {
      const o = (i % 2 ? 1 : -1) * Math.ceil(i / 2) * (spec.spacing ?? 1.2);
      level.spawn('flossling', { ...spec, id: spec.id ? `${spec.id}_${i}` : undefined, count: 1, pos: [spec.pos[0] - d.z * o, spec.pos[1], spec.pos[2] + d.x * o], phase: (spec.phase ?? 0) + i * 0.08 });
    }
  }
  return first;
}

// =====================================================================================================================
// Stachelfisch
// =====================================================================================================================
const PEEK = 0.35;

class Stachelfisch extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'stachelfisch');
    this.mode = spec.mode === 'wall' ? 'wall' : spec.mode === 'swim' ? 'swim' : 'surface';
    this.size = spec.size ?? (this.mode === 'wall' ? 0.45 : 1);
    const r = 0.62 * this.size;
    this.half.set(r, r, r);
    this.shadow = 0;
    this.wake = 0;
    this.edges = false;
    this.speed = spec.speed ?? 2.2;
    this.sight = spec.sight ?? 9;
    this.shots = 0;
    this.puffT = 0;
    this.cur = new THREE.Vector2();
    if (this.mode === 'wall') {
      // pos = Lochmitte (Fischmitte); Hülle: pos = Fußpunkt
      this.hole = new THREE.Vector3(this.pos.x, this.pos.y, this.pos.z);
      this.reach = spec.reach ?? 3.5;
      this.shootSpeed = spec.shoot ?? 9;
      this.backSpeed = spec.back ?? 4;
      this.outT = spec.out ?? 0.35;
      this.period = spec.period ?? 2.4;
      // Zyklus passt in period: reicht die Zeit nicht, zieht er sich schneller zurück (versteckt ≥ 0,2 s)
      const fixed = PEEK + this.reach / this.shootSpeed + this.outT;
      const backT = Math.max(0.3, Math.min(this.reach / this.backSpeed, this.period - fixed - 0.2));
      this.backSpeed = this.reach / backT;
      this.hideT = Math.max(0.2, this.period - fixed - backT);
      this.ext = 0;
      this.state = 'hide';
      this.touch = false;
      this.yaw = Math.atan2(-this.dir.z, this.dir.x);
      // Startversatz im Takt
      this.stateT = (((spec.phase ?? 0) % 1) + 1) % 1 * this.period;
      this.skipCycle();
      this.placeWall();
    } else {
      this.mover = this.mode === 'swim' ? moverOf(spec, this.speed) : null;
      if (this.mover) { const p = this.mover.pos; this.pos.set(p.x, p.y, p.z); }
      this.state = this.mode === 'swim' ? 'swim' : 'drift';
      if (this.mode === 'surface') this.toSurface();
    }
    if (level.view) this.setModel(getModel('stachelfisch', { size: this.size }));
    this.initShadows(1);
  }

  /** Zyklus der Wand-Schützen: hide → peek → shoot → hold → back. */
  phases() {
    return [['hide', this.hideT], ['peek', PEEK], ['shoot', this.reach / this.shootSpeed], ['hold', this.outT], ['back', this.reach / this.backSpeed]];
  }

  skipCycle() {
    const P = this.phases();
    let i = 0;
    while (this.stateT > P[i][1]) { this.stateT -= P[i][1]; i = (i + 1) % P.length; }
    this.state = P[i][0];
    this.touch = this.state !== 'hide';
  }

  placeWall() {
    const d = this.dir, cy = 0.7 * this.size;
    const e = this.ext;
    this.pos.set(this.hole.x + d.x * e, this.hole.y - cy, this.hole.z + d.z * e);
  }

  /** Oberflächen-Fisch: Mitte knapp unter die Wasseroberfläche. */
  toSurface() {
    const w = waterAt(this.level, this.pos.x, this.pos.y + 0.7 * this.size, this.pos.z, 2);
    if (w) { this.surface = w.top; this.pos.y = w.top - 0.7 * this.size - 0.1; }
    return w;
  }

  wet(x, z) {
    const w = waterAt(this.level, x, this.surface ?? this.pos.y, z, 0.8);
    if (!w || Math.abs(w.top - (this.surface ?? w.top)) >= 0.4) return false;
    const y = (this.surface ?? w.top) + 0.1;
    return !this.level.world.overlapAABB({ x, y, z }, { x: 0.12, y: 0.35, z: 0.12 }).some((s) => s.solid && !s.water && s.owner !== this);
  }

  update(dt) {
    this.stateT += dt;
    if (this.state === 'flipped') {
      this.vel.y -= 20 * dt;
      this.pos.addScaledVector(this.vel, dt);
      if (this.stateT > 1.5) this.kill();
      return;
    }
    if (this.mode === 'wall') { this.wallStep(dt); return; }
    const p = this.player;
    const close = activeFigure(p) && Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < 2.4 * Math.max(1, this.size);
    this.puffT = close ? Math.min(1, this.puffT + dt * 4) : Math.max(0, this.puffT - dt * 2);
    if (this.mode === 'swim') {
      if (this.mover) {
        const ox = this.pos.x, oz = this.pos.z;
        this.mover.step(dt);
        const q = this.mover.pos;
        this.pos.set(q.x, q.y, q.z);
        this.faceToward(q.x - ox, q.z - oz, dt, 6);
      }
      return;
    }
    // Oberfläche: verfolgt die nächste Figur im/über dem Wasser
    this.toSurface();
    let tx = 0, tz = 0;
    const chase = activeFigure(p) && this.playerDist() < this.sight && nearWater(this.level, p);
    if (chase) {
      const t = this.toPlayer(this._tp ?? (this._tp = {}));
      if (t.d > 0.2) { tx = t.x * this.speed; tz = t.z * this.speed; }
      if (this.state !== 'chase') this.setState('chase');
    } else if (this.state !== 'drift') this.setState('drift');
    const k = Math.min(1, dt * 2);
    this.cur.x += (tx - this.cur.x) * k; this.cur.y += (tz - this.cur.y) * k;
    const l = Math.hypot(this.cur.x, this.cur.y);
    if (l > 1e-3) {
      const nx = this.pos.x + this.cur.x * dt, nz = this.pos.z + this.cur.y * dt;
      const r = this.half.x;
      if (this.wet(nx + (this.cur.x / l) * r, nz + (this.cur.y / l) * r)) { this.pos.x = nx; this.pos.z = nz; }
      else this.cur.set(0, 0);
      if (l > 0.2) this.faceToward(this.cur.x, this.cur.y, dt, 5);
    }
  }

  wallStep(dt) {
    const P = this.phases();
    const i = P.findIndex((x) => x[0] === this.state);
    switch (this.state) {
      case 'hide': this.ext = 0; break;
      case 'peek': this.ext = 0.25 * this.size * Math.min(1, this.stateT / PEEK); break;
      case 'shoot':
        this.ext = Math.min(this.reach, 0.25 * this.size + this.shootSpeed * this.stateT);
        break;
      case 'hold': this.ext = this.reach; break;
      case 'back': this.ext = Math.max(0, this.reach - this.backSpeed * this.stateT); break;
      default: break;
    }
    this.placeWall();
    if (this.stateT >= P[i][1]) {
      this.stateT -= P[i][1];
      this.state = P[(i + 1) % P.length][0];
      this.touch = this.state !== 'hide';
      if (this.state === 'shoot') { this.shots++; this.level.sfx('bullet'); }
    }
  }

  get hidden() { return this.mode === 'wall' && this.state === 'hide'; }

  onPlayer(player, contact) {
    if (this.defeated || this.hidden) return 'none';
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated || this.hidden) return;
    if (STRONG.has(kind)) {
      this.setState('flipped');
      this.touch = false;
      this.vel.set(0, 6, 0);
      this.level.effects?.sparks(this.center(), 10);
      this.level.sfx('stomp');
      this.markDefeated();
    }
  }

  modelState() {
    const s = this.state;
    if (s === 'flipped') return { anim: 'defeated' };
    if (this.mode === 'wall') return { anim: s === 'peek' || s === 'shoot' || s === 'hold' ? 'puff' : 'chase' };
    if (this.puffT > 0.5) return { anim: 'puff' };
    return { anim: s === 'chase' ? 'chase' : 'swim' };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    this.model.root.visible = !this.hidden;
  }

  info() { return { state: this.state, mode: this.mode, shots: this.shots, ext: +(this.ext ?? 0).toFixed(2), x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2), defeated: this.defeated }; }
}

// =====================================================================================================================
// Rammfisch
// =====================================================================================================================
const TURN = 0.5;

class Rammfisch extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'rammfisch');
    this.size = spec.size ?? 1;
    this.half.set(0.75 * this.size, 0.42 * this.size, 0.75 * this.size);
    this.shadow = 0;
    this.wake = 0;
    this.edges = false;
    this.speed = spec.speed ?? 1.4;
    this.chargeSpeed = spec.charge ?? 7;
    this.sight = spec.sight ?? 8;
    this.range = spec.range ?? 12;
    this.stunT = spec.stun ?? 1.3;
    this.rams = 0;
    this.heading = Math.atan2(-this.dir.z, this.dir.x);
    this.yaw = this.heading;
    this.from = this.pos.clone();
    this.want = 0;
    this.homeY = this.pos.y;
    this.wantY = this.pos.y;
    this.state = 'swim';
    // Welt 7: Kreis bzw. räumliche Bahn (auf und ab)
    const ys = spec.path?.length >= 2 ? spec.path.map((q) => q[1]) : null;
    const vertical = !!ys && (spec.vertical || Math.max(...ys) - Math.min(...ys) > 0.3);
    this.ram = spec.ram ?? !spec.center;
    if (spec.center || vertical) {
      const pts = spec.center ? circlePath(spec.center, spec.radius ?? 4, 32, !!spec.cw) : spec.path;
      const loop = spec.center ? true : (spec.loop ?? pts.length >= 3);
      this.mover3 = new PathMover(pts, { speed: this.speed, mode: loop ? 'loop' : 'pingpong', wait: spec.center ? 0 : 0.5, phase: (((spec.phase ?? 0) % 1) + 1) % 1 });
      this.path = null;
      const q = this.mover3.pos;
      this.pos.set(q.x, q.y, q.z);
    }
    this.carryStar = null;
    this.bubble = null;
    const cm = typeof spec.carries === 'string' ? /^star(?::(\d+))?$/.exec(spec.carries) : null;
    if (cm) {
      this.carryStar = level.spawn('star', { pos: [this.pos.x, this.pos.y + this.half.y * 2 + 0.5, this.pos.z], index: +(cm[1] ?? 0) });
      if (level.view && this.carryStar) {
        const mat = new THREE.MeshStandardMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.32, roughness: 0.1, metalness: 0.1, depthWrite: false });
        this.bubble = new THREE.Mesh(new THREE.SphereGeometry(0.85, 20, 14), mat);
        this.bubble.renderOrder = 3;
        level.view.add(this.bubble);
      }
    }
    if (level.view) this.setModel(getModel('rammfisch'));
    this.initShadows(1);
  }

  /** Stern in der Blase auf dem Rücken mitführen (eingesammelt → Blase platzt). */
  carry() {
    const st = this.carryStar;
    if (!st) return;
    if (st.removed || !st.alive) {
      this.carryStar = null;
      if (this.bubble) { this.level.effects?.sparks(this.bubble.position, 10); this.level.view?.remove(this.bubble); this.bubble.geometry.dispose(); this.bubble.material.dispose(); this.bubble = null; }
      return;
    }
    if (this.defeated) return;
    st.pos.set(this.pos.x, this.pos.y + this.half.y * 2 + 0.35, this.pos.z);
  }

  /** Nächster Schritt in Richtung h mit Tempo v; false = Wand/Ufer (kein Wasser). */
  advance(dt, h, v) {
    const dx = Math.cos(h), dz = -Math.sin(h);
    const nx = this.pos.x + dx * v * dt, nz = this.pos.z + dz * v * dt;
    const fx = nx + dx * this.half.x, fz = nz + dz * this.half.z, cy = this.pos.y + this.half.y;
    if (!waterIn(this.level, fx, cy, fz)) return false;
    const solid = this.level.world.overlapAABB({ x: fx, y: cy, z: fz }, { x: 0.1, y: 0.3, z: 0.1 }).find((s) => s.solid && !s.oneWay && !s.water && s.owner !== this);
    if (solid) {
      // Welt 7: rammt er eine Unterwasser-Kiste, zerbricht sie (onHit('ram'), Bausteine Welt 7)
      if (this.state === 'charge' && solid.owner?.kind === 'kiste_wasser') solid.owner.onHit?.('ram', this);
      return false;
    }
    this.pos.x = nx; this.pos.z = nz;
    return true;
  }

  update(dt) {
    this.stateT += dt;
    if (this.state === 'flipped') {
      this.vel.y -= 20 * dt;
      this.pos.addScaledVector(this.vel, dt);
      if (this.stateT > 1.5) this.kill();
      this.carry();
      return;
    }
    this.run3(dt);
    this.carry();
  }

  run3(dt) {
    if (this.mover3 && (this.state === 'swim' || this.state === 'back')) {
      const q = this.mover3.pos;
      if (this.state === 'back') {
        // nach dem Rammstoß zurück zur Bahn
        const dx = q.x - this.pos.x, dy = q.y - this.pos.y, dz = q.z - this.pos.z, d = Math.hypot(dx, dy, dz);
        const s = Math.min(d, this.speed * 2.2 * dt);
        if (d > 1e-3) { this.pos.x += (dx / d) * s; this.pos.y += (dy / d) * s; this.pos.z += (dz / d) * s; }
        if (Math.hypot(dx, dz) > 0.05) { this.heading += wrapAngle(Math.atan2(-dz, dx) - this.heading) * Math.min(1, dt * 4); this.yaw = this.heading; }
        if (d < 0.2) this.setState('swim');
        return;
      }
      const ox = this.pos.x, oz = this.pos.z;
      this.mover3.step(dt);
      this.pos.set(q.x, q.y, q.z);
      const mx = this.pos.x - ox, mz = this.pos.z - oz;
      if (Math.abs(mx) + Math.abs(mz) > 1e-5) { this.heading += wrapAngle(Math.atan2(-mz, mx) - this.heading) * Math.min(1, dt * 6); this.yaw = this.heading; }
      if (this.ram && this.spots()) { this.setState('turn'); this.level.sfx('beep'); }
      return;
    }
    switch (this.state) {
      case 'swim': {
        if (this.path) {
          const t = this.path[this.target];
          const dx = t.x - this.pos.x, dz = t.z - this.pos.z;
          if (Math.hypot(dx, dz) < 0.4) this.nextTarget();
          const u = this.path[this.target];
          const want = Math.atan2(-(u.z - this.pos.z), u.x - this.pos.x);
          this.heading += Math.max(-2.5 * dt, Math.min(2.5 * dt, wrapAngle(want - this.heading)));
        }
        if (!this.advance(dt, this.heading, this.speed)) this.heading = wrapAngle(this.heading + Math.PI);
        this.toY(dt, this.homeY, 0.8);
        this.yaw = this.heading;
        if (this.ram && this.spots()) { this.setState('turn'); this.level.sfx('beep'); }
        break;
      }
      case 'turn': {
        const p = this.player;
        if (activeFigure(p)) { this.want = Math.atan2(-(p.pos.z - this.pos.z), p.pos.x - this.pos.x); this.aimY(p); }
        this.heading += wrapAngle(this.want - this.heading) * Math.min(1, dt * 8);
        this.yaw = this.heading;
        if (this.stateT >= TURN) { this.heading = this.want; this.from.copy(this.pos); this.rams++; this.setState('charge'); this.level.sfx('dash'); }
        break;
      }
      case 'charge': {
        this.toY(dt, this.wantY, 3);
        const ok = this.advance(dt, this.heading, this.chargeSpeed);
        if (!ok || Math.hypot(this.pos.x - this.from.x, this.pos.z - this.from.z) >= this.range) {
          this.setState('stunned');
          if (!ok) { this.level.effects?.sparks(this.center(), 8); this.level.shake(0.2); this.level.sfx('blockhit'); }
        }
        break;
      }
      case 'stunned':
        if (this.stateT >= this.stunT) { this.heading = wrapAngle(this.heading + Math.PI); this.yaw = this.heading; this.setState(this.mover3 ? 'back' : 'swim'); }
        break;
      default: break;
    }
  }

  /** Rammhöhe: Körpermitte auf Höhe der Figur, aber im Wasser (Rücken höchstens knapp über der Oberfläche). */
  aimY(p) {
    const w = waterAt(this.level, this.pos.x, this.pos.y + this.half.y, this.pos.z, 3);
    if (!w) return;
    const lo = (w.bottom ?? this.homeY) + 0.05, hi = w.top - this.half.y * 1.4;
    this.wantY = clamp(p.pos.y + p.half.y - this.half.y, Math.min(lo, hi), hi);
  }

  /** Höhe weich nachführen (nur im Wasser). */
  toY(dt, y, rate) {
    const d = y - this.pos.y, m = rate * dt;
    const ny = this.pos.y + Math.max(-m, Math.min(m, d));
    if (waterIn(this.level, this.pos.x, ny + this.half.y, this.pos.z)) this.pos.y = ny;
  }

  /** Figur vor ihm (±35°) in Sichtweite und am/im Wasser? */
  spots() {
    const p = this.player;
    if (!activeFigure(p) || !nearWater(this.level, p)) return false;
    const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z, d = Math.hypot(dx, dz);
    if (d > this.sight || d < 0.5 || Math.abs(p.pos.y - this.pos.y) > 2.5) return false;
    const fx = Math.cos(this.heading), fz = -Math.sin(this.heading);
    return (dx * fx + dz * fz) / d > Math.cos(0.61);
  }

  onPlayer(player, contact) {
    if (this.defeated || this.state === 'stunned') return contact.fromAbove && !this.defeated ? 'stomp' : 'none';
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated) return;
    if (STRONG.has(kind)) {
      this.setState('flipped');
      this.touch = false;
      this.vel.set(0, 6, 0);
      this.level.effects?.sparks(this.center(), 10);
      this.markDefeated();
    }
  }

  modelState() {
    const s = this.state;
    if (s === 'charge') return { anim: 'charge' };
    if (s === 'turn') return { anim: 'turn' };
    if (s === 'stunned' || s === 'flipped') return { anim: 'stunned' };
    return { anim: 'swim' };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    this.model.root.rotation.z = this.state === 'flipped' ? Math.PI : 0;
    if (this.size !== 1) this.model.root.scale.setScalar(this.size);
  }

  render(dt, t) {
    super.render(dt, t);
    if (this.bubble && this.carryStar) {
      const st = this.carryStar;
      this.bubble.position.set(st.pos.x, st.pos.y + 0.55, st.pos.z);
      this.bubble.scale.setScalar(1 + Math.sin(t * 3.1) * 0.04);
    }
  }

  dispose() {
    if (this.bubble) { this.level.view?.remove(this.bubble); this.bubble.geometry.dispose(); this.bubble.material.dispose(); this.bubble = null; }
    super.dispose();
  }

  info() { return { state: this.state, rams: this.rams, x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2), heading: +this.heading.toFixed(2), defeated: this.defeated, size: this.size, star: this.carryStar ? this.carryStar.index : null }; }
}

export const KINDS = {
  flossling: makeFlossling,
  stachelfisch: (level, spec) => new Stachelfisch(level, spec),
  rammfisch: (level, spec) => new Rammfisch(level, spec),
};
