// Sandblock (Präzisierung Motor Welt 2; Bauplan 2-1 „Sandblöcke“): fester Block, der kurz nach dem Betreten
// zerbröselt und nach einer Weile wieder erscheint. Steht eine Figur (auch ein Klon) darauf, rieselt er `delay` s
// (Wackeln, Sand) und zerfällt dann (Form weg, Figur fällt); nach `respawn` s baut er sich wieder auf (nur, wenn
// nichts im Weg ist). Stampfen, Tatzenhieb, Kanonenkugel, Bombe, Riesentrank zerbröseln ihn sofort.
// Alle Sandblöcke eines Levels werden als Instanzen gezeichnet (ein Zeichenaufruf je Pool-Teil).
//   { kind: 'sandblock', pos: [x, y, z] (Mitte der Unterseite), size?: 1 (Kantenlänge), delay?: 0.45, respawn?: 3,
//     once?: false (true = kommt nicht wieder), id?, hidden? }
//   Mehrere als Baustein: { type: 'sandblock', pos?, blocks: [[x, y, z], …] | from/to (Reihe) | grid: [nx, nz] … }
//   (blocks/types/w2engine.js). Signal { drop: id } zerbröselt ihn.
// Darstellung: Instanz-Modell createInstanced('sandblock', 32) aus der Modell-Registry (Zustände idle | shake |
// crumble | gone | hidden; je 32 Blöcke 2 Zeichenaufrufe), sonst eigener Instanz-Pool (Rückfall).

import * as THREE from 'three';
import { Gimmick, visDt } from '../gimmick.js';
import { roundedBox, colorize, lin, mixc, smooth, SIDE } from '../../../three/world/geometry.js';
import { createInstanced } from '../../models/lib/instanced.js';

const GROUP = 32;

/** Platz in einer gemeinsamen Instanz-Gruppe des Levels (oder null → Rückfall-Pool). */
function allocSlot(level) {
  if (!level.view) return null;
  const m = level._sandInst ?? (level._sandInst = { groups: [], free: [], used: 0, ok: true });
  if (!m.ok) return null;
  if (!m.free.length) {
    let g;
    try { g = createInstanced('sandblock', GROUP); } catch (err) { m.ok = false; return null; }
    level.view.add(g.root);
    level.view.onFrame((dt) => g.update(dt));
    m.groups.push(g);
    for (let i = GROUP - 1; i >= 0; i--) m.free.push({ g, i });
  }
  m.used++;
  return m.free.pop();
}

function releaseSlot(level, slot) {
  const m = level._sandInst;
  if (!m || !slot) return;
  slot.g.setState(slot.i, 'hidden');
  m.free.push(slot);
  if (--m.used <= 0) { for (const g of m.groups) g.dispose(); level._sandInst = null; }
}

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
    this.slot = allocSlot(level);
    this.visKey = '';
    this.goneT = 0;
    this.pool = !this.slot ? level.view?.pool('sandblock', sandTemplate, { capacity: 32 }) ?? null : null;
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
    this.level.sfx('sand_crumble');
    if (this.once) this.kill();
  }

  drop() { this.breakNow(); }

  onHit(kind) {
    if (this.hidden || this.state === 'gone') return;
    if (CRUMBLE.has(kind)) this.breakNow();
  }

  render(dt, t) {
    if (this.slot) { this.renderInstanced(dt); return; }
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

  /** Registry-Instanz: idle (mit Aufbau-Plopp) → shake (rieselt) → crumble (0,6 s) → gone; versteckt: hidden. */
  renderInstanced(dt) {
    const { g, i } = this.slot;
    const vd = visDt(this.level, this, dt);
    let st;
    if (this.hidden) st = 'hidden';
    else if (this.state === 'gone') { this.goneT += vd; st = this.goneT < 0.6 ? 'crumble' : 'gone'; }
    else { this.goneT = 0; st = this.state === 'crumble' ? 'shake' : 'idle'; }
    if (st === 'idle' && this.pop < 1) this.pop = Math.min(1, this.pop + vd * 3);
    const k = this.pop < 1 ? Math.max(0.05, Math.sin(this.pop * Math.PI * 0.5) + Math.sin(this.pop * Math.PI) * 0.12) : 1;
    const key = `${st}|${k.toFixed(3)}`;
    if (key === this.visKey) return;
    const first = this.visKey === '' || this.visKey.split('|')[0] !== st;
    this.visKey = key;
    if (first || k < 1) g.setAt(i, [this.pos.x, this.pos.y + (this.size - this.size * k) / 2, this.pos.z], 0, this.size * k, st);
  }

  dispose() {
    if (this.slot) { releaseSlot(this.level, this.slot); this.slot = null; }
    if (this.idx >= 0) this.pool.release(this.idx);
    this.idx = -1;
    super.dispose();
  }
}

export const KINDS = { sandblock: (level, spec) => new Sandblock(level, spec) };
