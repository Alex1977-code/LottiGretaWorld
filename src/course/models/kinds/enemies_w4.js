// Gegner-Modelle Welt 4 „Canyon-Inselkette“ (Kurs-Modus), Teil 1: Ameisen, Rankenschnapper, Stachelpanzer, Springklotz.
// Eigene Gestaltung, keine Nachbauten fremder Figuren. Maßstab Meter, Ursprung = Fußpunkt, Blick nach +X; state darf
// ein String sein ('walk' ≙ { anim: 'walk' }). Unbekannte anim → wie 'idle'. progress (0..1) überschreibt bei
// Einmal-/Zyklus-Animationen die Zeit seit dem Zustandswechsel.
//
// ameisensoldat       ≈0,95 m lang, 0,7 m hoch  Soldaten-Ameise auf sechs Beinen: kobaltblauer Lackpanzer mit hellen
//   Ringen am Hinterleib, roter Uniformkragen mit Goldknöpfen, sonnengelber Helm mit rotem Band und weißem Stern,
//   große Augen, cremefarbene Kieferzangen, Fühler mit gelben Kugeln, dunkle Stiefelchen. Läuft waagerecht auf den
//   Beinen (Rücken oben); an Wänden/Decken richtet der Motor root aus (lokales +Y = Flächennormale, +X = Laufrichtung).
//   state { anim: 'walk'|'idle'|'carry'|'squashed', speed (m/s; walk Standard 1,5, carry 1,2) }
//         walk: Dreifuß-Gang (Schrittweite passt zu speed), Kopf nickt im Takt; carry: trägt die Figur – Körper tiefer,
//         kürzere schnelle Schritte, Fühler nach hinten, Augen entschlossen; squashed: platt, Beine gespreizt, Augen zu.
//   root.userData.back → Höhe der Rückenoberkante (Hinterleib) in m (0,62).
// ameisensoldat_horn  wie ameisensoldat, aber roter Helm mit großem weiß-silbernem Stachelhorn (Goldring am Fuß, zwei
//   Seitendornen) – nicht von oben besiegbar.  state wie ameisensoldat.  Höhe mit Horn ≈1,0 m.
//   Viele Ameisen → createInstanced('ameisensoldat' | 'ameisensoldat_horn', n) (lib/instanced_w4.js).
// riesenameise        ≈3,4 m lang (mit Kieferhörnern), Deck 1,25 m hoch  Riesenameise als Laufuntergrund: mahagonirote
//   Ameise, auf dem Rücken ein flaches, sandfarbenes Lastdeck (2,15 × 1,35 m, Riffelstreifen, Terrakotta-Rand, flache Nieten),
//   große Kieferhörner, schläfrig-freundliche Augen mit Lidern, lange Fühler, sechs lange Beine.
//   state { anim: 'walk'|'idle'|'carry', speed (m/s; Standard 2) }  carry wie walk (Deck schwankt etwas weniger).
//   root.userData.deck → { y: 1,25 (Oberkante), x0: −1,3, x1: 0,85 (Längs-Ausdehnung), w: 1,35 (Breite in z) };
//   das Deck bleibt beim Laufen waagerecht (nur ± 1 cm Wippen).
// rankenschnapper     Schnappkopf (≈0,95 m lang, 0,7 m hoch) an einer langen Ranke, die über den Weg wächst: türkiser
//   Klappkopf mit Cremepunkten, gelbe Lippen, Zahnreihen, korallenroter Rachen, kleine grimmige Augen oben, Kragen aus
//   lindgrünen Blättern; Ranke grün mit hellgelben Ringen und Blattpaaren. Ursprung = Wurzel der Ranke (Wasserlinie).
//   opts  { segments: Zahl der Rankenglieder (4–40, Standard 12; je ≈0,38 m Länge im Standardpfad) }
//   state { anim: 'idle'|'snap'|'hit'|'defeated', grow (0..1 gewachsener Anteil des Pfads; Standard 1),
//           path?: [[x,y,z], …] (lokale Pfadpunkte ab der Wurzel, ≥ 2; geglättet; Standard: senkrecht 1,45 m hoch,
//                  dann waagerecht nach +X, Gesamtlänge ≈ segments · 0,38 m),
//           progress? (snap: 0..1 im Zyklus 0,7 s) }
//         Kopf sitzt an der Rankenspitze (Pfadstelle grow), blickt entlang des Pfads; snap: aufreißen – zuschnappen –
//         vorstoßen, wiederholt; hit: zuckt zurück, blitzt hell (0,5 s); defeated: Kopf welkt und schrumpft, die
//         Ranke zieht sich von der Spitze zur Wurzel zurück (1,2 s), danach unsichtbar.
//   model.head(out?) → Weltposition der Kopfmitte (Trefferzone, Radius ≈0,45 m).
//   root.userData.length → Länge des aktuellen Pfads in m.
// stachelpanzer       ≈0,6 m  Stachelpanzer-Krabbler: petrolblauer Kuppelpanzer mit cremegelbem Rand und sieben gelb-
//   weißen Stacheln, pfirsichfarbenes Köpfchen mit großen Augen, vier Füßchen.
//   state { anim: 'walk'|'idle'|'flipped'|'defeated', speed }  flipped: liegt auf dem Rücken, strampelt;
//         defeated: auf dem Rücken, dreht sich, schrumpft weg (0,8 s).
// springklotz         ≈1,3 m  federnder Klotz mit Gesicht: pinker Würfel (0,82 m, weiße Sternpunkte, lachendes
//   Gesicht nach +X) auf einer Chromfeder mit Fußteller. Dient als Sprungfeder.
//   state { anim: 'idle'|'hop'|'squash', progress? (hop: 0..1 im Zyklus 0,9 s) }
//         idle: wippt sanft; hop: ducken – strecken – Flugpose (Feder gestreckt; der Motor bewegt root) – landen;
//         squash: Feder ganz zusammengedrückt, Gesicht kneift; beim Loslassen schwingt die Feder nach.
//   root.userData.top() → aktuelle Oberkante des Würfels in m (Ruhe ≈1,30).

import {
  THREE, TAU, Build, cached, vcol, std, basic, mesh, joint, eyes, makeModel, Clock, Blinker, damp, clamp, mix,
  smoothstep, instMesh, setInst, decals, onEllipsoid, placed, puffyStarGeo,
} from '../lib/kit.js';
import {
  ANT, ANT_GEO, ANT_EYES, ANT_EYE_OPTS, ANT_ANTENNA_AT, antBodyGeo, antHeadGeo, antLegGeo, antAntennaGeo, antLegPose, axisY, noise3,
} from '../lib/w4Geos.js';

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
const prog = (st, clk, dur) => (st.progress !== undefined ? clamp(st.progress, 0, 1) : clamp(clk.age / dur, 0, 1));

// =============================================================================================
// Ameisensoldat / Hörner-Ameisensoldat
// =============================================================================================
const LEG_AMP = 0.36, LEG_R = 0.36;
function buildAnt(horn) {
  return () => {
    const name = horn ? 'ameisensoldat_horn' : 'ameisensoldat';
    const root = new THREE.Group();
    const pose = joint();
    const body = joint();
    const bodyM = mesh(antBodyGeo(), vcol(0.28), {}, true);
    const head = joint(ANT_GEO.head.c);
    const headM = mesh(antHeadGeo(horn), vcol(0.28), {}, true);
    const eye = eyes(ANT_EYES, { key: 'w4:ant', ...ANT_EYE_OPTS, depth: 0.55 });
    const ant = joint(ANT_ANTENNA_AT, mesh(antAntennaGeo(), vcol(0.4)));
    head.add(headM, eye, ant);
    body.add(bodyM, head);
    const legs = instMesh(antLegGeo(), vcol(0.45), 6, 0.9, 0.3);
    legs.castShadow = true;
    pose.add(body, legs);
    root.add(pose);
    root.userData.back = 0.62;
    const clk = new Clock(), blink = new Blinker();
    let phase = Math.random() * TAU, sq = 0, low = 0, amp = 0, lift = 0;
    const update = (dt, st) => {
      const anim = st.anim ?? 'idle';
      clk.tick(dt, anim);
      const t = clk.t;
      const moving = anim === 'walk' || anim === 'carry';
      const carry = anim === 'carry';
      const speed = moving ? (st.speed ?? (carry ? 1.2 : 1.5)) : 0;
      const a = carry ? 0.28 : LEG_AMP;
      if (moving) phase += dt * (Math.max(0.3, speed) / (4 * a * LEG_R)) * TAU;
      const flat = anim === 'squashed';
      sq = damp(sq, flat ? 1 : 0, flat ? 26 : 9, dt);
      low = damp(low, carry ? 1 : 0, 8, dt);
      amp = damp(amp, moving ? a : 0, 10, dt);
      lift = damp(lift, moving ? 0.45 : 0, 10, dt);
      const bob = moving ? Math.abs(Math.sin(phase)) * 0.018 : Math.sin(t * 2.2) * 0.004;
      pose.position.y = bob - low * 0.04;
      pose.scale.set(1 + sq * 0.25, Math.max(0.05, 1 - sq * 0.66), 1 + sq * 0.3);
      body.rotation.x = moving ? Math.sin(phase) * 0.035 : 0;
      body.rotation.z = (moving ? Math.sin(phase * 2) * 0.02 : 0) + low * 0.05;
      // Kopf: nickt im Gang, schaut im Stehen umher, beim Tragen gesenkt
      head.rotation.z = (moving ? Math.sin(phase * 2 + 0.6) * 0.05 : 0) - low * 0.12;
      head.rotation.y = damp(head.rotation.y, anim === 'idle' ? Math.sin(t * 0.7) * 0.35 * clamp(Math.sin(t * 0.21) * 3, -1, 1) : 0, 4, dt);
      ant.rotation.x = Math.sin(t * 5.3) * 0.12;
      ant.rotation.z = damp(ant.rotation.z, carry ? 0.55 : flat ? 0.8 : Math.sin(t * 3.1) * 0.12, 8, dt);
      const splay = sq * 1.1;
      for (let k = 0; k < 6; k++) legs.setMatrixAt(k, antLegPose(k, phase, amp, lift, splay, 0.3 - low * 0.04, 1, _m));
      legs.instanceMatrix.needsUpdate = true;
      let bk = blink.update(dt, !flat);
      if (flat) bk = 0.1; else if (carry) bk = Math.min(bk, 0.72);
      eye.userData.blink(bk);
    };
    return makeModel(name, root, update, [legs], { initial: 'idle' });
  };
}

// =============================================================================================
// Riesenameise (Laufuntergrund)
// =============================================================================================
const GA = {
  body: 0x8a2a2c, bodyHi: 0xc95040, bodyLow: 0x561a22, deck: 0xf0d49a, deckDark: 0xd8b06a, rim: 0xc8603a, rivet: 0xffc21a,
  jaw: 0xfff0d0, lid: 0xa8383a, tip: 0xffd21f, claw: 0x2a1418,
};
const DECK = { y: 1.25, x0: -1.3, x1: 0.85, w: 1.35, th: 0.18 };
function giantBodyGeo() {
  return cached('w4:giant:body', () => {
    const b = new Build();
    const lak = { v: (x, y, z, nx, ny) => mix(GA.bodyLow, GA.bodyHi, smoothstep(ny * 0.6 + 0.45)) };
    // Hinterleib (unter dem Deck, ragt hinten heraus) mit hellen Ringen
    b.sphere(1, { v: (x, y, z, nx, ny) => {
      const base = mix(GA.bodyLow, GA.bodyHi, smoothstep(ny * 0.6 + 0.45));
      return Math.abs(x + 0.35) < 0.12 || Math.abs(x - 0.25) < 0.1 ? mix(base, 0xe08060, 0.45) : base;
    } }, { p: [-0.85, 0.82, 0], s: [0.7, 0.38, 0.56] }, 22, 14);
    b.sphere(0.16, GA.bodyLow, { p: [-0.12, 0.78, 0] }, 14, 10);
    // Brust
    b.sphere(1, lak, { p: [0.35, 0.8, 0], s: [0.52, 0.3, 0.42] }, 18, 12);
    // Deck: flache Platte, sandfarben mit Riffelstreifen quer, Terrakotta-Rand, flache Nieten
    const dl = DECK.x1 - DECK.x0, dc = (DECK.x0 + DECK.x1) / 2;
    b.box(dl, DECK.th, DECK.w, (x, y, z, nx, ny) => {
      if (ny > 0.7) {
        const edge = Math.abs(x) > dl / 2 - 0.12 || Math.abs(z) > DECK.w / 2 - 0.12;
        if (edge) return GA.rim;
        return Math.floor((x + z * 0.35) / 0.16) % 2 ? GA.deck : GA.deckDark;
      }
      return GA.rim;
    }, { p: [dc, DECK.y - DECK.th / 2, 0] }, 0.06, 1);
    // Halte-Gurt unter dem Deck (vorn/hinten)
    for (const x of [DECK.x0 + 0.35, DECK.x1 - 0.3]) b.torus(0.5, 0.045, GA.rim, { p: [x, 0.95, 0], r: [0, Math.PI / 2, 0], s: [1, 0.6, 1.3] }, 6, 24, Math.PI);
    for (const sx of [DECK.x0 + 0.13, DECK.x1 - 0.13]) for (const sz of [-1, 1]) b.cyl(0.06, 0.06, 0.012, GA.rivet, { p: [sx, DECK.y + 0.004, sz * (DECK.w / 2 - 0.13)] }, 10);
    // Stachel-Ende hinten
    b.sphere(0.14, GA.bodyLow, { p: [-1.52, 0.78, 0], s: [1.2, 0.8, 0.8] }, 12, 8);
    return b.geometry();
  });
}
function giantHeadGeo() {
  return cached('w4:giant:head', () => {
    const b = new Build();
    b.sphere(1, { v: (x, y, z, nx, ny) => mix(GA.bodyLow, GA.bodyHi, smoothstep(ny * 0.55 + 0.55)) }, { s: [0.44, 0.38, 0.42] }, 22, 16);
    // große, gebogene Kieferhörner
    for (const s of [1, -1]) {
      b.tube([[0.32, -0.16, s * 0.18], [0.5, -0.2, s * 0.24], [0.66, -0.17, s * 0.17], [0.74, -0.13, s * 0.06]], 0.045, GA.jaw, null, 14, 7);
      b.sphere(0.07, GA.jaw, { p: [0.3, -0.16, s * 0.18] }, 10, 8);
    }
    // Nase/Mundpartie
    b.sphere(0.12, GA.bodyLow, { p: [0.4, -0.12, 0], s: [0.6, 0.5, 1.1] }, 12, 8);
    // Wangen
    for (const s of [1, -1]) b.sphere(0.06, 0xff8fa0, { p: [0.33, -0.05, s * 0.3], s: [0.5, 0.5, 0.8] }, 10, 6);
    return b.geometry();
  });
}
function giantLegGeo() {
  return cached('w4:giant:leg', () => {
    const b = new Build();
    const hip = new THREE.Vector3(0, 0, 0.05), knee = new THREE.Vector3(0, 0.24, 0.58), foot = new THREE.Vector3(0, -0.78, 1.0);
    const seg = (a, c, r) => {
      const d = c.clone().sub(a), L = d.length();
      b.add(new THREE.CapsuleGeometry(r, L, 2, 7), { v: (x, y, z, nx, ny) => mix(GA.bodyLow, GA.body, smoothstep(ny * 0.5 + 0.5)) },
        new THREE.Matrix4().compose(a.clone().add(c).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), new THREE.Vector3(1, 1, 1)));
    };
    seg(hip, knee, 0.1);
    seg(knee, foot, 0.082);
    b.sphere(0.125, GA.body, { p: knee.toArray() }, 10, 7);
    b.sphere(1, GA.claw, { p: [0.05, -0.76, 1.0], s: [0.13, 0.06, 0.09] }, 10, 6);
    return b.geometry();
  });
}
function giantAntennaGeo() {
  return cached('w4:giant:antenna', () => {
    const b = new Build();
    for (const s of [1, -1]) {
      b.tube([[0, 0, s * 0.1], [0.12, 0.3, s * 0.2], [0.38, 0.45, s * 0.32], [0.62, 0.36, s * 0.4]], 0.032, GA.bodyLow, null, 14, 6);
      b.sphere(0.075, GA.tip, { p: [0.64, 0.36, s * 0.4] }, 12, 8);
    }
    return b.geometry();
  });
}
const GIANT_HIPS = [
  { x: 0.62, s: 1, yaw: 0.55, g: 0 }, { x: 0.36, s: 1, yaw: 0.0, g: 1 }, { x: 0.1, s: 1, yaw: -0.55, g: 0 },
  { x: 0.62, s: -1, yaw: 0.55, g: 1 }, { x: 0.36, s: -1, yaw: 0.0, g: 0 }, { x: 0.1, s: -1, yaw: -0.55, g: 1 },
];
function buildRiesenameise() {
  const root = new THREE.Group();
  const pose = joint();
  const bodyM = mesh(giantBodyGeo(), vcol(0.42), {}, true);
  bodyM.receiveShadow = true;
  const head = joint([1.12, 0.86, 0]);
  const headM = mesh(giantHeadGeo(), vcol(0.35), {}, true);
  const eye = eyes([{ p: [0.3, 0.12, 0.17], r: 0.14, sy: 1.15, dir: [1, 0.2, 0.55] }, { p: [0.3, 0.12, -0.17], r: 0.14, sy: 1.15, dir: [1, 0.2, -0.55] }],
    { key: 'w4:giant', iris: 0x6a2a1a, pupil: 0.55, depth: 0.55 });
  // schläfrige Lider (halb über den Augen)
  const lids = mesh(cached('w4:giant:lids', () => {
    const b = new Build();
    for (const s of [1, -1]) b.add(new THREE.SphereGeometry(0.152, 16, 8, 0, TAU, 0, Math.PI * 0.42), GA.lid, placed(new THREE.Vector3(0.3, 0.13, s * 0.17), new THREE.Vector3(0.35, 1, s * 0.35), new THREE.Vector3(1, 1.15, 1)));
    return b.geometry();
  }), vcol(0.35));
  const ant = joint([0.25, 0.25, 0], mesh(giantAntennaGeo(), vcol(0.4)));
  head.add(headM, eye, lids, ant);
  const legs = instMesh(giantLegGeo(), vcol(0.45), 6, 2.5, 0.8);
  legs.castShadow = true;
  pose.add(bodyM, head, legs);
  root.add(pose);
  root.userData.deck = { y: DECK.y, x0: DECK.x0, x1: DECK.x1, w: DECK.w };
  const clk = new Clock(), blink = new Blinker();
  let phase = Math.random() * TAU, amp = 0, lift = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    const moving = anim === 'walk' || anim === 'carry';
    const speed = moving ? (st.speed ?? 2) : 0;
    if (moving) phase += dt * (Math.max(0.3, speed) / (4 * 0.3 * 1.0)) * TAU;
    amp = damp(amp, moving ? 0.3 : 0, 6, dt);
    lift = damp(lift, moving ? 0.32 : 0, 6, dt);
    pose.position.y = moving ? Math.abs(Math.sin(phase)) * (anim === 'carry' ? 0.006 : 0.01) : 0;
    head.rotation.z = (moving ? Math.sin(phase * 2) * 0.04 : Math.sin(t * 0.8) * 0.03);
    head.rotation.y = moving ? Math.sin(phase) * 0.05 : Math.sin(t * 0.4) * 0.12;
    ant.rotation.x = Math.sin(t * 2.3) * 0.1;
    ant.rotation.z = Math.sin(t * 1.7) * 0.08;
    for (let k = 0; k < 6; k++) {
      const h = GIANT_HIPS[k];
      const ph = phase + (h.g ? Math.PI : 0);
      const sw = Math.sin(ph) * amp, up = Math.max(0, Math.cos(ph)) * lift;
      _e.set(-up, h.s > 0 ? h.yaw + sw : Math.PI - (h.yaw + sw), 0, 'YXZ');
      legs.setMatrixAt(k, _m.compose(_v.set(h.x, 0.82, h.s * 0.2), _q.setFromEuler(_e), _s.setScalar(1)));
    }
    legs.instanceMatrix.needsUpdate = true;
    eye.userData.blink(blink.update(dt));
  };
  return makeModel('riesenameise', root, update, [legs], { initial: 'idle' });
}

// =============================================================================================
// Rankenschnapper
// =============================================================================================
const CR = {
  head: 0x16a89c, headHi: 0x62e2d0, headLow: 0x0b6a68, spot: 0xfff2c8, lip: 0xffd23a, mouth: 0x7a1234, tongue: 0xff6a86,
  tooth: 0xffffff, vine: 0x2f8a34, vineHi: 0x6cc84a, ring: 0xdcf27a, leaf: 0x58c03a, leafHi: 0xa8ea5a, collar: 0xc8ea3a, collarLow: 0x7ab82a,
};
const HEAD_R = [0.46, 0.34, 0.4]; // Halbachsen (x, y, z) des Kopfes
const HINGE = -0.34;              // Scharnier hinten
function jawGeo(upper) {
  return cached(`w4:creeper:jaw:${upper}`, () => {
    const b = new Build();
    const s = upper ? 1 : -1;
    const th0 = upper ? 0 : Math.PI / 2;
    // Schale (Halbkugel), außen türkis mit Cremepunkten (nur oben), relativ zum Scharnier
    const g = new THREE.SphereGeometry(1, 30, 12, 0, TAU, th0, Math.PI / 2);
    g.scale(HEAD_R[0], HEAD_R[1] * (upper ? 1 : 0.8), HEAD_R[2]);
    const spotsDirs = [[0.2, 0.9, 0], [0.55, 0.6, 0.45], [0.55, 0.6, -0.45], [-0.2, 0.75, 0.6], [-0.2, 0.75, -0.6], [0.85, 0.35, 0.05], [-0.55, 0.65, 0.25], [-0.55, 0.65, -0.25]]
      .map((d) => new THREE.Vector3(...d).normalize());
    b.add(g, { v: (x, y, z, nx, ny) => {
      const l = Math.hypot(x / HEAD_R[0], y / HEAD_R[1], z / HEAD_R[2]) || 1;
      if (upper) for (const d of spotsDirs) if ((x / HEAD_R[0] * d.x + y / HEAD_R[1] * d.y + z / HEAD_R[2] * d.z) / l > 0.955) return CR.spot;
      return mix(CR.headLow, CR.headHi, smoothstep(ny * s * 0.6 + 0.4));
    } }, { p: [-HINGE, 0, 0] });
    // Gaumen/Zunge (flache Ellipse, etwas eingesenkt)
    const pal = new THREE.CircleGeometry(1, 28);
    pal.rotateX(upper ? Math.PI / 2 : -Math.PI / 2);
    b.add(pal, upper ? CR.mouth : { v: (x, y, z) => (Math.hypot(x, z) < 0.55 && x > -0.4 ? CR.tongue : CR.mouth) }, { p: [-HINGE, s * 0.01, 0], s: [HEAD_R[0] * 0.95, 1, HEAD_R[2] * 0.95] });
    // Lippe (Wulst am Rand)
    b.torus(1, 0.05, CR.lip, { p: [-HINGE, 0, 0], r: [Math.PI / 2, 0, 0], s: [HEAD_R[0] * 0.99, HEAD_R[2] * 0.99, upper ? 0.8 : 0.7] }, 6, 40);
    // Zähne rundum (vorn größer)
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + (upper ? 0 : Math.PI / n);
      const front = Math.max(0, Math.cos(a));
      if (Math.cos(a) < -0.55) continue; // hinten am Scharnier keine Zähne
      const h = 0.07 + front * 0.06;
      const p = [-HINGE + Math.cos(a) * HEAD_R[0] * 0.86, -s * h / 2, Math.sin(a) * HEAD_R[2] * 0.86];
      b.add(new THREE.ConeGeometry(0.035 + front * 0.012, h, 6), CR.tooth, { p, r: [upper ? Math.PI : 0, 0, 0] });
    }
    return b.geometry();
  });
}
function collarGeo() {
  return cached('w4:creeper:collar', () => {
    const b = new Build();
    const leaf = (len, w) => { const g = new THREE.SphereGeometry(1, 12, 8); g.scale(w, 0.035, len); g.translate(0, 0, len * 0.9); return g; };
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU;
      const d = new THREE.Vector3(-0.55, Math.cos(a), Math.sin(a)).normalize();
      b.add(leaf(0.24, 0.11), { v: (x, y, z) => mix(CR.collarLow, CR.collar, smoothstep(z / 0.4)) }, placed(new THREE.Vector3(HINGE - 0.02, 0, 0), d, new THREE.Vector3(1, 1, 1)));
    }
    b.sphere(0.2, CR.vine, { p: [HINGE - 0.05, 0, 0], s: [0.8, 1, 1] }, 14, 10);
    return b.geometry();
  });
}
function vineSegGeo() {
  return cached('w4:creeper:seg', () => {
    const b = new Build();
    b.add(new THREE.CapsuleGeometry(0.16, 0.22, 4, 12), { v: (x, y, z, nx, ny) => (Math.abs(y) < 0.045 ? CR.ring : mix(CR.vine, CR.vineHi, smoothstep(nx * 0.5 + 0.5))) });
    return b.geometry();
  });
}
function vineLeafGeo() {
  return cached('w4:creeper:leaf', () => {
    const b = new Build();
    for (const s of [1, -1]) {
      const g = new THREE.SphereGeometry(1, 12, 6);
      g.scale(0.14, 0.03, 0.3); g.translate(0, 0, 0.3);
      b.add(g, { v: (x, y, z) => (Math.abs(x) < 0.02 ? CR.leafHi : mix(CR.leaf, CR.leafHi, z / 0.6)) }, placed(new THREE.Vector3(0, 0, s * 0.1), new THREE.Vector3(0.3, 0.25, s).normalize(), new THREE.Vector3(1, 1, 1)));
    }
    return b.geometry();
  });
}
const SEG_LEN = 0.38;
function defaultPath(n) {
  const L = n * SEG_LEN;
  const rest = Math.max(0.4, L - 1.7);
  return [[0, 0, 0], [0, 0.85, 0], [0.42, 1.38, 0], [0.9, 1.45, 0], [0.9 + rest, 1.45, 0]];
}
function buildRankenschnapper(opts = {}) {
  const n = clamp(Math.round(opts.segments ?? 12), 4, 40);
  const root = new THREE.Group();
  const own = [];
  const headMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, emissive: 0x000000 });
  own.push(headMat);
  const segs = instMesh(vineSegGeo(), vcol(0.45), n, 30, 1);
  const nl = Math.ceil(n / 3);
  const leaves = instMesh(vineLeafGeo(), vcol(0.5), nl, 30, 1);
  segs.castShadow = true; leaves.castShadow = true;
  segs.frustumCulled = false; leaves.frustumCulled = false;
  const head = joint();
  const tilt = joint();
  const upper = joint([HINGE, 0.02, 0], mesh(jawGeo(true), headMat, {}, true));
  const lower = joint([HINGE, -0.02, 0], mesh(jawGeo(false), headMat, {}, true));
  const collar = mesh(collarGeo(), headMat, {}, true);
  const eye = eyes([{ p: [0.2, 0.0, 0.14], r: 0.075, sy: 1.1, dir: [0.6, 1, 0.45] }, { p: [0.2, 0.0, -0.14], r: 0.075, sy: 1.1, dir: [0.6, 1, -0.45] }],
    { key: 'w4:creeper', iris: 0xd81e3a, pupil: 0.5, depth: 0.5 });
  eye.position.y = 0.27;
  const eyeJ = joint([-HINGE, 0, 0], eye);
  upper.add(eyeJ);
  tilt.add(upper, lower, collar);
  head.add(tilt);
  root.add(segs, leaves, head);
  // Pfad (Kurve) – neu berechnen, wenn sich die Punkte ändern
  let curve = null, key = '', len = 1;
  const setPath = (pts) => {
    const k = pts.map((p) => p.map((x) => x.toFixed(3)).join(',')).join(';');
    if (k === key) return;
    key = k;
    const v = pts.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    curve = v.length >= 3 ? new THREE.CatmullRomCurve3(v, false, 'centripetal', 0.5) : new THREE.LineCurve3(v[0], v[1] ?? v[0].clone().add(new THREE.Vector3(0, 1, 0)));
    curve.arcLengthDivisions = 120;
    len = Math.max(0.01, curve.getLength());
    root.userData.length = len;
  };
  setPath(defaultPath(n));
  const clk = new Clock(), blink = new Blinker();
  const tan = new THREE.Vector3(), up = new THREE.Vector3(), side = new THREE.Vector3(), pos = new THREE.Vector3(), basis = new THREE.Matrix4();
  const Y = new THREE.Vector3(0, 1, 0);
  let open = 0.2, flash = 0, recoil = 0, wilt = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    if (Array.isArray(st.path) && st.path.length >= 2) setPath(st.path); else setPath(defaultPath(n));
    const dead = anim === 'defeated';
    const hit = anim === 'hit' && age < 0.5;
    wilt = dead ? clamp(age / 1.2, 0, 1) : 0;
    const grow = clamp(st.grow ?? 1, 0, 1) * (1 - wilt);
    const tip = grow * len;
    const spacing = len / n;
    // Rankenglieder ab der Wurzel bis zur Spitze
    for (let i = 0; i < n; i++) {
      const s = (i + 0.5) * spacing;
      if (s > tip + spacing * 0.3 || grow <= 0) { segs.setMatrixAt(i, ZERO); continue; }
      const u = clamp(s / len, 0, 1);
      curve.getPointAt(u, pos); curve.getTangentAt(u, tan);
      const sc = clamp((tip - s) / spacing + 0.7, 0.35, 1) * (1 - 0.1 * (i / n));
      _q.setFromUnitVectors(Y, tan);
      // leichtes Pulsieren entlang der Ranke
      const pulse = 1 + Math.sin(t * 3 - i * 0.7) * 0.03;
      segs.setMatrixAt(i, _m.compose(pos, _q, _s.set(sc * pulse, (spacing / 0.54) * 1.25, sc * pulse)));
      if (i % 3 === 1) {
        const li = (i - 1) / 3;
        _e.set(0, 0, 0);
        const lq = _q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(Y, i * 1.1));
        leaves.setMatrixAt(li, _m.compose(pos, lq, _s.setScalar(sc)));
      }
    }
    for (let li = 0; li < nl; li++) if (li * 3 + 1 >= n || (li * 3 + 1.5) * spacing > tip) leaves.setMatrixAt(li, ZERO);
    segs.instanceMatrix.needsUpdate = true; leaves.instanceMatrix.needsUpdate = true;
    // Kopf an der Spitze, entlang der Tangente
    const ut = clamp(tip / len, 0.0005, 1);
    curve.getPointAt(ut, pos); curve.getTangentAt(ut, tan);
    side.crossVectors(tan, Y);
    if (side.lengthSq() < 0.04) side.set(0, 0, 1); else side.normalize();
    up.crossVectors(side, tan).normalize();
    basis.makeBasis(tan, up, side);
    head.quaternion.setFromRotationMatrix(basis);
    // Schnappen: aufreißen – zuschnappen – vorstoßen
    let target = 0.18 + Math.sin(t * 2.2) * 0.07, lunge = 0;
    if (anim === 'snap') {
      const p = st.progress !== undefined ? clamp(st.progress, 0, 1) : (age % 0.7) / 0.7;
      if (p < 0.45) target = 0.2 + smoothstep(p / 0.45) * 0.75;
      else if (p < 0.55) target = 0.95 * (1 - smoothstep((p - 0.45) / 0.1));
      else target = 0;
      lunge = p < 0.45 ? -smoothstep(p / 0.45) * 0.12 : p < 0.7 ? smoothstep((p - 0.45) / 0.15) * 0.28 : 0.28 * (1 - smoothstep((p - 0.7) / 0.3));
      open = damp(open, target, 40, dt);
    } else {
      if (hit) target = 0.6;
      if (dead) target = 0.5;
      open = damp(open, target, 10, dt);
    }
    recoil = damp(recoil, hit ? 1 : 0, hit ? 30 : 6, dt);
    head.position.copy(pos).addScaledVector(tan, lunge + 0.38 - recoil * 0.3);
    upper.rotation.z = open * 0.62;
    lower.rotation.z = -open * 0.4;
    tilt.rotation.z = Math.sin(t * 1.5) * 0.06 - wilt * 0.9;
    tilt.rotation.x = Math.sin(t * 1.1) * 0.08 + (hit ? Math.sin(t * 45) * 0.12 : 0);
    const hs = (grow <= 0 && !dead) ? 0.001 : Math.max(0.001, (1 - wilt) * clamp(grow * len / 0.6 + 0.3, 0.3, 1));
    head.scale.setScalar(hs);
    head.visible = hs > 0.002;
    flash = damp(flash, hit ? 1 : 0, 25, dt);
    headMat.emissive.setRGB(flash * 0.7, flash * 0.65, flash * 0.5);
    let bk = blink.update(dt);
    if (hit || dead) bk = 0.12; else if (anim === 'snap') bk = 1;
    eye.userData.blink(bk);
  };
  const model = makeModel('rankenschnapper', root, update, [...own, segs, leaves], { initial: 'idle' });
  model.head = (out = new THREE.Vector3()) => { root.updateMatrixWorld(true); return head.getWorldPosition(out); };
  return model;
}

// =============================================================================================
// Stachelpanzer
// =============================================================================================
const SPZ = { shell: 0x13909e, shellHi: 0x5cd4dc, shellLow: 0x0a5a6a, rim: 0xffe08a, spike: 0xfff6c8, spikeLow: 0xffb42a, skin: 0xff9c62, skinHi: 0xffc8a0, foot: 0xe8743a };
function spzShellGeo() {
  return cached('w4:spz:shell', () => {
    const b = new Build();
    b.dome(0.34, { v: (x, y, z, nx, ny) => mix(SPZ.shellLow, SPZ.shellHi, smoothstep(ny * 0.7 + 0.2)) }, { p: [0, 0.14, 0], s: [1, 0.92, 1] }, Math.PI / 2, 28, 10);
    // sechseckige hellere Platten (Aufkleber) auf dem Panzer
    const hits = [[0, Math.PI / 2 - 0.01], [0, 0.65], [2.1, 0.65], [-2.1, 0.65]].map(([az, el]) => ({ ...onEllipsoid([0, 0.14, 0], [0.34, 0.313, 0.34], az, el), r: 0.1 }));
    decals(b, hits, 0.1, SPZ.shellHi, 0.18, 'hex');
    b.torus(0.34, 0.05, SPZ.rim, { p: [0, 0.15, 0], r: [Math.PI / 2, 0, 0] }, 8, 32);
    b.cyl(0.33, 0.3, 0.06, SPZ.rim, { p: [0, 0.12, 0] }, 24);
    // Stacheln: einer oben, sechs im Kranz
    const spike = (az, el, h) => {
      const hit = onEllipsoid([0, 0.14, 0], [0.34, 0.313, 0.34], az, el);
      b.add(new THREE.ConeGeometry(0.065, h, 9, 2), { v: (x, y) => mix(SPZ.spikeLow, SPZ.spike, smoothstep(y / h + 0.6)) }, axisY(hit.p.clone().addScaledVector(hit.n, h * 0.38).toArray(), hit.n.toArray()));
    };
    spike(0, Math.PI / 2, 0.2);
    for (let i = 0; i < 6; i++) spike((i / 6) * TAU + 0.5, 0.55, 0.17);
    return b.geometry();
  });
}
function spzHeadGeo() {
  return cached('w4:spz:head', () => {
    const b = new Build();
    b.sphere(1, { v: (x, y, z, nx, ny) => mix(SPZ.skin, SPZ.skinHi, smoothstep(ny * 0.6 + 0.5)) }, { s: [0.15, 0.14, 0.15] }, 20, 14);
    b.sphere(0.06, SPZ.skinHi, { p: [0.13, -0.035, 0], s: [0.8, 0.7, 1.1] }, 10, 8);
    for (const s of [1, -1]) b.sphere(0.012, 0x5a2a1a, { p: [0.175, -0.02, s * 0.025] }, 6, 4);
    for (const s of [1, -1]) b.sphere(0.028, 0xff7a8a, { p: [0.1, -0.05, s * 0.11], s: [0.6, 0.5, 0.9] }, 8, 6);
    return b.geometry();
  });
}
const spzFootGeo = () => cached('w4:spz:foot', () => new Build().sphere(1, { v: (x, y, z, nx, ny) => mix(SPZ.foot, SPZ.skin, smoothstep(ny + 0.3)) }, { s: [0.09, 0.055, 0.07] }, 12, 8).geometry());
function buildStachelpanzer() {
  const root = new THREE.Group();
  const pose = joint();
  const body = joint();
  const shell = mesh(spzShellGeo(), vcol(0.3), {}, true);
  const head = joint([0.33, 0.2, 0], mesh(spzHeadGeo(), vcol(0.4), {}, true));
  const eye = eyes([{ p: [0.1, 0.045, 0.06], r: 0.055, sy: 1.25, dir: [1, 0.2, 0.5] }, { p: [0.1, 0.045, -0.06], r: 0.055, sy: 1.25, dir: [1, 0.2, -0.5] }],
    { key: 'w4:spz', iris: 0x3a1a0a, pupil: 0.6, depth: 0.55 });
  head.add(eye);
  const feet = instMesh(spzFootGeo(), vcol(0.5), 4, 0.6, 0.1);
  feet.castShadow = true;
  body.add(shell, head);
  pose.add(body, feet);
  root.add(pose);
  const clk = new Clock(), blink = new Blinker();
  let phase = Math.random() * TAU, flip = 0, gone = 1;
  const FEET = [[0.17, 0.2], [0.17, -0.2], [-0.17, 0.2], [-0.17, -0.2]];
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    const walking = anim === 'walk';
    const speed = walking ? (st.speed ?? 1.2) : 0;
    if (walking) phase += dt * (6 + speed * 5);
    const flipped = anim === 'flipped' || anim === 'defeated';
    flip = damp(flip, flipped ? 1 : 0, 10, dt);
    gone = anim === 'defeated' ? Math.max(0.001, 1 - smoothstep((age - 0.3) / 0.5)) : 1;
    pose.rotation.x = flip * Math.PI;
    pose.position.y = flip * 0.47 + (walking ? Math.abs(Math.sin(phase)) * 0.025 : 0);
    pose.rotation.y = anim === 'defeated' ? age * 9 : 0;
    pose.scale.setScalar(gone);
    body.rotation.z = walking ? Math.sin(phase) * 0.06 : 0;
    body.rotation.x = walking ? Math.sin(phase * 0.5) * 0.04 : 0;
    head.rotation.y = anim === 'idle' ? Math.sin(t * 0.8) * 0.4 : 0;
    head.position.x = 0.33 + (walking ? Math.sin(phase * 2) * 0.01 : 0);
    FEET.forEach(([x, z], i) => {
      const ph = phase + (i === 0 || i === 3 ? 0 : Math.PI);
      let px = x, py = 0.05, rx = 0;
      if (walking) { px = x + Math.sin(ph) * 0.05; py = 0.05 + Math.max(0, Math.cos(ph)) * 0.04; }
      if (flipped) { py = 0.05 + Math.sin(t * 14 + i * 1.7) * 0.03; px = x + Math.cos(t * 12 + i) * 0.03; rx = Math.sign(z) * 0.4; }
      setInst(feet, i, px, py, z, rx, 0, 0);
    });
    feet.instanceMatrix.needsUpdate = true;
    let bk = blink.update(dt);
    if (anim === 'defeated') bk = 0.1; else if (anim === 'flipped') bk = 0.5 + Math.sin(t * 9) * 0.3;
    eye.userData.blink(bk);
  };
  return makeModel('stachelpanzer', root, update, [feet], { initial: 'idle' });
}

// =============================================================================================
// Springklotz
// =============================================================================================
const SK = { block: 0xff4fa0, blockHi: 0xff9ccc, blockLow: 0xc81e72, dot: 0xffffff, mouth: 0x5a0a2a, tongue: 0xff7a7a, cheek: 0xffd0e4, spring: 0xd8e0f0, plate: 0x4a4e66, plateHi: 0x7a80a0 };
const SPRING_H = 0.42, PLATE_H = 0.07, BLOCK = 0.82;
function skBlockGeo() {
  return cached('w4:sk:block', () => {
    const b = new Build();
    b.box(BLOCK, BLOCK, BLOCK, { v: (x, y, z, nx, ny) => mix(SK.blockLow, SK.blockHi, smoothstep(ny * 0.55 + 0.5 + y * 0.4)) }, { p: [0, BLOCK / 2, 0] }, 0.13, 3);
    // weiße Sternpunkte auf Seiten und Deckel
    const star = (p, n, sz) => b.add(puffyStarGeo(sz, sz * 0.48, 0.02, 0.012), SK.dot, placed(new THREE.Vector3(...p), new THREE.Vector3(...n), new THREE.Vector3(1, 1, 1)));
    const h = BLOCK / 2 + 0.003;
    for (const [p, n] of [[[-0.2, 0.6, h], [0, 0, 1]], [[0.15, 0.25, h], [0, 0, 1]], [[0.2, 0.6, -h], [0, 0, -1]], [[-0.15, 0.25, -h], [0, 0, -1]], [[-h, 0.5, 0.15], [-1, 0, 0]], [[-h, 0.25, -0.2], [-1, 0, 0]], [[0.15, BLOCK + 0.003, -0.18], [0, 1, 0]], [[-0.2, BLOCK + 0.003, 0.15], [0, 1, 0]]]) star(p, n, 0.075);
    // Gesicht (+X): breites Lachen mit Zunge, Wangen
    const shape = new THREE.Shape();
    shape.moveTo(-1, 0.25); shape.quadraticCurveTo(0, 0.05, 1, 0.25); shape.quadraticCurveTo(0.8, -0.95, 0, -0.95); shape.quadraticCurveTo(-0.8, -0.95, -1, 0.25);
    const mouth = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.012, bevelSegments: 1, curveSegments: 10 });
    mouth.scale(0.15, 0.12, 1);
    b.add(mouth, SK.mouth, placed(new THREE.Vector3(h - 0.008, 0.27, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, 1, 1)));
    b.sphere(1, SK.tongue, { p: [h + 0.005, 0.2, 0.02], s: [0.012, 0.045, 0.07] }, 10, 8);
    for (const s of [1, -1]) b.sphere(1, SK.cheek, { p: [h + 0.002, 0.32, s * 0.25], s: [0.01, 0.045, 0.07] }, 10, 6);
    // Anschlussplatte unten
    b.cyl(0.24, 0.27, 0.05, SK.plate, { p: [0, 0.0, 0] }, 20);
    return b.geometry();
  });
}
function skSpringGeo() {
  return cached('w4:sk:spring', () => {
    const b = new Build();
    const pts = [];
    const turns = 4.5, N = 72;
    for (let i = 0; i <= N; i++) { const a = (i / N) * turns * TAU; pts.push([Math.cos(a) * 0.19, (i / N) * 1, Math.sin(a) * 0.19]); }
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    b.add(new THREE.TubeGeometry(curve, 110, 0.034, 6, false), { v: (x, y, z, nx, ny) => mix(0x8a92a8, SK.spring, smoothstep(nx * 0.5 + ny * 0.3 + 0.5)) });
    return b.geometry();
  });
}
function skPlateGeo() {
  return cached('w4:sk:plate', () => {
    const b = new Build();
    b.cyl(0.3, 0.33, PLATE_H, { v: (x, y, z, nx, ny) => mix(SK.plate, SK.plateHi, smoothstep(ny * 0.6 + 0.4)) }, { p: [0, PLATE_H / 2, 0] }, 24);
    b.torus(0.31, 0.02, 0xffc21a, { p: [0, PLATE_H, 0], r: [Math.PI / 2, 0, 0] }, 5, 24);
    return b.geometry();
  });
}
function buildSpringklotz() {
  const root = new THREE.Group();
  const plate = mesh(skPlateGeo(), vcol(0.35), {}, true);
  const spring = mesh(skSpringGeo(), vcol(0.18, { metalness: 0.35 }, 'w4spring'), { p: [0, PLATE_H, 0] }, true);
  const block = joint([0, PLATE_H + SPRING_H, 0]);
  const blockM = mesh(skBlockGeo(), vcol(0.3), {}, true);
  const eye = eyes([{ p: [0.4, 0.55, 0.15], r: 0.1, sy: 1.25, dir: [1, 0.05, 0.25] }, { p: [0.4, 0.55, -0.15], r: 0.1, sy: 1.25, dir: [1, 0.05, -0.25] }],
    { key: 'w4:sk', iris: 0x2a7ad8, pupil: 0.55, depth: 0.5 });
  block.add(blockM, eye);
  root.add(plate, spring, block);
  const clk = new Clock(), blink = new Blinker();
  // Feder als gedämpfter Schwinger: c = Längenfaktor der Feder (1 = Ruhe)
  let c = 1, cv = 0, sq = 0;
  root.userData.top = () => PLATE_H + SPRING_H * c + BLOCK * (1 - sq * 0.15);
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    let target = 1 + Math.sin(t * 3.2) * 0.06, stiff = 90, air = 0;
    if (anim === 'squash') { target = 0.28; stiff = 500; }
    if (anim === 'hop') {
      const p = st.progress !== undefined ? clamp(st.progress, 0, 1) : (clk.age % 0.9) / 0.9;
      if (p < 0.25) target = 1 - smoothstep(p / 0.25) * 0.55;
      else if (p < 0.4) target = 0.45 + smoothstep((p - 0.25) / 0.15) * 0.85;
      else if (p < 0.85) { target = 1.3; air = 1; }
      else target = 1 - Math.sin(((p - 0.85) / 0.15) * Math.PI) * 0.35;
      stiff = 600;
    }
    // Federsimulation (unterkritisch gedämpft → Nachschwingen)
    const steps = Math.max(1, Math.ceil(dt / 0.008));
    for (let i = 0; i < steps; i++) {
      const h = dt / steps;
      cv += (stiff * (target - c) - 7 * cv) * h;
      c += cv * h;
    }
    c = clamp(c, 0.2, 1.45);
    sq = damp(sq, anim === 'squash' ? 1 : 0, 20, dt);
    spring.scale.set(1, SPRING_H * c, 1);
    block.position.y = PLATE_H + SPRING_H * c;
    block.scale.set(1 + sq * 0.1 + (1 - c) * 0.05, 1 - sq * 0.15 - Math.max(0, 1 - c) * 0.08 + Math.max(0, c - 1) * 0.06, 1 + sq * 0.1 + (1 - c) * 0.05);
    block.rotation.z = air ? Math.sin(t * 8) * 0.05 : Math.sin(t * 1.6) * 0.02;
    let bk = blink.update(dt);
    if (anim === 'squash') bk = 0.15; else if (air) bk = 1;
    eye.userData.blink(bk);
    eye.scale.setScalar(air ? 1.15 : 1);
  };
  return makeModel('springklotz', root, update, [], { initial: 'idle' });
}

export const MODELS = {
  ameisensoldat: buildAnt(false),
  ameisensoldat_horn: buildAnt(true),
  riesenameise: buildRiesenameise,
  rankenschnapper: buildRankenschnapper,
  stachelpanzer: buildStachelpanzer,
  springklotz: buildSpringklotz,
};
