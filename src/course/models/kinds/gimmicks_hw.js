// Gimmick- und Item-Modelle der Halloween-Welt „Kürbisinsel“ (Kurs-Modus). Eigene Gestaltung, kindgerecht-gruselig.
// Maßstab Meter, Blick/Vorderseite +X; state darf ein String sein ('idle' ≙ { anim: 'idle' }). Ursprung je Modell genannt.
//
// laterne_hand        Laterne zum Tragen/Hängen (≈0,6 m): Eisenkäfig mit Bügel, darin ein gläserner Kürbis mit Kerze.
//   **Ursprung = Griff (Bügel oben)**, die Laterne hängt nach −Y.
//   opts  { light: false (true: eigenes PointLight, Reichweite range), range (6), color (Lichtfarbe 0xffb050) }
//   state { lit (bool | 0..1, Standard true), sway (rad; Pendelwinkel um lokal X/Z, Standard 0 – leichtes Wackeln kommt
//           dazu), swayZ (rad, optional zweite Achse) }
//   root.userData.light → PointLight (nur mit opts.light), userData.glowPos → Lichtmitte relativ zum Ursprung.
// geisterplattform    halbdurchsichtig leuchtende Geister-Plattform: gepolsterte Wolkenplatte (mintweiß, Sternchen oben),
//   Lakensaum mit Wellen unten, schlafendes Gesicht vorn. **Ursprung = Mitte der Unterseite** (wie Bausteine: pos/size).
//   opts  { size: [w, h, d] ([2, 0,5, 2]), color: 'mint' | 'lila' | 'orange' }
//   state { visible (0..1; 0 = unsichtbar, 1 = voll da – im Lichtkegel), wake (bool: Augen auf) }
//   Viele → createInstanced('geisterplattform', n, opts) (lib/instanced_hw.js; state { visible } je Platz).
// besen_plattform     fliegender Besen mit Brett: langer Holzstiel entlang X, Reisigbüschel hinten (−X) mit oranger
//   Schnur, gerollte Spitze vorn, darauf ein lila Brett mit Sternen. **Ursprung = Mitte der Lauffläche (Brett-Oberseite)**.
//   opts  { length (Brett 2,0 m entlang X), width (1,2), stick (Stiellänge 3,2) }
//   state { tilt (rad; Nase hoch +, um lokal Z), bank (rad; um lokal X), speed (m/s; Funkenschweif, Reisig flattert) }
//   root.userData.size → { w, d } (Brettmaße), userData.top → 0.
// hexenkessel         Trampolin-Kessel (Ø ≈1,7 m): glänzender schwarz-lila Kessel mit dickem Rand, Goldmond und Stern,
//   drei Klauenfüße, kleine Zauberflämmchen darunter, grüner Blubber mit Blasen. **Ursprung = Fußpunkt**.
//   opts  { size (Faktor, 1) }
//   state { bounce (0..1: Blubber gibt nach, Kessel federt; zurück auf 0 → Spritzer), bubble (0..1 Blubber-Stärke, Standard 1) }
//   root.userData.top → Höhe der Blubber-Oberfläche (≈0,95 m · size).
// kuerbis_kanone      Kürbis-Kanone: großer leuchtender Grinse-Kürbis (Ø ≈1,6 m) auf Holzkufen, oben ein Eisenrohr mit
//   Goldringen statt Stiel. **Ursprung = Fußpunkt**; das Rohr zeigt nach +X schräg nach oben (opts.aim).
//   opts  { aim (rad über der Waagerechten, 0,9), size (Faktor, 1) }   state.aim (rad) überschreibt opts.aim (Rohr schwenkt).
//   state { anim: 'idle'|'load'|'fire', k (0..1 Ladung: Rohr bläht sich, Gesicht glüht), fire (0..1 Schuss; Standard: 'fire'
//           spielt 0,5 s ab) }  fire: Rückstoß, Mündungsblitz (Stern), Rauchring.
//   model.muzzle(out?) → Weltposition der Mündung; model.dir(out?) → Schussrichtung (Welt, normiert).
// suessigkeiten_tuer  Haustür (Süßes oder Saures): lila Tür mit Rundfenster und Kranz (Mini-Kürbisse, Schleife), Rahmen mit
//   Bogen, Klingelknopf rechts, Lampe oben, Fußmatte. **Ursprung = Mitte der Schwelle**, Tür blickt nach +X, öffnet nach
//   innen (−X) und gibt warmes Licht frei.  opts { width (1,3), height (2,4) }
//   state { open (0..1), ring (bool | 0..1: Knopf leuchtet, Noten hüpfen, Glöckchen bimmelt) }
// riesenkuerbis_roll  rollender Riesenkürbis (Ø = size, 2 m) mit leuchtendem Staunegesicht und Blattkrause am Stiel.
//   **Ursprung = Auflagepunkt.**  opts { size (2), face ('staunen') }
//   state { roll (rad; wächst beim Rollen nach +X – z. B. zurückgelegte Strecke / (size/2); wie schiebekugel),
//           speed (m/s; Staubwolken) }
// spinnennetz_trampolin  waagerechtes Spinnennetz-Trampolin in einem Ring aus knorrigen Ästen auf vier Stummelbeinen; eine
//   freundliche Spinne mit Schleife sitzt am Rand. **Ursprung = Fußpunkt (Mitte)**; Netz bei y = height.
//   opts  { radius (1,0), height (0,5) }   state { bounce (0..1: Mitte gibt nach, bis 0,35 m) }
//   root.userData.top → height.
// grabstein_schalter  Grabstein-Schalter: runder Grabstein mit Gesicht auf einem Steinsockel, oben ein großer orange
//   leuchtender Knopf. **Ursprung = Fußpunkt.**  state { pressed (bool | 0..1) }  gedrückt: sinkt 0,35 m in den Sockel,
//   lacht (^ ^), Leuchtring am Boden.
// suessigkeit         Sammel-Süßigkeit (≈0,45 m), schwebt und dreht sich. **Ursprung = Fußpunkt**, Mitte bei y = 0,45.
//   opts  { kind: 'bonbon' | 'lolli' | 'riegel' | 'mais', color (Index 0–5) }
//   state { anim: 'idle'|'collected' }  collected: hüpft hoch, dreht schnell, schrumpft (0,35 s), dann unsichtbar.
//   Viele → createInstanced('suessigkeit', n, { kind, color }).
// bonbon_konfetti     Konfetti aus Süßigkeiten (Boss besiegt): bunte Bonbons, Lollis, Zuckermais fliegen aus dem Ursprung
//   und regnen herab.  opts { count (32), radius (3) }  state { anim: 'burst'|'idle', progress? (burst 0..1 in 1,8 s) }
//   idle: nichts sichtbar.

import {
  THREE, TAU, Build, cached, vcol, basic, mesh, joint, eyes, makeModel, Clock, Blinker, damp, clamp, mix, smoothstep,
  instMesh, glowSprite, sparkleSprite, puffyStarGeo, placed, glowTexture,
} from '../lib/kit.js';
import { Puffs, stick } from '../lib/kit_w3.js';
import {
  HW, PK, PK_COLORS, pkPoint, pkSurf, pumpkinGeo, stemGeo, leafGeo, tendrilGeo, addFace, glow, ownMat, noToy, puffyGeo,
  candyGeo, CANDY_KINDS, graveGeo, hash1, noise3, memo, add, gradV, roundRectShape, ellSurf, subdivide,
} from '../lib/hwGeos.js';

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
const lit01 = (v, d = 1) => (v === undefined ? d : v === true ? 1 : v === false ? 0 : clamp(Number(v) || 0, 0, 1));
const IRON = { v: (x, y, z, nx, ny) => mix(0x221a30, 0x5a4e78, smoothstep(ny * 0.5 + nx * 0.25 + 0.35)) };

// =============================================================================================
// Laterne zum Tragen
// =============================================================================================
const LT_GLASS_Y = -0.36;    // Mitte des Glas-Kürbisses unter dem Griff
const LT_P = { R: 0.13, Hh: 0.11, ribs: 8, depth: 0.12, dimple: 0.15, bottom: 0.95 };
const lanternCageGeo = () => cached('hw:lt:cage', () => {
  const b = new Build();
  // Bügel (Halbring) und Griffröhrchen
  b.torus(0.12, 0.012, IRON, { p: [0, -0.12, 0], r: [0, Math.PI / 2, 0] }, 6, 20, Math.PI);
  b.cyl(0.022, 0.022, 0.1, 0x8a5a2a, { p: [0, -0.005, 0], r: [Math.PI / 2, 0, 0] }, 10);
  // Dach: gewölbte Kappe mit Spitze und Ring
  b.lathe([[0, -0.215], [0.18, -0.215], [0.17, -0.2], [0.1, -0.15], [0.04, -0.105], [0, -0.1]], IRON, null, 24);
  b.sphere(0.025, 0xffc21a, { p: [0, -0.09, 0] }, 10, 8);
  // Boden mit Füßchen
  b.cyl(0.16, 0.14, 0.05, IRON, { p: [0, LT_GLASS_Y - 0.13, 0] }, 24);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + Math.PI / 4; b.sphere(0.022, 0xffc21a, { p: [Math.cos(a) * 0.12, LT_GLASS_Y - 0.165, Math.sin(a) * 0.12] }, 8, 6); }
  // vier Stäbe (leicht gebaucht)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
    b.tube([[c * 0.165, -0.21, s * 0.165], [c * 0.19, LT_GLASS_Y, s * 0.19], [c * 0.15, LT_GLASS_Y - 0.11, s * 0.15]], 0.012, 0x3a3050, null, 10, 5);
  }
  return b.geometry();
});
const lanternGlassGeo = () => cached('hw:lt:glass2', () => pumpkinGeo(LT_P, [0xff9a30, 0xffd890, 0xe0700e, 0xb85008]));
const candleGeo = () => cached('hw:lt:candle', () => {
  const b = new Build();
  b.cyl(0.035, 0.038, 0.09, 0xfff4dc, { p: [0, -0.045, 0] }, 12);
  b.lathe([[0, 0], [0.022, 0.01], [0.026, 0.035], [0.012, 0.07], [0, 0.085]], { v: (x, y) => mix(0xffa020, 0xfff6c0, smoothstep(y / 0.06)) }, { p: [0, 0.005, 0] }, 10);
  return b.geometry();
});
function buildLaterneHand(opts = {}) {
  const root = new THREE.Group();
  const own = [];
  const swing = joint();
  const cage = mesh(lanternCageGeo(), vcol(0.35), {}, true);
  const glassMat = ownMat(vcol(0.15, { transparent: true, opacity: 0.88 }, 'hwltglass'), { emissive: new THREE.Color(0, 0, 0) });
  own.push(glassMat);
  const glass = mesh(lanternGlassGeo(), glassMat, { p: [0, LT_GLASS_Y, 0] });
  glass.renderOrder = 2;
  const flame = mesh(candleGeo(), basic('hwCandle', { vertexColors: true, toneMapped: false }), { p: [0, LT_GLASS_Y - 0.06, 0] });
  const halo = glowSprite(opts.color ?? 0xffb050, 1.1, 0.75); halo.position.y = LT_GLASS_Y;
  swing.add(cage, glass, flame, halo);
  root.add(swing);
  let light = null;
  if (opts.light) {
    light = new THREE.PointLight(opts.color ?? 0xffb050, 0, opts.range ?? 6, 1.6);
    light.position.y = LT_GLASS_Y;
    swing.add(light);
    root.userData.light = light;
    own.push(light);
  }
  root.userData.glowPos = new THREE.Vector3(0, LT_GLASS_Y, 0);
  const clk = new Clock();
  let k = 1;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t = clk.t;
    k = damp(k, lit01(st.lit), 10, dt);
    const fl = 0.9 + Math.sin(t * 13) * 0.05 + Math.sin(t * 21.7) * 0.05;
    glassMat.emissive.setRGB(1.0 * k * fl, 0.48 * k * fl, 0.06 * k * fl);
    glassMat.color.setScalar(1 - k * 0.2);
    flame.visible = k > 0.05;
    flame.scale.set(1, 0.85 + fl * 0.2, 1);
    halo.visible = k > 0.05;
    halo.scale.setScalar((1 + fl * 0.2) * k);
    if (light) light.intensity = 9 * k * fl;
    swing.rotation.x = (st.sway ?? 0) + Math.sin(t * 2.3) * 0.04;
    swing.rotation.z = (st.swayZ ?? 0) + Math.sin(t * 1.7) * 0.05;
  };
  return makeModel('laterne_hand', root, update, own, { initial: 'idle' });
}

// =============================================================================================
// Geisterplattform
// =============================================================================================
export const GHOST_COLORS = {
  mint: { top: 0xf2fffa, side: 0xb8f5e0, low: 0x7ad8c0, glow: 0x6affd8, face: 0x2a5a58, cheek: 0xff9ac0 },
  lila: { top: 0xfaf2ff, side: 0xdcc8ff, low: 0xa88ae8, glow: 0xb48aff, face: 0x3a2a6a, cheek: 0xff9ac0 },
  orange: { top: 0xfff8ec, side: 0xffdcb0, low: 0xf0a868, glow: 0xffb060, face: 0x6a3018, cheek: 0xff8aa0 },
};
/** Geisterplatte (Mitte der Unterseite im Ursprung): Polsterplatte, Wellen-Saum, Gesicht vorn (+X), Sternchen oben. */
export function ghostPlatformGeo(w = 2, h = 0.5, d = 2, color = 'mint', lo = false, sleep = true) {
  return cached(`hw:gp:${w}:${h}:${d}:${color}:${lo}:${sleep}`, () => {
    const C = GHOST_COLORS[color] ?? GHOST_COLORS.mint;
    const b = new Build();
    const r = Math.min(0.22, h * 0.45, w * 0.2, d * 0.2);
    const slabH = h * 0.62;
    b.box(w, slabH, d, { v: (x, y, z, nx, ny) => (ny > 0.6 ? mix(C.side, C.top, smoothstep(1 - Math.max(Math.abs(x) / (w / 2), Math.abs(z) / (d / 2)) * 0.6)) : mix(C.low, C.side, smoothstep(ny * 0.6 + 0.6))) }, { p: [0, h - slabH / 2, 0] }, r, lo ? 1 : 3);
    // Wellen-Saum: Tropfen-Zipfel rundum unter der Platte
    const per = Math.max(3, Math.round((w + d) * 1.6));
    const hemY = h - slabH;
    const edge = (u, side) => {
      // Punkt auf dem Umfang (u 0..1 je Seite)
      if (side === 0) return [-w / 2 + u * w, -d / 2 + 0.02];
      if (side === 1) return [w / 2 - 0.02, -d / 2 + u * d];
      if (side === 2) return [w / 2 - u * w, d / 2 - 0.02];
      return [-w / 2 + 0.02, d / 2 - u * d];
    };
    for (let side = 0; side < 4; side++) {
      const n = Math.max(2, Math.round(per * ((side % 2 ? d : w) / (w + d)) * 0.5 + 1));
      for (let i = 0; i < n; i++) {
        const [x, z] = edge((i + 0.5) / n, side);
        const len = hemY * 0.9 + 0.08 + ((i + side) % 2) * 0.06;
        b.sphere(1, { v: (xx, yy, zz, nx, ny) => mix(C.low, C.side, smoothstep(ny * 0.5 + 0.5)) }, { p: [x * 0.97, hemY - len * 0.35 + 0.04, z * 0.97], s: [0.16, len * 0.55, 0.16] }, lo ? 6 : 12, lo ? 4 : 8);
      }
    }
    // Sternchen oben (eingelegt)
    const ns = lo ? 2 : 5;
    for (let i = 0; i < ns; i++) {
      const x = (hash1(i * 3.3 + w) - 0.5) * (w - 0.5), z = (hash1(i * 7.1 + d) - 0.5) * (d - 0.5);
      b.add(puffyStarGeo(0.09, 0.04, 0.02, 0.012), 0xffffff, { p: [x, h + 0.005, z], r: [-Math.PI / 2, 0, hash1(i) * TAU] });
    }
    // schlafendes Gesicht vorn: geschlossene Bogenaugen, kleiner Mund, Wangen
    const fx = w / 2 + 0.005, fy = h - slabH * 0.5;
    for (const s of [1, -1]) {
      if (sleep) b.add(sleepArc(lo), C.face, { p: [fx, fy + 0.03, s * 0.2] });
      b.sphere(1, C.cheek, { p: [fx - 0.01, fy - 0.04, s * 0.33], s: [0.02, 0.04, 0.07] }, lo ? 6 : 10, lo ? 4 : 6);
    }
    b.torus(0.04, 0.014, C.face, { p: [fx, fy - 0.04, 0], r: [0, Math.PI / 2, Math.PI] }, 6, 12, Math.PI);
    return b.geometry();
  });
}
/** geschlossenes Bogenauge (∪, schlafend) in der YZ-Ebene. */
const sleepArc = (lo) => { const g = new THREE.TorusGeometry(0.075, 0.018, lo ? 4 : 6, lo ? 8 : 14, Math.PI); g.rotateZ(Math.PI); g.rotateY(Math.PI / 2); return g; };
/** Gesicht schlafend: nur die beiden Bogenaugen (Einzelmodell blendet zwischen schlafend und wach um). */
const ghostSleepGeo = (w, h, color) => cached(`hw:gp:sleep:${w}:${h}:${color}`, () => {
  const C = GHOST_COLORS[color] ?? GHOST_COLORS.mint;
  const b = new Build();
  const fx = w / 2 + 0.005, fy = h - h * 0.62 * 0.5;
  for (const s of [1, -1]) b.add(sleepArc(false), C.face, { p: [fx, fy + 0.03, s * 0.2] });
  return b.geometry();
});
/** Gesicht wach: zwei große Ovalaugen mit Glanzpunkt (für wake). */
const ghostEyesGeo = (w, h, color) => cached(`hw:gp:eyes:${w}:${h}:${color}`, () => {
  const C = GHOST_COLORS[color] ?? GHOST_COLORS.mint;
  const b = new Build();
  const fx = w / 2 + 0.012, fy = h - h * 0.62 * 0.5 + 0.04;
  for (const s of [1, -1]) {
    b.sphere(1, C.face, { p: [fx, fy, s * 0.2], s: [0.02, 0.09, 0.065] }, 12, 8);
    b.sphere(1, 0xffffff, { p: [fx + 0.012, fy + 0.035, s * 0.2 + 0.02], s: [0.01, 0.025, 0.02] }, 8, 6);
  }
  return b.geometry();
});
function buildGeisterplattform(opts = {}) {
  const sz = Array.isArray(opts.size) ? opts.size : [2, 0.5, 2];
  const w = Math.max(0.5, sz[0] ?? 2), h = Math.max(0.15, sz[1] ?? 0.5), d = Math.max(0.5, sz[2] ?? sz[1] ?? 2);
  const color = GHOST_COLORS[opts.color] ? opts.color : 'mint';
  const C = GHOST_COLORS[color];
  const root = new THREE.Group();
  const own = [];
  const mat = ownMat(vcol(0.3, {}, 'hwghostplat'), { transparent: true, opacity: 0.8, emissive: new THREE.Color(C.glow).multiplyScalar(0.35), depthWrite: false });
  own.push(mat);
  const float = joint();
  const body = mesh(ghostPlatformGeo(w, h, d, color, false, false), mat, {}, true);
  body.renderOrder = 2;
  const eyesM = mesh(ghostEyesGeo(w, h, color), mat);
  eyesM.visible = false;
  const sleepM = mesh(ghostSleepGeo(w, h, color), mat);
  const glowM = mesh(cached(`hw:gp:glow:${w}:${d}`, () => { const g = new THREE.PlaneGeometry(w + 1.4, d + 1.4); g.rotateX(-Math.PI / 2); return g; }), ownMat(add(`gp:${color}`, C.glow, 0.3), { map: glowTexture() }), { p: [0, 0.02, 0] });
  own.push(glowM.material);
  glowM.renderOrder = 1;
  const sparkle = sparkleSprite(0xffffff, 0.5); sparkle.position.set(0, h + 0.3, 0);
  float.add(body, eyesM, sleepM, sparkle);
  root.add(float, glowM);
  root.userData.size = { w, h, d };
  const clk = new Clock();
  let vis = 1;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t = clk.t;
    const target = lit01(st.visible, 1);
    vis = damp(vis, target, 14, dt);
    if (Math.abs(vis - target) < 0.002) vis = target;
    const on = vis > 0.01;
    root.visible = on;
    if (!on) return;
    const flick = vis < 0.98 ? (Math.sin(t * 23) * 0.5 + 0.5) * 0.12 * (1 - vis) : 0;
    mat.opacity = clamp(0.82 * vis - flick, 0, 1);
    mat.depthWrite = vis > 0.97;
    body.castShadow = vis > 0.6;      // nur fast feste Plattformen werfen Schatten
    mat.emissive.set(C.glow).multiplyScalar(0.3 + 0.12 * Math.sin(t * 2.4));
    glowM.material.opacity = 0.28 * vis;
    float.position.y = Math.sin(t * 1.6) * 0.015 * vis;
    float.scale.set(1, 0.92 + vis * 0.08, 1);
    eyesM.visible = !!st.wake; sleepM.visible = !st.wake;
    sparkle.visible = vis > 0.5;
    sparkle.position.set(Math.sin(t * 0.7) * w * 0.35, h + 0.15 + Math.abs(Math.sin(t * 1.3)) * 0.2, Math.cos(t * 0.9) * d * 0.35);
    sparkle.scale.setScalar(0.25 + Math.abs(Math.sin(t * 3)) * 0.3);
  };
  return makeModel('geisterplattform', root, update, own, { initial: 'idle' });
}

// =============================================================================================
// Besen-Plattform
// =============================================================================================
function broomGeo(L, W, S) {
  return cached(`hw:broom:${L}:${W}:${S}`, () => {
    const b = new Build();
    const T = 0.12;
    // Brett: lila lackiert mit hellem Rand und gelben Sternen, Holzkante darunter
    b.box(L, T, W, { v: (x, y, z, nx, ny) => (ny > 0.6 ? (Math.max(Math.abs(x) / (L / 2), Math.abs(z) / (W / 2)) > 0.9 ? 0xc89aff : 0x7a48d0) : mix(HW.woodLow, HW.wood, smoothstep(ny * 0.5 + 0.5))) }, { p: [0, -T / 2, 0] }, 0.05, 2);
    for (let i = 0; i < 3; i++) b.add(puffyStarGeo(0.11, 0.05, 0.02, 0.012), 0xffd84a, { p: [(i - 1) * L * 0.3, 0.004, (i % 2 ? 0.18 : -0.18) * W], r: [-Math.PI / 2, 0, i * 0.7] });
    // Stiel: knorriger Holzstab unter dem Brett, vorn eingerollt
    const y0 = -T - 0.07;
    b.tube([[-S * 0.42, y0 + 0.02, 0], [0, y0, 0], [S * 0.42, y0 + 0.03, 0], [S * 0.5, y0 + 0.12, 0], [S * 0.48, y0 + 0.2, 0], [S * 0.44, y0 + 0.15, 0]], 0.055, { v: (x, y, z, nx, ny) => mix(HW.woodLow, HW.woodHi, smoothstep(ny * 0.5 + 0.5 + Math.sin(x * 9) * 0.15)) }, null, 48, 10);
    // Halter zwischen Brett und Stiel
    for (const x of [-L * 0.35, L * 0.35]) b.cyl(0.04, 0.05, 0.08, HW.woodLow, { p: [x, -T - 0.035, 0] }, 10);
    // Schleife an der Spitze
    for (const s of [1, -1]) b.sphere(1, 0xff8a1a, { p: [S * 0.4, y0 + 0.04, s * 0.07], s: [0.06, 0.035, 0.06] }, 10, 8);
    return b.geometry();
  });
}
function bristleGeo(S) {
  return cached(`hw:broom:bristle:${S}`, () => {
    const b = new Build();
    // Reisigbüschel: schlanker Kegel nach hinten (−X), gewellte Halme, Strähnen am Ende; Ursprung = Bindestelle
    const L = 0.95;
    const g = new THREE.CylinderGeometry(0.07, 0.27, L, 24, 8, true);
    g.rotateZ(-Math.PI / 2); g.translate(-L / 2, 0, 0);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i); const a = Math.atan2(z, y), k = -x / L; const r = 1 + Math.sin(a * 12) * 0.08 * k; P.setXYZ(i, x - Math.max(0, Math.sin(a * 7)) * 0.08 * k * k, y * r, z * r); }
    g.computeVertexNormals();
    const strawV = { v: (x, y, z) => mix(HW.strawLow, HW.strawHi, clamp(0.35 + Math.sin(Math.atan2(z, y) * 12) * 0.35 + (-x / L) * 0.2, 0, 1)) };
    b.add(g, strawV);
    const cap = new THREE.CircleGeometry(0.27, 24); cap.rotateY(-Math.PI / 2);
    b.add(cap, HW.strawLow, { p: [-L + 0.02, 0, 0] });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU + hash1(i) * 0.3, r = 0.12 + hash1(i * 3) * 0.13;
      b.add(new THREE.ConeGeometry(0.018, 0.22 + hash1(i * 5) * 0.12, 4), strawV, { p: [-L - 0.06, Math.cos(a) * r, Math.sin(a) * r], r: [a, 0, Math.PI / 2 + Math.cos(a) * 0.25], order: 'XYZ' });
    }
    b.torus(0.085, 0.028, 0xff8a1a, { p: [-0.06, 0, 0], r: [0, Math.PI / 2, 0] }, 8, 18);
    b.torus(0.11, 0.022, 0x8a4ae0, { p: [-0.16, 0, 0], r: [0, Math.PI / 2, 0] }, 8, 18);
    return b.geometry();
  });
}
function buildBesenPlattform(opts = {}) {
  const L = Math.max(0.8, opts.length ?? 2), W = Math.max(0.5, opts.width ?? 1.2), S = Math.max(L + 0.4, opts.stick ?? 3.2);
  const root = new THREE.Group();
  const own = [];
  const tiltJ = joint();
  const broom = mesh(broomGeo(L, W, S), vcol(0.38), {}, true);
  broom.receiveShadow = true;
  const bristle = joint([-S * 0.42, -0.19, 0], mesh(bristleGeo(S), vcol(0.6), {}, true));
  tiltJ.add(broom, bristle);
  const trail = new Puffs(10, 0xffe88a, { opacity: 0.95, radius: 4, cy: 0, emissive: 0x8a6a10 });
  own.push(trail);
  const sp = sparkleSprite(0xfff2a0, 0.5); sp.position.set(-S * 0.42 - 0.9, -0.2, 0);
  tiltJ.add(sp);
  root.add(tiltJ, trail.mesh);
  root.userData.size = { w: L, d: W }; root.userData.top = 0;
  const clk = new Clock();
  let emit = 0;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t = clk.t, speed = Math.abs(st.speed ?? 0);
    tiltJ.rotation.set(st.bank ?? 0, 0, st.tilt ?? 0, 'XYZ');
    bristle.rotation.set(Math.sin(t * (4 + speed * 2)) * (0.03 + speed * 0.01), Math.sin(t * 3.1) * 0.05, 0);
    sp.scale.setScalar(0.3 + Math.abs(Math.sin(t * 5)) * 0.4);
    emit -= dt;
    if (emit <= 0) {
      emit = speed > 0.5 ? 0.06 : 0.25;
      _v.set(-S * 0.42 - 0.9, -0.2, 0).applyEuler(tiltJ.rotation);
      trail.burst([_v.x, _v.y, _v.z], { count: 1, speed: 0.3 + speed * 0.05, up: 0.1, size: 0.07, life: 0.7, spread: 0.15 });
    }
    trail.step(dt);
  };
  return makeModel('besen_plattform', root, update, own, { initial: 'idle' });
}

// =============================================================================================
// Hexenkessel (Trampolin)
// =============================================================================================
const KS = { body: 0x2a1e3e, hi: 0x6a5a8e, low: 0x140c20, rim: 0x3a2e52, goo: 0x6aff3a, gooHi: 0xd8ff9a, gooLow: 0x2ab82a, gold: 0xffc21a };
const KS_TOP = 0.95;
const kesselGeo = () => cached('hw:ks:body', () => {
  const b = new Build();
  // bauchiger Kessel (Drehkörper), dicker Rand, Klauenfüße
  const prof = [[0, 0.12], [0.35, 0.12], [0.62, 0.2], [0.8, 0.4], [0.84, 0.6], [0.78, 0.8], [0.7, 0.9], [0.68, 0.92]];
  b.lathe(prof, { v: (x, y, z, nx, ny) => mix(KS.low, mix(KS.body, KS.hi, smoothstep(nx * 0.5 + ny * 0.3 + 0.1) * 0.7), smoothstep(ny * 0.4 + 0.6)) }, null, 40, 3);
  b.torus(0.7, 0.07, { v: (x, y, z, nx, ny) => mix(KS.rim, 0x8a7aae, smoothstep(ny * 0.6 + 0.3)) }, { p: [0, 0.93, 0], r: [Math.PI / 2, 0, 0] }, 12, 48);
  // Innenwand (dunkel, Normalen nach innen) bis unter die Blubber-Oberfläche
  b.lathe([[0.69, 0.93], [0.66, 0.8], [0.58, 0.55], [0, 0.5]], 0x140c20, null, 32);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + Math.PI / 3;
    b.capsule(0.08, 0.12, KS.body, { p: [Math.cos(a) * 0.5, 0.1, Math.sin(a) * 0.5], r: [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4] }, 3, 10);
    for (let k = -1; k <= 1; k++) b.sphere(0.04, KS.gold, { p: [Math.cos(a + k * 0.12) * 0.62, 0.03, Math.sin(a + k * 0.12) * 0.62] }, 8, 6);
  }
  // Goldmond und Stern vorn (+X)
  b.add(puffyGeo((() => { const s = new THREE.Shape(); for (let i = 0; i <= 24; i++) { const a = Math.PI * 0.25 + (i / 24) * Math.PI * 1.5; const x = Math.cos(a), y = Math.sin(a); if (i) s.lineTo(x, y); else s.moveTo(x, y); } for (let i = 24; i >= 0; i--) { const a = Math.PI * 0.35 + (i / 24) * Math.PI * 1.3; s.lineTo(0.35 + Math.cos(a) * 0.75, Math.sin(a) * 0.75); } return s; })(), 0.15, 0.1, 1, 2), KS.gold, { p: [0.83, 0.55, 0.12], r: [0, Math.PI / 2 - 0.1, 0], s: 0.13 });
  b.add(puffyStarGeo(0.08, 0.035, 0.03, 0.015), KS.gold, { p: [0.82, 0.62, -0.13], r: [0, Math.PI / 2 + 0.15, 0.2] });
  return b.geometry();
});
const gooGeo = () => cached('hw:ks:goo', () => {
  const g = new THREE.CircleGeometry(0.66, 40, 0, TAU);
  g.rotateX(-Math.PI / 2);
  const b = new Build();
  b.add(subdivide(g.toNonIndexed(), 1), { v: (x, y, z) => mix(KS.goo, KS.gooHi, smoothstep(0.6 - Math.hypot(x, z)) * 0.6 + noise3(x * 6, 0, z * 6) * 0.25) });
  return b.geometry();
});
const bubbleGeo = () => cached('hw:ks:bubble', () => new Build().sphere(1, { v: (x, y, z, nx, ny) => mix(KS.goo, KS.gooHi, smoothstep(ny * 0.6 + 0.4)) }, null, 12, 8).geometry());
const flameGeo = () => cached('hw:ks:flame', () => {
  const b = new Build();
  b.lathe([[0, 0], [0.07, 0.03], [0.09, 0.09], [0.06, 0.18], [0.02, 0.26], [0, 0.29]], { v: (x, y) => mix(0xe8f8ff, 0x8a5aff, smoothstep(y / 0.25)) }, null, 10, 2);
  return b.geometry();
});
function buildHexenkessel(opts = {}) {
  const size = clamp(Number(opts.size ?? 1), 0.3, 4);
  const root = new THREE.Group();
  const own = [];
  const sj = joint(); sj.scale.setScalar(size);
  const spring = joint();
  const body = mesh(kesselGeo(), vcol(0.22, {}, 'hwkessel'), {}, true);
  const gooMat = ownMat(vcol(0.15, {}, 'hwgoo'), { emissive: new THREE.Color(0x1a5a08) });
  own.push(gooMat);
  const goo = mesh(gooGeo(), gooMat, { p: [0, KS_TOP - 0.03, 0] });
  const bubbles = instMesh(bubbleGeo(), gooMat, 10, 1.5, 1);
  const flames = instMesh(flameGeo(), basic('hwMagicFlame', { vertexColors: true, toneMapped: false }), 5, 1, 0.1);
  spring.add(body, goo, bubbles);
  sj.add(spring, flames);
  const splash = new Puffs(10, KS.goo, { opacity: 0.95, radius: 2, cy: 1, emissive: 0x2a8a10 });
  own.push(splash);
  sj.add(splash.mesh);
  const halo = glowSprite(0x8aff5a, 2.2, 0.35); halo.position.y = KS_TOP + 0.2;
  sj.add(halo);
  root.add(sj);
  root.userData.top = KS_TOP * size;
  const bub = Array.from({ length: 10 }, (_, i) => ({ x: (hash1(i) - 0.5) * 0.9, z: (hash1(i * 3.3) - 0.5) * 0.9, ph: hash1(i * 7.7), sp: 0.5 + hash1(i * 5.1) * 0.6, r: 0.04 + hash1(i * 9.9) * 0.06 }));
  const clk = new Clock();
  let bo = 0, prevB = 0;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t = clk.t;
    const bounce = lit01(st.bounce, 0), bubble = lit01(st.bubble, 1);
    bo = damp(bo, bounce, 18, dt);
    if (prevB > 0.3 && bounce < prevB - 0.2) splash.burst([0, KS_TOP + 0.05, 0], { count: 8, speed: 1.6, up: 2.2, size: 0.1, life: 0.6, spread: 0.3 });
    prevB = bounce;
    spring.scale.set(1 + bo * 0.06, 1 - bo * 0.1, 1 + bo * 0.06);
    goo.position.y = KS_TOP - 0.03 - bo * 0.22 + Math.sin(t * 3) * 0.008;
    goo.scale.setScalar(1 - bo * 0.06);
    for (let i = 0; i < 10; i++) {
      const b0 = bub[i];
      const c = ((t * b0.sp + b0.ph) % 1);
      const show = i < Math.round(10 * bubble);
      const sc = show ? b0.r * Math.sin(c * Math.PI) * (c > 0.92 ? 1.3 : 1) : 0;
      _m.compose(_v.set(b0.x * (1 - bo * 0.1), goo.position.y + sc * 0.4, b0.z), _q.identity(), _s.set(sc, sc * 0.8, sc));
      bubbles.setMatrixAt(i, sc > 0.001 ? _m : ZERO);
    }
    bubbles.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU, f = 0.8 + Math.sin(t * 11 + i * 2) * 0.2;
      flames.setMatrixAt(i, _m.compose(_v.set(Math.cos(a) * 0.5, 0.0, Math.sin(a) * 0.5), _q.setFromEuler(_e.set(0, 0, Math.sin(t * 7 + i) * 0.15)), _s.set(1, f, 1)));
    }
    flames.instanceMatrix.needsUpdate = true;
    gooMat.emissive.setRGB(0.08, 0.25 + Math.sin(t * 2) * 0.05, 0.03);
    splash.step(dt);
  };
  return makeModel('hexenkessel', root, update, [...own, bubbles, flames], { initial: 'idle' });
}

// =============================================================================================
// Kürbis-Kanone
// =============================================================================================
const KN_P = { R: 0.8, Hh: 0.62, ribs: 10, depth: 0.12, dimple: 0.2, bottom: 0.88 };
const KN_CY = KN_P.Hh * KN_P.bottom + 0.16;
function kanoneGeos() {
  return memo('hw:kn:geos', () => {
    const b = new Build(), gl = new Build();
    b.parts.push(pumpkinGeo(KN_P, PK_COLORS.orange));
    addFace(b, gl, pkSurf(KN_P), { kind: 'grinsen', az: 0, el: -0.05, w: 0.55, h: 0.5 });
    const body = b.geometry(), face = gl.geometry();
    body.translate(0, KN_CY, 0); face.translate(0, KN_CY, 0);
    // Holzkufen mit Eisenbeschlag
    const sk = new Build();
    for (const s of [1, -1]) {
      sk.tube([[-0.9, 0.2, s * 0.5], [-0.75, 0.07, s * 0.52], [0.6, 0.07, s * 0.52], [0.95, 0.24, s * 0.5]], 0.07, { v: (x, y, z, nx, ny) => mix(HW.woodLow, HW.woodHi, smoothstep(ny * 0.5 + 0.5)) }, null, 24, 8);
      sk.box(0.2, 0.16, 0.12, HW.woodLow, { p: [0, 0.15, s * 0.5] }, 0.03, 1);
    }
    sk.box(0.16, 0.08, 1.04, HW.wood, { p: [-0.5, 0.12, 0] }, 0.03, 1);
    sk.box(0.16, 0.08, 1.04, HW.wood, { p: [0.45, 0.12, 0] }, 0.03, 1);
    const top = pkPoint(KN_P, 0, 1.3).p.y + KN_CY;
    return { body, face, skids: sk.geometry(), top };
  });
}
const barrelGeo = () => cached('hw:kn:barrel', () => {
  const b = new Build();
  // Rohr entlang +Y ab Ursprung (Drehpunkt), Mündungswulst oben, Goldringe
  b.lathe([[0.2, -0.05], [0.24, 0.0], [0.22, 0.2], [0.2, 0.6], [0.22, 0.66], [0.28, 0.7], [0.29, 0.8], [0.24, 0.84], [0.17, 0.84], [0.16, 0.6]], IRON, null, 28, 2);
  for (const y of [0.18, 0.45]) b.torus(0.225, 0.025, 0xffc21a, { p: [0, y, 0], r: [Math.PI / 2, 0, 0] }, 6, 28);
  b.cyl(0.16, 0.16, 0.02, 0x0c0814, { p: [0, 0.76, 0] }, 24);
  // Drehlager
  b.sphere(0.28, IRON, { p: [0, 0, 0], s: [1, 0.6, 1] }, 20, 10);
  return b.geometry();
});
const flashGeo = () => cached('hw:kn:flash', () => new Build().add(puffyStarGeo(0.4, 0.17, 0.06, 0.04, 8), { v: (x, y) => mix(0xffffff, 0xffb020, smoothstep(Math.hypot(x, y) / 0.4)) }, {}).geometry());
function buildKuerbisKanone(opts = {}) {
  const size = clamp(Number(opts.size ?? 1), 0.3, 4);
  const aim = clamp(Number(opts.aim ?? 0.9), -0.2, Math.PI / 2);
  const G = kanoneGeos();
  const root = new THREE.Group();
  const own = [];
  const sj = joint(); sj.scale.setScalar(size);
  const squash = joint();
  const body = mesh(G.body, vcol(0.3), {}, true);
  const faceMat = ownMat(glow(), { color: new THREE.Color(1, 1, 1) });
  own.push(faceMat);
  const face = mesh(G.face, faceMat);
  const skids = mesh(G.skids, vcol(0.5), {}, true);
  const pivot = joint([0.05, G.top - 0.08, 0]);
  pivot.rotation.z = -(Math.PI / 2 - aim);   // +Y-Rohr kippt nach +X
  const recoil = joint();
  const barrel = mesh(barrelGeo(), vcol(0.3), {}, true);
  recoil.add(barrel);
  const flashMat = ownMat(basic('hwFlash', { vertexColors: true, toneMapped: false, transparent: true, depthWrite: false }));
  own.push(flashMat);
  const flash = mesh(flashGeo(), flashMat, { p: [0, 0.95, 0], r: [Math.PI / 2, 0, 0] });
  recoil.add(flash);
  pivot.add(recoil);
  squash.add(body, face, pivot);
  sj.add(squash, skids);
  const smoke = new Puffs(10, 0xe8e0f8, { opacity: 0.85, radius: 4, cy: 2 });
  own.push(smoke);
  root.add(sj, smoke.mesh);
  const muzzleObj = joint([0, 0.84, 0]); recoil.add(muzzleObj);
  const clk = new Clock();
  let fired = false;
  const update = (dt, st) => {
    let anim = st.anim ?? 'idle';
    if (!['idle', 'load', 'fire'].includes(anim)) anim = 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    const k = anim === 'load' ? clamp(st.k ?? clamp(clk.age / 0.8, 0, 1), 0, 1) : 0;
    const f = anim === 'fire' ? clamp(st.fire ?? clk.age / 0.5, 0, 1) : 0;
    const kick = anim === 'fire' ? Math.sin(Math.min(1, f * 3) * Math.PI) * (1 - f) : 0;
    if (st.aim !== undefined) pivot.rotation.z = -(Math.PI / 2 - clamp(Number(st.aim) || 0, -0.2, Math.PI / 2));
    recoil.position.y = -kick * 0.25;
    barrel.scale.set(1 + k * 0.15 + Math.sin(t * 30) * 0.02 * k, 1 - k * 0.05, 1 + k * 0.15);
    squash.scale.set(1 + kick * 0.06 + k * 0.03, 1 - kick * 0.08 - k * 0.04, 1 + kick * 0.06 + k * 0.03);
    faceMat.color.setScalar(0.8 + k * 0.5 + kick * 0.6 + Math.sin(t * 8) * 0.05);
    flash.visible = anim === 'fire' && f < 0.35;
    if (flash.visible) { flash.scale.setScalar(0.5 + f * 4); flashMat.opacity = 1 - f / 0.35; flash.rotation.y = f * 3; }
    if (anim === 'fire' && f > 0.02 && !fired) {
      fired = true;
      root.updateMatrixWorld(true);
      muzzleObj.getWorldPosition(_v); root.worldToLocal(_v);
      smoke.burst([_v.x, _v.y, _v.z], { count: 10, speed: 2, up: 0.8, size: 0.3 * size, life: 0.9, spread: 0.3 });
    }
    if (anim !== 'fire') fired = false;
    smoke.step(dt);
  };
  const model = makeModel('kuerbis_kanone', root, update, own, { initial: 'idle' });
  model.muzzle = (out = new THREE.Vector3()) => { root.updateMatrixWorld(true); return muzzleObj.getWorldPosition(out); };
  model.dir = (out = new THREE.Vector3()) => { root.updateMatrixWorld(true); return out.set(0, 1, 0).transformDirection(pivot.matrixWorld); };
  return model;
}

// =============================================================================================
// Süßigkeiten-Tür
// =============================================================================================
const TD = { frame: 0x5a3a7a, frameHi: 0x8a6aae, door: 0x8a4ae0, doorHi: 0xb88aff, doorLow: 0x5a2aa8, trim: 0xff9a2a, knob: 0xffc21a, mat: 0xff8a1a, matB: 0x2a1a3a, wreath: 0x3a8a3a, wreathHi: 0x7ac85a, ribbon: 0xe0262a };
function doorFrameGeo(W, H) {
  return cached(`hw:td:frame:${W}:${H}`, () => {
    const b = new Build();
    const fw = 0.16, fd = 0.3;
    const frameV = { v: (x, y, z, nx, ny) => mix(TD.frame, TD.frameHi, smoothstep(nx * 0.4 + ny * 0.3 + 0.2)) };
    for (const s of [1, -1]) b.box(fd, H, fw, frameV, { p: [0, H / 2, s * (W / 2 + fw / 2)] }, 0.04, 2);
    // Bogen oben (Halbring aus Segmenten)
    const R = W / 2 + fw / 2, n = 12;
    for (let i = 0; i < n; i++) {
      const a = (i + 0.5) / n * Math.PI, c = Math.cos(a), sn = Math.sin(a);
      b.box(fd, fw, R * Math.PI / n + 0.03, frameV, { p: [0, H + sn * R, c * R], r: [-(a - Math.PI / 2), 0, 0] }, 0.03, 1);
    }
    // Fußmatte, Schwelle, Lampe oben mit Glas
    b.box(0.7, 0.04, W * 1.05, (x, y, z) => (Math.floor((z + 2) * 7) % 2 ? TD.mat : TD.matB), { p: [0.55, 0.02, 0] }, 0.015, 1);
    b.box(0.34, 0.06, W + fw * 2, 0x6a5a7a, { p: [0, 0.03, 0] }, 0.02, 1);
    b.box(0.12, 0.08, 0.12, 0x2a2238, { p: [0.18, H + R + 0.12, 0] }, 0.02, 1);
    // Klingelplatte rechts (−Z)
    b.box(0.03, 0.18, 0.12, 0xfff0d8, { p: [fd / 2 + 0.01, H * 0.48, -(W / 2 + fw / 2)] }, 0.015, 1);
    return b.geometry();
  });
}
function doorLeafGeo(W, H) {
  return cached(`hw:td:leaf:${W}:${H}`, () => {
    const b = new Build();
    // Türblatt: Ursprung = Scharnier (links, +Z-Seite), Tür reicht nach −Z
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.lineTo(W, 0); s.lineTo(W, H); s.absarc(W / 2, H, W / 2, 0, Math.PI, false); s.lineTo(0, 0);
    const hole = new THREE.Path(); hole.absarc(W / 2, H * 0.92, W * 0.16, 0, TAU, true); s.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2, curveSegments: 16 });
    g.translate(0, 0, -0.04); g.rotateY(Math.PI / 2);   // Fläche → +X, Breite → −Z
    b.add(g, { v: (x, y, z, nx, ny) => {
      const u = -z / W;
      const panel = nx > 0.6 && ((Math.abs(u - 0.5) > 0.36) || (y > H * 0.45 && y < H * 0.5) || y < 0.12);
      return panel ? TD.doorLow : mix(TD.door, TD.doorHi, smoothstep(nx * 0.3 + y / (H * 3)));
    } });
    // Fensterrahmen, Knauf, Briefschlitz
    b.torus(W * 0.16, 0.03, TD.trim, { p: [0.05, H * 0.92, -W / 2], r: [0, Math.PI / 2, 0] }, 8, 28);
    b.sphere(0.06, TD.knob, { p: [0.1, H * 0.48, -W * 0.85] }, 14, 10);
    b.box(0.03, 0.06, W * 0.36, TD.knob, { p: [0.065, H * 0.35, -W / 2] }, 0.015, 1);
    return b.geometry();
  });
}
function wreathGeo() {
  return cached('hw:td:wreath', () => {
    const b = new Build();
    // Kranz: Blätterring (grün-herbstlich), drei Mini-Kürbisse, rote Schleife; Fläche nach +X
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * TAU, r = 0.24;
      b.sphere(1, i % 3 === 0 ? 0xc86a1a : i % 3 === 1 ? TD.wreath : TD.wreathHi, { p: [0, Math.sin(a) * r, Math.cos(a) * r], s: [0.05, 0.08, 0.06], r: [a, 0, 0] }, 10, 8);
    }
    const P = { R: 0.07, Hh: 0.055, ribs: 8, depth: 0.12, dimple: 0.2, bottom: 0.9 };
    for (const [y, z] of [[-0.22, 0.08], [-0.24, -0.06], [-0.18, -0.18]]) b.parts.push(pumpkinGeo(P, PK_COLORS.orange, true).translate(0.04, y, z));
    for (const s of [1, -1]) b.sphere(1, TD.ribbon, { p: [0.04, 0.24, s * 0.08], s: [0.04, 0.06, 0.09], r: [s * 0.4, 0, 0] }, 12, 8);
    b.sphere(0.04, TD.ribbon, { p: [0.05, 0.24, 0] }, 10, 8);
    for (const s of [1, -1]) b.capsule(0.022, 0.12, TD.ribbon, { p: [0.04, 0.13, s * 0.05], r: [s * 0.3, 0, 0] }, 2, 8);
    return b.geometry();
  });
}
const noteGeo = () => cached('hw:td:note', () => {
  const b = new Build();
  b.sphere(1, 0xffd84a, { p: [0, 0, 0], s: [0.07, 0.055, 0.04], r: [0, 0, 0.4] }, 12, 8);
  b.cyl(0.012, 0.012, 0.22, 0xffd84a, { p: [0.055, 0.11, 0] }, 6);
  b.box(0.08, 0.035, 0.03, 0xffd84a, { p: [0.09, 0.21, 0], r: [0, 0, -0.4] }, 0.01, 1);
  return b.geometry();
});
function buildSuessigkeitenTuer(opts = {}) {
  const W = clamp(Number(opts.width ?? 1.3), 0.8, 3), H = clamp(Number(opts.height ?? 2.4), 1.6, 4);
  const Hs = H - W / 2;     // Höhe der geraden Türkante (Bogen darüber)
  const root = new THREE.Group();
  const own = [];
  const frame = mesh(doorFrameGeo(W, Hs), vcol(0.45), {}, true);
  const hinge = joint([0.02, 0, W / 2]);
  const leaf = mesh(doorLeafGeo(W, Hs), vcol(0.35), {}, true);
  const wreath = mesh(wreathGeo(), vcol(0.5), { p: [0.1, Hs * 0.7, -W / 2] });
  hinge.add(leaf, wreath);
  // warmes Licht im Haus (hinter der Tür) und im Rundfenster
  const inner = mesh(cached(`hw:td:inner:${W}:${Hs}`, () => {
    const b = new Build();
    const s = new THREE.Shape(); s.moveTo(-W / 2, 0); s.lineTo(W / 2, 0); s.lineTo(W / 2, Hs); s.absarc(0, Hs, W / 2, 0, Math.PI, false); s.lineTo(-W / 2, 0);
    const g = new THREE.ShapeGeometry(s, 12); g.rotateY(Math.PI / 2);
    b.add(g, { v: (x, y) => mix(0xffe8a0, 0xff9a3a, smoothstep(y / (Hs + W / 2))) }, { p: [-0.07, 0, 0] });
    // Fensterscheibe (auf dem Türblatt) – im Scharnier-Raum
    return b.geometry();
  }), glow());
  const pane = mesh(cached(`hw:td:pane:${W}`, () => { const g = new THREE.CircleGeometry(W * 0.16, 20); g.rotateY(Math.PI / 2); return new Build().add(g, { v: (x, y) => mix(0xffc860, 0xfff2b0, smoothstep(y * 4 + 0.5)) }).geometry(); }), glow(), { p: [0.0, Hs * 0.92, -W / 2] });
  hinge.add(pane);
  const btnMat = ownMat(basic('hwBell', { color: 0xffd84a, toneMapped: false }));
  own.push(btnMat);
  const button = mesh(cached('hw:td:btn', () => new Build().sphere(1, 0xffffff, { s: [0.03, 0.04, 0.04] }, 12, 8).geometry()), btnMat, { p: [0.17, Hs * 0.48, -(W / 2 + 0.08)] });
  const lamp = glowSprite(0xffc070, 0.9, 0.7); lamp.position.set(0.2, Hs + W / 2 + 0.2, 0);
  const lampBulb = mesh(cached('hw:td:bulb', () => new Build().sphere(1, { v: (x, y) => mix(0xffb040, 0xfff2b0, smoothstep(y * 8 + 0.5)) }, { s: [0.07, 0.09, 0.07] }, 14, 10).geometry()), glow(), { p: [0.2, Hs + W / 2 + 0.03, 0] });
  const notes = instMesh(noteGeo(), vcol(0.3, { emissive: 0x5a4000 }, 'hwNote'), 3, 2, 2);
  root.add(frame, inner, hinge, button, lamp, lampBulb, notes);
  const clk = new Clock();
  let op = 0, rk = 0;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t = clk.t;
    op = damp(op, lit01(st.open, 0), 8, dt);
    hinge.rotation.y = op * 1.75;      // schwenkt nach innen (−X)
    const ring = lit01(st.ring, 0);
    rk = ring > 0 ? rk + dt : 0;
    btnMat.color.setRGB(1, 0.85 + ring * 0.15, 0.3 + ring * 0.5);
    button.scale.set(1 - ring * 0.5, 1, 1);
    for (let i = 0; i < 3; i++) {
      const k = ((rk * 0.9 + i / 3) % 1);
      if (ring <= 0) { notes.setMatrixAt(i, ZERO); continue; }
      _v.set(0.3 + k * 0.4, Hs * 0.55 + k * 0.9, -(W / 2 + 0.1) + Math.sin(k * 6 + i) * 0.15);
      notes.setMatrixAt(i, _m.compose(_v, _q.setFromEuler(_e.set(0, -Math.PI / 2 + 0.6, Math.sin(k * 8) * 0.3)), _s.setScalar(Math.sin(k * Math.PI) * 1.2)));
    }
    notes.instanceMatrix.needsUpdate = true;
    lamp.scale.setScalar(0.9 + Math.sin(t * 7) * 0.04);
    inner.visible = op > 0.02;
  };
  return makeModel('suessigkeiten_tuer', root, update, [...own, notes], { initial: 'idle' });
}

// =============================================================================================
// Riesenkürbis (rollt)
// =============================================================================================
function bigPumpkinGeos(face) {
  return memo(`hw:rk:${face}`, () => {
    const P = { R: 0.5, Hh: 0.46, ribs: 10, depth: 0.11, dimple: 0.18, bottom: 1 };
    const b = new Build(), gl = new Build();
    b.parts.push(pumpkinGeo(P, PK_COLORS.orange));
    addFace(b, gl, pkSurf(P), { kind: face, az: 0, el: 0, w: 0.72, h: 0.55 });
    const top = pkPoint(P, 0, 1.3).p.y;
    b.parts.push(stemGeo(0.16, 0.06, false, 0.5).clone().translate(0, top - 0.03, 0));
    for (let i = 0; i < 3; i++) b.parts.push(leafGeo(0.26, false, 0.4).clone().rotateZ(-0.4).rotateY(i * 2.1).translate(0, top + 0.02, 0));
    return { body: b.geometry(), face: gl.geometry(), r: 0.5 };
  });
}
function buildRiesenkuerbis(opts = {}) {
  const size = clamp(Number(opts.size ?? 2), 0.5, 8);
  const G = bigPumpkinGeos(opts.face ?? 'staunen');
  const root = new THREE.Group();
  const own = [];
  const faceMat = ownMat(glow(), { color: new THREE.Color(1, 1, 1) });
  own.push(faceMat);
  const rollJ = joint([0, size * 0.47, 0]);
  const sc = joint(); sc.scale.setScalar(size);
  sc.add(mesh(G.body, vcol(0.3), {}, true), mesh(G.face, faceMat));
  rollJ.add(sc);
  const dust = new Puffs(10, 0xd8c8a8, { opacity: 0.85, radius: size * 2 + 2, cy: 0.3 });
  own.push(dust);
  root.add(rollJ, dust.mesh);
  const clk = new Clock();
  let emit = 0;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t = clk.t;
    rollJ.rotation.z = -(st.roll ?? 0);
    faceMat.color.setScalar(0.85 + Math.sin(t * 9) * 0.05);
    const sp = Math.abs(st.speed ?? 0);
    emit -= dt;
    if (sp > 0.3 && emit <= 0) { emit = 0.12; dust.burst([-size * 0.35, 0.1, 0], { count: 2, speed: 0.6, up: 0.6, size: 0.18 * size, life: 0.6, spread: 0.3 * size }); }
    dust.step(dt);
  };
  return makeModel('riesenkuerbis_roll', root, update, own, { initial: 'idle' });
}

// =============================================================================================
// Spinnennetz-Trampolin
// =============================================================================================
const SN = { thread: 0xf4f0ff, branch: 0x4a3058, branchHi: 0x7a5a8e, spider: 0x6a3ac8, spiderHi: 0xa47aff, bow: 0xff8a1a };
function webBaseGeo(R) {
  // Fäden: 10 Speichen + 6 Spiralringe (Röhrchen), flach in XZ bei y = 0
  const b = new Build();
  const n = 10;
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU; b.tube([[0, 0, 0], [Math.cos(a) * R * 0.5, 0, Math.sin(a) * R * 0.5], [Math.cos(a) * R, 0, Math.sin(a) * R]], 0.012, SN.thread, null, 6, 4); }
  for (let k = 1; k <= 6; k++) {
    const rr = R * k / 6.3;
    const pts = [];
    for (let i = 0; i <= n * 3; i++) { const a = (i / (n * 3)) * TAU; const sag = 1 - 0.08 * Math.abs(Math.sin(a * n / 2)); pts.push([Math.cos(a) * rr * sag, 0, Math.sin(a) * rr * sag]); }
    b.tube(pts, 0.01, SN.thread, null, n * 6, 4);
  }
  return b.geometry();
}
function webFrameGeo(R, H) {
  return cached(`hw:sn:frame:${R}:${H}`, () => {
    const b = new Build();
    const brV = { v: (x, y, z, nx, ny) => mix(SN.branch, SN.branchHi, smoothstep(ny * 0.5 + 0.5)) };
    const pts = [];
    for (let i = 0; i <= 48; i++) { const a = (i / 48) * TAU; const wob = 1 + Math.sin(a * 5) * 0.03; pts.push([Math.cos(a) * (R + 0.05) * wob, H + Math.sin(a * 3) * 0.03, Math.sin(a) * (R + 0.05) * wob]); }
    b.tube(pts, 0.06, brV, null, 96, 8);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4;
      b.tube([[Math.cos(a) * (R + 0.05), H, Math.sin(a) * (R + 0.05)], [Math.cos(a) * (R + 0.12), H * 0.5, Math.sin(a) * (R + 0.12)], [Math.cos(a) * (R + 0.2), 0.0, Math.sin(a) * (R + 0.2)]], 0.07, brV, null, 10, 8);
      b.sphere(0.1, SN.branch, { p: [Math.cos(a) * (R + 0.2), 0.03, Math.sin(a) * (R + 0.2)], s: [1, 0.4, 1] }, 10, 6);
      // kleiner Zweig mit Knospe
      b.tube([[Math.cos(a) * (R + 0.08), H + 0.02, Math.sin(a) * (R + 0.08)], [Math.cos(a + 0.15) * (R + 0.2), H + 0.15, Math.sin(a + 0.15) * (R + 0.2)], [Math.cos(a + 0.25) * (R + 0.18), H + 0.25, Math.sin(a + 0.25) * (R + 0.18)]], 0.025, brV, null, 8, 6);
    }
    return b.geometry();
  });
}
const spiderGeo = () => cached('hw:sn:spider', () => {
  const b = new Build();
  b.sphere(1, { v: (x, y, z, nx, ny) => mix(0x3a1a7a, SN.spiderHi, smoothstep(ny * 0.6 + 0.4)) }, { p: [-0.1, 0.12, 0], s: [0.15, 0.13, 0.14] }, 22, 14);
  b.sphere(1, { v: (x, y, z, nx, ny) => mix(0x3a1a7a, SN.spiderHi, smoothstep(ny * 0.6 + 0.4)) }, { p: [0.06, 0.12, 0], s: [0.11, 0.1, 0.11] }, 20, 14);
  for (const s of [1, -1]) {
    b.sphere(1, SN.bow, { p: [-0.12, 0.25, s * 0.05], s: [0.04, 0.03, 0.05], r: [s * 0.4, 0, 0] }, 10, 6);
    for (let i = 0; i < 4; i++) {
      const a = -0.6 + i * 0.4;
      b.tube([[0.0, 0.12, s * 0.06], [0.02 + Math.sin(a) * 0.12, 0.2, s * 0.17], [0.03 + Math.sin(a) * 0.22, 0.02, s * 0.25]], 0.014, SN.spider, null, 8, 4);
    }
    stick(b, ellSurf([0.06, 0.12, 0], [0.11, 0.1, 0.11])(s * 0.7, -0.2), HW.cheek, [0.025, 0.018, 0.01], 0.3);
  }
  b.sphere(0.022, SN.bow, { p: [-0.11, 0.26, 0] }, 8, 6);
  b.torus(0.03, 0.007, 0x2a0a20, { p: [0.165, 0.09, 0], r: [0, Math.PI / 2, Math.PI] }, 4, 10, Math.PI);
  return b.geometry();
});
const SP_EYES = [1, -1].map((s) => ({ p: [0.15, 0.15, s * 0.04], r: 0.035, sy: 1.25, dir: [1, 0.1, s * 0.4] }));
function buildSpinnennetzTrampolin(opts = {}) {
  const R = clamp(Number(opts.radius ?? 1), 0.4, 4), H = clamp(Number(opts.height ?? 0.5), 0.1, 3);
  const root = new THREE.Group();
  const own = [];
  const frame = mesh(webFrameGeo(R, H), vcol(0.55), {}, true);
  const webG = webBaseGeo(R); own.push(webG);
  const base = webG.attributes.position.array.slice();
  const web = mesh(webG, vcol(0.3, { emissive: 0x2a2a3a }, 'hwweb'), { p: [0, H, 0] });
  // zarte, durchscheinende Netzfläche
  const fillMat = noToy(ownMat(basic('hwwebfill', { color: 0xf0e8ff, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide })));
  own.push(fillMat);
  const fillG = new THREE.CircleGeometry(R, 30); fillG.rotateX(-Math.PI / 2); own.push(fillG);
  const fbase = fillG.attributes.position.array.slice();
  const fill = mesh(fillG, fillMat, { p: [0, H, 0] });
  const spiderJ = joint([R * 0.7, H + 0.02, R * 0.72]);
  spiderJ.rotation.y = -Math.PI * 0.75;
  spiderJ.add(mesh(spiderGeo(), vcol(0.4), {}, true), eyes(SP_EYES, { key: 'hw:sn', iris: 0xff8a1a, pupil: 0.6, depth: 0.5 }));
  root.add(frame, web, fill, spiderJ);
  root.userData.top = H;
  const clk = new Clock(), blink = new Blinker();
  let bo = 0, vel = 0, lastDepth = 0;
  const deform = (P, src, depth) => {
    const A = P.array;
    for (let i = 0; i < P.count; i++) { const x = src[i * 3], z = src[i * 3 + 2]; const r = Math.min(1, Math.hypot(x, z) / R); A[i * 3 + 1] = src[i * 3 + 1] - depth * (1 - r * r); }
    P.needsUpdate = true;
  };
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t = clk.t;
    const target = lit01(st.bounce, 0);
    // federnd nachschwingen
    vel += ((target - bo) * 160 - vel * 12) * dt;
    bo += vel * dt;
    const depth = bo * 0.35;
    // Netz nur verformen, wenn es sich bewegt (in Ruhe kein Ecken-Update)
    if (Math.abs(depth - lastDepth) > 2e-4) {
      deform(webG.attributes.position, base, depth);
      deform(fillG.attributes.position, fbase, depth);
      webG.computeBoundingSphere();
      lastDepth = depth;
    }
    spiderJ.position.y = H + 0.02 + Math.abs(Math.sin(t * 2)) * 0.02 + Math.max(0, -vel) * 0.01;
    spiderJ.rotation.z = Math.sin(t * 1.5) * 0.05;
    spiderJ.children[1].userData.blink(blink.update(dt));
  };
  return makeModel('spinnennetz_trampolin', root, update, own, { initial: 'idle' });
}

// =============================================================================================
// Grabstein-Schalter
// =============================================================================================
const graveFaceGeo = (happy) => cached(`hw:gs:face:${happy}`, () => {
  const b = new Build();
  const fx = 0.134, fy = 0.52;
  if (happy) {
    for (const s of [1, -1]) b.torus(0.05, 0.014, HW.ink, { p: [fx, fy + 0.02, s * 0.12], r: [0, Math.PI / 2, 0] }, 6, 12, Math.PI);
  } else {
    for (const s of [1, -1]) { b.sphere(1, HW.ink, { p: [fx, fy + 0.02, s * 0.12], s: [0.02, 0.06, 0.042] }, 12, 8); b.sphere(1, 0xffffff, { p: [fx + 0.012, fy + 0.045, s * 0.12 + 0.012], s: [0.008, 0.016, 0.012] }, 6, 4); }
  }
  const m = new THREE.Shape();
  const wd = happy ? 0.11 : 0.08, dp = happy ? 0.11 : 0.05;
  m.moveTo(-wd, 0); m.quadraticCurveTo(0, 0.02, wd, 0); m.quadraticCurveTo(wd * 0.8, -dp, 0, -dp); m.quadraticCurveTo(-wd * 0.8, -dp, -wd, 0);
  const g = new THREE.ShapeGeometry(m, 8); g.rotateY(Math.PI / 2);
  b.add(g, { v: (x, y) => (y < fy - 0.08 - dp * 0.4 ? HW.tongue : HW.mouth) }, { p: [fx, fy - 0.07, 0] });
  for (const s of [1, -1]) b.sphere(1, HW.cheek, { p: [fx - 0.005, fy - 0.06, s * 0.2], s: [0.012, 0.03, 0.05] }, 8, 6);
  return b.geometry();
});
const graveBaseGeo = () => cached('hw:gs:base', () => {
  const b = new Build();
  b.box(0.9, 0.36, 1.1, { v: (x, y, z, nx, ny) => (ny > 0.6 ? (Math.max(Math.abs(x) / 0.45, Math.abs(z) / 0.55) > 0.82 ? HW.stoneHi : 0x3a3050) : mix(HW.stoneLow, HW.stone, smoothstep(ny * 0.5 + 0.5 + noise3(x * 5, y * 5, z * 5) * 0.3))) }, { p: [0, 0.18, 0] }, 0.06, 2);
  for (const [x, z] of [[0.3, 0.42], [-0.32, -0.4], [0.35, -0.38]]) b.sphere(0.08, HW.moss, { p: [x, 0.36, z], s: [1, 0.35, 1] }, 10, 6);
  return b.geometry();
});
const buttonGeo = () => cached('hw:gs:button', () => {
  const b = new Build();
  b.cyl(0.2, 0.22, 0.06, 0x3a3050, { p: [0, 0.03, 0] }, 24);
  b.sphere(1, { v: (x, y, z, nx, ny) => mix(0xd86a10, 0xffd080, smoothstep(ny * 0.8 + nx * 0.2 - 0.1)) }, { p: [0, 0.07, 0], s: [0.17, 0.09, 0.17] }, 24, 12);
  return b.geometry();
});
function buildGrabsteinSchalter() {
  const root = new THREE.Group();
  const own = [];
  const base = mesh(graveBaseGeo(), vcol(0.6), {}, true);
  base.receiveShadow = true;
  const sink = joint([0, 0.3, 0]);
  const stone = mesh(graveGeo('rund', 0.8, false, false), vcol(0.55), {}, true);
  const faceOpen = mesh(graveFaceGeo(false), vcol(0.4));
  const faceHappy = mesh(graveFaceGeo(true), vcol(0.4));
  const btnMat = ownMat(vcol(0.25), { emissive: new THREE.Color(0, 0, 0) });
  own.push(btnMat);
  const btn = mesh(buttonGeo(), btnMat, { p: [0, 0.8, 0] }, true);
  sink.add(stone, faceOpen, faceHappy, btn);
  const ringMat = ownMat(add('gsRing', 0xffa030, 0.7));
  own.push(ringMat);
  const ring = mesh(cached('hw:gs:ring', () => { const g = new THREE.RingGeometry(0.5, 0.75, 40); g.rotateX(-Math.PI / 2); return g; }), ringMat, { p: [0, 0.37, 0] });
  root.add(base, sink, ring);
  const clk = new Clock();
  let pk = 0;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t = clk.t;
    pk = damp(pk, lit01(st.pressed, 0), 16, dt);
    sink.position.y = 0.3 - pk * 0.36;
    sink.scale.set(1 + pk * 0.05, 1 - pk * 0.06, 1 + pk * 0.05);
    faceOpen.visible = pk < 0.5; faceHappy.visible = pk >= 0.5;
    btn.scale.set(1, 1 - pk * 0.5, 1);
    btnMat.emissive.setRGB(0.5 * pk + 0.12 + Math.sin(t * 3) * 0.06 * (1 - pk), 0.22 * pk + 0.04, 0);
    ring.visible = pk > 0.05;
    ringMat.opacity = 0.7 * pk * (0.8 + Math.sin(t * 6) * 0.2);
    ring.scale.setScalar(1 + Math.sin(t * 4) * 0.04);
  };
  return makeModel('grabstein_schalter', root, update, own, { initial: 'idle' });
}

// =============================================================================================
// Süßigkeit (Sammel-Item) und Konfetti
// =============================================================================================
export const CANDY_SCALE = 1.25;
function buildSuessigkeit(opts = {}) {
  const kind = CANDY_KINDS.includes(opts.kind) ? opts.kind : 'bonbon';
  const color = Math.abs(Math.round(opts.color ?? 0)) % HW.candy.length;
  const root = new THREE.Group();
  const spin = joint([0, 0.45, 0]);
  const m = mesh(candyGeo(kind, color), vcol(0.18, {}, 'hwcandy'), { s: CANDY_SCALE }, true);
  spin.add(m);
  const sp = sparkleSprite(0xffffff, 0.35); sp.position.set(0.15, 0.62, 0.1);
  root.add(spin, sp);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim === 'collected' ? 'collected' : 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    if (anim === 'collected') {
      const k = clamp(clk.age / 0.35, 0, 1);
      spin.position.y = 0.45 + Math.sin(k * Math.PI * 0.6) * 1.0;
      spin.rotation.y = t * 2.4 + clk.age * 25;
      spin.scale.setScalar(Math.max(0.001, 1 - k * k));
      spin.visible = k < 1; sp.visible = false;
      return;
    }
    spin.visible = true; spin.scale.setScalar(1);
    spin.position.y = 0.45 + Math.sin(t * 2.6) * 0.05;
    spin.rotation.set(0, t * 2.2, Math.sin(t * 1.3) * 0.15);
    sp.visible = Math.sin(t * 2.1) > 0.3;
    sp.scale.setScalar(0.2 + Math.abs(Math.sin(t * 4)) * 0.25);
  };
  return makeModel('suessigkeit', root, update, [], { initial: 'idle' });
}
function buildBonbonKonfetti(opts = {}) {
  const n = clamp(Math.round(opts.count ?? 32), 4, 96);
  const R = Math.max(0.5, Number(opts.radius ?? 3));
  const root = new THREE.Group();
  const per = Math.ceil(n / 4);
  const sets = CANDY_KINDS.map((k, i) => instMesh(candyGeo(k, i * 2 + 1, true), vcol(0.18, {}, 'hwcandy'), per, R * 2 + 3, 1));
  for (const s of sets) { s.castShadow = true; root.add(s); }
  const bits = Array.from({ length: per * 4 }, (_, i) => ({ a: hash1(i * 1.7) * TAU, out: (0.4 + hash1(i * 3.1) * 0.6) * R, up: 4 + hash1(i * 5.3) * 4, spin: (hash1(i * 7.9) - 0.5) * 20, delay: hash1(i * 9.3) * 0.25 }));
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim === 'idle' ? 'idle' : 'burst';
    clk.tick(dt, anim);
    const p = anim === 'burst' ? (st.progress !== undefined ? clamp(st.progress, 0, 1) : clamp(clk.age / 1.8, 0, 1)) : 1;
    for (let k = 0; k < 4; k++) {
      const s = sets[k];
      for (let j = 0; j < per; j++) {
        const it = bits[k * per + j];
        const tt = Math.max(0, p * 1.8 - it.delay);
        if (anim === 'idle' || p >= 1 || tt <= 0 || k * per + j >= n) { s.setMatrixAt(j, ZERO); continue; }
        const y = it.up * tt - 4.9 * tt * tt;
        const fade = 1 - smoothstep((p - 0.8) / 0.2);
        _v.set(Math.cos(it.a) * it.out * Math.min(1, tt * 1.2), Math.max(0.05, y), Math.sin(it.a) * it.out * Math.min(1, tt * 1.2));
        s.setMatrixAt(j, _m.compose(_v, _q.setFromEuler(_e.set(it.spin * tt, it.a, it.spin * 0.5 * tt)), _s.setScalar(1.1 * fade)));
      }
      s.instanceMatrix.needsUpdate = true;
    }
  };
  return makeModel('bonbon_konfetti', root, update, [...sets], { initial: 'burst' });
}

export const MODELS = {
  laterne_hand: buildLaterneHand,
  geisterplattform: buildGeisterplattform,
  besen_plattform: buildBesenPlattform,
  hexenkessel: buildHexenkessel,
  kuerbis_kanone: buildKuerbisKanone,
  suessigkeiten_tuer: buildSuessigkeitenTuer,
  riesenkuerbis_roll: buildRiesenkuerbis,
  spinnennetz_trampolin: buildSpinnennetzTrampolin,
  grabstein_schalter: buildGrabsteinSchalter,
  suessigkeit: buildSuessigkeit,
  bonbon_konfetti: buildBonbonKonfetti,
};
