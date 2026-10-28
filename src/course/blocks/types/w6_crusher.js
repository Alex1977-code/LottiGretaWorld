// Welt-6-Baustein Quetschblock (Bauplan 6-7 „periodische Quetschblöcke“, „Rille hinter einer Quetschblock-Wand“, „Stempel
// direkt am Start hinter einem Quetschblock“). Ein schwerer Block stößt im Takt in eine Richtung (hinab, hinauf oder zur
// Seite) und fährt langsam zurück. Vorwarnung: er zittert, staubt und die Augen glühen rot. Er schiebt Figuren und Gegner
// vor sich her; **tödlich nur bei echtem Einklemmen** (die Figur kann nicht ausweichen, weil Boden/Wand dahinter ist) –
// wer nur gestreift wird oder Platz hat, wird geschoben. Oben darauf fährt man mit (bewegte Plattform).
//
// quetschblock:
//   { type: 'quetschblock', id, pos: [x, y, z] (Mitte unten in Ruhelage), size: [w, h, d] (2 × 2 × 2),
//     dir: 'down' | 'up' | '+x' | '-x' | '+z' | '-z' (Stoßrichtung), travel: 3 (m Hub), out: 0.25 (s Stoß),
//     hold: 0.6 (s ausgefahren), back: 1.1 (s zurück), wait: 1.4 (s Ruhe), warn: 0.7 (s Vorwarnung), phase: 0 (s Versatz
//     im Takt), mode: 'takt' | 'nah' (stößt, wenn eine Figur näher als near m vor der Stoßseite ist) | 'signal' (start()
//     = ein Stoß), near: 4, style: 'metall' | 'stein' | 'holz', face: true, spikes: false (Stoßseite verletzt bei
//     Berührung), idle: false }
//   level.named.get(id) = { state ('ruhe'|'warn'|'stoss'|'halt'|'zurueck'), k (0..1 ausgefahren), crushes, pushes, cycles,
//                           start(), stop(), fire(), box(), info() }; w6(level).crushers
//   Tod durch Einklemmen: player.die('crush') (deathCause 'crush').
// Modell aus der Registry für style 'metall' (Standard): 'quetschblock' ({ size: [x, y, z], rod }, Gesicht +X = Stoßseite,
// Kolben hinten, Ursprung Körpermitte; state { warn, slam }); bei auf/ab blickt das Gesicht zur Kamera (ohne Kolben).
// 'stein'/'holz' (und ohne Registry): eigene Geometrie (Block mit grimmigem Gesicht).

import * as THREE from 'three';
import { v3, sz3, box, merge, addObject, lin, mixc, smooth, colorize, hex } from '../kit.js';
import { MovingBox } from '../w2kit.js';
import { runAction, visDt } from '../../entities/gimmick.js';
import { hasModel, getModel } from '../../models/index.js';
import { w6, figures, shove, flatColor } from '../w6kit.js';

const DIRS = { down: [0, -1, 0], up: [0, 1, 0], '+x': [1, 0, 0], '-x': [-1, 0, 0], '+z': [0, 0, 1], '-z': [0, 0, -1] };
const STYLE = {
  stein: { body: 0x9a96a8, dark: 0x5a566a, hi: 0xd0ccdc, face: 0x2a2632 },
  metall: { body: 0x7a8696, dark: 0x3e4654, hi: 0xc8d2de, face: 0x1a1e26 },
  holz: { body: 0xb07e48, dark: 0x6a4424, hi: 0xe0b078, face: 0x2a1a10 },
};

/** Block mit Gesicht auf der lokalen +X-Seite (Ursprung Mitte unten). */
function crusherGeo(w, h, d, style, face) {
  const S = STYLE[style] ?? STYLE.stein;
  const parts = [];
  const g = box(w, h, d, 0, h / 2, 0, S.body, { r: Math.min(0.18, w * 0.08), topColor: S.hi, bottomShade: 0.7 });
  const dark = lin(hex(S.dark));
  parts.push(colorize(g, (p, n, o) => {
    // Steinfugen / Nieten-Raster
    const gx = Math.abs(((p.y + 10) % 0.7) - 0.35) < 0.025, gz = Math.abs(((p.z + p.x + 10) % 0.9) - 0.45) < 0.02;
    if (gx || gz) mixc(o, dark, 0.45, o);
  }));
  if (face) {
    const f = S.face, fx = w / 2 + 0.01;
    for (const s of [-1, 1]) {
      const eye = new THREE.BoxGeometry(0.06, h * 0.16, d * 0.16); eye.translate(fx, h * 0.6, s * d * 0.2); parts.push(flatColor(eye, 0xffffff));
      const pupil = new THREE.BoxGeometry(0.08, h * 0.08, d * 0.08); pupil.translate(fx + 0.01, h * 0.58, s * d * 0.18); parts.push(flatColor(pupil, f));
      const brow = new THREE.BoxGeometry(0.1, h * 0.06, d * 0.26); brow.rotateX(s * 0.35); brow.translate(fx + 0.02, h * 0.74, s * d * 0.2); parts.push(flatColor(brow, f));
    }
    const mouth = new THREE.BoxGeometry(0.06, h * 0.14, d * 0.56); mouth.translate(fx, h * 0.28, 0); parts.push(flatColor(mouth, f));
    for (let i = -2; i <= 2; i++) { const t = new THREE.BoxGeometry(0.08, h * 0.06, d * 0.07); t.translate(fx + 0.01, h * 0.33, (i * d * 0.56) / 5); parts.push(flatColor(t, 0xffffff)); }
  }
  return merge(parts);
}

export function buildQuetschblock(level, spec) {
  const p = v3(spec.pos), s = sz3(spec.size, [2, 2, 2]);
  const dv = DIRS[spec.dir ?? 'down'] ?? DIRS.down;
  const travel = spec.travel ?? 3;
  const T = { out: spec.out ?? 0.25, hold: spec.hold ?? 0.6, back: spec.back ?? 1.1, wait: spec.wait ?? 1.4, warn: Math.max(0, spec.warn ?? 0.7) };
  const cyc = T.wait + T.out + T.hold + T.back;
  const mode = spec.mode ?? 'takt';
  const st = { t: spec.phase ?? 0, state: 'ruhe', k: 0, crushes: 0, pushes: 0, cycles: 0, running: !spec.idle && mode === 'takt', fireT: -1, shake: 0 };
  const mb = new MovingBox(level, p.x, p.y, p.z, s.x, s.y, s.z, { tag: 'quetschblock', camIgnore: false });
  const shape = mb.shape;
  const isOwn = (q) => q === shape;
  const handle = {
    get state() { return st.state; }, get k() { return st.k; }, get crushes() { return st.crushes; }, get pushes() { return st.pushes; }, get cycles() { return st.cycles; },
    start() { if (mode === 'takt') st.running = true; else handle.fire(); },
    stop() { st.running = false; },
    fire() { if (st.fireT < 0) st.fireT = 0; },
    box: () => ({ min: [shape.x0, shape.bot, shape.z0], max: [shape.x1, shape.top, shape.z1] }),
    mb,
    info: () => ({ state: st.state, k: +st.k.toFixed(2), crushes: st.crushes, pushes: st.pushes, cycles: st.cycles }),
  };
  shape.owner = handle;
  if (spec.spikes) shape.spikes = true;
  if (spec.id) level.named.set(spec.id, handle);
  w6(level).crushers.push(handle);

  const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
  /** Zustand im Takt bei Zeit u (0 … cyc): Ruhe (mit Vorwarnung am Ende), Stoß, Halt, Zurück. */
  const phaseAt = (u) => {
    if (u < T.wait) return { state: u > T.wait - T.warn ? 'warn' : 'ruhe', k: 0 };
    u -= T.wait; if (u < T.out) return { state: 'stoss', k: (u / T.out) * (u / T.out) };
    u -= T.out; if (u < T.hold) return { state: 'halt', k: 1 };
    u -= T.hold; return { state: 'zurueck', k: 1 - ease(u / T.back) };
  };
  const front = () => {
    // Abstand der Figur vor der Stoßseite (für mode 'nah')
    for (const f of figures(level)) {
      const dx = f.pos.x - p.x, dy = f.pos.y + f.half.y - (p.y + s.y / 2), dz = f.pos.z - p.z;
      const along = dx * dv[0] + dy * dv[1] + dz * dv[2];
      const lat = Math.hypot(dx - dv[0] * along, dy - dv[1] * along, dz - dv[2] * along);
      const half = Math.abs(dv[0]) * s.x / 2 + Math.abs(dv[1]) * s.y / 2 + Math.abs(dv[2]) * s.z / 2;
      if (along > half - 0.2 && along < half + (spec.near ?? 4) && lat < Math.max(s.x, s.y, s.z) * 0.7) return true;
    }
    return false;
  };

  level.onStep((dt) => {
    let ph;
    if (mode === 'takt' && st.running) {
      const before = Math.floor(st.t / cyc);
      st.t += dt;
      if (Math.floor(st.t / cyc) > before) st.cycles++;
      ph = phaseAt(((st.t % cyc) + cyc) % cyc);
    } else {
      if (mode === 'nah' && st.fireT < 0 && front()) st.fireT = 0;
      if (st.fireT >= 0) {
        // ein Stoß: Vorwarnung, Stoß, Halt, Zurück
        st.fireT += dt;
        const u = T.wait - T.warn + st.fireT;
        ph = phaseAt(u);
        if (u >= cyc) { st.fireT = -1; st.cycles++; ph = { state: 'ruhe', k: 0 }; }
      } else ph = { state: 'ruhe', k: 0 };
    }
    if (ph.state !== st.state) {
      if (ph.state === 'warn') level.sfx('rumble');
      if (ph.state === 'halt') { level.sfx('slam'); level.shake(0.35); level.effects?.dust({ x: mb.pos.x + dv[0] * s.x / 2, y: mb.pos.y + (dv[1] < 0 ? 0 : s.y / 2), z: mb.pos.z + dv[2] * s.z / 2 }, 8, 1.3); runAction(level, spec.onSlam, { pos: [mb.pos.x, mb.pos.y + s.y, mb.pos.z], source: handle }); }
    }
    st.state = ph.state;
    const nk = ph.k;
    const off = nk * travel, old = st.k * travel;
    const step = off - old;
    st.k = nk;
    const nx = p.x + dv[0] * off, ny = p.y + dv[1] * off, nz = p.z + dv[2] * off;
    if (Math.abs(step) > 1e-6) pushAhead(step);
    mb.moveTo(nx, ny, nz, dt);
  });

  /** Vor dem Bewegen: alles im Weg (in Stoßrichtung) schieben; geht es nicht weit genug → eingeklemmt. */
  function pushAhead(step) {
    const sgn = Math.sign(step);
    const mx = dv[0] * step, my = dv[1] * step, mz = dv[2] * step;
    // neuer Quader
    const x0 = shape.x0 + mx, x1 = shape.x1 + mx, y0 = shape.bot + my, y1 = shape.top + my, z0 = shape.z0 + mz, z1 = shape.z1 + mz;
    const victims = [...figures(level).map((f) => ({ o: f, fig: true })), ...level.entities.filter((e) => e.alive && !e.removed && !e.carrier && !e.hidden && (e.enemy || e.carryable || e.windK)).map((e) => ({ o: e, fig: false }))];
    for (const { o, fig } of victims) {
      if (fig && (o.mode === 'script' || o.dead)) continue;
      const h = o.half, c = { x: o.pos.x, y: o.pos.y + h.y, z: o.pos.z };
      const ov = { x: Math.min(x1, c.x + h.x) - Math.max(x0, c.x - h.x), y: Math.min(y1, c.y + h.y) - Math.max(y0, c.y - h.y), z: Math.min(z1, c.z + h.z) - Math.max(z0, c.z - h.z) };
      if (ov.x <= 0.01 || ov.y <= 0.01 || ov.z <= 0.01) continue;
      // auf dem Block stehend: die Plattform-Mitnahme trägt sie – nur prüfen, ob oben Platz ist (Einklemmen an der Decke)
      const onTop = fig ? (o.mode === 'ground' && o.ground === shape) : (o.grounded && o.ground === shape);
      if (onTop && my >= 0) {
        if (my > 0) {
          const hits = level.world.overlapAABB({ x: c.x, y: c.y + my + 0.02, z: c.z }, { x: h.x - 0.04, y: h.y, z: h.z - 0.04 }, { filter: (q) => q.solid && !q.oneWay && !q.fromBelowOnly && !isOwn(q) });
          if (hits.length) squash(o, fig);
        }
        continue;
      }
      // Eindringtiefe entlang der Stoßrichtung
      let pen;
      if (dv[0]) pen = sgn * dv[0] > 0 ? x1 - (c.x - h.x) : (c.x + h.x) - x0;
      else if (dv[1]) pen = sgn * dv[1] > 0 ? y1 - (c.y - h.y) : (c.y + h.y) - y0;
      else pen = sgn * dv[2] > 0 ? z1 - (c.z - h.z) : (c.z + h.z) - z0;
      pen = Math.min(pen, Math.abs(step) + 0.05);
      if (pen <= 0) continue;
      const k = sgn * pen;
      const own = !fig && o.shapes?.length ? new Set(o.shapes) : null;
      const m = shove(level, o, dv[0] * k, dv[1] * k, dv[2] * k, (q) => isOwn(q) || (own ? own.has(q.id) : false));
      const moved = Math.abs(m.x * dv[0] + m.y * dv[1] + m.z * dv[2]);
      st.pushes++;
      if (moved < pen - 0.04) squash(o, fig);
      else if (fig && dv[1] === 0) { o.vel.x += dv[0] * sgn * 2; o.vel.z += dv[2] * sgn * 2; }
    }
  }

  function squash(o, fig) {
    if (fig) {
      if (o.dead) return;
      st.crushes++;
      level.effects?.dust({ x: o.pos.x, y: o.pos.y + 0.3, z: o.pos.z }, 10, 1.4);
      o.die('crush');
    } else {
      st.crushes++;
      o.onHit?.('crush', handle);
    }
  }

  if (level.view) {
    const root = new THREE.Group();
    root.name = 'quetschblock';
    const inner = new THREE.Group();
    // Gesicht (+X lokal) zur Stoßrichtung drehen; bei auf/ab zur Kamera (+Z)
    if (dv[1] !== 0) inner.rotation.y = -Math.PI / 2;
    else inner.rotation.y = Math.atan2(-dv[2], dv[0]);
    const lw = dv[1] !== 0 ? s.z : Math.abs(dv[0]) ? s.x : s.z, ld = dv[1] !== 0 ? s.x : Math.abs(dv[0]) ? s.z : s.x;
    let model = null, mat = null;
    const style = spec.style ?? 'metall';
    if (style === 'metall' && hasModel('quetschblock')) {
      model = getModel('quetschblock', { size: [lw, s.y, ld], rod: dv[1] !== 0 ? 0 : Math.min(1.5, spec.travel ?? 3) });
      model.root.position.y = s.y / 2;   // Modell: Ursprung Körpermitte
      inner.add(model.root);
    } else {
      mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, emissive: 0xff2a1a, emissiveIntensity: 0 });
      const m = new THREE.Mesh(crusherGeo(lw, s.y, ld, style, spec.face !== false), mat);
      m.castShadow = true; m.receiveShadow = true;
      inner.add(m);
    }
    root.add(inner);
    const holder = {};
    let tt = 0, slam = 0;
    addObject(level, root, (dt) => {
      const d = visDt(level, holder, dt);
      tt += d;
      const sh = st.state === 'warn' ? 0.05 : 0;
      root.position.set(mb.pos.x + Math.sin(tt * 57) * sh, mb.pos.y + Math.sin(tt * 43) * sh * 0.5, mb.pos.z + Math.cos(tt * 51) * sh);
      if (mat) mat.emissiveIntensity = st.state === 'warn' ? 0.25 + 0.2 * Math.sin(tt * 20) : st.state === 'stoss' || st.state === 'halt' ? 0.2 : 0;
      slam = st.state === 'stoss' || st.state === 'halt' ? 1 : Math.max(0, slam - d * 2.5);
      model?.update?.(d, { anim: 'idle', warn: st.state === 'warn' ? 1 : 0, slam });
    });
  }
  return handle;
}

export const TYPES = { quetschblock: buildQuetschblock };
