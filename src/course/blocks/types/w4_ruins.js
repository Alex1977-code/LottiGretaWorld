// Bewegliche Plattformen Welt 4 (4-5 Ruinenstadt, 4-Burg Lava-Burg).
//
// schwankplattform – Steinplatte auf einem Drehpunkt: kippt unter dem Gewicht der Figur(en) zur belasteten Seite,
//   schwingt ohne Last gedämpft zurück; ab slideFrom Grad rutscht die Figur hangabwärts (Förderband-Flag), bei voller
//   Neigung schneller. Kollision: Rampe (Neigung = Kippwinkel), die jedem Schritt folgt.
//   { type: 'schwankplattform', id, pos: [x, y, z] (Drehpunkt = Mitte der Oberseite in Ruhelage), size: [w, d] ([6, 3]),
//     thick: 0.6, axis: 'x' (die Oberseite kippt entlang x: linke/rechte Seite senkt sich) | 'z' (vordere/hintere),
//     max: 26 (Grad), slideFrom: 14 (Grad), slideSpeed: 4.5 (m/s bei max), stiffness: 7, damping: 3.2, weight: 1,
//     post: true (Säule unter dem Drehpunkt), postDown: 6 (m), style: 'ruine' | 'stein' | 'holz' }
//   Laufzeit: level.named.get(id) = { tilt (rad, + = Seite +axis unten), omega, load, info() }.
// drehplattform – drehende Plattform (Drehplattformen über Lava, 4-Burg):
//   axis 'y' (Drehteller/Drehbalken, nimmt Figuren und Gegner mit, Flag mover mit dyaw):
//     { type: 'drehplattform', id, axis: 'y', pos: [x, y, z] (Mitte der Unterseite), arms: 2 (Balken; 3 = Dreistern,
//       4 = Kreuz; 0 = runde Scheibe), length: 4 (Armlänge ab Mitte bzw. Scheibenradius), width: 1.8, thick: 0.5,
//       speed: 0.6 (rad/s, + = gegen den Uhrzeigersinn von oben), angle: 0 (Startwinkel), hub: true (Nabe mit Säule
//       nach unten, postDown 6), style: 'stein' | 'lava' (glühende Fugen) | 'holz', idle, id }
//     Kollision: Arme als Kette überlappender Zylinder (drehen sich exakt), Mitte als Zylinder.
//   axis 'x' | 'z' (Wende-Plattform, dreht um eine waagerechte Achse durch ihre Mitte):
//     { type: 'drehplattform', axis: 'x', pos (Mitte der Unterseite in Ruhelage), size: [w, d] ([4, 4]), thick: 0.5,
//       mode: 'flip' (steht wait s, blinkt warnT s, dreht in turn s um 180°) | 'spin' (dreht stetig mit speed rad/s),
//       wait: 2.5, turn: 1.1, warnT: 0.8, speed: 0.8, phase: 0 (s Versatz), style, id }
//     Begehbar, solange die Platte höchstens ±30° geneigt ist (Rampe); steiler → keine Kollision, die Figur fällt.
//   Laufzeit: level.named.get(id) = { angle, flips, solid, start(), stop(), info() }.
// Modell 'schwankplattform' ({ size, thick, axis }, state { tilt }) aus der Registry, sonst eigene Geometrie.

import * as THREE from 'three';
import { v3, sz3, lin, mixc, smooth, colorize, merge, hex, box, addObject, addStatic, themeOf } from '../kit.js';
import { figures } from '../w2kit.js';
import { visDt } from '../../entities/gimmick.js';
import { hasModel, getModel } from '../../models/index.js';

const DEG = Math.PI / 180;
const STYLES = {
  ruine: { top: 0xe6cfa0, side: 0xc8a676, dark: 0x8a6a48, accent: 0x7aa84a, crack: 0x5a4430 },
  stein: { top: 0xc8c4cc, side: 0x9a96a4, dark: 0x5e5a68, accent: 0x6a6676, crack: 0x3a3844 },
  lava: { top: 0x5a4a4e, side: 0x3e3236, dark: 0x22181c, accent: 0xff7a1a, crack: 0xffa030 },
  holz: { top: 0xd8a868, side: 0xa8743e, dark: 0x6a4424, accent: 0x8a5a2e, crack: 0x5a3a1e },
};

/** Platte (Mitte der Oberseite im Ursprung, Oberseite y = 0): Körper, Randfries, Moos/Fugen je Stil. */
function slabGeo(w, d, thick, style, rnd = 1) {
  const S = STYLES[style] ?? STYLES.ruine;
  const top = lin(hex(S.top)), side = lin(hex(S.side)), dark = lin(hex(S.dark)), acc = lin(hex(S.accent));
  const parts = [];
  const body = box(w, thick, d, 0, -thick / 2, 0, S.side, { r: 0.08, seg: 1, topColor: S.top });
  parts.push(colorize(body, (p, n, o) => {
    if (n.y > 0.5) { const tile = (Math.floor((p.x + w) / 1.0) + Math.floor((p.z + d) / 1.0)) & 1; mixc(top, side, tile ? 0.12 : 0, o); }
    else if (n.y < -0.5) mixc(side, dark, 0.6, o);
    else mixc(dark, side, smooth(-thick, 0, p.y), o);
  }));
  // Fries: Kerben in den Seiten (dunkle Streifen)
  const nk = Math.max(2, Math.round(Math.max(w, d) / 0.8));
  for (let i = 0; i < nk; i++) {
    const t = (i + 0.5) / nk;
    for (const sz of [-1, 1]) {
      const g = new THREE.BoxGeometry(0.08, thick * 0.5, 0.04);
      g.translate(-w / 2 + t * w, -thick / 2, sz * (d / 2 + 0.005));
      parts.push(colorize(g, (p, n, o) => { o[0] = dark[0]; o[1] = dark[1]; o[2] = dark[2]; }));
    }
  }
  // Moos-Polster (Ruine) bzw. Glutfugen (Lava) am Rand der Oberseite
  if (style === 'ruine' || style === undefined) {
    for (let i = 0; i < 5; i++) {
      const a = (i * 2.399 + rnd) % 6.283;
      const x = Math.cos(a) * w * 0.42, z = Math.sin(a) * d * 0.42;
      const g = new THREE.SphereGeometry(0.22 + (i % 3) * 0.06, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2);
      g.scale(1.4, 0.5, 1.1);
      g.translate(x, 0, z);
      parts.push(colorize(g, (p, n, o) => mixc(acc, lin(0xa8d86a), smooth(0, 1, n.y) * 0.5, o)));
    }
  }
  return merge(parts);
}

/** Glühende Fugen (Lava-Stil) als eigenes, unbeleuchtetes Mesh (Oberseite). */
function crackGeo(w, d, seed = 1) {
  const parts = [];
  const c = lin(0xffa030), c2 = lin(0xff5a10);
  for (let i = 0; i < 4; i++) {
    const g = new THREE.BoxGeometry(i % 2 ? 0.07 : w * 0.7, 0.02, i % 2 ? d * 0.7 : 0.07);
    g.translate(((i * 0.37 + seed) % 1 - 0.5) * w * 0.5, 0.012, ((i * 0.61 + seed) % 1 - 0.5) * d * 0.5);
    parts.push(colorize(g, (p, n, o) => mixc(c2, c, 0.5 + 0.5 * Math.sin(p.x * 4 + p.z * 3), o)));
  }
  return merge(parts);
}

/** Säule unter einem Drehpunkt (statisch verschmolzen) + Kollision. */
function pillar(level, x, yTop, z, r, down, style) {
  const S = STYLES[style] ?? STYLES.ruine;
  const g = new THREE.CylinderGeometry(r * 0.85, r, down, 12, 3);
  g.translate(x, yTop - down / 2, z);
  const a = lin(hex(S.side)), b = lin(hex(S.dark));
  addStatic(level, colorize(g, (p, n, o) => mixc(b, a, smooth(yTop - down, yTop, p.y) * 0.8 + (Math.floor(p.y * 1.4) & 1) * 0.08, o)));
  level.world.add({ type: 'cyl', x, z, r: r * 0.85, y0: yTop - down, y1: yTop, tag: 'drehpunkt:saeule' });
}

// ------------------------------------------------------------------ Schwankplattform

export function buildSchwankplattform(level, spec) {
  const p = v3(spec.pos);
  const sz = Array.isArray(spec.size) ? spec.size : [6, 3];
  const axis = spec.axis === 'z' ? 'z' : 'x';
  const len = axis === 'x' ? sz[0] : sz[1], wid = axis === 'x' ? sz[1] : sz[0];
  const hl = len / 2, hw = wid / 2;
  const thick = spec.thick ?? 0.6;
  const max = (spec.max ?? 26) * DEG, slideFrom = (spec.slideFrom ?? 14) * DEG, slideSpeed = spec.slideSpeed ?? 4.5;
  const K = spec.stiffness ?? 7, D = spec.damping ?? 3.2, weight = spec.weight ?? 1;
  const style = spec.style ?? 'ruine';
  const st = { tilt: (spec.tilt ?? 0) * DEG, omega: 0, load: 0 };
  const conv = { x: 0, z: 0 };
  const shape = { type: 'ramp', min: [0, 0, 0], max: [1, 1, 1], axis, dir: 1, low: 0, tag: 'schwankplattform', conveyor: null };
  // Drehpunkt (Gelenk) 0,5 m unter der Oberseite (wie das Modell): die Oberseite ist eine Gerade durch
  // (0,5·sin θ, 0,5·cos θ) relativ zum Gelenk → Höhe y = gelenk + 0,5/cos θ − tan θ·u (u entlang axis ab pos)
  const DP = 0.5, pivotY = p.y - DP;
  const shapeAt = () => {
    const th = st.tilt, c = Math.cos(th), tn = Math.tan(th), shift = DP * Math.sin(th);
    const u0 = -hl * c + shift, u1 = hl * c + shift;
    const top0 = pivotY + DP / c - tn * u0, top1 = pivotY + DP / c - tn * u1;
    const hi = Math.max(top0, top1), lo = Math.min(top0, top1);
    const a = axis === 'x' ? p.x : p.z;
    shape.min = axis === 'x' ? [a + u0, lo - thick, p.z - hw] : [p.x - hw, lo - thick, a + u0];
    shape.max = axis === 'x' ? [a + u1, hi, p.z + hw] : [p.x + hw, hi, a + u1];
    shape.low = lo;
    shape.dir = th > 0 ? -1 : 1;     // tilt > 0: Seite +axis unten → Oberseite steigt nach −axis
    const ab = Math.abs(th);
    if (ab > slideFrom) {
      const v = slideSpeed * Math.min(1, (ab - slideFrom) / Math.max(1e-6, max - slideFrom));
      conv.x = axis === 'x' ? Math.sign(th) * v : 0; conv.z = axis === 'z' ? Math.sign(th) * v : 0;
      shape.conveyor = conv;
    } else shape.conveyor = null;
  };
  shapeAt();
  const sid = level.world.add(shape);
  const reg = !!level.view && hasModel('schwankplattform');
  if (spec.post !== false) {
    if (reg) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.42, y0: p.y - (spec.postDown ?? 6), y1: p.y - thick - 0.3, tag: 'drehpunkt:saeule' });
    else pillar(level, p.x, p.y - thick, p.z, 0.45, spec.postDown ?? 6, style === 'holz' ? 'stein' : style);
  }
  const handle = {
    get tilt() { return st.tilt; }, get omega() { return st.omega; }, get load() { return st.load; }, shape,
    info: () => ({ tilt: +(st.tilt / DEG).toFixed(2), omega: +st.omega.toFixed(3), load: +st.load.toFixed(3), sliding: !!shape.conveyor }),
  };
  if (spec.id) level.named.set(spec.id, handle);
  level.onStep((dt) => {
    let sum = 0;
    for (const f of figures(level)) {
      if (f.mode !== 'ground' || f.ground !== shape) continue;
      const u = ((axis === 'x' ? f.pos.x - p.x : f.pos.z - p.z) / hl);
      sum += Math.max(-1, Math.min(1, u)) * weight;
    }
    for (const e of level.entities) {
      if (!e.alive || !e.grounded || e.ground !== shape) continue;
      sum += Math.max(-1, Math.min(1, (axis === 'x' ? e.pos.x - p.x : e.pos.z - p.z) / hl)) * weight * 0.5;
    }
    st.load = sum;
    const target = Math.max(-1, Math.min(1, sum)) * max;
    st.omega += (K * (target - st.tilt) - D * st.omega) * dt;
    st.tilt += st.omega * dt;
    if (st.tilt > max) { st.tilt = max; st.omega = Math.min(0, st.omega); }
    if (st.tilt < -max) { st.tilt = -max; st.omega = Math.max(0, st.omega); }
    shapeAt();
    level.world.update(sid);
  });
  if (level.view) {
    const root = new THREE.Group();
    root.position.set(p.x, p.y, p.z);
    let model = null, mesh = null;
    if (reg) {
      // Modell: Säule (bis postDown unter die Oberseite), Gelenkkugel, Platte; Oberkante = pivot + 0,5
      model = getModel('schwankplattform', { size: sz, height: spec.post === false ? 0.6 : Math.max(0.6, Math.min(10, (spec.postDown ?? 6) - DP)) });
      const top = model.root.userData.top ?? 2;
      model.root.position.y = -top;
      root.add(model.root);
    } else {
      const g = slabGeo(sz[0], sz[1], thick, style, p.x * 0.37);
      mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.position.y = DP;
      // Drehlager (Bronze) unter der Platte
      const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, wid * 0.7, 10), new THREE.MeshStandardMaterial({ color: 0xc89040, roughness: 0.35, metalness: 0.6 }));
      if (axis === 'x') hinge.rotation.x = Math.PI / 2; else hinge.rotation.z = Math.PI / 2;
      hinge.position.y = -thick - 0.12;
      root.add(hinge);
      const pivot = new THREE.Group();
      pivot.position.y = -DP;
      pivot.add(mesh);
      root.add(pivot);
      mesh = pivot;
    }
    const holder = {};
    addObject(level, root, (dt) => {
      const d = visDt(level, holder, dt);
      if (model) { model.update?.(d, { tilt: axis === 'x' ? [0, -st.tilt] : [st.tilt, 0] }); return; }
      if (axis === 'x') mesh.rotation.set(0, 0, -st.tilt); else mesh.rotation.set(st.tilt, 0, 0);
    });
  }
  return handle;
}

// ------------------------------------------------------------------ Drehplattform

function buildDrehY(level, spec) {
  const p = v3(spec.pos);
  const arms = spec.arms ?? 2, length = spec.length ?? 4, width = spec.width ?? 1.8, thick = spec.thick ?? 0.5;
  const speed = spec.speed ?? 0.6, style = spec.style ?? 'stein';
  const st = { angle: (spec.angle ?? 0), running: !spec.idle };
  const mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: p.x, cz: p.z };
  const discs = [];   // { d (Abstand), a (Armwinkel), r, id, shape }
  const add = (dist, a, r) => {
    const sh = { type: 'cyl', x: p.x + Math.cos(a) * dist, z: p.z - Math.sin(a) * dist, r, y0: p.y, y1: p.y + thick, mover, tag: 'drehplattform' };
    discs.push({ dist, a, r, shape: sh, id: level.world.add(sh) });
  };
  if (arms <= 0) add(0, 0, length);
  else {
    const rw = width / 2;
    add(0, 0, Math.max(rw * 1.25, spec.hubR ?? 0));
    for (let i = 0; i < arms; i++) {
      const a = (i / arms) * Math.PI * 2;
      for (let dd = rw * 1.2; dd <= length - rw * 0.98 + 1e-6; dd += rw * 1.1) add(dd, a, rw);
      add(length - rw, a, rw);
    }
  }
  if (spec.hub !== false) pillar(level, p.x, p.y, p.z, 0.5, spec.postDown ?? 6, style === 'lava' ? 'lava' : 'stein');
  const handle = {
    get angle() { return st.angle; }, discs, mover,
    start() { st.running = true; }, stop() { st.running = false; },
    info: () => ({ angle: +st.angle.toFixed(3), running: st.running, discs: discs.length }),
  };
  if (spec.id) level.named.set(spec.id, handle);
  level.onStep((dt) => {
    const da = st.running ? speed * dt : 0;
    st.angle += da;
    mover.dyaw = da;
    for (const c of discs) {
      const a = c.a + st.angle;
      c.shape.x = p.x + Math.cos(a) * c.dist; c.shape.z = p.z - Math.sin(a) * c.dist;
      level.world.update(c.id);
    }
  });
  if (level.view) {
    const parts = [];
    const S = STYLES[style] ?? STYLES.stein;
    if (arms <= 0) {
      const g = new THREE.CylinderGeometry(length, length * 0.96, thick, 40);
      g.translate(0, thick / 2, 0);
      const top = lin(hex(S.top)), side = lin(hex(S.side));
      parts.push(colorize(g, (q, n, o) => { if (n.y > 0.5) mixc(top, side, (Math.floor(Math.hypot(q.x, q.z) / 1.2) & 1) * 0.15, o); else mixc(side, lin(hex(S.dark)), 0.3, o); }));
    } else {
      for (let i = 0; i < arms; i++) {
        const a = (i / arms) * Math.PI * 2;
        const g = slabGeo(length, width, thick, style, i * 0.71);
        g.translate(length / 2, thick, 0);
        g.rotateY(a);
        parts.push(g);
      }
      const hub = new THREE.CylinderGeometry(width * 0.62, width * 0.66, thick + 0.12, 16);
      hub.translate(0, (thick + 0.12) / 2, 0);
      parts.push(colorize(hub, (q, n, o) => mixc(lin(hex(S.dark)), lin(hex(S.top)), smooth(-0.2, 1, n.y), o)));
    }
    const mesh = new THREE.Mesh(merge(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
    mesh.castShadow = true; mesh.receiveShadow = true;
    const root = new THREE.Group();
    root.add(mesh);
    if (style === 'lava' && arms > 0) {
      const cracks = [];
      for (let i = 0; i < arms; i++) { const g = crackGeo(length, width, i * 0.3); g.translate(length / 2, thick, 0); g.rotateY((i / arms) * Math.PI * 2); cracks.push(g); }
      root.add(new THREE.Mesh(merge(cracks), new THREE.MeshBasicMaterial({ vertexColors: true })));
    }
    root.position.set(p.x, p.y, p.z);
    addObject(level, root, () => { root.rotation.y = st.angle; });
  }
  return handle;
}

function buildDrehFlip(level, spec) {
  const p = v3(spec.pos);
  const sz = Array.isArray(spec.size) ? spec.size : [4, 4];
  const thick = spec.thick ?? 0.5;
  const rotAxis = spec.axis === 'z' ? 'z' : 'x';
  const slopeAxis = rotAxis === 'x' ? 'z' : 'x';             // Richtung, in der sich die Oberseite neigt
  const hl = (slopeAxis === 'x' ? sz[0] : sz[1]) / 2, hw = (slopeAxis === 'x' ? sz[1] : sz[0]) / 2;
  const mode = spec.mode === 'spin' ? 'spin' : 'flip';
  const wait = spec.wait ?? 2.5, turn = spec.turn ?? 1.1, warnT = spec.warnT ?? 0.8, speed = spec.speed ?? 0.8;
  const cy = p.y + thick / 2;                                // Drehachse in der Mitte der Platte
  const limit = 30 * DEG;
  const st = { t: spec.phase ?? 0, angle: 0, flips: 0, warn: false, running: !spec.idle };
  const shape = { type: 'ramp', min: [0, 0, 0], max: [1, 1, 1], axis: slopeAxis, dir: 1, low: 0, tag: 'drehplattform' };
  let sid = null;
  const angleAt = (t) => {
    if (mode === 'spin') return t * speed;
    const cyc = wait + turn, k = Math.floor(t / cyc), u = t - k * cyc;
    st.warn = u > wait - warnT && u < wait;
    const e = u <= wait ? 0 : (1 - Math.cos(((u - wait) / turn) * Math.PI)) / 2;
    st.flips = k;
    return (k + e) * Math.PI;
  };
  const update = () => {
    let a = st.angle % Math.PI;
    if (a > Math.PI / 2) a -= Math.PI;
    if (a < -Math.PI / 2) a += Math.PI;
    const ok = Math.abs(a) <= limit;
    if (ok) {
      // Oberseite (die gerade oben liegende Fläche): y = cy + thick/2/cos − tan(a)·u
      const t = Math.tan(Math.abs(a)), hx = hl * Math.cos(a);
      const topC = cy + (thick / 2) / Math.cos(a);
      const hi = topC + t * hx, lo = topC - t * hx;
      shape.min = slopeAxis === 'x' ? [p.x - hx, lo - thick, p.z - hw] : [p.x - hw, lo - thick, p.z - hx];
      shape.max = slopeAxis === 'x' ? [p.x + hx, hi, p.z + hw] : [p.x + hw, hi, p.z + hx];
      shape.low = lo;
      // +a senkt die Seite +slopeAxis (Darstellung: rotation.x = a bzw. rotation.z = −a)
      shape.dir = a > 0 ? -1 : 1;
      if (sid === null) sid = level.world.add(shape); else level.world.update(sid);
    } else if (sid !== null) { level.world.remove(sid); sid = null; }
  };
  st.angle = angleAt(st.t);
  update();
  const handle = {
    get angle() { return st.angle; }, get flips() { return st.flips; }, get solid() { return sid !== null; }, get warn() { return st.warn; },
    start() { st.running = true; }, stop() { st.running = false; },
    info: () => ({ angle: +st.angle.toFixed(3), flips: st.flips, solid: sid !== null, warn: st.warn }),
  };
  if (spec.id) level.named.set(spec.id, handle);
  level.onStep((dt) => {
    if (!st.running) return;
    st.t += dt;
    st.angle = angleAt(st.t);
    update();
  });
  if (level.view) {
    const style = spec.style ?? 'stein';
    const S = STYLES[style] ?? STYLES.stein;
    const g = slabGeo(sz[0], sz[1], thick, style, p.z * 0.13);
    g.translate(0, thick / 2, 0);
    // Unterseite als zweite Lauffläche (nach der Wende oben): helleres Raster
    const under = box(sz[0] * 0.96, 0.04, sz[1] * 0.96, 0, -thick / 2 - 0.01, 0, S.top, { r: 0.02, seg: 1, bottomShade: 1.05 });
    const mesh = new THREE.Mesh(merge([g, under]), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, emissive: 0xff5a1a, emissiveIntensity: 0 }));
    mesh.castShadow = true; mesh.receiveShadow = true;
    const root = new THREE.Group();
    root.position.set(p.x, cy, p.z);
    root.add(mesh);
    // Achslager an beiden Enden
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, (rotAxis === 'x' ? sz[0] : sz[1]) + 0.6, 10), new THREE.MeshStandardMaterial({ color: 0x5a5a66, roughness: 0.4, metalness: 0.6 }));
    if (rotAxis === 'x') axle.rotation.z = Math.PI / 2; else axle.rotation.x = Math.PI / 2;
    axle.position.set(p.x, cy, p.z);
    addObject(level, axle);
    let t = 0;
    addObject(level, root, (dt) => {
      t += dt;
      if (rotAxis === 'x') mesh.rotation.set(st.angle, 0, 0); else mesh.rotation.set(0, 0, -st.angle);
      mesh.material.emissiveIntensity = st.warn ? 0.25 + 0.25 * Math.sin(t * 22) : 0;
    });
  }
  return handle;
}

export function buildDrehplattform(level, spec) {
  return (spec.axis ?? 'y') === 'y' ? buildDrehY(level, spec) : buildDrehFlip(level, spec);
}

export const TYPES = { schwankplattform: buildSchwankplattform, drehplattform: buildDrehplattform };
