// Kleine Welt-8-Arten „Brummbär-Rummelplatz“ (Präzisierung Gegner Welt 8): Schockwelle (goldene Würfelblase 8-A, Baron im
// Krallen-Anzug), Lavapfütze (rosa Schlangenkönig 8-B) und Hörner-Ameisen-Reihe aus Löchern (8-3 Ameisenstraße).
//
// schockwelle – Ring, der sich am Boden ausbreitet (Modell 'schockwelle' { radius, color }, sonst eigener Ring): wächst mit speed
//   m/s von r0 bis radius; **wer ihn am Boden berührt (bis height m hoch), wird verletzt – drüberspringen**. Jede Figur höchstens
//   einmal je Welle. Kein Gegner.
//   Daten: { kind: 'schockwelle', pos: [x, y, z] (Mitte am Boden), radius?: 6, r0?: 0.5, speed?: 7, height?: 0.45,
//            color?: 'gold' | 'weiss', owner? }   Laufzeit: r, hits, info().
//
// lavapfuetze – glühende Pfütze, die ein geschleuderter Lavabrocken hinterlässt (Modell 'lavapfuetze' { size }, sonst eigene
//   Scheibe): breitet sich grow s aus (Vorwarnung, noch harmlos), ist life s **heiß** (wer darin steht, wird verletzt), kühlt in
//   cool s zu Stein ab (ab der Hälfte harmlos) und verschwindet.
//   Daten: { kind: 'lavapfuetze', pos: [x, y, z] (Mitte am Boden), size?: 2.2 (Ø), grow?: 0.5, life?: 4, cool?: 1.6, owner? }
//   Laufzeit: state ('grow' | 'hot' | 'cool'), hurts, hot (bool), info().
//
// ameisen_reihe – Hörner-Ameisen (bzw. Ameisensoldaten) marschieren in Reihen aus einem Loch im Boden (from) zu einem zweiten
//   (to), in dem sie verschwinden – endlos (Strom der Welt-4-Ameisen, mode 'once'). lanes Reihen nebeneinander (gap m quer).
//   Die Löcher sind dunkle Erdkrater mit Rand (Darstellung; ob ein Loch begehbar ist, bauen die Level-Bauer).
//   Daten: { kind: 'ameisen_reihe', id?, from: [x, y, z], to: [x, y, z], horn?: true, lanes?: 1, gap?: 1.3, every?: 2.2 (s),
//            speed?: 1.5, max?: 8 (je Reihe), prefill?: true, phase?: 0..1 (Versatz der Reihen), holes?: true, ride?: false }
//   Laufzeit: streams (Spender je Reihe), alive (lebende Ameisen), spawned, info().
// Sound: 'slam' (Welle), 'burn' (Pfütze), 'dig' (Ameisen-Loch).

import * as THREE from 'three';
import { CourseEntity } from '../CourseEntity.js';
import { figures, activeFigure } from '../EnemyW2.js';
import { getModel, hasModel } from '../../models/index.js';
import { addObject } from '../../blocks/kit.js';

// =====================================================================================================================
// Schockwelle
// =====================================================================================================================
class Schockwelle extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'schockwelle');
    this.touch = false;
    this.shadow = 0;
    this.R = spec.radius ?? 6;
    this.r = spec.r0 ?? 0.5;
    this.speed = spec.speed ?? 7;
    this.height = spec.height ?? 0.45;
    this.owner = spec.owner ?? null;
    this.hit = new Set();
    this.hits = 0;
    this.half.set(this.R, 0.3, this.R);
    this.color = spec.color === 'weiss' ? 'weiss' : 'gold';
    if (level.view) {
      // Modell doppelt so groß anlegen: der Ring bleibt bis zum Endradius voll sichtbar (Ausblenden erst danach)
      if (hasModel('schockwelle')) this.setModel(getModel('schockwelle', { radius: this.R * 2, color: this.color }));
      else this.setModel(fallbackRing(this.color));
    }
  }

  update(dt) {
    this.r += this.speed * dt;
    const y = this.pos.y;
    for (const p of figures(this.level)) {
      if (!activeFigure(p) || this.hit.has(p)) continue;
      if (p.pos.y > y + this.height || p.pos.y + p.half.y * 2 < y - 0.2) continue;
      const d = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
      if (Math.abs(d - this.r) < 0.3 + p.half.x) {
        this.hit.add(p);
        if (p.hurt({ pos: { x: this.pos.x, y, z: this.pos.z } })) this.hits++;
      }
    }
    this.dustT = (this.dustT ?? 0) - dt;
    if (this.dustT <= 0 && this.level.effects) {
      this.dustT = 0.1;
      const n = Math.max(5, Math.round(this.r * 1.4));
      for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + this.r * 0.5; this.level.effects.dust({ x: this.pos.x + Math.cos(a) * this.r, y, z: this.pos.z + Math.sin(a) * this.r }, 1, 0.35); }
    }
    if (this.r >= this.R) this.kill();
  }

  onPlayer() { return 'none'; }

  modelState() { return { progress: Math.max(0, Math.min(1, (this.r / (this.R * 2) - 0.1) / 0.9)), r: this.r }; }

  syncModel() {
    if (!this.model) return;
    this.model.root.position.copy(this.pos);
  }

  info() { return { r: +this.r.toFixed(2), R: this.R, hits: this.hits }; }
}

function fallbackRing(color) {
  const mat = new THREE.MeshBasicMaterial({ color: color === 'weiss' ? 0xffffff : 0xffd040, transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false });
  const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 6, 48), mat);
  m.rotation.x = Math.PI / 2;
  m.position.y = 0.2;
  const root = new THREE.Group();
  root.add(m);
  return { root, update(dt, st) { const r = Math.max(0.05, st?.r ?? 1); m.scale.set(r, r, 1 + 2 / r); }, dispose() { m.geometry.dispose(); mat.dispose(); } };
}

// =====================================================================================================================
// Lavapfütze
// =====================================================================================================================
class Lavapfuetze extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'lavapfuetze');
    this.touch = false;
    this.shadow = 0;
    this.size = spec.size ?? 2.2;
    this.growT = spec.grow ?? 0.5;
    this.lifeT = spec.life ?? 4;
    this.coolT = spec.cool ?? 1.6;
    this.owner = spec.owner ?? null;
    this.half.set(this.size / 2, 0.2, this.size / 2);
    this.state = 'grow';
    this.stateT = 0;
    this.hurts = 0;
    this.level.sfx('burn');
    if (level.view) {
      if (hasModel('lavapfuetze')) this.setModel(getModel('lavapfuetze', { size: this.size }));
      else this.setModel(fallbackPuddle(this.size));
    }
  }

  get hot() { return this.state === 'hot' || (this.state === 'cool' && this.stateT < this.coolT * 0.5); }

  update(dt) {
    this.stateT += dt;
    if (this.state === 'grow' && this.stateT >= this.growT) { this.state = 'hot'; this.stateT = 0; }
    else if (this.state === 'hot' && this.stateT >= this.lifeT) { this.state = 'cool'; this.stateT = 0; }
    else if (this.state === 'cool' && this.stateT >= this.coolT) { this.kill(); return; }
    if (!this.hot) return;
    const r = this.size * 0.45, y = this.pos.y;
    for (const p of figures(this.level)) {
      if (!activeFigure(p) || p.invuln > 0) continue;
      if (p.pos.y > y + 0.35 || p.pos.y < y - 0.4) continue;
      if (Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) > r + p.half.x * 0.5) continue;
      if (p.hurt(this)) { this.hurts++; this.level.sfx('burn'); this.level.effects?.sparks({ x: p.pos.x, y: y + 0.3, z: p.pos.z }, 8); }
    }
  }

  onPlayer() { return 'none'; }

  /** Abkühlen sofort (Neustart eines Kampfs). */
  extinguish() { if (this.state !== 'cool') { this.state = 'cool'; this.stateT = this.coolT * 0.5; } }

  modelState() {
    if (this.state === 'grow') return { anim: 'grow', progress: Math.min(1, this.stateT / this.growT) };
    if (this.state === 'cool') return { anim: 'cool', progress: Math.min(1, this.stateT / this.coolT) };
    return { anim: 'idle' };
  }

  syncModel() {
    if (!this.model) return;
    this.model.root.position.copy(this.pos);
  }

  info() { return { state: this.state, hot: this.hot, hurts: this.hurts, size: this.size }; }
}

function fallbackPuddle(size) {
  const mat = new THREE.MeshBasicMaterial({ color: 0xff6a1a, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1 });
  const m = new THREE.Mesh(new THREE.CircleGeometry(size / 2, 24), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.02;
  const root = new THREE.Group();
  root.add(m);
  return {
    root,
    update(dt, st) {
      const k = st?.anim === 'grow' ? Math.max(0.05, st.progress) : st?.anim === 'cool' ? 1 - Math.max(0, st.progress - 0.6) / 0.4 : 1;
      m.scale.setScalar(Math.max(0.01, k));
      mat.color.setHex(st?.anim === 'cool' && st.progress > 0.5 ? 0x5a3a30 : 0xff6a1a);
    },
    dispose() { m.geometry.dispose(); mat.dispose(); },
  };
}

// =====================================================================================================================
// Hörner-Ameisen-Reihe aus Löchern
// =====================================================================================================================
class AmeisenReihe extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'ameisen_reihe');
    this.touch = false;
    this.shadow = 0;
    const a = spec.from ?? spec.pos ?? [0, 0, 0], b = spec.to ?? [a[0], a[1], a[2] - 10];
    this.from = new THREE.Vector3(a[0], a[1], a[2]);
    this.to = new THREE.Vector3(b[0], b[1], b[2]);
    this.pos.copy(this.from);
    const dx = this.to.x - this.from.x, dz = this.to.z - this.from.z, l = Math.hypot(dx, dz) || 1;
    const sx = -dz / l, sz = dx / l;
    const lanes = Math.max(1, Math.round(spec.lanes ?? 1)), gap = spec.gap ?? 1.3;
    const kind = spec.horn === false ? 'ameisensoldat' : 'ameisensoldat_horn';
    const every = spec.every ?? 2.2;
    this.streams = [];
    for (let i = 0; i < lanes; i++) {
      const o = (i - (lanes - 1) / 2) * gap;
      const p0 = [this.from.x + sx * o, this.from.y, this.from.z + sz * o], p1 = [this.to.x + sx * o, this.to.y, this.to.z + sz * o];
      const ph = ((spec.phase ?? 0.37) * i) % 1;
      const s = level.spawn(kind, {
        id: spec.id ? `${spec.id}_reihe${i}` : undefined, path: [p0, p1], speed: spec.speed ?? 1.5, ride: spec.ride ?? false,
        spawner: { every, max: spec.max ?? 8, first: ph * every, prefill: spec.prefill ?? true },
      });
      if (s) this.streams.push(s);
    }
    if (level.view && spec.holes !== false) {
      const w = (lanes - 1) * gap + 1.4;
      this.buildHole(this.from, w, Math.atan2(-dz, dx));
      this.buildHole(this.to, w, Math.atan2(-dz, dx));
    }
  }

  /** Erdloch (dunkle Mulde mit Erdrand), quer zur Laufrichtung w m breit. */
  buildHole(p, w, yaw) {
    const g = new THREE.Group();
    const dark = new THREE.MeshBasicMaterial({ color: 0x1a120c, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.95 });
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.75, 20), dark);
    hole.rotation.x = -Math.PI / 2;
    hole.scale.set(0.75, Math.max(1, w / 1.5), 1);
    hole.position.y = 0.03;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.14, 6, 24), rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.scale.set(0.75, Math.max(1, w / 1.5), 1);
    rim.position.y = 0.06;
    rim.castShadow = false; rim.receiveShadow = true;
    g.add(hole, rim);
    g.position.set(p.x, p.y, p.z);
    g.rotation.y = yaw;
    addObject(this.level, g);
    (this.holes ??= []).push(g);
  }

  get alive() { return this.streams.reduce((n, s) => n + (s.aliveCount ?? 0), 0); }
  get spawned() { return this.streams.reduce((n, s) => n + (s.spawned ?? 0), 0); }

  onPlayer() { return 'none'; }
  onHit() {}

  info() { return { streams: this.streams.length, alive: this.alive, spawned: this.spawned }; }
}

export const KINDS = {
  schockwelle: (level, spec) => new Schockwelle(level, spec),
  lavapfuetze: (level, spec) => new Lavapfuetze(level, spec),
  ameisen_reihe: (level, spec) => new AmeisenReihe(level, spec),
};
