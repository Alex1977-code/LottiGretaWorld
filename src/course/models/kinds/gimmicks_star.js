// Gimmicks Welt Stern „Sternenzelt“ (Kurs-Modus), Teil 1: Platten-Galaxie (S-2), fliegender Zielmast (S-4), Retro-Blockland
// (S-5), Waben-Sternenweg (S-6), Nebelfriedhof (S-8), Kanonen-Sternwerk (S-9), Kapitäns-Diorama (S-Kapitän). Eigene Gestaltung
// im Spielzeug-Look (runde Kanten, satte Farben, glänzend). Maßstab Meter, Vorderseite/Richtung +X; state darf ein String
// sein. Wiederverwendet: Zielmast 'goal_pole' (in zielmast_fluegel eingebaut), Zündkopf 'zuendkopf' (laufbombe ist ein
// Zwilling mit den Bonuswelt-Zuständen), ?-Block-Geometrie (riesen_frageblock_turm part 'kopf'). Schienen-Gimmicks (Walzen,
// Schienenbrett, Weiche) stehen in bahnen_star.js. Viele gleiche Platten: lib/instanced_star.js.
//
// drehplatte      kippende Drehplatte (S-2): gerundete Platte, oben tiefblau mit hellem Einsatz und goldenem Stern, unten lila mit
//                 Silberstern (dreht sie ganz um, zeigt sie die andere Seite), goldene Achszapfen. **Ursprung = Mitte der
//                 Unterseite** (bei tilt 0), Oberseite y = thick; Drehachse durch die Plattenmitte (y = thick/2).
//                 opts  { size: [x, z] | n ([2, 2]), thick (0,3), axis: 'z' (Standard: dreht um Z, positiv hebt das +X-Ende) |
//                         'x' (dreht um X, positiv hebt das −Z-Ende), color ('blau'), back ('lila') – Farbnamen siehe PANEL }
//                 state { tilt (rad), shake (0..1: zittert vor dem Kippen) }   Viele: createInstanced('drehplatte', n, opts).
// farbplatte      Farbplatte (S-2 Plattenbahn, Schachbrett, S-1 Farbfelder): weißer Rahmen mit Goldsternen an den Ecken, darin
//                 eine farbige Platte mit erhabenem Stern; die Farbe wechselt zwischen zwei Farben (beim Umfärben kurz hell).
//                 **Ursprung = Mitte der Unterseite**, Oberseite y = thick.
//                 opts  { size: [x, z] | n ([2, 2]), thick (0,25), colors: [a, b] (['rot', 'blau']; Namen oder Hex) }
//                 state { color (0..1: 0 = a, 1 = b), flash (0..1: Aufleuchten mit Lichtring, z. B. beim Betreten) }
//                 Viele: createInstanced('farbplatte', n, opts).
// plattenwand     eine Platte der Plattenwand (S-2 Plattentreppe): Platte, die aus einer senkrechten Wand herausfährt – weiß-silberner
//                 Körper, farbige Stirnseite mit Goldstern, rutschfeste Rillen oben; Wandöffnung als Silberrahmen.
//                 **Ursprung = Mitte der Unterkante der Öffnung an der Wandfläche** (x = 0, y = 0); die Wand liegt bei x < 0,
//                 die Platte fährt nach +X heraus (eingefahren bündig: Stirn bei x = 0; ausgefahren bis x = depth). Oberseite y = size[1].
//                 opts  { size: [z, y] ([2, 0,6]: Breite, Höhe), depth (1,6), color ('blau') }
//                 state { out (0..1), warn (bool: zittert, Stern blinkt) }
// zielmast_fluegel  Zielmast mit Flügeln (S-4): der vorhandene Zielmast 'goal_pole' (Steinblock, Mast, Stern, Fahne) mit zwei großen
//                 Federflügeln (weiß mit Goldsaum, goldene Schulterspangen) an den Seiten (±Z) knapp unter der Spitze.
//                 **Ursprung = Fußpunkt (Unterseite des Steinblocks).**  opts { height (8) }
//                 state { fly (0..1: 0 = steht, Flügel angelegt; 1 = fliegt: Flügel weit, schlägt, wippt, neigt sich nach +X),
//                         flap (0..1: feste Flügelstellung 0 = unten … 1 = oben; ohne Angabe schlägt er selbst, sobald fly > 0),
//                         flagY, anim (wie goal_pole) }   root.userData.flagHeight(flagY) wie goal_pole.
// riesen_frageblock_turm  ein Segment des wachsenden Riesen-?-Turms (S-5): goldener Block mit Kranz-Bändern oben/unten, Nieten und
//                 Funkel-Stempel (Zwischenstück), oder der ?-Kopfblock. Segmente werden vom Motor gestapelt (Kante size).
//                 **Ursprung = Mitte der Unterseite.**  opts { size (2), part: 'segment' (Standard) | 'kopf' }
//                 state { out (0..1: fährt teleskopartig hoch, Höhe = out·size; Standard 1), anim: 'idle'|'bump', n? (neuer bump) }
//                 root.userData.top → aktuelle Oberkante.
// wabe            Wabenplatte (S-6): sechseckige Platte, Ecke nach +X, Umkreisradius size (Mittenabstand im Raster √3·size).
//                 'normal': lila Wabenkörper mit honiggoldener Deckfläche und Sternchen; 'lava': Krustenkörper mit glühender, brodelnder
//                 Lava-Deckfläche (heiß!); 'eis': hellblauer Eiskörper mit Raureif-Deckfläche und Glitzer.
//                 **Ursprung = Mitte der Unterseite**, Oberseite y = thick.
//                 opts  { kind: 'normal' | 'lava' | 'eis', size (1), thick (0,5) }
//                 state { press (0..1: sinkt 0,08 m ein), flash (0..1) }   Viele: createInstanced('wabe', n, { kind, size, thick }).
// nebelplattform  Nebelplattform (S-8): Wolkenstein-Platte (flache Oberseite, Wolken-Unterseite) mit Nebelschleiern; blendet aus.
//                 **Ursprung = Mitte der Unterseite**, Oberseite y = thick.  opts { size: [x, z] | n ([3, 3]), thick (0,5) }
//                 state { fade (0..1: 1 = fest und sichtbar, 0 = aufgelöst; Nebel bleibt schwach als Hinweis) }
// kanonenkugel_tritt  große Kanonenkugel mit Gesicht (S-9 Kugelwand): dunkelblaue Eisenkugel mit Goldband und Nieten, großen Augen,
//                 kecken Brauen und Grinsen, goldener Trittstern oben (darauf steht man). **Ursprung = Kugelmitte**, Blick +X.
//                 opts  { size (Ø 2) }
//                 state { anim: 'idle' | 'fly' (Rauchschweif nach −X, entschlossen) | 'step' (federt ein, progress 0..1 in 0,35 s) }
//                 root.userData.radius, .top (= radius).
// diorama_drehscheibe  mechanische Drehscheibe (S-Kapitän): Messing-Zahnkranz um eine Plattform mit Fliesenringen, Pfeilmarken und
//                 Sternnabe auf einem Eisen-Unterbau; seitliches Antriebsritzel mit Kurbelrad dreht gegenläufig mit.
//                 **Ursprung = Mitte der Unterseite**, Oberseite y = height.  opts { radius (5), height (1,2), teeth (48) }
//                 state { angle (rad um +Y) | speed (rad/s) }
// laufbombe       Laufbombe (S-5): Zwilling des Zündkopfs 'zuendkopf' mit den Bonuswelt-Zuständen.
//                 state { anim: 'idle' | 'walk' (speed) | 'fuse' (Zündschnur brennt; progress 0..1, ab 0,75 blinkt sie; ohne progress
//                         3 s) | 'boom' (explodiert, progress 0..1 in 0,7 s) | 'carried' | 'thrown' }
// felsblock_riss  sprengbarer Felsblock (S-5, S-9, B-7): klobiger, warmgrauer Fels mit hellen Kanten und tiefen Rissen, Kiesel am Fuß.
//                 **Ursprung = Mitte der Unterseite.**  opts { size: n | [x, y, z] (2) }
//                 state { break (0..1: 0 heil; bis 0,15 zittert er, Risse glühen auf; danach fliegen Brocken, Staub; 1 = nur Geröll) }

import {
  THREE, TAU, Build, cached, vcol, basic, std, mesh, joint, eyes, makeModel, Clock, damp, clamp, col, mix, smoothstep, lerp,
  instMesh, setInst, glowSprite, sparkleSprite, puffyStarGeo, placed, roundedBox, SIDE, sparkShape, onEllipsoid, gold,
} from '../lib/kit.js';
import {
  ST, PANEL, panelColor, num, prog, ownMat, puffyGeo, gradV, roundRectShape, noise3, hash1, displace, lumpyEllipsoid, taperTube,
  memo, fxPuffs, toyS, glowS, hexShape, hexPrismGeo, flatStarGeo, gearShape, sz2, sz3, k2, rod,
} from '../lib/starGeos.js';
import { questionGeo, blockMat, BLOCK } from '../lib/blockGeos.js';
import { mouthShape } from '../lib/w5Geos.js';
import { fogTexture } from '../lib/hwGeos.js';
import { MODELS as P1 } from './props.js';
import { MODELS as W5E } from './enemies_w5.js';

const _c = new THREE.Color(), _c2 = new THREE.Color();
const WHITE = new THREE.Color(1, 1, 1);

// =============================================================================================
// Drehplatte
// =============================================================================================
/** Drehplatte (Mitte im Ursprung, Dicke t): Oberseite color, Unterseite back, weiße Kante, Achszapfen auf axis. */
export function drehGeo(w, d, t, color = 'blau', back = 'lila', axis = 'z', lo = false) {
  return cached(`star:dreh:${k2(w)}:${k2(d)}:${k2(t)}:${color}:${back}:${axis}:${lo}`, () => {
    const C = panelColor(color, 'blau'), B = panelColor(back, 'lila');
    const b = new Build();
    const r = Math.min(0.1, t * 0.35);
    b.add(roundedBox(w, t, d, r, SIDE.ALL, 0, lo ? 1 : 3), { v: (x, y, z, nx, ny) => {
      if (ny > 0.55) return mix(C[2], C[0], smoothstep(ny * 2 - 1));
      if (ny < -0.55) return mix(B[2], B[0], smoothstep(-ny * 2 - 1) * 0.8);
      return mix(ST.silverLow, ST.white, smoothstep(ny * 0.5 + 0.55));
    } });
    // Einsatz oben (hell zur Mitte), Stern; unten Silberstern
    const iw = w - Math.min(0.36, w * 0.2), id = d - Math.min(0.36, d * 0.2);
    b.add(roundedBox(iw, 0.04, id, 0.05, SIDE.ALL, 0, 1), { v: (x, y, z) => mix(C[0], C[1], smoothstep(1 - Math.max(Math.abs(x) / (iw / 2), Math.abs(z) / (id / 2)) * 1.1) * 0.75) }, { p: [0, t / 2 + 0.005, 0] });
    const R = Math.min(iw, id) * 0.32;
    b.add(flatStarGeo(R, 0.05, 0.03), { v: (x, y, z, nx, ny) => mix(ST.starLow, ST.starHi, smoothstep(ny * 0.6 + 0.35 - Math.hypot(x, z) / R * 0.25)) }, { p: [0, t / 2 + 0.06, 0] });
    b.add(flatStarGeo(R * 0.8, 0.03, 0.015), { v: (x, y, z, nx, ny) => mix(ST.silverLow, ST.silverHi, smoothstep(-ny * 0.6 + 0.3)) }, { p: [0, -t / 2 - 0.008, 0], r: [Math.PI, 0, 0] });
    // vier weiße Punkte in den Ecken des Einsatzes
    if (!lo) for (const sx of [1, -1]) for (const sz of [1, -1]) b.sphere(0.05, ST.white, { p: [sx * (iw / 2 - 0.12), t / 2 + 0.03, sz * (id / 2 - 0.12)], s: [1, 0.5, 1] }, 8, 5);
    // Achszapfen
    const ax = axis === 'x';
    for (const s of [1, -1]) {
      const p = ax ? [s * (w / 2 + 0.06), 0, 0] : [0, 0, s * (d / 2 + 0.06)];
      b.cyl(Math.min(0.13, t * 0.42), Math.min(0.13, t * 0.42), 0.14, gradV(ST.starLow, ST.starHi, 0.6, 0.45), { p, r: ax ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0] }, lo ? 8 : 14);
      b.sphere(Math.min(0.07, t * 0.25), ST.starHi, { p: ax ? [s * (w / 2 + 0.14), 0, 0] : [0, 0, s * (d / 2 + 0.14)] }, 8, 6);
    }
    return b.geometry();
  });
}
function buildDrehplatte(opts = {}) {
  const [w, d] = sz2(opts.size, [2, 2]);
  const t = clamp(num(opts.thick, 0.3), 0.08, 2);
  const axis = opts.axis === 'x' ? 'x' : 'z';
  const root = new THREE.Group();
  const piv = joint([0, t / 2, 0]);
  const plate = mesh(drehGeo(w, d, t, opts.color ?? 'blau', opts.back ?? 'lila', axis), toyS(0.3, 'dreh'), {}, true);
  plate.receiveShadow = true;
  piv.add(plate);
  root.add(piv);
  root.userData.top = t;
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const sh = clamp(num(st.shake, 0), 0, 1) * Math.sin(clk.t * 38) * 0.035;
    const tilt = num(st.tilt, 0) + sh;
    if (axis === 'z') piv.rotation.set(0, 0, tilt); else piv.rotation.set(tilt, 0, 0);
  };
  return makeModel('drehplatte', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Farbplatte
// =============================================================================================
/** Rahmen der Farbplatte (Ursprung Mitte unten): weißer Kasten mit Goldsternen an den Ecken. */
export function farbFrameGeo(w, d, t, lo = false) {
  return cached(`star:farb:frame:${k2(w)}:${k2(d)}:${k2(t)}:${lo}`, () => {
    const b = new Build();
    b.add(roundedBox(w, t, d, Math.min(0.08, t * 0.3), SIDE.ALL, 0, lo ? 1 : 2), { v: (x, y, z, nx, ny) => mix(ST.silverLow, ST.white, smoothstep(ny * 0.45 + 0.6)) }, { p: [0, t / 2, 0] });
    if (!lo) for (const sx of [1, -1]) for (const sz of [1, -1]) b.add(flatStarGeo(0.08, 0.025, 0.012), ST.star, { p: [sx * (w / 2 - 0.08), t + 0.012, sz * (d / 2 - 0.08)] });
    return b.geometry();
  });
}
/** Farbiger Einsatz (weiß, wird vom Material getönt): Platte mit erhabenem, hellerem Stern. Unterkante y = 0. */
export function farbPanelGeo(w, d, t, lo = false) {
  return cached(`star:farb:panel:${k2(w)}:${k2(d)}:${k2(t)}:${lo}`, () => {
    const b = new Build();
    const iw = w - 0.2, id = d - 0.2, h = 0.06;
    b.add(roundedBox(iw, h, id, 0.03, SIDE.ALL, 0, 1), { v: (x, y, z, nx, ny) => mix(0x8a8a8a, 0xd6d6d6, smoothstep(ny * 0.5 + 0.5 + (1 - Math.max(Math.abs(x) / (iw / 2), Math.abs(z) / (id / 2))) * 0.3)) }, { p: [0, h / 2, 0] });
    b.add(flatStarGeo(Math.min(iw, id) * 0.3, 0.035, 0.02), { v: (x, y, z, nx, ny) => mix(0xd8d8d8, 0xffffff, smoothstep(ny)) }, { p: [0, h + 0.012, 0] });
    return b.geometry();
  });
}
const ringGeo = () => cached('star:farb:ring', () => { const g = new THREE.RingGeometry(0.86, 1, 40, 1); g.rotateX(-Math.PI / 2); return g; });
/** Farben einer Farbplatte → [THREE.Color a, THREE.Color b]. */
export function farbColors(colors) {
  const list = Array.isArray(colors) ? colors : ['rot', 'blau'];
  return [0, 1].map((i) => col(panelColor(list[i] ?? (i ? 'blau' : 'rot'), i ? 'blau' : 'rot')[0]).clone());
}
/** Mischfarbe der Farbplatte (beim Umfärben über Weiß statt durch Grau). */
export function farbMix(A, B, k, out) {
  out.copy(A).lerp(B, smoothstep(k));
  return out.lerp(WHITE, Math.sin(clamp(k, 0, 1) * Math.PI) * 0.45);
}
function buildFarbplatte(opts = {}) {
  const [w, d] = sz2(opts.size, [2, 2]);
  const t = clamp(num(opts.thick, 0.25), 0.08, 2);
  const [A, B] = farbColors(opts.colors);
  const root = new THREE.Group();
  const own = [];
  const frame = mesh(farbFrameGeo(w, d, t - 0.05), toyS(0.3, 'farbrahmen'), {}, true);
  frame.receiveShadow = true;
  const pMat = ownMat(toyS(0.28, 'farb'), { emissive: 0x000000 }); own.push(pMat);
  const panel = mesh(farbPanelGeo(w, d, t), pMat, { p: [0, t - 0.06, 0] });
  panel.receiveShadow = true;
  const rMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  own.push(rMat);
  const ring = mesh(ringGeo(), rMat, { p: [0, t + 0.03, 0] });
  root.add(frame, panel, ring);
  root.userData.top = t;
  let c = 0, fl = 0;
  const update = (dt, st) => {
    c = damp(c, clamp(num(st.color, 0), 0, 1), 14, dt);
    if (Math.abs(c - num(st.color, 0)) < 0.002) c = clamp(num(st.color, 0), 0, 1);
    fl = clamp(num(st.flash, 0), 0, 1);
    farbMix(A, B, c, _c);
    pMat.color.copy(_c);
    pMat.emissive.copy(_c).multiplyScalar(0.12 + fl * 0.5);
    ring.visible = fl > 0.02;
    rMat.opacity = fl * 0.85;
    rMat.color.copy(_c).lerp(WHITE, 0.5);
    const s = Math.min(w, d) * 0.5 * lerp(1.18, 0.92, fl);
    ring.scale.set(s * (w / Math.min(w, d)), 1, s * (d / Math.min(w, d)));
  };
  return makeModel('farbplatte', root, update, own, { initial: 'idle' });
}

// =============================================================================================
// Plattenwand
// =============================================================================================
function wandFrameGeo(W, H) {
  return cached(`star:pw:frame:${k2(W)}:${k2(H)}`, () => {
    const b = new Build();
    const fw = 0.16;
    const s = roundRectShape(W + 2 * fw, H + 2 * fw, 0.14);
    const hole = new THREE.Path();
    const hw = W / 2 + 0.03, hh = H / 2 + 0.03;
    hole.moveTo(-hw, -hh); hole.lineTo(-hw, hh); hole.lineTo(hw, hh); hole.lineTo(hw, -hh); hole.lineTo(-hw, -hh);
    s.holes.push(hole);
    const g = puffyGeo(s, 0.06, 0.03, 6, 2);
    // Form in XY → Wandfläche YZ (Fläche nach +X)
    g.rotateY(Math.PI / 2);
    b.add(g, { v: (x, y, z, nx) => mix(ST.silverLow, ST.silverHi, smoothstep(nx * 0.5 + 0.4 + (y / (H + 0.4)) * 0.3)) }, { p: [0, H / 2, 0] });
    for (const sz of [1, -1]) for (const sy of [0, 1]) b.sphere(0.045, ST.star, { p: [0.05, sy ? H + fw * 0.55 : -fw * 0.55, sz * (W / 2 + fw * 0.55)] }, 8, 6);
    return b.geometry();
  });
}
function wandPlateGeo(W, H, D, color) {
  return cached(`star:pw:plate:${k2(W)}:${k2(H)}:${k2(D)}:${color}`, () => {
    const C = panelColor(color, 'blau');
    const b = new Build();
    // Körper von x = −D bis 0
    b.add(roundedBox(D, H, W, Math.min(0.08, H * 0.3), SIDE.ALL, 0, 2), { v: (x, y, z, nx, ny) => (nx > 0.6 ? mix(C[2], C[0], smoothstep(nx * 2 - 1)) : mix(ST.silverLow, ST.white, smoothstep(ny * 0.5 + 0.55))) }, { p: [-D / 2, H / 2, 0] });
    // rutschfeste Rillen oben (helle Leisten quer)
    const n = Math.max(2, Math.floor(D / 0.32));
    for (let i = 0; i < n; i++) b.box(0.08, 0.025, W * 0.84, mix(ST.silver, C[1], 0.35), { p: [-D + (i + 0.5) * (D / n), H + 0.006, 0] }, 0.01, 1);
    // Stirnseite: heller Einsatz und Goldstern
    b.add(roundedBox(0.03, H * 0.72, W * 0.86, Math.min(0.05, H * 0.2), SIDE.ALL, 0, 1), { v: (x, y, z) => mix(C[0], C[1], smoothstep(y / (H * 0.36) * 0.5 + 0.5) * 0.7) }, { p: [0.01, H / 2, 0] });
    const g = puffyStarGeo(Math.min(H, W) * 0.3, Math.min(H, W) * 0.14, 0.05, 0.025);
    g.rotateY(Math.PI / 2);
    b.add(g, { v: (x, y, z, nx) => mix(ST.starLow, ST.starHi, smoothstep(nx * 0.5 + y * 0.6 + 0.3)) }, { p: [0.05, H / 2, 0] });
    return b.geometry();
  });
}
function buildPlattenwand(opts = {}) {
  const [W, H] = sz2(opts.size, [2, 0.6]);
  const D = clamp(num(opts.depth, 1.6), 0.2, 20);
  const color = opts.color ?? 'blau';
  const root = new THREE.Group();
  const frame = mesh(wandFrameGeo(W, H), toyS(0.3, 'pwrahmen'), {}, false);
  const plate = mesh(wandPlateGeo(W, H, D, color), toyS(0.3, 'pw'), {}, true);
  plate.receiveShadow = true;
  root.add(frame, plate);
  root.userData.top = H;
  const clk = new Clock();
  let out = 0;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    out = damp(out, clamp(num(st.out, 0), 0, 1), 16, dt);
    if (Math.abs(out - num(st.out, 0)) < 0.002) out = clamp(num(st.out, 0), 0, 1);
    const jig = st.warn ? Math.sin(clk.t * 45) * 0.025 : 0;
    plate.position.set(out * D + jig, 0, jig * 0.5);
    root.userData.front = out * D;
  };
  return makeModel('plattenwand', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Zielmast mit Flügeln
// =============================================================================================
/** Flügel aus fünf Federn und Schulterdecke in der YZ-Ebene; s = +1 → reicht nach +Z, −1 → nach −Z. Wurzel im Ursprung. */
function wingGeo(s) {
  return cached(`star:wing:${s}`, () => {
    const b = new Build();
    const outline = (L, W) => {
      const f = new THREE.Shape();
      f.moveTo(0, -W * 0.45);
      f.bezierCurveTo(L * 0.45, -W * 0.62, L * 0.86, -W * 0.38, L, 0);
      f.bezierCurveTo(L * 0.86, W * 0.42, L * 0.4, W * 0.6, 0, W * 0.5);
      f.quadraticCurveTo(-W * 0.3, 0, 0, -W * 0.45);
      return f.getPoints(8);
    };
    // Federn (lang oben, kürzer unten), fächerförmig; Umriss in XY (X = Spannweite, gespiegelt für s = −1)
    const F = [[1.55, 0.36, 0.42], [1.45, 0.36, 0.12], [1.28, 0.34, -0.18], [1.08, 0.32, -0.48], [0.86, 0.3, -0.78]];
    F.forEach(([L, W, a], i) => {
      const pts = outline(L, W).map((p) => new THREE.Vector2(s * (p.x * Math.cos(a) - p.y * Math.sin(a) + 0.12), p.x * Math.sin(a) + p.y * Math.cos(a) - 0.06 * i));
      const g = puffyGeo(new THREE.Shape(pts), 0.05, 0.03, 1, 2);
      g.rotateY(-Math.PI / 2);   // X → Z (Spannweite), Fläche +Z → −X
      b.add(g, { v: (x, y, z) => { const u = Math.abs(z) / (L + 0.4); return mix(mix(0xdfe8ff, ST.white, smoothstep(y * 0.8 + 0.6)), ST.star, smoothstep((u - 0.62) / 0.3) * 0.85); } }, { p: [-0.014 * (4 - i), 0, 0] });
    });
    // Schulterdecke (runde Federpolster) und Goldspange
    for (let i = 0; i < 3; i++) b.sphere(1, { v: (x, y) => mix(0xd8e2ff, ST.white, smoothstep(y * 2 + 0.4)) }, { p: [0, 0.12 - i * 0.06, s * (0.28 + i * 0.2)], s: [0.1, 0.2 - i * 0.03, 0.22] }, 12, 8);
    b.cyl(0.12, 0.12, 0.16, gradV(ST.starLow, ST.starHi), { p: [0, 0, s * 0.08], r: [Math.PI / 2, 0, 0] }, 14);
    b.sphere(0.09, ST.starHi, { p: [0.0, 0, s * 0.17] }, 10, 8);
    return b.geometry();
  });
}
function buildZielmastFluegel(opts = {}) {
  const pole = P1.goal_pole({ height: opts.height ?? 8 });
  const H = Math.max(3, Math.round(Number(opts.height ?? 8) * 2) / 2);
  const root = new THREE.Group();
  const bob = joint();
  bob.add(pole.root);
  const wy = H - 1.15;
  const wingMat = toyS(0.4, 'wing');
  const wings = [1, -1].map((s) => {
    const j = joint([0, wy, s * 0.07]);
    const m = mesh(wingGeo(s), wingMat, {}, true);
    j.add(m);
    bob.add(j);
    return j;
  });
  root.add(bob);
  root.userData.flagHeight = pole.root.userData.flagHeight;
  const clk = new Clock();
  let fly = 0;
  const update = (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    const t = clk.t;
    fly = damp(fly, clamp(num(st.fly, 0), 0, 1), 5, dt);
    const flap = st.flap !== undefined ? clamp(num(st.flap, 0.5), 0, 1) : 0.5 + 0.5 * Math.sin(t * TAU * 2.2);
    // Flügelwinkel: angelegt (Spitzen unten, nach hinten) … weit offen, schlägt zwischen −0,35 und +0,75 rad
    const open = lerp(-1.25, lerp(-0.35, 0.75, flap), fly);
    const back = lerp(0.55, 0.12, fly);
    wings[0].rotation.set(-open, -back, 0);
    wings[1].rotation.set(open, back, 0);
    bob.position.y = fly * (0.25 + Math.sin(t * TAU * 1.1) * 0.18);
    bob.rotation.z = -fly * (0.1 + Math.sin(t * TAU * 1.1 + 0.6) * 0.04);
    pole.update(dt, st);
  };
  return makeModel('zielmast_fluegel', root, update, [pole], { initial: 'idle' });
}

// =============================================================================================
// Riesen-?-Turm (Segment)
// =============================================================================================
/** Turm-Segment 1 × 1 × 1 (Ursprung Mitte unten): Goldblock mit Kranzbändern, Nieten und Funkel-Stempel. */
function segmentGeo() {
  return cached('star:qturm:seg', () => {
    const b = new Build();
    const shade = { v: (x, y, z, nx, ny, nz) => mix(ny > 0.9 ? BLOCK.goldTop : BLOCK.gold, BLOCK.goldEdge, (1 - Math.max(Math.abs(nx), Math.abs(ny), Math.abs(nz))) * 2.2) };
    b.add(roundedBox(0.94, 1, 0.94, 0.06, SIDE.ALL, 0, 2), shade, { p: [0, 0.5, 0] });
    for (const y of [0.07, 0.93]) {
      b.add(roundedBox(1.02, 0.13, 1.02, 0.05, SIDE.ALL, 0, 2), { v: (x, yy, z, nx, ny) => mix(BLOCK.goldEdge, 0xffd86a, smoothstep(ny * 0.6 + 0.5)) }, { p: [0, y, 0] });
      for (let i = 0; i < 4; i++) for (const u of [-0.32, 0, 0.32]) {
        const a = (i / 4) * TAU;
        b.sphere(0.03, BLOCK.rivetGold, { p: [Math.cos(a) * 0.512 - Math.sin(a) * u, y, Math.sin(a) * 0.512 + Math.cos(a) * u] }, 6, 4);
      }
    }
    for (const [ax, sg, ry] of [[0, 1, Math.PI / 2], [0, -1, -Math.PI / 2], [2, 1, 0], [2, -1, Math.PI]]) {
      const off = [0, 0.5, 0]; off[ax] = sg * 0.47;
      b.extrude(sparkShape(0.26, 0.2), 0.03, BLOCK.symShadow, { p: off, r: [0, ry, 0] }, 0, 4);
      const off2 = [0, 0.515, 0]; off2[ax] = sg * 0.495;
      b.extrude(sparkShape(0.21, 0.2), 0.03, BLOCK.sym, { p: off2, r: [0, ry, 0] }, 0.01, 5, 1);
      // senkrechte Führungsschienen links/rechts des Stempels
      for (const u of [-0.36, 0.36]) {
        const p = [0, 0.5, 0]; p[ax] = sg * 0.475; p[ax === 0 ? 2 : 0] = u;
        const sc = [0.05, 0.62, 0.05]; sc[ax] = 0.04;
        b.box(...sc, BLOCK.goldEdge, { p }, 0.015, 1);
      }
    }
    return b.geometry();
  });
}
function buildRiesenFrageTurm(opts = {}) {
  const S = clamp(num(opts.size, 2), 0.3, 12);
  const part = opts.part === 'kopf' ? 'kopf' : 'segment';
  const root = new THREE.Group();
  const scaleJ = joint();
  const body = mesh(part === 'kopf' ? questionGeo('high') : segmentGeo(), blockMat(), { s: S }, true);
  body.receiveShadow = true;
  scaleJ.add(body);
  root.add(scaleJ);
  let spark = null;
  if (part === 'kopf') { spark = sparkleSprite(0xfff2b0, S * 0.6); spark.position.set(S * 0.55, S * 0.85, S * 0.3); scaleJ.add(spark); }
  const clk = new Clock();
  let out = 1, lastN;
  const update = (dt, st) => {
    const anim = st.anim === 'bump' ? 'bump' : 'idle';
    clk.tick(dt, anim);
    if (st.n !== undefined && st.n !== lastN && anim === 'bump') clk.age = 0;
    lastN = st.n;
    const target = clamp(num(st.out, 1), 0, 1);
    out = damp(out, target, 12, dt);
    if (Math.abs(out - target) < 0.002) out = target;
    let bump = 0, sq = 1;
    if (anim === 'bump' && clk.age < 0.3) { const k = clk.age / 0.3; bump = Math.sin(k * Math.PI) * 0.18 * S; sq = 1 + Math.sin(k * Math.PI) * 0.06; }
    scaleJ.scale.set(1, Math.max(0.001, out) * sq, 1);
    scaleJ.position.y = bump;
    scaleJ.visible = out > 0.002;
    root.userData.top = out * S + bump;
    if (spark) { const t = clk.t; spark.visible = (t % 2.2) < 0.45; spark.scale.setScalar(S * (0.3 + Math.sin(((t % 2.2) / 0.45) * Math.PI) * 0.4)); }
  };
  return makeModel('riesen_frageblock_turm', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Wabe
// =============================================================================================
export const WABE_KINDS = ['normal', 'lava', 'eis'];
const wkind = (k) => (WABE_KINDS.includes(k) ? k : 'normal');
/** Wabenkörper (Ursprung Mitte unten, Oberseite y = t; ohne Deckfläche). */
export function wabeBodyGeo(kind, r, t, lo = false) {
  return cached(`star:wabe:body:${kind}:${k2(r)}:${k2(t)}:${lo}`, () => {
    const b = new Build();
    const g = hexPrismGeo(r, t, Math.min(0.08, t * 0.25), lo ? 1 : 3);
    if (kind === 'lava') b.add(g, { v: (x, y, z, nx, ny) => mix(ST.crust, ST.crustHi, smoothstep(ny * 0.5 + 0.4 + (noise3(x * 3, y * 3, z * 3) - 0.5) * 0.6)) });
    else if (kind === 'eis') b.add(g, { v: (x, y, z, nx, ny) => mix(ST.iceLow, ST.ice, smoothstep(ny * 0.5 + 0.5 + y / t * 0.4)) });
    else b.add(g, { v: (x, y, z, nx, ny) => mix(ST.combLow, ST.comb, smoothstep(ny * 0.4 + 0.45 + y / t * 0.5)) });
    // Rand: Kantenleiste oben (heller)
    const rim = new THREE.Shape(); const hs = hexShape(r * 0.98, r * 0.08);
    rim.setFromPoints(hs.getPoints(lo ? 2 : 4));
    rim.holes.push(new THREE.Path(hexShape(r * 0.84, r * 0.06).getPoints(lo ? 2 : 4).reverse()));
    const rg = new THREE.ExtrudeGeometry(rim, { depth: 0.05, bevelEnabled: !lo, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, curveSegments: 2 });
    rg.rotateX(-Math.PI / 2);
    const rimC = kind === 'lava' ? [ST.crust, 0x8a5a58] : kind === 'eis' ? [0xb8e8ff, ST.frost] : [ST.combHi, 0xf4e4ff];
    b.add(rg, { v: (x, y, z, nx, ny) => mix(rimC[0], rimC[1], smoothstep(ny * 0.6 + 0.4)) }, { p: [0, t - 0.02, 0] });
    return b.geometry();
  });
}
/** Deckfläche der Wabe (Ursprung Mitte, liegt bei y = 0): normal/eis beleuchtet, lava unbeleuchtet (glüht). */
export function wabeTopGeo(kind, r, lo = false) {
  return cached(`star:wabe:top:${kind}:${k2(r)}:${lo}`, () => {
    const b = new Build();
    const g = new THREE.ShapeGeometry(hexShape(r * 0.86, r * 0.06), lo ? 2 : 4);
    g.rotateX(-Math.PI / 2);
    // fein unterteilen für Muster
    const fine = subdivideFlat(g, lo ? 1 : 3);
    if (kind === 'lava') {
      b.add(fine, (x, y, z) => { const n = noise3(x * 2.4, 0, z * 2.4), d = Math.hypot(x, z) / r; return mix(mix(ST.lavaWhite, ST.lavaHi, smoothstep(n * 1.2 + d * 0.6)), ST.lava, smoothstep(d * 1.2 + n * 0.8 - 0.4)); });
      // Krustenschollen
      for (let i = 0; i < (lo ? 2 : 4); i++) { const a = i * 1.7 + 0.4, rr = r * (0.25 + hash1(i) * 0.35); b.add(new THREE.CylinderGeometry(r * 0.13, r * 0.16, 0.05, 6), ST.crustHi, { p: [Math.cos(a) * rr, 0.02, Math.sin(a) * rr], r: [0, i, 0] }); }
    } else if (kind === 'eis') {
      b.add(fine, (x, y, z) => { const n = noise3(x * 3, 0, z * 3); return mix(ST.ice, ST.frost, smoothstep(n * 1.4 - 0.1 + (Math.abs(((x + z * 0.6) * 2.5) % 1) < 0.08 ? 0.5 : 0))); });
      if (!lo) for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.3; b.add(flatStarGeo(r * 0.09, 0.02, 0.01, 4, 0.3), ST.frost, { p: [Math.cos(a) * r * 0.45, 0.012, Math.sin(a) * r * 0.45] }); }
    } else {
      b.add(fine, (x, y, z) => { const d = Math.hypot(x, z) / r; return mix(ST.honeyHi, ST.honey, smoothstep(d * 1.3 - 0.15)); });
      b.add(flatStarGeo(r * 0.26, 0.035, 0.018), { v: (x, y, z, nx, ny) => mix(ST.honey, ST.white, smoothstep(ny * 0.7 + 0.2)) }, { p: [0, 0.02, 0] });
    }
    return b.geometry();
  });
}
/** Flache (XZ) Geometrie n-mal vierteln (für Farbmuster je Dreieck). */
function subdivideFlat(g0, levels) {
  let g = g0.index ? g0.toNonIndexed() : g0;
  if (g !== g0) g0.dispose();
  for (let l = 0; l < levels; l++) {
    const P = g.attributes.position, out = [];
    const v = (i) => [P.getX(i), P.getY(i), P.getZ(i)];
    const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    for (let i = 0; i < P.count; i += 3) {
      const a = v(i), b = v(i + 1), c = v(i + 2), ab = m(a, b), bc = m(b, c), ca = m(c, a);
      out.push(...a, ...ab, ...ca, ...ab, ...b, ...bc, ...ca, ...bc, ...c, ...ab, ...bc, ...ca);
    }
    const n = new THREE.BufferGeometry();
    n.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
    n.computeVertexNormals();
    g.dispose();
    g = n;
  }
  return g;
}
export const wabeLitMat = () => toyS(0.3, 'wabe');
export const wabeIceMat = () => toyS(0.12, 'wabeeis', { metalness: 0.1 });
function buildWabe(opts = {}) {
  const kind = wkind(opts.kind);
  const r = clamp(num(opts.size, 1), 0.3, 10), t = clamp(num(opts.thick, 0.5), 0.1, 5);
  const root = new THREE.Group();
  const own = [];
  const press = joint();
  const body = mesh(wabeBodyGeo(kind, r, t), kind === 'eis' ? wabeIceMat() : wabeLitMat(), {}, true);
  body.receiveShadow = true;
  let topMat;
  if (kind === 'lava') { topMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }); own.push(topMat); }
  else { topMat = ownMat(kind === 'eis' ? wabeIceMat() : wabeLitMat(), { emissive: 0x000000 }); own.push(topMat); }
  const top = mesh(wabeTopGeo(kind, r), topMat, { p: [0, t + 0.004, 0] });
  top.receiveShadow = kind !== 'lava';
  press.add(body, top);
  root.add(press);
  let halo = null, NB = 0, bub = null, sp = null;
  if (kind === 'lava') {
    halo = glowSprite(0xff7a2a, r * 2.6, 0.35); halo.material = halo.material.clone(); own.push(halo.material);
    halo.position.y = t + 0.3; press.add(halo);
    NB = 4;
    bub = instMesh(cached('star:wabe:bub', () => new Build().sphere(1, { v: (x, y) => mix(ST.lava, ST.lavaWhite, smoothstep(y + 0.3)) }, {}, 10, 6).geometry()), glowS(), NB, r + 1, t);
    press.add(bub);
  } else if (kind === 'eis') {
    sp = sparkleSprite(0xe8fbff, r * 0.5); sp.position.set(r * 0.3, t + 0.15, r * 0.2); press.add(sp);
  }
  root.userData.top = t;
  const B = Array.from({ length: NB }, (_, i) => ({ a: i * 1.9 + 0.5, rr: r * (0.2 + hash1(i + 3) * 0.45), ph: hash1(i + 7), sp: 0.5 + hash1(i + 1) * 0.5 }));
  const clk = new Clock();
  let pr = 0;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t0 = clk.t;
    pr = damp(pr, clamp(num(st.press, 0), 0, 1), 14, dt);
    const fl = clamp(num(st.flash, 0), 0, 1);
    press.position.y = -pr * 0.08;
    root.userData.top = t - pr * 0.08;
    if (kind === 'lava') {
      const k = 0.82 + Math.sin(t0 * 2.3) * 0.12 + Math.sin(t0 * 5.1) * 0.05 + fl * 0.3;
      topMat.color.setScalar(k);
      halo.material.opacity = 0.28 + Math.sin(t0 * 2.3) * 0.08 + fl * 0.3;
      B.forEach((b, i) => { const p = (t0 * b.sp + b.ph) % 1; setInst(bub, i, Math.cos(b.a) * b.rr, t + 0.02, Math.sin(b.a) * b.rr, 0, 0, 0, Math.sin(p * Math.PI) * r * 0.09 * (p < 0.92 ? 1 : 0) + 0.0001); });
      bub.instanceMatrix.needsUpdate = true;
    } else {
      topMat.emissive.setRGB(fl * 0.45, fl * 0.4, fl * 0.3);
      if (sp) { const ph = (t0 * 0.6) % 1; sp.visible = ph < 0.3; sp.scale.setScalar(Math.max(0.001, Math.sin(ph / 0.3 * Math.PI)) * r * 0.5); }
    }
  };
  return makeModel('wabe', root, update, bub ? [...own, bub] : own, { initial: 'idle' });
}

// =============================================================================================
// Nebelplattform
// =============================================================================================
function cloudSlabGeo(w, d, t) {
  return cached(`star:nebel:slab:${k2(w)}:${k2(d)}:${k2(t)}`, () => {
    const b = new Build();
    // flache Oberseite (Steinplatte mit Raureif) und Wolken-Unterseite aus Polstern
    b.add(roundedBox(w, t * 0.5, d, Math.min(0.12, t * 0.2), SIDE.ALL, 0, 2), { v: (x, y, z, nx, ny) => (ny > 0.6 ? mix(0xd8d4f4, 0xffffff, smoothstep(noise3(x * 1.5, 0, z * 1.5) * 1.2)) : mix(0x9a96c8, 0xe4e0ff, smoothstep(ny * 0.5 + 0.5))) }, { p: [0, t * 0.75, 0] });
    const nx = Math.max(2, Math.round(w / 0.9)), nz = Math.max(2, Math.round(d / 0.9));
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const x = ((i + 0.5) / nx - 0.5) * w * 0.8, z = ((j + 0.5) / nz - 0.5) * d * 0.8;
      const s = Math.min(w / nx, d / nz) * (0.5 + hash1(i * 7 + j) * 0.12);
      b.sphere(1, { v: (px, py, pz, nnx, ny) => mix(0x8a86b8, 0xeeeaff, smoothstep(ny * 0.6 + 0.45)) }, { p: [x, t * 0.48, z], s: [s, t * 0.5, s] }, 12, 8);
    }
    return b.geometry();
  });
}
const fogCardGeo = () => cached('star:nebel:card', () => { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); return g; });
function buildNebelplattform(opts = {}) {
  const [w, d] = sz2(opts.size, [3, 3]);
  const t = clamp(num(opts.thick, 0.5), 0.15, 4);
  const root = new THREE.Group();
  const own = [];
  const sMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, transparent: true, opacity: 1, emissive: 0x16122e });
  own.push(sMat);
  const slab = mesh(cloudSlabGeo(w, d, t), sMat, {}, true);
  slab.receiveShadow = true;
  const fMat = new THREE.MeshBasicMaterial({ map: fogTexture(), color: ST.fog, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
  fMat.userData.toy = false;
  own.push(fMat);
  const N = 7;
  const cards = instMesh(fogCardGeo(), fMat, N, Math.max(w, d) + 2, t);
  cards.renderOrder = 4;
  cards.userData.fx = true;
  root.add(slab, cards);
  const C = Array.from({ length: N }, (_, i) => ({ a: (i / N) * TAU + hash1(i) * 0.5, y: t * (0.15 + hash1(i + 2) * 0.9), s: Math.max(w, d) * (0.55 + hash1(i + 4) * 0.35), ph: hash1(i + 6) * TAU }));
  root.userData.top = t;
  const clk = new Clock();
  let f = 1;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t0 = clk.t;
    f = clamp(num(st.fade, 1), 0, 1);
    sMat.opacity = smoothstep(f);
    sMat.depthWrite = f > 0.95;
    slab.visible = f > 0.01;
    slab.castShadow = f > 0.5;
    slab.position.y = -(1 - f) * 0.15;
    const fogK = 0.22 + Math.sin(f * Math.PI) * 0.45 + f * 0.12;
    fMat.opacity = fogK;
    C.forEach((c, i) => {
      const a = c.a + t0 * 0.08 * (i % 2 ? 1 : -1);
      const rr = 0.42 + Math.sin(t0 * 0.5 + c.ph) * 0.05;
      setInst(cards, i, Math.cos(a) * w * rr, c.y + Math.sin(t0 * 0.7 + c.ph) * 0.06, Math.sin(a) * d * rr, 0, c.ph + t0 * 0.05, 0, [c.s * 1.3, 1, c.s * 0.8]);
    });
    cards.instanceMatrix.needsUpdate = true;
  };
  return makeModel('nebelplattform', root, update, [...own, cards], { initial: 'idle' });
}

// =============================================================================================
// Kanonenkugel zum Draufstehen
// =============================================================================================
const KK = { body: 0x2a3a7a, bodyHi: 0x6a86d8, bodyLow: 0x10163a };
function kugelGeo() {
  return cached('star:kugel:body', () => {
    const b = new Build();
    b.sphere(1, { v: (x, y, z) => mix(KK.bodyLow, mix(KK.body, KK.bodyHi, smoothstep(y * 0.8 + x * 0.25 - 0.1)), smoothstep(y * 0.6 + x * 0.35 + 0.65)) }, {}, 40, 28);
    // Goldband mit Nieten (schräg um den Bauch), Trittstern oben
    // Goldgürtel unter dem Gesicht (y = −0,6) mit Nieten
    const by = -0.6, br = Math.sqrt(1 - by * by);
    b.torus(br, 0.075, gradV(ST.starLow, ST.starHi, 0.7, 0.5), { p: [0, by, 0], r: [Math.PI / 2, 0, 0] }, 8, 56);
    for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU + 0.22; b.sphere(0.04, ST.starHi, { p: [Math.cos(a) * (br + 0.07), by + 0.01, Math.sin(a) * (br + 0.07)] }, 6, 4); }
    // Trittstern oben (darauf steht man), Nietenkranz drumherum
    b.add(flatStarGeo(0.34, 0.06, 0.035), { v: (x, y, z, nx, ny) => mix(ST.starLow, ST.starHi, smoothstep(ny * 0.6 + 0.3)) }, { p: [0, 0.965, 0] });
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; const el = 1.05; b.sphere(0.032, ST.starHi, { p: [Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)] }, 6, 4); }
    // Mund (Grinsen) vorn, Wangen
    const mg = puffyGeo(mouthShape('grin'), 0.06, 0.02, 10, 2);
    const mh = onEllipsoid([0, 0, 0], [1, 1, 1], 0, -0.3);
    b.add(mg, { v: (x, y) => mix(0x5a0a1e, 0xff6a7a, smoothstep(-y * 0.8 - 0.2)) }, placed(mh.p.clone().multiplyScalar(0.985), mh.n, new THREE.Vector3(0.2, 0.18, 1)));
    for (const s of [1, -1]) { const h = onEllipsoid([0, 0, 0], [1, 1, 1], s * 0.62, -0.12); b.add(new THREE.CircleGeometry(1, 16), 0xff7aa8, placed(h.p.clone().multiplyScalar(1.004), h.n, new THREE.Vector3(0.11, 0.07, 1))); }
    // Zündhütchen hinten
    b.cyl(0.16, 0.2, 0.18, gradV(ST.ironLow, ST.ironHi), { p: [-0.98, 0.12, 0], r: [0, 0, Math.PI / 2] }, 14);
    return b.geometry();
  });
}
const KK_EYES = [1, -1].map((s) => { const h = onEllipsoid([0, 0, 0], [1, 1, 1], s * 0.27, 0.2); return { p: h.p.clone().multiplyScalar(0.98).toArray(), r: 0.2, sy: 1.25 }; });
const browGeoK = () => cached('star:kugel:brow', () => new Build().capsule(0.05, 0.22, 0x0c0e1e, { r: [Math.PI / 2, 0, 0] }, 3, 10).geometry());
function buildKanonenkugelTritt(opts = {}) {
  const R = clamp(num(opts.size, 2), 0.4, 12) / 2;
  const root = new THREE.Group();
  const own = [];
  const sq = joint();
  sq.scale.setScalar(R);
  const tilt = joint();
  const body = mesh(kugelGeo(), toyS(0.24, 'kugel', { metalness: 0.25 }), {}, true);
  body.receiveShadow = true;
  const eye = eyes(KK_EYES, { key: 'star:kugel', center: [0, 0, 0], iris: 0x3a7aff, pupil: 0.6, depth: 0.5 });
  const brows = instMesh(browGeoK(), toyS(0.5, 'brow'), 2, 2, 0.4);
  tilt.add(body, eye, brows);
  sq.add(tilt);
  const smoke = fxPuffs(14, 0xe8e8f4, { opacity: 0.75, radius: R * 6 + 4, cy: 0 });
  own.push(smoke);
  root.add(sq, smoke.mesh);
  root.userData.radius = R; root.userData.top = R;
  const clk = new Clock();
  let emit = 0, mood = 0;
  const bl = { next: 2 + Math.random() * 2, k: 1 };
  const update = (dt, st) => {
    let anim = st.anim ?? 'idle';
    if (!['idle', 'fly', 'step'].includes(anim)) anim = 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    mood = damp(mood, anim === 'fly' ? 1 : 0, 6, dt);
    let sy = 1, sxz = 1;
    if (anim === 'step') { const p = prog(st, clk, 0.35); const k = Math.sin(p * Math.PI) * (1 - p * 0.4); sy = 1 - k * 0.12; sxz = 1 + k * 0.06; }
    else { const w = Math.sin(t * 2.2) * 0.012; sy = 1 + w; sxz = 1 - w * 0.5; }
    sq.scale.set(R * sxz, R * sy, R * sxz);
    sq.position.y = -(1 - sy) * R * 0.5;
    tilt.rotation.z = -mood * 0.12 + Math.sin(t * 3) * 0.02 * mood;
    // Brauen: keck (idle) … entschlossen schräg (fly)
    for (const [i, s] of [[0, 1], [1, -1]]) {
      const h = KK_EYES[i].p;
      setInst(brows, i, h[0] + 0.02, h[1] + 0.27 - mood * 0.03, h[2], -s * (0.05 + mood * 0.5), 0, 0, 1);
    }
    brows.instanceMatrix.needsUpdate = true;
    bl.next -= dt;
    if (bl.next < 0) { bl.k = 0; bl.next = 2.5 + Math.random() * 2.5; }
    bl.k = damp(bl.k, 1, 9, dt);
    eye.userData.blink(anim === 'step' ? 0.35 : bl.k);
    emit -= dt;
    if (anim === 'fly' && emit <= 0) { smoke.burst([-R * 1.05, 0, 0], { count: 2, speed: 0.6, up: 0.2, size: R * 0.32, life: 0.9, spread: R * 0.2 }); emit = 0.07; }
    for (const it of smoke.items) if (it.age < it.life) it.v.x = Math.min(it.v.x, -1.5);
    smoke.step(dt);
  };
  return makeModel('kanonenkugel_tritt', root, update, [...own, brows], { initial: 'idle' });
}

// =============================================================================================
// Diorama-Drehscheibe
// =============================================================================================
function dsBaseGeo(R, H) {
  return cached(`star:ds:base:${k2(R)}:${k2(H)}`, () => {
    const b = new Build();
    const h0 = H * 0.42;
    b.cyl(R * 0.86, R * 0.92, h0, { v: (x, y, z, nx, ny) => mix(ST.ironLow, ST.ironHi, smoothstep(ny * 0.4 + 0.45 + y / h0 * 0.4)) }, { p: [0, h0 / 2, 0] }, 40);
    b.torus(R * 0.9, 0.06, ST.brass, { p: [0, 0.08, 0], r: [Math.PI / 2, 0, 0] }, 6, 48);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; b.sphere(0.06, ST.brassHi, { p: [Math.cos(a) * R * 0.9, h0 * 0.55, Math.sin(a) * R * 0.9] }, 6, 4); }
    // Antriebssockel bei +X unter dem Ritzel (Ritzelmitte x = R + 0,5, Unterkante y = yp − 0,15·H)
    const gx = R + 0.5, top = h0 + (H - h0) * 0.4 - H * 0.15 - 0.02;
    b.box(1.3, top, 1.3, gradV(ST.tealLow, ST.teal, 0.5, 0.5), { p: [gx + 0.2, top / 2, 0] }, 0.1, 2);
    b.box(1.4, 0.08, 1.4, gradV(ST.brassLow, ST.brassHi), { p: [gx + 0.2, top - 0.04, 0] }, 0.03, 1);
    return b.geometry();
  });
}
function dsDiscGeo(R, H, teeth) {
  return cached(`star:ds:disc:${k2(R)}:${k2(H)}:${teeth}`, () => {
    const b = new Build();
    const h0 = H * 0.42, h1 = H - h0;
    // Zahnkranz (Messing) als Rand der Scheibe
    const g = puffyGeo(gearShape(R, teeth, Math.min(0.28, R * 0.06)), h1 * 0.55, 0.04, 2, 1);
    g.rotateX(-Math.PI / 2);
    b.add(g, { v: (x, y, z, nx, ny) => mix(ST.brassLow, ST.brassHi, smoothstep(ny * 0.5 + 0.35 + (noise3(x, y, z) - 0.5) * 0.2)) }, { p: [0, h0 + h1 * 0.4, 0] });
    // Deck: Fliesenringe (türkis/creme), Pfeilmarken, Sternnabe
    const top = new THREE.CircleGeometry(R * 0.93, 64, 0, TAU);
    top.rotateX(-Math.PI / 2);
    b.cyl(R * 0.93, R * 0.93, h1 * 0.5, gradV(ST.tealLow, ST.teal, 0.4, 0.5), { p: [0, H - h1 * 0.25, 0] }, 56);
    const ringC = (x, y, z) => { const r = Math.hypot(x, z) / (R * 0.93); const a = Math.atan2(z, x); const ring = Math.floor(r * 5); const tile = Math.floor((a / TAU + 1) * (8 + ring * 6)) % 2; return ring === 0 ? col(ST.cream) : (ring + tile) % 2 ? col(ST.cream) : col(ST.tealHi); };
    const fine = new THREE.RingGeometry(0.01, R * 0.93, 64, 10); fine.rotateX(-Math.PI / 2);
    b.add(fine, ringC, { p: [0, H + 0.005, 0] });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.3;
      const s = new THREE.Shape(); s.moveTo(-0.35, -0.22); s.lineTo(0.1, -0.22); s.lineTo(0.1, -0.42); s.lineTo(0.5, 0); s.lineTo(0.1, 0.42); s.lineTo(0.1, 0.22); s.lineTo(-0.35, 0.22); s.lineTo(-0.35, -0.22);
      const ag = puffyGeo(s, 0.04, 0.02, 2, 1);
      ag.rotateX(-Math.PI / 2);
      ag.rotateY(Math.PI / 2 - a); // Pfeil tangential in Drehrichtung (positiver Winkel)
      b.add(ag, ST.star, { p: [Math.cos(a) * R * 0.72, H + 0.03, Math.sin(a) * R * 0.72], s: R / 5 });
    }
    b.cyl(R * 0.16, R * 0.18, 0.12, gradV(ST.brassLow, ST.brassHi), { p: [0, H + 0.06, 0] }, 24);
    b.add(flatStarGeo(R * 0.13, 0.06, 0.03), { v: (x, y, z, nx, ny) => mix(ST.starLow, ST.starHi, smoothstep(ny * 0.6 + 0.3)) }, { p: [0, H + 0.15, 0] });
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; b.sphere(0.05, ST.brassHi, { p: [Math.cos(a) * R * 0.88, H + 0.02, Math.sin(a) * R * 0.88], s: [1, 0.5, 1] }, 6, 4); }
    return b.geometry();
  });
}
function dsPinionGeo(rp, H) {
  return cached(`star:ds:pinion:${k2(rp)}:${k2(H)}`, () => {
    const b = new Build();
    const g = puffyGeo(gearShape(rp, 10, Math.min(0.2, rp * 0.25), rp * 0.2), H * 0.3, 0.03, 2, 1);
    g.rotateX(-Math.PI / 2);
    b.add(g, { v: (x, y, z, nx, ny) => mix(ST.copper, ST.copperHi, smoothstep(ny * 0.5 + 0.4)) });
    // Kurbelrad oben mit Griff
    b.torus(rp * 0.7, 0.05, ST.woodRed, { p: [0, H * 0.55, 0], r: [Math.PI / 2, 0, 0] }, 6, 24);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; rod(b, [0, H * 0.55, 0], [Math.cos(a) * rp * 0.7, H * 0.55, Math.sin(a) * rp * 0.7], 0.035, 0.035, ST.woodRed, 6); }
    b.cyl(0.06, 0.06, 0.35, ST.woodHi, { p: [rp * 0.7, H * 0.55 + 0.18, 0] }, 8);
    b.sphere(0.1, ST.brassHi, { p: [0, H * 0.55, 0] }, 8, 6);
    return b.geometry();
  });
}
function buildDioramaDrehscheibe(opts = {}) {
  const R = clamp(num(opts.radius, 5), 1, 30), H = clamp(num(opts.height, 1.2), 0.3, 8), teeth = clamp(Math.round(num(opts.teeth, 48)), 12, 160);
  const root = new THREE.Group();
  const base = mesh(dsBaseGeo(R, H), toyS(0.35, 'dsbase', { metalness: 0.2 }), {}, true);
  base.receiveShadow = true;
  const spin = joint();
  const disc = mesh(dsDiscGeo(R, H, teeth), toyS(0.3, 'dsdisc', { metalness: 0.15 }), {}, true);
  disc.receiveShadow = true;
  spin.add(disc);
  const rp = 0.62;
  const pin = joint([R + rp - 0.12, H * 0.42 + (H - H * 0.42) * 0.4, 0]);
  pin.add(mesh(dsPinionGeo(rp, H), toyS(0.3, 'dspin', { metalness: 0.2 }), {}, true));
  root.add(base, spin, pin);
  root.userData.top = H;
  let ang = 0;
  const update = (dt, st) => {
    if (st.angle !== undefined) ang = num(st.angle, 0); else ang += dt * num(st.speed, 0);
    spin.rotation.y = ang;
    pin.rotation.y = -ang * (R / rp);
  };
  return makeModel('diorama_drehscheibe', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Laufbombe (Zwilling des Zündkopfs)
// =============================================================================================
function buildLaufbombe(opts = {}) {
  const inner = W5E.zuendkopf(opts);
  const root = new THREE.Group();
  root.add(inner.root);
  const clk = new Clock();
  const s = {};
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    for (const k of Object.keys(s)) delete s[k];
    Object.assign(s, st);
    if (anim === 'fuse') {
      const p = prog(st, clk, 3);
      s.anim = p < 0.75 ? 'lit' : 'blink';
      s.fuse = 1 - p;
      delete s.progress;
    } else if (anim === 'boom') s.anim = 'explode';
    else if (!['idle', 'walk', 'carried', 'thrown', 'lit', 'blink', 'explode'].includes(anim)) s.anim = 'idle';
    inner.update(dt, s);
  };
  return makeModel('laufbombe', root, update, [inner], { initial: 'idle' });
}

// =============================================================================================
// Felsblock mit Riss
// =============================================================================================
const FR = { stone: 0x9a8a84, stoneHi: 0xd8ccc0, stoneLow: 0x5a4a4e, crack: 0x2a1a1e, crackHot: 0xffa84a, pebble: 0x8a7a76 };
function felsGeo(x, y, z) {
  return cached(`star:fels:${k2(x)}:${k2(y)}:${k2(z)}`, () => {
    const b = new Build();
    const g = displace(roundedBox(x, y, z, Math.min(x, y, z) * 0.22, SIDE.ALL, 0, 4), Math.min(x, y, z) * 0.035, 1.6, 3, true);
    b.add(g, { v: (px, py, pz, nx, ny) => mix(FR.stoneLow, mix(FR.stone, FR.stoneHi, smoothstep(ny * 0.6 + 0.2 + (noise3(px * 1.4, py * 1.4, pz * 1.4) - 0.5) * 0.7)), smoothstep(ny * 0.4 + 0.55 + py / y * 0.3)) }, { p: [0, y / 2, 0] });
    // Kiesel am Fuß
    for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.3, r = Math.max(x, z) * (0.5 + hash1(i) * 0.12); b.add(lumpyEllipsoid([1, 0.7, 1], 0.15, 2, i, 8, 6), { v: (px, py, pz, nx, ny) => mix(FR.stoneLow, FR.pebble, smoothstep(ny + 0.3)) }, { p: [Math.cos(a) * r * (x / Math.max(x, z)), 0.06, Math.sin(a) * r * (z / Math.max(x, z))], s: 0.08 + hash1(i + 2) * 0.08 }); }
    return b.geometry();
  });
}
/** Risse: gezackte Röhren auf den Seiten (dunkel; glow = heiße Kopie innen). */
function crackGeo(x, y, z, hot) {
  return cached(`star:fels:crack:${k2(x)}:${k2(y)}:${k2(z)}:${hot}`, () => {
    const b = new Build();
    const faces = [[x / 2, 0, 1, 0], [-x / 2, 0, -1, 0], [0, z / 2, 0, 1], [0, -z / 2, 0, -1]];
    faces.forEach(([fx, fz, nx, nz], fi) => {
      for (let c = 0; c < 2; c++) {
        const pts = [];
        let u = (hash1(fi * 5 + c) - 0.5) * 0.5, v = y * (0.85 - c * 0.3);
        const len = nx ? z : x;
        for (let k = 0; k < 6; k++) {
          const off = hot ? 0.05 : 0.02;
          const px = nx ? fx : u * len, pz = nz ? fz : u * len;
          pts.push([px + nx * off, v, pz + nz * off]);
          u = clamp(u + (hash1(fi * 11 + c * 3 + k) - 0.5) * 0.35, -0.3, 0.3); v -= y * (0.12 + hash1(k + fi) * 0.06);
          if (v < y * 0.1) break;
        }
        if (pts.length > 2) b.add(taperTube(pts, (t) => (hot ? 0.035 : 0.06) * (1 - t * 0.6) * Math.min(1, Math.min(x, y, z) / 1.5) + 0.01, 24, 4), hot ? FR.crackHot : FR.crack);
      }
    });
    return b.geometry();
  });
}
const chunkGeo = () => cached('star:fels:chunk', () => new Build().add(lumpyEllipsoid([1, 0.8, 0.9], 0.18, 2.2, 5, 10, 8), { v: (x, y, z, nx, ny) => mix(FR.stoneLow, FR.stoneHi, smoothstep(ny * 0.6 + 0.3)) }).geometry());
function rubbleGeo(x, z) {
  return cached(`star:fels:rubble:${k2(x)}:${k2(z)}`, () => {
    const b = new Build();
    for (let i = 0; i < 9; i++) { const a = i * 2.3, r = Math.min(x, z) * (0.1 + hash1(i + 4) * 0.35); b.add(lumpyEllipsoid([1, 0.6, 0.9], 0.2, 2, i, 8, 6), { v: (px, py, pz, nx, ny) => mix(FR.stoneLow, FR.stone, smoothstep(ny + 0.2)) }, { p: [Math.cos(a) * r, 0.08, Math.sin(a) * r], s: Math.min(x, z) * (0.08 + hash1(i) * 0.06) }); }
    return b.geometry();
  });
}
function buildFelsblockRiss(opts = {}) {
  const [x, y, z] = sz3(opts.size, [2, 2, 2]);
  const root = new THREE.Group();
  const own = [];
  const shake = joint();
  const rock = mesh(felsGeo(x, y, z), toyS(0.8, 'fels'), {}, true);
  rock.receiveShadow = true;
  const cracks = mesh(crackGeo(x, y, z, false), toyS(0.9, 'felsriss'), {});
  const hMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, transparent: true, opacity: 0, depthWrite: false });
  own.push(hMat);
  const hot = mesh(crackGeo(x, y, z, true), hMat, {});
  shake.add(rock, cracks, hot);
  const NC = 10;
  const chunks = instMesh(chunkGeo(), toyS(0.8, 'fels'), NC, Math.max(x, y, z) * 3 + 4, y);
  chunks.castShadow = true;
  const rubble = mesh(rubbleGeo(x, z), toyS(0.8, 'fels'), {}, true);
  const dust = fxPuffs(16, 0xe8dcd0, { opacity: 0.8, radius: Math.max(x, y, z) * 3 + 3, cy: y / 2 });
  own.push(dust);
  root.add(shake, chunks, rubble, dust.mesh);
  const CH = Array.from({ length: NC }, (_, i) => ({ a: (i / NC) * TAU + hash1(i) * 0.5, up: 3 + hash1(i + 2) * 3, v: 2 + hash1(i + 4) * 2.5, y0: y * (0.2 + hash1(i + 6) * 0.6), s: Math.min(x, y, z) * (0.16 + hash1(i + 8) * 0.12), spin: hash1(i + 9) * 6 }));
  const clk = new Clock();
  let lastB = 0;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t = clk.t;
    const br = clamp(num(st.break, 0), 0, 1);
    const pre = clamp(br / 0.15, 0, 1);
    const intact = br < 0.15;
    shake.visible = intact;
    const jig = intact && br > 0 ? Math.sin(t * 50) * 0.03 * pre : 0;
    shake.position.set(jig, 0, jig * 0.6);
    hMat.opacity = intact ? pre : 0;
    hot.visible = intact && pre > 0.01;
    const p = clamp((br - 0.15) / 0.85, 0, 1);
    chunks.visible = !intact && p < 0.999;
    rubble.visible = !intact;
    if (chunks.visible) {
      const tt = p * 1.1;
      CH.forEach((c, i) => {
        const yy = c.y0 + c.up * tt - 4.9 * tt * tt;
        setInst(chunks, i, Math.cos(c.a) * (x * 0.25 + c.v * tt), Math.max(c.s * 0.6, yy), Math.sin(c.a) * (z * 0.25 + c.v * tt), c.spin * tt, c.spin * tt * 0.7, 0, c.s * (1 - smoothstep((p - 0.7) / 0.3)) + 0.0001);
      });
      chunks.instanceMatrix.needsUpdate = true;
    }
    if (lastB < 0.15 && br >= 0.15) for (let i = 0; i < 2; i++) dust.burst([0, y * 0.4, 0], { count: 8, speed: 2.5, up: 1, size: Math.min(x, y, z) * 0.3, life: 1.1, spread: Math.min(x, z) * 0.4 });
    lastB = br;
    dust.step(dt);
  };
  return makeModel('felsblock_riss', root, update, [...own, chunks], { initial: 'idle' });
}

export const MODELS = {
  drehplatte: buildDrehplatte,
  farbplatte: buildFarbplatte,
  plattenwand: buildPlattenwand,
  zielmast_fluegel: buildZielmastFluegel,
  riesen_frageblock_turm: buildRiesenFrageTurm,
  wabe: buildWabe,
  nebelplattform: buildNebelplattform,
  kanonenkugel_tritt: buildKanonenkugelTritt,
  diorama_drehscheibe: buildDioramaDrehscheibe,
  laufbombe: buildLaufbombe,
  felsblock_riss: buildFelsblockRiss,
};
