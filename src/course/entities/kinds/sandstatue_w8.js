// Sandfiguren Welt 8 „Brummbär-Rummelplatz“ (8-2 Wüsten-Abfahrt: Statuenfeld): Baron-Sandstatue und Pilzling-Sandskulptur –
// zerstörbare Hindernisse aus Sand. Kein Gegner (kein `enemy`), keine Verletzung.
//
// Zerstören (zerbröseln zu einem Sandhaufen): **Pflaume-Ritt** (die reitende Figur rammt sie: Ritt-Level `riding` bzw. Reittier
//   `mode 'mount'`), **Rammen** (Figur ≥ 6,5 m/s waagerecht, z. B. Rollen/Hechtsprung), **Stampfattacke** (auf ihr oder an ihr),
//   **Power-ups und Wurfsichel** (Tatze, Schwanzhieb, Feuer, Panzer, Wurf, Wurfsichel, Kanone, Explosion, Stern, Riese, Faust).
//   Normales Draufspringen trägt (man steht auf ihr), seitliches Anlaufen hält auf. Danach: content (Aktion im Format von
//   entities/gimmick.js), star (grüner Stern erscheint über ihr und fällt auf den Sockel bzw. Haufen), minis (Mini-Pilzlinge
//   springen heraus – Skulptur).
//
// baron_sandstatue – Sandstatue Baron Brummbärs auf einem Sandstein-Sockel (Modell 'baron_sandstatue', ≈ 4,1 m · size; state
//   { break 0..1 }). Kollision: Sockel 2,2 × 1,0 × 2,2 · size (bleibt) + Figur (Zylinder r 0,8 · size bis 3,8 · size, fällt weg).
//   Daten: { kind: 'baron_sandstatue', id?, pos: [x, y, z] (Mitte der Sockel-Unterseite), size?: 1, yaw?: −π/2 (Blick zur Kamera),
//            star?: Index | { index, pos }, content?: Aktion, sparkle?: false (Funkeln als Hinweis) }
// pilzling_sandskulptur – Sandskulptur eines Pilzlings (Modell 'sandskulptur_pilzling' { height, hole, toys }, state { anim:
//   'idle' | 'crumble', progress }). Kollision: Zylinder r 0,95 · height/2,6 (fällt weg), danach flacher Sandhaufen (begehbar).
//   Daten: { kind: 'pilzling_sandskulptur', id?, pos, height?: 2.6, yaw?: −π/2, minis?: 0 (Mini-Pilzlinge im Torbogen), toys?: false,
//            star?, content?, sparkle?: false }
// Laufzeit: broken, by (Ursache: 'ritt' | 'rammen' | 'stampfen' | Angriffsart), k (s seit dem Zerbröseln), info(). Signal
//   level.signal('sandfigurKaputt', { id, kind, by, pos }).
// Sound: 'sand_crumble', 'brickbreak'.

import * as THREE from 'three';
import { CourseEntity } from '../CourseEntity.js';
import { runAction } from '../gimmick.js';
import { getModel, hasModel } from '../../models/index.js';
import { fallingStar, glint, POWER_HIT } from '../w8help.js';

const BREAK = 1.2;          // s Zerbröseln (Modell)
const RAM = 6.5;            // m/s Rammen

class Sandfigur extends CourseEntity {
  constructor(level, spec, kind) {
    super(level, spec, kind);
    this.touch = true;
    this.shadow = 0;
    this.broken = false;
    this.by = null;
    this.k = 0;
    this.done = false;
    this.yaw = spec.yaw ?? -Math.PI / 2;
    this.star = spec.star === undefined || spec.star === null ? null : spec.star;
  }

  /** Reitet/rammt die Figur? */
  rammedBy(player, contact) {
    if (player.riding || player.mode === 'mount') return 'ritt';
    if ((contact.speed ?? 0) >= RAM) return 'rammen';
    return null;
  }

  onPlayer(player, contact) {
    if (this.broken) return 'none';
    if (contact.pound) { this.crumble('stampfen'); return 'none'; }
    const r = this.rammedBy(player, contact);
    if (r) this.crumble(r);
    return 'none';
  }

  onPound() { this.crumble('stampfen'); }

  onHit(kind, source) {
    if (this.broken) return;
    if (kind === 'pound' && source?.pos && Math.abs(source.pos.y - this.pos.y) > 1.6) return;
    if (POWER_HIT.has(kind) || kind === 'pound' || source?.sichel) this.crumble(source?.sichel ? 'sichel' : kind);
  }

  onSichelHit() { this.crumble('sichel'); }

  crumble(by) {
    if (this.broken) return;
    this.broken = true;
    this.by = by;
    this.k = 0;
    this.onCrumble();
    this.level.sfx('sand_crumble');
    this.level.sfx('brickbreak');
    this.level.effects?.dust({ x: this.pos.x, y: this.pos.y + 1.2, z: this.pos.z }, 16, 1.9);
    this.level.effects?.debris?.({ x: this.pos.x, y: this.pos.y + 1.6, z: this.pos.z }, 0xf0d090, 10);
    this.level.signal?.('sandfigurKaputt', { id: this.spec.id ?? null, kind: this.kind, by, pos: [this.pos.x, this.pos.y, this.pos.z] });
  }

  onCrumble() {}

  /** Nach dem Zerbröseln (0,45 s): Stern, Inhalt, Minis. */
  afterCrumble() {
    const st = this.star;
    if (st !== null) {
      const idx = typeof st === 'object' ? st.index ?? 0 : st;
      const p = typeof st === 'object' && st.pos ? st.pos : [this.pos.x, this.pos.y + this.starY, this.pos.z];
      this.starEntity = fallingStar(this.level, idx, p[0], p[1], p[2], this.pos.y + this.restY);
    }
    if (this.spec.content) runAction(this.level, this.spec.content, { pos: [this.pos.x, this.pos.y + 1.2, this.pos.z], source: this });
  }

  update(dt) {
    if (!this.broken) {
      if (this.spec.sparkle || this.star !== null) glint(this.level, this, this.pos.x, this.pos.y + this.starY - 0.5, this.pos.z, dt, 0.6);
      return;
    }
    this.k += dt;
    if (!this.done && this.k > 0.45) { this.done = true; this.afterCrumble(); }
  }

  info() { return { broken: this.broken, by: this.by, k: +this.k.toFixed(2), star: this.star, done: this.done }; }
}

// =====================================================================================================================
// Baron-Sandstatue
// =====================================================================================================================
class BaronSandstatue extends Sandfigur {
  constructor(level, spec) {
    super(level, spec, 'baron_sandstatue');
    const S = this.size = spec.size ?? 1;
    this.half.set(1.25 * S, 1.95 * S, 1.25 * S);
    this.starY = 4.4 * S;
    this.restY = 1.0 * S + 0.2;
    const p = this.pos;
    this.addShape({ type: 'box', min: [p.x - 1.1 * S, p.y, p.z - 1.1 * S], max: [p.x + 1.1 * S, p.y + 1.0 * S, p.z + 1.1 * S], tag: 'sandstatue-sockel' });
    this.figId = this.addShape({ type: 'cyl', x: p.x, z: p.z, r: 0.8 * S, y0: p.y + 1.0 * S, y1: p.y + 3.8 * S, breakable: true, tag: 'sandstatue' });
    if (level.view) {
      if (hasModel('baron_sandstatue')) this.setModel(getModel('baron_sandstatue', { size: S }));
      else this.setModel(fallbackStatue(S));
    }
  }

  onCrumble() {
    if (this.figId !== null) {
      this.level.world.remove(this.figId);
      this.shapes = this.shapes.filter((id) => id !== this.figId);
      this.figId = null;
    }
    // Sandhaufen auf dem Sockel (begehbar)
    const p = this.pos, S = this.size;
    this.addShape({ type: 'cyl', x: p.x, z: p.z, r: 0.75 * S, y0: p.y + 1.0 * S, y1: p.y + 1.25 * S, tag: 'sandhaufen' });
    this.half.set(1.25 * S, 0.65 * S, 1.25 * S);
  }

  modelState() { return { anim: 'idle', break: this.broken ? Math.min(1, this.k / BREAK) : 0 }; }
}

/** Ersatz ohne Registry-Modell: Sandstein-Sockel und ein grob geformter Bär aus Sand. */
function fallbackStatue(S) {
  const root = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xe8c890, roughness: 0.95 });
  const ped = new THREE.Mesh(new THREE.BoxGeometry(2.2 * S, 1.0 * S, 2.2 * S), mat);
  ped.position.y = 0.5 * S;
  const fig = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.75 * S, 14, 10), mat); body.position.y = 1.0 * S + 0.8 * S; body.scale.y = 1.2;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.55 * S, 14, 10), mat); head.position.y = 1.0 * S + 2.2 * S;
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * S, 0.3 * S, 0.6 * S, 12), mat); hat.position.y = 1.0 * S + 2.95 * S;
  fig.add(body, head, hat);
  for (const m of [ped, body, head, hat]) { m.castShadow = true; m.receiveShadow = true; }
  root.add(ped, fig);
  return { root, update(dt, st) { const b = Math.min(1, st?.break ?? 0); fig.scale.set(1 + b * 0.3, Math.max(0.001, 1 - b), 1 + b * 0.3); }, dispose() { mat.dispose(); } };
}

// =====================================================================================================================
// Pilzling-Sandskulptur
// =====================================================================================================================
class PilzlingSandskulptur extends Sandfigur {
  constructor(level, spec) {
    super(level, spec, 'pilzling_sandskulptur');
    this.h = spec.height ?? 2.6;
    this.r = 0.95 * (this.h / 2.6);
    this.half.set(this.r + 0.2, this.h / 2, this.r + 0.2);
    this.starY = this.h + 0.9;
    this.restY = 0.45;
    this.minis = spec.minis ?? 0;
    this.addShape({ type: 'cyl', x: this.pos.x, z: this.pos.z, r: this.r, y0: this.pos.y, y1: this.pos.y + this.h * 0.94, breakable: true, tag: 'sandskulptur' });
    if (level.view) this.setModel(getModel('sandskulptur_pilzling', { height: this.h, hole: this.minis > 0, toys: spec.toys ?? false }));
  }

  onCrumble() {
    this.removeShapes();
    this.addShape({ type: 'cyl', x: this.pos.x, z: this.pos.z, r: this.r * 1.1, y0: this.pos.y, y1: this.pos.y + 0.3, tag: 'sandhaufen' });
    this.half.set(this.r * 1.1, 0.25, this.r * 1.1);
  }

  afterCrumble() {
    super.afterCrumble();
    const fx = Math.cos(this.yaw), fz = -Math.sin(this.yaw);
    for (let i = 0; i < this.minis; i++) {
      const side = (i - (this.minis - 1) / 2) * 0.9;
      this.level.spawn('pilzling', {
        id: this.spec.id ? `${this.spec.id}_mini${i}` : undefined, mini: true, behavior: 'chase', sight: 8,
        pos: [this.pos.x + fx * 1.3 - fz * side, this.pos.y, this.pos.z + fz * 1.3 + fx * side], dir: [fx, fz],
      });
    }
  }

  modelState() { return this.broken ? { anim: 'crumble', progress: Math.min(1, this.k / BREAK) } : { anim: 'idle' }; }
}

export const KINDS = {
  baron_sandstatue: (level, spec) => new BaronSandstatue(level, spec),
  pilzling_sandskulptur: (level, spec) => new PilzlingSandskulptur(level, spec),
};
