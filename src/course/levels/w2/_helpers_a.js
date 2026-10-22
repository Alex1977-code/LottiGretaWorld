// Hilfen für die Level-Daten 2-1 und 2-2 (kein Level: exportiert kein LEVEL, die Level-Registry überspringt dieses
// Modul). Alles liefert reine Daten im Format von docs/KURS-ARCHITEKTUR.md – bis auf die kleinen Szenen-Hilfen am
// Ende (level-lokaler Code, der über eine Aktion aufgerufen wird).

import * as THREE from 'three';
import { modelObject } from '../../blocks/w2kit.js';

/**
 * Insel über ihre Grundfläche: x0..x1, zA..zB (Reihenfolge egal), Oberseite top, Höhe h (Unterkante top − h).
 * o: weitere Felder des Bausteins (top: 'stone'|'sand'|'none', under, color …).
 */
export function isl(x0, x1, zA, zB, top, h = 3, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  return { type: 'island', pos: [(x0 + x1) / 2, top - h, (z0 + z1) / 2], size: [x1 - x0, h, z0 - z1], under: 0, ...o };
}

/** Münzen in einer Reihe (Loader-Format). */
export const line = (from, to, n) => ({ kind: 'coins', from, to, n });

/** Münzring um pos. */
export const ring = (pos, r, n) => ({ kind: 'coins', pos, r, n });

/** Münzbogen von a nach b (Fußpunkte) mit Scheitel h über der Verbindungslinie – zeigt einen Sprung an. */
export function arc(a, b, n, h = 2) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    out.push({ kind: 'coin', pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * h * t * (1 - t), a[2] + (b[2] - a[2]) * t] });
  }
  return out;
}

/** Senkrechte Münzsäule. */
export function column(x, z, y0, y1, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ kind: 'coin', pos: [x, y0 + ((y1 - y0) * i) / Math.max(1, n - 1), z] });
  return out;
}

/** Ring aus 8 Blöcken (3 × 3 ohne Mitte) um (x, y, z); contents: { 'dx,dz': Inhalt } (dx, dz ∈ −1 … 1). */
export function blockRing(kind, x, y, z, contents = {}) {
  const out = [];
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const c = contents[`${dx},${dz}`];
      out.push({ kind, pos: [x + dx, y, z + dz], ...(c !== undefined ? { content: c } : {}) });
    }
  }
  return out;
}

// ------------------------------------------------------------------ level-lokale Szenen (Code)

/**
 * Hilfsfigur mit Modell (z. B. Krümel): steht an pos, Blick yaw, Zustand über state() (je Bild). Liefert das Modell.
 * Nur Darstellung, keine Kollision.
 */
export function figure(level, name, pos, yaw, state, opts = {}) {
  return modelObject(level, name, opts, pos[0], pos[1], pos[2], yaw, state);
}

/**
 * Sprechblase über einem Punkt (Sprite mit Leinwand-Text), blendet nach life s aus. Liefert das Sprite.
 */
export function bubble(level, pos, text, sub = '', life = 4) {
  if (!level.view) return null;
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  const r = 46;
  g.fillStyle = '#ffffff'; g.strokeStyle = '#6a3a1a'; g.lineWidth = 10;
  g.beginPath();
  g.moveTo(30 + r, 20); g.lineTo(482 - r, 20); g.quadraticCurveTo(482, 20, 482, 20 + r); g.lineTo(482, 180 - r);
  g.quadraticCurveTo(482, 180, 482 - r, 180); g.lineTo(290, 180); g.lineTo(240, 238); g.lineTo(236, 180); g.lineTo(30 + r, 180);
  g.quadraticCurveTo(30, 180, 30, 180 - r); g.lineTo(30, 20 + r); g.quadraticCurveTo(30, 20, 30 + r, 20); g.closePath();
  g.fill(); g.stroke();
  g.fillStyle = '#6a3a1a'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'bold 60px "Nunito", "Arial Rounded MT Bold", Arial, sans-serif';
  g.fillText(text, 256, sub ? 82 : 100);
  if (sub) { g.font = 'bold 34px "Nunito", "Arial Rounded MT Bold", Arial, sans-serif'; g.fillStyle = '#d0702a'; g.fillText(sub, 256, 142); }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  sp.scale.set(2.6, 1.3, 1);
  sp.position.set(pos[0], pos[1], pos[2]);
  sp.renderOrder = 5;
  let t = 0;
  level.view.add(sp, (dt) => {
    t += Math.min(dt, 0.1);
    const k = Math.min(1, t / 0.2);
    sp.scale.set(2.6 * k, 1.3 * k, 1);
    sp.material.opacity = t > life ? Math.max(0, 1 - (t - life) / 0.6) : 1;
    sp.visible = sp.material.opacity > 0.01;
  });
  return sp;
}
