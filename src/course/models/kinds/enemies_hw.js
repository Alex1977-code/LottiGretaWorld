// Gegner-Modelle Halloween-Welt „Kürbisinsel“ (Kurs-Modus): Kürbling, Klapperknochen, Flatterfledi, Hexenhut-Hüpfer und
// die Halloween-Varianten von Spuk/Großspuk und Kreisgeist (Welt-3-Modelle aus enemies_w3.js, erweitert statt neu erfunden).
// Kindgerecht-gruselig: runde Spielzeugformen, große Glanzaugen, Lachgesichter. Eigene Gestaltung, keine Nachbauten.
// Maßstab Meter, Ursprung = Fußpunkt, Blick nach +X; state darf ein String sein ('idle' ≙ { anim: 'idle' }). Unbekannte
// anim → wie 'idle'. progress (0..1) überschreibt bei Einmal-/Zyklus-Animationen die Zeit seit dem Zustandswechsel.
//
// kuerbling          ≈0,75 m  Kürbling: hüpfender Orange-Kürbis mit großen Glanzaugen, frechen Brauen, geschnitztem
//   Leucht-Grinsen, rosa Wangen, Blatt-Mütze (großes Kürbisblatt mit Stiel und Ranke) und grünen Knubbelfüßen.
//   state { anim: 'idle'|'hop'|'squashed'|'burst', height (m; Sprunghöhe, Standard 0,45),
//           progress? (hop: 0..1 im Zyklus 0,6 s; burst: 0..1 in 0,7 s) }
//         idle: wippt auf den Füßen, blinzelt, Blatt wippt, Grinsen flackert warm;
//         hop: ducken – strecken – Bogen (Höhe macht das Modell, der Motor bewegt root waagerecht) – landen;
//         squashed: platt gedrückt, Augen zu, Schwindelsterne;
//         burst: zerplatzt in Schalenstücke und Kerne (Münzen erzeugt der Motor), danach unsichtbar.
//   root.userData.bodyY → Höhe der Körpermitte über dem Ursprung (Trefferzone Radius ≈0,36 m).
// klapperknochen     ≈1,1 m  Klapperknochen: niedliches Skelett mit großem runden Schädel (Glanzaugen in den Augenhöhlen,
//   Herznase, breites Grinsen mit Blockzähnen), Rippenbögen, Wirbel, lila-oranges Halstuch, Knubbelgelenke, Stiefelchen.
//   state { anim: 'walk'|'idle'|'collapse'|'pile'|'rebuild'|'defeated', speed (m/s; walk Standard 1,2),
//           progress? (collapse 0..1 in 0,5 s; rebuild 0..1 in 0,8 s; defeated 0..1 in 0,9 s) }
//         walk: klappernder Watschelgang, Kiefer klappert; collapse: fällt zu einem Knochenhaufen zusammen;
//         pile: Haufen am Boden, der Schädel obenauf schaut sich um (Schwindelsterne); rebuild: Knochen hüpfen zurück,
//         progress 1 = wieder ganz (der Motor zählt die 4 s Wartezeit selbst); defeated: zerfällt und verblasst.
//   root.userData.headY → Höhe der Schädelmitte (aktuelle Haltung).
// flatterfledi       Spannweite ≈1,1 m  Flatterfledi: runde, flauschige Lila-Fledermaus mit großen Ohren (rosa innen),
//   riesigen Glanzaugen, Stupsnase, zwei Plastik-Zähnchen, Flügel mit Fingerknochen, Krallenfüßchen.
//   **Ursprung = Füße**; fly/dive: Körpermitte bei y = 0,3 darüber; hang: hängt kopfüber vom Ursprung nach unten.
//   state { anim: 'fly'|'dive'|'hang'|'idle', flap (0..1 Flügelphase; überschreibt die Zeit), speed (m/s; fly) }
//         fly: flattert und wippt; dive: Flügel angelegt, Nase voran nach unten (Bogen macht der Motor);
//         hang: kopfüber, eingewickelt, blinzelt verschlafen.
// hexenhut_huepfer   ≈1,0 m  Hexenhut-Hüpfer: lila Hexenhut mit geknickter Spitze, oranger Bandschleife und Goldschnalle
//   auf zwei Ringelstrumpf-Beinchen mit Ringelschuhen; unter der Krempe leuchten zwei große Augen aus dem Schatten.
//   state { anim: 'idle'|'hop'|'squashed', height (m, Standard 0,5), progress? (hop: 0..1 im Zyklus 0,7 s) }
//         hop: wie Kürbling (Motor bewegt waagerecht); squashed: Hut zerknautscht, Spitze knickt, Augen zu, Sterne.
// spuk_halloween     Spuk (wie 'spuk', Welt 3) in Halloween-Farben: pfirsich-orange Glühen, lila Ringelschwanz und ein
//   Kürbis-Hütchen (bzw. kleiner Hexenhut) auf dem Kopf. Ursprung = Unterkante des Körpers (Schwebehöhe setzt der Motor).
//   opts  { size: Faktor (Standard 1; Großspuk ≈ 2,5), hat: 'kuerbis' (Standard) | 'hexe' | 'kein' }
//   state wie 'spuk': { anim: 'chase'|'shy'|'fade'|'idle'|'hit'|'defeated' }
// kreisgeist_halloween  Kreisgeist (wie 'kreisgeist') in Halloween-Farben: cremefarbenes Laken, lila Zipfelmütze mit
//   orangen Ringeln und Kürbis-Bommel. state { anim: 'circle'|'peek'|'defeated' }
// kreisgeist_kreis_halloween  ganzer Kreis davon als Instanzen (wie 'kreisgeist_kreis'), Mitte im Ursprung.
//   opts  { count (8), radius (3) }  state { anim: 'circle'|'peek', angle (rad), alive (Array bool oder Bitmaske) }

import {
  THREE, TAU, Build, cached, vcol, basic, mesh, joint, eyes, makeModel, Clock, Blinker, damp, clamp, mix, smoothstep,
  instMesh, dizzyStars, placed, onEllipsoid, sparkleSprite, glowSprite,
} from '../lib/kit.js';
import { Puffs, stick } from '../lib/kit_w3.js';
import {
  HW, PK, PK_COLORS, pkPoint, pkSurf, pumpkinGeo, stemGeo, leafGeo, tendrilGeo, addFace, glow, ownMat, puffyGeo,
  witchHatGeo, ellSurf, hash1, memo, batWingGeo, roundPoly, polyShape,
} from '../lib/hwGeos.js';
import { MODELS as W3 } from './enemies_w3.js';

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
const prog = (st, clk, dur, loop = false) => (st.progress !== undefined ? clamp(Number(st.progress) || 0, 0, 1) : loop ? (clk.age % dur) / dur : clamp(clk.age / dur, 0, 1));

// =============================================================================================
// Kürbling
// =============================================================================================
const KB_P = { R: 0.36, Hh: 0.27, ribs: 8, depth: 0.085, dimple: 0.22, bottom: 0.86 };
const KB_FOOT = 0.07;                       // Fußhöhe: Körperunterkante über dem Boden
const KB_CY = KB_FOOT + KB_P.Hh * KB_P.bottom - 0.02;   // Körpermitte
const KB_TOP = pkPoint(KB_P, 0, 1.25).p.y;  // Höhe der Kuhle oben (relativ zur Mitte)
function kbBodyGeo() {
  return cached('hw:kb:body', () => {
    const b = new Build();
    b.parts.push(pumpkinGeo(KB_P, PK_COLORS.orange));
    const surf = pkSurf(KB_P);
    // Wangen, freche Brauen (dunkelbraun, schräg nach innen-oben)
    for (const s of [1, -1]) {
      stick(b, surf(s * 0.62, -0.12), HW.cheek, [0.06, 0.04, 0.02], 0.3);
      const h = surf(s * 0.3, 0.78);
      b.capsule(0.02, 0.075, 0x5a2a10, placed(h.p.clone().addScaledVector(h.n, 0.012), h.n, new THREE.Vector3(1, 1, 1)).multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2 + s * 0.35)), 3, 8);
    }
    return b.geometry();
  });
}
function kbGlowGeos() {
  return memo('hw:kb:face', () => {
    const body = new Build(), gl = new Build();
    addFace(body, gl, pkSurf(KB_P), { kind: 'mund', az: 0, el: -0.02, w: 0.4, h: 0.42 });
    return { rim: body.geometry(), glow: gl.geometry() };
  });
}
function kbCapGeo() {
  return cached('hw:kb:cap', () => {
    const b = new Build();
    const top = KB_TOP;
    b.parts.push(stemGeo(0.12, 0.045, false, 0.6).clone().translate(0, top - 0.02, 0));
    // Blatt-Mütze: großes Blatt, das schräg nach hinten-links über den Kopf hängt
    // großes Blatt wie eine schiefe Baskenmütze: Spitze hängt vorn rechts über die Stirn
    const leaf = leafGeo(0.44, false, 0.55).clone();
    leaf.rotateZ(-0.32); leaf.rotateY(0.75);
    leaf.translate(-0.06, top + 0.07, 0.05);
    b.parts.push(leaf);
    const leaf2 = leafGeo(0.26, false, 0.35).clone();
    leaf2.rotateZ(-0.45); leaf2.rotateY(Math.PI * 0.85);
    leaf2.translate(0.0, top + 0.05, 0.0);
    b.parts.push(leaf2);
    b.parts.push(tendrilGeo(0.07, 1.7, 0.011).clone().rotateY(0.8).translate(-0.02, top + 0.06, -0.05));
    return b.geometry();
  });
}
const kbFootGeo = () => cached('hw:kb:foot', () => new Build().sphere(1, { v: (x, y, z, nx, ny) => mix(HW.leafLow, HW.leaf, smoothstep(ny * 0.6 + 0.5)) }, { p: [0.03, 0.045, 0], s: [0.1, 0.055, 0.075] }, 16, 10).geometry());
const kbChunkGeo = () => cached('hw:kb:chunk', () => {
  const b = new Build();
  b.sphere(1, (x, y, z, nx, ny, nz) => (nz < -0.3 ? HW.pkFlesh : nz < 0.1 ? HW.pkLow : HW.pk), { s: [0.11, 0.08, 0.05] }, 12, 8);
  return b.geometry();
});
const kbSeedGeo = () => cached('hw:kb:seed', () => new Build().sphere(1, gradSeed(), { s: [0.035, 0.022, 0.012] }, 8, 6).geometry());
const gradSeed = () => ({ v: (x, y, z, nx, ny) => mix(0xe8d8a8, 0xfff8e0, smoothstep(ny * 0.5 + 0.5)) });
const KB_EYES = [1, -1].map((s) => { const h = pkPoint(KB_P, s * 0.27, 0.34); return { p: [h.p.x, h.p.y + KB_CY, h.p.z], r: 0.098, sy: 1.32, dir: h.n.clone().lerp(new THREE.Vector3(1, 0, 0), 0.4).toArray() }; });

function buildKuerbling() {
  const root = new THREE.Group();
  const own = [];
  const glowMat = ownMat(glow(), { color: new THREE.Color(1, 1, 1) });
  own.push(glowMat);
  const pose = joint();                 // Sprunghöhe
  const squash = joint([0, KB_CY, 0]);  // Stauchen um die Körpermitte
  const bodyM = mesh(kbBodyGeo(), vcol(0.32), {}, true);
  const faces = kbGlowGeos();
  const rimM = mesh(faces.rim, vcol(0.32));
  const glowM = mesh(faces.glow, glowMat);
  const cap = joint([0, KB_TOP, 0], mesh(kbCapGeo(), vcol(0.4), { p: [0, -KB_TOP, 0] }, true));
  const eye = eyes(KB_EYES.map((e) => ({ ...e, p: [e.p[0], e.p[1] - KB_CY, e.p[2]] })), { key: 'hw:kb', iris: 0x6a2a08, pupil: 0.62, depth: 0.5 });
  squash.add(bodyM, rimM, glowM, cap, eye);
  pose.add(squash);
  const feet = instMesh(kbFootGeo(), vcol(0.36), 2, 1, 0.1);
  feet.castShadow = true;
  const chunks = instMesh(kbChunkGeo(), vcol(0.36), 8, 2.5, 0.4);
  const seeds = instMesh(kbSeedGeo(), vcol(0.4), 12, 2.5, 0.4);
  chunks.castShadow = true;
  const puffs = new Puffs(6, 0xffb46a, { opacity: 0.85, radius: 2, cy: 0.4 });
  own.push(puffs);
  const dizzy = dizzyStars(0.3, 0.07);
  root.add(pose, feet, chunks, seeds, puffs.mesh, dizzy);
  // Flugbahnen der Stücke (fest je Exemplar)
  const bits = Array.from({ length: 20 }, (_, i) => {
    const a = (i / (i < 8 ? 8 : 12)) * TAU + hash1(i) * 0.5;
    return { a, up: 2.4 + hash1(i * 3.1) * 1.8, out: 1.4 + hash1(i * 5.7) * 1.2, spin: (hash1(i * 7.3) - 0.5) * 18 };
  });
  const clk = new Clock(), blink = new Blinker();
  let sq = 0, burstOn = false;
  root.userData.bodyY = KB_CY;
  const update = (dt, st) => {
    let anim = st.anim ?? 'idle';
    if (!['idle', 'hop', 'squashed', 'burst'].includes(anim)) anim = 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    let y = 0, sx = 1, sy = 1, lean = 0, tuck = 0, capLag = 0;
    if (anim === 'idle') {
      const b = Math.sin(t * 3.2);
      sy = 1 + b * 0.03; sx = 1 - b * 0.02;
      capLag = Math.sin(t * 3.2 - 0.6) * 0.08;
    } else if (anim === 'hop') {
      const p = prog(st, clk, 0.6, true), H = st.height ?? 0.45;
      if (p < 0.15) { const k = Math.sin((p / 0.15) * Math.PI * 0.5); sy = 1 - 0.22 * k; sx = 1 + 0.14 * k; capLag = -0.2 * k; }
      else if (p < 0.85) {
        const k = (p - 0.15) / 0.7;
        y = 4 * k * (1 - k) * H;
        const s = Math.max(0, 1 - k * 3);
        sy = 1 + 0.16 * s - 0.06 * smoothstep((k - 0.7) / 0.3); sx = 1 - 0.08 * s;
        tuck = Math.sin(k * Math.PI); lean = -0.12 * (1 - 2 * k);
        capLag = 0.35 * Math.cos(k * Math.PI);
      } else { const k = Math.sin(((p - 0.85) / 0.15) * Math.PI); sy = 1 - 0.18 * k; sx = 1 + 0.12 * k; capLag = -0.15 * k; }
    }
    const flat = anim === 'squashed';
    sq = damp(sq, flat ? 1 : 0, flat ? 22 : 8, dt);
    sy *= 1 - sq * 0.6; sx *= 1 + sq * 0.32;
    pose.position.y = y;
    squash.position.y = KB_CY * sy;
    squash.scale.set(sx, sy, sx);
    squash.rotation.z = lean;
    cap.rotation.z = capLag + (flat ? -0.5 : 0);
    cap.rotation.x = Math.sin(t * 2.1) * 0.05;
    root.userData.bodyY = y + KB_CY * sy;
    // Füße: unter dem Körper, ziehen sich beim Sprung ein
    for (let i = 0; i < 2; i++) {
      const s = i ? -1 : 1;
      const step = anim === 'idle' ? Math.max(0, Math.sin(t * 3.2 + i * Math.PI)) * 0.015 : 0;
      _v.set(0.05 + tuck * 0.02, y + tuck * 0.06 + step, s * (0.14 - tuck * 0.03));
      _q.setFromEuler(_e.set(s * tuck * 0.4, s * 0.15, -tuck * 0.5));
      feet.setMatrixAt(i, flat ? _m.compose(_v.set(0.08, 0, s * 0.2), _q.identity(), _s.set(1.1, 0.6, 1.1)) : _m.compose(_v, _q, _s.setScalar(1)));
    }
    feet.instanceMatrix.needsUpdate = true;
    // Platzen
    const burst = anim === 'burst';
    if (burst && !burstOn) puffs.burst([0, KB_CY, 0], { count: 6, speed: 1.8, up: 1, size: 0.22, life: 0.6, spread: 0.2 });
    burstOn = burst;
    const bp = burst ? prog(st, clk, 0.7) : 0;
    pose.visible = !burst;
    feet.visible = !burst;
    chunks.visible = seeds.visible = burst && bp < 1;
    if (burst && bp < 1) {
      const tt = bp * 0.7;
      for (let i = 0; i < 20; i++) {
        const it = bits[i];
        const yy = KB_CY + it.up * tt - 5.5 * tt * tt;
        const fade = 1 - smoothstep((bp - 0.7) / 0.3);
        _v.set(Math.cos(it.a) * it.out * tt, Math.max(0.02, yy), Math.sin(it.a) * it.out * tt);
        _q.setFromEuler(_e.set(it.spin * tt, it.a, it.spin * 0.6 * tt));
        _m.compose(_v, _q, _s.setScalar(fade));
        if (i < 8) chunks.setMatrixAt(i, _m); else seeds.setMatrixAt(i - 8, _m);
      }
      chunks.instanceMatrix.needsUpdate = true; seeds.instanceMatrix.needsUpdate = true;
    }
    puffs.step(dt);
    // Gesicht
    const fl = 0.85 + Math.sin(t * 11) * 0.06 + Math.sin(t * 17.3) * 0.05;
    glowMat.color.setScalar(flat ? 0.55 : fl);
    let bk = blink.update(dt);
    if (flat) bk = 0.08; else if (anim === 'hop') bk = 1;
    eye.userData.blink(bk);
    dizzy.visible = flat;
    if (flat) { dizzy.position.y = 0.38; dizzy.rotation.y = t * 4; }
  };
  return makeModel('kuerbling', root, update, [...own, feet, chunks, seeds], { initial: 'idle' });
}

// =============================================================================================
// Klapperknochen
// =============================================================================================
const KK = { bone: HW.bone, hi: HW.boneHi, low: HW.boneLow, shade: HW.boneShade, socket: 0x3a2050, ink: 0x2a1430, boot: 0x6a3ac8, bootHi: 0xa47aff, sole: 0xffe8c8, scarfA: 0xff8a1a, scarfB: 0x8a4ae0 };
const boneV = { v: (x, y, z, nx, ny) => mix(KK.low, KK.bone, smoothstep(ny * 0.5 + 0.62)) };
const SKULL_C = [0.02, 0.0, 0], SKULL_R = [0.25, 0.23, 0.26];
const KK_SKULL_Y = 1.0;
/** Knochenstab mit Doppelknubbeln an beiden Enden (Achse −Y ab Ursprung, Länge len). */
function addBone(b, len, r = 0.034, y0 = 0) {
  b.capsule(r, len, boneV, { p: [0, y0 - len / 2, 0] }, 3, 12);
  for (const yy of [y0, y0 - len]) for (const s of [1, -1]) b.sphere(r * 1.32, boneV, { p: [0, yy, s * r * 0.8] }, 12, 8);
}
function kkSkullGeo() {
  return cached('hw:kk:skull', () => {
    const b = new Build();
    // Schädel: runde Kugel, Stirnglanz
    b.sphere(1, { v: (x, y, z, nx, ny) => mix(KK.low, mix(KK.bone, KK.hi, smoothstep(ny * 0.8 + nx * 0.3 - 0.2)), smoothstep(ny * 0.55 + 0.75)) }, { p: SKULL_C, s: SKULL_R }, 40, 28);
    const surf = ellSurf(SKULL_C, SKULL_R);
    // große Augenhöhlen (dunkel-lila), Herznase, Wangen
    for (const s of [1, -1]) {
      stick(b, surf(s * 0.36, 0.1), KK.socket, [0.105, 0.12, 0.03], 0.45);
      stick(b, surf(s * 0.78, -0.3), HW.cheek, [0.05, 0.03, 0.02], 0.3);
    }
    const heart = new THREE.Shape();
    heart.moveTo(0, -0.9); heart.bezierCurveTo(0.4, -0.5, 1.0, -0.1, 0.9, 0.35); heart.bezierCurveTo(0.8, 0.85, 0.2, 0.9, 0, 0.5);
    heart.bezierCurveTo(-0.2, 0.9, -0.8, 0.85, -0.9, 0.35); heart.bezierCurveTo(-1.0, -0.1, -0.4, -0.5, 0, -0.9);
    const hn = surf(0, -0.17);
    b.add(puffyGeo(heart, 0.25, 0.15, 8, 2), KK.socket, placed(hn.p.clone().addScaledVector(hn.n, -0.004), hn.n, new THREE.Vector3(0.032, 0.03, 0.06)));
    // obere Zahnreihe (Grinsen) auf der Unterkante des Schädels
    for (let i = -3; i <= 3; i++) {
      const h = surf(i * 0.12, -0.5);
      b.box(0.042, 0.05, 0.03, i % 2 ? 0xfffaf0 : 0xffffff, placed(h.p.clone().addScaledVector(h.n, -0.008), h.n, new THREE.Vector3(1, 1, 1)), 0.012, 1);
    }
    const gl = surf(0, -0.36);
    b.torus(0.15, 0.012, KK.ink, placed(gl.p.clone().addScaledVector(gl.n, -0.01), gl.n, new THREE.Vector3(1, 0.55, 1)).multiply(new THREE.Matrix4().makeRotationZ(Math.PI * 1.08)), 6, 20, Math.PI * 0.84);
    return b.geometry();
  });
}
function kkJawGeo() {
  return cached('hw:kk:jaw', () => {
    const b = new Build();
    // Unterkiefer: runde Schale (vorn breit), Zähnchen oben; Drehpunkt hinten oben (Ursprung)
    b.sphere(1, boneV, { p: [0.09, -0.06, 0], s: [0.15, 0.075, 0.19] }, 28, 14);
    b.sphere(1, KK.ink, { p: [0.12, -0.035, 0], s: [0.11, 0.035, 0.15] }, 20, 8);
    for (let i = -2; i <= 2; i++) b.box(0.04, 0.045, 0.028, 0xffffff, { p: [0.2 - Math.abs(i) * 0.012, -0.022, i * 0.052], r: [0, i * 0.3, 0] }, 0.012, 1);
    b.sphere(1, HW.tongue, { p: [0.12, -0.04, 0.02], s: [0.06, 0.02, 0.06] }, 12, 6);
    return b.geometry();
  });
}
function kkTorsoGeo() {
  return cached('hw:kk:torso', () => {
    const b = new Build();
    // Wirbelsäule (Perlen), drei Rippenbögen, Brustbein; Ursprung = Beckenmitte oben (y 0)
    for (let i = 0; i < 6; i++) b.sphere(0.04 - i * 0.002, boneV, { p: [-0.05, 0.03 + i * 0.065, 0], s: [1, 0.75, 1] }, 12, 8);
    for (let i = 0; i < 3; i++) {
      const y = 0.17 + i * 0.075, R = 0.15 - i * 0.012;
      b.torus(R, 0.024, boneV, { p: [0.0, y, 0], r: [Math.PI / 2, 0, 0], s: [1, 1.18, 1] }, 8, 28, Math.PI * 1.55);
    }
    b.capsule(0.03, 0.14, boneV, { p: [0.14, 0.24, 0], r: [0, 0, 0.12] }, 3, 10);
    // Halstuch (orange-lila geringelt) mit Knoten und Zipfeln vorn
    b.torus(0.1, 0.042, (x, y, z) => (Math.floor((Math.atan2(z, x) / TAU + 1) * 10) % 2 ? KK.scarfA : KK.scarfB), { p: [-0.02, 0.38, 0], r: [Math.PI / 2, 0, 0] }, 10, 28);
    b.sphere(0.048, KK.scarfA, { p: [0.1, 0.36, 0.04] }, 12, 8);
    b.capsule(0.03, 0.09, KK.scarfB, { p: [0.13, 0.29, 0.07], r: [0.35, 0, 0.2] }, 3, 8);
    b.capsule(0.03, 0.08, KK.scarfA, { p: [0.14, 0.3, 0.01], r: [-0.2, 0, 0.25] }, 3, 8);
    return b.geometry();
  });
}
const kkPelvisGeo = () => cached('hw:kk:pelvis', () => {
  const b = new Build();
  b.sphere(1, boneV, { p: [0, -0.02, 0], s: [0.12, 0.07, 0.15] }, 22, 12);
  for (const s of [1, -1]) b.sphere(1, boneV, { p: [-0.01, 0.0, s * 0.1], s: [0.08, 0.06, 0.06] }, 14, 8);
  return b.geometry();
});
const kkArmGeo = () => cached('hw:kk:arm', () => {
  const b = new Build();
  addBone(b, 0.24, 0.03);
  // Fäustling-Hand mit drei Fingerknubbeln
  b.sphere(1, boneV, { p: [0.01, -0.3, 0], s: [0.06, 0.065, 0.045] }, 16, 10);
  for (let i = -1; i <= 1; i++) b.sphere(0.022, boneV, { p: [0.04, -0.35, i * 0.026] }, 10, 6);
  b.sphere(0.022, boneV, { p: [0.05, -0.29, 0.04] }, 10, 6);
  return b.geometry();
});
const kkLegGeo = () => cached('hw:kk:leg', () => {
  const b = new Build();
  addBone(b, 0.2, 0.034);
  // Stiefelchen (lila) mit hellem Rand und Sohle
  b.sphere(1, { v: (x, y, z, nx, ny) => mix(KK.boot, KK.bootHi, smoothstep(ny * 0.6 + 0.3)) }, { p: [0.04, -0.29, 0], s: [0.1, 0.06, 0.07] }, 18, 10);
  b.cyl(0.05, 0.055, 0.05, KK.boot, { p: [0.0, -0.25, 0] }, 14);
  b.torus(0.052, 0.012, KK.sole, { p: [0.0, -0.225, 0], r: [Math.PI / 2, 0, 0] }, 6, 16);
  b.cyl(0.075, 0.08, 0.02, KK.sole, { p: [0.04, -0.34, 0], s: [1.3, 1, 0.95] }, 18);
  return b.geometry();
});
const KK_EYES = [1, -1].map((s) => { const h = ellSurf(SKULL_C, SKULL_R)(s * 0.36, 0.1); return { p: h.p.clone().addScaledVector(h.n, -0.012).toArray(), r: 0.08, sy: 1.18, dir: h.n.clone().lerp(new THREE.Vector3(1, 0, 0), 0.35).toArray() }; });
// Teile und ihre Lage im Knochenhaufen ([p], [Euler])
const KK_PARTS = ['skull', 'torso', 'pelvis', 'armL', 'armR', 'legL', 'legR'];
const PILE = {
  skull: [[0.02, 0.37, 0.0], [0.1, 0, 0.25]], torso: [[-0.18, 0.14, 0.04], [0.2, 0.4, 1.45]], pelvis: [[0.16, 0.08, -0.12], [0.4, 0.3, 0.2]],
  armL: [[0.12, 0.09, 0.2], [0.2, -0.6, 1.57]], armR: [[-0.1, 0.06, -0.22], [-0.3, 2.2, 1.57]], legL: [[0.18, 0.05, -0.02], [0.1, 1.1, 1.57]], legR: [[-0.06, 0.16, 0.12], [0.5, -0.4, 1.45]],
};
function buildKlapperknochen() {
  const root = new THREE.Group();
  const own = [];
  const mat = vcol(0.3);
  const skull = joint();
  const skullM = mesh(kkSkullGeo(), mat, {}, true);
  const jaw = joint([-0.04, -0.16, 0], mesh(kkJawGeo(), mat, {}, true));
  const eye = eyes(KK_EYES, { key: 'hw:kk', iris: 0x2a8aff, pupil: 0.6, depth: 0.5 });
  skull.add(skullM, jaw, eye);
  const torso = joint(); torso.add(mesh(kkTorsoGeo(), mat, {}, true));
  const pelvis = joint(); pelvis.add(mesh(kkPelvisGeo(), mat, {}, true));
  const armL = joint(), armR = joint(), legL = joint(), legR = joint();
  armL.add(mesh(kkArmGeo(), mat, {}, true)); armR.add(mesh(kkArmGeo(), mat, {}, true));
  legL.add(mesh(kkLegGeo(), mat, {}, true)); legR.add(mesh(kkLegGeo(), mat, {}, true));
  const parts = { skull, torso, pelvis, armL, armR, legL, legR };
  const puffs = new Puffs(8, 0xe8dcf8, { opacity: 0.85, radius: 2, cy: 0.3 });
  own.push(puffs);
  const dizzy = dizzyStars(0.24, 0.06);
  root.add(skull, torso, pelvis, armL, armR, legL, legR, puffs.mesh, dizzy);
  const clk = new Clock(), blink = new Blinker();
  const stand = {}, pile = {}, qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), pa = new THREE.Vector3();
  for (const k of KK_PARTS) { stand[k] = { p: new THREE.Vector3(), q: new THREE.Quaternion() }; pile[k] = { p: new THREE.Vector3(...PILE[k][0]), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(...PILE[k][1])) }; }
  let dustT = 0, k0 = 0;
  /** stehende Haltung (Gehzyklus) in stand[] schreiben */
  const standPose = (t, walk, speed) => {
    const f = walk ? 2.2 + speed * 1.2 : 0, ph = t * f * Math.PI;
    const sw = walk ? Math.sin(ph) * 0.55 : Math.sin(t * 1.4) * 0.05;
    const bob = walk ? Math.abs(Math.cos(ph)) * 0.035 : Math.sin(t * 2.2) * 0.008;
    const set = (k, x, y, z, rx, ry, rz) => { stand[k].p.set(x, y, z); stand[k].q.setFromEuler(_e.set(rx, ry, rz)); };
    set('legL', 0, 0.34 + bob * 0.3, 0.085, 0, 0, sw);
    set('legR', 0, 0.34 + bob * 0.3, -0.085, 0, 0, -sw);
    set('pelvis', 0, 0.37 + bob, 0, 0, 0, 0);
    set('torso', 0, 0.38 + bob, 0, (walk ? Math.sin(ph) * 0.06 : 0), 0, walk ? -0.08 : 0);
    set('armL', -0.05, 0.69 + bob, 0.17, -0.25, 0, -sw * 0.9);
    set('armR', -0.05, 0.69 + bob, -0.17, 0.25, 0, sw * 0.9);
    set('skull', 0.0, KK_SKULL_Y + bob * 1.3, 0, walk ? Math.sin(ph) * 0.1 : Math.sin(t * 0.9) * 0.05, walk ? 0 : Math.sin(t * 0.6) * 0.2, walk ? -0.06 : 0);
  };
  const update = (dt, st) => {
    let anim = st.anim ?? 'walk';
    if (!['walk', 'idle', 'collapse', 'pile', 'rebuild', 'defeated'].includes(anim)) anim = 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    standPose(t, anim === 'walk', st.speed ?? 1.2);
    // k: 0 = stehend, 1 = Haufen
    let k = 0, arc = 0, shrink = 1;
    if (anim === 'collapse') { const p = prog(st, clk, 0.5); k = p * p; }
    else if (anim === 'pile') k = 1;
    else if (anim === 'rebuild') { const p = prog(st, clk, 0.8); const q = smoothstep(clamp((p - 0.15) / 0.85, 0, 1)); k = 1 - q; arc = Math.sin(q * Math.PI) * 0.35; if (p < 0.15) arc = Math.abs(Math.sin(p * 80)) * 0.03; }
    else if (anim === 'defeated') { const p = prog(st, clk, 0.9); k = clamp(p * 2.2, 0, 1); shrink = 1 - smoothstep((p - 0.5) / 0.45); }
    if (anim === 'collapse' && clk.entered) puffs.burst([0, 0.15, 0], { count: 6, speed: 1.2, up: 0.6, size: 0.18, life: 0.7, spread: 0.3 });
    if ((anim === 'collapse' || anim === 'defeated') && k >= 0.95 && k0 < 0.95) puffs.burst([0, 0.1, 0], { count: 6, speed: 1.4, up: 0.5, size: 0.16, life: 0.6, spread: 0.3 });
    k0 = k;
    KK_PARTS.forEach((name, i) => {
      const j = parts[name], S = stand[name], Pp = pile[name];
      const kk = clamp(k * 1.25 - (name === 'skull' ? 0.25 : i * 0.035), 0, 1);
      pa.copy(S.p).lerp(Pp.p, kk);
      if (k > 0 && k < 1) pa.y += arc * (0.6 + 0.12 * i) + (anim === 'collapse' ? Math.sin(kk * Math.PI) * 0.08 : 0);
      if (name === 'skull' && k === 1) pa.y += Math.abs(Math.sin(t * 2.4)) * 0.02;
      qa.copy(S.q).slerp(Pp.q, kk);
      if (name === 'skull' && k === 1) qa.multiply(qb.setFromEuler(_e.set(0, Math.sin(t * 1.6) * 0.6, 0)));
      j.position.copy(pa); j.quaternion.copy(qa);
      j.scale.setScalar(Math.max(0.001, shrink));
    });
    // Kiefer klappert
    const chatter = anim === 'walk' ? Math.abs(Math.sin(t * 13)) * 0.22 : anim === 'pile' ? Math.abs(Math.sin(t * 7)) * 0.12 : anim === 'collapse' ? 0.4 : 0.05;
    jaw.rotation.z = -chatter;
    puffs.step(dt);
    dustT -= dt;
    if (anim === 'walk' && dustT <= 0) { dustT = 0.35; puffs.burst([-0.12, 0.02, 0], { count: 1, speed: 0.25, up: 0.25, size: 0.045, life: 0.45, spread: 0.08 }); }
    let bk = blink.update(dt);
    if (anim === 'defeated') bk = 0.1; else if (k > 0.2 && k < 1) bk = 0.12;
    eye.userData.blink(bk);
    eye.visible = shrink > 0.05;
    dizzy.visible = anim === 'pile' || (anim === 'rebuild' && k > 0.9);
    if (dizzy.visible) { dizzy.position.set(skull.position.x, skull.position.y + 0.32, skull.position.z); dizzy.rotation.y = t * 4; }
    root.userData.headY = skull.position.y;
  };
  return makeModel('klapperknochen', root, update, own, { initial: 'walk' });
}

// =============================================================================================
// Flatterfledi
// =============================================================================================
const FF = { fur: 0x7a48d0, furHi: 0xb48aff, furLow: 0x4a2690, belly: 0xd8c0ff, ear: 0xff9ac8, nose: 0xff7aa8, fang: 0xffffff, claw: 0x3a1a5a, mouth: 0x3a1040 };
const FF_CY = 0.3, FF_R = 0.17;
function ffBodyGeo() {
  return cached('hw:ff:body', () => {
    const b = new Build();
    const R = [FF_R, FF_R * 0.97, FF_R];
    b.sphere(1, { v: (x, y, z, nx, ny) => {
      const belly = smoothstep((nx - 0.35) / 0.3) * smoothstep((-ny + 0.4) / 0.4);
      return mix(mix(FF.furLow, FF.fur, smoothstep(ny * 0.6 + 0.55)), FF.belly, belly * 0.85);
    } }, { s: R }, 36, 24);
    // Haarbüschel oben
    for (let i = 0; i < 3; i++) b.cone(0.03, 0.08, FF.furHi, { p: [-0.02 + i * 0.02, FF_R * 0.95, (i - 1) * 0.03], r: [(i - 1) * 0.4, 0, -0.4] }, 8);
    const surf = ellSurf([0, 0, 0], R);
    // große Ohren: abgerundete Kegel, innen rosa
    for (const s of [1, -1]) {
      const base = surf(s * 1.1, 0.95);
      const g = new THREE.LatheGeometry([[0, 0], [0.075, 0.0], [0.08, 0.06], [0.06, 0.13], [0.03, 0.19], [0, 0.21]].map(([r, y]) => new THREE.Vector2(r, y)), 18);
      const m = new THREE.Matrix4().compose(base.p.clone().addScaledVector(base.n, -0.02), new THREE.Quaternion().setFromEuler(new THREE.Euler(s * 0.45, 0, -0.1)), new THREE.Vector3(1, 1, 0.55));
      b.add(g, { v: (x, y, z, nx) => (nx > 0.35 ? FF.ear : mix(FF.furLow, FF.fur, smoothstep(y / 0.2))) }, m);
    }
    // Stupsnase, Lächeln mit zwei Zähnchen, Wangen
    stick(b, surf(0, -0.08), FF.nose, [0.04, 0.03, 0.035], 0.35);
    const mh = surf(0, -0.28);
    b.torus(0.04, 0.009, FF.mouth, placed(mh.p.clone().addScaledVector(mh.n, -0.004), mh.n, new THREE.Vector3(1, 0.8, 1)).multiply(new THREE.Matrix4().makeRotationZ(Math.PI * 1.1)), 6, 14, Math.PI * 0.8);
    for (const s of [1, -1]) {
      const fh = surf(s * 0.13, -0.33);
      b.cone(0.012, 0.03, FF.fang, { p: fh.p.clone().addScaledVector(fh.n, 0.002).add(new THREE.Vector3(0, -0.012, 0)).toArray(), r: [Math.PI, 0, 0] }, 6);
      stick(b, surf(s * 0.6, -0.15), HW.cheek, [0.035, 0.022, 0.015], 0.3);
    }
    // Füßchen mit Krallen (unten)
    for (const s of [1, -1]) {
      b.capsule(0.018, 0.08, FF.furLow, { p: [-0.02, -FF_R - 0.03, s * 0.05] }, 2, 8);
      for (let i = -1; i <= 1; i++) b.cone(0.01, 0.035, FF.claw, { p: [-0.02 + i * 0.012, -FF_R - 0.095, s * 0.05 + i * 0.008], r: [Math.PI, 0, 0] }, 5);
    }
    return b.geometry();
  });
}
const FF_EYES = [1, -1].map((s) => { const h = ellSurf([0, 0, 0], [FF_R, FF_R * 0.97, FF_R])(s * 0.36, 0.14); return { p: h.p.toArray(), r: 0.07, sy: 1.25, dir: h.n.clone().lerp(new THREE.Vector3(1, 0, 0), 0.3).toArray() }; });
function buildFlatterfledi() {
  const root = new THREE.Group();
  const pose = joint([0, FF_CY, 0]);     // Körpermitte
  const body = joint();
  const bodyM = mesh(ffBodyGeo(), vcol(0.42), {}, true);
  const eye = eyes(FF_EYES, { key: 'hw:ff', iris: 0xff8a1a, pupil: 0.62, depth: 0.5 });
  const wingGeo = batWingGeo(0.44, FF.fur, FF.furLow);
  const wingMat = vcol(0.45, { side: THREE.DoubleSide }, 'hwwing');
  // rechter Flügel (−Z): Spannweite entlang −Z; linker gespiegelt
  const wR = joint([-0.02, 0.03, -0.12], mesh(wingGeo, wingMat, { r: [0, Math.PI / 2, 0] }, true));
  const wL = joint([-0.02, 0.03, 0.12], mesh(wingGeo, wingMat, { r: [0, Math.PI / 2, 0] }, true));
  wR.rotation.order = wL.rotation.order = 'YXZ';
  wL.scale.z = -1;
  body.add(bodyM, eye, wR, wL);
  pose.add(body);
  const sparkle = sparkleSprite(0xfff0ff, 0.5); sparkle.visible = false; sparkle.position.y = FF_CY;
  root.add(pose, sparkle);
  const clk = new Clock(), blink = new Blinker();
  let hang = 0, dive = 0;
  const update = (dt, st) => {
    let anim = st.anim ?? 'fly';
    if (!['fly', 'dive', 'hang', 'idle', 'defeated'].includes(anim)) anim = 'fly';
    clk.tick(dt, anim);
    const t = clk.t;
    hang = damp(hang, anim === 'hang' ? 1 : 0, 10, dt);
    dive = damp(dive, anim === 'dive' ? 1 : 0, 10, dt);
    const ph = st.flap !== undefined ? clamp(Number(st.flap) || 0, 0, 1) * TAU : t * (anim === 'dive' ? 4 : 9 + (st.speed ?? 0) * 0.6);
    const flap = Math.sin(ph);
    // Flügel: Schlag um die Vorwärtsachse (X), beim Sturzflug nach hinten angelegt, beim Hängen eingewickelt
    const up = flap * 0.75 * (1 - dive) * (1 - hang);
    const wrap = hang * 1.35, back = dive * 1.1;
    wR.rotation.set(up + dive * 0.35 - hang * 0.2, back - wrap, 0);
    wL.rotation.set(-(up + dive * 0.35 - hang * 0.2), -back + wrap, 0);
    // Körper: wippt im Flügeltakt; Sturzflug Nase nach unten; Hängen kopfüber unter dem Ursprung
    const bob = (1 - hang) * (-flap * 0.04 + Math.sin(t * 2.1) * 0.02);
    pose.position.y = FF_CY * (1 - hang) - hang * (FF_R + 0.13) + bob * (1 - dive);
    pose.rotation.z = -dive * 0.9 + hang * Math.PI + Math.sin(t * 1.3) * 0.05 * hang;
    body.rotation.x = Math.sin(t * 1.7) * 0.06 * (1 - dive);
    let bk = blink.update(dt);
    if (anim === 'hang') bk = 0.45 + Math.sin(t * 0.8) * 0.15;
    if (anim === 'dive') bk = 1;
    eye.userData.blink(bk);
    eye.scale.setScalar(anim === 'dive' ? 1.12 : 1);
    const dead = anim === 'defeated';
    const dk = dead ? clamp(clk.age / 0.6, 0, 1) : 0;
    pose.scale.setScalar(Math.max(0.001, 1 - smoothstep(dk)));
    if (dead) pose.rotation.y += dt * 16; else pose.rotation.y = 0;
    sparkle.visible = dead && dk < 1;
    if (sparkle.visible) sparkle.scale.setScalar(0.3 + dk * 1.5);
  };
  return makeModel('flatterfledi', root, update, [], { initial: 'fly' });
}

// =============================================================================================
// Hexenhut-Hüpfer
// =============================================================================================
const HH = { legA: 0xffffff, legB: 0x8a4ae0, shoe: 0x5a2aa8, shoeHi: 0x9a6aff, shade: 0x1c0e30 };
const HH_LEG = 0.25;   // Beinlänge: Krempe sitzt bei y = HH_LEG
function hhHatGeo() {
  return cached('hw:hh:hat', () => {
    const b = new Build();
    b.parts.push(witchHatGeo(0.74, 0.44).clone());
    // aufgenähter gelber Stern auf dem Kegel
    const st = new THREE.Shape();
    for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.45 : 1; if (i) st.lineTo(Math.cos(a) * r, Math.sin(a) * r); else st.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    b.add(puffyGeo(st, 0.2, 0.12, 1, 2), 0xffd84a, { p: [0.19, 0.3, -0.07], r: [0, Math.PI / 2 - 0.35, 0.15], s: 0.055 });
    return b.geometry();
  });
}
const hhShadeGeo = () => cached('hw:hh:shade', () => {
  const b = new Build();
  // dunkler, runder Körper im Hut (nur unten zu sehen) – die Augen leuchten daraus hervor
  b.sphere(1, { v: (x, y, z, nx) => mix(0x0e0618, HH.shade, smoothstep(nx * 0.5 + 0.5)) }, { p: [0, 0.02, 0], s: [0.23, 0.15, 0.23] }, 26, 16);
  return b.geometry();
});
const hhLegGeo = () => cached('hw:hh:leg', () => {
  const b = new Build();
  // Ringelstrumpf und Schnabelschuh mit eingerollter Spitze; Ursprung = Hüfte (oben)
  b.add(new THREE.CylinderGeometry(0.03, 0.026, HH_LEG - 0.05, 12, 10), (x, y) => (Math.floor((y + 1) * 26) % 2 ? HH.legA : HH.legB), { p: [0, -(HH_LEG - 0.05) / 2, 0] });
  b.sphere(1, { v: (x, y, z, nx, ny) => mix(HH.shoe, HH.shoeHi, smoothstep(ny * 0.6 + 0.3)) }, { p: [0.04, -HH_LEG + 0.03, 0], s: [0.085, 0.045, 0.055] }, 16, 10);
  b.tube([[0.1, -HH_LEG + 0.035, 0], [0.15, -HH_LEG + 0.05, 0], [0.165, -HH_LEG + 0.09, 0], [0.135, -HH_LEG + 0.1, 0]], 0.016, HH.shoe, null, 12, 6);
  b.sphere(0.022, 0xffd84a, { p: [0.135, -HH_LEG + 0.1, 0] }, 8, 6);
  return b.geometry();
});
const HH_EYES = [1, -1].map((s) => ({ p: [0.19, -0.03, s * 0.08], r: 0.08, sy: 1.15, dir: [1, -0.1, s * 0.35] }));
function buildHexenhut() {
  const root = new THREE.Group();
  const pose = joint();
  const squash = joint([0, HH_LEG, 0]);
  const hatJ = joint();
  hatJ.add(mesh(hhHatGeo(), vcol(0.38), {}, true));
  const shade = mesh(hhShadeGeo(), vcol(0.6), {});
  const eye = eyes(HH_EYES, { key: 'hw:hh', iris: 0xffc21a, pupil: 0.58, depth: 0.5 });
  squash.add(hatJ, shade, eye);
  pose.add(squash);
  const legs = instMesh(hhLegGeo(), vcol(0.4), 2, 1, 0.2);
  legs.castShadow = true;
  const dizzy = dizzyStars(0.28, 0.07);
  root.add(pose, legs, dizzy);
  const clk = new Clock(), blink = new Blinker();
  let sq = 0;
  const update = (dt, st) => {
    let anim = st.anim ?? 'idle';
    if (!['idle', 'hop', 'squashed'].includes(anim)) anim = 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    let y = 0, sy = 1, sx = 1, tuck = 0, tip = 0, lean = 0;
    if (anim === 'idle') { sy = 1 + Math.sin(t * 2.6) * 0.025; tip = Math.sin(t * 2.6 - 0.8) * 0.06; }
    else if (anim === 'hop') {
      const p = prog(st, clk, 0.7, true), H = st.height ?? 0.5;
      if (p < 0.18) { const k = Math.sin((p / 0.18) * Math.PI * 0.5); sy = 1 - 0.25 * k; sx = 1 + 0.12 * k; tip = 0.2 * k; }
      else if (p < 0.85) { const k = (p - 0.18) / 0.67; y = 4 * k * (1 - k) * H; sy = 1 + 0.12 * Math.max(0, 1 - k * 3); tuck = Math.sin(k * Math.PI); tip = -0.25 * Math.cos(k * Math.PI); lean = -0.1 * (1 - 2 * k); }
      else { const k = Math.sin(((p - 0.85) / 0.15) * Math.PI); sy = 1 - 0.2 * k; sx = 1 + 0.1 * k; tip = 0.15 * k; }
    }
    const flat = anim === 'squashed';
    sq = damp(sq, flat ? 1 : 0, flat ? 22 : 8, dt);
    pose.position.y = y;
    squash.position.y = HH_LEG * (1 - sq * 0.85);
    squash.scale.set(sx * (1 + sq * 0.25), sy * (1 - sq * 0.55), sx * (1 + sq * 0.25));
    squash.rotation.z = lean;
    hatJ.rotation.z = 0.2 + tip * 0.3 + sq * 0.12;
    hatJ.rotation.x = sq * 0.15 + Math.sin(t * 1.9) * 0.03;
    for (let i = 0; i < 2; i++) {
      const s = i ? -1 : 1;
      const step = anim === 'idle' ? Math.max(0, Math.sin(t * 2.6 + i * Math.PI)) * 0.02 : 0;
      if (flat) _m.compose(_v.set(0.05, 0.03, s * 0.14), _q.setFromEuler(_e.set(s * 1.2, 0, 0)), _s.set(1, 0.7, 1));
      else _m.compose(_v.set(0, y + HH_LEG * (1 - tuck * 0.25) + step, s * 0.085), _q.setFromEuler(_e.set(s * tuck * 0.3, 0, -tuck * 0.6)), _s.set(1, 1 - tuck * 0.2, 1));
      legs.setMatrixAt(i, _m);
    }
    legs.instanceMatrix.needsUpdate = true;
    let bk = blink.update(dt);
    if (flat) bk = 0.08; else if (anim === 'hop') bk = 1;
    eye.userData.blink(bk);
    dizzy.visible = flat;
    if (flat) { dizzy.position.y = 0.42; dizzy.rotation.y = t * 4; }
  };
  return makeModel('hexenhut_huepfer', root, update, [legs], { initial: 'idle' });
}

// =============================================================================================
// Halloween-Spuk und -Kreisgeist (Welt-3-Modelle erweitert)
// =============================================================================================
const _hsl = { h: 0, s: 0, l: 0 }, _c = new THREE.Color(), _c2 = new THREE.Color();
/** Vertexfarben einer Kopie umfärben: fn(color, x, y, z) → Color|null (null = bleibt). */
function recolor(g0, fn) {
  const g = g0.clone();
  const C = g.attributes.color, P = g.attributes.position;
  const arr = C.array.slice();
  for (let i = 0; i < C.count; i++) {
    _c.setRGB(arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2]);
    const r = fn(_c, P.getX(i), P.getY(i), P.getZ(i));
    if (r) { arr[i * 3] = r.r; arr[i * 3 + 1] = r.g; arr[i * 3 + 2] = r.b; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}
const hex = (h) => new THREE.Color(h);
/** Spuk-Lila → Halloween: hell = Pfirsich-Creme, mittel = Kürbis-Orange, dunkel (Schwanz) = Lila. */
function spukColor(c) {
  c.getHSL(_hsl, THREE.SRGBColorSpace);
  const hue = _hsl.h * 360;
  if (hue < 225 || hue > 300 || _hsl.l < 0.3) return null;
  const L = _hsl.l;
  if (L < 0.72) return _c2.copy(hex(HW.lilaLow)).lerp(hex(HW.lila), smoothstep((L - 0.55) / 0.17));
  return _c2.copy(hex(0xffa850)).lerp(hex(0xfffaf0), smoothstep((L - 0.75) / 0.15));
}
const SPUK_HATS = {
  kuerbis: () => cached('hw:spuk:hat:k', () => {
    const P = { R: 0.17, Hh: 0.13, ribs: 8, depth: 0.12, dimple: 0.22, bottom: 0.85 };
    const b = new Build();
    b.parts.push(pumpkinGeo(P, PK_COLORS.orange, true));
    const top = pkPoint(P, 0, 1.3).p.y;
    b.parts.push(stemGeo(0.07, 0.025, true, 0.7).clone().translate(0, top - 0.01, 0));
    b.parts.push(leafGeo(0.14, true, 0.3).clone().rotateZ(-0.3).rotateY(2.3).translate(0, top + 0.02, 0));
    return b.geometry();
  }),
  hexe: () => witchHatGeo(0.36, 0.22, true),
};
function buildSpukHalloween(opts = {}) {
  const m = W3.spuk(opts);
  const root = m.root;
  root.name = 'modell:spuk_halloween'; root.userData.modelName = 'spuk_halloween';
  // größte vertexgefärbte Geometrie = Körper; Arme und Flammenlocke teilen das Spuk-Material
  let bodyM = null;
  root.traverse((o) => { if (o.isMesh && o.geometry.attributes.color && (!bodyM || o.geometry.attributes.position.count > bodyM.geometry.attributes.position.count)) bodyM = o; });
  const mat = bodyM.material;
  root.traverse((o) => {
    if (!o.isMesh || o.material !== mat || !o.geometry.attributes.color) return;
    o.geometry = memo(`hw:spuk:${o.geometry.uuid}`, () => recolor(o.geometry, spukColor));
  });
  const hatKind = opts.hat ?? 'kuerbis';
  if (SPUK_HATS[hatKind]) {
    const hat = mesh(SPUK_HATS[hatKind](), vcol(0.35), hatKind === 'hexe' ? { p: [0.02, 0.86, 0], r: [0.12, 0, 0.22] } : { p: [0.05, 0.9, 0], r: [0.1, 0, 0.18] }, true);
    bodyM.parent.add(hat);
  }
  const upd = m.update;
  const update = (dt, st) => {
    upd(dt, st);
    // Glühen warm statt lila: Aufblitzen (Treffer) aus dem gesetzten Wert zurückrechnen
    const f = clamp((mat.emissive.r - 0.16) / 0.6, 0, 1);
    mat.emissive.setRGB(0.14 + f * 0.6, 0.07 + f * 0.62, 0.03 + f * 0.6);
  };
  update(0, { anim: 'idle' });
  return { ...m, root, update };
}
/** Kreisgeist-Farben: Laken creme-pfirsich, Zipfelmütze lila mit orangen Ringeln, Bommel kürbisorange. */
function kgColor(c, x, y) {
  c.getHSL(_hsl, THREE.SRGBColorSpace);
  const hue = _hsl.h * 360, L = _hsl.l, S = _hsl.s;
  const cap = y > 0.66 && x < 0.08;
  if (cap) {
    if (hue > 40 && hue < 70 && S > 0.5) return _c2.copy(hex(0xff8a1a));          // Bommel
    if (L > 0.9) return _c2.copy(hex(0xff9a2a));                                    // weiße Ringel → orange
    if (hue > 150 && hue < 190) return _c2.copy(hex(HW.lila)).lerp(hex(HW.lilaLow), L < 0.45 ? 0.4 : 0); // Mütze
  }
  if (hue > 140 && hue < 190 && L > 0.6) return _c2.copy(hex(0xffc890)).lerp(hex(0xfff6ea), smoothstep((L - 0.72) / 0.22)); // Laken
  if (hue > 140 && hue < 190 && L > 0.4) return _c2.copy(hex(0xe8a070));            // Saum-Schatten
  return null;
}
function buildKreisgeistHalloween() {
  const m = W3.kreisgeist();
  const root = m.root;
  root.name = 'modell:kreisgeist_halloween'; root.userData.modelName = 'kreisgeist_halloween';
  let bodyM = null;
  root.traverse((o) => { if (o.isMesh && o.geometry.attributes.color && (!bodyM || o.geometry.attributes.position.count > bodyM.geometry.attributes.position.count)) bodyM = o; });
  bodyM.geometry = memo(`hw:kg:${bodyM.geometry.uuid}`, () => recolor(bodyM.geometry, kgColor));
  bodyM.material = vcol(0.4, { emissive: 0x2a1406 }, 'hwghost');
  return { ...m, root };
}
function buildKreisgeistKreisHalloween(opts = {}) {
  const m = W3.kreisgeist_kreis(opts);
  const root = m.root;
  root.name = 'modell:kreisgeist_kreis_halloween'; root.userData.modelName = 'kreisgeist_kreis_halloween';
  const bodies = root.children.find((o) => o.isInstancedMesh);
  bodies.geometry = memo(`hw:kg:${bodies.geometry.uuid}`, () => recolor(bodies.geometry, kgColor));
  bodies.material = vcol(0.4, { emissive: 0x2a1406 }, 'hwghost');
  return { ...m, root };
}

export const MODELS = {
  kuerbling: buildKuerbling,
  klapperknochen: buildKlapperknochen,
  flatterfledi: buildFlatterfledi,
  hexenhut_huepfer: buildHexenhut,
  spuk_halloween: buildSpukHalloween,
  kreisgeist_halloween: buildKreisgeistHalloween,
  kreisgeist_kreis_halloween: buildKreisgeistKreisHalloween,
};
