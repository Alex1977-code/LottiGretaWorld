// Begehbarer Bereich der Kurs-Weltkarte als Raster (reine Logik, auch in Node nutzbar).
//
// Die Karte ist frei begehbar, aber nur innerhalb der begehbaren Rechtecke der Weltdaten (`walk`, achsenparallel,
// Raster 0,5 m) – wie auf der Oberwelt des Vorbilds: Wege, Plätze um die Eingänge, Brücken, Treppen. Am Rand
// entstehen unsichtbare, hohe Begrenzungen (walls()); dort, wo daneben gleich hohes Gras liegt, setzt der
// Kartenbau eine Hecke (sichtbare Grenze). Schranken sperren einzelne Engstellen (gesperrte Wege).
//
//   const g = new WalkGrid(rects, { cell: 0.5 });   rects: [[x0, z0, x1, z1], …]
//   g.isWalk(x, z)                                  begehbar?
//   g.walls() → [{ axis: 'x', x, z0, z1, side }, { axis: 'z', z, x0, x1, side }]
//       axis 'x': Kante bei konstantem x (Wand quer zur x-Richtung), side = +1/−1 Richtung des nicht begehbaren Felds
//   g.span(x, z, axis) → [a, b]  Breite der Engstelle quer zu `axis` an (x, z) (für Schranken)
//   g.flood(x, z, blocked?) → Set der erreichbaren Zellen (Höhen spielen keine Rolle: Sprünge sind frei)
//   g.cellOf(x, z) → Index

export class WalkGrid {
  /**
   * @param {number[][]} rects [[x0, z0, x1, z1], …] begehbare Rechtecke
   * @param {{ cell?: number, margin?: number }} opts
   */
  constructor(rects, opts = {}) {
    this.cell = opts.cell ?? 0.5;
    const m = opts.margin ?? 4;
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const r of rects) { x0 = Math.min(x0, r[0], r[2]); x1 = Math.max(x1, r[0], r[2]); z0 = Math.min(z0, r[1], r[3]); z1 = Math.max(z1, r[1], r[3]); }
    if (!Number.isFinite(x0)) { x0 = z0 = -1; x1 = z1 = 1; }
    const c = this.cell;
    this.x0 = Math.floor((x0 - m) / c) * c;
    this.z0 = Math.floor((z0 - m) / c) * c;
    this.nx = Math.ceil((x1 + m - this.x0) / c);
    this.nz = Math.ceil((z1 + m - this.z0) / c);
    this.cells = new Uint8Array(this.nx * this.nz);
    for (const r of rects) this.paint(r, 1);
  }

  /** Rechteck setzen (1 = begehbar, 0 = gesperrt). Kanten werden auf das Raster gerundet. */
  paint(r, v = 1) {
    const c = this.cell;
    const ax = Math.round((Math.min(r[0], r[2]) - this.x0) / c), bx = Math.round((Math.max(r[0], r[2]) - this.x0) / c);
    const az = Math.round((Math.min(r[1], r[3]) - this.z0) / c), bz = Math.round((Math.max(r[1], r[3]) - this.z0) / c);
    for (let j = Math.max(0, az); j < Math.min(this.nz, bz); j++) {
      for (let i = Math.max(0, ax); i < Math.min(this.nx, bx); i++) this.cells[j * this.nx + i] = v;
    }
  }

  ix(x) { return Math.floor((x - this.x0) / this.cell); }
  iz(z) { return Math.floor((z - this.z0) / this.cell); }
  at(i, j) { return i >= 0 && j >= 0 && i < this.nx && j < this.nz ? this.cells[j * this.nx + i] : 0; }
  isWalk(x, z) { return this.at(this.ix(x), this.iz(z)) === 1; }
  cellOf(x, z) { return this.iz(z) * this.nx + this.ix(x); }
  centerOf(k) { return { x: this.x0 + ((k % this.nx) + 0.5) * this.cell, z: this.z0 + (Math.floor(k / this.nx) + 0.5) * this.cell }; }

  /** Randkanten des begehbaren Bereichs, zu langen Stücken zusammengefasst. */
  walls() {
    const c = this.cell, out = [];
    // Kanten bei konstantem x (zwischen Spalte i−1 und i)
    for (let i = 0; i <= this.nx; i++) {
      let run = null;
      for (let j = 0; j <= this.nz; j++) {
        const a = j < this.nz ? this.at(i - 1, j) : 0, b = j < this.nz ? this.at(i, j) : 0;
        const side = a === b ? 0 : a ? 1 : -1;
        if (run && run.side !== side) { out.push({ axis: 'x', x: this.x0 + i * c, z0: this.z0 + run.j * c, z1: this.z0 + j * c, side: run.side }); run = null; }
        if (!run && side) run = { j, side };
      }
    }
    // Kanten bei konstantem z (zwischen Zeile j−1 und j)
    for (let j = 0; j <= this.nz; j++) {
      let run = null;
      for (let i = 0; i <= this.nx; i++) {
        const a = i < this.nx ? this.at(i, j - 1) : 0, b = i < this.nx ? this.at(i, j) : 0;
        const side = a === b ? 0 : a ? 1 : -1;
        if (run && run.side !== side) { out.push({ axis: 'z', z: this.z0 + j * c, x0: this.x0 + run.i * c, x1: this.x0 + i * c, side: run.side }); run = null; }
        if (!run && side) run = { i, side };
      }
    }
    return out;
  }

  /**
   * Breite der begehbaren Engstelle an (x, z) quer zur Laufrichtung `axis` ('x' = Weg verläuft entlang x →
   * Spanne in z). Liefert [a, b] in Weltkoordinaten.
   */
  span(x, z, axis) {
    const c = this.cell;
    if (axis === 'x') {
      const i = this.ix(x);
      let j0 = this.iz(z), j1 = j0;
      while (this.at(i, j0 - 1)) j0--;
      while (this.at(i, j1 + 1)) j1++;
      return [this.z0 + j0 * c, this.z0 + (j1 + 1) * c];
    }
    const j = this.iz(z);
    let i0 = this.ix(x), i1 = i0;
    while (this.at(i0 - 1, j)) i0--;
    while (this.at(i1 + 1, j)) i1++;
    return [this.x0 + i0 * c, this.x0 + (i1 + 1) * c];
  }

  /**
   * Erreichbare Zellen ab (x, z) über begehbare Nachbarn (4er-Nachbarschaft). blocked(k) → true sperrt eine
   * Zelle (geschlossene Schranken). Höhenunterschiede zählen nicht (die Figur kann springen).
   */
  flood(x, z, blocked = null) {
    const seen = new Set();
    const start = this.cellOf(x, z);
    if (!this.cells[start]) return seen;
    const stack = [start];
    seen.add(start);
    const nx = this.nx;
    while (stack.length) {
      const k = stack.pop();
      const i = k % nx, j = (k - i) / nx;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = i + di, b = j + dj;
        if (a < 0 || b < 0 || a >= nx || b >= this.nz) continue;
        const n = b * nx + a;
        if (seen.has(n) || !this.cells[n] || (blocked && blocked(n))) continue;
        seen.add(n);
        stack.push(n);
      }
    }
    return seen;
  }
}
