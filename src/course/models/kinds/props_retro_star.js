// Kulisse Welt Stern „Sternenzelt“, Teil 2: Retro-Blockland (S-5), Riesen-Dschungel (S-7), verschneiter Nebelfriedhof (S-8).
// Eigene Gestaltung, Kartenqualität, ohne Spielzeug-Look (`toy: false`), backbar (undurchsichtig vertexgefärbt). Maßstab Meter,
// Vorderseite +X, Ursprung = Fußpunkt (Ausnahmen genannt); state darf ein String sein.
// Wiederverwendet: Grabstein-Form mit Lachgesicht (hwGeos.graveGeo, Halloween) für schneegrab; Nebel: vorhandenes 'nebelschwaden'
// (opts color/opacity) passt zum Nebelfriedhof.
//
// retro_block      Riesenblock im Pixel-Retro-Look (S-5): gerundeter Würfel, jede Seite ein 8 × 8-Pixelbild.
//                  'gras' (grüne Pixeldecke mit Tropfkante, Erde mit Steinchen), 'erde', 'ziegel' (Pixel-Ziegel), 'frage' (Goldblock mit
//                  Pixel-Funkelstern und Eck-Nieten), 'hart' (Hartblock mit Pixel-Fase und Raute).
//                  **Ursprung = Mitte der Unterseite.**  opts { kind ('gras'), size (Kante, 2) }  state –
//                  Viele: createInstanced('retro_block', n, { kind, size }) (lib/instanced_star.js).
// retro_wolke      Retro-Wolke: Treppen-Umriss aus großen Pixeln, puffig, weiß mit hellblauem Unterbauch und Pixel-Glanzlichtern.
//                  **Ursprung = Mitte der Unterkante.**  opts { size (Breite, 4), seed (0..2: Umriss) }  state –
// retro_busch      Retro-Busch: grüner Treppen-Umriss mit Pixel-Tupfen.  opts { size (Breite, 3), seed (0..2) }  state –
// riesenpflanze    übergroße Dschungelpflanzen (S-7): 'blume' (≈8 m: geschwungener Stängel, zwei Blätter, Blüte aus zehn rosa
//                  Blütenblättern um eine Samenscheibe, nach +X geneigt), 'pilz' (≈7 m: bauchiger Stiel mit Manschette, rot-orange Kappe
//                  Ø ≈7 m mit weißen Tupfen und Lamellen), 'blatt' (≈6 m lang: Riesenblatt auf kurzem Stiel, bogig nach +X, Adern).
//                  opts { kind ('blume'), size (Höhe bzw. Länge; Standard je Art) }  state –
// schneegrab       Grabstein im Schnee (S-8): Grabstein mit Lachgesicht (Halloween-Form), Schneehaube, Schnee auf dem Sockel,
//                  Schneehügel, Eiszapfen. opts { kind: 'rund'|'kreuz'|'spitz', size (Höhe, 1,2), tilt (rad) }  state –

import { THREE, TAU, Build, cached, mesh, joint, makeModel, clamp, col, mix, smoothstep, lerp, placed, roundedBox, SIDE, onLathe } from '../lib/kit.js';
import {
  ST, num, gradV, noise3, hash1, taperTube, memo, kulS, kulSD, puffyGeo, stepShape, k2, recolor, lumpyEllipsoid, flatStarGeo,
} from '../lib/starGeos.js';
import { graveGeo } from '../lib/hwGeos.js';

// =============================================================================================
// Retro-Block
// =============================================================================================
export const RETRO_KINDS = ['gras', 'erde', 'ziegel', 'frage', 'hart'];
const rk = (k) => (RETRO_KINDS.includes(k) ? k : 'gras');
/** Pixelfarbe: Art, Fläche ('top'|'side'|'bottom'), Zelle i (links → rechts), j (unten → oben), 0..7. */
function retroPixel(kind, face, i, j) {
  const h = hash1(i * 13 + j * 7 + (face === 'top' ? 101 : 0));
  if (kind === 'gras' || kind === 'erde') {
    const grass = kind === 'gras';
    if (face === 'top') return grass ? (h > 0.78 ? ST.rGrassHi : (i + j) % 2 && h > 0.5 ? 0x4ac83a : ST.rGrass) : (h > 0.8 ? ST.rEarthHi : ST.rEarth);
    if (face === 'bottom') return ST.rEarthLow;
    const drip = grass && (j >= 6 || (j === 5 && hash1(i * 3.1) > 0.45) || (j === 4 && hash1(i * 5.7) > 0.8));
    if (drip) return j === 7 ? ST.rGrassHi : ST.rGrass;
    if (h > 0.86) return ST.rEarthLow;
    if (h < 0.08) return ST.rEarthHi;
    return (i + j) % 3 === 0 && h > 0.6 ? 0xc87038 : ST.rEarth;
  }
  if (kind === 'ziegel') {
    const row = Math.floor(j / 2), off = row % 2 ? 2 : 0;
    const joint = (i + off) % 4 === 0;
    if (joint) return ST.rBrickLow;
    return j % 2 === 1 ? ST.rBrickHi : ST.rBrick;
  }
  if (kind === 'frage') {
    const x = i - 3.5, y = j - 3.5;
    if ((i === 0 || i === 7) && (j === 0 || j === 7)) return 0x9a5a0a;
    if (i === 0 || j === 0) return 0xffe07a;
    if (i === 7 || j === 7) return 0xc8780a;
    const star = (Math.abs(x) < 1 && Math.abs(y) < 3) || (Math.abs(y) < 1 && Math.abs(x) < 3) || (Math.abs(x) < 1.6 && Math.abs(y) < 1.6);
    return star ? (y > 0 ? 0xffffff : 0xfff0c8) : ST.gold;
  }
  // hart
  const x = i - 3.5, y = j - 3.5;
  if (i === 0 || j === 7) return ST.rHardHi;
  if (i === 7 || j === 0) return ST.rHardLow;
  if (Math.abs(x) + Math.abs(y) < 2.2) return Math.abs(x) + Math.abs(y) < 1.2 ? ST.rHardHi : ST.rHardLow;
  return ST.rHard;
}
/** Retro-Block Kante S (Ursprung Mitte unten). lo: Unterseite ohne Pixel. */
export function retroBlockGeo(kind, S = 2, lo = false) {
  return cached(`star:retro:${kind}:${k2(S)}:${lo}`, () => {
    const b = new Build();
    const r = S * 0.07;
    const edge = { gras: ST.rEarthLow, erde: ST.rEarthLow, ziegel: ST.rBrickLow, frage: 0xb8700a, hart: ST.rHardLow }[kind];
    b.add(roundedBox(S, S, S, r, SIDE.ALL, 0, 1), { v: (x, y, z) => (kind === 'gras' && y > S * 0.75 ? col(ST.rGrassLow) : col(edge)) }, { p: [0, S / 2, 0] });
    const w = S - 2 * r * 0.85, o = S / 2 + 0.004;
    const faces = [
      ['top', [0, S + 0.004, 0], [-Math.PI / 2, 0, 0]],
      ['side', [o, S / 2, 0], [0, Math.PI / 2, 0]], ['side', [-o, S / 2, 0], [0, -Math.PI / 2, 0]],
      ['side', [0, S / 2, o], [0, 0, 0]], ['side', [0, S / 2, -o], [0, Math.PI, 0]],
    ];
    if (!lo) faces.push(['bottom', [0, -0.004, 0], [Math.PI / 2, 0, 0]]);
    for (const [face, p, rot] of faces) {
      const g = new THREE.PlaneGeometry(w, w, 8, 8);
      b.add(g, (x, y) => { const i = clamp(Math.floor((x / w + 0.5) * 8), 0, 7), j = clamp(Math.floor((y / w + 0.5) * 8), 0, 7); return retroPixel(kind, face, i, j); }, { p, r: rot });
    }
    return b.geometry();
  });
}
export const retroMat = () => kulS(0.38);
function buildRetroBlock(opts = {}) {
  const kind = rk(opts.kind);
  const S = clamp(num(opts.size, 2), 0.2, 30);
  const root = new THREE.Group();
  const m = mesh(retroBlockGeo(kind, S), retroMat(), {}, true);
  m.receiveShadow = true;
  root.add(m);
  root.userData.top = S;
  return makeModel('retro_block', root, () => {}, []);
}

// =============================================================================================
// Retro-Wolke, Retro-Busch
// =============================================================================================
const WOLKE_COLS = [[2, 3, 3, 4, 5, 5, 4, 5, 5, 4, 3, 2], [2, 3, 4, 4, 3, 4, 5, 5, 4, 3, 3, 2], [1, 2, 3, 4, 4, 5, 5, 4, 4, 3, 2, 1]];
const BUSCH_COLS = [[1, 2, 3, 3, 2, 3, 4, 4, 3, 2, 1], [1, 2, 2, 3, 4, 4, 3, 3, 2, 2, 1], [1, 2, 3, 4, 3, 2, 3, 4, 3, 2, 1]];
function pixelPuffGeo(cols, cell, depth, colors, key) {
  return cached(`star:pixpuff:${key}:${k2(cell)}`, () => {
    const b = new Build();
    const g = puffyGeo(stepShape(cols, cell, cell * 0.35), depth, cell * 0.35, 4, 3);
    const H = Math.max(...cols) * cell;
    b.add(g, { v: (x, y, z, nx, ny) => mix(colors[0], mix(colors[1], colors[2], smoothstep(y / H * 1.2 - 0.1)), smoothstep(ny * 0.5 + 0.6 + y / H * 0.4)) });
    // Pixel-Tupfen vorn und hinten (Glanzlichter / Blattpunkte)
    const n = cols.length, w = n * cell;
    for (let i = 0; i < n; i++) {
      const top = cols[i];
      for (let j = 1; j < top; j++) {
        if (hash1(i * 17 + j * 5 + key.length) < 0.72) continue;
        for (const s of [1, -1]) b.box(cell * 0.55, cell * 0.55, 0.04, colors[3], { p: [-w / 2 + (i + 0.5) * cell, (j - 0.5) * cell + cell * 0.3, s * (depth / 2 + cell * 0.36)] }, cell * 0.12, 1);
      }
    }
    return b.geometry();
  });
}
function buildRetroWolke(opts = {}) {
  const seed = clamp(Math.round(num(opts.seed, 0)), 0, 2);
  const W = clamp(num(opts.size, 4), 0.5, 60);
  const cols = WOLKE_COLS[seed], cell = W / cols.length;
  const root = new THREE.Group();
  root.add(mesh(pixelPuffGeo(cols, cell, cell * 2.2, [0xb8d8ff, 0xeef6ff, 0xffffff, 0xd4e8ff], `wolke${seed}`), kulS(0.45), {}, true));
  return makeModel('retro_wolke', root, () => {}, []);
}
function buildRetroBusch(opts = {}) {
  const seed = clamp(Math.round(num(opts.seed, 0)), 0, 2);
  const W = clamp(num(opts.size, 3), 0.5, 60);
  const cols = BUSCH_COLS[seed], cell = W / cols.length;
  const root = new THREE.Group();
  root.add(mesh(pixelPuffGeo(cols, cell, cell * 2.6, [ST.rBushLow, ST.rBush, ST.rBushHi, 0x7ae85a], `busch${seed}`), kulS(0.5), {}, true));
  return makeModel('retro_busch', root, () => {}, []);
}

// =============================================================================================
// Riesenpflanzen
// =============================================================================================
/** Blattform (Spitze nach +X, Länge L, Breite W), Stiel bei x = 0. */
function leafShape(L, W) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(L * 0.2, W * 0.55, L * 0.7, W * 0.6, L, 0);
  s.bezierCurveTo(L * 0.7, -W * 0.6, L * 0.2, -W * 0.55, 0, 0);
  return s;
}
function blumeGeo() {
  return memo('star:rpfl:blume', () => {
    const b = new Build();
    const stemPts = [[0, 0, 0], [0.5, 2.2, 0.1], [0.1, 4.6, -0.1], [0.5, 6.4, 0], [1.0, 7.1, 0]];
    b.add(taperTube(stemPts, (t) => 0.42 * (1 - t * 0.35), 40, 12), { v: (x, y, z, nx) => mix(ST.leafLow, ST.stemHi, smoothstep(nx * 0.4 + 0.45 + (noise3(x, y * 2, z) - 0.5) * 0.3)) });
    // zwei Blätter
    for (const [y, s, len] of [[2.0, 1, 3.2], [3.6, -1, 2.8]]) {
      const g = puffyGeo(leafShape(len, len * 0.42), 0.08, 0.06, 10, 2);
      // flach legen (Rx), Spitze leicht heben (Rz), zur Seite ±Z drehen (Ry)
      const M = new THREE.Matrix4().makeTranslation(0.35, y, s * 0.2)
        .multiply(new THREE.Matrix4().makeRotationY(-s * Math.PI / 2))
        .multiply(new THREE.Matrix4().makeRotationZ(0.22))
        .multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
      b.add(g, { v: (x, yy, z) => { const u = x / len; const vein = Math.abs(((u * 6 - Math.abs(yy) * 3.5 / len * 2) % 1 + 1) % 1 - 0.5) < 0.05 || Math.abs(yy) < 0.05; return vein ? col(ST.leafHi) : mix(ST.leafLow, ST.leaf, smoothstep(u * 1.2)); } }, M);
    }
    // Blütenkopf bei (1,1, 7,2, 0), Fläche schräg nach +X oben
    const head = new THREE.Matrix4().compose(new THREE.Vector3(1.15, 7.25, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.75)), new THREE.Vector3(1, 1, 1));
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      const pg = new THREE.SphereGeometry(1, 14, 8);
      const M = head.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * 1.15, 0.12 + (i % 2) * 0.05, Math.sin(a) * 1.15), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a, 0.18)), new THREE.Vector3(1.05, 0.16, 0.48)));
      b.add(pg, { v: (x, y, z) => mix(ST.petal, ST.petalHi, smoothstep(x * 0.9 + 0.2)) }, M);
    }
    b.add(new THREE.SphereGeometry(1, 24, 14), { v: (x, y, z, nx, ny) => { const r = Math.hypot(x, z); return (Math.floor(r * 9 + Math.atan2(z, x) * 1.6) % 2 && ny > 0.3) ? col(0xd8780a) : mix(0xe89a0a, 0xffe03a, smoothstep(ny * 0.7 + 0.2)); } }, head.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(0, 0.25, 0), new THREE.Quaternion(), new THREE.Vector3(0.75, 0.32, 0.75))));
    // Kelchblätter
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + 0.3; b.add(new THREE.SphereGeometry(1, 8, 5), ST.leaf, head.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * 0.45, -0.12, Math.sin(a) * 0.45), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a, -0.5)), new THREE.Vector3(0.5, 0.1, 0.22)))); }
    return b.geometry();
  });
}
function pilzGeo() {
  return memo('star:rpfl:pilz', () => {
    const b = new Build();
    b.lathe([[0, 0], [1.05, 0], [1.2, 0.3], [1.15, 1.2], [0.98, 2.6], [0.85, 4.0], [0.8, 4.9], [0, 4.95]], { v: (x, y, z, nx) => mix(ST.stalkLow, ST.stalk, smoothstep(nx * 0.4 + 0.5 + (noise3(x, y, z) - 0.5) * 0.3)) }, null, 28, 2);
    // Manschette
    b.lathe([[0.9, 3.55], [1.5, 3.25], [1.45, 3.35], [0.86, 3.75]], { v: (x, y, z, nx, ny) => mix(0xe8dcc8, 0xffffff, smoothstep(ny * 0.5 + 0.5)) }, null, 28);
    // Kappe mit Lamellen unten
    const cap = [[0, 4.4], [1.0, 4.45], [2.4, 4.3], [3.35, 4.25], [3.55, 4.5], [3.4, 5.1], [2.8, 5.95], [1.7, 6.6], [0, 6.85]];
    b.lathe(cap, { v: (x, y, z, nx, ny) => {
      if (ny < -0.3) { const a = Math.atan2(z, x); return (Math.floor(a / TAU * 64 + 64) % 2) ? col(0xf4dcc0) : col(ST.gill); }
      return mix(0xd8481a, mix(0xff6a2a, 0xffa06a, smoothstep(ny * 0.6)), smoothstep(ny * 0.5 + 0.5));
    } }, null, 40, 2);
    // weiße Tupfen
    const T = [[0, 1.3, 0.75], [1.2, 0.85, 0.6], [2.4, 0.95, 0.65], [3.6, 0.8, 0.55], [4.8, 0.9, 0.6], [0.6, 0.35, 0.45], [1.8, 0.4, 0.42], [3.0, 0.38, 0.45], [4.2, 0.36, 0.42], [5.4, 0.42, 0.44]];
    for (const [az, el, r] of T) {
      const h = onLathe(cap, 4.5, az, el);
      if (!h) continue;
      b.add(new THREE.SphereGeometry(1, 12, 6), { v: (x, y, z, nx, ny) => mix(0xf0e8e0, 0xffffff, smoothstep(ny)) }, placed(h.p.addScaledVector(h.n, 0.02), h.n, new THREE.Vector3(r, r, r * 0.25)));
    }
    return b.geometry();
  });
}
function blattGeo() {
  return memo('star:rpfl:blatt', () => {
    const b = new Build();
    const L = 6, W = 2.4, nu = 24, nv = 10, th = 0.07;
    const base = new THREE.Vector3(0.3, 1.0, 0);
    const P = (u, v, s) => {
      const w = W * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.05)), 0.75) * (1 - u * 0.25);
      const x = base.x + u * L;
      const y = base.y + Math.sin(u * Math.PI * 0.85) * 1.1 - u * u * 1.2 + Math.abs(v) * w * 0.18 + s * th * 0.5;
      return [x, y, v * w / 2];
    };
    const tris = (s) => {
      const pos = [];
      for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
        const u0 = i / nu, u1 = (i + 1) / nu, v0 = -1 + (2 * j) / nv, v1 = -1 + (2 * (j + 1)) / nv;
        const a = P(u0, v0, s), bb = P(u1, v0, s), c = P(u1, v1, s), d = P(u0, v1, s);
        if (s > 0) pos.push(...a, ...d, ...c, ...a, ...c, ...bb); else pos.push(...a, ...c, ...d, ...a, ...bb, ...c);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
      return g;
    };
    const leafC = { v: (x, y, z) => { const u = (x - base.x) / L; return mix(mix(ST.leafLow, ST.leaf, smoothstep(u * 1.4 + 0.1)), ST.leafHi, smoothstep(1 - Math.abs(z) / W * 2.4) * 0.25); } };
    b.add(tris(1), leafC);
    b.add(tris(-1), { v: (x) => mix(0x1a5a2a, 0x3a9a4a, smoothstep((x - base.x) / L)) });
    // Seitenadern (helle Röhrchen auf der Oberseite)
    for (let k = 1; k <= 6; k++) for (const sg of [1, -1]) {
      const u0 = k / 7.5;
      const pts = [0, 0.33, 0.66, 1].map((q) => { const u = u0 + q * 0.12, v = sg * q * 0.8; const p = P(u, v, 1); return [p[0], p[1] + 0.012, p[2]]; });
      b.add(taperTube(pts, (t) => 0.035 * (1 - t * 0.7), 10, 4), ST.leafHi);
    }
    // Mittelrippe und Stiel
    const rib = Array.from({ length: 9 }, (_, i) => P(i / 8 * 0.95, 0, 1));
    b.add(taperTube(rib, (t) => 0.09 * (1 - t * 0.8), 24, 6), ST.leafHi);
    b.add(taperTube([[0, 0, 0], [0.05, 0.5, 0], [0.18, 0.9, 0], [base.x, base.y, 0]], (t) => 0.16 * (1 - t * 0.3), 12, 8), { v: (x, y) => mix(ST.leafLow, ST.stem, smoothstep(y)) });
    return b.geometry();
  });
}
const PFL = { blume: [blumeGeo, 8], pilz: [pilzGeo, 7], blatt: [blattGeo, 6] };
function buildRiesenpflanze(opts = {}) {
  const kind = PFL[opts.kind] ? opts.kind : 'blume';
  const [geo, std] = PFL[kind];
  const S = clamp(num(opts.size, std), 0.3, 100) / std;
  const root = new THREE.Group();
  const m = mesh(geo(), kulS(0.5), { s: S }, true);
  m.receiveShadow = true;
  root.add(m);
  return makeModel('riesenpflanze', root, () => {}, []);
}

// =============================================================================================
// Grabstein im Schnee
// =============================================================================================
function schneegrabGeo(kind) {
  return memo(`star:schneegrab:${kind}`, () => {
    const b = new Build();
    const h = 1, w = h * 0.68, d = h * 0.2;
    // Moos → Raureif, Stein leicht bläulich
    const g = recolor(graveGeo(kind, h, false, true), (c, hs) => {
      const hue = hs.h * 360;
      if (hue > 70 && hue < 170 && hs.s > 0.2) return mix(ST.snowLow, ST.snow, hs.l);
      return null;
    });
    b.parts.push(g);
    const snowV = { v: (x, y, z, nx, ny) => mix(ST.snowShade, ST.snow, smoothstep(ny * 0.7 + 0.45)) };
    // Schneehaube
    if (kind === 'kreuz') {
      b.sphere(1, snowV, { p: [0, h * 1.06, 0], s: [d * 0.85, 0.07, w * 0.22] }, 14, 8);
      for (const s of [1, -1]) b.sphere(1, snowV, { p: [0, h * 0.06 + h * 0.62 + w * 0.2 + 0.02, s * w * 0.36], s: [d * 0.8, 0.06, w * 0.17] }, 12, 6);
    } else if (kind === 'spitz') {
      b.sphere(1, snowV, { p: [0, h * 0.98, 0], s: [d * 0.85, 0.1, w * 0.18] }, 14, 8);
      for (const s of [1, -1]) b.sphere(1, snowV, { p: [0, h * 0.8, s * w * 0.32], s: [d * 0.8, 0.07, w * 0.16] }, 12, 6);
    } else {
      b.add(lumpyEllipsoid([d * 0.95, 0.11, w * 0.5], 0.015, 6, 2, 18, 10), snowV, { p: [0, h * 1.04, 0] });
    }
    // Schnee auf dem Sockel, Schneehügel, Eiszapfen
    b.sphere(1, snowV, { p: [0, h * 0.105, 0], s: [d * 1.35, 0.045, w * 0.58] }, 16, 6);
    b.dome(1, snowV, { p: [0.12, 0, 0], s: [0.75, 0.16, 0.6] }, Math.PI / 2, 24, 6);
    for (let i = 0; i < 4; i++) {
      const z = (i / 3 - 0.5) * w * 0.7;
      const len = 0.08 + hash1(i + 2) * 0.1;
      b.add(new THREE.ConeGeometry(0.018, len, 5), { v: (x, y) => mix(ST.iceHi, ST.ice, smoothstep(-y / len + 0.5)) }, { p: [d / 2 + d * 0.32, h * 0.95 - (kind === 'rund' ? Math.pow(Math.abs(z) / (w / 2), 2) * w * 0.4 : 0) - len / 2, z], r: [Math.PI, 0, 0] });
    }
    return b.geometry();
  });
}
function buildSchneegrab(opts = {}) {
  const kind = ['rund', 'kreuz', 'spitz'].includes(opts.kind) ? opts.kind : 'rund';
  const root = new THREE.Group();
  const m = mesh(schneegrabGeo(kind), kulS(0.7), {}, true);
  m.receiveShadow = true;
  m.scale.setScalar(clamp(num(opts.size, 1.2), 0.3, 6));
  m.rotation.z = clamp(num(opts.tilt, 0), -0.6, 0.6);
  root.add(m);
  return makeModel('schneegrab', root, () => {}, []);
}

export const MODELS = {
  retro_block: buildRetroBlock,
  retro_wolke: buildRetroWolke,
  retro_busch: buildRetroBusch,
  riesenpflanze: buildRiesenpflanze,
  schneegrab: buildSchneegrab,
};
