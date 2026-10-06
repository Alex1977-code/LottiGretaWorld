// Kleines Werkzeug, um Level-Raster im Code zu "stempeln".

export class Grid {
  constructor(width, height, fill = '.') {
    this.width = width;
    this.height = height;
    this.rows = Array.from({ length: height }, () => fill.repeat(width).split(''));
  }

  set(x, y, ch) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    this.rows[y][x] = ch;
  }

  /** Rechteck füllen (inklusive Endkoordinaten). */
  rect(x0, y0, x1, y1, ch) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, ch);
  }

  /** Waagerechte Linie. */
  hline(x0, x1, y, ch) { this.rect(x0, y, x1, y, ch); }

  /** Senkrechte Linie. */
  vline(x, y0, y1, ch) { this.rect(x, y0, x, y1, ch); }

  toRows() { return this.rows.map((r) => r.join('')); }
}
