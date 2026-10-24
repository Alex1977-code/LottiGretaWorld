// Gemeinsame Hilfen der Welt-5-Bausteine (blocks/types/w5_*.js, deco_w5.js, entities/kinds/w5_gimmicks.js). Liegt bewusst
// außerhalb von types/ (die Registry sammelt nur types/*.js).
//
//   landingHint(level, opts)   roter Landeboden-Hinweis (Kippquader, später Kippquader-König): show(rects, y, k),
//                              hide(), info(); rects = [{ x0, z0, x1, z1 }] (Grundrisse), k = Stärke 0..1 (pulsiert)
//   keyHud(level)              HUD-Anzeige „Schlüssel n/N“ (eine je Level; hängt sich an 'CourseUI' wie archetypes/hud.js):
//                              set(group, n, of, done), state()
//   modelOr(name, opts, make)  Registry-Modell, sobald es den Namen gibt (hasModel), sonst make() → { root, update?, dispose? }
//   rot90(axis, sign)          ganzzahlige 90°-Drehung (Matrix4) um eine waagerechte Achse – Kippquader

import * as THREE from 'three';
import Phaser from 'phaser';
import { GAME } from '../../config.js';
import { uiText } from '../../ui.js';
import { hasModel, getModel } from '../models/index.js';
import { addObject } from './kit.js';

// ------------------------------------------------------------------ Modell oder eigene Geometrie

export function modelOr(name, opts, make) {
  if (hasModel(name)) return getModel(name, opts);
  const m = make();
  return { update() {}, dispose() {}, ...m };
}

// ------------------------------------------------------------------ Landeboden-Hinweis

const HINT_N = 8;

/**
 * Roter Landeboden-Hinweis: halbdurchsichtige rote Flächen mit hellem Rand knapp über dem Boden (bis zu 8 Rechtecke je
 * Hinweis, eine InstancedMesh). show(rects, y, k): rects = [{ x0, z0, x1, z1 }], y = Bodenhöhe, k = 0..1 (Deckkraft,
 * pulsiert von selbst schneller, je näher k an 1). hide() blendet aus. Für Kippquader (vor dem Kippen) und den
 * Kippquader-König (Bauplan 5-Burg: „roter Boden zeigt die Landestelle“).
 */
export function landingHint(level, opts = {}) {
  const st = { rects: [], y: 0, k: 0, shown: false, t: 0, color: opts.color ?? 0xff2a2a };
  let mesh = null, edge = null;
  if (level.view) {
    const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2);
    mesh = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: st.color, transparent: true, opacity: 0.4, depthWrite: false }), HINT_N);
    const eg = new THREE.RingGeometry(0.47, 0.5, 4, 1, Math.PI / 4); eg.rotateX(-Math.PI / 2); eg.scale(Math.SQRT2, 1, Math.SQRT2);
    edge = new THREE.InstancedMesh(eg, new THREE.MeshBasicMaterial({ color: 0xffd0c0, transparent: true, opacity: 0.8, depthWrite: false }), HINT_N);
    for (const m of [mesh, edge]) { m.frustumCulled = false; m.renderOrder = 3; m.count = 0; m.castShadow = false; m.receiveShadow = false; }
    const group = new THREE.Group();
    group.name = 'landeboden';
    group.add(mesh, edge);
    const M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
    addObject(level, group, (dt) => {
      st.t += dt;
      const n = st.shown ? Math.min(HINT_N, st.rects.length) : 0;
      mesh.count = edge.count = n;
      if (!n) return;
      const pulse = 0.65 + 0.35 * Math.sin(st.t * (8 + 14 * st.k));
      mesh.material.opacity = (0.18 + 0.4 * st.k) * pulse;
      edge.material.opacity = 0.35 + 0.55 * st.k * pulse;
      for (let i = 0; i < n; i++) {
        const r = st.rects[i];
        P.set((r.x0 + r.x1) / 2, st.y + 0.04 + i * 0.002, (r.z0 + r.z1) / 2); S.set(Math.max(0.05, r.x1 - r.x0), 1, Math.max(0.05, r.z1 - r.z0));
        M.compose(P, Q, S);
        mesh.setMatrixAt(i, M); edge.setMatrixAt(i, M);
      }
      mesh.instanceMatrix.needsUpdate = true; edge.instanceMatrix.needsUpdate = true;
    });
  }
  return {
    show(rects, y, k = 1) { st.rects = rects; st.y = y; st.k = Math.max(0, Math.min(1, k)); st.shown = true; },
    hide() { st.shown = false; },
    get shown() { return st.shown; },
    info: () => ({ shown: st.shown, k: +st.k.toFixed(2), y: st.y, rects: st.rects.map((r) => [+r.x0.toFixed(2), +r.z0.toFixed(2), +r.x1.toFixed(2), +r.z1.toFixed(2)]) }),
  };
}

// ------------------------------------------------------------------ 90°-Drehungen

/** Matrix4 der Drehung um 90°·sign um die Weltachse 'x' | 'z' (ganzzahlig gerundet). */
export function rot90(axis, sign = 1) {
  const m = new THREE.Matrix4();
  if (axis === 'x') m.makeRotationX(sign * Math.PI / 2); else m.makeRotationZ(sign * Math.PI / 2);
  const e = m.elements;
  for (let i = 0; i < 16; i++) e[i] = Math.round(e[i]);
  return m;
}

// ------------------------------------------------------------------ Schlüssel-HUD

class KeyHud {
  constructor(level) {
    this.level = level;
    this.course = level.scene ?? null;
    this.ui = null; this.objs = null;
    this.want = null;      // { group, n, of, done, t }
    this.key = '';
    if (level.view) level.view.onFrame((dt) => this.tick(dt));
  }

  set(group, n, of, done = false) {
    this.want = { group, n, of, done, t: done ? 2.5 : Infinity };
  }

  state() { return this.want ? { group: this.want.group, n: this.want.n, of: this.want.of, done: this.want.done, visible: this.visible(), text: this.text() } : null; }
  visible() { return !!this.want && this.want.t > 0; }
  text() { return this.want ? `Schlüssel ${this.want.n}/${this.want.of}` : ''; }

  tick(dt) {
    if (this.want && this.want.done && this.want.t !== Infinity) this.want.t -= dt || 0;
    let ui = null;
    try { ui = this.course?.scene?.get('CourseUI'); } catch (_) { ui = null; }
    if (!ui || !ui.sys.isActive() || ui.course !== this.course) return;
    if (this.ui !== ui || !this.objs) this.attach(ui);
    const vis = this.visible();
    const key = vis ? `${this.text()}|${this.want.done}` : '';
    if (key === this.key) return;
    this.key = key;
    const o = this.objs, g = o.g;
    g.clear();
    o.text.setVisible(vis);
    if (!vis) return;
    const W = GAME.width, x = W - 66, y = 37, w = 74;
    g.fillStyle(this.want.done ? 0x2a6a30 : 0x1a1830, 0.6); g.fillRoundedRect(x - w / 2, y - 8, w, 16, 8);
    g.lineStyle(1, 0xffd23a, 0.85); g.strokeRoundedRect(x - w / 2 + 0.5, y - 7.5, w - 1, 15, 7.5);
    // Schlüssel-Symbol: Ring + Bart
    const kx = x - w / 2 + 10;
    g.lineStyle(1.6, 0xffd23a, 1); g.strokeCircle(kx - 2, y, 2.6);
    g.fillStyle(0xffd23a, 1); g.fillRect(kx + 0.5, y - 0.8, 6, 1.6); g.fillRect(kx + 4, y, 1.4, 2.6); g.fillRect(kx + 6, y, 1.4, 2);
    o.text.setText(`${this.want.n}/${this.want.of}`).setPosition(kx + 11, y).setColor(this.want.done ? '#a8ffb0' : '#ffffff');
  }

  attach(ui) {
    this.ui = ui;
    const g = ui.add.graphics().setDepth(44);
    const text = uiText(ui, 0, 0, '', { size: 9, thickness: 2, originX: 0 }).setDepth(46).setVisible(false);
    this.objs = { g, text };
    this.key = '';
    ui.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.objs = null; this.ui = null; });
  }
}

/** HUD-Anzeige der Schlüsselmünzen (eine je Level). */
export function keyHud(level) {
  if (!level._keyHud) level._keyHud = new KeyHud(level);
  return level._keyHud;
}
