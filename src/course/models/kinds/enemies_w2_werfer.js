// Gegner-Modelle Welt 2 (Kurs-Modus), Teil 2: Werfer-Brüder und ihre Wurfgeschosse, Projektil-/Suchkopf mit
// Kanonenturm, Feuer-Schnappblume. Eigene Gestaltung. Maßstab Meter, Ursprung = Fußpunkt (Geschosse:
// Unterkante, Mitte bei y = Radius), Blick/Flugrichtung +X; state darf ein String sein.
// progress (0..1) überschreibt bei Einmal-Animationen die Zeit seit dem Zustandswechsel.
//
// feuer_werfer      ≈1,25 m  Werfer-Bruder: rosa Axolotl mit Kiemenbüscheln, Flossenschwanz, Gürtel und Helm.
//   opts  { kind: 'feuer' (roter Helm mit Flammen-Abzeichen, Feuerkugel in der Hand) | 'hammer' (blauer Helm,
//           Holzhammer) | 'bumerang' (grüner Helm, Bumerang) }
//   state { anim: 'idle'|'walk'|'jump'|'throw'|'squashed'|'stunned', speed, progress? }
//         jump: Sprungpose (Knie angezogen, Arme hoch; der Motor bewegt root);
//         throw: 0,6 s – ausholen (0–0,45), Wurf: das Geschoss verlässt die Hand bei progress 0,5 → dann die
//         Geschoss-Entität erzeugen (Position: model.hand()); danach ist die Hand bis zum Zustandswechsel leer.
//   model.hand(out?: Vector3) → Weltposition des Geschosses in der Wurfhand (rechte Hand, +Z).
// feuerkugel        Ø 0,36 m  Feuerkugel der Gegner (Werfer, Feuer-Schnappblume): rote Glut mit gelbem Kern,
//   lodernden Flammenzungen und Schein; Mitte bei y = 0,18.  state { anim: 'idle' }
// wurf_hammer       ≈0,5 m  Holzhammer mit Stahlkopf (dreht sich um −Z); Mitte bei y = 0,25.  state { anim: 'idle'|'spin' }
// wurf_bumerang     ≈0,55 m Bumerang (gelb-orange, rote Streifen), dreht sich flach um Y; Mitte bei y = 0,08.
//                   state { anim: 'idle'|'spin' }
// projektilkopf     ≈1,05 m lang, Ø 0,62 m  Geschosskopf: nachtblauer Rumpf mit Chromnase, Goldring, roten
//   Heckflossen und Düsenflamme; böse Augen und zusammengebissene Zähne. Mitte bei y = 0,36, fliegt nach +X.
//   state { anim: 'fly'|'launch'|'fall' }  launch: große Flamme (0,4 s); fall: nach Draufspringen – kippt mit der
//         Nase nach unten, Flamme aus, Augen zu (der Motor lässt root fallen).
// suchkopf          wie projektilkopf, karminrot mit goldenen Ohrenflossen, Schnurrhaaren und Katzenaugen; folgt der
//   Figur (Motor dreht root).  state wie projektilkopf (+ 'seek': Ohren zucken, Augen schauen umher).
// kanone_turm       ≈2,0 m  Abschussturm für Projektilköpfe: weinroter Sockel mit Goldbändern und Tatzen-Wappen,
//   drehbarer Stahlkopf mit dickem Rohr (zeigt nach +X; mit sides: 2 auch nach −X).
//   opts  { height (2, Gesamthöhe), sides (1|2) }
//   state { anim: 'idle'|'charge'|'fire', aim (rad um Y, Drehung des Kopfes), progress? }
//         charge: Rohr zittert, Mündung glüht; fire: Rückstoß, Mündungsblitz, Rauch (0,6 s).
//   model.muzzle(out?: Vector3, side = 0) → Weltposition der Mündung (side 1 = hinteres Rohr).
// feuer_schnappblume ≈1,3 m (Topf)  Feuerblume: orangeroter Kopf mit gelben Punkten und Flammenkamm, gelbe Lippen,
//   Flammen-Blütenblätter (rot → gelb), dunkler Rußtopf mit glühenden Rissen.
//   opts  { base: 'pot'|'ground'|'pipe' (Standard 'pot') }
//   state { anim: 'idle'|'aim'|'spit'|'retreat'|'hit', aim (Neigung in rad, negativ = nach unten), progress? }
//         spit: 0,8 s – Backen aufblasen, bei progress 0,5 spuckt sie (Feuerkugel im Motor erzeugen, Position:
//         model.mouth()), Rückstoß; retreat: sinkt in den Topf; hit: zuckt, blinkt hell.
//   model.mouth(out?: Vector3) → Weltposition vor dem Maul.

import {
  THREE, TAU, Build, cached, vcol, std, basic, mesh, joint, eyes, dizzyStars, makeModel, Clock, Blinker,
  damp, clamp, col, mix, onEllipsoid, decals, smoothstep, lerp, glowSprite, instMesh, setInst, puffyStarGeo,
} from '../lib/kit.js';

// =============================================================================================
// Geschosse der Werfer
// =============================================================================================
const FK = { core: 0xfff0a0, mid: 0xff8a1a, outer: 0xe02a12 };
function fireballParts(scale = 1) {
  const g = new THREE.Group();
  const core = mesh(cached('w2:fk:core', () => new THREE.IcosahedronGeometry(0.12, 1)), basic('w2:fkCore', { color: FK.core }));
  const mid = mesh(cached('w2:fk:mid', () => new THREE.IcosahedronGeometry(0.16, 1)), basic('w2:fkMid', { color: FK.mid, transparent: true, opacity: 0.85, depthWrite: false }));
  const flames = mesh(cached('w2:fk:flames', () => {
    const b = new Build();
    for (let i = 0; i < 7; i++) {
      const d = new THREE.Vector3(Math.cos(i * 2.4) * 0.8, Math.sin(i * 1.7), Math.sin(i * 2.4) * 0.8).normalize();
      const c = new THREE.ConeGeometry(0.07, 0.17, 6); c.rotateX(Math.PI / 2); c.translate(0, 0, 0.12);
      const m = new THREE.Matrix4().compose(new THREE.Vector3(), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d), new THREE.Vector3(1, 1, 1));
      b.add(c, { v: (x, y, z) => mix(FK.mid, FK.outer, smoothstep(z / 0.2)) }, m);
    }
    return b.geometry();
  }), basic('w2:fkFlames', { color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false }));
  const glow = glowSprite(0xff6a20, 0.95, 0.8);
  g.add(core, mid, flames, glow);
  g.scale.setScalar(scale);
  g.userData.anim = (t) => {
    const fl = 1 + Math.sin(t * 29) * 0.1;
    core.scale.setScalar(fl);
    mid.scale.setScalar(1 + Math.sin(t * 23 + 1) * 0.08);
    flames.rotation.set(t * 4, t * 6.5, t * 3);
    flames.scale.setScalar(0.95 + Math.sin(t * 17) * 0.1);
    glow.scale.setScalar(0.95 * fl);
  };
  return g;
}
function buildFeuerkugel() {
  const root = new THREE.Group();
  const fb = fireballParts(1); fb.position.y = 0.18;
  root.add(fb);
  const clk = new Clock();
  return makeModel('feuerkugel', root, (dt, st) => { clk.tick(dt, st.anim ?? 'idle'); fb.userData.anim(clk.t); });
}

const HAM = { wood: 0xc88a4a, woodDark: 0x8a5426, steel: 0x9aa6bc, steelHi: 0xdfe6f2, band: 0xffc21a };
const hammerGeo = () => cached('w2:hammer', () => {
  const b = new Build();
  b.cyl(0.035, 0.04, 0.42, { v: (x, y) => mix(HAM.woodDark, HAM.wood, smoothstep(y / 0.4 + 0.5)) }, { p: [0, 0.0, 0] }, 10);
  b.sphere(0.045, HAM.woodDark, { p: [0, -0.21, 0] }, 8, 6);
  b.cyl(0.1, 0.1, 0.3, { v: (x, y, z, nx, ny) => mix(HAM.steel, HAM.steelHi, smoothstep(nx)) }, { p: [0, 0.24, 0], r: [Math.PI / 2, 0, 0] }, 16);
  for (const s of [1, -1]) b.cyl(0.11, 0.11, 0.03, HAM.band, { p: [0, 0.24, s * 0.1], r: [Math.PI / 2, 0, 0] }, 16);
  return b.geometry();
});
const BOOM = { a: 0xffc21a, b: 0xff8a1a, stripe: 0xe8322a };
function boomerangV() {
  const b = new Build();
  const up = new THREE.Vector3(0, 1, 0);
  for (const s of [1, -1]) {
    // Arm vom Knick (x = −0,1) schräg nach vorn außen; flache Seite oben
    const d = new THREE.Vector3(0.74, 0, s * 0.67).normalize();
    const w = new THREE.Vector3().crossVectors(d, up);
    const m = new THREE.Matrix4().makeBasis(w, d, up);
    m.setPosition(new THREE.Vector3(-0.1, 0, 0).addScaledVector(d, 0.17));
    m.multiply(new THREE.Matrix4().makeScale(1.5, 1, 0.42));
    b.add(new THREE.CapsuleGeometry(0.055, 0.24, 3, 10), { v: (x, y) => (Math.abs(y) < 0.035 ? col(BOOM.stripe) : mix(BOOM.b, BOOM.a, smoothstep(y / 0.3 + 0.5))) }, m);
  }
  b.sphere(1, BOOM.a, { p: [-0.1, 0, 0], s: [0.085, 0.025, 0.085] }, 10, 6);
  return b.geometry();
}
function buildWurfHammer() {
  const root = new THREE.Group();
  const spin = joint([0, 0.25, 0], mesh(hammerGeo(), vcol(0.35), {}, true));
  root.add(spin);
  const clk = new Clock();
  return makeModel('wurf_hammer', root, (dt, st) => {
    const anim = st.anim ?? 'spin';
    clk.tick(dt, anim);
    spin.rotation.z = anim === 'spin' ? -clk.t * 14 : -0.4;
  }, [], { initial: 'spin' });
}
function buildWurfBumerang() {
  const root = new THREE.Group();
  const spin = joint([0, 0.08, 0], mesh(cached('w2:boomerangV', boomerangV), vcol(0.35), {}, true));
  root.add(spin);
  const clk = new Clock();
  return makeModel('wurf_bumerang', root, (dt, st) => {
    const anim = st.anim ?? 'spin';
    clk.tick(dt, anim);
    spin.rotation.y = anim === 'spin' ? clk.t * 16 : 0;
    spin.rotation.x = anim === 'spin' ? 0.15 : 0;
  }, [], { initial: 'spin' });
}

// =============================================================================================
// Werfer-Brüder (Axolotl)
// =============================================================================================
const AX = { skin: 0xffa8c8, skinDark: 0xf07aa6, belly: 0xfff0f4, gill: 0xff4a8e, gillTip: 0xffc0dc, ink: 0x3a1430, cheek: 0xff6a96, belt: 0x6a3a1c, buckle: 0xffc21a, fin: 0xffd0e2 };
const WERFER = {
  feuer: { helm: 0xe8322a, helmHi: 0xff6a4a, rim: 0xffc21a, emblem: 0xffd21f },
  hammer: { helm: 0x2f62d8, helmHi: 0x5a8aff, rim: 0xe6ecf6, emblem: 0xe6ecf6 },
  bumerang: { helm: 0x24a862, helmHi: 0x4ad88a, rim: 0xfff2c4, emblem: 0xffc21a },
};
function axBodyGeo(kind) {
  return cached(`w2:ax:body:${kind}`, () => {
    const W = WERFER[kind];
    const b = new Build();
    const belly = { v: (x, y, z, nx) => mix(AX.skin, AX.belly, smoothstep((nx - 0.2) / 0.45)) };
    b.sphere(1, belly, { p: [0, 0.44, 0], s: [0.29, 0.32, 0.27] }, 22, 16);
    // Gürtel mit Schnalle (Helmfarbe)
    b.torus(1, 0.05, W.helm, { p: [0, 0.32, 0], r: [Math.PI / 2, 0, 0], s: [0.285, 0.265, 0.6] }, 6, 26);
    b.box(0.04, 0.09, 0.12, AX.buckle, { p: [0.29, 0.32, 0] }, 0.015, 1);
    // Beinchen, breite Füße
    for (const s of [1, -1]) {
      b.capsule(0.08, 0.1, AX.skin, { p: [0.0, 0.15, s * 0.14] }, 3, 10);
      b.sphere(1, AX.skinDark, { p: [0.06, 0.045, s * 0.15], s: [0.14, 0.055, 0.1] }, 12, 8);
      for (const k of [-1, 0, 1]) b.sphere(0.028, AX.skinDark, { p: [0.19, 0.035, s * 0.15 + k * 0.045] }, 6, 4);
    }
    // Flossenschwanz
    b.sphere(1, { v: (x, y, z, nx, ny) => mix(AX.skin, AX.fin, smoothstep(Math.abs(ny) * 1.5 - 0.3)) }, { p: [-0.36, 0.28, 0], s: [0.26, 0.15, 0.05], r: [0, 0, 0.35] }, 16, 10);
    // großer runder Kopf
    b.sphere(1, AX.skin, { p: [0.05, 0.86, 0], s: [0.29, 0.25, 0.3] }, 26, 18);
    b.sphere(1, AX.belly, { p: [0.2, 0.79, 0], s: [0.14, 0.09, 0.2] }, 16, 10);
    b.torus(0.1, 0.018, AX.ink, { p: [0.315, 0.79, 0], r: [0, Math.PI / 2, Math.PI], s: [1, 0.55, 1] }, 6, 14, Math.PI);
    for (const s of [1, -1]) decals(b, [{ ...onEllipsoid([0.05, 0.86, 0], [0.29, 0.25, 0.3], s * 0.75, -0.25), r: 0.05 }], 0.05, AX.cheek, 0.3);
    // Kiemenbüschel: drei Äste je Seite mit Fransen
    for (const s of [1, -1]) {
      for (const [y, a] of [[1.0, 0.75], [0.9, 0.25], [0.8, -0.25]]) {
        const dir = new THREE.Vector3(-0.35, Math.sin(a) * 0.9, s * 0.8).normalize();
        const p0 = new THREE.Vector3(-0.02, y, s * 0.25);
        const pts = [p0, p0.clone().addScaledVector(dir, 0.1), p0.clone().addScaledVector(dir, 0.2).add(new THREE.Vector3(0, 0.02, 0))];
        b.tube(pts.map((p) => p.toArray()), 0.024, AX.gill, null, 8, 6);
        for (let k = 1; k <= 3; k++) {
          const q = p0.clone().addScaledVector(dir, 0.055 * k + 0.03);
          b.sphere(1, k === 3 ? AX.gillTip : AX.gill, { p: q.toArray(), s: [0.03, 0.045, 0.03] }, 8, 6);
        }
      }
    }
    // Helm mit Rand und Abzeichen
    const helm = { v: (x, y, z, nx, ny) => mix(W.helm, W.helmHi, smoothstep(ny * 0.8 + nx * 0.4 - 0.1)) };
    b.dome(1, helm, { p: [0.02, 0.99, 0], s: [0.27, 0.2, 0.28], r: [0, 0, 0.16] }, Math.PI / 2, 26, 9);
    b.torus(1, 0.08, W.rim, { p: [0.02, 0.992, 0], r: [Math.PI / 2, 0, 0.16], order: 'ZYX', s: [0.275, 0.285, 0.3] }, 6, 28);
    b.sphere(0.03, W.rim, { p: [-0.01, 1.19, 0] }, 8, 6);
    if (kind === 'feuer') {
      for (const [dz, h] of [[0, 0.11], [0.04, 0.07], [-0.04, 0.07]]) b.cone(0.03, h, W.emblem, { p: [0.25, 1.1 + h / 2 - 0.02, dz], r: [0, 0, -0.5] }, 6);
    } else if (kind === 'hammer') {
      for (const dz of [-0.1, 0, 0.1]) b.sphere(0.024, W.emblem, { p: [0.245, 1.07, dz] }, 6, 4);
    } else {
      b.extrude(new THREE.Shape([new THREE.Vector2(-0.07, 0), new THREE.Vector2(0, 0.06), new THREE.Vector2(0.07, 0), new THREE.Vector2(0, 0.025)]), 0.02, W.emblem, { p: [0.25, 1.08, 0], r: [0, Math.PI / 2, -0.4], order: 'YXZ' }, 0.005, 2, 1);
    }
    return b.geometry();
  });
}
const axArmGeo = () => cached('w2:ax:arm', () => {
  const b = new Build();
  b.capsule(0.06, 0.18, AX.skin, { p: [0, -0.12, 0] }, 3, 10);
  b.sphere(0.07, AX.skinDark, { p: [0.01, -0.26, 0] }, 10, 8);
  return b.geometry();
});

function buildWerfer(opts = {}) {
  const kind = WERFER[opts.kind] ? opts.kind : 'feuer';
  const root = new THREE.Group();
  const pose = joint();
  const flash = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, emissive: 0x000000 });
  const body = mesh(axBodyGeo(kind), flash, {}, true);
  const eye = eyes([{ p: [0.285, 0.9, 0.12], r: 0.072, sy: 1.25, dir: [1, 0.12, 0.5] }, { p: [0.285, 0.9, -0.12], r: 0.072, sy: 1.25, dir: [1, 0.12, -0.5] }],
    { key: 'w2:ax', iris: 0x4a1a6a, pupil: 0.6, depth: 0.5 });
  const armL = joint([0.04, 0.6, -0.27], mesh(axArmGeo(), flash, {}, true));
  const armR = joint([0.04, 0.6, 0.27], mesh(axArmGeo(), flash, {}, true));
  // Wurfgeschoss in der rechten Hand
  const held = joint([0.02, -0.3, 0.02]);
  if (kind === 'feuer') { const f = fireballParts(0.8); held.add(f); held.userData.fire = f; }
  else if (kind === 'hammer') { const h = mesh(hammerGeo(), vcol(0.35), { p: [0, 0.12, 0], r: [0, 0, -0.3] }, true); held.add(h); }
  else { const bm = mesh(cached('w2:boomerangV', boomerangV), vcol(0.35), { p: [0.05, 0.02, 0], r: [Math.PI / 2, 0, 0.3] }, true); held.add(bm); }
  armR.add(held);
  const dizzy = dizzyStars(0.3, 0.075); dizzy.position.y = 1.3;
  pose.add(body, eye, armL, armR, dizzy);
  root.add(pose);
  const clk = new Clock(), blink = new Blinker();
  let phase = Math.random() * TAU, sq = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    const walking = anim === 'walk';
    if (walking) phase += dt * (6 + (st.speed ?? 1.4) * 4);
    let y = 0, sx = 1, sy = 1, rz = 0, rx = 0;
    let aR = 0.25, xR = 0.2, aL = 0.25, xL = -0.2, heldOn = true;
    if (anim === 'idle') {
      const k = Math.abs(Math.sin(t * 3.2));
      y = k * 0.03; sy = 1 + Math.sin(t * 6.4) * 0.02; sx = 2 - sy;
      aR = 1.2 + Math.sin(t * 3.2) * 0.4; xR = 0.4;           // Geschoss hochwerfen und fangen
    } else if (walking) {
      const s = Math.sin(phase);
      y = Math.abs(s) * 0.05; rx = s * 0.08; rz = -0.06; aR = 0.8; xR = 0.4; aL = -s * 0.5;
    } else if (anim === 'jump') {
      sy = 1.06; sx = 0.96; aR = 2.6; xR = 0.3; aL = 2.4; xL = -0.4; rz = -0.1;
    } else if (anim === 'throw') {
      const p = st.progress ?? clamp(age / 0.6, 0, 1);
      if (p < 0.45) { const k = smoothstep(p / 0.45); aR = lerp(0.6, 3.0, k); xR = lerp(0.3, 0.55, k); rz = 0.12 * k; }
      else if (p < 0.62) { const k = smoothstep((p - 0.45) / 0.17); aR = lerp(3.0, -0.6, k); xR = lerp(0.55, 0.2, k); rz = lerp(0.12, -0.2, k); }
      else { const k = smoothstep((p - 0.62) / 0.38); aR = lerp(-0.6, 0.25, k); rz = lerp(-0.2, 0, k); }
      heldOn = p < 0.5;
      aL = 0.6; xL = -0.4;
    } else if (anim === 'stunned') {
      rz = Math.sin(t * 5) * 0.12; aR = 0.4; aL = 0.4;
    }
    sq = damp(sq, anim === 'squashed' ? 1 : 0, 25, dt);
    pose.position.y = damp(pose.position.y, y, 25, dt);
    pose.scale.set(sx * (1 + sq * 0.4), Math.max(0.05, sy * (1 - sq * 0.75)), sx * (1 + sq * 0.4));
    pose.rotation.z = damp(pose.rotation.z, rz, 16, dt);
    pose.rotation.x = rx;
    const fast = anim === 'throw' ? 40 : 12;
    armR.rotation.z = damp(armR.rotation.z, aR, fast, dt); armR.rotation.x = damp(armR.rotation.x, xR, fast, dt);
    armL.rotation.z = damp(armL.rotation.z, aL, 12, dt); armL.rotation.x = damp(armL.rotation.x, xL, 12, dt);
    held.visible = heldOn && anim !== 'squashed';
    if (held.userData.fire) held.userData.fire.userData.anim(t);
    let bk = blink.update(dt);
    if (anim === 'squashed') bk = 0.1; else if (anim === 'stunned') bk = 0.45; else if (anim === 'throw') bk = 0.75;
    eye.userData.blink(bk);
    dizzy.visible = anim === 'stunned';
    dizzy.rotation.y = t * 4;
  };
  const model = makeModel('feuer_werfer', root, update, [flash], { initial: 'idle' });
  model.hand = (out = new THREE.Vector3()) => { root.updateMatrixWorld(true); return held.getWorldPosition(out); };
  return model;
}

// =============================================================================================
// Projektilkopf / Suchkopf
// =============================================================================================
const PK = {
  plain: { body: 0x232a56, hi: 0x4a5896, nose: 0xdfe5f0, noseDark: 0x9aa4b8, band: 0xffc21a, fin: 0xe8322a, finDark: 0xa81a22, brow: 0x0c0e26, iris: 0xd0261a },
  seek: { body: 0xc21c3a, hi: 0xff5a6a, nose: 0xdfe5f0, noseDark: 0x9aa4b8, band: 0xffc21a, fin: 0xffc21a, finDark: 0xd08a0a, brow: 0x4a0a14, iris: 0xffd21f },
};
const PK_CY = 0.36, PK_PROF = [[0, -0.5], [0.2, -0.5], [0.26, -0.47], [0.3, -0.36], [0.31, -0.1], [0.305, 0.1], [0.285, 0.24], [0.24, 0.35], [0.17, 0.44], [0.08, 0.49], [0, 0.505]];
function pkBodyGeo(key) {
  return cached(`w2:pk:${key}`, () => {
    const P = PK[key];
    const b = new Build();
    // Drehkörper um Y, danach Y → +X (lokales −X wird oben)
    const c = { v: (x, y, z) => {
      if (y > 0.4) return mix(P.noseDark, P.nose, smoothstep(-x / 0.2 * 0.5 + 0.5));
      if (y > -0.4 && y < -0.31) return col(P.band);
      return mix(P.body, P.hi, smoothstep(-x / 0.3 * 0.8));
    } };
    const g = new THREE.LatheGeometry(PK_PROF.map(([r, y]) => new THREE.Vector2(r, y)), 28);
    b.add(g, c, { p: [0, PK_CY, 0], r: [0, 0, -Math.PI / 2] });
    // Düse hinten
    b.cyl(0.17, 0.2, 0.08, 0x2a2a34, { p: [-0.53, PK_CY, 0], r: [0, 0, Math.PI / 2] }, 18);
    b.cyl(0.12, 0.12, 0.02, 0x0c0c12, { p: [-0.575, PK_CY, 0], r: [0, 0, Math.PI / 2] }, 16);
    // Heckflossen: oben und schräg unten
    for (const a of [Math.PI / 2, Math.PI / 2 + 2.2, Math.PI / 2 - 2.2]) {
      b.box(0.24, 0.17, 0.035, { v: (x, y) => mix(P.finDark, P.fin, smoothstep(y / 0.17 + 0.5)) }, { p: [-0.36, PK_CY + Math.sin(a) * 0.36, Math.cos(a) * 0.36], r: [a - Math.PI / 2, 0, 0], order: 'XYZ' }, 0.03, 1);
    }
    // breites Zähne-Grinsen als Bogen um die Längsachse (unten vorn)
    const grin = (R, tube, color, arc, dx, sx = 0.55) => {
      const g = new THREE.TorusGeometry(R, tube, 6, 22, arc);
      g.rotateZ(-Math.PI / 2 - arc / 2); g.scale(1, 1, sx); g.rotateY(Math.PI / 2);
      b.add(g, color, { p: [0.36 + dx, PK_CY, 0] });
    };
    grin(0.215, 0.05, 0x2a0a10, 1.5, -0.01);
    grin(0.228, 0.034, 0xffffff, 1.42, 0.0);
    grin(0.243, 0.006, 0x3a3a4a, 1.3, 0.005, 1);
    // finstere Brauen über den Augen
    for (const s of [1, -1]) {
      const p = [0.25, PK_CY + 0.25, s * 0.165];
      b.capsule(0.03, 0.13, P.brow, { p, r: [Math.PI / 2 - s * 0.55, -s * 0.15, 0.35], order: 'YXZ' }, 3, 6);
    }
    if (key === 'seek') {
      // Ohrenflossen, Schnurrhaare
      for (const s of [1, -1]) {
        const ear = new THREE.ConeGeometry(0.1, 0.22, 4);
        b.add(ear, { v: (x, y) => mix(P.finDark, P.fin, smoothstep(y / 0.2 + 0.5)) }, { p: [0.08, PK_CY + 0.32, s * 0.14], r: [s * 0.35, 0, -0.25], s: [1, 1, 0.35] });
        b.add(new THREE.ConeGeometry(0.06, 0.13, 4), 0xff9ab0, { p: [0.1, PK_CY + 0.3, s * 0.14], r: [s * 0.35, 0, -0.25], s: [1, 1, 0.2] });
        for (const k of [-1, 1]) b.capsule(0.007, 0.17, 0x1a0a10, { p: [0.27, PK_CY - 0.03 + k * 0.035, s * 0.27], r: [Math.PI / 2 + s * k * 0.15, s * 0.5, 0], order: 'YXZ' }, 2, 4);
      }
    }
    return b.geometry();
  });
}
function buildProjektil(key, name) {
  return () => {
    const P = PK[key];
    const root = new THREE.Group();
    const pose = joint([0, PK_CY, 0]);
    const inner = joint([0, -PK_CY, 0]);
    const body = mesh(pkBodyGeo(key), vcol(0.28, {}, 'pk'), {}, true);
    const eye = eyes([{ p: [0.3, PK_CY + 0.175, 0.145], r: 0.095, sy: 1.1, dir: [0.45, 0.7, 0.55] }, { p: [0.3, PK_CY + 0.175, -0.145], r: 0.095, sy: 1.1, dir: [0.45, 0.7, -0.55] }],
      { key: `w2:pk:${key}`, iris: P.iris, pupil: key === 'seek' ? 0.62 : 0.45, slit: key === 'seek', depth: 0.5 });
    const flame = mesh(cached('w2:pk:flame', () => {
      const b = new Build();
      const g = new THREE.ConeGeometry(0.14, 0.42, 12); g.rotateZ(Math.PI / 2);
      b.add(g, { v: (x) => mix(0xfff2a0, 0xff5a1a, smoothstep((-x + 0.05) / 0.25)) }, { p: [-0.79, PK_CY, 0] });
      return b.geometry();
    }), basic('w2:pkFlame', { color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false }));
    const glow = glowSprite(0xff8a30, 0.8, 0.7); glow.position.set(-0.68, PK_CY, 0);
    inner.add(body, eye, flame, glow);
    pose.add(inner);
    root.add(pose);
    const clk = new Clock(), blink = new Blinker();
    let tilt = 0;
    const update = (dt, st) => {
      const anim = st.anim ?? 'fly';
      clk.tick(dt, anim);
      const t = clk.t, age = clk.age;
      const falling = anim === 'fall';
      tilt = damp(tilt, falling ? -1.2 : 0, 5, dt);
      pose.rotation.z = tilt + (falling ? 0 : Math.sin(t * 6) * 0.03);
      pose.rotation.x = falling ? Math.sin(t * 9) * 0.2 : Math.sin(t * 3.7) * 0.05;
      const boost = anim === 'launch' ? 1 + Math.max(0, 1 - age / 0.4) * 1.2 : 1;
      const fl = falling ? 0 : boost * (0.9 + Math.sin(t * 37) * 0.12);
      flame.visible = glow.visible = fl > 0.02;
      flame.scale.set(fl, 0.85 + Math.sin(t * 29) * 0.1, 0.85 + Math.sin(t * 29) * 0.1);
      glow.scale.setScalar(0.8 * fl);
      let bk = blink.update(dt);
      if (falling) bk = 0.1;
      if (anim === 'seek') eye.rotation.y = Math.sin(t * 2.5) * 0.15;
      eye.userData.blink(bk);
    };
    return makeModel(name, root, update, [], { initial: 'fly' });
  };
}

// =============================================================================================
// Kanonenturm
// =============================================================================================
const KT = { base: 0x8a1e2a, baseHi: 0xb02a3a, gold: 0xffc21a, steel: 0x3e475e, steelHi: 0x6a7896, barrel: 0x1e2230, barrelHi: 0x46506a };
function ktBaseGeo(h) {
  return cached(`w2:kt:base:${h}`, () => {
    const b = new Build();
    const bh = h - 0.95;
    b.box(1.15, bh, 1.15, { v: (x, y, z, nx, ny, nz) => mix(KT.base, KT.baseHi, smoothstep(ny * 0.7 + 0.3) * (Math.max(Math.abs(nx), Math.abs(ny), Math.abs(nz)))) }, { p: [0, bh / 2, 0] }, 0.08, 2);
    b.box(1.2, 0.1, 1.2, KT.gold, { p: [0, bh - 0.08, 0] }, 0.03, 1);
    b.box(1.2, 0.1, 1.2, KT.gold, { p: [0, 0.08, 0] }, 0.03, 1);
    // Tatzen-Wappen auf den Seiten (±Z) und vorn/hinten
    for (const [ax, s] of [['z', 1], ['z', -1], ['x', 1], ['x', -1]]) {
      const cy = bh / 2;
      const pts = [[0, -0.06, 0.12, 0.1], [-0.12, 0.06, 0.05, 0.065], [-0.045, 0.13, 0.05, 0.07], [0.045, 0.13, 0.05, 0.07], [0.12, 0.06, 0.05, 0.065]];
      for (const [u, v, ru, rv] of pts) {
        const p = ax === 'z' ? [u, cy + v, s * 0.585] : [s * 0.585, cy + v, u];
        const sc = ax === 'z' ? [ru, rv, 0.03] : [0.03, rv, ru];
        b.sphere(1, KT.gold, { p, s: sc }, 12, 6);
      }
    }
    return b.geometry();
  });
}
function ktHeadGeo(sides) {
  return cached(`w2:kt:head:${sides}`, () => {
    const b = new Build();
    b.cyl(0.5, 0.55, 0.7, { v: (x, y, z, nx, ny) => mix(KT.steel, KT.steelHi, smoothstep(ny * 0.6 + 0.4)) }, { p: [0, 0.35, 0] }, 24);
    b.dome(0.5, KT.steel, { p: [0, 0.7, 0], s: [1, 0.4, 1] }, Math.PI / 2, 24, 6);
    b.torus(0.53, 0.04, KT.gold, { p: [0, 0.08, 0], r: [Math.PI / 2, 0, 0] }, 6, 28);
    b.torus(0.505, 0.035, KT.gold, { p: [0, 0.68, 0], r: [Math.PI / 2, 0, 0] }, 6, 28);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; b.sphere(0.035, KT.gold, { p: [Math.cos(a) * 0.53, 0.38, Math.sin(a) * 0.53] }, 6, 4); }
    b.sphere(0.08, KT.gold, { p: [0, 0.92, 0] }, 10, 8);
    return b.geometry();
  });
}
const ktBarrelGeo = () => cached('w2:kt:barrel', () => {
  const b = new Build();
  b.cyl(0.25, 0.28, 0.72, { v: (x, y, z, nx, ny) => mix(KT.barrel, KT.barrelHi, smoothstep(ny * 0.7 + 0.2)) }, { p: [0.36, 0, 0], r: [0, 0, -Math.PI / 2] }, 22);
  b.torus(0.27, 0.06, KT.gold, { p: [0.7, 0, 0], r: [0, Math.PI / 2, 0] }, 8, 26);
  b.torus(0.27, 0.035, KT.gold, { p: [0.3, 0, 0], r: [0, Math.PI / 2, 0] }, 6, 26);
  b.cyl(0.2, 0.2, 0.02, 0x07070c, { p: [0.725, 0, 0], r: [0, 0, -Math.PI / 2] }, 20);
  return b.geometry();
});
function buildKanoneTurm(opts = {}) {
  const h = Math.max(1.4, Number(opts.height ?? 2));
  const sides = Number(opts.sides ?? 1) === 2 ? 2 : 1;
  const root = new THREE.Group();
  const base = mesh(ktBaseGeo(h), vcol(0.45), {}, true);
  base.receiveShadow = true;
  const head = joint([0, h - 0.95, 0]);
  head.add(mesh(ktHeadGeo(sides), vcol(0.3, {}, 'metalish'), {}, true));
  const glowMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, emissive: 0x000000 });
  const barrels = [];
  const muzzles = [];
  for (let i = 0; i < sides; i++) {
    const g = joint([0, 0.38, 0]);
    g.rotation.y = i ? Math.PI : 0;
    const recoil = joint();
    recoil.add(mesh(ktBarrelGeo(), glowMat, {}, true));
    const mz = new THREE.Object3D(); mz.position.set(0.78, 0, 0);
    recoil.add(mz);
    g.add(recoil);
    head.add(g);
    barrels.push(recoil); muzzles.push(mz);
  }
  const flashSp = glowSprite(0xffd060, 1.6, 0.95);
  const smoke = mesh(cached('w2:kt:smoke', () => {
    const b = new Build();
    for (let i = 0; i < 5; i++) b.sphere(0.16 + i * 0.03, i % 2 ? 0xd8d8e0 : 0xf2f2f6, { p: [i * 0.12, Math.sin(i * 1.7) * 0.08, Math.cos(i * 2.3) * 0.1] }, 10, 8);
    return b.geometry();
  }), basic('w2:smoke', { color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false }));
  muzzles[0].add(flashSp, smoke);
  root.add(base, head);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    head.rotation.y = damp(head.rotation.y, st.aim ?? 0, 8, dt);
    const p = st.progress ?? clamp(age / (anim === 'charge' ? 0.8 : 0.6), 0, 1);
    let rec = 0, heat = 0, fl = 0, sm = 0;
    if (anim === 'charge') { heat = p; head.position.x = Math.sin(t * 60) * 0.015 * p; }
    else head.position.x = 0;
    if (anim === 'fire') { rec = Math.sin(clamp(p / 0.5, 0, 1) * Math.PI) * 0.22; fl = Math.max(0, 1 - p / 0.25); sm = p < 1 ? p : 0; heat = Math.max(0, 0.6 - p); }
    for (const r of barrels) r.position.x = -rec;
    glowMat.emissive.setRGB(heat * 0.9, heat * 0.3, 0);
    flashSp.visible = fl > 0.02; flashSp.scale.setScalar(1.6 * fl + 0.2);
    smoke.visible = sm > 0.02 && sm < 0.99;
    smoke.position.set(0.15 + sm * 0.6, sm * 0.3, 0);
    smoke.scale.setScalar(0.6 + sm * 1.2);
    smoke.material.opacity = 0.85;
  };
  const model = makeModel('kanone_turm', root, update, [glowMat], { initial: 'idle' });
  model.muzzle = (out = new THREE.Vector3(), side = 0) => { root.updateMatrixWorld(true); return muzzles[Math.min(side, muzzles.length - 1)].getWorldPosition(out); };
  return model;
}

// =============================================================================================
// Feuer-Schnappblume
// =============================================================================================
const FS = {
  head: 0xff4a1a, headDark: 0xc81e0c, under: 0xffb04a, spot: 0xffe14a, lip: 0xffd23a, palate: 0x5a0a0a, tongue: 0xff7a3a,
  tooth: 0xffffff, petal: 0xe8200e, petalTip: 0xffd21f, stem: 0x2e8a3a, stemDark: 0x1e6a2a, leaf: 0x3fae3a, vein: 0x2a8a2a,
  pot: 0x3a3436, potRim: 0x5a5054, crack: 0xff6a1a, soil: 0x2a1a14, ash: 0x4a4246,
};
const FHR = [0.3, 0.27, 0.3], FHC = [0.28, 0, 0];
function fsJawGeo(upper) {
  return cached(`w2:fs:jaw:${upper}`, () => {
    const b = new Build();
    const ry = upper ? FHR[1] : FHR[1] * 0.72;
    b.add(new THREE.SphereGeometry(1, 26, 10, 0, TAU, upper ? 0 : Math.PI / 2, Math.PI / 2),
      upper ? { v: (x, y, z, nx, ny) => mix(FS.headDark, FS.head, smoothstep(ny + 0.3)) } : { v: (x, y, z, nx) => mix(FS.under, FS.head, smoothstep(-nx * 0.8 + 0.3)) },
      { p: FHC, s: [FHR[0], ry, FHR[2]] });
    b.add(new THREE.CircleGeometry(1, 24), upper ? FS.palate : FS.tongue, { p: [FHC[0], upper ? -0.002 : 0.002, 0], r: [upper ? Math.PI / 2 : -Math.PI / 2, 0, 0], s: [FHR[0] * 0.97, FHR[2] * 0.97, 1] });
    b.torus(1, 0.11, FS.lip, { p: [FHC[0], 0, 0], r: [Math.PI / 2, 0, 0], s: [FHR[0], FHR[2], 0.3] }, 8, 32);
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = -1.2 + (i / (n - 1)) * 2.4 + (upper ? 0 : 0.2);
      if (!upper && i === n - 1) continue;
      b.cone(0.034, 0.09, FS.tooth, { p: [FHC[0] + Math.cos(a) * FHR[0] * 0.86, upper ? -0.04 : 0.04, Math.sin(a) * FHR[2] * 0.86], r: [0, 0, upper ? Math.PI : 0] }, 6);
    }
    if (upper) {
      const hits = [[0.2, 0.9, 0.06], [0.8, 0.4, 0.06], [-0.8, 0.4, 0.06], [1.8, 0.45, 0.065], [-1.8, 0.45, 0.065], [2.8, 0.5, 0.07], [-2.8, 0.5, 0.07]]
        .map(([az, el, r]) => ({ ...onEllipsoid(FHC, FHR, az, el), r }));
      decals(b, hits, 0.06, FS.spot, 0.25);
      // Flammenkamm oben
      for (const [x, h, z] of [[0.18, 0.2, 0], [0.32, 0.15, 0.0], [0.05, 0.15, 0]]) {
        b.add(new THREE.ConeGeometry(0.06, h, 8), { v: (xx, y) => mix(FS.petal, FS.petalTip, smoothstep(y / h + 0.5)) }, { p: [x, FHR[1] + h * 0.35, z], r: [0, 0, 0.3], s: [1, 1, 0.55] });
      }
      for (const s of [1, -1]) b.capsule(0.024, 0.08, 0x3a0a0a, { p: [0.36, 0.215, s * 0.1], r: [Math.PI / 2 - s * 0.55, -s * 0.5, 0], order: 'YXZ' }, 3, 6);
    } else {
      b.sphere(1, FS.tongue, { p: [FHC[0] - 0.02, 0.01, 0], s: [0.18, 0.04, 0.12] }, 12, 8);
    }
    return b.geometry();
  });
}
const fsPetalsGeo = () => cached('w2:fs:petals', () => {
  const b = new Build();
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + 0.3;
    const g = new THREE.ConeGeometry(0.1, 0.3, 8); g.scale(1, 1, 0.3); g.translate(0, 0.15, 0);
    b.add(g, { v: (x, y) => mix(FS.petal, FS.petalTip, smoothstep((y - 0.05) / 0.25)) }, { p: [0.06, 0, 0], r: [a, 0, 0.4], order: 'XZY' });
  }
  return b.geometry();
});
const fsStemGeo = (len, r0, r1, key) => cached(`w2:fs:stem:${key}`, () => {
  const b = new Build();
  b.cyl(r1, r0, len, { v: (x, y, z, nx) => mix(FS.stemDark, FS.stem, smoothstep(nx + 0.5)) }, { p: [0, len / 2, 0] }, 10);
  b.sphere(r1 * 1.05, FS.stem, { p: [0, len, 0] }, 10, 8);
  return b.geometry();
});
function fsBaseGeo(base) {
  return cached(`w2:fs:base:${base}`, () => {
    const b = new Build();
    let top = 0;
    if (base === 'pot') {
      // Rußtopf mit glühenden Rissen
      const cracks = (x, y, z, nx, ny) => {
        if (y > 0.37 && ny > 0.5) return FS.soil;
        const a = Math.atan2(z, x);
        const zig = Math.abs(((a * 3 + y * 9) % 1.4) - 0.7);
        if (y < 0.27 && y > 0.04 && zig < 0.06 && Math.floor((a + 4) * 1.6) % 2 === 0) return FS.crack;
        return y > 0.29 ? FS.potRim : FS.pot;
      };
      b.lathe([[0, 0], [0.24, 0], [0.27, 0.05], [0.3, 0.29], [0.34, 0.3], [0.355, 0.36], [0.34, 0.41], [0.3, 0.41], [0.29, 0.38], [0, 0.38]], cracks, null, 40, 0);
      top = 0.38;
    } else if (base === 'ground') {
      b.dome(1, FS.ash, { s: [0.42, 0.13, 0.42] }, Math.PI / 2, 20, 6);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.3; b.sphere(0.04, FS.crack, { p: [Math.cos(a) * 0.3, 0.06, Math.sin(a) * 0.3] }, 6, 4); }
      top = 0.1;
    }
    for (const s of [1, -1]) {
      const g = new THREE.SphereGeometry(1, 14, 8);
      g.scale(0.1, 0.025, 0.23); g.translate(0, 0, 0.21);
      b.add(g, { v: (x) => (Math.abs(x) < 0.012 ? FS.vein : FS.leaf) }, { p: [0.02, top + 0.02, s * 0.03], r: [s * -0.35, s > 0 ? 0.3 : Math.PI - 0.3, 0], order: 'YXZ' });
    }
    return b.geometry();
  });
}
const FS_TOP = { pot: 0.38, ground: 0.1, pipe: 0 };
function buildFeuerSchnappblume(opts = {}) {
  const base = ['pot', 'ground', 'pipe'].includes(opts.base) ? opts.base : 'pot';
  const top = FS_TOP[base];
  const root = new THREE.Group();
  const baseM = base === 'pipe' ? null : mesh(fsBaseGeo(base), vcol(0.55), {}, true);
  const plant = joint([0, top, 0]);
  const stem1 = joint([0, 0, 0], mesh(fsStemGeo(0.27, 0.065, 0.058, 's1'), vcol(0.5), {}, true));
  const stem2 = joint([0, 0.26, 0], mesh(fsStemGeo(0.24, 0.058, 0.05, 's2'), vcol(0.5), {}, true));
  const head = joint([-0.2, 0.25, 0]);
  const flash = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, emissive: 0x000000 });
  const upper = joint([0, 0, 0], mesh(fsJawGeo(true), flash, {}, true));
  const lower = joint([0, 0, 0], mesh(fsJawGeo(false), flash, {}, true));
  const eye = eyes([{ p: [0.37, 0.19, 0.1], r: 0.058, sy: 1.1, dir: [0.6, 0.75, 0.35] }, { p: [0.37, 0.19, -0.1], r: 0.058, sy: 1.1, dir: [0.6, 0.75, -0.35] }],
    { key: 'w2:fs', iris: 0xff8a1a, pupil: 0.5, depth: 0.5 });
  upper.add(eye);
  const petals = mesh(fsPetalsGeo(), vcol(0.45), {}, true);
  const mouthPt = new THREE.Object3D(); mouthPt.position.set(0.62, 0, 0);
  const ember = glowSprite(0xff7a20, 0.5, 0.9); ember.position.set(0.3, 0.02, 0);
  head.add(upper, lower, petals, mouthPt, ember);
  stem2.add(head); stem1.add(stem2); plant.add(stem1);
  if (baseM) root.add(baseM);
  root.add(plant);
  const clk = new Clock(), blink = new Blinker();
  let sink = 0, open = 0.2;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    const aim = clamp(st.aim ?? 0, -1, 0.8);
    let b1 = Math.sin(t * 1.3) * 0.08, b2 = Math.sin(t * 1.3 + 0.7) * 0.1, jaw = 0.12 + (Math.sin(t * 2.1) + 1) * 0.05, tilt = -0.12, puff = 1, emb = 0.3 + Math.sin(t * 9) * 0.1;
    if (anim === 'aim' || anim === 'spit') { b1 = 0.1; b2 = 0.12; tilt = aim - 0.1; }
    if (anim === 'spit') {
      const p = st.progress ?? clamp(age / 0.8, 0, 1);
      if (p < 0.45) { const k = smoothstep(p / 0.45); puff = 1 + k * 0.18; jaw = 0.05; b1 = 0.1 - 0.25 * k; b2 = 0.12 - 0.2 * k; emb = 0.4 + k * 0.6; }
      else if (p < 0.6) { const k = smoothstep((p - 0.45) / 0.15); puff = 1.18 - k * 0.2; jaw = 0.05 + k * 0.85; b1 = -0.15 + 0.4 * k; b2 = -0.08 + 0.35 * k; emb = 1.2; }
      else { const k = smoothstep((p - 0.6) / 0.4); puff = 0.98 + k * 0.02; jaw = 0.9 - k * 0.7; b1 = 0.25 - 0.15 * k; b2 = 0.27 - 0.15 * k; emb = 0.4; }
    } else if (anim === 'hit') {
      const k = Math.max(0, 1 - age / 0.5);
      b1 = 0.3 * k + Math.sin(t * 30) * 0.05 * k; b2 = 0.35 * k; jaw = 0.5 * k + 0.1; tilt = 0.3 * k - 0.15;
    }
    stem1.rotation.z = damp(stem1.rotation.z, b1, 20, dt);
    stem2.rotation.z = damp(stem2.rotation.z, b2, 20, dt);
    stem1.rotation.x = Math.sin(t * 0.9) * 0.05;
    head.rotation.z = damp(head.rotation.z, tilt, 16, dt);
    head.scale.set(1, puff, puff);
    open = damp(open, jaw, anim === 'spit' ? 40 : 12, dt);
    upper.rotation.z = open * 0.75;
    lower.rotation.z = -open * 0.4;
    ember.visible = open > 0.08;
    ember.scale.setScalar(0.4 * emb);
    sink = damp(sink, anim === 'retreat' ? 1 : 0, anim === 'retreat' ? 9 : 6, dt);
    plant.position.y = top - sink * 1.15;
    plant.scale.set(1 - sink * 0.5, Math.max(0.001, 1 - sink * 0.6), 1 - sink * 0.5);
    plant.visible = sink < 0.97;
    const hitK = anim === 'hit' ? Math.max(0, 1 - age / 0.4) * (Math.sin(age * 40) > 0 ? 1 : 0.3) : 0;
    flash.emissive.setRGB(hitK * 0.9 + (puff - 1) * 1.5, hitK * 0.9 + (puff - 1) * 0.4, hitK * 0.9);
    eye.userData.blink(anim === 'hit' ? 0.2 : anim === 'spit' ? 0.75 : blink.update(dt));
  };
  const model = makeModel('feuer_schnappblume', root, update, [flash], { initial: 'idle' });
  model.mouth = (out = new THREE.Vector3()) => { root.updateMatrixWorld(true); return mouthPt.getWorldPosition(out); };
  return model;
}

export const MODELS = {
  feuer_werfer: buildWerfer,
  feuerkugel: buildFeuerkugel,
  wurf_hammer: buildWurfHammer,
  wurf_bumerang: buildWurfBumerang,
  projektilkopf: buildProjektil('plain', 'projektilkopf'),
  suchkopf: buildProjektil('seek', 'suchkopf'),
  kanone_turm: buildKanoneTurm,
  feuer_schnappblume: buildFeuerSchnappblume,
};
