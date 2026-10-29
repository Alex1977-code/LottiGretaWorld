// Gimmicks Welt Stern „Sternenzelt“ (Kurs-Modus), Teil 2: Holz-Athletik mit Schienenwalzen (S-3) und Schienenbrett-Fahrt im
// Kanonen-Sternwerk (S-9). Eigene Gestaltung im Spielzeug-Look; die Schienen selbst sind Kulisse (schlicht, backbar). Maßstab Meter,
// Fahrtrichtung +X (Walze: rollt entlang Z); state darf ein String sein.
//
// schienenwalze   rollende Schienenwalze (S-3): großer Holzzylinder aus hellen und dunklen Dauben mit drei Rillen rundum, Jahresring-
//                 Stirnseiten, roten Laufrädern mit Goldnabe und Bolzen. Achse entlang X; rollt auf zwei Schienen entlang Z.
//                 **Ursprung = Laufkante der Räder unter der Mitte (= Schienen-Oberkante)**; Achse bei y = radius + 0,2,
//                 Oberseite des Holzes y = 2·radius + 0,2; Räder bei x = ±length/2 (Spurweite = length).
//                 opts  { radius (1,5), length (6) }
//                 state { angle (rad um +X; positiv rollt die Oberseite nach −Z) | speed (rad/s) }
//                 root.userData.axleY, .top, .gauge.
// walzen_schiene  Schienenpaar für die Walzen (S-3): zwei Holzbalken mit Stahlkappe und Goldbolzen entlang Z, Querverstrebungen, Holz-
//                 stützen mit Kreuzstreben bis zum Boden, rot-weiße Prellböcke an den Enden. Kulisse (ohne Spielzeug-Look, backbar).
//                 **Ursprung = Mitte zwischen den Schienen, Schienen-Oberkante (y = 0)**; Schienen von z = −length/2 bis +length/2 bei
//                 x = ±gauge/2.  opts { length (12), gauge (6, = Walzenlänge), height (Stützen unter der Oberkante, 3; 0 = keine),
//                 ends (true: Prellböcke) }  state –
// schienenbrett   Schienenbrett (S-9): weißes Hightech-Deck mit Neonkante, Warnstreifen vorn/hinten und Fahrpfeil auf einem Fahrwerk
//                 mit vier Laufrädern, das auf einer Rohrschiene (brett_schiene) läuft. **Ursprung = Schienen-Oberkante unter der Mitte**,
//                 Deck-Oberseite y = 0,62.  opts { size: [x, z] ([3, 2]) }
//                 state { speed (m/s: Räder drehen, ab 3 m/s Funken), anim: 'idle' | 'fall' (kippt nach vorn ab und fällt, progress
//                         0..1 in 1 s) }   root.userData.top.
// brett_schiene   Rohrschiene für das Schienenbrett: leuchtende Rohrschiene mit Halteklammern und Lichtpunkten. Kulisse (backbar).
//                 **Ursprung = Anfang, Schienen-Oberkante (y = 0)**, verläuft nach +X.
//                 opts { kind: 'gerade' (length 8) | 'bogen' (radius 6, angle π/2: Bogen von +X nach −Z; negativer Winkel → +Z),
//                        posts (Stützenhöhe darunter, 0 = keine) }  state –
// weiche          Weiche (S-9, mit dem Kanonen-Helm umschießen): Rohrschiene von −X, beweglicher Zungenarm (Drehpunkt im Ursprung),
//                 zwei abzweigende Äste nach +X (links −Z, rechts +Z) und ein Signalmast mit runder Zielscheibe, deren Pfeil die
//                 Richtung zeigt (beim Umstellen dreht sie sich). **Ursprung = Drehpunkt der Zunge, Schienen-Oberkante (y = 0).**
//                 Äste enden bei (4,6, 0, ∓1,6).  opts { }
//                 state { dir: −1 | 'links' (Standard) | 1 | 'rechts', hit (0..1: Zielscheibe blitzt auf) }
//                 root.userData.target → Mitte der Zielscheibe (lokal).

import {
  THREE, TAU, Build, cached, vcol, basic, mesh, joint, makeModel, Clock, damp, clamp, col, mix, smoothstep, lerp, instMesh, setInst,
  glowSprite, roundedBox, SIDE, puffyStarGeo, placed,
} from '../lib/kit.js';
import {
  ST, num, prog, gradV, noise3, hash1, taperTube, fxPuffs, memo, toyS, kulS, kulSMetal, glowS, flatStarGeo, sz2, k2, rod, dirTo, puffyGeo,
  roundRectShape,
} from '../lib/starGeos.js';

const _v = new THREE.Vector3();

// =============================================================================================
// Schienenwalze
// =============================================================================================
const WALZE_LIFT = 0.2;   // Radius der Laufräder über dem Holz
function walzeGeo(R, L) {
  return cached(`star:walze:${k2(R)}:${k2(L)}`, () => {
    const b = new Build();
    // Holzkörper (Achse X) mit Dauben (Längsstreifen) und drei Rillen rundum
    const hs = Math.max(8, Math.round(L * 5));
    const g = new THREE.CylinderGeometry(R, R, L, 40, hs, true);
    g.rotateZ(Math.PI / 2);
    const grooves = [-L * 0.3, 0, L * 0.3];
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i);
      let k = 0;
      for (const gx of grooves) k = Math.max(k, 1 - smoothstep(Math.abs(x - gx) / 0.16));
      P.setY(i, P.getY(i) * (1 - k * 0.06)); P.setZ(i, P.getZ(i) * (1 - k * 0.06));
    }
    g.computeVertexNormals();
    b.add(g, { v: (x, y, z) => {
      const a = Math.atan2(z, y), stave = ((a / TAU) * 14 + 14) % 1, idx = Math.floor(((a / TAU) * 14 + 14)) % 2;
      let groove = 0; for (const gx of grooves) groove = Math.max(groove, 1 - smoothstep(Math.abs(x - gx) / 0.14));
      const grain = noise3(x * 1.2, Math.cos(a) * 3, Math.sin(a) * 3);
      let c = idx ? mix(ST.wood, ST.woodHi, grain * 0.7) : mix(ST.woodLow, ST.wood, grain * 0.8 + 0.2);
      c = mix(c, ST.woodDark, Math.max(1 - smoothstep(stave / 0.05), 1 - smoothstep((1 - stave) / 0.05)) * 0.7);
      return mix(c, ST.woodDark, groove * 0.85);
    } });
    // Stirnseiten: Jahresringe
    for (const s of [1, -1]) {
      const cap = new THREE.CircleGeometry(R * 0.995, 40);
      cap.rotateY(s * Math.PI / 2);
      b.add(cap, { v: (x, y, z) => { const r = Math.hypot(y, z) / R; return (Math.floor(r * 7 + noise3(y * 2, z * 2, s) * 0.6) % 2) ? col(ST.woodRing) : mix(ST.wood, ST.woodHi, 0.4); } }, { p: [s * (L / 2 - 0.01), 0, 0] });
      // Laufrad (rot lackiert) mit Spurkranz, Goldnabe, Bolzen
      const wr = R + WALZE_LIFT;
      b.cyl(wr, wr, 0.28, { v: (x, y, z, nx) => (Math.abs(nx) > 0.6 ? mix(ST.woodRed, ST.woodRedHi, 0.25) : mix(0x9a1a1e, ST.woodRed, smoothstep(y / wr * 0.5 + 0.5))) }, { p: [s * (L / 2 + 0.14), 0, 0], r: [0, 0, Math.PI / 2] }, 40);
      b.cyl(wr + 0.12, wr + 0.12, 0.08, gradV(0x6a0a14, ST.woodRed, 0.4, 0.5), { p: [s * (L / 2 + 0.03), 0, 0], r: [0, 0, Math.PI / 2] }, 40);
      b.cyl(R * 0.32, R * 0.36, 0.2, gradV(ST.starLow, ST.starHi, 0.5, 0.5), { p: [s * (L / 2 + 0.36), 0, 0], r: [0, 0, Math.PI / 2] }, 24);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; b.sphere(0.07, ST.starHi, { p: [s * (L / 2 + 0.29), Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.62] }, 6, 4); }
      b.add(flatStarGeo(R * 0.2, 0.05, 0.025), ST.starHi, { p: [s * (L / 2 + 0.47), 0, 0], r: [0, 0, -s * Math.PI / 2] });
    }
    return b.geometry();
  });
}
function buildSchienenwalze(opts = {}) {
  const R = clamp(num(opts.radius, 1.5), 0.3, 8), L = clamp(num(opts.length, 6), 1, 40);
  const root = new THREE.Group();
  const axle = joint([0, R + WALZE_LIFT, 0]);
  const log = mesh(walzeGeo(R, L), toyS(0.5, 'walze'), {}, true);
  log.receiveShadow = true;
  axle.add(log);
  root.add(axle);
  root.userData.axleY = R + WALZE_LIFT; root.userData.top = 2 * R + WALZE_LIFT; root.userData.gauge = L;
  let ang = 0;
  const update = (dt, st) => {
    if (st.angle !== undefined) ang = num(st.angle, 0); else ang += dt * num(st.speed, 0);
    log.rotation.x = ang;
  };
  return makeModel('schienenwalze', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Walzen-Schiene (Kulisse)
// =============================================================================================
function walzenSchieneGeo(L, G, H, ends) {
  return cached(`star:wschiene:${k2(L)}:${k2(G)}:${k2(H)}:${ends}`, () => {
    const b = new Build();
    const beam = { v: (x, y, z, nx, ny) => mix(ST.woodLow, mix(ST.wood, ST.woodHi, noise3(x * 2, y * 6, z * 0.6) * 0.8), smoothstep(ny * 0.5 + 0.55)) };
    for (const s of [1, -1]) {
      const x = s * G / 2;
      b.box(0.42, 0.36, L, beam, { p: [x, -0.24, 0] }, 0.05, 1);
      b.box(0.3, 0.07, L, gradV(ST.silverLow, ST.silverHi, 0.6, 0.45), { p: [x, -0.035, 0] }, 0.02, 1);
      const nb = Math.max(2, Math.round(L));
      for (let i = 0; i < nb; i++) for (const u of [-0.17, 0.17]) b.sphere(0.035, ST.star, { p: [x + u, -0.2, -L / 2 + (i + 0.5) * (L / nb)] }, 6, 4);
      // Stützen mit Kreuzstreben
      if (H > 0.05) {
        const np = Math.max(2, Math.round(L / 3) + 1);
        for (let i = 0; i < np; i++) {
          const z = -L / 2 + 0.3 + (i / (np - 1)) * (L - 0.6);
          b.box(0.32, H, 0.32, beam, { p: [x, -0.42 - H / 2 + 0.2, z] }, 0.04, 1);
          if (i < np - 1) {
            const z2 = -L / 2 + 0.3 + ((i + 1) / (np - 1)) * (L - 0.6);
            rod(b, [x, -0.45, z], [x, -0.42 - H + 0.4, z2], 0.06, 0.06, beam, 6);
            rod(b, [x, -0.45, z2], [x, -0.42 - H + 0.4, z], 0.06, 0.06, beam, 6);
          }
        }
      }
    }
    // Querverstrebung unter den Schienen (alle 3 m)
    const nq = Math.max(2, Math.round(L / 3) + 1);
    for (let i = 0; i < nq; i++) { const z = -L / 2 + 0.3 + (i / (nq - 1)) * (L - 0.6); b.box(G, 0.2, 0.26, beam, { p: [0, -0.5, z] }, 0.03, 1); }
    if (ends) for (const s of [1, -1]) for (const sx of [1, -1]) {
      b.box(0.5, 0.6, 0.3, (x, y) => (Math.floor((y + 1) * 5) % 2 ? col(ST.woodRed) : col(ST.white)), { p: [sx * G / 2, 0.24, s * (L / 2 - 0.15)] }, 0.06, 1);
    }
    return b.geometry();
  });
}
function buildWalzenSchiene(opts = {}) {
  const L = clamp(num(opts.length, 12), 1, 200), G = clamp(num(opts.gauge, 6), 0.5, 40), H = clamp(num(opts.height, 3), 0, 60);
  const root = new THREE.Group();
  const m = mesh(walzenSchieneGeo(L, G, H, opts.ends !== false), kulS(0.7), {}, true);
  m.receiveShadow = true;
  root.add(m);
  return makeModel('walzen_schiene', root, () => {}, []);
}

// =============================================================================================
// Schienenbrett
// =============================================================================================
const BR = { deckY: 0.62, railR: 0.14 };
function brettDeckGeo(X, Z) {
  return cached(`star:brett:deck:${k2(X)}:${k2(Z)}`, () => {
    const b = new Build();
    const t = 0.2;
    b.add(roundedBox(X, t, Z, 0.07, SIDE.ALL, 0, 2), { v: (x, y, z, nx, ny) => (ny > 0.6 ? mix(ST.hullLow, ST.hullHi, smoothstep(0.6 + noise3(x, 0, z) * 0.3)) : mix(0x5a6688, ST.hull, smoothstep(ny * 0.5 + 0.5))) }, { p: [0, BR.deckY - t / 2, 0] });
    // Warnstreifen vorn und hinten
    for (const s of [1, -1]) {
      const g = new THREE.PlaneGeometry(0.34, Z - 0.16, 1, 1);
      g.rotateX(-Math.PI / 2);
      const fine = new THREE.PlaneGeometry(0.34, Z - 0.16, 2, Math.max(4, Math.round(Z * 6))); fine.rotateX(-Math.PI / 2);
      g.dispose();
      b.add(fine, (x, y, z) => (Math.floor((z + x * 1.2 + 10) * 3.2) % 2 ? col(ST.warnY) : col(ST.warnK)), { p: [s * (X / 2 - 0.25), BR.deckY + 0.004, 0] });
    }
    // Fahrpfeil (+X)
    const a = new THREE.Shape(); a.moveTo(-0.5, -0.18); a.lineTo(0.05, -0.18); a.lineTo(0.05, -0.4); a.lineTo(0.5, 0); a.lineTo(0.05, 0.4); a.lineTo(0.05, 0.18); a.lineTo(-0.5, 0.18); a.lineTo(-0.5, -0.18);
    const ag = puffyGeo(a, 0.03, 0.015, 2, 1); ag.rotateX(-Math.PI / 2);
    b.add(ag, 0x4ac8ff, { p: [0, BR.deckY + 0.02, 0], s: Math.min(X, Z) * 0.55 });
    // Fahrwerk: Gehäuse unter dem Deck, Schienenklammer
    b.box(X * 0.62, 0.3, 0.6, gradV(0x2a2e46, 0x6a7290, 0.5, 0.5), { p: [0, BR.deckY - 0.35, 0] }, 0.08, 2);
    for (const s of [1, -1]) b.box(X * 0.5, 0.26, 0.08, 0x3a3e58, { p: [0, 0.02, s * 0.22] }, 0.03, 1);
    return b.geometry();
  });
}
function brettGlowGeo(X, Z) {
  return cached(`star:brett:glow:${k2(X)}:${k2(Z)}`, () => {
    const b = new Build();
    const y = BR.deckY - 0.1;
    for (const s of [1, -1]) {
      b.box(X - 0.1, 0.05, 0.05, { v: (x) => mix(ST.neon, ST.neonHi, 0.5 + Math.sin(x * 4) * 0.3) }, { p: [0, y, s * (Z / 2 + 0.005)] }, 0, 1);
      b.box(0.05, 0.05, Z - 0.1, ST.neon, { p: [s * (X / 2 + 0.005), y, 0] }, 0, 1);
    }
    for (const s of [1, -1]) b.sphere(0.06, s > 0 ? 0xfff6a0 : 0xff4a6a, { p: [s * (X / 2 + 0.01), y, 0] }, 8, 6);
    return b.geometry();
  });
}
const brettWheelGeo = () => cached('star:brett:wheel', () => {
  const b = new Build();
  b.cyl(0.17, 0.17, 0.1, { v: (x, y, z, nx, ny) => mix(0x1a1c2a, 0x4a4e66, smoothstep(ny * 0.5 + 0.5)) }, { r: [Math.PI / 2, 0, 0] }, 16);
  b.cyl(0.08, 0.08, 0.12, ST.silverHi, { r: [Math.PI / 2, 0, 0] }, 10);
  b.box(0.04, 0.3, 0.125, ST.warnY, {}, 0, 1);
  return b.geometry();
});
function buildSchienenbrett(opts = {}) {
  const [X, Z] = sz2(opts.size, [3, 2]);
  const root = new THREE.Group();
  const own = [];
  const tip = joint();          // Kippgelenk (fall)
  const deck = mesh(brettDeckGeo(X, Z), toyS(0.3, 'brett', { metalness: 0.1 }), {}, true);
  deck.receiveShadow = true;
  const glow = mesh(brettGlowGeo(X, Z), glowS(), {});
  const NW = 4;
  const wheels = instMesh(brettWheelGeo(), toyS(0.4, 'brettrad'), NW, X, 0.2);
  const sparks = fxPuffs(12, 0xffd86a, { opacity: 0.95, emissive: 0xffa020, detail: 0, radius: X + 3, cy: 0.2 });
  own.push(sparks);
  tip.add(deck, glow, wheels);
  root.add(tip, sparks.mesh);
  root.userData.top = BR.deckY;
  const W = [[X * 0.24, 1], [-X * 0.24, 1], [X * 0.24, -1], [-X * 0.24, -1]];
  const clk = new Clock();
  let rot = 0, emit = 0;
  const update = (dt, st) => {
    const anim = st.anim === 'fall' ? 'fall' : 'idle';
    clk.tick(dt, anim);
    const sp = num(st.speed, 0);
    rot += dt * sp / 0.17;
    W.forEach(([x, s], i) => setInst(wheels, i, x, 0.17 - 0.02, s * 0.13, 0, 0, -rot, 1));
    wheels.instanceMatrix.needsUpdate = true;
    if (anim === 'fall') {
      const p = prog(st, clk, 1);
      tip.position.set(X / 2 * Math.min(1, p * 2) * 0.3, -4.9 * Math.max(0, p - 0.2) ** 2 * 3, 0);
      tip.rotation.z = -smoothstep(p * 1.6) * 0.9;
    } else { tip.position.set(0, Math.sin(clk.t * 9) * 0.006 * Math.min(1, Math.abs(sp)), 0); tip.rotation.z = 0; }
    emit -= dt;
    if (Math.abs(sp) > 3 && anim !== 'fall' && emit <= 0) { sparks.burst([-Math.sign(sp) * X * 0.24, 0.05, 0.13 * (Math.random() > 0.5 ? 1 : -1)], { count: 2, speed: 1.5, up: 1.2, size: 0.05, life: 0.35, spread: 0.05 }); emit = 0.06; }
    for (const it of sparks.items) if (it.age < it.life) it.v.y -= dt * 9;
    sparks.step(dt);
  };
  return makeModel('schienenbrett', root, update, [...own, wheels], { initial: 'idle' });
}

// =============================================================================================
// Rohrschiene (Kulisse) und Weiche
// =============================================================================================
/** Punkte einer Schiene: gerade (Länge L) oder Bogen (Radius R, Winkel A) ab dem Ursprung nach +X. */
function railPts(kind, L, R, A) {
  if (kind !== 'bogen') return [[0, 0, 0], [L / 3, 0, 0], [L * 2 / 3, 0, 0], [L, 0, 0]];
  const n = Math.max(4, Math.ceil(Math.abs(A) / 0.2));
  const sg = Math.sign(A) || 1;
  return Array.from({ length: n + 1 }, (_, i) => { const a = (i / n) * Math.abs(A); return [Math.sin(a) * R, 0, -sg * (R - Math.cos(a) * R)]; });
}
/** Rohrschiene entlang pts (Oberkante y = 0): Rohr, Klammern alle 1 m, Lichtpunkte (glow). */
function railBuild(b, gl, pts, posts = 0) {
  const r = BR.railR;
  const P = pts.map(([x, y, z]) => [x, y - r, z]);
  b.add(taperTube(P, r, Math.max(8, P.length * 6), 10), { v: (x, y, z, nx, ny) => mix(0x5a6a98, 0xe8f0ff, smoothstep(ny * 0.6 + 0.5)) });
  const curve = new THREE.CatmullRomCurve3(P.map((p) => new THREE.Vector3(...p)));
  const len = curve.getLength(), n = Math.max(1, Math.round(len));
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = curve.getPointAt(u), tg = curve.getTangentAt(u);
    const M = new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), tg), new THREE.Vector3(1, 1, 1));
    b.add(new THREE.TorusGeometry(r * 1.25, 0.035, 5, 14), 0x3a3e58, M.clone().multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)));
    if (i % 2 === 0) gl.add(new THREE.SphereGeometry(0.06, 8, 6), i % 4 ? ST.neonPink : ST.neon, M.clone().multiply(new THREE.Matrix4().makeTranslation(0, -r * 0.9, 0)));
    if (posts > 0.05 && i % 2 === 0) {
      b.cyl(0.08, 0.1, posts, gradV(0x3a3e58, 0x9aa6c8, 0.5, 0.5), { p: [p.x, p.y - r - posts / 2, p.z] }, 8);
      b.cyl(0.25, 0.3, 0.12, 0x3a3e58, { p: [p.x, p.y - r - posts, p.z] }, 10);
    }
  }
}
function railGeo(kind, L, R, A, posts) {
  return memo(`star:rail:${kind}:${k2(L)}:${k2(R)}:${k2(A)}:${k2(posts)}`, () => {
    const b = new Build(), gl = new Build();
    railBuild(b, gl, railPts(kind, L, R, A), posts);
    return { body: b.geometry(), glow: gl.geometry() };
  });
}
function buildBrettSchiene(opts = {}) {
  const kind = opts.kind === 'bogen' ? 'bogen' : 'gerade';
  const L = clamp(num(opts.length, 8), 0.5, 200), R = clamp(num(opts.radius, 6), 1, 100), A = clamp(num(opts.angle, Math.PI / 2), -TAU, TAU);
  const G = railGeo(kind, L, R, A, clamp(num(opts.posts, 0), 0, 50));
  const root = new THREE.Group();
  const m = mesh(G.body, kulSMetal(0.3), {}, true);
  root.add(m, mesh(G.glow, glowS(), {}));
  return makeModel('brett_schiene', root, () => {}, []);
}

const WEICHE = { tongue: 2.2, swing: 0.2, ends: [4.6, 1.6] };
function weicheGeo() {
  return memo('star:weiche', () => {
    const b = new Build(), gl = new Build();
    // Zulauf von −X, zwei Äste ab der Zungenspitze
    railBuild(b, gl, [[-2.2, 0, 0], [-1.4, 0, 0], [-0.7, 0, 0], [0, 0, 0]]);
    for (const s of [-1, 1]) {
      const tx = Math.cos(WEICHE.swing) * WEICHE.tongue, tz = s * Math.sin(WEICHE.swing) * WEICHE.tongue;
      railBuild(b, gl, [[tx, 0, tz], [tx + 0.8, 0, tz + s * 0.3], [3.6, 0, s * 1.2], [WEICHE.ends[0], 0, s * WEICHE.ends[1]]]);
    }
    // Grundplatte mit Drehteller und Lagerbock
    b.cyl(0.55, 0.6, 0.16, gradV(0x2a2e46, 0x8a94b8), { p: [0, -0.42, 0] }, 24);
    b.box(1.1, 0.12, 2.2, gradV(0x2a2e46, 0x6a7290), { p: [2.6, -0.5, 0] }, 0.04, 1);
    // Signalmast seitlich (−Z, hinter dem linken Ast)
    b.cyl(0.08, 0.1, 2.2, gradV(0x3a3e58, 0xb8c0d8), { p: [0.6, 0.6, -2.0] }, 10);
    b.cyl(0.3, 0.38, 0.14, 0x3a3e58, { p: [0.6, -0.45, -2.0] }, 12);
    b.box(0.12, 0.5, 0.12, 0x3a3e58, { p: [0.6, 1.75, -2.0] }, 0.03, 1);
    return { body: b.geometry(), glow: gl.geometry() };
  });
}
function tongueGeo() {
  return cached('star:weiche:zunge', () => {
    const b = new Build(), gl = new Build();
    railBuild(b, gl, [[0, 0, 0], [WEICHE.tongue / 3, 0, 0], [WEICHE.tongue * 2 / 3, 0, 0], [WEICHE.tongue, 0, 0]]);
    b.box(WEICHE.tongue, 0.1, 0.36, { v: (x) => (Math.floor(x * 3) % 2 ? col(ST.warnY) : col(ST.warnK)) }, { p: [WEICHE.tongue / 2, -0.32, 0] }, 0.03, 1);
    b.cyl(0.22, 0.22, 0.2, ST.star, { p: [0, -0.3, 0] }, 16);
    gl.geometry().dispose();   // Lichtpunkte nur am festen Teil
    return b.geometry();
  });
}
function targetGeo() {
  return cached('star:weiche:ziel', () => {
    const b = new Build();
    // runde Zielscheibe (Fläche nach ±X): Ringe rot/weiß, goldener Rand, Pfeil nach −Z (links) auf beiden Seiten
    const disc = new THREE.CylinderGeometry(0.62, 0.62, 0.12, 32, 1);
    disc.rotateZ(Math.PI / 2);
    b.add(disc, { v: (x, y, z, nx) => { if (Math.abs(nx) < 0.5) return col(ST.star); const r = Math.hypot(y, z); return Math.floor(r / 0.13) % 2 ? col(ST.white) : col(0xe8384a); } });
    b.torus(0.62, 0.05, gradV(ST.starLow, ST.starHi), { r: [0, Math.PI / 2, 0] }, 6, 32);
    for (const s of [1, -1]) {
      const a = new THREE.Shape(); a.moveTo(-0.32, -0.1); a.lineTo(0.05, -0.1); a.lineTo(0.05, -0.24); a.lineTo(0.34, 0); a.lineTo(0.05, 0.24); a.lineTo(0.05, 0.1); a.lineTo(-0.32, 0.1); a.lineTo(-0.32, -0.1);
      const g = puffyGeo(a, 0.04, 0.02, 2, 1);
      // Pfeil zeigt in Form-+X → Welt −Z; Fläche nach s·X
      g.rotateY(s > 0 ? Math.PI / 2 : -Math.PI / 2);
      if (s < 0) g.rotateX(Math.PI);
      b.add(g, 0x1a1c2a, { p: [s * 0.08, 0, 0] });
    }
    return b.geometry();
  });
}
function buildWeiche(opts = {}) {
  void opts;
  const root = new THREE.Group();
  const own = [];
  const G = weicheGeo();
  const base = mesh(G.body, toyS(0.3, 'weiche', { metalness: 0.15 }), {}, true);
  const baseGlow = mesh(G.glow, glowS(), {});
  const zj = joint();
  const tMat = vcol(0.3, {}, 'star:weichezunge');
  const tongue = mesh(tongueGeo(), tMat, {}, true);
  zj.add(tongue);
  const sj = joint([0.6, 2.35, -2.0]);
  const sMat = vcol(0.3, { emissive: 0x000000 }, 'star:weicheziel');
  const tgtMat = sMat.clone(); own.push(tgtMat);
  const target = mesh(targetGeo(), tgtMat, {}, true);
  sj.add(target);
  root.add(base, baseGlow, zj, sj);
  root.userData.target = new THREE.Vector3(0.6, 2.35, -2.0);
  const clk = new Clock();
  let d = -1, sw = -1;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const raw = st.dir;
    d = raw === 1 || raw === 'rechts' || raw === '+1' ? 1 : -1;
    sw = damp(sw, d, 9, dt);
    zj.rotation.y = -sw * WEICHE.swing;
    // Scheibe: Pfeil zeigt nach links (−Z) bei d = −1; für rechts um 180° drehen (Halbdrehung um X)
    sj.rotation.x = ((sw + 1) / 2) * Math.PI;
    sj.rotation.y = Math.sin(clk.t * 0.8) * 0.08;
    const hit = clamp(num(st.hit, 0), 0, 1);
    tgtMat.emissive.setRGB(hit * 0.8, hit * 0.7, hit * 0.4);
    sj.scale.setScalar(1 + hit * 0.15);
  };
  return makeModel('weiche', root, update, own, { initial: 'idle' });
}

export const MODELS = {
  schienenwalze: buildSchienenwalze,
  walzen_schiene: buildWalzenSchiene,
  schienenbrett: buildSchienenbrett,
  brett_schiene: buildBrettSchiene,
  weiche: buildWeiche,
};
