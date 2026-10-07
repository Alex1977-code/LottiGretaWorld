// Hintergrund-Ebenen des Herbstwalds im 3D-World-Look: Vektorgrafik (Canvas-2D-Pfade, Verläufe,
// weiche Schatten), direkt in Render-Auflösung gezeichnet und kachelbar in X.
// Texturen: 'sky' (fest, 480x270), die Parallax-Ebenen aus PARALLAX_LAYERS (Breite = Bildschirm,
// Höhe = Bildschirm + LAYER_EXTRA für vertikales Scrollen) und 'worldmap_bg' für die Weltkarte.
// Alles wird einmalig beim Start erzeugt (keine Per-Frame-Arbeit).
//
// Komposition: Bei Kamera am Levelboden (worldView.y ≈ 162) liegt die Bodenoberkante bei Bildschirm-y 190.
// Die Ebenen rutschen dabei um worldView.y*fy nach oben, d. h. die Bodenlinie liegt in Texturzeile
// 190 + 162*fy: fern ≈ 196, hinten ≈ 203, mitte ≈ 209, nah ≈ 230 (Verschiebung durch LAYER_EXTRA gedeckelt).

import { RENDER } from '../render.js';
import { WORLD } from '../levels/worldmap.js';

/** Zusätzliche Höhe der Ebenen (deckt die vertikale Parallax-Verschiebung ab). */
export const LAYER_EXTRA = 50;

/**
 * Parallax-Ebenen von hinten nach vorn (fx/fy = Scrollfaktor, alles hinter der Tile-Ebene).
 * bands: Zeilenbereiche [oben, unten?] der Textur, die Inhalt haben – nur diese werden als
 * TileSprite gezeichnet (spart Füllrate); ohne "unten" bis zum Texturende.
 */
export const PARALLAX_LAYERS = [
  { key: 'bg_clouds', fx: 0.04, fy: 0.01, depth: -9.8, bands: [[16, 110]] },
  { key: 'bg_far',    fx: 0.12, fy: 0.04, depth: -9,   bands: [[98]] },
  { key: 'bg_back',   fx: 0.22, fy: 0.08, depth: -8.5, bands: [[158]] },
  { key: 'bg_mid',    fx: 0.35, fy: 0.12, depth: -8,   bands: [[150]] },
  { key: 'bg_near',   fx: 0.6,  fy: 0.25, depth: -7,   bands: [[214]] },
];
// (Die Bänder müssen die gezeichneten Zeilen einschließen – nach Änderungen an den Zeichenroutinen prüfen.)

export const SKY = {
  top: '#4db6ff',
  bottom: '#c8ecff',
};

// ---------------------------------------------------------------- Helfer

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

/** Kleiner deterministischer Zufallsgenerator (mulberry32), damit der Wald bei jedem Start gleich aussieht. */
class Rnd {
  constructor(seed) { this.s = seed >>> 0; }
  frac() {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  real(a, b) { return a + (b - a) * this.frac(); }
  between(a, b) { return Math.floor(this.real(a, b + 1)); }
  pick(arr) { return arr[Math.floor(this.frac() * arr.length)]; }
}

function lin(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}
function rad(ctx, x0, y0, r0, x1, y1, r1, stops) {
  const g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}
function circle(ctx, x, y, r) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}
function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill();
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Kugel: radialer Verlauf mit Licht oben links. */
function ball(ctx, cx, cy, r, [light, mid, dark], ry = r) {
  ctx.fillStyle = rad(ctx, cx - r * 0.35, cy - ry * 0.38, r * 0.08, cx, cy, r * 1.08, [[0, light], [0.5, mid], [1, dark]]);
  ellipse(ctx, cx, cy, r, ry);
}
function gloss(ctx, cx, cy, rx, ry, alpha = 0.45, rot = -0.6) {
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ellipse(ctx, cx, cy, rx, ry, rot);
}

/**
 * Ruft fn(x) auf – und zusätzlich um w verschoben, wenn das Objekt (Radius m) über den Rand ragt
 * (Kachelung). Der Zufallsgenerator wird für jede Kopie auf denselben Stand gesetzt, damit die
 * Randkopie identisch aussieht.
 */
function wrapped(x, w, m, fn, rnd) {
  const s0 = rnd?.s;
  const call = (xx) => { if (rnd) rnd.s = s0; fn(xx); };
  call(x);
  if (x - m < 0) call(x + w);
  if (x + m > w) call(x - w);
}

/** Periodischer Kamm (Summe von Sinus-Wellen mit ganzzahliger Frequenz → nahtlos in w). */
function ridgeY(x, w, base, waves) {
  const t = (x / w) * Math.PI * 2;
  let y = base;
  for (const [freq, amp, phase] of waves) y += Math.sin(t * freq + phase) * amp;
  return y;
}
/** Füllt die Fläche vom Kamm bis `bottom`. */
function fillRidge(ctx, w, base, waves, bottom, style) {
  ctx.fillStyle = style;
  ctx.beginPath();
  ctx.moveTo(0, ridgeY(0, w, base, waves));
  for (let x = 2; x <= w; x += 2) ctx.lineTo(x, ridgeY(x, w, base, waves));
  ctx.lineTo(w, bottom); ctx.lineTo(0, bottom);
  ctx.closePath(); ctx.fill();
}

/** Textur in Render-Auflösung anlegen; draw(ctx, w, h) zeichnet in Weltkoordinaten. */
function makeTexture(scene, key, w, h, draw) {
  const S = RENDER.scale;
  const tex = scene.textures.createCanvas(key, w * S, h * S);
  const ctx = tex.getContext();
  ctx.save();
  ctx.scale(S, S);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  draw(ctx, w, h);
  ctx.restore();
  tex.refresh();
  return tex;
}

// ---------------------------------------------------------------- Himmel und Wolken

/** Himmel (Bildschirmgröße, scrollt nicht): klarer Verlauf, Sonne mit weichem Hof. */
export function drawSky(ctx, w, h, sunX = w * 0.78, sunY = 46) {
  ctx.fillStyle = lin(ctx, 0, 0, 0, h, [[0, SKY.top], [0.5, '#82d1ff'], [1, SKY.bottom]]);
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = rad(ctx, sunX, sunY, 0, sunX, sunY, 80, [[0, 'rgba(255, 250, 215, 0.6)'], [0.3, 'rgba(255, 246, 205, 0.22)'], [1, 'rgba(255, 246, 205, 0)']]);
  ctx.fillRect(sunX - 80, sunY - 80, 160, 160);
  ctx.fillStyle = rad(ctx, sunX - 4, sunY - 4, 1, sunX, sunY, 16, [[0, '#fffef2'], [0.6, '#fff5bd'], [1, '#ffe27a']]);
  circle(ctx, sunX, sunY, 16);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  circle(ctx, sunX, sunY, 20);
}

/** Flauschige Wolke: flache Basis mit Kuppeln, weiß oben, zarter Schatten unten. */
function cloud(ctx, x, y, s, rnd, soft = 0) {
  const puffs = [
    [-0.55, 0.05, 0.42], [-0.15, -0.22, 0.55], [0.3, -0.1, 0.48], [0.65, 0.12, 0.36],
  ].map(([dx, dy, r]) => [dx + rnd.real(-0.06, 0.06), dy + rnd.real(-0.05, 0.05), r + rnd.real(-0.04, 0.05)]);
  const shape = () => {
    ctx.beginPath();
    roundRectPath(ctx, x - s * 0.95, y - s * 0.12, s * 1.9, s * 0.5, s * 0.25);
    for (const [dx, dy, r] of puffs) { ctx.moveTo(x + (dx + r) * s, y + dy * s); ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); }
  };
  const top = y - s * 0.8, bottom = y + s * 0.4;
  const white = mix('#ffffff', '#a9d3f5', soft), shade = mix('#cfe3f8', '#9fc6ec', soft);
  shape();
  ctx.fillStyle = lin(ctx, 0, top, 0, bottom, [[0, white], [0.55, white], [1, shade]]);
  ctx.fill();
  ctx.save();
  shape(); ctx.clip();
  // Schattenkante unten (Kuppeln werfen Schatten auf die Basis)
  ctx.fillStyle = lin(ctx, 0, y - s * 0.05, 0, bottom, [[0, 'rgba(150, 190, 235, 0)'], [1, `rgba(150, 190, 235, ${0.55 - soft * 0.3})`]]);
  ctx.fillRect(x - s, y - s * 0.05, s * 2, s * 0.5);
  ctx.restore();
  gloss(ctx, x - s * 0.3, y - s * 0.5, s * 0.3, s * 0.12, 0.6 - soft * 0.3, -0.2);
}
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Wolkenebene: zwei Reihen weicher Wolken, hinten kleiner und zarter. */
function drawClouds(ctx, w) {
  const rnd = new Rnd(11);
  for (let i = 0; i < 4; i++) {
    const x = (i / 4) * w + rnd.real(-20, 20), y = 38 + rnd.real(-6, 14), s = rnd.real(12, 17);
    wrapped(x, w, s * 1.2, (xx) => cloud(ctx, xx, y, s, rnd, 0.35), rnd);
  }
  for (let i = 0; i < 4; i++) {
    const x = (i / 4) * w + 60 + rnd.real(-25, 25), y = 88 + rnd.real(-8, 10), s = rnd.real(20, 27);
    wrapped(x, w, s * 1.2, (xx) => cloud(ctx, xx, y, s, rnd, 0), rnd);
  }
}

// ---------------------------------------------------------------- Ferne Ebene

/** Kleiner runder Baum als Silhouette (für ferne Hügel). */
function farTree(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x - r * 0.18, y - r, r * 0.36, r + 0.5);
  circle(ctx, x, y - r - r * 0.6, r);
  circle(ctx, x - r * 0.55, y - r - r * 0.2, r * 0.6);
  circle(ctx, x + r * 0.55, y - r - r * 0.25, r * 0.6);
}

/** Pastellberge mit Luftperspektive, Dunst, sanfte Hügel mit runden Baumsilhouetten. */
function drawFar(ctx, w, h) {
  const rnd = new Rnd(23);
  const m1 = [[2, 14, 0.6], [5, 7, 2.1], [9, 3, 0.3]];
  const m2 = [[3, 11, 1.4], [7, 5, 0.2], [11, 2.2, 2.4]];
  // Hintere Bergkette: sehr hell, weiche Lichtkante oben
  fillRidge(ctx, w, 126, m1, h, '#d9e6f8');
  fillRidge(ctx, w, 131, m1, h, '#c2d5f0');
  // Vordere Bergkette
  fillRidge(ctx, w, 146, m2, h, '#c8d9f2');
  fillRidge(ctx, w, 150, m2, h, '#aec4e6');
  // Dunst am Fuß der Berge
  ctx.fillStyle = lin(ctx, 0, 150, 0, 182, [[0, 'rgba(225, 238, 250, 0)'], [1, 'rgba(225, 238, 250, 0.85)']]);
  ctx.fillRect(0, 150, w, 32);
  // Hügel mit Bäumen
  const h1 = [[2, 6, 1.0], [6, 3, 0.4], [13, 1, 2.0]];
  const h2 = [[3, 5, 2.2], [8, 2.5, 1.1]];
  fillRidge(ctx, w, 174, h1, h, '#bddcae');
  for (let x = rnd.real(0, 8); x < w; x += rnd.real(6, 13)) {
    const r = rnd.real(2.2, 3.6);
    wrapped(x, w, r * 1.5, (xx) => farTree(ctx, xx, ridgeY(xx, w, 174, h1) + 1, r, '#a6cc95'), rnd);
  }
  fillRidge(ctx, w, 187, h2, h, '#a3cf90');
  for (let x = rnd.real(0, 8); x < w; x += rnd.real(7, 15)) {
    const r = rnd.real(2.6, 4.2);
    wrapped(x, w, r * 1.5, (xx) => farTree(ctx, xx, ridgeY(xx, w, 187, h2) + 1, r, '#8dbd7b'), rnd);
  }
  // nach unten sanft dunkler
  ctx.fillStyle = lin(ctx, 0, 200, 0, h, [[0, 'rgba(90, 140, 80, 0)'], [1, 'rgba(90, 140, 80, 0.5)']]);
  ctx.fillRect(0, 200, w, h - 200);
}

// ---------------------------------------------------------------- Bäume

/**
 * Laubbaum im Spielzeug-Look: dicker runder Stamm mit Wurzelansatz, Krone aus prallen Kugeln
 * (jede mit eigenem Verlauf), Glanzpunkte oben links, Bodenschatten.
 * palette: { crown: [hell, mitte, dunkel], trunk: [hell, mitte, dunkel] }
 */
function tree(ctx, rnd, x, baseY, size, palette, opts = {}) {
  const trunkH = size * (opts.trunk ?? 1.2);
  const tw = Math.max(3.5, size * 0.42);
  const cy = baseY - trunkH - size * 0.55;
  // Bodenschatten
  if (opts.shadow !== false) {
    ctx.fillStyle = `rgba(40, 60, 30, ${opts.shadowAlpha ?? 0.22})`;
    ellipse(ctx, x + 1, baseY - 0.5, tw * 1.6, tw * 0.45);
  }
  // Stamm (leicht ausgestellt), Licht links
  const [tl, tm, td] = palette.trunk;
  ctx.fillStyle = lin(ctx, x - tw / 2, 0, x + tw / 2, 0, [[0, tl], [0.45, tm], [1, td]]);
  ctx.beginPath();
  ctx.moveTo(x - tw * 0.9, baseY);
  ctx.quadraticCurveTo(x - tw * 0.5, baseY - tw * 0.8, x - tw * 0.5, baseY - tw * 1.6);
  ctx.lineTo(x - tw * 0.5, cy);
  ctx.lineTo(x + tw * 0.5, cy);
  ctx.lineTo(x + tw * 0.5, baseY - tw * 1.6);
  ctx.quadraticCurveTo(x + tw * 0.5, baseY - tw * 0.8, x + tw * 0.9, baseY);
  ctx.closePath(); ctx.fill();
  // Kronenschatten auf dem Stamm
  ctx.fillStyle = 'rgba(40, 20, 10, 0.3)';
  ctx.fillRect(x - tw * 0.5, cy + size * 0.3, tw, size * 0.5);
  // Krone: Kugelhaufen – untere/rechte zuerst, obere linke zuletzt
  const n = opts.puffs ?? 5;
  const puffs = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd.real(-0.3, 0.3);
    const d = size * rnd.real(0.45, 0.62);
    puffs.push([x + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7, size * rnd.real(0.5, 0.64)]);
  }
  puffs.push([x, cy - size * 0.1, size * 0.72]);
  puffs.sort((p, q) => (q[1] + q[0] * 0.3) - (p[1] + p[0] * 0.3));
  for (const [px, py, pr] of puffs) ball(ctx, px, py, pr, palette.crown);
  for (const [px, py, pr] of puffs.slice(-2)) gloss(ctx, px - pr * 0.32, py - pr * 0.4, pr * 0.42, pr * 0.2, opts.glossAlpha ?? 0.45);
}

const TRUNK = ['#b98a5f', '#8a5a36', '#5c3a22'];
const CROWNS = {
  orange: ['#ffcf7a', '#f58f3a', '#c45f22'],
  red: ['#ffa38a', '#ef5f44', '#b33a2a'],
  gold: ['#fff0a6', '#f6c54a', '#c98d22'],
  green: ['#b9f286', '#6cc74d', '#3d8f32'],
};
/** Palette aufhellen/entsättigen (Luftperspektive). */
function hazed(colors, t, haze = '#d6e6f4') {
  return colors.map((c) => mix(c, haze, t));
}

/** Hintere Baumreihe: im Dunst, hell und weich, kleinere Kronen. */
function drawBackTrees(ctx, w, h) {
  const rnd = new Rnd(37);
  const baseY = 214;
  const ground = ['#b8d9a4', '#a4cc90'];
  ctx.fillStyle = lin(ctx, 0, baseY - 6, 0, h, [[0, ground[0]], [1, ground[1]]]);
  fillRidge(ctx, w, baseY - 4, [[4, 2, 0.8], [9, 1, 2.0]], h, ctx.fillStyle);
  const pals = ['orange', 'gold', 'red', 'green'].map((k) => ({ crown: hazed(CROWNS[k], 0.45), trunk: hazed(TRUNK, 0.45) }));
  const n = 12;
  for (let i = 0; i < n; i++) {
    const x = (i / n) * w + rnd.real(-8, 8);
    const size = rnd.real(13, 17);
    wrapped(x, w, size * 1.4, (xx) => tree(ctx, rnd, xx, baseY + rnd.real(0, 3), size, pals[(i + rnd.between(0, 1)) % pals.length], { trunk: 1.5, shadowAlpha: 0.12, glossAlpha: 0.3 }), rnd);
  }
}

/** Hauptbaumreihe: kräftige Herbstbäume mit prallen Kugelkronen, Stämme bis zum Waldboden. */
function drawMidTrees(ctx, w, h) {
  const rnd = new Rnd(53);
  const baseY = 222;
  ctx.fillStyle = lin(ctx, 0, baseY - 8, 0, h, [[0, '#8fcb6a'], [1, '#6aa84e']]);
  fillRidge(ctx, w, baseY - 5, [[3, 2.5, 0.3], [8, 1.2, 1.7]], h, ctx.fillStyle);
  const pals = ['orange', 'red', 'gold'].map((k) => ({ crown: hazed(CROWNS[k], 0.22), trunk: hazed(TRUNK, 0.22) }));
  const n = 8;
  for (let i = 0; i < n; i++) {
    const x = (i / n) * w + rnd.real(-10, 10);
    const size = rnd.real(17, 23);
    wrapped(x, w, size * 1.4, (xx) => tree(ctx, rnd, xx, baseY + rnd.real(0, 3), size, pals[(i + rnd.between(0, 1)) % 3], { trunk: 1.5 }), rnd);
  }
  // kleine Bäume davor
  for (let i = 0; i < 4; i++) {
    const x = ((i + 0.5) / 4) * w + rnd.real(-30, 30);
    const size = rnd.real(10, 13);
    wrapped(x, w, size * 1.4, (xx) => tree(ctx, rnd, xx, baseY + 5, size, { crown: hazed(CROWNS[rnd.pick(['gold', 'green', 'orange'])], 0.1), trunk: TRUNK }, { trunk: 0.9, puffs: 4 }), rnd);
  }
}

// ---------------------------------------------------------------- Nahe Ebene

/** Runder Busch aus Kugeln (dunkler, satter als die Bäume). */
function bush(ctx, rnd, x, baseY, r, crown) {
  ctx.fillStyle = 'rgba(20, 50, 20, 0.3)';
  ellipse(ctx, x, baseY, r * 1.4, r * 0.3);
  const puffs = [[-0.7, -0.35, 0.6], [0.7, -0.4, 0.62], [0, -0.95, 0.72], [-0.35, -0.55, 0.6], [0.4, -0.6, 0.6]]
    .map(([dx, dy, pr]) => [x + dx * r + rnd.real(-1, 1), baseY + dy * r + rnd.real(-1, 1), pr * r + rnd.real(-0.5, 0.5)]);
  puffs.sort((p, q) => (q[1] + q[0] * 0.3) - (p[1] + p[0] * 0.3));
  for (const [px, py, pr] of puffs) ball(ctx, px, py, pr, crown);
  const [px, py, pr] = puffs[puffs.length - 1];
  gloss(ctx, px - pr * 0.3, py - pr * 0.38, pr * 0.4, pr * 0.2, 0.35);
}

/** Pilz: Stiel, Hutkuppel mit Verlauf, Punkte. */
function mushroom(ctx, x, y, r, cap) {
  ctx.fillStyle = 'rgba(20, 40, 15, 0.3)';
  ellipse(ctx, x, y, r * 1.1, r * 0.3);
  const stemH = r * 1.3, sw = r * 0.9;
  ctx.fillStyle = lin(ctx, x - sw / 2, 0, x + sw / 2, 0, [[0, '#fff5e4'], [0.5, '#efd9b8'], [1, '#c5a680']]);
  roundRect(ctx, x - sw / 2, y - stemH, sw, stemH, sw * 0.3); ctx.fill();
  const cy = y - stemH + 0.5, capH = r * 0.85;
  ctx.fillStyle = rad(ctx, x - r * 0.35, cy - capH * 0.6, r * 0.1, x, cy - capH * 0.2, r * 1.15, [[0, cap[0]], [0.55, cap[1]], [1, cap[2]]]);
  ctx.beginPath(); ctx.ellipse(x, cy, r, capH, 0, Math.PI, 0); ctx.quadraticCurveTo(x, cy + capH * 0.3, x - r, cy); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255, 250, 240, 0.95)';
  circle(ctx, x - r * 0.4, cy - capH * 0.35, r * 0.2);
  circle(ctx, x + r * 0.3, cy - capH * 0.55, r * 0.16);
  circle(ctx, x + r * 0.5, cy - capH * 0.1, r * 0.13);
}

/** Großes Herbstblatt (liegt flach am Boden): Tropfenform mit Verlauf und Mittelader. */
function bigLeaf(ctx, x, y, len, rot, [light, mid, dark]) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = 'rgba(20, 40, 15, 0.25)';
  ellipse(ctx, 1, 1, len * 0.55, len * 0.3);
  ctx.fillStyle = lin(ctx, -len * 0.5, -len * 0.3, len * 0.5, len * 0.3, [[0, light], [0.5, mid], [1, dark]]);
  ctx.beginPath();
  ctx.moveTo(-len * 0.5, 0);
  ctx.quadraticCurveTo(-len * 0.1, -len * 0.45, len * 0.5, -len * 0.05);
  ctx.quadraticCurveTo(len * 0.1, len * 0.45, -len * 0.5, 0);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(120, 50, 20, 0.5)'; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(-len * 0.45, 0); ctx.quadraticCurveTo(0, -len * 0.08, len * 0.45, -len * 0.04); ctx.stroke();
  ctx.restore();
}

/** Kleine Blume: Stiel, runde Blütenblätter, Mitte. */
function flower(ctx, x, y, h, petal, center, r) {
  ctx.strokeStyle = '#3f9a2a'; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 0.6, y - h * 0.5, x, y - h); ctx.stroke();
  const cy = y - h;
  ctx.fillStyle = petal;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    circle(ctx, x + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.8);
  }
  ctx.fillStyle = center;
  circle(ctx, x, cy, r * 0.7);
}

/** Grasbüschel: schlanke Halme mit Verlauf. */
function tuft(ctx, x, y, h, color) {
  for (const [dx, hh, lean] of [[-2.2, 0.6, -1.4], [-0.8, 0.9, -0.5], [0.6, 1, 0.6], [2, 0.7, 1.5]]) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + dx - 0.7, y);
    ctx.quadraticCurveTo(x + dx + lean * 0.3 - 0.7, y - h * hh * 0.6, x + dx + lean, y - h * hh);
    ctx.quadraticCurveTo(x + dx + lean * 0.5 + 0.7, y - h * hh * 0.5, x + dx + 0.7, y);
    ctx.closePath(); ctx.fill();
  }
}

/** Nahe Ebene: Buschreihe über der Bodenlinie, dunkler Waldboden mit Blättern, Pilzen, Blumen. */
function drawNear(ctx, w, h) {
  const rnd = new Rnd(71);
  const baseY = 244; // Buschkronen ragen ~8 px über die Bodenlinie (Texturzeile ≈ 230)
  // Waldboden (dunkel, nach unten noch dunkler, damit Gruben Tiefe bekommen)
  ctx.fillStyle = lin(ctx, 0, baseY - 10, 0, h, [[0, '#4f8f3c'], [0.2, '#2f6a2a'], [0.55, '#1c4420'], [1, '#12301a']]);
  fillRidge(ctx, w, baseY - 7, [[5, 1.5, 0.4], [11, 0.8, 1.9]], h, ctx.fillStyle);
  // Büsche, dicht und überlappend; ein paar herbstlich gefärbt
  const greens = [['#7fd65c', '#449f36', '#256b24'], ['#6cc74d', '#3a9030', '#1f5f20']];
  const autumn = ['#ffb86a', '#e07a2e', '#9e4c1c'];
  const n = 15;
  for (let i = 0; i < n; i++) {
    const x = (i / n) * w + rnd.real(-8, 8);
    const r = rnd.real(11, 15);
    const crown = rnd.frac() < 0.2 ? autumn : rnd.pick(greens);
    wrapped(x, w, r * 1.8, (xx) => bush(ctx, rnd, xx, baseY + rnd.real(0, 4), r, crown), rnd);
  }
  // Blätter am Boden
  const leafPals = [['#ffb257', '#ff7a2d', '#c43f1b'], ['#ffd06a', '#f0a62a', '#b8701a'], ['#ff8f7a', '#e0503a', '#a0301f']];
  for (let i = 0; i < 12; i++) {
    const x = rnd.real(0, w), y = baseY + rnd.real(8, 40), len = rnd.real(9, 14);
    wrapped(x, w, len, (xx) => bigLeaf(ctx, xx, y, len, rnd.real(-0.5, 0.5), rnd.pick(leafPals)), rnd);
  }
  // Pilze und Blumen vor den Büschen
  for (let i = 0; i < 6; i++) {
    const x = rnd.real(0, w), y = baseY + rnd.real(5, 14), r = rnd.real(2.6, 4);
    wrapped(x, w, r * 2, (xx) => mushroom(ctx, xx, y, r, rnd.frac() < 0.5 ? ['#ff8a80', '#ff3b2f', '#b3221a'] : ['#ffb46e', '#ff7a2d', '#c43f1b']), rnd);
  }
  for (let i = 0; i < 14; i++) {
    const x = rnd.real(0, w), y = baseY + rnd.real(2, 12), hh = rnd.real(4, 7);
    const [p, c] = rnd.pick([['#ffffff', '#ffc21a'], ['#ffe066', '#ff8c3a'], ['#ff9ec9', '#fff0c0']]);
    wrapped(x, w, 4, (xx) => flower(ctx, xx, y, hh, p, c, 1.4), rnd);
  }
  for (let i = 0; i < 40; i++) {
    const x = rnd.real(0, w), y = baseY + rnd.real(0, 40);
    const shade = Math.min(1, (y - baseY) / 40); // weiter unten dunkler
    wrapped(x, w, 4, (xx) => tuft(ctx, xx, y, rnd.real(4, 7), mix(rnd.pick(['#5fb844', '#3f9032', '#7fd65c']), '#1c4420', shade * 0.6)), rnd);
  }
}

// ---------------------------------------------------------------- Weltkarte

/** Weltkarten-Hintergrund: heller Himmel, Pastellberge, sonnige Wiese mit Bäumen, Teich. */
function drawWorldMap(ctx, w, h) {
  const rnd = new Rnd(97);
  const horizon = 96;
  drawSky(ctx, w, horizon + 20, w * 0.14, 34);
  cloud(ctx, 110, 30, 14, rnd, 0.2);
  cloud(ctx, 300, 44, 18, rnd, 0);
  cloud(ctx, 420, 26, 12, rnd, 0.3);
  // Berge
  const mw = [[2, 10, 1.1], [5, 6, 0.3], [11, 2, 2.2]];
  fillRidge(ctx, w, 66, mw, horizon, '#d9e6f8');
  fillRidge(ctx, w, 71, mw, horizon, '#b9cdeb');
  ctx.fillStyle = lin(ctx, 0, 76, 0, horizon, [[0, 'rgba(225, 238, 250, 0)'], [1, 'rgba(225, 238, 250, 0.8)']]);
  ctx.fillRect(0, 76, w, horizon - 76);
  // Wiese: hell am Horizont, satt nach unten; weiche Hügelbänder
  const hw = [[3, 3, 0.5], [7, 1.5, 1.4]];
  fillRidge(ctx, w, horizon - 4, hw, h, lin(ctx, 0, horizon - 8, 0, h, [[0, '#a9e07a'], [0.35, '#74c44c'], [1, '#4f9f36']]));
  for (const [y, amp, k, a] of [[horizon + 36, 5, 2, 0.12], [horizon + 86, 6, 3, 0.1], [horizon + 136, 5, 2, 0.1]]) {
    fillRidge(ctx, w, y, [[k, amp, 1.3 + k], [k * 3, amp * 0.3, 0.2]], y + 14, `rgba(255, 255, 220, ${a})`);
  }
  // Baumreihe am Horizont
  for (let x = rnd.real(0, 6); x < w; x += rnd.real(5, 10)) {
    farTree(ctx, x, ridgeY(x, w, horizon - 4, hw) + 1, rnd.real(2.2, 3.6), rnd.frac() < 0.5 ? '#8fc47c' : '#a8cf8a');
  }
  // Teich unten rechts mit Sandufer, Verlauf und Glanz
  const px = 428, py = 232;
  ctx.fillStyle = '#e9dcb0'; ellipse(ctx, px, py + 1, 44, 16);
  ctx.fillStyle = lin(ctx, 0, py - 13, 0, py + 13, [[0, '#9fdcff'], [0.5, '#4ea8ea'], [1, '#2f78c4']]);
  ellipse(ctx, px, py, 40, 13);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ellipse(ctx, px - 12, py - 5, 12, 2.2, -0.1);
  ellipse(ctx, px + 14, py + 3, 7, 1.4, 0.1);
  // Bäume und Büsche frei um die Level-Punkte und Pfade
  const free = (x, y) => WORLD.nodes.every((n) => Math.hypot(n.x - x, n.y - y) > 32)
    && WORLD.edges.every((e) => e.points.every((q) => Math.hypot(q.x - x, q.y - y) > 18))
    && !(x > 375 && y > 205);
  const pals = ['orange', 'red', 'gold', 'green'].map((k) => ({ crown: CROWNS[k], trunk: TRUNK }));
  const spots = [];
  for (let x = 6; x < w; x += rnd.real(16, 26)) spots.push([x + rnd.real(-4, 4), horizon + rnd.real(8, 24), rnd.real(6, 9)]);
  for (let i = 0; i < 36; i++) spots.push([rnd.real(0, w), rnd.real(horizon + 30, h - 8), rnd.real(5, 8)]);
  spots.sort((a, b) => a[1] - b[1]);
  for (const [x, y, size] of spots) {
    if (!free(x, y)) continue;
    tree(ctx, rnd, x, y, size, rnd.pick(pals), { trunk: 0.8, puffs: 4, shadowAlpha: 0.2 });
  }
  // Blümchen
  for (let i = 0; i < 40; i++) {
    const x = rnd.real(4, w - 4), y = rnd.real(horizon + 14, h - 6);
    if (!free(x, y)) continue;
    ctx.fillStyle = rnd.pick(['#ffffff', '#ffe066', '#ff9ec9']);
    circle(ctx, x, y, 1.1);
  }
}

/** Erzeugt alle Hintergrund-Texturen (Bildschirmgröße w x h). Einmalig beim Start. */
export function createBackgroundTextures(scene, w, h) {
  const lh = h + LAYER_EXTRA;
  makeTexture(scene, 'sky', w, h, drawSky);
  makeTexture(scene, 'bg_clouds', w, lh, drawClouds);
  makeTexture(scene, 'bg_far', w, lh, drawFar);
  makeTexture(scene, 'bg_back', w, lh, drawBackTrees);
  makeTexture(scene, 'bg_mid', w, lh, drawMidTrees);
  makeTexture(scene, 'bg_near', w, lh, drawNear);
  makeTexture(scene, 'worldmap_bg', w, h, drawWorldMap);
}
