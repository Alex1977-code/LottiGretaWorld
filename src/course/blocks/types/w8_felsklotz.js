// Welt-8-Baustein Kristall-Felsklotz (Präzisierung Motor und Bausteine Welt 8; Bauplan 8-7 „Lava-Inferno: Kristall-Felsklötze
// rollen über Lava los, sobald man draufsteht; Stampfen macht sie schneller“, „Würfel-Felsklotz mit zwei 3-m-Abstürzen“,
// „dritter Felsklotz rutscht einen Lavahang hinab“, „vierter Felsklotz, lange Kurvenroute bis zum Zielmast“).
//
// kristall_felsklotz – großer, gutmütiger Felsklotz mit Kristallen, der in der Lava schaukelt. Steht eine Figur auf ihm,
//   wartet er `wait` s und fährt dann den Pfad ab (beschleunigt sanft auf `speed`). Jede Stampfattacke auf ihm gibt Schub
//   (+`boost` m/s, bis `maxSpeed`, klingt mit `boostDecay` m/s² ab). Senkrechte Pfad-Abschnitte (waagerecht kürzer als ein
//   Drittel der Höhe) sind Abstürze: freier Fall mit Schwerkraft, Aufprall rumpelt (Kamera wackelt, Aufleuchten) – die Figur
//   fällt mit. Schräge Abschnitte (Lavahang) fährt er mit `slope`-facher Beschleunigung bergab. Am Ende: end 'halt' (bleibt
//   liegen), 'sinken' (versinkt nach `sinkDelay` s langsam in der Lava; erscheint nach `respawn` s am Start wieder) oder
//   'zurueck' (fährt nach `sinkDelay` s leer zum Start zurück). Neustart am Checkpoint: zurück an den Start (ruhe).
//   { type: 'kristall_felsklotz', id, pos: [x, y, z] (Mitte der Unterseite am Start; Unterseite steckt etwas in der Lava),
//     size: [3, 1.4, 3] (variant 'wuerfel': [2.6, 2.6, 2.6]), path: [[x, y, z], …] (Unterseiten-Mitte je Punkt, ab pos),
//     speed: 2.4, accel: 1.4 (m/s²), boost: 2.5, maxSpeed: 7, boostDecay: 0.9, wait: 0.35, slope: 1.6,
//     start: 'stand' | 'signal' | 'auto', end: 'halt' | 'sinken' | 'zurueck', sinkDelay: 1.2, respawn: 3,
//     variant: 'platte' | 'wuerfel', color: 'lila' | 'blau' | 'gruen', bob: 0.06 (m Schaukeln), look: 'eigen' }
//   level.named.get(id) = { state ('ruhe'|'wartet'|'faehrt'|'faellt'|'ende'|'sinkt'|'weg'|'zurueck'), s (m auf dem Pfad), speed,
//     boosts, falls, mb (MovingBox), carries(fig), start(), stop(), reset(), boostNow(), info() }; w8(level).rocks.
//   Kollision: MovingBox (mover, tag 'felsklotz') – trägt Figuren und Gegner. Stampfen: Form-Besitzer onPound.
//   Modell: Registry 'kristall_felsklotz' ({ size: [w, h, d], variant, color }, Ursprung Mitte der Unterseite, Blick +X;
//   state { anim: 'ruhe'|'faehrt'|'schnell'|'faellt'|'landet', speed, t }) – sonst eigener Klotz mit Kristallen und Gesicht.
//   Beispiel: { type: 'kristall_felsklotz', id: 'klotz1', pos: [0, -0.9, -60], path: [[0, -0.9, -80], [8, -0.9, -96]] }
//   Würfel: { type: 'kristall_felsklotz', variant: 'wuerfel', pos: [0, -1, -100], path: [[0, -1, -110], [0, -4, -110.2], [0, -4, -124]] }

import * as THREE from 'three';
import { v3, sz3, lin, mixc, smooth, colorize, merge, hex, addObject } from '../kit.js';
import { MovingBox, yawOf } from '../w2kit.js';
import { visDt, runAction } from '../../entities/gimmick.js';
import { getModel } from '../../models/index.js';
import { w8, figures, pathOf, pathAt, onRespawn, flash, regModel, clamp, TAU, stdMat } from '../w8kit.js';

const G = 26;
const PAL = {
  lila: { rock: 0x5a3a6a, rockHi: 0x8a6a9a, rockLo: 0x2a1a34, crystal: 0xd08aff, crystalHi: 0xf6dcff },
  blau: { rock: 0x3a4a6a, rockHi: 0x6a7a9a, rockLo: 0x1a2234, crystal: 0x7ad8ff, crystalHi: 0xe0f8ff },
  gruen: { rock: 0x3a5a4a, rockHi: 0x6a8a7a, rockLo: 0x1a2a22, crystal: 0x7affb8, crystalHi: 0xe0ffee },
};

/** Eigener Felsklotz (lokal: Ursprung Mitte der Unterseite, Blick +X). */
function rockGeo(s, variant, col) {
  const P = PAL[col] ?? PAL.lila;
  const rock = lin(hex(P.rock)), hi = lin(hex(P.rockHi)), lo = lin(hex(P.rockLo)), cr = lin(hex(P.crystal)), crh = lin(hex(P.crystalHi));
  const parts = [], glow = [];
  // Körper: leicht unregelmäßiger, abgeschrägter Quader (Oberseite flach zum Stehen)
  const body = new THREE.BoxGeometry(s.x, s.y, s.z, 3, 2, 3).toNonIndexed();
  const pos = body.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const k = (Math.abs(x) > s.x * 0.49 ? 1 : 0) + (Math.abs(z) > s.z * 0.49 ? 1 : 0);
    if (y < 0) { pos.setX(i, x * 0.88); pos.setZ(i, z * 0.88); }
    if (k === 2 && y > 0) pos.setY(i, y - 0.12);
    const w = Math.sin(x * 3.1 + z * 2.3) * 0.04;
    pos.setX(i, pos.getX(i) + (Math.abs(x) > 0.01 ? Math.sign(x) * w : 0));
  }
  body.computeVertexNormals();
  body.translate(0, s.y / 2, 0);
  parts.push(colorize(body, (p, n, o) => {
    mixc(lo, rock, smooth(0, s.y * 0.7, p.y), o);
    if (n.y > 0.7) mixc(o, hi, 0.55, o);
    const crack = Math.abs(Math.sin(p.x * 2.7 + p.z * 1.9 + p.y * 3.3));
    if (crack > 0.965) mixc(o, lo, 0.6, o);
  }));
  // Kristalle an den Ecken und Seiten (nicht auf der Lauffläche)
  const cry = (x, y, z, h, r, tx, tz) => {
    const g = new THREE.ConeGeometry(r, h, 5);
    g.translate(0, h / 2, 0);
    g.rotateZ(tz); g.rotateX(tx);
    g.translate(x, y, z);
    parts.push(colorize(g.toNonIndexed(), (p, n, o) => mixc(cr, crh, smooth(-0.2, 0.9, n.y * 0.6 + n.x * 0.3), o)));
  };
  const hx = s.x / 2, hz = s.z / 2;
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    cry(sx * hx * 0.92, s.y * 0.72, sz * hz * 0.92, s.y * 0.55, 0.16, sz * 0.5, -sx * 0.5);
    cry(sx * hx * 0.8, s.y * 0.6, sz * hz * 0.98, s.y * 0.38, 0.12, sz * 0.9, -sx * 0.2);
  }
  cry(-hx * 0.98, s.y * 0.35, 0, s.y * 0.5, 0.18, 0, 1.2);
  // Gesicht vorn (+X): müde, gutmütige Augen und ein Mund
  const eye = lin(0xfff6c0);
  for (const z of [-0.36, 0.36]) {
    const e = new THREE.SphereGeometry(0.15, 10, 8);
    e.scale(0.5, 1, 1);
    e.translate(hx + 0.01, s.y * 0.62, z * Math.min(1, s.z / 3) * 1.4);
    glow.push(colorize(e.toNonIndexed(), (p, n, o) => { o[0] = eye[0]; o[1] = eye[1]; o[2] = eye[2]; }));
    const lid = new THREE.BoxGeometry(0.1, 0.07, 0.36);
    lid.translate(hx + 0.04, s.y * 0.7, z * Math.min(1, s.z / 3) * 1.4);
    parts.push(colorize(lid.toNonIndexed(), (p, n, o) => { o[0] = lo[0]; o[1] = lo[1]; o[2] = lo[2]; }));
  }
  const m = new THREE.TorusGeometry(0.16, 0.035, 5, 10, Math.PI);
  m.rotateY(Math.PI / 2); m.rotateX(Math.PI);
  m.translate(hx + 0.02, s.y * 0.38, 0);
  parts.push(colorize(m.toNonIndexed(), (p, n, o) => { o[0] = lo[0]; o[1] = lo[1]; o[2] = lo[2]; }));
  // Glutsaum unten (steckt in der Lava)
  const rim = new THREE.BoxGeometry(s.x * 0.9, 0.12, s.z * 0.9);
  rim.translate(0, 0.06, 0);
  const gl = lin(0xff8a2a);
  glow.push(colorize(rim.toNonIndexed(), (p, n, o) => { o[0] = gl[0]; o[1] = gl[1]; o[2] = gl[2]; }));
  if (variant === 'wuerfel') {
    // Würfel: Kristallkranz rundum in halber Höhe
    for (let i = 0; i < 6; i++) cry(Math.cos(i) * hx * 0.98, s.y * 0.45, Math.sin(i * 1.7) * hz * 0.98, 0.4, 0.12, Math.sin(i) * 1.2, Math.cos(i) * 1.2);
  }
  return { body: merge(parts), glow: merge(glow) };
}

export function buildKristallFelsklotz(level, spec) {
  const p0 = v3(spec.pos);
  const variant = spec.variant === 'wuerfel' ? 'wuerfel' : 'platte';
  const s = sz3(spec.size, variant === 'wuerfel' ? [2.6, 2.6, 2.6] : [3, 1.4, 3]);
  const path = pathOf(spec, p0);
  // Abschnitte: Absturz (senkrecht) oder Fahrt
  const segs = [];
  for (let i = 1; i < path.pts.length; i++) {
    const a = path.pts[i - 1], b = path.pts[i];
    const h = Math.hypot(b.x - a.x, b.z - a.z), dy = b.y - a.y;
    segs.push({ a, b, fall: dy < -0.3 && h < -dy / 3, slope: h > 0 ? dy / h : 0 });
  }
  const C = {
    speed: spec.speed ?? 2.4, accel: spec.accel ?? 1.4, boost: spec.boost ?? 2.5, max: spec.maxSpeed ?? 7, decay: spec.boostDecay ?? 0.9,
    wait: spec.wait ?? 0.35, slope: spec.slope ?? 1.6, end: spec.end ?? 'halt', sinkDelay: spec.sinkDelay ?? 1.2, respawn: spec.respawn ?? 3,
    start: spec.start ?? 'stand', bob: spec.bob ?? 0.06,
  };
  const st = { state: 'ruhe', t: 0, s: 0, v: 0, extra: 0, boosts: 0, falls: 0, vy: 0, fallY: 0, sink: 0, y: p0.y, yaw: 0, land: 0, run: C.start === 'auto' };
  const mb = new MovingBox(level, p0.x, p0.y, p0.z, s.x, s.y, s.z, { tag: 'felsklotz' });
  const at = {};
  const set = (name) => { if (st.state !== name) { st.state = name; st.t = 0; } };
  const handle = {
    get state() { return st.state; }, get s() { return st.s; }, get speed() { return st.v + st.extra; },
    get boosts() { return st.boosts; }, get falls() { return st.falls; }, mb, variant,
    carries: (f) => mb.carries(f),
    start() { st.run = true; if (st.state === 'ruhe') set('wartet'); },
    stop() { st.run = false; },
    reset() {
      st.s = 0; st.v = 0; st.extra = 0; st.vy = 0; st.sink = 0; st.run = C.start === 'auto';
      set('ruhe');
      mb.setSolid(true);
      mb.moveTo(p0.x, p0.y, p0.z, 0);
      mb.still();
    },
    boostNow() {
      if (st.state !== 'faehrt' && st.state !== 'wartet') return false;
      st.extra = Math.min(C.max - C.speed, st.extra + C.boost);
      if (st.state === 'wartet') set('faehrt');
      st.boosts++;
      level.sfx('boost');
      level.shake(0.18);
      level.effects?.sparks({ x: mb.pos.x, y: mb.pos.y + s.y, z: mb.pos.z }, 12);
      runAction(level, spec.onBoost, { pos: [mb.pos.x, mb.pos.y + s.y, mb.pos.z], source: handle });
      return true;
    },
    onPound() { handle.boostNow(); },
    info: () => ({ state: st.state, s: +st.s.toFixed(2), length: +path.length.toFixed(2), speed: +(st.v + st.extra).toFixed(2), boosts: st.boosts, falls: st.falls,
      x: +mb.pos.x.toFixed(2), y: +mb.pos.y.toFixed(2), z: +mb.pos.z.toFixed(2), solid: mb.on }),
  };
  mb.shape.owner = handle;
  if (spec.id) level.named.set(spec.id, handle);
  w8(level).rocks.push(handle);
  onRespawn(level, () => handle.reset());

  const segAt = (sv) => {
    for (const g of segs) if (sv < g.b.s - 1e-6) return g;
    return segs[segs.length - 1] ?? null;
  };

  level.onStep((dt, time) => {
    st.t += dt;
    const ridden = mb.carried(level) > 0;
    let x = mb.pos.x, y = mb.pos.y, z = mb.pos.z;
    switch (st.state) {
      case 'ruhe':
        if ((C.start === 'stand' && ridden) || st.run) set('wartet');
        break;
      case 'wartet':
        if (st.t >= C.wait) set('faehrt');
        break;
      case 'faehrt': {
        const g = segAt(st.s);
        if (!g) { set('ende'); break; }
        if (g.fall) { set('faellt'); st.vy = 0; st.fallY = mb.pos.y; break; }
        const target = C.speed * (g.slope < -0.05 ? 1 + Math.min(1.5, -g.slope * C.slope) : 1);
        st.v = Math.min(target, st.v + C.accel * (g.slope < -0.05 ? C.slope : 1) * dt);
        if (st.v > target) st.v = Math.max(target, st.v - C.accel * dt);
        st.extra = Math.max(0, st.extra - C.decay * dt);
        st.s = Math.min(path.length, st.s + (st.v + st.extra) * dt);
        if (st.s >= path.length - 1e-4) { st.s = path.length; set('ende'); }
        break;
      }
      case 'faellt': {
        const g = segAt(st.s);
        st.vy = Math.max(-22, st.vy - G * dt);
        st.fallY += st.vy * dt;
        // Fortschritt entlang des Absturz-Abschnitts nach der Höhe
        const k = clamp((g.a.y - st.fallY) / Math.max(0.01, g.a.y - g.b.y), 0, 1);
        st.s = g.a.s + (g.b.s - g.a.s) * k;
        if (k >= 1) {
          st.falls++;
          st.land = 0.35;
          level.sfx('slam');
          level.shake(0.5);
          level.effects?.sparks({ x: mb.pos.x, y: g.b.y + 0.2, z: mb.pos.z }, 18);
          flash(level, mb.pos.x, g.b.y + s.y, mb.pos.z, 7, { by: 'felsklotz' });
          st.v = Math.min(st.v, C.speed * 0.4);
          set(st.s >= path.length - 1e-4 ? 'ende' : 'faehrt');
        }
        break;
      }
      case 'ende':
        if (C.end === 'halt') break;
        if (st.t >= C.sinkDelay) set(C.end === 'zurueck' ? 'zurueck' : 'sinkt');
        break;
      case 'sinkt':
        st.sink += dt * 0.8;
        if (st.sink > s.y + 0.3) { mb.setSolid(false); set('weg'); }
        break;
      case 'weg':
        if (st.t >= C.respawn) { handle.reset(); }
        break;
      case 'zurueck':
        st.s = Math.max(0, st.s - C.speed * 1.4 * dt);
        if (st.s <= 0) { st.v = 0; st.extra = 0; set('ruhe'); }
        break;
      default: break;
    }
    if (st.land > 0) st.land = Math.max(0, st.land - dt);
    pathAt(path, st.s, at);
    x = at.x; z = at.z;
    y = st.state === 'faellt' ? st.fallY : at.y;
    const moving = st.state === 'faehrt' || st.state === 'faellt' || st.state === 'zurueck';
    const bob = moving ? Math.sin(time * 5.5) * C.bob * 0.4 : Math.sin(time * 2.1 + p0.x) * C.bob;
    y += bob - st.sink;
    if (Math.abs(at.dx) + Math.abs(at.dz) > 0.01) st.yaw = yawOf(at.dx, at.dz);
    mb.moveTo(x, y, z, dt);
  });

  if (!level.view) return handle;
  // ---------------- Darstellung
  const root = new THREE.Group();
  root.name = 'kristall_felsklotz';
  const tilt = new THREE.Group();
  root.add(tilt);
  let model = null;
  if (regModel(spec, 'kristall_felsklotz')) {
    model = getModel('kristall_felsklotz', { size: [s.x, s.y, s.z], variant, color: spec.color ?? 'lila' });
    tilt.add(model.root);
  } else {
    const g = rockGeo(s, variant, spec.color ?? 'lila');
    const body = new THREE.Mesh(g.body, stdMat('w8rock', { roughness: 0.7 }));
    body.castShadow = true; body.receiveShadow = true;
    tilt.add(body);
    if (g.glow) tilt.add(new THREE.Mesh(g.glow, level.view.mats.glow));
  }
  const holder = {};
  let vy = st.yaw, t = 0;
  addObject(level, root, (dt) => {
    const d = visDt(level, holder, dt);
    t += d;
    root.position.set(mb.pos.x, mb.pos.y, mb.pos.z);
    let dy = st.yaw - vy;
    while (dy > Math.PI) dy -= TAU;
    while (dy < -Math.PI) dy += TAU;
    vy += dy * Math.min(1, d * 4);
    root.rotation.y = vy;
    root.visible = st.state !== 'weg';
    const sp = st.v + st.extra;
    // leichtes Schaukeln, beim Fahren nach vorn geneigt, beim Absturz kippelnd
    tilt.rotation.z = st.state === 'faellt' ? -0.12 : -Math.min(0.08, sp * 0.012) + Math.sin(t * 1.7) * 0.015;
    tilt.rotation.x = Math.sin(t * 1.3 + 1) * 0.02 + (st.land > 0 ? Math.sin(st.land * 40) * 0.03 : 0);
    const anim = st.state === 'faellt' ? 'faellt' : st.land > 0 ? 'landet' : st.state === 'faehrt' ? (st.extra > 0.3 ? 'schnell' : 'faehrt') : 'ruhe';
    model?.update?.(d, { anim, speed: sp, t });
  });
  return handle;
}

export const TYPES = { kristall_felsklotz: buildKristallFelsklotz };
