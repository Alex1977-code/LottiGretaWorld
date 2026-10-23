// Gegner-Modelle Welt 4 (Kurs-Modus), Teil 2: Lavabrocken, Walzenwerfer mit Stachelwalze, Lavafunke. Eigene Gestaltung.
// Maßstab Meter, Ursprung = Fußpunkt (Ausnahmen genannt), Blick/Laufrichtung +X; state darf ein String sein.
// progress (0..1) überschreibt bei Einmal-Animationen die Zeit seit dem Zustandswechsel.
//
// lavabrocken   ≈0,9 m  Lavastein-Wesen: klumpiger Basaltkörper mit glühenden Rissen, zähflüssige Lavahaube mit
//   Tropfen oben, grimmige Bernsteinaugen unter dicken Steinbrauen, glühendes Grinsen mit Steinzähnchen, zwei Steinfüße.
//   Körpermitte bei y = 0,47 (auch zusammengerollt).
//   state { anim: 'walk'|'idle'|'charge'|'stunned'|'carried'|'thrown'|'defeated', speed }
//         walk: watschelt, Glut pulsiert; charge: vorgebeugter Sturmlauf, Glut grell, Funken stieben;
//         stunned: Glut abgekühlt (dunkelrot), wankt, Schwindel-Sterne – jetzt tragbar;
//         carried: Füße eingezogen, Augen zugekniffen, Glut gedämpft (der Motor setzt root in die Hände);
//         thrown: eingerollt, dreht sich schnell um −Z, glüht wieder, Funkenschweif;
//         defeated: zerspringt in Brocken und Funken (0,9 s), danach unsichtbar.
// walzenwerfer  ≈1,15 m (+ Säule)  Walzenwerfer: türkiser, birnenförmiger Wurf-Echsling mit cremefarbenem Bauch, orangen
//   Rückenplatten, rotem Stirnband mit Knoten, Bernsteinaugen, breitem Maul und Stummelarmen. Holt eine Stachelwalze
//   aus dem Maul, stemmt sie über den Kopf und wirft sie.
//   opts  { pillar: Höhe einer Ruinensäule unter ihm in m (Standard 0 = ohne; Füße dann bei y = pillar),
//           walze: Größe der gehaltenen Walze (Standard 0,85 – Geschoss mit 'stachelwalze' { size: 0,85 } erzeugen) }
//   state { anim: 'idle'|'spit'|'throw'|'squashed', progress? }
//         spit: 1,2 s – Maul auf (0–0,25), Walze kommt aus dem Maul und wächst (0,25–0,55, Position model.mouth()),
//               über den Kopf stemmen (0,55–1); danach hält er sie oben, bis ein anderer Zustand kommt;
//         throw: 0,6 s – ausholen nach hinten (0–0,45), bei progress 0,5 verlässt die Walze die Hände → dann
//               'stachelwalze' an model.hand() erzeugen (rollt nach +X); danach Hände leer;
//         squashed: platt, Augen zu.
//   model.mouth(out?) → Weltposition vor dem Maul.  model.hand(out?) → Weltposition der gehaltenen Walze (Mitte).
//   root.userData.stand → Standhöhe der Füße (= pillar).
// stachelwalze  Ø ≈1 m (× opts.size)  rollende Stachelwalze: schiefergraues Fass mit orangem Mittelband, Endkappen und
//   28 elfenbeinfarbenen Stacheln; Achse = z, rollt nach +X. Ursprung = Bodenpunkt, Mitte bei y = 0,5 · size.
//   opts  { size (1) }
//   state { anim: 'roll'|'idle'|'break', roll? (Drehwinkel in rad = Weg / (0,5 · size); dreht um −z),
//           speed? (m/s, nur ohne roll: dreht von selbst; Standard 3) }  break: zerspringt (0,8 s), dann weg.
// lavafunke     Ø ≈0,6 m  springender Lava-Feuerball: glühende Kugel (vorn gelb-weiß, hinten rot) mit Flammenkamm,
//   frechen Augen unter dunklen Brauen, Grinsen, Flammenschweif und Schein. Ursprung = Unterkante, Mitte bei y = 0,3.
//   state { anim: 'rise'|'fall'|'idle' }  rise: Schweif nach unten, gestreckt; fall: Schweif nach oben;
//         idle: schwebt flackernd (Schweif kurz).

import {
  THREE, TAU, Build, cached, vcol, basic, mesh, joint, eyes, dizzyStars, makeModel, Clock, Blinker, damp, clamp, mix,
  smoothstep, instMesh, glowSprite, onLathe, placed, smoothProfile,
} from '../lib/kit.js';
import { Puffs, stick } from '../lib/kit_w3.js';
import {
  LAVA, lumpyEllipsoid, lumpyPoint, addCracks, displace, noise3, hash1, ruinSaeuleGeo, walzeGeo, walzeMat, axisY,
} from '../lib/w4Geos.js';

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
const prog = (st, clk, dur) => (st.progress !== undefined ? clamp(st.progress, 0, 1) : clamp(clk.age / dur, 0, 1));

// =============================================================================================
// Lavabrocken
// =============================================================================================
const LB = { rad: [0.44, 0.4, 0.42], amp: 0.035, freq: 3.2, seed: 1.7, c: [0, 0, 0], y: 0.47 };
const LB_GLOW = { v: (x, y, z) => mix(LAVA.hot, LAVA.white, smoothstep((y - 0.25) / 0.2)) };
function lbBodyGeo() {
  return cached('w4:lb:body', () => {
    const b = new Build();
    b.add(lumpyEllipsoid(LB.rad, LB.amp, LB.freq, LB.seed, 30, 22), { v: (x, y, z, nx, ny) => {
      const ash = noise3(x * 6 + 3, y * 6, z * 6) > 0.66;
      const base = mix(LAVA.rockLow, LAVA.rockHi, smoothstep(ny * 0.5 + 0.45));
      return ash ? mix(base, LAVA.ash, 0.6) : base;
    } });
    // Steinbrauen (grimmig schräg)
    for (const s of [1, -1]) {
      const h = lumpyPoint(LB.rad, LB.amp, LB.freq, LB.seed, s * 0.37, 0.4, -0.012);
      b.capsule(0.05, 0.14, LAVA.rockLow, { p: h.p.toArray(), r: [Math.PI / 2 + s * 0.42, s * -0.55, 0], order: 'YXZ' }, 3, 8);
    }
    // Steinzähnchen an der Oberkante des Grinsens
    for (let i = -2; i <= 2; i++) {
      if (i === 0) continue;
      const h = lumpyPoint(LB.rad, LB.amp, LB.freq, LB.seed, i * 0.11, -0.12, 0.005);
      b.add(new THREE.ConeGeometry(0.03, 0.06, 5), 0xd8ccc0, axisY(h.p.clone().addScaledVector(new THREE.Vector3(0, -1, 0), 0.02).toArray(), [0.3, -1, 0]));
    }
    return b.geometry();
  });
}
function lbGlowGeo() {
  return cached('w4:lb:glow', () => {
    const b = new Build();
    // Lavahaube oben mit Tropfkante
    const cap = new THREE.SphereGeometry(1, 30, 9, 0, TAU, 0, Math.PI * 0.36);
    cap.scale(LB.rad[0] * 1.02, LB.rad[1] * 1.02, LB.rad[2] * 1.02);
    const cg = displace(cap, LB.amp, LB.freq, LB.seed, true);
    const P = cg.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i), a = Math.atan2(z, x);
      if (y < LB.rad[1] * 0.62) P.setY(i, y - Math.pow(Math.max(0, Math.sin(a * 4 - Math.PI / 2)), 3) * 0.08);
      // leicht über dem Körper
      const l = Math.hypot(x, y, z) || 1;
      P.setXYZ(i, P.getX(i) + (x / l) * 0.012, P.getY(i) + (y / l) * 0.012, P.getZ(i) + (z / l) * 0.012);
    }
    b.add(cg, { v: (x, y) => mix(LAVA.deep, mix(LAVA.hot, LAVA.white, smoothstep((y - 0.34) / 0.08)), smoothstep((y - 0.2) / 0.1)) });
    // Tropfen an der Kante
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      const h = lumpyPoint(LB.rad, LB.amp, LB.freq, LB.seed, a, 0.38, 0.01);
      b.sphere(0.045, LAVA.hot, { p: [h.p.x, h.p.y - 0.06, h.p.z], s: [1, 1.7, 1] }, 10, 8);
    }
    // Glut-Risse am Körper
    addCracks(b, LB, [
      { az: 0.9, el: -0.1, steps: 4, seed: 1 }, { az: -0.95, el: 0.0, steps: 4, seed: 2, branch: true }, { az: 2.2, el: -0.25, steps: 5, seed: 3 },
      { az: -2.4, el: 0.1, steps: 5, seed: 4, branch: true }, { az: 3.1, el: -0.45, steps: 4, seed: 5 }, { az: 1.6, el: -0.55, steps: 3, seed: 6 },
    ], 0.014, LAVA.hot);
    // glühendes Grinsen (Halbmond)
    const hm = lumpyPoint(LB.rad, LB.amp, LB.freq, LB.seed, 0, -0.22, 0.004);
    const sh = new THREE.Shape();
    sh.moveTo(-1, 0.3); sh.quadraticCurveTo(0, 0.05, 1, 0.3); sh.quadraticCurveTo(0.85, -0.85, 0, -0.85); sh.quadraticCurveTo(-0.85, -0.85, -1, 0.3);
    const mg = new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: false, curveSegments: 8 });
    mg.translate(0, 0, -0.18);
    stick(b, hm, { v: (x, y) => mix(LAVA.deep, LAVA.hotter, smoothstep(y * 0.8 + 0.7)) }, [0.15, 0.1, 0.05], 0.2, mg);
    return b.geometry();
  });
}
function lbFootGeo() {
  return cached('w4:lb:foot', () => {
    const b = new Build();
    b.add(lumpyEllipsoid([0.15, 0.085, 0.12], 0.012, 6, 2.2, 16, 10), { v: (x, y, z, nx, ny) => mix(LAVA.rockLow, LAVA.rockHi, smoothstep(ny * 0.5 + 0.5)) }, { p: [0, 0.075, 0] });
    for (const z of [-0.06, 0, 0.06]) b.sphere(0.04, LAVA.rock, { p: [0.13, 0.05, z] }, 8, 6);
    return b.geometry();
  });
}
const lbChunkGeo = () => cached('w4:lb:chunk', () => new Build().add(displace(new THREE.IcosahedronGeometry(0.13, 0), 0.03, 7, 2, false), { v: (x, y, z, nx, ny) => (ny > 0.6 ? LAVA.hot : mix(LAVA.rockLow, LAVA.rockHi, ny * 0.5 + 0.5)) }).geometry());
const LB_EYES = [1, -1].map((s) => {
  const h = lumpyPoint(LB.rad, LB.amp, LB.freq, LB.seed, s * 0.36, 0.12, -0.04);
  return { p: h.p.toArray(), r: 0.12, sy: 1.22, dir: h.n.toArray() };
});
function buildLavabrocken() {
  const root = new THREE.Group();
  const own = [];
  const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true });
  own.push(glowMat);
  const pose = joint();
  const ball = joint([0, LB.y, 0]);
  const body = mesh(lbBodyGeo(), vcol(0.55, {}, 'w4rock'), {}, true);
  const glow = mesh(lbGlowGeo(), glowMat);
  const eye = eyes(LB_EYES, { key: 'w4:lb', iris: 0xffa21a, pupil: 0.5, depth: 0.5 });
  ball.add(body, glow, eye);
  const feet = [1, -1].map((s) => joint([0.04, 0, s * 0.2], mesh(lbFootGeo(), vcol(0.55, {}, 'w4rock'), {}, true)));
  const dizzy = dizzyStars(0.3, 0.075); dizzy.position.y = 1.0;
  pose.add(ball, ...feet, dizzy);
  const embers = new Puffs(10, 0xff8a2a, { emissive: 0xff5a10, opacity: 0.95, detail: 0, radius: 4, cy: 0.5 });
  const chunks = instMesh(lbChunkGeo(), vcol(0.55, {}, 'w4rock'), 8, 4, 0.5);
  chunks.castShadow = true;
  root.add(pose, embers.mesh, chunks);
  own.push(embers);
  const clk = new Clock(), blink = new Blinker();
  let phase = Math.random() * TAU, tuck = 0, heat = 1, spin = 0, lean = 0, emitT = 0;
  const hotC = new THREE.Color(1, 1, 1), coolC = new THREE.Color(0.55, 0.16, 0.12);
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    const walking = anim === 'walk', charging = anim === 'charge';
    const balled = anim === 'carried' || anim === 'thrown';
    const dead = anim === 'defeated';
    const speed = walking ? (st.speed ?? 1.2) : charging ? (st.speed ?? 4) : 0;
    if (walking || charging) phase += dt * (charging ? 16 : 6 + speed * 2.5);
    tuck = damp(tuck, balled ? 1 : 0, 14, dt);
    const targetHeat = anim === 'stunned' ? 0.25 : anim === 'carried' ? 0.45 : charging || anim === 'thrown' ? 1.35 : 0.85 + Math.sin(t * 3) * 0.12;
    heat = damp(heat, targetHeat, 5, dt);
    glowMat.color.copy(coolC).lerp(hotC, clamp(heat, 0, 1)).multiplyScalar(Math.max(1, heat));
    lean = damp(lean, charging ? -0.3 : 0, 8, dt);
    const sway = walking ? Math.sin(phase) * 0.09 : charging ? Math.sin(phase) * 0.05 : anim === 'stunned' ? Math.sin(t * 4) * 0.15 : 0;
    if (anim === 'thrown') spin -= dt * 13; else if (!balled) spin = damp(spin, Math.round(spin / TAU) * TAU, 6, dt);
    ball.rotation.set(sway, 0, lean + spin + (anim === 'carried' ? Math.sin(t * 20) * 0.03 : 0));
    ball.position.y = LB.y + (walking || charging ? Math.abs(Math.sin(phase)) * 0.04 : 0) - (anim === 'stunned' ? 0.03 : 0);
    ball.visible = !dead || age < 0.05;
    feet.forEach((f, i) => {
      const s = i ? -1 : 1;
      const ph = phase + (i ? Math.PI : 0);
      const up = walking || charging ? Math.max(0, Math.sin(ph)) * (charging ? 0.1 : 0.07) : 0;
      f.position.set(0.04 + (walking || charging ? Math.cos(ph) * (charging ? 0.12 : 0.08) : 0), up, s * 0.2);
      f.scale.setScalar(Math.max(0.001, 1 - tuck));
      f.visible = !dead && tuck < 0.98;
    });
    dizzy.visible = anim === 'stunned';
    if (dizzy.visible) dizzy.rotation.y = t * 4;
    // Funken
    emitT -= dt;
    if ((charging || anim === 'thrown') && emitT <= 0) { emitT = 0.08; embers.burst([-0.35, LB.y + 0.1, 0], { count: 2, speed: 0.8, up: 1.2, size: 0.05, life: 0.5, spread: 0.2 }); }
    if (dead && clk.entered) embers.burst([0, LB.y, 0], { count: 10, speed: 2.4, up: 2, size: 0.07, life: 0.8, spread: 0.3, force: true });
    embers.step(dt);
    // Brocken
    if (dead) {
      const a = Math.min(age, 1);
      for (let k = 0; k < 8; k++) {
        const az = (k / 8) * TAU + 0.3, vy = 2.2 + (k % 3) * 0.8;
        const sc = Math.max(0.001, 1 - smoothstep((age - 0.6) / 0.3)) * (0.8 + (k % 2) * 0.4);
        _q.setFromEuler(_e.set(a * 7 + k, a * 5, a * 9 - k));
        chunks.setMatrixAt(k, _m.compose(_v.set(Math.cos(az) * 1.6 * a, Math.max(0.08, LB.y + vy * a - 7 * a * a), Math.sin(az) * 1.6 * a), _q, _s.setScalar(sc)));
      }
      chunks.visible = age < 0.95;
    } else { for (let k = 0; k < 8; k++) chunks.setMatrixAt(k, ZERO); chunks.visible = false; }
    chunks.instanceMatrix.needsUpdate = true;
    let bk = blink.update(dt);
    if (anim === 'carried' || anim === 'thrown') bk = 0.12; else if (anim === 'stunned') bk = 0.35; else if (charging) bk = 0.8;
    eye.userData.blink(bk);
  };
  return makeModel('lavabrocken', root, update, [...own, chunks], { initial: 'idle' });
}

// =============================================================================================
// Stachelwalze
// =============================================================================================
const walzeChunkGeo = () => cached('w4:walze:chunk', () => new Build().add(displace(new THREE.IcosahedronGeometry(0.12, 0), 0.03, 6, 5, false), { v: (x, y, z, nx, ny) => mix(0x3a3e52, 0x7a80a0, ny * 0.5 + 0.5) }).geometry());
function buildStachelwalze(opts = {}) {
  const size = clamp(Number(opts.size ?? 1), 0.2, 5);
  const root = new THREE.Group();
  const center = joint([0, 0.5 * size, 0]);
  const spin = joint();
  const body = mesh(walzeGeo(), walzeMat(), { s: size }, true);
  spin.add(body);
  center.add(spin);
  const chunks = instMesh(walzeChunkGeo(), walzeMat(), 10, 3 * size, 0.5 * size);
  chunks.castShadow = true;
  root.add(center, chunks);
  const clk = new Clock();
  let roll = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const age = clk.age;
    if (st.roll !== undefined) roll = st.roll;
    else if (anim === 'roll') roll += dt * (st.speed ?? 3) / (0.5 * size);
    spin.rotation.z = -roll;
    const broken = anim === 'break';
    center.visible = !broken;
    // Rollen: leichtes Hüpfen auf den Stachelspitzen
    center.position.y = 0.5 * size + (anim === 'roll' ? Math.abs(Math.sin(roll * 3.5)) * 0.02 * size : 0);
    if (broken) {
      const a = Math.min(age, 0.8);
      for (let k = 0; k < 10; k++) {
        const az = (k / 10) * TAU, vy = 2 + (k % 3);
        const sc = size * Math.max(0.001, 1 - smoothstep((age - 0.5) / 0.3)) * (0.7 + (k % 2) * 0.6);
        _q.setFromEuler(_e.set(a * 8 + k, a * 6, a * 7));
        chunks.setMatrixAt(k, _m.compose(_v.set(Math.cos(az) * 1.5 * a * size, Math.max(0.06, (0.5 + vy * a - 6 * a * a) * size), Math.sin(az) * 1.5 * a * size), _q, _s.setScalar(sc)));
      }
      chunks.visible = age < 0.85;
    } else { for (let k = 0; k < 10; k++) chunks.setMatrixAt(k, ZERO); chunks.visible = false; }
    chunks.instanceMatrix.needsUpdate = true;
  };
  return makeModel('stachelwalze', root, update, [chunks], { initial: 'idle' });
}

// =============================================================================================
// Walzenwerfer
// =============================================================================================
const WW = {
  body: 0x22a898, bodyHi: 0x7ae4d0, bodyLow: 0x0f6e66, belly: 0xfff0c8, plate: 0xff8a2a, plateHi: 0xffc06a, band: 0xe8283a,
  mouth: 0x5a0a1e, tongue: 0xff6a86, lip: 0x9ff0e0, brow: 0x0a4a44, hand: 0x5fd4c0, claw: 0xfff6e0,
};
const WW_PTS = [[0, 0.02], [0.3, 0.03], [0.42, 0.12], [0.47, 0.3], [0.45, 0.5], [0.41, 0.68], [0.35, 0.84], [0.25, 0.97], [0.12, 1.05], [0, 1.08]];
function wwBodyGeo() {
  return cached('w4:ww:body', () => {
    const b = new Build();
    b.lathe(WW_PTS, { v: (x, y, z, nx, ny) => mix(WW.bodyLow, WW.bodyHi, smoothstep(ny * 0.45 + 0.35 + y * 0.35)) }, null, 26, 2);
    // Bauch (Creme) vorn
    stick(b, onLathe(WW_PTS, 0.32, 0, -0.05), WW.belly, [0.3, 0.27, 0.05], 0.4);
    for (let i = 0; i < 3; i++) stick(b, onLathe(WW_PTS, 0.32, 0, -0.32 + i * 0.22), 0xf2dcae, [0.2 - Math.abs(i - 1) * 0.04, 0.012, 0.03], 0.2);
    // Rückenplatten (orange, abgerundet) entlang des Rückens
    [[0.95, 0.12], [0.72, 0.15], [0.5, 0.14], [0.28, 0.11]].forEach(([y, r]) => {
      const el = Math.atan2(y - 0.5, 0.4);
      const h = onLathe(WW_PTS, 0.5, Math.PI, el);
      if (!h) return;
      b.add(new THREE.SphereGeometry(1, 10, 8), { v: (x, yy, z, nx, ny) => mix(WW.plate, WW.plateHi, smoothstep(ny * 0.6 + 0.4)) }, placed(h.p.clone().addScaledVector(h.n, r * 0.45), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0.05, r, r * 0.9)).multiply(new THREE.Matrix4().makeRotationZ(0)));
    });
    // Stirnband mit Knoten hinten
    b.torus(0.3, 0.04, WW.band, { p: [-0.015, 0.92, 0], r: [Math.PI / 2, 0.12, 0], s: [1.04, 1.04, 1] }, 5, 26);
    b.sphere(0.06, WW.band, { p: [-0.32, 0.9, 0] }, 10, 8);
    for (const s of [1, -1]) b.sphere(1, WW.band, { p: [-0.42, 0.82, s * 0.05], s: [0.12, 0.04, 0.05], r: [0, s * 0.3, 0.7] }, 10, 6);
    // Brauen (dick, verschmitzt)
    for (const s of [1, -1]) b.capsule(0.03, 0.12, WW.brow, { p: [0.31, 1.0, s * 0.12], r: [Math.PI / 2 - s * 0.3, -s * 0.35, 0], order: 'YXZ' }, 3, 8);
    // Oberlippe (Wulst über dem Maul)
    b.torus(0.17, 0.035, WW.lip, { p: [0.41, 0.66, 0], r: [0, Math.PI / 2, 0], s: [1, 0.5, 1] }, 6, 20, Math.PI);
    // Füße und Schwänzchen
    for (const s of [1, -1]) {
      b.sphere(1, WW.bodyLow, { p: [0.12, 0.07, s * 0.22], s: [0.17, 0.08, 0.12] }, 14, 8);
      for (const z of [-0.05, 0.05]) b.cone(0.025, 0.06, WW.claw, { p: [0.29, 0.05, s * 0.22 + z], r: [0, 0, -Math.PI / 2] }, 6);
    }
    b.add(new THREE.ConeGeometry(0.12, 0.35, 12), { v: (x, y) => mix(WW.bodyLow, WW.body, y / 0.35 + 0.5) }, axisY([-0.5, 0.13, 0], [-1, 0.25, 0]));
    // Wangen
    for (const s of [1, -1]) stick(b, onLathe(WW_PTS, 0.75, s * 0.75, 0.05), 0xff9cb0, [0.06, 0.04, 0.02], 0.3);
    return b.geometry();
  });
}
function wwCavityGeo() {
  return cached('w4:ww:cavity', () => {
    const b = new Build();
    const g = new THREE.SphereGeometry(1, 20, 10, 0, TAU, 0, Math.PI / 2); g.rotateX(Math.PI / 2);
    b.add(g, WW.mouth, { s: [0.17, 0.1, 0.04] });
    const t = new THREE.SphereGeometry(1, 14, 8, 0, TAU, 0, Math.PI / 2); t.rotateX(Math.PI / 2);
    b.add(t, WW.tongue, { p: [0.004, -0.045, 0], s: [0.1, 0.045, 0.03] });
    return b.geometry();
  });
}
function wwJawGeo() {
  return cached('w4:ww:jaw', () => {
    const b = new Build();
    b.sphere(1, { v: (x, y, z, nx, ny) => mix(WW.body, WW.bodyHi, smoothstep(ny * 0.5 + 0.5)) }, { s: [0.12, 0.07, 0.19] }, 16, 10);
    b.torus(0.15, 0.03, WW.lip, { p: [0.02, 0.03, 0], r: [0, Math.PI / 2, Math.PI], s: [1, 0.45, 1] }, 6, 18, Math.PI);
    for (const z of [-0.07, 0.07]) b.cone(0.022, 0.05, 0xffffff, { p: [0.09, 0.07, z] }, 6);
    return b.geometry();
  });
}
function wwArmGeo() {
  return cached('w4:ww:arm', () => {
    const b = new Build();
    b.capsule(0.07, 0.2, { v: (x, y, z, nx, ny) => mix(WW.bodyLow, WW.body, smoothstep(nx * 0.5 + 0.5)) }, { p: [0, -0.17, 0] }, 3, 9);
    b.sphere(0.09, WW.hand, { p: [0, -0.34, 0] }, 12, 8);
    for (const a of [-0.6, 0, 0.6]) b.cone(0.022, 0.06, WW.claw, { p: [Math.sin(a) * 0.06 + 0.02, -0.42, Math.cos(a) * 0.0 + a * 0.05], r: [0, 0, Math.PI + a * 0.4] }, 6);
    return b.geometry();
  });
}
function buildWalzenwerfer(opts = {}) {
  const pillarH = Math.max(0, Number(opts.pillar ?? 0));
  const wsize = clamp(Number(opts.walze ?? 0.85), 0.3, 2);
  const root = new THREE.Group();
  if (pillarH > 0.5) root.add(mesh(ruinSaeuleGeo(Math.round(pillarH * 10) / 10, false, false, false), vcol(0.7, {}, 'w4stone'), {}, true));
  const stand = joint([0, pillarH > 0.5 ? Math.round(pillarH * 10) / 10 : 0, 0]);
  const pose = joint();
  const bodyM = mesh(wwBodyGeo(), vcol(0.32), {}, true);
  const cavity = mesh(wwCavityGeo(), vcol(0.5), { p: [0.425, 0.6, 0], r: [0, Math.PI / 2, 0] });
  const jaw = joint([0.36, 0.55, 0], mesh(wwJawGeo(), vcol(0.32), {}, true));
  const eye = eyes([{ p: [0.3, 0.86, 0.12], r: 0.1, sy: 1.25, dir: [1, 0.15, 0.42] }, { p: [0.3, 0.86, -0.12], r: 0.1, sy: 1.25, dir: [1, 0.15, -0.42] }],
    { key: 'w4:ww', iris: 0xd88a12, pupil: 0.55, depth: 0.5 });
  const arms = [1, -1].map((s) => joint([0.06, 0.66, s * 0.4], mesh(wwArmGeo(), vcol(0.35), {}, true)));
  const held = joint();
  const heldSpin = joint();
  heldSpin.add(mesh(walzeGeo(), walzeMat(), { s: wsize }, true));
  held.add(heldSpin);
  pose.add(bodyM, cavity, jaw, eye, ...arms, held);
  stand.add(pose);
  root.add(stand);
  root.userData.stand = stand.position.y;
  const mouthPt = new THREE.Object3D(); mouthPt.position.set(0.62, 0.62, 0); pose.add(mouthPt);
  const clk = new Clock(), blink = new Blinker();
  let sq = 0, open = 0;
  const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const MOUTH = [0.6, 0.62, 0], INSIDE = [0.32, 0.6, 0], OVER = [0.02, 1.55, 0], BACK = [-0.25, 1.5, 0];
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    let openT = 0.05 + Math.max(0, Math.sin(t * 1.3)) * 0.1, armRz = 0.2 + Math.sin(t * 2) * 0.05, armRx = 0.25, stretch = 1, lean = 0;
    let hp = null, hs = 1, show = false, rollA = t * 0.6;
    if (anim === 'spit') {
      const p = prog(st, clk, 1.2);
      if (p < 0.25) { openT = smoothstep(p / 0.25); lean = smoothstep(p / 0.25) * 0.12; }
      else if (p < 0.55) {
        const k = smoothstep((p - 0.25) / 0.3);
        openT = 1; lean = 0.12 - k * 0.2; show = true; hp = lerp3(INSIDE, MOUTH, k); hs = 0.3 + k * 0.7;
        armRz = 0.2 + k * 1.2;
      } else {
        const k = smoothstep((p - 0.55) / 0.45);
        openT = 1 - k; lean = -0.08 + k * 0.08; show = true; hp = lerp3(MOUTH, OVER, k); hs = 1;
        armRz = 1.4 + k * 1.62; armRx = 0.25 - k * 0.17; stretch = 1 + k * 0.8;
      }
      rollA = p * 5;
    } else if (anim === 'throw') {
      const p = prog(st, clk, 0.6);
      if (p < 0.45) {
        const k = smoothstep(p / 0.45);
        show = true; hp = lerp3(OVER, BACK, k); lean = k * 0.25; armRz = 3.02 + k * 0.4; armRx = 0.08; stretch = 1.8;
      } else if (p < 0.5) { show = true; hp = BACK; lean = 0.25; armRz = 3.42; armRx = 0.08; stretch = 1.8; }
      else {
        const k = smoothstep((p - 0.5) / 0.5);
        lean = 0.25 - k * 0.45 + smoothstep((p - 0.8) / 0.2) * 0.2; armRz = 3.42 - k * 2.0; armRx = 0.15; stretch = 1.8 - k * 0.8; openT = 0.5 * (1 - k);
      }
    }
    const flat = anim === 'squashed';
    sq = damp(sq, flat ? 1 : 0, flat ? 26 : 9, dt);
    open = damp(open, openT, 18, dt);
    pose.scale.set(1 + sq * 0.35, Math.max(0.05, 1 - sq * 0.72), 1 + sq * 0.35);
    pose.rotation.z = damp(pose.rotation.z, lean, 12, dt);
    pose.position.y = anim === 'idle' ? Math.abs(Math.sin(t * 2)) * 0.015 : 0;
    jaw.position.y = 0.56 - open * 0.13;
    jaw.rotation.z = -open * 0.25;
    cavity.scale.set(1, 0.4 + open * 1.6, 1);
    cavity.position.y = 0.6 - open * 0.06;
    arms.forEach((a, i) => {
      const s = i ? -1 : 1;
      a.rotation.set(damp(a.rotation.x, -s * armRx, 14, dt), 0, damp(a.rotation.z, armRz, 14, dt));
      a.scale.y = damp(a.scale.y, stretch, 14, dt);
    });
    held.visible = show && !flat;
    if (hp) held.position.set(hp[0], hp[1], hp[2]);
    else held.position.set(OVER[0], OVER[1], OVER[2]);
    held.scale.setScalar(hs);
    heldSpin.rotation.z = -rollA;
    let bk = blink.update(dt, !flat);
    if (flat) bk = 0.1; else if (anim === 'throw') bk = 0.75;
    eye.userData.blink(bk);
  };
  const model = makeModel('walzenwerfer', root, update, [], { initial: 'idle' });
  model.mouth = (out = new THREE.Vector3()) => { root.updateMatrixWorld(true); return mouthPt.getWorldPosition(out); };
  model.hand = (out = new THREE.Vector3()) => { root.updateMatrixWorld(true); return held.getWorldPosition(out); };
  root.userData.walzeSize = wsize;
  return model;
}

// =============================================================================================
// Lavafunke
// =============================================================================================
function lfCoreGeo() {
  return cached('w4:lf:core', () => {
    const b = new Build();
    b.add(new THREE.IcosahedronGeometry(0.24, 3), { v: (x, y, z) => mix(LAVA.deep, mix(LAVA.hotter, LAVA.white, smoothstep((x - 0.1) / 0.12)), smoothstep(x / 0.24 * 0.7 + 0.55)) });
    // dunkle, freche Brauen und Grinsen
    for (const s of [1, -1]) b.capsule(0.022, 0.08, 0x8a1206, { p: [0.2, 0.15, s * 0.095], r: [Math.PI / 2 + s * 0.35, -s * 0.55, 0], order: 'YXZ' }, 3, 6);
    const sh = new THREE.Shape();
    sh.moveTo(-1, 0.25); sh.quadraticCurveTo(0, -0.1, 1, 0.25); sh.quadraticCurveTo(0.8, -0.85, 0, -0.85); sh.quadraticCurveTo(-0.8, -0.85, -1, 0.25);
    const mg = new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: false, curveSegments: 8 });
    mg.scale(0.08, 0.055, 1);
    b.add(mg, 0x8a1206, placed(new THREE.Vector3(0.215, -0.07, 0), new THREE.Vector3(1, -0.3, 0), new THREE.Vector3(1, 1, 1)));
    return b.geometry();
  });
}
function lfFlameGeo(n, len, spread, key) {
  return cached(`w4:lf:flame:${key}`, () => {
    const b = new Build();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const d = new THREE.Vector3(Math.cos(a) * spread, 1, Math.sin(a) * spread).normalize();
      const L = len * (0.7 + hash1(i + n) * 0.5);
      b.add(new THREE.ConeGeometry(0.075, L, 8), { v: (x, y) => mix(LAVA.hotter, LAVA.deep, smoothstep(y / L + 0.5)) }, axisY(d.clone().multiplyScalar(0.12 + L * 0.4).toArray(), d.toArray()));
    }
    b.add(new THREE.ConeGeometry(0.11, len * 1.25, 10), { v: (x, y) => mix(LAVA.white, LAVA.hot, smoothstep(y / (len * 1.25) + 0.5)) }, { p: [0, 0.1 + len * 0.55, 0] });
    return b.geometry();
  });
}
function buildLavafunke() {
  const root = new THREE.Group();
  const center = joint([0, 0.3, 0]);
  const body = joint();
  const fireMat = basic('w4:lfFire', { vertexColors: true });
  const core = mesh(lfCoreGeo(), fireMat);
  const crest = joint([-0.04, 0.12, 0], mesh(lfFlameGeo(6, 0.2, 0.55, 'crest'), fireMat));
  crest.rotation.z = 0.5;
  const tail = joint([0, 0, 0], mesh(lfFlameGeo(7, 0.3, 0.4, 'tail'), fireMat));
  const eye = eyes([{ p: [0.2, 0.05, 0.09], r: 0.08, sy: 1.3, dir: [1, 0.15, 0.48] }, { p: [0.2, 0.05, -0.09], r: 0.08, sy: 1.3, dir: [1, 0.15, -0.48] }],
    { key: 'w4:lf', iris: 0x2a1408, pupil: 0.62, depth: 0.5 });
  body.add(core, crest, eye);
  const glow = glowSprite(0xff7a1a, 1.5, 0.6);
  center.add(body, tail, glow);
  const embers = new Puffs(8, 0xffa02a, { emissive: 0xff6a10, opacity: 0.95, detail: 0, radius: 3, cy: 0.3 });
  root.add(center, embers.mesh);
  const clk = new Clock(), blink = new Blinker();
  let tailDir = 0, emitT = 0, stretch = 1;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    const target = anim === 'fall' ? Math.PI : 0;
    tailDir = damp(tailDir, target, 10, dt);
    tail.rotation.z = Math.PI + tailDir; // Schweif zeigt nach unten (rise) bzw. oben (fall)
    const moving = anim === 'rise' || anim === 'fall';
    stretch = damp(stretch, moving ? 1.12 : 1, 8, dt);
    body.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));
    const fl = 1 + Math.sin(t * 23) * 0.12 + Math.sin(t * 37) * 0.06;
    tail.scale.set(1, (moving ? 1.6 : 0.8) * fl, 1);
    crest.scale.set(1, 0.9 + Math.sin(t * 19 + 1) * 0.15, 1);
    body.rotation.y = Math.sin(t * 2.3) * 0.15;
    center.position.y = 0.3 + (anim === 'idle' ? Math.sin(t * 3) * 0.05 : 0);
    glow.scale.setScalar(1.4 + Math.sin(t * 9) * 0.1);
    emitT -= dt;
    if (emitT <= 0) { emitT = moving ? 0.07 : 0.18; const dy = anim === 'fall' ? 0.25 : -0.25; embers.burst([0, 0.3 + dy, 0], { count: 1, speed: 0.4, up: anim === 'fall' ? 0.6 : -0.3, size: 0.045, life: 0.45, spread: 0.12 }); }
    embers.step(dt);
    eye.userData.blink(blink.update(dt));
  };
  return makeModel('lavafunke', root, update, [embers], { initial: 'idle' });
}

export const MODELS = {
  lavabrocken: buildLavabrocken,
  stachelwalze: buildStachelwalze,
  walzenwerfer: buildWalzenwerfer,
  lavafunke: buildLavafunke,
};
