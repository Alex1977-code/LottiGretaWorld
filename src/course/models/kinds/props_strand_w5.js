// Strand-Kulisse Welt 5 „Lila Strand-Insel“ (5-1): Pilzlings-Sandskulptur, Strandkorb, Sonnenschirm, Liegestuhl, Muscheln.
// (Palmen: Modell 'palme' aus Welt 2.) Eigene Gestaltung. Maßstab Meter, Ursprung = Mitte der Unterseite, Vorderseite
// nach +X; state darf ein String sein. Ohne Kollision – Kollisionsformen legt der Baustein/Level an.
//
// sandskulptur_pilzling  Sandskulptur eines Pilzlings (≈2,6 m): Sandhügel-Sockel, Füße, Stiel mit eingeritztem Gesicht,
//   großer Hut mit erhabenen Tupfen; körnig-warme Sandtöne. Mit Hohlraum: dunkles Bogentor vorn im Stiel (Mini-Pilzlinge
//   wohnen darin). Daneben Spielzeug-Eimer und -Schaufel.
//   opts  { height (2,6), hole: true, toys: true }
//   state { anim: 'idle'|'crumble', progress? (crumble: 0..1 in 1,2 s – sackt zusammen, Sandwolken; danach nur Sandhaufen) }
//   root.userData.hole → { x, y, w, h } Torbogen (Mitte unten bei x, Höhe ab y; Breite w, Höhe h) bzw. null.
// strandkorb             Strandkorb ≈1,6 m: Korbgeflecht (Wabenbänder), gewölbtes Dach, gestreiftes Polster und Futter,
//   Armlehnen, Fußstützen. Öffnung nach +X.  opts { color: 'blau'|'rot'|'gruen'|'lila' }  state –
// sonnenschirm           Sonnenschirm ≈2,4 m: Bahnen abwechselnd Farbe/Weiß mit Wellensaum, Spitze, gestreifter Stock im
//   Sandhäufchen.  opts { color: 'rot'|'blau'|'lila'|'gelb'|'gruen', height (2,4), radius (1,3), tilt (rad, 0,15) }
//   state { sway (0..1 Wind; Standard 0,3) }
// liegestuhl             Liegestuhl ≈0,9 m hoch, 1,5 m lang: Holzgestell, durchhängender Streifenstoff, Kopfkissen.
//   opts { color: 'rot'|'blau'|'gruen'|'lila' }  state –
// deco_w5_sonnenschirm / deco_w5_liegestuhl  dieselben Modelle für den Baustein deco_w5 (Eintrag { color, height } wie dort).
// muschel                Muschel/Seestern (Deko am Boden): opts { kind: 'faecher' (Fächermuschel) | 'schnecke' (Spiralschnecke)
//   | 'stern' (Seestern), size (Faktor, 1), color }  Größe ≈0,35–0,45 m.  state –

import {
  THREE, TAU, Build, cached, vcol, mesh, joint, makeModel, Clock, damp, clamp, mix, smoothstep, puffyStarGeo, placed,
  onLathe,
} from '../lib/kit.js';
import { Puffs, stick } from '../lib/kit_w3.js';
import { W5, gradV, puffyGeo, mouthShape, noise3, hash1 } from '../lib/w5Geos.js';

// =============================================================================================
// Sandskulptur (Pilzling)
// =============================================================================================
const SS = { sand: 0xf4d49a, hi: 0xfff0c8, low: 0xd0a060, dark: 0xb88448, deep: 0x5a3a22, wet: 0xc89458 };
const sandV = (k = 1) => ({ v: (x, y, z, nx, ny) => {
  const n = noise3(x * 7 * k, y * 7 * k, z * 7 * k);
  return mix(mix(SS.low, SS.hi, smoothstep(ny * 0.45 + 0.55)), n > 0.5 ? SS.hi : SS.dark, Math.abs(n - 0.5) * 0.5);
} });
const SS_STEM = [[0, 0.28], [0.42, 0.3], [0.52, 0.42], [0.56, 0.62], [0.55, 0.85], [0.5, 1.08], [0.42, 1.28], [0, 1.36]];
const SS_CAP = [[0, 1.22], [0.62, 1.22], [0.9, 1.3], [1.02, 1.46], [1.0, 1.66], [0.88, 1.94], [0.64, 2.24], [0.34, 2.46], [0, 2.54]];
function sculptGeo(hole) {
  return cached(`w5:ss:sculpt:${hole}`, () => {
    const b = new Build();
    // Sockel: Sandhügel
    const mound = new THREE.SphereGeometry(1, 40, 10, 0, TAU, 0, Math.PI / 2);
    const P = mound.attributes.position;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i); const n = noise3(x * 2.5 + 3, y * 2, z * 2.5) - 0.5; P.setXYZ(i, x * (1 + n * 0.15), y, z * (1 + n * 0.15)); }
    mound.computeVertexNormals();
    b.add(mound, sandV(), { s: [1.25, 0.34, 1.15] });
    // Füße
    for (const s of [1, -1]) b.sphere(1, sandV(), { p: [0.32, 0.36, s * 0.32], s: [0.32, 0.17, 0.25] }, 20, 12);
    // Stiel mit Gesicht
    b.lathe(SS_STEM, sandV(), null, 40, 2);
    // Hut
    b.lathe(SS_CAP, sandV(), null, 48, 2);
    for (const [az, el, r] of [[0.0, 0.62, 0.17], [0.85, 0.42, 0.15], [-0.85, 0.42, 0.15], [1.9, 0.5, 0.17], [-1.9, 0.5, 0.17], [2.9, 0.45, 0.16], [-2.6, 0.62, 0.14], [0.5, 1.05, 0.12], [-1.2, 1.0, 0.12], [2.2, 1.0, 0.12]]) {
      const h = onLathe(SS_CAP, 1.4, az, el);
      if (h) stick(b, h, { v: (x, y, z, nx, ny) => mix(SS.sand, SS.hi, smoothstep(ny * 0.5 + 0.6)) }, [r, r, r * 0.4], 0.35);
    }
    // eingeritztes Gesicht: Augenhöhlen (dunkler), erhabene Brauen, Mund-Rille
    for (const s of [1, -1]) {
      const he = onLathe(SS_STEM, 0.95, s * 0.3, 0.06);
      stick(b, he, SS.wet, [0.11, 0.17, 0.03], 0.75);
      stick(b, onLathe(SS_STEM, 0.95, s * 0.3, 0.12), SS.deep, [0.05, 0.08, 0.02], 0.6);
      const hb = onLathe(SS_STEM, 0.95, s * 0.3, 0.32);
      b.capsule(0.045, 0.17, sandV(), { p: hb.p.toArray(), r: [Math.PI / 2 - s * 0.45, -s * 0.3, 0], order: 'YXZ' }, 3, 8);
    }
    const hm = onLathe(SS_STEM, 0.8, 0, -0.05);
    b.add(puffyGeo(mouthShape('grim'), 0.02, 0.01, 10, 2), SS.wet, placed(hm.p.clone().addScaledVector(hm.n, -0.006), hm.n, new THREE.Vector3(0.14, 0.06, 1)));
    // Hohlraum: Bogentor vorn im Stiel (dunkles Inneres mit Sandrand)
    if (hole) {
      const arch = new THREE.Shape();
      arch.moveTo(-0.27, 0); arch.lineTo(0.27, 0); arch.lineTo(0.27, 0.33); arch.absarc(0, 0.33, 0.27, 0, Math.PI, false); arch.lineTo(-0.27, 0);
      const g = puffyGeo(arch, 0.06, 0.02, 12, 2);
      b.add(g, { v: (x, y) => mix(0x1a1008, SS.deep, smoothstep(y / 0.6)) }, placed(new THREE.Vector3(0.53, 0.3, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, 1, 1)));
      const rim = new THREE.TorusGeometry(0.29, 0.045, 8, 24, Math.PI);
      b.add(rim, sandV(), { p: [0.55, 0.63, 0], r: [0, Math.PI / 2, 0] });
      for (const s of [1, -1]) b.capsule(0.045, 0.3, sandV(), { p: [0.55, 0.47, s * 0.29] }, 2, 8);
    }
    return b.geometry();
  });
}
function sandToysGeo() {
  return cached('w5:ss:toys', () => {
    const b = new Build();
    // Eimer (blau mit gelbem Rand, Henkel), daneben Schaufel (rot)
    b.lathe([[0, 0], [0.13, 0], [0.17, 0.26], [0.18, 0.27], [0.16, 0.27], [0.12, 0.03], [0, 0.03]], gradV(0x1a5ad8, 0x6aa8ff), { p: [0.95, 0.12, 0.85] }, 24, 1);
    b.torus(0.17, 0.016, 0xffd23a, { p: [0.95, 0.39, 0.85], r: [Math.PI / 2, 0, 0] }, 6, 24);
    b.torus(0.16, 0.01, 0xffd23a, { p: [0.95, 0.4, 0.85], r: [0, 0.4, 0] }, 4, 16, Math.PI);
    b.box(0.05, 0.5, 0.05, 0xff3a3a, { p: [1.05, 0.5, -0.75], r: [0.25, 0, -0.35] }, 0.02, 1);
    b.box(0.2, 0.22, 0.03, 0xff3a3a, { p: [1.12, 0.2, -0.8], r: [0.25, 0, -0.35] }, 0.03, 2);
    b.box(0.12, 0.04, 0.05, 0xff3a3a, { p: [0.97, 0.78, -0.69], r: [0.25, 0, -0.35] }, 0.02, 1);
    return b.geometry();
  });
}
function buildSandskulptur(opts = {}) {
  const H = Math.max(0.6, opts.height ?? 2.6), s = H / 2.6;
  const hole = opts.hole !== false;
  const root = new THREE.Group();
  const own = [];
  const body = joint();
  body.scale.setScalar(s);
  const sculpt = mesh(sculptGeo(hole), vcol(0.9, {}, 'w5sandMatt'), {}, true);
  sculpt.receiveShadow = true;
  body.add(sculpt);
  if (opts.toys !== false) body.add(mesh(sandToysGeo(), vcol(0.35), {}, true));
  const puffs = new Puffs(14, SS.sand, { opacity: 0.9, radius: 4 * s, cy: 1 * s });
  own.push(puffs);
  root.add(body, puffs.mesh);
  root.userData.hole = hole ? { x: 0.55 * s, y: 0.3 * s, w: 0.54 * s, h: 0.6 * s } : null;
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    if (anim === 'crumble') {
      const p = st.progress !== undefined ? clamp(st.progress, 0, 1) : clamp(clk.age / 1.2, 0, 1);
      if (clk.entered) puffs.burst([0, 1.3 * s, 0], { count: 14, speed: 2.2 * s, up: 0.6, size: 0.4 * s, life: 1.1, spread: 0.8 * s });
      const k = smoothstep(p);
      sculpt.scale.set(1 + k * 0.25, Math.max(0.14, 1 - k * 0.88), 1 + k * 0.25);
      sculpt.rotation.y = Math.sin(clk.age * 30) * 0.02 * (1 - k);
    } else { sculpt.scale.setScalar(1); sculpt.rotation.y = 0; }
    puffs.step(dt);
  };
  return makeModel('sandskulptur_pilzling', root, update, own, { initial: 'idle' });
}

// =============================================================================================
// Strandkorb
// =============================================================================================
const KORB = { wick: 0xf2dcae, wickHi: 0xfff2d0, wickLow: 0xc8a46a, band: 0xd8b880, wood: 0xa86a3a };
const STRIPES = { blau: [0x2f6ae8, 0xffffff], rot: [0xe8283e, 0xffffff], gruen: [0x2fb84a, 0xffffff], lila: [0x8a3ad8, 0xffffff], gelb: [0xffc21a, 0xffffff] };
const stripeV = (c, axis = 'z', f = 6) => (x, y, z) => ((((Math.floor((axis === 'z' ? z : axis === 'x' ? x : y) * f) % 2) + 2) % 2) ? c[0] : c[1]);
function korbGeo(color) {
  const C = STRIPES[color] ?? STRIPES.blau;
  return cached(`w5:korb:${color}`, () => {
    const b = new Build();
    const wick = gradV(KORB.wickLow, KORB.wickHi, 0.5, 0.55);
    // Sockel (Korbkasten) mit Füßen
    b.box(0.9, 0.48, 1.3, wick, { p: [0, 0.32, 0] }, 0.08, 2);
    for (const sx of [1, -1]) for (const sz of [1, -1]) b.box(0.1, 0.1, 0.1, KORB.wood, { p: [sx * 0.38, 0.05, sz * 0.58] }, 0.03, 1);
    // Rückwand und Seitenwangen
    b.box(0.16, 1.0, 1.3, wick, { p: [-0.37, 1.05, 0] }, 0.07, 2);
    for (const sz of [1, -1]) b.box(0.62, 0.42, 0.12, wick, { p: [-0.06, 0.77, sz * 0.6] }, 0.05, 2);
    // gewölbtes Dach (halbe Röhre entlang Z), außen Geflecht, innen Stoff
    // Dach: Geflecht außen (Viertel- bis Halbröhre von hinten über oben nach vorn), Stoff innen
    const roof = new THREE.CylinderGeometry(0.56, 0.56, 1.3, 28, 6, true, Math.PI * 0.8, Math.PI * 0.7);
    roof.rotateX(Math.PI / 2);
    b.add(roof, (x, y, z) => ((((Math.floor((y + 0.6) * 9) + Math.floor(z * 6)) % 2) + 2) % 2 ? KORB.wickHi : KORB.wick), { p: [0, 1.5, 0] });
    const roofIn = new THREE.CylinderGeometry(0.5, 0.5, 1.26, 28, 1, true, Math.PI * 0.8, Math.PI * 0.7);
    roofIn.rotateX(Math.PI / 2);
    b.add(roofIn, stripeV(C, 'z', 5), { p: [0, 1.5, 0] });
    // Dachkanten (Wulst) und Geflecht-Bänder
    for (const z of [0.65, -0.65]) b.torus(0.53, 0.05, KORB.band, { p: [0, 1.5, z], r: [0, 0, Math.PI * 0.3] }, 6, 24, Math.PI * 0.7);
    b.capsule(0.05, 1.25, KORB.band, { p: [0.32, 1.94, 0], r: [Math.PI / 2, 0, 0] }, 3, 8);
    for (const y of [0.2, 0.38, 0.52]) b.box(0.92, 0.025, 1.32, KORB.band, { p: [0, y, 0] }, 0.01, 1);
    for (const y of [0.75, 0.95, 1.15, 1.35]) b.box(0.18, 0.025, 1.32, KORB.band, { p: [-0.37, y, 0] }, 0.01, 1);
    // Futter innen, Sitzkissen, Armlehnen-Polster, Fußstützen
    b.box(0.04, 0.9, 1.1, stripeV(C, 'z', 5), { p: [-0.28, 1.0, 0] }, 0.015, 1);
    b.box(0.6, 0.12, 1.1, stripeV(C, 'z', 5), { p: [0.04, 0.6, 0] }, 0.05, 2);
    for (const sz of [1, -1]) b.capsule(0.06, 0.5, C[0], { p: [-0.05, 1.0, sz * 0.6], r: [0, 0, Math.PI / 2] }, 3, 8);
    for (const sz of [1, -1]) b.box(0.32, 0.06, 0.4, KORB.wood, { p: [0.62, 0.25, sz * 0.3], r: [0, 0, -0.25] }, 0.02, 1);
    return b.geometry();
  });
}
function buildStrandkorb(opts = {}) {
  const color = STRIPES[opts.color] ? opts.color : 'blau';
  const root = new THREE.Group();
  const m = mesh(korbGeo(color), vcol(0.6, { side: THREE.DoubleSide }, 'w5korb'), {}, true);
  m.receiveShadow = true;
  root.add(m);
  return makeModel('strandkorb', root, () => {}, [], { initial: 'idle' });
}

// =============================================================================================
// Sonnenschirm
// =============================================================================================
function schirmGeo(color, R) {
  const C = STRIPES[color] ?? STRIPES.rot;
  return cached(`w5:schirm:${color}:${R}`, () => {
    const b = new Build();
    const n = 8, seg = 64;
    const g = new THREE.ConeGeometry(R, R * 0.42, seg, 4, true);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      const a = Math.atan2(z, x), r = Math.hypot(x, z) / R;
      // leicht gewölbt + Wellensaum an jeder Bahn
      const bulge = Math.sin(r * Math.PI) * 0.06 * R;
      const scal = r > 0.98 ? -Math.abs(Math.sin(a * n / 2)) * 0.1 * R : 0;
      P.setXYZ(i, x, y + bulge + scal * 0.6, z);
    }
    g.computeVertexNormals();
    b.add(g, (x, y, z) => ((((Math.floor((Math.atan2(z, x) / TAU) * n + 8)) % 2) + 2) % 2 ? C[0] : C[1]), { p: [0, 0, 0] });
    // Unterseite (gleiche Bahnen, etwas dunkler)
    const u = g.clone(); u.scale(1, 1, -1);
    b.add(u, (x, y, z) => ((((Math.floor((Math.atan2(-z, x) / TAU) * n + 8)) % 2) + 2) % 2 ? mix(C[0], 0x000000, 0.25) : 0xe0e0e8), { p: [0, -0.01, 0] });
    // Spitze
    b.sphere(0.07, 0xffd23a, { p: [0, R * 0.21 + 0.05, 0] }, 12, 8);
    // Speichen-Enden (Knöpfchen am Saum)
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU; b.sphere(0.03, 0xffffff, { p: [Math.cos(a) * R, -R * 0.21 - 0.02, Math.sin(a) * R] }, 8, 6); }
    return b.geometry();
  });
}
function buildSonnenschirm(opts = {}) {
  const color = STRIPES[opts.color] ? opts.color : 'rot';
  const H = Math.max(1, opts.height ?? 2.4), R = Math.max(0.5, opts.radius ?? 1.3);
  const C = STRIPES[color];
  const root = new THREE.Group();
  const tiltJ = joint();
  tiltJ.rotation.z = opts.tilt ?? 0.15;
  const pole = mesh(cached(`w5:schirm:pole:${H}:${color}`, () => {
    const b = new Build();
    b.add(new THREE.CylinderGeometry(0.035, 0.035, H, 10, Math.round(H * 6)), (x, y) => ((((Math.floor((y + H / 2) * 4) % 2) + 2) % 2) ? C[0] : 0xffffff), { p: [0, H / 2, 0] });
    return b.geometry();
  }), vcol(0.4), {}, true);
  const canopy = joint([0, H - R * 0.21, 0], mesh(schirmGeo(color, R), vcol(0.45, { side: THREE.DoubleSide }, 'w5schirm'), {}, true));
  tiltJ.add(pole, canopy);
  const mound = mesh(cached('w5:schirm:mound', () => new Build().dome(0.3, gradV(W5.sandLow, W5.sandHi), { s: [1, 0.35, 1] }, Math.PI / 2, 20, 6).geometry()), vcol(0.85, {}, 'w5sand'), {});
  root.add(tiltJ, mound);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const sw = clamp(st.sway ?? 0.3, 0, 1);
    canopy.rotation.y = Math.sin(clk.t * 0.7) * 0.15 * sw;
    canopy.rotation.x = Math.sin(clk.t * 1.9) * 0.03 * sw;
  };
  return makeModel('sonnenschirm', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Liegestuhl
// =============================================================================================
function liegeGeo(color) {
  const C = STRIPES[color] ?? STRIPES.rot;
  return cached(`w5:liege:${color}`, () => {
    const b = new Build();
    const wood = gradV(0x8a5428, 0xd89a5a);
    // Seitenholme: Rückenlehne (schräg) + Beinstütze, je Seite
    for (const sz of [1, -1]) {
      b.box(0.06, 1.15, 0.06, wood, { p: [-0.35, 0.5, sz * 0.32], r: [0, 0, 0.75] }, 0.02, 1);
      b.box(0.06, 0.9, 0.06, wood, { p: [0.32, 0.32, sz * 0.32], r: [0, 0, -0.55] }, 0.02, 1);
      b.box(0.06, 0.62, 0.06, wood, { p: [0.0, 0.26, sz * 0.34], r: [0, 0, 0.9] }, 0.02, 1);
    }
    for (const x of [-0.75, 0.62, 0.15]) b.cyl(0.03, 0.03, 0.72, wood, { p: [x, x < -0.5 ? 0.92 : x > 0.5 ? 0.05 : 0.48, 0], r: [Math.PI / 2, 0, 0] }, 8);
    // Stoff: durchhängende Bahn von oben-hinten nach vorne-unten
    const g = new THREE.PlaneGeometry(1.45, 0.58, 20, 1);
    g.rotateX(-Math.PI / 2);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const u = (P.getX(i) + 0.725) / 1.45; // 0 hinten oben … 1 vorne
      const x = -0.75 + u * 1.37, y = 0.92 - u * 0.86 - Math.sin(u * Math.PI) * 0.18;
      P.setXYZ(i, x, y, P.getZ(i));
    }
    g.computeVertexNormals();
    b.add(g, (x, y, z) => ((((Math.floor((z + 0.29) * 9) % 2) + 2) % 2) ? C[0] : C[1]), {});
    // Kopfkissen
    b.capsule(0.08, 0.45, 0xffffff, { p: [-0.62, 0.86, 0], r: [Math.PI / 2, 0, 0] }, 3, 10);
    return b.geometry();
  });
}
function buildLiegestuhl(opts = {}) {
  const color = STRIPES[opts.color] ? opts.color : 'rot';
  const root = new THREE.Group();
  const m = mesh(liegeGeo(color), vcol(0.55, { side: THREE.DoubleSide }, 'w5liege'), {}, true);
  root.add(m);
  return makeModel('liegestuhl', root, () => {}, [], { initial: 'idle' });
}

// =============================================================================================
// Muscheln / Seestern
// =============================================================================================
function muschelGeo(kind, color) {
  return cached(`w5:muschel:${kind}:${color}`, () => {
    const b = new Build();
    if (kind === 'stern') {
      const c = color ?? 0xff7a3a;
      const g = puffyStarGeo(0.22, 0.09, 0.06, 0.04, 5);
      b.add(g, gradV(mix(c, 0x000000, 0.25), mix(c, 0xffffff, 0.25)), { p: [0, 0.05, 0], r: [-Math.PI / 2, 0, 0.3] });
      for (let i = 0; i < 5; i++) for (let k = 1; k <= 3; k++) {
        const a = 0.3 + Math.PI / 2 + (i / 5) * TAU, r = k * 0.05;
        b.sphere(0.012, 0xfff2e0, { p: [Math.cos(a) * r, 0.1 - k * 0.006, -Math.sin(a) * r] }, 6, 4);
      }
      return b.geometry();
    }
    if (kind === 'schnecke') {
      const c = color ?? 0xffb08a;
      const pts = [];
      for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * TAU * 2.2, r = 0.02 + t * 0.13; pts.push([Math.cos(a) * r - 0.05, 0.2 - t * 0.17 + 0.03, Math.sin(a) * r]); }
      const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
      const tube = new THREE.TubeGeometry(curve, 80, 1, 14, false);
      // Röhrenradius wächst entlang der Spirale
      const P = tube.attributes.position, N = tube.attributes.normal;
      const cp = curve.getSpacedPoints(80);
      for (let i = 0; i < P.count; i++) {
        const seg = Math.floor(i / 15), t = Math.min(1, seg / 80), r = 0.012 + t * 0.075;
        const c0 = cp[Math.min(80, seg)];
        P.setXYZ(i, c0.x + N.getX(i) * r, c0.y + N.getY(i) * r, c0.z + N.getZ(i) * r);
      }
      tube.computeVertexNormals();
      b.add(tube, { v: (x, y, z) => mix(c, 0xfff4ec, smoothstep(Math.sin(Math.atan2(z, x + 0.05) * 6) * 0.5 + 0.5)) }, { r: [0, 0, 0.9], p: [0, 0.02, 0] });
      b.sphere(0.07, 0xff8aa8, { p: [0.11, 0.05, 0.06], s: [0.6, 1, 1] }, 12, 8);
      return b.geometry();
    }
    // Fächermuschel: geriffelte Viertelkugel mit Öhrchen
    const c = color ?? 0xffa0c8;
    const g = new THREE.SphereGeometry(1, 48, 12, Math.PI * 0.08, Math.PI * 0.84, 0, Math.PI / 2);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      const a = Math.atan2(z, x);
      const rib = 1 + 0.06 * Math.abs(Math.sin(a * 9));
      P.setXYZ(i, x * rib, y * rib * 0.55, z * rib);
    }
    g.computeVertexNormals();
    b.add(g, { v: (x, y, z) => { const a = Math.atan2(z, x); return mix(mix(c, 0xffffff, 0.15), mix(c, 0x000000, 0.12), Math.abs(Math.sin(a * 9)) > 0.6 ? 1 : 0); } }, { s: 0.24, r: [0, Math.PI / 2, 0] });
    for (const s of [1, -1]) b.box(0.07, 0.04, 0.06, mix(c, 0xffffff, 0.2), { p: [s * 0.05, 0.02, 0.02] }, 0.015, 1);
    return b.geometry();
  });
}
function buildMuschel(opts = {}) {
  const kind = ['faecher', 'schnecke', 'stern'].includes(opts.kind) ? opts.kind : 'faecher';
  const root = new THREE.Group();
  const m = mesh(muschelGeo(kind, opts.color), vcol(0.3), { s: Math.max(0.1, opts.size ?? 1) * (kind === 'stern' ? 1.1 : 1.3) }, true);
  root.add(m);
  return makeModel('muschel', root, () => {}, [], { initial: 'idle' });
}

export const MODELS = {
  // Kulissen-Modelle für den Baustein deco_w5 (opts = Eintrag des Bausteins; wird in die statische Geometrie verschmolzen)
  deco_w5_sonnenschirm: (it = {}) => buildSonnenschirm({ color: it.color ?? 'rot', height: it.height ?? 2.6, radius: it.radius ?? 1.4, tilt: it.tilt ?? 0.1 }),
  deco_w5_liegestuhl: (it = {}) => buildLiegestuhl({ color: it.color ?? 'blau' }),
  sandskulptur_pilzling: buildSandskulptur,
  strandkorb: buildStrandkorb,
  sonnenschirm: buildSonnenschirm,
  liegestuhl: buildLiegestuhl,
  muschel: buildMuschel,
};
