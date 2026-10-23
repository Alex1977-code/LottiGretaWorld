// Schnee- und Eis-Entitäten Welt 3 (3-1 Schneefeld, Eisbahn). Alle auch als `type` in LEVEL.segments verwendbar
// (blocks/types/w3_misc.js); viele gleiche liegen in je einer Instanz-Gruppe (createInstanced, ein Zeichenaufruf).
//
// schneeblock / eisblock – 1-m-Blöcke (pos = Mitte der Unterseite). Kopfstoß von unten, Feuerball, Tatze, Stampfen von
//   oben, Panzer, Bombe, Riesentrank, Kanone zerbrechen sie (Schnee stiebt / Eis splittert bzw. schmilzt bei Feuer) und
//   geben ihren Inhalt. hits: Treffer bis zum Bruch (Eis mit Kopfstoß: erst Sprung, dann Bruch bei hits 2).
//   { kind: 'schneeblock'|'eisblock', pos, content: 'none' (Standard) | 'coin' | 'coins:3' | 'star:1' | Power-up |
//     Aktion, hits: 1, id, hidden }   Laufzeit: broken, hp
//   Reihen/Felder: Baustein { type: 'schneebloecke', kind: 'schneeblock'|'eisblock', pos, grid: [nx, ny, nz],
//     contents: { 'i,j,k': Inhalt } } (blocks/types/w3_snow.js).
//
// eiszapfen – Bündel Eiszapfen an der Decke (pos = Aufhängung oben, hängt nach −Y): steht eine Figur darunter (≤ r
//   seitlich, bis range m tiefer), zittert er `delay` s und fällt (verletzt, wen er trifft), zerschellt am Boden und
//   wächst nach `respawn` s nach (0 = nie).
//   { kind: 'eiszapfen', pos, length: 1, r: 0.9, range: 9, delay: 0.5, respawn: 3, id }
//   Laufzeit: state ('hang'|'shake'|'fall'|'gone'), falls
//
// schneehaufen – Schneehaufen mit versteckten Münzen: Stampfen, Tatze, Feuer, Bombe, Riesentrank oder Hineinrutschen
//   (Rutschen ≥ 4 m/s) zerstieben ihn, die Münzen springen heraus.
//   { kind: 'schneehaufen', pos (Fußpunkt), size: 1.6 (Durchmesser), coins: 5 | content: Aktion, id }
//   Laufzeit: gone
//
// tanne – verschneite Tanne, die Schnee abschüttelt: Hineinrennen (≥ 5 m/s), Angriffe, Stampfen daneben oder Kopfstoß
//   gegen die untersten Zweige schütteln sie; der Inhalt (content) fällt einmal aus der Krone.
//   { kind: 'tanne', pos (Fußpunkt), size: 3.5 (Höhe), content: 'none' | 'coins:3' | Power-up | Aktion, solid: true, id }
//   Laufzeit: shakes, given

import * as THREE from 'three';
import { Gimmick, runAction, contentAction } from '../gimmick.js';
import { sharedInstances, figures } from '../../blocks/w3kit.js';
import { lin, mixc, smooth, colorize, merge } from '../../blocks/kit.js';

// =============================================================================================
// Schnee- und Eisblock
// =============================================================================================
const BREAK = new Set(['bump', 'fire', 'claw', 'pound', 'shell', 'bomb', 'mega', 'cannon', 'throw', 'star']);

class SnowBlock extends Gimmick {
  constructor(level, spec, kind) {
    super(level, spec, kind);
    this.half.set(0.5, 0.5, 0.5);
    this.touch = false;
    this.ice = kind === 'eisblock';
    this.hp = spec.hits ?? 1;
    this.broken = false;
    this.content = contentAction(spec.content, null);
    this.bumps = 0;
    const p = this.pos;
    this.addSolid({ type: 'box', min: [p.x - 0.5, p.y, p.z - 0.5], max: [p.x + 0.5, p.y + 1, p.z + 0.5], breakable: true, tag: kind });
    this.inst = sharedInstances(level, kind, 200);
    this.slot = this.inst ? this.inst.alloc() : -1;
    if (this.slot >= 0) this.inst.api.setAt(this.slot, [p.x, p.y, p.z], 0, 1, this.hidden ? 'hidden' : 'idle');
  }

  onReveal() { if (this.slot >= 0) this.inst.api.setState(this.slot, 'idle'); }
  onHide() { if (this.slot >= 0) this.inst.api.setState(this.slot, 'hidden'); }

  onBump(player) {
    if (this.broken || this.hidden) return;
    this.bumps++;
    this.bumpTop();
    this.hit('bump', player);
  }

  onPound(player) { this.hit('pound', player); }

  onHit(kind, source) {
    if (!BREAK.has(kind)) return;
    // Stampfen zählt nur von oben (Stampfwellen daneben lassen Blöcke stehen)
    if (kind === 'pound' && source?.pos && source.pos.y < this.pos.y + 0.8) return;
    this.hit(kind, source);
  }

  hit(kind, source) {
    if (this.broken || this.hidden) return;
    this.hp--;
    if (this.hp > 0) {
      this.level.sfx('blockhit');
      if (this.slot >= 0) this.inst.api.setState(this.slot, 'bump');
      this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 1, z: this.pos.z }, 4);
      return;
    }
    this.shatter(kind);
  }

  bumpTop() {
    const top = { x: this.pos.x, y: this.pos.y + 1, z: this.pos.z };
    for (const e of this.level.entities) {
      if (!e.alive || e === this) continue;
      if (Math.abs(e.pos.x - top.x) < 0.8 && Math.abs(e.pos.z - top.z) < 0.8 && Math.abs(e.pos.y - top.y) < 0.35) e.onHit?.('bump', this);
    }
  }

  shatter(kind) {
    this.broken = true;
    const p = this.pos;
    this.removeShapes();
    this.solids.length = 0;
    if (this.slot >= 0) { this.inst.free(this.slot); this.slot = -1; }
    const fx = this.level.effects;
    if (this.ice) {
      fx?.debris({ x: p.x, y: p.y + 0.5, z: p.z }, kind === 'fire' ? 0x9fe8ff : 0xcff6ff, 10);
      fx?.sparks({ x: p.x, y: p.y + 0.6, z: p.z }, 10);
      if (kind === 'fire') fx?.splash({ x: p.x, y: p.y, z: p.z }, p.y + 0.3);
      this.level.sfx('brickbreak');
    } else {
      fx?.debris({ x: p.x, y: p.y + 0.5, z: p.z }, 0xf4f8ff, 12);
      fx?.dust({ x: p.x, y: p.y + 0.3, z: p.z }, 6, 1.2);
      this.level.sfx('snowball');
      this.level.sfx('brickbreak');
    }
    if (this.content) runAction(this.level, this.content, { pos: [p.x, p.y + 1, p.z], source: this });
    this.kill();
  }

  render() {}

  dispose() {
    if (this.slot >= 0) { this.inst.free(this.slot); this.slot = -1; }
    super.dispose();
  }
}

// =============================================================================================
// Eiszapfen
// =============================================================================================
class Eiszapfen extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'eiszapfen');
    this.len = spec.length ?? 1;
    this.top = this.pos.y;                   // Aufhängung
    this.pos.y = this.top - this.len;        // pos = Spitze (Fußpunkt der Hülle)
    this.half.set(0.28, this.len / 2, 0.28);
    this.touch = true;
    this.state = 'hang';
    this.t = 0;
    this.falls = 0;
    this.inst = sharedInstances(level, 'eiszapfen', 120);
    this.slot = this.inst ? this.inst.alloc() : -1;
    this.place();
  }

  place() {
    if (this.slot < 0) return;
    const gone = this.state === 'gone' || this.hidden;
    this.inst.api.setAt(this.slot, [this.pos.x, this.pos.y + this.len, this.pos.z], 0, this.len, gone ? 'hidden' : this.state === 'shake' ? 'shake' : 'idle');
  }

  onHit(kind) {
    if ((kind === 'fire' || kind === 'claw' || kind === 'bomb' || kind === 'mega' || kind === 'cannon') && this.state === 'hang') this.drop();
  }

  drop() { this.state = 'shake'; this.t = 0; this.place(); this.level.sfx('ice_slide'); }

  onPlayer() { return this.state === 'fall' ? 'hurt' : 'none'; }

  update(dt) {
    if (this.hidden) return;
    this.t += dt;
    const r = this.spec.r ?? 0.9, range = this.spec.range ?? 9;
    switch (this.state) {
      case 'hang':
        for (const p of figures(this.level)) {
          if (Math.abs(p.pos.x - this.pos.x) < r && Math.abs(p.pos.z - this.pos.z) < r && p.pos.y < this.pos.y && p.pos.y > this.pos.y - range) { this.drop(); break; }
        }
        break;
      case 'shake':
        if (this.t >= (this.spec.delay ?? 0.5)) { this.state = 'fall'; this.t = 0; this.vel.set(0, 0, 0); this.falls++; }
        break;
      case 'fall': {
        this.vel.y = Math.max(-24, this.vel.y - 32 * dt);
        const dy = this.vel.y * dt;
        const hit = this.level.world.raycastDown(this.pos.x, this.pos.y + 0.05, this.pos.z, -dy + 0.1, { ignore: (s) => s.owner === this });
        if (hit && this.pos.y + dy <= hit.y) { this.pos.y = hit.y; this.shatter(); break; }
        this.pos.y += dy;
        this.place();
        if (this.pos.y < this.level.killY) this.shatter(true);
        // Gegner darunter treffen
        for (const e of this.level.entities) {
          if (!e.enemy || !e.alive || e === this) continue;
          if (this.overlaps(e)) { e.onHit?.('bump', this); this.shatter(); break; }
        }
        break;
      }
      case 'gone':
        if ((this.spec.respawn ?? 3) > 0 && this.t >= (this.spec.respawn ?? 3)) {
          this.state = 'hang'; this.t = 0; this.pos.y = this.top - this.len;
          this.place();
        }
        break;
      default: break;
    }
  }

  shatter(quiet) {
    if (!quiet) {
      this.level.effects?.debris({ x: this.pos.x, y: this.pos.y + 0.2, z: this.pos.z }, 0xcff6ff, 8);
      this.level.sfx('brickbreak');
    }
    this.state = 'gone'; this.t = 0;
    this.place();
  }

  get touch() { return this._touch !== false && !this.hidden && this.state === 'fall'; }
  set touch(v) { this._touch = v; }
  get shadowVisible() { return !this.hidden && this.state === 'fall'; }

  onReveal() { this.place(); }
  onHide() { this.place(); }
  render() {}

  dispose() {
    if (this.slot >= 0) { this.inst.free(this.slot); this.slot = -1; }
    super.dispose();
  }
}

// =============================================================================================
// Schneehaufen
// =============================================================================================
function moundTemplate() {
  const parts = [];
  const top = lin(0xffffff), side = lin(0xd6e6f8), deep = lin(0xa8c4e6);
  const blob = (x, y, z, rx, ry, rz) => {
    const g = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    g.scale(rx, ry, rz); g.translate(x, y, z);
    parts.push(colorize(g.toNonIndexed(), (p, n, o) => { mixc(deep, side, smooth(-0.1, 0.5, n.y), o); if (n.y > 0.55) mixc(o, top, smooth(0.55, 0.9, n.y), o); }));
  };
  blob(0, 0, 0, 0.8, 0.62, 0.8);
  blob(0.42, 0, 0.2, 0.42, 0.38, 0.42);
  blob(-0.38, 0, -0.25, 0.4, 0.34, 0.4);
  blob(0.1, 0.32, -0.05, 0.42, 0.42, 0.42);
  const g = merge(parts);
  const root = new THREE.Group();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
  root.add(m);
  return root;
}

const HAUFEN = new Set(['pound', 'claw', 'fire', 'bomb', 'mega', 'cannon', 'shell', 'throw', 'slide', 'star', 'bump']);

class Schneehaufen extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'schneehaufen');
    this.size = spec.size ?? 1.6;
    const r = this.size / 2;
    this.half.set(r, 0.4 * this.size / 1.6, r);
    this.touch = true;
    this.gone = false;
    const p = this.pos;
    this.addSolid({ type: 'cyl', x: p.x, z: p.z, r: r * 0.8, y0: p.y, y1: p.y + 0.55 * this.size / 1.6, breakable: true, tag: 'schneehaufen' });
    this.pool = level.view?.pool('w3:schneehaufen', moundTemplate, { castShadow: true, capacity: 32 }) ?? null;
    this.idx = this.pool ? this.pool.alloc() : -1;
    this.place();
  }

  place() {
    if (this.idx < 0) return;
    if (this.hidden || this.gone) this.pool.hide(this.idx);
    else this.pool.set(this.idx, this.pos.x, this.pos.y, this.pos.z, (this.pos.x * 1.7) % 6.28, this.size / 1.6);
  }

  onReveal() { this.place(); }
  onHide() { this.place(); }

  onPlayer(p) {
    // Hineinrutschen zerstiebt ihn
    if (!this.gone && p.state === 'slide' && p.hSpeed() >= 4) this.poof();
    return 'none';
  }

  onHit(kind) { if (HAUFEN.has(kind)) this.poof(); }
  onPound() { this.poof(); }

  poof() {
    if (this.gone || this.hidden) return;
    this.gone = true;
    const p = this.pos;
    this.removeShapes();
    this.solids.length = 0;
    this.level.effects?.debris({ x: p.x, y: p.y + 0.4, z: p.z }, 0xf4f8ff, 12);
    this.level.effects?.dust({ x: p.x, y: p.y + 0.2, z: p.z }, 8, 1.4);
    this.level.sfx('snowball');
    const act = this.spec.content !== undefined ? contentAction(this.spec.content, null) : { coins: this.spec.coins ?? 5 };
    runAction(this.level, act, { pos: [p.x, p.y + 0.8, p.z], source: this });
    this.place();
    this.kill();
  }

  render() {}

  dispose() {
    if (this.idx >= 0) { this.pool.release(this.idx); this.idx = -1; }
    super.dispose();
  }
}

// =============================================================================================
// Tanne (schüttelt Schnee ab)
// =============================================================================================
const SHAKERS = new Set(['claw', 'fire', 'shell', 'pound', 'bomb', 'mega', 'cannon', 'throw', 'bump', 'slide', 'star']);

class Tanne extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'tanne');
    this.size = spec.size ?? 3.5;
    this.half.set(0.7, this.size / 2, 0.7);
    this.touch = false;
    this.shakes = 0;
    this.given = false;
    this.cool = 0;
    this.content = contentAction(spec.content, null);
    const p = this.pos;
    if (spec.solid !== false) this.addSolid({ type: 'cyl', x: p.x, z: p.z, r: 0.32 * this.size / 3.5, y0: p.y, y1: p.y + this.size * 0.45, tag: 'tanne', owner: this });
    this.inst = sharedInstances(level, 'tanne_schnee', 120);
    this.slot = this.inst ? this.inst.alloc() : -1;
    if (this.slot >= 0) this.inst.api.setAt(this.slot, [p.x, p.y, p.z], spec.yaw ?? (p.x * 2.3 + p.z) % 6.28, this.size / 3.5, this.hidden ? 'hidden' : 'idle');
  }

  onReveal() { if (this.slot >= 0) this.inst.api.setState(this.slot, 'idle'); }
  onHide() { if (this.slot >= 0) this.inst.api.setState(this.slot, 'hidden'); }

  shake() {
    if (this.cool > 0 || this.hidden) return;
    this.cool = 0.8;
    this.shakes++;
    if (this.slot >= 0) this.inst.api.setState(this.slot, 'shake');
    const p = this.pos;
    for (let i = 0; i < 3; i++) this.level.effects?.dust({ x: p.x + (i - 1) * 0.6, y: p.y + this.size * (0.45 + i * 0.15), z: p.z }, 4, 0.8);
    this.level.sfx('snowball');
    if (!this.given && this.content) {
      this.given = true;
      runAction(this.level, this.content, { pos: [p.x, p.y + this.size * 0.6, p.z], source: this });
    }
  }

  onHit(kind) { if (SHAKERS.has(kind)) this.shake(); }
  onBump() { this.shake(); }

  update(dt) {
    if (this.cool > 0) this.cool -= dt;
    if (this.hidden) return;
    const p0 = this.pos;
    for (const p of figures(this.level)) {
      const d = Math.hypot(p.pos.x - p0.x, p.pos.z - p0.z);
      if (d < 0.32 * this.size / 3.5 + 0.45 && p.hSpeed() >= 5 && Math.abs(p.pos.y - p0.y) < 1.5) { this.shake(); break; }
      // Stampfen daneben
      if (d < 2.2 && p.state === 'land' && p.poundLanded && p.landTime > 0.15 && Math.abs(p.pos.y - p0.y) < 0.5) { this.shake(); break; }
    }
  }

  render() {}

  dispose() {
    if (this.slot >= 0) { this.inst.free(this.slot); this.slot = -1; }
    super.dispose();
  }
}

export const KINDS = {
  schneeblock: (level, spec) => new SnowBlock(level, spec, 'schneeblock'),
  eisblock: (level, spec) => new SnowBlock(level, spec, 'eisblock'),
  eiszapfen: (level, spec) => new Eiszapfen(level, spec),
  schneehaufen: (level, spec) => new Schneehaufen(level, spec),
  tanne: (level, spec) => new Tanne(level, spec),
};
