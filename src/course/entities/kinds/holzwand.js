// Holzwand (Präzisierung Motor Welt 2; Bauplan 2-Panzer „große Holzwand … mit Kanonenkugel zerstören“): feste Wand
// aus Brettern mit Flag `breakable: 'cannon'` – nur Kanonenkugel ('cannon'), Explosion ('bomb') und Riesentrank
// ('mega') zerlegen sie; Stampfen, Tatzenhieb, Feuer prallen ab (dumpfes Klopfen). Danach erscheint `content`.
// Auch als `type` in LEVEL.segments (blocks/types/w2engine.js).
//   { kind: 'holzwand', pos: [x, y, z] (Mitte der Unterseite), size: [w, h, d] (Standard [3, 3, 0.5]),
//     content?: Aktion/Kurzform (z. B. 'star:2'), face?: true (grimmiges Bärengesicht, Bauplan „Endgegner-Gesicht“),
//     id?, hidden? }
//   Beispiel: { kind: 'holzwand', pos: [0, 1, -40], size: [4, 3, 0.6], content: { star: 2 } }

import * as THREE from 'three';
import { Gimmick, contentAction, runAction } from '../gimmick.js';
import { box, merge } from '../../blocks/kit.js';

const BREAK = new Set(['cannon', 'bomb', 'mega']);
const THUD = new Set(['pound', 'claw', 'fire', 'shell', 'bite', 'throw']);

function faceTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 256, 256);
  // Bärenkopf (grimmig) mit Zylinder – eigene Zeichnung
  g.fillStyle = '#7a4a26';
  for (const s of [-1, 1]) { g.beginPath(); g.arc(128 + s * 70, 92, 30, 0, Math.PI * 2); g.fill(); }
  g.beginPath(); g.arc(128, 140, 86, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#e9c08a'; g.beginPath(); g.ellipse(128, 170, 44, 34, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#2a1a10'; g.beginPath(); g.ellipse(128, 154, 16, 11, 0, 0, Math.PI * 2); g.fill();
  g.lineWidth = 6; g.strokeStyle = '#2a1a10';
  g.beginPath(); g.moveTo(108, 186); g.quadraticCurveTo(128, 176, 148, 186); g.stroke();
  for (const s of [-1, 1]) {
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(128 + s * 32, 122, 12, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2a1a10'; g.beginPath(); g.arc(128 + s * 30, 124, 6, 0, Math.PI * 2); g.fill();
    g.lineWidth = 8; g.beginPath(); g.moveTo(128 + s * 50, 100); g.lineTo(128 + s * 16, 112); g.stroke();
  }
  g.strokeStyle = '#ffd23d'; g.lineWidth = 4; g.beginPath(); g.arc(160, 124, 15, 0, Math.PI * 2); g.stroke();   // Monokel
  g.fillStyle = '#1a1420'; g.fillRect(84, 22, 88, 50); g.fillRect(66, 66, 124, 12);                             // Zylinder
  g.fillStyle = '#c0283a'; g.fillRect(84, 56, 88, 10);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

class Holzwand extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'holzwand');
    const s = spec.size ?? [3, 3, 0.5];
    this.w = s[0] ?? 3; this.h = s[1] ?? 3; this.d = s[2] ?? 0.5;
    this.half.set(this.w / 2, this.h / 2, this.d / 2);
    this.touch = false;
    this.content = spec.content !== undefined ? contentAction(spec.content, null) : null;
    this.knocks = 0;
    this.shake = 0;
    const p = this.pos;
    this.addSolid({ type: 'box', min: [p.x - this.w / 2, p.y, p.z - this.d / 2], max: [p.x + this.w / 2, p.y + this.h, p.z + this.d / 2], breakable: 'cannon', tag: 'holzwand' });
    if (level.view) this.buildView(!!spec.face);
  }

  buildView(face) {
    const parts = [];
    const along = this.w >= this.d;            // Bretter quer zur dünnen Seite
    const len = along ? this.w : this.d, thick = along ? this.d : this.w;
    const n = Math.max(2, Math.round(len / 0.45));
    const bw = len / n;
    for (let i = 0; i < n; i++) {
      const c = -len / 2 + (i + 0.5) * bw;
      const col = i % 2 ? 0xc98a4a : 0xd99a56;
      parts.push(along ? box(bw - 0.03, this.h, thick, c, this.h / 2, 0, col, { r: 0.04 }) : box(thick, this.h, bw - 0.03, 0, this.h / 2, c, col, { r: 0.04 }));
    }
    // Querlatten
    for (const y of [this.h * 0.22, this.h * 0.78]) parts.push(along ? box(this.w, 0.22, thick + 0.1, 0, y, 0, 0x9a5f2e, { r: 0.04 }) : box(thick + 0.1, 0.22, this.d, 0, y, 0, 0x9a5f2e, { r: 0.04 }));
    const geo = merge(parts);
    this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });
    const root = new THREE.Group();
    const mesh = new THREE.Mesh(geo, this.mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    root.add(mesh);
    let ftex = null, fmat = null, fgeo = null;
    if (face) {
      ftex = faceTexture();
      fmat = new THREE.MeshStandardMaterial({ map: ftex, transparent: true, roughness: 0.7 });
      const sz = Math.min(this.h, along ? this.w : this.d) * 0.85;
      fgeo = new THREE.PlaneGeometry(sz, sz);
      const f = new THREE.Mesh(fgeo, fmat);
      f.position.set(along ? 0 : thick / 2 + 0.06, this.h / 2, along ? thick / 2 + 0.06 : 0);
      if (!along) f.rotation.y = Math.PI / 2;
      root.add(f);
    }
    this.setModel({ root, update: () => {}, dispose: () => { geo.dispose(); this.mat.dispose(); ftex?.dispose(); fmat?.dispose(); fgeo?.dispose(); } });
  }

  onHit(kind) {
    if (!this.alive || this.hidden) return;
    if (BREAK.has(kind)) { this.smash(); return; }
    if (THUD.has(kind)) { this.knocks++; this.shake = 0.3; this.level.sfx('blockhit'); }
  }

  smash() {
    if (!this.alive) return;
    this.removeShapes();
    const p = this.pos;
    for (let i = 0; i < Math.ceil(this.h); i++) this.level.effects?.debris({ x: p.x, y: p.y + i + 0.3, z: p.z }, 0xc98a4a, 6);
    this.level.effects?.dust(p, 8, 1.5);
    this.level.sfx('brickbreak');
    this.level.shake(0.2);
    if (this.content) runAction(this.level, this.content, { pos: [p.x, p.y + 0.2, p.z], source: this });
    this.kill();
  }

  render(dt, t) {
    super.render(dt, t);
    if (this.shake > 0 && this.model) { this.shake -= dt; this.model.root.position.x = this.pos.x + Math.sin(t * 60) * 0.04 * Math.max(0, this.shake / 0.3); }
  }
}

export const KINDS = { holzwand: (level, spec) => new Holzwand(level, spec) };
