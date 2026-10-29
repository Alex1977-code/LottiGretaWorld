// Gegner-Modelle der Bonuswelten (Präzisierung Gegner Bonuswelten): Krakenpilz (S-2, P-6, K-1) mit seinem Steinchen, Tintling
// (S-7, B-7), Stachelkugler (P-1, P-2). Eigene Gestaltung im Spielzeug-Look, große Augen, lustig – nie erschreckend. Maßstab
// Meter, Ursprung = Fußpunkt, Blick nach +X; state darf ein String sein ('idle' ≙ { anim: 'idle' }). Unbekannte anim →
// Standardzustand; progress (0..1) überschreibt bei Einmal-/Zyklus-Animationen die Zeit seit dem Wechsel.
//
// krakenpilz        ≈0,9 m  Pilzling aus dem All mit fünf geringelten Tentakel-Füßchen: violetter Kuppelhut mit mintgrünen
//   Leuchttupfen, cremefarbenes Gesicht mit Rosabäckchen, große Augen, gespitzter „O“-Schmollmund (spuckt Steinchen).
//   state { anim: 'idle' | 'walk' (speed) | 'hop' (progress 0..1: ducken, strecken, Füßchen einziehen, landen; Zyklus 0,6 s) |
//           'spit' (progress 0..1: Luft holen – Backen blähen –, bei 0,55 spucken (Mund auf, Rückstoß); Zyklus 0,9 s) |
//           'squashed' (platt) | 'defeated' (Schwindelsterne; das Umdrehen macht der Motor) }
//   model.mouth(out?) → Weltlage vor dem Mund (Abwurfpunkt des Steinchens).  userData.radius 0,34, userData.height 0,86.
// krakenpilz_stein  Ø≈0,26 m  Spuck-Steinchen: kantiger, warmgrauer Kiesel mit hellem Rücken. **Ursprung = Unterkante.**
//   state { spin (rad, Drehung um die Flugachse) }
// tintling          ≈1,3 m  Tintenfisch-Dame in Bonbonrosa: spitzer Mantel mit weißen Tupfen und magenta Seitenflossen, Rüschen-
//   kragen, große Wimpernaugen, kleiner Schnabelmund, sechs Arme (zwei längere). **Ursprung = Spitzen der Arme in Ruhe** (Mantel
//   nach oben).
//   state { anim: 'swim' (pulse 0..1: 0–0,4 zusammenziehen – Mantel lang, Arme gebündelt –, danach Stoß: Arme gespreizt, gleiten) |
//           'idle' | 'retreat' (weicht zurück: kippt nach hinten, Tintenwölkchen beim Eintritt) | 'defeated' (progress 0..1:
//           dreht sich, Augen zu, Schwindelsterne, sinkt) }
//   userData.radius 0,36, userData.height 1,32.
// stachelkugler     Ø≈0,95 m (mit Stacheln)  kleine Kugel-Kreatur: türkiser Ball mit hellem Gesichtsfeld, gelb-orange
//   Stacheln ringsum, große Augen, schiefes Grinsen. Rollt als Ganzes (Gesicht dreht mit). **Ursprung = Fußpunkt**, Ballmitte
//   y = 0,42.
//   state { anim: 'roll' | 'idle' | 'defeated' (progress 0..1: verpufft: schrumpft, Sterne), roll (rad, Rollwinkel um die
//           Querachse; positiv = rollt nach +X), speed }
//   userData.radius 0,42 (Trefferradius), userData.center 0,42.
//
// Alle Teile vertexgefärbt (wenige Zeichenaufrufe: Krakenpilz 5, Tintling 5, Stachelkugler 3, Stein 1); Füßchen/Arme als Instanzen.

import {
  THREE, TAU, Build, cached, vcol, basic, mesh, joint, eyes, dizzyStars, makeModel, Clock, Blinker, damp, clamp, col, mix,
  smoothstep, lerp, instMesh, setInst, placed,
} from '../lib/kit.js';
import { taperTube } from '../lib/hwGeos.js';
import { fibDirs } from '../lib/w6Geos.js';
import { prog, num, fxPuffs, spikeCone, ownMat, puffyGeo } from '../lib/w8Geos.js';

const _v = new THREE.Vector3();
const dirOf = (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
const nearDir = (d, list, cosR) => list.some((q) => d[0] * q[0] + d[1] * q[1] + d[2] * q[2] > cosR);

// =============================================================================================
// Krakenpilz
// =============================================================================================
const KP = {
  cap: 0x7a4ae8, capHi: 0xc0a2ff, capLow: 0x341486, rim: 0x5a2ac8, spot: 0x8af0d4, spotHi: 0xe4fff6,
  face: 0xfdeefe, faceLow: 0xdcc0ec, cheek: 0xff9ac8, tent: 0x8a56ee, tentHi: 0xc8a8ff, tentLow: 0x4a1ea8, sucker: 0xffd0ea,
  lip: 0xff6aae, mouth: 0x5a1438,
};
const KP_SPOTS = [[0.15, 1, 0.55], [-0.5, 0.8, 0.45], [0.55, 0.75, -0.45], [-0.25, 0.85, -0.6], [0.85, 0.45, 0.2], [-0.8, 0.45, -0.1], [0.05, 0.5, 0.95], [0.2, 0.45, -0.95], [-0.45, 0.4, 0.9], [-0.95, 0.3, 0.45], [0.7, 0.35, 0.75]]
  .map(([x, y, z]) => dirOf(x, y, z));
const KP_EYE_Y = 0.36;

function kpBodyGeo() {
  return cached('bonus:kp:body', () => {
    const b = new Build();
    // Gesicht/Stiel: rundlicher Knubbel
    b.lathe([[0, 0.08], [0.2, 0.09], [0.28, 0.15], [0.315, 0.26], [0.305, 0.38], [0.27, 0.46], [0.2, 0.5], [0, 0.52]],
      { v: (x, y, z, nx, ny) => mix(KP.faceLow, KP.face, smoothstep(ny * 0.5 + 0.55 + (y - 0.2) * 0.8)) }, undefined, 26, 3);
    // Kuppelhut mit Leuchttupfen (Farbe je Dreieck: Tupfen scharf)
    b.lathe([[0, 0.9], [0.17, 0.885], [0.31, 0.815], [0.41, 0.71], [0.47, 0.6], [0.48, 0.52], [0.44, 0.47], [0.34, 0.455], [0.2, 0.47], [0, 0.48]],
      (x, y, z, nx, ny) => {
        if (ny < -0.25) return mix(KP.rim, KP.capLow, 0.35);
        const d = dirOf(x, (y - 0.5) * 1.15, z);
        if (y > 0.5 && nearDir(d, KP_SPOTS, 0.955)) return nearDir(d, KP_SPOTS, 0.985) ? KP.spotHi : KP.spot;
        return mix(KP.capLow, mix(KP.cap, KP.capHi, smoothstep((y - 0.62) / 0.28) * 0.75), smoothstep((y - 0.47) / 0.12));
      }, undefined, 30, 3);
    // Hutrand-Wulst
    b.torus(0.445, 0.035, KP.rim, { p: [0, 0.495, 0], r: [Math.PI / 2, 0, 0] }, 8, 32);
    // Rosabäckchen
    for (const s of [1, -1]) {
      _v.set(0.26, 0.27, s * 0.16).normalize();
      b.add(new THREE.CircleGeometry(0.05, 14), KP.cheek, placed(new THREE.Vector3(0.262, 0.265, s * 0.165), new THREE.Vector3(0.82, -0.05, s * 0.55), new THREE.Vector3(1, 0.75, 1)));
    }
    return b.geometry();
  });
}
/** Ein Tentakel-Füßchen: geht vom Fuß nach außen und rollt sich an der Spitze ein (Ursprung = Ansatz, Richtung +X). */
function kpTentGeo() {
  return cached('bonus:kp:tent', () => {
    const b = new Build();
    const pts = [[0, 0.06, 0], [0.1, 0.03, 0], [0.2, 0.012, 0], [0.28, 0.02, 0], [0.32, 0.06, 0], [0.305, 0.105, 0], [0.27, 0.11, 0]];
    b.add(taperTube(pts, (t) => 0.062 * (1 - t * 0.62) + 0.012, 18, 8), (x, y, z, nx, ny) => {
      if (ny < -0.45 && Math.sin(x * 70) > 0.1 && x < 0.3) return KP.sucker;
      return mix(KP.tentLow, mix(KP.tent, KP.tentHi, smoothstep(ny * 0.7 + 0.2) * 0.6), smoothstep(ny * 0.6 + 0.7));
    });
    return b.geometry();
  });
}
function kpMouthGeo() {
  return cached('bonus:kp:mouth', () => {
    const b = new Build();
    b.torus(0.042, 0.02, KP.lip, { r: [0, Math.PI / 2, 0] }, 8, 16);
    b.sphere(0.036, KP.mouth, { p: [-0.006, 0, 0], s: [0.5, 1, 1] }, 10, 8);
    return b.geometry();
  });
}
function buildKrakenpilz() {
  const root = new THREE.Group();
  const own = [];
  const flash = ownMat(vcol(0.4, {}, 'bonuskp'), { emissive: 0x000000 });
  own.push(flash);
  const bodyJ = joint();
  const body = mesh(kpBodyGeo(), flash, {}, true);
  const eye = eyes([{ p: [0.268, KP_EYE_Y, 0.105], r: 0.082, sy: 1.25 }, { p: [0.268, KP_EYE_Y, -0.105], r: 0.082, sy: 1.25 }],
    { center: [0, 0.3, 0], iris: 0x22c8a0, pupil: 0.56, depth: 0.55, key: 'bonus:kp' });
  const mouthJ = joint([0.305, 0.215, 0], mesh(kpMouthGeo(), flash, {}, false));
  bodyJ.add(body, eye, mouthJ);
  const N = 5;
  const tents = instMesh(kpTentGeo(), flash, N, 0.7, 0.1);
  tents.castShadow = true;
  const dizzy = dizzyStars(0.3, 0.075); dizzy.position.set(0, 1.0, 0);
  root.add(bodyJ, tents, dizzy);
  root.userData.radius = 0.34;
  root.userData.height = 0.86;
  const clk = new Clock(), blink = new Blinker();
  let phase = Math.random() * TAU, sq = 1, inflate = 0, pucker = 1, lift = 0;
  const update = (dt, st) => {
    let anim = st.anim ?? 'idle';
    if (!['idle', 'walk', 'hop', 'spit', 'squashed', 'defeated'].includes(anim)) anim = 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    const sp = num(st.speed, 1.2);
    phase += dt * (anim === 'walk' ? 5 + sp * 3 : 2.2);
    let wantSq = 1, curl = 0.25 + Math.sin(phase) * 0.18, tuck = 0, wantInf = 0, wantPuck = 1, y = 0, bk = blink.update(dt), dz = false, tilt = 0;
    if (anim === 'walk') { y = Math.abs(Math.sin(phase)) * 0.04; tilt = Math.sin(phase) * 0.05; }
    else if (anim === 'hop') {
      const p = prog(st, clk, 0.6, true);
      if (p < 0.22) { wantSq = 1 - 0.22 * smoothstep(p / 0.22); curl = 0.5; }
      else if (p < 0.8) { const k = (p - 0.22) / 0.58; wantSq = 1.12 - k * 0.1; tuck = Math.sin(k * Math.PI); curl = -0.25 + k * 0.4; }
      else { const k = (p - 0.8) / 0.2; wantSq = 1 - 0.18 * Math.sin(k * Math.PI); curl = 0.55; }
    } else if (anim === 'spit') {
      const p = prog(st, clk, 0.9);
      if (p < 0.55) { wantInf = smoothstep(p / 0.5); wantPuck = 0.65; tilt = -0.08 * wantInf; }
      else { const k = (p - 0.55) / 0.45; wantInf = 0; wantPuck = 1.7 - k * 0.7; tilt = 0.16 * (1 - k); }
    } else if (anim === 'squashed') { wantSq = 0.3; bk = 0.1; curl = 0.6; }
    else if (anim === 'defeated') { bk = 0.15; dz = true; curl = Math.sin(t * 9) * 0.5; }
    sq = damp(sq, wantSq, anim === 'squashed' ? 18 : 14, dt);
    inflate = damp(inflate, wantInf, 10, dt);
    pucker = damp(pucker, wantPuck, 16, dt);
    lift = damp(lift, tuck, 14, dt);
    const w = 1 / Math.sqrt(Math.max(0.2, sq));
    bodyJ.scale.set(w * (1 + inflate * 0.07), sq * (1 + inflate * 0.05), w * (1 + inflate * 0.1));
    bodyJ.position.y = y + lift * 0.06;
    bodyJ.rotation.z = tilt;
    mouthJ.scale.set(1, pucker, pucker);
    eye.userData.blink(bk);
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU + 0.35;
      const wig = Math.sin(phase + i * 1.3) * 0.15;
      setInst(tents, i, Math.cos(a) * 0.15, (bodyJ.position.y) * 0.5, Math.sin(a) * 0.15, 0, -a, curl * 0.4 + wig - lift * 0.6, [1 - lift * 0.25, Math.max(0.3, sq), 1]);
    }
    tents.instanceMatrix.needsUpdate = true;
    dizzy.visible = dz;
    dizzy.rotation.y = t * 4;
  };
  const model = makeModel('krakenpilz', root, update, own, { initial: 'idle' });
  model.mouth = (out = new THREE.Vector3()) => { root.updateMatrixWorld(true); return mouthJ.localToWorld(out.set(0.06, 0, 0)); };
  model.flash = (on) => { flash.emissive.setHex(on ? 0x5a2a6a : 0x000000); };
  return model;
}

// =============================================================================================
// Krakenpilz-Steinchen
// =============================================================================================
function steinGeo() {
  return cached('bonus:kp:stein', () => {
    const g = new THREE.IcosahedronGeometry(0.13, 1);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      _v.set(P.getX(i), P.getY(i), P.getZ(i));
      const k = 1 + Math.sin(_v.x * 41 + _v.y * 17) * 0.09 + Math.cos(_v.z * 37 - _v.y * 23) * 0.07;
      _v.multiplyScalar(k); _v.y *= 0.82;
      P.setXYZ(i, _v.x, _v.y, _v.z);
    }
    g.computeVertexNormals();
    const b = new Build();
    b.add(g, (x, y, z, nx, ny) => mix(0x6a6278, mix(0xa8a0b4, 0xd8d2e0, smoothstep(ny)), smoothstep(ny * 0.8 + 0.6)), { p: [0, 0.11, 0] });
    return b.geometry();
  });
}
function buildStein() {
  const root = new THREE.Group();
  const spin = joint([0, 0.11, 0], mesh(steinGeo(), vcol(0.7, {}, 'bonusstein'), { p: [0, -0.11, 0] }, true));
  root.add(spin);
  root.userData.radius = 0.13;
  const update = (dt, st) => { spin.rotation.set(num(st.spin, 0) * 0.7, 0, num(st.spin, 0)); };
  return makeModel('krakenpilz_stein', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Tintling
// =============================================================================================
const TL = {
  mantle: 0xff9ad2, mantleHi: 0xffe6f4, mantleLow: 0xd8509e, dot: 0xffffff, fin: 0xd8409a, finHi: 0xff92cc, skirt: 0xfff2fa,
  skirtLow: 0xf0a8d0, tent: 0xff96cc, tentHi: 0xffdcee, tentLow: 0xd25a9e, sucker: 0xfff4fa, lash: 0x3a1430, beak: 0xff5a86,
};
const TL_BASE = 0.5;   // Ansatz der Arme (Mantel-Unterkante) über dem Ursprung
const TL_DOTS = [[0.2, 0.9, 0.4], [-0.3, 0.7, 0.6], [-0.2, 0.8, -0.55], [0.4, 0.55, -0.7], [-0.75, 0.4, 0.1], [-0.6, 0.2, -0.75], [0.1, 0.3, 0.95], [-0.25, 0.25, 0.95], [0.6, 0.25, 0.7], [-0.95, 0.6, -0.1], [0.05, 0.98, -0.1]]
  .map(([x, y, z]) => dirOf(x, y, z));
function tlMantleGeo() {
  return cached('bonus:tl:mantle', () => {
    const b = new Build();
    const B = TL_BASE;
    b.lathe([[0, B + 0.82], [0.06, B + 0.8], [0.16, B + 0.72], [0.25, B + 0.58], [0.31, B + 0.42], [0.34, B + 0.26], [0.33, B + 0.12], [0.29, B + 0.03], [0.22, B - 0.02], [0, B - 0.02]],
      (x, y, z, nx, ny) => {
        const d = dirOf(x, (y - B - 0.3) * 0.8, z);
        if (y > B + 0.1 && nx < 0.6 && nearDir(d, TL_DOTS, 0.965)) return TL.dot;
        return mix(TL.mantleLow, mix(TL.mantle, TL.mantleHi, smoothstep(ny * 0.6 + nx * 0.2) * 0.7), smoothstep((y - B) / 0.35 + ny * 0.3));
      }, undefined, 28, 3);
    // Seitenflossen (spitz, magenta)
    const fin = new THREE.Shape();
    fin.moveTo(0, 0); fin.quadraticCurveTo(0.2, 0.02, 0.3, 0.16); fin.quadraticCurveTo(0.14, 0.24, 0, 0.36); fin.lineTo(0, 0);
    for (const s of [1, -1]) {
      const g = puffyGeo(fin, 0.04, 0.025, 10, 2);
      g.rotateY(-s * Math.PI / 2);
      b.add(g, { v: (x, y) => mix(TL.fin, TL.finHi, smoothstep(y / 0.36)) }, { p: [-0.02, B + 0.46, s * 0.2], r: [0, 0, 0.12] });
    }
    // Rüschenkragen
    b.add(new THREE.TorusGeometry(0.255, 0.055, 8, 30), { v: (x, y, z, nx, ny) => mix(TL.skirtLow, TL.skirt, smoothstep(ny * 0.7 + 0.5)) }, { p: [0, B + 0.01, 0], r: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; b.sphere(0.05, TL.skirt, { p: [Math.cos(a) * 0.29, B - 0.02, Math.sin(a) * 0.29], s: [1, 0.6, 1] }, 8, 6); }
    // Wimpern über den Augen und Schnabelmund
    for (const s of [1, -1]) for (let k = 0; k < 3; k++) {
      const a = (k - 1) * 0.35;
      b.capsule(0.009, 0.06, TL.lash, { p: [0.31, B + 0.4 + Math.cos(a) * 0.02, s * (0.13 + Math.sin(a) * 0.075)], r: [s * (0.5 + a * 1.2), 0, 0.35] }, 2, 4);
    }
    b.sphere(0.04, TL.beak, { p: [0.325, B + 0.12, 0], s: [0.8, 0.7, 1.1] }, 10, 8);
    b.sphere(0.022, 0x5a1430, { p: [0.352, B + 0.118, 0], s: [0.4, 0.5, 1.2] }, 8, 6);
    return b.geometry();
  });
}
function tlArmGeo() {
  return cached('bonus:tl:arm', () => {
    const b = new Build();
    const pts = [[0, 0, 0], [0.025, -0.13, 0], [0.04, -0.27, 0], [0.03, -0.4, 0], [0.0, -0.48, 0], [-0.03, -0.5, 0]];
    b.add(taperTube(pts, (t) => 0.058 * (1 - t * 0.7) + 0.008, 18, 7), (x, y, z, nx) => {
      if (nx < -0.5 && Math.sin(y * 55) > 0.2) return TL.sucker;
      return mix(TL.tentLow, mix(TL.tent, TL.tentHi, smoothstep(nx * 0.5 + 0.3) * 0.5), smoothstep(y * 2 + 1.1));
    });
    return b.geometry();
  });
}
function buildTintling() {
  const root = new THREE.Group();
  const own = [];
  const flash = ownMat(vcol(0.36, {}, 'bonustl'), { emissive: 0x000000 });
  own.push(flash);
  const bodyJ = joint();
  const mantleJ = joint([0, TL_BASE, 0], mesh(tlMantleGeo(), flash, { p: [0, -TL_BASE, 0] }, true));
  const eye = eyes([{ p: [0.3, TL_BASE + 0.3, 0.12], r: 0.095, sy: 1.3 }, { p: [0.3, TL_BASE + 0.3, -0.12], r: 0.095, sy: 1.3 }],
    { center: [0, TL_BASE + 0.25, 0], iris: 0x6a2ab8, pupil: 0.58, depth: 0.55, key: 'bonus:tl' });
  mantleJ.add(joint([0, -TL_BASE, 0], eye));
  const N = 6;
  const arms = instMesh(tlArmGeo(), flash, N, 0.8, 0.3);
  arms.castShadow = true;
  bodyJ.add(mantleJ, arms);
  const ink = fxPuffs(14, 0x2a1450, { opacity: 0.75, radius: 3, cy: 0.6 });
  own.push(ink);
  const dizzy = dizzyStars(0.3, 0.075); dizzy.position.set(0, 1.5, 0);
  root.add(bodyJ, ink.mesh, dizzy);
  root.userData.radius = 0.36;
  root.userData.height = 1.32;
  const clk = new Clock(), blink = new Blinker();
  let splay = 0.2, stretch = 1, spinA = 0, sway = Math.random() * TAU;
  const update = (dt, st) => {
    let anim = st.anim ?? 'swim';
    if (!['swim', 'idle', 'retreat', 'defeated'].includes(anim)) anim = 'swim';
    clk.tick(dt, anim);
    const t = clk.t;
    sway += dt * 2.1;
    let wantSplay = 0.25 + Math.sin(sway) * 0.08, wantStretch = 1, tilt = 0, bk = blink.update(dt), dz = false, sink = 0;
    if (anim === 'swim') {
      const p = num(st.pulse, (clk.age % 1.2) / 1.2);
      if (p < 0.4) { const k = smoothstep(p / 0.4); wantSplay = 0.06; wantStretch = 1 + 0.14 * k; }
      else { const k = (p - 0.4) / 0.6; wantSplay = 0.72 * (1 - k) + 0.18 * k; wantStretch = 0.92 + 0.08 * k; }
    } else if (anim === 'retreat') {
      tilt = -0.35; wantSplay = 0.6; wantStretch = 0.95;
      if (clk.entered) ink.burst([-0.1, TL_BASE * 0.6, 0], { count: 10, speed: 1.2, up: 0.1, size: 0.18, life: 1.1, spread: 0.25, force: true });
    } else if (anim === 'defeated') {
      const p = prog(st, clk, 1.0);
      spinA += dt * 9 * (1 - p * 0.6);
      bk = 0.1; dz = p < 0.9; wantSplay = 0.9; sink = p * 0.4;
    }
    splay = damp(splay, wantSplay, anim === 'swim' ? 12 : 6, dt);
    stretch = damp(stretch, wantStretch, 12, dt);
    const w = 1 / Math.sqrt(stretch);
    mantleJ.scale.set(w, stretch, w);
    bodyJ.rotation.set(0, anim === 'defeated' ? spinA : 0, tilt);
    bodyJ.position.y = -sink + Math.sin(sway * 0.5) * 0.02;
    eye.userData.blink(bk);
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU + 0.26;
      const long = i === 1 || i === 4;
      const wig = Math.sin(t * 3 + i * 1.1) * 0.06;
      setInst(arms, i, Math.cos(a) * 0.15, TL_BASE + 0.01, Math.sin(a) * 0.15, 0, -a, splay * (long ? 0.8 : 1) + wig, [1, long ? 1.3 : 1, 1]);
    }
    arms.instanceMatrix.needsUpdate = true;
    ink.step(dt);
    dizzy.visible = dz;
    dizzy.rotation.y = t * 4;
  };
  const model = makeModel('tintling', root, update, own, { initial: 'swim' });
  model.flash = (on) => { flash.emissive.setHex(on ? 0x6a2a4a : 0x000000); };
  return model;
}

// =============================================================================================
// Stachelkugler
// =============================================================================================
const SK = {
  body: 0x1fb8a2, bodyHi: 0x8cf6e2, bodyLow: 0x0a5e5c, face: 0xdcfff6, spike: 0xffd84a, spikeTip: 0xff7a1a, spikeLow: 0xd89a1a,
  cheek: 0xff8ab0, mouth: 0x5a1a2a, tooth: 0xffffff,
};
const SK_R = 0.32, SK_CY = 0.42;
function skBallGeo() {
  return cached('bonus:sk:ball', () => {
    const b = new Build();
    // Körper: Gesichtsfeld vorn hell, sonst Türkis mit Verlauf
    b.sphere(SK_R, { v: (x, y, z, nx, ny, nz) => {
      const face = smoothstep((nx - 0.55) / 0.25) * smoothstep((0.75 - Math.abs(ny - 0.05)) / 0.2);
      return mix(mix(SK.bodyLow, mix(SK.body, SK.bodyHi, smoothstep(ny * 0.7 + 0.1) * 0.6), smoothstep(ny * 0.6 + 0.75)), SK.face, face * 0.85);
    } }, undefined, 28, 20);
    // Stacheln (nicht im Gesicht)
    for (const d of fibDirs(38, 0.4)) {
      if (d.x > 0.62 && Math.abs(d.y) < 0.6) continue;
      const len = 0.17 + (Math.abs(d.y) < 0.3 ? 0.03 : 0);
      b.add(spikeCone(0.065, len, 8), { v: (x, y, z) => mix(SK.spikeLow, mix(SK.spike, SK.spikeTip, smoothstep((z - len * 0.55) / (len * 0.45))), smoothstep(z / (len * 0.3))) },
        placed(_v.set(d.x, d.y, d.z).multiplyScalar(SK_R - 0.03).clone(), new THREE.Vector3(d.x, d.y, d.z), new THREE.Vector3(1, 1, 1)));
    }
    // Bäckchen und schiefes Grinsen
    for (const s of [1, -1]) b.add(new THREE.CircleGeometry(0.045, 12), SK.cheek, placed(new THREE.Vector3(0.28, -0.03, s * 0.15), new THREE.Vector3(0.85, -0.05, s * 0.52), new THREE.Vector3(1, 0.7, 1)));
    b.add(new THREE.TorusGeometry(0.075, 0.016, 6, 14, Math.PI * 0.85), SK.mouth, { p: [0.3, -0.07, 0.01], r: [0, Math.PI / 2, Math.PI + 0.25] });
    b.box(0.03, 0.035, 0.028, SK.tooth, { p: [0.31, -0.105, 0.035] }, 0.008, 1);
    return b.geometry();
  });
}
function buildStachelkugler() {
  const root = new THREE.Group();
  const own = [];
  const flash = ownMat(vcol(0.38, {}, 'bonussk'), { emissive: 0x000000 });
  own.push(flash);
  const ballJ = joint([0, SK_CY, 0]);
  const ball = mesh(skBallGeo(), flash, {}, true);
  const ep = (s) => { const d = new THREE.Vector3(0.84, 0.32, s * 0.36).normalize().multiplyScalar(SK_R - 0.012); return [d.x, d.y, d.z]; };
  const eye = eyes([{ p: ep(1), r: 0.08, sy: 1.25 }, { p: ep(-1), r: 0.08, sy: 1.25 }],
    { center: [0, 0, 0], iris: 0xff7a1a, pupil: 0.56, depth: 0.55, key: 'bonus:sk' });
  ballJ.add(ball, eye);
  const dizzy = dizzyStars(0.32, 0.075); dizzy.position.set(0, 1.0, 0);
  root.add(ballJ, dizzy);
  root.userData.radius = 0.42;
  root.userData.center = SK_CY;
  const clk = new Clock(), blink = new Blinker();
  let roll = 0, sq = 1, wob = Math.random() * TAU;
  const update = (dt, st) => {
    let anim = st.anim ?? 'roll';
    if (!['roll', 'idle', 'defeated'].includes(anim)) anim = 'roll';
    clk.tick(dt, anim);
    const t = clk.t;
    wob += dt * 3;
    let s = 1, bk = blink.update(dt), dz = false, bob = 0;
    if (st.roll !== undefined) roll = num(st.roll, 0);
    else if (anim === 'roll') roll += dt * num(st.speed, 2) / SK_CY;
    if (anim === 'idle') bob = Math.abs(Math.sin(wob)) * 0.03;
    if (anim === 'defeated') { const p = prog(st, clk, 0.7); s = Math.max(0.01, 1 - smoothstep((p - 0.35) / 0.65)); bk = 0.1; dz = p < 0.8; }
    sq = damp(sq, anim === 'idle' ? 1 - Math.abs(Math.sin(wob)) * 0.05 : 1, 10, dt);
    ballJ.rotation.set(0, 0, -roll);
    ballJ.position.y = SK_CY * s + bob;
    ballJ.scale.set(s / Math.sqrt(sq), s * sq, s / Math.sqrt(sq));
    eye.userData.blink(bk);
    dizzy.visible = dz;
    dizzy.rotation.y = t * 4;
  };
  const model = makeModel('stachelkugler', root, update, own, { initial: 'roll' });
  model.flash = (on) => { flash.emissive.setHex(on ? 0x6a3a1a : 0x000000); };
  return model;
}

export const MODELS = {
  krakenpilz: buildKrakenpilz,
  krakenpilz_stein: buildStein,
  tintling: buildTintling,
  stachelkugler: buildStachelkugler,
};
