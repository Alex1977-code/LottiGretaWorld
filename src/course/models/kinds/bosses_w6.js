// Endgegner Welt 6 „Wolkeninseln“ (Kurs-Modus): Schubser-Prinz (6-A) und Würfelblase mit Gelee-Brocken und Gelee-Riese
// (6-C). Eigene Gestaltung. Maßstab Meter, Ursprung = Fußpunkt, Blick nach +X; state darf ein String sein.
// progress (0..1) überschreibt bei Einmal-Animationen die Zeit seit dem Zustandswechsel.
//
// schubser_prinz ≈2,5 m (mit Krone), Ø ≈2 m  Schubser-Prinz: großer, königsblau-violetter Schubser mit goldenen Hörnern,
//   Goldkrone mit Rubinen, rotem Samtumhang mit Goldsaum und Hermelinkragen.
//   state { anim: 'idle'|'charge'|'skid'|'stuck'|'squeezed'|'hit'|'fireball'|'defeated', speed (charge, Standard 6),
//           hp (3..0, Standard 3), progress? (squeezed 0,6 s; hit 0,6 s; fireball 0,8 s; defeated 1,2 s) }
//         charge: tief vorgebeugt, Hufe wirbeln, Umhang weht nach hinten, Dampf; skid: zurückgelehnt, Staubfontäne;
//         stuck: steckt in einer Glasröhre fest (Körper seitlich gestaucht, strampelt, zappelt);
//         squeezed: schießt gequetscht aus einer Röhre (lang und dünn, federt in 0,6 s zurück);
//         hit: Aufleuchten, Augen zu, Krone hüpft; fireball: holt Luft (0–0,4), bei progress 0,45 Maul auf mit Feuerstoß
//         → dann die Feuerkugel ('feuerkugel') an model.mouth() erzeugen; defeated: kippt auf den Rücken, Krone fällt.
//         hp ≤ 2: Krone sitzt schief; hp ≤ 1: rot glühende Wangen, Dampf aus den Nüstern.
//   model.mouth(out?) → Weltposition vor dem Maul.  root.userData.radius → Kollisionsradius (≈0,99 m).
// wuerfelblase  Kante ≈ size (1,2 m) + Hut ≈1,6 m  Würfelblase: glänzender, wabbeliger Gelee-Würfel mit großen Augen,
//   breitem Grinsen und lila Melone mit Goldband und Feder (Schwachstelle: Kopftreffer auf den Hut).
//   opts  { size (Kante, 1,2), color: 'rot'|'blau'|'gruen'|'gelb'|'lila'|'orange'|'rosa'|'silber'|'gold' (Standard 'rot';
//           silber/gold als Metall) }
//   state { anim: 'idle'|'hop'|'split'|'flee'|'hit'|'defeated', hp (3..0), progress? (hop 0,9 s Zyklus; split 0,7 s;
//           hit 0,6 s; defeated 1,2 s) }
//         hop: Stauchen → Strecken → Landen (der Motor bewegt root in der Höhe); split: zerplatzt in 8 Gelee-Brocken
//         (fliegen ≈1,5·size weit, danach unsichtbar); flee: hüpft gehetzt, Augen ängstlich, Schweißtropfen;
//         hit: platt gestaucht, Hut eingedellt, blinkt; defeated: zerläuft zur Pfütze, Hut fällt.
//   model.hat(out?) → Weltposition der Hut-Oberseite (Trefferpunkt).  root.userData.size → Kante.
// gelee_brocken Kante ≈ size (0,5 m)  kleiner Gelee-Würfel mit Knopfaugen (Bausteine des Riesen, auch als Geschoss).
//   opts  { size (0,5), color (wie Würfelblase, Standard 'silber') }
//   state { anim: 'idle'|'hop'|'fly'|'merge'|'defeated', progress? (hop 0,6 s Zyklus; merge 0,5 s; defeated 0,5 s) }
//         fly: überschlägt sich (Wurf/Flug); merge: schrumpft und verschwindet (geht im Riesen auf); defeated: zerplatzt.
//   Viele gleiche → createInstanced('gelee_brocken', n, { color }) (lib/instanced_w6.js).
// gelee_riese   Kante ≈ size (3 m) + Hut  Gelee-Riese: 27 Gelee-Brocken (3 × 3 × 3) fügen sich zum silbernen Riesenwürfel mit
//   Gesicht und Hut der Würfelblase zusammen.
//   opts  { size (Kante, 3), color ('silber') }
//   state { anim: 'idle'|'hop'|'split'|'hit', form (0..1: 0 = Brocken verstreut am Boden, 1 = fertiger Riese; Standard 1),
//           progress? (hop 0,9 s Zyklus; split 0,8 s: platzt zurück in verstreute Brocken; hit 0,6 s) }
//   root.userData.top → Höhe der Oberseite (ohne Hut), userData.formed → fertig zusammengesetzt?

import {
  THREE, TAU, Build, cached, vcol, basic, mesh, joint, eyes, makeModel, Clock, Blinker, damp, clamp, mix, col,
  smoothstep, lerp, instMesh, setInst, glowSprite, placed, onEllipsoid, dizzyStars,
} from '../lib/kit.js';
import {
  W6, SB, SB_EYES, SB_BROWS, schubserBodyGeo, schubserFootGeo, browGeo, puffyGeo, mouthShape, gradV, ownMat, Puffs, stick,
  jellyGeo, jellyMat, jellyColor, bowlerGeo, hash1, brockenGeo,
} from '../lib/w6Geos.js';
import { flameGeo, glowVcol } from '../lib/w5Geos.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
const prog = (st, clk, dur, loop = false) => (st.progress !== undefined ? clamp(st.progress, 0, 1) : loop ? (clk.age % dur) / dur : clamp(clk.age / dur, 0, 1));

// =============================================================================================
// Schubser-Prinz
// =============================================================================================
const K = 2.3;
const PR = {
  body: 0x4a2ca8, hi: 0x8a80f0, low: 0x1e1250, belly: 0xb8b0f4, horn: 0xfff4c8, hornTip: 0xffc21a,
  hoof: 0xffb02a, hoofHi: 0xffe08a, hoofLow: 0xc06a10, cheek: 0xff7ab8,
};
const SB_MOUTH = onEllipsoid(SB.c, SB.r, 0, -0.42);
const prOpenGeo = () => cached('w6:pr:open', () => {
  const b = new Build();
  b.add(puffyGeo(mouthShape('open'), 0.04, 0.014, 18, 2), W6.mouth, placed(SB_MOUTH.p.clone().addScaledVector(SB_MOUTH.n, -0.002), SB_MOUTH.n, new THREE.Vector3(0.11, 0.09, 1)));
  stick(b, onEllipsoid(SB.c, SB.r, 0, -0.52), W6.tongue, [0.07, 0.04, 0.02], 0.15);
  return b.geometry();
});
function crownGeo() {
  return cached('w6:pr:crown', () => {
    const b = new Build();
    const gold = { v: (x, y, z, nx, ny) => mix(W6.goldLow, W6.goldHi, smoothstep(ny * 0.4 + nx * 0.35 + 0.35)) };
    // Reif mit fünf Zacken (Lathe-Band + Kegel), Rubine, Kugeln auf den Spitzen
    b.cyl(0.17, 0.15, 0.09, gold, { p: [0, 0.045, 0] }, 32, true);
    b.cyl(0.165, 0.145, 0.09, W6.goldLow, { p: [0, 0.045, 0], s: [0.96, 1, 0.96] }, 32, true);
    b.torus(0.155, 0.02, gold, { p: [0, 0.005, 0], r: [Math.PI / 2, 0, 0] }, 6, 32);
    b.torus(0.172, 0.016, gold, { p: [0, 0.09, 0], r: [Math.PI / 2, 0, 0] }, 6, 32);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      const p = [Math.cos(a) * 0.162, 0.15, Math.sin(a) * 0.162];
      b.add(new THREE.ConeGeometry(0.05, 0.13, 8), gold, { p, r: [Math.sin(a) * 0.18, 0, -Math.cos(a) * 0.18] });
      b.sphere(0.025, W6.goldHi, { p: [Math.cos(a) * 0.175, 0.225, Math.sin(a) * 0.175] }, 10, 8);
      b.sphere(1, { v: (x, y, z, nx, ny) => mix(W6.ruby, W6.rubyHi, smoothstep(ny * 0.5 + 0.5)) }, { p: [Math.cos(a) * 0.175, 0.045, Math.sin(a) * 0.175], s: [0.025, 0.03, 0.025] }, 10, 8);
    }
    return b.geometry();
  });
}
/** Umhang: offenes Zylinderstück hinter dem Körper (Bogen um −X), Hermelinkragen, Goldsaum. Eigene Geometrie (verformt). */
const CAPE_U = 18, CAPE_V = 10;
function capeBase() {
  return cached('w6:pr:cape', () => {
    const pos = [], col = [], idx = [], uv = [];
    const c = new THREE.Color();
    for (let j = 0; j <= CAPE_V; j++) {
      const v = j / CAPE_V;
      const y = lerp(0.76, 0.1, v);
      const r = lerp(0.36, 0.56, Math.pow(v, 0.8));
      for (let i = 0; i <= CAPE_U; i++) {
        const u = i / CAPE_U;
        const a = Math.PI + (u - 0.5) * 2.5;
        pos.push(Math.cos(a) * r - 0.04, y, Math.sin(a) * r);
        uv.push(u, v);
        if (v > 0.9) c.set(W6.gold); else if (v > 0.84) c.set(0xfff0a0); else c.copy(mix(W6.redLow, W6.red, 0.4 + 0.6 * Math.abs(Math.sin(u * Math.PI * 4)) * 0.4 + (1 - v) * 0.3));
        col.push(c.r, c.g, c.b);
      }
    }
    for (let j = 0; j < CAPE_V; j++) for (let i = 0; i < CAPE_U; i++) {
      const a = j * (CAPE_U + 1) + i, b = a + 1, d = a + CAPE_U + 1, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  });
}
/** Hermelinkragen (hinten um den Hals, Bogen um −X) in einen Build schreiben. */
const addCollar = (b) => {
  const g = new THREE.TorusGeometry(1, 0.3, 10, 28, Math.PI * 1.05);
  g.rotateZ(Math.PI - Math.PI * 0.525);
  b.add(g, (x, y, z) => (hash1(Math.floor(Math.atan2(y, x) * 9) * 3.1 + Math.floor(z * 6)) > 0.86 ? col(W6.erminePt) : col(W6.ermine)), { p: [-0.04, 0.76, 0], r: [Math.PI / 2, 0, 0], s: [0.37, 0.43, 0.37] });
};
function buildSchubserPrinz() {
  const root = new THREE.Group();
  const own = [];
  const flash = ownMat(vcol(0.22), { emissive: 0x000000 });
  own.push(flash);
  const scaleJ = joint(); scaleJ.scale.setScalar(K);
  const pose = joint();
  const tilt = joint([0, SB.c[1], 0]);
  const inner = joint([0, -SB.c[1], 0]);
  const body = mesh(schubserBodyGeo('prinz', PR, { ws: 44, hs: 32, horn: 1.18, extra: addCollar }), flash, {}, true);
  const eye = eyes(SB_EYES, { key: 'w6:pr', iris: 0xffb01a, pupil: 0.52, depth: 0.55 });
  const brows = instMesh(browGeo(0x140a2a, 0.03, 0.13), vcol(0.5), 2, 1, 0.8);
  const open = mesh(prOpenGeo(), vcol(0.4));
  open.visible = false;
  const crownJ = joint([-0.03, 0.885, 0], mesh(crownGeo(), vcol(0.25, { metalness: 0.35 }, 'w6crown'), { s: [1.05, 1.05, 1.05] }, true));
  crownJ.rotation.z = 0.12;
  // Umhang (eigene, verformte Geometrie) und Kragen (am Umhang)
  const capeGeo = capeBase().clone();
  own.push(capeGeo);
  const capeMat = vcol(0.62, { side: THREE.DoubleSide }, 'w6cape');
  const cape = mesh(capeGeo, capeMat, {}, true);
  const capeBasePos = capeGeo.attributes.position.array.slice();
  inner.add(body, eye, brows, open, crownJ, cape);
  tilt.add(inner);
  const feet = instMesh(schubserFootGeo(PR), vcol(0.34), 2, 1, 0.2);
  feet.castShadow = true;
  pose.add(tilt, feet);
  scaleJ.add(pose);
  // Feuerstoß am Maul
  const fire = joint([0.6, 0.3, 0]);
  const flame = mesh(flameGeo('rot', 14), glowVcol(), { r: [0, 0, -Math.PI / 2], s: [0.5, 0.75, 0.5] });
  const fglow = glowSprite(0xff8a2a, 1.1, 0.8);
  fire.add(flame, fglow);
  fire.visible = false;
  inner.add(fire);
  const puffs = new Puffs(12, 0xf4ecff, { opacity: 0.85, radius: 5, cy: 1 });
  own.push(puffs);
  const dizzy = dizzyStars(0.6, 0.14);
  root.add(scaleJ, puffs.mesh, dizzy);
  const clk = new Clock(), blink = new Blinker();
  let phase = 0, lean = 0, emit = 0, angry = 0.7, worry = 0, capeLift = 0, fall = 0, crownFall = 0, sqx = 1, sqy = 1, sqz = 1, rage = 0;
  root.userData.radius = SB.r[0] * K;
  const P = capeGeo.attributes.position;
  const deformCape = (t, lift, flutter, crumple) => {
    for (let k = 0; k < P.count; k++) {
      const bx = capeBasePos[k * 3], by = capeBasePos[k * 3 + 1], bz = capeBasePos[k * 3 + 2];
      const v = clamp((0.76 - by) / 0.66, 0, 1), u = (k % (CAPE_U + 1)) / CAPE_U;
      const w = Math.sin(t * 7 + u * 6 + v * 4) * flutter * v;
      const back = lift * v * v;
      P.setXYZ(k, bx - back * 0.55 + w * 0.03, by + back * 0.35 - crumple * v * 0.1, bz * (1 - crumple * 0.3) + w * 0.02);
    }
    P.needsUpdate = true;
    capeGeo.computeVertexNormals();
  };
  const update = (dt, st) => {
    let anim = st.anim ?? 'idle';
    if (!['idle', 'charge', 'skid', 'stuck', 'squeezed', 'hit', 'fireball', 'defeated'].includes(anim)) anim = 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    const hp = clamp(st.hp ?? 3, 0, 3);
    const charge = anim === 'charge', skid = anim === 'skid', stuck = anim === 'stuck', dead = anim === 'defeated';
    const speed = st.speed ?? (charge ? 6 : 0);
    if (charge) phase += dt * (5 + speed * 1.6);
    if (stuck) phase += dt * 20;
    let tz = 0, ty = 0, tx = 0, sx = 1, sy = 1, sz = 1, lift = 0.1, flutter = 0.4, crumple = 0, mouthOpen = false;
    if (anim === 'idle') { sy = 1 + Math.sin(t * 2.2) * 0.02; tz = -0.04; }
    else if (charge) { tz = -0.36; tx = Math.sin(phase) * 0.05; ty = Math.abs(Math.cos(phase)) * 0.04; lift = 1; flutter = 1; }
    else if (skid) { tz = 0.28 + Math.sin(t * 40) * 0.015; lift = -0.25; flutter = 0.8; mouthOpen = true; }
    else if (stuck) { sz = 0.72; sx = 1.12; sy = 1.06; tz = Math.sin(t * 9) * 0.06; tx = Math.sin(t * 13) * 0.05; crumple = 1; flutter = 0.2; }
    else if (anim === 'squeezed') {
      const p = prog(st, clk, 0.6);
      const k = 1 - smoothstep(p);
      const wob = Math.sin(p * 22) * 0.12 * (1 - p);
      sx = 1 + k * 0.7 + wob; sy = 1 - k * 0.42 - wob * 0.5; sz = 1 - k * 0.42 - wob * 0.5; lift = 0.6; flutter = 1;
    } else if (anim === 'hit') { const p = prog(st, clk, 0.6); tz = Math.sin(Math.min(1, p * 2) * Math.PI) * 0.35; ty = Math.sin(p * Math.PI) * 0.06; }
    else if (anim === 'fireball') {
      const p = prog(st, clk, 0.8);
      if (p < 0.4) { const k = smoothstep(p / 0.4); tz = 0.18 * k; sx = sz = 1 + k * 0.06; sy = 1 + k * 0.04; }
      else if (p < 0.75) { const k = smoothstep((p - 0.4) / 0.1); tz = lerp(0.18, -0.2, k); mouthOpen = true; }
      else { tz = lerp(-0.2, 0, smoothstep((p - 0.75) / 0.25)); }
    }
    fall = damp(fall, dead ? 1 : 0, 4, dt);
    lean = damp(lean, tz, charge || skid ? 12 : 9, dt);
    tilt.rotation.z = lean + fall * 1.5;
    tilt.rotation.x = damp(tilt.rotation.x, tx, 12, dt);
    tilt.position.y = SB.c[1] + ty - fall * 0.12;
    sqx = damp(sqx, sx, 18, dt); sqy = damp(sqy, sy, 18, dt); sqz = damp(sqz, sz, 18, dt);
    tilt.scale.set(sqx, sqy, sqz);
    capeLift = damp(capeLift, lift, 5, dt);
    deformCape(t, capeLift, flutter, crumple);
    // Hufe
    for (let i = 0; i < 2; i++) {
      const s = i ? -1 : 1, ph = phase + i * Math.PI;
      let x = 0.04, y = 0, rz = 0;
      if (charge) { x += Math.sin(ph) * 0.15; rz = -Math.sin(ph) * 0.4; y = Math.max(0, Math.cos(ph)) * 0.09; }
      else if (skid) { x = 0.16; rz = -0.35; }
      else if (stuck) { x = Math.sin(ph) * 0.12; y = 0.03 + Math.max(0, Math.cos(ph)) * 0.06; rz = Math.sin(ph) * 0.6; }
      else if (dead) { x = 0.2 * fall; y = 0.25 * fall; rz = -1.2 * fall; }
      else if (anim === 'idle' && i === 0 && (t % 3.6) < 1) { x = 0.04 - Math.abs(Math.sin(t * 9)) * 0.12; rz = 0.2; y = 0.02; }
      setInst(feet, i, x, y, s * 0.2, 0, s * 0.08, rz);
    }
    feet.instanceMatrix.needsUpdate = true;
    // Krone: schief bei hp ≤ 2, hüpft bei Treffer, fällt beim Sieg
    crownFall = damp(crownFall, dead ? 1 : 0, 3, dt);
    const hop = anim === 'hit' ? Math.sin(prog(st, clk, 0.6) * Math.PI) * 0.12 : 0;
    crownJ.position.set(-0.03 - crownFall * 0.35, 0.885 + hop - crownFall * 0.25, crownFall * 0.2);
    crownJ.rotation.set(crownFall * 0.6, 0, 0.12 + (hp <= 2 ? 0.28 : 0) + crownFall * 1.4 + hop * 2);
    // Feuer
    const fireOn = anim === 'fireball' && prog(st, clk, 0.8) >= 0.45 && prog(st, clk, 0.8) < 0.75;
    fire.visible = fireOn;
    if (fireOn) { const k = (prog(st, clk, 0.8) - 0.45) / 0.3; fire.position.set(0.62 + k * 0.15, 0.3, 0); flame.scale.set(0.45 + Math.sin(t * 40) * 0.05, 0.7 + k * 0.4, 0.45); }
    // Dampf/Staub
    rage = damp(rage, hp <= 1 && !dead ? 1 : 0, 3, dt);
    emit -= dt;
    if (emit <= 0 && !dead) {
      if (charge) { puffs.burst([-0.9, 0.1, 0], { count: 3, speed: 1.2, up: 0.8, size: 0.35, life: 0.6, spread: 0.4 }); emit = 0.08; }
      else if (skid) { puffs.burst([0.9, 0.08, 0], { count: 4, speed: 2.6, up: 1.4, size: 0.32, life: 0.6, spread: 0.5 }); emit = 0.07; }
      else if (rage > 0.5 && (t % 1.4) < 0.06) { puffs.burst([1.15, 0.75, 0], { count: 3, speed: 1.0, up: 0.6, size: 0.16, life: 0.6, spread: 0.1 }); emit = 0.3; }
      else if (anim === 'squeezed' && clk.age < 0.1) { puffs.burst([0, 1.0, 0], { count: 8, speed: 3, up: 1, size: 0.3, life: 0.6, spread: 0.6 }); emit = 0.3; }
    }
    puffs.step(dt);
    // Gesicht
    worry = damp(worry, stuck || anim === 'hit' || dead ? 1 : 0, 12, dt);
    angry = damp(angry, charge || anim === 'fireball' ? 1 : skid ? 0.3 : 0.7, 10, dt);
    for (const b of SB_BROWS) {
      _e.set(-b.s * (angry * 0.55 - worry * 0.5), -b.s * 0.32, 0, 'YXZ');
      brows.setMatrixAt(b.s > 0 ? 0 : 1, _m.compose(_v.copy(b.p).setY(b.p.y + worry * 0.03 - angry * 0.012), _q.setFromEuler(_e), _s.setScalar(1)));
    }
    brows.instanceMatrix.needsUpdate = true;
    open.visible = mouthOpen || stuck || anim === 'squeezed';
    let bk = blink.update(dt);
    if (anim === 'hit' || dead || stuck) bk = 0.12; else if (charge) bk = 0.72; else if (skid || anim === 'squeezed') bk = 1;
    eye.userData.blink(bk);
    const hitK = anim === 'hit' ? (Math.sin(clk.age * 40) > 0 ? 0.32 : 0.05) * (1 - prog(st, clk, 0.6)) : 0;
    flash.emissive.setRGB(hitK + rage * (0.12 + Math.sin(t * 6) * 0.05), hitK, hitK);
    dizzy.visible = dead && fall > 0.6;
    if (dizzy.visible) { dizzy.position.set(0.3, 1.2, 0); dizzy.rotation.y = t * 3; }
  };
  const model = makeModel('schubser_prinz', root, update, [...own, feet, brows], { initial: 'idle' });
  model.mouth = (out = new THREE.Vector3()) => { root.updateMatrixWorld(true); return inner.localToWorld(out.set(0.62, 0.3, 0)); };
  return model;
}

// =============================================================================================
// Würfelblase und Gelee
// =============================================================================================
const WB_EYES = [1, -1].map((s) => ({ p: [0.47, 0.64, s * 0.2], r: 0.135, sy: 1.22, dir: [1, 0.05, s * 0.18] }));
const wbMouthGeo = () => cached('w6:wb:mouth', () => {
  const b = new Build();
  b.add(puffyGeo(mouthShape('grin'), 0.04, 0.014, 18, 2), W6.mouth, { p: [0.505, 0.37, 0], r: [0, Math.PI / 2, 0], s: [0.2, 0.16, 1] });
  b.sphere(1, W6.tongue, { p: [0.51, 0.3, 0], s: [0.012, 0.045, 0.1] }, 10, 6);
  for (const s of [1, -1]) b.sphere(1, 0xffffff, { p: [0.518, 0.395, s * 0.07], s: [0.008, 0.03, 0.03] }, 6, 4);
  return b.geometry();
});
const wbBrowGeo = () => browGeo(0x3a1460, 0.025, 0.13);
function buildWuerfelblase(opts = {}) {
  const size = Math.max(0.3, Number(opts.size ?? 1.2));
  const color = jellyColor(opts.color ?? 'rot');
  const root = new THREE.Group();
  const own = [];
  const flash = ownMat(jellyMat(color), { emissive: 0x000000 });
  own.push(flash);
  const unit = joint(); unit.scale.setScalar(size);
  const body = joint();
  const bodyM = mesh(jellyGeo(color), flash, {}, true);
  const eye = eyes(WB_EYES, { key: 'w6:wb', iris: color === 'silber' ? 0x2a6ae8 : 0x2a1a6a, pupil: 0.55, depth: 0.5 });
  const mouthM = mesh(wbMouthGeo(), vcol(0.35));
  const brows = instMesh(wbBrowGeo(), vcol(0.5), 2, 1, 0.8);
  const hatJ = joint([0.0, 0.96, -0.05]);
  const hatM = mesh(bowlerGeo(), vcol(0.45, {}, 'w6hat'), { s: [0.95, 0.95, 0.95] }, true);
  hatJ.add(hatM);
  body.add(bodyM, eye, mouthM, brows, hatJ);
  unit.add(body);
  // Splitter beim Zerplatzen
  const bits = instMesh(brockenGeo(color, true), jellyMat(color), 8, 3, 0.5);
  bits.castShadow = true; bits.visible = false; bits.frustumCulled = false;
  const sweat = new Puffs(6, 0x8ad8ff, { opacity: 0.85, radius: 3, cy: 1 });
  own.push(sweat);
  const dizzy = dizzyStars(0.35 * size, 0.08 * size);
  root.add(unit, bits, sweat.mesh, dizzy);
  const clk = new Clock(), blink = new Blinker();
  let sq = 1, st2 = 1, hatDent = 1, emit = 0, angry = 0.4, worry = 0, melt = 0, hatOff = 0;
  root.userData.size = size;
  const dirs = Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * TAU + 0.3; return [Math.cos(a), 0.9 + hash1(i) * 0.6, Math.sin(a)]; });
  const update = (dt, st) => {
    let anim = st.anim ?? 'idle';
    if (!['idle', 'hop', 'split', 'flee', 'hit', 'defeated'].includes(anim)) anim = 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    const hp = clamp(st.hp ?? 3, 0, 3);
    let ySq = 1 + Math.sin(t * 5) * 0.025, lean = 0, lift = 0;
    if (anim === 'hop' || anim === 'flee') {
      const dur = anim === 'flee' ? 0.45 : 0.9;
      const p = prog(st, clk, dur, true);
      if (p < 0.22) ySq = 1 - Math.sin((p / 0.22) * Math.PI * 0.5) * 0.3;
      else if (p < 0.8) { const k = (p - 0.22) / 0.58; ySq = 1 + Math.sin(k * Math.PI) * 0.16; lift = Math.sin(k * Math.PI) * (anim === 'flee' ? 0.25 : 0); }
      else ySq = 1 - Math.sin(((p - 0.8) / 0.2) * Math.PI) * 0.22;
      if (anim === 'flee') lean = 0.22;
    } else if (anim === 'hit') { const p = prog(st, clk, 0.6); ySq = 1 - Math.sin(Math.min(1, p * 1.5) * Math.PI) * 0.45; }
    sq = damp(sq, ySq, 22, dt);
    st2 = 1 / Math.sqrt(Math.max(0.2, sq));
    // Zerplatzen
    let splitK = 0;
    if (anim === 'split') {
      const p = prog(st, clk, 0.7);
      splitK = p;
      bits.visible = p > 0.05 && p < 1;
      for (let i = 0; i < 8; i++) {
        const d = dirs[i], k = clamp((p - 0.05) / 0.95, 0, 1);
        const r = k * 1.5 * size;
        const y = Math.max(0, (0.5 + d[1] * 2.2 * k - 3.2 * k * k) * size);
        setInst(bits, i, d[0] * r, y, d[2] * r, k * 6 + i, k * 4, k * 5, 0.38 * size * (1 - Math.max(0, k - 0.85) / 0.15 * 0.9));
      }
      bits.instanceMatrix.needsUpdate = true;
    } else bits.visible = false;
    const gone = anim === 'split' ? smoothstep(splitK / 0.25) : 0;
    melt = damp(melt, anim === 'defeated' ? 1 : 0, 3, dt);
    unit.visible = gone < 0.99;
    body.scale.set(st2 * (1 - gone) * (1 + melt * 0.6), Math.max(0.001, sq * (1 - gone) * (1 - melt * 0.82)), st2 * (1 - gone) * (1 + melt * 0.6));
    body.position.y = lift;
    body.rotation.z = damp(body.rotation.z, -lean, 10, dt);
    // Hut: eingedellt (Treffer, hp ≤ 1), fällt beim Sieg
    hatDent = damp(hatDent, anim === 'hit' ? 0.45 : hp <= 1 ? 0.8 : 1, 14, dt);
    hatOff = damp(hatOff, anim === 'defeated' ? 1 : 0, 4, dt);
    const hbx = Math.max(0.3, body.scale.x), hby = Math.max(0.3, body.scale.y), wide = 1 + (1 - hatDent) * 0.3;
    hatJ.scale.set(wide / hbx, hatDent / hby, wide / hbx);
    hatJ.position.set(-hatOff * 0.7, 0.96 + (anim === 'hit' ? Math.sin(prog(st, clk, 0.6) * Math.PI) * 0.15 : 0) - hatOff * 0.6, -0.05 + hatOff * 0.3);
    hatJ.rotation.set(hatOff * 0.5, 0, 0.12 + (anim === 'flee' ? Math.sin(t * 20) * 0.12 : 0) + hatOff * 1.3);
    // Gesicht
    worry = damp(worry, anim === 'flee' || anim === 'hit' || anim === 'defeated' ? 1 : 0, 10, dt);
    angry = damp(angry, anim === 'hop' ? 0.8 : hp <= 1 ? 0.9 : 0.4, 8, dt);
    for (let i = 0; i < 2; i++) {
      const s = i ? -1 : 1;
      _e.set(-s * (angry * 0.5 - worry * 0.6), 0, 0);
      brows.setMatrixAt(i, _m.compose(_v.set(0.5, 0.85 + worry * 0.03, s * 0.2), _q.setFromEuler(_e), _s.setScalar(1)));
    }
    brows.instanceMatrix.needsUpdate = true;
    emit -= dt;
    if (anim === 'flee' && emit <= 0) { sweat.burst([0.1 * size, 1.05 * size, (Math.random() - 0.5) * size], { count: 1, speed: 1.2, up: 1.2, size: 0.05 * size, life: 0.5, spread: 0.05 }); emit = 0.12; }
    if (anim === 'split' && clk.entered) sweat.burst([0, 0.5 * size, 0], { count: 6, speed: 2.5, up: 1.5, size: 0.1 * size, life: 0.5, spread: 0.3, force: true });
    sweat.step(dt);
    const hitK = anim === 'hit' ? (Math.sin(clk.age * 40) > 0 ? 0.35 : 0.05) * (1 - prog(st, clk, 0.6)) : 0;
    flash.emissive.setScalar(hitK);
    let bk = blink.update(dt);
    if (anim === 'hit' || anim === 'defeated') bk = 0.1; else if (anim === 'flee') bk = 1;
    eye.userData.blink(bk);
    eye.scale.setScalar(anim === 'flee' ? 1.12 : 1);
    dizzy.visible = anim === 'defeated' && melt > 0.5;
    if (dizzy.visible) { dizzy.position.y = 0.45 * size; dizzy.rotation.y = t * 3; }
  };
  const model = makeModel('wuerfelblase', root, update, [...own, bits, brows], { initial: 'idle' });
  model.hat = (out = new THREE.Vector3()) => { root.updateMatrixWorld(true); return hatJ.localToWorld(out.set(0, 0.3, 0)); };
  return model;
}

function buildGeleeBrocken(opts = {}) {
  const size = Math.max(0.1, Number(opts.size ?? 0.5));
  const color = jellyColor(opts.color ?? 'silber');
  const root = new THREE.Group();
  const own = [];
  const pose = joint([0, 0.5 * size, 0]);
  const inner = joint([0, -0.5, 0]);
  pose.scale.setScalar(size);
  inner.add(mesh(brockenGeo(color), jellyMat(color), {}, true));
  pose.add(inner);
  const puffs = new Puffs(6, 0xffffff, { opacity: 0.85, radius: 2, cy: 0.3 });
  own.push(puffs);
  root.add(pose, puffs.mesh);
  const clk = new Clock();
  let spin = 0;
  const update = (dt, st) => {
    let anim = st.anim ?? 'idle';
    if (!['idle', 'hop', 'fly', 'merge', 'defeated'].includes(anim)) anim = 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    let sy = 1 + Math.sin(t * 6) * 0.04, lift = 0, gone = 0;
    if (anim === 'hop') { const p = prog(st, clk, 0.6, true); sy = p < 0.2 ? 1 - Math.sin(p / 0.2 * Math.PI) * 0.25 : 1 + Math.sin((p - 0.2) / 0.8 * Math.PI) * 0.12; lift = Math.sin(Math.max(0, p - 0.2) / 0.8 * Math.PI) * 0.6 * size; }
    else if (anim === 'merge') { const p = prog(st, clk, 0.5); gone = smoothstep(p); sy = 1 + p * 0.5; }
    else if (anim === 'defeated') { const p = prog(st, clk, 0.5); if (clk.entered) puffs.burst([0, 0.3 * size, 0], { count: 6, speed: 1.6, up: 1, size: 0.12 * size, life: 0.5, spread: 0.2, force: true }); gone = smoothstep(p * 2); sy = 1 - p * 0.5; }
    spin = anim === 'fly' ? spin + dt * 9 : damp(spin, 0, 10, dt);
    pose.rotation.set(spin * 0.7, 0, spin);
    pose.position.y = 0.5 * size * Math.max(0.05, sy) + lift;
    const k = 1 - gone;
    pose.scale.set(size * k / Math.sqrt(Math.max(0.3, sy)), size * k * sy, size * k / Math.sqrt(Math.max(0.3, sy)));
    pose.visible = k > 0.01;
    inner.position.y = -0.5;
    puffs.step(dt);
  };
  return makeModel('gelee_brocken', root, update, own, { initial: 'idle' });
}

function buildGeleeRiese(opts = {}) {
  const S = Math.max(0.5, Number(opts.size ?? 3));
  const color = jellyColor(opts.color ?? 'silber');
  const root = new THREE.Group();
  const own = [];
  const N = 27;
  const bits = instMesh(brockenGeo(color, true), jellyMat(color), N, S * 2, S / 2);
  bits.castShadow = true; bits.frustumCulled = false;
  const flash = ownMat(jellyMat(color), { emissive: 0x000000 });
  own.push(flash);
  const unit = joint(); unit.scale.setScalar(S);
  const shell = joint();
  shell.add(mesh(jellyGeo(color), flash, {}, true));
  const eye = eyes(WB_EYES, { key: 'w6:wb', iris: 0x2a6ae8, pupil: 0.55, depth: 0.5 });
  const mouthM = mesh(wbMouthGeo(), vcol(0.35));
  const brows = instMesh(wbBrowGeo(), vcol(0.5), 2, 1, 0.8);
  for (let i = 0; i < 2; i++) { const s = i ? -1 : 1; _e.set(-s * 0.45, 0, 0); brows.setMatrixAt(i, _m.compose(_v.set(0.5, 0.86, s * 0.2), _q.setFromEuler(_e), _s.setScalar(1))); }
  const hatJ = joint([0, 0.96, -0.05], mesh(bowlerGeo(), vcol(0.45, {}, 'w6hat'), { s: [0.72, 0.72, 0.72] }, true));
  hatJ.rotation.z = 0.12;
  const face = joint();
  face.add(eye, mouthM, brows, hatJ);
  shell.add(face);
  unit.add(shell);
  const puffs = new Puffs(10, 0xf4f6ff, { opacity: 0.85, radius: S * 2, cy: S / 2 });
  own.push(puffs);
  root.add(bits, unit, puffs.mesh);
  // Platz im Würfel und verstreuter Platz am Boden je Brocken
  const cell = S / 3;
  const slots = Array.from({ length: N }, (_, i) => {
    const ix = i % 3, iy = Math.floor(i / 9), iz = Math.floor(i / 3) % 3;
    const a = hash1(i * 2.3 + 0.7) * TAU, r = (0.75 + hash1(i * 4.1) * 0.75) * S;
    return { gx: (ix - 1) * cell, gy: iy * cell, gz: (iz - 1) * cell, sx: Math.cos(a) * r, sz: Math.sin(a) * r, rot: hash1(i * 9.7) * TAU, delay: iy * 0.22 + hash1(i * 5.5) * 0.15 };
  });
  const clk = new Clock();
  let sq = 1, form = 1;
  root.userData.top = S; root.userData.formed = true;
  const update = (dt, st) => {
    let anim = st.anim ?? 'idle';
    if (!['idle', 'hop', 'split', 'hit'].includes(anim)) anim = 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    let f = clamp(st.form ?? 1, 0, 1);
    if (anim === 'split') { const p = prog(st, clk, 0.8); f = Math.min(f, 1 - p); if (clk.entered) puffs.burst([0, S * 0.5, 0], { count: 10, speed: 3, up: 1.5, size: 0.3 * S / 3, life: 0.6, spread: S * 0.3, force: true }); }
    form = anim === 'split' ? f : damp(form, f, 30, dt);
    const formed = form > 0.97;
    root.userData.formed = formed;
    // Hüpfen nur fertig
    let ySq = 1 + Math.sin(t * 3) * 0.015;
    if (anim === 'hop' && formed) {
      const p = prog(st, clk, 0.9, true);
      if (p < 0.22) ySq = 1 - Math.sin((p / 0.22) * Math.PI * 0.5) * 0.22;
      else if (p < 0.8) ySq = 1 + Math.sin(((p - 0.22) / 0.58) * Math.PI) * 0.1;
      else ySq = 1 - Math.sin(((p - 0.8) / 0.2) * Math.PI) * 0.18;
    } else if (anim === 'hit') ySq = 1 - Math.sin(Math.min(1, prog(st, clk, 0.6) * 1.5) * Math.PI) * 0.3;
    sq = damp(sq, ySq, 20, dt);
    const w = 1 / Math.sqrt(Math.max(0.3, sq));
    // Hülle (Riesenwürfel) erscheint am Ende, Brocken verschwinden darin
    const shellK = smoothstep((form - 0.88) / 0.1);
    unit.visible = shellK > 0.01;
    shell.scale.set(w * (0.92 + shellK * 0.08), sq * (0.92 + shellK * 0.08), w * (0.92 + shellK * 0.08));
    face.visible = shellK > 0.6;
    face.scale.setScalar(Math.max(0.001, smoothstep((shellK - 0.6) / 0.4)));
    bits.visible = form < 0.995;
    for (let i = 0; i < N; i++) {
      const s = slots[i];
      const k = smoothstep((form * 1.5 - s.delay) / 0.9);
      const x = lerp(s.sx, s.gx, k), z = lerp(s.sz, s.gz, k);
      const y = lerp(0, s.gy, k) + Math.sin(k * Math.PI) * S * 0.35;
      const sc = cell * 0.97 * (form > 0.9 ? 1 - smoothstep((form - 0.95) / 0.05) * 0.1 : 1);
      setInst(bits, i, x, y, z, (1 - k) * 0.3, lerp(s.rot, 0, k), (1 - k) * Math.sin(s.rot) * 0.4, sc);
    }
    bits.instanceMatrix.needsUpdate = true;
    puffs.step(dt);
    const hitK = anim === 'hit' ? (Math.sin(clk.age * 40) > 0 ? 0.35 : 0.05) * (1 - prog(st, clk, 0.6)) : 0;
    flash.emissive.setScalar(hitK);
    eye.userData.blink(anim === 'hit' ? 0.1 : (t % 3.3) < 0.12 ? 0.1 : 1);
    brows.instanceMatrix.needsUpdate = true;
  };
  return makeModel('gelee_riese', root, update, [...own, bits, brows], { initial: 'idle' });
}

export const MODELS = {
  schubser_prinz: buildSchubserPrinz,
  wuerfelblase: buildWuerfelblase,
  gelee_brocken: buildGeleeBrocken,
  gelee_riese: buildGeleeRiese,
};
