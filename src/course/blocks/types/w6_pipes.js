// Welt-6-Baustein Glasröhren-Netz (Bauplan 6-1 „Bergland, verzweigtes Glasröhren-Netz“, 6-5 Glasröhren, 6-A Röhren an den
// Wänden). Ein Netz aus benannten Knoten und Röhren dazwischen: Knoten mit einer Röhre sind Öffnungen (Eingang/Ausgang,
// optional Kanone), Knoten mit mehreren Röhren sind Kreuzungen. An einer Kreuzung wählt die Figur mit dem Stick die
// Röhre (kamerabezogen, wie bei glasspipe); ohne Stick fährt sie geradeaus bzw. in die Richtung der **Weiche** (Pfeil
// über der Kreuzung; per Signal, Aktion { toggle: id } oder Antippen des Pfeils umschaltbar). Röhren sind gebogen
// (Catmull-Rom durch `via`), aus Glas oder Metall mit **Fenstern zum Hindurchsehen**, auch Einbahn. Gegner und
// Gegenstände (Wurfball, Zündkopf, Panzer, Stachelkugel …), die in eine Öffnung geraten, reisen mit und kommen an einer
// anderen Öffnung heraus.
//
// glasnetz:
//   { type: 'glasnetz', id, radius: 1, speed: 12 (m/s), exitSpeed: 7,
//     nodes: { A: [x, y, z], K: [x, y, z], … }        Mittelpunkte (Öffnung = Mitte der Öffnungsfläche)
//     pipes: [{ from: 'A', to: 'K', via: [[x, y, z], …], style: 'glas' | 'metall', color: 0x5a7a9a (Metall),
//               windows: true | [[s0, s1], …] (Metall: Fensterabschnitte in m ab from; true = je 2,5 m Fenster, 1,5 m
//               Metall), oneWay: false (nur from → to), speed?, coins: 0 }]
//     ends: { A: { enter: true, exitSpeed, cannon: { target: [x, y, z], arc: 6 } } }   Öffnungen (Standard: Eingang)
//     weichen: { K: { to: 'C' (Ausfahrt ohne Stick), toggle: ['B', 'C'] (Umschalt-Ziele), signal: 'weiche1',
//                     sign: true (Pfeil), tap: true (Pfeil antippen/Aktion schaltet um) } }
//     carry: true (Gegner/Gegenstände mitnehmen), solid: true (Außenhaut fest, Kamera sieht durch), hidden }
//   Beispiel:
//     { type: 'glasnetz', id: 'netz', nodes: { A: [0, 1.2, -10], K: [0, 1.2, -18], B: [-8, 1.2, -26], C: [8, 1.2, -26] },
//       pipes: [{ from: 'A', to: 'K' }, { from: 'K', to: 'B', via: [[-5, 1.2, -21]] },
//               { from: 'K', to: 'C', via: [[5, 1.2, -21]], style: 'metall', windows: true }],
//       weichen: { K: { to: 'C', toggle: ['B', 'C'], signal: 'weiche' } } }
//   level.named.get(id) = { nodes, edges, rides, carried, switchOf(k), setSwitch(k, to), toggle(k?), ride(fig, k), info() }
// Eingang: in eine Öffnung hineinlaufen/-springen/-fallen. Fahrt im Skript-Modus (player.ride, state 'pipe'), Münzen im
// Rohr werden gesammelt. Kreuzungen: Registry-Modell 'glasroehre_teil' (kind 't' | 'kreuz', bei waagerechten, rechtwinkligen
// Abgängen) bzw. eigene Glaskugel; Röhren selbst: eigene Geometrie (beliebig gebogen).

import * as THREE from 'three';
import { v3, lin, mixc, colorize, merge, addStatic, addObject, hex } from '../kit.js';
import { collectNear, flightCtl, visDt } from '../../entities/gimmick.js';
import { tapTargets } from '../../entities/tap.js';
import { hasModel, getModel } from '../../models/index.js';
import { w6 } from '../w6kit.js';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _t = new THREE.Vector3();

function makeTrack(points) {
  const P = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const curve = P.length > 2 ? new THREE.CatmullRomCurve3(P, false, 'centripetal') : new THREE.LineCurve3(P[0], P[1]);
  const n = P.length;
  const pts = [curve.getPoint(0)], cum = [0];
  let L = 0;
  for (let i = 0; i < n - 1; i++) {
    const m = Math.max(4, Math.ceil(P[i].distanceTo(P[i + 1]) / 0.2));
    for (let k = 1; k <= m; k++) {
      const q = curve.getPoint((i + k / m) / (n - 1));
      L += q.distanceTo(pts[pts.length - 1]);
      pts.push(q); cum.push(L);
    }
  }
  return { curve, pts, cum, L };
}

function pointAt(tr, s, out) {
  const { pts, cum } = tr;
  if (s <= 0) return out.copy(pts[0]);
  if (s >= tr.L) return out.copy(pts[pts.length - 1]);
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; }
  const k = (s - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]);
  return out.copy(pts[lo]).lerp(pts[hi], k);
}

function tangentAt(tr, s, out) {
  pointAt(tr, Math.min(tr.L, s + 0.25), _a);
  pointAt(tr, Math.max(0, s - 0.25), _b);
  return out.subVectors(_a, _b).normalize();
}

/** Kurve über einen Abschnitt [s0, s1] einer Bahn (für Metall-/Fensterstücke). */
function subCurve(tr, s0, s1) {
  const n = Math.max(2, Math.ceil((s1 - s0) / 0.4));
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(pointAt(tr, s0 + ((s1 - s0) * i) / n, new THREE.Vector3()));
  return new THREE.CatmullRomCurve3(pts, false, 'centripetal');
}

const PIPEABLE = (e) => e && e.alive && !e.removed && !e.hidden && !e.carrier && !e.boss && e.pipeable !== false && (e.enemy || e.carryable || e.pipeable);

export function buildGlasnetz(level, spec) {
  const R = spec.radius ?? 1.0;
  const speed = spec.speed ?? 12;
  const exitSpeed = spec.exitSpeed ?? 7;
  const nodeSpec = spec.nodes ?? {};
  const names = Object.keys(nodeSpec);
  if (names.length < 2 || !(spec.pipes?.length)) { console.warn('[glasnetz] braucht nodes und pipes'); return null; }
  const nodes = [], byName = new Map();
  for (const nm of names) {
    const p = v3(nodeSpec[nm]);
    const n = { name: nm, i: nodes.length, pos: new THREE.Vector3(p.x, p.y, p.z), edges: [], cfg: spec.ends?.[nm] ?? {} };
    nodes.push(n); byName.set(nm, n);
  }
  const edges = [];
  for (const ps of spec.pipes) {
    const a = byName.get(ps.from), b = byName.get(ps.to);
    if (!a || !b) { console.warn(`[glasnetz] Röhre ${ps.from} → ${ps.to}: Knoten fehlt`); continue; }
    const pts = [[a.pos.x, a.pos.y, a.pos.z], ...(ps.via ?? []), [b.pos.x, b.pos.y, b.pos.z]];
    const tr = makeTrack(pts);
    const e = { i: edges.length, a: a.i, b: b.i, tr, s0: 0, s1: tr.L, oneWay: !!ps.oneWay, speed: ps.speed ?? speed, spec: ps };
    edges.push(e); a.edges.push(e.i); b.edges.push(e.i);
  }
  for (const n of nodes) {
    n.end = n.edges.length === 1;
    if (!n.edges.length) continue;
    const e = edges[n.edges[0]];
    if (n.end) {
      const into = e.a === n.i ? tangentAt(e.tr, 0.3, new THREE.Vector3()) : tangentAt(e.tr, e.tr.L - 0.3, new THREE.Vector3()).negate();
      n.out = into.clone().negate();
      // Eingang? (Standard ja; Einbahn-Röhre, die hier endet: nur Ausgang)
      const inbound = e.oneWay && e.b === n.i;
      n.enter = n.cfg.enter ?? (!inbound && !n.cfg.cannon);
      n.exitSpeed = n.cfg.exitSpeed ?? exitSpeed;
    }
  }

  const net = {
    id: spec.id ?? null, nodes, edges, R, rides: 0, carried: 0, cool: 0, block: null, carry: [], hidden: !!spec.hidden,
    switches: new Map(),
  };
  w6(level).pipes.push(net);

  // ------------------------------------------------------------------ Weichen
  for (const [nm, ws] of Object.entries(spec.weichen ?? {})) {
    const n = byName.get(nm);
    if (!n || n.end) continue;
    const sw = { node: n, to: ws.to ?? ws.toggle?.[0] ?? null, toggle: ws.toggle ?? null, flips: 0, cfg: ws };
    net.switches.set(nm, sw);
    if (ws.signal) level.onSignal(ws.signal, () => net.toggle(nm));
  }
  net.switchOf = (nm) => net.switches.get(nm)?.to ?? null;
  net.setSwitch = (nm, to) => { const sw = net.switches.get(nm); if (sw && byName.has(to)) { sw.to = to; sw.flips++; level.sfx('switch'); } };
  net.toggle = (nm) => {
    const list = nm ? [net.switches.get(nm)].filter(Boolean) : [...net.switches.values()];
    for (const sw of list) {
      const opts = sw.toggle ?? sw.node.edges.map((ei) => { const e = edges[ei]; return nodes[e.a === sw.node.i ? e.b : e.a].name; });
      if (opts.length < 2) continue;
      const k = opts.indexOf(sw.to);
      sw.to = opts[(k + 1) % opts.length];
      sw.flips++;
    }
    if (list.length) { level.sfx('switch'); level.effects?.sparks(list[0].node.pos, 6); }
  };
  if (spec.id) level.named.set(spec.id, net);

  /** Kante ab Knoten n betreten: { e, dir, s }. */
  const leave = (n, e) => (e.a === n.i ? { e, dir: 1, s: 0 } : { e, dir: -1, s: e.tr.L });
  const headOf = (n, e, out) => (e.a === n.i ? tangentAt(e.tr, 0.6, out) : tangentAt(e.tr, e.tr.L - 0.6, out).negate());
  const passable = (n, e) => !e.oneWay || e.a === n.i;

  /** Weiter an einer Kreuzung: Stick (kamerabezogen) > Weiche > geradeaus. */
  function chooseAt(n, fromEdge, travel, input) {
    let wx = 0, wz = 0, useStick = false;
    if (input && input.mag > 0.3) {
      const cy = level.controlYaw ?? 0, c = Math.cos(cy), s = Math.sin(cy);
      wx = c * input.moveX - s * input.moveY; wz = -s * input.moveX - c * input.moveY;
      const l = Math.hypot(wx, wz) || 1; wx /= l; wz /= l; useStick = true;
    }
    const sw = net.switches.get(n.name);
    let best = null, bd = -Infinity;
    for (const ei of n.edges) {
      if (ei === fromEdge.i) continue;
      const e = edges[ei];
      if (!passable(n, e)) continue;
      const h = headOf(n, e, _t);
      let d;
      if (useStick) { const hl = Math.hypot(h.x, h.z); d = hl > 0.2 ? (h.x * wx + h.z * wz) / hl : -0.5; }
      else if (sw?.to) d = nodes[e.a === n.i ? e.b : e.a].name === sw.to ? 10 : h.dot(travel);
      else d = h.dot(travel);
      if (d > bd) { bd = d; best = e; }
    }
    return best;
  }

  /** Fahrt-Steuerung (Figur über player.ride, Gegenstände mit who = null). */
  function rider(startNode, who) {
    const st = leave(startNode, edges[startNode.edges[0]]);
    const pos = new THREE.Vector3(), tan = new THREE.Vector3(), travel = new THREE.Vector3(), lastFlat = new THREE.Vector3();
    let v = Math.max(6, who?.hSpeed?.() ?? 6);
    let fly = null, exitNode = null;
    const path = [startNode.name];
    return {
      st, path,
      get exitNode() { return exitNode; },
      step(p, dt, input) {
        if (fly) return fly.step(p, dt);
        v = Math.min(st.e.speed, v + 30 * dt);
        let left = v * dt;
        for (let guard = 0; guard < 6 && left > 0; guard++) {
          const { e } = st;
          const end = st.dir > 0 ? e.tr.L : 0;
          const room = Math.abs(end - st.s);
          if (left < room) { st.s += st.dir * left; left = 0; break; }
          st.s = end; left -= room;
          const n = nodes[st.dir > 0 ? e.b : e.a];
          path.push(n.name);
          if (n.end) {
            exitNode = n;
            if (n.cfg.cannon && who) {
              const c = n.cfg.cannon;
              fly = flightCtl(level, { x: n.pos.x, y: n.pos.y - p.half.y, z: n.pos.z }, v3(c.target), { arc: c.arc ?? 6 });
              level.sfx('swoop'); level.shake(0.25);
              level.effects?.sparks({ x: n.pos.x, y: n.pos.y, z: n.pos.z }, 14);
              return fly.step(p, dt);
            }
            p.pos.set(n.pos.x + n.out.x * 0.25, n.pos.y - p.half.y + n.out.y * 0.25, n.pos.z + n.out.z * 0.25);
            return true;
          }
          tangentAt(e.tr, st.s, travel); if (st.dir < 0) travel.negate();
          const next = chooseAt(n, e, travel, input);
          if (!next) { exitNode = n; return true; }
          Object.assign(st, leave(n, next));
        }
        pointAt(st.e.tr, st.s, pos);
        tangentAt(st.e.tr, st.s, tan); if (st.dir < 0) tan.negate();
        p.pos.set(pos.x, pos.y - p.half.y, pos.z);
        p.vel.copy(tan).multiplyScalar(v);
        if (Math.hypot(tan.x, tan.z) > 0.25) { p.yaw = Math.atan2(-tan.z, tan.x); lastFlat.set(tan.x, 0, tan.z); }
        if (who) collectNear(level, p);
        return false;
      },
      exit(p) {
        if (fly) { fly.exit(p); return; }
        const n = exitNode;
        if (!n?.out) return;
        const o = n.out, sp = n.exitSpeed ?? exitSpeed;
        p.vel.set(o.x * sp, o.y * sp, o.z * sp);
        if (o.y > 0.6) {
          p.vel.y = Math.max(p.vel.y, 11);
          let hx = lastFlat.x, hz = lastFlat.z;
          if (Math.hypot(hx, hz) < 0.1) { hx = 0; hz = 1; }
          const hl = Math.hypot(hx, hz); p.vel.x += (hx / hl) * 3.6; p.vel.z += (hz / hl) * 3.6;
        } else if (o.y > -0.6) p.vel.y += 3.5;
        if (Math.hypot(o.x, o.z) > 0.25) p.yaw = Math.atan2(-o.z, o.x);
        if (who) { net.cool = 0.5; net.block = n.i; level.sfx('pipe'); }
      },
    };
  }

  net.ride = (player, nm) => {
    const n = typeof nm === 'number' ? nodes[nm] : byName.get(nm);
    if (!n?.end || net.hidden) return false;
    const ctl = rider(n, player);
    net.lastRide = ctl;
    player.ride(ctl, { state: 'pipe', kind: 'glasnetz' });
    net.rides++;
    level.sfx('pipe');
    return true;
  };
  net.reveal = () => { net.hidden = false; if (net.root) net.root.visible = true; setSolid(true); level.sfx('powerup_appear'); };
  net.hide = () => { net.hidden = true; if (net.root) net.root.visible = false; setSolid(false); };
  net.info = () => ({
    rides: net.rides, carried: net.carried, inPipe: net.carry.length, last: net.lastRide?.path?.join('>') ?? null,
    switches: Object.fromEntries([...net.switches].map(([k, s]) => [k, s.to])),
    ends: nodes.filter((n) => n.end).map((n) => n.name), junctions: nodes.filter((n) => !n.end && n.edges.length > 1).map((n) => n.name),
  });

  // ------------------------------------------------------------------ Eingänge (Figuren), Mitnahme (Gegenstände)
  const c = new THREE.Vector3(), d = new THREE.Vector3();
  const near = (pt, n, half, inward) => {
    d.subVectors(pt, n.pos);
    const along = d.dot(n.out);
    const lat = Math.sqrt(Math.max(0, d.lengthSq() - along * along));
    return along <= R * 0.5 + half && along >= -R && lat <= R * 0.85 && inward;
  };
  level.onStep((dt) => {
    if (net.cool > 0) net.cool -= dt;
    if (net.hidden) return;
    const p = level.player;
    if (p && net.block !== null && (p.mode === 'ground' || p.mode === 'swim' || p.dead)) net.block = null;
    for (const f of level.players ?? [p]) {
      if (!f || f.dead || f.removedFigure || f.mode === 'script' || f.mode === 'stalk' || net.cool > 0) continue;
      f.center(c);
      let done = false;
      for (const n of nodes) {
        if (!n.end || !n.enter || n.i === net.block) continue;
        const inward = -(f.vel.x * n.out.x + f.vel.y * n.out.y + f.vel.z * n.out.z);
        if (!near(c, n, 0.5, inward > 0.8 || (n.out.y > 0.6 && f.vel.y < -0.5))) continue;
        net.ride(f, n.i); done = true; break;
      }
      if (done) break;
    }
    if (spec.carry !== false) carryItems(dt);
  });

  function carryItems(dt) {
    for (let i = net.carry.length - 1; i >= 0; i--) {
      const k = net.carry[i], e = k.e;
      const fake = { pos: e.pos, vel: e.vel, half: e.half, yaw: e.yaw, setState() {}, hSpeed: () => 8 };
      const done = k.ctl.step(fake, dt, null);
      e.yaw = fake.yaw;
      if (e.model?.root) { e.syncModel?.(); e.model.root.visible = !k.hide; }
      if (done) {
        k.ctl.exit(fake);
        const n = k.ctl.exitNode;
        const can = n?.cfg?.cannon;
        if (can) {
          // Kanonen-Ende: im Bogen ungefähr aufs Ziel (eigene Schwerkraft der Entität ≈ 30–40 m/s²)
          const to = v3(can.target), g = 34, apex = Math.max(n.pos.y, to.y) + (can.arc ?? 6);
          const vy = Math.sqrt(2 * g * Math.max(0.1, apex - n.pos.y)), T = vy / g + Math.sqrt(2 * Math.max(0.01, apex - to.y) / g);
          e.vel.set((to.x - n.pos.x) / T, vy, (to.z - n.pos.z) / T);
        } else e.vel.set(fake.vel.x * 0.8, Math.max(2, fake.vel.y * 0.8), fake.vel.z * 0.8);
        e.grounded = false;
        e.pipeT = level.time + 1.2;
        if (e.model?.root) e.model.root.visible = true;
        e.onPipeExit?.(net, n);
        if (!e.removed && !level.entities.includes(e)) level.entities.push(e);
        net.carry.splice(i, 1);
      }
    }
    for (const n of nodes) {
      if (!n.end || !n.enter) continue;
      for (let i = 0; i < level.entities.length; i++) {
        const e = level.entities[i];
        if (!PIPEABLE(e) || (e.pipeT ?? 0) > level.time) continue;
        e.center(c);
        const inward = -(e.vel.x * n.out.x + e.vel.y * n.out.y + e.vel.z * n.out.z);
        if (!near(c, n, 0.3, inward > 0.3)) continue;
        level.entities.splice(i, 1); i--;
        e.pipeT = level.time + 1.5;
        e.onPipeEnter?.(net, n);
        net.carry.push({ e, ctl: rider(n, null), hide: false });
        net.carried++;
        level.sfx('pipe');
      }
    }
  }

  // Münzen in Röhren
  for (const e of edges) {
    const nc = e.spec.coins ?? 0;
    for (let i = 0; i < nc; i++) {
      const s = e.tr.L * (0.15 + 0.7 * (nc === 1 ? 0.5 : i / (nc - 1)));
      pointAt(e.tr, s, _a);
      level.spawn('coin', { pos: [_a.x, _a.y - 0.45, _a.z], hidden: spec.hidden });
    }
  }

  // Außenhaut: Würfel entlang der Röhren, an den Öffnungen frei, Kreuzungen als Hohlraum
  const skin = [];
  if (spec.solid !== false) {
    const step = Math.max(0.5, R * 0.9), h = R * 0.86;
    const ends = nodes.filter((n) => n.end).map((n) => n.pos);
    for (const e of edges) {
      for (let s = 0; s <= e.tr.L + 1e-6; s += step) {
        pointAt(e.tr, s, _a);
        if (ends.some((q) => q.distanceTo(_a) < R + 0.7)) continue;
        skin.push({ type: 'box', min: [_a.x - h, _a.y - h, _a.z - h], max: [_a.x + h, _a.y + h, _a.z + h], camIgnore: true, noWallSlide: true, tag: 'glasnetz' });
      }
    }
  }
  let skinIds = [];
  function setSolid(on) {
    for (const id of skinIds) level.world.remove(id);
    skinIds = on ? skin.map((s) => level.world.add(s)) : [];
  }
  setSolid(!net.hidden);

  if (level.view) buildVisual(level, net, nodes, edges, R, spec);
  return net;
}

// ------------------------------------------------------------------ Darstellung

function glassMat() {
  return new THREE.MeshStandardMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.3, roughness: 0.05, metalness: 0.05, side: THREE.DoubleSide, depthWrite: false, emissive: 0x0a2a3a });
}

function ringGeo(at, tan, R, tube, color) {
  const g = new THREE.TorusGeometry(R, tube, 8, 32);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan.clone().normalize()));
  g.translate(at.x, at.y, at.z);
  const c = lin(color), dark = mixc(c, [0.55, 0.7, 0.85], 0.35, [0, 0, 0]);
  return colorize(g.toNonIndexed(), (p, n, o) => mixc(dark, c, Math.max(0, n.y * 0.5 + 0.5), o));
}

/** Fenster-Abschnitte eines Metallrohrs (in m ab from) → Liste [s0, s1]. */
function windowList(e) {
  const w = e.spec.windows;
  if (!w) return [];
  if (Array.isArray(w)) return w.map(([a, b]) => [Math.max(0, a), Math.min(e.tr.L, b)]).filter(([a, b]) => b > a);
  const out = [];
  for (let s = 1.5; s + 0.5 < e.tr.L - 1.0; s += 4) out.push([s, Math.min(e.tr.L - 1.0, s + 2.5)]);
  return out;
}

/**
 * Registry-Kreuzung (glasroehre_teil, kind 't' | 'kreuz'), wenn die Röhren an der Kreuzung waagerecht und rechtwinklig
 * abgehen (3 oder 4 Röhren); sonst null (dann eigene Glaskugel).
 */
function junctionModel(n, edges, R) {
  const kind = { 3: 't', 4: 'kreuz' }[n.edges.length];
  if (!kind || !hasModel('glasroehre_teil')) return null;
  const heads = n.edges.map((ei) => {
    const e = edges[ei];
    return e.a === n.i ? tangentAt(e.tr, Math.min(e.tr.L, R * 1.6), new THREE.Vector3()) : tangentAt(e.tr, Math.max(0, e.tr.L - R * 1.6), new THREE.Vector3()).negate();
  });
  if (heads.some((h) => Math.abs(h.y) > 0.2)) return null;
  let a = null, rest = [];
  for (let i = 0; i < heads.length && !a; i++) {
    for (let j = i + 1; j < heads.length; j++) {
      if (heads[i].dot(heads[j]) < -0.96) { a = heads[i]; rest = heads.filter((_, k) => k !== i && k !== j); break; }
    }
  }
  if (!a || rest.some((h) => Math.abs(h.x * a.x + h.z * a.z) > 0.2)) return null;
  let yaw = Math.atan2(-a.z, a.x);
  if (kind === 't' && Math.sin(yaw) * rest[0].x + Math.cos(yaw) * rest[0].z < 0) yaw += Math.PI;   // Abzweig (lokal +Z) zur dritten Röhre
  const m = getModel('glasroehre_teil', { kind, radius: R });
  const c = Math.cos(yaw), s = Math.sin(yaw);
  m.root.position.set(n.pos.x - c * 2 * R, n.pos.y, n.pos.z + s * 2 * R);   // Kreuzungsmitte liegt lokal bei (2R, 0, 0)
  m.root.rotation.y = yaw;
  return m;
}

function buildVisual(level, net, nodes, edges, R, spec) {
  const glass = [], opaque = [], metal = [];
  const tan = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3();
  for (const e of edges) {
    const tr = e.tr;
    const style = e.spec.style ?? 'glas';
    if (style === 'metall') {
      // Metallrohr mit Fenstern: Metall außerhalb der Fenster, Glas in den Fenstern
      const win = windowList(e);
      let s = 0;
      const col = lin(hex(e.spec.color ?? 0x6a86a8)), dark = mixc(col, [0.1, 0.12, 0.16], 0.45, [0, 0, 0]), hi = mixc(col, [1, 1, 1], 0.35, [0, 0, 0]);
      const pushMetal = (a, b) => {
        if (b - a < 0.05) return;
        const tg = new THREE.TubeGeometry(subCurve(tr, a, b), Math.max(2, Math.ceil((b - a) / 0.4)), R + 0.04, 18, false);
        metal.push(colorize(tg.toNonIndexed(), (q, n, o) => mixc(dark, hi, Math.max(0, n.y * 0.6 + 0.45), o)));
      };
      for (const [a, b] of win) {
        pushMetal(s, a);
        glass.push(new THREE.TubeGeometry(subCurve(tr, a, b), Math.max(2, Math.ceil((b - a) / 0.4)), R, 20, false).toNonIndexed());
        // Fensterrahmen
        for (const q of [a, b]) { pointAt(tr, q, p); tangentAt(tr, q, tan); opaque.push(ringGeo(p, tan, R + 0.06, 0.07, 0xd8e4f0)); }
        s = b;
      }
      pushMetal(s, tr.L);
      // Nieten-Bänder
      for (let q = 1; q < tr.L - 0.5; q += 2) { pointAt(tr, q, p); tangentAt(tr, q, tan); if (!win.some(([a, b]) => q > a - 0.1 && q < b + 0.1)) opaque.push(ringGeo(p, tan, R + 0.06, 0.05, 0x3a4658)); }
    } else {
      glass.push(new THREE.TubeGeometry(tr.curve, Math.max(8, Math.ceil(tr.L / 0.45)), R, 22, false).toNonIndexed());
      for (let s = 2; s < tr.L - 1.5; s += 4) { pointAt(tr, s, p); tangentAt(tr, s, tan); opaque.push(ringGeo(p, tan, R + 0.02, 0.045, 0xe8f6ff)); }
    }
    // Glanzstreifen oben
    const streak = [];
    for (let s = 0; s <= tr.L; s += Math.max(0.5, tr.L / 50)) {
      pointAt(tr, s, p); tangentAt(tr, s, tan);
      up.set(0, 1, 0).addScaledVector(tan, -tan.y);
      if (up.lengthSq() < 0.09) up.set(0, 0, 1).addScaledVector(tan, -tan.z);
      up.normalize().multiplyScalar(R * (style === 'metall' ? 1.07 : 0.93));
      streak.push(p.clone().add(up));
    }
    if (streak.length >= 2 && style !== 'metall') {
      const sg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(streak), Math.max(8, streak.length * 2), 0.035, 5, false);
      opaque.push(colorize(sg.toNonIndexed(), (pp, n, o) => { o[0] = 1; o[1] = 1; o[2] = 1; }));
    }
  }
  // Öffnungen (weiße bzw. goldene Ringe), Kreuzungen (Glaskugel mit Bändern oder Registry-Modell)
  const objects = [];
  for (const n of nodes) {
    if (n.end) {
      const gold = !!n.cfg.cannon;
      opaque.push(ringGeo(n.pos, n.out, R + 0.05, 0.11, gold ? 0xffc21a : n.enter ? 0xffffff : 0xffb0a0));
      opaque.push(ringGeo(n.pos.clone().addScaledVector(n.out, -0.28), n.out, R + 0.03, 0.05, gold ? 0xff6a3a : 0x9fd8ff));
    } else if (n.edges.length > 1) {
      const jm = junctionModel(n, edges, R);
      if (jm) objects.push(jm);
      else {
        const sph = new THREE.SphereGeometry(R * 1.22, 22, 14);
        sph.translate(n.pos.x, n.pos.y, n.pos.z);
        glass.push(sph.toNonIndexed());
        opaque.push(ringGeo(n.pos, new THREE.Vector3(0, 1, 0), R * 1.22 + 0.02, 0.08, 0xffffff));
        for (const ei of n.edges) {
          const e = edges[ei];
          const h = e.a === n.i ? tangentAt(e.tr, R * 1.2, new THREE.Vector3()) : tangentAt(e.tr, e.tr.L - R * 1.2, new THREE.Vector3()).negate();
          opaque.push(ringGeo(n.pos.clone().addScaledVector(h, R * 1.15), h, R + 0.06, 0.08, 0xffffff));
        }
      }
    }
  }
  const root = new THREE.Group();
  root.name = 'glasnetz';
  if (glass.length) {
    const g = merge(glass.map((x) => { for (const k of Object.keys(x.attributes)) if (k !== 'position' && k !== 'normal') x.deleteAttribute(k); return x; }));
    const mesh = new THREE.Mesh(g, glassMat());
    mesh.renderOrder = 2;
    mesh.castShadow = false; mesh.receiveShadow = false;
    root.add(mesh);
  }
  if (metal.length) {
    const mm = new THREE.Mesh(merge(metal), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.45 }));
    mm.castShadow = true; mm.receiveShadow = true;
    root.add(mm);
  }
  if (opaque.length) {
    const om = new THREE.Mesh(merge(opaque), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 }));
    om.castShadow = false;
    root.add(om);
  }
  for (const m of objects) root.add(m.root);
  root.visible = !net.hidden;
  net.root = root;
  addObject(level, root);
  // Weichen-Pfeile (zeigen die Ausfahrt ohne Stick; antippen schaltet um)
  for (const sw of net.switches.values()) {
    if (sw.cfg.sign === false) continue;
    const n = sw.node;
    const arrow = new THREE.Group();
    const shaftG = new THREE.BoxGeometry(0.9, 0.16, 0.28); shaftG.translate(0.1, 0, 0);
    const headG = new THREE.ConeGeometry(0.34, 0.6, 3); headG.rotateZ(-Math.PI / 2); headG.translate(0.8, 0, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffd23a, emissive: 0x6a4a00, emissiveIntensity: 0.6, roughness: 0.4 });
    arrow.add(new THREE.Mesh(shaftG, mat), new THREE.Mesh(headG, mat));
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    post.position.y = -0.55;
    const holder = new THREE.Group();
    holder.add(arrow, post);
    holder.position.set(n.pos.x, n.pos.y + R * 1.22 + 1.1, n.pos.z);
    const hv = {};
    let yawNow = null, tt = 0;
    addObject(level, holder, (dt) => {
      const dd = visDt(level, hv, dt);
      tt += dd;
      holder.visible = !net.hidden;
      const to = sw.to;
      let want = 0;
      for (const ei of n.edges) {
        const e = edges[ei];
        const other = nodes[e.a === n.i ? e.b : e.a];
        if (other.name !== to) continue;
        const h = e.a === n.i ? tangentAt(e.tr, R * 1.6, _t) : tangentAt(e.tr, e.tr.L - R * 1.6, _t).negate();
        want = Math.atan2(-h.z, h.x);
      }
      if (yawNow === null) yawNow = want;
      let dy = want - yawNow; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      yawNow += dy * Math.min(1, dd * 10);
      arrow.rotation.y = yawNow;
      arrow.position.y = Math.sin(tt * 3) * 0.08;
    });
    if (sw.cfg.tap !== false) {
      tapTargets(level).add({
        owner: net,
        box: () => ({ min: [n.pos.x - 0.8, n.pos.y + R + 0.4, n.pos.z - 0.8], max: [n.pos.x + 0.8, n.pos.y + R + 1.8, n.pos.z + 0.8] }),
        enabled: () => !net.hidden,
        reach: sw.cfg.reach ?? 3.5,
        hint: false,
        onTap: () => net.toggle(n.name),
      });
    }
  }
}

export const TYPES = { glasnetz: buildGlasnetz };
