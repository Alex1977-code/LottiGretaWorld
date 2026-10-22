// Kettenzaun und Kettenplattform (Präzisierung Motor Welt 3; Bauplan 3-2 „Himmels-Level; bewegliche Kettenzäune als
// Plattform, an denen man klettert“, Baustein „Bewegliche Plattform / Kettenzaun – fährt auf Bahn, teils mit Zaun zum
// Festhalten“). Kletterbarer Maschendrahtzaun – die Figur springt daran (player/fencing.js) und klettert in der
// Zaunebene; fährt der Zaun, fährt sie mit. Gegner auf der Rückseite trifft der Faustschlag durch den Zaun.
//
// Daten (items/enemies als kind, segments als type – blocks/types/kettenzaun.js):
//   { kind: 'kettenzaun', pos: [x, y, z] (Mitte der Unterkante), size: [w, h] (Breite entlang des Zauns 3, Höhe 3),
//     yaw: Blickrichtung der Vorderseite (Standard −π/2 = zur Kamera, d. h. der Zaun steht quer, Breite entlang X;
//          0 = Vorderseite nach +X, Zaun entlang Z),
//     path: [[x, y, z], …] (Wegpunkte von pos), speed: 2, mode: 'pingpong' | 'loop', wait: 0.5, phase: 0..1,
//     idle: false (true = steht bis zum Signal start), once: false (fährt einmal bis zum Pfadende),
//     attach: 'id' (fährt auf einem Fahrzeug `vehicle` mit, Autoscroller 3-2), solid: true (dünne Kollisionswand –
//     nur im 90°-Raster der Gier, sonst ohne Kollision), climbable: true, id?, hidden? }
//   { kind: 'kettenplattform', pos (Mitte der Unterseite; Oberkante pos.y + 0,35), size: [w, d] (quer 4, tief 3),
//     yaw (Vorderseite, Standard −π/2), fence: true (Kletterzaun an der Rückseite, Breite w − 0,2), fenceHeight: 2.5,
//     path/speed/mode/wait/phase/idle/once/attach wie oben, id?, hidden? }
// Bewegung je Schritt in level.onStep (vor der Figur); alle Formen tragen `mover` (stehende Figuren/Gegner fahren mit),
// am Zaun kletternde Figuren über fence.mover (fenceCarry). Signale (Aktionsformat): start, stop.
// Laufzeit: plane (siehe player/fencing.js), mover, shake(a), start(), stop(), running, info(); level.fences.
// Modelle: kettenzaun (opts { width, height }, state { anim: 'idle' | 'shake' }), kettenplattform (opts { width (tief),
// depth (quer), fence, fenceHeight }, state { anim: 'idle' | 'move' }) aus props_schnee_w3.js.

import { Gimmick, visDt } from '../gimmick.js';
import { getModel } from '../../models/index.js';
import { PathMover } from '../../level/PathMover.js';

const HALF_PI = Math.PI / 2;
const THICK = 0.12;   // Dicke der Kollisionswand des Zauns

/** Gier im 90°-Raster? (achsenparallele Kollision möglich) */
function aligned(yaw) {
  const q = ((yaw % HALF_PI) + HALF_PI) % HALF_PI;
  return q < 1e-3 || HALF_PI - q < 1e-3;
}

class ChainFence extends Gimmick {
  constructor(level, spec, platform) {
    super(level, spec, platform ? 'kettenplattform' : 'kettenzaun');
    this.platform = !!platform;
    this._touch = false;
    this.shadow = 0;
    this.yaw = spec.yaw ?? -HALF_PI;
    this.climbable = spec.climbable !== false;
    const sz = spec.size ?? (platform ? [4, 3] : [3, 3]);
    if (platform) {
      this.deckW = sz[0] ?? 4; this.deckD = sz[1] ?? 3;
      this.hasFence = spec.fence !== false;
      this.fw = this.deckW - 0.2; this.fh = spec.fenceHeight ?? 2.5;
      this.off = { n: -this.deckD / 2 + 0.1, y: 0.3 };   // Zaun an der Rückseite, auf dem Gitterrost
      this.half.set(this.deckW / 2, 0.2, this.deckD / 2);
    } else {
      this.hasFence = true;
      this.fw = sz[0] ?? 3; this.fh = sz[1] ?? 3;
      this.off = { n: 0, y: 0 };
      this.half.set(this.fw / 2, this.fh / 2, 0.1);
    }
    if (!this.hasFence) this.climbable = false;
    this.mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: 0, cz: 0, t: -1 };
    this.pm = spec.path?.length >= 2 ? new PathMover(spec.path, { speed: spec.speed ?? 2, mode: spec.mode, wait: spec.wait ?? 0.5, phase: spec.phase ?? 0 }) : null;
    if (this.pm) this.pos.set(this.pm.pos.x, this.pm.pos.y, this.pm.pos.z);
    this.running = !spec.idle;
    this.shakeT = 0;
    this._plane = { x: 0, y: 0, z: 0, ax: 1, az: 0, nx: 0, nz: 1, w: this.fw, h: this.fh };
    // Kollision: dünne Zaunwand (nur im 90°-Raster) und ggf. Deck
    const ok = aligned(this.yaw);
    this.fenceShape = null;
    this.deckShape = null;
    if (this.hasFence && ok && spec.solid !== false) {
      this.fenceShape = this.addSolid({ type: 'box', min: [0, 0, 0], max: [1, 1, 1], noWallSlide: true, camIgnore: true, mover: this.mover, tag: 'kettenzaun' });
    }
    if (platform) this.deckShape = this.addSolid({ type: 'box', min: [0, 0, 0], max: [1, 1, 1], camIgnore: true, mover: this.mover, tag: 'kettenplattform' });
    this.shape = this.fenceShape;
    this.placeShapes();
    level.fences?.push(this);
    if (spec.id && !level.named.has(spec.id)) level.named.set(spec.id, this);
    this.unstep = level.onStep((dt) => this.move(dt));
    if (level.view) {
      this.setModel(platform
        ? getModel('kettenplattform', { width: this.deckD, depth: this.deckW, fence: this.hasFence, fenceHeight: this.fh })
        : getModel('kettenzaun', { width: this.fw, height: this.fh }));
    }
  }

  /** Zaunebene (player/fencing.js): aus Lage und Gier berechnet (auch nachdem ein Fahrzeug den Zaun versetzt hat). */
  get plane() {
    const P = this._plane, c = Math.cos(this.yaw), s = Math.sin(this.yaw);
    P.nx = c; P.nz = -s;          // Vorderseite (+X des Modells)
    P.ax = s; P.az = c;           // entlang (+Z des Modells)
    P.x = this.pos.x + P.nx * this.off.n;
    P.z = this.pos.z + P.nz * this.off.n;
    P.y = this.pos.y + this.off.y;
    P.w = this.fw; P.h = this.fh;
    return P;
  }

  /** Kollisionsformen an die Lage setzen (Hüllquader; Gier im 90°-Raster). */
  placeShapes() {
    const P = this.plane, W = this.level.world;
    if (this.fenceShape) {
      const hx = Math.abs(P.ax) * P.w / 2 + Math.abs(P.nx) * THICK / 2, hz = Math.abs(P.az) * P.w / 2 + Math.abs(P.nz) * THICK / 2;
      const s = this.fenceShape;
      s.min = [P.x - hx, P.y + (this.platform ? 0.05 : 0), P.z - hz]; s.max = [P.x + hx, P.y + P.h, P.z + hz];
      if (s.id && W.get(s.id) === s) W.update(s.id);
    }
    if (this.deckShape) {
      const c = Math.cos(this.yaw), sn = Math.sin(this.yaw);
      // tief entlang der Normalen n = (c, −sn), quer entlang a = (sn, c)
      const hx = Math.abs(c) * this.deckD / 2 + Math.abs(sn) * this.deckW / 2;
      const hz = Math.abs(sn) * this.deckD / 2 + Math.abs(c) * this.deckW / 2;
      const s = this.deckShape;
      s.min = [this.pos.x - hx, this.pos.y, this.pos.z - hz]; s.max = [this.pos.x + hx, this.pos.y + 0.35, this.pos.z + hz];
      if (s.id && W.get(s.id) === s) W.update(s.id);
    }
  }

  start() { this.running = true; }
  stop() { this.running = false; }

  /** Kurz wackeln (Greifen, Faustschlag). */
  shake(a = 0.3) { this.shakeT = Math.max(this.shakeT, a); }

  /** Je Schritt (level.onStep, vor der Figur): eigener Pfad. Mit attach bewegt das Fahrzeug (onCarried). */
  move(dt) {
    if (this.removed) return;
    if (this.shakeT > 0) this.shakeT = Math.max(0, this.shakeT - dt);
    if (this.spec.attach) return;
    const m = this.mover;
    m.dx = m.dy = m.dz = m.vx = m.vy = m.vz = m.dyaw = 0;
    m.cx = this.pos.x; m.cz = this.pos.z;
    m.t = this.level.time;
    if (!this.pm || !this.running) return;
    const d = this.pm.step(dt);
    if (this.spec.once && this.pm.mode !== 'loop' && this.pm.dir < 0) { this.pm.s = this.pm.length; this.pm.at(this.pm.s, this.pm.pos); this.running = false; }
    m.dx = this.pm.pos.x - this.pos.x; m.dy = this.pm.pos.y - this.pos.y; m.dz = this.pm.pos.z - this.pos.z;
    m.vx = m.dx / dt; m.vy = m.dy / dt; m.vz = m.dz / dt;
    this.pos.set(this.pm.pos.x, this.pm.pos.y, this.pm.pos.z);
    this.placeShapes();
  }

  /** Vom Fahrzeug (attach): Lage/Formen sind schon versetzt – Bewegung für die kletternde Figur merken. */
  onCarried(vehicle, ddx, ddy, ddz, dyaw) {
    const m = this.mover, dt = 1 / 120;
    m.cx = this.pos.x - ddx; m.cz = this.pos.z - ddz;
    m.dx = ddx; m.dy = ddy; m.dz = ddz; m.dyaw = dyaw;
    m.vx = vehicle?.mover?.vx ?? ddx / dt; m.vy = vehicle?.mover?.vy ?? ddy / dt; m.vz = vehicle?.mover?.vz ?? ddz / dt;
    m.t = this.level.time;
  }

  /** Zaun wird nicht getroffen (Faustschlag geht hindurch); Riesentrank/Bombe lassen ihn stehen. */
  onHit() {}

  modelState() {
    if (this.platform) return { anim: (Math.abs(this.mover.vx) + Math.abs(this.mover.vy) + Math.abs(this.mover.vz)) > 0.05 ? 'move' : 'idle' };
    return { anim: this.shakeT > 0 ? 'shake' : 'idle' };
  }

  render(dt, t) {
    dt = visDt(this.level, this, dt);
    if (this.popT > 0) this.popT = Math.max(0, this.popT - dt);
    const m = this.model;
    if (!m) return;
    m.root.visible = !this.hidden;
    if (this.hidden) return;
    m.root.position.copy(this.pos);
    m.root.rotation.y = this.yaw;
    const k = this.popT > 0 ? 1 - this.popT / 0.45 : 1;
    m.root.scale.setScalar(k < 1 ? Math.max(0.05, Math.sin(k * Math.PI * 0.5)) : 1);
    m.update?.(dt, this.modelState());
  }

  info() {
    const P = this.plane;
    return { x: +this.pos.x.toFixed(3), y: +this.pos.y.toFixed(3), z: +this.pos.z.toFixed(3), running: this.running, plane: { x: +P.x.toFixed(2), y: +P.y.toFixed(2), z: +P.z.toFixed(2), w: P.w, h: P.h } };
  }

  dispose() {
    this.unstep?.();
    const list = this.level.fences;
    if (list) { const i = list.indexOf(this); if (i >= 0) list.splice(i, 1); }
    super.dispose();
  }
}

export const KINDS = {
  kettenzaun: (level, spec) => new ChainFence(level, spec, false),
  kettenplattform: (level, spec) => new ChainFence(level, spec, true),
};
