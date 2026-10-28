// Glasröhren-Fahrt zwischen den Welten der Kurs-Karte (Bauplan: „ein Glasröhren-Übergang führt nach dem Weltboss zur
// nächsten Insel“). Die Figur fährt in der Glasröhre des Eingangs (Art 'pipe', Weltdaten def.pipe) über das Meer:
//
//   Abfahrt  ('depart'):  Hüpfer vom Podest in den Röhrenfuß, dann die Röhre hinauf und hinaus aufs Meer (≈ 3,4 s,
//                         immer schneller); danach blendet die Szene zur nächsten Welt über.
//   Ankunft  ('arrive'):  In der neuen Welt kommt die Figur weit draußen in der Rückweg-Röhre an, saust zum Röhrenfuß
//                         (≈ 3,2 s, zum Ende langsamer) und hüpft vor das Podest. Danach blendet die Kamera zurück.
//
// Die Bewegung läuft im Simulationstakt über player.ride(ctl) (Skript-Modus wie in der Glasröhre der Level) – also
// deterministisch und in Tests mit step(n) abspielbar. Die Kamera folgt als Verfolger-Kamera hinter der Figur
// (rig.custom), nach der Ankunft wird weich auf die Kartenkamera überblendet.
//
// def.arriveCam (Welt 3, Röhre nach Welt 4): { up, ahead, drop } – Verfolger-Kamera bei der Ankunft höher und steiler
// nach unten (Blick auf Röhre und Figur statt über die ganze dichte Insel; spart Zeichenaufrufe und Dreiecke).
//
// Kosten: Am Anfang der Ankunft blickt die Kamera über die ganze Insel. Solange die Röhre dort noch weit draußen über
// dem Meer verläuft (SHADOW_FREEZE), wird die Schattenkarte nicht neu gezeichnet (der Schattenbereich folgt der
// Kamera und enthielte nur Meer und Figur); kleine ferne Objekte blendet lod.js aus.

import * as THREE from 'three';
import { tubePoints, exitPoint } from './layout.js';
import { pauseShadows } from './lod.js';

const HOP_IN = 0.45;          // s Hüpfer vom Podest in die Röhre
const DEPART_TIME = 3.4;      // s Gesamtdauer der Abfahrt (danach Szenenwechsel)
const ARRIVE_TIME = 3.2;      // s Fahrt in der Röhre bei der Ankunft
const ARRIVE_LEN = 64;        // m Röhrenstrecke, die bei der Ankunft gefahren wird
const HOP_OUT = 0.75;         // s Hüpfer aus dem Röhrenfuß vor das Podest
const BLEND_OUT = 1.0;        // s Kamera-Überblendung nach der Ankunft
const SHADOW_FREEZE = 1.0;    // s Ankunft: so lange kein Schattenpass (Röhre weit draußen über dem Meer)

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3();

/** Kurve der Glasröhre (dieselbe wie in der Darstellung, entrances.js). */
export function tubeCurve(def) {
  const pts = tubePoints(def).map(([x, y, z]) => new THREE.Vector3(x, y, z));
  return new THREE.CatmullRomCurve3(pts, false, 'centripetal');
}

/** Dichte Polylinie mit Bogenlänge (gleichmäßige Fahrt). */
function makeTrack(curve) {
  const n = Math.max(60, Math.ceil(curve.getLength() / 0.5));
  const pts = [], cum = [0];
  for (let i = 0; i <= n; i++) {
    pts.push(curve.getPoint(i / n));
    if (i) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  }
  return { pts, cum, L: cum[n] };
}

function pointAt(tr, s, out) {
  const { pts, cum } = tr;
  if (s <= 0) return out.copy(pts[0]);
  if (s >= tr.L) {
    // über das Ende hinaus geradeaus weiter
    const n = pts.length - 1;
    _d.subVectors(pts[n], pts[n - 1]).normalize();
    return out.copy(pts[n]).addScaledVector(_d, s - tr.L);
  }
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; }
  const k = (s - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]);
  return out.lerpVectors(pts[lo], pts[hi], k);
}

const ease = (u) => u * u * (3 - 2 * u);

export class TubeTravel {
  /**
   * @param {import('./CourseMapScene.js').CourseMapScene} scene
   * @param {{ mode: 'depart'|'arrive', entrance: object, onDone: () => void }} opts entrance = Eingang aus den Weltdaten
   */
  constructor(scene, opts) {
    this.scene = scene;
    this.mode = opts.mode;
    this.def = opts.entrance;
    this.onDone = opts.onDone;
    this.track = makeTrack(tubeCurve(this.def));
    this.t = 0;
    this.phase = this.mode === 'depart' ? 'hop' : 'ride';
    this.done = false;
    this.dir = new THREE.Vector3(0, 0, -1);     // Fahrtrichtung (für die Kamera)
    // def.departAlong (Welt 6): bei der Abfahrt blickt die Verfolger-Kamera gleich entlang der Röhre hinaus (statt erst
    // nach Norden über die ganze Inselkette – weniger Zeichenaufrufe im ersten Moment)
    if (this.mode === 'depart' && this.def.departAlong) {
      pointAt(this.track, 0, _a); pointAt(this.track, 24, _b);
      _b.sub(_a); _b.y *= 0.35;
      if (_b.lengthSq() > 1e-6) this.dir.copy(_b.normalize());
    }
    this.center = new THREE.Vector3();
    this.camPos = null;
    this.camLook = new THREE.Vector3();
    this.blend = null;
    this.snapNext = false;
    // Ankunft: Schattenkarte einmal zeichnen, dann bis SHADOW_FREEZE ruhen lassen (in dispose spätestens zurück)
    this.resumeShadows = this.mode === 'arrive' ? pauseShadows(scene.view) : null;
    const p = scene.player;
    this.start = p.pos.clone();
    this.exit = new THREE.Vector3(...exitPoint(this.def));
    if (this.mode === 'arrive') {
      pointAt(this.track, ARRIVE_LEN, this.center);
      p.pos.set(this.center.x, this.center.y - p.half.y, this.center.z);
    } else this.center.set(p.pos.x, p.pos.y + p.half.y, p.pos.z);
    this.ctl = { step: (pl, dt) => this.stepRide(pl, dt), exit: (pl) => { pl.vel.set(0, 0, 0); } };
    p.ride(this.ctl, { state: this.mode === 'depart' ? 'jump' : 'pipe', kind: 'glasroehre' });
    scene.level.sfx('pipe');
    // Kamera: Verfolger hinter der Figur
    this.rig = scene.view.rig;
    this.rig.custom = (dt, player) => this.camera(dt, player);
  }

  get active() { return !this.done || !!this.blend; }

  info() { return { mode: this.mode, phase: this.phase, t: +this.t.toFixed(2), entrance: this.def.id, shadows: !this.resumeShadows }; }

  /** Verfolger-Kamera beim nächsten Bild ohne Nachziehen an ihre Soll-Lage setzen (Tests, Bildvergleich). */
  snap() {
    if (this.blend) { this.blend = null; this.rig.custom = null; this.rig.snap(this.scene.player); return; }   // Überblendung beenden
    this.snapNext = true;
  }

  unfreeze() {
    this.resumeShadows?.();
    this.resumeShadows = null;
  }

  /** Simulationsschritt der Fahrt (player.ride). true = Fahrt beendet. */
  stepRide(p, dt) {
    this.t += dt;
    const tr = this.track;
    const prev = _c.copy(this.center);
    if (this.mode === 'depart') {
      if (this.phase === 'hop') {
        // Bogen vom Podest in den Röhrenfuß (Mitte der Figur 0,9 m über dem Fuß)
        const u = Math.min(1, this.t / HOP_IN);
        pointAt(tr, 0, _a);
        this.center.lerpVectors(_b.set(this.start.x, this.start.y + p.half.y, this.start.z), _a.setY(_a.y + 0.9), ease(u));
        this.center.y += Math.sin(u * Math.PI) * 1.6;
        if (u >= 1) { this.phase = 'ride'; this.t0 = this.t; this.s = 0.9; this.v = 4; this.scene.level.sfx('pipe'); p.setState('pipe'); }
      } else {
        this.v = Math.min(30, this.v + 15 * dt);
        this.s += this.v * dt;
        pointAt(tr, this.s, this.center);
        if (this.t >= DEPART_TIME && !this.done) { this.done = true; this.phase = 'gone'; this.onDone?.(); }
      }
    } else if (this.phase === 'ride') {
      if (this.resumeShadows && this.t >= SHADOW_FREEZE) this.unfreeze();
      const u = Math.min(1, this.t / ARRIVE_TIME);
      const e = 0.25 * u + 0.75 * (1 - (1 - u) ** 1.8);
      this.s = ARRIVE_LEN * (1 - e) + 0.9 * e;
      pointAt(tr, this.s, this.center);
      if (u >= 1) { this.phase = 'hop'; this.t0 = this.t; this.hopFrom = this.center.clone(); this.scene.level.sfx('jump'); p.setState('jump'); }
    } else if (this.phase === 'hop') {
      const u = Math.min(1, (this.t - this.t0) / HOP_OUT);
      _a.set(this.exit.x, this.exit.y + p.half.y + 0.05, this.exit.z);
      this.center.lerpVectors(this.hopFrom, _a, ease(u));
      this.center.y += Math.sin(u * Math.PI) * 2.4;
      if (u >= 1) {
        this.phase = 'landed';
        this.done = true;
        p.pos.set(this.exit.x, this.exit.y + 0.02, this.exit.z);
        p.yaw = -Math.PI / 2;
        this.blend = { t: 0, pos: null, quat: null };
        this.onDone?.();
        return true;
      }
    }
    p.pos.set(this.center.x, this.center.y - p.half.y, this.center.z);
    // Blickrichtung und Fahrtrichtung
    _d.subVectors(this.center, prev);
    const len = _d.length();
    if (len > 1e-4) {
      p.vel.copy(_d).multiplyScalar(1 / dt);
      _d.multiplyScalar(1 / len);
      if (Math.hypot(_d.x, _d.z) > 0.2) p.yaw = Math.atan2(-_d.z, _d.x);
      // Kamera-Richtung weich nachführen (senkrechte Abschnitte zählen wenig)
      _b.set(_d.x, _d.y * 0.35, _d.z);
      if (_b.lengthSq() > 1e-6) this.dir.lerp(_b.normalize(), Math.min(1, dt * 3)).normalize();
    }
    return false;
  }

  /** Verfolger-Kamera (rig.custom); nach der Ankunft Überblendung auf die Kartenkamera. */
  camera(dt, player) {
    const cam = this.rig.camera;
    if (this.blend) {
      const b = this.blend;
      if (!b.pos) { b.pos = cam.position.clone(); b.quat = cam.quaternion.clone(); this.rig.snap(player); }
      b.t += dt;
      const k = ease(Math.min(1, b.t / BLEND_OUT));
      // Kartenkamera normal rechnen, dann von der letzten Verfolger-Lage überblenden
      const fn = this.rig.custom;
      this.rig.custom = null;
      this.rig.update(dt, player, this.scene.level.world);
      this.rig.custom = fn;
      cam.position.lerpVectors(b.pos, cam.position, k);
      cam.quaternion.copy(b.quat).slerp(_q.copy(cam.quaternion), k);
      if (k >= 1) { this.blend = null; this.rig.custom = null; }
      return true;
    }
    const c = this.center;
    const d = this.dir;
    // hinter und über der Figur, leicht seitlich (die Röhre bleibt im Bild, vorn das Ziel am Horizont)
    const back = this.mode === 'depart' ? 7.5 : 9;
    const ac = this.mode === 'arrive' ? this.def.arriveCam : null;
    const up = ac?.up ?? 3.4, ahead = ac?.ahead ?? 12, drop = ac?.drop ?? 0.6;
    _a.set(c.x - d.x * back + d.z * 2.4, c.y + up - d.y * 4, c.z - d.z * back - d.x * 2.4);
    _b.set(c.x + d.x * ahead, c.y - drop + d.y * 3, c.z + d.z * ahead);
    if (!this.camPos || this.snapNext) {
      const at = this.mode === 'arrive' || this.snapNext;
      this.camPos = at ? _a.clone() : cam.position.clone();
      if (at) this.camLook.copy(_b);
      else this.camLook.copy(this.rig.target);
      this.snapNext = false;
    }
    const kp = 1 - Math.exp(-dt * (this.mode === 'arrive' ? 5 : this.phase === 'hop' ? 2.5 : 6.5));
    const kl = 1 - Math.exp(-dt * 6);
    this.camPos.lerp(_a, kp);
    this.camLook.lerp(_b, kl);
    cam.position.copy(this.camPos);
    cam.lookAt(this.camLook);
    this.rig.target.copy(this.camLook);
    return true;
  }

  dispose() {
    this.unfreeze();
    if (this.rig.custom) this.rig.custom = null;
  }
}

const _q = new THREE.Quaternion();
