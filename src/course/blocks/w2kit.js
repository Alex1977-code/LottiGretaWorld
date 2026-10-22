// Gemeinsame Hilfen der Welt-2-Bausteine (blocks/types/w2_*.js, deco_w2.js). Liegt bewusst außerhalb von types/
// (die Registry sammelt nur types/*.js).
//
//   MovingBox      bewegter Quader mit mover-Flag (trägt Figur und Gegner mit), moveTo(x, y, z, dt), setSolid(b)
//   circleSlices   Quader-Scheiben eines liegenden Zylinders (Rad/Walze) für die Kollision
//   modelObject    Modell aus der Registry als animiertes Objekt (Zeitschritt folgt der Simulation)
//   bakeModel      Modell in statische Geometrie verschmelzen (Kulisse: 0 zusätzliche Zeichenaufrufe)
//   yawOf          Gier aus einer Richtung (dx, dz)
//   figures        aktive Spielfiguren (Haupt-Figur + Klone der Spiegelfrucht, Präzisierung Motor Welt 2)

import * as THREE from 'three';
import { getModel } from '../models/index.js';
import { addObject, addStatic } from './kit.js';
import { visDt } from '../entities/gimmick.js';

export const yawOf = (dx, dz) => Math.atan2(-dz, dx);

/** Aktive Spielfiguren (lebend, nicht entfernt) – mit Klonen alle, sonst nur level.player. */
export function figures(level) {
  const out = [];
  for (const p of level.players ?? [level.player]) if (p && !p.dead && !p.removedFigure) out.push(p);
  return out;
}

/** Bewegter Quader: pos = Mitte der Unterseite, size = [w, h, d]; Kollisionsform mit mover (owner optional). */
export class MovingBox {
  constructor(level, x, y, z, sx, sy, sz, flags = {}) {
    this.level = level;
    this.size = { x: sx, y: sy, z: sz };
    this.pos = { x, y, z };
    this.mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: x, cz: z };
    const { solid, ...rest } = flags;   // solid: false = erst per setSolid(true) in der Welt
    this.shape = { type: 'box', min: [x - sx / 2, y, z - sz / 2], max: [x + sx / 2, y + sy, z + sz / 2], mover: this.mover, ...rest };
    this.id = null;
    if (solid !== false) this.id = level.world.add(this.shape);
    this.on = this.id !== null;
  }

  get top() { return this.pos.y + this.size.y; }

  /** Verschieben (Mitte der Unterseite) – Verschiebung dieses Schritts trägt Figur/Gegner mit. */
  moveTo(x, y, z, dt) {
    const m = this.mover;
    m.dx = x - this.pos.x; m.dy = y - this.pos.y; m.dz = z - this.pos.z;
    const k = dt > 0 ? 1 / dt : 0;
    m.vx = m.dx * k; m.vy = m.dy * k; m.vz = m.dz * k;
    m.cx = x; m.cz = z;
    this.pos.x = x; this.pos.y = y; this.pos.z = z;
    if (m.dx || m.dy || m.dz) {
      const s = this.size, sh = this.shape;
      sh.min = [x - s.x / 2, y, z - s.z / 2]; sh.max = [x + s.x / 2, y + s.y, z + s.z / 2];
      if (this.id) this.level.world.update(this.id);
    }
  }

  /** Größe ändern (Mitte unten bleibt). */
  resize(sx, sy, sz) {
    this.size = { x: sx, y: sy, z: sz };
    const p = this.pos, sh = this.shape;
    sh.min = [p.x - sx / 2, p.y, p.z - sz / 2]; sh.max = [p.x + sx / 2, p.y + sy, p.z + sz / 2];
    if (this.id) this.level.world.update(this.id);
  }

  /** Stillstand dieses Schritts melden (keine Mitnahme). */
  still() { const m = this.mover; m.dx = m.dy = m.dz = m.vx = m.vy = m.vz = 0; }

  setSolid(on) {
    if (on && !this.id) {
      const s = this.size, p = this.pos;
      this.shape.min = [p.x - s.x / 2, p.y, p.z - s.z / 2]; this.shape.max = [p.x + s.x / 2, p.y + s.y, p.z + s.z / 2];
      this.id = this.level.world.add(this.shape);
    } else if (!on && this.id) { this.level.world.remove(this.id); this.id = null; }
    this.on = !!this.id;
  }

  /** Steht die Figur auf dieser Form? */
  carries(player) { return !!player && !player.dead && player.mode === 'ground' && player.ground === this.shape; }

  /** Zahl der Figuren (auch Klone), die darauf stehen. */
  carried(level) { let n = 0; for (const p of figures(level)) if (this.carries(p)) n++; return n; }
}

/**
 * Quader-Scheiben eines liegenden Zylinders (Mitte c, Radius R, halbe Länge hl, Achse 'x' oder 'z'): Scheiben
 * quer zur Achse (Breite step), Oberkante auf dem Kreis (Hülle). Liefert [{ u0, u1, h }] (u = Versatz quer zur
 * Achse, h = halbe Höhe der Scheibe) – Lage relativ zur Mitte.
 */
export function circleSlices(R, step = 0.25) {
  const n = Math.max(2, Math.round((2 * R) / step));
  const w = (2 * R) / n;
  const out = [];
  for (let i = 0; i < n; i++) {
    const u0 = -R + i * w, u1 = u0 + w;
    const near = Math.min(Math.abs(u0), Math.abs(u1));
    const cross = u0 < 0 && u1 > 0;
    const h = Math.sqrt(Math.max(0, R * R - (cross ? 0 : near * near)));
    if (h < 0.05) continue;
    out.push({ u0, u1, h, uc: (u0 + u1) / 2 });
  }
  return out;
}

/**
 * Modell als eigenes Objekt (Darstellung je Bild: update(state)); dt folgt der Simulation (Tests mit step()).
 * state: Objekt oder Funktion → Zustand; follow(root, dt): optional je Bild vor dem update (Lage nachführen).
 */
export function modelObject(level, name, opts, x, y, z, yaw = 0, state, follow) {
  if (!level.view) return null;
  const m = getModel(name, opts);
  m.root.position.set(x, y, z);
  m.root.rotation.y = yaw;
  const holder = {};
  const st = typeof state === 'function' ? state : () => state ?? {};
  addObject(level, m.root, (dt) => {
    const d = visDt(level, holder, dt);
    follow?.(m.root, d);
    m.update?.(d, st());
  });
  follow?.(m.root, 0);
  m.update?.(0, st());
  return m;
}

const _m = new THREE.Matrix4(), _im = new THREE.Matrix4();

/**
 * Modell in statische Geometrie verschmelzen (Kulisse). Vertexgefärbte Teile → Material 'world', unbeleuchtete
 * (MeshBasicMaterial) → 'glow'; einfarbige Teile bekommen ihre Materialfarbe; Sprites und Teile mit Textur
 * entfallen. Instanz-Teile werden je Instanz übernommen. state = Zustand für einen Aktualisierungsschritt
 * (z. B. Drehung). Liefert die Zahl der Dreiecke.
 */
export function bakeModel(level, name, opts, x, y, z, yaw = 0, scale = 1, state = {}, bakeOpts = {}) {
  if (!level.view) return 0;
  const m = getModel(name, opts);
  m.update?.(0, state);
  const root = m.root;
  root.position.set(x, y, z);
  root.rotation.set(0, yaw, 0);
  if (Array.isArray(scale)) root.scale.set(scale[0], scale[1], scale[2]); else root.scale.setScalar(scale);
  root.updateMatrixWorld(true);
  let tris = 0;
  const parts = { world: [], glow: [] };
  root.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    let vis = true;
    for (let q = o.parent; q; q = q.parent) if (!q.visible) { vis = false; break; }
    if (!vis) return;
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!mat || mat.map || mat.transparent || mat.visible === false) return;
    const kind = mat.isMeshBasicMaterial ? 'glow' : 'world';
    const mats = [];
    if (o.isInstancedMesh) {
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, _im);
        if (Math.abs(_im.determinant()) < 1e-9) continue;
        mats.push(_m.clone().multiplyMatrices(o.matrixWorld, _im));
      }
    } else mats.push(o.matrixWorld.clone());
    for (const M of mats) {
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const a of Object.keys(g.attributes)) if (a !== 'position' && a !== 'normal' && a !== 'color') g.deleteAttribute(a);
      if (!g.attributes.normal) g.computeVertexNormals();
      if (!g.attributes.color || !mat.vertexColors) {
        const c = mat.color ?? new THREE.Color(1, 1, 1);
        const e = mat.emissive;
        const r = Math.min(1, c.r + (e?.r ?? 0) * 0.5), gg = Math.min(1, c.g + (e?.g ?? 0) * 0.5), b = Math.min(1, c.b + (e?.b ?? 0) * 0.5);
        const n = g.attributes.position.count;
        const arr = new Float32Array(n * 3);
        const old = mat.vertexColors && g.attributes.color ? g.attributes.color.array : null;
        for (let i = 0; i < n; i++) {
          arr[i * 3] = old ? old[i * 3] * c.r : r; arr[i * 3 + 1] = old ? old[i * 3 + 1] * c.g : gg; arr[i * 3 + 2] = old ? old[i * 3 + 2] * c.b : b;
        }
        g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      } else if (mat.color && (mat.color.r !== 1 || mat.color.g !== 1 || mat.color.b !== 1)) {
        // Vertexfarben × Materialfarbe (z. B. weiß getönte Instanz-Teile)
        const a = g.attributes.color.array.slice();
        for (let i = 0; i < a.length; i += 3) { a[i] *= mat.color.r; a[i + 1] *= mat.color.g; a[i + 2] *= mat.color.b; }
        g.setAttribute('color', new THREE.BufferAttribute(a, 3));
      }
      g.applyMatrix4(M);
      tris += g.attributes.position.count / 3;
      parts[kind].push(g);
    }
  });
  m.dispose?.();
  const cast = bakeOpts.castShadow !== false;
  for (const g of parts.world) addStatic(level, g, { material: 'world', castShadow: cast });
  for (const g of parts.glow) addStatic(level, g, { material: 'glow', castShadow: false });
  return tris;
}
