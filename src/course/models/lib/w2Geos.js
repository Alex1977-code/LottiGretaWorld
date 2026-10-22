// Geteilte Geometrien der Welt-2-Modelle, die es auch als Instanzen gibt (Einzelmodelle in
// kinds/enemies_w2.js bzw. kinds/props_w2.js, Instanz-Helfer in lib/instancedW2.js):
//   Marschblock (Körper zum Einfärben, feste Details, Bein, Musiknote), Wuschel, Sandblock (+ Bröckchen),
//   Kakteen (vier Arten). Maßstab Meter, Ursprung = Fußpunkt, Blick nach +X.

import {
  THREE, TAU, Build, cached, col, mix, smoothstep, eyes, placed, puffyStarGeo, heartShape, circleShape, starShape, onEllipsoid,
  decals, vcol, std, basic, paint, roundedBox, SIDE, canvasTexture,
} from './kit.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { boxUV } from './blockGeos.js';

// =============================================================================================
// Sparsame Augen für Instanzen: Augenweiß + Iris + Pupille (vertexgefärbt) bzw. Glanzpunkte (unbeleuchtet)
// =============================================================================================
function lowEyeGeos(list, iris, pupil = 0.55) {
  const w = new Build(), h = new Build();
  const up = new THREE.Vector3(0, 1, 0);
  for (const e of list) {
    const p = new THREE.Vector3(...e.p), d = new THREE.Vector3(...e.dir).normalize(), r = e.r, sy = e.sy ?? 1.2;
    const side = new THREE.Vector3().crossVectors(up, d).normalize();
    w.sphere(1, 0xffffff, placed(p, d, new THREE.Vector3(r, r * sy, r * 0.55)), 9, 6);
    const pr = r * pupil, f = p.clone().addScaledVector(d, r * 0.5);
    w.sphere(1, iris, placed(f, d, new THREE.Vector3(pr * 1.4, pr * 1.4 * sy, pr * 0.3)), 7, 4);
    w.sphere(1, 0x15101c, placed(f.clone().addScaledVector(d, pr * 0.12), d, new THREE.Vector3(pr, pr * sy * 1.05, pr * 0.3)), 6, 4);
    const h1 = f.clone().addScaledVector(d, pr * 0.3).addScaledVector(up, pr * sy * 0.42).addScaledVector(side, pr * 0.42);
    h.sphere(1, 0xffffff, placed(h1, d, new THREE.Vector3(r * 0.2, r * 0.24, r * 0.1)), 6, 3);
  }
  return { w: w.geometry(), h: h.geometry() };
}

// =============================================================================================
// Marschblock: Bauklotz mit Gesicht, Tschako mit Federbusch, Beinchen mit Stiefeln
// =============================================================================================
export const MB = {
  S: 0.64, LEG: 0.24,
  colors: { red: 0xf0402a, blue: 0x2f7ae8, yellow: 0xffc21a, green: 0x3cbf4a, orange: 0xff8a1f, purple: 0x9a4ae0 },
  hat: 0x1f2a6a, gold: 0xffc21a, plume: 0xff3a4a, sock: 0xffffff, boot: 0x2a1e22, cheek: 0xff8aa0, mouth: 0x7a1a2a,
  tongue: 0xff6a7a, symbol: 0xfff6e0, note: 0xffe14a,
};
export const MB_CY = MB.LEG + MB.S / 2;           // Mitte des Klotzes
export const MB_COLOR_NAMES = Object.keys(MB.colors);
export const mbColor = (c) => (typeof c === 'number' ? c : MB.colors[c] ?? MB.colors.red);

/** Klotz (weiß schattiert → wird über Material-/Instanzfarbe eingefärbt). */
export function mbShellGeo(lo = false) {
  return cached(`w2:mb:shell:${lo}`, () => {
    const b = new Build();
    b.box(MB.S, MB.S, MB.S, { v: (x, y, z, nx, ny, nz) => {
      const flat = Math.max(Math.abs(nx), Math.abs(ny), Math.abs(nz));
      const k = (ny > 0.9 ? 1.0 : ny < -0.5 ? 0.6 : 0.9) - (1 - flat) * 0.55;
      return new THREE.Color(k, k, k);
    } }, { p: [0, MB_CY, 0] }, 0.11, lo ? 1 : 2);
    return b.geometry();
  });
}
const MB_EYES = [
  { p: [MB.S / 2 - 0.02, MB_CY + 0.09, 0.125], r: 0.088, sy: 1.25, dir: [1, 0.08, 0.22] },
  { p: [MB.S / 2 - 0.02, MB_CY + 0.09, -0.125], r: 0.088, sy: 1.25, dir: [1, 0.08, -0.22] },
];
const MB_EYE_OPTS = { key: 'w2:mb', iris: 0x2a3a8a, pupil: 0.58, depth: 0.5 };
/** Gesicht, Tschako, Seiten-Symbole (feste Farben); withEyes = Instanz-Fassung (Augenweiß eingebaut, sparsamer). */
export function mbDetailGeo(withEyes = true) {
  return cached(`w2:mb:detail:${withEyes}`, () => {
    const lo = withEyes;
    const b = new Build();
    const fx = MB.S / 2;
    for (const s of [1, -1]) b.sphere(1, MB.cheek, { p: [fx - 0.005, MB_CY - 0.05, s * 0.2], s: [0.02, 0.045, 0.06] }, lo ? 8 : 10, lo ? 4 : 6);
    // singender Mund (O) mit Zunge
    b.sphere(1, MB.mouth, { p: [fx, MB_CY - 0.1, 0], s: [0.025, 0.065, 0.07] }, lo ? 10 : 14, lo ? 6 : 8);
    b.sphere(1, MB.tongue, { p: [fx + 0.008, MB_CY - 0.135, 0], s: [0.02, 0.025, 0.045] }, lo ? 8 : 10, lo ? 4 : 6);
    // Tschako: Zylinder, Goldband, Schirm, Abzeichen, Federbusch
    const hy = MB.LEG + MB.S, rs = lo ? 12 : 18;
    b.cyl(0.165, 0.185, 0.27, MB.hat, { p: [-0.02, hy + 0.13, 0] }, rs);
    b.cyl(0.168, 0.168, 0.02, MB.gold, { p: [-0.02, hy + 0.265, 0] }, rs);
    b.torus(0.185, 0.022, MB.gold, { p: [-0.02, hy + 0.02, 0], r: [Math.PI / 2, 0, 0] }, lo ? 4 : 6, rs);
    const visor = new THREE.CylinderGeometry(0.2, 0.2, 0.025, lo ? 8 : 16, 1, false, -Math.PI / 2, Math.PI);
    b.add(visor, 0x15183a, { p: [0.0, hy + 0.01, 0], r: [0, 0, -0.18] });
    if (lo) b.extrude(starShape(0.055, 0.025), 0.02, MB.gold, { p: [0.165, hy + 0.14, 0], r: [0, Math.PI / 2, 0] }, 0, 1, 1);
    else b.add(puffyStarGeo(0.055, 0.025, 0.02, 0.008), MB.gold, { p: [0.155, hy + 0.14, 0], r: [0, Math.PI / 2, 0] });
    b.sphere(1, MB.plume, { p: [-0.05, hy + 0.36, 0], s: [0.065, 0.13, 0.065], r: [0, 0, 0.35] }, lo ? 8 : 12, lo ? 6 : 10);
    b.sphere(0.03, MB.gold, { p: [-0.02, hy + 0.27, 0] }, lo ? 6 : 8, lo ? 4 : 6);
    // Spielklotz-Symbole: Stern (rechts, +Z), Herz (links), Kreis (hinten)
    if (lo) {
      b.extrude(starShape(0.17, 0.08), 0.03, MB.symbol, { p: [0, MB_CY, MB.S / 2 + 0.01] }, 0, 1, 1);
      b.extrude(heartShape(0.13), 0.03, MB.symbol, { p: [0, MB_CY + 0.01, -MB.S / 2 - 0.01], r: [0, Math.PI, 0] }, 0, 3, 1);
      b.extrude(circleShape(0.15), 0.03, MB.symbol, { p: [-MB.S / 2 - 0.01, MB_CY, 0], r: [0, -Math.PI / 2, 0] }, 0, 5, 1);
    } else {
      b.add(puffyStarGeo(0.17, 0.08, 0.03, 0.012), MB.symbol, { p: [0, MB_CY, MB.S / 2 + 0.005] });
      b.extrude(heartShape(0.13), 0.03, MB.symbol, { p: [0, MB_CY + 0.01, -MB.S / 2 - 0.005], r: [0, Math.PI, 0] }, 0.01, 8, 2);
      b.extrude(circleShape(0.15), 0.03, MB.symbol, { p: [-MB.S / 2 - 0.005, MB_CY, 0], r: [0, -Math.PI / 2, 0] }, 0.01, 12, 2);
    }
    if (!withEyes) return b.geometry();
    return mergeTwo(b.geometry(), lowEyeGeos(MB_EYES, MB_EYE_OPTS.iris).w);
  });
}
/** Augen als eigene Gruppe (Einzelmodell, blinzelt). */
export const mbEyes = () => eyes(MB_EYES, MB_EYE_OPTS);
/** Glanzpunkte der Augen (unbeleuchtet). */
export function mbHighlightGeo() {
  return cached('w2:mb:hl', () => lowEyeGeos(MB_EYES, MB_EYE_OPTS.iris).h);
}
/** Bein (Ursprung = Hüfte unter dem Klotz): weiße Socke, schwarzer Stiefel. */
export function mbLegGeo(lo = false) {
  return cached(`w2:mb:leg:${lo}`, () => {
    const b = new Build();
    b.cyl(0.05, 0.045, 0.17, MB.sock, { p: [0, -0.085, 0] }, lo ? 6 : 10, true);
    b.sphere(1, MB.boot, { p: [0.035, -0.19, 0], s: [0.105, 0.06, 0.075] }, lo ? 8 : 12, lo ? 5 : 8);
    return b.geometry();
  });
}
/** Achtelnote (≈0,3 m), Ursprung = Mitte des Notenkopfs. */
export function mbNoteGeo(lo = false) {
  return cached(`w2:mb:note:${lo}`, () => {
    const b = new Build();
    b.sphere(1, MB.note, { s: [0.075, 0.055, 0.04], r: [0, 0, 0.45] }, lo ? 8 : 14, lo ? 5 : 8);
    b.cyl(0.014, 0.014, 0.24, MB.note, { p: [0.06, 0.12, 0] }, lo ? 4 : 6, lo);
    b.tube([[0.06, 0.24, 0], [0.11, 0.2, 0], [0.13, 0.13, 0], [0.11, 0.08, 0]], 0.018, MB.note, null, lo ? 6 : 10, lo ? 4 : 5);
    return b.geometry();
  });
}
export const mbNoteMat = () => std('w2:note', { color: 0xffffff, vertexColors: true, roughness: 0.3, emissive: 0x6a5000 });

// =============================================================================================
// Wuschel: violetter Stachel-Wuschelball mit großen Augen und Zahnlücken-Grinsen (Ø ≈ 0,85 m)
// =============================================================================================
export const WU = { core: 0x4a2276, base: 0x5c2a96, tip: 0xff74d4, mouth: 0x2a0e3a, tooth: 0xffffff, cy: 0.45 };
const WU_EYES = [
  { p: [0.25, WU.cy + 0.07, 0.1], r: 0.105, sy: 1.15, dir: [1, 0.15, 0.4] },
  { p: [0.25, WU.cy + 0.07, -0.1], r: 0.105, sy: 1.15, dir: [1, 0.15, -0.4] },
];
const WU_EYE_OPTS = { key: 'w2:wuschel', iris: 0xff3a6a, pupil: 0.38, depth: 0.55 };
/** Kugel mit Stacheln, Mund, Augenweiß (ein Mesh). */
export function wuschelGeo() {
  return cached('w2:wuschel', () => {
    const b = new Build();
    b.sphere(0.27, WU.core, { p: [0, WU.cy, 0] }, 16, 10);
    // Stacheln (Fibonacci-Kugel), Gesicht frei lassen
    const n = 48, L = 0.21;
    const eyeDirs = [new THREE.Vector3(1, 0.3, 0.42).normalize(), new THREE.Vector3(1, 0.3, -0.42).normalize(), new THREE.Vector3(1, -0.45, 0).normalize()];
    for (let i = 0; i < n; i++) {
      const y = 1 - (i + 0.5) * 2 / n, r = Math.sqrt(1 - y * y), a = i * 2.39996;
      const d = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
      if (eyeDirs.some((e) => e.dot(d) > 0.86)) continue;
      const len = L * (0.85 + ((i * 37) % 7) / 20);
      const g = new THREE.ConeGeometry(0.072, len, 5);
      g.rotateX(Math.PI / 2); g.translate(0, 0, len / 2);
      b.add(g, { v: (x, yy, z) => mix(WU.base, WU.tip, Math.pow(Math.max(0, z / len), 1.4)) },
        placed(new THREE.Vector3(d.x * 0.235, WU.cy + d.y * 0.235, d.z * 0.235), d, new THREE.Vector3(1, 1, 1)));
    }
    // breites Grinsen mit Zähnchen
    b.sphere(1, WU.mouth, { p: [0.245, WU.cy - 0.1, 0], s: [0.04, 0.045, 0.13], r: [0, 0, -0.35] }, 10, 6);
    for (const z of [-0.07, 0.07]) b.cone(0.025, 0.05, WU.tooth, { p: [0.272, WU.cy - 0.075, z], r: [0, 0, Math.PI - 0.35] }, 5);
    b.cone(0.022, 0.045, WU.tooth, { p: [0.262, WU.cy - 0.13, 0.0], r: [0, 0, -0.35] }, 5);
    return mergeTwo(b.geometry(), lowEyeGeos(WU_EYES, WU_EYE_OPTS.iris, 0.4).w);
  });
}
export function wuschelHlGeo() {
  return cached('w2:wuschel:hl', () => lowEyeGeos(WU_EYES, WU_EYE_OPTS.iris, 0.4).h);
}

// =============================================================================================
// Sandblock 1 m: weicher, sandgelber Klotz mit Körnung (Textur), hellerer Oberseite, dunklen Kanten
// (Ursprung = Mitte unten). Material sandMat() (Körnungs-Textur × Vertexfarben).
// =============================================================================================
export const SB = { sand: 0xf8d47c, top: 0xffe7a6, edge: 0xd29a48, bottom: 0xc08a40 };
function sandTexture() {
  return canvasTexture('w2:sandgrain', 128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#fbe6b8'; ctx.fillRect(0, 0, w, h);
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 900; i++) {
      const x = rnd() * w, y = rnd() * h, r = 0.6 + rnd() * 1.4, k = rnd();
      ctx.fillStyle = k < 0.55 ? `rgba(170,110,40,${0.25 + rnd() * 0.35})` : k < 0.85 ? `rgba(255,252,235,${0.4 + rnd() * 0.4})` : 'rgba(140,80,30,0.6)';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    // ein paar Kieselchen
    for (let i = 0; i < 6; i++) {
      const x = rnd() * w, y = rnd() * h;
      ctx.fillStyle = 'rgba(200,140,70,0.8)'; ctx.beginPath(); ctx.ellipse(x, y, 3.5, 2.5, rnd() * 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,200,0.8)'; ctx.beginPath(); ctx.arc(x - 1, y - 1, 1.2, 0, Math.PI * 2); ctx.fill();
    }
  }, { repeat: true });
}
export const sandMat = () => std('w2:sand', { map: sandTexture(), vertexColors: true, roughness: 0.92 });
const sandShade = { v: (x, y, z, nx, ny, nz) => {
  const flat = Math.max(Math.abs(nx), Math.abs(ny), Math.abs(nz));
  const base = ny > 0.9 ? SB.top : ny < -0.9 ? SB.bottom : mix(SB.bottom, SB.sand, smoothstep((y + 0.5) / 0.35));
  return mix(base, SB.edge, (1 - flat) * 2.0);
} };
export function sandblockGeo(detail = 'high') {
  return cached(`w2:sandblock:${detail}`, () => {
    const g = roundedBox(1, 1, 1, 0.13, SIDE.ALL, 0, detail === 'high' ? 2 : 1);
    paint(g, sandShade);
    boxUV(g, 1);
    g.translate(0, 0.5, 0);
    g.computeBoundingSphere();
    return g;
  });
}
/** Sand-Bröckchen (Mitte im Ursprung). */
export function sandCrumbGeo() {
  return cached('w2:sandcrumb', () => {
    const g = roundedBox(0.2, 0.2, 0.2, 0.06, SIDE.ALL, 0, 1);
    paint(g, sandShade);
    boxUV(g, 1);
    return g;
  });
}

// =============================================================================================
// Kakteen: 'saeule' (Säulenkaktus mit zwei Armen, 2,2 m), 'kugel' (Kugelkaktus mit Blütenkranz, 0,75 m),
// 'feige' (Feigenkaktus mit Früchten, 1,4 m), 'gruppe' (drei kleine Säulen, 1,1 m)
// =============================================================================================
export const KK = { green: 0x3fae4a, rib: 0x2c8a3a, light: 0x6fd05a, spine: 0xfff6dc, flower: 0xff5aa8, flowerY: 0xffd21f, fruit: 0xe8305a, pot: 0xd8a060 };
export const KAKTUS_VARIANTS = ['saeule', 'kugel', 'feige', 'gruppe'];
const ribbed = (n) => (x, y, z, nx, ny) => {
  if (ny > 0.85) return KK.light;
  const a = Math.atan2(z, x);
  return Math.floor(((a / TAU) + 1) * n * 2) % 2 ? KK.rib : KK.green;
};
function spinesOn(b, c, rad, list) {
  decals(b, list.map(([az, el]) => ({ ...onEllipsoid(c, rad, az, el), r: 0.022 })), 0.022, KK.spine, 0.6);
}
function column(b, x, y0, z, r, h, n = 8, lo = false) {
  b.cyl(r, r, h, ribbed(n), { p: [x, y0 + h / 2, z] }, n * 2);
  b.dome(r, ribbed(n), { p: [x, y0 + h, z] }, Math.PI / 2, n * 2, lo ? 3 : 5);
}
function blossom(b, p, r, color = KK.flower, lo = false) {
  if (lo) {
    b.sphere(1, color, { p, s: [r * 1.1, r * 0.35, r * 1.1] }, 8, 4);
    b.sphere(r * 0.45, KK.flowerY, { p: [p[0], p[1] + r * 0.15, p[2]] }, 6, 3);
    return;
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    b.sphere(1, color, { p: [p[0] + Math.cos(a) * r * 0.7, p[1], p[2] + Math.sin(a) * r * 0.7], s: [r * 0.6, r * 0.3, r * 0.6] }, 8, 5);
  }
  b.sphere(r * 0.45, KK.flowerY, { p: [p[0], p[1] + r * 0.12, p[2]] }, 8, 6);
}
export function kaktusGeo(variant = 'saeule', detail = 'high') {
  const v = KAKTUS_VARIANTS.includes(variant) ? variant : 'saeule';
  return cached(`w2:kaktus:${v}:${detail}`, () => {
    const b = new Build();
    const hi = detail === 'high';
    if (v === 'saeule') {
      column(b, 0, 0, 0, 0.27, 1.95, hi ? 8 : 6, !hi);
      // Arme: waagrecht hinaus, dann hoch
      for (const [s, y, up] of [[1, 0.8, 0.62], [-1, 1.12, 0.45]]) {
        b.capsule(0.15, 0.22, ribbed(6), { p: [0, y, s * 0.33], r: [Math.PI / 2, 0, 0] }, hi ? 3 : 2, hi ? 12 : 8);
        column(b, 0, y, s * 0.47, 0.15, up, hi ? 6 : 4, !hi);
      }
      if (hi) spinesOn(b, [0, 1.2, 0], [0.27, 0.9, 0.27], [[0.4, 0.3], [1.2, -0.2], [2.4, 0.5], [3.4, -0.4], [4.5, 0.1], [5.4, 0.6], [0.9, -0.7], [2.9, -0.8], [5.0, -0.6]]);
      blossom(b, [0, 2.24, 0], 0.11, KK.flower, !hi);
      blossom(b, [0.0, 1.17 + 0.62 + 0.14, 0.47], 0.08, 0xff8a3a, !hi);
    } else if (v === 'kugel') {
      b.sphere(1, ribbed(10), { p: [0, 0.34, 0], s: [0.4, 0.36, 0.4] }, 20, hi ? 12 : 8);
      if (hi) spinesOn(b, [0, 0.34, 0], [0.4, 0.36, 0.4], [[0.3, 0.2], [0.9, -0.1], [1.6, 0.3], [2.2, -0.2], [2.9, 0.25], [3.6, -0.15], [4.2, 0.3], [4.9, -0.2], [5.6, 0.2]]);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; blossom(b, [Math.cos(a) * 0.17, 0.66, Math.sin(a) * 0.17], 0.07, i % 2 ? KK.flower : 0xff8a3a, !hi); }
      blossom(b, [0, 0.7, 0], 0.08, KK.flowerY, !hi);
    } else if (v === 'feige') {
      const paddle = (p, r, s) => b.sphere(1, { v: (x, y, z, nx, ny, nz) => mix(KK.rib, KK.green, smoothstep(Math.abs(nz) + 0.2)) }, { p, r, s }, hi ? 16 : 10, hi ? 10 : 6);
      paddle([0, 0.42, 0], [0, 0.2, 0.05], [0.3, 0.42, 0.09]);
      paddle([0.02, 0.98, 0.18], [0.3, 0.3, -0.45], [0.24, 0.32, 0.08]);
      paddle([-0.02, 0.95, -0.2], [-0.3, -0.2, 0.5], [0.22, 0.3, 0.08]);
      paddle([0.05, 1.28, 0.02], [0, 0.6, 0.1], [0.17, 0.22, 0.07]);
      for (const p of [[0.03, 1.32, 0.38], [0.0, 1.27, -0.38], [0.05, 1.52, 0.06], [0.0, 1.5, -0.08], [0.02, 0.86, 0.3]]) b.sphere(1, KK.fruit, { p, s: [0.06, 0.08, 0.06] }, hi ? 10 : 6, hi ? 8 : 4);
      if (hi) for (const [x, y, z] of [[0.09, 0.5, 0.1], [0.09, 0.3, -0.12], [0.09, 0.62, -0.05], [-0.09, 0.4, 0.12], [0.08, 1.0, 0.18], [0.07, 0.92, -0.25]]) b.sphere(0.018, KK.spine, { p: [x, y, z] }, 6, 4);
    } else {
      column(b, 0, 0, 0, 0.18, 0.85, hi ? 7 : 5, !hi);
      column(b, 0.22, 0, 0.22, 0.13, 0.55, hi ? 6 : 4, !hi);
      column(b, -0.2, 0, 0.18, 0.11, 0.38, hi ? 6 : 4, !hi);
      blossom(b, [0, 1.06, 0], 0.08, KK.flower, !hi);
      blossom(b, [0.22, 0.7, 0.22], 0.06, 0xff8a3a, !hi);
    }
    // Sandkranz am Fuß
    b.dome(1, 0xe8b860, { s: [v === 'feige' ? 0.38 : v === 'gruppe' ? 0.5 : 0.42, 0.07, v === 'gruppe' ? 0.5 : 0.42] }, Math.PI / 2, hi ? 14 : 8, 2);
    return b.geometry();
  });
}
export const kaktusMat = () => vcol(0.55, {}, 'kaktus');

// ------------------------------------------------------------------ Hilfe
function mergeTwo(a, b2) {
  const g = mergeGeometries([a, b2], false);
  a.dispose(); b2.dispose();
  g.computeBoundingSphere();
  return g;
}
export { basic };
