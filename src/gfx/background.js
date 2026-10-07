// Hintergrund-Ebenen des Herbstwalds (prozedural, kachelbar in X).
// Texturen: 'sky' (fest), 'bg_far', 'bg_mid', 'bg_near' (Parallax-Ebenen, siehe systems/Parallax.js).

import Phaser from 'phaser';

export const SKY = {
  top: '#2b3a7a',
  bottom: '#f0a06a',
  farHills: '#6a4a8a',
  midTrees: '#8a4a5a',
  nearBush: '#5a3a2a',
  nearLeaf: '#b85a2a',
};

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


/** Erzeugt alle Hintergrund-Texturen (Bildschirmgröße w x h). */
export function createBackgroundTextures(scene, w, h) {
  makeSky(scene, w, h);
  makeFarHills(scene, w, h);
  makeMidTrees(scene, w, h);
  makeNearBush(scene, w, h);
}
