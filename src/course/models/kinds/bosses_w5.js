// Endgegner Welt 5 (Kurs-Modus): Kippquader-König (5-Burg), dazu der kleine Kippquader (Baustein `kippquader`) und die
// rote Landefläche. Eigene Gestaltung. Maßstab Meter; state darf ein String sein ('walk' ≙ { anim: 'walk' }).
//
// kippquader_koenig  ≈4,6 m (mit Krone)  Steinquader-König: aufrechte, rund geschliffene Sandsteinplatte (3,4 m breit,
//   3,6 m hoch, 1,5 m tief) mit Gesicht vorn (+X): große Bernsteinaugen unter wuchtigen Steinbrauen, Knollennase,
//   grimmiger Mund mit Blockzähnen; goldene Zackenkrone mit Edelsteinen, lila Saumband mit Goldkanten, goldene Eckkappen.
//   Auf dem Rücken (−X) ein leuchtend blaues Schwachpunkt-Feld mit weißem Stern – nur ein Sprung/Stampfer darauf trifft.
//   Ursprung = Fußpunkt (Mitte der Unterseite), Blick nach +X.
//   opts  { marker: false (true: eigene rote Landefläche vor ihm am Boden, siehe landemarke) }
//   state { anim: 'idle'|'walk'|'tilt'|'land'|'hit'|'stunned'|'rise'|'defeated', hp (3..0, Standard 3; Risse und Wut
//           nehmen zu), speed (walk, m/s; Watschel-Takt), progress? (tilt/rise/hit/defeated: 0..1, sonst Zeit),
//           mark? (0..1 Stärke der roten Landefläche; Standard: tilt → 1, sonst 0) }
//         idle: atmet, blinzelt, wiegt sich; walk: watschelt (kippelt seitlich, kleine Hüpfer, Staub);
//         tilt: kippt um die vordere Unterkante nach vorn (+X) aufs Gesicht (0,7 s, wird schneller);
//         land: liegt flach mit dem Rücken nach oben (Aufprall-Stauchung, Staub); hit: liegend, blitzt weiß, Feld zuckt
//         (0,6 s); stunned: liegend, Schwindelsterne über dem Rücken, Feld blinkt; rise: richtet sich wieder auf (0,8 s);
//         defeated: bröckelt in Brocken auseinander, die Krone springt hoch und fällt (1,6 s), danach weg.
//   root.userData.size → { w: 3,4 (Breite z), h: 3,6 (Höhe), d: 1,5 (Tiefe x) }
//   root.userData.lying → { x0: 0,75, x1: 4,35, w: 3,4, h: 1,5 } liegender Grundriss vor dem Ursprung (x0..x1, z ±w/2),
//         Oberseite (Rücken) bei y = h.
//   model.back(out?) → Weltposition der Mitte des Schwachpunkt-Felds (stehend hinten, liegend oben).
//   model.marker → das Landemarken-Modell (nur mit opts.marker), liegt in root bei x = 2,55 (Mitte des liegenden Grundrisses).
// kippquader         Kippquader mit Gesicht (Baustein `kippquader`, blocks/types/w5_temple.js): Sandstein- bzw. grauer
//   Steinquader mit Fugen und hellen Kanten, grimmiges Gesicht vorn, blaues Sternfeld hinten; optional als Rahmen mit
//   Loch (wie im Vorbild). **Ursprung = Mitte des Körpers**; Gesicht standardmäßig auf lokal −Z (Kipprichtung des Bausteins),
//   Rückenfeld auf +Z; das Kippen selbst dreht der Baustein (root), das Modell zeigt nur Mimik/Glühen.
//   opts  { size: [sx, sy, sz] ([2, 4, 2]; Breite, Höhe, Tiefe stehend), hole: [w, h] | null (Loch durch die Tiefe),
//           style: 'tempel' | 'stein', front: '-z' (Standard) | '+x' (Gesicht nach +X), face: true }
//   state { anim: 'idle'|'warn'|'tip'|'tilt'|'land', k | progress (0..1 Kippfortschritt) }
//         warn: glüht rot, Augen zusammengekniffen; tip/tilt: Augen weit auf; land: Augen zu, Staubwolke.
// landemarke         rote Landefläche (Warnfeld) am Boden: halbdurchsichtige rote Fläche mit hellem Rand und einem nach
//   innen laufenden Warnrahmen. Ursprung = Mitte, liegt bei y = 0,02.
//   opts  { size: [w, d] ([3,6, 3,4]), shape: 'rechteck' | 'kreis', color (0xff2a2a) }
//   state { k (0..1 Stärke; 0 = aus) }  pulsiert umso schneller, je größer k.

import {
  THREE, TAU, Build, cached, vcol, basic, mesh, joint, eyes, makeModel, Clock, Blinker, damp, clamp, mix, smoothstep,
  instMesh, setInst, placed, puffyStarGeo, dizzyStars, metal,
} from '../lib/kit.js';
import { Puffs } from '../lib/kit_w3.js';
import { W5, ownMat, gradV, mouthShape, puffyGeo, roundRectShape, hash1, noise3 } from '../lib/w5Geos.js';

const prog = (st, clk, dur) => (st.progress !== undefined ? clamp(st.progress, 0, 1) : clamp(clk.age / dur, 0, 1));
const easeIn = (x) => x * x;
const _v = new THREE.Vector3();

// =============================================================================================
// Landemarke
// =============================================================================================
function markRimGeo(w, d, shape) {
  return cached(`w5:mark:rim:${shape}:${w.toFixed(2)}:${d.toFixed(2)}`, () => {
    const b = new Build();
    const t = 0.14;
    if (shape === 'kreis') {
      b.torus(1, t / Math.max(w, d), 0xffffff, { r: [Math.PI / 2, 0, 0], s: [w / 2, d / 2, 0.3] }, 6, 64);
      return b.geometry();
    }
    b.box(w, 0.04, t, 0xffffff, { p: [0, 0, d / 2 - t / 2] }, 0.015, 1);
    b.box(w, 0.04, t, 0xffffff, { p: [0, 0, -d / 2 + t / 2] }, 0.015, 1);
    b.box(t, 0.04, d - 2 * t, 0xffffff, { p: [w / 2 - t / 2, 0, 0] }, 0.015, 1);
    b.box(t, 0.04, d - 2 * t, 0xffffff, { p: [-w / 2 + t / 2, 0, 0] }, 0.015, 1);
    return b.geometry();
  });
}
function markFillGeo(shape) {
  return cached(`w5:mark:fill:${shape}`, () => {
    const g = shape === 'kreis' ? new THREE.CircleGeometry(0.5, 48) : new THREE.PlaneGeometry(1, 1, 8, 8);
    g.rotateX(-Math.PI / 2);
    const P = g.attributes.position, c = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) {
      const e = shape === 'kreis' ? Math.hypot(P.getX(i), P.getZ(i)) * 2 : Math.max(Math.abs(P.getX(i)), Math.abs(P.getZ(i))) * 2;
      const k = 0.55 + 0.45 * smoothstep((e - 0.4) / 0.6);
      c[i * 3] = k; c[i * 3 + 1] = k * 0.85; c[i * 3 + 2] = k * 0.85;
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return g;
  });
}
function buildLandemarke(opts = {}) {
  const size = Array.isArray(opts.size) ? opts.size : [3.6, 3.4];
  const w = Math.max(0.3, size[0]), d = Math.max(0.3, size[1] ?? size[0]);
  const shape = opts.shape === 'kreis' ? 'kreis' : 'rechteck';
  const color = opts.color ?? 0xff2a2a;
  const root = new THREE.Group();
  const fillMat = new THREE.MeshBasicMaterial({ color, vertexColors: true, transparent: true, opacity: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const rimMat = new THREE.MeshBasicMaterial({ color: mix(color, 0xffffff, 0.75), transparent: true, opacity: 0.85, depthWrite: false });
  const sweepMat = new THREE.MeshBasicMaterial({ color: mix(color, 0xffffff, 0.45), transparent: true, opacity: 0.6, depthWrite: false });
  const fill = mesh(markFillGeo(shape), fillMat, { p: [0, 0.02, 0], s: [w, 1, d] });
  const rim = mesh(markRimGeo(w, d, shape), rimMat, { p: [0, 0.03, 0] });
  const sweep = mesh(markRimGeo(w, d, shape), sweepMat, { p: [0, 0.035, 0] });
  for (const m of [fill, rim, sweep]) { m.renderOrder = 3; m.receiveShadow = false; m.castShadow = false; }
  root.add(fill, rim, sweep);
  const clk = new Clock();
  let k = 0, ph = 0;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    k = damp(k, clamp(st.k ?? (st.anim === 'off' ? 0 : 1), 0, 1), 12, dt);
    ph += dt * (1.2 + k * 2.4);
    const pulse = 0.7 + 0.3 * Math.sin(clk.t * (6 + k * 12));
    fillMat.opacity = (0.15 + 0.45 * k) * pulse;
    rimMat.opacity = (0.3 + 0.6 * k) * pulse;
    const f = ph % 1;
    sweep.scale.set(1 - f * 0.8, 1, 1 - f * 0.8);
    sweepMat.opacity = k * (1 - f) * 0.8;
    root.visible = k > 0.02;
  };
  return makeModel('landemarke', root, update, [fillMat, rimMat, sweepMat], { initial: 'idle' });
}

// =============================================================================================
// Kippquader-König
// =============================================================================================
const KK = { W: 3.4, H: 3.6, D: 1.5 };
const KC = {
  stone: 0xf4d6a0, stoneHi: 0xfff2d4, stoneLow: 0xd0a468, seam: 0xb08250, edge: 0xfff8e8,
  lila: 0x8a3ad8, lilaHi: 0xc08aff, lilaLow: 0x4a1a8a, gold: 0xffc21a, goldHi: 0xfff0a0, goldLow: 0xb8780a,
  mouth: 0x3a1020, tooth: 0xfffaf0, brow: 0xa8845a, back: 0x2a8aff, backHi: 0x9ad8ff, backLow: 0x1a4ac8,
  ruby: 0xff2a4a, emerald: 0x2ad880, sapphire: 0x3a6aff, velvet: 0x7a1aa8,
};
function kingBodyGeo() {
  return cached('w5:kk:body', () => {
    const b = new Build();
    const { W, H, D } = KK;
    // Steinplatte mit Fugen (Seiten/Oberseite), Gesicht vorn ohne Fugen
    b.box(D, H, W, { v: (x, y, z, nx, ny, nz) => {
      const shade = mix(KC.stoneLow, KC.stoneHi, smoothstep(ny * 0.4 + 0.55 + (y / H - 0.5) * 0.3 + nx * 0.08));
      const n = noise3(x * 2.2, y * 2.2, z * 2.2);
      return mix(shade, n > 0.62 ? KC.stoneHi : KC.stoneLow, Math.abs(n - 0.5) * 0.35);
    } }, { p: [0, H / 2, 0] }, 0.3, 4);
    // Fugen als flache Rillen auf den Seiten (dünne dunklere Leisten)
    for (const sx of [1, -1]) {
      for (const y of [1.2, 2.4]) b.box(0.02, 0.05, W - 0.5, KC.seam, { p: [sx * (D / 2 + 0.002), y, 0] }, 0.01, 1);
    }
    for (const sz of [1, -1]) for (const y of [1.2, 2.4]) b.box(D - 0.5, 0.05, 0.02, KC.seam, { p: [0, y, sz * (W / 2 + 0.002)] }, 0.01, 1);
    // lila Saumband mit Goldkanten
    b.box(D + 0.08, 0.34, W + 0.08, gradV(KC.lilaLow, KC.lilaHi, 0.5, 0.5), { p: [0, 0.32, 0] }, 0.2, 3);
    for (const y of [0.13, 0.51]) b.box(D + 0.12, 0.06, W + 0.12, gradV(KC.goldLow, KC.goldHi, 0.6, 0.5), { p: [0, y, 0] }, 0.03, 2);
    // goldene Eckkappen oben
    for (const sx of [1, -1]) for (const sz of [1, -1]) {
      b.sphere(0.24, gradV(KC.goldLow, KC.goldHi, 0.6, 0.45), { p: [sx * (D / 2 - 0.2), H - 0.18, sz * (W / 2 - 0.2)], s: [1, 0.8, 1] }, 18, 12);
      b.sphere(0.07, KC.ruby, { p: [sx * (D / 2 - 0.12), H - 0.05, sz * (W / 2 - 0.12)] }, 10, 8);
    }
    // Gesicht (+X): wuchtige Brauen, Knollennase, grimmiger Mund mit Blockzähnen
    const fx = D / 2;
    for (const s of [1, -1]) {
      b.capsule(0.15, 0.82, gradV(KC.stoneLow, KC.stoneHi, 0.5, 0.6), { p: [fx + 0.08, 3.08, s * 0.78], r: [Math.PI / 2 - s * 0.32, 0, 0] }, 4, 14);
    }
    b.sphere(1, gradV(KC.stoneLow, KC.stoneHi, 0.5, 0.65), { p: [fx + 0.05, 2.05, 0], s: [0.34, 0.36, 0.38] }, 22, 16);
    for (const s of [1, -1]) b.sphere(0.09, KC.stoneLow, { p: [fx + 0.27, 1.92, s * 0.13], s: [0.6, 0.6, 1] }, 10, 8);
    const mouth = puffyGeo(mouthShape('grim'), 0.08, 0.04, 16, 3);
    b.add(mouth, KC.mouth, placed(new THREE.Vector3(fx + 0.02, 1.32, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0.82, 0.42, 1)));
    for (let i = 0; i < 6; i++) {
      const z = (i - 2.5) * 0.24, y = 1.43 + 0.11 * (1 - Math.pow(z / 0.82, 2));
      b.box(0.08, 0.2, 0.2, KC.tooth, { p: [fx + 0.07, y, z] }, 0.04, 2);
    }
    for (const s of [1, -1]) b.add(new THREE.ConeGeometry(0.08, 0.2, 10), KC.tooth, { p: [fx + 0.07, 1.22, s * 0.5] });
    // Rückenfeld-Rahmen (Gold)
    b.add(puffyGeo(roundRectShape(1.85, 1.85, 0.32), 0.06, 0.04, 8, 3), gradV(KC.goldLow, KC.goldHi, 0.5, 0.5), placed(new THREE.Vector3(-D / 2 - 0.01, 1.85, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(1, 1, 1)));
    return b.geometry();
  });
}
function kingBackGeo() {
  return cached('w5:kk:back', () => {
    const b = new Build();
    b.add(puffyGeo(roundRectShape(1.55, 1.55, 0.26), 0.08, 0.06, 8, 4), { v: (x, y) => mix(KC.backLow, KC.backHi, smoothstep((y + 0.78) / 1.56)) }, {});
    b.add(puffyStarGeo(0.5, 0.24, 0.06, 0.04), 0xffffff, { p: [0, 0, 0.09] });
    return b.geometry();
  });
}
function kingCrownGeo() {
  return cached('w5:kk:crown', () => {
    const b = new Build();
    const goldV = gradV(KC.goldLow, KC.goldHi, 0.45, 0.5);
    b.dome(0.62, gradV(0x4a0a6a, KC.velvet, 0.6, 0.4), { p: [0, 0.12, 0], s: [1, 0.85, 1] }, Math.PI / 2, 24, 10);
    b.cyl(0.72, 0.66, 0.42, goldV, { p: [0, 0.21, 0] }, 32, true);
    b.cyl(0.7, 0.64, 0.42, KC.goldLow, { p: [0, 0.21, 0], r: [Math.PI, 0, 0] }, 32, true);
    b.torus(0.66, 0.06, KC.gold, { p: [0, 0.02, 0], r: [Math.PI / 2, 0, 0] }, 6, 32);
    b.torus(0.72, 0.05, KC.goldHi, { p: [0, 0.42, 0], r: [Math.PI / 2, 0, 0] }, 6, 32);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU;
      const g = new THREE.SphereGeometry(1, 12, 8);
      const P = g.attributes.position;
      for (let k = 0; k < P.count; k++) { const y = P.getY(k); if (y > 0) { const f = 1 - y * 0.75; P.setX(k, P.getX(k) * f); P.setZ(k, P.getZ(k) * f); } }
      g.computeVertexNormals();
      b.add(g, goldV, { p: [Math.cos(a) * 0.69, 0.5, Math.sin(a) * 0.69], s: [0.15, 0.3, 0.15] });
      b.sphere(0.075, i % 2 ? KC.emerald : KC.ruby, { p: [Math.cos(a) * 0.69, 0.82, Math.sin(a) * 0.69] }, 12, 8);
    }
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU + 0.22, big = i === 0;
      b.add(new THREE.SphereGeometry(1, 10, 6), big ? KC.ruby : i % 2 ? KC.sapphire : KC.emerald, placed(new THREE.Vector3(Math.cos(a) * 0.72, 0.21, Math.sin(a) * 0.72), new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), new THREE.Vector3(big ? 0.11 : 0.06, big ? 0.11 : 0.07, 0.04)));
    }
    b.add(puffyStarGeo(0.13, 0.06, 0.05, 0.02), KC.goldHi, { p: [0, 0.68, 0], r: [0, Math.PI / 2, 0] });
    return b.geometry();
  });
}
// Risse je hp (kumuliert) als dunkle Zickzack-Röhren auf Rücken und Seiten
function kingCrackGeo(hp) {
  const lv = 3 - clamp(Math.round(hp), 0, 3);
  return cached(`w5:kk:cracks:${lv}`, () => {
    const b = new Build();
    const { W, H, D } = KK;
    const crack = (pts, r) => b.tube(pts, r, 0x5a3a20, null, pts.length * 4, 5);
    const sets = [
      [[[-D / 2 - 0.02, 3.3, 1.2], [-D / 2 - 0.02, 3.0, 1.0], [-D / 2 - 0.02, 2.85, 1.15], [-D / 2 - 0.02, 2.6, 0.95]], [[0.4, H + 0.01, -1.2], [0.1, H + 0.01, -1.0], [-0.2, H + 0.01, -1.15]]],
      [[[-D / 2 - 0.02, 1.0, -1.1], [-D / 2 - 0.02, 0.85, -0.85], [-D / 2 - 0.02, 0.95, -0.6], [-D / 2 - 0.02, 0.75, -0.4]], [[0.2, 2.9, W / 2 + 0.01], [-0.1, 2.6, W / 2 + 0.01], [0.15, 2.3, W / 2 + 0.01], [-0.05, 2.05, W / 2 + 0.01]]],
      [[[-D / 2 - 0.02, 2.95, -0.2], [-D / 2 - 0.02, 2.75, -0.3], [-D / 2 - 0.02, 2.62, -0.15]], [[-D / 2 - 0.02, 1.0, 0.5], [-D / 2 - 0.02, 1.1, 0.2], [-D / 2 - 0.02, 0.9, 0.0]], [[0.3, 1.8, -W / 2 - 0.01], [0.0, 1.5, -W / 2 - 0.01], [0.2, 1.2, -W / 2 - 0.01], [-0.1, 0.9, -W / 2 - 0.01]], [[0.5, 3.1, 0.9], [0.62, 2.8, 1.1], [0.55, 2.5, 0.95]]],
    ];
    if (lv === 0) { b.sphere(0.001, 0x000000, { p: [0, H / 2, 0] }, 3, 2); return b.geometry(); }
    for (const list of sets.slice(0, lv)) for (const c of list) crack(c, 0.035);
    return b.geometry();
  });
}
const kingChunkGeo = () => cached('w5:kk:chunk', () => new Build().box(0.7, 0.6, 0.65, gradV(KC.stoneLow, KC.stoneHi), {}, 0.12, 1).geometry());
function buildKoenig(opts = {}) {
  const { W, H, D } = KK;
  const root = new THREE.Group();
  const own = [];
  const bodyMat = ownMat(vcol(0.55), { emissive: 0x000000 });
  const backMat = ownMat(vcol(0.25), { emissive: 0x000000 });
  own.push(bodyMat, backMat);
  const pivot = joint([D / 2, 0, 0]);      // Kippkante vorn unten
  const inner = joint([-D / 2, 0, 0]);
  const wob = joint([0, 0, 0]);
  const bodyM = mesh(kingBodyGeo(), bodyMat, {}, true);
  bodyM.receiveShadow = true;
  const eye = eyes([{ p: [D / 2 + 0.02, 2.5, 0.72], r: 0.4, sy: 1.12, dir: [1, 0, 0.12] }, { p: [D / 2 + 0.02, 2.5, -0.72], r: 0.4, sy: 1.12, dir: [1, 0, -0.12] }],
    { key: 'w5:kk', iris: 0xffa010, pupil: 0.56, depth: 0.5 });
  const back = mesh(kingBackGeo(), backMat, { p: [-D / 2 - 0.05, 1.85, 0], r: [0, -Math.PI / 2, 0] });
  const cracks = mesh(kingCrackGeo(3), vcol(0.8), {});
  const crownJ = joint([0, H - 0.08, 0]);
  const crown = mesh(kingCrownGeo(), metal('w5crown', { color: 0xffffff, vertexColors: true, metalness: 0.45, roughness: 0.28, emissive: 0x2a1a00 }, 0.9), {}, true);
  crownJ.add(crown);
  crownJ.rotation.z = -0.08;
  wob.add(bodyM, eye, back, cracks, crownJ);
  inner.add(wob);
  pivot.add(inner);
  const chunks = instMesh(kingChunkGeo(), vcol(0.55), 14, 8, 1.5);
  chunks.castShadow = true;
  chunks.visible = false;
  const dust = new Puffs(10, 0xeadcc0, { opacity: 0.85, radius: 7, cy: 0.6 });
  own.push(dust);
  const dizzy = dizzyStars(0.6, 0.14);
  root.add(pivot, chunks, dust.mesh, dizzy);
  let marker = null;
  if (opts.marker) {
    marker = buildLandemarke({ size: [H, W] });
    marker.root.position.set(D / 2 + H / 2, 0, 0);
    root.add(marker.root);
  }
  root.userData.size = { w: W, h: H, d: D };
  root.userData.lying = { x0: D / 2, x1: D / 2 + H, w: W, h: D };
  const clk = new Clock(), blink = new Blinker();
  let ang = 0, flash = 0, sq = 0, hpShown = 3, phase = 0, crownUp = 0, crownV = 0, crownY = 0, landed = false, angry = 0;
  const chunkState = Array.from({ length: 14 }, (_, i) => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Vector3(hash1(i) * 6, hash1(i + 3) * 6, hash1(i + 7) * 6), s: 0.6 + hash1(i * 2.7) * 0.6 }));
  let crumbled = false;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    if (clk.entered) landed = false;
    const hp = clamp(Math.round(st.hp ?? 3), 0, 3);
    if (hp !== hpShown) { hpShown = hp; cracks.geometry = kingCrackGeo(hp); }
    angry = 3 - hp;
    const lyingState = anim === 'land' || anim === 'hit' || anim === 'stunned';
    const dead = anim === 'defeated';
    // Kippwinkel
    let target = 0;
    if (anim === 'tilt') { const p = prog(st, clk, 0.7); target = (Math.PI / 2) * easeIn(p); ang = target; if (p >= 1 && !landed) { landed = true; dust.burst([D / 2 + H / 2, 0.2, 0], { count: 14, speed: 3, up: 1.2, size: 0.5, life: 0.8, spread: 1.6 }); } }
    else if (lyingState) { target = Math.PI / 2; ang = damp(ang, target, 30, dt); if (anim === 'land' && clk.entered) dust.burst([D / 2 + H / 2, 0.2, 0], { count: 14, speed: 3, up: 1.2, size: 0.5, life: 0.8, spread: 1.6 }); }
    else if (anim === 'rise') { const p = prog(st, clk, 0.8); ang = (Math.PI / 2) * (1 - smoothstep(p)); }
    else if (dead) { /* bleibt, wie er war */ }
    else ang = damp(ang, 0, 6, dt);
    pivot.rotation.z = -ang;
    // Watscheln / Atmen / Aufprall-Stauchung
    const walking = anim === 'walk';
    if (walking) phase += dt * (3 + (st.speed ?? 1.5) * 1.6);
    const hop = walking ? Math.abs(Math.sin(phase)) * 0.14 : 0;
    wob.position.y = hop;
    wob.rotation.x = walking ? Math.sin(phase) * 0.07 : Math.sin(t * 0.9) * 0.012;
    if (walking && Math.abs(Math.sin(phase)) < 0.08 && Math.random() < 0.5) dust.burst([0, 0.1, Math.sign(Math.sin(phase * 0.5)) * W * 0.4], { count: 1, speed: 0.8, up: 0.5, size: 0.3, life: 0.6, spread: 0.3 });
    const hitNow = anim === 'hit' && prog(st, clk, 0.6) < 1;
    const sqT = (anim === 'land' && age < 0.35) ? Math.sin((age / 0.35) * Math.PI) : hitNow ? 0.6 + Math.sin(t * 30) * 0.2 : 0;
    sq = damp(sq, sqT, 25, dt);
    const breathe = anim === 'idle' ? Math.sin(t * 1.6) * 0.012 : 0;
    // Stauchung entlang der Plattennormalen (liegend: lokal x)
    wob.scale.set(1 - sq * 0.12, 1 + breathe - (lyingState ? 0 : sq * 0.06), 1 + sq * 0.05);
    // Aufblitzen und Rückenfeld
    flash = damp(flash, hitNow ? 1 : 0, hitNow ? 30 : 6, dt);
    bodyMat.emissive.setRGB(flash * 0.8, flash * 0.75, flash * 0.7);
    const target2 = anim === 'stunned' ? 0.35 + 0.35 * Math.sin(t * 6) : lyingState ? 0.25 : 0.12;
    backMat.emissive.setRGB(0.05 * target2 + flash, 0.35 * target2 + flash, target2 + flash);
    // Krone: wackelt beim Watscheln; besiegt springt sie hoch und fällt
    if (dead) {
      const p = prog(st, clk, 1.6);
      if (clk.entered) { crownV = 4.5; crownY = 0; crumbled = false; }
      crownV -= 12 * dt; crownY = Math.max(-H + 0.4, crownY + crownV * dt);
      crownJ.position.set(0, H - 0.08 + crownY, 0);
      crownJ.rotation.set(p * 3, 0, -0.08 + p * 4);
      // Brocken
      if (!crumbled && p > 0.15) {
        crumbled = true;
        chunkState.forEach((c, i) => { c.p.set((hash1(i) - 0.5) * D, 0.4 + (i / 14) * H, (hash1(i + 1) - 0.5) * W); c.v.set((hash1(i + 2) - 0.5) * 4, 2 + hash1(i + 4) * 3, (hash1(i + 5) - 0.5) * 5); });
        dust.burst([0, 1.5, 0], { count: 16, speed: 3, up: 1, size: 0.6, life: 1, spread: 1.5, force: true });
      }
      wob.visible = !crumbled || p < 0.2;
      wob.scale.multiplyScalar(crumbled ? Math.max(0.01, 1 - (p - 0.15) * 8) : 1 + Math.sin(t * 50) * 0.01);
      crownJ.visible = p < 0.97;
      chunks.visible = crumbled && p < 0.98;
      if (chunks.visible) {
        chunkState.forEach((c, i) => {
          c.v.y -= 14 * dt; c.p.addScaledVector(c.v, dt);
          if (c.p.y < 0.25) { c.p.y = 0.25; c.v.y *= -0.3; c.v.x *= 0.7; c.v.z *= 0.7; }
          const s = c.s * (1 - smoothstep((p - 0.75) / 0.23));
          setInst(chunks, i, c.p.x, c.p.y, c.p.z, c.r.x * p, c.r.y * p, c.r.z * p, Math.max(0.001, s));
        });
        chunks.instanceMatrix.needsUpdate = true;
      }
      if (crumbled) { crownJ.removeFromParent(); root.add(crownJ); }
    } else {
      if (crownJ.parent !== wob) { wob.add(crownJ); }
      wob.visible = true; chunks.visible = false;
      crownUp = damp(crownUp, hitNow ? 1 : 0, 10, dt);
      crownJ.position.set(crownUp * 0.0, H - 0.08 + crownUp * 0.25 + (walking ? Math.abs(Math.sin(phase)) * 0.05 : 0), 0);
      crownJ.rotation.set(walking ? Math.sin(phase) * 0.08 : 0, 0, -0.08 - angry * 0.04 + (hitNow ? Math.sin(t * 25) * 0.15 : 0));
    }
    dust.step(dt);
    // Schwindelsterne über dem liegenden Rücken
    dizzy.visible = anim === 'stunned';
    if (dizzy.visible) { dizzy.position.set(D / 2 + H / 2, D + 0.5, 0); dizzy.rotation.y = t * 3; dizzy.scale.setScalar(2.2); }
    // Landefläche
    if (marker) marker.update(dt, { k: st.mark ?? (anim === 'tilt' ? 1 : 0) });
    // Augen
    let bk = blink.update(dt);
    if (anim === 'tilt') bk = 1.15; else if (lyingState || dead) bk = 0.1; else if (anim === 'walk') bk = Math.min(bk, 0.85 - angry * 0.08);
    eye.userData.blink(bk);
  };
  const model = makeModel('kippquader_koenig', root, update, [...own, chunks, ...(marker ? [{ dispose: () => marker.dispose() }] : [])], { initial: 'idle' });
  model.marker = marker;
  model.back = (out = new THREE.Vector3()) => { root.updateMatrixWorld(true); return back.getWorldPosition(out); };
  return model;
}

// =============================================================================================
// Kippquader (Baustein-Modell)
// =============================================================================================
const KQ_STYLE = {
  tempel: { body: 0xf2cf8e, hi: 0xffecc0, low: 0xcf9a5c, seam: 0xa8763e, edge: 0xfff6e0, brow: 0x9a6a3a },
  stein: { body: 0xc4c0d0, hi: 0xeceaf4, low: 0x86829a, seam: 0x6a667e, edge: 0xf6f4fa, brow: 0x5e5a70 },
};
function kqParts(sx, sy, sz, hole) {
  if (!hole) return [{ min: [-sx / 2, -sy / 2, -sz / 2], max: [sx / 2, sy / 2, sz / 2] }];
  const hw = Math.min(sx - 0.4, hole[0]) / 2, hh = Math.min(sy - 0.4, hole[1]) / 2;
  return [
    { min: [-sx / 2, -sy / 2, -sz / 2], max: [-hw, sy / 2, sz / 2] },
    { min: [hw, -sy / 2, -sz / 2], max: [sx / 2, sy / 2, sz / 2] },
    { min: [-hw, hh, -sz / 2], max: [hw, sy / 2, sz / 2] },
    { min: [-hw, -sy / 2, -sz / 2], max: [hw, -hh, sz / 2] },
  ];
}
function kqGeo(sx, sy, sz, hole, style, face) {
  const S = KQ_STYLE[style] ?? KQ_STYLE.tempel;
  const key = `w5:kq:${sx}:${sy}:${sz}:${hole ? hole.join('x') : '-'}:${style}:${face}`;
  return cached(key, () => {
    const b = new Build();
    const r = Math.min(0.16, sx * 0.08, sy * 0.08, sz * 0.08);
    for (const p of kqParts(sx, sy, sz, hole)) {
      const w = p.max[0] - p.min[0], h = p.max[1] - p.min[1], d = p.max[2] - p.min[2];
      const cx = (p.min[0] + p.max[0]) / 2, cy = (p.min[1] + p.max[1]) / 2, cz = (p.min[2] + p.max[2]) / 2;
      b.box(w, h, d, { v: (x, y, z, nx, ny, nz) => {
        const X = x + cx, Y = y + cy, Z = z + cz;
        const edge = Math.min(sx / 2 - Math.abs(X), sy / 2 - Math.abs(Y), sz / 2 - Math.abs(Z));
        let c = mix(S.low, S.hi, smoothstep(ny * 0.45 + 0.5 + nx * 0.1 + (Y / sy) * 0.25));
        if (edge < 0.1) c = mix(c, S.edge, 0.45);
        return c;
      } }, { p: [cx, cy, cz] }, r, 3);
      // Steinfugen als flache Rillen: waagerecht je 1 m, senkrecht versetzt (Mauerverband) auf den Seiten ±X und ±Z
      const rows = Math.max(1, Math.round(h));
      for (let i = 1; i < rows; i++) {
        const y = p.min[1] + (h / rows) * i;
        for (const sg of [1, -1]) {
          if ((sg > 0 ? p.max[0] : -p.min[0]) >= sx / 2 - 1e-3) b.box(0.02, 0.045, d - 2 * r, S.seam, { p: [sg > 0 ? p.max[0] + 0.004 : p.min[0] - 0.004, y, cz] }, 0.01, 1);
          if ((sg > 0 ? p.max[2] : -p.min[2]) >= sz / 2 - 1e-3 && !(face && sg < 0)) b.box(w - 2 * r, 0.045, 0.02, S.seam, { p: [cx, y, sg > 0 ? p.max[2] + 0.004 : p.min[2] - 0.004] }, 0.01, 1);
        }
      }
      for (let i = 0; i < rows; i++) {
        const y0 = p.min[1] + (h / rows) * i, y1 = y0 + h / rows, off = i % 2 ? 0.25 : -0.25;
        for (const sg of [1, -1]) {
          if ((sg > 0 ? p.max[0] : -p.min[0]) >= sx / 2 - 1e-3 && d > 1.2) b.box(0.02, h / rows - 0.12, 0.045, S.seam, { p: [sg > 0 ? p.max[0] + 0.004 : p.min[0] - 0.004, (y0 + y1) / 2, cz + off * d * 0.5] }, 0.01, 1);
          if ((sg > 0 ? p.max[2] : -p.min[2]) >= sz / 2 - 1e-3 && w > 1.2 && sg > 0) b.box(0.045, h / rows - 0.12, 0.02, S.seam, { p: [cx + off * w * 0.5, (y0 + y1) / 2, p.max[2] + 0.004] }, 0.01, 1);
        }
      }
    }
    if (face !== false) {
      // Rückenfeld (+Z): blaues Feld mit weißem Stern (bei Loch auf dem oberen Balken)
      const top = hole ? (Math.min(sy - 0.4, hole[1]) / 2 + sy / 2) / 2 : 0;
      const ph = hole ? Math.max(0.3, sy / 2 - Math.min(sy - 0.4, hole[1]) / 2 - 0.25) : Math.min(sx, sy) * 0.55;
      const pw = Math.min(sx * 0.7, hole ? sx * 0.75 : ph);
      b.add(puffyGeo(roundRectShape(pw, ph, Math.min(pw, ph) * 0.2), 0.05, 0.03, 8, 3), { v: (x, y) => mix(0x1a4ac8, 0x8ad0ff, smoothstep(y / ph + 0.5)) }, { p: [0, top, sz / 2 + 0.01] });
      const ss = Math.min(pw, ph) * 0.32;
      b.add(puffyStarGeo(ss, ss * 0.48, 0.04, 0.02), 0xffffff, { p: [0, top, sz / 2 + 0.06] });
      // Gesicht (−Z): Brauen, Mund (ohne Loch) – Augen kommen als eigenes Mesh dazu
      const ey = hole ? top : sy * 0.16;
      const ex = Math.min(sx * 0.22, 0.6);
      for (const s of [1, -1]) b.capsule(Math.min(0.09, sx * 0.04), Math.min(0.5, sx * 0.22), S.brow, { p: [s * ex, ey + Math.min(0.42, sy * 0.1), -sz / 2 - 0.04], r: [0, 0, Math.PI / 2 + s * 0.35] }, 3, 10);
      if (!hole) {
        const mw = Math.min(0.9, sx * 0.34);
        b.add(puffyGeo(mouthShape('grim'), 0.05, 0.025, 12, 2), 0x3a1a20, placed(new THREE.Vector3(0, -sy * 0.08, -sz / 2 - 0.005), new THREE.Vector3(0, 0, -1), new THREE.Vector3(mw, mw * 0.5, 1)));
        for (let i = 0; i < 4; i++) b.box(mw * 0.36, mw * 0.22, 0.05, 0xfffaf0, { p: [(i - 1.5) * mw * 0.42, -sy * 0.08 + mw * 0.1, -sz / 2 - 0.03] }, 0.02, 1);
      }
    }
    return b.geometry();
  });
}
function buildKippquader(opts = {}) {
  const s = Array.isArray(opts.size) ? opts.size : [2, 4, 2];
  const sx = Math.max(0.6, s[0] ?? 2), sy = Math.max(0.6, s[1] ?? 4), sz = Math.max(0.6, s[2] ?? 2);
  const hole = Array.isArray(opts.hole) ? opts.hole : null;
  const style = KQ_STYLE[opts.style] ? opts.style : 'tempel';
  const face = opts.face !== false;
  const root = new THREE.Group();
  const own = [];
  const inner = joint();
  if (opts.front === '+x') inner.rotation.y = -Math.PI / 2;
  const mat = ownMat(vcol(0.62), { emissive: 0x000000 });
  own.push(mat);
  const bodyM = mesh(kqGeo(sx, sy, sz, hole, style, face), mat, {}, true);
  bodyM.receiveShadow = true;
  inner.add(bodyM);
  let eye = null;
  if (face) {
    const top = hole ? (Math.min(sy - 0.4, hole[1]) / 2 + sy / 2) / 2 : 0;
    const ey = hole ? top : sy * 0.16;
    const ex = Math.min(sx * 0.22, 0.6), er = Math.min(0.3, sx * 0.14, hole ? (sy / 2 - Math.min(sy - 0.4, hole[1]) / 2) * 0.34 : 1);
    eye = eyes([{ p: [ex, ey, -sz / 2 - 0.01], r: er, sy: 1.1, dir: [0.12, 0, -1] }, { p: [-ex, ey, -sz / 2 - 0.01], r: er, sy: 1.1, dir: [-0.12, 0, -1] }],
      { key: `w5:kq:${ex.toFixed(2)}:${ey.toFixed(2)}:${er.toFixed(2)}:${sz}`, iris: 0xff7a1a, pupil: 0.55, depth: 0.5 });
    inner.add(eye);
  }
  const dust = new Puffs(12, 0xeadcc0, { opacity: 0.85, radius: 5, cy: 0 });
  own.push(dust);
  root.add(inner, dust.mesh);
  const clk = new Clock(), blink = new Blinker();
  let glow = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    const warn = anim === 'warn';
    glow = damp(glow, warn ? 0.5 + 0.5 * Math.sin(t * 18) : 0, 20, dt);
    mat.emissive.setRGB(glow * 0.45, glow * 0.08, glow * 0.02);
    if (anim === 'land' && clk.entered) dust.burst([0, -sy / 2, 0], { count: 10, speed: 2.4, up: 0.8, size: 0.4, life: 0.7, spread: Math.max(sx, sz) * 0.5 });
    dust.step(dt);
    if (eye) {
      let bk = blink.update(dt);
      if (warn) bk = 0.55; else if (anim === 'tip' || anim === 'tilt') bk = 1.15; else if (anim === 'land' && clk.age < 0.5) bk = 0.1;
      eye.userData.blink(bk);
    }
  };
  return makeModel('kippquader', root, update, own, { initial: 'idle' });
}

export const MODELS = {
  kippquader_koenig: buildKoenig,
  kippquader: buildKippquader,
  landemarke: buildLandemarke,
};
