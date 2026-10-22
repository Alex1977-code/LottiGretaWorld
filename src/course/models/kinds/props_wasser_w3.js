// Lagunen- und Unterwasser-Requisiten Welt 3 (3-5 Röhrenlagune, 3-Kapitän See-Diorama). Eigene Gestaltung.
// Maßstab Meter, Ursprung = Mitte der Unterseite (Ausnahmen genannt), Vorderseite nach +X; state darf ein String sein.
//
// rohrnetz        Röhren-Netz: waagerechte grüne Röhrenstücke zum Zusammenstecken, Rohrachse auf y = radius
//                 (liegt auf dem Boden). **Ursprung = Unterkante am Anschluss x = 0.**
//                 opts { kind: 'gerade'|'bogen'|'t'|'kreuz'|'ende', length (gerade, 3), radius (0,9), color (0x3cbf3a) }
//                   gerade: x = 0 … length;  bogen: Viertelbogen von +X nach +Z (Biegeradius 2·radius, endet bei
//                   (2r, ·, 2r)); t: x = 0 … 4r, Abzweig nach +Z in der Mitte (bis z = 2r); kreuz: dazu Abzweig nach −Z;
//                   ende: 1,2 m Rohr mit Mündungsrand bei x = 0 (Öffnung nach −X, dunkles Inneres).  state –
// koralle         Koralle.  opts { kind: 'ast' (rosa Astkoralle, ≈1,4 m) | 'faecher' (violette Fächerkoralle, ≈1,6 m) |
//                 'hirn' (gelbgrüne Hirnkoralle, Ø 1,2 m) }  state { anim: 'idle' }  wiegt sich (ast/faecher).
// seetang         Seetang-Büschel: opts.count Stränge mit Blättern, wiegen sich in der Strömung.
//                 opts { height (2,5), count (3) }  state { anim: 'idle', current? (−1..1 Strömung nach ±X) }
// blasen          aufsteigende Luftblasen über einem Steinschlot.  opts { height (3), count (10) }  state –
// steg            Holzsteg auf Pfählen (Planken mit Fugen, Seilwicklungen, Poller). Verlauf x = 0 … length,
//                 Deck-Oberkante y = height.  opts { length (4), width (2), height (1,2) }  state –
// holzsteg        Holzsteg mit Hub (3-Kapitän): Deck gleitet an hohen Pfählen (Zahnleisten, gelb-schwarze Marken)
//                 um bis zu opts.hub nach oben; Schwimmfässer unter dem Deck. Verlauf x = 0 … length.
//                 opts { length (5), width (2), hub (2) }  state { lift: 0..1 }  Deck-Oberkante y = 0,5 + lift·hub
//                 (root.userData.deckY(lift)).
// wasserschalter  Wasserstand-Schalter 1 m: türkiser Knopf mit weißem Wellen-Zeichen auf blauem Sockel, Tropfen-Anzeige.
//                 state { anim: 'idle'|'pressed' }  pressed: Knopf flach (0,25 s), Tropfen leuchtet.
// schiffswrack    Schiffswrack (Kulisse) ≈10 m lang: schräg liegender Rumpf mit Bullaugen, Loch, gebrochener Mast mit
//                 zerfetztem Segel, Seetang.  opts { size (Faktor, 1) }  state –

import {
  THREE, TAU, Build, cached, vcol, basic, std, mesh, joint, makeModel, Clock, damp, clamp, mix, smoothstep, instMesh,
  setInst, metal,
} from '../lib/kit.js';
import { alongY, odd } from '../lib/kit_w3.js';

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

// =============================================================================================
// Röhren-Netz
// =============================================================================================
function pipeNetGeo(kind, L, R, color) {
  return cached(`w3:pipenet:${kind}:${L}:${R}:${color}`, () => {
    const b = new Build();
    const body = { v: (x, y, z, nx, ny) => mix(color, 0xffffff, 0.12 * smoothstep(ny)) };
    const light = mix(color, 0xffffff, 0.35);
    const ring = (p, alongX) => b.torus(R + 0.03, 0.08, light, { p, r: alongX ? [0, Math.PI / 2, 0] : [0, 0, 0] }, 8, 36);
    const tubeX = (x0, x1) => b.add(new THREE.CylinderGeometry(R, R, x1 - x0, 36, 1, true), body, { p: [(x0 + x1) / 2, R, 0], r: [0, 0, Math.PI / 2] });
    const tubeZ = (x, z0, z1) => b.add(new THREE.CylinderGeometry(R, R, Math.abs(z1 - z0), 36, 1, true), body, { p: [x, R, (z0 + z1) / 2], r: [Math.PI / 2, 0, 0] });
    if (kind === 'gerade') { tubeX(0, L); ring([0.15, R, 0], true); ring([L - 0.15, R, 0], true); }
    else if (kind === 'bogen') {
      // Viertelbogen: Mittelpunkt (0, R, 2R), Start (0, R, 0) Richtung +X, Ende (2R, R, 2R) Richtung +Z
      const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, -1, 0)).setPosition(0, R, 2 * R);
      b.add(new THREE.TorusGeometry(2 * R, R, 24, 24, Math.PI / 2), body, m);
      ring([0.12, R, 0], true); ring([2 * R, R, 2 * R - 0.12], false);
    } else if (kind === 't' || kind === 'kreuz') {
      tubeX(0, 4 * R);
      tubeZ(2 * R, 0.5 * R, 2 * R);
      ring([2 * R, R, 2 * R - 0.12], false);
      if (kind === 'kreuz') { tubeZ(2 * R, -2 * R, -0.5 * R); ring([2 * R, R, -2 * R + 0.12], false); }
      b.sphere(R * 1.1, body, { p: [2 * R, R, 0] }, 28, 16);
      ring([0.15, R, 0], true); ring([4 * R - 0.15, R, 0], true);
    } else { // ende: Mündung bei x = 0, Öffnung nach −X
      tubeX(0.4, 1.2); ring([1.05, R, 0], true);
      const lip = [[R - 0.13, 0.45], [R + 0.12, 0.45], [R + 0.16, 0.4], [R + 0.16, 0.06], [R + 0.14, 0.0], [R - 0.13, 0.0]];
      b.lathe(lip, light, { p: [0.45, R, 0], r: [0, 0, Math.PI / 2] }, 36);
      b.add(new THREE.CylinderGeometry(R - 0.13, R - 0.13, 0.6, 28, 1, true), 0x14281a, { p: [0.45, R, 0], r: [0, 0, Math.PI / 2] });
    }
    return b.geometry();
  });
}
function buildRohrnetz(opts = {}) {
  const kind = ['gerade', 'bogen', 't', 'kreuz', 'ende'].includes(opts.kind) ? opts.kind : 'gerade';
  const L = clamp(Number(opts.length ?? 3), 0.5, 40), R = clamp(Number(opts.radius ?? 0.9), 0.3, 3);
  const color = Number(opts.color ?? 0x3cbf3a);
  const root = new THREE.Group();
  const m = mesh(pipeNetGeo(kind, L, R, color), vcol(0.22, { side: THREE.DoubleSide }, 'w3pipenet'), {}, true);
  m.receiveShadow = true;
  root.add(m);
  if (kind === 'ende') root.add(mesh(cached(`w3:pipehole:${R}`, () => { const g = new THREE.CircleGeometry(R - 0.12, 28); g.rotateY(Math.PI / 2); return g; }), basic('w3:pipehole', { color: 0x081008 }), { p: [0.75, R, 0] }));
  return makeModel('rohrnetz', root, () => {});
}

// =============================================================================================
// Korallen
// =============================================================================================
function coralGeo(kind) {
  return cached(`w3:coral:${kind}`, () => {
    const b = new Build();
    if (kind === 'ast') {
      const pink = (y0) => ({ v: (x, y) => mix(0xff5a8a, 0xffb0c8, smoothstep((y + y0) / 1.3)) });
      const branch = (pts, r) => { b.tube(pts, r, pink(0), null, 14, 7); const e = pts[pts.length - 1]; b.sphere(r * 1.15, 0xffc8da, { p: e }, 8, 6); };
      branch([[0, 0, 0], [0.02, 0.4, 0], [0.0, 0.8, 0.05], [0.05, 1.25, 0]], 0.08);
      branch([[0.0, 0.35, 0], [0.2, 0.55, 0.05], [0.32, 0.85, 0.1], [0.36, 1.05, 0.1]], 0.06);
      branch([[0.0, 0.5, 0], [-0.22, 0.7, -0.05], [-0.3, 0.95, -0.12], [-0.28, 1.15, -0.15]], 0.06);
      branch([[0.0, 0.25, 0], [0.05, 0.4, 0.22], [0.08, 0.7, 0.32], [0.1, 0.9, 0.35]], 0.055);
      branch([[0.0, 0.6, 0.02], [-0.06, 0.8, -0.25], [-0.05, 1.0, -0.3]], 0.05);
      branch([[0.2, 0.55, 0.05], [0.4, 0.62, -0.1], [0.5, 0.78, -0.15]], 0.04);
      b.sphere(0.25, 0xd06a8a, { p: [0, 0.03, 0], s: [1, 0.35, 1] }, 12, 6);
    } else if (kind === 'faecher') {
      // Fächer: flacher Halbkreis aus Rippen und Querstreben (Gitter), violett
      const R = 0.75, n = 9;
      for (let i = 0; i < n; i++) {
        const a = Math.PI * (0.12 + 0.76 * i / (n - 1));
        b.tube([[0, 0.15, 0], [Math.cos(a) * R * 0.5, 0.15 + Math.sin(a) * R * 0.5, 0.03 * Math.sin(i)], [Math.cos(a) * R, 0.15 + Math.sin(a) * R, 0]], 0.025, { v: (x, y) => mix(0x7a2ab8, 0xd88aff, smoothstep(y / 0.9)) }, null, 8, 5);
      }
      for (const rr of [0.35, 0.55, 0.72]) b.add(new THREE.TorusGeometry(rr, 0.018, 5, 24, Math.PI * 0.76), { v: (x, y) => mix(0x9a4ad8, 0xe8b0ff, smoothstep(y / 0.8)) }, { p: [0, 0.15, 0], r: [0, 0, Math.PI * 0.12] });
      b.cyl(0.07, 0.12, 0.2, 0x6a2a9a, { p: [0, 0.08, 0] }, 10);
      // zweiter kleinerer Fächer
      for (let i = 0; i < 6; i++) {
        const a = Math.PI * (0.2 + 0.6 * i / 5);
        b.tube([[0.1, 0.1, 0.15], [0.1 + Math.cos(a) * 0.45, 0.1 + Math.sin(a) * 0.45, 0.25]], 0.02, 0xff7ac8, null, 4, 4);
      }
    } else {
      // Hirnkoralle: Kuppel mit gewundenen Rillen
      const g = new THREE.SphereGeometry(0.6, 48, 20, 0, TAU, 0, Math.PI / 2);
      const P = g.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i);
        const groove = Math.sin(v.x * 18 + Math.sin(v.z * 9) * 2.5) * Math.cos(v.z * 4);
        v.multiplyScalar(1 + 0.03 * groove); P.setXYZ(i, v.x, v.y, v.z);
      }
      g.computeVertexNormals();
      b.add(g, { v: (x, y, z) => (Math.sin(x * 18 + Math.sin(z * 9) * 2.5) * Math.cos(z * 4) > 0.2 ? new THREE.Color(0xd8e85a) : new THREE.Color(0x8aa830)) }, { s: [1, 0.8, 1] });
    }
    return b.geometry();
  });
}
function buildKoralle(opts = {}) {
  const kind = ['ast', 'faecher', 'hirn'].includes(opts.kind) ? opts.kind : 'ast';
  const root = new THREE.Group();
  const sway = joint();
  sway.add(mesh(coralGeo(kind), vcol(0.5, {}, 'w3coral'), {}, true));
  root.add(sway);
  const clk = new Clock();
  const update = (dt) => {
    clk.tick(dt, 'idle');
    if (kind === 'hirn') return;
    sway.rotation.set(Math.sin(clk.t * 1.1) * 0.04, 0, Math.sin(clk.t * 0.8) * 0.05);
  };
  return makeModel('koralle', root, update);
}

// =============================================================================================
// Seetang (Instanzen: Stängelstücke mit Blatt)
// =============================================================================================
const KELP_SEG = 0.32;
const kelpSegGeo = () => cached('w3:kelp:seg', () => {
  const b = new Build();
  b.cyl(0.03, 0.035, KELP_SEG, 0x2a7a3a, { p: [0, KELP_SEG / 2, 0] }, 6);
  const g = new THREE.SphereGeometry(1, 10, 6);
  g.scale(0.07, 0.2, 0.012);
  b.add(g, { v: (x, y) => mix(0x2f9a3a, 0x8ad84a, smoothstep(y / 0.2 + 0.5)) }, { p: [0.07, KELP_SEG * 0.6, 0], r: [0, 0, -0.5] });
  return b.geometry();
});
function buildSeetang(opts = {}) {
  const H = clamp(Number(opts.height ?? 2.5), 0.5, 12), n = clamp(Math.round(opts.count ?? 3), 1, 12);
  const k = Math.max(2, Math.round(H / KELP_SEG));
  const root = new THREE.Group();
  const inst = instMesh(kelpSegGeo(), vcol(0.5, { side: THREE.DoubleSide }, 'w3kelp'), n * k, H + 1, H / 2);
  inst.castShadow = true;
  root.add(inst);
  const roots = Array.from({ length: n }, (_, i) => ({ x: n === 1 ? 0 : Math.cos(i * 2.4) * 0.25, z: n === 1 ? 0 : Math.sin(i * 2.4) * 0.25, ph: i * 1.3, s: 0.8 + ((i * 7) % 5) / 10 }));
  const clk = new Clock();
  const M = new THREE.Matrix4(), Ls = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t = clk.t, cur = clamp(Number(st.current ?? 0), -1, 1);
    roots.forEach((r, i) => {
      M.makeTranslation(r.x, 0, r.z).multiply(Ls.makeRotationY(i * 2.1));
      const kk = Math.round(k * r.s);
      for (let j = 0; j < k; j++) {
        const idx = i * k + j;
        if (j >= kk) { inst.setMatrixAt(idx, ZERO); continue; }
        inst.setMatrixAt(idx, M);
        const bend = Math.sin(t * 1.3 + r.ph - j * 0.45) * 0.09 + cur * 0.06;
        q.setFromEuler(e.set(Math.cos(t * 0.9 + r.ph - j * 0.3) * 0.05, j % 2 ? Math.PI : 0, bend));
        // nächstes Glied: nach oben versetzt, gebogen; Blätter abwechselnd links/rechts
        Ls.compose(p.set(0, KELP_SEG, 0), q, one);
        M.multiply(Ls);
      }
    });
    inst.instanceMatrix.needsUpdate = true;
  };
  return makeModel('seetang', root, update, [inst]);
}

// =============================================================================================
// Blasen
// =============================================================================================
const ventGeo = () => cached('w3:vent', () => {
  const b = new Build();
  b.lathe([[0.45, 0], [0.4, 0.12], [0.25, 0.25], [0.14, 0.28], [0.1, 0.18], [0, 0.16]], { v: (x, y) => mix(0x5a6a7a, 0x9aa8b8, smoothstep(y / 0.28)) }, null, 14);
  return b.geometry();
});
function buildBlasen(opts = {}) {
  const H = clamp(Number(opts.height ?? 3), 0.5, 20), n = clamp(Math.round(opts.count ?? 10), 2, 40);
  const root = new THREE.Group();
  root.add(mesh(ventGeo(), vcol(0.8, {}, 'w3vent'), {}, true));
  const bub = instMesh(cached('w3:bubble', () => new THREE.SphereGeometry(1, 14, 10)), metal('w3:bubble', { color: 0xe8fbff, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.45, emissive: 0x18384a, depthWrite: false }, 1.5), n, H, H / 2);
  bub.renderOrder = 3;
  root.add(bub);
  const seeds = Array.from({ length: n }, (_, i) => ({ off: (i / n), r: 0.05 + ((i * 7) % 5) * 0.025, ph: i * 1.7 }));
  const clk = new Clock();
  const update = (dt) => {
    clk.tick(dt, 'idle');
    const t = clk.t;
    seeds.forEach((s, i) => {
      const k = (t * (0.35 + s.r) / H * 3 + s.off) % 1;
      const y = 0.25 + k * H, sc = s.r * (0.6 + k * 0.8) * (k > 0.95 ? (1 - k) / 0.05 : 1);
      setInst(bub, i, Math.sin(t * 3 + s.ph) * 0.08 * (0.3 + k), y, Math.cos(t * 2.6 + s.ph) * 0.08 * (0.3 + k), 0, 0, 0, [sc, sc * (1 + Math.sin(t * 9 + s.ph) * 0.08), sc]);
    });
    bub.instanceMatrix.needsUpdate = true;
  };
  return makeModel('blasen', root, update, [bub]);
}

// =============================================================================================
// Steg, Holzsteg mit Hub
// =============================================================================================
const PLANK = { a: 0xb47a46, b: 0x9a6236, dark: 0x5a3a22, rope: 0xe8d6a0, post: 0x7a4e2c };
function deckGeo(L, W) {
  return cached(`w3:deck:${L}:${W}`, () => {
    const b = new Build();
    const n = Math.max(2, Math.round(L / 0.3));
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) * (L / n);
      b.box(L / n - 0.03, 0.08, W, { v: (xx, y, z, nx, ny) => mix(i % 2 ? PLANK.a : PLANK.b, 0xd8a070, ny > 0.5 ? 0.15 : 0) }, { p: [x, -0.04, 0] }, 0.02, 1);
    }
    for (const s of [1, -1]) b.box(L, 0.14, 0.1, PLANK.dark, { p: [L / 2, -0.12, s * (W / 2 - 0.05)] }, 0.03, 1);
    return b.geometry();
  });
}
function stegGeo(L, W, H) {
  return cached(`w3:steg:${L}:${W}:${H}`, () => {
    const b = new Build();
    const k = Math.max(2, Math.round(L / 2) + 1);
    for (let i = 0; i < k; i++) {
      const x = 0.15 + (i / (k - 1)) * (L - 0.3);
      for (const s of [1, -1]) {
        b.cyl(0.11, 0.12, H + 0.25, PLANK.post, { p: [x, (H + 0.25) / 2, s * (W / 2 + 0.06)] }, 10);
        b.torus(0.12, 0.025, PLANK.rope, { p: [x, H * 0.75, s * (W / 2 + 0.06)], r: [Math.PI / 2, 0, 0] }, 5, 12);
        b.sphere(0.11, 0x8a5a34, { p: [x, H + 0.25, s * (W / 2 + 0.06)], s: [1, 0.5, 1] }, 10, 6);
      }
    }
    b.cyl(0.12, 0.14, 0.3, 0x3a3a44, { p: [L - 0.4, H + 0.15, W / 2 - 0.25] }, 12);
    b.cyl(0.17, 0.17, 0.06, 0x3a3a44, { p: [L - 0.4, H + 0.33, W / 2 - 0.25] }, 12);
    return b.geometry();
  });
}
function buildSteg(opts = {}) {
  const L = clamp(Number(opts.length ?? 4), 1, 40), W = clamp(Number(opts.width ?? 2), 0.6, 10), H = clamp(Number(opts.height ?? 1.2), 0.2, 10);
  const root = new THREE.Group();
  const posts = mesh(stegGeo(L, W, H), vcol(0.75, {}, 'w3wood2'), {}, true);
  const deck = mesh(deckGeo(L, W), vcol(0.75, {}, 'w3wood2'), { p: [0, H, 0] }, true);
  deck.receiveShadow = true;
  root.add(posts, deck);
  return makeModel('steg', root, () => {});
}
function liftPostsGeo(L, W, top) {
  return cached(`w3:liftposts:${L}:${W}:${top}`, () => {
    const b = new Build();
    for (const x of [0.2, L - 0.2]) for (const s of [1, -1]) {
      const z = s * (W / 2 + 0.16);
      b.box(0.24, top, 0.24, { v: (xx, y) => (Math.floor((y + top / 2) / 0.25) % 2 ? new THREE.Color(PLANK.post) : new THREE.Color(0x8a5a34)) }, { p: [x, top / 2, z] }, 0.04, 1);
      // Zahnleiste und gelb-schwarze Marke oben
      const k = Math.round(top / 0.2);
      for (let i = 1; i < k; i++) b.box(0.06, 0.06, 0.08, 0x9aa0b0, { p: [x, i * 0.2, z - s * 0.14], r: [0, 0, 0.785] }, 0.01, 1);
      b.add(new THREE.BoxGeometry(0.26, 0.2, 0.26, 4, 4, 4), (xx, y, zz) => (odd((xx + y + zz) * 14) ? 0xffd21f : 0x1a1a22), { p: [x, top - 0.1, z] });
    }
    return b.geometry();
  });
}
const barrelGeo = () => cached('w3:barrel', () => {
  const b = new Build();
  b.lathe([[0.0, -0.32], [0.2, -0.32], [0.25, -0.15], [0.26, 0], [0.25, 0.15], [0.2, 0.32], [0, 0.32]], (x, y) => (Math.abs(Math.abs(y) - 0.22) < 0.03 ? 0x5a5a66 : 0xb47a46), { r: [Math.PI / 2, 0, 0] }, 14);
  return b.geometry();
});
function buildHolzsteg(opts = {}) {
  const L = clamp(Number(opts.length ?? 5), 1, 40), W = clamp(Number(opts.width ?? 2), 0.6, 10), hub = clamp(Number(opts.hub ?? 2), 0, 10);
  const top = 0.5 + hub + 0.6;
  const root = new THREE.Group();
  const posts = mesh(liftPostsGeo(L, W, top), vcol(0.7, {}, 'w3wood2'), {}, true);
  const deck = joint([0, 0.5, 0]);
  const deckM = mesh(deckGeo(L, W), vcol(0.75, {}, 'w3wood2'), {}, true);
  deckM.receiveShadow = true;
  const barrels = instMesh(barrelGeo(), vcol(0.6, {}, 'w3barrel'), 4, L, 0);
  [[L * 0.25, 0.45], [L * 0.25, -0.45], [L * 0.75, 0.45], [L * 0.75, -0.45]].forEach(([x, z], i) => setInst(barrels, i, x, -0.42, z * W * 0.6));
  deck.add(deckM, barrels);
  root.add(posts, deck);
  root.userData.deckY = (lift) => 0.5 + clamp(lift, 0, 1) * hub;
  let y = 0.5;
  const update = (dt, st) => {
    const target = 0.5 + clamp(Number(st.lift ?? 0), 0, 1) * hub;
    y = dt > 0 ? damp(y, target, 6, dt) : target;
    deck.position.y = y;
  };
  return makeModel('holzsteg', root, update, [barrels]);
}

// =============================================================================================
// Wasserstand-Schalter
// =============================================================================================
function waveShape(w) {
  const s = new THREE.Shape();
  const n = 3, h = 0.045;
  s.moveTo(-w, -h);
  for (let i = 0; i <= 12; i++) { const x = -w + (2 * w * i) / 12; s.lineTo(x, Math.sin((i / 12) * n * TAU) * h * 0.6 + h); }
  for (let i = 12; i >= 0; i--) { const x = -w + (2 * w * i) / 12; s.lineTo(x, Math.sin((i / 12) * n * TAU) * h * 0.6 - h * 0.2); }
  return s;
}
function switchBaseGeo() {
  return cached('w3:wswitch:base', () => {
    const b = new Build();
    b.box(1, 0.3, 1, { v: (x, y, z, nx, ny) => mix(0x1a4a9a, 0x3a7ad8, smoothstep(ny * 0.5 + 0.5)) }, { p: [0, 0.15, 0] }, 0.08, 2);
    b.torus(0.4, 0.04, 0xffffff, { p: [0, 0.3, 0], r: [Math.PI / 2, 0, 0] }, 6, 32);
    return b.geometry();
  });
}
function switchButtonGeo() {
  return cached('w3:wswitch:button', () => {
    const b = new Build();
    b.cyl(0.36, 0.38, 0.22, { v: (x, y, z, nx, ny) => mix(0x0fa8b8, 0x5ae8f0, smoothstep(ny * 0.5 + 0.5)) }, { p: [0, 0.11, 0] }, 32);
    for (let i = 0; i < 3; i++) b.extrude(waveShape(0.22), 0.02, 0xffffff, { p: [0, 0.225, -0.12 + i * 0.12], r: [-Math.PI / 2, 0, 0] }, 0.006, 4, 1);
    return b.geometry();
  });
}
const dropGeo = () => cached('w3:drop', () => {
  const b = new Build();
  b.sphere(0.09, 0xffffff, { p: [0, 0.09, 0] }, 14, 10);
  b.cone(0.075, 0.13, 0xffffff, { p: [0, 0.2, 0] }, 14);
  return b.geometry();
});
function buildWasserschalter() {
  const root = new THREE.Group();
  root.add(mesh(switchBaseGeo(), vcol(0.35), {}, true));
  const btn = joint([0, 0.3, 0], mesh(switchButtonGeo(), vcol(0.25), {}, true));
  const dropMat = new THREE.MeshStandardMaterial({ color: 0x3ab8ff, roughness: 0.2, emissive: 0x0a3a6a });
  const drop = mesh(dropGeo(), dropMat, { p: [0.51, 0.06, 0], s: [0.8, 0.8, 0.8] });
  drop.rotation.z = 0;
  root.add(btn, drop);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const pr = anim === 'pressed';
    btn.scale.y = pr ? Math.max(0.15, 1 - clk.age / 0.25 * 0.85) : damp(btn.scale.y, 1, 12, dt);
    const g = pr ? 0.6 + Math.sin(clk.t * 6) * 0.3 : 0.1;
    dropMat.emissive.setRGB(0.05 * g, 0.4 * g, 0.9 * g);
  };
  return makeModel('wasserschalter', root, update, [dropMat], { initial: 'idle' });
}

// =============================================================================================
// Schiffswrack (Kulisse)
// =============================================================================================
function wreckGeo() {
  return cached('w3:wreck', () => {
    const b = new Build();
    const wood = { v: (x, y, z, nx, ny) => (Math.abs(Math.sin(y * 9)) < 0.1 ? new THREE.Color(0x3a2618) : mix(0x6a4428, 0x9a6a3e, smoothstep(ny * 0.4 + nx * 0.2 + 0.5))) };
    // Rumpf: gestreckte Halbschale (Kiel unten), Bug +X
    const hull = new THREE.SphereGeometry(1, 28, 14, 0, TAU, Math.PI / 2, Math.PI / 2);
    b.add(hull, wood, { p: [0, 1.6, 0], s: [5, 1.7, 1.6] });
    // Deck mit gezacktem Loch (dunkel) und losen Planken
    b.box(9.4, 0.18, 3.0, (x, y, z, nx, ny) => (ny > 0.5 && Math.hypot((x - 1.2) / 1.3, z / 0.8) < 1 + Math.sin(Math.atan2(z, x - 1.2) * 7) * 0.18 ? 0x1a100a : 0x7a5232), { p: [0, 1.62, 0] }, 0.05, 1);
    for (let i = 0; i < 3; i++) b.box(1.4, 0.06, 0.25, 0x8a6038, { p: [0.8 + i * 0.5, 1.78 + i * 0.05, -0.4 + i * 0.35], r: [0.2 * i, 0.6 + i * 0.4, 0.25 - i * 0.1] }, 0.02, 1);
    // gebrochene Reling
    for (const s of [1, -1]) for (let i = 0; i < 8; i++) if ((i + (s > 0 ? 0 : 3)) % 5 !== 2) b.cyl(0.04, 0.04, 0.5, 0x5a3a22, { p: [-3.6 + i * 1.0, 1.95, s * 1.42], r: [0, 0, (i % 3 - 1) * 0.15] }, 6);
    // Heckaufbau
    b.box(2.2, 1.3, 2.6, wood, { p: [-3.4, 2.3, 0] }, 0.1, 1);
    for (const s of [1, -1]) for (let i = 0; i < 4; i++) {
      b.torus(0.14, 0.04, 0xc8a050, { p: [-1.6 + i * 1.3, 0.95 + (i % 2) * 0.05, s * 1.47], r: [0, 0, 0] }, 6, 12);
      b.cyl(0.12, 0.12, 0.04, 0x0a1a2a, { p: [-1.6 + i * 1.3, 0.95 + (i % 2) * 0.05, s * 1.45], r: [Math.PI / 2, 0, 0] }, 10);
    }
    // Loch im Rumpf
    b.sphere(1, 0x140c08, { p: [1.6, 0.8, 1.42], s: [0.7, 0.45, 0.1] }, 14, 8);
    // gebrochener Mast mit Segelfetzen
    b.cyl(0.14, 0.17, 4.2, 0x5a3a22, { p: [0.6, 3.6, 0], r: [0.25, 0, 0.3] }, 10);
    b.cyl(0.08, 0.08, 2.4, 0x5a3a22, { p: [0.15, 4.9, 0.3], r: [Math.PI / 2, 0, 0.4] }, 8);
    const sail = new THREE.PlaneGeometry(2.2, 1.8, 8, 6);
    const P = sail.attributes.position;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i); P.setZ(i, Math.sin(x * 2) * 0.15); if (y < -0.5) P.setY(i, y + Math.abs(Math.sin(x * 7)) * 0.5); }
    sail.computeVertexNormals();
    b.add(sail, { v: (x, y) => mix(0xb8ac8a, 0xe8dcc0, smoothstep(y + 0.6)) }, { p: [0.25, 3.95, 0], r: [0, Math.PI / 2, 0.1] });
    // Seetang am Rumpf
    for (let i = 0; i < 5; i++) b.tube([[-3 + i * 1.4, 0, 1.6], [-3 + i * 1.4 + 0.1, 0.6, 1.65], [-3 + i * 1.4 - 0.1, 1.2, 1.62]], 0.05, 0x2f8a3a, null, 8, 5);
    return b.geometry();
  });
}
function buildSchiffswrack(opts = {}) {
  const S = clamp(Number(opts.size ?? 1), 0.2, 5);
  const root = new THREE.Group();
  const m = mesh(wreckGeo(), vcol(0.85, { side: THREE.DoubleSide }, 'w3wreck'), { p: [0, -0.35 * S, 0], r: [0.32, 0, -0.1], s: S }, true);
  m.receiveShadow = true;
  root.add(m);
  return makeModel('schiffswrack', root, () => {});
}

export const MODELS = {
  rohrnetz: buildRohrnetz,
  koralle: buildKoralle,
  seetang: buildSeetang,
  blasen: buildBlasen,
  steg: buildSteg,
  holzsteg: buildHolzsteg,
  wasserschalter: buildWasserschalter,
  schiffswrack: buildSchiffswrack,
};
