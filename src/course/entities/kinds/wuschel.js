// Wuschel (Bauplan Welt 2: „kreist auf Bahn, unverwundbar“, Konter: ausweichen).
//
// Fährt unermüdlich eine feste Bahn – pendelnd (zwei oder mehr Punkte, hin und her), als Schleife (loop) oder als
// Kreis um center. Mit count > 1 fahren mehrere hintereinander (Abstand spacing m entlang der Bahn). Unverwundbar:
// Draufspringen, Stampfen, Feuer, Krallen, Panzer, Wurf, Explosion, Kanonenkugel prallen ab – nur Funkelstern und
// Riesentrank vertreiben ihn. Jede Berührung (auch von oben) verletzt die Figur.
// Alle Wuschel eines Levels teilen sich eine Instanz-Gruppe (createInstanced('wuschel'), 2 Zeichenaufrufe).
//
// Daten: { kind: 'wuschel', path?: [[x,y,z], …] (Mitte-Unterkante, y = Fahrhöhe der Unterkante),
//          loop?: (Standard: true ab 3 Punkten), center?: [x,y,z] + radius?: 2.5 (Kreisbahn statt path),
//          cw?: false (Kreis im Uhrzeigersinn von oben), speed?: 2.5 m/s, count?: 1, spacing?: 1.4 m,
//          phase?: 0..1 (Startpunkt auf der Bahn), wait?: 0 (s Pause an den Enden der Pendelbahn),
//          size?: 1 (Faktor), pos? (ohne Bahn: schwebt an der Stelle) }
//   Beispiel: { kind: 'wuschel', center: [0, 1.5, -30], radius: 3, count: 4, spacing: 4.7 }
// Zustände: move | gone (vertrieben). Laufzeit: s (Bahnweg m), mover (PathMover).
// Bonuswelten (additiv, Präzisierung Gegner Bonuswelten): der Biss der Topfpflanze/Topf-Schnappblume (onHit('bite')) verschlingt
//   ihn (K-1 „Topf-Schnappblume frisst Wuschel“); noBite?: true schützt ihn. Laufzeit: bitten.

import { EnemyW2, sharedSlot } from '../EnemyW2.js';
import { PathMover } from '../../level/PathMover.js';

const TAU = Math.PI * 2;

function circlePath(c, r, n = 24, cw = false) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU * (cw ? -1 : 1);
    pts.push([c[0] + Math.cos(a) * r, c[1], c[2] - Math.sin(a) * r]);
  }
  return pts;
}

class Wuschel extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'wuschel');
    this.size = spec.size ?? 1;
    this.half.set(0.4 * this.size, 0.42 * this.size, 0.4 * this.size);
    this.shadow = 0.42 * this.size;
    this.speed = spec.speed ?? 2.5;
    this.state = 'move';
    this.wake = 0;
    this.mover = null;
    const pts = spec.center ? circlePath(spec.center, spec.radius ?? 2.5, 32, !!spec.cw) : spec.path;
    if (pts?.length >= 2) {
      const loop = spec.center ? true : (spec.loop ?? pts.length >= 3);
      this.mover = new PathMover(pts, { speed: this.speed, mode: loop ? 'loop' : 'pingpong', wait: spec.wait ?? 0, phase: ((spec.phase ?? 0) % 1 + 1) % 1 });
      this.pos.set(this.mover.pos.x, this.mover.pos.y, this.mover.pos.z);
    }
    this.slot = sharedSlot(level, 'wuschel');
    this.slot?.set(this.pos, this.yaw, this.size, 'move');
  }

  update(dt) {
    this.stateT += dt;
    if (this.updateDefeat(dt)) return;
    if (!this.mover) return;
    const x0 = this.pos.x, z0 = this.pos.z;
    this.mover.step(dt);
    const p = this.mover.pos;
    this.pos.set(p.x, p.y, p.z);
    const dx = p.x - x0, dz = p.z - z0;
    if (dx * dx + dz * dz > 1e-8) this.yaw = Math.atan2(-dz, dx);
  }

  onPlayer() { return this.defeated ? 'none' : 'hurt'; }

  onHit(kind, source) {
    if (this.defeated) return;
    if (kind === 'mega' || kind === 'star') this.flip(source, 7);
    // Bonuswelten (K-1 „Topf-Schnappblume frisst Wuschel“, K-Haus 25): der Biss der Topfpflanze verschlingt ihn
    else if (kind === 'bite' && !this.spec.noBite) { this.flip(source, 2); this.bitten = true; }
  }

  render() {
    if (!this.slot) return;
    if (this.removed) return;
    this.slot.set(this.pos, this.yaw, this.size, this.state === 'flipped' ? 'idle' : 'move');
  }

  dispose() {
    this.slot?.release();
    this.slot = null;
    super.dispose();
  }

  info() { return { state: this.state, x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2) }; }
}

/** count Wuschel hintereinander auf derselben Bahn. */
function make(level, spec) {
  const n = Math.max(1, Math.round(spec.count ?? 1));
  const first = new Wuschel(level, { ...spec, count: 1 });
  if (n > 1 && first.mover) {
    const L = first.mover.length || 1;
    const spacing = spec.spacing ?? 1.4;
    for (let i = 1; i < n; i++) {
      level.spawn('wuschel', { ...spec, id: spec.id ? `${spec.id}_${i}` : undefined, count: 1, phase: (spec.phase ?? 0) - (i * spacing) / L });
    }
  }
  return first;
}

export const KINDS = { wuschel: make };
