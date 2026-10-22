// Welt-2-Bausteine Rollhügel/Untergrund (Bauplan 2-4): Zahnrad-Plattform, Rollwalze, Drehrad, Farbfeld.
//
// zahnradplattform – Zahnrad (Modell 'zahnradplattform'), pos = Mitte des Zahnrads.
//   { type: 'zahnradplattform', pos: [x, y, z], radius: 2.5, teeth: 12, thick: 0.6 (Dicke; bei Achse x/z = begehbare
//     Breite), axis: 'y' (Standard: liegt flach, Drehteller – nimmt die Figur mit, Oberseite y + thick/2)
//     | 'x' (steht, Achse ±X: Rad, auf dem man laufen muss – Oberseite läuft entlang Z) | 'z' (Achse ±Z, läuft entlang X),
//     speed: 0.6 (rad/s; axis y: positiv = gegen den Uhrzeigersinn von oben; axis x: positiv = Oberseite läuft nach +Z;
//     axis z: positiv = Oberseite läuft nach −X), idle: false, id }
//   level.named.get(id) = { angle, speed, running, start(), stop() }
//   Beispiel: { type: 'zahnradplattform', pos: [0, 2, -40], axis: 'y', radius: 3, speed: 0.8 }
//
// rollwalze – rollender Hügel/Baumstamm (Modell 'rollwalze', Achse bei y + radius):
//   { type: 'rollwalze', pos: [x, y, z] (Mitte der Auflage), radius: 2, length: 6, axis: 'x' (Standard: liegt quer,
//     Oberfläche läuft entlang Z) | 'z', speed: 2 (m/s Oberfläche, Laufband-Prinzip; positiv = Oberseite läuft nach +Z
//     bzw. +X – bei Levels nach −Z also der Figur entgegen), style: 'gras' | 'holz',
//     path: [[x, y, z], …] (optional: Walze rollt diese Bahn ab – Hindernis), rollSpeed: 3 (m/s), loop: false,
//     wait: 0.6, hurt: true (rollende Walze verletzt bei seitlicher Berührung), id }
//   level.named.get(id) = { angle, speed, pos, running, start(), stop() }
//   Beispiel: { type: 'rollwalze', pos: [0, 1, -60], radius: 2.2, length: 8, speed: 2.5 }
//
// drehrad – Riesenrad mit waagerechten Stegen (Modell 'drehrad', pos = Nabe); Stege bleiben waagerecht und tragen.
//   { type: 'drehrad', pos: [x, y, z], radius: 3, platforms: 4, plank: [1.6, 1.1] (Steg: Länge entlang der Achse,
//     Tiefe), speed: 0.5 (rad/s; axis x: positiv = Stege laufen oben nach −Z), axis: 'x' (Standard: Rad steht in der
//     YZ-Ebene) | 'z' (XY-Ebene, oben laufen sie nach +X), phase: 0 (rad), idle: false, id }
//   level.named.get(id) = { angle, planks: [MovingBox], running, start(), stop() }
//   Steg i: Mitte (0, R·sin(a), R·cos(a)) mit a = angle + i·2π/n, Oberseite +0,12.
//   Beispiel: { type: 'drehrad', pos: [0, 5, -80], radius: 3.5, platforms: 4, speed: 0.45 }
//
// farbfeld – Bodenplatten, die sich beim Betreten färben (Farbfeld-Raum 2-4); alle gefärbt → Aktion.
//   { type: 'farbfeld', pos: [x, y, z] (Mitte, y = Oberkante des Untergrunds), grid: [4, 4], cell: 1.8 (Feldgröße),
//     gap: 0.1, tiles: [[x, y, z], …] (statt grid: einzelne Felder, Fußpunkt), toggle: false (true → erneutes Betreten
//     färbt zurück), colors: ['#ff5a7a', '#ffd23a', '#4fd04a', '#3d8bff'] (gefärbt, reihum), off: '#e8e4f4' (ungefärbt),
//     onAll: Aktion, at: [x, y, z] (Ort der Belohnung), indicator: true (Fortschritts-Tafel) | [x, y, z] | false, id }
//   level.named.get(id) = { tiles: [{ x, y, z, on }], count, done, reset() }
//   Beispiel: { type: 'farbfeld', pos: [0, 1, -100], grid: [4, 3], onAll: { star: 1 } }

import * as THREE from 'three';
import { v3, hex, box, addObject } from '../kit.js';
import { MovingBox, circleSlices, modelObject } from '../w2kit.js';
import { runAction, visDt } from '../../entities/gimmick.js';
import { PathMover } from '../../level/PathMover.js';

const TAU = Math.PI * 2;

/** Liegender Zylinder als Scheiben-Kollision (Mitte c, Achse 'x'|'z', halbe Länge hl), conveyor je Scheibe. */
function wheelShapes(level, c, R, hl, axis, tag, surface) {
  return circleSlices(R, 0.25).map((s) => {
    const min = axis === 'x' ? [c.x - hl, c.y - s.h, c.z + s.u0] : [c.x + s.u0, c.y - s.h, c.z - hl];
    const max = axis === 'x' ? [c.x + hl, c.y + s.h, c.z + s.u1] : [c.x + s.u1, c.y + s.h, c.z + hl];
    const shape = { type: 'box', min, max, conveyor: { x: 0, z: 0 }, tag, noWallSlide: true };
    const sh = { s, shape, id: level.world.add(shape) };
    surface(sh, 0);
    return sh;
  });
}

// ------------------------------------------------------------------ Zahnrad-Plattform

export function buildZahnrad(level, spec) {
  const p = v3(spec.pos);
  const R = spec.radius ?? 2.5, teeth = spec.teeth ?? 12, thick = spec.thick ?? 0.6;
  const axis = spec.axis === 'x' || spec.axis === 'z' ? spec.axis : 'y';
  const h = { angle: 0, speed: spec.speed ?? 0.6, running: !spec.idle };
  h.start = () => { h.running = true; };
  h.stop = () => { h.running = false; };
  if (spec.id) level.named.set(spec.id, h);
  if (axis === 'y') {
    const mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: p.x, cz: p.z };
    level.world.add({ type: 'cyl', x: p.x, z: p.z, r: R, y0: p.y - thick / 2, y1: p.y + thick / 2, mover, tag: 'zahnrad' });
    level.onStep((dt) => {
      mover.dyaw = h.running ? h.speed * dt : 0;
      h.angle += mover.dyaw;
    });
  } else {
    const shapes = wheelShapes(level, p, R, thick / 2, axis, 'zahnrad', (sh) => {
      const v = (h.running ? h.speed : 0) * sh.s.h;      // Oberfläche: ω × r (nur waagerechter Anteil)
      sh.shape.conveyor.x = axis === 'z' ? -v : 0;
      sh.shape.conveyor.z = axis === 'x' ? v : 0;
    });
    let was = null;
    level.onStep((dt) => {
      if (h.running) h.angle += h.speed * dt;
      const key = h.running ? h.speed : 0;
      if (key !== was) {
        was = key;
        for (const sh of shapes) { const v = key * sh.s.h; sh.shape.conveyor.x = axis === 'z' ? -v : 0; sh.shape.conveyor.z = axis === 'x' ? v : 0; }
      }
    });
  }
  modelObject(level, 'zahnradplattform', { radius: R, teeth, thick, axis }, p.x, p.y, p.z, 0, () => ({ angle: h.angle }));
  return h;
}

// ------------------------------------------------------------------ Rollwalze

export function buildRollwalze(level, spec) {
  const p = v3(spec.pos);
  const R = spec.radius ?? 2, len = spec.length ?? 6;
  const axis = spec.axis === 'z' ? 'z' : 'x';
  const h = { angle: 0, speed: spec.speed ?? 2, running: !spec.idle, pos: { x: p.x, y: p.y, z: p.z } };
  h.start = () => { h.running = true; };
  h.stop = () => { h.running = false; };
  if (spec.id) level.named.set(spec.id, h);
  const c = { x: p.x, y: p.y + R, z: p.z };
  const slices = circleSlices(R, 0.25);
  let pm = null;
  if (spec.path?.length >= 2) pm = new PathMover(spec.path, { speed: spec.rollSpeed ?? 3, wait: spec.wait ?? 0.6, mode: spec.loop ? 'loop' : 'pingpong' });
  const owner = { walze: h };
  const parts = slices.map((s) => {
    const sx = axis === 'x' ? len : s.u1 - s.u0, sz = axis === 'x' ? s.u1 - s.u0 : len;
    const ox = axis === 'x' ? 0 : s.uc, oz = axis === 'x' ? s.uc : 0;
    const bx = new MovingBox(level, c.x + ox, c.y - s.h, c.z + oz, sx, 2 * s.h, sz, { tag: 'rollwalze', conveyor: { x: 0, z: 0 }, noWallSlide: true, owner });
    return { s, bx, ox, oz };
  });
  let roll = 0;
  level.onStep((dt) => {
    let vRoll = 0, dir = { x: 0, z: 0 };
    if (pm && h.running) {
      const ox = pm.pos.x, oz = pm.pos.z;
      pm.step(dt);
      const mx = pm.pos.x - ox, mz = pm.pos.z - oz;
      const d = Math.hypot(mx, mz);
      if (d > 1e-6) { vRoll = d / dt; dir = { x: mx / d, z: mz / d }; }
      h.pos.x = pm.pos.x; h.pos.y = pm.pos.y; h.pos.z = pm.pos.z;
      roll += (axis === 'x' ? mz : mx) / R;
    }
    const spin = h.running ? h.speed : 0;
    if (!pm) h.angle += (spin / R) * dt; else h.angle = roll;
    for (const q of parts) {
      const k = q.s.h / R;
      const conv = q.bx.shape.conveyor;
      if (pm) {
        // rollt: Oberfläche bewegt sich gegenüber der Mitte mit vRoll in Fahrtrichtung
        conv.x = dir.x * vRoll * k; conv.z = dir.z * vRoll * k;
      } else {
        conv.x = axis === 'z' ? spin * k : 0; conv.z = axis === 'x' ? spin * k : 0;
      }
      if (pm) q.bx.moveTo(h.pos.x + q.ox, h.pos.y + R - q.s.h, h.pos.z + q.oz, dt);
      else q.bx.still();
    }
    // Rollende Walze: seitliche Berührung verletzt
    const pl = level.player;
    if (pm && spec.hurt !== false && vRoll > 0.3 && pl && !pl.dead && pl.mode !== 'script') {
      const onTop = parts.some((q) => q.bx.carries(pl));
      if (!onTop) {
        const hx = axis === 'x' ? len / 2 : R, hz = axis === 'x' ? R : len / 2;
        const dx = Math.abs(pl.pos.x - h.pos.x), dz = Math.abs(pl.pos.z - h.pos.z);
        const feet = pl.pos.y, top = h.pos.y + 2 * R;
        if (dx < hx + pl.half.x + 0.05 && dz < hz + pl.half.z + 0.05 && feet < top - 0.45 && feet + pl.half.y * 2 > h.pos.y) {
          pl.hurt({ pos: { x: h.pos.x, y: h.pos.y + R, z: h.pos.z } });
        }
      }
    }
  });
  const yaw = axis === 'x' ? 0 : Math.PI / 2;
  modelObject(level, 'rollwalze', { radius: R, length: len, style: spec.style ?? 'gras' }, p.x, p.y, p.z, yaw,
    () => ({ angle: axis === 'x' ? -h.angle : h.angle }), (root) => root.position.set(h.pos.x, h.pos.y, h.pos.z));
  return h;
}

// ------------------------------------------------------------------ Drehrad

export function buildDrehrad(level, spec) {
  const p = v3(spec.pos);
  const R = spec.radius ?? 3, n = Math.max(1, spec.platforms ?? 4);
  const pk = Array.isArray(spec.plank) ? spec.plank : [1.6, 1.1];
  const axis = spec.axis === 'z' ? 'z' : 'x';
  const h = { angle: spec.phase ?? 0, speed: spec.speed ?? 0.5, running: !spec.idle, planks: [] };
  h.start = () => { h.running = true; };
  h.stop = () => { h.running = false; };
  if (spec.id) level.named.set(spec.id, h);
  const at = (i) => {
    const a = h.angle + (i / n) * TAU;
    const u = R * Math.cos(a), y = p.y + R * Math.sin(a) - 0.12;
    return axis === 'x' ? { x: p.x, y, z: p.z + u } : { x: p.x + u, y, z: p.z };
  };
  for (let i = 0; i < n; i++) {
    const q = at(i);
    h.planks.push(new MovingBox(level, q.x, q.y, q.z, axis === 'x' ? pk[0] : pk[1], 0.24, axis === 'x' ? pk[1] : pk[0], { tag: 'drehrad:steg' }));
  }
  level.onStep((dt) => {
    if (h.running) h.angle += h.speed * dt;
    h.planks.forEach((b, i) => { const q = at(i); b.moveTo(q.x, q.y, q.z, dt); });
  });
  modelObject(level, 'drehrad', { radius: R, platforms: n, plank: pk }, p.x, p.y, p.z, axis === 'x' ? 0 : Math.PI / 2, () => ({ angle: h.angle }));
  return h;
}

// ------------------------------------------------------------------ Farbfeld

const FIELD_COLORS = ['#ff5a7a', '#ffd23a', '#4fd04a', '#3d8bff', '#b46cff', '#ff9a2e'];
const TH = 0.1;

export function buildFarbfeld(level, spec) {
  const base = v3(spec.pos ?? [0, 0, 0]);
  const cell = spec.cell ?? 1.8, gap = spec.gap ?? 0.1;
  let spots = spec.tiles;
  if (!spots) {
    const [cols, rows] = spec.grid ?? [4, 4];
    spots = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) spots.push([base.x + (c - (cols - 1) / 2) * cell, base.y, base.z + (r - (rows - 1) / 2) * cell]);
  }
  const half = (cell - gap) / 2;
  const colors = (spec.colors ?? FIELD_COLORS).map((c) => new THREE.Color(hex(c)));
  const offCol = new THREE.Color(hex(spec.off ?? 0xe8e4f4));
  const group = { tiles: [], count: 0, done: false };
  spots.forEach((s, i) => {
    const t = { group, i, x: s[0], y: s[1], z: s[2], on: false, flip: 0, color: colors[i % colors.length] };
    t.shape = { type: 'box', min: [t.x - half, t.y, t.z - half], max: [t.x + half, t.y + TH, t.z + half], owner: t, tag: 'farbfeld' };
    level.world.add(t.shape);
    group.tiles.push(t);
  });
  const n = group.tiles.length;
  const cx = group.tiles.reduce((a, t) => a + t.x, 0) / n, cz = group.tiles.reduce((a, t) => a + t.z, 0) / n;
  const top = Math.max(...group.tiles.map((t) => t.y));
  const at = spec.at ? v3(spec.at) : { x: cx, y: top + 0.6, z: cz };
  let board = null;
  if (spec.indicator !== false && level.view) board = makeBoard(level, Array.isArray(spec.indicator) ? v3(spec.indicator) : { x: cx, y: top + 3.2, z: cz });
  const step = (t) => {
    if (group.done) return;
    if (spec.toggle) t.on = !t.on;
    else if (!t.on) t.on = true;
    else return;
    t.flip = 1;
    level.sfx('switch');
    level.effects?.sparks({ x: t.x, y: t.y + 0.3, z: t.z }, 4);
    group.count = group.tiles.filter((q) => q.on).length;
    board?.draw(group.count, n, false);
    if (group.count === n) {
      group.done = true;
      level.sfx('key');
      level.effects?.sparks({ x: at.x, y: at.y + 1, z: at.z }, 20);
      board?.draw(n, n, true);
      runAction(level, spec.onAll, { pos: [at.x, at.y, at.z], source: group });
    }
  };
  group.reset = () => { for (const t of group.tiles) t.on = false; group.count = 0; group.done = false; board?.draw(0, n, false); };
  if (spec.id) level.named.set(spec.id, group);
  board?.draw(0, n, false);
  let prev = null;
  level.onStep(() => {
    const p = level.player;
    const cur = p && !p.dead && p.mode === 'ground' && p.ground?.owner?.group === group ? p.ground.owner : null;
    if (cur && cur !== prev) step(cur);
    prev = cur;
  });
  if (level.view) {
    const geo = box(cell - gap, TH, cell - gap, 0, 0, 0, 0xffffff, { r: 0.04, seg: 1, topColor: 0xffffff, bottomShade: 0.6 });
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.4, metalness: 0.05 });
    const im = new THREE.InstancedMesh(geo, mat, n);
    im.receiveShadow = true;
    im.frustumCulled = false;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), ps = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
    const c = new THREE.Color();
    const holder = {};
    const draw = (dt) => {
      for (const t of group.tiles) {
        if (t.flip > 0) t.flip = Math.max(0, t.flip - dt * 4);
        const k = t.flip;
        e.set(Math.sin(k * Math.PI) * 0.5, 0, 0);
        q.setFromEuler(e);
        ps.set(t.x, t.y + TH / 2 + Math.sin(k * Math.PI) * 0.12, t.z);
        m.compose(ps, q, sc);
        im.setMatrixAt(t.i, m);
        c.copy(t.on ? t.color : offCol);
        if (k > 0.5) c.lerp(new THREE.Color(1, 1, 1), (k - 0.5) * 0.8);
        im.setColorAt(t.i, c);
      }
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    };
    draw(0);
    addObject(level, im, (dt) => draw(visDt(level, holder, dt)));
  }
  return group;
}

/** Fortschritts-Tafel (Sprite): Balken mit n/N, gold, wenn fertig. */
function makeBoard(level, pos) {
  const W = 256, H = 72;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set(W * 0.011, H * 0.011, 1);
  sprite.position.set(pos.x, pos.y, pos.z);
  sprite.renderOrder = 3;
  addObject(level, sprite, (dt, t) => sprite.position.set(pos.x, pos.y + Math.sin(t * 2) * 0.06, pos.z));
  return {
    draw(count, n, done) {
      const g = canvas.getContext('2d');
      g.clearRect(0, 0, W, H);
      g.fillStyle = done ? 'rgba(255,214,58,0.9)' : 'rgba(26,24,48,0.72)';
      g.beginPath(); g.roundRect(4, 4, W - 8, H - 8, 22); g.fill();
      g.lineWidth = 4; g.strokeStyle = '#ffffff'; g.stroke();
      const bx = 18, bw = W - 120, by = 24, bh = 24;
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.roundRect(bx, by, bw, bh, 12); g.fill();
      const k = n ? count / n : 0;
      if (k > 0) {
        const grad = g.createLinearGradient(bx, 0, bx + bw, 0);
        FIELD_COLORS.slice(0, 4).forEach((c, i) => grad.addColorStop(i / 3, c));
        g.fillStyle = grad; g.beginPath(); g.roundRect(bx, by, Math.max(bh, bw * k), bh, 12); g.fill();
      }
      g.font = 'bold 30px sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle';
      g.lineWidth = 6; g.strokeStyle = '#1a1830'; g.strokeText(`${count}/${n}`, W - 16, H / 2 + 1);
      g.fillStyle = '#ffffff'; g.fillText(`${count}/${n}`, W - 16, H / 2 + 1);
      tex.needsUpdate = true;
    },
  };
}

export const TYPES = {
  zahnradplattform: buildZahnrad,
  rollwalze: buildRollwalze,
  drehrad: buildDrehrad,
  farbfeld: buildFarbfeld,
};
