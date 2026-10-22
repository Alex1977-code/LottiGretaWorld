// Sonder-Bausteine und Figuren Welt 2 (Kurs-Modus). Eigene Gestaltung im Spielzeug-Look. Maßstab Meter,
// Ursprung = Fußpunkt (Mitte der Unterseite; Drehteile: Drehpunkt, siehe unten), Vorderseite nach +X;
// state darf ein String sein.
//
// taststein          Tastenstein (2-2) Ø 1,6 m: achteckige Schiefersäule in einem Bodenring, goldener Stern oben,
//                    Runen an den Seiten. Oberkante bei y = 1,0 + rise·opts.rise.
//                    opts { rise (Hubhöhe in m, Standard 1) }  state { anim: 'off'|'on', rise (0..1) }
//                    on: Runen und Stern leuchten türkis, Funkeln.
// propellerplattform Schwebeplattform mit Propeller darunter: weiße Platte mit türkisem Rand und Goldbolzen, roter
//                    Motor, vier gelbe Rotorblätter (bis y ≈ −0,7). Oberseite bei y = thick.
//                    opts { size: [x, z] | n (Standard [3, 3]), thick (0,4) }  state { spin (rad/s, Standard 16) }
// zahnradplattform   Zahnrad-Drehplattform (Bronze/Gold, Nabe mit Bolzen). Ursprung = Mitte des Zahnrads.
//                    opts { radius (2,5), teeth (12), thick (0,6), axis: 'y' (liegt flach, Oberseite y = thick/2) |
//                           'x' (steht, Achse ±X) | 'z' (steht, Achse ±Z) }
//                    state { angle (rad, Drehung um die Achse) }
// rollwalze          rollender Hügel: Rasenwalze mit Mähstreifen und Blümchen (style 'gras') bzw. Baumstamm mit
//                    Rinde und Jahresringen ('holz'). Achse entlang ±X, Unterkante y = 0, Achse bei y = radius.
//                    opts { radius (2), length (6), style: 'gras'|'holz' }
//                    state { angle (rad um +X) | speed (m/s Oberfläche; positiv = Oberseite läuft nach +Z) }
// drehrad            rotierendes Rad (Achse ±X, Ursprung = Nabe): roter Kranz, weiße Speichen, goldene Nabe,
//                    gelbe Stege am Kranz (bleiben waagrecht). Steg i liegt mit Mitte bei
//                    (0, R·sin(angle + i·2π/n), R·cos(angle + i·2π/n)), Oberseite +0,12.
//                    opts { radius (3), platforms (4), plank: [x, z] ([1,6, 1,1]), level (true) }  state { angle }
// wachs_block        wachsender ?-Block: goldener Funkelblock auf einer Säule aus braunen Blöcken.
//                    opts { height (4, Endhöhe der Blockunterkante) }
//                    state { grow (0..1), anim: 'idle'|'bump', n? }  Blockunterkante bei y = grow·height.
// pfeld              Druckfeld (P-Feld) Ø size: braucht `need` Figuren gleichzeitig; große Ziffer, Lämpchen im Kreis.
//                    opts { need (2), size (2) }  state { count (Figuren darauf), on (true = ausgelöst) }
//                    aus: blau, Lämpchen zeigen count; on: gold, gedrückt, Häkchen-Stern statt Ziffer.
// multilift          Viererlift: Plattform (Oberseite y = 0,4) mit Anzeigetafel hinten (−X), Ziffer need und
//                    Lämpchen für count. opts { need (4), size: [x, z] ([3, 3]) }
//                    state { count, anim: 'wait'|'go' }  go: Tafel zeigt grünen Pfeil, Lämpchen blinken.
// figurenschalter    Schalter mit Porträt der Heldin auf dem Knopf (Lotti blau, Greta grün), Sockel Ø 1,3 m.
//                    opts { hero: 'lotti'|'greta' }  state { anim: 'idle'|'pressed' }
// push_switch_gold   goldener Druckschalter 1 m (wie push_switch, Knopf aus Gold mit weißem Funkel).
//                    state { anim: 'idle'|'pressed' }
// scheinwerfer       Licht für die Schattenwand: Bühnenscheinwerfer auf Dreibein, Kopf zeigt nach +X.
//                    opts { height (1,8), cone (true: sichtbarer Lichtkegel), length (6) }
//                    state { on (true), aim (Neigung in rad, negativ = nach unten) }
// tuer               Tür mit Rahmen: Holzflügel mit Eisenbändern und goldenem Stern, Angel bei z = −width/2,
//                    öffnet nach −X. opts { width (1,6), height (2,4), style: 'holz'|'stein' }  state { open (0..1) }
// kruemel            Krümel, Pflaumes kleiner Kaninchen-Freund (dasselbe Modell wie bunny_small, ≈0,5 m).
//                    state { anim: 'idle'|'scared'|'cheer'|'hop'|'caught' }  scared: zittert geduckt, Ohren angelegt,
//                    große Augen, Angstschweiß; cheer: hüpft jubelnd, Ohren hoch, Funkeln.

import {
  THREE, TAU, Build, cached, vcol, std, basic, mesh, joint, makeModel, Clock, damp, clamp, col, mix, smoothstep, lerp,
  instMesh, setInst, canvasTexture, glowSprite, sparkleSprite, puffyStarGeo, sparkShape, starShape, metal, gold,
} from '../lib/kit.js';
import { questionGeo, usedGeo, blockMat } from '../lib/blockGeos.js';
import { MODELS as W1PROPS } from './props.js';

const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const sizeOf = (v, d) => (Array.isArray(v) ? v : [Number(v ?? d[0]), Number(v ?? d[1])]);

// =============================================================================================
// Tastenstein
// =============================================================================================
const TS = { stone: 0x6272b8, stoneHi: 0x96a6e8, ring: 0x3a4266, ringHi: 0x7a84b8, rune: 0x7af0ff, star: 0xffc21a };
function buildTaststein(opts = {}) {
  const riseH = Number(opts.rise ?? 1);
  const root = new THREE.Group();
  const ring = mesh(cached('w2:ts:ring', () => {
    const b = new Build();
    b.cyl(0.98, 1.02, 0.14, { v: (x, y, z, nx, ny) => mix(TS.ring, TS.ringHi, smoothstep(ny)) }, { p: [0, 0.07, 0] }, 32);
    b.cyl(0.84, 0.84, 0.02, 0x141826, { p: [0, 0.145, 0] }, 32);
    return b.geometry();
  }), vcol(0.6), {}, false);
  ring.receiveShadow = true;
  const lift = joint();
  const stone = mesh(cached('w2:ts:stone', () => {
    const b = new Build();
    b.cyl(0.78, 0.8, 1.0, { v: (x, y, z, nx, ny) => (ny > 0.9 ? col(TS.stoneHi) : mix(TS.stone, TS.stoneHi, smoothstep(y + 0.2) * 0.5)) }, { p: [0, 0.5, 0] }, 8);
    b.cyl(0.8, 0.8, 0.06, TS.ringHi, { p: [0, 0.97, 0] }, 8);
    b.cyl(0.82, 0.82, 0.06, TS.ringHi, { p: [0, 0.06, 0] }, 8);
    return b.geometry();
  }), vcol(0.55), {}, true);
  const glowMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, emissive: 0x000000 });
  const runes = mesh(cached('w2:ts:runes', () => {
    const b = new Build();
    b.add(puffyStarGeo(0.42, 0.2, 0.06, 0.025), TS.star, { p: [0, 1.0, 0], r: [-Math.PI / 2, 0, 0] });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + TAU / 16, r = 0.77;
      const p = [Math.cos(a) * r, 0.5, Math.sin(a) * r];
      const kind = i % 3;
      if (kind === 0) b.add(new THREE.TorusGeometry(0.11, 0.025, 6, 16), TS.rune, { p, r: [0, -a + Math.PI / 2, 0] });
      else if (kind === 1) b.extrude(sparkShape(0.14, 0.2), 0.02, TS.rune, { p, r: [0, -a + Math.PI / 2, 0] }, 0, 4, 1);
      else for (const dy of [-0.1, 0.1]) b.box(0.03, 0.04, 0.2, TS.rune, { p: [p[0], 0.5 + dy, p[2]], r: [0, -a, 0] }, 0.01, 1);
    }
    return b.geometry();
  }), glowMat, {}, false);
  const sp = sparkleSprite(0xaaffff, 0.6); sp.position.y = 1.3;
  lift.add(stone, runes, sp);
  root.add(ring, lift);
  const clk = new Clock();
  let g = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'off';
    clk.tick(dt, anim);
    const t = clk.t;
    const on = anim === 'on';
    g = damp(g, on ? 1 : 0, 6, dt);
    const rise = clamp(st.rise ?? (on ? 1 : 0), 0, 1);
    lift.position.y = damp(lift.position.y, rise * riseH, 10, dt);
    const p = g * (0.75 + Math.sin(t * 4) * 0.25);
    glowMat.emissive.setRGB(p * 0.25, p * 0.85, p * 0.95);
    const k = Math.pow(Math.max(0, Math.sin(t * 2.6)), 6) * g;
    sp.visible = k > 0.03; sp.scale.setScalar(Math.max(0.001, k * 0.8));
    sp.position.y = 1.3 + Math.sin(t * 1.3) * 0.1;
  };
  return makeModel('taststein', root, update, [glowMat], { initial: 'off' });
}

// =============================================================================================
// Propellerplattform
// =============================================================================================
const PP = { top: 0xf4f8ff, side: 0xd8e2f0, rim: 0x2fb8c8, bolt: 0xffc21a, motor: 0xe8322a, blade: 0xffc21a, bladeTip: 0xff8a1a, hub: 0x3a4256 };
function buildPropellerplattform(opts = {}) {
  const sz = sizeOf(opts.size, [3, 3]), th = Number(opts.thick ?? 0.4);
  const root = new THREE.Group();
  const slab = mesh(cached(`w2:pp:${sz}:${th}`, () => {
    const b = new Build();
    b.box(sz[0], th, sz[1], { v: (x, y, z, nx, ny) => (ny > 0.9 ? col(PP.top) : ny < -0.9 ? col(PP.side) : mix(PP.rim, 0x6ae0ea, smoothstep(y / th + 0.5))) }, { p: [0, th / 2, 0] }, 0.1, 2);
    for (const sx of [1, -1]) for (const sz2 of [1, -1]) b.sphere(0.09, PP.bolt, { p: [sx * (sz[0] / 2 - 0.25), th, sz2 * (sz[1] / 2 - 0.25)], s: [1, 0.45, 1] }, 10, 6);
    // Motor unten, Gehäuse
    b.cyl(0.32, 0.26, 0.32, { v: (x, y, z, nx, ny) => mix(0xa8141c, PP.motor, smoothstep(nx * 0.5 + 0.5)) }, { p: [0, -0.15, 0] }, 18);
    b.cyl(0.12, 0.12, 0.2, PP.hub, { p: [0, -0.38, 0] }, 12);
    for (const s of [1, -1]) b.box(0.05, 0.2, 0.05, PP.hub, { p: [s * 0.3, -0.05, 0] }, 0.01, 1);
    return b.geometry();
  }), vcol(0.4), {}, true);
  slab.receiveShadow = true;
  const rotor = joint([0, -0.5, 0]);
  rotor.add(mesh(cached('w2:pp:rotor', () => {
    const b = new Build();
    b.sphere(0.1, PP.motor, { s: [1, 0.7, 1] }, 12, 8);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU;
      const g = new THREE.SphereGeometry(1, 14, 6); g.scale(0.55, 0.025, 0.11); g.translate(0.56, 0, 0);
      b.add(g, { v: (x) => mix(PP.blade, PP.bladeTip, smoothstep((x - 0.6) / 0.5)) }, { r: [0.22, a, 0], order: 'YXZ' });
    }
    return b.geometry();
  }), vcol(0.35), {}, true));
  const blur = mesh(cached('w2:pp:blur', () => new THREE.CircleGeometry(1.15, 32).rotateX(-Math.PI / 2)),
    basic('w2:ppBlur', { color: 0xfff2b0, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }), { p: [0, -0.5, 0] });
  root.add(slab, rotor, blur);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const w = st.spin ?? 16;
    rotor.rotation.y += w * dt;
    blur.visible = Math.abs(w) > 12;
    slab.position.y = Math.sin(clk.t * 2.2) * 0.0;
  };
  return makeModel('propellerplattform', root, update);
}

// =============================================================================================
// Zahnrad-Drehplattform
// =============================================================================================
const ZR = { bronze: 0xd89a3a, bronzeHi: 0xffd27a, dark: 0x9a6420, hub: 0x3a4256, bolt: 0xfff0a0 };
function gearShape(R, teeth) {
  const s = new THREE.Shape();
  const r0 = R - 0.32, n = teeth * 4;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU, ph = i % 4;
    const r = ph === 1 || ph === 2 ? R : r0;
    const aa = a + (ph === 1 ? 0.04 : ph === 2 ? -0.04 : 0) * (12 / teeth);
    if (i === 0) s.moveTo(Math.cos(aa) * r, Math.sin(aa) * r); else s.lineTo(Math.cos(aa) * r, Math.sin(aa) * r);
  }
  const hole = new THREE.Path(); hole.absarc(0, 0, R * 0.16, 0, TAU, true);
  s.holes.push(hole);
  return s;
}
function buildZahnrad(opts = {}) {
  const R = Number(opts.radius ?? 2.5), teeth = Math.max(6, Math.round(opts.teeth ?? 12)), th = Number(opts.thick ?? 0.6);
  const axis = ['x', 'y', 'z'].includes(opts.axis) ? opts.axis : 'y';
  const root = new THREE.Group();
  const holder = joint();
  if (axis === 'y') holder.rotation.x = -Math.PI / 2;    // Fläche (XY) → waagrecht, Dicke entlang Y
  else if (axis === 'x') holder.rotation.y = Math.PI / 2;
  const spin = joint();
  spin.add(mesh(cached(`w2:gear:${R}:${teeth}:${th}`, () => {
    const b = new Build();
    b.extrude(gearShape(R, teeth), th * 0.8, { v: (x, y, z, nx, ny, nz) => (Math.abs(nz) > 0.8 ? mix(ZR.bronze, ZR.bronzeHi, smoothstep(Math.hypot(x, y) / R)) : col(ZR.dark)) }, null, th * 0.1, 3, 2);
    // Nabe mit Bolzen, Speichenrillen
    b.cyl(R * 0.26, R * 0.26, th * 1.1, ZR.hub, { r: [Math.PI / 2, 0, 0] }, 20);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; for (const s of [1, -1]) b.sphere(0.07, ZR.bolt, { p: [Math.cos(a) * R * 0.38, Math.sin(a) * R * 0.38, s * th * 0.5], s: [1, 1, 0.5] }, 8, 6); }
    for (const s of [1, -1]) b.torus(R * 0.62, 0.05, ZR.dark, { p: [0, 0, s * th * 0.5] }, 6, 40);
    return b.geometry();
  }), vcol(0.35, {}, 'metalish'), {}, true));
  spin.children[0].receiveShadow = true;
  holder.add(spin);
  root.add(holder);
  const update = (dt, st) => { spin.rotation.z = (axis === 'y' ? 1 : 1) * (st.angle ?? 0); };
  return makeModel('zahnradplattform', root, update);
}

// =============================================================================================
// Rollwalze
// =============================================================================================
const RW = { grass: 0x72dc4a, grassDark: 0x3a9a28, dirt: 0x8a5a32, dirtDark: 0x6a4020, ring1: 0xc89058, ring2: 0xa8703a, bark: 0x9a6232, barkDark: 0x5a3218, flower: [0xffffff, 0xffe14a, 0xff7ab0] };
function buildRollwalze(opts = {}) {
  const R = Number(opts.radius ?? 2), L = Number(opts.length ?? 6), wood = opts.style === 'holz';
  const root = new THREE.Group();
  const roll = joint([0, R, 0]);
  roll.add(mesh(cached(`w2:walze:${R}:${L}:${wood}`, () => {
    const b = new Build();
    const stripes = wood ? 18 : Math.max(8, Math.round(R * 5) * 2);
    const segs = wood ? 36 : stripes * 3;
    const band = (x, y, z) => {
      const k = Math.floor((Math.atan2(z, x) / TAU + 1) * stripes) % 2;
      if (wood) return k ? RW.bark : RW.barkDark;
      return k ? RW.grass : RW.grassDark;
    };
    b.cyl(R, R, L, band, { r: [0, 0, Math.PI / 2] }, segs);
    // Stirnseiten: Erde mit Grasrand bzw. Jahresringe
    for (const s of [1, -1]) {
      const rings = wood ? [[R, RW.ring2], [R * 0.78, RW.ring1], [R * 0.56, RW.ring2], [R * 0.34, RW.ring1], [R * 0.14, RW.ring2]]
        : [[R, RW.grassDark], [R * 0.93, RW.dirt], [R * 0.6, RW.dirtDark], [R * 0.32, RW.dirt]];
      rings.forEach(([r, c], i) => b.add(new THREE.CircleGeometry(r, segs), c, { p: [s * (L / 2 + 0.005 + i * 0.004), 0, 0], r: [0, s * Math.PI / 2, 0] }));
    }
    if (!wood) {
      // Blümchen und Grasbüschel auf der Rolle
      for (let i = 0; i < Math.round(L * R * 2.2); i++) {
        const a = hash(i) * TAU, x = (hash(i + 31) - 0.5) * (L - 0.4);
        const n = new THREE.Vector3(0, Math.cos(a), Math.sin(a));
        const p = n.clone().multiplyScalar(R + 0.03); p.x = x;
        const c = RW.flower[i % 3];
        b.sphere(0.07, c, { p: p.toArray(), s: [1, 1, 1] }, 6, 4);
        b.sphere(0.035, 0xffc21a, { p: p.clone().addScaledVector(n, 0.04).toArray() }, 5, 3);
      }
    } else {
      for (let i = 0; i < Math.round(L * 1.5); i++) {
        const a = hash(i) * TAU, x = (hash(i + 31) - 0.5) * (L - 0.6);
        b.sphere(0.12, RW.barkDark, { p: [x, Math.cos(a) * R, Math.sin(a) * R], s: [1.6, 0.6, 0.6] }, 8, 6);
      }
    }
    return b.geometry();
  }), vcol(0.8), {}, true));
  roll.children[0].receiveShadow = true;
  root.add(roll);
  let a = 0;
  const update = (dt, st) => {
    if (st.angle !== undefined) a = st.angle;
    else a += dt * (st.speed ?? 0) / R;
    roll.rotation.x = a;
  };
  return makeModel('rollwalze', root, update);
}

// =============================================================================================
// Drehrad
// =============================================================================================
const DR = { rim: 0xe8322a, rimHi: 0xff6a5a, spoke: 0xf4f8ff, hub: 0xffc21a, plank: 0xffc21a, plankDark: 0xe09a12, stripe: 0xffffff };
function buildDrehrad(opts = {}) {
  const R = Number(opts.radius ?? 3), n = Math.max(1, Math.round(opts.platforms ?? 4));
  const pk = sizeOf(opts.plank, [1.6, 1.1]), level = opts.level !== false;
  const root = new THREE.Group();
  const wheel = joint();
  wheel.add(mesh(cached(`w2:drehrad:${R}`, () => {
    const b = new Build();
    b.torus(R, 0.14, { v: (x, y, z, nx) => mix(DR.rim, DR.rimHi, smoothstep(nx * 0.5 + 0.5)) }, { r: [0, Math.PI / 2, 0] }, 10, 64);
    b.torus(R - 0.3, 0.06, DR.rim, { r: [0, Math.PI / 2, 0] }, 6, 56);
    const k = 8;
    for (let i = 0; i < k; i++) {
      const a = (i / k) * TAU;
      b.box(0.1, R - 0.2, 0.12, DR.spoke, { p: [0, Math.sin(a) * (R / 2), Math.cos(a) * (R / 2)], r: [a - Math.PI / 2, 0, 0] }, 0.03, 1);
    }
    b.cyl(0.45, 0.45, 0.5, DR.hub, { r: [0, 0, Math.PI / 2] }, 20);
    for (const s of [1, -1]) b.add(puffyStarGeo(0.3, 0.14, 0.06, 0.02), 0xffffff, { p: [s * 0.27, 0, 0], r: [0, s * Math.PI / 2, 0] });
    return b.geometry();
  }), vcol(0.4), {}, true));
  const plankGeo = cached(`w2:drehrad:plank:${pk}`, () => {
    const b = new Build();
    b.box(pk[0], 0.24, pk[1], { v: (x, y, z, nx, ny) => (ny > 0.9 ? (Math.abs(z) < pk[1] * 0.12 ? col(DR.stripe) : col(DR.plank)) : col(DR.plankDark)) }, null, 0.06, 1);
    b.box(0.12, 0.3, 0.12, DR.spoke, { p: [0, -0.2, 0] }, 0.03, 1);
    return b.geometry();
  });
  const planks = instMesh(plankGeo, vcol(0.45), n, R + 1.5, 0);
  planks.castShadow = true; planks.receiveShadow = true;
  root.add(wheel, planks);
  const update = (dt, st) => {
    const ang = st.angle ?? 0;
    wheel.rotation.x = -ang;
    for (let i = 0; i < n; i++) {
      const a = ang + (i / n) * TAU;
      setInst(planks, i, 0, Math.sin(a) * R, Math.cos(a) * R, level ? 0 : -a + Math.PI / 2, 0, 0);
    }
    planks.instanceMatrix.needsUpdate = true;
  };
  return makeModel('drehrad', root, update);
}

// =============================================================================================
// Wachsender ?-Block
// =============================================================================================
function buildWachsBlock(opts = {}) {
  const H = Math.max(1, Number(opts.height ?? 4));
  const nSeg = Math.ceil(H) + 1;
  const root = new THREE.Group();
  const top = joint();
  const qb = mesh(questionGeo('high'), blockMat(), {}, true);
  top.add(qb);
  const col1 = instMesh(usedGeo('low'), blockMat(), nSeg, H + 2, H / 2);
  col1.castShadow = true; col1.receiveShadow = true;
  const sp = sparkleSprite(0xffffff, 0.4); sp.position.set(0.45, 0.95, 0.45);
  top.add(sp);
  root.add(top, col1);
  const clk = new Clock();
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    if ((st.n !== undefined && st.n !== clk.lastN) || (clk.entered && anim === 'bump')) clk.age = 0;
    clk.lastN = st.n;
    const g = clamp(st.grow ?? 0, 0, 1);
    const y = g * H;
    const b = anim === 'bump' && clk.age < 0.25 ? Math.sin(clk.age / 0.25 * Math.PI) : 0;
    top.position.y = y + b * 0.3;
    top.scale.set(1, 1 + b * 0.08, 1);
    for (let i = 0; i < nSeg; i++) {
      const yy = y - (i + 1);
      if (yy > -1 && i < Math.ceil(y + 0.001)) setInst(col1, i, 0, Math.max(yy, -1), 0); else col1.setMatrixAt(i, zero);
    }
    col1.instanceMatrix.needsUpdate = true;
    const k = Math.pow(Math.max(0, Math.sin(clk.t * 2.1)), 8);
    sp.visible = k > 0.03; sp.scale.setScalar(Math.max(0.001, k * 0.45));
  };
  return makeModel('wachs_block', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Ziffern-Texturen, Druckfeld, Viererlift
// =============================================================================================
function digitTexture(d, fg = '#ffffff', ring = null) {
  return canvasTexture(`w2:digit:${d}:${fg}:${ring}`, 128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    if (ring) { ctx.fillStyle = ring; ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.46, 0, TAU); ctx.fill(); }
    ctx.font = 'bold 100px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(20,24,60,0.9)'; ctx.lineJoin = 'round';
    ctx.strokeText(String(d), w / 2, h / 2 + 6);
    ctx.fillStyle = fg; ctx.fillText(String(d), w / 2, h / 2 + 6);
  });
}
function arrowTexture() {
  return canvasTexture('w2:arrowUp', 128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#4af06a'; ctx.strokeStyle = '#0c3a18'; ctx.lineWidth = 8; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(64, 14); ctx.lineTo(112, 66); ctx.lineTo(82, 66); ctx.lineTo(82, 114); ctx.lineTo(46, 114); ctx.lineTo(46, 66); ctx.lineTo(16, 66); ctx.closePath();
    ctx.stroke(); ctx.fill();
  });
}
const lampGeo = () => cached('w2:lamp', () => new THREE.SphereGeometry(1, 10, 6, 0, TAU, 0, Math.PI / 2));
const LAMP_ON = new THREE.Color(0xffe14a), LAMP_OFF = new THREE.Color(0x3a3e52), LAMP_GO = new THREE.Color(0x4af06a);

const PF = { off: 0x2f6ae8, offHi: 0x6a9aff, on: 0xffc21a, onHi: 0xffe07a, base: 0xd8dde8, baseDark: 0x8a90a0 };
function buildPfeld(opts = {}) {
  const need = clamp(Math.round(opts.need ?? 2), 1, 9), S = Number(opts.size ?? 2), R = S / 2;
  const root = new THREE.Group();
  const base = mesh(cached(`w2:pf:base:${S}`, () => {
    const b = new Build();
    b.cyl(R + 0.12, R + 0.18, 0.14, { v: (x, y, z, nx, ny) => mix(PF.baseDark, PF.base, smoothstep(ny)) }, { p: [0, 0.07, 0] }, 40);
    return b.geometry();
  }), vcol(0.5), {}, false);
  base.receiveShadow = true;
  const press = joint([0, 0.14, 0]);
  const plateMat = new THREE.MeshStandardMaterial({ color: PF.off, roughness: 0.35, emissive: 0x000000 });
  const plate = mesh(cached(`w2:pf:plate:${S}`, () => {
    const g = new THREE.CylinderGeometry(R - 0.05, R, 0.12, 40); g.translate(0, 0.06, 0); return g;
  }), plateMat, {}, true);
  plate.receiveShadow = true;
  const decalMat = new THREE.MeshBasicMaterial({ map: digitTexture(need), transparent: true, depthWrite: false });
  const decal = mesh(cached(`w2:pf:decal:${S}`, () => new THREE.PlaneGeometry(R * 1.3, R * 1.3).rotateX(-Math.PI / 2)), decalMat, { p: [0, 0.125, 0], r: [0, Math.PI / 2, 0] });
  const lamps = instMesh(lampGeo(), basic('w2:lamp', { color: 0xffffff }), need, R + 0.5, 0.2);
  for (let i = 0; i < need; i++) {
    const a = (i / need) * TAU + Math.PI / 2;
    setInst(lamps, i, Math.cos(a) * (R + 0.06), 0.14, Math.sin(a) * (R + 0.06), 0, 0, 0, [0.12, 0.09, 0.12]);
    lamps.setColorAt(i, LAMP_OFF);
  }
  press.add(plate, decal);
  root.add(base, press, lamps);
  const starTex = digitTexture('★', '#fff6c0');
  const clk = new Clock();
  let k = 0;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const count = clamp(Math.round(st.count ?? 0), 0, need);
    const on = st.on ?? count >= need;
    k = damp(k, on ? 1 : 0, 10, dt);
    plateMat.color.setHex(on ? PF.on : PF.off);
    plateMat.emissive.setRGB(on ? 0.25 + Math.sin(clk.t * 6) * 0.08 : count * 0.05, on ? 0.18 : count * 0.05, 0);
    press.position.y = 0.14 - k * 0.06 - (count > 0 && !on ? 0.02 : 0);
    decalMat.map = on ? starTex : digitTexture(need);
    for (let i = 0; i < need; i++) lamps.setColorAt(i, on ? LAMP_GO : i < count ? LAMP_ON : LAMP_OFF);
    if (lamps.instanceColor) lamps.instanceColor.needsUpdate = true;
  };
  return makeModel('pfeld', root, update, [plateMat, decalMat], { initial: 'idle' });
}

const ML = { deck: 0xe6eaf2, deckDark: 0xc4ccd8, edge: 0xff8a1a, edgeDark: 0xc85a10, stripe: 0x2a2a34, post: 0x5a6070, board: 0x1e2236, frame: 0xffc21a };
function buildMultilift(opts = {}) {
  const need = clamp(Math.round(opts.need ?? 4), 1, 9), sz = sizeOf(opts.size, [3, 3]);
  const root = new THREE.Group();
  const deck = mesh(cached(`w2:ml:${sz}`, () => {
    const b = new Build();
    b.box(sz[0], 0.36, sz[1], { v: (x, y, z, nx, ny) => mix(ML.edgeDark, ML.edge, smoothstep(y / 0.36 + 0.5)) }, { p: [0, 0.18, 0] }, 0.06, 1);
    // Riffelblech-Kacheln oben, Warnstreifen rundum
    const nx = Math.max(2, Math.round(sz[0] / 0.75)), nz = Math.max(2, Math.round(sz[1] / 0.75));
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) b.box((sz[0] - 0.4) / nx - 0.05, 0.05, (sz[1] - 0.4) / nz - 0.05, (i + j) % 2 ? ML.deck : ML.deckDark, { p: [-sz[0] / 2 + 0.2 + (i + 0.5) * (sz[0] - 0.4) / nx, 0.38, -sz[1] / 2 + 0.2 + (j + 0.5) * (sz[1] - 0.4) / nz] }, 0.015, 1);
    for (const s of [1, -1]) for (let i = 0; i < Math.round(sz[0] / 0.3); i++) b.box(0.15, 0.2, 0.02, i % 2 ? ML.stripe : 0xffc21a, { p: [-sz[0] / 2 + (i + 0.5) * 0.3, 0.18, s * (sz[1] / 2 + 0.005)] }, 0, 1);
    // Pfosten und Tafel hinten (−X), Tafel blickt nach +X
    b.cyl(0.08, 0.08, 1.9, ML.post, { p: [-sz[0] / 2 + 0.2, 1.35, 0] }, 10);
    b.box(0.12, 1.05, 1.5, ML.frame, { p: [-sz[0] / 2 + 0.2, 2.45, 0] }, 0.05, 1);
    b.box(0.13, 0.9, 1.35, ML.board, { p: [-sz[0] / 2 + 0.21, 2.45, 0] }, 0.03, 1);
    return b.geometry();
  }), vcol(0.45), {}, true);
  deck.receiveShadow = true;
  const decalMat = new THREE.MeshBasicMaterial({ map: digitTexture(need, '#ffe14a'), transparent: true, depthWrite: false });
  const decal = mesh(cached('w2:ml:decal', () => new THREE.PlaneGeometry(0.7, 0.7).rotateY(Math.PI / 2)), decalMat, { p: [-sz[0] / 2 + 0.28, 2.6, 0] });
  const lamps = instMesh(lampGeo(), basic('w2:lamp', { color: 0xffffff }), need, sz[0] + 2, 2);
  for (let i = 0; i < need; i++) {
    setInst(lamps, i, -sz[0] / 2 + 0.28, 2.15, (i - (need - 1) / 2) * 0.26, 0, 0, -Math.PI / 2, [0.08, 0.06, 0.08]);
    lamps.setColorAt(i, LAMP_OFF);
  }
  root.add(deck, decal, lamps);
  const arrow = arrowTexture();
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'wait';
    clk.tick(dt, anim);
    const count = clamp(Math.round(st.count ?? 0), 0, need);
    const go = anim === 'go';
    decalMat.map = go ? arrow : digitTexture(need, '#ffe14a');
    decal.position.y = 2.6 + (go ? Math.abs(Math.sin(clk.t * 6)) * 0.05 : 0);
    const blinkOn = Math.sin(clk.t * 10) > 0;
    for (let i = 0; i < need; i++) lamps.setColorAt(i, go ? (blinkOn ? LAMP_GO : LAMP_ON) : i < count ? LAMP_ON : LAMP_OFF);
    if (lamps.instanceColor) lamps.instanceColor.needsUpdate = true;
  };
  return makeModel('multilift', root, update, [decalMat], { initial: 'wait' });
}

// =============================================================================================
// Figurenschalter (Porträt der Heldin) und goldener Druckschalter
// =============================================================================================
const HERO_LOOK = {
  lotti: { bg: '#8ab8ff', ring: '#3b7cf0', hair: '#c8963c', hairDark: '#9a6a24', iris: '#3e82f5', bow: '#e83a30', braids: true },
  greta: { bg: '#9ae08a', ring: '#4fb833', hair: '#f3d97a', hairDark: '#d8b44a', iris: '#49a84a', bow: '#f0609f', braids: false },
};
function portraitTexture(hero) {
  const L = HERO_LOOK[hero];
  return canvasTexture(`w2:portrait:${hero}`, 256, 256, (ctx, w, h) => {
    const c = w / 2;
    ctx.fillStyle = L.ring; ctx.beginPath(); ctx.arc(c, c, c, 0, TAU); ctx.fill();
    ctx.fillStyle = L.bg; ctx.beginPath(); ctx.arc(c, c, c * 0.88, 0, TAU); ctx.fill();
    // Haare hinten (Zöpfe bzw. Mähne)
    ctx.fillStyle = L.hair;
    if (L.braids) {
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(c + s * 70, c + 40, 20, 46, s * 0.2, 0, TAU); ctx.fill(); ctx.fillStyle = L.bow; ctx.beginPath(); ctx.arc(c + s * 74, c + 84, 12, 0, TAU); ctx.fill(); ctx.fillStyle = L.hair; }
    } else {
      ctx.beginPath(); ctx.ellipse(c, c + 20, 92, 80, 0, 0, TAU); ctx.fill();
    }
    // Gesicht
    ctx.fillStyle = '#ffdcc0'; ctx.beginPath(); ctx.ellipse(c, c + 14, 62, 60, 0, 0, TAU); ctx.fill();
    // Pony
    ctx.fillStyle = L.hair; ctx.beginPath(); ctx.ellipse(c, c - 34, 70, 40, 0, Math.PI, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(c - 20, c - 22, 34, 20, -0.3, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(c + 24, c - 22, 30, 18, 0.35, 0, TAU); ctx.fill();
    ctx.strokeStyle = L.hairDark; ctx.lineWidth = 3;
    for (const x of [-30, 0, 28]) { ctx.beginPath(); ctx.moveTo(c + x, c - 60); ctx.quadraticCurveTo(c + x + 6, c - 40, c + x - 4, c - 18); ctx.stroke(); }
    // Schleife oben
    ctx.fillStyle = L.bow;
    ctx.beginPath(); ctx.ellipse(c - 52, c - 60, 18, 12, -0.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(c - 28, c - 66, 18, 12, 0.4, 0, TAU); ctx.fill();
    // Augen
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(c + s * 24, c + 12, 15, 19, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = L.iris; ctx.beginPath(); ctx.ellipse(c + s * 24, c + 15, 11, 14, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.ellipse(c + s * 24, c + 16, 6, 8, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(c + s * 24 + 4, c + 9, 4, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,120,140,0.45)'; ctx.beginPath(); ctx.ellipse(c + s * 44, c + 38, 12, 7, 0, 0, TAU); ctx.fill();
    }
    // Lächeln
    ctx.strokeStyle = '#7a2230'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(c, c + 34, 16, 0.25, Math.PI - 0.25); ctx.stroke();
  });
}
const FS2 = { base: 0xf4f8ff, baseDark: 0xc8d0dc, gold: 0xffc21a };
function buildFigurenschalter(opts = {}) {
  const hero = HERO_LOOK[opts.hero] ? opts.hero : 'lotti';
  const root = new THREE.Group();
  root.add(mesh(cached('w2:figsw:base', () => {
    const b = new Build();
    b.cyl(0.62, 0.68, 0.3, { v: (x, y, z, nx, ny) => mix(FS2.baseDark, FS2.base, smoothstep(ny * 0.7 + 0.4)) }, { p: [0, 0.15, 0] }, 32);
    b.torus(0.6, 0.035, FS2.gold, { p: [0, 0.3, 0], r: [Math.PI / 2, 0, 0] }, 6, 32);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; b.sphere(0.04, FS2.gold, { p: [Math.cos(a) * 0.66, 0.15, Math.sin(a) * 0.66] }, 6, 4); }
    return b.geometry();
  }), vcol(0.4), {}, true));
  const btn = joint([0, 0.3, 0]);
  const L = HERO_LOOK[hero];
  const btnMat = std(`w2:figsw:${hero}`, { color: new THREE.Color(L.ring), roughness: 0.3 });
  btn.add(mesh(cached('w2:figsw:btn', () => { const g = new THREE.CylinderGeometry(0.5, 0.52, 0.16, 32); g.translate(0, 0.08, 0); return g; }), btnMat, {}, true));
  const faceMat = std(`w2:figsw:face:${hero}`, { map: portraitTexture(hero), roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2 });
  btn.add(mesh(cached('w2:figsw:face', () => new THREE.CircleGeometry(0.46, 32).rotateX(-Math.PI / 2)), faceMat, { p: [0, 0.162, 0], r: [0, Math.PI / 2, 0] }));
  const glow = glowSprite(0xfff2a0, 1.6, 0.7); glow.position.y = 0.5;
  root.add(btn, glow);
  const clk = new Clock();
  let k = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    k = damp(k, anim === 'pressed' ? 1 : 0, 14, dt);
    btn.position.y = 0.3 - k * 0.11;
    glow.visible = k > 0.05;
    glow.scale.setScalar(1.6 * k * (0.9 + Math.sin(clk.t * 5) * 0.1));
  };
  return makeModel('figurenschalter', root, update, [], { initial: 'idle' });
}
function buildPushSwitchGold() {
  const root = new THREE.Group();
  root.add(mesh(cached('w2:psg:base', () => {
    const b = new Build();
    b.box(1, 0.2, 1, { v: (x, y, z, nx, ny) => mix(0x6a7080, 0xb8c0cc, smoothstep(ny * 0.6 + 0.4)) }, { p: [0, 0.1, 0] }, 0.06, 2);
    return b.geometry();
  }), vcol(0.45), {}, true));
  const knob = joint([0, 0.2, 0]);
  knob.add(mesh(cached('w2:psg:knob', () => {
    const b = new Build();
    b.cyl(0.4, 0.42, 0.12, 0xffffff, { p: [0, 0.06, 0] }, 28);
    b.dome(0.4, 0xffffff, { p: [0, 0.12, 0], s: [1, 0.55, 1] }, Math.PI / 2, 28, 8);
    return b.geometry();
  }), metal('w2:goldVcol', { color: 0xffc21a, vertexColors: true, metalness: 0.7, roughness: 0.25, emissive: 0x2a1a00 }, 1.1), {}, true));
  knob.add(mesh(cached('w2:psg:spark', () => new Build().extrude(sparkShape(0.2, 0.2), 0.04, 0xffffff, { r: [-Math.PI / 2, 0, 0] }, 0.01, 6, 1).geometry()), vcol(0.3), { p: [0, 0.345, 0] }));
  const sp = sparkleSprite(0xffffff, 0.4); sp.position.set(0.25, 0.6, 0.2);
  root.add(knob, sp);
  const clk = new Clock();
  let k = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    k = damp(k, anim === 'pressed' ? 1 : 0, 18, dt);
    knob.scale.set(1 + k * 0.08, Math.max(0.15, 1 - k * 0.75), 1 + k * 0.08);
    const tw = Math.pow(Math.max(0, Math.sin(clk.t * 2.4)), 6) * (1 - k);
    sp.visible = tw > 0.03; sp.scale.setScalar(Math.max(0.001, tw * 0.45));
  };
  return makeModel('push_switch_gold', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Scheinwerfer (Schattenwand), Tür
// =============================================================================================
const SW = { leg: 0x3a3e4a, head: 0x2a2e3a, ring: 0xffc21a, lens: 0xfff6d0 };
function buildScheinwerfer(opts = {}) {
  const H = Number(opts.height ?? 1.8), len = Number(opts.length ?? 6), withCone = opts.cone !== false;
  const root = new THREE.Group();
  root.add(mesh(cached(`w2:sw:stand:${H}`, () => {
    const b = new Build();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU + Math.PI / 3;
      b.cyl(0.03, 0.035, H * 0.62, SW.leg, { p: [Math.cos(a) * 0.22, H * 0.28, Math.sin(a) * 0.22], r: [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4] }, 6);
      b.sphere(0.05, SW.leg, { p: [Math.cos(a) * 0.43, 0.03, Math.sin(a) * 0.43] }, 6, 4);
    }
    b.cyl(0.035, 0.035, H * 0.5, SW.leg, { p: [0, H * 0.72, 0] }, 8);
    b.box(0.08, 0.3, 0.5, SW.ring, { p: [0, H - 0.05, 0] }, 0.02, 1);
    return b.geometry();
  }), vcol(0.45), {}, true));
  const head = joint([0, H, 0]);
  head.add(mesh(cached('w2:sw:head', () => {
    const b = new Build();
    b.cyl(0.24, 0.2, 0.55, { v: (x, y, z, nx, ny) => mix(SW.head, 0x5a6070, smoothstep(ny * 0.6 + 0.3)) }, { p: [0.05, 0, 0], r: [0, 0, -Math.PI / 2] }, 18);
    b.torus(0.235, 0.04, SW.ring, { p: [0.33, 0, 0], r: [0, Math.PI / 2, 0] }, 6, 22);
    for (const s of [1, -1]) b.box(0.4, 0.02, 0.18, SW.head, { p: [0.45, 0, s * 0.2], r: [s * 0.5, 0, 0] }, 0, 1);
    b.cyl(0.06, 0.06, 0.12, SW.ring, { p: [-0.26, 0, 0], r: [0, 0, Math.PI / 2] }, 10);
    return b.geometry();
  }), vcol(0.4), {}, true));
  const lensMat = new THREE.MeshStandardMaterial({ color: SW.lens, roughness: 0.1, emissive: 0x000000 });
  head.add(mesh(cached('w2:sw:lens', () => new THREE.CircleGeometry(0.21, 22).rotateY(Math.PI / 2)), lensMat, { p: [0.335, 0, 0] }));
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xfff8e0, transparent: true, opacity: 0.09, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide });
  const cone = mesh(cached(`w2:sw:cone:${len}`, () => { const g = new THREE.CylinderGeometry(len * 0.28, 0.2, len, 24, 1, true); g.rotateZ(Math.PI / 2); g.translate(len / 2 + 0.35, 0, 0); return g; }), coneMat);
  if (withCone) head.add(cone);
  const glow = glowSprite(0xfff2b0, 1.1, 0.9); glow.position.set(0.42, 0, 0);
  head.add(glow);
  root.add(head);
  const clk = new Clock();
  let k = 0;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const on = st.on ?? true;
    k = damp(k, on ? 1 : 0, 10, dt);
    head.rotation.z = damp(head.rotation.z, clamp(st.aim ?? -0.1, -1.2, 1.2), 8, dt);
    lensMat.emissive.setRGB(k, k * 0.92, k * 0.6);
    cone.visible = withCone && k > 0.03; glow.visible = k > 0.03;
    coneMat.opacity = 0.09 * k * (0.95 + Math.sin(clk.t * 9) * 0.05);
    glow.scale.setScalar(1.1 * k);
  };
  return makeModel('scheinwerfer', root, update, [lensMat, coneMat]);
}

const TU = { wood: 0xa8683a, woodHi: 0xc8884e, woodDark: 0x7a4422, iron: 0x3a3e4a, gold: 0xffc21a, stone: 0xb8b0c8, stoneDark: 0x8a849c };
function buildTuer(opts = {}) {
  const W = Number(opts.width ?? 1.6), H = Number(opts.height ?? 2.4), stone = opts.style === 'stein';
  const root = new THREE.Group();
  root.add(mesh(cached(`w2:tuer:frame:${W}:${H}:${stone}`, () => {
    const b = new Build();
    const fc = stone ? { v: (x, y, z, nx, ny) => mix(TU.stoneDark, TU.stone, smoothstep(ny * 0.5 + 0.6)) } : { v: (x, y, z, nx, ny) => mix(TU.woodDark, TU.wood, smoothstep(ny * 0.5 + 0.5)) };
    for (const s of [1, -1]) b.box(0.4, H + 0.2, 0.3, fc, { p: [0, (H + 0.2) / 2, s * (W / 2 + 0.15)] }, 0.06, 1);
    b.box(0.46, 0.4, W + 0.9, fc, { p: [0, H + 0.2, 0] }, 0.08, 1);
    b.add(puffyStarGeo(0.18, 0.08, 0.05, 0.02), TU.gold, { p: [0.24, H + 0.2, 0], r: [0, Math.PI / 2, 0] });
    b.box(0.05, H, W, 0x120a06, { p: [-0.12, H / 2, 0] }, 0, 1);
    return b.geometry();
  }), vcol(0.6), {}, true));
  const hinge = joint([0.04, 0, -W / 2]);
  hinge.add(mesh(cached(`w2:tuer:wing:${W}:${H}`, () => {
    const b = new Build();
    const planks = (x, y, z) => (Math.floor((z / W) * 5 + 50) % 2 ? TU.wood : TU.woodHi);
    b.box(0.1, H - 0.02, W - 0.04, planks, { p: [0, H / 2, W / 2] }, 0.03, 1);
    for (const y of [0.35, H - 0.35]) b.box(0.13, 0.12, W - 0.02, TU.iron, { p: [0.0, y, W / 2] }, 0.03, 1);
    for (const y of [0.35, H - 0.35]) for (const z of [0.15, W - 0.15]) b.sphere(0.035, TU.gold, { p: [0.07, y, z] }, 6, 4);
    b.add(puffyStarGeo(0.22, 0.1, 0.06, 0.02), TU.gold, { p: [0.08, H * 0.6, W / 2], r: [0, Math.PI / 2, 0] });
    b.torus(0.08, 0.02, TU.gold, { p: [0.09, H * 0.45, W - 0.25], r: [0, Math.PI / 2, 0] }, 6, 14);
    return b.geometry();
  }), vcol(0.6), {}, true));
  root.add(hinge);
  const update = (dt, st) => { hinge.rotation.y = damp(hinge.rotation.y, clamp(st.open ?? 0, 0, 1) * 1.7, 8, dt); };
  return makeModel('tuer', root, update);
}

// =============================================================================================
// Krümel (bunny_small aus props.js mit zusätzlichen Gefühlen)
// =============================================================================================
function buildKruemel() {
  const base = W1PROPS.bunny_small();
  const root = new THREE.Group();
  root.add(base.root);
  const hop = base.root.children[0];
  const ears = hop.children.filter((c) => c.isGroup && c.children.length === 1 && c.children[0].isMesh && c.position.y > 0.4);
  const eye = hop.children.find((c) => c.userData && typeof c.userData.blink === 'function');
  const sweat = mesh(cached('w2:sweat', () => new Build().sphere(1, 0x8ad8ff, { s: [0.025, 0.04, 0.025] }, 8, 6).cone(0.022, 0.04, 0x8ad8ff, { p: [0, 0.035, 0] }, 6).geometry()),
    std('w2:sweat', { color: 0xffffff, vertexColors: true, roughness: 0.1, transparent: true, opacity: 0.85 }), { p: [0.05, 0.6, 0.12] });
  const sp = sparkleSprite(0xfff2a0, 0.4); sp.position.y = 0.75;
  root.add(sweat, sp);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    const scared = anim === 'scared', cheer = anim === 'cheer';
    base.update(dt, { anim: scared || cheer ? 'idle' : anim });
    if (scared) {
      hop.position.set(Math.sin(t * 45) * 0.012, 0, 0);
      hop.scale.set(1.05, 0.88, 1.05);
      hop.rotation.set(0, Math.sin(t * 1.3) * 0.3, 0.08);
      ears.forEach((e, i) => { e.rotation.z = 1.25; e.rotation.x = (i ? -1 : 1) * 0.55; });
      eye?.userData.blink(1.25);
    } else if (cheer) {
      const p = (clk.age % 0.5) / 0.5;
      hop.position.set(0, Math.sin(p * Math.PI) * 0.3, 0);
      hop.scale.set(1, 1 + Math.sin(p * Math.PI) * 0.06, 1);
      hop.rotation.set(0, Math.sin(t * 2) * 0.4, Math.sin(p * Math.PI * 2) * 0.12);
      ears.forEach((e, i) => { e.rotation.z = -0.35 + Math.sin(t * 14 + i) * 0.15; e.rotation.x = (i ? -1 : 1) * 0.1; });
      eye?.userData.blink(0.3);
    }
    sweat.visible = scared;
    if (scared) { const k = (t * 1.5) % 1; sweat.position.set(0.12, 0.62 - k * 0.25, 0.14); sweat.scale.setScalar(1 - k * 0.5); }
    const tw = cheer ? Math.pow(Math.max(0, Math.sin(t * 5)), 4) : 0;
    sp.visible = tw > 0.03; sp.scale.setScalar(Math.max(0.001, tw * 0.5));
  };
  return makeModel('kruemel', root, update, [base], { initial: 'idle' });
}

export const MODELS = {
  taststein: buildTaststein,
  propellerplattform: buildPropellerplattform,
  zahnradplattform: buildZahnrad,
  rollwalze: buildRollwalze,
  drehrad: buildDrehrad,
  wachs_block: buildWachsBlock,
  pfeld: buildPfeld,
  multilift: buildMultilift,
  figurenschalter: buildFigurenschalter,
  push_switch_gold: buildPushSwitchGold,
  scheinwerfer: buildScheinwerfer,
  tuer: buildTuer,
  kruemel: buildKruemel,
};
