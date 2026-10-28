// Welt-6-Bausteine Floß und Strömung (Bauplan 6-4 „Floßstart im Giftsee → erste Floßstrecke … zweite Floßstrecke …
// Abwärtsströmung (40 m) zur Warp-Box“; 6-2 gefluteter Laderaum). Das lila Giftwasser selbst ist `giftwasser` (Welt 4).
//
// floss – Holzfloß auf dem Wasser (bewegte Plattform): steht eine Figur darauf, legt es nach `wait` s ab und fährt seinen
//   Weg auf der Oberfläche ab (schaukelt, sinkt mit Last leicht ein). In einer Strömung (`stroemung`) fährt es mit deren
//   Tempo – auch bergab. Nach einem Neustart (Tod) liegt es wieder am Start.
//   { type: 'floss', id, pos: [x, y, z] (Start, y = Wasseroberfläche), path: [[x, y, z], …] (Weg ab pos, Oberfläche),
//     speed: 2.5, start: 'stand' | 'auto' | 'signal', wait: 0.6, size: [3, 3] (Deck), style: 'holz' | 'bambus',
//     bob: 0.05, sink: 0.08 (m je Figur), end: 'halt' | 'zurueck' (fährt zurück zum Start) | 'kreis' (Rundkurs) }
//   level.named.get(id) = { state ('wartet'|'faehrt'|'ende'), s (m gefahren), speedNow, start(), stop(), reset(), info() }
// stroemung – Strömungsbahn: fließende Wasser- bzw. Giftoberfläche von `from` nach `to` (auch mit Gefälle = Abwärtsströmung).
//   Gift tötet bei Berührung (wie giftwasser), Wasser trägt Schwimmer (Formflag current). Flöße darin fahren mit `speed`.
//   { type: 'stroemung', id, from: [x, y, z], to: [x, y, z] (Mitte der Oberfläche am Anfang/Ende; achsenparallel),
//     width: 6, speed: 6, fluid: 'gift' | 'wasser', depth: 1.5, kill: (gift) true, foam: true, banks: true (Uferkanten) }
//   level.named.get(id) = { speed, inside(x, z), info() }; w6(level).currents
// Modelle aus der Registry, sobald es sie gibt: 'floss_w6' ({ size: [w, d], style }, Ursprung Mitte unten (Wasserlinie),
// Blick +X = Fahrtrichtung); sonst eigene Geometrie.

import * as THREE from 'three';
import { v3, lin, mixc, smooth, colorize, merge, box, addObject, addStatic } from '../kit.js';
import { MovingBox } from '../w2kit.js';
import { PathMover } from '../../level/PathMover.js';
import { visDt } from '../../entities/gimmick.js';
import { hasModel, getModel } from '../../models/index.js';
import { w6, figures, flatColor, w6Sfx } from '../w6kit.js';

// ------------------------------------------------------------------ Floß

function raftGeo(w, d, style) {
  const parts = [];
  const log = style === 'bambus' ? [0xd8c86a, 0x9aa84a] : [0xb8844a, 0x7a522a];
  const n = Math.max(3, Math.round(d / 0.42));
  for (let i = 0; i < n; i++) {
    const z = -d / 2 + (i + 0.5) * (d / n);
    const g = new THREE.CylinderGeometry(d / n / 2, d / n / 2, w, 10);
    g.rotateZ(Math.PI / 2);
    g.translate(0, 0.2, z);
    const a = lin(log[0]), b = lin(log[1]);
    parts.push(colorize(g.toNonIndexed(), (p, nn, o) => {
      mixc(b, a, smooth(-0.6, 0.9, nn.y), o);
      if (style === 'bambus' && Math.abs(((p.x + 20) % 0.8) - 0.4) < 0.03) mixc(o, b, 0.8, o);
    }));
  }
  for (const x of [-w / 2 + 0.35, w / 2 - 0.35]) parts.push(flatColor(box(0.22, 0.14, d + 0.1, x, 0.42, 0, 0x6a4424, { r: 0.04, seg: 1 }), 0x5a3a20));
  return merge(parts);
}

export function buildFloss(level, spec) {
  const p0 = v3(spec.pos ?? spec.path?.[0] ?? [0, 0, 0]);
  const [w, d] = spec.size ?? [3, 3];
  const H = 0.42;   // Deck über der Wasserlinie
  const pts = [[p0.x, p0.y, p0.z], ...(spec.path ?? []).filter((q, i) => i > 0 || Math.hypot(q[0] - p0.x, q[2] - p0.z) > 0.05)];
  const end = spec.end ?? 'halt';
  const pm = pts.length >= 2 ? new PathMover(pts, { speed: spec.speed ?? 2.5, mode: end === 'kreis' ? 'loop' : 'pingpong', wait: 0 }) : null;
  const base = spec.speed ?? 2.5;
  const st = { state: 'wartet', s: 0, wait: 0, speedNow: 0, t: 0, sinkNow: 0, dir: 1, wasDead: false, yaw: 0 };
  const mb = new MovingBox(level, p0.x, p0.y + H - 0.3, p0.z, w, 0.3, d, { tag: 'floss', camIgnore: true });
  const start = spec.start ?? 'stand';
  const handle = {
    get state() { return st.state; }, get s() { return st.s; }, get speedNow() { return st.speedNow; }, mb,
    start() { if (st.state === 'wartet') { st.state = 'faehrt'; w6Sfx(level, 'splash'); } },
    stop() { if (st.state === 'faehrt') st.state = 'wartet'; },
    reset() {
      if (!pm) return;
      pm.s = 0; pm.dir = 1; pm.pause = 0; pm.at(0, pm.pos);
      st.state = start === 'auto' ? 'faehrt' : 'wartet'; st.s = 0; st.wait = 0; st.dir = 1;
      mb.moveTo(pm.pos.x, pm.pos.y + H - 0.3, pm.pos.z, 0); mb.still();
    },
    info: () => ({ state: st.state, s: +st.s.toFixed(2), speed: +st.speedNow.toFixed(2), x: +mb.pos.x.toFixed(2), y: +mb.pos.y.toFixed(2), z: +mb.pos.z.toFixed(2) }),
  };
  if (start === 'auto') st.state = 'faehrt';
  if (spec.id) level.named.set(spec.id, handle);
  w6(level).rafts.push(handle);
  /** Tempo an der aktuellen Stelle: Grundtempo bzw. Strömung. */
  const speedAt = (x, z) => {
    let v = base;
    for (const c of w6(level).currents) if (c.rafts !== false && c.inside(x, z)) v = Math.max(v, c.speed);
    return v;
  };
  level.onStep((dt) => {
    st.t += dt;
    // Neustart nach Tod: Floß zurück an den Start
    const main = level.player;
    if (main) {
      if (st.wasDead && !main.dead && spec.reset !== false) handle.reset();
      st.wasDead = !!main.dead;
    }
    const n = mb.carried(level);
    if (st.state === 'wartet' && start === 'stand' && n > 0) { st.wait += dt; if (st.wait >= (spec.wait ?? 0.6)) handle.start(); }
    else if (n === 0) st.wait = 0;
    st.sinkNow += ((spec.sink ?? 0.08) * Math.min(3, n) - st.sinkNow) * Math.min(1, dt * 6);
    let x = mb.pos.x, z = mb.pos.z, y = mb.pos.y - (H - 0.3) + st.sinkNow;
    if (pm && st.state === 'faehrt') {
      pm.speed = speedAt(x, z);
      const before = pm.s;
      pm.step(dt);
      st.speedNow = Math.abs(pm.s - before) / dt;
      st.s += Math.abs(pm.s - before);
      x = pm.pos.x; y = pm.pos.y; z = pm.pos.z;
      if (end === 'halt' && pm.s >= pm.length - 1e-4) { st.state = 'ende'; st.speedNow = 0; }
      if (end === 'zurueck' && pm.dir < 0 && pm.s <= 1e-4) { st.state = 'wartet'; pm.dir = 1; st.speedNow = 0; }
      const dl = Math.hypot(pm.delta.dx, pm.delta.dz);
      if (dl > 1e-5) st.yaw = Math.atan2(-pm.delta.dz, pm.delta.dx);
    } else st.speedNow = 0;
    mb.moveTo(x, y + H - 0.3 - st.sinkNow, z, dt);
  });
  if (level.view) {
    const root = new THREE.Group();
    root.name = 'floss';
    let model = null;
    if (hasModel('floss_w6')) { model = getModel('floss_w6', { size: [w, d], style: spec.style ?? 'holz' }); root.add(model.root); }
    else { const m = new THREE.Mesh(raftGeo(w, d, spec.style ?? 'holz'), level.view.mats.world); m.castShadow = true; m.receiveShadow = true; root.add(m); }
    const hv = {};
    let tt = 0;
    addObject(level, root, (dt) => {
      const dd = visDt(level, hv, dt);
      tt += dd;
      const bob = (spec.bob ?? 0.05) * Math.sin(tt * 2.2);
      root.position.set(mb.pos.x, mb.pos.y - (H - 0.3) + bob, mb.pos.z);
      root.rotation.set(Math.sin(tt * 1.7) * 0.03, 0, Math.sin(tt * 1.3 + 1) * 0.03);
      model?.update?.(dd, { speed: st.speedNow });
    });
  }
  return handle;
}

// ------------------------------------------------------------------ Strömung

function flowTexture(fluid) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  const col = fluid === 'gift' ? ['#5a1a8a', '#9a3ae0', '#e8b0ff'] : ['#1a6ac8', '#3ab4f0', '#e8fbff'];
  const gr = g.createLinearGradient(0, 0, 64, 0);
  gr.addColorStop(0, col[0]); gr.addColorStop(0.5, col[1]); gr.addColorStop(1, col[0]);
  g.fillStyle = gr; g.fillRect(0, 0, 64, 128);
  g.strokeStyle = col[2]; g.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const x = 6 + ((i * 23) % 52), y = (i * 37) % 128, l = 18 + (i % 3) * 10;
    g.globalAlpha = 0.45 + (i % 2) * 0.3; g.lineWidth = 2 + (i % 2);
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 4, y + l / 2, x, y + l); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function buildStroemung(level, spec) {
  const a = v3(spec.from), b = v3(spec.to);
  const W = spec.width ?? 6, depth = spec.depth ?? 1.5, speed = spec.speed ?? 6;
  const fluid = spec.fluid === 'wasser' ? 'wasser' : 'gift';
  const alongZ = Math.abs(b.z - a.z) >= Math.abs(b.x - a.x);
  const L = alongZ ? Math.abs(b.z - a.z) : Math.abs(b.x - a.x);
  const dir = alongZ ? { x: 0, z: Math.sign(b.z - a.z) || -1 } : { x: Math.sign(b.x - a.x) || 1, z: 0 };
  const cx = (a.x + b.x) / 2, cz = (a.z + b.z) / 2;
  const x0 = alongZ ? cx - W / 2 : Math.min(a.x, b.x), x1 = alongZ ? cx + W / 2 : Math.max(a.x, b.x);
  const z0 = alongZ ? Math.min(a.z, b.z) : cz - W / 2, z1 = alongZ ? Math.max(a.z, b.z) : cz + W / 2;
  const hi = Math.max(a.y, b.y), lo = Math.min(a.y, b.y);
  const slope = L > 0 ? (a.y - b.y) / L : 0;   // Gefälle in Flussrichtung
  // Oberfläche steigt zur Seite des höheren Endes: Rampe entlang der Achse
  const highAtPlus = alongZ ? (a.z > b.z ? a.y >= b.y : b.y > a.y) : (a.x > b.x ? a.y >= b.y : b.y > a.y);
  const kill = spec.kill ?? fluid === 'gift';
  const cur = { x: dir.x * speed, y: -Math.max(0, slope) * speed * 0.5, z: dir.z * speed };
  const shape = {
    type: hi - lo > 0.01 ? 'ramp' : 'box', axis: alongZ ? 'z' : 'x', dir: highAtPlus ? 1 : -1, low: lo - (kill ? 0.12 : 0),
    min: [x0, lo - depth, z0], max: [x1, hi - (kill ? 0.12 : 0), z1], solid: false, camIgnore: true, tag: 'stroemung',
    ...(kill ? { kill: 'gift', lava: true, poison: true } : { water: true, current: cur }),
  };
  level.world.add(shape);
  const handle = {
    speed, dir, rafts: spec.rafts !== false,
    inside: (x, z) => x >= x0 && x <= x1 && z >= z0 && z <= z1,
    info: () => ({ speed, fluid, slope: +slope.toFixed(3), L: +L.toFixed(2) }),
  };
  w6(level).currents.push(handle);
  if (spec.id) level.named.set(spec.id, handle);
  if (!level.view) return handle;
  // Oberfläche: geneigte Bahn mit fließender Textur
  const g = new THREE.PlaneGeometry(W, L, 1, Math.max(1, Math.round(L / 2)));
  g.rotateX(-Math.PI / 2);   // Breite entlang X, Länge entlang Z (Textur +V zeigt nach −Z)
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, 0.02 + Math.sin(i * 1.7) * 0.03);   // leichte Wellen
  // Lage: Länge in Flussrichtung; Höhe linear von from nach to
  const yaw = Math.atan2(-dir.z, dir.x) - Math.PI / 2;   // lokal −Z → Flussrichtung
  const m4 = new THREE.Matrix4().makeRotationY(yaw);
  const arr = pos.array;
  for (let i = 0; i < pos.count; i++) {
    const lx = arr[i * 3], lz = arr[i * 3 + 2];
    const t = (-lz + L / 2) / L;   // 0 am Anfang (lokal +Z) … 1 am Ende (lokal −Z)
    const y = a.y + (b.y - a.y) * t + arr[i * 3 + 1];
    const v = new THREE.Vector3(lx, 0, lz).applyMatrix4(m4);
    arr[i * 3] = cx + v.x; arr[i * 3 + 1] = y; arr[i * 3 + 2] = cz + v.z;
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  const tex = flowTexture(fluid);
  tex.repeat.set(Math.max(1, Math.round(W / 3)), L / 4);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.25, emissive: fluid === 'gift' ? 0x5a1a8a : 0x0a3a6a, emissiveIntensity: 0.35, transparent: fluid === 'wasser', opacity: fluid === 'wasser' ? 0.85 : 1 });
  const mesh = new THREE.Mesh(g, mat);
  mesh.receiveShadow = true;
  const hv = {};
  addObject(level, mesh, (dt) => { tex.offset.y -= (speed / 4) * visDt(level, hv, dt); });
  if (spec.banks !== false) {
    const parts = [];
    for (const s of [-1, 1]) {
      const bx = alongZ ? cx + s * (W / 2 + 0.3) : cx, bz = alongZ ? cz : cz + s * (W / 2 + 0.3);
      const bl = alongZ ? 0.6 : L, bd = alongZ ? L : 0.6;
      const g2 = new THREE.BoxGeometry(bl, Math.abs(a.y - b.y) + 1.4, bd);
      g2.translate(bx, (a.y + b.y) / 2 - 0.2, bz);
      parts.push(colorize(g2.toNonIndexed(), (q, n, o) => mixc(lin(0x4a3a2a), lin(0x6a8a3a), smooth(-0.2, 0.9, n.y), o)));
    }
    addStatic(level, merge(parts));
  }
  return handle;
}

export const TYPES = { floss: buildFloss, stroemung: buildStroemung };
