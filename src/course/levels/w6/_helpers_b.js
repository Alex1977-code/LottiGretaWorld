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
import { visDt, runAction } from '../../entities/gimmick.js';
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
  // Begrenzungskugel über alle Quader (+ Ausschlag): außerhalb des Bildes kein Zeichenaufruf
  const bb = new THREE.Box3();
  for (const q of boxes) bb.union(new THREE.Box3(new THREE.Vector3(q[0], q[2], Math.min(q[4], q[5])), new THREE.Vector3(q[1], q[3], Math.max(q[4], q[5]))));
  geo.boundingSphere = bb.getBoundingSphere(new THREE.Sphere());
  geo.boundingSphere.radius += (o.drift ?? 0.6) + 0.5;
  geo.computeBoundingSphere = () => {};
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
  g.flush(level, { material: 'glow', castShadow: false });
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

// =====================================================================================================================
// 6-4: Giftsee-Dschungel
// =====================================================================================================================

/**
 * Seerosenblätter auf dem Giftsee (flache grüne Scheiben mit Kerbe, ab und zu eine rosa Blüte) – nur Optik, ohne
 * Schatten. list: [[x, y, z, r], …] (y = Wasseroberfläche).
 */
export function seerosen(level, list, o = {}) {
  if (!level.view) return;
  const rnd = new Rnd(o.seed ?? 77);
  const parts = [];
  const leafA = L(0x3a9a3a), leafB = L(0x7ad85a), vein = L(0x2a6a2a), petal = L(0xff8ac8), petal2 = L(0xffd0ea), core = L(0xffe04a);
  for (const [x, y, z, r0] of list) {
    const r = r0 ?? 0.9;
    const notch = rnd.real(0, TAU);
    const g = new THREE.CircleGeometry(r, 18, notch + 0.35, TAU - 0.7).toNonIndexed();
    g.rotateX(-HALF_PI); g.translate(x, y + 0.04, z);
    parts.push(colorize(g, (p, n, c) => {
      const d = Math.hypot(p.x - x, p.z - z) / r;
      mixc(leafA, leafB, 0.35 + 0.65 * d, c);
      const a = Math.atan2(p.z - z, p.x - x);
      if (Math.abs(Math.sin(a * 4)) < 0.08 && d > 0.15) mixc(c, vein, 0.5, c);
    }));
    if (rnd.frac() < (o.flowers ?? 0.35)) {
      const fx = x + Math.cos(notch + Math.PI) * r * 0.35, fz = z + Math.sin(notch + Math.PI) * r * 0.35;
      for (let i = 0; i < 6; i++) {
        const pg = new THREE.SphereGeometry(0.16, 6, 4).toNonIndexed();
        pg.scale(1, 0.55, 2.2);
        pg.translate(0, 0, 0.18);
        pg.rotateX(-0.5);
        pg.rotateY((i / 6) * TAU);
        pg.translate(fx, y + 0.14, fz);
        parts.push(colorize(pg, (p, n, c) => mixc(petal, petal2, smooth(-0.2, 0.9, n.y), c)));
      }
      const cg = new THREE.SphereGeometry(0.1, 6, 4).toNonIndexed(); cg.translate(fx, y + 0.2, fz);
      parts.push(colorize(cg, (p, n, c) => { c[0] = core[0]; c[1] = core[1]; c[2] = core[2]; }));
    }
  }
  addStatic(level, merge(parts), { castShadow: false });
}

/**
 * Blaues Tor (6-4 Stempel): zwei blau lackierte Holzpfeiler, oben ein breiter Querbalken (begehbar) und ein schmaler darunter,
 * goldene Knäufe, Kletterranken – Fantasie-Tor ohne reale Symbolik. Kollision: Pfeiler und oberer Balken.
 * o: { x, y, z (Mitte unten), span (Abstand der Pfeiler), h (Oberkante der Pfeiler), w (Pfeilerbreite) }.
 */
export function blauesTor(level, o) {
  const { x, y, z } = o, span = o.span ?? 5, H = o.h ?? 5.2, w = o.w ?? 1.2, bw = span + w + 1.4;
  const blue = 0x2a6ae8, blueDk = 0x1a3a9a, gold = 0xffc21a, wood = 0x8a5a32;
  for (const s of [-1, 1]) level.world.add({ type: 'box', min: [x + s * span / 2 - w / 2, y, z - w / 2], max: [x + s * span / 2 + w / 2, y + H, z + w / 2], tag: 'blaues-tor' });
  level.world.add({ type: 'box', min: [x - bw / 2, y + H, z - 0.7], max: [x + bw / 2, y + H + 0.6, z + 0.7], tag: 'blaues-tor' });
  if (!level.view) return;
  const b = new Bld(), g = new Bld();
  for (const s of [-1, 1]) {
    const px = x + s * span / 2;
    b.box(w, H, w, px, y, z, litTop(blue, 0.6), { r: 0.08 });
    b.box(w + 0.4, 0.5, w + 0.4, px, y, z, litTop(blueDk, 0.6), { r: 0.08 });
    for (let k = 1; k < 5; k++) b.box(w + 0.06, 0.08, w + 0.06, px, y + (H * k) / 5, z, gold, { r: 0.02 });
  }
  // oberer Balken (begehbar, geschwungene Enden), unterer Zierbalken mit Namensschild
  b.box(bw, 0.6, 1.4, x, y + H, z, litTop(blue, 0.65), { r: 0.12 });
  for (const s of [-1, 1]) b.box(1.1, 0.4, 1.5, x + s * (bw / 2 - 0.35), y + H + 0.45, z, litTop(blueDk, 0.6), { r: 0.12, rz: s * 0.3 });
  b.box(span - w + 0.6, 0.4, 0.8, x, y + H - 1.2, z, litTop(blue, 0.6), { r: 0.08 });
  b.box(1.6, 0.9, 0.12, x, y + H - 1.0, z + 0.45, litTop(wood, 0.7), { r: 0.06 });
  for (const s of [-1, 0, 1]) g.sphere(0.2, x + s * 1.6, y + H + 0.7, z + 0.5, gold, { ws: 10, hs: 7 });
  // Ranken an den Pfeilern
  for (const s of [-1, 1]) for (let k = 0; k < 7; k++) b.sphere(0.22, x + s * (span / 2 + w / 2 + 0.05), y + 0.5 + k * 0.62, z + (k % 2 ? 0.35 : -0.3), 0x3aa83a, { ws: 6, hs: 5, s: [0.6, 1, 1] });
  b.flush(level);
  g.flush(level, { material: 'glow', castShadow: false });
}

/**
 * Baumhaus-Plattform an einem Riesenbaum (6-4 Stern 1): Stamm, runde Holzplattform (begehbar), Geländer mit Lücke,
 * Blätterdach. o: { x, z, top, r (Plattform), trunk (Radius), tx, tz (Stamm), gaps: [[Winkel, halbe Breite], …] (Geländerlücken;
 * Winkel 0 = +X, −π/2 = +Z) }.
 */
export function baumhaus(level, o) {
  const { x, z, top } = o, r = o.r ?? 3.6, tr = o.trunk ?? 1.1;
  const tx = o.tx ?? x, tz = o.tz ?? z;
  level.world.add({ type: 'cyl', x, z, r, y0: top - 0.5, y1: top, tag: 'baumhaus' });
  level.world.add({ type: 'cyl', x: tx, z: tz, r: tr, y0: top - 30, y1: top - 0.5, tag: 'baumstamm' });
  const gaps = o.gaps ?? [[-HALF_PI, 0.9]];
  const inGap = (a) => gaps.some(([ga, gw]) => Math.abs(Math.atan2(Math.sin(a - ga), Math.cos(a - ga))) < gw);
  // Geländer (Kollision): kleine Quader an den Pfosten, Abstand kleiner als die Figur
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * TAU;
    if (inGap(a)) continue;
    const px = x + Math.cos(a) * (r - 0.2), pz = z - Math.sin(a) * (r - 0.2);
    level.world.add({ type: 'box', min: [px - 0.26, top, pz - 0.26], max: [px + 0.26, top + 0.95, pz + 0.26], camIgnore: true, tag: 'baumhaus-gelaender' });
  }
  if (!level.view) return;
  const b = new Bld();
  const bark = { v: (px, py, pz) => new THREE.Color(0x6a4428).lerp(new THREE.Color(0x9a6a3a), 0.5 + 0.5 * Math.sin(Math.atan2(pz - tz, px - tx) * 9)) };
  b.cyl(tr * 0.9, tr * 1.3, top + 12, tx, -12, tz, bark, 12);
  for (let k = 0; k < 5; k++) { const a = k * 1.3; b.cyl(0.28, 0.5, 3, tx + Math.cos(a) * tr, -0.6, tz + Math.sin(a) * tr, 0x6a4428, 6, { rz: Math.cos(a) * 0.7, rx: -Math.sin(a) * 0.7 }); }
  b.cyl(r, r * 0.92, 0.5, x, top - 0.5, z, litTop(0xb8844a, 0.6), 20);
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * TAU;
    if (inGap(a)) continue;
    b.cyl(0.07, 0.07, 0.9, x + Math.cos(a) * (r - 0.2), top, z - Math.sin(a) * (r - 0.2), 0x7a5230, 5);
  }
  b.torus(r - 0.2, 0.06, x, top + 0.9, z, 0x8a5a32, { rx: HALF_PI, ts: 32, rs: 4 });
  // Blätterkrone hinter der Plattform (−Z, damit sie die Kamera nicht verdeckt), Äste und Lianen
  const cz = z - r - 2.2;
  b.cyl(0.35, 0.55, 7, tx, top, tz, 0x6a4428, 8, { rx: -0.35 });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU;
    b.sphere(1.9, x + Math.cos(a) * 2.6, top + 6.4 + (k % 2) * 0.7, cz + Math.sin(a) * 1.6, litTop(0x3aa83a, 0.55), { ws: 9, hs: 6, s: [1, 0.65, 1] });
  }
  b.sphere(2.4, x, top + 7.4, cz, litTop(0x4cbc3a, 0.55), { ws: 10, hs: 7, s: [1, 0.65, 1] });
  for (const dx of [-2.6, 0.8, 2.9]) b.cyl(0.04, 0.04, 3.2, x + dx, top + 3, cz + 1.6, 0x3a8a2a, 4);
  b.flush(level);
}

/** Felsbrocken als Uferkante/Schlucht (abgerundete Quader in Felsfarben, leicht gedreht) – rein optisch. list: [[x, y, z, w, h, d, yaw], …]. */
export function felsen(level, list, o = {}) {
  if (!level.view) return;
  const b = new Bld();
  const col = o.color ?? 0x7a8a6a;
  for (const [x, y, z, w, h, d, yaw = 0] of list) b.box(w, h, d, x, y, z, litTop(col, 0.55), { r: Math.min(w, h, d) * 0.18, yaw, seg: 2 });
  b.flush(level, { castShadow: o.shadow ?? true });
}

/** Ruinen auf dem Zielplateau: moosige Steinsäulen (teils umgefallen), Blöcke, Steinfrosch-Figuren. list: [{ kind, pos, … }]. */
export function ruinen(level, list) {
  if (!level.view) return;
  const b = new Bld();
  const stone = 0xb8b4a0, moss = 0x5aa83a;
  const mossy = { v: (px, py, pz, nx, ny) => (ny > 0.6 ? new THREE.Color(moss) : new THREE.Color(stone).multiplyScalar(0.75 + 0.25 * ny)) };
  for (const it of list) {
    const [x, y, z] = it.pos;
    if (it.kind === 'saeule') {
      const h = it.h ?? 4;
      b.cyl(0.55, 0.62, h, x, y, z, mossy, 10);
      b.box(1.5, 0.35, 1.5, x, y + h, z, mossy, { r: 0.06 });
      b.box(1.5, 0.3, 1.5, x, y, z, mossy, { r: 0.06 });
    } else if (it.kind === 'liegend') {
      b.cyl(0.55, 0.55, it.h ?? 3.4, x, y + 0.55, z, mossy, 10, { rz: HALF_PI, yaw: it.yaw ?? 0 });
    } else if (it.kind === 'frosch') {
      const s = it.size ?? 1;
      b.sphere(0.8 * s, x, y + 0.6 * s, z, mossy, { s: [1.1, 0.75, 1], ws: 12, hs: 8 });
      for (const e of [-1, 1]) {
        b.sphere(0.3 * s, x + e * 0.42 * s, y + 1.15 * s, z + 0.25 * s, stone, { ws: 8, hs: 6 });
        b.sphere(0.13 * s, x + e * 0.42 * s, y + 1.2 * s, z + 0.5 * s, 0x2a2a2a, { ws: 6, hs: 5 });
      }
      b.box(0.9 * s, 0.08 * s, 0.1 * s, x, y + 0.75 * s, z + 0.78 * s, 0x3a5a2a, { r: 0.02 });
    } else if (it.kind === 'block') {
      b.box(it.w ?? 1.2, it.h ?? 0.8, it.d ?? 1.2, x, y, z, mossy, { r: 0.08, yaw: it.yaw ?? 0 });
    }
  }
  b.flush(level);
}

// =====================================================================================================================
// 6-3: Fernost-Halle
// =====================================================================================================================

const WOOD = 0x8a5632, WOOD_DK = 0x5a3420, WOOD_LT = 0xd8a86a, LACK = 0xd8443a, LACK_DK = 0x9a2a24, PAPER = 0xfff4dc, GOLD = 0xffc84a;

/**
 * Papierwand mit Holzgitter (Fernost-Halle): Sockel aus dunklem Holz, Papierfelder mit Sprossen, rot lackierter Riegel oben,
 * Pfosten an den Enden. Wand in der Ebene z = const (face: +1 Vorderseite nach +Z, −1 nach −Z) bzw. x = const (axis 'x').
 * Nur Optik (in einen Bld). w: x0..x1 bzw. z0..z1, y0..y1, d = Dicke.
 */
function paperWall(b, o) {
  const { y0, y1 } = o, h = y1 - y0, d = o.d ?? 0.4;
  const alongX = o.axis !== 'z';
  const a0 = alongX ? o.x0 : o.z0, a1 = alongX ? o.x1 : o.z1, c = alongX ? o.z : o.x;
  const L = a1 - a0, mid = (a0 + a1) / 2;
  const put = (w, hh, dd, along, y, off, col, r = 0.03) => {
    if (alongX) b.box(w, hh, dd, along, y, c + off, col, { r });
    else b.box(dd, hh, w, c + off, y, along, col, { r });
  };
  const f = o.face ?? 1;
  put(L, h, d, mid, y0, 0, litTop(o.color ?? 0xf2e2c4, 0.85), 0.02);                     // Wandkörper
  put(L, Math.min(0.9, h * 0.25), d + 0.06, mid, y0, 0, litTop(WOOD_DK, 0.7));             // Sockel
  put(L, 0.22, d + 0.1, mid, y1 - 0.22, 0, litTop(LACK, 0.7));                             // Riegel oben
  const n = Math.max(1, Math.round(L / 1.6));
  for (let i = 0; i <= n; i++) put(0.16, h, d + 0.12, a0 + (i * L) / n, y0, 0, litTop(WOOD, 0.7));     // Pfosten
  // Papierfelder mit Sprossen (Vorderseite)
  const py0 = y0 + Math.min(0.9, h * 0.25) + 0.12, py1 = y1 - 0.34;
  if (py1 - py0 > 0.6) for (let i = 0; i < n; i++) {
    const s0 = a0 + (i * L) / n + 0.14, s1 = a0 + ((i + 1) * L) / n - 0.14, sm = (s0 + s1) / 2;
    put(s1 - s0, py1 - py0, 0.04, sm, py0, f * (d / 2 + 0.02), PAPER, 0);
    const nx = Math.max(1, Math.round((s1 - s0) / 0.45)), ny = Math.max(1, Math.round((py1 - py0) / 0.45));
    for (let k = 1; k < nx; k++) put(0.035, py1 - py0, 0.05, s0 + ((s1 - s0) * k) / nx, py0, f * (d / 2 + 0.04), WOOD_DK, 0);
    for (let k = 1; k < ny; k++) put(s1 - s0, 0.035, 0.05, sm, py0 + ((py1 - py0) * k) / ny, f * (d / 2 + 0.04), WOOD_DK, 0);
  }
}

/** Wand-Kollision (Quader) entlang x bzw. z. */
function wallBox(level, x0, x1, y0, y1, z0, z1, o = {}) {
  level.world.add({ type: 'box', min: [Math.min(x0, x1), y0, Math.min(z0, z1)], max: [Math.max(x0, x1), y1, Math.max(z0, z1)], tag: o.tag ?? 'saalwand', camIgnore: !!o.camIgnore, noWallSlide: o.noWallSlide ?? false });
}

/**
 * Wand mit Türöffnungen (Rückwand eines Stockwerks bzw. Korridorwand): Segmente zwischen den Türen (Kollision + Papierwand),
 * über jeder Tür ein Sturz bis zur Wandoberkante. o: { axis 'x'|'z', a0, a1 (Ausdehnung), c (Lage der Wandmitte), d, y0, y1,
 * doors: [Mitte, …], dw (Türbreite inkl. Rahmen), dh (Türhöhe), face, color }. b = Bld.
 */
export function doorWall(level, b, o) {
  const d = o.d ?? 0.6, dw = o.dw ?? 2.9, dh = o.dh ?? 3.2;
  const cuts = [o.a0, ...[...(o.doors ?? [])].sort((p, q) => p - q).flatMap((m) => [m - dw / 2, m + dw / 2]), o.a1];
  const seg = (s0, s1, y0, y1) => {
    if (s1 - s0 < 0.05 || y1 - y0 < 0.05) return;
    if (o.axis === 'z') { wallBox(level, o.c - d / 2, o.c + d / 2, y0, y1, s0, s1, o); if (b) paperWall(b, { axis: 'z', z0: s0, z1: s1, x: o.c, y0, y1, d, face: o.face, color: o.color }); }
    else { wallBox(level, s0, s1, y0, y1, o.c - d / 2, o.c + d / 2, o); if (b) paperWall(b, { x0: s0, x1: s1, z: o.c, y0, y1, d, face: o.face, color: o.color }); }
  };
  for (let i = 0; i < cuts.length; i += 2) seg(cuts[i], cuts[i + 1], o.y0, o.y1);
  for (const m of o.doors ?? []) seg(m - dw / 2, m + dw / 2, o.y0 + dh, o.y1);
}

/**
 * Nische hinter einer Tür (in einer Rückwand mit Vorderseite +Z): Boden, Seiten- und Rückwand (Kollision + Optik).
 * o: { x, y, z (Türebene), w, depth, h }.
 */
export function nische(level, b, o) {
  const { x, y, z } = o, w = o.w ?? 2.6, D = o.depth ?? 1.6, h = o.h ?? 3.2;
  wallBox(level, x - w / 2 - 0.3, x - w / 2, y, y + h, z - D - 0.3, z);
  wallBox(level, x + w / 2, x + w / 2 + 0.3, y, y + h, z - D - 0.3, z);
  wallBox(level, x - w / 2, x + w / 2, y, y + h, z - D - 0.3, z - D);
  wallBox(level, x - w / 2 - 0.3, x + w / 2 + 0.3, y - 0.5, y, z - D - 0.3, z, { tag: 'nische' });
  wallBox(level, x - w / 2 - 0.3, x + w / 2 + 0.3, y + h, y + h + 0.3, z - D - 0.3, z, { tag: 'nische', camIgnore: true });
  if (!b) return;
  b.box(w, 0.06, D, x, y - 0.03, z - D / 2, litTop(WOOD_LT, 0.8), { r: 0 });
  b.box(w, h, 0.3, x, y, z - D - 0.15, litTop(0xe8d4b0, 0.8), { r: 0.02 });
  for (const s of [-1, 1]) b.box(0.3, h, D, x + s * (w / 2 + 0.15), y, z - D / 2, litTop(0xe0ccaa, 0.8), { r: 0.02 });
  b.box(w + 0.6, 0.3, D + 0.3, x, y + h, z - D / 2, litTop(WOOD_DK, 0.7), { r: 0.02 });
}

/**
 * Geschossdecke des Saals (Boden des oberen Stockwerks) samt Brüstung an der Vorderkante als eigenes Mesh mit Durchsicht
 * (view.xray): helle Dielen oben, rot lackierte Stirnkante und Geländer vorn, dunkle Balken unten. Die Durchsicht-Box reicht
 * vor der Decke bis zur Kamera und vom Stockwerk darunter bis knapp über die Decke: steht die Figur ein Stockwerk tiefer,
 * kreuzt der Kamerastrahl die Box und die Decke wird durchscheinend; steht sie auf dieser Decke, liegt ihr Kopf in der Box
 * und die Decke bleibt fest. Kollision (Decke, Brüstung 1 m) mit camIgnore.
 * o: { x0, x1, z0 (vorn), z1 (hinten), y (Oberkante), lower (Boden darunter), rail: true, railFrom, railTo (x-Bereich der Brüstung) }.
 */
export function saalDecke(level, o) {
  const { x0, x1, y } = o, zF = o.z0, zB = o.z1, T = 0.5;
  level.world.add({ type: 'box', min: [x0, y - T, zB], max: [x1, y, zF], camIgnore: true, tag: 'saaldecke' });
  const rx0 = o.railFrom ?? x0, rx1 = o.railTo ?? x1;
  // Brüstung: sichtbar 1 m, Kollision 4 m hoch (camIgnore) – kein Sprung über das Geländer hinunter
  if (o.rail !== false) wallBox(level, rx0, rx1, y, y + 4.0, zF - 0.3, zF, { camIgnore: true, noWallSlide: true, tag: 'bruestung' });
  if (!level.view) return;
  const b = new Bld();
  const w = x1 - x0, d = zF - zB, cx = (x0 + x1) / 2, cz = (zF + zB) / 2;
  b.box(w, T - 0.08, d, cx, y - T, cz, litTop(WOOD, 0.6), { r: 0 });
  const planks = Math.round(d / 0.5);
  for (let i = 0; i < planks; i++) b.box(w - 0.04, 0.08, d / planks - 0.03, cx, y - 0.08, zB + (i + 0.5) * (d / planks), i % 2 ? 0xe2b880 : 0xd8a86a, { r: 0 });
  b.box(w + 0.1, T + 0.1, 0.3, cx, y - T - 0.05, zF - 0.1, litTop(LACK, 0.65), { r: 0 });
  if (o.rail !== false) {
    const z = zF - 0.15;
    b.box(rx1 - rx0, 0.12, 0.16, (rx0 + rx1) / 2, y + 0.86, z, litTop(LACK, 0.7), { r: 0 });
    b.box(rx1 - rx0, 0.08, 0.1, (rx0 + rx1) / 2, y + 0.3, z, LACK_DK, { r: 0 });
    for (let x = rx0; x <= rx1 + 0.01; x += 1.2) b.box(0.12, 0.98, 0.12, Math.min(x, rx1), y, z, litTop(LACK, 0.7), { r: 0 });
  }
  const m = new THREE.Mesh(b.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }));
  m.castShadow = true; m.receiveShadow = true;
  m.name = 'saaldecke';
  addObject(level, m);
  // Box: über dem Kopf einer Figur im Stockwerk darunter (lower + 2,1) bis knapp unter die Dielen, vorn bis zur Kamera
  const minY = (o.lower ?? y - 5) + 2.1;
  level.view.xray(m, new THREE.Box3(new THREE.Vector3(x0 - 1, minY, zB), new THREE.Vector3(x1 + 1, y - T + 0.3, zF + 16)), { min: 0.16 });
}

/**
 * Brüstung an der Vorderkante eines Stockwerks: rot lackiertes Geländer (Pfosten, Handlauf, Zierbrett) mit Kollision
 * (camIgnore, 1 m hoch). o: { x0, x1, z, y }.
 */
export function bruestung(level, b, o) {
  const { x0, x1, z, y } = o;
  wallBox(level, x0, x1, y, y + 1.0, z - 0.15, z + 0.15, { camIgnore: true, noWallSlide: true, tag: 'bruestung' });
  if (!b) return;
  b.box(x1 - x0, 0.12, 0.16, (x0 + x1) / 2, y + 0.86, z, litTop(LACK, 0.7), { r: 0.04 });
  b.box(x1 - x0, 0.08, 0.1, (x0 + x1) / 2, y + 0.3, z, LACK_DK, { r: 0.02 });
  for (let x = x0; x <= x1 + 0.01; x += 1.2) b.box(0.12, 0.98, 0.12, Math.min(x, x1), y, z, litTop(LACK, 0.7), { r: 0.03 });
}

/**
 * Treppe aus einzelnen Stufen (Kollision je Stufe vom Boden bis zur Stufenhöhe, Optik Holzstufen mit roten Wangen).
 * o: { x0 (unterste Stufe beginnt), dir (+1/−1 entlang x), n, run, y0 (Boden), y1 (oben), z0, z1 }.
 */
export function treppe(level, b, o) {
  const { n, run, y0, y1, z0, z1, dir } = o;
  const rise = (y1 - y0) / n;
  for (let i = 0; i < n; i++) {
    const a = o.x0 + dir * i * run, c = a + dir * run;
    const top = y0 + (i + 1) * rise;
    level.world.add({ type: 'box', min: [Math.min(a, c), y0, Math.min(z0, z1)], max: [Math.max(a, c), top, Math.max(z0, z1)], tag: 'treppe' });
    if (b) {
      b.box(run, top - y0, Math.abs(z1 - z0), (a + c) / 2, y0, (z0 + z1) / 2, litTop(WOOD, 0.6), { r: 0.01 });
      b.box(run + 0.02, 0.06, Math.abs(z1 - z0) + 0.02, (a + c) / 2, top - 0.06, (z0 + z1) / 2, i % 2 ? 0xe2b880 : 0xd8a86a, { r: 0 });
    }
  }
  if (b) {
    const len = n * run, cx = o.x0 + dir * len / 2;
    for (const z of [Math.max(z0, z1) + 0.08]) {
      const g = new THREE.BoxGeometry(len + 0.3, 0.3, 0.16);
      const ang = Math.atan2(y1 - y0, len);
      g.rotateZ(dir * ang);
      b.add(g, litTop(LACK, 0.7), { p: [cx, (y0 + y1) / 2 + 0.35, z] });
    }
  }
}

/**
 * Scheinwand (6-3 Geheimnis „zwei Scheinwände hinter Schiebetüren“): sieht aus wie die bemalte Wand hinter einer Schiebetür
 * (Himmel, grüne Hügel, Sonne), versperrt den Weg – lässt sich aber antippen (oder mit der Aktionstaste in Reichweite) und
 * gleitet dann in den Boden. Ein leises Glitzern verrät sie. Antipp-Symbol nur in der Nähe (≤ 3 m).
 * o: { id, x, y, z (Mitte unten, Wandebene quer zu Z), w: 2.4, h: 3, onOpen (Aktion), seed }
 *   level.named.get(id) = { open(), state ('zu'|'oeffnet'|'auf'), k, info() }
 */
export function scheinwand(level, o) {
  const { x, y, z } = o, w = o.w ?? 2.4, h = o.h ?? 3;
  const st = { k: 0, want: 0, id: null, opened: false };
  const shape = { type: 'box', min: [x - w / 2 - 0.05, y, z - 0.15], max: [x + w / 2 + 0.05, y + h, z + 0.15], tag: 'scheinwand', camIgnore: true };
  st.id = level.world.add(shape);
  const handle = {
    get state() { return st.k <= 0 ? 'zu' : st.k >= 1 ? 'auf' : 'oeffnet'; }, get k() { return st.k; },
    open() {
      if (st.want === 1) return;
      st.want = 1;
      level.sfx('gate'); level.sfx('powerup_appear');
      level.effects?.sparks({ x, y: y + 1.4, z: z + 0.3 }, 18);
      if (!st.opened) { st.opened = true; if (o.onOpen) runAction(level, o.onOpen, { pos: [x, y + 1, z + 0.6], source: handle }); }
    },
    info: () => ({ state: handle.state, k: +st.k.toFixed(2) }),
  };
  if (o.id) level.named.set(o.id, handle);
  const tap = tapTargets(level).add({
    owner: handle,
    box: () => ({ min: [x - w / 2, y, z - 0.2], max: [x + w / 2, y + h, z + 0.2] }),
    enabled: () => st.want === 0,
    reach: 3,
    hint: false,
    onTap: () => handle.open(),
  });
  level.onStep((dt) => {
    if (st.want && st.k < 1) {
      st.k = Math.min(1, st.k + dt / 0.8);
      if (st.k > 0.6 && st.id !== null) { level.world.remove(st.id); st.id = null; }
    }
    // Antipp-Symbol erst in der Nähe (Geheimnis)
    const p = level.player;
    tap.hint = !!p && st.want === 0 && Math.hypot(p.pos.x - x, p.pos.z - z) < 3.2 && Math.abs(p.pos.y - y) < 1.5;
  });
  if (!level.view) return handle;
  const g = new THREE.BoxGeometry(w, h, 0.24, 8, 6, 1).toNonIndexed();
  g.translate(0, h / 2, 0);
  const sky = L(0xf6e6c8), hill = L(0x7aa86a), hill2 = L(0x5a8a52), cloud = L(0xffffff), sun = L(0xff7a4a), frame = L(LACK);
  const rnd = new Rnd(o.seed ?? 9);
  const ph = rnd.real(0, 6);
  colorize(g, (p, n, c) => {
    if (Math.abs(p.x) > w / 2 - 0.12 || p.y < 0.12 || p.y > h - 0.12) { c[0] = frame[0]; c[1] = frame[1]; c[2] = frame[2]; return; }
    const ridge = h * 0.34 + Math.sin(p.x * 1.6 + ph) * h * 0.1;
    if (p.y < ridge) mixc(hill2, hill, smooth(0, ridge, p.y), c); else mixc(sky, cloud, smooth(h * 0.6, h, p.y) * 0.4, c);
    if (Math.hypot(p.x - w * 0.2, p.y - h * 0.72) < h * 0.1) mixc(c, sun, 0.8, c);
  });
  const mesh = new THREE.Mesh(g, level.view.mats.world);
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.position.set(x, y, z);
  mesh.name = 'scheinwand';
  // leises Glitzern (zwei Funken)
  const spark = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array([-w * 0.25, h * 0.55, 0.14, w * 0.3, h * 0.3, 0.14]), 3)),
    new THREE.PointsMaterial({ size: 0.35, map: dotTex(), color: 0xfff6c0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  mesh.add(spark);
  const hv = {};
  let t = 0;
  addObject(level, mesh, (dt) => {
    t += visDt(level, hv, dt);
    mesh.position.y = y - st.k * (h + 0.05);
    mesh.visible = st.k < 1;
    spark.material.opacity = st.want ? 0 : 0.35 + 0.65 * Math.max(0, Math.sin(t * 2.2));
  });
  return handle;
}

/**
 * Saal-Kulisse (6-3): Seitenwände, Dach über dem Saal (geschwungene Dachkanten), Laternen unter den Decken, Wandbilder
 * (Kirschzweig, Berge), Tatami-Läufer auf dem Boden. o: { x0, x1, zF, zB, floors: [y, …], roof (Oberkante der Wände) }.
 */
export function saalZier(level, o) {
  if (!level.view) return;
  const { x0, x1, zF, zB } = o;
  const b = new Bld(), g = new Bld();
  // Seitenwände außen (Optik; Kollision baut der Level)
  for (const [x, f] of [[x0 - 0.3, 1], [x1 + 0.3, -1]]) paperWall(b, { axis: 'z', z0: zB - 0.6, z1: zF + 0.4, x, y0: o.floors[0], y1: o.roof, d: 0.6, face: f });
  // Eckpfeiler vorn (rot) und Querbalken unter dem Dach
  for (const x of [x0 - 0.3, x1 + 0.3]) b.box(0.8, o.roof - o.floors[0] + 0.6, 0.8, x, o.floors[0], zF + 0.2, litTop(LACK, 0.7), { r: 0.08 });
  // Tatami-Läufer und Dielen auf dem untersten Boden
  const y = o.floors[0];
  for (let x = x0 + 1; x < x1 - 1; x += 2.1) {
    b.box(1.9, 0.04, 2.8, x + 0.95, y, (zF + zB) / 2 + 1.6, x % 4 < 2 ? 0xc8c87a : 0xbcbc6e, { r: 0 });
    b.box(1.95, 0.05, 0.08, x + 0.95, y, (zF + zB) / 2 + 3.02, 0x3a6a3a, { r: 0 });
  }
  // Wandbilder (Kirschzweig auf Papier, Berge) an den Rückwänden
  for (const [px, py] of o.paintings ?? []) {
    b.box(1.8, 1.2, 0.06, px, py, zB + 0.33, litTop(0xfff8ec, 0.9), { r: 0.02 });
    b.box(1.95, 0.08, 0.08, px, py + 1.2, zB + 0.34, WOOD_DK, { r: 0.02 });
    for (let k = 0; k < 5; k++) g.sphere(0.09, px - 0.6 + k * 0.28, py + 0.5 + Math.sin(k * 1.7) * 0.25, zB + 0.37, 0xff9ac8, { ws: 6, hs: 4 });
    b.box(1.3, 0.04, 0.02, px - 0.1, py + 0.55, zB + 0.37, 0x5a3a24, { r: 0, rz: 0.2 });
    b.cone(0.45, 0.6, px + 0.45, py + 0.05, zB + 0.37, 0x8aa0c8, 4, { s: [1, 1, 0.08] });
  }
  b.flush(level, { castShadow: false });
  g.flush(level, { material: 'glow', castShadow: false });
}

const DACH = { blau: [0x1e3a6a, 0x4a7ac8], gruen: [0x1e5a4a, 0x4aa88a], rot: [0x8a1a1a, 0xd84a3a] };

/**
 * Sparsames Fernost-Dach (statt des Registry-Modells mit vielen Balkenköpfen): Walmdach aus einem flachen Drehkörper
 * (Kreis → Rechteck, konkaves Profil, Ecken hochgezogen), lackierte Traufkante, goldene Eckknäufe und Firstzier.
 * list: [{ pos: [x, y (Traufhöhe), z], width, depth, height, color: 'blau'|'gruen'|'rot', yaw }]. ≈ 400 Dreiecke je Dach.
 */
export function daecher(level, list, o = {}) {
  if (!level.view) return;
  const b = new Bld(), g = new Bld();
  for (const it of list) {
    const [x, y, z] = it.pos, w = it.width ?? 6, d = it.depth ?? 4, h = it.height ?? 2, C = DACH[it.color] ?? DACH.blau;
    const prof = [];
    const N = 6;
    for (let i = 0; i <= N; i++) { const t = i / N; prof.push(new THREE.Vector2(Math.max(0.001, 1 - t), h * (1 - Math.pow(1 - t, 0.55)) * 0.98 + 0.02)); }
    const lg = new THREE.LatheGeometry(prof, 20);
    const P = lg.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const px = P.getX(i), py = P.getY(i), pz = P.getZ(i);
      const r = Math.hypot(px, pz);
      if (r < 1e-4) continue;
      const a = Math.atan2(pz, px), c = Math.cos(a), s = Math.sin(a);
      const sq = 1 / Math.max(Math.abs(c), Math.abs(s));
      const corner = (sq - 1) / (Math.SQRT2 - 1);
      const edge = smooth(0.7, 1, r);
      P.setXYZ(i, c * r * sq * (w / 2 + 0.6), py + edge * edge * corner * corner * h * 0.38 + edge * h * 0.05, s * r * sq * (d / 2 + 0.6));
    }
    lg.computeVertexNormals();
    const top = new THREE.Color(C[1]), dark = new THREE.Color(C[0]), cc = new THREE.Color();
    b.add(lg, { v: (px, py, pz, nx, ny) => cc.copy(dark).lerp(top, Math.max(0, Math.min(1, ny * 0.6 + 0.25 + (py / h) * 0.2))) }, { p: [x, y, z], r: [0, it.yaw ?? 0, 0] });
    // Traufkante (vier lackierte Leisten) und Unterseite
    const cy = y + h * 0.06;
    b.box(w + 1.3, 0.16, 0.18, x, cy, z + d / 2 + 0.6, LACK, { r: 0 }); b.box(w + 1.3, 0.16, 0.18, x, cy, z - d / 2 - 0.6, LACK, { r: 0 });
    b.box(0.18, 0.16, d + 1.3, x + w / 2 + 0.6, cy, z, LACK, { r: 0 }); b.box(0.18, 0.16, d + 1.3, x - w / 2 - 0.6, cy, z, LACK, { r: 0 });
    b.box(w + 1.1, 0.04, d + 1.1, x, y, z, WOOD_DK, { r: 0 });
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) g.sphere(0.16, x + sx * (w / 2 + 0.6), y + h * 0.43, z + sz * (d / 2 + 0.6), GOLD, { ws: 8, hs: 6 });
    g.sphere(0.2, x, y + h + 0.45, z, GOLD, { ws: 8, hs: 6 });
    b.cyl(0.1, 0.18, 0.4, x, y + h, z, GOLD, 8);
  }
  b.flush(level, { castShadow: o.shadow ?? true });
  g.flush(level, { material: 'glow', castShadow: false });
}

/**
 * Laternen (sparsam, statisch): 'stein' = Steinlaterne mit leuchtendem Papierfenster, 'pfahl' = Holzpfahl mit Papierlaterne,
 * 'haengend' = Papierlaterne an einer Schnur (pos = Aufhängung). list: [{ kind, pos, color }]. Leuchtendes im Glüh-Material.
 */
export function laternen(level, list) {
  if (!level.view) return;
  const b = new Bld(), g = new Bld();
  const paper = (x, y, z, col) => {
    g.sphere(0.32, x, y, z, col ?? 0xffb860, { s: [1, 1.25, 1], ws: 10, hs: 7 });
    b.cyl(0.2, 0.22, 0.08, x, y + 0.36, z, LACK_DK, 8); b.cyl(0.22, 0.2, 0.08, x, y - 0.44, z, LACK_DK, 8);
  };
  for (const it of list) {
    const [x, y, z] = it.pos;
    if (it.kind === 'stein') {
      b.box(0.9, 0.25, 0.9, x, y, z, litTop(0xb8b0a0, 0.7), { r: 0.04 });
      b.cyl(0.18, 0.22, 0.9, x, y + 0.25, z, 0xa8a090, 8);
      b.box(0.7, 0.18, 0.7, x, y + 1.15, z, litTop(0xb8b0a0, 0.7), { r: 0.03 });
      g.box(0.46, 0.46, 0.46, x, y + 1.33, z, it.color ?? 0xffd890, { r: 0.03 });
      for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) b.box(0.08, 0.46, 0.08, x + sx * 0.25, y + 1.33, z + sz * 0.25, 0x8a8478, { r: 0 });
      b.cone(0.62, 0.42, x, y + 1.79, z, litTop(0x9a9282, 0.7), 4, { yaw: Math.PI / 4 });
      b.sphere(0.09, x, y + 2.25, z, 0x9a9282, { ws: 6, hs: 4 });
    } else if (it.kind === 'pfahl') {
      b.cyl(0.08, 0.1, 2.4, x, y, z, WOOD_DK, 6);
      b.box(0.7, 0.08, 0.08, x + 0.3, y + 2.3, z, WOOD_DK, { r: 0 });
      b.cyl(0.015, 0.015, 0.3, x + 0.6, y + 2.0, z, 0x3a2a1a, 4);
      paper(x + 0.6, y + 1.6, z, it.color);
    } else {
      b.cyl(0.015, 0.015, 0.5, x, y - 0.5, z, 0x3a2a1a, 4);
      paper(x, y - 0.9, z, it.color);
    }
  }
  b.flush(level);
  g.flush(level, { material: 'glow', castShadow: false });
}

/**
 * Kleine Kulisse (statisch, sparsam) für Hof, Terrassen und Gärten – Fantasie-Festschmuck ohne reale Symbolik:
 *   trommel  große Festtrommel auf einem Holzbock (yaw)          schirm   roter Papierschirm (color, size)
 *   kuebel   Holzkübel mit Blumen (size)                        bonsai   Topf mit kleinem Kiefernbäumchen (size)
 *   teich    Teich mit Steinrand, Wasser, Koi und Seerosen (size [w, d]) – Wasser nur Optik, 0,1 m tief
 *   kette    Lichterkette mit kleinen Laternen von pos nach to (sag, n)
 *   moos     Moos-/Blumenflecken auf dem Boden (size [w, d], n) – flach, ohne Schatten
 *   steine   Trittsteine von pos nach to (n)                    fahne    Fahnenmast mit langem Wimpel (color, height)
 *   bank     Holzbank (yaw)                                     blumen   Blumenbeet (size [w, d], n, colors)
 * list: [{ kind, pos: [x, y, z], … }]. Kollision nur für trommel, kuebel, bonsai, bank (niedrige Quader).
 */
export function zier(level, list, o = {}) {
  const rnd = new Rnd(o.seed ?? 31);
  const b = new Bld(), g = new Bld(), flat = new Bld();
  const solid = (x0, x1, y0, y1, z0, z1) => level.world.add({ type: 'box', min: [x0, y0, z0], max: [x1, y1, z1], tag: 'zier' });
  for (const it of list) {
    const [x, y, z] = it.pos;
    const yaw = it.yaw ?? 0;
    switch (it.kind) {
      case 'trommel': {
        const s = it.size ?? 1;
        solid(x - 0.8 * s, x + 0.8 * s, y, y + 1.6 * s, z - 0.8 * s, z + 0.8 * s);
        for (const sx of [-1, 1]) b.box(0.12 * s, 1.1 * s, 0.12 * s, x + sx * 0.55 * s, y, z, WOOD_DK, { r: 0, rz: sx * 0.35 });
        b.cyl(0.62 * s, 0.62 * s, 0.9 * s, x, y + 1.1 * s, z, litTop(LACK, 0.6), 14, { rx: HALF_PI, yaw });
        b.cyl(0.66 * s, 0.66 * s, 0.9 * s - 0.2, x, y + 1.1 * s, z, LACK_DK, 14, { rx: HALF_PI, yaw });
        for (const sz of [-1, 1]) {
          const fx = -Math.sin(yaw) * sz * 0.46 * s, fz = Math.cos(yaw) * sz * 0.46 * s;
          b.cyl(0.6 * s, 0.6 * s, 0.03, x + fx, y + 1.1 * s, z + fz, 0xf6e6c4, 14, { rx: HALF_PI, yaw });
          g.torus(0.6 * s, 0.035, x + fx, y + 1.1 * s, z + fz, GOLD, { yaw, rs: 4, ts: 16 });
        }
        break;
      }
      case 'schirm': {
        const s = it.size ?? 1;
        b.cyl(0.04, 0.05, 2.4 * s, x, y, z, WOOD_DK, 5);
        b.cone(1.5 * s, 0.6 * s, x, y + 2.1 * s, z, { v: (px, py, pz) => new THREE.Color(Math.sin(Math.atan2(pz, px) * 8) > 0 ? (it.color ?? LACK) : 0xfff2e0) }, 16);
        g.sphere(0.07, x, y + 2.75 * s, z, GOLD, { ws: 6, hs: 4 });
        break;
      }
      case 'kuebel': {
        const s = it.size ?? 1;
        solid(x - 0.45 * s, x + 0.45 * s, y, y + 0.6 * s, z - 0.45 * s, z + 0.45 * s);
        b.box(0.9 * s, 0.6 * s, 0.9 * s, x, y, z, litTop(WOOD, 0.6), { r: 0.04 });
        b.box(0.96 * s, 0.08, 0.96 * s, x, y + 0.5 * s, z, LACK, { r: 0 });
        b.sphere(0.42 * s, x, y + 0.65 * s, z, 0x3a9a3a, { s: [1, 0.55, 1], ws: 8, hs: 5 });
        for (let k = 0; k < 7; k++) {
          const a = k * 2.4, r = 0.25 * s * (k % 3 ? 1 : 0.4);
          g.sphere(0.08 * s, x + Math.cos(a) * r, y + 0.85 * s, z + Math.sin(a) * r, [0xff7ac0, 0xffffff, 0xffd84a, 0xff5a5a][k % 4], { ws: 5, hs: 4 });
        }
        break;
      }
      case 'bonsai': {
        const s = it.size ?? 1;
        solid(x - 0.4 * s, x + 0.4 * s, y, y + 0.4 * s, z - 0.4 * s, z + 0.4 * s);
        b.box(0.8 * s, 0.35 * s, 0.6 * s, x, y, z, litTop(0x3a5a8a, 0.6), { r: 0.05 });
        b.cyl(0.07 * s, 0.1 * s, 0.9 * s, x, y + 0.3 * s, z, 0x6a4428, 5, { rz: 0.35 });
        for (const [dx, dy, dz, r] of [[0.3, 1.1, 0, 0.32], [-0.15, 0.95, 0.15, 0.26], [0.05, 1.32, -0.05, 0.22]]) b.sphere(r * s, x + dx * s, y + dy * s, z + dz * s, litTop(0x3a8a4a, 0.6), { s: [1.3, 0.55, 1.1], ws: 7, hs: 5 });
        break;
      }
      case 'teich': {
        const [w, d] = it.size ?? [5, 3];
        const n = 18;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU;
          b.sphere(0.32, x + Math.cos(a) * w / 2, y + 0.05, z + Math.sin(a) * d / 2, litTop(0xa8a090, 0.7), { s: [1.3, 0.55, 1], ws: 6, hs: 4 });
        }
        const water = new THREE.CircleGeometry(1, 24).toNonIndexed();
        water.rotateX(-HALF_PI); water.scale(w / 2, 1, d / 2); water.translate(x, y + 0.08, z);
        const wa = L(0x4ac0e8), wb = L(0x2a7ab8);
        addStatic(level, colorize(water, (p, nn, c) => mixc(wb, wa, smooth(0, 1, Math.hypot((p.x - x) / (w / 2), (p.z - z) / (d / 2))), c)), { castShadow: false });
        for (let k = 0; k < (it.koi ?? 4); k++) {
          const a = rnd.real(0, TAU), r = rnd.real(0.2, 0.6);
          const kx = x + Math.cos(a) * r * w / 2, kz = z + Math.sin(a) * r * d / 2;
          flat.sphere(0.2, kx, y + 0.1, kz, k % 2 ? 0xff7a2a : 0xfff4e8, { s: [1.8, 0.35, 0.8], yaw: rnd.real(0, TAU), ws: 7, hs: 4 });
        }
        for (let k = 0; k < 3; k++) flat.cyl(0.35, 0.35, 0.03, x + rnd.real(-w / 3, w / 3), y + 0.1, z + rnd.real(-d / 3, d / 3), 0x5ab84a, 10);
        break;
      }
      case 'kette': {
        const [tx, ty, tz] = it.to, n = it.n ?? 8, sag = it.sag ?? 0.8;
        for (let i = 0; i <= n; i++) {
          const t = i / n, px = x + (tx - x) * t, pz = z + (tz - z) * t, py = y + (ty - y) * t - Math.sin(t * Math.PI) * sag;
          if (i < n) {
            const t2 = (i + 1) / n, qx = x + (tx - x) * t2, qz = z + (tz - z) * t2, qy = y + (ty - y) * t2 - Math.sin(t2 * Math.PI) * sag;
            const L2 = Math.hypot(qx - px, qy - py, qz - pz);
            const gg = new THREE.CylinderGeometry(0.015, 0.015, L2, 3);
            gg.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(qx - px, qy - py, qz - pz).normalize()));
            b.add(gg, 0x3a2a1a, { p: [(px + qx) / 2, (py + qy) / 2, (pz + qz) / 2] });
          }
          if (i > 0 && i < n) g.sphere(0.16, px, py - 0.22, pz, [0xff7a5a, 0xffd860, 0xff9ad0][i % 3], { s: [1, 1.2, 1], ws: 7, hs: 5 });
        }
        break;
      }
      case 'moos': {
        const [w, d] = it.size ?? [4, 4];
        for (let k = 0; k < (it.n ?? 8); k++) {
          const px = x + rnd.real(-w / 2, w / 2), pz = z + rnd.real(-d / 2, d / 2), r = rnd.real(0.3, 0.8);
          flat.cyl(r, r * 1.05, 0.04, px, y + 0.005, pz, rnd.frac() < 0.5 ? 0x6ab84a : 0x8ac85a, 9);
          if (rnd.frac() < 0.5) g.sphere(0.07, px + r * 0.4, y + 0.08, pz, it.flower ?? 0xffffff, { ws: 5, hs: 3 });
        }
        break;
      }
      case 'steine': {
        const [tx, , tz] = it.to, n = it.n ?? 5;
        for (let i = 0; i < n; i++) {
          const t = n === 1 ? 0 : i / (n - 1);
          flat.cyl(0.42, 0.46, 0.06, x + (tx - x) * t + rnd.real(-0.15, 0.15), y + 0.005, z + (tz - z) * t + rnd.real(-0.15, 0.15), 0xb8b0a0, 9);
        }
        break;
      }
      case 'fahne': {
        const h = it.height ?? 5;
        b.cyl(0.06, 0.08, h, x, y, z, WOOD_DK, 6);
        g.sphere(0.12, x, y + h + 0.08, z, GOLD, { ws: 6, hs: 4 });
        b.box(0.05, h * 0.55, 0.7, x, y + h * 0.4, z + 0.42, litTop(it.color ?? LACK, 0.75), { r: 0 });
        b.box(0.06, 0.08, 0.8, x, y + h * 0.95, z + 0.4, WOOD_DK, { r: 0 });
        break;
      }
      case 'bank': {
        const c = Math.cos(yaw), s = Math.sin(yaw);
        const ex = Math.abs(c) * 0.9 + Math.abs(s) * 0.25, ez = Math.abs(s) * 0.9 + Math.abs(c) * 0.25;
        solid(x - ex, x + ex, y, y + 0.45, z - ez, z + ez);
        b.box(1.8, 0.1, 0.5, x, y + 0.4, z, litTop(WOOD_LT, 0.7), { r: 0.02, yaw });
        for (const k of [-0.7, 0.7]) b.box(0.12, 0.4, 0.45, x + c * k, y, z - s * k, WOOD_DK, { r: 0, yaw });
        break;
      }
      case 'blumen': {
        const [w, d] = it.size ?? [3, 1.5];
        const cols = it.colors ?? [0xff7ac0, 0xffd84a, 0xffffff, 0xff5a5a, 0xb07aff];
        flat.box(w, 0.12, d, x, y, z, 0x6a4a2a, { r: 0 });
        for (let k = 0; k < (it.n ?? 14); k++) {
          const px = x + rnd.real(-w / 2 + 0.15, w / 2 - 0.15), pz = z + rnd.real(-d / 2 + 0.15, d / 2 - 0.15);
          flat.cyl(0.02, 0.02, 0.3, px, y + 0.1, pz, 0x3a8a3a, 3);
          g.sphere(0.1, px, y + 0.42, pz, cols[k % cols.length], { ws: 5, hs: 4 });
        }
        break;
      }
      case 'huette': {
        // Stelzenhütte mit Strohdach (nur Optik; Kollision: Stelzen-Quader)
        const s = it.size ?? 1;
        solid(x - 1.6 * s, x + 1.6 * s, y, y + 1.4 * s, z - 1.4 * s, z + 1.4 * s);
        for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) b.cyl(0.12 * s, 0.14 * s, 1.4 * s, x + sx * 1.4 * s, y, z + sz * 1.2 * s, 0x6a4428, 6);
        b.box(3.2 * s, 0.2 * s, 2.8 * s, x, y + 1.3 * s, z, litTop(WOOD_LT, 0.7), { r: 0 });
        b.box(2.8 * s, 1.5 * s, 2.4 * s, x, y + 1.5 * s, z, litTop(0xc89a5a, 0.7), { r: 0.04 });
        b.box(0.8 * s, 1.1 * s, 0.06, x + 0.4 * s, y + 1.5 * s, z + 1.22 * s, 0x3a2414, { r: 0 });
        b.cone(2.6 * s, 1.8 * s, x, y + 3.0 * s, z, litTop(0xd8b860, 0.6), 4, { yaw: Math.PI / 4, s: [1, 1, 0.9] });
        g.box(0.5 * s, 0.4 * s, 0.06, x - 0.7 * s, y + 2.1 * s, z + 1.22 * s, 0xffd890, { r: 0 });
        break;
      }
      case 'stamm': {
        // umgestürzter Baumstamm (moosig), längs yaw
        const L2 = it.length ?? 4, r = it.r ?? 0.45;
        solid(x - Math.abs(Math.cos(yaw)) * L2 / 2 - r, x + Math.abs(Math.cos(yaw)) * L2 / 2 + r, y, y + r * 1.6, z - Math.abs(Math.sin(yaw)) * L2 / 2 - r, z + Math.abs(Math.sin(yaw)) * L2 / 2 + r);
        b.cyl(r, r * 1.1, L2, x, y + r, z, { v: (px, py, pz, nx, ny) => new THREE.Color(ny > 0.5 ? 0x5aa83a : 0x7a5232) }, 9, { rz: HALF_PI, yaw });
        break;
      }
      default: break;
    }
  }
  if (!level.view) return;
  b.flush(level);
  g.flush(level, { material: 'glow', castShadow: false });
  flat.flush(level, { castShadow: false });
}
