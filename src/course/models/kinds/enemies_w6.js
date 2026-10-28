// Gegner-Modelle Welt 6 „Wolkeninseln“ (Kurs-Modus): Schubser, Pustewolke, Glotzfisch, Stachelwerfer, Hammer-/Bumerang-
// Werfer, Wuschel-Horde, Wirbelbrocken-Attrappe. Eigene Gestaltung, keine Nachbauten fremder Figuren. Maßstab Meter,
// Ursprung = Fußpunkt (Ausnahmen genannt), Blick nach +X; state darf ein String sein ('walk' ≙ { anim: 'walk' }).
// Unbekannte anim → wie 'idle'. progress (0..1) überschreibt bei Einmal-/Zyklus-Animationen die Zeit seit dem Wechsel.
//
// schubser      ≈1,0 m (mit Hörnchen), Ø 0,86 m  Schubser: runde, glänzende Lila-Kugel auf zwei orangen Hufen, cremige
//   Schnauze mit Nüstern, grimmiger Mund mit zwei Hauern, kurze Hörnchen mit Goldspitzen, dicke Brauen, Schwanzquaste.
//   opts  { size (Faktor, Standard 1) }
//   state { anim: 'idle'|'walk'|'charge'|'skid'|'pushed'|'fall'|'defeated', speed (m/s; walk 1,5, charge 5),
//           progress? (pushed: 0..1 in 0,5 s; defeated: 0..1 in 0,8 s) }
//         idle: atmet, scharrt, schnaubt Dampf; walk: watschelt; charge: tief vorgebeugt, Hufe wirbeln, Dampf aus den
//         Nüstern, Staub; skid: lehnt sich zurück, Hufe gestemmt, Staubfontäne vorn; pushed: wird zurückgestoßen (kippt
//         nach hinten, Augen zugekniffen, Brauen ängstlich); fall: stürzt ab (Hufe strampeln, Maul auf, Augen weit);
//         defeated: dreht sich, schrumpft in einer Staubwolke weg (danach unsichtbar).
//   root.userData.radius → Kollisionsradius (0,43 · size), userData.front(out?) → Weltpunkt der Schnauze.
// pustewolke    ≈1,3 m breit, 1,25 m hoch (mit Mütze)  Pustewolke: flauschige Wolke mit Pausbacken, großen Augen und
//   gestreifter Pudelmütze. **Ursprung = Unterkante der Wolke** (Schwebehöhe setzt der Motor); pustet nach +X.
//   state { anim: 'idle'|'inhale'|'blow'|'hit'|'defeated', power (0..1 Windstärke, Standard 1 bei blow),
//           progress? (inhale: 0..1 in 0,7 s; hit: 0,5 s; defeated: 0,9 s) }
//         inhale: saugt Luft, bläht sich und die Backen; blow: spitzer O-Mund, Backen entleeren sich, Windfahnen und
//         Schneewölkchen nach +X (Länge ∝ power, bis ≈ 4 m); hit: blinkt, Augen zu, wabbelt; defeated: zerfasert in Puffs.
//   root.userData.wind → aktuelle Windstärke (0..1), userData.reach → Länge der Windfahnen (m).
// glotzfisch    ≈1,1 m lang (mit Schwanzflosse)  Glotzfisch: praller, königsblauer Fisch mit cremigem Bauch, zwei riesigen Glotzaugen in
//   Augenringen obenauf, rosa Schmollmund, orange gezackte Rückenflosse, Brust- und Gabelschwanzflosse.
//   **Ursprung = Unterkante des Körpers (Bauch)**, Körpermitte y = 0,3.
//   opts  { color: 'blau' (Standard) | 'gelb' | 'rosa' }
//   state { anim: 'swim'|'jump'|'defeated'|'idle', speed, progress? (jump: 0..1 über den Sprungbogen) }
//         swim: Schwanz schlägt, Flossen paddeln; jump: reckt sich (Nase hoch → runter mit progress), Flossen gespreizt,
//         Maul auf (der Motor bewegt root); defeated: dreht sich auf den Rücken, Augen zu.
// stachelwerfer ≈1,05 m (+ Kugel)  Stachelwerfer: rundlicher Igel mit kastanienbraunem Stachelkleid (cremige Spitzen),
//   heller Bauch und Gesicht, Knopfnase, rotes Halstuch, kurze Ärmchen, Tapsfüße. Zaubert eine Stachelkugel über dem
//   Kopf herbei und wirft sie.
//   opts  { ball: Ø der Stachelkugel in m (Standard 0,55 – Geschoss mit 'stachelkugel' { size: 0,55 } erzeugen) }
//   state { anim: 'idle'|'throw'|'hit'|'defeated', progress? (throw: 0..1 in 0,9 s; hit 0,5 s; defeated 0,8 s) }
//         throw: Kugel wächst über dem Kopf (0–0,4), ausholen (0,4–0,6), bei progress 0,62 verlässt sie die Hände →
//         dann 'stachelkugel' an model.hand() erzeugen; danach Hände leer; hit: rollt sich ein, Stacheln gesträubt,
//         blinkt; defeated: kippt platt, Augen zu.
//   model.hand(out?) → Weltposition der gehaltenen Kugel (Mitte).  root.userData.holding → Kugel sichtbar?
// hammer_werfer / bumerang_werfer  Werfer-Brüder der vorhandenen Familie (Axolotl, 'feuer_werfer' mit kind 'hammer' bzw.
//   'bumerang'; Geschosse 'wurf_hammer'/'wurf_bumerang').
//   state { anim: 'idle'|'walk'|'jump'|'throw'|'defeated'|'squashed'|'stunned', speed, progress? }  defeated ≙ squashed.
//   model.hand(out?) wie feuer_werfer.
// wuschel_horde Schwarm aus vielen Wuscheln (EIN InstancedMesh, ≈260 Dreiecke je Wuschel): wimmelt in einem Oval
//   depth × width (Ursprung = Mitte der Unterkante, Front +X), alle blicken nach +X.
//   opts  { count (24, höchstens 64), width (Z, 6), depth (X, 2,5), height (Y-Streuung, 1,4) }
//   state { anim: 'chase'|'idle', speed (m/s, Wogen), count? (sichtbare Zahl ≤ opts.count) }
//         chase: wogt nach vorn, Wuschel überholen sich, wirbeln; idle: wimmelt auf der Stelle.
// wirbelbrocken_attrappe  Attrappe des Wirbelbrockens (6-Panzer): sieht aus wie 'wirbelbrocken', zerplatzt beim Treffer.
//   state wie wirbelbrocken + 'poof' (0,5 s: schrumpft wirbelnd in einer lila Rauchwolke mit Funkeln, danach unsichtbar).

import {
  THREE, TAU, Build, cached, vcol, basic, std, mesh, joint, eyes, makeModel, Clock, Blinker, damp, clamp, mix, col,
  smoothstep, lerp, instMesh, setInst, glowSprite, sparkleSprite, placed, onEllipsoid, onLathe, dizzyStars, S,
} from '../lib/kit.js';
import {
  W6, SB, SB_EYES, SB_BROWS, schubserBodyGeo, schubserFootGeo, browGeo, puffyGeo, mouthShape, gradV, ownMat, Puffs, stick,
  taperTube, fibDirs, spikeBallGeo, spikeMat, wuschelLoGeo, hash1, cloudGeo,
} from '../lib/w6Geos.js';
import { MODELS as W2W } from './enemies_w2_werfer.js';
import { MODELS as W2B } from './bosses_w2.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
const prog = (st, clk, dur, loop = false) => (st.progress !== undefined ? clamp(st.progress, 0, 1) : loop ? (clk.age % dur) / dur : clamp(clk.age / dur, 0, 1));

// =============================================================================================
// Schubser
// =============================================================================================
export const SB_PAL = {
  body: W6.plum, hi: W6.plumHi, low: W6.plumLow, belly: 0xc8a4f0, horn: W6.horn, hornTip: W6.hornTip,
  hoof: W6.hoof, hoofHi: W6.hoofHi, hoofLow: W6.hoofLow, cheek: 0xff7ab8,
};
const SB_MOUTH = onEllipsoid(SB.c, SB.r, 0, -0.42);
const sbOpenGeo = () => cached('w6:sb:open', () => {
  const b = new Build();
  b.add(puffyGeo(mouthShape('open'), 0.04, 0.014, 16, 2), W6.mouth, placed(SB_MOUTH.p.clone().addScaledVector(SB_MOUTH.n, -0.004), SB_MOUTH.n, new THREE.Vector3(0.09, 0.075, 1)));
  stick(b, onEllipsoid(SB.c, SB.r, 0, -0.5), W6.tongue, [0.06, 0.035, 0.02], 0.15);
  return b.geometry();
});
function buildSchubser(opts = {}) {
  const size = Math.max(0.3, Number(opts.size ?? 1));
  const P = SB_PAL;
  const root = new THREE.Group();
  const own = [];
  const flash = ownMat(vcol(0.24), { emissive: 0x000000 });
  own.push(flash);
  const scaleJ = joint(); scaleJ.scale.setScalar(size);
  const pose = joint();
  const tilt = joint([0, SB.c[1], 0]);
  const inner = joint([0, -SB.c[1], 0]);
  const body = mesh(schubserBodyGeo('std', P), flash, {}, true);
  const eye = eyes(SB_EYES, { key: 'w6:sb', iris: 0xff7a1a, pupil: 0.56, depth: 0.55 });
  const brows = instMesh(browGeo(), vcol(0.5), 2, 1, 0.8);
  const open = mesh(sbOpenGeo(), vcol(0.4));
  open.visible = false;
  inner.add(body, eye, brows, open);
  tilt.add(inner);
  const feet = instMesh(schubserFootGeo(P), vcol(0.34), 2, 1, 0.2);
  feet.castShadow = true;
  pose.add(tilt, feet);
  scaleJ.add(pose);
  const puffs = new Puffs(10, 0xf4ecff, { opacity: 0.85, radius: 3, cy: 0.4 });
  own.push(puffs);
  const dizzy = dizzyStars(0.32, 0.075);
  root.add(scaleJ, puffs.mesh, dizzy);
  const clk = new Clock(), blink = new Blinker();
  let phase = Math.random() * TAU, lean = 0, emit = 0, worry = 0, angry = 0.6, spin = 0, gone = 0, scrape = 0;
  root.userData.radius = SB.r[0] * size;
  root.userData.front = (out = new THREE.Vector3()) => { root.updateMatrixWorld(true); return inner.localToWorld(out.set(0.52, 0.42, 0)); };
  const update = (dt, st) => {
    let anim = st.anim ?? 'idle';
    if (!['idle', 'walk', 'charge', 'skid', 'pushed', 'fall', 'defeated'].includes(anim)) anim = 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    const charge = anim === 'charge', walk = anim === 'walk', skid = anim === 'skid', pushed = anim === 'pushed', fall = anim === 'fall', dead = anim === 'defeated';
    const speed = st.speed ?? (charge ? 5 : walk ? 1.5 : 0);
    if (walk || charge) phase += dt * (5 + speed * (charge ? 2.6 : 3));
    if (fall) phase += dt * 22;
    // Haltung
    let tz = 0, tx = 0, ty = 0, sy = 1;
    if (anim === 'idle') { sy = 1 + Math.sin(t * 2.6) * 0.025; scrape = (t % 3.2) < 0.9 ? 1 : 0; tz = -0.05 * scrape; }
    else if (walk) { tx = Math.sin(phase) * 0.09; ty = Math.abs(Math.cos(phase)) * 0.035; tz = -0.06; }
    else if (charge) { tz = -0.38; tx = Math.sin(phase) * 0.05; ty = Math.abs(Math.cos(phase)) * 0.05; }
    else if (skid) { tz = 0.3 + Math.sin(t * 38) * 0.02; ty = Math.sin(t * 45) * 0.01; }
    else if (pushed) { const p = prog(st, clk, 0.5); tz = Math.sin(Math.min(1, p * 1.6) * Math.PI) * 0.75 + (p > 0.62 ? Math.sin((p - 0.62) * 30) * 0.08 * (1 - p) : 0); ty = Math.sin(p * Math.PI) * 0.12; }
    else if (fall) { tz = Math.sin(t * 5) * 0.25; tx = Math.cos(t * 4) * 0.2; }
    lean = damp(lean, tz, charge || skid ? 14 : 9, dt);
    tilt.rotation.z = lean; tilt.rotation.x = damp(tilt.rotation.x, tx, 12, dt);
    tilt.position.y = SB.c[1] + ty;
    // Besiegt: dreht sich, schrumpft
    if (dead) { const p = prog(st, clk, 0.8); spin += dt * (10 + p * 20); gone = smoothstep((p - 0.2) / 0.8); if (clk.entered || (p > 0.25 && emit <= 0 && p < 0.7)) { puffs.burst([0, 0.45 * size, 0], { count: 6, speed: 1.6, up: 0.8, size: 0.25 * size, life: 0.7, spread: 0.3 }); emit = 0.15; } }
    else { spin = damp(spin, 0, 10, dt); gone = 0; }
    pose.rotation.y = spin;
    const sc = 1 - gone;
    pose.scale.set(sc, Math.max(0.001, sc * sy), sc);
    pose.visible = sc > 0.01;
    // Hufe
    for (let i = 0; i < 2; i++) {
      const s = i ? -1 : 1;
      const ph = phase + i * Math.PI;
      let x = 0.04, y = 0, rz = 0;
      if (walk || charge) { const a = charge ? 0.17 : 0.11; x += Math.sin(ph) * a; rz = -Math.sin(ph) * 0.4; y = Math.max(0, Math.cos(ph)) * (charge ? 0.1 : 0.06); }
      else if (skid) { x = 0.16; rz = -0.35; y = 0.01; }
      else if (anim === 'idle' && i === 0 && scrape) { x = 0.04 - Math.abs(Math.sin(t * 9)) * 0.12; rz = 0.2; y = 0.02; }
      else if (fall) { x = Math.sin(ph) * 0.12; y = 0.05 + Math.cos(ph) * 0.06; rz = Math.sin(ph) * 0.8; }
      else if (pushed) { x = 0.1; rz = -0.5; y = 0.03; }
      setInst(feet, i, x, y, s * 0.2, 0, s * 0.08, rz);
    }
    feet.instanceMatrix.needsUpdate = true;
    // Staub, Dampf
    emit -= dt;
    if (emit <= 0 && !dead) {
      if (charge) { puffs.burst([0.5 * size, 0.3 * size, 0], { count: 1, speed: 0.5, up: 0.3, size: 0.09 * size, life: 0.5, spread: 0.05 }); puffs.burst([-0.35 * size, 0.06, 0], { count: 2, speed: 0.6, up: 0.5, size: 0.13 * size, life: 0.5, spread: 0.15 }); emit = 0.1; }
      else if (skid) { puffs.burst([0.35 * size, 0.05, 0], { count: 3, speed: 1.6, up: 0.9, size: 0.14 * size, life: 0.55, spread: 0.25 }); emit = 0.07; }
      else if (anim === 'idle' && (t % 2.4) < 0.05) { puffs.burst([0.5 * size, 0.42 * size, 0], { count: 2, speed: 0.6, up: 0.35, size: 0.07 * size, life: 0.6, spread: 0.04 }); emit = 0.3; }
    }
    puffs.step(dt);
    // Brauen, Augen, Maul
    worry = damp(worry, pushed || fall ? 1 : 0, 12, dt);
    angry = damp(angry, charge ? 1 : skid ? 0.2 : pushed || fall ? 0 : 0.6, 10, dt);
    for (const b of SB_BROWS) {
      _e.set(-b.s * (angry * 0.55 - worry * 0.5), -b.s * 0.32, 0, 'YXZ');
      brows.setMatrixAt(b.s > 0 ? 0 : 1, _m.compose(_v.copy(b.p).setY(b.p.y + worry * 0.03 - angry * 0.015), _q.setFromEuler(_e), _s.setScalar(1)));
    }
    brows.instanceMatrix.needsUpdate = true;
    open.visible = fall || skid || pushed;
    let bk = blink.update(dt);
    if (pushed || dead) bk = 0.12; else if (charge) bk = 0.72; else if (fall || skid) bk = 1;
    eye.userData.blink(bk);
    eye.scale.setScalar(fall ? 1.12 : 1);
    flash.emissive.setScalar(pushed ? Math.max(0, 0.22 - prog(st, clk, 0.5) * 0.44) : 0);
    dizzy.visible = dead && gone < 0.6;
    if (dizzy.visible) { dizzy.position.y = 1.0 * size; dizzy.rotation.y = t * 4; }
  };
  return makeModel('schubser', root, update, [...own, feet, brows], { initial: 'idle' });
}

// =============================================================================================
// Pustewolke
// =============================================================================================
const PW_PUFFS = [
  [0, 0.56, 0, 0.5], [-0.05, 0.5, 0.42, 0.34], [-0.05, 0.5, -0.42, 0.34], [-0.36, 0.6, 0, 0.4], [-0.1, 0.88, 0.18, 0.3],
  [-0.12, 0.86, -0.2, 0.28], [0.12, 0.3, 0.28, 0.26], [0.12, 0.3, -0.28, 0.26], [-0.3, 0.32, 0, 0.3], [-0.35, 0.7, 0.36, 0.24], [-0.35, 0.7, -0.36, 0.24],
];
const PW_EYES = [1, -1].map((s) => ({ p: [0.47, 0.74, s * 0.155], r: 0.105, sy: 1.25, dir: [1, 0.12, s * 0.42] }));
function pwHatGeo() {
  return cached('w6:pw:hat', () => {
    const b = new Build();
    // Pudelmütze: blau-weiß gestreift, Umschlag, Bommel
    b.dome(1, { v: (x, y, z) => (Math.floor((y + 0.02) / 0.075) % 2 ? col(0xffffff) : col(0x3a8aff)) }, { p: [0, 0.03, 0], s: [0.27, 0.3, 0.27] }, Math.PI / 2, 24, 10);
    b.torus(0.265, 0.06, gradV(0x1a5ad8, 0x6ab0ff), { p: [0, 0.04, 0], r: [Math.PI / 2, 0, 0] }, 8, 26);
    for (const d of fibDirs(7, 0.5)) b.sphere(0.05, 0xffffff, { p: [d.x * 0.065, 0.37 + d.y * 0.065, d.z * 0.065] }, 8, 6);
    b.sphere(0.085, 0xf4f8ff, { p: [0, 0.37, 0] }, 14, 10);
    return b.geometry();
  });
}
function pwBodyGeo() {
  return cached('w6:pw:body', () => {
    const b = new Build();
    const g = cloudGeo('pw', PW_PUFFS, { ws: 15, hs: 10, lo: 0xb0b4f0, mid: 0xdcdeff, hi: 0xffffff });
    b.parts.push(g.clone());
    // Mütze (leicht nach hinten gekippt)
    const hat = pwHatGeo().clone();
    hat.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(-0.1, 0.98, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.22)), new THREE.Vector3(1, 1, 1)));
    b.parts.push(hat);
    // kleine Wolken-Ärmchen
    for (const s of [1, -1]) b.sphere(0.13, { v: (x, y, z, nx, ny) => mix(0xc8ccf4, 0xffffff, smoothstep(ny * 0.6 + 0.5)) }, { p: [0.12, 0.42, s * 0.6], s: [1, 0.85, 1] }, 12, 8);
    return b.geometry();
  });
}
const pwCheekGeo = () => cached('w6:pw:cheek', () => new Build().sphere(1, { v: (x, y, z, nx, ny) => mix(0xffb8d4, 0xffeef6, smoothstep(ny * 0.5 + nx * 0.4 + 0.2)) }, {}, 16, 12).geometry());
const pwSmileGeo = () => cached('w6:pw:smile', () => new Build().add(puffyGeo(mouthShape('smile'), 0.03, 0.01, 12, 2), W6.mouth, { p: [0.5, 0.5, 0], r: [0, Math.PI / 2, 0], s: [0.08, 0.06, 1] }).geometry());
const pwOGeo = () => cached('w6:pw:o', () => {
  const b = new Build();
  b.torus(1, 0.32, gradV(0xff4a7a, 0xff9ab8), { p: [0, 0, 0], r: [0, Math.PI / 2, 0], s: [1, 1.15, 1] }, 10, 20);
  b.sphere(1, W6.mouth, { p: [-0.1, 0, 0], s: [0.25, 0.85, 0.75] }, 12, 8);
  return b.geometry();
});
const pwStreakGeo = () => cached('w6:pw:streak', () => {
  // Windfahne: geschwungenes, sich verjüngendes Band von x = 0 bis 1 (Mitte), flach
  const g = taperTube([[0, 0, 0], [0.3, 0.06, 0.02], [0.62, -0.04, -0.02], [1, 0.03, 0]], (t) => 0.05 * Math.sin(Math.PI * Math.min(1, t * 1.05)) + 0.006, 20, 5);
  g.scale(1, 1, 0.35);
  return g;
});
function buildPustewolke() {
  const root = new THREE.Group();
  const own = [];
  const flash = ownMat(vcol(0.55, {}, 'w6pw'), { emissive: 0x000000 });
  own.push(flash);
  const pose = joint();
  const sway = joint([0, 0.55, 0]);
  const inner = joint([0, -0.55, 0]);
  const body = mesh(pwBodyGeo(), flash, {}, true);
  const eye = eyes(PW_EYES, { key: 'w6:pw', iris: 0x2a8ae8, pupil: 0.6, depth: 0.5 });
  const cheeks = instMesh(pwCheekGeo(), vcol(0.4), 2, 1.2, 0.5);
  const brows = instMesh(browGeo(0x3a2a6a, 0.02, 0.09), vcol(0.5), 2, 1.2, 0.8);
  const smile = mesh(pwSmileGeo(), vcol(0.4));
  const oMouth = joint([0.5, 0.48, 0], mesh(pwOGeo(), vcol(0.35)));
  inner.add(body, eye, cheeks, brows, smile, oMouth);
  sway.add(inner);
  pose.add(sway);
  const streakMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false });
  own.push(streakMat);
  const streaks = instMesh(pwStreakGeo(), streakMat, 6, 4, 0.5);
  streaks.frustumCulled = false;
  const snow = new Puffs(8, 0xffffff, { opacity: 0.9, radius: 5, cy: 0.6 });
  own.push(snow);
  root.add(pose, streaks, snow.mesh);
  const clk = new Clock(), blink = new Blinker();
  let puff = 0, wind = 0, squash = 0, emit = 0, fade = 0, angry = 0;
  root.userData.wind = 0; root.userData.reach = 0;
  const lanes = [[0.0, 0.0], [0.18, 0.3], [-0.15, -0.28], [0.08, 0.14], [-0.05, -0.12], [0.25, -0.05]];
  const update = (dt, st) => {
    let anim = st.anim ?? 'idle';
    if (!['idle', 'inhale', 'blow', 'hit', 'defeated'].includes(anim)) anim = 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    const power = clamp(st.power ?? (anim === 'blow' ? 1 : 0), 0, 1);
    let pTarget = 0, wTarget = 0, sq = 0;
    if (anim === 'inhale') { const p = prog(st, clk, 0.7); pTarget = smoothstep(p); }
    else if (anim === 'blow') { const p = clamp(clk.age / 0.5, 0, 1); pTarget = 0.6 * (1 - p) + 0.25; wTarget = power; sq = 1; }
    puff = damp(puff, pTarget, 8, dt);
    wind = damp(wind, wTarget, anim === 'blow' ? 6 : 4, dt);
    squash = damp(squash, sq, 10, dt);
    root.userData.wind = wind; root.userData.reach = wind * 4;
    // Körper: Schweben, Aufblähen, beim Pusten nach vorn gestaucht, wabbeln bei Treffer
    const hitP = anim === 'hit' ? prog(st, clk, 0.5) : 1;
    const wob = anim === 'hit' ? Math.sin(hitP * 30) * 0.12 * (1 - hitP) : 0;
    const s0 = 1 + puff * 0.13 + Math.sin(t * 2.2) * 0.015;
    sway.scale.set(s0 * (1 - squash * 0.08 + wob), s0 * (1 + squash * 0.04 - wob), s0 * (1 + squash * 0.06 + wob));
    sway.rotation.z = Math.sin(t * 1.3) * 0.05 + (anim === 'blow' ? -0.08 : anim === 'inhale' ? 0.1 * puff : 0);
    pose.position.y = Math.sin(t * 1.9) * 0.06;
    // Besiegt: zerfasert
    if (anim === 'defeated') {
      const p = prog(st, clk, 0.9);
      if (clk.entered) snow.burst([0, 0.6, 0], { count: 8, speed: 2.2, up: 0.8, size: 0.28, life: 0.9, spread: 0.6, force: true });
      fade = smoothstep(p * 1.6);
    } else fade = 0;
    pose.scale.setScalar(Math.max(0.001, 1 - fade));
    pose.visible = fade < 0.99;
    // Backen
    const ck = 1 + puff * 0.75 - (anim === 'blow' ? 0.1 : 0);
    for (let i = 0; i < 2; i++) {
      const s = i ? -1 : 1;
      setInst(cheeks, i, 0.43 + puff * 0.02, 0.54, s * (0.27 + puff * 0.04), 0, 0, 0, [0.13 * ck, 0.115 * ck, 0.13 * ck]);
    }
    cheeks.instanceMatrix.needsUpdate = true;
    // Brauen
    angry = damp(angry, anim === 'blow' ? 1 : anim === 'inhale' ? 0.6 : 0, 8, dt);
    for (let i = 0; i < 2; i++) {
      const s = i ? -1 : 1;
      _e.set(-s * angry * 0.5, -s * 0.3, 0, 'YXZ');
      brows.setMatrixAt(i, _m.compose(_v.set(0.47, 0.9 - angry * 0.02, s * 0.16), _q.setFromEuler(_e), _s.setScalar(1)));
    }
    brows.instanceMatrix.needsUpdate = true;
    // Mund
    const oOn = anim === 'blow' || anim === 'inhale';
    smile.visible = !oOn;
    oMouth.visible = oOn;
    const os = anim === 'blow' ? 0.07 + wind * 0.03 : 0.035;
    oMouth.scale.set(os, os * (anim === 'blow' ? 1.05 : 0.8), os);
    // Windfahnen
    const reach = 0.6 + wind * 3.6;
    streaks.visible = wind > 0.04;
    streakMat.opacity = 0.75 * smoothstep(wind * 2);
    for (let i = 0; i < lanes.length; i++) {
      const [y, z] = lanes[i];
      const k = ((t * (1.3 + wind * 1.6) + i * 0.37) % 1);
      const len = reach * (0.35 + 0.25 * Math.sin(i * 1.7) ** 2);
      const x = 0.5 + k * reach;
      const fadeK = Math.sin(k * Math.PI);
      setInst(streaks, i, x, 0.48 + pose.position.y + y * (0.6 + k * 0.8), z * (1 + k * 1.2), 0, 0, Math.sin(t * 3 + i) * 0.1, [len * fadeK + 0.001, 0.7 + k, 1]);
    }
    streaks.instanceMatrix.needsUpdate = true;
    emit -= dt;
    if (anim === 'blow' && wind > 0.2 && emit <= 0) { snow.burst([0.85, 0.5 + pose.position.y, 0], { count: 2, speed: 2.5 + wind * 3, up: 0.2, size: 0.028, life: 0.8, spread: 0.15, grow: 0.5 }); emit = 0.06; }
    snow.step(dt);
    // Treffer-Blitz, Augen
    flash.emissive.setScalar(anim === 'hit' ? (Math.sin(clk.age * 40) > 0 ? 0.35 : 0) * (1 - hitP) : 0);
    let bk = blink.update(dt);
    if (anim === 'hit' || anim === 'defeated') bk = 0.1; else if (anim === 'inhale') bk = 0.55 + (1 - puff) * 0.3; else if (anim === 'blow') bk = 0.8;
    eye.userData.blink(bk);
  };
  return makeModel('pustewolke', root, update, [...own, cheeks, brows, streaks], { initial: 'idle' });
}

// =============================================================================================
// Glotzfisch
// =============================================================================================
const GF_COLORS = {
  blau: { body: 0x2f5ae8, hi: 0x8ab4ff, low: 0x1a2a8a, belly: 0xfff4ea, fin: 0xff9a1a, finHi: 0xffe07a, lip: 0xff5a8a, spot: 0xbcd8ff },
  gelb: { body: 0xffb81a, hi: 0xfff08a, low: 0xd8700a, belly: 0xfff8ee, fin: 0x2fb8e8, finHi: 0xa8ecff, lip: 0xff5a7a, spot: 0xffffff },
  rosa: { body: 0xff6ab0, hi: 0xffc0e0, low: 0xc0306a, belly: 0xfff4f8, fin: 0x7a5aff, finHi: 0xc8b8ff, lip: 0xff2a5a, spot: 0xffffff },
};
const GF = { c: [0, 0.3, 0], r: [0.36, 0.29, 0.26] };
function gfBodyGeo(key) {
  const C = GF_COLORS[key];
  return cached(`w6:gf:body:${key}`, () => {
    const b = new Build();
    b.sphere(1, { v: (x, y, z, nx, ny) => mix(mix(C.low, C.body, smoothstep(ny * 0.7 + 0.5)), C.belly, smoothstep((-ny - 0.15) / 0.35)) }, { p: GF.c, s: GF.r }, 32, 22);
    // Tupfen
    for (const [az, el] of [[0.6, 0.35], [-0.6, 0.35], [1.6, 0.25], [-1.6, 0.25], [2.4, 0.4], [-2.4, 0.4], [1.0, 0.1], [-1.0, 0.1], [2.0, 0.05], [-2.0, 0.05]]) stick(b, onEllipsoid(GF.c, GF.r, az, el), C.spot, [0.035, 0.035, 0.015], 0.35);
    // Augenringe obenauf (die Augen sitzen darin)
    for (const s of [1, -1]) b.torus(0.125, 0.04, gradV(C.low, C.hi), { p: [0.12, 0.5, s * 0.12], r: [Math.PI / 2 - 0.35, s * 0.35, 0], order: 'YXZ' }, 8, 24);
    for (const s of [1, -1]) b.sphere(1, C.body, { p: [0.1, 0.47, s * 0.12], s: [0.12, 0.08, 0.12] }, 16, 10);
    // Schmollmund
    b.torus(0.07, 0.035, gradV(C.lip, 0xffc0d4), { p: [0.355, 0.26, 0], r: [0, Math.PI / 2, 0], s: [1, 0.8, 1] }, 10, 20);
    b.sphere(1, W6.mouth, { p: [0.36, 0.26, 0], s: [0.02, 0.045, 0.05] }, 10, 6);
    // Rückenflosse (gezackt)
    const fs = new THREE.Shape();
    fs.moveTo(-0.22, 0); fs.lineTo(-0.2, 0.1); fs.lineTo(-0.14, 0.06); fs.lineTo(-0.1, 0.16); fs.lineTo(-0.04, 0.08); fs.lineTo(0.0, 0.17); fs.lineTo(0.05, 0.06); fs.lineTo(0.08, 0); fs.closePath();
    b.add(puffyGeo(fs, 0.03, 0.015, 4, 2), { v: (x, y) => mix(C.fin, C.finHi, smoothstep(y / 0.17)) }, { p: [-0.05, 0.55, 0] });
    // Wangen
    for (const s of [1, -1]) stick(b, onEllipsoid(GF.c, GF.r, s * 0.6, -0.15), W6.cheek, [0.05, 0.03, 0.015], 0.3);
    return b.geometry();
  });
}
function gfTailGeo(key) {
  const C = GF_COLORS[key];
  return cached(`w6:gf:tail:${key}`, () => {
    const b = new Build();
    const lobe = new THREE.Shape();
    lobe.moveTo(0, 0); lobe.quadraticCurveTo(-0.1, 0.12, -0.24, 0.2); lobe.quadraticCurveTo(-0.2, 0.06, -0.12, 0.0); lobe.quadraticCurveTo(-0.2, -0.06, -0.24, -0.2); lobe.quadraticCurveTo(-0.1, -0.12, 0, 0);
    b.add(puffyGeo(lobe, 0.03, 0.02, 12, 3), { v: (x, y) => mix(C.fin, C.finHi, smoothstep(Math.abs(y) / 0.2 + (-x) * 1.5)) }, {});
    b.sphere(0.06, C.body, { s: [1.2, 0.9, 0.6] }, 12, 8);
    return b.geometry();
  });
}
const gfPecGeo = (key) => cached(`w6:gf:pec:${key}`, () => new Build().sphere(1, gradV(GF_COLORS[key].fin, GF_COLORS[key].finHi), { p: [-0.04, 0, 0.08], s: [0.08, 0.02, 0.11] }, 12, 8).geometry());
const gfOpenGeo = () => cached('w6:gf:open', () => new Build().sphere(1, W6.mouth, { p: [0.37, 0.25, 0], s: [0.03, 0.075, 0.075] }, 12, 8).sphere(1, W6.tongue, { p: [0.375, 0.21, 0], s: [0.02, 0.025, 0.045] }, 8, 6).geometry());
function buildGlotzfisch(opts = {}) {
  const key = GF_COLORS[opts.color] ? opts.color : 'blau';
  const root = new THREE.Group();
  const own = [];
  const pose = joint([0, GF.c[1], 0]);
  const inner = joint([0, -GF.c[1], 0]);
  const body = mesh(gfBodyGeo(key), vcol(0.26), {}, true);
  const eye = eyes([1, -1].map((s) => ({ p: [0.15, 0.56, s * 0.12], r: 0.115, sy: 1.1, dir: [0.75, 0.55, s * 0.32] })), { key: 'w6:gf', iris: 0x1a8a5a, pupil: 0.42, depth: 0.85 });
  const tail = joint([-0.34, 0.3, 0], mesh(gfTailGeo(key), vcol(0.3), {}, true));
  const pecs = instMesh(gfPecGeo(key), vcol(0.3), 2, 1, 0.3);
  const open = mesh(gfOpenGeo(), vcol(0.4));
  open.visible = false;
  inner.add(body, eye, tail, pecs, open);
  pose.add(inner);
  const bubbles = new Puffs(6, 0xe0f8ff, { opacity: 0.7, radius: 2, cy: 0.4 });
  own.push(bubbles);
  root.add(pose, bubbles.mesh);
  const clk = new Clock(), blink = new Blinker();
  let roll = 0, emit = 0;
  const update = (dt, st) => {
    let anim = st.anim ?? 'swim';
    if (anim === 'idle') anim = 'swim';
    if (!['swim', 'jump', 'defeated'].includes(anim)) anim = 'swim';
    clk.tick(dt, anim);
    const t = clk.t;
    const speed = st.speed ?? (anim === 'swim' ? 1.5 : 0);
    let pitch = 0, spread = 0, wag = Math.sin(t * (6 + speed * 3)) * 0.4, bob = Math.sin(t * 2.5) * 0.02;
    if (anim === 'jump') {
      const p = prog(st, clk, 1, true);
      pitch = (0.5 - p) * 1.6; spread = 1; wag = Math.sin(t * 18) * 0.35; bob = 0;
      if ((p < 0.06 || p > 0.94) && emit <= 0) { bubbles.burst([0, 0.1, 0], { count: 3, speed: 1.4, up: 1.6, size: 0.08, life: 0.5, spread: 0.2 }); emit = 0.1; }
    }
    const dead = anim === 'defeated';
    roll = damp(roll, dead ? Math.PI : 0, 6, dt);
    pose.rotation.z = damp(pose.rotation.z, pitch, anim === 'jump' ? 20 : 6, dt);
    pose.rotation.x = roll;
    pose.position.y = GF.c[1] + bob + (dead ? Math.sin(t * 2) * 0.03 : 0);
    tail.rotation.y = dead ? Math.sin(t * 3) * 0.1 : wag;
    for (let i = 0; i < 2; i++) {
      const s = i ? -1 : 1;
      const flap = dead ? 0 : Math.sin(t * 7 + i * Math.PI) * 0.35;
      _e.set(s * (0.5 + spread * 0.6 + flap), s > 0 ? -0.5 : Math.PI + 0.5, 0, 'YXZ');
      pecs.setMatrixAt(i, _m.compose(_v.set(0.05, 0.24, s * 0.24), _q.setFromEuler(_e), _s.setScalar(1)));
    }
    pecs.instanceMatrix.needsUpdate = true;
    open.visible = anim === 'jump';
    emit -= dt;
    if (anim === 'swim' && emit <= 0 && (t % 2.2) < 0.05) { bubbles.burst([0.4, 0.35, 0], { count: 2, speed: 0.3, up: 0.6, size: 0.05, life: 0.9, spread: 0.03 }); emit = 0.4; }
    bubbles.step(dt);
    let bk = blink.update(dt);
    if (dead) bk = 0.1; else if (anim === 'jump') bk = 1;
    eye.userData.blink(bk);
    eye.scale.setScalar(anim === 'jump' ? 1.1 : 1);
  };
  return makeModel('glotzfisch', root, update, [...own, pecs], { initial: 'swim' });
}

// =============================================================================================
// Stachelwerfer (Igel)
// =============================================================================================
const IG = {
  quill: 0x8a4a22, quillHi: 0xc8783a, quillLow: 0x4a2410, tip: 0xfff2d8, face: 0xffe2c0, faceHi: 0xfff4e4, faceLow: 0xe8b88a,
  nose: 0x2a1418, scarf: 0xe8283a, scarfHi: 0xff7a6a, paw: 0x6a3418, pawHi: 0xa86a3a, cheek: 0xff8a9a,
};
const IG_PROF = [[0, 0.1], [0.2, 0.11], [0.3, 0.18], [0.36, 0.3], [0.37, 0.44], [0.34, 0.58], [0.28, 0.7], [0.18, 0.79], [0.08, 0.83], [0, 0.84]];
const IG_C = [0, 0.47, 0];
const IG_EYES = [1, -1].map((s) => { const h = onLathe(IG_PROF, 0.47, s * 0.36, 0.36); return { p: h.p.toArray(), r: 0.078, sy: 1.3, dir: h.n.clone().lerp(new THREE.Vector3(1, 0.1, 0), 0.35).toArray() }; });
function igBodyGeo() {
  return cached('w6:ig:body', () => {
    const b = new Build();
    // Körper: vorn heller Bauch/Gesicht, hinten Stachelkleid-Grund
    b.lathe(IG_PROF, { v: (x, y, z, nx, ny) => {
      const front = smoothstep((nx - 0.28) / 0.3) * (1 - smoothstep((ny - 0.55) / 0.25));
      return mix(mix(IG.quillLow, IG.quill, smoothstep(ny * 0.5 + 0.5)), mix(IG.faceLow, IG.faceHi, smoothstep(ny * 0.4 + 0.6)), front);
    } }, null, 32, 2);
    // Stacheln über Rücken und Scheitel
    const R = new THREE.Vector3(0.36, 0.37, 0.36);
    for (const d of fibDirs(110, 0.3)) {
      if (d.x > 0.4 || d.y < -0.45 || (d.x > 0.1 && d.y < 0.55 && Math.abs(d.z) < 0.75)) continue;
      const p = new THREE.Vector3(IG_C[0] + d.x * R.x * 0.92, IG_C[1] + d.y * R.y * 0.95, IG_C[2] + d.z * R.z * 0.92);
      const dir = d.clone().add(new THREE.Vector3(-0.35, 0.25, 0)).normalize();
      const g = new THREE.ConeGeometry(0.055, 0.26, 6, 2);
      g.rotateX(Math.PI / 2); g.translate(0, 0, 0.13);
      b.add(g, { v: (x, y, z) => mix(IG.quillHi, IG.tip, smoothstep((z - 0.12) / 0.14)) }, placed(p, dir, new THREE.Vector3(1, 1, 1)));
    }
    // Schnauze, Nase
    b.sphere(1, { v: (x, y, z, nx, ny) => mix(IG.faceLow, IG.faceHi, smoothstep(ny * 0.5 + 0.6)) }, { p: [0.31, 0.47, 0], s: [0.14, 0.1, 0.12] }, 18, 12);
    b.sphere(0.055, IG.nose, { p: [0.45, 0.5, 0] }, 12, 8);
    b.sphere(0.018, 0xffffff, { p: [0.48, 0.525, -0.02] }, 6, 4);
    // Mund
    b.torus(0.04, 0.011, W6.mouth, { p: [0.43, 0.42, 0], r: [0, Math.PI / 2, Math.PI], s: [1, 0.7, 1] }, 5, 12, Math.PI);
    // Wangen, Öhrchen
    for (const s of [1, -1]) {
      b.sphere(1, IG.cheek, { p: [0.28, 0.45, s * 0.2], s: [0.03, 0.035, 0.05] }, 8, 6);
      b.sphere(1, IG.faceLow, { p: [0.05, 0.76, s * 0.2], s: [0.05, 0.065, 0.035], r: [s * 0.4, 0, 0] }, 10, 8);
      b.sphere(1, 0xffb0b8, { p: [0.075, 0.76, s * 0.2], s: [0.02, 0.045, 0.025], r: [s * 0.4, 0, 0] }, 8, 6);
    }
    // rotes Halstuch mit Zipfel
    b.torus(0.3, 0.05, gradV(IG.scarf, IG.scarfHi), { p: [0.02, 0.3, 0], r: [Math.PI / 2, 0, 0], s: [1.05, 1, 1] }, 8, 30);
    b.add(new THREE.ConeGeometry(0.1, 0.18, 4), IG.scarf, { p: [0.28, 0.22, 0.06], r: [0, 0.4, Math.PI - 0.3], s: [1, 1, 0.35] });
    return b.geometry();
  });
}
const igArmGeo = () => cached('w6:ig:arm', () => new Build().capsule(0.055, 0.32, gradV(IG.quill, IG.quillHi), { p: [0, -0.18, 0] }, 3, 10).sphere(0.068, IG.faceLow, { p: [0, -0.38, 0] }, 10, 8).geometry());
const igFootGeo = () => cached('w6:ig:foot', () => new Build().sphere(1, gradV(IG.paw, IG.pawHi), { p: [0.04, 0.055, 0], s: [0.12, 0.065, 0.085] }, 14, 10).geometry());
function buildStachelwerfer(opts = {}) {
  const ballD = Math.max(0.2, Number(opts.ball ?? 0.55));
  const root = new THREE.Group();
  const own = [];
  const flash = ownMat(vcol(0.38), { emissive: 0x000000 });
  own.push(flash);
  const pose = joint();
  const tilt = joint([0, 0.45, 0]);
  const inner = joint([0, -0.45, 0]);
  const body = mesh(igBodyGeo(), flash, {}, true);
  const eye = eyes(IG_EYES, { key: 'w6:ig', iris: 0x5a2a0a, pupil: 0.62, depth: 0.5 });
  const arms = [1, -1].map((s) => joint([0.1, 0.55, s * 0.3], mesh(igArmGeo(), flash, {}, true)));
  const ballJ = joint([0.05, 1.12, 0]);
  const ball = mesh(spikeBallGeo('lila', true), spikeMat(), {}, true);
  ball.scale.setScalar(ballD);
  ballJ.add(ball);
  const glint = sparkleSprite(0xffe0ff, 0.5);
  ballJ.add(glint);
  inner.add(body, eye, ...arms);
  tilt.add(inner);
  const feet = instMesh(igFootGeo(), vcol(0.4), 2, 1, 0.2);
  feet.castShadow = true;
  pose.add(tilt, feet, ballJ);
  const puffs = new Puffs(8, 0xf0e8ff, { opacity: 0.85, radius: 3, cy: 0.8 });
  own.push(puffs);
  const dizzy = dizzyStars(0.28, 0.07);
  root.add(pose, puffs.mesh, dizzy);
  const clk = new Clock(), blink = new Blinker();
  let curl = 0, flat = 0, holding = true, bScale = 1;
  root.userData.holding = true;
  const update = (dt, st) => {
    let anim = st.anim ?? 'idle';
    if (!['idle', 'throw', 'hit', 'defeated'].includes(anim)) anim = 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    let aZ = 3.0, aX = 0.12, bx = 0.05, by = 1.12, ballK = 1, lean = 0;
    holding = true;
    if (anim === 'idle') {
      const k = Math.sin(t * 3);
      by = 1.12 + Math.abs(k) * 0.04; aZ = 2.98 + Math.abs(k) * 0.06; lean = Math.sin(t * 1.5) * 0.04;
    } else if (anim === 'throw') {
      const p = prog(st, clk, 0.9);
      if (p < 0.4) { ballK = smoothstep(p / 0.4); if (clk.entered) puffs.burst([0.05, 1.12, 0], { count: 5, speed: 0.8, up: 0.3, size: 0.1, life: 0.5, spread: 0.1 }); }
      else if (p < 0.62) { const k = smoothstep((p - 0.4) / 0.22); aZ = lerp(3.0, 3.4, k); bx = lerp(0.05, -0.25, k); by = lerp(1.12, 1.05, k); lean = 0.25 * k; }
      else { const k = smoothstep((p - 0.62) / 0.3); aZ = lerp(3.3, 1.1, Math.min(1, k * 2)); lean = lerp(0.25, -0.3, Math.min(1, k * 2)) * (1 - Math.max(0, k - 0.6)); holding = false; }
    } else if (anim === 'hit') { holding = false; } else if (anim === 'defeated') { holding = false; }
    curl = damp(curl, anim === 'hit' ? 1 : 0, 14, dt);
    flat = damp(flat, anim === 'defeated' ? 1 : 0, 10, dt);
    tilt.rotation.z = damp(tilt.rotation.z, lean - curl * 0.5 + flat * 1.3, 12, dt);
    tilt.scale.set(1 + curl * 0.12, 1 - curl * 0.18, 1 + curl * 0.12);
    tilt.position.y = 0.45 - flat * 0.25;
    for (let i = 0; i < 2; i++) {
      const a = arms[i], s = i ? -1 : 1;
      a.rotation.z = damp(a.rotation.z, holding || anim === 'throw' ? aZ : curl > 0.5 ? 0.4 : 0.6, anim === 'throw' ? 30 : 12, dt);
      a.rotation.x = damp(a.rotation.x, -s * (holding ? aX : 0.4), 12, dt);
    }
    bScale = damp(bScale, holding ? ballK : 0, 30, dt);
    ballJ.visible = holding && bScale > 0.02;
    ballJ.position.set(bx, by, 0);
    ball.scale.setScalar(ballD * Math.max(0.001, bScale));
    ball.rotation.y = t * 1.5;
    glint.visible = anim === 'throw' && prog(st, clk, 0.9) < 0.42;
    root.userData.holding = ballJ.visible;
    for (let i = 0; i < 2; i++) {
      const s = i ? -1 : 1;
      setInst(feet, i, 0.06, 0, s * 0.16, 0, s * 0.1, anim === 'idle' ? Math.max(0, Math.sin(t * 3 + i * Math.PI)) * 0.15 : 0);
    }
    feet.instanceMatrix.needsUpdate = true;
    puffs.step(dt);
    const hitP = anim === 'hit' ? prog(st, clk, 0.5) : 1;
    flash.emissive.setScalar(anim === 'hit' ? (Math.sin(clk.age * 40) > 0 ? 0.4 : 0) * (1 - hitP) : 0);
    let bk = blink.update(dt);
    if (anim === 'hit' || anim === 'defeated') bk = 0.1; else if (anim === 'throw') bk = 0.85;
    eye.userData.blink(bk);
    dizzy.visible = anim === 'defeated';
    if (dizzy.visible) { dizzy.position.set(0.25, 0.5, 0); dizzy.rotation.y = t * 4; }
  };
  const model = makeModel('stachelwerfer', root, update, [...own, feet], { initial: 'idle' });
  model.hand = (out = new THREE.Vector3()) => { root.updateMatrixWorld(true); return ballJ.getWorldPosition(out); };
  return model;
}

// =============================================================================================
// Hammer-/Bumerang-Werfer (vorhandene Werfer-Familie)
// =============================================================================================
function werferAlias(kind, name) {
  return (opts = {}) => {
    const m = W2W.feuer_werfer({ ...opts, kind });
    m.root.name = `modell:${name}`;
    m.root.userData.modelName = name;
    const up = m.update;
    m.update = (dt, state) => {
      const st = S(state);
      up(dt, st.anim === 'defeated' ? { ...st, anim: 'squashed' } : st);
    };
    return m;
  };
}

// =============================================================================================
// Wuschel-Horde
// =============================================================================================
function buildWuschelHorde(opts = {}) {
  const N = clamp(Math.round(opts.count ?? 24), 1, 64);
  const W = Math.max(0.5, opts.width ?? 6), D = Math.max(0.5, opts.depth ?? 2.5), H = Math.max(0, opts.height ?? 1.4);
  const root = new THREE.Group();
  const horde = instMesh(wuschelLoGeo(), vcol(0.55, {}, 'fur'), N, Math.max(W, D) / 2 + 2, H / 2 + 0.5);
  horde.castShadow = true;
  horde.frustumCulled = false;
  root.add(horde);
  // feste Plätze im Oval
  const P = Array.from({ length: N }, (_, i) => {
    const a = hash1(i * 3.3 + 1) * TAU, r = Math.sqrt(hash1(i * 7.1 + 2));
    return { x: Math.cos(a) * r * D / 2, z: Math.sin(a) * r * W / 2, y: hash1(i * 1.9 + 5) * H, ph: hash1(i * 2.7) * TAU, s: 0.8 + hash1(i * 5.3) * 0.45 };
  });
  const clk = new Clock();
  let surge = 0;
  const update = (dt, st) => {
    const anim = st.anim === 'chase' ? 'chase' : 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    const speed = st.speed ?? (anim === 'chase' ? 3 : 0.5);
    surge = damp(surge, anim === 'chase' ? 1 : 0, 3, dt);
    const n = clamp(Math.round(st.count ?? N), 0, N);
    horde.count = n;
    for (let i = 0; i < n; i++) {
      const p = P[i];
      const w = t * (2.2 + speed * 0.5) + p.ph;
      const x = p.x + Math.sin(w * 0.7) * 0.25 + surge * Math.sin(t * 1.3 + p.ph * 2) * D * 0.18;
      const z = p.z + Math.cos(w * 0.6) * 0.2;
      const y = p.y + Math.abs(Math.sin(w * 1.7)) * 0.18 + (surge ? Math.sin(w) * 0.1 * surge : 0);
      setInst(horde, i, x, y, z, Math.sin(w * 1.3) * 0.25, Math.sin(w * 0.5) * 0.3, Math.sin(w * 1.1) * 0.25 - surge * 0.15, p.s * (1 + Math.sin(w * 4) * 0.04));
    }
    horde.instanceMatrix.needsUpdate = true;
  };
  return makeModel('wuschel_horde', root, update, [horde], { initial: 'idle' });
}

// =============================================================================================
// Wirbelbrocken-Attrappe
// =============================================================================================
function buildAttrappe(opts = {}) {
  const wb = W2B.wirbelbrocken(opts);
  const root = new THREE.Group();
  const holder = joint();
  holder.add(wb.root);
  const smoke = new Puffs(12, 0xc8a8ff, { opacity: 0.85, radius: 3, cy: 1 });
  root.add(holder, smoke.mesh);
  const clk = new Clock();
  let last = '';
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    if (anim === 'poof') {
      const p = prog(st, clk, 0.5);
      if (last !== 'poof') smoke.burst([0, 1.0, 0], { count: 12, speed: 2.6, up: 1.2, size: 0.4, life: 0.8, spread: 0.6, force: true });
      const k = smoothstep(p * 1.4);
      holder.scale.setScalar(Math.max(0.001, 1 - k));
      holder.rotation.y += dt * 18;
      holder.visible = k < 0.99;
      wb.update(dt, { anim: 'hit', progress: 0.1 });
    } else {
      holder.scale.setScalar(1); holder.rotation.y = 0; holder.visible = true;
      wb.update(dt, st);
    }
    last = anim;
    smoke.step(dt);
  };
  const model = makeModel('wirbelbrocken_attrappe', root, update, [smoke, wb], { initial: 'idle' });
  return model;
}

export const MODELS = {
  schubser: buildSchubser,
  pustewolke: buildPustewolke,
  glotzfisch: buildGlotzfisch,
  stachelwerfer: buildStachelwerfer,
  hammer_werfer: werferAlias('hammer', 'hammer_werfer'),
  bumerang_werfer: werferAlias('bumerang', 'bumerang_werfer'),
  wuschel_horde: buildWuschelHorde,
  wirbelbrocken_attrappe: buildAttrappe,
};
