// Hilfen für die Level 2-3 „Scherenschnittkeller“ und 2-4 „Hügelmühle“ (kein Level: exportiert kein LEVEL, die
// Level-Registry überspringt dieses Modul). Reine Daten-Hilfen wie in Welt 1 plus kleine, level-lokale Szenen:
//
//   hook(pos, fn)            Aufbau-Haken: eine schon brennende Laterne (Deko, Thema shadow mit Licht), deren onLit-
//                            Aktion beim Levelaufbau genau einmal fn(level) ruft (Laterne mit lit: true zündet im
//                            Konstruktor, entities/kinds/lantern.js). Damit bauen die Level ihre Szenen (Krümel,
//                            Vorhänge, Schattensterne, Kaninchen, Untergrund-Licht) ohne eigenen Baustein.
//   Kruemel                  Krümel (Pflaumes kleiner Freund, Modell 'kruemel'): winkt, hoppelt davon, zittert vor der
//                            Holz-Silhouette, jubelt und bedankt sich mit einer Sprechblase.
//   shadowStars(level, idx)  Sterne, die man nur als Schatten sieht: Modell unsichtbar (der Schatten auf der
//                            Schattenwand bleibt), funkelt erst, wenn eine Figur ganz nah ist.
//   curtain / valance / footlights / carpet / bake   statische Theater-Kulisse (wird mit dem Abschnitt verschmolzen)
//   planks / cage            Dielenboden (Mühlenkeller 2-4), schlichter Goldkäfig (Münzkäfig 2-3), statisch
//   windmill                 Windmühle mit drehenden Flügeln (2-4)
//   cullShadowWalls          Schatten der Schattenwände nur zeichnen, wenn die Wand im Blickfeld ist
//   Hopper                   Deko-Kaninchen am Rand (hoppeln umher, flüchten vor der Figur)
//   dimZone(level, opts)     Licht dämpfen, solange die Figur in einem Bereich ist (Untergrund 2-4)
// Logik läuft im Simulationstakt (level.onStep, deterministisch), Darstellung je Bild (view.add-Update).

import * as THREE from 'three';
import { box, merge, colorize, lin, mixc, smooth, hex, addStatic, addObject } from '../../blocks/kit.js';
import { bakeModel, figures } from '../../blocks/w2kit.js';
import { getModel } from '../../models/index.js';

export { isl, lawn, line, ring, arc, column, deco, decoW1, fence } from '../w1/_helpers.js';

const TAU = Math.PI * 2;
const HERO_NAME = { lotti: 'Lotti', greta: 'Greta' };

/**
 * Früherer Aufbau-Haken: brennende Laterne bei pos, ruft fn(level) beim Levelaufbau. Heute offiziell: `LEVEL.build`
 * (Präzisierung „Leistung und Level-Haken 2“); `hookLamp(pos)` ist dieselbe Laterne ohne Haken (Bild unverändert).
 */
export const hook = (pos, fn) => ({ kind: 'lantern', pos, lit: true, radius: 0.1, onLit: (level) => fn(level) });
export const hookLamp = (pos) => ({ kind: 'lantern', pos, lit: true, radius: 0.1 });

/** Nächste lebende Figur und ihr waagerechter Abstand zu (x, z). */
function nearest(level, x, z) {
  let best = null, bd = Infinity;
  for (const p of figures(level)) {
    if (!p || p.dead || p.removedFigure) continue;
    const d = Math.hypot(p.pos.x - x, p.pos.z - z);
    if (d < bd) { bd = d; best = p; }
  }
  return { p: best, d: bd };
}

// ------------------------------------------------------------------ Sprechblase (Leinwand-Sprite)

function bubbleSprite(text, sub) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  const r = 46;
  g.fillStyle = '#fffaf0'; g.strokeStyle = '#5a2a1a'; g.lineWidth = 10;
  g.beginPath();
  g.moveTo(30 + r, 20); g.lineTo(482 - r, 20); g.quadraticCurveTo(482, 20, 482, 20 + r); g.lineTo(482, 180 - r);
  g.quadraticCurveTo(482, 180, 482 - r, 180); g.lineTo(290, 180); g.lineTo(240, 238); g.lineTo(236, 180); g.lineTo(30 + r, 180);
  g.quadraticCurveTo(30, 180, 30, 180 - r); g.lineTo(30, 20 + r); g.quadraticCurveTo(30, 20, 30 + r, 20); g.closePath();
  g.fill(); g.stroke();
  g.fillStyle = '#5a2a1a'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'bold 62px "Nunito", "Arial Rounded MT Bold", Arial, sans-serif';
  g.fillText(text, 256, sub ? 82 : 100);
  if (sub) { g.font = 'bold 34px "Nunito", "Arial Rounded MT Bold", Arial, sans-serif'; g.fillStyle = '#d0402a'; g.fillText(sub, 256, 142); }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
  sp.scale.set(1.9, 0.95, 1);
  sp.renderOrder = 12;
  return sp;
}

// ------------------------------------------------------------------ Krümel

/**
 * Krümel als Figur in der Szene. opts: { pos, yaw (Blick, Standard zur Kamera), mode: 'wave' | 'scared',
 * flee: [[x, y, z], …] (wave: hoppelt bei Annäherung diesen Weg entlang und verschwindet), near: 3.6 (m),
 * scale: 1.3, help: 'Hilfe!' (scared: Sprechblase bei Annäherung) }.
 * Methoden: rescue(level) – jubelt, bedankt sich („Danke, Lotti!“). Laufzeit: state, x, y, z.
 */
export class Kruemel {
  constructor(level, opts) {
    this.level = level;
    this.o = opts;
    [this.x, this.y, this.z] = opts.pos;
    this.yaw = opts.yaw ?? -Math.PI / 2;
    this.state = opts.mode === 'scared' ? 'scared' : 'idle';
    this.t = 0;
    this.leg = 0;
    this.hopT = 0;
    this.bubbleT = 0;
    this.bubbleText = null;
    this.visible = true;
    this.near = opts.near ?? 3.6;
    level.onStep((dt) => this.step(dt));
    if (!level.view) return;
    this.model = getModel('kruemel');
    this.root = new THREE.Group();
    this.root.add(this.model.root);
    this.model.root.scale.setScalar(opts.scale ?? 1.3);
    addObject(level, this.root, (dt) => this.render(dt));
    this.shadowPos = new THREE.Vector3(this.x, this.y, this.z);
    level.view.shadows.add({ pos: this.shadowPos, radius: 0.32, alive: () => true, visible: () => this.visible });
  }

  say(text, sub, time = 3) {
    if (!this.level.view) return;
    if (this.bubble && this.bubbleText !== text + sub) { this.root.remove(this.bubble); this.bubble.material.map.dispose(); this.bubble.material.dispose(); this.bubble = null; }
    if (!this.bubble) { this.bubble = bubbleSprite(text, sub); this.bubble.position.set(0, 1.55, 0); this.root.add(this.bubble); }
    this.bubbleText = text + sub;
    this.bubbleT = time;
  }

  rescue() {
    if (this.state === 'cheer') return;
    this.state = 'cheer';
    this.t = 0;
    const p = this.level.player;
    this.say(`Danke, ${HERO_NAME[p?.hero] ?? 'Lotti'}!`, 'Hier, für dich!', 4.5);
    this.level.sfx('victory');
  }

  step(dt) {
    this.t += dt;
    if (this.bubbleT > 0) this.bubbleT -= dt;
    const { p, d } = nearest(this.level, this.x, this.z);
    if (this.state === 'idle' || this.state === 'wave') {
      this.state = d < 8 ? 'wave' : 'idle';
      if (p && d < 8) this.yaw = Math.atan2(-(p.pos.z - this.z), p.pos.x - this.x);
      if (this.o.flee && d < this.near) { this.state = 'flee'; this.leg = 1; this.say('Komm mit!', '', 1.6); this.level.sfx('jump'); }
    } else if (this.state === 'flee') {
      const path = this.o.flee;
      const q = path[Math.min(this.leg, path.length - 1)];
      const dx = q[0] - this.x, dz = q[2] - this.z, l = Math.hypot(dx, dz);
      const v = (this.o.speed ?? 4.2) * dt;
      if (l <= v) {
        this.x = q[0]; this.y = q[1]; this.z = q[2];
        this.leg++;
        if (this.leg >= path.length) { this.state = 'gone'; this.visible = false; }
      } else {
        this.x += (dx / l) * v; this.z += (dz / l) * v; this.y += (q[1] - this.y) * Math.min(1, dt * 6);
        this.yaw = Math.atan2(-dz, dx);
      }
      this.hopT += dt;
    } else if (this.state === 'scared') {
      if (d < (this.o.helpR ?? 9) && this.bubbleT <= 0 && this.o.help) this.say(this.o.help, this.o.helpSub ?? '', 2.4);
    } else if (this.state === 'cheer') {
      if (p) this.yaw = Math.atan2(-(p.pos.z - this.z), p.pos.x - this.x);
    }
  }

  render(dt) {
    if (!this.root) return;
    this.root.visible = this.visible;
    if (!this.visible) return;
    this.root.position.set(this.x, this.y, this.z);
    this.root.rotation.y = this.yaw;
    this.shadowPos.set(this.x, this.y, this.z);
    const anim = this.state === 'flee' ? 'hop' : this.state === 'wave' ? 'cheer' : this.state === 'scared' ? 'scared' : this.state === 'cheer' ? 'cheer' : 'idle';
    this.model.update(Math.min(0.1, dt), { anim });
    if (this.bubble) {
      this.bubble.visible = this.bubbleT > 0;
      this.bubble.rotation.y = 0;
      // Sprechblase bleibt aufrecht über Krümel (Sprite), leicht wippend
      this.bubble.position.y = 1.55 + Math.sin(this.t * 3) * 0.04;
    }
  }
}

// ------------------------------------------------------------------ Schattensterne

/**
 * Sterne mit den Indizes idx bleiben unsichtbar (nur ihr Schatten erscheint auf der Schattenwand); ist eine Figur
 * näher als near m, funkeln sie auf. Auch für versteckte Sterne, die später per reveal erscheinen.
 */
export function shadowStars(level, idx, near = 2.2) {
  if (!level.view) return;
  const set = new Set(idx);
  level.view.onFrame(() => {
    for (const e of level.entities) {
      if (e.kind !== 'star' || !set.has(e.index) || !e.model) continue;
      const { d } = nearest(level, e.pos.x, e.pos.z);
      const dy = Math.abs((level.player?.pos.y ?? 0) - e.pos.y);
      const show = !e.hidden && d < near && dy < 3;
      e.model.root.visible = show;
    }
  });
}

// ------------------------------------------------------------------ Schattenwände sparsam zeichnen

/**
 * Die Schatten-Instanzen der Schattenwände (Baustein schattenwand) sind nicht frustum-gekappt und würden in jedem
 * Bild gezeichnet, auch wenn die Wand weit hinter der Kamera liegt. Dieser Haken blendet sie aus, solange die Wand
 * (Rechteck aus den vier Schnittebenen, z aus der Lage der Schatten) nicht im Blickfeld ist. Nur Darstellung; muss
 * nach den Schattenwänden angemeldet werden (Aufbau-Haken unter items läuft nach den segments).
 */
export function cullShadowWalls(level) {
  const view = level.view;
  if (!view) return;
  const frustum = new THREE.Frustum(), pm = new THREE.Matrix4(), bb = new THREE.Box3(), m4 = new THREE.Matrix4();
  let walls = null;
  const collect = () => {
    const byMat = new Map();
    for (const o of view.three.children) {
      if (!o.isInstancedMesh || o.material?.clippingPlanes?.length !== 4) continue;
      if (!byMat.has(o.material)) byMat.set(o.material, []);
      byMat.get(o.material).push(o);
    }
    walls = [...byMat.entries()].map(([mat, meshes]) => {
      const P = mat.clippingPlanes;
      return { meshes, x0: -P[0].constant, x1: P[1].constant, y0: -P[2].constant, y1: P[3].constant, z: null };
    });
  };
  view.onFrame(() => {
    if (!walls) collect();
    view.camera.updateMatrixWorld();
    pm.multiplyMatrices(view.camera.projectionMatrix, view.camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(pm);
    for (const w of walls) {
      if (w.z === null) {
        for (const im of w.meshes) if (im.count > 0) { im.getMatrixAt(0, m4); w.z = m4.elements[14]; break; }
        if (w.z === null) continue;
      }
      bb.min.set(w.x0, w.y0, w.z - 0.5); bb.max.set(w.x1, w.y1, w.z + 0.5);
      if (!frustum.intersectsBox(bb)) for (const im of w.meshes) im.visible = false;
    }
  });
}

// ------------------------------------------------------------------ Theater-Kulisse (statisch)

const FLAT = { r: 0, seg: 0 };          // schlichte Quader (12 Dreiecke)
const RED = 0xb8142a, RED_HI = 0xe8384a, RED_LO = 0x5a0812, GOLD = 0xffc83a, GOLD_LO = 0xa8701a;

/**
 * Bühnenvorhang (gerafft oder hängend) als statische Geometrie. Fläche in einer senkrechten Ebene:
 * axis 'x' (Standard: Ebene XY, Vorderseite +Z) oder 'z' (Ebene ZY, Vorderseite +X bzw. −X mit flip).
 * pos = Mitte der Unterkante, w = Breite, h = Höhe; folds (Faltenzahl), color, tie (Raffhöhe 0..1 oder 0), side
 * ('left'|'right': gerafft zur Seite).
 */
export function curtain(level, o) {
  if (!level.view) return;
  const [x, y, z] = o.pos;
  const w = o.w ?? 2, h = o.h ?? 5;
  const folds = o.folds ?? Math.max(3, Math.round(w * 2.2));
  const nx = folds * 3, ny = 6;
  const g = new THREE.PlaneGeometry(1, 1, nx, ny);
  const pos = g.attributes.position;
  const tie = o.tie ?? 0;
  const side = o.side === 'right' ? 1 : -1;
  for (let i = 0; i < pos.count; i++) {
    let u = pos.getX(i) + 0.5, v = pos.getY(i) + 0.5;           // u 0..1 quer, v 0..1 hoch
    // Raffung: unterhalb der Raffhöhe zur Seite zusammengezogen (Sanduhr-Form)
    if (tie > 0) {
      // Sanduhr-Form: oben volle Breite, an der Kordel (Höhe tie) eng, unten wieder etwas breiter
      const s = v >= tie ? 0.3 + 0.7 * smooth(0, 1, (v - tie) / Math.max(0.01, 1 - tie)) : 0.3 + 0.42 * Math.pow((tie - v) / tie, 1.4);
      u = side < 0 ? u * s : 1 - (1 - u) * s;
    }
    const depth = Math.sin(u * folds * TAU) * 0.12 * (0.6 + 0.4 * v);
    pos.setXYZ(i, (u - 0.5) * w, v * h, depth);
  }
  g.computeVertexNormals();
  const geo = g.toNonIndexed();
  g.dispose();
  const base = lin(hex(o.color ?? RED)), hi = lin(hex(o.hi ?? RED_HI)), lo = lin(hex(o.lo ?? RED_LO));
  colorize(geo, (p, n, out) => {
    const k = n.z;                          // Faltenlicht
    if (k > 0.85) mixc(base, hi, smooth(0.85, 1, k), out); else mixc(lo, base, smooth(0.2, 0.85, k), out);
    const v = p.y / h;
    const s = 0.75 + 0.25 * v;              // unten etwas dunkler
    out[0] *= s; out[1] *= s; out[2] *= s;
  });
  const parts = [geo];
  // goldene Borte unten und Raffkordel
  const bw = tie > 0 ? 0.72 : 1;
  parts.push(box(w * bw, 0.12, 0.08, tie > 0 ? side * (w / 2 - w * bw / 2) : 0, 0.06, 0.1, GOLD, FLAT));
  if (tie > 0) {
    const tx = side * (w / 2 - w * 0.15);
    parts.push(box(w * 0.42, 0.1, 0.24, tx, h * tie, 0.14, GOLD, FLAT));
    const tassel = new THREE.ConeGeometry(0.1, 0.32, 8).toNonIndexed();
    tassel.translate(tx - side * w * 0.2, h * tie - 0.22, 0.2);
    colorize(tassel, (p, n, out) => mixc(lin(hex(GOLD_LO)), lin(hex(GOLD)), smooth(-0.4, 0.4, n.y), out));
    parts.push(tassel);
  }
  const m = merge(parts);
  if (o.axis === 'z') m.rotateY(o.flip ? -Math.PI / 2 : Math.PI / 2);
  else if (o.flip) m.rotateY(Math.PI);
  m.translate(x, y, z);
  addStatic(level, m);
}

/** Schabracke (Querbehang mit Goldfransen) über einer Öffnung: pos = Mitte der Unterkante, w, h (0.9). */
export function valance(level, o) {
  if (!level.view) return;
  const [x, y, z] = o.pos;
  const w = o.w ?? 6, h = o.h ?? 0.9;
  const parts = [];
  const n = Math.max(3, Math.round(w / 1.2));
  for (let i = 0; i < n; i++) {
    const cx = x - w / 2 + (i + 0.5) * (w / n);
    const sw = new THREE.SphereGeometry(1, 8, 3, 0, TAU, 0, Math.PI / 2).toNonIndexed();
    sw.scale(w / n / 2 * 1.04, -h * 0.55, 0.22);
    sw.translate(cx, y + h * 0.55, z);
    colorize(sw, (p, nn, out) => mixc(lin(hex(RED_LO)), lin(hex(RED_HI)), smooth(-0.2, 0.9, nn.z), out));
    parts.push(sw);
    parts.push(box(0.09, 0.22, 0.09, cx, y - 0.02, z + 0.12, GOLD, FLAT));
  }
  parts.push(box(w + 0.3, h * 0.5, 0.36, x, y + h * 0.78, z, RED, { ...FLAT, topColor: RED_HI }));
  parts.push(box(w + 0.4, 0.12, 0.42, x, y + h * 0.52, z + 0.02, GOLD, FLAT));
  parts.push(box(w + 0.4, 0.12, 0.42, x, y + h * 1.04, z + 0.02, GOLD, FLAT));
  const m = merge(parts);
  if (o.axis === 'z') { m.translate(-x, 0, -z); m.rotateY(o.flip ? -Math.PI / 2 : Math.PI / 2); m.translate(x, 0, z); }
  addStatic(level, m);
}

/** Rampenlichter: Reihe kleiner Leuchtkuppeln mit Messingschirm entlang x0..x1 auf Höhe y bei z. */
export function footlights(level, x0, x1, y, z, step = 1.6) {
  if (!level.view) return;
  const glow = [], body = [];
  for (let x = x0 + step / 2; x <= x1; x += step) {
    const b = new THREE.SphereGeometry(0.14, 6, 2, 0, TAU, 0, Math.PI / 2).toNonIndexed();
    b.translate(x, y + 0.02, z);
    colorize(b, (p, n, out) => mixc(lin(0xffb040), lin(0xfff6d0), smooth(0, 1, n.y), out));
    glow.push(b);
    body.push(box(0.42, 0.12, 0.24, x, y + 0.06, z + 0.12, 0xc8902a, { ...FLAT, topColor: 0xffd060 }));
  }
  addStatic(level, merge(glow), { material: 'glow' });
  addStatic(level, merge(body));
}

/** Roter Teppich (Läufer) mit Goldkante: Rechteck x0..x1 × zA..zB auf Höhe y. */
export function carpet(level, x0, x1, zA, zB, y, color = 0xa8182a) {
  if (!level.view) return;
  const z0 = Math.min(zA, zB), z1 = Math.max(zA, zB);
  const w = x1 - x0, d = z1 - z0;
  const parts = [box(w, 0.04, d, (x0 + x1) / 2, y + 0.02, (z0 + z1) / 2, color, { ...FLAT, topColor: color })];
  parts.push(box(0.12, 0.05, d, x0 + 0.12, y + 0.025, (z0 + z1) / 2, GOLD, FLAT));
  parts.push(box(0.12, 0.05, d, x1 - 0.12, y + 0.025, (z0 + z1) / 2, GOLD, FLAT));
  addStatic(level, merge(parts));
}

/**
 * Dielenboden (Mühlenkeller): versetzt gestoßene Bretter längs z (o.along 'x': längs x) auf einer dunklen Unterlage,
 * Rechteck x0..x1 × zA..zB auf Höhe y (nur Optik, 2 cm stark – Kreisschatten liegen darüber).
 * o.skip: [[x0, x1, z0, z1], …] bleibt frei (z. B. Farbfelder); o.colors: Brettfarben.
 */
export function planks(level, x0, x1, zA, zB, y, o = {}) {
  if (!level.view) return;
  const z0 = Math.min(zA, zB), z1 = Math.max(zA, zB);
  const alongZ = (o.along ?? 'z') === 'z';
  const W = o.w ?? 0.64, GAP = 0.05, CUT = 0.06, LEN = o.len ?? 3.4;
  const cols = o.colors ?? [0x8a5a34, 0x7a4c2a, 0x966438, 0x6e4426, 0x845530];
  const skip = o.skip ?? [];
  const free = (ax, az, bx, bz) => !skip.some(([sx0, sx1, sz0, sz1]) => ax < sx1 && bx > sx0 && az < sz1 && bz > sz0);
  const parts = [];
  const pushBox = (ax, bx, az, bz, yy, h, c) => {
    if (bx - ax < 0.05 || bz - az < 0.05 || !free(ax, az, bx, bz)) return;
    parts.push(box(bx - ax, h, bz - az, (ax + bx) / 2, yy + h / 2, (az + bz) / 2, c, { ...FLAT, topColor: c }));
  };
  const A0 = alongZ ? x0 : z0, A1 = alongZ ? x1 : z1, L0 = alongZ ? z0 : x0, L1 = alongZ ? z1 : x1;
  let i = 0;
  for (let a = A0; a < A1 - 0.1; a += W, i++) {
    const a1 = Math.min(a + W, A1) - GAP / 2, a0 = a + GAP / 2;
    let l = L0, k = 0;
    let next = L0 + 0.8 + ((i * 1.37) % 1) * (LEN - 0.8);          // erste Stoßfuge versetzt
    while (l < L1 - 0.05) {
      const e = Math.min(next, L1);
      const c = cols[(i * 3 + k * 2 + (i >> 1)) % cols.length];
      // Brett an freien Bereichen kappen (längs teilen)
      let segs = [[l + CUT / 2, e - CUT / 2]];
      for (const [sx0, sx1, sz0, sz1] of skip) {
        const [c0, c1, d0, d1] = alongZ ? [sx0, sx1, sz0, sz1] : [sz0, sz1, sx0, sx1];
        if (a1 <= c0 || a0 >= c1) continue;
        segs = segs.flatMap(([s0, s1]) => (s1 <= d0 || s0 >= d1 ? [[s0, s1]] : [[s0, Math.min(s1, d0)], [Math.max(s0, d1), s1]]));
      }
      for (const [s0, s1] of segs) {
        if (alongZ) pushBox(a0, a1, s0, s1, y + 0.01, 0.012, c);
        else pushBox(s0, s1, a0, a1, y + 0.01, 0.012, c);
      }
      l = e; next = e + LEN; k++;
    }
  }
  // dunkle Unterlage (Fugen), um die freien Bereiche herum gestückelt
  const base = o.gap ?? 0x3a2414;
  const edgesX = [x0, x1, ...skip.flatMap((s) => [s[0], s[1]])].filter((v) => v >= x0 && v <= x1).sort((p, q) => p - q);
  const edgesZ = [z0, z1, ...skip.flatMap((s) => [s[2], s[3]])].filter((v) => v >= z0 && v <= z1).sort((p, q) => p - q);
  for (let xi = 0; xi < edgesX.length - 1; xi++) {
    for (let zi = 0; zi < edgesZ.length - 1; zi++) pushBox(edgesX[xi], edgesX[xi + 1], edgesZ[zi], edgesZ[zi + 1], y, 0.01, base);
  }
  if (parts.length) addStatic(level, merge(parts));
}

/**
 * Mühlenkeller-Ausbau (statisch, nur Optik): Holzpfosten vor den Seitenwänden (x = xs[0] bzw. xs[1], Pfosten bei den
 * z-Werten posts) mit Längsbalken und Kopfbändern; Mehlsäcke als kleine Stapel sacks: [[x, z, yaw, n]].
 * o: { xs: [xLinks, xRechts], y (Boden), h (5.4), posts: [z…], sacks }
 */
export function millCellar(level, o) {
  if (!level.view) return;
  const y = o.y, h = o.h ?? 5.4;
  const WOOD = 0x7a4a26, WOOD_HI = 0x9a6234, parts = [];
  const zs = o.posts ?? [];
  if (zs.length) {
    const zMin = Math.min(...zs), zMax = Math.max(...zs);
    for (const x of o.xs ?? []) {
      const inward = x < 0 ? 0.2 : -0.2;
      for (const z of zs) {
        parts.push(box(0.36, h, 0.36, x, y + h / 2, z, WOOD, { ...FLAT, topColor: WOOD_HI }));
        parts.push(box(0.5, 0.18, 0.5, x, y + 0.09, z, 0x5a3418, FLAT));        // Fußplatte
        for (const s of [-1, 1]) {                                               // Kopfbänder zum Längsbalken
          const g = box(0.16, 1.5, 0.16, 0, 0, 0, WOOD, FLAT);
          g.rotateX(s * 0.72);
          g.translate(x + inward * 0.2, y + h - 0.75, z + s * 0.5);
          parts.push(g);
        }
      }
      parts.push(box(0.42, 0.42, zMax - zMin + 2.4, x, y + h + 0.1, (zMin + zMax) / 2, WOOD, { ...FLAT, topColor: WOOD_HI }));
    }
  }
  const sackBase = lin(0xe0c490), sackHi = lin(0xfff6e0), tie = lin(0xa0602a);
  for (const [sx, sz, yaw = 0, n = 3] of o.sacks ?? []) {
    const spots = [[0, 0, 0], [0.62, 0, 0.1], [0.3, 0.62, -0.05], [-0.5, 0, 0.35]].slice(0, n);
    for (const [dx, dy, dz] of spots) {
      const sack = new THREE.SphereGeometry(1, 7, 5).toNonIndexed();
      sack.scale(0.34, 0.42, 0.3);
      sack.translate(dx, 0.4 + dy, dz);
      colorize(sack, (p, nn, out) => mixc(sackBase, sackHi, smooth(-0.3, 0.9, nn.y * 0.7 + nn.z * 0.3), out));
      const neck = new THREE.ConeGeometry(0.1, 0.22, 5).toNonIndexed();
      neck.translate(dx, 0.86 + dy, dz);
      colorize(neck, (p, nn, out) => { out[0] = tie[0]; out[1] = tie[1]; out[2] = tie[2]; });
      for (const g of [sack, neck]) { g.rotateY(yaw); g.translate(sx, y, sz); parts.push(g); }
    }
  }
  if (parts.length) addStatic(level, merge(parts));
}

/**
 * Schlichter Goldkäfig (statisch, ≈ 900 Dreiecke): Sockel, Stäbe, Bügelkuppel, Vorhängeschloss.
 * o: { pos (Fußpunkt), r (0.72), h (Stablänge 1.35), yaw (Schloss zeigt nach +X, gedreht um yaw) }.
 */
export function cage(level, o) {
  if (!level.view) return;
  const [x, y, z] = o.pos;
  const r = o.r ?? 0.72, h = o.h ?? 1.35;
  const gold = lin(hex(GOLD)), goldLo = lin(hex(GOLD_LO));
  const shade = (g, a, b) => { colorize(g, (p, n, out) => mixc(a, b, smooth(-0.6, 0.8, n.y * 0.6 + n.z * 0.4), out)); return g; };
  const parts = [];
  const sock = new THREE.CylinderGeometry(r + 0.2, r + 0.26, 0.32, 14).toNonIndexed();
  sock.translate(0, 0.16, 0);
  parts.push(shade(sock, lin(0x5a2a6a), lin(0xa05ab0)));
  for (const yy of [0.36, 0.36 + h]) {
    const ringG = new THREE.TorusGeometry(r, 0.045, 4, 18).toNonIndexed();
    ringG.rotateX(Math.PI / 2); ringG.translate(0, yy, 0);
    parts.push(shade(ringG, goldLo, gold));
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const bar = new THREE.CylinderGeometry(0.03, 0.03, h, 4, 1, true).toNonIndexed();
    bar.translate(Math.cos(a) * r, 0.36 + h / 2, Math.sin(a) * r);
    parts.push(shade(bar, goldLo, gold));
  }
  for (let i = 0; i < 3; i++) {
    const arcG = new THREE.TorusGeometry(r, 0.035, 4, 10, Math.PI).toNonIndexed();
    arcG.rotateY((i / 3) * Math.PI); arcG.translate(0, 0.36 + h, 0);
    parts.push(shade(arcG, goldLo, gold));
  }
  const loop = new THREE.TorusGeometry(0.14, 0.035, 4, 10).toNonIndexed();
  loop.translate(0, 0.36 + h + r + 0.1, 0);
  parts.push(shade(loop, goldLo, gold));
  parts.push(box(0.22, 0.24, 0.14, r + 0.06, 0.36 + h * 0.5, 0, 0xffd84a, FLAT));
  const shackle = new THREE.TorusGeometry(0.07, 0.022, 4, 8, Math.PI).toNonIndexed();
  shackle.rotateY(Math.PI / 2); shackle.translate(r + 0.06, 0.36 + h * 0.5 + 0.12, 0);
  parts.push(shade(shackle, lin(0x8890a0), lin(0xc8d0dc)));
  const m = merge(parts);
  m.rotateY(o.yaw ?? 0);
  m.translate(x, y, z);
  addStatic(level, m);
}

/** Mehrere Registry-Modelle in die statische Kulisse verschmelzen: [{ name, pos, yaw?, scale?, opts?, state? }]. */
export function bake(level, list) {
  for (const it of list) {
    const [x, y, z] = it.pos;
    try { bakeModel(level, it.name, it.opts ?? {}, x, y, z, it.yaw ?? 0, it.scale ?? 1, it.state ?? {}); }
    catch (err) { console.error(`[Kulisse] ${it.name}:`, err); }
  }
}

/** Animiertes Registry-Modell (eigenes Objekt, z. B. pendelnder Kronleuchter, Kerzen): { name, pos, yaw, scale, opts, state }. */
export function prop(level, it) {
  if (!level.view) return null;
  const m = getModel(it.name, it.opts ?? {});
  const [x, y, z] = it.pos;
  m.root.position.set(x, y, z);
  m.root.rotation.y = it.yaw ?? 0;
  if (it.scale) m.root.scale.setScalar(it.scale);
  const st = it.state ?? {};
  addObject(level, m.root, (dt) => m.update?.(Math.min(0.1, dt), st));
  m.update?.(0, st);
  return m;
}

// ------------------------------------------------------------------ Windmühle (2-4 „Hügelmühle“)

/**
 * Windmühle: weißer, sich verjüngender Turm mit Fachwerk-Bändern, rotem Kegeldach, Tür und Fenstern (statisch,
 * fester Zylinder) und vier Flügeln mit Gitter-Segeln, die sich drehen (ein Objekt). pos = Fußpunkt, h = Turmhöhe,
 * yaw = Blickrichtung der Flügel (Standard zur Kamera +Z), speed (rad/s).
 */
export function windmill(level, o) {
  const [x, y, z] = o.pos;
  const h = o.h ?? 7, r0 = o.r ?? 2.2, r1 = r0 * 0.68;
  const yaw = o.yaw ?? 0;
  level.world.add({ type: 'cyl', x, z, r: r0 * 0.92, y0: y, y1: y + h, tag: 'windmuehle' });
  if (!level.view) return;
  const W = 0xf6efe0, BEAM = 0x8a5a32, ROOF = 0xd8402a, ROOF_HI = 0xff7a4a;
  const parts = [];
  const tower = new THREE.CylinderGeometry(r1, r0, h, 10, 1).toNonIndexed();
  tower.translate(0, h / 2, 0);
  colorize(tower, (p, n, out) => {
    const band = Math.abs(((p.y / h) * 3) % 1 - 0.5) < 0.04;          // Fachwerk-Bänder
    mixc(lin(hex(W)), lin(hex(0xd8d0c0)), smooth(0.3, -0.6, n.x * 0.6 + n.z * 0.4), out);
    if (band) { const b = lin(hex(BEAM)); out[0] = b[0]; out[1] = b[1]; out[2] = b[2]; }
  });
  parts.push(tower);
  const roof = new THREE.ConeGeometry(r1 * 1.3, h * 0.42, 10, 1).toNonIndexed();
  roof.translate(0, h + h * 0.21, 0);
  colorize(roof, (p, n, out) => mixc(lin(hex(ROOF)), lin(hex(ROOF_HI)), smooth(0, 1, n.y * 0.5 + n.z * 0.5), out));
  parts.push(roof);
  parts.push(box(1.0, 1.7, 0.2, 0, 0.85, r0 * 0.95, 0x6a3a1e, { ...FLAT, topColor: 0x8a5a32 }));          // Tür
  for (const [wy, wx] of [[h * 0.45, 0.55], [h * 0.45, -0.55], [h * 0.72, 0]]) {
    parts.push(box(0.5, 0.6, 0.12, wx, wy, (r0 + (r1 - r0) * (wy / h)) * 0.98, 0x3a6ab8, { ...FLAT, topColor: 0x8ac0ff }));
  }
  parts.push(box(0.5, 0.5, 0.6, 0, h * 0.86, r1 * 1.05, BEAM, FLAT));                                          // Achslager
  const g = merge(parts);
  g.rotateY(yaw);
  g.translate(x, y, z);
  addStatic(level, g);
  // Flügel (drehen sich)
  const blades = [];
  const L = h * 0.82;
  for (let i = 0; i < 4; i++) {
    const arm = [box(0.22, L, 0.16, 0, L / 2, 0, BEAM, FLAT)];
    for (let k = 1; k <= 5; k++) arm.push(box(0.9, 0.08, 0.06, 0.5, L * (0.15 + k * 0.16), 0, 0xc8a06a, FLAT));
    arm.push(box(0.9, L * 0.8, 0.03, 0.55, L * 0.58, 0.04, 0xfff6e8, FLAT));
    const a = merge(arm);
    a.rotateZ((i * Math.PI) / 2);
    blades.push(a);
  }
  const hub = new THREE.CylinderGeometry(0.32, 0.32, 0.4, 10).toNonIndexed();
  hub.rotateX(Math.PI / 2);
  colorize(hub, (p, n, out) => mixc(lin(hex(0x8a5a32)), lin(hex(0xffc83a)), smooth(0, 1, n.z), out));
  blades.push(hub);
  const mesh = new THREE.Mesh(merge(blades), level.view.mats.world);
  mesh.castShadow = true;
  const holder = new THREE.Group();
  holder.position.set(x + Math.sin(yaw) * (r1 * 1.05 + 0.45), y + h * 0.86, z + Math.cos(yaw) * (r1 * 1.05 + 0.45));
  holder.rotation.y = yaw;
  holder.add(mesh);
  const speed = o.speed ?? 0.6;
  addObject(level, holder, (dt) => { mesh.rotation.z -= speed * Math.min(0.1, dt); });
}

// ------------------------------------------------------------------ Deko-Kaninchen

/**
 * Kaninchen am Rand (2-4): hoppelt in einem Bereich umher, flüchtet vor nahen Figuren (bleibt im Bereich).
 * opts: { pos: [x, y, z] (Mitte), r: 3 (Bereich), y (Bodenhöhe = pos.y), scale: 1.1, seed }
 */
export class Hopper {
  constructor(level, opts) {
    this.level = level;
    [this.cx, this.y, this.cz] = opts.pos;
    this.r = opts.r ?? 3;
    this.x = this.cx; this.z = this.cz;
    this.tx = this.x; this.tz = this.z;
    this.yaw = opts.yaw ?? -Math.PI / 2;
    this.seed = opts.seed ?? 1;
    this.wait = 0.5 + (this.seed % 5) * 0.3;
    this.moving = false;
    level.onStep((dt) => this.step(dt));
    if (!level.view) return;
    this.model = getModel('bunny_small');
    this.model.root.scale.setScalar(opts.scale ?? 1.1);
    this.model.root.traverse((o) => { if (o.isMesh) o.castShadow = false; });   // Blob-Schatten genügt (spart den Schattenpass)
    addObject(level, this.model.root, (dt) => this.render(dt));
    this.shadowPos = new THREE.Vector3(this.x, this.y, this.z);
    level.view.shadows.add({ pos: this.shadowPos, radius: 0.26, alive: () => true, visible: () => true });
  }

  rnd() { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647; }

  step(dt) {
    const { p, d } = nearest(this.level, this.x, this.z);
    if (this.moving) {
      const dx = this.tx - this.x, dz = this.tz - this.z, l = Math.hypot(dx, dz);
      const v = (this.flee ? 3.6 : 1.6) * dt;
      if (l <= v) { this.x = this.tx; this.z = this.tz; this.moving = false; this.wait = 0.6 + this.rnd() * 1.6; }
      else { this.x += (dx / l) * v; this.z += (dz / l) * v; this.yaw = Math.atan2(-dz, dx); }
      return;
    }
    this.wait -= dt;
    if (p && d < 3.2) {
      // weg von der Figur, aber im Bereich bleiben
      let ax = this.x - p.pos.x, az = this.z - p.pos.z;
      const l = Math.hypot(ax, az) || 1;
      ax /= l; az /= l;
      let tx = this.x + ax * 2.2, tz = this.z + az * 2.2;
      const ox = tx - this.cx, oz = tz - this.cz, ol = Math.hypot(ox, oz);
      if (ol > this.r) { tx = this.cx + (ox / ol) * this.r; tz = this.cz + (oz / ol) * this.r; }
      this.tx = tx; this.tz = tz; this.moving = true; this.flee = true;
      return;
    }
    if (this.wait <= 0) {
      const a = this.rnd() * TAU, rr = this.r * Math.sqrt(this.rnd());
      this.tx = this.cx + Math.cos(a) * rr; this.tz = this.cz + Math.sin(a) * rr;
      this.moving = true; this.flee = false;
    }
  }

  render(dt) {
    this.model.root.position.set(this.x, this.y, this.z);
    this.model.root.rotation.y = this.yaw;
    this.shadowPos.set(this.x, this.y, this.z);
    this.model.update(Math.min(0.1, dt), { anim: this.moving ? 'hop' : 'idle' });
  }
}

// ------------------------------------------------------------------ Licht je Bereich

/**
 * Licht dämpfen (Untergrund): inside(x, y, z) → true, solange die Haupt-Figur im Bereich ist; dann blenden Himmels-
 * und Sonnenlicht weich auf `hemi`/`sun` (Faktoren), Nebel und Hintergrund auf `fog` (Farbe) über, und der Himmel
 * (Kuppel, Ferne) wird ausgeblendet. Nur Darstellung.
 */
export function dimZone(level, o) {
  const view = level.view;
  if (!view) return;
  const base = { hemi: view.hemi?.intensity ?? 1, sun: view.sun?.intensity ?? 1, bg: view.theme.background };
  const fog = view.three.fog;
  const fog0 = fog ? fog.color.clone() : null;
  const fog1 = new THREE.Color(o.fog ?? 0x1a1420);
  const bg0 = view.three.background?.isColor ? view.three.background.clone() : null;
  let k = 0, snapped = false;
  view.onFrame((dt) => {
    const p = level.player;
    const want = p && o.inside(p.pos.x, p.pos.y, p.pos.z) ? 1 : 0;
    // nach Röhren/Teleport sofort umschalten, sonst weich überblenden
    if (!snapped || Math.abs(want - k) > 0.98) { k = want; snapped = true; }
    k += (want - k) * Math.min(1, (dt || 0.016) * 3.5);
    if (view.hemi) view.hemi.intensity = base.hemi * (1 - (1 - (o.hemi ?? 0.45)) * k);
    if (view.sun) view.sun.intensity = base.sun * (1 - (1 - (o.sun ?? 0.35)) * k);
    if (fog && fog0) fog.color.copy(fog0).lerp(fog1, k);
    // Himmel (Kuppel, Wiese, Hügel, Wolken) im Untergrund ausblenden: dunkler Grund statt grüner Ferne
    if (view.sky?.group) view.sky.group.visible = k < 0.5;
    if (bg0 && view.three.background?.isColor) view.three.background.copy(bg0).lerp(fog1, k);
  });
}
