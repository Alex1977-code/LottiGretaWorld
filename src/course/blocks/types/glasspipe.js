// Baustein `glasspipe`: Glasröhre (Klarsichtröhre) – die Figur gleitet hindurch (sichtbar im Glas), an
// Gabelungen wählt der Stick den Weg, ein Kanonen-Ende schießt sie in hohem Bogen zu einem Ziel.
//
// Parameter:
//   path:     [[x, y, z], …]   Mittellinie (Catmull-Rom durch die Punkte; ≥ 2 Punkte), Enden = Öffnungen
//   radius:   1.0              Innenradius (m); die Figur gleitet auf der Mittellinie
//   speed:    12               m/s im Rohr
//   oneWay:   false            true → nur der Anfang (path[0]) ist Eingang, alle anderen Enden nur Ausgang
//   enter:    ['start', 'end'] alternativ: welche Hauptenden Eingänge sind
//   branches: [{ at: k, path: [[x, y, z], …], enter?: true, cannon?, exitSpeed? }]  Abzweig am Punkt path[k]
//             der Hauptlinie (0 < k < letzter Index); der Abzweig beginnt dort und endet offen (oder als Kanone)
//   cannon:   { target: [x, y, z], arc: 6 }  Hauptende als Kanone: Flug in hohem Bogen, Landung genau auf target
//             (Fußpunkt; Scheitel arc m über dem höheren Punkt)
//   exitSpeed: 7               m/s beim Herausgleiten (nach oben offene Enden: mindestens 11 m/s hoch)
//   coins:    0                n Münzen gleichmäßig in der Hauptlinie (werden beim Durchgleiten gesammelt; auch
//                              Münzen aus LEVEL.items im Rohr werden gesammelt)
//   solid:    true             Außenhaut fest (Würfel entlang der Linie, an den Öffnungen frei), Kamera sieht durch
//   flush:    false            true → Gegner, die in eine Öffnung laufen, werden hindurchgespült (optional)
//   id:       Name             level.named → { nodes, edges, ride(player, nodeIndex) }
// Eingang: in eine offene Öffnung hineinlaufen/-springen/-fallen (Bewegung ins Rohr hinein). Während der Fahrt
// ist die Figur im Skript-Modus (player.ride, Zustand 'pipe'), Berührungen ruhen; Münzen sammelt die Röhre.
// Beispiel:
//   { type: 'glasspipe', path: [[0, 1, -10], [0, 1, -18], [0, 3, -24], [6, 3, -30]], radius: 1, coins: 5,
//     branches: [{ at: 1, path: [[-6, 1, -22], [-8, 4, -28]] }],
//     cannon: { target: [12, 1, -44], arc: 6 } }
// Modell: eigene Geometrie (Glas wie 'glass_pipe_segment': durchsichtig, weiße Ringe an Enden/Gabelungen,
// Ringbänder alle 4 m, Glanzstreifen oben; Kanonen-Enden mit Goldring).

import * as THREE from 'three';
import { v3, lin, mixc, colorize, merge, addStatic, addObject } from '../kit.js';
import { collectNear, flightCtl } from '../../entities/gimmick.js';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _t = new THREE.Vector3();

/** Dichte Polylinie entlang der Catmull-Rom-Kurve mit Bogenlänge; ctrlS = Bogenlänge an jedem Stützpunkt. */
function makeTrack(points) {
  const P = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const curve = P.length > 2 ? new THREE.CatmullRomCurve3(P, false, 'centripetal') : new THREE.LineCurve3(P[0], P[1]);
  const n = P.length;
  const pts = [curve.getPoint(0)], cum = [0], ctrlS = [0];
  let L = 0;
  for (let i = 0; i < n - 1; i++) {
    const m = Math.max(4, Math.ceil(P[i].distanceTo(P[i + 1]) / 0.2));
    for (let k = 1; k <= m; k++) {
      const q = curve.getPoint((i + k / m) / (n - 1));
      L += q.distanceTo(pts[pts.length - 1]);
      pts.push(q); cum.push(L);
    }
    ctrlS.push(L);
  }
  return { curve, pts, cum, L, ctrlS, ctrl: P };
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
  const d = 0.25;
  pointAt(tr, Math.min(tr.L, s + d), _a);
  pointAt(tr, Math.max(0, s - d), _b);
  return out.subVectors(_a, _b).normalize();
}

export function buildGlassPipe(level, spec) {
  const R = spec.radius ?? 1.0;
  const speed = spec.speed ?? 12;
  const exitSpeed = spec.exitSpeed ?? 7;
  if (!spec.path || spec.path.length < 2) { console.warn('[glasspipe] path braucht mindestens 2 Punkte'); return null; }
  const main = makeTrack(spec.path);
  const tracks = [main];
  const nodes = [], edges = [];
  const node = (pos, cfg) => { nodes.push({ pos: pos.clone(), edges: [], end: !!cfg, cfg: cfg ?? {}, i: nodes.length }); return nodes.length - 1; };
  const edge = (tr, s0, s1, a, b) => { edges.push({ tr, s0, s1, a, b, i: edges.length }); nodes[a].edges.push(edges.length - 1); nodes[b].edges.push(edges.length - 1); };
  const enterList = spec.enter ?? (spec.oneWay ? ['start'] : ['start', 'end']);
  // Hauptlinie: Enden + Gabelungen
  const branches = (spec.branches ?? []).filter((b) => b.at > 0 && b.at < spec.path.length - 1 && b.path?.length);
  const cuts = [...new Set(branches.map((b) => b.at))].sort((a, b) => a - b);
  const start = node(main.ctrl[0], { enter: enterList.includes('start'), side: 'start' });
  const junction = new Map();
  let prev = start, prevS = 0;
  for (const k of cuts) {
    const j = node(main.ctrl[k], null);
    junction.set(k, j);
    edge(main, prevS, main.ctrlS[k], prev, j);
    prev = j; prevS = main.ctrlS[k];
  }
  const endN = node(main.ctrl[main.ctrl.length - 1], { enter: enterList.includes('end') && !spec.cannon, cannon: spec.cannon ?? null, exitSpeed, side: 'end' });
  edge(main, prevS, main.L, prev, endN);
  for (const b of branches) {
    const j = junction.get(b.at);
    const first = main.ctrl[b.at];
    const pts = b.path.slice();
    if (first.distanceTo(v3obj(pts[0])) > 0.05) pts.unshift([first.x, first.y, first.z]);
    const tr = makeTrack(pts);
    tracks.push(tr);
    const e = node(tr.ctrl[tr.ctrl.length - 1], { enter: (b.enter ?? !spec.oneWay) && !b.cannon, cannon: b.cannon ?? null, exitSpeed: b.exitSpeed ?? exitSpeed, side: 'branch' });
    edge(tr, 0, tr.L, j, e);
  }
  // Öffnungsrichtung (nach außen) je Ende
  for (const n of nodes) {
    if (!n.end) continue;
    const e = edges[n.edges[0]];
    const into = e.a === n.i ? tangentAt(e.tr, e.s0 + 0.3, new THREE.Vector3()) : tangentAt(e.tr, e.s1 - 0.3, new THREE.Vector3()).negate();
    n.out = into.clone().negate();
  }

  const net = { id: spec.id ?? null, nodes, edges, R, cool: 0, carry: [], block: null };
  if (spec.id) level.named.set(spec.id, net);

  /** Kante ab Knoten n betreten: { e, dir, s }. */
  const leave = (n, e) => (e.a === n.i ? { e, dir: 1, s: e.s0 } : { e, dir: -1, s: e.s1 });
  /** Richtung, in die eine Kante vom Knoten wegführt. */
  const headOf = (n, e, out) => (e.a === n.i ? tangentAt(e.tr, e.s0 + 0.6, out) : tangentAt(e.tr, e.s1 - 0.6, out).negate());

  /** Weiter an einer Gabelung: Stick-Richtung (kamerabezogen) oder geradeaus. */
  function chooseAt(n, fromEdge, travel, input) {
    let best = null, bd = -Infinity;
    let wx = 0, wz = 0, useStick = false;
    if (input && input.mag > 0.3) {
      const cy = level.controlYaw ?? 0, c = Math.cos(cy), s = Math.sin(cy);
      wx = c * input.moveX - s * input.moveY; wz = -s * input.moveX - c * input.moveY;
      const l = Math.hypot(wx, wz) || 1; wx /= l; wz /= l; useStick = true;
    }
    for (const ei of n.edges) {
      if (ei === fromEdge.i) continue;
      const e = edges[ei];
      const h = headOf(n, e, _t);
      let d;
      if (useStick) { const hl = Math.hypot(h.x, h.z); d = hl > 0.2 ? (h.x * wx + h.z * wz) / hl : -0.5; }
      else d = h.dot(travel);
      if (d > bd) { bd = d; best = e; }
    }
    return best;
  }

  /** Fahrt-Steuerung für player.ride (bzw. für hindurchgespülte Gegner ohne Eingabe). */
  function rider(startNode, who) {
    const st = leave(startNode, edges[startNode.edges[0]]);
    const pos = new THREE.Vector3(), tan = new THREE.Vector3(), travel = new THREE.Vector3(), lastFlat = new THREE.Vector3();
    let v = Math.max(6, who?.hSpeed?.() ?? 6);
    let fly = null, exitNode = null;
    return {
      st,
      step(p, dt, input) {
        if (fly) return fly.step(p, dt);
        v = Math.min(speed, v + 30 * dt);
        let left = v * dt;
        for (let guard = 0; guard < 6 && left > 0; guard++) {
          const { e } = st;
          const end = st.dir > 0 ? e.s1 : e.s0;
          const room = Math.abs(end - st.s);
          if (left < room) { st.s += st.dir * left; left = 0; break; }
          st.s = end; left -= room;
          const n = nodes[st.dir > 0 ? e.b : e.a];
          if (n.end) {
            exitNode = n;
            if (n.cfg.cannon && who) {
              const c = n.cfg.cannon;
              const from = { x: n.pos.x, y: n.pos.y - p.half.y, z: n.pos.z };
              const to = v3(c.target);
              fly = flightCtl(level, from, to, { arc: c.arc ?? 6, onLand: c.onLand });
              level.sfx('swoop');
              level.effects?.sparks({ x: n.pos.x, y: n.pos.y, z: n.pos.z }, 14);
              level.shake(0.25);
              return fly.step(p, dt);
            }
            this.place(p, n.pos, n.out);
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
      place(p, at, out) {
        p.pos.set(at.x + out.x * 0.25, at.y - p.half.y + out.y * 0.25, at.z + out.z * 0.25);
      },
      exit(p) {
        if (fly) { fly.exit(p); return; }
        const n = exitNode;
        if (!n) return;
        const o = n.out, sp = n.cfg.exitSpeed ?? exitSpeed;
        p.vel.set(o.x * sp, o.y * sp, o.z * sp);
        if (o.y > 0.6) {
          // nach oben offen: hochspringen und seitlich neben die Öffnung (Richtung der letzten waagerechten Fahrt)
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

  /** Figur an einem Ende hineinziehen. */
  net.ride = (player, ni) => {
    const n = nodes[ni];
    if (!n?.end) return false;
    const ctl = rider(n, player);
    player.ride(ctl, { state: 'pipe', kind: 'glasspipe' });
    level.sfx('pipe');
    return true;
  };

  // Eingänge prüfen (vor der Figur), Gegner spülen
  const c = new THREE.Vector3(), d = new THREE.Vector3();
  level.onStep((dt) => {
    if (net.cool > 0) net.cool -= dt;
    const p = level.player;
    if (p && net.block !== null && (p.mode === 'ground' || p.mode === 'swim' || p.dead)) net.block = null;
    if (p && !p.dead && p.mode !== 'script' && p.mode !== 'stalk' && net.cool <= 0) {
      p.center(c);
      for (const n of nodes) {
        if (!n.end || !n.cfg.enter || n.i === net.block) continue;
        d.subVectors(c, n.pos);
        const along = d.dot(n.out);
        const lat = Math.sqrt(Math.max(0, d.lengthSq() - along * along));
        if (along > R * 0.5 + 0.5 || along < -R || lat > R * 0.85) continue;
        const inward = -(p.vel.x * n.out.x + p.vel.y * n.out.y + p.vel.z * n.out.z);
        if (inward > 0.8 || (n.out.y > 0.6 && p.vel.y < -0.5)) { net.ride(p, n.i); break; }
      }
    }
    if (spec.flush) flushEnemies(dt);
  });

  function flushEnemies(dt) {
    // eingesogene Gegner weiterbewegen
    for (let i = net.carry.length - 1; i >= 0; i--) {
      const k = net.carry[i];
      const fake = { pos: k.e.pos, vel: k.e.vel, half: k.e.half, yaw: k.e.yaw, setState() {}, hSpeed: () => 6 };
      const done = k.ctl.step(fake, dt, null);
      k.e.yaw = fake.yaw;
      k.e.syncModel?.();
      if (done) {
        k.ctl.exit(fake);
        k.e.vel.set(fake.vel.x * 0.6, Math.max(2, fake.vel.y * 0.6), fake.vel.z * 0.6);
        k.e.grounded = false;
        if (!k.e.removed) level.entities.push(k.e);
        net.carry.splice(i, 1);
      }
    }
    for (const n of nodes) {
      if (!n.end || !n.cfg.enter) continue;
      for (let i = 0; i < level.entities.length; i++) {
        const e = level.entities[i];
        if (!e.enemy || !e.alive || e.pipeT > level.time) continue;
        e.center(c);
        d.subVectors(c, n.pos);
        const along = d.dot(n.out);
        const lat = Math.sqrt(Math.max(0, d.lengthSq() - along * along));
        if (along > 0.6 || along < -R || lat > R * 0.85) continue;
        const inward = -(e.vel.x * n.out.x + e.vel.z * n.out.z);
        if (inward < 0.3) continue;
        level.entities.splice(i, 1); i--;
        e.pipeT = level.time + 1.5;
        net.carry.push({ e, ctl: rider(n, null) });
      }
    }
  }

  // Münzen im Rohr
  const nc = spec.coins ?? 0;
  for (let i = 0; i < nc; i++) {
    const s = main.L * (0.15 + 0.7 * (nc === 1 ? 0.5 : i / (nc - 1)));
    pointAt(main, s, _a);
    level.spawn('coin', { pos: [_a.x, _a.y - 0.45, _a.z] });
  }

  // Außenhaut: Würfel entlang der Linien, an den Öffnungen frei
  if (spec.solid !== false) {
    const step = Math.max(0.5, R * 0.9), h = R * 0.86;
    const ends = nodes.filter((n) => n.end).map((n) => n.pos);
    for (const tr of tracks) {
      for (let s = 0; s <= tr.L + 1e-6; s += step) {
        pointAt(tr, s, _a);
        if (ends.some((q) => q.distanceTo(_a) < R + 0.7)) continue;
        level.world.add({ type: 'box', min: [_a.x - h, _a.y - h, _a.z - h], max: [_a.x + h, _a.y + h, _a.z + h], camIgnore: true, noWallSlide: true, tag: 'glasspipe' });
      }
    }
  }

  if (level.view) buildVisual(level, tracks, nodes, R);
  return net;
}

function v3obj(p) { return new THREE.Vector3(p[0], p[1], p[2]); }

/** Glas (je Röhre eigenes Material, wird mit dem Level freigegeben). */
function glassMat() {
  return new THREE.MeshStandardMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.3, roughness: 0.05, metalness: 0.05, side: THREE.DoubleSide, depthWrite: false, emissive: 0x0a2a3a });
}

/** Ring (Torus) um die Achse tan an der Stelle at. */
function ringGeo(at, tan, R, tube, color) {
  const g = new THREE.TorusGeometry(R, tube, 8, 36);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan.clone().normalize());
  g.applyQuaternion(q);
  g.translate(at.x, at.y, at.z);
  const c = lin(color), dark = mixc(c, [0.55, 0.7, 0.85], 0.35, [0, 0, 0]);
  return colorize(g.toNonIndexed(), (p, n, o) => mixc(dark, c, Math.max(0, n.y * 0.5 + 0.5), o));
}

function buildVisual(level, tracks, nodes, R) {
  const opaque = [];
  const mat = glassMat();
  for (const tr of tracks) {
    const segs = Math.max(8, Math.ceil(tr.L / 0.45));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(tr.curve, segs, R, 22, false), mat);
    tube.renderOrder = 2;
    tube.castShadow = false; tube.receiveShadow = false;
    addObject(level, tube);
    // Ringbänder alle 4 m und Glanzstreifen oben
    const tan = new THREE.Vector3(), up = new THREE.Vector3(), p = new THREE.Vector3();
    for (let s = 2; s < tr.L - 1.5; s += 4) {
      pointAt(tr, s, p); tangentAt(tr, s, tan);
      opaque.push(ringGeo(p, tan, R + 0.02, 0.045, 0xe8f6ff));
    }
    const streak = [];
    for (let s = 0; s <= tr.L; s += Math.max(0.5, tr.L / 60)) {
      pointAt(tr, s, p); tangentAt(tr, s, tan);
      up.set(0, 1, 0).addScaledVector(tan, -tan.y);
      if (up.lengthSq() < 0.09) up.set(0, 0, 1).addScaledVector(tan, -tan.z);
      up.normalize().multiplyScalar(R * 0.93);
      streak.push(p.clone().add(up));
    }
    if (streak.length >= 2) {
      const sg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(streak), Math.max(8, streak.length * 2), 0.035, 5, false);
      opaque.push(colorize(sg.toNonIndexed(), (pp, n, o) => { o[0] = 1; o[1] = 1; o[2] = 1; }));
    }
  }
  // Ringe an Enden und Gabelungen
  for (const n of nodes) {
    const t = n.out ?? new THREE.Vector3(0, 1, 0);
    if (n.end) {
      const gold = !!n.cfg.cannon;
      opaque.push(ringGeo(n.pos, t, R + 0.05, 0.11, gold ? 0xffc21a : 0xffffff));
      opaque.push(ringGeo(n.pos.clone().addScaledVector(t, -0.28), t, R + 0.03, 0.05, gold ? 0xff6a3a : 0x9fd8ff));
    } else {
      opaque.push(ringGeo(n.pos, new THREE.Vector3(0, 1, 0), R + 0.08, 0.1, 0xffffff));
    }
  }
  if (opaque.length) addStatic(level, merge(opaque), { material: 'stone', castShadow: false });
}

export const TYPES = { glasspipe: buildGlassPipe };
