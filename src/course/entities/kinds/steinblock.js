// Grauer Steinblock („Mega-Block“, Bauplan 1-1/1-Burg: Steinblöcke mit Riesentrank zertrümmern, graue Blockwand
// mit Kickbombe sprengen) und die Hilfe `blockwand` für ganze Wände aus Blöcken.
//
// steinblock: 1-m-Würfel (pos = Mitte der Unterseite), fest; Kollisionsform mit Flag `mega: true` (nicht
//   `breakable` → Stampfattacke, Kopfstoß, Tatzenhieb, Panzer prallen ab). Nur Riesentrank (onHit('mega')) und
//   Explosionen (onHit('bomb')) zertrümmern ihn. Daten: { kind: 'steinblock', pos, content? } (content wie beim
//   ?-Block: erscheint nach dem Zertrümmern, z. B. 'coins:3', 'oneup').
// blockwand: { kind: 'blockwand', pos: [x, y, z] (Mitte der Unterseite der Wand), size: [w, h, d] (ganze Blöcke),
//   block?: 'steinblock' (Standard) | 'brick' | 'crystal' | 'used' | 'question', content? (für jeden Block) }
//   erzeugt w × h × d Einzelblöcke (je eigene Entität). Gehört in LEVEL.blocks (oder items/enemies).

import * as THREE from 'three';
import { CourseEntity } from '../CourseEntity.js';
import { spawnLoot } from '../Enemy.js';
import { roundedBox, colorize, lin, mixc, smooth, SIDE } from '../../../three/world/geometry.js';

let GEO = null, MAT = null;
function steinTemplate() {
  if (!GEO) {
    const g = roundedBox(0.98, 0.98, 0.98, 0.09, SIDE.ALL, 0, 2);
    const base = lin(0x9aa3ad), dark = lin(0x5f6872), light = lin(0xc9d0d8);
    GEO = colorize(g, (p, n, o) => {
      const flat = Math.max(Math.abs(n.x), Math.abs(n.y), Math.abs(n.z));
      mixc(dark, base, smooth(0.78, 0.98, flat), o);
      // eingelassene Mittelfläche (heller Rahmen, dunklere Mitte) auf jeder Seite
      const u = Math.abs(n.x) > 0.9 ? [p.y, p.z] : Math.abs(n.y) > 0.9 ? [p.x, p.z] : [p.x, p.y];
      const m = Math.max(Math.abs(u[0]), Math.abs(u[1]));
      if (flat > 0.98 && m > 0.3 && m < 0.36) mixc(o, light, 0.6, o);
      else if (flat > 0.98 && m <= 0.3) mixc(o, dark, 0.18, o);
      if (n.y > 0.9) mixc(o, light, 0.25, o);
    });
    GEO.translate(0, 0.5, 0);
    MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0.05 });
  }
  const root = new THREE.Group();
  root.add(new THREE.Mesh(GEO, MAT));
  return root;
}

class Steinblock extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'steinblock');
    this.touch = false;
    this.half.set(0.5, 0.5, 0.5);
    this.content = spec.content ?? null;
    const p = this.pos;
    this.addShape({ type: 'box', min: [p.x - 0.5, p.y, p.z - 0.5], max: [p.x + 0.5, p.y + 1, p.z + 0.5], mega: true, tag: 'block:stein' });
    this.idx = -1;
    if (level.view) {
      this.pool = level.view.pool('block:stein', steinTemplate, { castShadow: true, capacity: 32 });
      this.idx = this.pool.alloc();
      this.render();
    }
  }

  render() {
    if (this.idx >= 0) this.pool.set(this.idx, this.pos.x, this.pos.y, this.pos.z, 0, 1);
  }

  onHit(kind) {
    if (kind === 'mega' || kind === 'bomb') this.break();
  }

  break() {
    if (!this.alive) return;
    this.removeShapes();
    this.level.effects?.debris({ x: this.pos.x, y: this.pos.y + 0.3, z: this.pos.z }, 0x8d96a0, 8);
    this.level.sfx('brickbreak');
    if (this.content) spawnLoot(this.level, this.content, this.pos.x, this.pos.y, this.pos.z);
    this.kill();
  }

  dispose() {
    if (this.idx >= 0) this.pool.release(this.idx);
    this.idx = -1;
    super.dispose();
  }
}

/** Wand aus Einzelblöcken (w × h × d), pos = Mitte der Unterseite. */
function blockwand(level, spec) {
  const [w, h, d] = spec.size ?? [3, 3, 1];
  const p = spec.pos ?? [0, 0, 0];
  const kind = spec.block ?? 'steinblock';
  for (let ix = 0; ix < w; ix++) {
    for (let iy = 0; iy < h; iy++) {
      for (let iz = 0; iz < d; iz++) {
        const x = p[0] - w / 2 + 0.5 + ix, y = p[1] + iy, z = p[2] - d / 2 + 0.5 + iz;
        level.spawn(kind, { pos: [x, y, z], content: spec.content });
      }
    }
  }
  return null;
}

export const KINDS = {
  steinblock: (level, spec) => new Steinblock(level, spec),
  blockwand,
};
