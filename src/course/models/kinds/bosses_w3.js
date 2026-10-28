// Bosse Welt 3 (Kurs-Modus): Schattenläuferin (3-Zug) und Schlangenkönig (3-B) mit Zubehör. Eigene Gestaltung.
// Maßstab Meter, Ursprung = Fußpunkt (Ausnahmen genannt), Blick nach +X; state darf ein String sein.
//
// schattenlaeuferin  ≈1,45 m  Ninja-Kätzchen-Dame: lavendelgraues Fell mit Tigerstreifen am Schwanz, indigoblauer
//   Ninja-Anzug mit magenta Schärpe und Rüschensaum, langer roter Schal (zwei Enden), Stirnband mit Silberplakette,
//   große smaragdgrüne Augen mit Wimpern. Nur das Original trägt die pinke Schleife am Ohr (Doppelgänger nicht).
//   opts  { clone: true|false (Standard false → mit Schleife) }
//   state { anim: 'idle'|'run'|'throw'|'teleport'|'clone'|'hit'|'defeated', speed (run), progress? (0..1; sonst Zeit) }
//         throw: 0,8 s – ausholen (0–0,4), Wurf (Bumerang verlässt die Pfote bei 0,5 → Motor erzeugt
//                'schatten_bumerang' an model.hand()), nachschwingen;
//         teleport: dreht sich in 0,35 s in eine Rauchwolke weg und bleibt unsichtbar; jeder andere Zustand danach
//                lässt sie mit Rauch wieder erscheinen (0,25 s);
//         clone: Ninja-Fingerzeichen, Rauchring (Motor stellt die Doppelgänger auf);
//         hit: zurückgeworfen, Augen zu, Aufblitzen (0,6 s); defeated: sitzt benommen, Schwindel-Sterne.
//   model.hand(out?) → Weltposition der rechten Pfote (Bumerang).
// schatten_bumerang  Ø 0,62 m  Wurfstern-Bumerang: vier gebogene Goldklingen, magenta Mittelstein. Mitte im Ursprung,
//   liegt flach (dreht um +Y).  state { anim: 'spin'|'idle', speed (Umdrehungen/s, Standard 3) }
// schlangenkoenig    Schlangenkönig auf drehendem Zirkus-Sockel (Ø 4,8 m, 1,4 m hoch, Loch in der Mitte): smaragdgrüne
//   Königsschlange mit goldenen Ringen, cremefarbenem Bauch, Kobra-Haube mit Augenfleck, Goldkrone mit Juwelen,
//   bernsteinfarbenen Schlitzaugen, gespaltener Zunge. Körper aus opts.segments Kugelsegmenten (je 0,55 m).
//   opts  { segments: 6–16 (Standard 10), color: Standard smaragdgrün | 'rosa' (Welt 8, 8-B: magenta-rosa Königsschlange mit
//           Goldringen, zartrosa Bauch, violettem Augenfleck auf der Haube und grünen Schlitzaugen; additiv) }
//   state { anim: 'idle'|'rise'|'strike'|'summon'|'hit'|'defeated', progress? (0..1; sonst Zeit),
//           headPos?: [x, y, z] (lokale Kopfposition, z. B. auf einer Säulenspitze; überschreibt die Pose),
//           turn?: Drehung des Sockels in rad (Standard: dreht langsam von selbst) }
//         rise: wächst in 0,8 s aus dem Loch; strike: 1,2 s – zurückziehen, zustoßen nach vorn-unten (Maul auf),
//         verharren, zurück; summon: Kopf hoch, Krone glüht (ruft Diener); hit: zuckt zurück, blitzt (0,5 s);
//         defeated: sackt zusammen, Krone fällt auf den Sockel.
//   model.head(out?) → Weltposition der Kopfmitte (Trefferzone).
// dienerschlange     Diener-Schlange ≈2,2 m: orange-rote Schlange mit Cremeringen und Fliege, trägt auf dem Kopf einen
//   waagerechten Porzellanteller (Ø 1,4 m, Goldrand) als Plattform. Ursprung = Bodenloch.
//   opts  { height (Tellerhöhe, Standard 2,2), cracked: true|false (rissiger Teller) }
//   state { anim: 'idle'|'rise'|'sink'|'hit', progress? }  rise/sink: 0,6 s aus dem/in den Boden; hit: zuckt.
//   root.userData.plateHeight → Oberkante des Tellers (in Ruhe).
// felsbrocken        Ø ≈0,9 m  grau-brauner Wurfstein mit Rissen.  Ursprung = Unterkante.
//   state { anim: 'idle'|'fall'|'break' }  fall: dreht sich; break: zerspringt in 8 Brocken (0,9 s), dann weg.

import {
  THREE, TAU, Build, cached, vcol, basic, mesh, joint, eyes, dizzyStars, makeModel, Clock, Blinker, damp, clamp,
  mix, smoothstep, instMesh, setInst, glowSprite, metal,
} from '../lib/kit.js';
import { alongY, onEll, stick, Puffs, circusDrumGeo } from '../lib/kit_w3.js';

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();
const UP = new THREE.Vector3(0, 1, 0);

// =============================================================================================
// Schattenläuferin
// =============================================================================================
const NK = {
  fur: 0xc9bcec, furDark: 0x7f6cbc, cream: 0xfff4ea, pink: 0xff9ec6, nose: 0xff6f9a, ink: 0x1e1430,
  suit: 0x2a2766, suitHi: 0x4a43a0, sash: 0xe8307e, scarf: 0xe8243c, scarfHi: 0xff6a6a, bow: 0xff4fa8, bell: 0xffc21a,
  plate: 0xdfe6f2, sole: 0x8a86b8,
};
const NK_HIP = 0.47, NK_NECK = 0.86;

function nkBodyGeo() {
  return cached('w3:nk:body', () => {
    const b = new Build();
    // Anzug: Oberkörper mit V-Ausschnitt (Fell), Schärpe mit Knoten, Rüschensaum
    const suit = { v: (x, y, z, nx, ny) => (nx > 0.35 && Math.abs(z) < (y - 0.66) * 0.55 + 0.01 ? col3(NK.cream) : mix(NK.suit, NK.suitHi, smoothstep(ny * 0.5 + nx * 0.4 + 0.3))) };
    b.sphere(1, suit, { p: [0, 0.66, 0], s: [0.19, 0.25, 0.19] }, 22, 16);
    b.lathe([[0.12, 0.6], [0.2, 0.52], [0.26, 0.42], [0.27, 0.4], [0.0, 0.4]], { v: (x, y) => (y < 0.425 ? col3(NK.sash) : col3(NK.suit)) }, null, 28);
    b.torus(0.18, 0.04, NK.sash, { p: [0, 0.55, 0], r: [Math.PI / 2, 0, 0] }, 8, 24);
    b.sphere(0.05, NK.sash, { p: [-0.19, 0.55, 0.05] }, 10, 8);
    for (const s of [1, -1]) b.box(0.04, 0.18, 0.07, NK.sash, { p: [-0.22, 0.47, 0.05 + s * 0.03], r: [s * 0.25, 0, -0.25] }, 0.02, 1);
    // Hals
    b.cyl(0.07, 0.08, 0.08, NK.fur, { p: [0, 0.86, 0] }, 12);
    return b.geometry();
  });
}
const col3 = (c) => new THREE.Color(c);

function nkHeadGeo(withBow) {
  return cached(`w3:nk:head:${withBow}`, () => {
    const b = new Build();
    const HC = [0.02, 0.27, 0], HR = [0.28, 0.25, 0.3];
    // Kopf: Fell, helle Schnauzenpartie
    b.sphere(1, { v: (x, y, z, nx, ny) => (nx > 0.55 && ny < 0.15 ? col3(NK.cream) : mix(NK.furDark, NK.fur, smoothstep(ny * 0.5 + 0.7))) }, { p: HC, s: HR }, 28, 22);
    b.sphere(1, NK.cream, { p: [0.22, 0.17, 0], s: [0.1, 0.075, 0.14] }, 16, 12);
    b.sphere(1, NK.nose, { p: [0.315, 0.205, 0], s: [0.025, 0.02, 0.03] }, 10, 8);
    // Mund „ω“
    for (const s of [1, -1]) b.torus(0.022, 0.006, NK.ink, { p: [0.315, 0.17, s * 0.02], r: [0, Math.PI / 2, Math.PI] }, 4, 10, Math.PI);
    // Schnurrhaare
    for (const s of [1, -1]) for (let i = 0; i < 3; i++) b.capsule(0.004, 0.13, NK.cream, { p: [0.26, 0.18 + i * 0.022, s * 0.16], r: [Math.PI / 2 + s * (i - 1) * 0.12, s * 0.15, 0], order: 'YXZ' }, 2, 4);
    // Wangenbüschel
    for (const s of [1, -1]) for (let i = 0; i < 2; i++) b.cone(0.045, 0.1, NK.fur, { p: [0.0 - i * 0.06, 0.13 + i * 0.03, s * 0.29], r: [s * -1.9, 0, 0] }, 6);
    for (const s of [1, -1]) stick(b, onEll(HC, HR, s * 0.62, -0.25), NK.pink, [0.05, 0.035, 0.015], 0.3);
    // Ohren (außen Fell, innen rosa)
    for (const s of [1, -1]) {
      b.cone(0.12, 0.24, NK.fur, { p: [-0.02, 0.53, s * 0.16], r: [s * -0.35, 0, 0.05], s: [0.55, 1, 1] }, 10);
      b.cone(0.075, 0.15, NK.pink, { p: [0.025, 0.52, s * 0.16], r: [s * -0.35, 0, 0.05], s: [0.35, 1, 1] }, 8);
    }
    // Stirnband mit Silberplakette (Stern) und flatternden Bändern hinten
    // (sitzt hoch auf der Stirn über den großen Augen, folgt der Kopfform)
    b.torus(0.21, 0.024, NK.suit, { p: [0.02, 0.44, 0], r: [Math.PI / 2, 0, 0], s: [1, 1.07, 1] }, 6, 36);
    b.box(0.022, 0.06, 0.11, NK.plate, { p: [0.228, 0.445, 0], r: [0, 0, 0.8] }, 0.012, 1);
    b.add(new THREE.ExtrudeGeometry(star4(0.026, 0.01), { depth: 0.01, bevelEnabled: false }), NK.sash, { p: [0.237, 0.454, 0], r: [0, Math.PI / 2, 0.8], order: 'ZYX' });
    for (const s of [1, -1]) b.box(0.02, 0.045, 0.17, NK.suit, { p: [-0.24, 0.4, s * 0.06], r: [s * 0.6, 0, 0.9] }, 0.01, 1);
    // Wimpern
    for (const s of [1, -1]) for (let i = 0; i < 2; i++) b.capsule(0.008, 0.04, NK.ink, { p: [0.2, 0.37 + i * 0.012, s * (0.22 + i * 0.018)], r: [s * (0.9 + i * 0.3), 0, -0.2] }, 2, 4);
    if (withBow) {
      // große pinke Schleife oben am rechten Ohr (+Z), von vorn gut lesbar, goldenes Glöckchen in der Mitte
      const B = [0.06, 0.5, 0.17];
      for (const s of [1, -1]) {
        b.sphere(1, NK.bow, { p: [B[0], B[1] + 0.035 * s + 0.02, B[2] + s * 0.09], s: [0.035, 0.07, 0.1], r: [s * 0.5, 0, 0] }, 14, 10);
        b.box(0.02, 0.09, 0.035, NK.bow, { p: [B[0] + 0.01, B[1] - 0.06, B[2] + s * 0.035], r: [s * 0.35, 0, 0] }, 0.01, 1);
      }
      b.sphere(0.042, NK.bow, { p: B }, 10, 8);
      b.sphere(0.034, NK.bell, { p: [B[0] + 0.035, B[1] - 0.005, B[2]] }, 10, 8);
    }
    return b.geometry();
  });
}
function star4(R, r) {
  const s = new THREE.Shape();
  for (let i = 0; i <= 8; i++) { const a = Math.PI / 2 + (i * Math.PI) / 4, rr = i % 2 ? r : R; if (i === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  return s;
}
function nkArmGeo() {
  return cached('w3:nk:arm', () => {
    const b = new Build();
    b.capsule(0.055, 0.2, NK.suit, { p: [0, -0.13, 0] }, 3, 10);
    b.torus(0.055, 0.02, NK.sash, { p: [0, -0.25, 0], r: [Math.PI / 2, 0, 0] }, 6, 12);
    b.sphere(0.065, NK.fur, { p: [0.01, -0.31, 0] }, 12, 10);
    b.sphere(1, NK.pink, { p: [0.05, -0.33, 0], s: [0.02, 0.025, 0.03] }, 8, 6);
    return b.geometry();
  });
}
function nkLegGeo() {
  return cached('w3:nk:leg', () => {
    const b = new Build();
    b.capsule(0.07, 0.24, NK.suit, { p: [0, -0.2, 0] }, 3, 10);
    b.torus(0.065, 0.018, NK.sash, { p: [0, -0.34, 0], r: [Math.PI / 2, 0, 0] }, 6, 12);
    b.sphere(1, { v: (x, y) => (y < -0.4 ? col3(NK.sole) : col3(NK.suit)) }, { p: [0.04, -0.41, 0], s: [0.12, 0.065, 0.075] }, 14, 10);
    return b.geometry();
  });
}
function nkTailGeo() {
  return cached('w3:nk:tail', () => {
    const b = new Build();
    const pts = [[0, 0, 0], [-0.15, -0.02, 0], [-0.3, 0.06, 0], [-0.38, 0.22, 0], [-0.33, 0.38, 0], [-0.24, 0.44, 0]];
    b.tube(pts, 0.05, (x, y, z) => (Math.sin((Math.atan2(y - 0.1, x + 0.2)) * 6) > 0.4 ? NK.furDark : NK.fur), null, 32, 8);
    b.sphere(0.055, NK.furDark, { p: [-0.24, 0.44, 0] }, 10, 8);
    return b.geometry();
  });
}
function nkScarfGeo() {
  return cached('w3:nk:scarf', () => {
    const b = new Build();
    b.torus(0.11, 0.05, { v: (x, y, z, nx, ny) => mix(NK.scarf, NK.scarfHi, smoothstep(ny)) }, { p: [0, 0, 0], r: [Math.PI / 2, 0, 0], s: [1, 1.05, 1] }, 8, 20);
    // zwei lange Enden nach hinten (leicht gewellt)
    for (const s of [1, -1]) {
      const pts = [];
      for (let i = 0; i <= 6; i++) pts.push([-0.1 - i * 0.12, -0.02 - i * 0.03 + Math.sin(i * 1.3 + s) * 0.03, s * (0.04 + i * 0.03)]);
      b.tube(pts, 0.035, { v: (x) => mix(NK.scarf, NK.scarfHi, smoothstep(-x)) }, null, 24, 6);
      b.box(0.08, 0.09, 0.02, NK.scarf, { p: [pts[6][0] - 0.03, pts[6][1], pts[6][2]], r: [0, s * 0.3, 0] }, 0.01, 1);
    }
    return b.geometry();
  });
}
function boomerangGeo() {
  return cached('w3:boomerang', () => {
    const b = new Build();
    // vier gebogene Klingen (Halbmond-Formen) um einen Mittelstein
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Shape();
      s.moveTo(0.04, 0.0); s.quadraticCurveTo(0.2, 0.06, 0.31, 0.16); s.quadraticCurveTo(0.2, 0.02, 0.06, -0.06); s.lineTo(0.04, 0);
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.025, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 1, curveSegments: 8 });
      g.translate(0, 0, -0.0125);
      g.rotateX(-Math.PI / 2);
      b.add(g, { v: (x, y, z) => mix(0xffb21a, 0xfff2a0, smoothstep(Math.hypot(x, z) / 0.3)) }, { r: [0, (i / 4) * TAU, 0] });
    }
    b.cyl(0.07, 0.07, 0.05, 0xffc21a, {}, 16);
    b.sphere(1, NK.sash, { p: [0, 0.02, 0], s: [0.045, 0.035, 0.045] }, 12, 8);
    return b.geometry();
  });
}

function buildSchattenlaeuferin(opts = {}) {
  const isClone = !!opts.clone;
  const root = new THREE.Group();
  const vis = joint();               // Erscheinen/Verschwinden
  const pose = joint();              // Hüpfen, Sitzen
  const hips = joint([0, NK_HIP, 0]);
  const torso = joint([0, -NK_HIP, 0]);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, emissive: 0x000000 });
  const bodyM = mesh(nkBodyGeo(), mat, {}, true);
  const head = joint([0.0, NK_NECK, 0]);
  const headM = mesh(nkHeadGeo(!isClone), mat, {}, true);
  const eye = eyes([{ p: [0.22, 0.31, 0.12], r: 0.085, sy: 1.35, dir: [1, 0.08, 0.5] }, { p: [0.22, 0.31, -0.12], r: 0.085, sy: 1.35, dir: [1, 0.08, -0.5] }],
    { key: 'w3:nk2', iris: 0x1fae6a, pupil: 0.56, depth: 0.5, sy: 1.3 });
  head.add(headM, eye);
  const scarf = joint([0.0, 0.83, 0], mesh(nkScarfGeo(), mat, {}, true));
  const tail = joint([-0.18, 0.5, 0], mesh(nkTailGeo(), mat, {}, true));
  const arms = [1, -1].map((s) => joint([0.0, 0.8, s * 0.2], mesh(nkArmGeo(), mat, {}, true)));
  const boom = mesh(boomerangGeo(), vcol(0.25, { metalness: 0.3 }, 'w3gold'), { p: [0.03, -0.36, 0], r: [Math.PI / 2, 0, 0], s: 0.7 }, true);
  arms[0].add(boom);
  torso.add(bodyM, head, scarf, tail, ...arms);
  hips.add(torso);
  const legs = instMesh(nkLegGeo(), mat, 2, 1.2, 0.4);
  legs.castShadow = true;
  const dizzy = dizzyStars(0.3, 0.08); dizzy.position.y = 1.55;
  pose.add(hips, legs, dizzy);
  vis.add(pose);
  const smoke = new Puffs(16, 0x8a7ab8, { opacity: 0.85, radius: 3, cy: 0.8 });
  root.add(vis, smoke.mesh);

  const clk = new Clock(), blink = new Blinker();
  let phase = 0, appear = 1, flash = 0, sit = 0;
  const legM = [new THREE.Object3D(), new THREE.Object3D()];
  const setArm = (a, rx, rz, dt, rate = 14) => { a.rotation.x = damp(a.rotation.x, rx, rate, dt); a.rotation.z = damp(a.rotation.z, rz, rate, dt); };
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    // Teleport: verschwinden / wieder erscheinen mit Rauch
    if (clk.entered && anim === 'teleport') smoke.burst([0, 0.75, 0], { count: 12, speed: 1.6, up: 0.5, size: 0.28, life: 0.8, spread: 0.3 });
    if (clk.entered && clk.prev === 'teleport') smoke.burst([0, 0.75, 0], { count: 12, speed: 1.4, up: 0.4, size: 0.26, life: 0.7, spread: 0.3 });
    if (clk.entered && anim === 'clone') smoke.burst([0, 0.5, 0], { count: 16, speed: 2.6, up: 0.2, size: 0.24, life: 0.9, spread: 0.6 });
    smoke.step(dt);
    if (anim === 'teleport') appear = Math.max(0, 1 - age / 0.35);
    else appear = Math.min(1, appear + dt / 0.25);
    vis.visible = appear > 0.01;
    vis.scale.set(Math.max(0.001, appear), Math.max(0.001, appear * (2 - appear)), Math.max(0.001, appear));
    vis.rotation.y = anim === 'teleport' ? age * 25 : (1 - appear) * 6;

    const p = st.progress !== undefined ? clamp(st.progress, 0, 1) : anim === 'throw' ? clamp(age / 0.8, 0, 1) : 0;
    const run = anim === 'run', hit = anim === 'hit' && age < 0.6, dead = anim === 'defeated', cl = anim === 'clone';
    if (run) phase += dt * (9 + (st.speed ?? 4) * 1.2); else phase += dt * 2;
    // Haltung
    let lean = 0, bob = 0, twist = 0;
    if (run) { lean = -0.38; bob = Math.abs(Math.sin(phase)) * 0.06; }
    else if (anim === 'throw') { twist = p < 0.4 ? -0.6 * smoothstep(p / 0.4) : p < 0.55 ? -0.6 + 1.2 * smoothstep((p - 0.4) / 0.15) : 0.6 * (1 - smoothstep((p - 0.55) / 0.45)); lean = -0.12; }
    else if (cl) { lean = -0.05; bob = -0.06; }
    else if (hit) { lean = 0.35; }
    else if (!dead) { bob = Math.sin(t * 2.2) * 0.015 - 0.03; }
    sit = damp(sit, dead ? 1 : 0, 6, dt);
    hips.position.y = NK_HIP + bob - sit * 0.3;
    hips.rotation.z = damp(hips.rotation.z, lean + sit * 0.25, 10, dt);
    hips.rotation.y = damp(hips.rotation.y, twist, 16, dt);
    // Beine (Instanzen)
    legM.forEach((L, i) => {
      const s = i ? -1 : 1;
      let rz = 0, rx = s * 0.12;
      if (run) rz = Math.sin(phase + i * Math.PI) * 0.9;
      else if (anim === 'idle' || cl) { rz = i ? 0.25 : -0.15; rx = s * 0.22; }
      if (dead) { rz = 1.35; rx = s * 0.25; }
      L.position.set(0, hips.position.y, s * 0.11);
      L.rotation.set(damp(L.rotation.x, rx, 12, dt), 0, damp(L.rotation.z, rz, 14, dt));
      L.updateMatrix();
      legs.setMatrixAt(i, L.matrix);
    });
    legs.instanceMatrix.needsUpdate = true;
    // Arme
    const [ra, la] = arms;
    if (run) { setArm(ra, 0.25, 1.9, dt); setArm(la, -0.25, 1.9, dt); }
    else if (anim === 'throw') {
      const rz = p < 0.4 ? 2.4 * smoothstep(p / 0.4) : p < 0.55 ? 2.4 - 3.9 * smoothstep((p - 0.4) / 0.15) : -1.5 + 1.5 * smoothstep((p - 0.55) / 0.45);
      setArm(ra, -0.4, rz, dt, 30); setArm(la, 0.3, -0.6, dt);
    } else if (cl) { setArm(ra, 0.9, -1.2, dt); setArm(la, -0.9, -1.2, dt); }
    else if (hit) { setArm(ra, -0.9, -0.6, dt); setArm(la, 0.9, -0.6, dt); }
    else if (dead) { setArm(ra, -0.5, 0.3, dt); setArm(la, 0.5, 0.3, dt); }
    else { setArm(ra, -0.2, 0.35 + Math.sin(t * 2.2) * 0.05, dt); setArm(la, 0.25, -0.5, dt); }
    boom.visible = !dead && !(anim === 'throw' && p >= 0.5 && p < 0.95);
    boom.rotation.y = anim === 'throw' && p > 0.3 && p < 0.5 ? t * 20 : 0;
    // Kopf, Schal, Schwanz
    head.rotation.z = damp(head.rotation.z, run ? 0.25 : hit ? -0.3 : dead ? -0.15 : 0, 10, dt);
    head.rotation.x = damp(head.rotation.x, dead ? Math.sin(t * 3) * 0.2 : anim === 'idle' ? Math.sin(t * 0.9) * 0.08 : 0, 6, dt);
    head.rotation.y = damp(head.rotation.y, anim === 'idle' ? Math.sin(t * 0.5) * 0.25 : -twist * 0.5, 6, dt);
    const flow = run ? 1 : anim === 'teleport' ? 1.2 : 0.35;
    scarf.rotation.set(Math.sin(t * 9) * 0.12 * flow, Math.sin(t * 7) * 0.1 * flow, (run ? 0.55 : dead ? -0.5 : 0.15) + Math.sin(t * 11) * 0.06 * flow);
    tail.rotation.set(Math.sin(t * 2.6) * 0.3, Math.sin(t * 1.9) * 0.35, run ? -0.5 : dead ? -1.0 : Math.sin(t * 1.5) * 0.12);
    // Blitzen, Augen
    flash = damp(flash, hit ? 1 : 0, 18, dt);
    const fl = hit ? flash * (Math.sin(t * 40) > 0 ? 0.8 : 0.3) : 0;
    mat.emissive.setRGB(fl, fl, fl);
    let k = blink.update(dt);
    if (hit || dead) k = 0.1; else if (cl) k = 0.25;
    eye.userData.blink(k);
    dizzy.visible = dead;
    if (dead) { dizzy.rotation.y = t * 4; dizzy.position.y = 1.55 - sit * 0.3; }
  };
  const hand = (out = new THREE.Vector3()) => { root.updateMatrixWorld(true); return boom.getWorldPosition(out); };
  return makeModel('schattenlaeuferin', root, update, [mat, smoke], { initial: 'idle', hand });
}

function buildBumerang() {
  const root = new THREE.Group();
  const spin = joint();
  spin.add(mesh(boomerangGeo(), vcol(0.25, { metalness: 0.3 }, 'w3gold'), {}, true));
  const glow = glowSprite(0xffd23a, 0.7, 0.35);
  root.add(spin, glow);
  const clk = new Clock();
  let a = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'spin';
    clk.tick(dt, anim);
    if (anim === 'spin') a += dt * (st.speed ?? 3) * TAU;
    spin.rotation.set(Math.sin(clk.t * 3) * 0.15, a, 0.1);
    glow.visible = anim === 'spin';
  };
  return makeModel('schatten_bumerang', root, update, [], { initial: 'spin' });
}

// =============================================================================================
// Schlangenkönig
// =============================================================================================
const SK3 = { green: 0x18a058, greenDark: 0x0e6a3a, greenHi: 0x5ad86a, belly: 0xfff0c0, gold: 0xffc21a, red: 0xe8203a, blue: 0x2a6ae8, ink: 0x0a2a14, mouth: 0x5a0a1a, pink: 0xff7a9a, fang: 0xffffff, tongue: 0xe0204a };
const DRUM_R = 2.4, DRUM_H = 1.4, SEG_L = 0.55;

/** Körpersegment (Einheitsgröße, Achse Y, Bauch nach +X). */
function snakeSegGeo(colors) {
  return cached(`w3:snake:seg:${colors.key}`, () => {
    const b = new Build();
    b.sphere(1, { v: (x, y, z, nx) => (nx > 0.72 ? mix(colors.belly, 0xffffff, 0.15 * Math.abs(Math.sin(y * 9))) : nx < -0.4 && Math.abs(z) < 0.45 ? col3(colors.dark) : mix(colors.dark, colors.main, smoothstep(nx * 0.8 + 0.8))) }, { s: [1, 0.78, 1] }, 22, 14);
    b.torus(0.99, 0.085, colors.band, { r: [Math.PI / 2, 0, 0] }, 6, 28);
    return b.geometry();
  });
}
const KING_COLORS = { key: 'king', main: SK3.green, dark: SK3.greenDark, belly: SK3.belly, band: SK3.gold };
const SERVANT_COLORS = { key: 'servant', main: 0xff6a2a, dark: 0xd8401a, belly: 0xfff4dc, band: 0xfff4dc };
// Welt 8 (8-B): rosa Schlangenkönig (Körper, Kopf, Augen); der Standard bleibt unverändert
const ROSA_COLORS = { key: 'rosa', main: 0xff4aa8, dark: 0xb8146e, belly: 0xfff0f6, band: SK3.gold };
const KING_HEAD = { key: '', dark: SK3.greenDark, hi: SK3.greenHi, main: SK3.green, belly: SK3.belly, spot: SK3.red, ring: SK3.gold, ink: SK3.ink };
const ROSA_HEAD = { key: ':rosa', dark: 0xb8146e, hi: 0xffa8d8, main: 0xff4aa8, belly: 0xfff0f6, spot: 0x7a2ad8, ring: SK3.gold, ink: 0x3a0a2a };

function kingHeadGeo(H = KING_HEAD) {
  return cached(`w3:snake:head${H.key}`, () => {
    const b = new Build();
    const skin = { v: (x, y, z, nx, ny) => (ny < -0.45 ? col3(H.belly) : mix(H.dark, H.hi, smoothstep(ny * 0.6 + 0.45))) };
    b.sphere(1, skin, { p: [0.05, 0.02, 0], s: [0.55, 0.38, 0.5] }, 28, 20);
    b.sphere(1, skin, { p: [0.45, -0.05, 0], s: [0.38, 0.24, 0.36] }, 24, 16);
    // Kobra-Haube hinter dem Kopf mit Augenfleck
    b.sphere(1, { v: (x, y, z, nx) => (nx < -0.5 && Math.hypot(y, z) < 0.35 ? (Math.hypot(y, z) < 0.18 ? col3(H.spot) : col3(H.ring)) : mix(H.dark, H.main, smoothstep(Math.abs(z) * 1.2))) }, { p: [-0.32, -0.25, 0], s: [0.14, 0.62, 0.78] }, 24, 16);
    // Nasenlöcher, Brauenwülste, Mundlinie, Fangzähne
    for (const s of [1, -1]) {
      b.sphere(1, H.ink, { p: [0.8, 0.06, s * 0.08], s: [0.02, 0.02, 0.025] }, 8, 6);
      b.capsule(0.05, 0.22, H.dark, { p: [0.28, 0.33, s * 0.2], r: [Math.PI / 2 - s * 0.3, -s * 0.35, 0], order: 'YXZ' }, 3, 8);
      b.tube([[0.8, -0.13, s * 0.06], [0.6, -0.15, s * 0.26], [0.3, -0.12, s * 0.38]], 0.018, H.ink, null, 12, 5);
      b.cone(0.04, 0.14, SK3.fang, { p: [0.68, -0.22, s * 0.13], r: [Math.PI, 0, 0] }, 8);
    }
    return b.geometry();
  });
}
const kingJawGeo = () => cached('w3:snake:jaw', () => {
  const b = new Build();
  b.sphere(1, { v: (x, y, z, nx, ny) => (ny > 0.4 ? col3(SK3.mouth) : col3(SK3.belly)) }, { p: [0.35, 0, 0], s: [0.45, 0.1, 0.36] }, 22, 12);
  b.sphere(1, SK3.pink, { p: [0.3, 0.06, 0], s: [0.3, 0.04, 0.22] }, 14, 8);
  return b.geometry();
});
function crownGeo() {
  return cached('w3:snake:crown', () => {
    const b = new Build();
    b.cyl(0.3, 0.27, 0.16, SK3.gold, { p: [0, 0.08, 0] }, 28, true);
    b.cyl(0.29, 0.29, 0.02, 0xd89a10, { p: [0, 0.02, 0] }, 28);
    b.torus(0.3, 0.03, 0xffd84a, { p: [0, 0.16, 0], r: [Math.PI / 2, 0, 0] }, 6, 28);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      b.cone(0.07, 0.2, SK3.gold, { p: [Math.cos(a) * 0.28, 0.26, Math.sin(a) * 0.28] }, 8);
      b.sphere(0.04, 0xffe880, { p: [Math.cos(a) * 0.28, 0.37, Math.sin(a) * 0.28] }, 10, 8);
      b.sphere(0.045, i % 2 ? SK3.blue : SK3.red, { p: [Math.cos(a + 0.63) * 0.29, 0.09, Math.sin(a + 0.63) * 0.29] }, 10, 8);
    }
    b.sphere(0.07, SK3.red, { p: [0.29, 0.1, 0] }, 12, 10);
    return b.geometry();
  });
}
const tongueGeo = () => cached('w3:snake:tongue', () => {
  const b = new Build();
  b.tube([[0, 0, 0], [0.18, -0.02, 0], [0.32, 0.0, 0]], 0.022, SK3.tongue, null, 10, 6);
  for (const s of [1, -1]) b.tube([[0.31, 0, 0], [0.38, 0.0, s * 0.04], [0.44, 0.02, s * 0.07]], 0.015, SK3.tongue, null, 6, 5);
  return b.geometry();
});

/** Kurve abtasten; Segmente vom Kopf aus nach Bogenlänge (Abstand step) platzieren. */
function placeAlong(p0, p1, p2, p3, n, step, out) {
  const N = 40, pts = [];
  for (let i = 0; i <= N; i++) {
    const t = 1 - i / N, u = 1 - t;  // i = 0 → Kopf (p3)
    pts.push(new THREE.Vector3().addScaledVector(p0, u * u * u).addScaledVector(p1, 3 * u * u * t).addScaledVector(p2, 3 * u * t * t).addScaledVector(p3, t * t * t));
  }
  const len = [0];
  for (let i = 1; i <= N; i++) len.push(len[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const L = len[N];
  for (let k = 0; k < n; k++) {
    const s = (k + 0.7) * step;
    const o = out[k];
    if (s > L) { o.on = false; continue; }
    let i = 1; while (i < N && len[i] < s) i++;
    const f = (s - len[i - 1]) / Math.max(1e-6, len[i] - len[i - 1]);
    o.on = true;
    o.p.copy(pts[i - 1]).lerp(pts[i], f);
    o.d.copy(pts[i - 1]).sub(pts[i]).normalize(); // Richtung zum Kopf
  }
  return L;
}

function buildSchlangenkoenig(opts = {}) {
  const n = clamp(Math.round(opts.segments ?? 10), 6, 16);
  const rosa = opts.color === 'rosa';
  const root = new THREE.Group();
  const drum = joint();
  drum.add(mesh(circusDrumGeo(DRUM_R, DRUM_H, 0.62), vcol(0.4), {}, true));
  drum.children[0].receiveShadow = true;
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, emissive: 0x000000 });
  const H = DRUM_H + n * SEG_L + 1.5;
  const segs = instMesh(snakeSegGeo(rosa ? ROSA_COLORS : KING_COLORS), mat, n, H, H / 2);
  segs.castShadow = true;
  const head = joint();
  const headM = mesh(kingHeadGeo(rosa ? ROSA_HEAD : KING_HEAD), mat, {}, true);
  const jaw = joint([0.12, -0.17, 0], mesh(kingJawGeo(), mat, {}, true));
  const tongue = mesh(tongueGeo(), vcol(0.4), { p: [0.6, -0.17, 0] });
  const eye = eyes([{ p: [0.42, 0.2, 0.25], r: 0.12, sy: 1.1, dir: [0.8, 0.2, 0.55] }, { p: [0.42, 0.2, -0.25], r: 0.12, sy: 1.1, dir: [0.8, 0.2, -0.55] }],
    rosa ? { key: 'w3:snakeking:rosa', iris: 0x2ad860, pupil: 0.6, slit: true, depth: 0.5 } : { key: 'w3:snakeking', iris: 0xffa010, pupil: 0.6, slit: true, depth: 0.5 });
  const crownMat = metal('w3:crown', { color: 0xffffff, vertexColors: true, metalness: 0.55, roughness: 0.28, emissive: 0x000000 });
  const crownOwn = crownMat.clone();
  const crown = mesh(crownGeo(), crownOwn, { p: [0.0, 0.34, 0], r: [0, 0, 0.1] }, true);
  head.add(headM, jaw, tongue, eye);
  const dizzy = dizzyStars(0.45, 0.1);
  root.add(drum, segs, head, crown, dizzy);
  const items = Array.from({ length: n }, () => ({ on: false, p: new THREE.Vector3(), d: new THREE.Vector3() }));
  const base = new THREE.Vector3(0, DRUM_H - 0.3, 0);
  const P1 = new THREE.Vector3(), P2 = new THREE.Vector3(), HP = new THREE.Vector3(), HD = new THREE.Vector3(1, 0, 0);
  const idleHead = new THREE.Vector3(1.4, DRUM_H + n * SEG_L * 0.62, 0);
  const crownDrop = new THREE.Vector3(1.6, DRUM_H, 0.9);
  const clk = new Clock(), blink = new Blinker();
  let turn = 0, flash = 0, droop = 0, tongueT = 0, crownFall = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    turn = st.turn !== undefined ? st.turn : turn + dt * (anim === 'defeated' ? 0 : 0.3);
    drum.rotation.y = turn;
    const dead = anim === 'defeated', hit = anim === 'hit' && age < 0.5;
    const p = st.progress !== undefined ? clamp(st.progress, 0, 1) : anim === 'rise' ? clamp(age / 0.8, 0, 1) : anim === 'strike' ? (age % 1.2) / 1.2 : 0;
    droop = damp(droop, dead ? 1 : 0, 3, dt);
    // Zielpose des Kopfes
    const sway = Math.sin(t * 1.1) * 0.35;
    HP.copy(idleHead).add(_v.set(Math.sin(t * 0.8) * 0.2, Math.sin(t * 1.4) * 0.15, sway));
    let open = 0;
    if (anim === 'rise') HP.lerpVectors(base, HP, smoothstep(p));
    else if (anim === 'strike') {
      const back = _v.set(-0.4, idleHead.y + 0.6, 0), lunge = new THREE.Vector3(DRUM_R + 1.6, 1.0, 0);
      if (p < 0.3) HP.lerp(back, smoothstep(p / 0.3));
      else if (p < 0.5) HP.copy(back).lerp(lunge, smoothstep((p - 0.3) / 0.2));
      else if (p < 0.7) HP.copy(lunge);
      else HP.copy(lunge).lerp(idleHead, smoothstep((p - 0.7) / 0.3));
      open = p > 0.25 && p < 0.75 ? 1 : 0;
    } else if (anim === 'summon') { HP.set(0.4, idleHead.y + 1.0, 0); open = 0.7; }
    else if (hit) HP.add(_v.set(-0.8, 0.3, 0));
    if (st.headPos) HP.set(st.headPos[0], st.headPos[1], st.headPos[2]);
    if (dead) HP.lerp(_v.set(1.7, DRUM_H + 0.45, 0.4), droop);
    // Kurve: aus dem Loch senkrecht hoch, Kopf von hinten-unten anfahren
    const L0 = Math.max(1, HP.distanceTo(base));
    P1.copy(base).addScaledVector(UP, L0 * (dead ? 0.15 : 0.55));
    HD.set(1, -0.2, 0).normalize();
    P2.copy(HP).addScaledVector(HD, -L0 * 0.45).addScaledVector(UP, dead ? 0 : -L0 * 0.15);
    placeAlong(base, P1, P2, HP, n, SEG_L, items);
    for (let k = 0; k < n; k++) {
      const it = items[k];
      if (!it.on) { segs.setMatrixAt(k, ZERO); continue; }
      const r = 0.42 + (k / (n - 1)) * 0.1;  // zum Schwanz hin dicker
      _q.setFromUnitVectors(UP, it.d);
      segs.setMatrixAt(k, _m.compose(it.p, _q, _s.set(r, r, r)));
    }
    segs.instanceMatrix.needsUpdate = true;
    // Kopf: Lage und Blick (entlang der Kurve, Kinn leicht gesenkt)
    head.position.copy(HP);
    const yawH = anim === 'idle' ? Math.sin(t * 0.7) * 0.4 : 0;
    const pitchH = anim === 'strike' && p > 0.3 && p < 0.7 ? -0.55 : anim === 'summon' ? 0.45 : dead ? -0.35 : -0.1;
    head.rotation.set(dead ? 0.5 : 0, damp(head.rotation.y, yawH, 4, dt), damp(head.rotation.z, pitchH + (hit ? Math.sin(t * 40) * 0.15 : 0), 10, dt), 'YXZ');
    jaw.rotation.z = damp(jaw.rotation.z, -open * 0.6 - (dead ? 0.25 : 0), 14, dt);
    // Zunge züngelt
    tongueT -= dt;
    if (tongueT < -0.5) tongueT = 1.6 + Math.random() * 2;
    const tk = dead ? 0.6 : anim === 'idle' && tongueT < 0 ? Math.sin(clamp(-tongueT / 0.5, 0, 1) * Math.PI) : 0;
    tongue.visible = tk > 0.05;
    tongue.scale.set(tk, 1, 1 + Math.sin(t * 40) * 0.2);
    // Krone: sitzt auf dem Kopf oder fällt bei Niederlage auf den Sockel
    crownFall = damp(crownFall, dead ? 1 : 0, 2.5, dt);
    head.updateMatrix();
    _v.set(0.0, 0.34, 0).applyMatrix4(head.matrix);
    crown.position.lerpVectors(_v, crownDrop, smoothstep(crownFall));
    crown.position.y += Math.sin(crownFall * Math.PI) * 0.8 + (hit ? 0.15 : 0);
    crown.rotation.set(crownFall * 1.4, head.rotation.y * (1 - crownFall), (1 - crownFall) * (head.rotation.z + 0.1) + crownFall * 0.4, 'YXZ');
    const glow = anim === 'summon' ? 0.4 + Math.sin(t * 10) * 0.25 : 0;
    crownOwn.emissive.setRGB(glow, glow * 0.7, 0);
    flash = damp(flash, hit ? 1 : 0, 20, dt);
    const fl = hit ? flash * (Math.sin(t * 40) > 0 ? 0.75 : 0.25) : 0;
    mat.emissive.setRGB(fl, fl, fl);
    let k = blink.update(dt);
    if (hit || dead) k = 0.1; else if (anim === 'strike' && open) k = 1;
    eye.userData.blink(k);
    dizzy.visible = dead;
    if (dead) { dizzy.position.copy(HP).add(_v.set(0, 0.7, 0)); dizzy.rotation.y = t * 4; }
  };
  const headPos = (out = new THREE.Vector3()) => { root.updateMatrixWorld(true); return head.getWorldPosition(out); };
  return makeModel('schlangenkoenig', root, update, [mat, crownOwn], { initial: 'idle', head: headPos });
}

// =============================================================================================
// Diener-Schlange
// =============================================================================================
function servantHeadGeo() {
  return cached('w3:servant:head', () => {
    const b = new Build();
    const skin = { v: (x, y, z, nx, ny) => (ny < -0.5 ? col3(SERVANT_COLORS.belly) : mix(SERVANT_COLORS.dark, SERVANT_COLORS.main, smoothstep(ny * 0.6 + 0.5))) };
    b.sphere(1, skin, { p: [0.08, 0.0, 0], s: [0.34, 0.24, 0.3] }, 22, 16);
    b.sphere(1, skin, { p: [0.3, -0.04, 0], s: [0.2, 0.15, 0.22] }, 18, 12);
    for (const s of [1, -1]) b.sphere(1, 0x3a0a0a, { p: [0.48, 0.0, s * 0.06], s: [0.015, 0.015, 0.02] }, 6, 4);
    b.torus(0.08, 0.016, 0x3a0a0a, { p: [0.44, -0.08, 0], r: [0, Math.PI / 2, Math.PI], s: [1, 0.6, 1] }, 5, 10, Math.PI);
    // Fliege am Hals
    for (const s of [1, -1]) b.sphere(1, 0x1a1a2a, { p: [0.12, -0.3, s * 0.08], s: [0.05, 0.05, 0.08], r: [s * 0.4, 0, 0] }, 10, 8);
    b.sphere(0.035, 0x1a1a2a, { p: [0.14, -0.3, 0] }, 8, 6);
    return b.geometry();
  });
}
function plateGeo(cracked) {
  return cached(`w3:plate:${cracked}`, () => {
    const b = new Build();
    b.lathe([[0.0, 0.0], [0.45, 0.0], [0.62, 0.05], [0.72, 0.1], [0.7, 0.12], [0.6, 0.08], [0.45, 0.06], [0.0, 0.06]].reverse(), { v: (x, y, z, nx, ny) => mix(0xd8e2f0, 0xffffff, smoothstep(ny)) }, null, 40);
    b.torus(0.71, 0.022, 0xffc21a, { p: [0, 0.11, 0], r: [Math.PI / 2, 0, 0] }, 6, 40);
    b.torus(0.45, 0.012, 0x6a9ae8, { p: [0, 0.062, 0], r: [Math.PI / 2, 0, 0] }, 4, 36);
    if (cracked) {
      const cr = [[[0.0, 0.07, 0.05], [0.18, 0.07, 0.12], [0.3, 0.07, 0.06], [0.5, 0.075, 0.18], [0.66, 0.1, 0.12]], [[0.18, 0.07, 0.12], [0.1, 0.07, 0.32], [0.16, 0.075, 0.5]], [[0.0, 0.07, 0.05], [-0.2, 0.07, -0.06], [-0.35, 0.07, -0.2], [-0.55, 0.08, -0.25]]];
      for (const c of cr) b.tube(c, 0.014, 0x3a3040, null, 16, 4);
    }
    return b.geometry();
  });
}
function buildDienerschlange(opts = {}) {
  const Hp = clamp(Number(opts.height ?? 2.2), 1, 5);
  const cracked = !!opts.cracked;
  const n = Math.max(4, Math.round(Hp / 0.36));
  const root = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, emissive: 0x000000 });
  const segs = instMesh(snakeSegGeo(SERVANT_COLORS), mat, n, Hp + 1, Hp / 2);
  segs.castShadow = true;
  const head = joint();
  const headM = mesh(servantHeadGeo(), mat, {}, true);
  const eye = eyes([{ p: [0.28, 0.1, 0.13], r: 0.07, sy: 1.25, dir: [0.8, 0.2, 0.55] }, { p: [0.28, 0.1, -0.13], r: 0.07, sy: 1.25, dir: [0.8, 0.2, -0.55] }],
    { key: 'w3:servant', iris: 0x2a1a0a, pupil: 0.6, depth: 0.5 });
  head.add(headM, eye);
  const plate = mesh(plateGeo(cracked), vcol(0.18), {}, true);
  plate.receiveShadow = true;
  root.add(segs, head, plate);
  root.userData.plateHeight = Hp;
  const items = Array.from({ length: n }, () => ({ on: false, p: new THREE.Vector3(), d: new THREE.Vector3() }));
  const base = new THREE.Vector3(0, -0.3, 0), P1 = new THREE.Vector3(), P2 = new THREE.Vector3(), HP = new THREE.Vector3();
  const clk = new Clock(), blink = new Blinker();
  let flash = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    const hit = anim === 'hit' && age < 0.4;
    let k = 1;
    if (anim === 'rise') k = st.progress !== undefined ? clamp(st.progress, 0, 1) : clamp(age / 0.6, 0, 1);
    if (anim === 'sink') k = 1 - (st.progress !== undefined ? clamp(st.progress, 0, 1) : clamp(age / 0.6, 0, 1));
    const headY = Hp - 0.3;   // Tellermitte (Oberseite) liegt genau auf Hp
    HP.set(0.1 + Math.sin(t * 1.3) * 0.08, base.y + (headY - base.y) * smoothstep(k), Math.sin(t * 0.9) * 0.1);
    P1.set(0, base.y + (HP.y - base.y) * 0.4, 0);
    P2.set(Math.sin(t * 1.1) * 0.25 - 0.1, base.y + (HP.y - base.y) * 0.75, Math.cos(t * 1.1) * 0.15);
    placeAlong(base, P1, P2, HP, n, 0.36, items);
    for (let i = 0; i < n; i++) {
      const it = items[i];
      if (!it.on || it.p.y < -0.05) { segs.setMatrixAt(i, ZERO); continue; }
      const r = 0.24;
      _q.setFromUnitVectors(UP, it.d);
      segs.setMatrixAt(i, _m.compose(it.p, _q, _s.set(r, r, r)));
    }
    segs.instanceMatrix.needsUpdate = true;
    head.position.copy(HP);
    head.visible = HP.y > -0.1;
    head.rotation.set(0, Math.sin(t * 0.6) * 0.3, hit ? Math.sin(t * 40) * 0.2 : 0);
    // Teller bleibt waagerecht über dem Kopf
    plate.position.set(HP.x - 0.05, HP.y + 0.24, HP.z);   // Teller-Oberseite (Mitte) = HP.y + 0,30
    plate.visible = head.visible;
    plate.rotation.set(Math.sin(t * 1.7) * 0.02, t * 0.2, Math.cos(t * 1.4) * 0.02);
    flash = damp(flash, hit ? 1 : 0, 20, dt);
    mat.emissive.setRGB(flash * 0.6, flash * 0.6, flash * 0.6);
    eye.userData.blink(hit ? 0.1 : blink.update(dt));
  };
  return makeModel('dienerschlange', root, update, [mat], { initial: 'idle' });
}

// =============================================================================================
// Felsbrocken
// =============================================================================================
function rockGeo() {
  return cached('w3:felsbrocken', () => {
    const g = new THREE.IcosahedronGeometry(0.45, 2);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      _v.fromBufferAttribute(P, i);
      const n = 1 + Math.sin(_v.x * 9) * 0.05 + Math.sin(_v.y * 11 + 1) * 0.05 + Math.sin(_v.z * 7 + 2) * 0.06;
      _v.multiplyScalar(n); P.setXYZ(i, _v.x, _v.y, _v.z);
    }
    g.computeVertexNormals();
    const b = new Build();
    b.add(g, (x, y, z, nx, ny) => (Math.abs(Math.sin(x * 14 + z * 9)) < 0.08 ? 0x4a3a30 : ny > 0.3 ? 0xa89a8a : 0x80705e), { p: [0, 0.45, 0] });
    return b.geometry();
  });
}
const chunkGeo = () => cached('w3:fels:chunk', () => new Build().add(new THREE.DodecahedronGeometry(0.15, 0), 0x8a7a68).geometry());
function buildFelsbrocken() {
  const root = new THREE.Group();
  const spin = joint([0, 0.45, 0]);
  const rock = mesh(rockGeo(), vcol(0.85), { p: [0, -0.45, 0] }, true);
  spin.add(rock);
  const chunks = instMesh(chunkGeo(), vcol(0.85), 8, 2.5, 0.5);
  chunks.castShadow = true;
  for (let i = 0; i < 8; i++) chunks.setMatrixAt(i, ZERO);
  root.add(spin, chunks);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    const br = anim === 'break';
    spin.visible = !br;
    if (anim === 'fall') spin.rotation.set(t * 3, t * 1.3, t * 4);
    for (let i = 0; i < 8; i++) {
      if (!br || age > 0.9) { chunks.setMatrixAt(i, ZERO); continue; }
      const a = (i / 8) * TAU, a2 = age;
      const sc = Math.max(0.001, 1 - smoothstep((age - 0.6) / 0.3)) * (0.8 + (i % 3) * 0.2);
      setInst(chunks, i, Math.cos(a) * 2.2 * a2, Math.max(0.12, 0.45 + (3 + (i % 2) * 1.5) * a2 - 9 * a2 * a2), Math.sin(a) * 2.2 * a2, a2 * 9, a2 * 7, i, sc);
    }
    chunks.instanceMatrix.needsUpdate = true;
  };
  return makeModel('felsbrocken', root, update, [chunks], { initial: 'idle' });
}

export const MODELS = {
  schattenlaeuferin: buildSchattenlaeuferin,
  schatten_bumerang: buildBumerang,
  schlangenkoenig: buildSchlangenkoenig,
  dienerschlange: buildDienerschlange,
  felsbrocken: buildFelsbrocken,
};
