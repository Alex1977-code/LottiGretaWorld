// Blöcke und Gimmicks Welt 4 (Kurs-Modus). Eigene Gestaltung im Spielzeug-Look. Maßstab Meter, Ursprung = Mitte der
// Unterseite (Ausnahmen genannt), Vorderseite/Durchlaufrichtung +X; state darf ein String sein.
//
// piep_block        Piep-Block 1 m: glänzender Würfel (rot = pink-rot, blau = königsblau) mit weißem „Schallwellen“-Zeichen
//                   auf allen vier Seiten und hellem Deckelfeld. Aus: nur gestrichelter, leuchtender Umriss + Hauch von Füllung.
//                   opts  { color: 'rot'|'blau' (Standard 'rot') }
//                   state { on (0..1: 1 = fest, 0 = Umriss; Zwischenwerte wachsen/schrumpfen den Block; Kurzform 'on'|'off'), warn (0..1: Blinken
//                           vor dem Wechsel – fest: Block blinkt hell; Umriss: Umriss flackert, Füllung nimmt zu) }
//                   Viele → createInstanced('piep_block', n, { color }) (lib/instanced_w4.js), state wie hier.
// riesentrampolin   großes schwebendes Trampolin: runde Sprungfläche (orange mit gelbem Stern und Strahlen) in einem rot-weißen
//                   Polsterring, darunter blaue Schürze mit vier Propeller-Gondeln (Rotoren nach unten) und sechs bunten
//                   Ballons an kurzen Schnüren seitlich. **Ursprung = Mitte der Sprungfläche in Ruhe (y = 0)**.
//                   opts  { radius (3) }
//                   state { squash (0..1: Sprungfläche dellt bis 0,6 m ein), anim?: 'idle'|'bounce' (Nachfedern 0,9 s, n?),
//                           spin? (Rotor-Drehzahl in U/s, Standard 3) }
//                   root.userData.radius → Radius der Sprungfläche (radius − 0,25).
// trampolin_orange  Pilz-Federtrampolin ≈1,0 m: orange-cremefarben gestreifter Pilzhut (Ø 1,9 m, Polsterrand) auf dickem
//                   Cremestiel mit roter Spiralfeder, Graspolster als Fuß. Hut-Oberkante in Ruhe bei y = 1,0.
//                   state { squash (0..1: Hut sinkt bis 0,35 m ein), anim?: 'idle'|'bounce' (Nachfedern 0,8 s, n?) }
//                   root.userData.top() → aktuelle Hut-Oberkante.
// stachelstange     drehende Stachelstange: Bronze-Sockel (Ø 0,9 m, 0,55 m) mit drehendem Kopf, waagerechte Eisenstange mit
//                   Goldringen, an jedem Ende und in der Mitte jeder Hälfte eine Stachelkugel (Ø ≈1 m mit Stacheln).
//                   opts  { length (Gesamtlänge, 6), balls (Kugeln je Seite, 1–4, Standard 2), sides (1|2, Standard 2) }
//                   state { angle (rad um +Y) }  root.userData.barHeight → 0,75 (Stangenhöhe), userData.reach → Reichweite.
// schwankplattform  Schwankplattform auf Kugelgelenk: Ruinen-Steinsäule, goldene Gelenkkugel, darauf eine Steinplatte mit
//                   Fliesenmuster, Goldkante und Moos. opts { size: [x, z] (3 × 3), height (Gelenkhöhe, 1,5) }
//                   state { tilt: [rx, rz] (Neigung in rad um x bzw. z, um den Gelenkpunkt) }
//                   root.userData.pivot → Gelenkhöhe, userData.top → Plattform-Oberkante in Ruhe (pivot + 0,5).
// roulette_block_w4 Roulette-Block 1 m (Name mit _w4, weil 'roulette_block' der Glaswürfel aus Welt 1 ist): orange-goldener
//                   Rahmenblock mit dunkelblauen Fenstern, darin das wechselnde Symbol (alle vier Seiten), Lauflichter.
//                   state { item: 'pilz' (Wachstumsbeere)|'blume' (Funkenblüte)|'krallen' (Krallen-Medaillon)|'stern'
//                           (Funkelstern)|'muenze' (Bitcoin), anim: 'idle'|'bump'|'used', n? }
//                   bump: hüpft (0,25 s); used: brauner leerer Block, Lichter aus.
// sternring         grüner Sternring Ø 2,4 m, senkrecht (Durchlaufrichtung ±X), Mitte bei y = 1,15: Kranz aus zwölf puffigen
//                   mintgrünen Sternen um einen weiß-mintgrünen Leuchtreif, Funkeln in der Mitte.
//                   state { anim: 'idle'|'active'|'done', progress? (active: 0..1 Restzeit – so viele Sterne leuchten) }
//                   done: schrumpft und verschwindet (0,4 s).
// sternmuenze       Sternmünze Ø 0,75 m: sternförmige, glasig mintgrüne Münze mit weißem Innenstern und Goldperle, Schein.
//                   Mitte bei y = 0,45, Flächen nach ±Z, dreht sich.
//                   state { anim: 'idle'|'collected'|'ghost' }  collected: schnellt hoch, verschwindet (0,35 s);
//                   ghost: durchsichtig (schon gesammelt).
// giftwasser        lila Giftwasser-Fläche (Oberfläche y = 0, Mitte im Ursprung) mit wandernden Schlieren, Glanzschicht
//                   und aufsteigenden, platzenden Blasen. opts { size: [x, z] (8 × 8), bubbles (Anzahl, Standard nach Fläche) }
//                   state { flow: [dx, dz] (Strömung in m/s, Standard [0,05, 0,03]) }

import {
  THREE, TAU, Build, cached, vcol, basic, std, mesh, joint, makeModel, Clock, damp, clamp, mix, col, smoothstep,
  instMesh, setInst, glowSprite, sparkleSprite, puffyStarGeo, roundedBox, SIDE, canvasTexture, placed, starShape,
} from '../lib/kit.js';
import {
  PIEP_COLORS, piepSolidGeo, piepOutlineGeo, piepFillGeo, RUIN, ruinSaeuleGeo, noise3, hash1, displace, axisY,
} from '../lib/w4Geos.js';

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
function trigger(clk, st, names) {
  const fresh = clk.entered || (st.n !== undefined && st.n !== clk.lastN);
  clk.lastN = st.n;
  if (fresh && names.includes(clk.anim)) clk.age = 0;
  return clk.age;
}
/** Abklingende Federschwingung (0 → Ausschlag → 0) über dur Sekunden. */
const springOut = (age, dur, f = 3) => (age >= dur ? 0 : Math.sin((age / dur) * Math.PI * f) * (1 - age / dur));

// =============================================================================================
// Piep-Block
// =============================================================================================
function buildPiep(opts = {}) {
  const color = opts.color === 'blau' ? 'blau' : 'rot';
  const C = PIEP_COLORS[color];
  const root = new THREE.Group();
  const solidMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.28, emissive: C.hi, emissiveIntensity: 0.12 });
  const outlineMat = new THREE.MeshBasicMaterial({ color: C.glow, transparent: true, opacity: 0.95, depthWrite: false });
  const fillMat = new THREE.MeshBasicMaterial({ color: C.base, transparent: true, opacity: 0.12, depthWrite: false });
  const center = joint([0, 0.5, 0]);
  const solid = mesh(piepSolidGeo(color), solidMat, { p: [0, -0.5, 0] }, true);
  solid.receiveShadow = true;
  center.add(solid);
  const outline = mesh(piepOutlineGeo(), outlineMat);
  const fill = mesh(piepFillGeo(), fillMat);
  fill.renderOrder = 2; outline.renderOrder = 3;
  root.add(center, outline, fill);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t = clk.t;
    const on = clamp(Number(st.on ?? (st.anim === 'off' ? 0 : 1)), 0, 1), warn = clamp(Number(st.warn ?? 0), 0, 1);
    const blink = warn > 0 ? (Math.sin(t * TAU * (5 + warn * 5)) > 0 ? 1 : 0) * warn : 0;
    const k = smoothstep(on);
    center.scale.setScalar(Math.max(0.001, 0.55 + 0.45 * k) * (1 + blink * 0.03));
    solid.visible = on > 0.02;
    solidMat.emissiveIntensity = 0.12 + blink * 0.75 + Math.max(0, Math.sin(t * 3)) * 0.04;
    outline.visible = on < 0.98;
    outlineMat.opacity = (1 - k) * (0.75 + 0.25 * Math.sin(t * 4)) * (1 - blink * 0.6) + blink * 0.3;
    fill.visible = on < 0.98;
    fillMat.opacity = (1 - k) * (0.1 + warn * 0.18 + blink * 0.12);
  };
  return makeModel('piep_block', root, update, [solidMat, outlineMat, fillMat]);
}

// =============================================================================================
// Riesentrampolin (Ursprung = Mitte der Sprungfläche)
// =============================================================================================
const RT = { pad: 0xff3a3a, padW: 0xfff6ee, mem: 0xff8a1a, memHi: 0xffb43a, star: 0xffe23a, skirt: 0x2a6adf, skirtHi: 0x5a9aff, pod: 0xf2f4fa, rotor: 0xffc21a, string: 0xffffff };
const BALLOON_COLS = [0xff4a6a, 0xffd21f, 0x4ac8ff, 0x7ad84a, 0xc87aff, 0xff9a3a];
function rtFrameGeo(R) {
  return cached(`w4:rt:frame:${R}`, () => {
    const b = new Build();
    b.add(new THREE.TorusGeometry(R - 0.12, 0.26, 12, 64), (x, y) => (Math.floor(((Math.atan2(y, x) / TAU) + 1) * 16) % 2 ? RT.pad : RT.padW), { p: [0, -0.04, 0], r: [Math.PI / 2, 0, 0] });
    // Schürze (Schale nach unten) mit gelben Sternen, Gondeln und Ballonschnüre
    const sk = new THREE.CylinderGeometry(R - 0.15, R * 0.55, 0.9, 40, 1, true);
    b.add(sk, { v: (x, y, z, nx, ny) => mix(RT.skirt, RT.skirtHi, smoothstep(y + 0.5)) }, { p: [0, -0.62, 0] });
    b.cyl(R * 0.55, R * 0.55, 0.06, RT.skirt, { p: [0, -1.08, 0] }, 32);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + 0.2;
      const rr = R * 0.78 + 0.02;
      b.add(puffyStarGeo(0.18, 0.08, 0.05, 0.02), RT.star, placed(new THREE.Vector3(Math.cos(a) * rr, -0.6, Math.sin(a) * rr), new THREE.Vector3(Math.cos(a), -0.3, Math.sin(a)), new THREE.Vector3(1, 1, 1)));
    }
    // vier Propeller-Gondeln unten
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4;
      const x = Math.cos(a) * R * 0.62, z = Math.sin(a) * R * 0.62;
      b.add(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8), 0xc8ccd8, { p: [x * 0.93, -1.0, z * 0.93] });
      b.sphere(0.28, { v: (xx, y, zz, nx, ny) => mix(0xb8c0d0, RT.pod, smoothstep(ny + 0.5)) }, { p: [x, -1.3, z], s: [1, 0.8, 1] }, 16, 10);
      b.cyl(0.05, 0.05, 0.16, 0x4a4e66, { p: [x, -1.58, z] }, 8);
    }
    // Ballonschnüre seitlich am Polsterring
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      const p0 = new THREE.Vector3(Math.cos(a) * (R + 0.1), -0.15, Math.sin(a) * (R + 0.1));
      const p1 = new THREE.Vector3(Math.cos(a) * (R + 0.55), 0.25, Math.sin(a) * (R + 0.55));
      b.tube([p0.toArray(), p0.clone().lerp(p1, 0.5).add(new THREE.Vector3(0, -0.05, 0)).toArray(), p1.toArray()], 0.012, RT.string, null, 6, 4);
    }
    return b.geometry();
  });
}
function rtMembraneGeo(R) {
  return cached(`w4:rt:mem:${R}`, () => {
    const b = new Build();
    // Scheibe mit Tiefe 1 als Paraboloid (Mesh-Skalierung y = −Delle), Muster: Strahlen + Stern
    const rings = 10, segs = 48, r0 = R - 0.25;
    const pos = [];
    const P = (i, j) => {
      const r = (i / rings) * r0, a = (j / segs) * TAU;
      return [Math.cos(a) * r, -(1 - (r / r0) * (r / r0)), Math.sin(a) * r];
    };
    for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) {
      const a = P(i, j), bb = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1);
      pos.push(...a, ...c, ...bb, ...a, ...d, ...c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    const star = starShape(r0 * 0.42, r0 * 0.2, 5);
    const pts = star.getPoints(1);
    const inStar = (x, z) => {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
        if (((yi > -z) !== (yj > -z)) && (x < ((xj - xi) * (-z - yi)) / (yj - yi) + xi)) inside = !inside;
      }
      return inside;
    };
    b.add(g, (x, y, z) => {
      if (inStar(z, -x)) return RT.star;
      const a = Math.atan2(z, x);
      return Math.floor(((a / TAU) + 1) * 24) % 2 ? RT.mem : RT.memHi;
    });
    return b.geometry();
  });
}
function rtRotorGeo() {
  return cached('w4:rt:rotor', () => {
    const b = new Build();
    for (let k = 0; k < 3; k++) b.box(0.75, 0.025, 0.12, RT.rotor, { p: [Math.cos(k * TAU / 3) * 0.38, 0, Math.sin(k * TAU / 3) * 0.38], r: [0.25, -k * TAU / 3, 0] }, 0.02, 1);
    b.sphere(0.07, 0xff3a3a, {}, 10, 8);
    return b.geometry();
  });
}
const balloonGeo = () => cached('w4:rt:balloon', () => {
  const b = new Build();
  b.lathe([[0, -0.38], [0.06, -0.36], [0.2, -0.24], [0.29, -0.02], [0.27, 0.18], [0.17, 0.32], [0, 0.37]], 0xffffff, null, 18, 2);
  b.cone(0.05, 0.06, 0xffffff, { p: [0, -0.4, 0], r: [Math.PI, 0, 0] }, 8);
  return b.geometry();
});
function buildRiesentrampolin(opts = {}) {
  const R = clamp(Math.round((opts.radius ?? 3) * 4) / 4, 1.5, 8);
  const root = new THREE.Group();
  const frame = mesh(rtFrameGeo(R), vcol(0.4, {}, 'w4tramp'), {}, true);
  frame.receiveShadow = true;
  const mem = mesh(rtMembraneGeo(R), vcol(0.5, {}, 'w4trampMem'), {}, false);
  mem.receiveShadow = true;
  const rotors = instMesh(rtRotorGeo(), vcol(0.35, { metalness: 0.2 }, 'w4rotor'), 4, R * 1.5, -1);
  const balloons = instMesh(balloonGeo(), vcol(0.25, {}, 'w4balloon'), 6, R * 1.6, 0);
  balloons.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(18), 3);
  BALLOON_COLS.forEach((c, i) => balloons.setColorAt(i, col(c)));
  balloons.castShadow = true;
  root.add(frame, mem, rotors, balloons);
  root.userData.radius = R - 0.25;
  const clk = new Clock();
  let rot = 0, sq = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    const age = trigger(clk, st, ['bounce']);
    let target = clamp(Number(st.squash ?? 0), 0, 1);
    if (anim === 'bounce') target = Math.max(target, Math.abs(springOut(age, 0.9, 3.5)) * 0.8);
    sq = damp(sq, target, 30, dt);
    mem.scale.set(1, Math.max(0.002, sq * 0.6), 1);
    frame.position.y = -sq * 0.08;
    rot += dt * TAU * (st.spin ?? 3);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4;
      setInst(rotors, i, Math.cos(a) * R * 0.62, -1.68, Math.sin(a) * R * 0.62, 0, rot + i, 0);
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      const sw = Math.sin(t * 1.3 + i * 1.7) * 0.08;
      setInst(balloons, i, Math.cos(a) * (R + 0.6) + sw * Math.sin(a), 0.62 + Math.sin(t * 1.7 + i) * 0.05, Math.sin(a) * (R + 0.6) - sw * Math.cos(a), sw, 0, -sw);
    }
    rotors.instanceMatrix.needsUpdate = true; balloons.instanceMatrix.needsUpdate = true;
  };
  return makeModel('riesentrampolin', root, update, [rotors, balloons]);
}

// =============================================================================================
// Trampolin orange (Pilz-Feder)
// =============================================================================================
const TO = { cap: 0xff7a14, capHi: 0xffa23a, cream: 0xfff0d2, rim: 0xffd84a, stem: 0xfff2dc, stemLow: 0xe8cfa6, spring: 0xe8283a, grass: 0x5cc23a, grassHi: 0x8ae05a };
const TO_TOP = 1.0;
function toCapGeo() {
  return cached('w4:to:cap', () => {
    const b = new Build();
    const pts = [[0, -0.18], [0.5, -0.2], [0.82, -0.14], [0.95, -0.05], [0.96, 0.03], [0.88, 0.1], [0.62, 0.17], [0.3, 0.2], [0, 0.21]];
    b.lathe(pts, (x, y, z, nx, ny) => {
      if (ny < -0.3) return TO.cream;
      return Math.floor(((Math.atan2(z, x) / TAU) + 1) * 12) % 2 ? TO.cap : TO.cream;
    }, null, 48, 2);
    b.torus(0.92, 0.08, TO.rim, { p: [0, -0.04, 0], r: [Math.PI / 2, 0, 0] }, 8, 48);
    b.sphere(0.12, TO.capHi, { p: [0, 0.19, 0], s: [1, 0.35, 1] }, 14, 8);
    return b.geometry();
  });
}
function toStemGeo() {
  return cached('w4:to:stem', () => {
    const b = new Build();
    b.cyl(0.22, 0.26, 1, { v: (x, y) => mix(TO.stemLow, TO.stem, y + 0.5) }, { p: [0, 0.5, 0] }, 20);
    return b.geometry();
  });
}
function toSpringGeo() {
  return cached('w4:to:spring', () => {
    const b = new Build();
    const pts = [];
    for (let i = 0; i <= 64; i++) { const a = (i / 64) * 4 * TAU; pts.push([Math.cos(a) * 0.3, i / 64, Math.sin(a) * 0.3]); }
    b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 96, 0.045, 6, false), { v: (x, y, z, nx) => mix(0xa01020, TO.spring, smoothstep(nx * 0.5 + 0.6)) });
    return b.geometry();
  });
}
function toBaseGeo() {
  return cached('w4:to:base', () => {
    const b = new Build();
    b.add(displace(new THREE.SphereGeometry(0.62, 20, 8, 0, TAU, 0, Math.PI / 2), 0.04, 5, 2, false), { v: (x, y, z, nx, ny) => mix(TO.grass, TO.grassHi, smoothstep(ny)) }, { s: [1, 0.32, 1] });
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9;
      b.cone(0.05, 0.16, TO.grassHi, { p: [Math.cos(a) * 0.5, 0.1, Math.sin(a) * 0.5], r: [Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3] }, 5);
    }
    b.cyl(0.32, 0.32, 0.06, 0xe8cfa6, { p: [0, 0.19, 0] }, 20);
    return b.geometry();
  });
}
function buildTrampolinOrange() {
  const root = new THREE.Group();
  const base = mesh(toBaseGeo(), vcol(0.6, {}, 'w4grass'), {}, true);
  const stem = mesh(toStemGeo(), vcol(0.45), { p: [0, 0.2, 0] }, true);
  const spring = mesh(toSpringGeo(), vcol(0.25, { metalness: 0.2 }, 'w4spring2'), { p: [0, 0.2, 0] }, true);
  const cap = joint([0, TO_TOP - 0.21, 0], mesh(toCapGeo(), vcol(0.35), {}, true));
  root.add(base, stem, spring, cap);
  const clk = new Clock();
  let sq = 0;
  const H0 = TO_TOP - 0.21 - 0.2; // Stiel/Federlänge in Ruhe
  root.userData.top = () => TO_TOP - sq * 0.35;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const age = trigger(clk, st, ['bounce']);
    let target = clamp(Number(st.squash ?? 0), 0, 1);
    let wob = 0;
    if (anim === 'bounce') { const s = springOut(age, 0.8, 3); target = Math.max(target, Math.max(0, s) * 0.8); wob = Math.min(0, s) * -0.25; }
    sq = damp(sq, target, 30, dt);
    const h = H0 - sq * 0.35 + wob * 0.2;
    stem.scale.y = h; spring.scale.y = h;
    cap.position.y = 0.2 + h;
    cap.scale.set(1 + sq * 0.12, 1 - sq * 0.3, 1 + sq * 0.12);
  };
  return makeModel('trampolin_orange', root, update);
}

// =============================================================================================
// Stachelstange
// =============================================================================================
const SS = { bronze: 0xc88a3a, bronzeHi: 0xffd08a, bronzeLow: 0x7a4a1a, iron: 0x3a3e52, ironHi: 0x6a7090, gold: 0xffc21a, spike: 0xe8ecf6, spikeLow: 0x9aa2b8, ball: 0x2e3246 };
const BAR_Y = 0.75;
function ssBaseGeo() {
  return cached('w4:ss:base', () => {
    const b = new Build();
    const bz = { v: (x, y, z, nx, ny) => mix(SS.bronzeLow, SS.bronzeHi, smoothstep(ny * 0.4 + nx * 0.3 + 0.45)) };
    b.cyl(0.48, 0.55, 0.18, bz, { p: [0, 0.09, 0] }, 24);
    b.cyl(0.36, 0.42, 0.37, bz, { p: [0, 0.36, 0] }, 24);
    b.torus(0.37, 0.04, SS.gold, { p: [0, 0.5, 0], r: [Math.PI / 2, 0, 0] }, 6, 24);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; b.sphere(0.035, SS.gold, { p: [Math.cos(a) * 0.52, 0.12, Math.sin(a) * 0.52] }, 8, 6); }
    return b.geometry();
  });
}
function spikeBall(b, c, r) {
  b.sphere(r, { v: (x, y, z, nx, ny) => mix(SS.ball, SS.ironHi, smoothstep(ny * 0.5 + 0.4)) }, { p: c }, 18, 12);
  const dirs = [];
  for (let i = 0; i < 14; i++) {
    const y = 1 - (i + 0.5) / 7, rr = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.4;
    dirs.push([Math.cos(a) * rr, y, Math.sin(a) * rr]);
  }
  for (const d of dirs) {
    const dd = new THREE.Vector3(...d).normalize();
    b.add(new THREE.ConeGeometry(r * 0.32, r * 0.7, 7), { v: (x, y) => mix(SS.spikeLow, SS.spike, smoothstep(y / (r * 0.7) + 0.5)) }, axisY(new THREE.Vector3(...c).addScaledVector(dd, r * 1.15).toArray(), dd.toArray()));
  }
}
function ssRotorGeo(L, balls, sides) {
  return cached(`w4:ss:rotor:${L}:${balls}:${sides}`, () => {
    const b = new Build();
    const half = L / 2;
    // drehender Kopf
    b.cyl(0.3, 0.34, 0.26, { v: (x, y, z, nx, ny) => mix(SS.bronzeLow, SS.bronzeHi, smoothstep(ny * 0.4 + 0.5)) }, { p: [0, 0.63, 0] }, 20);
    b.sphere(0.12, SS.gold, { p: [0, 0.8, 0] }, 12, 8);
    // Stange (Eisen) mit Goldringen
    const x0 = sides === 2 ? -half : 0;
    const len = sides === 2 ? L : half;
    b.add(new THREE.CylinderGeometry(0.09, 0.09, len, 12), { v: (x, y, z, nx, ny) => mix(SS.iron, SS.ironHi, smoothstep(ny * 0.5 + 0.5)) }, { p: [x0 + len / 2, BAR_Y, 0], r: [0, 0, Math.PI / 2] });
    for (let k = 0; k <= Math.floor(len / 0.8); k++) {
      const x = x0 + k * 0.8;
      if (Math.abs(x) < 0.35) continue;
      b.torus(0.1, 0.03, SS.gold, { p: [x, BAR_Y, 0], r: [0, Math.PI / 2, 0] }, 5, 12);
    }
    for (const s of sides === 2 ? [1, -1] : [1]) {
      for (let i = 1; i <= balls; i++) spikeBall(b, [s * (half * i) / balls, BAR_Y, 0], 0.3);
    }
    return b.geometry();
  });
}
function buildStachelstange(opts = {}) {
  const L = clamp(Math.round((opts.length ?? 6) * 2) / 2, 1.5, 20);
  const balls = clamp(Math.round(opts.balls ?? 2), 1, 4);
  const sides = opts.sides === 1 ? 1 : 2;
  const root = new THREE.Group();
  const base = mesh(ssBaseGeo(), vcol(0.35, { metalness: 0.3 }, 'w4bronze'), {}, true);
  const rotor = mesh(ssRotorGeo(L, balls, sides), vcol(0.32, { metalness: 0.3 }, 'w4bronze'), {}, true);
  rotor.frustumCulled = true;
  root.add(base, rotor);
  root.userData.barHeight = BAR_Y;
  root.userData.reach = L / 2 + 0.52;
  const update = (dt, st) => { rotor.rotation.y = Number(st.angle ?? 0); };
  return makeModel('stachelstange', root, update);
}

// =============================================================================================
// Schwankplattform
// =============================================================================================
function swPlateGeo(sx, sz) {
  return cached(`w4:sw:plate:${sx}:${sz}`, () => {
    const b = new Build();
    const th = 0.4;
    b.box(sx, th, sz, (x, y, z, nx, ny) => {
      if (ny > 0.7) {
        const tile = (Math.floor((x + sx / 2) / 0.75) + Math.floor((z + sz / 2) / 0.75)) % 2;
        const edge = Math.abs(x) > sx / 2 - 0.16 || Math.abs(z) > sz / 2 - 0.16;
        if (edge) return RUIN.gold;
        return tile ? RUIN.stone : RUIN.stoneHi;
      }
      return Math.abs(y) < 0.05 ? RUIN.inlay : RUIN.stoneLow;
    }, { p: [0, 0.1 + th / 2, 0] }, 0.06, 1);
    // Moos-Polster an zwei Ecken (flach, nicht auf der Lauffläche)
    for (const [x, z] of [[-sx / 2 + 0.05, sz / 2 - 0.3], [sx / 2 - 0.3, -sz / 2 + 0.05]]) {
      b.add(displace(new THREE.SphereGeometry(0.28, 10, 6), 0.05, 6, x, false), RUIN.moss, { p: [x, 0.18, z], s: [1, 0.5, 1] });
    }
    // Lager-Schale unter der Platte
    b.cyl(0.42, 0.32, 0.12, RUIN.gold, { p: [0, 0.06, 0] }, 20);
    return b.geometry();
  });
}
function buildSchwankplattform(opts = {}) {
  const sz = Array.isArray(opts.size) ? opts.size : [3, 3];
  const sx = clamp(Math.round(sz[0] * 4) / 4, 1, 12), sz2 = clamp(Math.round((sz[1] ?? sz[0]) * 4) / 4, 1, 12);
  const H = clamp(Math.round((opts.height ?? 1.5) * 10) / 10, 0.6, 10);
  const root = new THREE.Group();
  const pillar = mesh(ruinSaeuleGeo(Math.max(1, H - 0.3), false, false, false), vcol(0.7, {}, 'w4stone'), { s: [0.9, Math.max(0.5, (H - 0.3) / Math.max(1, H - 0.3)), 0.9] }, true);
  const ball = mesh(cached('w4:sw:ball', () => new Build().sphere(0.36, { v: (x, y, z, nx, ny) => mix(0xc88a10, 0xfff0a0, smoothstep(ny * 0.5 + nx * 0.3 + 0.4)) }, {}, 24, 16).geometry()),
    vcol(0.22, { metalness: 0.5 }, 'w4gold'), { p: [0, H, 0] }, true);
  const plate = joint([0, H, 0], mesh(swPlateGeo(sx, sz2), vcol(0.7, {}, 'w4stone'), {}, true));
  plate.children[0].receiveShadow = true;
  root.add(pillar, ball, plate);
  root.userData.pivot = H;
  root.userData.top = H + 0.5;
  const update = (dt, st) => {
    const tl = Array.isArray(st.tilt) ? st.tilt : [0, 0];
    plate.rotation.set(Number(tl[0]) || 0, 0, Number(tl[1]) || 0);
  };
  return makeModel('schwankplattform', root, update);
}

// =============================================================================================
// Roulette-Block (Welt 4)
// =============================================================================================
const RB = { frame: 0xffa21a, frameHi: 0xffd84a, frameLow: 0xc86a10, win: 0x1a2a6a, winHi: 0x2a4aa8, used: 0xa8744a, usedLow: 0x7a5030, bulb: 0xfff6c0 };
function rbBlockGeo(used) {
  return cached(`w4:rb:block:${used}`, () => {
    const b = new Build();
    b.add(roundedBox(1, 1, 1, 0.08, SIDE.ALL, 0, 2), { v: (x, y, z, nx, ny) => {
      if (used) return mix(RB.usedLow, RB.used, smoothstep(ny * 0.5 + 0.5));
      return mix(RB.frameLow, RB.frameHi, smoothstep(ny * 0.5 + 0.5 + y * 0.3));
    } }, { p: [0, 0.5, 0] });
    if (!used) {
      // dunkelblaue Fenster mit goldenem Rahmen je Seite
      for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        b.add(roundedBox(0.7, 0.7, 0.03, 0.03, SIDE.ALL, 0, 1), { v: (x, y) => mix(RB.win, RB.winHi, smoothstep(y + 0.45)) }, placed(new THREE.Vector3(nx * 0.5, 0.5, nz * 0.5), new THREE.Vector3(nx, 0, nz), new THREE.Vector3(1, 1, 1)));
        const g = new THREE.TorusGeometry(0.5, 0.032, 4, 4); g.rotateZ(Math.PI / 4);
        b.add(g, RB.frameHi, placed(new THREE.Vector3(nx * 0.515, 0.5, nz * 0.515), new THREE.Vector3(nx, 0, nz), new THREE.Vector3(1, 1, 1)));
      }
    } else {
      for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (const [u, v] of [[-0.36, -0.36], [0.36, -0.36], [-0.36, 0.36], [0.36, 0.36]]) {
        b.sphere(0.04, RB.usedLow, { p: [nx * 0.5 + nz * u, 0.5 + v, nz * 0.5 - nx * u] }, 8, 6);
      }
    }
    return b.geometry();
  });
}
/** Symbol (Fläche nach +Z, Mitte im Ursprung, ≈0,5 m). */
function iconParts(item) {
  const b = new Build();
  if (item === 'pilz') { // Wachstumsbeere: zwei rote Beeren mit Kernchen und Blättern
    for (const [x, y, r] of [[-0.09, -0.06, 0.15], [0.1, -0.03, 0.13]]) {
      b.sphere(r, { v: (xx, yy, zz, nx, ny) => mix(0xb8102a, 0xff4a5a, smoothstep(ny * 0.6 + 0.5)) }, { p: [x, y, 0], s: [1, 1, 0.55] }, 16, 12);
      for (let k = 0; k < 4; k++) b.sphere(0.014, 0xffe23a, { p: [x + Math.cos(k * 1.7) * r * 0.5, y + Math.sin(k * 1.7) * r * 0.5, r * 0.5], s: [1, 1.4, 0.5] }, 5, 4);
    }
    for (const s of [1, -1]) b.sphere(1, 0x3ac83a, { p: [s * 0.07, 0.15, 0], s: [0.09, 0.04, 0.02], r: [0, 0, s * 0.5] }, 10, 6);
  } else if (item === 'blume') { // Funkenblüte
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + Math.PI / 2;
      b.sphere(1, { v: (x, y) => mix(0xe8281a, 0xff9a2a, smoothstep(Math.hypot(x, y))) }, { p: [Math.cos(a) * 0.12, Math.sin(a) * 0.12 + 0.03, 0], s: [0.09, 0.12, 0.03], r: [0, 0, a - Math.PI / 2] }, 12, 8);
    }
    b.sphere(0.075, 0xffe23a, { p: [0, 0.03, 0.02], s: [1, 1, 0.5] }, 12, 8);
    b.add(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 6), 0x3ac83a, { p: [0, -0.16, 0] });
  } else if (item === 'krallen') { // Krallen-Medaillon
    b.cyl(0.2, 0.2, 0.05, 0xffc21a, { r: [Math.PI / 2, 0, 0] }, 24);
    b.cyl(0.165, 0.165, 0.06, 0xff8a1a, { r: [Math.PI / 2, 0, 0] }, 24);
    b.sphere(1, 0x7a3a1a, { p: [0, -0.035, 0.03], s: [0.075, 0.06, 0.02] }, 12, 8);
    for (let i = 0; i < 4; i++) { const a = Math.PI * (0.2 + i * 0.2); b.sphere(1, 0x7a3a1a, { p: [Math.cos(a) * 0.1, 0.035 + Math.sin(a) * 0.06, 0.03], s: [0.028, 0.034, 0.02] }, 10, 6); }
  } else if (item === 'stern') { // Funkelstern
    b.add(puffyStarGeo(0.21, 0.1, 0.06, 0.03), { v: (x, y) => mix(0xffb40a, 0xfff07a, smoothstep(y * 3 + 0.5)) });
    b.add(puffyStarGeo(0.08, 0.04, 0.04, 0.01), 0xffffff, { p: [0, 0.01, 0.045] });
  } else { // Münze mit ₿
    b.cyl(0.19, 0.19, 0.06, 0xf7931a, { r: [Math.PI / 2, 0, 0] }, 28);
    b.torus(0.17, 0.018, 0xffc06a, { p: [0, 0, 0.032] }, 5, 28);
    const W = 0xfff8ee;
    b.box(0.03, 0.2, 0.02, W, { p: [-0.045, 0, 0.035] }, 0, 1);
    for (const y of [-0.095, 0, 0.095]) b.box(0.07, 0.025, 0.02, W, { p: [-0.015, y, 0.035] }, 0, 1);
    for (const [y, r] of [[0.048, 0.047], [-0.048, 0.052]]) b.torus(r, 0.013, W, { p: [0.02, y, 0.035], r: [0, 0, -Math.PI / 2] }, 4, 10, Math.PI);
    for (const x of [-0.035, 0.005]) for (const y of [0.12, -0.12]) b.box(0.016, 0.04, 0.02, W, { p: [x, y, 0.035] }, 0, 1);
  }
  return b.geometry();
}
const RB_ITEMS = ['pilz', 'blume', 'krallen', 'stern', 'muenze'];
function rbIconGeo(item) {
  return cached(`w4:rb:icon:${item}`, () => {
    const b = new Build();
    const src = iconParts(item);
    for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const g = src.clone();
      g.applyMatrix4(placed(new THREE.Vector3(nx * 0.535, 0.5, nz * 0.535), new THREE.Vector3(nx, 0, nz), new THREE.Vector3(1.15, 1.15, 0.5)));
      b.parts.push(g);
    }
    src.dispose();
    return b.geometry();
  });
}
const RB_BULBS = [];
for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let k = 0; k < 8; k++) {
  const u = -0.42 + (k % 4) * 0.28, top = k < 4;
  RB_BULBS.push([nx * 0.505 + nz * u, top ? 0.93 : 0.07, nz * 0.505 - nx * u]);
}
function buildRouletteW4() {
  const root = new THREE.Group();
  const jump = joint();
  const block = mesh(rbBlockGeo(false), vcol(0.3), {}, true);
  const icon = mesh(rbIconGeo('pilz'), vcol(0.3, { emissive: 0x202020 }, 'w4icon'));
  const bulbs = instMesh(cached('w4:rb:bulb', () => new THREE.SphereGeometry(0.035, 8, 6)), basic('w4:rbBulb', { color: 0xffffff }), RB_BULBS.length, 1.2, 0.5);
  bulbs.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(RB_BULBS.length * 3), 3);
  RB_BULBS.forEach((p, i) => setInst(bulbs, i, p[0], p[1], p[2]));
  jump.add(block, icon, bulbs);
  root.add(jump);
  const clk = new Clock();
  let shown = 'pilz', usedShown = false, pop = 1;
  const on = col(RB.bulb), off = col(0x6a4a2a), dim = col(0xc8a060);
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    const age = trigger(clk, st, ['bump']);
    const used = anim === 'used';
    if (used !== usedShown) { usedShown = used; block.geometry = rbBlockGeo(used); }
    const item = RB_ITEMS.includes(st.item) ? st.item : 'pilz';
    if (item !== shown) { shown = item; icon.geometry = rbIconGeo(item); pop = 0.6; }
    pop = damp(pop, 1, 14, dt);
    icon.visible = !used;
    icon.scale.set(1, pop, 1); icon.position.y = 0.5 * (1 - pop);
    let y = 0, sy = 1;
    if (anim === 'bump' && age < 0.25) { const k = age / 0.25; y = Math.sin(k * Math.PI) * 0.3; sy = 1 + Math.sin(k * Math.PI) * 0.08; }
    jump.position.y = y; jump.scale.set(1, sy, 1);
    const chase = Math.floor(t * 10);
    for (let i = 0; i < RB_BULBS.length; i++) bulbs.setColorAt(i, used ? off : ((i + chase) % 4 === 0 ? on : dim));
    bulbs.instanceColor.needsUpdate = true;
  };
  return makeModel('roulette_block_w4', root, update, [bulbs]);
}

// =============================================================================================
// Sternring und Sternmünze
// =============================================================================================
const SR = { star: 0x3ae87a, starLow: 0x0fa050, starHi: 0xc8ffd8, halo: 0xd8fff0, gem: 0xffd21f };
const SR_N = 12, SR_R = 1.1, SR_Y = 1.15;
const srStarGeo = () => cached('w4:sr:star', () => new Build().add(puffyStarGeo(0.22, 0.1, 0.1, 0.05), { v: (x, y, z) => mix(SR.starLow, SR.starHi, smoothstep(Math.abs(z) * 6 - 0.2 + y * 1.5)) }).geometry());
function buildSternring() {
  const root = new THREE.Group();
  const ring = joint([0, SR_Y, 0]);
  const stars = instMesh(srStarGeo(), vcol(0.3, { emissive: 0x0a4a20 }, 'w4srStar'), SR_N, 1.6, 0);
  stars.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(SR_N * 3), 3);
  const halo = mesh(cached('w4:sr:halo', () => new Build().torus(SR_R, 0.07, SR.halo, { r: [0, Math.PI / 2, 0] }, 8, 64).geometry()), basic('w4:srHalo', { color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.85 }));
  const spark = sparkleSprite(0xc8ffe0, 0.9);
  ring.add(stars, halo, spark);
  root.add(ring);
  const clk = new Clock();
  const bright = col(0xffffff), dark = col(0x3a5a48);
  let sc = 1;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    const active = anim === 'active', done = anim === 'done';
    const lit = active ? Math.ceil(clamp(st.progress ?? 1, 0, 1) * SR_N) : SR_N;
    const turn = t * (active ? 1.2 : 0.35);
    for (let i = 0; i < SR_N; i++) {
      const a = (i / SR_N) * TAU + turn;
      _q.setFromEuler(_e.set(Math.PI / 2 - a + Math.sin(t * 2 + i) * 0.2, Math.PI / 2, 0, 'XYZ'));
      const pulse = 1 + Math.sin(t * 4 + i * 0.8) * 0.06;
      stars.setMatrixAt(i, _m.compose(_v.set(0, Math.sin(a) * SR_R, Math.cos(a) * SR_R), _q, _s.setScalar(pulse)));
      stars.setColorAt(i, i < lit ? bright : dark);
    }
    stars.instanceMatrix.needsUpdate = true; stars.instanceColor.needsUpdate = true;
    sc = done ? Math.max(0.001, 1 - smoothstep(age / 0.4)) : damp(sc, 1, 8, dt);
    ring.scale.setScalar(sc);
    ring.visible = sc > 0.002;
    spark.material.rotation = t * 0.8;
    spark.scale.setScalar((0.7 + Math.sin(t * 5) * 0.15) * (active ? 1.4 : 1));
  };
  return makeModel('sternring', root, update, [stars]);
}
function smGeo() {
  return cached('w4:sm:body', () => new Build().add(puffyStarGeo(0.37, 0.19, 0.1, 0.06), { v: (x, y, z) => mix(0x10a050, 0x9affc0, smoothstep(y * 1.4 + 0.45 + Math.abs(z) * 2)) }).geometry());
}
function smInnerGeo() {
  return cached('w4:sm:inner', () => {
    const b = new Build();
    // weiße Innensterne mit Goldperle (beidseitig)
    for (const s of [1, -1]) {
      b.add(puffyStarGeo(0.17, 0.085, 0.015, 0.008), 0xffffff, { p: [0, 0, s * 0.112], r: [0, s > 0 ? 0 : Math.PI, 0] });
      b.sphere(0.05, 0xffd21f, { p: [0, 0, s * 0.125], s: [1, 1, 0.5] }, 12, 8);
    }
    return b.geometry();
  });
}
function buildSternmuenze() {
  const root = new THREE.Group();
  const spin = joint([0, 0.45, 0]);
  const bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.12, metalness: 0.05, emissive: 0x0a5a2a, transparent: true, opacity: 0.92 });
  const innerMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 1 });
  const body = mesh(smGeo(), bodyMat, {}, true);
  const inner = mesh(smInnerGeo(), innerMat);
  const halo = glowSprite(0x7affb0, 1.1, 0.45);
  spin.add(body, inner, halo);
  root.add(spin);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    let y = 0.45 + Math.sin(t * 2.6) * 0.05, sc = 1, rate = 2.2;
    if (anim === 'collected') { const k = Math.min(1, age / 0.35); y += Math.sin(k * Math.PI * 0.6) * 1.0; sc = Math.max(0.001, 1 - k * k); rate = 14; }
    spin.position.y = y;
    spin.rotation.y = t * rate;
    spin.scale.setScalar(sc);
    spin.visible = sc > 0.002;
    const ghost = anim === 'ghost';
    bodyMat.opacity = ghost ? 0.3 : 0.92; bodyMat.depthWrite = !ghost;
    innerMat.opacity = ghost ? 0.35 : 1;
    halo.visible = !ghost;
  };
  return makeModel('sternmuenze', root, update, [bodyMat, innerMat]);
}

// =============================================================================================
// Giftwasser
// =============================================================================================
function giftTexture() {
  return canvasTexture('w4:gift', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#7a2ad0'; ctx.fillRect(0, 0, w, h);
    // weiche Schlieren (wiederholbar: alles mit Rand-Kopien zeichnen)
    const blob = (x, y, r, c) => {
      for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) {
        const g = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
        g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, TAU); ctx.fill();
      }
    };
    for (let i = 0; i < 26; i++) blob(hash1(i) * w, hash1(i + 50) * h, 20 + hash1(i + 9) * 45, i % 3 ? 'rgba(170,80,255,0.55)' : 'rgba(60,10,120,0.6)');
    for (let i = 0; i < 14; i++) blob(hash1(i + 200) * w, hash1(i + 300) * h, 8 + hash1(i + 400) * 14, 'rgba(210,150,255,0.7)');
    // giftgrüne Schaumfäden
    ctx.strokeStyle = 'rgba(190,255,90,0.55)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const x = hash1(i + 600) * w, y = hash1(i + 700) * h, r = 12 + hash1(i + 800) * 22;
      for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) { ctx.beginPath(); ctx.arc(x + dx, y + dy, r, hash1(i) * TAU, hash1(i) * TAU + 2.2); ctx.stroke(); }
    }
  }, { repeat: true });
}
function sheenTexture() {
  return canvasTexture('w4:giftSheen', 256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,230,255,0.75)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let i = 0; i < 22; i++) {
      const x = hash1(i + 30) * w, y = hash1(i + 60) * h, l = 10 + hash1(i + 90) * 30;
      for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) { ctx.beginPath(); ctx.moveTo(x + dx, y + dy); ctx.quadraticCurveTo(x + dx + l / 2, y + dy - 6, x + dx + l, y + dy); ctx.stroke(); }
    }
  }, { repeat: true });
}
function giftPlaneGeo(sx, sz, tile) {
  return cached(`w4:gift:plane:${sx}:${sz}:${tile}`, () => {
    const g = new THREE.PlaneGeometry(sx, sz, 1, 1);
    g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx / tile, uv.getY(i) * sz / tile);
    return g;
  });
}
const bubbleGeo = () => cached('w4:gift:bubble', () => new Build().dome(1, { v: (x, y, z, nx, ny) => mix(0xb86aff, 0xf4e0ff, smoothstep(ny)) }, {}, Math.PI / 2, 14, 6).geometry());
function buildGiftwasser(opts = {}) {
  const size = Array.isArray(opts.size) ? opts.size : [8, 8];
  const sx = clamp(Math.round(size[0] * 2) / 2, 0.5, 200), sz = clamp(Math.round((size[1] ?? size[0]) * 2) / 2, 0.5, 200);
  const root = new THREE.Group();
  const water = mesh(giftPlaneGeo(sx, sz, 3), std('w4:gift', { map: giftTexture(), color: 0xffffff, emissive: 0x3a0a6a, emissiveIntensity: 0.55, roughness: 0.12, metalness: 0.05 }));
  water.receiveShadow = true;
  const sheen = mesh(giftPlaneGeo(sx, sz, 2.2), basic('w4:giftSheen', { map: sheenTexture(), transparent: true, opacity: 0.55, depthWrite: false }), { p: [0, 0.012, 0] });
  sheen.renderOrder = 2;
  const nb = clamp(Math.round(opts.bubbles ?? Math.min(24, (sx * sz) / 3)), 0, 48);
  const bubbles = instMesh(bubbleGeo(), vcol(0.15, { emissive: 0x3a0a5a }, 'w4bubble'), Math.max(1, nb), Math.hypot(sx, sz) / 2 + 1, 0);
  for (let i = 0; i < Math.max(1, nb); i++) bubbles.setMatrixAt(i, ZERO);
  root.add(water, sheen, bubbles);
  const items = Array.from({ length: nb }, (_, i) => ({ x: (hash1(i * 3 + 1) - 0.5) * sx * 0.92, z: (hash1(i * 3 + 2) - 0.5) * sz * 0.92, t: hash1(i * 7) * 2, life: 1.2 + hash1(i * 5) * 1.4, r: 0.08 + hash1(i * 11) * 0.12 }));
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const now = performance.now() / 1000;
    const fl = Array.isArray(st.flow) ? st.flow : [0.05, 0.03];
    // geteilte Texturen: Versatz aus der absoluten Zeit (gleich für alle Giftwasser, unabhängig von der Anzahl)
    const tm = water.material.map, ts = sheen.material.map;
    tm.offset.set((now * fl[0]) / 3 % 1, (-now * fl[1]) / 3 % 1);
    ts.offset.set((now * fl[0] * 1.6) / 2.2 % 1, (-now * fl[1] * 0.4 + Math.sin(now * 0.3) * 0.05) / 2.2 % 1);
    for (let i = 0; i < nb; i++) {
      const b = items[i];
      b.t += dt;
      if (b.t > b.life) { b.t = 0; b.x = (Math.random() - 0.5) * sx * 0.92; b.z = (Math.random() - 0.5) * sz * 0.92; b.life = 1.2 + Math.random() * 1.4; }
      const k = b.t / b.life;
      // wächst als Halbkugel aus der Oberfläche, platzt am Ende (kurz größer, dann weg)
      const r = b.r * (k < 0.85 ? smoothstep(k / 0.85) : 1 + (k - 0.85) * 3) * (k > 0.97 ? 0 : 1);
      if (r < 0.005) { bubbles.setMatrixAt(i, ZERO); continue; }
      bubbles.setMatrixAt(i, _m.compose(_v.set(b.x, 0.0, b.z), _q.identity(), _s.set(r, r * 0.8, r)));
    }
    bubbles.instanceMatrix.needsUpdate = true;
  };
  return makeModel('giftwasser', root, update, [bubbles]);
}

export const MODELS = {
  piep_block: buildPiep,
  riesentrampolin: buildRiesentrampolin,
  trampolin_orange: buildTrampolinOrange,
  stachelstange: buildStachelstange,
  schwankplattform: buildSchwankplattform,
  roulette_block_w4: buildRouletteW4,
  sternring: buildSternring,
  sternmuenze: buildSternmuenze,
  giftwasser: buildGiftwasser,
};
