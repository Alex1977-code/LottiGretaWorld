// Endgegner Welt 1 (Kurs-Modus): Baron Brummbär im roten Oldtimer-Roadster und seine Kickbomben.
// Eigene Gestaltung. Maßstab Meter, Ursprung = Fußpunkt (mit Auto: Mitte der Bodenfläche des Autos),
// Blick nach +X; state darf ein String sein ('drive' ≙ { anim: 'drive' }).
//
// baron_brummbaer  Grimmiger brauner Bär (≈2,6 m stehend) mit schwarzem Zylinder (rotes Band), goldenem
//   Monokel mit Kette, gezwirbeltem Schnurrbart, violetter Weste mit Goldknöpfen und roter Fliege.
//   Mit Auto: roter Roadster im Stil der 30er (4,7 × 2,3 m, Kopf ≈ 2,9 m, Hutspitze ≈ 3,4 m): lange Haube mit
//   Tatzen-Emblem, Chromgrill, Weißwandreifen, goldene Radkappen, Zierstreifen.
//   opts  { withCar: true|false (Standard true) }
//   state { anim: 'drive'|'throw'|'hit'|'stunned'|'defeated'|'idle', speed (m/s, Räder), steer (-1..1),
//           progress? (0..1 für throw, sonst Zeit seit Zustandswechsel) }
//         throw: 1,0 s – ausholen mit Bombe in der rechten Tatze (0–0,45), Wurf; die Bombe verlässt die
//                Tatze bei progress 0,5 (0,5 s) → dann Kickbombe im Motor erzeugen (Position: model.hand()).
//         hit: Hut fliegt hoch, Augen zu, Aufleuchten (0,6 s; progress 0..1 überschreibt die Zeit);
//         stunned: Schwindel-Sterne, wankt;
//         defeated: sackt zusammen, Hut liegt schief, Auto qualmt, Räder stehen.
//   model.hand(out?: Vector3) → Weltposition der Bombe in der Wurf-Tatze.
// kickbombe        ≈0,72 m  runde indigoblaue Bombe mit Goldgürtel, Metallkragen, Zündschnur mit Funken,
//   großen Augen und orangen Füßchen.
//   state { anim: 'walk'|'idle'|'lit'|'kicked', speed (walk: Schrittfrequenz; kicked: Rollgeschwindigkeit
//           in m/s, Standard 8), fuse (0..1 optional: wie weit die Lunte abgebrannt ist) }
//         lit: blinkt rot (schneller je weiter fuse), zittert, Funke groß; kicked: Füße eingezogen, rollt vorwärts.

import {
  THREE, TAU, Build, cached, vcol, basic, mesh, joint, eyes, dizzyStars, makeModel, Clock, Blinker, damp, clamp, col,
  mix, onEllipsoid, decals, smoothstep, glowSprite, instMesh, setInst, puffyStarGeo,
} from '../lib/kit.js';

// =============================================================================================
// Kickbombe
// =============================================================================================

const KB = { body: 0x2c3274, band: 0xffc21a, collar: 0xb8c0d8, fuse: 0xc89a5a, foot: 0xff9a1a, spark: 0xffe24a, mouth: 0x15102a };
function bombBodyGeo() {
  return cached('bomb:body', () => {
    const b = new Build();
    b.sphere(0.3, KB.body, { p: [0, 0.38, 0] }, 26, 18);
    b.torus(0.3, 0.035, KB.band, { p: [0, 0.38, 0], r: [Math.PI / 2, 0, 0] }, 8, 36);
    // Gürtelschnalle hinten, Kragen oben, Zündschnur
    b.box(0.06, 0.12, 0.14, KB.band, { p: [-0.31, 0.38, 0] }, 0.02, 1);
    b.cyl(0.11, 0.13, 0.08, KB.collar, { p: [0, 0.69, 0] }, 16);
    b.tube([[0, 0.7, 0], [0.01, 0.8, 0], [-0.04, 0.88, 0.02], [-0.02, 0.94, 0.04]], 0.022, KB.fuse, null, 12, 6);
    // kleiner Mund
    b.torus(0.04, 0.012, KB.mouth, { p: [0.29, 0.3, 0], r: [0, Math.PI / 2, Math.PI] }, 6, 10, Math.PI);
    return b.geometry();
  });
}
const bombFootGeo = () => cached('bomb:foot', () => new Build().sphere(1, KB.foot, { s: [0.12, 0.065, 0.09] }, 14, 8).geometry());
const sparkGeo = () => cached('bomb:spark', () => new Build().add(puffyStarGeo(0.06, 0.025, 0.03, 0.01, 6), 0xfff6a0).geometry());

function buildKickbombe() {
  const root = new THREE.Group();
  const roll = joint([0, 0.38, 0]);
  const inner = joint([0, -0.38, 0]);
  const bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.22, emissive: 0x000000 });
  const body = mesh(bombBodyGeo(), bodyMat, {}, true);
  const eye = eyes([{ p: [0.24, 0.45, 0.085], r: 0.07, sy: 1.3, dir: [1, 0.05, 0.45] }, { p: [0.24, 0.45, -0.085], r: 0.07, sy: 1.3, dir: [1, 0.05, -0.45] }],
    { key: 'bomb', iris: 0x2a2a6a, pupil: 0.58, depth: 0.55 });
  const spark = mesh(sparkGeo(), basic('bombSpark', { color: KB.spark }), { p: [-0.02, 0.96, 0.04] });
  const glow = glowSprite(0xffb030, 0.35, 0.85); glow.position.copy(spark.position);
  inner.add(body, eye, spark, glow);
  roll.add(inner);
  const feet = [1, -1].map((s) => joint([0.02, 0.06, s * 0.13], mesh(bombFootGeo(), vcol(0.4), {}, true)));
  root.add(roll, ...feet);
  const clk = new Clock(), blink = new Blinker();
  let phase = Math.random() * TAU, rollA = 0, tuck = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'walk';
    clk.tick(dt, anim);
    const t = clk.t;
    const walking = anim === 'walk' || (anim === 'lit' && (st.speed ?? 0) > 0.2);
    if (walking) phase += dt * (8 + (st.speed ?? 1.2) * 4);
    const kicked = anim === 'kicked', lit = anim === 'lit';
    tuck = damp(tuck, kicked ? 1 : 0, 14, dt);
    if (kicked) rollA -= dt * (st.speed ?? 8) / 0.32; else rollA = damp(rollA, Math.round(rollA / TAU) * TAU, 6, dt);
    roll.rotation.z = rollA;
    const sw = walking ? Math.sin(phase) : 0;
    roll.position.y = 0.38 + (walking ? Math.abs(sw) * 0.04 : 0) + (kicked ? 0.0 : 0);
    roll.rotation.x = walking ? sw * 0.08 : 0;
    const shake = lit ? 0.02 : 0;
    roll.position.x = Math.sin(t * 50) * shake; roll.position.z = Math.cos(t * 43) * shake;
    feet.forEach((f, i) => {
      const ph = phase + i * Math.PI;
      f.position.x = 0.02 + (walking ? Math.sin(ph) * 0.09 : 0);
      f.position.y = 0.06 + (walking ? Math.max(0, Math.cos(ph)) * 0.05 : 0) + tuck * 0.15;
      f.scale.setScalar(Math.max(0.001, 1 - tuck));
      f.visible = tuck < 0.98;
    });
    // Funke und Rot-Blinken
    const fuse = clamp(st.fuse ?? (lit ? clamp(clk.age / 3, 0, 1) : 0), 0, 1);
    const rate = lit ? 3 + fuse * 9 : 0;
    const on = lit && Math.sin(t * rate * TAU) > 0;
    bodyMat.emissive.setRGB(on ? 0.9 : 0, on ? 0.05 : 0, on ? 0.05 : 0);
    const sp = (lit ? 1.6 : 1) * (0.8 + Math.abs(Math.sin(t * 23)) * 0.4);
    spark.scale.setScalar(sp); spark.rotation.z = t * 9;
    spark.position.y = 0.96 - fuse * 0.2;
    glow.position.y = spark.position.y;
    glow.scale.setScalar(0.35 * sp);
    let bk = blink.update(dt);
    if (kicked) bk = 0.15; else if (lit) bk = 1;
    eye.userData.blink(bk);
    eye.scale.setScalar(lit ? 1.15 : 1);
  };
  return makeModel('kickbombe', root, update, [bodyMat], { initial: 'walk' });
}

// =============================================================================================
// Baron Brummbär
// =============================================================================================

const BB = {
  fur: 0x7a4a2a, furDark: 0x5a3218, muzzle: 0xe2ba8c, nose: 0x1a1210, stache: 0x2e1a0e, vest: 0x5a2a86, shirt: 0xfff8ee,
  bow: 0xe0262a, button: 0xffc21a, hat: 0x1e1a26, band: 0xe0262a, monocle: 0xffc21a, glass: 0xcfefff, ink: 0x1a0e08,
  car: 0xe8202a, carDark: 0xa8141c, chrome: 0xe6eaf2, trim: 0xffd23a, seat: 0x6a1a1a, tire: 0x1e1e24, wall: 0xf4f4f0, lamp: 0xfff6c8, glassW: 0xbfe8ff,
};

/** Bär-Rumpf + Kopf (Ursprung = Sitz-/Hüftpunkt). */
function bearGeo() {
  return cached('bear:body', () => {
    const b = new Build();
    // Weste mit Hemdbrust (V) und Fell an Schultern
    const vest = { v: (x, y, z, nx, ny) => {
      const front = nx > 0.25 && Math.abs(z) < 0.32 * (y - 0.15) + 0.04 ? 1 : 0;
      return front ? col(BB.shirt) : ny > 0.75 ? col(BB.fur) : col(BB.vest);
    } };
    b.sphere(1, vest, { p: [0, 0.6, 0], s: [0.5, 0.62, 0.6] }, 28, 20);
    b.sphere(1, BB.fur, { p: [0, 1.12, 0], s: [0.36, 0.2, 0.42] }, 18, 10);
    // Fliege, Knöpfe
    b.sphere(1, BB.bow, { p: [0.4, 1.06, 0.1], s: [0.08, 0.08, 0.12] }, 10, 8);
    b.sphere(1, BB.bow, { p: [0.4, 1.06, -0.1], s: [0.08, 0.08, 0.12] }, 10, 8);
    b.sphere(0.05, BB.bow, { p: [0.44, 1.06, 0] }, 8, 6);
    for (let i = 0; i < 3; i++) {
      const hit = onEllipsoid([0, 0.6, 0], [0.5, 0.62, 0.6], 0.42, -0.05 - i * 0.25);
      decals(b, [{ ...hit, r: 0.04 }], 0.04, BB.button, 0.5);
    }
    // Kopf
    const HC = [0.12, 1.48, 0], HRr = [0.44, 0.41, 0.46];
    b.sphere(1, BB.fur, { p: HC, s: HRr }, 26, 20);
    b.sphere(1, BB.muzzle, { p: [0.47, 1.36, 0], s: [0.2, 0.17, 0.25] }, 20, 14);
    b.sphere(1, BB.nose, { p: [0.65, 1.43, 0], s: [0.09, 0.07, 0.11] }, 14, 10);
    for (const s of [1, -1]) {
      b.sphere(0.15, BB.fur, { p: [0.0, 1.82, s * 0.36] }, 14, 10);
      b.sphere(1, BB.muzzle, { p: [0.08, 1.82, s * 0.37], s: [0.04, 0.09, 0.09] }, 12, 8);
      // gezwirbelter Schnurrbart
      b.tube([[0.64, 1.35, s * 0.02], [0.66, 1.32, s * 0.16], [0.6, 1.33, s * 0.3], [0.56, 1.42, s * 0.36], [0.6, 1.47, s * 0.32]], 0.045, BB.stache, null, 20, 8);
      b.sphere(0.035, BB.stache, { p: [0.6, 1.47, s * 0.32] }, 8, 6);
      // finstere Brauen
      b.box(0.08, 0.06, 0.24, BB.ink, { p: [0.5, 1.68, s * 0.17], r: [s * 0.5, -s * 0.3, 0], order: 'YXZ' }, 0.025, 1);
    }
    // Mund (grimmig) unter dem Bart
    b.torus(0.07, 0.016, BB.ink, { p: [0.6, 1.24, 0], r: [0, Math.PI / 2, 0] }, 6, 12, Math.PI);
    // Monokel (rechtes Auge, +Z): Goldring, Glas, Kette zur Weste
    b.torus(0.105, 0.018, BB.monocle, { p: [0.52, 1.56, 0.17], r: [0, Math.PI / 2 - 0.45, 0] }, 8, 24);
    b.tube([[0.5, 1.47, 0.24], [0.5, 1.25, 0.32], [0.45, 1.05, 0.36], [0.42, 0.85, 0.34]], 0.01, BB.monocle, null, 16, 4);
    return b.geometry();
  });
}
function bearHatGeo() {
  return cached('bear:hat', () => {
    const b = new Build();
    b.cyl(0.47, 0.47, 0.04, BB.hat, { p: [0, 0.02, 0], s: [1, 1, 0.92] }, 28);
    b.torus(0.47, 0.025, BB.hat, { p: [0, 0.035, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.92, 1] }, 6, 28);
    b.cyl(0.29, 0.27, 0.56, BB.hat, { p: [0, 0.32, 0] }, 24);
    b.cyl(0.28, 0.28, 0.1, BB.band, { p: [0, 0.1, 0], s: [1.02, 1, 1.02] }, 24);
    b.cyl(0.3, 0.3, 0.02, 0x2e2a36, { p: [0, 0.6, 0] }, 24);
    return b.geometry();
  });
}
function bearArmGeo() {
  return cached('bear:arm', () => {
    const b = new Build();
    b.cyl(0.15, 0.13, 0.42, BB.vest, { p: [0, -0.18, 0] }, 14);
    b.torus(0.13, 0.03, BB.shirt, { p: [0, -0.39, 0], r: [Math.PI / 2, 0, 0] }, 6, 14);
    b.sphere(0.17, BB.fur, { p: [0.02, -0.52, 0] }, 16, 12);
    b.sphere(1, BB.muzzle, { p: [0.12, -0.56, 0], s: [0.07, 0.08, 0.1] }, 10, 8);
    return b.geometry();
  });
}
function bearLegsGeo() {
  return cached('bear:legs', () => {
    const b = new Build();
    for (const s of [1, -1]) {
      b.capsule(0.19, 0.3, BB.fur, { p: [0.02, 0.36, s * 0.27] }, 4, 12);
      b.sphere(1, BB.furDark, { p: [0.12, 0.09, s * 0.28], s: [0.26, 0.1, 0.18] }, 14, 10);
    }
    return b.geometry();
  });
}

function carGeo() {
  return cached('car:body', () => {
    const b = new Build();
    const side = { v: (x, y, z, nx, ny) => mix(BB.carDark, BB.car, smoothstep((ny + 0.4) / 0.9)) };
    // Wanne, lange Haube, Heck, Kotflügel
    b.box(3.9, 0.62, 1.86, side, { p: [0.15, 0.72, 0] }, 0.22, 2);
    b.box(1.75, 0.34, 1.38, BB.car, { p: [1.45, 1.12, 0] }, 0.14, 2);
    b.box(1.2, 0.46, 1.8, BB.car, { p: [-1.45, 1.1, 0] }, 0.22, 2);
    for (const [x, s] of [[1.55, 1], [1.55, -1], [-1.35, 1], [-1.35, -1]]) {
      const g = new THREE.CylinderGeometry(0.58, 0.58, 0.5, 20, 1, false, 0, Math.PI);
      b.add(g, BB.car, { p: [x, 0.52, s * 0.98], r: [Math.PI / 2, 0, Math.PI / 2], order: 'ZYX' });
    }
    // Zierstreifen, Chrom-Mittelleiste, Stoßstangen, Grill mit Stäben, Scheinwerfer
    for (const s of [1, -1]) b.box(3.6, 0.07, 0.02, BB.trim, { p: [0.15, 0.86, s * 0.935] }, 0, 1);
    b.box(1.7, 0.03, 0.08, BB.chrome, { p: [1.45, 1.29, 0] }, 0.012, 1);
    b.box(0.14, 0.12, 2.0, BB.chrome, { p: [2.18, 0.45, 0] }, 0.05, 1);
    b.box(0.14, 0.12, 2.0, BB.chrome, { p: [-2.12, 0.5, 0] }, 0.05, 1);
    b.box(0.12, 0.6, 0.95, BB.chrome, { p: [2.32, 0.92, 0] }, 0.06, 2);
    for (let i = -3; i <= 3; i++) b.box(0.03, 0.48, 0.035, 0x6a6e7a, { p: [2.385, 0.92, i * 0.11] }, 0, 1);
    for (const s of [1, -1]) {
      b.cyl(0.17, 0.14, 0.16, BB.chrome, { p: [2.25, 1.2, s * 0.72], r: [0, 0, Math.PI / 2] }, 16);
      b.cyl(0.13, 0.13, 0.02, BB.lamp, { p: [2.335, 1.2, s * 0.72], r: [0, 0, Math.PI / 2] }, 16);
      b.cyl(0.05, 0.05, 0.5, BB.chrome, { p: [-2.15, 0.52, s * 0.6], r: [0, 0, Math.PI / 2] }, 10); // Auspuff
    }
    // goldenes Tatzen-Emblem vorn auf der Haube
    b.sphere(1, BB.trim, { p: [2.32, 1.32, 0], s: [0.05, 0.09, 0.1] }, 10, 8);
    for (const z of [-0.08, -0.03, 0.03, 0.08]) b.sphere(0.03, BB.trim, { p: [2.32, 1.43, z] }, 8, 6);
    // Sitzbank, Lenkrad, niedrige Windschutzscheibe
    b.box(0.35, 0.8, 1.5, BB.seat, { p: [-0.9, 1.35, 0], r: [0, 0, 0.12] }, 0.15, 2);
    b.box(0.9, 0.18, 1.5, BB.seat, { p: [-0.55, 1.05, 0] }, 0.08, 1);
    b.torus(0.2, 0.03, 0x2a2a2a, { p: [0.36, 1.42, 0.0], r: [0, Math.PI / 2, 0], s: [1, 1, 1] }, 6, 20);
    b.cyl(0.03, 0.03, 0.4, 0x2a2a2a, { p: [0.48, 1.3, 0], r: [0, 0, 0.9] }, 6);
    b.box(0.05, 0.36, 1.5, BB.glassW, { p: [0.58, 1.48, 0], r: [0, 0, 0.35] }, 0.02, 1);
    b.box(0.07, 0.06, 1.56, BB.chrome, { p: [0.65, 1.66, 0], r: [0, 0, 0.35] }, 0.02, 1);
    return b.geometry();
  });
}
function wheelGeo() {
  return cached('car:wheel', () => {
    const b = new Build();
    b.cyl(0.46, 0.46, 0.34, BB.tire, { r: [Math.PI / 2, 0, 0] }, 24);
    for (const s of [1, -1]) {
      b.cyl(0.33, 0.33, 0.02, BB.wall, { p: [0, 0, s * 0.172], r: [Math.PI / 2, 0, 0] }, 24);
      b.cyl(0.22, 0.22, 0.03, BB.trim, { p: [0, 0, s * 0.18], r: [Math.PI / 2, 0, 0] }, 16);
      b.sphere(1, BB.trim, { p: [0, 0, s * 0.19], s: [0.12, 0.12, 0.06] }, 12, 6);
      for (let i = 0; i < 5; i++) b.box(0.06, 0.2, 0.02, BB.chrome, { p: [Math.cos(i * 1.2566) * 0.14, Math.sin(i * 1.2566) * 0.14, s * 0.2], r: [0, 0, i * 1.2566 + Math.PI / 2] }, 0, 1);
    }
    return b.geometry();
  });
}
const smokeGeo = () => cached('car:smoke', () => {
  const b = new Build();
  for (let i = 0; i < 5; i++) b.sphere(0.14 + i * 0.05, i % 2 ? 0x6a6a72 : 0x8a8a92, { p: [i * 0.12, i * 0.3, Math.sin(i * 2) * 0.12] }, 10, 8);
  return b.geometry();
});
const WHEELS = [[1.55, 0.46, 1.02], [1.55, 0.46, -1.02], [-1.35, 0.46, 1.02], [-1.35, 0.46, -1.02]];

function buildBaron(opts = {}) {
  const withCar = opts.withCar !== false;
  const root = new THREE.Group();
  const flash = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.48, emissive: 0x000000 });
  const own = [flash];
  // Auto
  const car = joint();
  let wheels = null, smoke = null;
  if (withCar) {
    const carBody = mesh(carGeo(), vcol(0.28, {}, 'car'), {}, true);
    wheels = instMesh(wheelGeo(), vcol(0.5), 4, 3, 0.8);
    wheels.castShadow = true;
    smoke = mesh(smokeGeo(), basic('smoke', { color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false }), { p: [1.6, 1.4, 0] });
    car.add(carBody, wheels, smoke);
  }
  // Bär (Ursprung = Sitzpunkt)
  const bear = joint(withCar ? [-0.45, 0.95, 0] : [0, 0.55, 0]);
  const body = joint();
  const torso = mesh(bearGeo(), flash, {}, true);
  const eye = eyes([{ p: [0.51, 1.56, 0.17], r: 0.075, sy: 1.0, dir: [1, 0.05, 0.42] }, { p: [0.51, 1.56, -0.17], r: 0.075, sy: 1.0, dir: [1, 0.05, -0.42] }],
    { key: 'bear', iris: 0x8a2a14, pupil: 0.45, depth: 0.5 });
  const hat = mesh(bearHatGeo(), vcol(0.35), { p: [0.04, 1.84, 0], r: [0.08, 0, -0.12] }, true);
  const armL = joint([0.08, 1.0, -0.62], mesh(bearArmGeo(), flash, {}, true));
  const armR = joint([0.08, 1.0, 0.62], mesh(bearArmGeo(), flash, {}, true));
  const bomb = mesh(bombBodyGeo(), vcol(0.25), { p: [0.05, -0.85, 0], s: 0.85 });
  armR.add(bomb);
  const dizzy = dizzyStars(0.55, 0.12); dizzy.position.set(0.1, 2.05, 0);
  body.add(torso, eye, hat, armL, armR, dizzy);
  bear.add(body);
  if (!withCar) bear.add(mesh(bearLegsGeo(), flash, { p: [0, -0.55, 0] }, true));
  car.add(bear);
  root.add(car);

  const clk = new Clock(), blink = new Blinker();
  let spinA = 0, slump = 0, hatPop = 0, steer = 0;
  const hatHome = new THREE.Vector3(0.04, 1.84, 0);
  const update = (dt, st) => {
    const anim = st.anim ?? (withCar ? 'drive' : 'idle');
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    const defeated = anim === 'defeated';
    const speed = defeated ? 0 : (st.speed ?? (anim === 'drive' || anim === 'throw' ? 8 : 0));
    // Auto: Federn, Räder, Lenken
    if (withCar) {
      spinA -= dt * speed / 0.46;
      steer = damp(steer, clamp(st.steer ?? 0, -1, 1) * 0.4, 6, dt);
      WHEELS.forEach(([x, y, z], i) => setInst(wheels, i, x, y, z, 0, i < 2 ? steer : 0, spinA));
      wheels.instanceMatrix.needsUpdate = true;
      car.position.y = speed > 0.5 ? Math.abs(Math.sin(t * 9)) * 0.03 : 0;
      car.rotation.x = speed > 0.5 ? Math.sin(t * 7) * 0.012 - steer * 0.05 : defeated ? 0.04 : 0;
      car.rotation.z = defeated ? -0.05 : 0;
      smoke.visible = defeated || anim === 'stunned';
      smoke.position.y = 1.4 + ((t * 0.6) % 0.4);
      smoke.scale.setScalar(0.8 + ((t * 0.6) % 0.4));
    }
    // Bär: Haltung
    slump = damp(slump, defeated ? 1 : 0, 3, dt);
    const hitAge = anim === 'hit' ? (st.progress !== undefined ? clamp(st.progress, 0, 1) * 0.6 : age) : 1;
    body.rotation.z = slump * -0.35 + (anim === 'hit' ? Math.max(0, 0.4 - hitAge) * 0.9 : 0) + (anim === 'throw' ? 0.08 : 0);
    body.rotation.x = anim === 'stunned' ? Math.sin(t * 4) * 0.12 : speed > 0.5 ? Math.sin(t * 7) * 0.03 : 0;
    body.rotation.y = anim === 'drive' ? Math.sin(t * 0.7) * 0.2 * clamp(Math.sin(t * 0.23) * 3, -1, 1) : 0;
    body.position.y = -slump * 0.25 + (speed > 0.5 ? Math.abs(Math.sin(t * 9 + 0.5)) * 0.02 : 0);
    // Arme: Lenkrad halten, werfen, hängen
    let rz = withCar ? 0.95 : 0.15, lz = withCar ? 0.95 : 0.15, rx = 0.15, lx = -0.15;
    let bombOn = false;
    if (anim === 'throw') {
      const p = st.progress ?? clamp(age / 1.0, 0, 1);
      if (p < 0.45) { const k = smoothstep(p / 0.45); rz = 0.95 - k * 3.6; rx = 0.15 + k * 0.4; bombOn = true; }
      else if (p < 0.6) { const k = smoothstep((p - 0.45) / 0.15); rz = -2.65 + k * 4.4; rx = 0.55 - k * 0.3; bombOn = p < 0.5; }
      else { const k = smoothstep((p - 0.6) / 0.4); rz = 1.75 - k * 0.8; rx = 0.25 - k * 0.1; }
    } else if (anim === 'hit') { rz = 2.2; lz = 2.2; rx = 0.8; lx = -0.8; }
    else if (anim === 'stunned') { rz = 0.3 + Math.sin(t * 5) * 0.3; lz = 0.3 + Math.cos(t * 5) * 0.3; rx = 0.4; lx = -0.4; }
    else if (defeated) { rz = 0.6; lz = 0.6; rx = 0.1; lx = -0.1; }
    else if (anim === 'drive' && withCar) { rz += Math.sin(t * 2.4) * 0.08 + steer * 0.4; lz += -Math.sin(t * 2.4) * 0.08 - steer * 0.4; }
    armR.rotation.z = damp(armR.rotation.z, rz, anim === 'throw' ? 30 : 10, dt);
    armR.rotation.x = damp(armR.rotation.x, rx, 12, dt);
    armL.rotation.z = damp(armL.rotation.z, lz, 10, dt);
    armL.rotation.x = damp(armL.rotation.x, lx, 12, dt);
    bomb.visible = bombOn;
    // Hut: fliegt bei Treffer hoch, liegt bei Niederlage schief
    hatPop = anim === 'hit' ? clamp(hitAge / 0.6, 0, 1) : 0;
    const hy = anim === 'hit' ? Math.sin(hatPop * Math.PI) * 0.9 : 0;
    hat.position.set(hatHome.x - slump * 0.12, hatHome.y + hy - slump * 0.06, hatHome.z + slump * 0.2);
    hat.rotation.set(0.08 + slump * 0.5, anim === 'hit' ? hatPop * TAU : 0, -0.12 - slump * 0.4);
    // Gesicht, Aufleuchten
    const hitK = anim === 'hit' ? Math.max(0, 1 - hitAge / 0.6) * (Math.sin(hitAge * 40) > 0 ? 1 : 0.25) : 0;
    flash.emissive.setRGB(hitK, hitK * 0.85, hitK * 0.8);
    let bk = blink.update(dt);
    if (anim === 'hit' || defeated) bk = 0.12; else if (anim === 'stunned') bk = 0.4; else if (anim === 'throw') bk = 0.8;
    eye.userData.blink(bk);
    dizzy.visible = anim === 'stunned';
    dizzy.rotation.y = t * 3.5;
  };
  const model = makeModel('baron_brummbaer', root, update, own, { initial: withCar ? 'drive' : 'idle' });
  model.hand = (out = new THREE.Vector3()) => { root.updateMatrixWorld(true); return bomb.getWorldPosition(out); };
  return model;
}

export const MODELS = {
  baron_brummbaer: buildBaron,
  kickbombe: buildKickbombe,
};
