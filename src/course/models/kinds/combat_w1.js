// Modelle für die Kampf-Level von Welt 1 (Kurs-Modus, 1-A und 1-Burg). Eigene Gestaltung. Maßstab Meter,
// Ursprung = Fußpunkt, Blick nach +X; state darf ein String sein ('idle' ≙ { anim: 'idle' }).
//
// bomb_cannon   Bombenkanone des Barons (≈2,0 m): weinroter Achteck-Sockel mit Goldband und goldener Tatze,
//               schwarzes Eisenrohr mit Goldringen auf einem Drehkranz (Rohr zeigt nach +X).
//               state { anim: 'idle'|'charge'|'fire', aim (rad, Rohrneigung nach oben, Standard 0.5),
//                       progress (0..1 in charge/fire) }
//               charge: Rohr zittert, Zündfunke am Rohrende, Glühen; fire: Rückstoß, Mündungsblitz, Rauch.
//               model.muzzle(out?) → Weltposition der Mündung (nur Darstellung; der Motor rechnet selbst).
// rescue_cage   Goldener Vogelkäfig (Ø 1,5 m, 1,9 m) auf Sockel mit Vorhängeschloss; die Tür (vorn, +X) klappt
//               auf.  state { open: 0..1 }  (Inhalt – z. B. der kleine Hase – setzt die Entität selbst hinein)
// boss_marker   Landeanzeige einer geworfenen Bombe: roter Ring mit Fadenkreuz am Boden (Ø 1,6 m), pulsiert.
//               state { k: 0..1 (wie nah der Einschlag ist) }

import {
  THREE, TAU, Build, cached, vcol, basic, mesh, joint, makeModel, Clock, damp, clamp, glowSprite, puffyStarGeo,
} from '../lib/kit.js';

// =============================================================================================
// Bombenkanone
// =============================================================================================

const CN = { base: 0x8a1f2c, baseDark: 0x5a1220, gold: 0xffc21a, iron: 0x26262e, ironHi: 0x4a4a58, ring: 0xd8a018, wood: 0x6a3a1c };

function cannonBaseGeo() {
  return cached('cannon:base', () => {
    const b = new Build();
    b.cyl(0.78, 0.86, 0.9, { v: (x, y) => (y > 0.25 ? CN.base : CN.baseDark) }, { p: [0, 0.45, 0] }, 8);
    b.cyl(0.82, 0.82, 0.12, CN.gold, { p: [0, 0.78, 0] }, 8);
    b.cyl(0.9, 0.9, 0.1, CN.baseDark, { p: [0, 0.05, 0] }, 8);
    // goldene Tatze vorn (+X) und hinten
    for (const s of [1, -1]) {
      b.sphere(1, CN.gold, { p: [s * 0.8, 0.42, 0], s: [0.04, 0.13, 0.15] }, 10, 8);
      for (const z of [-0.12, -0.04, 0.04, 0.12]) b.sphere(0.045, CN.gold, { p: [s * 0.8, 0.6, z] }, 8, 6);
    }
    // Drehkranz
    b.cyl(0.6, 0.66, 0.16, CN.ironHi, { p: [0, 0.98, 0] }, 16);
    return b.geometry();
  });
}
function cannonYokeGeo() {
  return cached('cannon:yoke', () => {
    const b = new Build();
    for (const s of [1, -1]) b.box(0.5, 0.55, 0.12, CN.wood, { p: [0, 0.28, s * 0.42] }, 0.05, 1);
    b.box(0.5, 0.1, 0.96, CN.wood, { p: [0, 0.05, 0] }, 0.04, 1);
    for (const s of [1, -1]) b.cyl(0.08, 0.08, 0.06, CN.gold, { p: [0, 0.42, s * 0.5], r: [Math.PI / 2, 0, 0] }, 12);
    return b.geometry();
  });
}
function cannonBarrelGeo() {
  return cached('cannon:barrel', () => {
    const b = new Build();
    // Rohr entlang +X, Drehpunkt (Schildzapfen) im Ursprung
    b.lathe([[0, -0.55], [0.3, -0.55], [0.36, -0.42], [0.36, -0.2], [0.33, 0.4], [0.3, 0.95], [0.36, 1.02], [0.38, 1.12], [0.27, 1.12], [0.24, 0.9]], CN.iron, { r: [0, 0, -Math.PI / 2] }, 22);
    b.sphere(0.2, CN.iron, { p: [-0.6, 0, 0] }, 14, 10);
    for (const x of [-0.25, 0.35, 0.92]) b.torus(x > 0.8 ? 0.33 : 0.36, 0.035, CN.ring, { p: [x, 0, 0], r: [0, Math.PI / 2, 0] }, 6, 22);
    // Mündung innen dunkel
    b.cyl(0.25, 0.25, 0.02, 0x0a0a0e, { p: [1.11, 0, 0], r: [0, 0, Math.PI / 2] }, 16);
    // Glanzstreifen oben
    b.box(1.2, 0.03, 0.06, CN.ironHi, { p: [0.3, 0.33, 0] }, 0.01, 1);
    return b.geometry();
  });
}
const smokeGeo = () => cached('cannon:smoke', () => {
  const b = new Build();
  for (let i = 0; i < 4; i++) b.sphere(0.18 + i * 0.05, i % 2 ? 0xd8d4dc : 0xf2eef4, { p: [i * 0.16, Math.sin(i * 1.7) * 0.1, Math.cos(i * 2.3) * 0.12] }, 9, 7);
  return b.geometry();
});
const flashGeo = () => cached('cannon:flash', () => new Build().add(puffyStarGeo(0.45, 0.2, 0.08, 0.02, 7), 0xffe070).geometry());

function buildCannon() {
  const root = new THREE.Group();
  const base = mesh(cannonBaseGeo(), vcol(0.45), {}, true);
  const turret = joint([0, 1.06, 0]);
  const yoke = mesh(cannonYokeGeo(), vcol(0.6), {}, true);
  const pivot = joint([0, 0.42, 0]);
  const recoil = joint();
  const barrelMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.25, emissive: 0x000000 });
  const barrel = mesh(cannonBarrelGeo(), barrelMat, {}, true);
  const spark = glowSprite(0xffb040, 0.5, 0.9);
  spark.position.set(-0.78, 0.12, 0);
  const flash = mesh(flashGeo(), basic('cannonFlash', { color: 0xfff0a0, transparent: true, opacity: 0.95, depthWrite: false }), { p: [1.3, 0, 0], r: [0, Math.PI / 2, 0] });
  const smoke = mesh(smokeGeo(), basic('cannonSmoke', { color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.75, depthWrite: false }), { p: [1.4, 0, 0] });
  recoil.add(barrel, spark, flash, smoke);
  pivot.add(recoil);
  turret.add(yoke, pivot);
  root.add(base, turret);
  const clk = new Clock();
  let aim = 0.5;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    const p = clamp(st.progress ?? clk.age, 0, 1);
    aim = damp(aim, st.aim ?? 0.5, 8, dt);
    pivot.rotation.z = aim;
    const charge = anim === 'charge', fire = anim === 'fire';
    recoil.position.x = fire ? -0.35 * Math.max(0, 1 - p * 2.2) : 0;
    recoil.position.y = charge ? Math.sin(t * 70) * 0.015 * p : 0;
    turret.scale.setScalar(charge ? 1 + Math.sin(t * 30) * 0.012 * p : 1);
    spark.visible = charge;
    spark.scale.setScalar(0.35 + p * 0.5 + Math.abs(Math.sin(t * 25)) * 0.15);
    barrelMat.emissive.setRGB(charge ? 0.35 * p : 0, charge ? 0.08 * p : 0, 0);
    flash.visible = fire && p < 0.35;
    flash.scale.setScalar(0.6 + p * 2.4);
    flash.rotation.x = t * 6;
    smoke.visible = fire && p < 0.95;
    smoke.position.x = 1.3 + p * 0.9;
    smoke.scale.setScalar(0.6 + p * 1.6);
    smoke.material.opacity = 0.75 * (1 - p);
  };
  const model = makeModel('bomb_cannon', root, update, [barrelMat], { initial: 'idle' });
  const tip = new THREE.Vector3(1.15, 0, 0);
  model.muzzle = (out = new THREE.Vector3()) => { root.updateMatrixWorld(true); return out.copy(tip).applyMatrix4(barrel.matrixWorld); };
  return model;
}

// =============================================================================================
// Rettungskäfig
// =============================================================================================

const RC = { gold: 0xffc21a, goldDark: 0xc8901a, base: 0x7a3a8a, baseTop: 0xa05ab0, lock: 0xffd84a };
const BARS = 16, R = 0.72, H = 1.35;

function cageFixedGeo() {
  return cached('cage:fixed', () => {
    const b = new Build();
    b.cyl(0.92, 0.98, 0.32, { v: (x, y) => (y > 0 ? RC.baseTop : RC.base) }, { p: [0, 0.16, 0] }, 24);
    b.torus(0.9, 0.05, RC.gold, { p: [0, 0.32, 0], r: [Math.PI / 2, 0, 0] }, 6, 28);
    b.torus(R, 0.04, RC.gold, { p: [0, 0.36, 0], r: [Math.PI / 2, 0, 0] }, 6, 28);
    b.torus(R, 0.04, RC.gold, { p: [0, 0.36 + H, 0], r: [Math.PI / 2, 0, 0] }, 6, 28);
    // Kuppel aus Bögen + Griffring
    for (let i = 0; i < 4; i++) b.torus(R, 0.03, RC.goldDark, { p: [0, 0.36 + H, 0], r: [0, (i / 4) * Math.PI, 0] }, 5, 20, Math.PI);
    b.torus(0.14, 0.035, RC.gold, { p: [0, 0.36 + H + R + 0.1, 0] }, 6, 16);
    // feste Stäbe (vorn bleibt die Tür frei: Winkel −45° … 45° um +X)
    for (let i = 0; i < BARS; i++) {
      const a = (i / BARS) * TAU;
      if (Math.cos(a) > 0.72) continue;
      b.cyl(0.028, 0.028, H, RC.gold, { p: [Math.cos(a) * R, 0.36 + H / 2, Math.sin(a) * R] }, 6);
    }
    return b.geometry();
  });
}
function cageDoorGeo() {
  return cached('cage:door', () => {
    const b = new Build();
    // Tür: Stäbe des vorderen Bogens, Scharnier bei Winkel −45° (lokal: Drehpunkt im Ursprung)
    const a0 = -Math.PI / 4;
    const hx = Math.cos(a0) * R, hz = Math.sin(a0) * R;
    for (let i = 0; i < BARS; i++) {
      const a = (i / BARS) * TAU;
      if (Math.cos(a) <= 0.72) continue;
      b.cyl(0.03, 0.03, H, RC.gold, { p: [Math.cos(a) * R - hx, H / 2, Math.sin(a) * R - hz] }, 6);
    }
    b.box(0.06, 0.06, 1.0, RC.goldDark, { p: [R * 0.99 - hx, 0.06, -hz] }, 0.02, 1);
    b.box(0.06, 0.06, 1.0, RC.goldDark, { p: [R * 0.99 - hx, H - 0.06, -hz] }, 0.02, 1);
    // Vorhängeschloss
    b.box(0.2, 0.22, 0.12, RC.lock, { p: [R + 0.05 - hx, H * 0.5, 0.2 - hz] }, 0.04, 2);
    b.torus(0.07, 0.022, 0xb8c0cc, { p: [R + 0.05 - hx, H * 0.5 + 0.14, 0.2 - hz], r: [0, Math.PI / 2, 0] }, 6, 12, Math.PI);
    return b.geometry();
  });
}

function buildRescueCage() {
  const root = new THREE.Group();
  root.add(mesh(cageFixedGeo(), vcol(0.3), {}, true));
  const a0 = -Math.PI / 4;
  const hinge = joint([Math.cos(a0) * R, 0.36, Math.sin(a0) * R]);
  hinge.add(mesh(cageDoorGeo(), vcol(0.3), {}, true));
  root.add(hinge);
  let open = 0;
  const update = (dt, st) => {
    open = damp(open, clamp(st.open ?? 0, 0, 1), 6, dt);
    hinge.rotation.y = open * 1.9;
  };
  return makeModel('rescue_cage', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Landeanzeige
// =============================================================================================

function markerGeo() {
  return cached('bossmarker', () => {
    const b = new Build();
    b.torus(0.75, 0.07, 0xff3030, { r: [Math.PI / 2, 0, 0] }, 6, 32);
    b.torus(0.42, 0.045, 0xffe040, { r: [Math.PI / 2, 0, 0] }, 6, 24);
    for (let i = 0; i < 4; i++) b.box(0.42, 0.03, 0.08, 0xff3030, { p: [Math.cos(i * TAU / 4) * 0.9, 0, Math.sin(i * TAU / 4) * 0.9], r: [0, -i * TAU / 4, 0] }, 0.01, 1);
    return b.geometry();
  });
}
function buildMarker() {
  const root = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
  const m = mesh(markerGeo(), mat, { p: [0, 0.03, 0] });
  m.renderOrder = 3;
  root.add(m);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'on');
    const k = clamp(st.k ?? 0, 0, 1);
    m.scale.setScalar(1.25 - k * 0.35 + Math.sin(clk.t * 14) * 0.05);
    m.rotation.y = clk.t * 2.2;
    mat.opacity = 0.55 + k * 0.4;
  };
  return makeModel('boss_marker', root, update, [mat]);
}

export const MODELS = {
  bomb_cannon: buildCannon,
  rescue_cage: buildRescueCage,
  boss_marker: buildMarker,
};
