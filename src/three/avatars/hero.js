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
//    Nur Gelenke trennen Meshes. Heldin ≈ 25 Meshes (21 sichtbar, davon 6 Zopfglieder), Pflaume 14.
//  - Angel und Möhre gehören zum Hero-Avatar (die Hand hält sie). Die Möhre pendelt physikalisch aus
//    der Beschleunigung der Reiterin; Pflaume streckt beim Reiten die Nase nach vorn-oben.
//  - Lottis Zöpfe hängen hinter den Ohren herab und sind je eine Kette aus drei Gliedern (je ein Mesh),
//    die eine Verlet-Kette in Weltkoordinaten (HangChain) führt: Schwerkraft, Luftwiderstand, Trägheit
//    aus der Bewegung der Aufhängung, Kollider für Kopf und Schultern. Keine Posenwerte, reine Physik –
//    deshalb wehen sie beim Laufen nach hinten, fliegen beim Fallen hoch, strömen im Sturzflug zu den
//    Füßen (Figur steht Kopf) und hüpfen beim Reiten mit.
//  - Beim Reiten liegt der Fußpunkt der Heldin 0,75 Einheiten über Pflaumes Fußpunkt; die Reitpose senkt
//    das Becken um 0,28, so dass die Hüfte auf Pflaumes Rücken (≈0,95 über seinen Pfoten) sitzt und die
//    Beine seitlich am Körper herabhängen. Der Hoppel-Takt wird von der Reiterin vorgegeben
//    (ridePhase) und vom Kaninchen übernommen, damit beide synchron wippen.
//
// Kurs-Modus (3D-Kurs, Vertrag docs/KURS-ARCHITEKTUR.md „Spielfigur-Darstellung“):
//  - avatar.setCourseMode(true|false). An: Modell blickt nach +X, keine eigene Blickrichtung/Kameraneigung,
//    flipX/angle/scale des Objekts werden ignoriert; Position, Gier (root.rotation.y = yaw) und Größe (Hülle:
//    1,5 Einheiten → 1,0 m groß bzw. 0,7 m klein) setzt der Kurs-Code. Je Bild obj.course befüllen, dann
//    animate(dt, t) aufrufen (sync() fasst root im Kurs-Modus nicht an). Aus: exakt das Klassik-Verhalten.
//  - HeroAvatar: obj.course = { state, speed (m/s waagerecht), vy (m/s, > 0 steigt), grounded, phase (0..1),
//    power ('none'|'krallen'|'funken'|'riese'|'stern'), big, holding (false | true/'front' | 'over'), climbing }.
//    state: idle | walk | run (Takt aus speed, gemeinsame Schrittphase) | skid (Figur behält die alte Blickrichtung,
//    lehnt sich zurück) | jump (vy < 0: Beine zur Landung) | jump2 | jump3 (Salto vorwärts, Drehung phase 0,06…0,78,
//    ab 0,74 „Ta-da“) | backflip (Drehung 0,05…0,85) | sideflip (um die Blickachse, Kopf zur rechten Seite +Z,
//    0,05…0,85) | longjump (flach; vy < 0 senkt die Beine) | fall | land (kurz; Einfedern über die Zeit seit
//    Zustandsbeginn) | crouch | slide (Po-Rutschen) | groundpound (phase < 0,3 Salto-Einrollen, danach Sturz Po
//    voran; grounded = true → Aufprall) | wallslide (Wand HINTER der Figur, −X, am Hitbox-Rand 0,3 m; yaw = Richtung
//    der Wandnormalen) | walljump | climb (Wand VOR der Figur, +X, 0,3 m; Takt aus |vy|) | beanstalk (Rankenachse
//    0,25 m vor root, Radius ≈ 0,1 m; Takt aus |vy|) | swim (Wasserlinie 0,5 m über root bei groß; speed 0 →
//    Wassertreten, ab ~2,5 m/s Brustschwimmen) | ride (auf Pflaume inkl. Angel; Fußpunkt 0,5 m über Pflaumes) |
//    pipe | hurt | dead (dreht sich) | victory | throw | claw (beide über phase, sonst 0,3 s ab Zustandsbeginn; die
//    Beine laufen nach speed/grounded/vy weiter). `climbing: true` erzwingt 'climb', außer in Wand-/Rankenzuständen.
//    Unbekannte Zustände → idle. Lage-Anker in Metern: HeroAvatar.courseAnchors(big).
//    Saltos folgen phase exakt (eigene, nicht überblendete Drehkanäle um den Schwerpunkt, 0,52 m über root); danach
//    dreht die Figur über den kürzeren Weg zurück. Alle übrigen Wechsel blendet der PoseBlender weich über.
//  - PflaumeAvatar: obj.course = { state, speed, vy, grounded, power ('none'|'red'|'blue'|'yellow' → Halstuch),
//    gear ('lamp' → Stirnlampe mit leuchtender Linse + Rucksack), rider (HeroAvatar beim Reiten → gleicher Takt) };
//    state: idle | walk | run | jump | ride | paddle (Blatt-Floß, root = Wasseroberfläche) | dig | victory.
//  - Kostüme: 'krallen' = Krallen-Anzug (Kapuze mit runden Öhrchen und Pastellstreifen, Tatzen-Handschuhe mit
//    Krallen, Ringelschweif), 'funken' = Feuer-Kleid (Kleid feuerweiß, Ärmel/Kragen rot, Haarschmuck), 'stern' =
//    Regenbogen-Glanz (eigene Materialkopien), 'riese' = nichts. Kostüme tauschen nur Geometrie/Material vorhandener
//    Meshes (0 zusätzliche Zeichenaufrufe); Pflaumes Ausrüstung +4 (Lampe, Linse, Leuchthof, Rucksack), Floß +2.
//  - Arme mit Ellbogen: Im Kurs-Modus ersetzen zwei SkinnedMeshes (Ober-/Unterarm, Hand/Handschuh) die starren Arme
//    (gleiche Zahl Zeichenaufrufe). Die Arme sind kurz (Hand höchstens auf Kinnhöhe) – „Arme hoch“ heißt deshalb
//    seitlich abgespreizt, was aus der Kurs-Kamera (hinten oben) als erhobene Arme liest.
//  - Gretas Haar pendelt im Kurs-Modus physikalisch (eine Kette in Weltkoordinaten, Grenzkegel im Kopf-System),
//    Lottis Zöpfe wie bisher; mit Kapuze weichen die Zöpfe einem größeren Kopf-Kollider aus.

import * as THREE from 'three';
import { Avatar3D } from '../Avatar3D.js';
import { POWER_COLORS } from '../../gfx/palette.js';
import { GAME, HERO } from '../../config.js';
import {
  TAU, damp, clamp, mat, lineMat, geo, sphere, capsule, cylinder, cone, torus, unitSphere,
  mesh, limb, placed, dirAE, mergeTinted, mergePlain, mergeColored, vcolMat, buildEyes, Facing, PoseBlender, Blinker,
  HangChain, lerp, smoothstep, basicMat, wrapAngle, legIK, skinTwoBones, RainbowGlow,
} from '../lib/figures.js';

const U = 1 / GAME.tile;             // Weltpixel → Einheiten
const BIAS = 0.42;                   // Drehung zur Kamera (3/4-Ansicht), für Heldin und Pflaume gleich
const RUN_SPEED = HERO.runSpeed * U; // ≈ 7,8 Einheiten/s
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const UP = new THREE.Vector3(0, 1, 0);
const DOWN = new THREE.Vector3(0, -1, 0);
const _v = new THREE.Vector3();
const _p = new THREE.Vector3(), _s = new THREE.Vector3();
const _q = new THREE.Quaternion(), _qi = new THREE.Quaternion();
const _e = new THREE.Euler();

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
    // Haarzug je Seite: flache Wulst auf der Kappe vom Scheitel hinter das Ohr, darunter der Zopfansatz
    const capC = V(HEAD_C.x - 0.055, HEAD_C.y + 0.025, 0);
    for (const s of [1, -1]) {
      const d = dirAE(s * 2.05, 0.3);
      parts.push([unitSphere(), st.hair, placed(capC.clone().addScaledVector(d, 0.325 - 0.014), d, V(0.065, 0.12, 0.03))]);
      parts.push(part(sphere(0.058, 12, 10), st.hair, { x: BRAID.anchor.x, y: BRAID.anchor.y + 0.01, z: s * BRAID.anchor.z, sy: 1.15 }));
    }
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

/**
 * Zopf (Lotti): Kette aus drei Gliedern, hängt am Ansatz hinter dem Ohr. Die Oberfläche ist ein
 * geflochtener Strang: zwei um 180° versetzte Wülste, die sich spiralig um die Achse drehen, mit
 * zusätzlicher Verdickung je Strang dort, wo er vorn/hinten liegt (versetzte Flechtwülste, flache
 * Seiten wie bei einem echten Zopf). Vertexfarben: Kämme hell, Rinnen dunkel. Das letzte Glied trägt
 * das rote Haargummi und eine aufgefächerte Quaste aus hellen Spitzen. Maße relativ zum Glied-Drehpunkt.
 */
const BRAID = {
  anchor: V(HEAD_C.x - 0.09, HEAD_C.y - 0.01, 0.29), // Ansatz hinter dem Ohr, knapp in der Kappe (z je Seite ±)
  links: [0.12, 0.11, 0.10],   // Gliedlängen → Zopfkörper 0,33 (+ Haargummi 0,04 + Quaste ≈ 0,09)
  r0: 0.045, r1: 0.034,        // Radius oben / am Haargummi
  twist: 46,                   // rad je Einheit: Drehung der Wülste um die Achse
  lobe: 0.66, q: 0.6,          // Tiefe und Rundung der Rinne zwischen den Strängen
  bump: 0.10,                  // Verdickung je Strang vorn/hinten
  overlap: 0.03,               // jedes Glied steckt oben im vorigen
  tie: 0.04,                   // Haargummi
};
const BRAID_LEN = BRAID.links.reduce((a, b) => a + b, 0);

/** Geometrie eines Zopfglieds (geteilt je Variante, Glied und Seite; side spiegelt die Drehrichtung). */
function braidLinkGeo(st, k, side) {
  return geo(`hero:braid:${st.hair}:${k}:${side}`, () => {
    const len = BRAID.links[k], y0 = BRAID.links.slice(0, k).reduce((a, b) => a + b, 0);
    const rings = 16, segs = 16, period = TAU / BRAID.twist;
    const base = new THREE.Color(st.hair);
    const pos = [], uv = [], col = [], idx = [];
    for (let i = 0; i <= rings; i++) {
      const yl = BRAID.overlap - (len + BRAID.overlap) * (i / rings); // lokal: +overlap … -len
      const yg = y0 - yl;                                              // Abstand vom Ansatz (nach unten)
      let R = lerp(BRAID.r0, BRAID.r1, clamp(yg / BRAID_LEN, 0, 1));
      if (yl > 0) R *= 1 - 0.35 * (yl / BRAID.overlap);               // oben einziehen (steckt im Elternglied)
      const psi = side * BRAID.twist * yg;
      for (let j = 0; j < segs; j++) {
        const th = (j / segs) * TAU;
        const c = Math.cos(th - psi);
        const lobe = Math.pow(Math.abs(c), BRAID.q);
        const bump = Math.cos((TAU * yg) / period) * c;
        const r = R * (BRAID.lobe + (1 - BRAID.lobe) * lobe) * (1 + BRAID.bump * bump);
        pos.push(r * Math.sin(th), yl, r * Math.cos(th));
        uv.push(j / segs, i / rings);
        const shade = 0.74 + 0.38 * lobe + 0.12 * bump;
        col.push(base.r * shade, base.g * shade, base.b * shade);
      }
    }
    for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) {
      const a = i * segs + j, b = i * segs + ((j + 1) % segs), c = a + segs, d = b + segs;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    if (k < BRAID.links.length - 1) return g;
    // Letztes Glied: Haargummi quer über das Zopfende, darunter die Quaste (fünf Strähnen + Mittelbüschel)
    const yTie = -len - BRAID.tie / 2, yT = -len - BRAID.tie;
    const parts = [[g, null, null], part(cylinder(0.044, 0.040, BRAID.tie, 12), st.accent, { y: yTie })];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + 0.3, tilt = 0.34;
      const d = V(Math.sin(tilt) * Math.cos(a), -Math.cos(tilt), Math.sin(tilt) * Math.sin(a));
      parts.push([unitSphere(), st.hairTip, placed(V(0, yT + 0.005, 0).addScaledVector(d, 0.05), d, V(0.021, 0.021, 0.056))]);
    }
    parts.push(part(unitSphere(), st.hairTip, { y: yT - 0.035, sx: 0.03, sy: 0.05, sz: 0.03 }));
    const merged = mergeColored(parts);
    g.dispose();
    return merged;
  });
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
    part(torus(0.1, 0.045, 8, 16), st.collar ?? WHITE_C, { y: SHOULDER_Y + 0.05, rx: Math.PI / 2 }),
    part(sphere(0.085, 12, 10), st.sleeve, { y: SHOULDER_Y, z: 0.2 }),
    part(sphere(0.085, 12, 10), st.sleeve, { y: SHOULDER_Y, z: -0.2 }),
  ];
  if (st.apron) parts.push(part(unitSphere(), st.apronC ?? WHITE_C, { x: 0.125, y: 0.29, sx: 0.035, sy: 0.085, sz: 0.085 }));
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
    parts.push(part(geo('apron', () => new THREE.LatheGeometry(ap.map(([r, y]) => new THREE.Vector2(r, y)), 8, Math.PI / 2 - 0.95, 1.9)), st.apronC ?? WHITE_C));
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
  // nur Kurs-Modus (im Klassik-Modus immer 0): Ellbogen, Oberarm-Drehung (Beugerichtung), Rumpf seitlich/
  // verdreht, Lage der ganzen Figur um den Schwerpunkt (pitch um Z, roll um X), Versatz, Stauchung
  elbowN: 0, elbowF: 0, twistN: 0, twistF: 0, torsoX: 0, torsoY: 0, pitch: 0, roll: 0, figX: 0, figY: 0, sq: 0,
};

// ================================================================== Kurs-Modus: Maße, Kostüme
// 1,5 Avatar-Einheiten = 1,0 m (groß) bzw. 0,7 m (klein); die Hülle skaliert der Kurs-Code.
const PIVOT_Y = 0.78;   // Drehpunkt für Saltos und Körperlage (Schwerpunkt, Einheiten über dem Fußpunkt)
const ELBOW_Y = 0.13;   // Ellbogen unter der Schulter (Kurs-Arme)
const ANKLE_H = 0.14;   // Knöchel über der Sohle bei waagerechtem Stiefel
const unitsPerMeter = (big) => 1.5 / (big === false ? 0.7 : 1.0);
// Kontaktmaße (Einheiten, Fußpunkt = root, Blick +X) – per tests/coursepose3d.mjs nachgemessen:
const WS_REACH = 0.393;   // wallslide: so weit reichen Hand/Sohle/Rock hinter root (−X) ohne Versatz
const CL_REACH = 0.394;   // climb: so weit reichen die Hände vor root (+X) ohne Versatz
const BS_REACH = 0.437;   // beanstalk: Rankenachse liegt ohne Versatz so weit vor root
const VINE_M = 0.25;     // beanstalk: Rankenachse vor root (Meter, Vertrag mit dem Motor)
const WATER_U = 0.75;    // swim: Wasserlinie über root (Einheiten; groß 0,5 m)
const SWIM_Y0 = -0.12, SWIM_Y1 = -0.05; // swim: Höhenversatz Wassertreten / Brustschwimmen (Hals knapp über der Wasserlinie)
const CREAM_C = '#fff3df', PAD_C = '#ff9cb6', CLAW_C = '#fffdf8';
const FIRE_WHITE = '#fff8ee', FIRE_RED = '#e8392d';
/** Farbe zur Creme hin aufhellen (Pastell-Streifen). */
const pastel = (hex, k = 0.62) => `#${new THREE.Color(hex).lerp(new THREE.Color(CREAM_C), k).getHexString()}`;
/** Zustände, in denen die Heldin an Wand/Ranke hängt (das Feld `climbing` erzwingt sonst 'climb'). */
const CLIMB_STATES = new Set(['climb', 'beanstalk', 'wallslide', 'walljump']);
/** Zustände, in denen `holding` die Arme übernimmt (Tragen vorn bzw. über dem Kopf). */
const HOLD_STATES = new Set(['idle', 'walk', 'run', 'skid', 'jump', 'jump2', 'fall', 'land', 'crouch']);

/** Kostüm-Farben „Funkenblüte“: Kleid feuerweiß, Ärmel/Kragen/Schürze rot, Haarschmuck weiß (Lotti) bzw. rot (Greta). */
const fireStyle = (st) => ({ ...st, dress: FIRE_WHITE, sleeve: FIRE_RED, collar: FIRE_RED, apronC: FIRE_RED, accent: st.braids ? FIRE_WHITE : FIRE_RED });

/** Kurs-Arm (Ober- und Unterarm mit Ellbogen, eine SkinnedMesh): Röhre + Kappen, Hand/Handschuh, ggf. Peace-Finger. */
function courseArmGeo(st, kind) {
  return geo(`hero:carm:${kind}:${kind === 'glove' ? st.dress : ''}`, () => {
    const parts = [
      part(geo('carm:tube', () => new THREE.CylinderGeometry(0.05, 0.05, ARM, 10, 12, true)), SKIN_C, { y: -ARM / 2 }),
      part(geo('carm:capT', () => new THREE.SphereGeometry(0.05, 10, 5, 0, TAU, 0, Math.PI / 2)), SKIN_C),
      part(geo('carm:capB', () => new THREE.SphereGeometry(0.05, 10, 5, 0, TAU, Math.PI / 2, Math.PI / 2)), SKIN_C, { y: -ARM }),
    ];
    if (kind === 'glove') parts.push(...gloveParts(st));
    else parts.push(part(sphere(0.065, 12, 10), SKIN_C, { y: -HAND }));
    if (kind === 'peace') {
      // Zeige- und Mittelfinger als V, in Verlängerung des Unterarms
      for (const s of [1, -1]) {
        const d = V(0.1, -1, s * 0.42).normalize();
        parts.push([capsule(0.019, 0.05, 3, 6), SKIN_C, new THREE.Matrix4().compose(V(0, -HAND, 0).addScaledVector(d, 0.078), new THREE.Quaternion().setFromUnitVectors(UP, d), V(1, 1, 1))]);
      }
    }
    return skinTwoBones(mergeTinted(parts), -ELBOW_Y + 0.04, -ELBOW_Y - 0.05);
  });
}

/** Tatzen-Handschuh (Krallen-Anzug, arm-lokal): Fäustling in Kleidfarbe, Bündchen, Ballen, Zehenballen, drei Krallen. */
function gloveParts(st) {
  const H = -HAND;
  const parts = [
    part(sphere(0.08, 14, 10), st.dress, { y: H - 0.006, sy: 1.08 }),
    part(torus(0.056, 0.021, 6, 14), CREAM_C, { y: H + 0.066, rx: Math.PI / 2 }),
    [unitSphere(), PAD_C, placed(V(0.074, H - 0.014, 0), V(1, 0, 0), V(0.034, 0.032, 0.013))],
  ];
  for (const z of [-0.034, 0, 0.034]) {
    parts.push([unitSphere(), PAD_C, placed(V(0.056, H - 0.06, z), V(0.7, -0.7, 0), V(0.016, 0.016, 0.009))]);
    parts.push(part(cone(0.011, 0.036, 6), CLAW_C, { x: 0.036, y: H - 0.09, z, rz: Math.PI + 0.45 }));
  }
  return parts;
}

// Kapuze des Krallen-Anzugs: Kugelschale über Kopf und Hinterkopf mit Gesichtsöffnung (Rand vorn hoch, an
// den Seiten auf Ohrhöhe, hinten bis in den Nacken), Bündchen-Wulst, runde Öhrchen, quer laufende Streifen.
const HOOD_C = V(HEAD_C.x - 0.035, HEAD_C.y + 0.025, 0), HOOD_R = 0.352;
const hoodRim = (az) => { const f = Math.cos(az); return f >= 0 ? 0.1 + 0.6 * f : 0.1 + 0.8 * f * f * f; };
function hoodShellGeo() {
  return geo('hood:shell', () => {
    const nA = 40, nE = 12, pos = [], nor = [], uv = [], idx = [];
    for (let i = 0; i <= nA; i++) {
      const az = (i / nA) * TAU, e0 = hoodRim(az);
      for (let j = 0; j <= nE; j++) {
        const d = dirAE(az, lerp(e0, Math.PI / 2, j / nE));
        pos.push(HOOD_C.x + d.x * HOOD_R, HOOD_C.y + d.y * HOOD_R, d.z * HOOD_R);
        nor.push(d.x, d.y, d.z); uv.push(i / nA, j / nE);
      }
    }
    for (let i = 0; i < nA; i++) for (let j = 0; j < nE; j++) {
      const a = i * (nE + 1) + j, b = a + nE + 1;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  });
}
function hoodParts(st) {
  const stripe = pastel(st.dress);
  const parts = [part(hoodShellGeo(), st.dress)];
  // Bündchen am Rand
  const rim = [];
  for (let i = 0; i < 48; i++) { const az = (i / 48) * TAU; rim.push(HOOD_C.clone().addScaledVector(dirAE(az, hoodRim(az)), HOOD_R + 0.004)); }
  parts.push(part(geo('hood:rim', () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rim, true), 64, 0.026, 6, true)), CREAM_C));
  // Streifen: flache Bänder quer über den Hinterkopf (Ebenen x = konst.), enden über dem Rand
  for (const dx of [-0.06, -0.165, -0.265]) {
    const rr = Math.sqrt(HOOD_R * HOOD_R - dx * dx) + 0.002;
    let g = 0;
    for (let a = 0; a < Math.PI; a += 0.02) {
      const d = V(dx, rr * Math.cos(a), rr * Math.sin(a)).normalize();
      if (Math.asin(d.y) < hoodRim(Math.atan2(d.z, d.x)) + 0.1) break;
      g = a;
    }
    const m = new THREE.Matrix4().makeTranslation(HOOD_C.x + dx, HOOD_C.y, 0)
      .multiply(new THREE.Matrix4().makeRotationY(-Math.PI / 2))
      .multiply(new THREE.Matrix4().makeScale(1, 1, 2.4))
      .multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2 - g));
    parts.push([torus(rr, 0.014, 5, 28, 2 * g), stripe, m]);
  }
  // runde Öhrchen (außen Kleidfarbe, innen creme), leicht nach vorn-außen gedreht
  for (const s of [1, -1]) {
    const c = HOOD_C.clone().addScaledVector(dirAE(s * 1.3, 0.92), HOOD_R + 0.035);
    const n = dirAE(s * 0.7, 0.1);
    parts.push([unitSphere(), st.dress, placed(c, n, V(0.135, 0.128, 0.058))]);
    parts.push([unitSphere(), PAD_C, placed(c.clone().addScaledVector(n, 0.034), n, V(0.085, 0.08, 0.022))]);
  }
  // kleine Schleife in Akzentfarbe vorn neben dem nahen Ohr
  const bc = HOOD_C.clone().addScaledVector(dirAE(0.78, 0.62), HOOD_R + 0.012), bn = dirAE(0.78, 0.62);
  const bow = placed(bc, bn, V(1, 1, 1));
  for (const s of [1, -1]) parts.push([unitSphere(), st.accent, bow.clone().multiply(new THREE.Matrix4().compose(V(s * 0.062, 0, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, s * 0.35)), V(0.068, 0.044, 0.03)))]);
  parts.push([unitSphere(), st.accent, bow.clone().multiply(new THREE.Matrix4().makeScale(0.028, 0.028, 0.03))]);
  // Haar schaut vorn heraus (Pony), Lottis Zopfansätze unter dem Rand
  if (st.braids) {
    parts.push(part(fringeGeo(true, Math.PI - 1.05, 2.1), st.hair, { x: HEAD_C.x, y: HEAD_C.y }));
    for (const s of [1, -1]) parts.push(part(sphere(0.058, 12, 10), st.hair, { x: BRAID.anchor.x, y: BRAID.anchor.y + 0.01, z: s * BRAID.anchor.z, sy: 1.15 }));
  } else {
    parts.push(part(fringeGeo(false, Math.PI - 1.35, 2.2), st.hair, { x: HEAD_C.x, y: HEAD_C.y, rx: 0.42, rz: -0.05 }));
  }
  return parts;
}
/** Geringelter Puschelschweif am Rock (Krallen-Anzug), becken-lokal. */
function tailParts(st) {
  const ring = pastel(st.dress);
  return [[-0.29, -0.045, 0.07, st.dress], [-0.35, 0.0, 0.078, ring], [-0.4, 0.07, 0.08, st.dress], [-0.425, 0.15, 0.074, ring], [-0.425, 0.222, 0.06, CREAM_C]]
    .map(([x, y, r, c]) => part(sphere(r, 12, 10), c, { x, y }));
}

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
    this.skirtMesh = vmesh(key('skirt'), () => skirtParts(st), 0.6, true, THREE.DoubleSide);
    this.pelvis.add(this.skirtMesh);

    // Oberkörper (Mieder, Kragen, Ärmel in einem Mesh)
    this.torso = new THREE.Group();
    this.pelvis.add(this.torso);
    this.torsoMesh = vmesh(key('torso'), () => torsoParts(st), 0.6, true);
    this.torso.add(this.torsoMesh);

    // Arme: Schulter-Drehpunkt → Kapsel + Hand (ein Mesh); Hand-Position als leerer Knoten für die Angel
    const armGeo = geo('hero:arm', () => mergePlain([[capsule(0.05, ARM), new THREE.Matrix4().makeTranslation(0, -ARM / 2, 0)], [sphere(0.065, 12, 10), new THREE.Matrix4().makeTranslation(0, -HAND, 0)]]));
    const makeArm = (s) => {
      const sh = new THREE.Group();
      sh.rotation.order = 'ZYX'; // erst seitlich abspreizen (X), dann vor/zurück schwingen (Z)
      sh.position.set(0, SHOULDER_Y, s * SHOULDER_Z);
      sh.armMesh = mesh(armGeo, skin);
      sh.add(sh.armMesh);
      sh.hand = new THREE.Object3D(); sh.hand.position.y = -HAND; sh.add(sh.hand);
      this.torso.add(sh);
      return sh;
    };
    this.armN = makeArm(1); this.armF = makeArm(-1);

    // Kopf: Haut+Gesicht, Haare(+Schleife/Haarreif), Augen, Glanzpunkte, offener Mund
    this.head = new THREE.Group(); this.head.position.y = NECK_Y;
    this.torso.add(this.head);
    this.head.add(vmesh('hero:head', headParts, 0.6, true));
    this.hairMesh = vmesh(key('hair'), () => hairParts(st), 0.42, true);
    this.head.add(this.hairMesh);
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
      // Zöpfe: Anker hinter dem Ohr → Kette aus drei Gliedern (je ein Mesh); Lage je Bild aus der Physik.
      // Kollider (Kopf, beide Schultern) teilen sich beide Ketten; Weltlage je Bild in updateBraids.
      // Der Kopf-Kollider gilt erst ab dem zweiten Glied (das erste begrenzt der Wurzelkegel), sonst kann
      // ein über den Ansatz geschlagenes Glied zwischen Kollider und Abstandsbedingung hängen bleiben.
      this.braids = [];
      this.braidColliders = { head: { c: new THREE.Vector3(), r: 0.33, from: 1 }, shoulders: [1, -1].map(() => ({ c: new THREE.Vector3(), r: 0.125, from: 0 })) };
      for (const s of [1, -1]) {
        const anchor = new THREE.Group();
        anchor.position.set(BRAID.anchor.x, BRAID.anchor.y, s * BRAID.anchor.z);
        this.head.add(anchor);
        const links = [];
        let parent = anchor;
        BRAID.links.forEach((len, k) => {
          const link = new THREE.Group();
          if (k > 0) link.position.y = -BRAID.links[k - 1];
          const m = new THREE.Mesh(braidLinkGeo(st, k, s), vcolMat(0.45));
          m.castShadow = true;
          link.add(m);
          parent.add(link); links.push(link); parent = link;
        });
        // Physik: Schwerkraft 32 E/s² (etwas leichter als die Spielschwerkraft → weiches Pendeln), quadratischer
        // Luftwiderstand 0,4/E (Lauf 7,8 E/s → ~37° nach hinten; Fall ab ~9 E/s hebend, ≥ 15 E/s bis an die Waagerechte),
        // Dämpfung 4/s (ausgependelt nach ~1 s), Feder 40/s² zur Ruhelage, Streckfeder 120/s² (Biegesteifigkeit
        // des Strangs), Knick ≤ 40° je Gelenk. Wurzelkegel (Grenzwinkel von „unten“): nach hinten bis 16° über
        // die Waagerechte, vorn ≤ 35°, außen ≤ 80°, nach innen (zum Kopf) ≤ 12°.
        const chain = new HangChain(BRAID.links, {
          gravity: 32, drag: 0.4, damping: 4, stiffness: 40, straighten: 120, maxBend: 0.7,
          rootCone: { back: 1.85, front: 0.61, out: 1.4, inward: 0.21, zSign: s },
        });
        chain.colliders.push(this.braidColliders.head, ...this.braidColliders.shoulders);
        // Ruherichtungen (kopf-lokal): oben leicht nach hinten-außen, unten senkrecht
        const restLocal = [V(-0.12, -1, s * 0.3), V(-0.04, -1, s * 0.1), V(0, -1, s * 0.02)].map((v) => v.normalize());
        this.braids.push({ side: s, anchor, links, chain, restLocal });
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
    // Frisur (Lottis Zöpfe laufen physikalisch in updateBraids)
    if (this.mane) {
      const back = 0.12 + 0.9 * p.hairBack + 0.8 * Math.max(0, p.hairLift) - 0.25 * Math.min(0, p.hairLift);
      this.mane.rotation.z = -back;
      this.locks.rotation.z = -back * 0.45 + 0.1;
    }
  }

  animate(dt, t) {
    if (this.courseMode) { this.animateCourse(dt, t); return; }
    this.dt = dt;
    const o = this.obj;
    this.model.rotation.y = this.facingCtl.update(dt, this.facing);
    const { state, pose, dur, vx, mount, speed } = this.computePose(dt, t);
    const cur = this.blender.update(state, pose, dt, dur);
    this.applyPose(cur, t);
    if (this.braids) this.updateBraids(dt);

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

  /**
   * Zöpfe: Aufhängung und Kollider in Weltkoordinaten bestimmen (frische Matrizen nach applyPose),
   * Kette rechnen und die Glieder im jeweiligen Elternsystem ausrichten. Schwerkraft und Luftwiderstand
   * wirken in Weltkoordinaten – auch wenn die Figur Kopf steht (Sturzflug) oder sich umdreht.
   */
  updateBraids(dt) {
    this.torso.updateWorldMatrix(true, false);
    this.head.updateWorldMatrix(false, false);
    const col = this.braidColliders;
    col.head.c.set(HEAD_C.x - 0.03, HEAD_C.y + 0.03, 0).applyMatrix4(this.head.matrixWorld);
    col.shoulders[0].c.set(0, SHOULDER_Y, SHOULDER_Z).applyMatrix4(this.torso.matrixWorld);
    col.shoulders[1].c.set(0, SHOULDER_Y, -SHOULDER_Z).applyMatrix4(this.torso.matrixWorld);
    for (const b of this.braids) {
      b.anchor.updateWorldMatrix(false, false);
      b.anchor.matrixWorld.decompose(_p, _q, _s);
      const ch = b.chain;
      ch.frame.copy(_q);
      for (let i = 0; i < ch.n; i++) ch.rest[i].copy(b.restLocal[i]).applyQuaternion(_q);
      ch.update(_p, dt);
      // Weltrichtung je Glied → lokal zum Elternteil (dessen Weltdrehung wird mitgeführt)
      for (let i = 0; i < ch.n; i++) {
        _qi.copy(_q).invert();
        _v.copy(ch.dirs[i]).applyQuaternion(_qi);
        b.links[i].quaternion.setFromUnitVectors(DOWN, _v);
        _q.multiply(b.links[i].quaternion);
      }
    }
  }

  // ================================================================ Kurs-Modus (3D-Kurs, docs/KURS-ARCHITEKTUR.md)
  /**
   * Kurs-Anbindung in Metern (für den Motor): Wand bzw. Ranke liegen `wall`/`vine` vor bzw. hinter root
   * (Hitbox-Rand), Wasserlinie beim Schwimmen `waterLine` über root, Fußpunkt der Reiterin `rideHeight` über
   * Pflaumes Fußpunkt (beide Hüllen 1 m / 1,5 Einheiten), Salto-Drehpunkt `pivot` über root.
   */
  static courseAnchors(big = true) {
    const upm = unitsPerMeter(big);
    return { wall: 0.3, vine: VINE_M, vineRadius: 0.1, waterLine: WATER_U / upm, rideHeight: 0.5, pivot: PIVOT_Y / upm };
  }

  /**
   * Kurs-Modus an/aus. Im Kurs-Modus setzt der Avatar keine eigene Blickrichtung und keine Kameraneigung
   * (Modell blickt nach +X; Position, Gier und Größe setzt der Kurs-Code an root bzw. an einer Hülle), liest
   * `obj.course` statt der Sprite-Felder und ignoriert flipX/angle/scale. Aus: alles wie im Klassik-Spiel.
   */
  setCourseMode(on) {
    on = !!on;
    if (on === !!this.courseMode) return this;
    this.courseMode = on;
    if (on) this.ensureCourseRig();
    for (const sh of [this.armN, this.armF]) { sh.armMesh.visible = !on; sh.carm.visible = on; }
    if (!on) this.resetCourseLook();
    this.blender.state = null; // nächster Zustand blendet weich über
    this.cState = null;
    this.prevVx = null;
    return this;
  }

  /** Im Kurs-Modus ruft der Kurs-Code animate() direkt; läuft doch sync(), bleibt root unangetastet. */
  sync(dt, t) {
    if (this.courseMode) { this.animate(dt, t); return; }
    super.sync(dt, t);
  }

  /** Kurs-Teile beim ersten Einschalten anlegen: Arme mit Ellbogen (SkinnedMesh statt starrer Arme), Haarpendel. */
  ensureCourseRig() {
    if (this.cGeo) return;
    const st = STYLES[this.variant];
    for (const sh of [this.armN, this.armF]) {
      const b0 = new THREE.Bone(), b1 = new THREE.Bone();
      b1.position.y = -ELBOW_Y; b0.add(b1);
      const m = new THREE.SkinnedMesh(courseArmGeo(st, 'bare'), vcolMat(0.6));
      m.add(b0); m.bind(new THREE.Skeleton([b0, b1]));
      m.frustumCulled = false; m.visible = false;
      m.upper = b0; m.fore = b1;
      m.hand = new THREE.Object3D(); m.hand.position.y = -(HAND - ELBOW_Y); b1.add(m.hand);
      sh.add(m); sh.carm = m; sh.kind = 'bare';
    }
    this.cGeo = { hair: this.hairMesh.geometry, torso: this.torsoMesh.geometry, skirt: this.skirtMesh.geometry, hairMat: this.hairMesh.material };
    this.costume = 'none';
    this.spin = { x: 0, y: 0, z: 0 }; this.spinSet = { x: null, y: null, z: null };
    this.cState = null; this.cStateT = 0; this.climbPhase = 0; this.swimPhase = 0; this.gpLanded = false; this.gpT = 0;
    this.peace = false;
    this.glow = new RainbowGlow(this.model, { intensity: 0.32, flicker: 0.14 });
    if (this.mane) {
      // Gretas offenes Haar im Kurs-Modus physikalisch: ein Pendelglied in Weltkoordinaten (Saltos, Kopfüberlagen),
      // Grenzkegel im Kopf-System: nach hinten weit, nach vorn kaum (nie ins Gesicht), seitlich mäßig
      this.maneChain = new HangChain([0.42], { gravity: 32, drag: 0.5, damping: 5, stiffness: 22, rootCone: { back: 1.5, front: 0.12, out: 0.4, inward: 0.4 } });
      this.maneRest = V(-0.13, -1, 0).normalize();
    }
  }

  /** Beim Ausschalten: Kostüm, Glanz und alle nur im Kurs-Modus gesetzten Lagen zurück auf Klassik. */
  resetCourseLook() {
    this.glow.set(false);
    this.setCostume('none');
    this.fig.position.set(0, 0, 0);
    this.torso.rotation.set(0, 0, 0);
    this.model.rotation.set(0, 0, 0);
    this.model.scale.set(1, 1, 1);
    if (this.mane) { this.mane.rotation.set(0, 0, 0); this.locks.rotation.set(0, 0, 0); }
    this.spin.x = this.spin.y = this.spin.z = 0;
  }

  /** Kostüm per Geometrie-Tausch (keine zusätzlichen Zeichenaufrufe): 'krallen' | 'funken' | 'none'. */
  setCostume(kind) {
    if (!this.cGeo || kind === this.costume) return;
    this.costume = kind;
    const st = STYLES[this.variant], key = (k) => `hero:${this.variant}:${k}`, g = this.cGeo;
    if (kind === 'krallen') {
      this.hairMesh.geometry = geo(key('hood'), () => mergeTinted(hoodParts(st)));
      this.hairMesh.material = vcolMat(0.42, THREE.DoubleSide);
      this.torsoMesh.geometry = g.torso;
      this.skirtMesh.geometry = geo(key('skirt:krallen'), () => mergeTinted([...skirtParts(st), ...tailParts(st)]));
    } else if (kind === 'funken') {
      const fs = fireStyle(st);
      this.hairMesh.geometry = geo(key('hair:funken'), () => mergeTinted(hairParts(fs)));
      this.hairMesh.material = g.hairMat;
      this.torsoMesh.geometry = geo(key('torso:funken'), () => mergeTinted(torsoParts(fs)));
      this.skirtMesh.geometry = geo(key('skirt:funken'), () => mergeTinted(skirtParts(fs)));
    } else {
      this.hairMesh.geometry = g.hair; this.hairMesh.material = g.hairMat;
      this.torsoMesh.geometry = g.torso; this.skirtMesh.geometry = g.skirt;
    }
    // Zöpfe weichen der Kapuze aus
    if (this.braidColliders) this.braidColliders.head.r = kind === 'krallen' ? 0.37 : 0.33;
  }

  /** Hand-Varianten der Kurs-Arme: 'bare' | 'peace' | 'glove'. */
  setArmKinds(n, f) {
    const st = STYLES[this.variant];
    if (n !== this.armN.kind) { this.armN.kind = n; this.armN.carm.geometry = courseArmGeo(st, n); }
    if (f !== this.armF.kind) { this.armF.kind = f; this.armF.carm.geometry = courseArmGeo(st, f); }
  }

  animateCourse(dt, t) {
    this.dt = dt;
    const c = this.obj.course ?? {};
    const power = c.power ?? 'none';
    if (power !== 'stern') this.glow.set(false);
    this.setCostume(power === 'krallen' || power === 'funken' ? power : 'none');
    if (power === 'stern') this.glow.set(true);
    this.model.rotation.set(0, 0, 0);
    const { state, pose, dur } = this.coursePose(c, dt, t);
    const cur = this.blender.update(state, pose, dt, dur);
    this.applyPose(cur, t);
    this.applyCoursePose(cur);
    const glove = this.costume === 'krallen';
    this.setArmKinds(glove ? 'glove' : this.peace ? 'peace' : 'bare', glove ? 'glove' : 'bare');
    if (this.braids) this.updateBraids(dt);
    if (this.maneChain) this.updateMane(dt);
    this.umbrella.visible = false; this.leafOpen = 0;
    this.updateCourseRod(dt, c, this.cState === 'ride');
    this.glow.update(t);
  }

  /** Kurs-Felder der Pose anwenden: Ellbogen, Oberarm-Drehung, Rumpf, Figurlage um den Schwerpunkt, Stauchung. */
  applyCoursePose(p) {
    const dt = this.dt;
    this.armN.carm.fore.rotation.z = p.elbowN; this.armF.carm.fore.rotation.z = p.elbowF;
    this.armN.carm.upper.rotation.y = p.twistN; this.armF.carm.upper.rotation.y = p.twistF;
    this.torso.rotation.set(p.torsoX, p.torsoY, p.torso);
    // Salto-Kanäle (nicht überblendet): exakt aus phase, sonst über die kürzere Richtung zurück auf 0 (mod 2π)
    for (const k of ['x', 'y', 'z']) {
      const want = this.spinSet[k];
      this.spin[k] = want !== null ? want : damp(wrapAngle(this.spin[k]), 0, 14, dt);
    }
    _e.set(p.roll + this.spin.x, this.spin.y, p.pitch + this.spin.z, 'YXZ');
    this.fig.quaternion.setFromEuler(_e);
    _v.set(0, PIVOT_Y, 0).applyQuaternion(this.fig.quaternion);
    this.fig.position.set(p.figX - _v.x, PIVOT_Y - _v.y + p.figY, -_v.z);
    this.model.scale.set(1 + 0.5 * p.sq, 1 - p.sq, 1 + 0.5 * p.sq);
  }

  /** Gretas Haar (Kurs-Modus): Pendel in Weltkoordinaten, Ausrichtung im Kopf-System; Strähnen folgen halb. */
  updateMane(dt) {
    const ch = this.maneChain;
    this.head.updateWorldMatrix(true, false);
    this.head.matrixWorld.decompose(_p, _q, _s);
    _p.copy(this.mane.position).applyMatrix4(this.head.matrixWorld);
    ch.frame.copy(_q);
    ch.rest[0].copy(this.maneRest).applyQuaternion(_q);
    ch.update(_p, dt);
    _qi.copy(_q).invert();
    _v.copy(ch.dirs[0]).applyQuaternion(_qi);
    this.mane.quaternion.setFromUnitVectors(DOWN, _v);
    this.locks.quaternion.identity().slerp(this.mane.quaternion, 0.45);
  }

  /** Angel mit Möhre beim Reiten (Kurs): Lage aus der nahen Hand, Pendel aus der Beschleunigung (speed in m/s). */
  updateCourseRod(dt, c, riding) {
    if (riding !== this.rodVisible) { this.rodVisible = riding; this.rod.visible = riding; }
    if (!riding) { this.prevVx = null; this.swing.a *= 0.9; this.swing.w = 0; return; }
    this.torso.updateWorldMatrix(true, true);
    this.armN.carm.hand.getWorldPosition(_v);
    this.rod.position.copy(this.pelvis.worldToLocal(_v));
    const rodAngle = Math.PI / 2 - 0.52;
    this.rod.rotation.z = -rodAngle;
    const v = (c.speed ?? 0) * unitsPerMeter(c.big);
    const ax = this.prevVx === null ? 0 : clamp((v - this.prevVx) / Math.max(dt, 1e-3), -60, 60);
    this.prevVx = v;
    const sw = this.swing, L = 0.75, g = 30;
    const hopKick = v > 0.5 ? 6 * Math.cos(this.ridePhase) * this.rideSf : 0;
    sw.w += (-(g / L) * Math.sin(sw.a) - (ax / L) * Math.cos(sw.a) + hopKick) * dt - 2.0 * sw.w * dt;
    sw.a = clamp(sw.a + sw.w * dt, -0.6, 1.15);
    if (sw.a <= -0.6 || sw.a >= 1.15) sw.w *= 0.3;
    this.pendulum.rotation.z = rodAngle + sw.a;
  }

  /** Lauf-/Rennzyklus (geteilte Phase, damit walk ↔ run ohne Beinsprung überblenden). speed in m/s. */
  gait(speed, upm, dt, run) {
    const f = clamp((1.2 + 0.2 * speed) * (upm > 1.6 ? 1.15 : 1), 0.8, 3.8); // Doppelschritte je Sekunde
    this.runPhase += TAU * f * dt;
    const p = this.runPhase, s = Math.sin(p);
    if (!run) {
      const k = clamp(speed / 5, 0.2, 1);
      return {
        thighZn: 0.62 * k * s, thighZf: -0.62 * k * s,
        kneeN: 0.12 + 1.05 * k * Math.max(0, Math.cos(p + 0.5)), kneeF: 0.12 + 1.05 * k * Math.max(0, Math.cos(p + Math.PI + 0.5)),
        footN: 0.35 * k * Math.max(0, -s), footF: 0.35 * k * Math.max(0, s),
        armZn: 0.05 - 0.55 * k * s, armZf: 0.05 + 0.55 * k * s, armXn: -0.13, armXf: 0.13,
        elbowN: 0.3 + 0.35 * k * Math.max(0, -s), elbowF: 0.3 + 0.35 * k * Math.max(0, s),
        lean: -0.07 * k, bob: 0.035 * k * Math.abs(s) - 0.012 * k, torsoY: -0.1 * k * s,
        headZ: 0.07 * k + 0.02 * Math.cos(2 * p), headY: 0.05 * k * s,
        hairBack: 0.35 * k + 0.08 * Math.sin(2 * p), hairLift: 0.1 * k * Math.cos(2 * p),
      };
    }
    // Rennen: Vorlage, lange Schritte mit hohem Fersenschwung, Arme angewinkelt und kräftig pumpend
    const k = clamp(speed / 9, 0.35, 1.15), lean = -0.3 * k;
    return {
      thighZn: 0.95 * k * s - 0.8 * lean, thighZf: -0.95 * k * s - 0.8 * lean,
      kneeN: 0.2 + 1.75 * k * Math.max(0, Math.cos(p + 0.6)), kneeF: 0.2 + 1.75 * k * Math.max(0, Math.cos(p + Math.PI + 0.6)),
      footN: 0.6 * Math.max(0, -s), footF: 0.6 * Math.max(0, s),
      armZn: 0.3 - 0.85 * k * s, armZf: 0.3 + 0.85 * k * s, armXn: -0.22, armXf: 0.22,
      elbowN: 1.3 + 0.35 * Math.max(0, -s), elbowF: 1.3 + 0.35 * Math.max(0, s),
      lean, torso: -0.04, bob: 0.06 * k * Math.abs(s) - 0.02, torsoY: -0.2 * k * s,
      headZ: -0.85 * lean + 0.03 * Math.cos(2 * p), mouth: 0.35,
      hairBack: 0.85 * k + 0.12 * Math.sin(2 * p), hairLift: 0.2 * k * Math.cos(2 * p),
    };
  }

  poseIdle(t) {
    const br = Math.sin(t * 2.2);
    const look = Math.sin(t * 0.37) * smoothstep(Math.sin(t * 0.23) * 2); // ab und zu umschauen
    return { bob: 0.012 * br, torso: 0.015 * br, headX: 0.04 * Math.sin(t * 0.7), headY: 0.45 * look, headZ: 0.03 + 0.02 * br, hairLift: 0.03 * br, armZn: 0.1, armZf: 0.1, armXn: -0.14, armXf: 0.14, elbowN: 0.15, elbowF: 0.15 };
  }

  poseFall(t) {
    const fl = Math.sin(t * 9);
    return { armXn: -1.45, armXf: 1.45, armZn: 0.25 + 0.25 * fl, armZf: 0.25 - 0.25 * fl, elbowN: 0.3, elbowF: 0.3, thighZn: 0.45, thighZf: -0.15, kneeN: 0.55, kneeF: 0.35, footN: 0.3, footF: 0.3, eyes: 1.15, mouth: 0.6, hairLift: 0.9, hairBack: 0.3, lean: 0.04, headZ: -0.08 };
  }

  /** Erster Sprung; d = 0 (steigt) … 1 (sinkt, Beine strecken sich zur Landung). */
  poseJump(d) {
    return this.variant === 'greta'
      // Greta gestreckt: Arme schräg nach vorn-oben gespreizt, Beine in der Spreize
      ? { armZn: 2.3 - 0.5 * d, armZf: 2.35 - 0.5 * d, armXn: -0.7, armXf: 0.7, elbowN: 0.25, elbowF: 0.25, thighZn: 0.75 - 0.3 * d, thighZf: -0.45 + 0.3 * d, kneeN: 0.45, kneeF: 0.3 + 0.2 * d, footN: 0.9, footF: 0.9, lean: -0.05, headZ: 0.15, mouth: 0.9, hairLift: -0.5 + 0.9 * d, hairBack: 0.3 }
      // Lotti kraftvoll: Faust nach oben, anderer Arm zurück, Knie hoch
      : { armZn: 0.35, armXn: -2.0 + 0.5 * d, elbowN: 0.35, armZf: -0.55, armXf: 0.35, elbowF: 0.3, thighZn: 1.25 - 0.55 * d, kneeN: 1.55 - 0.8 * d, thighZf: -0.2 + 0.25 * d, kneeF: 0.5, footN: 0.6, footF: 0.75, lean: -0.04, headZ: 0.18, mouth: 0.9, hairLift: -0.35 + 0.8 * d, hairBack: 0.3 };
  }

  /** Grundpose für Aktionen, die nur den Oberkörper übernehmen (Werfen, Krallenhieb): Stand, Lauf oder Luft. */
  poseLoco(speed, upm, dt, t, grounded, vy) {
    if (!grounded) return vy > 0 ? this.poseJump(0.3) : this.poseFall(t);
    if (speed > 0.5) return this.gait(speed, upm, dt, speed > 7.5);
    return this.poseIdle(t);
  }

  /** Tragen: Arme vorn (true/'front') bzw. über dem Kopf ('over'), Unterarme umfassen die Last. */
  holdArms(pose, holding) {
    if (holding === 'over' || holding === 'head') Object.assign(pose, { armZn: 0.2, armZf: 0.2, armXn: -1.35, armXf: 1.35, elbowN: 1.7, elbowF: 1.7, twistN: -1.57, twistF: 1.57 });
    else Object.assign(pose, { armZn: 1.3, armZf: 1.3, armXn: 0.04, armXf: -0.04, elbowN: 0.5, elbowF: 0.5, twistN: 0.95, twistF: -0.95 });
  }

  /**
   * Zielpose aus obj.course. Zustände und Felder: siehe Kopfkommentar „Kurs-Modus“ unten in dieser Datei.
   * Saltos setzen this.spinSet exakt aus phase; alles andere geht durch den PoseBlender.
   */
  coursePose(c, dt, t) {
    let state = c.state ?? 'idle';
    if (c.climbing && !CLIMB_STATES.has(state)) state = 'climb';
    if (state !== this.cState) { this.cState = state; this.cStateT = 0; } else this.cStateT += dt;
    const st = this.cStateT;
    const speed = Math.max(0, c.speed ?? 0), vy = c.vy ?? 0, phase = clamp(c.phase ?? 0, 0, 1);
    const grounded = c.grounded ?? true;
    const upm = unitsPerMeter(c.big);
    const greta = this.variant === 'greta';
    const P = (o) => this.blender.pose(o);
    const S = this.spinSet; S.x = S.y = S.z = null;
    this.peace = false;
    if (state !== 'groundpound') this.gpLanded = false;
    let label = state, dur = 0.16, pose;
    // Beine per IK auf den Boden stellen (Beckenhöhe aus bob, Knöchel-Ziele vor/hinter der Hüfte, Fuß waagerecht + Zusatz)
    const plant = (o, xn, xf, extraN = 0, extraF = 0) => {
      const hipY = HIP + (o.bob ?? 0), lean = o.lean ?? 0;
      const n = legIK(THIGH, SHIN, hipY, xn, ANKLE_H, lean), f = legIK(THIGH, SHIN, hipY, xf, ANKLE_H, lean);
      return Object.assign(o, { thighZn: n.thigh, kneeN: n.knee, footN: n.foot + extraN, thighZf: f.thigh, kneeF: f.knee, footF: f.foot + extraF });
    };

    switch (state) {
      case 'walk': case 'run':
        pose = P(this.gait(speed, upm, dt, state === 'run'));
        dur = 0.2;
        break;
      case 'skid': {
        // Schleudern: in alter Laufrichtung, gegen die Bewegung zurückgelehnt, vorderes Bein stemmt (Ferse), Arme weit
        const o = { lean: 0.36, torso: 0.1, torsoY: 0.2, bob: -0.12 + 0.008 * Math.sin(t * 45), armZn: 0.65, armZf: 0.4, armXn: -1.3, armXf: 1.3, elbowN: 0.25, elbowF: 0.3, headZ: -0.12, headX: 0.06, mouth: 0.75, eyes: 1.2, hairBack: -0.25, hairLift: 0.1 };
        pose = P(plant(o, 0.3, -0.06, -0.45, 0.15));
        dur = 0.1;
        break;
      }
      case 'jump':
        pose = P(this.poseJump(clamp(-vy / 6, 0, 1)));
        dur = 0.1;
        break;
      case 'jump2': {
        // zweiter Sprung: beide Arme hoch im V, beide Knie angezogen
        const d = clamp(-vy / 6, 0, 1);
        pose = P({ armZn: 0.35, armZf: 0.35, armXn: -1.9 + 0.4 * d, armXf: 1.9 - 0.4 * d, elbowN: 0.3, elbowF: 0.3, thighZn: 1.15 - 0.45 * d, thighZf: 0.85 - 0.35 * d, kneeN: 1.7 - 0.8 * d, kneeF: 1.5 - 0.7 * d, footN: 0.7, footF: 0.7, lean: 0.02, headZ: 0.25, mouth: 1, eyes: 1.1, hairLift: -0.4 + 0.8 * d });
        dur = 0.1;
        break;
      }
      case 'jump3': {
        // Dreifachsprung: Salto vorwärts gestreckt (Arme seitlich, Beine geschlossen), am Ende „Ta-da“ (Arme im V)
        const f = smoothstep((phase - 0.06) / 0.72);
        S.z = -TAU * f;
        const pre = 1 - smoothstep(phase / 0.1), tada = smoothstep((phase - 0.74) / 0.18);
        pose = P({
          armXn: lerp(lerp(-1.5, -0.3, pre), -1.95, tada), armXf: lerp(lerp(1.5, 0.3, pre), 1.95, tada), armZn: lerp(lerp(0.05, -0.6, pre), 0.25, tada), armZf: lerp(lerp(0.05, -0.6, pre), 0.25, tada),
          elbowN: lerp(0.1, 0.25, tada), elbowF: lerp(0.1, 0.25, tada),
          thighZn: lerp(0.05, 0.55, tada) + 0.3 * pre, thighZf: lerp(-0.05, -0.1, tada), thighXn: 0.05, thighXf: -0.05,
          kneeN: lerp(0.05, 0.85, tada) + 0.5 * pre, kneeF: lerp(0.05, 0.2, tada) + 0.4 * pre, footN: lerp(1.0, 0.5, tada), footF: lerp(1.0, 0.6, tada),
          headZ: lerp(-0.15, 0.22, tada), mouth: lerp(0.7, 1, tada), eyes: 1.05, hairLift: -0.3,
        });
        dur = 0.08;
        break;
      }
      case 'backflip': {
        // Rückwärtssalto: Arme reißen hoch, Hohlkreuz → Hocke (Hände an den Schienbeinen) → öffnen zur Landung
        const f = smoothstep((phase - 0.05) / 0.8);
        S.z = TAU * f;
        const tuck = Math.pow(Math.sin(Math.PI * clamp((phase - 0.1) / 0.7, 0, 1)), 0.8), open = smoothstep((phase - 0.78) / 0.2), early = 1 - smoothstep(phase / 0.2);
        pose = P({
          armZn: lerp(lerp(0.6, 1.15, tuck), 0.5, open), armZf: lerp(lerp(0.6, 1.1, tuck), 0.5, open), armXn: lerp(lerp(-1.9, -0.3, tuck), -1.2, open), armXf: lerp(lerp(1.9, 0.3, tuck), 1.2, open),
          elbowN: lerp(0.2, 1.25, tuck), elbowF: lerp(0.2, 1.25, tuck),
          thighZn: lerp(0.1, 1.95, tuck), thighZf: lerp(0.0, 1.9, tuck), kneeN: lerp(0.25, 2.25, tuck), kneeF: lerp(0.35, 2.2, tuck), footN: 0.6, footF: 0.6,
          lean: 0.25 * early, headZ: 0.35 * early - 0.15 * tuck, eyes: 1.1, mouth: 0.8, hairLift: -0.2,
        });
        dur = 0.08;
        break;
      }
      case 'sideflip': {
        // Seitwärtssalto um die Blickachse (Kopf zur rechten Seite, +Z): Stern-Haltung, Mitte leicht gehockt
        const f = smoothstep((phase - 0.05) / 0.8);
        S.x = TAU * f;
        const mid = Math.sin(Math.PI * f), end = smoothstep((phase - 0.8) / 0.2);
        pose = P({
          armXn: lerp(-1.65, -0.6, end), armXf: lerp(1.65, 0.6, end), armZn: 0.2, armZf: 0.2, elbowN: 0.15, elbowF: 0.15,
          thighXn: lerp(-0.32, -0.05, end), thighXf: lerp(0.32, 0.05, end), thighZn: 0.25 * mid, thighZf: 0.15 * mid,
          kneeN: 0.15 + 0.6 * mid, kneeF: 0.15 + 0.5 * mid, footN: 0.8, footF: 0.8,
          headX: 0.25 * mid, eyes: 1.1, mouth: 0.9, hairLift: -0.2,
        });
        dur = 0.08;
        break;
      }
      case 'longjump': {
        // Weitsprung „Superheldin“: Körper flach nach vorn, Arme gestreckt voraus, Beine lang, Zehen gespitzt
        const drop = clamp(-vy / 8, 0, 1);
        pose = P({
          pitch: -1.3 + 0.32 * drop, armZn: 2.95, armZf: 2.8, armXn: -0.08, armXf: 0.12, elbowN: 0.05, elbowF: 0.15,
          thighZn: -0.05 + 0.25 * drop, thighZf: -0.15 + 0.15 * drop, kneeN: 0.15 + 0.3 * drop, kneeF: 0.35, footN: 1.0, footF: 1.0,
          headZ: 0.95 - 0.25 * drop, mouth: 0.8, eyes: 1.1, hairBack: 1.2, hairLift: -0.3,
        });
        dur = 0.12;
        break;
      }
      case 'fall':
        pose = P(this.poseFall(t));
        dur = 0.2;
        break;
      case 'land': {
        // kurzes Einfedern: Knie beugen, Arme federn seitlich, Stauchung klingt ab
        const d = 1 - smoothstep(st / 0.22);
        const o = { bob: -0.16 * d, lean: -0.15 * d, armXn: -0.12 - 0.45 * d, armXf: 0.12 + 0.45 * d, armZn: 0.1 + 0.3 * d, armZf: 0.1 + 0.3 * d, elbowN: 0.3, elbowF: 0.3, headZ: 0.12 * d, sq: 0.12 * d, hairLift: -0.2 * d };
        pose = P(plant(o, 0.05, -0.04));
        dur = 0.05;
        break;
      }
      case 'crouch': {
        const br = Math.sin(t * 2.6);
        const o = { bob: -0.2 + 0.006 * br, lean: -0.32, torso: -0.1, headZ: 0.38, armZn: 1.05, armZf: 0.95, armXn: -0.3, armXf: 0.3, elbowN: 0.55, elbowF: 0.55, sq: 0.02 };
        pose = P(plant(o, 0.07, -0.03));
        dur = 0.1;
        break;
      }
      case 'slide':
        // Po-Rutschen: sitzend, Beine voraus (Fersen am Boden), zurückgelehnt, Arme hinten-seitlich zur Balance
        pose = P({ bob: -0.26 + 0.006 * Math.sin(t * 40), lean: 0.42, torso: 0.05, headZ: -0.35, thighZn: 1.05, thighZf: 0.95, kneeN: 0.2, kneeF: 0.35, footN: -0.3, footF: -0.2, armZn: -0.75, armZf: -0.6, armXn: -0.85, armXf: 0.85, elbowN: 0.2, elbowF: 0.25, mouth: 0.75, eyes: 1.1, hairBack: 0.8 });
        dur = 0.12;
        break;
      case 'groundpound':
        if (grounded) {
          // Aufprall: gestaucht, Arme weit, federt nach
          if (!this.gpLanded) { this.gpLanded = true; this.gpT = 0; } else this.gpT += dt;
          const it = this.gpT, d = Math.exp(-it * 6);
          const o = { bob: -0.24 * d - 0.03, lean: -0.15 * d, armXn: -1.2, armXf: 1.2, armZn: 0.5, armZf: 0.5, elbowN: 0.3, elbowF: 0.3, headZ: 0.1, sq: 0.3 * Math.exp(-it * 9) * Math.cos(it * 18), eyes: 0.9, mouth: 0.8, hairLift: -0.4 * d };
          pose = P(plant(o, 0.12, -0.1));
          label = 'gpImpact'; dur = 0.04;
        } else if (phase < 0.3) {
          // Salto-Einrollen: eine Umdrehung vorwärts als Kugel
          S.z = -TAU * smoothstep(phase / 0.3);
          pose = P({ thighZn: 1.95, thighZf: 1.9, kneeN: 2.3, kneeF: 2.25, footN: 0.6, footF: 0.6, armZn: 1.25, armZf: 1.2, armXn: -0.25, armXf: 0.25, elbowN: 1.2, elbowF: 1.2, lean: -0.25, headZ: -0.3, eyes: 0.4, mouth: 0.3 });
          label = 'gpRoll'; dur = 0.08;
        } else {
          // Sturz senkrecht nach unten, Po voran: Oberschenkel waagerecht, Arme hoch
          pose = P({ bob: -0.3, thighZn: 1.6, thighZf: 1.55, kneeN: 1.5, kneeF: 1.6, footN: 0.4, footF: 0.4, armZn: 0.5, armZf: 0.5, armXn: -2.0, armXf: 2.0, elbowN: 0.25, elbowF: 0.25, lean: 0.05, headZ: -0.25, eyes: 1.2, mouth: 0.9, hairLift: 1 });
          label = 'gpDrop'; dur = 0.1;
        }
        break;
      case 'wallslide': {
        // Wand hinter der Figur (−X, am Hitbox-Rand 0,3 m): Rücken zur Wand, nahe Hand und fernes Bein (Sohle) an der Wand,
        // ferne Hand balanciert seitlich, Blick nach vorn (weg von der Wand)
        const wallU = 0.3 * upm, jit = 0.006 * Math.sin(t * 47);
        pose = P({
          figX: WS_REACH - wallU, lean: 0.05, torsoY: -0.35, bob: jit,
          armZn: -1.25, armXn: -0.64, elbowN: 0.1, armZf: 0.45, armXf: 1.3, elbowF: 0.35,
          thighZn: 0.85, kneeN: 1.25, footN: 0.35, thighZf: -0.42, kneeF: 1.45, footF: -0.35,
          headZ: -0.28, headY: 0.2, eyes: 1.1, mouth: 0.4, hairLift: 0.4,
        });
        dur = 0.1;
        break;
      }
      case 'walljump':
        // Abstoßen: Beine noch hinten gestreckt, Arme nach vorn-oben
        pose = P({ lean: -0.12, armZn: 1.5, armXn: -1.3, elbowN: 0.2, armZf: 1.5, armXf: 0.6, elbowF: 0.3, thighZn: -0.35, thighZf: -0.15, kneeN: 0.25, kneeF: 0.6, footN: 0.9, footF: 0.8, headZ: 0.3, mouth: 0.9, hairLift: -0.3 });
        dur = 0.06;
        break;
      case 'climb': {
        // Krallen-Klettern: Wand vor der Figur (+X, Hitbox-Rand 0,3 m), Arme und Beine im Wechsel, Blick die Wand hinauf
        const wallU = 0.3 * upm;
        this.climbPhase += TAU * clamp(Math.abs(vy) * 0.8, 0, 4) * dt;
        const q = this.climbPhase, a = 0.5 + 0.5 * Math.sin(q), b = 1 - a; // a = 1: nahe Hand oben, fernes Knie oben
        pose = P({
          figX: wallU - CL_REACH, lean: -0.2, torso: -0.05, headZ: 0.7, bob: 0.03 * Math.abs(Math.cos(q)),
          armXn: -lerp(0.78, 0.52, a), armZn: lerp(1.43, 2.33, a), armXf: lerp(0.78, 0.52, b), armZf: lerp(1.43, 2.33, b), elbowN: 0.15, elbowF: 0.15,
          thighXn: -0.35, thighXf: 0.35, thighZn: lerp(0.7, 1.35, b), thighZf: lerp(0.7, 1.35, a), kneeN: lerp(1.2, 1.9, b), kneeF: lerp(1.2, 1.9, a), footN: -0.3, footF: -0.3,
          eyes: 1, mouth: 0.3, hairBack: -0.2,
        });
        dur = 0.12;
        break;
      }
      case 'beanstalk': {
        // Ranke senkrecht vor der Figur (Achse 0,25 m vor root, Radius ≈ 0,1 m): Hände greifen seitlich im Wechsel, Knie klammern
        const vineU = VINE_M * upm;
        this.climbPhase += TAU * clamp(Math.abs(vy) * 0.7, 0, 3.5) * dt;
        const q = this.climbPhase, a = 0.5 + 0.5 * Math.sin(q), b = 1 - a;
        pose = P({
          figX: vineU - BS_REACH, lean: -0.15, headZ: 0.55, bob: 0.025 * Math.abs(Math.cos(q)),
          armZn: lerp(1.5, 2.3, a), armZf: lerp(1.5, 2.3, b), armXn: -0.2, armXf: 0.2, twistN: 1.2, twistF: -1.2, elbowN: lerp(0.9, 0.5, a), elbowF: lerp(0.9, 0.5, b),
          thighZn: lerp(0.8, 1.3, b), thighZf: lerp(0.8, 1.3, a), thighXn: -0.12, thighXf: 0.12, kneeN: lerp(1.3, 1.9, b), kneeF: lerp(1.3, 1.9, a), footN: 0.3, footF: 0.3,
          eyes: 1, mouth: 0.25,
        });
        dur = 0.12;
        break;
      }
      case 'swim': {
        // an der Oberfläche: k = 0 Wassertreten (aufrecht, Arme wriggen), k = 1 Brustschwimmen (flach, Kraulbeine)
        const k = clamp(speed / 2.5, 0, 1);
        this.swimPhase += TAU * (0.7 + 0.5 * k) * dt;
        const q = this.swimPhase, u = ((q / TAU) % 1 + 1) % 1, kick = Math.sin(q * 3);
        // Brust-Zyklus: 0–0,35 Arme nach außen, 0,35–0,6 unter die Brust (gebeugt), 0,6–1 gestreckt nach vorn
        const a = smoothstep(u / 0.35), b = smoothstep((u - 0.35) / 0.25), r = smoothstep((u - 0.6) / 0.4);
        const sx = lerp(lerp(lerp(0.15, 1.15, a), 0.35, b), 0.15, r), sz = lerp(lerp(lerp(2.65, 2.3, a), 1.5, b), 2.65, r), se = lerp(lerp(lerp(0.1, 0.4, a), 1.5, b), 0.1, r);
        const tw = Math.sin(t * 5);
        pose = P({
          pitch: lerp(-0.3, -1.15, k), figY: lerp(SWIM_Y0, SWIM_Y1, k), headZ: lerp(0.25, 1.0, k),
          armXn: lerp(-1.2 - 0.25 * tw, -sx, k), armXf: lerp(1.2 + 0.25 * tw, sx, k), armZn: lerp(1.5, sz, k), armZf: lerp(1.5, sz, k),
          elbowN: lerp(0.6, se, k), elbowF: lerp(0.6, se, k), twistN: lerp(0, 0.6, k), twistF: lerp(0, -0.6, k),
          thighZn: lerp(0.5 + 0.4 * Math.sin(q * 2), 0.25 * kick, k), thighZf: lerp(0.5 - 0.4 * Math.sin(q * 2), -0.25 * kick, k),
          kneeN: lerp(0.9 - 0.5 * Math.sin(q * 2), 0.3, k), kneeF: lerp(0.9 + 0.5 * Math.sin(q * 2), 0.3, k), footN: 0.7, footF: 0.7,
          mouth: 0.3, eyes: 1, hairLift: 0.2,
        });
        dur = 0.25;
        break;
      }
      case 'ride': {
        // auf Pflaume (wie Klassik, inkl. Angel mit Möhre); Hoppel-Takt aus speed (m/s)
        const uS = speed * upm, sf = clamp(uS / RUN_SPEED, 0, 1.4);
        this.ridePhase += uS * dt * (TAU / (1.5 + 0.8 * sf));
        this.rideSf = sf;
        const hop = rideBob(this.ridePhase, sf);
        const moving = grounded && uS > 0.5;
        label = moving ? 'rideRun' : 'ride';
        pose = P({
          bob: -0.28 + (moving ? hop.lift : 0), lean: moving ? -0.05 - 0.08 * sf : 0,
          thighZn: 1.3, thighZf: 1.3, thighXn: -0.5, thighXf: 0.5, kneeN: 1.3, kneeF: 1.3, footN: 0.5, footF: 0.5,
          armZn: 1.2, armXn: -0.12, armZf: 2.75 + 0.1 * Math.sin(t * 7), armXf: 0.35,
          headZ: 0.1 - (moving ? 0.1 * hop.c * sf : 0),
          mouth: moving ? 1 : 0.25, hairBack: 0.6 * sf + (moving ? 0.15 * hop.c : 0), hairLift: moving ? -0.3 * hop.c * sf : 0,
        });
        break;
      }
      case 'pipe':
        // in die Röhre: gestreckt, Arme an den Seiten, Beine geschlossen, Zehen gespitzt
        pose = P({ armZn: 0.02, armZf: 0.02, armXn: -0.1, armXf: 0.1, thighXn: 0.06, thighXf: -0.06, kneeN: 0, kneeF: 0, footN: 0.7, footF: 0.7, headZ: 0.12, mouth: 0.3, sq: -0.05, hairLift: 0.3 });
        dur = 0.1;
        break;
      case 'hurt': {
        // zurückgeworfen: Hohlkreuz, Arme und Beine fliegen nach vorn, Augen zusammengekniffen
        const sh = Math.sin(st * 30) * Math.exp(-st * 6);
        pose = P({ pitch: 0.28, lean: 0.3, torso: 0.1, armZn: 1.75, armZf: 2.0, armXn: -0.5, armXf: 0.55, elbowN: 0.3, elbowF: 0.3, thighZn: 0.75, thighZf: 0.45, kneeN: 0.6, kneeF: 0.4, footN: 0.2, footF: 0.2, headZ: 0.35 + 0.05 * sh, headX: 0.1 * sh, eyes: 0.3, mouth: 0.9, hairLift: 0.6 });
        dur = 0.06;
        break;
      }
      case 'dead':
        // Augen zu, dreht sich um die Hochachse, Arme hoch
        S.y = st * TAU * 1.3;
        pose = P({ armZn: 0.3, armZf: 0.3, armXn: -2.1, armXf: 2.15, elbowN: 0.2, elbowF: 0.2, thighZn: 0.2, thighZf: -0.1, kneeN: 0.45, kneeF: 0.6, footN: 0.3, footF: 0.3, headZ: 0.12, eyes: 0.07, mouth: 0.55, hairLift: 0.5 });
        dur = 0.12;
        break;
      case 'victory': {
        // Jubel am Zielmast: kleiner Hüpfer, dann Lotti Faust-Pumpen (andere Hand in der Hüfte), Greta Peace + Winken
        const hop = st < 0.42 ? Math.sin((Math.PI * st) / 0.42) : 0, pump = 0.5 + 0.5 * Math.sin(st * 9);
        const legs = { thighZn: 0.05 + 0.95 * hop, kneeN: 0.08 + 1.3 * hop, footN: 0.5 * hop, thighZf: -0.05 + 0.3 * hop, kneeF: 0.1 + 0.4 * hop };
        if (greta) {
          this.peace = st > 0.12 && this.costume !== 'krallen';
          pose = P({ ...legs, bob: 0.22 * hop, armXn: -1.45, armZn: 0.25, twistN: -1.57, elbowN: 1.75, armXf: 2.2, armZf: 0.3, elbowF: 0.3 + 0.35 * Math.sin(st * 8), headX: -0.15, headZ: 0.14, mouth: 1 });
        } else {
          pose = P({ ...legs, bob: 0.22 * hop, armXn: -1.35, armZn: 0.35, twistN: -1.57, elbowN: 1.45 + 0.35 * pump, armZf: -0.15, armXf: 0.95, twistF: -1.45, elbowF: 1.9, headZ: 0.2, headX: 0.1, mouth: 1 });
        }
        dur = 0.12;
        break;
      }
      case 'throw': {
        // Wurf/Feuerball (über phase 0..1 oder 0,32 s): Ausholen hinter den Kopf → Schleudern nach vorn → Ausschwingen
        const p = (c.phase ?? 0) > 0 ? phase : clamp(st / 0.32, 0, 1);
        const o = this.poseLoco(speed, upm, dt, t, grounded, vy);
        const w = smoothstep(p / 0.32), r = smoothstep((p - 0.32) / 0.26), e = smoothstep((p - 0.62) / 0.38);
        Object.assign(o, {
          armZn: lerp(lerp(lerp(o.armZn ?? 0.1, 3.5, w), 1.35, r), 0.7, e), armXn: -0.3, elbowN: lerp(lerp(lerp(o.elbowN ?? 0.2, 1.7, w), 0.1, r), 0.4, e),
          armZf: lerp(o.armZf ?? 0.1, 1.2, w), armXf: 0.45, elbowF: 0.4,
          torsoY: lerp(lerp(lerp(0, -0.4, w), 0.35, r), 0.1, e), lean: (o.lean ?? 0) - 0.08 * r, mouth: 0.6,
        });
        pose = P(o);
        dur = 0.06;
        break;
      }
      case 'claw': {
        // Krallenhieb: Doppel-Tatzenwischer (nah, dann fern) schräg von oben-außen nach unten-innen
        const p = (c.phase ?? 0) > 0 ? phase : clamp(st / 0.3, 0, 1);
        const o = this.poseLoco(speed, upm, dt, t, grounded, vy);
        const a = smoothstep(p / 0.45), b = smoothstep((p - 0.4) / 0.45);
        Object.assign(o, {
          armZn: lerp(2.7, 0.75, a), armXn: lerp(-1.0, 0.3, a), elbowN: 0.7, twistN: 0.5,
          armZf: lerp(lerp(o.armZf ?? 0.1, 2.7, a), 0.75, b), armXf: lerp(lerp(o.armXf ?? 0.14, 1.0, a), -0.3, b), elbowF: 0.7, twistF: -0.5,
          torsoY: 0.35 * a - 0.7 * b, lean: (o.lean ?? 0) - 0.12, headZ: 0.1, mouth: 0.85, eyes: 0.75,
        });
        pose = P(o);
        dur = 0.05;
        break;
      }
      default:
        label = 'idle';
        pose = P(this.poseIdle(t));
    }
    if (c.holding && HOLD_STATES.has(state)) this.holdArms(pose, c.holding);
    return { state: label, pose, dur };
  }

  dispose() {
    this.glow?.dispose();
    super.dispose();
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
  yaw: 0, roll: 0, padX: 0, padZ: 0, // nur Kurs-Modus: Körperdrehung (Freudensprung, Paddeln), Paddel-Lage
};

// ------------------------------------------------------------------ Pflaume im Kurs-Modus: Floß, Paddel, Schatzsucher-Ausrüstung
const RAFT_X0 = -1.0, RAFT_L = 2.05, RAFT_W = 0.56;
const raftHalfWidth = (t) => RAFT_W * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.78)), 0.7);
/** Blatt-Floß: großes, leicht gewölbtes Blatt (Spitze +X, Ränder hochgebogen) mit hellen Adern und eingerolltem Stiel. */
function raftGeo() {
  return geo('rabbit:raft', () => {
    const nt = 26, ns = 12, pos = [], uv = [], col = [], idx = [];
    const leafC = new THREE.Color('#58b33a'), edgeC = new THREE.Color('#3d8f2a'), veinC = new THREE.Color('#a6dd6a'), c = new THREE.Color();
    for (let it = 0; it <= nt; it++) {
      const t = it / nt, x = RAFT_X0 + t * RAFT_L, w = raftHalfWidth(t);
      for (let is = 0; is <= ns; is++) {
        const s = -1 + (2 * is) / ns;
        pos.push(x, 0.025 + 0.13 * s * s * (0.35 + 0.65 * Math.sin(Math.PI * t)), s * w);
        uv.push(t, is / ns);
        const vein = Math.abs(s) < 0.09 || ((t * 6 - Math.abs(s) * 1.3) % 1 + 1) % 1 < 0.07;
        c.copy(leafC).lerp(edgeC, Math.abs(s) ** 3);
        if (vein && Math.abs(s) < 0.85) c.lerp(veinC, 0.75);
        col.push(c.r, c.g, c.b);
      }
    }
    for (let it = 0; it < nt; it++) for (let is = 0; is < ns; is++) {
      const a = it * (ns + 1) + is, b = a + 1, cc = a + ns + 1, d = cc + 1;
      idx.push(a, b, cc, b, d, cc);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const stem = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(RAFT_X0 + 0.05, 0.04, 0), V(RAFT_X0 - 0.12, 0.06, 0), V(RAFT_X0 - 0.24, 0.16, 0.03), V(RAFT_X0 - 0.2, 0.27, 0.06), V(RAFT_X0 - 0.12, 0.25, 0.07)]), 12, 0.035, 6, false);
    const merged = mergeColored([[g, null, null], [stem, '#4a8a2a', null]]);
    g.dispose(); stem.dispose();
    return merged;
  });
}
/** Paddel (Ursprung = Griffstelle der Pfoten): Holzschaft nach unten, Blatt-Paddel, Knauf oben. */
function paddleParts() {
  return [
    part(cylinder(0.028, 0.028, 1.15, 8), '#b07a40', { y: -0.3 }),
    part(sphere(0.05, 10, 8), '#e8742c', { y: 0.28 }),
    part(unitSphere(), '#d9893a', { y: -0.86, sx: 0.035, sy: 0.25, sz: 0.13 }),
    part(cylinder(0.034, 0.03, 0.08, 8), '#e8742c', { y: -0.62 }),
  ];
}
/** Stirnlampe (kopf-lokal): Band um den Kopf (vorn über den Augen, hinten tiefer), Gehäuse mit gelbem Ring auf der Stirn. */
const LAMP_DIR = V(0.95, 0.3, 0).normalize();
const LAMP_P = V(HC.x + 0.3 * Math.cos(0.72) * 1.08, HC.y + 0.3 * Math.sin(0.72), 0);
function lampParts() {
  const beta = 0.235, ringC = V(HC.x - 0.0315, HC.y + 0.131, 0);
  const ring = new THREE.Matrix4().makeTranslation(ringC.x, ringC.y, 0)
    .multiply(new THREE.Matrix4().makeScale(1.08, 1, 1))
    .multiply(new THREE.Matrix4().makeRotationZ(beta))
    .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
  const q = new THREE.Quaternion().setFromUnitVectors(UP, LAMP_DIR);
  const at = (d) => LAMP_P.clone().addScaledVector(LAMP_DIR, d);
  return [
    [torus(0.262, 0.022, 6, 32), '#3a5fb0', ring],
    [cylinder(0.072, 0.064, 0.085, 14), '#3b3b48', new THREE.Matrix4().compose(at(0.025), q, V(1, 1, 1))],
    [torus(0.06, 0.016, 6, 16), '#f2c230', new THREE.Matrix4().compose(at(0.07), new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), LAMP_DIR), V(1, 1, 1))],
  ];
}
/** Leuchthof-Material (radialer Verlauf, additiv) – einmal je Seite. */
let HALO_MAT = null;
function haloMat() {
  if (HALO_MAT) return HALO_MAT;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,248,200,1)'); gr.addColorStop(0.25, 'rgba(255,236,150,0.55)'); gr.addColorStop(1, 'rgba(255,220,120,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  HALO_MAT = new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  return HALO_MAT;
}
/** Kleiner Rucksack (rumpf-lokal) mit roter Klappe, Schnalle, Brustgurt und Schaufelstiel. */
function backpackParts() {
  return [
    part(unitSphere(), '#b06a35', { x: -0.17, y: 0.86, sx: 0.22, sy: 0.15, sz: 0.2, rz: 0.15 }),
    part(unitSphere(), '#d94a3a', { x: -0.1, y: 0.93, sx: 0.17, sy: 0.07, sz: 0.205, rz: 0.2 }),
    part(sphere(0.03, 8, 6), '#f2c230', { x: 0.02, y: 0.92 }),
    part(torus(0.3, 0.022, 6, 28), '#8a4f24', { x: -0.02, y: 0.57, ry: Math.PI / 2, sy: 1.02 }),
    part(cylinder(0.016, 0.016, 0.36, 6), '#a8743c', { x: -0.33, y: 1.0, z: 0.09, rz: 0.55 }),
    part(torus(0.035, 0.012, 5, 10), '#3b3b48', { x: -0.43, y: 1.16, z: 0.09, rz: 0.55 }),
  ];
}

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
    if (this.courseMode) { this.animateCourse(dt, t); return; }
    this.dt = dt;
    const o = this.obj;
    this.model.rotation.y = this.facingCtl.update(dt, this.facing);
    if (o.power !== this.powerKey) { this.powerKey = o.power; this.bandanaMat.color.set(POWER_COLORS[o.power]?.Z ?? POWER_COLORS.none.Z); }
    const { state, pose, nose } = this.computePose(dt, t);
    const cur = this.blender.update(state, pose, dt);
    this.applyPose(cur, nose);
  }

  // ================================================================ Kurs-Modus
  /** Wie HeroAvatar.setCourseMode: keine eigene Blickrichtung, Zustand aus obj.course. */
  setCourseMode(on) {
    on = !!on;
    if (on === !!this.courseMode) return this;
    this.courseMode = on;
    this.cState = null; this.cStateT = 0; this.padPhase = this.padPhase ?? 0;
    this.blender.state = null;
    if (!on) {
      this.body.rotation.set(0, 0, 0);
      this.model.rotation.set(0, 0, 0);
      if (this.raft) { this.raft.visible = false; this.paddle.visible = false; }
      if (this.gear) for (const g of this.gear) g.visible = false;
      this.powerKey = null; // Klassik setzt die Halstuchfarbe neu
    }
    return this;
  }

  sync(dt, t) {
    if (this.courseMode) { this.animate(dt, t); return; }
    super.sync(dt, t);
  }

  /** Floß (am Modell, schwimmt unter Pflaume) und Paddel (an den Vorderpfoten) – nur beim Paddeln sichtbar. */
  buildRaft() {
    this.raft = new THREE.Mesh(raftGeo(), vcolMat(0.7, THREE.DoubleSide));
    this.raft.receiveShadow = true;
    this.model.add(this.raft);
    this.paddle = new THREE.Group(); this.paddle.position.set(0.62, 0.3, 0);
    this.paddle.add(vmesh('rabbit:paddle', paddleParts, 0.6));
    this.body.add(this.paddle);
    this.raft.visible = this.paddle.visible = false;
  }

  /** Schatzsucherin-Ausrüstung: Stirnlampe mit leuchtender Linse (Kopf), kleiner Rucksack (Rumpf). */
  buildGear() {
    const lamp = vmesh('rabbit:lamp', lampParts, 0.5);
    const lens = new THREE.Mesh(sphere(1, 12, 8), basicMat('lamp-lens', { color: 0xfff3b0 }));
    lens.position.copy(LAMP_P).addScaledVector(LAMP_DIR, 0.072);
    lens.quaternion.setFromUnitVectors(V(0, 0, 1), LAMP_DIR);
    lens.scale.set(0.052, 0.052, 0.018);
    // weicher Leuchthof vor der Linse (additiv, immer zur Kamera)
    const halo = new THREE.Sprite(haloMat());
    halo.position.copy(LAMP_P).addScaledVector(LAMP_DIR, 0.1);
    halo.scale.setScalar(0.42);
    this.head.add(lamp, lens, halo);
    this.lampLens = lens; // Anker für ein Licht des Dioramas (optional)
    const pack = vmesh('rabbit:backpack', backpackParts, 0.65); // kein Schattenwurf: Rumpf-Schatten deckt ihn ab, spart den Aufruf
    this.torso.add(pack);
    this.gear = [lamp, lens, halo, pack];
  }

  animateCourse(dt, t) {
    this.dt = dt;
    const c = this.obj.course ?? {};
    this.model.rotation.set(0, 0, 0);
    this.model.scale.set(1, 1, 1);
    const power = c.power ?? this.obj.power ?? 'none';
    if (power !== this.powerKey) { this.powerKey = power; this.bandanaMat.color.set(POWER_COLORS[power]?.Z ?? POWER_COLORS.none.Z); }
    const gear = c.gear === 'lamp';
    if (gear && !this.gear) this.buildGear();
    if (this.gear) for (const g of this.gear) g.visible = gear;
    const paddling = (c.state ?? 'idle') === 'paddle';
    if (paddling && !this.raft) this.buildRaft();
    if (this.raft) { this.raft.visible = paddling; this.paddle.visible = paddling; }
    const { state, pose, nose } = this.coursePose(c, dt, t);
    const cur = this.blender.update(state, pose, dt);
    this.applyPose(cur, nose);
    this.body.rotation.set(cur.roll, cur.yaw, 0);
    if (paddling) {
      this.paddle.rotation.set(cur.padX, 0, cur.padZ);
      // Floß dümpelt (Pflaume sitzt darauf: gleiche Hebung über bob)
      this.raft.position.y = -0.02 + 0.015 * Math.sin(t * 2.1);
      this.raft.rotation.set(0.03 * Math.sin(t * 1.3), 0, 0.025 * Math.sin(t * 1.7 + 1));
    }
  }

  /** Kurs-Zustände: idle | walk | run | jump | ride | paddle | dig | victory (speed m/s, vy m/s). */
  coursePose(c, dt, t) {
    const state = c.state ?? 'idle';
    if (state !== this.cState) { this.cState = state; this.cStateT = 0; } else this.cStateT += dt;
    const st = this.cStateT;
    const speed = Math.max(0, c.speed ?? 0), vy = c.vy ?? 0, grounded = c.grounded ?? true;
    const P = this.blender.pose.bind(this.blender);
    const nose = Math.sin(t * 24) * (Math.sin(t * 1.3) > 0.3 ? 1 : 0);
    this.twitchTimer -= dt;
    if (this.twitchTimer <= 0) { this.twitch = 1; this.twitchTimer = 2 + Math.random() * 3; }
    this.twitch = Math.max(0, this.twitch - dt * 5);
    const tw = Math.sin(this.twitch * Math.PI) * 0.35;
    let label = state, pose;
    switch (state) {
      case 'walk': {
        // Hoppeln: Takt aus dem Tempo, Sprunghöhe wächst mit
        this.hopPhase += TAU * clamp(1.1 + 0.3 * speed, 1, 3.2) * dt;
        const k = clamp(speed / 3, 0.45, 1.15), s = Math.sin(this.hopPhase), co = Math.cos(this.hopPhase);
        const up = Math.max(0, s), down = Math.max(0, -s);
        pose = P({
          bob: 0.1 * k * up, pitch: 0.2 * k * Math.sin(this.hopPhase + 0.6),
          sx: 1 + 0.1 * up + 0.06 * down, sy: 1 - 0.06 * up - 0.08 * down,
          earBackN: -0.1 - 0.4 * co, earBackF: 0.75 - 0.35 * co,
          hindN: (-0.6 * up + 0.25 * down) * k, hindF: (-0.6 * up + 0.25 * down) * k - 0.1,
          frontN: (0.8 * up - 0.3 * down) * k, frontF: (0.8 * up - 0.3 * down) * k + 0.15,
          headZ: 0.05 - 0.08 * co,
        });
        break;
      }
      case 'run': {
        // Galopp (wie beim Reiten): weit gestreckt, Ohren fliegen
        this.hopPhase += TAU * clamp(1.6 + 0.22 * speed, 1.5, 3.8) * dt;
        const sf = clamp(speed / 7, 0.4, 1.3), s = Math.sin(this.hopPhase), co = Math.cos(this.hopPhase);
        const up = Math.max(0, s), down = Math.max(0, -s);
        pose = P({
          bob: (0.03 + 0.17 * sf) * up, pitch: 0.25 * Math.sin(this.hopPhase + 0.6) * sf,
          sx: 1 + 0.14 * up + 0.08 * down, sy: 1 - 0.08 * up - 0.1 * down,
          headZ: 0.25 - 0.1 * co, earOutN: 0.55 + 0.1 * co, earOutF: 0.1, earBackN: 0.4 - 0.5 * co * sf, earBackF: 1.0 - 0.4 * co * sf,
          hindN: -0.85 * up + 0.3 * down, hindF: -0.85 * up + 0.3 * down - 0.1,
          frontN: 0.95 * up - 0.4 * down, frontF: 0.95 * up - 0.4 * down + 0.15, mouth: 0.4,
        });
        break;
      }
      case 'jump': {
        // gestreckt: Hinterläufe stoßen ab, Vorderpfoten voraus, Ohren nach hinten; beim Sinken Pfoten zur Landung
        const d = clamp(-vy / 6, 0, 1);
        pose = P({
          pitch: lerp(0.28, -0.22, d), sx: 0.94, sy: 1.08, headZ: 0.15,
          hindN: lerp(-1.05, -0.2, d), hindF: lerp(-0.95, -0.15, d), frontN: lerp(1.0, 0.25, d), frontF: lerp(0.9, 0.35, d),
          earBackN: lerp(1.1, -0.3, d), earBackF: lerp(1.3, 0.2, d), earOutN: lerp(0.6, 1.5, d), earOutF: lerp(0.3, 1.3, d),
          eyes: 1.1, mouth: 0.5,
        });
        break;
      }
      case 'ride': {
        // Heldin auf dem Rücken: Hoppel-Takt der Reiterin übernehmen (course.rider = HeroAvatar oder Objekt mit __view3d)
        const r = c.rider, av = r && (typeof r.ridePhase === 'number' ? r : r.__view3d);
        const uS = speed * 1.5, sf = clamp(uS / RUN_SPEED, 0, 1.4);
        if (av && typeof av.ridePhase === 'number') this.hopPhase = av.ridePhase;
        else this.hopPhase += uS * dt * (TAU / (1.5 + 0.8 * sf));
        const moving = grounded && uS > 0.5;
        const hop = rideBob(this.hopPhase, sf), s = hop.s, co = hop.c, up = Math.max(0, s), down = Math.max(0, -s);
        label = moving ? 'gallop' : 'rideIdle';
        pose = moving
          ? P({
            bob: hop.lift, pitch: 0.25 * Math.sin(this.hopPhase + 0.6) * sf,
            sx: 1 + 0.14 * up + 0.08 * down, sy: 1 - 0.08 * up - 0.1 * down, headZ: 0.3 - 0.1 * co, headX: 0.07,
            earOutN: 0.55 + 0.1 * co, earOutF: 0.1, earBackN: -0.1 - 0.5 * co * sf, earBackF: 0.75 - 0.4 * co * sf,
            hindN: -0.85 * up + 0.3 * down, hindF: -0.85 * up + 0.3 * down - 0.1,
            frontN: 0.95 * up - 0.4 * down, frontF: 0.95 * up - 0.4 * down + 0.15, mouth: 0.4,
          })
          : P({ headZ: 0.28, headX: 0.05, sy: 1 + 0.02 * Math.sin(t * 2.5), earOutN: 0.55 + tw, mouth: 0.15 * (0.5 + 0.5 * nose) });
        break;
      }
      case 'paddle': {
        // auf dem Blatt-Floß sitzend, Paddelschlag im Wechsel links/rechts (Takt schneller, wenn das Floß fährt)
        this.padPhase += (0.75 + 0.12 * clamp(speed, 0, 4)) * dt;
        const q = this.padPhase, u = q - Math.floor(q), side = Math.floor(q) % 2 ? -1 : 1;
        const dip = smoothstep(u / 0.15), pull = smoothstep((u - 0.12) / 0.55), lift = smoothstep((u - 0.7) / 0.3);
        const padX = side * 1.0 * dip * (1 - lift), padZ = lerp(lerp(0.6, -0.55, pull), 0.6, lift);
        pose = P({
          bob: 0.015 * Math.sin(t * 2.1), pitch: 0.2, sx: 1.02, sy: 0.98, headZ: 0.12 + 0.04 * Math.sin(q * TAU),
          hindN: 0.25, hindF: 0.25, frontN: 1.15 + 0.35 * padZ, frontF: 1.15 + 0.35 * padZ,
          earOutN: 0.6 + tw, earBackN: 0.1, earBackF: 0.8, yaw: -side * 0.12 * Math.sin(Math.PI * u) * (1 - lift),
          padX, padZ, mouth: 0.15 * (0.5 + 0.5 * nose),
        });
        break;
      }
      case 'dig': {
        // Buddeln: Nase zum Boden, Po hoch, Vorderpfoten scharren schnell im Wechsel, Ohren schlackern
        const k = Math.sin(t * 22);
        pose = P({
          pitch: -0.42, bob: 0.03 + 0.012 * Math.abs(k), headZ: -0.3, sx: 1 + 0.02 * k, sy: 1 - 0.02 * k,
          frontN: 0.45 + 0.75 * k, frontF: 0.45 - 0.75 * k, hindN: 0.3, hindF: 0.3,
          earOutN: 0.9 + 0.25 * Math.sin(t * 11), earOutF: 0.6 + 0.25 * Math.sin(t * 11 + 1), earBackN: -0.45, earBackF: 0.2,
          eyes: 0.85, mouth: 0,
        });
        break;
      }
      case 'victory': {
        // Freudensprung (Hasen-„Binky“): hoch, in der Luft verdreht, Hinterläufe schlagen aus, dann federnd landen
        const u = (st % 1.0) / 1.0, air = u < 0.55, a = clamp(u / 0.55, 0, 1), land = air ? 0 : Math.sin(Math.PI * clamp((u - 0.55) / 0.2, 0, 1));
        pose = P({
          bob: air ? 0.42 * Math.sin(Math.PI * a) : 0, yaw: air ? 0.7 * Math.sin(TAU * a) : 0, roll: air ? 0.25 * Math.sin(TAU * a) : 0,
          pitch: air ? 0.15 * Math.cos(Math.PI * a) : 0, sx: 1 + 0.12 * land, sy: 1 - 0.12 * land,
          hindN: air ? -0.95 * Math.sin(Math.PI * a) : 0, hindF: air ? -0.85 * Math.sin(Math.PI * a) : 0,
          frontN: air ? 0.6 * Math.sin(Math.PI * a) : 0, frontF: air ? 0.5 * Math.sin(Math.PI * a) : 0,
          earOutN: 0.55 + (air ? 1.3 * Math.sin(Math.PI * a) : 0), earOutF: 0.1 + (air ? 1.2 * Math.sin(Math.PI * a) : 0),
          headZ: 0.25, eyes: 1.1, mouth: 0.7,
        });
        break;
      }
      default:
        label = 'idle';
        pose = P({ sy: 1 + 0.02 * Math.sin(t * 2.5), sx: 1 - 0.01 * Math.sin(t * 2.5), earOutN: 0.55 + tw, headZ: 0.03 * Math.sin(t * 1.1), mouth: 0.1 * (0.5 + 0.5 * nose) });
    }
    return { state: label, pose, nose };
  }
}
