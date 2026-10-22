// Welt-3-Bausteine Schienen (Bauplan 3-7 „Schalttafeln fahren auf Schienen, nur solange man draufsteht“; „ein
// Schaltblock kehrt die Schienen um“; „nach dem Wasserfall Tafel nach links kippen“).
//
// schiene – Schienenstrang (orange Rohrschiene mit Klammern, optional Stützen). Alle Stränge mit derselben `net` bilden
//   ein Netz: Enden, die sich treffen (≤ 0,35 m), werden verbunden; endet ein Strang auf einem anderen, entsteht dort
//   eine Weiche. Ecken werden mit `radius` gerundet (Bögen). Fahrtrichtung: von path[0] nach path[last] (dir 1) bzw.
//   umgekehrt (dir −1); der Schaltblock (bzw. das Signal { toggle: net }) kehrt sie für das ganze Netz um.
//   { type: 'schiene', net: 'n1', path: [[x, y, z], …] (y = Schienen-Oberkante), dir: 1, radius: 2 (Bogenradius an
//     Ecken), posts: 0 (Stützenhöhe nach unten, 0 = keine), color }
//   level.named.get(net) = Netz { sign (1|−1), nodes, edges, reverse(), toggle(), boards }
//
// schalttafel – Schalttafel 3 × 3 m auf dem Netz (Modell 'schalttafel', Oberkante 0,75 m über der Schiene). Fährt nur,
//   solange eine Figur (auch ein Klon) darauf steht (sanft an- und abbremsend), und trägt sie mit. An einer Weiche
//   entscheidet die Neigung: Stick seitlich (bezogen auf die Fahrtrichtung) bzw. die Stellung der Figur auf der Tafel –
//   links/rechts → linker/rechter Abzweig, sonst geradeaus. Am Strangende ohne Fortsetzung bleibt sie stehen.
//   { type: 'schalttafel', net: 'n1', at: [x, y, z] (Startpunkt, wird auf die nächste Schiene gesetzt), size: 3,
//     speed: 3.5 (m/s), accel: 6, brake: 10, tilt: 0.3 (Schwelle der Neigung, 0..1), id }
//   level.named.get(id) = { box (MovingBox), pos, edge, s, v, sign, tilt, moving, info() }
//
// schaltblock – Entität (entities/kinds/w3_gimmicks.js, auch als segments-type): Kopfstoß kehrt die Fahrtrichtung
//   aller Schienen des Netzes um.  { kind: 'schaltblock', pos, net: 'n1' | ['n1', 'n2'] }
//
// Beispiel:
//   { type: 'schiene', net: 'n1', path: [[0, 1, -10], [0, 1, -30], [8, 1, -38]], radius: 3 },
//   { type: 'schiene', net: 'n1', path: [[0, 1, -24], [-8, 1, -32]] },          // Weiche bei z −24 (nach links)
//   { type: 'schalttafel', net: 'n1', at: [0, 1, -11] },
//   { kind: 'schaltblock', pos: [3, 4, -12], net: 'n1' }

import * as THREE from 'three';
import { v3, lin, mixc, smooth, colorize, merge, addStatic, addObject, box, hex } from '../kit.js';
import { MovingBox, figures, modelObject, wantOf, snapYaw } from '../w3kit.js';
import { visDt } from '../../entities/gimmick.js';

const JOIN = 0.35;

// ------------------------------------------------------------------ Polylinien mit Bögen

/** Dichte Punktfolge entlang path, Ecken als Bögen (quadratische Bézier über die Ecke) mit Radius r. */
function densify(path, r, step = 0.25) {
  const P = path.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const out = [P[0].clone()];
  const lineTo = (b) => {
    const a = out[out.length - 1];
    const L = a.distanceTo(b);
    const n = Math.max(1, Math.ceil(L / step));
    for (let i = 1; i <= n; i++) out.push(a.clone().lerp(b, i / n));
  };
  for (let i = 1; i < P.length; i++) {
    const B = P[i];
    if (i === P.length - 1 || r <= 0) { lineTo(B); continue; }
    const A = P[i - 1], C = P[i + 1];
    const d1 = B.clone().sub(A), d2 = C.clone().sub(B);
    const l1 = d1.length(), l2 = d2.length();
    d1.normalize(); d2.normalize();
    const turn = Math.acos(Math.max(-1, Math.min(1, d1.dot(d2))));
    if (turn < 0.02) { lineTo(B); continue; }
    const t = Math.min(r * Math.tan(turn / 2), l1 * 0.5, l2 * 0.5);
    const p1 = B.clone().addScaledVector(d1, -t), p2 = B.clone().addScaledVector(d2, t);
    lineTo(p1);
    const arc = (turn * t) / Math.max(1e-3, Math.tan(turn / 2));
    const n = Math.max(3, Math.ceil(arc / step));
    for (let k = 1; k <= n; k++) {
      const u = k / n, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
      out.push(new THREE.Vector3(p1.x * a + B.x * b + p2.x * c, p1.y * a + B.y * b + p2.y * c, p1.z * a + B.z * b + p2.z * c));
    }
  }
  return out;
}

function cumulate(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  return cum;
}

function pointAt(e, s, out) {
  const { pts, cum } = e;
  if (s <= 0) return out.copy(pts[0]);
  if (s >= e.L) return out.copy(pts[pts.length - 1]);
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
  const k = (s - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]);
  return out.copy(pts[lo]).lerp(pts[hi], k);
}

const _a = new THREE.Vector3(), _b = new THREE.Vector3();
function tangentAt(e, s, out) {
  pointAt(e, Math.min(e.L, s + 0.3), _a);
  pointAt(e, Math.max(0, s - 0.3), _b);
  return out.subVectors(_a, _b).normalize();
}

// ------------------------------------------------------------------ Netz

function railNet(level, name) {
  level._rails ??= new Map();
  let net = level._rails.get(name);
  if (net) return net;
  net = {
    name, paths: [], boards: [], blocks: [], sign: 1, built: false, nodes: [], edges: [], flips: 0,
    reverse() { net.sign *= -1; net.flips++; level.sfx('switch'); for (const b of net.blocks) b.onNetFlip?.(); },
    toggle() { net.reverse(); },
    info() { return { name, sign: net.sign, nodes: net.nodes.length, edges: net.edges.length, flips: net.flips }; },
  };
  level._rails.set(name, net);
  if (!level.named.has(name)) level.named.set(name, net);
  // Aufbau des Graphen nach allen Bausteinen (erster Simulationsschritt bzw. erste Tafel)
  return net;
}

/** Graph: Stränge an Verbindungspunkten teilen, Knoten verschmelzen. */
function buildGraph(net) {
  if (net.built) return net;
  net.built = true;
  const joins = [];
  for (const p of net.paths) joins.push(p.pts[0], p.pts[p.pts.length - 1]);
  const nodes = [];
  const nodeAt = (v) => {
    for (const n of nodes) if (n.pos.distanceTo(v) <= JOIN) return n;
    const n = { i: nodes.length, pos: v.clone(), edges: [] };
    nodes.push(n);
    return n;
  };
  const edges = [];
  for (const p of net.paths) {
    const cut = new Set();
    for (const j of joins) {
      let best = -1, bd = JOIN;
      for (let k = 1; k < p.pts.length - 1; k++) {
        if (p.cum[k] < 0.5 || p.cum[k] > p.L - 0.5) continue;
        const d = p.pts[k].distanceTo(j);
        if (d < bd) { bd = d; best = k; }
      }
      if (best > 0) { cut.add(best); p.pts[best].copy(j); }
    }
    const idx = [0, ...[...cut].sort((a, b) => a - b), p.pts.length - 1];
    for (let i = 0; i < idx.length - 1; i++) {
      const pts = p.pts.slice(idx[i], idx[i + 1] + 1).map((v) => v.clone());
      if (pts.length < 2) continue;
      const cum = cumulate(pts);
      const e = { i: edges.length, pts, cum, L: cum[cum.length - 1], dir: p.dir, a: null, b: null };
      e.a = nodeAt(pts[0]); e.b = nodeAt(pts[pts.length - 1]);
      e.a.edges.push(e); e.b.edges.push(e);
      edges.push(e);
    }
  }
  net.nodes = nodes; net.edges = edges;
  return net;
}

/** Nächster Punkt des Netzes zu v → { e, s, d }. */
function nearestOnNet(net, v) {
  let best = null;
  for (const e of net.edges) {
    for (let k = 0; k < e.pts.length; k++) {
      const d = e.pts[k].distanceTo(v);
      if (!best || d < best.d) best = { e, s: e.cum[k], d };
    }
  }
  return best;
}

// ------------------------------------------------------------------ Optik der Schiene

const RAIL_R = 0.09;
function railGeometry(pts, posts, color) {
  const parts = [];
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p.x, p.y - RAIL_R, p.z)), false, 'centripetal');
  const L = cumulate(pts).at(-1);
  const tube = new THREE.TubeGeometry(curve, Math.max(8, Math.ceil(L * 2.5)), RAIL_R, 8, false);
  const c0 = lin(hex(color, 0xd8501a)), c1 = mixc(c0, lin(0xffc070), 0.6, [0, 0, 0]);
  parts.push(colorize(tube.toNonIndexed(), (p, n, o) => mixc(c0, c1, smooth(-0.4, 0.9, n.y), o)));
  const k = Math.max(2, Math.round(L));
  for (let i = 0; i <= k; i++) {
    const u = i / k, p = curve.getPointAt(u), t = curve.getTangentAt(u);
    const g = box(0.08, 0.1, 0.32, 0, 0, 0, 0x5a5a6a, { r: 0.02, seg: 0 });
    g.rotateY(Math.atan2(-t.z, t.x));
    g.translate(p.x, p.y - 0.1, p.z);
    parts.push(g);
    if (posts > 0 && i % 2 === 0) {
      const c = new THREE.CylinderGeometry(0.06, 0.08, posts, 8);
      c.translate(p.x, p.y - 0.15 - posts / 2, p.z);
      parts.push(colorize(c.toNonIndexed(), (pp, n, o) => { o[0] = 0.14; o[1] = 0.14; o[2] = 0.18; }));
    }
  }
  return merge(parts);
}

export function buildSchiene(level, spec) {
  if (!spec.path || spec.path.length < 2) { console.warn('[schiene] path braucht mindestens 2 Punkte'); return null; }
  const net = railNet(level, spec.net ?? 'schiene');
  const pts = densify(spec.path, spec.radius ?? 2);
  const cum = cumulate(pts);
  net.paths.push({ pts, cum, L: cum[cum.length - 1], dir: spec.dir < 0 ? -1 : 1 });
  net.built = false;
  if (level.view) addStatic(level, railGeometry(pts, spec.posts ?? 0, spec.color), { material: 'stone' });
  if (!net.stepper) {
    net.stepper = level.onStep(() => {
      if (!net.built) { buildGraph(net); buildBuffers(level, net); }
    });
  }
  return net;
}

/** Endpuffer (gelbe Kugeln) an offenen Strangenden – eine Instanz-Gruppe je Netz. */
function buildBuffers(level, net) {
  if (!level.view || net.buffers) return;
  const ends = net.nodes.filter((n) => n.edges.length === 1);
  if (!ends.length) return;
  const g = new THREE.SphereGeometry(0.15, 12, 8);
  const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: 0xffd21f, roughness: 0.4 }), ends.length);
  const mt = new THREE.Matrix4();
  ends.forEach((n, i) => m.setMatrixAt(i, mt.makeTranslation(n.pos.x, n.pos.y - RAIL_R, n.pos.z)));
  m.castShadow = true;
  net.buffers = m;
  addObject(level, m);
}

// ------------------------------------------------------------------ Schalttafel

export function buildSchalttafel(level, spec) {
  const net = railNet(level, spec.net ?? 'schiene');
  const S = spec.size ?? 3;
  const speed = spec.speed ?? 3.5, accel = spec.accel ?? 6, brake = spec.brake ?? 10;
  const tilt0 = spec.tilt ?? 0.3;
  const at = v3(spec.at ?? spec.pos ?? [0, 0, 0]);
  const bx = new MovingBox(level, at.x, at.y + 0.45, at.z, S, 0.3, S, { tag: 'schalttafel' });
  const b = {
    box: bx, net, pos: new THREE.Vector3(at.x, at.y, at.z), edge: null, s: 0, v: 0, tilt: 0, roll: 0, yaw: 0,
    moving: false, stopped: false, junctions: 0, lastChoice: null,
    get sign() { return b.edge ? b.edge.dir * net.sign : net.sign; },
    info() {
      return { x: +b.pos.x.toFixed(3), y: +b.pos.y.toFixed(3), z: +b.pos.z.toFixed(3), v: +b.v.toFixed(3), edge: b.edge?.i ?? -1,
        s: +b.s.toFixed(2), tilt: +b.tilt.toFixed(2), stopped: b.stopped, junctions: b.junctions, lastChoice: b.lastChoice };
    },
  };
  net.boards.push(b);
  if (spec.id) level.named.set(spec.id, b);
  const head = new THREE.Vector3(), tmp = new THREE.Vector3(), cand = new THREE.Vector3();

  const place = () => {
    pointAt(b.edge, b.s, b.pos);
    bx.moveTo(b.pos.x, b.pos.y + 0.45, b.pos.z, level._lastDt ?? 1 / 120);
  };

  /** Neigung −1..1 (+ = links) aus Stick und Stellung der Figuren auf der Tafel. */
  const tiltOf = (riders) => {
    if (!riders.length) return 0;
    const lx = head.z, lz = -head.x;   // links der Fahrtrichtung
    let t = 0;
    for (const p of riders) {
      const w = wantOf(level, p);
      const stick = (w.x * lx + w.z * lz) * w.mag;
      const off = ((p.pos.x - b.pos.x) * lx + (p.pos.z - b.pos.z) * lz) / (S / 2);
      t += Math.max(-1, Math.min(1, stick * 0.85 + off * 0.5));
    }
    return Math.max(-1, Math.min(1, t / riders.length));
  };

  /** An Knoten n weiter: Abzweig nach Neigung. */
  const choose = (n, from) => {
    const opts = [];
    for (const e of n.edges) {
      if (e === from) continue;
      const sg = e.dir * net.sign;
      if (e.a === n && sg > 0) { tangentAt(e, 0.4, cand); opts.push({ e, s: 0, h: cand.clone() }); }
      else if (e.b === n && sg < 0) { tangentAt(e, e.L - 0.4, cand).negate(); opts.push({ e, s: e.L, h: cand.clone() }); }
    }
    if (!opts.length) return null;
    if (opts.length === 1) return opts[0];
    b.junctions++;
    const lx = head.z, lz = -head.x;
    const side = (o) => o.h.x * lx + o.h.z * lz;
    let pick;
    if (b.tilt > tilt0) pick = opts.reduce((m, o) => (side(o) > side(m) ? o : m));
    else if (b.tilt < -tilt0) pick = opts.reduce((m, o) => (side(o) < side(m) ? o : m));
    else pick = opts.reduce((m, o) => (o.h.x * head.x + o.h.z * head.z > m.h.x * head.x + m.h.z * head.z ? o : m));
    b.lastChoice = side(pick) > 0.3 ? 'links' : side(pick) < -0.3 ? 'rechts' : 'gerade';
    return pick;
  };

  level.onStep((dt) => {
    level._lastDt = dt;
    if (!net.built) { buildGraph(net); buildBuffers(level, net); }
    if (!b.edge) {
      const near = nearestOnNet(net, at);
      if (!near) return;
      b.edge = near.e; b.s = near.s;
      place(); bx.still();
      return;
    }
    const sg = b.sign;
    tangentAt(b.edge, b.s, head); if (sg < 0) head.negate();
    const riders = figures(level).filter((p) => bx.carries(p));
    b.tilt = tiltOf(riders);
    const want = riders.length ? speed : 0;
    if (b.v < want) b.v = Math.min(want, b.v + accel * dt); else b.v = Math.max(want, b.v - brake * dt);
    if (b.stopped && riders.length) {
      // Strangende: weiter nur, wenn es (nach Umkehr) wieder einen Weg gibt
      const atEnd = (sg > 0 && b.s >= b.edge.L - 1e-4) || (sg < 0 && b.s <= 1e-4);
      if (!atEnd) b.stopped = false;
      else {
        const n = sg > 0 ? b.edge.b : b.edge.a;
        const nx = choose(n, b.edge);
        if (nx) { b.edge = nx.e; b.s = nx.s; b.stopped = false; } else b.v = 0;
      }
    }
    let left = b.v * dt;
    for (let guard = 0; guard < 6 && left > 1e-6 && !b.stopped; guard++) {
      const s2 = b.edge.dir * net.sign;
      const end = s2 > 0 ? b.edge.L : 0;
      const room = Math.abs(end - b.s);
      if (left < room) { b.s += s2 * left; left = 0; break; }
      b.s = end; left -= room;
      tangentAt(b.edge, b.s, head); if (s2 < 0) head.negate();
      const n = s2 > 0 ? b.edge.b : b.edge.a;
      const nx = choose(n, b.edge);
      if (!nx) { b.stopped = true; b.v = 0; level.sfx('bump'); break; }
      b.edge = nx.e; b.s = nx.s;
    }
    const ox = b.pos.x, oy = b.pos.y, oz = b.pos.z;
    pointAt(b.edge, b.s, tmp);
    b.pos.copy(tmp);
    if (Math.abs(tmp.x - ox) + Math.abs(tmp.y - oy) + Math.abs(tmp.z - oz) > 1e-7) bx.moveTo(tmp.x, tmp.y + 0.45, tmp.z, dt);
    else bx.still();
    b.moving = b.v > 0.05;
    if (Math.hypot(head.x, head.z) > 0.3) b.yaw = Math.atan2(-head.z, head.x);
  });

  if (level.view) {
    const holder = {};
    modelObject(level, 'schalttafel', { size: S }, at.x, at.y, at.z, 0,
      () => ({ anim: b.moving ? 'active' : 'idle', dir: 1 }),
      (root, d) => {
        const dd = visDt(level, holder, d);
        b.roll += ((b.moving || b.tilt ? b.tilt : 0) * 0.12 - b.roll) * Math.min(1, dd * 8);
        root.position.set(b.pos.x, b.pos.y, b.pos.z);
        root.rotation.order = 'YXZ';
        root.rotation.y = snapYaw(b.yaw);
        root.rotation.x = -b.roll;
      });
  }
  return b;
}

export const TYPES = { schiene: buildSchiene, schalttafel: buildSchalttafel };
