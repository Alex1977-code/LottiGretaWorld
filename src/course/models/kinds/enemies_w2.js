// Gegner-Modelle Welt 2 (Kurs-Modus), Teil 1. Eigene Gestaltung, keine Nachbauten fremder Figuren.
// Maßstab Meter, Ursprung = Fußpunkt, Blick nach +X. Alle Modelle: { root, update(dt, state), dispose() };
// state darf ein String sein ('walk' ≙ { anim: 'walk' }); unbekannte anim → wie 'idle'.
// progress (0..1) überschreibt bei Einmal-Animationen die Zeit seit dem Zustandswechsel.
//
// hackvogel         ≈1,75 m  Wüstenspecht: kobaltblaues Gefieder, cremefarbene Brust, weiße Gesichtsmaske, roter
//   Federschopf mit orangen Spitzen, langer goldgelber Meißelschnabel (Spitze in Ruhe ≈ 1,0 m vor, 1,45 m hoch),
//   dünne orange Beine.
//   state { anim: 'idle'|'walk'|'wind'|'peck'|'stuck'|'squashed', speed (walk), progress? }
//         wind: lehnt sich in 0,35 s zurück (Ausholen) und zittert; peck: hackt in 0,1 s nach vorn-unten, die
//         Schnabelspitze trifft genau den Boden (y = 0, ≈ 1,1 m vor dem Fußpunkt) und bleibt dort, solange peck;
//         stuck: Schnabel steckt 0,12 m im Boden, Vogel zerrt und zappelt; squashed: platt.
//   model.beakTip(out?: Vector3) → Weltposition der Schnabelspitze (Trefferpunkt, z. B. für Block-Zerhacken).
// rollpilz          ≈0,8 m  runde Pilzkugel: türkise Zipfelkappe mit Cremepunkten, helles Gesicht mit Kulleraugen,
//   Zahnlücken-Lächeln, rosa Bäckchen, braune Stummelfüße.
//   state { anim: 'walk'|'idle'|'flipped'|'carried'|'thrown'|'squashed', speed }
//         flipped: liegt auf dem Rücken (Gesicht nach oben), strampelt, schaukelt, Schwindel-Sterne;
//         carried: Rückenlage ohne Schaukeln, strampelt schnell (Fußpunkt = Unterkante wie gewohnt);
//         thrown: Kugel dreht sich vorwärts (um −Z, rollt Richtung +X), Füße eingezogen; squashed: platt.
// grossrollpilz     ≈2,1 m  derselbe Pilz ×2,6 mit dunklerer Kappe, goldenen Punkten und finsteren Brauen.
//   state wie rollpilz.
// wuschel           Ø ≈0,85 m violetter Stachel-Wuschelball (Spitzen pink), große Augen, Grinsen. Mitte y = 0,45.
//   opts  { size (Faktor, Standard 1) }   state { anim: 'idle'|'move', speed (m/s, Wirbeln) }
//   (unverwundbar: kein squashed). Viele gleiche → createInstanced('wuschel', n) (lib/instanced.js).
// huepfmaus         ≈0,7 m  apricotfarbene Maus mit Riesenohren (innen rosa), Schnurrhaaren, Schwanz mit Herzspitze.
// huepfmaus_stachel ≈0,75 m violette Maus mit Stahlhelm voller weißgoldener Stacheln und finsteren Brauen.
//   state { anim: 'idle'|'walk'|'hop'|'land'|'squashed'|'stunned', speed, progress? }
//         hop: Sprungpose (gestreckt, Ohren nach hinten, Füße angezogen; der Motor bewegt root, progress 0..1
//         = Flugphase → Pose von Absprung bis Landung); land: Aufsetzen 0,18 s (Stauchung).
// marschblock       ≈1,35 m (mit Federbusch)  Spielklotz mit Gesicht (singt), Tschako mit Federbusch, Beinchen mit
//   weißen Socken und Stiefeln; Seiten mit Spielklotz-Symbolen (Stern, Herz, Kreis); Musiknote schwebt darüber.
//   opts  { color: 'red'|'blue'|'yellow'|'green'|'orange'|'purple'|Hex (Standard 'red'), note: true }
//   state { anim: 'march'|'idle'|'panic'|'squashed', speed (m/s), beat? (0..1 Taktphase, für Gleichschritt) }
//   Kolonnen → createInstanced('marschblock', n, { colors }) (lib/instanced.js).
// pilzling_mini     ≈0,4 m  Pilzling in halber Größe (gleiches Modell ×0,5).  state wie pilzling.
// muenzmarder       ≈0,95 m lang  flinker Schoko-Marder mit schwarzer Räubermaske, Ringelschwanz und prallem
//   Münzsack (₿-Flicken) auf dem Rücken.
//   state { anim: 'idle'|'run'|'hit'|'defeated', speed (m/s; run Standard 7) }
//         hit: springt erschrocken hoch, Münzen spritzen aus dem Sack (0,7 s); defeated: kippt um, Sack leer.
// lauerblock        1 m  violetter Steinblock mit Bernsteinaugen, dicken Brauen und Goldnieten, der aus einer
//   Wandöffnung nach +X herausfährt. Ruhelage: Vorderseite bündig mit der Wand bei x = 0 (Block in x −1..0),
//   Rahmen der Öffnung bleibt stehen. Unterkante y = 0.
//   opts  { reach (m, Ausfahrweg, Standard 1), size (1) }
//   state { anim: 'wait'|'peek'|'push'|'back', out? (0..1 Ausfahrweg; ohne out: push fährt in 0,15 s aus,
//           back in 0,5 s ein, peek schiebt sich 0,1 m vor) }
//   root.userData.out → aktueller Ausfahrweg in m (für die Kollision).

import {
  THREE, TAU, Build, cached, vcol, std, basic, mesh, joint, eyes, dizzyStars, alertMark, makeModel, Clock, Blinker,
  damp, clamp, col, mix, onEllipsoid, decals, smoothstep, lerp, instMesh, setInst, puffyStarGeo, heartShape, dirAE,
  roundedBox, SIDE, glowSprite,
} from '../lib/kit.js';
import { MB, mbColor, mbShellGeo, mbDetailGeo, mbEyes, mbLegGeo, mbNoteGeo, mbNoteMat, WU, wuschelGeo, wuschelHlGeo } from '../lib/w2Geos.js';
import { MODELS as W1 } from './enemies_w1.js';

const tmpV = new THREE.Vector3();

// =============================================================================================
// Hackvogel
// =============================================================================================
const HV = {
  plume: 0x2f6fd8, plumeDark: 0x1f4aa0, belly: 0xfff0d0, mask: 0xffffff, crest: 0xff3a3a, crestTip: 0xffb02a,
  beak: 0xffc21a, beakTip: 0xd8800e, leg: 0xff8a2a, ink: 0x14102a, brow: 0x162a6a,
};
const HV_HIP = 0.8;                    // Drehpunkt (Hüfte) über dem Boden
const HV_HEAD = [0.18, 0.72];          // Kopfgelenk relativ zur Hüfte
const HV_TIP = [0.84, -0.05];          // Schnabelspitze relativ zum Kopfgelenk

function hvBodyGeo() {
  return cached('w2:hv:body', () => {
    const b = new Build();
    const plum = { v: (x, y, z, nx, ny) => (nx > 0.4 && ny < 0.55 ? col(HV.belly) : mix(HV.plumeDark, HV.plume, smoothstep((ny + 0.7) / 1.2))) };
    b.sphere(1, plum, { p: [-0.04, 0.22, 0], s: [0.36, 0.4, 0.31], r: [0, 0, -0.25] }, 24, 16);
    b.capsule(0.12, 0.22, HV.plume, { p: [0.12, 0.55, 0], r: [0, 0, -0.3] }, 4, 12);
    for (const s of [1, -1]) {
      b.sphere(1, { v: (x, y) => mix(HV.plumeDark, HV.plume, smoothstep(y + 0.6)) }, { p: [-0.1, 0.24, s * 0.29], s: [0.3, 0.17, 0.06], r: [s * 0.15, 0, 0.35] }, 16, 10);
    }
    // Schwanzfedern
    for (const [a, z] of [[0.5, 0], [0.75, 0.08], [0.75, -0.08]]) {
      b.sphere(1, { v: (x) => mix(HV.plume, HV.plumeDark, smoothstep(-x * 2)) }, { p: [-0.42, 0.05, z], s: [0.22, 0.045, 0.07], r: [0, z * 2, a] }, 12, 6);
    }
    // Federhosen
    for (const s of [1, -1]) b.sphere(1, HV.plume, { p: [0.02, -0.02, s * 0.14], s: [0.11, 0.14, 0.1] }, 12, 8);
    return b.geometry();
  });
}
function hvHeadGeo() {
  return cached('w2:hv:head', () => {
    const b = new Build();
    b.sphere(0.24, HV.plume, { p: [0.0, 0.06, 0] }, 22, 16);
    b.sphere(1, HV.mask, { p: [0.12, 0.06, 0], s: [0.14, 0.17, 0.205] }, 18, 12);
    // Federschopf (drei Federn nach hinten oben)
    for (const [z, a, l] of [[0, 0.55, 0.26], [0.07, 0.8, 0.2], [-0.07, 0.8, 0.2]]) {
      const g = new THREE.SphereGeometry(1, 12, 8);
      g.scale(0.06, l, 0.045); g.translate(0, l * 0.9, 0);
      b.add(g, { v: (x, y) => mix(HV.crest, HV.crestTip, smoothstep((y - l * 0.9) / l)) }, { p: [-0.04, 0.22, z], r: [z * 3, 0, a] });
    }
    // Meißelschnabel
    const beak = new THREE.ConeGeometry(0.085, 0.66, 14);
    beak.rotateZ(-Math.PI / 2); beak.scale(1, 0.85, 1);
    b.add(beak, { v: (x) => mix(HV.beak, HV.beakTip, smoothstep((x - 0.05) / 0.3)) }, { p: [0.51, -0.02, 0], r: [0, 0, -0.06] });
    b.box(0.5, 0.012, 0.1, 0xb06a0a, { p: [0.42, -0.035, 0], r: [0, 0, -0.06] }, 0, 1);
    for (const s of [1, -1]) b.sphere(0.012, 0x6a3a0a, { p: [0.3, 0.02, s * 0.04] }, 6, 4);
    // schwere Brauen
    for (const s of [1, -1]) b.capsule(0.035, 0.11, HV.brow, { p: [0.19, 0.2, s * 0.1], r: [Math.PI / 2 - s * 0.35, -s * 0.5, 0], order: 'YXZ' }, 3, 6);
    return b.geometry();
  });
}
function hvLegGeo() {
  return cached('w2:hv:leg', () => {
    const b = new Build();
    b.cyl(0.04, 0.035, 0.6, HV.leg, { p: [0, -0.46, 0] }, 8);
    b.sphere(0.05, HV.leg, { p: [0, -0.17, 0] }, 8, 6);
    for (const [a, l] of [[0, 0.17], [0.45, 0.14], [-0.45, 0.14], [Math.PI, 0.09]]) {
      b.capsule(0.03, l, HV.leg, { p: [Math.cos(a) * l * 0.55, -0.775, Math.sin(a) * l * 0.55], r: [0, -a, Math.PI / 2], order: 'YXZ' }, 2, 6);
    }
    return b.geometry();
  });
}

function buildHackvogel() {
  const root = new THREE.Group();
  const pose = joint();                          // Stauchen (Fußpunkt)
  const body = joint([0, HV_HIP, 0]);            // Drehpunkt Hüfte
  const flash = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, emissive: 0x000000 });
  const torso = mesh(hvBodyGeo(), flash, {}, true);
  const head = joint(HV_HEAD.concat(0));
  const headM = mesh(hvHeadGeo(), flash, {}, true);
  const eye = eyes([{ p: [0.2, 0.11, 0.1], r: 0.075, sy: 1.15, dir: [1, 0.08, 0.6] }, { p: [0.2, 0.11, -0.1], r: 0.075, sy: 1.15, dir: [1, 0.08, -0.6] }],
    { key: 'w2:hv', iris: 0x6a2a10, pupil: 0.55, depth: 0.5 });
  const tip = new THREE.Object3D(); tip.position.set(HV_TIP[0], HV_TIP[1], 0);
  head.add(headM, eye, tip);
  body.add(torso, head);
  const legs = [1, -1].map((s) => joint([0.0, HV_HIP - 0.02, s * 0.14], mesh(hvLegGeo(), vcol(0.45), {}, true)));
  const dizzy = dizzyStars(0.3, 0.08);
  head.add(dizzy); dizzy.position.set(0, 0.42, 0);
  pose.add(body, ...legs);
  root.add(pose);

  // Körperwinkel, bei dem die Schnabelspitze (bei Kopfneigung h) die Höhe y erreicht
  const reach = (h, y) => {
    const vx = HV_HEAD[0] + Math.cos(h) * HV_TIP[0] - Math.sin(h) * HV_TIP[1];
    const vy = HV_HEAD[1] + Math.sin(h) * HV_TIP[0] + Math.cos(h) * HV_TIP[1];
    const R = Math.hypot(vx, vy);
    return Math.asin(clamp((y - HV_HIP) / R, -1, 1)) - Math.atan2(vy, vx);
  };
  const PECK_H = -0.3, A_PECK = reach(PECK_H, 0.0), A_STUCK = reach(PECK_H, -0.12);
  const WIND_A = 0.4, WIND_H = 0.35;

  const clk = new Clock(), blink = new Blinker();
  let phase = Math.random() * TAU, sq = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    const walking = anim === 'walk';
    if (walking) phase += dt * (4 + (st.speed ?? 1.4) * 3);
    let a = -0.06 + Math.sin(t * 1.1) * 0.03, h = Math.sin(t * 0.7) * 0.1, hx = 0, fast = false;
    let legL = 0, legR = 0, lift = 0;
    if (walking) {
      a = -0.14 + Math.sin(phase * 2) * 0.04; h = -0.05; hx = Math.sin(phase * 2) * 0.05;
      legL = Math.sin(phase) * 0.4; legR = -legL; lift = Math.abs(Math.sin(phase)) * 0.03;
    } else if (anim === 'wind') {
      const k = st.progress ?? smoothstep(age / 0.35);
      a = lerp(-0.06, WIND_A, k) + Math.sin(t * 40) * 0.012 * k; h = lerp(0, WIND_H, k);
      legL = 0.15 * k; legR = -0.25 * k; fast = true;
    } else if (anim === 'peck') {
      const k = st.progress ?? smoothstep(age / 0.1);
      a = lerp(WIND_A, A_PECK, k); h = lerp(WIND_H, PECK_H, k); legL = -0.3; legR = -0.05; fast = true;
    } else if (anim === 'stuck') {
      const w = Math.sin(t * 13);
      a = A_STUCK + w * 0.035; h = PECK_H; legL = -0.3 + Math.sin(t * 9) * 0.2; legR = -0.05 - Math.sin(t * 9) * 0.2; fast = true;
    } else if (anim === 'squashed') { a = 0; h = 0; }
    const fwd = anim === 'peck' ? (st.progress ?? smoothstep(age / 0.1)) * 0.28 : anim === 'stuck' ? 0.28 : 0;
    body.position.x = anim === 'peck' || anim === 'stuck' ? fwd : damp(body.position.x, 0, 10, dt);
    body.rotation.z = fast ? a : damp(body.rotation.z, a, 10, dt);
    head.rotation.z = fast ? h : damp(head.rotation.z, h, 10, dt);
    head.position.x = HV_HEAD[0] + hx;
    body.rotation.x = anim === 'stuck' ? Math.sin(t * 11) * 0.06 : 0;
    legs[0].rotation.z = damp(legs[0].rotation.z, legL, 18, dt);
    legs[1].rotation.z = damp(legs[1].rotation.z, legR, 18, dt);
    // Beine: Fuß bleibt am Boden, wenn sich der Körper neigt (Hüfte sinkt leicht)
    pose.position.y = lift;
    sq = damp(sq, anim === 'squashed' ? 1 : 0, 25, dt);
    pose.scale.set(1 + sq * 0.35, Math.max(0.05, 1 - sq * 0.8), 1 + sq * 0.35);
    let bk = blink.update(dt);
    if (anim === 'squashed') bk = 0.1; else if (anim === 'stuck') bk = 1.15; else if (anim === 'wind') bk = 0.55; else bk *= 0.8;
    eye.userData.blink(bk);
    const big = anim === 'stuck' ? 1.15 : 1;
    eye.scale.x = eye.scale.z = damp(eye.scale.x, big, 12, dt);
    dizzy.visible = anim === 'squashed';
    dizzy.rotation.y = t * 4;
    flash.emissive.setRGB(0, 0, 0);
  };
  const model = makeModel('hackvogel', root, update, [flash], { initial: 'idle' });
  model.beakTip = (out = new THREE.Vector3()) => { root.updateMatrixWorld(true); return tip.getWorldPosition(out); };
  return model;
}

// =============================================================================================
// Rollpilz / Großrollpilz
// =============================================================================================
const RP = {
  cap: 0x1fb3a6, capDark: 0x12857a, spot: 0xfff6dc, face: 0xfff0d8, faceLow: 0xf0cfa4, foot: 0x6a3e26,
  ink: 0x2a1a14, cheek: 0xff9aa0, tooth: 0xffffff,
};
const RP_BIG = { ...RP, cap: 0x167f9a, capDark: 0x0e5a70, spot: 0xffd23a, foot: 0x4a2a1a };
const RP_R = 0.36, RP_C = 0.42;
const RP_TILT = 0.78;
const RP_AXIS = new THREE.Vector3(-Math.sin(RP_TILT), Math.cos(RP_TILT), 0);
const RP_THETA = Math.PI * 0.54;

function rpBodyGeo(P, key, angry) {
  return cached(`w2:rp:body:${key}`, () => {
    const b = new Build();
    b.sphere(RP_R, { v: (x, y) => mix(P.faceLow, P.face, smoothstep((y + 0.25) / 0.35)) }, { p: [0, RP_C, 0] }, 26, 18);
    // Zipfelkappe: Kuppel, deren Achse nach hinten oben zeigt, mit Wulst am Rand
    const cap = new THREE.SphereGeometry(RP_R * 1.06, 30, 14, 0, TAU, 0, RP_THETA);
    b.add(cap, { v: (x, y, z) => mix(P.capDark, P.cap, smoothstep((y / (RP_R * 1.06) + 0.3) / 0.9)) }, { p: [0, RP_C, 0], r: [0, 0, RP_TILT] });
    const rr = RP_R * 1.06 * Math.sin(RP_THETA), off = RP_R * 1.06 * Math.cos(RP_THETA);
    b.torus(rr, 0.035, P.cap, { p: [RP_AXIS.x * off, RP_C + RP_AXIS.y * off, 0], r: [Math.PI / 2, 0, RP_TILT], order: 'ZYX' }, 8, 32);
    // kleiner Zipfel oben hinten
    b.sphere(1, P.cap, { p: RP_AXIS.clone().multiplyScalar(RP_R * 1.02).add(new THREE.Vector3(0, RP_C, 0)).toArray(), s: [0.09, 0.12, 0.09], r: [0, 0, RP_TILT] }, 12, 8);
    // Punkte auf der Kappe
    const hits = [[Math.PI, 0.5, 0.075], [2.3, 0.2, 0.065], [-2.3, 0.2, 0.065], [1.5, 0.75, 0.06], [-1.5, 0.75, 0.06], [2.9, -0.1, 0.055], [-2.9, -0.1, 0.055], [0.9, 1.15, 0.055], [-0.9, 1.15, 0.055]]
      .map(([az, el, r]) => ({ ...onEllipsoid([0, RP_C, 0], [RP_R * 1.06, RP_R * 1.06, RP_R * 1.06], az, el), r }))
      .filter((h) => h.n.dot(RP_AXIS) > Math.cos(RP_THETA) + 0.18);
    decals(b, hits, 0.06, P.spot, 0.22);
    // Gesicht: Bäckchen, Lächeln mit Zahn (bzw. Brauen und zwei Zähne beim großen)
    for (const s of [1, -1]) decals(b, [{ ...onEllipsoid([0, RP_C, 0], [RP_R, RP_R, RP_R], s * 0.62, -0.18), r: 0.05 }], 0.05, P.cheek, 0.3);
    b.torus(0.075, 0.016, P.ink, { p: [RP_R - 0.012, RP_C - 0.14, 0], r: [0, Math.PI / 2, Math.PI], s: [1, angry ? 0.6 : 1, 1] }, 6, 14, Math.PI);
    if (angry) {
      for (const z of [0.035, -0.035]) b.box(0.02, 0.04, 0.032, P.tooth, { p: [RP_R - 0.005, RP_C - 0.155, z] }, 0.006, 1);
      for (const s of [1, -1]) b.capsule(0.022, 0.09, P.ink, { p: [RP_R - 0.05, RP_C + 0.15, s * 0.12], r: [Math.PI / 2 - s * 0.55, -s * 0.5, 0], order: 'YXZ' }, 3, 6);
    } else {
      b.box(0.02, 0.035, 0.03, P.tooth, { p: [RP_R - 0.008, RP_C - 0.13, 0.02] }, 0.006, 1);
    }
    return b.geometry();
  });
}
const rpFootGeo = (P, key) => cached(`w2:rp:foot:${key}`, () => new Build().sphere(1, P.foot, { s: [0.13, 0.07, 0.1] }, 12, 8).geometry());

function buildRollpilz(big) {
  const P = big ? RP_BIG : RP, key = big ? 'big' : 'n', scale = big ? 2.6 : 1;
  const name = big ? 'grossrollpilz' : 'rollpilz';
  return () => {
    const root = new THREE.Group();
    const all = joint(); all.scale.setScalar(scale);
    const pose = joint();                         // Stauchen
    const ball = joint([0, RP_C, 0]);             // Drehpunkt Kugelmitte (Umkippen, Rollen)
    const flash = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.36, emissive: 0x000000 });
    const bodyM = mesh(rpBodyGeo(P, key, big), flash, { p: [0, -RP_C, 0] }, true);
    const eye = eyes([{ p: [0.3, RP_C + 0.06, 0.12], r: 0.085, sy: 1.3, dir: [1, 0.12, 0.45] }, { p: [0.3, RP_C + 0.06, -0.12], r: 0.085, sy: 1.3, dir: [1, 0.12, -0.45] }],
      { key: `w2:rp:${key}`, iris: big ? 0x1a2a6a : 0x5a2a12, pupil: 0.58, depth: 0.5 });
    eye.position.y -= RP_C;
    const feet = [1, -1].map((s) => joint([0.04, 0.06 - RP_C, s * 0.15], mesh(rpFootGeo(P, key), vcol(0.45), {}, true)));
    ball.add(bodyM, eye, ...feet);
    const dizzy = dizzyStars(0.32, 0.075);
    pose.add(ball, dizzy);
    all.add(pose);
    root.add(all);
    const clk = new Clock(), blink = new Blinker();
    let phase = Math.random() * TAU, sq = 0, roll = 0, flip = 0;
    const update = (dt, st) => {
      const anim = st.anim ?? 'walk';
      clk.tick(dt, anim);
      const t = clk.t;
      const walking = anim === 'walk';
      const speed = walking ? (st.speed ?? 1.4) : 0;
      if (walking) phase += dt * (5 + speed * 4.5);
      const onBack = anim === 'flipped' || anim === 'carried';
      flip = damp(flip, onBack ? 1 : 0, 9, dt);
      if (anim === 'thrown') roll -= dt * 14; else roll = damp(roll, Math.round(roll / TAU) * TAU, 8, dt);
      const rock = anim === 'flipped' ? Math.sin(t * 3.2) * 0.22 : 0;
      ball.rotation.z = roll - flip * 1.95 + rock;
      ball.rotation.x = walking ? Math.sin(phase) * 0.08 : 0;
      ball.position.y = RP_C + (walking ? Math.abs(Math.sin(phase)) * 0.04 : 0) - flip * 0.04;
      sq = damp(sq, anim === 'squashed' ? 1 : 0, 25, dt);
      pose.scale.set(1 + sq * 0.4, Math.max(0.05, 1 - sq * 0.78), 1 + sq * 0.4);
      const tuck = anim === 'thrown' ? 1 : 0;
      const kick = anim === 'carried' ? 22 : 13;
      feet.forEach((f, i) => {
        const ph = phase + i * Math.PI;
        let x = 0.04, y = 0.06 - RP_C, rot = 0;
        if (walking) { x += Math.sin(ph) * 0.09; y += Math.max(0, Math.cos(ph)) * 0.05; rot = -Math.sin(ph) * 0.3; }
        if (onBack) { const k = Math.sin(t * kick + i * 2); x += k * 0.05; y -= 0.02 + Math.max(0, k) * 0.05; rot = k * 0.5; }
        f.position.set(damp(f.position.x, x, 30, dt), damp(f.position.y, y + tuck * 0.12, 30, dt), f.position.z);
        f.rotation.z = rot;
        f.scale.setScalar(Math.max(0.001, 1 - tuck * 0.9));
      });
      let bk = blink.update(dt);
      if (anim === 'squashed') bk = 0.1; else if (anim === 'flipped') bk = 0.5 + Math.sin(t * 7) * 0.15; else if (anim === 'thrown') bk = 0.15; else if (anim === 'carried') bk = 1.1;
      eye.userData.blink(bk);
      dizzy.visible = anim === 'flipped';
      dizzy.position.set(0.2, RP_C + 0.15, 0);
      dizzy.rotation.y = t * 4;
    };
    return makeModel(name, root, update, [flash], { initial: 'walk' });
  };
}

// =============================================================================================
// Wuschel
// =============================================================================================
function buildWuschel(opts = {}) {
  const root = new THREE.Group();
  const size = Number(opts.size ?? 1);
  const spin = joint([0, WU.cy * size, 0]);
  const inner = joint([0, -WU.cy, 0]);
  spin.scale.setScalar(size);
  const fur = mesh(wuschelGeo(), vcol(0.55, {}, 'fur'), {}, true);
  const hl = mesh(wuschelHlGeo(), basic('white', { color: 0xffffff }));
  inner.add(fur, hl);
  spin.add(inner);
  root.add(spin);
  const clk = new Clock();
  let wob = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    const moving = anim === 'move';
    wob = damp(wob, moving ? 1 : 0.4, 4, dt);
    // Wuschelig zittern, pulsieren, leicht kippen
    const p = 1 + Math.sin(t * 9) * 0.035 * wob;
    inner.scale.set(p, 2 - p, p);
    spin.rotation.z = Math.sin(t * 5.3) * 0.12 * wob + (moving ? -0.1 : 0);
    spin.rotation.x = Math.sin(t * 4.1) * 0.1 * wob;
    spin.rotation.y = Math.sin(t * 1.3) * 0.25;
    spin.position.y = (WU.cy + Math.abs(Math.sin(t * 6)) * 0.04 * wob) * size;
  };
  return makeModel('wuschel', root, update);
}

// =============================================================================================
// Hüpfmaus / Stachel-Hüpfmaus
// =============================================================================================
const HM = { fur: 0xffb066, furDark: 0xe8903a, belly: 0xfff0dc, ear: 0xffb0c4, nose: 0xff5a8a, tail: 0xffa0b8, heart: 0xff4a7a, foot: 0xfff0dc, ink: 0x2a1a14, cheek: 0xff8aa0, whisker: 0x5a3a2a };
const HM_SPIKY = { ...HM, fur: 0x8a62d8, furDark: 0x6a42b0, belly: 0xece2ff, ear: 0xffb0d8, foot: 0xece2ff, helmet: 0x3a4660, helmetHi: 0x6a7896, spike: 0xfff2c4, band: 0xffc21a };

function hmBodyGeo(P, spiky) {
  return cached(`w2:hm:body:${spiky}`, () => {
    const b = new Build();
    const furBelly = { v: (x, y, z, nx) => mix(P.fur, P.belly, smoothstep((nx - 0.25) / 0.45)) };
    b.sphere(1, furBelly, { p: [-0.02, 0.25, 0], s: [0.22, 0.22, 0.2] }, 20, 14);
    b.sphere(0.2, P.fur, { p: [0.09, 0.48, 0] }, 22, 16);
    b.sphere(1, P.belly, { p: [0.25, 0.44, 0], s: [0.09, 0.075, 0.1] }, 14, 10);
    b.sphere(0.03, P.nose, { p: [0.335, 0.455, 0] }, 10, 8);
    b.torus(0.03, 0.009, P.ink, { p: [0.325, 0.405, 0], r: [0, Math.PI / 2, Math.PI], s: [1, 0.8, 1] }, 5, 10, Math.PI);
    for (const s of [1, -1]) {
      decals(b, [{ ...onEllipsoid([0.09, 0.48, 0], [0.2, 0.2, 0.2], s * 0.75, -0.2), r: 0.04 }], 0.04, HM.cheek, 0.3);
      for (const k of [-1, 0, 1]) b.capsule(0.006, 0.12, P.whisker, { p: [0.28, 0.44 + k * 0.02, s * 0.1], r: [Math.PI / 2 + k * 0.2 * s, 0, 0], order: 'YXZ' }, 2, 4);
      b.sphere(1, P.belly, { p: [0.17, 0.25, s * 0.11], s: [0.055, 0.06, 0.05] }, 10, 8);       // Händchen
      b.sphere(1, P.foot, { p: [0.08, 0.035, s * 0.1], s: [0.11, 0.045, 0.065] }, 12, 8);       // Füße
    }
    // Schwanz mit Herzspitze
    b.tube([[-0.2, 0.18, 0], [-0.34, 0.16, 0], [-0.42, 0.28, 0], [-0.38, 0.42, 0]], 0.018, P.tail, null, 16, 6);
    b.extrude(heartShape(0.06), 0.035, HM.heart, { p: [-0.38, 0.47, 0], r: [0, Math.PI / 2, 0.2] }, 0.012, 6, 2);
    if (spiky) {
      // Stahlhelm mit Goldband und fünf Stacheln, finstere Brauen
      b.dome(1, { v: (x, y, z, nx, ny) => mix(P.helmet, P.helmetHi, smoothstep(ny)) }, { p: [0.07, 0.53, 0], s: [0.22, 0.2, 0.22], r: [0, 0, 0.18] }, Math.PI / 2, 22, 8);
      b.torus(0.21, 0.025, P.band, { p: [0.07, 0.535, 0], r: [Math.PI / 2, 0.18, 0], order: 'YXZ', s: [1, 1.03, 1] }, 6, 24);
      for (const d of [[0.1, 1, 0], [0.75, 0.55, 0], [-0.55, 0.75, 0], [0.15, 0.6, 0.7], [0.15, 0.6, -0.7], [-0.6, 0.35, 0.55], [-0.6, 0.35, -0.55]]) {
        const v = new THREE.Vector3(...d).normalize();
        const g = new THREE.ConeGeometry(0.045, 0.15, 8); g.rotateX(Math.PI / 2); g.translate(0, 0, 0.075);
        b.add(g, P.spike, placedM([0.07 + v.x * 0.2, 0.53 + v.y * 0.19, v.z * 0.21], v));
      }
      for (const s of [1, -1]) b.capsule(0.018, 0.075, P.ink, { p: [0.255, 0.555, s * 0.075], r: [Math.PI / 2 - s * 0.55, -s * 0.5, 0], order: 'YXZ' }, 3, 6);
    }
    return b.geometry();
  });
}
function placedM(p, dir) {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize());
  return m.compose(new THREE.Vector3(...p), q, new THREE.Vector3(1, 1, 1));
}
function hmEarGeo(P, spiky) {
  return cached(`w2:hm:ear:${spiky}`, () => {
    const b = new Build();
    b.sphere(1, P.fur, { p: [0, 0.13, 0], s: [0.035, 0.15, 0.14] }, 16, 12);
    b.sphere(1, P.ear, { p: [0.022, 0.13, 0], s: [0.016, 0.115, 0.105] }, 14, 10);
    return b.geometry();
  });
}

function buildHuepfmaus(spiky) {
  const P = spiky ? HM_SPIKY : HM;
  const name = spiky ? 'huepfmaus_stachel' : 'huepfmaus';
  return () => {
    const root = new THREE.Group();
    const pose = joint();
    const bodyM = mesh(hmBodyGeo(P, spiky), vcol(0.42), {}, true);
    const eye = eyes([{ p: [0.235, 0.52, 0.085], r: 0.068, sy: 1.3, dir: [1, 0.1, 0.55] }, { p: [0.235, 0.52, -0.085], r: 0.068, sy: 1.3, dir: [1, 0.1, -0.55] }],
      { key: `w2:hm:${spiky}`, iris: spiky ? 0xd02a4a : 0x4a2a14, pupil: 0.6, depth: 0.55 });
    const ears = [1, -1].map((s) => joint([0.04, spiky ? 0.6 : 0.62, s * 0.15], mesh(hmEarGeo(P, spiky), vcol(0.45), {}, true)));
    const dizzy = dizzyStars(0.26, 0.065); dizzy.position.y = spiky ? 0.9 : 0.85;
    pose.add(bodyM, eye, ...ears, dizzy);
    root.add(pose);
    const clk = new Clock(), blink = new Blinker();
    let phase = Math.random() * TAU, sq = 0;
    const update = (dt, st) => {
      const anim = st.anim ?? 'idle';
      clk.tick(dt, anim);
      const t = clk.t, age = clk.age;
      let sx = 1, sy = 1, y = 0, tilt = 0, ear = 0.25, earX = 0;
      if (anim === 'walk') {
        phase += dt * (7 + (st.speed ?? 1.2) * 5);
        const k = Math.abs(Math.sin(phase));
        y = k * 0.08; sy = 1 + k * 0.06; sx = 1 - k * 0.03; tilt = -0.1; ear = 0.3 + k * 0.3;
      } else if (anim === 'hop') {
        const p = st.progress ?? clamp(age / 0.55, 0, 1);
        const up = p < 0.5;
        sy = up ? 1.14 - p * 0.2 : 0.98 + (p - 0.5) * 0.15; sx = 2 - sy;
        tilt = up ? -0.22 : 0.15; ear = up ? 1.0 : -0.2; earX = 0.25;
      } else if (anim === 'land') {
        const k = Math.max(0, 1 - age / 0.18);
        sy = 1 - Math.sin(k * Math.PI) * 0.25; sx = 1 + Math.sin(k * Math.PI) * 0.15; ear = -0.3 * k;
      } else if (anim === 'stunned') {
        tilt = Math.sin(t * 5) * 0.15; ear = -0.4;
      } else if (anim === 'idle') {
        sy = 1 + Math.sin(t * 2.4) * 0.025; sx = 2 - sy;
        ear = 0.25 + Math.sin(t * 1.7) * 0.06;
      }
      sq = damp(sq, anim === 'squashed' ? 1 : 0, 25, dt);
      pose.scale.set(sx * (1 + sq * 0.4), Math.max(0.05, sy * (1 - sq * 0.78)), sx * (1 + sq * 0.4));
      pose.position.y = damp(pose.position.y, y, 30, dt);
      pose.rotation.z = damp(pose.rotation.z, tilt, 14, dt);
      ears.forEach((e, i) => {
        const s = i ? -1 : 1;
        e.rotation.x = damp(e.rotation.x, s * (0.45 + earX) + (anim === 'squashed' ? s * 0.9 : 0), 12, dt);
        e.rotation.z = damp(e.rotation.z, ear, 12, dt);
      });
      let bk = blink.update(dt);
      if (anim === 'squashed') bk = 0.1; else if (anim === 'stunned') bk = 0.45; else if (anim === 'hop') bk = 1.12;
      eye.userData.blink(bk);
      dizzy.visible = anim === 'stunned';
      dizzy.rotation.y = t * 4;
    };
    return makeModel(name, root, update);
  };
}

// =============================================================================================
// Marschblock
// =============================================================================================
function buildMarschblock(opts = {}) {
  const color = mbColor(opts.color ?? 'red');
  const root = new THREE.Group();
  const pose = joint();
  const shell = mesh(mbShellGeo(), std(`w2:mb:${color}`, { color, vertexColors: true, roughness: 0.4 }), {}, true);
  const detail = mesh(mbDetailGeo(false), vcol(0.4), {}, true);
  const eye = mbEyes();
  pose.add(shell, detail, eye);
  const legs = [1, -1].map((s) => joint([0.02, MB.LEG, s * 0.15], mesh(mbLegGeo(), vcol(0.4), {}, true)));
  const note = opts.note === false ? null : mesh(mbNoteGeo(), mbNoteMat(), { p: [-0.05, 1.6, 0] });
  root.add(pose, ...legs);
  if (note) root.add(note);
  const clk = new Clock(), blink = new Blinker();
  let phase = Math.random() * TAU, sq = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'march';
    clk.tick(dt, anim);
    const t = clk.t;
    const marching = anim === 'march' || anim === 'panic';
    const speed = st.speed ?? (anim === 'panic' ? 3.5 : 1.5);
    if (st.beat !== undefined) phase = st.beat * TAU * 2;
    else if (marching) phase += dt * (anim === 'panic' ? 16 : 3.2 + speed * 2.4);
    const s = Math.sin(phase);
    sq = damp(sq, anim === 'squashed' ? 1 : 0, 25, dt);
    const shake = anim === 'panic' ? Math.sin(t * 47) * 0.05 : 0;
    pose.position.y = (marching ? Math.abs(s) * 0.05 : Math.sin(t * 2.2) * 0.008) - sq * 0.2;
    pose.rotation.x = marching ? s * 0.07 + shake : 0;
    pose.rotation.z = anim === 'panic' ? -0.15 : marching ? -0.03 : 0;
    pose.scale.set(1 + sq * 0.35, Math.max(0.05, 1 - sq * 0.75), 1 + sq * 0.35);
    legs.forEach((l, i) => {
      const k = i ? -s : s;
      // Stechschritt: Bein vorne angehoben (Knie hoch), hinten gestreckt
      l.rotation.z = damp(l.rotation.z, marching ? Math.max(0, k) * 0.85 - Math.max(0, -k) * 0.25 : 0, 30, dt);
      l.position.y = MB.LEG + (marching ? Math.max(0, k) * 0.04 : 0) - sq * 0.18;
      l.visible = sq < 0.9;
    });
    if (note) {
      note.visible = anim === 'march' || anim === 'idle';
      const beat = Math.abs(Math.sin(phase));
      note.position.y = 1.55 + beat * 0.12 + Math.sin(t * 1.3) * 0.03;
      note.rotation.y = t * 1.6;
      note.rotation.z = Math.sin(phase) * 0.25;
      note.scale.setScalar(0.9 + beat * 0.2);
    }
    let bk = blink.update(dt);
    if (anim === 'squashed') bk = 0.1; else if (anim === 'panic') bk = 1.2;
    eye.userData.blink(bk);
  };
  return makeModel('marschblock', root, update, [], { initial: 'march' });
}

// =============================================================================================
// Mini-Pilzling (Pilzling × 0,5)
// =============================================================================================
function buildMiniPilzling() {
  const inner = W1.pilzling();
  const root = new THREE.Group();
  inner.root.scale.setScalar(0.5);
  root.add(inner.root);
  return makeModel('pilzling_mini', root, (dt, st) => inner.update(dt, st), [inner], { initial: 'walk' });
}

// =============================================================================================
// Münzmarder
// =============================================================================================
const MM = {
  fur: 0x7a4422, furDark: 0x52290f, bib: 0xffe6c4, mask: 0x1e1418, nose: 0x2a1a1a, ear: 0xffc0a0,
  sack: 0xdcb47e, sackDark: 0xa8804a, rope: 0x8a5a2a, coin: 0xf7931a, tailRing: 0x3a1e0c, cheek: 0xff9a8a,
};
function mmBodyGeo() {
  return cached('w2:mm:body', () => {
    const b = new Build();
    const fb = { v: (x, y, z, nx, ny) => mix(MM.fur, MM.bib, smoothstep((-ny - 0.1) / 0.5) * 0.9) };
    b.capsule(0.15, 0.36, fb, { p: [0, 0.32, 0], r: [0, 0, Math.PI / 2 - 0.12] }, 6, 16);
    // Kopf, spitze Schnauze, Nase, Räubermaske, runde Ohren
    b.sphere(1, MM.fur, { p: [0.33, 0.46, 0], s: [0.16, 0.14, 0.15] }, 20, 14);
    b.sphere(1, MM.bib, { p: [0.36, 0.38, 0], s: [0.12, 0.08, 0.11] }, 14, 10);
    const snout = new THREE.ConeGeometry(0.075, 0.2, 14); snout.rotateZ(-Math.PI / 2);
    b.add(snout, { v: (x, y) => (y < -0.01 ? col(MM.bib) : col(MM.fur)) }, { p: [0.52, 0.42, 0], s: [1, 0.85, 1] });
    b.sphere(0.032, MM.nose, { p: [0.62, 0.425, 0] }, 10, 8);
    b.sphere(1, MM.mask, { p: [0.4, 0.5, 0], s: [0.1, 0.075, 0.165], r: [0, 0, -0.18] }, 18, 12);
    for (const s of [1, -1]) {
      b.sphere(1, MM.fur, { p: [0.26, 0.6, s * 0.11], s: [0.05, 0.065, 0.065] }, 12, 8);
      b.sphere(1, MM.ear, { p: [0.285, 0.6, s * 0.11], s: [0.018, 0.045, 0.045] }, 8, 6);
      decals(b, [{ ...onEllipsoid([0.33, 0.46, 0], [0.16, 0.14, 0.15], s * 0.8, -0.45), r: 0.03 }], 0.03, MM.cheek, 0.3);
    }
    // verschmitztes Grinsen
    b.torus(0.04, 0.01, MM.nose, { p: [0.49, 0.375, 0.0], r: [0, Math.PI / 2, Math.PI + 0.35], s: [1, 0.7, 1] }, 5, 10, Math.PI);
    return b.geometry();
  });
}
const mmLegGeo = () => cached('w2:mm:leg', () => {
  const b = new Build();
  b.capsule(0.045, 0.12, MM.furDark, { p: [0, -0.08, 0] }, 3, 8);
  b.sphere(1, MM.furDark, { p: [0.03, -0.16, 0], s: [0.06, 0.035, 0.045] }, 8, 6);
  return b.geometry();
});
const mmTailGeo = () => cached('w2:mm:tail', () => {
  const b = new Build();
  for (let i = 0; i < 5; i++) b.sphere(1, i % 2 ? MM.tailRing : MM.fur, { p: [-i * 0.075, i * 0.035, 0], s: [0.065, 0.075 - i * 0.004, 0.075 - i * 0.004] }, 12, 8);
  b.sphere(1, MM.bib, { p: [-0.37, 0.18, 0], s: [0.05, 0.055, 0.055] }, 10, 8);
  return b.geometry();
});
const mmSackGeo = () => cached('w2:mm:sack', () => {
  const b = new Build();
  b.sphere(1, { v: (x, y) => mix(MM.sackDark, MM.sack, smoothstep(y / 0.2 + 0.5)) }, { p: [0, 0.16, 0], s: [0.18, 0.19, 0.2] }, 18, 12);
  b.cone(0.07, 0.12, MM.sack, { p: [0, 0.37, 0], r: [Math.PI, 0, 0] }, 10);
  b.sphere(1, MM.sack, { p: [0, 0.43, 0], s: [0.08, 0.05, 0.08] }, 10, 6);
  b.torus(0.06, 0.015, MM.rope, { p: [0, 0.33, 0], r: [Math.PI / 2, 0, 0] }, 5, 12);
  for (const s of [1, -1]) {
    b.cyl(0.085, 0.085, 0.02, MM.coin, { p: [0, 0.17, s * 0.2], r: [Math.PI / 2, 0, 0] }, 16);
    b.box(0.03, 0.09, 0.012, 0xfff2d8, { p: [0, 0.17, s * 0.212] }, 0.005, 1);
    b.box(0.06, 0.02, 0.012, 0xfff2d8, { p: [0.0, 0.2, s * 0.212] }, 0.005, 1);
    b.box(0.06, 0.02, 0.012, 0xfff2d8, { p: [0.0, 0.14, s * 0.212] }, 0.005, 1);
  }
  // Riemen über die Brust
  b.torus(0.2, 0.015, MM.rope, { p: [0.12, -0.08, 0], r: [0, 0, 0.5] }, 5, 20, Math.PI * 0.9);
  return b.geometry();
});
const MM_LEGS = [[0.2, 1], [0.2, -1], [-0.18, 1], [-0.18, -1]];

function buildMuenzmarder() {
  const root = new THREE.Group();
  const pose = joint();
  const body = joint([0, 0.3, 0]);
  const flash = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, emissive: 0x000000 });
  const torso = mesh(mmBodyGeo(), flash, { p: [0, -0.3, 0] }, true);
  const eye = eyes([{ p: [0.465, 0.515, 0.065], r: 0.052, sy: 1.15, dir: [1, 0.2, 0.55] }, { p: [0.465, 0.515, -0.065], r: 0.052, sy: 1.15, dir: [1, 0.2, -0.55] }],
    { key: 'w2:mm', iris: 0x2a9a3a, pupil: 0.55, depth: 0.6 });
  eye.position.y -= 0.3;
  const tail = joint([-0.3, 0.06, 0], mesh(mmTailGeo(), vcol(0.55), {}, true));
  const sack = joint([-0.24, 0.04, 0], mesh(mmSackGeo(), vcol(0.6), {}, true));
  sack.scale.setScalar(0.72);
  sack.rotation.z = 0.35;
  body.add(torso, eye, tail, sack);
  const legs = instMesh(mmLegGeo(), vcol(0.5), 4, 0.8, 0.2);
  legs.castShadow = true;
  // Münzen, die beim Treffer herausspritzen
  const coinGeo = cached('w2:mm:coin', () => new Build().cyl(0.07, 0.07, 0.025, MM.coin, { r: [Math.PI / 2, 0, 0] }, 12).geometry());
  const coins = instMesh(coinGeo, std('w2:mmCoin', { color: 0xffffff, vertexColors: true, roughness: 0.25, metalness: 0.4, emissive: 0x2a1200 }), 6, 2, 1);
  const dizzy = dizzyStars(0.22, 0.06); dizzy.position.set(0.33, 0.75, 0);
  pose.add(body, legs, coins, dizzy);
  root.add(pose);
  const clk = new Clock(), blink = new Blinker();
  let phase = Math.random() * TAU, fall = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    const run = anim === 'run';
    if (run) phase += dt * (8 + (st.speed ?? 7) * 1.4);
    const g = Math.sin(phase);
    // Galopp: Körper wellt sich, Vorder- und Hinterbeine gegenläufig
    let y = 0, rz = 0;
    if (run) { y = Math.abs(g) * 0.08; rz = g * 0.14; }
    else if (anim === 'idle') { rz = Math.sin(t * 2) * 0.03; body.rotation.y = Math.sin(t * 0.9) * 0.3; }
    else if (anim === 'hit') { const k = clamp(age / 0.5, 0, 1); y = Math.sin(k * Math.PI) * 0.35; rz = 0.3 * Math.sin(k * Math.PI); }
    if (anim !== 'idle') body.rotation.y = damp(body.rotation.y, 0, 10, dt);
    fall = damp(fall, anim === 'defeated' ? 1 : 0, 6, dt);
    pose.position.y = y + fall * 0.05;
    body.rotation.z = rz;
    pose.rotation.x = fall * 2.6;
    MM_LEGS.forEach(([x, s], i) => {
      const front = x > 0;
      let sw = run ? (front ? g : -g) * 0.9 : 0;
      if (anim === 'hit') sw = front ? -0.6 : 0.6;
      if (anim === 'defeated') sw = Math.sin(t * 12 + i) * 0.3;
      setInst(legs, i, x, 0.2 + y * 0, s * 0.09, 0, 0, sw);
    });
    legs.instanceMatrix.needsUpdate = true;
    tail.rotation.z = run ? -0.25 + Math.sin(phase + 1) * 0.25 : Math.sin(t * 2.5) * 0.2 + 0.2;
    tail.rotation.y = Math.sin(t * 1.7) * 0.3;
    sack.position.y = 0.04 + (run ? Math.max(0, -g) * 0.07 : 0);
    sack.rotation.z = 0.35 + (run ? -g * 0.15 : 0);
    sack.scale.setScalar(anim === 'defeated' ? 0.45 : 0.72);
    // Münzfontäne
    const showCoins = anim === 'hit' && age < 0.8;
    coins.visible = showCoins;
    if (showCoins) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + 0.4, k = age;
        setInst(coins, i, -0.06 + Math.cos(a) * 1.2 * k, 0.75 + 4.5 * k - 9 * k * k, Math.sin(a) * 1.2 * k, t * 9 + i, t * 7, 0, 1);
      }
      coins.instanceMatrix.needsUpdate = true;
    }
    const hk = anim === 'hit' ? Math.max(0, 1 - age / 0.4) * (Math.sin(age * 40) > 0 ? 0.9 : 0.2) : 0;
    flash.emissive.setRGB(hk, hk * 0.9, hk * 0.7);
    let bk = blink.update(dt);
    if (anim === 'hit' || anim === 'defeated') bk = 0.12;
    eye.userData.blink(bk);
    dizzy.visible = anim === 'defeated';
    dizzy.rotation.y = t * 4;
  };
  return makeModel('muenzmarder', root, update, [flash], { initial: 'idle' });
}

// =============================================================================================
// Lauerblock
// =============================================================================================
const LB = { stone: 0x7a58b0, top: 0x9a7cd0, edge: 0x4a3076, brow: 0x24123e, rivet: 0xffc21a, frame: 0x55506a, frameTop: 0x77728c, hole: 0x120c1c, mouth: 0x2a0e2a, tooth: 0xfff6e8 };
function lbBlockGeo() {
  return cached('w2:lb:block', () => {
    const b = new Build();
    b.box(1, 1, 1, { v: (x, y, z, nx, ny, nz) => {
      const flat = Math.max(Math.abs(nx), Math.abs(ny), Math.abs(nz));
      return mix(ny > 0.9 ? LB.top : LB.stone, LB.edge, (1 - flat) * 2.4);
    } }, { p: [-0.5, 0.5, 0] }, 0.1, 2);
    // Steinfugen-Muster vorn (zwei Querfugen)
    for (const y of [0.22]) b.box(0.02, 0.03, 0.8, LB.edge, { p: [0.0, y, 0] }, 0, 1);
    // dicke Brauen, grimmiger Mund mit Zähnen
    for (const s of [1, -1]) b.box(0.07, 0.09, 0.3, LB.brow, { p: [0.02, 0.8, s * 0.2], r: [s * 0.32, 0, 0] }, 0.035, 1);
    b.box(0.03, 0.09, 0.42, LB.mouth, { p: [0.005, 0.32, 0] }, 0.03, 1);
    for (let i = -2; i <= 2; i++) b.cone(0.03, 0.05, LB.tooth, { p: [0.02, 0.36, i * 0.075], r: [Math.PI, 0, 0] }, 5);
    // Goldnieten an den Ecken der Vorderseite
    for (const sy of [0.1, 0.9]) for (const sz of [-0.4, 0.4]) b.sphere(0.045, LB.rivet, { p: [0.0, sy, sz] }, 8, 6);
    return b.geometry();
  });
}
function lbFrameGeo(reach) {
  return cached(`w2:lb:frame:${reach}`, () => {
    const b = new Build();
    const fc = { v: (x, y, z, nx, ny) => mix(LB.frame, LB.frameTop, smoothstep(ny)) };
    b.box(0.16, 0.14, 1.32, fc, { p: [0.02, 1.07, 0] }, 0.04, 1);
    b.box(0.16, 0.12, 1.32, fc, { p: [0.02, -0.04, 0] }, 0.04, 1);
    for (const s of [1, -1]) b.box(0.16, 1.2, 0.14, fc, { p: [0.02, 0.5, s * 0.59] }, 0.04, 1);
    b.box(0.04, 1.0, 1.0, LB.hole, { p: [-1.02, 0.5, 0] }, 0, 1);
    return b.geometry();
  });
}
function buildLauerblock(opts = {}) {
  const reach = Number(opts.reach ?? 1), size = Number(opts.size ?? 1);
  const root = new THREE.Group();
  const all = joint(); all.scale.setScalar(size);
  const frame = mesh(lbFrameGeo(1), vcol(0.6), {}, false);
  frame.receiveShadow = true;
  const slide = joint();
  const block = mesh(lbBlockGeo(), vcol(0.4), {}, true);
  const eye = eyes([{ p: [0.0, 0.62, 0.2], r: 0.12, sy: 1.0, dir: [1, 0, 0.12] }, { p: [0.0, 0.62, -0.2], r: 0.12, sy: 1.0, dir: [1, 0, -0.12] }],
    { key: 'w2:lb', iris: 0xffb01a, pupil: 0.42, depth: 0.45 });
  slide.add(block, eye);
  all.add(frame, slide);
  root.add(all);
  root.userData.out = 0;
  const clk = new Clock(), blink = new Blinker();
  let out = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'wait';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    let target = 0, rate = 10;
    if (anim === 'push') { target = 1; rate = 28; } else if (anim === 'back') { target = 0; rate = 7; } else if (anim === 'peek') target = 0.1 / Math.max(0.1, reach);
    out = st.out !== undefined ? clamp(st.out, 0, 1) : damp(out, target, rate, dt);
    const shake = anim === 'peek' ? Math.sin(t * 30) * 0.01 : 0;
    slide.position.x = out * reach / size + shake;
    root.userData.out = out * reach;
    // Augen: lauern (halb zu, schielen), spähen, wütend beim Stoß
    let bk = blink.update(dt);
    let look = Math.sin(t * 0.8) * 0.5;
    if (anim === 'wait') bk = Math.min(bk, 0.35);
    else if (anim === 'peek') { bk = 1; look = Math.sin(t * 3) * 0.8; }
    else if (anim === 'push') { bk = 0.7; look = 0; }
    eye.userData.blink(bk);
    eye.rotation.y = damp(eye.rotation.y, look * 0.25, 6, dt);
    eye.position.y = damp(eye.position.y, 0.62 + (anim === 'push' ? -0.02 : 0), 10, dt);
  };
  return makeModel('lauerblock', root, update, [], { initial: 'wait' });
}

export const MODELS = {
  hackvogel: buildHackvogel,
  rollpilz: buildRollpilz(false),
  grossrollpilz: buildRollpilz(true),
  wuschel: buildWuschel,
  huepfmaus: buildHuepfmaus(false),
  huepfmaus_stachel: buildHuepfmaus(true),
  marschblock: buildMarschblock,
  pilzling_mini: buildMiniPilzling,
  muenzmarder: buildMuenzmarder,
  lauerblock: buildLauerblock,
};
