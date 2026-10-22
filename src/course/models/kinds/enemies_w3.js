// Gegner-Modelle Welt 3 „Schnee und Eis“ (Kurs-Modus). Eigene Gestaltung, keine Nachbauten fremder Figuren.
// Maßstab Meter, Ursprung = Fußpunkt (Ausnahmen genannt), Blick nach +X. Alle: { root, update(dt, state), dispose() };
// state darf ein String sein ('walk' ≙ { anim: 'walk' }). Unbekannte anim → wie 'idle'.
//
// schneesaeule      Schnee-Kaktussäule: Schneeball-Segmente mit Eisstacheln, oben ein Kopf mit Zweig-Brauen,
//   Frostwangen und Eiskristall-Krone. Je Segment 0,45 m; 4 Segmente ≈ 2,1 m.
//   opts  { segments: 3–5 (Standard 4, Kopf mitgezählt) }
//   state { anim: 'walk'|'idle'|'hit'|'defeated', speed (m/s, Wackeltempo; walk Standard 1,2),
//           segments (übrige Segmente inkl. Kopf, 1..opts.segments; entfernte ploppen weg, der Kopf sinkt nach) }
//         hit: Säule staucht, Augen zu (0,4 s); defeated: Segmente fliegen auseinander und verschwinden (1,2 s).
//   root.userData.height(segments) → Höhe der Kopfoberkante (ohne Krone) in m.
// pilzling_eis      Eisläufer-Pilzling ≈0,95 m: Pilzling mit beschneitem Hut, rosa Ohrenschützern, Frostwangen,
//   Schlittschuhen (Ursprung = Kufen-Unterkante).
//   state { anim: 'skate'|'walk'|'idle'|'alert'|'spin'|'squashed'|'stunned', speed (m/s; skate Standard 2,5) }
//         skate/walk: Gleitschritte mit seitlichem Abstoßen; spin: Pirouette; alert: Hüpfer + „!“.
// pilzling_reifen   Reifen-Pilzling ≈0,6 m über Wasser: Pilzling im rot-weißen Schwimmreifen, Taucherbrille auf
//   dem Hut. **Ursprung = Wasserlinie** (Reifenmitte), der Stiel reicht 0,3 m unter Wasser.
//   state { anim: 'float'|'paddle'|'squashed'|'stunned', speed }  paddle: schaukelt vorwärts, Bugwelle.
// spuk              Spukgeist ≈0,95 m (Zwiebelform, Flammenlocke oben, Ringelschwanz, Grinsen mit einem Zahn).
//   Ursprung = Unterkante des Körpers (Schwebehöhe setzt der Motor).
//   opts  { size: Faktor (Standard 1; Großspuk ≈ 2,5) }
//   state { anim: 'chase'|'shy'|'fade'|'idle'|'hit'|'defeated' }
//         chase: lehnt sich vor, Zunge raus; shy: Händchen vor den Augen, errötet, halb durchsichtig;
//         fade: fast unsichtbar, flimmert; hit: zuckt + blitzt (0,4 s); defeated: dreht sich weg, Funkeln (0,6 s).
// kreisgeist        Kreisgeist ≈0,85 m: mintfarbener Laken-Geist mit Wellensaum und Zipfelmütze, Augen
//   geschlossen (lächelnd). Ursprung = Saum.  state { anim: 'circle'|'peek'|'defeated' }  peek: Augen auf.
// kreisgeist_kreis  ganzer Kreis Kreisgeister als Instanzen (3 Zeichenaufrufe), Mitte im Ursprung, Gesichter nach außen.
//   opts  { count (8), radius (3) }
//   state { anim: 'circle'|'peek', angle (rad, Drehung des Kreises), alive (Array bool oder Bitmaske; Standard alle) }
// funkenlaeufer     Funkenläufer Ø ≈0,5 m: leuchtende Elektrokugel mit zuckendem Zacken-Kranz und Knopfaugen.
//   Mitte bei y = 0,3.  state { anim: 'run'|'idle', speed }  run: rollt/zittert, Funkenschweif nach −X.
// funkenkaefer      Funkenkäfer ≈0,55 m: dunkelblauer Käfer mit Glühbirnen-Hinterleib und Blitz-Fühlern, fliegt.
//   state { anim: 'fly'|'charge'|'squashed' }  charge: Birne blitzt grell, Fühler knistern.
// huepfqualle       Hüpfqualle ≈0,85 m: rosa Glocke mit Punkten, vier Bandfüßchen, große Augen.
//   state { anim: 'idle'|'hop'|'squashed', progress? (0..1 im Hüpfzyklus 0,7 s, sonst Zeit) }
//         hop: ducken – strecken – fliegen (Motor bewegt root, Modell zeigt Haltung + 0,5 m Bogen) – landen.

import {
  THREE, TAU, Build, cached, vcol, basic, std, mesh, joint, eyes, dizzyStars, alertMark, makeModel, Clock, Blinker,
  damp, clamp, wave, col, mix, onLathe, decals, instMesh, setInst, smoothstep, glowSprite, sparkleSprite, smoothProfile,
  smoothNormals,
} from '../lib/kit.js';
import {
  alongY, onEll, stick, snowV, PZ3, pilzStem3, pilzCap3, pilzEyes3, CAP3_PTS, PILZ3, fadeMats, setOpacity, Puffs,
} from '../lib/kit_w3.js';

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();

// =============================================================================================
// Schneesäule
// =============================================================================================
const SN = { ice: 0x9ff0ff, iceDeep: 0x3aa8e8, twig: 0x6e4226, mouth: 0x3a1f4a, cheek: 0xffa3c2, tooth: 0xffffff, crystal: 0x7fe8ff };
const SEG_R = 0.29, SEG_SY = 0.86, SEG_STEP = 0.45, HEAD_R = 0.34;
const segY = (i) => SEG_R * SEG_SY + i * SEG_STEP;

function iceSpike(b, p, d, len = 0.2, r = 0.065) {
  b.add(new THREE.ConeGeometry(r, len, 7), { v: (x, y) => mix(SN.iceDeep, SN.ice, (y + len / 2) / len) }, alongY(p, d, len));
}
function saeuleSegGeo() {
  return cached('w3:saeule:seg', () => {
    const b = new Build();
    b.sphere(SEG_R, snowV(0xb8d0ee), { s: [1, SEG_SY, 1] }, 24, 14);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + 0.3;
      const d = new THREE.Vector3(Math.cos(a), 0.3, Math.sin(a)).normalize();
      const p = d.clone().multiplyScalar(SEG_R * 0.9); p.y *= SEG_SY;
      iceSpike(b, p, d, 0.19, 0.06);
    }
    // ein Frostring (blaue Schneegrenze) gibt den Segmenten Form
    b.torus(SEG_R * 0.98, 0.022, 0xd8e8fa, { p: [0, -0.06, 0], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.9] }, 6, 28);
    return b.geometry();
  });
}
function saeuleHeadGeo() {
  return cached('w3:saeule:head', () => {
    const b = new Build();
    const R = [HEAD_R, HEAD_R * 0.95, HEAD_R];
    b.sphere(HEAD_R, snowV(0xbcd2ee), { s: [1, 0.95, 1] }, 28, 20);
    for (const a of [1.35, 2.25, Math.PI, -2.25, -1.35]) {
      const d = new THREE.Vector3(Math.cos(a), 0.15, Math.sin(a)).normalize();
      iceSpike(b, d.clone().multiplyScalar(HEAD_R * 0.9), d, 0.2, 0.065);
    }
    // Mund: breites, offenes Grinsen mit Zähnchen
    stick(b, onEll([0, 0, 0], R, 0, -0.42), SN.mouth, [0.13, 0.065, 0.045], 0.5);
    b.box(0.035, 0.03, 0.03, SN.tooth, { p: [HEAD_R * 0.9, -0.105, 0.03], r: [0, 0.2, 0] }, 0.008, 1);
    // Frostwangen
    for (const s of [1, -1]) stick(b, onEll([0, 0, 0], R, s * 0.72, -0.2), SN.cheek, [0.06, 0.04, 0.02], 0.3);
    // Zweig-Brauen (grimmig-verschmitzt)
    for (const s of [1, -1]) {
      b.capsule(0.022, 0.11, SN.twig, { p: [HEAD_R * 0.86, 0.17, s * 0.1], r: [Math.PI / 2 - s * 0.35, -s * 0.5, 0], order: 'YXZ' }, 3, 6);
      b.cone(0.012, 0.05, SN.twig, { p: [HEAD_R * 0.8, 0.21, s * 0.17], r: [s * -0.7, 0, 0] }, 5);
    }
    // Eiskristall-Krone: drei Kristalle + kleiner Mittelkristall
    const cry = (x, z, h, tilt, az) => {
      const g = new THREE.OctahedronGeometry(1, 0);
      g.scale(0.07, h, 0.07);
      b.add(g, { v: (x2, y) => mix(0x3fb0f0, 0xe8fdff, smoothstep(y * 0.5 + 0.5)) }, { p: [x, HEAD_R * 0.86 + h * 0.75, z], r: [Math.sin(az) * tilt, 0, -Math.cos(az) * tilt] });
    };
    cry(0, 0, 0.17, 0, 0);
    cry(-0.07, 0.09, 0.12, 0.45, Math.PI / 2 + 0.6);
    cry(-0.07, -0.09, 0.12, 0.45, -Math.PI / 2 - 0.6);
    cry(-0.12, 0, 0.1, 0.45, Math.PI);
    return b.geometry();
  });
}

function buildSchneesaeule(opts = {}) {
  const n = clamp(Math.round(opts.segments ?? 4), 3, 5);
  const root = new THREE.Group();
  const H = segY(n - 1) + HEAD_R + 0.3;
  const segs = instMesh(saeuleSegGeo(), vcol(0.38, {}, 'w3snow'), n - 1, H * 0.8, H / 2);
  segs.castShadow = true;
  const head = joint([0, segY(n - 1), 0]);
  const headMesh = mesh(saeuleHeadGeo(), vcol(0.38, {}, 'w3snow'), {}, true);
  const eye = eyes([{ p: [0.27, 0.06, 0.105], r: 0.085, sy: 1.3, dir: [1, 0.12, 0.42] }, { p: [0.27, 0.06, -0.105], r: 0.085, sy: 1.3, dir: [1, 0.12, -0.42] }],
    { key: 'w3:saeule', iris: 0x2a7ad8, pupil: 0.56, depth: 0.5 });
  head.add(headMesh, eye);
  root.add(segs, head);
  root.userData.height = (k = n) => segY(clamp(k, 1, n) - 1) + HEAD_R * 0.95;

  const clk = new Clock(), blink = new Blinker();
  const pop = Array.from({ length: n - 1 }, () => 1);
  const fly = Array.from({ length: n }, (_, i) => ({ dx: Math.cos(i * 2.4) * (1.2 + i * 0.2), dz: Math.sin(i * 2.4) * 1.3, vy: 2.5 + (i % 2) * 1.5, spin: (i % 2 ? 1 : -1) * (4 + i) }));
  let phase = Math.random() * TAU, amp = 0, headY = segY(n - 1), sq = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    const left = clamp(Math.round(st.segments ?? n), 1, n);
    const walking = anim === 'walk';
    const speed = walking ? (st.speed ?? 1.2) : 0;
    if (walking) phase += dt * (3.2 + speed * 2.2);
    else phase += dt * 1.2;
    amp = damp(amp, walking ? 1 : 0.3, 4, dt);
    const dead = anim === 'defeated';
    const hit = anim === 'hit' && age < 0.4;
    sq = damp(sq, hit ? 1 : 0, hit ? 30 : 8, dt);
    headY = damp(headY, segY(left - 1), 9, dt);
    for (let i = 0; i < n - 1; i++) {
      const on = i < left - 1;
      pop[i] = damp(pop[i], on ? 1 : 0, on ? 10 : 22, dt);
      if (dead) {
        const f = fly[i], a = Math.min(age, 1.3);
        const sc = Math.max(0.001, 1 - smoothstep((age - 0.8) / 0.4)) * pop[i];
        _q.setFromEuler(_e.set(f.spin * a * 0.5, 0, f.spin * a));
        segs.setMatrixAt(i, _m.compose(_v.set(f.dx * a, Math.max(SEG_R * 0.6, segY(i) + f.vy * a - 6 * a * a), f.dz * a), _q, _s.setScalar(sc)));
        continue;
      }
      // Welle läuft nach oben, untere Segmente wackeln weniger
      const k = amp * (0.25 + i * 0.3);
      const ph = phase - i * 0.75;
      const ox = Math.sin(ph) * 0.05 * k, oz = Math.cos(ph * 0.5) * 0.04 * k;
      const yy = i * SEG_STEP * (1 - sq * 0.2) + SEG_R * SEG_SY + (walking && i === 0 ? Math.abs(Math.sin(phase)) * 0.03 : 0);
      _q.setFromEuler(_e.set(Math.cos(ph * 0.5) * 0.12 * k, i * 1.3, -Math.sin(ph) * 0.14 * k));
      const sc = Math.max(0.001, pop[i]);
      segs.setMatrixAt(i, pop[i] < 0.02 ? ZERO : _m.compose(_v.set(ox, yy, oz), _q, _s.set(sc * (1 + sq * 0.15), sc * (1 - sq * 0.15), sc * (1 + sq * 0.15))));
    }
    segs.instanceMatrix.needsUpdate = true;
    if (dead) {
      const f = fly[n - 1], a = Math.min(age, 1.3);
      head.position.set(f.dx * a * 0.6, Math.max(HEAD_R, headY + f.vy * a - 6 * a * a), f.dz * a * 0.6);
      head.rotation.set(0, 0, f.spin * a * 0.6);
      head.scale.setScalar(Math.max(0.001, 1 - smoothstep((age - 0.8) / 0.4)));
      eye.userData.blink(0.1);
      return;
    }
    head.scale.setScalar(1);
    const kh = amp * (0.25 + (left - 1) * 0.3);
    const ph = phase - (left - 1) * 0.75;
    head.position.set(Math.sin(ph) * 0.06 * kh, headY * (1 - sq * 0.2), Math.cos(ph * 0.5) * 0.05 * kh);
    let ry = 0;
    if (anim === 'idle') ry = Math.sin(t * 0.7) * 0.4 * clamp(Math.sin(t * 0.23) * 3, -1, 1);
    head.rotation.set(Math.cos(ph * 0.5) * 0.1 * kh + (hit ? Math.sin(t * 40) * 0.1 : 0), damp(head.rotation.y, ry, 4, dt), -Math.sin(ph) * 0.12 * kh);
    let bk = blink.update(dt);
    if (hit) bk = 0.1;
    eye.userData.blink(bk);
  };
  return makeModel('schneesaeule', root, update, [segs], { initial: 'idle' });
}

// =============================================================================================
// Eisläufer-Pilzling
// =============================================================================================
const SK = { boot: 0x4aa8ff, cuff: 0xffffff, lace: 0xffffff, blade: 0xe8eef8, muff: 0xff8fb8, band: 0xffffff, snow: 0xffffff, cheek: 0xff9cb8 };
const BLADE_H = 0.075;
function eisBodyGeo() {
  return cached('w3:pilzEis:body', () => {
    const b = new Build();
    pilzStem3(b, 0, SK.cheek);
    pilzCap3(b, 0, true, (cb) => {
      // Schneehaube auf dem Hut mit Tropfkante
      // (Profil von außen nach innen → Normalen zeigen nach außen)
      const snowPts = [[0.375, 0.25], [0.37, 0.285], [0.335, 0.33], [0.27, 0.375], [0.17, 0.41], [0.07, 0.428], [0, 0.432]];
      cb.lathe(snowPts, { v: (x, y, z, nx, ny) => mix(0xcfe2ff, 0xffffff, smoothstep(ny * 1.2)) }, null, 32, 2);
      for (let i = 0; i < 11; i++) {
        const a = (i / 11) * TAU + 0.2;
        cb.sphere(0.05 + (i % 3) * 0.012, { v: (x, y, z, nx, ny) => mix(0xcfe2ff, 0xffffff, smoothstep(ny + 0.4)) }, { p: [Math.cos(a) * 0.36, 0.25 - (i % 2) * 0.035, Math.sin(a) * 0.36], s: [1, 1.35, 1] }, 10, 8);
      }
      // Ohrenschützer: Bügel über den Hut, rosa Puschel an den Seiten
      cb.torus(0.41, 0.024, SK.band, { p: [-0.02, 0.2, 0], r: [0, Math.PI / 2, 0], s: [1, 0.56, 1] }, 6, 24, Math.PI);
      for (const s of [1, -1]) cb.sphere(0.1, SK.muff, { p: [-0.02, 0.17, s * 0.41], s: [0.9, 1, 0.75] }, 14, 10);
    });
    return b.geometry();
  });
}
function skateGeo() {
  return cached('w3:skate', () => {
    const b = new Build();
    b.sphere(1, SK.boot, { p: [0.03, 0.1, 0], s: [0.155, 0.09, 0.105] }, 14, 10);
    b.cyl(0.08, 0.09, 0.1, SK.boot, { p: [-0.03, 0.175, 0] }, 12);
    b.torus(0.08, 0.03, SK.cuff, { p: [-0.03, 0.225, 0], r: [Math.PI / 2, 0, 0] }, 6, 14);
    for (let i = 0; i < 3; i++) b.box(0.012, 0.012, 0.11, SK.lace, { p: [0.07 + i * -0.035, 0.155 - i * 0.012, 0], r: [0, 0, 0.5] }, 0, 1);
    // Kufe mit Stützen und eingerollter Spitze
    b.box(0.34, 0.022, 0.026, SK.blade, { p: [0.02, 0.013, 0] }, 0.007, 1);
    for (const x of [-0.07, 0.09]) b.box(0.02, 0.05, 0.02, SK.blade, { p: [x, 0.04, 0] }, 0.005, 1);
    b.torus(0.032, 0.011, SK.blade, { p: [0.19, 0.037, 0], r: [0, 0, -0.6] }, 5, 12, Math.PI * 1.3);
    return b.geometry();
  });
}
function buildPilzlingEis() {
  const root = new THREE.Group();
  const pose = joint([0, BLADE_H, 0]);
  const body = joint();
  const bodyM = mesh(eisBodyGeo(), vcol(0.4), {}, true);
  const eye = eyes(pilzEyes3(0), { key: 'w3:pilz', iris: 0x2a5ab8, pupil: 0.55, depth: 0.5 });
  body.add(bodyM, eye);
  const bladeMat = vcol(0.25, { metalness: 0.2 }, 'skate');
  const feet = [1, -1].map((s) => joint([0.02, -BLADE_H + 0.0, s * 0.12], mesh(skateGeo(), bladeMat, {}, true)));
  const dizzy = dizzyStars(0.3, 0.075); dizzy.position.y = 1.0;
  const alert = alertMark(1.1); alert.position.set(0.05, 1.02, 0);
  pose.add(body, ...feet, dizzy, alert);
  root.add(pose);
  const clk = new Clock(), blink = new Blinker();
  let phase = Math.random() * TAU, sq = 0, roll = 0, spinA = 0;
  const update = (dt, st) => {
    let anim = st.anim ?? 'idle';
    if (anim === 'walk') anim = 'skate';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    const skating = anim === 'skate';
    const speed = skating ? (st.speed ?? 2.5) : 0;
    if (skating) phase += dt * (2.6 + speed * 0.9);
    const flat = anim === 'squashed';
    sq = damp(sq, flat ? 1 : 0, flat ? 28 : 10, dt);
    let hop = 0;
    if (anim === 'alert') hop = Math.sin(clamp(age / 0.38, 0, 1) * Math.PI) * 0.3;
    pose.scale.set(1 + sq * 0.38, 1 - sq * 0.78, 1 + sq * 0.38);
    pose.position.y = BLADE_H * (1 - sq) + hop;
    const sw = Math.sin(phase);
    roll = damp(roll, skating ? sw * 0.16 : anim === 'stunned' ? Math.sin(t * 5.5) * 0.14 : Math.sin(t * 1.3) * 0.03, 8, dt);
    if (anim === 'spin') spinA += dt * clamp(age * 30, 0, 14); else spinA = damp(spinA, Math.round(spinA / TAU) * TAU, 6, dt);
    body.rotation.set(roll, spinA, damp(body.rotation.z, skating ? -0.16 : anim === 'spin' ? 0.05 : 0, 8, dt));
    body.position.z = skating ? -sw * 0.04 : 0;
    feet.forEach((f, i) => {
      const s = i ? -1 : 1;
      let x = 0.02, y = 0, z = s * 0.12, ry = 0, rz = 0;
      if (skating) {
        // abwechselnd schräg nach außen-hinten abstoßen, dann anheben und vorziehen
        const ph = phase + (i ? Math.PI : 0);
        const push = Math.max(0, Math.sin(ph));
        x = 0.04 - push * 0.16; z = s * (0.11 + push * 0.13); ry = -s * push * 0.45;
        y = Math.max(0, -Math.sin(ph)) * 0.05; rz = push * 0.25;
      }
      if (anim === 'spin') { z = s * 0.07; y = i ? 0.12 : 0; x = i ? -0.04 : 0.02; }
      if (flat) { y = 0.0; }
      f.position.set(damp(f.position.x, x, 25, dt), damp(f.position.y, -BLADE_H + y, 25, dt), damp(f.position.z, z, 25, dt));
      f.rotation.set(0, damp(f.rotation.y, ry + (anim === 'spin' ? spinA : 0), 25, dt), damp(f.rotation.z, rz, 20, dt));
    });
    let k = blink.update(dt, !flat);
    if (flat) k = 0.12; else if (anim === 'stunned') k = 0.45 + Math.sin(t * 9) * 0.1;
    eye.userData.blink(k);
    eye.scale.x = eye.scale.z = damp(eye.scale.x, anim === 'alert' ? 1.15 : 1, 18, dt);
    dizzy.visible = anim === 'stunned';
    if (dizzy.visible) dizzy.rotation.y = t * 4;
    alert.visible = anim === 'alert' && age < 1.2;
    if (alert.visible) alert.scale.setScalar(Math.min(1, age / 0.12) * (1 + Math.max(0, 0.3 - age) * 1.2));
  };
  return makeModel('pilzling_eis', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Reifen-Pilzling (Ursprung = Wasserlinie)
// =============================================================================================
const RF = { red: 0xff3a3a, white: 0xfff8f0, goggle: 0x3fd0ff, rim: 0xffb21a, strap: 0x2a3a6a };
const RF_Y0 = -0.12;
function reifenBodyGeo() {
  return cached('w3:pilzReifen:body', () => {
    const b = new Build();
    pilzStem3(b, RF_Y0, 0);
    pilzCap3(b, RF_Y0, true, (cb) => {
      // Taucherbrille auf der Hutkrempe (Gläser vorn, Band ringsum)
      cb.torus(0.434, 0.018, RF.strap, { p: [0, 0.12, 0], r: [Math.PI / 2, 0, 0] }, 6, 36);
      for (const s of [1, -1]) {
        const h = onLathe(CAP3_PTS, 0.08, s * 0.33, 0.35);
        if (!h) continue;
        const g = new THREE.CylinderGeometry(1, 1, 1, 18); g.rotateX(Math.PI / 2);
        stick(cb, h, RF.rim, [0.085, 0.07, 0.05], 0.3, g);
        stick(cb, { p: h.p.clone().addScaledVector(h.n, 0.022), n: h.n }, { v: (x, y) => mix(0x1a8ad8, 0xbff4ff, smoothstep(y * 0.5 + 0.6)) }, [0.066, 0.054, 0.02], 0.2);
      }
    });
    // Schwimmreifen in der Wasserlinie: rote und weiße Viertel
    b.add(new THREE.TorusGeometry(0.38, 0.13, 14, 36), (x, y) => (Math.floor((Math.atan2(y, x) / TAU) * 8 + 8) % 2 ? RF.red : RF.white), { r: [Math.PI / 2, 0, 0.2] });
    return b.geometry();
  });
}
function buildPilzlingReifen() {
  const root = new THREE.Group();
  const bob = joint();
  const bodyM = mesh(reifenBodyGeo(), vcol(0.35), {}, true);
  const eye = eyes(pilzEyes3(RF_Y0), { key: 'w3:pilzReifen', iris: 0x6a3a1c, pupil: 0.55, depth: 0.5 });
  const dizzy = dizzyStars(0.3, 0.075); dizzy.position.y = 0.85;
  const wake = mesh(cached('w3:wake', () => {
    const g = new THREE.RingGeometry(0.5, 0.72, 32, 1); g.rotateX(-Math.PI / 2); return g;
  }), std('w3:wake', { color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }), { p: [0, 0.01, 0] });
  bob.add(bodyM, eye, dizzy);
  root.add(bob, wake);
  const clk = new Clock(), blink = new Blinker();
  let sq = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'float';
    clk.tick(dt, anim);
    const t = clk.t;
    const pad = anim === 'paddle';
    const flat = anim === 'squashed';
    sq = damp(sq, flat ? 1 : 0, flat ? 25 : 8, dt);
    const f = pad ? 3.2 + (st.speed ?? 1.5) : 1.4;
    bob.position.y = Math.sin(t * f) * 0.035 - sq * 0.1;
    bob.rotation.set(Math.sin(t * f * 0.5) * 0.06 + (anim === 'stunned' ? Math.sin(t * 6) * 0.12 : 0), 0, pad ? -0.12 + Math.sin(t * f) * 0.05 : Math.cos(t * 1.1) * 0.04);
    bob.scale.set(1 + sq * 0.3, 1 - sq * 0.6, 1 + sq * 0.3);
    wake.scale.setScalar(1 + (pad ? 0.15 + Math.sin(t * f * 2) * 0.06 : Math.sin(t * 1.4) * 0.04));
    wake.position.x = pad ? -0.06 : 0;
    let k = blink.update(dt, !flat);
    if (flat) k = 0.12; else if (anim === 'stunned') k = 0.45;
    eye.userData.blink(k);
    dizzy.visible = anim === 'stunned';
    if (dizzy.visible) dizzy.rotation.y = t * 4;
  };
  return makeModel('pilzling_reifen', root, update, [], { initial: 'float' });
}

// =============================================================================================
// Spuk
// =============================================================================================
const SP = { top: 0xf6f0ff, mid: 0xd9c8ff, low: 0xb49af0, tail: 0x8f6ee0, mouth: 0x3a1450, fang: 0xffffff, cheek: 0xff9fd0, tip: 0xffffff };
const SPUK_PTS = [[0, 0.04], [0.17, 0.02], [0.31, 0.07], [0.41, 0.17], [0.455, 0.31], [0.45, 0.45], [0.41, 0.58], [0.34, 0.7], [0.25, 0.81], [0.16, 0.9], [0.08, 0.98], [0.025, 1.04], [0, 1.06]];
const spukBend = (y) => (y > 0.5 ? -0.6 * (y - 0.5) * (y - 0.5) : 0); // Flammenspitze biegt nach hinten
function spukBodyGeo() {
  return cached('w3:spuk:body', () => {
    const b = new Build();
    const lathe = new THREE.LatheGeometry(smoothProfile(SPUK_PTS, 2).map(([x, y]) => new THREE.Vector2(x, y)), 36);
    const P = lathe.attributes.position;
    for (let i = 0; i < P.count; i++) P.setX(i, P.getX(i) + spukBend(P.getY(i)));
    b.add(smoothNormals(lathe), { v: (x, y) => (y < 0.45 ? mix(SP.low, SP.mid, smoothstep(y / 0.45)) : mix(SP.mid, SP.top, smoothstep((y - 0.45) / 0.4))) });
    // Locke an der Flammenspitze
    const tip = [[-0.2, 1.075, 0, 0.05], [-0.26, 1.06, 0, 0.04], [-0.29, 1.01, 0, 0.032], [-0.27, 0.97, 0, 0.024]];
    for (const [x, y, z, r] of tip) b.sphere(r, SP.top, { p: [x, y, z] }, 12, 8);
    // Ringelschwanz hinten unten (dunkler)
    const tail = [[-0.36, 0.12, 0, 0.13], [-0.48, 0.09, 0, 0.1], [-0.58, 0.13, 0, 0.078], [-0.63, 0.21, 0, 0.06], [-0.6, 0.28, 0, 0.046], [-0.54, 0.3, 0, 0.035]];
    tail.forEach(([x, y, z, r], i) => b.sphere(r, mix(SP.low, SP.tail, i / 5), { p: [x, y, z] }, 12, 8));
    // Wangen
    for (const s of [1, -1]) stick(b, onLathe(SPUK_PTS, 0.42, s * 0.6, -0.13), SP.cheek, [0.075, 0.05, 0.02], 0.3);
    return b.geometry();
  });
}
function spukMouthGeo() {
  return cached('w3:spuk:mouth', () => {
    const b = new Build();
    const h = onLathe(SPUK_PTS, 0.42, 0, -0.3);
    // verschmitztes Grinsen: Halbmond (oben flacher Bogen, unten rund) mit einem Zähnchen
    const shape = new THREE.Shape();
    shape.moveTo(-1, 0.3); shape.quadraticCurveTo(0, 0.0, 1, 0.3); shape.quadraticCurveTo(0.85, -0.9, 0, -0.9); shape.quadraticCurveTo(-0.85, -0.9, -1, 0.3);
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.12, bevelSegments: 2, curveSegments: 10 });
    g.translate(0, 0, -0.3);
    stick(b, h, SP.mouth, [0.13, 0.08, 0.06], -0.2, g);
    const fang = h.p.clone().addScaledVector(h.n, 0.02); fang.z += 0.05; fang.y += 0.004;
    b.cone(0.02, 0.045, SP.fang, { p: [fang.x, fang.y, fang.z], r: [0, 0, Math.PI - 0.25] }, 6);
    return b.geometry();
  });
}
const spukArmGeo = () => cached('w3:spuk:arm', () => new Build().sphere(1, { v: (x, y, z, nx, ny) => mix(SP.low, SP.top, smoothstep(ny + 0.6)) }, { s: [0.085, 0.07, 0.11] }, 14, 10).geometry());
const spukFlareGeo = () => cached('w3:spuk:flare', () => {
  const b = new Build();
  for (let i = 0; i < 3; i++) {
    const a = (i - 1) * 0.55;
    b.add(new THREE.ConeGeometry(0.05, 0.22, 8), { v: (x, y) => mix(0xd8c8ff, 0xffffff, smoothstep(y / 0.22 + 0.5)) }, { p: [Math.sin(a) * 0.05 - 0.02, 0.1, Math.cos(a) * 0.0 + (i - 1) * 0.06], r: [(i - 1) * 0.5, 0, 0.3 + a * 0.2] });
  }
  return b.geometry();
});

function buildSpuk(opts = {}) {
  const size = clamp(Number(opts.size ?? 1), 0.3, 6);
  const root = new THREE.Group();
  const scaleJ = joint(); scaleJ.scale.setScalar(size);
  const float = joint();
  const body = joint();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, emissive: 0x2a1e48, transparent: true, opacity: 1 });
  const bodyM = mesh(spukBodyGeo(), mat, {}, true);
  const mouth = mesh(spukMouthGeo(), mat);
  const flare = mesh(spukFlareGeo(), mat, { p: [-0.17, 1.02, 0] });
  const eye = eyes([{ p: [0.37, 0.53, 0.135], r: 0.105, sy: 1.35, dir: [1, 0.12, 0.42] }, { p: [0.37, 0.53, -0.135], r: 0.105, sy: 1.35, dir: [1, 0.12, -0.42] }],
    { key: 'w3:spuk2', iris: 0xffc21a, pupil: 0.6, depth: 0.5, pupilColor: 0x2a0a3a });
  const eyeMats = fadeMats(eye);
  const arms = [1, -1].map((s) => joint([0.03, 0.33, s * 0.43], mesh(spukArmGeo(), mat, {}, true)));
  const sparkle = sparkleSprite(0xfff6ff, 0.6); sparkle.position.y = 0.5; sparkle.visible = false;
  body.add(bodyM, mouth, flare, eye, ...arms);
  float.add(body, sparkle);
  scaleJ.add(float);
  root.add(scaleJ);
  const clk = new Clock(), blink = new Blinker();
  let op = 1, lean = 0, spin = 0, flash = 0;
  const pinkish = new THREE.Color(0xffd0ea), white = new THREE.Color(0xffffff);
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    const chase = anim === 'chase', shy = anim === 'shy', fade = anim === 'fade', dead = anim === 'defeated';
    const hit = anim === 'hit' && age < 0.4;
    float.position.y = Math.sin(t * 2.1) * 0.05 + (shy ? 0.03 : 0);
    lean = damp(lean, chase ? -0.3 : shy ? 0.14 : 0, 6, dt);
    body.rotation.z = lean + Math.sin(t * 1.6) * 0.04;
    body.rotation.x = Math.sin(t * 1.3) * 0.05 + (hit ? Math.sin(t * 50) * 0.2 : 0);
    body.rotation.y = damp(body.rotation.y, shy ? 0.4 : 0, 5, dt);
    let target = 1;
    if (shy) target = 0.8; else if (fade) target = 0.2 + Math.max(0, Math.sin(t * 13)) * 0.1;
    if (dead) target = 1 - smoothstep(age / 0.6);
    op = damp(op, target, dead ? 30 : 6, dt);
    mat.opacity = op; mat.depthWrite = op > 0.9; mat.visible = op > 0.01;
    setOpacity(eyeMats, op);
    flash = damp(flash, hit ? 1 : 0, 20, dt);
    mat.emissive.setRGB(0.16 + flash * 0.6, 0.12 + flash * 0.6, 0.28 + flash * 0.5);
    mat.color.copy(white).lerp(pinkish, shy ? 0.85 : 0);
    // Flammenspitze lodert beim Jagen
    const fl = chase ? 1.35 + Math.sin(t * 17) * 0.15 : 0.85 + Math.sin(t * 5) * 0.08;
    flare.scale.set(1, fl, 1);
    flare.rotation.z = Math.sin(t * 6) * 0.15;
    arms.forEach((a, i) => {
      const s = i ? -1 : 1;
      let p = [0.03, 0.33 + Math.sin(t * 3 + i) * 0.02, s * 0.43], r = [0, 0, 0];
      if (chase) { p = [-0.1, 0.4, s * 0.42]; r = [s * 0.3, 0, 0.7]; }
      if (shy) { p = [0.43, 0.54, s * 0.1]; r = [0, s * 0.5, -0.3]; }
      a.position.set(damp(a.position.x, p[0], 14, dt), damp(a.position.y, p[1], 14, dt), damp(a.position.z, p[2], 14, dt));
      a.rotation.set(damp(a.rotation.x, r[0], 12, dt), damp(a.rotation.y, r[1], 12, dt), damp(a.rotation.z, r[2], 12, dt));
    });
    mouth.scale.set(1, shy ? 0.45 : chase ? 1.3 : 0.85, shy ? 0.6 : 1);
    let k = blink.update(dt);
    if (shy || hit) k = 0.1; else if (chase) k = 1;
    eye.userData.blink(k);
    eye.scale.setScalar(chase ? 1.12 : 1);
    if (dead) spin += dt * 18; else spin = 0;
    float.rotation.y = spin;
    float.scale.setScalar(dead ? Math.max(0.001, 1 - smoothstep(age / 0.6)) : 1);
    sparkle.visible = dead && age < 0.8;
    if (sparkle.visible) sparkle.scale.setScalar(0.4 + age * 2);
  };
  return makeModel('spuk', root, update, [mat, ...eyeMats], { initial: 'idle' });
}

// =============================================================================================
// Kreisgeist (einzeln und als Kreis)
// =============================================================================================
const KG = { body: 0xbff5ea, top: 0xf2fffb, hem: 0x8fdccc, cap: 0x3aa894, pom: 0xffd84a, ink: 0x1f3a3a, cheek: 0xff9fb6, nose: 0xffc8d0 };
const KG_PTS = [[0.47, 0.02], [0.44, 0.1], [0.4, 0.22], [0.36, 0.38], [0.33, 0.52], [0.28, 0.64], [0.2, 0.73], [0.1, 0.78], [0, 0.8]];
function kgBodyGeo(lo = false) {
  return cached(`w3:kreisgeist:body:${lo}`, () => {
    const b = new Build();
    const q = lo ? 0.6 : 1, seg = (n) => Math.max(6, Math.round(n * q));
    const lathe = new THREE.LatheGeometry(KG_PTS.map(([r, y]) => new THREE.Vector2(r, y)), lo ? 28 : 40, 0, TAU);
    // Wellensaum: untere Kante wellig
    const P = lathe.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const y = P.getY(i);
      if (y < 0.15) { const a = Math.atan2(P.getZ(i), P.getX(i)); P.setY(i, y + Math.sin(a * 7) * 0.035 * (1 - y / 0.15)); }
    }
    lathe.computeVertexNormals();
    b.add(lathe, { v: (x, y) => mix(KG.hem, mix(KG.body, KG.top, smoothstep((y - 0.4) / 0.4)), smoothstep(y / 0.25)) });
    b.cyl(0.42, 0.42, 0.01, 0x5fae9e, { p: [0, 0.07, 0] }, 28);
    // Zipfelmütze (nach hinten gebogen) mit Bommel
    const capPts = [[0, 0.7, 0, 0.2], [-0.01, 0.78, 0, 0.16], [-0.04, 0.86, 0, 0.125], [-0.09, 0.93, 0, 0.095], [-0.16, 0.98, 0, 0.07], [-0.24, 0.99, 0, 0.052], [-0.31, 0.96, 0, 0.04]];
    capPts.forEach(([x, y, z, r], i) => b.sphere(r, i % 2 ? 0xffffff : KG.cap, { p: [x, y, z], s: [1, 0.8, 1] }, seg(14), seg(8)));
    b.add(new THREE.OctahedronGeometry(0.085, 0), KG.pom, { p: [-0.34, 0.92, 0], r: [0.3, 0.5, 0.2] });
    b.sphere(0.07, KG.pom, { p: [-0.34, 0.92, 0] }, seg(12), seg(8));
    // Gesicht: Wangen, Näschen, kleiner Mund
    for (const s of [1, -1]) stick(b, onLathe(KG_PTS, 0.45, s * 0.6, -0.08), KG.cheek, [0.06, 0.04, 0.02], 0.3);
    stick(b, onLathe(KG_PTS, 0.45, 0, -0.02), KG.nose, [0.04, 0.035, 0.04], 0.3);
    stick(b, onLathe(KG_PTS, 0.4, 0, -0.18), KG.ink, [0.035, 0.03, 0.02], 0.3);
    // Händchen vorn gefaltet
    for (const s of [1, -1]) b.sphere(1, KG.body, { p: [0.33, 0.27, s * 0.09], s: [0.07, 0.06, 0.08] }, seg(12), seg(8));
    return b.geometry();
  });
}
function kgLidGeo() {
  return cached('w3:kreisgeist:lids', () => {
    const b = new Build();
    for (const s of [1, -1]) {
      const h = onLathe(KG_PTS, 0.45, s * 0.3, 0.12);
      b.add(new THREE.TorusGeometry(0.045, 0.012, 6, 12, Math.PI), KG.ink, { p: [h.p.x + 0.01, h.p.y - 0.01, h.p.z], r: [0, Math.PI / 2 - s * 0.3, 0], order: 'YXZ' });
    }
    return b.geometry();
  });
}
const KG_EYES = [{ p: [0.33, 0.53, 0.1], r: 0.065, sy: 1.25, dir: [1, 0.1, 0.35] }, { p: [0.33, 0.53, -0.1], r: 0.065, sy: 1.25, dir: [1, 0.1, -0.35] }];
const KG_EYE_OPTS = { key: 'w3:kreisgeist', iris: 0x1f5a5a, pupil: 0.62, depth: 0.5 };
function buildKreisgeist() {
  const root = new THREE.Group();
  const float = joint();
  const mat = vcol(0.4, { emissive: 0x0e2a26 }, 'w3ghost');
  const bodyM = mesh(kgBodyGeo(), mat, {}, true);
  const lids = mesh(kgLidGeo(), vcol(0.4));
  const eye = eyes(KG_EYES, KG_EYE_OPTS);
  const sparkle = sparkleSprite(0xffffff, 0.5); sparkle.position.y = 0.5;
  float.add(bodyM, lids, eye, sparkle);
  root.add(float);
  const clk = new Clock(), blink = new Blinker();
  const update = (dt, st) => {
    const anim = st.anim ?? 'circle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    const peek = anim === 'peek', dead = anim === 'defeated';
    float.position.y = Math.sin(t * 2.4) * 0.05;
    float.rotation.z = Math.sin(t * 1.7) * 0.07;
    float.rotation.x = Math.cos(t * 1.3) * 0.05;
    lids.visible = !peek;
    eye.visible = peek;
    if (peek) eye.userData.blink(blink.update(dt));
    const ds = dead ? Math.max(0.001, 1 - smoothstep(age / 0.5)) : 1;
    float.scale.setScalar(ds);
    if (dead) float.rotation.y += dt * 16;
    sparkle.visible = dead && age < 0.7;
    if (sparkle.visible) sparkle.scale.setScalar(0.3 + age * 2);
  };
  return makeModel('kreisgeist', root, update, [], { initial: 'circle' });
}
function buildKreisgeistKreis(opts = {}) {
  const n = clamp(Math.round(opts.count ?? 8), 1, 40);
  const R = Math.max(0.5, Number(opts.radius ?? 3));
  const root = new THREE.Group();
  const e = eyes(KG_EYES, KG_EYE_OPTS);
  const ey = e.position.y;
  const mat = vcol(0.4, { emissive: 0x0e2a26 }, 'w3ghost');
  const rad = R + 1.2;
  const bodies = instMesh(kgBodyGeo(true), mat, n, rad, 0.5);
  const lids = instMesh(kgLidGeo(), vcol(0.4), n, rad, 0.5);
  const whites = instMesh(e.userData.eyes.geometry, e.userData.eyes.material, n, rad, 0.5);
  const hls = instMesh(e.userData.hl.geometry, e.userData.hl.material, n, rad, 0.5);
  bodies.castShadow = true;
  root.add(bodies, lids, whites, hls);
  const clk = new Clock();
  const eyeM = new THREE.Matrix4();
  const phases = Array.from({ length: n }, (_, i) => i * 1.7);
  const update = (dt, st) => {
    const anim = st.anim ?? 'circle';
    clk.tick(dt, anim);
    const t = clk.t;
    const base = st.angle ?? t * 0.35;
    const peek = anim === 'peek';
    const alive = st.alive;
    for (let i = 0; i < n; i++) {
      const on = alive === undefined ? true : Array.isArray(alive) ? alive[i] !== false : !!((alive >> i) & 1);
      if (!on) { bodies.setMatrixAt(i, ZERO); lids.setMatrixAt(i, ZERO); whites.setMatrixAt(i, ZERO); hls.setMatrixAt(i, ZERO); continue; }
      const a = base + (i / n) * TAU;
      const x = Math.cos(a) * R, z = Math.sin(a) * R;
      // Blick nach außen: lokale +X → (cos a, sin a) ⇒ Gier = −a
      _q.setFromEuler(_e.set(Math.cos(t * 1.3 + phases[i]) * 0.05, -a, Math.sin(t * 1.7 + phases[i]) * 0.07, 'YXZ'));
      _m.compose(_v.set(x, Math.sin(t * 2.4 + phases[i]) * 0.05, z), _q, _s.setScalar(1));
      bodies.setMatrixAt(i, _m);
      lids.setMatrixAt(i, peek ? ZERO : _m);
      eyeM.makeTranslation(0, ey, 0).premultiply(_m);
      whites.setMatrixAt(i, peek ? eyeM : ZERO);
      hls.setMatrixAt(i, peek ? eyeM : ZERO);
    }
    for (const m of [bodies, lids, whites, hls]) m.instanceMatrix.needsUpdate = true;
  };
  return makeModel('kreisgeist_kreis', root, update, [bodies, lids, whites, hls], { initial: 'circle' });
}

// =============================================================================================
// Funkenläufer
// =============================================================================================
function sparkCoreGeo() {
  return cached('w3:spark:core', () => {
    const b = new Build();
    b.sphere(0.2, { v: (x, y, z) => mix(0xffe24a, 0xfffbe0, smoothstep(x / 0.2 * 0.6 + 0.5)) }, null, 22, 16);
    for (const s of [1, -1]) b.sphere(1, 0x1a1420, { p: [0.17, 0.05, s * 0.065], s: [0.03, 0.06, 0.035] }, 10, 8);
    return b.geometry();
  });
}
function sparkSpikesGeo() {
  return cached('w3:spark:spikes', () => {
    const b = new Build();
    const n = 14;
    for (let i = 0; i < n; i++) {
      const y = 1 - (i + 0.5) / n * 2, rr = Math.sqrt(1 - y * y), a = i * 2.4;
      const d = new THREE.Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr);
      // Zickzack-Zacke: zwei versetzte Kegel
      const side = new THREE.Vector3().crossVectors(d, new THREE.Vector3(0.3, 1, 0.2)).normalize();
      const p1 = d.clone().multiplyScalar(0.17), p2 = d.clone().multiplyScalar(0.29).addScaledVector(side, 0.04);
      b.add(new THREE.ConeGeometry(0.045, 0.14, 5), 0xfff3a0, alongY(p1, p2.clone().sub(p1), 0.14));
      b.add(new THREE.ConeGeometry(0.03, 0.12, 5), 0xffffff, alongY(p2, d.clone().addScaledVector(side, -0.6), 0.12));
    }
    return b.geometry();
  });
}
function buildFunkenlaeufer() {
  const root = new THREE.Group();
  const ball = joint([0, 0.3, 0]);
  const core = mesh(sparkCoreGeo(), basic('w3:sparkCore', { vertexColors: true }));
  const spikes = mesh(sparkSpikesGeo(), basic('w3:sparkSpikes', { vertexColors: true }));
  const glow = glowSprite(0xffc81a, 0.95, 0.5);
  const trail = [0, 1].map((i) => glowSprite(0xffb020, 0.45 - i * 0.12, 0.45));
  ball.add(core, spikes, glow);
  root.add(ball, ...trail);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'run';
    clk.tick(dt, anim);
    const t = clk.t;
    const run = anim === 'run';
    spikes.rotation.set(t * 5, t * 7, t * 3);
    spikes.scale.setScalar(0.9 + Math.abs(Math.sin(t * 31)) * 0.25);
    core.scale.set(run ? 1.08 : 1, run ? 0.94 : 1 + Math.sin(t * 9) * 0.04, 1);
    ball.position.set(Math.sin(t * 47) * 0.012, 0.3 + Math.abs(Math.sin(t * 11)) * (run ? 0.04 : 0.015), Math.cos(t * 41) * 0.012);
    glow.scale.setScalar(0.9 + Math.sin(t * 23) * 0.12);
    trail.forEach((g, i) => { g.visible = run; g.position.set(-0.32 - i * 0.22, 0.3 + Math.sin(t * 13 + i) * 0.03, 0); });
  };
  return makeModel('funkenlaeufer', root, update, [], { initial: 'run' });
}

// =============================================================================================
// Funkenkäfer
// =============================================================================================
const FK = { shell: 0x2a3a8a, shellHi: 0x4f6ad8, belly: 0x15204a, bolt: 0xffe24a, wing: 0xe8f6ff };
function fkBodyGeo() {
  return cached('w3:fk:body', () => {
    const b = new Build();
    b.sphere(1, { v: (x, y, z, nx, ny) => mix(FK.belly, mix(FK.shell, FK.shellHi, smoothstep(ny)), smoothstep(ny + 0.6)) }, { p: [0.02, 0.33, 0], s: [0.2, 0.17, 0.18] }, 20, 14);
    b.sphere(0.14, FK.shell, { p: [0.2, 0.36, 0] }, 18, 14);
    // Blitz-Fühler: Zickzack
    for (const s of [1, -1]) {
      b.tube([[0.26, 0.46, s * 0.04], [0.3, 0.55, s * 0.08], [0.26, 0.6, s * 0.1], [0.32, 0.7, s * 0.14]], 0.013, 0x1a1a2a, null, 12, 5);
      b.add(new THREE.OctahedronGeometry(0.035, 0), FK.bolt, { p: [0.32, 0.72, s * 0.14] });
    }
    // Beinchen
    for (let i = 0; i < 3; i++) for (const s of [1, -1]) b.capsule(0.018, 0.08, 0x1a1a2a, { p: [0.08 - i * 0.08, 0.2, s * 0.12], r: [s * 0.6, 0, 0.2] }, 2, 5);
    return b.geometry();
  });
}
const fkBulbGeo = () => cached('w3:fk:bulb', () => {
  const b = new Build();
  b.sphere(1, { v: (x, y, z) => mix(0xffc21a, 0xfff8c0, smoothstep(-x * 0.7 + 0.4)) }, { s: [0.2, 0.17, 0.17] }, 20, 14);
  for (let i = 0; i < 3; i++) b.torus(0.12 - i * 0.01, 0.012, 0x9a6a1a, { p: [0.15 + i * 0.025, 0, 0], r: [0, Math.PI / 2, 0], s: [1, 1.05, 1] }, 6, 18);
  return b.geometry();
});
function buildFunkenkaefer() {
  const root = new THREE.Group();
  const body = joint();
  const bodyM = mesh(fkBodyGeo(), vcol(0.35), {}, true);
  const bulbMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.2, emissive: 0xffb020, emissiveIntensity: 0.6 });
  const bulb = mesh(fkBulbGeo(), bulbMat, { p: [-0.2, 0.35, 0], r: [0, 0, 0.25] }, true);
  const eye = eyes([{ p: [0.31, 0.39, 0.06], r: 0.06, sy: 1.25, dir: [1, 0.1, 0.5] }, { p: [0.31, 0.39, -0.06], r: 0.06, sy: 1.25, dir: [1, 0.1, -0.5] }],
    { key: 'w3:fk', iris: 0xffd21a, pupil: 0.55, depth: 0.55 });
  const wm = std('w3:fkWing', { color: FK.wing, transparent: true, opacity: 0.55, side: THREE.DoubleSide, roughness: 0.15, depthWrite: false });
  const wingGeo = cached('w3:fk:wing', () => { const g = new THREE.CircleGeometry(1, 16); g.scale(0.11, 0.24, 1); g.translate(0, 0.22, 0); return g; });
  const wings = [1, -1].map((s) => joint([0.0, 0.47, s * 0.07], mesh(wingGeo, wm)));
  const glow = glowSprite(0xffd23a, 0.55, 0.5); glow.position.set(-0.25, 0.35, 0);
  body.add(bodyM, bulb, eye, ...wings, glow);
  root.add(body);
  const clk = new Clock(), blink = new Blinker();
  let sq = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'fly';
    clk.tick(dt, anim);
    const t = clk.t;
    const charge = anim === 'charge', flat = anim === 'squashed';
    sq = damp(sq, flat ? 1 : 0, 25, dt);
    body.scale.set(1 + sq * 0.3, Math.max(0.05, 1 - sq * 0.75), 1 + sq * 0.3);
    body.position.y = flat ? 0 : 0.1 + Math.sin(t * 3.5) * 0.06;
    body.position.x = charge ? Math.sin(t * 60) * 0.015 : 0;
    body.rotation.z = Math.sin(t * 3.5 + 1) * 0.06;
    wings.forEach((w, i) => {
      const s = i ? -1 : 1;
      const flap = flat ? 0.1 : Math.sin(t * 42 + i) * 0.6 + 0.5;
      w.rotation.set(s * (0.3 + flap), 0, 0.45);
    });
    const k = charge ? (Math.sin(t * 40) > 0 ? 2.2 : 0.8) : flat ? 0.1 : 0.55 + Math.sin(t * 4) * 0.15;
    bulbMat.emissiveIntensity = k;
    glow.visible = !flat;
    glow.scale.setScalar(0.4 + k * 0.25);
    eye.userData.blink(flat ? 0.1 : charge ? 0.7 : blink.update(dt));
  };
  return makeModel('funkenkaefer', root, update, [bulbMat], { initial: 'fly' });
}

// =============================================================================================
// Hüpfqualle
// =============================================================================================
const HQ = { bell: 0xff9fd8, bellLow: 0xe86ac0, spot: 0xfff0fa, core: 0xff5aa8, ribbon: 0xc65ad8 };
const HQ_PTS = [[0.4, 0.0], [0.42, 0.06], [0.41, 0.16], [0.36, 0.28], [0.27, 0.37], [0.15, 0.43], [0, 0.45]];
function hqBellGeo() {
  return cached('w3:hq:bell', () => {
    const b = new Build();
    b.lathe(HQ_PTS, { v: (x, y) => mix(HQ.bellLow, HQ.bell, smoothstep(y / 0.3)) }, null, 36, 2);
    // Saum-Wülstchen
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; b.sphere(0.06, HQ.bellLow, { p: [Math.cos(a) * 0.39, 0.0, Math.sin(a) * 0.39], s: [1, 0.7, 1] }, 10, 6); }
    const hits = [[2.3, 0.75, 0.06], [-2.3, 0.75, 0.06], [Math.PI, 0.5, 0.07], [1.6, 0.35, 0.05], [-1.6, 0.35, 0.05], [0, 1.3, 0.05], [2.8, 1.0, 0.045], [-2.8, 1.0, 0.045]]
      .map(([az, el, r]) => ({ ...onLathe(HQ_PTS, 0.05, az, el), r }));
    decals(b, hits, 0.06, HQ.spot, 0.25);
    stick(b, onLathe(HQ_PTS, 0.1, 0, 0.05), 0x5a1a4a, [0.05, 0.03, 0.03], 0.4);
    return b.geometry();
  });
}
const hqCoreGeo = () => cached('w3:hq:core', () => new Build().sphere(1, { v: (x, y) => mix(HQ.core, 0xffd0ea, smoothstep(y + 0.4)) }, { s: [0.22, 0.18, 0.22] }, 18, 12).geometry());
function hqLegsGeo() {
  return cached('w3:hq:legs', () => {
    const b = new Build();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4;
      const c = Math.cos(a), s = Math.sin(a);
      // gewelltes Band von der Glocke zum Boden, Füßchen eingerollt
      const pts = [[c * 0.22, 0.42, s * 0.22], [c * 0.26 + 0.03, 0.3, s * 0.26], [c * 0.22, 0.2, s * 0.22], [c * 0.27, 0.1, s * 0.27], [c * 0.3, 0.04, s * 0.3]];
      b.tube(pts, 0.035, { v: (x, y) => mix(HQ.ribbon, HQ.bell, smoothstep(y / 0.4)) }, null, 16, 6);
      b.sphere(1, HQ.ribbon, { p: [c * 0.31, 0.035, s * 0.31], s: [0.065, 0.04, 0.065] }, 10, 6);
    }
    return b.geometry();
  });
}
function buildHuepfqualle() {
  const root = new THREE.Group();
  const pose = joint();
  const bellJ = joint([0, 0.38, 0]);
  const jelly = std('w3:jelly', { vertexColors: true, transparent: true, opacity: 0.9, roughness: 0.15, emissive: 0x2a0a20 });
  const bell = mesh(hqBellGeo(), jelly, {}, true);
  const core = mesh(hqCoreGeo(), vcol(0.3), { p: [0, 0.16, 0] });
  const eye = eyes([{ p: [0.34, 0.2, 0.12], r: 0.075, sy: 1.3, dir: [1, 0.1, 0.4] }, { p: [0.34, 0.2, -0.12], r: 0.075, sy: 1.3, dir: [1, 0.1, -0.4] }],
    { key: 'w3:hq', iris: 0x8a1a6a, pupil: 0.58, depth: 0.5 });
  bellJ.add(core, bell, eye);
  const legs = mesh(hqLegsGeo(), vcol(0.3), {}, true);
  pose.add(bellJ, legs);
  root.add(pose);
  const clk = new Clock(), blink = new Blinker();
  let sq = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    const flat = anim === 'squashed';
    sq = damp(sq, flat ? 1 : 0, 25, dt);
    let sy = 1 + Math.sin(t * 3) * 0.04, sx = 1 - Math.sin(t * 3) * 0.03, y = 0, legS = 1;
    if (anim === 'hop') {
      const p = st.progress !== undefined ? clamp(st.progress, 0, 1) : (clk.age % 0.7) / 0.7;
      if (p < 0.2) { const k = Math.sin((p / 0.2) * Math.PI * 0.5); sy = 1 - 0.3 * k; sx = 1 + 0.18 * k; legS = 1 - 0.35 * k; }
      else if (p < 0.85) { const k = (p - 0.2) / 0.65; y = Math.sin(k * Math.PI) * 0.5; sy = 1.15 - 0.15 * k; sx = 0.92 + 0.08 * k; legS = 1.15; }
      else { const k = Math.sin(((p - 0.85) / 0.15) * Math.PI); sy = 1 - 0.22 * k; sx = 1 + 0.14 * k; legS = 1 - 0.25 * k; }
    }
    pose.position.y = y;
    pose.scale.set(sx * (1 + sq * 0.4), sy * Math.max(0.12, 1 - sq * 0.8), sx * (1 + sq * 0.4));
    legs.scale.y = legS;
    bellJ.position.y = 0.38 * legS;
    bellJ.rotation.z = Math.sin(t * 2.2) * 0.05;
    core.scale.setScalar(1 + Math.sin(t * 5) * 0.06);
    eye.userData.blink(flat ? 0.1 : blink.update(dt));
  };
  return makeModel('huepfqualle', root, update, [], { initial: 'idle' });
}

export const MODELS = {
  schneesaeule: buildSchneesaeule,
  pilzling_eis: buildPilzlingEis,
  pilzling_reifen: buildPilzlingReifen,
  spuk: buildSpuk,
  kreisgeist: buildKreisgeist,
  kreisgeist_kreis: buildKreisgeistKreis,
  funkenlaeufer: buildFunkenlaeufer,
  funkenkaefer: buildFunkenkaefer,
  huepfqualle: buildHuepfqualle,
};
