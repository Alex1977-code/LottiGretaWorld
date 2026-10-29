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
import { MovingBox, bakeModel } from '../../blocks/w2kit.js';
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
  const blase = kind !== 'koenig';
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
  if (kind === 'freunde') {
    // der Turm des Barons, oben das Glas mit den gefangenen Freunden (kleine Hasen-Köpfe), Herzen
    g.fillStyle = '#4a2a5e'; g.fillRect(104, 120, 48, 120);
    g.fillStyle = '#7a3a8a'; for (let y = 132; y < 240; y += 22) g.fillRect(104, y, 48, 6);
    g.fillStyle = '#ffd86a'; for (const [x, y] of [[116, 150], [134, 176], [116, 204], [134, 226]]) g.fillRect(x, y, 8, 10);
    g.fillStyle = 'rgba(200,240,255,0.55)'; g.beginPath(); g.ellipse(128, 92, 40, 34, 0, 0, TAU); g.fill();
    g.strokeStyle = '#e8f8ff'; g.lineWidth = 4; g.stroke();
    g.fillStyle = '#ffc21a'; g.fillRect(96, 54, 64, 10);
    const ears = (x, y, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(x - 5, y - 14, 4, 10, 0, 0, TAU); g.ellipse(x + 5, y - 14, 4, 10, 0, 0, TAU); g.arc(x, y, 10, 0, TAU); g.fill(); g.fillStyle = '#111'; g.fillRect(x - 5, y - 2, 3, 3); g.fillRect(x + 3, y - 2, 3, 3); };
    ears(108, 104, '#d8a070'); ears(128, 96, '#f6f0e8'); ears(148, 104, '#9a7a5a');
    g.fillStyle = '#ff5a8a';
    for (const [x, y] of [[50, 90], [204, 80], [190, 130]]) { g.beginPath(); g.arc(x - 6, y, 7, 0, TAU); g.arc(x + 6, y, 7, 0, TAU); g.moveTo(x - 13, y + 2); g.lineTo(x, y + 16); g.lineTo(x + 13, y + 2); g.fill(); }
  } else if (blase) {
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
  const T1 = { blase: 'Goldglibber', koenig: 'Schlangenkönig', freunde: 'Haltet durch,' }, T2 = { blase: '– die Zugabe! –', koenig: 'heiß wie Lava!', freunde: 'liebe Freunde!' };
  g.font = 'bold 27px "Nunito", Arial, sans-serif'; g.fillText(T1[kind] ?? T1.blase, 128, 262);
  g.font = 'bold 22px "Nunito", Arial, sans-serif'; g.fillText(T2[kind] ?? T2.blase, 128, 292);
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

/**
 * Manege wie in 3-B (circusArena aus w3/_helpers_e.js), aber sparsam: das Publikum (zwei Instanz-Gruppen und die Leuchtstäbe,
 * dort immer gezeichnet) wird nur gezeigt, solange die Figur in der Nähe des Zelts ist (near(p) – sonst kostet es auf dem
 * Rummelplatz Zeichenaufrufe und Dreiecke, ohne zu sehen zu sein). cfg wie circusArena, dazu near: (p) => bool.
 */
export function manege(level, circusArena, cfg) {
  const scene = level.view?.three;
  const before = new Set(scene?.children ?? []);
  const st = circusArena(level, cfg);
  if (!scene) return st;
  const crowd = scene.children.filter((o) => !before.has(o) && (o.isInstancedMesh || o.isPoints));
  let shown = true;
  level.view.onFrame(() => {
    const p = level.player;
    const want = !p || cfg.near(p);
    if (want === shown) return;
    shown = want;
    for (const o of crowd) o.visible = want;
  });
  st.crowd = crowd;
  return st;
}

/**
 * Rummel tief unten (Zier ohne Kollision, gebacken): unter der Seilbahn liegt der abendliche Rummelplatz – Buden, Karussells,
 * Laternen mit warmem Licht, Wege. Wer fällt, stürzt trotzdem ab (keine Kollision). o = { y, items: [{ kind: 'bude' | 'karussell'
 * | 'zelt' | 'laterne', pos: [x, z], yaw, color, r }] }
 */
export function rummelUnten(level, o) {
  if (!level.view) return;
  const y = o.y;
  const P = [], G = [];
  for (const it of o.items ?? []) {
    const [x, z] = it.pos, yaw = it.yaw ?? 0;
    if (it.kind === 'bude' || it.kind === 'karussell') {
      const name = it.kind === 'bude' ? 'rummel_bude' : 'karussell';
      bakeModel(level, name, it.kind === 'bude' ? { color: it.color ?? 'rot', seed: it.seed ?? 1 } : {}, x, y, z, yaw, it.scale ?? 1, it.kind === 'karussell' ? { angle: it.angle ?? 0.4 } : {}, { castShadow: false });
    } else if (it.kind === 'zelt') {
      const r = it.r ?? 4, h = it.h ?? 5, n = 12;
      const c = it.color ?? 0xe8423a;
      for (let i = 0; i < n; i++) {
        const g = new THREE.ConeGeometry(r, h * 0.55, n, 1, true, (i / n) * TAU, TAU / n).toNonIndexed();
        g.translate(x, y + h * 0.45 + h * 0.275, z);
        P.push(fill(g, i % 2 ? 0xfff0f6 : c));
      }
      const wall = new THREE.CylinderGeometry(r * 0.94, r * 0.94, h * 0.45, n * 2, 1, true).toNonIndexed();
      wall.translate(x, y + h * 0.225, z);
      P.push(colorize(wall, (p, nn, out) => mixc(L(c), L(0xfff0f6), (Math.floor(((Math.atan2(p.z - z, p.x - x) / TAU) + 1) * n * 2) & 1), out)));
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; G.push(sphereG(0.18, x + Math.cos(a) * r * 0.96, y + h * 0.45, z + Math.sin(a) * r * 0.96, i % 2 ? 0xfff0a0 : 0xff8ac8, { ws: 6, hs: 4 })); }
      G.push(sphereG(0.3, x, y + h + 0.1, z, 0xffd04a, { ws: 8, hs: 6 }));
    } else if (it.kind === 'laterne') {
      P.push(cylG(0.08, 0.1, 3.2, x, y, z, 0x2a1a3a, 6));
      G.push(sphereG(0.32, x, y + 3.35, z, it.color ?? 0xffe0a0, { ws: 8, hs: 6 }));
    }
  }
  // Wege: helle Pflasterbänder
  for (const w of o.paths ?? []) {
    const [x0, z0, x1, z1] = w;
    P.push(blockG(Math.abs(x1 - x0) || 2.4, 0.05, Math.abs(z1 - z0) || 2.4, (x0 + x1) / 2, y, (z0 + z1) / 2, 0x8a7a6a, { r: 0, seg: 0 }));
  }
  bake(level, P, { castShadow: false });
  bake(level, G, { material: 'glow', castShadow: false });
}

/**
 * Bunte Schürze an einer Inselkante (Zier): senkrechte Streifen mit Goldleiste oben und Glühbirnen – macht kahle Felswände zu
 * einer Zirkusbühne. list: [{ x0, x1, z, y (Oberkante), h, face: +1 (Fläche zeigt nach +Z) | −1, colors: [a, b], axis: 'x' | 'z' }]
 */
export function buehnenSchuerze(level, list) {
  if (!level.view) return;
  const P = [], G = [];
  for (const s of list) {
    const h = s.h ?? 3, f = s.face ?? 1, [ca, cb] = s.colors ?? [0xd8205a, 0xfff2e8];
    const len = s.x1 - s.x0, n = Math.max(2, Math.round(len / 0.8));
    const along = s.axis === 'z';
    for (let i = 0; i < n; i++) {
      const u0 = s.x0 + (i / n) * len, w = len / n;
      const g = along
        ? blockG(0.06, h, w, s.z + f * 0.03, s.y - h, u0 + w / 2, i % 2 ? cb : ca, { r: 0, seg: 0 })
        : blockG(w, h, 0.06, u0 + w / 2, s.y - h, s.z + f * 0.03, i % 2 ? cb : ca, { r: 0, seg: 0 });
      P.push(g);
    }
    const top = along ? blockG(0.14, 0.22, len, s.z + f * 0.07, s.y - 0.24, (s.x0 + s.x1) / 2, 0xffc21a, { r: 0.02, seg: 0 }) : blockG(len, 0.22, 0.14, (s.x0 + s.x1) / 2, s.y - 0.24, s.z + f * 0.07, 0xffc21a, { r: 0.02, seg: 0 });
    P.push(top);
    // Zacken unten
    for (let i = 0; i < n; i++) {
      const u = s.x0 + ((i + 0.5) / n) * len;
      const c = new THREE.ConeGeometry(len / n / 2, 0.5, 3).toNonIndexed();
      c.rotateX(Math.PI);
      if (along) { c.rotateY(Math.PI / 2); c.translate(s.z + f * 0.08, s.y - h - 0.2, u); } else c.translate(u, s.y - h - 0.2, s.z + f * 0.08);
      P.push(fill(c, i % 2 ? 0xffc21a : ca));
    }
    for (let i = 0; i <= n; i += 1) {
      const u = s.x0 + (i / n) * len;
      G.push(along ? sphereG(0.09, s.z + f * 0.16, s.y - 0.12, u, i % 2 ? 0xfff0a0 : 0xff8ac8, { ws: 6, hs: 4 }) : sphereG(0.09, u, s.y - 0.12, s.z + f * 0.16, i % 2 ? 0xfff0a0 : 0xff8ac8, { ws: 6, hs: 4 }));
    }
  }
  bake(level, P, { castShadow: false });
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

/**
 * Kletterturm (8-B Stern 1): freistehender Turm aus bunten Rummel-Kisten mit Klettergriffen; alle Seiten sind Kletterwände
 * (climbable – nur mit dem Krallen-Anzug kommt man hinauf), oben eine Plattform mit Goldkante und Wimpel.
 * o = { pos: [x, y, z] (Mitte unten), size: [w, h, d], colors: [Farben der Kisten] }
 */
export function kletterturm(level, o) {
  const [x, y, z] = o.pos, [w, h, d] = o.size ?? [3, 7.5, 3];
  level.world.add({ type: 'box', min: [x - w / 2, y, z - d / 2], max: [x + w / 2, y + h, z + d / 2], climbable: true, tag: 'kletterturm' });
  if (!level.view) return;
  const P = [], G = [];
  const cols = o.colors ?? [0xe8423a, 0xffc83a, 0x3a7ae8, 0x9a5ae8, 0x4ac85a, 0xff8ac8];
  const n = Math.max(2, Math.round(h / 1.25)), sh = h / n;
  for (let i = 0; i < n; i++) {
    const c = cols[i % cols.length];
    P.push(blockG(w, sh - 0.04, d, x, y + i * sh, z, c, { r: 0.06, seg: 1 }));
    // weiße Querstreifen (Kanten der Kisten)
    P.push(blockG(w + 0.04, 0.08, d + 0.04, x, y + i * sh + sh - 0.06, z, 0xfff2e8, { r: 0, seg: 0 }));
  }
  // Klettergriffe (bunte Knubbel) auf allen vier Seiten
  const rnd = new Rnd(o.seed ?? 17);
  const hold = [0xffd04a, 0x5ae0ff, 0xff5a7a, 0x8aff6a, 0xffffff];
  for (let k = 0; k < 4; k++) {
    for (let j = 0; j < Math.round(h * 2.2); j++) {
      const u = rnd.real(-0.42, 0.42), yy = y + 0.5 + rnd.real(0, h - 0.8);
      const px = k === 0 ? x + u * w : k === 1 ? x + w / 2 + 0.04 : k === 2 ? x + u * w : x - w / 2 - 0.04;
      const pz = k === 0 ? z + d / 2 + 0.04 : k === 1 ? z + u * d : k === 2 ? z - d / 2 - 0.04 : z + u * d;
      P.push(sphereG(rnd.real(0.09, 0.15), px, yy, pz, hold[j % hold.length], { ws: 6, hs: 4, sy: 0.7 }));
    }
  }
  // Plattform oben: Goldkante, Stern, Wimpelmast
  P.push(blockG(w + 0.4, 0.22, d + 0.4, x, y + h - 0.02, z, 0x6a2a9a, { r: 0.06, seg: 1, top: 0x8a4ac0 }));
  P.push(ringG(Math.min(w, d) * 0.36, 0.05, x, y + h + 0.22, z, 0xffc21a, 24));
  P.push(cylG(0.06, 0.06, 2.4, x - w / 2 + 0.2, y + h + 0.2, z - d / 2 + 0.2, 0xfff2e0, 6));
  const flag = new THREE.ConeGeometry(0.34, 0.9, 3).toNonIndexed();
  flag.rotateZ(-Math.PI / 2); flag.scale(1, 1, 0.15); flag.translate(x - w / 2 + 0.66, y + h + 2.25, z - d / 2 + 0.2);
  P.push(fill(flag, 0xff5aa8));
  for (let i = 0; i < 4; i++) G.push(sphereG(0.1, x + (i % 2 ? 1 : -1) * (w / 2 + 0.2), y + h + 0.12, z + (i < 2 ? 1 : -1) * (d / 2 + 0.2), 0xfff0a0, { ws: 6, hs: 4 }));
  bake(level, P);
  bake(level, G, { material: 'glow', castShadow: false });
}

/**
 * Schiffschaukel (8-B Stempel): ein Schaukelschiff hängt an zwei Stangen unter einem Gerüst und bleibt waagerecht (trägt die
 * Figur mit, MovingBox). Steht jemand im Schiff, schaukelt es sich in Schwungrichtung auf (grow °/s bis amp); leer schwingt es
 * langsam aus. Am höchsten Punkt abspringen erreicht Höhen, an die man vom Boden nie käme.
 * spec = { id, pos: [x, y, z] (Drehachse), length: 5.2 (Achse → Schiffsboden), dir: [1, 0] (Schwingebene), amp: 70 (°),
 *          grow: 10 (°/s mit Last), decay: 6 (°/s leer), size: [3.4, 0.4, 2.0] (Boden: entlang dir, Dicke, quer), color }
 * Laufzeit: A (Ausschlag °), theta (aktuell, rad), top (Bodenoberkante), riders, info().
 */
export class Schiffschaukel extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'schiffschaukel');
    this.touch = false;
    this.L = spec.length ?? 5.2;
    const d = spec.dir ?? [1, 0], dl = Math.hypot(d[0], d[1]) || 1;
    this.dir = { x: d[0] / dl, z: d[1] / dl };
    this.ampMax = (spec.amp ?? 70) * Math.PI / 180;
    this.grow = (spec.grow ?? 10) * Math.PI / 180;
    this.decay = (spec.decay ?? 6) * Math.PI / 180;
    this.omega = Math.sqrt(9.81 / this.L) * 0.92;
    this.A = 0; this.phi = 0; this.theta = 0;
    const [len, th, wid] = spec.size ?? [3.4, 0.4, 2.0];
    this.size = { len, th, wid };
    const alongX = Math.abs(this.dir.x) > Math.abs(this.dir.z);
    this.box = { x: alongX ? len : wid, z: alongX ? wid : len };
    const q = this.place();
    this.mb = new MovingBox(level, q.x, q.y - th, q.z, this.box.x, th, this.box.z, { tag: 'schiffschaukel', camIgnore: true });
    this.mb.shape.owner = this;
    // Bordwände an den Enden (entlang dir): halten die Figur im Schiff
    this.walls = [-1, 1].map((s) => new MovingBox(level, q.x + this.dir.x * s * (len / 2 - 0.1), q.y, q.z + this.dir.z * s * (len / 2 - 0.1), alongX ? 0.2 : wid, 0.55, alongX ? wid : 0.2, { tag: 'schiffschaukel:bord', camIgnore: true, noWallSlide: true }));
    this.top = q.y;
    this.riders = 0; this.maxA = 0;
    if (level.view) this.buildView();
  }

  place() {
    const p = this.pos, th = this.theta, L = this.L;
    return { x: p.x + this.dir.x * Math.sin(th) * L, y: p.y - Math.cos(th) * L, z: p.z + this.dir.z * Math.sin(th) * L };
  }

  buildView() {
    const p = this.pos, Ln = this.L, { len, wid } = this.size;
    const yaw = Math.atan2(-this.dir.z, this.dir.x);   // lokales +X = dir
    // Gerüst (statisch): zwei A-Böcke quer zur Schwingebene, Querbalken (Achse)
    const P = [];
    const leg = (ax, az, bx, bz, by) => {
      const a = new THREE.Vector3(ax, p.y - Ln - 1.3, az), b = new THREE.Vector3(bx, by, bz);
      const dd = b.clone().sub(a), l = dd.length();
      const g = new THREE.CylinderGeometry(0.12, 0.16, l, 6).toNonIndexed();
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dd.normalize()));
      g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
      return colorize(g, litFn(0xffc21a));
    };
    const nx = -this.dir.z, nz = this.dir.x;   // quer zur Schwingebene
    for (const s of [-1, 1]) {
      const cx = p.x + nx * s * (wid / 2 + 0.5), cz = p.z + nz * s * (wid / 2 + 0.5);
      for (const t of [-1, 1]) P.push(leg(cx + this.dir.x * t * 2.6, cz + this.dir.z * t * 2.6, cx, cz, p.y + 0.2));
    }
    const axle = new THREE.CylinderGeometry(0.14, 0.14, wid + 1.4, 8).toNonIndexed();
    axle.rotateX(Math.PI / 2); axle.rotateY(yaw); axle.translate(p.x, p.y, p.z);
    P.push(colorize(axle, litFn(0xe8283a)));
    bake(this.level, P);
    // Schiff: Rumpf (gestreift), Bordwände, Stangen zur Achse – bewegt
    const root = new THREE.Group();
    root.position.set(p.x, p.y, p.z);
    root.rotation.y = yaw;
    const swing = new THREE.Group();
    root.add(swing);
    const rods = [];
    for (const s of [-1, 1]) rods.push(cylG(0.07, 0.07, Ln - 0.2, 0, -Ln + 0.1, s * (wid / 2 + 0.1), 0xfff2e0, 6));
    const rm = new THREE.Mesh(merge(rods), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }));
    swing.add(rm);
    const boat = new THREE.Group();
    boat.position.set(0, -Ln, 0);
    swing.add(boat);
    const hull = [];
    const c1 = this.spec.color ?? 0x7a2ad8, c2 = 0xffc21a;
    // Rumpf: halber Zylinder (Kiel unten), gestreift
    const hg = new THREE.CylinderGeometry(wid / 2 + 0.05, wid / 2 + 0.05, len, 18, 1, false, Math.PI / 2, Math.PI).toNonIndexed();
    hg.rotateZ(Math.PI / 2); hg.scale(1, 0.75, 1); hg.translate(0, -this.size.th, 0);
    hull.push(colorize(hg, (pp, n, o) => mixc(L(c1), L(0xfff2e8), (Math.floor((pp.x + 10) * 1.4) & 1) * 0.85, o)));
    hull.push(blockG(len, this.size.th, wid, 0, -this.size.th, 0, 0xb8864a, { r: 0.04, seg: 1, top: 0xd8a868 }));
    for (const s of [-1, 1]) {
      hull.push(blockG(0.2, 0.55, wid, s * (len / 2 - 0.1), 0, 0, c1));
      const bow = coneG(0.3, 0.5, s * (len / 2 + 0.05), 0.55, 0, c2, 8);
      hull.push(bow);
      hull.push(blockG(len, 0.12, 0.14, 0, 0.42, s * (wid / 2 - 0.02), c2, { r: 0.03, seg: 0 }));
    }
    const bm = new THREE.Mesh(merge(hull), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }));
    bm.castShadow = true;
    boat.add(bm);
    // Lichterkante am Bug (leuchtend)
    const bulbs = [];
    for (let i = 0; i < 9; i++) bulbs.push(sphereG(0.07, -len / 2 + 0.2 + i * (len - 0.4) / 8, 0.56, (i % 2 ? 1 : -1) * (wid / 2 - 0.02), [0xfff0a0, 0xff8ac8, 0x9af0ff][i % 3], { ws: 6, hs: 4 }));
    boat.add(new THREE.Mesh(merge(bulbs), new THREE.MeshBasicMaterial({ vertexColors: true })));
    root.traverse((m) => { if (m.isMesh) m.userData.owned = true; });
    this.view = { swing, boat };
    addObject(this.level, root, () => {
      swing.rotation.z = this.theta;
      boat.rotation.z = -this.theta;
    });
  }

  update(dt) {
    this.riders = this.mb.carried(this.level);
    if (this.riders > 0) this.A = Math.min(this.ampMax, this.A + this.grow * dt);
    else this.A = Math.max(0, this.A - this.decay * dt);
    this.maxA = Math.max(this.maxA, this.A);
    this.phi += this.omega * dt;
    if (this.A <= 1e-4) this.phi = 0;
    this.theta = this.A * Math.sin(this.phi);
    const q = this.place(), th = this.size.th;
    this.mb.moveTo(q.x, q.y - th, q.z, dt);
    this.walls.forEach((w, i) => { const s = i ? 1 : -1; w.moveTo(q.x + this.dir.x * s * (this.size.len / 2 - 0.1), q.y, q.z + this.dir.z * s * (this.size.len / 2 - 0.1), dt); });
    this.top = q.y;
  }

  info() { return { A: +(this.A * 180 / Math.PI).toFixed(1), theta: +(this.theta * 180 / Math.PI).toFixed(1), top: +this.top.toFixed(2), riders: this.riders, maxA: +(this.maxA * 180 / Math.PI).toFixed(1) }; }
}

/** Schiffschaukel als lokale Entität anlegen. */
export function schiffschaukel(level, spec) { return spawnLocal(level, new Schiffschaukel(level, spec)); }

export { Rnd, litFn, fill };
