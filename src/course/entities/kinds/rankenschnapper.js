// Rankenschnapper (4-2 „Giftsumpf“, Bauplan: „wächst aus Giftwasser“, Konter: Kopf treffen). Eigene Figur: türkiser
// Schnappkopf an einer langen Ranke.
//
// Die Ranke wächst von der Wurzel (pos, z. B. an der Wasserlinie) entlang eines Pfads über den Weg und zieht sich wieder
// zurück; der Kopf an der Spitze schnappt nach Figuren in Reichweite. **Der Rankenkörper ist begehbar** (Einweg-Quader
// entlang der gewachsenen Ranke – „über Rankenschnapper als Stufen“), **auf den Kopf springen = Abprall** ohne Schaden
// (er zuckt zurück – „von einem Rankenschnapper abprallen“). Besiegt: **Stampfattacke auf den Kopf**, Feuer, Krallen /
// Schwanzhieb, Wurf, Panzer, Biss, Faust, Kanonenkugel, Explosion, Riesentrank, Funkelstern (hp Treffer, Standard 1;
// Pause 0,5 s). Seitlich in den Kopf = Biss (Treffer der Figur); die Ranke selbst ist harmlos. Giftwasser/Lava
// schaden ihm nicht (er wurzelt darin). Hängende Variante (hang: true) wächst von der Decke nach unten.
//
// Daten: { kind: 'rankenschnapper', pos: [x, y, z] (Wurzel),
//          path?: [[x, y, z], …] (Weltpunkte ab der Wurzel; fehlt der erste = pos, wird pos vorangestellt; geglättet),
//          sonst Standardpfad: dir|yaw (Richtung über den Weg), length?: 4.5 (Gesamtlänge), height?: 1.45 (Höhe über
//          der Wurzel, mit hang: Tiefe unter der Decke), hang?: false,
//          mode?: 'cycle' (wachsen – halten/schnappen – zurück – warten) | 'static' (immer ausgewachsen) | 'sense'
//                 (wächst, solange eine Figur ≤ sight m von der Wurzel ist),
//          grow?: { out: 1.4, hold: 2.4, back: 1.2, wait: 1.6 } (s) bzw. [out, hold, back, wait], min?: 0.12 (Rest
//          beim Zurückziehen, Anteil), phase?: 0..1 (Versatz im Zyklus), sight?: 7, reach?: 2.2 (Schnappen),
//          walk?: true (Körper begehbar), size?: 1 (Maßstab), hp?: 1, id?, drop? }
// Zustände: grow (wächst/zieht zurück, Anteil grow) | hit (0,5 s) | defeated (welkt 1,2 s) → weg.
// Laufzeit: grow (0..1), tip (m), head (Weltlage der Kopfmitte), snapping, bounces, hp, info().
// Modell 'rankenschnapper' (opts { segments }, state { anim: idle|snap|hit|defeated, grow, path (lokal), progress }).

import * as THREE from 'three';
import { EnemyW2, figures, activeFigure, STRONG, clamp } from '../EnemyW2.js';
import { getModel } from '../../models/index.js';

const SEG = 0.38;          // Länge eines Rankenglieds im Modell
const HEAD_FWD = 0.38;     // Kopfmitte vor der Rankenspitze (Modell)
const HEAD_R = 0.45;       // Trefferkugel des Kopfes
const VINE_R = 0.16;       // Rankenradius
const BOX_STEP = 0.45;     // Länge eines Lauf-Quaders entlang der Ranke
const SNAP = 0.7;          // Schnapp-Zyklus (Modell)
const smooth = (k) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };

/** Standardpfad wie im Modell: senkrecht hoch, Bogen, waagerecht nach vorn (lokal, +X vorn). */
function defaultPath(length, height, hang) {
  const sy = hang ? -1 : 1;
  const h = height, rest = Math.max(0.4, length - h - 0.25);
  return [[0, 0, 0], [0, h * 0.586 * sy, 0], [0.42, h * 0.952 * sy, 0], [0.9, h * sy, 0], [0.9 + rest, h * sy, 0]];
}

class Rankenschnapper extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'rankenschnapper');
    this.flying = true;               // Giftwasser lässt ihn nicht versinken
    this.wake = 0;
    this.path = null;
    this.size = spec.size ?? 1;
    this.root = this.pos.clone();
    this.maxHp = spec.hp ?? 1;
    this.hp = this.maxHp;
    this.mode = spec.mode ?? 'cycle';
    const g = spec.grow;
    const G = Array.isArray(g) ? { out: g[0], hold: g[1], back: g[2], wait: g[3] } : { ...(g ?? {}) };
    this.times = { out: G.out ?? 1.4, hold: G.hold ?? 2.4, back: G.back ?? 1.2, wait: G.wait ?? 1.6 };
    this.cycle = this.times.out + this.times.hold + this.times.back + this.times.wait;
    this.t = (((spec.phase ?? 0) % 1 + 1) % 1) * this.cycle;
    this.min = spec.min ?? 0.12;
    this.sight = spec.sight ?? 7;
    this.reach = (spec.reach ?? 2.2) * Math.max(1, this.size * 0.8);
    this.walkable = spec.walk !== false;
    // Pfad in Weltkoordinaten → lokal (Wurzel = Ursprung, Modell-Maßstab size)
    let pts;
    if (Array.isArray(spec.path) && spec.path.length >= 2) {
      pts = spec.path.map((p) => [p[0], p[1], p[2]]);
      const p0 = pts[0];
      if (Math.hypot(p0[0] - this.root.x, p0[1] - this.root.y, p0[2] - this.root.z) > 0.05) pts.unshift([this.root.x, this.root.y, this.root.z]);
      this.local = pts.map((p) => [(p[0] - this.root.x) / this.size, (p[1] - this.root.y) / this.size, (p[2] - this.root.z) / this.size]);
    } else {
      const c = this.dir.x, s = this.dir.z;
      this.local = defaultPath((spec.length ?? 4.5) / this.size, (spec.height ?? 1.45) / this.size, !!spec.hang)
        .map(([x, y]) => [x * c, y, x * s]);
    }
    const v = this.local.map((p) => new THREE.Vector3(p[0] * this.size + this.root.x, p[1] * this.size + this.root.y, p[2] * this.size + this.root.z));
    this.curve = v.length >= 3 ? new THREE.CatmullRomCurve3(v, false, 'centripetal', 0.5) : new THREE.LineCurve3(v[0], v[1]);
    this.curve.arcLengthDivisions = 120;
    this.L = Math.max(0.2, this.curve.getLength());
    this.segments = clamp(Math.round(this.L / this.size / SEG), 4, 40);
    this.grow = this.mode === 'static' ? 1 : this.min;
    this.anim = 'idle';
    this.snapT = 0;
    this.snapping = false;
    this.bounces = 0;
    this.flinch = 0;
    this.headC = new THREE.Vector3();
    this.tangent = new THREE.Vector3(1, 0, 0);
    this.half.set(HEAD_R * this.size, HEAD_R * this.size, HEAD_R * this.size);
    this.shadow = 0.5 * this.size;
    // Lauf-Quader entlang der Ranke (Einweg, nur gewachsene Teile)
    this.boxes = [];
    if (this.walkable) {
      const n = Math.max(1, Math.ceil(this.L / BOX_STEP));
      const a = new THREE.Vector3(), b = new THREE.Vector3();
      const r = Math.max(0.3, (VINE_R + 0.12) * this.size), rt = VINE_R * this.size;
      for (let i = 0; i < n; i++) {
        const s0 = i * BOX_STEP, s1 = Math.min(this.L, (i + 1) * BOX_STEP);
        this.curve.getPointAt(s0 / this.L, a); this.curve.getPointAt(s1 / this.L, b);
        // fast senkrechte Stücke tragen nicht (man läuft nicht die Ranke hoch)
        if (Math.abs(b.y - a.y) > (s1 - s0) * 0.8) continue;
        const shape = {
          type: 'box', min: [Math.min(a.x, b.x) - r, Math.min(a.y, b.y) - rt, Math.min(a.z, b.z) - r],
          max: [Math.max(a.x, b.x) + r, Math.max(a.y, b.y) + rt, Math.max(a.z, b.z) + r], oneWay: true, camIgnore: true, solid: false, tag: 'ranke',
        };
        const id = this.addShape(shape);
        this.boxes.push({ id, s1, shape });
      }
    }
    if (level.view) {
      this.setModel(getModel('rankenschnapper', { segments: this.segments }));
      this.model.root.scale.setScalar(this.size);
    }
    this.initShadows(2);
    this.place();
  }

  get tip() { return this.grow * this.L; }

  /** Kopfmitte (Weltlage) aus der Wachstums-Spitze. */
  place() {
    const u = clamp(this.tip / this.L, 0.0005, 1);
    this.curve.getPointAt(u, this.headC);
    this.curve.getTangentAt(u, this.tangent);
    this.headC.addScaledVector(this.tangent, HEAD_FWD * this.size);
    const r = HEAD_R * this.size;
    this.pos.set(this.headC.x, this.headC.y - r, this.headC.z);
    // Lauf-Quader: nur hinter dem Kopf
    for (const b of this.boxes) {
      const on = !this.defeated && b.s1 <= this.tip - 0.35 * this.size;
      if (b.shape.solid !== on) b.shape.solid = on;
    }
  }

  /** Figur in Schnapp-Reichweite des Kopfes? */
  figureNear(r) {
    for (const p of figures(this.level)) {
      if (!activeFigure(p)) continue;
      const dx = p.pos.x - this.headC.x, dy = p.pos.y + p.half.y - this.headC.y, dz = p.pos.z - this.headC.z;
      if (dx * dx + dy * dy + dz * dz < r * r) return p;
    }
    return null;
  }

  figureNearRoot(r) {
    for (const p of figures(this.level)) {
      if (!activeFigure(p)) continue;
      if (Math.hypot(p.pos.x - this.root.x, p.pos.z - this.root.z) < r) return true;
    }
    return false;
  }

  update(dt) {
    this.stateT += dt;
    if (this.state === 'defeated') {
      if (this.stateT >= 1.3) this.kill();
      return;
    }
    if (this.state === 'hit' && this.stateT >= 0.5) this.setState('grow');
    if (this.flinch > 0) this.flinch -= dt;
    // Wachsen / Zurückziehen
    let g = this.grow;
    if (this.mode === 'static') g = 1;
    else if (this.mode === 'sense') {
      const want = this.figureNearRoot(this.sight) ? 1 : this.min;
      const rate = want > g ? 1 / this.times.out : 1 / this.times.back;
      g += clamp(want - g, -rate * dt, rate * dt);
    } else {
      this.t = (this.t + dt) % this.cycle;
      const T = this.times, t = this.t;
      if (t < T.wait) g = this.min;
      else if (t < T.wait + T.out) g = this.min + (1 - this.min) * smooth((t - T.wait) / T.out);
      else if (t < T.wait + T.out + T.hold) g = 1;
      else g = 1 - (1 - this.min) * smooth((t - T.wait - T.out - T.hold) / T.back);
    }
    this.grow = clamp(g, 0, 1);
    this.place();
    // Schnappen: Figur in Reichweite des (gewachsenen) Kopfes
    const near = this.state !== 'hit' && this.flinch <= 0 && this.grow > 0.35 && this.figureNear(this.reach);
    if (near && !this.snapping) { this.snapping = true; this.snapT = 0; this.level.sfx('peck'); }
    if (this.snapping) {
      this.snapT += dt;
      if (!near && this.snapT % SNAP < dt) this.snapping = false;
    }
  }

  // ------------------------------------------------------------------ Treffer

  /** Ein Treffer (hp); true = besiegt. */
  damage(source) {
    if (this.defeated || (this.state === 'hit' && this.stateT < 0.5)) return false;
    this.hp--;
    this.level.effects?.sparks(this.headC, 8);
    if (this.hp > 0) { this.setState('hit'); this.level.sfx('boss_hit'); return false; }
    this.defeat();
    return true;
  }

  defeat() {
    if (this.defeated) return;
    this.setState('defeated');
    this.touch = false;
    this.snapping = false;
    for (const b of this.boxes) b.shape.solid = false;
    this.level.sfx('stomp');
    this.level.effects?.sparks(this.headC, 10);
    this.markDefeated();
  }

  onPlayer(player, contact) {
    if (this.defeated || this.state === 'defeated') return 'none';
    const pound = contact.pound || player.state === 'groundpound';
    const above = player.prevPos ? player.prevPos.y >= this.headC.y - 0.05 : player.pos.y >= this.headC.y;
    if (pound && above) { this.damage(player); return 'none'; }
    if (this.state === 'hit' || this.flinch > 0) return above && player.vel.y <= 1 ? 'stomp' : 'none';
    if (above && player.vel.y <= 1) {
      // Abprall vom Kopf (kein Schaden): Kopf zuckt zurück
      this.flinch = 0.5;
      this.bounces++;
      this.level.sfx('bounce');
      return 'stomp';
    }
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated) return;
    if (kind === 'pound' || kind === 'bump' || kind === 'slide') return;    // Stampfwelle daneben, Stöße: zu weit weg
    if (STRONG.has(kind)) { this.hp = 1; this.damage(source); return; }
    this.damage(source);
  }

  // ------------------------------------------------------------------ Darstellung

  modelState() {
    const anim = this.state === 'defeated' ? 'defeated' : this.state === 'hit' || this.flinch > 0 ? 'hit' : this.snapping ? 'snap' : 'idle';
    const st = { anim, grow: this.grow, path: this.local };
    if (anim === 'snap') st.progress = (this.snapT % SNAP) / SNAP;
    return st;
  }

  syncModel() {
    if (!this.model) return;
    const r = this.model.root;
    r.position.copy(this.root);
    r.rotation.set(0, 0, 0);
  }

  info() {
    return {
      state: this.state, grow: +this.grow.toFixed(3), tip: +this.tip.toFixed(2), L: +this.L.toFixed(2), hp: this.hp, snapping: this.snapping,
      head: { x: +this.headC.x.toFixed(2), y: +this.headC.y.toFixed(2), z: +this.headC.z.toFixed(2) }, solid: this.boxes.filter((b) => b.shape.solid).length,
      boxes: this.boxes.length, bounces: this.bounces, defeated: this.defeated,
    };
  }
}

export const KINDS = { rankenschnapper: (level, spec) => new Rankenschnapper(level, spec) };
