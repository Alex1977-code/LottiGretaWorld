// Gimmicks Welt 7 „Lava-Festung“ (Kurs-Modus). Eigene Gestaltung. Maßstab Meter, Blick/Laufrichtung +X; Ursprung je Modell
// genannt; state darf ein String sein. progress (0..1) überschreibt bei Einmal-Animationen die Zeit seit dem Zustandswechsel.
// Farben 'rot' | 'blau' passen zu roter bzw. blauer Lava.
//
// feuerstab        Feuerstab: genieteter Eisenblock (1 m, Goldkappe, Glutschlitz) mit einem Stab aus Feuerkugeln, der sich um
//   die Blockmitte dreht. **Ursprung = Mitte der Unterseite des Blocks**, Drehpunkt y = 0,5.
//   opts  { length (m, Reichweite der äußersten Kugel, 3), count? (Kugeln je Arm, Standard round(length / 0,5)), arms (1..4,
//           Standard 1, gleichmäßig verteilt), plane: 'h' (Standard: waagerecht um die Hochachse) | 'v' (senkrecht, in der X-Y-
//           Ebene um die Z-Achse), color: 'rot' | 'blau', block (true) }
//   state { angle (rad, überschreibt), speed (rad/s ohne angle; Standard 1,2) }
//   model.balls → Zahl der Kugeln, model.ballPos(i, out?) → Weltposition der Kugel i (Arm-weise von innen nach außen),
//   root.userData.ballRadius → Trefferradius einer Kugel (0,25 m).
// lavablase        Lavablase: glühende, glänzende Blase aus Lava (Ø ≈ size) – auf der Lava (Blubbern, Anschwellen, Platzen) oder
//   als springender Lavatropfen. **Ursprung = Lava-Oberfläche** (Blasenmitte bzw. Tropfen-Unterkante).
//   opts  { size (Ø, 1), color: 'rot' | 'blau' }
//   state { anim: 'idle'|'swell'|'pop'|'jump'|'fall'|'hidden', grow (0..1 bei swell), progress? (pop 0,5 s) }
//         idle: halbe Blase blubbert auf der Lava; swell: wächst mit grow zur großen Kuppel, glüht heller; pop: platzt mit
//         Spritzern und Glutring (danach weg); jump/fall: runder Lavatropfen mit Schweif nach unten bzw. oben (der Motor
//         bewegt root, Ursprung = Unterkante des Tropfens).  Für springende Lava-Feuerbälle mit Gesicht gibt es 'lavafunke'
//         (rot) und 'glutball' (blau).  Viele → createInstanced('lavablase').
// pfeilplattform   Pfeilplattform: Steinplatte mit Goldkante, orangefarbener Deckplatte und großem weißem Pfeil (zeigt nach +X bzw.
//   opts.dir); taucht aus der Lava auf oder fährt aus der Wand. **Ursprung = Mitte der Oberseite in ausgefahrener Stellung.**
//   opts  { size: [w (X), d (Z)] ([2, 2]), thick (0,5), from: 'lava' (Standard: bewegt sich in Y) | 'wand' (fährt entlang +X
//           aus einer Wand bei −X), depth (Absenkweg, Standard thick + 0,4 bzw. w bei 'wand'), dir (rad um Y, Pfeilrichtung,
//           Standard 0), color: 'rot' | 'blau' (Lavatropfen) }
//   state { rise (0..1: 0 = versunken/eingefahren, 1 = oben/ausgefahren), warn (bool: zittert, Pfeil blinkt rot) }
// zylinder_walze   großer Laufzylinder: Steintrommel mit Goldringen, 12 Trittrippen und Endkappen mit Bolzen, dreht sich um X.
//   **Ursprung = Achsmitte**, Achse entlang X.  opts { length (6), radius (1,5), color: 'stein' (Standard) | 'blau' }
//   state { angle (rad um X, überschreibt), speed (rad/s, Standard 0) }
// stachelwalze_rot rotierende Stachelwalze: rote Trommel mit Goldbändern und Elfenbein-Stacheln auf einer Achse zwischen zwei
//   Eisenböcken. Achse entlang X. opts { length (4), radius (Trommel, 0,6), stand (true), height (Achshöhe mit Böcken, Standard
//   radius + 0,55) }.  **Ursprung = Mitte unten am Boden** (mit Böcken) bzw. Achsmitte (stand: false).
//   state { angle (rad um X, überschreibt), speed (rad/s, Standard 1,5) }  root.userData.reach → Radius mit Stacheln.
// pendelstachel    Pendelstachel: Deckenhalter, Kette und stachelige Eisenkugel (Ø size). **Ursprung = Drehpunkt oben**, hängt
//   nach −Y.  opts { length (Kettenlänge bis zur Kugelmitte, 3), size (1) }
//   state { angle (rad um Z, 0 = senkrecht, überschreibt), speed? (Tempo-Faktor ohne angle: pendelt ±0,9 rad, Periode 2,4 s / speed) }
//   model.ball(out?) → Weltposition der Kugelmitte; root.userData.ballRadius → Trefferradius.
// klappstampfer    Klappstampfer: schwere Steinplatte mit grimmigem Gesicht auf beiden Seiten, die über ein Scharnier am Boden
//   umklappt und auf die andere Seite schlägt. **Ursprung = Scharnier** (Achse entlang Z am Boden).
//   opts  { size: [w (X), d (Z)] ([3, 3]), thick (0,6) }
//   state { fold (0..1: 0 = liegt bei +X, 1 = liegt bei −X, dazwischen klappt sie über oben), warn (bool: bebt, Augen glühen) }
// lava_fontaene    Lava-Fontäne: Basalt-Krater mit glühendem Becken, aus dem eine Lavasäule mit Spritzkrone schießt.
//   **Ursprung = Kratermitte am Boden.**  opts { radius (Becken, 0,6), color: 'rot' | 'blau' }
//   state { height (m Säulenhöhe, 0 = aus), warn (bool: Becken brodelt, kleine Spritzer) }
// gitterboden      Gitterboden-Kachel: Eisenrahmen mit Längs- und Querstäben, Goldnieten. **Ursprung = Mitte der Unterseite**,
//   Oberseite y = thick.  opts { size: [w (X), d (Z)] ([2, 2]), thick (0,15) }  state –
//   Viele 1-m-Kacheln → createInstanced('gitterboden').
// zerbrechliche_kiste  Holzkiste mit Rissen, Eisenecken und rotem Bruch-Blitz (Kante size). **Ursprung = Mitte der Unterseite.**
//   opts  { size (1) }  state { break (0..1: Bretter fliegen auseinander, ab 1 weg), anim: 'idle'|'hit', progress? (hit 0,3 s) }
//   Viele → createInstanced('zerbrechliche_kiste').
// zugbruecke       Zugbrücke: Bohlen mit Eisenbändern und Nieten, Goldkante, zwei Ketten zu Umlenkrollen über dem Tor; Steinsockel
//   mit Goldkappen am Scharnier. **Ursprung = Scharnier an der Oberkante** (Deck-Oberseite y = 0 bei lower 1).
//   opts  { length (X, 6), width (Z, 3), thick (0,3), chains (true), anchor (Höhe der Umlenkrollen über dem Scharnier, Standard
//           0,85 · length) }
//   state { lower (0..1: 0 = hochgezogen/senkrecht, 1 = unten/waagerecht nach +X) }
// giftnebel_wand   weiche Giftnebel-Front: wabernde lila Nebelschwaden (weiche Nebelkarten in drei Lagen) mit grünen Giftbläschen,
//   vorn eine hellere, rollende Wulst.
//   opts  { width (Z, 10), height (6), depth (3), facing: 'unten' (Standard: Nebel oberhalb y = 0, Front unten – sinkt von
//           oben) | 'vorn' (Nebel bei x < 0, Front bei x = 0 – rückt nach +X vor), color: 'lila' | 'gruen' }
//   **Ursprung = Mitte der Front (unten).**  state { density (0..1, Standard 1), anim: 'idle' }

import {
  THREE, TAU, Build, cached, vcol, basic, std, metal, mesh, joint, eyes, makeModel, Clock, Blinker, damp, clamp, mix, col,
  smoothstep, lerp, instMesh, setInst, glowSprite, sparkleSprite, placed, puffyStarGeo, roundedBox, SIDE,
} from '../lib/kit.js';
import {
  W7, LAVA7, lavaKey, FIRE7, glow7, glow7T, add7, prog, num, ZERO, gradV, ownMat, flameGeo, puffyGeo, stick, Puffs, hash1,
  noise3, displace, spikeCone, spikeV, axisY, fireballLoGeo, fireFlamesGeo, grateGeo, crateGeo, cratePanelGeo, CRATE, dropletGeo,
  lavaRingGeo, spikeBallGeo, spikeMat, fibDirs, mouthShape,
} from '../lib/w7Geos.js';
import { fogTexture } from '../lib/hwGeos.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const ironV = { v: (x, y, z, nx, ny) => mix(W7.ironLow, W7.ironHi, smoothstep(ny * 0.5 + nx * 0.2 + 0.35)) };
const stoneV = (lo = W7.rockLow, hi = W7.rockTop) => ({ v: (x, y, z, nx, ny) => mix(lo, hi, smoothstep(ny * 0.5 + 0.45 + (noise3(x * 3, y * 3, z * 3) - 0.5) * 0.4)) });

// =============================================================================================
// Feuerstab
// =============================================================================================
function stabBlockGeo() {
  return cached('w7:stab:block', () => {
    const b = new Build();
    b.box(1, 1, 1, ironV, { p: [0, 0.5, 0] }, 0.08, 2);
    b.box(1.04, 0.12, 1.04, gradV(W7.goldLow, W7.goldHi), { p: [0, 0.94, 0] }, 0.04, 1);
    b.box(1.04, 0.1, 1.04, gradV(W7.goldLow, W7.gold), { p: [0, 0.06, 0] }, 0.04, 1);
    // Nieten an den Seiten
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU;
      for (const [u, v] of [[-0.32, 0.25], [0.32, 0.25], [-0.32, 0.75], [0.32, 0.75]]) {
        const n = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), t = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
        const p = n.clone().multiplyScalar(0.51).addScaledVector(t, u); p.y = v;
        b.sphere(0.045, W7.goldHi, { p: p.toArray() }, 8, 5);
      }
      // Glutschlitz
      const n = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      b.box(0.36, 0.1, 0.02, { v: (x, y) => mix(0xff3a10, 0xffd23a, smoothstep(0.5 - Math.abs(y) * 8)) }, placed(n.clone().multiplyScalar(0.505).setY(0.5), n, new THREE.Vector3(1, 1, 1)).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)), 0, 1);
    }
    // Drehknauf oben
    b.sphere(0.16, gradV(W7.goldLow, W7.goldHi), { p: [0, 1.0, 0], s: [1, 0.6, 1] }, 14, 8);
    return b.geometry();
  });
}
function buildFeuerstab(opts = {}) {
  const key = lavaKey(opts.color);
  const C = FIRE7[key];
  const len = Math.max(0.5, num(opts.length, 3));
  const per = clamp(Math.round(num(opts.count, Math.round(len / 0.5))), 1, 16);
  const arms = clamp(Math.round(num(opts.arms, 1)), 1, 4);
  const vert = opts.plane === 'v';
  const N = per * arms;
  const root = new THREE.Group();
  const own = [];
  if (opts.block !== false) root.add(mesh(stabBlockGeo(), vcol(0.35, { metalness: 0.3 }, 'w7stab'), {}, true));
  const pivot = joint([0, 0.5, 0]);
  const R = len + 0.5;
  const cores = instMesh(fireballLoGeo(key), glow7(), N, R, 0);
  const flames = instMesh(fireFlamesGeo(key, 6, true), basic('w7:fkFlames', { color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false }), N, R, 0);
  const halos = instMesh(cached('w7:stab:halo', () => new THREE.IcosahedronGeometry(0.34, 1)), add7(`stabHalo:${key}`, C.glow, 0.35), N, R, 0);
  halos.renderOrder = 2;
  pivot.add(cores, flames, halos);
  root.add(pivot);
  root.userData.ballRadius = 0.25;
  const clk = new Clock();
  let angle = 0;
  const pos = (i, out) => {
    const arm = Math.floor(i / per), k = i % per;
    const r = len * (k + 1) / per;
    const a = angle + (arm / arms) * TAU;
    return vert ? out.set(Math.cos(a) * r, Math.sin(a) * r, 0) : out.set(Math.cos(a) * r, 0, -Math.sin(a) * r);
  };
  const update = (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    const t = clk.t;
    if (st.angle !== undefined) angle = num(st.angle, 0);
    else angle += dt * num(st.speed, 1.2);
    for (let i = 0; i < N; i++) {
      pos(i, _v);
      const fl = 1.25 * (1 + Math.sin(t * 25 + i * 1.3) * 0.08);
      _q.setFromEuler(_e.set(t * 4 + i, t * 6 + i * 2, t * 3));
      cores.setMatrixAt(i, _m.compose(_v, _q.identity(), _s.setScalar(fl)));
      _q.setFromEuler(_e.set(t * 4 + i, t * 6 + i * 2, t * 3));
      flames.setMatrixAt(i, _m.compose(_v, _q, _s.setScalar(1.25 * (0.95 + Math.sin(t * 17 + i) * 0.1))));
      halos.setMatrixAt(i, _m.compose(_v, _q.identity(), _s.setScalar(fl * 1.05)));
    }
    cores.instanceMatrix.needsUpdate = true; flames.instanceMatrix.needsUpdate = true; halos.instanceMatrix.needsUpdate = true;
  };
  const model = makeModel('feuerstab', root, update, [...own, cores, flames, halos], { initial: 'idle' });
  model.balls = N;
  model.ballPos = (i, out = new THREE.Vector3()) => { root.updateMatrixWorld(true); return pivot.localToWorld(pos(clamp(i | 0, 0, N - 1), out)); };
  return model;
}

// =============================================================================================
// Lavablase
// =============================================================================================
function blobGeo(key) {
  const L = LAVA7[key];
  return cached(`w7:blob:${key}`, () => new Build().sphere(0.5, { v: (x, y, z, nx, ny) => mix(mix(L.deep, L.hot, smoothstep(ny * 0.6 + 0.5)), L.white, smoothstep((nx * 0.4 + ny * 0.7 - 0.55) / 0.4)) }, {}, 28, 18).geometry());
}
const blobShineGeo = () => cached('w7:blob:shine', () => new Build().sphere(1, 0xffffff, { p: [0.12, 0.36, -0.17], s: [0.12, 0.07, 0.08], r: [0.3, 0.6, 0] }, 12, 8).sphere(1, 0xffffff, { p: [0.24, 0.27, -0.12], s: [0.04, 0.03, 0.03] }, 8, 6).geometry());
function blobTailGeo(key) {
  const L = LAVA7[key];
  return cached(`w7:blob:tail:${key}`, () => new Build().lathe([[0.42, 0], [0.38, 0.2], [0.28, 0.45], [0.16, 0.7], [0.06, 0.92], [0, 1]], { v: (x, y) => mix(L.hotter, L.deep, smoothstep(y)) }, null, 14).geometry());
}
function buildLavablase(opts = {}) {
  const key = lavaKey(opts.color);
  const L = LAVA7[key];
  const size = Math.max(0.2, num(opts.size, 1));
  const root = new THREE.Group();
  const own = [];
  const blobMat = ownMat(glow7());
  const ringMat = ownMat(glow7T(0.9));
  own.push(blobMat, ringMat);
  const sc = joint(); sc.scale.setScalar(size);
  const blobJ = joint();
  const blob = mesh(blobGeo(key), blobMat);
  const shine = mesh(blobShineGeo(), vcol(0.08, {}, 'w7shine'));
  const tail = mesh(blobTailGeo(key), glow7T(0.75));
  blobJ.add(blob, shine, tail);
  const ring = mesh(lavaRingGeo(key), ringMat);
  const drops = instMesh(dropletGeo(key), glow7(), 10, 3, 0.5);
  drops.visible = false;
  const halo = glowSprite(L.glow, 1.6, 0.5);
  sc.add(blobJ, ring, drops, halo);
  root.add(sc);
  const clk = new Clock();
  const D = Array.from({ length: 10 }, (_, i) => ({ a: (i / 10) * TAU + hash1(i) * 0.5, v: 1.6 + hash1(i + 7) * 1.4, up: 2.2 + hash1(i + 3) * 1.8, s: 0.05 + hash1(i + 11) * 0.05 }));
  const update = (dt, st) => {
    let anim = st.anim ?? 'idle';
    if (!['idle', 'swell', 'pop', 'jump', 'fall', 'hidden'].includes(anim)) anim = 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    const drop = anim === 'jump' || anim === 'fall';
    let bs = 0.6, by = -0.12, sy = 1, popK = -1, show = anim !== 'hidden';
    if (anim === 'idle') { const k = (Math.sin(t * 2.6) + 1) / 2; bs = 0.42 + k * 0.12; sy = 0.85 + k * 0.1; by = -0.14; }
    else if (anim === 'swell') { const g = clamp(num(st.grow, smoothstep(clk.age / 1.2)), 0, 1); bs = lerp(0.45, 1.0, g); sy = 0.85 + Math.sin(t * 9) * 0.03 * g; by = lerp(-0.14, -0.05, g); }
    else if (anim === 'pop') { popK = prog(st, clk, 0.5); bs = 1.05 * (1 - smoothstep(popK * 4)); by = -0.05; }
    else if (drop) { bs = 0.62; by = 0.31; sy = 1.05; }
    blobJ.position.y = by;
    blobJ.scale.set(bs * (2 - sy) * (drop ? 0.95 : 1), Math.max(0.001, bs * sy), bs * (2 - sy));
    blobJ.visible = show && bs > 0.01;
    tail.visible = drop;
    if (drop) { tail.position.y = anim === 'jump' ? -0.15 : 0.15; tail.rotation.x = anim === 'jump' ? Math.PI : 0; tail.scale.set(0.95 + Math.sin(t * 20) * 0.05, 1.2 + Math.sin(t * 13) * 0.15, 0.95); }
    ring.visible = show && !drop;
    ring.scale.setScalar((popK >= 0 ? 0.6 + popK * 1.4 : bs * 0.95) + Math.sin(t * 4) * 0.03);
    ringMat.opacity = popK >= 0 ? 0.9 * (1 - popK) : 0.75;
    blobMat.color.setScalar(anim === 'swell' ? 1 + Math.sin(t * 12) * 0.1 : 1);
    // Spritzer beim Platzen
    drops.visible = popK >= 0 && popK < 1;
    if (drops.visible) {
      for (let i = 0; i < 10; i++) {
        const d = D[i], k = popK * 0.5;
        setInst(drops, i, Math.cos(d.a) * d.v * k, d.up * k - 4.9 * k * k + 0.1, Math.sin(d.a) * d.v * k, 0, 0, 0, d.s * (1 - popK * 0.6) * 1.4);
      }
      drops.instanceMatrix.needsUpdate = true;
    }
    halo.visible = show && (popK < 0 || popK < 0.6);
    halo.position.y = drop ? 0.3 : 0.1;
    halo.scale.setScalar((drop ? 1.2 : 1.0 + bs * 0.8) + Math.sin(t * 5) * 0.06);
  };
  return makeModel('lavablase', root, update, [...own, drops], { initial: 'idle' });
}

// =============================================================================================
// Pfeilplattform
// =============================================================================================
function pfeilSlabGeo(w, d, th) {
  return cached(`w7:pfeil:slab:${w}:${d}:${th}`, () => {
    const b = new Build();
    b.box(w, th, d, stoneV(W7.rockLow, W7.rockHi), { p: [0, -th / 2, 0] }, 0.08, 2);
    b.box(w - 0.12, 0.08, d - 0.12, { v: (x, y, z, nx, ny) => (ny > 0.5 ? mix(0xff7a1a, 0xffa43a, (noise3(x * 2, 0, z * 2) - 0.3) * 0.5) : col(0xc8500a)) }, { p: [0, 0.0, 0] }, 0.03, 1);
    // Goldkante oben
    for (const s of [1, -1]) {
      b.box(w + 0.02, 0.06, 0.08, gradV(W7.goldLow, W7.goldHi), { p: [0, 0.01, s * (d / 2 - 0.02)] }, 0.02, 1);
      b.box(0.08, 0.06, d, gradV(W7.goldLow, W7.goldHi), { p: [s * (w / 2 - 0.02), 0.01, 0] }, 0.02, 1);
    }
    for (const sx of [1, -1]) for (const sz of [1, -1]) b.sphere(0.06, W7.goldHi, { p: [sx * (w / 2 - 0.05), 0.04, sz * (d / 2 - 0.05)], s: [1, 0.6, 1] }, 8, 5);
    return b.geometry();
  });
}
const pfeilArrowGeo = () => cached('w7:pfeil:arrow', () => {
  const sh = new THREE.Shape([[0.5, 0], [0.02, 0.42], [0.02, 0.16], [-0.46, 0.16], [-0.46, -0.16], [0.02, -0.16], [0.02, -0.42]].map(([x, y]) => new THREE.Vector2(x, y)));
  return new Build().add(puffyGeo(sh, 0.04, 0.03, 2, 2), 0xffffff, { r: [-Math.PI / 2, 0, 0] }).geometry();
});
function buildPfeilplattform(opts = {}) {
  const sz = Array.isArray(opts.size) ? opts.size : [2, 2];
  const w = Math.max(0.6, num(sz[0], 2)), d = Math.max(0.6, num(sz[1], 2)), th = Math.max(0.15, num(opts.thick, 0.5));
  const wall = opts.from === 'wand';
  const depth = Math.max(0.1, num(opts.depth, wall ? w : th + 0.4));
  const key = lavaKey(opts.color);
  const L = LAVA7[key];
  const root = new THREE.Group();
  const own = [];
  const move = joint();
  const slabMat = ownMat(vcol(0.55, {}, 'w7pfeil'), { emissive: 0x000000 });
  const arrowMat = ownMat(vcol(0.3, {}, 'w7arrow'), { emissive: 0x000000 });
  own.push(slabMat, arrowMat);
  const slab = mesh(pfeilSlabGeo(w, d, th), slabMat, {}, true);
  slab.receiveShadow = true;
  const k = Math.min(w, d) / 1.2;
  const arrow = mesh(pfeilArrowGeo(), arrowMat, { p: [0, 0.07, 0], r: [0, num(opts.dir, 0), 0], s: [k, 1, k] });
  move.add(slab, arrow);
  const drips = instMesh(cached(`w7:pfeil:drip:${key}`, () => new Build().capsule(0.05, 0.16, { v: (x, y) => mix(L.white, L.hot, smoothstep(-y * 4 + 0.3)) }, {}, 3, 6).geometry()), glow7(), 8, Math.max(w, d) + 1, -0.5);
  move.add(drips);
  const halo = glowSprite(L.glow, Math.max(w, d) * 1.4, 0.0);
  halo.material = halo.material.clone(); own.push(halo.material);
  root.add(move, halo);
  const DR = Array.from({ length: 8 }, (_, i) => { const side = i % 4; const u = (hash1(i * 3) - 0.5) * 0.8; return side === 0 ? [w / 2 + 0.03, u * d] : side === 1 ? [-w / 2 - 0.03, u * d] : side === 2 ? [u * w, d / 2 + 0.03] : [u * w, -d / 2 - 0.03]; });
  const clk = new Clock();
  let rise = 1, prev = 1, wet = 0;
  const update = (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    const t = clk.t;
    const target = clamp(num(st.rise, 1), 0, 1);
    rise = target;
    const vel = (rise - prev) / Math.max(dt, 1e-3);
    prev = rise;
    const warn = !!st.warn;
    const off = (1 - rise) * depth;
    const shake = warn ? Math.sin(t * 50) * 0.025 : 0;
    if (wall) move.position.set(-off + shake, 0, 0); else move.position.set(shake, -off, Math.cos(t * 43) * (warn ? 0.02 : 0));
    // nass von Lava, solange sie gerade aufgetaucht ist
    wet = damp(wet, !wall && rise < 0.98 ? 1 : 0, 2, dt);
    drips.visible = wet > 0.05 && !wall;
    if (drips.visible) {
      for (let i = 0; i < 8; i++) {
        const [x, z] = DR[i];
        const ph = (t * 1.3 + hash1(i)) % 1;
        setInst(drips, i, x, -0.1 - ph * th * 1.4, z, 0, 0, 0, wet * (1 - ph * 0.5));
      }
      drips.instanceMatrix.needsUpdate = true;
    }
    const blink = warn && Math.sin(t * 16) > 0;
    arrowMat.emissive.setRGB(blink ? 0.9 : 0.12, blink ? 0.08 : 0.1, blink ? 0.05 : 0.08);
    arrowMat.color.setRGB(1, blink ? 0.35 : 1, blink ? 0.3 : 1);
    slabMat.emissive.setRGB((1 - rise) * 0.25, (1 - rise) * 0.06, 0);
    halo.material.opacity = wall ? 0 : clamp((1 - rise) * 1.2 + (Math.abs(vel) > 0.05 ? 0.3 : 0), 0, 0.7);
    halo.position.y = 0.05;
  };
  return makeModel('pfeilplattform', root, update, [...own, drips], { initial: 'idle' });
}

// =============================================================================================
// Zylinder-Walze
// =============================================================================================
function zylGeo(L, R, color) {
  return cached(`w7:zyl:${L}:${R}:${color}`, () => {
    const b = new Build();
    const blue = color === 'blau';
    const base = blue ? [0x1a3a8a, 0x5a8ae8] : [W7.rockLow, W7.ash];
    const g = new THREE.CylinderGeometry(R, R, L, 36, Math.max(2, Math.round(L * 2)), true);
    g.rotateZ(Math.PI / 2);
    b.add(g, (x, y, z, nx, ny) => {
      const band = Math.floor((x / L + 0.5) * 6) % 2;
      return mix(mix(base[0], base[1], 0.45 + (noise3(x * 2, y * 2, z * 2) - 0.5) * 0.4), base[1], band * 0.15);
    });
    // Trittrippen
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      b.box(L - 0.5, 0.14, 0.22, gradV(base[0], base[1]), { p: [0, Math.cos(a) * (R + 0.04), Math.sin(a) * (R + 0.04)], r: [a, 0, 0] }, 0.05, 1);
    }
    // Goldringe und Endkappen mit Bolzen
    for (const s of [1, -1]) {
      b.torus(R + 0.02, 0.1, gradV(W7.goldLow, W7.goldHi), { p: [s * (L / 2 - 0.12), 0, 0], r: [0, Math.PI / 2, 0] }, 8, 40);
      b.cyl(R - 0.02, R - 0.02, 0.1, ironV, { p: [s * (L / 2 - 0.02), 0, 0], r: [0, 0, Math.PI / 2] }, 32);
      b.cyl(R * 0.35, R * 0.35, 0.16, gradV(W7.goldLow, W7.goldHi), { p: [s * L / 2, 0, 0], r: [0, 0, Math.PI / 2] }, 18);
      for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; b.sphere(0.08, W7.goldHi, { p: [s * (L / 2 + 0.04), Math.cos(a) * R * 0.65, Math.sin(a) * R * 0.65] }, 8, 6); }
      // Pfeil-Markierung (Drehrichtung) als heller Streifen an der Stirnseite
      b.box(0.02, R * 0.5, 0.12, 0xfff0c8, { p: [s * (L / 2 + 0.035), R * 0.45, 0] }, 0, 1);
    }
    return b.geometry();
  });
}
function buildZylinder(opts = {}) {
  const L = Math.max(1, num(opts.length, 6)), R = Math.max(0.3, num(opts.radius, 1.5));
  const color = opts.color === 'blau' ? 'blau' : 'stein';
  const root = new THREE.Group();
  const drum = joint([0, 0, 0], mesh(zylGeo(L, R, color), vcol(0.55, {}, 'w7zyl'), {}, true));
  drum.children[0].receiveShadow = true;
  const axle = mesh(cached(`w7:zyl:axle:${L}`, () => new Build().cyl(0.18, 0.18, L + 0.9, 12, ironV, { r: [0, 0, Math.PI / 2] }).geometry()), vcol(0.4, { metalness: 0.3 }, 'w7iron'), {}, true);
  root.add(axle, drum);
  const clk = new Clock();
  let angle = 0;
  const update = (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    if (st.angle !== undefined) angle = num(st.angle, 0); else angle += dt * num(st.speed, 0);
    drum.rotation.x = angle;
  };
  return makeModel('zylinder_walze', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Rote Stachelwalze
// =============================================================================================
const SW = { red: 0xd8101e, redHi: 0xff4a3a, redLow: 0x6a0610 };
function stachelDrumGeo(L, R) {
  return cached(`w7:sw:drum:${L}:${R}`, () => {
    const b = new Build();
    const g = new THREE.CylinderGeometry(R, R, L, 28, 1, false);
    g.rotateZ(Math.PI / 2);
    b.add(g, { v: (x, y, z, nx, ny) => (Math.abs(nx) > 0.5 ? col(W7.gold) : mix(SW.redLow, mix(SW.red, SW.redHi, smoothstep(ny - 0.2)), smoothstep(ny * 0.6 + 0.6))) });
    for (const x of [-L / 2 + 0.1, 0, L / 2 - 0.1]) b.torus(R + 0.01, 0.06, gradV(W7.goldLow, W7.goldHi), { p: [x, 0, 0], r: [0, Math.PI / 2, 0] }, 6, 32);
    const rows = Math.max(2, Math.round((L - 0.3) / 0.45));
    const around = Math.max(6, Math.round(R * 13));
    for (let i = 0; i < rows; i++) {
      const x = -L / 2 + 0.3 + (i + 0.5) * (L - 0.6) / rows;
      for (let k = 0; k < around; k++) {
        const a = (k / around) * TAU + (i % 2) * Math.PI / around;
        const n = new THREE.Vector3(0, Math.cos(a), Math.sin(a));
        b.add(spikeCone(0.1, 0.38, 7), spikeV(0.38, 0xe8dcc0, 0xffffff), placed(new THREE.Vector3(x, n.y * R * 0.96, n.z * R * 0.96), n, new THREE.Vector3(1, 1, 1)));
      }
    }
    return b.geometry();
  });
}
function standGeo(L, H) {
  return cached(`w7:sw:stand:${L}:${H}`, () => {
    const b = new Build();
    for (const s of [1, -1]) {
      const x = s * (L / 2 + 0.25);
      for (const z of [-1, 1]) {
        const foot = new THREE.Vector3(x, 0.06, z * H * 0.34), top = new THREE.Vector3(x, H, 0);
        const len = foot.distanceTo(top);
        b.add(new THREE.BoxGeometry(0.16, len, 0.16), ironV, axisY(foot.clone().add(top).multiplyScalar(0.5).toArray(), top.clone().sub(foot).toArray()));
      }
      b.box(0.3, 0.12, H * 0.9, ironV, { p: [x, 0.06, 0] }, 0.04, 1);
      b.cyl(0.2, 0.2, 0.26, gradV(W7.goldLow, W7.goldHi), { p: [x, H, 0], r: [0, 0, Math.PI / 2] }, 16);
    }
    b.cyl(0.08, 0.08, L + 0.7, ironV, { p: [0, H, 0], r: [0, 0, Math.PI / 2] }, 10);
    return b.geometry();
  });
}
function buildStachelwalzeRot(opts = {}) {
  const L = Math.max(1, num(opts.length, 4)), R = Math.max(0.2, num(opts.radius, 0.6));
  const stand = opts.stand !== false;
  const H = stand ? Math.max(R + 0.4, num(opts.height, R + 0.55)) : 0;
  const root = new THREE.Group();
  const drum = joint([0, H, 0], mesh(stachelDrumGeo(L, R), vcol(0.32, {}, 'w7sw'), {}, true));
  root.add(drum);
  if (stand) root.add(mesh(standGeo(L, H), vcol(0.4, { metalness: 0.3 }, 'w7iron'), {}, true));
  root.userData.reach = R + 0.38;
  const clk = new Clock();
  let angle = 0;
  const update = (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    if (st.angle !== undefined) angle = num(st.angle, 0); else angle += dt * num(st.speed, 1.5);
    drum.rotation.x = angle;
  };
  return makeModel('stachelwalze_rot', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Pendelstachel
// =============================================================================================
const mountGeo = () => cached('w7:pendel:mount', () => {
  const b = new Build();
  b.box(0.7, 0.14, 0.7, ironV, { p: [0, 0.12, 0] }, 0.04, 1);
  for (const sx of [1, -1]) for (const sz of [1, -1]) b.sphere(0.04, W7.goldHi, { p: [sx * 0.26, 0.05, sz * 0.26] }, 6, 4);
  for (const s of [1, -1]) b.box(0.08, 0.26, 0.12, ironV, { p: [0, -0.06, s * 0.13] }, 0.02, 1);
  b.cyl(0.07, 0.07, 0.4, gradV(W7.goldLow, W7.goldHi), { r: [Math.PI / 2, 0, 0] }, 12);
  return b.geometry();
});
function chainGeo(L) {
  return cached(`w7:pendel:chain:${L}`, () => {
    const b = new Build();
    const n = Math.max(2, Math.round(L / 0.17));
    for (let i = 0; i < n; i++) {
      const g = new THREE.TorusGeometry(0.075, 0.022, 6, 12);
      g.scale(0.75, 1.3, 1);
      b.add(g, ironV, { p: [0, -0.1 - i * (L - 0.2) / n, 0], r: [0, i % 2 ? Math.PI / 2 : 0, 0] });
    }
    return b.geometry();
  });
}
function buildPendelstachel(opts = {}) {
  const L = Math.max(0.5, num(opts.length, 3)), size = Math.max(0.3, num(opts.size, 1));
  const root = new THREE.Group();
  const mount = mesh(mountGeo(), vcol(0.4, { metalness: 0.3 }, 'w7iron'), {}, true);
  const swing = joint();
  const chain = mesh(chainGeo(L - size * 0.3), vcol(0.4, { metalness: 0.3 }, 'w7iron'), {}, true);
  const ball = mesh(spikeBallGeo('eisen'), spikeMat(), { p: [0, -L, 0], s: size }, true);
  swing.add(chain, ball);
  root.add(mount, swing);
  root.userData.ballRadius = size * 0.5;
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    const a = st.angle !== undefined ? num(st.angle, 0) : Math.sin(clk.t * TAU / 2.4 * num(st.speed, 1)) * 0.9;
    swing.rotation.z = a;
    ball.rotation.y = clk.t * 0.5;
  };
  const model = makeModel('pendelstachel', root, update, [], { initial: 'idle' });
  model.ball = (out = new THREE.Vector3()) => { root.updateMatrixWorld(true); return ball.getWorldPosition(out); };
  return model;
}

// =============================================================================================
// Klappstampfer
// =============================================================================================
function klappSlabGeo(w, d, t) {
  return cached(`w7:klapp:${w}:${d}:${t}`, () => {
    const b = new Build();
    const stone = (x, y, z, nx, ny) => {
      const u = x / 0.75, v = z / 0.5 + (Math.floor(x / 0.75) % 2 ? 0.5 : 0);
      const edge = (Math.abs(u - Math.round(u)) < 0.04 || Math.abs(v - Math.round(v)) < 0.06) && Math.abs(ny) > 0.7;
      return edge ? col(0x2a2232) : mix(0x6a5a78, 0xa898b4, smoothstep(0.4 + (noise3(x * 2, y * 2, z * 2) - 0.5) * 0.6 + Math.abs(ny) * 0.2));
    };
    b.add(roundedBox(w, t, d, 0.12, SIDE.ALL, 0, 2), stone, { p: [w / 2, 0, 0] });
    // Goldbeschläge an den Ecken (beide Seiten)
    for (const sy of [1, -1]) for (const sz of [1, -1]) {
      b.box(0.36, 0.04, 0.36, gradV(W7.goldLow, W7.goldHi), { p: [w - 0.2, sy * (t / 2 + 0.01), sz * (d / 2 - 0.2)] }, 0.02, 1);
      b.sphere(0.05, W7.goldHi, { p: [w - 0.2, sy * (t / 2 + 0.03), sz * (d / 2 - 0.2)] }, 6, 4);
    }
    // Gesichter: Brauen und Zahnreihe auf beiden großen Seiten (Augen separat)
    for (const sy of [1, -1]) {
      const y = sy * (t / 2 + 0.005);
      for (const s of [1, -1]) b.box(0.5, 0.06, 0.16, 0x2a2232, { p: [w * 0.62, y, s * d * 0.2], r: [0, s * 0.35 * sy, 0] }, 0.03, 1);
      b.box(0.24, 0.05, d * 0.5, W7.mouth, { p: [w * 0.3, y, 0] }, 0.03, 1);
      for (let k = 0; k < 5; k++) b.box(0.1, 0.06, 0.1, 0xfff6e8, { p: [w * 0.3 + 0.06, y + sy * 0.005, -d * 0.2 + k * d * 0.1] }, 0.02, 1);
    }
    return b.geometry();
  });
}
const klappHingeGeo = (d) => cached(`w7:klapp:hinge:${d}`, () => {
  const b = new Build();
  for (const z of [-d / 2 + 0.3, 0, d / 2 - 0.3]) {
    b.cyl(0.16, 0.16, 0.36, gradV(W7.goldLow, W7.goldHi), { p: [0, 0.3, z], r: [Math.PI / 2, 0, 0] }, 14);
    b.box(0.5, 0.12, 0.4, ironV, { p: [0, 0.06, z] }, 0.03, 1);
  }
  b.cyl(0.06, 0.06, d, ironV, { p: [0, 0.3, 0], r: [Math.PI / 2, 0, 0] }, 8);
  return b.geometry();
});
function buildKlappstampfer(opts = {}) {
  const sz = Array.isArray(opts.size) ? opts.size : [3, 3];
  const w = Math.max(1, num(sz[0], 3)), d = Math.max(1, num(sz[1], 3)), t = Math.max(0.2, num(opts.thick, 0.6));
  const root = new THREE.Group();
  const own = [];
  const flash = ownMat(vcol(0.62, {}, 'w7klapp'), { emissive: 0x000000 });
  own.push(flash);
  const hinge = mesh(klappHingeGeo(d), vcol(0.4, { metalness: 0.3 }, 'w7iron'), {}, true);
  const flip = joint([0, t / 2, 0]);
  const slab = mesh(klappSlabGeo(w, d, t), flash, {}, true);
  const er = Math.min(w, d) * 0.1;
  const eyeA = eyes([1, -1].map((s) => ({ p: [w * 0.55, t / 2 + 0.01, s * d * 0.2], r: er, sy: 1, dir: [0, 1, 0] })), { key: `w7:klapp:a:${w}:${d}:${t}`, iris: 0xff5a1a, pupil: 0.5, depth: 0.45 });
  const eyeB = eyes([1, -1].map((s) => ({ p: [w * 0.55, -t / 2 - 0.01, s * d * 0.2], r: er, sy: 1, dir: [0, -1, 0] })), { key: `w7:klapp:b:${w}:${d}:${t}`, iris: 0xff5a1a, pupil: 0.5, depth: 0.45 });
  flip.add(slab, eyeA, eyeB);
  const dust = new Puffs(12, 0xd8ccd8, { opacity: 0.85, radius: w * 2.5, cy: 0.3 });
  own.push(dust);
  root.add(hinge, flip, dust.mesh);
  const clk = new Clock(), blink = new Blinker();
  let prev = 0, emit = 0;
  const update = (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    const tt = clk.t;
    const fold = clamp(num(st.fold, 0), 0, 1);
    const warn = !!st.warn;
    flip.rotation.z = fold * Math.PI;
    flip.position.set(warn ? Math.sin(tt * 47) * 0.02 : 0, t / 2 + (warn ? Math.abs(Math.sin(tt * 31)) * 0.02 : 0), 0);
    // Aufschlag: Staub
    emit -= dt;
    const landed = (fold <= 0.001 && prev > 0.05) || (fold >= 0.999 && prev < 0.95);
    if (landed && emit <= 0) { const x = fold > 0.5 ? -w * 0.5 : w * 0.5; dust.burst([x, 0.1, 0], { count: 12, speed: 3, up: 0.6, size: 0.35, life: 0.7, spread: w * 0.4 }); emit = 0.3; }
    if (warn && emit <= 0) { dust.burst([fold > 0.5 ? -w * 0.9 : w * 0.9, 0.05, (Math.random() - 0.5) * d], { count: 1, speed: 0.4, up: 0.5, size: 0.12, life: 0.5, spread: 0.1 }); emit = 0.1; }
    prev = fold;
    dust.step(dt);
    flash.emissive.setRGB(warn ? 0.18 + Math.sin(tt * 16) * 0.08 : 0, 0, 0);
    let bk = blink.update(dt);
    if (warn) bk = 0.8;
    eyeA.userData.blink(bk); eyeB.userData.blink(bk);
    eyeA.scale.setScalar(warn ? 1.1 : 1); eyeB.scale.setScalar(warn ? 1.1 : 1);
  };
  return makeModel('klappstampfer', root, update, own, { initial: 'idle' });
}

// =============================================================================================
// Lava-Fontäne
// =============================================================================================
function ventGeo(R) {
  return cached(`w7:vent:${R}`, () => {
    const b = new Build();
    const g = new THREE.TorusGeometry(R + 0.22, 0.28, 10, 24);
    g.rotateX(Math.PI / 2); g.scale(1, 0.75, 1);
    b.add(displace(g, 0.06, 3, R * 7, true), { v: (x, y, z, nx, ny) => mix(W7.rockLow, W7.rockHi, smoothstep(ny * 0.5 + 0.5)) }, { p: [0, 0.2, 0] });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.3, r = 0.22 + hash1(i) * 0.1;
      b.add(displace(new THREE.IcosahedronGeometry(r, 1), 0.04, 3, i, true), { v: (x, y, z, nx, ny) => mix(W7.rockLow, W7.rockHi, smoothstep(ny * 0.5 + 0.5)) }, { p: [Math.cos(a) * (R + 0.55), r * 0.95, Math.sin(a) * (R + 0.55)] });
    }
    return b.geometry();
  });
}
function poolGeo(R, key) {
  const L = LAVA7[key];
  return cached(`w7:pool:${R}:${key}`, () => new Build().cyl(R + 0.1, R + 0.1, 0.06, { v: (x, y, z) => mix(L.white, L.deep, smoothstep(Math.hypot(x, z) / (R + 0.1))) }, { p: [0, 0.24, 0] }, 24).geometry());
}
function columnGeo(key) {
  const L = LAVA7[key];
  return cached(`w7:column:${key}`, () => {
    const b = new Build();
    const g = new THREE.LatheGeometry([[0.0, 0], [0.42, 0], [0.36, 0.2], [0.3, 0.5], [0.33, 0.8], [0.4, 0.92], [0.28, 1.0], [0, 1.02]].map(([r, y]) => new THREE.Vector2(r, y)), 18, 1);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), a = Math.atan2(z, x); const w = 1 + Math.sin(a * 5 + y * 9) * 0.08; P.setX(i, x * w); P.setZ(i, z * w); }
    g.computeVertexNormals();
    b.add(g, { v: (x, y, z, nx) => mix(mix(L.white, L.hotter, smoothstep(y * 1.5)), L.hot, smoothstep(Math.abs(nx) * 0.6 + y * 0.6 - 0.3)) });
    return b.geometry();
  });
}
function buildFontaene(opts = {}) {
  const key = lavaKey(opts.color);
  const L = LAVA7[key];
  const R = Math.max(0.2, num(opts.radius, 0.6));
  const root = new THREE.Group();
  const own = [];
  const poolMat = ownMat(glow7());
  own.push(poolMat);
  const vent = mesh(ventGeo(R), vcol(0.8, {}, 'w7vent'), {}, true);
  const pool = mesh(poolGeo(R, key), poolMat);
  const col = joint([0, 0.22, 0], mesh(columnGeo(key), glow7()));
  const crown = instMesh(dropletGeo(key), glow7(), 14, 6, 3);
  const halo = glowSprite(L.glow, 2, 0.6);
  halo.material = halo.material.clone(); own.push(halo.material);
  root.add(vent, pool, col, crown, halo);
  const clk = new Clock();
  let h = 0;
  const CR = Array.from({ length: 14 }, (_, i) => ({ a: (i / 14) * TAU + hash1(i) * 0.4, sp: 0.5 + hash1(i + 4) * 0.6, ph: hash1(i + 9), s: 0.07 + hash1(i + 2) * 0.07 }));
  const update = (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    const t = clk.t;
    const target = Math.max(0, num(st.height, 0));
    h = damp(h, target, 10, dt);
    const warn = !!st.warn;
    const hh = h > 0.05 ? h : warn ? 0.18 + Math.abs(Math.sin(t * 9)) * 0.25 : 0;
    col.visible = hh > 0.04;
    const wob = 1 + Math.sin(t * 14) * 0.05;
    col.scale.set(R * 1.6 * wob, Math.max(0.01, hh), R * 1.6 * wob);
    col.rotation.y = t * 2;
    poolMat.color.setScalar(warn || h > 0.05 ? 1.0 : 0.8 + Math.sin(t * 2) * 0.05);
    // Spritzkrone oben
    crown.visible = hh > 0.1;
    if (crown.visible) {
      for (let i = 0; i < 14; i++) {
        const c = CR[i], k = (t * c.sp + c.ph) % 1;
        const r = R * (0.4 + k * 1.6);
        setInst(crown, i, Math.cos(c.a) * r, 0.15 + hh + Math.sin(k * Math.PI) * 0.6 * Math.min(1, hh) - k * k * 0.8, Math.sin(c.a) * r, 0, 0, 0, c.s * (1 - k * 0.5) * (h > 0.05 ? 1 : 0.5));
      }
      crown.instanceMatrix.needsUpdate = true;
    }
    halo.position.y = 0.3 + hh * 0.6;
    halo.scale.setScalar(1.6 + hh * 0.5);
    halo.material.opacity = 0.35 + (h > 0.05 ? 0.3 : warn ? 0.2 * (0.5 + Math.sin(t * 12) * 0.5) : 0);
  };
  return makeModel('lava_fontaene', root, update, [...own, crown], { initial: 'idle' });
}

// =============================================================================================
// Gitterboden
// =============================================================================================
function buildGitter(opts = {}) {
  const sz = Array.isArray(opts.size) ? opts.size : [2, 2];
  const w = Math.max(0.3, num(sz[0], 2)), d = Math.max(0.3, num(sz[1], 2)), t = Math.max(0.05, num(opts.thick, 0.15));
  const root = new THREE.Group();
  const g = mesh(grateGeo(w, d, t), vcol(0.38, { metalness: 0.4 }, 'w7grate'), {}, true);
  g.receiveShadow = true;
  root.add(g);
  return makeModel('gitterboden', root, () => {}, [], { initial: 'idle' });
}

// =============================================================================================
// Zerbrechliche Kiste
// =============================================================================================
const PANELS = [[[0, 0.5, 0.5], [0, 0, 0], [0, 0, 1]], [[0, 0.5, -0.5], [0, Math.PI, 0], [0, 0, -1]], [[0.5, 0.5, 0], [0, Math.PI / 2, 0], [1, 0, 0]], [[-0.5, 0.5, 0], [0, -Math.PI / 2, 0], [-1, 0, 0]], [[0, 1, 0], [-Math.PI / 2, 0, 0], [0, 1, 0]], [[0, 0, 0], [Math.PI / 2, 0, 0], [0, -0.2, 0]]];
function buildKiste(opts = {}) {
  const s = Math.max(0.3, num(opts.size, 1));
  const root = new THREE.Group();
  const own = [];
  const flash = ownMat(vcol(0.62, {}, 'w7crate'), { emissive: 0x000000 });
  own.push(flash);
  const wob = joint([0, 0, 0]);
  const crate = mesh(crateGeo(1, false), flash, {}, true);
  wob.add(crate);
  wob.scale.setScalar(s);
  const panels = instMesh(cratePanelGeo(1), flash, 6, 3 * s, 0.5 * s);
  panels.castShadow = true;
  panels.visible = false;
  const splinters = new Puffs(10, CRATE.woodHi, { opacity: 1, radius: 3 * s, cy: 0.5 * s, detail: 0 });
  splinters.gravity = 7;
  own.push(splinters);
  root.add(wob, panels, splinters.mesh);
  const clk = new Clock();
  let burst = false;
  const update = (dt, st) => {
    const anim = st.anim === 'hit' ? 'hit' : 'idle';
    clk.tick(dt, anim);
    const br = clamp(num(st.break, 0), 0, 1);
    if (br > 0) {
      wob.visible = false;
      if (!burst) { splinters.burst([0, 0.5 * s, 0], { count: 10, speed: 3.2 * s, up: 2.5, size: 0.07 * s, life: 0.9, spread: 0.4 * s, force: true }); burst = true; }
      const k = br, g = k * k * 1.6;
      panels.visible = br < 0.999;
      PANELS.forEach(([p, r, d], i) => {
        _e.set(r[0] + k * (i % 2 ? 2.4 : -2.0), r[1] + k * 1.2, r[2] + k * (i % 3) * 1.4);
        _q.setFromEuler(_e);
        _v.set(p[0] + d[0] * k * 1.6, p[1] + d[1] * k * 1.2 + k * 1.1 - g, p[2] + d[2] * k * 1.6).multiplyScalar(s);
        panels.setMatrixAt(i, _m.compose(_v, _q, _s.setScalar(s * Math.max(0.001, 1 - smoothstep((k - 0.55) / 0.45)))));
      });
      panels.instanceMatrix.needsUpdate = true;
    } else {
      wob.visible = true; panels.visible = false; burst = false;
      const p = anim === 'hit' ? prog(st, clk, 0.3) : 1;
      const w = anim === 'hit' ? Math.sin(p * Math.PI * 4) * 0.08 * (1 - p) : 0;
      wob.rotation.set(w, 0, w * 0.6);
      wob.scale.set(s * (1 + Math.abs(w) * 0.5), s * (1 - Math.abs(w) * 0.6), s * (1 + Math.abs(w) * 0.5));
      flash.emissive.setScalar(anim === 'hit' ? 0.25 * (1 - p) : 0);
    }
    splinters.step(dt);
  };
  return makeModel('zerbrechliche_kiste', root, update, [...own, panels], { initial: 'idle' });
}

// =============================================================================================
// Zugbrücke
// =============================================================================================
function deckGeo(L, W, T) {
  return cached(`w7:deck:${L}:${W}:${T}`, () => {
    const b = new Build();
    const n = Math.max(3, Math.round(L / 0.42));
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) * L / n;
      const tone = hash1(i * 3.7);
      b.box(L / n - 0.03, T, W, { v: (px, py, pz, nx, ny) => mix(W7.woodLow, mix(W7.wood, W7.woodHi, tone * 0.6), smoothstep(ny * 0.5 + 0.5)) }, { p: [x, -T / 2, 0] }, 0.03, 1);
    }
    // Eisenbänder mit Nieten (längs), Goldkante vorn, Unterzüge
    for (const z of [-W * 0.3, W * 0.3]) {
      b.box(L - 0.1, 0.03, 0.2, ironV, { p: [L / 2, 0.012, z] }, 0.01, 1);
      for (let k = 0; k < n; k++) b.sphere(0.035, W7.goldHi, { p: [(k + 0.5) * L / n, 0.035, z], s: [1, 0.6, 1] }, 6, 4);
    }
    b.box(0.14, T + 0.08, W + 0.08, gradV(W7.goldLow, W7.goldHi), { p: [L - 0.05, -T / 2, 0] }, 0.04, 1);
    for (const z of [-W / 2 + 0.2, W / 2 - 0.2]) b.box(L, 0.16, 0.16, W7.woodDark, { p: [L / 2, -T - 0.08, z] }, 0.03, 1);
    // Kettenösen an der Spitze
    for (const s of [1, -1]) b.torus(0.09, 0.03, ironV, { p: [L - 0.25, 0.08, s * (W / 2 - 0.12)], r: [0, 0, 0] }, 6, 12);
    // Scharnier-Walze
    b.cyl(0.13, 0.13, W + 0.1, ironV, { p: [0, -T / 2, 0], r: [Math.PI / 2, 0, 0] }, 12);
    return b.geometry();
  });
}
function bridgeBaseGeo(W, T, H) {
  return cached(`w7:bridgebase:${W}:${T}:${H}`, () => {
    const b = new Build();
    for (const s of [1, -1]) {
      b.box(0.6, 1.4, 0.5, stoneV(W7.rockLow, W7.rockHi), { p: [-0.25, -0.5, s * (W / 2 + 0.3)] }, 0.06, 1);
      b.box(0.66, 0.12, 0.56, gradV(W7.goldLow, W7.goldHi), { p: [-0.25, 0.26, s * (W / 2 + 0.3)] }, 0.03, 1);
      // Umlenkrolle oben (am Tor)
      b.cyl(0.18, 0.18, 0.12, ironV, { p: [-0.3, H, s * (W / 2 - 0.12)], r: [Math.PI / 2, 0, 0] }, 14);
      b.box(0.4, 0.1, 0.3, ironV, { p: [-0.45, H, s * (W / 2 - 0.12)] }, 0.03, 1);
    }
    return b.geometry();
  });
}
function buildZugbruecke(opts = {}) {
  const L = Math.max(1, num(opts.length, 6)), W = Math.max(0.6, num(opts.width, 3)), T = Math.max(0.1, num(opts.thick, 0.3));
  const chains = opts.chains !== false;
  const H = Math.max(1, num(opts.anchor, L * 0.85));
  const root = new THREE.Group();
  const base = mesh(bridgeBaseGeo(W, T, H), vcol(0.6, {}, 'w7stone'), {}, true);
  const deckJ = joint();
  const deck = mesh(deckGeo(L, W, T), vcol(0.6, {}, 'w7wood'), {}, true);
  deck.receiveShadow = true;
  deckJ.add(deck);
  const NL = chains ? 16 : 1;
  const links = instMesh(cached('w7:link', () => { const g = new THREE.TorusGeometry(0.075, 0.024, 6, 12); g.scale(0.75, 1.3, 1); return new Build().add(g, ironV).geometry(); }), vcol(0.4, { metalness: 0.3 }, 'w7iron'), NL * 2, L + H, H / 2);
  links.visible = chains;
  root.add(base, deckJ, links);
  const clk = new Clock();
  const tip = new THREE.Vector3(), anc = new THREE.Vector3(), dir = new THREE.Vector3(), q2 = new THREE.Quaternion();
  const QY90 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  const update = (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    const lower = clamp(num(st.lower, 1), 0, 1);
    const a = (1 - lower) * Math.PI / 2;
    deckJ.rotation.z = a;
    if (chains) {
      for (let c = 0; c < 2; c++) {
        const s = c ? -1 : 1;
        tip.set(Math.cos(a) * (L - 0.25) - Math.sin(a) * 0.08, Math.sin(a) * (L - 0.25) + Math.cos(a) * 0.08, s * (W / 2 - 0.12));
        anc.set(-0.3, H - 0.18, s * (W / 2 - 0.12));
        dir.subVectors(anc, tip);
        const len = dir.length(); dir.normalize();
        _q.setFromUnitVectors(_v2.set(0, 1, 0), dir);
        for (let i = 0; i < NL; i++) {
          const k = (i + 0.5) / NL;
          _v.copy(tip).addScaledVector(dir, len * k);
          q2.copy(_q); if (i % 2) q2.multiply(QY90);
          links.setMatrixAt(c * NL + i, _m.compose(_v, q2, _s.setScalar(Math.min(1.2, len / NL / 0.17))));
        }
      }
      links.instanceMatrix.needsUpdate = true;
    }
  };
  return makeModel('zugbruecke', root, update, [links], { initial: 'idle' });
}

// =============================================================================================
// Giftnebel-Wand
// =============================================================================================
const FOG = { lila: [0x8a3ad8, 0xc89aff, 0x9af04a, 0x5a1a9a], gruen: [0x3ab86a, 0xb0f08a, 0xd8a8ff, 0x1a6a3a] };
/** Nebelkarte (Fläche 1 × 1 in XY, weiche Alpha-Textur). */
const fogCardGeo = () => cached('w7:fog:card', () => new THREE.PlaneGeometry(1, 1));
function buildGiftnebel(opts = {}) {
  const W = Math.max(1, num(opts.width, 10)), H = Math.max(0.5, num(opts.height, 6)), D = Math.max(0.5, num(opts.depth, 3));
  const front = opts.facing === 'vorn' ? 'vorn' : 'unten';
  const C = FOG[opts.color === 'gruen' ? 'gruen' : 'lila'];
  const root = new THREE.Group();
  const own = [];
  const tex = fogTexture();
  const cardMat = new THREE.MeshBasicMaterial({ map: tex, color: C[0], transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide });
  const lipMat = new THREE.MeshBasicMaterial({ map: tex, color: C[1], transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide });
  const bubMat = new THREE.MeshStandardMaterial({ color: C[2], roughness: 0.25, emissive: new THREE.Color(C[2]).multiplyScalar(0.35), transparent: true, opacity: 0.9 });
  own.push(cardMat, lipMat, bubMat);
  const span = front === 'unten' ? H : D;
  const nCard = clamp(Math.round(W * span / 0.9), 12, 90), nLip = clamp(Math.round(W / 0.7), 6, 36), nBub = 14;
  const cards = instMesh(fogCardGeo(), cardMat, nCard, Math.max(W, H, D), H / 2);
  const lip = instMesh(fogCardGeo(), lipMat, nLip, Math.max(W, H, D), 0.5);
  const bub = instMesh(cached('w7:fog:bub', () => new THREE.IcosahedronGeometry(1, 1)), bubMat, nBub, Math.max(W, H, D), 1);
  cards.renderOrder = 4; lip.renderOrder = 5; bub.renderOrder = 6;
  root.add(cards, lip, bub);
  // Karten: drei Ausrichtungen (quer, längs, liegend), damit der Nebel aus jeder Richtung weich wirkt
  const F = Array.from({ length: nCard }, (_, i) => {
    const s = Math.min(2.2 + hash1(i * 4.1) * 1.8, Math.min(W, span) * 1.1);
    return { u: (hash1(i * 1.7) - 0.5) * Math.max(0, W - s * 0.7), v: s * 0.3 + hash1(i * 2.9) * Math.max(0, span - s * 0.65), h: hash1(i * 3.3), s, ax: i % 5 < 2 ? 0 : i % 5 < 4 ? 1 : 2, ph: hash1(i * 5.7) * TAU };
  });
  const Lp = Array.from({ length: nLip }, (_, i) => { const s = 1.2 + hash1(i * 7.3) * 0.7; return { u: ((i + 0.5) / nLip - 0.5) * (W - s * 0.6), s, ax: i % 2, ph: hash1(i * 2.2) * TAU }; });
  const B = Array.from({ length: nBub }, (_, i) => ({ u: (hash1(i * 9.1) - 0.5) * W * 0.9, ph: hash1(i * 3.9), s: 0.05 + hash1(i * 6.1) * 0.06 }));
  const place = (u, v, h, out) => (front === 'unten' ? out.set((h - 0.5) * D, v, u) : out.set(-v, h * H, u));
  const AX = [new THREE.Euler(0, Math.PI / 2, 0), new THREE.Euler(0, 0, 0), new THREE.Euler(-Math.PI / 2, 0, 0)];
  const qa = new THREE.Quaternion(), qs = new THREE.Quaternion();
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    const t = clk.t;
    const dens = clamp(num(st.density, 1), 0, 1);
    cardMat.opacity = 0.95 * dens; lipMat.opacity = 0.9 * dens; bubMat.opacity = 0.9 * dens;
    root.visible = dens > 0.01;
    F.forEach((f, i) => {
      place(f.u + Math.sin(t * 0.4 + f.ph) * 0.3, f.v + Math.sin(t * 0.6 + f.ph * 2) * 0.12, f.h, _v);
      qa.setFromEuler(AX[f.ax]); qs.setFromAxisAngle(_v2.set(0, 0, 1), t * 0.15 * (i % 2 ? 1 : -1) + f.ph);
      const sc = f.s * (1 + Math.sin(t * 0.8 + f.ph) * 0.08);
      cards.setMatrixAt(i, _m.compose(_v, qa.multiply(qs), _s.set(sc, sc * 0.8, 1)));
    });
    Lp.forEach((l, i) => {
      const roll = Math.sin(t * 1.4 + l.ph);
      place(l.u, l.s * 0.25 + roll * 0.05, 0.5 + Math.sin(t * 0.7 + l.ph) * 0.15, _v);
      qa.setFromEuler(AX[l.ax]); qs.setFromAxisAngle(_v2.set(0, 0, 1), t * 0.5 + l.ph);
      const sc = l.s * (1 + roll * 0.1);
      lip.setMatrixAt(i, _m.compose(_v, qa.multiply(qs), _s.set(sc, sc * 0.7, 1)));
    });
    B.forEach((b, i) => {
      const k = (t * 0.35 + b.ph) % 1;
      if (front === 'unten') _v.set((b.ph - 0.5) * D, -k * 0.6 + 0.1, b.u); else _v.set(0.2 + k * 0.6, 0.3 + k * H * 0.6, b.u);
      bub.setMatrixAt(i, _m.compose(_v, _q.identity(), _s.setScalar(b.s * Math.sin(k * Math.PI) + 0.001)));
    });
    cards.instanceMatrix.needsUpdate = true; lip.instanceMatrix.needsUpdate = true; bub.instanceMatrix.needsUpdate = true;
  };
  return makeModel('giftnebel_wand', root, update, [...own, cards, lip, bub], { initial: 'idle' });
}

export const MODELS = {
  feuerstab: buildFeuerstab,
  lavablase: buildLavablase,
  pfeilplattform: buildPfeilplattform,
  zylinder_walze: buildZylinder,
  stachelwalze_rot: buildStachelwalzeRot,
  pendelstachel: buildPendelstachel,
  klappstampfer: buildKlappstampfer,
  lava_fontaene: buildFontaene,
  gitterboden: buildGitter,
  zerbrechliche_kiste: buildKiste,
  zugbruecke: buildZugbruecke,
  giftnebel_wand: buildGiftnebel,
};
