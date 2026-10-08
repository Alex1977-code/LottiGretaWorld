// Bewegung auf einem Punktpfad (bewegliche Plattformen, später auch Gegner-Bahnen):
//   new PathMover(points, { speed: 2, mode: 'pingpong'|'loop', wait: 0.5, phase: 0..1 })
//   step(dt) → { dx, dy, dz } (Verschiebung in diesem Schritt), pos = aktuelle Lage
// pingpong: hin und zurück, an den Enden `wait` s Pause; loop: geschlossene Runde (letzter → erster Punkt).

export class PathMover {
  constructor(points, opts = {}) {
    this.pts = points.map((p) => ({ x: p[0], y: p[1], z: p[2] }));
    this.mode = opts.mode === 'loop' ? 'loop' : 'pingpong';
    this.speed = opts.speed ?? 2;
    this.wait = opts.wait ?? 0.4;
    if (this.mode === 'loop' && this.pts.length > 2) this.pts.push({ ...this.pts[0] });
    this.seg = [];
    let L = 0;
    for (let i = 0; i < this.pts.length - 1; i++) {
      const a = this.pts[i], b = this.pts[i + 1];
      const l = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
      this.seg.push({ a, b, l, s0: L });
      L += l;
    }
    this.length = L;
    this.s = (opts.phase ?? 0) * L;
    this.dir = 1;
    this.pause = 0;
    this.pos = this.at(this.s, {});
    this.delta = { dx: 0, dy: 0, dz: 0 };
  }

  at(s, out) {
    if (!this.seg.length) { const p = this.pts[0] ?? { x: 0, y: 0, z: 0 }; out.x = p.x; out.y = p.y; out.z = p.z; return out; }
    let k = this.seg.length - 1;
    for (let i = 0; i < this.seg.length; i++) if (s <= this.seg[i].s0 + this.seg[i].l) { k = i; break; }
    const g = this.seg[k];
    const t = g.l > 0 ? Math.max(0, Math.min(1, (s - g.s0) / g.l)) : 0;
    out.x = g.a.x + (g.b.x - g.a.x) * t; out.y = g.a.y + (g.b.y - g.a.y) * t; out.z = g.a.z + (g.b.z - g.a.z) * t;
    return out;
  }

  step(dt) {
    const ox = this.pos.x, oy = this.pos.y, oz = this.pos.z;
    if (this.length > 0) {
      if (this.pause > 0) this.pause -= dt;
      else if (this.mode === 'loop') {
        this.s = (this.s + this.speed * dt) % this.length;
      } else {
        this.s += this.speed * dt * this.dir;
        if (this.s >= this.length) { this.s = this.length; this.dir = -1; this.pause = this.wait; }
        else if (this.s <= 0) { this.s = 0; this.dir = 1; this.pause = this.wait; }
      }
      this.at(this.s, this.pos);
    }
    this.delta.dx = this.pos.x - ox; this.delta.dy = this.pos.y - oy; this.delta.dz = this.pos.z - oz;
    return this.delta;
  }
}
