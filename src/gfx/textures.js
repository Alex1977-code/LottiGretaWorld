// Prozedurale Texturen: Alle Grafiken werden zur Laufzeit per Canvas erzeugt.
// Struktur: Spritesheets bekommen benannte Frames, so dass sie später durch
// echte Pixel-Art-Dateien (gleiche Keys/Frame-Namen) ersetzt werden können.

import Phaser from 'phaser';
import { PAL, SKY, POWER_COLORS } from './palette.js';
import { PIP_FRAMES, PIP_FRAME_SIZE, LEAF_FRAMES } from './pipFrames.js';
import { WALKER_FRAMES, HOPPER_FRAMES, CHECKPOINT_FRAMES, HEART_FRAMES } from './enemyFrames.js';
import { PFLAUME_FRAMES, BERRY_FRAMES, FIREBALL_FRAMES } from './pflaumeFrames.js';
import { COIN_FRAMES, COIN_HUD_FRAMES, KEY_FRAMES, GATE_FRAMES, FLAG_FRAMES, THORNS_FRAMES } from './itemFrames.js';
import { TILE_SIZE, TILE_NAMES, drawTile } from './tiles.js';

/** Zeichnet ein Pixel-Art-Raster (Array von Strings) in einen Canvas-Kontext. */
export function drawPixels(ctx, rows, ox = 0, oy = 0, palette = PAL) {
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
 * Erzeugt ein Spritesheet aus benannten Pixel-Frames (alle gleich groß).
 * Mit `variants` ({ suffix: { Buchstabe: Farbe } }) entstehen umgefärbte Kopien
 * jedes Frames unter dem Namen `<frame>_<suffix>`.
 */
function makeSheet(scene, key, frames, fw, fh, variants = null) {
  const entries = [];
  for (const [name, rows] of Object.entries(frames)) {
    if (!variants) entries.push({ name, rows, palette: PAL });
    else for (const [suffix, overrides] of Object.entries(variants)) {
      entries.push({ name: `${name}_${suffix}`, rows, palette: { ...PAL, ...overrides } });
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

/** Himmel-Verlauf (Bildschirmgröße, scrollt nicht). */
function makeSky(scene, w, h) {
  const tex = scene.textures.createCanvas('sky', w, h);
  const ctx = tex.getContext();
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, SKY.top);
  grad.addColorStop(0.55, '#7a5a9a');
  grad.addColorStop(1, SKY.bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  // Ein paar Sterne/Lichtpunkte oben
  const rnd = new Phaser.Math.RandomDataGenerator(['sky']);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 30; i++) {
    ctx.fillRect(rnd.between(0, w - 1), rnd.between(0, h * 0.4), 1, 1);
  }
  tex.refresh();
}

/** Parallax-Ebene: ferne Hügel (kachelbar in X). */
function makeFarHills(scene, w, h) {
  const tex = scene.textures.createCanvas('bg_far', w, h);
  const ctx = tex.getContext();
  ctx.fillStyle = SKY.farHills;
  const rnd = new Phaser.Math.RandomDataGenerator(['hills']);
  // Sanfte Hügel per Sinus, Enden passen zusammen (periodisch in w)
  for (let x = 0; x < w; x++) {
    const t = (x / w) * Math.PI * 2;
    const y = h * 0.55 + Math.sin(t * 2) * 14 + Math.sin(t * 5 + 1) * 7 + Math.sin(t * 11) * 3;
    ctx.fillRect(x, Math.round(y), 1, h - Math.round(y));
  }
  // Ferne Bäume als kleine Dreiecke
  ctx.fillStyle = '#5a3c78';
  for (let i = 0; i < 40; i++) {
    const x = rnd.between(0, w - 1);
    const t = (x / w) * Math.PI * 2;
    const base = h * 0.55 + Math.sin(t * 2) * 14 + Math.sin(t * 5 + 1) * 7 + Math.sin(t * 11) * 3;
    const th = rnd.between(6, 14);
    for (let k = 0; k < th; k++) {
      const half = Math.max(1, Math.round((k / th) * 3));
      ctx.fillRect(x - half, Math.round(base) - th + k, half * 2 + 1, 1);
    }
  }
  tex.refresh();
}

/** Parallax-Ebene: mittlere Baumreihe (Herbst). */
function makeMidTrees(scene, w, h) {
  const tex = scene.textures.createCanvas('bg_mid', w, h);
  const ctx = tex.getContext();
  const rnd = new Phaser.Math.RandomDataGenerator(['trees']);
  const ground = h * 0.78;
  // Bodenstreifen
  ctx.fillStyle = SKY.midTrees;
  ctx.fillRect(0, Math.round(ground), w, h - Math.round(ground));
  // Bäume: Stamm + runde Krone
  for (let i = 0; i < 14; i++) {
    const x = Math.round((i / 14) * w + rnd.between(-10, 10));
    const trunkH = rnd.between(28, 52);
    const r = rnd.between(14, 24);
    ctx.fillStyle = '#6a3a4a';
    ctx.fillRect(x - 2, Math.round(ground) - trunkH, 4, trunkH);
    ctx.fillStyle = rnd.pick(['#a04a4a', '#b3603a', '#8a4a5a']);
    circleWrap(ctx, x, Math.round(ground) - trunkH - r * 0.6, r, w);
    ctx.fillStyle = 'rgba(255,200,120,0.18)';
    circleWrap(ctx, x - r * 0.3, Math.round(ground) - trunkH - r * 0.9, r * 0.5, w);
  }
  tex.refresh();
}

/** Parallax-Ebene: nahe Büsche/Blätter (dunkel, unten). */
function makeNearBush(scene, w, h) {
  const tex = scene.textures.createCanvas('bg_near', w, h);
  const ctx = tex.getContext();
  const rnd = new Phaser.Math.RandomDataGenerator(['bush']);
  const base = h * 0.92;
  ctx.fillStyle = SKY.nearBush;
  for (let i = 0; i < 26; i++) {
    const x = Math.round((i / 26) * w + rnd.between(-6, 6));
    circleWrap(ctx, x, Math.round(base), rnd.between(10, 18), w);
  }
  ctx.fillStyle = SKY.nearLeaf;
  for (let i = 0; i < 40; i++) {
    const x = rnd.between(0, w - 1);
    const y = rnd.between(Math.round(base) - 16, h - 2);
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.fillStyle = SKY.nearBush;
  ctx.fillRect(0, Math.round(base), w, h - Math.round(base));
  tex.refresh();
}

/** Kreis zeichnen, der am Rand umläuft (für kachelbare Texturen). */
function circleWrap(ctx, x, y, r, w) {
  for (const dx of [0, -w, w]) {
    ctx.beginPath();
    ctx.arc(x + dx, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
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
  if (scene.textures.exists('pip')) return;
  makeSheet(scene, 'pip', PIP_FRAMES, PIP_FRAME_SIZE, PIP_FRAME_SIZE);
  makeSheet(scene, 'leaf', LEAF_FRAMES, 22, 12);
  makeSheet(scene, 'walker', WALKER_FRAMES, 16, 16);
  makeSheet(scene, 'hopper', HOPPER_FRAMES, 16, 16);
  makeSheet(scene, 'checkpoint', CHECKPOINT_FRAMES, 16, 32);
  makeSheet(scene, 'heart', HEART_FRAMES, 8, 8);
  makeSheet(scene, 'pflaume', PFLAUME_FRAMES, 20, 16, POWER_COLORS);
  makeSheet(scene, 'berry', BERRY_FRAMES, 8, 8, POWER_COLORS);
  makeSheet(scene, 'fireball', FIREBALL_FRAMES, 8, 8);
  makeSheet(scene, 'coin', COIN_FRAMES, 12, 12);
  makeSheet(scene, 'coin_hud', COIN_HUD_FRAMES, 8, 8);
  makeSheet(scene, 'key', KEY_FRAMES, 12, 12);
  makeSheet(scene, 'gate', GATE_FRAMES, 16, 32);
  makeSheet(scene, 'flag', FLAG_FRAMES, 16, 32);
  makeSheet(scene, 'thorns', THORNS_FRAMES, 16, 8);
  makeTileset(scene);
  makeSky(scene, width, height);
  makeFarHills(scene, width, height);
  makeMidTrees(scene, width, height);
  makeNearBush(scene, width, height);
  makeParticles(scene);
}
