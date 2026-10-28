// Gimmicks Welt 8 „Brummbär-Rummelplatz“ (Kurs-Modus): Leuchtsteg (8-4), Keksrad und Keks-Zahnrad (8-3), Riesenrad mit Gondel-
// Plattformen (8-Burg), Wasserkörper und Steigbecken (8-5), blaue/rote Stachelblöcke (8-5), Schubfeld (8-2), Lavabrocken-Regen und
// Lavapfütze (8-Burg, 8-B), Schockwelle (8-A). Eigene Gestaltung im Spielzeug-Look. Maßstab Meter, Vorderseite/Richtung +X; state
// darf ein String sein. Wiederverwendet: Landemarke 'landemarke' (Welt 5) als Warnfeld unter fallenden Brocken, Wumm-Block
// 'pow_block', Stampfstein, Projektil-/Suchkopf, Stachelwalze, Licht-Helm 'helm_licht', Glasröhre 'glass_pipe_segment'.
//
// leuchtsteg      unsichtbarer Steg (8-4): Kachel, die nur leuchtend sichtbar wird – blau schimmernde Fläche mit Rautenmuster und
//                 hellem Rahmen (additiv: bei glow 0 völlig unsichtbar). **Ursprung = Mitte der Unterseite**, Oberseite y = thick.
//                 opts  { size: [x, z] | n (Standard [2, 2]), thick (0,3) }
//                 state { glow (0..1: Sichtbarkeit, z. B. nach Abstand zur Figur), flash (0..1: Aufschlag/Stampfen – heller, Funkeln) }
//                 Viele Kacheln: createInstanced('leuchtsteg', n) (lib/instanced_w8.js, 1-m-Kachel, state { glow }).
// keksrad         drehender Keks (8-3): runder Butterkeks mit Wellenrand, rosa Zuckerguss-Kringel, Schokostückchen und bunten
//                 Streuseln (beide Seiten). **Ursprung = Mitte.**
//                 opts  { size (Ø, 4), thick (0,5), axis: 'y' (liegt flach, Oberseite y = thick/2) | 'x' | 'z' (steht als Rad,
//                         Achse ±X bzw. ±Z), color: 'hell' (Standard) | 'schoko' (Schokokeks, weißer Guss) }
//                 state { angle (rad um die Achse) | speed (rad/s, ohne angle) }
// keks_zahnrad    Keks-Zahnrad (8-3, Zahnradwand): Zahnrad aus Mürbeteig mit weißer Spritzguss-Kontur, Marmeladen-Mitte und
//                 Schokotupfen. **Ursprung = Mitte.**  opts { radius (2), teeth (10), thick (0,6), axis: 'y'|'x'|'z' }
//                 state { angle | speed }
// riesenrad       Riesenrad mit Gondel-Plattformen (8-Burg, ≈ 2·radius): rot-goldener Radkranz (zwei Ringe), Speichen, goldene
//                 Nabe mit Brummbär-Wappen, Glühbirnen, Stahlgestell bis zum Boden. Die Plattformen hängen an Bügeln und bleiben
//                 waagrecht. Radebene XY, Achse ±Z. **Ursprung = Nabe**; Gestell-Fuß bei y = −(radius + 2,6).
//                 opts  { radius (8), count (Plattformen, 8), plank: [x, z] (Plattform, [2,4, 2,2]), depth (Radbreite Z, 2,6),
//                         stand (true) }
//                 state { angle (rad, gegen den Uhrzeigersinn von vorn gesehen) | speed (rad/s) }
//                 Plattform i: Oberseite bei (R·cos(angle + i·2π/n), R·sin(angle + i·2π/n) − 1,2, 0).
//                 model.platform(i, out?) → diese Position (lokal, ohne root-Transformation).
// wasserkoerper   schwebender Wasserwürfel (8-5): durchsichtiger, leicht leuchtender Wasserblock mit Schaumkante oben und
//                 aufsteigenden Luftblasen. **Ursprung = Mitte der Unterseite.**  opts { size: [x, y, z] | n (2) }
//                 state { wobble (0..1: wabbelt, z. B. beim Hineinspringen) }
// steigbecken     Steigbecken (8-5): Steinbecken mit Goldkante und Pegel-Latte; das Wasser steigt und fällt.
//                 **Ursprung = Mitte des Beckenbodens innen** (y = 0); Rand bis y = height.
//                 opts  { size: [x, z] (Innenmaß, [6, 6]), height (3), wall (0,4) }
//                 state { level (0..1 Anteil von height) }   root.userData.water → aktuelle Wasserhöhe (m).
// stachelblock_blau / stachelblock_rot   Stachelblock (8-5): Metallblock mit Lochraster, aus dem Stacheln fahren; blau (kühl,
//                 türkise Fugen) bzw. rot (heiß, orange Fugen). Auch als wandernde Stachelwand (size [x, y, z]).
//                 **Ursprung = Mitte der Unterseite.**
//                 opts  { size: n | [x, y, z] (1), faces: 'alle' (Standard: vier Seiten und oben) | 'seiten' | 'oben' | 'vorn' (+X) }
//                 state { out (0..1: Stacheln ausgefahren, 0,5 m), warn (bool: Fugen blinken, Stacheln zucken) }
// schubfeld       Schubfeld im Sand (8-2): Sandsteinplatte mit drei leuchtenden Pfeil-Winkeln (Lauflicht nach +X) und
//                 wirbelnden Sandkörnern. **Ursprung = Mitte**, Oberseite y ≈ 0,06.
//                 opts  { size: [x, z] ([3, 2]) }   state { on (true), speed (Lauflicht, 1) }
// lavabrocken_regen  Lavabrocken aus dem Vulkan (8-Burg): glühender Krustenbrocken mit Flammenschweif.
//                 **Ursprung = Mitte des Brockens.**  opts { size (Ø, 0,8) }
//                 state { anim: 'fall' (Schweif nach oben) | 'land' (progress 0..1 in 0,8 s: platscht auf, Glutring und Spritzer,
//                         verglüht) | 'glow' (liegt, glüht) }
// lavapfuetze     Lavapfütze (8-B, Spur geschleuderter Brocken): flache, blubbernde Glutpfütze mit Krustenrand.
//                 **Ursprung = Mitte am Boden.**  opts { size (Ø, 2) }
//                 state { anim: 'idle'|'grow'|'cool', progress? (grow 0..1 in 0,5 s: breitet sich aus; cool 0..1 in 3 s: erkaltet
//                         zu Stein und verschwindet) }
// schockwelle     Schockwelle (8-A, Landung der goldenen Würfelblase): goldener Wellenring, der sich ausbreitet und verblasst,
//                 mit Staub. **Ursprung = Mitte am Boden.**  opts { radius (Endradius, 5), color: 'gold' (Standard) | 'weiss' }
//                 state { progress (0..1) } – Ring bei radius·(0,1 + 0,9·progress), Höhe ≈0,35 m (darüber springen).

import {
  THREE, TAU, Build, cached, vcol, basic, std, mesh, joint, makeModel, Clock, damp, clamp, col, mix, smoothstep, lerp,
  instMesh, setInst, glowSprite, puffyStarGeo, placed,
} from '../lib/kit.js';
import {
  W8, prog, num, ZERO, ownMat, fxPuffs, puffyGeo, gradV, hash1, noise3, lumpyEllipsoid, displace, taperTube, bearEmblem, glow8,
  waterMat8, spikeCone, spikeV, LAVA7, lavaRingGeo, dropletGeo, roundRectShape, memo,
} from '../lib/w8Geos.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
const sz2 = (v, d) => (Array.isArray(v) ? [num(v[0], d[0]), num(v[1], d[1])] : v !== undefined ? [num(v, d[0]), num(v, d[1])] : d);
const sz3 = (v, d) => (Array.isArray(v) ? [num(v[0], d[0]), num(v[1], d[1]), num(v[2], d[2])] : v !== undefined ? [num(v, d[0]), num(v, d[0]), num(v, d[0])] : d);
/** Drehachse: Gelenk so drehen, dass die lokale Y-Achse auf axis zeigt. */
function axisJoint(j, axis) { if (axis === 'x') j.rotation.set(0, 0, -Math.PI / 2); else if (axis === 'z') j.rotation.set(Math.PI / 2, 0, 0); }

// =============================================================================================
// Leuchtsteg
// =============================================================================================
/** Kachel w × d × t (Ursprung = Mitte der Unterseite): Fläche mit Rautenmuster, heller Rahmen (Farben für additives Leuchten). */
export function stegGeo(w = 2, d = 2, t = 0.3, lo = false) {
  return cached(`w8:steg:${w}:${d}:${t}:${lo}`, () => {
    const b = new Build();
    const C = { fill: 0x0a2a6a, dia: 0x1a6ad8, edge: 0x8ae8ff, side: 0x082050 };
    // Oberseite mit Rauten (je Dreieck: scharfe Muster)
    const nx = Math.max(1, Math.round(w * (lo ? 2 : 4))), nz = Math.max(1, Math.round(d * (lo ? 2 : 4)));
    const top = new THREE.PlaneGeometry(w, d, nx, nz); top.rotateX(-Math.PI / 2);
    b.add(top, (x, y, z) => { const u = ((x / 0.5) % 1 + 1) % 1, v = ((z / 0.5) % 1 + 1) % 1; return Math.abs(u - 0.5) + Math.abs(v - 0.5) < 0.22 ? C.dia : C.fill; }, { p: [0, t, 0] });
    // Seiten (dunkler), Rahmen
    b.box(w, t * 0.92, d, C.side, { p: [0, t * 0.46, 0] }, 0, 1);
    const e = 0.06;
    for (const s of [1, -1]) {
      b.box(w, 0.04, e, C.edge, { p: [0, t + 0.01, s * (d / 2 - e / 2)] }, 0, 1);
      b.box(e, 0.04, d, C.edge, { p: [s * (w / 2 - e / 2), t + 0.01, 0] }, 0, 1);
    }
    if (!lo) for (const x of [1, -1]) for (const z of [1, -1]) b.add(puffyStarGeo(0.08, 0.035, 0.03, 0.01, 4), 0xe8fbff, { p: [x * (w / 2 - e / 2), t + 0.04, z * (d / 2 - e / 2)], r: [-Math.PI / 2, 0, 0] });
    return b.geometry();
  });
}
const sparkGeo = () => cached('w8:steg:spark', () => new Build().add(puffyStarGeo(0.07, 0.025, 0.02, 0.008, 4), 0xffffff).geometry());
function buildLeuchtsteg(opts = {}) {
  const [w, d] = sz2(opts.size, [2, 2]);
  const t = clamp(num(opts.thick, 0.3), 0.05, 3);
  const root = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const sMat = new THREE.MeshBasicMaterial({ color: 0xc8f4ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const tile = mesh(stegGeo(w, d, t), mat);
  const N = 6;
  const sparks = instMesh(sparkGeo(), sMat, N, Math.max(w, d), t);
  root.add(tile, sparks);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t0 = clk.t;
    const glow = clamp(num(st.glow, 0), 0, 1), fl = clamp(num(st.flash, 0), 0, 1);
    const k = clamp(glow * (0.85 + Math.sin(t0 * 3) * 0.08) + fl * 0.6, 0, 1.6);
    tile.visible = k > 0.01;
    mat.color.setScalar(k);
    sparks.visible = k > 0.3;
    for (let i = 0; i < N; i++) {
      const ph = (t0 * 0.7 + i / N) % 1;
      const s = Math.sin(ph * Math.PI) * (0.6 + fl * 0.8);
      setInst(sparks, i, (hash1(i + Math.floor(t0 * 0.7 + i / N) * 7) - 0.5) * w * 0.9, t + 0.06 + ph * 0.25, (hash1(i * 3 + Math.floor(t0 * 0.7 + i / N)) - 0.5) * d * 0.9, -Math.PI / 2, 0, ph * 3, Math.max(0.001, s));
    }
    sparks.instanceMatrix.needsUpdate = true;
    sMat.color.setScalar(Math.min(1, k));
  };
  return makeModel('leuchtsteg', root, update, [mat, sMat, sparks], { initial: 'idle' });
}

// =============================================================================================
// Keksrad, Keks-Zahnrad
// =============================================================================================
const KEKS = {
  hell: { dough: W8.dough, hi: W8.doughHi, low: W8.doughLow, icing: W8.icingPink, icingHi: 0xffc8e8, chip: W8.choco },
  schoko: { dough: 0x7a3e1e, hi: 0xa8643a, low: 0x4a220e, icing: W8.icing, icingHi: 0xffffff, chip: 0xfff0d8 },
};
const SPRINKLES = [0xff4a7a, 0x4ad8ff, 0xffe04a, 0x7ae85a, 0xb87aff, 0xffffff];
/** Keks (Ø size, Dicke t, Achse Y, Mitte im Ursprung) mit Verzierung auf beiden Seiten. */
function keksGeo(size, t, color) {
  return cached(`w8:keks:${size}:${t}:${color}`, () => {
    const K = KEKS[color] ?? KEKS.hell;
    const R = size / 2;
    const b = new Build();
    // Keks: Wellenrand (Drehkörper, Rand gewellt), leicht gewölbte Flächen
    const prof = [[0, -t / 2], [R * 0.9, -t / 2], [R, -t * 0.25], [R * 1.01, 0], [R, t * 0.25], [R * 0.9, t / 2], [0, t / 2 + 0.02]];
    const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 64);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i), r = Math.hypot(x, z); if (r > R * 0.6) { const a = Math.atan2(z, x), k = 1 + Math.sin(a * 16) * 0.025 * smoothstep((r - R * 0.6) / (R * 0.4)); P.setX(i, x * k); P.setZ(i, z * k); } }
    g.computeVertexNormals();
    b.add(g, { v: (x, y, z, nx, ny) => mix(K.low, mix(K.dough, K.hi, smoothstep(Math.abs(ny) * 0.7 + (noise3(x * 5, y * 5, z * 5) - 0.5) * 0.5)), smoothstep(Math.abs(ny) * 0.8 + 0.25)) });
    for (const sgn of [1, -1]) {
      const y0 = sgn * (t / 2 + 0.015);
      // Zuckerguss-Kringel (wellige Ringe) und Mittelklecks
      for (const [rr, amp, n] of [[R * 0.72, R * 0.05, 9], [R * 0.4, R * 0.04, 6]]) {
        const pts = [];
        for (let i = 0; i <= 72; i++) { const a = (i / 72) * TAU; const r = rr + Math.sin(a * n) * amp; pts.push([Math.cos(a) * r, y0, Math.sin(a) * r]); }
        b.add(taperTube(pts, R * 0.045, 96, 6), { v: (x, y) => mix(K.icing, K.icingHi, smoothstep((y - y0) * sgn / (R * 0.04) + 0.3)) });
      }
      b.sphere(1, { v: (x, y, z, nx, ny) => mix(K.icing, K.icingHi, smoothstep(ny * sgn)) }, { p: [0, y0, 0], s: [R * 0.16, R * 0.05, R * 0.16] }, 16, 8);
      // Schokostückchen und Streusel
      for (let i = 0; i < 9; i++) {
        const a = i * 2.4 + sgn, r = R * (0.25 + hash1(i * 3 + sgn) * 0.6);
        b.add(new THREE.DodecahedronGeometry(R * 0.055, 0), K.chip, { p: [Math.cos(a) * r, y0 - sgn * 0.01, Math.sin(a) * r], s: [1, 0.55, 1], r: [i, i * 2, 0] });
      }
      for (let i = 0; i < 22; i++) {
        const a = i * 1.37 + sgn * 0.4, r = R * (0.15 + hash1(i * 7 + sgn * 3) * 0.75);
        b.capsule(R * 0.012, R * 0.05, SPRINKLES[i % SPRINKLES.length], { p: [Math.cos(a) * r, y0 + sgn * R * 0.005, Math.sin(a) * r], r: [Math.PI / 2, i * 0.9, 0], order: 'YXZ' }, 1, 4);
      }
    }
    return b.geometry();
  });
}
function buildKeksrad(opts = {}) {
  const size = clamp(num(opts.size, 4), 0.5, 30), t = clamp(num(opts.thick, 0.5), 0.1, 5);
  const color = opts.color === 'schoko' ? 'schoko' : 'hell';
  const root = new THREE.Group();
  const ax = joint(); axisJoint(ax, opts.axis);
  const spin = joint();
  const keks = mesh(keksGeo(size, t, color), vcol(0.55, {}, 'w8keks'), {}, true);
  keks.receiveShadow = true;
  spin.add(keks); ax.add(spin); root.add(ax);
  let ang = 0;
  const update = (dt, st) => {
    if (st.angle !== undefined) ang = num(st.angle, 0); else ang += dt * num(st.speed, 0);
    spin.rotation.y = ang;
  };
  return makeModel('keksrad', root, update, [], { initial: 'idle' });
}
function gearShape(R, teeth, depth) {
  const s = new THREE.Shape();
  const n = teeth * 4;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU, ph = i % 4;
    const r = ph === 0 || ph === 3 ? R - depth : R;
    const off = (ph === 1 ? 0.12 : ph === 2 ? -0.12 : 0) * (TAU / teeth) * 0.25;
    const x = Math.cos(a + off) * r, y = Math.sin(a + off) * r;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  const hole = new THREE.Path(); hole.absarc(0, 0, R * 0.16, 0, TAU, true);
  s.holes.push(hole);
  return s;
}
function zahnradGeo(R, teeth, t) {
  return cached(`w8:keksgear:${R}:${teeth}:${t}`, () => {
    const b = new Build();
    const depth = Math.min(R * 0.22, 0.45);
    const g = puffyGeo(gearShape(R, teeth, depth), t * 0.7, t * 0.15, 4, 3);
    g.rotateX(-Math.PI / 2);
    b.add(g, { v: (x, y, z, nx, ny) => mix(W8.doughLow, mix(W8.dough, W8.doughHi, smoothstep(Math.abs(ny) * 0.6 + (noise3(x * 4, y * 4, z * 4) - 0.5) * 0.6)), smoothstep(Math.abs(ny) * 0.8 + 0.2)) });
    for (const sgn of [1, -1]) {
      const y0 = sgn * (t * 0.5 + 0.005);
      // Spritzguss-Kontur entlang der Zähne
      const pts = [];
      const n = teeth * 4;
      for (let i = 0; i <= n * 3; i++) {
        const u = i / (n * 3), a = u * TAU, ph = Math.floor(u * n) % 4;
        const r = (ph === 0 || ph === 3 ? R - depth : R) - R * 0.07;
        pts.push([Math.cos(a) * r, y0, Math.sin(a) * r]);
      }
      b.add(taperTube(pts, R * 0.025, n * 3, 5), W8.icing);
      // Marmeladen-Ring um das Loch, Schokotupfen
      b.torus(R * 0.24, R * 0.06, { v: (x, y, z, nx, ny) => mix(0xb8102a, 0xff4a5a, smoothstep(ny * sgn * 0.6 + 0.4)) }, { p: [0, y0, 0], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.6] }, 8, 28);
      for (let i = 0; i < teeth; i++) { const a = (i + 0.5) / teeth * TAU; b.sphere(R * 0.05, W8.choco, { p: [Math.cos(a) * R * 0.55, y0, Math.sin(a) * R * 0.55], s: [1, 0.5, 1] }, 8, 5); }
    }
    return b.geometry();
  });
}
function buildKeksZahnrad(opts = {}) {
  const R = clamp(num(opts.radius, 2), 0.4, 15), teeth = clamp(Math.round(num(opts.teeth, 10)), 5, 40), t = clamp(num(opts.thick, 0.6), 0.1, 4);
  const root = new THREE.Group();
  const ax = joint(); axisJoint(ax, opts.axis);
  const spin = joint();
  const gear = mesh(zahnradGeo(R, teeth, t), vcol(0.55, {}, 'w8keks'), {}, true);
  gear.receiveShadow = true;
  spin.add(gear); ax.add(spin); root.add(ax);
  let ang = 0;
  const update = (dt, st) => { if (st.angle !== undefined) ang = num(st.angle, 0); else ang += dt * num(st.speed, 0); spin.rotation.y = ang; };
  return makeModel('keks_zahnrad', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Riesenrad (Gimmick)
// =============================================================================================
const RR = { red: W8.red, redHi: W8.redHi, redLow: W8.redLow, gold: W8.gold, goldHi: W8.goldHi, goldLow: W8.goldLow, steel: 0x8a90a8, steelHi: 0xd8dcec, steelLow: 0x3a3e52, purple: W8.purple, plank: 0xffd23a, plankHi: 0xfff2a0 };
const HANG = 1.2;
function wheelGeo(R, n, D) {
  return cached(`w8:rad:wheel:${R}:${n}:${D}`, () => {
    const b = new Build();
    const redV = gradV(RR.redLow, RR.redHi, 0.5, 0.5), goldV = gradV(RR.goldLow, RR.goldHi, 0.5, 0.5);
    const tr = clamp(R * 0.025, 0.12, 0.4);
    for (const z of [D / 2, -D / 2]) {
      b.torus(R, tr, redV, { p: [0, 0, z] }, 8, Math.max(48, n * 8));
      b.torus(R * 0.55, tr * 0.7, goldV, { p: [0, 0, z] }, 6, 40);
      const ns = n * 2;
      for (let i = 0; i < ns; i++) {
        const a = (i / ns) * TAU;
        const len = R;
        const g = new THREE.CylinderGeometry(tr * 0.45, tr * 0.6, len, 6, 1);
        g.translate(0, len / 2, 0);
        b.add(g, i % 2 ? RR.steelHi : RR.gold, { p: [0, 0, z], r: [0, 0, a - Math.PI / 2] });
      }
    }
    // Querstreben an den Aufhängepunkten, Nabe mit Wappen
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      b.cyl(tr * 0.7, tr * 0.7, D + tr * 2, goldV, { p: [Math.cos(a) * R, Math.sin(a) * R, 0], r: [Math.PI / 2, 0, 0] }, 10);
    }
    b.cyl(R * 0.1, R * 0.1, D + 0.4, goldV, { r: [Math.PI / 2, 0, 0] }, 24);
    for (const s of [1, -1]) bearEmblem(b, { p: [0, 0, s * (D / 2 + 0.22)], r: [0, s > 0 ? 0 : Math.PI, 0] }, R * 0.09);
    return b.geometry();
  });
}
function gondolaGeo(w, d) {
  return cached(`w8:rad:gondola:${w}:${d}`, () => {
    const b = new Build();
    // Plattform (Oberseite y = 0): gelbe Fläche, rot-weiß gestreifte Kante, Bügel nach oben zum Aufhängepunkt (y = HANG)
    b.box(w, 0.08, d, gradV(RR.plank, RR.plankHi, 0.5, 0.6), { p: [0, -0.04, 0] }, 0.03, 1);
    const n = Math.max(4, Math.round(w * 4));
    b.box(w + 0.06, 0.22, d + 0.06, (x, y, z) => (Math.floor((x + z + 10) * 4) % 2 ? col(RR.red) : col(0xfff6ee)), { p: [0, -0.19, 0] }, 0.04, 1);
    b.box(w * 0.8, 0.12, d * 0.8, RR.purple, { p: [0, -0.34, 0] }, 0.05, 1);
    for (const s of [1, -1]) {
      b.cyl(0.05, 0.05, HANG + 0.1, RR.steelHi, { p: [0, HANG / 2 - 0.05, s * (d / 2 + 0.05)] }, 8);
      b.cyl(0.05, 0.05, w * 0.7, RR.gold, { p: [0, -0.04, s * (d / 2 + 0.05)], r: [0, 0, Math.PI / 2] }, 8);
      for (const x of [w * 0.35, -w * 0.35]) b.tube([[x, -0.04, s * (d / 2 + 0.05)], [x * 0.5, HANG * 0.55, s * (d / 2 + 0.05)], [0, HANG, s * (d / 2 + 0.05)]], 0.035, RR.steelHi, null, 8, 5);
    }
    b.cyl(0.08, 0.08, d + 0.3, RR.gold, { p: [0, HANG, 0], r: [Math.PI / 2, 0, 0] }, 10);
    void n;
    return b.geometry();
  });
}
function standGeo(R, D) {
  return cached(`w8:rad:stand:${R}:${D}`, () => {
    const b = new Build();
    const H = R + 2.6, spread = R * 0.5;
    const steelV = gradV(RR.steelLow, RR.steelHi, 0.5, 0.5);
    for (const z of [D / 2 + 0.7, -D / 2 - 0.7]) {
      for (const sx of [1, -1]) {
        const top = new THREE.Vector3(0, 0, z), foot = new THREE.Vector3(sx * spread, -H, z);
        const len = top.distanceTo(foot);
        const g = new THREE.CylinderGeometry(0.22, 0.32, len, 8, 1);
        const mid = top.clone().add(foot).multiplyScalar(0.5);
        b.add(g, steelV, new THREE.Matrix4().compose(mid, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), foot.clone().sub(top).normalize()), new THREE.Vector3(1, 1, 1)));
        b.box(1.4, 0.5, 1.4, gradV(RR.redLow, RR.red, 0.5, 0.5), { p: [sx * spread, -H + 0.25, z] }, 0.08, 1);
      }
      // Querstreben
      for (const k of [0.35, 0.7]) b.cyl(0.12, 0.12, spread * 2 * k, RR.gold, { p: [0, -H * k, z], r: [0, 0, Math.PI / 2] }, 8);
    }
    b.cyl(0.25, 0.25, D + 1.8, steelV, { r: [Math.PI / 2, 0, 0] }, 12);
    return b.geometry();
  });
}
const bulbG = () => cached('w8:rad:bulb', () => new Build().sphere(0.13, { v: (x, y, z, nx, ny) => mix(W8.bulbWarm, W8.bulb, smoothstep(ny * 0.6 + 0.5)) }, {}, 10, 7).geometry());
function buildRiesenrad(opts = {}) {
  const R = clamp(num(opts.radius, 8), 3, 20), n = clamp(Math.round(num(opts.count, 8)), 3, 16);
  const [pw, pd] = sz2(opts.plank, [2.4, 2.2]);
  const D = clamp(num(opts.depth, 2.6), 1, 8);
  const root = new THREE.Group();
  const own = [];
  const wheelJ = joint();
  const wheel = mesh(wheelGeo(R, n, D), vcol(0.35, { metalness: 0.15 }, 'w8rad'), {}, true);
  const nb = n * 2 * 2 + 8;
  const bulbs = instMesh(bulbG(), glow8(), nb, R + 1, 0);
  let k = 0;
  for (const z of [D / 2 + 0.14, -D / 2 - 0.14]) for (let i = 0; i < n * 2; i++) { const a = ((i + 0.5) / (n * 2)) * TAU; setInst(bulbs, k++, Math.cos(a) * R, Math.sin(a) * R, z); }
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; setInst(bulbs, k++, Math.cos(a) * R * 0.55, Math.sin(a) * R * 0.55, D / 2 + 0.14); }
  bulbs.instanceMatrix.needsUpdate = true;
  wheelJ.add(wheel, bulbs);
  const gondolas = instMesh(gondolaGeo(pw, pd), vcol(0.4, {}, 'w8gondel'), n, R + 2, 0);
  gondolas.castShadow = true; gondolas.receiveShadow = true;
  root.add(wheelJ, gondolas);
  if (opts.stand !== false) root.add(mesh(standGeo(R, D), vcol(0.4, { metalness: 0.25 }, 'w8radstand'), {}, true));
  const bulbMat = glow8();
  void bulbMat;
  const clk = new Clock();
  let ang = 0;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    if (st.angle !== undefined) ang = num(st.angle, 0); else ang += dt * num(st.speed, 0);
    wheelJ.rotation.z = ang;
    for (let i = 0; i < n; i++) { const a = ang + (i / n) * TAU; setInst(gondolas, i, Math.cos(a) * R, Math.sin(a) * R - HANG, 0, 0, 0, Math.sin(clk.t * 1.3 + i) * 0.02); }
    gondolas.instanceMatrix.needsUpdate = true;
  };
  const model = makeModel('riesenrad', root, update, [...own, bulbs, gondolas], { initial: 'idle' });
  model.platform = (i, out = new THREE.Vector3()) => { const a = ang + ((i | 0) / n) * TAU; return out.set(Math.cos(a) * R, Math.sin(a) * R - HANG, 0); };
  root.userData.hang = HANG; root.userData.radius = R; root.userData.count = n;
  return model;
}

// =============================================================================================
// Wasserkörper, Steigbecken
// =============================================================================================
const bubbleGeo = () => cached('w8:bubble', () => new Build().sphere(1, { v: (x, y, z, nx, ny) => mix(0xbfe8ff, 0xffffff, smoothstep(ny * 0.7 + 0.4)) }, {}, 10, 7).geometry());
function waterBoxGeo(x, y, z) {
  return cached(`w8:wbox:${x}:${y}:${z}`, () => {
    const g = new Build();
    const r = Math.min(0.18, x * 0.1, y * 0.1, z * 0.1);
    g.box(x, y, z, { v: (px, py, pz, nx, ny) => mix(0x2a7ad8, 0x9ae0ff, smoothstep(ny * 0.5 + 0.5 + (py / y) * 0.3)) }, { p: [0, y / 2, 0] }, r, 3);
    return g.geometry();
  });
}
const foamGeo = (x, z) => cached(`w8:foam:${x}:${z}`, () => {
  const b = new Build();
  const per = 2 * (x + z), n = Math.max(12, Math.round(per * 5));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * per;
    let px, pz;
    if (u < x) { px = -x / 2 + u; pz = z / 2; } else if (u < x + z) { px = x / 2; pz = z / 2 - (u - x); } else if (u < 2 * x + z) { px = x / 2 - (u - x - z); pz = -z / 2; } else { px = -x / 2; pz = -z / 2 + (u - 2 * x - z); }
    pts.push([px, Math.sin(u * 7) * 0.02, pz]);
  }
  b.add(taperTube(pts, 0.06, n, 6), { v: (px, py) => mix(0xd8f4ff, 0xffffff, smoothstep(py * 20 + 0.5)) });
  return b.geometry();
});
function buildWasserkoerper(opts = {}) {
  const [x, y, z] = sz3(opts.size, [2, 2, 2]);
  const root = new THREE.Group();
  const own = [];
  const wob = joint();
  const body = mesh(waterBoxGeo(x, y, z), ownMat(waterMat8(), {}), {});
  own.push(body.material);
  body.material.vertexColors = true; body.material.color.setHex(0xffffff); body.material.opacity = 0.5;
  body.renderOrder = 2;
  const foam = mesh(foamGeo(x * 0.98, z * 0.98), vcol(0.3, {}, 'w8foam'), { p: [0, y - 0.02, 0] });
  const NB = 10;
  const bub = instMesh(bubbleGeo(), vcol(0.1, {}, 'w8bubble'), NB, Math.max(x, y, z), y / 2);
  wob.add(body, foam, bub);
  root.add(wob);
  const B = Array.from({ length: NB }, (_, i) => ({ x: (hash1(i) - 0.5) * x * 0.8, z: (hash1(i + 3) - 0.5) * z * 0.8, sp: 0.3 + hash1(i + 5) * 0.4, s: 0.03 + hash1(i + 7) * 0.05, ph: hash1(i + 9) }));
  const clk = new Clock();
  let wb = 0;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t = clk.t;
    wb = damp(wb, clamp(num(st.wobble, 0), 0, 1), 6, dt);
    const sq = Math.sin(t * 9) * 0.06 * wb + Math.sin(t * 1.6) * 0.008;
    wob.scale.set(1 - sq * 0.5, 1 + sq, 1 - sq * 0.5);
    B.forEach((b, i) => { const p = (t * b.sp / y + b.ph) % 1; setInst(bub, i, b.x + Math.sin(t * 3 + i) * 0.04, 0.1 + p * (y - 0.2), b.z, 0, 0, 0, b.s * (0.6 + p * 0.6)); });
    bub.instanceMatrix.needsUpdate = true;
    foam.position.y = y - 0.02 + Math.sin(t * 2) * 0.01;
  };
  return makeModel('wasserkoerper', root, update, [...own, bub], { initial: 'idle' });
}
function basinGeo(X, Z, H, W) {
  return cached(`w8:basin:${X}:${Z}:${H}:${W}`, () => {
    const b = new Build();
    const stoneV = { v: (x, y, z, nx, ny) => mix(W8.wet, mix(W8.stone, W8.stoneHi, smoothstep(ny * 0.5 + 0.3)), smoothstep(ny * 0.4 + 0.5 + (noise3(x * 1.5, y * 1.5, z * 1.5) - 0.5) * 0.5)) };
    const goldV = gradV(W8.goldLow, W8.goldHi, 0.5, 0.5);
    b.box(X + 2 * W, 0.4, Z + 2 * W, stoneV, { p: [0, -0.2, 0] }, 0.05, 1);
    const walls = [[0, Z / 2 + W / 2, X + 2 * W, W], [0, -Z / 2 - W / 2, X + 2 * W, W], [X / 2 + W / 2, 0, W, Z], [-X / 2 - W / 2, 0, W, Z]];
    for (const [x, z, w, d] of walls) {
      b.box(w, H, d, stoneV, { p: [x, H / 2, z] }, 0.05, 2);
      b.box(w + 0.06, 0.12, d + 0.06, goldV, { p: [x, H + 0.04, z] }, 0.04, 1);
      // Fugen: dunkle Bänder
      for (let y = 0.6; y < H - 0.2; y += 0.6) b.box(w + 0.01, 0.04, d + 0.01, W8.stoneLow, { p: [x, y, z] }, 0, 1);
    }
    // Pegel-Latte an der Rückwand (innen, −X)
    const lx = -X / 2 + 0.06;
    for (let i = 0; i < Math.round(H / 0.25); i++) b.box(0.05, 0.25, 0.4, i % 2 ? 0xffffff : 0xe8283a, { p: [lx, i * 0.25 + 0.125, 0] }, 0, 1);
    return b.geometry();
  });
}
function buildSteigbecken(opts = {}) {
  const [X, Z] = sz2(opts.size, [6, 6]);
  const H = clamp(num(opts.height, 3), 0.5, 20), W = clamp(num(opts.wall, 0.4), 0.1, 3);
  const root = new THREE.Group();
  const own = [];
  root.add(mesh(basinGeo(X, Z, H, W), vcol(0.6, {}, 'w8basin'), {}, true));
  root.children[0].receiveShadow = true;
  const wMat = ownMat(waterMat8(), {}); own.push(wMat);
  wMat.vertexColors = true; wMat.color.setHex(0xffffff);
  const water = mesh(waterBoxGeo(X, 1, Z), wMat, {});
  water.renderOrder = 2;
  const foam = mesh(foamGeo(X - 0.02, Z - 0.02), vcol(0.3, {}, 'w8foam'), {});
  // Pegel-Pfeil (Gold) an der Latte
  const arrow = mesh(cached('w8:basin:arrow', () => new Build().cone(0.14, 0.3, W8.gold, { r: [0, 0, -Math.PI / 2] }, 8).sphere(0.08, W8.goldHi, { p: [-0.16, 0, 0] }, 8, 6).geometry()), vcol(0.3, { metalness: 0.4 }, 'w8gold'), {});
  root.add(water, foam, arrow);
  const clk = new Clock();
  let lv = 0;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    lv = clamp(num(st.level, 0.5), 0, 1);
    const hgt = Math.max(0.001, lv * H);
    water.visible = lv > 0.005;
    water.scale.set(1, hgt, 1);
    foam.visible = water.visible;
    foam.position.y = hgt + Math.sin(clk.t * 2) * 0.01;
    arrow.position.set(-X / 2 + 0.3, hgt, 0.45);
    root.userData.water = hgt;
  };
  return makeModel('steigbecken', root, update, own, { initial: 'idle' });
}

// =============================================================================================
// Stachelblöcke
// =============================================================================================
const SPK = {
  blau: { body: 0x3a5ad8, hi: 0x8ab0ff, low: 0x1a2a7a, seam: 0x4af0ff, spike: 0xd8e8ff, spikeLow: 0x7a8ab8 },
  rot: { body: 0xd83a3a, hi: 0xff8a7a, low: 0x7a1a1e, seam: 0xffa82a, spike: 0xfff0e0, spikeLow: 0xb88a7a },
};
function spikeHoles(x, y, z, faces) {
  const out = [];   // [px, py, pz, nx, ny, nz]
  const grid = (u, v) => { const nu = Math.max(1, Math.round(u / 0.5)), nv = Math.max(1, Math.round(v / 0.5)); const r = []; for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) r.push([(i + 0.5) / nu - 0.5, (j + 0.5) / nv - 0.5]); return r; };
  const want = (f) => faces === 'alle' ? f !== 'unten' : faces === 'seiten' ? ['px', 'nx', 'pz', 'nz'].includes(f) : faces === 'oben' ? f === 'oben' : f === 'px';
  if (want('px')) for (const [a, c] of grid(z, y)) out.push([x / 2, y / 2 + c * y, a * z, 1, 0, 0]);
  if (want('nx')) for (const [a, c] of grid(z, y)) out.push([-x / 2, y / 2 + c * y, a * z, -1, 0, 0]);
  if (want('pz')) for (const [a, c] of grid(x, y)) out.push([a * x, y / 2 + c * y, z / 2, 0, 0, 1]);
  if (want('nz')) for (const [a, c] of grid(x, y)) out.push([a * x, y / 2 + c * y, -z / 2, 0, 0, -1]);
  if (want('oben')) for (const [a, c] of grid(x, z)) out.push([a * x, y, c * z, 0, 1, 0]);
  return out;
}
function spikeBlockGeo(color, x, y, z, faces) {
  return memo(`w8:spkblock:${color}:${x}:${y}:${z}:${faces}`, () => {
    const C = SPK[color];
    const b = new Build(), gl = new Build();
    b.box(x, y, z, gradV(C.low, C.hi, 0.5, 0.45), { p: [0, y / 2, 0] }, Math.min(0.08, x * 0.1, y * 0.1, z * 0.1), 2);
    // Nieten an den Ecken, Löcher
    for (const sx of [1, -1]) for (const sz of [1, -1]) for (const sy of [0, 1]) b.sphere(0.04, 0xe8ecf8, { p: [sx * (x / 2 - 0.08), sy ? y - 0.08 : 0.08, sz * (z / 2 - 0.08)] }, 6, 4);
    for (const [px, py, pz, nx, ny, nz] of spikeHoles(x, y, z, faces)) {
      const n = new THREE.Vector3(nx, ny, nz);
      b.add(new THREE.CylinderGeometry(0.11, 0.11, 0.02, 10), 0x0a0a18, placed(new THREE.Vector3(px, py, pz).addScaledVector(n, 0.005), n, new THREE.Vector3(1, 1, 1)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)));
      gl.torus(0.13, 0.02, C.seam, { p: new THREE.Vector3(px, py, pz).addScaledVector(n, 0.012).toArray(), r: ny ? [Math.PI / 2, 0, 0] : nx ? [0, Math.PI / 2, 0] : [0, 0, 0] }, 4, 14);
    }
    return { body: b.geometry(), glow: gl.geometry() };
  });
}
const spikeGeo = (color) => cached(`w8:spk:spike:${color}`, () => new Build().add(spikeCone(0.1, 0.5, 8), spikeV(0.5, SPK[color].spikeLow, SPK[color].spike)).geometry());
function buildStachelblock(color) {
  return (opts = {}) => {
    const [x, y, z] = sz3(opts.size, [1, 1, 1]);
    const faces = ['seiten', 'oben', 'vorn'].includes(opts.faces) ? opts.faces : 'alle';
    const root = new THREE.Group();
    const own = [];
    const G = spikeBlockGeo(color, x, y, z, faces);
    const body = mesh(G.body, vcol(0.3, { metalness: 0.35 }, `w8spk:${color}`), {}, true);
    const seamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, toneMapped: false });
    own.push(seamMat);
    const seams = mesh(G.glow, seamMat, {});
    const holes = spikeHoles(x, y, z, faces);
    const spikes = instMesh(spikeGeo(color), vcol(0.25, { metalness: 0.3 }, 'w8spikes'), holes.length, Math.max(x, y, z) + 1, y / 2);
    spikes.castShadow = true;
    root.add(body, seams, spikes);
    const clk = new Clock();
    let out = 0;
    const update = (dt, st) => {
      clk.tick(dt, 'idle');
      const t = clk.t;
      out = damp(out, clamp(num(st.out, 0), 0, 1), 18, dt);
      const warn = !!st.warn;
      holes.forEach(([px, py, pz, nx, ny, nz], i) => {
        const jig = warn ? Math.max(0, Math.sin(t * 30 + i * 1.3)) * 0.08 : 0;
        const e = lerp(-0.48, 0.02, out) + jig;
        _v.set(nx, ny, nz);
        _q.setFromUnitVectors(_s.set(0, 0, 1), _v);
        _m.compose(new THREE.Vector3(px + nx * e, py + ny * e, pz + nz * e), _q, new THREE.Vector3(1, 1, 1).multiplyScalar(e < -0.46 ? 0.001 : 1));
        spikes.setMatrixAt(i, _m);
      });
      spikes.instanceMatrix.needsUpdate = true;
      const k = warn ? (Math.sin(t * 16) > 0 ? 1.4 : 0.4) : 0.55 + out * 0.6;
      seamMat.color.setScalar(k);
    };
    return makeModel(`stachelblock_${color === 'blau' ? 'blau' : 'rot'}`, root, update, [...own, spikes], { initial: 'idle' });
  };
}

// =============================================================================================
// Schubfeld
// =============================================================================================
function schubPlateGeo(X, Z) {
  return cached(`w8:schub:${X}:${Z}`, () => {
    const b = new Build();
    const sandV = { v: (x, y, z, nx, ny) => mix(W8.sandLow, mix(W8.sand, W8.sandHi, smoothstep(ny * 0.4 + (noise3(x * 3, 0, z * 3) - 0.5) * 0.6)), smoothstep(ny * 0.5 + 0.55)) };
    b.box(X, 0.06, Z, sandV, { p: [0, 0.0, 0] }, 0.03, 1);
    // türkiser Kachelrahmen mit Gold-Ecken
    for (const s of [1, -1]) {
      b.box(X, 0.05, 0.12, W8.teal, { p: [0, 0.035, s * (Z / 2 - 0.06)] }, 0.02, 1);
      b.box(0.12, 0.05, Z, W8.teal, { p: [s * (X / 2 - 0.06), 0.035, 0] }, 0.02, 1);
    }
    for (const sx of [1, -1]) for (const sz of [1, -1]) b.box(0.18, 0.07, 0.18, W8.gold, { p: [sx * (X / 2 - 0.09), 0.04, sz * (Z / 2 - 0.09)] }, 0.03, 1);
    return b.geometry();
  });
}
const chevronGeo = (Z) => cached(`w8:schub:chev:${Z}`, () => {
  const s = new THREE.Shape();
  const w = Z * 0.34, h = Z * 0.4, th = Z * 0.15;
  s.moveTo(-w / 2, h); s.lineTo(-w / 2 + th, h); s.lineTo(w / 2, 0); s.lineTo(-w / 2 + th, -h); s.lineTo(-w / 2, -h); s.lineTo(w / 2 - th, 0); s.lineTo(-w / 2, h);
  return new Build().add(puffyGeo(s, 0.03, 0.012, 2, 1), 0xffffff, { r: [-Math.PI / 2, 0, 0] }).geometry();
});
function buildSchubfeld(opts = {}) {
  const [X, Z] = sz2(opts.size, [3, 2]);
  const root = new THREE.Group();
  const own = [];
  root.add(mesh(schubPlateGeo(X, Z), vcol(0.75, {}, 'w8schub'), {}, false));
  root.children[0].receiveShadow = true;
  const cMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  own.push(cMat);
  const NC = 3;
  const chev = instMesh(chevronGeo(Z), cMat, NC, Math.max(X, Z), 0.1);
  const sand = fxPuffs(12, 0xf8e0a0, { opacity: 0.8, radius: Math.max(X, Z) + 2, cy: 0.3 });
  own.push(sand);
  root.add(chev, sand.mesh);
  const ON = new THREE.Color(0xff9a2a), HOT = new THREE.Color(0xfff0a0), OFF = new THREE.Color(0x8a6a4a);
  const clk = new Clock();
  let emit = 0;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const on = st.on !== false;
    const sp = num(st.speed, 1);
    for (let i = 0; i < NC; i++) {
      setInst(chev, i, (i - (NC - 1) / 2) * X * 0.28, 0.085, 0);
      const ph = ((clk.t * sp * 2.2 - i * 0.33) % 1 + 1) % 1;
      chev.setColorAt(i, on ? _c.copy(ON).lerp(HOT, Math.pow(Math.max(0, 1 - ph * 3), 2)) : OFF);
    }
    chev.instanceMatrix.needsUpdate = true; chev.instanceColor.needsUpdate = true;
    emit -= dt;
    if (on && emit <= 0) { sand.burst([-X / 2 + 0.2, 0.1, (Math.random() - 0.5) * Z * 0.8], { count: 1, speed: 0.3, up: 0.2, size: 0.07, life: 0.9, spread: 0.1 }); emit = 0.12 / sp; }
    // Sandkörner wandern nach +X
    for (const it of sand.items) if (it.age < it.life) it.v.x = 2.4 * sp;
    sand.step(dt);
  };
  return makeModel('schubfeld', root, update, [...own, chev], { initial: 'idle' });
}
const _c = new THREE.Color();

// =============================================================================================
// Lavabrocken-Regen, Lavapfütze, Schockwelle
// =============================================================================================
const L = LAVA7.rot;
const brockenGeo = () => cached('w8:lb:rock', () => new Build().add(lumpyEllipsoid([0.5, 0.45, 0.48], 0.07, 2.6, 3, 20, 14), { v: (x, y, z, nx, ny) => mix(L.crust, L.crustHi, smoothstep(ny * 0.5 + 0.4 + (noise3(x * 4, y * 4, z * 4) - 0.5) * 0.6)) }).geometry());
const brockenGlowGeo = () => cached('w8:lb:glow', () => {
  const b = new Build();
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26, e = (hash1(i) - 0.5) * 1.2;
    const pts = [0, 1, 2, 3].map((k) => { const aa = a + k * 0.25, ee = e + Math.sin(k * 1.7 + i) * 0.25; return [Math.cos(ee) * Math.cos(aa) * 0.5, Math.sin(ee) * 0.46, Math.cos(ee) * Math.sin(aa) * 0.49]; });
    b.add(taperTube(pts, (t) => 0.035 * (1 - t * 0.5), 10, 4), { v: () => col(L.hotter) });
  }
  b.sphere(1, { v: (x, y) => mix(L.hot, L.white, smoothstep(-y * 2 + 0.3)) }, { p: [0, -0.3, 0], s: [0.38, 0.18, 0.38] }, 14, 8);
  return b.geometry();
});
const trailGeo = () => cached('w8:lb:trail', () => {
  const g = new THREE.ConeGeometry(0.42, 2.2, 14, 4, true);
  g.translate(0, 1.1, 0);
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) { const y = P.getY(i); const w = 1 + Math.sin(y * 6 + Math.atan2(P.getZ(i), P.getX(i)) * 3) * 0.12; P.setX(i, P.getX(i) * w); P.setZ(i, P.getZ(i) * w); }
  g.computeVertexNormals();
  return new Build().add(g, { v: (x, y) => (y < 0.9 ? mix(L.white, L.hotter, smoothstep(y / 0.9)) : mix(L.hotter, 0xe8300a, smoothstep((y - 0.9) / 1.2))) }).geometry();
});
function buildLavaRegen(opts = {}) {
  const S = clamp(num(opts.size, 0.8), 0.2, 6);
  const root = new THREE.Group();
  const own = [];
  const flash = ownMat(vcol(0.7, {}, 'w8lb'), { emissive: 0x3a0a00 });
  own.push(flash);
  const spinJ = joint(); spinJ.scale.setScalar(S);
  const rock = mesh(brockenGeo(), flash, {}, true);
  const cracks = mesh(brockenGlowGeo(), glow8(), {});
  spinJ.add(rock, cracks);
  const tMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  own.push(tMat);
  const trail = mesh(trailGeo(), tMat, { p: [0, 0.15 * S, 0], s: S });
  const rMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, toneMapped: false });
  own.push(rMat);
  const ring = mesh(lavaRingGeo('rot'), rMat, {});
  const ND = 10;
  const drops = instMesh(dropletGeo('rot'), glow8(), ND, 3 * S, 0);
  const halo = glowSprite(0xff6a1a, 2.4 * S, 0.0);
  halo.material = halo.material.clone(); own.push(halo.material);
  root.add(spinJ, trail, ring, drops, halo);
  const DR = Array.from({ length: ND }, (_, i) => ({ a: (i / ND) * TAU + hash1(i) * 0.4, v: 1.6 + hash1(i + 2) * 1.5, up: 2.2 + hash1(i + 4) * 1.5 }));
  const clk = new Clock();
  const update = (dt, st) => {
    let anim = st.anim ?? 'fall';
    if (!['fall', 'land', 'glow'].includes(anim)) anim = 'fall';
    clk.tick(dt, anim);
    const t = clk.t;
    let rs = 1, sq = 1, tr = 0, rk = -1, dk = -1, cool = 0;
    if (anim === 'fall') { tr = 1; spinJ.rotation.set(t * 2.2, t * 1.4, t * 1.7); }
    else if (anim === 'land') {
      const p = prog(st, clk, 0.8);
      sq = 1 - Math.sin(clamp(p * 3, 0, 1) * Math.PI) * 0.35; rk = p; dk = p;
      cool = smoothstep((p - 0.4) / 0.6); rs = 1 - smoothstep((p - 0.7) / 0.3);
    } else { spinJ.rotation.set(0.3, t * 0.2, 0.2); }
    spinJ.scale.set(S * rs / Math.sqrt(sq), S * rs * sq, S * rs / Math.sqrt(sq));
    spinJ.visible = rs > 0.01;
    spinJ.position.y = anim === 'land' ? -(1 - sq) * 0.2 * S : 0;
    trail.visible = tr > 0;
    trail.scale.set(S * (0.9 + Math.sin(t * 30) * 0.08), S * (1 + Math.sin(t * 17) * 0.1), S * (0.9 + Math.cos(t * 27) * 0.08));
    flash.emissive.setRGB(0.25 * (1 - cool) + 0.05, 0.05 * (1 - cool), 0);
    cracks.visible = cool < 0.95;
    ring.visible = rk >= 0 && rk < 1;
    if (ring.visible) { ring.position.y = -0.4 * S; ring.scale.set(S * (0.6 + rk * 2.2), S * 0.6, S * (0.6 + rk * 2.2)); rMat.opacity = 1 - rk; rMat.transparent = true; }
    drops.visible = dk >= 0 && dk < 0.9;
    if (drops.visible) {
      DR.forEach((d, i) => { const tt = dk * 0.8; const y = -0.3 * S + (d.up * tt - 4.9 * tt * tt) * S * 0.6; setInst(drops, i, Math.cos(d.a) * d.v * tt * S, Math.max(-0.4 * S, y), Math.sin(d.a) * d.v * tt * S, 0, 0, 0, 0.09 * S * (1 - dk)); });
      drops.instanceMatrix.needsUpdate = true;
    }
    halo.material.opacity = (anim === 'land' ? 0.6 * (1 - cool) : 0.55) * (0.85 + Math.sin(t * 9) * 0.15);
  };
  return makeModel('lavabrocken_regen', root, update, [...own, drops], { initial: 'fall' });
}
function puddleGeo() {
  return cached('w8:pfuetze', () => {
    const s = new THREE.Shape();
    const n = 40;
    for (let i = 0; i <= n; i++) { const a = (i / n) * TAU; const r = 1 + Math.sin(a * 3 + 1) * 0.08 + Math.sin(a * 5) * 0.05; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i === 0) s.moveTo(x, y); else s.lineTo(x, y); }
    const g = new THREE.ShapeGeometry(s, 4);
    g.rotateX(-Math.PI / 2);
    return new Build().add(g, (x, y, z) => mix(L.hotter, L.deep, smoothstep(Math.hypot(x, z) * 0.9 + (noise3(x * 3, 0, z * 3) - 0.5) * 0.5))).geometry();
  });
}
const puddleRimGeo = () => cached('w8:pfuetze:rim', () => {
  const pts = [];
  for (let i = 0; i <= 40; i++) { const a = (i / 40) * TAU; const r = 1.02 + Math.sin(a * 3 + 1) * 0.08 + Math.sin(a * 5) * 0.05; pts.push([Math.cos(a) * r, 0.02, Math.sin(a) * r]); }
  return new Build().add(taperTube(pts, 0.07, 60, 6), { v: (x, y, z, nx, ny) => mix(L.crust, L.crustHi, smoothstep(ny * 0.6 + 0.4)) }).geometry();
});
function buildLavapfuetze(opts = {}) {
  const S = clamp(num(opts.size, 2), 0.3, 20) / 2;
  const root = new THREE.Group();
  const own = [];
  const pMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  own.push(pMat);
  const sj = joint(); sj.scale.setScalar(S);
  const pud = mesh(puddleGeo(), pMat, { p: [0, 0.015, 0] });
  const rim = mesh(puddleRimGeo(), vcol(0.8, {}, 'w8crust'), {}, false);
  const NB = 5;
  const bubbles = instMesh(cached('w8:pf:bub', () => new Build().sphere(1, { v: (x, y) => mix(L.hot, L.white, smoothstep(y + 0.3)) }, {}, 10, 6).geometry()), glow8(), NB, 1.5, 0);
  sj.add(pud, rim, bubbles);
  const halo = glowSprite(0xff6a1a, 2.4 * S, 0.0);
  halo.material = halo.material.clone(); own.push(halo.material);
  halo.position.y = 0.3 * S;
  root.add(sj, halo);
  const BB = Array.from({ length: NB }, (_, i) => ({ x: (hash1(i) - 0.5) * 1.2, z: (hash1(i + 4) - 0.5) * 1.2, ph: hash1(i + 8), sp: 0.6 + hash1(i + 2) * 0.6 }));
  const clk = new Clock();
  const COOL = new THREE.Color(0x4a3030);
  const update = (dt, st) => {
    let anim = st.anim ?? 'idle';
    if (!['idle', 'grow', 'cool'].includes(anim)) anim = 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    let k = 1, cool = 0;
    if (anim === 'grow') k = smoothstep(prog(st, clk, 0.5)) * 0.95 + 0.05;
    if (anim === 'cool') { const p = prog(st, clk, 3); cool = smoothstep(p / 0.7); k = 1 - smoothstep((p - 0.75) / 0.25) * 0.9; }
    sj.scale.set(S * k, S, S * k);
    sj.visible = k > 0.08;
    pMat.color.setRGB(1, 1, 1).lerp(COOL, cool);
    BB.forEach((b, i) => { const p = (t * b.sp + b.ph) % 1; setInst(bubbles, i, b.x, 0.02, b.z, 0, 0, 0, cool > 0.5 ? 0.001 : Math.sin(p * Math.PI) * 0.12 * (p < 0.9 ? 1 : 0)); });
    bubbles.instanceMatrix.needsUpdate = true;
    halo.material.opacity = 0.4 * (1 - cool) * k;
  };
  return makeModel('lavapfuetze', root, update, [...own, bubbles], { initial: 'idle' });
}
const SW = { gold: [0xffe27a, 0xffb81a], weiss: [0xffffff, 0xbfe8ff] };
const waveRingGeo = (c) => cached(`w8:schock:${c}`, () => {
  const C = SW[c] ?? SW.gold;
  const b = new Build();
  b.torus(1, 0.05, { v: (x, y) => mix(C[1], C[0], smoothstep(y / 0.05 * 0.5 + 0.5)) }, { r: [Math.PI / 2, 0, 0], s: [1, 1, 3.5] }, 8, 64);
  const ring2 = new THREE.RingGeometry(0.82, 1.0, 64, 1); ring2.rotateX(-Math.PI / 2);
  b.add(ring2, { v: (x, y, z) => mix(C[1], C[0], smoothstep((Math.hypot(x, z) - 0.82) / 0.18)) }, { p: [0, 0.01, 0] });
  return b.geometry();
});
function buildSchockwelle(opts = {}) {
  const R = clamp(num(opts.radius, 5), 0.5, 40);
  const c = opts.color === 'weiss' ? 'weiss' : 'gold';
  const root = new THREE.Group();
  const own = [];
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  own.push(mat);
  const ring = mesh(waveRingGeo(c), mat, { p: [0, 0.18, 0] });
  const dust = fxPuffs(20, 0xf0e0c0, { opacity: 0.8, radius: R + 2, cy: 0.4 });
  own.push(dust);
  root.add(ring, dust.mesh);
  const clk = new Clock();
  let lastP = 1;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const p = clamp(num(st.progress, prog(st, clk, 0.8)), 0, 1);
    const r = R * (0.1 + 0.9 * p);
    ring.visible = p < 0.999;
    ring.scale.set(r, 1 + Math.sin(p * Math.PI) * 1.5, r);
    mat.opacity = 1 - smoothstep((p - 0.5) / 0.5);
    if (p < lastP - 0.2 || (p < 0.05 && clk.entered)) for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; dust.burst([Math.cos(a) * r, 0.2, Math.sin(a) * r], { count: 1, speed: 2, up: 0.8, size: 0.2, life: 0.6, spread: 0.1 }); }
    lastP = p;
    dust.step(dt);
  };
  return makeModel('schockwelle', root, update, own, { initial: 'idle' });
}

export const MODELS = {
  leuchtsteg: buildLeuchtsteg,
  keksrad: buildKeksrad,
  keks_zahnrad: buildKeksZahnrad,
  riesenrad: buildRiesenrad,
  wasserkoerper: buildWasserkoerper,
  steigbecken: buildSteigbecken,
  stachelblock_blau: buildStachelblock('blau'),
  stachelblock_rot: buildStachelblock('rot'),
  schubfeld: buildSchubfeld,
  lavabrocken_regen: buildLavaRegen,
  lavapfuetze: buildLavapfuetze,
  schockwelle: buildSchockwelle,
};
