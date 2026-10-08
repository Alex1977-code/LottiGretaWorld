// Blöcke (Kurs-Modus), je 1 × 1 × 1 m, Ursprung = Mitte der Unterseite (Block reicht bis y = 1).
// Eigene Gestaltung: statt „?“ ein weißer Funkel-Stempel, statt „POW“ ein Wumm-Block mit Knallstern.
// state darf ein String sein ('bump' ≙ { anim: 'bump' }). Einmal-Animationen starten beim Wechsel in den
// Zustand (bump, break, hit, revealed); für einen erneuten Stoß kurz einen anderen Zustand setzen oder
// state.n (Zähler) erhöhen.
//
// question_block  goldgelber Block mit Funkel-Stempel auf vier Seiten, Nieten, Glitzern.
//   state { anim: 'idle'|'bump'|'used', n? }  bump: hüpft 0,25 s (0,3 m); used: wird zum braunen Block (Plopp).
// brick_block     Ziegelblock.  state { anim: 'idle'|'bump'|'break', n? }  break: zerfällt in 8 Bruchstücke, die
//   1,2 s fliegen; danach unsichtbar (Kollision entfernt der Motor).
// used_block      bronzebrauner leerer Block mit Platte und Nieten.  state { anim: 'idle'|'bump', n? }
// hidden_block    unsichtbarer Block.  opts { debug: true → halbdurchsichtiger Umriss }
//   state { anim: 'hidden'|'revealed'|'bump' }  revealed: erscheint mit Plopp als benutzter Block.
// crystal_block   türkiser Kristallblock (halbdurchsichtig, leuchtende Kristalle innen).
//   state { anim: 'idle'|'bump'|'break', n? }  break: zerspringt in Splitter.
// pow_block       Wumm-Block: violettblau mit gelbem Knallstern, wird pro Benutzung flacher.
//   state { anim: 'idle'|'hit', uses (3..0, Standard 3; 0 = verbraucht/unsichtbar), n? }
//   hit: staucht, blitzt, Druckwelle am Boden (0,5 s).

import {
  THREE, Build, cached, vcol, basic, std, mesh, joint, makeModel, Clock, damp, clamp, smoothstep, sparkleSprite,
  instMesh, setInst, roundedBox, SIDE, starShape,
} from '../lib/kit.js';
import { questionGeo, usedGeo, brickGeo, brickMat, brickChunkGeo, blockMat } from '../lib/blockGeos.js';

/** Stoß-Kurve: 0..0,25 s hoch und zurück (mit leichtem Stauchen). */
function bumpCurve(age) {
  if (age > 0.25) return { y: 0, sy: 1 };
  const k = age / 0.25;
  return { y: Math.sin(k * Math.PI) * 0.3, sy: 1 + Math.sin(k * Math.PI) * 0.08 };
}
/** Erkennt eine neue Einmal-Animation (Zustandswechsel oder Zähler n). */
function trigger(clk, st, names) {
  const fresh = clk.entered || (st.n !== undefined && st.n !== clk.lastN);
  clk.lastN = st.n;
  if (fresh && names.includes(clk.anim)) clk.age = 0;
  return clk.age;
}

// ------------------------------------------------------------------ Fragezeichen-Ersatz / benutzt
function buildQuestion() {
  const root = new THREE.Group();
  const bump = joint();
  const block = mesh(questionGeo('high'), blockMat(), {}, true);
  block.receiveShadow = true;
  bump.add(block);
  const sp = sparkleSprite(0xffffff, 0.35); sp.position.set(0.48, 1.0, 0.48);
  root.add(bump, sp);
  const clk = new Clock();
  let used = false, pop = 1;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const age = trigger(clk, st, ['bump', 'used']);
    const isUsed = anim === 'used';
    if (isUsed !== used) { used = isUsed; block.geometry = used ? usedGeo('high') : questionGeo('high'); pop = 0; }
    pop = Math.min(1, pop + dt * 6);
    const b = anim === 'bump' || (isUsed && age < 0.3) ? bumpCurve(age) : { y: 0, sy: 1 };
    bump.position.y = b.y;
    const ps = 1 + Math.sin(pop * Math.PI) * 0.08;
    bump.scale.set(ps, b.sy * ps, ps);
    const k = used ? 0 : Math.pow(Math.max(0, Math.sin(clk.t * 1.7)), 12);
    sp.scale.setScalar(Math.max(0.001, k * 0.45)); sp.visible = k > 0.03;
  };
  return makeModel('question_block', root, update);
}

function buildUsed() {
  const root = new THREE.Group();
  const bump = joint();
  const block = mesh(usedGeo('high'), blockMat(), {}, true);
  block.receiveShadow = true;
  bump.add(block);
  root.add(bump);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const age = trigger(clk, st, ['bump']);
    const b = anim === 'bump' ? bumpCurve(age) : { y: 0, sy: 1 };
    bump.position.y = b.y; bump.scale.y = b.sy;
  };
  return makeModel('used_block', root, update);
}

// ------------------------------------------------------------------ Ziegel
const CHUNKS = [];
for (let i = 0; i < 8; i++) {
  const x = i & 1 ? 0.25 : -0.25, y = i & 2 ? 0.75 : 0.25, z = i & 4 ? 0.25 : -0.25;
  CHUNKS.push({ p: [x, y, z], v: [x * 7 + Math.sin(i * 7) * 0.8, 5 + (i & 2 ? 2.5 : 0) + Math.cos(i * 3) * 0.8, z * 7 + Math.cos(i * 5) * 0.8], spin: [Math.sin(i) * 9, Math.cos(i * 2) * 9, Math.sin(i * 3) * 9] });
}
function debris(mat, geo, n = 8) {
  const m = instMesh(geo, mat, n, 4, 0.5);
  m.castShadow = true;
  m.visible = false;
  return {
    mesh: m,
    step(age) {
      m.visible = age < 1.2;
      if (!m.visible) return;
      for (let i = 0; i < n; i++) {
        const c = CHUNKS[i % 8];
        const s = Math.max(0.001, 1 - Math.max(0, age - 0.8) / 0.4);
        setInst(m, i, c.p[0] + c.v[0] * age * 0.5, c.p[1] + c.v[1] * age - 9 * age * age, c.p[2] + c.v[2] * age * 0.5,
          c.spin[0] * age, c.spin[1] * age, c.spin[2] * age, s);
      }
      m.instanceMatrix.needsUpdate = true;
    },
  };
}
function buildBrick() {
  const root = new THREE.Group();
  const bump = joint();
  const block = mesh(brickGeo('high'), brickMat(), {}, true);
  block.receiveShadow = true;
  bump.add(block);
  const deb = debris(brickMat(), brickChunkGeo());
  root.add(bump, deb.mesh);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const age = trigger(clk, st, ['bump', 'break']);
    const broken = anim === 'break';
    bump.visible = !broken;
    const b = anim === 'bump' ? bumpCurve(age) : { y: 0, sy: 1 };
    bump.position.y = b.y; bump.scale.y = b.sy;
    if (broken) deb.step(age); else deb.mesh.visible = false;
  };
  return makeModel('brick_block', root, update);
}

// ------------------------------------------------------------------ versteckter Block
function buildHidden(opts = {}) {
  const root = new THREE.Group();
  const bump = joint();
  const block = mesh(usedGeo('high'), blockMat(), {}, true);
  bump.add(block);
  let ghost = null;
  if (opts.debug) {
    ghost = new THREE.Group();
    ghost.add(new THREE.Mesh(cached('block:ghost', () => { const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, 0.5, 0); return g; }),
      basic('ghostBlock', { color: 0x9ad8ff, transparent: true, opacity: 0.22, depthWrite: false })));
    ghost.add(new THREE.LineSegments(cached('block:ghostEdges', () => { const g = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)); g.translate(0, 0.5, 0); return g; }),
      cachedLineMat()));
    root.add(ghost);
  }
  root.add(bump);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'hidden';
    clk.tick(dt, anim);
    const age = trigger(clk, st, ['revealed', 'bump']);
    const shown = anim !== 'hidden';
    bump.visible = shown;
    if (ghost) ghost.visible = !shown;
    if (shown) {
      const k = clamp(age / 0.3, 0, 1);
      const s = anim === 'revealed' ? 0.5 + 0.5 * smoothstep(k) + Math.sin(k * Math.PI) * 0.12 : 1;
      bump.scale.setScalar(s);
      bump.position.y = anim === 'revealed' || anim === 'bump' ? bumpCurve(age).y : 0;
    }
  };
  return makeModel('hidden_block', root, update, [], { initial: 'hidden' });
}
let lineMat = null;
const cachedLineMat = () => (lineMat ??= new THREE.LineBasicMaterial({ color: 0x2a7ad8, transparent: true, opacity: 0.8 }));

// ------------------------------------------------------------------ Kristallblock
function crystalCoreGeo() {
  return cached('block:crystalCore', () => {
    const b = new Build();
    const shards = [[0, 0.42, 0, 0.16, 0.42, 0.0], [0.17, 0.33, 0.12, 0.1, 0.28, 0.5], [-0.16, 0.3, -0.1, 0.11, 0.3, -0.45], [0.05, 0.28, -0.2, 0.09, 0.22, 0.3], [-0.12, 0.3, 0.18, 0.08, 0.22, -0.3]];
    for (const [x, y, z, r, h, tilt] of shards) {
      const g = new THREE.OctahedronGeometry(1, 0); g.scale(r, h, r);
      b.add(g, { v: (px, py) => (py > 0 ? 0xc8fffa : 0x2ad8e8) }, { p: [x, y, z], r: [tilt * 0.5, tilt, tilt] });
    }
    return b.geometry();
  });
}
function buildCrystal() {
  const root = new THREE.Group();
  const bump = joint();
  const shell = mesh(cached('block:crystalShell', () => { const g = roundedBox(1, 1, 1, 0.1, SIDE.ALL, 0, 2); g.translate(0, 0.5, 0); return g; }),
    std('crystalShell', { color: 0x7fe8ff, transparent: true, opacity: 0.45, roughness: 0.05, metalness: 0.1, emissive: 0x0a4a5a, depthWrite: false }));
  const frame = mesh(cached('block:crystalFrame', () => {
    const b = new Build();
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) b.box(0.08, 1.0, 0.08, 0xe8fbff, { p: [x * 0.47, 0.5, z * 0.47] }, 0.03, 1);
    for (const y of [0.03, 0.97]) for (const [w, d, x, z] of [[1, 0.08, 0, 0.47], [1, 0.08, 0, -0.47], [0.08, 1, 0.47, 0], [0.08, 1, -0.47, 0]]) b.box(w, 0.07, d, 0xe8fbff, { p: [x, y, z] }, 0.03, 1);
    return b.geometry();
  }), vcol(0.2), {}, true);
  const core = mesh(crystalCoreGeo(), vcol(0.15, { emissive: 0x0e6a78 }, 'crystal'), {}, false);
  bump.add(core, frame, shell);
  const sp = sparkleSprite(0xffffff, 0.4); sp.position.set(-0.3, 0.85, 0.5);
  const deb = debris(vcol(0.15, { emissive: 0x0e6a78 }, 'crystal'), cached('block:shard', () => { const b = new Build(); const g = new THREE.OctahedronGeometry(0.16, 0); g.scale(1, 1.8, 1); b.add(g, 0x8ff4ff); return b.geometry(); }));
  root.add(bump, sp, deb.mesh);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const age = trigger(clk, st, ['bump', 'break']);
    const broken = anim === 'break';
    bump.visible = !broken;
    const b = anim === 'bump' ? bumpCurve(age) : { y: 0, sy: 1 };
    bump.position.y = b.y; bump.scale.y = b.sy;
    core.rotation.y = clk.t * 0.6;
    const k = broken ? 0 : Math.pow(Math.max(0, Math.sin(clk.t * 1.3 + 1)), 10);
    sp.scale.setScalar(Math.max(0.001, k * 0.5)); sp.visible = k > 0.03;
    if (broken) deb.step(age); else deb.mesh.visible = false;
  };
  return makeModel('crystal_block', root, update);
}

// ------------------------------------------------------------------ Wumm-Block
function powGeo() {
  return cached('block:pow', () => {
    const b = new Build();
    b.add(roundedBox(1, 1, 1, 0.12, SIDE.ALL, 0, 2), { v: (x, y, z, nx, ny, nz) => {
      const flat = Math.max(Math.abs(nx), Math.abs(ny), Math.abs(nz));
      return new THREE.Color(0x4a3ae0).lerp(new THREE.Color(0x2a1a8a), (1 - flat) * 2);
    } }, { p: [0, 0.5, 0] });
    const sides = [[0, 1, Math.PI / 2], [0, -1, -Math.PI / 2], [2, 1, 0], [2, -1, Math.PI], [1, 1, 0]];
    for (const [ax, sg, ry] of sides) {
      const p = [0, 0.5, 0]; p[ax] = sg * 0.5;
      const r = ax === 1 ? [-Math.PI / 2, 0, 0] : [0, ry, 0];
      b.extrude(starShape(0.4, 0.2, 8), 0.03, 0xff7a1a, { p, r }, 0, 1);
      const p2 = [0, 0.5, 0]; p2[ax] = sg * 0.525;
      b.extrude(starShape(0.32, 0.16, 8), 0.03, 0xffe03a, { p: p2, r }, 0.01, 1, 1);
      const p3 = [0, 0.5, 0]; p3[ax] = sg * 0.55;
      b.extrude(starShape(0.12, 0.07, 8), 0.02, 0xffffff, { p: p3, r }, 0.005, 1, 1);
    }
    return b.geometry();
  });
}
function buildPow() {
  const root = new THREE.Group();
  const squash = joint();
  const flash = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, emissive: 0x000000 });
  const block = mesh(powGeo(), flash, {}, true);
  squash.add(block);
  const wave = mesh(cached('block:powWave', () => { const g = new THREE.TorusGeometry(1, 0.06, 6, 40); g.rotateX(Math.PI / 2); return g; }),
    basic('powWave', { color: 0xfff2a0, transparent: true, opacity: 0.8, depthWrite: false }), { p: [0, 0.05, 0] });
  root.add(squash, wave);
  const clk = new Clock();
  let h = 1;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const age = trigger(clk, st, ['hit']);
    const uses = clamp(Math.round(st.uses ?? 3), 0, 3);
    h = damp(h, uses === 0 ? 0 : 0.45 + (uses / 3) * 0.55, 10, dt);
    const hit = anim === 'hit' && age < 0.5;
    const k = hit ? age / 0.5 : 1;
    const sq = hit ? 1 - Math.sin(Math.min(1, k * 2.5) * Math.PI) * 0.35 : 1;
    squash.scale.set(1 + (1 - sq) * 0.4, Math.max(0.001, h * sq), 1 + (1 - sq) * 0.4);
    squash.visible = h > 0.02;
    const f = hit ? Math.max(0, 1 - k * 2) : 0;
    flash.emissive.setRGB(f, f, f * 0.8);
    wave.visible = hit;
    wave.scale.setScalar(0.6 + k * 5);
  };
  return makeModel('pow_block', root, update, [flash]);
}

export const MODELS = {
  question_block: buildQuestion,
  brick_block: buildBrick,
  used_block: buildUsed,
  hidden_block: buildHidden,
  crystal_block: buildCrystal,
  pow_block: buildPow,
};
