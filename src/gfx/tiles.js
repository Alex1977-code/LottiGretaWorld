// Tile-Zeichnung (16x16). Boden-Tiles werden als "Autotile" nach freiliegenden
// Kanten erzeugt: Index 0..15 = Bitmaske (oben=1, rechts=2, unten=4, links=8).
// Danach folgen Spezial-Tiles. Tiled-GID = Index + 1.

import Phaser from 'phaser';
import { PAL } from './palette.js';

export const TILE_SIZE = 16;

export const EDGE = { TOP: 1, RIGHT: 2, BOTTOM: 4, LEFT: 8 };

// Namen in Index-Reihenfolge. 0-15: ground_<maske>
export const TILE_NAMES = [];
for (let m = 0; m < 16; m++) TILE_NAMES.push(`ground_${m}`);
TILE_NAMES.push('platform');   // 16: einseitig begehbare Plattform (Holz)
TILE_NAMES.push('brick');      // 17: fester Steinblock
TILE_NAMES.push('brick_alt');  // 18: Steinblock Variante

export const TILE_INDEX = {
  ground: 0,
  platform: 16,
  brick: 17,
  brickAlt: 18,
};

/** Liefert den Tile-Index für Boden mit gegebener Kantenmaske. */
export function groundIndex(mask) {
  return TILE_INDEX.ground + (mask & 15);
}

function px(ctx, x, y, c) {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, 1, 1);
}

/** Boden: Erde mit Grasrand oben, dunkler Umriss an freiliegenden Kanten. */
function drawGround(ctx, ox, oy, mask) {
  const rnd = new Phaser.Math.RandomDataGenerator([`g${mask}`]);
  // Erdfläche
  ctx.fillStyle = PAL.d;
  ctx.fillRect(ox, oy, 16, 16);
  // Steinchen/Textur
  for (let i = 0; i < 7; i++) {
    px(ctx, ox + rnd.between(0, 15), oy + rnd.between(2, 15), rnd.pick([PAL.e, PAL.f, PAL.e]));
  }
  const top = mask & EDGE.TOP, right = mask & EDGE.RIGHT, bottom = mask & EDGE.BOTTOM, left = mask & EDGE.LEFT;
  if (top) {
    // Grasnarbe mit Herbstlaub
    ctx.fillStyle = PAL.q;
    ctx.fillRect(ox, oy, 16, 4);
    ctx.fillStyle = PAL.g;
    ctx.fillRect(ox, oy, 16, 2);
    for (let i = 0; i < 4; i++) {
      const x = rnd.between(0, 15);
      px(ctx, ox + x, oy + 2 + rnd.between(0, 1), PAL.g);
    }
    // Einzelne bunte Blätter
    px(ctx, ox + rnd.between(0, 15), oy + 1, rnd.pick([PAL.r, PAL.y]));
    px(ctx, ox + rnd.between(0, 15), oy + 3, rnd.pick([PAL.r, PAL.y]));
    // Grashalme ragen 1px über die Kante (bleiben im Tile, oberste Zeile)
    ctx.fillStyle = PAL.e;
    ctx.fillRect(ox, oy + 4, 16, 1);
  }
  if (bottom) {
    ctx.fillStyle = PAL.e;
    ctx.fillRect(ox, oy + 15, 16, 1);
  }
  if (left) {
    ctx.fillStyle = PAL.e;
    ctx.fillRect(ox, oy, 1, 16);
    if (top) { ctx.fillStyle = PAL.q; ctx.fillRect(ox, oy, 1, 3); }
  }
  if (right) {
    ctx.fillStyle = PAL.e;
    ctx.fillRect(ox + 15, oy, 1, 16);
    if (top) { ctx.fillStyle = PAL.q; ctx.fillRect(ox + 15, oy, 1, 3); }
  }
}

/** Holzplattform (oberer Teil gefüllt, von unten durchspringbar). */
function drawPlatform(ctx, ox, oy) {
  ctx.fillStyle = PAL.w;
  ctx.fillRect(ox, oy, 16, 6);
  ctx.fillStyle = PAL.x;
  ctx.fillRect(ox, oy, 16, 1);
  ctx.fillStyle = PAL.v;
  ctx.fillRect(ox, oy + 5, 16, 1);
  px(ctx, ox + 3, oy + 2, PAL.v);
  px(ctx, ox + 11, oy + 3, PAL.v);
  px(ctx, ox + 7, oy + 1, PAL.x);
  // Stützen
  ctx.fillStyle = PAL.v;
  ctx.fillRect(ox + 2, oy + 6, 2, 3);
  ctx.fillRect(ox + 12, oy + 6, 2, 3);
}

/** Steinblock mit Fuge. */
function drawBrick(ctx, ox, oy, alt) {
  ctx.fillStyle = PAL.s;
  ctx.fillRect(ox, oy, 16, 16);
  ctx.fillStyle = PAL.t;
  ctx.fillRect(ox, oy + 15, 16, 1);
  ctx.fillRect(ox + 15, oy, 1, 16);
  ctx.fillRect(ox, oy + 7, 16, 1);
  ctx.fillRect(ox + (alt ? 11 : 4), oy, 1, 7);
  ctx.fillRect(ox + (alt ? 4 : 11), oy + 8, 1, 7);
  ctx.fillStyle = PAL.u;
  ctx.fillRect(ox, oy, 16, 1);
  ctx.fillRect(ox, oy, 1, 16);
  ctx.fillRect(ox + (alt ? 12 : 5), oy + 1, 1, 6);
  ctx.fillRect(ox + 1, oy + 8, 1, 7);
}

/** Zeichnet ein Tile anhand seines Namens an Position (ox, oy). */
export function drawTile(ctx, name, ox, oy) {
  if (name.startsWith('ground_')) {
    drawGround(ctx, ox, oy, parseInt(name.slice(7), 10));
  } else if (name === 'platform') {
    drawPlatform(ctx, ox, oy);
  } else if (name === 'brick') {
    drawBrick(ctx, ox, oy, false);
  } else if (name === 'brick_alt') {
    drawBrick(ctx, ox, oy, true);
  }
}
