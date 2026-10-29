// Hilfen für die Welt-8-Level 8-A „Goldglibber-Zugabe im Brummbär-Zirkus“ und 8-B „Heiße Manege für den rosa
// Schlangenkönig“ (kein Level: exportiert kein LEVEL, die Level-Registry überspringt dieses Modul). Gemeinsame Dateien
// werden nicht verändert; alles Level-Lokale hängt sich über die offiziellen Aufbau-Haken an (LEVEL.prebuild /
// LEVEL.build / LEVEL.setup, level.onStep, view.onFrame). Gelesen (nicht verändert) werden die Zirkus-Hilfen aus 3-B
// (w3/_helpers_e.js) und 6-C (w6/_helpers_d.js).
//
//   1) Stimmung       rummelAbend (Abend über dem Brummbär-Rummelplatz: Thema circus als lokale Variante mit Abendhimmel,
//                     Baron-Turm, Riesenrad, Achterbahn; für 8-B dazu der Lavasee des Infernos)
//   2) Zelt           farbZelt (Zirkuszelt aufgeschnitten wie 3-B, Bahnen in eigener Farbe: gold-lila bzw. rosa-rot)
//   3) Rummel         hauDenLukas (Kraftmesser: nur die Stampfattacke schlägt den Schlitten bis zur Glocke),
//                     rummelPflaster (Pflaster, roter Teppich mit Goldkante, Stern-Mosaik), plakat (Plakatwand mit
//                     eigener Leinwand: goldene Würfelblase bzw. rosa Schlangenkönig), zuckerwatte (Zuckerwatte-Wolken
//                     als Zier), glutRand (glühender Rand an Lavakanten)
//   4) Münzen         line, ring, arc, column (aus 6-C)
//
// Alles Statische wird verschmolzen (addStatic → Abschnitts-Meshes); Bewegtes ist je Objekt ein Mesh.

import * as THREE from 'three';
import { lin, hex, mixc, smooth, colorize, merge, addStatic, addObject, Rnd } from '../../blocks/kit.js';
import { Gimmick, runAction, playerOn, visDt } from '../../entities/gimmick.js';
import { banner } from '../../blocks/w3kit.js';
import { getModel } from '../../models/index.js';
import { baronPark, crystalInferno, animateW8 } from '../../view/backdrop_w8.js';
import { cylG, sphereG, coneG, blockG, starG, discG, ringG, bake, owned, spawnLocal, litFn } from '../w3/_helpers_e.js';
import { line, ring, arc, column } from '../w6/_helpers_d.js';

export { line, ring, arc, column, cylG, sphereG, coneG, blockG, starG, discG, ringG, bake, owned, spawnLocal };

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ease = (k) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
const L = (c) => lin(hex(c));
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const fill = (g, c) => { const v = L(c); return colorize(ni(g), (p, n, o) => { o[0] = v[0]; o[1] = v[1]; o[2] = v[2]; }); };

// ====================================================================== 1) Stimmung

/**
 * Abend über dem Brummbär-Rummelplatz (LEVEL.prebuild): das gemeinsame Thema circus bleibt unverändert, das Level setzt eine
 * lokale Variante – violett-oranger Abendhimmel mit ersten Sternen, warmes, tiefes Licht, und als Kulisse der Rummelplatz
 * des Barons (Turm hinten in der Mitte, Riesenrad, Achterbahn-Bögen, Zelte mit Lichterketten; backdrop_w8 baronPark).
 * o = { lava: false (8-B: Lavasee des Infernos mit Kristallfelsen und Vulkanen unter dem Rummel), floor: −22 (Rummel-
 *       Boden der Kulisse), lavaY: −9, glow: Farbton des Himmels am Horizont }
 */
export function rummelAbend(level, o = {}) {
  const v = level.view;
  if (!v) return null;
  const base = v.theme;
  const th = {
    ...base,
    label: o.lava ? 'Glut-Rummel' : 'Rummel-Abend',
    sky: o.lava
      ? [[1, 0x180a2e], [0.45, 0x34144a], [0.16, 0x7a2a5a], [0.05, 0xd8504a], [0, 0xff8a4a], [-0.15, 0xa8301a], [-1, 0x2a0a0a]]
      : [[1, 0x150e3c], [0.45, 0x2e1a5e], [0.16, 0x7a3a82], [0.05, 0xe8706a], [0, 0xffa676], [-0.2, 0x8a3a5a], [-1, 0x1a0e24]],
    background: o.lava ? 0x5a1a2a : 0x5a2a5e,
    fog: o.lava ? { color: 0x6a2030, near: 55, far: 210 } : { color: 0x5e3064, near: 60, far: 220 },
    hemi: o.lava ? { sky: 0xffc8d8, ground: 0x8a3a2a, intensity: 1.3 } : { sky: 0xffd2e8, ground: 0x5a3a6a, intensity: 1.3 },
    sun: o.lava ? { color: 0xffb890, intensity: 2.3, dir: [0.35, 0.9, 0.55] } : { color: 0xffd0a8, intensity: 2.4, dir: [-0.3, 0.9, 0.55] },
    sunDisc: false,
    clouds: false,
    backdrop: 'rummel',
    buildBackdrop(sky, bounds, rnd, yBase) {
      sky.w8 = baronPark(sky, bounds, rnd, yBase, { y: o.floor ?? -22, towerDist: o.towerDist ?? 70, towerH: o.towerH ?? 120, tents: o.tents ?? 14 });
      if (o.lava) sky.w8b = crystalInferno(sky, bounds, rnd, yBase, { y: (o.lavaY ?? -9) - 1, lavaY: o.lavaY ?? -9, n: o.rocks ?? 18 });
    },
    updateBackdrop(sky, dt, camera) { animateW8(sky.w8, dt, camera); if (sky.w8b) animateW8(sky.w8b, dt, camera); },
  };
  const k = v.toyLight;
  v.theme = th;
  if (v.three.background?.isColor) v.three.background.set(th.background);
  if (v.three.fog) { v.three.fog.color.set(th.fog.color); v.three.fog.near = th.fog.near; v.three.fog.far = th.fog.far; }
  if (v.hemi) { v.hemi.color.set(th.hemi.sky); v.hemi.groundColor.set(th.hemi.ground); v.hemi.intensity = th.hemi.intensity * (k?.hemi ?? 1); }
  if (v.sun) { v.sun.color.set(th.sun.color); v.sun.intensity = th.sun.intensity * (k?.sun ?? 1); }
  v.sunDir?.set(...th.sun.dir).normalize();
  const sky = v.sky;
  if (sky) {
    sky.theme = th;
    if (sky.domeGroup) sky.group.remove(sky.domeGroup);
    sky.buildDome();
  }
  return th;
}

// ====================================================================== 2) Zelt

/**
 * Zirkuszelt (Modell zirkuszelt) mit eigener Bahnenfarbe und Schnittebene wie in 3-B: steht die Figur draußen, ist das
 * Zelt ganz zu sehen; geht sie hinein, gleitet die Schnittebene in ≈ 1 s bis knapp vor die Mitte – die vordere Hälfte
 * verschwindet. o = { center, radius, height, inside: (p) => bool, cut: 3, stripe: 0xe8283a (statt Rot), cream: (statt
 * Weiß), trim: (statt Gold) }
 */
export function farbZelt(level, o) {
  if (!level.view) return null;
  const [cx, cy, cz] = o.center;
  const m = getModel('zirkuszelt', { radius: o.radius, height: o.height });
  m.root.position.set(cx, cy, cz);
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 1e5);
  const RED = L(0xe8283a), WHITE = L(0xfff6ee), GOLD = L(0xffc21a);
  const near = (c, r, e = 0.02) => Math.abs(c[0] - r[0]) < e && Math.abs(c[1] - r[1]) < e && Math.abs(c[2] - r[2]) < e;
  const to = { red: o.stripe ? L(o.stripe) : null, white: o.cream ? L(o.cream) : null, gold: o.trim ? L(o.trim) : null };
  m.root.traverse((x) => {
    if (!x.isMesh) return;
    const col = x.geometry.getAttribute('color');
    if (col && (to.red || to.white || to.gold)) {
      x.geometry = x.geometry.clone();
      const a = x.geometry.getAttribute('color');
      const c = [0, 0, 0];
      for (let i = 0; i < a.count; i++) {
        c[0] = a.getX(i); c[1] = a.getY(i); c[2] = a.getZ(i);
        const t = to.red && near(c, RED) ? to.red : to.white && near(c, WHITE) ? to.white : to.gold && near(c, GOLD) ? to.gold : null;
        if (t) a.setXYZ(i, t[0], t[1], t[2]);
      }
      a.needsUpdate = true;
    }
    x.material = x.material.clone();
    x.material.clippingPlanes = [plane];
    x.material.clipShadows = true;
    x.castShadow = false;
    x.userData.owned = true;
  });
  level.view.renderer.localClippingEnabled = true;
  addObject(level, m.root);
  const st = { k: 0, plane, root: m.root };
  const far = cz + o.radius + 2, cut = cz + (o.cut ?? 3);
  level.onStep((dt) => {
    const p = level.player;
    const want = p && o.inside(p) ? 1 : 0;
    st.k = want ? Math.min(1, st.k + dt / 0.9) : Math.max(0, st.k - dt / 0.9);
  });
  level.view.onFrame(() => { plane.constant = st.k <= 0 ? 1e5 : far + (cut - far) * ease(st.k); });
  return st;
}

// ====================================================================== 3) Rummel

/**
 * Hau den Lukas (Kraftmesser, 8-A Stern 1): vor einer bunten Messlatte liegt die Schlagplatte. Landet eine Figur mit der
 * **Stampfattacke** darauf (bzw. Riesentrank), saust der Schlitten bis zur goldenen Glocke hinauf – es klingelt, Konfetti,
 * Aktion onRing (einmal). Ein normaler Sprung auf die Platte schlägt den Schlitten nur ein Stück hoch („Fester!“),
 * Darüberlaufen gar nicht. Die Glocke lässt sich beliebig oft läuten.
 * spec = { id, pos: [x, y, z] (Mitte der Plattenunterseite), height: 7 (Glocke), back: [0, −1] (Richtung Platte → Latte),
 *          onRing: Aktion, banner: true }
 * Laufzeit: state ('ruhe' | 'hoch' | 'oben' | 'runter'), k (Schlittenhöhe 0..1), strikes, rings, best, via, info().
 */
export class HauDenLukas extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'hau_den_lukas');
    this.H = spec.height ?? 7;
    this.half.set(0.75, 0.2, 0.75);
    this.touch = false;
    const p = this.pos;
    const [bx, bz] = spec.back ?? [0, -1];
    const bl = Math.hypot(bx, bz) || 1;
    this.dir = { x: bx / bl, z: bz / bl };
    this.PAD = 0.35;
    this.padShape = this.addSolid({ type: 'box', min: [p.x - 0.75, p.y, p.z - 0.75], max: [p.x + 0.75, p.y + this.PAD, p.z + 0.75], tag: 'hau_den_lukas' });
    this.col = { x: p.x + this.dir.x * 1.2, z: p.z + this.dir.z * 1.2 };
    const c = this.col;
    this.addSolid({ type: 'box', min: [c.x - 0.32, p.y, c.z - 0.32], max: [c.x + 0.32, p.y + this.H + 0.4, c.z + 0.32], tag: 'hau_den_lukas:latte' });
    this.state = 'ruhe';
    this.k = 0; this.k0 = 0; this.goal = 0; this.t = 0;
    this.strikes = 0; this.rings = 0; this.best = 0; this.via = null;
    this.wasOn = false;
    this.swing = 0;
    this.rung = false;
    if (level.view) this.buildView();
  }

  /** Statische Teile (verschmolzen) und zwei bewegte: Schlitten, Glocke. */
  buildView() {
    const p = this.pos, c = this.col, H = this.H, d = this.dir;
    const yaw = Math.atan2(d.x, d.z);   // lokales +Z zeigt zur Latte
    const P = [], G = [];
    // Sockel und Schlagplatte (Zielscheibe rot-weiß)
    P.push(cylG(0.8, 0.86, this.PAD - 0.08, p.x, p.y, p.z, 0x6a2a8a, 20));
    for (let i = 0; i < 4; i++) P.push(discG(0, 0.74 - i * 0.18, p.x, p.y + this.PAD - 0.07 + i * 0.004, p.z, i % 2 ? 0xfff2e8 : 0xe8283a, 28));
    P.push(ringG(0.8, 0.05, p.x, p.y + this.PAD - 0.08, p.z, 0xffc21a, 28));
    // Latte: Brett mit Skala (grün → gelb → rot), Rahmen, Fuß
    const seg = 10;
    for (let i = 0; i < seg; i++) {
      const y0 = p.y + 0.6 + (i / seg) * (H - 0.8), h = (H - 0.8) / seg;
      const col = i < 4 ? 0x3ac85a : i < 7 ? 0xffc21a : 0xe8283a;
      const g = blockG(0.5, h - 0.04, 0.08, 0, 0, 0, col, { r: 0, seg: 0 });
      g.translate(0, y0, -0.28); g.rotateY(yaw); g.translate(c.x, 0, c.z);
      G.push(g);
    }
    const frame = [blockG(0.16, H + 0.2, 0.5, -0.33, p.y, 0, 0xfff2e0), blockG(0.16, H + 0.2, 0.5, 0.33, p.y, 0, 0xfff2e0),
      blockG(0.56, H - 0.2, 0.4, 0, p.y + 0.2, 0.08, 0x2a1a4a, { r: 0, seg: 0 }), blockG(1.3, 0.5, 1.0, 0, p.y, 0, 0x7a2a9a)];
    for (const g of frame) { g.rotateY(yaw); g.translate(c.x, 0, c.z); P.push(g); }
    // Stern-Schild oben, Glockenhalter
    const top = coneG(0.4, 0.5, 0, p.y + H + 0.2, 0, 0xffc21a, 12);
    top.rotateY(yaw); top.translate(c.x, 0, c.z); P.push(top);
    // Buchstaben-Schildchen: „LUKAS“ als bunte Kugeln
    const k = [0xff4a6a, 0xffd04a, 0x5ad8ff, 0x8ae05a, 0xc07aff];
    for (let i = 0; i < 5; i++) { const g = sphereG(0.13, 0, p.y + 0.9 + i * 0.36, -0.36, k[i], { ws: 8, hs: 6 }); g.rotateY(yaw); g.translate(c.x, 0, c.z); G.push(g); }
    bake(this.level, P);
    bake(this.level, G, { material: 'glow', castShadow: false });
    // Schlitten (roter Klotz mit Goldrand) – fährt die Latte hinauf
    const sled = new THREE.Mesh(merge([blockG(0.62, 0.36, 0.3, 0, -0.18, 0, 0xe8283a), blockG(0.68, 0.06, 0.34, 0, 0.12, 0, 0xffc21a)]), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 }));
    this.sled = owned(sled);
    sled.rotation.y = yaw;
    addObject(this.level, sled);
    // Glocke (golden, schwingt beim Läuten)
    const bellG = merge([cylG(0.18, 0.42, 0.5, 0, -0.5, 0, 0xffc21a, 16), sphereG(0.1, 0, -0.55, 0, 0xc8901a), cylG(0.06, 0.06, 0.2, 0, 0, 0, 0x8a6a2a, 6)]);
    const bell = new THREE.Mesh(bellG, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.6, emissive: 0x302000 }));
    this.bell = owned(bell);
    bell.position.set(c.x - this.dir.x * 0.1, p.y + H + 0.15, c.z - this.dir.z * 0.1);
    bell.rotation.y = yaw;
    addObject(this.level, bell);
    this.render(0, 0);
  }

  onPound() { this.strike(1, 'stampfen'); }

  onHit(kind) { if (kind === 'mega') this.strike(1, 'mega'); }

  /** Schlag mit Stärke k (0..1): Schlitten saust bis k·Höhe; bei 1 klingelt die Glocke. */
  strike(k, via) {
    if (this.state !== 'ruhe' || this.hidden) return false;
    this.strikes++;
    this.via = via;
    this.best = Math.max(this.best, k);
    this.state = 'hoch'; this.t = 0; this.k0 = this.k; this.goal = clamp(k, 0, 1);
    this.level.sfx(k >= 1 ? 'slam' : 'bump');
    this.level.effects?.ring?.({ x: this.pos.x, y: this.pos.y + this.PAD, z: this.pos.z }, 1.2);
    return true;
  }

  update(dt) {
    if (this.hidden) return;
    const on = playerOn(this.level, this);
    if (on && !this.wasOn && this.state === 'ruhe') {
      const vy = this.level.player?.lastLandVy ?? 0;
      if (vy < -6) this.strike(clamp(0.18 + (-vy - 6) * 0.025, 0.2, 0.55), 'sprung');
    }
    this.wasOn = on;
    this.t += dt;
    if (this.state === 'hoch') {
      const T = 0.25 + this.goal * 0.45;
      this.k = this.k0 + (this.goal - this.k0) * ease(this.t / T);
      if (this.t >= T) {
        this.k = this.goal;
        this.state = 'oben'; this.t = 0;
        if (this.goal >= 1) this.ring();
        else if (this.spec.banner !== false) { banner(this.level, 'Fester – mit der Stampfattacke!', { color: '#ffd23a', size: 15, hold: 1.2 }); this.level.sfx('beep'); }
      }
    } else if (this.state === 'oben') {
      if (this.t >= (this.goal >= 1 ? 1.2 : 0.35)) { this.state = 'runter'; this.t = 0; this.k0 = this.k; }
    } else if (this.state === 'runter') {
      const T = 0.4 + this.k0 * 0.5;
      this.k = this.k0 * (1 - ease(this.t / T));
      if (this.t >= T) { this.k = 0; this.state = 'ruhe'; this.t = 0; }
    }
    if (this.swing > 0) this.swing = Math.max(0, this.swing - dt);
  }

  ring() {
    this.rings++;
    this.swing = 1.6;
    const top = { x: this.col.x, y: this.pos.y + this.H + 0.2, z: this.col.z };
    this.level.sfx('klingel');
    this.level.effects?.sparks(top, 30);
    this.level.effects?.sparks({ x: top.x, y: top.y + 0.8, z: top.z }, 20);
    if (!this.rung) {
      this.rung = true;
      if (this.spec.banner !== false) banner(this.level, 'Volltreffer!', { color: '#ffd23a', size: 20, hold: 1.2 });
      runAction(this.level, this.spec.onRing, { pos: [top.x, top.y, top.z], source: this, via: this.via });
    }
  }

  render(dt, t) {
    dt = visDt(this.level, this, dt);
    if (!this.sled) return;
    const p = this.pos, c = this.col;
    const y = p.y + 0.75 + this.k * (this.H - 1.1);
    this.sled.position.set(c.x - this.dir.x * 0.42, y, c.z - this.dir.z * 0.42);
    const s = this.swing;
    this.bell.rotation.z = s > 0 ? Math.sin((1.6 - s) * 18) * 0.5 * s / 1.6 : 0;
  }

  info() { return { state: this.state, k: +this.k.toFixed(2), strikes: this.strikes, rings: this.rings, best: +this.best.toFixed(2), via: this.via }; }
}

/** Hau den Lukas als lokale Entität anlegen (LEVEL.build oder setup). */
export function hauDenLukas(level, spec) { return spawnLocal(level, new HauDenLukas(level, spec)); }

/**
 * Rummel-Pflaster (Zier auf einer Insel-Oberseite, ohne Kollision): roter Teppich mit Goldkante entlang des Wegs und ein
 * Stern-Mosaik. o = { carpet: [{ x0, x1, z0, z1, y }], stars: [[x, y, z, r, Farbe]] }
 */
export function rummelPflaster(level, o) {
  if (!level.view) return;
  const P = [];
  for (const c of o.carpet ?? []) {
    const w = c.x1 - c.x0, d = c.z1 - c.z0, x = (c.x0 + c.x1) / 2, z = (c.z0 + c.z1) / 2;
    P.push(blockG(w, 0.03, d, x, c.y, z, c.color ?? 0xc8142a, { r: 0, seg: 0, top: c.color ?? 0xd21e34 }));
    for (const s of [-1, 1]) P.push(blockG(0.12, 0.04, d, x + s * (w / 2 + 0.06), c.y, z, 0xffc21a, { r: 0, seg: 0 }));
    // kleine Goldsterne auf dem Teppich
    for (let zz = c.z1 - 1.4; zz > c.z0 + 0.6; zz -= c.every ?? 3.2) P.push(starG(0.32, 0.14, x, c.y + 0.035, zz, 0xffd04a));
  }
  for (const [x, y, z, r, col] of o.stars ?? []) {
    P.push(discG(0, r * 1.15, x, y + 0.02, z, 0x2a1a4a, 32));
    P.push(starG(r, r * 0.45, x, y + 0.03, z, col ?? 0xffc21a));
    P.push(ringG(r * 1.15, 0.05, x, y + 0.02, z, 0xffc21a, 32));
  }
  bake(level, P, { castShadow: false });
}

/** Leinwand: Plakat mit der goldenen Würfelblase ('blase') bzw. dem rosa Schlangenkönig ('koenig'). */
function plakatTex(kind) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 320;
  const g = c.getContext('2d');
  const blase = kind === 'blase';
  g.fillStyle = blase ? '#2a1050' : '#3a0a1e'; g.fillRect(0, 0, 256, 320);
  g.fillStyle = blase ? '#ffc21a' : '#ff5aa8'; g.fillRect(8, 8, 240, 304);
  g.fillStyle = blase ? '#5a1a8a' : '#7a1430'; g.fillRect(16, 16, 224, 288);
  // Sterne bzw. Funken
  g.fillStyle = blase ? '#fff2a0' : '#ffb060';
  for (const [x, y, r] of [[40, 40, 7], [210, 52, 9], [34, 150, 5], [222, 168, 6], [128, 32, 5], [60, 220, 4], [200, 226, 5]]) {
    g.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.fill();
  }
  if (blase) {
    // goldener Gelee-Würfel mit Melonen-Hut, Schockwellen-Ringe darunter
    g.strokeStyle = '#ffe070'; g.lineWidth = 4;
    for (const r of [70, 92]) { g.beginPath(); g.ellipse(128, 212, r, r * 0.22, 0, 0, TAU); g.stroke(); }
    const grd = g.createLinearGradient(78, 104, 178, 204); grd.addColorStop(0, '#fff2a0'); grd.addColorStop(0.5, '#ffc21a'); grd.addColorStop(1, '#c8861a');
    g.fillStyle = grd; g.fillRect(78, 104, 100, 100);
    g.strokeStyle = '#fff6d0'; g.lineWidth = 5; g.strokeRect(78, 104, 100, 100);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(108, 144, 12, 0, TAU); g.arc(148, 144, 12, 0, TAU); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.arc(110, 146, 6, 0, TAU); g.arc(150, 146, 6, 0, TAU); g.fill();
    g.fillStyle = '#7a3ad8'; g.fillRect(96, 78, 64, 26); g.fillRect(84, 100, 88, 8);
    g.fillStyle = '#ff9ad0'; g.fillRect(96, 92, 64, 6);
  } else {
    // rosa Königsschlange mit Krone, Lavabrocken
    g.strokeStyle = '#ff7ac0'; g.lineWidth = 24; g.lineCap = 'round';
    g.beginPath(); g.moveTo(60, 226); g.bezierCurveTo(36, 170, 206, 184, 172, 134); g.bezierCurveTo(152, 98, 110, 108, 128, 88); g.stroke();
    g.strokeStyle = '#ffd0ea'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(60, 226); g.bezierCurveTo(36, 170, 206, 184, 172, 134); g.stroke();
    g.fillStyle = '#ff7ac0'; g.beginPath(); g.ellipse(132, 82, 28, 19, -0.3, 0, TAU); g.fill();
    g.fillStyle = '#ffc21a'; g.beginPath(); g.moveTo(110, 68); g.lineTo(114, 40); g.lineTo(125, 57); g.lineTo(134, 36); g.lineTo(143, 57); g.lineTo(154, 42); g.lineTo(152, 68); g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(142, 78, 5, 0, TAU); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.arc(143, 78, 2.5, 0, TAU); g.fill();
    for (const [x, y] of [[196, 104], [212, 140], [48, 120]]) { g.fillStyle = '#ff6a1a'; g.beginPath(); g.arc(x, y, 10, 0, TAU); g.fill(); g.fillStyle = '#ffd04a'; g.beginPath(); g.arc(x - 3, y - 3, 4, 0, TAU); g.fill(); }
  }
  g.fillStyle = '#fff6d0'; g.textAlign = 'center';
  g.font = 'bold 27px "Nunito", Arial, sans-serif'; g.fillText(blase ? 'Goldglibber' : 'Schlangenkönig', 128, 262);
  g.font = 'bold 22px "Nunito", Arial, sans-serif'; g.fillText(blase ? '– die Zugabe! –' : 'heiß wie Lava!', 128, 292);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Plakatwand auf zwei Pfosten. cfg = { pos: [x, y, z] (Fuß), yaw, kind: 'blase' | 'koenig' } */
export function plakat(level, cfg) {
  if (!level.view) return;
  const [x, y, z] = cfg.pos, yaw = cfg.yaw ?? 0;
  const posts = [-1.15, 1.15].map((dx) => { const g = blockG(0.14, 3.3, 0.14, dx, 0, -0.05, 0x5a3a2a); g.rotateY(yaw); g.translate(x, y, z); return g; });
  bake(level, posts);
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.6), new THREE.MeshLambertMaterial({ map: plakatTex(cfg.kind ?? 'blase'), emissive: 0x302040 }));
  pl.position.set(x + Math.sin(yaw) * 0.04, y + 2.0, z + Math.cos(yaw) * 0.04);
  pl.rotation.y = yaw;
  addObject(level, owned(pl));
}

/**
 * Zuckerwatte-Stände (Zier, verschmolzen): Wagen mit rosa Zuckerwatte-Wolke auf einem Stiel und Streifendach.
 * list: [{ pos: [x, y, z], yaw, color: 0xff9ad8 }]; solid: Kollision des Wagens.
 */
export function zuckerwatte(level, list) {
  const P = [], G = [];
  for (const it of list) {
    const [x, y, z] = it.pos, yaw = it.yaw ?? 0, col = it.color ?? 0xff9ad8;
    level.world.add({ type: 'box', min: [x - 0.9, y, z - 0.9], max: [x + 0.9, y + 1.2, z + 0.9], tag: 'zuckerwatte' });
    if (!level.view) continue;
    const parts = [blockG(1.8, 1.1, 1.8, 0, 0, 0, 0xfff2f8), blockG(1.9, 0.12, 1.9, 0, 1.1, 0, 0xff5aa8)];
    for (const s of [-1, 1]) parts.push(blockG(0.1, 1.9, 0.1, s * 0.8, 1.2, 0.8, 0xffc21a), blockG(0.1, 1.9, 0.1, s * 0.8, 1.2, -0.8, 0xffc21a));
    const roof = new THREE.ConeGeometry(1.5, 0.8, 8).toNonIndexed();
    roof.translate(0, 3.5, 0);
    parts.push(colorize(roof, (p, n, o) => mixc(L(0xff5aa8), L(0xfff6ee), Math.floor(((Math.atan2(p.z, p.x) / TAU) + 1) * 8) & 1, o)));
    const puffs = [];
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; puffs.push(sphereG(0.32, Math.cos(a) * 0.3 + 0.5, 1.75 + (i % 2) * 0.12, Math.sin(a) * 0.3, col, { ws: 8, hs: 6 })); }
    puffs.push(sphereG(0.4, 0.5, 1.95, 0, col, { ws: 8, hs: 6 }));
    parts.push(cylG(0.03, 0.03, 0.6, 0.5, 1.2, 0, 0xfff2e0, 5));
    for (const g of [...parts, ...puffs]) { g.rotateY(yaw); g.translate(x, y, z); P.push(g); }
    const glow = sphereG(0.1, 0, 3.95, 0, 0xffe070, { ws: 8, hs: 6 });
    glow.translate(x, y, z); G.push(glow);
  }
  if (!level.view) return;
  bake(level, P);
  bake(level, G, { material: 'glow', castShadow: false });
}

/**
 * Glühender Saum an Lavakanten (Zier, Glüh-Material): schmale, orange leuchtende Streifen entlang der Kanten eines
 * Rechtecks x0..x1 × z0..z1 knapp über der Lava (y). list: [[x0, z0, x1, z1, y]]
 */
export function glutRand(level, list) {
  if (!level.view) return;
  const G = [];
  for (const [x0, z0, x1, z1, y] of list) {
    const w = x1 - x0, d = z1 - z0;
    G.push(blockG(w, 0.08, 0.35, (x0 + x1) / 2, y, z0, 0xff8a2a, { r: 0, seg: 0 }));
    G.push(blockG(w, 0.08, 0.35, (x0 + x1) / 2, y, z1, 0xff8a2a, { r: 0, seg: 0 }));
    G.push(blockG(0.35, 0.08, d, x0, y, (z0 + z1) / 2, 0xff8a2a, { r: 0, seg: 0 }));
    G.push(blockG(0.35, 0.08, d, x1, y, (z0 + z1) / 2, 0xff8a2a, { r: 0, seg: 0 }));
  }
  bake(level, G, { material: 'glow', castShadow: false });
}

/** Funkenregen über einer Stelle (Feuerwerk/Glut), solange near(Figur) gilt. cfg = { x, y, z, near, every: 0.5, r: [4, 12], h: [9, 15] } */
export function funken(level, cfg) {
  let t = 0;
  level.onStep((dt) => {
    const p = level.player;
    if (!level.view || !p || !cfg.near(p)) return;
    t -= dt;
    if (t > 0) return;
    t = cfg.every ?? 0.5;
    const a = level.rnd.real(0, TAU), r = level.rnd.real(...(cfg.r ?? [4, 12])), h = level.rnd.real(...(cfg.h ?? [9, 15]));
    level.effects?.sparks({ x: cfg.x + Math.cos(a) * r, y: cfg.y + h, z: cfg.z + Math.sin(a) * r * 0.5 }, cfg.n ?? 26);
  });
}

export { Rnd, litFn, fill };
