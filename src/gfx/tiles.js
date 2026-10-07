// Tile-Zeichnung (16x16 Weltpixel) als Vektorgrafik im 3D-World-Look: pralle Grasdecke,
// warme Erde, weiche Licht-/Schattenkanten, runde Außenecken. Boden-Tiles sind "Autotiles"
// nach freiliegenden Kanten: Index 0..15 = Bitmaske (oben=1, rechts=2, unten=4, links=8).
// Danach Spezial-Tiles (Plattform, Steinblöcke), Zier-Tiles und Höhlenboden. Tiled-GID = Index + 1.
//
// Der Kontext ist bereits auf die Render-Auflösung skaliert; gezeichnet wird in Weltpixeln mit
// Kurven, Verläufen und Bruchkoordinaten. Alle Muster sind in 16 px periodisch (Sinus-Wellen mit
// ganzzahliger Frequenz), damit benachbarte Tiles nahtlos aneinanderpassen.

export const TILE_SIZE = 16;

export const EDGE = { TOP: 1, RIGHT: 2, BOTTOM: 4, LEFT: 8 };

// Namen in Index-Reihenfolge. 0-15: ground_<maske>
export const TILE_NAMES = [];
for (let m = 0; m < 16; m++) TILE_NAMES.push(`ground_${m}`);
TILE_NAMES.push('platform');       // 16: einseitig begehbare Plattform (Holzsteg)
TILE_NAMES.push('brick');          // 17: fester Steinblock
TILE_NAMES.push('brick_alt');      // 18: Steinblock Variante (Riss, Moos)
// Zier-Tiles (ohne Kollision, frei platzierbar)
TILE_NAMES.push('deco_grass');     // 19: Grasbüschel
TILE_NAMES.push('deco_flowers');   // 20: Blümchen im Gras
TILE_NAMES.push('deco_mushroom');  // 21: zwei Pilze
TILE_NAMES.push('deco_stone');     // 22: Stein mit Moos
TILE_NAMES.push('cave_floor');     // 23: Höhlenboden (Erde ohne Gras, dunkle Oberkante)

export const TILE_INDEX = {
  ground: 0,
  platform: 16,
  brick: 17,
  brickAlt: 18,
  decoGrass: 19,
  decoFlowers: 20,
  decoMushroom: 21,
  decoStone: 22,
  caveFloor: 23,
};

/** Liefert den Tile-Index für Boden mit gegebener Kantenmaske. */
export function groundIndex(mask) {
  return TILE_INDEX.ground + (mask & 15);
}

// ---------------------------------------------------------------- Farben

const GRASS = { light: '#a9f86c', mid: '#5fd13f', dark: '#379c2a', deep: '#276f1f' };
const DIRT = { base: '#c47e40', light: 'rgba(255, 216, 160, 0.17)', dark: 'rgba(95, 48, 15, 0.16)', line: 'rgba(95, 48, 18, 0.5)' };
const WOOD = { light: '#f3c98c', mid: '#d9a060', dark: '#b97a3f', deep: '#7d4d22', line: 'rgba(90, 50, 20, 0.5)' };
const STONE = { light: '#eef0f5', mid: '#b9bbc6', dark: '#7a7e8c', line: 'rgba(55, 60, 75, 0.5)' };

const S = TILE_SIZE;
const R = 3.2; // Rundung der Außenecken beim Boden

// ---------------------------------------------------------------- Helfer

/** Rechteck mit gleichmäßig runden Ecken als Pfad. */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Sinus-Welle mit ganzzahliger Frequenz k über 16 px (nahtlos). */
function wave(x, k, phase) {
  return Math.sin(((x * k) / S) * Math.PI * 2 + phase);
}

/** Linearer Verlauf aus [offset, farbe]-Paaren. */
function lin(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

/** Kugel/Kuppel: radialer Verlauf mit Lichtpunkt oben links. */
function ball(ctx, cx, cy, r, light, mid, dark, ry = r) {
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - ry * 0.4, r * 0.1, cx, cy, r * 1.05);
  g.addColorStop(0, light); g.addColorStop(0.55, mid); g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(cx, cy, r, ry, 0, 0, Math.PI * 2); ctx.fill();
}

/** Weicher Bodenschatten unter Zier-Objekten. */
function groundShadow(ctx, cx, cy, rx, ry = 1.1, alpha = 0.22) {
  ctx.fillStyle = `rgba(50, 30, 10, ${alpha})`;
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}

/** Glanzpunkt (weiße Ellipse, leicht gedreht). */
function gloss(ctx, cx, cy, rx, ry, alpha = 0.5, rot = -0.5) {
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2); ctx.fill();
}

/** Grashalm: schlanke Spitze aus zwei Kurven, Fuß bei (x, y), Spitze bei (x+dx, y-h). */
function blade(ctx, x, y, h, dx, width = 1.3) {
  ctx.beginPath();
  ctx.moveTo(x - width / 2, y);
  ctx.quadraticCurveTo(x + dx * 0.3 - width / 2, y - h * 0.6, x + dx, y - h);
  ctx.quadraticCurveTo(x + dx * 0.5 + width / 2, y - h * 0.5, x + width / 2, y);
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------- Boden

/** Umriss eines Boden-Tiles: freiliegende Außenecken (zwei freie Kanten) sind rund. */
function groundShape(ctx, ox, oy, mask) {
  const t = mask & EDGE.TOP, r = mask & EDGE.RIGHT, b = mask & EDGE.BOTTOM, l = mask & EDGE.LEFT;
  const tl = t && l ? R : 0, tr = t && r ? R : 0, br = b && r ? R : 0, bl = b && l ? R : 0;
  ctx.beginPath();
  ctx.moveTo(ox + tl, oy);
  ctx.lineTo(ox + S - tr, oy);
  if (tr) ctx.arcTo(ox + S, oy, ox + S, oy + tr, tr);
  ctx.lineTo(ox + S, oy + S - br);
  if (br) ctx.arcTo(ox + S, oy + S, ox + S - br, oy + S, br);
  ctx.lineTo(ox + bl, oy + S);
  if (bl) ctx.arcTo(ox, oy + S, ox, oy + S - bl, bl);
  ctx.lineTo(ox, oy + tl);
  if (tl) ctx.arcTo(ox, oy, ox + tl, oy, tl);
  ctx.closePath();
}

/**
 * Pfad entlang der freiliegenden Kanten (für Konturen), mit Rundung an Außenecken.
 * skip: Kanten, die zwar frei sind, aber nicht gezeichnet werden sollen (z. B. Grasoberkante).
 */
function edgePath(ctx, ox, oy, mask, inset, skip = 0) {
  const t = mask & EDGE.TOP, r = mask & EDGE.RIGHT, b = mask & EDGE.BOTTOM, l = mask & EDGE.LEFT;
  const x0 = ox + inset, y0 = oy + inset, x1 = ox + S - inset, y1 = oy + S - inset;
  const rr = R - inset;
  const tl = t && l ? rr : 0, tr = t && r ? rr : 0, br = b && r ? rr : 0, bl = b && l ? rr : 0;
  ctx.beginPath();
  let pen = false;
  if (t && !(skip & EDGE.TOP)) {
    ctx.moveTo(x0 + tl, y0); ctx.lineTo(x1 - tr, y0);
    if (tr) ctx.arc(x1 - tr, y0 + tr, tr, -Math.PI / 2, 0);
    pen = tr > 0;
  }
  if (r && !(skip & EDGE.RIGHT)) {
    if (!pen) ctx.moveTo(x1, y0 + tr);
    ctx.lineTo(x1, y1 - br);
    if (br) ctx.arc(x1 - br, y1 - br, br, 0, Math.PI / 2);
    pen = br > 0;
  } else pen = false;
  if (b && !(skip & EDGE.BOTTOM)) {
    if (!pen) ctx.moveTo(x1 - br, y1);
    ctx.lineTo(x0 + bl, y1);
    if (bl) ctx.arc(x0 + bl, y1 - bl, bl, Math.PI / 2, Math.PI);
    pen = bl > 0;
  } else pen = false;
  if (l && !(skip & EDGE.LEFT)) {
    if (!pen) ctx.moveTo(x0, y1 - bl);
    ctx.lineTo(x0, y0 + tl);
    if (tl) ctx.arc(x0 + tl, y0 + tl, tl, Math.PI, Math.PI * 1.5);
  }
}

/** Erde: ruhiger warmer Grundton mit drei weichen Schichtwellen (nahtlos, keine Flimmerdetails). */
function dirtFill(ctx, ox, oy) {
  ctx.fillStyle = DIRT.base;
  ctx.fillRect(ox, oy, S, S);
  stratum(ctx, ox, oy, 5.6, 2.3, DIRT.light, 0.4);
  stratum(ctx, ox, oy, 12.2, 1.3, DIRT.dark, 2.6);
  stratum(ctx, ox, oy, 9.4, 0.9, 'rgba(255, 216, 160, 0.08)', 4.1);
}

/** Erdschicht: Band mit welligen Rändern (Periode 16). */
function stratum(ctx, ox, oy, y, h, color, phase) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(ox, oy + y + wave(0, 1, phase) * 0.6);
  for (let x = 1; x <= S; x++) ctx.lineTo(ox + x, oy + y + wave(x, 1, phase) * 0.6);
  for (let x = S; x >= 0; x--) ctx.lineTo(ox + x, oy + y + h + wave(x, 1, phase + 1.2) * 0.5);
  ctx.closePath();
  ctx.fill();
}

/** Unterkante der Grasdecke bei Spalte x (wellig; an freien Seiten hängt das Gras herunter). */
function grassBottom(x, left, right) {
  let y = 6 + wave(x, 1, 0.5) * 0.6 + wave(x, 3, 2.1) * 0.3;
  if (left) { const t = Math.max(0, 1 - x / 4); y += 3.2 * t * t; }
  if (right) { const t = Math.max(0, 1 - (S - x) / 4); y += 3.2 * t * t; }
  return y;
}

/** Grasdecke: Schatten auf der Erde, praller Verlauf, heller Rand oben, ein paar Halmspitzen. */
function grassTop(ctx, ox, oy, mask) {
  const left = mask & EDGE.LEFT, right = mask & EDGE.RIGHT;
  const outline = (extra) => {
    ctx.beginPath();
    ctx.moveTo(ox, oy - 1);
    ctx.lineTo(ox + S, oy - 1);
    for (let x = S; x >= 0; x -= 0.5) ctx.lineTo(ox + x, oy + grassBottom(x, left, right) + extra);
    ctx.closePath();
  };
  // Schlagschatten des Grases auf der Erde
  outline(2.6);
  ctx.fillStyle = lin(ctx, 0, oy + 4, 0, oy + 10, [[0, 'rgba(60, 30, 10, 0.5)'], [1, 'rgba(60, 30, 10, 0)']]);
  ctx.fill();
  // Grasdecke
  outline(0);
  ctx.fillStyle = lin(ctx, 0, oy, 0, oy + 7.5, [[0, GRASS.light], [0.3, GRASS.mid], [0.75, GRASS.dark], [1, GRASS.deep]]);
  ctx.fill();
  // helle Halmzungen im oberen Teil der Decke (ruhig, wenige)
  ctx.fillStyle = 'rgba(220, 255, 170, 0.4)';
  for (const [x, h, dx] of [[2.8, 2.4, 0.5], [7.4, 3, -0.4], [12.6, 2.2, 0.4]]) blade(ctx, ox + x, oy + 4.6, h, dx, 1.3);
  // heller Rand oben (runde Oberkante)
  ctx.fillStyle = lin(ctx, 0, oy, 0, oy + 1.6, [[0, 'rgba(255, 255, 230, 0.55)'], [1, 'rgba(255, 255, 230, 0)']]);
  ctx.fillRect(ox, oy, S, 1.6);
}

/** Boden: Erde mit Grasdecke oben, weichen Licht-/Schattenkanten und runden Außenecken. */
function drawGround(ctx, ox, oy, mask) {
  const top = mask & EDGE.TOP, right = mask & EDGE.RIGHT, bottom = mask & EDGE.BOTTOM, left = mask & EDGE.LEFT;
  ctx.save();
  groundShape(ctx, ox, oy, mask);
  ctx.clip();
  dirtFill(ctx, ox, oy);
  if (top) grassTop(ctx, ox, oy, mask);
  // Schattenkanten unten/rechts, Lichtkante links
  if (bottom) {
    ctx.fillStyle = lin(ctx, 0, oy + S - 3.5, 0, oy + S, [[0, 'rgba(60, 30, 10, 0)'], [1, 'rgba(60, 30, 10, 0.55)']]);
    ctx.fillRect(ox, oy + S - 3.5, S, 3.5);
  }
  if (right) {
    ctx.fillStyle = lin(ctx, ox + S - 3, 0, ox + S, 0, [[0, 'rgba(70, 35, 10, 0)'], [1, 'rgba(70, 35, 10, 0.45)']]);
    ctx.fillRect(ox + S - 3, oy, 3, S);
  }
  if (left) {
    ctx.fillStyle = lin(ctx, ox, 0, ox + 2.8, 0, [[0, 'rgba(255, 240, 205, 0.55)'], [1, 'rgba(255, 240, 205, 0)']]);
    ctx.fillRect(ox, oy, 2.8, S);
  }
  ctx.restore();
  // dünne Kontur an freien Erdkanten (Gras oben bleibt ohne Linie)
  if (mask & ~EDGE.TOP) {
    ctx.strokeStyle = DIRT.line;
    ctx.lineWidth = 0.8;
    edgePath(ctx, ox, oy, mask, 0.4, EDGE.TOP);
    ctx.stroke();
  }
}

/** Höhlenboden: Erde mit dunkler, weicher Oberkante ohne Gras. */
function drawCaveFloor(ctx, ox, oy) {
  ctx.save();
  ctx.beginPath(); ctx.rect(ox, oy, S, S); ctx.clip();
  dirtFill(ctx, ox, oy);
  ctx.fillStyle = lin(ctx, 0, oy, 0, oy + 5, [[0, 'rgba(45, 22, 8, 0.85)'], [0.4, 'rgba(45, 22, 8, 0.4)'], [1, 'rgba(45, 22, 8, 0)']]);
  ctx.fillRect(ox, oy, S, 5);
  ctx.restore();
  ctx.strokeStyle = 'rgba(40, 20, 8, 0.6)';
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(ox, oy + 0.4); ctx.lineTo(ox + S, oy + 0.4); ctx.stroke();
}

// ---------------------------------------------------------------- Plattform

/** Holzsteg: pralles Brett (y 0..8, Kollision nur die oberen ~6 px) mit heller Oberseite,
 *  glänzender Vorderseite, dunkler Unterkante und weichem Schatten darunter. */
function drawPlatform(ctx, ox, oy) {
  // Schatten unter dem Brett
  ctx.fillStyle = lin(ctx, 0, oy + 8, 0, oy + 11, [[0, 'rgba(40, 20, 5, 0.3)'], [1, 'rgba(40, 20, 5, 0)']]);
  ctx.fillRect(ox + 0.5, oy + 8, S - 1, 3);
  // Brettkörper
  ctx.fillStyle = lin(ctx, 0, oy, 0, oy + 8, [[0, WOOD.light], [0.25, WOOD.light], [0.3, WOOD.mid], [0.7, WOOD.dark], [1, WOOD.deep]]);
  roundRect(ctx, ox + 0.3, oy + 0.3, S - 0.6, 7.7, 1.8); ctx.fill();
  // Glanz auf der Oberseite
  ctx.fillStyle = 'rgba(255, 255, 240, 0.55)';
  roundRect(ctx, ox + 1.4, oy + 0.9, S - 2.8, 1, 0.5); ctx.fill();
  // Maserung auf der Vorderseite
  ctx.strokeStyle = 'rgba(110, 60, 25, 0.35)'; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(ox + 1.5, oy + 4.2); ctx.quadraticCurveTo(ox + 5.5, oy + 3.4, ox + 9, oy + 4.4); ctx.quadraticCurveTo(ox + 12, oy + 5.2, ox + 14.5, oy + 4.3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ox + 1.5, oy + 6.2); ctx.quadraticCurveTo(ox + 5, oy + 6.8, ox + 8.5, oy + 6.1); ctx.stroke();
  // Astauge
  ctx.fillStyle = 'rgba(110, 60, 25, 0.4)';
  ctx.beginPath(); ctx.ellipse(ox + 11.5, oy + 5.4, 1.1, 0.7, 0.2, 0, Math.PI * 2); ctx.fill();
  // Kontur
  ctx.strokeStyle = WOOD.line; ctx.lineWidth = 0.7;
  roundRect(ctx, ox + 0.35, oy + 0.35, S - 0.7, 7.6, 1.8); ctx.stroke();
}

// ---------------------------------------------------------------- Steinblock

/** Gefaster Steinwürfel mit weichem Verlauf, Lichtkante oben links, Glanz; alt = Riss und Moos. */
function drawBrick(ctx, ox, oy, alt) {
  const x = ox + 0.5, y = oy + 0.5, s = S - 1, r = 2.6;
  ctx.fillStyle = lin(ctx, x, y, x + s, y + s, [[0, STONE.light], [0.5, STONE.mid], [1, STONE.dark]]);
  roundRect(ctx, x, y, s, s, r); ctx.fill();
  // Fase: Licht oben/links, Schatten unten/rechts
  ctx.lineWidth = 1.3;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.beginPath(); ctx.moveTo(x + 1.3, y + s - 2.4); ctx.lineTo(x + 1.3, y + 3); ctx.quadraticCurveTo(x + 1.3, y + 1.3, x + 3, y + 1.3); ctx.lineTo(x + s - 2.4, y + 1.3); ctx.stroke();
  ctx.strokeStyle = 'rgba(35, 40, 55, 0.35)';
  ctx.beginPath(); ctx.moveTo(x + s - 1.3, y + 2.4); ctx.lineTo(x + s - 1.3, y + s - 3); ctx.quadraticCurveTo(x + s - 1.3, y + s - 1.3, x + s - 3, y + s - 1.3); ctx.lineTo(x + 2.4, y + s - 1.3); ctx.stroke();
  if (alt) {
    // Riss (dunkel mit heller Gegenkante)
    ctx.lineWidth = 0.7;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath(); ctx.moveTo(x + 10.4, y + 3.4); ctx.lineTo(x + 8.9, y + 6.4); ctx.lineTo(x + 10, y + 8.4); ctx.lineTo(x + 8.4, y + 11.4); ctx.stroke();
    ctx.strokeStyle = 'rgba(35, 40, 55, 0.5)';
    ctx.beginPath(); ctx.moveTo(x + 10, y + 3); ctx.lineTo(x + 8.5, y + 6); ctx.lineTo(x + 9.6, y + 8); ctx.lineTo(x + 8, y + 11); ctx.stroke();
    // Moos unten links
    for (const [mx, my, mr] of [[3.2, 11.6, 2.2], [5.6, 12.6, 1.6], [2.4, 9.4, 1.3]]) ball(ctx, x + mx, y + my, mr, '#9fe36a', '#5fb83f', '#3a8a2c');
  }
  gloss(ctx, x + 4.6, y + 4.2, 2.5, 1.3, 0.45);
  ctx.strokeStyle = STONE.line; ctx.lineWidth = 0.8;
  roundRect(ctx, x, y, s, s, r); ctx.stroke();
}

// ---------------------------------------------------------------- Zier-Tiles

/** Grasbüschel: Halme aus der Mitte, mit Verlauf hell → satt. */
function tuft(ctx, x, y, blades, scale = 1) {
  for (const [dx, h, lean, w] of blades) {
    ctx.fillStyle = lin(ctx, 0, y - h * scale, 0, y, [[0, GRASS.light], [0.5, GRASS.mid], [1, GRASS.deep]]);
    blade(ctx, x + dx * scale, y, h * scale, lean * scale, w * scale);
  }
}
const TUFT = [[-3.2, 5, -2.2, 1.5], [-1.6, 7.5, -1.2, 1.6], [0, 8.5, 0.3, 1.7], [1.7, 7, 1.8, 1.6], [3.3, 5.2, 2.6, 1.5], [-0.8, 4.2, -0.4, 1.4], [1, 4.6, 0.9, 1.4]];

function drawDecoGrass(ctx, ox, oy) {
  const y = oy + S - 0.6;
  groundShadow(ctx, ox + 8, y - 0.2, 5.5, 1, 0.2);
  tuft(ctx, ox + 5, y, TUFT, 0.8);
  tuft(ctx, ox + 10.5, y, TUFT, 1);
}

/** Blume: Stiel, Blütenblätter als Kreise, Mitte mit Glanz. */
function flower(ctx, x, y, h, petal, center, r = 1.5) {
  ctx.strokeStyle = '#3f9a2a'; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 0.6, y - h * 0.5, x, y - h); ctx.stroke();
  // Blatt am Stiel
  ctx.fillStyle = '#5fd13f';
  ctx.beginPath(); ctx.ellipse(x + 1.4, y - h * 0.45, 1.5, 0.7, -0.5, 0, Math.PI * 2); ctx.fill();
  const cy = y - h;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ball(ctx, x + Math.cos(a) * r * 1.05, cy + Math.sin(a) * r * 1.05, r * 0.85, petal[0], petal[1], petal[2]);
  }
  ball(ctx, x, cy, r * 0.75, center[0], center[1], center[2]);
  gloss(ctx, x - r * 0.25, cy - r * 0.3, r * 0.3, r * 0.2, 0.7);
}

function drawDecoFlowers(ctx, ox, oy) {
  const y = oy + S - 0.6;
  groundShadow(ctx, ox + 8, y - 0.2, 6, 1, 0.2);
  tuft(ctx, ox + 3, y, TUFT.slice(0, 5), 0.7);
  tuft(ctx, ox + 13, y, TUFT.slice(1, 6), 0.65);
  flower(ctx, ox + 4.2, y, 7, ['#ffffff', '#f3f3ff', '#c9cce6'], ['#ffe066', '#ffc21a', '#c98700'], 1.4);
  flower(ctx, ox + 11.8, y, 8.5, ['#ff8a80', '#ff3b2f', '#b3221a'], ['#ffe066', '#ffc21a', '#c98700'], 1.5);
  flower(ctx, ox + 8, y, 5, ['#ffe066', '#ffc21a', '#c98700'], ['#ffffff', '#fff6e0', '#e0c9a0'], 1.1);
}

/** Pilz: Stiel mit Verlauf, Hutkuppel mit radialem Verlauf, weiße Punkte, Glanz. */
function mushroom(ctx, x, y, capR, stemH, cap = ['#ff7a6e', '#ff3b2f', '#b3221a']) {
  const stemW = capR * 0.9;
  ctx.fillStyle = lin(ctx, x - stemW / 2, 0, x + stemW / 2, 0, [[0, '#fff6e6'], [0.5, '#f1dcbc'], [1, '#c9ad86']]);
  roundRect(ctx, x - stemW / 2, y - stemH, stemW, stemH, stemW * 0.3); ctx.fill();
  // Schatten des Huts auf dem Stiel
  ctx.fillStyle = 'rgba(120, 60, 30, 0.3)';
  ctx.fillRect(x - stemW / 2, y - stemH, stemW, 1.2);
  // Hut (Kuppel: Halbellipse)
  const cy = y - stemH + 0.4, capH = capR * 0.85;
  const g = ctx.createRadialGradient(x - capR * 0.35, cy - capH * 0.6, capR * 0.1, x, cy - capH * 0.2, capR * 1.15);
  g.addColorStop(0, cap[0]); g.addColorStop(0.55, cap[1]); g.addColorStop(1, cap[2]);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(x, cy, capR, capH, 0, Math.PI, 0); ctx.quadraticCurveTo(x, cy + capH * 0.3, x - capR, cy); ctx.closePath(); ctx.fill();
  // Punkte
  ctx.fillStyle = 'rgba(255, 250, 240, 0.95)';
  for (const [dx, dy, r] of [[-0.45, -0.35, 0.22], [0.3, -0.55, 0.17], [0.55, -0.1, 0.14]]) {
    ctx.beginPath(); ctx.arc(x + dx * capR, cy + dy * capH, r * capR, 0, Math.PI * 2); ctx.fill();
  }
  gloss(ctx, x - capR * 0.4, cy - capH * 0.55, capR * 0.3, capH * 0.18, 0.55, -0.4);
}

function drawDecoMushroom(ctx, ox, oy) {
  const y = oy + S - 0.6;
  groundShadow(ctx, ox + 7, y - 0.1, 4.2, 1.1, 0.25);
  groundShadow(ctx, ox + 12.5, y - 0.1, 2.6, 0.9, 0.22);
  tuft(ctx, ox + 2.5, y, TUFT.slice(0, 4), 0.6);
  mushroom(ctx, ox + 6.5, y, 4.4, 6.5);
  mushroom(ctx, ox + 12.4, y, 2.8, 3.6, ['#ffb46e', '#ff7a2d', '#c43f1b']);
}

/** Moosiger Stein: rundlicher Brocken mit Verlauf, Moosdecke oben links, Glanz, Halme am Fuß. */
function drawDecoStone(ctx, ox, oy) {
  const y = oy + S - 0.6, cx = ox + 8, cy = y - 4.2;
  groundShadow(ctx, cx + 0.5, y - 0.1, 6.5, 1.2, 0.28);
  const g = ctx.createRadialGradient(cx - 2.5, cy - 2.5, 1, cx, cy, 7.5);
  g.addColorStop(0, STONE.light); g.addColorStop(0.55, STONE.mid); g.addColorStop(1, STONE.dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - 6, y - 0.4);
  ctx.quadraticCurveTo(cx - 6.6, cy - 2.4, cx - 2.5, cy - 4.1);
  ctx.quadraticCurveTo(cx + 1.5, cy - 5.2, cx + 4.8, cy - 2.8);
  ctx.quadraticCurveTo(cx + 6.8, cy - 0.6, cx + 6, y - 0.4);
  ctx.closePath(); ctx.fill();
  // Moos
  ball(ctx, cx - 2.6, cy - 2.6, 2.4, '#a9f86c', '#5fd13f', '#379c2a', 1.6);
  ball(ctx, cx + 0.6, cy - 3.4, 1.9, '#a9f86c', '#5fd13f', '#379c2a', 1.2);
  ball(ctx, cx - 4.6, cy - 0.6, 1.4, '#9fe36a', '#5fb83f', '#3a8a2c', 1);
  gloss(ctx, cx + 2.6, cy - 1.2, 1.5, 0.8, 0.45);
  ctx.strokeStyle = STONE.line; ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(cx - 6, y - 0.4);
  ctx.quadraticCurveTo(cx - 6.6, cy - 2.4, cx - 2.5, cy - 4.1);
  ctx.quadraticCurveTo(cx + 1.5, cy - 5.2, cx + 4.8, cy - 2.8);
  ctx.quadraticCurveTo(cx + 6.8, cy - 0.6, cx + 6, y - 0.4);
  ctx.stroke();
  tuft(ctx, ox + 1.6, y, TUFT.slice(2, 5), 0.6);
  tuft(ctx, ox + 14.4, y, TUFT.slice(0, 3), 0.6);
}

/** Zeichnet ein Tile anhand seines Namens an Position (ox, oy); alles bleibt im 16x16-Feld. */
export function drawTile(ctx, name, ox, oy) {
  ctx.save();
  ctx.beginPath(); ctx.rect(ox, oy, S, S); ctx.clip();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (name.startsWith('ground_')) {
    drawGround(ctx, ox, oy, parseInt(name.slice(7), 10));
  } else if (name === 'platform') {
    drawPlatform(ctx, ox, oy);
  } else if (name === 'brick') {
    drawBrick(ctx, ox, oy, false);
  } else if (name === 'brick_alt') {
    drawBrick(ctx, ox, oy, true);
  } else if (name === 'deco_grass') {
    drawDecoGrass(ctx, ox, oy);
  } else if (name === 'deco_flowers') {
    drawDecoFlowers(ctx, ox, oy);
  } else if (name === 'deco_mushroom') {
    drawDecoMushroom(ctx, ox, oy);
  } else if (name === 'deco_stone') {
    drawDecoStone(ctx, ox, oy);
  } else if (name === 'cave_floor') {
    drawCaveFloor(ctx, ox, oy);
  }
  ctx.restore();
}
