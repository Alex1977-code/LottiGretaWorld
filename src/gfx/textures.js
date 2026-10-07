// Prozedurale Texturen: Alle Grafiken werden zur Laufzeit per Canvas erzeugt.
// Spritesheets kommen aus src/gfx/sprites/*.js (je Modul: SHEETS mit Frames + eigener Palette),
// Tiles aus tiles.js, Hintergrund aus background.js. Später können einzelne Sheets durch
// echte Pixel-Art-Dateien (gleicher Key, gleiche Frame-Namen) ersetzt werden.

import Phaser from 'phaser';
import { TILE_SIZE, TILE_NAMES, drawTile } from './tiles.js';
import { createBackgroundTextures } from './background.js';
import * as heroes from './sprites/heroes.js';
import * as pflaume from './sprites/pflaume.js';
import * as leaf from './sprites/leaf.js';
import * as enemies from './sprites/enemies.js';
import * as items from './sprites/items.js';

const SPRITE_MODULES = [heroes, pflaume, leaf, enemies, items];

/** Zeichnet ein Pixel-Art-Raster (Array von Strings) in einen Canvas-Kontext. */
export function drawPixels(ctx, rows, ox = 0, oy = 0, palette) {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const c = palette[row[x]];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

/**
 * Erzeugt ein Spritesheet aus einer Sheet-Definition { key, frameWidth, frameHeight, frames, palette, variants }.
 * Mit `variants` ({ suffix: { Buchstabe: Farbe } }) entstehen umgefärbte Kopien jedes Frames
 * unter dem Namen `<frame>_<suffix>`.
 */
function makeSheet(scene, sheet) {
  const { key, frameWidth: fw, frameHeight: fh, frames, palette, variants } = sheet;
  const entries = [];
  for (const [name, rows] of Object.entries(frames)) {
    if (!variants) entries.push({ name, rows, palette });
    else for (const [suffix, overrides] of Object.entries(variants)) {
      entries.push({ name: `${name}_${suffix}`, rows, palette: { ...palette, ...overrides } });
    }
  }
  const cols = Math.min(entries.length, 8);
  const rowsN = Math.ceil(entries.length / cols);
  const tex = scene.textures.createCanvas(key, cols * fw, rowsN * fh);
  const ctx = tex.getContext();
  entries.forEach((e, i) => {
    const cx = (i % cols) * fw;
    const cy = Math.floor(i / cols) * fh;
    drawPixels(ctx, e.rows, cx, cy, e.palette);
    tex.add(e.name, 0, cx, cy, fw, fh);
  });
  tex.refresh();
  return tex;
}

/** Tileset-Textur: alle Tiles nebeneinander, Index = Reihenfolge in TILE_NAMES. */
function makeTileset(scene) {
  const n = TILE_NAMES.length;
  const tex = scene.textures.createCanvas('tiles', n * TILE_SIZE, TILE_SIZE);
  const ctx = tex.getContext();
  TILE_NAMES.forEach((name, i) => drawTile(ctx, name, i * TILE_SIZE, 0));
  tex.refresh();
}

/** Partikel-Texturen: Staub, Blatt, Funke. */
function makeParticles(scene) {
  // Staub: weicher 4x4-Fleck
  const dust = scene.textures.createCanvas('p_dust', 4, 4);
  let ctx = dust.getContext();
  ctx.fillStyle = '#e8d8c0';
  ctx.fillRect(1, 0, 2, 4);
  ctx.fillRect(0, 1, 4, 2);
  dust.refresh();

  // Blätter: 3 kleine Varianten in einem Sheet (je 4x4)
  const leaf = scene.textures.createCanvas('p_leaf', 12, 4);
  ctx = leaf.getContext();
  const leafColors = ['#c9542a', '#e9a53a', '#8f3b1f'];
  leafColors.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(i * 4 + 1, 0, 2, 1);
    ctx.fillRect(i * 4 + 0, 1, 4, 2);
    ctx.fillRect(i * 4 + 1, 3, 2, 1);
    leaf.add(i, 0, i * 4, 0, 4, 4);
  });
  leaf.refresh();

  // Funke: 2x2 hell
  const spark = scene.textures.createCanvas('p_spark', 2, 2);
  ctx = spark.getContext();
  ctx.fillStyle = '#fff2a8';
  ctx.fillRect(0, 0, 2, 2);
  spark.refresh();

  // Weißes 1x1 Pixel für Debug/Overlays
  const px = scene.textures.createCanvas('px', 1, 1);
  ctx = px.getContext();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 1, 1);
  px.refresh();
}

/** Erzeugt alle Texturen des Spiels. Einmalig in der Boot-Szene aufrufen. */
export function createAllTextures(scene, width, height) {
  if (scene.textures.exists('lotti')) return;
  for (const mod of SPRITE_MODULES) for (const sheet of mod.SHEETS) makeSheet(scene, sheet);
  makeTileset(scene);
  createBackgroundTextures(scene, width, height);
  makeParticles(scene);
}
