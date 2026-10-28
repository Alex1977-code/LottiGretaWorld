// Funkenflämmchen – Gegner Welt 7 „Lava-Festung“ (7-5 Funkenturm, 7-2): kleines hüpfendes Flämmchen mit Lachmund (Modell
// 'funkenflaemmchen', Ursprung = Fußpunkt). Eigene Figur.
//
// Verhalten: bewegt sich nur in kleinen Hüpfern (ducken → Bogen height m hoch, hop m weit → landen → Pause): auf einer Bahn
// (path, Wegpunkt für Wegpunkt; Runde ab 3 Punkten bzw. loop), geradeaus in dir (kehrt an Kanten und Wänden um – es springt nie
// von einer Plattform; edges: false erlaubt es) oder mit behavior 'chase' auf die Figur zu (sight m). Bewegte Plattformen und
// Schaltfelder tragen es mit; mit weight > 0 zählt es auf Druckfeldern (pfeld) wie eine Figur. In Wasser verlischt es.
// Konter: **verletzt bei jeder Berührung** (auch von oben – heiß!). **Nur Power-ups und Wurfsichel** besiegen es (HOT_KILL:
// Tatzenhieb, Schwanzhieb, Krallen-Sturzflug, Wurfsichel, Panzer, Wurf, Kanone, Explosion, Stern, Riese) – es verpufft in einem
// Rauchwölkchen. Feuer prallt ab.
//
// Daten: { kind: 'funkenflaemmchen', pos (Fußpunkt), path?: [[x, y, z], …], loop?, dir?: [dx, dz], behavior?: 'hop' | 'chase',
//          sight?: 6, hop?: 0.8 (m je Hüpfer), height?: 0.45, pause?: 0.12 (s nach der Landung), phase?: 0..1 (Vorlauf der
//          ersten Pause), edges?: true, color?: 'rot' | 'blau', weight?: 0, drop? }
//   Beispiel: { kind: 'funkenflaemmchen', pos: [3, 1, -30], path: [[1, 1, -30], [5, 1, -30]] }
// Zustände: rest → crouch → air → land → rest …; defeated (0,6 s). Laufzeit: hops, airborne, info().
// Sound: 'hop' (leise), 'poof' (verpufft), 'burn'.

import { EnemyW2, activeFigure, clamp } from '../EnemyW2.js';
import { getModel } from '../../models/index.js';
import { HOT_KILL, hurtsFrom } from '../w7help.js';

const G = 40;
const CROUCH = 0.1, LAND = 0.1, DEFEAT = 0.6;

class Funkenflaemmchen extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'funkenflaemmchen');
    this.half.set(0.2, 0.27, 0.2);
    this.shadow = 0.22;
    this.wake = spec.wake ?? 22;
    this.color = spec.color === 'blau' ? 'blau' : 'rot';
    this.hopDist = spec.hop ?? 0.8;
    this.hopH = spec.height ?? 0.45;
    this.pause = spec.pause ?? 0.12;
    this.behavior = spec.behavior ?? 'hop';
    this.sight = spec.sight ?? 6;
    this.weight = spec.weight ?? 0;
    this.vy0 = Math.sqrt(2 * G * this.hopH);
    this.airT = (2 * this.vy0) / G;
    this.hops = 0;
    this.state = 'rest';
    this.stateT = -((spec.phase ?? 0) % 1) * 0.6;
    if (level.view) this.setModel(getModel('funkenflaemmchen', { color: this.color }));
    this.initShadows(1);
  }

  /** Lava schadet ihm nicht (es fällt höchstens hinein – dann ist es weg, ohne als besiegt zu zählen). */
  checkLava() { return false; }

  get airborne() { return this.state === 'air'; }

  update(dt) {
    this.stateT += dt;
    if (this.state === 'defeated') {
      if (this.stateT >= DEFEAT) this.kill();
      return;
    }
    if (this.wake > 0 && this.playerDist() > this.wake && this.state === 'rest') { this.stand(dt); return; }
    switch (this.state) {
      case 'rest':
        this.stand(dt);
        if (this.stateT >= this.pause && this.grounded) this.setState('crouch');
        break;
      case 'crouch':
        this.stand(dt);
        if (this.stateT >= CROUCH) this.startHop();
        break;
      case 'air': {
        const res = this.moveWithGravity(dt);
        if (this.removed) return;
        if (res.hitWall && this.edges) this.reverse();
        if (this.grounded && this.stateT > 0.05) { this.vel.x = 0; this.vel.z = 0; this.setState('land'); }
        break;
      }
      case 'land':
        this.stand(dt);
        if (this.stateT >= LAND) this.setState('rest');
        break;
      default: break;
    }
    if (this.removed) return;
    // Wasser löscht es
    const c = this.center();
    for (const s of this.level.world.overlapAABB(c, this.half)) {
      if (s.water && this.pos.y < s.top - 0.05) { this.fizzle(); return; }
    }
  }

  reverse() { this.dir.x = -this.dir.x; this.dir.z = -this.dir.z; if (this.path) this.turn(); }

  startHop() {
    // Richtung: Bahn, Verfolgen oder geradeaus
    if (this.path) {
      let t = this.path[this.target];
      if (Math.hypot(t.x - this.pos.x, t.z - this.pos.z) < 0.25) { this.nextTarget(); t = this.path[this.target]; }
      const dx = t.x - this.pos.x, dz = t.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d > 1e-3) { this.dir.x = dx / d; this.dir.z = dz / d; }
    } else if (this.behavior === 'chase' && this.canSee(this.sight, 2.5)) {
      const t = this.toPlayer({});
      if (t.d > 0.3) { this.dir.x = t.x; this.dir.z = t.z; }
    }
    let dist = this.hopDist;
    if (this.path) {
      const t = this.path[this.target];
      dist = Math.min(dist, Math.max(0.05, Math.hypot(t.x - this.pos.x, t.z - this.pos.z)));
    }
    // nicht von Kanten hüpfen
    if (this.edges && this.grounded && !this.groundAhead(this.dir.x, this.dir.z, Math.max(0.1, dist - this.half.x), 1.1)) {
      if (this.path) this.turn(); else { this.dir.x = -this.dir.x; this.dir.z = -this.dir.z; }
      if (this.behavior === 'chase') dist = 0;
      else if (!this.groundAhead(this.dir.x, this.dir.z, Math.max(0.1, dist - this.half.x), 1.1)) dist = 0;
    }
    const h = dist / this.airT;
    this.vel.set(this.dir.x * h, this.vy0, this.dir.z * h);
    this.grounded = false;
    this.ground = null;
    this.hops++;
    this.yaw = Math.atan2(-this.dir.z, this.dir.x);
    this.setState('air');
  }

  fizzle() {
    if (this.defeated) return;
    this.setState('defeated');
    this.touch = false;
    this.level.effects?.dust(this.pos, 4, 0.6);
    this.level.sfx('poof');
    this.markDefeated();
  }

  poof() {
    if (this.defeated) return;
    this.setState('defeated');
    this.touch = false;
    this.vel.set(0, 0, 0);
    this.level.effects?.sparks(this.center(), 10);
    this.level.sfx('poof');
    this.markDefeated();
  }

  onPlayer(player, contact) {
    if (this.defeated) return 'none';
    if (hurtsFrom(contact) === 'attack') { this.poof(); return 'none'; }
    return 'hurt';   // heiß – auch von oben
  }

  onHit(kind, source) {
    if (this.defeated) return;
    if (HOT_KILL.has(kind)) { this.poof(); return; }
    if (kind === 'fire') this.level.effects?.sparks(this.center(), 3);
  }

  modelState() {
    const s = this.state;
    if (s === 'defeated') return { anim: 'defeated', progress: Math.min(1, this.stateT / DEFEAT) };
    // Hüpf-Zyklus des Modells: 0–0,18 ducken, 0,18–0,86 Flug, 0,86–1 landen (Höhe macht die Simulation: height 0)
    let p = 0;
    if (s === 'crouch') p = 0.18 * clamp(this.stateT / CROUCH, 0, 0.999);
    else if (s === 'air') p = 0.18 + 0.68 * clamp(this.stateT / this.airT, 0, 0.999);
    else if (s === 'land') p = 0.86 + 0.14 * clamp(this.stateT / LAND, 0, 0.999);
    else return { anim: 'idle' };
    return { anim: 'hop', height: 0, progress: p };
  }

  info() {
    return { state: this.state, hops: this.hops, airborne: this.airborne, defeated: this.defeated, x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2) };
  }
}

export const KINDS = { funkenflaemmchen: (level, spec) => new Funkenflaemmchen(level, spec) };
