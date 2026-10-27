// Kürbisfeld-Kulisse der Halloween-Welt „Kürbisinsel“ (H-1, H-2, Karte). Eigene Gestaltung. Maßstab Meter, Ursprung =
// Mitte der Unterseite (Ausnahmen genannt), Vorderseite +X; state darf ein String sein. Ohne Kollision.
// Kulisse: schlichte Materialien (kein Spielzeug-Look: kulMat/kulisse()), vertexgefärbt und backbar (bakeModel) –
// Leuchtendes (geschnitzte Gesichter, Kerzen) unbeleuchtet; Schein-Sprites werden beim Backen ausgelassen.
//
// kuerbis            Kürbis in Größen und Formen, mit und ohne Gesicht.
//                    opts { size (Ø in m, 1), shape: 'rund'|'flach'|'hoch'|'dick', color: 'orange'|'gelb'|'weiss'|'gruen'|'rot',
//                           face: false | 'lachen'|'grinsen'|'staunen'|'frech', lit (bool: Gesicht leuchtet; Standard true
//                           mit Gesicht), leaf: true (Blatt am Stiel), seed (Zahl, kleine Abwandlung) }
//                    state { flicker (0..1, Standard 1: Licht flackert) }   Viele → createInstanced('kuerbis', n, opts).
// kuerbislaterne     leuchtende Kürbislaterne (Ø 0,7 m, Gesicht 'lachen') mit Schein.
//                    opts { mount: 'boden' | 'pfahl' (Holzpfahl mit Querholz, Laterne hängt in 1,6 m) | 'haengend' (Ursprung =
//                           Haken oben, hängt an Kette nach −Y), size (Ø, 0,7), face ('lachen'), color }
//                    state { lit (bool | 0..1, Standard true), sway (0..1 Pendeln bei 'haengend'/'pfahl') }
// vogelscheuche      freundliche Vogelscheuche ≈2,2 m: Holzkreuz, Kürbiskopf mit Lachgesicht und Schlapphut, kariertes
//                    Flickenhemd, Strohbüschel an Ärmeln und Kragen, Krähe mit Schleife auf dem Arm.
//                    opts { size (Faktor, 1) }  state { sway (0..1 leichtes Wiegen im Wind) }
// strohballen        Strohballen: opts { kind: 'eckig' (1,2 × 0,6 × 0,7, zwei Schnüre) | 'rund' (Rolle Ø 1,2, liegt auf der
//                    Seite, Achse z), size (Faktor, 1) }  state –
// maisstaude         Büschel Maisstauden ≈2 m: drei bis fünf Stängel, lange gebogene Blätter, Kolben mit Hüllblättern,
//                    Rispen oben (herbstlich gelbgrün).  opts { count (4), height (2) }  state { sway (0..1) }
//                    Viele → createInstanced('maisstaude', n).
// suessigkeiten_haufen  Haufen Süßigkeiten (Ø ≈1,2 m): Bonbons, Lollis, Zuckermais, Schokoriegel auf einem Kegel aus
//                    bunten Bonbonkugeln.  opts { size (Faktor, 1), seed }  state –

import { THREE, TAU, Build, cached, mesh, joint, makeModel, Clock, damp, clamp, mix, smoothstep, glowSprite } from '../lib/kit.js';
import {
  HW, PK, PK_COLORS, pkSurf, pumpkinGeo, stemGeo, leafGeo, tendrilGeo, addFace, glow, kulMat, kulisse, ownMat, noToy,
  candyGeo, CANDY_KINDS, hash1, noise3, gradV, puffyGeo, memo, taperTube, pkPoint, vcol,
} from '../lib/hwGeos.js';

// =============================================================================================
// Kürbis (Einzelmodell und Geometrie für die Instanz-Variante)
// =============================================================================================
/** Kürbis-Geometrien { body, glow|null, h } (Mitte der Unterseite im Ursprung, Ø 1 m). */
export function kuerbisGeos(shape = 'rund', color = 'orange', face = false, lit = true, leaf = true, lo = false, seed = 0) {
  return memo(`hw:kuerbis:${shape}:${color}:${face}:${lit}:${leaf}:${lo}:${seed}`, () => {
    const P0 = PK[shape] ?? PK.rund;
    const P = { ...P0, R: 0.5, Hh: P0.Hh / P0.R * 0.5 };
    const C = PK_COLORS[color] ?? PK_COLORS.orange;
    const b = new Build(), gl = new Build();
    b.parts.push(pumpkinGeo(P, C, lo || 'mid'));
    const surf = pkSurf(P);
    if (face) addFace(b, gl, surf, { kind: face, az: 0, el: 0.0, w: 0.78, h: P.Hh * 1.1 + 0.16, lit, sub: lo ? 1 : 2, flesh: color === 'weiss' ? 0xfff8e8 : HW.pkFlesh });
    const top = surf(0, 1.35).p.y;
    const stem = stemGeo(P.Hh * 0.45 + 0.04, 0.05, lo, 0.4 + hash1(seed) * 0.4).clone();
    stem.rotateY(hash1(seed + 1) * TAU);
    stem.translate(0, top - 0.03, 0);
    b.parts.push(stem);
    if (leaf && !lo) {
      const lf = leafGeo(0.3, true, 0.35).clone();
      lf.rotateZ(-0.35); lf.rotateY(2.2 + hash1(seed + 2));
      lf.translate(0, top + 0.03, 0);
      b.parts.push(lf);
      b.parts.push(tendrilGeo(0.06, 1.5, 0.01).clone().rotateY(hash1(seed + 3) * TAU).translate(0.02, top + 0.04, 0.03));
    }
    const body = b.geometry();
    const lowY = -P.Hh * P.bottom + 0.012;
    body.translate(0, -lowY, 0);
    let g = null;
    if (gl.parts.length) { g = gl.geometry(); g.translate(0, -lowY, 0); }
    body.computeBoundingBox();
    return { body, glow: g, h: body.boundingBox.max.y };
  });
}
function buildKuerbis(opts = {}) {
  const size = clamp(Number(opts.size ?? 1), 0.2, 8);
  const face = opts.face ? (typeof opts.face === 'string' ? opts.face : 'lachen') : false;
  const lit = face ? opts.lit !== false : false;
  const G = kuerbisGeos(opts.shape ?? 'rund', opts.color ?? 'orange', face, lit, opts.leaf !== false, false, (opts.seed ?? 0) % 4);
  const root = new THREE.Group();
  const s = joint(); s.scale.setScalar(size);
  const body = mesh(G.body, kulMat(0.45), {}, true);
  body.receiveShadow = true;
  s.add(body);
  const own = [];
  let glowM = null, halo = null;
  if (G.glow) {
    const gm = noToy(ownMat(glow()));
    own.push(gm);
    glowM = mesh(G.glow, gm);
    halo = glowSprite(0xffa030, 1.1, 0.32); halo.position.set(0.45, G.h * 0.45, 0);
    s.add(glowM, halo);
  }
  root.add(s);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    if (!glowM) return;
    const f = st.flicker ?? 1, t = clk.t;
    const k = 0.9 + (Math.sin(t * 9.1) * 0.05 + Math.sin(t * 14.7) * 0.05) * f;
    glowM.material.color.setScalar(k);
    halo.scale.setScalar(1.05 + (k - 0.9) * 2);
  };
  return makeModel('kuerbis', kulisse(root), update, own);
}

// =============================================================================================
// Kürbislaterne
// =============================================================================================
const WOODV = { v: (x, y, z, nx, ny) => mix(HW.woodLow, HW.woodHi, smoothstep(nx * 0.3 + ny * 0.3 + 0.35 + noise3(x * 4, y * 4, z * 4) * 0.3)) };
const IRONV = { v: (x, y, z, nx, ny) => mix(0x221a30, 0x5a4e78, smoothstep(ny * 0.5 + nx * 0.25 + 0.35)) };
function laternePostGeo() {
  return cached('hw:kl:post', () => {
    const b = new Build();
    b.add(taperTube([[0, 0, 0], [0.04, 0.9, 0.02], [-0.02, 1.95, 0]], (t) => 0.09 - t * 0.025, 10, 8), WOODV);
    b.add(taperTube([[-0.05, 1.86, 0], [0.3, 1.92, 0], [0.62, 1.86, 0]], (t) => 0.055 - t * 0.015, 8, 6), WOODV);
    b.add(taperTube([[0.0, 1.55, 0], [0.18, 1.72, 0], [0.32, 1.88, 0]], 0.035, 6, 6), WOODV);
    b.sphere(0.12, HW.woodLow, { p: [0, 0.02, 0], s: [1.2, 0.3, 1.2] }, 10, 6);
    // Haken und Kettchen am Armende
    b.torus(0.035, 0.01, IRONV, { p: [0.56, 1.8, 0], r: [0, Math.PI / 2, 0] }, 4, 10);
    b.cyl(0.008, 0.008, 0.14, IRONV, { p: [0.56, 1.71, 0] }, 4);
    return b.geometry();
  });
}
const bailGeo = (r) => cached(`hw:kl:bail:${r}`, () => new Build().torus(r, 0.012, IRONV, { r: [0, Math.PI / 2, 0] }, 4, 16, Math.PI).geometry());
function buildKuerbislaterne(opts = {}) {
  const size = clamp(Number(opts.size ?? 0.7), 0.2, 3);
  const mount = ['boden', 'pfahl', 'haengend'].includes(opts.mount) ? opts.mount : 'boden';
  const G = kuerbisGeos(opts.shape ?? 'rund', opts.color ?? 'orange', opts.face ?? 'lachen', true, false, false, 1);
  const root = new THREE.Group();
  const own = [];
  const hang = joint();                 // Aufhängepunkt (pendelt)
  const pk = joint(); pk.scale.setScalar(size);
  const gm = noToy(ownMat(glow()));
  own.push(gm);
  const glowM = mesh(G.glow, gm);
  pk.add(mesh(G.body, kulMat(0.45), {}, true), glowM);
  const halo = glowSprite(0xffa030, 1.6 * size + 0.4, 0.5);
  halo.position.set(0.25 * size, G.h * size * 0.45, 0);
  if (mount === 'boden') root.add(pk, halo);
  else {
    // Kürbis hängt am Bügel unter dem Aufhängepunkt
    const H = G.h * size;
    pk.position.y = -0.14 - H;
    halo.position.y = pk.position.y + H * 0.45;
    hang.add(pk, halo, mesh(bailGeo(size * 0.42), kulMat(0.45), { p: [0, -0.14 - H * 0.12, 0], s: [1, 0.5, 1] }));
    if (mount === 'pfahl') {
      root.add(mesh(laternePostGeo(), kulMat(0.6), {}, true));
      hang.position.set(0.56, 1.64, 0);
    } else {
      hang.add(mesh(cached('hw:kl:chain', () => new Build().cyl(0.01, 0.01, 0.14, 0x3a3050, { p: [0, -0.07, 0] }, 4).geometry()), kulMat(0.45)));
    }
    root.add(hang);
  }
  const clk = new Clock();
  let k = 1;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t = clk.t;
    k = damp(k, st.lit === undefined ? 1 : st.lit === true ? 1 : st.lit === false ? 0 : clamp(Number(st.lit) || 0, 0, 1), 8, dt);
    const fl = 0.9 + Math.sin(t * 9.1) * 0.05 + Math.sin(t * 14.7) * 0.05;
    gm.color.setScalar(0.15 + k * fl * 0.85);
    halo.visible = k > 0.05;
    halo.scale.setScalar((1.6 * size + 0.4) * k * (0.95 + (fl - 0.9)));
    const sw = (st.sway ?? 0) * 0.15;
    hang.rotation.set(Math.sin(t * 1.3) * sw, 0, Math.sin(t * 1.7) * sw * 1.4);
  };
  return makeModel('kuerbislaterne', kulisse(root), update, own);
}

// =============================================================================================
// Vogelscheuche
// =============================================================================================
const VS = { shirtA: 0xd8402a, shirtB: 0xff8a3a, shirtLine: 0x6a1a10, patchA: 0x8a4ae0, patchB: 0x4ab8ff, pants: 0x4a5aa8, hat: 0x8a5a2a, hatHi: 0xc8905a, hatLow: 0x5a3418, crow: 0x2a2038, crowHi: 0x5a4a78, beak: 0xffa020 };
const plaid = (x, y, z) => { const a = (Math.floor(y * 9) + Math.floor((x + z) * 9)) % 2; const line = Math.abs(((y * 9) % 1) - 0.5) < 0.08 || Math.abs((((x + z) * 9 + 50) % 1) - 0.5) < 0.08; return line ? VS.shirtLine : a ? VS.shirtA : VS.shirtB; };
function scarecrowGeo() {
  return cached('hw:vs:body', () => {
    const b = new Build();
    // Pfahl und Querholz
    b.add(taperTube([[0, 0, 0], [0.02, 1.0, 0], [0, 1.95, 0]], 0.06, 8, 7), WOODV);
    b.add(taperTube([[0, 1.48, -0.95], [0, 1.52, 0], [0, 1.46, 0.95]], 0.045, 8, 6), WOODV);
    // Hemd: Rumpf (kariert) mit Ärmeln entlang des Querholzes, Flicken
    b.sphere(1, plaid, { p: [0, 1.25, 0], s: [0.22, 0.38, 0.3] }, 20, 14);
    for (const s of [1, -1]) {
      b.add(taperTube([[0, 1.5, s * 0.15], [0, 1.5, s * 0.5], [0, 1.47, s * 0.8]], (t) => 0.11 - t * 0.02, 8, 10), plaid);
      // Strohbüschel an den Ärmeln
      for (let i = 0; i < 5; i++) b.cone(0.025, 0.16, i % 2 ? HW.strawHi : HW.straw, { p: [Math.sin(i * 1.3) * 0.04, 1.46 + Math.cos(i * 1.7) * 0.04, s * 0.92], r: [s * (Math.PI / 2 + (i - 2) * 0.25), 0, (i - 2) * 0.2] }, 5);
    }
    b.box(0.02, 0.12, 0.12, VS.patchA, { p: [0.21, 1.2, 0.08], r: [0, 0, 0.2] }, 0.02, 1);
    b.box(0.02, 0.1, 0.1, VS.patchB, { p: [0.2, 1.38, -0.12], r: [0.3, 0, 0] }, 0.02, 1);
    // Hose (Latzhose) und Strohfüße unten
    b.sphere(1, VS.pants, { p: [0, 0.98, 0], s: [0.21, 0.16, 0.28] }, 16, 10);
    for (let i = 0; i < 7; i++) b.cone(0.03, 0.2, i % 2 ? HW.strawHi : HW.straw, { p: [Math.cos(i) * 0.12, 0.84, Math.sin(i) * 0.2], r: [Math.PI + Math.sin(i) * 0.4, 0, Math.cos(i) * 0.4] }, 5);
    // Strohkragen
    for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; b.cone(0.03, 0.15, i % 2 ? HW.strawHi : HW.straw, { p: [Math.cos(a) * 0.14, 1.6, Math.sin(a) * 0.18], r: [Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1] }, 5); }
    return b.geometry();
  });
}
const scarecrowHeadGeos = () => memo('hw:vs:head', () => {
  const P = { R: 0.27, Hh: 0.22, ribs: 8, depth: 0.12, dimple: 0.2, bottom: 0.9 };
  const b = new Build(), gl = new Build();
  b.parts.push(pumpkinGeo(P, PK_COLORS.orange));
  addFace(b, gl, pkSurf(P), { kind: 'lachen', az: 0, el: 0, w: 0.6, h: 0.42, lit: false });
  // Schlapphut (breite, weiche Krempe, zerknautschter Kegel) mit Flicken-Band
  const hat = new Build();
  const bp = [[0, 0.0], [0.42, -0.01], [0.48, -0.04], [0.47, -0.02], [0.4, 0.02], [0, 0.03]];
  const br = new THREE.LatheGeometry(bp.map(([r, y]) => new THREE.Vector2(r, y)), 32);
  const Pb = br.attributes.position;
  for (let i = 0; i < Pb.count; i++) { const a = Math.atan2(Pb.getZ(i), Pb.getX(i)), r = Math.hypot(Pb.getX(i), Pb.getZ(i)); Pb.setY(i, Pb.getY(i) - Math.max(0, Math.cos(a + 2.4)) * 0.08 * r / 0.45 + Math.sin(a * 3) * 0.015); }
  br.computeVertexNormals();
  hat.add(br, { v: (x, y, z, nx, ny) => mix(VS.hatLow, VS.hat, smoothstep(ny * 0.6 + 0.4)) });
  hat.lathe([[0.22, 0.0], [0.2, 0.12], [0.15, 0.24], [0.08, 0.28], [0, 0.29]], { v: (x, y, z, nx, ny) => mix(VS.hat, VS.hatHi, smoothstep(ny * 0.5 + nx * 0.3)) }, null, 20);
  hat.cyl(0.215, 0.22, 0.05, 0xff8a1a, { p: [0, 0.035, 0] }, 20);
  hat.box(0.02, 0.06, 0.06, VS.patchA, { p: [0.2, 0.16, 0.05], r: [0, 0, -0.4] }, 0.01, 1);
  const hg = hat.geometry();
  const top = pkPoint(P, 0, 1.3).p.y;
  hg.rotateZ(0.15); hg.rotateX(-0.12); hg.translate(-0.03, top - 0.04, 0);
  b.parts.push(hg);
  return { body: b.geometry(), glow: gl.parts.length ? gl.geometry() : null };
});
const crowGeo = () => cached('hw:vs:crow', () => {
  const b = new Build();
  b.sphere(1, { v: (x, y, z, nx, ny) => mix(VS.crow, VS.crowHi, smoothstep(ny * 0.6 + 0.4)) }, { p: [0, 0.1, 0], s: [0.12, 0.1, 0.09] }, 16, 10);
  b.sphere(0.075, { v: (x, y, z, nx, ny) => mix(VS.crow, VS.crowHi, smoothstep(ny * 0.6 + 0.4)) }, { p: [0.09, 0.2, 0] }, 14, 10);
  b.cone(0.028, 0.08, VS.beak, { p: [0.18, 0.2, 0], r: [0, 0, -Math.PI / 2] }, 8);
  for (const s of [1, -1]) {
    b.sphere(1, 0xffffff, { p: [0.14, 0.23, s * 0.035], s: [0.022, 0.028, 0.02] }, 10, 6);
    b.sphere(1, 0x14101c, { p: [0.155, 0.23, s * 0.036], s: [0.012, 0.018, 0.012] }, 8, 6);
    b.sphere(1, VS.crowHi, { p: [-0.02, 0.11, s * 0.08], s: [0.09, 0.05, 0.025], r: [0, 0, 0.3] }, 10, 6);
    b.sphere(1, 0xff6aa8, { p: [0.07, 0.15, s * 0.055], s: [0.03, 0.022, 0.03] }, 8, 6);
  }
  b.cone(0.05, 0.12, VS.crow, { p: [-0.15, 0.09, 0], r: [0, 0, Math.PI / 2 + 0.3] }, 6);
  for (const s of [1, -1]) b.cyl(0.008, 0.008, 0.05, VS.beak, { p: [0, 0.01, s * 0.03] }, 4);
  return b.geometry();
});
function buildVogelscheuche(opts = {}) {
  const size = clamp(Number(opts.size ?? 1), 0.3, 4);
  const root = new THREE.Group();
  const sj = joint(); sj.scale.setScalar(size);
  const sway = joint();
  const body = mesh(scarecrowGeo(), kulMat(0.6), {}, true);
  const H = scarecrowHeadGeos();
  const head = joint([0, 1.86, 0], mesh(H.body, kulMat(0.45), {}, true));
  head.rotation.y = 0.15;
  const crow = mesh(crowGeo(), kulMat(0.4), { p: [0.0, 1.53, 0.6], r: [0, -0.4, 0] }, true);
  sway.add(body, head, crow);
  sj.add(sway);
  root.add(sj);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t = clk.t, s = st.sway ?? 0.3;
    sway.rotation.set(Math.sin(t * 0.9) * 0.03 * s, 0, Math.sin(t * 1.1) * 0.025 * s);
    head.rotation.z = Math.sin(t * 1.3 + 1) * 0.08 * s;
    crow.rotation.z = Math.max(0, Math.sin(t * 2.3)) * 0.25;
  };
  return makeModel('vogelscheuche', kulisse(root), update, []);
}

// =============================================================================================
// Strohballen
// =============================================================================================
const strawStripe = (u) => mix(HW.strawLow, HW.strawHi, clamp(0.5 + Math.sin(u * 47) * 0.25 + Math.sin(u * 13.3) * 0.2, 0, 1));
function baleGeo(kind) {
  return cached(`hw:bale:${kind}`, () => {
    const b = new Build();
    if (kind === 'rund') {
      // Rolle: Achse z, Spirale auf den Stirnseiten
      // Mantel: gewickelte Halme (Streifen quer zur Achse), Stirnseiten: Spirale
      b.add(new THREE.CylinderGeometry(0.6, 0.6, 1.0, 32, 14), (x, y, z, nx, ny) => (Math.abs(ny) > 0.6 ? strawStripe(Math.hypot(x, z) * 3.2 + Math.atan2(z, x) * 0.16) : strawStripe(y * 2.2 + Math.sin(Math.atan2(z, x) * 5) * 0.06)), { p: [0, 0.6, 0], r: [Math.PI / 2, 0, 0] });
      for (const s of [1, -1]) b.torus(0.6, 0.035, (x, y, z) => strawStripe(x * 9 + y * 7), { p: [0, 0.6, s * 0.5], r: [0, 0, 0] }, 6, 32);
      for (const z of [-0.25, 0.25]) b.torus(0.605, 0.012, 0xc85a1a, { p: [0, 0.6, z] }, 4, 32);
      return b.geometry();
    }
    b.box(1.2, 0.6, 0.7, { v: (x, y, z, nx, ny, nz) => { const u = Math.abs(nx) > 0.6 ? z * 3 + y : Math.abs(nz) > 0.6 ? x * 2 + y * 0.4 : x * 2 + z * 0.3; return mix(strawStripe(u + y * 9), HW.strawLow, Math.abs(ny) < 0.3 ? 0.15 : 0); } }, { p: [0, 0.3, 0] }, 0.09, 3);
    for (const x of [-0.32, 0.32]) b.box(0.03, 0.62, 0.72, 0xc85a1a, { p: [x, 0.3, 0] }, 0.012, 1);
    // abstehende Halme
    for (let i = 0; i < 10; i++) b.cone(0.012, 0.12, HW.strawHi, { p: [(hash1(i) - 0.5) * 1.1, 0.6, (hash1(i * 3) - 0.5) * 0.6], r: [hash1(i * 5) - 0.5, 0, hash1(i * 7) - 0.5] }, 4);
    return b.geometry();
  });
}
function buildStrohballen(opts = {}) {
  const kind = opts.kind === 'rund' ? 'rund' : 'eckig';
  const root = new THREE.Group();
  const m = mesh(baleGeo(kind), kulMat(0.85), {}, true);
  m.receiveShadow = true;
  m.scale.setScalar(clamp(Number(opts.size ?? 1), 0.3, 4));
  root.add(m);
  return makeModel('strohballen', kulisse(root), () => {}, []);
}

// =============================================================================================
// Maisstauden
// =============================================================================================
export function maisGeo(count = 4, height = 2, lo = false) {
  return cached(`hw:mais:${count}:${height}:${lo}`, () => {
    const b = new Build();
    const stalkV = (seed) => ({ v: (x, y) => mix(0x5a9a2a, mix(0xb8c04a, HW.straw, hash1(seed) * 0.6), smoothstep(y / height)) });
    const leafV = (seed) => ({ v: (x, y, z, nx, ny) => mix(mix(0x4a9a2a, 0xc8c050, hash1(seed * 3.1) * 0.8), HW.strawHi, smoothstep(y / height - 0.4) * 0.45) });
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + hash1(i) * 0.8, r = count > 1 ? 0.18 + hash1(i * 2) * 0.12 : 0;
      const x0 = Math.cos(a) * r, z0 = Math.sin(a) * r;
      const h = height * (0.8 + hash1(i * 4.3) * 0.3);
      const lean = (hash1(i * 6.1) - 0.5) * 0.25;
      b.add(taperTube([[x0, 0, z0], [x0 + lean * 0.3, h * 0.5, z0], [x0 + lean, h, z0 + lean * 0.3]], (t) => 0.05 - t * 0.032, lo ? 5 : 8, lo ? 4 : 6), stalkV(i));
      // Blätter: lange, gebogene Bänder (zweiseitig)
      const nl = lo ? 3 : 5;
      for (let k = 0; k < nl; k++) {
        const y0 = h * (0.18 + k * 0.15), ang = a + k * 2.2 + hash1(i * 9 + k) * 0.6;
        const len = 0.7 + hash1(i + k * 1.7) * 0.4;
        const g = new THREE.PlaneGeometry(len, 0.2, lo ? 4 : 8, 1);
        g.translate(len / 2, 0, 0);
        const P = g.attributes.position;
        for (let j = 0; j < P.count; j++) { const x = P.getX(j), t = x / len; P.setY(j, P.getY(j) * (1 - t * 0.8) + Math.sin(t * Math.PI * 0.9) * len * 0.35 - t * t * len * 0.5); P.setZ(j, P.getY(j) * 0.2); }
        g.rotateX(Math.PI / 2 - 0.3);
        g.computeVertexNormals();
        b.add(g, leafV(i * 7 + k), { p: [x0 + lean * y0 / h, y0, z0], r: [0, -ang, 0] });
      }
      // Kolben mit Hüllblättern (bei jedem zweiten Stängel), Rispe oben
      if (i % 2 === 0) {
        const yy = h * 0.55;
        b.sphere(1, { v: (x, y, z) => (Math.sin(y * 90) > 0 ? 0xffd23a : 0xffb81a) }, { p: [x0 + Math.cos(a) * 0.08, yy, z0 + Math.sin(a) * 0.08], s: [0.06, 0.15, 0.06], r: [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4] }, lo ? 8 : 10, lo ? 6 : 8);
        b.sphere(1, 0x8ab84a, { p: [x0 + Math.cos(a) * 0.05, yy - 0.06, z0 + Math.sin(a) * 0.05], s: [0.05, 0.1, 0.03], r: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5] }, lo ? 6 : 8, lo ? 4 : 6);
      }
      for (let k = 0; k < (lo ? 2 : 4); k++) b.cone(0.012, 0.22, HW.straw, { p: [x0 + lean, h + 0.08, z0 + lean * 0.3], r: [Math.sin(k * 1.6) * 0.5, 0, Math.cos(k * 1.6) * 0.5] }, 4);
    }
    return b.geometry();
  });
}
/** Zweiseitiges Kulissen-Material (Maisblätter). */
export const maisMat = () => vcol(0.7, { toy: false, side: THREE.DoubleSide }, 'hwkul2');
function buildMaisstaude(opts = {}) {
  const root = new THREE.Group();
  const sw = joint();
  const m = mesh(maisGeo(clamp(Math.round(opts.count ?? 4), 1, 8), clamp(Number(opts.height ?? 2), 0.5, 5)), maisMat(), {}, true);
  sw.add(m);
  root.add(sw);
  const clk = new Clock();
  const update = (dt, st) => { clk.tick(dt, 'idle'); const s = st.sway ?? 0.3; sw.rotation.set(Math.sin(clk.t * 1.2) * 0.04 * s, 0, Math.sin(clk.t * 0.9) * 0.05 * s); };
  return makeModel('maisstaude', kulisse(root), update, []);
}

// =============================================================================================
// Süßigkeiten-Haufen
// =============================================================================================
function heapGeo(seed = 0) {
  return cached(`hw:heap:${seed}`, () => {
    const b = new Build();
    // Kegel aus runden Bonbonkugeln (unten breit), oben einzelne Süßigkeiten
    let i = 0;
    for (let ring = 0; ring < 5; ring++) {
      const r = 0.55 - ring * 0.12, y = 0.07 + ring * 0.1, n = Math.max(1, Math.round(r * 18));
      for (let k = 0; k < n; k++, i++) {
        const a = (k / n) * TAU + ring * 0.4 + hash1(i + seed) * 0.3;
        b.sphere(0.075 + hash1(i * 3 + seed) * 0.02, HW.candy[(i + seed) % HW.candy.length], { p: [Math.cos(a) * r, y + hash1(i * 7) * 0.03, Math.sin(a) * r] }, 10, 7);
      }
    }
    const tops = [['lolli', [0.05, 0.62, 0.02], [0.3, 0.2, 0.1]], ['bonbon', [0.25, 0.42, 0.18], [0.2, 0.5, -0.3]], ['mais', [-0.2, 0.45, 0.15], [-0.4, 0.2, 0.3]], ['riegel', [0.1, 0.36, -0.3], [0.6, 1.2, 0.2]], ['bonbon', [-0.28, 0.3, -0.2], [0.1, 2.0, 0.4]], ['mais', [0.35, 0.22, -0.1], [-0.2, 0.9, -0.5]]];
    tops.forEach(([k, p, r], j) => {
      const g = candyGeo(k, (j + seed) % 6, true).clone();
      g.rotateX(r[0]); g.rotateY(r[1]); g.rotateZ(r[2]); g.translate(p[0], p[1], p[2]);
      b.parts.push(g);
    });
    return b.geometry();
  });
}
function buildSuessigkeitenHaufen(opts = {}) {
  const root = new THREE.Group();
  const m = mesh(heapGeo((opts.seed ?? 0) % 3), kulMat(0.25), {}, true);
  m.scale.setScalar(clamp(Number(opts.size ?? 1), 0.3, 5));
  root.add(m);
  return makeModel('suessigkeiten_haufen', kulisse(root), () => {}, []);
}

export const MODELS = {
  kuerbis: buildKuerbis,
  kuerbislaterne: buildKuerbislaterne,
  vogelscheuche: buildVogelscheuche,
  strohballen: buildStrohballen,
  maisstaude: buildMaisstaude,
  suessigkeiten_haufen: buildSuessigkeitenHaufen,
};
