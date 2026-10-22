// Fahrzeug `vehicle` (Autoscroller: Panzer 2-Panzer/6-Panzer, Zugwaggons 3-Zug/5-Zug/8-Zug, Kettenzäune 3-2,
// Plattformwagen): bewegte Plattform aus mehreren Kollisionsquadern mit gemeinsamem `mover` – trägt Figur, Gegner
// und Objekte mit (Kollisionswelt-Flag mover, Präzisierung Motor). Fährt entlang eines Pfads: standardmäßig der Pfad
// des Bildfensters (level.scroll, Archetyp autoscroller) – entweder genau mit dem Fenster (`speed: 'scroll'`) oder
// mit eigenem Tempo (Fenster schneller als die Kolonne → die Figur muss nach vorn über die Fahrzeuge).
// Unterobjekte fahren mit: jede Entität mit `attach: '<id>'` (Kanone, Gegner, Münzen, Sterne, Blöcke, Checkpoint …)
// wird je Schritt mit dem Fahrzeug versetzt/gedreht; ihre Kollisionsformen auch (sie tragen dann ebenfalls mit).
//
// Daten (LEVEL.segments als `type` oder items/enemies als `kind`):
//   { kind: 'vehicle', id: 'wagen1',
//     style: 'cart' (Plattformwagen, Standard) | 'tank' (Panzer) | 'wagon' (Güterwagen, begehbares Dach) |
//            'flat' (Flachwagen) | 'fence' (Kettenzaun-Plattform, schwebt) | 'plain' (einfarbiger Quader),
//     size: [w, h, d]    Breite, Deckhöhe (Oberkante über der Fahrebene), Länge – Standard je Stil
//     at: 20             m entlang des Pfads (Mitte des Fahrzeugs) beim Fahrtbeginn
//     offset: [dx, dy]   seitlich (+ = rechts in Fahrtrichtung) und Höhe relativ zur Pfadlinie
//     path: [[x,y,z], …] eigener Pfad (Standard: Pfad des Bildfensters; ohne Autoscroller: pos + dir)
//     pos: [x,y,z], dir: [dx, dz]   ohne Pfad: gerade Strecke ab pos (Fahrebene = pos.y)
//     speed: 2.5 | 'scroll'   eigenes Tempo m/s (negativ = rückwärts) oder genau mit dem Fenster;
//                             Standard 'scroll' mit Autoscroller, sonst 0
//     delay: 0           s nach Fahrtbeginn (Autoscroller) bzw. Levelstart
//     stop: m            Halt an dieser Pfadlänge (Mitte), mit `brake` (3 m/s²) weich abgebremst
//     mode: 'once' | 'loop' | 'pingpong'   eigener Pfad: einmal bis zum Ende (Standard), Runde, hin und her
//     reverse: false     Fahrzeug blickt entgegen der Fahrtrichtung
//     color, accent      Farben (Name/Hex)
//     deck: true         Grunddeck des Stils (false = nur parts)
//     parts: [{ pos: [x, y, z], size: [w, h, d], color, climbable, oneWay, solid, kill, visible, tag }]
//                        Aufbauten in Fahrzeug-Koordinaten (x rechts, y oben ab Fahrebene, z nach hinten +,
//                        pos = Mitte der Unterseite) – Ladung, Wände, Rampen-Stufen, Gitterwände (climbable)
//   }
// Kurven: die Quader bleiben achsenparallel (Hüllquader des gedrehten Teils) – Fahrzeuge fahren am besten gerade
// oder im 90°-Raster; die Drehung selbst wird an die Figur weitergegeben (mover.dyaw).
// Laufzeit: level.named.get(id) = Fahrzeug; s (Pfadlänge), speedNow, attached (Set), info().

import * as THREE from 'three';
import { CourseEntity } from '../CourseEntity.js';
import { ScrollPath } from '../../archetypes/ScrollWindow.js';
import { box, hex, lin, mixc, colorize, merge } from '../../blocks/kit.js';

const TAU = Math.PI * 2;
const wrap = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; else if (a < -Math.PI) a += TAU; return a; };

const STYLES = {
  cart: { size: [4, 1.2, 9], color: 0xff5a3c, accent: 0xffd23d },
  tank: { size: [5, 2.2, 10], color: 0x7a5cc8, accent: 0x3a3450 },
  wagon: { size: [3.6, 3.2, 12], color: 0xd2483c, accent: 0x5a3a2a },
  flat: { size: [3.4, 1.0, 10], color: 0x3d8bff, accent: 0xffd23d },
  fence: { size: [4, 0.3, 4], color: 0xbfc1cc, accent: 0x6a6d7a },
  plain: { size: [3, 1, 3], color: 0xffd23d, accent: 0xb88a12 },
};

class Vehicle extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'vehicle');
    this.touch = false;
    this.shadow = 0;
    this.style = STYLES[spec.style] ? spec.style : 'cart';
    const st = STYLES[this.style];
    const sz = spec.size ?? st.size;
    this.size = { w: sz[0], h: sz[1], d: sz[2] };
    this.color = hex(spec.color, st.color);
    this.accent = hex(spec.accent, st.accent);
    this.half.set(this.size.w / 2, this.size.h / 2, this.size.d / 2);
    // Pfad: eigener, sonst der des Bildfensters, sonst gerade ab pos in Richtung dir
    this.scroll = level.scroll ?? null;
    if (spec.path) this.path = new ScrollPath(spec.path);
    else if (this.scroll) this.path = this.scroll.path;
    else {
      const p = spec.pos ?? [0, 0, 0], d = spec.dir ?? [0, -1], l = Math.hypot(d[0], d[1]) || 1;
      this.path = new ScrollPath([p, [p[0] + (d[0] / l) * 2000, p[1], p[2] + (d[1] / l) * 2000]]);
    }
    this.ownPath = !!spec.path || !this.scroll;
    this.at = spec.at ?? 0;
    this.offset = { x: spec.offset?.[0] ?? 0, y: spec.offset?.[1] ?? 0 };
    this.speed = spec.speed ?? (this.scroll && !spec.path ? 'scroll' : 0);
    this.delay = spec.delay ?? 0;
    this.mode = spec.mode ?? 'once';
    this.brake = spec.brake ?? 3;
    // Halt: angegeben, sonst am Ende eines eigenen Pfads (einmalige Fahrt vorwärts)
    this.stop = spec.stop ?? (this.ownPath && this.mode === 'once' && typeof this.speed === 'number' && this.speed > 0 ? this.path.length : null);
    this.reverse = !!spec.reverse;
    this.t0 = level.time;
    this.mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: 0, cz: 0, vehicle: this };
    this.attached = new Set();
    this.scanned = -1;
    this.s = this.at;
    this.speedNow = 0;
    this.rot = 0;                         // Drehung um +Y (Three.js-Sinn): lokal −Z → Fahrtrichtung
    this.parts = this.buildParts();
    this.pose(this.pos);
    this.shapeIds = [];
    for (const part of this.parts) {
      if (part.solid === false && !part.kill && !part.climbable) continue;
      const shape = { type: 'box', min: [0, 0, 0], max: [1, 1, 1], mover: this.mover, camIgnore: true, tag: part.tag ?? `vehicle:${spec.id ?? this.style}` };
      if (part.oneWay) shape.oneWay = true;
      if (part.climbable) shape.climbable = true;
      if (part.kill) { shape.kill = part.kill; shape.solid = false; }
      if (part.solid === false) shape.solid = false;
      part.shape = shape;
      this.placePart(part);
      this.shapeIds.push(this.addShape(shape));
    }
    if (level.view) this.buildModel();
    // Bewegung vor der Figur (wie der Baustein mover)
    this.unstep = level.onStep((dt) => this.move(dt));
  }

  // ------------------------------------------------------------------ Geometrie

  /** Lokale Teile { min:[x,y,z], max:[x,y,z], … } (x rechts, y oben, z nach hinten). */
  buildParts() {
    const { w, h, d } = this.size, sp = this.spec;
    const parts = [];
    if (sp.deck !== false) {
      if (this.style === 'fence') parts.push({ min: [-w / 2, h - 0.3, -d / 2], max: [w / 2, h, d / 2], tag: 'vehicle:deck' });
      else if (this.style === 'flat') parts.push({ min: [-w / 2, h - 0.45, -d / 2], max: [w / 2, h, d / 2], tag: 'vehicle:deck' });
      else parts.push({ min: [-w / 2, Math.min(0.45, h - 0.2), -d / 2], max: [w / 2, h, d / 2], tag: 'vehicle:deck' });
    }
    for (const p of sp.parts ?? []) {
      const pos = p.pos ?? [0, h, 0], s = p.size ?? [1, 1, 1];
      parts.push({
        min: [pos[0] - s[0] / 2, pos[1], pos[2] - s[2] / 2], max: [pos[0] + s[0] / 2, pos[1] + s[1], pos[2] + s[2] / 2],
        color: p.color, climbable: !!p.climbable, oneWay: !!p.oneWay, solid: p.solid, kill: p.kill, visible: p.visible !== false, tag: p.tag, extra: true,
      });
    }
    return parts;
  }

  /** Pfadlänge zum Zeitpunkt jetzt (reine Funktion der Fahrt-Uhr bzw. der Fensterlage). */
  sNow() {
    const sc = this.scroll;
    if (this.speed === 'scroll') return this.at + (sc ? sc.s - sc.s0 : 0);
    const v = this.speed;
    const clock = (sc ? sc.clock : this.level.time - this.t0) - this.delay;
    if (!v || clock <= 0) return this.wrapS(this.at);
    let travel;
    if (this.stop !== null && this.stop !== undefined && v > 0) {
      const D = Math.max(0, this.stop - this.at), a = Math.max(0.1, this.brake);
      let v0 = v, dB = (v * v) / (2 * a);
      if (dB > D) { v0 = Math.sqrt(2 * a * D); dB = D; }
      const t1 = (D - dB) / v0;
      if (clock <= t1) travel = v0 * clock;
      else { const tau = Math.min(clock - t1, v0 / a); travel = D - dB + v0 * tau - 0.5 * a * tau * tau; }
    } else travel = v * clock;
    return this.wrapS(this.at + travel);
  }

  wrapS(s) {
    if (!this.ownPath) return s;
    const L = this.path.length;
    if (this.mode === 'loop') return ((s % L) + L) % L;
    if (this.mode === 'pingpong') { const m = ((s % (2 * L)) + 2 * L) % (2 * L); return m > L ? 2 * L - m : m; }
    return Math.max(0, Math.min(L, s));
  }

  /** Lage bei der aktuellen Pfadlänge → out (Ursprung = Mitte unten auf der Fahrebene), this.rot. */
  pose(out) {
    this.s = this.sNow();
    const P = this.path.at(this.s, this._p ?? (this._p = {}));
    const D = this.path.dirAt(this.s, this._d ?? (this._d = {}));
    const h = Math.hypot(D.x, D.z);
    let fx = 0, fz = -1;
    if (h > 0.2) { fx = D.x / h; fz = D.z / h; }
    if (this.reverse) { fx = -fx; fz = -fz; }
    this.rot = Math.atan2(-fx, -fz);
    // rechts = (−fz, fx)
    out.x = P.x + -fz * this.offset.x;
    out.y = P.y + this.offset.y;
    out.z = P.z + fx * this.offset.x;
    return out;
  }

  /** Weltlage eines lokalen Punkts (x rechts, z hinten) bei Ursprung o und Drehung a. */
  static toWorld(o, a, lx, lz, out) {
    const c = Math.cos(a), s = Math.sin(a);
    out.x = o.x + lx * c + lz * s;
    out.z = o.z - lx * s + lz * c;
    return out;
  }

  placePart(part) {
    const sh = part.shape;
    const lx = (part.min[0] + part.max[0]) / 2, lz = (part.min[2] + part.max[2]) / 2;
    const hx = (part.max[0] - part.min[0]) / 2, hz = (part.max[2] - part.min[2]) / 2;
    const c = Math.abs(Math.cos(this.rot)), s = Math.abs(Math.sin(this.rot));
    const w = Vehicle.toWorld(this.pos, this.rot, lx, lz, this._w ?? (this._w = {}));
    const ex = c * hx + s * hz, ez = s * hx + c * hz;
    sh.min = [w.x - ex, this.pos.y + part.min[1], w.z - ez];
    sh.max = [w.x + ex, this.pos.y + part.max[1], w.z + ez];
  }

  // ------------------------------------------------------------------ Schritt (level.onStep, vor der Figur)

  move(dt) {
    if (this.removed) return;
    const ox = this.pos.x, oy = this.pos.y, oz = this.pos.z, oa = this.rot;
    this.pose(this.pos);
    const m = this.mover;
    m.dx = this.pos.x - ox; m.dy = this.pos.y - oy; m.dz = this.pos.z - oz;
    m.dyaw = wrap(this.rot - oa);
    m.cx = ox; m.cz = oz;
    const dist = Math.hypot(m.dx, m.dy, m.dz);
    const jump = dist > 0.6;                       // Neustart (Fahrt zurückgesetzt): keine Geschwindigkeit melden
    m.vx = jump ? 0 : m.dx / dt; m.vy = jump ? 0 : m.dy / dt; m.vz = jump ? 0 : m.dz / dt;
    this.speedNow = jump ? 0 : dist / dt;
    for (let i = 0; i < this.parts.length; i++) {
      const part = this.parts[i];
      if (!part.shape) continue;
      this.placePart(part);
      this.level.world.update(part.shape.id);
    }
    this.carryAttached(ox, oy, oz, m.dyaw);
  }

  /** Unterobjekte (spec.attach = id) mitnehmen: Lage, Gier, Kollisionsformen. */
  carryAttached(ox, oy, oz, dyaw) {
    const L = this.level, id = this.spec.id;
    if (!id) return;
    if (this.scanned !== L.entities.length) {
      this.scanned = L.entities.length;
      for (const e of L.entities) if (e !== this && e.spec?.attach === id && !e.removed) this.attached.add(e);
    }
    if (!this.attached.size) return;
    const m = this.mover, c = Math.cos(dyaw), s = Math.sin(dyaw);
    for (const e of this.attached) {
      if (e.removed) { this.attached.delete(e); continue; }
      if (e.carrier) continue;                                  // wird getragen
      // steht auf diesem Fahrzeug: moveWithGravity nimmt es ohnehin mit (sonst doppelt)
      const riding = e.grounded && e.ground?.mover === m;
      const rx = e.pos.x - ox, rz = e.pos.z - oz;
      const nx = this.pos.x + rx * c + rz * s, nz = this.pos.z - rx * s + rz * c;
      const ddx = nx - e.pos.x, ddy = this.pos.y - oy, ddz = nz - e.pos.z;
      if (!riding) { e.pos.x = nx; e.pos.y += ddy; e.pos.z = nz; e.yaw = (e.yaw ?? 0) + dyaw; }
      for (const sid of e.shapes ?? []) {
        const sh = L.world.get(sid);
        if (!sh) continue;
        sh.mover = m;
        if (sh.type === 'cyl') { sh.x += ddx; sh.z += ddz; sh.y0 += ddy; sh.y1 += ddy; }
        else {
          sh.min = [sh.x0 + ddx, sh.y0 + ddy, sh.z0 + ddz];
          sh.max = [sh.x1 + ddx, sh.y1 + ddy, sh.z1 + ddz];
          if (sh.type === 'ramp') sh.low = sh.lowY + ddy;
        }
        L.world.update(sid);
      }
      e.onCarried?.(this, ddx, ddy, ddz, dyaw);
    }
  }

  // ------------------------------------------------------------------ Darstellung

  buildModel() {
    const g = merge(this.geometry());
    const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.05 }));
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData.owned = true;
    const root = new THREE.Group();
    root.add(mesh);
    this.setModel({ root, update: () => {}, dispose: () => { g.dispose(); mesh.material.dispose(); } });
  }

  render() {
    if (!this.model) return;
    this.model.root.position.copy(this.pos);
    this.model.root.rotation.y = this.rot;
  }

  /** Geometrie-Teile (lokal, Ursprung Mitte unten) je Stil. */
  geometry() {
    const { w, h, d } = this.size;
    const col = this.color, acc = this.accent;
    const G = [];
    const B = (bw, bh, bd, x, y, z, c, o = {}) => G.push(box(bw, bh, bd, x, y + bh / 2, z, c, { r: o.r ?? 0.08, seg: o.seg ?? 1, topColor: o.top }));
    const wheels = (r, xs, zs, c = 0x2f2c38, hub = 0xd8d8e0) => { for (const x of xs) for (const z of zs) G.push(wheel(r, 0.3, x, r, z, c, hub)); };
    if (this.spec.deck !== false) {
      switch (this.style) {
        case 'tank': {
          // Ketten links/rechts, Wanne, Deck mit Nietenreihe, Bug-Schräge (nur Optik)
          for (const sx of [-1, 1]) {
            B(0.9, 1.0, d, sx * (w / 2 - 0.45), 0, 0, 0x34303e, { r: 0.35 });
            for (let i = 0; i < Math.max(3, Math.round(d / 1.6)); i++) G.push(wheel(0.36, 0.95, sx * (w / 2 - 0.45), 0.5, -d / 2 + 0.9 + i * ((d - 1.8) / Math.max(2, Math.round(d / 1.6) - 1)), 0x55506a, 0x9a94b0));
          }
          B(w - 1.6, h - 0.55, d - 0.4, 0, 0.45, 0, col, { r: 0.18 });
          B(w, 0.35, d, 0, h - 0.35, 0, col, { top: mixHex(col, 0xffffff, 0.25), r: 0.12 });
          for (let i = 0; i < Math.round(d / 1.2); i++) for (const sx of [-1, 1]) B(0.14, 0.06, 0.14, sx * (w / 2 - 0.25), h, -d / 2 + 0.6 + i * 1.2, acc, { r: 0.03, seg: 0 });
          B(w - 0.8, 0.5, 0.5, 0, h - 0.85, -d / 2 - 0.15, mixHex(col, 0x000000, 0.25), { r: 0.15 });
          break;
        }
        case 'wagon': {
          const r = 0.42;
          wheels(r, [-w / 2 + 0.4, w / 2 - 0.4], [-d / 2 + 1.2, -d / 2 + 2.2, d / 2 - 2.2, d / 2 - 1.2]);
          B(w - 0.6, 0.3, d - 0.4, 0, 0.55, 0, 0x3a3644);
          B(w, h - 0.85 - 0.3, d, 0, 0.85, 0, col, { r: 0.1 });
          // Längsbretter (dunkle Fugen)
          for (let i = 1; i < Math.round(d / 1.5); i++) for (const sx of [-1, 1]) B(0.04, h - 1.4, 0.08, sx * (w / 2 + 0.01), 1.05, -d / 2 + i * 1.5, mixHex(col, 0x000000, 0.35), { r: 0, seg: 0 });
          B(w + 0.2, 0.3, d + 0.2, 0, h - 0.3, 0, mixHex(col, 0xffffff, 0.15), { top: 0xe8e2d4, r: 0.12 });
          for (const sz of [-1, 1]) B(0.5, 0.35, 0.5, 0, 0.65, sz * (d / 2 + 0.2), acc, { r: 0.1 });
          break;
        }
        case 'flat': {
          const r = 0.36;
          wheels(r, [-w / 2 + 0.35, w / 2 - 0.35], [-d / 2 + 1, -d / 2 + 1.9, d / 2 - 1.9, d / 2 - 1]);
          B(w - 0.6, 0.25, d - 0.6, 0, h - 0.7, 0, 0x3a3644);
          B(w, 0.45, d, 0, h - 0.45, 0, col, { top: acc, r: 0.1 });
          break;
        }
        case 'fence': {
          // Rahmen + Gitter (Kettenzaun), darunter ein Laufrahmen
          const t = 0.3;
          for (const sx of [-1, 1]) B(0.22, t, d, sx * (w / 2 - 0.11), h - t, 0, acc, { r: 0.08 });
          for (const sz of [-1, 1]) B(w, t, 0.22, 0, h - t, sz * (d / 2 - 0.11), acc, { r: 0.08 });
          const n = Math.max(2, Math.round(w / 0.5));
          for (let i = 1; i < n; i++) B(0.05, 0.05, d - 0.3, -w / 2 + (i * w) / n, h - 0.12, 0, col, { r: 0, seg: 0 });
          const m = Math.max(2, Math.round(d / 0.5));
          for (let i = 1; i < m; i++) B(w - 0.3, 0.05, 0.05, 0, h - 0.1, -d / 2 + (i * d) / m, col, { r: 0, seg: 0 });
          B(w * 0.3, 0.2, d * 0.3, 0, h - t - 0.2, 0, 0x55506a, { r: 0.08 });
          break;
        }
        case 'plain':
          B(w, h - 0.45, d, 0, 0.45, 0, col, { r: 0.12 });
          break;
        default: {
          // Plattformwagen: Fahrgestell mit Drehgestellen, buntes Deck mit heller Einlage, niedrige Bordwand-Leisten
          const r = 0.38;
          wheels(r, [-w / 2 + 0.45, w / 2 - 0.45], [-d / 2 + 1.1, -d / 2 + 2.0, d / 2 - 2.0, d / 2 - 1.1]);
          for (const sz of [-1, 1]) B(w - 1.2, 0.25, 1.6, 0, 0.62, sz * (d / 2 - 1.55), 0x45405a, { r: 0.06 });
          B(w - 0.4, 0.3, d - 0.3, 0, 0.75, 0, 0x5a5468, { r: 0.08 });
          B(w, h - 1.05, d, 0, 1.05, 0, col, { r: 0.12, top: mixHex(col, 0xffffff, 0.2) });
          B(w - 0.8, 0.05, d - 0.8, 0, h, 0, acc, { r: 0.02, seg: 0 });
          for (const sx of [-1, 1]) B(0.12, 0.12, d - 0.2, sx * (w / 2 - 0.08), h, 0, mixHex(col, 0x000000, 0.3), { r: 0.04, seg: 0 });
          for (const sz of [-1, 1]) B(0.36, 0.28, 0.45, 0, 0.8, sz * (d / 2 + 0.18), 0x45405a, { r: 0.08 });
          break;
        }
      }
    }
    for (const p of this.parts) {
      if (!p.extra || p.visible === false) continue;
      const sx = p.max[0] - p.min[0], sy = p.max[1] - p.min[1], sz = p.max[2] - p.min[2];
      const c = hex(p.color, p.climbable ? 0xf0d9a8 : 0xc98a52);
      B(sx, sy, sz, (p.min[0] + p.max[0]) / 2, p.min[1], (p.min[2] + p.max[2]) / 2, c, { r: Math.min(0.12, sy * 0.2) });
      if (p.climbable) {
        // Gitter-Andeutung (Krallen-Kletterwand)
        const n = Math.max(1, Math.round(sx / 0.6));
        for (let i = 1; i < n; i++) B(0.05, sy - 0.1, 0.04, p.min[0] + (i * sx) / n, p.min[1] + 0.05, p.max[2] + 0.01, 0xb8945a, { r: 0, seg: 0 });
      }
    }
    return G;
  }

  info() {
    return {
      id: this.spec.id ?? null, s: +this.s.toFixed(3), x: +this.pos.x.toFixed(3), y: +this.pos.y.toFixed(3), z: +this.pos.z.toFixed(3),
      speed: +this.speedNow.toFixed(3), attached: this.attached.size,
    };
  }

  dispose() {
    this.unstep?.();
    super.dispose();
  }
}

function mixHex(a, b, t) {
  const ca = new THREE.Color(a), cb = new THREE.Color(b);
  return ca.lerp(cb, t).getHex();
}

/** Rad (Achse entlang x), Mittelpunkt x,y,z: Reifen dunkel, Nabe hell. */
function wheel(r, width, x, y, z, tire, hub) {
  const g = new THREE.CylinderGeometry(r, r, width, 14, 1, false);
  g.rotateZ(Math.PI / 2);
  const tc = lin(hex(tire)), hc = lin(hex(hub));
  const out = colorize(g, (p, n, o) => {
    const rr = Math.hypot(p.y, p.z);
    if (Math.abs(n.x) > 0.6 && rr < r * 0.55) mixc(hc, hc, 0, o);
    else mixc(tc, tc, 0, o);
  });
  out.translate(x, y, z);
  return out;
}

export const KINDS = { vehicle: (level, spec) => new Vehicle(level, spec) };
