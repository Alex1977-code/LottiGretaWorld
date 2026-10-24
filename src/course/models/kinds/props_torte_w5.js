// Torten-Kulisse Welt 5 (5-6 „Torten-Welt“): Torten-Plateau, Sahnetupfer, Tortenkerze, Erdbeere, Keks, Zuckerstange,
// Streusel. Eigene Gestaltung. Maßstab Meter, Ursprung = Mitte der Unterseite, Vorderseite +X; state darf ein String sein.
// Ohne Kollision – Plateaus als Kulisse über/um Kollisionsquader legen (root.userData.top = Oberkante).
//
// torten_plateau  Torte als Plateau: Keksboden, glatter Überzug mit gespritzten Senkrecht-Rillen, Glasur mit Tropfkante,
//                 Sahnetupfer-Kranz, Streusel und Erdbeeren oben.  opts { shape: 'rund' | 'eckig', radius (3; rund),
//                 size: [w, h, d] (eckig, [4, 1,6, 3]), height (2; rund), color: 'rosa' | 'schoko' | 'vanille' | 'erdbeer',
//                 berries (true) }  root.userData.top → Oberkante der Glasur.  state –
// sahnetupfer     Sahnetupfer ≈0,4 m (Sterntülle).  state –  (viele: createInstanced('sahnetupfer', n))
// torten_kerze    Geburtstagskerze: gedrehte Streifen, Wachstropfen, flackernde Flamme.  opts { height (1,2),
//                 color: 'rosa' | 'blau' | 'gelb' | 'gruen' }  state { flicker (0..1), lit (true) }
// erdbeere        Erdbeere ≈0,5 m (glänzend rot, gelbe Nüsschen, Blätterkrone mit Stiel).  opts { size (Faktor, 1) }  state –
// keks            Keks Ø ≈0,7 m, liegend: 'schoko' (Butterkeks mit Schokostücken) | 'doppel' (Doppelkeks mit Creme und
//                 Prägemuster).  opts { kind, size (Faktor) }  state –
// zuckerstange    Zuckerstange ≈1,6 m (rot-weiße Spirale, Haken nach +X; Dicke wächst mit der Höhe).  opts { height (1,6),
//                 color (0xff2a3a) }  state –   deco_w5_zuckerstange: dasselbe für den Baustein deco_w5 ({ height }, 3 m).
// streusel        Streusel-Fleck am Boden (bunte Stäbchen, liegen flach).  opts { radius (1), count (60) }  state –

import {
  THREE, TAU, Build, cached, vcol, mesh, joint, makeModel, Clock, clamp, mix, smoothstep, glowSprite, xf, smoothProfile,
} from '../lib/kit.js';
import { gradV, sahneGeo, sahneMat, flameGeo, glowVcol, hash1, DONUT } from '../lib/w5Geos.js';

const CAKE = {
  rosa: { coat: 0xffa8d0, coatHi: 0xffd8ec, coatLow: 0xe878b0, glaze: 0xff6ab0, pipe: 0xffffff },
  schoko: { coat: 0x8a4a2a, coatHi: 0xb8784a, coatLow: 0x5a2a16, glaze: 0x5a2a16, pipe: 0xfff2e0 },
  vanille: { coat: 0xfff0c0, coatHi: 0xfffae8, coatLow: 0xe8cf90, glaze: 0xffe070, pipe: 0xff8ac0 },
  erdbeer: { coat: 0xfff4f0, coatHi: 0xffffff, coatLow: 0xf0d8d8, glaze: 0xe8283e, pipe: 0xffffff },
};
const CRUMB = { c: 0xd89a50, hi: 0xf0c078, low: 0xa86a30 };

// =============================================================================================
// Erdbeere (auch für die Torte)
// =============================================================================================
/** Erdbeere in einen Build legen (M = Lage der ganzen Beere, Matrix4); lo = sparsam (Torten-Deko). */
function addBerry(b, M, lo = false) {
  const at = (o) => M.clone().multiply(xf(o));
  const prof = [[0, 0], [0.08, 0.02], [0.17, 0.1], [0.22, 0.22], [0.23, 0.32], [0.2, 0.4], [0.12, 0.45], [0, 0.46]];
  b.add(new THREE.LatheGeometry((lo ? prof : smoothProfile(prof, 3)).map(([x, y]) => new THREE.Vector2(x, y)), lo ? 16 : 28), gradV(0xb8102a, 0xff4a5a, 0.6, 0.4), M.clone());
  if (!lo) for (let i = 0; i < 34; i++) {
    const a = i * 2.39996, y = 0.06 + ((i * 0.61803) % 1) * 0.34;
    const r = y < 0.1 ? 0.12 : y < 0.2 ? 0.2 : y < 0.33 ? 0.225 : 0.19;
    b.add(new THREE.SphereGeometry(1, 6, 4), 0xffe04a, at({ p: [Math.cos(a) * r, y, Math.sin(a) * r], s: [0.012, 0.018, 0.012] }));
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    b.add(new THREE.SphereGeometry(1, lo ? 8 : 12, 6), gradV(0x2a8a2a, 0x7ae05a), at({ p: [Math.cos(a) * 0.1, 0.46, Math.sin(a) * 0.1], s: [0.11, 0.02, 0.05], r: [0, -a, -0.35] }));
  }
  b.add(new THREE.CylinderGeometry(0.015, 0.02, 0.1, 6), 0x3a8a2a, at({ p: [0, 0.51, 0], r: [0, 0, 0.3] }));
  return b;
}
const erdbeerGeo = (lo = false) => cached(`w5:erdbeere:${lo}`, () => addBerry(new Build(), new THREE.Matrix4(), lo).geometry());
function buildErdbeere(opts = {}) {
  const s = Math.max(0.2, opts.size ?? 1);
  const root = new THREE.Group();
  root.add(mesh(erdbeerGeo(false), vcol(0.18, {}, 'w5berry'), { s: s * 1.1 }, true));
  return makeModel('erdbeere', root, () => {}, [], { initial: 'idle' });
}

// =============================================================================================
// Torten-Plateau
// =============================================================================================
function cakeGeo(shape, w, h, d, color, berries) {
  const C = CAKE[color] ?? CAKE.rosa;
  return cached(`w5:cake:${shape}:${w}:${h}:${d}:${color}:${berries}`, () => {
    const b = new Build();
    const crumbH = Math.min(0.3, h * 0.15);
    const round = shape === 'rund';
    const R = w / 2;
    // Keksboden
    const crumbV = { v: (x, y, z, nx, ny) => mix(CRUMB.low, CRUMB.hi, smoothstep(ny * 0.5 + 0.5 + (hash1(Math.floor(x * 9) + Math.floor(z * 9) * 31) - 0.5) * 0.3)) };
    if (round) b.cyl(R + 0.05, R + 0.08, crumbH, crumbV, { p: [0, crumbH / 2, 0] }, 64);
    else b.box(w + 0.1, crumbH, d + 0.1, crumbV, { p: [0, crumbH / 2, 0] }, 0.06, 2);
    // Überzug mit Senkrecht-Rillen
    const coatH = h - crumbH;
    if (round) {
      const g = new THREE.CylinderGeometry(R, R, coatH, 96, 2, false);
      const P = g.attributes.position;
      for (let i = 0; i < P.count; i++) {
        const x = P.getX(i), y = P.getY(i), z = P.getZ(i), a = Math.atan2(z, x), rr = Math.hypot(x, z);
        if (rr > R * 0.98) { const k = 1 + 0.018 * Math.cos(a * 32); P.setXYZ(i, x * k, y, z * k); }
      }
      g.computeVertexNormals();
      b.add(g, { v: (x, y, z, nx, ny) => mix(C.coatLow, C.coatHi, smoothstep(ny * 0.4 + 0.5 + nx * 0.3)) }, { p: [0, crumbH + coatH / 2, 0] });
    } else b.box(w, coatH, d, gradV(C.coatLow, C.coatHi, 0.4, 0.5), { p: [0, crumbH + coatH / 2, 0] }, 0.12, 3);
    // Glasur oben mit Tropfkante
    const gl = round ? new THREE.CylinderGeometry(R + 0.03, R + 0.03, 0.22, 96, 3, false) : new THREE.BoxGeometry(w + 0.06, 0.22, d + 0.06, Math.round(w * 8), 3, Math.round(d * 8));
    const P = gl.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      if (y < 0) {
        const u = round ? Math.atan2(z, x) * R : x + z;
        const drip = Math.max(0, Math.sin(u * 2.6 + Math.sin(u * 1.3) * 2)) ** 2 * 0.35;
        P.setY(i, y - drip);
      }
    }
    gl.computeVertexNormals();
    b.add(gl, gradV(mix(C.glaze, 0x000000, 0.15), mix(C.glaze, 0xffffff, 0.3), 0.6, 0.4), { p: [0, h - 0.08, 0] });
    // Sahnetupfer-Kranz am Rand, Streusel und Erdbeeren
    const ring = round ? Math.max(8, Math.round(TAU * R / 0.7)) : 0;
    const dollop = (x, z, s = 1) => { const g = sahneGeo(true).clone(); b.add(g, { v: (xx, yy, zz, nx, ny) => mix(mix(C.pipe, 0x000000, 0.08), C.pipe, smoothstep(ny * 0.6 + 0.6)) }, { p: [x, h + 0.02, z], s }); };
    if (round) for (let i = 0; i < ring; i++) { const a = (i / ring) * TAU; dollop(Math.cos(a) * (R - 0.22), Math.sin(a) * (R - 0.22)); }
    else {
      const nx = Math.max(2, Math.round(w / 0.7)), nz = Math.max(2, Math.round(d / 0.7));
      for (let i = 0; i < nx; i++) for (const s of [1, -1]) dollop(-w / 2 + 0.25 + i * (w - 0.5) / (nx - 1), s * (d / 2 - 0.22));
      for (let i = 1; i < nz - 1; i++) for (const s of [1, -1]) dollop(s * (w / 2 - 0.22), -d / 2 + 0.25 + i * (d - 0.5) / (nz - 1));
    }
    const sp = Math.round((round ? R * R * 3.1 : w * d) * 6);
    for (let i = 0; i < sp; i++) {
      const u = hash1(i * 2.1), v = hash1(i * 5.7);
      let x, z;
      if (round) { const rr = Math.sqrt(u) * (R - 0.5), a = v * TAU; x = Math.cos(a) * rr; z = Math.sin(a) * rr; } else { x = (u - 0.5) * (w - 0.8); z = (v - 0.5) * (d - 0.8); }
      b.capsule(0.022, 0.07, DONUT.sprinkles[i % DONUT.sprinkles.length], { p: [x, h + 0.035, z], r: [Math.PI / 2, 0, hash1(i * 3.3) * TAU], order: 'ZXY' }, 1, 4);
    }
    if (berries) {
      const n = round ? Math.max(3, Math.round(R * 1.5)) : 4;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + 0.3, rr = round ? R * 0.42 : 0;
        const x = round ? Math.cos(a) * rr : (i % 2 ? 1 : -1) * w * 0.22, z = round ? Math.sin(a) * rr : (i < 2 ? 1 : -1) * d * 0.2;
        addBerry(b, xf({ p: [x, h + 0.42, z], s: 0.85, r: [Math.PI - 0.25, a, 0], order: 'YXZ' }), true);
      }
    }
    return b.geometry();
  });
}
function buildTortenPlateau(opts = {}) {
  const shape = opts.shape === 'eckig' ? 'eckig' : 'rund';
  const color = CAKE[opts.color] ? opts.color : 'rosa';
  let w, h, d;
  if (shape === 'rund') { const R = Math.max(0.8, opts.radius ?? 3); w = d = R * 2; h = Math.max(0.5, opts.height ?? 2); }
  else { const s = Array.isArray(opts.size) ? opts.size : [4, 1.6, 3]; w = Math.max(1, s[0]); h = Math.max(0.5, s[1]); d = Math.max(1, s[2]); }
  const root = new THREE.Group();
  const m = mesh(cakeGeo(shape, w, h, d, color, opts.berries !== false), vcol(0.38, {}, 'w5cake'), {}, true);
  m.receiveShadow = true;
  root.add(m);
  root.userData.top = h + 0.02;
  return makeModel('torten_plateau', root, () => {}, [], { initial: 'idle' });
}

// =============================================================================================
// Sahnetupfer
// =============================================================================================
function buildSahnetupfer() {
  const root = new THREE.Group();
  root.add(mesh(sahneGeo(false), sahneMat(), {}, true));
  return makeModel('sahnetupfer', root, () => {}, [], { initial: 'idle' });
}

// =============================================================================================
// Tortenkerze
// =============================================================================================
const KERZE = { rosa: 0xff6ab0, blau: 0x3a8aff, gelb: 0xffc21a, gruen: 0x3ec44a };
function kerzeGeo(H, color) {
  const c = KERZE[color] ?? KERZE.rosa;
  return cached(`w5:kerze:${H}:${color}`, () => {
    const b = new Build();
    const g = new THREE.CylinderGeometry(0.09, 0.1, H, 24, Math.round(H * 24));
    b.add(g, (x, y, z) => ((((Math.floor((y + H / 2) * 10 + Math.atan2(z, x) / TAU * 2) % 2) + 2) % 2) ? c : 0xffffff), { p: [0, H / 2, 0] });
    // Wachstropfen am oberen Rand
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + 0.4, len = 0.05 + hash1(i) * 0.12; b.capsule(0.025, len, 0xfff6fa, { p: [Math.cos(a) * 0.095, H - len / 2 - 0.02, Math.sin(a) * 0.095] }, 2, 6); }
    b.cyl(0.095, 0.095, 0.03, 0xfff6fa, { p: [0, H - 0.005, 0] }, 24);
    b.cyl(0.008, 0.008, 0.07, 0x2a1a10, { p: [0, H + 0.03, 0] }, 5);
    return b.geometry();
  });
}
function buildTortenKerze(opts = {}) {
  const H = Math.max(0.2, opts.height ?? 1.2);
  const color = KERZE[opts.color] ? opts.color : 'rosa';
  const root = new THREE.Group();
  const own = [];
  root.add(mesh(kerzeGeo(H, color), vcol(0.35), {}, true));
  const flame = joint([0, H + 0.04, 0], mesh(flameGeo('gold', 12), glowVcol(), { s: [0.17, 0.26, 0.17] }));
  const glow = glowSprite(0xffd070, 0.8, 0.6);
  glow.material = glow.material.clone(); own.push(glow.material);
  glow.position.y = H + 0.15;
  root.add(flame, glow);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t = clk.t;
    const lit = st.lit !== false;
    flame.visible = glow.visible = lit;
    const fl = clamp(st.flicker ?? 1, 0, 1);
    flame.scale.set(1 + Math.sin(t * 17) * 0.06 * fl, 1 + Math.sin(t * 11) * 0.15 * fl, 1);
    flame.rotation.z = Math.sin(t * 5) * 0.12 * fl;
    glow.material.opacity = 0.5 + Math.sin(t * 13) * 0.1 * fl;
  };
  return makeModel('torten_kerze', root, update, own, { initial: 'idle' });
}

// =============================================================================================
// Keks
// =============================================================================================
function keksGeo(kind) {
  return cached(`w5:keks:${kind}`, () => {
    const b = new Build();
    if (kind === 'doppel') {
      const dark = gradV(0x2a1610, 0x5a3424, 0.5, 0.5);
      for (const y of [0.04, 0.2]) {
        b.lathe([[0, -0.04], [0.33, -0.04], [0.35, -0.02], [0.355, 0.02], [0.33, 0.04], [0, 0.04]], dark, { p: [0, y, 0] }, 40, 2);
        // Prägemuster: Ring aus Knubbeln und Blumen-Mitte
        for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; b.sphere(0.022, 0x4a2a1c, { p: [Math.cos(a) * 0.28, y + 0.042, Math.sin(a) * 0.28], s: [1, 0.4, 1] }, 6, 4); }
        for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; b.sphere(1, 0x4a2a1c, { p: [Math.cos(a) * 0.1, y + 0.042, Math.sin(a) * 0.1], s: [0.06, 0.012, 0.03], r: [0, -a, 0] }, 8, 4); }
      }
      b.cyl(0.32, 0.32, 0.08, 0xfff8f0, { p: [0, 0.12, 0] }, 40);
      return b.geometry();
    }
    b.lathe([[0, 0], [0.33, 0], [0.36, 0.03], [0.365, 0.07], [0.34, 0.1], [0.2, 0.115], [0, 0.12]], { v: (x, y, z, nx, ny) => mix(0xc88a40, 0xf0c070, smoothstep(ny * 0.4 + 0.6 - Math.hypot(x, z) * 0.6)) }, null, 40, 2);
    for (let i = 0; i < 12; i++) {
      const a = i * 2.39996, r = Math.sqrt((i + 0.5) / 12) * 0.28;
      b.add(new THREE.IcosahedronGeometry(0.035, 1), 0x4a2414, { p: [Math.cos(a) * r, 0.115, Math.sin(a) * r], s: [1, 0.6, 1] });
    }
    return b.geometry();
  });
}
function buildKeks(opts = {}) {
  const kind = opts.kind === 'doppel' ? 'doppel' : 'schoko';
  const root = new THREE.Group();
  root.add(mesh(keksGeo(kind), vcol(0.55, {}, 'w5keks'), { s: Math.max(0.2, opts.size ?? 1) }, true));
  return makeModel('keks', root, () => {}, [], { initial: 'idle' });
}

// =============================================================================================
// Zuckerstange (eigene Geometrie mit Spiralstreifen entlang der Röhre)
// =============================================================================================
function zuckerGeo(H, color) {
  return cached(`w5:zucker:${H}:${color}`, () => {
    const R = clamp(H * 0.047, 0.05, 0.2), hook = H * 0.15;
    const pts = [];
    const straight = H - hook - 0.05;
    for (let i = 0; i <= 8; i++) pts.push(new THREE.Vector3(0, (i / 8) * straight, 0));
    for (let i = 1; i <= 16; i++) { const a = Math.PI - (i / 16) * Math.PI * 1.15; pts.push(new THREE.Vector3(hook + Math.cos(a) * hook, straight + Math.sin(a) * hook, 0)); }
    const curve = new THREE.CatmullRomCurve3(pts);
    const TS = 90, RS = 16;
    const g = new THREE.TubeGeometry(curve, TS, R, RS, false);
    const cA = new THREE.Color(color), cB = new THREE.Color(0xffffff);
    const P = g.attributes.position, colors = new Float32Array(P.count * 3);
    const len = curve.getLength();
    for (let i = 0; i < P.count; i++) {
      const ring = Math.floor(i / (RS + 1)), k = i % (RS + 1);
      const u = (ring / TS) * len, v = k / RS;
      const c = (((Math.floor(u * 7 + v * 2) % 2) + 2) % 2) ? cA : cB;
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    // Kappe unten
    const cap = new THREE.CircleGeometry(R, RS); cap.rotateX(Math.PI / 2);
    const cc = new Float32Array(cap.attributes.position.count * 3).fill(1);
    cap.setAttribute('color', new THREE.BufferAttribute(cc, 3));
    cap.deleteAttribute('uv'); g.deleteAttribute('uv');
    const out = new THREE.BufferGeometry();
    const a = g.toNonIndexed(), bb = cap.toNonIndexed();
    const pos = new Float32Array([...a.attributes.position.array, ...bb.attributes.position.array]);
    const nor = new Float32Array([...a.attributes.normal.array, ...bb.attributes.normal.array]);
    const col = new Float32Array([...a.attributes.color.array, ...bb.attributes.color.array]);
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.dispose(); cap.dispose(); a.dispose(); bb.dispose();
    return out;
  });
}
function buildZuckerstange(opts = {}) {
  const H = Math.max(0.4, opts.height ?? 1.6);
  const root = new THREE.Group();
  root.add(mesh(zuckerGeo(H, opts.color ?? 0xff2a3a), vcol(0.15, {}, 'w5candy'), {}, true));
  return makeModel('zuckerstange', root, () => {}, [], { initial: 'idle' });
}

// =============================================================================================
// Streusel
// =============================================================================================
function streuselGeo(R, n) {
  return cached(`w5:streusel:${R}:${n}`, () => {
    const b = new Build();
    for (let i = 0; i < n; i++) {
      const rr = Math.sqrt(hash1(i * 1.9)) * R, a = hash1(i * 7.3) * TAU;
      b.capsule(0.025, 0.08, DONUT.sprinkles[i % DONUT.sprinkles.length], { p: [Math.cos(a) * rr, 0.025, Math.sin(a) * rr], r: [Math.PI / 2, 0, hash1(i * 3.1) * TAU], order: 'ZXY' }, 2, 6);
    }
    return b.geometry();
  });
}
function buildStreusel(opts = {}) {
  const R = Math.max(0.2, opts.radius ?? 1), n = clamp(Math.round(opts.count ?? 60), 5, 300);
  const root = new THREE.Group();
  root.add(mesh(streuselGeo(R, n), vcol(0.3, {}, 'w5sprinkle'), {}, false));
  return makeModel('streusel', root, () => {}, [], { initial: 'idle' });
}

export const MODELS = {
  deco_w5_zuckerstange: (it = {}) => buildZuckerstange({ height: it.height ?? 3 }),
  torten_plateau: buildTortenPlateau,
  sahnetupfer: buildSahnetupfer,
  torten_kerze: buildTortenKerze,
  erdbeere: buildErdbeere,
  keks: buildKeks,
  zuckerstange: buildZuckerstange,
  streusel: buildStreusel,
};
