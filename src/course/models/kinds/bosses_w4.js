// Endgegner Welt 4 (Kurs-Modus): Lavafelsen-König (4-Burg). Eigene Gestaltung. Maßstab Meter, Ursprung = Fußpunkt,
// Blick nach +X; state darf ein String sein ('roll' ≙ { anim: 'roll' }).
//
// lavafelsen_koenig  ≈3,0 m (mit Krone)  riesiger Basalt-Fels-König: klumpiger Felskörper (Ø ≈2,3 m) mit zähflüssiger
//   Lavahaube, goldene Zackenkrone mit Rubinkugeln und Edelsteinband, karminroter Umhang mit Goldsaum und Hermelinkragen,
//   große grimmige Bernsteinaugen unter wuchtigen Steinbrauen, Steinnase, glühender gezwirbelter Lava-Schnurrbart,
//   glühendes Grinsen mit zwei Steinhauern, Steinfäuste und Steinfüße. Glut-Risse nehmen mit sinkendem hp zu.
//   state { anim: 'idle'|'roll'|'summon'|'hit'|'spin'|'defeated', hp (3..0, Standard 3), speed (roll, m/s; Standard 5),
//           roll? (Drehwinkel in rad, überschreibt die eigene Drehung), progress? (0..1 für hit, sonst Zeit) }
//         idle: atmet, Lava brodelt, Fäuste wippen; roll: rollt als Felskugel (Mitte y = 1,12) um −z nach +X, Füße
//         und Fäuste eingezogen, Umhang weg, die Krone schwebt mitwandernd über der Kugel, Funkenschweif;
//         summon: reißt die Fäuste hoch, Lava schießt hoch (Funken), Krone glüht – ruft Lavabrocken (Motor);
//         hit: 0,6 s Aufblitzen, Stauchung, Augen zu, Risse glühen grell;
//         spin: wirbelt um die Hochachse (≈ 2 U/s) mit ausgestreckten Fäusten und verstreut Funken (Motor: Feuerbrocken);
//         defeated: kühlt ab (Glut erlischt), sackt nach hinten, Augen zu, die Krone kippt herunter.
//   root.userData.radius → Körperradius (≈1,15 m, Trefferkugel um y = 1,3).  model.top(out?) → Weltposition der Krone.

import {
  THREE, TAU, Build, cached, vcol, mesh, joint, eyes, makeModel, Clock, Blinker, damp, clamp, mix, smoothstep, instMesh,
  setInst, glowSprite, placed, puffyStarGeo,
} from '../lib/kit.js';
import { Puffs, stick } from '../lib/kit_w3.js';
import { LAVA, lumpyEllipsoid, lumpyPoint, addCracks, displace, noise3, axisY } from '../lib/w4Geos.js';

const KB = { rad: [1.15, 1.08, 1.1], amp: 0.07, freq: 1.6, seed: 4.2, c: [0, 0, 0] };
const CY = 1.3;           // Körpermitte
const ROLL_Y = 1.12;      // Kugelmitte beim Rollen
const KC = { gold: 0xffc21a, goldHi: 0xfff0a0, goldLow: 0xc88a10, ruby: 0xe8203a, sapphire: 0x2a6aff, emerald: 0x22c86a, velvet: 0xb0102a, cape: 0xc8142e, capeLow: 0x7a0a1e, ermine: 0xfffaf2, spot: 0x1a1a22, tooth: 0xe8dcc8 };

function kingBodyGeo() {
  return cached('w4:king:body', () => {
    const b = new Build();
    b.add(lumpyEllipsoid(KB.rad, KB.amp, KB.freq, KB.seed, 40, 30), { v: (x, y, z, nx, ny) => {
      const ash = noise3(x * 2.4 + 9, y * 2.4, z * 2.4) > 0.64;
      const base = mix(LAVA.rockLow, LAVA.rockHi, smoothstep(ny * 0.5 + 0.45));
      return ash ? mix(base, LAVA.ash, 0.55) : base;
    } });
    const P = (az, el, lift = 0) => lumpyPoint(KB.rad, KB.amp, KB.freq, KB.seed, az, el, lift);
    // wuchtige Steinbrauen (schräg, grimmig)
    for (const s of [1, -1]) {
      const h = P(s * 0.33, 0.42, -0.04);
      b.add(displace(new THREE.CapsuleGeometry(0.11, 0.38, 4, 10), 0.02, 5, 3 + s, true), { v: (x, y, z, nx, ny) => mix(LAVA.rockLow, LAVA.rockHi, smoothstep(ny * 0.5 + 0.5)) },
        { p: h.p.toArray(), r: [Math.PI / 2 + s * 0.38, -s * 0.42, 0], order: 'YXZ' });
    }
    // Steinnase
    const hn = P(0, 0.08, -0.06);
    b.add(displace(new THREE.SphereGeometry(0.19, 16, 12), 0.025, 6, 1.5, true), { v: (x, y, z, nx, ny) => mix(LAVA.rock, LAVA.rockHi, smoothstep(ny * 0.5 + 0.6)) }, { p: hn.p.toArray(), s: [1.1, 0.9, 1.05] });
    // zwei Steinhauer aus der Unterlippe nach oben
    for (const s of [1, -1]) {
      const h = P(s * 0.2, -0.36, 0.02);
      b.add(new THREE.ConeGeometry(0.075, 0.24, 9), { v: (x, y) => mix(0xb8a898, KC.tooth, smoothstep(y / 0.24 + 0.5)) }, axisY(h.p.clone().add(new THREE.Vector3(0.02, 0.1, 0)).toArray(), [0.25, 1, s * 0.08]));
    }
    return b.geometry();
  });
}
function kingGlowGeo() {
  return cached('w4:king:glow', () => {
    const b = new Build();
    // Lavahaube oben mit Tropfkante
    const cap = new THREE.SphereGeometry(1, 40, 10, 0, TAU, 0, Math.PI * 0.3);
    cap.scale(KB.rad[0] * 1.015, KB.rad[1] * 1.015, KB.rad[2] * 1.015);
    const cg = displace(cap, KB.amp, KB.freq, KB.seed, true);
    const Pp = cg.attributes.position;
    for (let i = 0; i < Pp.count; i++) {
      const x = Pp.getX(i), y = Pp.getY(i), z = Pp.getZ(i), a = Math.atan2(z, x);
      if (y < KB.rad[1] * 0.7) Pp.setY(i, y - Math.pow(Math.max(0, Math.sin(a * 5 + 0.4)), 3) * 0.22);
      const l = Math.hypot(x, y, z) || 1;
      Pp.setXYZ(i, Pp.getX(i) + (x / l) * 0.02, Pp.getY(i) + (y / l) * 0.02, Pp.getZ(i) + (z / l) * 0.02);
    }
    b.add(cg, { v: (x, y) => mix(LAVA.deep, mix(LAVA.hot, LAVA.white, smoothstep((y - 0.95) / 0.12)), smoothstep((y - 0.62) / 0.18)) });
    // Lava-Blasen oben
    for (let k = 0; k < 5; k++) {
      const a = k * 1.3 + 0.4, r = 0.25 + (k % 3) * 0.12;
      b.sphere(0.07 + (k % 2) * 0.04, LAVA.hotter, { p: [Math.cos(a) * r - 0.1, KB.rad[1] * 0.99 + 0.02, Math.sin(a) * r], s: [1, 0.6, 1] }, 10, 6);
    }
    // gezwirbelter Lava-Schnurrbart (Kugelketten, nach außen dünner, Enden nach oben gerollt)
    for (const s of [1, -1]) {
      // dichte Kugelkette entlang einer Kurve (Azimut u, Höhe v, Dicke r) → glatte, gezwirbelte Wurst
      const ctrl = [[0.02, -0.1, 0.13], [0.16, -0.14, 0.12], [0.32, -0.12, 0.1], [0.44, -0.05, 0.08], [0.5, 0.04, 0.06], [0.46, 0.09, 0.045], [0.41, 0.06, 0.035]];
      const curve = new THREE.CatmullRomCurve3(ctrl.map(([u, v, r]) => new THREE.Vector3(u, v, r)));
      for (let i = 0; i <= 26; i++) {
        const q = curve.getPoint(i / 26);
        const h = lumpyPoint(KB.rad, KB.amp, KB.freq, KB.seed, s * q.x, q.y, q.z * 0.45);
        b.sphere(q.z * 0.85, { v: (x, y) => mix(LAVA.hot, LAVA.white, smoothstep(y / q.z * 0.6 + 0.35)) }, { p: h.p.toArray(), s: [0.75, 0.8, 1] }, 10, 8);
      }
    }
    // glühendes Grinsen
    const hm = lumpyPoint(KB.rad, KB.amp, KB.freq, KB.seed, 0, -0.34, 0.01);
    const sh = new THREE.Shape();
    sh.moveTo(-1, 0.3); sh.quadraticCurveTo(0, 0.0, 1, 0.3); sh.quadraticCurveTo(0.9, -0.9, 0, -0.95); sh.quadraticCurveTo(-0.9, -0.9, -1, 0.3);
    const mg = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false, curveSegments: 10 });
    mg.translate(0, 0, -0.28);
    stick(b, hm, { v: (x, y) => mix(LAVA.deep, LAVA.hotter, smoothstep(y * 0.7 + 0.7)) }, [0.42, 0.24, 0.12], 0.25, mg);
    return b.geometry();
  });
}
// Risse je hp (kumuliert): hp 3 wenige, hp 0 viele
const CRACK_SETS = [
  [{ az: 2.4, el: 0.1, steps: 5, seed: 11 }, { az: -2.2, el: -0.2, steps: 5, seed: 12 }, { az: 3.1, el: 0.5, steps: 4, seed: 13 }],
  [{ az: 1.1, el: -0.1, steps: 6, seed: 21, branch: true }, { az: -1.0, el: 0.05, steps: 6, seed: 22, branch: true }, { az: 1.8, el: -0.55, steps: 5, seed: 23 }],
  [{ az: 0.55, el: 0.55, steps: 5, seed: 31 }, { az: -0.6, el: 0.6, steps: 5, seed: 32, branch: true }, { az: -1.6, el: -0.5, steps: 6, seed: 33 }, { az: 2.7, el: -0.6, steps: 5, seed: 34, branch: true }],
  [{ az: 0.9, el: 0.3, steps: 6, seed: 41, branch: true }, { az: -1.3, el: 0.4, steps: 6, seed: 42 }, { az: 0.3, el: -0.7, steps: 5, seed: 43, branch: true }, { az: -2.8, el: 0.3, steps: 6, seed: 44 }],
];
function kingCrackGeo(hp) {
  const lv = 3 - clamp(Math.round(hp), 0, 3);
  return cached(`w4:king:cracks:${lv}`, () => {
    const b = new Build();
    const list = CRACK_SETS.slice(0, lv + 1).flat();
    addCracks(b, KB, list, 0.03, { v: (x, y, z) => mix(LAVA.hot, LAVA.hotter, smoothstep(noise3(x * 4, y * 4, z * 4))) });
    return b.geometry();
  });
}
function crownGeo() {
  return cached('w4:king:crown', () => {
    const b = new Build();
    const goldV = { v: (x, y, z, nx, ny) => mix(KC.goldLow, KC.goldHi, smoothstep(ny * 0.4 + nx * 0.3 + 0.45)) };
    // Samtkappe innen
    b.dome(0.38, KC.velvet, { p: [0, 0.08, 0], s: [1, 0.8, 1] }, Math.PI / 2, 20, 8);
    // Reif (leicht konisch) mit Wulst unten und oben
    b.cyl(0.46, 0.42, 0.26, goldV, { p: [0, 0.13, 0] }, 28, true);
    b.torus(0.42, 0.045, KC.gold, { p: [0, 0.01, 0], r: [Math.PI / 2, 0, 0] }, 6, 28);
    b.torus(0.46, 0.035, KC.goldHi, { p: [0, 0.26, 0], r: [Math.PI / 2, 0, 0] }, 6, 28);
    // fünf Zacken mit Rubinkugeln
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      b.add(new THREE.ConeGeometry(0.1, 0.3, 4), goldV, { p: [Math.cos(a) * 0.43, 0.4, Math.sin(a) * 0.43], r: [0, -a + Math.PI / 4, 0] });
      b.sphere(0.06, KC.ruby, { p: [Math.cos(a) * 0.43, 0.57, Math.sin(a) * 0.43] }, 12, 8);
    }
    // Edelsteine im Band (abwechselnd blau/grün), vorn ein großer Rubin
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      const big = i === 0;
      const g = new THREE.SphereGeometry(1, 12, 8);
      b.add(g, big ? KC.ruby : i % 2 ? KC.sapphire : KC.emerald, placed(new THREE.Vector3(Math.cos(a) * 0.445, 0.13, Math.sin(a) * 0.445), new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), new THREE.Vector3(big ? 0.075 : 0.045, big ? 0.075 : 0.055, 0.03)));
    }
    // kleiner Goldstern auf der Kappe
    b.add(puffyStarGeo(0.09, 0.045, 0.04, 0.015), KC.goldHi, { p: [0, 0.42, 0], r: [0, Math.PI / 2, 0] });
    return b.geometry();
  });
}
function capeGeo() {
  return cached('w4:king:cape', () => {
    const b = new Build();
    const g = new THREE.CylinderGeometry(1.02, 1.52, 1.95, 28, 6, true, Math.PI + 0.42, Math.PI - 0.84);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      const th = Math.atan2(x, z), k = (0.975 - y) / 1.95;
      const r = 1 + Math.sin(th * 7) * 0.04 * k;
      P.setX(i, x * r); P.setZ(i, z * r);
    }
    g.computeVertexNormals();
    g.translate(0, 1.1, 0);
    b.add(g, { v: (x, y, z, nx, ny) => mix(KC.capeLow, KC.cape, smoothstep((y - 0.2) / 1.6)) });
    // Goldsaum unten, Hermelinkragen oben
    b.torus(1.52, 0.045, KC.gold, { p: [0, 0.14, 0], r: [Math.PI / 2, 0, Math.PI / 2 + 0.42] }, 6, 30, Math.PI - 0.84);
    const col = new THREE.TorusGeometry(1.0, 0.13, 10, 30, Math.PI - 0.6);
    b.add(col, (x, y, z) => (Math.sin(x * 9) * Math.sin(y * 9 + z * 9) > 0.82 ? KC.spot : KC.ermine), { p: [0, 2.06, 0], r: [Math.PI / 2, 0, Math.PI / 2 + 0.3] });
    return b.geometry();
  });
}
function fistGeo() {
  return cached('w4:king:fist', () => {
    const b = new Build();
    b.add(lumpyEllipsoid([0.3, 0.27, 0.27], 0.025, 5, 8.1, 20, 14), { v: (x, y, z, nx, ny) => mix(LAVA.rockLow, LAVA.rockHi, smoothstep(ny * 0.5 + 0.5)) });
    for (let i = 0; i < 4; i++) b.sphere(0.075, LAVA.rock, { p: [0.24, 0.1 - i * 0.0, -0.15 + i * 0.1], s: [0.9, 0.8, 0.9] }, 10, 8);
    b.sphere(0.09, LAVA.rock, { p: [0.12, -0.05, 0.22] }, 10, 8);
    return b.geometry();
  });
}
function kingFootGeo() {
  return cached('w4:king:foot', () => {
    const b = new Build();
    b.add(lumpyEllipsoid([0.42, 0.2, 0.32], 0.03, 4, 6.3, 20, 12), { v: (x, y, z, nx, ny) => mix(LAVA.rockLow, LAVA.rockHi, smoothstep(ny * 0.5 + 0.5)) }, { p: [0, 0.18, 0] });
    for (const z of [-0.16, 0, 0.16]) b.sphere(0.1, LAVA.rock, { p: [0.36, 0.1, z] }, 10, 8);
    return b.geometry();
  });
}
const KING_EYES = [1, -1].map((s) => {
  const h = lumpyPoint(KB.rad, KB.amp, KB.freq, KB.seed, s * 0.3, 0.25, -0.07);
  return { p: h.p.toArray(), r: 0.2, sy: 1.2, dir: h.n.toArray() };
});

function buildKoenig() {
  const root = new THREE.Group();
  const own = [];
  const bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, emissive: 0x000000 });
  const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true });
  own.push(bodyMat, glowMat);
  const pose = joint();
  const ball = joint([0, CY, 0]);
  const spinJ = joint();
  const body = mesh(kingBodyGeo(), bodyMat, {}, true);
  const glow = mesh(kingGlowGeo(), glowMat);
  const cracks = mesh(kingCrackGeo(3), glowMat);
  const eye = eyes(KING_EYES, { key: 'w4:king', iris: 0xff8a10, pupil: 0.5, depth: 0.5, pupilColor: 0x1a0606 });
  spinJ.add(body, glow, cracks, eye);
  ball.add(spinJ);
  const crownJ = joint([-0.05, CY + KB.rad[1] - 0.12, 0]);
  const crown = mesh(crownGeo(), vcol(0.22, { metalness: 0.45, emissive: 0x3a2400 }, 'w4crown'), {}, true);
  crownJ.add(crown);
  crownJ.rotation.z = 0.12;
  const cape = mesh(capeGeo(), vcol(0.65, { side: THREE.DoubleSide }, 'w4cape'), {}, true);
  const fists = instMesh(fistGeo(), vcol(0.55, {}, 'w4rock'), 2, 3.5, 1.2);
  const feet = instMesh(kingFootGeo(), vcol(0.55, {}, 'w4rock'), 2, 2.5, 0.2);
  fists.castShadow = true; feet.castShadow = true;
  const halo = glowSprite(0xff7a1a, 3.2, 0.0);
  halo.material = halo.material.clone(); own.push(halo.material);
  halo.position.y = CY + 1.3;
  pose.add(ball, crownJ, cape, fists, feet, halo);
  const embers = new Puffs(18, 0xff8a2a, { emissive: 0xff5a10, opacity: 0.95, detail: 0, radius: 8, cy: 1.5 });
  own.push(embers);
  root.add(pose, embers.mesh);
  root.userData.radius = 1.15;
  const clk = new Clock(), blink = new Blinker();
  let roll = 0, tuck = 0, heat = 1, flash = 0, sq = 0, yaw = 0, cool = 0, hpShown = 3, emitT = 0, raise = 0, lean = 0, crownFall = 0;
  const hotC = new THREE.Color(1, 1, 1), coolC = new THREE.Color(0.32, 0.12, 0.1);
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    const hp = clamp(Math.round(st.hp ?? 3), 0, 3);
    if (hp !== hpShown) { hpShown = hp; cracks.geometry = kingCrackGeo(hp); }
    const rolling = anim === 'roll', spinning = anim === 'spin', summon = anim === 'summon', dead = anim === 'defeated';
    const hit = anim === 'hit' && (st.progress !== undefined ? st.progress < 1 : age < 0.6);
    tuck = damp(tuck, rolling ? 1 : 0, 8, dt);
    cool = damp(cool, dead ? 1 : 0, 1.5, dt);
    const angry = (3 - hp) * 0.15;
    heat = damp(heat, (summon ? 1.5 : rolling || spinning ? 1.25 : 0.9 + angry + Math.sin(t * 2.4) * 0.1) * (1 - cool * 0.85), 4, dt);
    flash = damp(flash, hit ? 1 : 0, hit ? 30 : 6, dt);
    glowMat.color.copy(coolC).lerp(hotC, clamp(heat, 0, 1)).multiplyScalar(Math.max(1, heat) + flash * 0.6);
    bodyMat.emissive.setRGB(flash * 0.8 + heat * 0.025, flash * 0.6 + heat * 0.006, flash * 0.5);
    sq = damp(sq, hit ? 1 : 0, hit ? 25 : 7, dt);
    // Rollen: Kugel dreht um −z, Mitte sinkt auf ROLL_Y
    if (st.roll !== undefined) roll = st.roll;
    else if (rolling) roll += dt * (st.speed ?? 5) / 1.12;
    else roll = damp(roll, Math.round(roll / TAU) * TAU, 4, dt);
    if (spinning) yaw += dt * TAU * 2; else yaw = damp(yaw, Math.round(yaw / TAU) * TAU, 5, dt);
    raise = damp(raise, summon ? 1 : 0, 6, dt);
    lean = damp(lean, dead ? 0.35 : summon ? 0.12 : 0, 3, dt);
    const breathe = Math.sin(t * 1.8) * 0.02;
    ball.position.y = CY + (ROLL_Y - CY) * tuck - cool * 0.12 + (rolling ? Math.abs(Math.sin(roll * 2)) * 0.03 : 0);
    ball.scale.set(1 + sq * 0.12 - breathe * 0.5, 1 - sq * 0.16 + breathe, 1 + sq * 0.12 - breathe * 0.5);
    spinJ.rotation.set(0, 0, -roll);
    pose.rotation.y = yaw;
    pose.rotation.z = lean;
    // Krone: sitzt im Lavasee, beim Rollen schwebt sie über der Kugel, besiegt kippt sie herunter
    crownFall = dead ? clamp(crownFall + dt * 1.6, 0, 1) : damp(crownFall, 0, 6, dt);
    const ky = CY + KB.rad[1] - 0.12 + tuck * 0.35 + Math.sin(t * 3) * 0.03 * tuck + raise * 0.12 + (summon ? Math.abs(Math.sin(t * 9)) * 0.05 : 0);
    const fall = smoothstep(crownFall);
    crownJ.position.set(-0.05 - fall * 1.25, ky * (1 - fall) + 0.28 * fall + Math.sin(fall * Math.PI) * 0.6, fall * 0.6);
    crownJ.rotation.set(fall * 0.5, tuck * t * 0.8, 0.12 + fall * 1.35 + (hit ? Math.sin(t * 40) * 0.1 : 0));
    // Umhang: weg beim Rollen, weht sonst leicht
    cape.scale.setScalar(Math.max(0.001, 1 - tuck));
    cape.visible = tuck < 0.97;
    cape.rotation.z = Math.sin(t * 1.3) * 0.03 + (spinning ? 0.18 : 0) - lean * 0.3;
    // Fäuste und Füße (Instanzen)
    const reach = spinning ? 1.95 : 1.32;
    for (let i = 0; i < 2; i++) {
      const s = i ? -1 : 1;
      let x = 0.25, y = 0.85 + Math.sin(t * 2.2 + i * Math.PI) * 0.06, z = s * reach;
      if (summon) { x = 0.15; y = 2.5 + Math.sin(t * 8 + i) * 0.08; z = s * 1.1; }
      if (dead) { x = 0.4; y = 0.32; z = s * 1.25; }
      if (hit) { x = -0.1; y = 1.2; z = s * 1.4; }
      const sc = Math.max(0.001, 1 - tuck);
      setInst(fists, i, x, y, z, 0, s * 0.3, summon ? Math.PI / 2 : 0, sc);
      const ph = t * 2 + i * Math.PI;
      setInst(feet, i, 0.18 + (anim === 'idle' ? Math.sin(ph) * 0.02 : 0), 0, s * 0.55, 0, s * 0.18, 0, sc);
    }
    fists.instanceMatrix.needsUpdate = true; feet.instanceMatrix.needsUpdate = true;
    // Schein über dem Kopf (Beschwören)
    halo.material.opacity = damp(halo.material.opacity, summon ? 0.9 : hit ? 0.5 : 0.18 * (1 - cool), 6, dt);
    halo.scale.setScalar(3 + Math.sin(t * 6) * 0.25);
    // Funken
    emitT -= dt;
    if (emitT <= 0 && !dead) {
      if (rolling) { emitT = 0.05; embers.burst([-1.0, ROLL_Y + 0.2, 0], { count: 2, speed: 1, up: 1.5, size: 0.1, life: 0.6, spread: 0.6 }); }
      else if (summon) { emitT = 0.06; embers.burst([0, CY + 1.1, 0], { count: 3, speed: 1.4, up: 5, size: 0.11, life: 0.8, spread: 0.5 }); }
      else if (spinning) { emitT = 0.05; const a = yaw + Math.PI / 2; embers.burst([Math.cos(a) * 1.6, 1.0, -Math.sin(a) * 1.6], { count: 2, speed: 3, up: 2, size: 0.1, life: 0.7, spread: 0.3 }); }
      else { emitT = 0.5; embers.burst([0, CY + 1.05, 0], { count: 1, speed: 0.3, up: 1.2, size: 0.08, life: 0.7, spread: 0.6 }); }
    }
    embers.step(dt);
    let bk = blink.update(dt);
    if (hit || dead) bk = 0.1; else if (summon) bk = 1;
    eye.userData.blink(bk);
    eye.scale.setScalar(summon ? 1.12 : 1);
  };
  const model = makeModel('lavafelsen_koenig', root, update, [...own, fists, feet], { initial: 'idle' });
  model.top = (out = new THREE.Vector3()) => { root.updateMatrixWorld(true); return crownJ.getWorldPosition(out); };
  return model;
}

export const MODELS = {
  lavafelsen_koenig: buildKoenig,
};
