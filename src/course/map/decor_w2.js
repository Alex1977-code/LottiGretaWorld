// Kulissen der Welt-2-Eingänge (Kurs-Karte „Wüste mit Sandblöcken“), aufgerufen aus EntranceView.decorate():
//   canyon     2-1  Schluchttor: Holzrahmen vor der Schlucht, Schild mit Hackvogel, Wimpel, Fässer
//   space      2-2  schwebende Sternenplattform: dunkle Scheibe mit Sternen, leuchtender Rand, Sterntritte,
//                   darüber ein Ringplanet und funkelnde Sterne
//   glowcave   2-3  Höhleneingang mit warmem Lichtschein, Fackeln, Schattenspiel-Tafel (Stern- und Hasen-Schatten)
//   mystery    2-Haus  geheimnisvolles Haus: violett, schiefer Schornstein, leuchtende Rundfenster, großes Fragezeichen
//   hills      2-4  rollende Hügelwalze (dreht sich), bunte Blöcke, Fähnchen
//   lavaarena  2-A  Felsspitzen und Feuerschalen am Rand der Lava-Felsinsel
//   pinkgrass  2-5  Doppelkirschen-Statue (Spiegelfrucht)
//   tankdepot  2-Panzer  großer Panzer, Baron-Brummbär-Flagge am Mast, Sandsäcke, Kisten
// Große, unbewegte Teile gehen in die verschmolzene statische Geometrie, bewegte sind eigene Objekte (ev.updaters).
// Lage: decor = [x, y, z] (Fuß der Kulisse), Podest = def.pos.

import * as THREE from 'three';
import { mix, TAU, cached, vcol, std, basic, glowTexture, sparkleTexture, canvasTexture, starShape } from '../models/lib/kit.js';
import { caveMouthGeo, baronFlagTexture } from './props.js';
import { LowBuild as Build, place, bigTankGeo, sandbagsGeo, cratesGeo, cherryStatueGeo, torchStandGeo, desertRockGeo } from './desert.js';

/** Kulisse für eine Welt-2-Art bauen; false = unbekannte Art. */
export function decorateW2(ev, kind, x, y, z) {
  switch (kind) {
    case 'canyon': canyonGate(ev, x, y, z); return true;
    case 'space': spacePlatform(ev, x, y, z); return true;
    case 'glowcave': glowCave(ev, x, y, z); return true;
    case 'mystery': mysteryHouse(ev, x, y, z); return true;
    case 'hills': rollingHills(ev, x, y, z); return true;
    case 'lavaarena': lavaArena(ev, x, y, z); return true;
    case 'pinkgrass': pinkGrass(ev, x, y, z); return true;
    case 'tankdepot': tankDepot(ev, x, y, z); return true;
    default: return false;
  }
}

/** Leuchtende Flamme (additiv, flackert) als eigenes Objekt. */
export function flame(ev, x, y, z, size = 1) {
  const mat = new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffa040, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });
  ev.own.push(mat);
  const s = new THREE.Sprite(mat);
  s.position.set(x, y, z);
  s.scale.setScalar(1.1 * size);
  const core = new THREE.Mesh(cached('w2:flame', () => {
    const b = new Build();
    b.cone(0.17, 0.5, 0xffd23a, { p: [0, 0.25, 0] }, 7);
    b.cone(0.1, 0.32, 0xfff4b0, { p: [0, 0.2, 0.02] }, 6);
    return b.geometry();
  }), basic('w2:flamecore', { vertexColors: true }));
  core.position.set(x, y - 0.25 * size, z);
  core.scale.setScalar(size);
  ev.view.add(s); ev.view.add(core);
  const ph = x * 1.7 + z;
  ev.updaters.push((dt, t) => {
    const k = 1 + Math.sin(t * 13 + ph) * 0.08 + Math.sin(t * 7.3 + ph) * 0.06;
    s.scale.setScalar(1.1 * size * k);
    core.scale.set(size * (2 - k), size * k * 1.05, size * (2 - k));
  });
}

// ------------------------------------------------------------------ 2-1 Schluchttor

function canyonGate(ev, x, y, z) {
  const W = ev.level.world;
  const g = cached('w2:canyongate', () => {
    const b = new Build();
    const wood = { v: (px, py) => mix(0x7a5230, 0xa8784a, (py + 2.2) / 4.4) };
    for (const s of [-1, 1]) {
      b.box(0.5, 4.4, 0.5, wood, { p: [s * 2.55, 2.2, 0] }, 0.08);
      b.box(0.62, 0.5, 0.62, 0x6a4424, { p: [s * 2.55, 0.25, 0] }, 0.06);
      b.cone(0.38, 0.5, 0x6a4424, { p: [s * 2.55, 4.65, 0], r: [0, Math.PI / 4, 0] }, 4);
    }
    b.box(6.0, 0.42, 0.46, wood, { p: [0, 3.95, 0] }, 0.08);
    b.box(5.4, 0.22, 0.3, 0x8a5a34, { p: [0, 3.45, 0.06], r: [0, 0, 0.03] }, 0.04);
    // Schild mit Hackvogel (hängt an zwei Seilen unter dem Balken)
    for (const s of [-1, 1]) b.cyl(0.025, 0.025, 0.5, 0xd8b878, { p: [s * 0.8, 3.45, 0.12] }, 4);
    b.box(2.2, 0.95, 0.12, 0xe8c08a, { p: [0, 2.75, 0.14] }, 0.05);
    b.box(2.36, 1.1, 0.08, 0x8a5a34, { p: [0, 2.75, 0.08] }, 0.04);
    // Vogel: Körper, Kopf, Schnabel, Flügel
    b.sphere(0.24, 0x5a3a7a, { p: [-0.1, 2.72, 0.24], s: [1.3, 0.9, 0.3] }, 10, 6);
    b.sphere(0.14, 0x5a3a7a, { p: [0.3, 2.9, 0.24], s: [1, 1, 0.3] }, 8, 5);
    b.cone(0.07, 0.3, 0xffb43a, { p: [0.5, 2.86, 0.25], r: [0, 0, -Math.PI / 2] }, 5);
    b.sphere(0.035, 0xffffff, { p: [0.34, 2.94, 0.3] }, 5, 3);
    b.sphere(0.22, 0x7a5aa8, { p: [-0.32, 2.86, 0.25], r: [0, 0, 0.6], s: [1.2, 0.35, 0.25] }, 8, 4);
    // Wimpelkette
    const cols = [0xff5a4a, 0xffd23a, 0x3a9cff, 0x4fc24a, 0xff8ccc];
    for (let i = 0; i < 9; i++) {
      const px = -2.2 + i * 0.55, py = 4.33 - Math.sin((i / 8) * Math.PI) * 0.35;
      b.cone(0.16, 0.34, cols[i % cols.length], { p: [px, py - 0.18, 0.26], r: [Math.PI, 0, 0] }, 3);
    }
    // Fässer und ein Kugelkaktus am Fuß
    b.cyl(0.38, 0.38, 0.9, (px, py) => (Math.abs(py) > 0.3 ? 0x5a5a62 : 0xb07a44), { p: [-3.4, 0.45, 0.8] }, 12);
    b.cyl(0.34, 0.34, 0.8, (px, py) => (Math.abs(py) > 0.26 ? 0x5a5a62 : 0xb07a44), { p: [-3.0, 0.4, 1.6] }, 12);
    return b.geometry();
  });
  ev.addStatic(place(g.clone(), x, y, z));
  for (const s of [-1, 1]) W.add({ type: 'box', min: [x + s * 2.55 - 0.3, y, z - 0.3], max: [x + s * 2.55 + 0.3, y + 4.6, z + 0.3], tag: 'deko' });
}

// ------------------------------------------------------------------ 2-2 schwebende Sternenplattform

function spacePlatform(ev, x, y, z) {
  const W = ev.level.world;
  const top = ev.def.pos[1];
  const R = ev.def.radius ?? 3.6;
  const disc = cached(`w2:starplat:${R}`, () => {
    const b = new Build();
    b.cyl(R, R * 0.9, 0.5, { v: (px, py) => mix(0x1a1450, 0x2c2a7a, py + 0.5) }, { p: [0, -0.25, 0] }, 32);
    b.cone(R * 0.86, 1.5, { v: (px, py) => mix(0x2c2a7a, 0x12103a, (0.75 - py) / 1.5) }, { p: [0, -1.25, 0], r: [Math.PI, 0, 0] }, 24);
    // kleine Sterne auf der Deckfläche
    for (let i = 0; i < 16; i++) {
      const a = i * 2.39996, d = Math.sqrt((i + 0.5) / 16) * (R - 0.45);
      const s = i % 3 === 0 ? 0.22 : 0.13;
      b.extrude(starShape(s, s * 0.45), 0.03, i % 4 === 0 ? 0xffe14a : 0xfff6c8, { p: [Math.cos(a) * d, 0.016, Math.sin(a) * d], r: [-Math.PI / 2, 0, a] }, 0, 1);
    }
    return b.geometry();
  });
  ev.addStatic(place(disc.clone(), x, top, z), { castShadow: true });
  W.add({ type: 'cyl', x, z, r: R, y0: top - 0.5, y1: top, tag: 'sternplattform' });
  // leuchtender Rand (eigenes Objekt, pulsiert)
  const rimMat = new THREE.MeshBasicMaterial({ color: 0x6af0ff, transparent: true, opacity: 0.85, fog: true });
  ev.own.push(rimMat);
  const rim = new THREE.Mesh(cached(`w2:starrim:${R}`, () => new THREE.TorusGeometry(R + 0.02, 0.09, 6, 48).rotateX(Math.PI / 2)), rimMat);
  rim.position.set(x, top - 0.04, z);
  ev.view.add(rim);
  // Sterntritte (schweben, wippen leicht)
  const steps = ev.def.steps ?? [];
  const stepGeo = cached('w2:starstep', () => {
    const b = new Build();
    b.extrude(starShape(1.0, 0.55), 0.36, { v: (px, py, pz, nx, ny, nz) => (Math.abs(nz) > 0.5 ? 0xffd84a : 0xe8a820) }, { r: [-Math.PI / 2, 0, Math.PI / 2], p: [0, -0.18, 0] }, 0.06, 1);
    return b.geometry();
  });
  for (const [sx, sy, sz] of steps) {
    const m = new THREE.Mesh(stepGeo, vcol(0.4));
    m.castShadow = true;
    m.position.set(sx, sy, sz);
    ev.view.add(m);
    W.add({ type: 'cyl', x: sx, z: sz, r: 0.8, y0: sy - 0.36, y1: sy, tag: 'sterntritt' });
    const ph = sx + sz;
    ev.updaters.push((dt, t) => { m.rotation.y = Math.sin(t * 0.8 + ph) * 0.25; });
  }
  // Ringplanet über der Plattform
  const planet = new THREE.Group();
  const ball = new THREE.Mesh(cached('w2:planet', () => {
    const b = new Build();
    b.sphere(1.0, { v: (px, py) => (Math.abs(Math.sin(py * 7)) > 0.7 ? 0xffb86a : mix(0xff7ab0, 0xffd28a, (py + 1) / 2)) }, null, 20, 14);
    b.torus(1.65, 0.12, 0xfff0a8, { r: [Math.PI / 2 - 0.35, 0, 0.2] }, 4, 40);
    return b.geometry();
  }), vcol(0.5));
  ball.castShadow = true;
  planet.add(ball);
  planet.position.set(x - R * 0.55, top + 5.2, z - R * 0.7);
  ev.view.add(planet);
  // Funkelsterne
  const spMat = new THREE.SpriteMaterial({ map: sparkleTexture(), color: 0xfff6b0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  ev.own.push(spMat);
  const sparks = [];
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Sprite(spMat);
    const a = (i / 7) * TAU;
    s.position.set(x + Math.cos(a) * (R + 0.8), top + 1.5 + (i % 3) * 1.4, z + Math.sin(a) * (R + 0.8));
    ev.view.add(s);
    sparks.push(s);
  }
  ev.updaters.push((dt, t) => {
    rimMat.opacity = 0.55 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2.4));
    planet.position.y = top + 5.2 + Math.sin(t * 0.9) * 0.25;
    ball.rotation.y = t * 0.3;
    sparks.forEach((s, i) => s.scale.setScalar(0.25 + 0.5 * Math.max(0, Math.sin(t * 2.2 + i * 1.9))));
  });
}

// ------------------------------------------------------------------ 2-3 Höhleneingang mit Lichtschein

function glowCave(ev, x, y, z) {
  const W = ev.level.world;
  const cave = caveMouthGeo().clone();
  cave.scale(1.35, 1.35, 1.35);
  ev.addStatic(place(cave, x, y, z + 0.05));
  // Schein aus der Höhle (warmes Licht innen, additive Fläche) und Lichtkegel nach vorn
  const glowMat = new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0xffb04a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });
  ev.own.push(glowMat);
  const glow = new THREE.Mesh(cached('w2:caveglow', () => new THREE.PlaneGeometry(5.2, 5.2)), glowMat);
  glow.position.set(x, y + 1.9, z + 0.42);
  glow.renderOrder = 4;
  ev.view.add(glow);
  const beamTex = canvasTexture('w2:beam', 64, 128, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,220,140,0.75)'); g.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
  const beamMat = new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true });
  ev.own.push(beamMat);
  const beam = new THREE.Mesh(cached('w2:beamgeo', () => {
    const g = new THREE.PlaneGeometry(4.2, 5.5);
    g.rotateX(-Math.PI / 2);
    // vorn breiter (Trapez)
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getZ(i) > 0) p.setX(i, p.getX(i) * 1.6);
    g.translate(0, 0.03, 2.75);
    return g;
  }), beamMat);
  beam.position.set(x, y, z + 0.3);
  beam.renderOrder = 4;
  ev.view.add(beam);
  ev.updaters.push((dt, t) => {
    const k = 0.8 + 0.12 * Math.sin(t * 3.1) + 0.08 * Math.sin(t * 7.7);
    glowMat.opacity = k; beamMat.opacity = k * 0.8;
  });
  // Fackeln links und rechts
  for (const s of [-1, 1]) {
    ev.addStatic(place(torchStandGeo(), x + s * 3.4, y, z + 1.0));
    W.add({ type: 'cyl', x: x + s * 3.4, z: z + 1.0, r: 0.25, y0: y, y1: y + 1.8, tag: 'fackel' });
    flame(ev, x + s * 3.4, y + 2.05, z + 1.0, 0.9);
  }
  // Schattenspiel-Tafel: beleuchtete Steinplatte mit Stern- und Hasen-Schatten
  const tab = cached('w2:shadowtab', () => {
    const b = new Build();
    b.box(2.4, 1.7, 0.3, 0xc8a070, { p: [0, 1.25, 0] }, 0.08);
    b.box(2.0, 1.3, 0.04, 0xfff0c0, { p: [0, 1.25, 0.16] }, 0);
    b.extrude(starShape(0.3, 0.13), 0.02, 0x3a2a3a, { p: [-0.5, 1.45, 0.19] }, 0, 1);
    // Hase: Körper, Kopf, Ohren
    b.sphere(0.24, 0x3a2a3a, { p: [0.45, 0.98, 0.18], s: [1.3, 0.9, 0.1] }, 10, 4);
    b.sphere(0.15, 0x3a2a3a, { p: [0.72, 1.18, 0.18], s: [1, 1, 0.1] }, 8, 4);
    b.sphere(0.06, 0x3a2a3a, { p: [0.68, 1.46, 0.18], s: [0.8, 3, 0.2] }, 6, 4);
    b.sphere(0.06, 0x3a2a3a, { p: [0.8, 1.44, 0.18], s: [0.8, 3, 0.2], r: [0, 0, -0.3] }, 6, 4);
    b.box(0.3, 0.4, 0.3, 0x9a7a5a, { p: [-0.9, 0.2, 0] }, 0.05);
    b.box(0.3, 0.4, 0.3, 0x9a7a5a, { p: [0.9, 0.2, 0] }, 0.05);
    return b.geometry();
  });
  ev.addStatic(place(tab.clone(), x - 6.2, y, z + 2.2, 0.35));
  W.add({ type: 'box', min: [x - 7.5, y, z + 1.6], max: [x - 4.9, y + 2.1, z + 2.8], tag: 'deko' });
}

// ------------------------------------------------------------------ 2-Haus geheimnisvolles Haus

function mysteryHouse(ev, x, y, z) {
  const W = ev.level.world;
  const g = cached('w2:mysteryhouse', () => {
    const b = new Build();
    const wall = { v: (px, py, pz, nx) => mix(0x6a4a9a, 0x8a6ac0, (py + 1.9) / 3.8 * 0.6 + Math.abs(nx) * -0.1 + 0.3) };
    b.box(5.2, 3.8, 4.2, wall, { p: [0, 1.9, 0] }, 0.12);
    // Holzbalken
    for (const sx of [-2.5, 2.5]) b.box(0.24, 3.9, 0.24, 0x4a2e1e, { p: [sx, 1.95, 2.05] }, 0.03);
    b.box(5.4, 0.22, 0.26, 0x4a2e1e, { p: [0, 3.82, 2.06] }, 0.03);
    // Dach (schief) und Schornstein
    const roof = new THREE.Shape();
    roof.moveTo(-3.1, 0); roof.lineTo(-0.2, 2.7); roof.lineTo(3.1, 0); roof.lineTo(-3.1, 0);
    b.extrude(roof, 4.8, { v: (px, py) => mix(0x2a1a4a, 0x4a2e7a, py / 2.7) }, { p: [0, 3.78, 0], r: [0, 0, 0.04] }, 0.08, 1);
    b.box(0.7, 1.6, 0.7, 0x5a4a5a, { p: [1.6, 5.3, -0.8], r: [0, 0, -0.12] }, 0.06);
    b.box(0.86, 0.2, 0.86, 0x3a2a3a, { p: [1.7, 6.1, -0.8], r: [0, 0, -0.12] }, 0.04);
    // Tür (Bogen) mit Fragezeichen-Türklopfer
    const door = new THREE.Shape();
    door.moveTo(-0.65, 0); door.lineTo(-0.65, 1.5); door.absarc(0, 1.5, 0.65, Math.PI, 0, true); door.lineTo(0.65, 0); door.lineTo(-0.65, 0);
    b.extrude(door, 0.12, 0x2a1630, { p: [0, 0, 2.12] }, 0.03, 10);
    b.torus(0.12, 0.03, 0xffc21a, { p: [0.3, 1.0, 2.22] }, 5, 12);
    // Stufen
    b.box(2.0, 0.2, 0.7, 0x8a7a8a, { p: [0, 0.1, 2.5] }, 0.04);
    // Fensterrahmen
    for (const sx of [-1.6, 1.6]) b.torus(0.42, 0.07, 0x4a2e1e, { p: [sx, 2.3, 2.12] }, 6, 18);
    return b.geometry();
  });
  ev.addStatic(place(g.clone(), x, y, z));
  W.add({ type: 'box', min: [x - 2.7, y, z - 2.2], max: [x + 2.7, y + 4.4, z + 2.2], tag: 'deko' });
  // leuchtende Rundfenster (flackern sacht) und großes Fragezeichen auf dem Dach
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffe07a, fog: true });
  ev.own.push(winMat);
  const winGeo = cached('w2:mwin', () => new THREE.CircleGeometry(0.36, 18));
  for (const sx of [-1.6, 1.6]) {
    const w = new THREE.Mesh(winGeo, winMat);
    w.position.set(x + sx, y + 2.3, z + 2.13);
    ev.view.add(w);
  }
  const q = new THREE.Mesh(cached('w2:qmark', () => {
    const b = new Build();
    b.torus(0.42, 0.15, 0xffd23a, { p: [0, 0.75, 0], r: [0, 0, -0.5] }, 8, 20, Math.PI * 1.4);
    b.cyl(0.15, 0.15, 0.42, 0xffd23a, { p: [0.02, 0.28, 0] }, 10);
    b.sphere(0.17, 0xffd23a, { p: [0.02, -0.2, 0] }, 10, 8);
    return b.geometry();
  }), vcol(0.35, { emissive: 0x6a4a00 }, 'qmark'));
  q.position.set(x - 0.2, y + 7.2, z + 0.3);
  q.castShadow = true;
  ev.view.add(q);
  ev.updaters.push((dt, t) => {
    winMat.color.setHex(Math.sin(t * 5.3) + Math.sin(t * 2.1) > 1.4 ? 0xfff2b0 : 0xffd060);
    q.rotation.y = Math.sin(t * 1.4) * 0.5;
    q.position.y = y + 7.2 + Math.sin(t * 2.2) * 0.15;
  });
}

// ------------------------------------------------------------------ 2-4 rollende Hügel

function rollingHills(ev, x, y, z) {
  const W = ev.level.world;
  // Gestell (statisch)
  const frame = cached('w2:rollerframe', () => {
    const b = new Build();
    for (const s of [-1, 1]) {
      b.box(0.5, 2.4, 0.5, 0xf6f4ef, { p: [s * 4.1, 1.2, 0] }, 0.08);
      b.sphere(0.32, 0xff5a4a, { p: [s * 4.1, 2.5, 0] }, 10, 8);
    }
    b.box(1.0, 1.0, 1.0, 0xffd23a, { p: [-5.6, 0.5, 1.2] }, 0.12);
    b.box(1.0, 1.0, 1.0, 0x3a9cff, { p: [-5.6, 1.5, 1.2] }, 0.12);
    b.box(1.0, 1.0, 1.0, 0xff5a4a, { p: [5.4, 0.5, 1.6] }, 0.12);
    b.box(1.0, 1.0, 1.0, 0x4fc24a, { p: [6.3, 0.5, 0.7] }, 0.12);
    return b.geometry();
  });
  ev.addStatic(place(frame.clone(), x, y, z));
  for (const s of [-1, 1]) W.add({ type: 'box', min: [x + s * 4.1 - 0.3, y, z - 0.3], max: [x + s * 4.1 + 0.3, y + 2.6, z + 0.3], tag: 'deko' });
  W.add({ type: 'box', min: [x - 3.8, y, z - 2], max: [x + 3.8, y + 3.8, z + 2], tag: 'deko' });
  W.add({ type: 'box', min: [x - 6.1, y, z + 0.7], max: [x - 5.1, y + 2, z + 1.7], tag: 'deko' });
  // Walze: gestreifter Grashügel, dreht sich langsam um die X-Achse
  const roller = new THREE.Mesh(cached('w2:roller', () => {
    const b = new Build();
    b.cyl(1.9, 1.9, 7.2, (px, py, pz) => (Math.floor(((Math.atan2(pz, px) / TAU) + 1) * 12) % 2 ? 0x5fd04a : 0x7ee052), { r: [0, 0, Math.PI / 2] }, 24);
    for (const s of [-1, 1]) b.cyl(1.95, 1.95, 0.18, 0xd59253, { p: [s * 3.6, 0, 0], r: [0, 0, Math.PI / 2] }, 24);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      b.sphere(0.16, i % 2 ? 0xffffff : 0xffd23a, { p: [-2.4 + i * 0.95, Math.cos(a) * 1.92, Math.sin(a) * 1.92] }, 6, 4);
    }
    return b.geometry();
  }), vcol(0.6));
  roller.castShadow = true;
  roller.position.set(x, y + 1.95, z);
  ev.view.add(roller);
  ev.updaters.push((dt, t) => { roller.rotation.x = -t * 0.7; });
}

// ------------------------------------------------------------------ 2-A Lava-Felsinsel

function lavaArena(ev, x, y, z) {
  const W = ev.level.world;
  const spikes = ev.def.spikes ?? [];
  const b = new Build();
  spikes.forEach(([sx, sz, h], i) => {
    b.add(new THREE.ConeGeometry(0.7, h, 5), { v: (px, py) => mix(0x2a2026, 0x5a4650, (py + h / 2) / h) }, { p: [sx - x, h / 2, sz - z], r: [0.08 * (i % 3 - 1), i, 0.06 * (i % 2 ? 1 : -1)] });
  });
  if (spikes.length) {
    ev.addStatic(place(b.geometry(), x, y, z));
    for (const [sx, sz, h] of spikes) W.add({ type: 'cyl', x: sx, z: sz, r: 0.55, y0: y, y1: y + h, tag: 'felsspitze' });
  }
  for (const [bx, bz] of ev.def.braziers ?? []) {
    ev.addStatic(place(cached('w2:brazier', () => {
      const g = new Build();
      g.cyl(0.18, 0.26, 1.1, 0x3a3036, { p: [0, 0.55, 0] }, 8);
      g.cyl(0.5, 0.3, 0.36, 0x5a4a50, { p: [0, 1.25, 0] }, 12);
      g.torus(0.5, 0.06, 0xff7a2a, { p: [0, 1.43, 0], r: [Math.PI / 2, 0, 0] }, 4, 16);
      return g.geometry();
    }).clone(), bx, y, bz));
    W.add({ type: 'cyl', x: bx, z: bz, r: 0.5, y0: y, y1: y + 1.5, tag: 'feuerschale' });
    flame(ev, bx, y + 1.75, bz, 1.0);
  }
  // Felsbrocken am Rand
  ev.addStatic(place(desertRockGeo(0.9, 31), x - 6.2, y, z + 6.6));
}

// ------------------------------------------------------------------ 2-5 rosa Grasland

function pinkGrass(ev, x, y, z) {
  ev.addStatic(place(cherryStatueGeo(), x, y, z));
  ev.level.world.add({ type: 'cyl', x, z, r: 1.15, y0: y, y1: y + 3.3, tag: 'deko' });
}

// ------------------------------------------------------------------ 2-Panzer Depot

function tankDepot(ev, x, y, z) {
  const W = ev.level.world;
  ev.addStatic(place(bigTankGeo(), x, y, z, -Math.PI / 2 + 0.25));
  W.add({ type: 'box', min: [x - 2.2, y, z - 3.2], max: [x + 2.2, y + 3.4, z + 3.2], tag: 'panzer' });
  ev.addStatic(place(sandbagsGeo(3.6), x - 4.4, y, z + 2.6, 0.4));
  ev.addStatic(place(sandbagsGeo(3.6), x + 4.4, y, z + 2.6, -0.4));
  ev.addStatic(place(cratesGeo(5), x + 5.4, y, z - 1.6, 0.3));
  W.add({ type: 'box', min: [x + 4.6, y, z - 2.3], max: [x + 6.8, y + 2, z - 0.9], tag: 'kisten' });
  // Fahnenmast mit Baron-Brummbär-Flagge (weht)
  const fx = x - 4.8, fz = z - 1.4;
  ev.addStatic(place(cached('w2:flagpole', () => {
    const b = new Build();
    b.cyl(0.4, 0.5, 0.4, 0x5a5a62, { p: [0, 0.2, 0] }, 10);
    b.cyl(0.07, 0.09, 7.2, 0xd9dce6, { p: [0, 3.8, 0] }, 8);
    b.sphere(0.16, 0xffc21a, { p: [0, 7.5, 0] }, 10, 8);
    return b.geometry();
  }).clone(), fx, y, fz));
  W.add({ type: 'cyl', x: fx, z: fz, r: 0.45, y0: y, y1: y + 7.4, tag: 'fahnenmast' });
  wavingFlag(ev, fx + 0.06, y + 6.85, fz, 2.0, 1.25, baronFlagTexture());
}

/** Wehende Fahne (Stoff an einem Mast, Vorderseite +Z). */
export function wavingFlag(ev, x, y, z, fw, fh, tex) {
  const g = new THREE.PlaneGeometry(fw, fh, 10, 5);
  g.translate(fw / 2, 0, 0);
  const base = Float32Array.from(g.attributes.position.array);
  ev.own.push(g);
  const mat = new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.7 });
  ev.own.push(mat);
  const flag = new THREE.Mesh(g, mat);
  flag.castShadow = true;
  flag.position.set(x, y, z);
  ev.view.add(flag);
  ev.updaters.push((dt, t) => {
    const pos = g.attributes.position, a = pos.array;
    for (let i = 0; i < pos.count; i++) {
      const px = base[i * 3], f = px / fw;
      a[i * 3 + 2] = Math.sin(f * 5 - t * 5) * 0.14 * f;
      a[i * 3 + 1] = base[i * 3 + 1] - Math.sin(f * 4 - t * 4) * 0.03 * f;
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
  });
  return flag;
}
