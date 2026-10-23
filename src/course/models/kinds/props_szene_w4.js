// Kulisse Welt 4 (Kurs-Modus), Teil 2: Technik/Weltraum (4-3 Piep-Blöcke), Bergwiese/Himmel (4-4 Trampoline) und
// Ruinenstadt (4-5). Eigene Gestaltung, Kartenqualität. Maßstab Meter, Ursprung = Mitte der Unterseite (Ausnahmen
// genannt), Vorderseite +X; state darf ein String sein.
//
// lautsprecher     Lautsprecher-Box ≈2 m: nachtblaues Gehäuse mit Neon-Kanten, großer Tieftöner und Hochtöner vorn (+X),
//                  leuchtender Ring.  opts { height (2) }
//                  state { beat (0..1, 1 = Schlag; Membranen springen vor, Ring leuchtet) – ohne beat pumpt sie selbst 2×/s }
// neon_ring        Neon-Ring (senkrecht, Fläche nach ±X), Mitte bei y = radius: heller Kern, farbiger Schein, acht
//                  umlaufende Leuchtperlen.  opts { radius (1,5), color: 'cyan'|'magenta'|'gelb'|'gruen' }
//                  state { pulse (0..1, Helligkeit/Größe; Standard pulsiert selbst) }
// equalizer_saeule Equalizer-Säule: dunkle Säule mit Chromkanten, Leuchtsegmente (grün → gelb → rot) im Fenster vorn (+X),
//                  Leuchtkugel oben.  opts { segments (10), height (4) }
//                  state { level (0..1: so viele Segmente leuchten; ohne level tanzt sie von selbst) }
// wolkeninsel      Wolkeninsel: flauschige Wolke mit flacher, begehbarer Oberseite (weiß, unten lila-blau schattiert).
//                  opts { size (Durchmesser, 4) }  state –  root.userData.top → Höhe der Oberseite (≈0,42 · size).
// windrad          Spielzeug-Windrad auf weißem Mast mit roten Ringen: vier bunte, geschwungene Flügel (Rotor dreht um
//                  ±X, Vorderseite +X), Grashügel am Fuß.  opts { height (6) }  state { speed (U/s, Standard 0,3) }
// ruinen_saeule    Ruinen-Säule (elfenbeinfarben, kanneliert, türkises Zierband, Moos unten): mit Kapitell oder
//                  abgebrochen mit Bruchkante und Schutt.  opts { height (3), broken (false) }  state –
//                  Viele → createInstanced('ruinen_saeule', n, { height, broken }) (lib/instanced_w4.js).
// statue_bruch     zerbrochene Statue eines sitzenden Hasen-Helden auf Sockel (ein Ohr abgebrochen – liegt daneben,
//                  ein Arm fehlt, Risse, Moos).  opts { size (Gesamthöhe, 3) }  state –
// ruinen_torbogen  Ruinen-Torbogen: zwei Pfeiler mit Kapitell, Bogen aus neun Keilsteinen mit türkisem Schlussstein,
//                  Moos und hängende Ranken; Durchgang entlang ±X.  opts { width (lichte Weite, 4), height (Gesamthöhe, 4,5) }
// ruinen_treppe    Ruinen-Treppe: Stufen steigen nach +X an (Vorderkante der ersten Stufe bei x = 0), seitliche Wangen
//                  mit Zierband, abgenutzte Kanten, Moos.  opts { steps (5), width (3), rise (0,35), run (0,55) }
//                  root.userData → { length: steps · run, height: steps · rise }.
// ranken           Ranken: opts { length (3), kind: 'haengend' (Vorhang über einer Kante; **Ursprung = Oberkante**,
//                  Stränge hängen nach −Y, verteilt über z ± length/2) | 'boden' (kriechen über den Boden nach +X) }
//                  state { sway (0..1) }

import {
  THREE, TAU, Build, cached, vcol, basic, std, mesh, joint, makeModel, Clock, damp, clamp, mix, col, smoothstep,
  instMesh, setInst, glowSprite, placed, puffyStarGeo, roundedBox, SIDE,
} from '../lib/kit.js';
import { RUIN, ruinSaeuleGeo, displace, noise3, hash1, axisY } from '../lib/w4Geos.js';

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const flat = (g) => { const n = g.index ? g.toNonIndexed() : g; if (n !== g) g.dispose(); n.deleteAttribute('normal'); n.computeVertexNormals(); return n; };
const stoneV = (seed = 0) => ({ v: (x, y, z, nx, ny) => mix(RUIN.stoneLow, RUIN.stoneHi, smoothstep(ny * 0.35 + 0.45 + (noise3(x * 2.5 + seed, y * 2.5, z * 2.5) - 0.5) * 0.6)) });
const stoneMat = () => vcol(0.75, {}, 'w4stone');

// =============================================================================================
// Lautsprecher
// =============================================================================================
const LS = { box: 0x1c1c3e, boxHi: 0x34346a, neon: 0x3af0ff, neon2: 0xff4ad8, cone: 0x2a2a34, coneHi: 0x5a5a6a, surround: 0x141418, cap: 0x3af0ff };
function lsBoxGeo() {
  return cached('w4:ls:box', () => {
    const b = new Build();
    b.box(1.1, 2, 1.3, { v: (x, y, z, nx, ny) => mix(LS.box, LS.boxHi, smoothstep(ny * 0.4 + nx * 0.3 + 0.35)) }, { p: [0, 1, 0] }, 0.08, 2);
    // Neon-Kanten vorn (senkrecht) und oben/unten
    for (const s of [1, -1]) b.box(0.05, 1.86, 0.05, LS.neon, { p: [0.55, 1, s * 0.62] }, 0.02, 1);
    for (const y of [0.07, 1.93]) b.box(0.05, 0.05, 1.2, LS.neon2, { p: [0.55, y, 0] }, 0.02, 1);
    // Fächer-Gitter hinter den Membranen
    b.cyl(0.47, 0.47, 0.02, 0x0e0e20, { p: [0.55, 0.72, 0], r: [0, 0, Math.PI / 2] }, 28);
    b.cyl(0.24, 0.24, 0.02, 0x0e0e20, { p: [0.55, 1.55, 0], r: [0, 0, Math.PI / 2] }, 20);
    // Füße
    for (const sx of [1, -1]) for (const sz of [1, -1]) b.cyl(0.07, 0.09, 0.08, 0x9aa2b8, { p: [sx * 0.42, -0.02, sz * 0.52] }, 10);
    return b.geometry();
  });
}
function lsConeGeo(R) {
  return cached(`w4:ls:cone:${R}`, () => {
    const b = new Build();
    const pts = [[0, 0.12], [R * 0.25, 0.1], [R * 0.75, 0.03], [R * 0.86, 0.04], [R * 0.95, 0.07], [R, 0.04], [R, 0]];
    b.lathe(pts, { v: (x, y, z, nx, ny) => (Math.hypot(x, z) > R * 0.82 ? LS.surround : mix(LS.cone, LS.coneHi, smoothstep(ny * 0.6 + 0.2))) }, null, 28, 1);
    b.dome(R * 0.26, { v: (x, y, z, nx, ny) => mix(0x1a8aa8, 0xc8ffff, smoothstep(ny)) }, { p: [0, 0.1, 0], s: [1, 0.55, 1] }, Math.PI / 2, 20, 6);
    const g = b.geometry();
    g.rotateZ(-Math.PI / 2); // Achse → +X
    return g;
  });
}
function buildLautsprecher(opts = {}) {
  const k = clamp(Number(opts.height ?? 2), 0.5, 10) / 2;
  const root = new THREE.Group();
  const sc = joint(); sc.scale.setScalar(k);
  const box = mesh(lsBoxGeo(), vcol(0.35, {}, 'w4tech'), {}, true);
  const woofer = mesh(lsConeGeo(0.45), vcol(0.3, {}, 'w4tech'), { p: [0.55, 0.72, 0] });
  const tweeter = mesh(lsConeGeo(0.22), vcol(0.3, {}, 'w4tech'), { p: [0.55, 1.55, 0] });
  const ring = mesh(cached('w4:ls:ring', () => new THREE.TorusGeometry(0.5, 0.025, 6, 40).rotateY(Math.PI / 2)), basic('w4:lsRing', { color: LS.neon }), { p: [0.57, 0.72, 0] });
  sc.add(box, woofer, tweeter, ring);
  root.add(sc);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t = clk.t;
    const beat = st.beat !== undefined ? clamp(Number(st.beat), 0, 1) : Math.pow(Math.max(0, Math.sin(t * Math.PI * 2)), 6);
    woofer.scale.set(1 + beat * 1.6, 1 + beat * 0.03, 1 + beat * 0.03);
    tweeter.scale.set(1 + beat * 1.0, 1, 1);
    ring.scale.setScalar(1 + beat * 0.08);
  };
  return makeModel('lautsprecher', root, update);
}

// =============================================================================================
// Neon-Ring
// =============================================================================================
const NEON = { cyan: 0x3af0ff, magenta: 0xff3ad8, gelb: 0xffe23a, gruen: 0x6aff5a };
function buildNeonRing(opts = {}) {
  const R = clamp(Math.round((opts.radius ?? 1.5) * 4) / 4, 0.25, 20);
  const c = NEON[opts.color] ?? NEON.cyan;
  const root = new THREE.Group();
  const center = joint([0, R, 0]);
  const core = mesh(cached(`w4:neon:core:${R}`, () => new THREE.TorusGeometry(R, 0.06, 8, 64).rotateY(Math.PI / 2)), basic(`w4:neonCore:${c}`, { color: col(c).clone().lerp(col(0xffffff), 0.6) }));
  const glowMat = basic(`w4:neonGlow:${c}`, { color: c, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending });
  const glow = mesh(cached(`w4:neon:glow:${R}`, () => new THREE.TorusGeometry(R, 0.2, 8, 64).rotateY(Math.PI / 2)), glowMat);
  const beads = instMesh(cached('w4:neon:bead', () => new THREE.SphereGeometry(0.11, 10, 8)), basic(`w4:neonBead:${c}`, { color: 0xffffff }), 8, R * 1.3, 0);
  center.add(core, glow, beads);
  root.add(center);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t = clk.t;
    const p = st.pulse !== undefined ? clamp(Number(st.pulse), 0, 1) : 0.5 + Math.sin(t * 3) * 0.5;
    glow.scale.setScalar(1 + p * 0.05);
    glow.visible = p > 0.02;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + t * 0.8;
      setInst(beads, i, 0, Math.sin(a) * R, Math.cos(a) * R, 0, 0, 0, 0.8 + p * 0.5);
    }
    beads.instanceMatrix.needsUpdate = true;
  };
  return makeModel('neon_ring', root, update, [beads]);
}

// =============================================================================================
// Equalizer-Säule
// =============================================================================================
function eqFrameGeo(n, H) {
  return cached(`w4:eq:frame:${n}:${H}`, () => {
    const b = new Build();
    b.box(0.9, H, 0.9, { v: (x, y, z, nx, ny) => mix(0x14142e, 0x2e2e5a, smoothstep(ny * 0.4 + nx * 0.3 + 0.35)) }, { p: [0, H / 2, 0] }, 0.06, 1);
    for (const s of [1, -1]) b.box(0.06, H, 0.06, 0xc8d0e8, { p: [0.45, H / 2, s * 0.45] }, 0.02, 1);
    b.box(0.04, H - 0.3, 0.64, 0x06061a, { p: [0.45, H / 2, 0] }, 0, 1);
    b.cyl(0.5, 0.55, 0.12, 0xc8d0e8, { p: [0, 0.06, 0] }, 4);
    b.sphere(0.22, { v: (x, y, z, nx, ny) => mix(0xff3ad8, 0xffc8ff, smoothstep(ny)) }, { p: [0, H + 0.2, 0] }, 16, 12);
    return b.geometry();
  });
}
const EQ_COLS = (k) => (k < 0.6 ? 0x3aff6a : k < 0.85 ? 0xffe23a : 0xff3a4a);
function buildEqualizer(opts = {}) {
  const n = clamp(Math.round(opts.segments ?? 10), 3, 30);
  const H = clamp(Math.round((opts.height ?? 4) * 2) / 2, 1, 20);
  const root = new THREE.Group();
  const frame = mesh(eqFrameGeo(n, H), vcol(0.35, {}, 'w4tech'), {}, true);
  const segs = instMesh(cached('w4:eq:seg', () => roundedBox(0.06, 1, 1, 0.02, SIDE.ALL, 0, 1)), basic('w4:eqSeg', { color: 0xffffff }), n, H, H / 2);
  segs.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
  const step = (H - 0.4) / n;
  for (let i = 0; i < n; i++) setInst(segs, i, 0.48, 0.2 + step * (i + 0.5), 0, 0, 0, 0, [1, step * 0.72, 0.56]);
  root.add(frame, segs);
  const clk = new Clock();
  const c = new THREE.Color();
  let lv = 0;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t = clk.t;
    const target = st.level !== undefined ? clamp(Number(st.level), 0, 1) : 0.45 + Math.sin(t * 5.1) * 0.25 + Math.sin(t * 8.3) * 0.18;
    lv = st.level !== undefined ? target : damp(lv, target, 12, dt);
    for (let i = 0; i < n; i++) {
      const k = (i + 0.5) / n;
      c.set(EQ_COLS(k));
      if (k > lv) c.multiplyScalar(0.18);
      segs.setColorAt(i, c);
    }
    segs.instanceColor.needsUpdate = true;
  };
  return makeModel('equalizer_saeule', root, update, [segs]);
}

// =============================================================================================
// Wolkeninsel
// =============================================================================================
function wolkeGeo(S) {
  return cached(`w4:wolke:${S}`, () => {
    const b = new Build();
    const cloudV = { v: (x, y, z, nx, ny) => mix(0xb8b4ec, 0xffffff, smoothstep(ny * 0.8 + 0.45)) };
    b.sphere(1, cloudV, { p: [0, S * 0.22, 0], s: [S * 0.5, S * 0.2, S * 0.5] }, 28, 14);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + 0.3, r = S * (0.42 + hash1(i) * 0.08);
      b.sphere(S * (0.13 + hash1(i + 5) * 0.06), cloudV, { p: [Math.cos(a) * r, S * (0.2 + hash1(i + 9) * 0.06), Math.sin(a) * r] }, 14, 10);
    }
    for (let i = 0; i < 5; i++) {
      const a = i * 1.7, r = S * 0.22;
      b.sphere(S * 0.16, cloudV, { p: [Math.cos(a) * r, S * 0.3, Math.sin(a) * r], s: [1.3, 0.75, 1.3] }, 14, 10);
    }
    for (let i = 0; i < 4; i++) {
      const a = i * 1.57 + 0.8, r = S * 0.25;
      b.sphere(S * 0.12, cloudV, { p: [Math.cos(a) * r, S * 0.08, Math.sin(a) * r], s: [1.2, 0.8, 1.2] }, 12, 8);
    }
    return b.geometry();
  });
}
function buildWolkeninsel(opts = {}) {
  const S = clamp(Math.round((opts.size ?? 4) * 2) / 2, 1, 30);
  const root = new THREE.Group();
  const bob = joint();
  const m = mesh(wolkeGeo(S), vcol(0.9, { emissive: 0x2a2a40 }, 'w4cloud'), {}, true);
  m.receiveShadow = true;
  bob.add(m);
  root.add(bob);
  root.userData.top = S * 0.42;
  const clk = new Clock();
  const update = (dt) => { clk.tick(dt, 'idle'); bob.position.y = Math.sin(clk.t * 0.8) * 0.04; };
  return makeModel('wolkeninsel', root, update);
}

// =============================================================================================
// Windrad
// =============================================================================================
const WR_COLS = [0xff3a4a, 0xffd21f, 0x2a8aff, 0x3ac84a];
function windradTowerGeo(H) {
  return cached(`w4:windrad:tower:${H}`, () => {
    const b = new Build();
    b.cyl(0.14, 0.3, H, (x, y) => (Math.floor((y + H / 2) / (H / 6)) % 2 ? 0xffffff : 0xe8283a), { p: [0, H / 2, 0] }, 14);
    b.box(0.7, 0.4, 0.45, 0xfff6ee, { p: [-0.05, H + 0.1, 0] }, 0.12, 2);
    b.cone(0.18, 0.4, 0xe8283a, { p: [-0.55, H + 0.1, 0], r: [0, 0, Math.PI / 2] }, 10);
    b.box(0.6, 0.02, 0.5, 0xe8283a, { p: [-0.75, H + 0.1, 0] }, 0, 1);
    b.add(displace(new THREE.SphereGeometry(0.9, 14, 6, 0, TAU, 0, Math.PI / 2), 0.08, 3, 2, false), (x, y, z, nx, ny) => (ny > 0.5 ? 0x6cc84a : 0x4aa83a), { s: [1, 0.35, 1] });
    return b.geometry();
  });
}
function windradRotorGeo(H) {
  return cached(`w4:windrad:rotor:${H}`, () => {
    const b = new Build();
    const L = H * 0.32;
    for (let i = 0; i < 4; i++) {
      // geschwungener Flügel (Dreieck mit Bogen), leicht angestellt
      const s = new THREE.Shape();
      s.moveTo(0, 0); s.quadraticCurveTo(L * 0.25, L * 0.55, 0, L); s.quadraticCurveTo(-L * 0.45, L * 0.62, -L * 0.42, L * 0.2); s.lineTo(0, 0);
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, curveSegments: 8 });
      g.rotateY(-Math.PI / 2 + 0.25);
      b.add(g, { v: (x, y) => mix(WR_COLS[i], 0xffffff, smoothstep(y / L - 0.75) * 0.6) }, { r: [(i / 4) * TAU, 0, 0] });
    }
    b.sphere(0.2, 0xffffff, { p: [0.08, 0, 0], s: [1.2, 1, 1] }, 14, 10);
    b.sphere(0.07, 0xffd21f, { p: [0.3, 0, 0] }, 8, 6);
    return b.geometry();
  });
}
function buildWindrad(opts = {}) {
  const H = clamp(Math.round((opts.height ?? 6) * 2) / 2, 1.5, 30);
  const root = new THREE.Group();
  const tower = mesh(windradTowerGeo(H), vcol(0.45, {}, 'w4meadow'), {}, true);
  const rotor = mesh(windradRotorGeo(H), vcol(0.4, { side: THREE.DoubleSide }, 'w4meadowDS'), { p: [0.32, H + 0.1, 0] }, true);
  root.add(tower, rotor);
  const clk = new Clock();
  const update = (dt, st) => { clk.tick(dt, 'idle'); rotor.rotation.x -= dt * TAU * clamp(Number(st.speed ?? 0.3), 0, 5); };
  return makeModel('windrad', root, update);
}

// =============================================================================================
// Ruinen-Säule
// =============================================================================================
function buildRuinenSaeule(opts = {}) {
  const H = clamp(Math.round((opts.height ?? 3) * 10) / 10, 1, 20);
  const root = new THREE.Group();
  const m = mesh(ruinSaeuleGeo(H, !!opts.broken), stoneMat(), {}, true);
  m.receiveShadow = true;
  root.add(m);
  return makeModel('ruinen_saeule', root, () => {});
}

// =============================================================================================
// Zerbrochene Statue (Hasen-Held)
// =============================================================================================
function statueGeo() {
  return cached('w4:statue', () => {
    const b = new Build();
    const st = stoneV(3);
    // Sockel mit Zierband und Inschrift-Feld
    b.box(1.5, 0.9, 1.5, st, { p: [0, 0.45, 0] }, 0.05, 1);
    b.box(1.56, 0.12, 1.56, RUIN.inlay, { p: [0, 0.78, 0] }, 0.03, 1);
    b.box(1.65, 0.14, 1.65, RUIN.stoneHi, { p: [0, 0.97, 0] }, 0.04, 1);
    b.box(0.04, 0.35, 0.8, RUIN.stoneLow, { p: [0.76, 0.42, 0] }, 0.02, 1);
    // sitzender Hase: Körper, Kopf, ein Ohr, Ohrstumpf, Pfoten
    b.add(displace(new THREE.SphereGeometry(1, 20, 14), 0.03, 4, 1, true), st, { p: [-0.05, 1.62, 0], s: [0.55, 0.62, 0.5] });
    b.add(displace(new THREE.SphereGeometry(1, 20, 14), 0.02, 5, 2, true), st, { p: [0.15, 2.38, 0], s: [0.4, 0.37, 0.38] });
    b.capsule(0.11, 0.55, st, { p: [0.05, 2.95, -0.13], r: [-0.15, 0, 0.12] }, 4, 10);
    b.cyl(0.11, 0.12, 0.14, RUIN.stoneLow, { p: [0.12, 2.75, 0.14], r: [0.2, 0, 0.1] }, 10);
    b.add(displace(new THREE.CircleGeometry(0.11, 10), 0.02, 9, 4, false), RUIN.stoneLow, { p: [0.13, 2.82, 0.155], r: [-Math.PI / 2 + 0.2, 0, 0.1] });
    b.sphere(1, st, { p: [0.4, 1.2, 0.2], s: [0.22, 0.14, 0.15] }, 12, 8);
    b.sphere(1, st, { p: [0.4, 1.2, -0.2], s: [0.22, 0.14, 0.15] }, 12, 8);
    b.capsule(0.09, 0.3, st, { p: [0.38, 1.75, -0.28], r: [0.3, 0, -0.9] }, 3, 8);
    b.cyl(0.09, 0.1, 0.1, RUIN.stoneLow, { p: [0.28, 1.95, 0.3], r: [-0.4, 0, -0.5] }, 8);
    // geschlossene, gemeißelte Augen und Nase
    for (const s of [1, -1]) b.torus(0.06, 0.012, RUIN.stoneLow, { p: [0.5, 2.45, s * 0.15], r: [0, Math.PI / 2 - s * 0.35, Math.PI] }, 4, 10, Math.PI);
    b.sphere(0.05, RUIN.stoneLow, { p: [0.54, 2.33, 0] }, 8, 6);
    // Moos auf Kopf und Schultern, Risse
    for (const [x, y, z, r] of [[0.0, 2.68, 0.1, 0.18], [-0.2, 2.05, 0.3, 0.16], [-0.3, 1.3, -0.35, 0.2]]) b.add(displace(new THREE.SphereGeometry(r, 10, 6), 0.04, 6, x, false), RUIN.moss, { p: [x, y, z], s: [1, 0.45, 1] });
    for (const [p, d] of [[[0.3, 1.7, 0.35], [0.2, -1, 0.4]], [[-0.2, 1.4, 0.45], [0.5, 1, 0.1]]]) b.tube([p, [p[0] + d[0] * 0.15, p[1] + d[1] * 0.2, p[2] + d[2] * 0.1], [p[0] + d[0] * 0.25, p[1] + d[1] * 0.35, p[2] + d[2] * 0.15]], 0.012, 0x6a5a40, null, 6, 4);
    // abgebrochenes Ohr am Boden
    b.capsule(0.11, 0.42, st, { p: [1.15, 0.13, 0.55], r: [Math.PI / 2, 0.6, 0] }, 4, 10);
    b.add(new THREE.IcosahedronGeometry(0.12, 0), st, { p: [1.05, 0.08, -0.6], r: [1, 2, 0] });
    return b.geometry();
  });
}
function buildStatueBruch(opts = {}) {
  const S = clamp(Number(opts.size ?? 3), 0.5, 20) / 3.25;
  const root = new THREE.Group();
  const m = mesh(statueGeo(), stoneMat(), { s: S }, true);
  m.receiveShadow = true;
  root.add(m);
  return makeModel('statue_bruch', root, () => {});
}

// =============================================================================================
// Ruinen-Torbogen
// =============================================================================================
function torbogenGeo(W, H) {
  return cached(`w4:torbogen:${W}:${H}`, () => {
    const b = new Build();
    const ri = W / 2, ro = W / 2 + 0.7, yc = Math.max(1, H - ro), P = 0.85;
    // Pfeiler mit Basis und Kapitell
    for (const s of [1, -1]) {
      const z = s * (ri + P / 2);
      b.box(P + 0.2, 0.3, P + 0.2, RUIN.stoneLow, { p: [0, 0.15, z] }, 0.04, 1);
      b.add(new THREE.BoxGeometry(P, yc - 0.55, P, 1, 4, 1), stoneV(s), { p: [0, 0.3 + (yc - 0.55) / 2, z] });
      b.box(P + 0.2, 0.25, P + 0.2, RUIN.stoneHi, { p: [0, yc - 0.125, z] }, 0.04, 1);
      b.box(P + 0.05, 0.08, P + 0.05, RUIN.inlay, { p: [0, yc - 0.3, z] }, 0.02, 1);
      b.add(displace(new THREE.SphereGeometry(0.3, 10, 6), 0.06, 5, s, false), RUIN.moss, { p: [0.2, 0.3, z + s * 0.2], s: [1.3, 0.5, 1.2] });
    }
    // Keilsteine (9), Schlussstein türkis verziert
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a0 = Math.PI * (i / n) + 0.01, a1 = Math.PI * ((i + 1) / n) - 0.01;
      const key = i === (n - 1) / 2;
      const ro2 = ro + (key ? 0.18 : 0);
      const sh = new THREE.Shape();
      sh.moveTo(Math.cos(a0) * ri, Math.sin(a0) * ri);
      sh.absarc(0, 0, ri, a0, a1, false);
      sh.lineTo(Math.cos(a1) * ro2, Math.sin(a1) * ro2);
      sh.absarc(0, 0, ro2, a1, a0, true);
      sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth: P * 0.9, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1, curveSegments: 3 });
      g.translate(0, 0, -P * 0.45);
      g.rotateY(Math.PI / 2);
      b.add(g, i % 2 ? RUIN.stone : RUIN.stoneHi, { p: [0, yc, 0] });
      if (key) {
        b.add(new THREE.OctahedronGeometry(0.16, 0), RUIN.inlay, { p: [P * 0.46, yc + ri + 0.4, 0], s: [0.6, 1.2, 1] });
        b.torus(0.2, 0.03, RUIN.gold, { p: [P * 0.47, yc + ri + 0.4, 0], r: [0, Math.PI / 2, 0], s: [1, 1.4, 1] }, 4, 16);
      }
    }
    // Moos auf dem Bogen und hängende Ranken
    for (let i = 0; i < 4; i++) {
      const a = Math.PI * (0.2 + i * 0.2);
      b.add(displace(new THREE.SphereGeometry(0.28, 10, 6), 0.06, 5, i, false), RUIN.moss, { p: [0, yc + Math.sin(a) * (ro + 0.02), Math.cos(a) * (ro + 0.02)], s: [1.2, 0.5, 1.2] });
    }
    for (let i = 0; i < 3; i++) {
      const a = Math.PI * (0.3 + i * 0.2), len = 0.6 + hash1(i) * 0.7;
      const x0 = P * 0.3, y0 = yc + Math.sin(a) * ri, z0 = Math.cos(a) * ri;
      b.tube([[x0, y0, z0], [x0 + 0.05, y0 - len * 0.5, z0 + 0.05], [x0, y0 - len, z0 - 0.03]], 0.025, RUIN.mossDark, null, 8, 4);
      for (let j = 1; j <= 3; j++) b.sphere(0.06, RUIN.moss, { p: [x0 + 0.03, y0 - len * j / 3.2, z0 + (j % 2 ? 0.06 : -0.05)], s: [0.6, 0.4, 1] }, 8, 5);
    }
    return b.geometry();
  });
}
function buildTorbogen(opts = {}) {
  const W = clamp(Math.round((opts.width ?? 4) * 2) / 2, 1, 20), H = clamp(Math.round((opts.height ?? 4.5) * 2) / 2, 2, 30);
  const root = new THREE.Group();
  const m = mesh(torbogenGeo(W, H), stoneMat(), {}, true);
  m.receiveShadow = true;
  root.add(m);
  return makeModel('ruinen_torbogen', root, () => {});
}

// =============================================================================================
// Ruinen-Treppe
// =============================================================================================
function treppeGeo(n, W, rise, run) {
  return cached(`w4:treppe:${n}:${W}:${rise}:${run}`, () => {
    const b = new Build();
    for (let i = 0; i < n; i++) {
      const h = rise * (i + 1);
      b.add(roundedBox(run + 0.02, h, W, 0.06, SIDE.ALL, 0, 1), { v: (x, y, z, nx, ny) => (ny > 0.7 ? (i % 2 ? RUIN.stoneHi : RUIN.stone) : mix(RUIN.stoneLow, RUIN.stone, smoothstep(y / h + 0.5))) }, { p: [run * (i + 0.5), h / 2, 0] });
    }
    // Wangen (seitlich, schräg) mit türkisem Band
    for (const s of [1, -1]) {
      const sh = new THREE.Shape();
      sh.moveTo(-0.05, 0); sh.lineTo(n * run + 0.05, 0); sh.lineTo(n * run + 0.05, n * rise + 0.35); sh.lineTo(n * run - 0.35, n * rise + 0.35); sh.lineTo(-0.05, 0.55); sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1 });
      g.translate(0, 0, -0.175);
      b.add(g, stoneV(s * 2), { p: [0, 0, s * (W / 2 + 0.17)] });
      const len = Math.hypot(n * run, n * rise);
      b.box(len, 0.06, 0.37, RUIN.inlay, { p: [n * run / 2, n * rise / 2 + 0.47, s * (W / 2 + 0.17)], r: [0, 0, Math.atan2(n * rise, n * run)] }, 0.02, 1);
      b.add(displace(new THREE.SphereGeometry(0.25, 10, 6), 0.05, 5, s, false), RUIN.moss, { p: [0.1, 0.5, s * (W / 2 + 0.2)], s: [1.2, 0.5, 1] });
    }
    return b.geometry();
  });
}
function buildTreppe(opts = {}) {
  const n = clamp(Math.round(opts.steps ?? 5), 1, 30);
  const W = clamp(Math.round((opts.width ?? 3) * 4) / 4, 0.5, 20);
  const rise = clamp(Math.round((opts.rise ?? 0.35) * 100) / 100, 0.1, 1.5), run = clamp(Math.round((opts.run ?? 0.55) * 100) / 100, 0.2, 3);
  const root = new THREE.Group();
  const m = mesh(treppeGeo(n, W, rise, run), stoneMat(), {}, true);
  m.receiveShadow = true;
  root.add(m);
  root.userData.length = n * run; root.userData.height = n * rise;
  return makeModel('ruinen_treppe', root, () => {});
}

// =============================================================================================
// Ranken
// =============================================================================================
function rankenGeo(L, kind) {
  return cached(`w4:ranken:${L}:${kind}`, () => {
    const b = new Build();
    const n = Math.max(2, Math.round(L * 2));
    const leaf = (p, d, s = 1) => {
      const g = new THREE.SphereGeometry(1, 8, 5); g.scale(0.07 * s, 0.015, 0.13 * s); g.translate(0, 0, 0.12 * s);
      b.add(g, { v: (x, y, z) => mix(RUIN.mossDark, 0x8ae05a, smoothstep(z / 0.25)) }, placed(p, d, new THREE.Vector3(1, 1, 1)));
    };
    if (kind === 'boden') {
      for (let k = 0; k < n; k++) {
        const z0 = (k / (n - 1) - 0.5) * 0.8;
        const pts = [];
        for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push([t * L, 0.04 + Math.abs(Math.sin(t * 9 + k)) * 0.04, z0 + Math.sin(t * 6 + k * 2) * 0.25]); }
        b.tube(pts, 0.025, RUIN.mossDark, null, 18, 4);
        for (let i = 1; i < 7; i++) { const p = new THREE.Vector3(...pts[i - 1]).lerp(new THREE.Vector3(...pts[i]), 0.5); leaf(p, new THREE.Vector3(0.3, 0.6, i % 2 ? 1 : -1).normalize()); }
        b.sphere(0.05, k % 2 ? 0xff8ab8 : 0xfff06a, { p: [L * 0.8, 0.09, z0 + Math.sin(L * 0.8 * 6 + k * 2) * 0.25] }, 8, 6);
      }
    } else {
      // Querranke entlang z an der Kante, davon hängende Stränge
      const tp = [];
      for (let i = 0; i <= 8; i++) { const t = i / 8; tp.push([0.05, Math.sin(t * 7) * 0.05, (t - 0.5) * L]); }
      b.tube(tp, 0.035, RUIN.mossDark, null, 24, 5);
      for (let k = 0; k < n; k++) {
        const z0 = ((k + 0.5) / n - 0.5) * L, len = 0.6 + hash1(k + 2) * 1.0;
        const pts = [[0.05, 0, z0], [0.1, -len * 0.4, z0 + 0.05], [0.06, -len * 0.75, z0 - 0.04], [0.1, -len, z0]];
        b.tube(pts, 0.02, RUIN.mossDark, null, 10, 4);
        for (let j = 1; j <= 4; j++) leaf(new THREE.Vector3(0.1, -len * j / 4.3, z0), new THREE.Vector3(1, -0.4, j % 2 ? 0.6 : -0.6).normalize(), 0.9);
        if (k % 2) b.sphere(0.045, 0xff8ab8, { p: [0.12, -len, z0] }, 8, 6);
      }
    }
    return b.geometry();
  });
}
function buildRanken(opts = {}) {
  const L = clamp(Math.round((opts.length ?? 3) * 2) / 2, 0.5, 20);
  const kind = opts.kind === 'boden' ? 'boden' : 'haengend';
  const root = new THREE.Group();
  const sway = joint();
  sway.add(mesh(rankenGeo(L, kind), vcol(0.6, { side: THREE.DoubleSide }, 'w4leaf'), {}, true));
  root.add(sway);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const s = clamp(Number(st.sway ?? 0.3), 0, 1);
    if (kind === 'haengend') sway.rotation.z = Math.sin(clk.t * 1.2) * 0.06 * s;
  };
  return makeModel('ranken', root, update);
}

export const MODELS = {
  lautsprecher: buildLautsprecher,
  neon_ring: buildNeonRing,
  equalizer_saeule: buildEqualizer,
  wolkeninsel: buildWolkeninsel,
  windrad: buildWindrad,
  ruinen_saeule: buildRuinenSaeule,
  statue_bruch: buildStatueBruch,
  ruinen_torbogen: buildTorbogen,
  ruinen_treppe: buildTreppe,
  ranken: buildRanken,
};
