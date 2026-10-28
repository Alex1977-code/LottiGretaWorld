// Gegner-Modelle Welt 8 „Brummbär-Rummelplatz“ (Kurs-Modus): Sandflosser (8-2), Knochenflieger-Gruppe (8-1), Kristall-Felsklotz
// (8-7) und die Baron-Sandstatue (8-2). Eigene Gestaltung, lustig, nie erschreckend. Maßstab Meter, Blick nach +X; state darf ein
// String sein ('swim' ≙ { anim: 'swim' }). Unbekannte anim → Standardzustand. progress (0..1) überschreibt bei Einmal-/Zyklus-
// Animationen die Zeit seit dem Wechsel.
// Wiederverwendet (nicht neu gebaut): Knochenflieger 'knochenflieger' (Welt 7, Einzeltier), Pilzling-Sandskulptur
// 'sandskulptur_pilzling' (Welt 5), Hackvogel 'hackvogel', Mini-Pilzling 'pilzling_mini', Wutkaulquappe 'wutkaulquappe',
// Riesenschnappblume 'riesenschnappblume', Hörner-Ameise 'ameisensoldat_horn', Spuk/Kreisgeist (Welt 3), Schattenläuferin.
//
// sandflosser  ≈1,8 m lang  Sandflosser: dicker, lustiger Wüstenfisch – sandorange Schuppenhaut mit braunen Rücken-Streifen und
//   Sommersprossen, Cremebauch, großer türkiser Segel-Rückenflosse, türkisen Brustflossen und Gabelschwanz, dicken Lippen mit
//   Hasenzähnchen, großen Glubschaugen oben auf dem Kopf. **Ursprung = Sandoberfläche** (y = 0 = Sand).
//   state { anim: 'swim'|'jump'|'defeated', speed (m/s, Schwanzschlag), progress? (jump: 0..1 über den Sprungbogen, Zyklus 1,2 s;
//           defeated: 0..1 in 1,2 s) }
//         swim: im Sand versunken – nur Segelflosse, Rücken und Glubschaugen schauen heraus, Sandfontäne hinter ihm;
//         jump: ganz aus dem Sand (Bauch am Ursprung), Nase hoch → runter mit progress, Flossen gespreizt, Maul auf, Sandspritzer
//         an Start und Ende (der Motor bewegt root auf dem Bogen); defeated: dreht sich auf den Rücken, Augen zu,
//         Schwindelsterne, versinkt im Sand (danach unsichtbar).
//   model.mouth(out?) → Weltposition vor dem Maul.  root.userData.radius → Trefferradius (0,6 m).
// knochenflieger_gruppe  Gruppe von count Knochenfliegern in Formation (sparsamer Zwilling des Welt-7-Modells, kfLoParts in
//   lib/w8Geos.js: gleiche Gestaltung, ≈1,3 k Dreiecke je Flieger; Instanzen).
//   **Ursprung = Mitte der Formation** (Flughöhe setzt der Motor).
//   opts  { count (2..8, Standard 5), radius (Formationsradius, 1,6), formation: 'ring' (Standard) | 'reihe' | 'keil' }
//   state { anim: 'fly'|'dive'|'scatter'|'assemble', spin? (rad, Drehung der Formation; Standard dreht langsam),
//           alive? ([1|0, …] je Mitglied; 0 = besiegt, ausgeblendet), flap? (0..1), progress? (scatter 0..1 in 0,9 s;
//           assemble 0..1 in 1,4 s) }
//         fly: schlagen versetzt mit den Flügeln, wippen; dive: alle legen die Flügel an, Nase nach unten; scatter: fallen
//         klappernd auseinander (Flügel fliegen weg, Knochenstaub), danach unsichtbar; assemble: die Knochen wirbeln aus allen
//         Richtungen heran und setzen sich zur Formation zusammen (Funkel-Staub).
//   model.member(i, out?) → Weltposition des i-ten Fliegers.  root.userData.radius → Trefferradius je Flieger (0,4 m).
// kristall_felsklotz  Ø/Kante size (3 m)  Kristall-Felsklotz: grimmig-gemütlicher Felsbrocken aus violettem Gestein mit
//   leuchtenden Kristallbüscheln (türkis und flieder), großen Augen unter Steinbrauen und Schmollmund. Man steht darauf; er
//   rollt los. **Ursprung = Unterkante** (Mitte der Aufstandsfläche).
//   opts  { size (3), shape: 'kugel' (Standard: Felskugel, rollt um die Z-Achse) | 'wuerfel' (Felswürfel, kippt über die
//           Vorderkante) }
//   state { anim: 'idle'|'roll'|'fast', roll? (rad, Rollwinkel – überschreibt; positiv = rollt nach +X), speed (m/s, Standard
//           roll 2, fast 4) }
//         idle: brummelt, blinzelt, Kristalle funkeln; roll: rollt (Gesicht dreht mit), Staub; fast: Kristalle glühen hell,
//         Augen weit, Funken.
//   root.userData.top → Höhe der Oberseite in Ruhe (size), userData.radius → size/2.
// baron_sandstatue  ≈3,6 m (size 1)  Sandstatue Baron Brummbärs (das Welt-1-Modell, in Sandtönen) auf einem Sandstein-Sockel
//   mit Brummbär-Wappen und Sandverwehungen. **Ursprung = Mitte der Sockel-Unterseite.**
//   opts  { size (Faktor, 1) }
//   state { break (0..1: zittert (0–0,15), zerbröselt in Sandbrocken und Staub; ab 1 nur Sockel mit Sandhäufchen) }
//   root.userData.top → Oberkante des Sockels (1,0 · size).

import {
  THREE, TAU, Build, cached, vcol, basic, mesh, joint, eyes, dizzyStars, makeModel, Clock, Blinker, damp, clamp, col, mix,
  smoothstep, lerp, instMesh, setInst, glowSprite, onEllipsoid,
} from '../lib/kit.js';
import {
  W8, prog, num, ZERO, ownMat, fxPuffs, stick, puffyGeo, gradV, hash1, noise3, lumpyEllipsoid, displace, kfParts, harvest,
  recolor, toneMap, bearEmblem, ellSurf, taperTube, glow8, memo, kfLoParts, clusterSimplify,
} from '../lib/w8Geos.js';
import { MODELS as B1 } from './bosses_w1.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
const _p = new THREE.Vector3();

// =============================================================================================
// Sandflosser
// =============================================================================================
const SF = { body: 0xf2a446, bodyHi: 0xffd08a, bodyLow: 0xc06a28, stripe: 0x9a4a1e, belly: 0xfff0d0, fin: 0x22c4b8, finHi: 0x9af2e6, finLow: 0x0a7a7a, lip: 0xff7a5a, tooth: 0xffffff, freckle: 0xb05a24 };
const SF_C = [0, 0, 0], SF_R = [0.78, 0.42, 0.44];
const sfSurf = ellSurf(SF_C, SF_R);
const SF_EYES = [1, -1].map((s) => { const h = sfSurf(s * 0.5, 0.62); return { p: h.p.clone().addScaledVector(h.n, 0.04).toArray(), r: 0.13, sy: 1.15, dir: h.n.clone().lerp(new THREE.Vector3(0.9, 0.4, 0), 0.45).toArray() }; });
/** Körper (Mitte im Ursprung, Kopf +X) mit Flossen, Lippen, Zähnchen. */
function sfBodyGeo() {
  return cached('w8:sf:body', () => {
    const b = new Build();
    const skin = { v: (x, y, z, nx, ny) => {
      if (ny < -0.35) return mix(SF.belly, 0xffe0b0, smoothstep(-ny));
      const stripe = ny > 0.25 && Math.sin(x * 9 + 0.5) > 0.55 && x < 0.45;
      const base = mix(SF.bodyLow, mix(SF.body, SF.bodyHi, smoothstep(ny * 0.6 + nx * 0.3) * 0.6), smoothstep(ny * 0.6 + 0.65));
      return stripe ? mix(base, SF.stripe, 0.75) : base;
    } };
    const g = new THREE.SphereGeometry(1, 34, 22);
    // tropfenförmig: hinten schmaler
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i); const k = x < 0 ? 1 - Math.pow(-x, 1.6) * 0.45 : 1; P.setY(i, P.getY(i) * k); P.setZ(i, P.getZ(i) * k); }
    g.computeVertexNormals();
    b.add(g, skin, { s: SF_R });
    // Sommersprossen auf den Wangen
    for (const s of [1, -1]) for (const [az, el] of [[0.75, 0.15], [0.85, 0.05], [0.7, 0.0], [0.82, -0.08]]) stick(b, sfSurf(s * az, el), SF.freckle, [0.022, 0.022, 0.01], 0.4);
    // dicke Lippen und Hasenzähnchen
    b.torus(0.15, 0.06, SF.lip, { p: [0.76, -0.07, 0], r: [0, Math.PI / 2, 0], s: [1, 0.75, 1] }, 10, 20);
    for (const s of [1, -1]) b.box(0.05, 0.07, 0.06, SF.tooth, { p: [0.83, -0.02, s * 0.035] }, 0.015, 1);
    b.sphere(1, 0x5a1424, { p: [0.79, -0.08, 0], s: [0.04, 0.07, 0.11] }, 10, 6);
    // Segel-Rückenflosse (türkis, mit Strahlen)
    const sail = new THREE.Shape();
    sail.moveTo(-0.45, 0); sail.quadraticCurveTo(-0.5, 0.45, -0.15, 0.62); sail.quadraticCurveTo(0.12, 0.66, 0.35, 0);
    sail.lineTo(-0.45, 0);
    b.add(puffyGeo(sail, 0.05, 0.03, 12, 2), { v: (x, y) => mix(SF.finLow, mix(SF.fin, SF.finHi, smoothstep(y / 0.6)), smoothstep(y / 0.2 + 0.2)) }, { p: [-0.05, 0.3, 0] });
    for (let i = 0; i < 5; i++) { const x = -0.38 + i * 0.16; b.capsule(0.012, 0.32 - Math.abs(i - 1.6) * 0.06, SF.finLow, { p: [x, 0.52 - Math.abs(i - 1.6) * 0.04, 0], r: [0, 0, 0.25 - i * 0.1] }, 2, 4); }
    // Brustflossen
    for (const s of [1, -1]) {
      const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.quadraticCurveTo(0.12, -0.22, -0.18, -0.3); fin.quadraticCurveTo(-0.1, -0.12, 0, 0);
      b.add(puffyGeo(fin, 0.03, 0.02, 8, 2), { v: (x, y) => mix(SF.fin, SF.finHi, smoothstep(-y * 3)) }, { p: [0.25, -0.18, s * 0.38], r: [s * -1.1, 0, 0] });
    }
    return b.geometry();
  });
}
/** Gabelschwanz (Ursprung = Schwanzansatz, reicht nach −X). */
const sfTailGeo = () => cached('w8:sf:tail', () => {
  const b = new Build();
  b.sphere(1, { v: (x, y, z, nx, ny) => mix(SF.bodyLow, SF.body, smoothstep(ny * 0.5 + 0.5)) }, { p: [-0.08, 0, 0], s: [0.16, 0.13, 0.1] }, 14, 10);
  const tail = new THREE.Shape();
  tail.moveTo(0, 0); tail.quadraticCurveTo(-0.2, 0.1, -0.42, 0.38); tail.quadraticCurveTo(-0.3, 0.06, -0.34, 0); tail.quadraticCurveTo(-0.3, -0.06, -0.42, -0.38); tail.quadraticCurveTo(-0.2, -0.1, 0, 0);
  b.add(puffyGeo(tail, 0.05, 0.03, 12, 2), { v: (x) => mix(SF.fin, SF.finHi, smoothstep(-x * 2.5 - 0.2)) }, { p: [-0.12, 0, 0] });
  return b.geometry();
});
function buildSandflosser() {
  const root = new THREE.Group();
  const own = [];
  const flash = ownMat(vcol(0.38, {}, 'w8sf'), { emissive: 0x000000 });
  own.push(flash);
  const bodyJ = joint();
  const body = mesh(sfBodyGeo(), flash, {}, true);
  const eye = eyes(SF_EYES, { key: 'w8:sf', iris: 0x2a8a3a, pupil: 0.55, depth: 0.55 });
  const tailJ = joint([-0.72, 0.0, 0], mesh(sfTailGeo(), flash, {}, true));
  const dizzy = dizzyStars(0.45, 0.1); dizzy.position.set(0.1, 0.7, 0);
  bodyJ.add(body, eye, tailJ);
  const sand = fxPuffs(16, 0xf0d090, { opacity: 0.9, radius: 4, cy: 0.3 });
  sand.gravity = 6;
  own.push(sand);
  root.add(bodyJ, dizzy, sand.mesh);
  root.userData.radius = 0.6;
  const clk = new Clock(), blink = new Blinker();
  let phase = Math.random() * TAU, depth = -0.32, emit = 0, lastP = 0;
  const update = (dt, st) => {
    let anim = st.anim ?? 'swim';
    if (!['swim', 'jump', 'defeated'].includes(anim)) anim = 'swim';
    clk.tick(dt, anim);
    const t = clk.t;
    const sp = num(st.speed, anim === 'swim' ? 3 : 2);
    phase += dt * TAU * (1.4 + sp * 0.25);
    let y = -0.3, pitch = 0, roll = 0, tailA = Math.sin(phase) * 0.45, open = 0, bk = blink.update(dt), vis = true, dz = false;
    if (anim === 'swim') {
      y = -0.3 + Math.sin(phase * 0.5) * 0.03; roll = Math.sin(phase * 0.5) * 0.05;
      emit -= dt;
      if (emit <= 0) { sand.burst([-0.5, 0.05, 0], { count: 2, speed: 0.9, up: 1.6, size: 0.12, life: 0.6, spread: 0.15 }); emit = 0.07; }
    } else if (anim === 'jump') {
      const p = prog(st, clk, 1.2, true);
      y = 0.44; pitch = lerp(0.75, -0.75, smoothstep(p)); open = p > 0.15 && p < 0.85 ? 1 : 0.3;
      tailA = Math.sin(phase * 1.6) * 0.6;
      if ((p < 0.12 && lastP > 0.5) || (clk.entered)) sand.burst([0, 0.05, 0], { count: 10, speed: 2.2, up: 2.5, size: 0.16, life: 0.8, spread: 0.4, force: true });
      if (p > 0.9 && lastP <= 0.9) sand.burst([0.4, -0.3, 0], { count: 8, speed: 2, up: 2.2, size: 0.15, life: 0.7, spread: 0.4, force: true });
      lastP = p; bk = 1;
    } else {
      const p = prog(st, clk, 1.2);
      const k = smoothstep(p / 0.4);
      y = lerp(0.2, 0.35, k) - smoothstep((p - 0.4) / 0.6) * 1.2; roll = k * Math.PI; tailA = Math.sin(t * 6) * 0.2 * (1 - p);
      bk = 0.12; open = 0.5; dz = p < 0.85; vis = p < 0.999;
      if (clk.entered) sand.burst([0, 0.05, 0], { count: 8, speed: 1.5, up: 2, size: 0.14, life: 0.7, spread: 0.3, force: true });
    }
    depth = anim === 'jump' ? y : damp(depth, y, 6, dt);
    bodyJ.position.set(0, depth, 0);
    bodyJ.rotation.set(roll, 0, pitch, 'XYZ');
    bodyJ.visible = vis;
    tailJ.rotation.set(0, tailA, 0);
    eye.userData.blink(bk);
    eye.scale.setScalar(anim === 'jump' ? 1.12 : 1);
    body.scale.set(1, 1 - open * 0.02, 1);
    dizzy.visible = dz;
    dizzy.position.y = depth + 0.75;
    dizzy.rotation.y = t * 3.5;
    sand.step(dt);
  };
  const model = makeModel('sandflosser', root, update, own, { initial: 'swim' });
  model.mouth = (out = new THREE.Vector3()) => { root.updateMatrixWorld(true); return bodyJ.localToWorld(out.set(0.95, -0.05, 0)); };
  return model;
}

// =============================================================================================
// Knochenflieger-Gruppe
// =============================================================================================
/** Formationsplätze (Mitte im Ursprung, Blick +X). */
function formation(kind, n, R) {
  const out = [];
  for (let i = 0; i < n; i++) {
    if (kind === 'reihe') out.push([0, Math.sin(i * 1.7) * 0.25, (i - (n - 1) / 2) * R * 0.9]);
    else if (kind === 'keil') { const k = Math.ceil(i / 2), s = i % 2 ? 1 : -1; out.push([-k * R * 0.55, k * 0.12, i ? s * k * R * 0.6 : 0]); }
    else { const a = (i / n) * TAU; out.push([Math.cos(a) * R, Math.sin(i * 2.1) * 0.25, Math.sin(a) * R]); }
  }
  return out;
}
function buildKnochenGruppe(opts = {}) {
  const n = clamp(Math.round(num(opts.count, 5)), 2, 8);
  const R = clamp(num(opts.radius, 1.6), 0.6, 6);
  const form = ['reihe', 'keil'].includes(opts.formation) ? opts.formation : 'ring';
  const parts = kfLoParts();
  const root = new THREE.Group();
  const own = [];
  const lit = vcol(0.34, {}, 'w8kf');
  const ext = R + 3;
  const core = instMesh(parts.core, lit, n, ext, 0);
  const wings = parts.wings.map((w) => instMesh(w.geo, lit, n, ext, 0));
  core.castShadow = true; for (const w of wings) w.castShadow = true;
  const dust = fxPuffs(16, 0xfff2dc, { opacity: 0.85, radius: ext, cy: 0, detail: 0 });
  own.push(dust);
  root.add(core, ...wings, dust.mesh);
  root.userData.radius = 0.4;
  const slots = formation(form, n, R);
  const ph = slots.map((_, i) => hash1(i + 3) * TAU);
  const scat = slots.map((_, i) => ({ v: new THREE.Vector3(Math.cos(i * 2.4) * 2.2, 1 + hash1(i) * 1.5, Math.sin(i * 2.4) * 2.2), r: [hash1(i + 1) * 9, hash1(i + 2) * 9, hash1(i + 4) * 9] }));
  const clk = new Clock();
  let spin = 0, sweep = 0;
  const memberPos = slots.map(() => new THREE.Vector3());
  const update = (dt, st) => {
    let anim = st.anim ?? 'fly';
    if (!['fly', 'dive', 'scatter', 'assemble'].includes(anim)) anim = 'fly';
    clk.tick(dt, anim);
    const t = clk.t;
    spin = st.spin !== undefined ? num(st.spin, 0) : spin + dt * (form === 'ring' ? 0.5 : 0);
    sweep = damp(sweep, anim === 'dive' ? 1 : 0, 8, dt);
    const alive = Array.isArray(st.alive) ? st.alive : null;
    const p = anim === 'scatter' ? prog(st, clk, 0.9) : anim === 'assemble' ? prog(st, clk, 1.4) : 0;
    if (clk.entered && anim === 'scatter') for (let i = 0; i < n; i++) dust.burst(memberPos[i].toArray(), { count: 3, speed: 1.4, up: 0.6, size: 0.12, life: 0.7, spread: 0.2, force: true });
    if (anim === 'assemble' && p > 0.85 && p < 0.92) for (let i = 0; i < n; i++) dust.burst(memberPos[i].toArray(), { count: 1, speed: 0.6, up: 0.4, size: 0.1, life: 0.5, spread: 0.2 });
    _q2.setFromAxisAngle(_v.set(0, 1, 0), spin);
    for (let i = 0; i < n; i++) {
      const on = !alive || (alive[i] ?? 1) > 0;
      if (!on) { core.setMatrixAt(i, ZERO); for (const w of wings) w.setMatrixAt(i, ZERO); continue; }
      const sl = slots[i];
      const f = st.flap !== undefined ? clamp(num(st.flap, 0.5), 0, 1) : 0.5 + 0.5 * Math.sin(t * TAU * 2.2 + ph[i]);
      _p.set(sl[0], sl[1] + (1 - sweep) * Math.sin(t * TAU * 2.2 + ph[i] - 0.6) * 0.06, sl[2]).applyQuaternion(_q2);
      // Blick: im Ring tangential (Flugrichtung), sonst +X
      const yaw = form === 'ring' ? spin + (i / n) * TAU + Math.PI : 0;
      let pitch = sweep * -0.55, sc = 1, rollA = 0;
      const wOff = [0, 0];
      if (anim === 'scatter' || anim === 'assemble') {
        const k = anim === 'scatter' ? smoothstep(p) : 1 - smoothstep(p);
        const g = anim === 'scatter' ? p * p * 2 : (1 - p) * (1 - p) * 1.2;
        _p.addScaledVector(scat[i].v, k * 0.9).add(_v.set(0, -g, 0));
        pitch += k * scat[i].r[0]; rollA = k * scat[i].r[1];
        sc = anim === 'scatter' ? Math.max(0.001, 1 - smoothstep((p - 0.55) / 0.45)) : 0.3 + 0.7 * smoothstep(p * 1.4);
        wOff[0] = wOff[1] = k * 0.8;
      }
      memberPos[i].copy(_p);
      _e.set(rollA, yaw, pitch, 'YXZ');
      _q.setFromEuler(_e);
      const M = _m.compose(_p, _q, _s.setScalar(sc));
      core.setMatrixAt(i, M);
      const flapA = lerp(-0.55, 0.85, f) * (1 - sweep) + sweep * 0.25;
      parts.wings.forEach((w, k) => {
        const s = k ? -1 : 1;
        const W = new THREE.Matrix4().compose(_v.copy(w.at).add(new THREE.Vector3(-wOff[k] * 0.3, wOff[k] * 0.4, s * wOff[k])), new THREE.Quaternion().setFromEuler(new THREE.Euler(-s * flapA - s * wOff[k] * 2, s * -sweep * 1.05, -sweep * 0.25)), new THREE.Vector3(1, 1, 1));
        wings[k].setMatrixAt(i, M.clone().multiply(W));
      });
    }
    const hide = anim === 'scatter' && p >= 0.999;
    for (const m of [core, ...wings]) { m.instanceMatrix.needsUpdate = true; m.visible = !hide; }
    dust.step(dt);
  };
  const model = makeModel('knochenflieger_gruppe', root, update, [...own, core, ...wings], { initial: 'fly' });
  model.member = (i, out = new THREE.Vector3()) => { root.updateMatrixWorld(true); return out.copy(memberPos[clamp(i | 0, 0, n - 1)]).applyMatrix4(root.matrixWorld); };
  return model;
}

// =============================================================================================
// Kristall-Felsklotz
// =============================================================================================
const KK = { rock: 0x8a7a9e, rockHi: 0xc8b8dc, rockLow: 0x4a3a5a, moss: 0x7a6a8a, teal: W8.crystalTeal, tealHi: W8.crystalTealHi, vio: W8.crystal, vioHi: W8.crystalHi, mouth: 0x2a0e2a, tongue: 0xff7a9a, brow: 0x3a2e48 };
/** Kristallbüschel (3–4 sechseckige Spitzen, Fuß im Ursprung, wächst nach +Z). */
function crystalCluster(b, M, color, hi, seed, s = 1) {
  const k = 3 + (hash1(seed) > 0.5 ? 1 : 0);
  for (let i = 0; i < k; i++) {
    const h = (0.28 + hash1(seed + i) * 0.22) * s, r = (0.09 + hash1(seed + i * 3) * 0.05) * s;
    const g = new THREE.CylinderGeometry(r * 0.9, r, h * 0.7, 6, 1);
    g.translate(0, h * 0.35, 0);
    const tip = new THREE.ConeGeometry(r * 0.9, h * 0.3, 6, 1); tip.translate(0, h * 0.85, 0);
    b.add(tip, hi, M.clone().multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)).multiply(new THREE.Matrix4().compose(new THREE.Vector3((hash1(seed + i * 5) - 0.5) * 0.14 * s, 0, (hash1(seed + i * 7) - 0.5) * 0.14 * s), new THREE.Quaternion().setFromEuler(new THREE.Euler((hash1(seed + i * 2) - 0.5) * 0.9, 0, (hash1(seed + i * 4) - 0.5) * 0.9)), new THREE.Vector3(1, 1, 1))));
    const tilt = new THREE.Matrix4().compose(new THREE.Vector3((hash1(seed + i * 5) - 0.5) * 0.14 * s, 0, (hash1(seed + i * 7) - 0.5) * 0.14 * s), new THREE.Quaternion().setFromEuler(new THREE.Euler((hash1(seed + i * 2) - 0.5) * 0.9, 0, (hash1(seed + i * 4) - 0.5) * 0.9)), new THREE.Vector3(1, 1, 1));
    const toZ = new THREE.Matrix4().makeRotationX(Math.PI / 2);
    b.add(g, { v: (x, y) => mix(color, hi, smoothstep(y / (h * 0.7))) }, M.clone().multiply(toZ).multiply(tilt));
  }
}
function kkRockGeo(shape) {
  return cached(`w8:kk:rock:${shape}`, () => {
    const b = new Build();
    const rockV = { v: (x, y, z, nx, ny) => mix(KK.rockLow, mix(KK.rock, KK.rockHi, smoothstep(ny * 0.6 + nx * 0.2) * 0.7), smoothstep(ny * 0.5 + 0.6 + (noise3(x * 3, y * 3, z * 3) - 0.5) * 0.4)) };
    if (shape === 'wuerfel') {
      const g = new THREE.BoxGeometry(1, 1, 1, 6, 6, 6);
      const P = g.attributes.position;
      for (let i = 0; i < P.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(P, i); const n = v.clone().normalize(); v.lerp(n.multiplyScalar(0.62), 0.22); P.setXYZ(i, v.x, v.y, v.z); }
      g.computeVertexNormals();
      b.add(displace(g, 0.025, 4, 2, true), rockV, { s: 0.98 });
    } else b.add(lumpyEllipsoid([0.5, 0.5, 0.5], 0.03, 3.2, 1, 34, 24), rockV);
    // Gesicht vorn (+X): Steinbrauen, Schmollmund mit Zunge, Bäckchen
    const fx = shape === 'wuerfel' ? 0.5 : 0.45;
    for (const s of [1, -1]) {
      b.box(0.07, 0.07, 0.24, KK.brow, { p: [fx + 0.02, 0.2, s * 0.15], r: [s * -0.35, -s * 0.25, 0], order: 'YXZ' }, 0.03, 1);
      b.sphere(1, 0xc89ad8, { p: [fx - 0.02, -0.04, s * 0.22], s: [0.03, 0.05, 0.07] }, 8, 6);
    }
    b.sphere(1, KK.mouth, { p: [fx - 0.005, -0.15, 0], s: [0.035, 0.05, 0.11] }, 14, 8);
    b.sphere(1, KK.tongue, { p: [fx + 0.01, -0.175, 0.02], s: [0.02, 0.022, 0.05] }, 8, 6);
    b.capsule(0.022, 0.2, KK.brow, { p: [fx + 0.012, -0.105, 0], r: [Math.PI / 2, 0, 0] }, 2, 8);
    return b.geometry();
  });
}
function kkCrystalGeo(shape) {
  return cached(`w8:kk:crys:${shape}`, () => {
    const b = new Build();
    // Kristallbüschel nur an den Seiten (±Z, um die Rollachse) und kurz – die Lauffläche oben bleibt frei
    const spots = [];
    for (const s of [1, -1]) {
      const zf = shape === 'wuerfel' ? 0.5 : 0.44;
      spots.push([0, 0.05, s * zf, s], [-0.22, 0.22, s * (zf - 0.06), s], [0.18, -0.24, s * (zf - 0.06), s], [-0.25, -0.2, s * (zf - 0.08), s], [0.24, 0.2, s * (zf - 0.1), s]);
    }
    spots.forEach(([x, y, z, s], i) => {
      const n = shape === 'wuerfel' ? new THREE.Vector3(x * 0.6, y * 0.6, s).normalize() : new THREE.Vector3(x, y, z).normalize();
      const pos = shape === 'wuerfel' ? new THREE.Vector3(x, y, z) : n.clone().multiplyScalar(0.46);
      const M = new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n), new THREE.Vector3(1, 1, 1));
      const teal = i % 2 === 0;
      crystalCluster(b, M, teal ? KK.teal : KK.vio, teal ? KK.tealHi : KK.vioHi, i * 11 + (shape === 'wuerfel' ? 5 : 0), i % 5 === 0 ? 0.62 : 0.45);
    });
    return b.geometry();
  });
}
const KK_EYES = (shape) => { const fx = shape === 'wuerfel' ? 0.49 : 0.43; return [1, -1].map((s) => ({ p: [fx, 0.08, s * 0.15], r: 0.1, sy: 1.15, dir: [1, 0.05, s * 0.25] })); };
function buildFelsklotz(opts = {}) {
  const S = clamp(num(opts.size, 3), 0.5, 12);
  const shape = opts.shape === 'wuerfel' ? 'wuerfel' : 'kugel';
  const root = new THREE.Group();
  const own = [];
  const flash = ownMat(vcol(0.55, {}, 'w8kk'), { emissive: 0x000000 });
  const crysMat = ownMat(vcol(0.15, { metalness: 0.1 }, 'w8kkcrys'), { emissive: 0x000000 });
  own.push(flash, crysMat);
  const center = joint([0, S / 2, 0]);
  const roller = joint();
  roller.scale.setScalar(S);
  roller.add(mesh(kkRockGeo(shape), flash, {}, true), mesh(kkCrystalGeo(shape), crysMat, {}, true));
  const eye = eyes(KK_EYES(shape), { key: `w8:kk:${shape}`, iris: 0x7a3ad8, pupil: 0.55, depth: 0.5 });
  roller.add(eye);
  center.add(roller);
  const glow = glowSprite(0x7af0ff, S * 1.6, 0.0);
  glow.material = glow.material.clone(); own.push(glow.material);
  center.add(glow);
  const dust = fxPuffs(14, 0xd8c8e0, { opacity: 0.8, radius: S * 2, cy: S * 0.3 });
  own.push(dust);
  root.add(center, dust.mesh);
  root.userData.top = S; root.userData.radius = S / 2;
  const clk = new Clock(), blink = new Blinker();
  let roll = 0, emit = 0, heat = 0;
  const update = (dt, st) => {
    let anim = st.anim ?? 'idle';
    if (!['idle', 'roll', 'fast'].includes(anim)) anim = 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    const moving = anim !== 'idle';
    if (st.roll !== undefined) roll = num(st.roll, 0);
    else if (moving) roll += dt * num(st.speed, anim === 'fast' ? 4 : 2) / (S / 2);
    heat = damp(heat, anim === 'fast' ? 1 : moving ? 0.35 : 0.15 + Math.max(0, Math.sin(t * 1.7)) * 0.15, 4, dt);
    // Rollen: Kugel um die eigene Mitte; Würfel kippt über die Vorderkante (Mitte hebt sich)
    let cy = S / 2;
    if (shape === 'wuerfel') { const ph = ((roll % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2); cy = (S / Math.SQRT2) * Math.sin(Math.PI / 4 + ph); }
    const breathe = anim === 'idle' ? 1 + Math.sin(t * 2) * 0.012 : 1;
    center.position.set(0, cy, 0);
    roller.rotation.set(0, 0, -roll);
    roller.scale.set(S * breathe, S / breathe, S * breathe);
    crysMat.emissive.setRGB(heat * 0.25, heat * 0.55, heat * 0.6);
    glow.material.opacity = heat * 0.45;
    glow.scale.setScalar(S * (1.5 + heat * 0.3));
    emit -= dt;
    if (moving && emit <= 0) { dust.burst([-S * 0.4, 0.1, (Math.random() - 0.5) * S * 0.6], { count: anim === 'fast' ? 3 : 1, speed: 1.2, up: 1, size: S * 0.07, life: 0.7, spread: S * 0.1 }); emit = anim === 'fast' ? 0.05 : 0.12; }
    dust.step(dt);
    let bk = blink.update(dt);
    if (anim === 'fast') bk = 1.15; else if (anim === 'roll') bk = 0.85;
    eye.userData.blink(bk);
    eye.scale.setScalar(anim === 'fast' ? 1.15 : 1);
  };
  return makeModel('kristall_felsklotz', root, update, own, { initial: 'idle' });
}

// =============================================================================================
// Baron-Sandstatue
// =============================================================================================
const SAND = { lo: 0xa88c6c, mid: 0xdcc49e, hi: 0xf8eedc, dark: 0x7a624a };
/** Statue: Welt-1-Baron (ohne Auto, steht) in Sandtönen; Ursprung = Fußpunkt der Figur. */
const statueGeo = () => memo('w8:statue:baron', () => {
  const h = harvest('baron_w1_stand', () => B1.baron_brummbaer({ withCar: false }), (m) => m.update(0, { anim: 'idle' }));
  const lit = clusterSimplify(recolor(h.lit, toneMap(SAND.lo, SAND.mid, SAND.hi, 0.05, 0.9)), 0.045);
  // Körnung (leichtes Rauschen je Ecke)
  const P = lit.attributes.position, C = lit.attributes.color;
  for (let i = 0; i < P.count; i++) { const k = 0.9 + noise3(P.getX(i) * 9, P.getY(i) * 9, P.getZ(i) * 9) * 0.2; C.setXYZ(i, C.getX(i) * k, C.getY(i) * k, C.getZ(i) * k); }
  lit.computeBoundingBox();
  return lit;
});
const pedestalGeo = () => cached('w8:statue:pedestal', () => {
  const b = new Build();
  const stoneV = { v: (x, y, z, nx, ny) => mix(SAND.lo, mix(SAND.mid, SAND.hi, smoothstep(ny * 0.5 + 0.2) * 0.6), smoothstep(ny * 0.4 + 0.5 + (noise3(x * 4, y * 4, z * 4) - 0.5) * 0.5)) };
  b.box(2.4, 0.3, 2.4, stoneV, { p: [0, 0.15, 0] }, 0.06, 2);
  b.box(2.0, 0.62, 2.0, stoneV, { p: [0, 0.6, 0] }, 0.08, 2);
  b.box(2.2, 0.12, 2.2, stoneV, { p: [0, 0.95, 0] }, 0.04, 1);
  bearEmblem(b, { p: [1.0, 0.6, 0], r: [0, Math.PI / 2, 0] }, 0.25, SAND.hi, SAND.dark);
  // Sandverwehungen am Fuß
  for (const [x, z, r] of [[1.2, 0.9, 0.6], [-1.3, -0.6, 0.7], [0.6, -1.3, 0.5], [-0.8, 1.2, 0.55]]) b.add(lumpyEllipsoid([r, r * 0.35, r * 0.8], 0.03, 3, x * 7, 12, 6), { v: (x2, y, z2, nx, ny) => mix(SAND.mid, SAND.hi, smoothstep(ny * 0.5 + 0.4)) }, { p: [x, r * 0.3, z] });
  return b.geometry();
});
const pileGeo = () => cached('w8:statue:pile', () => new Build().add(lumpyEllipsoid([0.75, 0.4, 0.7], 0.06, 3, 4, 14, 8), { v: (x, y, z, nx, ny) => mix(SAND.lo, SAND.hi, smoothstep(ny * 0.6 + 0.3)) }, { p: [0, 0.05, 0] }).geometry());
const chunkGeo = () => cached('w8:statue:chunk', () => new Build().add(new THREE.DodecahedronGeometry(0.22, 0), { v: (x, y, z, nx, ny) => mix(SAND.lo, SAND.hi, smoothstep(ny * 0.5 + 0.5)) }).geometry());
function buildSandstatue(opts = {}) {
  const S = clamp(num(opts.size, 1), 0.3, 5);
  const root = new THREE.Group();
  const own = [];
  const scaleJ = joint(); scaleJ.scale.setScalar(S);
  const sandMat = vcol(0.95, { toy: { spec: 0.1 } }, 'w8sand');
  const ped = mesh(pedestalGeo(), sandMat, {}, true);
  ped.receiveShadow = true;
  const fig = joint([0, 1.01, 0]);
  const statue = mesh(statueGeo(), sandMat, {}, true);
  fig.add(statue);
  const pile = mesh(pileGeo(), sandMat, { p: [0, 1.0, 0] }, true);
  pile.visible = false;
  const NC = 14;
  const chunks = instMesh(chunkGeo(), sandMat, NC, 5, 1.5);
  chunks.castShadow = true;
  scaleJ.add(ped, fig, pile, chunks);
  const dust = fxPuffs(16, 0xf0d8a0, { opacity: 0.85, radius: 6 * S, cy: 2 * S });
  own.push(dust);
  root.add(scaleJ, dust.mesh);
  root.userData.top = 1.0 * S;
  const CH = Array.from({ length: NC }, (_, i) => ({ p: new THREE.Vector3((hash1(i) - 0.5) * 0.8, 1.2 + hash1(i + 5) * 2.2, (hash1(i + 9) - 0.5) * 0.8), v: new THREE.Vector3((hash1(i + 2) - 0.5) * 4, 1 + hash1(i + 3) * 2, (hash1(i + 4) - 0.5) * 4), s: 0.6 + hash1(i + 6) * 0.9 }));
  const clk = new Clock();
  let lastBr = 0;
  const update = (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    const br = clamp(num(st.break, 0), 0, 1);
    const t = clk.t;
    // zittern, dann zerbröseln (Figur sackt in sich zusammen)
    const shake = br > 0 && br < 0.2 ? Math.sin(t * 50) * 0.03 : 0;
    const crumble = smoothstep((br - 0.15) / 0.6);
    fig.position.set(shake, 1.01, shake * 0.6);
    fig.scale.set(1 + crumble * 0.2, Math.max(0.001, 1 - crumble), 1 + crumble * 0.2);
    fig.visible = crumble < 0.995;
    pile.visible = br > 0.5;
    pile.scale.setScalar(Math.max(0.001, smoothstep((br - 0.5) / 0.5)));
    chunks.visible = br > 0.15 && br < 0.999;
    if (chunks.visible) {
      const tt = (br - 0.15) * 1.6;
      CH.forEach((c, i) => {
        let y = c.p.y + c.v.y * tt - 4.9 * tt * tt;
        const x = c.p.x + c.v.x * tt, z = c.p.z + c.v.z * tt;
        const onPed = Math.abs(x) < 1.1 && Math.abs(z) < 1.1;
        y = Math.max(y, onPed ? 1.05 : 0.1);
        setInst(chunks, i, x, y, z, tt * 4 + i, tt * 3, i, c.s * (1 - smoothstep((br - 0.7) / 0.3)));
      });
      chunks.instanceMatrix.needsUpdate = true;
    }
    if (br > 0.15 && lastBr <= 0.15) dust.burst([0, 2.2 * S, 0], { count: 16, speed: 1.6 * S, up: 0.8, size: 0.35 * S, life: 1.0, spread: 0.8 * S, force: true });
    lastBr = br;
    dust.step(dt);
  };
  return makeModel('baron_sandstatue', root, update, [...own, chunks], { initial: 'idle' });
}

export const MODELS = {
  sandflosser: buildSandflosser,
  knochenflieger_gruppe: buildKnochenGruppe,
  kristall_felsklotz: buildFelsklotz,
  baron_sandstatue: buildSandstatue,
};
