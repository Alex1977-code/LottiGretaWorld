// Kulisse Welt 6 „Wolkeninseln“, Teil 2: Dschungel (6-4), Maschinenhalle (6-6), Minenschacht (6-7). Eigene Gestaltung,
// Kartenqualität, ohne Spielzeug-Look (Kulissen-Materialien `toy: false`), backbar. Maßstab Meter, Vorderseite +X.
// Wiederverwendet (nicht neu gebaut): Minen-Teile 'holzbalken', 'schiene_stueck', 'lore', 'grubenlaterne' (Welt 5),
// Lianen 'liane' und Giftpilze 'giftpilz' (Welt 4).
//
// riesenblatt     Riesenblatt-Staude: fünf gewaltige, gebogene Blätter mit heller Mittelrippe und Adern. Ursprung = Fußpunkt.
//                 opts { size (Höhe ≈ size, 2,5), seed (1) }  state { sway (0..1) }
// dschungel_liane hängende Liane mit Blattpaaren und kleinen Blüten. **Ursprung = Aufhängung oben**, hängt bis −length.
//                 opts { length (4), seed (1) }  state { sway (0..1) }
// giftbluete      Giftblüte: dicke lila Blütenblätter mit giftgrünen Tupfen, leuchtender grüner Stempel, Stängel mit Blättern.
//                 opts { size (Höhe ≈ size, 1,2) }  state { glow (0..1, Standard pulsierend) }
// zahnrad         Zahnrad (Wanddeko, dreht sich): Zähne, Speichen, Nabe mit Bolzen; Fläche in Y-Z, Achse X.
//                 **Ursprung = Achsmitte.**  opts { radius (1,5), thick (0,35), teeth (≈ 9·radius), color: 'messing'|'stahl'|'kupfer' }
//                 state { angle (rad, überschreibt), speed (rad/s, Standard 0) }
// rohrleitung     Industrierohr mit Flanschen und Schrauben. **Ursprung = Achsmitte am Anschluss x = 0**, Achse +X.
//                 opts { kind: 'gerade' (x = 0 … length) | 'bogen' (Viertelbogen nach +Z, Biegeradius 3·radius) | 'ventil'
//                 (2 m mit Handrad und Manometer), length (4), radius (0,35), color: 'kupfer'|'stahl'|'gruen' }
//                 state { steam (bool: Dampf zischt aus dem Ventil bzw. einer Flanschnaht) }
// kessel          Dampfkessel: genieteter Kupferkessel mit Kuppel, Schornstein, Manometer, glühender Feuertür, Rohren.
//                 opts { height (3), radius (1,1) }  state { steam (bool), glow (0..1 Feuer, Standard 1) }
// schacht_geruest Minenschacht-Gerüst: Eckpfosten, Rahmen alle 2 m, Diagonalstreben hinten/seitlich, Leiter, Laternenhaken.
//                 **Ursprung = Mitte unten**, vorn (+X) offen.  opts { width (Z, 4), depth (X, 3), height (6), ladder (true) }

import {
  THREE, TAU, Build, cached, mesh, joint, makeModel, Clock, damp, clamp, mix, col, smoothstep, lerp, glowSprite, placed,
  vcol, instMesh,
} from '../lib/kit.js';
import { W6, kulMat, kulMat2, glowV, gradV, taperTube, hash1, noise3, Puffs } from '../lib/w6Geos.js';

const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const kulMetal = () => vcol(0.38, { toy: false, metalness: 0.45 }, 'w6kulmetal');

// =============================================================================================
// Riesenblatt
// =============================================================================================
/** Blatt entlang +X (Länge len, Breite wid), gefaltet an der Mittelrippe, nach unten gebogen. Gitter mit Vertexfarben. */
function leafGeo(len, wid, droop, NL = 12, NW = 6) {
  const pos = [], idx = [];
  for (let i = 0; i <= NL; i++) {
    const t = i / NL;
    const half = wid * Math.sin(Math.PI * Math.pow(t, 0.75)) * (t > 0.92 ? (1 - t) / 0.08 * 0.6 + 0.4 : 1) * 0.5;
    for (let j = 0; j <= NW; j++) {
      const s = (j / NW) * 2 - 1;
      const x = t * len, z = s * half;
      const y = Math.abs(s) * half * 0.35 - droop * t * t * len;
      pos.push(x, y, z);
    }
  }
  for (let i = 0; i < NL; i++) for (let j = 0; j < NW; j++) {
    const a = i * (NW + 1) + j, b = a + 1, c = a + NW + 1, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
function riesenblattGeo(S, seed) {
  return cached(`w6:blatt:${S}:${seed}`, () => {
    const b = new Build();
    const n = 5;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + hash1(seed + i) * 0.5;
      const len = S * (0.8 + hash1(seed * 3 + i) * 0.35), wid = len * 0.6;
      const up = 0.8 + hash1(i * 5 + seed) * 0.55;
      // Stiel
      const base = [Math.cos(a) * 0.08, 0, Math.sin(a) * 0.08];
      const tip = [Math.cos(a) * S * 0.25, S * up * 0.5, Math.sin(a) * S * 0.25];
      b.add(taperTube([base, [Math.cos(a) * S * 0.08, S * up * 0.3, Math.sin(a) * S * 0.08], tip], (t) => S * 0.025 * (1 - t * 0.4), 8, 6), gradV(W6.leafLow, W6.leaf), null);
      const lg = leafGeo(len, wid, 0.22 + hash1(i * 9) * 0.12);
      const m = new THREE.Matrix4().compose(new THREE.Vector3(...tip), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a, 1.15 - up * 0.25, 'YXZ')), new THREE.Vector3(1, 1, 1));
      b.add(lg, { v: (x, y, z) => {
        const t = x / len, rib = Math.abs(z) < wid * 0.04;
        const vein = Math.abs(Math.sin((x - Math.abs(z) * 0.9) / len * 28)) > 0.93;
        return rib ? mix(W6.vein, W6.leafHi, t) : vein ? mix(W6.leaf, W6.vein, 0.5) : mix(W6.leafLow, W6.leafHi, smoothstep(0.25 + Math.abs(z) / wid * 0.6 + noise3(x * 2, z * 2, i) * 0.3 - 0.15));
      } }, m);
    }
    return b.geometry();
  });
}
function buildRiesenblatt(opts = {}) {
  const S = Math.max(0.5, num(opts.size, 2.5)), seed = Math.round(num(opts.seed, 1));
  const root = new THREE.Group();
  const plant = joint();
  plant.add(mesh(riesenblattGeo(S, seed), kulMat2(), {}, true));
  root.add(plant);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const sw = clamp(num(st.sway, 0), 0, 1);
    plant.rotation.z = Math.sin(clk.t * 1.4) * 0.03 * sw;
    plant.rotation.x = Math.sin(clk.t * 1.1 + 2) * 0.03 * sw;
  };
  return makeModel('riesenblatt', root, update);
}

// =============================================================================================
// Dschungel-Liane
// =============================================================================================
function lianeGeo(L, seed) {
  return cached(`w6:liane:${L}:${seed}`, () => {
    const b = new Build();
    const pts = [];
    const n = Math.max(4, Math.round(L * 1.5));
    for (let i = 0; i <= n; i++) { const t = i / n; pts.push([Math.sin(t * 5 + seed) * 0.12 * t, -t * L, Math.cos(t * 4 + seed) * 0.1 * t]); }
    b.add(taperTube(pts, (t) => 0.055 - t * 0.025, n * 6, 7), { v: (x, y) => mix(0x3a6a2a, 0x7ab84a, smoothstep(noise3(0, y * 3, 0))) }, null);
    // Blattpaare und Blüten
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    const leaves = Math.round(L * 3);
    for (let k = 1; k < leaves; k++) {
      const t = k / leaves, p = curve.getPointAt(t);
      for (const s of [1, -1]) {
        const lg = leafGeo(0.32, 0.16, 0.25, 6, 4);
        const m = new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (s > 0 ? 0 : Math.PI) + t * 7 + seed, -0.5, 'YXZ')), new THREE.Vector3(1, 1, 1));
        b.add(lg, { v: (x, y, z) => mix(W6.leafLow, W6.leafHi, smoothstep(x / 0.32 * 0.6 + Math.abs(z) * 2)) }, m);
      }
      if (k % 3 === 1) for (let f = 0; f < 5; f++) { const a = (f / 5) * TAU; b.sphere(0.04, 0xff5ab8, { p: [p.x + Math.cos(a) * 0.05 + 0.06, p.y, p.z + Math.sin(a) * 0.05], s: [1, 0.5, 1] }, 6, 4); }
    }
    return b.geometry();
  });
}
function buildLiane(opts = {}) {
  const L = Math.max(0.5, num(opts.length, 4)), seed = Math.round(num(opts.seed, 1));
  const root = new THREE.Group();
  const swing = joint();
  swing.add(mesh(lianeGeo(L, seed), kulMat2(), {}, true));
  root.add(swing);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const sw = clamp(num(st.sway, 0.2), 0, 1);
    swing.rotation.z = Math.sin(clk.t * 1.1) * 0.06 * sw;
    swing.rotation.x = Math.sin(clk.t * 0.8 + 1) * 0.04 * sw;
  };
  return makeModel('dschungel_liane', root, update);
}

// =============================================================================================
// Giftblüte
// =============================================================================================
function giftGeo(S) {
  return cached(`w6:gift:${S}`, () => {
    const b = new Build();
    const H = S * 0.62;
    b.add(taperTube([[0, 0, 0], [0.04 * S, H * 0.4, 0], [-0.02 * S, H * 0.8, 0.02 * S], [0, H, 0]], (t) => S * 0.05 * (1 - t * 0.3), 10, 7), gradV(0x2a6a2a, 0x6ab84a), null);
    for (const s of [1, -1]) {
      const lg = leafGeo(S * 0.45, S * 0.22, 0.4, 8, 4);
      b.add(lg, { v: (x, y, z) => mix(0x1e5a2a, 0x7ad04a, smoothstep(x / (S * 0.45) * 0.5 + Math.abs(z) / S)) }, new THREE.Matrix4().compose(new THREE.Vector3(0, H * 0.25, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, s > 0 ? 0.4 : Math.PI + 0.4, 0.5, 'YXZ')), new THREE.Vector3(1, 1, 1)));
    }
    // Blüte: 6 dicke, offene Blütenblätter (Sternform, Spitzen leicht hochgebogen)
    const petal = (a) => {
      const g = new THREE.SphereGeometry(1, 14, 10);
      const m = new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * S * 0.2, H + S * 0.07, Math.sin(a) * S * 0.2), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a, 0.38, 'YXZ')), new THREE.Vector3(S * 0.22, S * 0.045, S * 0.12));
      b.add(g, { v: (x, y, z, nx, ny) => {
        const spot = noise3(x * 5 + a * 3, y * 5, z * 5) > 0.68;
        return spot ? col(0xb8ff3a) : mix(W6.giftLow, W6.giftHi, smoothstep(x * 0.8 + 0.5));
      } }, m);
    };
    for (let i = 0; i < 6; i++) petal((i / 6) * TAU + 0.2);
    b.sphere(S * 0.09, gradV(W6.giftLow, W6.gift), { p: [0, H + S * 0.02, 0] }, 12, 8);
    return b.geometry();
  });
}
const giftCoreGeo = (S) => cached(`w6:giftcore:${S}`, () => {
  const b = new Build();
  b.sphere(S * 0.07, { v: (x, y, z, nx, ny) => mix(0x6aff3a, 0xeaffa0, smoothstep(ny * 0.6 + 0.4)) }, { p: [0, S * 0.62 + S * 0.1, 0] }, 12, 8);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; b.sphere(S * 0.025, 0xd8ff6a, { p: [Math.cos(a) * S * 0.06, S * 0.62 + S * 0.17, Math.sin(a) * S * 0.06] }, 6, 4); }
  return b.geometry();
});
function buildGiftbluete(opts = {}) {
  const S = Math.max(0.3, num(opts.size, 1.2));
  const root = new THREE.Group();
  root.add(mesh(giftGeo(S), kulMat2(), {}, true));
  const core = mesh(giftCoreGeo(S), glowV());
  const glow = glowSprite(0x6aff2a, S * 0.5, 0.4);
  glow.position.y = S * 0.74;
  root.add(core, glow);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const g = st.glow !== undefined ? clamp(num(st.glow, 1), 0, 1) : 0.75 + Math.sin(clk.t * 2.4) * 0.25;
    glow.visible = g > 0.05;
    glow.scale.setScalar(S * (0.3 + g * 0.3));
    core.scale.setScalar(0.9 + g * 0.15);
    core.position.y = -S * 0.72 * (0.9 + g * 0.15 - 1);
  };
  return makeModel('giftbluete', root, update);
}

// =============================================================================================
// Zahnrad
// =============================================================================================
const METAL = { messing: [0x9a6a18, 0xffe08a], stahl: [0x4a5468, 0xd8e2f0], kupfer: [0x8a3a1a, 0xffa878] };
function gearGeo(R, T, n, color) {
  const C = METAL[color];
  return cached(`w6:gear:${R}:${T}:${n}:${color}`, () => {
    const b = new Build();
    const s = new THREE.Shape();
    const rIn = R * 0.86, rOut = R;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU, da = TAU / n;
      const pts = [[rIn, a0], [rIn, a0 + da * 0.18], [rOut, a0 + da * 0.3], [rOut, a0 + da * 0.62], [rIn, a0 + da * 0.74]];
      pts.forEach(([r, a], k) => { const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i === 0 && k === 0) s.moveTo(x, y); else s.lineTo(x, y); });
    }
    s.closePath();
    // Aussparungen zwischen den Speichen
    const spokes = 5;
    for (let i = 0; i < spokes; i++) {
      const a0 = (i / spokes) * TAU + 0.25, a1 = a0 + TAU / spokes - 0.5;
      const h = new THREE.Path();
      h.absarc(0, 0, R * 0.7, a0, a1, false);
      h.absarc(0, 0, R * 0.32, a1, a0, true);
      h.closePath();
      s.holes.push(h);
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: true, bevelThickness: T * 0.15, bevelSize: T * 0.12, bevelSegments: 1, curveSegments: 6 });
    g.translate(0, 0, -T / 2);
    g.rotateY(Math.PI / 2); // Fläche → Y-Z, Achse X
    b.add(g, { v: (x, y, z, nx) => mix(C[0], C[1], smoothstep(Math.abs(nx) * 0.5 + 0.2 + noise3(y * 2, z * 2, 0) * 0.3)) }, null);
    b.cyl(R * 0.2, R * 0.2, T * 1.6, gradV(C[0], C[1]), { r: [0, 0, Math.PI / 2] }, 18);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; b.cyl(R * 0.035, R * 0.035, T * 1.7, 0x3a3a48, { p: [0, Math.cos(a) * R * 0.13, Math.sin(a) * R * 0.13], r: [0, 0, Math.PI / 2] }, 6); }
    b.cyl(R * 0.07, R * 0.07, T * 2.2, 0x2a2a34, { r: [0, 0, Math.PI / 2] }, 10);
    return b.geometry();
  });
}
function buildZahnrad(opts = {}) {
  const R = Math.max(0.2, num(opts.radius, 1.5)), T = Math.max(0.05, num(opts.thick, 0.35));
  const n = Math.max(6, Math.round(num(opts.teeth, R * 9)));
  const color = METAL[opts.color] ? opts.color : 'messing';
  const root = new THREE.Group();
  const spin = joint();
  spin.add(mesh(gearGeo(R, T, n, color), kulMetal(), {}, true));
  root.add(spin);
  let ang = 0;
  const update = (dt, st) => {
    if (st.angle !== undefined) ang = Number(st.angle) || 0; else ang += dt * num(st.speed, 0);
    spin.rotation.x = ang;
  };
  return makeModel('zahnrad', root, update);
}

// =============================================================================================
// Rohrleitung
// =============================================================================================
const PIPE = { kupfer: [0x8a3a1a, 0xffa070], stahl: [0x4a5468, 0xc8d2e0], gruen: [0x1e5a3a, 0x6ac88a] };
function rohrGeo(kind, L, r, color) {
  const C = PIPE[color];
  return cached(`w6:rohr:${kind}:${L}:${r}:${color}`, () => {
    const b = new Build();
    const tubeV = { v: (x, y, z, nx, ny) => mix(C[0], C[1], smoothstep(ny * 0.5 + 0.5)) };
    const flange = (p, dir) => {
      const d = new THREE.Vector3(...dir).normalize();
      const g = new THREE.CylinderGeometry(r * 1.35, r * 1.35, r * 0.35, 18); g.rotateX(Math.PI / 2);
      b.add(g, gradV(0x3a3a48, 0x8a8a9a), placed(new THREE.Vector3(...p), d, new THREE.Vector3(1, 1, 1)));
      const up = Math.abs(d.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      const u = new THREE.Vector3().crossVectors(d, up).normalize(), v = new THREE.Vector3().crossVectors(d, u);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; const q = new THREE.Vector3(...p).addScaledVector(u, Math.cos(a) * r * 1.15).addScaledVector(v, Math.sin(a) * r * 1.15); b.add(new THREE.CylinderGeometry(r * 0.09, r * 0.09, r * 0.5, 6).rotateX(Math.PI / 2), 0xd8d8e0, placed(q, d, new THREE.Vector3(1, 1, 1))); }
    };
    const straight = (x0, x1) => { b.cyl(r, r, x1 - x0, tubeV, { p: [(x0 + x1) / 2, 0, 0], r: [0, 0, Math.PI / 2] }, 16, true); };
    if (kind === 'bogen') {
      const R = 3 * r;
      const g = new THREE.TorusGeometry(R, r, 12, 16, Math.PI / 2); g.rotateX(-Math.PI / 2); g.translate(0, 0, R);
      b.add(g, tubeV, null);
      flange([0.05, 0, 0], [1, 0, 0]); flange([R, 0, R - 0.05], [0, 0, 1]);
    } else {
      const len = kind === 'ventil' ? 2 : L;
      straight(0, len);
      flange([0.05, 0, 0], [1, 0, 0]); flange([len - 0.05, 0, 0], [1, 0, 0]);
      for (let x = 2; x < len - 0.5; x += 2) flange([x, 0, 0], [1, 0, 0]);
      if (kind === 'ventil') {
        b.cyl(r * 0.7, r * 0.9, r * 1.4, gradV(0x3a3a48, 0x8a8a9a), { p: [1, r * 0.9, 0] }, 14);
        b.cyl(r * 0.12, r * 0.12, r * 0.9, 0xb8b8c0, { p: [1, r * 1.9, 0] }, 8);
        b.torus(r * 0.75, r * 0.1, gradV(0x9a1a1a, 0xff5a4a), { p: [1, r * 2.3, 0], r: [Math.PI / 2, 0, 0] }, 8, 24);
        for (let i = 0; i < 4; i++) b.cyl(r * 0.06, r * 0.06, r * 1.4, 0xd83a2a, { p: [1, r * 2.3, 0], r: [0, (i / 4) * Math.PI, Math.PI / 2] }, 6);
        // Manometer
        b.cyl(r * 0.08, r * 0.08, r * 0.8, 0x8a8a9a, { p: [1.6, r * 1.2, 0] }, 6);
        const dial = new THREE.CylinderGeometry(r * 0.45, r * 0.45, r * 0.2, 20); dial.rotateZ(Math.PI / 2);
        b.add(dial, (x, y, z, nx) => (nx > 0.9 ? col(0xfff6e0) : col(0x5a5a68)), { p: [1.6, r * 1.9, 0] });
        b.box(r * 0.05, r * 0.35, r * 0.04, 0xd8202a, { p: [1.6 + r * 0.11, r * 1.95, r * 0.05], r: [0.7, 0, 0] }, 0, 1);
      }
      // Halterungen
      for (let x = 1; x < len; x += 2) b.box(r * 0.5, r * 1.1, r * 2.6, gradV(0x2a2a34, 0x6a6a7a), { p: [x, -r * 1.4, 0] }, 0.03, 1);
    }
    return b.geometry();
  });
}
function buildRohrleitung(opts = {}) {
  const kind = ['gerade', 'bogen', 'ventil'].includes(opts.kind) ? opts.kind : 'gerade';
  const L = Math.max(0.5, num(opts.length, 4)), r = Math.max(0.08, num(opts.radius, 0.35));
  const color = PIPE[opts.color] ? opts.color : 'kupfer';
  const root = new THREE.Group();
  const own = [];
  root.add(mesh(rohrGeo(kind, kind === 'gerade' ? L : 0, r, color), kulMetal(), {}, true));
  const steam = new Puffs(8, 0xf0f4fa, { opacity: 0.75, radius: 3, cy: 0.5 });
  steam.mat.userData.toy = false;
  own.push(steam);
  root.add(steam.mesh);
  const clk = new Clock();
  let emit = 0;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    emit -= dt;
    if (st.steam && emit <= 0) {
      const p = kind === 'ventil' ? [1, r * 2.6, 0] : kind === 'bogen' ? [3 * r * 0.7, r * 1.1, 3 * r * 0.3] : [Math.min(2, L) - 0.05, r * 1.4, 0];
      steam.burst(p, { count: 2, speed: 0.6, up: 1.6, size: 0.12 + r * 0.2, life: 0.8, spread: 0.05 }); emit = 0.12;
    }
    steam.step(dt);
  };
  return makeModel('rohrleitung', root, update, own);
}

// =============================================================================================
// Dampfkessel
// =============================================================================================
function kesselGeo(H, R) {
  return cached(`w6:kessel:${H}:${R}`, () => {
    const b = new Build();
    const cu = { v: (x, y, z, nx, ny) => mix(0x8a3a1a, 0xffa878, smoothstep(nx * 0.3 + ny * 0.4 + 0.45 + noise3(x * 2, y * 2, z * 2) * 0.15)) };
    b.cyl(R, R, H * 0.72, cu, { p: [0, H * 0.42, 0] }, 28);
    b.dome(R, cu, { p: [0, H * 0.78, 0], s: [1, 0.55, 1] }, Math.PI / 2, 28, 8);
    b.cyl(R * 1.05, R * 1.08, H * 0.08, gradV(0x2a2a34, 0x6a6a7a), { p: [0, H * 0.04, 0] }, 28);
    for (const y of [0.15, 0.45, 0.75]) {
      b.torus(R * 1.005, 0.03, gradV(0x6a2a10, 0xd88a5a), { p: [0, H * y, 0], r: [Math.PI / 2, 0, 0] }, 5, 40);
      for (let i = 0; i < 20; i++) { const a = (i / 20) * TAU; b.sphere(0.035, 0xffc08a, { p: [Math.cos(a) * R * 1.02, H * y + 0.07, Math.sin(a) * R * 1.02] }, 5, 4); }
    }
    // Schornstein, Sicherheitsventil
    b.cyl(R * 0.18, R * 0.2, H * 0.4, gradV(0x1e1e28, 0x5a5a6a), { p: [-R * 0.3, H * 1.0, 0] }, 12);
    b.cyl(R * 0.26, R * 0.2, H * 0.06, gradV(0x1e1e28, 0x5a5a6a), { p: [-R * 0.3, H * 1.22, 0] }, 12);
    b.cyl(R * 0.08, R * 0.1, H * 0.12, W6.brass, { p: [R * 0.35, H * 0.98, 0] }, 8);
    b.sphere(R * 0.1, W6.brassHi, { p: [R * 0.35, H * 1.05, 0] }, 8, 6);
    // Manometer vorn
    const dial = new THREE.CylinderGeometry(R * 0.28, R * 0.28, 0.08, 24); dial.rotateZ(Math.PI / 2);
    b.add(dial, (x, y, z, nx) => (nx > 0.9 ? col(0xfff6e0) : col(W6.brass)), { p: [R + 0.03, H * 0.62, 0] });
    b.torus(R * 0.28, 0.03, W6.brass, { p: [R + 0.07, H * 0.62, 0], r: [0, Math.PI / 2, 0] }, 5, 24);
    b.box(0.02, R * 0.22, 0.03, 0xd8202a, { p: [R + 0.08, H * 0.64, R * 0.05], r: [0.8, 0, 0] }, 0, 1);
    // Feuertür (Rahmen; das Glühen ist ein eigenes Mesh)
    b.box(0.08, H * 0.22, R * 0.75, gradV(0x1e1e28, 0x5a5a6a), { p: [R - 0.02, H * 0.22, 0] }, 0.03, 1);
    // Rohre zur Wand
    b.add(taperTube([[-R * 0.9, H * 0.6, 0], [-R * 1.4, H * 0.62, 0], [-R * 1.6, H * 0.9, 0], [-R * 1.6, H * 1.5, 0]], 0.1, 16, 8), cu, null);
    return b.geometry();
  });
}
const fireGeo = (H, R) => cached(`w6:kessel:fire:${H}:${R}`, () => {
  const b = new Build();
  for (let i = 0; i < 4; i++) b.box(0.03, H * 0.14, 0.05, { v: (x, y) => mix(0xff3a0a, 0xffe07a, smoothstep(0.5 - y / (H * 0.14))) }, { p: [R + 0.03, H * 0.22, (i / 3 - 0.5) * R * 0.5] }, 0, 1);
  return b.geometry();
});
function buildKessel(opts = {}) {
  const H = Math.max(1, num(opts.height, 3)), R = Math.max(0.3, num(opts.radius, 1.1));
  const root = new THREE.Group();
  const own = [];
  root.add(mesh(kesselGeo(H, R), kulMetal(), {}, true));
  const fire = mesh(fireGeo(H, R), glowV());
  const glow = glowSprite(0xff7a2a, R * 1.4, 0.6);
  glow.position.set(R + 0.25, H * 0.22, 0);
  root.add(fire, glow);
  const steam = new Puffs(10, 0xf0f4fa, { opacity: 0.75, radius: H * 2, cy: H });
  steam.mat.userData.toy = false;
  own.push(steam);
  root.add(steam.mesh);
  const clk = new Clock();
  let emit = 0;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t = clk.t;
    const g = clamp(num(st.glow, 1), 0, 1);
    fire.visible = g > 0.05;
    glow.visible = g > 0.05;
    glow.scale.setScalar(R * (1.1 + g * 0.4 + Math.sin(t * 9) * 0.06));
    emit -= dt;
    if (st.steam && emit <= 0) {
      steam.burst([-R * 0.3, H * 1.28, 0], { count: 2, speed: 0.5, up: 1.8, size: R * 0.22, life: 1.0, spread: 0.08 });
      if ((t % 2.5) < 0.15) steam.burst([R * 0.35, H * 1.08, 0], { count: 2, speed: 1.2, up: 1.2, size: R * 0.12, life: 0.5, spread: 0.03 });
      emit = 0.14;
    }
    steam.step(dt);
  };
  return makeModel('kessel', root, update, own);
}

// =============================================================================================
// Minenschacht-Gerüst
// =============================================================================================
function schachtGeo(Wz, Dx, H, ladder) {
  return cached(`w6:schacht:${Wz}:${Dx}:${H}:${ladder}`, () => {
    const b = new Build();
    const wood = (k = 0) => ({ v: (x, y, z, nx, ny) => mix(mix(W6.woodDark, W6.woodLow, 0.4 + k), W6.wood, smoothstep(ny * 0.3 + nx * 0.3 + 0.35 + noise3(x * 3, y * 6, z * 3) * 0.35 - 0.15)) });
    const T = 0.22;
    for (const sx of [1, -1]) for (const sz of [1, -1]) b.box(T, H, T, wood(), { p: [sx * (Dx / 2 - T / 2), H / 2, sz * (Wz / 2 - T / 2)] }, 0.03, 1);
    for (let y = 2; y <= H + 0.01; y += 2) {
      for (const sz of [1, -1]) b.box(Dx, T * 0.8, T * 0.8, wood(0.1), { p: [0, y - T / 2, sz * (Wz / 2 - T / 2)] }, 0.03, 1);
      b.box(T * 0.8, T * 0.8, Wz, wood(0.1), { p: [-(Dx / 2 - T / 2), y - T / 2, 0] }, 0.03, 1);
      // Eisenwinkel
      for (const sz of [1, -1]) b.box(0.05, 0.3, 0.3, gradV(0x2a2a34, 0x7a7a8a), { p: [-(Dx / 2 - T) - 0.01, y - T / 2, sz * (Wz / 2 - T)] }, 0.01, 1);
    }
    // Diagonalstreben hinten (−X) und an den Seiten
    for (let y = 0; y < H - 0.5; y += 2) {
      const len = Math.hypot(Wz - T, 2);
      b.box(T * 0.6, len, T * 0.6, wood(-0.1), { p: [-(Dx / 2 - T / 2) - 0.05, y + 1, 0], r: [Math.atan2(Wz - T, 2) * ((y / 2) % 2 ? 1 : -1), 0, 0] }, 0.03, 1);
      for (const sz of [1, -1]) { const l2 = Math.hypot(Dx - T, 2); b.box(T * 0.55, l2, T * 0.55, wood(-0.1), { p: [0, y + 1, sz * (Wz / 2 - T / 2 + 0.05)], r: [0, 0, Math.atan2(Dx - T, 2) * ((y / 2) % 2 ? -1 : 1)] }, 0.03, 1); }
    }
    if (ladder) {
      for (const s of [1, -1]) b.box(0.08, H, 0.08, wood(0.2), { p: [-(Dx / 2) + 0.35, H / 2, s * 0.3] }, 0.02, 1);
      for (let y = 0.3; y < H; y += 0.35) b.box(0.06, 0.06, 0.6, wood(0.25), { p: [-(Dx / 2) + 0.35, y, 0] }, 0.01, 1);
    }
    // Laternenhaken und Seilrolle oben
    b.box(0.6, 0.12, 0.12, 0x3a3a48, { p: [0, H - 0.3, Wz / 2 - 0.3] }, 0.02, 1);
    b.cyl(0.35, 0.35, 0.12, gradV(0x2a2a34, 0x8a8a9a), { p: [0, H + 0.3, 0], r: [Math.PI / 2, 0, 0] }, 16);
    b.box(Dx, 0.15, 0.15, wood(), { p: [0, H + 0.05, 0] }, 0.02, 1);
    return b.geometry();
  });
}
function buildSchacht(opts = {}) {
  const Wz = Math.max(1, num(opts.width, 4)), Dx = Math.max(1, num(opts.depth, 3)), H = Math.max(2, num(opts.height, 6));
  const root = new THREE.Group();
  root.add(mesh(schachtGeo(Wz, Dx, H, opts.ladder !== false), kulMat(0.75), {}, true));
  return makeModel('schacht_geruest', root, () => {});
}

export const MODELS = {
  riesenblatt: buildRiesenblatt,
  dschungel_liane: buildLiane,
  giftbluete: buildGiftbluete,
  zahnrad: buildZahnrad,
  rohrleitung: buildRohrleitung,
  kessel: buildKessel,
  schacht_geruest: buildSchacht,
};
