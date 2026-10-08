// Weitere Gegner Welt 1 (Kurs-Modus): Schnappblume, Rammbock-Bulle, Stampfstein, Wühler. Eigene Gestaltung.
// Maßstab Meter, Ursprung = Fußpunkt, Blick nach +X; state darf ein String sein ('snap' ≙ { anim: 'snap' }).
//
// schnappblume        ≈1,25 m (Topf) – fleischfressende Blume: violetter Kopf mit gelben Punkten, rosa Lippen,
//   Zähnchen, grimmige Äuglein oben, Kragen aus orangen Blütenblättern, grüner Stängel mit zwei Blättern.
//   opts  { base: 'pot'|'ground'|'pipe' (Standard 'pot'; 'pipe' = ohne Sockel, steht auf der Röhrenöffnung) }
//   state { anim: 'idle'|'snap'|'retreat'|'hit', progress? (0..1 im snap-Zyklus, sonst Zeit seit Wechsel) }
//         snap: Zyklus 0,8 s (ausholen, zuschnappen, zurück), wiederholt sich solange snap;
//         retreat: sinkt in 0,35 s in Topf/Röhre/Boden und bleibt verborgen; hit: zuckt zurück.
// riesenschnappblume  ≈2,9 m  dieselbe Blume ×2,8 auf einem Blätterhügel, dunkleres Violett, orange Punkte.
//   opts  { base: 'ground'|'pot'|'pipe' }  state wie schnappblume (hit = Treffer, Kopf blinkt hell).
// rammbock_bulle      ≈1,6 m  stämmiger Bulle: blauer Helm mit gelbem Streifen, rote Schulterpolster,
//   goldener Nasenring.
//   state { anim: 'idle'|'walk'|'charge'|'stunned'|'hit'|'defeated', speed (m/s; charge Standard 7, walk 2), hp (3..0, Standard 3) }
//         idle: scharrt, schnaubt Dampf; charge: vorgebeugter Sturmlauf; hit: 0,4 s Zucken + Aufleuchten;
//         hp 2 → linkes Polster weg, hp ≤ 1 → auch Helm und rechtes Polster weg; defeated: kippt nach hinten um.
// stampfstein         2,0 m hoch, 1,8 × 1,8 m – Steinquader mit Gesicht, Moosdecke, Risse, Noppen.
//   state { anim: 'wait'|'fall'|'angry'|'rise' }
//         wait: schielt nach unten, zittert leicht; fall: Augen und Mund weit auf; angry: rot glühend,
//         bebt, Brauen tief; rise: ruhig, Augen halb zu.
// wuehler             ≈0,7 m  Maulwurf mit Taucherbrille (orange Rahmen, türkise Gläser), rosa Nase, Grabkrallen.
//   opts  { ground: 'water'|'earth' (Standard 'water': Schaumring; 'earth': Erdhügel) }
//   state { anim: 'hide'|'pop'|'idle' }  hide: nur Brille über der Oberfläche; pop: springt heraus.

import {
  THREE, TAU, Build, cached, vcol, basic, mesh, joint, eyes, dizzyStars, makeModel, Clock, Blinker, damp, clamp,
  wave, mix, onEllipsoid, decals, smoothstep,
} from '../lib/kit.js';

// =============================================================================================
// Schnappblume
// =============================================================================================

const FL = {
  head: 0x8a3ad8, under: 0xc69af2, spot: 0xffe14a, lip: 0xffc4de, palate: 0xa0123a, tongue: 0xff5a7a, tooth: 0xffffff,
  petal: 0xff8a1f, petalTip: 0xffd23a, stem: 0x3fae3a, stemDark: 0x2c8a2c, leaf: 0x5fcf3a, vein: 0x3a9a2a,
  pot: 0xd2693a, potRim: 0xe8854a, soil: 0x5a3a22, mound: 0x7a5232, grass: 0x4fbf3a,
};
const FL_GIANT = { ...FL, head: 0x6a22b8, under: 0xb07ae8, spot: 0xff9a1f, petal: 0xff5a2a, petalTip: 0xffc21a };
const HR = [0.3, 0.27, 0.3], HC = [0.28, 0, 0];

function jawGeo(upper, P, key) {
  return cached(`flower:jaw:${upper}:${key}`, () => {
    const b = new Build();
    const ry = upper ? HR[1] : HR[1] * 0.75;
    b.add(new THREE.SphereGeometry(1, 26, 10, 0, TAU, upper ? 0 : Math.PI / 2, Math.PI / 2),
      upper ? P.head : { v: (x, y, z, nx) => mix(P.under, P.head, smoothstep(-nx * 0.8 + 0.3)) }, { p: HC, s: [HR[0], ry, HR[2]] });
    // Gaumen/Mundboden, Lippe, Zähne
    const disc = new THREE.CircleGeometry(1, 24);
    b.add(disc, upper ? P.palate : P.tongue, { p: [HC[0], upper ? -0.002 : 0.002, 0], r: [upper ? Math.PI / 2 : -Math.PI / 2, 0, 0], s: [HR[0] * 0.97, HR[2] * 0.97, 1] });
    b.torus(1, 0.11, P.lip, { p: [HC[0], 0, 0], r: [Math.PI / 2, 0, 0], s: [HR[0], HR[2], 0.3] }, 8, 32);
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = -1.25 + (i / (n - 1)) * 2.5 + (upper ? 0 : 0.18);
      if (!upper && i === n - 1) continue;
      b.cone(0.032, 0.085, P.tooth, { p: [HC[0] + Math.cos(a) * HR[0] * 0.86, upper ? -0.04 : 0.04, Math.sin(a) * HR[2] * 0.86], r: [0, 0, upper ? Math.PI : 0] }, 6);
    }
    if (upper) {
      const hits = [[0.15, 0.95, 0.07], [0.7, 0.35, 0.065], [-0.7, 0.35, 0.065], [1.7, 0.4, 0.07], [-1.7, 0.4, 0.07], [2.7, 0.55, 0.075], [-2.7, 0.55, 0.075], [Math.PI, 0.15, 0.06]]
        .map(([az, el, r]) => ({ ...onEllipsoid(HC, HR, az, el), r }));
      decals(b, hits, 0.07, P.spot, 0.25);
      for (const s of [1, -1]) b.capsule(0.022, 0.08, 0x2a1236, { p: [0.33, 0.235, s * 0.1], r: [Math.PI / 2 - s * 0.5, -s * 0.5, 0], order: 'YXZ' }, 3, 6);
    } else {
      b.sphere(1, P.tongue, { p: [HC[0] - 0.02, 0.01, 0], s: [0.18, 0.04, 0.12] }, 12, 8);
    }
    return b.geometry();
  });
}
function petalsGeo(P, key) {
  return cached(`flower:petals:${key}`, () => {
    const b = new Build();
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + 0.2;
      const grad = { v: (x, y) => mix(P.petal, P.petalTip, smoothstep((y + 0.05) / 0.2)) };
      const g = new THREE.SphereGeometry(1, 12, 8);
      g.scale(0.09, 0.15, 0.03); g.translate(0, 0.14, 0);
      // Blatt zeigt radial nach außen (Ebene YZ), leicht nach hinten geneigt
      b.add(g, grad, { p: [0.06, 0, 0], r: [a, 0, 0.35], order: 'XZY' });
    }
    return b.geometry();
  });
}
function flowerStemGeo(len, r0, r1, key) {
  return cached(`flower:stem:${key}`, () => {
    const b = new Build();
    b.cyl(r1, r0, len, { v: (x, y, z, nx) => mix(FL.stemDark, FL.stem, smoothstep(nx + 0.5)) }, { p: [0, len / 2, 0] }, 10);
    b.sphere(r1 * 1.05, FL.stem, { p: [0, len, 0] }, 10, 8);
    return b.geometry();
  });
}
function flowerBaseGeo(base, P, key) {
  return cached(`flower:base:${base}:${key}`, () => {
    const b = new Build();
    let top = 0;
    if (base === 'pot') {
      b.lathe([[0, 0], [0.24, 0], [0.27, 0.05], [0.3, 0.29], [0.34, 0.3], [0.355, 0.36], [0.34, 0.41], [0.3, 0.41], [0.29, 0.38], [0, 0.38]],
        (x, y, z, nx, ny) => (y > 0.37 && ny > 0.5 ? P.soil : y > 0.29 ? P.potRim : P.pot), null, 28, 0);
      top = 0.38;
    } else if (base === 'ground') {
      b.dome(1, P.mound, { s: [0.42, 0.13, 0.42] }, Math.PI / 2, 20, 6);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU;
        b.cone(0.03, 0.16, P.grass, { p: [Math.cos(a) * 0.36, 0.07, Math.sin(a) * 0.36], r: [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4] }, 5);
      }
      top = 0.1;
    }
    // zwei große Blätter
    for (const s of [1, -1]) {
      const g = new THREE.SphereGeometry(1, 14, 8);
      g.scale(0.11, 0.025, 0.24); g.translate(0, 0, 0.22);
      b.add(g, { v: (x, y, z) => (Math.abs(x) < 0.012 ? FL.vein : FL.leaf) }, { p: [0.02, top + 0.02, s * 0.03], r: [s * -0.35, s > 0 ? 0.3 : Math.PI - 0.3, 0], order: 'YXZ' });
    }
    return b.geometry();
  });
}
const FLOWER_TOP = { pot: 0.38, ground: 0.1, pipe: 0 };

function makeFlower(name, P, key, scale, defBase) {
  return (opts = {}) => {
    const base = ['pot', 'ground', 'pipe'].includes(opts.base) ? opts.base : defBase;
    const top = FLOWER_TOP[base];
    const root = new THREE.Group();
    const all = joint(); all.scale.setScalar(scale);
    const baseM = mesh(flowerBaseGeo(base, P, key), vcol(0.5), {}, true);
    const plant = joint([0, top, 0]);
    const stem1 = joint([0, 0, 0], mesh(flowerStemGeo(0.26, 0.065, 0.058, 's1'), vcol(0.5), {}, true));
    const stem2 = joint([0, 0.25, 0], mesh(flowerStemGeo(0.23, 0.058, 0.05, 's2'), vcol(0.5), {}, true));
    const head = joint([-0.2, 0.25, 0]);
    // Kopfteile: Ober-/Unterkiefer drehen um das Scharnier hinten (Ursprung der Kopfgruppe)
    const flash = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, emissive: 0x000000 });
    const upper = joint([0, 0, 0], mesh(jawGeo(true, P, key), flash, {}, true));
    const lower = joint([0, 0, 0], mesh(jawGeo(false, P, key), flash, {}, true));
    const eye = eyes([{ p: [0.37, 0.19, 0.1], r: 0.055, sy: 1.1, dir: [0.55, 0.8, 0.35] }, { p: [0.37, 0.19, -0.1], r: 0.055, sy: 1.1, dir: [0.55, 0.8, -0.35] }],
      { key: `flower:${key}`, iris: 0xffd21f, pupil: 0.5, depth: 0.5 });
    upper.add(eye);
    const petals = mesh(petalsGeo(P, key), vcol(0.45), {}, true);
    head.add(upper, lower, petals);
    stem2.add(head); stem1.add(stem2); plant.add(stem1);
    all.add(baseM, plant);
    root.add(all);

    const clk = new Clock(), blink = new Blinker();
    let sink = 0, open = 0.2;
    const update = (dt, st) => {
      const anim = st.anim ?? 'idle';
      clk.tick(dt, anim);
      const t = clk.t, age = clk.age;
      let b1 = Math.sin(t * 1.3) * 0.08, b2 = Math.sin(t * 1.3 + 0.7) * 0.1, hx = 0, jaw = 0.18 + (Math.sin(t * 2.1) + 1) * 0.07, tilt = -0.15;
      if (anim === 'snap') {
        const p = st.progress ?? (age % 0.8) / 0.8;
        if (p < 0.4) { const k = smoothstep(p / 0.4); b1 = 0.25 * k; b2 = 0.3 * k; jaw = 0.25 + 0.6 * k; tilt = -0.15 + 0.3 * k; }
        else if (p < 0.55) { const k = smoothstep((p - 0.4) / 0.15); b1 = 0.25 - 0.75 * k; b2 = 0.3 - 0.8 * k; jaw = k < 0.6 ? 0.85 : 0.85 * (1 - (k - 0.6) / 0.4); tilt = 0.15 - 0.5 * k; hx = 0.12 * k; }
        else { const k = smoothstep((p - 0.55) / 0.45); b1 = -0.5 * (1 - k); b2 = -0.5 * (1 - k); jaw = 0.02 + k * 0.15; tilt = -0.35 * (1 - k) - 0.15 * k; hx = 0.12 * (1 - k); }
      } else if (anim === 'hit') {
        const k = Math.max(0, 1 - age / 0.5);
        b1 = 0.3 * k + Math.sin(t * 30) * 0.05 * k; b2 = 0.35 * k; jaw = 0.5 * k + 0.1; tilt = 0.3 * k - 0.15;
      }
      stem1.rotation.z = damp(stem1.rotation.z, b1, 20, dt);
      stem2.rotation.z = damp(stem2.rotation.z, b2, 20, dt);
      stem1.rotation.x = Math.sin(t * 0.9) * 0.05;
      head.rotation.z = damp(head.rotation.z, tilt, 20, dt);
      head.position.x = -0.2 + hx;
      open = damp(open, jaw, anim === 'snap' ? 40 : 12, dt);
      upper.rotation.z = open * 0.75;
      lower.rotation.z = -open * 0.4;
      // Zurückziehen
      sink = damp(sink, anim === 'retreat' ? 1 : 0, anim === 'retreat' ? 9 : 6, dt);
      plant.position.y = top - sink * 1.15;
      plant.scale.set(1 - sink * 0.5, Math.max(0.001, 1 - sink * 0.6), 1 - sink * 0.5);
      plant.visible = sink < 0.97;
      // Treffer: kurz aufleuchten
      const hitK = anim === 'hit' ? Math.max(0, 1 - age / 0.4) * (Math.sin(age * 40) > 0 ? 1 : 0.3) : 0;
      flash.emissive.setRGB(hitK * 0.9, hitK * 0.9, hitK * 0.9);
      eye.userData.blink(anim === 'hit' ? 0.2 : blink.update(dt));
    };
    return makeModel(name, root, update, [flash]);
  };
}

// =============================================================================================
// Rammbock-Bulle
// =============================================================================================

const BU = {
  fur: 0xb3572a, furDark: 0x8a3e1c, belly: 0xf0c08a, muzzle: 0xffc9b0, nostril: 0x5a2a20, horn: 0xfff2d6, hoof: 0x3a2a24,
  helmet: 0x2f6ee0, stripe: 0xffd21f, pad: 0xe8322a, padTrim: 0xffd21f, ring: 0xffc21a, ink: 0x2a1610,
};
function bullBodyGeo() {
  return cached('bull:body', () => {
    const b = new Build();
    b.sphere(1, { v: (x, y, z, nx, ny) => mix(BU.fur, BU.belly, smoothstep((nx - 0.3) / 0.4) * smoothstep((-ny + 0.4) / 0.6)) }, { p: [0, 0.8, 0], s: [0.4, 0.45, 0.46] }, 26, 18);
    // Kopf (vorgestreckt), breite Schnauze, Nasenlöcher, Nasenring
    b.sphere(1, BU.fur, { p: [0.36, 1.2, 0], s: [0.3, 0.27, 0.31] }, 22, 16);
    b.sphere(1, BU.muzzle, { p: [0.62, 1.1, 0], s: [0.16, 0.15, 0.24] }, 20, 14);
    for (const s of [1, -1]) b.sphere(0.04, BU.nostril, { p: [0.775, 1.13, s * 0.085], s: [0.5, 1, 1] }, 8, 6);
    b.torus(0.065, 0.018, BU.ring, { p: [0.785, 1.035, 0], r: [0, Math.PI / 2, 0] }, 6, 16);
    for (const s of [1, -1]) {
      // Hörner (zwei Kegelstücke, nach außen und oben gebogen), Ohren
      b.cone(0.08, 0.22, BU.horn, { p: [0.36, 1.33, s * 0.36], r: [s * 1.3, 0, 0] }, 10);
      b.cone(0.055, 0.2, BU.horn, { p: [0.38, 1.46, s * 0.49], r: [s * 0.3, 0, 0.15] }, 10);
      b.sphere(1, BU.furDark, { p: [0.24, 1.24, s * 0.33], s: [0.06, 0.055, 0.13], r: [s * 0.5, 0, 0] }, 10, 8);
      // grimmige Brauen
      b.capsule(0.032, 0.13, BU.ink, { p: [0.62, 1.345, s * 0.125], r: [Math.PI / 2 - s * 0.55, -s * 0.55, 0], order: 'YXZ' }, 3, 6);
    }
    // Schwanz mit Quaste
    b.tube([[-0.36, 0.7, 0], [-0.5, 0.56, 0], [-0.53, 0.4, 0.04]], 0.025, BU.fur, null, 10, 6);
    b.sphere(0.06, BU.furDark, { p: [-0.53, 0.36, 0.04], s: [0.8, 1.3, 0.8] }, 10, 8);
    return b.geometry();
  });
}
function bullHelmetGeo() {
  return cached('bull:helmet', () => {
    const b = new Build();
    b.dome(1, (x, y, z) => (Math.abs(z) < 0.17 ? BU.stripe : BU.helmet), { p: [0.33, 1.29, 0], s: [0.34, 0.28, 0.35], r: [0, 0, 0.22] }, Math.PI / 2, 28, 10);
    b.torus(1, 0.1, BU.helmet, { p: [0.34, 1.29, 0], r: [Math.PI / 2, 0, -0.22], s: [0.34, 0.35, 0.25] }, 8, 28);
    b.box(0.12, 0.035, 0.4, BU.helmet, { p: [0.64, 1.44, 0], r: [0, 0, -0.15] }, 0.015, 1);
    return b.geometry();
  });
}
function bullArmGeo(pad) {
  return cached(`bull:arm:${pad}`, () => {
    const b = new Build();
    b.capsule(0.12, 0.3, BU.fur, { p: [0.02, -0.2, 0] }, 4, 12);
    b.sphere(0.145, BU.hoof, { p: [0.05, -0.44, 0], s: [1.05, 0.95, 1] }, 14, 10);
    if (pad) {
      b.dome(1, BU.pad, { p: [0, 0.0, 0], s: [0.3, 0.22, 0.25], r: [0, 0, 0.1] }, Math.PI / 2, 20, 8);
      b.torus(1, 0.1, BU.padTrim, { p: [0, 0.0, 0], r: [Math.PI / 2, 0, -0.1], s: [0.3, 0.25, 0.3] }, 6, 24);
    }
    return b.geometry();
  });
}
function bullLegGeo() {
  return cached('bull:leg', () => {
    const b = new Build();
    b.capsule(0.13, 0.14, BU.fur, { p: [0, -0.12, 0] }, 4, 12);
    b.cyl(0.13, 0.15, 0.13, BU.hoof, { p: [0.03, -0.3, 0] }, 14);
    b.box(0.06, 0.135, 0.02, 0x1a120e, { p: [0.17, -0.3, 0] }, 0, 1);
    return b.geometry();
  });
}
const steamGeo = () => cached('bull:steam', () => {
  const b = new Build();
  for (const s of [1, -1]) for (let i = 0; i < 3; i++) b.sphere(0.04 + i * 0.022, 0xffffff, { p: [0.1 + i * 0.09, -i * 0.03, s * (0.05 + i * 0.05)] }, 10, 8);
  return b.geometry();
});

function buildBulle() {
  const root = new THREE.Group();
  const pose = joint();
  const body = joint([0, 0.35, 0]);   // Drehpunkt Hüfte (für Vorbeugen/Umkippen)
  const flash = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, emissive: 0x000000 });
  const torso = mesh(bullBodyGeo(), flash, { p: [0, -0.35, 0] }, true);
  const helmet = mesh(bullHelmetGeo(), vcol(0.25), { p: [0, -0.35, 0] }, true);
  const eye = eyes([{ p: [0.6, 1.265, 0.13], r: 0.065, sy: 1.05, dir: [1, 0.1, 0.5] }, { p: [0.6, 1.265, -0.13], r: 0.065, sy: 1.05, dir: [1, 0.1, -0.5] }],
    { key: 'bull', iris: 0xd0261a, pupil: 0.5, depth: 0.5 });
  eye.position.y -= 0.35;
  const steam = mesh(steamGeo(), basic('steam', { color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false }), { p: [0.8, 0.78, 0] });
  const arms = [1, -1].map((s) => joint([0.04, 0.7, s * 0.47], mesh(bullArmGeo(true), flash, {}, true)));
  body.add(torso, helmet, eye, steam, ...arms);
  const legs = [1, -1].map((s) => joint([0, 0.43, s * 0.22], mesh(bullLegGeo(), flash, {}, true)));
  const dizzy = dizzyStars(0.36, 0.09); dizzy.position.set(0.15, 1.25, 0);
  body.add(dizzy);
  pose.add(body, ...legs);
  root.add(pose);

  const clk = new Clock(), blink = new Blinker();
  let phase = 0, lean = 0, fall = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    const hp = clamp(Math.round(st.hp ?? 3), 0, 3);
    const charging = anim === 'charge';
    const speed = charging ? (st.speed ?? 7) : anim === 'walk' ? (st.speed ?? 2) : 0;
    if (speed > 0) phase += dt * (5 + speed * 1.6);
    const sw = speed > 0 ? Math.sin(phase) : 0;
    // Ausrüstung nach Treffern
    arms[1].children[0].geometry = bullArmGeo(hp >= 3);
    arms[0].children[0].geometry = bullArmGeo(hp >= 2);
    helmet.visible = hp >= 2;
    // Haltung
    lean = damp(lean, charging ? -0.5 : anim === 'stunned' ? 0.1 : 0, 8, dt);
    fall = damp(fall, anim === 'defeated' ? 1 : 0, 5, dt);
    body.rotation.z = lean + fall * 1.35 + (anim === 'hit' ? Math.max(0, 0.35 - age) * 1.2 : 0);
    body.rotation.x = anim === 'stunned' ? Math.sin(t * 4.5) * 0.12 : speed > 0 ? sw * 0.06 : 0;
    pose.position.y = (speed > 0 ? Math.abs(sw) * (charging ? 0.07 : 0.03) : 0) - fall * 0.15;
    pose.position.x = -fall * 0.25;
    const breath = anim === 'idle' ? wave(t, 0.7) * 0.025 : 0;
    torso.scale.set(1, 1 + breath, 1 + breath * 0.5);
    // Arme: pumpen beim Sturm, hängen sonst; im Stand scharrt ein Bein
    arms.forEach((a, i) => {
      const s = i ? -1 : 1;
      a.rotation.z = charging ? Math.sin(phase + i * Math.PI) * 0.9 - 0.3 : anim === 'defeated' ? 1.2 : anim === 'stunned' ? Math.sin(t * 6 + i) * 0.4 : -0.05 + breath;
      a.rotation.x = -s * (anim === 'defeated' ? 0.8 : 0.12);
    });
    legs.forEach((l, i) => {
      const ph = phase + i * Math.PI;
      let rz = speed > 0 ? Math.sin(ph) * (charging ? 0.9 : 0.5) : 0, y = 0.43;
      if (anim === 'idle' && i === 0) { const p = (t * 1.4) % 2; if (p < 1) { rz = -Math.sin(p * Math.PI) * 0.5; y += Math.sin(p * Math.PI) * 0.06; } }
      if (anim === 'defeated') rz = -0.9 * fall;
      l.rotation.z = damp(l.rotation.z, rz, 25, dt);
      l.position.y = y + (speed > 0 ? Math.max(0, -Math.cos(ph)) * 0.08 : 0);
    });
    // Dampf aus den Nüstern (im Stand pulsweise, beim Sturm dauernd)
    const puff = charging ? 0.8 + Math.sin(t * 20) * 0.2 : anim === 'idle' ? Math.max(0, Math.sin(t * 2.2)) ** 3 : 0;
    steam.visible = puff > 0.05;
    steam.scale.setScalar(Math.max(0.001, puff));
    steam.position.x = 0.8 + puff * 0.06;
    // Treffer: Aufleuchten
    const hitK = anim === 'hit' ? Math.max(0, 1 - age / 0.4) * (Math.sin(age * 45) > 0 ? 1 : 0.2) : 0;
    flash.emissive.setRGB(hitK, hitK * 0.8, hitK * 0.8);
    let bk = blink.update(dt);
    if (anim === 'hit' || anim === 'defeated') bk = 0.1; else if (anim === 'stunned') bk = 0.45;
    eye.userData.blink(bk);
    dizzy.visible = anim === 'stunned';
    dizzy.rotation.y = t * 4;
  };
  return makeModel('rammbock_bulle', root, update, [flash]);
}

// =============================================================================================
// Stampfstein
// =============================================================================================

const ST = { stone: 0x8a93b8, stoneDark: 0x5f678a, stoneLight: 0xb4bcdc, moss: 0x5cbf3a, mossDark: 0x3f9a2a, crack: 0x454b66, flower: 0xff6fa8, mouth: 0x2a1e2e, tooth: 0xfffaf0, brow: 0x5a5f7a };
function stoneGeo() {
  return cached('stone:block', () => {
    const b = new Build();
    b.box(1.8, 1.92, 1.8, { v: (x, y) => mix(ST.stoneDark, ST.stone, smoothstep((y + 0.96) / 1.2)) }, { p: [0, 0.96, 0] }, 0.24, 2);
    // Moosdecke mit Tropfen über die Kante
    b.box(1.86, 0.16, 1.86, ST.moss, { p: [0, 1.93, 0] }, 0.08, 2);
    const drips = [[0.93, 0.5], [0.93, -0.35], [-0.93, 0.2], [0.3, 0.93], [-0.5, 0.93], [0.6, -0.93], [-0.2, -0.93], [-0.93, -0.6]];
    for (const [x, z] of drips) b.sphere(0.11, ST.moss, { p: [x, 1.84, z], s: [1, 1.5, 1] }, 10, 8);
    b.sphere(0.07, ST.flower, { p: [-0.4, 2.04, 0.45] }, 10, 8);
    b.sphere(0.04, 0xfff2a0, { p: [-0.4, 2.1, 0.45] }, 8, 6);
    // Noppen an den Seiten, Risse
    for (const s of [1, -1]) for (const [y, x] of [[0.5, -0.45], [0.5, 0.45], [1.3, 0]]) b.sphere(0.14, ST.stoneLight, { p: [x, y, s * 0.9], s: [1, 1, 0.5] }, 12, 8);
    b.box(0.03, 0.4, 0.06, ST.crack, { p: [0.905, 0.5, 0.62], r: [0.4, 0, 0] }, 0, 1);
    b.box(0.03, 0.25, 0.06, ST.crack, { p: [0.905, 0.25, 0.7], r: [-0.5, 0, 0] }, 0, 1);
    b.box(0.06, 0.35, 0.03, ST.crack, { p: [-0.4, 1.2, 0.905], r: [0, 0, 0.5] }, 0, 1);
    return b.geometry();
  });
}
function stoneTeethGeo() {
  return cached('stone:teeth', () => {
    const b = new Build();
    // Mundhöhle mit zwei Zahnreihen, Ursprung = Mundmitte (Öffnen über scale.y)
    b.box(0.1, 0.34, 0.84, ST.mouth, { p: [0.87, 0, 0] }, 0.06, 1);
    for (let i = 0; i < 5; i++) {
      const z = -0.32 + i * 0.16;
      b.box(0.06, 0.11, 0.13, ST.tooth, { p: [0.915, 0.105, z] }, 0.025, 1);
      if (i < 4) b.box(0.06, 0.09, 0.13, ST.tooth, { p: [0.915, -0.11, z + 0.08] }, 0.025, 1);
    }
    return b.geometry();
  });
}
function stoneBrowGeo() {
  return cached('stone:brows', () => {
    const b = new Build();
    for (const s of [1, -1]) b.box(0.16, 0.12, 0.5, ST.brow, { p: [0.93, 1.5, s * 0.36], r: [s * 0.35, 0, 0] }, 0.04, 1);
    return b.geometry();
  });
}

function buildStampfstein() {
  const root = new THREE.Group();
  const shake = joint();
  const glow = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, emissive: 0x000000 });
  const block = mesh(stoneGeo(), glow, {}, true);
  block.receiveShadow = true;
  const teeth = mesh(stoneTeethGeo(), vcol(0.4), { p: [0, 0.55, 0] });
  const brows = joint([0, 0, 0], mesh(stoneBrowGeo(), glow));
  const eye = eyes([{ p: [0.87, 1.22, 0.36], r: 0.2, sy: 1.15 }, { p: [0.87, 1.22, -0.36], r: 0.2, sy: 1.15 }], { key: 'stone', iris: 0xffc21a, pupil: 0.5, depth: 0.45 });
  shake.add(block, teeth, brows, eye);
  root.add(shake);
  const clk = new Clock(), blink = new Blinker();
  let open = 0, look = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'wait';
    clk.tick(dt, anim);
    const t = clk.t;
    const angry = anim === 'angry', falling = anim === 'fall';
    const amp = angry ? 0.03 : anim === 'wait' ? 0.006 : 0;
    shake.position.set(Math.sin(t * 47) * amp, Math.abs(Math.sin(t * 31)) * amp * 0.5, Math.cos(t * 41) * amp);
    open = damp(open, falling ? 1 : angry ? 0.5 : 0, 14, dt);
    teeth.scale.set(1, 1 + open * 0.9, 1 + open * 0.08);
    teeth.position.y = 0.55 - open * 0.08;
    brows.position.y = falling ? 0.1 : angry ? -0.1 : 0;
    brows.rotation.x = 0;
    look = damp(look, anim === 'wait' ? Math.sin(t * 0.8) * 0.12 : 0, 3, dt);
    eye.rotation.y = look;
    eye.position.y = 1.22 + (anim === 'wait' ? -0.04 : 0);
    eye.scale.setScalar(damp(eye.scale.x, falling ? 1.18 : 1, 12, dt));
    let bk = blink.update(dt, anim !== 'fall');
    if (anim === 'rise') bk = 0.45; else if (angry) bk = 0.7;
    eye.userData.blink(bk);
    const heat = angry ? 0.35 + Math.sin(t * 9) * 0.15 : 0;
    glow.emissive.setRGB(heat, heat * 0.12, heat * 0.05);
  };
  return makeModel('stampfstein', root, update, [glow], { initial: 'wait' });
}

// =============================================================================================
// Wühler
// =============================================================================================

const WU = { fur: 0x4a5ab0, furDark: 0x36428a, belly: 0xa9b6ee, nose: 0xff7aa8, muzzle: 0xffe3d0, frame: 0xff8a1a, strap: 0x2a2f4a, claw: 0xfff0dc, tooth: 0xffffff, dirt: 0x8a5a32, dirtDark: 0x6a4224 };
function moleGeo() {
  return cached('mole:body', () => {
    const b = new Build();
    b.sphere(1, { v: (x, y, z, nx) => mix(WU.fur, WU.belly, smoothstep((nx - 0.35) / 0.4)) }, { p: [0, 0.34, 0], s: [0.3, 0.34, 0.3] }, 22, 16);
    b.sphere(1, WU.muzzle, { p: [0.25, 0.36, 0], s: [0.1, 0.09, 0.13] }, 14, 10);
    b.sphere(0.065, WU.nose, { p: [0.345, 0.39, 0] }, 12, 10);
    b.box(0.03, 0.06, 0.04, WU.tooth, { p: [0.32, 0.3, 0.025] }, 0.01, 1);
    b.box(0.03, 0.06, 0.04, WU.tooth, { p: [0.32, 0.3, -0.025] }, 0.01, 1);
    // Taucherbrille: Riemen ums Kopfende, zwei orange Rahmen
    b.torus(0.262, 0.02, WU.strap, { p: [-0.01, 0.52, 0], r: [Math.PI / 2, 0, 0.3], s: [1, 1.02, 1] }, 6, 32);
    for (let i = -1; i <= 1; i++) b.cone(0.03, 0.12, WU.furDark, { p: [-0.02 + i * 0.03, 0.68, i * 0.05], r: [i * 0.4, 0, -0.2 + i * 0.1] }, 6);
    for (const s of [1, -1]) b.torus(0.09, 0.032, WU.frame, { p: [0.235, 0.53, s * 0.1], r: [0, Math.PI / 2 - s * 0.38, 0] }, 8, 20);
    b.box(0.04, 0.035, 0.06, WU.frame, { p: [0.27, 0.54, 0] }, 0.012, 1);
    // Schnurrhaare
    for (const s of [1, -1]) for (const a of [-0.25, 0.1]) b.cyl(0.006, 0.006, 0.16, 0x1a1a2a, { p: [0.29, 0.36 + a * 0.15, s * 0.12], r: [s * (Math.PI / 2 - 0.3), 0, a] }, 4);
    return b.geometry();
  });
}
function clawGeo() {
  return cached('mole:claw', () => {
    const b = new Build();
    b.capsule(0.06, 0.07, WU.fur, { p: [0, -0.05, 0] }, 3, 8);
    b.sphere(1, WU.furDark, { p: [0.03, -0.14, 0], s: [0.09, 0.05, 0.1] }, 12, 8);
    for (const z of [-0.05, 0, 0.05]) b.cone(0.024, 0.11, WU.claw, { p: [0.13, -0.15, z], r: [0, z * 3, -Math.PI / 2 - 0.2] }, 6);
    return b.geometry();
  });
}
function moleGroundGeo(kind) {
  return cached(`mole:ground:${kind}`, () => {
    const b = new Build();
    if (kind === 'earth') {
      b.lathe([[0.22, 0.12], [0.33, 0.13], [0.45, 0.08], [0.55, 0.0], [0.2, 0.0]], { v: (x, y) => mix(WU.dirtDark, WU.dirt, y / 0.13) }, null, 24, 2);
      for (let i = 0; i < 6; i++) { const a = i * 1.1; b.sphere(0.05, WU.dirt, { p: [Math.cos(a) * 0.5, 0.03, Math.sin(a) * 0.5] }, 8, 6); }
    } else {
      b.torus(0.36, 0.06, 0xffffff, { p: [0, 0.01, 0], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.45] }, 6, 28);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; b.sphere(0.05, 0xe8fbff, { p: [Math.cos(a) * 0.44, 0.02, Math.sin(a) * 0.44] }, 8, 6); }
    }
    return b.geometry();
  });
}

function buildWuehler(opts = {}) {
  const kind = opts.ground === 'earth' ? 'earth' : 'water';
  const root = new THREE.Group();
  const ground = mesh(moleGroundGeo(kind), kind === 'water' ? basic('foam', { color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false }) : vcol(0.8));
  const bodyJ = joint();
  const flash = vcol(0.5);
  const torso = mesh(moleGeo(), flash, {}, true);
  const eye = eyes([{ p: [0.215, 0.53, 0.1], r: 0.07, sy: 1.0, dir: [1, 0.08, 0.38] }, { p: [0.215, 0.53, -0.1], r: 0.07, sy: 1.0, dir: [1, 0.08, -0.38] }],
    { key: 'mole', white: 0xc8f6ff, iris: 0x2a3a6a, pupil: 0.55, depth: 0.45 });
  const claws = [1, -1].map((s) => joint([0.18, 0.28, s * 0.2], mesh(clawGeo(), flash, {}, true)));
  bodyJ.add(torso, eye, ...claws);
  root.add(ground, bodyJ);
  const clk = new Clock(), blink = new Blinker();
  let y = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    let target = 0;
    if (anim === 'hide') target = -0.47 + Math.sin(t * 2) * 0.015;
    if (anim === 'pop') target = age < 0.35 ? Math.sin((age / 0.35) * Math.PI) * 0.35 : 0;
    y = anim === 'pop' && age < 0.35 ? target : damp(y, target, 10, dt);
    bodyJ.position.y = y;
    bodyJ.rotation.z = anim === 'pop' ? Math.sin(Math.min(1, age / 0.35) * Math.PI) * -0.15 : 0;
    bodyJ.rotation.y = anim === 'idle' ? Math.sin(t * 0.9) * 0.35 : 0;
    claws.forEach((c, i) => {
      const s = i ? -1 : 1;
      const up = anim === 'pop' ? 1 : 0;
      c.rotation.z = damp(c.rotation.z, up * 1.6 + (anim === 'idle' ? Math.sin(t * 6 + i * 2) * 0.25 : 0), 12, dt);
      c.rotation.x = -s * (0.2 + up * 0.4);
    });
    ground.scale.setScalar(1 + (kind === 'water' ? Math.sin(t * 3) * 0.05 + (anim === 'pop' && age < 0.5 ? (0.5 - age) * 1.2 : 0) : 0));
    ground.rotation.y = t * 0.3;
    eye.userData.blink(blink.update(dt));
  };
  return makeModel('wuehler', root, update);
}

export const MODELS = {
  schnappblume: makeFlower('schnappblume', FL, 'n', 1, 'pot'),
  riesenschnappblume: makeFlower('riesenschnappblume', FL_GIANT, 'g', 2.8, 'ground'),
  rammbock_bulle: buildBulle,
  stampfstein: buildStampfstein,
  wuehler: buildWuehler,
};
