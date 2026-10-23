// Welt-3-Bausteine Rennstrecke (Bauplan 3-6 „Berg im Kart-Rennstil mit Boost-Pfeilen und Sprungfedern“: Sprungfelder
// über 6–8 m Lücken, Pilztrampoline, Boost-Schräge, Rutschhang, Sprungfeld unten schleudert zum Zielmast).
// Boost-Flächen nutzen das vorhandene Motor-Flag `boost: { x, z, speed }` (wie der Baustein `boost`).
//
// boost_rampe – Boost-Schräge (Modell 'boost_rampe'): Rampe (Kollision ramp) mit Boost auf der ganzen Fahrbahn; steigt
//   nach lokal +X (yaw im 90°-Raster) von pos.y auf pos.y + height.
//   { type: 'boost_rampe', pos (Mitte der Fußkante), yaw: π/2 (steigt nach −Z), length: 2.5, width: 1.6, height: 0.8,
//     speed: 18 }
// boost_tor – Boost-Tor (Modell 'boost_tor'): Bogen über der Fahrbahn (Durchfahrt lokal +X), wer hindurchläuft, wird
//   beschleunigt; Füße des Bogens fest.  { type: 'boost_tor', pos (Mitte am Boden), yaw: π/2, width: 4, speed: 18,
//   depth: 2 (Länge der Boost-Zone) }
// sprungfeld – Sprungfeld (Modell 'sprungfeld', 0,22 m flach): Betreten schleudert die Figur in hohem Bogen genau auf
//   `to` (Fußpunkt) – über 6–8 m Lücken, Ziel exakt einstellbar; ohne `to`: dist m in Richtung dir.
//   { type: 'sprungfeld', pos (Mitte unten), to: [x, y, z] | dir: [dx, dz] + dist: 7, arc: 3 (Scheitel über dem höheren
//     Punkt), size: 1.6, onLaunch: Aktion, id }   level.named.get(id) = { launches }
// pilztrampolin – Pilz-Trampolin (Modell 'pilztrampolin', Hut Ø 2,4 m, Oberkante 1,25 m): Landen federt hoch (Motor-Flag
//   bounce).  { type: 'pilztrampolin', pos (Fuß), strength: 19, scale: 1 }
// bande – Kart-Bande (Modell 'bande', 0,8 m hoch) entlang path (Polylinie, gerade Stücke) oder from/to.
//   { type: 'bande', path: [[x, y, z], …] | from, to, solid: true, detail: 'high' | 'low' }
//   detail 'low' (Präzisierung „Leistung und Level-Haken 2“): gleiche Optik (grauer Sockel, rot-weiße Polster je Meter,
//   gelb-schwarze Rolle) aus einfachen Körpern – ≈ 40 statt ≈ 320 Dreiecke je Meter, für lange Strecken (3-6).
// start_bogen – Start-/Zielbogen mit Ampel (Modell 'start_bogen'): Ampel wird grün nach `delay` s bzw. sobald eine Figur
//   hindurchläuft (mode 'pass'); Pfeiler fest.  { type: 'start_bogen', pos, yaw: π/2, width: 8, delay: 2, mode: 'time' |
//   'pass', id }   level.named.get(id) = { go }
// rutschhang – Rutschhang: Rampe mit Flag slide (Figur rutscht ohne Ducken bergab, schnell und kaum lenkbar); Neigung
//   wird dem Motor als mindestens `slope` (Standard 0,85 > slopeSlide 0,75) gemeldet.
//   { type: 'rutschhang', pos (Mitte der Unterseite), size: [w, h, d], axis: 'z', dir: −1 (steigt nach −Z), low: 0,
//     slope: 0.85, top: 'snow' (Thema-Decke) | 'stone' }

import * as THREE from 'three';
import { v3, sz3, wedge, themeOf, addStatic, colorize, merge, lin, hex } from '../kit.js';
import { modelObject, bakeModel, rotXZ, snapYaw, figures, slideSlope } from '../w3kit.js';
import { flightCtl, runAction } from '../../entities/gimmick.js';

/** Achse/Richtung einer Rampe, die nach lokal +X ansteigt (yaw im 90°-Raster). */
function rampAxis(yaw) {
  const f = rotXZ(1, 0, yaw);
  return Math.abs(f.x) > 0.5 ? { axis: 'x', dir: f.x > 0 ? 1 : -1, f } : { axis: 'z', dir: f.z > 0 ? 1 : -1, f };
}

export function buildBoostRampe(level, spec) {
  const p = v3(spec.pos);
  const yaw = snapYaw(spec.yaw ?? Math.PI / 2);
  const L = spec.length ?? 2.5, W = spec.width ?? 1.6, H = spec.height ?? 0.8;
  const { axis, dir, f } = rampAxis(yaw);
  const c = { x: p.x + f.x * L / 2, z: p.z + f.z * L / 2 };
  const hx = axis === 'x' ? L / 2 : W / 2, hz = axis === 'x' ? W / 2 : L / 2;
  level.world.add({ type: 'ramp', min: [c.x - hx, p.y, c.z - hz], max: [c.x + hx, p.y + H, c.z + hz], axis, dir, low: p.y + 0.02, tag: 'boost_rampe' });
  level.world.add({ type: 'box', min: [c.x - hx, p.y - 0.05, c.z - hz], max: [c.x + hx, p.y + H + 0.35, c.z + hz], trigger: true, solid: false, boost: { x: f.x, z: f.z, speed: spec.speed ?? 18 }, tag: 'boost' });
  if (level.view) modelObject(level, 'boost_rampe', { length: L, width: W, height: H }, p.x, p.y, p.z, yaw, {});
}

export function buildBoostTor(level, spec) {
  const p = v3(spec.pos);
  const yaw = snapYaw(spec.yaw ?? Math.PI / 2);
  const W = spec.width ?? 4, R = W / 2 + 0.35, depth = spec.depth ?? 2;
  const f = rotXZ(1, 0, yaw), s = rotXZ(0, 1, yaw);
  for (const sg of [1, -1]) {
    const x = p.x + s.x * R * sg, z = p.z + s.z * R * sg;
    level.world.add({ type: 'box', min: [x - 0.45, p.y, z - 0.45], max: [x + 0.45, p.y + 0.6, z + 0.45], tag: 'boost_tor' });
  }
  const hx = Math.abs(f.x) * depth / 2 + Math.abs(s.x) * W / 2, hz = Math.abs(f.z) * depth / 2 + Math.abs(s.z) * W / 2;
  level.world.add({ type: 'box', min: [p.x - hx, p.y - 0.05, p.z - hz], max: [p.x + hx, p.y + 2.5, p.z + hz], trigger: true, solid: false, boost: { x: f.x, z: f.z, speed: spec.speed ?? 18 }, tag: 'boost' });
  if (level.view) modelObject(level, 'boost_tor', { width: W }, p.x, p.y, p.z, yaw, {});
}

export function buildSprungfeld(level, spec) {
  const p = v3(spec.pos);
  const size = spec.size ?? 1.6, r = size / 2;
  let to;
  if (spec.to) to = v3(spec.to);
  else {
    const d = spec.dir ?? [0, -1], l = Math.hypot(d[0], d[1]) || 1, dist = spec.dist ?? 7;
    to = { x: p.x + (d[0] / l) * dist, y: p.y, z: p.z + (d[1] / l) * dist };
  }
  const st = { launches: 0, n: 0, to, cool: 0 };
  const shape = { type: 'cyl', x: p.x, z: p.z, r, y0: p.y, y1: p.y + 0.22, owner: st, tag: 'sprungfeld' };
  level.world.add(shape);
  if (spec.id) level.named.set(spec.id, st);
  level.onStep((dt) => {
    if (st.cool > 0) st.cool -= dt;
    for (const f of figures(level)) {
      if (f.mode !== 'ground' || f.ground !== shape || f.dead) continue;
      const from = { x: f.pos.x, y: f.pos.y, z: f.pos.z };
      const dx = to.x - p.x, dz = to.z - p.z;
      f.ride(flightCtl(level, from, { x: to.x, y: to.y, z: to.z }, { arc: spec.arc ?? 3 }), { state: 'jump', kind: 'sprungfeld' });
      if (Math.hypot(dx, dz) > 0.3) f.yaw = Math.atan2(-dz, dx);
      st.launches++; st.n++;
      level.sfx('bounce'); level.sfx('boost');
      level.effects?.ring({ x: p.x, y: p.y + 0.25, z: p.z }, r + 0.4);
      runAction(level, spec.onLaunch, { pos: [p.x, p.y + 1, p.z], source: st });
    }
  });
  if (level.view) modelObject(level, 'sprungfeld', {}, p.x, p.y, p.z, 0, () => ({ anim: st.n ? 'launch' : 'idle', n: st.n }), (root) => root.scale.setScalar(size / 1.6));
  return st;
}

export function buildPilztrampolin(level, spec) {
  const p = v3(spec.pos);
  const sc = spec.scale ?? 1;
  const owner = { n: 0, onBounce() { owner.n++; } };
  level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 1.15 * sc, y0: p.y + 0.85 * sc, y1: p.y + 1.25 * sc, bounce: spec.strength ?? 19, owner, tag: 'pilztrampolin' });
  level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.35 * sc, y0: p.y, y1: p.y + 0.85 * sc, tag: 'pilztrampolin:stiel' });
  if (level.view) modelObject(level, 'pilztrampolin', {}, p.x, p.y, p.z, spec.yaw ?? 0, () => ({ anim: owner.n ? 'bounce' : 'idle', n: owner.n }), (root) => root.scale.setScalar(sc));
  return owner;
}

const LC = (c) => lin(hex(c));

/**
 * Sparsame Bande (Weltkoordinaten) von (ax, ay, az) nach (bx, bz): Stücke höchstens 12 m lang (Abschnitts-Culling),
 * je Stück Sockel, Polster je Meter (rot/weiß), Rolle je halbem Meter (gelb/schwarz). ≈ 40 Dreiecke je Meter.
 */
export function bandeLowParts(ax, ay, az, bx, bz) {
  const parts = [];
  const pad = [LC(0xe8283a), LC(0xffffff)], roll = [LC(0xffd21f), LC(0x2a2a3a)];
  const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
  if (len < 0.2) return parts;
  const pieces = Math.ceil(len / 12);
  const base = LC(0x7a8090);
  for (let q = 0; q < pieces; q++) {
    const u0 = (q / pieces) * len, u1 = ((q + 1) / pieces) * len, pl = u1 - u0;
    const sock = new THREE.BoxGeometry(pl, 0.16, 0.6).toNonIndexed();
    const top = [base[0] * 1.1, base[1] * 1.1, base[2] * 1.1], low = [base[0] * 0.8, base[1] * 0.8, base[2] * 0.8];
    colorize(sock, (p, n, o) => { const c = n.y > 0.5 ? top : n.y < -0.5 ? low : base; const k = 1 - Math.abs(n.x) * 0.06; o[0] = c[0] * k; o[1] = c[1] * k; o[2] = c[2] * k; });
    sock.translate(u0 + pl / 2, 0.08, 0);
    const loc = [sock];
    const np = Math.max(1, Math.round(pl));
    for (let k = 0; k < np; k++) {
      const g = new THREE.BoxGeometry(pl / np - 0.05, 0.5, 0.42).toNonIndexed();
      const c = pad[(Math.round(u0) + k) % 2];
      colorize(g, (p, nn, o) => { const s = nn.y > 0.5 ? 1.08 : nn.y < -0.5 ? 0.6 : 0.88; o[0] = c[0] * s; o[1] = c[1] * s; o[2] = c[2] * s; });
      g.translate(u0 + (k + 0.5) * pl / np, 0.42, 0);
      loc.push(g);
    }
    const nr = Math.max(1, Math.round(pl * 2));
    for (let k = 0; k < nr; k++) {
      const g = new THREE.CylinderGeometry(0.1, 0.1, pl / nr, 6, 1, true).toNonIndexed();
      g.rotateZ(Math.PI / 2);
      g.translate(u0 + (k + 0.5) * pl / nr, 0.72, 0);
      const c = roll[k % 2];
      loc.push(colorize(g, (p, n, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }));
    }
    const g = merge(loc);
    g.rotateY(Math.atan2(-dz, dx));
    g.translate(ax, ay, az);
    parts.push(g);
  }
  return parts;
}

export function buildBande(level, spec) {
  const pts = spec.path ?? [spec.from ?? [0, 0, 0], spec.to ?? [4, 0, 0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = v3(pts[i]), b = v3(pts[i + 1]);
    const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz);
    if (L < 0.2) continue;
    const yaw = Math.atan2(-dz, dx);
    if (spec.detail === 'low') { for (const g of bandeLowParts(a.x, a.y, a.z, b.x, b.z)) addStatic(level, g, { castShadow: true }); }
    else bakeModel(level, 'bande', { length: L }, a.x, a.y, a.z, yaw, 1);
    if (spec.solid === false) continue;
    // achsenparallele Stücke (≤ 1 m) entlang der Linie
    const n = Math.max(1, Math.ceil(L / 1));
    for (let k = 0; k < n; k++) {
      const u0 = k / n, u1 = (k + 1) / n;
      const x0 = a.x + dx * u0, x1 = a.x + dx * u1, z0 = a.z + dz * u0, z1 = a.z + dz * u1;
      level.world.add({ type: 'box', min: [Math.min(x0, x1) - 0.22, a.y, Math.min(z0, z1) - 0.22], max: [Math.max(x0, x1) + 0.22, a.y + 0.8, Math.max(z0, z1) + 0.22], tag: 'bande' });
    }
  }
}

export function buildStartBogen(level, spec) {
  const p = v3(spec.pos);
  const yaw = snapYaw(spec.yaw ?? Math.PI / 2);
  const W = spec.width ?? 8, z0 = W / 2 + 0.45;
  const s = rotXZ(0, 1, yaw), f = rotXZ(1, 0, yaw);
  for (const sg of [1, -1]) {
    const x = p.x + s.x * z0 * sg, z = p.z + s.z * z0 * sg;
    level.world.add({ type: 'box', min: [x - 0.45, p.y, z - 0.45], max: [x + 0.45, p.y + 4.6, z + 0.45], tag: 'start_bogen' });
  }
  const st = { go: false, t: 0 };
  if (spec.id) level.named.set(spec.id, st);
  const mode = spec.mode ?? 'time';
  level.onStep((dt) => {
    if (st.go) return;
    st.t += dt;
    if (mode === 'time' && st.t >= (spec.delay ?? 2)) { st.go = true; level.sfx('switch'); }
    if (mode === 'pass') {
      for (const fg of figures(level)) {
        const dx = fg.pos.x - p.x, dz = fg.pos.z - p.z;
        if (Math.abs(dx * f.x + dz * f.z) < 0.6 && Math.abs(dx * s.x + dz * s.z) < W / 2) { st.go = true; level.sfx('switch'); }
      }
    }
  });
  if (level.view) modelObject(level, 'start_bogen', { width: W }, p.x, p.y, p.z, yaw, () => ({ anim: st.go ? 'go' : 'idle' }));
  return st;
}

export function buildRutschhang(level, spec) {
  const p = v3(spec.pos), s = sz3(spec.size, [6, 4, 12]);
  const axis = spec.axis === 'x' ? 'x' : 'z';
  const dir = spec.dir > 0 ? 1 : -1;
  const th = themeOf(level);
  const x0 = p.x - s.x / 2, x1 = p.x + s.x / 2, z0 = p.z - s.z / 2, z1 = p.z + s.z / 2;
  const lowY = p.y + (spec.low ?? 0);
  const shape = slideSlope({ type: 'ramp', min: [x0, p.y, z0], max: [x1, p.y + s.y, z1], axis, dir, low: lowY, tag: 'rutschhang' }, spec.slope ?? 0.85);
  level.world.add(shape);
  if (level.view) {
    const top = spec.top === 'stone' ? th.stone : th.grassTop;
    const side = spec.top === 'stone' ? th.stoneDark : th.dirt;
    addStatic(level, wedge(x0, p.y, z0, x1, p.y + s.y, z1, axis, dir, lowY, top, side));
    // helle Rutschspuren (Streifen in Gefällerichtung)
    const parts = [];
    const n = Math.max(2, Math.round((axis === 'x' ? s.z : s.x) / 1.2));
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      const g = new THREE.BoxGeometry(axis === 'x' ? s.x : 0.12, 0.02, axis === 'x' ? 0.12 : s.z);
      const len = axis === 'x' ? s.x : s.z, rise = s.y - (spec.low ?? 0);
      const ang = Math.atan2(rise, len);
      if (axis === 'x') g.rotateZ(ang * dir); else g.rotateX(-ang * dir);
      const cx = axis === 'x' ? p.x : x0 + u * s.x, cz = axis === 'x' ? z0 + u * s.z : p.z;
      g.translate(cx, lowY + rise / 2 + 0.03, cz);
      parts.push(g.toNonIndexed());
    }
    for (const g of parts) {
      const col = new Float32Array(g.attributes.position.count * 3).fill(0.95);
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      addStatic(level, g, { castShadow: false });
    }
  }
  return shape;
}

export const TYPES = {
  boost_rampe: buildBoostRampe, boost_tor: buildBoostTor, sprungfeld: buildSprungfeld, pilztrampolin: buildPilztrampolin,
  bande: buildBande, start_bogen: buildStartBogen, rutschhang: buildRutschhang,
};
