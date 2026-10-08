// Kollisionswelt des Kurs-Modus: statische und bewegte Formen (box, ramp, cyl) in einem 2D-Gitter
// (XZ, Zellen 4 m) und Bewegung eines achsenparallelen Quaders (Figur, Gegner) mit Kollision.
//
// Pflicht-API (docs/KURS-ARCHITEKTUR.md):
//   add(shape) → id, remove(id), update(id, patch), get(id)
//   moveAABB(center, half, delta, opts) → { grounded, ceiling, hitWall, wallNormal, ground, ceilingShape,
//                                           wallShape, hits, stepped }
//   raycastDown(x, y, z, maxDist, opts?) → { y, shape } | null
//   overlapAABB(center, half, opts?) → shape[]
// Zusätzlich: raycast(a, b, filter?) (Kamera), candidates(...), forEach(fn), count.
//
// Bewegung (moveAABB) – Präzisierung (Motor):
//  - Die Bewegung wird in Teilschritte ≤ 0,2 m zerlegt; je Teilschritt erst X, dann Z, dann Y (Gleiten an
//    Wänden entlang). center wird verändert (Mittelpunkt des Quaders), half = Halbmaße.
//  - Stufen: Ragt eine Form höchstens `step` (Standard 0,3 m) über die Füße, ist sie keine Wand; der
//    Y-Durchgang hebt die Figur hinauf. So laufen Figuren Treppen bis 0,3 m und flache Rampen hoch und
//    werden an Kanten ein Stück hochgezogen (Kantenhilfe, auch im Sprung).
//  - Stehen braucht Halt unter dem schmalen Fuß-Quadrat (`foot`, Standard halbe Breite/2): steht nur der
//    Rand der Figur auf einer Kante, rutscht sie seitlich ab (kein „Anhaften“ an Kanten).
//  - `oneWay`-Formen tragen nur von oben (Füße waren vor dem Teilschritt darüber), `fromBelowOnly`
//    (versteckte Blöcke) halten nur Stöße von unten auf.
//  - `snap` > 0: Bodenhaftung nach unten (Treppen/Rampen abwärts ohne Hüpfen), nur wenn dy ≤ 0.
//  - `nudge` > 0: Ecken-Korrektur – streift der Kopf eine Unterkante nur um ≤ nudge, wird seitlich vorbei-
//    geschoben statt anzustoßen.
//  - `ignore(shape)` blendet Formen aus (z. B. eigene Form eines Gegners).

import { normalize, topUnder, topAt, overlapXZ, containsXZ, segmentAABB } from './shapes.js';

const EPS = 1e-4;
const SKIN = 1e-3;
const SUB = 0.2;          // maximale Teilschrittlänge (m)
const BIG_CELLS = 400;    // Formen über mehr Zellen liegen in einer eigenen Liste (Abgrund-Ebenen)

export class CollisionWorld {
  constructor({ cell = 4 } = {}) {
    this.cell = cell;
    this.shapes = new Map();
    this.grid = new Map();
    this.big = [];
    this.nextId = 1;
    this.stamp = 1;
  }

  get count() { return this.shapes.size; }

  key(ix, iz) { return (ix + 50000) * 100000 + (iz + 50000); }

  /** Form hinzufügen (wird normalisiert und um `id` ergänzt). */
  add(shape) {
    const id = this.nextId++;
    shape.id = id;
    normalize(shape);
    this.shapes.set(id, shape);
    this.insert(shape);
    return id;
  }

  remove(id) {
    const s = this.shapes.get(id);
    if (!s) return false;
    this.unregister(s);
    this.shapes.delete(id);
    return true;
  }

  get(id) { return this.shapes.get(id) ?? null; }

  /** Geometrie/Flags einer Form ändern (bewegte Plattformen). patch = Teil-Objekt. */
  update(id, patch) {
    const s = this.shapes.get(id);
    if (!s) return null;
    if (patch && patch !== s) Object.assign(s, patch);
    const old = s._cells;
    normalize(s);
    const r = this.cellRange(s);
    if (!s._big && old && r[0] === old[0] && r[1] === old[1] && r[2] === old[2] && r[3] === old[3]) return s;
    this.unregister(s);
    this.insert(s);
    return s;
  }

  forEach(fn) { for (const s of this.shapes.values()) fn(s); }

  cellRange(s) {
    const c = this.cell;
    return [Math.floor(s.x0 / c), Math.floor(s.x1 / c), Math.floor(s.z0 / c), Math.floor(s.z1 / c)];
  }

  insert(s) {
    const r = this.cellRange(s);
    s._cells = r;
    if ((r[1] - r[0] + 1) * (r[3] - r[2] + 1) > BIG_CELLS) { s._big = true; this.big.push(s); return; }
    s._big = false;
    for (let ix = r[0]; ix <= r[1]; ix++) {
      for (let iz = r[2]; iz <= r[3]; iz++) {
        const k = this.key(ix, iz);
        let list = this.grid.get(k);
        if (!list) { list = []; this.grid.set(k, list); }
        list.push(s);
      }
    }
  }

  unregister(s) {
    if (s._big) { const i = this.big.indexOf(s); if (i >= 0) this.big.splice(i, 1); return; }
    const r = s._cells;
    if (!r) return;
    for (let ix = r[0]; ix <= r[1]; ix++) {
      for (let iz = r[2]; iz <= r[3]; iz++) {
        const list = this.grid.get(this.key(ix, iz));
        if (!list) continue;
        const i = list.indexOf(s);
        if (i >= 0) list.splice(i, 1);
      }
    }
  }

  /** Alle Formen, deren Gitterzellen das XZ-Rechteck berühren (ohne Doppelte). */
  candidates(x0, z0, x1, z1, out = []) {
    const c = this.cell;
    const stamp = ++this.stamp;
    const ix0 = Math.floor(x0 / c), ix1 = Math.floor(x1 / c), iz0 = Math.floor(z0 / c), iz1 = Math.floor(z1 / c);
    for (let ix = ix0; ix <= ix1; ix++) {
      for (let iz = iz0; iz <= iz1; iz++) {
        const list = this.grid.get(this.key(ix, iz));
        if (!list) continue;
        for (let i = 0; i < list.length; i++) {
          const s = list[i];
          if (s._stamp === stamp) continue;
          s._stamp = stamp;
          out.push(s);
        }
      }
    }
    for (const s of this.big) if (s.x1 >= x0 && s.x0 <= x1 && s.z1 >= z0 && s.z0 <= z1) out.push(s);
    return out;
  }

  // ------------------------------------------------------------------ Bewegung

  /**
   * Quader (center, half) um delta bewegen. Verändert center. opts: step, snap, foot, nudge, ignore(shape).
   * Ergebnis siehe Kopfkommentar; wallNormal ist ein {x,y,z}-Objekt (Richtung von der Wand weg).
   */
  moveAABB(center, half, delta, opts = {}) {
    const step = opts.step ?? 0.3;
    const foot = opts.foot ?? Math.min(half.x, half.z) * 0.5;
    const res = {
      grounded: false, ceiling: false, hitWall: false, wallNormal: { x: 0, y: 0, z: 0 },
      ground: null, ceilingShape: null, wallShape: null, hits: [], stepped: false,
    };
    const dx = delta.x || 0, dy = delta.y || 0, dz = delta.z || 0;
    const reach = step + (opts.snap ?? 0) + 0.5;
    const cands = this.candidates(
      Math.min(center.x, center.x + dx) - half.x - reach, Math.min(center.z, center.z + dz) - half.z - reach,
      Math.max(center.x, center.x + dx) + half.x + reach, Math.max(center.z, center.z + dz) + half.z + reach,
    );
    const ctx = { center, half, step, foot, cands, res, ignore: opts.ignore ?? null, nudge: opts.nudge ?? 0 };
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) / SUB));
    const sx = dx / n, sy = dy / n, sz = dz / n;
    for (let i = 0; i < n; i++) {
      if (sx) { center.x += sx; this.resolveH(ctx, 'x', sx); }
      if (sz) { center.z += sz; this.resolveH(ctx, 'z', sz); }
      center.y += sy;
      this.resolveV(ctx, sy);
    }
    // Bodenhaftung: Treppen und Rampen abwärts, solange kein Sprung
    const snap = opts.snap ?? 0;
    if (snap > 0 && !res.grounded && dy <= 0) {
      const feet = center.y - half.y;
      let best = -Infinity, bestShape = null;
      for (const s of cands) {
        if (!s.solid || s.fromBelowOnly || (ctx.ignore && ctx.ignore(s))) continue;
        if (!overlapXZ(s, center.x, center.z, foot, foot)) continue;
        const top = topUnder(s, center.x, center.z);
        if (top <= feet + EPS && top >= feet - snap && top > best) { best = top; bestShape = s; }
      }
      if (bestShape) {
        center.y = best + half.y;
        res.grounded = true;
        res.ground = bestShape;
        this.hit(res, bestShape);
      }
    }
    return res;
  }

  hit(res, s) { if (!res.hits.includes(s)) res.hits.push(s); }

  /** Horizontaler Durchgang (Achse 'x' oder 'z', Teilschritt s). */
  resolveH(ctx, axis, s) {
    const { center: c, half: h, step, foot, cands, res, ignore } = ctx;
    for (let i = 0; i < cands.length; i++) {
      const sh = cands[i];
      if (!sh.solid || sh.oneWay || sh.fromBelowOnly) continue;
      if (ignore && ignore(sh)) continue;
      if (!overlapXZ(sh, c.x, c.z, h.x, h.z)) continue;
      const feet = c.y - h.y, head = c.y + h.y;
      const top = topUnder(sh, c.x, c.z);
      if (feet >= top - EPS || head <= sh.bot + EPS) continue;
      // Stufe, flache Rampe oder Kantenhilfe: keine Wand – sobald der Fuß darüber ist, hebt der Y-Durchgang
      if (top - feet <= step && !sh.noStep && !(sh.type === 'ramp' && sh.steep)) continue;
      if (sh.type === 'cyl') {
        this.pushCyl(c, h, sh, res);
      } else {
        const prev = axis === 'x' ? c.x - s : c.z - s;
        const hw = axis === 'x' ? h.x : h.z;
        const lo = axis === 'x' ? sh.x0 : sh.z0, hi = axis === 'x' ? sh.x1 : sh.z1;
        const tol = Math.abs(s) + 0.02;
        if (s > 0 && prev + hw <= lo + tol) {
          if (axis === 'x') c.x = lo - hw - SKIN; else c.z = lo - hw - SKIN;
          this.setNormal(res, axis, -1);
        } else if (s < 0 && prev - hw >= hi - tol) {
          if (axis === 'x') c.x = hi + hw + SKIN; else c.z = hi + hw + SKIN;
          this.setNormal(res, axis, 1);
        } else {
          this.pushOutXZ(c, h, sh, res);
        }
      }
      res.hitWall = true;
      res.wallShape = sh;
      this.hit(res, sh);
    }
  }

  setNormal(res, axis, sign) {
    res.wallNormal.x = axis === 'x' ? sign : 0;
    res.wallNormal.y = 0;
    res.wallNormal.z = axis === 'z' ? sign : 0;
  }

  /** Senkrechter Durchgang (Teilschritt s, auch 0 = nur Überlappungen auflösen). */
  resolveV(ctx, s) {
    const { center: c, half: h, step, foot, cands, res, ignore, nudge } = ctx;
    for (let i = 0; i < cands.length; i++) {
      const sh = cands[i];
      if (!sh.solid) continue;
      if (ignore && ignore(sh)) continue;
      if (!overlapXZ(sh, c.x, c.z, h.x, h.z)) continue;
      const feet = c.y - h.y, head = c.y + h.y;
      const top = topUnder(sh, c.x, c.z);
      if (feet >= top - EPS || head <= sh.bot + EPS) continue;
      const support = overlapXZ(sh, c.x, c.z, foot, foot);
      if (sh.fromBelowOnly) {
        if (s > 0 && head - s <= sh.bot + 0.02) this.ceiling(c, h, sh, res);
        continue;
      }
      if (sh.oneWay) {
        if (s <= 0 && support && feet - s >= top - 0.05) this.land(c, h, sh, top, s, res);
        continue;
      }
      if (support && top - feet <= Math.max(step, -s) + EPS) {
        this.land(c, h, sh, top, s, res);
        continue;
      }
      if (s > 0 && head - sh.bot <= s + 0.02) {
        // Ecken-Korrektur: Kopf streift die Kante nur knapp → seitlich vorbei
        if (nudge > 0 && sh.type !== 'cyl') {
          const ox = Math.min(c.x + h.x - sh.x0, sh.x1 - (c.x - h.x));
          const oz = Math.min(c.z + h.z - sh.z0, sh.z1 - (c.z - h.z));
          if (Math.min(ox, oz) <= nudge && !sh.hit) {
            if (ox <= oz) c.x += (c.x < (sh.x0 + sh.x1) / 2 ? -1 : 1) * (ox + SKIN);
            else c.z += (c.z < (sh.z0 + sh.z1) / 2 ? -1 : 1) * (oz + SKIN);
            continue;
          }
        }
        this.ceiling(c, h, sh, res);
        continue;
      }
      // Kein Halt unter dem Fuß, aber nur knapp überlappt: Stufe wird gerade betreten oder die Figur
      // verlässt eine Kante – nichts tun (der Fuß entscheidet im nächsten Teilschritt)
      if (top - feet <= step + EPS && !sh.noStep && !(sh.type === 'ramp' && sh.steep)) continue;
      // Steckt seitlich in einer Form (an einer Wand entlang gefallen, von einer Plattform geschoben): hinaus
      this.pushOutXZ(c, h, sh, res);
      res.hitWall = true;
      res.wallShape = sh;
      this.hit(res, sh);
    }
  }

  land(c, h, sh, top, s, res) {
    c.y = top + h.y;
    if (s <= 0) {
      res.grounded = true;
      if (!res.ground || topUnder(res.ground, c.x, c.z) <= top) res.ground = sh;
    } else {
      res.stepped = true;
    }
    this.hit(res, sh);
  }

  ceiling(c, h, sh, res) {
    c.y = sh.bot - h.y - SKIN;
    res.ceiling = true;
    res.ceilingShape = sh;
    this.hit(res, sh);
  }

  /** Kleinste seitliche Verschiebung aus einer Form heraus (Quader/Rampe: Achse, Zylinder: radial). */
  pushOutXZ(c, h, sh, res) {
    if (sh.type === 'cyl') { this.pushCyl(c, h, sh, res); return; }
    const px0 = c.x + h.x - sh.x0, px1 = sh.x1 - (c.x - h.x);
    const pz0 = c.z + h.z - sh.z0, pz1 = sh.z1 - (c.z - h.z);
    const m = Math.min(px0, px1, pz0, pz1);
    if (m === px0) { c.x -= px0 + SKIN; this.setNormal(res, 'x', -1); }
    else if (m === px1) { c.x += px1 + SKIN; this.setNormal(res, 'x', 1); }
    else if (m === pz0) { c.z -= pz0 + SKIN; this.setNormal(res, 'z', -1); }
    else { c.z += pz1 + SKIN; this.setNormal(res, 'z', 1); }
  }

  pushCyl(c, h, sh, res) {
    const px = Math.max(c.x - h.x, Math.min(sh.x, c.x + h.x));
    const pz = Math.max(c.z - h.z, Math.min(sh.z, c.z + h.z));
    let dx = px - sh.x, dz = pz - sh.z;
    let d = Math.hypot(dx, dz);
    if (d < 1e-6) {
      // Zylindermitte im Quader: vom Zylinder weg schieben
      dx = c.x - sh.x; dz = c.z - sh.z; d = Math.hypot(dx, dz);
      if (d < 1e-6) { dx = 1; dz = 0; d = 1; }
      const nx = dx / d, nz = dz / d;
      const pen = sh.r + Math.abs(nx) * h.x + Math.abs(nz) * h.z - d;
      c.x += nx * (pen + SKIN); c.z += nz * (pen + SKIN);
      res.wallNormal.x = nx; res.wallNormal.y = 0; res.wallNormal.z = nz;
      return;
    }
    const nx = dx / d, nz = dz / d;
    const pen = sh.r - d;
    if (pen <= 0) return;
    c.x += nx * (pen + SKIN); c.z += nz * (pen + SKIN);
    res.wallNormal.x = nx; res.wallNormal.y = 0; res.wallNormal.z = nz;
  }

  // ------------------------------------------------------------------ Abfragen

  /**
   * Höchste Oberseite unter (x, y, z) im Bereich maxDist. opts: { water: true } schließt Wasseroberflächen
   * ein, { all: true } jede Form, { ignore(shape) }. Standard: feste Formen (inkl. Einweg).
   */
  raycastDown(x, y, z, maxDist = 100, opts = {}) {
    const cands = this.candidates(x - 0.01, z - 0.01, x + 0.01, z + 0.01);
    let best = null;
    for (const s of cands) {
      if (!opts.all && !(s.solid || (opts.water && s.water))) continue;
      if (s.fromBelowOnly && !opts.all) continue;
      if (opts.ignore && opts.ignore(s)) continue;
      if (!containsXZ(s, x, z)) continue;
      const top = topAt(s, x, z);
      if (top <= y + 1e-4 && top >= y - maxDist && (!best || top > best.y)) best = { y: top, shape: s };
    }
    return best;
  }

  /** Alle Formen, die den Quader berühren (auch nicht feste: Wasser, Lava, Auslöser). */
  overlapAABB(center, half, opts = {}) {
    const out = [];
    const cands = this.candidates(center.x - half.x, center.z - half.z, center.x + half.x, center.z + half.z);
    for (const s of cands) {
      if (opts.filter && !opts.filter(s)) continue;
      if (!overlapXZ(s, center.x, center.z, half.x, half.z, 0)) continue;
      const top = topUnder(s, center.x, center.z);
      if (center.y - half.y > top || center.y + half.y < s.bot) continue;
      out.push(s);
    }
    return out;
  }

  /**
   * Strecke a → b gegen die Hüllquader fester Formen (Kamera). Liefert { t, shape } (t ∈ [0,1]) oder null.
   * filter(shape) kann Formen ausschließen; Standard: feste, nicht `camIgnore`, nicht Einweg.
   */
  raycast(a, b, filter) {
    const cands = this.candidates(Math.min(a.x, b.x), Math.min(a.z, b.z), Math.max(a.x, b.x), Math.max(a.z, b.z));
    let best = null;
    for (const s of cands) {
      if (filter ? !filter(s) : (!s.solid || s.camIgnore || s.oneWay || s.fromBelowOnly)) continue;
      const t = segmentAABB(s, a.x, a.y, a.z, b.x, b.y, b.z);
      if (t >= 0 && (!best || t < best.t)) best = { t, shape: s };
    }
    return best;
  }
}
