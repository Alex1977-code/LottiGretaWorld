// Hintergrund-Ebenen des Herbstwalds (prozedural, Pixel für Pixel, kachelbar in X).
// Texturen: 'sky' (fest, Bildschirmgröße), die Parallax-Ebenen aus PARALLAX_LAYERS
// (Breite = Bildschirm, Höhe = Bildschirm + LAYER_EXTRA, damit vertikales Scrollen nicht
// umbricht) und 'worldmap_bg' für die Weltkarte. Alles wird einmalig beim Start erzeugt.

import Phaser from 'phaser';
import { WORLD } from '../levels/worldmap.js';

/** Zusätzliche Höhe der Ebenen (deckt die vertikale Parallax-Verschiebung ab). */
export const LAYER_EXTRA = 50;

/**
 * Parallax-Ebenen von hinten nach vorn (fx/fy = Scrollfaktor, alles hinter der Tile-Ebene).
 * bands: Zeilenbereiche [oben, unten?] der Textur, die Inhalt haben – nur diese werden als
 * TileSprite gezeichnet (spart Füllrate); ohne "unten" bis zum Texturende.
 */
export const PARALLAX_LAYERS = [
  { key: 'bg_clouds', fx: 0.04, fy: 0.01, depth: -9.8, bands: [[26, 134]] },
  { key: 'bg_far',    fx: 0.12, fy: 0.04, depth: -9,   bands: [[84]] },
  { key: 'bg_back',   fx: 0.22, fy: 0.08, depth: -8.5, bands: [[156]] },
  { key: 'bg_mid',    fx: 0.35, fy: 0.12, depth: -8,   bands: [[118]] },
  { key: 'bg_near',   fx: 0.6,  fy: 0.25, depth: -7,   bands: [[0, 70], [222]] },
];
// (Die Bänder müssen die gezeichneten Zeilen einschließen – nach Änderungen an den Zeichenroutinen prüfen.)

export const SKY = {
  top: '#1b2150',
  bottom: '#f6b473',
};

// ---------------------------------------------------------------- Farb-Helfer

const RGB = new Map();
function rgb(hex) {
  let c = RGB.get(hex);
  if (!c) {
    c = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    RGB.set(hex, c);
  }
  return c;
}
/** Mischt zwei Hex-Farben (t = Anteil von b). */
export function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  let out = '#';
  for (let i = 0; i < 3; i++) out += Math.round(A[i] + (B[i] - A[i]) * t).toString(16).padStart(2, '0');
  return out;
}
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
/** Geordnetes Dithering: true mit Wahrscheinlichkeit t, als festes Muster. */
function dither(x, y, t) {
  return t * 16 > BAYER[y & 3][((x % 4) + 4) % 4];
}

// ---------------------------------------------------------------- Pixel-Puffer

/** Pixelpuffer mit Umlauf in X (kachelbar). Schreibt am Ende in eine Canvas-Textur. */
class Pix {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.d = new Uint8ClampedArray(w * h * 4);
  }
  set(x, y, hex) {
    y |= 0;
    if (y < 0 || y >= this.h) return;
    x = (((x | 0) % this.w) + this.w) % this.w;
    const c = rgb(hex), i = (y * this.w + x) << 2;
    this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = 255;
  }
  /** Gepackte Farbe (r<<16|g<<8|b) oder -1, wenn transparent. */
  get(x, y) {
    y |= 0;
    if (y < 0 || y >= this.h) return -1;
    x = (((x | 0) % this.w) + this.w) % this.w;
    const i = (y * this.w + x) << 2;
    if (!this.d[i + 3]) return -1;
    return (this.d[i] << 16) | (this.d[i + 1] << 8) | this.d[i + 2];
  }
  hline(x0, x1, y, hex) { for (let x = x0; x <= x1; x++) this.set(x, y, hex); }
  vline(x, y0, y1, hex) { for (let y = y0; y <= y1; y++) this.set(x, y, hex); }
  rect(x, y, w, h, hex) { for (let j = 0; j < h; j++) this.hline(x, x + w - 1, y + j, hex); }
  disc(cx, cy, r, hex) {
    cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.floor(Math.sqrt(r * r + r * 0.5 - dy * dy));
      this.hline(cx - half, cx + half, cy + dy, hex);
    }
  }
  ellipse(cx, cy, rx, ry, hex) {
    cx = Math.round(cx); cy = Math.round(cy);
    for (let dy = -ry; dy <= ry; dy++) {
      const f = 1 - (dy * dy) / (ry * ry + ry * 0.5);
      if (f < 0) continue;
      const half = Math.floor(Math.sqrt(f) * (rx + 0.5));
      this.hline(cx - half, cx + half, cy + dy, hex);
    }
  }
  toTexture(scene, key) {
    const tex = scene.textures.createCanvas(key, this.w, this.h);
    tex.getContext().putImageData(new ImageData(this.d, this.w, this.h), 0, 0);
    tex.refresh();
    return tex;
  }
}

/**
 * Form-Maske: Vereinigung von Kreisen/Ellipsen, die danach schattiert gemalt wird.
 * Die Tonstufe eines Pixels richtet sich nach seiner Tiefe in Lichtrichtung (oben links):
 * nahe am beleuchteten Rand hell, innen/unten rechts dunkel – wie handgesetzte Pixel-Art.
 */
class Mask {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.m = new Uint8Array(w * h);
    this.y0 = h; this.y1 = -1;
  }
  reset() {
    if (this.y1 >= this.y0) this.m.fill(0, this.y0 * this.w, (this.y1 + 1) * this.w);
    this.y0 = this.h; this.y1 = -1;
  }
  set(x, y) {
    y |= 0;
    if (y < 0 || y >= this.h) return;
    x = (((x | 0) % this.w) + this.w) % this.w;
    this.m[y * this.w + x] = 1;
    if (y < this.y0) this.y0 = y;
    if (y > this.y1) this.y1 = y;
  }
  has(x, y) {
    y |= 0;
    if (y < 0 || y >= this.h) return false;
    x = (((x | 0) % this.w) + this.w) % this.w;
    return this.m[y * this.w + x] === 1;
  }
  hline(x0, x1, y) { for (let x = x0; x <= x1; x++) this.set(x, y); }
  disc(cx, cy, r) {
    cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.floor(Math.sqrt(r * r + r * 0.5 - dy * dy));
      this.hline(cx - half, cx + half, cy + dy);
    }
  }
  ellipse(cx, cy, rx, ry) {
    cx = Math.round(cx); cy = Math.round(cy);
    for (let dy = -ry; dy <= ry; dy++) {
      const f = 1 - (dy * dy) / (ry * ry + ry * 0.5);
      if (f < 0) continue;
      this.hline(cx - Math.floor(Math.sqrt(f) * (rx + 0.5)), cx + Math.floor(Math.sqrt(f) * (rx + 0.5)), cy + dy);
    }
  }
  /**
   * Malt die Maske schattiert. tones: hell → dunkel; bands: Tiefen-Grenzen je Tonstufe;
   * (dx, dy): Richtung zur Lichtquelle; noise: Anteil Pixel mit Nachbarton (Blattstruktur).
   */
  paint(p, tones, dx, dy, bands, rnd, noise = 0) {
    const maxDepth = bands[bands.length - 1];
    for (let y = this.y0; y <= this.y1; y++) {
      for (let x = 0; x < this.w; x++) {
        if (!this.has(x, y)) continue;
        let depth = 0;
        while (depth < maxDepth && this.has(x + dx * (depth + 1), y + dy * (depth + 1))) depth++;
        let k = 0;
        while (k < bands.length && depth >= bands[k]) k++;
        if (noise && rnd.frac() < noise) k += rnd.frac() < 0.5 ? -1 : 1;
        k = Math.max(0, Math.min(tones.length - 1, k));
        p.set(x, y, tones[k]);
      }
    }
  }
}

// ---------------------------------------------------------------- Himmel

const SKY_STOPS = [
  [0, '#1b2150'], [0.2, '#2b3a7a'], [0.45, '#6a4f8e'], [0.66, '#a86478'], [0.84, '#dd8a62'], [1, '#f6b473'],
];
function skyColor(t) {
  for (let i = 1; i < SKY_STOPS.length; i++) {
    const [ta, a] = SKY_STOPS[i - 1], [tb, b] = SKY_STOPS[i];
    if (t <= tb) return mix(a, b, (t - ta) / (tb - ta));
  }
  return SKY_STOPS[SKY_STOPS.length - 1][1];
}

/** Himmel-Verlauf (Bildschirmgröße, scrollt nicht): Dämmerung, Sterne, Mondsichel. */
function makeSky(scene, w, h) {
  const p = new Pix(w, h);
  for (let y = 0; y < h; y++) p.hline(0, w - 1, y, skyColor(y / (h - 1)));
  const rnd = new Phaser.Math.RandomDataGenerator(['sky']);
  for (let i = 0; i < 38; i++) {
    const x = rnd.between(0, w - 1), y = rnd.between(2, Math.round(h * 0.42));
    const base = skyColor(y / (h - 1)), b = rnd.frac();
    p.set(x, y, mix(base, '#ffffff', 0.35 + b * 0.5));
    if (b > 0.78) {
      const c = mix(base, '#ffffff', 0.3);
      p.set(x - 1, y, c); p.set(x + 1, y, c); p.set(x, y - 1, c); p.set(x, y + 1, c);
    }
  }
  // Mondsichel oben rechts mit zartem Hof
  const mx = Math.round(w * 0.8), my = 40;
  p.disc(mx, my, 11, mix(skyColor(my / h), '#fff3d0', 0.18));
  p.disc(mx, my, 9, '#f6ecc8');
  p.disc(mx + 4, my - 2, 8, mix(skyColor(my / h), '#fff3d0', 0.18));
  p.toTexture(scene, 'sky');
}

/** Wolkenbänder der Dämmerung: oben violett, Unterseite warm angestrahlt. */
function makeClouds(scene, w, h) {
  const p = new Pix(w, h), mask = new Mask(w, h);
  const rnd = new Phaser.Math.RandomDataGenerator(['clouds']);
  const bands = [
    { y: 44, tones: ['#c58ca4', '#9a6f9e', '#7d5a93'], n: 3 },
    { y: 76, tones: ['#e0a493', '#b07d9b', '#8c648f'], n: 4 },
    { y: 112, tones: ['#f0b48e', '#c48c90', '#a07489'], n: 3 },
  ];
  for (const band of bands) {
    for (let i = 0; i < band.n; i++) {
      const x = Math.round((i / band.n) * w + rnd.between(-30, 30));
      const y = band.y + rnd.between(-8, 8);
      const len = rnd.between(50, 120), thick = rnd.between(3, 5);
      mask.reset();
      const parts = 3 + Math.round(len / 30);
      for (let k = 0; k < parts; k++) {
        const px = x + (k / (parts - 1)) * len;
        mask.ellipse(px, y + rnd.between(-1, 1), len / parts * 0.9 + 4, thick - (k % 2) + rnd.between(0, 1));
      }
      // Licht kommt von unten (Sonne am Horizont): Tiefe nach unten messen
      mask.paint(p, band.tones, 0, 1, [1, 3, 99], rnd, 0.04);
    }
  }
  p.toTexture(scene, 'bg_clouds');
}

// ---------------------------------------------------------------- Ferne Ebene

/** Periodischer Kamm (Summe von Sinus-Wellen, nahtlos in w). */
function ridge(x, w, base, waves) {
  const t = (x / w) * Math.PI * 2;
  let y = base;
  for (const [freq, amp, phase] of waves) y += Math.sin(t * freq + phase) * amp;
  return Math.round(y);
}

/** Dunstige Berge und Hügel mit Baumsilhouetten (Luftperspektive: hell, entsättigt). */
function makeFar(scene, w, h) {
  const p = new Pix(w, h);
  const rnd = new Phaser.Math.RandomDataGenerator(['far']);
  const MOUNT = '#8777b3', MOUNT_LIT = '#9c8cc6', MOUNT_RIM = '#b3a4d6';
  const HILL = '#6c5b9b', HILL_TREE = '#5d4d8b', MIST = '#9f8fc2', DEEP = '#574985';
  const mWaves = [[2, 16, 0.6], [5, 9, 2.1], [13, 4, 0.3], [23, 1.5, 1.7]];
  const hWaves = [[3, 7, 1.2], [7, 4, 0.4], [17, 2, 2.5]];
  const fWaves = [[3, 11, 2.0], [7, 5, 0.9], [15, 2, 1.3]];

  // Ganz ferne Bergkette: noch heller im Dunst
  for (let x = 0; x < w; x++) {
    const y = ridge(x, w, 106, fWaves);
    p.vline(x, y, h - 1, '#9d8fc4');
    p.set(x, y, '#b9acd9');
    if (dither(x, y + 1, 0.5)) p.set(x, y + 1, '#b9acd9');
  }
  // Berge: Linke Flanken (zur Lichtquelle) heller, Grat mit heller Kante
  for (let x = 0; x < w; x++) {
    const y = ridge(x, w, 118, mWaves);
    const prev = ridge(x - 1, w, 118, mWaves);
    p.vline(x, y, h - 1, MOUNT);
    const lit = y <= prev ? 7 : 2;
    for (let k = 0; k < lit; k++) if (dither(x, y + k, 1 - k / lit)) p.set(x, y + k, MOUNT_LIT);
    p.set(x, y, MOUNT_RIM);
  }
  // Dunstband zwischen Bergen und Hügeln
  for (let y = 142; y < 168; y++) {
    const t = 1 - Math.abs((y - 155) / 13);
    for (let x = 0; x < w; x++) if (dither(x, y, t * 0.8)) p.set(x, y, MIST);
  }
  // Hügel mit Baumsilhouetten
  for (let x = 0; x < w; x++) {
    const y = ridge(x, w, 168, hWaves);
    p.vline(x, y, h - 1, HILL);
  }
  for (let x = rnd.between(0, 6); x < w; x += rnd.between(5, 11)) {
    const y = ridge(x, w, 168, hWaves) + 1;
    if (rnd.frac() < 0.6) {
      // Nadelbaum
      const hgt = rnd.between(8, 17);
      for (let k = 0; k < hgt; k++) {
        const half = Math.floor((k / hgt) * 3.6);
        p.hline(x - half, x + half, y - hgt + k, HILL_TREE);
      }
    } else {
      // Laubbaum
      const r = rnd.between(3, 5);
      p.disc(x, y - r - 1, r, HILL_TREE);
      p.vline(x, y - 2, y, HILL_TREE);
    }
  }
  // Nach unten langsam dunkler (zweite Hügelreihe, Dunst)
  for (let y = 190; y < h; y++) {
    const t = Math.min(1, (y - 190) / 40);
    for (let x = 0; x < w; x++) if (dither(x, y, t)) p.set(x, y, DEEP);
  }
  p.toTexture(scene, 'bg_far');
}

// ---------------------------------------------------------------- Bäume

/**
 * Laubbaum: Stamm mit Wurzeln, voluminöse Krone aus mehreren Kugeln (schattiert),
 * Aststummel unter der Krone, hängende Zweige mit Blattbüscheln.
 */
function tree(p, mask, rnd, cx, baseY, size, crown, trunk, opts = {}) {
  const tw = Math.max(3, Math.round(size * 0.3));
  const trunkH = Math.round(size * (opts.trunk ?? 1.7)) + rnd.between(-3, 3);
  const cy = baseY - trunkH - Math.round(size * 0.35);

  // Stamm: links Licht, rechts Schatten, unten Wurzelansatz
  const x0 = cx - Math.floor(tw / 2);
  for (let y = cy; y < baseY; y++) {
    const flare = Math.max(0, y - (baseY - 4));
    p.hline(x0 - flare, x0 + tw - 1 + flare, y, trunk[1]);
    p.set(x0 - flare, y, trunk[0]);
    p.set(x0 + tw - 1 + flare, y, trunk[2]);
    if (tw > 4) p.set(x0 + tw - 2 + flare, y, trunk[2]);
  }
  // Aststummel, die in die Krone laufen
  const crownBottom = cy + Math.round(size * 0.75);
  for (const dir of [-1, 1]) {
    const ay = crownBottom + rnd.between(-1, 3);
    const len = Math.round(size * 0.5);
    for (let k = 0; k < len; k++) p.set(cx + dir * (Math.floor(tw / 2) + k), ay - Math.round(k * 0.7), trunk[2]);
  }
  // Schatten der Krone auf dem Stamm
  for (let y = crownBottom; y < crownBottom + 4; y++) p.hline(x0, x0 + tw - 1, y, trunk[2]);

  // Krone: Kugelhaufen
  mask.reset();
  mask.disc(cx, cy, size);
  const n = 5 + rnd.between(0, 2);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd.realInRange(-0.3, 0.3);
    const d = size * rnd.realInRange(0.55, 0.8);
    mask.disc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.75, size * rnd.realInRange(0.42, 0.62));
  }
  // kleine Büschel am unteren Rand (ausgefranste Unterkante)
  for (let i = 0; i < 3; i++) {
    mask.disc(cx + rnd.between(-size, size), cy + size * rnd.realInRange(0.6, 0.85), size * 0.25);
  }
  mask.paint(p, crown, -1, -1, [2, 6, 12], rnd, opts.noise ?? 0.07);

  // Hängende Zweige: kurzer Stiel, flaches Blattbüschel direkt unter der Krone
  const twigs = opts.twigs ?? 2;
  for (let i = 0; i < twigs; i++) {
    const tx = cx + rnd.between(-size, size);
    let ty = cy + size;
    while (ty > cy && !mask.has(tx, ty)) ty--;
    const len = rnd.between(2, 4);
    p.vline(tx, ty + 1, ty + len, trunk[2]);
    mask.reset();
    mask.ellipse(tx, ty + len + 1, 3, 1);
    mask.set(tx + rnd.pick([-2, 2]), ty + len + 3);
    mask.set(tx + rnd.pick([-1, 1]), ty + len + 3);
    mask.paint(p, crown, -1, -1, [1, 3, 99], rnd, 0);
  }
}

/** Grasbüschel (3-5 px) für Waldböden. */
function tuft(p, x, y, c, big = false) {
  p.set(x, y, c); p.set(x - 1, y - 1, c); p.set(x + 1, y - 1, c);
  if (big) { p.set(x, y - 1, c); p.set(x - 2, y - 2, c); p.set(x + 2, y - 2, c); p.set(x, y - 2, c); }
}

/** Hintere Baumreihe: im Dunst, flacher und violett gebrochen. */
function makeBackTrees(scene, w, h) {
  const p = new Pix(w, h), mask = new Mask(w, h);
  const rnd = new Phaser.Math.RandomDataGenerator(['back']);
  const crown = ['#9f7290', '#875f80', '#704d6f', '#5b3d5f'];
  const trunk = ['#5f4660', '#4b3650', '#3a2a42'];
  const baseY = 240;
  p.rect(0, baseY, w, h - baseY, '#3f2d46');
  for (let x = 0; x < w; x++) if (dither(x, baseY, 0.5)) p.set(x, baseY, '#4e3a54');
  const n = 11;
  for (let i = 0; i < n; i++) {
    const cx = Math.round((i / n) * w + rnd.between(-10, 10));
    tree(p, mask, rnd, cx, baseY + rnd.between(0, 2), rnd.between(13, 18), crown, trunk, { trunk: 3.0, noise: 0.03, twigs: 1 });
  }
  p.toTexture(scene, 'bg_back');
}

/** Hauptbaumreihe: kräftige Herbstbäume, Stämme bis zum Waldboden. */
function makeMidTrees(scene, w, h) {
  const p = new Pix(w, h), mask = new Mask(w, h);
  const rnd = new Phaser.Math.RandomDataGenerator(['trees']);
  const crowns = [
    ['#ee8e62', '#cb5f47', '#a04040', '#722b3a'],   // rot
    ['#f7b86a', '#df843c', '#b65c2c', '#80402a'],   // orange
    ['#f8d882', '#e0ac46', '#b47f30', '#7d5628'],   // gold
  ];
  const trunk = ['#7d5a66', '#55363f', '#38222e'];
  const baseY = 236;
  // Waldboden: dunkel, mit Laubresten und Grasbüscheln
  p.rect(0, baseY, w, h - baseY, '#3a2535');
  for (let x = 0; x < w; x++) {
    if (dither(x, baseY, 0.6)) p.set(x, baseY, '#5a3d48');
    if (dither(x, baseY + 1, 0.3)) p.set(x, baseY + 1, '#4c3240');
  }
  for (let i = 0; i < 70; i++) {
    const x = rnd.between(0, w - 1), y = baseY + rnd.between(1, 14);
    p.set(x, y, rnd.pick(['#6a3a3a', '#7a4a30', '#5c3a44', '#8a5a30']));
  }
  // Bäume: Größen und Farben abwechseln, leicht versetzt, damit sich Kronen überlappen
  const n = 10;
  for (let i = 0; i < n; i++) {
    const cx = Math.round((i / n) * w + rnd.between(-9, 9));
    const size = rnd.between(19, 26);
    tree(p, mask, rnd, cx, baseY + rnd.between(0, 3), size, crowns[(i + rnd.between(0, 1)) % 3], trunk, { trunk: 2.6, twigs: 2 });
  }
  // Ein paar kleine Bäume davor
  for (let i = 0; i < 4; i++) {
    const cx = Math.round(((i + 0.5) / 4) * w + rnd.between(-30, 30));
    tree(p, mask, rnd, cx, baseY + 4, rnd.between(11, 14), crowns[rnd.between(0, 2)], trunk, { trunk: 2.0, twigs: 1 });
  }
  for (let i = 0; i < 40; i++) {
    const x = rnd.between(0, w - 1);
    tuft(p, x, baseY + rnd.between(0, 2), rnd.pick(['#6d5a3a', '#7e6a3e', '#5e5236']), rnd.frac() < 0.4);
  }
  p.toTexture(scene, 'bg_mid');
}

// ---------------------------------------------------------------- Nahe Ebene

/** Farn: Fächer aus Wedeln mit kleinen Fiederblättchen. */
function fern(p, rnd, x, y, c, cDark) {
  const n = rnd.between(4, 6);
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (0.15 + 0.7 * (i / (n - 1))) + rnd.realInRange(-0.1, 0.1);
    const len = rnd.between(7, 12);
    for (let k = 1; k <= len; k++) {
      const px = x + Math.cos(a) * k * 0.9, py = y - Math.sin(a) * k * 0.7;
      p.set(px, py, k > len - 3 ? c : cDark);
      if (k % 2 === 0 && k < len - 1) { p.set(px - Math.sin(a), py - Math.cos(a) * 0.5, c); p.set(px + Math.sin(a), py + Math.cos(a) * 0.5, c); }
    }
  }
}

/** Kleiner Pilz mit Punkten. */
function mushroom(p, x, y, r, cap, capLit, capDark, stem) {
  p.rect(x - 1, y - r, 2, r + 1, stem);
  p.set(x, y, mix(stem, '#000000', 0.3));
  for (let dy = 0; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r + r * 0.5 - dy * dy));
    p.hline(x - half, x + half, y - r - dy, dy > r * 0.6 ? capLit : cap);
  }
  p.hline(x - r, x + r, y - r, capDark);
  p.set(x - Math.round(r / 2), y - r - Math.round(r / 2), '#fff0dc');
  p.set(x + 1, y - r - 1, '#fff0dc');
}

/** Nahe Ebene: hängendes Laubdach oben, Unterholz (Büsche, Farne, Pilze, Laubhaufen) unten. */
function makeNear(scene, w, h) {
  const p = new Pix(w, h), mask = new Mask(w, h);
  const rnd = new Phaser.Math.RandomDataGenerator(['near']);
  const canopy = ['#c9683f', '#9a4334', '#6c2a2c', '#471c25'];
  const BRANCH = '#2c1a22', BRANCH_LIT = '#4a2e36';

  // Laubdach: drei Äste ragen schräg von oben herein, verzweigen sich und tragen flache Blattklumpen
  for (let i = 0; i < 3; i++) {
    const x0 = Math.round((i / 3) * w + rnd.between(-20, 20));
    const dir = rnd.pick([-1, 1]);
    const len = rnd.between(34, 48);
    const slope = dir * rnd.realInRange(0.5, 0.9);
    const pts = [];
    for (let k = 0; k < len; k++) {
      const bx = Math.round(x0 + k * slope);
      pts.push([bx, k]);
      const thick = k < len * 0.5 ? 3 : 2;
      for (let t = 0; t < thick; t++) p.set(bx + t, k, t === 0 ? BRANCH_LIT : BRANCH);
    }
    // Seitenäste abwechselnd nach beiden Seiten, Enden merken
    const clumps = [];
    for (let j = 0; j < 3; j++) {
      const [sx, sy] = pts[Math.round(len * (0.25 + j * 0.25))];
      const sdir = j % 2 === 0 ? -dir : dir;
      const slen = rnd.between(10, 20);
      for (let k = 0; k < slen; k++) p.set(sx + sdir * k, sy + Math.round(k * 0.35), BRANCH);
      clumps.push([sx + sdir * slen, sy + Math.round(slen * 0.35), rnd.between(8, 12)]);
    }
    clumps.push([pts[len - 1][0], pts[len - 1][1], rnd.between(11, 14)]);
    clumps.push([pts[Math.round(len * 0.5)][0], pts[Math.round(len * 0.5)][1], rnd.between(7, 10)]);
    // Blattklumpen hängen unter den Astenden, breiter als hoch, ausgefranst
    mask.reset();
    for (const [cx, cy, r] of clumps) {
      mask.ellipse(cx, cy + r * 0.4, r * 1.3, r * 0.8);
      mask.disc(cx - r * 0.5, cy + r * 0.3, r * 0.6);
      mask.disc(cx + r * 0.5, cy + r * 0.5, r * 0.65);
      mask.disc(cx + rnd.between(-r, r) * 0.5, cy + r * 0.9, r * 0.4);
    }
    mask.paint(p, canopy, -1, -1, [2, 5, 10], rnd, 0.07);
  }

  // Unterholz
  const baseY = 232;
  const FILL = '#1e1620';
  p.rect(0, baseY + 10, w, h - baseY - 10, FILL);
  const bush = ['#5a7a4a', '#3e5838', '#2b3e2c', '#1e2922'];
  // Büsche: dichte Reihe, überlappend
  for (let i = 0; i < 16; i++) {
    const x = Math.round((i / 16) * w + rnd.between(-8, 8));
    const r = rnd.between(9, 14);
    mask.reset();
    mask.disc(x, baseY + 8 + rnd.between(0, 4), r);
    mask.disc(x - r * 0.6, baseY + 12, r * 0.7);
    mask.disc(x + r * 0.6, baseY + 11, r * 0.75);
    mask.disc(x + rnd.between(-4, 4), baseY + 4 + rnd.between(0, 3), r * 0.55);
    mask.paint(p, bush, -1, -1, [2, 5, 9], rnd, 0.08);
  }
  // Boden unter den Büschen: nicht ganz flach (dunkle Krümel)
  for (let i = 0; i < 120; i++) p.set(rnd.between(0, w - 1), baseY + rnd.between(24, 60), rnd.pick(['#2a2030', '#281c26']));
  // Laubhaufen vor den Büschen
  for (let i = 0; i < 7; i++) {
    const x = rnd.between(0, w - 1), y = baseY + rnd.between(19, 23);
    mask.reset();
    mask.ellipse(x, y, rnd.between(8, 13), rnd.between(2, 4));
    mask.ellipse(x + rnd.between(-5, 5), y - 2, rnd.between(4, 7), 2);
    mask.paint(p, ['#c2733f', '#964d2f', '#6a3324'], -1, -1, [1, 3, 99], rnd, 0.12);
  }
  // Farne und Pilze davor
  for (let i = 0; i < 10; i++) {
    fern(p, rnd, rnd.between(0, w - 1), baseY + rnd.between(16, 23), '#6f9a4c', '#3f6133');
  }
  for (let i = 0; i < 6; i++) {
    const x = rnd.between(0, w - 1), r = rnd.between(2, 4);
    mushroom(p, x, baseY + rnd.between(16, 22), r, '#c24a4a', '#e07060', '#7a2430', '#e0cfb0');
  }
  // Bodenlinie mit Grasbüscheln
  for (let i = 0; i < 60; i++) {
    tuft(p, rnd.between(0, w - 1), baseY + rnd.between(18, 26), rnd.pick(['#3f5a34', '#55703f', '#2e4028']), rnd.frac() < 0.5);
  }
  p.toTexture(scene, 'bg_near');
}

// ---------------------------------------------------------------- Weltkarte

/** Weltkarten-Hintergrund: Abendhimmel, ferne Berge, Waldlichtung mit Bäumen, Teich. */
function makeWorldMap(scene, w, h) {
  const p = new Pix(w, h), mask = new Mask(w, h);
  const rnd = new Phaser.Math.RandomDataGenerator(['map']);
  const horizon = 86;
  for (let y = 0; y < horizon; y++) p.hline(0, w - 1, y, skyColor(0.1 + (y / horizon) * 0.8));
  for (let i = 0; i < 20; i++) {
    const x = rnd.between(0, w - 1), y = rnd.between(2, 40);
    p.set(x, y, mix(skyColor(0.1 + (y / horizon) * 0.8), '#ffffff', 0.6));
  }
  // Berge
  for (let x = 0; x < w; x++) {
    const y = ridge(x, w, 70, [[2, 10, 1.1], [5, 6, 0.3], [11, 2, 2.2]]);
    const prev = ridge(x - 1, w, 70, [[2, 10, 1.1], [5, 6, 0.3], [11, 2, 2.2]]);
    p.vline(x, y, horizon, '#8777b3');
    const lit = y <= prev ? 6 : 2;
    for (let k = 0; k < lit; k++) if (dither(x, y + k, 1 - k / lit)) p.set(x, y + k, '#9c8cc6');
    p.set(x, y, '#b3a4d6');
  }
  // Hügelkamm mit Nadelbäumen
  for (let x = 0; x < w; x++) {
    const y = ridge(x, w, horizon - 2, [[3, 4, 0.5], [9, 2, 1.4]]);
    p.vline(x, y, horizon, '#5d4d8b');
  }
  for (let x = 2; x < w; x += rnd.between(4, 9)) {
    const y = ridge(x, w, horizon - 2, [[3, 4, 0.5], [9, 2, 1.4]]);
    const hgt = rnd.between(6, 12);
    for (let k = 0; k < hgt; k++) p.hline(x - Math.floor((k / hgt) * 3), x + Math.floor((k / hgt) * 3), y - hgt + k, '#4e3f7c');
  }
  // Wiese: abendliches Grün, nach unten dunkler, mit Dithering
  const meadow = ['#5b8a34', '#4f7a2e', '#436a2a', '#375a26'];
  for (let y = horizon; y < h; y++) {
    const t = (y - horizon) / (h - horizon);
    const k = Math.min(meadow.length - 2, Math.floor(t * (meadow.length - 1)));
    const f = t * (meadow.length - 1) - k;
    for (let x = 0; x < w; x++) p.set(x, y, dither(x, y, f) ? meadow[k + 1] : meadow[k]);
  }
  // Wiesen-Textur: Grasbüschel, Blümchen
  for (let i = 0; i < 160; i++) {
    const x = rnd.between(0, w - 1), y = rnd.between(horizon + 4, h - 2);
    tuft(p, x, y, rnd.pick(['#6a9a3a', '#3f6a2a', '#78a845']), false);
  }
  for (let i = 0; i < 30; i++) {
    p.set(rnd.between(0, w - 1), rnd.between(horizon + 10, h - 4), rnd.pick(['#f2c230', '#e85a5a', '#fff0dc']));
  }
  // Teich unten rechts
  mask.reset();
  mask.ellipse(430, 232, 34, 12);
  mask.ellipse(405, 240, 18, 8);
  mask.paint(p, ['#8fc4e8', '#4f8fc8', '#3769a8'], 0, -1, [1, 4, 99], rnd, 0);
  for (let x = 400; x < 460; x += rnd.between(5, 9)) p.hline(x, x + 2, 230 + rnd.between(0, 8), '#a8d8f0');
  // Bäume: dichter Waldsaum oben, verstreut unten – frei um die Level-Punkte
  const crowns = [
    ['#ee8e62', '#cb5f47', '#a04040', '#722b3a'],
    ['#f7b86a', '#df843c', '#b65c2c', '#80402a'],
    ['#f8d882', '#e0ac46', '#b47f30', '#7d5628'],
    ['#a9d65a', '#74a832', '#4f7d24', '#2f5230'],
  ];
  const trunk = ['#7d5a66', '#55363f', '#38222e'];
  const free = (x, y) => WORLD.nodes.every((n) => Math.hypot(n.x - x, n.y - y) > 30)
    && WORLD.edges.every((e) => [...e.points].every((q) => Math.hypot(q.x - x, q.y - y) > 16));
  const spots = [];
  for (let x = 6; x < w; x += rnd.between(16, 26)) spots.push([x + rnd.between(-4, 4), horizon + rnd.between(6, 22), rnd.between(6, 9)]);
  for (let i = 0; i < 40; i++) spots.push([rnd.between(0, w - 1), rnd.between(horizon + 30, h - 6), rnd.between(5, 8)]);
  spots.sort((a, b) => a[1] - b[1]);
  for (const [x, y, size] of spots) {
    if (!free(x, y) || (x > 380 && y > 215)) continue;
    tree(p, mask, rnd, x, y, size, crowns[rnd.between(0, 3)], trunk, { trunk: 1.2, twigs: 0, noise: 0.05 });
  }
  p.toTexture(scene, 'worldmap_bg');
}

/** Erzeugt alle Hintergrund-Texturen (Bildschirmgröße w x h). Einmalig beim Start. */
export function createBackgroundTextures(scene, w, h) {
  const lh = h + LAYER_EXTRA;
  makeSky(scene, w, h);
  makeClouds(scene, w, lh);
  makeFar(scene, w, lh);
  makeBackTrees(scene, w, lh);
  makeMidTrees(scene, w, lh);
  makeNear(scene, w, lh);
  makeWorldMap(scene, w, h);
}
