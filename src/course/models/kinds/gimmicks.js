// Modelle der Sonder-Bausteine (Kurs-Modus, Welt 1). Eigene Gestaltung im Spielzeug-Look (kräftige Farben,
// runde Kanten). Maßstab Meter, Ursprung = Fußpunkt (Mitte der Unterseite), Blick/Vorderseite nach +X.
// state darf ein String sein ('open' ≙ { anim: 'open' }).
//
// crate          Holzkiste 1 m: helle Bretter, dunkler Rahmen, Querstreben.  opts { size (1) }
//                state { anim: 'idle'|'bump'|'break', n? }  bump: wackelt; break: unsichtbar (Splitter macht der Motor)
// chest          Schatztruhe ≈ 1,1 × 0,95 × 0,75 m (rotes Holz, Goldbeschläge).  state { anim: 'closed'|'open' }
//                open: Deckel klappt nach hinten (−X) auf, goldener Schein.
// push_switch    Druckschalter 1 m (statt „P“-Schalter): blauer Knopf mit weißem Funkel auf grauem Sockel.
//                state { anim: 'idle'|'pressed' }  pressed: Knopf flach gedrückt (0,25 s)
// star_ring      Sternenring Ø 2,2 m, senkrecht (Durchlaufrichtung ±X), Mitte bei y = 1,15: goldener Reif mit
//                acht grünen Sternen.  state { anim: 'idle'|'active'|'done', progress? (0..1 Restzeit) }
// star_coin      Sternmünze Ø 0,8 m (grün, Stern-Relief), Mitte bei y = 0,45, Flächen nach ±Z.  state –
// endless_block  Dauer-Münzblock 1 m: türkis-goldener Block mit Münzstapel-Bild, zwölf Zeit-Perlen am Rand.
//                state { anim: 'idle'|'bump'|'used', timer (0..1 Restzeit des Trefferfensters), n? }
// roulette_block Glaswürfel 1 m mit weißem Rahmen (Inhalt zeigt die Entität darin).  state { anim: 'idle'|'bump', n? }
// warp_box       Warp-Box 1,6 × 1,2 × 1,6 m mit Öffnung oben.  opts { style: 'warp' (blau, Pfeil-Wirbel) |
//                'mystery' (violett-gold, Funkelsterne) }  state { anim: 'idle'|'suck' }  suck: Wirbel dreht schnell
// cloud_cannon   Wolkenkanone ≈ 2 m Ø, 2,2 m hoch: Wolkensockel mit Gesicht, himmelblaues Rohr senkrecht nach oben
//                (Öffnung bei y = 2,2).  state { anim: 'idle'|'load'|'fire' }
// claw_wheel     Krallenrad (Scheibe in der YZ-Ebene, Achse ±X), Mitte im Ursprung.  opts { radius (1,6) }
//                state { angle (rad), glow (0..1) }
// mega_block     grauer Hartstein-Block 1 m (Blockwand), Nieten, Risse.  state – (für Instanz-Pools)
// pixel_egg      Pixel-Relief der Heldin (16 × 24 Pixel à 0,15 m), Relief zeigt nach +X, Unterkante bei y = 0.
//                opts { hero: 'lotti'|'greta' }  state { appear (0..1) }
// item_tree      Baum mit Versteck in der Krone (4,5 m).  opts { size (4,5), color ('green'|'autumn') }
//                state { shake (0..1) }  Krone wackelt

import {
  THREE, TAU, Build, cached, vcol, basic, std, mesh, joint, makeModel, Clock, damp, clamp, col, mix,
  smoothstep, glowSprite, sparkleSprite, starShape, puffyStarGeo, roundedBox, SIDE, eyes,
} from '../lib/kit.js';

/** Stoß-Kurve wie bei den Blöcken (0,25 s). */
function bumpCurve(age) {
  if (age > 0.25) return { y: 0, sy: 1 };
  const k = age / 0.25;
  return { y: Math.sin(k * Math.PI) * 0.3, sy: 1 + Math.sin(k * Math.PI) * 0.08 };
}
function trigger(clk, st, names) {
  const fresh = clk.entered || (st.n !== undefined && st.n !== clk.lastN);
  clk.lastN = st.n;
  if (fresh && names.includes(clk.anim)) clk.age = 0;
  return clk.age;
}

// =============================================================================================
// Holzkiste
// =============================================================================================
const WOOD = { plank: 0xe2ad66, plankDark: 0xc98d48, frame: 0x8a5426, nail: 0x5a3a20 };
function crateGeo() {
  return cached('gm:crate', () => {
    const b = new Build();
    // Bretter: senkrechte Streifen (je Fläche abwechselnd hell/dunkel)
    b.box(0.9, 0.9, 0.9, (x, y, z, nx, ny, nz) => {
      const u = Math.abs(nx) > 0.5 ? z : x;
      if (Math.abs(ny) > 0.5) return Math.floor((x + 0.45) / 0.225) % 2 ? WOOD.plank : WOOD.plankDark;
      return Math.floor((u + 0.45) / 0.225) % 2 ? WOOD.plank : WOOD.plankDark;
    }, { p: [0, 0.5, 0] }, 0.02, 1);
    // Rahmen: 12 Kanten
    const e = 0.5 - 0.06;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.13, 1, 0.13, WOOD.frame, { p: [sx * e, 0.5, sz * e] }, 0.03, 1);
    for (const y of [0.065, 0.935]) {
      for (const s of [-1, 1]) {
        b.box(1, 0.13, 0.13, WOOD.frame, { p: [0, y, s * e] }, 0.03, 1);
        b.box(0.13, 0.13, 1, WOOD.frame, { p: [s * e, y, 0] }, 0.03, 1);
      }
    }
    // Querstreben auf den vier Seiten
    for (const [ax, s] of [['x', 1], ['x', -1], ['z', 1], ['z', -1]]) {
      const p = ax === 'x' ? [s * 0.47, 0.5, 0] : [0, 0.5, s * 0.47];
      const r = ax === 'x' ? [Math.PI / 4, 0, 0] : [0, 0, Math.PI / 4];
      b.box(ax === 'x' ? 0.08 : 1.05, ax === 'x' ? 1.05 : 0.12, ax === 'x' ? 0.12 : 0.08, WOOD.frame, { p, r }, 0.02, 1);
    }
    // Nägel an den Ecken
    for (const sx of [-1, 1]) for (const sy of [0.065, 0.935]) for (const sz of [-1, 1]) b.sphere(0.03, WOOD.nail, { p: [sx * 0.51, sy, sz * 0.44] }, 6, 4);
    return b.geometry();
  });
}
function buildCrate(opts = {}) {
  const size = Number(opts.size ?? 1);
  const root = new THREE.Group();
  const bump = joint();
  bump.add(mesh(crateGeo(), vcol(0.75), {}, true));
  bump.scale.setScalar(size);
  root.add(bump);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const age = trigger(clk, st, ['bump']);
    bump.visible = anim !== 'break';
    const k = anim === 'bump' && age < 0.3 ? Math.sin((age / 0.3) * Math.PI * 3) * (1 - age / 0.3) : 0;
    bump.rotation.z = k * 0.12;
    bump.position.y = Math.abs(k) * 0.08;
  };
  return makeModel('crate', root, update);
}

// =============================================================================================
// Schatztruhe
// =============================================================================================
function chestGeo() {
  return cached('gm:chest', () => {
    const b = new Build();
    b.box(0.75, 0.55, 1.1, (x, y, z, nx, ny) => (ny < -0.5 ? 0x5a1e14 : Math.floor((y + 0.3) / 0.14) % 2 ? 0xb8402a : 0xa0331f), { p: [0, 0.3, 0] }, 0.05, 2);
    for (const z of [-0.42, 0.42]) b.box(0.8, 0.58, 0.1, 0xffc21a, { p: [0, 0.3, z] }, 0.03, 1);
    b.box(0.08, 0.2, 0.22, 0xffc21a, { p: [0.39, 0.5, 0] }, 0.03, 1);
    b.sphere(0.035, 0x5a3a10, { p: [0.44, 0.48, 0] }, 8, 6);
    return b.geometry();
  });
}
function chestLidGeo() {
  return cached('gm:chestLid', () => {
    const b = new Build();
    // halber Zylinder (Achse Z), Gelenk an der Hinterkante (x = −0,375)
    const g = new THREE.CylinderGeometry(0.375, 0.375, 1.1, 18, 1, false, 0, Math.PI);
    g.rotateX(Math.PI / 2); g.rotateZ(Math.PI / 2);
    b.add(g, { v: (x, y) => (y > 0.25 ? col(0xc84a32) : col(0xa8392a)) }, { p: [0.375, 0, 0] });
    for (const z of [-0.42, 0.42]) {
      const t = new THREE.TorusGeometry(0.38, 0.05, 6, 18, Math.PI);
      b.add(t, 0xffc21a, { p: [0.375, 0, z], r: [0, 0, 0] });
    }
    b.box(0.1, 0.12, 0.22, 0xffc21a, { p: [0.76, 0.02, 0] }, 0.03, 1);
    return b.geometry();
  });
}
function buildChest() {
  const root = new THREE.Group();
  const base = mesh(chestGeo(), vcol(0.45), {}, true);
  const hinge = joint([-0.375, 0.58, 0]);
  hinge.add(mesh(chestLidGeo(), vcol(0.45), {}, true));
  const glow = glowSprite(0xffe08a, 1.6, 0.8); glow.position.set(0, 0.8, 0);
  root.add(base, hinge, glow);
  const clk = new Clock();
  let open = 0;
  const update = (dt, st) => {
    const anim = st.anim === 'open' ? 'open' : 'closed';
    clk.tick(dt, anim);
    open = damp(open, anim === 'open' ? 1 : 0, 7, dt);
    hinge.rotation.z = open * 1.9;
    glow.visible = open > 0.1;
    glow.scale.setScalar(Math.max(0.001, open * (1.4 + Math.sin(clk.t * 6) * 0.15)));
  };
  return makeModel('chest', root, update, [], { initial: 'closed' });
}

// =============================================================================================
// Druckschalter (P-Schalter-Ersatz)
// =============================================================================================
function pushBaseGeo() {
  return cached('gm:pushBase', () => {
    const b = new Build();
    b.lathe([[0, 0], [0.5, 0], [0.52, 0.04], [0.5, 0.14], [0.42, 0.16], [0, 0.16]], { v: (x, y) => (y > 0.1 ? col(0xe8ebf2) : col(0x9aa0b0)) }, null, 28);
    return b.geometry();
  });
}
function pushButtonGeo() {
  return cached('gm:pushButton', () => {
    const b = new Build();
    b.lathe([[0, 0], [0.4, 0], [0.42, 0.06], [0.41, 0.3], [0.36, 0.38], [0.2, 0.42], [0, 0.43]], { v: (x, y) => mix(0x1f5fd8, 0x5aa2ff, smoothstep(y / 0.42)) }, null, 28, 2);
    b.extrude(starShape(0.2, 0.08, 4), 0.03, 0xffffff, { p: [0, 0.43, 0], r: [-Math.PI / 2, 0, Math.PI / 4] }, 0.012, 1, 1);
    return b.geometry();
  });
}
function buildPushSwitch() {
  const root = new THREE.Group();
  const base = mesh(pushBaseGeo(), vcol(0.4), {}, true);
  const btn = joint([0, 0.14, 0], mesh(pushButtonGeo(), vcol(0.3), {}, true));
  const sp = sparkleSprite(0xffffff, 0.4); sp.position.set(0.2, 0.75, 0.2);
  root.add(base, btn, sp);
  const clk = new Clock();
  let h = 1;
  const update = (dt, st) => {
    const anim = st.anim === 'pressed' ? 'pressed' : 'idle';
    clk.tick(dt, anim);
    h = damp(h, anim === 'pressed' ? 0.22 : 1, 18, dt);
    btn.scale.set(1 + (1 - h) * 0.12, h, 1 + (1 - h) * 0.12);
    const k = anim === 'idle' ? Math.pow(Math.max(0, Math.sin(clk.t * 1.9)), 10) : 0;
    sp.visible = k > 0.03; sp.scale.setScalar(Math.max(0.001, k * 0.45));
  };
  return makeModel('push_switch', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Sternenring und Sternmünze
// =============================================================================================
function starRingGeo() {
  return cached('gm:starRing', () => {
    const b = new Build();
    b.torus(1.0, 0.11, { v: (x, y, z, nx, ny) => mix(0xd99a00, 0xfff07a, smoothstep((ny + 0.6) / 1.4)) }, { r: [0, Math.PI / 2, 0] }, 10, 48);
    b.torus(1.0, 0.045, 0xffffff, { p: [0.09, 0, 0], r: [0, Math.PI / 2, 0] }, 6, 48);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      b.add(puffyStarGeo(0.17, 0.08, 0.06, 0.03), 0x3ee05a, { p: [0, Math.sin(a) * 1.0, Math.cos(a) * 1.0], r: [a, Math.PI / 2, 0] });
    }
    return b.geometry();
  });
}
function buildStarRing() {
  const root = new THREE.Group();
  const ringJ = joint([0, 1.15, 0]);
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.2, emissive: 0x000000 });
  const ring = mesh(starRingGeo(), m, {}, true);
  ringJ.add(ring);
  const glow = glowSprite(0xfff08a, 2.8, 0.35); glow.position.y = 1.15;
  root.add(ringJ, glow);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    const active = anim === 'active', done = anim === 'done';
    ring.rotation.x = t * (active ? 2.8 : 0.5);
    ringJ.scale.setScalar(1 + Math.sin(t * (active ? 9 : 2.2)) * (active ? 0.04 : 0.02));
    m.emissive.setRGB(active ? 0.4 + Math.sin(t * 9) * 0.15 : 0.08, active ? 0.3 : 0.06, 0);
    m.transparent = done; m.opacity = done ? 0.35 : 1; m.depthWrite = !done;
    glow.visible = !done;
    glow.scale.setScalar(active ? 3.2 : 2.6 + Math.sin(t * 2) * 0.15);
  };
  return makeModel('star_ring', root, update, [m]);
}
function starCoinGeo() {
  return cached('gm:starCoin', () => {
    const b = new Build();
    b.lathe([[0, 0.06], [0.33, 0.06], [0.38, 0.05], [0.4, 0], [0.38, -0.05], [0.33, -0.06], [0, -0.06]], { v: (x, y, z, nx, ny) => (Math.abs(ny) > 0.9 ? col(0x1fae4a) : col(0x8cffb0)) }, { r: [Math.PI / 2, 0, 0] }, 28);
    for (const s of [1, -1]) b.add(puffyStarGeo(0.24, 0.11, 0.03, 0.025), 0xc8ffd8, { p: [0, 0, s * 0.065], r: [0, s > 0 ? 0 : Math.PI, 0] });
    return b.geometry();
  });
}
function buildStarCoin() {
  const root = new THREE.Group();
  const spin = joint([0, 0.45, 0], mesh(starCoinGeo(), vcol(0.25, { emissive: 0x0a4a1a }, 'starcoin'), {}, true));
  root.add(spin);
  const clk = new Clock();
  const update = (dt) => { clk.tick(dt, 'idle'); spin.rotation.y = clk.t * 2.4; };
  return makeModel('star_coin', root, update);
}

// =============================================================================================
// Dauer-Münzblock
// =============================================================================================
function endlessGeo(used) {
  return cached(`gm:endless:${used}`, () => {
    const b = new Build();
    const body = used ? 0xa8743a : 0x28c8b0, edge = used ? 0x6a4420 : 0x0f7a72;
    b.add(roundedBox(1, 1, 1, 0.1, SIDE.ALL, 0, 2), { v: (x, y, z, nx, ny, nz) => {
      const flat = Math.max(Math.abs(nx), Math.abs(ny), Math.abs(nz));
      return mix(edge, body, smoothstep((flat - 0.8) / 0.18));
    } }, { p: [0, 0.5, 0] });
    if (!used) {
      // Münzstapel-Bild auf vier Seiten: drei goldene Scheiben
      for (const [ax, s] of [['x', 1], ['x', -1], ['z', 1], ['z', -1]]) {
        for (let i = 0; i < 3; i++) {
          const y = 0.3 + i * 0.16;
          const p = ax === 'x' ? [s * 0.505, y, (i - 1) * 0.05] : [(i - 1) * 0.05, y, s * 0.505];
          const r = ax === 'x' ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0];
          b.cyl(0.2, 0.2, 0.03, i === 2 ? 0xfff07a : 0xffc21a, { p, r }, 18);
        }
      }
    }
    return b.geometry();
  });
}
function buildEndless() {
  const root = new THREE.Group();
  const bump = joint();
  const block = mesh(endlessGeo(false), vcol(0.35), {}, true);
  block.receiveShadow = true;
  bump.add(block);
  // zwölf Zeit-Perlen um die Oberkante (Restzeit des Trefferfensters)
  const pearlGeo = cached('gm:pearl', () => new THREE.SphereGeometry(0.06, 8, 6));
  const pearlOn = basic('gm:pearlOn', { color: 0xfff07a }), pearlOff = std('gm:pearlOff', { color: 0x2a4a50, roughness: 0.5 });
  const pearls = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const p = mesh(pearlGeo, pearlOff, { p: [Math.cos(a) * 0.62, 1.12, Math.sin(a) * 0.62] });
    pearls.push(p); bump.add(p);
  }
  root.add(bump);
  const clk = new Clock();
  let used = false;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const age = trigger(clk, st, ['bump']);
    if ((anim === 'used') !== used) { used = anim === 'used'; block.geometry = endlessGeo(used); }
    const b = anim === 'bump' ? bumpCurve(age) : { y: 0, sy: 1 };
    bump.position.y = b.y; bump.scale.y = b.sy;
    const timer = used ? 0 : clamp(st.timer ?? 0, 0, 1);
    const lit = Math.ceil(timer * 12);
    pearls.forEach((p, i) => { p.visible = !used; p.material = i < lit ? pearlOn : pearlOff; });
  };
  return makeModel('endless_block', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Roulette-Block (Glaswürfel)
// =============================================================================================
function buildRoulette() {
  const root = new THREE.Group();
  const bump = joint();
  const frame = mesh(cached('gm:rouletteFrame', () => {
    const b = new Build();
    const e = 0.46;
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) b.box(0.09, 1, 0.09, 0xffffff, { p: [x * e, 0.5, z * e] }, 0.035, 1);
    for (const y of [0.045, 0.955]) for (const [w, d, x, z] of [[1, 0.09, 0, e], [1, 0.09, 0, -e], [0.09, 1, e, 0], [0.09, 1, -e, 0]]) b.box(w, 0.09, d, 0xffffff, { p: [x, y, z] }, 0.035, 1);
    for (const [x, y, z] of [[1, 1, 1], [1, 1, -1], [-1, 1, 1], [-1, 1, -1]]) b.sphere(0.07, 0xffc21a, { p: [x * e, y * 0.955, z * e] }, 8, 6);
    return b.geometry();
  }), vcol(0.3), {}, true);
  const glass = mesh(cached('gm:rouletteGlass', () => { const g = roundedBox(0.94, 0.94, 0.94, 0.06, SIDE.ALL, 0, 1); g.translate(0, 0.5, 0); return g; }),
    std('gm:rouletteGlass', { color: 0xd8f4ff, transparent: true, opacity: 0.28, roughness: 0.05, depthWrite: false, emissive: 0x10303a }));
  glass.renderOrder = 2;
  bump.add(frame, glass);
  root.add(bump);
  root.userData.inner = joint([0, 0.12, 0]);
  bump.add(root.userData.inner);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const age = trigger(clk, st, ['bump']);
    const b = anim === 'bump' ? bumpCurve(age) : { y: 0, sy: 1 };
    bump.position.y = b.y; bump.scale.y = b.sy;
  };
  return makeModel('roulette_block', root, update);
}

// =============================================================================================
// Warp-Box
// =============================================================================================
function warpBoxGeo(style) {
  return cached(`gm:warpbox:${style}`, () => {
    const b = new Build();
    const mystery = style === 'mystery';
    const body = mystery ? 0x8a3ad8 : 0x2f7ae8, light = mystery ? 0xc08aff : 0x7ab8ff, dark = mystery ? 0x4a1a80 : 0x184a9a;
    // Wände (Kasten mit Öffnung): vier Seiten + Boden, oberer Rand rund
    const W = 1.6, H = 1.2, T = 0.18;
    for (const [x, z, w, d] of [[W / 2 - T / 2, 0, T, W], [-W / 2 + T / 2, 0, T, W], [0, W / 2 - T / 2, W - 2 * T, T], [0, -W / 2 + T / 2, W - 2 * T, T]]) {
      b.box(w, H, d, { v: (px, py) => mix(dark, body, smoothstep((py + H / 2) / H)) }, { p: [x, H / 2, z] }, 0.06, 2);
    }
    b.box(W - 0.1, 0.1, W - 0.1, dark, { p: [0, 0.05, 0] }, 0.03, 1);
    // Randwulst oben
    for (const [x, z, w, d] of [[W / 2 - T / 2, 0, T + 0.06, W + 0.06], [-W / 2 + T / 2, 0, T + 0.06, W + 0.06], [0, W / 2 - T / 2, W, T + 0.06], [0, -W / 2 + T / 2, W, T + 0.06]]) {
      b.box(w, 0.12, d, light, { p: [x, H - 0.02, z] }, 0.05, 2);
    }
    // Abzeichen auf den Seiten: Pfeil nach oben (warp) bzw. Funkelstern (mystery)
    for (const [ax, s] of [['x', 1], ['x', -1], ['z', 1], ['z', -1]]) {
      const p = ax === 'x' ? [s * (W / 2 + 0.01), H * 0.5, 0] : [0, H * 0.5, s * (W / 2 + 0.01)];
      const ry = ax === 'x' ? (s > 0 ? Math.PI / 2 : -Math.PI / 2) : (s > 0 ? 0 : Math.PI);
      if (mystery) b.extrude(starShape(0.34, 0.14, 4), 0.04, 0xffd21f, { p, r: [0, ry, 0] }, 0.015, 1, 1);
      else {
        const arrow = new THREE.Shape();
        arrow.moveTo(0, 0.36); arrow.lineTo(0.3, 0.04); arrow.lineTo(0.12, 0.04); arrow.lineTo(0.12, -0.32); arrow.lineTo(-0.12, -0.32); arrow.lineTo(-0.12, 0.04); arrow.lineTo(-0.3, 0.04); arrow.closePath();
        b.extrude(arrow, 0.04, 0xffe14a, { p, r: [0, ry, 0] }, 0.015, 1, 1);
      }
    }
    return b.geometry();
  });
}
function buildWarpBox(opts = {}) {
  const style = opts.style === 'mystery' ? 'mystery' : 'warp';
  const root = new THREE.Group();
  const box = mesh(warpBoxGeo(style), vcol(0.35), {}, true);
  box.receiveShadow = true;
  // Wirbel in der Öffnung (dunkle Scheibe + drehende Spirale)
  const hole = mesh(cached('gm:warpHole', () => { const g = new THREE.CircleGeometry(0.62, 28); g.rotateX(-Math.PI / 2); return g; }), basic('gm:warpHole', { color: 0x0a0a22 }), { p: [0, 0.9, 0] });
  const swirl = mesh(cached('gm:warpSwirl', () => {
    const b = new Build();
    for (let k = 0; k < 3; k++) {
      const pts = [];
      for (let i = 0; i <= 12; i++) { const t = i / 12, a = k * (TAU / 3) + t * 4.2, r = 0.08 + t * 0.5; pts.push([Math.cos(a) * r, 0, Math.sin(a) * r]); }
      b.tube(pts, 0.035, k === 0 ? 0xffffff : 0xffe14a, null, 24, 5);
    }
    return b.geometry();
  }), vcol(0.3, { emissive: 0x444422 }, 'swirl'), { p: [0, 0.92, 0] });
  const sp = sparkleSprite(0xffffff, 0.5); sp.position.set(0, 1.5, 0);
  root.add(box, hole, swirl, sp);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    swirl.rotation.y -= dt * (anim === 'suck' ? 14 : 2.2);
    const k = Math.pow(Math.max(0, Math.sin(clk.t * 2.1)), 8);
    sp.visible = k > 0.03; sp.scale.setScalar(Math.max(0.001, k * 0.6));
  };
  return makeModel('warp_box', root, update);
}

// =============================================================================================
// Wolkenkanone
// =============================================================================================
function cloudCannonGeo() {
  return cached('gm:cloudCannon', () => {
    const b = new Build();
    const cl = { v: (x, y, z, nx, ny) => mix(0xcfe0f2, 0xffffff, smoothstep((ny + 0.5) / 1.2)) };
    for (const [x, y, z, r] of [[0, 0.55, 0, 0.85], [0.7, 0.45, 0.35, 0.55], [-0.65, 0.45, 0.4, 0.55], [0.55, 0.45, -0.55, 0.55], [-0.6, 0.45, -0.5, 0.5], [0.05, 0.4, 0.8, 0.45], [0, 0.4, -0.8, 0.45]]) {
      b.sphere(r, cl, { p: [x, y, z], s: [1, 0.75, 1] }, 16, 10);
    }
    // Rohr senkrecht, goldener Rand
    b.cyl(0.52, 0.6, 1.5, { v: (x, y, z, nx) => mix(0x2a8ad8, 0x8ad4ff, smoothstep((nx * 0.6 - z * 0.3 + 0.4))) }, { p: [0, 1.45, 0] }, 24, true);
    b.torus(0.55, 0.09, 0xffd21f, { p: [0, 2.18, 0], r: [Math.PI / 2, 0, 0] }, 8, 28);
    b.torus(0.6, 0.06, 0xffd21f, { p: [0, 1.15, 0], r: [Math.PI / 2, 0, 0] }, 6, 28);
    b.cyl(0.47, 0.47, 0.05, 0x0a1a3a, { p: [0, 2.08, 0] }, 20);
    return b.geometry();
  });
}
function buildCloudCannon() {
  const root = new THREE.Group();
  const body = joint();
  body.add(mesh(cloudCannonGeo(), vcol(0.6), {}, true));
  const eye = eyes([{ p: [0.86, 0.62, 0.22], r: 0.11, sy: 1.3, dir: [1, 0.1, 0.3] }, { p: [0.86, 0.62, -0.22], r: 0.11, sy: 1.3, dir: [1, 0.1, -0.3] }], { key: 'cloudcannon', iris: 0x2a5ad8, pupil: 0.55 });
  body.add(eye);
  const puff = glowSprite(0xffffff, 1.6, 0.8); puff.position.y = 2.5;
  root.add(body, puff);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    let sx = 1, sy = 1;
    if (anim === 'load') { const k = Math.min(1, age / 0.4); sy = 1 - k * 0.12; sx = 1 + k * 0.08; }
    else if (anim === 'fire' && age < 0.4) { const k = age / 0.4; sy = 1 + Math.sin(k * Math.PI) * 0.18; sx = 1 - Math.sin(k * Math.PI) * 0.08; }
    else { sy = 1 + Math.sin(t * 2) * 0.015; }
    body.scale.set(sx, sy, sx);
    puff.visible = anim === 'fire' && age < 0.5;
    puff.scale.setScalar(1 + age * 4);
    eye.userData.blink(anim === 'load' ? 0.2 : 1);
  };
  return makeModel('cloud_cannon', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Krallenrad
// =============================================================================================
function clawWheelGeo(R) {
  return cached(`gm:clawWheel:${R}`, () => {
    const b = new Build();
    const segs = 12;
    // Reifen aus abwechselnd orangen/gelben Segmenten (Achse X)
    b.add(new THREE.TorusGeometry(R, R * 0.12, 10, 48), (x, y) => (Math.floor(((Math.atan2(y, x) + Math.PI) / TAU) * segs) % 2 ? 0xff9a1a : 0xffd21f), { r: [0, Math.PI / 2, 0] });
    // Scheibe
    b.cyl(R * 0.92, R * 0.92, 0.16, { v: (x, y, z) => mix(0x8a5a2a, 0xb8834a, smoothstep(Math.hypot(x, z) / R)) }, { r: [0, 0, Math.PI / 2] }, 36);
    // Speichen und Nabe
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      b.box(0.2, R * 1.7, 0.16, 0xffe9b0, { p: [0.12, 0, 0], r: [a, 0, 0] }, 0.05, 1);
    }
    b.cyl(R * 0.22, R * 0.22, 0.4, 0xffc21a, { r: [0, 0, Math.PI / 2] }, 20);
    b.sphere(R * 0.12, 0xfff3c0, { p: [0.22, 0, 0] }, 12, 8);
    // Pfotenabdrücke auf dem Reifen (Krallen-Hinweis)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.5;
      const y = Math.sin(a) * R * 0.72, z = Math.cos(a) * R * 0.72;
      b.sphere(R * 0.07, 0x5a3010, { p: [0.1, y, z], s: [0.4, 1, 1] }, 8, 6);
      for (let k = -1; k <= 1; k++) b.sphere(R * 0.03, 0x5a3010, { p: [0.1, y + Math.sin(a + k * 0.5) * R * 0.1, z + Math.cos(a + k * 0.5) * R * 0.1], s: [0.4, 1, 1] }, 6, 4);
    }
    return b.geometry();
  });
}
function buildClawWheel(opts = {}) {
  const R = Math.max(0.6, Number(opts.radius ?? 1.6));
  const root = new THREE.Group();
  const wheel = mesh(clawWheelGeo(R), vcol(0.45), {}, true);
  const glow = glowSprite(0xffd060, R * 3, 0.4);
  root.add(wheel, glow);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    wheel.rotation.x = st.angle ?? 0;
    const g = clamp(st.glow ?? 0, 0, 1);
    glow.visible = g > 0.02;
    glow.material.opacity = 0.4 * g;
  };
  return makeModel('claw_wheel', root, update);
}

// =============================================================================================
// Grauer Hartstein-Block (Blockwand)
// =============================================================================================
function buildMegaBlock() {
  const root = new THREE.Group();
  root.add(mesh(cached('gm:megaBlock', () => {
    const b = new Build();
    b.add(roundedBox(1, 1, 1, 0.08, SIDE.ALL, 0, 1), { v: (x, y, z, nx, ny, nz) => {
      const flat = Math.max(Math.abs(nx), Math.abs(ny), Math.abs(nz));
      return mix(0x5c5f6e, ny > 0.5 ? 0xb4b8c8 : 0x8d91a2, smoothstep((flat - 0.8) / 0.18));
    } }, { p: [0, 0.5, 0] });
    // Nieten in den Ecken jeder Seite + diagonaler Riss
    for (const [ax, s] of [['x', 1], ['x', -1], ['z', 1], ['z', -1]]) {
      for (const u of [-0.32, 0.32]) for (const v of [0.18, 0.82]) {
        const p = ax === 'x' ? [s * 0.5, v, u] : [u, v, s * 0.5];
        b.sphere(0.055, 0x4a4c58, { p, s: ax === 'x' ? [0.5, 1, 1] : [1, 1, 0.5] }, 6, 4);
      }
      const p = ax === 'x' ? [s * 0.502, 0.5, 0] : [0, 0.5, s * 0.502];
      const r = ax === 'x' ? [0.7, 0, 0] : [0, 0, 0.7];
      b.box(ax === 'x' ? 0.01 : 0.45, ax === 'x' ? 0.04 : 0.04, ax === 'x' ? 0.45 : 0.01, 0x3a3c46, { p, r }, 0, 1);
    }
    return b.geometry();
  }), vcol(0.6), {}, true));
  return makeModel('mega_block', root, () => {});
}

// =============================================================================================
// Pixel-Relief der Heldin (Easter-Egg)
// =============================================================================================
// 16 × 24 Pixel, von oben nach unten. Zeichen: . leer, h Haar, H Haar dunkel, s Haut, e Auge, m Mund,
// d Kleid, D Kleid dunkel, w weiß (Kragen/Söckchen), b Schuh, r Schleife
const PIXELS = [
  '................',
  '.....hhhhhh.....',
  '....hhhhhhhh....',
  '...hhHhhhhHhh...',
  '..rhhhhhhhhhhr..',
  '..hhsssssssshh..',
  '..hhsessssesshh.',
  '..Hhsessssesshh.',
  '..Hhssssssssh...',
  '..H.ssmmmmss.H..',
  '..H..ssssss..H..',
  '..h...wwww...h..',
  '..r..dddddd..r..',
  '....ddddddddd...',
  '...sddddddddds..',
  '...sdDddddDdds..',
  '....dddddddd....',
  '...dddddddddd...',
  '..dddDddddDddd..',
  '..dddddddddddd..',
  '.....ss..ss.....',
  '.....ww..ww.....',
  '....bbb..bbb....',
  '....bbb..bbb....',
];
const PIX_COL = {
  lotti: { h: 0xc8963c, H: 0x8a5a1c, s: 0xffd6b0, e: 0x2a2550, m: 0xe8505a, d: 0x3d8bff, D: 0x1f5fc8, w: 0xffffff, b: 0x6a3a1c, r: 0xff4a6a },
  greta: { h: 0xf3d97a, H: 0xc8a840, s: 0xffd6b0, e: 0x2a2550, m: 0xe8505a, d: 0x4fd04a, D: 0x2f9a2c, w: 0xffffff, b: 0x6a3a1c, r: 0xffa83a },
};
export const PIXEL_SIZE = 0.15;
function pixelGeo(hero) {
  return cached(`gm:pixel:${hero}`, () => {
    const b = new Build();
    const pal = PIX_COL[hero] ?? PIX_COL.lotti;
    const P = PIXEL_SIZE, rows = PIXELS.length, cols = PIXELS[0].length;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const ch = PIXELS[r][c];
        if (ch === '.') continue;
        const depth = ch === 'e' || ch === 'm' ? 0.08 : 0.16;
        b.box(depth, P, P, pal[ch] ?? 0xff00ff, { p: [depth / 2, (rows - r - 0.5) * P, (c - cols / 2 + 0.5) * P] }, 0, 1);
      }
    }
    return b.geometry();
  });
}
function buildPixelEgg(opts = {}) {
  const hero = opts.hero === 'greta' ? 'greta' : 'lotti';
  const root = new THREE.Group();
  const relief = joint();
  relief.add(mesh(pixelGeo(hero), vcol(0.5, { emissive: 0x111111 }, 'pixel'), {}, true));
  const sps = [0, 1, 2].map((i) => { const s = sparkleSprite(0xffffff, 0.6); s.position.set(0.3, 1 + i * 1.1, (i - 1) * 0.9); root.add(s); return s; });
  root.add(relief);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const a = clamp(st.appear ?? 1, 0, 1);
    relief.visible = a > 0.01;
    relief.scale.set(Math.max(0.001, smoothstep(a)), Math.max(0.001, 0.6 + 0.4 * smoothstep(a)), 1);
    sps.forEach((s, i) => {
      const k = a > 0.99 ? Math.pow(Math.max(0, Math.sin(clk.t * 2 + i * 2.1)), 8) : (a > 0.01 ? Math.sin(a * Math.PI) : 0);
      s.visible = k > 0.03; s.scale.setScalar(Math.max(0.001, k * 0.7));
    });
  };
  return makeModel('pixel_egg', root, update);
}

// =============================================================================================
// Baum mit Versteck (Krone wackelt)
// =============================================================================================
const CROWN = { green: [0xb9f286, 0x6cc74d, 0x3d8f32], autumn: [0xffcf7a, 0xf58f3a, 0xc45f22] };
function itemTreeGeos(h, color) {
  const trunkH = h * 0.42, rT = 0.09 * h, R = h * 0.26;
  const trunk = cached(`gm:itemTree:trunk:${h}`, () => {
    const t = new Build();
    t.cyl(rT * 0.75, rT, trunkH + R * 0.4, { v: (x, y) => mix(0x5c3a22, 0x8a5a36, smoothstep(y / trunkH + 0.5)) }, { p: [0, (trunkH + R * 0.4) / 2, 0] }, 10);
    return t.geometry();
  });
  const crown = cached(`gm:itemTree:crown:${h}:${color}`, () => {
    const pal = CROWN[color] ?? CROWN.green;
    const c = new Build();
    const crownCol = { v: (x, y, z, nx, ny) => (ny >= 0 ? mix(pal[1], pal[0], smoothstep(ny / 0.9)) : mix(pal[1], pal[2], smoothstep(-ny / 0.9))) };
    for (const [dx, dy, dz, r] of [[0, R * 1.1, 0, R * 1.15], [-R * 0.75, R * 0.55, R * 0.25, R * 0.85], [R * 0.7, R * 0.7, -R * 0.2, R * 0.9], [0.1, R * 0.6, R * 0.7, R * 0.7]]) {
      c.sphere(r, crownCol, { p: [dx, dy, dz] }, 12, 9);
    }
    // ein paar Glöckchen-Blüten als Hinweis auf ein Versteck
    for (const [dx, dy, dz] of [[R * 0.9, R * 0.5, R * 0.5], [-R * 0.6, R * 1.4, R * 0.6], [R * 0.2, R * 0.2, -R * 0.95]]) c.sphere(0.12, 0xfff07a, { p: [dx, dy, dz] }, 8, 6);
    return c.geometry();
  });
  return { trunk, crown, trunkH };
}
function buildItemTree(opts = {}) {
  const h = Number(opts.size ?? 4.5);
  const g = itemTreeGeos(h, opts.color ?? 'green');
  const root = new THREE.Group();
  root.add(mesh(g.trunk, vcol(0.8), {}, true));
  const crown = joint([0, g.trunkH, 0], mesh(g.crown, vcol(0.8), {}, true));
  root.add(crown);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const s = clamp(st.shake ?? 0, 0, 1);
    crown.rotation.z = Math.sin(clk.t * 30) * 0.08 * s + Math.sin(clk.t * 0.9) * 0.015;
    crown.rotation.x = Math.cos(clk.t * 26) * 0.06 * s;
    crown.scale.setScalar(1 + s * 0.04);
  };
  return makeModel('item_tree', root, update);
}

export const MODELS = {
  crate: buildCrate,
  chest: buildChest,
  push_switch: buildPushSwitch,
  star_ring: buildStarRing,
  star_coin: buildStarCoin,
  endless_block: buildEndless,
  roulette_block: buildRoulette,
  warp_box: buildWarpBox,
  cloud_cannon: buildCloudCannon,
  claw_wheel: buildClawWheel,
  mega_block: buildMegaBlock,
  pixel_egg: buildPixelEgg,
  item_tree: buildItemTree,
};
