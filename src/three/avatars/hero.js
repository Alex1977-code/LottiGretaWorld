// Avatare der Heldinnen (Lotti, Greta) und des Reittiers Pflaume im Super-Mario-3D-World-Look:
// weiche, runde Grundkörper (Kugeln, Kapseln, Lathe, Röhren), kräftige saubere Farben, spielzeughafte
// Materialien, prozedurale Animation. Alles Code-generiert, keine Dateien.
//
// Zustand kommt vom Phaser-Sprite (nur lesen, keine Spiellogik):
//   Hero:    obj.moveState ('ground'|'air'|'glide'|'dive'), obj.body.velocity, obj.onGround,
//            obj.mount (reitet), obj.swooping, obj.leaf.visible (Schirm offen), obj.key ('lotti'|'greta'),
//            obj.dead, obj.locked. Auf der Weltkarte ist obj ein nacktes Sprite – alle Felder dürfen fehlen
//            (dann: Stand bzw. Lauf, wenn die Phaser-Animation auf '-run' endet).
//   Pflaume: obj.power ('none'|'red'|'blue'|'yellow'), obj.isRidden, obj.isFleeing, obj.hovering,
//            obj.stomping, obj.rider, obj.walking, obj.body.velocity.
//
// Entscheidungen:
//  - Blickrichtung machen beide Avatare selbst (usesFacing = false): Die Figur dreht sich beim Umdrehen
//    durch die Vorderseite (Gesicht zur Kamera) und steht sonst ~24° zur Kamera gedreht (3/4-Ansicht,
//    beide Augen sichtbar). Neigung (angle) und Squash & Stretch bleiben bei der Basisklasse.
//  - Zeichenaufrufe: Alles, was sich gemeinsam bewegt und starr ist, wird zu einem vertexgefärbten Mesh
//    verschmolzen (Kopf+Gesicht, Haare+Schleife, Oberkörper+Kragen+Ärmel, Rock+Schürze, Schirm, …).
//    Nur Gelenke trennen Meshes. Heldin ≈ 21 Meshes (17 sichtbar), Pflaume 14.
//  - Angel und Möhre gehören zum Hero-Avatar (die Hand hält sie). Die Möhre pendelt physikalisch aus
//    der Beschleunigung der Reiterin; Pflaume streckt beim Reiten die Nase nach vorn-oben.
//  - Beim Reiten liegt der Fußpunkt der Heldin 0,75 Einheiten über Pflaumes Fußpunkt; die Reitpose senkt
//    das Becken um 0,28, so dass die Hüfte auf Pflaumes Rücken (≈0,95 über seinen Pfoten) sitzt und die
//    Beine seitlich am Körper herabhängen. Der Hoppel-Takt wird von der Reiterin vorgegeben
//    (ridePhase) und vom Kaninchen übernommen, damit beide synchron wippen.

import * as THREE from 'three';
import { Avatar3D } from '../Avatar3D.js';
import { POWER_COLORS } from '../../gfx/palette.js';
import { GAME, HERO } from '../../config.js';
import {
  TAU, damp, clamp, mat, lineMat, geo, sphere, capsule, cylinder, cone, torus, unitSphere,
  mesh, limb, placed, dirAE, mergeTinted, mergePlain, vcolMat, buildEyes, Facing, PoseBlender, Blinker,
} from '../lib/figures.js';

const U = 1 / GAME.tile;             // Weltpixel → Einheiten
const BIAS = 0.42;                   // Drehung zur Kamera (3/4-Ansicht), für Heldin und Pflaume gleich
const RUN_SPEED = HERO.runSpeed * U; // ≈ 7,8 Einheiten/s
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const UP = new THREE.Vector3(0, 1, 0);
const _v = new THREE.Vector3();

/** Teil für mergeTinted: [Geometrie, Farbe, Matrix] aus Lage/Drehung/Skalierung. */
function part(g, color, o = {}) {
  const q = o.q ?? new THREE.Quaternion().setFromEuler(new THREE.Euler(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0));
  return [g, color, new THREE.Matrix4().compose(V(o.x ?? 0, o.y ?? 0, o.z ?? 0), q, V(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1))];
}
/** Vertexgefärbtes Sammel-Mesh aus Teilen (Geometrie wird unter `key` geteilt). */
function vmesh(key, parts, roughness = 0.6, shadow = false, side = THREE.FrontSide) {
  const m = new THREE.Mesh(geo(key, () => mergeTinted(parts())), vcolMat(roughness, side));
  m.castShadow = shadow;
  return m;
}

// ------------------------------------------------------------------ Heldin: Maße (Einheiten, Fußpunkt y = 0)
const HIP = 0.50;          // Hüftgelenk
const THIGH = 0.19, SHIN = 0.17;
const SHOULDER_Y = 0.35;   // über der Hüfte
const SHOULDER_Z = 0.21;
const ARM = 0.22, HAND = 0.27;
const NECK_Y = 0.42;       // über der Hüfte (Kopf-Drehpunkt)
const HEAD_R = 0.30;
const HEAD_C = V(0.02, 0.28, 0); // Kopfmitte relativ zum Hals → Weltmitte (0.02, 1.20)
const SKIN_C = '#ffd6b0', WHITE_C = '#f8f6f0';

const STYLES = {
  lotti: { hair: '#c8963c', hairTip: '#f2d886', dress: '#3b7cf0', sleeve: WHITE_C, boot: '#7c4a24', iris: '#3e82f5', accent: '#e83a30', braids: true, bootShaft: true },
  greta: { hair: '#f3d97a', hairTip: '#fff3c4', dress: '#4fb833', sleeve: '#4fb833', boot: '#7d2e42', iris: '#49a84a', accent: '#f0609f', apron: true, socks: true, mane: true },
};

// ------------------------------------------------------------------ Heldin: Geometrien (geteilt, pro Variante)
/** Pony als Kugelschalen-Stück vor der Stirn (Elevation ≈24°–73°); scalloped = drei Bögen (Lotti). */
function fringeGeo(scalloped, phiStart, phiLen) {
  return geo(`fringe:${scalloped}:${phiStart.toFixed(2)}:${phiLen.toFixed(2)}`, () => {
    const g = new THREE.SphereGeometry(HEAD_R + 0.014, 12, 5, phiStart, phiLen, 0.3, 0.85);
    if (scalloped) {
      const pos = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        if (uv.getY(i) < 0.001) { const u = uv.getX(i); pos.setY(i, pos.getY(i) - 0.05 * (0.5 - 0.5 * Math.cos(TAU * 3 * u))); }
      }
      g.computeVertexNormals();
    }
    return g;
  });
}

/** Kopf: Haut, Wangen, Lächeln (Torusbogen) – ein Mesh. */
function headParts() {
  const parts = [part(sphere(HEAD_R, 18, 12), SKIN_C, { x: HEAD_C.x, y: HEAD_C.y })];
  const smileDir = V(Math.cos(-0.38), Math.sin(-0.38), 0);
  const smileM = placed(HEAD_C.clone().addScaledVector(smileDir, HEAD_R + 0.004), smileDir, V(1, 1, 1)).multiply(new THREE.Matrix4().makeRotationZ(Math.PI + (Math.PI - 2.5) / 2));
  parts.push([torus(0.05, 0.011, 6, 10, 2.5), '#8a2a2a', smileM]);
  for (const s of [1, -1]) {
    const d = dirAE(0.85 * s, -0.3);
    parts.push([unitSphere(), '#ff8f8f', placed(HEAD_C.clone().addScaledVector(d, HEAD_R - 0.012), d, V(0.05, 0.034, 0.02))]);
  }
  return parts;
}

/** Haarkappe, Pony und Schleife (Lotti) bzw. Haarreif (Greta). */
function hairParts(st) {
  const parts = [part(sphere(0.325, 18, 12), st.hair, { x: HEAD_C.x - 0.055, y: HEAD_C.y + 0.025 })];
  if (st.braids) {
    parts.push(part(fringeGeo(true, Math.PI - 1.05, 2.1), st.hair, { x: HEAD_C.x, y: HEAD_C.y }));
    // Schleife: zwei Schlaufen und Knoten, oben hinten auf dem Kopf, leicht zur Kamera
    const bow = new THREE.Matrix4().compose(V(HEAD_C.x - 0.1, HEAD_C.y + 0.34, 0.1), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, 0, 0.1)), V(1, 1, 1));
    for (const s of [1, -1]) {
      const m = new THREE.Matrix4().compose(V(s * 0.105, 0.015, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, s * 0.35)), V(0.12, 0.07, 0.05));
      parts.push([unitSphere(), st.accent, bow.clone().multiply(m)]);
    }
    parts.push([unitSphere(), st.accent, bow.clone().multiply(new THREE.Matrix4().compose(V(0, 0, 0.01), new THREE.Quaternion(), V(0.04, 0.04, 0.045)))]);
  } else {
    parts.push(part(fringeGeo(false, Math.PI - 1.35, 2.2), st.hair, { x: HEAD_C.x, y: HEAD_C.y, rx: 0.42, rz: -0.05 }));
    const arc = Math.PI * 0.95;
    parts.push(part(torus(HEAD_R + 0.03, 0.03, 8, 20, arc), st.accent, { x: HEAD_C.x - 0.03, y: HEAD_C.y + 0.01, ry: Math.PI / 2, rz: (Math.PI - arc) / 2 }));
  }
  return parts;
}

/** Zopf (Lotti): Lathe mit drei Flechtwülsten entlang +Y, rotes Haargummi, helle Quaste. */
const BRAID_L = 0.34;
function braidParts(st) {
  const lathe = geo('braid', () => {
    const pts = [], n = 30;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const bead = 0.5 - 0.5 * Math.cos(TAU * 3 * t);
      const r = (0.05 + 0.05 * Math.pow(bead, 0.8)) * (1 - 0.28 * t);
      pts.push(new THREE.Vector2(i === 0 || i === n ? 0.002 : r, t * BRAID_L));
    }
    return new THREE.LatheGeometry(pts, 10);
  });
  return [
    part(lathe, st.hair),
    part(cylinder(0.055, 0.055, 0.05, 10), st.accent, { y: BRAID_L + 0.02 }),
    part(sphere(0.075, 12, 10), st.hairTip, { y: BRAID_L + 0.1, sy: 1.3 }),
  ];
}

/** Offenes langes Haar (Greta): Haarschopf hinter Kopf und Rücken, hängt von y = 0 nach unten. */
function maneGeo() {
  return geo('mane', () => {
    const prof = [[0.002, -0.70], [0.17, -0.68], [0.28, -0.62], [0.31, -0.50], [0.29, -0.32], [0.26, -0.15], [0.20, 0.0], [0.002, 0.05]];
    const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 14);
    g.scale(0.62, 1, 1);
    return g;
  });
}

/** Oberkörper: Mieder, weißer Kragen, Puffärmel, (Greta) Schürzenlatz. */
function torsoParts(st) {
  const parts = [
    part(capsule(0.15, 0.12), st.dress, { y: 0.25 }),
    part(torus(0.1, 0.045, 8, 16), WHITE_C, { y: SHOULDER_Y + 0.05, rx: Math.PI / 2 }),
    part(sphere(0.085, 12, 10), st.sleeve, { y: SHOULDER_Y, z: 0.2 }),
    part(sphere(0.085, 12, 10), st.sleeve, { y: SHOULDER_Y, z: -0.2 }),
  ];
  if (st.apron) parts.push(part(unitSphere(), WHITE_C, { x: 0.125, y: 0.29, sx: 0.035, sy: 0.085, sz: 0.085 }));
  return parts;
}

/** Rock als Lathe von Saum bis Taille; Greta zusätzlich Schürze als Teilumdrehung vorn. */
function skirtParts(st) {
  const prof = [[0.295, -0.125], [0.305, -0.10], [0.27, -0.03], [0.22, 0.05], [0.17, 0.12], [0.15, 0.18], [0.002, 0.19]];
  const skirt = geo('skirt', () => new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 16));
  const parts = [part(skirt, st.dress)];
  if (st.apron) {
    const o = 0.014;
    const ap = [[0.30 + o, -0.09], [0.27 + o, -0.03], [0.22 + o, 0.05], [0.17 + o, 0.12], [0.155 + o, 0.165]];
    // Lathe: phi = 0 zeigt nach +Z, +X liegt bei phi = π/2
    parts.push(part(geo('apron', () => new THREE.LatheGeometry(ap.map(([r, y]) => new THREE.Vector2(r, y)), 8, Math.PI / 2 - 0.95, 1.9)), WHITE_C));
  }
  return parts;
}

/** Stiefel/Schuh am Knöchel (+ Söckchen bei Greta). */
function bootParts(st) {
  const parts = [part(capsule(0.075, 0.1), st.boot, { x: 0.045, y: -0.065, rz: Math.PI / 2 })];
  if (st.socks) parts.push(part(cylinder(0.062, 0.062, 0.07, 10), WHITE_C));
  return parts;
}

/** Blatt des Blätterschirms: Gitterfläche, Spitze nach +X, leicht gewölbt, gezackter Rand. */
const LEAF_X0 = -0.62, LEAF_L = 1.5;
const leafWidth = (t) => 0.56 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.72)), 0.85) * (1 + 0.08 * Math.sin(t * Math.PI * 11));
const leafHeight = (t, s) => 0.16 * (1 - s * s) * (0.35 + 0.65 * Math.sin(Math.PI * t));
function leafGeo() {
  return geo('leaf', () => {
    const nt = 26, ns = 8;
    const pos = [], uv = [], idx = [];
    for (let it = 0; it <= nt; it++) {
      const t = it / nt, x = LEAF_X0 + t * LEAF_L, w = leafWidth(t);
      for (let is = 0; is <= ns; is++) {
        const s = -1 + (2 * is) / ns;
        pos.push(x, leafHeight(t, s), -s * w); uv.push(t, is / ns);
      }
    }
    for (let it = 0; it < nt; it++) for (let is = 0; is < ns; is++) {
      const a = it * (ns + 1) + is, b = a + 1, c = a + (ns + 1), d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  });
}
/** Blattadern: Mittelrippe und vier Seitenadern als dünne Röhren. */
function veinsGeo() {
  return geo('veins', () => {
    const tube = (pts, segs) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), segs, 0.013, 5, false);
    const pt = (t, s) => V(LEAF_X0 + t * LEAF_L, leafHeight(t, s) + 0.008, -s * leafWidth(t));
    const parts = [[tube([pt(0.03, 0), pt(0.3, 0), pt(0.6, 0), pt(0.95, 0)], 10), null]];
    for (const side of [1, -1]) for (const t0 of [0.22, 0.5]) parts.push([tube([pt(t0, 0), pt(t0 + 0.14, 0.5 * side), pt(t0 + 0.26, 0.96 * side)], 6), null]);
    return mergePlain(parts);
  });
}
/** Schirm komplett (Ursprung = Hände): geschwungener Stiel vor dem Gesicht hoch, Blatt mit Adern darüber. */
const STEM_A = V(0.21, 0.56, 0), STEM_B = V(0.66, 1.0, 0), STEM_C = V(-0.08, 1.43, 0); // hüft-lokal
function umbrellaParts() {
  const rel = (p) => p.clone().sub(STEM_A);
  const stem = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(rel(STEM_A), rel(STEM_B), rel(STEM_C)), 12, 0.024, 6, false);
  const top = rel(STEM_C);
  const canopy = { x: top.x + 0.1, y: top.y + 0.02, rx: 0.12 };
  return [part(stem, '#6d8a2b'), part(leafGeo(), '#e8742c', canopy), part(veinsGeo(), '#8a3a12', canopy)];
}

/** Möhre mit Kraut (Ursprung = Schnurende). */
function carrotParts() {
  const parts = [part(cone(0.085, 0.3, 10), '#ff7f1f', { y: -0.16, rx: Math.PI })];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + 0.4;
    parts.push(part(cone(0.03, 0.17, 6), '#4caf3a', { x: Math.cos(a) * 0.03, y: 0.06, z: Math.sin(a) * 0.03, rx: Math.sin(a) * 0.5, rz: -Math.cos(a) * 0.5 }));
  }
  return parts;
}

/** Gemeinsamer Hoppel-Takt beim Reiten: Hebung des Rückens je Phase (Reiterin und Kaninchen nutzen dasselbe). */
export function rideBob(phase, sf) {
  const s = Math.sin(phase);
  return { lift: (0.03 + 0.17 * sf) * Math.max(0, s), s, c: Math.cos(phase) };
}

const HERO_POSE = {
  bob: 0, lean: 0, torso: 0, headX: 0, headY: 0, headZ: 0,
  armZn: 0.1, armZf: 0.1, armXn: -0.12, armXf: 0.12,
  thighZn: 0, thighZf: 0, thighXn: 0, thighXf: 0, kneeN: 0.05, kneeF: 0.05, footN: 0, footF: 0,
  hairBack: 0, hairLift: 0, eyes: 1, mouth: 0, figZ: 0, flip: 0,
};

// ================================================================== Heldin
export class HeroAvatar extends Avatar3D {
  buildModel() {
    this.usesFacing = false;
    this.variant = STYLES[this.textureKey] ? this.textureKey : 'lotti';
    const st = STYLES[this.variant];
    const key = (k) => `hero:${this.variant}:${k}`;
    const skin = mat('skin', { color: SKIN_C, roughness: 0.6 });
    const hair = mat(`hair:${this.variant}`, { color: st.hair, roughness: 0.42 });
    const boot = mat(`boot:${this.variant}`, { color: st.boot, roughness: 0.5 });

    this.facingCtl = new Facing(BIAS);
    this.blinker = new Blinker();
    this.blender = new PoseBlender(HERO_POSE);
    this.runPhase = 0; this.ridePhase = 0; this.rideSf = 0;
    this.leafOpen = 0; this.leafTilt = 0;
    this.swing = { a: 0, w: 0 }; this.prevVx = null;
    this.rodVisible = false;
    this.dt = 0.016;

    // Ganzfigur (Sturzflug-Drehung, Rückenlage) → Becken → Oberkörper → Kopf; Becken → Beine
    this.fig = new THREE.Group(); this.fig.rotation.order = 'ZYX';
    this.model.add(this.fig);
    this.pelvis = new THREE.Group(); this.pelvis.position.y = HIP;
    this.fig.add(this.pelvis);
    this.pelvis.add(vmesh(key('skirt'), () => skirtParts(st), 0.6, true, THREE.DoubleSide));

    // Oberkörper (Mieder, Kragen, Ärmel in einem Mesh)
    this.torso = new THREE.Group();
    this.pelvis.add(this.torso);
    this.torso.add(vmesh(key('torso'), () => torsoParts(st), 0.6, true));

    // Arme: Schulter-Drehpunkt → Kapsel + Hand (ein Mesh); Hand-Position als leerer Knoten für die Angel
    const armGeo = geo('hero:arm', () => mergePlain([[capsule(0.05, ARM), new THREE.Matrix4().makeTranslation(0, -ARM / 2, 0)], [sphere(0.065, 12, 10), new THREE.Matrix4().makeTranslation(0, -HAND, 0)]]));
    const makeArm = (s) => {
      const sh = new THREE.Group();
      sh.rotation.order = 'ZYX'; // erst seitlich abspreizen (X), dann vor/zurück schwingen (Z)
      sh.position.set(0, SHOULDER_Y, s * SHOULDER_Z);
      sh.add(mesh(armGeo, skin));
      sh.hand = new THREE.Object3D(); sh.hand.position.y = -HAND; sh.add(sh.hand);
      this.torso.add(sh);
      return sh;
    };
    this.armN = makeArm(1); this.armF = makeArm(-1);

    // Kopf: Haut+Gesicht, Haare(+Schleife/Haarreif), Augen, Glanzpunkte, offener Mund
    this.head = new THREE.Group(); this.head.position.y = NECK_Y;
    this.torso.add(this.head);
    this.head.add(vmesh('hero:head', headParts, 0.6, true));
    this.head.add(vmesh(key('hair'), () => hairParts(st), 0.42, true));
    const eyes = buildEyes({ center: HEAD_C, r: HEAD_R, az: 0.5, el: 0.02, look: 0.1, white: 0.082, iris: 0.054, pupil: 0.032, hl: 0.017, irisColor: st.iris });
    this.eyes = eyes.eyes; this.eyeHl = eyes.hl;
    this.head.add(this.eyes, this.eyeHl);
    const mouthDir = V(Math.cos(-0.42), Math.sin(-0.42), 0);
    const mouthC = HEAD_C.clone().addScaledVector(mouthDir, HEAD_R - 0.005);
    this.mouthO = mesh(unitSphere(), mat('mouth', { color: 0x7a2230, roughness: 0.5 }), { x: mouthC.x, y: mouthC.y, z: mouthC.z });
    this.mouthO.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(mouthDir, V(0, 0, 0), UP));
    this.mouthO.scale.setScalar(0.001);
    this.head.add(this.mouthO);

    // Frisur
    if (st.braids) {
      this.braids = [];
      for (const s of [1, -1]) {
        const root = new THREE.Group();
        root.position.set(HEAD_C.x - 0.03, HEAD_C.y - 0.07, s * 0.26);
        root.add(vmesh(key('braid'), () => braidParts(st), 0.42));
        root.side = s;
        this.head.add(root); this.braids.push(root);
      }
    }
    if (st.mane) {
      this.mane = new THREE.Group(); this.mane.position.set(HEAD_C.x - 0.1, HEAD_C.y + 0.15, 0);
      this.mane.add(mesh(maneGeo(), hair, { shadow: true }));
      this.head.add(this.mane);
      // zwei Strähnen vor den Schultern, schwingen gemeinsam um die Kopfmitte
      this.locks = new THREE.Group(); this.locks.position.set(HEAD_C.x, HEAD_C.y, 0);
      this.locks.add(mesh(geo('hero:locks', () => mergePlain([1, -1].map((s) => [capsule(0.05, 0.26), new THREE.Matrix4().makeTranslation(0.0, -0.24, s * 0.285)]))), hair));
      this.head.add(this.locks);
    }

    // Beine: Hüfte → Oberschenkel → Knie → Unterschenkel → Knöchel → Stiefel
    const makeLeg = (s) => {
      const hip = limb(0.065, THIGH, skin); hip.position.set(0, 0, s * 0.1);
      hip.rotation.order = 'ZYX';
      const knee = limb(0.055, SHIN, st.bootShaft ? boot : skin); knee.position.y = -THIGH;
      hip.add(knee);
      const ankle = new THREE.Group(); ankle.position.y = -SHIN;
      ankle.add(vmesh(key('boot'), () => bootParts(st), 0.5));
      knee.add(ankle);
      hip.knee = knee; hip.ankle = ankle;
      this.pelvis.add(hip);
      return hip;
    };
    this.legN = makeLeg(1); this.legF = makeLeg(-1);

    // Blätterschirm (ein Mesh, Ursprung in den Händen; am Becken, schwingt mit der Pendelbewegung mit)
    this.umbrella = new THREE.Group(); this.umbrella.position.copy(STEM_A);
    this.umbrella.add(vmesh('hero:umbrella', umbrellaParts, 0.75, true, THREE.DoubleSide));
    this.umbrella.visible = false;
    this.pelvis.add(this.umbrella);

    // Angel mit Möhre (nur beim Reiten; Lage wird je Bild aus der nahen Hand berechnet)
    this.rod = new THREE.Group();
    this.rod.add(mesh(cylinder(0.012, 0.022, 1.15, 6), mat('rod', { color: 0x9a6a36, roughness: 0.6 }), { y: 0.575 }));
    this.pendulum = new THREE.Group(); this.pendulum.position.y = 1.15;
    const STRING_L = 0.72;
    this.pendulum.add(new THREE.Line(geo('string', () => new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(0, -STRING_L, 0)])), lineMat('string', { color: 0x4a4038 })));
    const carrot = vmesh('hero:carrot', carrotParts, 0.55); carrot.position.y = -STRING_L;
    this.pendulum.add(carrot);
    this.rod.add(this.pendulum);
    this.rod.visible = false;
    this.pelvis.add(this.rod);
  }

  /** Zielpose aus dem Zustand des Sprites berechnen (lebende Pose, ohne Überblendung). */
  computePose(dt, t) {
    const o = this.obj;
    const vel = o.body?.velocity;
    const vx = (vel?.x ?? 0) * U, vy = (vel?.y ?? 0) * U; // Einheiten/s, vy > 0 = fällt
    const moveState = o.moveState ?? 'ground';
    const onGround = o.onGround ?? true;
    const mount = o.mount ?? null;
    const animRun = !!o.anims?.currentAnim?.key?.endsWith('-run');
    const speed = Math.abs(vx) > 0.5 ? Math.abs(vx) : animRun ? RUN_SPEED : 0;
    const sf = clamp(speed / RUN_SPEED, 0, 1.4);
    const greta = this.variant === 'greta';
    const P = this.blender.pose.bind(this.blender);
    let state, pose, dur = 0.18;

    if (o.dead) {
      state = 'dead';
      pose = P({ armZn: 2.2, armZf: 2.4, armXn: -0.6, armXf: 0.6, thighZn: 0.5, thighZf: -0.3, kneeN: 0.5, kneeF: 0.3, headZ: -0.2, eyes: 0.08, mouth: 0.8, hairLift: 0.6 });
    } else if (mount) {
      this.ridePhase += speed * dt * (TAU / (1.5 + 0.8 * sf));
      this.rideSf = sf;
      const hop = rideBob(this.ridePhase, sf);
      const moving = onGround && speed > 0.5;
      state = moving ? 'rideRun' : 'ride';
      const fly = !!mount.hovering;
      pose = P({
        bob: -0.28 + (moving ? hop.lift : 0) + (fly ? 0.03 * Math.sin(t * 6) : 0),
        lean: moving ? -0.05 - 0.08 * sf : 0,
        thighZn: 1.3, thighZf: 1.3, thighXn: -0.5, thighXf: 0.5, kneeN: 1.3, kneeF: 1.3, footN: 0.5, footF: 0.5,
        armZn: 1.2, armXn: -0.12,
        armZf: fly ? 2.4 : 2.75 + 0.1 * Math.sin(t * 7), armXf: 0.35,
        headZ: 0.1 - (moving ? 0.1 * hop.c * sf : 0), headY: -0.1,
        mouth: moving || fly ? 1 : 0.25, hairBack: 0.6 * sf + (moving ? 0.15 * hop.c : 0), hairLift: moving ? -0.3 * hop.c * sf : 0,
      });
    } else if (moveState === 'dive') {
      state = 'dive';
      pose = P({ flip: 1, figZ: 0.32, armZn: -0.35, armZf: -0.35, armXn: -0.1, armXf: 0.1, thighZn: -0.1, thighZf: -0.1, kneeN: 0, kneeF: 0, footN: 1.1, footF: 1.1, headZ: 0.5, eyes: 1.15, mouth: 0.6, hairLift: -1, hairBack: 0.2 });
      dur = 0.22;
    } else if (moveState === 'glide') {
      state = 'glide';
      const sway = Math.sin(t * 1.7);
      pose = P({
        armZn: 2.5, armZf: 2.55, armXn: 0.35, armXf: -0.35, lean: 0.05 * sway,
        thighZn: 0.2 + 0.1 * sway, thighZf: -0.05 - 0.1 * sway, kneeN: 0.45, kneeF: 0.35, footN: 0.5, footF: 0.5,
        headZ: 0.08, headY: -0.1, hairBack: 0.15 + 0.3 * clamp(Math.abs(vx) / 8, 0, 1), hairLift: 0.05 * sway,
      });
    } else if (moveState !== 'ground' || !onGround) {
      if (o.swooping) {
        state = 'swoop';
        const psi = clamp(-vy / 18, 0, 1);
        pose = P({ figZ: 0.85 * psi, armZn: -1.0, armZf: -1.1, armXn: -0.8, armXf: 0.8, thighZn: 0.6, thighZf: 0.4, kneeN: 0.5, kneeF: 0.4, footN: 0.7, footF: 0.7, headZ: 0.3, mouth: 1, hairLift: -0.5, hairBack: 0.2 });
        dur = 0.25;
      } else if (vy < -0.5) {
        state = 'jump';
        pose = greta
          // Greta gestreckt: Arme schräg nach vorn-oben gespreizt, Beine in der Spreize
          ? P({ armZn: 2.3, armZf: 2.4, armXn: -0.45, armXf: 0.45, thighZn: 0.75, thighZf: -0.5, kneeN: 0.45, kneeF: 0.25, footN: 0.9, footF: 0.9, lean: -0.05, headZ: 0.12, mouth: 0.9, hairLift: -0.5, hairBack: 0.4 })
          // Lotti kompakt/kraftvoll: Arme nach hinten-unten geschwungen, Knie angezogen
          : P({ armZn: -0.9, armZf: -1.0, armXn: -0.35, armXf: 0.35, thighZn: 1.2, thighZf: 0.6, kneeN: 1.6, kneeF: 1.2, footN: 0.8, footF: 0.6, lean: 0.08, headZ: 0.15, mouth: 1, hairLift: -0.35, hairBack: 0.3 });
      } else {
        state = 'fall';
        pose = P({ armXn: -1.5, armXf: 1.5, armZn: 0.2, armZf: 0.2, thighZn: 0.4, thighZf: -0.2, kneeN: 0.5, kneeF: 0.3, footN: 0.3, footF: 0.3, eyes: 1.15, mouth: 0.6, hairLift: 0.9, hairBack: 0.3, lean: 0.04, headZ: -0.1 });
      }
    } else if (speed > 0.5) {
      state = 'run';
      this.runPhase += speed * dt * (TAU / 2.3);
      const p = this.runPhase, s = Math.sin(p), c = Math.cos(p);
      const amp = 0.9 * clamp(0.35 + sf, 0, 1);
      pose = P({
        thighZn: amp * s, thighZf: -amp * s,
        kneeN: 1.0 * (0.5 - 0.5 * s) + 0.1, kneeF: 1.0 * (0.5 + 0.5 * s) + 0.1,
        footN: 0.6 * Math.max(0, -s), footF: 0.6 * Math.max(0, s),
        armZn: -0.95 * s * amp, armZf: 0.95 * s * amp, armXn: -0.3, armXf: 0.3,
        lean: -0.14 - 0.12 * sf, bob: 0.045 * Math.abs(c) * sf, torso: 0.05 * Math.sin(2 * p),
        headZ: 0.1 + 0.05 * Math.cos(2 * p), headY: -0.08,
        hairBack: 0.55 * sf + 0.12 * Math.sin(2 * p), hairLift: 0.18 * Math.cos(2 * p) * sf,
      });
    } else {
      state = 'idle';
      const br = Math.sin(t * 2.2);
      pose = P({ bob: 0.012 * br, torso: 0.015 * br, headX: 0.05 * Math.sin(t * 0.7), headY: -0.18, headZ: 0.02 * br, hairLift: 0.03 * br, armZn: 0.1, armZf: 0.1, armXn: -0.14, armXf: 0.14 });
    }
    return { state, pose, dur, vx, vy, mount, onGround, speed, sf };
  }

  /** Pose auf die Gelenke übertragen. */
  applyPose(p, t) {
    this.pelvis.position.y = HIP + p.bob;
    this.pelvis.rotation.z = p.lean;
    this.torso.rotation.z = p.torso;
    this.head.rotation.set(p.headX, p.headY, p.headZ);
    this.armN.rotation.set(p.armXn, 0, p.armZn);
    this.armF.rotation.set(p.armXf, 0, p.armZf);
    this.legN.rotation.set(p.thighXn, 0, p.thighZn); this.legN.knee.rotation.z = -p.kneeN; this.legN.ankle.rotation.z = -p.footN;
    this.legF.rotation.set(p.thighXf, 0, p.thighZf); this.legF.knee.rotation.z = -p.kneeF; this.legF.ankle.rotation.z = -p.footF;
    this.fig.rotation.set(p.flip * Math.PI, 0, p.figZ);
    const blink = this.blinker.update(this.dt, p.eyes > 0.5);
    const ey = Math.max(0.06, p.eyes * blink);
    this.eyes.scale.y = ey; this.eyeHl.scale.y = ey;
    const mo = Math.max(0.001, p.mouth);
    this.mouthO.scale.set(0.045 * mo, 0.05 * mo, 0.03 * mo);
    // Frisur
    if (this.braids) {
      for (const b of this.braids) {
        _v.set(-(0.45 + 0.9 * p.hairBack), -0.3 + 0.75 * p.hairLift + 0.03 * Math.sin(t * 9 + b.side), b.side * 1.0).normalize();
        b.quaternion.setFromUnitVectors(UP, _v);
      }
    }
    if (this.mane) {
      const back = 0.12 + 0.9 * p.hairBack + 0.8 * Math.max(0, p.hairLift) - 0.25 * Math.min(0, p.hairLift);
      this.mane.rotation.z = -back;
      this.locks.rotation.z = -back * 0.45 + 0.1;
    }
  }

  animate(dt, t) {
    this.dt = dt;
    const o = this.obj;
    this.model.rotation.y = this.facingCtl.update(dt, this.facing);
    const { state, pose, dur, vx, mount, speed } = this.computePose(dt, t);
    const cur = this.blender.update(state, pose, dt, dur);
    this.applyPose(cur, t);

    // Blätterschirm: wächst aus den Händen heraus, mit kurzem Überschwingen; kippt in Flugrichtung
    const leafVisible = !!o.leaf?.visible;
    this.leafOpen = damp(this.leafOpen, leafVisible ? 1 : 0, leafVisible ? 12 : 30, dt);
    const open = this.leafOpen;
    this.umbrella.visible = open > 0.03;
    if (this.umbrella.visible) {
      const sc = open + 0.3 * Math.sin(open * Math.PI) * open;
      this.umbrella.scale.setScalar(Math.max(0.01, sc));
      this.leafTilt = damp(this.leafTilt, -THREE.MathUtils.degToRad((vx / U) * 0.06), 8, dt);
      this.umbrella.rotation.z = this.leafTilt + 0.03 * Math.sin(t * 2.3);
    }

    // Angel mit Möhre: Lage aus der nahen Hand, Pendel aus der Beschleunigung
    const riding = !!mount;
    if (riding !== this.rodVisible) { this.rodVisible = riding; this.rod.visible = riding; }
    if (riding) {
      this.torso.updateWorldMatrix(true, true);
      this.armN.hand.getWorldPosition(_v);
      this.rod.position.copy(this.pelvis.worldToLocal(_v));
      const rodAngle = Math.PI / 2 - 0.52; // Stab zeigt ~30° nach vorn-oben
      this.rod.rotation.z = -rodAngle;
      const vxPx = o.body?.velocity?.x ?? 0;
      const ax = this.prevVx === null ? 0 : clamp(((vxPx - this.prevVx) * U) / Math.max(dt, 1e-3), -60, 60);
      this.prevVx = vxPx;
      const sw = this.swing, L = 0.75, g = 30;
      const hopKick = speed > 0.5 ? 6 * Math.cos(this.ridePhase) * this.rideSf : 0;
      sw.w += (-(g / L) * Math.sin(sw.a) - (ax / L) * Math.cos(sw.a) + hopKick) * dt - 2.0 * sw.w * dt;
      sw.a = clamp(sw.a + sw.w * dt, -0.6, 1.15);
      if (sw.a <= -0.6 || sw.a >= 1.15) sw.w *= 0.3; // Anschlag
      this.pendulum.rotation.z = rodAngle + sw.a;
    } else {
      this.prevVx = null; this.swing.a *= 0.9; this.swing.w = 0;
    }
  }
}

// ================================================================== Pflaume (Kaninchen)
const FUR_C = '#2a2630', FURW_C = '#f4f1f8', PINK_C = '#ffa3c6';
const HEAD_PIV = V(0.44, 0.74, 0);   // Halsansatz (Kopf-Drehpunkt)
const HC = V(0.12, 0.20, 0);         // Kopfmitte, kopf-lokal → Welt ≈ (0.54, 0.88)

/** Rumpf: große runde Hinterpartie, nach vorn ansteigender Rumpf, weiße Brust, Puschelschwanz. */
function rabbitTorsoParts() {
  return [
    part(sphere(0.37, 18, 14), FUR_C, { x: -0.33, y: 0.46, sz: 0.92 }),
    part(sphere(0.30, 18, 14), FUR_C, { x: 0.1, y: 0.56, sx: 1.22, sy: 0.95, rz: 0.42 }),
    part(sphere(0.21, 14, 10), FURW_C, { x: 0.42, y: 0.46, sx: 0.75, sy: 1.15, sz: 0.85 }),
    part(sphere(0.14, 12, 10), FURW_C, { x: -0.70, y: 0.60 }),
  ];
}
/** Kopf mit Schnauze (die rosa Nase ist ein eigenes Mesh, sie wackelt). */
function rabbitHeadParts() {
  return [
    part(sphere(0.27, 18, 12), FUR_C, { x: HC.x, y: HC.y, sx: 1.08 }),
    part(sphere(0.15, 14, 10), FUR_C, { x: 0.34, y: 0.12, sx: 1.1, sy: 0.8, sz: 0.95 }),
  ];
}
/** Halstuch: Band um den Hals, Zipfel vor der Brust, Knoten – ein Mesh in Kraftfarbe. */
function rabbitBandanaGeo() {
  return geo('rabbit:bandana', () => {
    const neckAxis = V(0.45, 0.89, 0).normalize();
    const band = new THREE.Matrix4().compose(V(0.03, 0.02, 0), new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), neckAxis), V(1, 1, 1));
    const tip = part(cone(0.13, 0.26, 4), null, { x: 0.2, y: -0.17, z: 0.04, rx: Math.PI, ry: Math.PI / 4, sz: 0.4 });
    const knot = part(sphere(0.055, 10, 8), null, { x: 0.22, y: -0.03, z: 0.07 });
    return mergePlain([[torus(0.21, 0.045, 8, 18), band], [tip[0], tip[2]], [knot[0], knot[2]]]);
  });
}
/** Schlappohr: lange flache Kapsel, Innenseite rosa (zum Kopf hin). side = +1 nah / -1 fern. */
function rabbitEarParts(side) {
  return [
    part(capsule(0.105, 0.56), FUR_C, { y: -0.32, sz: 0.42 }),
    part(capsule(0.07, 0.42), PINK_C, { y: -0.37, z: -side * 0.042, sz: 0.3 }),
  ];
}
/** Hinterlauf: langer Hasenfuß vom Fersengelenk nach vorn; der nahe Fuß trägt den weißen Fleck. */
function rabbitHindParts(spot) {
  const parts = [part(capsule(0.1, 0.42), FUR_C, { x: 0.31, y: -0.10, rz: -Math.PI / 2, sz: 0.9 })];
  if (spot) parts.push(part(sphere(0.075, 10, 8), FURW_C, { x: 0.5, y: -0.04, z: 0.02, sy: 0.8 }));
  return parts;
}

const RABBIT_POSE = {
  bob: 0, pitch: 0, sx: 1, sy: 1, headZ: 0, headX: 0,
  earOutN: 0.55, earOutF: 0.1, earBackN: -0.15, earBackF: 0.7, earTwist: 0,
  hindN: 0, hindF: 0, frontN: 0, frontF: 0, eyes: 1, mouth: 0,
};

export class PflaumeAvatar extends Avatar3D {
  buildModel() {
    this.usesFacing = false;
    const fur = mat('fur-black', { color: FUR_C, roughness: 0.82 });
    this.bandanaMat = this.track(new THREE.MeshStandardMaterial({ color: POWER_COLORS.none.Z, roughness: 0.5 }));
    this.powerKey = null;

    this.facingCtl = new Facing(BIAS);
    this.blinker = new Blinker();
    this.blender = new PoseBlender(RABBIT_POSE, 0.18);
    this.hopPhase = 0; this.twitch = 0; this.twitchTimer = 1 + Math.random() * 2;
    this.dt = 0.016;

    this.body = new THREE.Group();
    this.model.add(this.body);
    this.torso = new THREE.Group();
    this.body.add(this.torso);
    this.torso.add(vmesh('rabbit:torso', rabbitTorsoParts, 0.82, true));

    // Kopf (Drehpunkt am Halsansatz)
    this.head = new THREE.Group(); this.head.position.copy(HEAD_PIV);
    this.torso.add(this.head);
    this.head.add(vmesh('rabbit:head', rabbitHeadParts, 0.82, true));
    this.nose = mesh(sphere(0.05, 10, 8), mat('fur-pink', { color: PINK_C, roughness: 0.6 }), { x: 0.49, y: 0.17, sx: 0.7, sy: 0.75 });
    this.head.add(this.nose);
    const eyes = buildEyes({ center: HC, r: 0.285, az: 0.95, el: 0.16, look: 0.14, white: 0.1, iris: 0.07, pupil: 0.046, hl: 0.022, irisColor: '#4a2a1a', pupilColor: '#0d0608' });
    this.eyes = eyes.eyes; this.eyeHl = eyes.hl;
    this.head.add(this.eyes, this.eyeHl);
    this.mouthO = mesh(unitSphere(), mat('mouth', { color: 0x7a2230, roughness: 0.5 }), { x: 0.46, y: 0.06 });
    this.mouthO.scale.setScalar(0.001);
    this.head.add(this.mouthO);
    // Schnurrhaare (hell, ein Linienkörper)
    this.head.add(new THREE.LineSegments(geo('rabbit:whiskers', () => {
      const pts = [];
      for (const s of [1, -1]) for (const [dx, dy, dz] of [[0.26, 0.09, 0.18], [0.28, 0.02, 0.21], [0.25, -0.05, 0.19]]) pts.push(V(0.42, 0.14, s * 0.1), V(0.42 + dx, 0.14 + dy, s * (0.1 + dz)));
      return new THREE.BufferGeometry().setFromPoints(pts);
    }), lineMat('whisker', { color: 0xe8e4f0 })));
    // Schlappohren: Drehpunkt oben am Kopf, hängen seitlich herab (nahes Ohr abgespreizt), Innenseite rosa
    this.ears = [];
    for (const s of [1, -1]) {
      const ear = new THREE.Group(); ear.position.set(0.05, 0.45, s * 0.15);
      const inner = new THREE.Group(); // Drehung um die Ohrachse (Twist)
      inner.add(vmesh(`rabbit:ear:${s}`, () => rabbitEarParts(s), 0.82, true));
      ear.add(inner); ear.inner = inner; ear.side = s;
      this.head.add(ear); this.ears.push(ear);
    }
    this.head.add(mesh(rabbitBandanaGeo(), this.bandanaMat));

    // Hinterläufe (Drehpunkt am Fersengelenk unter der Hinterpartie) und kurze Vorderpfoten
    const makeHind = (s) => {
      const piv = new THREE.Group(); piv.position.set(-0.40, 0.20, s * 0.27);
      piv.add(vmesh(`rabbit:hind:${s}`, () => rabbitHindParts(s > 0), 0.82, true));
      this.body.add(piv);
      return piv;
    };
    this.hindN = makeHind(1); this.hindF = makeHind(-1);
    const makeFront = (s) => {
      const piv = limb(0.065, 0.22, fur, false); piv.position.set(0.46, 0.30, s * 0.16);
      this.body.add(piv);
      return piv;
    };
    this.frontN = makeFront(1); this.frontF = makeFront(-1);
  }

  computePose(dt, t) {
    const o = this.obj;
    const ridden = !!o.isRidden && !!o.rider;
    const rider = ridden ? o.rider : null;
    const vel = (rider ?? o).body?.velocity;
    const vx = (vel?.x ?? 0) * U;
    const onGround = ridden ? (rider.onGround ?? true) : !!(o.body?.blocked?.down || o.body?.touching?.down);
    const speed = Math.abs(vx);
    const sf = clamp(speed / RUN_SPEED, 0, 1.4);
    const P = this.blender.pose.bind(this.blender);
    let state, pose;

    // Nasenwackeln in Schüben, Ohrzucken gelegentlich
    const nose = Math.sin(t * 24) * (Math.sin(t * 1.3) > 0.3 ? 1 : 0);
    this.twitchTimer -= dt;
    if (this.twitchTimer <= 0) { this.twitch = 1; this.twitchTimer = 2 + Math.random() * 3; }
    this.twitch = Math.max(0, this.twitch - dt * 5);
    const tw = Math.sin(this.twitch * Math.PI) * 0.35;

    if (o.isFleeing) {
      state = 'panic';
      const vy = (o.body?.velocity?.y ?? 0) * U;
      pose = P({ earOutN: 2.7, earOutF: 2.55, earBackN: -0.25, earBackF: -0.2, eyes: 1.3, mouth: 1, sx: 1.06, sy: 0.95, pitch: clamp(-vy * 0.03, -0.3, 0.3), hindN: -0.6, hindF: -0.5, frontN: 0.9, frontF: 0.6, headZ: 0.15 });
    } else if (ridden && o.stomping) {
      state = 'stomp';
      pose = P({ sx: 1.04, sy: 0.84, earOutN: 0.25, earOutF: 0.1, earBackN: 1.3, earBackF: 1.3, hindN: 0.9, hindF: 0.9, frontN: -0.6, frontF: -0.6, headZ: -0.3, eyes: 0.8 });
    } else if (ridden && o.hovering) {
      state = 'fly';
      const flap = Math.sin(t * 26);
      pose = P({ bob: 0.04 + 0.02 * Math.sin(t * 6), earOutN: 1.6 + 0.8 * flap, earOutF: 1.6 + 0.8 * flap, earBackN: 0.15, earBackF: 0.15, earTwist: 0.6, hindN: 0.7, hindF: 0.7, frontN: 0.5, frontF: 0.5, headZ: 0.25, mouth: 0.5, eyes: 1.1 });
    } else if (ridden) {
      const av = rider.__view3d;
      if (av && typeof av.ridePhase === 'number') this.hopPhase = av.ridePhase;
      else this.hopPhase += speed * dt * (TAU / (1.5 + 0.8 * sf));
      const moving = onGround && speed > 0.5;
      const hop = rideBob(this.hopPhase, sf);
      const s = hop.s, c = hop.c;
      const up = Math.max(0, s), down = Math.max(0, -s);
      state = moving ? 'gallop' : 'rideIdle';
      pose = moving
        ? P({
          bob: hop.lift, pitch: 0.25 * Math.sin(this.hopPhase + 0.6) * sf,
          sx: 1 + 0.14 * up + 0.08 * down, sy: 1 - 0.08 * up - 0.1 * down,
          headZ: 0.3 - 0.1 * c, headX: 0.07,
          earOutN: 0.55 + 0.1 * c, earOutF: 0.1, earBackN: -0.1 - 0.5 * c * sf, earBackF: 0.75 - 0.4 * c * sf,
          hindN: -0.85 * up + 0.3 * down, hindF: -0.85 * up + 0.3 * down - 0.1,
          frontN: 0.95 * up - 0.4 * down, frontF: 0.95 * up - 0.4 * down + 0.15,
          mouth: 0.4,
        })
        : P({ headZ: 0.28, headX: 0.05, sy: 1 + 0.02 * Math.sin(t * 2.5), earOutN: 0.55 + tw, mouth: 0.15 * (0.5 + 0.5 * nose) });
    } else {
      const walking = speed > 0.3 || !!o.walking;
      if (walking) {
        state = 'hop';
        this.hopPhase += Math.max(speed, 0.9) * dt * (TAU / 1.6);
        const s = Math.sin(this.hopPhase), c = Math.cos(this.hopPhase);
        const up = Math.max(0, s), down = Math.max(0, -s);
        pose = P({
          bob: 0.1 * up, pitch: 0.2 * Math.sin(this.hopPhase + 0.6),
          sx: 1 + 0.1 * up + 0.06 * down, sy: 1 - 0.06 * up - 0.08 * down,
          earBackN: -0.1 - 0.4 * c, earBackF: 0.75 - 0.35 * c,
          hindN: -0.6 * up + 0.25 * down, hindF: -0.6 * up + 0.25 * down - 0.1,
          frontN: 0.8 * up - 0.3 * down, frontF: 0.8 * up - 0.3 * down + 0.15,
          headZ: 0.05 - 0.08 * c,
        });
      } else {
        state = 'idle';
        pose = P({ sy: 1 + 0.02 * Math.sin(t * 2.5), sx: 1 - 0.01 * Math.sin(t * 2.5), earOutN: 0.55 + tw, headZ: 0.03 * Math.sin(t * 1.1), mouth: 0.1 * (0.5 + 0.5 * nose) });
      }
    }
    return { state, pose, nose };
  }

  applyPose(p, nose) {
    this.body.position.y = p.bob;
    this.torso.rotation.z = p.pitch;
    this.torso.scale.set(p.sx, p.sy, 1);
    this.head.rotation.z = p.headZ;
    this.head.position.set(HEAD_PIV.x + p.headX, HEAD_PIV.y, 0);
    const [eN, eF] = this.ears;
    eN.rotation.set(-p.earOutN, 0, -p.earBackN); eN.inner.rotation.y = p.earTwist;
    eF.rotation.set(p.earOutF, 0, -p.earBackF); eF.inner.rotation.y = -p.earTwist;
    this.hindN.rotation.z = p.hindN; this.hindF.rotation.z = p.hindF;
    this.frontN.rotation.z = p.frontN; this.frontF.rotation.z = p.frontF;
    const blink = this.blinker.update(this.dt, p.eyes > 0.5);
    const ey = Math.max(0.06, p.eyes * blink);
    this.eyes.scale.y = ey; this.eyeHl.scale.y = ey;
    const mo = Math.max(0.001, p.mouth);
    this.mouthO.scale.set(0.045 * mo, 0.05 * mo, 0.05 * mo);
    this.nose.position.y = 0.17 + 0.012 * nose;
    this.nose.scale.x = 0.7 + 0.1 * Math.abs(nose);
  }

  animate(dt, t) {
    this.dt = dt;
    const o = this.obj;
    this.model.rotation.y = this.facingCtl.update(dt, this.facing);
    if (o.power !== this.powerKey) { this.powerKey = o.power; this.bandanaMat.color.set(POWER_COLORS[o.power]?.Z ?? POWER_COLORS.none.Z); }
    const { state, pose, nose } = this.computePose(dt, t);
    const cur = this.blender.update(state, pose, dt);
    this.applyPose(cur, nose);
  }
}
