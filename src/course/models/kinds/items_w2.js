// Power-ups und tragbare Gegenstände Welt 2 (Kurs-Modus). Eigene Gestaltung. Maßstab Meter, Ursprung = Fußpunkt
// (Unterkante), Blick/Vorderseite nach +X; state darf ein String sein ('fire' ≙ { anim: 'fire' }).
//
// powerup_spiegel  ≈0,85 m  Spiegelfrucht: zwei pralle magentafarbene Früchte an einem grünen Bogenstiel mit goldener
//                  Schleife und Blatt; jede Frucht trägt einen silbernen Spiegel-Funkel. Schwebt und dreht sich.
//                  state { anim: 'idle' }
// helm_kanone      0,55 m Kasten  Kanonen-Helm: roter Kasten mit Goldkanten und Stern, schwarzes Rohr nach +X.
//                  Ursprung = Mitte der Unterseite (sitzt so auf dem Kopf). state { anim: 'idle'|'fire', progress? }
//                  fire: Rückstoß, Mündungsblitz (0,35 s).  model.muzzle(out?) → Weltposition der Mündung.
// helm_propeller   0,5 m Kasten (+0,3 m Propeller)  Propeller-Helm: blau-weiß gestreifter Kasten, gelbe Rotorblätter.
//                  state { anim: 'idle'|'spin'|'fly', spin? (rad/s) }  idle: dreht langsam; spin: schnell;
//                  fly: sehr schnell mit Wirbelscheibe.
// helm_licht       0,5 m Kasten  Licht-Helm: goldgelber Kasten mit großer Laterne vorn (+X).
//                  state { on: true|false, anim?: 'flash' }  on: Linse leuchtet, Lichtkegel 2,6 m nach +X (Ø 1,6 m am
//                  Ende); flash: Kegel und Schein stärker.
// kanonenkugel     Ø 0,5 m  eiserne Kanonenkugel mit Goldband; Mitte bei y = 0,25.
//                  state { anim: 'idle'|'roll'|'fly', speed (m/s) }  roll: rollt nach +X; fly: Rauchschweif nach −X.
// topfpflanze      ≈0,9 m  tragbare Schnappblume im bemalten Tontopf (violetter Kopf mit gelben Punkten, weißes
//                  Zickzack am Topf). state { anim: 'idle'|'snap'|'carried', progress? }
//                  snap: beißt nach vorn (0,5 s, wiederholt); carried: lehnt sich nach vorn, Maul halb offen, zappelt.

import {
  THREE, TAU, Build, cached, vcol, std, basic, mesh, joint, eyes, makeModel, Clock, Blinker, damp, clamp, col, mix,
  onEllipsoid, decals, smoothstep, lerp, glowSprite, sparkleSprite, puffyStarGeo, sparkShape, metal,
} from '../lib/kit.js';

function floater(root, y0, rate = 1.6, amp = 0.06) {
  const spin = joint([0, y0, 0]);
  root.add(spin);
  return { spin, step(t) { spin.rotation.y = t * rate; spin.position.y = y0 + Math.sin(t * 2.4) * amp; } };
}
const twinkle = (sp, t, phase, size) => {
  const k = Math.pow(Math.max(0, Math.sin(t * 2.2 + phase)), 6);
  sp.scale.setScalar(Math.max(0.001, k * size));
  sp.visible = k > 0.03;
};

// =============================================================================================
// Spiegelfrucht
// =============================================================================================
const SF = { fruit: 0xd8309a, fruitHi: 0xff7ad0, fruitDark: 0x8a1060, stem: 0x3f9a3a, leaf: 0x5fcf3a, vein: 0x3a9a2a, bow: 0xffc21a, mirror: 0xf4f8ff };
function spiegelGeo() {
  return cached('w2:spiegel', () => {
    const b = new Build();
    const fruit = { v: (x, y, z, nx, ny) => mix(SF.fruitDark, mix(SF.fruit, SF.fruitHi, smoothstep(ny * 1.2 - 0.2)), smoothstep((ny + 0.9) / 0.9)) };
    const C = [[0, 0.24, 0.17], [0, 0.24, -0.17]];
    for (const c of C) {
      b.sphere(1, fruit, { p: c, s: [0.2, 0.22, 0.2] }, 22, 16);
      // Spiegel-Funkel: silberner Vierzack vorn
      b.extrude(sparkShape(0.08, 0.2), 0.02, SF.mirror, { p: [0.19, c[1] + 0.05, c[2] * 1.06], r: [0, Math.PI / 2 - Math.sign(c[2]) * 0.4, 0] }, 0.006, 5, 1);
    }
    // Bogenstiel (∩), goldene Schleife, Blatt
    b.tube([[0, 0.44, 0.15], [0, 0.6, 0.11], [0, 0.68, 0], [0, 0.6, -0.11], [0, 0.44, -0.15]], 0.022, SF.stem, null, 24, 6);
    b.sphere(1, SF.bow, { p: [0, 0.68, 0.06], s: [0.035, 0.05, 0.07], r: [0.5, 0, 0] }, 10, 8);
    b.sphere(1, SF.bow, { p: [0, 0.68, -0.06], s: [0.035, 0.05, 0.07], r: [-0.5, 0, 0] }, 10, 8);
    b.sphere(0.03, SF.bow, { p: [0, 0.68, 0] }, 8, 6);
    const g = new THREE.SphereGeometry(1, 14, 8); g.scale(0.075, 0.018, 0.16); g.translate(0, 0, 0.15);
    b.add(g, { v: (x) => (Math.abs(x) < 0.01 ? SF.vein : SF.leaf) }, { p: [0, 0.69, 0], r: [0.5, -1.2, 0.3], order: 'YXZ' });
    return b.geometry();
  });
}
function buildSpiegel() {
  const root = new THREE.Group();
  const f = floater(root, 0.06, 1.5, 0.05);
  f.spin.add(mesh(spiegelGeo(), vcol(0.15, {}, 'gloss'), { s: 1.15 }, true));
  const sp = [sparkleSprite(0xffffff, 0.3), sparkleSprite(0xffd0f0, 0.25)];
  sp[0].position.set(0.15, 0.62, 0.25); sp[1].position.set(0.1, 0.25, -0.32);
  root.add(...sp);
  const clk = new Clock();
  return makeModel('powerup_spiegel', root, (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    f.step(clk.t);
    twinkle(sp[0], clk.t, 0, 0.4); twinkle(sp[1], clk.t, 2.1, 0.32);
  });
}

// =============================================================================================
// Helme (tragbare Kästen)
// =============================================================================================
const HK = { red: 0xe0322a, redHi: 0xff5a4a, gold: 0xffc21a, barrel: 0x1e2230, barrelHi: 0x4a5470, star: 0xfff2c4 };
const boxShade = (base, hi, edge) => ({ v: (x, y, z, nx, ny, nz) => {
  const flat = Math.max(Math.abs(nx), Math.abs(ny), Math.abs(nz));
  return mix(ny > 0.9 ? hi : base, edge, (1 - flat) * 1.8);
} });
function helmBoxGeo(key, size, base, hi, edge, deco) {
  return cached(`w2:helm:${key}`, () => {
    const b = new Build();
    b.box(size, size, size, boxShade(base, hi, edge), { p: [0, size / 2, 0] }, 0.07, 2);
    // Goldkanten
    const e = size / 2;
    for (const y of [0.025, size - 0.025]) {
      for (const s of [1, -1]) {
        b.box(size + 0.02, 0.05, 0.05, HK.gold, { p: [0, y, s * e] }, 0.02, 1);
        b.box(0.05, 0.05, size + 0.02, HK.gold, { p: [s * e, y, 0] }, 0.02, 1);
      }
    }
    for (const sx of [1, -1]) for (const sz of [1, -1]) b.box(0.05, size, 0.05, HK.gold, { p: [sx * e, size / 2, sz * e] }, 0.02, 1);
    deco(b, size);
    return b.geometry();
  });
}
function buildHelmKanone() {
  const S = 0.55;
  const root = new THREE.Group();
  const box = mesh(helmBoxGeo('kanone', S, HK.red, HK.redHi, 0x8a1a14, (b, s) => {
    for (const z of [1, -1]) b.add(puffyStarGeo(0.12, 0.055, 0.03, 0.01), HK.star, { p: [0, s / 2, z * (s / 2 + 0.01)], r: [0, z > 0 ? 0 : Math.PI, 0] });
  }), vcol(0.35), {}, true);
  const recoil = joint([S / 2, S / 2, 0]);
  recoil.add(mesh(cached('w2:helm:barrel', () => {
    const b = new Build();
    b.cyl(0.13, 0.15, 0.32, { v: (x, y, z, nx, ny) => mix(HK.barrel, HK.barrelHi, smoothstep(ny * 0.7 + 0.3)) }, { p: [0.14, 0, 0], r: [0, 0, -Math.PI / 2] }, 18);
    b.torus(0.14, 0.04, HK.gold, { p: [0.3, 0, 0], r: [0, Math.PI / 2, 0] }, 6, 20);
    b.cyl(0.1, 0.1, 0.02, 0x060608, { p: [0.315, 0, 0], r: [0, 0, -Math.PI / 2] }, 16);
    return b.geometry();
  }), vcol(0.3), {}, true));
  const mz = new THREE.Object3D(); mz.position.set(0.36, 0, 0);
  const fl = glowSprite(0xffd060, 0.9, 0.95); mz.add(fl);
  recoil.add(mz);
  root.add(box, recoil);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const p = anim === 'fire' ? (st.progress ?? clamp(clk.age / 0.35, 0, 1)) : 1;
    recoil.position.x = S / 2 - Math.sin(clamp(p * 2, 0, 1) * Math.PI) * 0.1;
    fl.visible = anim === 'fire' && p < 0.35;
    fl.scale.setScalar(0.9 * (1 - p / 0.35) + 0.2);
  };
  const model = makeModel('helm_kanone', root, update, [], { initial: 'idle' });
  model.muzzle = (out = new THREE.Vector3()) => { root.updateMatrixWorld(true); return mz.getWorldPosition(out); };
  return model;
}

const HP = { blue: 0x2f7ae8, blueHi: 0x5aa0ff, white: 0xf4f8ff, blade: 0xffc21a, bladeTip: 0xff8a1a, hub: 0xe8322a };
function buildHelmPropeller() {
  const S = 0.5;
  const root = new THREE.Group();
  const box = mesh(helmBoxGeo('propeller', S, HP.blue, HP.blueHi, 0x1a4aa0, (b, s) => {
    for (const y of [s * 0.38, s * 0.62]) b.box(s + 0.012, 0.06, s + 0.012, HP.white, { p: [0, y, 0] }, 0, 1);
    b.cyl(0.04, 0.06, 0.12, HP.white, { p: [0, s + 0.06, 0] }, 12);
  }), vcol(0.35), {}, true);
  const rotor = joint([0, S + 0.13, 0]);
  rotor.add(mesh(cached('w2:helm:rotor', () => {
    const b = new Build();
    b.sphere(0.06, HP.hub, { s: [1, 0.8, 1] }, 12, 8);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU;
      const g = new THREE.SphereGeometry(1, 14, 6); g.scale(0.26, 0.018, 0.07); g.translate(0.27, 0, 0);
      b.add(g, { v: (x) => mix(HP.blade, HP.bladeTip, smoothstep((x - 0.3) / 0.25)) }, { r: [0.25, a, 0], order: 'YXZ' });
    }
    return b.geometry();
  }), vcol(0.3), {}, true));
  const blur = mesh(cached('w2:helm:blur', () => new THREE.CircleGeometry(0.55, 28).rotateX(-Math.PI / 2)),
    basic('w2:blur', { color: 0xfff2b0, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }), { p: [0, S + 0.13, 0] });
  root.add(box, rotor, blur);
  const clk = new Clock();
  let w = 2;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const target = st.spin ?? (anim === 'fly' ? 40 : anim === 'spin' ? 20 : 2);
    w = damp(w, target, 4, dt);
    rotor.rotation.y += w * dt;
    blur.visible = w > 25;
  };
  return makeModel('helm_propeller', root, update, [], { initial: 'idle' });
}

const HL = { gold: 0xffc21a, goldHi: 0xffe07a, frame: 0x2a2a34, lens: 0xfff6c8 };
function buildHelmLicht(opts = {}) {
  const S = 0.5;
  const root = new THREE.Group();
  const box = mesh(helmBoxGeo('licht', S, HL.gold, HL.goldHi, 0xb07a10, (b, s) => {
    b.cyl(0.2, 0.2, 0.08, HL.frame, { p: [s / 2 + 0.02, s / 2, 0], r: [0, 0, -Math.PI / 2] }, 22);
    b.torus(0.2, 0.03, 0xe6ecf6, { p: [s / 2 + 0.065, s / 2, 0], r: [0, Math.PI / 2, 0] }, 6, 22);
    for (const z of [1, -1]) b.extrude(sparkShape(0.12, 0.2), 0.02, 0xfff6e0, { p: [0, s / 2, z * (s / 2 + 0.01)], r: [0, z > 0 ? 0 : Math.PI, 0] }, 0.006, 5, 1);
  }), vcol(0.35), {}, true);
  const lensMat = new THREE.MeshStandardMaterial({ color: HL.lens, roughness: 0.1, emissive: 0x000000 });
  const lens = mesh(cached('w2:helm:lens', () => new THREE.SphereGeometry(0.18, 20, 10, 0, TAU, 0, Math.PI / 2).rotateZ(-Math.PI / 2).scale(0.4, 1, 1)), lensMat, { p: [S / 2 + 0.06, S / 2, 0] });
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xfff8e0, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide });
  const cone = mesh(cached('w2:helm:cone', () => {
    const g = new THREE.CylinderGeometry(0.8, 0.18, 2.6, 24, 1, true);
    g.rotateZ(Math.PI / 2); g.translate(1.3, 0, 0);
    return g;
  }), coneMat, { p: [S / 2 + 0.08, S / 2, 0] });
  const glow = glowSprite(0xfff0a0, 1.0, 0.85); glow.position.set(S / 2 + 0.12, S / 2, 0);
  root.add(box, lens, cone, glow);
  const clk = new Clock();
  let k = 0;
  const update = (dt, st) => {
    const on = st.on ?? opts.on ?? false;
    clk.tick(dt, st.anim ?? (on ? 'on' : 'off'));
    const flash = st.anim === 'flash';
    k = damp(k, on ? (flash ? 1.6 : 1) : 0, 10, dt);
    const fl = 1 + Math.sin(clk.t * 13) * 0.04;
    lensMat.emissive.setRGB(k * 0.95 * fl, k * 0.85 * fl, k * 0.45);
    cone.visible = glow.visible = k > 0.03;
    coneMat.opacity = 0.1 * Math.min(1.6, k) * fl;
    glow.scale.setScalar((0.8 + 0.5 * k) * fl);
  };
  return makeModel('helm_licht', root, update, [lensMat, coneMat], { initial: 'off' });
}

// =============================================================================================
// Kanonenkugel
// =============================================================================================
function buildKanonenkugel() {
  const root = new THREE.Group();
  const roll = joint([0, 0.25, 0]);
  roll.add(mesh(cached('w2:kugel', () => {
    const b = new Build();
    b.sphere(0.25, { v: (x, y, z, nx, ny) => mix(0x1a1e28, 0x4a5266, smoothstep(ny * 0.6 + nx * 0.3 + 0.2)) }, null, 26, 18);
    b.torus(0.25, 0.022, HK.gold, { r: [Math.PI / 2, 0, 0] }, 6, 32);
    for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) b.sphere(0.03, 0xfff0a0, { p: [Math.cos(a) * 0.255, 0, Math.sin(a) * 0.255] }, 8, 6);
    return b.geometry();
  }), metal('w2:kugel', { vertexColors: true, metalness: 0.55, roughness: 0.3 }, 0.8), {}, true));
  const trail = mesh(cached('w2:kugel:trail', () => {
    const b = new Build();
    for (let i = 0; i < 4; i++) b.sphere(0.1 + i * 0.035, i % 2 ? 0xdcdce4 : 0xf4f4f8, { p: [-0.32 - i * 0.2, Math.sin(i * 2) * 0.04, Math.cos(i * 3) * 0.05] }, 10, 8);
    return b.geometry();
  }), basic('w2:smoke', { color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false }), { p: [0, 0.25, 0] });
  root.add(roll, trail);
  const clk = new Clock();
  let a = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const v = anim === 'idle' ? 0 : (st.speed ?? (anim === 'fly' ? 12 : 4));
    a -= dt * v / 0.25;
    roll.rotation.z = a;
    trail.visible = anim === 'fly';
    if (trail.visible) { trail.scale.setScalar(0.9 + Math.sin(clk.t * 20) * 0.1); }
  };
  return makeModel('kanonenkugel', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Topfpflanze
// =============================================================================================
const TP = {
  head: 0x8a3ad8, under: 0xc69af2, spot: 0xffe14a, lip: 0xffc4de, palate: 0xa0123a, tongue: 0xff5a7a, tooth: 0xffffff,
  petal: 0xff8a1f, petalTip: 0xffd23a, stem: 0x3fae3a, stemDark: 0x2c8a2c, leaf: 0x5fcf3a, vein: 0x3a9a2a,
  pot: 0xd8743a, potRim: 0xee8e50, zig: 0xfff4e0, soil: 0x5a3a22,
};
const THR = [0.2, 0.18, 0.2], THC = [0.19, 0, 0];
function tpJawGeo(upper) {
  return cached(`w2:tp:jaw:${upper}`, () => {
    const b = new Build();
    const ry = upper ? THR[1] : THR[1] * 0.75;
    b.add(new THREE.SphereGeometry(1, 22, 9, 0, TAU, upper ? 0 : Math.PI / 2, Math.PI / 2),
      upper ? TP.head : { v: (x, y, z, nx) => mix(TP.under, TP.head, smoothstep(-nx * 0.8 + 0.3)) }, { p: THC, s: [THR[0], ry, THR[2]] });
    b.add(new THREE.CircleGeometry(1, 20), upper ? TP.palate : TP.tongue, { p: [THC[0], upper ? -0.002 : 0.002, 0], r: [upper ? Math.PI / 2 : -Math.PI / 2, 0, 0], s: [THR[0] * 0.97, THR[2] * 0.97, 1] });
    b.torus(1, 0.11, TP.lip, { p: [THC[0], 0, 0], r: [Math.PI / 2, 0, 0], s: [THR[0], THR[2], 0.3] }, 8, 28);
    for (let i = 0; i < 5; i++) {
      const a = -1.1 + (i / 4) * 2.2 + (upper ? 0 : 0.25);
      if (!upper && i === 4) continue;
      b.cone(0.024, 0.06, TP.tooth, { p: [THC[0] + Math.cos(a) * THR[0] * 0.86, upper ? -0.027 : 0.027, Math.sin(a) * THR[2] * 0.86], r: [0, 0, upper ? Math.PI : 0] }, 6);
    }
    if (upper) {
      const hits = [[0.2, 0.9, 0.045], [0.9, 0.35, 0.045], [-0.9, 0.35, 0.045], [2.1, 0.45, 0.05], [-2.1, 0.45, 0.05], [Math.PI, 0.3, 0.045]]
        .map(([az, el, r]) => ({ ...onEllipsoid(THC, THR, az, el), r }));
      decals(b, hits, 0.045, TP.spot, 0.25);
    }
    return b.geometry();
  });
}
const tpPetalsGeo = () => cached('w2:tp:petals', () => {
  const b = new Build();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + 0.2;
    const g = new THREE.SphereGeometry(1, 10, 6); g.scale(0.065, 0.1, 0.022); g.translate(0, 0.095, 0);
    b.add(g, { v: (x, y) => mix(TP.petal, TP.petalTip, smoothstep((y + 0.03) / 0.15)) }, { p: [0.04, 0, 0], r: [a, 0, 0.35], order: 'XZY' });
  }
  return b.geometry();
});
const tpPotGeo = () => cached('w2:tp:pot', () => {
  const b = new Build();
  const zig = (x, y, z, nx, ny) => {
    if (y > 0.29 && ny > 0.5) return TP.soil;
    if (y > 0.23) return TP.potRim;
    const a = (Math.atan2(z, x) / TAU + 1) * 12;
    const tri = Math.abs((a % 1) - 0.5) * 2;               // Zickzack-Band
    return Math.abs(y - (0.1 + tri * 0.08)) < 0.022 ? TP.zig : TP.pot;
  };
  const prof = [[0, 0], [0.18, 0], [0.2, 0.04]];
  for (let i = 1; i <= 8; i++) prof.push([0.2 + 0.035 * i / 8, 0.04 + 0.19 * i / 8]);
  prof.push([0.27, 0.24], [0.28, 0.29], [0.265, 0.32], [0.235, 0.32], [0.225, 0.3], [0, 0.3]);
  b.lathe(prof, zig, null, 72, 0);
  for (const s of [1, -1]) {
    const g = new THREE.SphereGeometry(1, 12, 6); g.scale(0.07, 0.018, 0.16); g.translate(0, 0, 0.15);
    b.add(g, { v: (x) => (Math.abs(x) < 0.01 ? TP.vein : TP.leaf) }, { p: [0.02, 0.31, s * 0.02], r: [s * -0.35, s > 0 ? 0.4 : Math.PI - 0.4, 0], order: 'YXZ' });
  }
  return b.geometry();
});
const tpStemGeo = () => cached('w2:tp:stem', () => {
  const b = new Build();
  b.cyl(0.04, 0.048, 0.3, { v: (x, y, z, nx) => mix(TP.stemDark, TP.stem, smoothstep(nx + 0.5)) }, { p: [0, 0.15, 0] }, 10);
  b.sphere(0.042, TP.stem, { p: [0, 0.3, 0] }, 10, 8);
  return b.geometry();
});
function buildTopfpflanze() {
  const root = new THREE.Group();
  const pot = mesh(tpPotGeo(), vcol(0.5), {}, true);
  const stem = joint([0, 0.3, 0], mesh(tpStemGeo(), vcol(0.5), {}, true));
  const head = joint([-0.13, 0.3, 0]);
  const upper = joint([0, 0, 0], mesh(tpJawGeo(true), vcol(0.32), {}, true));
  const lower = joint([0, 0, 0], mesh(tpJawGeo(false), vcol(0.32), {}, true));
  const eye = eyes([{ p: [0.25, 0.135, 0.07], r: 0.045, sy: 1.15, dir: [0.6, 0.75, 0.35] }, { p: [0.25, 0.135, -0.07], r: 0.045, sy: 1.15, dir: [0.6, 0.75, -0.35] }],
    { key: 'w2:tp', iris: 0x2a6a2a, pupil: 0.58, depth: 0.5 });
  upper.add(eye);
  head.add(upper, lower, mesh(tpPetalsGeo(), vcol(0.45), {}, true));
  stem.add(head);
  root.add(pot, stem);
  const clk = new Clock(), blink = new Blinker();
  let open = 0.2;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    let bend = Math.sin(t * 1.4) * 0.08, tilt = -0.1, jaw = 0.12 + (Math.sin(t * 2.3) + 1) * 0.06, hx = 0;
    if (anim === 'snap') {
      const p = st.progress ?? (age % 0.5) / 0.5;
      if (p < 0.35) { const k = smoothstep(p / 0.35); bend = 0.25 * k; jaw = 0.2 + 0.7 * k; tilt = 0.1 * k; }
      else if (p < 0.55) { const k = smoothstep((p - 0.35) / 0.2); bend = 0.25 - 0.8 * k; jaw = k < 0.6 ? 0.9 : 0.9 * (1 - (k - 0.6) / 0.4); tilt = 0.1 - 0.4 * k; hx = 0.08 * k; }
      else { const k = smoothstep((p - 0.55) / 0.45); bend = -0.55 * (1 - k); jaw = 0.05 + 0.15 * k; tilt = -0.3 * (1 - k) - 0.1 * k; hx = 0.08 * (1 - k); }
    } else if (anim === 'carried') {
      bend = -0.35 + Math.sin(t * 7) * 0.08; tilt = 0.05; jaw = 0.35 + Math.sin(t * 9) * 0.15;
    }
    stem.rotation.z = damp(stem.rotation.z, bend, anim === 'snap' ? 30 : 12, dt);
    stem.rotation.x = Math.sin(t * 1.1) * 0.05;
    head.rotation.z = damp(head.rotation.z, tilt, 16, dt);
    head.position.x = -0.13 + hx;
    open = damp(open, jaw, anim === 'snap' ? 40 : 12, dt);
    upper.rotation.z = open * 0.75;
    lower.rotation.z = -open * 0.4;
    eye.userData.blink(anim === 'carried' ? 1.1 : blink.update(dt));
  };
  return makeModel('topfpflanze', root, update, [], { initial: 'idle' });
}

export const MODELS = {
  powerup_spiegel: buildSpiegel,
  helm_kanone: buildHelmKanone,
  helm_propeller: buildHelmPropeller,
  helm_licht: buildHelmLicht,
  kanonenkugel: buildKanonenkugel,
  topfpflanze: buildTopfpflanze,
};
