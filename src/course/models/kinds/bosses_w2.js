// Endgegner Welt 2 (Kurs-Modus): Wirbelbrocken. Eigene Gestaltung. Maßstab Meter, Ursprung = Fußpunkt,
// Blick nach +X; state darf ein String sein ('spin' ≙ { anim: 'spin' }).
//
// wirbelbrocken  ≈2,15 m  stämmiger Gürteltier-Raufbold: terrakottafarbene Haut, cremefarbener Bauch, indigoblauer
//   Gürtelpanzer mit Goldkanten und Nieten auf Rücken und Schwanz, rotes Kopftuch mit weißen Punkten, spitze Ohren,
//   lange Schnauze mit rosa Nase, Unterbiss mit zwei Hauern, dicke Brauen, bandagierte Riesenfäuste mit Goldmanschetten.
//   state { anim: 'idle'|'run'|'spin'|'hide'|'hit'|'stunned'|'defeated', speed (m/s; run: Schrittfrequenz,
//           hide: Rollgeschwindigkeit – 0 = dreht sich auf der Stelle wie ein Kreisel), hp (3..0, Standard 3),
//           progress? (0..1 für hit, sonst Zeit seit Zustandswechsel) }
//         idle: wippt, boxt abwechselnd in die Luft; run: vorgebeugter Sturmlauf;
//         spin: wirbelt mit ausgestreckten Fäusten um die Hochachse (≈ 2 Umdrehungen/s, Reichweite ≈ 1,4 m);
//         hide: rollt sich zur Panzerkugel (Ø 1,5 m, Mitte y = 0,75) – Kopf, Arme, Beine verschwinden;
//         hit: 0,6 s Aufleuchten, Stauchung, Augen zu; stunned: Schwindel-Sterne, wankt;
//         defeated: kippt nach hinten um, blinkt, Augen zu.
//         hp ≤ 2: Risse im Panzer, Wangen glühen rot vor Wut; hp ≤ 1: zusätzlich Dampf aus den Nüstern.
//   root.userData.reach → aktuelle Faust-Reichweite in m (spin: ≈ 1,4, sonst ≈ 0,9).

import {
  THREE, TAU, Build, cached, vcol, basic, mesh, joint, eyes, dizzyStars, makeModel, Clock, Blinker, damp, clamp, col,
  mix, onEllipsoid, decals, smoothstep, lerp, instMesh, setInst,
} from '../lib/kit.js';

const WB = {
  skin: 0xe0783a, skinDark: 0xb85a24, belly: 0xffe2b8, armor: 0x2a3d9a, armorHi: 0x4a66d8, rim: 0xffc21a, rivet: 0xfff0a0,
  band: 0xe8202a, dot: 0xffffff, wrap: 0xfff6e8, cuff: 0xffc21a, claw: 0xfff2d8, nose: 0xff7aa0, ink: 0x1a0e0a, tooth: 0xffffff,
  ear: 0xffb0a0, crack: 0x0a0e2a,
};
const SHELL = { c: [-0.2, 1.12, 0], r: [0.55, 0.8, 0.74] };

function wbBodyGeo() {
  return cached('w2:wb:body', () => {
    const b = new Build();
    // Bauch mit Querbändern (Gürteltier-Unterseite)
    const belly = { v: (x, y, z, nx, ny) => {
      if (nx < 0.25) return col(WB.skin);
      const band = Math.abs(((y + 0.05) / 0.16) % 1 - 0.5) < 0.08;
      return band ? mix(WB.belly, WB.skinDark, 0.35) : col(WB.belly);
    } };
    b.sphere(1, belly, { p: [0.08, 1.05, 0], s: [0.58, 0.62, 0.6] }, 30, 22);
    // Gürtelpanzer: Bänder quer über den Rücken, Goldkanten
    const shell = (x, y, z) => {
      const k = (y - 0.3) / 0.16;
      const f = k - Math.floor(k);
      if (f < 0.12) return WB.rim;
      return Math.floor(k) % 2 ? WB.armor : WB.armorHi;
    };
    b.sphere(1, shell, { p: SHELL.c, s: SHELL.r }, 28, 22);
    // Nieten auf den Goldkanten (Rückseite)
    const riv = [];
    for (let i = 0; i < 6; i++) for (const az of [Math.PI, Math.PI - 0.7, Math.PI + 0.7]) {
      const yy = 0.62 + i * 0.16, el = Math.asin(clamp((yy - SHELL.c[1]) / SHELL.r[1], -1, 1));
      riv.push({ ...onEllipsoid(SHELL.c, SHELL.r, az, el), r: 0.035 });
    }
    decals(b, riv, 0.035, WB.rivet, 0.6);
    // Schwanz: gepanzerte Ringe nach hinten unten
    for (let i = 0; i < 6; i++) {
      const k = i / 5;
      b.sphere(1, i % 2 ? WB.armor : WB.armorHi, { p: [-0.7 - k * 0.5, 0.62 - k * 0.42, 0], s: [0.13 - k * 0.04, 0.14 - k * 0.05, 0.14 - k * 0.05] }, 12, 8);
    }
    b.cone(0.05, 0.14, WB.rim, { p: [-1.24, 0.17, 0], r: [0, 0, 1.9] }, 8);
    // Kopf mit langer Schnauze
    b.sphere(1, WB.skin, { p: [0.4, 1.8, 0], s: [0.33, 0.3, 0.32] }, 26, 18);
    b.sphere(1, { v: (x, y, z, nx, ny) => mix(WB.belly, WB.skin, smoothstep(ny + 0.6)) }, { p: [0.7, 1.7, 0], s: [0.27, 0.15, 0.17], r: [0, 0, -0.12] }, 20, 12);
    b.sphere(1, WB.nose, { p: [0.95, 1.69, 0], s: [0.07, 0.07, 0.09] }, 14, 10);
    for (const s of [1, -1]) b.sphere(0.02, 0x7a2a3a, { p: [1.01, 1.69, s * 0.035] }, 6, 4);
    // Unterkiefer mit Hauern (Unterbiss)
    b.sphere(1, WB.belly, { p: [0.62, 1.57, 0], s: [0.2, 0.08, 0.15] }, 16, 10);
    for (const s of [1, -1]) b.cone(0.035, 0.11, WB.tooth, { p: [0.76, 1.64, s * 0.075], r: [0, 0, -0.15] }, 7);
    b.torus(0.12, 0.014, WB.ink, { p: [0.66, 1.6, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.9, 1] }, 5, 18, Math.PI);
    // spitze Ohren, finstere Brauen
    for (const s of [1, -1]) {
      b.cone(0.1, 0.28, WB.skin, { p: [0.24, 2.08, s * 0.2], r: [s * 0.35, 0, 0.15] }, 10);
      b.cone(0.06, 0.18, WB.ear, { p: [0.27, 2.06, s * 0.2], r: [s * 0.35, 0, 0.15], s: [1, 1, 0.4] }, 8);
      b.capsule(0.04, 0.15, WB.ink, { p: [0.67, 2.0, s * 0.15], r: [Math.PI / 2 - s * 0.6, -s * 0.45, 0], order: 'YXZ' }, 3, 6);
    }
    // Kopftuch (rot, weiße Punkte) mit Knoten und zwei Zipfeln hinten
    const band = (x, y, z) => ((Math.floor(Math.atan2(z, x) * 4) + Math.floor(y * 30)) % 3 === 0 ? WB.dot : WB.band);
    b.torus(1, 0.055, band, { p: [0.38, 1.98, 0], r: [Math.PI / 2, 0, 0.42], order: 'ZYX', s: [0.31, 0.3, 0.95] }, 8, 30);
    b.sphere(1, WB.band, { p: [0.12, 1.86, 0], s: [0.07, 0.07, 0.09] }, 10, 8);
    for (const s of [1, -1]) b.sphere(1, WB.band, { p: [0.0, 1.76, s * 0.08], s: [0.17, 0.05, 0.06], r: [0, s * 0.4, -0.9] }, 10, 8);
    return b.geometry();
  });
}
function wbArmGeo() {
  return cached('w2:wb:arm', () => {
    const b = new Build();
    b.sphere(0.2, WB.armor, { p: [0, 0, 0], s: [1, 0.9, 1] }, 16, 12);     // Schulterplatte
    b.torus(0.17, 0.035, WB.rim, { p: [0, -0.06, 0], r: [Math.PI / 2, 0, 0] }, 6, 18);
    b.capsule(0.15, 0.32, WB.skin, { p: [0, -0.3, 0] }, 4, 12);
    b.torus(0.15, 0.06, WB.cuff, { p: [0, -0.55, 0], r: [Math.PI / 2, 0, 0] }, 8, 18);
    b.sphere(0.25, { v: (x, y, z) => (Math.abs(((y + 0.2) * 14) % 2 - 1) < 0.12 ? mix(WB.wrap, 0xd8c8b0, 0.6) : col(WB.wrap)) }, { p: [0.02, -0.78, 0], s: [1.05, 0.95, 1] }, 18, 14);
    for (const k of [-1, -0.33, 0.33, 1]) b.sphere(0.06, WB.wrap, { p: [0.2, -0.8 + 0, k * 0.11] }, 8, 6);
    return b.geometry();
  });
}
function wbLegGeo() {
  return cached('w2:wb:leg', () => {
    const b = new Build();
    b.capsule(0.2, 0.22, WB.skin, { p: [0, -0.2, 0] }, 4, 12);
    b.sphere(1, WB.skinDark, { p: [0.1, -0.47, 0], s: [0.29, 0.12, 0.21] }, 16, 10);
    for (const k of [-1, 0, 1]) b.cone(0.04, 0.1, WB.claw, { p: [0.38, -0.52, k * 0.1], r: [0, 0, -Math.PI / 2 + 0.2] }, 6);
    return b.geometry();
  });
}
function wbBallGeo() {
  return cached('w2:wb:ball', () => {
    const b = new Build();
    // Kugel aus Gürtelbändern (Ringe um die Rollachse Z), Goldnähte, Schwanzspitze als Knauf
    b.sphere(0.75, (x, y, z) => {
      const a = Math.atan2(y, x) / TAU * 10;
      const f = a - Math.floor(a);
      if (f < 0.1) return WB.rim;
      return Math.floor(a + 10) % 2 ? WB.armor : WB.armorHi;
    }, { p: [0, 0, 0] }, 30, 20);
    for (const s of [1, -1]) {
      b.sphere(1, WB.armorHi, { p: [0, 0, s * 0.72], s: [0.32, 0.32, 0.08] }, 18, 8);
      b.torus(0.32, 0.03, WB.rim, { p: [0, 0, s * 0.735] }, 6, 24);
      b.sphere(0.07, WB.rivet, { p: [0, 0, s * 0.79] }, 10, 8);
    }
    return b.geometry();
  });
}
function wbCrackGeo() {
  return cached('w2:wb:crack', () => {
    const b = new Build();
    const pts = [[Math.PI, 0.3], [Math.PI - 0.25, 0.15], [Math.PI - 0.1, -0.05], [Math.PI - 0.35, -0.2], [Math.PI + 0.5, 0.45], [Math.PI + 0.75, 0.3], [Math.PI + 0.6, 0.1]];
    const hits = pts.map(([az, el]) => onEllipsoid(SHELL.c, [SHELL.r[0] + 0.01, SHELL.r[1] + 0.01, SHELL.r[2] + 0.01], az, el).p.toArray());
    b.tube(hits.slice(0, 4), 0.022, WB.crack, null, 18, 4);
    b.tube(hits.slice(4), 0.02, WB.crack, null, 12, 4);
    return b.geometry();
  });
}
const steamGeo = () => cached('w2:wb:steam', () => {
  const b = new Build();
  for (const s of [1, -1]) for (let i = 0; i < 3; i++) b.sphere(0.05 + i * 0.03, 0xffffff, { p: [i * 0.11, i * 0.05, s * (0.04 + i * 0.06)] }, 10, 8);
  return b.geometry();
});

function buildWirbelbrocken() {
  const root = new THREE.Group();
  const spin = joint();                      // Drehung beim Wirbeln (um die Hochachse)
  const tilt = joint();                      // Umkippen (Drehpunkt Fußpunkt), Vorbeugen
  const flash = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, emissive: 0x000000 });
  const fig = joint();                       // Figur (verschwindet beim Einrollen)
  const body = mesh(wbBodyGeo(), flash, {}, true);
  const eye = eyes([{ p: [0.665, 1.88, 0.15], r: 0.092, sy: 1.12, dir: [1, 0.15, 0.5] }, { p: [0.665, 1.88, -0.15], r: 0.092, sy: 1.12, dir: [1, 0.15, -0.5] }],
    { key: 'w2:wb', iris: 0xffb01a, pupil: 0.45, depth: 0.5 });
  const arms = [1, -1].map((s) => joint([0.08, 1.42, s * 0.62], mesh(wbArmGeo(), flash, {}, true)));
  const legs = instMesh(wbLegGeo(), flash, 2, 1.2, 0.4);
  legs.castShadow = true;
  const crack = mesh(wbCrackGeo(), vcol(0.6), {}, false);
  const steam = mesh(steamGeo(), basic('w2:wbSteam', { color: 0xffffff, transparent: true, opacity: 0.75, depthWrite: false }), { p: [1.0, 1.72, 0] });
  const cheekMat = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false });
  const cheeks = mesh(cached('w2:wb:cheeks', () => {
    const b = new Build();
    for (const s of [1, -1]) b.sphere(1, 0xff2a2a, { p: [0.6, 1.73, s * 0.24], s: [0.05, 0.06, 0.09], r: [0, s * 0.6, 0] }, 12, 8);
    return b.geometry();
  }), cheekMat);
  fig.add(body, eye, ...arms, legs, crack, steam, cheeks);
  const ball = joint([0, 0.75, 0], mesh(wbBallGeo(), flash, {}, true));
  const dizzy = dizzyStars(0.5, 0.11); dizzy.position.set(0.3, 2.35, 0);
  tilt.add(fig, ball, dizzy);
  spin.add(tilt);
  root.add(spin);
  root.userData.reach = 0.9;

  const clk = new Clock(), blink = new Blinker();
  let phase = Math.random() * TAU, spinA = 0, curl = 0, fall = 0, rollA = 0, sq = 0, rage = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    const hp = clamp(Math.round(st.hp ?? 3), 0, 3);
    const run = anim === 'run', spinning = anim === 'spin', hiding = anim === 'hide', defeated = anim === 'defeated';
    if (run) phase += dt * (7 + (st.speed ?? 4) * 1.6);
    // Wirbeln: um die Hochachse; sonst zurück in Blickrichtung
    if (spinning) spinA += dt * 13;
    else spinA = damp(spinA, Math.round(spinA / TAU) * TAU, 6, dt);
    spin.rotation.y = spinA;
    // Einrollen
    curl = damp(curl, hiding ? 1 : 0, hiding ? 10 : 7, dt);
    const figS = Math.max(0.001, 1 - smoothstep(curl * 1.4));
    fig.scale.setScalar(figS);
    fig.visible = figS > 0.02;
    const ballS = smoothstep((curl - 0.25) / 0.75);
    ball.visible = ballS > 0.02;
    ball.scale.setScalar(Math.max(0.001, ballS));
    if (hiding) {
      const v = st.speed ?? 0;
      if (v > 0.1) { rollA -= dt * v / 0.75; ball.rotation.set(0, 0, rollA); }
      else { rollA += dt * 16; ball.rotation.set(Math.PI / 2 + Math.sin(t * 5) * 0.12, rollA, 0, 'YXZ'); }
      ball.position.y = 0.75 + Math.abs(Math.sin(t * 9)) * 0.03;
    }
    // Umkippen bei Niederlage
    fall = damp(fall, defeated ? 1 : 0, 4, dt);
    // Stauchen bei Treffer
    const hitP = anim === 'hit' ? (st.progress !== undefined ? clamp(st.progress, 0, 1) : clamp(age / 0.6, 0, 1)) : 1;
    sq = anim === 'hit' ? Math.sin(Math.min(1, hitP * 2) * Math.PI) * 0.25 : damp(sq, 0, 12, dt);
    tilt.scale.set(1 + sq * 0.4, 1 - sq, 1 + sq * 0.4);
    let lean = 0;
    if (run) lean = -0.28;
    else if (spinning) lean = -0.06;
    else if (anim === 'stunned') lean = Math.sin(t * 3) * 0.12;
    tilt.rotation.z = damp(tilt.rotation.z, lean + fall * 1.45, 8, dt);
    tilt.rotation.x = anim === 'stunned' ? Math.cos(t * 3) * 0.1 : 0;
    tilt.position.y = run ? Math.abs(Math.sin(phase)) * 0.08 : anim === 'idle' ? Math.abs(Math.sin(t * 3)) * 0.03 : 0;
    // Arme
    arms.forEach((a, i) => {
      const s = i ? -1 : 1;
      let rz = 0.15, rx = s * 0.25;
      if (anim === 'idle') { const pun = Math.max(0, Math.sin(t * 3.2 + i * Math.PI)); rz = 0.3 + pun * 1.1; rx = s * (0.2 - pun * 0.15); }
      else if (run) { rz = Math.sin(phase + i * Math.PI) * 0.9; rx = s * 0.35; }
      else if (spinning) { rz = 0.15; rx = s * 1.5; }
      else if (anim === 'hit') { rz = 2.4; rx = s * 0.7; }
      else if (anim === 'stunned') { rz = 0.2 + Math.sin(t * 4 + i) * 0.3; rx = s * 0.5; }
      else if (defeated) { rz = 2.0; rx = s * 1.0; }
      a.rotation.z = damp(a.rotation.z, rz, spinning ? 12 : 10, dt);
      a.rotation.x = damp(a.rotation.x, rx, 10, dt);
    });
    root.userData.reach = spinning ? 1.4 : 0.9;
    // Beine
    for (let i = 0; i < 2; i++) {
      const s = i ? -1 : 1;
      const sw = run ? Math.sin(phase + i * Math.PI) * 0.7 : spinning ? Math.sin(t * 26 + i * Math.PI) * 0.25 : 0;
      setInst(legs, i, 0.0, 0.58, s * 0.3, 0, 0, sw);
    }
    legs.instanceMatrix.needsUpdate = true;
    // Wut (hp), Risse, Dampf
    rage = damp(rage, hp <= 2 ? 1 : 0, 4, dt);
    crack.visible = hp <= 2;
    steam.visible = hp <= 1 && !hiding && !defeated && (t % 1.2) < 0.7;
    if (steam.visible) { const k = (t % 1.2) / 0.7; steam.scale.setScalar(0.6 + k * 0.8); steam.position.x = 1.0 + k * 0.2; steam.material.opacity = 0.75; }
    const hitK = anim === 'hit' ? Math.max(0, 1 - hitP) * (Math.sin(age * 40) > 0 ? 1 : 0.25) : defeated ? (Math.sin(t * 18) > 0 ? 0.35 : 0) : 0;
    cheeks.visible = rage > 0.5 && !hiding;
    cheekMat.opacity = 0.55 + Math.sin(t * 6) * 0.25;
    flash.emissive.setRGB(hitK, hitK * 0.85, hitK * 0.8);
    // Augen
    let bk = blink.update(dt);
    if (anim === 'hit' || defeated) bk = 0.1; else if (anim === 'stunned') bk = 0.4; else if (spinning) bk = 0.6; else bk = Math.min(bk, 0.85);
    eye.userData.blink(bk);
    dizzy.visible = anim === 'stunned';
    dizzy.rotation.y = t * 3.5;
  };
  return makeModel('wirbelbrocken', root, update, [flash, cheekMat], { initial: 'idle' });
}

export const MODELS = {
  wirbelbrocken: buildWirbelbrocken,
};
