// Laterne (Sonder-Baustein, Bauplan 1-2 Höhle): Anfassen (Berühren, Tatzenhieb, Feuer) zündet sie an – sie
// leuchtet (im Thema cave mit Punktlicht) und macht versteckte Münzen im Umkreis sichtbar: Münzen mit
// `hiddenUntilLit: true` (LEVEL.items, auch { kind: 'coins', …, hiddenUntilLit: true }). Mit duration erlischt sie
// wieder; dann verschwinden die noch nicht eingesammelten Münzen erneut (außer eine andere Laterne beleuchtet sie).
//
//   { kind: 'lantern', pos: [x, y, z] (Fußpunkt; hängend: Aufhängepunkt liegt 2,4 m darüber),
//     radius: 6 (m, Reichweite des Lichts), duration: 0 (s; 0 = bleibt an), hanging: false, lit: false,
//     onLit?: Aktion (entities/gimmick.js) beim ersten Anzünden, id? }
//   Beispiel: { kind: 'lantern', pos: [3, 0, -40], radius: 7 },
//             { kind: 'coins', from: [0, 0.6, -38], to: [6, 0.6, -38], n: 5, hiddenUntilLit: true }
// Modell 'lantern' (state off/on). Berührbereich: Pfosten bzw. Lampe.

import * as THREE from 'three';
import { Gimmick, runAction } from '../gimmick.js';
import { getModel } from '../../models/index.js';

class Lantern extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'lantern');
    this.hanging = !!spec.hanging;
    this.radius = spec.radius ?? 6;
    this.duration = spec.duration ?? 0;
    this.lampY = this.pos.y + (this.hanging ? 1.85 : 1.95);
    if (this.hanging) this.half.set(0.4, 0.45, 0.4);
    else {
      this.half.set(0.38, 1.15, 0.38);
      const p = this.pos;
      this.addSolid({ type: 'cyl', x: p.x, z: p.z, r: 0.12, y0: p.y, y1: p.y + 1.7, camIgnore: true, tag: 'lantern' });
    }
    this.lit = false;
    this.timer = 0;
    this.revealed = [];
    this.spot = null;
    if (level.view) this.setModel(getModel('lantern', { hanging: this.hanging }));
    if (spec.lit) this.light(true);
  }

  center(out = this._c) { return this.hanging ? out.set(this.pos.x, this.lampY, this.pos.z) : out.set(this.pos.x, this.pos.y + this.half.y, this.pos.z); }

  onPlayer() { this.light(); return 'none'; }

  onHit(kind) { if (kind === 'claw' || kind === 'fire' || kind === 'pound' || kind === 'mega') this.light(); }

  light(quiet = false) {
    if (this.hidden) return;
    this.timer = this.duration;
    if (this.lit) return;
    this.lit = true;
    if (!quiet) {
      this.level.sfx('switch');
      this.level.effects?.sparks({ x: this.pos.x, y: this.lampY, z: this.pos.z }, 10);
    }
    // Licht (Thema cave: die nächsten Laternen leuchten als Punktlicht)
    const view = this.level.view;
    if (view?.lanternSpots) { this.spot = new THREE.Vector3(this.pos.x, this.lampY + 0.15, this.pos.z); view.lanternSpots.push(this.spot); }
    this.scan();
    this.rescan = true; // Münzen, die erst nach der Laterne entstehen (Level-Aufbau), im nächsten Schritt
    if (!this.litOnce) { this.litOnce = true; runAction(this.level, this.spec.onLit, { pos: [this.pos.x, this.pos.y, this.pos.z], source: this }); }
  }

  /** Versteckte Münzen im Umkreis zeigen. */
  scan() {
    const r2 = this.radius * this.radius;
    for (const e of this.level.entities) {
      if (e.kind !== 'coin' || !e.hiddenUntilLit || !e.hidden || !e.alive) continue;
      const dx = e.pos.x - this.pos.x, dy = e.pos.y - this.lampY, dz = e.pos.z - this.pos.z;
      if (dx * dx + dy * dy * 0.5 + dz * dz > r2) continue;
      e.reveal();
      this.revealed.push(e);
    }
  }

  extinguish() {
    if (!this.lit) return;
    this.lit = false;
    const spots = this.level.view?.lanternSpots;
    if (spots && this.spot) { const i = spots.indexOf(this.spot); if (i >= 0) spots.splice(i, 1); }
    this.spot = null;
    const others = this.level.entities.filter((e) => e !== this && e.kind === 'lantern' && e.lit);
    for (const c of this.revealed) {
      if (!c.alive) continue;
      const covered = others.some((o) => Math.hypot(c.pos.x - o.pos.x, c.pos.z - o.pos.z) <= o.radius);
      if (!covered) c.conceal();
    }
    this.revealed.length = 0;
    this.level.sfx('vanish');
  }

  update(dt) {
    if (this.rescan) { this.rescan = false; if (this.lit) this.scan(); }
    if (this.lit && this.duration > 0) {
      this.timer -= dt;
      if (this.timer <= 0) this.extinguish();
    }
  }

  modelState() { return { anim: this.lit ? 'on' : 'off' }; }

  dispose() {
    const spots = this.level.view?.lanternSpots;
    if (spots && this.spot) { const i = spots.indexOf(this.spot); if (i >= 0) spots.splice(i, 1); }
    super.dispose();
  }
}

export const KINDS = { lantern: (level, spec) => new Lantern(level, spec) };
