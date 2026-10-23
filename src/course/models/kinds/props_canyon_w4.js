// Kulisse Welt 4 (Kurs-Modus), Teil 1: Canyon (4-1) und Giftwald (4-2). Eigene Gestaltung, Kartenqualität (wenige
// Dreiecke, kräftige Farben, facettierter Fels). Maßstab Meter, Ursprung = Mitte der Unterseite (Ausnahmen genannt),
// Vorderseite +X; state darf ein String sein.
//
// tafelberg        Tafelberg: unregelmäßig runder Fels mit waagerechten Gesteinsschichten (rost, orange, sand, creme),
//                  überhängender Graskante und Büschen auf der flachen Kuppe.
//                  opts { radius (4), height (6) }  state –   root.userData.top → Höhe der Kuppe.
// canyon_bogen     natürlicher Felsbogen aus geschichtetem Canyon-Gestein mit Grasbüscheln oben; Füße bei z = ±width/2,
//                  Durchgang entlang ±X.  opts { width (5, Abstand der Fußmitten), height (4, Scheitel-Oberkante),
//                  thickness (1,2) }  state –
// felsnadel        Felsnadel (Erdpyramide) mit Schichten, schmaler Taille und Kappenstein mit Gras.
//                  opts { height (5) }  state –   Viele → createInstanced('felsnadel', n) (lib/instanced_w4.js).
// ameisenhuegel    Ameisenhügel: rotbrauner Erdhügel mit Krümeln, Eingangslöchern ringsum, Krater oben und kleinem
//                  Ameisen-Wimpel (gelb-rot).  opts { size (Durchmesser, 2,5) }  state –  Höhe ≈ 0,6 · size.
// ameisenhoehle    Ameisenhöhlen-Eingang: Felswand (Canyon-Schichten) mit Bogenöffnung nach +X, Stollen-Holzrahmen,
//                  dunkler Gang nach −X (2,5 m tief) und Schild mit Ameisen-Helm-Zeichen. Ursprung = Mitte der Öffnung am
//                  Boden.  opts { width (lichte Weite, 3,2), height (lichte Höhe, 2,4) }  state –
//                  root.userData.opening → { width, height } (lichte Maße).
// giftpilz         Giftpilz: violetter Hut mit leuchtend lindgrünen Punkten, türkis glühende Lamellen, blasser Stiel mit
//                  Manschette und Giftgrün-Tropfen.  opts { height (2) }  state { anim: 'idle'|'shake' } shake: wackelt.
//                  Viele → createInstanced('giftpilz', n).
// giftbaum         verdrehter Giftwald-Baum: gedrehter, dunkelvioletter Stamm mit Rindenstreifen, zwei Äste, Kronen-
//                  ballen in Petrol/Violett, hängendes giftgrünes Moos, Wurzeln.  opts { height (5) }  state { sway (0..1) }
// liane            hängende Liane mit Blättern. **Ursprung = Aufhängung oben**, hängt nach −Y.
//                  opts { length (3) }  state { sway (0..1, Standard 0,3) }  pendelt um die Aufhängung.
// giftwasserfall   lila Giftwasserfall: gewölbter, fließender Vorhang (Schlieren laufen nach unten) über einer Felskante,
//                  unten Gischt-Blasen und Schaum. Ursprung = Aufprallpunkt unten (Mitte), Vorderseite +X.
//                  opts { width (3), height (5) }  state –

import {
  THREE, TAU, Build, cached, vcol, basic, std, mesh, joint, makeModel, Clock, damp, clamp, mix, col, smoothstep,
  instMesh, setInst, canvasTexture, placed, glowSprite,
} from '../lib/kit.js';
import { CANYON, strataColor, noise3, hash1, displace, felsnadelGeo, canyonMat } from '../lib/w4Geos.js';
import { roundedBox, SIDE } from '../lib/kit.js';
const roundedBoxG = (w, h, d, r) => roundedBox(w, h, d, r, SIDE.ALL, 0, 1);
import { GIFT, giftpilzGeos, giftpilzMats, fallTexture } from '../lib/w4Props.js';

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
const flat = (g) => { const n = g.index ? g.toNonIndexed() : g; if (n !== g) g.dispose(); n.deleteAttribute('normal'); n.computeVertexNormals(); return n; };

// =============================================================================================
// Tafelberg
// =============================================================================================
function tafelbergGeo(R, H) {
  return cached(`w4:mesa:${R}:${H}`, () => {
    const b = new Build();
    const bands = Math.max(4, Math.round(H / 0.6));
    const g = new THREE.CylinderGeometry(R, R, H, 22, bands, false);
    g.translate(0, H / 2, 0);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      const a = Math.atan2(z, x);
      const r0 = Math.hypot(x, z);
      if (r0 < 1e-4) continue;
      const k = 1 + (noise3(Math.cos(a) * 2 + R, Math.sin(a) * 2, 0.5) - 0.5) * 0.4
        + (Math.floor(y / 0.6) % 2 ? 0.04 : -0.02) + 0.1 * (1 - y / H) + (noise3(Math.cos(a) * 5, y * 0.8, Math.sin(a) * 5) - 0.5) * 0.12;
      P.setX(i, x * k); P.setZ(i, z * k);
    }
    const fg = flat(g);
    b.add(fg, (x, y, z, nx, ny) => (ny > 0.8 && y > H - 0.05 ? CANYON.grass : strataColor(y, x, z, { band: 0.6, seed: R })));
    // überhängende Graskante und Büsche oben
    const lip = new THREE.CylinderGeometry(R * 1.1, R * 1.06, 0.22, 22, 1, false);
    const L = lip.attributes.position;
    for (let i = 0; i < L.count; i++) {
      const x = L.getX(i), z = L.getZ(i), a = Math.atan2(z, x), r0 = Math.hypot(x, z);
      if (r0 < 1e-4) continue;
      const k = 1 + (noise3(Math.cos(a) * 2 + R, Math.sin(a) * 2, 0.5) - 0.5) * 0.4 + 0.02;
      L.setX(i, x * k); L.setZ(i, z * k);
      if (L.getY(i) < 0) L.setY(i, L.getY(i) - Math.max(0, Math.sin(a * 7)) * 0.12);
    }
    b.add(flat(lip), (x, y, z, nx, ny) => (ny > 0.5 ? CANYON.grass : CANYON.grassDark), { p: [0, H + 0.05, 0] });
    for (let i = 0; i < 5; i++) {
      const a = i * 2.3 + R, r = R * (0.25 + hash1(i + R) * 0.45);
      b.add(displace(new THREE.IcosahedronGeometry(0.45 + hash1(i * 3) * 0.3, 1), 0.08, 3, i, false), (x, y, z, nx, ny) => (ny > 0.3 ? 0x5ab83a : 0x3a8a2a), { p: [Math.cos(a) * r, H + 0.25, Math.sin(a) * r], s: [1, 0.7, 1] });
    }
    return b.geometry();
  });
}
function buildTafelberg(opts = {}) {
  const R = clamp(Math.round((opts.radius ?? 4) * 2) / 2, 1, 30), H = clamp(Math.round((opts.height ?? 6) * 2) / 2, 1, 40);
  const root = new THREE.Group();
  const m = mesh(tafelbergGeo(R, H), canyonMat(), {}, true);
  m.receiveShadow = true;
  root.add(m);
  root.userData.top = H + 0.16;
  return makeModel('tafelberg', root, () => {});
}

// =============================================================================================
// Canyon-Bogen
// =============================================================================================
function bogenGeo(W, H, T) {
  return cached(`w4:bogen:${W}:${H}:${T}`, () => {
    const b = new Build();
    const r = T / 2;
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const a = Math.PI * (i / 16);
      pts.push(new THREE.Vector3(0, Math.sin(a) * (H - r) + (i === 0 || i === 16 ? -0.4 : 0), -Math.cos(a) * W / 2));
    }
    const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, r, 9, false);
    // Füße dicker (Fußpunkte), Scheitel etwas schlanker
    const P = tube.attributes.position, path = tube.parameters.path;
    const seg = 28, rs = 9;
    for (let i = 0; i < P.count; i++) {
      const s = Math.floor(i / (rs + 1)) / seg;
      const c = path.getPointAt(Math.min(1, s));
      const k = 1 + Math.pow(Math.abs(s - 0.5) * 2, 3) * 0.7 - (1 - Math.abs(s - 0.5) * 2) * 0.08;
      P.setXYZ(i, c.x + (P.getX(i) - c.x) * k * 1.15, c.y + (P.getY(i) - c.y) * k, c.z + (P.getZ(i) - c.z) * k);
    }
    const dg = displace(tube, 0.12, 1.4, W, false);
    b.add(dg, (x, y, z, nx, ny) => (ny > 0.75 && y > H * 0.85 ? CANYON.grass : strataColor(y, x, z, { band: 0.55, seed: H })));
    // Fußblöcke (verbreitert)
    for (const s of [1, -1]) {
      const fb = displace(new THREE.CylinderGeometry(r * 1.2, r * 1.75, 1.3, 9, 2), 0.1, 1.6, s * 3, false);
      b.add(fb, (x, y, z) => strataColor(y + 0.65, x, z, { band: 0.55, seed: H }), { p: [0, 0.65, s * W / 2] });
    }
    // Grasbüschel oben
    for (let i = 0; i < 4; i++) {
      const z = (i - 1.5) * W * 0.13;
      b.add(displace(new THREE.IcosahedronGeometry(0.28, 1), 0.06, 4, i, false), (x, y, z2, nx, ny) => (ny > 0.2 ? CANYON.grass : CANYON.grassDark), { p: [0, H - 0.02, z], s: [1.2, 0.6, 1.2] });
    }
    return b.geometry();
  });
}
function buildCanyonBogen(opts = {}) {
  const W = clamp(Math.round((opts.width ?? 5) * 2) / 2, 2, 30), H = clamp(Math.round((opts.height ?? 4) * 2) / 2, 1.5, 30), T = clamp(Math.round((opts.thickness ?? 1.2) * 10) / 10, 0.4, 4);
  const root = new THREE.Group();
  const m = mesh(bogenGeo(W, H, T), canyonMat(), {}, true);
  m.receiveShadow = true;
  root.add(m);
  return makeModel('canyon_bogen', root, () => {});
}

// =============================================================================================
// Felsnadel
// =============================================================================================
function buildFelsnadel(opts = {}) {
  const H = clamp(Math.round((opts.height ?? 5) * 2) / 2, 1.5, 40);
  const root = new THREE.Group();
  const m = mesh(felsnadelGeo(H), canyonMat(), {}, true);
  m.receiveShadow = true;
  root.add(m);
  return makeModel('felsnadel', root, () => {});
}

// =============================================================================================
// Ameisenhügel
// =============================================================================================
const AH = { soil: 0xb8582e, soilHi: 0xe08a4a, soilLow: 0x7a3418, crumb: 0xf0b070, hole: 0x2a1408, pole: 0x8a5a2a, flag: 0xffc21a, flagStripe: 0xe8283a };
function huegelGeo(S) {
  return cached(`w4:huegel:${S}`, () => {
    const b = new Build();
    const R = S / 2, H = S * 0.6;
    const pts = [[0, 0], [R, 0], [R * 0.9, H * 0.15], [R * 0.66, H * 0.45], [R * 0.42, H * 0.78], [R * 0.3, H * 0.94], [R * 0.2, H], [R * 0.1, H * 0.86], [0, H * 0.84]];
    const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 18);
    const dg = displace(g, S * 0.04, 2.5 / S, S, false);
    b.add(dg, (x, y, z, nx, ny) => (noise3(x * 6, y * 6, z * 6) > 0.68 ? AH.crumb : mix(AH.soilLow, AH.soilHi, smoothstep(ny * 0.5 + 0.4 + y / H * 0.3))));
    // Eingangslöcher ringsum (dunkle Ellipsen mit Wulst)
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.4, y = H * (0.18 + (i % 2) * 0.22);
      const rr = (R * (1 - (y / H) * 0.7)) * 0.98;
      const p = new THREE.Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr), n = new THREE.Vector3(Math.cos(a), 0.45, Math.sin(a)).normalize();
      b.add(new THREE.CircleGeometry(1, 14), AH.hole, placed(p.clone().addScaledVector(n, 0.02), n, new THREE.Vector3(S * 0.08, S * 0.065, 1)));
      b.add(new THREE.TorusGeometry(1, 0.25, 6, 14), AH.soilHi, placed(p, n, new THREE.Vector3(S * 0.085, S * 0.07, S * 0.06)));
    }
    // Krater oben
    b.add(new THREE.CircleGeometry(R * 0.16, 14), AH.hole, { p: [0, H * 0.87, 0], r: [-Math.PI / 2, 0, 0] });
    // Krümel am Fuß
    for (let i = 0; i < 9; i++) {
      const a = i * 2.1, r = R * (1.02 + hash1(i) * 0.25);
      b.add(new THREE.IcosahedronGeometry(S * (0.025 + hash1(i + 9) * 0.03), 0), i % 3 ? AH.soil : AH.crumb, { p: [Math.cos(a) * r, S * 0.02, Math.sin(a) * r], r: [i, i, 0] });
    }
    // Wimpel (Ameisen-Kaserne)
    b.cyl(S * 0.012, S * 0.012, S * 0.35, AH.pole, { p: [R * 0.05, H * 0.95 + S * 0.15, R * 0.05] }, 6);
    const fl = new THREE.Shape(); fl.moveTo(0, 0); fl.lineTo(S * 0.18, -S * 0.05); fl.lineTo(0, -S * 0.1); fl.closePath();
    b.add(new THREE.ShapeGeometry(fl), (x, y) => (y > -S * 0.05 ? AH.flag : AH.flagStripe), { p: [R * 0.05, H * 0.95 + S * 0.32, R * 0.05], r: [0, 0, 0] });
    return b.geometry();
  });
}
function buildAmeisenhuegel(opts = {}) {
  const S = clamp(Math.round((opts.size ?? 2.5) * 4) / 4, 0.5, 20);
  const root = new THREE.Group();
  const m = mesh(huegelGeo(S), vcol(0.85, { side: THREE.DoubleSide }, 'w4soil'), {}, true);
  m.receiveShadow = true;
  root.add(m);
  return makeModel('ameisenhuegel', root, () => {});
}

// =============================================================================================
// Ameisenhöhle
// =============================================================================================
const HO = { wood: 0xa8683a, woodDark: 0x6a3a1a, nail: 0x3a2a2a, dark: 0x120806, sign: 0xf0d49a, signInk: 0x2c2788 };
function hoehleGeo(W, Hh) {
  return cached(`w4:hoehle:${W}:${Hh}`, () => {
    const b = new Build();
    const wallW = W + 4, wallH = Hh + 2.4, D = 1.4;
    // Felswand aus waagerechten Gesteinsschichten (je 0,6 m), Öffnung ausgespart (unten gerade, oben Bogen)
    const hw = W / 2, hs = Hh - hw * 0.6;
    const band = 0.6, nb = Math.ceil(wallH / band);
    const gapAt = (y) => (y < hs ? hw : y < Hh ? hw * Math.sqrt(Math.max(0, 1 - ((y - hs) / (hw * 0.6)) ** 2)) : 0);
    for (let i = 0; i < nb; i++) {
      const y0 = i * band, y1 = Math.min(wallH, y0 + band), yc = (y0 + y1) / 2;
      const jag = (k) => (hash1(i * 7 + k + W) - 0.5);
      const dep = D + jag(1) * 0.5, front = jag(2) * 0.3;
      const left = -wallW / 2 + jag(3) * 0.8 + i * 0.12, right = wallW / 2 + jag(4) * 0.8 - i * 0.12;
      const top = i === nb - 1;
      const colr = CANYON.bands[(i + 2) % CANYON.bands.length];
      const cf = { v: (x, y, z, nx, ny) => (top && ny > 0.7 ? CANYON.grass : mix(CANYON.shadow, colr, smoothstep(0.55 + ny * 0.3 + nx * 0.25))) };
      const gap = gapAt(y0 + 0.02) > 0.01 ? gapAt(y0 + 0.02) + 0.06 : 0;
      const spans = gap > 0 ? [[left, -gap], [gap, right]] : [[left, right]];
      for (const [z0, z1] of spans) {
        if (z1 - z0 < 0.2) continue;
        b.add(roundedBoxG(dep, y1 - y0 + 0.02, z1 - z0, 0.1), cf, { p: [front - dep / 2, yc, (z0 + z1) / 2] });
      }
    }
    // Grasbüschel oben
    for (let i = 0; i < 4; i++) b.add(displace(new THREE.IcosahedronGeometry(0.3, 1), 0.06, 4, i, false), (x, y, z, nx, ny) => (ny > 0.2 ? CANYON.grass : CANYON.grassDark), { p: [-0.5, nb * band + 0.05, (i - 1.5) * wallW * 0.2], s: [1.2, 0.6, 1.2] });
    // dunkler Gang nach hinten (halbe Röhre + Boden), Verlauf schwarz
    const tl = 2.5;
    const tun = new THREE.CylinderGeometry(hw * 0.98, hw * 0.98, tl, 14, 1, true, 0, Math.PI);
    tun.rotateZ(Math.PI / 2);
    const tg = new Build();
    tg.add(tun, { v: (x) => mix(HO.dark, 0x3a1a0c, smoothstep((x + tl / 2) / tl)) }, { p: [-tl / 2 - 0.05, hs, 0], s: [1, 0.6, 1] });
    tg.box(tl, 0.05, W * 0.98, { v: (x) => mix(HO.dark, 0x4a2a14, smoothstep((x + tl / 2) / tl)) }, { p: [-tl / 2 - 0.05, 0.02, 0] }, 0, 1);
    for (const s of [1, -1]) tg.box(tl, hs, 0.05, { v: (x) => mix(HO.dark, 0x3a1a0c, smoothstep((x + tl / 2) / tl)) }, { p: [-tl / 2 - 0.05, hs / 2, s * hw * 0.98] }, 0, 1);
    tg.box(0.05, Hh + 0.2, W + 0.2, HO.dark, { p: [-tl - 0.05, Hh / 2, 0] }, 0, 1);
    b.parts.push(tg.geometry());
    // Felsbuckel hinter der Wand, der den Gang umschließt (von hinten kein schwarzer Kasten)
    const bl = tl + 0.45 - D + 0.2;
    b.add(displace(new THREE.BoxGeometry(bl, Hh + 0.6, W + 1.2, 3, 4, 4), 0.12, 1.4, W + 3, false),
      (x, y, z, nx, ny) => (ny > 0.75 ? CANYON.grass : strataColor(y + (Hh + 0.6) / 2, x, z, { band: 0.6, seed: 2 })), { p: [-D + 0.1 - bl / 2, (Hh + 0.6) / 2, 0] });
    // Stollen-Holzrahmen vorn
    const woodV = { v: (x, y, z, nx, ny) => mix(HO.woodDark, HO.wood, smoothstep(nx * 0.5 + 0.5)) };
    for (const s of [1, -1]) b.box(0.28, hs + 0.2, 0.28, woodV, { p: [0.32, (hs + 0.2) / 2, s * (hw - 0.05)] }, 0.04, 1);
    b.box(0.32, 0.3, W + 0.5, woodV, { p: [0.32, hs + 0.25, 0] }, 0.04, 1);
    for (const s of [1, -1]) b.box(0.18, 1.0, 0.18, woodV, { p: [0.32, hs - 0.3, s * (hw - 0.45)], r: [s * 0.75, 0, 0] }, 0.03, 1);
    for (const z of [-hw + 0.2, hw - 0.2, -0.4, 0.4]) b.sphere(0.035, HO.nail, { p: [0.49, hs + 0.25, z] }, 6, 4);
    // Schild über der Öffnung: Ameisen-Helm
    const sy = Hh + 0.6;
    b.box(0.08, 0.7, 1.2, HO.sign, { p: [0.6, sy, 0] }, 0.05, 1);
    b.add(new THREE.SphereGeometry(0.24, 14, 8, 0, TAU, 0, Math.PI / 2), 0xffc21a, { p: [0.65, sy - 0.12, 0], s: [0.3, 1, 1] });
    b.box(0.04, 0.05, 0.56, 0xe8283a, { p: [0.68, sy - 0.1, 0] }, 0, 1);
    for (const s of [1, -1]) b.tube([[0.67, sy + 0.05, s * 0.1], [0.68, sy + 0.2, s * 0.2], [0.68, sy + 0.25, s * 0.3]], 0.02, HO.signInk, null, 6, 4);
    for (const s of [1, -1]) b.box(0.05, 0.6, 0.05, HO.woodDark, { p: [0.5, sy + 0.25, s * 0.45], r: [s * 0.4, 0, 0] }, 0, 1);
    return b.geometry();
  });
}
function buildAmeisenhoehle(opts = {}) {
  const W = clamp(Math.round((opts.width ?? 3.2) * 4) / 4, 1, 12), Hh = clamp(Math.round((opts.height ?? 2.4) * 4) / 4, 1, 12);
  const root = new THREE.Group();
  const m = mesh(hoehleGeo(W, Hh), vcol(0.85, {}, 'w4canyonDS'), {}, true);
  m.receiveShadow = true;
  root.add(m);
  root.userData.opening = { width: W, height: Hh };
  return makeModel('ameisenhoehle', root, () => {});
}

// =============================================================================================
// Giftpilz
// =============================================================================================
function buildGiftpilz(opts = {}) {
  const H = clamp(Math.round((opts.height ?? 2) * 4) / 4, 0.3, 12);
  const root = new THREE.Group();
  const sway = joint();
  const geos = giftpilzGeos(false), mats = giftpilzMats();
  const body = mesh(geos.body, mats.body, {}, true);
  const glow = mesh(geos.glow, mats.glow);
  sway.add(body, glow);
  sway.scale.setScalar(H / 2);
  root.add(sway);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    const k = anim === 'shake' ? Math.max(0, 1 - age / 0.8) : 0;
    sway.rotation.set(Math.sin(t * 1.1) * 0.02 + Math.sin(age * 30) * 0.1 * k, 0, Math.cos(t * 0.9) * 0.02 + Math.cos(age * 26) * 0.1 * k);
  };
  return makeModel('giftpilz', root, update);
}

// =============================================================================================
// Giftbaum (verdreht)
// =============================================================================================
/** Verjüngte Röhre entlang Punkten (Radius r0 → r1), Rinde mit gedrehten Streifen. */
function taperTube(b, pts, r0, r1, colorFn, seg = 18, rs = 8) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  const g = new THREE.TubeGeometry(curve, seg, 1, rs, false);
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const s = Math.floor(i / (rs + 1)) / seg;
    const c = curve.getPointAt(Math.min(1, s));
    const r = r0 + (r1 - r0) * s;
    P.setXYZ(i, c.x + (P.getX(i) - c.x) * r, c.y + (P.getY(i) - c.y) * r, c.z + (P.getZ(i) - c.z) * r);
  }
  g.computeVertexNormals();
  b.add(g, colorFn);
}
function giftbaumGeo(H) {
  return cached(`w4:giftbaum:${H}`, () => {
    const b = new Build();
    const k = H / 5;
    const bark = { v: (x, y, z) => (Math.sin(Math.atan2(z, x) * 3 + y * 2.2) > 0.4 ? GIFT.barkHi : mix(GIFT.barkLow, GIFT.bark, smoothstep(y / H))) };
    // gedrehter Stamm (Spirale) und Wurzeln
    const trunk = [];
    for (let i = 0; i <= 6; i++) { const t = i / 6; trunk.push([Math.sin(t * 5) * 0.35 * k, t * H * 0.72, Math.cos(t * 4) * 0.25 * k - 0.25 * k]); }
    taperTube(b, trunk, 0.42 * k, 0.16 * k, bark, 20, 9);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.5;
      taperTube(b, [[0, 0.35 * k, -0.25 * k], [Math.cos(a) * 0.5 * k, 0.12 * k, Math.sin(a) * 0.5 * k - 0.25 * k], [Math.cos(a) * 0.9 * k, -0.05, Math.sin(a) * 0.9 * k - 0.25 * k]], 0.17 * k, 0.05 * k, bark, 6, 6);
    }
    // zwei gebogene Äste
    const top = trunk[trunk.length - 1];
    const br = [[top, [top[0] + 0.8 * k, top[1] + 0.5 * k, top[2] + 0.2 * k], [top[0] + 1.5 * k, top[1] + 0.3 * k, top[2] + 0.5 * k]],
      [[trunk[4][0], trunk[4][1], trunk[4][2]], [trunk[4][0] - 0.7 * k, trunk[4][1] + 0.6 * k, trunk[4][2] - 0.3 * k], [trunk[4][0] - 1.3 * k, trunk[4][1] + 0.5 * k, trunk[4][2] - 0.2 * k]]];
    for (const p of br) taperTube(b, p, 0.14 * k, 0.05 * k, bark, 8, 6);
    // Kronenballen (petrol/violett) und Moosfäden
    const blobs = [[top[0], top[1] + 0.6 * k, top[2], 1.1], [top[0] + 1.4 * k, top[1] + 0.45 * k, top[2] + 0.5 * k, 0.8], [trunk[4][0] - 1.3 * k, trunk[4][1] + 0.7 * k, trunk[4][2] - 0.2 * k, 0.75], [top[0] - 0.5 * k, top[1] + 0.9 * k, top[2] - 0.5 * k, 0.7]];
    blobs.forEach(([x, y, z, r], i) => {
      b.add(displace(new THREE.IcosahedronGeometry(r * k, 2), 0.12 * k, 1.8 / k, i * 2, false), (xx, yy, zz, nx, ny) => (ny > 0.35 ? (i % 2 ? GIFT.leafHi : GIFT.leaf2) : GIFT.leafLow), { p: [x, y, z], s: [1, 0.78, 1] });
      for (let j = 0; j < 3; j++) {
        const a = j * 2.1 + i, len = (0.5 + hash1(i * 7 + j) * 0.7) * k;
        b.add(new THREE.ConeGeometry(0.06 * k, len, 5), GIFT.moss, { p: [x + Math.cos(a) * r * 0.7 * k, y - r * 0.55 * k - len / 2, z + Math.sin(a) * r * 0.7 * k], r: [Math.PI, 0, 0] });
      }
    });
    return b.geometry();
  });
}
function buildGiftbaum(opts = {}) {
  const H = clamp(Math.round((opts.height ?? 5) * 2) / 2, 1.5, 20);
  const root = new THREE.Group();
  const sway = joint();
  const m = mesh(giftbaumGeo(H), vcol(0.7, {}, 'w4gift'), {}, true);
  sway.add(m);
  root.add(sway);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const s = clamp(Number(st.sway ?? 0.3), 0, 1), t = clk.t;
    sway.rotation.set(Math.sin(t * 0.9) * 0.015 * s, 0, Math.sin(t * 0.7 + 1) * 0.02 * s);
  };
  return makeModel('giftbaum', root, update);
}

// =============================================================================================
// Liane (Ursprung oben)
// =============================================================================================
function lianeGeo(L) {
  return cached(`w4:liane:${L}`, () => {
    const b = new Build();
    const n = Math.max(3, Math.round(L * 2));
    const pts = [];
    for (let i = 0; i <= n; i++) { const t = i / n; pts.push([Math.sin(t * 5) * 0.12, -t * L, Math.cos(t * 3.5) * 0.1 - 0.1]); }
    taperTube(b, pts, 0.06, 0.035, { v: (x, y) => mix(GIFT.vine, GIFT.vineHi, smoothstep(Math.sin(y * 6) * 0.5 + 0.5)) }, n * 4, 6);
    // Blätter abwechselnd
    for (let i = 1; i < n * 2; i++) {
      const t = i / (n * 2), s = i % 2 ? 1 : -1;
      const p = new THREE.Vector3(Math.sin(t * 5) * 0.12, -t * L, Math.cos(t * 3.5) * 0.1 - 0.1);
      const g = new THREE.SphereGeometry(1, 10, 6); g.scale(0.07, 0.015, 0.16); g.translate(0, 0, 0.16);
      b.add(g, { v: (x, y, z) => mix(GIFT.leafLow, GIFT.vineLeaf, smoothstep(z / 0.32 + 0.2)) }, placed(p, new THREE.Vector3(s * 0.4, -0.5, s).normalize(), new THREE.Vector3(1, 1, 1)));
    }
    b.sphere(0.09, GIFT.vineLeaf, { p: [Math.sin(5) * 0.12, -L - 0.05, Math.cos(3.5) * 0.1 - 0.1], s: [1, 1.3, 1] }, 10, 8);
    return b.geometry();
  });
}
function buildLiane(opts = {}) {
  const L = clamp(Math.round((opts.length ?? 3) * 4) / 4, 0.5, 20);
  const root = new THREE.Group();
  const swing = joint();
  swing.add(mesh(lianeGeo(L), vcol(0.6, {}, 'w4gift'), {}, true));
  root.add(swing);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const s = clamp(Number(st.sway ?? 0.3), 0, 1), t = clk.t;
    swing.rotation.set(Math.sin(t * 1.3) * 0.12 * s, 0, Math.sin(t * 1.0 + 0.5) * 0.18 * s);
  };
  return makeModel('liane', root, update);
}

// =============================================================================================
// Giftwasserfall
// =============================================================================================
function fallSheetGeo(W, H) {
  return cached(`w4:fall:sheet:${W}:${H}`, () => {
    // gewölbter Vorhang: oben über die Kante gebogen, unten senkrecht; UV v läuft von oben (0) nach unten (H/1,5)
    const g = new THREE.PlaneGeometry(W, H, 8, 10);
    const P = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i) + H / 2;
      const u = x / W;
      const bulge = Math.cos(u * Math.PI) * 0.18;
      const lip = Math.max(0, (y - (H - 0.6)) / 0.6);
      P.setXYZ(i, bulge + lip * lip * -0.5 + 0.15, y, x);
      uv.setXY(i, uv.getX(i) * W / 1.5, uv.getY(i) * H / 1.5);
    }
    g.computeVertexNormals();
    return g;
  });
}
const FALL_STYLE = {
  gift: { base: '#8a3ae0', hi: 'rgba(230,190,255,0.85)', dark: 'rgba(50,10,110,0.55)', foam: 0xe8d0ff, rock: [0x3a2a4a, 0x6a5a7a], emissive: 0x3a0a6a },
};
function buildGiftwasserfall(opts = {}) {
  const W = clamp(Math.round((opts.width ?? 3) * 2) / 2, 0.5, 30), H = clamp(Math.round((opts.height ?? 5) * 2) / 2, 1, 40);
  const S = FALL_STYLE.gift;
  const root = new THREE.Group();
  const sheet = mesh(fallSheetGeo(W, H), std('w4:giftFall', { map: fallTexture('gift', S.base, S.hi, S.dark), emissive: S.emissive, emissiveIntensity: 0.6, roughness: 0.15, side: THREE.DoubleSide }));
  const lip = mesh(cached(`w4:fall:lip:${W}`, () => new Build().add(displace(new THREE.BoxGeometry(1.1, 0.7, W + 0.8, 2, 2, 4), 0.12, 2, W, false), { v: (x, y, z, nx, ny) => mix(S.rock[0], S.rock[1], smoothstep(ny * 0.5 + 0.5)) }).geometry()),
    vcol(0.8, {}, 'w4rock2'), { p: [-0.35, H + 0.05, 0] }, true);
  const nf = Math.max(4, Math.round(W * 3));
  const foam = instMesh(cached('w4:fall:foam', () => new THREE.IcosahedronGeometry(1, 1)), std('w4:giftFoam', { color: S.foam, roughness: 0.6, emissive: 0x3a1a5a }), nf, W + 2, 0.3);
  root.add(sheet, lip, foam);
  const seeds = Array.from({ length: nf }, (_, i) => ({ z: ((i + 0.5) / nf - 0.5) * W * 0.95, ph: hash1(i) * TAU, r: 0.18 + hash1(i + 3) * 0.16 }));
  const update = () => {
    const now = performance.now() / 1000;
    sheet.material.map.offset.y = (now * 1.1) % 1;
    for (let i = 0; i < nf; i++) {
      const sd = seeds[i];
      const k = (now * 1.6 + sd.ph) % 1;
      setInst(foam, i, 0.3 + k * 0.5, 0.05 + Math.sin(k * Math.PI) * 0.25, sd.z + Math.sin(sd.ph + now) * 0.1, 0, 0, 0, sd.r * (1 - k * 0.6));
    }
    foam.instanceMatrix.needsUpdate = true;
  };
  return makeModel('giftwasserfall', root, update, [foam]);
}

export const MODELS = {
  tafelberg: buildTafelberg,
  canyon_bogen: buildCanyonBogen,
  felsnadel: buildFelsnadel,
  ameisenhuegel: buildAmeisenhuegel,
  ameisenhoehle: buildAmeisenhoehle,
  giftpilz: buildGiftpilz,
  giftbaum: buildGiftbaum,
  liane: buildLiane,
  giftwasserfall: buildGiftwasserfall,
};
