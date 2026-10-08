// Gegner-Modelle Welt 1 (Kurs-Modus). Eigene Gestaltung, keine Nachbauten fremder Figuren.
// Maßstab Meter, Ursprung = Fußpunkt, Blick nach +X. Alle Modelle: { root, update(dt, state), dispose() };
// state darf auch ein String sein ('walk' ≙ { anim: 'walk' }). Unbekannte anim → wie 'idle'.
//
// pilzling          ≈0,8 m  Pilzwesen: dicker oranger Hut mit Cremepunkten, Stielkörper mit Gesicht, Stummelfüße.
//   state { anim: 'walk'|'idle'|'alert'|'squashed'|'stunned', speed (m/s, Laufzyklus; walk ohne speed = 1,5) }
//   alert: Hüpfer + rotes „!“ beim Eintritt; squashed: platt (bleibt platt); stunned: Schwindel-Sterne.
// krallen_pilzling  ≈0,85 m Pilzling mit gestreifter Krallen-Mütze (runde Öhrchen), Katzenaugen, Krallen.
//   state { anim: wie pilzling + 'pounce', speed }  pounce: 0–0,22 s ducken, danach gestreckter Sprung
//   (der Motor bewegt root; das Modell zeigt nur die Pose).
// pilzlingsturm     Stapel aus opts.count (3–5, Standard 4) Pilzlingen, je Stufe 0,62 m.
//   opts { count }  state { anim: 'walk'|'idle'|'alert'|'stunned', speed, count (übrige Stufen, von unten;
//   Stufen darüber verschwinden mit kleinem Plopp) }  Wackelt beim Laufen (Welle läuft nach oben).
//   root.userData.height(count) → Höhe des Turms in m.
// krabbelkaefer     ≈0,6 m (mit Fühlern) runder Käfer: farbiger Panzer mit weißen Punkten und Mittelnaht,
//   dunkelblauer Kopf mit großen Augen, Kugelfühler, sechs Beinchen.
//   opts  { color: 'blue'|'red'|'green'|'yellow'|'pink' (Standard 'blue') }
//   state { anim: 'walk'|'idle'|'squashed', speed }
// flatterkaefer     wie krabbelkaefer, mit zwei durchscheinenden Flügeln; fliegt (wippt, Beine hängen).
//   opts  { color (Standard 'pink') }  state { anim: 'fly'|'walk'|'idle'|'squashed', speed }
// brummer           ≈0,85 m lang  dicke Hummel: gelb-braun gestreift, weißer Pelzkragen, großer Stachel.
//   state { anim: 'fly'|'warn'|'dive'|'squashed' }  warn: zittert, Stachel glüht rot; dive: Sturzflug-Haltung
//   (Kopf voran nach unten-vorn), Flügel angelegt.  Ursprung = Unterkante (Beinchen), Körpermitte y ≈ 0,45.

import {
  THREE, TAU, Build, cached, vcol, std, basic, mesh, joint, eyes, dizzyStars, alertMark, makeModel, Clock, Blinker,
  damp, clamp, wave, xf, col, mix, onLathe, onEllipsoid, decals, instMesh, setInst,
} from '../lib/kit.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// =============================================================================================
// Pilzling
// =============================================================================================

const PZ = {
  cap: 0xff7a1f, spot: 0xfff1c4, gill: 0xffd29a, stem: 0xfbe2bd, stemLow: 0xefc492,
  ink: 0x3a2216, foot: 0x6b3a22, tooth: 0xffffff,
  hood: 0xffc21a, stripe: 0x8a4a1c, ear: 0xff9fb8, claw: 0xfff6e8,
};

/** Stielkörper mit Gesicht (Brauen, Mund) – Ursprung Fußpunkt. */
function pilzStemGeo(kind) {
  return cached(`pilz:stem:${kind}`, () => {
    const b = new Build();
    b.lathe([[0, 0.08], [0.17, 0.085], [0.245, 0.14], [0.275, 0.25], [0.268, 0.36], [0.24, 0.45], [0.19, 0.52], [0.1, 0.56], [0, 0.565]],
      { v: (x, y) => (y < 0.2 ? col(PZ.stemLow).clone().lerp(col(PZ.stem), (y - 0.08) / 0.12) : PZ.stem) }, null, 28);
    // grimmige Brauen (innen tief), Mund als Bogen mit einem Zähnchen
    const brow = kind === 'krallen' ? 0.4 : 0.5;
    for (const s of [1, -1]) {
      b.capsule(0.03, 0.1, PZ.ink, { p: [0.248, 0.47, s * 0.085], r: [Math.PI / 2 - s * brow, -0.35 * s, 0], order: 'YXZ' });
    }
    b.torus(0.05, 0.014, PZ.ink, { p: [0.262, 0.265, 0], r: [0, Math.PI / 2, 0] }, 6, 12, Math.PI);
    b.cone(0.018, 0.04, PZ.tooth, { p: [0.272, 0.27, 0.025], r: [0, 0, -0.2] }, 6);
    return b.geometry();
  });
}

const CAP_PTS = [[0, 0.02], [0.2, 0.0], [0.34, 0.03], [0.415, 0.08], [0.435, 0.13], [0.425, 0.19], [0.38, 0.26], [0.3, 0.32], [0.18, 0.365], [0, 0.38]];
/** Dicker Pilzhut (orange mit Cremepunkten als Aufkleber, helle Lamellen unten), Ursprung = Hutunterseite Mitte. */
function pilzCapGeo() {
  return cached('pilz:cap', () => {
    const b = new Build();
    b.lathe(CAP_PTS, (x, y, z, nx, ny) => (ny < -0.4 ? PZ.gill : PZ.cap), null, 32, 2);
    const hits = [[0, Math.PI / 2, 0.085], [0, 0.62, 0.08], [1.25, 0.55, 0.08], [-1.25, 0.55, 0.08], [2.5, 0.6, 0.08], [-2.5, 0.6, 0.08],
      [0.62, 0.08, 0.065], [-0.62, 0.08, 0.065], [1.9, 0.1, 0.065], [-1.9, 0.1, 0.065], [Math.PI, 0.12, 0.065]]
      .map(([az, el, r]) => ({ ...onLathe(CAP_PTS, 0.08, az, el), r }));
    decals(b, hits, 0.08, PZ.spot, 0.22);
    return b.geometry();
  });
}

/** Krallen-Mütze: gelbe Kapuze mit braunen Streifen, runde Öhrchen (innen rosa). */
function krallenHoodGeo() {
  return cached('pilz:hood', () => {
    const b = new Build();
    // Tigerkeile: breit am Scheitel, spitz zum Rand, Stirn frei
    const stripes = (x, y, z, nx, ny) => {
      if (ny < -0.35) return 0xffe6a0;
      const a = Math.abs(Math.atan2(z, x));   // symmetrisch: 0 = Stirn, π = Nacken
      const w = 0.2 * clamp((y - 0.06) / 0.3, 0, 1);
      for (const c of [0.95, 1.65, 2.35, Math.PI]) if (Math.abs(a - c) < w) return PZ.stripe;
      return a < 0.12 && y > 0.25 ? PZ.stripe : PZ.hood;
    };
    b.lathe([[0, 0.02], [0.2, 0.0], [0.33, 0.03], [0.4, 0.08], [0.415, 0.14], [0.4, 0.21], [0.35, 0.28], [0.26, 0.345], [0.13, 0.38], [0, 0.39]], stripes, null, 56);
    for (const s of [1, -1]) {
      b.sphere(0.14, PZ.hood, { p: [-0.03, 0.36, s * 0.22], s: [0.5, 1, 1], r: [0.45 * s, 0, 0] }, 16, 10);
      b.sphere(0.095, PZ.ear, { p: [0.02, 0.365, s * 0.225], s: [0.25, 0.8, 0.8], r: [0.45 * s, 0, 0] }, 14, 8);
    }
    return b.geometry();
  });
}

function pilzFootGeo(kind) {
  return cached(`pilz:foot:${kind}`, () => {
    const b = new Build();
    b.sphere(1, PZ.foot, { s: [0.13, 0.075, 0.1] }, 12, 8);
    if (kind === 'krallen') for (let i = -1; i <= 1; i++) b.cone(0.022, 0.07, PZ.claw, { p: [0.125, 0.0, i * 0.045], r: [0, 0, -Math.PI / 2 + 0.3] }, 6);
    return b.geometry();
  });
}

const PILZ_EYES = (kind) => [
  { p: [0.215, 0.37, 0.085], r: 0.078, sy: 1.35, dir: [1, 0.22, 0.42] },
  { p: [0.215, 0.37, -0.085], r: 0.078, sy: 1.35, dir: [1, 0.22, -0.42] },
].map((e) => (kind === 'krallen' ? { ...e, r: 0.082 } : e));
const PILZ_EYE_OPTS = (kind) => (kind === 'krallen'
  ? { key: 'pilz:krallen', iris: 0xffcf1f, pupil: 0.62, slit: true, depth: 0.5 }
  : { key: 'pilz:plain', iris: 0x6a3a1c, pupil: 0.55, depth: 0.5 });

/** Teile eines Pilzlings (für Einzelmodell und Turm). */
function pilzParts(kind) {
  return {
    stem: pilzStemGeo(kind),
    cap: kind === 'krallen' ? krallenHoodGeo() : pilzCapGeo(),
    foot: pilzFootGeo(kind),
    capY: kind === 'krallen' ? 0.48 : 0.46,
    capTilt: kind === 'krallen' ? 0.24 : 0.17,
    eyeList: PILZ_EYES(kind),
    eyeOpts: PILZ_EYE_OPTS(kind),
  };
}

function buildPilzling(kind, name) {
  return () => {
    const P = pilzParts(kind);
    const bodyMat = vcol(0.45);
    const root = new THREE.Group();
    const pose = joint();             // Stauchen/Strecken (Drehpunkt Fußpunkt), Hüpfen
    const body = joint();             // Wiegen beim Laufen
    const stem = mesh(P.stem, bodyMat, {}, true);
    const cap = mesh(P.cap, vcol(0.32), { p: [-0.02, P.capY, 0], r: [0, 0, P.capTilt] }, true);
    const eye = eyes(P.eyeList, P.eyeOpts);
    body.add(stem, cap, eye);
    const feet = [1, -1].map((s) => joint([0.02, 0.07, s * 0.12], mesh(P.foot, bodyMat, {}, true)));
    const dizzy = dizzyStars(0.3, 0.075); dizzy.position.y = 0.95;
    const alert = alertMark(1.1); alert.position.set(0.05, 0.98, 0);
    pose.add(body, ...feet, dizzy, alert);
    root.add(pose);

    const clk = new Clock(), blink = new Blinker();
    let phase = Math.random() * TAU, sq = 0, lean = 0;
    const update = (dt, st) => {
      const anim = st.anim ?? 'idle';
      clk.tick(dt, anim);
      const t = clk.t, age = clk.age;
      const walking = anim === 'walk' || (anim === 'alert' && (st.speed ?? 0) > 0.2);
      const speed = anim === 'walk' ? (st.speed ?? 1.5) : (st.speed ?? 0);
      if (walking) phase += dt * (5 + Math.abs(speed) * 4.2);
      const sw = walking ? Math.sin(phase) : 0;

      // Stauchung
      const flat = anim === 'squashed';
      sq = damp(sq, flat ? 1 : 0, flat ? 28 : 10, dt);
      const breath = anim === 'idle' ? wave(t, 0.45) * 0.025 : 0;
      let hop = 0;
      if (anim === 'alert') hop = Math.sin(clamp(age / 0.38, 0, 1) * Math.PI) * 0.3;
      let sx = 1 + sq * 0.38 - breath * 0.5, sy = 1 - sq * 0.78 + breath;
      if (anim === 'pounce') {
        const crouch = age < 0.22;
        sx = crouch ? 1.12 : 0.92; sy = crouch ? 0.78 : 1.12;
        hop = crouch ? 0 : 0.18;
      } else if (anim === 'alert' && age < 0.12) { sx = 1.1; sy = 0.86; }
      pose.scale.x = damp(pose.scale.x, sx, 22, dt);
      pose.scale.z = pose.scale.x;
      pose.scale.y = damp(pose.scale.y, sy, 22, dt);
      pose.position.y = damp(pose.position.y, hop + (walking ? Math.abs(sw) * 0.035 : 0), 25, dt);

      // Körperhaltung
      let rx = walking ? sw * 0.07 : 0, rz = walking ? -0.07 : 0, ry = 0;
      if (anim === 'idle') ry = Math.sin(t * 0.6) * 0.35 * clamp(Math.sin(t * 0.21) * 3, -1, 1);
      if (anim === 'stunned') { rx = Math.sin(t * 5.5) * 0.14; rz = Math.cos(t * 5.5) * 0.08; }
      if (anim === 'pounce') rz = age < 0.22 ? 0.12 : -0.55;
      lean = damp(lean, rz, 14, dt);
      body.rotation.set(damp(body.rotation.x, rx, 12, dt), damp(body.rotation.y, ry, 4, dt), lean);

      // Füße: Laufzyklus, im Sprung nach hinten gestreckt
      feet.forEach((f, i) => {
        const ph = phase + i * Math.PI;
        let x = 0.02, y = 0.07, rot = 0;
        if (walking) { x += Math.sin(ph) * 0.085; y += Math.max(0, Math.cos(ph)) * 0.05; rot = -Math.sin(ph) * 0.3; }
        if (flat) { x = 0.0; y = 0.04; }
        if (anim === 'pounce' && age >= 0.22) { x = -0.16; y = 0.12; rot = 0.9; }
        f.position.x = damp(f.position.x, x, 30, dt);
        f.position.y = damp(f.position.y, y, 30, dt);
        f.rotation.z = damp(f.rotation.z, rot, 20, dt);
        f.scale.y = damp(f.scale.y, flat ? 0.6 : 1, 20, dt);
      });

      // Augen: Blinzeln, groß bei Alarm, zugekniffen platt/betäubt
      let k = blink.update(dt, anim !== 'squashed');
      if (flat) k = 0.12; else if (anim === 'stunned') k = 0.45 + Math.sin(t * 9) * 0.1;
      eye.userData.blink(k);
      const es = anim === 'alert' || anim === 'pounce' ? 1.15 : 1;
      eye.scale.x = eye.scale.z = damp(eye.scale.x, es, 18, dt);

      dizzy.visible = anim === 'stunned';
      if (dizzy.visible) { dizzy.rotation.y = t * 4; dizzy.position.y = 0.95 + Math.sin(t * 3) * 0.02; }
      alert.visible = anim === 'alert' && age < 1.2;
      if (alert.visible) alert.scale.setScalar(Math.min(1, age / 0.12) * (1 + Math.max(0, 0.3 - age) * 1.2));
    };
    return makeModel(name, root, update);
  };
}

// =============================================================================================
// Pilzlingsturm: 3–5 Pilzlinge übereinander (je Stufe ein vertexgefärbtes Sammel-Mesh + Glanzpunkte)
// =============================================================================================

const TOWER_STEP = 0.62;

/** Ganzer Pilzling als ein Mesh (Stiel, Hut, Füße, Augenweiß) + Glanzpunkt-Geometrie. */
function pilzSolidGeos(withFeet) {
  const key = `pilz:solid:${withFeet}`;
  return {
    body: cached(`${key}:body`, () => {
      const P = pilzParts('plain');
      const e = eyes(P.eyeList, P.eyeOpts);
      const parts = [P.stem.clone(), P.cap.clone().applyMatrix4(xf({ p: [-0.02, P.capY, 0], r: [0, 0, P.capTilt] })),
        e.userData.eyes.geometry.clone().translate(0, e.position.y, 0)];
      if (withFeet) for (const s of [1, -1]) parts.push(P.foot.clone().translate(0.02, 0.07, s * 0.12));
      const g = mergeGeometries(parts, false);
      for (const p of parts) p.dispose();
      return g;
    }),
    hl: cached('pilz:solid:hl', () => {
      const P = pilzParts('plain');
      const e = eyes(P.eyeList, P.eyeOpts);
      return e.userData.hl.geometry.clone().translate(0, e.position.y, 0);
    }),
  };
}

function buildTower(opts = {}) {
  const n = clamp(Math.round(opts.count ?? 4), 3, 5);
  const solid = pilzSolidGeos(false), footGeo = pilzFootGeo('plain');
  const mat = vcol(0.42);
  const root = new THREE.Group();
  const H = (n - 1) * TOWER_STEP + 0.9;
  // Alle Stufen als Instanzen: Körper (n), Glanzpunkte (n), Füße der untersten Stufe (2) → 3 Zeichenaufrufe
  const bodies = instMesh(solid.body, mat, n, H * 0.75, H / 2);
  const hls = instMesh(solid.hl, basic('white', { color: 0xffffff }), n, H * 0.75, H / 2);
  const feetM = instMesh(footGeo, mat, 2, 0.6, 0.2);
  bodies.castShadow = true; feetM.castShadow = true;
  const dizzy = dizzyStars(0.34, 0.08);
  root.add(bodies, hls, feetM, dizzy);
  root.userData.height = (count = n) => (count - 1) * TOWER_STEP + 0.84;
  // virtuelle Gelenke (nicht in der Szene): Stufe → Innenteil
  const levels = [];
  for (let i = 0; i < n; i++) levels.push({ lv: new THREE.Object3D(), inner: new THREE.Object3D(), pop: 1 });
  const footObj = [new THREE.Object3D(), new THREE.Object3D()];
  const M = new THREE.Matrix4(), W = new THREE.Matrix4(), F = new THREE.Matrix4(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const top = new THREE.Vector3();

  const clk = new Clock();
  let phase = Math.random() * TAU, amp = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    const count = clamp(Math.round(st.count ?? n), 0, n);
    const walking = anim === 'walk';
    const speed = walking ? (st.speed ?? 1.5) : 0;
    if (walking) phase += dt * (5 + speed * 4);
    amp = damp(amp, walking ? 1 : anim === 'stunned' ? 1.6 : 0.25, 4, dt);
    const alert = anim === 'alert' ? Math.sin(clamp(clk.age / 0.4, 0, 1) * Math.PI) : 0;
    M.identity();
    levels.forEach((L, i) => {
      const on = i < count;
      L.pop = damp(L.pop, on ? 1 : 0, on ? 12 : 18, dt);
      // Welle läuft nach oben; jede Stufe kippt etwas gegen die untere
      const ph = phase - i * 0.9;
      const k = amp * (0.35 + i * 0.25);
      L.lv.position.set(0, i === 0 ? 0 : TOWER_STEP, 0);
      L.lv.rotation.set(Math.sin(ph) * 0.07 * k + (anim === 'stunned' ? Math.sin(t * 5 + i) * 0.05 : 0), 0,
        Math.cos(ph * 0.5) * 0.035 * k - (walking ? 0.03 : 0));
      L.lv.updateMatrix();
      M.multiply(L.lv.matrix);
      L.inner.rotation.y = Math.sin(t * 0.8 + i * 1.7) * 0.25 * (anim === 'idle' ? 1 : 0.3);
      L.inner.position.y = i === 0 && walking ? Math.abs(Math.sin(phase)) * 0.03 : alert * 0.12 * (i + 1) / n;
      L.inner.scale.setScalar(Math.max(0.001, L.pop));
      L.inner.updateMatrix();
      W.multiplyMatrices(M, L.inner.matrix);
      const vis = L.pop > 0.02;
      bodies.setMatrixAt(i, vis ? W : zero);
      hls.setMatrixAt(i, vis ? W : zero);
      if (i === 0) footObj.forEach((f, j) => {
        const fp = phase + j * Math.PI;
        f.position.set(0.02 + (walking ? Math.sin(fp) * 0.085 : 0), 0.07 + (walking ? Math.max(0, Math.cos(fp)) * 0.05 : 0), (j ? -1 : 1) * 0.12);
        f.rotation.z = walking ? -Math.sin(fp) * 0.3 : 0;
        f.updateMatrix();
        feetM.setMatrixAt(j, F.multiplyMatrices(W, f.matrix));
      });
      if (i === Math.max(0, count - 1)) top.set(0, 0.95, 0).applyMatrix4(W);
    });
    bodies.instanceMatrix.needsUpdate = true; hls.instanceMatrix.needsUpdate = true; feetM.instanceMatrix.needsUpdate = true;
    dizzy.visible = anim === 'stunned' && count > 0;
    dizzy.position.copy(top);
    dizzy.rotation.y = t * 4;
  };
  return makeModel('pilzlingsturm', root, update);
}


// =============================================================================================
// Krabbelkäfer / Flatterkäfer
// =============================================================================================

const BUG_COLORS = { blue: 0x2f9bff, red: 0xff3a3a, green: 0x3ccf4a, yellow: 0xffcf22, pink: 0xff6fc0 };
const BUG = { body: 0x1f2a4a, spot: 0xffffff, seam: 0x15203a, wing: 0xd8f4ff };
const BUG_SHELL = { c: [-0.03, 0.17, 0], r: [0.3, 0.3, 0.27] };

function bugBodyGeo(color) {
  return cached(`bug:body:${color}`, () => {
    const b = new Build();
    const shell = BUG_COLORS[color] ?? BUG_COLORS.blue;
    b.add(new THREE.SphereGeometry(1, 30, 12, 0, TAU, 0, Math.PI * 0.56), shell, { p: BUG_SHELL.c, s: BUG_SHELL.r });
    b.sphere(1, BUG.body, { p: [0, 0.16, 0], s: [0.28, 0.12, 0.25] }, 18, 10);
    b.torus(1, 0.04, BUG.seam, { p: BUG_SHELL.c, s: [BUG_SHELL.r[0] * 1.005, BUG_SHELL.r[1] * 1.005, 0.3], r: [0, 0, 0.32] }, 6, 24, Math.PI * 0.86);
    const hits = [[2.3, 0.75, 0.075], [-2.3, 0.75, 0.075], [1.55, 0.35, 0.065], [-1.55, 0.35, 0.065], [Math.PI, 0.25, 0.06], [0.9, 0.55, 0.055], [-0.9, 0.55, 0.055]]
      .map(([az, el, r]) => ({ ...onEllipsoid(BUG_SHELL.c, BUG_SHELL.r, az, el), r }));
    decals(b, hits, 0.07, BUG.spot, 0.22);
    b.sphere(0.16, BUG.body, { p: [0.25, 0.22, 0] }, 18, 14);
    return b.geometry();
  });
}
function bugAntennaGeo(color) {
  return cached(`bug:antenna:${color}`, () => {
    const b = new Build();
    for (const s of [1, -1]) {
      b.tube([[0, 0, s * 0.04], [0.04, 0.12, s * 0.08], [0.1, 0.2, s * 0.13]], 0.014, BUG.body, null, 10, 5);
      b.sphere(0.04, BUG_COLORS[color] ?? BUG_COLORS.blue, { p: [0.1, 0.21, s * 0.13] }, 10, 8);
    }
    return b.geometry();
  });
}
const bugLegGeo = () => cached('bug:leg', () => {
  const b = new Build();
  b.capsule(0.028, 0.1, BUG.body, { p: [0, -0.06, 0.03], r: [-0.5, 0, 0] }, 3, 6);
  b.sphere(0.035, BUG.body, { p: [0.02, -0.12, 0.06], s: [1.3, 0.8, 1] }, 8, 6);
  return b.geometry();
});
const bugWingGeo = () => cached('bug:wing', () => {
  const b = new Build();
  b.add(new THREE.CircleGeometry(1, 20), { v: (x, y) => mix(0xffffff, BUG.wing, Math.hypot(x, y)) }, { s: [0.13, 0.26, 1], p: [0, 0.24, 0] });
  return b.geometry();
});
const BUG_HIPS = [];
for (let i = 0; i < 3; i++) for (const s of [1, -1]) BUG_HIPS.push({ x: 0.13 - i * 0.13, s, i });

function buildBug(winged) {
  return (opts = {}) => {
    const color = BUG_COLORS[opts.color] ? opts.color : winged ? 'pink' : 'blue';
    const root = new THREE.Group();
    const pose = joint();
    const body = joint();
    const shellM = mesh(bugBodyGeo(color), vcol(0.3), {}, true);
    const eye = eyes([{ p: [0.355, 0.255, 0.075], r: 0.075, sy: 1.2, dir: [1, 0.15, 0.55] }, { p: [0.355, 0.255, -0.075], r: 0.075, sy: 1.2, dir: [1, 0.15, -0.55] }],
      { key: 'bug', iris: 0x2a1a4a, pupil: 0.55, depth: 0.55 });
    const ant = joint([0.3, 0.33, 0], mesh(bugAntennaGeo(color), vcol(0.4)));
    body.add(shellM, eye, ant);
    const legs = instMesh(bugLegGeo(), vcol(0.5), 6, 0.6, 0.15);
    legs.castShadow = true;
    pose.add(body, legs);
    let wings = null;
    if (winged) {
      const wm = std('bugWing', { color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.7, side: THREE.DoubleSide, roughness: 0.2, depthWrite: false });
      wings = [1, -1].map((s) => joint([-0.06, 0.4, s * 0.1], mesh(bugWingGeo(), wm)));
      body.add(...wings);
    }
    root.add(pose);
    const clk = new Clock(), blink = new Blinker();
    let phase = Math.random() * TAU, sq = 0;
    const update = (dt, st) => {
      const anim = st.anim ?? (winged ? 'fly' : 'idle');
      clk.tick(dt, anim);
      const t = clk.t;
      const flying = winged && anim === 'fly';
      const speed = anim === 'walk' ? (st.speed ?? 1.5) : 0;
      if (anim === 'walk') phase += dt * (8 + speed * 6);
      sq = damp(sq, anim === 'squashed' ? 1 : 0, 25, dt);
      pose.scale.set(1 + sq * 0.3, Math.max(0.05, 1 - sq * 0.75), 1 + sq * 0.3);
      const hover = flying ? 0.12 + Math.sin(t * 4) * 0.05 : 0;
      pose.position.y = damp(pose.position.y, hover + (anim === 'walk' ? Math.abs(Math.sin(phase)) * 0.02 : 0), 10, dt);
      body.rotation.x = anim === 'walk' ? Math.sin(phase) * 0.05 : 0;
      body.rotation.z = flying ? Math.sin(t * 4 + 1) * 0.06 + 0.05 : 0;
      ant.rotation.x = Math.sin(t * 6) * 0.15;
      ant.rotation.z = Math.sin(t * 4.3) * 0.12 + (flying ? 0.3 : 0);
      for (let k = 0; k < 6; k++) {
        const { x, s, i } = BUG_HIPS[k];
        let swing = anim === 'walk' ? Math.sin(phase + (i % 2 ? Math.PI : 0) + (s > 0 ? 0 : Math.PI)) * 0.55 : 0;
        let spread = 0;
        if (flying) { swing = Math.sin(t * 3 + k) * 0.15; spread = -0.5; }
        if (anim === 'squashed') { swing = (1 - i) * 0.8; spread = -1.1; }
        setInst(legs, k, x, 0.13, s * 0.17, (spread + 0.1) * s, s > 0 ? 0 : Math.PI, swing * s);
      }
      legs.instanceMatrix.needsUpdate = true;
      if (wings) wings.forEach((w, i) => {
        const s = i ? -1 : 1;
        const flap = flying ? Math.sin(t * 38) * 0.7 + 0.5 : 0.15;
        w.rotation.set(s * (0.35 + flap), 0, 0.5);
      });
      eye.userData.blink(anim === 'squashed' ? 0.1 : blink.update(dt));
    };
    return makeModel(winged ? 'flatterkaefer' : 'krabbelkaefer', root, update);
  };
}

// =============================================================================================
// Brummer
// =============================================================================================

const BEE = { yellow: 0xffd21f, band: 0x2e2018, head: 0x3a2a20, fluff: 0xfffbea, sting: 0xeeeef6, wing: 0xe6f8ff, cheek: 0xff9a7a };
function beeBodyGeo() {
  return cached('bee:body', () => {
    const b = new Build();
    // Hinterleib: Pole entlang X → Streifen folgen den Breitenkreisen (scharfe Kanten)
    const stripes = (x, y) => ((y > -0.62 && y < -0.32) || (y > 0.0 && y < 0.3) ? BEE.band : BEE.yellow);
    b.add(new THREE.SphereGeometry(1, 22, 22), stripes, { p: [-0.1, 0.45, 0], s: [0.36, 0.3, 0.3], r: [0, 0, -Math.PI / 2] });
    b.torus(0.16, 0.075, BEE.fluff, { p: [0.17, 0.48, 0], r: [0, Math.PI / 2, 0] }, 8, 18);
    b.sphere(0.21, BEE.head, { p: [0.33, 0.5, 0] }, 20, 16);
    for (const s of [1, -1]) {
      decals(b, [{ ...onEllipsoid([0.33, 0.5, 0], [0.21, 0.21, 0.21], s * 0.95, -0.25), r: 0.045 }], 0.045, BEE.cheek, 0.3);
      b.capsule(0.022, 0.08, 0x150c08, { p: [0.47, 0.645, s * 0.085], r: [Math.PI / 2 - s * 0.45, -s * 0.5, 0], order: 'YXZ' }, 3, 6);
      b.tube([[0.4, 0.66, s * 0.06], [0.46, 0.8, s * 0.1], [0.52, 0.86, s * 0.16]], 0.012, BEE.head, null, 8, 5);
      b.sphere(0.035, BEE.yellow, { p: [0.53, 0.865, s * 0.165] }, 8, 6);
      for (const x of [0.12, -0.05]) b.capsule(0.025, 0.1, BEE.head, { p: [x, 0.17, s * 0.1], r: [s * 0.25, 0, 0.3] }, 3, 6);
    }
    return b.geometry();
  });
}
function buildBrummer() {
  const root = new THREE.Group();
  const pose = joint([0, 0.45, 0]);           // Drehpunkt Körpermitte
  const inner = joint([0, -0.45, 0]);
  const bodyM = mesh(beeBodyGeo(), vcol(0.38), {}, true);
  const stingMat = new THREE.MeshStandardMaterial({ color: BEE.sting, roughness: 0.3, emissive: 0x000000 });
  const sting = mesh(cached('bee:sting', () => { const g = new THREE.ConeGeometry(0.065, 0.2, 10); g.rotateZ(Math.PI / 2); return g; }), stingMat, { p: [-0.53, 0.42, 0] }, true);
  const eye = eyes([{ p: [0.47, 0.54, 0.085], r: 0.075, sy: 1.25, dir: [1, 0.05, 0.5] }, { p: [0.47, 0.54, -0.085], r: 0.075, sy: 1.25, dir: [1, 0.05, -0.5] }],
    { key: 'bee', iris: 0x5a2a10, pupil: 0.55, depth: 0.55 });
  const wm = std('beeWing', { color: BEE.wing, transparent: true, opacity: 0.6, side: THREE.DoubleSide, roughness: 0.15, depthWrite: false });
  const wingGeo = cached('bee:wing', () => { const g = new THREE.CircleGeometry(1, 18); g.scale(0.16, 0.3, 1); g.translate(0, 0.28, 0); return g; });
  const wings = [1, -1].map((s) => joint([0.0, 0.72, s * 0.08], mesh(wingGeo, wm)));
  inner.add(bodyM, sting, eye, ...wings);
  pose.add(inner);
  root.add(pose);
  const clk = new Clock(), blink = new Blinker();
  let pitch = 0, sq = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'fly';
    clk.tick(dt, anim);
    const t = clk.t;
    const warn = anim === 'warn', dive = anim === 'dive';
    pitch = damp(pitch, dive ? -0.75 : warn ? 0.3 : Math.sin(t * 2) * 0.06, 10, dt);
    pose.rotation.z = pitch;
    pose.position.y = 0.45 + (anim === 'fly' ? Math.sin(t * 3.2) * 0.06 : 0);
    const shake = warn ? 0.025 : 0;
    pose.position.x = Math.sin(t * 53) * shake; pose.position.z = Math.cos(t * 47) * shake;
    sq = damp(sq, anim === 'squashed' ? 1 : 0, 25, dt);
    pose.scale.set(1 + sq * 0.3, Math.max(0.05, 1 - sq * 0.7), 1 + sq * 0.3);
    wings.forEach((w, i) => {
      const s = i ? -1 : 1;
      const flap = anim === 'squashed' ? 0.2 : dive ? 0.1 : Math.sin(t * 45 + i) * 0.55 + 0.45;
      w.rotation.set(s * (0.25 + flap), 0, dive ? 0.9 : 0.35);
    });
    const heat = warn ? 0.6 + Math.sin(t * 18) * 0.4 : dive ? 0.5 : 0;
    stingMat.emissive.setRGB(heat, heat * 0.1, heat * 0.05);
    stingMat.color.setHex(heat > 0 ? 0xff6a5a : BEE.sting);
    sting.scale.setScalar(1 + heat * 0.25);
    let bk = blink.update(dt);
    if (warn) bk = 0.65; else if (anim === 'squashed') bk = 0.1;
    eye.userData.blink(bk);
  };
  return makeModel('brummer', root, update, [stingMat], { initial: 'fly' });
}


export const MODELS = {
  pilzling: buildPilzling('plain', 'pilzling'),
  krallen_pilzling: buildPilzling('krallen', 'krallen_pilzling'),
  pilzlingsturm: buildTower,
  krabbelkaefer: buildBug(false),
  flatterkaefer: buildBug(true),
  brummer: buildBrummer,
};
