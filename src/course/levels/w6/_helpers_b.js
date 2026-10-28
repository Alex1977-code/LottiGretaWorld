// Hilfen für die Welt-6-Level 6-3 „Schiebetüren im Kirschblütensaal“, 6-4 „Floßfahrt durch den Giftsee-Dschungel“ und
// 6-A „Schubser-Prinz im Röhrenzwinger“ (kein Level: exportiert kein LEVEL, die Level-Registry überspringt dieses Modul).
//
// Oben reine Daten-Helfer (Inseln, Münzspuren), darunter level-lokale Kulisse und kleine Mechanik, die es als Baustein
// nicht gibt. Statische Zier entsteht im Aufbau-Haken `LEVEL.build` (vor dem Verschmelzen: landet in den Abschnitts-Meshes,
// keine zusätzlichen Zeichenaufrufe), Leuchtendes im Glüh-Material; Belebtes (Blüten, Glühwürmchen, Libellen …) ist je ein
// Mesh bzw. eine Punktwolke ohne Sonnenschatten und wird in `LEVEL.setup` angemeldet.
//
// Gemeinsam:  isl, line, ring, arc, column, Bld/litTop/gradY (aus Welt 5), onRespawn, glimmer (Funkelpunkte)
// 6-A:        zwinger (Festung mit Gitterkäfig, Glasröhren-Löchern, Kronen-Mosaik, Türmen, Festungsleib),
//             prinzKampf (Arena-Archetyp zählt den Schubser-Prinzen: Lebensleiste, Tor-Sperre, Neustart)
// 6-3:        saal (dreistöckiger Saal im Querschnitt), scheinwand (bemalte Wand, die sich antippen lässt), hallenDach,
//             tempelTerrasse, gongGarten, kirschBlueten
// 6-4:        dschungelUfer, blauesTor, wurzelInsel, libellen, gluehwuermchen

import * as THREE from 'three';
import { colorize, merge, lin, mixc, smooth, hex, addStatic, addObject, Rnd } from '../../blocks/kit.js';
import { visDt } from '../../entities/gimmick.js';
import { tapTargets } from '../../entities/tap.js';
import { Bld, litTop, gradY, onRespawn } from '../w5/_helpers_b.js';

export { Bld, litTop, gradY, onRespawn };

const TAU = Math.PI * 2;
const HALF_PI = Math.PI / 2;
const L = (c) => lin(hex(c));

// =====================================================================================================================
// Daten-Helfer
// =====================================================================================================================

/** Insel über ihre Grundfläche x0..x1, zA..zB (Reihenfolge egal), Oberseite top, Höhe h; o: weitere Felder. */
export function isl(x0, x1, zA, zB, top, h = 4, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  return { type: 'island', pos: [(x0 + x1) / 2, top - h, (z0 + z1) / 2], size: [x1 - x0, h, z0 - z1], under: 0, ...o };
}
/** Münzen in einer Reihe. */
export const line = (from, to, n) => ({ kind: 'coins', from, to, n });
/** Münzring um pos. */
export const ring = (pos, r, n) => ({ kind: 'coins', pos, r, n });
/** Münzbogen von a nach b mit Scheitel h über der Verbindungslinie. */
export function arc(a, b, n, h = 2) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    out.push({ kind: 'coin', pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * h * t * (1 - t), a[2] + (b[2] - a[2]) * t] });
  }
  return out;
}
/** Münzsäule (senkrecht) bei x, z von y0 bis y1. */
export const column = (x, z, y0, y1, n) => ({ kind: 'coins', from: [x, y0, z], to: [x, y1, z], n });
/** Holzschild. */
export const sign = (x, y, z, text, o = {}) => ({ type: 'sign', pos: [x, y, z], text, size: o.size ?? [2.4, 0.9], yaw: o.yaw ?? 0 });

// =====================================================================================================================
// Belebtes: Funkelpunkte (eine Punktwolke, kein Schatten)
// =====================================================================================================================

let _dotTex = null;
function dotTex() {
  if (_dotTex) return _dotTex;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 32;
  const g = cv.getContext('2d');
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.4, 'rgba(255,255,255,0.55)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 32, 32);
  _dotTex = new THREE.CanvasTexture(cv);
  _dotTex.colorSpace = THREE.SRGBColorSpace;
  return _dotTex;
}

/**
 * Schwebende Funkelpunkte (Glühwürmchen, Glitzer, Pollen) in Quadern: boxes [[x0, x1, y0, y1, zA, zB], …], n Punkte,
 * color, size, drift (m Ausschlag), speed. Ein Points-Objekt (ein Zeichenaufruf), additiv, ohne Nebel-Abdunkeln.
 */
export function glimmer(level, boxes, o = {}) {
  if (!level.view) return null;
  const rnd = new Rnd(o.seed ?? 4242);
  const n = o.n ?? 60;
  const base = [];
  const vol = boxes.map((b) => Math.abs((b[1] - b[0]) * (b[5] - b[4])));
  const tot = vol.reduce((a, b) => a + b, 0) || 1;
  for (let i = 0; i < n; i++) {
    let r = rnd.frac() * tot, k = 0;
    while (k < boxes.length - 1 && r > vol[k]) { r -= vol[k]; k++; }
    const b = boxes[k];
    base.push([rnd.real(b[0], b[1]), rnd.real(b[2], b[3]), rnd.real(Math.min(b[4], b[5]), Math.max(b[4], b[5])), rnd.real(0, TAU), rnd.real(0.6, 1.4)]);
  }
  const pos = new Float32Array(n * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ size: o.size ?? 0.22, map: dotTex(), color: o.color ?? 0xfff2a0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: o.opacity ?? 0.95 });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 4;
  const drift = o.drift ?? 0.6, speed = o.speed ?? 0.7;
  const hv = {};
  let t = 0;
  addObject(level, pts, (dt) => {
    t += visDt(level, hv, dt) * speed;
    for (let i = 0; i < n; i++) {
      const [x, y, z, ph, f] = base[i];
      pos[i * 3] = x + Math.sin(t * f + ph) * drift;
      pos[i * 3 + 1] = y + Math.sin(t * f * 1.3 + ph * 2) * drift * 0.5;
      pos[i * 3 + 2] = z + Math.cos(t * f * 0.8 + ph) * drift;
    }
    geo.attributes.position.needsUpdate = true;
    mat.opacity = (o.opacity ?? 0.95) * (0.75 + 0.25 * Math.sin(t * 3.1));
  });
  return pts;
}

// =====================================================================================================================
// 6-A: Röhrenzwinger
// =====================================================================================================================

/** Kronen-Umriss (Fläche XY, Spitzen nach +Y). */
function crownShape(w, h) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, h * 0.62);
  s.lineTo(w * 0.3, h * 0.38);
  s.lineTo(w * 0.16, h);
  s.lineTo(0, h * 0.45);
  s.lineTo(-w * 0.16, h);
  s.lineTo(-w * 0.3, h * 0.38);
  s.lineTo(-w / 2, h * 0.62);
  s.lineTo(-w / 2, 0);
  return s;
}

/**
 * Festung des Schubser-Prinzen (6-A): Festungsplattform mit Plattenboden, königsblauem Läufer, Kronen-Mosaik in der Mitte,
 * Käfig aus goldenen Gitterstäben auf niedrigen Steinmauern – an den Röhrenmündungen der Seitenwände Torbögen –, vorn nur
 * eine Brüstung mit Tor, Ecktürme mit blauen Spitzdächern, Kronen-Banner, Festungsleib mit glühenden Fenstern tief hinab.
 * o: { y, half (Innenweite/2), mouths: [z, …] (Röhrenmündungen beider Seitenwände), plat: [x0, x1, z0, z1], gate (halbe
 *      Torbreite), depth (Festungsleib) }. Kollision der Käfigwände baut der Level (unsichtbare Quader).
 */
export function zwinger(level, o) {
  if (!level.view) return;
  const Y = o.y, W = o.half, gate = o.gate ?? 2.4;
  const [px0, px1, pz0, pz1] = o.plat;
  const stone = 0x9a90a6, stoneDk = 0x645a72, gold = 0xffc21a, goldDk = 0xc8861a, blue = 0x2a5ad8, blueDk = 0x1a3488;
  const b = new Bld(), g = new Bld();
  // ---- Boden: Platten im Käfig (Schachbrett-Variation), Läufer, Kronen-Mosaik
  const tA = L(0xc4c8e0), tB = L(0x9ea4c8), tC = L(0xe0d4b0);
  const tiles = [];
  for (let ix = -W; ix < W; ix += 2) for (let iz = -W; iz < W; iz += 2) {
    const k = ((ix / 2 + iz / 2) & 1) ? tA : (((ix * 7 + iz * 3) & 3) === 0 ? tC : tB);
    const t = new THREE.PlaneGeometry(1.94, 1.94).toNonIndexed();
    t.rotateX(-HALF_PI); t.translate(ix + 1, Y + 0.012, iz + 1);
    tiles.push(colorize(t, (p, n, c) => { c[0] = k[0]; c[1] = k[1]; c[2] = k[2]; }));
  }
  addStatic(level, merge(tiles));
  // Läufer vom Tor zur Mitte (blau mit goldenem Saum)
  const cz0 = 4.3, cz1 = W + 2;
  b.box(2.8, 0.03, cz1 - cz0, 0, Y + 0.01, (cz0 + cz1) / 2, blue, { r: 0 });
  for (const s of [-1, 1]) b.box(0.16, 0.035, cz1 - cz0, s * 1.3, Y + 0.012, (cz0 + cz1) / 2, gold, { r: 0 });
  // Kronen-Mosaik: Kreisringe (gold/blau) und eine goldene Krone in der Mitte (Glüh-Material)
  const ringGeo = (r0, r1, col) => { const rg = new THREE.RingGeometry(r0, r1, 56).toNonIndexed(); rg.rotateX(-HALF_PI); rg.translate(0, Y + 0.022, 0); const c = L(col); return colorize(rg, (p, n, q) => { q[0] = c[0]; q[1] = c[1]; q[2] = c[2]; }); };
  addStatic(level, merge([ringGeo(3.6, 3.95, gold), ringGeo(3.0, 3.6, blueDk), ringGeo(2.75, 3.0, gold)]));
  const crown = new THREE.ShapeGeometry(crownShape(3.2, 2.4)).toNonIndexed();
  crown.rotateX(-HALF_PI); crown.translate(0, Y + 0.03, 1.1);
  const cg = L(0xffd84a), cr = L(0xff4a6a), cg2 = L(0xffb01a);
  const glowFloor = [colorize(crown, (p, n, q) => mixc(cg, cg2, smooth(-1, 1.2, p.z), q))];
  for (const [x, z] of [[-0.95, -0.6], [0, -1.1], [0.95, -0.6]]) {
    const gem = new THREE.CircleGeometry(0.2, 12).toNonIndexed(); gem.rotateX(-HALF_PI); gem.translate(x, Y + 0.035, z);
    glowFloor.push(colorize(gem, (p, n, q) => { q[0] = cr[0]; q[1] = cr[1]; q[2] = cr[2]; }));
  }
  addStatic(level, merge(glowFloor), { material: 'glow' });
  // ---- Käfig: niedrige Steinmauern, goldene Stäbe (Lücken an den Röhrenmündungen und am Tor), Oberkante mit Spitzen
  const H = 4.6, base = 0.9;
  const mouths = o.mouths ?? [];
  const barsAlong = (ax, az, bx, bz, holes) => {
    const len = Math.hypot(bx - ax, bz - az), n = Math.round(len / 0.62);
    const ux = (bx - ax) / len, uz = (bz - az) / len;
    for (let i = 0; i <= n; i++) {
      const s = (i / n) * len, x = ax + ux * s, z = az + uz * s;
      if (holes.some(([c, r]) => Math.abs(s - c) < r)) continue;
      b.cyl(0.06, 0.07, H - base, x, Y + base, z, litTop(gold, 0.6), 6);
      b.cone(0.11, 0.3, x, Y + H, z, gold, 6);
    }
    // obere Querstange und Mittelband
    b.box(len + 0.2, 0.12, 0.12, (ax + bx) / 2, Y + H - 0.25, (az + bz) / 2, goldDk, { r: 0.03, yaw: Math.atan2(-(bz - az), bx - ax) });
    b.box(len + 0.2, 0.08, 0.08, (ax + bx) / 2, Y + 2.8, (az + bz) / 2, goldDk, { r: 0.02, yaw: Math.atan2(-(bz - az), bx - ax) });
  };
  const wallSeg = (x0, x1, z0, z1, h) => b.box(Math.max(0.6, x1 - x0), h, Math.max(0.6, z1 - z0), (x0 + x1) / 2, Y, (z0 + z1) / 2, litTop(stone, 0.65), { r: 0.08 });
  // Seitenwände (Röhrenmündungen als Torbögen)
  for (const s of [-1, 1]) {
    const x = s * (W + 0.3);
    const holes = mouths.map((z) => [z + W + 0.3, 1.25]);
    // Mauersockel zwischen den Mündungen
    const cuts = [-W - 0.6, ...mouths.flatMap((z) => [z - 1.15, z + 1.15]), W + 0.6];
    for (let i = 0; i < cuts.length; i += 2) wallSeg(x - 0.3, x + 0.3, cuts[i], cuts[i + 1], base);
    barsAlong(x, -W - 0.3, x, W + 0.3, holes);
    for (const z of mouths) {
      // über jeder Röhrenmündung ein blaues Wappenschild mit goldener Krone
      b.box(0.14, 1.0, 1.1, x, Y + 2.35, z, litTop(blue, 0.6), { r: 0.06 });
      const cm = new THREE.ExtrudeGeometry(crownShape(0.8, 0.6), { depth: 0.06, bevelEnabled: false });
      cm.rotateY(-s * HALF_PI);
      b.add(cm, gold, { p: [x - s * 0.1, Y + 2.55, z] });
    }
  }
  // Rückwand
  wallSeg(-W - 0.6, W + 0.6, -W - 0.6, -W, base);
  barsAlong(-W - 0.3, -W - 0.3, W + 0.3, -W - 0.3, []);
  // Vorn: Brüstung mit Tor (Torbogen mit Krone)
  wallSeg(-W - 0.6, -gate, W, W + 0.6, base);
  wallSeg(gate, W + 0.6, W, W + 0.6, base);
  for (const s of [-1, 1]) {
    b.cyl(0.32, 0.38, 4.2, s * (gate + 0.3), Y, W + 0.3, litTop(stoneDk, 0.7), 10);
    b.cone(0.5, 1.0, s * (gate + 0.3), Y + 4.2, W + 0.3, blue, 10);
    b.sphere(0.16, s * (gate + 0.3), Y + 5.3, W + 0.3, gold, { ws: 8, hs: 6 });
  }
  b.torus(gate + 0.3, 0.2, 0, Y + 3.6, W + 0.3, litTop(blue, 0.6), { arc: Math.PI, ts: 18, rs: 6 });
  const crownBig = new THREE.ExtrudeGeometry(crownShape(1.5, 1.1), { depth: 0.2, bevelEnabled: false });
  crownBig.translate(0, 0, -0.1);
  b.add(crownBig, litTop(gold, 0.7), { p: [0, Y + 5.6, W + 0.3] });
  // ---- Ecktürme (rund, Zinnenkranz, blaues Spitzdach, Fenster leuchten)
  const towers = o.towers ?? [[-W - 2.6, -W - 2.6], [W + 2.6, -W - 2.6], [-W - 2.6, W + 2.4], [W + 2.6, W + 2.4]];
  for (const [x, z] of towers) {
    b.cyl(1.7, 1.9, 7.2, x, Y - 0.2, z, litTop(stone, 0.6), 14);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; b.box(0.55, 0.6, 0.45, x + Math.cos(a) * 1.6, Y + 7, z + Math.sin(a) * 1.6, stone, { yaw: -a, r: 0.05 }); }
    b.cone(2.1, 3.4, x, Y + 7.5, z, litTop(blue, 0.55), 14);
    b.cyl(0.04, 0.04, 1.4, x, Y + 10.8, z, 0x5a4a3a, 4);
    for (const a of [0.6, 2.2, 3.9, 5.4]) g.box(0.4, 0.75, 0.12, x + Math.cos(a) * 1.82, Y + 3.6, z + Math.sin(a) * 1.82, 0xffb84a, { yaw: -a + HALF_PI, r: 0.05 });
  }
  // ---- Kronen-Banner an der Rückwand (außen an den Stäben)
  for (const x of [-5.5, 0, 5.5]) {
    b.box(1.5, 2.6, 0.08, x, Y + 1.4, -W - 0.5, litTop(blue, 0.7), { r: 0.02 });
    b.box(1.6, 0.14, 0.12, x, Y + 4.0, -W - 0.5, gold, { r: 0.03 });
    const cb = new THREE.ExtrudeGeometry(crownShape(0.9, 0.7), { depth: 0.04, bevelEnabled: false });
    b.add(cb, gold, { p: [x, Y + 2.6, -W - 0.44] });
  }
  // ---- Festungsplattform: Rand mit Zinnen, Festungsleib bis tief hinab mit glühenden Fenstern
  const D = o.depth ?? 16;
  const rim = (x0, x1, z0, z1) => b.box(x1 - x0, 0.7, z1 - z0, (x0 + x1) / 2, Y - 0.2, (z0 + z1) / 2, litTop(stoneDk, 0.7), { r: 0.06 });
  rim(px0, px1, pz0 - 0.5, pz0 + 0.5); rim(px0, px1, pz1 - 0.5, pz1 + 0.5);
  rim(px0 - 0.5, px0 + 0.5, pz0, pz1); rim(px1 - 0.5, px1 + 0.5, pz0, pz1);
  for (let x = px0 + 1; x < px1 - 0.5; x += 2.2) for (const z of [pz0, pz1]) b.box(0.9, 0.6, 0.9, x, Y + 0.5, z, stone, { r: 0.06 });
  for (let z = pz0 + 1; z < pz1 - 0.5; z += 2.2) for (const x of [px0, px1]) b.box(0.9, 0.6, 0.9, x, Y + 0.5, z, stone, { r: 0.06 });
  const body = new THREE.BoxGeometry(px1 - px0 - 1, D, pz1 - pz0 - 1, 6, 4, 6).toNonIndexed();
  body.translate((px0 + px1) / 2, Y - 4 - D / 2, (pz0 + pz1) / 2);
  const bA = L(0x6a5e78), bB = L(0x3a2e44);
  addStatic(level, colorize(body, (p, n, q) => mixc(bB, bA, smooth(Y - 4 - D, Y - 4, p.y) * (0.7 + 0.3 * Math.abs(n.x + n.z)), q)), { castShadow: false });
  // Fenster im Festungsleib (vorn und an den Seiten)
  for (let k = 0; k < 3; k++) {
    const y = Y - 7 - k * 4.5;
    for (let x = px0 + 4; x < px1 - 3; x += 6) g.box(0.9, 1.5, 0.1, x + (k % 2) * 3, y, pz1 - 0.45, 0xffa040, { r: 0.1 });
    for (let z = pz0 + 4; z < pz1 - 3; z += 6) for (const x of [px0 + 0.45, px1 - 0.45]) g.box(0.1, 1.5, 0.9, x, y, z + (k % 2) * 3, 0xffa040, { r: 0.1 });
  }
  b.flush(level);
  g.flush(level, { material: 'glow' });
}

/**
 * Arena-Archetyp mit Endgegner (6-A): der Arena-Archetyp zählt nur Gegner mit `enemy`; der Schubser-Prinz ist ein Boss.
 * Hier zählt er als einziger Arena-Gegner (sein Sieg → Stern in der Mitte, Einsammeln beendet das Level), die
 * Lebensleiste zeigt seine Treffer, das Tor schließt sich, sobald die Figur den Käfig betritt (dann beginnt der Kampf),
 * und ein Tod setzt Prinz, Tor und Leiste zurück. o: { id, gate: { min, max }, inside(p) → bool, name }.
 */
export function prinzKampf(level, o) {
  const arch = level.archetype;
  const prinz = level.named.get(o.id);
  if (!arch || !prinz) return null;
  const st = { started: false, lock: null, gone: false };
  arch.counted.add(prinz);
  arch.total = arch.left = 1;
  arch.boss = prinz;          // Phasen-Ansagen des Prinzen (syncArch)
  arch.hud.hideArena();
  const prevDef = level.onBossDefeated;
  level.onBossDefeated = (b) => { prevDef?.(b); if (b === prinz) arch.onDefeated(prinz); };
  const lockOn = () => { if (!st.lock) st.lock = level.world.add({ type: 'box', min: o.gate.min, max: o.gate.max, camIgnore: true, noWallSlide: true, tag: 'zwinger-tor' }); };
  const lockOff = () => { if (st.lock) { level.world.remove(st.lock); st.lock = null; } };
  const rt = level.runtime;
  const respawn = rt.respawn.bind(rt);
  rt.respawn = () => {
    respawn();
    prinz.reset();
    arch.counted.add(prinz);
    arch.hud.hideArena();
    arch.hud.hideBoss();
    lockOff();
    st.started = false;
  };
  level.onStep(() => {
    const p = level.player;
    if (!st.started && p && !p.dead && o.inside(p.pos)) {
      st.started = true;
      lockOn();
      prinz.begin();
      level.sfx('gate');
    }
    if (st.started && prinz.state !== 'gone') arch.hud.boss({ name: o.name ?? 'Schubser-Prinz', hp: prinz.hp, max: prinz.maxHp });
    else if (prinz.state === 'gone' && !st.gone) { st.gone = true; arch.hud.hideBoss(); lockOff(); }
  });
  const handle = { get started() { return st.started; }, get locked() { return !!st.lock; }, prinz };
  level.named.set('prinzKampf', handle);
  return handle;
}
