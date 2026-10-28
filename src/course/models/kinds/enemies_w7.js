// Gegner-Modelle Welt 7 „Lava-Festung“ (Kurs-Modus): Knochenflieger, Platschfisch, Lavadrache, Wutkaulquappe,
// Funkenflämmchen und die blaue Feuerkugel. Eigene Gestaltung, keine Nachbauten fremder Figuren; lustig, nie erschreckend.
// Maßstab Meter, Ursprung = Fußpunkt (Ausnahmen genannt), Blick nach +X; state darf ein String sein ('fly' ≙ { anim: 'fly' }).
// Unbekannte anim → Standardzustand. progress (0..1) überschreibt bei Einmal-/Zyklus-Animationen die Zeit seit dem Wechsel.
// Wiederverwendet (nicht neu gebaut): Stachelpanzer 'stachelpanzer' (Welt 4), Bumerang-Werfer 'bumerang_werfer' (Welt 6, mit
// opts.sichel: hält eine Wurfsichel), Feuer-Werfer 'feuer_werfer', Stampfstein 'stampfstein', Rammfisch 'rammfisch',
// Zauberkröte 'zauberkroete', Lavabrocken 'lavabrocken', Funkenling 'funkenling', Glutball 'glutball' (blaue Lava-Funken).
//
// knochenflieger ≈1,5 m Spannweite, 1,1 m lang  Knochenflieger: lustiger Knochen-Vogel – runder Schädel mit Knochenkamm,
//   großen Augen in pflaumendunklen Höhlen und keck schrägen Brauenwülsten, langer Schnabel (Unterkiefer klappt), Rippen-
//   Brustkorb mit Wirbeln, Flügel aus fünf Fingerknochen, Fächer-Schwanz, baumelnde Knochenfüßchen.
//   **Ursprung = Körpermitte** (Flughöhe setzt der Motor).
//   state { anim: 'fly'|'dive'|'defeated', flap? (0..1 Flügelstellung, überschreibt die eigene Schlag-Uhr; 1 = oben),
//           speed (m/s, schneller Schlag), progress? (defeated: 0..1 in 0,9 s) }
//         fly: schlägt mit den Flügeln (≈2,2 Hz), wippt, klappert mit dem Schnabel; dive: Sturzflug – Flügel nach hinten
//         angelegt, Schnabel weit auf, Nase nach unten; defeated: fällt klappernd auseinander (Schädel, Flügel und Rumpf
//         fliegen auseinander, Knochenstaub), danach unsichtbar.
//   root.userData.radius → Trefferradius (0,4 m).
// platschfisch  ≈1,1 m lang (mit Schwanz)  Platschfisch: Lavafisch – glühender Körper (Bauch gelb-weiß, oben orange-rot) unter sechseckigen
//   Basaltschollen (Fugen glühen), Flammenkamm aus drei Zungen, Flammen-Brustflossen und -Gabelschwanz, dicke Goldlippen, große Augen, Krustenbrauen.
//   **Ursprung = Unterkante des Körpers (Bauch)**, Körpermitte y = 0,3.
//   opts  { color: 'rot' (Standard) | 'blau' (blaue Lava) }
//   state { anim: 'swim'|'jump'|'spit'|'defeated', speed, progress? (jump: 0..1 über den Sprungbogen; spit: 0..1 in 0,8 s;
//           defeated 0..1 in 1,2 s) }
//         swim: Schwanz schlägt, Flossen züngeln, Lavatröpfchen; jump: Nase hoch → runter mit progress, Flossen gespreizt,
//         Maul auf, Spritzer an Start und Ende (der Motor bewegt root); spit: bläht die Backen (0–0,45), bei progress 0,5
//         spuckt er (Feuerkugel an model.mouth() erzeugen), Rückstoß; defeated: kühlt zu Stein ab (Glut erlischt), dreht
//         sich auf den Rücken, Augen zu, Dampf.
//   model.mouth(out?) → Weltposition vor dem Maul.
// lavadrache    ≈3,4 m aufgetaucht  Lavadrache: freundlich-freche Lava-Seeschlange – lila Schuppenhals aus `segments`
//   Gliedern (glühende Bauchplatten, Flammenkamm), runder Drachenkopf mit Stupsnase, goldenen Hörnchen, Flammen-Ohrfächern,
//   großen Augen und klappendem Unterkiefer. **Ursprung = Austrittspunkt an der Lava-Oberfläche** (y = 0 = Lava).
//   opts  { segments (Halsglieder, 7; 3..12), color: 'rot' (Standard) | 'blau' (Feuer, Glut und Wellenring) }
//   state { anim: 'hidden'|'rise'|'spit'|'sink'|'defeated'|'idle', rise? (0..1 aufgetaucht, überschreibt), progress?
//           (rise 0..1 in 1,0 s; sink 0..1 in 0,8 s; spit 0..1 in 1,0 s; defeated 0..1 in 1,6 s) }
//         hidden: unter der Lava – nur Glutring und Blasen verraten ihn; rise: taucht im Bogen auf (Kopf zuerst senkrecht,
//         dann nach vorn); idle: aufgetaucht, wiegt sich; spit: holt aus (0–0,4), stößt vor und speit bei progress 0,5
//         (Feuerkugel an model.mouth()), Flamme bis 0,7; sink: taucht ab; defeated: Augen zu, Schwindelsterne, Dampf,
//         sinkt weg (danach unsichtbar).
//   model.mouth(out?) → Weltposition vor dem Maul.  root.userData.rise → aktuelle Auftauch-Stellung (0..1),
//   root.userData.head(out?) → Weltposition der Kopfmitte (Trefferkugel Radius ≈0,45 m).
// wutkaulquappe ≈0,85 m lang (aufgeblasen Ø ≈0,8 m)  Wutkaulquappe: kleine korallenrote Kaulquappe mit gelbem Bauch,
//   Sommersprossen, großen grimmigen Augen unter dicken Brauen, Schmollmund und wedelndem Flossenschwanz; bläst sich zur
//   stacheligen Kugel auf. **Ursprung = Körpermitte** (schwebt im Wasser).
//   state { anim: 'swim'|'charge'|'puff'|'defeated', puff? (0..1 aufgeblasen, überschreibt), speed, progress? (puff: 0..1
//           in 0,4 s; defeated: 0..1 in 1,0 s) }
//         swim: paddelt gemütlich; charge: Kopf voran, Schwanz rast, Brauen tief, Bläschen; puff: bläht sich zur Kugel mit
//         Stacheln (O-Mund, Backen voll); defeated: dreht sich auf den Bauch nach oben, Schwindelsterne, schrumpft in Bläschen.
//   root.userData.radius → aktueller Trefferradius (0,22 … 0,4 m).
// funkenflaemmchen ≈0,55 m  Funkenflämmchen: kleines, hüpfendes Flämmchen – tropfenförmige Flamme (Kern gelb-weiß,
//   Spitze orange-rot, eingerollt) mit kleinen Flammenzungen, großen Augen und Lachmund, Glutfunken.
//   opts  { color: 'rot' (Standard) | 'blau' }
//   state { anim: 'hop'|'idle'|'defeated', height (m Sprunghöhe, Standard 0,45), progress? (hop: 0..1 im Zyklus 0,6 s;
//           defeated: 0..1 in 0,6 s) }
//         hop: ducken – springen – landen (die Höhe macht das Modell, der Motor bewegt root waagerecht); idle: flackert,
//         wippt; defeated: verpufft in einem Rauchwölkchen (danach unsichtbar).
// feuerkugel_blau Ø 0,36 m  blaue Feuerkugel (blauer Schubser-Prinz, blaue Feuer-Werfer): weiß-türkiser Kern, blaue Hülle,
//   lodernde Flammenzungen, Schein. Mitte bei y = 0,18.  state { anim: 'idle' }

import {
  THREE, TAU, Build, cached, vcol, basic, mesh, joint, eyes, makeModel, Clock, Blinker, damp, clamp, mix, col,
  smoothstep, lerp, instMesh, setInst, glowSprite, placed, onEllipsoid, dizzyStars, smoothProfile,
} from '../lib/kit.js';
import {
  W7, LAVA7, lavaKey, FIRE7, glow7, glow7T, prog, num, ZERO, boneTo, fireballSet, puffyGeo, gradV, ownMat, flameGeo, mouthShape,
  stick, Puffs, hash1, lavaRingGeo, dropletGeo, taperTube, fibDirs, spikeCone,
} from '../lib/w7Geos.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
const _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();

// =============================================================================================
// Knochenflieger
// =============================================================================================
const KF = { bone: W7.bone, hi: W7.boneHi, low: W7.boneLow, dark: W7.boneDark, socket: W7.socket, beak: 0xffe2a0, beakTip: 0xffb84a };
const boneV = { v: (x, y, z, nx, ny) => mix(KF.low, KF.hi, smoothstep(ny * 0.55 + 0.45)) };
const KF_HEAD = { c: [0.3, 0.14, 0], r: [0.2, 0.185, 0.19] };
function kfBodyGeo() {
  return cached('w7:kf:body', () => {
    const b = new Build();
    // dunkler Brustraum, darüber Rippenbögen
    b.sphere(1, { v: (x, y, z, nx, ny) => mix(KF.socket, W7.socketHi, smoothstep(ny * 0.5 + 0.5)) }, { p: [0, 0, 0], s: [0.19, 0.155, 0.145] }, 18, 12);
    for (let i = 0; i < 3; i++) {
      const x = 0.1 - i * 0.09;
      const k = Math.sqrt(Math.max(0.15, 1 - (x / 0.21) ** 2));
      b.torus(1, 0.18, boneV, { p: [x, 0, 0], r: [0, Math.PI / 2, 0], s: [0.165 * k, 0.172 * k, 0.172 * k] }, 6, 18);
    }
    // Brustbein vorn unten, Wirbel oben
    b.capsule(0.035, 0.22, boneV, { p: [0.02, -0.145, 0], r: [0, 0, Math.PI / 2] }, 3, 10);
    for (let i = 0; i < 4; i++) b.sphere(0.042 - i * 0.003, boneV, { p: [0.15 - i * 0.1, 0.165 - Math.abs(i - 1) * 0.008, 0], s: [0.9, 0.8, 1.1] }, 10, 6);
    // Hals (zwei Wirbel zum Kopf)
    b.sphere(0.045, boneV, { p: [0.2, 0.12, 0] }, 10, 6);
    b.sphere(0.05, boneV, { p: [0.15, 0.08, 0] }, 10, 6);
    // Becken und Fächer-Schwanz aus Federknochen
    b.sphere(1, boneV, { p: [-0.2, -0.02, 0], s: [0.07, 0.06, 0.09] }, 12, 8);
    for (const [z, y, x] of [[0, 0.09, -0.58], [0.15, 0.06, -0.52], [-0.15, 0.06, -0.52]]) boneTo(b, [-0.22, 0, z * 0.15], [x, y, z], 0.03, boneV, [0, 0, 1], 1.4, 6);
    // baumelnde Beinchen mit drei Zehen
    for (const s of [1, -1]) {
      boneTo(b, [-0.04, -0.12, s * 0.07], [-0.02, -0.3, s * 0.08], 0.022, boneV, [1, 0, 0], 1.3, 6);
      for (const a of [-0.5, 0, 0.5]) b.capsule(0.014, 0.07, KF.low, { p: [0.02, -0.33, s * 0.08 + a * 0.04], r: [a * 0.6, 0, -Math.PI / 2 + 0.5], order: 'YXZ' }, 1, 5);
    }
    return b.geometry();
  });
}
const KF_SOCKETS = [1, -1].map((s) => onEllipsoid(KF_HEAD.c, KF_HEAD.r, s * 0.5, 0.12));
function kfHeadGeo() {
  return cached('w7:kf:head', () => {
    const b = new Build();
    b.sphere(1, boneV, { p: KF_HEAD.c, s: KF_HEAD.r }, 24, 16);
    // Augenhöhlen (pflaumendunkel, groß)
    for (const h of KF_SOCKETS) stick(b, h, { v: (x, y, z, nx, ny, nz) => mix(KF.socket, W7.socketHi, smoothstep(-ny * 0.4 + 0.3)) }, [0.105, 0.115, 0.03], 0.45);
    // keck schräge Brauenwülste
    for (const s of [1, -1]) {
      const h = onEllipsoid(KF_HEAD.c, KF_HEAD.r, s * 0.5, 0.52);
      b.capsule(0.032, 0.13, boneV, { p: h.p.toArray(), r: [Math.PI / 2 - s * 0.45, -s * 0.35, 0], order: 'YXZ' }, 2, 8);
    }
    // Knochenkamm (drei runde Zacken)
    for (let i = 0; i < 3; i++) {
      const a = 0.25 - i * 0.32;
      const h = onEllipsoid(KF_HEAD.c, KF_HEAD.r, Math.PI, 1.2 - i * 0.28);
      b.capsule(0.035 - i * 0.004, 0.1 - i * 0.015, boneV, { p: h.p.clone().addScaledVector(h.n, 0.04).toArray(), r: [0, 0, 0.6 + a] }, 2, 8);
    }
    // Oberschnabel: lang, leicht gebogen, Spitze golden
    const beak = [[0, 0], [0.085, 0.0], [0.08, 0.08], [0.065, 0.18], [0.045, 0.27], [0.022, 0.34], [0.006, 0.37], [0, 0.375]];
    const bg = new THREE.LatheGeometry(beak.map(([r, y]) => new THREE.Vector2(r, y)), 12);
    bg.scale(1, 1, 0.8);
    const P = bg.attributes.position;
    for (let i = 0; i < P.count; i++) { const y = P.getY(i); P.setX(i, P.getX(i) - (y / 0.375) ** 2 * 0.06); }
    bg.computeVertexNormals();
    b.add(bg, { v: (x, y) => mix(KF.beak, KF.beakTip, smoothstep((y - 0.2) / 0.17)) }, { p: [0.44, 0.1, 0], r: [0, 0, -Math.PI / 2 - 0.12], s: [1, 1, 1] });
    // Nasenlöcher
    for (const s of [1, -1]) b.sphere(0.012, KF.socket, { p: [0.53, 0.115, s * 0.03] }, 6, 4);
    return b.geometry();
  });
}
const kfJawGeo = () => cached('w7:kf:jaw', () => {
  const b = new Build();
  const beak = [[0, 0], [0.065, 0.0], [0.06, 0.08], [0.045, 0.17], [0.025, 0.24], [0.006, 0.27], [0, 0.275]];
  const g = new THREE.LatheGeometry(beak.map(([r, y]) => new THREE.Vector2(r, y)), 14);
  g.scale(1, 1, 0.75);
  b.add(g, { v: (x, y) => mix(KF.low, KF.beak, smoothstep(y / 0.27)) }, { p: [0.0, 0, 0], r: [0, 0, -Math.PI / 2 + 0.05] });
  b.sphere(1, W7.tongue, { p: [0.08, 0.035, 0], s: [0.07, 0.015, 0.03] }, 10, 6);
  return b.geometry();
});
/** Flügel (Schulter im Ursprung, zeigt nach s·Z): Oberarm, Handgelenk, fünf Fingerknochen. */
function kfWingGeo(s) {
  return cached(`w7:kf:wing:${s}`, () => {
    const b = new Build();
    const W = [0.02, 0.06, s * 0.28];
    boneTo(b, [0, 0, s * 0.02], W, 0.042, boneV, [1, 0, 0], 1.35, 8);
    b.sphere(0.058, boneV, { p: W }, 12, 8);
    const tips = [[0.02, 0.1, 0.72], [-0.13, 0.08, 0.68], [-0.27, 0.05, 0.58], [-0.36, 0.02, 0.43]];
    tips.forEach(([x, y, z], i) => boneTo(b, W, [x, y, s * z], 0.036 - i * 0.003, boneV, [0, 1, 0], 1.4, 6));
    return b.geometry();
  });
}
function buildKnochenflieger() {
  const root = new THREE.Group();
  const own = [];
  const flash = ownMat(vcol(0.34), { emissive: 0x000000 });
  own.push(flash);
  const pose = joint();
  const bodyJ = joint([0, 0, 0], mesh(kfBodyGeo(), flash, {}, true));
  const headJ = joint([0.16, 0.06, 0]);
  const headIn = joint([-0.16, -0.06, 0]);
  const head = mesh(kfHeadGeo(), flash, {}, true);
  const eye = eyes(KF_SOCKETS.map((h) => ({ p: h.p.clone().addScaledVector(h.n, -0.01).toArray(), r: 0.072, sy: 1.12, dir: h.n.clone().lerp(new THREE.Vector3(1, 0, 0), 0.3).toArray() })),
    { key: 'w7:kf', iris: 0xff7a1a, pupil: 0.56, depth: 0.55 });
  const jawJ = joint([0.43, 0.06, 0], mesh(kfJawGeo(), flash, {}, true));
  headIn.add(head, eye, jawJ);
  headJ.add(headIn);
  const wings = [1, -1].map((s) => joint([0.06, 0.12, s * 0.15], mesh(kfWingGeo(s), flash, {}, true)));
  pose.add(bodyJ, headJ, ...wings);
  const dust = new Puffs(10, 0xfff2dc, { opacity: 0.85, radius: 3, cy: 0, detail: 0 });
  own.push(dust);
  root.add(pose, dust.mesh);
  root.userData.radius = 0.4;
  const clk = new Clock(), blink = new Blinker();
  let phase = Math.random() * TAU, sweep = 0, pitch = 0, jaw = 0, emit = 0;
  const update = (dt, st) => {
    let anim = st.anim ?? 'fly';
    if (!['fly', 'dive', 'defeated'].includes(anim)) anim = 'fly';
    clk.tick(dt, anim);
    const t = clk.t;
    const dive = anim === 'dive', dead = anim === 'defeated';
    const speed = num(st.speed, dive ? 6 : 2);
    phase += dt * TAU * (2.2 + speed * 0.12);
    // Flügelstellung (1 = oben, 0 = unten)
    const f = st.flap !== undefined ? clamp(num(st.flap, 0.5), 0, 1) : 0.5 + 0.5 * Math.sin(phase);
    sweep = damp(sweep, dive ? 1 : 0, 8, dt);
    pitch = damp(pitch, dive ? -0.55 : dead ? 0 : Math.sin(phase + 1.2) * 0.04, 6, dt);
    jaw = damp(jaw, dive ? 0.55 : dead ? 0.4 : Math.max(0, Math.sin(t * 7)) * 0.12 * ((t % 2.8) < 0.6 ? 1 : 0), 14, dt);
    const flapA = lerp(-0.55, 0.85, f) * (1 - sweep) + sweep * 0.25;
    if (!dead) {
      pose.position.set(0, (1 - sweep) * Math.sin(phase - 0.6) * 0.05, 0);
      pose.rotation.set(0, 0, pitch);
      wings.forEach((w, i) => {
        const s = i ? -1 : 1;
        w.position.set(0.06, 0.12, s * 0.15);
        w.rotation.set(-s * flapA, s * -sweep * 1.05, -sweep * 0.25);
        w.scale.setScalar(1);
      });
      bodyJ.position.set(0, 0, 0); bodyJ.rotation.set(0, 0, 0); bodyJ.scale.setScalar(1);
      headJ.position.set(0.16, 0.06 + Math.sin(phase) * 0.012, 0);
      headJ.rotation.set(0, 0, sweep * -0.25 + Math.sin(t * 1.3) * 0.05);
      headJ.scale.setScalar(1);
      pose.visible = true;
    } else {
      // klappert auseinander
      const p = prog(st, clk, 0.9);
      if (clk.entered) dust.burst([0, 0, 0], { count: 8, speed: 1.4, up: 0.6, size: 0.12, life: 0.7, spread: 0.2, force: true });
      const k = smoothstep(p), g = p * p * 1.6;
      const fade = Math.max(0.001, 1 - smoothstep((p - 0.55) / 0.45));
      headJ.position.set(0.16 + k * 0.45, 0.06 + k * 0.5 - g, 0);
      headJ.rotation.set(k * 2, 0, k * 3);
      headJ.scale.setScalar(fade);
      bodyJ.position.set(-k * 0.1, -g * 0.8, 0);
      bodyJ.rotation.set(0, 0, -k * 1.5);
      bodyJ.scale.setScalar(fade);
      wings.forEach((w, i) => {
        const s = i ? -1 : 1;
        w.position.set(0.06 - k * 0.2, 0.12 + k * 0.25 - g, s * (0.15 + k * 0.7));
        w.rotation.set(-s * (0.4 + k * 2.2), s * k, 0);
        w.scale.setScalar(fade);
      });
      pose.position.set(0, 0, 0);
      pose.rotation.set(0, 0, 0);
      pose.visible = p < 0.999;
    }
    jawJ.rotation.z = -jaw;
    dust.step(dt);
    emit -= dt;
    if (dive && emit <= 0) { dust.burst([-0.35, 0.05, 0], { count: 1, speed: 0.4, up: 0.2, size: 0.06, life: 0.4, spread: 0.1 }); emit = 0.08; }
    let bk = blink.update(dt);
    if (dead) bk = 0.12; else if (dive) bk = 1;
    eye.userData.blink(bk);
    eye.scale.setScalar(dive ? 1.15 : 1);
    flash.emissive.setScalar(0);
  };
  return makeModel('knochenflieger', root, update, own, { initial: 'fly' });
}

// =============================================================================================
// Platschfisch
// =============================================================================================
const PF = { c: [0, 0.3, 0], r: [0.4, 0.29, 0.27] };
const PF_EYES = [1, -1].map((s) => { const h = onEllipsoid(PF.c, PF.r, s * 0.42, 0.28); return { p: h.p.toArray(), r: 0.1, sy: 1.15, dir: h.n.clone().lerp(new THREE.Vector3(1, 0.1, 0), 0.3).toArray() }; });
/** Flammen-Silhouette (Fuß unten mittig, Höhe 1, drei Zungen). */
function flameFinShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0); s.quadraticCurveTo(-0.55, 0.45, -0.42, 0.62); s.quadraticCurveTo(-0.36, 0.42, -0.24, 0.38);
  s.quadraticCurveTo(-0.22, 0.75, -0.02, 1.0); s.quadraticCurveTo(0.02, 0.62, 0.14, 0.5); s.quadraticCurveTo(0.24, 0.66, 0.42, 0.72);
  s.quadraticCurveTo(0.32, 0.4, 0.5, 0); s.closePath();
  return s;
}
function pfGlowGeo(key) {
  const L = LAVA7[key];
  return cached(`w7:pf:glow:${key}`, () => {
    const b = new Build();
    // glühender Körper (unten hell)
    b.sphere(1, { v: (x, y, z, nx, ny) => mix(mix(L.white, L.hotter, smoothstep(ny * 1.4 + 0.9)), mix(L.hot, L.deep, smoothstep(ny * 1.6 - 0.3)), smoothstep(ny * 1.3 + 0.4)) }, { p: PF.c, s: [PF.r[0] * 0.985, PF.r[1] * 0.985, PF.r[2] * 0.985] }, 32, 22);
    // Rückenflosse: Kamm aus drei Flammenzungen (nach hinten geneigt)
    for (const [x, h, a] of [[0.06, 0.24, 0.35], [-0.08, 0.3, 0.5], [-0.22, 0.22, 0.7]]) {
      const g = flameGeo(key, 10).clone();
      b.add(g, { v: (px, py) => mix(L.hot, L.white, smoothstep(1 - py)) }, { p: [x, 0.52 - Math.abs(x) * 0.25, 0], r: [0, 0, a], s: [0.32, h, 0.22] });
    }
    return b.geometry();
  });
}
function pfCrustGeo(key) {
  const L = LAVA7[key];
  return cached(`w7:pf:crust:${key}`, () => {
    const b = new Build();
    const crustV = { v: (x, y, z, nx, ny, nz) => mix(W7.rockLow, W7.rockHi, smoothstep(nz * 0.5 + 0.5)) };
    // Basaltschollen über Rücken und Flanken (sechseckig, Fugen glühen durch); das Gesicht bleibt frei
    const plates = [[-0.9, 0.95, 0.1], [0.9, 0.95, 0.1], [3.14, 1.0, 0.1], [-1.75, 0.6, 0.11], [1.75, 0.6, 0.11], [-2.45, 0.55, 0.1], [2.45, 0.55, 0.1],
      [3.14, 0.45, 0.1], [-2.0, 0.05, 0.1], [2.0, 0.05, 0.1], [-2.7, -0.05, 0.09], [2.7, -0.05, 0.09], [-1.3, 0.25, 0.085], [1.3, 0.25, 0.085]];
    const rockV = { v: (x, y, z, nx, ny, nz) => mix(W7.rockLow, W7.rockHi, smoothstep(nz * 0.5 + 0.45)) };
    for (const [az, el, r] of plates) {
      const h = onEllipsoid(PF.c, PF.r, az, el);
      const g = new THREE.CylinderGeometry(1, 0.8, 1, 6); g.rotateX(Math.PI / 2); g.translate(0, 0, 0.5);
      stick(b, h, rockV, [r, r * 0.92, 0.05], 0.35, g, hash1(az * 3 + el) * 3);
    }
    // Krustenbrauen (grimmig-frech)
    for (const s of [1, -1]) {
      const h = onEllipsoid(PF.c, PF.r, s * 0.38, 0.62);
      b.capsule(0.03, 0.12, crustV, { p: h.p.clone().addScaledVector(h.n, 0.015).toArray(), r: [Math.PI / 2 - s * 0.5, -s * 0.38, 0], order: 'YXZ' }, 3, 10);
    }
    // dicke Goldlippen
    b.torus(0.075, 0.034, gradV(0xd8840a, 0xfff0a0), { p: [0.395, 0.25, 0], r: [0, Math.PI / 2, 0], s: [1, 0.72, 1.15] }, 10, 22);
    b.sphere(1, W7.mouth, { p: [0.4, 0.25, 0], s: [0.02, 0.035, 0.065] }, 10, 6);
    return b.geometry();
  });
}
const pfOpenGeo = () => cached('w7:pf:open', () => new Build().sphere(1, W7.mouth, { p: [0.41, 0.25, 0], s: [0.03, 0.075, 0.085] }, 12, 8).sphere(1, W7.tongue, { p: [0.415, 0.205, 0], s: [0.02, 0.025, 0.05] }, 8, 6).geometry());
function pfTailGeo(key) {
  const L = LAVA7[key];
  return cached(`w7:pf:tail:${key}`, () => {
    const b = new Build();
    const lobe = new THREE.Shape();
    lobe.moveTo(0, 0); lobe.quadraticCurveTo(-0.12, 0.14, -0.3, 0.24); lobe.quadraticCurveTo(-0.22, 0.12, -0.2, 0.06); lobe.quadraticCurveTo(-0.3, 0.02, -0.32, 0.0);
    lobe.quadraticCurveTo(-0.3, -0.02, -0.2, -0.06); lobe.quadraticCurveTo(-0.22, -0.12, -0.3, -0.24); lobe.quadraticCurveTo(-0.12, -0.14, 0, 0);
    b.add(puffyGeo(lobe, 0.03, 0.02, 10, 2), { v: (x, y) => mix(L.hot, L.white, smoothstep(Math.abs(y) / 0.24 * 0.6 + (-x) * 1.6 - 0.2)) }, {});
    return b.geometry();
  });
}
const pfPecGeo = (key) => cached(`w7:pf:pec:${key}`, () => new Build().add(puffyGeo(flameFinShape(), 0.03, 0.015, 6, 2), { v: (x, y) => mix(LAVA7[key].deep, LAVA7[key].hotter, smoothstep(y * 1.2)) }, { r: [0, 0, Math.PI / 2], s: [0.16, 0.14, 1] }).geometry());
function buildPlatschfisch(opts = {}) {
  const key = lavaKey(opts.color);
  const L = LAVA7[key];
  const root = new THREE.Group();
  const own = [];
  const glowMat = ownMat(glow7()), crustMat = ownMat(vcol(0.55), { emissive: 0x000000 });
  own.push(glowMat, crustMat);
  const pose = joint([0, PF.c[1], 0]);
  const inner = joint([0, -PF.c[1], 0]);
  const glowBody = mesh(pfGlowGeo(key), glowMat);
  const crust = mesh(pfCrustGeo(key), crustMat, {}, true);
  const eye = eyes(PF_EYES, { key: 'w7:pf', iris: key === 'blau' ? 0x2a6aff : 0xff5a10, pupil: 0.54, depth: 0.55 });
  const open = mesh(pfOpenGeo(), vcol(0.4));
  open.visible = false;
  const tail = joint([-0.38, 0.3, 0], mesh(pfTailGeo(key), glowMat));
  const pecs = instMesh(pfPecGeo(key), glowMat, 2, 1, 0.3);
  const fire = joint([0.46, 0.25, 0], mesh(flameGeo(key, 12), glow7(), { r: [0, 0, -Math.PI / 2], s: [0.32, 0.5, 0.32] }));
  fire.visible = false;
  inner.add(glowBody, crust, eye, open, tail, pecs, fire);
  pose.add(inner);
  const drops = new Puffs(10, L.hot, { opacity: 0.95, radius: 2.5, cy: 0.3, emissive: L.hot, detail: 0 });
  drops.gravity = 6;
  const steam = new Puffs(6, 0xe8e4ee, { opacity: 0.8, radius: 2, cy: 0.6 });
  own.push(drops, steam);
  const halo = glowSprite(L.glow, 1.4, 0.4);
  halo.position.y = 0.3;
  root.add(pose, drops.mesh, steam.mesh, halo);
  const clk = new Clock(), blink = new Blinker();
  let roll = 0, emit = 0, cool = 0, puff = 0;
  const hotC = new THREE.Color(1, 1, 1), coldC = new THREE.Color(0.3, 0.22, 0.24);
  const update = (dt, st) => {
    let anim = st.anim ?? 'swim';
    if (anim === 'idle') anim = 'swim';
    if (!['swim', 'jump', 'spit', 'defeated'].includes(anim)) anim = 'swim';
    clk.tick(dt, anim);
    const t = clk.t;
    const dead = anim === 'defeated';
    const speed = num(st.speed, anim === 'swim' ? 1.5 : 0);
    let pitch = 0, spread = 0, wag = Math.sin(t * (6 + speed * 3)) * 0.4, bob = Math.sin(t * 2.5) * 0.02, mouthOpen = false, fireOn = false;
    puff = damp(puff, 0, 8, dt);
    if (anim === 'jump') {
      const p = prog(st, clk, 1, true);
      pitch = (0.5 - p) * 1.6; spread = 1; wag = Math.sin(t * 18) * 0.35; bob = 0; mouthOpen = true;
      if ((p < 0.06 || p > 0.94) && emit <= 0) { drops.burst([0, 0.05, 0], { count: 4, speed: 1.6, up: 2.4, size: 0.06, life: 0.6, spread: 0.2 }); emit = 0.12; }
    } else if (anim === 'spit') {
      const p = prog(st, clk, 0.8);
      if (p < 0.45) { puff = Math.max(puff, smoothstep(p / 0.45)); pitch = 0.12 * smoothstep(p / 0.45); }
      else if (p < 0.7) { mouthOpen = true; fireOn = true; pitch = lerp(0.12, -0.15, smoothstep((p - 0.45) / 0.1)); }
      else pitch = lerp(-0.15, 0, smoothstep((p - 0.7) / 0.3));
    }
    cool = damp(cool, dead ? 1 : 0, 2, dt);
    roll = damp(roll, dead ? Math.PI : 0, 4, dt);
    pose.rotation.z = damp(pose.rotation.z, pitch, anim === 'jump' ? 20 : 10, dt);
    pose.rotation.x = roll;
    pose.position.y = PF.c[1] + bob - cool * 0.05;
    const ps = 1 + puff * 0.1;
    inner.scale.set(1 - puff * 0.04, ps, ps);
    tail.rotation.y = dead ? 0 : wag;
    for (let i = 0; i < 2; i++) {
      const s = i ? -1 : 1;
      const flap = dead ? 0 : Math.sin(t * 9 + i * Math.PI) * 0.3;
      _e.set(s * (0.6 + spread * 0.5 + flap), s > 0 ? -0.6 : Math.PI + 0.6, 0, 'YXZ');
      pecs.setMatrixAt(i, _m.compose(_v.set(0.02, 0.2, s * 0.25), _q.setFromEuler(_e), _s.setScalar(1)));
    }
    pecs.instanceMatrix.needsUpdate = true;
    open.visible = mouthOpen;
    fire.visible = fireOn;
    if (fireOn) fire.scale.set(1, 0.8 + Math.sin(t * 40) * 0.15, 1);
    // Glut: pulsiert, kühlt beim Besiegen ab
    const pulse = 0.92 + Math.sin(t * 5) * 0.08;
    glowMat.color.copy(coldC).lerp(hotC, 1 - cool).multiplyScalar(dead ? 1 : pulse);
    halo.material.opacity !== undefined && (halo.visible = cool < 0.7);
    crustMat.emissive.setRGB(0, 0, 0);
    emit -= dt;
    if (anim === 'swim' && emit <= 0 && (t % 1.6) < 0.05) { drops.burst([-0.3, 0.45, 0], { count: 2, speed: 0.6, up: 1.4, size: 0.04, life: 0.6, spread: 0.1 }); emit = 0.3; }
    if (dead && emit <= 0) { steam.burst([0, 0.5, 0], { count: 2, speed: 0.5, up: 1.2, size: 0.14, life: 0.8, spread: 0.2 }); emit = 0.2; }
    drops.step(dt); steam.step(dt);
    let bk = blink.update(dt);
    if (dead) bk = 0.1; else if (anim === 'jump') bk = 1; else if (anim === 'spit') bk = 0.8;
    eye.userData.blink(bk);
    eye.scale.setScalar(anim === 'jump' ? 1.1 : 1);
  };
  const model = makeModel('platschfisch', root, update, [...own, pecs], { initial: 'swim' });
  model.mouth = (out = new THREE.Vector3()) => { root.updateMatrixWorld(true); return inner.localToWorld(out.set(0.5, 0.25, 0)); };
  return model;
}

// =============================================================================================
// Lavadrache
// =============================================================================================
const LD = { body: 0x6a2ac0, hi: 0xa878f4, low: 0x2a0e62, belly: 0xffc23a, bellyHi: 0xfff2a0, bellyLow: 0xff7a1a, horn: 0xffc21a, hornHi: 0xfff2b0, frill: 0xff7a1a, frillHi: 0xffd84a, snout: 0x8a4ad8 };
const scaleV = { v: (x, y, z, nx, ny) => mix(LD.low, mix(LD.body, LD.hi, smoothstep(ny * 0.6 + 0.2) * 0.6), smoothstep(ny * 0.5 + 0.6)) };
/** Halsglied (Radius 1, Achse +Y, Bauch nach +X): Schuppenkugel, glühende Bauchplatte, Flammenkamm hinten. */
function ldSegGeo() {
  return cached('w7:ld:seg', () => {
    const b = new Build();
    // Schuppenkugel (leicht gestreckt), vorn eine schmale, gerippte Bauchplatte
    b.sphere(1, { v: (x, y, z, nx, ny, nzz) => {
      const belly = smoothstep((nx - 0.55) / 0.2);
      const rib = Math.abs(y) < 0.25 ? 1 : 0.86;
      const sc = mix(LD.low, LD.body, smoothstep(-nx * 0.35 + ny * 0.3 + 0.6));
      return mix(mix(sc, LD.hi, smoothstep(Math.abs(nzz) * 0.8 - 0.25) * 0.35), mix(LD.bellyLow, LD.bellyHi, rib * smoothstep(ny * 0.4 + 0.6)), belly);
    } }, { s: [1, 1.08, 1] }, 16, 10);
    // Flammenkamm (Rücken, −X), nach oben geneigt
    b.add(new THREE.ConeGeometry(0.34, 0.8, 8), { v: (x, y) => mix(LD.frill, LD.frillHi, smoothstep(y / 0.8 + 0.5)) }, { p: [-1.0, 0.2, 0], r: [0, 0, Math.PI / 2 + 0.75], s: [1, 1, 0.42] });
    // Tupfen an den Flanken
    for (const s of [1, -1]) {
      const g = new THREE.SphereGeometry(1, 8, 3, 0, TAU, 0, Math.PI / 2); g.rotateX(Math.PI / 2);
      stick(b, onEllipsoid([0, 0, 0], [1, 1.08, 1], s * 1.85, 0.15), LD.hi, [0.24, 0.22, 0.06], 0.3, g);
    }
    return b.geometry();
  });
}
const LD_HEAD = { c: [0.12, 0.06, 0], r: [0.34, 0.3, 0.31] };
const LD_EYES = [1, -1].map((s) => { const h = onEllipsoid(LD_HEAD.c, LD_HEAD.r, s * 0.5, 0.32); return { p: h.p.toArray(), r: 0.105, sy: 1.15, dir: h.n.clone().lerp(new THREE.Vector3(1, 0.15, 0), 0.35).toArray() }; });
function ldHeadGeo() {
  return cached('w7:ld:head', () => {
    const b = new Build();
    b.sphere(1, { v: (x, y, z, nx, ny) => (ny < -0.45 && nx > -0.3 ? mix(LD.bellyLow, LD.bellyHi, smoothstep(-ny - 0.3)) : scaleV.v(x, y, z, nx, ny)) }, { p: LD_HEAD.c, s: LD_HEAD.r }, 24, 18);
    // runde Stupsschnauze mit Nasenlöchern, Oberkiefer
    b.sphere(1, { v: (x, y, z, nx, ny) => (ny < -0.55 ? col(LD.bellyHi) : mix(LD.body, LD.hi, smoothstep(ny * 0.6 + 0.3))) }, { p: [0.42, -0.02, 0], s: [0.24, 0.16, 0.22] }, 18, 12);
    for (const s of [1, -1]) {
      b.sphere(1, LD.low, { p: [0.63, 0.06, s * 0.07], s: [0.025, 0.03, 0.035] }, 6, 4);
      b.cone(0.03, 0.07, 0xffffff, { p: [0.58, -0.17, s * 0.11], r: [Math.PI, 0, 0] }, 6); // Zähnchen oben
    }
    // goldene Hörnchen (nach hinten-oben gebogen)
    for (const s of [1, -1]) {
      b.add(taperTube([[0.02, 0.28, s * 0.15], [-0.08, 0.42, s * 0.2], [-0.22, 0.5, s * 0.22], [-0.33, 0.49, s * 0.21]], (t) => 0.06 * (1 - t * 0.85) + 0.006, 14, 8), { v: (x, y) => mix(LD.horn, LD.hornHi, smoothstep((y - 0.3) / 0.2)) });
      // Flammen-Ohrfächer
      const fan = new THREE.Shape();
      fan.moveTo(0, 0); fan.quadraticCurveTo(-0.1, 0.18, -0.3, 0.2); fan.quadraticCurveTo(-0.2, 0.1, -0.34, 0.04); fan.quadraticCurveTo(-0.2, -0.02, -0.3, -0.14); fan.quadraticCurveTo(-0.1, -0.12, 0, 0);
      b.add(puffyGeo(fan, 0.03, 0.015, 8, 2), { v: (x) => mix(LD.frill, LD.frillHi, smoothstep(-x / 0.34)) }, { p: [0.0, 0.1, s * 0.3], r: [s * 0.35, s * 0.5, 0], order: 'YXZ' });
      // Brauenwulst
      const h = onEllipsoid(LD_HEAD.c, LD_HEAD.r, s * 0.48, 0.66);
      b.capsule(0.035, 0.13, LD.low, { p: h.p.clone().addScaledVector(h.n, 0.01).toArray(), r: [Math.PI / 2 - s * 0.4, -s * 0.35, 0], order: 'YXZ' }, 3, 10);
      // Wangentupfen
      stick(b, onEllipsoid(LD_HEAD.c, LD_HEAD.r, s * 0.95, -0.1), 0xff8ab8, [0.06, 0.04, 0.02], 0.3);
    }
    // kleiner Flammenkamm auf dem Kopf
    for (let i = 0; i < 3; i++) b.cone(0.07 - i * 0.012, 0.2 - i * 0.03, { v: (x, y) => mix(LD.frill, LD.frillHi, smoothstep(y / 0.2 + 0.5)) }, { p: [-0.08 - i * 0.12, 0.34 - i * 0.05, 0], r: [0, 0, 0.5 + i * 0.2], s: [1, 1, 0.5] }, 8);
    return b.geometry();
  });
}
const ldJawGeo = () => cached('w7:ld:jaw', () => {
  const b = new Build();
  b.sphere(1, { v: (x, y, z, nx, ny) => mix(LD.bellyLow, LD.bellyHi, smoothstep(-ny * 0.5 + 0.4)) }, { p: [0.2, -0.04, 0], s: [0.26, 0.08, 0.18] }, 20, 12);
  b.sphere(1, W7.mouth, { p: [0.22, 0.02, 0], s: [0.2, 0.025, 0.13] }, 14, 6);
  b.sphere(1, W7.tongue, { p: [0.2, 0.035, 0], s: [0.14, 0.02, 0.07] }, 12, 6);
  for (const s of [1, -1]) b.cone(0.022, 0.06, 0xffffff, { p: [0.38, 0.04, s * 0.07] }, 6);
  return b.geometry();
});
function buildLavadrache(opts = {}) {
  const key = lavaKey(opts.color);
  const L = LAVA7[key];
  const N = clamp(Math.round(num(opts.segments, 7)), 3, 12);
  const root = new THREE.Group();
  const own = [];
  const flash = ownMat(vcol(0.3), { emissive: 0x000000 });
  own.push(flash);
  // Hals-Kurve (fest): reicht tief unter die Oberfläche, damit die Glieder aus der Lava gleiten
  const curve = new THREE.CatmullRomCurve3([[0, -4.2, 0], [0, -2, 0], [0, 0.2, 0], [-0.3, 1.25, 0], [0.02, 2.15, 0], [0.5, 2.7, 0], [0.95, 2.85, 0]].map((p) => new THREE.Vector3(...p)));
  const Ltot = curve.getLength();
  const segR = (i) => lerp(0.3, 0.42, i / Math.max(1, N - 1));
  const spacing = 0.44;
  const neckLen = N * spacing + 0.2;
  const aTop = Ltot - 0.02;                        // Kopf-Anschluss bei voll aufgetaucht
  const segs = instMesh(ldSegGeo(), flash, N, 6, 1.5);
  segs.castShadow = true;
  const headJ = joint();
  const head = mesh(ldHeadGeo(), flash, {}, true);
  const eye = eyes(LD_EYES, { key: 'w7:ld', iris: 0xffa01a, pupil: 0.56, depth: 0.55 });
  const jawJ = joint([0.2, -0.13, 0], mesh(ldJawGeo(), flash, {}, true));
  const fire = joint([0.72, -0.05, 0], mesh(flameGeo(key, 12), glow7(), { r: [0, 0, -Math.PI / 2], s: [0.5, 0.85, 0.5] }));
  fire.visible = false;
  headJ.add(head, eye, jawJ, fire);
  const ringMat = ownMat(glow7T(0.9));
  own.push(ringMat);
  const ring = mesh(lavaRingGeo(key), ringMat);
  const bubbles = new Puffs(10, L.hotter, { opacity: 0.95, radius: 3, cy: 0.5, emissive: L.hot, detail: 0 });
  const steam = new Puffs(6, 0xeee8f4, { opacity: 0.8, radius: 4, cy: 2 });
  own.push(bubbles, steam);
  const halo = glowSprite(L.glow, 2.2, 0.5);
  halo.position.y = 0.2;
  const dizzy = dizzyStars(0.42, 0.1);
  root.add(segs, headJ, ring, bubbles.mesh, steam.mesh, halo, dizzy);
  const clk = new Clock(), blink = new Blinker();
  let rise = 0, emit = 0, jaw = 0, recoil = 0, sway = 0, worry = 0;
  const T = new THREE.Vector3(), F = new THREE.Vector3(), U = new THREE.Vector3(), Sd = new THREE.Vector3(), P = new THREE.Vector3();
  const basis = new THREE.Matrix4();
  const headPos = new THREE.Vector3();
  root.userData.rise = 0;
  root.userData.head = (out = new THREE.Vector3()) => { root.updateMatrixWorld(true); return headJ.localToWorld(out.set(0.15, 0.05, 0)); };
  const frameAt = (a, out) => {
    const u = clamp(a / Ltot, 0, 1);
    curve.getPointAt(u, out);
    curve.getTangentAt(u, T).normalize();
    return out;
  };
  const update = (dt, st) => {
    let anim = st.anim ?? 'hidden';
    if (!['hidden', 'rise', 'spit', 'sink', 'defeated', 'idle'].includes(anim)) anim = 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    let target;
    if (st.rise !== undefined) target = clamp(num(st.rise, 0), 0, 1);
    else if (anim === 'hidden') target = 0;
    else if (anim === 'rise') target = smoothstep(prog(st, clk, 1.0));
    else if (anim === 'sink') target = 1 - smoothstep(prog(st, clk, 0.8));
    else if (anim === 'defeated') target = 1 - smoothstep((prog(st, clk, 1.6) - 0.35) / 0.65);
    else target = 1;
    rise = st.rise !== undefined || anim === 'rise' || anim === 'sink' || anim === 'defeated' ? target : damp(rise, target, 5, dt);
    root.userData.rise = rise;
    // Ausholen / Vorstoßen beim Speien
    let rc = 0, jw = 0.04 + Math.max(0, Math.sin(t * 1.7)) * 0.05, fireOn = false;
    if (anim === 'spit') {
      const p = prog(st, clk, 1.0);
      if (p < 0.4) rc = -smoothstep(p / 0.4) * 0.35;
      else if (p < 0.55) { rc = lerp(-0.35, 0.25, smoothstep((p - 0.4) / 0.15)); jw = 0.6; }
      else { rc = lerp(0.25, 0, smoothstep((p - 0.55) / 0.45)); jw = p < 0.75 ? 0.6 : 0.1; }
      fireOn = p >= 0.45 && p < 0.72;
    }
    if (anim === 'defeated') jw = 0.25;
    recoil = damp(recoil, rc, 14, dt);
    jaw = damp(jaw, jw, 16, dt);
    sway = Math.sin(t * 1.4) * 0.12 * rise;
    worry = damp(worry, anim === 'defeated' ? 1 : 0, 6, dt);
    // Glieder entlang der Kurve; Kopf-Anschluss wandert mit rise nach oben
    const aHead = aTop - (1 - rise) * (neckLen + 3.0) + recoil * 0.6;
    for (let i = 0; i < N; i++) {
      const a = aHead - (i + 0.6) * spacing;
      frameAt(a, P);
      const r = segR(i) * (1 + Math.sin(t * 3 - i * 0.7) * 0.03);
      P.z += Math.sin(t * 1.4 - i * 0.5) * 0.12 * rise * (1 - i / N);
      if (P.y < -r * 0.9) { segs.setMatrixAt(i, ZERO); continue; }
      F.set(1, 0, 0).addScaledVector(T, -T.x).normalize();
      Sd.crossVectors(F, T).normalize();
      basis.makeBasis(F, T, Sd);
      _q.setFromRotationMatrix(basis);
      segs.setMatrixAt(i, _m.compose(P, _q, _s.set(r, r, r)));
    }
    segs.instanceMatrix.needsUpdate = true;
    // Kopf
    frameAt(aHead, headPos);
    headPos.z += sway * 0.8;
    F.copy(T);
    const upw = smoothstep(F.x * 1.4);
    U.set(-1, 0, 0).lerp(_v2.set(0, 1, 0), upw).addScaledVector(F, -0).normalize();
    U.addScaledVector(F, -U.dot(F)).normalize();
    Sd.crossVectors(F, U).normalize();
    basis.makeBasis(F, U, Sd);
    headJ.quaternion.setFromRotationMatrix(basis);
    _q.setFromEuler(_e.set(0, 0, -0.18 * upw + recoil * -0.4 + (anim === 'defeated' ? -0.3 : 0)));
    headJ.quaternion.multiply(_q);
    headJ.position.copy(headPos);
    const hs = headPos.y > -0.3 ? 1 : 0.001;
    headJ.scale.setScalar(hs);
    headJ.visible = headPos.y > -0.6;
    jawJ.rotation.z = -jaw;
    fire.visible = fireOn;
    if (fireOn) fire.scale.set(1, 0.85 + Math.sin(t * 40) * 0.15, 1);
    // Oberfläche: Glutring, Blasen, Schein
    const surf = anim === 'hidden' ? 0.6 + Math.sin(t * 4) * 0.2 : rise > 0.02 && rise < 0.98 ? 1 : 0.45;
    ring.scale.setScalar(0.45 + (1 - rise) * 0.15 + Math.sin(t * 3) * 0.04);
    ring.position.y = 0.02;
    ringMat.opacity = 0.9 * surf;
    halo.material.opacity !== undefined && (halo.scale.setScalar(1.8 + surf * 0.8));
    emit -= dt;
    if (emit <= 0) {
      if (anim === 'hidden') { bubbles.burst([Math.sin(t * 7) * 0.3, 0.05, Math.cos(t * 5) * 0.3], { count: 1, speed: 0.4, up: 0.9, size: 0.08, life: 0.6, spread: 0.1 }); emit = 0.18; }
      else if (anim === 'rise' || anim === 'sink') { bubbles.burst([0, 0.05, 0], { count: 3, speed: 1.6, up: 2, size: 0.1, life: 0.6, spread: 0.3 }); emit = 0.08; }
      else if (anim === 'defeated') { steam.burst(headPos.toArray(), { count: 2, speed: 0.6, up: 1.4, size: 0.25, life: 0.9, spread: 0.2 }); emit = 0.12; }
    }
    bubbles.step(dt); steam.step(dt);
    let bk = blink.update(dt);
    if (anim === 'defeated') bk = 0.1; else if (anim === 'spit') bk = 0.85; else if (anim === 'rise') bk = 1;
    eye.userData.blink(bk);
    dizzy.visible = anim === 'defeated' && headJ.visible;
    if (dizzy.visible) { dizzy.position.copy(headPos).add(_v3.set(0, 0.45, 0)); dizzy.rotation.y = t * 3.5; }
    flash.emissive.setRGB(0, 0, 0);
  };
  const model = makeModel('lavadrache', root, update, [...own, segs], { initial: 'hidden' });
  model.mouth = (out = new THREE.Vector3()) => { root.updateMatrixWorld(true); return headJ.localToWorld(out.set(0.78, -0.05, 0)); };
  return model;
}

// =============================================================================================
// Wutkaulquappe
// =============================================================================================
const WK = { body: 0xff4a2a, hi: 0xff9a6a, low: 0xb8180e, belly: 0xffd84a, bellyHi: 0xfff2a0, spot: 0x8a0e14, fin: 0xff7a5a, finHi: 0xffd0b8, brow: 0x5a0a10 };
const WK_C = [0.04, 0, 0], WK_R = [0.25, 0.21, 0.21];
const WK_EYES = [1, -1].map((s) => { const h = onEllipsoid(WK_C, WK_R, s * 0.48, 0.3); return { p: h.p.toArray(), r: 0.085, sy: 1.12, dir: h.n.clone().lerp(new THREE.Vector3(1, 0.1, 0), 0.3).toArray() }; });
function wkBodyGeo() {
  return cached('w7:wk:body', () => {
    const b = new Build();
    b.sphere(1, { v: (x, y, z, nx, ny) => mix(mix(WK.low, WK.body, smoothstep(ny * 0.6 + 0.6)), mix(WK.belly, WK.bellyHi, smoothstep(-ny)), smoothstep((-ny - 0.1) / 0.35)) }, { p: WK_C, s: WK_R }, 32, 24);
    // Sommersprossen
    for (const [az, el] of [[2.4, 0.6], [-2.4, 0.6], [2.9, 0.3], [-2.9, 0.3], [1.9, 0.45], [-1.9, 0.45], [3.1, 0.75], [2.2, 0.15], [-2.2, 0.15]]) stick(b, onEllipsoid(WK_C, WK_R, az, el), WK.spot, [0.025, 0.025, 0.01], 0.3);
    // Schmollmund (nach unten gebogen) und Backen
    b.torus(0.045, 0.012, W7.mouth, { p: [0.285, -0.045, 0], r: [0, Math.PI / 2, 0], s: [1, 0.7, 1] }, 6, 12, Math.PI);
    for (const s of [1, -1]) stick(b, onEllipsoid(WK_C, WK_R, s * 0.75, -0.15), 0xff8aa0, [0.05, 0.035, 0.015], 0.3);
    // kleine Kiemenbüschel
    for (const s of [1, -1]) for (let k = 0; k < 3; k++) b.sphere(0.025, WK.fin, { p: [-0.06 + k * 0.03, 0.03 - k * 0.04, s * 0.21] }, 8, 6);
    return b.geometry();
  });
}
/** Flossenstück (Wurzel bei x = 0, reicht bis x = −1, Höhe ±0,5, Dicke ±0,1) – je Stück skaliert. */
const wkFinGeo = () => cached('w7:wk:fin', () => new Build().sphere(1, { v: (x, y, z, nx, ny) => mix(WK.fin, WK.finHi, smoothstep(Math.abs(y) * 1.6 + (-x) * 0.6 - 0.2)) }, { p: [-0.5, 0, 0], s: [0.5, 0.5, 0.1] }, 18, 12).geometry());
const WK_TAIL = [[0.19, 0.24, 0.36], [0.17, 0.31, 0.3], [0.16, 0.38, 0.24]];
const wkOGeo = () => cached('w7:wk:o', () => new Build().torus(0.05, 0.018, WK.low, { p: [0.29, -0.03, 0], r: [0, Math.PI / 2, 0] }, 8, 16).sphere(1, W7.mouth, { p: [0.288, -0.03, 0], s: [0.015, 0.045, 0.045] }, 10, 6).geometry());
function wkSpikesGeo() {
  return cached('w7:wk:spikes', () => {
    const b = new Build();
    for (const d of fibDirs(22, 0.3)) {
      if (d.x > 0.55 && Math.abs(d.y) < 0.6) continue;   // Gesicht frei
      const p = new THREE.Vector3(WK_C[0] + d.x * WK_R[0], d.y * WK_R[1], d.z * WK_R[2]);
      b.add(spikeCone(0.03, 0.09, 6), { v: (x, y, z) => mix(WK.bellyHi, 0xffffff, smoothstep(z / 0.09)) }, placed(p.addScaledVector(d, -0.01), d, new THREE.Vector3(1, 1, 1)));
    }
    return b.geometry();
  });
}
function buildWutkaulquappe() {
  const root = new THREE.Group();
  const own = [];
  const flash = ownMat(vcol(0.28), { emissive: 0x000000 });
  own.push(flash);
  const pose = joint();
  const bodyJ = joint();
  const body = mesh(wkBodyGeo(), flash, {}, true);
  const spikes = mesh(wkSpikesGeo(), vcol(0.3), {}, true);
  const eye = eyes(WK_EYES, { key: 'w7:wk', iris: 0x3a8a1a, pupil: 0.6, depth: 0.55 });
  const brows = instMesh(cached('w7:wk:brow', () => new Build().capsule(0.022, 0.08, WK.brow, { r: [Math.PI / 2, 0, 0] }, 3, 8).geometry()), vcol(0.5), 2, 1, 0.2);
  const oMouth = mesh(wkOGeo(), vcol(0.4));
  bodyJ.add(body, spikes, eye, brows, oMouth);
  const tail = instMesh(wkFinGeo(), flash, 3, 1.5, 0);
  tail.castShadow = true;
  pose.add(bodyJ, tail);
  const bubbles = new Puffs(10, 0xe0f8ff, { opacity: 0.7, radius: 2, cy: 0.2 });
  own.push(bubbles);
  const dizzy = dizzyStars(0.24, 0.06);
  root.add(pose, bubbles.mesh, dizzy);
  const clk = new Clock(), blink = new Blinker();
  let phase = Math.random() * TAU, puff = 0, flip = 0, lean = 0, angry = 0.6, emit = 0;
  root.userData.radius = 0.22;
  const BR = WK_EYES.map((e, i) => ({ p: new THREE.Vector3(e.p[0] - 0.01, e.p[1] + 0.08, e.p[2] * 0.95), s: i ? -1 : 1 }));
  const update = (dt, st) => {
    let anim = st.anim ?? 'swim';
    if (anim === 'idle') anim = 'swim';
    if (!['swim', 'charge', 'puff', 'defeated'].includes(anim)) anim = 'swim';
    clk.tick(dt, anim);
    const t = clk.t;
    const dead = anim === 'defeated', charge = anim === 'charge';
    const speed = num(st.speed, charge ? 3 : 1);
    phase += dt * (charge ? 22 : 9 + speed * 2);
    const pt = st.puff !== undefined ? clamp(num(st.puff, 0), 0, 1) : anim === 'puff' ? smoothstep(prog(st, clk, 0.4)) : 0;
    puff = st.puff !== undefined || anim === 'puff' ? pt : damp(puff, 0, 5, dt);
    flip = damp(flip, dead ? Math.PI : 0, 5, dt);
    lean = damp(lean, charge ? -0.22 : 0, 8, dt);
    angry = damp(angry, charge || anim === 'puff' ? 1 : dead ? 0 : 0.6, 10, dt);
    // Körper bläht sich zur Kugel
    const k = 1 + puff * 0.65;
    bodyJ.scale.set(k * (1 - puff * 0.12), k * (1 + puff * 0.12), k * (1 + puff * 0.1));
    spikes.scale.setScalar(Math.max(0.001, smoothstep((puff - 0.3) / 0.7)));
    spikes.visible = puff > 0.3;
    root.userData.radius = 0.22 + puff * 0.18;
    pose.rotation.set(flip, 0, lean + (dead ? 0 : Math.sin(phase * 0.5) * 0.04));
    pose.position.y = Math.sin(t * 2) * 0.03 + (dead ? smoothstep(prog(st, clk, 1.0)) * 0.25 : 0);
    // Schwanz (Kette aus drei Flossenstücken)
    const amp = (charge ? 0.55 : 0.35) * (1 - puff * 0.6);
    const shrink = 1 - puff * 0.3;
    _v.set(WK_C[0] - WK_R[0] * k * 0.8, 0, 0);
    let ang = 0;
    for (let i = 0; i < 3; i++) {
      ang += Math.sin(phase - i * 0.9) * amp;
      const [len, hgt, th] = WK_TAIL[i];
      _e.set(0, ang, 0);
      tail.setMatrixAt(i, _m.compose(_v, _q.setFromEuler(_e), _s.set(len * shrink, hgt * shrink, th)));
      _v.x -= Math.cos(ang) * len * shrink * 0.8;
      _v.z += Math.sin(ang) * len * shrink * 0.8;
    }
    tail.instanceMatrix.needsUpdate = true;
    // Brauen
    for (const b of BR) {
      _e.set(-b.s * (angry * 0.6 - (dead ? 0.4 : 0)), -b.s * 0.35, 0, 'YXZ');
      brows.setMatrixAt(b.s > 0 ? 0 : 1, _m.compose(_v.copy(b.p).setY(b.p.y - angry * 0.012), _q.setFromEuler(_e), _s.setScalar(1)));
    }
    brows.instanceMatrix.needsUpdate = true;
    oMouth.visible = puff > 0.25 || charge;
    // Bläschen
    emit -= dt;
    if (emit <= 0) {
      if (charge) { bubbles.burst([-0.3, 0, 0], { count: 2, speed: 0.6, up: 0.4, size: 0.04, life: 0.6, spread: 0.06 }); emit = 0.08; }
      else if (anim === 'puff' && clk.age < 0.3) { bubbles.burst([0.35, 0, 0], { count: 3, speed: 0.8, up: 0.5, size: 0.05, life: 0.6, spread: 0.1 }); emit = 0.15; }
      else if (dead) { bubbles.burst([0, 0.1, 0], { count: 2, speed: 0.4, up: 0.8, size: 0.05, life: 0.8, spread: 0.15 }); emit = 0.2; }
      else if ((t % 2.4) < 0.05) { bubbles.burst([0.3, 0.05, 0], { count: 1, speed: 0.2, up: 0.6, size: 0.035, life: 1, spread: 0.02 }); emit = 0.3; }
    }
    bubbles.step(dt);
    // Besiegt: schrumpft nach 0,5 s weg
    const gone = dead ? smoothstep((prog(st, clk, 1.0) - 0.5) / 0.5) : 0;
    pose.scale.setScalar(Math.max(0.001, 1 - gone));
    pose.visible = gone < 0.99;
    let bk = blink.update(dt);
    if (dead) bk = 0.1; else if (charge) bk = 0.78; else if (puff > 0.5) bk = 1;
    eye.userData.blink(bk);
    eye.scale.setScalar(1 + puff * 0.15);
    dizzy.visible = dead && gone < 0.6;
    if (dizzy.visible) { dizzy.position.set(0.05, 0.32 + pose.position.y, 0); dizzy.rotation.y = t * 4; }
  };
  return makeModel('wutkaulquappe', root, update, [...own, brows, tail], { initial: 'swim' });
}

// =============================================================================================
// Funkenflämmchen
// =============================================================================================
const FF_PROF = [[0, 0], [0.12, 0.008], [0.19, 0.05], [0.215, 0.13], [0.205, 0.22], [0.17, 0.31], [0.12, 0.4], [0.075, 0.47], [0.035, 0.53], [0, 0.565]];
function ffBodyGeo(key) {
  const C = key === 'blau' ? [0xeaffff, 0x6ad0ff, 0x2a6aff, 0x2a2ad8] : [0xfffbe0, 0xffd23a, 0xff7a1a, 0xe8321a];
  return cached(`w7:ff:body:${key}`, () => {
    const b = new Build();
    const g = new THREE.LatheGeometry(smoothProfile(FF_PROF, 3).map(([x, y]) => new THREE.Vector2(x, y)), 36);
    // Spitze rollt sich nach hinten (−X) ein
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const y = P.getY(i), k = smoothstep((y - 0.28) / 0.29);
      P.setX(i, P.getX(i) - k * k * 0.13 + Math.sin(k * 3) * 0.0);
      P.setY(i, y - k * k * 0.03);
    }
    g.computeVertexNormals();
    b.add(g, { v: (x, y, z, nx) => {
      const h = y / 0.56;
      const base = h < 0.35 ? mix(C[0], C[1], smoothstep(h / 0.35)) : h < 0.7 ? mix(C[1], C[2], smoothstep((h - 0.35) / 0.35)) : mix(C[2], C[3], smoothstep((h - 0.7) / 0.3));
      return mix(base, C[0], smoothstep(nx * 0.8 - 0.2) * (1 - h) * 0.7);
    } });
    return b.geometry();
  });
}
const ffMouthGeo = () => cached('w7:ff:mouth', () => {
  const b = new Build();
  b.add(puffyGeo(mouthShape('grin'), 0.03, 0.01, 12, 2), W7.mouth, { p: [0.205, 0.12, 0], r: [0, Math.PI / 2, 0], s: [0.06, 0.05, 1] });
  b.sphere(1, W7.tongue, { p: [0.205, 0.1, 0], s: [0.01, 0.018, 0.035] }, 8, 6);
  return b.geometry();
});
function buildFunkenflaemmchen(opts = {}) {
  const key = lavaKey(opts.color);
  const root = new THREE.Group();
  const own = [];
  const bodyMat = ownMat(glow7());
  own.push(bodyMat);
  const pose = joint();
  const sq = joint();
  const body = mesh(ffBodyGeo(key), bodyMat);
  const eye = eyes([1, -1].map((s) => ({ p: [0.17, 0.21, s * 0.075], r: 0.062, sy: 1.25, dir: [1, 0.05, s * 0.35] })), { key: 'w7:ff', iris: key === 'blau' ? 0x1a3ad8 : 0xc8320a, pupil: 0.6, depth: 0.5 });
  const mouthM = mesh(ffMouthGeo(), vcol(0.4));
  const tongues = instMesh(flameGeo(key, 10), bodyMat, 4, 1, 0.4);
  sq.add(body, eye, mouthM, tongues);
  pose.add(sq);
  const halo = glowSprite(key === 'blau' ? 0x3a8aff : 0xff7a1a, 1.1, 0.6);
  halo.position.y = 0.25;
  pose.add(halo);
  const embers = new Puffs(8, key === 'blau' ? 0x8ad8ff : 0xffb02a, { opacity: 0.95, radius: 2, cy: 0.4, emissive: key === 'blau' ? 0x2a6aff : 0xff6a10, detail: 0 });
  const smoke = new Puffs(8, 0xb8b0bc, { opacity: 0.85, radius: 2, cy: 0.4 });
  own.push(embers, smoke);
  root.add(pose, embers.mesh, smoke.mesh);
  const clk = new Clock(), blink = new Blinker();
  let emit = 0, gone = 0;
  const TONG = [[-0.05, 0.36, 0.1, 0.5], [-0.08, 0.32, -0.11, -0.5], [-0.15, 0.22, 0.12, 0.9], [-0.16, 0.2, -0.13, -0.9]];
  const update = (dt, st) => {
    let anim = st.anim ?? 'hop';
    if (!['hop', 'idle', 'defeated'].includes(anim)) anim = 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    const H = Math.max(0, num(st.height, 0.45));
    let y = 0, sy = 1, lean = 0;
    if (anim === 'hop') {
      const p = prog(st, clk, 0.6, true);
      if (p < 0.18) sy = 1 - Math.sin(p / 0.18 * Math.PI) * 0.28;
      else if (p < 0.86) { const k = (p - 0.18) / 0.68; y = Math.sin(k * Math.PI) * H; sy = 1 + Math.sin(k * Math.PI) * 0.14 * (k < 0.5 ? 1 : 0.4); lean = (0.5 - k) * 0.25; }
      else sy = 1 - Math.sin((p - 0.86) / 0.14 * Math.PI) * 0.22;
    } else if (anim === 'idle') { sy = 1 + Math.sin(t * 9) * 0.05; y = Math.abs(Math.sin(t * 4.5)) * 0.03; }
    pose.position.y = y;
    sq.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
    sq.rotation.z = lean + Math.sin(t * 13) * 0.03;
    body.scale.set(1 + Math.sin(t * 17) * 0.03, 1 + Math.sin(t * 11 + 1) * 0.04, 1);
    for (let i = 0; i < 4; i++) {
      const [x, yy, z, a] = TONG[i];
      const fl = 0.85 + Math.sin(t * (14 + i * 3) + i) * 0.2;
      _e.set(a * 0.5, 0, 0.6 + Math.sin(t * 9 + i) * 0.15);
      tongues.setMatrixAt(i, _m.compose(_v.set(x, yy, z), _q.setFromEuler(_e), _s.set(0.12, 0.2 * fl, 0.12)));
    }
    tongues.instanceMatrix.needsUpdate = true;
    if (anim === 'defeated') {
      const p = prog(st, clk, 0.6);
      if (clk.entered) smoke.burst([0, 0.3, 0], { count: 8, speed: 1.2, up: 0.9, size: 0.2, life: 0.8, spread: 0.2, force: true });
      gone = smoothstep(p * 1.5);
    } else gone = 0;
    pose.scale.setScalar(Math.max(0.001, 1 - gone));
    pose.visible = gone < 0.99;
    halo.scale.setScalar(1.1 + Math.sin(t * 12) * 0.08);
    emit -= dt;
    if (emit <= 0 && anim !== 'defeated') { embers.burst([-0.05, 0.45 + y, 0], { count: 1, speed: 0.4, up: 1.0, size: 0.03, life: 0.6, spread: 0.12 }); emit = 0.12; }
    embers.step(dt); smoke.step(dt);
    let bk = blink.update(dt);
    if (anim === 'defeated') bk = 0.1;
    eye.userData.blink(bk);
  };
  return makeModel('funkenflaemmchen', root, update, [...own, tongues], { initial: 'hop' });
}

// =============================================================================================
// Blaue Feuerkugel
// =============================================================================================
function buildFeuerkugelBlau() {
  const root = new THREE.Group();
  const fb = fireballSet('blau', 1); fb.position.y = 0.18;
  root.add(fb);
  const clk = new Clock();
  return makeModel('feuerkugel_blau', root, (dt, st) => { clk.tick(dt, st.anim ?? 'idle'); fb.userData.anim(clk.t); });
}

export const MODELS = {
  knochenflieger: buildKnochenflieger,
  platschfisch: buildPlatschfisch,
  lavadrache: buildLavadrache,
  wutkaulquappe: buildWutkaulquappe,
  funkenflaemmchen: buildFunkenflaemmchen,
  feuerkugel_blau: buildFeuerkugelBlau,
};
