// Fluss-Netz des Reit-Levels (Archetyp `ride`, Präzisierung Ritt/Diorama): reine Mathematik ohne Three.js,
// damit Bausteine, Spielfigur, Kamera und Node-Tests dieselben Daten nutzen.
//
// Ein Netz besteht aus Kanälen (geglättete Mittellinien) und Hindernissen/Hilfen im Wasser:
//   Kanal  = Punkte [x, y, z, w?, v?] (y = Wasseroberfläche, w = Breite, v = Strömungstempo m/s). Zwischen den
//            Punkten: Lage als Catmull-Rom-Kurve (zentripetal, je ~1 m abgetastet), y/w/v linear. Zwei Punkte im
//            Abstand ~1–2 m mit Höhenunterschied ergeben eine Kaskade; ein Kanalende über einer tieferen Lagune
//            ergibt eine Klippe (die Kanäle überlappen in der Draufsicht, die Figur fällt).
//   Felsen = Kreis (x, z, r) bis Höhe top – fest, Floß prallt ab (darüber hinweg springen geht).
//   Rampe  = Keil im Wasser (Mitte x/z, Gier yaw = Anstiegsrichtung, len, wid, h über der Oberfläche, kick m/s).
//   Welle  = Temposchwelle (Mitte, yaw, len, wid, boost m/s) – beschleunigt das Floß kurz.
//
// Abfragen: sample(x, z) → Strömung (Richtung, Tempo), Oberfläche, Seitenlage im Kanal (gemischt, wenn sich
// Kanäle an Gabelungen überlappen); constrain(pos, r) → Uferkollision (Vereinigung aller Kanal-Korridore);
// ground(x, z, surface) → Rampenhöhe; lookDir(…) → mittlere Fließrichtung voraus (Kamera).

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

/** Zentripetale Catmull-Rom-Interpolation zwischen p1 und p2 (Punkte {x, z}). */
function catmull(p0, p1, p2, p3, t, out) {
  const d01 = Math.max(1e-3, Math.sqrt(Math.hypot(p1.x - p0.x, p1.z - p0.z)));
  const d12 = Math.max(1e-3, Math.sqrt(Math.hypot(p2.x - p1.x, p2.z - p1.z)));
  const d23 = Math.max(1e-3, Math.sqrt(Math.hypot(p3.x - p2.x, p3.z - p2.z)));
  const t0 = 0, t1 = d01, t2 = t1 + d12, t3 = t2 + d23;
  const tt = t1 + (t2 - t1) * t;
  const L = (a, b, ta, tb, x) => (tb - ta < 1e-6 ? a : a + (b - a) * ((x - ta) / (tb - ta)));
  for (const k of ['x', 'z']) {
    const A1 = L(p0[k], p1[k], t0, t1, tt), A2 = L(p1[k], p2[k], t1, t2, tt), A3 = L(p2[k], p3[k], t2, t3, tt);
    const B1 = L(A1, A2, t0, t2, tt), B2 = L(A2, A3, t1, t3, tt);
    out[k] = L(B1, B2, t1, t2, tt);
  }
  return out;
}

export class RiverChannel {
  /**
   * @param {{ id?: string, points: Array<number[]|object>, width?: number, speed?: number, step?: number, smooth?: boolean }} spec
   */
  constructor(spec, index = 0) {
    this.id = spec.id ?? `kanal${index}`;
    this.index = index;
    const W = spec.width ?? 10, V = spec.speed ?? 6;
    const pts = (spec.points ?? []).map((p) => (Array.isArray(p)
      ? { x: p[0], y: p[1], z: p[2], w: p[3] ?? W, v: p[4] ?? V }
      : { x: p.p[0], y: p.p[1], z: p.p[2], w: p.w ?? W, v: p.v ?? V }));
    if (pts.length < 2) throw new Error(`[Fluss] Kanal ${this.id} braucht mindestens 2 Punkte`);
    this.points = pts;
    const step = spec.step ?? 1;
    const smooth = spec.smooth !== false;
    const S = [];
    const tmp = { x: 0, z: 0 };
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      const len = Math.hypot(p2.x - p1.x, p2.z - p1.z);
      const n = Math.max(1, Math.ceil(len / step));
      for (let k = 0; k < n; k++) {
        const t = k / n;
        if (smooth) catmull(p0, p1, p2, p3, t, tmp); else { tmp.x = lerp(p1.x, p2.x, t); tmp.z = lerp(p1.z, p2.z, t); }
        S.push({ x: tmp.x, z: tmp.z, y: lerp(p1.y, p2.y, t), w: lerp(p1.w, p2.w, t), v: lerp(p1.v, p2.v, t), seg: i });
      }
    }
    const last = pts[pts.length - 1];
    S.push({ x: last.x, z: last.z, y: last.y, w: last.w, v: last.v, seg: pts.length - 2 });
    // Bogenlänge, Tangenten (zentrale Differenzen), rechte Normale (Blick flussabwärts)
    let s = 0;
    for (let i = 0; i < S.length; i++) {
      if (i > 0) s += Math.hypot(S[i].x - S[i - 1].x, S[i].z - S[i - 1].z);
      S[i].s = s;
      const a = S[Math.max(0, i - 1)], b = S[Math.min(S.length - 1, i + 1)];
      let tx = b.x - a.x, tz = b.z - a.z;
      const l = Math.hypot(tx, tz) || 1;
      tx /= l; tz /= l;
      S[i].tx = tx; S[i].tz = tz;
      S[i].rx = -tz; S[i].rz = tx;           // rechts (für Fließrichtung −Z: +X)
    }
    this.S = S;
    this.length = s;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, wMax = 0;
    for (const q of S) { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); z0 = Math.min(z0, q.z); z1 = Math.max(z1, q.z); wMax = Math.max(wMax, q.w); }
    this.bbox = { x0: x0 - wMax, x1: x1 + wMax, z0: z0 - wMax, z1: z1 + wMax };
  }

  /**
   * Nächster Punkt der Mittellinie zu (x, z). out: { s, x, z, y, w, v, tx, tz, rx, rz, lat (Seitenabstand, + = rechts),
   * dist (Abstand zur Mittellinie), beyond (m über ein Kanalende hinaus, sonst 0), i (Segment) }.
   * skip: optional { s0, range } – Segmente mit |s − s0| < range überspringen (andere Teile desselben Kanals).
   */
  nearest(x, z, out = {}, skip = null) {
    const S = this.S;
    let best = Infinity, bi = -1, bt = 0;
    for (let i = 0; i < S.length - 1; i++) {
      const a = S[i], b = S[i + 1];
      if (skip && Math.abs(a.s - skip.s0) < skip.range) continue;
      const ex = b.x - a.x, ez = b.z - a.z;
      const L2 = ex * ex + ez * ez || 1e-9;
      let t = ((x - a.x) * ex + (z - a.z) * ez) / L2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = a.x + ex * t, pz = a.z + ez * t;
      const d2 = (x - px) * (x - px) + (z - pz) * (z - pz);
      if (d2 < best) { best = d2; bi = i; bt = t; }
    }
    if (bi < 0) { out.dist = Infinity; return out; }
    const a = S[bi], b = S[bi + 1];
    out.i = bi;
    out.x = lerp(a.x, b.x, bt); out.z = lerp(a.z, b.z, bt);
    out.s = lerp(a.s, b.s, bt); out.y = lerp(a.y, b.y, bt);
    out.w = lerp(a.w, b.w, bt); out.v = lerp(a.v, b.v, bt);
    let tx = lerp(a.tx, b.tx, bt), tz = lerp(a.tz, b.tz, bt);
    const l = Math.hypot(tx, tz) || 1;
    tx /= l; tz /= l;
    out.tx = tx; out.tz = tz; out.rx = -tz; out.rz = tx;
    const dx = x - out.x, dz = z - out.z;
    out.lat = dx * out.rx + dz * out.rz;
    const along = dx * tx + dz * tz;
    out.beyond = (bi === 0 && bt === 0 && along < 0) ? -along : (bi === S.length - 2 && bt === 1 && along > 0) ? along : 0;
    out.dist = Math.sqrt(best);
    return out;
  }

  /** Wert entlang der Bogenlänge s (Mittellinie): { x, z, y, w, v, tx, tz, rx, rz }. */
  at(s, out = {}) {
    const S = this.S;
    s = clamp(s, 0, this.length);
    let lo = 0, hi = S.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m].s <= s) lo = m; else hi = m; }
    const a = S[lo], b = S[hi];
    const t = b.s > a.s ? (s - a.s) / (b.s - a.s) : 0;
    out.x = lerp(a.x, b.x, t); out.z = lerp(a.z, b.z, t); out.y = lerp(a.y, b.y, t);
    out.w = lerp(a.w, b.w, t); out.v = lerp(a.v, b.v, t);
    let tx = lerp(a.tx, b.tx, t), tz = lerp(a.tz, b.tz, t);
    const l = Math.hypot(tx, tz) || 1;
    out.tx = tx / l; out.tz = tz / l; out.rx = -out.tz; out.rz = out.tx; out.s = s;
    return out;
  }
}

export class RiverNet {
  constructor() {
    this.channels = [];
    this.rocks = [];
    this.ramps = [];
    this.waves = [];
    this._q = [];
    this._near = {};
  }

  /** Kanal anlegen (Daten wie RiverChannel). */
  addChannel(spec) {
    const ch = new RiverChannel(spec, this.channels.length);
    this.channels.push(ch);
    this._q.push({});
    return ch;
  }

  channel(id) { return this.channels.find((c) => c.id === id) ?? null; }

  /** Felsen { x, z, r, top } (top = absolute Höhe der Oberkante). */
  addRock(r) { this.rocks.push(r); return r; }

  /** Rampe { x, z, yaw, len, wid, h, kick, base } – base = Oberfläche (wird sonst gemessen). */
  addRamp(r) {
    const c = Math.cos(r.yaw), s = Math.sin(r.yaw);
    r.ax = c; r.az = -s;                    // Anstiegsrichtung (yaw wie Figuren: 0 = +X, π/2 = −Z)
    r.bx = s; r.bz = c;                     // quer dazu
    if (r.base === undefined) r.base = this.sample(r.x, r.z).y;
    r.kick = r.kick ?? 6;
    this.ramps.push(r);
    return r;
  }

  /** Temposchwelle { x, z, yaw, len, wid, boost }. */
  addWave(w) {
    const c = Math.cos(w.yaw), s = Math.sin(w.yaw);
    w.ax = c; w.az = -s; w.bx = s; w.bz = c;
    w.boost = w.boost ?? 4;
    this.waves.push(w);
    return w;
  }

  /**
   * Strömung und Oberfläche bei (x, z). Liegen mehrere Kanäle übereinander (Gabelung, Mündung), wird nach der
   * Lage im Kanal gemischt (Mitte zählt mehr als Rand). out: { dx, dz (Fließrichtung), speed, y (Oberfläche),
   * ch (Kanal mit der besten Lage), s, lat, hw, inside, norm }.
   */
  sample(x, z, out = {}, atY = undefined) {
    let wsum = 0, dx = 0, dz = 0, sp = 0, y = 0;
    let best = null, bestNorm = Infinity, bestCh = null;
    // 1. Lage in jedem Kanal; Kanalenden sind hart (hinter dem Ende zählt der Kanal nicht mehr)
    let top = -Infinity;
    for (let k = 0; k < this.channels.length; k++) {
      const ch = this.channels[k];
      const q = ch.nearest(x, z, this._q[k]);
      const hw = q.w / 2;
      q.norm = Math.abs(q.lat) / hw + (q.beyond > 0.05 ? 1 + q.beyond : 0);
      // übereinander liegende Kanäle (Klippe): nur Oberflächen unter der Figur zählen, davon die höchste
      q.ok = q.norm < 1 && (atY === undefined || q.y <= atY + 0.6);
      if (q.ok && q.y > top) top = q.y;
    }
    for (let k = 0; k < this.channels.length; k++) {
      const q = this._q[k], ch = this.channels[k];
      const use = q.ok && q.y > top - 1.2;
      if (use && q.norm < bestNorm) { bestNorm = q.norm; best = q; bestCh = ch; }
      if (use) {
        const wgt = (1 - q.norm) * (1 - q.norm) + 1e-4;
        wsum += wgt; dx += q.tx * wgt; dz += q.tz * wgt; sp += q.v * wgt; y += q.y * wgt;
      }
    }
    if (!best) {
      // außerhalb aller Kanäle: nächster Kanal
      for (let k = 0; k < this.channels.length; k++) { const q = this._q[k]; if (q.norm < bestNorm) { bestNorm = q.norm; best = q; bestCh = this.channels[k]; } }
    }
    if (!best) { out.ok = false; return out; }
    if (wsum > 0) {
      const l = Math.hypot(dx, dz) || 1;
      out.dx = dx / l; out.dz = dz / l; out.speed = sp / wsum; out.y = y / wsum;
    } else {
      out.dx = best.tx; out.dz = best.tz; out.speed = best.v; out.y = best.y;
    }
    out.ok = true;
    out.ch = bestCh; out.s = best.s; out.lat = best.lat; out.hw = best.w / 2; out.norm = bestNorm;
    out.inside = bestNorm <= 1;
    return out;
  }

  /**
   * Uferkollision: Liegt ein Kreis (Radius r) um (pos.x, pos.z) in keinem Kanal-Korridor (|lat| ≤ hw − r, nicht
   * hinter einem Kanalende), wird er in den nächsten Korridor zurückgeschoben. Liefert null (frei) oder
   * { nx, nz } = Normale nach außen (Ufer), depth.
   */
  constrain(pos, r, out = {}) {
    let bestV = Infinity, bq = null;
    for (let k = 0; k < this.channels.length; k++) {
      const ch = this.channels[k];
      const q = ch.nearest(pos.x, pos.z, this._q[k]);
      const v = Math.max(Math.abs(q.lat) - Math.max(0.05, q.w / 2 - r), q.beyond > 0 ? q.beyond + 0.01 : -Infinity);
      if (v <= 0) return null;
      if (v < bestV) { bestV = v; bq = q; }
    }
    if (!bq) return null;
    if (bq.beyond > 0 && Math.abs(bq.lat) <= bq.w / 2 - r) {
      // hinter dem Kanalende: entlang der Tangente zurück
      const sgn = bq.i === 0 ? -1 : 1;
      out.nx = bq.tx * sgn; out.nz = bq.tz * sgn;
      pos.x -= out.nx * (bq.beyond + 0.01); pos.z -= out.nz * (bq.beyond + 0.01);
    } else {
      const sg = bq.lat >= 0 ? 1 : -1;
      out.nx = bq.rx * sg; out.nz = bq.rz * sg;
      const lim = Math.max(0.05, bq.w / 2 - r);
      const push = Math.abs(bq.lat) - lim;
      pos.x -= out.nx * push; pos.z -= out.nz * push;
    }
    out.depth = bestV;
    return out;
  }

  /** Höhe des Bodens unter dem Floß: Rampe (falls darüber) sonst die Oberfläche. Liefert { y, ramp }. */
  ground(x, z, surface, out = {}) {
    out.y = surface; out.ramp = null;
    for (const r of this.ramps) {
      const dx = x - r.x, dz = z - r.z;
      const a = dx * r.ax + dz * r.az, b = dx * r.bx + dz * r.bz;
      if (Math.abs(b) > r.wid / 2 || a < -r.len / 2 || a > r.len / 2) continue;
      const t = (a + r.len / 2) / r.len;
      const h = r.base + r.h * t;
      if (h > out.y) { out.y = h; out.ramp = r; out.t = t; }
    }
    return out;
  }

  /** Temposchwelle unter (x, z) oder null. */
  waveAt(x, z) {
    for (const w of this.waves) {
      const dx = x - w.x, dz = z - w.z;
      const a = dx * w.ax + dz * w.az, b = dx * w.bx + dz * w.bz;
      if (Math.abs(a) <= w.len / 2 && Math.abs(b) <= w.wid / 2) return w;
    }
    return null;
  }

  /** Mittlere Fließrichtung des Kanals ch von s bis s + dist (für eine ruhige Kamera). */
  lookDir(ch, s, dist, out = {}) {
    let dx = 0, dz = 0;
    const n = 8;
    const p = this._near;
    for (let i = 0; i <= n; i++) {
      ch.at(s + (dist * i) / n, p);
      const w = 1 - (i / (n + 1)) * 0.5;
      dx += p.tx * w; dz += p.tz * w;
    }
    const l = Math.hypot(dx, dz) || 1;
    out.x = dx / l; out.z = dz / l;
    return out;
  }

  /**
   * Liegt (x, z) in einem Kanal-Korridor (mit Rand margin), außer im Bereich |s − s0| < range des Kanals self?
   * (Uferbau: Ufer öffnen sich an Gabelungen, Uferstreifen enden vor dem nächsten Kanal.)
   */
  insideOther(x, z, self, s0, range, margin = 0.3) {
    for (const ch of this.channels) {
      if (x < ch.bbox.x0 - margin || x > ch.bbox.x1 + margin || z < ch.bbox.z0 - margin || z > ch.bbox.z1 + margin) continue;
      const q = ch.nearest(x, z, this._near, ch === self ? { s0, range } : null);
      if (q.dist === Infinity) continue;
      if (Math.abs(q.lat) <= q.w / 2 + margin && q.beyond <= margin) return true;
    }
    return false;
  }
}
