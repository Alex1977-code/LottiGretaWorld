// Welt-5-Bausteine Savanne (Bauplan 5-4 „Startsäule: Röhrenkanone schießt ca. 40 m zum nächsten Berg … Gipfel mit
// Drehbrücke und Kanone“).
//
// roehrenkanone – Kanonenröhre: hineinspringen (auf der Öffnung landen) oder auf ihr stehen + Ducken → die Figur
//   rutscht hinein (unsichtbar), die Röhre lädt `charge` s (zittert), dann schießt sie die Figur in hohem Bogen genau auf
//   `to` (Fußpunkt; ≈ 40 m weit ohne Weiteres). Unterwegs sammelt die Figur Münzen; state 'cannon' (phase =
//   Flugfortschritt 0..1), die Kamera folgt (CameraRig, im Flug schnell nachgeführt über player.camTrack = 16). Klone
//   reisen mit (wie in der Röhre).
//   { type: 'roehrenkanone', id, pos: [x, y, z] (Fuß der Röhre, Mitte), height: 2.2, radius: 1.0, to: [x, y, z],
//     arc: (m Scheitel über dem höheren Punkt; Standard max(6, 0,3·Abstand)), gravity: 30, charge: 0.55,
//     enter: 'both' | 'land' | 'crouch', color: 'gruen' | 'gold' | 'rot', onFire: Aktion, hidden }
//   level.named.get(id) = { shots, state ('idle' | 'load' | 'fly'), flightTime, from, to, fire(player), info() }
// drehbruecke – Brücke, die sich um eine senkrechte Achse durch ihre Mitte dreht (trägt Figuren und Gegner mit,
//   Kollision: Kette überlappender Zylinder mit mover.dyaw wie die Drehplattform).
//   { type: 'drehbruecke', id, pos: [x, y, z] (Drehpunkt = Mitte der Oberseite), length: 10, width: 2.4, thick: 0.4,
//     yaw: 0 (Startrichtung: 0 = Brücke entlang X, π/2 = entlang Z), mode: 'step' (steht wait s, dreht in turn s um
//     step Grad) | 'spin' (stetig speed rad/s) | 'signal' (dreht je Signal { toggle: id } bzw. start() um step Grad),
//     step: 90, wait: 2.5, turn: 1.5, warnT: 0.6, speed: 0.5, dir: 1 (+ = gegen den Uhrzeigersinn von oben),
//     phase: 0 (s Versatz), post: true (Säule darunter), postDown: 8, style: 'holz' | 'stein' }
//   level.named.get(id) = { angle (rad), turns, turning, warn, start(), stop(), toggle(), info() }
// Modelle aus der Registry, sobald es sie gibt: 'roehrenkanone' ({ height, radius, color }, state { anim: 'idle' | 'load' |
// 'fire', k }), 'drehbruecke' ({ length, width, thick, style }); sonst eigene Geometrie.

import * as THREE from 'three';
import { v3, lin, mixc, smooth, colorize, merge, hex, box, addObject, addStatic } from '../kit.js';
import { figures } from '../w2kit.js';
import { flightCtl, collectNear, runAction, visDt } from '../../entities/gimmick.js';
import { hasModel, getModel } from '../../models/index.js';

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ Röhrenkanone

const PIPE_COL = { gruen: [0x3ec44a, 0x2a8a34, 0xaef09a], gold: [0xf2c23a, 0xb8862a, 0xfff0a8], rot: [0xe84a3a, 0xa82a22, 0xffb0a0] };

function cannonGeo(h, r, color) {
  const [c, d, l] = (PIPE_COL[color] ?? PIPE_COL.gruen).map((x) => lin(hex(x)));
  const parts = [];
  const body = new THREE.CylinderGeometry(r * 0.86, r * 0.92, h - 0.5, 24, 3, true);
  body.translate(0, (h - 0.5) / 2, 0);
  parts.push(colorize(body.toNonIndexed(), (p, n, o) => {
    const band = Math.abs(((p.y / 0.55) % 1) - 0.5) < 0.08;
    mixc(d, c, smooth(-0.8, 0.8, n.x * 0.6 + n.z * 0.4), o);
    if (band) mixc(o, l, 0.35, o);
  }));
  // dicker Rand oben (Öffnung) mit dunklem Inneren
  const rim = new THREE.TorusGeometry(r * 0.9, r * 0.16, 10, 28);
  rim.rotateX(Math.PI / 2);
  rim.translate(0, h - 0.32, 0);
  parts.push(colorize(rim.toNonIndexed(), (p, n, o) => mixc(c, l, smooth(0, 1, n.y), o)));
  const lip = new THREE.CylinderGeometry(r, r, 0.42, 24, 1, true);
  lip.translate(0, h - 0.32, 0);
  parts.push(colorize(lip.toNonIndexed(), (p, n, o) => mixc(d, c, smooth(-0.6, 0.9, n.x * 0.6 + n.z * 0.4), o)));
  const hole = new THREE.CircleGeometry(r * 0.78, 24);
  hole.rotateX(-Math.PI / 2);
  hole.translate(0, h - 0.18, 0);
  parts.push(colorize(hole.toNonIndexed(), (p, n, o) => { o[0] = 0.02; o[1] = 0.02; o[2] = 0.03; }));
  // Sockel mit Nieten-Ring (Kanonen-Look)
  const base = new THREE.CylinderGeometry(r * 1.08, r * 1.16, 0.5, 24);
  base.translate(0, 0.25, 0);
  parts.push(colorize(base.toNonIndexed(), (p, n, o) => mixc(lin(0x3a3a46), lin(0x6a6a78), smooth(-0.5, 1, n.y), o)));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    const s = new THREE.SphereGeometry(0.07, 6, 4);
    s.translate(Math.cos(a) * r * 1.13, 0.28, Math.sin(a) * r * 1.13);
    parts.push(colorize(s.toNonIndexed(), (p, n, o) => { o[0] = 0.85; o[1] = 0.72; o[2] = 0.3; }));
  }
  return merge(parts);
}

/** Zielmarke am Landepunkt (flacher Ring mit Pfeil, leuchtend) – zeigt, wohin die Kanone schießt. */
function targetGeo(r) {
  const ring = new THREE.RingGeometry(r * 0.72, r, 32);
  ring.rotateX(-Math.PI / 2);
  const inner = new THREE.RingGeometry(r * 0.25, r * 0.38, 24);
  inner.rotateX(-Math.PI / 2);
  const a = lin(0xffe84a), b = lin(0xff7a2a);
  return merge([colorize(ring.toNonIndexed(), (p, n, o) => mixc(a, b, 0.3, o)), colorize(inner.toNonIndexed(), (p, n, o) => mixc(a, b, 0.6, o))]);
}

export function buildRoehrenkanone(level, spec) {
  const p = v3(spec.pos);
  const h = spec.height ?? 2.2, r = spec.radius ?? 1.0;
  const to = v3(spec.to ?? [p.x, p.y, p.z - 40]);
  const top = p.y + h;
  const dist = Math.hypot(to.x - p.x, to.z - p.z);
  const arc = spec.arc ?? Math.max(6, dist * 0.3);
  const charge = spec.charge ?? 0.55;
  const enter = spec.enter ?? 'both';
  const st = { shots: 0, state: 'idle', rider: null, k: 0, shake: 0, flightTime: 0, hidden: !!spec.hidden, from: { x: p.x, y: top, z: p.z }, to };
  // Kollision: Röhre (fest) + Öffnung oben (Zylinder; Ducken darauf wie bei einer Röhre)
  const body = { type: 'cyl', x: p.x, z: p.z, r, y0: p.y, y1: top - 0.04, tag: 'roehrenkanone', owner: st };
  const fire = (pl) => {
    if (st.state !== 'idle' || st.hidden || pl.dead || pl.mode === 'script') return false;
    st.state = 'load'; st.rider = pl; st.k = 0;
    const from = { x: p.x, y: top - 1.2, z: p.z };
    let t = 0, phase = 'in', fl = null;
    const start = { x: pl.pos.x, y: pl.pos.y, z: pl.pos.z };
    pl.ride({
      step(q, dt) {
        t += dt;
        if (phase === 'in') {
          const k = Math.min(1, t / 0.3);
          q.pos.set(start.x + (p.x - start.x) * k, start.y + (from.y - start.y) * k, start.z + (p.z - start.z) * k);
          q.vel.set(0, -3, 0);
          q.setState('pipe');
          if (k >= 1) { phase = 'charge'; t = 0; q.hidden = true; level.sfx('pipe'); }
          return false;
        }
        if (phase === 'charge') {
          st.k = Math.min(1, t / charge);
          q.pos.set(p.x, from.y, p.z);
          q.vel.set(0, 0, 0);
          if (t >= charge) {
            phase = 'fly'; t = 0;
            q.hidden = false;
            fl = flightCtl(level, { x: p.x, y: top - 0.6, z: p.z }, to, { arc, gravity: spec.gravity ?? 30 });
            st.flightTime = fl.T; st.state = 'fly'; st.shots++;
            level.sfx('cannon'); level.shake(0.35);
            level.effects?.ring({ x: p.x, y: top, z: p.z }, r + 0.4);
            level.effects?.dust({ x: p.x, y: top, z: p.z }, 8, 1.2);
            runAction(level, spec.onFire, { pos: [p.x, top + 1, p.z], source: st });
          }
          return false;
        }
        const done = fl.step(q, dt);
        q.phase = Math.min(1, t / fl.T);
        q.setState('cannon');
        q.camTrack = 16;   // Kamera führt im Flug schnell nach (CameraRig: player.camTrack)
        collectNear(level, q, 1.1);
        if (done) { st.state = 'idle'; st.rider = null; st.k = 0; }
        return done;
      },
      exit(q) { q.vel.set(0, -2, 0); q.phase = 0; q.hidden = false; q.camTrack = 0; level.effects?.dust(q.pos, 6); level.sfx('land'); },
    }, { state: 'pipe', kind: 'roehrenkanone' });
    return true;
  };
  const opening = { type: 'cyl', x: p.x, z: p.z, r, y0: top - 0.3, y1: top, tag: 'roehrenkanone_oeffnung', owner: st,
    pipe: enter === 'land' ? null : { x: p.x, z: p.z, top, enterRadius: r * 0.85, enter: (pl) => fire(pl) } };
  let ids = [];
  const setSolid = (on) => { for (const id of ids) level.world.remove(id); ids = on ? [level.world.add(body), level.world.add(opening)] : []; };
  setSolid(!st.hidden);
  const handle = {
    get shots() { return st.shots; }, get state() { return st.state; }, get flightTime() { return st.flightTime; }, from: st.from, to,
    fire, reveal() { if (!st.hidden) return; st.hidden = false; setSolid(true); level.sfx('powerup_appear'); }, hide() { st.hidden = true; setSolid(false); },
    info: () => ({ shots: st.shots, state: st.state, flight: +st.flightTime.toFixed(2), dist: +dist.toFixed(2), arc: +arc.toFixed(2) }),
  };
  if (spec.id) level.named.set(spec.id, handle);
  // Hineinspringen: auf der Öffnung gelandet (mit Fallgeschwindigkeit) → laden
  if (enter !== 'crouch') {
    level.onStep(() => {
      if (st.state !== 'idle' || st.hidden) return;
      for (const f of figures(level)) {
        if (f.mode !== 'ground' || f.ground !== opening || f.state !== 'land' || f.stateTime > 0.02 || (f.lastLandVy ?? 0) > -3) continue;
        if (Math.hypot(f.pos.x - p.x, f.pos.z - p.z) > r * 0.85) continue;
        fire(f);
        break;
      }
    });
  }
  if (level.view) {
    const root = new THREE.Group();
    root.position.set(p.x, p.y, p.z);
    let model = null;
    if (hasModel('roehrenkanone')) { model = getModel('roehrenkanone', { height: h, radius: r, color: spec.color ?? 'gruen' }); root.add(model.root); }
    else {
      const m = new THREE.Mesh(cannonGeo(h, r, spec.color ?? 'gruen'), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.1 }));
      m.castShadow = true; m.receiveShadow = true;
      root.add(m);
    }
    const mark = new THREE.Mesh(targetGeo(1.3), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.75, depthWrite: false }));
    mark.position.set(to.x, to.y + 0.04, to.z);
    mark.renderOrder = 2;
    addObject(level, mark, (dt, t) => { mark.visible = !st.hidden; mark.rotation.y = t * 0.8; mark.material.opacity = 0.55 + 0.25 * Math.sin(t * 4); });
    const holder = {};
    let tt = 0;
    addObject(level, root, (dt) => {
      const d = visDt(level, holder, dt);
      tt += d;
      root.visible = !st.hidden;
      const sh = st.state === 'load' ? 0.05 * st.k : 0;
      root.position.x = p.x + Math.sin(tt * 61) * sh; root.position.z = p.z + Math.cos(tt * 53) * sh;
      root.scale.set(1 + 0.06 * st.k, 1 - 0.05 * st.k, 1 + 0.06 * st.k);
      model?.update?.(d, { anim: st.state === 'load' ? 'load' : st.state === 'fly' ? 'fire' : 'idle', k: st.k });
    });
  }
  return handle;
}

// ------------------------------------------------------------------ Drehbrücke

const BR = {
  holz: { plank: 0xd8a868, plank2: 0xc8964e, beam: 0x8a5a2e, hub: 0x5a3a20, rope: 0xe8d8b0 },
  stein: { plank: 0xe0d2b4, plank2: 0xccbc98, beam: 0x9a8a6c, hub: 0x6a5e4a, rope: 0xc8bca0 },
};

function bridgeGeo(L, W, thick, style) {
  const S = BR[style] ?? BR.holz;
  const parts = [];
  const a = lin(hex(S.plank)), b = lin(hex(S.plank2)), beam = lin(hex(S.beam));
  const n = Math.max(4, Math.round(L / 0.55));
  for (let i = 0; i < n; i++) {
    const x = -L / 2 + (i + 0.5) * (L / n);
    const g = box(L / n - 0.05, thick * 0.6, W, x, -thick * 0.3, 0, S.plank, { r: 0.04, seg: 1 });
    const c = i % 3 === 0 ? b : a;
    parts.push(colorize(g, (p, nn, o) => { o[0] = c[0] * (nn.y > 0.5 ? 1.05 : 0.8); o[1] = c[1] * (nn.y > 0.5 ? 1.05 : 0.8); o[2] = c[2] * (nn.y > 0.5 ? 1.05 : 0.8); }));
  }
  for (const sz of [-1, 1]) {
    const g = box(L + 0.1, thick * 0.55, 0.22, 0, -thick * 0.62, sz * (W / 2 - 0.08), S.beam, { r: 0.05, seg: 1 });
    parts.push(colorize(g, (p, nn, o) => { o[0] = beam[0]; o[1] = beam[1]; o[2] = beam[2]; }));
  }
  const hub = new THREE.CylinderGeometry(0.55, 0.62, thick + 0.1, 16);
  hub.translate(0, -thick / 2 + 0.02, 0);
  parts.push(colorize(hub.toNonIndexed(), (p, nn, o) => mixc(lin(hex(S.hub)), beam, smooth(-0.3, 1, nn.y), o)));
  return merge(parts);
}

export function buildDrehbruecke(level, spec) {
  const p = v3(spec.pos);
  const L = spec.length ?? 10, W = spec.width ?? 2.4, thick = spec.thick ?? 0.4;
  const mode = spec.mode ?? 'step';
  const stepA = (spec.step ?? 90) * DEG * Math.sign(spec.dir ?? 1);
  const wait = spec.wait ?? 2.5, turn = spec.turn ?? 1.5, warnT = spec.warnT ?? 0.6, speed = (spec.speed ?? 0.5) * Math.sign(spec.dir ?? 1);
  const a0 = spec.yaw ?? 0;
  const st = { t: spec.phase ?? 0, angle: a0, turns: 0, turning: false, warn: false, running: mode !== 'signal' && !spec.idle, queue: 0, sigT: 0, sigFrom: a0 };
  const mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: p.x, cz: p.z };
  const rw = W / 2;
  const discs = [];
  const add = (d, r) => { const sh = { type: 'cyl', x: p.x, z: p.z, r, y0: p.y - thick, y1: p.y, mover, tag: 'drehbruecke' }; discs.push({ d, r, shape: sh, id: level.world.add(sh) }); };
  add(0, rw * 1.05);
  for (const sg of [-1, 1]) {
    for (let d = rw * 1.1; d <= L / 2 - rw * 0.98 + 1e-6; d += rw * 1.1) add(sg * d, rw);
    add(sg * (L / 2 - rw), rw);
  }
  const place = () => {
    for (const c of discs) { c.shape.x = p.x + Math.cos(st.angle) * c.d; c.shape.z = p.z - Math.sin(st.angle) * c.d; level.world.update(c.id); }
  };
  place();
  const ease = (u) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, u)))) / 2;
  const angleAt = (t) => {
    if (mode === 'spin') return a0 + t * speed;
    const cyc = wait + turn, k = Math.floor(t / cyc), u = t - k * cyc;
    st.warn = u > wait - warnT && u < wait;
    st.turning = u > wait;
    st.turns = k;
    return a0 + (k + (u <= wait ? 0 : ease((u - wait) / turn))) * stepA;
  };
  const handle = {
    get angle() { return st.angle; }, get turns() { return st.turns; }, get turning() { return st.turning; }, get warn() { return st.warn; }, discs, mover,
    start() { if (mode === 'signal') st.queue++; else st.running = true; }, stop() { st.running = false; },
    toggle() { st.queue++; },
    info: () => ({ angle: +(st.angle / DEG).toFixed(2), turns: st.turns, turning: st.turning, warn: st.warn }),
  };
  if (spec.id) level.named.set(spec.id, handle);
  level.onStep((dt) => {
    const old = st.angle;
    if (mode === 'signal' || (!st.running && st.queue)) {
      // je Signal eine Drehung um step
      if (!st.turning && st.queue > 0) { st.queue--; st.turning = true; st.sigT = 0; st.sigFrom = st.angle; }
      if (st.turning) {
        st.sigT += dt;
        st.angle = st.sigFrom + ease(st.sigT / turn) * stepA;
        if (st.sigT >= turn) { st.angle = st.sigFrom + stepA; st.turning = false; st.turns++; }
      }
    } else if (st.running) { st.t += dt; st.angle = angleAt(st.t); }
    mover.dyaw = st.angle - old;
    if (mover.dyaw) place();
  });
  if (spec.post !== false) {
    const down = spec.postDown ?? 8;
    const g = new THREE.CylinderGeometry(0.42, 0.55, down, 12);
    g.translate(p.x, p.y - thick - down / 2, p.z);
    const S = BR[spec.style ?? 'holz'] ?? BR.holz;
    addStatic(level, colorize(g.toNonIndexed(), (q, n, o) => mixc(lin(hex(S.hub)), lin(hex(S.beam)), smooth(-0.5, 0.8, n.x * 0.5 + n.z * 0.5), o)));
    level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.45, y0: p.y - thick - down, y1: p.y - thick - 0.02, tag: 'drehbruecke:saeule' });
  }
  if (level.view) {
    const root = new THREE.Group();
    root.position.set(p.x, p.y, p.z);
    let model = null;
    if (hasModel('drehbruecke')) { model = getModel('drehbruecke', { length: L, width: W, thick, style: spec.style ?? 'holz' }); root.add(model.root); }
    else {
      const m = new THREE.Mesh(bridgeGeo(L, W, thick, spec.style ?? 'holz'), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, emissive: 0xff7a1a, emissiveIntensity: 0 }));
      m.castShadow = true; m.receiveShadow = true;
      root.add(m);
      root.userData.mesh = m;
    }
    const holder = {};
    let tt = 0;
    addObject(level, root, (dt) => {
      const d = visDt(level, holder, dt);
      tt += d;
      root.rotation.y = st.angle;
      const mm = root.userData.mesh;
      if (mm) mm.material.emissiveIntensity = st.warn ? 0.18 + 0.18 * Math.sin(tt * 20) : 0;
      model?.update?.(d, { angle: st.angle, warn: st.warn, turning: st.turning });
    });
  }
  return handle;
}

export const TYPES = { roehrenkanone: buildRoehrenkanone, drehbruecke: buildDrehbruecke };
