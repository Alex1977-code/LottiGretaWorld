// Avatare der Heldinnen (Lotti, Greta) und des Reittiers Pflaume im Super-Mario-3D-World-Look (eigene Figuren):
// weiche, glatte Formen aus Parametern (Gitter mit weichen Normalen, Drehkörper ohne Naht, verschmolzene Ellipsoide),
// großer runder Kopf mit Aufkleber-Gesicht (gewölbte Comic-Augen mit Lidstrich/Wimpern und Glanzpunkten, Brauen,
// Stupsnase, Wangenröte, Lächeln), modellierte Haarschale mit gerolltem Rand und Glanzband, kräftige Glieder, runde
// Fäustlings-Hände, große glänzende Schuhe; Materialien je Oberfläche (Haut weich, Stoff samtig, Haar seidig,
// Augen/Schuhe glänzend). Prozedurale Animation. Alles Code-generiert, keine Dateien.
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
//    Nur Gelenke trennen Meshes. Heldin ≈ 26 Meshes (21 sichtbar, davon 6 Zopfglieder; geschlossene Augen als eigenes,
//    sonst unsichtbares Mesh), Pflaume 15. Teile gleicher Oberfläche (Material) bündelt die Kurs-Ansicht zu einem
//    Zeichenaufruf (view/ShadowProxy.js) – Heldin im Stand 9 Aufrufe inkl. Schattenpass. Darum: dauerhaftes Stauchen
//    (nicht gleichmäßiger Maßstab) nur kurz (Absprung, Landung), sonst zeichnet jedes Teil einzeln.
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
//
// Welt 3 (Kurs-Modus, Bausteine in ../lib/heroWorld3.js; Vertrag „Präzisierung (Motor Welt 3): Avatar-Zustände“):
//  - Power 'gleitblatt' = Gleitblatt-Kostüm: Haarreif mit zwei großen grün-goldenen Blatt-Ohren (im Haar-Mesh, 0 Aufrufe),
//    Kragen in Blattgrün bzw. Gold, buschiger orange-brauner Ringel-Schweif mit Blattspitze (SkinnedMesh mit 4 Knochen am
//    Becken: +1 Aufruf, +1 Schatten). Der Schweif folgt jedem Zustand (Stand: S-Bogen nach oben und langsames Wedeln,
//    Lauf: weht nach hinten, Sprung/Fall: hängt bzw. hebt sich, Zaun: hängt, Unterwasser: verlängert die Körperachse).
//  - Zustände (obj.course.state, exakt): 'tailswipe' (Drehung um die Hochachse, Schweif waagerecht ausgestreckt; phase
//    0..1, sobald sie sich im Zustand ändert, sonst 0,35 s ab Zustandsbeginn), 'glide' (Arme leicht ausgebreitet, Schweif
//    kreist schnell als Propeller, Zöpfe/Haar wehen im Aufwind hoch), 'statue' (Stein-Haut für alle Materialien, gefaltete
//    Hände, Augen zu, Sockel unter den Füßen, Zöpfe/Haar/Schweif starr; Puff beim Verwandeln, Staubwolke beim Aufkommen –
//    erkannt an grounded oder am abrupten Ende des Sturzes (vy); phase > 0,82 = Anteil der Höchstdauer → Wackeln als
//    Vorwarnung), 'skate' (Schlittschuhe – hellblau, weißer Fellrand, Bommel, hohe Kufe –, Gleitschritte im Takt aus
//    speed, Kurvenneigung aus der Gierrate von root bzw. optional obj.course.turn in rad/s), 'fence' (Zaun VOR der Figur,
//    +X, courseAnchors().fence = 0,38 m wie im Motor; Kletterzyklus aus obj.course.fenceMove {x: rechts +, y: hoch +}
//    −1..1, seitliche Richtung aus der tatsächlichen Bewegung von root; ruhiges Hängen ohne Bewegung; Faustschlag durch
//    den Zaun bei obj.course.fencePunch 0..1 (oder attack: true → 0,25 s ab der Flanke), Hände im Wechsel), 'swimUnder'
//    (Brustschwimmen unter Wasser: Arme ziehen, Froschbeine; vy neigt den Körper; ohne Tempo Schweben mit Paddeln;
//    Zöpfe/Haar mit Auftrieb; alle ~2 s zwei, drei Luftbläschen am Mund).
//  - Schlittschuhe: an bei obj.course.skates (Motor, auch in der Luft) oder state 'skate'; ohne skates bleiben sie nach
//    'skate' in Sprung-/Fall-/Landezuständen an. Die Kufe reicht 0,15 Einheiten unter die Sohle – genau so weit hebt
//    HeroRig die Hülle mit skates (0,1 m bzw. 0,07 m klein); ohne skates steht die Kufe auf root. `drawsSkates = true`:
//    die Schlittschuh-Entität muss keine eigenen Kufen an den Füßen zeichnen.
//  - Zeichenaufrufe: Puff/Bläschen sind ein InstancedMesh (1 Aufruf, ohne Schatten, nur solange sichtbar); als Ausgleich
//    blendet die Statue die Augen-Glanzpunkte aus, unter Wasser werfen die Unterschenkel keinen Schatten. In den
//    Dauer-Zuständen bleibt der Mund zu (offener Mund kostet einen Aufruf). Klone (HeroRig `lite`, erkannt am fehlenden
//    Schattenwurf des Oberkörpers) zeigen keine Bläschen/Staubwolken.
//
// Welt 5 (Kurs-Modus; Vertrag „Präzisierung (Motor und Bausteine Welt 5): Avatar-Zustände“ und „… Trapez (Figur)“):
//  - 'trapeze' (obj.course.swing = Seilwinkel rad, + = nach vorn; swingVel rad/s; phase): Die Hülle ist schon um den
//    Seilwinkel geneigt (HeroRig, Drehpunkt Fußpunkt) – die Pose dreht die Figur deshalb NICHT mehr, sie arbeitet im
//    Seil-System: Fäuste per Arm-IK genau an der Stange (TRAPEZE: Stangenmitte des Modells `trapez` über dem Fußpunkt =
//    Körperhöhe der Hitbox + Armzugabe des Motors − Durchbiegung, in Avatar-Einheiten über den Maßstab der Hülle), Arme
//    gestreckt im weiten V um den großen Kopf (Gummi-Arme: Kanal reachN/reachF verlängert den Unterarm-Knochen), Beine
//    laufen dem Schwung nach (swingVel), am Umkehrpunkt Knie angezogen (vorn gehockt, hinten nach hinten gebeugt), im
//    Durchschwung gestreckt; Kopf gleicht die Neigung halb aus, Lächeln, Zöpfe/Haar pendeln weiter physikalisch. Absprung
//    bzw. Fallenlassen blenden länger über (TRAPEZE.release). Riesentrank: Die Stange liegt in Brusthöhe – die Figur hängt
//    etwas hinter ihr und hält sie vor dem Bauch. Gestreckte Arme sind gleichmäßig etwas größer (armKn/armKf, kräftiger).
//  - 'cannon' (phase = Flugfortschritt 0..1, speed/vy = Geschwindigkeit; die Hülle blickt waagerecht in Flugrichtung):
//    Superheldinnen-Flug – Körperachse entlang der Geschwindigkeit (pitch aus atan2(speed, vy), kopfüber höchstens
//    CANNON.pitchMin), führende Faust voraus (Gummi-Arm), anderer Arm Lotti am Körper / Greta nach vorn, Beine geschlossen,
//    Zehen gespitzt, Blick in Flugrichtung, Rock flattert (Drehkanäle skirtX/skirtZ, gleichmäßiger Maßstab → Figur-Bündel
//    bleibt), Zöpfe/Haar wehen im Fahrtwind (Physik). Ab phase 0,8 Übergang in die Landepose (aufrichten, Beine vor,
//    Arme seitlich). In der Röhre ist die Figur unsichtbar (HeroRig), davor 'pipe'.
//  - Beide Posen halten den Mund geschlossen und die Augen ungestaucht (kein zusätzlicher Zeichenaufruf gegenüber idle).

import * as THREE from 'three';
import { Avatar3D } from '../Avatar3D.js';
import { POWER_COLORS } from '../../gfx/palette.js';
import { GAME, HERO } from '../../config.js';
import {
  TAU, damp, clamp, mat, lineMat, geo, sphere, capsule, cylinder, cone, torus, unitSphere,
  mesh, limb, placed, dirAE, mergeTinted, mergePlain, mergeColored, vcolMat, buildEyes, Facing, PoseBlender, Blinker,
  HangChain, lerp, smoothstep, basicMat, wrapAngle, legIK, skinTwoBones, RainbowGlow,
  gridGeo, latheGeo, smoothProfile2, HeadShape, decalGeo, stripGeo, hairShellGeo, blobGeo, paramDecalGeo, toonEyeGeos, blobUnionGeo,
} from '../lib/figures.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { leafSolidGeo, bushyTailGeo, skinChain, StoneSkin, PuffFx } from '../lib/heroWorld3.js';
import { applyToyLook } from '../lib/toyLook.js';

const U = 1 / GAME.tile;             // Weltpixel → Einheiten
const BIAS = 0.42;                   // Drehung zur Kamera (3/4-Ansicht), für Heldin und Pflaume gleich
const RUN_SPEED = HERO.runSpeed * U; // ≈ 7,8 Einheiten/s
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const UP = new THREE.Vector3(0, 1, 0);
const DOWN = new THREE.Vector3(0, -1, 0);
const _v = new THREE.Vector3();
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _sv = new THREE.Vector3();
const _q = new THREE.Quaternion(), _qi = new THREE.Quaternion(), _qt = new THREE.Quaternion();
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
// Figurenstil (3D-World-Anmutung, eigene Figuren): Gelenke und Hülle wie bisher (Spielphysik, Anker), dazu großer runder
// Kopf mit Aufkleber-Gesicht (gewölbte Comic-Augen mit Lidstrich und Wimpern, Brauen, Stupsnase, Wangenröte, Lächeln),
// modellierte Haarschale mit gerolltem Rand und Glanzband, kräftige weiche Arme/Beine, große Fäustlings-Hände, große
// glänzende Schuhe. Materialien je Oberfläche (Haut, Stoff, Haar, Glanz) – Teile gleicher Oberfläche bündelt die
// Kurs-Ansicht in einen Zeichenaufruf (view/ShadowProxy.js).
const HIP = 0.50;          // Hüftgelenk
const THIGH = 0.19, SHIN = 0.17;
const SHOULDER_Y = 0.35;   // über der Hüfte
const SHOULDER_Z = 0.21;
const ARM = 0.22, HAND = 0.27;
const NECK_Y = 0.42;       // über der Hüfte (Kopf-Drehpunkt)
const HEAD_R = 0.30;
const HEAD_C = V(0.02, 0.28, 0); // Kopfmitte relativ zum Hals → Weltmitte (0.02, 1.20)
const SKIN_C = '#ffd1ae', WHITE_C = '#f8f6f0';
const ARM_R = 0.056, HAND_R = 0.08;   // kräftige Arme, runde Fäustlings-Hand

const STYLES = {
  lotti: {
    hair: '#cf9a43', hairTip: '#ffe6a2', hairDark: '#8f5e24', brow: '#8a5a2a', dress: '#3b7cf0', sleeve: WHITE_C, boot: '#7c4a24', sole: '#43260f',
    cuff: '#a06a38', iris: '#3e82f5', accent: '#e83a30', braids: true, bootShaft: true, blouse: true,
  },
  greta: {
    hair: '#f3d97a', hairTip: '#fffbe6', hairDark: '#c99d45', brow: '#c39a4a', dress: '#4fb833', sleeve: '#4fb833', boot: '#7d2e42', sole: '#3e1424',
    iris: '#49a84a', accent: '#f0609f', apron: true, socks: true, mane: true, strap: true,
  },
};

/** Oberflächen (geteilte Materialien): Haut weich, Stoff samtig, Haar seidig, Augen/Schuhe glänzend. */
const SURF = {
  skin: () => mat('hero:skin', { vertexColors: true, roughness: 0.55, emissive: 0x26100a }),   // Haut: weich, leicht warm aufgehellt
  cloth: () => vcolMat(0.78),   // ab 0,75 behandelt der Spielzeug-Look (toyLook.js) die Fläche als Stoff: weicher Schimmer, kaum Glanz
  hair: () => vcolMat(0.36),
  gloss: () => vcolMat(0.24),
};

const deg = Math.PI / 180;
const col3 = (c) => new THREE.Color(c);
/** Kurve über |Azimut| in Grad (Stützstellen [[grad, wert], …], linear, über ±7,5° geglättet). */
function curveDeg(pts) {
  const lin = (x) => {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0); }
    return pts[pts.length - 1][1];
  };
  return (a) => {
    const x = Math.abs(wrapAngle(a)) / deg;
    let s = 0;
    for (let k = -3; k <= 3; k++) { let q = Math.abs(x + k * 2.5); if (q > 180) q = 360 - q; s += lin(q); }
    return s / 7;
  };
}
/** Ellipsoid (Einheitskugel) mit Achsen ax/ay/az (Vector3, schon skaliert) um c, Farbe je Punkt. */
function ellipsoidGeo(c, ax, ay, az, color, ws = 18, hs = 12) {
  const g = new THREE.SphereGeometry(1, ws, hs);
  g.applyMatrix4(new THREE.Matrix4().makeBasis(ax, ay, az).setPosition(c));
  const P = g.attributes.position, arr = new Float32Array(P.count * 3), cc = new THREE.Color(), p = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) { p.fromBufferAttribute(P, i); cc.set(typeof color === 'function' ? color(p) : color); arr.set([cc.r, cc.g, cc.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}
/** Teilliste [[geo, null, null], …] aus fertig gefärbten Geometrien. */
const own = (gs) => gs.map((g) => [g, null, null]);

// ------------------------------------------------------------------ Kopf und Gesicht
/** Kopfform: rund, etwas breiter als tief, volle Wangen (Kopfmitte HEAD_C, kopf-lokal). */
const HEAD = new HeadShape(HEAD_C, HEAD_R, { sx: 1.0, sy: 0.98, sz: 1.05, bulges: [{ az: 0.72, el: -0.46, w: 0.42, a: 0.012, sym: true }] });
/** Gesicht (Azimut/Elevation auf der Kopfform, Maße in Einheiten): Augen tief und groß (Kindchenschema). */
const FACE = { eyeAz: 0.355, eyeEl: -0.07, eyeW: 0.064, eyeH: 0.09, browAz: 0.37, browEl: 0.29, noseEl: -0.3, mouthEl: -0.47, blushAz: 0.64, blushEl: -0.35 };

/** Kopf: Haut, Stupsnase, Wangenröte, Lächeln, Brauen – eine Geometrie (vertexgefärbt). */
function headGeo(st) {
  return geo(`hero:head:${st.brow}`, () => {
    const skin = col3(SKIN_C), parts = [];
    parts.push(gridGeo({ nu: 32, nv: 20, point: (u, v, out) => HEAD.point(dirAE(u * TAU, -Math.PI / 2 + v * Math.PI), 0, out), color: () => skin }));
    // Stupsnase: kleine runde Kuppe, Spitze leicht rosig
    const nose = col3('#ffb994'), nr = (x, y) => Math.hypot(x / 0.025, y / 0.021);
    parts.push(decalGeo(HEAD, HEAD.frame(0, FACE.noseEl), {
      rings: 4, segs: 16, shape: (r, th) => [0.025 * r * Math.cos(th), 0.021 * r * Math.sin(th)],
      lift: (x, y) => 0.014 * Math.sqrt(Math.max(0, 1 - nr(x, y) ** 2)) - 0.0015, color: (x, y, r) => skin.clone().lerp(nose, 0.55 * (1 - r)),
    }));
    // Wangenröte (weicher Rand)
    const blush = col3('#ff9696');
    for (const s of [1, -1]) {
      parts.push(decalGeo(HEAD, HEAD.frame(s * FACE.blushAz, FACE.blushEl), {
        rings: 3, segs: 16, shape: (r, th) => [0.052 * r * Math.cos(th), 0.032 * r * Math.sin(th)], lift: () => 0.0012,
        color: (x, y, r) => skin.clone().lerp(blush, 0.78 * (1 - smoothstep((r - 0.3) / 0.7))),
      }));
    }
    // Lächeln (Bogen, Mitte kräftiger, Mundwinkel zart nach oben)
    const lip = col3('#a23c42');
    parts.push(stripGeo(HEAD, HEAD.frame(0, FACE.mouthEl), {
      n: 14, across: 2, curve: (t) => [lerp(-0.043, 0.043, t), 0.014 * (2 * t - 1) ** 2 - 0.006],
      width: (t) => 0.0014 + 0.0042 * Math.sin(Math.PI * t) ** 0.7, lift: () => 0.0014, color: () => lip,
    }));
    // Brauen: feine Bögen in dunklerem Haarton
    const brow = col3(st.brow);
    for (const s of [1, -1]) {
      const sg = s > 0 ? 1 : -1;
      parts.push(stripGeo(HEAD, HEAD.frame(s * FACE.browAz, FACE.browEl), {
        n: 10, across: 2, curve: (t) => [sg * lerp(-0.033, 0.036, t), 0.009 * Math.sin(Math.PI * t) - 0.005 * t],
        width: (t) => 0.0043 * (0.5 + 0.5 * Math.sin(Math.PI * Math.min(1, 0.1 + t))), lift: () => 0.0016, color: () => brow,
      }));
    }
    const merged = mergeColored(own(parts));
    for (const g of parts) g.dispose();
    return merged;
  });
}

/** Augen der Heldin (offen, Glanzpunkte, geschlossen) – je Variante (Irisfarbe), geteilt. */
function heroEyeGeos(st) {
  return geo(`hero:eyes:${st.iris}`, () => toonEyeGeos(HEAD, {
    az: FACE.eyeAz, el: FACE.eyeEl, w: FACE.eyeW, h: FACE.eyeH, iris: st.iris, lid: '#2c1a20', lashes: 2, look: 0.1,
    irisW: 0.8, irisH: 0.88, irisY: -0.02, bulge: 0.011, hlSide: 1,
  }));
}

// ------------------------------------------------------------------ Haar
/** Haaransatz (Elevation je Azimut) und Dicke – Lotti: Mittelscheitel, zwei große Pony-Strähnen je Seite, nach hinten zu den Zöpfen. */
const LOTTI_RIM = curveDeg([[0, 0.6], [10, 0.55], [22, 0.45], [32, 0.39], [42, 0.33], [50, 0.2], [58, -0.02], [66, -0.2], [80, -0.3], [96, -0.28], [110, -0.24], [125, -0.38], [150, -0.53], [180, -0.58]]);
const GRETA_RIM = curveDeg([[0, 0.375], [10, 0.37], [20, 0.36], [30, 0.35], [38, 0.33], [44, 0.24], [50, 0.04], [56, -0.25], [62, -0.48], [72, -0.56], [90, -0.6], [180, -0.62]]);
const HAIR = {
  lotti: {
    rim: (a) => { const x = Math.abs(wrapAngle(a)) / deg; return LOTTI_RIM(a) - 0.05 * Math.exp(-(((x - 14) / 7) ** 2)) - 0.04 * Math.exp(-(((x - 34) / 8) ** 2)); },
    thick: (a, el) => {
      const x = Math.abs(wrapAngle(a)), back = Math.abs(wrapAngle(a - Math.PI));
      let t = 0.042 + 0.008 * smoothstep((0.9 - x) / 0.9) * smoothstep((1.0 - el) / 0.6);
      t *= 1 - 0.5 * Math.exp(-((x / 0.07) ** 2)) * smoothstep((el - 0.3) / 0.2) * smoothstep((1.35 - el) / 0.2);   // Mittelscheitel vorn
      t *= 1 - 0.45 * Math.exp(-((back / 0.08) ** 2)) * smoothstep((1.15 - el) / 0.3);                            // Scheitel hinten
      return t * (1 + 0.07 * Math.cos(a * 12) * smoothstep((1.2 - el) / 0.4));
    },
    groove: (a) => Math.pow(0.5 + 0.5 * Math.cos(a * 12), 6),
    part: (a, el) => Math.exp(-((wrapAngle(a) / 0.06) ** 2)) * smoothstep((el - 0.4) / 0.15) * smoothstep((1.3 - el) / 0.2)
      + Math.exp(-((wrapAngle(a - Math.PI) / 0.07) ** 2)) * smoothstep((1.1 - el) / 0.3),
  },
  greta: {
    rim: (a) => {
      const x = Math.abs(wrapAngle(a)) / deg;
      const lock = x < 42 ? Math.pow(0.5 + 0.5 * Math.cos((x / 11) * TAU), 3) * smoothstep((44 - x) / 6) : 0;
      return GRETA_RIM(a) - 0.035 * lock;
    },
    thick: (a, el) => {
      const x = Math.abs(wrapAngle(a));
      const t = 0.046 + 0.006 * smoothstep((0.8 - x) / 0.8) * smoothstep((0.9 - el) / 0.5) + 0.014 * smoothstep((x - 1.9) / 0.6) * smoothstep((0.8 - el) / 0.4);   // hinten voller (Übergang zum langen Haar)
      return t * (1 + 0.06 * Math.cos(a * 14) * smoothstep((1.25 - el) / 0.45));
    },
    groove: (a) => Math.pow(0.5 + 0.5 * Math.cos(a * 14), 6),
    part: () => 0,
  },
};
const hairKind = (st) => (st.braids ? HAIR.lotti : HAIR.greta);

/** Farbe der Haarschale: Rillen und Wulst-Unterseite dunkler, Glanzband oben vorn (von den Rillen unterbrochen). */
function hairColorFn(st) {
  const base = col3(st.hair), tip = col3(st.hairTip), dk = col3(st.hairDark), H = hairKind(st);
  return (a, el, k) => {
    const g = H.groove(a);
    const c = base.clone().lerp(dk, 0.2 * g + 0.3 * (1 - smoothstep(k / 0.12)) + 0.35 * H.part(a, el));
    const band = Math.exp(-(((el - 0.97) / 0.12) ** 2)) * (0.45 + 0.55 * Math.cos(a)) * (1 - 0.7 * g);
    return c.lerp(tip, 0.85 * band);
  };
}

/** Haarschale (ganz oder nur der Pony vorn, z. B. unter der Kapuze). */
function hairShell(st, front = false) {
  const H = hairKind(st);
  return hairShellGeo(HEAD, {
    rim: H.rim, thick: H.thick, color: hairColorFn(st), nA: front ? 28 : 56, rows: front ? 4 : 9, lipRows: 4,
    ...(front ? { aFrom: -1.25, aTo: 1.25 } : {}),
  });
}

/** Punkt auf der Haaroberfläche in Richtung d (+ extra). */
function onHair(st, d, extra = 0) {
  const H = hairKind(st), a = Math.atan2(d.z, d.x), el = Math.asin(clamp(d.y, -1, 1));
  return HEAD.point(d, H.thick(a, el) + extra);
}

/** Schleife (Lotti): zwei bauschige Schlaufen, Knoten, zwei kurze Bänder – oben hinten, zur nahen Seite. */
function bowGeos(st) {
  const d = dirAE(2.35, 0.98).normalize(), f = HEAD.frame(2.35, 0.98);
  const c = onHair(st, d, 0.03), n = f.n, T = f.T.clone().negate(), B = f.B;
  const acc = col3(st.accent), fold = acc.clone().multiplyScalar(0.62);
  const shadeAt = (p) => acc.clone().lerp(fold, Math.exp(-p.distanceToSquared(c) / 0.0016));
  const out = [];
  for (const s of [1, -1]) {
    const q = new THREE.Quaternion().setFromAxisAngle(n, s * 0.32);
    const ax = T.clone().applyQuaternion(q), ay = B.clone().applyQuaternion(q);
    out.push(ellipsoidGeo(c.clone().addScaledVector(ax, s * 0.095).addScaledVector(n, -0.004), ax.clone().multiplyScalar(0.105), ay.clone().multiplyScalar(0.07), n.clone().multiplyScalar(0.05), shadeAt, 16, 12));
    const tc = c.clone().addScaledVector(B, -0.075).addScaledVector(T, s * 0.032);
    out.push(ellipsoidGeo(tc, T.clone().multiplyScalar(0.026).applyAxisAngle(n, s * 0.35), B.clone().multiplyScalar(0.058).applyAxisAngle(n, s * 0.35), n.clone().multiplyScalar(0.018), acc, 10, 8));
  }
  out.push(ellipsoidGeo(c.clone().addScaledVector(n, 0.012), T.clone().multiplyScalar(0.042), B.clone().multiplyScalar(0.046), n.clone().multiplyScalar(0.036), acc.clone().multiplyScalar(0.92), 12, 8));
  return out;
}

/** Haarreif (Greta): dicke, glänzende Spange über den Kopf, leicht nach hinten gekippt, runde Enden. */
function headbandGeos(st) {
  const beta = 0.3, pts = [];
  for (let i = 0; i <= 24; i++) {
    const ph = lerp(-1.62, 1.62, i / 24);
    const d = V(-Math.sin(beta) * Math.cos(ph), Math.cos(beta) * Math.cos(ph), Math.sin(ph)).normalize();
    pts.push(onHair(st, d, 0.02));
  }
  const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.028, 6, false);
  const acc = col3(st.accent);
  const tint = (g, c) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  const caps = [pts[0], pts[pts.length - 1]].map((p) => tint(new THREE.SphereGeometry(0.029, 8, 5).translate(p.x, p.y, p.z), acc));
  return [tint(tube, acc), ...caps];
}

/** Haar-Mesh: Schale + Schleife und Zopfansätze (Lotti) bzw. Haarreif (Greta). Teile für mergeColored. */
function hairParts(st) {
  const gs = [hairShell(st)];
  if (st.braids) {
    gs.push(...bowGeos(st));
    const hc = col3(st.hair);
    for (const s of [1, -1]) gs.push(ellipsoidGeo(V(BRAID.anchor.x, BRAID.anchor.y + 0.005, s * BRAID.anchor.z), V(0.066, 0, 0), V(0, 0.074, 0), V(0, 0, 0.066), hc, 16, 12));
  } else gs.push(...headbandGeos(st));
  return own(gs);
}

/**
 * Zopf (Lotti): Kette aus drei Gliedern, hängt am Ansatz hinter dem Ohr. Die Oberfläche ist ein
 * geflochtener Strang: zwei um 180° versetzte Wülste, die sich spiralig um die Achse drehen, mit
 * zusätzlicher Verdickung je Strang dort, wo er vorn/hinten liegt (versetzte Flechtwülste, flache
 * Seiten wie bei einem echten Zopf). Vertexfarben: Kämme hell (Glanz), Rinnen dunkel. Das letzte Glied trägt
 * das rote Haargummi (bauschig) und eine aufgefächerte Quaste aus hellen Spitzen. Maße relativ zum Glied-Drehpunkt.
 */
const BRAID = {
  anchor: V(HEAD_C.x - 0.09, HEAD_C.y - 0.01, 0.29), // Ansatz hinter dem Ohr, knapp in der Kappe (z je Seite ±)
  links: [0.12, 0.11, 0.10],   // Gliedlängen → Zopfkörper 0,33 (+ Haargummi 0,04 + Quaste ≈ 0,09)
  r0: 0.054, r1: 0.04,         // Radius oben / am Haargummi (kräftig, spielzeughaft)
  twist: 40,                   // rad je Einheit: Drehung der Wülste um die Achse
  lobe: 0.7, q: 0.6,           // Tiefe und Rundung der Rinne zwischen den Strängen
  bump: 0.10,                  // Verdickung je Strang vorn/hinten
  overlap: 0.03,               // jedes Glied steckt oben im vorigen
  tie: 0.04,                   // Haargummi
};
const BRAID_LEN = BRAID.links.reduce((a, b) => a + b, 0);

/** Geometrie eines Zopfglieds (geteilt je Variante, Glied und Seite; side spiegelt die Drehrichtung). */
function braidLinkGeo(st, k, side) {
  return geo(`hero:braid:${st.hair}:${st.accent}:${k}:${side}`, () => {
    const len = BRAID.links[k], y0 = BRAID.links.slice(0, k).reduce((a, b) => a + b, 0);
    const rings = 12, segs = 14, period = TAU / BRAID.twist;
    const base = col3(st.hair), tip = col3(st.hairTip), dk = col3(st.hairDark);
    const pos = [], uv = [], col = [], idx = [];
    const c = new THREE.Color();
    for (let i = 0; i <= rings; i++) {
      const yl = BRAID.overlap - (len + BRAID.overlap) * (i / rings); // lokal: +overlap … -len
      const yg = y0 - yl;                                              // Abstand vom Ansatz (nach unten)
      let R = lerp(BRAID.r0, BRAID.r1, clamp(yg / BRAID_LEN, 0, 1));
      if (yl > 0) R *= 1 - 0.35 * (yl / BRAID.overlap);               // oben einziehen (steckt im Elternglied)
      const psi = side * BRAID.twist * yg;
      for (let j = 0; j < segs; j++) {
        const th = (j / segs) * TAU;
        const cc = Math.cos(th - psi);
        const lobe = Math.pow(Math.abs(cc), BRAID.q);
        const bump = Math.cos((TAU * yg) / period) * cc;
        const r = R * (BRAID.lobe + (1 - BRAID.lobe) * lobe) * (1 + BRAID.bump * bump);
        pos.push(r * Math.sin(th), yl, r * Math.cos(th));
        uv.push(j / segs, i / rings);
        // Rinnen dunkel, Kämme hell mit Glanz
        c.copy(base).lerp(dk, 0.55 * (1 - lobe)).lerp(tip, 0.35 * Math.max(0, lobe * (0.5 + 0.5 * bump)) ** 2);
        col.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) {
      const a = i * segs + j, b = i * segs + ((j + 1) % segs), cc = a + segs, d = b + segs;
      idx.push(a, cc, b, b, cc, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    if (k < BRAID.links.length - 1) return g;
    // Letztes Glied: bauschiges Haargummi über dem Zopfende, darunter die Quaste (fünf Strähnen + Mittelbüschel)
    const yTie = -len - BRAID.tie / 2, yT = -len - BRAID.tie;
    const parts = [[g, null, null], part(torus(0.034, 0.02, 8, 14), st.accent, { y: yTie, rx: Math.PI / 2 }), part(cylinder(0.036, 0.036, BRAID.tie * 0.7, 14), st.accent, { y: yTie })];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + 0.3, tilt = 0.36;
      const d = V(Math.sin(tilt) * Math.cos(a), -Math.cos(tilt), Math.sin(tilt) * Math.sin(a));
      parts.push([sphere(1, 10, 6), st.hairTip, placed(V(0, yT + 0.004, 0).addScaledVector(d, 0.05), d, V(0.024, 0.024, 0.058))]);
    }
    parts.push(part(sphere(1, 10, 6), st.hairTip, { y: yT - 0.035, sx: 0.034, sy: 0.052, sz: 0.034 }));
    const merged = mergeColored(parts);
    g.dispose();
    return merged;
  });
}

/**
 * Offenes langes Haar (Greta): runder, voller Haarschopf hinter Kopf und Rücken (Ursprung oben, hängt nach −Y). Querschnitt
 * rund gewölbt (hinten voll, zum Rücken hin flach), über die Rückseite sieben Strähnen mit Rinnen, die nach unten tiefer
 * werden, unten einzelne Spitzen verschieden lang mit Schwung nach hinten; Glanzband auf den Strähnen, Spitzen heller.
 * Ein Mesh wie bisher (kein zusätzlicher Zeichenaufruf). Von hinten keine Platte mehr, im Salto ein Schopf statt einer Scheibe.
 */
const MANE_LEN = 0.74;
const MANE_N = 7;                                      // Strähnen über die Rückseite
const MANE_TIPS = [0.25, 0.6, 0.72, 1.0, 0.85, 0.48, 0.2];   // Länge der Spitzen je Strähne (Anteil; Mitte länger → runder Abschluss)
/** Lage auf der Rückseite: across 0..1 (rechts → links), back 0..1 (Gewicht Rückseite), ridge 0 (Rinne) … 1 (Strähnenmitte). */
function maneAt(th) {
  const c = Math.cos(th), back = smoothstep((-c + 0.15) / 0.5);
  const across = clamp((wrapAngle(th - Math.PI) + Math.PI / 2) / Math.PI, 0, 1);
  const ridge = Math.pow(Math.abs(Math.sin(Math.PI * MANE_N * across)), 0.6);
  return { c, back, across, ridge, k: Math.min(MANE_N - 1, Math.floor(across * MANE_N)) };
}
function maneGeo(st) {
  return geo(`hero:mane2:${st.hair}`, () => {
    const base = col3(st.hair), tip = col3(st.hairTip), dk = col3(st.hairDark);
    // oberes Drittel steckt in der Haarschale (Hinterkopf), darunter fällt der Schopf über den Rücken
    const env = (v) => Math.pow(Math.sin((Math.PI / 2) * Math.min(1, v / 0.3)), 0.6) * (v > 0.84 ? Math.sqrt(Math.max(0, 1 - ((v - 0.84) / 0.16) ** 2)) : 1);
    return gridGeo({
      nu: 56, nv: 16, flip: true,
      point: (u, v, out) => {
        const th = u * TAU, m = maneAt(th), e = env(v), sz = Math.sin(th);
        const low = smoothstep((v - 0.45) / 0.45), curl = smoothstep((v - 0.76) / 0.24);
        const rmod = 1 + (0.06 + 0.1 * low) * (m.ridge - 0.6) * m.back;
        const wz = (0.3 - 0.11 * v * v + 0.02 * Math.sin(Math.PI * v)) * e * rmod;
        const wx = (m.c < 0 ? 0.12 + 0.03 * Math.sin(Math.PI * v) : 0.06) * e * rmod;
        const cx = -0.15 - 0.03 * v - 0.05 * curl;
        const tipY = 0.1 * MANE_TIPS[m.k] * m.ridge * m.back * smoothstep((v - 0.68) / 0.32);
        const y = -MANE_LEN * v - tipY + 0.035 * curl;
        return out.set(cx + wx * m.c - 0.3 * tipY * curl, y, wz * sz);
      },
      color: (u, v) => {
        const m = maneAt(u * TAU);
        const c = base.clone().lerp(dk, (0.38 * (1 - m.ridge) * (0.5 + 0.5 * smoothstep((v - 0.25) / 0.4)) + 0.12) * m.back + 0.2 * (1 - m.back));
        const band = Math.exp(-(((v - 0.4) / 0.09) ** 2)) * m.back * m.ridge;
        return c.lerp(tip, Math.max(0.45 * band, 0.6 * smoothstep((v - 0.76) / 0.2)) + 0.12 * m.ridge * m.back);
      },
    });
  });
}

/** Zwei Strähnen vor den Schultern (Greta): flach, verjüngt, Spitze rollt sich nach vorn ein. Ursprung = Kopfmitte. */
function locksGeo(st) {
  return geo(`hero:locks:${st.hair}`, () => {
    const base = col3(st.hair), tip = col3(st.hairTip), dk = col3(st.hairDark);
    const gs = [1, -1].map((s) => gridGeo({
      nu: 10, nv: 10, flip: true,
      point: (u, v, out) => {
        const th = u * TAU, curl = smoothstep((v - 0.65) / 0.35);
        const e = Math.sqrt(Math.sin((Math.PI / 2) * Math.min(1, v / 0.12))) * (v > 0.9 ? Math.sqrt(Math.max(0, 1 - ((v - 0.9) / 0.1) ** 2)) : 1);
        const cx = 0.03 + 0.02 * v + 0.05 * curl, cy = -0.04 - 0.4 * v + 0.03 * curl * curl, cz = s * (0.272 - 0.03 * v);
        const wx = 0.056 * (1 - 0.45 * v) * e, wz = 0.03 * (1 - 0.3 * v) * e;
        return out.set(cx + wx * Math.cos(th), cy, cz + wz * Math.sin(th));
      },
      color: (u, v) => base.clone().lerp(dk, 0.2 * Math.pow(0.5 + 0.5 * Math.cos(u * TAU * 3), 4)).lerp(tip, 0.55 * smoothstep((v - 0.6) / 0.35)),
    }));
    const m = mergeGeometries(gs, false);
    for (const g of gs) g.dispose();
    return m;
  });
}

// ------------------------------------------------------------------ Kleid
/** Mieder als Drehkörper (Taille → Schultern → Hals), becken-lokal; Querschnitt vorn/hinten etwas flacher. */
const BODICE = smoothProfile2([[0.0, 0.02], [0.118, 0.035], [0.138, 0.1], [0.15, 0.19], [0.152, 0.27], [0.142, 0.335], [0.118, 0.39], [0.082, 0.43], [0.0, 0.452]], 18);
const BODICE_SX = 0.9;
const bodiceR = (y) => {
  for (let i = 1; i < BODICE.length; i++) if (y <= BODICE[i][1]) { const [r0, y0] = BODICE[i - 1], [r1, y1] = BODICE[i]; return r0 + ((r1 - r0) * (y - y0)) / Math.max(1e-6, y1 - y0); }
  return 0;
};
/** Punkt auf dem Mieder: s = Bogenlänge quer (vorn 0, +s → +Z), t = Höhe (becken-lokal), lift über der Oberfläche. */
const onBodice = (s, t, lift, out) => {
  const r = bodiceR(t), phi = s / Math.max(0.05, r);
  return out.set(Math.cos(phi) * (r + lift) * BODICE_SX, t, Math.sin(phi) * (r + lift));
};

/** Oberkörper: Mieder, Bubikragen, Puffärmel; Lotti weißer Blusen-Einsatz, Greta Schürzenlatz mit Trägern. */
function torsoParts(st) {
  const dress = col3(st.dress), white = col3(st.collar ?? WHITE_C), sleeve = col3(st.sleeve);
  const gs = [latheGeo(BODICE, { segs: 22, sx: BODICE_SX, smooth: false, color: () => dress })];
  // Bubikragen: gerollter Ring + zwei runde Kragenecken vorn
  gs.push(ellipsoidGeo(V(0, 0.428, 0), V(0.1, 0, 0), V(0, 0.032, 0), V(0, 0, 0.104), white, 20, 8));
  for (const s of [1, -1]) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(s * -0.35, s * 0.55, -0.55, 'YXZ'));
    gs.push(ellipsoidGeo(V(0.082, 0.41, s * 0.052), V(0.062, 0, 0).applyQuaternion(q), V(0, 0.016, 0).applyQuaternion(q), V(0, 0, 0.054).applyQuaternion(q), white, 10, 6));
  }
  // Puffärmel mit Raffung (helle/dunkle Falten), leicht nach außen gekippt
  for (const s of [1, -1]) {
    const g = latheGeo([[0.0, -0.085], [0.07, -0.072], [0.1, -0.03], [0.104, 0.0], [0.09, 0.045], [0.05, 0.07], [0.0, 0.078]], {
      segs: 16, steps: 8, radius: (phi, y, r) => r * (1 + 0.05 * Math.cos(8 * phi) * (1 - Math.abs(y) / 0.09)),
      color: (phi) => sleeve.clone().multiplyScalar(0.94 + 0.06 * Math.cos(8 * phi)),
    });
    g.applyMatrix4(new THREE.Matrix4().compose(V(0, SHOULDER_Y - 0.005, s * 0.205), new THREE.Quaternion().setFromEuler(new THREE.Euler(s * 0.38, 0, 0)), V(1, 1, 1)));
    gs.push(g);
  }
  if (st.blouse) {
    // Blusen-Einsatz unter dem Kragen (weiß, runder Ausschnitt)
    gs.push(paramDecalGeo(onBodice, { rings: 2, segs: 20, flip: true, shape: (r, th) => [0.068 * r * Math.cos(th), 0.37 + 0.045 * r * Math.sin(th)], lift: () => 0.004, color: () => white }));
  }
  if (st.apron) {
    const apron = col3(st.apronC ?? WHITE_C), edge = apron.clone().multiplyScalar(0.9);
    const sq = (r, th, a, b, cy, p = 4) => { const c = Math.cos(th), s2 = Math.sin(th); return [a * r * Math.sign(c) * Math.abs(c) ** (2 / p), cy + b * r * Math.sign(s2) * Math.abs(s2) ** (2 / p)]; };
    gs.push(paramDecalGeo(onBodice, { rings: 3, segs: 22, flip: true, shape: (r, th) => sq(r, th, 0.072, 0.085, 0.235), lift: () => 0.006, color: (s, t, r) => apron.clone().lerp(edge, smoothstep((r - 0.85) / 0.15)) }));
    // Träger über die Schultern
    for (const s of [1, -1]) {
      const pts = [[0.055, 0.31], [0.075, 0.37], [0.13, 0.415], [0.22, 0.41], [0.32, 0.36], [0.4, 0.3]].map(([a, t]) => onBodice(s * a, t, 0.008, new THREE.Vector3()));
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.012, 5, false);
      gs.push(tintGeo(g, apron));
    }
  }
  return own(gs);
}
/** Geometrie einfarbig tönen (Vertexfarbe). */
function tintGeo(g, c) {
  const cc = col3(c), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([cc.r, cc.g, cc.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}

/** Rock: Glocke mit weichen Bahnen, gerolltem Saum und Futter (geschlossen, eine Seite genügt); becken-lokal. */
const SKIRT_PROF = smoothProfile2([[0.1, 0.17], [0.16, 0.08], [0.22, -0.02], [0.268, -0.1], [0.287, -0.133], [0.303, -0.144], [0.318, -0.132], [0.315, -0.106], [0.292, -0.05], [0.256, 0.02], [0.212, 0.09], [0.174, 0.15], [0.155, 0.195], [0.1, 0.214], [0.0, 0.22]], 25);
const SKIRT_HEM = SKIRT_PROF.reduce((k, p, i) => (p[1] < SKIRT_PROF[k][1] ? i : k), 0);                 // tiefster Punkt (Saum)
const SKIRT_IN = SKIRT_PROF.findIndex((p) => p[1] < -0.12);                                          // ab hier Saumwulst
const SKIRT_OUT = SKIRT_PROF.slice(SKIRT_HEM);                                                        // Außenseite (aufsteigend)
const skirtPleat = (phi, y) => 1 + 0.026 * Math.cos(6 * phi) * smoothstep((0.12 - y) / 0.25);
function skirtGeo(c) {
  const dress = col3(c), lining = dress.clone().multiplyScalar(0.7);
  return latheGeo(SKIRT_PROF, {
    segs: 26, smooth: false, radius: (phi, y, r) => r * skirtPleat(phi, y),
    color: (phi, y, p, k) => (k < SKIRT_IN ? lining : dress.clone().multiplyScalar(0.95 + 0.05 * Math.cos(6 * phi))),
  });
}
/** Außenradius des Rocks in Höhe t (ohne Bahnen). */
function skirtR(t) {
  const P = SKIRT_OUT;
  if (t <= P[0][1]) return P[0][0];
  for (let i = 1; i < P.length; i++) if (t <= P[i][1]) { const [r0, y0] = P[i - 1], [r1, y1] = P[i]; return r0 + ((r1 - r0) * (t - y0)) / Math.max(1e-6, y1 - y0); }
  return 0;
}
/** Punkt auf der Rock-Außenseite (für die Schürze): s = Bogenlänge quer (vorn 0), t = Höhe. */
function onSkirt(s, t, lift, out) {
  const r = skirtR(t), phi = s / Math.max(0.1, r), R = r * skirtPleat(phi, t) + lift;
  return out.set(Math.cos(phi) * R, t, Math.sin(phi) * R);
}
/** Rock-Teile: Rock (Greta mit Schürze und Schleife hinten). */
function skirtParts(st) {
  const gs = [skirtGeo(st.dress)];
  if (st.apron) {
    const apron = col3(st.apronC ?? WHITE_C), shade = apron.clone().multiplyScalar(0.86);
    gs.push(paramDecalGeo(onSkirt, {
      rings: 4, segs: 24, flip: true,
      shape: (r, th) => { const c = Math.cos(th), s2 = Math.sin(th); return [0.2 * r * Math.sign(c) * Math.abs(c) ** 0.6, 0.035 + 0.135 * r * Math.sign(s2) * Math.abs(s2) ** (s2 < 0 ? 0.9 : 0.4)]; },
      lift: () => 0.008, color: (s, t, r) => apron.clone().lerp(shade, smoothstep((r - 0.82) / 0.18)),
    }));
    // Schürzenschleife hinten an der Taille
    const k = V(-0.158, 0.17, 0);
    for (const s of [1, -1]) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(s * 0.4, 0, 0));
      gs.push(ellipsoidGeo(k.clone().add(V(-0.012, 0.012, s * 0.06)), V(0.025, 0, 0), V(0, 0.042, 0).applyQuaternion(q), V(0, 0, 0.065).applyQuaternion(q), apron, 8, 6));
      gs.push(ellipsoidGeo(k.clone().add(V(-0.01, -0.07, s * 0.03)), V(0.012, 0, 0), V(0, 0.06, 0).applyAxisAngle(V(1, 0, 0), s * 0.25), V(0, 0, 0.022), apron, 6, 5));
    }
    gs.push(ellipsoidGeo(k.clone().add(V(-0.016, 0.008, 0)), V(0.022, 0, 0), V(0, 0.028, 0), V(0, 0, 0.026), shade, 8, 6));
  }
  return own(gs);
}

// ------------------------------------------------------------------ Arme, Beine, Schuhe
/** Arm (arm-lokal, hängt vom Schulter-Drehpunkt nach −Y): kräftige, leicht verjüngte Röhre, runde Fäustlings-Hand mit Daumen. */
function armParts(withHand = true) {
  const skin = col3(SKIN_C);
  const tube = latheGeo([[0.0, -ARM - ARM_R * 0.9], [ARM_R * 0.85, -ARM - ARM_R * 0.5], [ARM_R * 0.93, -ARM], [ARM_R * 0.97, -ARM * 0.5], [ARM_R, -0.02], [ARM_R * 0.8, 0.03], [0.0, 0.05]], { segs: 10, steps: 9, color: () => skin });
  const gs = [tube];
  if (withHand) gs.push(...handGeos());
  return own(gs);
}
/** Fäustling: runde, etwas flache Hand, Daumen nach vorn (+X). */
function handGeos() {
  const skin = col3(SKIN_C), kn = skin.clone().lerp(col3('#ffb9a0'), 0.25);
  return [
    ellipsoidGeo(V(0.004, -HAND, 0), V(HAND_R, 0, 0), V(0, HAND_R * 1.06, 0), V(0, 0, HAND_R * 0.86), (p) => skin.clone().lerp(kn, smoothstep((-HAND - 0.02 - p.y) / 0.05) * 0.6), 14, 10),
    ellipsoidGeo(V(HAND_R * 0.72, -HAND + 0.026, 0), V(0.03, 0.012, 0), V(-0.012, 0.04, 0), V(0, 0, 0.028), skin, 10, 6),
  ];
}

/** Oberschenkel (hip-lokal) und Unterschenkel (knie-lokal): weiche, kräftige Röhren; Lotti Stiefelschaft mit Umschlag. */
function thighGeo() {
  return geo('hero:thigh', () => latheGeo([[0.0, -THIGH - 0.064], [0.058, -THIGH - 0.04], [0.068, -THIGH], [0.072, -THIGH * 0.5], [0.074, -0.01], [0.05, 0.05], [0.0, 0.07]], { segs: 12, steps: 10, color: () => col3(SKIN_C) }));
}
function shinGeo(st) {
  return geo(`hero:shin:${st.bootShaft ? st.boot : 'skin'}:${st.socks ? 1 : 0}`, () => {
    const c = col3(st.bootShaft ? st.boot : SKIN_C), white = col3(WHITE_C);
    const g = latheGeo([[0.0, -SHIN - 0.06], [0.055, -SHIN - 0.035], [0.064, -SHIN], [0.066, -SHIN * 0.5], [0.068, -0.01], [0.05, 0.045], [0.0, 0.062]], { segs: 12, steps: 10, color: () => c });
    const extra = [];
    // Lotti: Stiefelschaft mit hellerem Umschlag unter dem Knie
    if (st.bootShaft) extra.push(latheGeo([[0.06, -0.06], [0.08, -0.052], [0.086, -0.03], [0.08, -0.008], [0.06, 0.0]], { segs: 14, steps: 6, color: () => col3(st.cuff) }));
    // Greta: Söckchen mit Rüsche am Knöchel
    if (st.socks) extra.push(latheGeo([[0.05, -SHIN - 0.03], [0.069, -SHIN - 0.02], [0.07, -SHIN + 0.04], [0.082, -SHIN + 0.05], [0.084, -SHIN + 0.068], [0.07, -SHIN + 0.075], [0.064, -SHIN + 0.07]], { segs: 14, steps: 7, radius: (phi, y, r) => r * (y > -SHIN + 0.045 ? 1 + 0.06 * Math.cos(9 * phi) : 1), color: () => white }));
    if (!extra.length) return g;
    const m = mergeGeometries([g, ...extra], false); g.dispose(); for (const e of extra) e.dispose();
    return m;
  });
}
/** Schuh (knöchel-lokal, Sohle bei y = −ANKLE_H): großer, runder, glänzender Schuh; Greta mit Riemchen und Söckchen. */
function shoeGeo(c, sole, { strap = null, welt = true } = {}) {
  const base = col3(c), soleC = col3(sole), weltC = base.clone().lerp(col3('#ffffff'), 0.18);
  const env = (v) => Math.pow(Math.sin(Math.PI * v), 0.42);
  const g = blobGeo({
    x0: -0.088, x1: 0.222, nu: 18, nv: 13,
    hy: (v) => (0.056 + 0.006 * v) * env(v), hz: (v) => (0.066 + 0.026 * smoothstep(v * 1.2)) * env(v), yc: (v) => -0.084 - 0.006 * v,
    deform: (p) => { if (p.y < -0.12) p.y = -0.12 + (p.y + 0.12) * 0.62; },
    color: (p) => (p.y < -0.128 ? soleC : welt && p.y < -0.12 ? weltC : base),
  });
  // Sohle genau auf −ANKLE_H legen
  const P = g.attributes.position; let lo = 1e9;
  for (let i = 0; i < P.count; i++) lo = Math.min(lo, P.getY(i));
  g.translate(0, -ANKLE_H - lo, 0);
  if (!strap) return [g];
  const st = new THREE.TorusGeometry(0.074, 0.011, 4, 12, Math.PI);
  st.applyMatrix4(new THREE.Matrix4().compose(V(0.05, -0.07, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)), V(1, 1.05, 1)));
  const btn = [1, -1].map((s) => new THREE.SphereGeometry(0.013, 6, 4).translate(0.05, -0.072, s * 0.076));
  return [g, tintGeo(st, strap), ...btn.map((b) => tintGeo(b, '#f6e3b4'))];
}
/** Stiefel/Schuh am Knöchel (Greta: Riemchenschuh; Söckchen sitzen am Unterschenkel). */
function bootParts(st) {
  return own(shoeGeo(st.boot, st.sole, { strap: st.strap ? new THREE.Color(st.boot).multiplyScalar(0.7) : null }));
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
  figZo: 0, // Welt 3: seitlicher Versatz der ganzen Figur (Kurvenneigung um die Kufen statt um den Schwerpunkt)
  // Welt 5: Gummi-Arme (Streckung über die Armlänge hinaus, Einheiten; Unterarm-Knochen rückt nach außen) und Rock-Flattern
  // armKn/armKf: Maßstab des Kurs-Arms (gleichmäßig: kräftigere Arme und größere Fäuste, solange er gestreckt ist)
  reachN: 0, reachF: 0, armKn: 1, armKf: 1, skirtX: 0, skirtZ: 0,
};

// ================================================================== Kurs-Modus: Maße, Kostüme
// 1,5 Avatar-Einheiten = 1,0 m (groß) bzw. 0,7 m (klein); die Hülle skaliert der Kurs-Code.
const PIVOT_Y = 0.78;   // Drehpunkt für Saltos und Körperlage (Schwerpunkt, Einheiten über dem Fußpunkt)
const ELBOW_Y = 0.13;   // Ellbogen unter der Schulter (Kurs-Arme)
const ANKLE_H = 0.14;   // Knöchel über der Sohle bei waagerechtem Stiefel
const unitsPerMeter = (big) => 1.5 / (big === false ? 0.7 : 1.0);
// Kontaktmaße (Einheiten, Fußpunkt = root, Blick +X) – per tests/coursepose3d.mjs nachgemessen:
const WS_REACH = 0.409;   // wallslide: so weit reichen Hand/Sohle/Rock hinter root (−X) ohne Versatz
const CL_REACH = 0.409;   // climb: so weit reichen die Hände vor root (+X) ohne Versatz
const BS_REACH = 0.457;   // beanstalk: Rankenachse liegt ohne Versatz so weit vor root
const VINE_M = 0.25;     // beanstalk: Rankenachse vor root (Meter, Vertrag mit dem Motor)
const WATER_U = 0.75;    // swim: Wasserlinie über root (Einheiten; groß 0,5 m)
const SWIM_Y0 = -0.12, SWIM_Y1 = -0.05; // swim: Höhenversatz Wassertreten / Brustschwimmen (Hals knapp über der Wasserlinie)
const CREAM_C = '#fff3df', PAD_C = '#ff9cb6', CLAW_C = '#fffdf8';
const FIRE_WHITE = '#fff8ee', FIRE_RED = '#e8392d';
/** Farbe zur Creme hin aufhellen (Pastell-Streifen). */
const pastel = (hex, k = 0.62) => `#${new THREE.Color(hex).lerp(new THREE.Color(CREAM_C), k).getHexString()}`;
/** Zustände, in denen die Heldin an Wand/Ranke hängt (das Feld `climbing` erzwingt sonst 'climb'). */
const CLIMB_STATES = new Set(['climb', 'beanstalk', 'wallslide', 'walljump', 'fence']);
/** Zustände, in denen `holding` die Arme übernimmt (Tragen vorn bzw. über dem Kopf). */
const HOLD_STATES = new Set(['idle', 'walk', 'run', 'skid', 'jump', 'jump2', 'fall', 'land', 'crouch', 'skate']);
/** Kostüme per Geometrie-Tausch (power-Werte). */
const COSTUMES = new Set(['krallen', 'funken', 'gleitblatt']);
/** Zustände, in denen angelegte Schlittschuhe an bleiben (Sprünge vom Eis, Landung). */
const SKATE_KEEP = new Set(['skate', 'jump', 'jump2', 'jump3', 'fall', 'land', 'longjump', 'backflip', 'sideflip', 'skid', 'hurt', 'throw', 'claw', 'tailswipe', 'glide']);

// Welt 5: Trapez und Röhrenkanone (Maße in Metern, sofern nicht anders vermerkt)
const TRAPEZE = {
  body: { big: 0.95, small: 0.65 },   // Körperhöhe der Hitbox (Motor: HITBOX.*.y · 2)
  arm: 0.26,                          // Hände über dem Scheitel (Motor: SWING.arm) → Stange liegt body + arm über dem Fußpunkt
  bend: 0.06,                         // Modell 'trapez' biegt sich mit Reiterin um 2 % der Seillänge (3 m) durch
  clear: 1.6,                         // Einheiten: liegt die Stangenmitte tiefer über dem Fußpunkt, passt der Kopf nicht darunter
  grip: V(0.034, 0.008, 0.56),        // Fäuste vor (x, m), über (y, m) der Stangenmitte, seitlich (±z, Einheiten) – V um den Kopf
  half: 0.47,                         // Fäuste höchstens so weit von der Stangenmitte (Seile bei ±0,6)
  armK: 1.25,                         // Maßstab der gestreckten Arme (Gummi-Arme kräftiger, Fäuste größer)
  hold: 0.45,                         // Einheiten: Riesentrank – Körper hängt so weit hinter der Stange, hält sie vor dem Bauch
  wRef: 2.6,                          // rad/s: Schwunggeschwindigkeit, ab der die Beine voll nachlaufen
  release: 0.3,                       // s: Überblendung beim Absprung/Fallenlassen
};
const CANNON = { pitchMin: -2.25, pitchMax: -0.25, land: 0.8 };

/** Kostüm-Farben „Funkenblüte“: Kleid feuerweiß, Ärmel/Kragen/Schürze rot, Haarschmuck weiß (Lotti) bzw. rot (Greta). */
const fireStyle = (st) => ({ ...st, dress: FIRE_WHITE, sleeve: FIRE_RED, collar: FIRE_RED, apronC: FIRE_RED, accent: st.braids ? FIRE_WHITE : FIRE_RED });

/** Kurs-Arm (Ober- und Unterarm mit Ellbogen, eine SkinnedMesh): kräftige Röhre, Fäustling bzw. Tatzen-Handschuh, ggf. Peace-Finger. */
function courseArmGeo(st, kind) {
  return geo(`hero:carm:${kind}:${kind === 'glove' ? st.dress : ''}`, () => {
    const parts = armParts(kind !== 'glove');
    if (kind === 'glove') parts.push(...gloveParts(st));
    if (kind === 'peace') {
      // Zeige- und Mittelfinger als V, in Verlängerung des Unterarms
      for (const s of [1, -1]) {
        const d = V(0.1, -1, s * 0.42).normalize();
        parts.push([capsule(0.023, 0.05, 3, 8), SKIN_C, new THREE.Matrix4().compose(V(0, -HAND, 0).addScaledVector(d, 0.09), new THREE.Quaternion().setFromUnitVectors(UP, d), V(1, 1, 1))]);
      }
    }
    return skinTwoBones(mergeColored(parts), -ELBOW_Y + 0.04, -ELBOW_Y - 0.05);
  });
}

/** Tatzen-Handschuh (Krallen-Anzug, arm-lokal): Fäustling in Kleidfarbe, Bündchen, Ballen, Zehenballen, drei Krallen. */
function gloveParts(st) {
  const H = -HAND;
  const parts = [
    part(sphere(0.093, 18, 12), st.dress, { y: H - 0.004, sy: 1.07, sz: 0.92 }),
    part(torus(0.064, 0.023, 8, 16), CREAM_C, { y: H + 0.078, rx: Math.PI / 2 }),
    [unitSphere(), PAD_C, placed(V(0.086, H - 0.014, 0), V(1, 0, 0), V(0.038, 0.036, 0.014))],
  ];
  for (const z of [-0.038, 0, 0.038]) {
    parts.push([unitSphere(), PAD_C, placed(V(0.064, H - 0.07, z), V(0.7, -0.7, 0), V(0.018, 0.018, 0.01))]);
    parts.push(part(cone(0.012, 0.04, 6), CLAW_C, { x: 0.042, y: H - 0.104, z, rz: Math.PI + 0.45 }));
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
  parts.push([hairShell(st, true), null, null]);
  if (st.braids) for (const s of [1, -1]) parts.push([ellipsoidGeo(V(BRAID.anchor.x, BRAID.anchor.y + 0.005, s * BRAID.anchor.z), V(0.066, 0, 0), V(0, 0.074, 0), V(0, 0, 0.066), col3(st.hair), 16, 12), null, null]);
  return parts;
}
/** Geringelter Puschelschweif am Rock (Krallen-Anzug), becken-lokal. */
function tailParts(st) {
  const ring = pastel(st.dress);
  return [[-0.29, -0.045, 0.07, st.dress], [-0.35, 0.0, 0.078, ring], [-0.4, 0.07, 0.08, st.dress], [-0.425, 0.15, 0.074, ring], [-0.425, 0.222, 0.06, CREAM_C]]
    .map(([x, y, r, c]) => part(sphere(r, 12, 10), c, { x, y }));
}

// ================================================================== Welt 3: Gleitblatt, Schlittschuhe, Statue, Zaun
const FENCE_M = 0.38;         // fence: Zaunebene vor root (Meter; Motor: Hitbox-Halbbreite 0,3 + Abstand 0,08)
const FENCE_REACH = 0.277;    // fence: so weit reichen die Hände ohne Versatz vor root (Einheiten, Ruhehaltung; gemessen)
const SKATE_ANKLE = 0.29;     // skate: Knöchel über der Kufen-Unterkante (Stiefelsohle 0,14 + Kufe 0,15)
const SKATE_LIFT_U = 0.15;    // skate: so hoch hebt HeroRig die Hülle mit course.skates (0,1 m groß bzw. 0,07 m klein = 0,15 Einheiten)
const PLINTH_H = 0.1;         // statue: Sockelhöhe (Einheiten), die Figur steht darauf
const STATUE_BOB = -0.03;
const TAIL_LEN = 0.62, TAIL_BONES = [0, 0.2, 0.4, 0.56];
const LEAF_EAR_C = { base: '#d9b13a', mid: '#8fcf45', tip: '#58ad36', rim: '#f2da63', vein: '#e9f7a0' };
const LEAF_TIP_C = { base: '#c99a2e', mid: '#7cc443', tip: '#4f9f31', rim: '#e8d25a', vein: '#d9f08e' };
/** Gleitblatt-Stil: Kragen Blattgrün (Lotti) bzw. Gold (Greta, grünes Kleid); Gretas Haarreif wird zum goldenen Blatt-Reif. */
const leafStyle = (st) => ({ ...st, collar: st.braids ? '#8fcf45' : '#f0c43c', accent: st.braids ? st.accent : '#c98a2e' });
const LEAF_BAND_C = '#c98a2e';

/** Haarreif mit zwei großen Blatt-Ohren (kopf-lokal, zum Haar-Mesh). Lotti behält ihre Schleife, Gretas Reif trägt die Ohren. */
function leafEarParts(st) {
  const parts = [];
  const bx = HEAD_C.x + (st.braids ? 0.015 : -0.03), by = HEAD_C.y + 0.01, Rb = HEAD_R + 0.03;
  if (st.braids) {
    const arc = Math.PI * 0.95;
    parts.push(part(torus(Rb, 0.026, 8, 20, arc), LEAF_BAND_C, { x: bx, y: by, ry: Math.PI / 2, rz: (Math.PI - arc) / 2 }));
  }
  const ear = geo('hero:leafEar', () => leafSolidGeo({ len: 0.4, half: 0.135, thick: 0.04, cup: 0.045, bend: -0.06, nu: 12, nv: 6, colors: LEAF_EAR_C }));
  for (const s of [1, -1]) {
    const beta = 0.78;
    const base = V(bx, by + Rb * Math.cos(beta), s * Rb * Math.sin(beta));
    const dir = V(-0.22, Math.cos(beta * 0.72), s * Math.sin(beta * 0.72)).normalize();     // nach oben-außen, leicht zurück
    const fwd = V(1, 0, s * 0.45);
    const z = fwd.addScaledVector(dir, -fwd.dot(dir)).normalize();                           // Vorderseite nach vorn-außen
    const x = new THREE.Vector3().crossVectors(dir, z);
    const m = new THREE.Matrix4().makeBasis(x, dir, z).setPosition(base.addScaledVector(dir, -0.035));
    parts.push([ear, null, m]);
  }
  return parts;
}

/** Bushy Schweif (Ursprung = Ansatz, entlang +Y; Knochen bei TAIL_BONES). */
function leafTailGeo() {
  return geo('hero:leafTail', () => skinChain(bushyTailGeo({
    len: TAIL_LEN, r0: 0.05, rMax: 0.165, fur: 0.1, base: '#ef8b33', stripe: '#8a4520', tipC: '#f7c47e',
    ringAt: [0.3, 0.5, 0.7], ringW: 0.085,
    leaf: { len: 0.24, half: 0.085, thick: 0.024, cup: 0.02, bend: 0.03, colors: LEAF_TIP_C, at: 0.88, cross: true },
  }), TAIL_BONES));
}

/** Schlittschuh (knöchel-lokal, ersetzt den Stiefel): hellblauer Schuh, weißer Fellrand, Bommel, Kufe mit Bogen vorn. */
function skateParts(st) {
  const BLUE = '#8fd3f4', ICE = '#e6f2fa', STEEL = '#c3cfd8';
  const parts = [
    ...own(shoeGeo(BLUE, '#f4fbff', { welt: false })),
    part(cylinder(0.078, 0.08, 0.12, 14), BLUE, { y: 0.0 }),
    part(torus(0.078, 0.03, 8, 16), '#ffffff', { y: 0.07, rx: Math.PI / 2 }),
    part(sphere(0.054, 12, 10), st.braids ? '#ff5f7e' : '#ff8fc0', { x: 0.085, y: 0.09 }),
    part(sphere(0.022, 8, 6), '#ffffff', { x: 0.13, y: -0.02 }),
    part(geo('skate:plate', () => new THREE.BoxGeometry(0.27, 0.024, 0.08)), '#ffffff', { x: 0.05, y: -0.152 }),
    part(cylinder(0.017, 0.014, 0.11, 6), STEEL, { x: -0.04, y: -0.215 }),
    part(cylinder(0.017, 0.014, 0.11, 6), STEEL, { x: 0.14, y: -0.215 }),
    part(geo('skate:blade2', () => new THREE.BoxGeometry(0.33, 0.03, 0.018)), ICE, { x: 0.05, y: -0.275 }),
    part(torus(0.036, 0.01, 5, 10, Math.PI * 0.95), ICE, { x: 0.213, y: -0.254, rz: -Math.PI * 0.47 }),
  ];
  return parts;
}

/** Statuen-Sockel (becken-lokal unter den Füßen; wird mit dem Rock verschmolzen). */
function plinthParts() {
  const top = -(HIP + STATUE_BOB);
  return [
    part(cylinder(0.31, 0.35, PLINTH_H, 20), '#9c968c', { y: top - PLINTH_H / 2 }),
    part(torus(0.3, 0.022, 5, 24), '#c8c2b8', { y: top - 0.006, rx: Math.PI / 2 }),
    part(torus(0.345, 0.02, 5, 24), '#7d786f', { y: top - PLINTH_H + 0.012, rx: Math.PI / 2 }),
  ];
}

/** Offener Mund (Einheitsmaß, Blick +Z = aus dem Gesicht): oben fast gerade, unten rund („D“), innen dunkel, Zunge rosa. */
function mouthGeo() {
  return geo('hero:mouth', () => {
    const g = new THREE.SphereGeometry(1, 22, 14);
    const P = g.attributes.position, c = new Float32Array(P.count * 3), cc = new THREE.Color();
    const dark = col3('#5c1626'), tongue = col3('#ff7a8c');
    for (let i = 0; i < P.count; i++) {
      let y = P.getY(i);
      if (y > 0) { y *= 0.28; P.setY(i, y); }
      cc.copy(dark).lerp(tongue, smoothstep((-0.35 - y) / 0.35) * smoothstep((P.getZ(i) - 0.1) / 0.4));
      c.set([cc.r, cc.g, cc.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    g.computeVertexNormals();
    return g;
  });
}

// ================================================================== Heldin
export class HeroAvatar extends Avatar3D {
  buildModel() {
    this.usesFacing = false;
    this.drawsSkates = true;   // Welt 3: Kufen zeichnet der Avatar selbst (course.skates / state 'skate'), nicht die Entität
    this.variant = STYLES[this.textureKey] ? this.textureKey : 'lotti';
    const st = STYLES[this.variant];
    const key = (k) => `hero:${this.variant}:${k}`;
    const skin = SURF.skin(), cloth = SURF.cloth(), hair = SURF.hair(), gloss = SURF.gloss();
    const smesh = (g, m, shadow = true) => { const me = new THREE.Mesh(g, m); me.castShadow = shadow; return me; };

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
    this.skirtMesh = smesh(geo(key('skirt'), () => mergeColored(skirtParts(st))), cloth);
    this.pelvis.add(this.skirtMesh);

    // Oberkörper (Mieder, Kragen, Ärmel in einem Mesh)
    this.torso = new THREE.Group();
    this.pelvis.add(this.torso);
    this.torsoMesh = smesh(geo(key('torso'), () => mergeColored(torsoParts(st))), cloth);
    this.torso.add(this.torsoMesh);

    // Arme: Schulter-Drehpunkt → Röhre + Fäustling (ein Mesh); Hand-Position als leerer Knoten für die Angel
    const armGeo = geo('hero:arm', () => mergeColored(armParts(true)));
    const makeArm = (s) => {
      const sh = new THREE.Group();
      sh.rotation.order = 'ZYX'; // erst seitlich abspreizen (X), dann vor/zurück schwingen (Z)
      sh.position.set(0, SHOULDER_Y, s * SHOULDER_Z);
      sh.armMesh = smesh(armGeo, skin, false);
      sh.add(sh.armMesh);
      sh.hand = new THREE.Object3D(); sh.hand.position.y = -HAND; sh.add(sh.hand);
      this.torso.add(sh);
      return sh;
    };
    this.armN = makeArm(1); this.armF = makeArm(-1);

    // Kopf: Haut+Gesicht (Nase, Wangen, Lächeln, Brauen), Haare(+Schleife/Haarreif), Augen (offen/zu), Glanzpunkte, offener Mund
    this.head = new THREE.Group(); this.head.position.y = NECK_Y;
    this.torso.add(this.head);
    this.head.add(smesh(headGeo(st), skin, false));   // Schatten wirft die Haarschale (gleiche Silhouette)
    this.hairMesh = smesh(geo(key('hair'), () => mergeColored(hairParts(st))), hair);
    this.head.add(this.hairMesh);
    const E = heroEyeGeos(st);
    this.eyes = smesh(E.open, gloss, false); this.eyes.position.y = E.eyeY;
    this.eyesClosed = smesh(E.closed, gloss, false); this.eyesClosed.position.y = E.eyeY; this.eyesClosed.visible = false;
    // Glanzpunkte (eigenes Mesh neben den Augen, folgt deren Maßstab; bei geschlossenen Augen auf ~0 skaliert – so bleibt
    // die Zahl sichtbarer Meshes/Zeichenaufrufe beim Blinzeln gleich)
    this.eyeHl = smesh(E.hl, basicMat('white', { color: 0xffffff }), false); this.eyeHl.position.y = E.eyeY;
    this.head.add(this.eyes, this.eyesClosed, this.eyeHl);
    const mf = HEAD.frame(0, FACE.mouthEl - 0.035);
    const mouthC = HEAD.point(mf.d, -0.002);
    this.mouthO = smesh(mouthGeo(), gloss, false);
    this.mouthO.position.copy(mouthC);
    this.mouthO.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(mf.T.clone().negate(), mf.B, mf.n));
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
          link.add(smesh(braidLinkGeo(st, k, s), hair));
          parent.add(link); links.push(link); parent = link;
        });
        // Physik: Schwerkraft 32 E/s² (etwas leichter als die Spielschwerkraft → weiches Pendeln), quadratischer
        // Luftwiderstand 0,4/E (Lauf 7,8 E/s → ~37° nach hinten; Fall ab ~9 E/s hebend, ≥ 15 E/s bis an die Waagerechte),
        // Dämpfung 4/s (ausgependelt nach ~1 s), Feder 40/s² zur Ruhelage, Streckfeder 120/s² (Biegesteifigkeit
        // des Strangs), Knick ≤ 40° je Gelenk. Wurzelkegel (Grenzwinkel von „unten“): nach hinten bis 16° über
        // die Waagerechte, vorn ≤ 35°, außen ≤ 80°, nach innen (zum Kopf) ≤ 12°.
        const chain = new HangChain(BRAID.links, {
          gravity: 32, drag: 0.4, damping: 4, stiffness: 40, straighten: 120, maxBend: 0.7, strictBend: true,
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
      this.mane.add(smesh(maneGeo(st), hair));
      this.head.add(this.mane);
      // zwei Strähnen vor den Schultern, schwingen gemeinsam um die Kopfmitte
      this.locks = new THREE.Group(); this.locks.position.set(HEAD_C.x, HEAD_C.y, 0);
      this.locks.add(smesh(locksGeo(st), hair, false));
      this.head.add(this.locks);
    }

    // Beine: Hüfte → Oberschenkel → Knie → Unterschenkel → Knöchel → Schuh (weiche, kräftige Röhren; Lotti Stiefelschaft)
    const joint = (g, m, shadow = true) => { const pivot = new THREE.Group(); const me = smesh(g, m, shadow); pivot.add(me); pivot.limbMesh = me; return pivot; };
    const makeLeg = (s) => {
      const hip = joint(thighGeo(), skin, false); hip.position.set(0, 0, s * 0.1);   // im Rock-Schatten
      hip.rotation.order = 'ZYX';
      const knee = joint(shinGeo(st), st.bootShaft ? gloss : skin); knee.position.y = -THIGH;
      hip.add(knee);
      const ankle = new THREE.Group(); ankle.position.y = -SHIN;
      ankle.add(smesh(geo(key('boot'), () => mergeColored(bootParts(st))), gloss, false));
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
      const br = Math.sin(t * 2.2), tilt = Math.sin(t * 0.83) * smoothstep(Math.sin(t * 0.31 + 1) * 1.5);
      pose = P({ bob: 0.012 * br, torso: 0.015 * br, headX: 0.05 * Math.sin(t * 0.7) + 0.12 * tilt, headY: -0.18, headZ: 0.02 * br, hairLift: 0.03 * br, armZn: 0.1 + 0.05 * Math.sin(t * 1.1), armZf: 0.1 - 0.05 * Math.sin(t * 1.1 + 0.4), armXn: -0.14, armXf: 0.14 });
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
    this.applyEyes(p.eyes);
    const mo = Math.max(0.001, p.mouth);
    this.mouthO.scale.set(0.046 * mo, 0.052 * mo, 0.006 + 0.01 * mo);
    // Frisur (Lottis Zöpfe laufen physikalisch in updateBraids)
    if (this.mane) {
      const back = 0.12 + 0.9 * p.hairBack + 0.8 * Math.max(0, p.hairLift) - 0.25 * Math.min(0, p.hairLift);
      this.mane.rotation.z = -back;
      this.locks.rotation.z = -back * 0.45 + 0.1;
    }
  }

  /**
   * Augen: Weite aus der Pose über scale.y um die Augenmitte (x/z wachsen leicht mit, damit die gewölbten Aufkleber nicht
   * in die Haut sinken); fast zu → Lidbogen. Blinzeln schaltet kurz auf den Lidbogen statt zu stauchen – so bleiben die
   * Augen im Stand gleichmäßig skaliert und im Figur-Bündel (kein zusätzlicher Zeichenaufruf beim Blinzeln).
   */
  applyEyes(open) {
    const blink = this.blinker.update(this.dt, open > 0.5);
    const closed = open < 0.3 || blink < 0.6;
    this.eyes.visible = !closed; this.eyesClosed.visible = closed;
    const ey = Math.max(0.06, open);
    const k = ey < 1 ? 1 + 0.04 * (1 - ey) : 1;
    this.eyes.scale.set(k, ey, k);
    if (closed) this.eyeHl.scale.setScalar(1e-4); else this.eyeHl.scale.copy(this.eyes.scale);
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
  /**
   * Maßstab der Haarketten: Gliedlängen, Kollider und Physik sind in Avatar-Einheiten angelegt. Im Kurs-Modus skaliert
   * eine Hülle die Figur (1,5 Einheiten → 1,0 m bzw. 0,7 m) – die Ketten rechnen dann in Weltkoordinaten geteilt durch
   * diesen Maßstab (sonst wären sie 1,5× zu lang, die Kollider zu groß und die Zöpfe stünden vom Kopf ab).
   * Liefert Avatar-Einheiten je Welteinheit (1 außerhalb des Kurs-Modus).
   */
  chainUnits() {
    if (!this.courseMode) return 1;
    this.root.updateWorldMatrix(true, false);
    const k = _sv.setFromMatrixScale(this.root.matrixWorld).x;
    return k > 1e-6 ? 1 / k : 1;
  }

  updateBraids(dt) {
    this.torso.updateWorldMatrix(true, false);
    this.head.updateWorldMatrix(false, false);
    const u = this.chainUnits();
    const col = this.braidColliders;
    col.head.c.set(HEAD_C.x - 0.03, HEAD_C.y + 0.03, 0).applyMatrix4(this.head.matrixWorld).multiplyScalar(u);
    col.shoulders[0].c.set(0, SHOULDER_Y, SHOULDER_Z).applyMatrix4(this.torso.matrixWorld).multiplyScalar(u);
    col.shoulders[1].c.set(0, SHOULDER_Y, -SHOULDER_Z).applyMatrix4(this.torso.matrixWorld).multiplyScalar(u);
    for (const b of this.braids) {
      b.anchor.updateWorldMatrix(false, false);
      b.anchor.matrixWorld.decompose(_p, _q, _s);
      _p.multiplyScalar(u);
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
   * Pflaumes Fußpunkt (beide Hüllen 1 m / 1,5 Einheiten), Salto-Drehpunkt `pivot` über root; Welt 3: Kettenzaun
   * `fence` vor root (+X, wie die Kletterwand), Statuen-Sockel `plinth` (die Statue steht so hoch über root).
   */
  static courseAnchors(big = true) {
    const upm = unitsPerMeter(big);
    return { wall: 0.3, vine: VINE_M, vineRadius: 0.1, waterLine: WATER_U / upm, rideHeight: 0.5, pivot: PIVOT_Y / upm, fence: FENCE_M, plinth: PLINTH_H / upm };
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
      // Grenzkegel im Rumpf-System (das Haar liegt auf dem Rücken, auch wenn der Kopf nickt): nach hinten bis ≈ 66° (fliegt
      // bei Saltos nicht mehr waagerecht hinaus), nach vorn kaum (nie in den Rücken), seitlich mäßig
      this.maneChain = new HangChain([0.42], { gravity: 32, drag: 0.5, damping: 5, stiffness: 28, rootCone: { back: 1.15, front: 0.12, out: 0.4, inward: 0.4 } });
      this.maneRest = V(-0.13, -1, 0).normalize();
    }
    this.ensureW3Rig();
  }

  /**
   * Welt-3-Teile (beim ersten Kurs-Modus, also vor HeroRig.applyLite – Klone bekommen so auch hier keinen Schattenwurf):
   * Gleitblatt-Schweif (SkinnedMesh, 4 Knochen) am Becken, Puff-Effekte am Modell, Stein-Haut, Stiefel-Referenzen.
   */
  ensureW3Rig() {
    const bones = TAIL_BONES.map(() => new THREE.Bone());
    bones.forEach((b, i) => { if (i > 0) { b.position.y = TAIL_BONES[i] - TAIL_BONES[i - 1]; bones[i - 1].add(b); } });
    bones[0].rotation.order = 'YZX';
    const tail = new THREE.SkinnedMesh(leafTailGeo(), vcolMat(0.8));
    tail.add(bones[0]);
    tail.bind(new THREE.Skeleton(bones));
    tail.frustumCulled = false; tail.castShadow = true; tail.visible = false;
    tail.position.set(-0.2, 0.0, 0);
    this.pelvis.add(tail);
    const fx = new PuffFx(this.model, 12);
    this.w3 = {
      tail, bones, tailCur: { rz: 1.5, ry: 0, rx: 0, curl: -0.78, side: 0 },
      fx, stone: new StoneSkin(this.model, (o) => !!o.userData.fx),
      boots: [this.legN, this.legF].map((l) => l.ankle.children[0]),
      bootGeo: this.legN.ankle.children[0].geometry,
      shins: [this.legN.knee.limbMesh, this.legF.knee.limbMesh],
      shinsOff: false, skates: false, statue: false, frozen: false,
      grounded: true, vy: 0, yaw: null, turn: 0, side: 0, pos: null, bubbleT: 1.2, attackT: -1, attackPrev: false, punchSide: 1,
      phase0: 0, physics: 'base',
    };
  }

  /** Klon-Darstellung (HeroRig `lite`) erkennen: dort wirft nichts einen Schatten, auch der Oberkörper nicht. */
  get liteLook() { return !this.torsoMesh.castShadow; }

  /** Beim Ausschalten: Kostüm, Glanz und alle nur im Kurs-Modus gesetzten Lagen zurück auf Klassik. */
  resetCourseLook() {
    this.glow.set(false);
    this.setW3Look({ statue: false, skates: false, water: false });
    this.setChainPhysics('base');
    this.w3.fx.clear();
    this.setCostume('none');
    this.fig.position.set(0, 0, 0);
    this.skirtMesh.rotation.set(0, 0, 0);
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
      this.hairMesh.geometry = geo(key('hood'), () => mergeColored(hoodParts(st)));
      this.hairMesh.material = vcolMat(0.72, THREE.DoubleSide);
      this.torsoMesh.geometry = g.torso;
      this.skirtMesh.geometry = geo(key('skirt:krallen'), () => mergeColored([...skirtParts(st), ...tailParts(st)]));
    } else if (kind === 'funken') {
      const fs = fireStyle(st);
      this.hairMesh.geometry = geo(key('hair:funken'), () => mergeColored(hairParts(fs)));
      this.hairMesh.material = g.hairMat;
      this.torsoMesh.geometry = geo(key('torso:funken'), () => mergeColored(torsoParts(fs)));
      this.skirtMesh.geometry = geo(key('skirt:funken'), () => mergeColored(skirtParts(fs)));
    } else if (kind === 'gleitblatt') {
      const ls = leafStyle(st);
      this.hairMesh.geometry = geo(key('hair:gleitblatt'), () => mergeColored([...hairParts(ls), ...leafEarParts(ls)]));
      this.hairMesh.material = g.hairMat;
      this.torsoMesh.geometry = geo(key('torso:gleitblatt'), () => mergeColored(torsoParts(ls)));
      this.skirtMesh.geometry = g.skirt;
    } else {
      this.hairMesh.geometry = g.hair; this.hairMesh.material = g.hairMat;
      this.torsoMesh.geometry = g.torso; this.skirtMesh.geometry = g.skirt;
    }
    this.w3.tail.visible = kind === 'gleitblatt';
    this.w3.skirtBase = this.skirtMesh.geometry;
    if (this.w3.statue) this.updateSkirt();
    // Zöpfe weichen der Kapuze aus
    if (this.braidColliders) this.braidColliders.head.r = kind === 'krallen' ? 0.37 : 0.33;
  }

  /** Rock mit Statuen-Sockel (nur als Statue) bzw. der Rock des Kostüms. */
  updateSkirt() {
    const w = this.w3, base = w.skirtBase ?? this.cGeo.skirt;
    this.skirtMesh.geometry = w.statue ? geo(`hero:${this.variant}:plinth:${base.uuid}`, () => mergeColored([[base, null, null], ...plinthParts()])) : base;
  }

  /**
   * Welt-3-Optik schalten: Stein-Haut + Sockel + ohne Glanzpunkte (statue), Schlittschuhe (skates), unter Wasser ohne
   * Unterschenkel-Schatten (water). Klone (lite) behalten ihren Zustand (kein Schatten, keine Glanzpunkte).
   */
  setW3Look({ statue, skates, water }) {
    const w = this.w3, lite = this.liteLook;
    if (statue !== w.statue) {
      w.statue = statue;
      this.updateSkirt();
      this.eyeHl.visible = !statue && !lite;
    }
    w.stone.set(statue);
    if (skates !== w.skates) {
      w.skates = skates;
      const g = skates ? geo(`hero:${this.variant}:skate`, () => mergeColored(skateParts(STYLES[this.variant]))) : w.bootGeo;
      for (const b of w.boots) b.geometry = g;
    }
    if (water !== w.shinsOff) {
      w.shinsOff = water;
      for (const m of w.shins) m.castShadow = !water && !lite && (m.userData.cs0 ?? true);
    }
  }

  /** Zopf-/Haarphysik je Umgebung: 'base' (Luft), 'water' (Auftrieb, zäh), 'updraft' (Gleiten: Zöpfe wehen hoch). */
  setChainPhysics(kind) {
    const w = this.w3;
    if (kind === w.physics) return;
    w.physics = kind;
    const P = { base: [32, 0.4, 4], water: [-14, 2.5, 6], updraft: [-20, 0.4, 3] }[kind];
    for (const b of this.braids ?? []) { b.chain.gravity = P[0]; b.chain.drag = P[1]; b.chain.damping = P[2]; }
    if (this.maneChain) {
      // Gretas Haar (ein großes Pendel): im Aufwind mäßig hoch, im Wasser fast schwerelos entlang des Rückens treibend;
      // Ruhelage dabei nach hinten (sonst bliebe das Pendel seitlich am Grenzkegel hängen)
      this.maneChain.gravity = kind === 'updraft' ? -12 : kind === 'water' ? -3 : P[0]; this.maneChain.drag = P[1] + 0.1; this.maneChain.damping = P[2] + 1;
      this.maneRestCur = kind === 'updraft' ? V(-0.96, -0.28, 0).normalize() : kind === 'water' ? V(-0.93, -0.36, 0).normalize() : this.maneRest;
    }
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
    const raw = c.state ?? 'idle';
    if (power !== 'stern') this.glow.set(false);
    this.setCostume(COSTUMES.has(power) ? power : 'none');
    this.updateW3(c, raw, power, dt);   // Stein-Haut vor dem Glanz (schließen sich aus)
    if (power === 'stern') this.glow.set(true);
    this.model.rotation.set(0, 0, 0);
    const { state, pose, dur } = this.coursePose(c, dt, t);
    const cur = this.blender.update(state, pose, dt, dur);
    this.applyPose(cur, t);
    this.applyCoursePose(cur);
    const glove = this.costume === 'krallen';
    this.setArmKinds(glove ? 'glove' : this.peace ? 'peace' : 'bare', glove ? 'glove' : 'bare');
    this.applyTail(dt, c, this.cState);
    if (this.w3.statue) this.freezeHair();
    else {
      if (this.w3.frozen) this.thawHair();
      if (this.braids) this.updateBraids(dt);
      if (this.maneChain) this.updateMane(dt);
    }
    this.updateW3Fx(c, raw, dt);
    this.umbrella.visible = false; this.leafOpen = 0;
    this.updateCourseRod(dt, c, this.cState === 'ride');
    this.glow.update(t);
  }

  /** Welt-3-Zustand je Bild: Stein-Haut, Schlittschuhe, Wasser-Schatten, Zopfphysik, Gierrate (Kurvenneigung), Puff beim Verwandeln. */
  updateW3(c, raw, power, dt) {
    const w = this.w3;
    const statue = raw === 'statue' && power !== 'stern';
    const skates = c.skates === true || raw === 'skate' || (w.skates && SKATE_KEEP.has(raw));
    const was = w.statue;
    this.setW3Look({ statue, skates, water: raw === 'swimUnder' });
    this.setChainPhysics(raw === 'swimUnder' ? 'water' : raw === 'glide' ? 'updraft' : 'base');
    // Verwandlungs-Puff (Statue an/aus)
    if (statue !== was && !this.liteLook) {
      this.pelvis.getWorldPosition(_p);
      this.root.getWorldScale(_s);
      w.fx.dust(_p, 0.3 * _s.y, 0.22, 10, '#fbfaf6', { spread: 0.9, up: 0.6, life: 0.5, yJit: 0.7 * _s.y });
    }
    // Gierrate der Figur (rad/s, links positiv) aus der Weltlage von root – oder vom Motor (course.turn); dazu das
    // Seitentempo (Einheiten/s entlang der rechten Seite +Z der Figur, z. B. Richtung am Zaun)
    this.root.updateWorldMatrix(true, false);
    const e = this.root.matrixWorld.elements, yaw = Math.atan2(-e[2], e[0]);
    if (typeof c.turn === 'number') w.turn = c.turn;
    else if (w.yaw !== null && dt > 0) w.turn = damp(w.turn, clamp(wrapAngle(yaw - w.yaw) / dt, -6, 6), 10, dt);
    w.yaw = yaw;
    _p.set(e[12], e[13], e[14]);
    if (w.pos && dt > 0) {
      _v.subVectors(_p, w.pos);
      const sz = Math.hypot(e[8], e[9], e[10]) || 1, side = _v.length() < 1 ? (_v.x * e[8] + _v.y * e[9] + _v.z * e[10]) / (sz * sz) / dt : 0;
      w.side = damp(w.side, side, 12, dt);
    }
    (w.pos ??= new THREE.Vector3()).copy(_p);
  }

  /** Staubwolke beim Aufkommen der Statue, Luftbläschen unter Wasser; dann die Puff-Kügelchen bewegen. */
  updateW3Fx(c, raw, dt) {
    const w = this.w3, grounded = c.grounded ?? true, lite = this.liteLook, vy = c.vy ?? 0;
    // Aufkommen: grounded wird wahr – oder (Motor: Statue im Skript-Modus, grounded bleibt falsch) der Sturz endet abrupt
    const landed = (grounded && !w.grounded) || (w.vy < -4 && vy > -2.5);
    w.vy = vy;
    if (!lite && raw === 'statue' && landed) {
      this.root.getWorldPosition(_p);
      this.root.getWorldScale(_s);
      w.fx.dust(_p, 0.4 * _s.y, 0.16, 10, '#efe9dc', { spread: 1.4, up: 0.35, life: 0.6, yJit: 0.06 * _s.y });
    }
    w.grounded = grounded;
    if (raw === 'swimUnder' && !lite) {
      w.bubbleT -= dt;
      if (w.bubbleT <= 0) {
        w.bubbleT = 1.7 + Math.random() * 0.9;
        this.head.updateWorldMatrix(true, false);
        _p.copy(this.mouthO.position).add(_v.set(0.03, -0.01, 0)).applyMatrix4(this.head.matrixWorld);
        this.root.getWorldScale(_s);
        w.fx.bubbles(_p, Math.random() < 0.5 ? 2 : 3, 0.032, 0.75 * _s.y);
      }
    } else { w.bubbleT = Math.min(w.bubbleT, 0.5); w.fx.pop('bubble'); }
    w.fx.update(dt);
  }

  /** Statue: Zöpfe und Haar starr in Ruhelage (Ketten liegen neu ab, damit sie danach ohne Ruck weiterschwingen). */
  freezeHair() {
    this.w3.frozen = true;
    if (this.braids) {
      this.head.updateWorldMatrix(true, false);
      const u = this.chainUnits();
      for (const b of this.braids) {
        b.anchor.updateWorldMatrix(false, false);
        b.anchor.matrixWorld.decompose(_p, _q, _s);
        _p.multiplyScalar(u);
        const ch = b.chain;
        ch.frame.copy(_q);
        for (let i = 0; i < ch.n; i++) ch.rest[i].copy(b.restLocal[i]).applyQuaternion(_q);
        ch.reset(_p);
        for (let i = 0; i < ch.n; i++) {
          _qi.copy(_q).invert();
          _v.copy(ch.dirs[i]).applyQuaternion(_qi);
          b.links[i].quaternion.setFromUnitVectors(DOWN, _v);
          _q.multiply(b.links[i].quaternion);
        }
      }
    }
    if (this.maneChain) { this.mane.quaternion.setFromUnitVectors(DOWN, this.maneRest); this.locks.quaternion.identity().slerp(this.mane.quaternion, 0.45); }
  }

  thawHair() {
    this.w3.frozen = false;
    if (this.maneChain) {
      this.head.updateWorldMatrix(true, false);
      this.head.matrixWorld.decompose(_p, _q, _s);
      _p.copy(this.mane.position).applyMatrix4(this.head.matrixWorld).multiplyScalar(this.chainUnits());
      this.torso.getWorldQuaternion(_q);
      this.maneChain.rest[0].copy(this.maneRest).applyQuaternion(_q);
      this.maneChain.reset(_p);
    }
  }

  /**
   * Gleitblatt-Schweif: Grundlage je Zustand (weich nachgeführt) plus Wedeln als Welle entlang der Knochen.
   * Wurzel (Euler YZX): rz = Neigung in der Körperebene (π/2 = waagerecht nach hinten, π = nach unten), ry = seitlich
   * schwenken, rx = seitlich kippen; Folgeknochen: curl (< 0 rollt nach oben ein), side (seitlich biegen).
   */
  applyTail(dt, c, state) {
    const w = this.w3;
    if (!w.tail.visible) return;
    const speed = Math.max(0, c.speed ?? 0), vy = c.vy ?? 0;
    let rz = 1.5, ry = 0, rx = 0, curl = -0.78, side = 0, rate = 9;
    let wagA = 0.22, wagF = 2.1, cone = 0, coneF = 0;
    switch (state) {
      case 'walk': case 'run': case 'skate': {
        const k = clamp(speed / 8, 0, 1);
        rz = lerp(1.5, 1.45, k); curl = lerp(-0.75, -0.4, k); wagA = 0.18 + 0.12 * k; wagF = 2 + 3 * k;
        break;
      }
      case 'jump': case 'jump2': case 'jump3': case 'longjump': case 'backflip': case 'sideflip': case 'walljump':
        rz = vy > 0 ? 2.25 : 1.55; curl = vy > 0 ? -0.25 : -0.55; wagA = 0.1; break;
      case 'fall': rz = 1.45; curl = -0.6; wagA = 0.12; wagF = 4; break;
      case 'glide':
        // Propeller: Schweif steht schräg nach hinten-oben und kreist schnell um seine Achse
        rz = 1.25; curl = -0.12; wagA = 0.08; wagF = 14; cone = 0.55; coneF = 5.5; rate = 16; break;
      case 'tailswipe':
        // waagerecht ausgestreckt, Spitze schleppt gegen die Drehrichtung nach
        rz = Math.PI / 2 + 0.08; curl = 0.04; side = -0.32; wagA = 0; rate = 30; break;
      case 'statue': rz = 1.85; curl = -0.85; wagA = 0; rate = 40; break;
      case 'fence': case 'climb': case 'beanstalk': rz = 2.65; curl = -0.18; wagA = 0.15; wagF = 1.4; break;
      case 'swimUnder': case 'swim':
        rz = Math.PI - 0.4; curl = 0.05; wagA = 0.3; wagF = 1.3 + 0.4 * clamp(speed, 0, 3); rate = 6; break;
      case 'slide': case 'crouch': rz = 1.7; curl = -0.3; break;
      case 'wallslide': rz = 2.5; curl = -0.25; wagA = 0.1; break;
      case 'dead': case 'hurt': rz = 1.9; curl = -0.2; wagA = 0.35; wagF = 7; break;
      // Welt 5: am Trapez hängt er (pendelt sacht), im Kanonenflug weht er gestreckt zu den Füßen (flattert)
      case 'trapeze': rz = 2.6; curl = -0.22; wagA = 0.14; wagF = 1.2; break;
      case 'cannon': rz = Math.PI - 0.3; curl = 0.05; wagA = 0.1; wagF = 9; rate = 14; break;
      default: break;
    }
    const cur = w.tailCur;
    cur.rz = damp(cur.rz, rz, rate, dt); cur.ry = damp(cur.ry, ry, rate, dt); cur.rx = damp(cur.rx, rx, rate, dt);
    cur.curl = damp(cur.curl, curl, rate, dt); cur.side = damp(cur.side, side, rate, dt);
    // Wedeln und Kreisen über eigene Phasen (Tempowechsel ohne Sprung), Ausschläge weich ein-/ausgeblendet
    cur.wagA = damp(cur.wagA ?? 0, wagA, 8, dt); cur.cone = damp(cur.cone ?? 0, cone, 10, dt);
    cur.ph = (cur.ph ?? 0) + (dt * wagF * TAU) / 2.1; cur.cph = (cur.cph ?? 0) + dt * coneF * TAU;
    const [b0, ...rest] = w.bones, ph = cur.ph, A = cur.wagA, C = cur.cone;
    b0.rotation.set(cur.rx + C * Math.sin(cur.cph), cur.ry + A * Math.sin(ph), cur.rz + C * Math.cos(cur.cph));
    rest.forEach((b, i) => b.rotation.set(cur.side + A * 1.2 * Math.sin(ph - 0.9 * (i + 1)), 0, cur.curl));
  }

  /** Fortschritt einer kurzen Aktion: phase, sobald der Motor sie im Zustand verändert, sonst Zeit seit Zustandsbeginn / T. */
  actionPhase(c, st, T) {
    const w = this.w3, ph = c.phase ?? 0;
    if (st === 0) { w.phase0 = ph; w.phaseLive = false; } else if (ph !== w.phase0) w.phaseLive = true;
    return w.phaseLive ? clamp(ph, 0, 1) : clamp(st / T, 0, 1);
  }

  /** Kurs-Felder der Pose anwenden: Ellbogen, Oberarm-Drehung, Rumpf, Figurlage um den Schwerpunkt, Stauchung. */
  applyCoursePose(p) {
    const dt = this.dt;
    this.armN.carm.fore.rotation.z = p.elbowN; this.armF.carm.fore.rotation.z = p.elbowF;
    this.armN.carm.upper.rotation.y = p.twistN; this.armF.carm.upper.rotation.y = p.twistF;
    // Welt 5: Gummi-Arme – der Unterarm-Knochen rückt entlang des Oberarms nach außen (die Röhre dehnt sich im Ellbogen-Übergang)
    this.armN.carm.fore.position.y = -ELBOW_Y - p.reachN; this.armF.carm.fore.position.y = -ELBOW_Y - p.reachF;
    this.armN.carm.scale.setScalar(p.armKn); this.armF.carm.scale.setScalar(p.armKf);
    this.skirtMesh.rotation.set(p.skirtX, 0, p.skirtZ);
    this.torso.rotation.set(p.torsoX, p.torsoY, p.torso);
    // Salto-Kanäle (nicht überblendet): exakt aus phase, sonst über die kürzere Richtung zurück auf 0 (mod 2π)
    for (const k of ['x', 'y', 'z']) {
      const want = this.spinSet[k];
      this.spin[k] = want !== null ? want : damp(wrapAngle(this.spin[k]), 0, 14, dt);
    }
    _e.set(p.roll + this.spin.x, this.spin.y, p.pitch + this.spin.z, 'YXZ');
    this.fig.quaternion.setFromEuler(_e);
    _v.set(0, PIVOT_Y, 0).applyQuaternion(this.fig.quaternion);
    this.fig.position.set(p.figX - _v.x, PIVOT_Y - _v.y + p.figY, -_v.z + p.figZo);
    this.model.scale.set(1 + 0.5 * p.sq, 1 - p.sq, 1 + 0.5 * p.sq);
  }

  /**
   * Gretas Haar (Kurs-Modus): Pendel in Weltkoordinaten; Grenzkegel und Ruhelage im Rumpf-System (langes Haar fällt auf den
   * Rücken, auch wenn der Kopf in den Nacken geht – Weitsprung, Kanonenflug), Ausrichtung des Meshes im Kopf-System;
   * Strähnen folgen halb.
   */
  updateMane(dt) {
    const ch = this.maneChain;
    this.head.updateWorldMatrix(true, false);
    this.head.matrixWorld.decompose(_p, _q, _s);
    _p.copy(this.mane.position).applyMatrix4(this.head.matrixWorld).multiplyScalar(this.chainUnits());
    this.torso.getWorldQuaternion(_qt);
    ch.frame.copy(_qt);
    // Saltos (Drehkanäle aktiv): Haar bleibt enger am Rücken, statt waagerecht hinauszufliegen
    const S = this.spinSet, spin = !!S && (S.x !== null || S.z !== null);
    ch.rootCone.back = spin ? 0.6 : 1.15; ch.stiffness = spin ? 60 : 28;
    ch.rest[0].copy(this.maneRestCur ?? this.maneRest).applyQuaternion(_qt);
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
        lean: -0.07 * k, bob: 0.042 * k * Math.abs(s) - 0.012 * k, torsoY: -0.1 * k * s,
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
      lean, torso: -0.04, bob: 0.075 * k * Math.abs(s) - 0.02, torsoY: -0.2 * k * s,
      headZ: -0.85 * lean + 0.03 * Math.cos(2 * p), mouth: 0.35,
      hairBack: 0.85 * k + 0.12 * Math.sin(2 * p), hairLift: 0.2 * k * Math.cos(2 * p),
    };
  }

  poseIdle(t) {
    const br = Math.sin(t * 2.2), sw = Math.sin(t * 0.55);
    const look = Math.sin(t * 0.37) * smoothstep(Math.sin(t * 0.23) * 2); // ab und zu umschauen
    const tilt = Math.sin(t * 0.83) * smoothstep(Math.sin(t * 0.31 + 1) * 1.5); // ab und zu den Kopf schief legen
    return {
      bob: 0.014 * br, torso: 0.018 * br, lean: 0.015 * sw, torsoX: 0.025 * sw,
      headX: 0.04 * Math.sin(t * 0.7) + 0.13 * tilt, headY: 0.45 * look, headZ: 0.03 + 0.02 * br, hairLift: 0.03 * br,
      armZn: 0.1 + 0.05 * Math.sin(t * 1.1), armZf: 0.1 - 0.05 * Math.sin(t * 1.1 + 0.4), armXn: -0.14 - 0.03 * br, armXf: 0.14 + 0.03 * br, elbowN: 0.15, elbowF: 0.15,
    };
  }

  poseFall(t) {
    const fl = Math.sin(t * 9);
    return { armXn: -1.45, armXf: 1.45, armZn: 0.25 + 0.25 * fl, armZf: 0.25 - 0.25 * fl, elbowN: 0.3, elbowF: 0.3, thighZn: 0.45, thighZf: -0.15, kneeN: 0.55, kneeF: 0.35, footN: 0.3, footF: 0.3, eyes: 1.15, mouth: 0.6, hairLift: 0.9, hairBack: 0.3, lean: 0.04, headZ: -0.08 };
  }

  /** Erster Sprung; d = 0 (steigt) … 1 (sinkt, Beine strecken sich zur Landung). */
  poseJump(d, up = 0) {
    return this.variant === 'greta'
      // Greta gestreckt: Arme schräg nach vorn-oben gespreizt, Beine in der Spreize
      ? { armZn: 2.3 - 0.5 * d, armZf: 2.35 - 0.5 * d, armXn: -0.7, armXf: 0.7, elbowN: 0.25, elbowF: 0.25, thighZn: 0.75 - 0.3 * d, thighZf: -0.45 + 0.3 * d, kneeN: 0.45, kneeF: 0.3 + 0.2 * d, footN: 0.9, footF: 0.9, lean: -0.05, headZ: 0.15, mouth: 0.9, hairLift: -0.5 + 0.9 * d, hairBack: 0.3, sq: -0.1 * up }
      // Lotti kraftvoll: Faust nach oben, anderer Arm zurück, Knie hoch
      : { armZn: 0.35, armXn: -2.0 + 0.5 * d, elbowN: 0.35, armZf: -0.55, armXf: 0.35, elbowF: 0.3, thighZn: 1.25 - 0.55 * d, kneeN: 1.55 - 0.8 * d, thighZf: -0.2 + 0.25 * d, kneeF: 0.5, footN: 0.6, footF: 0.75, lean: -0.04, headZ: 0.18, mouth: 0.9, hairLift: -0.35 + 0.8 * d, hairBack: 0.3, sq: -0.1 * up };
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
   * Arm-IK der Kurs-Arme (Welt 5): Faust (Handpunkt HAND unter der Schulter) auf das Ziel (x, y, z) im Figur-System
   * (Fußpunkt; vor dem Versatz figX/figY/figZo und vor der Lage pitch/roll). Setzt Abspreizen (armX), Schwingen (armZ,
   * stetig in −0,5 … 2π − 0,5), gestreckten Ellbogen und die Streckung reach (Gummi-Arm, im Arm-Maßstab armKn/armKf aus o)
   * der Seite s (1 nah, −1 fern). Rumpfkanäle aus o: bob, lean, torso (torsoX/torsoY = 0 vorausgesetzt).
   */
  reachTo(o, s, x, y, z) {
    const k = (s > 0 ? o.armKn : o.armKf) ?? 1;   // Arm-Maßstab: Handpunkt liegt HAND · k unter der Schulter
    const L = (o.lean ?? 0) + (o.torso ?? 0), cl = Math.cos(L), sl = Math.sin(L);
    const dx = x + sl * SHOULDER_Y, dy = y - (HIP + (o.bob ?? 0) + cl * SHOULDER_Y), dz = z - s * SHOULDER_Z;
    const lx = dx * cl + dy * sl, ly = -dx * sl + dy * cl, len = Math.max(1e-6, Math.hypot(lx, ly, dz));
    const a = Math.asin(clamp(-dz / len, -1, 1));
    let b = Math.atan2(lx / len, -ly / len);
    if (b < -0.5) b += TAU;
    const reach = Math.max(0, len / k - HAND);
    if (s > 0) Object.assign(o, { armXn: a, armZn: b, elbowN: 0, reachN: reach });
    else Object.assign(o, { armXf: a, armZf: b, elbowF: 0, reachF: reach });
    return o;
  }

  /**
   * Trapez (Welt 5): Pose im Seil-System – die Hülle ist schon um den Seilwinkel geneigt (HeroRig), hier dreht nichts mehr
   * die ganze Figur. Fäuste per IK an der Stange, Beine laufen dem Schwung nach, am Umkehrpunkt angezogen.
   */
  poseTrapeze(c, t) {
    // Avatar-Einheiten je Meter aus dem Maßstab der Hülle (groß, klein, Riesentrank) – über das Volumen, damit kurzes
    // Stauchen (Squash & Stretch der Hülle) die Stangenhöhe nicht verschiebt
    this.root.updateWorldMatrix(true, false);
    const U = 1 / Math.max(1e-6, Math.cbrt(Math.abs(this.root.matrixWorld.determinant())));
    const barY = ((c.big === false ? TRAPEZE.body.small : TRAPEZE.body.big) + TRAPEZE.arm - TRAPEZE.bend) * U;
    // Riesentrank: Die Stange liegt in Brusthöhe – die Figur hängt dann etwas hinter ihr und hält sie vor dem Bauch
    const low = smoothstep((TRAPEZE.clear - barY) / 0.35);
    const s = clamp((c.swing ?? 0) / 1.0, -1.2, 1.2);
    const w = clamp((c.swingVel ?? 0) / TRAPEZE.wRef, -1.3, 1.3);
    const still = 1 - Math.min(1, Math.abs(w));
    const front = Math.max(0, s) * still, back = Math.max(0, -s) * still;   // Umkehrpunkt vorn / hinten
    const br = Math.sin(t * 2.3);
    const o = {
      figX: -TRAPEZE.hold * low, lean: 0.08 * s, torso: -0.03 * s, armKn: TRAPEZE.armK, armKf: TRAPEZE.armK,
      // vorwärts schwingend laufen die Füße hinterher (und umgekehrt); vorn gehockt, hinten nach hinten gebeugt
      thighZn: 0.06 - 0.4 * w + 1.15 * front - 0.32 * back, thighZf: -0.04 - 0.4 * w + 1.05 * front - 0.25 * back,
      kneeN: 0.1 + 0.08 * Math.abs(w) + 1.55 * front + 1.35 * back, kneeF: 0.16 + 0.08 * Math.abs(w) + 1.45 * front + 1.5 * back,
      thighXn: -0.07 - 0.12 * front, thighXf: 0.07 + 0.12 * front,
      footN: 0.75 - 0.3 * front, footF: 0.7 - 0.3 * front,
      // Kopf gleicht die Seilneigung halb aus (Gesicht bleibt sichtbar), Lächeln (Mund zu)
      headZ: 0.06 - 0.28 * s, headX: 0.04 * br * still, eyes: 1, mouth: 0,
      twistN: 1.1, twistF: -1.1,
      skirtZ: -0.4 * s,   // Rock hängt halb der Schwerkraft nach (gegen die Seilneigung)
    };
    const g = TRAPEZE.grip, gx = g.x * U + TRAPEZE.hold * low, gy = barY + g.y * U, gz = Math.min(g.z, TRAPEZE.half * U);
    this.reachTo(o, 1, gx, gy, gz);
    this.reachTo(o, -1, gx, gy, -gz);
    return o;
  }

  /** Röhrenkanone (Welt 5): Superheldinnen-Flug entlang der Geschwindigkeit, ab CANNON.land Übergang in die Landepose. */
  poseCannon(c, t, phase) {
    const sp = Math.max(0, c.speed ?? 0), vy = c.vy ?? 0;
    // Körperachse (Fuß → Kopf) entlang (speed, vy) im Hüllen-System (Hülle blickt waagerecht in Flugrichtung)
    const pf = sp + Math.abs(vy) > 0.5 ? clamp(-Math.atan2(sp, vy), CANNON.pitchMin, CANNON.pitchMax) : -Math.PI / 2;
    const k = smoothstep((phase - CANNON.land) / 0.17);
    const f1 = Math.sin(t * 31), f2 = Math.sin(t * 23 + 1.3);
    const o = {
      pitch: pf, headZ: 0.85, eyes: 1, mouth: 0,
      thighZn: -0.1, thighZf: -0.04, thighXn: -0.03, thighXf: 0.03, kneeN: 0.06, kneeF: 0.32, footN: 1.1, footF: 1.0,
      skirtX: 0.05 * f1, skirtZ: 0.07 * f2,
    };
    // führende Faust voraus (nahe Hand, Gummi-Arm am Kopf vorbei); Greta beide Arme vorn, Lotti den anderen am Körper
    o.armKn = TRAPEZE.armK;
    this.reachTo(o, 1, 0.12, 1.58, 0.34);
    if (this.variant === 'greta') { o.armKf = TRAPEZE.armK; this.reachTo(o, -1, 0.16, 1.36, -0.38); }
    else Object.assign(o, { armZf: -0.18, armXf: 0.22, elbowF: 0.25, twistF: 0, reachF: 0 });
    if (k <= 0) return o;
    const land = {
      pitch: -0.1, headZ: 0.12,
      armXn: -1.25, armXf: 1.25, armZn: 0.5, armZf: 0.45, elbowN: 0.3, elbowF: 0.3, reachN: 0, reachF: 0, armKn: 1, armKf: 1, twistN: 0, twistF: 0,
      thighZn: 0.6, thighZf: 0.28, kneeN: 0.8, kneeF: 0.55, footN: 0.35, footF: 0.3, thighXn: -0.08, thighXf: 0.08,
      skirtX: 0.02 * f1, skirtZ: 0.03 * f2,
    };
    for (const key of Object.keys(land)) o[key] = lerp(o[key] ?? HERO_POSE[key], land[key], k);
    return o;
  }

  /**
   * Zielpose aus obj.course. Zustände und Felder: siehe Kopfkommentar „Kurs-Modus“ unten in dieser Datei.
   * Saltos setzen this.spinSet exakt aus phase; alles andere geht durch den PoseBlender.
   */
  coursePose(c, dt, t) {
    let state = c.state ?? 'idle';
    if (c.climbing && !CLIMB_STATES.has(state)) state = 'climb';
    if (state !== this.cState) { this.cPrev = this.cState; this.cState = state; this.cStateT = 0; } else this.cStateT += dt;
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
    // Ein Bein (s = 1 nah/rechts, −1 fern/links) per IK mit Abspreizen: Knöchel x vor der Hüfte, lat nach außen, ay über dem Boden
    const plantLeg = (o, s, x, lat, ay = ANKLE_H, extra = 0) => {
      const lean = o.lean ?? 0, hipY = HIP + (o.bob ?? 0), dy = ay - hipY;
      const cl = Math.cos(lean), sl = Math.sin(lean);
      const px = x * cl + dy * sl, h = -(-x * sl + dy * cl);  // Ziel im Becken-System
      const ik = legIK(THIGH, SHIN, Math.hypot(h, lat), px, 0, 0);
      const ab = Math.atan2(lat, h);
      if (s > 0) Object.assign(o, { thighXn: -ab, thighZn: ik.thigh, kneeN: ik.knee, footN: ik.foot + lean + extra });
      else Object.assign(o, { thighXf: ab, thighZf: ik.thigh, kneeF: ik.knee, footF: ik.foot + lean + extra });
      return o;
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
        pose = P(this.poseJump(clamp(-vy / 6, 0, 1), clamp((vy - 2) / 6, 0, 1)));   // Strecken nur kurz nach dem Absprung
        dur = this.cPrev === 'trapeze' ? TRAPEZE.release : 0.1;   // Absprung vom Trapez: weich aus der Hängelage
        break;
      case 'jump2': {
        // zweiter Sprung: beide Arme hoch im V, beide Knie angezogen
        const d = clamp(-vy / 6, 0, 1);
        pose = P({ armZn: 0.35, armZf: 0.35, armXn: -1.9 + 0.4 * d, armXf: 1.9 - 0.4 * d, elbowN: 0.3, elbowF: 0.3, thighZn: 1.15 - 0.45 * d, thighZf: 0.85 - 0.35 * d, kneeN: 1.7 - 0.8 * d, kneeF: 1.5 - 0.7 * d, footN: 0.7, footF: 0.7, lean: 0.02, headZ: 0.25, mouth: 1, eyes: 1.1, hairLift: -0.4 + 0.8 * d, sq: -0.09 * clamp((vy - 2) / 6, 0, 1) });
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
        dur = this.cPrev === 'trapeze' ? TRAPEZE.release : 0.2;
        break;
      case 'land': {
        // kurzes Einfedern: Knie beugen, Arme federn seitlich, Stauchung klingt ab
        const d = 1 - smoothstep(st / 0.22);
        const o = { bob: -0.17 * d, lean: -0.15 * d, armXn: -0.12 - 0.5 * d, armXf: 0.12 + 0.5 * d, armZn: 0.1 + 0.3 * d, armZf: 0.1 + 0.3 * d, elbowN: 0.3, elbowF: 0.3, headZ: 0.12 * d, sq: 0.2 * d, hairLift: -0.2 * d, eyes: 1 - 0.25 * d };
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
        pose = P({ lean: -0.12, armZn: 1.5, armXn: -1.3, elbowN: 0.2, armZf: 1.5, armXf: 0.6, elbowF: 0.3, thighZn: -0.35, thighZf: -0.15, kneeN: 0.25, kneeF: 0.6, footN: 0.9, footF: 0.8, headZ: 0.3, mouth: 0.9, hairLift: -0.3, sq: -0.07 });
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
      // ------------------------------------------------------------ Welt 3
      case 'tailswipe': {
        // Schweifhieb: eine Drehung um die Hochachse (von oben gegen den Uhrzeiger), Arme wie ein Kreisel ausgebreitet,
        // Schweif waagerecht ausgestreckt (applyTail); Beine bleiben am Boden bzw. in der Sprunghaltung
        const p = this.actionPhase(c, st, 0.35);
        S.y = TAU * smoothstep(p);
        const o = grounded ? plant({ bob: -0.07, lean: -0.1 }, 0.07, -0.07) : this.poseJump(0.4);
        const mid = Math.sin(Math.PI * p);
        Object.assign(o, {
          armXn: -1.3 - 0.15 * mid, armXf: 1.3 + 0.15 * mid, armZn: 0.25, armZf: 0.25, elbowN: 0.2, elbowF: 0.2, twistN: 0, twistF: 0,
          torsoY: 0.25 * mid, headZ: 0.05, headY: 0.3 * mid, eyes: 0.8, mouth: 0, sq: -0.03 * mid,
        });
        pose = P(o);
        dur = 0.05;
        break;
      }
      case 'glide': {
        // Gleiten: leicht vorgebeugt, Arme seitlich ausgebreitet (etwas nach vorn), Beine baumeln und strampeln sacht;
        // der Schweif kreist als Propeller, die Zöpfe wehen im Aufwind nach oben (setChainPhysics)
        const sw = Math.sin(t * 2.6), k = Math.sin(t * 4.8);
        pose = P({
          pitch: -0.14, lean: -0.04, bob: 0.025 * Math.sin(t * 2.2), roll: 0.05 * sw,
          armXn: -1.08 - 0.08 * sw, armXf: 1.08 - 0.08 * sw, armZn: 0.45, armZf: 0.45, elbowN: 0.3, elbowF: 0.3, twistN: -0.4, twistF: 0.4,
          thighZn: 0.35 + 0.2 * k, thighZf: 0.12 - 0.2 * k, kneeN: 0.6 - 0.2 * k, kneeF: 0.5 + 0.2 * k, footN: 0.6, footF: 0.6,
          headZ: 0.12, headY: 0.1 * sw, mouth: 0, eyes: 1.05,
        });
        dur = 0.16;
        break;
      }
      case 'statue': {
        // Stein-Statue: aufrecht auf dem Sockel, Hände vor dem Bauch gefaltet, Augen zu, starr (keine Atmung)
        // Kurz vor Ablauf der Höchstdauer (phase = Anteil, Motor) wackelt die Statue als Vorwarnung
        const warn = smoothstep((phase - 0.82) / 0.12) * Math.sin(t * 40);
        const o = { figY: PLINTH_H, bob: STATUE_BOB, lean: 0, headZ: -0.06, roll: 0.035 * warn, figZo: PIVOT_Y * 0.035 * warn, armZn: 0.62, armZf: 0.62, armXn: 0.2, armXf: -0.2, elbowN: 1.5, elbowF: 1.5, twistN: 1.05, twistF: -1.05, eyes: 0.07, mouth: 0 };
        pose = P(plant(o, 0.035, -0.035));
        dur = 0.08;
        break;
      }
      case 'skate': {
        // Schlittschuhlaufen: vorgebeugt, Schritte schräg nach außen-hinten im Wechsel (Abstoß, Zurückholen in der Luft,
        // Gleiten auf dem Standbein), Arme schwingen gegengleich quer vor dem Körper; Kurvenneigung um die Kufen
        const k = clamp(speed / 7, 0, 1.15);
        this.skatePhase = (this.skatePhase ?? 0) + (speed > 0.3 ? clamp(0.5 + 0.1 * speed, 0.5, 1.4) * dt : 0);
        const leg = (u) => {
          u = ((u % 1) + 1) % 1;
          const ext = u < 0.35 ? smoothstep(u / 0.35) : u < 0.5 ? 1 - smoothstep((u - 0.35) / 0.15) : 0;
          const lift = u >= 0.35 && u < 0.5 ? Math.sin((Math.PI * (u - 0.35)) / 0.15) : 0;
          return { ext, lift };
        };
        const n = leg(this.skatePhase), f = leg(this.skatePhase + 0.5);
        const w = n.ext - f.ext, bal = Math.sin(t * 2.7);
        const turn = clamp(-Math.atan((speed * this.w3.turn) / 9.8), -0.5, 0.5);
        const lean = -0.2 - 0.38 * Math.min(1, k), bob = -0.04 - 0.08 * Math.min(1, k);
        const o = {
          lean, bob, torso: -0.04, torsoY: 0.18 * k * w, roll: turn + 0.06 * k * (f.ext - n.ext),
          headZ: -0.85 * lean + 0.06, headY: -0.12 * k * w,
          armZn: lerp(0.15, -0.35 - 0.3 * k, n.ext) + lerp(0, 0.9 * k, f.ext), armZf: lerp(0.15, -0.35 - 0.3 * k, f.ext) + lerp(0, 0.9 * k, n.ext),
          armXn: -0.45 - 0.3 * (1 - k) * (0.5 + 0.5 * bal) - 0.75 * k * n.ext + 0.35 * k * f.ext, armXf: 0.45 + 0.3 * (1 - k) * (0.5 - 0.5 * bal) + 0.75 * k * f.ext - 0.35 * k * n.ext,
          elbowN: 0.35, elbowF: 0.35, mouth: 0,
        };
        o.figZo = PIVOT_Y * Math.sin(o.roll); o.figY = -PIVOT_Y * (1 - Math.cos(o.roll));
        // Kufen auf den Boden: mit course.skates hebt HeroRig die Hülle um die Kufenhöhe (dann Knöchel wie ohne Kufen)
        const ankle = SKATE_ANKLE - (c.skates ? SKATE_LIFT_U : 0);
        plantLeg(o, 1, 0.05 - 0.2 * k * n.ext, 0.02 + 0.3 * k * n.ext, ankle + 0.09 * k * n.lift, 0.15 * k * n.ext);
        plantLeg(o, -1, 0.05 - 0.2 * k * f.ext, 0.02 + 0.3 * k * f.ext, ankle + 0.09 * k * f.lift, 0.15 * k * f.ext);
        pose = P(o);
        dur = 0.16;
        break;
      }
      case 'fence': {
        // Kettenzaun VOR der Figur (+X, Hitbox-Rand 0,3 m): Rücken zur Kamera, Hände greifen über Kopfhöhe, Füße stehen in
        // den Maschen; fenceMove {x, y} (−1..1) treibt den Kletterzyklus (hoch/runter: Hände/Füße im Wechsel, seitlich:
        // nachsetzen); ohne Bewegung ruhiges Hängen. attack → Faustschlag (nahe/ferne Hand im Wechsel) durch den Zaun.
        const fm = c.fenceMove ?? {}, mx = clamp(fm.x ?? 0, -1, 1), my = clamp(fm.y ?? 0, -1, 1);
        const m = Math.min(1, Math.hypot(mx, my)), wallU = FENCE_M * upm;
        this.climbPhase += TAU * 1.5 * m * dt;
        const q = this.climbPhase, a = 0.5 + 0.5 * Math.sin(q), b = 1 - a;
        const tot = Math.abs(mx) + Math.abs(my) + 1e-6, vert = (Math.abs(my) / tot) * smoothstep(m / 0.25), lat = (Math.abs(mx) / tot) * smoothstep(m / 0.25);
        // Richtung seitlich: aus der tatsächlichen Bewegung von root (Rückseite des Zauns: Bildschirm rechts = Figur links), sonst aus x
        const sv = this.w3.side, dir = Math.abs(sv) > 0.3 ? Math.sign(sv) : Math.sign(mx) || 1, still = 1 - smoothstep(m / 0.25), br = Math.sin(t * 2.1);
        // seitlich: führende Hand/Fuß greift weit nach außen (a), die andere setzt nach (b); dir = +1 → nach rechts (+Z, nahe Seite)
        const leadN = dir > 0 ? a : b, leadF = dir > 0 ? b : a;
        // Arme im V seitlich am Kopf vorbei (aus der Kurs-Kamera hinter der Figur sichtbar), Knie froschartig nach außen
        const hiN = lerp(0.5, a, vert), hiF = lerp(0.5, b, vert);   // 1 = Hand oben (greift nach)
        const o = {
          figX: wallU - FENCE_REACH, lean: -0.05, pitch: -0.15, torso: -0.03, bob: 0.035 * vert * Math.abs(Math.cos(q)) + 0.008 * br * still,
          figZo: 0.05 * lat * dir * Math.sin(q), roll: 0.08 * lat * dir * Math.sin(q),
          headZ: 0.8, headY: -0.3 * lat * dir, headX: 0.04 * br * still,
          armZn: lerp(1.85, 2.35, hiN) + 0.03 * br * still, armZf: lerp(1.85, 2.35, hiF) - 0.03 * br * still,
          armXn: -lerp(0.9, 0.72, hiN) - lat * lerp(-0.1, 0.25, leadN), armXf: lerp(0.9, 0.72, hiF) + lat * lerp(-0.1, 0.25, leadF),
          elbowN: lerp(0.3, 0.1, hiN), elbowF: lerp(0.3, 0.1, hiF), twistN: -0.3, twistF: 0.3,
          thighZn: lerp(0.8, 1.35, hiF), thighZf: lerp(0.8, 1.35, hiN),
          thighXn: -0.5 - lat * lerp(-0.08, 0.3, leadN), thighXf: 0.5 + lat * lerp(-0.08, 0.3, leadF),
          kneeN: lerp(1.3, 2.0, hiF), kneeF: lerp(1.3, 2.0, hiN), footN: -0.3, footF: -0.3,
          eyes: 1, mouth: 0,
        };
        // Faustschlag: course.fencePunch (0..1, Motor) bzw. course.attack (true → 0,25 s ab der Flanke, Zahl = Fortschritt)
        const w = this.w3, at = (c.fencePunch ?? 0) > 0 ? c.fencePunch : c.attack;
        if (at && !w.attackPrev) { w.attackT = 0; w.punchSide = -w.punchSide; }
        w.attackPrev = !!at;
        let pp = -1;
        if (typeof at === 'number' && at > 0 && at <= 1) { pp = at; w.attackT = -1; } else if (w.attackT >= 0) { w.attackT += dt; pp = w.attackT / 0.25; if (pp >= 1) w.attackT = -1; }
        if (pp >= 0 && pp <= 1) {
          const pw = Math.sin(Math.PI * clamp(pp, 0, 1)) ** 0.6, sn = w.punchSide > 0;
          o.figX += 0.09 * pw; o.lean -= 0.2 * pw; o.torsoY = (sn ? -0.4 : 0.4) * pw; o.headZ -= 0.15 * pw;
          if (sn) Object.assign(o, { armZn: lerp(o.armZn, 1.72, pw), armXn: lerp(o.armXn, -0.05, pw), elbowN: lerp(o.elbowN, 0, pw), twistN: lerp(o.twistN, 0, pw) });
          else Object.assign(o, { armZf: lerp(o.armZf, 1.72, pw), armXf: lerp(o.armXf, 0.05, pw), elbowF: lerp(o.elbowF, 0, pw), twistF: lerp(o.twistF, 0, pw) });
          o.mouth = 0.8; o.eyes = 0.85;
          label = 'fencePunch';
        }
        pose = P(o);
        dur = label === 'fencePunch' ? 0.04 : 0.12;
        break;
      }
      case 'swimUnder': {
        // Unter Wasser: Brustschwimmen (Körper waagerecht, Arme ziehen außen herum unter die Brust und schießen nach
        // vorn, Froschbeine ziehen an und stoßen aus, dann Gleiten); ohne Tempo schwebend mit Paddeln. vy neigt den Körper.
        const k = clamp(speed / 2.2, 0, 1);
        this.swimPhase += TAU * (0.42 + 0.38 * k) * dt;
        const q = this.swimPhase, u = ((q / TAU) % 1 + 1) % 1;
        const pull = smoothstep(u / 0.3), tuck = smoothstep((u - 0.28) / 0.22), shoot = smoothstep((u - 0.5) / 0.18), glideK = smoothstep((u - 0.68) / 0.3);
        const tilt = clamp(vy * 0.22, -0.55, 0.55);
        const sc = Math.sin(t * 2.4), kick = Math.sin(t * 2.4 + 1);
        // Brustzug (k = 1) und Schweben (k = 0)
        const S1 = {
          armX: lerp(lerp(lerp(0.15, 1.3, pull), 0.35, tuck), 0.12, shoot), armZ: lerp(lerp(lerp(3.0, 2.15, pull), 1.25, tuck), 3.0, shoot),
          elbow: lerp(lerp(lerp(0.05, 0.35, pull), 1.7, tuck), 0.05, shoot), twist: lerp(0.3, 1.0, tuck * (1 - shoot)),
          thighZ: lerp(lerp(0.05, 1.0, tuck), -0.05, shoot), thighX: lerp(lerp(0.05, 0.5, tuck), 0.42, shoot) * (1 - glideK) + 0.05 * glideK,
          knee: lerp(lerp(0.15, 1.95, tuck), 0.12, shoot), foot: lerp(0.9, 0.2, tuck * (1 - shoot)) + 0.6 * shoot,
        };
        const S0 = { armX: 1.05 + 0.25 * sc, armZ: 1.35 + 0.35 * sc, elbow: 0.5, twist: 0.6, thighZ: 0.45 + 0.3 * kick, thighX: 0.3, knee: 1.1 - 0.45 * kick, foot: 0.6 };
        const L = (key) => lerp(S0[key], S1[key], k);
        pose = P({
          pitch: lerp(-0.4, -1.32, k) + tilt * lerp(0.6, 1, k) + 0.05 * Math.sin(q), figY: 0.02 * Math.sin(q * 2 + 1),
          headZ: lerp(0.2, 0.95, k) - 0.4 * tilt * k, lean: 0, torso: 0.04 * Math.sin(q),
          armXn: -L('armX'), armXf: L('armX'), armZn: L('armZ'), armZf: L('armZ'), elbowN: L('elbow'), elbowF: L('elbow'), twistN: L('twist'), twistF: -L('twist'),
          thighZn: L('thighZ'), thighZf: L('thighZ'), thighXn: -L('thighX'), thighXf: L('thighX'), kneeN: L('knee'), kneeF: L('knee'), footN: L('foot'), footF: L('foot'),
          eyes: 1, mouth: 0, hairLift: 0.3,
        });
        dur = 0.3;
        break;
      }
      // ------------------------------------------------------------ Welt 5
      case 'trapeze':
        pose = P(this.poseTrapeze(c, t));
        dur = 0.14;   // Griff zur Stange (Motor: 0,12 s in die Hängelage)
        break;
      case 'cannon': {
        const o = this.poseCannon(c, t, phase);
        pose = P(o);
        dur = 0.08;   // kommt unsichtbar aus der Röhre
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
    this.w3?.stone.set(false);
    this.w3?.fx.dispose();
    this.w3?.tail.skeleton.dispose();
    super.dispose();
  }
}

// ================================================================== Pflaume (Kaninchen)
// Figurenstil: rundlicher, flauschiger Körper (Laib mit vollen Keulen, weiße Brust, Puschelschwänzchen), runder Kopf mit
// Pausbacken und großen glänzenden Augen, weiche breite Schlappohren (innen rosa), kurze stämmige Beine mit runden Pfoten,
// weiße Zehen am nahen Hinterfuß. Gelenke wie bisher (Reiten, Floß, Ausrüstung); alles Fell teilt ein Material (Bündel).
const FUR_C = '#1f1c24', FURW_C = '#f4f1f8', PINK_C = '#ffa3c6', FUR_HI = '#3a3544';
const HEAD_PIV = V(0.44, 0.74, 0);   // Halsansatz (Kopf-Drehpunkt)
const HC = V(0.12, 0.20, 0);         // Kopfmitte, kopf-lokal → Welt ≈ (0.56, 0.94)
/** Kopfform: rund, Pausbacken unten seitlich, kleine Schnauze vorn. */
const RHEAD = new HeadShape(HC, 0.285, { sx: 1.03, sy: 0.95, sz: 1.08, bulges: [{ az: 0.62, el: -0.42, w: 0.42, a: 0.028, sym: true }, { az: 0, el: -0.2, w: 0.3, a: 0.026 }] });
const RNOSE = RHEAD.point(dirAE(0, -0.1), -0.012);
const furShade = (p, yTop, k = 0.55) => col3(FUR_C).lerp(col3(FUR_HI), k * smoothstep((p.y - yTop) / 0.18));

/** Rumpf: weicher Laib (hinten voll und rund, Keulen seitlich unten), weiße Brust, Puschelschwänzchen. Rumpf-lokal. */
function rabbitTorsoGeo() {
  return geo('rabbit:torso3', () => {
    const white = col3(FURW_C);
    // Hinterteil (groß, rund), Brust (höher, schmaler), Keulen seitlich unten – glatt verschmolzen; Bauch sitzt flach auf
    const body = blobUnionGeo([
      { c: [-0.27, 0.43, 0], r: [0.37, 0.37, 0.34] },
      { c: [0.2, 0.45, 0], r: [0.31, 0.34, 0.27] },
      { c: [-0.31, 0.28, 0.2], r: [0.24, 0.2, 0.15] },
      { c: [-0.31, 0.28, -0.2], r: [0.24, 0.2, 0.15] },
    ], {
      center: [-0.04, 0.44, 0], k: 0.16, nu: 30, nv: 22, floor: { y: 0.11, k: 0.45 },
      color: (p) => {
        const w = smoothstep((p.x - 0.21) / 0.05) * smoothstep((0.74 - p.y) / 0.05) * (1 - smoothstep((Math.abs(p.z) - 0.17) / 0.04));
        return furShade(p, 0.68).lerp(white, w);
      },
    });
    // Puschelschwänzchen (Wölkchen aus fünf Kugeln)
    const tail = [[-0.64, 0.5, 0, 0.1], [-0.68, 0.57, 0.04, 0.06], [-0.68, 0.45, -0.05, 0.06], [-0.6, 0.6, -0.05, 0.055], [-0.69, 0.52, -0.02, 0.06]]
      .map(([x, y, z, r]) => ellipsoidGeo(V(x, y, z), V(r, 0, 0), V(0, r, 0), V(0, 0, r), white, 12, 8));
    const m = mergeColored(own([body, ...tail]));
    body.dispose(); for (const t of tail) t.dispose();
    return m;
  });
}

/** Kopf: Fell, Pausbacken, rosa Schnäuzchen-Mund („ω“), zarte Wangenröte. Kopf-lokal (Drehpunkt am Halsansatz). */
function rabbitHeadGeo() {
  return geo('rabbit:head2', () => {
    const muz = col3('#3a3444'), blush = col3('#c46a8e'), pink = col3('#f08ab2');
    const d = new THREE.Vector3();
    const parts = [gridGeo({
      nu: 30, nv: 20, point: (u, v, out) => RHEAD.point(dirAE(u * TAU, -Math.PI / 2 + v * Math.PI), 0, out),
      color: (u, v, p) => {
        d.copy(p).sub(HC).normalize();
        const c = furShade(p, HC.y + 0.12, 0.6);
        const m = Math.exp(-((Math.acos(clamp(d.dot(dirAE(0, -0.28)), -1, 1)) / 0.3) ** 2));
        const b = Math.max(...[1, -1].map((s) => Math.exp(-((Math.acos(clamp(d.dot(dirAE(s * 0.72, -0.25)), -1, 1)) / 0.18) ** 2))));
        return c.lerp(muz, 0.6 * m).lerp(blush, 0.4 * b);
      },
    })];
    const f = RHEAD.frame(0, -0.33);
    for (const s of [1, -1]) {
      parts.push(stripGeo(RHEAD, f, { n: 10, across: 2, curve: (t) => [s * 0.036 * t, -0.012 * Math.sin(Math.PI * t) + 0.004 * t], width: () => 0.0042, lift: () => 0.0018, color: () => pink }));
    }
    parts.push(stripGeo(RHEAD, RHEAD.frame(0, -0.2), { n: 6, across: 1, curve: (t) => [0, 0.03 - 0.06 * t], width: () => 0.0035, lift: () => 0.0018, color: () => pink }));
    const m = mergeColored(own(parts));
    for (const g of parts) g.dispose();
    return m;
  });
}

/** Augen (groß, glänzend, dunkle Iris), geschlossen als heller Bogen auf dem dunklen Fell. */
function rabbitEyeGeos() {
  return geo('rabbit:eyes2', () => toonEyeGeos(RHEAD, {
    az: 0.6, el: 0.07, w: 0.072, h: 0.088, iris: '#7f421c', irisLight: 0.22, pupil: '#0b0507', look: 0.12, irisW: 0.86, irisH: 0.9, irisY: -0.02,
    bulge: 0.018, closedColor: '#d9c8ea', hlSide: 1,
  }));
}

/** Halstuch: Band um den Hals, Zipfel vor der Brust, Knoten – ein Mesh in Kraftfarbe. */
function rabbitBandanaGeo() {
  return geo('rabbit:bandana2', () => {
    const neckAxis = V(0.45, 0.89, 0).normalize();
    const band = new THREE.Matrix4().compose(V(0.03, 0.0, 0), new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), neckAxis), V(1, 1, 1));
    const tip = part(cone(0.13, 0.26, 4), null, { x: 0.23, y: -0.17, z: 0.04, rx: Math.PI, ry: Math.PI / 4, sz: 0.42 });
    const knot = part(sphere(0.058, 12, 8), null, { x: 0.24, y: -0.03, z: 0.07 });
    return mergePlain([[torus(0.225, 0.05, 8, 24), band], [tip[0], tip[2]], [knot[0], knot[2]]]);
  });
}

/** Schlappohr (ohr-lokal, hängt vom Drehpunkt nach −Y): breite, weiche Löffelform, Innenseite (zum Kopf) rosa. */
function rabbitEarGeo(side) {
  return geo(`rabbit:ear2:${side}`, () => {
    const L = 0.56, fur = col3(FUR_C), pink = col3(PINK_C), hi = col3(FUR_HI);
    const e = (v) => Math.sqrt(Math.sin((Math.PI / 2) * Math.min(1, v / 0.07))) * (v > 0.8 ? Math.sqrt(Math.max(0, 1 - ((v - 0.8) / 0.2) ** 2)) : 1);
    return gridGeo({
      nu: 16, nv: 14, flip: true,
      point: (u, v, out) => {
        const th = u * TAU, ev = e(v);
        const wx = (0.05 + 0.068 * Math.pow(Math.sin(Math.PI * Math.min(1, v * 1.12)), 0.8)) * ev, wz = 0.022 * ev + 0.004 * (v > 0.02 ? 1 : 0);
        const bend = side * 0.035 * Math.sin(Math.PI * v);
        return out.set(wx * Math.cos(th), -L * v, wz * Math.sin(th) + bend);
      },
      color: (u, v) => {
        const th = u * TAU, inner = -Math.sin(th) * side;
        const k = smoothstep((inner - 0.15) / 0.5) * (1 - smoothstep((Math.abs(Math.cos(th)) - 0.55) / 0.35)) * smoothstep((v - 0.1) / 0.15) * (1 - smoothstep((v - 0.84) / 0.1));
        return fur.clone().lerp(hi, 0.4 * smoothstep((Math.abs(Math.cos(th)) - 0.6) / 0.4)).lerp(pink, 0.9 * k);
      },
    });
  });
}

/** Vorderpfote (pivot-lokal, hängt nach −Y): kurzes, stämmiges Bein, runde Pfote. */
function rabbitFrontGeo() {
  return geo('rabbit:front2', () => {
    const leg = latheGeo([[0.0, -0.14], [0.06, -0.13], [0.072, -0.09], [0.075, -0.03], [0.07, 0.02], [0.0, 0.05]], { segs: 12, steps: 8, color: (phi, y, p) => furShade(p, 0.0, 0.3) });
    const paw = ellipsoidGeo(V(0.022, -0.168, 0), V(0.086, 0, 0), V(0, 0.056, 0), V(0, 0, 0.076), (p) => furShade(p, -0.17, 0.4), 14, 10);
    const m = mergeColored(own([leg, paw]));
    leg.dispose(); paw.dispose();
    return m;
  });
}
/** Hinterfuß (Drehpunkt an der Ferse unter der Keule): ovale Pfote nach vorn; spot → weiße Zehen. */
function rabbitHindGeo(spot) {
  return geo(`rabbit:hind2:${spot ? 1 : 0}`, () => {
    const white = col3(FURW_C);
    return blobGeo({
      x0: -0.08, x1: 0.34, nu: 16, nv: 12, hy: (v) => 0.064 * Math.pow(Math.sin(Math.PI * v), 0.5), hz: (v) => (0.07 + 0.012 * v) * Math.pow(Math.sin(Math.PI * v), 0.5), yc: () => -0.13,
      deform: (p) => { if (p.y < -0.18) p.y = -0.18 + (p.y + 0.18) * 0.4; },
      color: (p) => (spot ? furShade(p, -0.1, 0.4).lerp(white, smoothstep((p.x - 0.17) / 0.08)) : furShade(p, -0.1, 0.4)),
    });
  });
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
    // eigenes Fell-Material: schwaches Randlicht/Glanz, damit das schwarze Fell im Spielzeug-Look nicht grau wirkt
    const fur = applyToyLook(mat('pflaume:fur', { vertexColors: true, roughness: 0.8 }), { rim: 0.3, spec: 0.3 }), gloss = SURF.gloss();
    const smesh = (g, m, shadow = true) => { const me = new THREE.Mesh(g, m); me.castShadow = shadow; return me; };
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
    this.torso.add(smesh(rabbitTorsoGeo(), fur));

    // Kopf (Drehpunkt am Halsansatz): Fell+Schnäuzchen, Nase (wackelt), Augen (offen/zu, Glanzpunkte), offener Mund
    this.head = new THREE.Group(); this.head.position.copy(HEAD_PIV);
    this.torso.add(this.head);
    this.head.add(smesh(rabbitHeadGeo(), fur));
    this.noseY = RNOSE.y;
    this.nose = mesh(sphere(0.05, 12, 8), mat('fur-pink', { color: PINK_C, roughness: 0.45 }), { x: RNOSE.x, y: RNOSE.y, sx: 0.7, sy: 0.62, sz: 0.85 });
    this.head.add(this.nose);
    const E = rabbitEyeGeos();
    this.eyes = smesh(E.open, gloss, false); this.eyes.position.y = E.eyeY;
    this.eyesClosed = smesh(E.closed, gloss, false); this.eyesClosed.position.y = E.eyeY; this.eyesClosed.visible = false;
    this.eyeHl = smesh(E.hl, basicMat('white', { color: 0xffffff }), false); this.eyeHl.position.y = E.eyeY;
    this.head.add(this.eyes, this.eyesClosed, this.eyeHl);
    const mf = RHEAD.frame(0, -0.4);
    this.mouthO = smesh(mouthGeo(), gloss, false);
    this.mouthO.position.copy(RHEAD.point(mf.d, -0.002));
    this.mouthO.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(mf.T.clone().negate(), mf.B, mf.n));
    this.mouthO.scale.setScalar(0.001);
    this.head.add(this.mouthO);
    // Schnurrhaare (hell, ein Linienkörper) seitlich am Schnäuzchen
    this.head.add(new THREE.LineSegments(geo('rabbit:whiskers2', () => {
      const pts = [], o = RNOSE.clone().add(V(-0.05, -0.035, 0));
      for (const s of [1, -1]) for (const [dx, dy, dz] of [[0.22, 0.08, 0.17], [0.24, 0.01, 0.2], [0.21, -0.06, 0.18]]) pts.push(V(o.x, o.y, s * 0.075), V(o.x + dx, o.y + dy, s * (0.075 + dz)));
      return new THREE.BufferGeometry().setFromPoints(pts);
    }), lineMat('whisker', { color: 0xe8e4f0 })));
    // Schlappohren: Drehpunkt oben am Kopf, hängen seitlich herab (nahes Ohr abgespreizt), Innenseite rosa
    this.ears = [];
    for (const s of [1, -1]) {
      const ear = new THREE.Group(); ear.position.set(0.05, 0.43, s * 0.15);
      const inner = new THREE.Group(); // Drehung um die Ohrachse (Twist)
      inner.add(smesh(rabbitEarGeo(s), fur));
      ear.add(inner); ear.inner = inner; ear.side = s;
      this.head.add(ear); this.ears.push(ear);
    }
    this.head.add(mesh(rabbitBandanaGeo(), this.bandanaMat));

    // Hinterpfoten (Drehpunkt an der Ferse unter der Keule) und kurze, stämmige Vorderbeine
    const makeHind = (s) => {
      const piv = new THREE.Group(); piv.position.set(-0.40, 0.20, s * 0.27);
      piv.add(smesh(rabbitHindGeo(s > 0), fur));
      this.body.add(piv);
      return piv;
    };
    this.hindN = makeHind(1); this.hindF = makeHind(-1);
    const makeFront = (s) => {
      const piv = new THREE.Group(); piv.position.set(0.34, 0.25, s * 0.15);
      const me = smesh(rabbitFrontGeo(), fur, false); piv.add(me); piv.limbMesh = me;
      this.body.add(piv);
      return piv;
    };
    this.frontN = makeFront(1); this.frontF = makeFront(-1);
  }

  /** Augen wie bei der Heldin (Blinzeln über scale.y, fast zu → Lidbogen). */
  applyEyes(open) { HeroAvatar.prototype.applyEyes.call(this, open); }

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
    this.applyEyes(p.eyes);
    const mo = Math.max(0.001, p.mouth);
    this.mouthO.scale.set(0.042 * mo, 0.05 * mo, 0.006 + 0.01 * mo);
    this.mouthO.visible = mo > 0.2;    // zu bzw. nur Schnuppern: kein Zeichenaufruf
    this.nose.position.y = this.noseY + 0.012 * nose;
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
      // Gesicht neutral (Augen offen, Mund zu) – wie im Klassik-Stand
      this.eyes.visible = true; this.eyesClosed.visible = false; this.eyes.scale.set(1, 1, 1); this.eyeHl.scale.set(1, 1, 1);
      this.mouthO.visible = false; this.mouthO.scale.setScalar(0.001);
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
