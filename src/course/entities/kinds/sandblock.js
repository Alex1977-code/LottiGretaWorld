// Sandblock (Präzisierung Motor Welt 2; Bauplan 2-1 „Sandblöcke“): fester Block, der kurz nach dem Betreten
// zerbröselt und nach einer Weile wieder erscheint. Steht eine Figur (auch ein Klon) darauf, rieselt er `delay` s
// (Wackeln, Sand) und zerfällt dann (Form weg, Figur fällt); nach `respawn` s baut er sich wieder auf (nur, wenn
// nichts im Weg ist). Stampfen, Tatzenhieb, Kanonenkugel, Bombe, Riesentrank zerbröseln ihn sofort.
// Alle Sandblöcke eines Levels werden als Instanzen gezeichnet (ein Zeichenaufruf je Pool-Teil).
//   { kind: 'sandblock', pos: [x, y, z] (Mitte der Unterseite), size?: 1 (Kantenlänge), delay?: 0.45, respawn?: 3,
//     once?: false (true = kommt nicht wieder), id?, hidden? }
//   Mehrere als Baustein: { type: 'sandblock', pos?, blocks: [[x, y, z], …] | from/to (Reihe) | grid: [nx, nz] … }
//   (blocks/types/w2engine.js). Signal { drop: id } zerbröselt ihn.

import * as THREE from 'three';
import { Gimmick, visDt } from '../gimmick.js';
import { roundedBox, colorize, lin, mixc, smooth, SIDE } from '../../../three/world/geometry.js';

const CRUMBLE = new Set(['pound', 'claw', 'cannon', 'bomb', 'mega', 'shell']);

function sandTemplate() {
  const g = roundedBox(1, 1, 1, 0.08, SIDE.ALL, 0, 2);
  const top = lin(0xf2d48a), side = lin(0xe0b562), dark = lin(0xb88a3e);
  colorize(g, (p, n, o) => {
    if (n.y > 0.5) mixc(side, top, smooth(0.5, 0.95, n.y), o);
    else { const k = 0.5 + p.y; mixc(dark, side, Math.max(0, Math.min(1, k)), o); }
    // Körnung
    const grain = (Math.sin(p.x * 37.1 + p.y * 17.3) * Math.sin(p.z * 29.7 - p.y * 11.1)) * 0.06;
    o[0] *= 1 + grain; o[1] *= 1 + grain; o[2] *= 1 + grain * 0.6;
  });
  g.translate(0, 0.5, 0);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
  const root = new THREE.Group();
  root.add(m);
  return root;
}

class Sandblock extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'sandblock');
    this.size = spec.size ?? 1;
    this.half.set(this.size / 2, this.size / 2, this.size / 2);
    this.touch = false;
    this.delay = spec.delay ?? 0.45;
    this.respawnT = spec.respawn ?? 3;
    this.once = !!spec.once;
    this.state = 'solid';     // solid | crumble | gone
    this.t = 0;
    this.crumbles = 0;
    this.pop = 1;
    const p = this.pos, s = this.size;
    this.addSolid({ type: 'box', min: [p.x - s / 2, p.y, p.z - s / 2], max: [p.x + s / 2, p.y + s, p.z + s / 2], breakable: true, tag: 'sandblock' });
    this.pool = level.view?.pool('sandblock', sandTemplate, { capacity: 32 }) ?? null;
    this.idx = this.pool ? this.pool.alloc() : -1;
    if (this.hidden && this.pool) this.pool.hide(this.idx);
  }

  /** Steht eine Figur darauf? */
  stoodOn() {
    for (const p of this.level.players ?? [this.level.player]) if (p && !p.dead && p.mode === 'ground' && p.ground?.owner === this) return true;
    return false;
  }

  update(dt) {
    if (this.hidden) return;
    this.t += dt;
    if (this.state === 'solid') {
      if (this.stoodOn()) { this.state = 'crumble'; this.t = 0; this.level.sfx('step'); }
    } else if (this.state === 'crumble') {
      if (this.t >= this.delay) this.breakNow();
    } else if (this.state === 'gone' && !this.once && this.t >= this.respawnT) {
      // wieder aufbauen, wenn nichts im Weg ist
      const c = this.center();
      const blocked = (this.level.players ?? []).some((f) => !f.dead && Math.abs(f.pos.x - c.x) < this.half.x + f.half.x && Math.abs(f.pos.z - c.z) < this.half.z + f.half.z && f.pos.y < this.pos.y + this.size && f.pos.y + f.half.y * 2 > this.pos.y)
        || this.level.entities.some((e) => e.enemy && e.alive && !e.removed && this.overlaps(e, -0.05));
      if (!blocked) {
        this.state = 'solid'; this.t = 0; this.pop = 0;
        this.setSolid(true);
        this.level.effects?.dust(this.center(), 4, 0.5);
      }
    }
  }

  /** Zerbröseln (Form weg, Sand rieselt). */
  breakNow() {
    if (this.state === 'gone') return;
    this.state = 'gone';
    this.t = 0;
    this.crumbles++;
    this.setSolid(false);
    const c = this.center();
    this.level.effects?.debris(c, 0xe8c070, 6);
    this.level.effects?.dust({ x: c.x, y: this.pos.y, z: c.z }, 6, 0.9);
    this.level.sfx('brickbreak');
    if (this.once) this.kill();
  }

  drop() { this.breakNow(); }

  onHit(kind) {
    if (this.hidden || this.state === 'gone') return;
    if (CRUMBLE.has(kind)) this.breakNow();
  }

  render(dt, t) {
    if (this.idx < 0) return;
    if (this.hidden || this.state === 'gone') { this.pool.hide(this.idx); return; }
    const vd = visDt(this.level, this, dt);
    this.pop = Math.min(1, this.pop + vd * 3);
    const j = this.state === 'crumble' ? 0.035 * Math.min(1, this.t / this.delay + 0.3) : 0;
    const k = this.pop < 1 ? Math.max(0.05, Math.sin(this.pop * Math.PI * 0.5) + Math.sin(this.pop * Math.PI) * 0.12) : 1;
    const s = this.size * k;
    this.pool.set(this.idx, this.pos.x + Math.sin(t * 57) * j, this.pos.y + (this.size - s) / 2, this.pos.z + Math.cos(t * 49) * j, 0, s);
    if (this.state === 'crumble' && Math.random() < dt * 14) this.level.effects?.dust({ x: this.pos.x + (Math.random() - 0.5) * this.size, y: this.pos.y + 0.05, z: this.pos.z + (Math.random() - 0.5) * this.size }, 1, 0.3);
  }

  dispose() {
    if (this.idx >= 0) this.pool.release(this.idx);
    this.idx = -1;
    super.dispose();
  }
}

export const KINDS = { sandblock: (level, spec) => new Sandblock(level, spec) };
