// Bausteine Schienen und Kanonen der Bonuswelt Stern (Präzisierung „Motor und Bausteine Bonuswelten“; Bauplan S-9
// „futuristischer Weltraum mit Kanonen-Helm: Schienenbrett-Fahrt, Kugelwand – auf fliegende Kanonenkugeln springen (20 m
// hoch), Schienennetz: Weichen mit dem Kanonen-Helm umschießen; Stern 3: Weiche umschießen, bevor das Brett fällt“).
//
// schienenbrett – fahrendes Brett auf einem Schienennetz: Knoten (nodes) und Schienen (rails) dazwischen; Betreten startet
//   es (bzw. sofort/Signal), es fährt von Knoten zu Knoten. An einer Weiche nimmt es den eingestellten Abzweig; sonst die
//   (erste) weiterführende Schiene; am Ende hält es oder stürzt ab (und kommt nach respawn s am Start wieder). Weichen
//   haben eine Zielscheibe mit Pfeil: ein Treffer der Kanonenkugel (Kanonen-Helm), Wurfsichel, Panzer, Feuer, Stampfen oder
//   Tatze stellt sie um (auch per Signal toggle an die Weiche, Name `${id}:${Knoten}` bzw. weichen[k].id).
//   { type: 'schienenbrett', id, nodes: { A: [x, y, z], … } (Schienen-Oberkante), rails: [['A', 'B'], …], start: 'A',
//     next: 'B' (erste Fahrtrichtung), weichen: { B: { to: ['C', 'D'], state: 0, pos: [x, y, z] (Zielscheibe; Standard
//     2 m neben dem Knoten, 1,6 m hoch), id, cool: 0.9 (s Sperre nach dem Umstellen) } }, speed: 5, size: [2.6, 0.35, 2.6], go: 'stand' | 'auto' | 'signal',
//     wait: 0.3, end: 'fallen' | 'halt', respawn: 3, color: 'cyan' | 'orange' }
//   level.named.get(id) = { state ('ruhe'|'wartet'|'faehrt'|'ende'|'faellt'|'weg'), from, to, u (0..1), route (besuchte
//     Knoten), weichen { Knoten: { state, to, hits, toggle() } }, mb, start(), stop(), reset(), info() };
//   MovingBox-Tag 'schienenbrett'; Weichen-Form 'weiche'; star(level).boards.
//   Beispiel: { type: 'schienenbrett', id: 'brett', nodes: { A: [0, 0, -10], B: [0, 0, -24], C: [-8, 0, -34], D: [8, 0, -34] },
//               rails: [['A', 'B'], ['B', 'C'], ['B', 'D']], start: 'A', weichen: { B: { to: ['C', 'D'] } } }
//
// kanonenkugel_wand – Kanonen-Wand: übereinander gestaffelte Kanonen schießen im Takt große, langsame Kanonenkugeln quer
//   (dir); die Kugeln sind feste Trittstufen (tragen mit) und verschwinden nach `range` m. So klettert man die Wand hinauf.
//   { type: 'kanonenkugel_wand', id, pos: [x, y, z] (Fußpunkt der untersten Kanone), dir: [1, 0] (Flugrichtung, 90°-Raster),
//     rows: 6, rise: 2.2 (m je Reihe), step: [0, 0, 0] (Versatz je Reihe, z. B. [0, 0, -1.6] = in die Tiefe), range: 14,
//     speed: 3, period: 3.2 (s je Kanone), stagger: 0.55 (s Versatz je Reihe), phase, size: 1.4 (Kugel), idle }
//   level.named.get(id) = { balls (fliegende), shots, start(), stop(), info() }; MovingBox-Tag 'kanonenkugel'; star(level).cannons.

import * as THREE from 'three';
import { v3, addObject, box, lin, mixc, smooth, colorize, merge } from '../kit.js';
import { runAction, visDt } from '../../entities/gimmick.js';
import { defineHandle, star, MovingBox, figures, onRespawn, figureInside, clamp, TAU, cullSphere, useModel, ModelSet } from '../starkit.js';
import { getModel } from '../../models/index.js';
import { bakeRoot } from '../starkit.js';

const BOARD = { cyan: [0x3ad8ff, 0xe8fbff, 0x1a6a9a], orange: [0xff9a2e, 0xffe8c8, 0xa8500a] };

// ===================================================================== Schienenbrett

// ---------------- Modelle: Weiche einpassen, Schienen und Brett zeigen

const WEICHE_ENDS = [4.6, 1.6], WEICHE_IN = 2.2, WEICHE_TARGET = [0.6, 2.35, -2.0];

/** Passt das Weichen-Modell an Knoten k (Zulauf von der übrigen Schiene, zwei Abzweige links/rechts ≈ 20°)? */
function weicheFit(nodes, adj, k, to) {
  if (to.length !== 2) return null;
  const B = nodes[k];
  const inc = (adj[k] ?? []).find((x) => !to.includes(x));
  let ex;
  if (inc) ex = { x: B.x - nodes[inc].x, z: B.z - nodes[inc].z };
  else ex = to.reduce((a, x) => ({ x: a.x + nodes[x].x - B.x, z: a.z + nodes[x].z - B.z }), { x: 0, z: 0 });
  const l = Math.hypot(ex.x, ex.z);
  if (l < 1e-3) return null;
  ex = { x: ex.x / l, z: ex.z / l };
  const yaw = Math.atan2(-ex.z, ex.x);
  const ez = { x: Math.sin(yaw), z: Math.cos(yaw) };   // lokales +Z (Modell: rechts)
  const side = to.map((T) => {
    const rx = nodes[T].x - B.x, rz = nodes[T].z - B.z;
    const lx = rx * ex.x + rz * ex.z, lz = rx * ez.x + rz * ez.z;
    return { s: Math.sign(lz), a: (Math.atan2(Math.abs(lz), lx) * 180) / Math.PI, lx };
  });
  if (side[0].s === side[1].s || side.some((q) => q.s === 0 || q.a < 8 || q.a > 34 || q.lx < WEICHE_ENDS[0] + 0.5)) return null;
  const [tx, ty, tz] = WEICHE_TARGET;
  const target = { x: B.x + ex.x * tx + ez.x * tz, y: B.y + ty, z: B.z + ex.z * tx + ez.z * tz };
  // Abzweig-Enden des Modells (Weltlage) je Ziel
  const ends = side.map((q) => ({ x: B.x + ex.x * WEICHE_ENDS[0] + ez.x * q.s * WEICHE_ENDS[1], y: B.y, z: B.z + ex.z * WEICHE_ENDS[0] + ez.z * q.s * WEICHE_ENDS[1] }));
  return { yaw, ex, ez, dirs: side.map((q) => q.s), target, ends, inc: inc ?? null };
}

/** Schienen (Modell brett_schiene, gebacken), Weichen (Modell weiche bzw. eigene Scheibe), Brett (Modell schienenbrett). */
function viewWithModels(level, spec, { nodes, rails, weichen, size, mb, st, speed }) {
  const posts = spec.posts ?? 0;
  const fits = Object.fromEntries(Object.entries(weichen).filter(([, w]) => w.fit).map(([k, w]) => [k, w]));
  const holder = {};
  for (const [a0, b0] of rails) {
    let a = nodes[a0], b = nodes[b0];
    // an eingepassten Weichen beginnt/endet die Schiene am Ast-Ende bzw. am Zulauf des Modells
    const cut = (node, other) => {
      const w = fits[node];
      if (!w) return null;
      const i = w.to.indexOf(other);
      if (i >= 0) return w.fit.ends[i];
      const B = nodes[node];
      return { x: B.x - w.fit.ex.x * WEICHE_IN, y: B.y, z: B.z - w.fit.ex.z * WEICHE_IN };
    };
    a = cut(a0, b0) ?? a; b = cut(b0, a0) ?? b;
    const l = Math.hypot(b.x - a.x, b.z - a.z), dy = b.y - a.y, L = Math.hypot(l, dy);
    if (L < 0.2) continue;
    const root = getModel('brett_schiene', { kind: 'gerade', length: L, posts });
    root.root.position.set(a.x, a.y, a.z);
    root.root.rotation.set(0, Math.atan2(-(b.z - a.z), b.x - a.x), Math.atan2(dy, l), 'YZX');
    bakeRoot(level, root);
  }
  for (const w of Object.values(weichen)) {
    const n = nodes[w.node];
    if (w.fit) {
      const m = getModel('weiche', {});
      m.root.position.set(n.x, n.y, n.z);
      m.root.rotation.y = w.fit.yaw;
      addObject(level, m.root, (dt) => {
        const d = visDt(level, holder, dt);
        w.flash = Math.max(0, w.flash - d * 2);
        m.update?.(d, { dir: w.fit.dirs[w.state] ?? -1, hit: w.flash });
      });
      continue;
    }
    // ohne Passung: eigene Zielscheibe auf Pfosten mit Pfeil zum eingestellten Abzweig
    ownTarget(level, w, n, nodes, holder, true);
  }
  const bm = getModel('schienenbrett', { size: [size[0], size[2]] });
  let yaw = 0, lx = mb.pos.x, lz = mb.pos.z;
  addObject(level, bm.root, (dt) => {
    const d = visDt(level, holder, dt);
    const fx = mb.pos.x - lx, fz = mb.pos.z - lz;
    if (Math.hypot(fx, fz) > 1e-4 && st.state !== 'faellt') yaw = Math.atan2(-fz, fx);
    else if (st.state === 'ruhe' && nodes[st.to]) { const a = nodes[st.from], b = nodes[st.to]; yaw = Math.atan2(-(b.z - a.z), b.x - a.x); }
    lx = mb.pos.x; lz = mb.pos.z;
    bm.root.position.set(mb.pos.x, mb.pos.y + size[1] - 0.62, mb.pos.z);
    bm.root.rotation.y = yaw;
    bm.root.visible = st.state !== 'weg';
    bm.update?.(d, st.state === 'faellt' ? { anim: 'fall', progress: Math.min(1, st.t / 1) } : { speed: st.state === 'faehrt' ? speed : 0 });
  });
}

/** Eigene Weichen-Zielscheibe (rot-weiß, Pfeil zeigt zum eingestellten Abzweig). */
function ownTarget(level, w, n, nodes, holder, pole = false) {
  const grp = new THREE.Group();
  grp.position.set(w.pos.x, w.pos.y, w.pos.z);
  if (pole) {
    const h = Math.max(0.1, w.pos.y - 0.6 - n.y);
    const pm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, h, 8), new THREE.MeshStandardMaterial({ color: 0xc8d0e0, roughness: 0.4 }));
    pm.position.y = -0.6 - h / 2;
    grp.add(pm);
  }
  const rings = [];
  for (let i = 0; i < 4; i++) {
    const r = new THREE.CircleGeometry(0.62 - i * 0.14, 20);
    r.translate(0, 0, 0.21 + i * 0.002);
    const c = lin(i % 2 ? 0xffffff : 0xff3a4a);
    rings.push(colorize(r.toNonIndexed(), (p, nn, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }));
    const r2 = r.clone(); r2.rotateY(Math.PI);
    rings.push(colorize(r2.toNonIndexed(), (p, nn, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }));
  }
  grp.add(new THREE.Mesh(merge(rings), new THREE.MeshBasicMaterial({ vertexColors: true })));
  const arrowG = new THREE.ConeGeometry(0.28, 0.7, 3);
  arrowG.rotateX(Math.PI / 2);
  const arrow = new THREE.Mesh(arrowG, new THREE.MeshBasicMaterial({ color: 0xffe23a }));
  arrow.position.set(0, 0.85, 0);
  grp.add(arrow);
  addObject(level, grp, (dt) => {
    const d = visDt(level, holder, dt);
    w.flash = Math.max(0, w.flash - d * 2);
    const tgt = nodes[w.to[w.state]];
    if (tgt) arrow.rotation.y = Math.atan2(tgt.x - n.x, tgt.z - n.z);
    grp.scale.setScalar(1 + w.flash * 0.25);
  });
  return grp;
}

export function buildSchienenbrett(level, spec) {
  const nodes = {};
  for (const [k, q] of Object.entries(spec.nodes ?? {})) nodes[k] = v3(q);
  const rails = (spec.rails ?? []).filter(([a, b]) => nodes[a] && nodes[b]);
  const adj = {};
  for (const [a, b] of rails) { (adj[a] ??= []).push(b); (adj[b] ??= []).push(a); }
  const size = spec.size ?? [2.6, 0.35, 2.6];
  const speed = spec.speed ?? 5, wait = spec.wait ?? 0.3, respawn = spec.respawn ?? 3;
  const startN = spec.start ?? Object.keys(nodes)[0];
  const firstNext = spec.next ?? adj[startN]?.[0];
  // Brett liegt auf den Schienen (mit Modell: Deck-Oberseite 0,62 m über der Schienen-Oberkante wie das Modell)
  const boardModel = useModel(spec, 'schienenbrett');
  const lift = boardModel ? Math.max(0.05, 0.62 - size[1]) : 0.15;
  const st = { state: spec.go === 'auto' ? 'faehrt' : 'ruhe', from: startN, to: firstNext, u: 0, t: 0, vy: 0, route: [startN] };
  const p0 = nodes[startN];
  const mb = new MovingBox(level, p0.x, p0.y + lift, p0.z, size[0], size[1], size[2], { tag: 'schienenbrett' });
  const handle = { kind: 'schienenbrett', mb };
  mb.shape.owner = handle;
  // Weichen
  const weichen = {};
  for (const [k, w] of Object.entries(spec.weichen ?? {})) {
    if (!nodes[k]) continue;
    const n = nodes[k];
    const to = (w.to ?? adj[k] ?? []).filter((x) => nodes[x]);
    // Registry-Modell 'weiche' passt, wenn genau zwei Abzweige links/rechts im Winkel der Modell-Äste (≈ 20°) liegen;
    // dann sitzt die Zielscheibe am Signalmast des Modells (w.pos entfällt)
    const fit = boardModel && w.look !== 'eigen' && useModel(spec, 'weiche') ? weicheFit(nodes, adj, k, to) : null;
    const wp = fit ? fit.target : w.pos ? v3(w.pos) : { x: n.x + 2.2, y: n.y + 1.6, z: n.z };
    const wh = {
      node: k, to, state: (w.state ?? 0) % Math.max(1, to.length), hits: 0, pos: wp, flash: 0, last: -9, fit,
      toggle() { if (level.time - wh.last < (w.cool ?? 0.9)) return; wh.last = level.time; wh.state = (wh.state + 1) % Math.max(1, wh.to.length); wh.hits++; wh.flash = 1; level.sfx('switch'); level.effects?.sparks({ x: wp.x, y: wp.y, z: wp.z }, 8); level.signal?.('weiche', { id: spec.id ?? null, node: k, state: wh.state }); },
      start() { wh.toggle(); },
      onHit(kind) { if (['cannon', 'throw', 'shell', 'fire', 'claw', 'pound', 'bomb'].includes(kind)) wh.toggle(); },
      onSichelHit() { wh.toggle(); },
      onPound() { wh.toggle(); },
      info: () => ({ node: k, state: wh.state, to: wh.to[wh.state] ?? null, hits: wh.hits }),
    };
    if (fit) {
      // Modell: Scheibe (Ø 1,24 m, Fläche quer zur Fahrt) samt Signalmast als Ziel – Treffer am Mast zählen mit
      const hx = Math.abs(fit.ex.x) * 0.2 + Math.abs(fit.ez.x) * 0.62, hz = Math.abs(fit.ex.z) * 0.2 + Math.abs(fit.ez.z) * 0.62;
      level.world.add({ type: 'box', min: [wp.x - hx, n.y - 0.4, wp.z - hz], max: [wp.x + hx, wp.y + 0.62, wp.z + hz], owner: wh, tag: 'weiche' });
    } else {
      level.world.add({ type: 'box', min: [wp.x - 0.55, wp.y - 0.6, wp.z - 0.2], max: [wp.x + 0.55, wp.y + 0.6, wp.z + 0.2], owner: wh, tag: 'weiche' });
      // Pfosten der Zielscheibe (fest, dünn)
      level.world.add({ type: 'box', min: [wp.x - 0.08, n.y, wp.z - 0.08], max: [wp.x + 0.08, wp.y - 0.6, wp.z + 0.08], tag: 'weiche-pfosten' });
    }
    weichen[k] = wh;
    level.named.set(w.id ?? `${spec.id ?? 'brett'}:${k}`, wh);
  }
  const carried = () => figures(level).filter((f) => mb.carries(f)).length;
  const reset = () => {
    st.state = spec.go === 'auto' ? 'faehrt' : 'ruhe'; st.from = startN; st.to = firstNext; st.u = 0; st.t = 0; st.vy = 0; st.route = [startN];
    mb.setSolid(true); mb.moveTo(p0.x, p0.y + lift, p0.z, 0); mb.still();
  };
  const nextFrom = (node, came) => {
    const w = weichen[node];
    if (w && w.to.length) return w.to[w.state];
    return (adj[node] ?? []).find((x) => x !== came) ?? null;
  };
  defineHandle(handle, {
    get state() { return st.state; }, get from() { return st.from; }, get to() { return st.to; }, get u() { return st.u; }, get route() { return st.route; },
    weichen, carried, reset,
    start() { if (st.state === 'ruhe' || st.state === 'wartet') st.state = 'faehrt'; },
    stop() { if (st.state === 'faehrt') st.state = 'ende'; },
    info: () => ({ state: st.state, from: st.from, to: st.to, u: +st.u.toFixed(2), route: st.route.join(''), pos: [+mb.pos.x.toFixed(2), +mb.pos.y.toFixed(2), +mb.pos.z.toFixed(2)], weichen: Object.fromEntries(Object.entries(weichen).map(([k, w]) => [k, w.state])) }),
  });
  if (spec.id) level.named.set(spec.id, handle);
  star(level).boards.push(handle);
  onRespawn(level, reset);
  level.onStep((dt) => {
    st.t += dt;
    if (st.state === 'ruhe') {
      mb.still();
      if (spec.go !== 'signal' && spec.go !== 'auto' && carried() > 0) { st.state = 'wartet'; st.t = 0; }
      return;
    }
    if (st.state === 'wartet') { mb.still(); if (st.t >= wait) { st.state = 'faehrt'; level.sfx('rumble'); } return; }
    if (st.state === 'ende') { mb.still(); return; }
    if (st.state === 'faehrt') {
      let a = nodes[st.from], b = nodes[st.to];
      if (!b) { st.state = 'ende'; mb.still(); return; }
      let len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) || 1;
      st.u += (speed * dt) / len;
      while (st.u >= 1) {
        const nx = nextFrom(st.to, st.from);
        st.route.push(st.to);
        if (!nx) {
          st.u = 1;
          if ((spec.end ?? 'fallen') === 'halt') { st.state = 'ende'; }
          else { st.state = 'faellt'; st.t = 0; st.vy = 0; st.dir = { x: (b.x - a.x) / len, z: (b.z - a.z) / len }; level.sfx('fall'); }
          break;
        }
        st.u -= 1;
        const rest = st.u * len;
        st.from = st.to; st.to = nx;
        a = nodes[st.from]; b = nodes[st.to];
        len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) || 1;
        st.u = rest / len;
        if (weichen[st.from]) level.sfx('chain');
      }
      a = nodes[st.from]; b = nodes[st.to];
      const u = clamp(st.u, 0, 1);
      mb.moveTo(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u + lift, a.z + (b.z - a.z) * u, dt);
      return;
    }
    if (st.state === 'faellt') {
      st.vy -= 25 * dt;
      mb.moveTo(mb.pos.x + st.dir.x * speed * dt * 0.7, mb.pos.y + st.vy * dt, mb.pos.z + st.dir.z * speed * dt * 0.7, dt);
      if (st.t > 1.6) { st.state = 'weg'; st.t = 0; mb.setSolid(false); }
      return;
    }
    if (st.state === 'weg') {
      mb.still();
      if (st.t >= respawn) {
        const b = { x0: p0.x - size[0] / 2, x1: p0.x + size[0] / 2, y0: p0.y + lift, y1: p0.y + lift + size[1], z0: p0.z - size[2] / 2, z1: p0.z + size[2] / 2 };
        if (!figureInside(level, b)) { reset(); runAction(level, spec.onRespawn, { pos: [p0.x, p0.y, p0.z] }); }
      }
    }
  });
  if (!level.view) return handle;
  if (boardModel) { viewWithModels(level, spec, { nodes, rails, weichen, size, mb, st, speed }); return handle; }
  // ---------------- Darstellung: Schienen (statisch), Brett (bewegt), Weichen-Zielscheiben mit Pfeil
  const parts = [];
  for (const [a0, b0] of rails) {
    const a = nodes[a0], b = nodes[b0];
    const l = Math.hypot(b.x - a.x, b.z - a.z), dy = b.y - a.y;
    if (l < 0.01) continue;
    const yaw = Math.atan2(b.x - a.x, b.z - a.z), pitch = Math.atan2(dy, l);
    const nx = Math.cos(yaw), nz = -Math.sin(yaw);   // quer zur Schiene
    for (const s of [-1, 1]) {
      const g = new THREE.BoxGeometry(0.16, 0.16, Math.hypot(l, dy) + 0.3);
      g.rotateX(-pitch); g.rotateY(yaw);
      g.translate((a.x + b.x) / 2 + nx * s * (size[0] / 2 - 0.35), (a.y + b.y) / 2 + 0.07, (a.z + b.z) / 2 + nz * s * (size[0] / 2 - 0.35));
      parts.push(colorize(g.toNonIndexed(), (p, n, o) => { const c = lin(0x8ad8ff); const k = n.y > 0.5 ? 1.2 : 0.75; o[0] = c[0] * k; o[1] = c[1] * k; o[2] = c[2] * k; }));
    }
    const nT = Math.max(1, Math.floor(l / 1.4));
    for (let k = 0; k <= nT; k++) {
      const u = k / nT;
      const g = new THREE.BoxGeometry(size[0] * 0.9, 0.08, 0.28);
      g.rotateY(yaw);
      g.translate(a.x + (b.x - a.x) * u, a.y + dy * u - 0.02, a.z + (b.z - a.z) * u);
      parts.push(colorize(g.toNonIndexed(), (p, n, o) => { o[0] = 0.32; o[1] = 0.34; o[2] = 0.46; }));
    }
  }
  for (const w of Object.values(weichen)) {
    const n = nodes[w.node];
    parts.push(box(0.16, Math.max(0.1, w.pos.y - 0.6 - n.y), 0.16, w.pos.x, n.y + (w.pos.y - 0.6 - n.y) / 2, w.pos.z, 0xc8d0e0, { r: 0.04, seg: 1 }));
  }
  if (parts.length) level.view.addStatic(merge(parts), { material: 'world' });
  const C = BOARD[spec.color] ?? BOARD.cyan;
  const bg = box(size[0], size[1], size[2], 0, size[1] / 2, 0, C[0], { r: 0.1, topColor: C[1] });
  const board = new THREE.Mesh(bg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.2, emissive: new THREE.Color(C[0]).multiplyScalar(0.15) }));
  board.castShadow = true; board.receiveShadow = true;
  board.name = 'schienenbrett';
  addObject(level, board, () => { board.position.set(mb.pos.x, mb.pos.y, mb.pos.z); board.visible = st.state !== 'weg'; });
  // Zielscheiben (rot-weiß) mit Richtungspfeil zum eingestellten Abzweig
  const holder = {};
  for (const w of Object.values(weichen)) ownTarget(level, w, nodes[w.node], nodes, holder);
  return handle;
}

// ===================================================================== Kanonenkugel-Wand

export function buildKanonenkugelWand(level, spec) {
  const p = v3(spec.pos);
  let dx = 1, dz = 0;
  if (Array.isArray(spec.dir)) { dx = Math.sign(Math.round(spec.dir[0])); dz = Math.sign(Math.round(spec.dir[1])); if (dx && dz) dz = 0; if (!dx && !dz) dx = 1; }
  const rows = spec.rows ?? 6, rise = spec.rise ?? 2.2, stepV = spec.step ?? [0, 0, 0];
  const range = spec.range ?? 14, speed = spec.speed ?? 3, period = spec.period ?? 3.2, stagger = spec.stagger ?? 0.55;
  const S = spec.size ?? 1.4;
  const st = { running: !spec.idle, shots: 0 };
  const cannons = Array.from({ length: rows }, (_, i) => ({ i, x: p.x + stepV[0] * i, y: p.y + rise * i, z: p.z + (stepV[2] ?? 0) * i, next: (spec.phase ?? 0) + i * stagger, flash: 0 }));
  const maxPer = Math.ceil(range / speed / period) + 1;
  const balls = [];
  for (const c of cannons) for (let k = 0; k < maxPer; k++) {
    const mb = new MovingBox(level, c.x, c.y, c.z, S, S, S, { tag: 'kanonenkugel', solid: false });
    balls.push({ c, mb, s: 0, on: false });
  }
  const handle = {
    kind: 'kanonenkugel_wand',
    get balls() { return balls.filter((b) => b.on).length; }, get shots() { return st.shots; },
    start() { st.running = true; }, stop() { st.running = false; },
    info: () => ({ flying: balls.filter((b) => b.on).length, shots: st.shots, running: st.running }),
  };
  if (spec.id) level.named.set(spec.id, handle);
  star(level).cannons.push(handle);
  // Mündung: S/2 + 0,6 vor der Kanone
  const muzzle = S / 2 + 0.6;
  level.onStep((dt) => {
    for (const b of balls) {
      if (!b.on) { b.mb.still(); continue; }
      b.s += speed * dt;
      const c = b.c;
      b.mb.moveTo(c.x + dx * (muzzle + b.s), c.y, c.z + dz * (muzzle + b.s), dt);
      if (b.s >= range) { b.on = false; b.mb.setSolid(false); }
    }
    if (!st.running) return;
    for (const c of cannons) {
      if (level.time < c.next) continue;
      c.next += period;
      if (c.next <= level.time) c.next = level.time + period;   // nach langer Pause (Test, Signal) nicht nachholen
      const b = balls.find((q) => !q.on && q.c === c);
      if (!b) continue;
      const bx = c.x + dx * muzzle, bz = c.z + dz * muzzle;
      const box3 = { x0: bx - S / 2, x1: bx + S / 2, y0: c.y, y1: c.y + S, z0: bz - S / 2, z1: bz + S / 2 };
      if (figureInside(level, box3)) continue;
      b.on = true; b.s = 0;
      b.mb.moveTo(bx, c.y, bz, 0); b.mb.still();
      b.mb.setSolid(true);
      c.flash = 1;
      st.shots++;
      level.sfx('cannon');
    }
  });
  if (!level.view) return handle;
  // ---------------- Darstellung: Kanonen (statisch), Kugeln (eine Instanz-Gruppe)
  const parts = [];
  const yaw = Math.atan2(-dz, dx);
  for (const c of cannons) {
    const barrel = new THREE.CylinderGeometry(S * 0.62, S * 0.7, 1.4, 16, 1, true);
    barrel.rotateZ(-Math.PI / 2); barrel.rotateY(yaw);
    barrel.translate(c.x + dx * 0.1, c.y + S / 2, c.z + dz * 0.1);
    parts.push(colorize(barrel.toNonIndexed(), (q, n, o) => { const k = 0.35 + 0.35 * smooth(-0.6, 0.9, n.y); o[0] = 0.22 * k * 2; o[1] = 0.24 * k * 2; o[2] = 0.36 * k * 2; }));
    const ring = new THREE.TorusGeometry(S * 0.66, 0.1, 6, 18);
    ring.rotateY(Math.PI / 2 + yaw);
    ring.translate(c.x + dx * 0.78, c.y + S / 2, c.z + dz * 0.78);
    parts.push(colorize(ring.toNonIndexed(), (q, n, o) => { o[0] = 1; o[1] = 0.78; o[2] = 0.25; }));
    parts.push(box(1.2, S * 0.6, 1.2, c.x - dx * 0.5, c.y - 0.1, c.z - dz * 0.5, 0x3a3e58, { r: 0.1 }));
  }
  level.view.addStatic(merge(parts), { material: 'world' });
  const top = cannons[cannons.length - 1], mid = (muzzle + range) / 2;
  const sp = { x: (p.x + top.x) / 2 + dx * mid, y: (p.y + top.y) / 2, z: (p.z + top.z) / 2 + dz * mid };
  const sr = Math.hypot(range / 2 + S, (top.y - p.y) / 2 + S, Math.hypot(top.x - p.x, top.z - p.z) / 2 + S);
  if (useModel(spec, 'kanonenkugel_tritt')) {
    // Registry-Modell: Kanonenkugel mit Gesicht und Trittstern (Ursprung Kugelmitte, Blick +X = Flugrichtung) als
    // Instanz-Gruppe; Rauchschweif und Funkeln des Modells entfallen
    const set = new ModelSet(level, 'kanonenkugel_tritt', { size: S }, balls.length, ['fly']);
    if (set.ok) {
      set.cull(sp, sr);
      const holder = {};
      level.view.onFrame((dt) => {
        visDt(level, holder, dt);
        balls.forEach((b, i) => { if (!b.on) set.hide(i); else set.set(i, b.mb.pos.x, b.mb.pos.y + S / 2, b.mb.pos.z, yaw, 0); });
        set.commit();
      });
      return handle;
    }
  }
  const bg = new THREE.SphereGeometry(S / 2, 18, 12);
  const ballGeo = colorize(bg, (q, n, o) => { const k = smooth(-0.8, 0.9, n.y * 0.7 + n.x * 0.2); mixc(lin(0x1a1c2a), lin(0x5a6280), k, o); });
  const mesh = new THREE.InstancedMesh(ballGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.4 }), balls.length);
  mesh.name = 'kanonenkugeln';
  mesh.castShadow = true;
  cullSphere(mesh, sp, sr);
  const m4 = new THREE.Matrix4(), zero = new THREE.Matrix4().makeScale(0, 0, 0), q4 = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  const holder = {};
  let t = 0;
  addObject(level, mesh, (dt) => {
    t += visDt(level, holder, dt);
    balls.forEach((b, i) => {
      if (!b.on) { mesh.setMatrixAt(i, zero); return; }
      v.set(b.mb.pos.x, b.mb.pos.y + S / 2, b.mb.pos.z);
      e.set(0, 0, -b.s / (S / 2) * (dx || 1)); q4.setFromEuler(e);
      m4.compose(v, q4, one);
      mesh.setMatrixAt(i, m4);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  void TAU;
  return handle;
}

export const TYPES = { schienenbrett: buildSchienenbrett, kanonenkugel_wand: buildKanonenkugelWand };
