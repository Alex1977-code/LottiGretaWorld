// Gegner-Modelle Welt 5 „Lila Strand-Insel“ (Kurs-Modus): Sandtaucher, Zündkopf, Feuerring, Hackbeil-Pilz, Funkenling.
// Eigene Gestaltung, keine Nachbauten fremder Figuren. Maßstab Meter, Ursprung = Fußpunkt, Blick nach +X; state darf ein
// String sein ('walk' ≙ { anim: 'walk' }). Unbekannte anim → wie 'idle'. progress (0..1) überschreibt bei Einmal-/
// Zyklus-Animationen die Zeit seit dem Zustandswechsel.
//
// sandtaucher   ≈0,95 m lang, 0,7 m hoch (aufgetaucht)  Sandtaucher: rundlicher, korallenoranger Wühlfisch mit cremigem
//   Bauch, lila Rückenflosse mit weißen Streifen, gegabelte Schwanzflosse, große Augen oben, breites Grinsen mit
//   Zähnchen. Ursprung = Sand-/Wasseroberfläche über der Körpermitte.
//   opts  { ground: 'sand' | 'wasser' (Standard 'sand'; Hügel aus Sand bzw. Wellenring) }
//   state { anim: 'hide'|'peek'|'jump'|'squashed'|'idle', speed (m/s; hide: Flosse zieht eine Spur), height (m; Sprunghöhe
//           der Körpermitte über dem Ursprung, Standard 1,4), progress? (jump: 0..1 im Zyklus 1,1 s) }
//         hide: nur die Rückenflosse ragt aus einem Sandhügel (bewegt: Flosse pendelt, Sandwölkchen);
//         peek: Augen und Stirn schauen heraus, blinzeln; idle wie peek;
//         jump: schnellt im Bogen heraus (Nase hoch → runter, Maul auf, Flossen gespreizt; Spritzer an Start und Ende;
//               der Motor bewegt root waagerecht, die Höhe macht das Modell);
//         squashed: liegt platt auf dem Boden, Augen zu, Schwindelsterne.
//   root.userData.bodyY → aktuelle Höhe der Körpermitte über dem Ursprung (Trefferzone Radius ≈0,4 m).
// zuendkopf     ≈0,9 m (mit Zündschnur)  Zündkopf: zwiebelrunder Keramik-Körper (unten tiefblau, oben roter „Zündkopf“),
//   goldener Nietengürtel, Messingkragen mit gedrehter Zündschnur, große Knopfaugen mit Brauen, orange Schuhe.
//   state { anim: 'walk'|'idle'|'lit'|'blink'|'explode'|'carried'|'thrown', speed (m/s; walk 1,2, lit 2,4),
//           fuse (0..1 Rest der Zündschnur; Standard 1, lit/blink brennen sie herunter), lit (bool: Funke an, auch beim
//           Tragen/Werfen; Standard: an bei lit/blink/carried/thrown), progress? (explode: 0..1 in 0,7 s) }
//         lit: Funke sprüht, Körper glüht orange, Augen grimmig, rennt; blink: blinkt schnell weiß-rot, bläht sich;
//         explode: bläht sich auf, Feuerball mit Druckring und Rauch (≈ Radius 2 m), danach unsichtbar;
//         carried: Füße strampeln, Augen ängstlich; thrown: dreht sich vorwärts, Füße eingezogen.
// feuerring     Feuerring-Brenner: gusseiserne Brennerschale (Ø 0,95 m) mit Kupferring und Glutschlitzen, darin ein
//   lebendiger Flammenkern mit Augen; ein Ring aus Flammenzungen breitet sich am Boden aus (Ursprung = Boden, Mitte).
//   opts  { radius (größter Ringradius, 4), flames (Zahl der Flammen im Ring, 32), color: 'rot'|'blau'|'pink' }
//   state { anim: 'idle'|'pulse'|'off', radius (m; aktueller Ringradius – überschreibt progress), angle (rad; Drehung des
//           Flammenrads), height (m; Flammenhöhe, Standard 0,7), progress? (pulse: 0..1 im Zyklus 2,4 s) }
//         idle: kleiner Ring dicht am Brenner; pulse: Ring wächst von 0,6 m bis opts.radius, flammt auf und erlischt
//         am Ende; off: nur Glut im Kern.  root.userData.ring → aktueller Ringradius (m), userData.flameH → Höhe.
// hackbeil_pilz ≈1,2 m (bis zur Schneide)  Hackbeil-Pilz: stämmiger Pilz mit magenta Tupfenhut, auf dem als Kamm ein
//   breites Stahl-Hackbeil sitzt (Halbmond-Schneide, dunkler Rücken mit Goldnieten); grimmiges Gesicht, Stiefel.
//   state { anim: 'idle'|'hop'|'raise'|'chop'|'stuck'|'squashed', progress? (hop: 0..1 in 0,6 s; chop: 0..1 in 0,35 s) }
//         hop: Hüpfer (0,45 m Bogen, der Motor bewegt root waagerecht); raise: lehnt sich zurück, Schneide blitzt;
//         chop: kippt um die Fußspitze nach vorn – die Schneide schlägt ≈1,1–1,4 m vor dem Ursprung auf;
//         stuck: steckt mit der Schneide im Boden, zappelt; squashed: platt.
//   root.userData.blade(out?) → Weltposition der Schneidenmitte (Trefferzone Radius ≈0,4 m).
// funkenling    Ø ≈0,6 m  Funkenling: wuseliges Feuerbällchen – glühender Kern in einem flackernden Kranz aus
//   Flammenzungen, große Augen, kleiner runder Mund, Glutfunken im Schlepp. Mitte bei y = 0,35.
//   opts  { color: 'rot' (Standard) | 'blau' | 'pink' }
//   state { anim: 'move'|'idle'|'defeated', speed (m/s; move Standard 2) }
//         move: zappelt/hüpft, neigt sich in Laufrichtung, Funken nach −X; defeated: verpufft (0,6 s).

import {
  THREE, TAU, Build, cached, vcol, basic, std, mesh, joint, eyes, makeModel, Clock, Blinker, damp, clamp, mix,
  smoothstep, instMesh, setInst, glowSprite, sparkleSprite, placed, puffyStarGeo, onEllipsoid, onLathe, metal, dizzyStars,
  smoothNormals,
} from '../lib/kit.js';
import { Puffs, stick } from '../lib/kit_w3.js';
import { W5, ownMat, glowVcol, gradV, mouthShape, puffyGeo, flameGeo, FLAME, hash1, noise3 } from '../lib/w5Geos.js';

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
/** sparsame Kugelkappe für Tupfen-Aufkleber (Fläche nach +Z). */
const capLo = () => { const s = new THREE.SphereGeometry(1, 10, 4, 0, TAU, 0, Math.PI / 2); s.rotateX(Math.PI / 2); return s; };
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
const prog = (st, clk, dur, loop = false) => (st.progress !== undefined ? clamp(st.progress, 0, 1) : loop ? (clk.age % dur) / dur : clamp(clk.age / dur, 0, 1));
const easeIn = (x) => x * x * x;

// =============================================================================================
// Sandtaucher
// =============================================================================================
const SD = {
  body: 0xff8a45, hi: 0xffc488, low: 0xe0602e, belly: 0xffe8d4, spot: 0xfff0c0, fin: 0x8a48e0, finHi: 0xc89aff, finLow: 0x5a2aa8,
  stripe: 0xfff8ff, mouth: 0x5a1430, tongue: 0xff7a8a, tooth: 0xffffff, cheek: 0xff9ab8,
};
const SDB = { c: [0, 0, 0], r: [0.43, 0.34, 0.35] };
function sdBodyGeo() {
  return cached('w5:sd:body', () => {
    const b = new Build();
    b.sphere(1, { v: (x, y, z, nx, ny) => {
      const base = mix(SD.low, SD.hi, smoothstep(ny * 0.55 + 0.55));
      return mix(base, SD.belly, smoothstep((-ny - 0.12) / 0.3));
    } }, { s: SDB.r }, 36, 26);
    // helle Rückentupfen (erhaben)
    const dots = [[-0.5, 0.75], [-1.0, 0.5], [-2.2, 0.75], [-2.6, 0.45], [-1.6, 0.85], [0.75, 0.75], [1.4, 0.5], [2.3, 0.62], [3.0, 0.8]];
    for (const [az, el] of dots) stick(b, onEllipsoid(SDB.c, SDB.r, az, el), SD.spot, [0.045, 0.045, 0.02], 0.35, capLo());
    // Schwanz (verjüngt nach −X)
    const tail = new THREE.LatheGeometry([[0, 0], [0.24, 0.02], [0.23, 0.12], [0.17, 0.26], [0.1, 0.38], [0.05, 0.45], [0, 0.47]].map(([x, y]) => new THREE.Vector2(x, y)), 24);
    tail.rotateZ(Math.PI / 2);
    b.add(tail, { v: (x, y, z, nx, ny) => mix(mix(SD.low, SD.hi, smoothstep(ny * 0.5 + 0.55)), SD.belly, smoothstep((-ny - 0.3) / 0.3)) }, { p: [-0.24, -0.02, 0], s: [1, 0.85, 0.9] });
    // Rückenflosse: gepolstertes, nach hinten geschwungenes Segel mit weißen Streifen
    const fs = new THREE.Shape();
    fs.moveTo(-0.2, 0); fs.quadraticCurveTo(-0.24, 0.2, -0.3, 0.36); fs.quadraticCurveTo(-0.22, 0.4, -0.12, 0.3); fs.quadraticCurveTo(0.04, 0.14, 0.16, 0); fs.lineTo(-0.2, 0);
    const fin = puffyGeo(fs, 0.04, 0.03, 16, 3);
    b.add(fin, { v: (x, y) => (Math.abs(y - 0.17) < 0.025 || Math.abs(y - 0.29) < 0.022 ? SD.stripe : mix(SD.finLow, SD.finHi, smoothstep(y / 0.36))) }, { p: [0.02, 0.27, 0] });
    // Wangen
    for (const s of [1, -1]) stick(b, onEllipsoid(SDB.c, SDB.r, s * 0.62, -0.02), SD.cheek, [0.07, 0.045, 0.02], 0.3);
    return b.geometry();
  });
}
function sdTailFinGeo() {
  return cached('w5:sd:tailfin', () => {
    const b = new Build();
    const lobe = new THREE.Shape();
    lobe.moveTo(0, 0); lobe.quadraticCurveTo(-0.08, 0.12, -0.2, 0.2); lobe.quadraticCurveTo(-0.16, 0.06, -0.06, -0.01); lobe.lineTo(0, 0);
    for (const s of [1, -1]) {
      const g = puffyGeo(lobe, 0.035, 0.025, 12, 3);
      if (s < 0) g.scale(1, -1, 1);
      b.add(smoothNormals(g), { v: (x, y) => mix(SD.fin, SD.finHi, smoothstep(Math.abs(y) / 0.2)) }, {});
    }
    b.sphere(0.06, SD.fin, { s: [1, 0.8, 0.6] }, 12, 8);
    return b.geometry();
  });
}
const sdPecGeo = () => cached('w5:sd:pec', () => new Build().sphere(1, gradV(SD.finLow, SD.finHi), { p: [0, 0, 0.1], s: [0.09, 0.025, 0.12] }, 14, 8).geometry());
function sdMoundGeo(water) {
  return cached(`w5:sd:mound:${water}`, () => {
    const b = new Build();
    if (water) {
      b.torus(0.5, 0.045, 0xe8fbff, { r: [Math.PI / 2, 0, 0], s: [1, 1, 0.5] }, 8, 40);
      b.torus(0.72, 0.03, 0xb8ecff, { r: [Math.PI / 2, 0, 0], s: [1, 1, 0.4] }, 6, 40);
      return b.geometry();
    }
    const g = new THREE.SphereGeometry(1, 36, 10, 0, TAU, 0, Math.PI / 2);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i); const n = noise3(x * 3 + 2, y * 3, z * 3) - 0.5; P.setXYZ(i, x * (1 + n * 0.12), y, z * (1 + n * 0.12)); }
    g.computeVertexNormals();
    b.add(g, { v: (x, y, z, nx, ny) => mix(W5.sandLow, W5.sandHi, smoothstep(ny * 0.6 + 0.3 + noise3(x * 9, y * 9, z * 9) * 0.25)) }, { s: [0.62, 0.17, 0.55] });
    for (let i = 0; i < 6; i++) { const a = i * 1.1 + 0.3, r = 0.5 + hash1(i) * 0.15; b.sphere(0.035 + hash1(i * 3) * 0.02, i % 2 ? 0xfff6ee : 0xffb8c8, { p: [Math.cos(a) * r, 0.01, Math.sin(a) * r * 0.9], s: [1, 0.6, 1] }, 8, 5); }
    return b.geometry();
  });
}
const SD_EYES = [1, -1].map((s) => { const h = onEllipsoid(SDB.c, SDB.r, s * 0.4, 0.47); return { p: h.p.toArray(), r: 0.105, sy: 1.25, dir: h.n.clone().lerp(new THREE.Vector3(1, 0.1, 0), 0.35).toArray() }; });
function buildSandtaucher(opts = {}) {
  const water = opts.ground === 'wasser';
  const root = new THREE.Group();
  const own = [];
  const pose = joint();
  const body = joint();
  const bodyM = mesh(sdBodyGeo(), vcol(0.3), {}, true);
  const eye = eyes(SD_EYES, { key: 'w5:sd', iris: 0x1a8a7a, pupil: 0.6, depth: 0.55 });
  const tail = joint([-0.7, 0.0, 0], mesh(sdTailFinGeo(), vcol(0.32), {}, true));
  const pecs = instMesh(sdPecGeo(), vcol(0.32), 2, 1, 0);
  pecs.castShadow = true;
  const grinM = mesh(cached('w5:sd:grin', () => {
    const b = new Build();
    const hm = onEllipsoid(SDB.c, SDB.r, 0, -0.16);
    b.add(puffyGeo(mouthShape('grin'), 0.04, 0.012, 14, 2), SD.mouth, placed(hm.p.clone().addScaledVector(hm.n, -0.008), hm.n, new THREE.Vector3(0.15, 0.085, 1)));
    stick(b, onEllipsoid(SDB.c, SDB.r, 0, -0.22), SD.tongue, [0.06, 0.03, 0.02], 0.3);
    for (const s of [-1, 1, -0.4, 0.4]) {
      const hh = onEllipsoid(SDB.c, SDB.r, s * 0.24, -0.1);
      b.add(new THREE.ConeGeometry(0.022, 0.05, 6), SD.tooth, { p: hh.p.clone().addScaledVector(hh.n, 0.004).add(new THREE.Vector3(0, -0.012, 0)).toArray(), r: [Math.PI, 0, 0] });
    }
    return b.geometry();
  }), vcol(0.3));
  const openM = mesh(cached('w5:sd:open', () => {
    const b = new Build();
    const hm = onEllipsoid(SDB.c, SDB.r, 0, -0.2);
    b.add(puffyGeo(mouthShape('open'), 0.05, 0.015, 16, 2), SD.mouth, placed(hm.p.clone().addScaledVector(hm.n, -0.01), hm.n, new THREE.Vector3(0.13, 0.11, 1)));
    for (const s of [-1, 1]) { const hh = onEllipsoid(SDB.c, SDB.r, s * 0.07, -0.06); b.add(new THREE.ConeGeometry(0.02, 0.045, 6), SD.tooth, { p: hh.p.clone().addScaledVector(hh.n, -0.004).toArray(), r: [Math.PI, 0, 0] }); }
    stick(b, onEllipsoid(SDB.c, SDB.r, 0, -0.3), SD.tongue, [0.07, 0.04, 0.02], 0.2);
    return b.geometry();
  }), vcol(0.3));
  openM.visible = false;
  body.add(bodyM, eye, tail, pecs, grinM, openM);
  pose.add(body);
  const mound = mesh(sdMoundGeo(water), water ? vcol(0.2, { transparent: true, opacity: 0.85 }, 'w5water') : vcol(0.85, {}, 'w5sand'), {}, false);
  mound.receiveShadow = !water;
  const puffs = new Puffs(8, water ? 0xe8faff : W5.sand, { opacity: 0.9, radius: 3, cy: 0.3 });
  own.push(puffs);
  const dizzy = dizzyStars(0.32, 0.075);
  root.add(pose, mound, puffs.mesh, dizzy);
  const clk = new Clock(), blink = new Blinker();
  let y = -0.44, sq = 0, fin = 0, emit = 0, mk = 1;
  root.userData.bodyY = y;
  const update = (dt, st) => {
    let anim = st.anim ?? 'hide';
    if (anim === 'idle') anim = 'peek';
    clk.tick(dt, anim);
    const t = clk.t;
    const speed = st.speed ?? 0;
    let ty = -0.44, pitch = 0, open = false, spread = 0;
    if (anim === 'peek') ty = -0.03 + Math.sin(t * 2.2) * 0.015;
    else if (anim === 'squashed') ty = 0.07;
    let jumping = false;
    if (anim === 'jump') {
      jumping = true;
      const p = prog(st, clk, 1.1, true);
      const H = st.height ?? 1.4;
      ty = -0.44 + 4 * p * (1 - p) * (H + 0.44);
      pitch = (0.5 - p) * 1.9;
      open = p > 0.12 && p < 0.8;
      spread = Math.sin(p * Math.PI);
      if ((p < 0.08 || p > 0.92) && emit <= 0) { puffs.burst([0.1, 0.05, 0], { count: 4, speed: 1.6, up: 2.2, size: 0.14, life: 0.5, spread: 0.3 }); emit = 0.08; }
      y = ty;
    } else y = damp(y, ty, anim === 'peek' ? 9 : 12, dt);
    const flat = anim === 'squashed';
    sq = damp(sq, flat ? 1 : 0, flat ? 25 : 8, dt);
    pose.position.y = y;
    pose.rotation.z = jumping ? pitch : damp(pose.rotation.z, 0, 8, dt);
    pose.scale.set(1 + sq * 0.3, Math.max(0.2, 1 - sq * 0.62), 1 + sq * 0.3);
    root.userData.bodyY = y;
    // Flossen-Spiel
    fin = damp(fin, anim === 'hide' && speed > 0.05 ? 1 : 0, 5, dt);
    const sway = Math.sin(t * (5 + speed * 2)) * (0.12 + fin * 0.18);
    body.rotation.x = anim === 'hide' ? sway * 0.6 : jumping ? 0 : Math.sin(t * 1.7) * 0.05;
    body.rotation.y = anim === 'hide' ? sway * 0.4 : 0;
    tail.rotation.y = Math.sin(t * (jumping ? 14 : 4 + speed * 3)) * (jumping ? 0.5 : 0.3);
    for (let i = 0; i < 2; i++) {
      const s = i ? -1 : 1;
      const flap = Math.sin(t * 6 + i * Math.PI) * 0.25;
      _e.set(0.45 - spread * 0.7 + flap * 0.4, s > 0 ? -0.45 : Math.PI + 0.45, 0, 'YXZ');
      pecs.setMatrixAt(i, _m.compose(_v.set(0.08, -0.13, s * 0.29), _q.setFromEuler(_e), _s.setScalar(1)));
    }
    pecs.instanceMatrix.needsUpdate = true;
    openM.visible = open; grinM.visible = !open;
    // Sandhügel/Wellenring: sichtbar, solange der Körper (fast) im Boden steckt
    const under = !flat && y < 0.05;
    mk = damp(mk, under ? 1 : 0, 10, dt);
    mound.visible = mk > 0.03;
    mound.scale.set(mk * (1 + (anim === 'hide' ? Math.sin(t * 7) * 0.04 * (1 + fin) : 0)), mk * (anim === 'peek' ? 1.25 : 1), mk);
    if (water) mound.rotation.y = t * 0.6;
    emit -= dt;
    if (anim === 'hide' && speed > 0.05 && emit <= 0) { emit = 0.12; puffs.burst([-0.35, 0.08, 0], { count: 2, speed: 0.5, up: 0.6, size: 0.1, life: 0.6, spread: 0.2 }); }
    puffs.step(dt);
    dizzy.visible = flat;
    if (flat) { dizzy.position.y = 0.32; dizzy.rotation.y = t * 4; }
    let bk = blink.update(dt);
    if (flat) bk = 0.08; else if (open) bk = 1;
    eye.userData.blink(bk);
    eye.visible = anim !== 'hide' || y > -0.3;
  };
  return makeModel('sandtaucher', root, update, [...own, pecs], { initial: 'hide' });
}

// =============================================================================================
// Zündkopf
// =============================================================================================
const ZK = {
  body: 0x2a3aa8, bodyHi: 0x6a8aff, bodyLow: 0x141a5a, cap: 0xff3a2a, capHi: 0xff9a7a, capLow: 0xb81a1a,
  belt: 0xffc21a, beltHi: 0xfff0a0, rivet: 0xfff6c8, brass: 0xe8a838, fuse: 0xe8c88a, fuseDark: 0x8a6034,
  shoe: 0xff8a1a, shoeHi: 0xffc070, sole: 0xfff2e0, brow: 0x2a1418, mouth: 0x3a0a18, cheek: 0xff8aa8,
};
const ZK_PROF = [[0, 0.1], [0.14, 0.108], [0.24, 0.155], [0.3, 0.25], [0.318, 0.355], [0.305, 0.46], [0.26, 0.56], [0.19, 0.635], [0.11, 0.678], [0, 0.69]];
const ZK_CY = 0.38;
function zkBodyGeo() {
  return cached('w5:zk:body', () => {
    const b = new Build();
    b.lathe(ZK_PROF, { v: (x, y, z, nx, ny) => {
      const cap = smoothstep((y - 0.53) / 0.05);
      const lo = mix(ZK.bodyLow, ZK.bodyHi, smoothstep(ny * 0.5 + 0.35 + nx * 0.15));
      const hi = mix(ZK.capLow, ZK.capHi, smoothstep(ny * 0.6 + 0.2));
      return mix(lo, hi, cap);
    } }, null, 40, 3);
    // goldener Nietengürtel
    b.torus(0.296, 0.03, gradV(0xc88a10, ZK.beltHi, 0.6, 0.5), { p: [0, 0.24, 0], r: [Math.PI / 2, 0, 0] }, 10, 48);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU + 0.26; b.sphere(0.017, ZK.rivet, { p: [Math.cos(a) * 0.323, 0.24, Math.sin(a) * 0.323] }, 8, 6); }
    // Messingkragen
    b.cyl(0.07, 0.085, 0.07, gradV(0x9a6a18, 0xffd890), { p: [0, 0.705, 0] }, 18);
    b.torus(0.075, 0.018, ZK.brass, { p: [0, 0.74, 0], r: [Math.PI / 2, 0, 0] }, 6, 18);
    // Mund (kleines Lächeln) und Wangen
    const hm = onLathe(ZK_PROF, 0.32, 0, -0.06);
    b.add(puffyGeo(mouthShape('smile'), 0.03, 0.01, 12, 2), ZK.mouth, placed(hm.p.clone().addScaledVector(hm.n, -0.005), hm.n, new THREE.Vector3(0.055, 0.04, 1)));
    for (const s of [1, -1]) stick(b, onLathe(ZK_PROF, 0.32, s * 0.62, -0.05), ZK.cheek, [0.05, 0.032, 0.015], 0.3);
    return b.geometry();
  });
}
function zkFuseGeo() {
  return cached('w5:zk:fuse', () => {
    const b = new Build();
    b.tube([[0, 0, 0], [0.005, 0.07, 0], [0.04, 0.14, 0.01], [0.1, 0.17, 0.02], [0.14, 0.15, 0.02]], 0.022, (x, y, z) => ((Math.floor((x + y) * 60) % 2) ? ZK.fuse : ZK.fuseDark), null, 30, 8);
    return b.geometry();
  });
}
const ZK_TIP = [0.14, 0.15, 0.02];
const zkSparkGeo = () => cached('w5:zk:spark', () => {
  const b = new Build();
  b.add(puffyStarGeo(0.075, 0.03, 0.03, 0.012, 6), 0xfff6a0, {});
  b.add(puffyStarGeo(0.055, 0.02, 0.02, 0.01, 6), 0xff9a2a, { r: [0, Math.PI / 2, 0.4] });
  b.sphere(0.03, 0xffffff, {}, 10, 8);
  return b.geometry();
});
const zkShoeGeo = () => cached('w5:zk:shoe', () => {
  const b = new Build();
  b.sphere(1, gradV(0xd8601a, ZK.shoeHi), { p: [0.03, 0.065, 0], s: [0.125, 0.075, 0.09] }, 18, 12);
  b.cyl(0.085, 0.09, 0.028, ZK.sole, { p: [0.03, 0.016, 0], s: [1.4, 1, 1] }, 18);
  return b.geometry();
});
const zkBrowGeo = () => cached('w5:zk:brow', () => new Build().capsule(0.023, 0.085, ZK.brow, { r: [Math.PI / 2, 0, 0] }, 3, 10).geometry());
const ZK_BROW = [1, -1].map((s) => { const h = onLathe(ZK_PROF, ZK_CY, s * 0.3, 0.47); return { p: h.p.clone().addScaledVector(h.n, 0.012), s }; });
const ZK_EYES = [1, -1].map((s) => { const h = onLathe(ZK_PROF, ZK_CY, s * 0.3, 0.17); return { p: h.p.toArray(), r: 0.092, sy: 1.38, dir: h.n.clone().lerp(new THREE.Vector3(1, 0, 0), 0.3).toArray() }; });
function buildZuendkopf() {
  const root = new THREE.Group();
  const own = [];
  const bodyMat = ownMat(vcol(0.26), { emissive: 0x000000 });
  own.push(bodyMat);
  const pose = joint();
  const tilt = joint([0, ZK_CY, 0]);       // Drehpunkt in der Körpermitte (Werfen, Watscheln)
  const inner = joint([0, -ZK_CY, 0]);
  const bodyM = mesh(zkBodyGeo(), bodyMat, {}, true);
  const eye = eyes(ZK_EYES, { key: 'w5:zk', pupil: 0.66, depth: 0.55 });
  // Brauen: zwei Kapseln über den Augen (Instanzen); Neigung = Laune
  const brows = instMesh(zkBrowGeo(), vcol(0.5), 2, 1, 0.5);
  const fuseJ = joint([0, 0.74, 0]);
  const fuseM = mesh(zkFuseGeo(), vcol(0.6), {}, true);
  const spark = mesh(zkSparkGeo(), glowVcol(), { p: ZK_TIP });
  const glow = glowSprite(0xffb040, 0.5, 0.85);
  glow.material = glow.material.clone(); own.push(glow.material);
  spark.add(glow);
  fuseJ.add(fuseM, spark);
  inner.add(bodyM, eye, fuseJ, brows);
  tilt.add(inner);
  const feet = instMesh(zkShoeGeo(), vcol(0.35), 2, 1.2, 0.2);
  feet.castShadow = true;
  pose.add(tilt, feet);
  // Explosion: Feuerball + Druckring + Rauch
  const blastMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, depthWrite: false });
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending });
  own.push(blastMat, ringMat);
  const blast = mesh(cached('w5:zk:blast', () => new Build().sphere(1, { v: (x, y, z, nx, ny) => mix(0xff6a1a, 0xfff6c0, smoothstep(ny * 0.5 + 0.5 + noise3(x * 3, y * 3, z * 3) * 0.4 - 0.2)) }, {}, 28, 18).geometry()), blastMat, { p: [0, ZK_CY, 0] });
  const ring = mesh(cached('w5:zk:ring', () => new THREE.TorusGeometry(1, 0.06, 8, 48).rotateX(Math.PI / 2)), ringMat, { p: [0, 0.15, 0] });
  blast.visible = false; ring.visible = false;
  const smoke = new Puffs(12, 0xc8bcc8, { opacity: 0.8, radius: 4, cy: 1 });
  own.push(smoke);
  root.add(pose, blast, ring, smoke.mesh);
  const clk = new Clock(), blink = new Blinker();
  let phase = Math.random() * TAU, glowK = 0, swell = 0, spin = 0, fuse = 1, boomed = false, worry = 0, angry = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    if (clk.entered && anim !== 'explode') boomed = false;
    const moving = anim === 'walk' || anim === 'lit' || anim === 'blink';
    const speed = moving ? (st.speed ?? (anim === 'walk' ? 1.2 : 2.4)) : 0;
    if (moving) phase += dt * (3 + speed * 4.2);
    const carried = anim === 'carried', thrown = anim === 'thrown', exploding = anim === 'explode';
    const isLit = st.lit ?? (anim === 'lit' || anim === 'blink' || carried || thrown || exploding);
    // Zündschnur brennt herunter
    let fTarget = st.fuse ?? (anim === 'lit' ? 1 - clamp(age / 3, 0, 0.6) : anim === 'blink' ? 0.3 : carried || thrown ? fuse : 1);
    if (st.fuse === undefined && anim === 'walk') fTarget = 1;
    fuse = damp(fuse, clamp(fTarget, 0.12, 1), 6, dt);
    fuseJ.scale.set(1, fuse, 1);
    fuseJ.rotation.z = Math.sin(t * 3 + 0.4) * 0.12 + (moving ? Math.sin(phase) * 0.15 : 0);
    // Leuchten
    const blinkOn = anim === 'blink' ? (Math.sin(t * TAU * 7) > 0 ? 1 : 0) : 0;
    glowK = damp(glowK, anim === 'lit' ? 0.35 + Math.sin(t * 9) * 0.12 : anim === 'blink' ? 0.6 : exploding ? 1 : isLit ? 0.2 : 0, 10, dt);
    if (blinkOn) bodyMat.emissive.setRGB(0.85, 0.8, 0.75); else bodyMat.emissive.setRGB(glowK * 0.9, glowK * 0.32, glowK * 0.05);
    swell = damp(swell, anim === 'blink' ? 1 : anim === 'lit' ? 0.25 : 0, 8, dt);
    // Explosion
    let ex = 0;
    if (exploding) {
      ex = prog(st, clk, 0.7);
      if (!boomed && ex > 0.12) { boomed = true; smoke.burst([0, ZK_CY + 0.2, 0], { count: 10, speed: 3.4, up: 1.4, size: 0.3, life: 0.8, spread: 0.6 }); }
    }
    const pre = exploding ? clamp(ex / 0.14, 0, 1) : 0;
    const gone = exploding && ex >= 0.14;
    pose.visible = !gone;
    blast.visible = gone && ex < 0.95;
    ring.visible = gone && ex < 0.9;
    if (blast.visible) {
      const k = (ex - 0.14) / 0.81;
      blast.scale.setScalar(0.4 + smoothstep(k * 2.2) * 1.6);
      blastMat.opacity = 1 - smoothstep((k - 0.35) / 0.65);
      blast.rotation.y = k * 2;
    }
    if (ring.visible) {
      const k = (ex - 0.14) / 0.76;
      ring.scale.setScalar(0.3 + k * 2.2);
      ringMat.opacity = (1 - k) * 0.9;
    }
    // Körper: Watscheln, Tragen, Werfen
    const pulse = anim === 'blink' ? Math.sin(t * TAU * 7) * 0.03 : 0;
    const s0 = 1 + swell * 0.1 + pulse + pre * 0.45;
    tilt.scale.set(s0, s0 * (1 - pre * 0.1), s0);
    if (thrown) spin -= dt * 13; else spin = damp(spin, Math.round(spin / TAU) * TAU, 8, dt);
    tilt.rotation.z = spin + (carried ? 0.25 : 0) + (anim === 'lit' ? -0.12 : 0);
    tilt.rotation.x = moving ? Math.sin(phase) * 0.12 : carried ? Math.sin(t * 9) * 0.06 : Math.sin(t * 1.5) * 0.02;
    tilt.position.y = ZK_CY + (moving ? Math.abs(Math.cos(phase)) * 0.03 : 0) + (carried ? 0.02 : 0);
    // Füße
    const tuck = thrown ? 1 : 0;
    for (let i = 0; i < 2; i++) {
      const s = i ? -1 : 1;
      const ph = phase + i * Math.PI;
      let x = 0.02, y = 0, rz = 0;
      if (moving) { x += Math.sin(ph) * 0.09; y = Math.max(0, Math.cos(ph)) * 0.06; rz = -Math.sin(ph) * 0.3; }
      if (carried) { x = 0.02 + Math.sin(t * 16 + i * 2) * 0.05; y = -0.06 + Math.cos(t * 16 + i * 2) * 0.03; rz = Math.sin(t * 16 + i * 2) * 0.4; }
      const sc = 1 - tuck * 0.5;
      setInst(feet, i, x, y + tuck * 0.12, s * 0.13, 0, s * 0.12, rz, sc);
    }
    feet.instanceMatrix.needsUpdate = true;
    feet.visible = !gone;
    // Brauen: grimmig (lit/blink) oder ängstlich (carried/thrown)
    worry = damp(worry, carried || thrown ? 1 : 0, 10, dt);
    angry = damp(angry, anim === 'lit' || anim === 'blink' ? 1 : 0, 10, dt);
    for (const b of ZK_BROW) {
      _e.set(-b.s * (angry * 0.5 - worry * 0.45), -b.s * 0.3, 0, 'YXZ');
      brows.setMatrixAt(b.s > 0 ? 0 : 1, _m.compose(_v.copy(b.p).setY(b.p.y + worry * 0.025 - angry * 0.012), _q.setFromEuler(_e), _s.setScalar(1)));
    }
    brows.instanceMatrix.needsUpdate = true;
    // Funke an der Spitze der Zündschnur (gegen die Schnur-Stauchung entzerrt)
    spark.visible = isLit && !gone;
    const fl = (0.8 + Math.sin(t * 40) * 0.2 + (anim === 'blink' ? 0.4 : 0)) * (anim === 'lit' || anim === 'blink' ? 1.3 : 1);
    spark.scale.set(fl, fl / Math.max(0.1, fuse), fl);
    spark.rotation.set(t * 7, t * 5, 0);
    glow.material.opacity = 0.6 + Math.sin(t * 31) * 0.25;
    smoke.step(dt);
    let bk = blink.update(dt, !exploding);
    if (anim === 'blink' || pre > 0) bk = 0.35; else if (thrown) bk = 0.15; else if (carried) bk = 1;
    eye.userData.blink(bk);
    eye.scale.setScalar(carried ? 1.12 : 1);
  };
  return makeModel('zuendkopf', root, update, [...own, feet, brows], { initial: 'idle' });
}

// =============================================================================================
// Feuerring
// =============================================================================================
const FR = { iron: 0x3a3448, ironHi: 0x7a7090, ironLow: 0x1e1a28, copper: 0xe0844a, copperHi: 0xffc090, vent: 0xff7a1a };
const FR_PROF = [[0, 0], [0.43, 0], [0.47, 0.03], [0.48, 0.09], [0.45, 0.15], [0.37, 0.2], [0.28, 0.215], [0.25, 0.2], [0, 0.2]];
function frBaseGeo() {
  return cached('w5:fr:base', () => {
    const b = new Build();
    b.lathe(FR_PROF, { v: (x, y, z, nx, ny) => mix(FR.ironLow, FR.ironHi, smoothstep(ny * 0.5 + 0.4 + noise3(x * 8, y * 8, z * 8) * 0.2)) }, null, 40, 2);
    b.torus(0.475, 0.035, gradV(0xa04a20, FR.copperHi), { p: [0, 0.075, 0], r: [Math.PI / 2, 0, 0] }, 10, 48);
    // Kupfernieten
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; b.sphere(0.022, FR.copperHi, { p: [Math.cos(a) * 0.505, 0.075, Math.sin(a) * 0.505] }, 8, 6); }
    return b.geometry();
  });
}
function frVentGeo() {
  return cached('w5:fr:vents', () => {
    const b = new Build();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + 0.2;
      b.capsule(0.022, 0.07, { v: (x, y) => mix(0xff5a10, 0xffd060, smoothstep(y / 0.05 + 0.5)) }, { p: [Math.cos(a) * 0.33, 0.188, Math.sin(a) * 0.33], r: [Math.PI / 2, -a, 0.5], order: 'YXZ' }, 2, 6);
    }
    b.torus(0.265, 0.022, 0xff8a2a, { p: [0, 0.212, 0], r: [Math.PI / 2, 0, 0] }, 6, 32);
    return b.geometry();
  });
}
function frRingFlameGeo(color) {
  const C = FLAME[color] ?? FLAME.rot;
  return cached(`w5:fr:flame:${color}`, () => {
    const b = new Build();
    b.lathe([[0, 0], [0.22, 0.02], [0.32, 0.13], [0.33, 0.27], [0.27, 0.44], [0.17, 0.62], [0.07, 0.83], [0, 1]], { v: (x, y) => (y < 0.3 ? mix(C[0], C[1], y / 0.3) : mix(C[1], C[2], smoothstep((y - 0.3) / 0.7))) }, null, 10, 1);
    return b.geometry();
  });
}
function buildFeuerring(opts = {}) {
  const color = FLAME[opts.color] ? opts.color : 'rot';
  const Rmax = Math.max(1, opts.radius ?? 4);
  const N = clamp(Math.round(opts.flames ?? 28), 8, 64);
  const root = new THREE.Group();
  const own = [];
  const base = mesh(frBaseGeo(), vcol(0.38, { metalness: 0.25 }, 'w5iron'), {}, true);
  base.receiveShadow = true;
  const vents = mesh(frVentGeo(), glowVcol());
  const core = joint([0, 0.2, 0]);
  const coreM = mesh(flameGeo(color, 16), glowVcol(), { s: [0.9, 0.78, 0.9] });
  const eye = eyes([{ p: [0.25, 0.2, 0.085], r: 0.065, sy: 1.3, dir: [1, 0.1, 0.35] }, { p: [0.25, 0.2, -0.085], r: 0.065, sy: 1.3, dir: [1, 0.1, -0.35] }], { key: 'w5:fr', pupil: 0.62, depth: 0.5 });
  core.add(coreM, eye);
  const flames = instMesh(frRingFlameGeo(color), glowVcol(), N, Rmax + 1, 0.4);
  flames.frustumCulled = false;
  // Glutring am Boden: Streifen, dessen Radius sich je Bild ändert (eigene Geometrie)
  const SEG = 96;
  const rg = new THREE.BufferGeometry();
  const pos = new Float32Array((SEG + 1) * 3 * 3), colA = new Float32Array((SEG + 1) * 3 * 3), idx = [];
  const C = FLAME[color] ?? FLAME.rot, cw = new THREE.Color(C[1]).lerp(new THREE.Color(C[2]), 0.35).multiplyScalar(0.8);
  for (let i = 0; i <= SEG; i++) {
    for (let k = 0; k < 3; k++) { const c = k === 1 ? cw : new THREE.Color(0, 0, 0); colA.set([c.r, c.g, c.b], (i * 3 + k) * 3); }
    if (i < SEG) for (const [a, bb] of [[0, 1], [1, 2]]) { const p0 = i * 3 + a, p1 = i * 3 + bb, q0 = (i + 1) * 3 + a, q1 = (i + 1) * 3 + bb; idx.push(p0, q0, p1, p1, q0, q1); }
  }
  rg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  rg.setAttribute('color', new THREE.BufferAttribute(colA, 3));
  rg.setIndex(idx);
  rg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Rmax + 1);
  const ringMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  own.push(rg, ringMat);
  const ringM = new THREE.Mesh(rg, ringMat);
  ringM.renderOrder = 2; ringM.frustumCulled = false;
  const glow = glowSprite(color === 'blau' ? 0x4ab8ff : color === 'pink' ? 0xff6ae0 : 0xff8a2a, 1.3, 0.6);
  glow.position.y = 0.45;
  root.add(base, vents, core, flames, ringM, glow);
  const clk = new Clock(), blink = new Blinker();
  let R = 0.6, H = 0, angle = 0;
  root.userData.ring = R; root.userData.flameH = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    let tR = 0.62, tH = (st.height ?? 0.7) * 0.45, fade = 1;
    if (anim === 'pulse') {
      const p = prog(st, clk, 2.4, true);
      tR = 0.6 + (Rmax - 0.6) * smoothstep(p * 1.05);
      tH = st.height ?? 0.7;
      fade = smoothstep(p / 0.08) * (1 - smoothstep((p - 0.88) / 0.12));
    } else if (anim === 'off') { tH = 0; fade = 0; }
    if (st.radius !== undefined) tR = clamp(st.radius, 0.3, Rmax * 1.5);
    R = anim === 'pulse' || st.radius !== undefined ? tR : damp(R, tR, 6, dt);
    H = damp(H, tH * fade, 14, dt);
    angle = st.angle !== undefined ? st.angle : angle + dt * 1.2;
    root.userData.ring = R; root.userData.flameH = H;
    const w = clamp((TAU * R / N) * 1.25, 0.18, 0.55);
    for (let i = 0; i < N; i++) {
      const a = angle + (i / N) * TAU;
      const fl = 1 + Math.sin(t * 17 + i * 2.3) * 0.18 + Math.sin(t * 29 + i * 5.1) * 0.08;
      const h = H * fl;
      if (h < 0.02) { flames.setMatrixAt(i, ZERO); continue; }
      _e.set(-0.3 - Math.sin(t * 9 + i) * 0.08, a, -0.08, 'YXZ');
      _q.setFromEuler(_e);
      flames.setMatrixAt(i, _m.compose(_v.set(Math.cos(a) * R, 0, -Math.sin(a) * R), _q, _s.set(w, h, w * 0.8)));
    }
    flames.instanceMatrix.needsUpdate = true;
    // Glutring
    const P = rg.attributes.position;
    const band = 0.12 + H * 0.25;
    for (let i = 0; i <= SEG; i++) {
      const a = (i / SEG) * TAU, ca = Math.cos(a), sa = -Math.sin(a);
      const wob = Math.sin(a * 9 + t * 6) * 0.03;
      for (let k = 0; k < 3; k++) { const r = R + (k - 1) * band + wob; P.setXYZ(i * 3 + k, ca * r, 0.025, sa * r); }
    }
    P.needsUpdate = true;
    ringMat.opacity = clamp(H / 0.5, 0, 1) * 0.75;
    ringM.visible = H > 0.03;
    // Kern
    const k = anim === 'off' ? 0.55 : anim === 'pulse' ? 1.1 : 0.9;
    const s = k * (1 + Math.sin(t * 13) * 0.06);
    coreM.scale.set(0.9 * s, 0.78 * s * (1 + Math.sin(t * 21) * 0.08), 0.9 * s);
    core.rotation.y = Math.sin(t * 1.3) * 0.25;
    core.position.y = 0.14 + Math.sin(t * 5) * 0.012;
    eye.position.set(0.25 * k - 0.25, 0.2 * k, 0);
    glow.material.opacity = 0.45 + H * 0.4;
    let bk = blink.update(dt);
    if (anim === 'off') bk = 0.15;
    eye.userData.blink(bk);
  };
  return makeModel('feuerring', root, update, [...own, flames], { initial: 'idle' });
}

// =============================================================================================
// Hackbeil-Pilz
// =============================================================================================
const HB = {
  stem: 0xfff0d8, stemLow: 0xe8c08a, cap: 0xc42ad8, capHi: 0xf08aff, capLow: 0x7a1a98, spot: 0xfff2e0, gill: 0xffe0b8,
  boot: 0x5a3020, bootHi: 0x9a6040, brow: 0x3a1a10, mouth: 0x4a0a1a, tooth: 0xffffff, rivet: 0xffd23a,
};
const HB_STEM = [[0, 0.07], [0.2, 0.075], [0.29, 0.14], [0.32, 0.25], [0.31, 0.37], [0.27, 0.47], [0.2, 0.54], [0, 0.56]];
const HB_CAP = [[0, 0.5], [0.36, 0.5], [0.45, 0.545], [0.48, 0.6], [0.45, 0.67], [0.36, 0.73], [0.2, 0.77], [0, 0.78]];
const HB_PIV = 0.3; // Kipp-Drehpunkt (Fußspitze) bei x = +0,3
function hbBodyGeo() {
  return cached('w5:hb:body', () => {
    const b = new Build();
    b.lathe(HB_STEM, gradV(HB.stemLow, HB.stem, 0.5, 0.65), null, 36, 3);
    // Hut mit erhabenen Tupfen
    b.lathe(HB_CAP, gradV(HB.capLow, HB.capHi, 0.6, 0.35), null, 44, 3);
    const spots = [[0.55, 0.32, 0.075], [-0.6, 0.3, 0.075], [1.75, 0.3, 0.07], [-1.8, 0.28, 0.07], [2.75, 0.33, 0.075], [-2.6, 0.3, 0.065], [3.14, 0.55, 0.06], [0, 0.62, 0.06], [1.2, 0.62, 0.05], [-1.3, 0.6, 0.05], [2.1, 0.7, 0.045], [-2.2, 0.68, 0.045]];
    for (const [az, el, r] of spots) { const h = onLathe(HB_CAP, 0.5, az, el); if (h) stick(b, h, HB.spot, [r, r, r * 0.35], 0.4, capLo()); }
    b.cyl(0.4, 0.3, 0.03, HB.gill, { p: [0, 0.505, 0] }, 32);
    // Gesicht: grimmiger Mund mit Zähnen, dicke Brauen
    const hm = onLathe(HB_STEM, 0.24, 0, -0.06);
    b.add(puffyGeo(mouthShape('grim'), 0.03, 0.012, 12, 2), HB.mouth, placed(hm.p.clone().addScaledVector(hm.n, -0.004), hm.n, new THREE.Vector3(0.09, 0.06, 1)));
    for (const s of [-1, 0, 1]) {
      const ht = onLathe(HB_STEM, 0.24, s * 0.11, -0.02);
      b.box(0.03, 0.02, 0.035, HB.tooth, { p: ht.p.clone().addScaledVector(ht.n, 0.004).toArray(), r: [0, -s * 0.11, 0] }, 0.006, 1);
    }
    for (const s of [1, -1]) {
      const hb = onLathe(HB_STEM, 0.3, s * 0.3, 0.33);
      b.capsule(0.026, 0.1, HB.brow, { p: hb.p.clone().addScaledVector(hb.n, 0.012).toArray(), r: [Math.PI / 2 - s * 0.45, -s * 0.3, 0], order: 'YXZ' }, 3, 8);
    }
    return b.geometry();
  });
}
function hbBladeGeo() {
  return cached('w5:hb:blade', () => {
    const b = new Build();
    const s = new THREE.Shape();
    s.moveTo(-0.4, 0); s.lineTo(0.4, 0); s.absellipse(0, 0, 0.4, 0.44, 0, Math.PI, false, 0);
    const g = puffyGeo(s, 0.05, 0.022, 26, 2);
    b.add(g, { v: (x, y) => {
      const r = Math.hypot(x / 0.4, y / 0.44);
      if (y < 0.1) return mix(0x2a3040, 0x4a5468, smoothstep(y / 0.1));
      if (r > 0.86) return mix(0xc8d8ea, 0xffffff, smoothstep((r - 0.86) / 0.1));
      return mix(0x5a6a84, 0x9aaac2, smoothstep(y / 0.4));
    } }, {});
    for (const x of [-0.24, 0, 0.24]) for (const z of [1, -1]) b.sphere(0.024, HB.rivet, { p: [x, 0.06, z * 0.042], s: [1, 1, 0.55] }, 10, 6);
    return b.geometry();
  });
}
const hbBootGeo = () => cached('w5:hb:boot', () => new Build().sphere(1, gradV(HB.boot, HB.bootHi), { p: [0.05, 0.07, 0], s: [0.15, 0.085, 0.11] }, 18, 12).geometry());
const HB_EYES = [1, -1].map((s) => { const h = onLathe(HB_STEM, 0.33, s * 0.29, 0.1); return { p: h.p.toArray(), r: 0.095, sy: 1.25, dir: h.n.clone().lerp(new THREE.Vector3(1, 0, 0), 0.25).toArray() }; });
function buildHackbeilPilz() {
  const root = new THREE.Group();
  const own = [];
  const pivot = joint([HB_PIV, 0, 0]);
  const inner = joint([-HB_PIV, 0, 0]);
  const bodyM = mesh(hbBodyGeo(), vcol(0.32), {}, true);
  const eye = eyes(HB_EYES, { key: 'w5:hb', iris: 0x6a3a1a, pupil: 0.6, depth: 0.55 });
  const bladeJ = joint([0, 0.69, 0]);
  const bladeM = mesh(hbBladeGeo(), metal('w5steel', { color: 0xffffff, vertexColors: true, metalness: 0.5, roughness: 0.3 }, 0.8), {}, true);
  bladeJ.add(bladeM);
  const glint = sparkleSprite(0xffffff, 0.22);
  glint.position.set(0.22, 0.34, 0.06);
  glint.material = glint.material.clone(); own.push(glint.material);
  bladeJ.add(glint);
  inner.add(bodyM, eye, bladeJ);
  pivot.add(inner);
  const feet = instMesh(hbBootGeo(), vcol(0.4), 2, 1.5, 0.3);
  feet.castShadow = true;
  const dust = new Puffs(7, 0xe8d8b8, { opacity: 0.85, radius: 3, cy: 0.3 });
  own.push(dust);
  const dizzy = dizzyStars(0.3, 0.07);
  root.add(pivot, feet, dust.mesh, dizzy);
  const clk = new Clock(), blink = new Blinker();
  let ang = 0, hopY = 0, sq = 0, flatK = 0, landed = false;
  const bladePos = new THREE.Vector3();
  root.userData.blade = (out = new THREE.Vector3()) => { root.updateMatrixWorld(true); return bladeJ.localToWorld(out.set(0, 0.25, 0)); };
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    if (clk.entered) landed = false;
    let tAng = 0, y = 0, crouch = 0, kick = 0;
    if (anim === 'raise') { tAng = 0.38; crouch = 0.08; }
    else if (anim === 'chop') {
      const p = prog(st, clk, 0.35);
      tAng = -(Math.PI / 2 + 0.14) * easeIn(p);
      y = Math.sin(p * Math.PI) * 0.12;
      ang = tAng;
      if (p >= 1 && !landed) { landed = true; dust.burst([1.25, 0.05, 0], { count: 8, speed: 1.8, up: 1.4, size: 0.16, life: 0.6, spread: 0.3 }); }
    } else if (anim === 'stuck') {
      tAng = -(Math.PI / 2 + 0.2) + Math.sin(t * 9) * 0.05;
      kick = 1;
      if (clk.entered) dust.burst([1.25, 0.05, 0], { count: 6, speed: 1.4, up: 1.2, size: 0.14, life: 0.5, spread: 0.3 });
    } else if (anim === 'hop') {
      const p = prog(st, clk, 0.6, true);
      y = p > 0.15 && p < 0.85 ? Math.sin(((p - 0.15) / 0.7) * Math.PI) * 0.45 : 0;
      crouch = p < 0.15 ? Math.sin((p / 0.15) * Math.PI) * 0.12 : p > 0.85 ? Math.sin(((p - 0.85) / 0.15) * Math.PI) * 0.1 : 0;
      tAng = p > 0.15 && p < 0.85 ? Math.sin(((p - 0.15) / 0.7) * TAU) * 0.08 : 0;
    }
    if (anim !== 'chop') ang = damp(ang, tAng, anim === 'raise' ? 7 : anim === 'stuck' ? 30 : 9, dt);
    hopY = anim === 'hop' || anim === 'chop' ? y : damp(hopY, 0, 12, dt);
    const flat = anim === 'squashed';
    flatK = damp(flatK, flat ? 1 : 0, flat ? 25 : 8, dt);
    sq = damp(sq, crouch, 20, dt);
    pivot.rotation.z = ang;
    pivot.position.y = hopY;
    pivot.scale.set(1 + sq * 0.6 + flatK * 0.35, Math.max(0.2, 1 - sq - flatK * 0.66), 1 + sq * 0.6 + flatK * 0.35);
    if (anim === 'idle') { pivot.scale.y *= 1 + Math.sin(t * 2.4) * 0.015; inner.rotation.y = Math.sin(t * 0.7) * 0.2; } else inner.rotation.y = damp(inner.rotation.y, 0, 8, dt);
    // Füße: bleiben am Boden (beim Kippen hebt sich die Ferse), beim Feststecken strampeln sie
    for (let i = 0; i < 2; i++) {
      const s = i ? -1 : 1;
      let x = 0.02, fy = hopY * 0.95, rz = 0;
      if (kick) { x = -0.05 + Math.sin(t * 14 + i * 2) * 0.06; fy = 0.05 + Math.max(0, Math.sin(t * 14 + i * 2)) * 0.1; rz = Math.sin(t * 14 + i * 2) * 0.5; }
      setInst(feet, i, x, fy, s * 0.15, 0, s * 0.15, rz, 1);
    }
    feet.instanceMatrix.needsUpdate = true;
    // Schneide blitzt beim Ausholen
    const g = anim === 'raise' ? 0.6 + Math.sin(t * 12) * 0.4 : Math.max(0, Math.sin(t * 0.9) * 8 - 7) ;
    glint.material.opacity = clamp(g, 0, 1);
    glint.visible = g > 0.02;
    glint.scale.setScalar(0.12 + g * 0.16);
    dust.step(dt);
    dizzy.visible = flat || anim === 'stuck';
    if (dizzy.visible) { dizzy.position.set(flat ? 0 : 0.2, flat ? 0.45 : 0.7, 0); dizzy.rotation.y = t * 4; }
    let bk = blink.update(dt);
    if (flat) bk = 0.08; else if (anim === 'stuck') bk = 0.35 + Math.sin(t * 7) * 0.1; else if (anim === 'raise') bk = 0.7;
    eye.userData.blink(bk);
    void bladePos; void age;
  };
  return makeModel('hackbeil_pilz', root, update, [...own, feet], { initial: 'idle' });
}

// =============================================================================================
// Funkenling
// =============================================================================================
const FL_CY = 0.34;
const FL_COL = { rot: [0xfff2a0, 0xffa020, 0xff5a10], blau: [0xe8ffff, 0x5ac8ff, 0x2a5aff], pink: [0xfff0ff, 0xff8ae8, 0xc02aff] };
function flCrownGeo(color) {
  const C = FLAME[color] ?? FLAME.rot;
  return cached(`w5:fl:crown:${color}`, () => {
    const b = new Build();
    // Flammenschopf: Zungen oben und hinten, nach hinten-oben geschwungen (Gesicht vorn bleibt frei)
    const list = [[3.14, 0.55, 0.36], [2.5, 0.75, 0.32], [-2.5, 0.75, 0.32], [1.9, 0.5, 0.26], [-1.9, 0.5, 0.26], [2.9, 1.15, 0.42], [-2.9, 1.15, 0.4], [0.0, 1.35, 0.34], [1.3, 1.0, 0.28], [-1.3, 1.0, 0.28], [2.6, 0.2, 0.22], [-2.6, 0.2, 0.22]];
    for (const [az, el, len] of list) {
      const d = new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
      const dir = d.clone().lerp(new THREE.Vector3(-0.5, 1, 0), 0.45).normalize();
      const g = new THREE.LatheGeometry([[0, 0], [0.1, 0.04], [0.12, 0.2], [0.09, 0.45], [0.045, 0.72], [0, 1]].map(([x, y]) => new THREE.Vector2(x, y)), 10);
      const m = new THREE.Matrix4().compose(d.clone().multiplyScalar(0.17), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir), new THREE.Vector3(1.05, len, 1.05));
      b.add(g, { v: (x, y) => (y < 0.25 ? mix(C[0], C[1], y / 0.25) : mix(C[1], C[2], smoothstep((y - 0.25) / 0.75))) }, m);
    }
    return b.geometry();
  });
}
const flCoreGeo = (color) => cached(`w5:fl:core:${color}`, () => {
  const C = FL_COL[color] ?? FL_COL.rot;
  return new Build().sphere(0.24, { v: (x, y, z, nx, ny) => mix(C[2], C[0], smoothstep(nx * 0.45 + ny * 0.35 + 0.45)) }, {}, 32, 24).geometry();
});
function buildFunkenling(opts = {}) {
  const color = FLAME[opts.color] ? opts.color : 'rot';
  const C = FL_COL[color];
  const root = new THREE.Group();
  const own = [];
  const pose = joint([0, FL_CY, 0]);
  const core = mesh(flCoreGeo(color), std(`w5:flcore:${color}`, { vertexColors: true, roughness: 0.35, emissive: C[1], emissiveIntensity: 0.55 }), {});
  const crown = joint();
  const crownM = mesh(flCrownGeo(color), glowVcol(), {});
  const crown2 = mesh(flCrownGeo(color), glowVcol(), { r: [0, 0.5, 0], s: 0.78 });
  crown.add(crownM, crown2);
  const eye = eyes([{ p: [0.19, 0.05, 0.085], r: 0.078, sy: 1.35, dir: [1, 0.08, 0.42] }, { p: [0.19, 0.05, -0.085], r: 0.078, sy: 1.35, dir: [1, 0.08, -0.42] }], { key: 'w5:fl', pupil: 0.64, depth: 0.5 });
  const mouthM = mesh(cached('w5:fl:mouth', () => {
    const b = new Build();
    b.add(puffyGeo(mouthShape('open'), 0.02, 0.008, 12, 2), 0x6a1010, placed(new THREE.Vector3(0.232, -0.075, 0), new THREE.Vector3(1, -0.3, 0), new THREE.Vector3(0.026, 0.028, 1)));
    for (const z of [1, -1]) b.sphere(1, 0xff7a6a, { p: [0.2, -0.04, z * 0.14], s: [0.012, 0.025, 0.035] }, 8, 6);
    return b.geometry();
  }), vcol(0.4));
  pose.add(core, crown, eye, mouthM);
  const glowC = color === 'blau' ? 0x4ab8ff : color === 'pink' ? 0xff6ae0 : 0xff8a2a;
  const glow = glowSprite(glowC, 1.2, 0.55);
  glow.material = glow.material.clone(); own.push(glow.material);
  pose.add(glow);
  const embers = new Puffs(14, C[1], { emissive: C[2], opacity: 0.95, detail: 0, radius: 3, cy: 0.4 });
  own.push(embers);
  root.add(pose, embers.mesh);
  const clk = new Clock(), blink = new Blinker();
  let emit = 0, lean = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'move';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    const moving = anim === 'move';
    const speed = moving ? (st.speed ?? 2) : 0;
    const dead = anim === 'defeated';
    const k = dead ? Math.max(0.001, 1 - smoothstep(age / 0.6)) : 1;
    lean = damp(lean, moving ? clamp(speed * 0.1, 0, 0.35) : 0, 6, dt);
    const f = 8 + speed * 2;
    const hop = moving ? Math.abs(Math.sin(t * f)) * 0.09 : Math.sin(t * 2.5) * 0.03;
    pose.position.set(moving ? Math.sin(t * 23) * 0.012 : 0, FL_CY + hop + (dead ? age * 0.4 : 0), moving ? Math.cos(t * 19) * 0.012 : 0);
    pose.rotation.z = -lean;
    const land = moving ? Math.max(0, Math.cos(t * f * 2)) * 0.08 : 0;
    pose.scale.set(k * (1 + land), k * (1 - land), k * (1 + land));
    crown.rotation.set(Math.sin(t * 7) * 0.08, Math.sin(t * 3.3) * 0.15, moving ? lean * 0.6 : Math.sin(t * 5) * 0.05);
    crownM.scale.set(1, 1 + Math.sin(t * 17) * 0.1, 1);
    crown2.scale.set(0.78, 0.78 * (1 + Math.sin(t * 21 + 1) * 0.12), 0.78);
    crown2.rotation.y = 0.5 + Math.sin(t * 9) * 0.1;
    glow.material.opacity = (0.5 + Math.sin(t * 15) * 0.1) * k;
    emit -= dt;
    if (emit <= 0 && !dead) {
      emit = moving ? 0.06 : 0.25;
      embers.burst([pose.position.x - 0.2, pose.position.y + 0.12, pose.position.z], { count: moving ? 2 : 1, speed: 0.5, up: 1.2, size: 0.05, life: 0.5, spread: 0.12 });
    }
    if (dead && clk.entered) embers.burst([0, FL_CY, 0], { count: 14, speed: 2.5, up: 1.5, size: 0.08, life: 0.7, spread: 0.2, force: true });
    embers.step(dt);
    let bk = blink.update(dt);
    if (dead) bk = 0.1;
    eye.userData.blink(bk);
  };
  return makeModel('funkenling', root, update, own, { initial: 'move' });
}

export const MODELS = {
  sandtaucher: buildSandtaucher,
  zuendkopf: buildZuendkopf,
  feuerring: buildFeuerring,
  hackbeil_pilz: buildHackbeilPilz,
  funkenling: buildFunkenling,
};
