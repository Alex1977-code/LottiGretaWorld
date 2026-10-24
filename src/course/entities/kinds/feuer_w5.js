// Feuer-Gegner Welt 5: Feuerring (5-6 „Torten-Welt“), Funkenling (5-2 Zirkus) und Glutball (5-3 blaue Lava). Eigene Figuren.
//
// feuerring – Brennerschale mit lebendigem Flammenkern, um die ein Flammenring brennt. Nicht besiegbar (auch Stern und
//   Riesentrank nicht – die Figur ist dann nur unverwundbar); jede Berührung von Kern oder Flammen verletzt, wer
//   **über die Flammen springt** (Füße höher als 0,8 × Flammenhöhe), bleibt heil. Zwei Arten:
//   mode 'puls' (Standard, Bauplan „pulsierender Ring am Boden – rechtzeitig drüberspringen“): der Ring wächst im Takt der
//     Level-Uhr von 0,6 m bis radius m (period s), flammt auf und erlischt am Ende; danach wait s Pause (nur der Kern
//     glüht). Reihen versetzt über phase.
//   mode 'rad' („kreisendes Flammenrad“): Flammen stehen auf einem Kreis (radius m) und drehen sich mit speed rad/s um den
//     Brenner; gaps Lücken (je gap Grad, gleichmäßig verteilt) lassen eine Figur hindurch. Optional pulsierend: pulse
//     { min, period } lässt den Radius zwischen min und radius atmen; blink [an, aus] (s) schaltet die Flammen im Takt
//     aus (0,5 s vorher flackern sie klein – Vorwarnung).
//   Daten: { kind: 'feuerring', pos (Boden, Mitte), mode?: 'puls' | 'rad', radius?: 4 (puls) | 3 (rad), height?: 0.7,
//            color?: 'rot' | 'blau' | 'pink', flames? (Zahl der Flammen; Standard nach Umfang), id?,
//            puls: period?: 2.4, wait?: 0.6, phase?: 0..1,
//            rad: speed?: 1.2 (rad/s, + = gegen den Uhrzeigersinn von oben), gaps?: 1, gap?: 70 (°), angle?: 0 (rad Start),
//                 pulse?: { min: 1.6, period: 3 }, blink?: [3, 1.5], phase?: 0..1 (für blink/pulse) }
//   Laufzeit: ring (aktueller Radius), flameH (aktuelle Flammenhöhe), angle, hits, gapAt(a) → bool, info().
//   Modell 'feuerring' (opts { radius, flames, color }, state { anim, radius, angle, height, progress }); im Rad-Modus
//   blendet die Entität die Flammen in den Lücken und den Glutring aus (nur Darstellung).
//
// funkenling – wuseliges Feuerbällchen. Läuft auf einer Bahn (path/rail, auch senkrecht an Wänden: Punkte mit Höhe),
//   rund um den oberen Rand eines Blocks (block: { pos, size }), im Kreis (center + radius) oder frei: mode 'wusel'
//   (Standard ohne Bahn) – flitzt hüpfend hin und her, kehrt an Kanten und Wänden um, mit behavior 'chase' rückt er
//   langsam an eine Figur in sight m heran. **Jede Berührung verletzt (auch von oben).** Besiegbar **nur mit
//   Power-ups**: Tatzenhieb und Sturzflug (Krallen-Anzug), Schwanzhieb (Gleitblatt), Kanonenkugel (Kanonen-Helm),
//   Riesentrank, Funkelstern – dazu Explosionen. Feuerbälle prallen ab (Feuerwesen), Draufspringen verbrennt.
//   Daten: { kind: 'funkenling', path?|rail?, loop?, block?: { pos, size }, center?, radius?: 2.5, cw?: false, speed?: 2,
//            phase?: 0..1, count?: 1, spacing?: 1.5 (m entlang der Bahn), wait?: 0, mode?: 'wusel', pos, dir?,
//            behavior?: 'walk' | 'chase', sight?: 6, color?: 'rot' | 'blau' | 'pink', id?, drop? }
//   Zustände: move | poof (besiegt, verpufft 0,6 s) | flipped. Modell 'funkenling' (opts { color }, state { anim, speed }).
//
// glutball – springt im Takt aus (blauer) Lava hoch und fällt zurück (wie der Lavafunke Welt 4); unbesiegbar außer
//   Funkelstern, Riesentrank, Explosion; jede Berührung in der Luft verletzt. Reihen: count Glutbälle nebeneinander
//   (spacing m entlang dir), je Glied um stagger Takt versetzt – alle auf der Level-Uhr.
//   Daten: { kind: 'glutball', pos (Lava-Oberfläche), height?: 3.5, period?: 2.6, phase?: 0..1, count?: 1, spacing?: 1.6,
//            dir?: [1, 0], stagger?: 0.12, color?: 'blau' | 'rot' (Standard: Farbe der Lava darunter, sonst Thema, sonst
//            blau), id? }   Zustände: down | up. Laufzeit: jumps, height(), info(). Modell 'glutball'.

import * as THREE from 'three';
import { EnemyW2, figures, activeFigure, wrapAngle, clamp } from '../EnemyW2.js';
import { CourseEntity } from '../CourseEntity.js';
import { PathMover } from '../../level/PathMover.js';
import { getModel } from '../../models/index.js';

const TAU = Math.PI * 2;
const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

// =====================================================================================================================
// Feuerring
// =====================================================================================================================

class Feuerring extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'feuerring');
    this.mode = spec.mode === 'rad' ? 'rad' : 'puls';
    this.half.set(0.45, 0.32, 0.45);
    this.shadow = 0;
    this.base = this.pos.clone();
    this.radius = spec.radius ?? (this.mode === 'rad' ? 3 : 4);
    this.height = spec.height ?? 0.7;
    this.color = ['rot', 'blau', 'pink'].includes(spec.color) ? spec.color : 'rot';
    this.period = spec.period ?? 2.4;
    this.wait = spec.wait ?? 0.6;
    this.phase = ((spec.phase ?? 0) % 1 + 1) % 1;
    this.speed = spec.speed ?? 1.2;
    this.gaps = Math.max(0, Math.round(spec.gaps ?? 1));
    this.gapW = ((spec.gap ?? 70) * Math.PI) / 180;
    this.angle0 = spec.angle ?? 0;
    this.pulse = spec.pulse ?? null;
    this.blink = Array.isArray(spec.blink) ? spec.blink : null;
    this.flames = spec.flames ?? clamp(Math.round((TAU * this.radius) / (this.mode === 'rad' ? 0.5 : 0.85)), 12, 64);
    this.ring = 0.6; this.flameH = 0; this.angle = this.angle0; this.prog = 0; this.anim = 'idle';
    this.hits = 0;
    this.parts = null;
    if (level.view) {
      const m = this.setModel(getModel('feuerring', { radius: Math.max(this.radius, this.pulse?.min ?? 0), flames: this.flames, color: this.color }));
      const kids = m.root.children;
      this.parts = { flames: kids.find((o) => o.isInstancedMesh) ?? null, glow: kids.find((o) => o.isMesh && !o.isInstancedMesh && o.renderOrder === 2) ?? null };
      this.nFlames = clamp(Math.round(this.flames), 8, 64);
    }
    this.track();
  }

  /** Liegt der Winkel a (rad, wie im Modell: x = cos a, z = −sin a) in einer Lücke? (nur Rad) */
  gapAt(a) {
    if (this.mode !== 'rad' || !this.gaps) return false;
    for (let k = 0; k < this.gaps; k++) {
      const c = this.angle + (k / this.gaps) * TAU;
      if (Math.abs(wrapAngle(a - c)) < this.gapW / 2) return true;
    }
    return false;
  }

  /** Ringzustand aus der Level-Uhr. */
  track() {
    const t = this.level.time;
    if (this.mode === 'puls') {
      const cyc = this.period + Math.max(0, this.wait);
      const u = ((t + this.phase * cyc) % cyc + cyc) % cyc;
      if (u < this.period) {
        const p = u / this.period;
        this.prog = p;
        this.anim = 'pulse';
        this.ring = 0.6 + (this.radius - 0.6) * sm(p * 1.05);
        this.flameH = this.height * sm(p / 0.08) * (1 - sm((p - 0.88) / 0.12));
      } else { this.anim = 'idle'; this.prog = 0; this.ring = 0.62; this.flameH = 0; }
      return;
    }
    // Rad
    this.angle = this.angle0 + this.speed * t;
    let R = this.radius;
    if (this.pulse) {
      const per = this.pulse.period ?? 3, mn = this.pulse.min ?? Math.max(0.8, this.radius * 0.5);
      R = mn + (this.radius - mn) * (0.5 - 0.5 * Math.cos(((t / per) + this.phase) * TAU));
    }
    this.ring = R;
    let h = this.height;
    if (this.blink) {
      const on = this.blink[0] ?? 3, off = this.blink[1] ?? 1.5, cyc = on + off;
      const u = ((t + this.phase * cyc) % cyc + cyc) % cyc;
      if (u >= on) { const w = cyc - u; h = w < 0.5 ? this.height * 0.25 * (0.5 + 0.5 * Math.sin(t * 40)) : 0; this.warnOn = w < 0.5; }
      else { h = this.height * sm(u / 0.15); this.warnOn = false; }
    }
    this.flameH = h;
    this.anim = 'pulse';
    this.prog = 0.5;
  }

  update(dt) {
    this.track();
    const H = this.flameH;
    for (const p of figures(this.level)) {
      if (!activeFigure(p)) continue;
      const dx = p.pos.x - this.base.x, dz = p.pos.z - this.base.z, d = Math.hypot(dx, dz);
      if (p.pos.y > this.base.y + 2.5 || p.pos.y + p.half.y * 2 < this.base.y - 0.2) continue;
      // Flammenring (nur wenn er brennt und die Füße nicht darüber sind)
      if (H > 0.2 && Math.abs(d - this.ring) < 0.28 + p.half.x && p.pos.y < this.base.y + H * 0.8) {
        if (this.mode === 'rad' && this.gapAt(Math.atan2(-dz, dx))) continue;
        if (p.hurt(this)) this.hits++;
      }
    }
  }

  onPlayer() { return 'hurt'; }   // Brennerkern
  onHit() {}

  modelState() {
    return { anim: this.anim, radius: this.ring, angle: this.angle, height: this.mode === 'rad' ? Math.max(0.001, this.flameH) : this.height, progress: this.prog };
  }

  syncModel() {
    if (!this.model) return;
    this.model.root.position.copy(this.base);
    this.model.root.rotation.y = 0;
  }

  render(dt, t) {
    super.render(dt, t);
    if (this.mode !== 'rad' || !this.parts) return;
    // Rad: Flammen in den Lücken ausblenden, Glutring weg (ein geschlossener Ring würde Lücken verbergen)
    if (this.parts.glow) this.parts.glow.visible = false;
    const f = this.parts.flames;
    if (!f || !this.gaps) return;
    const N = this.nFlames;
    for (let i = 0; i < N; i++) if (this.gapAt(this.angle + (i / N) * TAU)) f.setMatrixAt(i, ZERO);
    f.instanceMatrix.needsUpdate = true;
  }

  info() {
    return { mode: this.mode, ring: +this.ring.toFixed(2), flameH: +this.flameH.toFixed(2), angle: +(((this.angle % TAU) + TAU) % TAU).toFixed(3), hits: this.hits, gaps: this.gaps };
  }
}

// =====================================================================================================================
// Funkenling
// =====================================================================================================================

function circlePath(c, r, n = 24, cw = false) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU * (cw ? -1 : 1);
    pts.push([c[0] + Math.cos(a) * r, c[1], c[2] - Math.sin(a) * r]);
  }
  return pts;
}
function blockPath(b, cw = false) {
  const [x, y, z] = b.pos, [w, h, d] = b.size ?? [2, 1, 2];
  const t = y + h, x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
  const pts = [[x0, t, z1], [x1, t, z1], [x1, t, z0], [x0, t, z0]];
  return cw ? pts.reverse() : pts;
}

const FUNK_KILL = new Set(['claw', 'cannon', 'bomb', 'mega', 'star']);
const POOF = 0.6;

class Funkenling extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'funkenling');
    this.half.set(0.28, 0.33, 0.28);
    this.shadow = 0.3;
    this.speed = spec.speed ?? 2;
    this.wake = spec.wake ?? 0;
    this.flying = true;
    this.color = ['rot', 'blau', 'pink'].includes(spec.color) ? spec.color : 'rot';
    this.behavior = spec.behavior ?? 'walk';
    this.sight = spec.sight ?? 6;
    this.state = 'move';
    this.mover = null;
    this.hopT = ((spec.phase ?? 0) * 7.3) % 1;
    let pts = spec.path ?? spec.rail ?? null, loop = spec.loop;
    if (spec.block) { pts = blockPath(spec.block, !!spec.cw); loop = true; }
    else if (spec.center) { pts = circlePath(spec.center, spec.radius ?? 2.5, 28, !!spec.cw); loop = true; }
    if (pts?.length >= 2 && spec.mode !== 'wusel') {
      this.mover = new PathMover(pts, { speed: this.speed, mode: (loop ?? pts.length >= 3) ? 'loop' : 'pingpong', wait: spec.wait ?? 0, phase: (((spec.phase ?? 0) % 1) + 1) % 1 });
      const p = this.mover.pos; this.pos.set(p.x, p.y, p.z);
    }
    this.moved = 0;
    if (level.view) this.setModel(getModel('funkenling', { color: this.color }));
    this.initShadows(1);
  }

  get s() { return this.mover?.s ?? 0; }

  update(dt) {
    this.stateT += dt;
    if (this.state === 'poof') { if (this.stateT >= POOF) this.kill(); return; }
    if (this.updateDefeat(dt)) return;
    const x0 = this.pos.x, z0 = this.pos.z;
    if (this.mover) {
      this.mover.step(dt);
      const p = this.mover.pos;
      this.pos.set(p.x, p.y, p.z);
      const dx = p.x - x0, dz = p.z - z0;
      if (dx * dx + dz * dz > 1e-9) this.yaw = Math.atan2(-dz, dx);
    } else {
      // wuseln: flitzt hüpfend hin und her (bzw. rückt an die Figur heran)
      this.hopT += dt * 2.6;
      if (this.behavior === 'chase' && this.canSee(this.sight, 2.5)) this.chase(dt, this.speed * 0.8);
      else this.walk(dt, this.speed);
      if (this.grounded && this.hopT >= 1) { this.hopT = 0; this.vel.y = 3.2; this.grounded = false; }
    }
    this.moved += Math.hypot(this.pos.x - x0, this.pos.z - z0);
  }

  onPlayer(player, contact) {
    if (this.defeated) return 'none';
    if (contact.dive) { this.onHit('claw', player); return 'none'; }
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated) return;
    if (FUNK_KILL.has(kind)) { this.poof(source); return; }
    if (kind !== 'bump' && kind !== 'pound') this.level.effects?.sparks(this.center(), 4);
  }

  poof() {
    if (this.defeated) return;
    this.touch = false;
    this.setState('poof');
    this.level.effects?.sparks(this.center(), 12);
    this.level.sfx('stomp');
    this.markDefeated();
  }

  modelState() {
    if (this.state === 'poof' || this.state === 'flipped') return { anim: 'defeated' };
    return { anim: 'move', speed: this.speed };
  }

  info() { return { state: this.state, s: +this.s.toFixed(2), moved: +this.moved.toFixed(2), x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2), defeated: this.defeated }; }
}

function makeFunkenling(level, spec) {
  const n = Math.max(1, Math.round(spec.count ?? 1));
  const first = new Funkenling(level, { ...spec, count: 1 });
  if (n > 1 && first.mover) {
    const L = first.mover.length || 1, sp = spec.spacing ?? 1.5;
    for (let i = 1; i < n; i++) level.spawn('funkenling', { ...spec, id: spec.id ? `${spec.id}_${i}` : undefined, count: 1, phase: (spec.phase ?? 0) - (i * sp) / L });
  }
  return first;
}

// =====================================================================================================================
// Glutball
// =====================================================================================================================

const GLUT_G = 22;

class Glutball extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'glutball');
    this.flying = true;
    this.wake = 0;
    this.half.set(0.28, 0.28, 0.28);
    this.shadow = 0;
    this.base = this.pos.clone();
    this.period = spec.period ?? 2.6;
    this.phase = ((spec.phase ?? 0) % 1 + 1) % 1;
    this.jump = spec.height ?? 3.5;
    let g = GLUT_G;
    const tFlight = (gg) => 2 * Math.sqrt((2 * this.jump) / gg);
    if (tFlight(g) > this.period * 0.85) g = (8 * this.jump) / (this.period * 0.85) ** 2;
    this.g = g;
    this.v0 = Math.sqrt(2 * g * this.jump);
    this.flight = tFlight(g);
    this.color = spec.color === 'rot' || spec.color === 'blau' ? spec.color : this.lavaColor();
    this.state = 'down';
    this.jumps = 0;
    this.touch = false;
    if (level.view) { this.setModel(getModel('glutball', { color: this.color })); this.model.root.visible = false; }
    this.track();
  }

  /** Farbe der Lava unter pos (Form lavaColor), sonst Thema, sonst blau. */
  lavaColor() {
    for (const s of this.level.world.overlapAABB({ x: this.base.x, y: this.base.y - 0.4, z: this.base.z }, { x: 0.1, y: 0.5, z: 0.1 })) {
      if (s.kill === 'lava' && s.lavaColor) return s.lavaColor === 'blau' ? 'blau' : 'rot';
    }
    const th = this.level.view?.theme ?? null;
    if (th?.lavaColor) return th.lavaColor === 'blau' ? 'blau' : 'rot';
    return 'blau';
  }

  cycleT() { return (((this.level.time / this.period + this.phase) % 1) + 1) % 1 * this.period; }
  height() { return this.pos.y + 0.3 - this.base.y; }

  track() {
    const t = this.cycleT();
    if (t < this.flight) {
      const y = this.v0 * t - 0.5 * this.g * t * t;
      if (this.state !== 'up') { this.setState('up'); this.jumps++; this.level.effects?.sparks({ x: this.base.x, y: this.base.y + 0.2, z: this.base.z }, 4); }
      this.pos.set(this.base.x, this.base.y + Math.max(-0.6, y) - 0.3, this.base.z);
      this.vel.y = this.v0 - this.g * t;
      this.touch = y > -0.1;
    } else {
      if (this.state !== 'down') { this.setState('down'); this.level.effects?.sparks({ x: this.base.x, y: this.base.y + 0.1, z: this.base.z }, 3); }
      this.pos.set(this.base.x, this.base.y - 0.9, this.base.z);
      this.vel.y = 0;
      this.touch = false;
    }
  }

  update(dt) {
    this.stateT += dt;
    if (this.updateDefeat(dt)) return;
    this.track();
  }

  onPlayer() { return this.defeated || !this.touch ? 'none' : 'hurt'; }

  onHit(kind, source) {
    if (this.defeated || this.state !== 'up') return;
    if (kind === 'star' || kind === 'mega' || kind === 'bomb') this.flip(source, 5);
  }

  modelState() {
    if (this.state === 'flipped') return { anim: 'defeated' };
    return { anim: this.state === 'up' ? (this.vel.y > 0 ? 'rise' : 'fall') : 'idle' };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    this.model.root.visible = this.state === 'up' || this.state === 'flipped';
  }

  info() { return { state: this.state, y: +this.pos.y.toFixed(2), h: +this.height().toFixed(2), jumps: this.jumps, touch: this.touch, color: this.color }; }
}

function makeGlut(level, spec) {
  const n = Math.max(1, Math.round(spec.count ?? 1));
  const d = Array.isArray(spec.dir) ? spec.dir : [1, 0];
  const l = Math.hypot(d[0], d[1]) || 1;
  const dx = d[0] / l, dz = d[1] / l;
  const sp = spec.spacing ?? 1.6, st = spec.stagger ?? 0.12;
  const p = spec.pos ?? [0, 0, 0];
  const first = new Glutball(level, { ...spec, count: 1 });
  for (let i = 1; i < n; i++) {
    level.spawn('glutball', { ...spec, id: spec.id ? `${spec.id}_${i}` : undefined, count: 1, pos: [p[0] + dx * sp * i, p[1], p[2] + dz * sp * i], phase: (spec.phase ?? 0) - st * i });
  }
  return first;
}

export const KINDS = {
  feuerring: (level, spec) => new Feuerring(level, spec),
  funkenling: makeFunkenling,
  glutball: makeGlut,
};
