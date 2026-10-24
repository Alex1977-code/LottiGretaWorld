// Schleich-Festung (5-7) und Ruinen-Tempel (5-Burg) – Kulisse Welt 5. Eigene Gestaltung. Maßstab Meter, Ursprung = Mitte
// der Unterseite (Ausnahmen genannt), Vorderseite +X; state darf ein String sein. Ohne Kollision.
//
// festungsmauer     dunkle Festungsmauer entlang X: schiefer-lila Quader im Verband (gerundete Kanten), Mauerkrone, optional
//                   Zinnen.  opts { length (5), height (3,5), thick (1), zinnen: true }  state –
// zinnen            Zinnenkranz entlang X (auf Mauern setzen): Sockelleiste + Zinnen 0,7 m mit Lücken.
//                   opts { length (4), thick (1) }  state –
// alarmlampe        Alarmlampe an der Wand: **Ursprung = Wandpunkt**, ragt nach +X: Wandplatte, Arm, rote Glaskuppel im
//                   Schutzkorb, Drehspiegel.  state { alarm (bool | 0..1: Kuppel glüht, Lichtfinger kreisen) }
// tempelsaeule      Tempelsäule (Sandstein): Stufensockel, kannelierter Schaft mit lila Zierband und Goldring, Kapitell.
//                   opts { height (4), broken: false (abgebrochen bei ≈ 70 %, gezackte Bruchkante) }  state –
// steinkopf         großer Steinkopf auf Sockel (≈2,3 m): wuchtige Stirn, tiefe Augenhöhlen mit glimmenden lila
//                   Edelstein-Pupillen, breite Nase, Zahn-Mund, lila Stirnband mit Goldnieten, Moos.
//                   opts { size (Faktor, 1) }  state { glow (0..1 Augenglimmen, Standard 0,6) }
// tempeltreppe      Tempeltreppe: Stufen steigen nach +X (Vorderkante der ersten Stufe bei x = 0), Stufenkanten hell,
//                   seitliche Wangen mit Goldkappen.  opts { steps (5), width (3), rise (0,4), run (0,5), walls: true }
//                   root.userData.top → Höhe der obersten Stufe.  state –
// brummbaer_relief  Steinrelief (2,4 × 2,4 m, 0,35 m dick, Bild nach +X): Baron Brummbär als Relief – Bärenkopf mit
//                   Zylinder (rotes Band), Monokel mit Kette (Gold), Schnurrbart, grimmigen Brauen; lila Rahmen mit Gold.
//                   opts { size (Faktor, 1) }  state –

import {
  THREE, TAU, Build, cached, vcol, mesh, joint, makeModel, Clock, damp, clamp, mix, smoothstep, glowSprite, placed,
  puffyStarGeo, smoothNormals,
} from '../lib/kit.js';
import { ownMat, gradV, puffyGeo, mouthShape, roundRectShape, hash1, noise3 } from '../lib/w5Geos.js';

// =============================================================================================
// Festungsmauer / Zinnen
// =============================================================================================
const FM = { stone: 0x55507a, hi: 0x8a86b0, low: 0x302c48, mortar: 0x1c1a2a, cap: 0x6a668e, moss: 0x5a8a3a };
const blockV = (seed) => {
  const h = hash1(seed);
  const base = mix(FM.stone, h > 0.5 ? FM.hi : FM.low, Math.abs(h - 0.5) * 0.6);
  return { v: (x, y, z, nx, ny) => mix(mix(FM.low, base, smoothstep(ny * 0.4 + 0.75)), FM.hi, ny > 0.7 ? 0.25 : 0) };
};
function addMerlons(b, L, T, y0) {
  b.box(L, 0.18, T + 0.1, gradV(FM.low, FM.cap, 0.5, 0.5), { p: [0, y0 + 0.09, 0] }, 0.05, 1);
  const n = Math.max(1, Math.floor((L + 0.45) / 1.15));
  const span = n * 0.7 + (n - 1) * 0.45, x0 = -span / 2 + 0.35;
  for (let i = 0; i < n; i++) b.box(0.7, 0.75, T, blockV(i * 3.7 + 1), { p: [x0 + i * 1.15, y0 + 0.18 + 0.375, 0] }, 0.08, 1);
}
function mauerGeo(L, H, T, zinnen) {
  return cached(`w5:mauer:${L}:${H}:${T}:${zinnen}`, () => {
    const b = new Build();
    b.box(L - 0.16, H - 0.08, T - 0.12, FM.mortar, { p: [0, H / 2, 0] }, 0.02, 1);
    const rows = Math.max(1, Math.round(H / 0.7)), rh = H / rows;
    for (let r = 0; r < rows; r++) {
      let x = -L / 2;
      let i = 0;
      const first = r % 2 ? 0.55 : 1.1;
      while (x < L / 2 - 0.05) {
        const w = Math.min(L / 2 - x, i === 0 ? first : 1.1 + hash1(r * 7 + i) * 0.3);
        b.box(w - 0.06, rh - 0.06, T, blockV(r * 13 + i), { p: [x + w / 2, r * rh + rh / 2, 0] }, 0.07, 1);
        x += w; i++;
      }
    }
    // Moosflecken unten
    for (let i = 0; i < Math.round(L); i++) b.sphere(1, FM.moss, { p: [-L / 2 + 0.5 + i + hash1(i) * 0.4, 0.06, (i % 2 ? 1 : -1) * T / 2], s: [0.25, 0.1, 0.06] }, 10, 6);
    if (zinnen) addMerlons(b, L, T, H);
    return b.geometry();
  });
}
function buildMauer(opts = {}) {
  const L = Math.max(1, opts.length ?? 5), H = Math.max(0.7, opts.height ?? 3.5), T = Math.max(0.4, opts.thick ?? 1);
  const root = new THREE.Group();
  const m = mesh(mauerGeo(L, H, T, opts.zinnen !== false), vcol(0.7, {}, 'w5fort'), {}, true);
  m.receiveShadow = true;
  root.add(m);
  root.userData.top = H;
  return makeModel('festungsmauer', root, () => {}, [], { initial: 'idle' });
}
function buildZinnen(opts = {}) {
  const L = Math.max(1, opts.length ?? 4), T = Math.max(0.4, opts.thick ?? 1);
  const root = new THREE.Group();
  const m = mesh(cached(`w5:zinnen:${L}:${T}`, () => { const b = new Build(); addMerlons(b, L, T, 0); return b.geometry(); }), vcol(0.7, {}, 'w5fort'), {}, true);
  m.receiveShadow = true;
  root.add(m);
  return makeModel('zinnen', root, () => {}, [], { initial: 'idle' });
}

// =============================================================================================
// Alarmlampe
// =============================================================================================
function alarmBaseGeo() {
  return cached('w5:alarm:base', () => {
    const b = new Build();
    const iron = gradV(0x2a2a3a, 0x6a6a84, 0.5, 0.5);
    b.box(0.08, 0.5, 0.5, iron, { p: [0.04, 0, 0] }, 0.03, 2);
    for (const y of [0.17, -0.17]) for (const z of [0.17, -0.17]) b.sphere(0.03, 0xffc21a, { p: [0.09, y, z] }, 8, 6);
    b.box(0.32, 0.1, 0.1, iron, { p: [0.24, 0, 0] }, 0.03, 1);
    b.cyl(0.2, 0.22, 0.1, iron, { p: [0.42, 0.05, 0] }, 24);
    // Schutzkorb
    for (let i = 0; i < 4; i++) b.torus(0.235, 0.012, 0x3a3a48, { p: [0.42, 0.1, 0], r: [0, (i / 4) * Math.PI, 0] }, 4, 20, Math.PI);
    b.torus(0.235, 0.014, 0x3a3a48, { p: [0.42, 0.11, 0], r: [Math.PI / 2, 0, 0] }, 4, 24);
    return b.geometry();
  });
}
function buildAlarmlampe() {
  const root = new THREE.Group();
  const own = [];
  const S = joint();
  S.scale.setScalar(1.35);
  root.add(S);
  S.add(mesh(alarmBaseGeo(), vcol(0.4, { metalness: 0.2 }, 'w5alarm'), {}, true));
  const domeMat = ownMat(vcol(0.15), { emissive: 0x000000, transparent: true, opacity: 0.92 });
  own.push(domeMat);
  const dome = mesh(cached('w5:alarm:dome', () => new Build().dome(0.2, gradV(0xb81a1a, 0xff7a6a), { s: [1, 1.15, 1] }, Math.PI / 2, 24, 10).geometry()), domeMat, { p: [0.42, 0.1, 0] });
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xff4a3a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  own.push(beamMat);
  const beams = joint([0.42, 0.2, 0], mesh(cached('w5:alarm:beams', () => {
    const b = new Build();
    for (const s of [1, -1]) { const g = new THREE.ConeGeometry(0.5, 2.4, 16, 1, true); g.translate(0, -1.2, 0); g.rotateZ(s * Math.PI / 2); b.add(g, 0xffffff, {}); }
    return b.geometry();
  }), beamMat, {}));
  const glow = glowSprite(0xff3a2a, 1.4, 0);
  glow.material = glow.material.clone(); own.push(glow.material);
  glow.position.set(0.42, 0.2, 0);
  S.add(dome, beams, glow);
  const clk = new Clock();
  let k = 0;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const a = typeof st.alarm === 'number' ? clamp(st.alarm, 0, 1) : st.alarm ? 1 : 0;
    k = damp(k, a, 10, dt);
    const pulse = 0.75 + 0.25 * Math.sin(clk.t * 12);
    domeMat.emissive.setRGB(k * pulse * 1.0, k * pulse * 0.12, k * pulse * 0.08);
    beams.rotation.y = clk.t * 6;
    beams.visible = k > 0.02;
    beamMat.opacity = k * 0.22;
    glow.material.opacity = k * 0.8 * pulse;
  };
  return makeModel('alarmlampe', root, update, own, { initial: 'idle' });
}

// =============================================================================================
// Tempel: Säule, Treppe, Steinkopf, Relief
// =============================================================================================
const TP = { stone: 0xf2d29a, hi: 0xfff0cc, low: 0xc89c62, edge: 0xfff8e4, lila: 0x8a3ad8, lilaHi: 0xc08aff, gold: 0xffc21a, goldHi: 0xfff0a0, moss: 0x6aa83a };
const stoneV = gradV(TP.low, TP.hi, 0.45, 0.55);
function saeuleGeo(H, broken) {
  return cached(`w5:saeule:${H}:${broken}`, () => {
    const b = new Build();
    b.box(1.1, 0.22, 1.1, stoneV, { p: [0, 0.11, 0] }, 0.06, 2);
    b.box(0.92, 0.18, 0.92, stoneV, { p: [0, 0.31, 0] }, 0.05, 2);
    b.torus(0.38, 0.06, stoneV, { p: [0, 0.44, 0], r: [Math.PI / 2, 0, 0] }, 8, 32);
    const top = broken ? H * 0.7 : H - 0.55;
    const shaftH = top - 0.44;
    const g = new THREE.CylinderGeometry(0.33, 0.37, shaftH, 48, Math.max(4, Math.round(shaftH * 4)), true);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i), a = Math.atan2(z, x);
      const k = 1 - 0.05 * Math.max(0, Math.cos(a * 12)) ** 2;
      let yy = y;
      if (broken && y > shaftH / 2 - 0.01) yy = y - (0.15 + 0.25 * Math.abs(Math.sin(a * 3 + 1)) + hash1(Math.round(a * 10)) * 0.1);
      P.setXYZ(i, x * k, yy, z * k);
    }
    g.computeVertexNormals();
    b.add(g, { v: (x, y, z, nx) => mix(TP.low, TP.hi, smoothstep(nx * 0.4 + 0.55)) }, { p: [0, 0.44 + shaftH / 2, 0] });
    // lila Zierband mit Goldring (unten)
    b.cyl(0.39, 0.39, 0.16, gradV(0x5a1a9a, TP.lilaHi), { p: [0, 0.75, 0] }, 40);
    b.torus(0.39, 0.03, gradV(0xc88a10, TP.goldHi), { p: [0, 0.84, 0], r: [Math.PI / 2, 0, 0] }, 6, 40);
    b.torus(0.39, 0.03, gradV(0xc88a10, TP.goldHi), { p: [0, 0.66, 0], r: [Math.PI / 2, 0, 0] }, 6, 40);
    if (!broken) {
      b.lathe([[0.33, 0], [0.4, 0.08], [0.52, 0.22], [0.55, 0.3], [0, 0.3]], stoneV, { p: [0, top, 0] }, 40, 1);
      b.box(1.0, 0.24, 1.0, stoneV, { p: [0, top + 0.42, 0] }, 0.06, 2);
      for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + Math.PI / 4; b.sphere(0.06, TP.gold, { p: [Math.cos(a) * 0.62, top + 0.42, Math.sin(a) * 0.62] }, 10, 6); }
    } else {
      b.sphere(1, TP.moss, { p: [0.1, top - 0.1, 0.05], s: [0.3, 0.08, 0.28] }, 12, 6);
    }
    b.sphere(1, TP.moss, { p: [0.45, 0.24, 0.3], s: [0.25, 0.06, 0.2] }, 12, 6);
    return b.geometry();
  });
}
function buildSaeule(opts = {}) {
  const H = Math.max(1.2, opts.height ?? 4);
  const root = new THREE.Group();
  const m = mesh(saeuleGeo(H, !!opts.broken), vcol(0.7, {}, 'w5temple'), {}, true);
  m.receiveShadow = true;
  root.add(m);
  return makeModel('tempelsaeule', root, () => {}, [], { initial: 'idle' });
}
function treppeGeo(n, W, rise, run, walls) {
  return cached(`w5:treppe:${n}:${W}:${rise}:${run}:${walls}`, () => {
    const b = new Build();
    for (let i = 0; i < n; i++) {
      const h = rise * (i + 1);
      b.box(run, h, W, { v: (x, y, z, nx, ny) => (ny > 0.7 ? TP.hi : mix(TP.low, TP.stone, smoothstep(nx * 0.4 + 0.6))) }, { p: [i * run + run / 2, h / 2, 0] }, 0.05, 1);
      b.box(0.08, 0.06, W - 0.1, TP.edge, { p: [i * run + 0.04, h - 0.03, 0] }, 0.025, 1);
    }
    if (walls) {
      const L = n * run;
      for (const s of [1, -1]) {
        // Wange: schräger Steinbalken knapp über den Stufenkanten
        const g = new THREE.BoxGeometry(L, 1, 0.32, 1, 1, 1);
        const P = g.attributes.position;
        for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i); const u = (x + L / 2) / L; const top = rise * n * u + 0.28; P.setY(i, y > 0 ? top : Math.max(0, rise * n * u - 0.5)); P.setX(i, x + L / 2); }
        g.computeVertexNormals();
        b.add(g, gradV(TP.low, TP.stone, 0.5, 0.5), { p: [0, 0, s * (W / 2 + 0.16)] });
        // Pfosten mit Goldkugel unten und oben
        for (const [px, py] of [[0.15, 0.0], [L - 0.15, rise * n]]) {
          b.box(0.42, py + 0.62, 0.42, stoneV, { p: [px, (py + 0.62) / 2, s * (W / 2 + 0.16)] }, 0.06, 2);
          b.sphere(0.12, gradV(0xc88a10, TP.goldHi), { p: [px, py + 0.72, s * (W / 2 + 0.16)] }, 14, 10);
        }
      }
    }
    return b.geometry();
  });
}
function buildTreppe(opts = {}) {
  const n = clamp(Math.round(opts.steps ?? 5), 1, 40), W = Math.max(0.6, opts.width ?? 3), rise = Math.max(0.1, opts.rise ?? 0.4), run = Math.max(0.2, opts.run ?? 0.5);
  const root = new THREE.Group();
  const m = mesh(treppeGeo(n, W, rise, run, opts.walls !== false), vcol(0.72, {}, 'w5temple'), {}, true);
  m.receiveShadow = true;
  root.add(m);
  root.userData.top = n * rise;
  return makeModel('tempeltreppe', root, () => {}, [], { initial: 'idle' });
}
function kopfGeo() {
  return cached('w5:steinkopf', () => {
    const b = new Build();
    const sv = { v: (x, y, z, nx, ny) => { const n = noise3(x * 3, y * 3, z * 3); return mix(mix(TP.low, TP.hi, smoothstep(ny * 0.45 + 0.55 + nx * 0.1)), n > 0.6 ? 0xd8b880 : TP.stone, 0.25); } };
    b.box(1.3, 0.4, 1.3, stoneV, { p: [0, 0.2, 0] }, 0.08, 2);
    // Kopf (leicht verjüngt)
    const g = new THREE.BoxGeometry(1, 1, 1, 8, 8, 8);
    const P = g.attributes.position;
    const r = 0.2;
    for (let i = 0; i < P.count; i++) {
      let x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      // Würfel → Kissen (Kanten mit Radius r abrunden), oben leicht verjüngt
      const cx = clamp(x, -0.5 + r, 0.5 - r), cy = clamp(y, -0.5 + r, 0.5 - r), cz = clamp(z, -0.5 + r, 0.5 - r);
      const dx = x - cx, dy = y - cy, dz = z - cz, l = Math.hypot(dx, dy, dz);
      if (l > 1e-6) { x = cx + (dx / l) * r; y = cy + (dy / l) * r; z = cz + (dz / l) * r; }
      const k = 1 - (y + 0.5) * 0.12;
      P.setXYZ(i, x * 1.1 * k, y * 1.55, z * 1.3 * k);
    }
    b.add(smoothNormals(g), sv, { p: [0, 0.4 + 0.775, 0] });
    const fx = 0.55;
    // Stirnwulst, Augenhöhlen, Nase, Mund
    b.box(0.2, 0.2, 1.2, sv, { p: [fx, 1.55, 0] }, 0.08, 2);
    for (const s of [1, -1]) b.sphere(1, 0x5a4028, { p: [fx - 0.02, 1.33, s * 0.3], s: [0.06, 0.15, 0.2] }, 16, 10);
    b.add(new THREE.CylinderGeometry(0.03, 0.18, 0.5, 4), sv, { p: [fx + 0.06, 1.15, 0], r: [0, Math.PI / 4, 0] });
    b.box(0.1, 0.14, 0.62, 0x4a3020, { p: [fx - 0.02, 0.82, 0] }, 0.04, 1);
    for (let i = 0; i < 4; i++) b.box(0.08, 0.1, 0.12, TP.edge, { p: [fx + 0.01, 0.86, -0.21 + i * 0.14] }, 0.02, 1);
    // Ohren
    for (const s of [1, -1]) b.sphere(1, sv, { p: [0, 1.2, s * 0.68], s: [0.18, 0.28, 0.08] }, 14, 10);
    // lila Stirnband mit Goldnieten
    b.box(1.18, 0.16, 1.48, gradV(0x5a1a9a, TP.lilaHi), { p: [0, 1.82, 0] }, 0.06, 2);
    for (let i = 0; i < 5; i++) b.sphere(0.045, TP.gold, { p: [0.6, 1.82, -0.5 + i * 0.25] }, 10, 6);
    b.add(puffyStarGeo(0.12, 0.055, 0.04, 0.02), TP.goldHi, placed(new THREE.Vector3(0.62, 1.82, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, 1, 1)));
    // Moos
    b.sphere(1, TP.moss, { p: [-0.1, 1.98, 0.3], s: [0.4, 0.08, 0.35] }, 14, 6);
    b.sphere(1, TP.moss, { p: [0.4, 0.42, -0.5], s: [0.3, 0.07, 0.25] }, 12, 6);
    return b.geometry();
  });
}
function buildSteinkopf(opts = {}) {
  const s = Math.max(0.2, opts.size ?? 1);
  const root = new THREE.Group();
  const own = [];
  const body = joint();
  body.scale.setScalar(s);
  body.add(mesh(kopfGeo(), vcol(0.75, {}, 'w5temple'), {}, true));
  const gemMat = ownMat(vcol(0.15), { emissive: 0x000000 });
  own.push(gemMat);
  body.add(mesh(cached('w5:steinkopf:gems', () => { const b = new Build(); for (const z of [0.3, -0.3]) b.sphere(0.075, gradV(0x5a1a9a, 0xe0a8ff), { p: [0.56, 1.33, z] }, 16, 12); return b.geometry(); }), gemMat, {}));
  root.add(body);
  const clk = new Clock();
  const update = (dt, st) => { clk.tick(dt, 'idle'); const g = clamp(st.glow ?? 0.6, 0, 1) * (0.75 + 0.25 * Math.sin(clk.t * 2.2)); gemMat.emissive.setRGB(g * 0.55, g * 0.15, g * 0.9); };
  return makeModel('steinkopf', root, update, own, { initial: 'idle' });
}
function reliefGeo() {
  return cached('w5:relief', () => {
    const b = new Build();
    const fx = 0.175;
    const relV = gradV(0xd8b480, 0xfff2d4, 0.45, 0.6);
    // Tafel mit lila Rahmen und Goldkante
    b.box(0.35, 2.4, 2.4, gradV(TP.low, TP.stone, 0.4, 0.5), { p: [0, 1.2, 0] }, 0.06, 2);
    for (const [y, z, h, w] of [[2.32, 0, 0.16, 2.4], [0.08, 0, 0.16, 2.4], [1.2, 1.12, 2.4, 0.16], [1.2, -1.12, 2.4, 0.16]]) b.box(0.08, h, w, gradV(0x5a1a9a, TP.lilaHi), { p: [fx + 0.02, y, z] }, 0.03, 1);
    for (const [y, z] of [[2.32, 1.12], [2.32, -1.12], [0.08, 1.12], [0.08, -1.12]]) b.sphere(0.07, TP.gold, { p: [fx + 0.06, y, z] }, 10, 8);
    // Bärenkopf (flaches Relief)
    const cy = 1.05;
    b.sphere(1, relV, { p: [fx, cy, 0], s: [0.12, 0.62, 0.66] }, 32, 22);
    for (const s of [1, -1]) { b.sphere(1, relV, { p: [fx, cy + 0.5, s * 0.52], s: [0.08, 0.2, 0.2] }, 16, 12); b.sphere(1, 0xc89c62, { p: [fx + 0.05, cy + 0.5, s * 0.52], s: [0.05, 0.11, 0.11] }, 12, 8); }
    // Schnauze, Nase, Schnurrbart
    b.sphere(1, gradV(0xe8cc98, 0xfff6e0), { p: [fx + 0.08, cy - 0.22, 0], s: [0.1, 0.22, 0.3] }, 20, 14);
    b.sphere(1, 0x5a3a24, { p: [fx + 0.17, cy - 0.12, 0], s: [0.05, 0.08, 0.12] }, 12, 8);
    for (const s of [1, -1]) b.tube([[fx + 0.15, cy - 0.22, s * 0.03], [fx + 0.15, cy - 0.27, s * 0.2], [fx + 0.14, cy - 0.2, s * 0.36], [fx + 0.13, cy - 0.1, s * 0.4]], 0.035, 0x6a4a2c, null, 12, 6);
    // grimmige Brauen, Augen (eingetieft)
    for (const s of [1, -1]) {
      b.capsule(0.045, 0.22, 0x8a6a42, { p: [fx + 0.1, cy + 0.2, s * 0.22], r: [Math.PI / 2 - s * 0.4, 0, 0] }, 3, 8);
      b.sphere(1, 0x3a2414, { p: [fx + 0.07, cy + 0.06, s * 0.22], s: [0.04, 0.07, 0.06] }, 12, 8);
    }
    // Monokel (Gold) mit Kette
    b.torus(0.1, 0.022, gradV(0xc88a10, TP.goldHi), { p: [fx + 0.11, cy + 0.06, -0.22], r: [0, Math.PI / 2, 0] }, 8, 24);
    b.tube([[fx + 0.11, cy - 0.03, -0.3], [fx + 0.12, cy - 0.3, -0.42], [fx + 0.1, cy - 0.5, -0.35]], 0.015, TP.gold, null, 12, 5);
    // Zylinder mit rotem Band
    b.box(0.1, 0.07, 0.95, gradV(0x1e1a24, 0x4a4458), { p: [fx + 0.04, cy + 0.6, 0] }, 0.03, 1);
    b.box(0.09, 0.55, 0.6, gradV(0x1e1a24, 0x4a4458), { p: [fx + 0.03, cy + 0.9, 0] }, 0.05, 2);
    b.box(0.1, 0.11, 0.62, 0xd8283a, { p: [fx + 0.04, cy + 0.7, 0] }, 0.03, 1);
    return b.geometry();
  });
}
function buildRelief(opts = {}) {
  const s = Math.max(0.2, opts.size ?? 1);
  const root = new THREE.Group();
  const m = mesh(reliefGeo(), vcol(0.6, {}, 'w5relief'), { s }, true);
  m.receiveShadow = true;
  root.add(m);
  return makeModel('brummbaer_relief', root, () => {}, [], { initial: 'idle' });
}

export const MODELS = {
  festungsmauer: buildMauer,
  zinnen: buildZinnen,
  alarmlampe: buildAlarmlampe,
  tempelsaeule: buildSaeule,
  steinkopf: buildSteinkopf,
  tempeltreppe: buildTreppe,
  brummbaer_relief: buildRelief,
};
