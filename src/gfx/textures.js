// Prozedurale Texturen: Alle Grafiken werden zur Laufzeit per Canvas erzeugt.
// Spritesheets kommen aus src/gfx/sprites/*.js (je Modul: SHEETS mit Frames + eigener Palette),
// Tiles aus tiles.js, Hintergrund aus background.js. Später können einzelne Sheets durch
// echte Pixel-Art-Dateien (gleicher Key, gleiche Frame-Namen) ersetzt werden.

import Phaser from 'phaser';
import { RENDER } from '../render.js';
import { TILE_SIZE, TILE_NAMES, drawTile } from './tiles.js';
import { createBackgroundTextures, PARALLAX_LAYERS } from './background.js';
import * as heroes from './sprites/heroes.js';
import * as pflaume from './sprites/pflaume.js';
import * as leaf from './sprites/leaf.js';
import * as enemies from './sprites/enemies.js';
import * as items from './sprites/items.js';

const SPRITE_MODULES = [heroes, pflaume, leaf, enemies, items];

/** Zeichnet ein Pixel-Art-Raster (Array von Strings); jedes Rasterpixel wird S x S Texturpixel groß. */
export function drawPixels(ctx, rows, ox = 0, oy = 0, palette, S = RENDER.scale) {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const c = palette[row[x]];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect((ox + x) * S, (oy + y) * S, S, S);
    }
  }
}

/**
 * Vektor-Frame zeichnen: fn bekommt ein Zeichenobjekt g = { ctx, w, h, S, colors } und zeichnet
 * in Weltkoordinaten (0..w, 0..h); der Kontext ist bereits auf die Render-Skalierung gesetzt.
 */
function drawVector(ctx, fn, ox, oy, w, h, colors, S = RENDER.scale) {
  ctx.save();
  ctx.translate(ox * S, oy * S);
  ctx.scale(S, S);
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  fn({ ctx, w, h, S, colors: colors ?? {} });
  ctx.restore();
}

/**
 * Erzeugt ein Spritesheet aus einer Sheet-Definition
 *   { key, frameWidth, frameHeight, frames?, draw?, palette?, variants? }.
 * `frames`: Pixel-Strings (je Rasterpixel S x S Texturpixel). `draw`: { name: fn(g) } Vektor-Zeichenfunktionen
 * in Weltkoordinaten. `variants` ({ suffix: Farben }) erzeugt Kopien `<frame>_<suffix>` – bei Pixel-Strings
 * als Palettenersatz, bei Vektor-Frames als `g.colors`.
 * Frame-Größen sind Weltpixel; die Textur ist RENDER.scale-fach aufgelöst (Sprites mit Z skalieren).
 */
function makeSheet(scene, sheet) {
  const S = RENDER.scale;
  const { key, frameWidth: fw, frameHeight: fh, palette, variants } = sheet;
  const entries = [];
  const names = Object.keys(sheet.draw ?? sheet.frames ?? {});
  for (const name of names) {
    if (!variants) entries.push({ name, base: name, colors: null, palette });
    else for (const [suffix, overrides] of Object.entries(variants)) {
      entries.push({ name: `${name}_${suffix}`, base: name, colors: overrides, palette: palette ? { ...palette, ...overrides } : null });
    }
  }
  const cols = Math.min(entries.length, 8);
  const rowsN = Math.ceil(entries.length / cols);
  const tex = scene.textures.createCanvas(key, cols * fw * S, rowsN * fh * S);
  const ctx = tex.getContext();
  entries.forEach((e, i) => {
    const cx = (i % cols) * fw;
    const cy = Math.floor(i / cols) * fh;
    if (sheet.draw) drawVector(ctx, sheet.draw[e.base], cx, cy, fw, fh, e.colors, S);
    else drawPixels(ctx, sheet.frames[e.base], cx, cy, e.palette, S);
    tex.add(e.name, 0, cx * S, cy * S, fw * S, fh * S);
  });
  tex.refresh();
  return tex;
}

/** Ersetzt eine 1x-Textur durch eine S-fach vergrößerte Kopie (nächster Nachbar, pixelgenau). */
function upscaleTexture(scene, key) {
  const S = RENDER.scale;
  if (S === 1 || !scene.textures.exists(key)) return;
  const src = scene.textures.get(key).getSourceImage();
  const w = src.width, h = src.height;
  if (w > 480) return; // bereits in Render-Auflösung gezeichnet
  const tmp = document.createElement('canvas');
  tmp.width = w * S; tmp.height = h * S;
  const tctx = tmp.getContext('2d');
  tctx.imageSmoothingEnabled = false;
  tctx.drawImage(src, 0, 0, w * S, h * S);
  scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w * S, h * S);
  tex.getContext().drawImage(tmp, 0, 0);
  tex.refresh();
}

/** Tileset-Textur: alle Tiles nebeneinander, Index = Reihenfolge in TILE_NAMES. */
function makeTileset(scene) {
  const S = RENDER.scale;
  const n = TILE_NAMES.length;
  const tex = scene.textures.createCanvas('tiles', n * TILE_SIZE * S, TILE_SIZE * S);
  const ctx = tex.getContext();
  ctx.save();
  ctx.scale(S, S); // Tiles zeichnen in Weltpixeln, Textur ist S-fach
  TILE_NAMES.forEach((name, i) => drawTile(ctx, name, i * TILE_SIZE, 0));
  ctx.restore();
  tex.refresh();
}

/** Partikel-Texturen: Staub, Blatt, Funke. */
function makeParticles(scene) {
  const S = RENDER.scale;
  // Staub: weicher runder Fleck (4x4 Weltpixel)
  const dust = scene.textures.createCanvas('p_dust', 4 * S, 4 * S);
  let ctx = dust.getContext();
  ctx.fillStyle = '#e8d8c0';
  ctx.beginPath(); ctx.arc(2 * S, 2 * S, 2 * S, 0, Math.PI * 2); ctx.fill();
  dust.refresh();

  // Blätter: 3 kleine Varianten in einem Sheet (je 4x4 Weltpixel)
  const leaf = scene.textures.createCanvas('p_leaf', 12 * S, 4 * S);
  ctx = leaf.getContext();
  const leafColors = ['#c9542a', '#e9a53a', '#8f3b1f'];
  leafColors.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse((i * 4 + 2) * S, 2 * S, 2 * S, 1.3 * S, 0.6, 0, Math.PI * 2); ctx.fill();
    leaf.add(i, 0, i * 4 * S, 0, 4 * S, 4 * S);
  });
  leaf.refresh();

  // Funke: heller Punkt (2x2 Weltpixel)
  const spark = scene.textures.createCanvas('p_spark', 2 * S, 2 * S);
  ctx = spark.getContext();
  ctx.fillStyle = '#fff2a8';
  ctx.beginPath(); ctx.arc(S, S, S, 0, Math.PI * 2); ctx.fill();
  spark.refresh();

  // Weißes Pixel für Debug/Overlays
  const px = scene.textures.createCanvas('px', S, S);
  ctx = px.getContext();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, S, S);
  px.refresh();
}

/** Erzeugt alle Texturen des Spiels. Einmalig in der Boot-Szene aufrufen. */
export function createAllTextures(scene, width, height) {
  if (scene.textures.exists('lotti')) return;
  for (const mod of SPRITE_MODULES) for (const sheet of mod.SHEETS) makeSheet(scene, sheet);
  makeTileset(scene);
  createBackgroundTextures(scene, width, height);
  // Hintergrund-Texturen entstehen in 1x (Pixelpuffer) und werden auf Render-Auflösung gebracht
  for (const key of ['sky', 'worldmap_bg', ...PARALLAX_LAYERS.map((l) => l.key)]) upscaleTexture(scene, key);
  makeParticles(scene);
}
