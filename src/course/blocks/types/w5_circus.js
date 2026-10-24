// Welt-5-Bausteine Zirkus (Bauplan 5-2 „Zirkus mit Trapezen zum Schwingen … Pendelplattformen“).
//
// trapez – Trapez zum Schwingen (Physik der Figur: player/swing.js). Hängt an zwei Seilen an der Aufhängung `pos`,
//   schwingt leer von selbst (Energie-Regelung auf `swing` Grad Ausschlag); die Figur greift die Stange im Sprung (Hände
//   ≤ 0,8 m an der Stange), schaukelt mit dem Stick in Schwungrichtung auf und springt mit A ab (Schwung + Absprung):
//   Schwungabstand zwischen Trapezen 4–5 m (Aufhängungen im Abstand 4–5 m, gleiche Höhe, gleiche Phase).
//   { type: 'trapez', id, pos: [x, y, z] (Aufhängung), length: 3 (Seil bis zur Stange), dir: [0, −1] (Schwingebene,
//     waagerecht) | yaw (rad, 0 = +X), swing: 30 (° ohne Figur; 0 = hängt still), phase: 0 (0..1 der Periode),
//     width: 1.2 (Stange), riderAmp: 40 (° mindestens mit Figur), maxAmp: 66, frame: true (Querbalken oben),
//     color: 'rot' | 'blau' | 'gold', hidden }
//   level.named.get(id) = Trapez { theta, omega, rider, grabs, releases, bar(), reveal(), hide(), info() }; alle Trapeze
//   in level.trapezes (Figur greift nur dort).
// pendelplattform – Plattform an einem Pendel (bleibt waagerecht, trägt Figur und Gegner mit, mover):
//   { type: 'pendelplattform', id, pos: [x, y, z] (Aufhängung), length: 4 (Aufhängung → Plattform-Oberseite),
//     size: [w, d] ([3, 2.2]), thick: 0.4, dir: [1, 0] (Schwingebene) | yaw, amp: 35 (°), period (s; Standard
//     2π·√(length/9,81)), phase: 0 (0..1), idle: false (wartet auf { start: id }), style: 'zirkus' | 'holz' | 'stein' }
//   level.named.get(id) = { theta, top, pos, start(), stop(), info() }.
// Modelle aus der Registry, sobald es sie gibt: 'trapez' ({ length, width }, state { theta, rider }), 'pendelplattform'
// ({ size, thick, length }, state { theta }); sonst eigene Geometrie.

import * as THREE from 'three';
import { v3, lin, mixc, smooth, colorize, merge, hex, box, addObject } from '../kit.js';
import { MovingBox } from '../w2kit.js';
import { visDt } from '../../entities/gimmick.js';
import { hasModel, getModel } from '../../models/index.js';
import { pendulumStep, barPos, SWING } from '../../player/swing.js';

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
const COLORS = { rot: [0xff4a4a, 0xffffff], blau: [0x3d8bff, 0xffffff], gold: [0xffc23a, 0xfff2c8] };

/** Richtung der Schwingebene aus dir/yaw (waagerechter Einheitsvektor). */
function swingDir(spec, def = [0, -1]) {
  if (typeof spec.yaw === 'number' && !spec.dir) return { x: Math.cos(spec.yaw), z: -Math.sin(spec.yaw) };
  const d = spec.dir ?? def, l = Math.hypot(d[0], d[1]) || 1;
  return { x: d[0] / l, z: d[1] / l };
}

/** Gier einer Gruppe, deren lokales −Z in Richtung d zeigt (Drehung um lokal X schwingt dann entlang d). */
const yawFor = (d) => Math.atan2(-d.x, -d.z);

/** Seil als dünner Zylinder (lokal: von (x, 0, 0) nach (x, −len, 0)), gestreift. */
function ropeGeo(x, len, r = 0.035, col = 0xf4e6c8) {
  const g = new THREE.CylinderGeometry(r, r, len, 6, Math.max(1, Math.round(len * 3)), true);
  g.translate(x, -len / 2, 0);
  const a = lin(hex(col)), b = lin(0xc8a46a);
  return colorize(g.toNonIndexed(), (p, n, o) => mixc(a, b, (Math.floor(-p.y * 4) & 1) * 0.5, o));
}

// ------------------------------------------------------------------ Trapez

/** Trapez-Geometrie (lokal: Aufhängung im Ursprung, Stange bei y = −L, entlang X; schwingt um lokal X). */
function trapezGeo(L, W, color) {
  const [c1, c2] = COLORS[color] ?? COLORS.rot;
  const parts = [];
  for (const sx of [-1, 1]) parts.push(ropeGeo(sx * W / 2, L - 0.02));
  const bar = new THREE.CylinderGeometry(0.06, 0.06, W + 0.12, 10, 6);
  bar.rotateZ(Math.PI / 2);
  bar.translate(0, -L, 0);
  const a = lin(hex(c1)), b = lin(hex(c2));
  parts.push(colorize(bar.toNonIndexed(), (p, n, o) => mixc(a, b, (Math.floor((p.x + 5) / 0.16) & 1), o)));
  for (const sx of [-1, 1]) {
    const k = new THREE.SphereGeometry(0.09, 8, 6);
    k.translate(sx * (W / 2 + 0.06), -L, 0);
    parts.push(colorize(k.toNonIndexed(), (p, n, o) => { o[0] = a[0]; o[1] = a[1]; o[2] = a[2]; }));
  }
  return merge(parts);
}

class Trapez {
  constructor(level, spec) {
    this.level = level;
    this.spec = spec;
    this.id = spec.id ?? null;
    this.pivot = v3(spec.pos);
    this.L = Math.max(0.8, spec.length ?? 3);
    this.dir = swingDir(spec);
    this.w = spec.width ?? 1.2;
    this.g = SWING.g;
    this.idleAmp = spec.swing ?? 30;
    this.riderAmp = spec.riderAmp ?? SWING.riderAmp;
    this.maxAmp = spec.maxAmp ?? SWING.maxAmp;
    this.targetAmp = this.idleAmp;
    this.hidden = !!spec.hidden;
    this.rider = null;
    this.grabs = 0; this.releases = 0;
    const wn = Math.sqrt(this.g / this.L), A = this.idleAmp * DEG, ph = (spec.phase ?? 0) * TAU;
    this.theta = A * Math.sin(ph);
    this.omega = A * wn * Math.cos(ph);
    this._b = { x: 0, y: 0, z: 0 };
    level.trapezes ??= [];
    level.trapezes.push(this);
    if (this.id) level.named.set(this.id, this);
    level.onStep((dt) => this.step(dt));
    if (level.view) this.buildView();
  }

  step(dt) {
    // Reiterin weg (Tod, Neustart, Teleport) → frei
    const r = this.rider;
    if (r && (r.trapeze !== this || r.mode !== 'script' || r.dead || r.removedFigure)) this.rider = null;
    pendulumStep(this, dt);
  }

  bar(out = this._b) { return barPos(this, out); }

  reveal() { if (!this.hidden) return; this.hidden = false; if (this.root) this.root.visible = true; this.level.sfx('powerup_appear'); }
  hide() { this.hidden = true; if (this.root) this.root.visible = false; }

  buildView() {
    const level = this.level;
    const root = new THREE.Group();
    root.position.set(this.pivot.x, this.pivot.y, this.pivot.z);
    root.rotation.y = yawFor(this.dir);
    const swing = new THREE.Group();
    root.add(swing);
    let model = null;
    if (hasModel('trapez')) { model = getModel('trapez', { length: this.L, width: this.w }); swing.add(model.root); }
    else {
      const mesh = new THREE.Mesh(trapezGeo(this.L, this.w, this.spec.color ?? 'rot'), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }));
      mesh.castShadow = true;
      swing.add(mesh);
    }
    if (this.spec.frame !== false) {
      // Aufhängung: kurzer Querbalken mit Haken (fest)
      const beam = box(this.w + 0.7, 0.16, 0.22, 0, 0.08, 0, 0x8a5a3a, { r: 0.04, seg: 1 });
      const m = new THREE.Mesh(beam, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }));
      m.castShadow = false;
      root.add(m);
    }
    root.visible = !this.hidden;
    this.root = root;
    addObject(level, root, (dt) => {
      const d = visDt(level, this, dt);
      swing.rotation.x = this.theta;
      model?.update?.(d, { theta: this.theta, rider: !!this.rider });
    });
  }

  info() {
    const b = this.bar({});
    return { theta: +(this.theta / DEG).toFixed(2), omega: +this.omega.toFixed(3), rider: !!this.rider, target: +this.targetAmp.toFixed(1), grabs: this.grabs, releases: this.releases, bar: [+b.x.toFixed(2), +b.y.toFixed(2), +b.z.toFixed(2)] };
  }
}

export function buildTrapez(level, spec) { return new Trapez(level, spec); }

// ------------------------------------------------------------------ Pendelplattform

const STYLE = {
  zirkus: { top: 0xffd24a, side: 0xd23440, rim: 0xffffff, dark: 0x8a1e2a },
  holz: { top: 0xe0b070, side: 0xa8743e, rim: 0xf0d8a8, dark: 0x6a4424 },
  stein: { top: 0xd8d4dc, side: 0x9a96a4, rim: 0xf0eef4, dark: 0x5e5a68 },
};

function platformGeo(w, d, thick, style) {
  const S = STYLE[style] ?? STYLE.zirkus;
  const parts = [];
  const top = lin(hex(S.top)), side = lin(hex(S.side)), rim = lin(hex(S.rim)), dark = lin(hex(S.dark));
  const body = box(w, thick, d, 0, -thick / 2, 0, S.side, { r: 0.1, seg: 2, topColor: S.top });
  parts.push(colorize(body, (p, n, o) => {
    if (n.y > 0.5) { const r = Math.max(Math.abs(p.x) / (w / 2), Math.abs(p.z) / (d / 2)); mixc(top, rim, smooth(0.78, 0.84, r) * (r < 0.92 ? 1 : 0.4), o); }
    else if (n.y < -0.5) mixc(side, dark, 0.7, o);
    else { const k = Math.floor((p.x + p.z + 20) / 0.5) & 1; mixc(side, rim, k ? 0.7 : 0, o); }
  }));
  return merge(parts);
}

export function buildPendelplattform(level, spec) {
  const pv = v3(spec.pos);
  const L = Math.max(1, spec.length ?? 4);
  const sz = Array.isArray(spec.size) ? spec.size : [3, 2.2];
  const w = sz[0] ?? 3, d = sz.length >= 3 ? sz[2] : (sz[1] ?? 2.2), thick = spec.thick ?? 0.4;
  const dir = swingDir(spec, [1, 0]);
  const amp = (spec.amp ?? 35) * DEG;
  const period = spec.period ?? TAU * Math.sqrt(L / 9.81);
  // Plattform-Maße in Weltachsen (Breite quer zur Schwingebene): entlang dir = d … – die Plattform bleibt achsenparallel
  const alongX = Math.abs(dir.x) > Math.abs(dir.z);
  const wx = alongX ? d : w, wz = alongX ? w : d;
  const st = { t: 0, theta: 0, running: !spec.idle, x: pv.x, y: pv.y - L, z: pv.z };
  const pose = () => {
    const th = amp * Math.sin((st.t / period) * TAU + (spec.phase ?? 0) * TAU);
    return { th, x: pv.x + dir.x * Math.sin(th) * L, y: pv.y - Math.cos(th) * L, z: pv.z + dir.z * Math.sin(th) * L };
  };
  const q0 = pose();
  st.theta = q0.th; st.x = q0.x; st.y = q0.y; st.z = q0.z;
  const mb = new MovingBox(level, q0.x, q0.y - thick, q0.z, wx, thick, wz, { tag: 'pendelplattform', camIgnore: true });
  const handle = {
    get theta() { return st.theta; }, get top() { return st.y; }, get pos() { return { x: st.x, y: st.y, z: st.z }; }, box: mb,
    start() { st.running = true; }, stop() { st.running = false; },
    info: () => ({ theta: +(st.theta / DEG).toFixed(2), top: +st.y.toFixed(3), x: +st.x.toFixed(3), z: +st.z.toFixed(3), riders: mb.carried(level) }),
  };
  mb.shape.owner = handle;
  if (spec.id) level.named.set(spec.id, handle);
  level.onStep((dt) => {
    if (st.running) st.t += dt;
    const q = pose();
    st.theta = q.th; st.x = q.x; st.y = q.y; st.z = q.z;
    mb.moveTo(q.x, q.y - thick, q.z, dt);
  });
  if (level.view) {
    const root = new THREE.Group();
    root.position.set(pv.x, pv.y, pv.z);
    root.rotation.y = yawFor(dir);
    const swing = new THREE.Group();
    root.add(swing);
    // Plattform (lokal: bleibt waagerecht – in swing gegengedreht), Seile vom Querbalken zu den Ecken
    const plat = new THREE.Group();
    plat.position.set(0, -L, 0);
    swing.add(plat);
    let model = null;
    if (hasModel('pendelplattform')) { model = getModel('pendelplattform', { size: [w, d], thick, length: L }); plat.add(model.root); }
    else {
      const m = new THREE.Mesh(platformGeo(w, d, thick, spec.style ?? 'zirkus'), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }));
      m.castShadow = true; m.receiveShadow = true;
      plat.add(m);
      const ropes = [];
      for (const sx of [-1, 1]) ropes.push(ropeGeo(sx * (w / 2 - 0.15), L - 0.02, 0.045));
      const rm = new THREE.Mesh(merge(ropes), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
      rm.castShadow = false;
      swing.add(rm);
      const beam = box(w + 0.5, 0.2, 0.26, 0, 0.1, 0, 0x6a4a3a, { r: 0.05, seg: 1 });
      const bm = new THREE.Mesh(beam, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }));
      root.add(bm);
    }
    const holder = {};
    addObject(level, root, (dt) => {
      const dd = visDt(level, holder, dt);
      swing.rotation.x = st.theta;
      plat.rotation.x = -st.theta;
      model?.update?.(dd, { theta: st.theta });
    });
  }
  return handle;
}

export const TYPES = { trapez: buildTrapez, pendelplattform: buildPendelplattform };
