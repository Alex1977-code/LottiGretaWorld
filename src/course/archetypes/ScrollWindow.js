// Bildfenster des Autoscrollers (Archetyp `autoscroller`, Bauplan „Autoscroller – Plattform/Fahrzeug bewegt sich,
// Kamera folgt fest“). Reine Mathematik ohne Three.js/Phaser (auch in Node prüfbar):
//
//   ScrollPath   Polylinie [[x, y, z], …] mit Bogenlänge: at(s), dirAt(s) (Richtung, an Ecken über ±3 m
//                weich gemittelt), headingYaw(s) (Kamera-Gier in rad, 0 = Blick nach −Z)
//   ScrollWindow Fenstermitte fährt mit `speed` (abschnittsweise `speeds`) entlang des Pfads von `start` bis
//                `end`: Zustand wait → run → done, sanftes Anfahren/Abbremsen (`accel`), `clock` (s seit Fahrtbeginn,
//                läuft nach dem Ende weiter – Fahrzeuge mit eigenem Tempo fahren bis zu ihrem Halt),
//                local(p) → { along, across, up } (Lage eines Punkts relativ zum Fenster), snapshot()/restore().
//
// Daten (LEVEL.scroll), siehe kinds/autoscroller.js:
//   path: [[x, y, z], …]  Fensterlinie (y = Fahrebene der Fahrzeuge, z. B. Schienenoberkante)
//   axis: '-z' | 'z' | 'x' | '-x' | 'y' | '-y'  statt path: gerade Fahrt; start/end/from = Koordinate auf der Achse,
//         line: [a, b] = die beiden anderen Koordinaten (bei z/-z: [x, y], bei x/-x: [z, y], bei y/-y: [x, z])
//   start (0 bzw. Koordinate), end (Pfadlänge), speed (m/s), speeds: [{ from, speed }], accel (6 m/s²),
//   delay (1 s nach Levelstart bzw. Auslöser), trigger: { min, max } (Fahrt beginnt, wenn die Figur hineingeht)

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export class ScrollPath {
  /** @param {number[][]} points [[x, y, z], …] (mindestens ein Punkt; ein Punkt = Fahrt nach −Z) */
  constructor(points) {
    const pts = (points ?? [[0, 0, 0]]).map((p) => ({ x: p[0], y: p[1], z: p[2] }));
    if (pts.length === 1) pts.push({ x: pts[0].x, y: pts[0].y, z: pts[0].z - 1000 });
    this.pts = pts;
    this.seg = [];
    let L = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const l = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
      if (l < 1e-6) continue;
      this.seg.push({ a, b, l, s0: L, dx: (b.x - a.x) / l, dy: (b.y - a.y) / l, dz: (b.z - a.z) / l });
      L += l;
    }
    this.length = L;
    this.round = 3;        // m: Richtungswechsel an Ecken über ±round gemittelt
  }

  segAt(s) {
    const seg = this.seg;
    if (!seg.length) return null;
    for (let i = 0; i < seg.length; i++) if (s <= seg[i].s0 + seg[i].l) return seg[i];
    return seg[seg.length - 1];
  }

  /** Punkt bei Bogenlänge s (außerhalb [0, L] gerade verlängert). */
  at(s, out = {}) {
    const g = this.segAt(s);
    if (!g) { const p = this.pts[0]; out.x = p.x; out.y = p.y; out.z = p.z; return out; }
    const t = s - g.s0;
    out.x = g.a.x + g.dx * t; out.y = g.a.y + g.dy * t; out.z = g.a.z + g.dz * t;
    return out;
  }

  /** Fahrtrichtung (Einheitsvektor, 3D) bei s; an Ecken weich gemittelt. */
  dirAt(s, out = {}) {
    const r = this.round;
    const a = this.at(clamp(s - r, 0, this.length), this._a ?? (this._a = {}));
    const b = this.at(clamp(s + r, 0, this.length), this._b ?? (this._b = {}));
    let dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    let l = Math.hypot(dx, dy, dz);
    if (l < 1e-6) { const g = this.segAt(s); dx = g?.dx ?? 0; dy = g?.dy ?? 0; dz = g?.dz ?? -1; l = Math.hypot(dx, dy, dz) || 1; }
    out.x = dx / l; out.y = dy / l; out.z = dz / l;
    return out;
  }

  /** Kamera-Gier (rad, Konvention CameraRig: 0 = Kamera hinter +Z mit Blick nach −Z) der Fahrtrichtung bei s. */
  headingYaw(s) {
    const d = this.dirAt(s, this._d ?? (this._d = {}));
    const h = Math.hypot(d.x, d.z);
    if (h < 0.2) { this._lastYaw ??= 0; return this._lastYaw; }   // senkrechte Fahrt: letzte waagerechte Richtung
    this._lastYaw = Math.atan2(-d.x, -d.z);
    return this._lastYaw;
  }
}

const AXES = {
  z: { k: 'z', sign: 1 }, '-z': { k: 'z', sign: -1 }, x: { k: 'x', sign: 1 }, '-x': { k: 'x', sign: -1 },
  y: { k: 'y', sign: 1 }, '-y': { k: 'y', sign: -1 },
};

/**
 * LEVEL.scroll → { path: ScrollPath, start, end, speeds: [{ s, speed }] (nach s sortiert), toS(v) }.
 * `levelStart` = LEVEL.start.pos (Rückfall für axis-line).
 */
export function parseScroll(cfg = {}, levelStart = [0, 0, 0]) {
  let path, toS;
  if (cfg.path) {
    path = new ScrollPath(cfg.path);
    toS = (v) => v;
  } else {
    const ax = AXES[cfg.axis ?? '-z'] ?? AXES['-z'];
    const line = cfg.line ?? (ax.k === 'z' ? [levelStart[0], levelStart[1]] : ax.k === 'x' ? [levelStart[2], levelStart[1]] : [levelStart[0], levelStart[2]]);
    const a0 = cfg.start ?? (ax.k === 'z' ? levelStart[2] : ax.k === 'x' ? levelStart[0] : levelStart[1]);
    const a1 = cfg.end ?? a0 + ax.sign * 200;
    const pt = (v) => (ax.k === 'z' ? [line[0], line[1], v] : ax.k === 'x' ? [v, line[1], line[0]] : [line[0], v, line[1]]);
    path = new ScrollPath([pt(a0), pt(a1 + ax.sign * 400)]);   // über das Ende hinaus verlängert (Fahrzeuge fahren weiter)
    toS = (v) => (v - a0) * ax.sign;
    return finish(cfg, path, toS, 0, toS(a1));
  }
  return finish(cfg, path, toS, cfg.start ?? 0, cfg.end ?? path.length);
}

function finish(cfg, path, toS, start, end) {
  const speeds = (cfg.speeds ?? []).map((e) => ({ s: toS(e.from), speed: e.speed })).sort((a, b) => a.s - b.s);
  return { path, start, end: Math.max(start, end), speeds, toS };
}

export class ScrollWindow {
  /**
   * @param {object} cfg LEVEL.scroll
   * @param {number[]} levelStart LEVEL.start.pos
   */
  constructor(cfg = {}, levelStart = [0, 0, 0]) {
    this.cfg = cfg;
    const p = parseScroll(cfg, levelStart);
    this.path = p.path;
    this.s0 = p.start;
    this.s1 = p.end;
    this.speeds = p.speeds;
    this.toS = p.toS;
    this.base = cfg.speed ?? 4;
    this.accel = cfg.accel ?? 6;
    this.delay = cfg.delay ?? 1;
    this.trigger = cfg.trigger ?? null;
    this.center = { x: 0, y: 0, z: 0 };
    this.dir = { x: 0, y: 0, z: -1 };
    this.side = { x: 1, y: 0, z: 0 };
    this.reset();
  }

  /** Zurück auf den Anfang (Zustand wait). */
  reset() {
    this.s = this.s0;
    this.speed = 0;
    this.clock = 0;          // s seit Fahrtbeginn (läuft nach dem Ende weiter)
    this.waitT = 0;
    this.triggered = !this.trigger;
    this.state = 'wait';
    this.travel = 0;         // m seit Fahrtbeginn (= s − s0)
    this.refresh();
  }

  /** Soll-Tempo bei s (letzter speeds-Eintrag mit from ≤ s, sonst speed). */
  speedAt(s) {
    let v = this.base;
    for (const e of this.speeds) { if (e.s <= s + 1e-9) v = e.speed; else break; }
    return v;
  }

  /** Einen Simulationsschritt weiter. player (optional) für den Auslöser. Liefert true, wenn die Fahrt gerade endete. */
  step(dt, player) {
    if (this.state === 'wait') {
      if (!this.triggered && player && inBox(player.pos, this.trigger)) this.triggered = true;
      if (this.triggered) this.waitT += dt;
      if (this.triggered && this.waitT >= this.delay) this.state = this.s >= this.s1 ? 'done' : 'run';
      return false;
    }
    this.clock += dt;
    if (this.state === 'done') return false;
    const want = this.speedAt(this.s);
    // Bremsweg bis zum Ende: v ≤ √(2·a·Rest)
    const rest = this.s1 - this.s;
    const vmax = Math.sqrt(Math.max(0, 2 * this.accel * rest));
    const target = Math.min(want, vmax + 0.05);
    const dv = this.accel * dt;
    this.speed = this.speed < target ? Math.min(target, this.speed + dv) : Math.max(target, this.speed - dv * 1.5);
    this.s = Math.min(this.s1, this.s + this.speed * dt);
    this.travel = this.s - this.s0;
    this.refresh();
    if (this.s1 - this.s < 1e-3) {
      this.s = this.s1;
      this.speed = 0;
      this.state = 'done';
      this.refresh();
      return true;
    }
    return false;
  }

  refresh() {
    this.path.at(this.s, this.center);
    const d = this.path.dirAt(this.s, this.dir);
    // seitlich (rechts) in der Waagerechten; bei senkrechter Fahrt aus der letzten Kamera-Gier
    const h = Math.hypot(d.x, d.z);
    if (h > 0.2) { this.side.x = -d.z / h; this.side.y = 0; this.side.z = d.x / h; }
    else { const yaw = this.path.headingYaw(this.s); this.side.x = Math.cos(yaw); this.side.y = 0; this.side.z = -Math.sin(yaw); }
  }

  /** Lage eines Punkts relativ zum Fenster: along (vor/zurück entlang der Fahrt), across (rechts), up. */
  local(p, out = {}) {
    const c = this.center, d = this.dir, sd = this.side;
    const rx = p.x - c.x, ry = p.y - c.y, rz = p.z - c.z;
    out.along = rx * d.x + ry * d.y + rz * d.z;
    out.across = rx * sd.x + ry * sd.y + rz * sd.z;
    out.up = ry;
    return out;
  }

  /** Kamera-Gier (rad) der Fahrtrichtung an der Fenstermitte. */
  headingYaw() { return this.path.headingYaw(this.s); }

  get active() { return this.state !== 'done'; }

  snapshot() {
    return { s: this.s, speed: this.speed, clock: this.clock, waitT: this.waitT, triggered: this.triggered, state: this.state };
  }

  restore(snap) {
    if (!snap) { this.reset(); return; }
    Object.assign(this, snap);
    this.travel = this.s - this.s0;
    this.refresh();
  }

  info() {
    const c = this.center;
    return {
      state: this.state, s: +this.s.toFixed(3), start: this.s0, end: this.s1, speed: +this.speed.toFixed(3), clock: +this.clock.toFixed(3),
      center: [+c.x.toFixed(3), +c.y.toFixed(3), +c.z.toFixed(3)], dir: [+this.dir.x.toFixed(3), +this.dir.y.toFixed(3), +this.dir.z.toFixed(3)],
    };
  }
}

export function inBox(p, b) {
  if (!b) return false;
  return p.x >= b.min[0] && p.x <= b.max[0] && p.y >= b.min[1] && p.y <= b.max[1] && p.z >= b.min[2] && p.z <= b.max[2];
}
