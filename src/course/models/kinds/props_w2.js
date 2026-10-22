// Requisiten Welt 2 (Kurs-Modus): Wüste, Kulisse, rosa Grasland, Weltraum. Eigene Gestaltung. Maßstab Meter,
// Ursprung = Fußpunkt (Mitte der Unterseite), Blick/Vorderseite nach +X; state darf ein String sein.
//
// sandblock        1 m  weicher sandgelber Bröselblock mit Körnung (Ursprung = Mitte unten).
//                  state { anim: 'idle'|'shake'|'crumble'|'gone', crumble? (0..1) }  shake: zittert (Warnung);
//                  crumble: sackt in 0,6 s zusammen und zerrieselt (oder fest über crumble 0..1); gone: weg.
//                  Viele → createInstanced('sandblock', n) (lib/instanced.js).
// treibsand        Treibsand-Becken: nasse, dunkle Sandfläche (y = 0,03) mit Spiralwirbel, der sich zur Mitte dreht,
//                  und hellem Sandwall ringsum (0,12 m hoch, 0,36 m breit, außerhalb von size).
//                  opts { size: [x, z] (Standard [4, 4]), depth (0: flach; > 0: Trichter, Mitte so viel tiefer) }
//                  state { speed (rad/s, Standard 0,7) }
// kaktus           Kaktus.  opts { variant: 'saeule' (2,3 m, zwei Arme, Blüten) | 'kugel' (0,75 m, Blütenkranz) |
//                  'feige' (1,6 m, Feigenkaktus mit Früchten) | 'gruppe' (1,1 m, drei kleine Säulen), size (1) }
//                  state –  Viele → createInstanced('kaktus', n, { variant }).
// palme            Dattelpalme ≈4,5 m: geschuppter, leicht gebogener Stamm, sieben Wedel, drei Nüsse.
//                  opts { height (4,5), lean (0,25 rad, Neigung nach +X) }  state { sway (0..1 Windstärke, Standard 0,3) }
// ruine_saeule     Säulenruine: Sockel, kannelierter Schaft, abgebrochen mit Bruchkante (oder mit Kapitell), Schutt.
//                  opts { height (3), broken (true) }
// sandsteinbogen   Felsbogen aus geschichtetem rotem Sandstein; Füße bei z = ±width/2, Durchgang entlang ±X.
//                  opts { width (5, Abstand der Fußmitten), height (4, Scheitel-Oberkante), thickness (1,1) }
// pyramide         Stufenpyramide aus Sandstein mit Goldspitze und dunklem Eingang (vorn, +X); Kulisse.
//                  opts { size (8, Grundkante), steps (5) }  Höhe ≈ 0,62·size.
// fliese           bewegliche Brückenfliese: Sandsteinplatte mit Goldrand und türkisem Rauten-Mosaik.
//                  Ursprung = Mitte der Unterseite, Oberseite bei y = thick.  opts { size: [x, z] ([2, 2]), thick (0,4) }
//                  state { anim: 'idle'|'shake', glow (0..1, Mosaik leuchtet) }
// bluetenbaum      Kirschblütenbaum für das rosa Grasland (≈4 m): Stamm, Krone aus rosa Blütenballen.
//                  opts { size (4) }  state { sway (0..1) }
// planet           Weltraum-Kulisse: gestreifter Planet mit schrägem Ring, dreht sich langsam. Mitte bei y = radius.
//                  opts { radius (3), color: 'orange'|'blue'|'violet'|'green', ring (true) }

import {
  THREE, TAU, Build, cached, vcol, std, basic, mesh, joint, makeModel, Clock, damp, clamp, col, mix, smoothstep, lerp,
  instMesh, setInst, canvasTexture, onEllipsoid, decals, glowSprite,
} from '../lib/kit.js';
import { sandblockGeo, sandCrumbGeo, sandMat, kaktusGeo, kaktusMat, KAKTUS_VARIANTS } from '../lib/w2Geos.js';

const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// =============================================================================================
// Sandblock
// =============================================================================================
function buildSandblock() {
  const root = new THREE.Group();
  const sink = joint();
  sink.add(mesh(sandblockGeo('high'), sandMat(), {}, true));
  sink.children[0].receiveShadow = true;
  const crumbs = instMesh(sandCrumbGeo(), sandMat(), 10, 1.6, 0.4);
  crumbs.castShadow = true;
  root.add(sink, crumbs);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    let k = st.crumble !== undefined ? clamp(st.crumble, 0, 1) : anim === 'crumble' ? clamp(age / 0.6, 0, 1) : anim === 'gone' ? 1 : 0;
    const shake = anim === 'shake' ? 0.03 : k > 0 && k < 1 ? 0.02 : 0;
    sink.position.set(Math.sin(t * 47) * shake, 0, Math.cos(t * 41) * shake);
    sink.scale.set(1 - k * 0.3, Math.max(0.001, 1 - k * 0.9), 1 - k * 0.3);
    sink.visible = k < 0.97;
    crumbs.visible = k > 0.02 && k < 0.999;
    if (crumbs.visible) {
      for (let i = 0; i < 10; i++) {
        const a = hash(i) * TAU, r = 0.3 + hash(i + 9) * 0.25;
        const y = Math.max(0.08, (1 - k * 0.9) - k * k * (0.8 + hash(i + 3)) + 0.1);
        setInst(crumbs, i, Math.cos(a) * r * (1 + k * 0.6), y, Math.sin(a) * r * (1 + k * 0.6), a * 2 + k * 3, a, k * 2, (1 - k * 0.7) * (0.6 + hash(i + 5) * 0.6));
      }
      crumbs.instanceMatrix.needsUpdate = true;
    }
  };
  return makeModel('sandblock', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Treibsand
// =============================================================================================
function swirlTexture() {
  return canvasTexture('w2:swirl', 256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w * 0.62);
    g.addColorStop(0, '#6e4418'); g.addColorStop(0.3, '#a8702e'); g.addColorStop(0.75, '#d49a4a'); g.addColorStop(1, '#e2ae5e');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // Spiralarme (dunkel) mit hellen Kämmen
    for (let arm = 0; arm < 5; arm++) {
      for (let i = 0; i < 140; i++) {
        const k = i / 140, a = arm * TAU / 5 + k * 6.2, r = (1 - k) * w * 0.6;
        const x = w / 2 + Math.cos(a) * r, y = h / 2 + Math.sin(a) * r;
        ctx.fillStyle = `rgba(90,52,16,${0.25 + k * 0.4})`;
        ctx.beginPath(); ctx.arc(x, y, 2 + (1 - k) * 8, 0, TAU); ctx.fill();
        ctx.fillStyle = `rgba(255,226,160,${0.35 * (1 - k)})`;
        ctx.beginPath(); ctx.arc(x + Math.cos(a + 1.6) * 7, y + Math.sin(a + 1.6) * 7, 1.5 + (1 - k) * 3, 0, TAU); ctx.fill();
      }
    }
    // Sog-Loch in der Mitte
    const c = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, 26);
    c.addColorStop(0, 'rgba(40,22,6,0.95)'); c.addColorStop(1, 'rgba(40,22,6,0)');
    ctx.fillStyle = c; ctx.fillRect(0, 0, w, h);
  });
}
function quicksandGeo(sx, sz, depth) {
  return cached(`w2:qs:${sx}:${sz}:${depth}`, () => {
    const nx = Math.max(8, Math.round(sx * 4)), nz = Math.max(8, Math.round(sz * 4));
    const g = new THREE.PlaneGeometry(sx, sz, nx, nz);
    g.rotateX(-Math.PI / 2);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const u = P.getX(i) / (sx / 2), v = P.getZ(i) / (sz / 2);
      const r = Math.min(1, Math.max(Math.abs(u), Math.abs(v)) * 0.55 + Math.hypot(u, v) * 0.45);
      P.setY(i, -depth * Math.pow(1 - r, 1.6));
    }
    g.computeVertexNormals();
    return g;
  });
}
function quicksandRimGeo(sx, sz) {
  return cached(`w2:qs:rim:${sx}:${sz}`, () => {
    const b = new Build();
    const c = { v: (x, y, z, nx, ny) => mix(0xd8a650, 0xffe2a0, smoothstep(ny * 0.8 + 0.2)) };
    for (const s of [1, -1]) {
      b.box(sx + 0.36, 0.14, 0.36, c, { p: [0, 0.05, s * (sz / 2 + 0.06)] }, 0.07, 1);
      b.box(0.36, 0.14, sz - 0.2, c, { p: [s * (sx / 2 + 0.06), 0.05, 0] }, 0.07, 1);
    }
    // Sandhäufchen auf dem Rand
    for (let i = 0; i < 6; i++) {
      const side = i % 4, t = hash(i) - 0.5;
      const p = side < 2 ? [t * sx, 0.1, (side ? -1 : 1) * (sz / 2 + 0.08)] : [(side === 2 ? 1 : -1) * (sx / 2 + 0.08), 0.1, t * sz];
      b.dome(0.16 + hash(i + 3) * 0.08, 0xf2cc84, { p, s: [1.4, 0.45, 1.1] }, Math.PI / 2, 10, 3);
    }
    return b.geometry();
  });
}
function buildTreibsand(opts = {}) {
  const sz = Array.isArray(opts.size) ? opts.size : [Number(opts.size ?? 4), Number(opts.size ?? 4)];
  const depth = Number(opts.depth ?? 0);
  const root = new THREE.Group();
  const tex = swirlTexture().clone();
  tex.center.set(0.5, 0.5);
  tex.needsUpdate = true;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, color: 0xffffff });
  const surf = mesh(quicksandGeo(sz[0], sz[1], depth), mat, { p: [0, 0.03, 0] });
  surf.receiveShadow = true;
  const rim = mesh(quicksandRimGeo(sz[0], sz[1]), vcol(0.85), {}, true);
  rim.receiveShadow = true;
  root.add(surf, rim);
  const clk = new Clock();
  let a = Math.random() * TAU;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    a += dt * (st.speed ?? 0.7);
    tex.rotation = a;
  };
  return makeModel('treibsand', root, update, [tex, mat]);
}

// =============================================================================================
// Kaktus
// =============================================================================================
function buildKaktus(opts = {}) {
  const v = KAKTUS_VARIANTS.includes(opts.variant) ? opts.variant : 'saeule';
  const root = new THREE.Group();
  const m = mesh(kaktusGeo(v, 'high'), kaktusMat(), {}, true);
  m.scale.setScalar(Number(opts.size ?? 1));
  root.add(m);
  return makeModel('kaktus', root, () => {});
}

// =============================================================================================
// Palme
// =============================================================================================
const PA = { bark: 0x9a6a3a, barkDark: 0x6a4420, frond: 0x3fae3a, frondDark: 0x1f7a2a, frondTip: 0x8fe05a, nut: 0x6a3e1c };
/** Wedel als gefaltetes Band mit Fiederzacken entlang einer hängenden Kurve (Ursprung = Ansatz, Richtung +X). */
function frondGeo(len) {
  return cached(`w2:frond:${len}`, () => {
    const N = 14, pos = [], colA = [];
    const pt = (t) => new THREE.Vector3(t * len, Math.sin(t * 2.2) * len * 0.28 - t * t * len * 0.55, 0);
    const c1 = new THREE.Color(), push = (p, c) => { pos.push(p.x, p.y, p.z); colA.push(c.r, c.g, c.b); };
    for (let i = 0; i < N; i++) {
      const t0 = i / N, t1 = (i + 1) / N;
      const p0 = pt(t0), p1 = pt(t1);
      const w0 = Math.sin(Math.PI * Math.min(1, t0 * 1.15 + 0.05)) * len * 0.2 * (i % 2 ? 0.75 : 1.0);
      const w1 = Math.sin(Math.PI * Math.min(1, t1 * 1.15 + 0.05)) * len * 0.2 * ((i + 1) % 2 ? 0.75 : 1.0);
      const fold = -0.25;
      for (const s of [1, -1]) {
        const a0 = p0.clone().add(new THREE.Vector3(0, w0 * fold, s * w0)), a1 = p1.clone().add(new THREE.Vector3(0, w1 * fold, s * w1));
        const cA = c1.copy(col(PA.frondDark)).lerp(col(PA.frond), 0.4 + 0.6 * t0).clone();
        const cB = c1.copy(col(PA.frond)).lerp(col(PA.frondTip), t1 * 0.8).clone();
        if (s > 0) { push(p0, cA); push(a0, cB); push(p1, cA); push(p1, cA); push(a0, cB); push(a1, cB); }
        else { push(p0, cA); push(p1, cA); push(a0, cB); push(p1, cA); push(a1, cB); push(a0, cB); }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colA, 3));
    g.computeVertexNormals();
    return g;
  });
}
function palmTrunkGeo(h, lean) {
  return cached(`w2:palm:trunk:${h}:${lean}`, () => {
    const b = new Build();
    const n = Math.round(h / 0.38);
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      const x0 = Math.sin(t0 * 1.3) * lean * h * 0.6, x1 = Math.sin(t1 * 1.3) * lean * h * 0.6;
      const len = Math.hypot(x1 - x0, h / n);
      const r0 = 0.2 - t0 * 0.07, r1 = 0.2 - t1 * 0.07;
      b.cyl(r1 + 0.03, r0 * 0.92, len * 1.02, { v: (x, y) => mix(PA.barkDark, PA.bark, smoothstep((y / len) + 0.5)) },
        { p: [(x0 + x1) / 2, (t0 + t1) / 2 * h, 0], r: [0, 0, -Math.atan2(x1 - x0, h / n)] }, 12);
    }
    return b.geometry();
  });
}
function palmCrownGeo(scale) {
  return cached(`w2:palm:crown:${scale}`, () => {
    const b = new Build();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + 0.3;
      const len = (1.7 + hash(i) * 0.5) * scale;
      const g = frondGeo(Math.round(len * 10) / 10).clone();
      const m = new THREE.Matrix4().makeRotationY(a).multiply(new THREE.Matrix4().makeRotationZ(0.35 + hash(i + 2) * 0.25));
      g.applyMatrix4(m);
      b.parts.push(g);
    }
    for (let i = 0; i < 3; i++) { const a = i * 2.1; b.sphere(0.12 * scale, PA.nut, { p: [Math.cos(a) * 0.14 * scale, -0.12 * scale, Math.sin(a) * 0.14 * scale] }, 12, 8); }
    b.sphere(0.16 * scale, PA.barkDark, { p: [0, -0.02, 0] }, 12, 8);
    return b.geometry();
  });
}
function buildPalme(opts = {}) {
  const h = Number(opts.height ?? 4.5), lean = Number(opts.lean ?? 0.25);
  const root = new THREE.Group();
  root.add(mesh(palmTrunkGeo(h, lean), vcol(0.8), {}, true));
  const topX = Math.sin(1.3) * lean * h * 0.6;
  const crown = joint([topX, h, 0], mesh(palmCrownGeo(h / 4.5), vcol(0.6, { side: THREE.DoubleSide }, 'leafDS'), {}, true));
  root.add(crown);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t = clk.t, w = st.sway ?? 0.3;
    crown.rotation.z = Math.sin(t * 1.3) * 0.06 * w - 0.02;
    crown.rotation.x = Math.sin(t * 0.9 + 1) * 0.05 * w;
    crown.rotation.y = Math.sin(t * 0.4) * 0.1 * w;
  };
  return makeModel('palme', root, update);
}

// =============================================================================================
// Kulisse: Säulenruine, Felsbogen, Pyramide
// =============================================================================================
const SS = { light: 0xf2d29a, mid: 0xe2b878, dark: 0xc0904e, red: 0xd8743a, redLight: 0xf09a5a, redDark: 0xa8502a, gold: 0xffc21a, door: 0x2a1a10 };
function buildRuine(opts = {}) {
  const h = Number(opts.height ?? 3), broken = opts.broken !== false;
  const geo = cached(`w2:ruine:${h}:${broken}`, () => {
    const b = new Build();
    b.box(1.1, 0.3, 1.1, { v: (x, y, z, nx, ny) => mix(SS.dark, SS.light, smoothstep(ny * 0.5 + 0.5)) }, { p: [0, 0.15, 0] }, 0.05, 1);
    b.box(0.95, 0.18, 0.95, SS.mid, { p: [0, 0.39, 0] }, 0.04, 1);
    const top = broken ? h - 0.35 : h - 0.35;
    const flute = (x, y, z) => (Math.floor((Math.atan2(z, x) / TAU + 1) * 24) % 2 ? SS.light : SS.mid);
    b.cyl(0.34, 0.38, top - 0.48, flute, { p: [0, 0.48 + (top - 0.48) / 2, 0] }, 24);
    if (broken) {
      // Bruchkante: schräg abgebrochene Brocken
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU, hh = 0.12 + hash(i) * 0.35;
        b.box(0.3, hh, 0.26, i % 2 ? SS.light : SS.mid, { p: [Math.cos(a) * 0.2, top + hh / 2 - 0.05, Math.sin(a) * 0.2], r: [hash(i + 1) * 0.4, a, hash(i + 2) * 0.4] }, 0.04, 1);
      }
      // Schutt am Fuß
      for (let i = 0; i < 4; i++) {
        const a = i * 1.7 + 0.5, r = 0.85 + hash(i + 7) * 0.3, s = 0.15 + hash(i + 4) * 0.12;
        b.box(s * 1.6, s, s * 1.3, i % 2 ? SS.mid : SS.light, { p: [Math.cos(a) * r, s / 2, Math.sin(a) * r], r: [0, a, hash(i) * 0.3] }, 0.04, 1);
      }
    } else {
      b.cyl(0.5, 0.36, 0.2, SS.mid, { p: [0, top + 0.1, 0] }, 24);
      b.box(1.1, 0.16, 1.1, SS.light, { p: [0, top + 0.28, 0] }, 0.04, 1);
    }
    return b.geometry();
  });
  const root = new THREE.Group();
  const m = mesh(geo, vcol(0.85), {}, true); m.receiveShadow = true;
  root.add(m);
  return makeModel('ruine_saeule', root, () => {});
}
function buildBogen(opts = {}) {
  const w = Number(opts.width ?? 5), h = Number(opts.height ?? 4), th = Number(opts.thickness ?? 1.1);
  const geo = cached(`w2:bogen:${w}:${h}:${th}`, () => {
    const b = new Build();
    const layer = (x, y) => {
      const k = Math.floor((y + hash(Math.floor(x * 3)) * 0.05) / 0.32) % 3;
      return k === 0 ? SS.red : k === 1 ? SS.redLight : SS.redDark;
    };
    const R = w / 2, H = h - th / 2;
    const pts = [];
    for (let i = 0; i <= 18; i++) {
      const a = Math.PI * (i / 18);
      pts.push(new THREE.Vector3(0, Math.sin(a) * (H - th * 0.6) + th * 0.6, Math.cos(a) * R));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.TubeGeometry(curve, 36, th / 2, 12, false);
    tube.scale(1.15, 1, 1);
    b.add(tube, layer, null);
    for (const s of [1, -1]) {
      b.cyl(th * 0.55, th * 0.75, th * 1.3, layer, { p: [0, th * 0.65, s * R] }, 14);
      b.sphere(th * 0.62, SS.redDark, { p: [hash(s + 3) * 0.2, 0.05, s * (R + 0.2)], s: [1.2, 0.35, 1] }, 12, 6);
    }
    return b.geometry();
  });
  const root = new THREE.Group();
  const m = mesh(geo, vcol(0.9), {}, true); m.receiveShadow = true;
  root.add(m);
  return makeModel('sandsteinbogen', root, () => {});
}
function buildPyramide(opts = {}) {
  const size = Number(opts.size ?? 8), steps = Math.max(2, Math.round(opts.steps ?? 5));
  const geo = cached(`w2:pyr:${size}:${steps}`, () => {
    const b = new Build();
    const H = size * 0.62, sh = H / (steps + 0.6);
    for (let i = 0; i < steps; i++) {
      const s = size * (1 - i / (steps + 0.4));
      b.box(s, sh, s, { v: (x, y, z, nx, ny) => (ny > 0.9 ? col(SS.light) : mix(SS.dark, SS.mid, smoothstep((y / sh) + 0.5))) }, { p: [0, sh * (i + 0.5), 0] }, Math.min(0.15, sh * 0.2), 1);
    }
    const capS = size * (1 - steps / (steps + 0.4)) * 0.9;
    b.add(new THREE.ConeGeometry(capS * 0.72, sh * 1.6, 4), SS.gold, { p: [0, sh * steps + sh * 0.8, 0], r: [0, Math.PI / 4, 0] });
    b.box(0.1, sh * 1.3, size * 0.12, SS.door, { p: [size / 2 + 0.01, sh * 0.65, 0] }, 0, 1);
    b.box(0.14, 0.14, size * 0.16, SS.light, { p: [size / 2 + 0.03, sh * 1.35, 0] }, 0.03, 1);
    return b.geometry();
  });
  const root = new THREE.Group();
  const m = mesh(geo, vcol(0.9), {}, true); m.receiveShadow = true;
  root.add(m);
  return makeModel('pyramide', root, () => {});
}

// =============================================================================================
// Fliese
// =============================================================================================
function buildFliese(opts = {}) {
  const sz = Array.isArray(opts.size) ? opts.size : [Number(opts.size ?? 2), Number(opts.size ?? 2)];
  const th = Number(opts.thick ?? 0.4);
  const root = new THREE.Group();
  const shake = joint();
  const base = mesh(cached(`w2:fliese:${sz}:${th}`, () => {
    const b = new Build();
    b.box(sz[0], th, sz[1], { v: (x, y, z, nx, ny) => (ny > 0.9 ? col(SS.light) : mix(SS.dark, SS.mid, smoothstep(y / th + 0.5))) }, { p: [0, th / 2, 0] }, 0.07, 2);
    // Goldrand oben
    for (const s of [1, -1]) {
      b.box(sz[0] - 0.12, 0.03, 0.07, SS.gold, { p: [0, th + 0.005, s * (sz[1] / 2 - 0.12)] }, 0.01, 1);
      b.box(0.07, 0.03, sz[1] - 0.12, SS.gold, { p: [s * (sz[0] / 2 - 0.12), th + 0.005, 0] }, 0.01, 1);
    }
    return b.geometry();
  }), vcol(0.7), {}, true);
  base.receiveShadow = true;
  const inlayMat = new THREE.MeshStandardMaterial({ color: 0x2fc8c0, roughness: 0.3, emissive: 0x000000 });
  const inlay = mesh(cached(`w2:fliese:inlay:${sz}`, () => {
    const s = new THREE.Shape();
    const a = Math.min(sz[0], sz[1]) * 0.32;
    s.moveTo(a, 0); s.lineTo(0, a); s.lineTo(-a, 0); s.lineTo(0, -a); s.lineTo(a, 0);
    const hole = new THREE.Path(); const c = a * 0.45;
    hole.moveTo(c, 0); hole.lineTo(0, -c); hole.lineTo(-c, 0); hole.lineTo(0, c); hole.lineTo(c, 0);
    s.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    return g;
  }), inlayMat, { p: [0, th - 0.01, 0] });
  const dot = mesh(cached('w2:fliese:dot', () => new THREE.CylinderGeometry(0.1, 0.1, 0.03, 16)), inlayMat, { p: [0, th + 0.005, 0] });
  shake.add(base, inlay, dot);
  root.add(shake);
  const clk = new Clock();
  let g = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    const s = anim === 'shake' ? 0.03 : 0;
    shake.position.set(Math.sin(t * 43) * s, 0, Math.cos(t * 37) * s);
    shake.rotation.z = Math.sin(t * 29) * s * 0.5;
    g = damp(g, clamp(st.glow ?? 0, 0, 1), 8, dt);
    const p = g * (0.75 + Math.sin(t * 5) * 0.25);
    inlayMat.emissive.setRGB(p * 0.2, p * 0.8, p * 0.75);
  };
  return makeModel('fliese', root, update, [inlayMat], { initial: 'idle' });
}

// =============================================================================================
// Blütenbaum
// =============================================================================================
const BT = { bark: 0x7a4a2e, barkDark: 0x5a3220, blossom: 0xff9ad0, blossomLight: 0xffe0f0, blossomDark: 0xe8609e };
function buildBluetenbaum(opts = {}) {
  const S = Number(opts.size ?? 4) / 4;
  const root = new THREE.Group();
  const trunk = mesh(cached(`w2:btree:trunk`, () => {
    const b = new Build();
    b.tube([[0, 0, 0], [0.05, 0.8, 0], [-0.08, 1.6, 0.05], [0.02, 2.3, 0]], 0.17, { v: (x, y, z, nx) => mix(BT.barkDark, BT.bark, smoothstep(nx + 0.5)) }, null, 12, 10);
    b.tube([[-0.05, 1.5, 0.03], [-0.5, 2.1, 0.2], [-0.75, 2.5, 0.3]], 0.08, BT.bark, null, 8, 6);
    b.tube([[0.03, 1.8, 0], [0.45, 2.3, -0.2], [0.7, 2.6, -0.25]], 0.07, BT.bark, null, 8, 6);
    b.dome(1, 0x5fbf4a, { s: [0.45, 0.08, 0.45] }, Math.PI / 2, 12, 3);
    return b.geometry();
  }), vcol(0.85), {}, true);
  trunk.scale.setScalar(S);
  const crown = joint([0, 2.6 * S, 0]);
  crown.add(mesh(cached('w2:btree:crown', () => {
    const b = new Build();
    const blobs = [[0, 0.35, 0, 0.95], [-0.75, 0.05, 0.3, 0.7], [0.7, 0.1, -0.25, 0.72], [0.1, 0.0, 0.75, 0.62], [0.05, 0.05, -0.75, 0.62], [-0.3, 0.8, -0.2, 0.6], [0.4, 0.75, 0.3, 0.55]];
    for (const [x, y, z, r] of blobs) {
      b.sphere(r, { v: (xx, yy, zz, nx, ny) => mix(BT.blossomDark, mix(BT.blossom, BT.blossomLight, smoothstep(ny)), smoothstep(ny + 0.8)) }, { p: [x, y, z] }, 16, 12);
    }
    for (let i = 0; i < 14; i++) {
      const a = hash(i) * TAU, el = hash(i + 5) * 1.2 - 0.2;
      b.sphere(0.07, 0xffffff, { p: [Math.cos(a) * Math.cos(el) * 1.0, 0.3 + Math.sin(el) * 0.9, Math.sin(a) * Math.cos(el) * 1.0] }, 6, 4);
    }
    return b.geometry();
  }), vcol(0.7), {}, true));
  crown.scale.setScalar(S);
  root.add(trunk, crown);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t = clk.t, w = st.sway ?? 0.3;
    crown.rotation.z = Math.sin(t * 1.1) * 0.04 * w;
    crown.rotation.x = Math.sin(t * 0.8 + 2) * 0.04 * w;
  };
  return makeModel('bluetenbaum', root, update);
}

// =============================================================================================
// Planet
// =============================================================================================
const PL = {
  orange: [0xff9a3a, 0xffd07a, 0xe0602a, 0xfff0c0],
  blue: [0x3a8aff, 0x8ad0ff, 0x2a5ad8, 0xe0f4ff],
  violet: [0x9a5ae8, 0xd0a0ff, 0x6a32b8, 0xffe0ff],
  green: [0x3fc87a, 0xa0f0b0, 0x24985a, 0xf0fff0],
};
function buildPlanet(opts = {}) {
  const R = Number(opts.radius ?? 3), key = PL[opts.color] ? opts.color : 'orange', ring = opts.ring !== false;
  const C = PL[key];
  const root = new THREE.Group();
  const spin = joint([0, R, 0]);
  spin.add(mesh(cached(`w2:planet:${key}`, () => {
    const b = new Build();
    b.sphere(1, (x, y) => {
      const k = Math.floor((y + 1) * 4.5);
      return [C[0], C[1], C[2], C[1], C[0]][k % 5];
    }, null, 40, 24);
    // Krater/Flecken
    const hits = [[0.5, 0.3, 0.16], [2.2, -0.2, 0.12], [3.9, 0.5, 0.1], [5.0, -0.45, 0.14]].map(([az, el, r]) => ({ ...onEllipsoid([0, 0, 0], [1, 1, 1], az, el), r }));
    decals(b, hits, 0.12, C[2], 0.25);
    return b.geometry();
  }), vcol(0.6), { s: R }, false));
  if (ring) {
    const r = mesh(cached(`w2:planet:ring:${key}`, () => {
      const b = new Build();
      b.add(new THREE.RingGeometry(1.35, 1.9, 48, 1), { v: (x, y) => (Math.hypot(x, y) > 1.62 ? col(C[3]) : col(C[1])) }, { r: [-Math.PI / 2, 0, 0] });
      return b.geometry();
    }), vcol(0.5, { side: THREE.DoubleSide }, 'ringDS'), { s: R, r: [0.35, 0, 0.25] });
    spin.add(r);
  }
  root.add(spin);
  const clk = new Clock();
  const update = (dt) => { clk.tick(dt, 'idle'); spin.children[0].rotation.y = clk.t * 0.15; };
  return makeModel('planet', root, update);
}

export const MODELS = {
  sandblock: buildSandblock,
  treibsand: buildTreibsand,
  kaktus: buildKaktus,
  palme: buildPalme,
  ruine_saeule: buildRuine,
  sandsteinbogen: buildBogen,
  pyramide: buildPyramide,
  fliese: buildFliese,
  bluetenbaum: buildBluetenbaum,
  planet: buildPlanet,
};
