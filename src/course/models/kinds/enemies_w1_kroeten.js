// Kröten-Gegner Welt 1 (Kurs-Modus): aufrechte Kröten mit großen Glubschaugen. Eigene Gestaltung.
// Maßstab Meter, Ursprung = Fußpunkt, Blick nach +X; state darf ein String sein ('walk' ≙ { anim: 'walk' }).
//
// panzerkroete  ≈1,0 m  grüne Kröte, magenta Rückenpanzer mit gelben Sechseck-Platten und violettem Rand.
//   opts  { gold?: true }  (goldener Panzer)
//   state { anim: 'walk'|'idle'|'stunned'|'hide', speed (m/s; walk ohne speed = 1,5) }
//         hide: Kopf, Arme, Beine ziehen sich in den Panzer zurück (Übergang zum Modell 'panzer').
// panzer        ≈0,75 m breit, 0,35 m hoch – der kickbare Panzer allein (Kuppel nach oben).
//   opts  { gold?: true }
//   state { anim: 'idle'|'spin'|'shake', speed (Drehtempo beim Rutschen, Standard 10 m/s) }
//         spin: dreht sich schnell um die Hochachse; shake: zittert (kurz vor dem Herauskommen).
// zauberkroete  ≈1,35 m (mit Hut)  limettengrüne Kröte in karminrotem Umhang mit Goldsaum, hoher
//   geknickter Zauberhut mit Sternen, Holzstab mit türkisem Kristall.
//   state { anim: 'idle'|'appear'|'cast'|'vanish', progress? (0..1, sonst Zeit seit Zustandswechsel) }
//         appear: dreht sich in 0,6 s aus dem Nichts (Funkeln); cast: Stab hoch, Kristall pulsiert,
//         Zauberkugel bei progress ≈ 0,5 bzw. 0,5 s; vanish: dreht sich in 0,5 s weg, danach unsichtbar.
// zauberkugel   Ø 0,5 m  Zaubergeschoss: leuchtende Kugel mit kreisenden Funken.  state { anim: 'idle' }

import {
  THREE, TAU, Build, cached, vcol, basic, mesh, joint, eyes, dizzyStars, makeModel, Clock, Blinker, damp, clamp,
  wave, col, mix, onEllipsoid, decals, gold, glowSprite, sparkleSprite, smoothstep,
} from '../lib/kit.js';

const TD = {
  skin: 0x5ec43c, skinDark: 0x3f9a2a, belly: 0xf6f2b4, mouth: 0x24361a, cheek: 0xff8f9c,
  shell: 0xe8388a, plate: 0xffd23a, rim: 0x6a2a9a, under: 0xffe9a8,
  wizSkin: 0x9be03c, robe: 0xd0263a, robeDark: 0x9a1428, trim: 0xffcf33, hat: 0xc81f3a, wood: 0x9a5a2a, crystal: 0x3ff0e0,
};

// ------------------------------------------------------------------ Körper (geteilt)
const HEAD = { c: [0.05, 0.8, 0], r: [0.26, 0.19, 0.29] };

/** Rumpf + Kopf + Mund + Bäckchen + Augenhügel einer Kröte. */
function toadBodyGeo(key, skin, belly, withTorso = true) {
  return cached(`toad:body:${key}`, () => {
    const b = new Build();
    const bellyFn = { v: (x, y, z, nx, ny) => mix(skin, belly, smoothstep((nx - 0.2) / 0.35) * (ny < 0.55 ? 1 : 0.3)) };
    if (withTorso) b.sphere(1, bellyFn, { p: [0, 0.5, 0], s: [0.27, 0.3, 0.27] }, 22, 16);
    b.sphere(1, { v: (x, y, z, nx, ny) => (ny < -0.35 && nx > -0.2 ? mix(skin, belly, smoothstep((-ny - 0.35) / 0.3)) : col(skin)) },
      { p: HEAD.c, s: HEAD.r }, 24, 16);
    for (const s of [1, -1]) b.sphere(0.105, skin, { p: [0.08, 0.94, s * 0.14] }, 16, 12);
    // breiter Mund: Bogen um die Kopfvorderseite
    b.torus(0.262, 0.013, TD.mouth, { p: [HEAD.c[0], 0.765, 0], r: [Math.PI / 2, 1.2, 0], s: [1, 1.08, 1], order: 'YXZ' }, 6, 30, 2.4);
    const cheeks = [1, -1].map((s) => ({ ...onEllipsoid(HEAD.c, HEAD.r, s * 1.05, 0.08), r: 0.055 }));
    decals(b, cheeks, 0.055, TD.cheek, 0.3);
    return b.geometry();
  });
}
const TOAD_EYES = [
  { p: [0.15, 0.965, 0.14], r: 0.082, sy: 1.12, dir: [1, 0.35, 0.35] },
  { p: [0.15, 0.965, -0.14], r: 0.082, sy: 1.12, dir: [1, 0.35, -0.35] },
];

function armGeo(key, skin, sleeve) {
  return cached(`toad:arm:${key}`, () => {
    const b = new Build();
    if (sleeve) b.cyl(0.075, 0.1, 0.18, sleeve, { p: [0, -0.07, 0] }, 12);
    else b.capsule(0.055, 0.13, skin, { p: [0, -0.075, 0] }, 3, 10);
    b.sphere(0.072, skin, { p: [0.01, -0.19, 0] }, 12, 10);
    return b.geometry();
  });
}
function legGeo(key, skin) {
  return cached(`toad:leg:${key}`, () => {
    const b = new Build();
    b.capsule(0.085, 0.1, skin, { p: [0, -0.07, 0] }, 3, 10);
    b.sphere(1, skin, { p: [0.06, -0.2, 0], s: [0.15, 0.055, 0.11] }, 16, 10);
    for (const z of [-0.06, 0, 0.06]) b.sphere(0.032, skin, { p: [0.2, -0.21, z] }, 8, 6); // Zehen
    return b.geometry();
  });
}

// ------------------------------------------------------------------ Panzer
const SHELL_R = [0.36, 0.27, 0.32];
/** Panzer mit Kuppel nach +Y, Unterkante bei y = 0. */
function shellGeo(goldShell) {
  return cached(`toad:shell:${goldShell}`, () => {
    const b = new Build();
    const base = goldShell ? 0xffcc33 : TD.shell;
    b.dome(1, base, { s: SHELL_R }, Math.PI / 2, 28, 10);
    b.torus(1, 0.16, goldShell ? 0xe8a020 : TD.rim, { r: [Math.PI / 2, 0, 0], s: [SHELL_R[0] * 1.02, SHELL_R[2] * 1.02, 0.32], p: [0, 0.02, 0] }, 8, 32);
    b.cyl(0.32, 0.3, 0.05, goldShell ? 0xffe9a0 : TD.under, { p: [0, 0.0, 0], s: [1.05, 1, 0.94] }, 24);
    const hits = [{ ...onEllipsoid([0, 0, 0], SHELL_R, 0, Math.PI / 2), r: 0.1 }];
    for (let i = 0; i < 6; i++) hits.push({ ...onEllipsoid([0, 0, 0], SHELL_R, (i / 6) * TAU + 0.52, 0.62), r: 0.075 });
    decals(b, hits, 0.08, goldShell ? 0xfff2b0 : TD.plate, 0.22, 'hex');
    return b.geometry();
  });
}
function shellMat(goldShell) { return goldShell ? gold() : vcol(0.3); }

// ------------------------------------------------------------------ Panzerkröte
function buildPanzerkroete(opts = {}) {
  const goldShell = !!opts.gold;
  const bodyMat = vcol(0.42);
  const root = new THREE.Group();
  const pose = joint();
  const body = joint();
  const torso = mesh(toadBodyGeo('green', TD.skin, TD.belly), bodyMat, {}, true);
  const shell = mesh(shellGeo(goldShell), shellMat(goldShell), { p: [-0.12, 0.55, 0], r: [0, 0, Math.PI / 2 - 0.12], s: [1.18, 1.0, 1.15] }, true);
  if (goldShell) shell.material = gold();
  const head = joint([0, 0, 0]);
  const eye = eyes(TOAD_EYES, { key: 'toad', iris: 0x3a2a14, pupil: 0.56, depth: 0.55 });
  head.add(eye);
  body.add(torso, shell, head);
  const arms = [1, -1].map((s) => { const j = joint([0.03, 0.63, s * 0.255], mesh(armGeo('green', TD.skin), bodyMat, {}, true)); j.rotation.x = -s * 0.25; return j; });
  const legs = [1, -1].map((s) => joint([0, 0.255, s * 0.13], mesh(legGeo('green', TD.skin), bodyMat, {}, true)));
  body.add(...arms);
  const dizzy = dizzyStars(0.3, 0.075); dizzy.position.y = 1.15;
  pose.add(body, ...legs, dizzy);
  root.add(pose);

  const clk = new Clock(), blink = new Blinker();
  let phase = Math.random() * TAU, hide = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    const walking = anim === 'walk';
    const speed = walking ? (st.speed ?? 1.5) : 0;
    if (walking) phase += dt * (4.5 + speed * 3.6);
    const sw = walking ? Math.sin(phase) : 0;
    hide = damp(hide, anim === 'hide' ? 1 : 0, 14, dt);
    // Körper: watschelndes Wiegen, Atmen
    body.rotation.x = damp(body.rotation.x, walking ? sw * 0.1 : anim === 'stunned' ? Math.sin(t * 5) * 0.15 : 0, 12, dt);
    body.rotation.z = damp(body.rotation.z, walking ? -0.08 : hide * 0.15, 10, dt);
    const breath = anim === 'idle' ? wave(t, 0.5) * 0.02 : 0;
    pose.position.y = (walking ? Math.abs(sw) * 0.04 : 0) - hide * 0.25;
    body.scale.set(1 - breath * 0.4, 1 + breath, 1 - breath * 0.4);
    // Zurückziehen: Kopf, Arme, Beine schrumpfen in den Panzer, der Panzer kippt flach auf den Boden
    const k = 1 - hide;
    shell.rotation.z = (Math.PI / 2 - 0.12) * k;
    shell.position.set(-0.12 * k, 0.55 * k + 0.25 * hide + 0.02 * hide, 0);
    shell.scale.set(1.18 * k + hide, 1, 1.15 * k + hide);
    torso.scale.setScalar(Math.max(0.001, 0.25 + 0.75 * k));
    torso.position.x = -hide * 0.1;
    head.visible = k > 0.15; head.scale.setScalar(Math.max(0.001, k));
    head.position.set(-hide * 0.2, -hide * 0.4, 0);
    head.rotation.y = damp(head.rotation.y, anim === 'idle' ? Math.sin(t * 0.7) * 0.4 : 0, 4, dt);
    arms.forEach((a, i) => {
      const s = i ? -1 : 1;
      a.rotation.z = walking ? -Math.sin(phase + (i ? 0 : Math.PI)) * 0.5 : anim === 'stunned' ? Math.sin(t * 7 + i) * 0.6 : wave(t, 0.4, i) * 0.06;
      a.rotation.x = -s * (0.25 + (anim === 'stunned' ? 0.6 : 0));
      a.scale.setScalar(Math.max(0.001, k));
    });
    legs.forEach((l, i) => {
      const ph = phase + i * Math.PI;
      l.rotation.z = walking ? Math.sin(ph) * 0.55 : 0;
      l.position.y = 0.255 + (walking ? Math.max(0, -Math.cos(ph)) * 0.05 : 0) + hide * 0.12;
      l.scale.setScalar(Math.max(0.001, 0.2 + 0.8 * k));
    });
    let bk = blink.update(dt);
    if (anim === 'stunned') bk = 0.4;
    eye.userData.blink(bk);
    dizzy.visible = anim === 'stunned';
    dizzy.rotation.y = t * 4;
  };
  return makeModel('panzerkroete', root, update);
}

function buildPanzer(opts = {}) {
  const goldShell = !!opts.gold;
  const root = new THREE.Group();
  const spin = joint();
  const shell = mesh(shellGeo(goldShell), shellMat(goldShell), { p: [0, 0.02, 0] }, true);
  spin.add(shell);
  root.add(spin);
  const clk = new Clock();
  let rate = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    rate = damp(rate, anim === 'spin' ? (st.speed ?? 10) * 2.2 : 0, 10, dt);
    spin.rotation.y += rate * dt;
    const shake = anim === 'shake' ? Math.sin(t * 40) * 0.08 : 0;
    spin.rotation.x = anim === 'spin' ? Math.sin(t * 13) * 0.04 : shake;
    spin.rotation.z = anim === 'spin' ? Math.cos(t * 11) * 0.04 : 0;
    spin.position.y = anim === 'idle' ? 0 : Math.abs(Math.sin(t * 17)) * 0.012;
  };
  return makeModel('panzer', root, update);
}

// ------------------------------------------------------------------ Zauberkröte
function robeGeo() {
  return cached('toad:robe', () => {
    const b = new Build();
    const pts = [[0.0, 0.0], [0.38, 0.0], [0.4, 0.04], [0.34, 0.3], [0.27, 0.52], [0.24, 0.64], [0.0, 0.66]];
    b.lathe(pts, (x, y) => (y < 0.075 ? TD.trim : y > 0.6 ? TD.trim : TD.robe), null, 28, 2);
    // Sterne auf dem Umhang
    const stars = [];
    for (let i = 0; i < 7; i++) {
      const az = (i / 7) * TAU + 0.3, y = 0.18 + (i % 2) * 0.17;
      const r = 0.38 - y * 0.25;
      const p = new THREE.Vector3(Math.cos(az) * r, y, Math.sin(az) * r);
      stars.push({ p, n: new THREE.Vector3(Math.cos(az), 0.25, Math.sin(az)).normalize(), r: 0.05, spin: i });
    }
    decals(b, stars, 0.05, TD.trim, 0.4, 'star');
    // Kragen
    b.torus(0.21, 0.045, TD.trim, { p: [0, 0.65, 0], r: [Math.PI / 2, 0, 0] }, 8, 20);
    return b.geometry();
  });
}
function hatGeo() {
  return cached('toad:hat', () => {
    const b = new Build();
    b.lathe([[0, 0], [0.3, 0.0], [0.31, 0.025], [0.2, 0.05], [0.18, 0.09], [0.0, 0.1]], TD.hat, null, 28);
    b.cyl(0.185, 0.2, 0.08, TD.trim, { p: [0, 0.07, 0] }, 24);
    b.cone(0.18, 0.46, TD.hat, { p: [0, 0.33, 0] }, 24);
    b.cone(0.085, 0.28, TD.hat, { p: [0.11, 0.6, 0], r: [0, 0, -1.1] }, 14);
    b.sphere(0.04, TD.trim, { p: [0.25, 0.66, 0] }, 10, 8);
    const stars = [[0.6, 0.22], [2.4, 0.3], [-1.2, 0.36], [-2.6, 0.2]].map(([az, y]) => {
      const r = 0.18 * (1 - (y - 0.1) / 0.46) + 0.004;
      return { p: new THREE.Vector3(Math.cos(az) * r, y, Math.sin(az) * r), n: new THREE.Vector3(Math.cos(az), 0.36, Math.sin(az)).normalize(), r: 0.045, spin: az };
    });
    decals(b, stars, 0.045, TD.trim, 0.4, 'star');
    return b.geometry();
  });
}
function staffGeo() {
  return cached('toad:staff', () => {
    const b = new Build();
    b.cyl(0.025, 0.03, 1.12, TD.wood, { p: [0, 0.16, 0] }, 8);
    b.sphere(0.035, TD.wood, { p: [0, -0.4, 0] }, 8, 6);
    for (let i = 0; i < 3; i++) b.cone(0.022, 0.14, TD.trim, { p: [Math.cos(i * 2.1) * 0.06, 0.74, Math.sin(i * 2.1) * 0.06], r: [Math.sin(i * 2.1) * 0.5, 0, -Math.cos(i * 2.1) * 0.5] }, 6);
    b.torus(0.04, 0.015, TD.trim, { p: [0, 0.71, 0], r: [Math.PI / 2, 0, 0] }, 6, 12);
    return b.geometry();
  });
}
const sparkRingGeo = () => cached('toad:sparkring', () => {
  const b = new Build();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    b.add(new THREE.OctahedronGeometry(0.05, 0), i % 2 ? 0xfff6a0 : 0x8ff8ff, { p: [Math.cos(a) * 0.5, (i % 3) * 0.25, Math.sin(a) * 0.5], s: [0.6, 1.4, 0.6] });
  }
  return b.geometry();
});

function buildZauberkroete() {
  const bodyMat = vcol(0.42);
  const root = new THREE.Group();
  const pose = joint();
  const body = joint();
  const robe = mesh(robeGeo(), vcol(0.55), {}, true);
  const torso = mesh(toadBodyGeo('wiz', TD.wizSkin, TD.belly, false), bodyMat, {}, true);
  const hat = mesh(hatGeo(), vcol(0.5), { p: [-0.05, 0.93, 0], r: [0, 0, 0.32] }, true);
  const eye = eyes(TOAD_EYES, { key: 'toad:wiz', iris: 0xb02a2a, pupil: 0.5, depth: 0.55 });
  body.add(robe, torso, hat, eye);
  const armL = joint([0.02, 0.6, -0.25], mesh(armGeo('wiz', TD.wizSkin, TD.robe), bodyMat, {}, true));
  const staffArm = joint([0.02, 0.6, 0.25], mesh(armGeo('wiz', TD.wizSkin, TD.robe), bodyMat, {}, true));
  const staff = joint([0.04, -0.2, 0.02], mesh(staffGeo(), vcol(0.5), {}, true));
  const crystalMat = basic('wizCrystal', { color: TD.crystal });
  const crystal = mesh(cached('toad:crystal', () => new THREE.OctahedronGeometry(0.075, 0)), crystalMat, { p: [0, 0.83, 0], s: [1, 1.5, 1] });
  const glow = glowSprite(0x6ff8ff, 0.5, 0.75); glow.position.y = 0.83;
  staff.add(crystal, glow);
  staffArm.add(staff);
  body.add(armL, staffArm);
  const ring = mesh(sparkRingGeo(), vcol(0.3, { emissive: 0x6a6a6a }, 'spark'), { p: [0, 0.2, 0] });
  pose.add(body, ring);
  root.add(pose);

  const clk = new Clock(), blink = new Blinker();
  let vis = 1;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    let p = st.progress;
    let scale = 1, spinY = 0, ringOn = false;
    if (anim === 'appear') {
      p = p ?? clamp(age / 0.6, 0, 1);
      scale = smoothstep(p); spinY = (1 - smoothstep(p)) * TAU * 1.5; ringOn = p < 1;
    } else if (anim === 'vanish') {
      p = p ?? clamp(age / 0.5, 0, 1);
      scale = 1 - smoothstep(p); spinY = smoothstep(p) * TAU * 1.5; ringOn = p < 1;
    }
    vis = scale;
    pose.visible = vis > 0.01;
    pose.scale.set(Math.max(0.001, 0.4 + 0.6 * scale), Math.max(0.001, scale), Math.max(0.001, 0.4 + 0.6 * scale));
    body.rotation.y = spinY;
    pose.position.y = wave(t, 0.6) * 0.02 + (anim === 'appear' ? (1 - scale) * -0.3 : 0);
    // Stab: beim Zaubern hoch über den Kopf, Kristall pulsiert
    const casting = anim === 'cast';
    const cp = casting ? (p ?? (age % 1.2) / 1.2) : 0;
    const raise = casting ? smoothstep(clamp(age / 0.25, 0, 1)) : 0;
    staffArm.rotation.x = damp(staffArm.rotation.x, -0.15 - raise * 0.4, 12, dt);
    staffArm.rotation.z = damp(staffArm.rotation.z, raise * 2.4 + (casting ? Math.sin(cp * TAU) * 0.25 : wave(t, 0.5) * 0.08), 12, dt);
    staff.rotation.z = damp(staff.rotation.z, -raise * 1.9, 12, dt);
    armL.rotation.x = 0.2 + (casting ? 0.6 : 0);
    armL.rotation.z = casting ? 1.0 + Math.sin(t * 9) * 0.15 : wave(t, 0.5, 1) * 0.08;
    body.rotation.z = damp(body.rotation.z, casting ? 0.12 : 0, 8, dt);
    const pulse = casting ? 1 + Math.max(0, Math.sin(cp * TAU)) * 1.2 : 1 + wave(t, 1.2) * 0.12;
    glow.scale.setScalar(0.5 * pulse);
    crystal.rotation.y = t * 2.5;
    crystal.scale.set(pulse * 0.9, pulse * 1.35, pulse * 0.9);
    ring.visible = ringOn || casting;
    ring.rotation.y = t * 5;
    ring.scale.setScalar(casting ? 0.8 + Math.sin(t * 6) * 0.1 : 1.2 - (anim === 'appear' ? scale : 1 - scale) * 0.5);
    ring.position.y = 0.2 + (casting ? 0.7 : (1 - scale) * 0.6);
    hat.rotation.z = 0.32 + (casting ? Math.sin(t * 8) * 0.06 : 0);
    eye.userData.blink(casting ? 0.75 : blink.update(dt));
  };
  return makeModel('zauberkroete', root, update);
}

function buildZauberkugel() {
  const root = new THREE.Group();
  const core = mesh(cached('toad:orb', () => new THREE.IcosahedronGeometry(0.17, 2)), basic('orbCore', { color: 0xc8fff8 }), { p: [0, 0.25, 0] });
  const shellM = mesh(cached('toad:orbShell', () => new THREE.IcosahedronGeometry(0.24, 2)),
    basic('orbShell', { color: 0x40e8ff, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }), { p: [0, 0.25, 0] });
  const glow = glowSprite(0x50e0ff, 0.95, 0.8); glow.position.y = 0.25;
  const ring = mesh(sparkRingGeo(), vcol(0.3, { emissive: 0x6a6a6a }, 'spark'), { p: [0, 0.1, 0], s: 0.6 });
  const sp = sparkleSprite(0xffffff, 0.35); sp.position.set(0.12, 0.38, 0.1);
  root.add(core, shellM, glow, ring, sp);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    const t = clk.t;
    shellM.scale.setScalar(1 + Math.sin(t * 14) * 0.08);
    core.rotation.set(t * 3, t * 2, 0);
    ring.rotation.y = -t * 6; ring.rotation.x = Math.sin(t * 3) * 0.3;
    glow.scale.setScalar(0.95 + Math.sin(t * 11) * 0.1);
    sp.scale.setScalar(0.25 + Math.abs(Math.sin(t * 5)) * 0.2);
  };
  return makeModel('zauberkugel', root, update);
}

export const MODELS = {
  panzerkroete: buildPanzerkroete,
  panzer: buildPanzer,
  zauberkroete: buildZauberkroete,
  zauberkugel: buildZauberkugel,
};
