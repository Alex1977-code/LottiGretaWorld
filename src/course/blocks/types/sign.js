// Baustein `sign`: Holzschild mit Aufschrift (Stationen im Bausteinpark, Hinweise in Levels). Ohne Kollision.
//   pos:   [x, y, z]  Fußpunkt des Pfostens;  text: 'Glasröhre' (\n = neue Zeile)
//   yaw:   0 (Schrift zeigt nach +z, zur Standardkamera)
//   size:  [w, h] Tafel (Standard [2.8, 0.95]);  post: 1.3 (Pfostenhöhe bis Unterkante Tafel)
//   color: Tafelfarbe ('#fff3d6'), ink: Schriftfarbe ('#5a3418')
// Beispiel: { type: 'sign', pos: [-4, 1, -2], text: 'Glasröhre' }

import * as THREE from 'three';
import { v3, box, addStatic, addObject } from '../kit.js';

export function buildSign(level, spec) {
  const p = v3(spec.pos);
  const [w, h] = spec.size ?? [2.8, 0.95];
  const post = spec.post ?? 1.3;
  const yaw = spec.yaw ?? 0;
  const c = Math.cos(yaw), s = Math.sin(yaw);
  // Pfosten (statisch, zwei bei breiten Tafeln)
  const posts = w > 1.6 ? [-w * 0.32, w * 0.32] : [0];
  for (const o of posts) addStatic(level, box(0.14, post + h * 0.6, 0.14, p.x + o * c, p.y + (post + h * 0.6) / 2, p.z - o * s, 0x8a5a2a, { r: 0.04 }));
  if (!level.view) return;
  const lines = String(spec.text ?? '').split('\n');
  const cw = 512, ch = Math.round((cw * h) / w);
  const canvas = document.createElement('canvas');
  canvas.width = cw; canvas.height = ch;
  const g = canvas.getContext('2d');
  g.fillStyle = spec.color ?? '#fff3d6';
  g.fillRect(0, 0, cw, ch);
  g.strokeStyle = '#c99a5a'; g.lineWidth = 14; g.strokeRect(7, 7, cw - 14, ch - 14);
  g.fillStyle = spec.ink ?? '#5a3418';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  let size = Math.min(ch * 0.62 / lines.length, 96);
  g.font = `bold ${size}px sans-serif`;
  const widest = Math.max(...lines.map((l) => g.measureText(l).width));
  if (widest > cw * 0.88) { size *= (cw * 0.88) / widest; g.font = `bold ${size}px sans-serif`; }
  lines.forEach((l, i) => g.fillText(l, cw / 2, ch / 2 + (i - (lines.length - 1) / 2) * size * 1.1));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const wood = new THREE.MeshStandardMaterial({ color: 0xc98d48, roughness: 0.8 });
  const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 });
  const board = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, h + 0.08, 0.1), wood);
  body.castShadow = true;
  const front = new THREE.Mesh(new THREE.PlaneGeometry(w, h), face);
  front.position.z = 0.052;
  board.add(body, front);
  board.position.set(p.x, p.y + post + h / 2, p.z);
  board.rotation.y = yaw;
  addObject(level, board);
}

export const TYPES = { sign: buildSign };
