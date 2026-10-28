// Kulisse Welt 7 „Lava-Festung“: Basaltsäulen, Vulkanfelsen, Brummbär-Fahne, Fackeln, Burgtürme, Zahnrad-Maschinen in Lava,
// Riff-Korallen und Lavagestein unter Wasser. Eigene Gestaltung, Kartenqualität, ohne Spielzeug-Look (Kulissen-Materialien
// `toy: false`). Maßstab Meter, Vorderseite +X, Ursprung = Mitte unten (Ausnahmen genannt); state darf ein String sein.
// Wiederverwendet (nicht neu gebaut): Lavafall 'lavafall' (Welt 4, jetzt auch opts.color 'blau'), Ketten 'burg_kette',
// Banner 'brummbaer_banner', Burgmauer 'burgmauer', Fallgitter 'fallgitter', Zahnrad 'zahnrad', Korallen 'koralle', Seetang
// 'seetang', Luftblasen 'blasen' (Welten 3–6).
//
// Alle Kulissen-Teile sind vertexgefärbt und damit backbar (blocks/w2kit.js bakeModel), außer den bewegten Teilen (Fahnentuch
// mit Wappen-Textur, Rauch, Funken, Zahnräder, Fangarme).
//
// basaltsaeule    Gruppe sechseckiger Basaltsäulen (dunkel, helle Deckflächen, Querbänder), am Fuß glühende Risse.
//                 opts { height (höchste Säule, 3), radius (Gruppe, 0,9), count (Säulen, 5; 1..9), seed (1),
//                        glow: 'rot' (Standard) | 'blau' | false }  state –   Viele → createInstanced('basaltsaeule').
// vulkanfels      Vulkangestein.  opts { kind: 'brocken' (klumpiger Fels mit Glutadern, Ø ≈ size) | 'spitze' (zackige Felsnadel,
//                 ≈ size hoch) | 'vulkan' (Vulkankegel mit glühendem Krater, Lavarinnen und Rauch, ≈ size hoch), size (2 / 3 / 6),
//                 seed (1), color: 'rot' | 'blau' }  state { smoke (bool, Standard true – nur vulkan) }
// brummbaer_fahne Fahnenmast (Eisen, Goldknauf, Sockel) mit wehender Fahne: Brummbär-Wappen (Bärenkopf mit Zylinder und Monokel)
//                 auf Rot mit Goldsaum.  opts { height (Mast, 4), size: [w, h] ([1,8, 1,2]) }
//                 state { wind (0..1, Standard 0,5: Flattern und Auswehen), dir? (rad um Y, Windrichtung, Standard 0 = Fahne
//                 weht nach +X) }
// fackel          Fackel.  opts { mount: 'stand' (Standard: Eisen-Dreibein mit Feuerschale, ≈1,7 m, Ursprung Fußpunkt) | 'wand'
//                 (Wandhalter: **Ursprung = Befestigung an der Wand**, die Fackel ragt schräg nach +X oben), color: 'rot' | 'blau' }
//                 state { lit (bool, Standard true), flare (0..1: Stichflamme, z. B. frisch entzündet) }
// festungsturm    runder Burgturm der Lava-Festung: versetzte Basalt-Quader (einzelne glimmen), Kragsteine, Zinnenkranz, rotes Kegeldach mit Brummbär-Fähnchen,
//                 glühende Bogenfenster, Felssockel.  opts { height (Mauerhöhe ohne Dach, 10), radius (2,2), roof (true),
//                 windows (true), color: 'rot' | 'blau' (Fensterglut) }  state –
// lava_maschine   Zahnrad-Maschine in der Lava: genietetes Eisengehäuse (steht im Lavasee, Ursprung = Lava-Oberfläche, reicht
//                 1 m tiefer), drei Messing-Zahnräder vorn (+X), pumpender Kolben, Warnlampe, Schlot mit Rauch, Glutkranz.
//                 opts { width (Z, 4), height (über der Lava, 3) }  state { speed (rad/s, Standard 1), angle? (rad, überschreibt) }
// riffkoralle     Vulkan-Riff-Koralle.  opts { kind: 'roehre' (orange Röhrenkorallen mit leuchtenden Rändern) | 'geweih' (pinke
//                 Geweihkoralle) | 'anemone' (Seeanemone mit wogenden Fangarmen), size (Faktor, 1), seed (1) }
//                 state { sway (0..1 Strömung, Standard 0,4) }
// lavagestein     Kissenlava unter Wasser: runde, dunkle Lavawülste mit glühenden Fugen; mit vent ein Schlot mit Glut und
//                 aufsteigenden Blasen.  opts { size (Ø, 2), seed (1), vent (false), color: 'rot' | 'blau' }  state –

import {
  THREE, TAU, Build, cached, vcol, basic, std, mesh, joint, makeModel, Clock, damp, clamp, mix, col, smoothstep, lerp,
  instMesh, setInst, glowSprite, placed,
} from '../lib/kit.js';
import {
  W7, LAVA7, lavaKey, kulMat7, kulMetal7, glow7, glow7T, plain, num, hash1, noise3, displace, flameGeo, Puffs, hexColumnGeo,
  crestTexture, taperTube, gradV, axisY, memo,
} from '../lib/w7Geos.js';

const ironK = { v: (x, y, z, nx, ny) => mix(W7.ironLow, W7.ironHi, smoothstep(ny * 0.5 + nx * 0.2 + 0.35)) };
const rockK = (lo = W7.rockLow, hi = W7.rockHi) => ({ v: (x, y, z, nx, ny) => mix(lo, hi, smoothstep(ny * 0.5 + 0.45 + (noise3(x * 2.3, y * 2.3, z * 2.3) - 0.5) * 0.5)) });
const plainPuffs = (n, color, o) => { const p = new Puffs(n, color, o); plain(p.mat); return p; };

// =============================================================================================
// Basaltsäulen
// =============================================================================================
/** Säulen einer Gruppe: [x, z, r, h] (deterministisch aus seed). */
export function basaltLayout(H, R, n, seed) {
  const out = [[0, 0, 0.42, H]];
  for (let i = 1; i < n; i++) {
    const a = (i / (n - 1)) * TAU + hash1(seed * 7 + i) * 0.6;
    const rr = R * (0.55 + hash1(seed * 3 + i) * 0.4);
    out.push([Math.cos(a) * rr, Math.sin(a) * rr, 0.3 + hash1(seed * 5 + i) * 0.12, H * (0.4 + hash1(seed * 11 + i) * 0.5)]);
  }
  return out;
}
export function basaltGeo(H, R, n, seed, lo = false) {
  return cached(`w7:basalt:${H}:${R}:${n}:${seed}:${lo}`, () => {
    const b = new Build();
    for (const [x, z, r, h] of basaltLayout(H, R, n, seed)) {
      const g = hexColumnGeo(r, h, 0.12 + hash1(x * 3 + z) * 0.12, Math.round(seed * 10 + x * 7 + z * 13), lo).clone();
      g.translate(x, 0, z);
      g.rotateY(0);
      b.parts.push(g);
    }
    // Geröll am Fuß
    if (!lo) for (let i = 0; i < 5; i++) {
      const a = hash1(seed + i * 2.3) * TAU, rr = R * (0.9 + hash1(i + seed) * 0.4), r = 0.16 + hash1(i * 5 + seed) * 0.14;
      b.add(displace(new THREE.IcosahedronGeometry(r, 0), 0.03, 3, i + seed, false), rockK(), { p: [Math.cos(a) * rr, r * 0.6, Math.sin(a) * rr] });
    }
    return b.geometry();
  });
}
function basaltGlowGeo(R, key) {
  const L = LAVA7[key];
  return cached(`w7:basalt:glow:${R}:${key}`, () => {
    const b = new Build();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.4;
      const pts = [0, 1, 2, 3].map((k) => { const rr = R * 0.5 + k * R * 0.28; const aa = a + Math.sin(k * 2.1 + i) * 0.2; return [Math.cos(aa) * rr, 0.02, Math.sin(aa) * rr]; });
      b.add(taperTube(pts, (t) => 0.06 * (1 - t * 0.7), 10, 4), { v: (x, y, z) => mix(L.white, L.hot, smoothstep(Math.hypot(x, z) / (R * 1.4))) });
    }
    return b.geometry();
  });
}
function buildBasalt(opts = {}) {
  const H = Math.max(0.5, num(opts.height, 3)), R = Math.max(0.2, num(opts.radius, 0.9));
  const n = clamp(Math.round(num(opts.count, 5)), 1, 9), seed = Math.round(num(opts.seed, 1));
  const root = new THREE.Group();
  root.add(mesh(basaltGeo(H, R, n, seed), kulMat7(0.8), {}, true));
  if (opts.glow !== false) root.add(mesh(basaltGlowGeo(R, lavaKey(opts.glow)), glow7()));
  return makeModel('basaltsaeule', root, () => {}, [], { initial: 'idle' });
}

// =============================================================================================
// Vulkanfelsen
// =============================================================================================
function brockenGeo(S, seed, key) {
  return cached(`w7:vf:brocken:${S}:${seed}`, () => {
    const g = new THREE.IcosahedronGeometry(S / 2, 3);
    g.scale(1, 0.72, 0.9);
    const b = new Build();
    b.add(displace(g, S * 0.09, 1.8 / S * 2, seed * 3, true), rockK(W7.rockLow, W7.rockHi), { p: [0, S * 0.3, 0] });
    return b.geometry();
  });
}
function veinsGeo(S, seed, key, kind) {
  const L = LAVA7[key];
  return cached(`w7:vf:veins:${kind}:${S}:${seed}:${key}`, () => {
    const b = new Build();
    const n = kind === 'vulkan' ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + hash1(seed + i) * 0.8;
      let pts;
      if (kind === 'vulkan') {
        // Lavarinnen vom Kraterrand den Hang hinab
        pts = [0, 1, 2, 3, 4].map((k) => { const t = k / 4; const r = S * (0.12 + t * 0.62); const y = S * (0.97 - t * 0.9); const aa = a + Math.sin(t * 5 + i) * 0.15; return [Math.cos(aa) * r * 1.02, y, Math.sin(aa) * r * 1.02]; });
        b.add(taperTube(pts, (t) => S * 0.035 * (1 + t * 0.6), 14, 5), { v: (x, y) => mix(L.hot, L.white, smoothstep(y / S)) });
      } else {
        const h = kind === 'spitze' ? S : S * 0.6, r0 = kind === 'spitze' ? S * 0.22 : S * 0.47;
        pts = [0, 1, 2, 3].map((k) => { const t = k / 3; const rr = r0 * (1 - t * (kind === 'spitze' ? 0.6 : 0.35)) * 1.02; const aa = a + t * 0.6; return [Math.cos(aa) * rr, h * (0.1 + t * 0.6), Math.sin(aa) * rr]; });
        b.add(taperTube(pts, (t) => 0.075 * (1 - t * 0.5) * Math.max(1, S / 2), 10, 5), { v: (x, y) => mix(L.hotter, L.hot, smoothstep(y / h)) });
      }
    }
    if (kind === 'vulkan') b.cyl(S * 0.16, S * 0.16, 0.05, { v: (x, y, z) => mix(L.white, L.hot, smoothstep(Math.hypot(x, z) / (S * 0.16))) }, { p: [0, S * 0.94, 0] }, 20);
    return b.geometry();
  });
}
function spitzeGeo(S, seed) {
  return cached(`w7:vf:spitze:${S}:${seed}`, () => {
    const b = new Build();
    for (let i = 0; i < 3; i++) {
      const h = S * (1 - i * 0.28), r = S * (0.22 + i * 0.05);
      const g = new THREE.ConeGeometry(r, h, 7, 4);
      g.translate(0, h / 2, 0);
      const a = hash1(seed + i) * TAU, off = i ? S * 0.18 : 0;
      b.add(displace(g, r * 0.25, 2 / r, seed + i, false), rockK(), { p: [Math.cos(a) * off, 0, Math.sin(a) * off], r: [0, a, (i ? 0.15 : 0.05) * (i % 2 ? 1 : -1)] });
    }
    return b.geometry();
  });
}
function vulkanGeo(S, seed) {
  return cached(`w7:vf:vulkan:${S}:${seed}`, () => {
    const b = new Build();
    const prof = [[S * 0.95, 0], [S * 0.8, S * 0.12], [S * 0.55, S * 0.45], [S * 0.32, S * 0.78], [S * 0.2, S * 0.95], [S * 0.16, S * 0.97], [S * 0.13, S * 0.9]];
    const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 28);
    b.add(displace(g, S * 0.035, 3 / S, seed, true), { v: (x, y, z, nx, ny) => mix(mix(W7.rockLow, W7.rockHi, smoothstep(ny * 0.6 + 0.3)), 0x8a4a3a, smoothstep((y / S - 0.75) / 0.2) * 0.5) });
    return b.geometry();
  });
}
function buildVulkanfels(opts = {}) {
  const kind = ['spitze', 'vulkan'].includes(opts.kind) ? opts.kind : 'brocken';
  const S = Math.max(0.3, num(opts.size, kind === 'brocken' ? 2 : kind === 'spitze' ? 3 : 6));
  const seed = Math.round(num(opts.seed, 1));
  const key = lavaKey(opts.color);
  const root = new THREE.Group();
  const own = [];
  const g = kind === 'brocken' ? brockenGeo(S, seed, key) : kind === 'spitze' ? spitzeGeo(S, seed) : vulkanGeo(S, seed);
  root.add(mesh(g, kulMat7(0.85), {}, true));
  root.add(mesh(veinsGeo(S, seed, key, kind), glow7()));
  let update = () => {};
  if (kind === 'vulkan') {
    const smoke = plainPuffs(12, 0xa89aa2, { opacity: 0.6, radius: S * 2, cy: S * 1.4 });
    own.push(smoke);
    const halo = glowSprite(LAVA7[key].glow, S * 0.9, 0.55);
    halo.position.y = S * 0.98;
    root.add(smoke.mesh, halo);
    const clk = new Clock();
    let emit = 0;
    update = (dt, st) => {
      clk.tick(dt, st.anim ?? 'idle');
      emit -= dt;
      if (st.smoke !== false && emit <= 0) { smoke.burst([0, S * 1.0, 0], { count: 1, speed: 0.4, up: S * 0.35, size: S * 0.09, life: 2.2, spread: S * 0.05, grow: 2.5 }); emit = 0.35; }
      smoke.step(dt);
      halo.scale.setScalar(S * (0.85 + Math.sin(clk.t * 2) * 0.05));
    };
  }
  return makeModel('vulkanfels', root, update, own, { initial: 'idle' });
}

// =============================================================================================
// Brummbär-Fahne
// =============================================================================================
const poleGeo = (H) => cached(`w7:fahne:pole:${H}`, () => {
  const b = new Build();
  b.cyl(0.06, 0.07, H, ironK, { p: [0, H / 2, 0] }, 12);
  b.sphere(0.13, gradV(W7.goldLow, W7.goldHi), { p: [0, H + 0.08, 0] }, 14, 10);
  b.cone(0.06, 0.18, W7.gold, { p: [0, H + 0.26, 0] }, 10);
  b.cyl(0.32, 0.4, 0.22, rockK(), { p: [0, 0.11, 0] }, 8);
  b.cyl(0.12, 0.12, 0.12, W7.gold, { p: [0, 0.27, 0] }, 12);
  return b.geometry();
});
const FU = 12, FV = 7;
function flagBase(w, h) {
  return cached(`w7:fahne:flag:${w}:${h}`, () => {
    const g = new THREE.PlaneGeometry(w, h, FU, FV);
    g.translate(w / 2 + 0.06, 0, 0);
    return g;
  });
}
function buildFahne(opts = {}) {
  const H = Math.max(1, num(opts.height, 4));
  const sz = Array.isArray(opts.size) ? opts.size : [1.8, 1.2];
  const w = Math.max(0.3, num(sz[0], 1.8)), h = Math.max(0.2, num(sz[1], 1.2));
  const root = new THREE.Group();
  const own = [];
  const flagGeo = flagBase(w, h).clone();
  const flagMat = plain(new THREE.MeshStandardMaterial({ map: crestTexture(), side: THREE.DoubleSide, roughness: 0.8 }));
  own.push(flagGeo, flagMat);
  const swivel = joint([0, H - h / 2 - 0.05, 0]);
  const flag = mesh(flagGeo, flagMat, {}, true);
  swivel.add(flag);
  root.add(mesh(poleGeo(H), kulMetal7(), {}, true), swivel);
  const base = flagGeo.attributes.position.array.slice();
  const P = flagGeo.attributes.position;
  const clk = new Clock();
  let wind = 0.5;
  const update = (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    const t = clk.t;
    wind = damp(wind, clamp(num(st.wind, 0.5), 0, 1), 3, dt);
    swivel.rotation.y = num(st.dir, 0);
    for (let k = 0; k < P.count; k++) {
      const x = base[k * 3], y = base[k * 3 + 1];
      const u = clamp((x - 0.06) / w, 0, 1);
      const amp = (0.06 + wind * 0.22) * u;
      const droop = (1 - wind) * u * u * h * 0.55;
      P.setXYZ(k, x * (0.82 + wind * 0.18) - droop * 0.2, y - droop + Math.sin(t * 3 + u * 5) * amp * 0.12, Math.sin(t * (3 + wind * 5) - u * 6 + y * 1.2) * amp);
    }
    P.needsUpdate = true;
    flagGeo.computeVertexNormals();
  };
  return makeModel('brummbaer_fahne', root, update, own, { initial: 'idle' });
}

// =============================================================================================
// Fackel
// =============================================================================================
const standGeo = () => cached('w7:fackel:stand', () => {
  const b = new Build();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    b.add(taperTube([[Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32], [Math.cos(a) * 0.14, 0.6, Math.sin(a) * 0.14], [Math.cos(a) * 0.08, 1.3, Math.sin(a) * 0.08]], 0.035, 10, 5), ironK);
    b.sphere(0.06, W7.gold, { p: [Math.cos(a) * 0.32, 0.03, Math.sin(a) * 0.32] }, 6, 4);
  }
  b.torus(0.15, 0.025, W7.gold, { p: [0, 0.6, 0], r: [Math.PI / 2, 0, 0] }, 5, 14);
  b.lathe([[0.06, 1.3], [0.18, 1.36], [0.3, 1.5], [0.34, 1.62], [0.31, 1.64], [0.26, 1.54], [0, 1.52]], ironK, null, 16);
  b.torus(0.33, 0.03, gradV(W7.goldLow, W7.goldHi), { p: [0, 1.62, 0], r: [Math.PI / 2, 0, 0] }, 5, 18);
  b.sphere(1, 0x2a1a14, { p: [0, 1.56, 0], s: [0.26, 0.07, 0.26] }, 12, 6);
  return b.geometry();
});
const wallGeo = () => cached('w7:fackel:wand', () => {
  const b = new Build();
  b.box(0.06, 0.4, 0.26, ironK, { p: [0.03, 0, 0] }, 0.02, 1);
  for (const y of [-0.13, 0.13]) b.sphere(0.03, W7.gold, { p: [0.07, y, 0] }, 6, 4);
  b.cyl(0.03, 0.03, 0.3, ironK, { p: [0.16, -0.04, 0], r: [0, 0, -1.0] }, 6);
  b.torus(0.07, 0.02, ironK, { p: [0.28, 0.02, 0], r: [Math.PI / 2, 0, 0] }, 5, 12);
  // Holzstiel schräg nach oben-vorn, oben Teerkopf
  b.cyl(0.04, 0.03, 0.6, gradV(W7.woodLow, W7.wood), { p: [0.33, 0.12, 0], r: [0, 0, -0.45] }, 8);
  b.cyl(0.075, 0.06, 0.16, { v: (x, y) => mix(0x2a1a14, 0x5a3a24, smoothstep(y / 0.16 + 0.5)) }, { p: [0.45, 0.38, 0], r: [0, 0, -0.45] }, 10);
  return b.geometry();
});
function buildFackel(opts = {}) {
  const wall = opts.mount === 'wand';
  const key = lavaKey(opts.color);
  const L = LAVA7[key];
  const root = new THREE.Group();
  const own = [];
  root.add(mesh(wall ? wallGeo() : standGeo(), kulMetal7(), {}, true));
  const top = wall ? new THREE.Vector3(0.49, 0.46, 0) : new THREE.Vector3(0, 1.58, 0);
  const s0 = wall ? 0.5 : 1;
  const fj = joint(top.toArray());
  const flame = mesh(flameGeo(key, 12), glow7(), { s: [0.55 * s0, 0.95 * s0, 0.55 * s0] });
  const inner = mesh(flameGeo(key === 'blau' ? 'blau' : 'gold', 10), glow7(), { s: [0.3 * s0, 0.55 * s0, 0.3 * s0] });
  const halo = glowSprite(L.glow, 1.8 * s0, 0.55);
  halo.material = halo.material.clone(); own.push(halo.material);
  halo.position.y = 0.35 * s0;
  fj.add(flame, inner, halo);
  const embers = plainPuffs(8, L.hotter, { opacity: 0.95, radius: 3, cy: 1.5, emissive: L.hot, detail: 0 });
  own.push(embers);
  root.add(fj, embers.mesh);
  const clk = new Clock();
  let lit = 1, emit = 0;
  const update = (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    const t = clk.t;
    lit = damp(lit, st.lit === false ? 0 : 1, 6, dt);
    const flare = clamp(num(st.flare, 0), 0, 1);
    const k = lit * (1 + flare * 0.8);
    fj.visible = lit > 0.02;
    flame.scale.set(0.55 * s0 * k * (1 + Math.sin(t * 17) * 0.06), 0.95 * s0 * k * (1 + Math.sin(t * 11 + 1) * 0.1), 0.55 * s0 * k);
    flame.rotation.y = t * 2;
    inner.scale.set(0.3 * s0 * k, 0.55 * s0 * k * (1 + Math.sin(t * 19) * 0.1), 0.3 * s0 * k);
    halo.material.opacity = 0.55 * lit * (0.9 + Math.sin(t * 13) * 0.1) + flare * 0.3;
    emit -= dt;
    if (lit > 0.5 && emit <= 0) { embers.burst([top.x, top.y + 0.4 * s0, top.z], { count: 1, speed: 0.3, up: 1.1, size: 0.025, life: 0.9, spread: 0.08 }); emit = 0.18 - flare * 0.1; }
    embers.step(dt);
  };
  return makeModel('fackel', root, update, own, { initial: 'idle' });
}

// =============================================================================================
// Festungsturm
// =============================================================================================
/** Turmmauer aus Basalt-Quadern (vertexgefärbt, backbar): Reihen à 0,6 m, jede zweite um einen halben Stein versetzt. */
function towerBodyGeo(H, R) {
  return cached(`w7:turm:body:${H}:${R}`, () => {
    const b = new Build();
    const rows = Math.max(2, Math.round(H / 0.6)), rh = H / rows;
    const seg = Math.max(12, Math.round(TAU * R / 0.62));
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * Math.PI / seg;
      const rr = R * (1.06 - 0.06 * (r + 0.5) / rows) + (r % 2 ? 0.012 : 0);
      const g = new THREE.CylinderGeometry(rr, rr, rh * 0.97, seg, 1, true, off, TAU);
      b.add(g, (x, y, z) => {
        const k = Math.floor(((Math.atan2(x, z) - off + TAU) % TAU) / (TAU / seg));
        const h = hash1(r * 31.7 + k * 7.3);
        const base = mix(W7.rockLow, W7.rockHi, 0.25 + h * 0.45);
        return h > 0.965 ? mix(base, LAVA7.rot.hot, 0.22) : base;
      }, { p: [0, rh * (r + 0.5), 0] });
    }
    // Fugen: dunkler Kern dahinter (sieht man zwischen den Reihen)
    b.cyl(R * 0.99, R * 1.05, H, W7.ink, { p: [0, H / 2, 0] }, seg, true);
    return b.geometry();
  });
}
function towerTrimGeo(H, R) {
  return cached(`w7:turm:trim:${H}:${R}`, () => {
    const b = new Build();
    // Felssockel
    b.add(displace(new THREE.CylinderGeometry(R * 1.12, R * 1.35, 1.2, 14, 2), 0.18, 1.2, R, false), rockK(), { p: [0, 0.3, 0] });
    // Kragsteine und Wehrgang
    const n = Math.max(10, Math.round(R * 7));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      b.box(0.3, 0.45, 0.24, rockK(W7.rock, W7.rockTop), { p: [Math.cos(a) * (R + 0.08), H - 0.15, Math.sin(a) * (R + 0.08)], r: [0, -a, 0] }, 0.04, 1);
    }
    b.cyl(R + 0.3, R + 0.25, 0.35, rockK(W7.rock, W7.rockTop), { p: [0, H + 0.2, 0] }, 28);
    // Zinnen
    const m = Math.max(8, Math.round(R * 4.5));
    for (let i = 0; i < m; i++) {
      const a = (i / m) * TAU;
      b.box(0.55, 0.6, 0.4, rockK(W7.rock, W7.rockTop), { p: [Math.cos(a) * (R + 0.1), H + 0.67, Math.sin(a) * (R + 0.1)], r: [0, -a, 0] }, 0.05, 1);
    }
    // goldenes Band
    b.torus(R + 0.03, 0.06, W7.gold, { p: [0, H * 0.62, 0], r: [Math.PI / 2, 0, 0] }, 5, 32);
    return b.geometry();
  });
}
function towerRoofGeo(H, R) {
  return cached(`w7:turm:roof:${H}:${R}`, () => {
    const b = new Build();
    const rh = R * 1.9;
    const g = new THREE.ConeGeometry(R + 0.45, rh, 24, 6);
    g.translate(0, H + 0.4 + rh / 2, 0);
    b.add(g, (x, y, z) => { const row = Math.floor((y - H) / 0.35); const a = Math.atan2(z, x); const tile = Math.floor(a / (TAU / 24) + (row % 2) * 0.5); return mix(0x8a1420, 0xd8303a, 0.35 + hash1(tile * 3 + row) * 0.4 - (row % 2) * 0.1); });
    b.torus(R + 0.42, 0.07, W7.gold, { p: [0, H + 0.42, 0], r: [Math.PI / 2, 0, 0] }, 5, 28);
    // Mast mit Goldknauf
    b.cyl(0.05, 0.05, 1.4, ironK, { p: [0, H + 0.4 + rh + 0.6, 0] }, 8);
    b.sphere(0.12, W7.gold, { p: [0, H + 0.4 + rh + 1.32, 0] }, 10, 8);
    // kleines Fähnchen (rot mit goldenem Zylinder-Zeichen)
    const fy = H + 0.4 + rh + 1.0;
    b.add(new THREE.PlaneGeometry(0.8, 0.5), (x, y) => (Math.abs(x) < 0.12 && y > -0.1 && y < 0.14 ? col(W7.gold) : col(0xc8142e)), { p: [0.45, fy, 0] });
    b.add(new THREE.PlaneGeometry(0.8, 0.5), (x, y) => (Math.abs(x) < 0.12 && y > -0.1 && y < 0.14 ? col(W7.gold) : col(0xc8142e)), { p: [0.45, fy, 0], r: [0, Math.PI, 0] });
    return b.geometry();
  });
}
function towerWindowGeo(H, R, key) {
  const L = LAVA7[key];
  return cached(`w7:turm:win:${H}:${R}:${key}`, () => {
    const b = new Build();
    const rows = Math.max(1, Math.floor((H - 2) / 3));
    for (let r = 0; r < rows; r++) {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU + r * 0.6 + 0.3;
        const y = 2.4 + r * 3;
        const sh = new THREE.Shape();
        sh.moveTo(-0.3, -0.5); sh.lineTo(0.3, -0.5); sh.lineTo(0.3, 0.2); sh.absarc(0, 0.2, 0.3, 0, Math.PI, false); sh.closePath();
        const g = new THREE.ShapeGeometry(sh, 6);
        const n = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
        b.add(g, { v: (x, yy) => mix(L.white, L.hot, smoothstep((yy + 0.5) / 1.0)) }, placed(n.clone().multiplyScalar(R + 0.02).setY(y), n, new THREE.Vector3(1, 1, 1)));
      }
    }
    return b.geometry();
  });
}
function buildTurm(opts = {}) {
  const H = Math.max(2, num(opts.height, 10)), R = Math.max(0.8, num(opts.radius, 2.2));
  const root = new THREE.Group();
  root.add(mesh(towerBodyGeo(H, R), kulMat7(0.82), {}, true));
  root.add(mesh(towerTrimGeo(H, R), kulMat7(0.82), {}, true));
  if (opts.roof !== false) root.add(mesh(towerRoofGeo(H, R), vcol(0.6, { toy: false, side: THREE.DoubleSide }, 'w7kul2'), {}, true));
  if (opts.windows !== false) root.add(mesh(towerWindowGeo(H, R, lavaKey(opts.color)), glow7()));
  return makeModel('festungsturm', root, () => {}, [], { initial: 'idle' });
}

// =============================================================================================
// Zahnrad-Maschine in Lava
// =============================================================================================
function gearGeo() {
  return cached('w7:gear', () => {
    const b = new Build();
    const brassV = { v: (x, y, z, nx) => mix(0x9a6a18, 0xfff0a8, smoothstep(nx * 0.5 + 0.5)) };
    b.cyl(0.8, 0.8, 0.2, brassV, { r: [0, 0, Math.PI / 2] }, 28);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; b.box(0.2, 0.26, 0.22, brassV, { p: [0, Math.cos(a) * 0.9, Math.sin(a) * 0.9], r: [a, 0, 0] }, 0.03, 1); }
    b.cyl(0.25, 0.25, 0.3, ironK, { r: [0, 0, Math.PI / 2] }, 14);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.4; b.sphere(0.12, 0x6a4a14, { p: [0.08, Math.cos(a) * 0.5, Math.sin(a) * 0.5], s: [0.5, 1, 1] }, 8, 6); }
    return b.geometry();
  });
}
function housingGeo(W, H) {
  return cached(`w7:masch:house:${W}:${H}`, () => {
    const b = new Build();
    b.box(2.2, H + 1, W, ironK, { p: [-0.3, (H - 1) / 2, 0] }, 0.12, 2);
    // Goldkanten und Nieten
    for (const y of [H - 0.05, 0.25]) b.box(2.26, 0.12, W + 0.06, gradV(W7.goldLow, W7.goldHi), { p: [-0.3, y, 0] }, 0.04, 1);
    for (let i = 0; i < 6; i++) for (const y of [H - 0.3, 0.5]) b.sphere(0.05, W7.goldHi, { p: [0.81, y, -W / 2 + 0.3 + i * (W - 0.6) / 5] }, 6, 4);
    // Schlot und Rohre
    b.cyl(0.28, 0.32, 1.6, ironK, { p: [-0.8, H + 0.8, W * 0.3] }, 12);
    b.cyl(0.38, 0.28, 0.25, W7.gold, { p: [-0.8, H + 1.6, W * 0.3] }, 12, true);
    b.add(taperTube([[0.5, H - 0.3, -W / 2 - 0.05], [0.9, H + 0.4, -W / 2 + 0.2], [0.2, H + 0.8, -W / 2 + 0.5], [-0.6, H + 0.2, -W / 2 + 0.4]], 0.12, 16, 8), { v: (x, y, z, nx, ny) => mix(0x8a4a2a, 0xe8905a, smoothstep(ny * 0.5 + 0.5)) });
    // Kolbenführung oben
    b.box(0.7, 0.3, 0.7, ironK, { p: [-0.1, H + 0.15, -W * 0.15] }, 0.06, 1);
    // Warnstreifen vorn
    b.box(0.04, 0.3, W - 0.2, (x, y, z) => ((Math.floor((y + z) * 4) % 2 + 2) % 2 ? col(0xffc21a) : col(0x1a1a20)), { p: [0.83, H - 0.6, 0] }, 0, 1);
    return b.geometry();
  });
}
function buildMaschine(opts = {}) {
  const W = Math.max(1.5, num(opts.width, 4)), H = Math.max(1.2, num(opts.height, 3));
  const root = new THREE.Group();
  const own = [];
  root.add(mesh(housingGeo(W, H), kulMetal7(), {}, true));
  const gears = instMesh(gearGeo(), kulMat7(0.4), 3, Math.max(W, H) + 2, H / 2);
  gears.castShadow = true;
  const G = [[0.95, H * 0.55, -W * 0.22, 1, 1], [0.95, H * 0.3, W * 0.22, 0.75, -1.33], [1.0, H * 0.82, W * 0.3, 0.55, -1.82]];
  const piston = mesh(cached('w7:masch:piston', () => new Build().cyl(0.09, 0.09, 1.2, ironK, { p: [0, 0.6, 0] }, 8).cyl(0.3, 0.3, 0.25, W7.gold, { p: [0, 1.2, 0] }, 14).geometry()), kulMetal7(), { p: [-0.1, H + 0.2, -W * 0.15] }, true);
  const lampMat = plain(new THREE.MeshBasicMaterial({ color: 0xff3a1a }));
  own.push(lampMat);
  const lamp = mesh(cached('w7:masch:lamp', () => new THREE.SphereGeometry(0.14, 12, 8)), lampMat, { p: [-0.6, H + 0.15, -W * 0.38] });
  const ring = mesh(cached(`w7:masch:ring:${W}`, () => new Build().box(2.8, 0.05, W + 0.6, { v: (x, y, z) => mix(LAVA7.rot.white, LAVA7.rot.hot, smoothstep(Math.max(Math.abs(x + 0.3) - 1.0, Math.abs(z) - W / 2 + 0.2) / 0.4 + 0.5)) }, { p: [-0.3, 0.02, 0] }, 0, 1).geometry()), glow7());
  const smoke = plainPuffs(10, 0xb0a8b0, { opacity: 0.6, radius: 6, cy: H + 3 });
  own.push(smoke);
  root.add(gears, piston, lamp, ring, smoke.mesh);
  const clk = new Clock();
  let angle = 0, emit = 0;
  const update = (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    const t = clk.t;
    const sp = num(st.speed, 1);
    if (st.angle !== undefined) angle = num(st.angle, 0); else angle += dt * sp;
    G.forEach(([x, y, z, s, ratio], i) => setInst(gears, i, x, y, z, angle * ratio, 0, 0, s));
    gears.instanceMatrix.needsUpdate = true;
    piston.position.y = H + 0.2 + Math.abs(Math.sin(angle * 1.5)) * 0.45;
    lampMat.color.setHex(Math.sin(t * 6) > 0 ? 0xff4a1a : 0x5a140a);
    emit -= dt;
    if (emit <= 0) { smoke.burst([-0.8, H + 1.8, W * 0.3], { count: 1, speed: 0.4, up: 1.8, size: 0.2, life: 1.6, spread: 0.1, grow: 2.2 }); emit = 0.45 / Math.max(0.3, Math.abs(sp)); }
    smoke.step(dt);
  };
  return makeModel('lava_maschine', root, update, own, { initial: 'idle' });
}

// =============================================================================================
// Riff-Koralle (Vulkan-Riff)
// =============================================================================================
const RIFF = { tube: 0xff6a2a, tubeHi: 0xffb05a, tubeLow: 0xb8301a, rim: 0xfff07a, horn: 0xff4a9a, hornHi: 0xffa0d0, hornLow: 0x9a1a5a, anem: 0x9a3ad8, anemHi: 0xe08aff, tent: 0xff5ac0, tentTip: 0xffc8ec };
function roehreGeo(seed) {
  return memo(`w7:riff:roehre:${seed}`, () => {
    const b = new Build(), gl = new Build();
    for (let i = 0; i < 7; i++) {
      const a = hash1(seed + i * 1.3) * TAU, r = i ? 0.2 + hash1(seed * 2 + i) * 0.35 : 0;
      const h = 0.5 + hash1(seed * 3 + i) * 0.9, rad = 0.09 + hash1(seed * 4 + i) * 0.07;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      b.lathe([[rad * 1.15, 0], [rad, h * 0.3], [rad * 1.05, h * 0.7], [rad * 1.25, h], [rad * 0.85, h], [rad * 0.8, h * 0.85]], { v: (px, py) => mix(RIFF.tubeLow, RIFF.tubeHi, smoothstep(py / h)) }, { p: [x, 0, z], r: [Math.sin(a) * 0.12, 0, Math.cos(a) * 0.12] }, 10);
      gl.torus(rad * 1.05, rad * 0.22, RIFF.rim, { p: [x + Math.cos(a) * 0.12 * h * 0.0, h, z], r: [Math.PI / 2 + Math.sin(a) * 0.12, 0, Math.cos(a) * 0.12] }, 5, 12);
    }
    return { body: b.geometry(), glow: gl.geometry() };
  });
}
function geweihGeo(seed) {
  return cached(`w7:riff:geweih:${seed}`, () => {
    const b = new Build();
    const branch = (p, d, len, r, depth) => {
      const e = p.clone().addScaledVector(d, len);
      b.add(taperTube([p.toArray(), p.clone().addScaledVector(d, len * 0.5).toArray(), e.toArray()], (t) => r * (1 - t * 0.35), 6, 6), { v: (x, y) => mix(RIFF.hornLow, RIFF.hornHi, smoothstep(y / 1.4)) });
      b.sphere(r * 0.7, RIFF.hornHi, { p: e.toArray() }, 6, 4);
      if (depth > 0) for (const s of [1, -1]) {
        const nd = d.clone().applyAxisAngle(new THREE.Vector3(hash1(len * 9 + s), 0, hash1(len * 7 - s)).normalize(), s * 0.6).normalize();
        branch(e, nd, len * 0.75, r * 0.7, depth - 1);
      }
    };
    for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + seed; branch(new THREE.Vector3(Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12), new THREE.Vector3(Math.cos(a) * 0.35, 1, Math.sin(a) * 0.35).normalize(), 0.45, 0.07, 2); }
    return b.geometry();
  });
}
const anemoneGeo = () => cached('w7:riff:anem', () => new Build().lathe([[0.3, 0], [0.26, 0.15], [0.22, 0.4], [0.3, 0.52], [0.24, 0.55], [0, 0.5]], { v: (x, y) => mix(RIFF.anem, RIFF.anemHi, smoothstep(y / 0.55)) }, null, 16).geometry());
const tentGeo = () => cached('w7:riff:tent', () => new Build().add(taperTube([[0, 0, 0], [0.02, 0.15, 0], [0.06, 0.3, 0], [0.04, 0.42, 0]], (t) => 0.04 * (1 - t * 0.6) + 0.008, 8, 5), { v: (x, y) => mix(RIFF.tent, RIFF.tentTip, smoothstep(y / 0.42 * 1.6 - 0.6)) }).geometry());
function buildRiffkoralle(opts = {}) {
  const kind = ['geweih', 'anemone'].includes(opts.kind) ? opts.kind : 'roehre';
  const size = Math.max(0.2, num(opts.size, 1)), seed = Math.round(num(opts.seed, 1));
  const root = new THREE.Group();
  const sj = joint(); sj.scale.setScalar(size);
  root.add(sj);
  const clk = new Clock();
  let update = () => {};
  if (kind === 'roehre') {
    const g = roehreGeo(seed);
    sj.add(mesh(g.body, kulMat7(0.6), {}, true), mesh(g.glow, glow7()));
    update = (dt, st) => { clk.tick(dt, st.anim ?? 'idle'); sj.rotation.z = Math.sin(clk.t * 1.2) * 0.02 * num(st.sway, 0.4); };
  } else if (kind === 'geweih') {
    sj.add(mesh(geweihGeo(seed), kulMat7(0.6), {}, true));
    update = (dt, st) => { clk.tick(dt, st.anim ?? 'idle'); sj.rotation.z = Math.sin(clk.t * 1.1) * 0.04 * num(st.sway, 0.4); };
  } else {
    sj.add(mesh(anemoneGeo(), kulMat7(0.55), {}, true));
    const N = 22;
    const tents = instMesh(tentGeo(), kulMat7(0.55), N, 1.5, 0.6);
    sj.add(tents);
    const T = Array.from({ length: N }, (_, i) => { const ring = i < 12 ? 0 : 1; const a = (i / (ring ? 10 : 12)) * TAU + ring * 0.3; return { a, r: ring ? 0.12 : 0.22, ph: hash1(i) * TAU }; });
    update = (dt, st) => {
      clk.tick(dt, st.anim ?? 'idle');
      const t = clk.t, sw = num(st.sway, 0.4);
      T.forEach((p, i) => {
        const lean = 0.5 + Math.sin(t * 1.6 + p.ph) * 0.25 * (0.4 + sw);
        setInst(tents, i, Math.cos(p.a) * p.r, 0.52, Math.sin(p.a) * p.r, Math.sin(t * 1.3 + p.ph) * 0.2 * sw, -p.a, -lean);
      });
      tents.instanceMatrix.needsUpdate = true;
    };
    root.userData.tents = tents;
  }
  const own = [];
  if (root.userData.tents) own.push(root.userData.tents);
  return makeModel('riffkoralle', root, update, own, { initial: 'idle' });
}

// =============================================================================================
// Lavagestein (Kissenlava unter Wasser)
// =============================================================================================
/** Lavawülste der Kissenlava: [x, y, z, r, a] (deterministisch). */
function pillowLayout(S, seed) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * TAU + hash1(seed + i) * 0.7, r = i ? S * 0.32 : 0;
    const rr = S * (i ? 0.24 + hash1(seed * 3 + i) * 0.1 : 0.36);
    return [Math.cos(a) * r, rr * 0.55 + (i ? 0 : S * 0.1), Math.sin(a) * r, rr, a];
  });
}
function pillowGeo(S, seed) {
  return cached(`w7:pillow:${S}:${seed}`, () => {
    const b = new Build();
    pillowLayout(S, seed).forEach(([x, y, z, rr, a], i) => {
      const g = new THREE.SphereGeometry(rr, 14, 10);
      g.scale(1.25, 0.8, 1);
      b.add(displace(g, rr * 0.12, 2.5 / rr, seed + i, true), { v: (px, py, pz, nx, ny) => mix(0x1a1620, 0x4a3e54, smoothstep(ny * 0.5 + 0.5)) }, { p: [x, y, z], r: [0, a, 0] });
    });
    return b.geometry();
  });
}
function pillowSeamGeo(S, seed, key, vent) {
  const L = LAVA7[key];
  return cached(`w7:pillow:seam:${S}:${seed}:${key}:${vent}`, () => {
    const b = new Build();
    // glühende Risse quer über die Oberseite jedes Wulstes
    pillowLayout(S, seed).forEach(([x, y, z, rr, a], i) => {
      const pts = [];
      for (let k = 0; k <= 4; k++) {
        const t = k / 4, az = -0.9 + t * 1.8 + Math.sin(t * 6 + i) * 0.15, el = 0.75 + Math.sin(t * 3.1 + i) * 0.2;
        const d = new THREE.Vector3(Math.cos(el) * Math.cos(az) * 1.25, Math.sin(el) * 0.8, Math.cos(el) * Math.sin(az)).multiplyScalar(rr * 1.06);
        d.applyAxisAngle(new THREE.Vector3(0, 1, 0), -a + i);
        pts.push([x + d.x, y + d.y, z + d.z]);
      }
      b.add(taperTube(pts, (t) => rr * 0.07 * (1 - Math.abs(t - 0.5) * 1.2), 10, 4), { v: () => col(L.hotter) });
    });
    if (vent) {
      b.lathe([[S * 0.16, 0], [S * 0.12, S * 0.35], [S * 0.1, S * 0.62], [S * 0.13, S * 0.68], [S * 0.07, S * 0.66], [0, S * 0.6]], { v: (x, y) => (y > S * 0.63 ? col(L.hotter) : mix(0x1a1620, 0x3a3044, smoothstep(y / S))) }, { p: [S * 0.05, S * 0.3, 0] }, 12);
    }
    return b.geometry();
  });
}
function buildLavagestein(opts = {}) {
  const S = Math.max(0.3, num(opts.size, 2)), seed = Math.round(num(opts.seed, 1));
  const vent = !!opts.vent;
  const key = lavaKey(opts.color);
  const root = new THREE.Group();
  const own = [];
  root.add(mesh(pillowGeo(S, seed), kulMat7(0.7), {}, true));
  // Fugen und Schlot: die Fugen leuchten, der Schlot-Körper ist mit eingebacken (unbeleuchtet dunkel, Rand hell)
  root.add(mesh(pillowSeamGeo(S, seed, key, vent), glow7()));
  let update = () => {};
  if (vent) {
    const bubbles = plainPuffs(10, 0xd8f4ff, { opacity: 0.7, radius: 4, cy: S * 2 });
    own.push(bubbles);
    const halo = glowSprite(LAVA7[key].glow, S * 0.6, 0.6);
    halo.position.set(S * 0.05, S * 0.98, 0);
    root.add(bubbles.mesh, halo);
    const clk = new Clock();
    let emit = 0;
    update = (dt, st) => {
      clk.tick(dt, st.anim ?? 'idle');
      emit -= dt;
      if (emit <= 0) { bubbles.burst([S * 0.05, S * 1.0, 0], { count: 1, speed: 0.15, up: 1.2, size: 0.05 * Math.max(1, S / 2), life: 1.6, spread: 0.05, grow: 0.6 }); emit = 0.22; }
      bubbles.step(dt);
    };
  }
  return makeModel('lavagestein', root, update, own, { initial: 'idle' });
}

export const MODELS = {
  basaltsaeule: buildBasalt,
  vulkanfels: buildVulkanfels,
  brummbaer_fahne: buildFahne,
  fackel: buildFackel,
  festungsturm: buildTurm,
  lava_maschine: buildMaschine,
  riffkoralle: buildRiffkoralle,
  lavagestein: buildLavagestein,
};
