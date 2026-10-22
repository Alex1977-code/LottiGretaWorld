// Schnee-, Eis- und Himmels-Requisiten Welt 3 (Kurs-Modus). Eigene Gestaltung. Maßstab Meter, Ursprung = Mitte der
// Unterseite (Ausnahmen genannt), Vorderseite/Blick nach +X; state darf ein String sein.
// Massenhafte Teile gibt es zusätzlich als Instanzen: createInstanced('schneeblock'|'eisblock'|'tanne_schnee'|
// 'eiszapfen', n) aus lib/instanced.js (siehe lib/instanced_w3.js).
//
// schneeblock     Schneeblock 1 × 1 × 1 m: gepresster Schnee mit Schichtlinien, dicke Schneedecke mit Tropfen.
//                 state { anim: 'idle'|'bump'|'break', n? }  bump: hüpft 0,25 s; break: zerstiebt (0,8 s), dann weg.
// eisblock        Eisblock 1 × 1 × 1 m: durchscheinende Hülle, leuchtende Splitter innen, Frostrand.
//                 state { anim: 'idle'|'bump'|'break', n? }  break: zerspringt in Splitter (0,8 s), dann weg.
// eisflaeche      spiegelglatte Eisplatte mit Kufen-Spuren und Schneewülsten am Rand, 0,2 m dick (Oberkante y = 0,2).
//                 opts { size: [breite x, tiefe z] (Standard [4, 4]) }  state –
// eiskante        Schneewall-Kante für Eisflächen: Verlauf von x = 0 bis length, Eis-Lippe auf der −Z-Seite,
//                 Schneewulst auf der +Z-Seite (≈0,45 m hoch).  opts { length (4) }  state –
// tanne_schnee    verschneite Tanne (Standard 3,5 m): vier Nadelstufen mit Schneehauben.  opts { size (Höhe, 3,5) }
//                 state { anim: 'idle'|'shake' }  shake: wackelt 0,7 s, Schnee stiebt.
// schneemann      Schneemann ≈1,95 m: drei Kugeln, Kohleaugen und -knöpfe, Möhrennase, Zweigarme, rot-weißer Schal,
//                 blaue Bommelmütze.  state { anim: 'idle'|'hit' }  hit: Kopf wackelt, Mütze hüpft (0,8 s).
// iglu            Iglu aus Schneeziegeln (Ø 3,4 m, 1,8 m hoch), Eingangstunnel nach +X.  opts { size (Ø, 3,4) }
// eiszapfen       Bündel Eiszapfen. **Ursprung = Aufhängung oben**, hängt nach −Y.
//                 opts { length (1), count (3) }  state { anim: 'idle'|'shake'|'fall' }  shake: zittert; fall: starr,
//                 Glitzern (Motor bewegt root).
// kettenzaun      kletterbarer Maschendrahtzaun in der YZ-Ebene (Vorderseite +X): stahlblauer Rahmen mit gelben Kappen,
//                 silberne Rauten.  opts { width (Breite entlang z, 3), height (3) }  state { anim: 'idle'|'shake' }
// kettenplattform Himmels-Kettenplattform (3-2): Gitterrost-Plattform mit orangem Rahmen, Wolken darunter, optional
//                 Kletterzaun an der Rückseite (−X). Oberkante bei y = 0,35.
//                 opts { width (x, 4), depth (z, 3), fence (true), fenceHeight (2,5) }  state { anim: 'idle'|'move' }
//                 move: Wolken quellen, Warnlichter blinken.
// kurbelrad       Kurbelrad (3-2) auf Sockel: rotes Rad Ø 1,6 m mit gelben Speichen und Griff, Achse ±X, Mitte y = 1,25.
//                 state { angle (rad) }
// broeckelblock   Bröckelblock 1 m: sandbrauner Stein mit Rissen.  state { anim: 'idle'|'shake'|'crumble' }
//                 shake: zittert; crumble: zerfällt in 8 Brocken (0,9 s), dann weg.
// wolkenlift      Wolken-Lift (versteckte Wolke 3-4): flauschige Wolke ≈2,6 × 1,8 m mit Lächeln, Oberkante y = 0,55
//                 (root.userData.top).  opts { width (2,6) }
//                 state { anim: 'idle'|'hidden'|'reveal' }  hidden: unsichtbar; reveal: ploppt mit Funkeln auf (0,5 s).

import {
  THREE, TAU, Build, cached, vcol, basic, std, mesh, joint, eyes, makeModel, Clock, Blinker, damp, clamp, mix, smoothstep,
  instMesh, setInst, sparkleSprite, metal, roundedBox, SIDE, col,
} from '../lib/kit.js';
import { Puffs, snowV, chainTexture, alongY } from '../lib/kit_w3.js';
import {
  schneeblockGeo, snowMat, eisblockGeos, iceShellMat, iceCoreMat, tanneGeo, firMat, FIR_H, eiszapfenGeo, icicleMat,
} from '../lib/schnee_w3.js';

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

/** Stoß-/Bruch-Logik für 1-m-Blöcke (wie blocks.js): liefert y-Versatz und Sichtbarkeit. */
function blockBump(clk, st) {
  if (st.n !== undefined && st.n !== clk.lastN) { clk.age = 0; clk.lastN = st.n; }
  const a = clk.age;
  if (clk.anim === 'bump' && a < 0.25) { const k = a / 0.25; return { y: Math.sin(k * Math.PI) * 0.3, sy: 1 + Math.sin(k * Math.PI) * 0.08 }; }
  return { y: 0, sy: 1 };
}

// =============================================================================================
// Schneeblock, Eisblock
// =============================================================================================
function buildSchneeblock() {
  const root = new THREE.Group();
  const body = joint();
  const m = mesh(schneeblockGeo(), snowMat(), {}, true);
  m.receiveShadow = true;
  body.add(m);
  const puffs = new Puffs(12, 0xffffff, { opacity: 0.95, radius: 3, cy: 0.8 });
  puffs.gravity = 4;
  root.add(body, puffs.mesh);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const b = blockBump(clk, st);
    body.position.y = b.y; body.scale.y = b.sy;
    if (clk.entered && anim === 'break') puffs.burst([0, 0.6, 0], { count: 12, speed: 2.4, up: 2, size: 0.22, life: 0.8, spread: 0.4 });
    body.visible = anim !== 'break';
    puffs.step(dt);
  };
  return makeModel('schneeblock', root, update, [puffs], { initial: 'idle' });
}
const shardGeo = () => cached('w3:shard', () => new Build().add(new THREE.OctahedronGeometry(0.12, 0), { v: (x, y) => mix(0x6ac8f8, 0xeafcff, smoothstep(y / 0.12 + 0.5)) }, { s: [0.7, 1.3, 0.7] }).geometry());
function buildEisblock() {
  const root = new THREE.Group();
  const body = joint();
  const g = eisblockGeos();
  const core = mesh(g.core, iceCoreMat(), {}, true);
  const shell = mesh(g.shell, iceShellMat());
  shell.renderOrder = 2;
  body.add(core, shell);
  const shards = instMesh(shardGeo(), iceCoreMat(), 10, 3, 0.6);
  shards.castShadow = true;
  for (let i = 0; i < 10; i++) shards.setMatrixAt(i, ZERO);
  root.add(body, shards);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const b = blockBump(clk, st);
    body.position.y = b.y; body.scale.y = b.sy;
    const br = anim === 'break';
    body.visible = !br;
    for (let i = 0; i < 10; i++) {
      const a = clk.age;
      if (!br || a > 0.8) { shards.setMatrixAt(i, ZERO); continue; }
      const an = (i / 10) * TAU;
      const sc = Math.max(0.001, 1 - smoothstep((a - 0.5) / 0.3)) * (0.8 + (i % 3) * 0.3);
      setInst(shards, i, Math.cos(an) * 2.5 * a, Math.max(0.1, 0.5 + (4 + (i % 2) * 2) * a - 9 * a * a), Math.sin(an) * 2.5 * a, a * 10, a * 6 + i, 0, sc);
    }
    shards.instanceMatrix.needsUpdate = true;
  };
  return makeModel('eisblock', root, update, [shards], { initial: 'idle' });
}

// =============================================================================================
// Eisfläche, Eiskante
// =============================================================================================
function eisflaecheGeo(W, D) {
  return cached(`w3:eisflaeche:${W}:${D}`, () => {
    const b = new Build();
    // Platte: glänzend hellblau, Kufen-Spuren als helle Bögen
    const tracks = (x, y, z) => {
      for (let k = 0; k < 4; k++) {
        const cx = Math.sin(k * 2.1) * W * 0.25, cz = Math.cos(k * 1.7) * D * 0.25, r = 0.6 + k * 0.35;
        if (Math.abs(Math.hypot(x - cx, z - cz) - r) < 0.025) return true;
      }
      return false;
    };
    const top = new THREE.PlaneGeometry(W - 0.2, D - 0.2, Math.max(8, Math.round(W * 10)), Math.max(8, Math.round(D * 10)));
    top.rotateX(-Math.PI / 2);
    b.add(top, (x, y, z) => (tracks(x, y, z) ? 0xf2fbff : mix(0x8fd4f6, 0xc4ecff, smoothstep(0.5 + 0.5 * Math.sin(x * 0.9 + z * 0.6)))), { p: [0, 0.2, 0] });
    b.box(W - 0.15, 0.2, D - 0.15, { v: (x, y, z, nx, ny) => mix(0x3a90d0, 0x8fd4f6, smoothstep(y / 0.2 + 0.5)) }, { p: [0, 0.095, 0] }, 0.06, 1);
    // Schneewulst rundum
    const per = [];
    const nx = Math.max(3, Math.round(W / 0.45)), nz = Math.max(3, Math.round(D / 0.45));
    for (let i = 0; i <= nx; i++) { const x = -W / 2 + (i / nx) * W; per.push([x, D / 2]); per.push([x, -D / 2]); }
    for (let i = 1; i < nz; i++) { const z = -D / 2 + (i / nz) * D; per.push([W / 2, z]); per.push([-W / 2, z]); }
    per.forEach(([x, z], i) => b.sphere(0.2 + (i % 3) * 0.04, { v: (xx, yy, zz, nnx, ny) => mix(0xd2e2f6, 0xffffff, smoothstep(ny + 0.3)) }, { p: [x, 0.18, z], s: [1.2, 0.7, 1.2] }, 10, 6));
    return b.geometry();
  });
}
function buildEisflaeche(opts = {}) {
  const sz = Array.isArray(opts.size) ? opts.size : [4, 4];
  const W = Math.max(1, Number(sz[0]) || 4), D = Math.max(1, Number(sz[1]) || 4);
  const root = new THREE.Group();
  const m = mesh(eisflaecheGeo(W, D), metal('w3:iceSheet', { color: 0xffffff, vertexColors: true, metalness: 0.08, roughness: 0.07 }, 1.3), {}, false);
  m.receiveShadow = true;
  root.add(m);
  return makeModel('eisflaeche', root, () => {});
}
function eiskanteGeo(L) {
  return cached(`w3:eiskante:${L}`, () => {
    const b = new Build();
    b.box(L, 0.22, 0.5, { v: (x, y, z, nx, ny) => mix(0x4aa0dc, 0xbfeaff, smoothstep(ny * 0.6 + 0.5)) }, { p: [L / 2, 0.11, -0.25] }, 0.07, 2);
    const k = Math.max(3, Math.round(L / 0.38));
    for (let i = 0; i <= k; i++) {
      const x = (i / k) * L;
      b.sphere(0.28 + ((i * 7) % 3) * 0.04, snowV(0xcfe0f4), { p: [x, 0.2, 0.1 + ((i * 5) % 3) * 0.04], s: [1.1, 0.85, 1] }, 12, 8);
    }
    b.box(L, 0.14, 0.04, 0xeafaff, { p: [L / 2, 0.2, -0.02] }, 0.02, 1);
    return b.geometry();
  });
}
function buildEiskante(opts = {}) {
  const L = Math.max(0.5, Number(opts.length ?? 4));
  const root = new THREE.Group();
  const m = mesh(eiskanteGeo(L), vcol(0.3, {}, 'w3edge'), {}, true);
  m.receiveShadow = true;
  root.add(m);
  return makeModel('eiskante', root, () => {});
}

// =============================================================================================
// Tanne, Schneemann, Iglu, Eiszapfen
// =============================================================================================
function buildTanne(opts = {}) {
  const H = clamp(Number(opts.size ?? FIR_H), 0.5, 20);
  const root = new THREE.Group();
  const sway = joint();
  const m = mesh(tanneGeo(), firMat(), {}, true);
  m.receiveShadow = true;
  sway.add(m);
  sway.scale.setScalar(H / FIR_H);
  const puffs = new Puffs(10, 0xffffff, { opacity: 0.9, radius: H, cy: H / 2 });
  puffs.gravity = 3;
  root.add(sway, puffs.mesh);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const a = clk.age;
    if (clk.entered && anim === 'shake') puffs.burst([0, H * 0.55, 0], { count: 10, speed: 1.4, up: 0.1, size: 0.08 * H / FIR_H + 0.03, life: 1.0, spread: H * 0.22, grow: 1.2 });
    const k = anim === 'shake' && a < 0.7 ? 1 - a / 0.7 : 0;
    sway.rotation.set(Math.sin(a * 40) * 0.06 * k + Math.sin(clk.t * 0.9) * 0.008, 0, Math.cos(a * 33) * 0.06 * k);
    puffs.step(dt);
  };
  return makeModel('tanne_schnee', root, update, [puffs], { initial: 'idle' });
}

const SM = { coal: 0x2a2a34, carrot: 0xff8a1a, stick: 0x6e4226, scarf: 0xe8283a, scarf2: 0xffffff, hat: 0x2a6ad8, hat2: 0x8ad0ff, pom: 0xffffff };
function snowmanBodyGeo() {
  return cached('w3:schneemann:body', () => {
    const b = new Build();
    b.sphere(0.47, snowV(0xbcd2ee), { p: [0, 0.44, 0], s: [1, 0.94, 1] }, 26, 18);
    b.sphere(0.36, snowV(0xbcd2ee), { p: [0, 1.06, 0] }, 24, 16);
    for (let i = 0; i < 3; i++) {
      const y = 1.2 - i * 0.15, dy = y - 1.06;
      b.sphere(0.042, SM.coal, { p: [Math.sqrt(0.36 * 0.36 - dy * dy) - 0.008, y, 0], s: [0.7, 1, 1] }, 8, 6);
    }
    for (let i = 0; i < 2; i++) { const y = 0.6 - i * 0.2, dy = (y - 0.44) / 0.94; b.sphere(0.045, SM.coal, { p: [Math.sqrt(Math.max(0, 0.47 * 0.47 - dy * dy * 0.47 * 0.47)) - 0.01, y, 0], s: [0.7, 1, 1] }, 8, 6); }
    // Zweigarme mit Fingern
    for (const s of [1, -1]) {
      const p0 = [0, 1.12, s * 0.3], p1 = [0.1, 1.3, s * 0.65], p2 = [0.12, 1.45, s * 0.85];
      b.tube([p0, p1, p2], 0.028, SM.stick, null, 10, 5);
      b.tube([p1, [0.2, 1.42, s * 0.72], [0.25, 1.5, s * 0.74]], 0.018, SM.stick, null, 6, 4);
      b.tube([p2, [0.1, 1.58, s * 0.88]], 0.016, SM.stick, null, 4, 4);
      b.tube([p2, [0.18, 1.48, s * 0.97]], 0.016, SM.stick, null, 4, 4);
    }
    // Schal mit Fransen-Ende
    b.torus(0.25, 0.07, (x, y) => (Math.floor((Math.atan2(y, x) / TAU + 1) * 10) % 2 ? SM.scarf : SM.scarf2), { p: [0, 1.36, 0], r: [Math.PI / 2, 0, 0] }, 8, 28);
    b.box(0.12, 0.38, 0.05, (x, y) => (Math.floor((y + 0.2) * 12) % 2 ? SM.scarf : SM.scarf2), { p: [0.18, 1.18, 0.2], r: [0.15, -0.6, 0.2] }, 0.02, 2);
    return b.geometry();
  });
}
function snowmanHeadGeo() {
  return cached('w3:schneemann:head', () => {
    const b = new Build();
    b.sphere(0.27, snowV(0xc4d8f0), { p: [0, 0.25, 0] }, 22, 16);
    for (const s of [1, -1]) b.sphere(1, SM.coal, { p: [0.23, 0.32, s * 0.09], s: [0.035, 0.05, 0.035] }, 10, 8);
    for (let i = 0; i < 5; i++) { const a = (i - 2) * 0.28; b.sphere(0.02, SM.coal, { p: [0.25 * Math.cos(a) - 0.0, 0.16 - Math.cos(a * 1.4) * 0.03 + 0.03, 0.25 * Math.sin(a)] }, 6, 5); }
    b.add(new THREE.ConeGeometry(0.045, 0.24, 10), { v: (x, y) => mix(0xe85a10, SM.carrot, smoothstep(y / 0.24 + 0.5)) }, alongY([0.25, 0.25, 0], [1, -0.08, 0], 0.24));
    for (const s of [1, -1]) b.sphere(1, 0xffb0c8, { p: [0.22, 0.2, s * 0.15], s: [0.02, 0.025, 0.04] }, 8, 6);
    // Bommelmütze: blau mit weißem Ringel, hellblaue Krempe
    b.lathe([[0.265, 0.0], [0.27, 0.07], [0.245, 0.2], [0.18, 0.3], [0.08, 0.36], [0, 0.37]], { v: (x, y, z, nx, ny) => mix(0x1f56c0, SM.hat, smoothstep(ny * 0.6 + 0.5)) }, { p: [0, 0.4, 0] }, 28, 3);
    b.torus(0.255, 0.028, 0xffffff, { p: [0, 0.6, 0], r: [Math.PI / 2, 0, 0], s: [1, 1, 1] }, 6, 28);
    b.torus(0.2, 0.025, 0xffffff, { p: [0, 0.68, 0], r: [Math.PI / 2, 0, 0] }, 6, 24);
    b.torus(0.27, 0.055, SM.hat2, { p: [0, 0.43, 0], r: [Math.PI / 2, 0, 0] }, 8, 28);
    b.sphere(0.08, SM.pom, { p: [0, 0.8, 0] }, 12, 8);
    return b.geometry();
  });
}
function buildSchneemann() {
  const root = new THREE.Group();
  const body = mesh(snowmanBodyGeo(), vcol(0.55, {}, 'w3snowman'), {}, true);
  const head = joint([0, 1.36, 0], mesh(snowmanHeadGeo(), vcol(0.55, {}, 'w3snowman'), {}, true));
  root.add(body, head);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const a = clk.age;
    const k = anim === 'hit' && a < 0.8 ? 1 - a / 0.8 : 0;
    head.rotation.set(Math.sin(a * 18) * 0.25 * k, Math.sin(clk.t * 0.4) * 0.15, Math.cos(a * 14) * 0.2 * k);
    head.position.y = 1.36 + Math.abs(Math.sin(a * 18)) * 0.08 * k;
  };
  return makeModel('schneemann', root, update, [], { initial: 'idle' });
}

function igluGeo(D) {
  return cached(`w3:iglu:${D}`, () => {
    const b = new Build();
    const R = D / 2;
    // Kuppel mit Ziegelfugen (Reihen + versetzte Spalten)
    // Ziegel: 4 Segmentreihen hoch, 4 Segmente breit, Reihen versetzt; Fugen als Eckfarbe (weich, ohne Zacken)
    const WS = 72, HS = 28, dA = TAU / WS, dE = (Math.PI / 2) / HS;
    const brick = { v: (x, y, z, nx, ny) => {
      const ri = Math.round(Math.asin(clamp(y / R, -1, 1)) / dE), row = Math.floor(ri / 4);
      const ci = Math.round((Math.atan2(z, x) + Math.PI) / dA) + (row % 2) * 2;
      if (ri % 4 === 0 || (ci % 4 === 0 && ri < HS - 2)) return col(0xa3bfe2);
      return mix(0xdde9f8, 0xffffff, smoothstep(ny));
    } };
    b.add(new THREE.SphereGeometry(R, WS, HS, 0, TAU, 0, Math.PI / 2), brick, { s: [1, 1.05, 1] });
    // Tunnel nach +X (Halbzylinder) mit dunkler Öffnung
    const tR = R * 0.42;
    const tun = new THREE.CylinderGeometry(tR, tR, R * 0.7, 20, 1, false, 0, Math.PI);
    b.add(tun, (x, y, z, nx, ny) => (Math.abs(ny) > 0.9 ? 0xc8daf0 : Math.floor(((Math.atan2(x, z) + 4) / 0.4)) % 2 ? 0xffffff : 0xe8f0fa), { p: [R * 0.92, 0, 0], r: [0, 0, Math.PI / 2] });
    b.add(new THREE.CircleGeometry(tR * 0.82, 20, 0, Math.PI), 0x1a2a44, { p: [R * 0.92 + R * 0.35 + 0.01, 0.0, 0], r: [0, Math.PI / 2, 0] });
    // Schnee am Fuß
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU + 0.2; if (Math.abs(Math.sin(a)) < 0.35 && Math.cos(a) > 0) continue; b.sphere(0.22 + (i % 3) * 0.05, 0xffffff, { p: [Math.cos(a) * R, 0.06, Math.sin(a) * R], s: [1.4, 0.6, 1.4] }, 10, 6); }
    return b.geometry();
  });
}
function buildIglu(opts = {}) {
  const D = clamp(Number(opts.size ?? 3.4), 1, 12);
  const root = new THREE.Group();
  const m = mesh(igluGeo(D), vcol(0.6, {}, 'w3iglu'), {}, true);
  m.receiveShadow = true;
  root.add(m);
  return makeModel('iglu', root, () => {});
}

function buildEiszapfen(opts = {}) {
  const L = clamp(Number(opts.length ?? 1), 0.2, 6), n = clamp(Math.round(opts.count ?? 3), 1, 7);
  const root = new THREE.Group();
  const sway = joint();
  sway.add(mesh(eiszapfenGeo(n, L), icicleMat(), {}, true));
  const sp = sparkleSprite(0xe8fbff, 0.3); sp.position.set(0.05, -L * 0.55, 0.08);
  root.add(sway, sp);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    const sh = anim === 'shake';
    sway.rotation.set(sh ? Math.sin(t * 47) * 0.05 : 0, 0, sh ? Math.cos(t * 41) * 0.05 : 0);
    const k = Math.pow(Math.max(0, Math.sin(t * (anim === 'fall' ? 6 : 1.4))), 8);
    sp.visible = k > 0.03;
    sp.scale.setScalar(Math.max(0.001, k * 0.4));
  };
  return makeModel('eiszapfen', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Kettenzaun, Kettenplattform, Kurbelrad
// =============================================================================================
const KZ = { frame: 0x3a6ab8, frameHi: 0x7aa8ee, cap: 0xffc21a, rail: 0xff8a1a };
const chainMat = () => std('w3:chain', { map: chainTexture(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.35, metalness: 0.3 });
function chainPlaneGeo(w, h) {
  return cached(`w3:chainPlane:${w}:${h}`, () => {
    const g = new THREE.PlaneGeometry(w, h);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 0.3, uv.getY(i) * h / 0.3);
    return g;
  });
}
function fenceFrameGeo(W, H) {
  return cached(`w3:fenceFrame:${W}:${H}`, () => {
    const b = new Build();
    const steel = { v: (x, y, z, nx, ny) => mix(KZ.frame, KZ.frameHi, smoothstep(nx * 0.5 + ny * 0.3 + 0.5)) };
    for (const s of [1, -1]) {
      b.cyl(0.07, 0.08, H + 0.1, steel, { p: [0, (H + 0.1) / 2, s * W / 2] }, 12);
      b.sphere(0.1, KZ.cap, { p: [0, H + 0.12, s * W / 2] }, 12, 8);
      b.cyl(0.12, 0.14, 0.08, KZ.cap, { p: [0, 0.04, s * W / 2] }, 12);
    }
    for (const y of [0.12, H]) b.cyl(0.045, 0.045, W, steel, { p: [0, y, 0], r: [Math.PI / 2, 0, 0] }, 10);
    const k = Math.max(1, Math.round(W / 1.5));
    for (let i = 1; i < k; i++) b.cyl(0.035, 0.035, H - 0.1, steel, { p: [0, H / 2 + 0.05, -W / 2 + (i / k) * W] }, 8);
    return b.geometry();
  });
}
function addFence(parent, W, H, x = 0, y0 = 0) {
  const frame = mesh(fenceFrameGeo(W, H), vcol(0.3, { metalness: 0.2 }, 'w3fence'), { p: [x, y0, 0] }, true);
  const net = mesh(chainPlaneGeo(W, H - 0.12), chainMat(), { p: [x, y0 + 0.06 + H / 2, 0], r: [0, Math.PI / 2, 0] }, true);
  parent.add(frame, net);
  return { frame, net };
}
function buildKettenzaun(opts = {}) {
  const W = clamp(Number(opts.width ?? 3), 0.5, 20), H = clamp(Number(opts.height ?? 3), 0.5, 12);
  const root = new THREE.Group();
  const body = joint();
  addFence(body, W, H);
  root.add(body);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const k = anim === 'shake' ? 1 : 0;
    body.rotation.z = Math.sin(clk.t * 30) * 0.012 * k;
    body.position.x = Math.sin(clk.t * 37) * 0.02 * k;
  };
  return makeModel('kettenzaun', root, update, [], { initial: 'idle' });
}

function skyPlatformGeo(W, D) {
  return cached(`w3:skyPlat:${W}:${D}`, () => {
    const b = new Build();
    const rim = { v: (x, y, z, nx, ny) => mix(0xd85a10, KZ.rail, smoothstep(ny * 0.5 + 0.6)) };
    for (const s of [1, -1]) {
      b.box(W, 0.2, 0.18, rim, { p: [0, 0.25, s * (D / 2 - 0.09)] }, 0.05, 1);
      b.box(0.18, 0.2, D, rim, { p: [s * (W / 2 - 0.09), 0.25, 0] }, 0.05, 1);
    }
    // Nieten und Warnlampen an den Ecken
    for (const sx of [1, -1]) for (const sz of [1, -1]) b.cyl(0.07, 0.08, 0.06, 0xfff2c0, { p: [sx * (W / 2 - 0.09), 0.37, sz * (D / 2 - 0.09)] }, 10);
    for (let i = 0; i < Math.round(W / 0.5); i++) for (const s of [1, -1]) b.sphere(0.025, 0xffe0a0, { p: [-W / 2 + 0.25 + i * 0.5, 0.25, s * (D / 2 + 0.005)] }, 6, 4);
    // Unterboden (dunkler Träger)
    b.box(W - 0.3, 0.12, D - 0.3, 0x2a3a5a, { p: [0, 0.2, 0] }, 0.04, 1);
    return b.geometry();
  });
}
function cloudPuffsGeo(W, D) {
  return cached(`w3:skyClouds:${W}:${D}`, () => {
    const b = new Build();
    const cl = { v: (x, y, z, nx, ny) => mix(0xc8dcf4, 0xffffff, smoothstep((ny + 0.6) / 1.2)) };
    const k = Math.max(3, Math.round(W * D / 2));
    for (let i = 0; i < k; i++) {
      const u = ((i * 0.618) % 1) - 0.5, v = ((i * 0.381 + 0.2) % 1) - 0.5;
      b.sphere(0.45 + (i % 3) * 0.12, cl, { p: [u * W * 0.9, -0.05 - (i % 2) * 0.12, v * D * 0.9], s: [1.2, 0.7, 1.2] }, 12, 8);
    }
    return b.geometry();
  });
}
function buildKettenplattform(opts = {}) {
  const W = clamp(Number(opts.width ?? 4), 1, 20), D = clamp(Number(opts.depth ?? 3), 1, 20);
  const fence = opts.fence !== false, FH = clamp(Number(opts.fenceHeight ?? 2.5), 0.5, 8);
  const root = new THREE.Group();
  const body = joint();
  const frame = mesh(skyPlatformGeo(W, D), vcol(0.35, { metalness: 0.15 }, 'w3skyplat'), {}, true);
  frame.receiveShadow = true;
  const grate = mesh(chainPlaneGeo(W - 0.3, D - 0.3), chainMat(), { p: [0, 0.3, 0], r: [-Math.PI / 2, 0, 0] }, true);
  grate.receiveShadow = true;
  const clouds = joint([0, 0, 0], mesh(cloudPuffsGeo(W, D), vcol(0.7, {}, 'w3cloud'), {}, false));
  body.add(frame, grate, clouds);
  if (fence) addFence(body, D - 0.2, FH, -W / 2 + 0.1, 0.3);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffd23a });
  const lamps = instMesh(cached('w3:lamp', () => new THREE.SphereGeometry(0.06, 10, 8)), lampMat, 4, Math.max(W, D), 0.4);
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz], i) => setInst(lamps, i, sx * (W / 2 - 0.09), 0.42, sz * (D / 2 - 0.09)));
  body.add(lamps);
  root.add(body);
  root.userData.top = 0.35;
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, mv = anim === 'move';
    clouds.scale.set(1 + Math.sin(t * (mv ? 4 : 1.2)) * 0.05, 1 + Math.sin(t * (mv ? 5 : 1.5) + 1) * 0.08, 1 + Math.cos(t * (mv ? 4 : 1.2)) * 0.05);
    body.position.y = Math.sin(t * 1.4) * 0.03;
    const on = mv ? Math.sin(t * 8) > 0 : true;
    lampMat.color.setHex(on ? (mv ? 0xff5a2a : 0xffd23a) : 0x6a2a10);
  };
  return makeModel('kettenplattform', root, update, [lampMat, lamps], { initial: 'idle' });
}

function crankBaseGeo() {
  return cached('w3:crank:base', () => {
    const b = new Build();
    b.box(0.9, 0.3, 0.9, { v: (x, y, z, nx, ny) => mix(0x5a6a8a, 0x8a9ab8, smoothstep(ny * 0.5 + 0.5)) }, { p: [0, 0.15, 0] }, 0.08, 2);
    b.cyl(0.14, 0.18, 0.95, 0x7a8aa8, { p: [-0.1, 0.75, 0] }, 14);
    b.cyl(0.11, 0.11, 0.3, 0xffc21a, { p: [0.02, 1.25, 0], r: [0, 0, Math.PI / 2] }, 14);
    return b.geometry();
  });
}
function crankWheelGeo() {
  return cached('w3:crank:wheel', () => {
    const b = new Build();
    b.torus(0.72, 0.08, 0xe8283a, { r: [0, Math.PI / 2, 0] }, 10, 40);
    for (let i = 0; i < 6; i++) b.cyl(0.035, 0.035, 0.72, 0xffc21a, { p: [0, Math.cos((i / 6) * TAU) * 0.36, Math.sin((i / 6) * TAU) * 0.36], r: [(i / 6) * TAU, 0, 0] }, 8);
    b.cyl(0.16, 0.16, 0.14, 0xffc21a, { r: [0, 0, Math.PI / 2] }, 18);
    b.sphere(0.08, 0xfff2c0, { p: [0.08, 0, 0] }, 10, 8);
    // Griff
    b.cyl(0.035, 0.035, 0.22, 0xc8ccd8, { p: [0.11, 0.72, 0], r: [0, 0, Math.PI / 2] }, 8);
    b.capsule(0.05, 0.12, 0x2a2a3a, { p: [0.25, 0.72, 0], r: [0, 0, Math.PI / 2] }, 3, 8);
    return b.geometry();
  });
}
function buildKurbelrad() {
  const root = new THREE.Group();
  const base = mesh(crankBaseGeo(), vcol(0.35, { metalness: 0.2 }, 'w3crank'), {}, true);
  const wheel = joint([0.2, 1.25, 0], mesh(crankWheelGeo(), vcol(0.3, { metalness: 0.15 }, 'w3crankW'), {}, true));
  root.add(base, wheel);
  const update = (dt, st) => { wheel.rotation.x = st.angle ?? 0; };
  return makeModel('kurbelrad', root, update);
}

// =============================================================================================
// Bröckelblock, Wolkenlift
// =============================================================================================
const crumbleCubeGeo = () => cached('w3:broeckel:cube', () => {
  const b = new Build();
  const crack = (x, y, z) => Math.abs(Math.sin(x * 23 + y * 17 + z * 5)) < 0.05;
  b.box(0.47, 0.47, 0.47, (x, y, z, nx, ny) => (crack(x, y, z) ? 0x7a5432 : ny > 0.5 ? 0xf0d498 : mix(0xb4844e, 0xdcb47a, smoothstep(y / 0.47 + 0.5))), {}, 0.07, 1);
  b.sphere(0.05, 0xc89a62, { p: [0.12, 0.23, -0.1], s: [1, 0.35, 1] }, 7, 4);
  return b.geometry();
});
// Lage der 8 Teilwürfel (leicht versetzt/verdreht → bröckelig)
const CRUMBLE = Array.from({ length: 8 }, (_, i) => ({
  x: (i & 1 ? 0.25 : -0.25) + Math.sin(i * 3.1) * 0.012, y: i & 2 ? 0.75 : 0.25, z: (i & 4 ? 0.25 : -0.25) + Math.cos(i * 2.3) * 0.012,
  ry: Math.sin(i * 1.7) * 0.05, rz: Math.cos(i * 2.9) * 0.035,
}));
function buildBroeckelblock() {
  const root = new THREE.Group();
  const cubes = instMesh(crumbleCubeGeo(), vcol(0.8, {}, 'w3crumble'), 8, 2.5, 0.5);
  cubes.castShadow = true; cubes.receiveShadow = true;
  const dust = new Puffs(8, 0xd8c0a0, { opacity: 0.7, radius: 2, cy: 0.5 });
  root.add(cubes, dust.mesh);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, a = clk.age;
    const shake = anim === 'shake', cr = anim === 'crumble';
    if (clk.entered && cr) dust.burst([0, 0.4, 0], { count: 8, speed: 1.2, up: 0.4, size: 0.25, life: 0.8, spread: 0.4 });
    if (clk.entered && shake) dust.burst([0, 0.05, 0], { count: 4, speed: 0.6, up: 0.2, size: 0.12, life: 0.5, spread: 0.5 });
    dust.step(dt);
    CRUMBLE.forEach((c, i) => {
      if (cr) {
        if (a > 0.9) { cubes.setMatrixAt(i, ZERO); return; }
        const sc = Math.max(0.001, 1 - smoothstep((a - 0.6) / 0.3));
        setInst(cubes, i, c.x * (1 + a * 3), Math.max(0.2, c.y + (i & 2 ? 1 : 0.5) * a - 6 * a * a), c.z * (1 + a * 3), a * (i + 1), c.ry + a * 2, c.rz + a * (3 - (i % 3)), sc);
        return;
      }
      const j = shake ? 0.025 : 0;
      setInst(cubes, i, c.x + Math.sin(t * 60 + i) * j, c.y + Math.abs(Math.sin(t * 47 + i * 2)) * j, c.z + Math.cos(t * 53 + i) * j, 0, c.ry, c.rz);
    });
    cubes.instanceMatrix.needsUpdate = true;
  };
  return makeModel('broeckelblock', root, update, [cubes, dust], { initial: 'idle' });
}

function cloudLiftGeo(W) {
  return cached(`w3:cloudlift:${W}`, () => {
    const b = new Build();
    const cl = { v: (x, y, z, nx, ny) => mix(0xcfe0f6, 0xffffff, smoothstep((ny + 0.5) / 1.1)) };
    const D = W * 0.7;
    const puffs = [[0, 0.28, 0, 0.62], [W * 0.3, 0.26, 0.15, 0.48], [-W * 0.3, 0.26, -0.1, 0.5], [W * 0.12, 0.25, -D * 0.32, 0.45], [-W * 0.15, 0.25, D * 0.32, 0.45], [W * 0.38, 0.22, -D * 0.25, 0.36], [-W * 0.38, 0.22, D * 0.22, 0.38]];
    for (const [x, y, z, r] of puffs) b.sphere(r * W / 2.6, cl, { p: [x, y, z], s: [1.15, 0.5, 1.15] }, 16, 10);
    // freundliches Gesicht vorn (+X)
    const fx = W * 0.47;
    for (const s of [1, -1]) {
      b.sphere(1, 0x2a3a6a, { p: [fx, 0.34, s * 0.16], s: [0.02, 0.06, 0.04] }, 8, 6);
      b.sphere(1, 0xffb0c8, { p: [fx - 0.02, 0.24, s * 0.28], s: [0.02, 0.035, 0.07] }, 8, 6);
    }
    b.torus(0.07, 0.015, 0x2a3a6a, { p: [fx + 0.01, 0.27, 0], r: [0, Math.PI / 2, Math.PI] }, 5, 10, Math.PI);
    return b.geometry();
  });
}
function buildWolkenlift(opts = {}) {
  const W = clamp(Number(opts.width ?? 2.6), 0.8, 10);
  const root = new THREE.Group();
  const body = joint();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, transparent: true, opacity: 1, emissive: 0x101826 });
  body.add(mesh(cloudLiftGeo(W), mat, {}, true));
  const sp = sparkleSprite(0xffffff, 0.6); sp.position.set(W * 0.3, 0.8, 0.3);
  root.add(body, sp);
  root.userData.top = 0.55;
  const clk = new Clock();
  let show = 1;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, a = clk.age;
    if (anim === 'hidden') show = 0;
    else if (anim === 'reveal') show = Math.min(1, a / 0.5);
    else show = Math.min(1, show + dt * 3);
    const pop = anim === 'reveal' && a < 0.5 ? 1 + Math.sin((a / 0.5) * Math.PI) * 0.15 : 1;
    body.visible = show > 0.01;
    body.scale.set(Math.max(0.001, show) * pop, Math.max(0.001, show) * pop, Math.max(0.001, show) * pop);
    mat.opacity = show; mat.depthWrite = show > 0.95;
    body.position.y = Math.sin(t * 1.5) * 0.04;
    sp.visible = anim === 'reveal' && a < 0.7;
    if (sp.visible) sp.scale.setScalar(0.3 + Math.sin(Math.min(1, a / 0.7) * Math.PI) * 0.8);
  };
  return makeModel('wolkenlift', root, update, [mat], { initial: 'idle' });
}

export const MODELS = {
  schneeblock: buildSchneeblock,
  eisblock: buildEisblock,
  eisflaeche: buildEisflaeche,
  eiskante: buildEiskante,
  tanne_schnee: buildTanne,
  schneemann: buildSchneemann,
  iglu: buildIglu,
  eiszapfen: buildEiszapfen,
  kettenzaun: buildKettenzaun,
  kettenplattform: buildKettenplattform,
  kurbelrad: buildKurbelrad,
  broeckelblock: buildBroeckelblock,
  wolkenlift: buildWolkenlift,
};
