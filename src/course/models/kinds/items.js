// Power-ups und Sammelobjekte (Kurs-Modus). Eigene Gestaltung. Maßstab Meter, Ursprung = Fußpunkt
// (schwebende Objekte: Unterkante des Schwebebereichs, Mitte meist bei y ≈ 0,45–0,75), Blick nach +X.
// state darf ein String sein ('collected' ≙ { anim: 'collected' }). Alle drehen/wippen von selbst.
//
// powerup_wachstumsbeere  ≈0,65 m  pralle rote Doppelbeere mit gelben Kernchen, Blätterkrone.  state { anim: 'idle' }
// powerup_krallen         Ø 0,7 m  Krallen-Medaillon: Goldrand, orange Fläche mit braunem Pfotenabdruck (beidseitig),
//                         rote Schleife.  state { anim: 'idle' }
// powerup_funken          ≈0,85 m  Funkenblüte: fünf orange-rote Blütenblätter, gelbe Mitte mit weißem Funkenstempel,
//                         Stängel mit zwei Blättern; wiegt sich.  state { anim: 'idle' }
// powerup_riese           ≈0,8 m  Riesentrank: runde Glasflasche mit leuchtend magentafarbenem Trank, Blasen,
//                         Korken, Goldring, Etikett mit Pfeil nach oben.  state { anim: 'idle' }
// powerup_stern           Ø 0,85 m  Funkelstern: puffiger Stern, Farbe läuft durch den Regenbogen, weißer Kern.
//                         state { anim: 'idle' }
// oneup                   ≈0,75 m  Lebensherz: grünes Puffherz mit Blattspross.  state { anim: 'idle' }
// coin                    Ø 0,8 m  Bitcoin-Münze (Design aus src/three/avatars/items.js): orange, ₿-Relief, Randwulst.
//                         Mitte bei y = 0,45.  state { anim: 'idle'|'collected'|'ghost' }
//                         collected: schnellt hoch, dreht schnell, verblasst in 0,35 s; ghost: halbdurchsichtig.
// coin_blue               wie coin in Blau (Schalter-Münzen).  state wie coin
// star                    ≈1,3 m  großer grüner Stern (Sammelstern): smaragdgrün, helle Kanten, Innenstern,
//                         Glitzern. Mitte bei y = 0,75.  state { anim: 'idle'|'collected'|'ghost' }
//                         collected/ghost: durchsichtig (schon gesammelt); collected zusätzlich kurzer Hüpfer.
// stamp                   Ø 0,8 m  Stempel: rotes Siegel mit Wellenrand, cremefarbene Flächen „L&G“ mit Herz.
//                         Mitte bei y = 0,55.  state { anim: 'idle'|'collected'|'ghost' }
// time_ring               Ø 2,0 m  Zeitring (senkrecht, Durchflugrichtung ±X): oranger Ring mit 12 weißen
//                         Stundenknöpfen, kleine Uhr oben.  state { anim: 'idle'|'active'|'done', progress? (0..1
//                         Restzeit im active-Zustand: Uhrzeiger) }
// funkenball              Ø 0,4 m  Feuerball der Funkenblüte: glühender Kern, Schein, Funkenschweif nach −X.
//                         state { anim: 'idle' }

import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  THREE, TAU, Build, cached, vcol, basic, std, mesh, joint, makeModel, Clock, clamp, col, mix,
  onEllipsoid, decals, smoothstep, glowSprite, sparkleSprite, instMesh, setInst, puffyStarGeo,
  heartShape, sparkShape, canvasTexture, coinMaterials, coinBodyGeo, coinFacesGeo,
} from '../lib/kit.js';

// ------------------------------------------------------------------ Schwebe-Hilfe
function floater(root, y0, rate = 1.6, amp = 0.06) {
  const spin = joint([0, y0, 0]);
  root.add(spin);
  return {
    spin,
    step(t, spinRate = rate) { spin.rotation.y = t * spinRate; spin.position.y = y0 + Math.sin(t * 2.4) * amp; },
  };
}
const twinkle = (sp, t, phase, size) => {
  const k = Math.pow(Math.max(0, Math.sin(t * 2.2 + phase)), 6);
  sp.scale.setScalar(Math.max(0.001, k * size));
  sp.visible = k > 0.03;
};

// =============================================================================================
// Wachstumsbeere
// =============================================================================================
function berryGeo() {
  return cached('item:berry', () => {
    const b = new Build();
    const red = { v: (x, y, z, nx, ny) => mix(0xb8102a, 0xff3a4a, smoothstep((ny + 0.6) / 1.4)) };
    b.sphere(0.25, red, { p: [0, 0.3, 0] }, 24, 18);
    b.sphere(0.19, red, { p: [0.08, 0.44, 0.1] }, 20, 14);
    const seeds = [];
    for (let i = 0; i < 9; i++) seeds.push({ ...onEllipsoid([0, 0.3, 0], [0.25, 0.25, 0.25], i * 0.7 + 0.3, -0.5 + (i % 3) * 0.35), r: 0.022 });
    for (let i = 0; i < 5; i++) seeds.push({ ...onEllipsoid([0.08, 0.44, 0.1], [0.19, 0.19, 0.19], i * 1.25, 0.1 + (i % 2) * 0.35), r: 0.02 });
    decals(b, seeds, 0.02, 0xffe46a, 0.5);
    b.cyl(0.018, 0.026, 0.14, 0x4a8a2a, { p: [0.0, 0.66, 0.02], r: [0.1, 0, 0.15] }, 6);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      const g = new THREE.SphereGeometry(1, 10, 6); g.scale(0.05, 0.015, 0.11); g.translate(0, 0, 0.1);
      b.add(g, i % 2 ? 0x4fbf3a : 0x6fd84a, { p: [0.02, 0.6, 0.03], r: [0.35, a, 0], order: 'YXZ' });
    }
    return b.geometry();
  });
}
function buildBerry() {
  const root = new THREE.Group();
  const f = floater(root, 0.08, 1.4, 0.05);
  f.spin.add(mesh(berryGeo(), vcol(0.18), {}, true));
  const sp = sparkleSprite(0xffffff, 0.3); sp.position.set(0.15, 0.65, 0.15);
  root.add(sp);
  const clk = new Clock();
  const update = (dt, st) => { clk.tick(dt, st.anim ?? 'idle'); f.step(clk.t); twinkle(sp, clk.t, 0, 0.35); };
  return makeModel('powerup_wachstumsbeere', root, update);
}

// =============================================================================================
// Krallen-Medaillon
// =============================================================================================
function medalGeo() {
  return cached('item:medal', () => {
    const b = new Build();
    const rim = 0xffc21a;
    b.cyl(0.33, 0.33, 0.1, rim, { r: [Math.PI / 2, 0, 0] }, 32);
    b.torus(0.32, 0.045, 0xffd84a, { }, 8, 32);
    for (const s of [1, -1]) {
      b.cyl(0.275, 0.275, 0.02, 0xff8a1a, { p: [0, 0, s * 0.052], r: [Math.PI / 2, 0, 0] }, 32);
      // Pfotenabdruck: Ballen + vier Zehen (leicht erhaben)
      const pads = [[0, -0.06, 0.1, 0.085], [-0.13, 0.05, 0.045, 0.055], [-0.05, 0.12, 0.045, 0.06], [0.05, 0.12, 0.045, 0.06], [0.13, 0.05, 0.045, 0.055]];
      for (const [x, y, rx, ry] of pads) b.sphere(1, 0x5a2a12, { p: [x, y, s * 0.062], s: [rx * (x === 0 ? 1.15 : 1), ry, 0.02] }, 14, 6);
    }
    // Schleife oben
    b.torus(0.07, 0.025, 0xe0262a, { p: [0, 0.4, 0] }, 6, 16);
    for (const s of [1, -1]) b.box(0.05, 0.16, 0.02, 0xe0262a, { p: [s * 0.07, 0.3, 0], r: [0, 0, s * 0.4] }, 0.01, 1);
    return b.geometry();
  });
}
function buildMedal() {
  const root = new THREE.Group();
  const f = floater(root, 0.5, 1.8, 0.06);
  f.spin.add(mesh(medalGeo(), vcol(0.25), {}, true));
  const sp = sparkleSprite(0xffffff, 0.3); sp.position.set(0.2, 0.85, 0.2);
  root.add(sp);
  const clk = new Clock();
  const update = (dt, st) => { clk.tick(dt, st.anim ?? 'idle'); f.step(clk.t); twinkle(sp, clk.t, 1, 0.4); };
  return makeModel('powerup_krallen', root, update);
}

// =============================================================================================
// Funkenblüte
// =============================================================================================
function flowerGeo() {
  return cached('item:fireflower', () => {
    const b = new Build();
    b.tube([[0, 0, 0], [0.03, 0.2, 0], [-0.02, 0.4, 0], [0, 0.5, 0]], 0.03, 0x3fae3a, null, 12, 6);
    for (const s of [1, -1]) {
      const g = new THREE.SphereGeometry(1, 12, 6); g.scale(0.07, 0.018, 0.16); g.translate(0, 0, 0.14);
      b.add(g, 0x5fcf3a, { p: [0, 0.12 + (s > 0 ? 0 : 0.06), 0], r: [s * -0.4, s > 0 ? 0.2 : Math.PI + 0.2, 0], order: 'YXZ' });
    }
    // Blüte zeigt nach +X
    const C = [0.02, 0.62, 0];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + Math.PI / 2;
      const g = new THREE.SphereGeometry(1, 14, 8); g.scale(0.13, 0.2, 0.045); g.translate(0, 0.17, 0);
      b.add(g, { v: (x, y) => mix(0xff7a1a, 0xff2a3a, smoothstep((y - 0.05) / 0.25)) }, { p: C, r: [0, Math.PI / 2, a], order: 'YXZ' });
    }
    b.sphere(1, 0xffd21f, { p: [C[0] + 0.03, C[1], 0], s: [0.05, 0.1, 0.1] }, 16, 10);
    b.extrude(sparkShape(0.075, 0.18), 0.03, 0xffffff, { p: [C[0] + 0.075, C[1], 0], r: [0, Math.PI / 2, 0] }, 0.008, 3, 1);
    // Rückseite: grüner Kelch
    b.sphere(1, 0x3fae3a, { p: [C[0] - 0.04, C[1], 0], s: [0.05, 0.09, 0.09] }, 12, 8);
    return b.geometry();
  });
}
function buildFireFlower() {
  const root = new THREE.Group();
  const sway = joint();
  sway.add(mesh(flowerGeo(), vcol(0.35), {}, true));
  const glow = glowSprite(0xffa040, 0.55, 0.5); glow.position.set(0.12, 0.62, 0);
  const sp = sparkleSprite(0xffffff, 0.25); sp.position.set(0.15, 0.82, 0.12);
  sway.add(glow);
  root.add(sway, sp);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    const t = clk.t;
    sway.rotation.z = Math.sin(t * 2) * 0.08; sway.rotation.x = Math.sin(t * 1.5) * 0.06;
    sway.rotation.y = Math.sin(t * 0.8) * 0.5;
    glow.scale.setScalar(0.55 + Math.sin(t * 6) * 0.06);
    twinkle(sp, t, 2, 0.35);
  };
  return makeModel('powerup_funken', root, update);
}

// =============================================================================================
// Riesentrank
// =============================================================================================
function potionGeo() {
  return cached('item:potion', () => {
    const b = new Build();
    b.cyl(0.075, 0.085, 0.16, 0xd8f2ff, { p: [0, 0.6, 0] }, 16);
    b.torus(0.085, 0.022, 0xffc21a, { p: [0, 0.54, 0], r: [Math.PI / 2, 0, 0] }, 6, 18);
    b.cyl(0.07, 0.06, 0.12, 0xb07a44, { p: [0, 0.72, 0] }, 12);
    b.sphere(1, 0xb07a44, { p: [0, 0.78, 0], s: [0.07, 0.03, 0.07] }, 10, 6);
    // Etikett vorn mit Pfeil nach oben
    b.box(0.03, 0.17, 0.2, 0xfff6e0, { p: [0.265, 0.3, 0], r: [0, 0, -0.1] }, 0.012, 1);
    const arrow = new THREE.Shape();
    arrow.moveTo(0, 0.07); arrow.lineTo(0.06, 0.0); arrow.lineTo(0.025, 0.0); arrow.lineTo(0.025, -0.06); arrow.lineTo(-0.025, -0.06); arrow.lineTo(-0.025, 0.0); arrow.lineTo(-0.06, 0.0); arrow.closePath();
    b.extrude(arrow, 0.012, 0xe0262a, { p: [0.283, 0.302, 0], r: [0, Math.PI / 2, 0.1], order: 'XZY' });
    return b.geometry();
  });
}
function buildPotion() {
  const root = new THREE.Group();
  const f = floater(root, 0.06, 1.2, 0.05);
  const glass = mesh(cached('item:potionGlass', () => new THREE.SphereGeometry(0.27, 24, 18)), std('potionGlass', { color: 0xcfefff, transparent: true, opacity: 0.32, roughness: 0.05, depthWrite: false }), { p: [0, 0.3, 0] });
  const liquid = mesh(cached('item:potionLiquid', () => { const g = new THREE.SphereGeometry(0.235, 22, 14, 0, TAU, Math.PI * 0.28, Math.PI * 0.72); return g; }),
    std('potionLiquid', { color: 0xff3ab0, emissive: 0x8a1060, roughness: 0.2 }), { p: [0, 0.3, 0] }, true);
  const parts = mesh(potionGeo(), vcol(0.3), {}, true);
  const bubbles = instMesh(cached('item:bubble', () => new THREE.SphereGeometry(0.028, 8, 6)), basic('bubble', { color: 0xffd6f2 }), 5, 0.5, 0.3);
  const glow = glowSprite(0xff60c8, 0.85, 0.45); glow.position.y = 0.3;
  f.spin.add(liquid, bubbles, parts, glass, glow);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    const t = clk.t;
    f.step(t, 1.2);
    for (let i = 0; i < 5; i++) {
      const p = (t * 0.35 + i / 5) % 1;
      setInst(bubbles, i, Math.sin(i * 2.1) * 0.1, 0.15 + p * 0.3, Math.cos(i * 1.7) * 0.1, 0, 0, 0, Math.sin(p * Math.PI) * 1.2 + 0.001);
    }
    bubbles.instanceMatrix.needsUpdate = true;
    liquid.rotation.z = Math.sin(t * 2.4) * 0.06;
    glow.scale.setScalar(0.85 + Math.sin(t * 3) * 0.08);
  };
  return makeModel('powerup_riese', root, update);
}

// =============================================================================================
// Funkelstern (Regenbogen)
// =============================================================================================
function buildRainbowStar() {
  const root = new THREE.Group();
  const f = floater(root, 0.5, 2.2, 0.08);
  // Regenbogen über die Zacken (Vertexfarben nach Winkel), Leuchten pulsiert durch die Farben
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0x302030, roughness: 0.22, metalness: 0.05 });
  const star = mesh(cached('item:rstar', () => new Build().add(puffyStarGeo(0.42, 0.2, 0.15, 0.08),
    { v: (x, y) => new THREE.Color().setHSL(((Math.atan2(y, x) / TAU + 1.25) % 1), 1, 0.55) }).geometry()), m, {}, true);
  const core = mesh(cached('item:rstarCore', () => {
    const b = new Build();
    for (const s of [1, -1]) b.add(puffyStarGeo(0.16, 0.075, 0.02, 0.03), 0xffffff, { p: [0, 0, s * 0.12] });
    return b.geometry();
  }), basic('white', { color: 0xffffff }));
  const glow = glowSprite(0xffffff, 1.2, 0.55);
  f.spin.add(star, core, glow);
  const sps = [0, 1, 2].map((i) => { const s = sparkleSprite(0xffffff, 0.3); s.position.set(Math.cos(i * 2.1) * 0.45, 0.5 + Math.sin(i * 2.1) * 0.45, 0.2); root.add(s); return s; });
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    const t = clk.t;
    f.step(t, 2.2);
    m.emissive.setHSL((t * 0.6) % 1, 0.9, 0.16 + Math.sin(t * 9) * 0.05);
    star.rotation.z = t * 0.8;
    sps.forEach((s, i) => twinkle(s, t * 1.3, i * 2.1, 0.35));
  };
  return makeModel('powerup_stern', root, update, [m]);
}

// =============================================================================================
// Lebensherz (1-Up)
// =============================================================================================
function heartGeo() {
  return cached('item:heart', () => {
    const b = new Build();
    b.extrude(heartShape(0.3), 0.2, { v: (x, y, z, nx, ny, nz) => mix(0x22b844, 0x9cff8a, smoothstep((ny + 0.2) / 1.2) * 0.7) }, { p: [0, 0.36, 0] }, 0.11, 16, 6, true);
    b.cyl(0.015, 0.02, 0.12, 0x3a8a2a, { p: [0, 0.68, 0], r: [0, 0, -0.2] }, 6);
    const g = new THREE.SphereGeometry(1, 12, 6); g.scale(0.11, 0.05, 0.02);
    b.add(g, 0x6fd84a, { p: [0.08, 0.75, 0], r: [0, 0, 0.6] });
    return b.geometry();
  });
}
function buildOneUp() {
  const root = new THREE.Group();
  const f = floater(root, 0.06, 1.6, 0.06);
  f.spin.add(mesh(heartGeo(), vcol(0.25), {}, true));
  const sp = sparkleSprite(0xffffff, 0.3); sp.position.set(-0.15, 0.7, 0.15);
  root.add(sp);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    const t = clk.t;
    f.step(t, 1.6);
    const beat = 1 + Math.pow(Math.max(0, Math.sin(t * 5)), 8) * 0.08;
    f.spin.scale.setScalar(beat);
    twinkle(sp, t, 0.5, 0.35);
  };
  return makeModel('oneup', root, update);
}

// =============================================================================================
// Münzen
// =============================================================================================
function buildCoin(kind) {
  return () => {
    const shared = coinMaterials(kind);
    const bodyMat = shared.body.clone(), faceMat = shared.face.clone();
    const root = new THREE.Group();
    const spin = joint([0, 0.45, 0]);
    spin.add(mesh(coinBodyGeo(40), bodyMat, {}, true), mesh(coinFacesGeo(36), faceMat));
    const sp = sparkleSprite(0xffffff, 0.26); sp.position.set(0.22, 0.72, 0.2);
    root.add(spin, sp);
    const clk = new Clock();
    const phase = Math.random() * TAU;
    const update = (dt, st) => {
      const anim = st.anim ?? 'idle';
      clk.tick(dt, anim);
      const t = clk.t, age = clk.age;
      const col = anim === 'collected';
      const k = col ? clamp(age / 0.35, 0, 1) : 0;
      spin.rotation.y = t * 2.4 + phase + (col ? age * 25 : 0);
      spin.position.y = 0.45 + Math.sin(t * 2.6 + phase) * 0.045 + (col ? Math.sin(k * Math.PI * 0.6) * 1.0 : 0);
      const a = col ? 1 - k * k : anim === 'ghost' ? 0.45 : 1;
      for (const m of [bodyMat, faceMat]) { m.transparent = a < 0.99; m.opacity = a; m.depthWrite = a >= 0.99; }
      spin.visible = a > 0.02;
      twinkle(sp, t, phase * 2, a < 0.99 ? 0.12 : 0.3);
    };
    return makeModel(kind, root, update, [bodyMat, faceMat]);
  };
}

// =============================================================================================
// Grüner Stern (Sammelstern)
// =============================================================================================
function greenStarGeo() {
  return cached('item:gstar', () => {
    const b = new Build();
    b.add(puffyStarGeo(0.55, 0.26, 0.2, 0.11), { v: (x, y, z, nx, ny, nz) => (Math.abs(nz) > 0.92 ? col(0x1fc85a) : mix(0x1fc85a, 0xb8ffc8, 1 - Math.abs(nz))) });
    for (const s of [1, -1]) b.add(puffyStarGeo(0.27, 0.13, 0.03, 0.035), 0x7dffa8, { p: [0, 0, s * 0.2] });
    return b.geometry();
  });
}
function buildGreenStar() {
  const root = new THREE.Group();
  const f = floater(root, 0.75, 1.5, 0.08);
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.18, emissive: 0x0a3a14 });
  const star = mesh(greenStarGeo(), m, {}, true);
  const glow = glowSprite(0x9affb0, 1.6, 0.35);
  f.spin.add(star, glow);
  const sps = [0, 1, 2, 3].map((i) => { const s = sparkleSprite(0xffffff, 0.3); s.position.set(Math.cos(i * 1.6) * 0.6, 0.75 + Math.sin(i * 1.6) * 0.6, 0.25); root.add(s); return s; });
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    const ghost = anim === 'collected' || anim === 'ghost';
    f.step(t, ghost ? 1.0 : 1.5);
    if (anim === 'collected') f.spin.position.y += Math.sin(clamp(age / 0.5, 0, 1) * Math.PI) * 0.6;
    m.transparent = ghost; m.opacity = ghost ? 0.35 : 1; m.depthWrite = !ghost;
    glow.visible = !ghost;
    sps.forEach((s, i) => twinkle(s, t * 1.2, i * 1.7, ghost ? 0 : 0.42));
  };
  return makeModel('star', root, update, [m]);
}

// =============================================================================================
// Stempel (Lotti-&-Greta-Siegel)
// =============================================================================================
function stampTexture() {
  return canvasTexture('cm:stampFace', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#fff3dc'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#d8283a'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.43, 0, TAU); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.37, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#d8283a'; ctx.font = 'bold 92px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('L&G', w / 2, h * 0.47);
    // Herz unten
    ctx.save(); ctx.translate(w / 2, h * 0.73); ctx.scale(1.2, 1.2);
    ctx.beginPath(); ctx.moveTo(0, 10); ctx.bezierCurveTo(-18, -2, -10, -16, 0, -6); ctx.bezierCurveTo(10, -16, 18, -2, 0, 10); ctx.fill();
    ctx.restore();
    for (const x of [-1, 1]) { ctx.beginPath(); ctx.arc(w / 2 + x * 70, h * 0.73, 5, 0, TAU); ctx.fill(); }
  });
}
function stampBodyGeo() {
  return cached('item:stamp', () => {
    const b = new Build();
    b.cyl(0.34, 0.34, 0.1, 0xd8283a, { r: [Math.PI / 2, 0, 0] }, 36);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * TAU;
      b.sphere(0.06, 0xe8384a, { p: [Math.cos(a) * 0.35, Math.sin(a) * 0.35, 0], s: [1, 1, 0.9] }, 10, 8);
    }
    return b.geometry();
  });
}
function buildStamp() {
  const root = new THREE.Group();
  const f = floater(root, 0.55, 1.5, 0.06);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3 });
  const faceMat = new THREE.MeshStandardMaterial({ map: stampTexture(), roughness: 0.45, emissive: 0x201010 });
  const faces = cached('item:stampFaces', () => {
    const a = new THREE.CircleGeometry(0.3, 36); a.translate(0, 0, 0.052);
    const c = new THREE.CircleGeometry(0.3, 36); c.rotateY(Math.PI); c.translate(0, 0, -0.052);
    const g = mergeGeometries([a, c], false);
    a.dispose(); c.dispose();
    return g;
  });
  f.spin.add(mesh(stampBodyGeo(), mat, {}, true), mesh(faces, faceMat));
  const sp = sparkleSprite(0xffffff, 0.3); sp.position.set(0.25, 0.85, 0.2);
  root.add(sp);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    f.step(t, 1.5);
    const ghost = anim === 'collected' || anim === 'ghost';
    if (anim === 'collected') f.spin.position.y += Math.sin(clamp(clk.age / 0.5, 0, 1) * Math.PI) * 0.5;
    for (const m of [mat, faceMat]) { m.transparent = ghost; m.opacity = ghost ? 0.4 : 1; m.depthWrite = !ghost; }
    twinkle(sp, t, 1.3, ghost ? 0 : 0.35);
  };
  return makeModel('stamp', root, update, [mat, faceMat]);
}

// =============================================================================================
// Zeitring
// =============================================================================================
function ringGeo() {
  return cached('item:timering', () => {
    const b = new Build();
    b.torus(0.88, 0.09, { v: (x, y, z, nx, ny, nz) => mix(0xff8a1a, 0xffc23a, smoothstep(ny * 0.5 + 0.5)) }, { r: [0, Math.PI / 2, 0] }, 12, 64);
    b.torus(0.76, 0.025, 0x3a7ae8, { r: [0, Math.PI / 2, 0] }, 6, 48);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      b.sphere(i % 3 ? 0.06 : 0.085, 0xffffff, { p: [0, Math.sin(a) * 0.88, Math.cos(a) * 0.88], s: [1.4, 1, 1] }, 10, 8);
    }
    return b.geometry();
  });
}
function clockGeo() {
  return cached('item:clock', () => {
    const b = new Build();
    b.cyl(0.2, 0.2, 0.08, 0xfff8e8, { r: [0, 0, Math.PI / 2] }, 24);
    b.torus(0.2, 0.03, 0xff8a1a, { r: [0, Math.PI / 2, 0] }, 6, 24);
    b.cyl(0.04, 0.05, 0.08, 0xff8a1a, { p: [0, 0.24, 0] }, 8);
    b.sphere(0.035, 0x2a2a3a, { p: [0.045, 0, 0] }, 8, 6);
    return b.geometry();
  });
}
function buildTimeRing() {
  const root = new THREE.Group();
  const ringJ = joint([0, 1.0, 0]);
  const flash = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, emissive: 0x000000 });
  const ring = mesh(ringGeo(), flash, {}, true);
  ringJ.add(ring);
  const clockJ = joint([0, 2.15, 0], mesh(clockGeo(), vcol(0.4)));
  const hand = mesh(cached('item:clockHand', () => { const g = new THREE.BoxGeometry(0.02, 0.15, 0.025); g.translate(0, 0.07, 0); return g; }), basic('clockHand', { color: 0x2a2a3a }), { p: [0.05, 0, 0] });
  clockJ.add(hand);
  const glow = glowSprite(0xffc070, 2.4, 0.3); glow.position.y = 1.0;
  root.add(ringJ, clockJ, glow);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    const active = anim === 'active', done = anim === 'done';
    ring.rotation.x = t * (active ? 2.5 : 0.6);
    ringJ.scale.setScalar(active ? 1 + Math.sin(t * 8) * 0.03 : 1);
    flash.emissive.setRGB(active ? 0.35 + Math.sin(t * 8) * 0.15 : 0.05, active ? 0.2 : 0.03, 0);
    flash.color.setRGB(done ? 0.55 : 1, done ? 0.55 : 1, done ? 0.6 : 1);
    const p = clamp(st.progress ?? (active ? 1 - (clk.age / 10) : 1), 0, 1);
    hand.rotation.x = -(1 - p) * TAU;
    clockJ.rotation.y = Math.sin(t * 1.2) * 0.4;
    clockJ.position.y = 2.15 + Math.sin(t * 2.2) * 0.05;
    glow.visible = active;
  };
  return makeModel('time_ring', root, update, [flash]);
}

// =============================================================================================
// Funkenball
// =============================================================================================
function buildFunkenball() {
  const root = new THREE.Group();
  const core = mesh(cached('item:fireCore', () => new THREE.IcosahedronGeometry(0.15, 1)), basic('fireCore', { color: 0xfff2a0 }), { p: [0, 0.2, 0] });
  const shell = mesh(cached('item:fireShell', () => new THREE.IcosahedronGeometry(0.2, 1)), basic('fireShell', { color: 0xff7a1a, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }), { p: [0, 0.2, 0] });
  const tail = instMesh(cached('item:fireTail', () => new THREE.IcosahedronGeometry(0.1, 0)), basic('fireTail', { color: 0xff9a2a, transparent: true, opacity: 0.85, depthWrite: false }), 3, 0.8, 0.2);
  const glow = glowSprite(0xff9a30, 0.9, 0.8); glow.position.y = 0.2;
  root.add(core, shell, tail, glow);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    const t = clk.t;
    const fl = 1 + Math.sin(t * 31) * 0.12;
    core.scale.setScalar(fl); core.rotation.set(t * 5, t * 7, 0);
    shell.scale.setScalar(1.1 - Math.sin(t * 27) * 0.1); shell.rotation.set(-t * 4, t * 3, 0);
    for (let i = 0; i < 3; i++) {
      const w = Math.sin(t * 24 + i * 1.9);
      setInst(tail, i, -(0.18 + i * 0.14), 0.2 + 0.05 * i + w * 0.03, w * 0.03, t * 6, t * 4, 0, (1 - i * 0.26) * (0.85 + 0.25 * Math.sin(t * 37 + i)));
    }
    tail.instanceMatrix.needsUpdate = true;
    glow.scale.setScalar(0.9 + Math.sin(t * 19) * 0.1);
  };
  return makeModel('funkenball', root, update);
}

export const MODELS = {
  powerup_wachstumsbeere: buildBerry,
  powerup_krallen: buildMedal,
  powerup_funken: buildFireFlower,
  powerup_riese: buildPotion,
  powerup_stern: buildRainbowStar,
  oneup: buildOneUp,
  coin: buildCoin('coin'),
  coin_blue: buildCoin('coin_blue'),
  star: buildGreenStar,
  stamp: buildStamp,
  time_ring: buildTimeRing,
  funkenball: buildFunkenball,
};
