// Höhlen-/Minen-Kulisse Welt 5 (5-5 „Zündköpfe in der Höhle“): Stollen-Holzbalken, Lore, Schienenstück, Grubenlaterne und
// die lila Ziegelwand (sprengbar). Eigene Gestaltung. Maßstab Meter, Ursprung = Mitte der Unterseite (Ausnahmen genannt),
// Vorderseite/Fahrtrichtung +X; state darf ein String sein.
//
// holzbalken      Stollen-Holz: opts { kind: 'rahmen' (Standard) | 'balken', width (3), height (3), length (Balken, 3) }
//                 rahmen: zwei Pfosten (bei z = ±width/2) mit Kappbalken, Kopfbändern und Eisenwinkeln – Durchgang entlang X;
//                 balken: ein liegender Balken entlang X mit Eisenbändern.  state –
// lore            Grubenlore ≈1,4 m lang, 1 m breit: genietete rostrote Wanne, Eisenbänder, vier Räder, Ladung.
//                 **Ursprung = Schienen-Oberkante** unter der Mitte (Spur 0,9 m wie schiene_stueck).
//                 opts { load: 'erz' | 'kristall' | 'gold' | 'leer' }  state { anim: 'idle'|'drive', speed (m/s) }
// schiene_stueck  Gleisstück entlang X: zwei Stahlschienen (Spur 0,9 m) auf Holzschwellen.  opts { length (4), gauge (0,9) }
//                 root.userData.railY → Schienen-Oberkante (0,2 m).  state –
// grubenlaterne   Grubenlaterne: Messingkappe mit Bügel, Gitterkorb, warm leuchtendes Glas, flackernder Schein.
//                 opts { hang: false (true: hängt an einer Kette – **Ursprung = Aufhängepunkt**, Laterne darunter) }
//                 state { sway (0..1, hängend), flicker (0..1, Standard 1) }
// lila_ziegel     lila Ziegelblock (sprengbar mit Zündkopf/Krallen/POW): gewölbte lila Ziegel im Verband, Goldnieten oben.
//                 opts { size: [w, h, d] ([1, 1, 1]) }
//                 state { anim: 'idle'|'shake'|'break', progress? (break: 0..1 in 1,1 s – Block weg, Brocken fliegen) }
//                 Ganze Wände → createInstanced('lila_ziegel', n) (lib/instanced_w5.js, je Block 1 m).

import {
  THREE, TAU, Build, cached, vcol, mesh, joint, makeModel, Clock, damp, clamp, mix, smoothstep, instMesh, setInst,
  glowSprite, metal,
} from '../lib/kit.js';
import { gradV, lilaZiegelGeo, lilaChunkGeo, lilaMat, hash1, noise3 } from '../lib/w5Geos.js';

// =============================================================================================
// Holzbalken
// =============================================================================================
const WOOD = { w: 0xb87a42, hi: 0xe0a868, low: 0x7a4a26, grain: 0x8a5a30, iron: 0x3a3a48, ironHi: 0x6a6a7c, bolt: 0xc8b070 };
/** Holz mit Maserung entlang der Achse a ('x' | 'y'). */
const woodV = (axis) => ({ v: (x, y, z, nx, ny) => {
  const u = axis === 'y' ? x * 7 + z * 5 : y * 7 + z * 5;
  const g = Math.sin(u * 3 + noise3(x * 2, y * 2, z * 2) * 4) * 0.5 + 0.5;
  return mix(mix(WOOD.low, WOOD.hi, smoothstep(ny * 0.4 + 0.55 + nx * 0.1)), WOOD.grain, g * 0.3);
} });
function balkenGeo(kind, W, H, L) {
  return cached(`w5:balken:${kind}:${W}:${H}:${L}`, () => {
    const b = new Build();
    const t = 0.3;
    const ironV = gradV(WOOD.iron, WOOD.ironHi, 0.5, 0.5);
    if (kind === 'balken') {
      b.box(L, t, t, woodV('x'), { p: [0, t / 2, 0] }, 0.05, 2);
      for (const x of [-L / 2 + 0.3, L / 2 - 0.3]) {
        b.box(0.12, t + 0.04, t + 0.04, ironV, { p: [x, t / 2, 0] }, 0.02, 1);
        for (const s of [1, -1]) b.sphere(0.03, WOOD.bolt, { p: [x, t / 2, s * (t / 2 + 0.03)] }, 8, 6);
      }
      return b.geometry();
    }
    for (const s of [1, -1]) {
      b.box(t, H - t, t, woodV('y'), { p: [0, (H - t) / 2, s * (W / 2)] }, 0.05, 2);
      // Kopfband (schräg)
      const len = 0.85;
      b.box(0.16, len, 0.16, woodV('y'), { p: [0, H - t - 0.3, s * (W / 2 - 0.3)], r: [s * 0.78, 0, 0] }, 0.03, 1);
      // Eisenwinkel an der Ecke
      b.box(t + 0.06, 0.28, t + 0.06, ironV, { p: [0, H - t - 0.12, s * W / 2] }, 0.02, 1);
      for (const sx of [1, -1]) b.sphere(0.035, WOOD.bolt, { p: [sx * (t / 2 + 0.035), H - t - 0.12, s * W / 2] }, 8, 6);
      // Fußstein
      b.box(t + 0.14, 0.14, t + 0.14, gradV(0x5a5468, 0x9a94aa), { p: [0, 0.07, s * W / 2] }, 0.05, 1);
    }
    b.box(t + 0.04, t, W + 0.7, woodV('x'), { p: [0, H - t / 2, 0] }, 0.05, 2);
    return b.geometry();
  });
}
function buildHolzbalken(opts = {}) {
  const kind = opts.kind === 'balken' ? 'balken' : 'rahmen';
  const W = Math.max(1, opts.width ?? 3), H = Math.max(1, opts.height ?? 3), L = Math.max(0.5, opts.length ?? 3);
  const root = new THREE.Group();
  const m = mesh(balkenGeo(kind, W, H, L), vcol(0.75, {}, 'w5wood'), {}, true);
  m.receiveShadow = true;
  root.add(m);
  return makeModel('holzbalken', root, () => {}, [], { initial: 'idle' });
}

// =============================================================================================
// Schienenstück
// =============================================================================================
function schieneGeo(L, G) {
  return cached(`w5:schiene:${L}:${G}`, () => {
    const b = new Build();
    const n = Math.max(2, Math.round(L / 0.6));
    for (let i = 0; i < n; i++) b.box(0.3, 0.12, G + 0.5, woodV('x'), { p: [-L / 2 + (i + 0.5) * (L / n), 0.06, 0], r: [0, (hash1(i) - 0.5) * 0.06, 0] }, 0.03, 1);
    for (const s of [1, -1]) {
      b.box(L, 0.05, 0.12, 0x5a5a6a, { p: [0, 0.145, s * G / 2] }, 0.01, 1);
      b.box(L, 0.04, 0.05, 0x7a7a8a, { p: [0, 0.18, s * G / 2] }, 0.005, 1);
      b.box(L, 0.04, 0.09, gradV(0x8a8e9a, 0xe8ecf4), { p: [0, 0.2, s * G / 2] }, 0.015, 1);
    }
    return b.geometry();
  });
}
function buildSchiene(opts = {}) {
  const L = Math.max(0.6, opts.length ?? 4), G = Math.max(0.4, opts.gauge ?? 0.9);
  const root = new THREE.Group();
  const m = mesh(schieneGeo(L, G), vcol(0.5, { metalness: 0.2 }, 'w5rail'), {}, true);
  m.receiveShadow = true;
  root.add(m);
  root.userData.railY = 0.22;
  return makeModel('schiene_stueck', root, () => {}, [], { initial: 'idle' });
}

// =============================================================================================
// Lore
// =============================================================================================
const LORE = { tub: 0xb8442a, tubHi: 0xe87a4a, tubLow: 0x6a2216, band: 0x3a3a48, rivet: 0xd8c08a };
function loreGeo() {
  return cached('w5:lore', () => {
    const b = new Build();
    // Wanne: oben breiter (Trapez), abgerundet
    const g = new THREE.BoxGeometry(1, 1, 1, 6, 4, 6);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i); const k = 0.82 + (y + 0.5) * 0.18; P.setXYZ(i, x * 1.35 * k, y * 0.62, z * 0.95 * k); }
    g.computeVertexNormals();
    b.add(g, { v: (x, y, z, nx, ny) => mix(LORE.tubLow, LORE.tubHi, smoothstep(ny * 0.4 + 0.5 + nx * 0.15 + noise3(x * 6, y * 6, z * 6) * 0.2)) }, { p: [0, 0.78, 0] });
    // Eisenbänder, Rand, Nieten
    b.box(1.4, 0.07, 1.0, gradV(LORE.band, 0x6a6a7c), { p: [0, 1.08, 0] }, 0.03, 1);
    for (const x of [-0.42, 0, 0.42]) {
      b.box(0.07, 0.6, 1.0, LORE.band, { p: [x, 0.78, 0] }, 0.02, 1);
      for (const s of [1, -1]) for (const y of [0.6, 0.9]) b.sphere(0.022, LORE.rivet, { p: [x, y, s * 0.49] }, 8, 6);
    }
    // Fahrgestell
    b.box(1.1, 0.12, 0.7, LORE.band, { p: [0, 0.42, 0] }, 0.03, 1);
    for (const s of [1, -1]) b.cyl(0.05, 0.05, 0.25, 0x8a8e9a, { p: [s * 0.75, 0.55, 0], r: [0, 0, Math.PI / 2] }, 10);
    return b.geometry();
  });
}
function loadGeo(kind) {
  return cached(`w5:lore:load:${kind}`, () => {
    const b = new Build();
    if (kind === 'leer') { b.cyl(0.6, 0.6, 0.02, 0x2a1a14, { p: [0, 0.9, 0], s: [1.15, 1, 0.75] }, 20); return b.geometry(); }
    b.sphere(1, gradV(0x4a4458, 0x8a84a0), { p: [0, 1.05, 0], s: [0.6, 0.2, 0.42] }, 20, 10);
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = i * 2.39, r = Math.sqrt((i + 0.5) / n) * 0.5;
      const x = Math.cos(a) * r * 1.1, z = Math.sin(a) * r * 0.75, y = 1.12 + (1 - r * 1.6) * 0.14;
      if (kind === 'kristall' && i % 2 === 0) {
        b.add(new THREE.ConeGeometry(0.07, 0.28, 6), gradV(0x7a2ad8, 0xe0a8ff), { p: [x, y + 0.08, z], r: [hash1(i) - 0.5, 0, hash1(i + 1) - 0.5] });
      } else if ((kind === 'gold' && i % 2 === 0) || (kind === 'erz' && i % 4 === 0)) {
        b.add(new THREE.IcosahedronGeometry(0.08, 1), gradV(0xc88a10, 0xfff0a0), { p: [x, y, z] });
      } else b.add(new THREE.IcosahedronGeometry(0.1, 1), gradV(0x4a4458, 0x8a84a0), { p: [x, y - 0.02, z], s: [1, 0.8, 1] });
    }
    return b.geometry();
  });
}
const loreWheelGeo = () => cached('w5:lore:wheel', () => {
  const b = new Build();
  b.cyl(0.2, 0.2, 0.08, gradV(0x2a2a36, 0x6a6a7c), { r: [Math.PI / 2, 0, 0] }, 20);
  b.cyl(0.24, 0.24, 0.03, 0x4a4a5a, { p: [0, 0, -0.045], r: [Math.PI / 2, 0, 0] }, 20);
  for (let i = 0; i < 4; i++) b.box(0.3, 0.04, 0.02, 0xd8c08a, { p: [0, 0, 0.045], r: [0, 0, (i / 4) * Math.PI] }, 0.01, 1);
  return b.geometry();
});
function buildLore(opts = {}) {
  const load = ['erz', 'kristall', 'gold', 'leer'].includes(opts.load) ? opts.load : 'erz';
  const root = new THREE.Group();
  const body = joint();
  const tub = mesh(loreGeo(), vcol(0.5, { metalness: 0.15 }, 'w5lore'), {}, true);
  const cargo = mesh(loadGeo(load), vcol(0.4), {}, true);
  body.add(tub, cargo);
  const wheels = instMesh(loreWheelGeo(), vcol(0.45), 4, 1.5, 0.3);
  wheels.castShadow = true;
  root.add(body, wheels);
  const clk = new Clock();
  let roll = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const speed = anim === 'drive' ? (st.speed ?? 3) : 0;
    roll += dt * speed / 0.24;
    body.position.y = anim === 'drive' ? Math.abs(Math.sin(clk.t * 17)) * 0.012 : 0;
    body.rotation.x = anim === 'drive' ? Math.sin(clk.t * 9) * 0.015 : 0;
    let i = 0;
    for (const x of [0.45, -0.45]) for (const s of [1, -1]) setInst(wheels, i++, x, 0.24, s * 0.45, 0, s > 0 ? 0 : Math.PI, s > 0 ? -roll : roll, 1);
    wheels.instanceMatrix.needsUpdate = true;
  };
  return makeModel('lore', root, update, [wheels], { initial: 'idle' });
}

// =============================================================================================
// Grubenlaterne
// =============================================================================================
function laterneGeo() {
  return cached('w5:laterne', () => {
    const b = new Build();
    const brass = gradV(0x9a6a18, 0xffe08a, 0.5, 0.5);
    b.cyl(0.13, 0.15, 0.05, brass, { p: [0, 0.025, 0] }, 20);
    b.cyl(0.08, 0.15, 0.1, brass, { p: [0, 0.42, 0] }, 20);
    b.cyl(0.05, 0.06, 0.05, brass, { p: [0, 0.49, 0] }, 14);
    b.torus(0.07, 0.012, brass, { p: [0, 0.57, 0], r: [0, 0, 0] }, 6, 18);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + Math.PI / 4; b.cyl(0.012, 0.012, 0.33, 0x3a3a48, { p: [Math.cos(a) * 0.125, 0.21, Math.sin(a) * 0.125] }, 6); }
    for (const y of [0.13, 0.28]) b.torus(0.128, 0.008, 0x3a3a48, { p: [0, y, 0], r: [Math.PI / 2, 0, 0] }, 4, 20);
    return b.geometry();
  });
}
const laterneGlassGeo = () => cached('w5:laterne:glass', () => new Build().lathe([[0, 0.05], [0.1, 0.06], [0.115, 0.2], [0.1, 0.36], [0, 0.37]], { v: (x, y) => mix(0xffb040, 0xfff6c8, smoothstep(1 - Math.abs(y - 0.2) / 0.17)) }, null, 18, 2).geometry());
function buildGrubenlaterne(opts = {}) {
  const hang = !!opts.hang;
  const root = new THREE.Group();
  const own = [];
  const swing = joint();
  const lamp = joint(hang ? [0, -0.95, 0] : [0, 0, 0]);
  lamp.add(mesh(laterneGeo(), vcol(0.3, { metalness: 0.3 }, 'w5brass'), {}, true));
  const glassMat = new THREE.MeshBasicMaterial({ vertexColors: true, color: 0xffffff });
  own.push(glassMat);
  lamp.add(mesh(laterneGlassGeo(), glassMat, {}));
  const glow = glowSprite(0xffc060, 1.4, 0.65);
  glow.material = glow.material.clone(); own.push(glow.material);
  glow.position.y = 0.2;
  lamp.add(glow);
  if (hang) {
    const chain = mesh(cached('w5:laterne:chain', () => {
      const b = new Build();
      for (let i = 0; i < 6; i++) b.torus(0.04, 0.01, 0x5a5a6a, { p: [0, -0.06 - i * 0.065, 0], r: [0, i % 2 ? Math.PI / 2 : 0, 0] }, 4, 12);
      b.box(0.3, 0.05, 0.08, 0x3a3a48, { p: [0, 0.02, 0] }, 0.015, 1);
      return b.geometry();
    }), vcol(0.4), {}, true);
    swing.add(chain);
  }
  swing.add(lamp);
  root.add(swing);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t = clk.t;
    const fl = clamp(st.flicker ?? 1, 0, 1);
    const k = 1 - fl * (0.12 + Math.sin(t * 13) * 0.05 + Math.sin(t * 29) * 0.04 + (Math.sin(t * 3.7) > 0.95 ? 0.2 : 0));
    glassMat.color.setScalar(k);
    glow.material.opacity = 0.65 * k;
    glow.scale.setScalar(1.3 + k * 0.2);
    if (hang) { const sw = clamp(st.sway ?? 0.3, 0, 1); swing.rotation.z = Math.sin(t * 1.6) * 0.12 * sw; swing.rotation.x = Math.sin(t * 1.1 + 1) * 0.06 * sw; }
  };
  return makeModel('grubenlaterne', root, update, own, { initial: 'idle' });
}

// =============================================================================================
// Lila Ziegel (Einzelblock)
// =============================================================================================
function buildLilaZiegel(opts = {}) {
  const s = Array.isArray(opts.size) ? opts.size : [1, 1, 1];
  const w = Math.max(0.5, s[0] ?? 1), h = Math.max(0.25, s[1] ?? 1), d = Math.max(0.3, s[2] ?? 1);
  const root = new THREE.Group();
  const block = mesh(lilaZiegelGeo(w, h, d, false), lilaMat(), {}, true);
  block.receiveShadow = true;
  const chunks = instMesh(lilaChunkGeo(), lilaMat(), 10, 4, 1);
  chunks.castShadow = true;
  chunks.visible = false;
  root.add(block, chunks);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    if (anim === 'break') {
      const p = st.progress !== undefined ? clamp(st.progress, 0, 1) : clamp(clk.age / 1.1, 0, 1);
      const a = p * 1.1;
      block.visible = false;
      chunks.visible = p < 1;
      for (let i = 0; i < 10; i++) {
        const ax = (hash1(i) - 0.5) * 2, az = (hash1(i + 4) - 0.5) * 2, y0 = (i % 3) * h / 3 + 0.2;
        const vy = 4 + hash1(i + 7) * 3;
        const sc = Math.max(0.001, 1 - Math.max(0, a - 0.8) / 0.3);
        setInst(chunks, i, ax * w * (0.3 + a * 2), Math.max(0.1, y0 + vy * a - 9 * a * a), az * d * (0.3 + a * 2), a * 9 + i, a * 7, a * 5, sc);
      }
      chunks.instanceMatrix.needsUpdate = true;
    } else {
      block.visible = true; chunks.visible = false;
      const k = anim === 'shake' ? Math.max(0, 1 - clk.age / 0.4) : 0;
      block.position.set(Math.sin(clk.t * 50) * 0.03 * k, 0, Math.cos(clk.t * 43) * 0.03 * k);
    }
  };
  return makeModel('lila_ziegel', root, update, [chunks], { initial: 'idle' });
}

export const MODELS = {
  holzbalken: buildHolzbalken,
  schiene_stueck: buildSchiene,
  lore: buildLore,
  grubenlaterne: buildGrubenlaterne,
  lila_ziegel: buildLilaZiegel,
};
