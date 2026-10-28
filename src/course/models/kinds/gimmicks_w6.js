// Gimmicks und Items Welt 6 „Wolkeninseln“ (Kurs-Modus). Eigene Gestaltung. Maßstab Meter, Blick/Laufrichtung +X;
// Ursprung je Modell genannt; state darf ein String sein. progress (0..1) überschreibt bei Einmal-Animationen die Zeit seit
// dem Zustandswechsel.
//
// glasroehre_teil   Glasröhren-Teile passend zu 'glass_pipe_segment' und Baustein glasspipe (durchsichtiges Glas, weiße Ringe
//   mit Goldnieten, Glanzstreifen). **Ursprung = Achsmitte am Anschluss x = 0**, Achse entlang +X.
//   opts  { kind: 'gerade'|'bogen'|'t'|'kreuz'|'ende', length (gerade, 4), radius (1) }
//     gerade: x = 0 … length; bogen: Viertelbogen von +X nach +Z (Biegeradius 2·radius, endet bei (2r, 0, 2r), Öffnung +Z);
//     t: x = 0 … 4r, Abzweig nach +Z in der Mitte (bis z = 2r); kreuz: zusätzlich nach −Z;
//     ende: 1,4 m Rohr (x = 0 … 1,4) mit Trichter und dickem Ring an der Öffnung bei x = 0 (zeigt nach −X).  state –
// glasroehre_kreuzung  = glasroehre_teil mit kind 'kreuz' (Standard; opts wie oben).
// stachelkugel      Stachelkugel Ø ≈ size (Kugel mit Goldband und gerundeten Stacheln). Ursprung = Bodenpunkt, Mitte y = size/2.
//   opts  { size (1), color: 'eisen'|'lila'|'rot' }
//   state { anim: 'roll'|'idle'|'break', roll? (Drehwinkel in rad = Weg / (size/2), dreht um −Z → rollt nach +X),
//           speed? (m/s ohne roll; Standard 0), progress? (break: 0,6 s – zerplatzt in Staub, danach unsichtbar) }
// geisterschiff     Geisterschiff-Teile (verwittertes graugrünes Holz, Moos, grün leuchtende Bullaugen und Laternen).
//   opts  { part: 'ganz'|'rumpf'|'deck'|'mast'|'segel'|'laterne', length (12), width (5), height (Rumpftiefe 3; Mast 7),
//           sail: [w, h] ([4, 3,5]) }
//     ganz/rumpf: Bug +X, **Deck bei y = 0** (Ursprung = Deckmitte), Kiel bei ≈ −height; ganz mit Mast, zerfetztem Segel,
//       Krähennest und Bug-Laterne. deck: Dielen-Platte length × width, Oberseite y = 0, 0,3 m dick.
//     mast: Mast mit Rah und Krähennest, Fuß bei y = 0, Höhe height. segel: zerfetztes Segel, Oberkante (Rah) bei y = 0,
//       hängt nach unten, Fläche in Y-Z (bläht sich nach +X). laterne: Schiffslaterne, **Ursprung = Aufhängung oben**,
//       hängt ≈0,75 m herab.
//   state { anim: 'idle', lit (Bullaugen/Laterne leuchten, Standard true), wind (0..1 Segel bläht/flattert), sway }
// kippsteg          1 m breiter Kippsteg aus Planken (Geisterschiff), Längsachse +X. **Ursprung = Mitte der Oberseite = Drehachse.**
//   opts  { length (8), width (1), thick (0,25) }
//   state { tilt (rad um die Längsachse X; der Motor setzt den Winkel), warn (bool: knarzt und zittert) }
// schiebetuer       Papier-Schiebetür (Fernost): lackierter Holzrahmen, zwei Papierflügel mit Holzgitter. Fläche in Y-Z, Vorderseite +X,
//   **Ursprung = Mitte der Unterkante**. Flügel gleiten zur Seite (±Z) über den Rahmen hinaus.
//   opts  { width (2), height (2,4), panels (2 | 1: ein Flügel gleitet nach −Z) }
//   state { open (0..1), hint (bool: goldener Antipp-Schein pulsiert), tap (0..1: Flügel wackeln – frisch angetippt) }
// gong              Gong: rotes Lackgestell mit geschwungenem Querbalken, Bronze-Scheibe mit Buckel an Seilen, Schlägel.
//   Scheibe zeigt nach +X, Ursprung = Fußpunkt (Mitte), ≈2,6 m hoch.
//   state { anim: 'idle'|'ring', ring? (0..1 Schwingstärke, überschreibt), progress? (ring: 0..1 in 1,6 s) }
//         ring: Scheibe schwingt und bebt, goldene Schallringe laufen nach vorn.
// pilz_maske        Pilz-Maske: Gesichtsmaske eines Pilzlings (orange Kappe mit Cremetupfen, cremige Gesichtsplatte mit
//   grimmigen Augen und Zähnchen, Bänder).
//   opts  { mode: 'item' (Standard: schwebt ≈0,5 m über dem Fußpunkt, dreht sich, glänzt) | 'kopf' (Kopf-Zubehör:
//           **Ursprung = Kopfmitte**, Gesicht nach +X, Breite = size), size (Kopfbreite in m, 0,5) }
//   state { anim: 'idle'|'collected', progress? (collected: 0,5 s – wirbelt hoch, schrumpft, Funkeln) }
// klettergitter     Klettergitter (Dschungel): Bambusrahmen mit diagonal geflochtenen Ranken, Knoten und Blättchen. Fläche in Y-Z,
//   Vorderseite +X, **Ursprung = Mitte der Unterkante**.  opts { size: [w, h] ([2, 2]), frame (true) }
//   state { shake (0..1: rüttelt – jemand klettert/springt dagegen) }.  Viele Kacheln → createInstanced('klettergitter').
// windboe_fahne     Windanzeige: rot-weißer Mast mit drehbarem Windsack, bei Böen weiße Windfahnen ringsum. Ursprung = Mastfuß.
//   opts  { height (2,6) }
//   state { wind (0..1 Stärke: Windsack bläht sich), dir (rad um Y, Richtung, in die der Wind weht; 0 = +X),
//           gust (bool: Böe – Windfahnen sichtbar auch bei wenig Wind) }
// foerderband       Förderband: Stahlrahmen mit Warnstreifen, Endrollen, laufendes Band mit gelben Pfeilen (laufen nach +X).
//   **Ursprung = Mitte der Unterseite**, Oberseite y = thick.  opts { length (X, 4), width (Z, 2), thick (0,5) }
//   state { offset (m, Bandstellung – der Motor setzt sie, z. B. offset += speed·dt), speed? (m/s, nur ohne offset: läuft
//           von selbst) }.  Viele Kacheln → createInstanced('foerderband') (gemeinsamer offset).
// quetschblock      Quetschblock: genieteter Eisenblock mit Warnstreifen-Rahmen, grimmigem Gesicht (Augen, Zahnreihe) vorn (+X)
//   und Kolbenstange hinten (−X). **Ursprung = Körpermitte.**  opts { size: [x, y, z] ([2, 2, 2]), rod (Kolbenlänge, 1,5) }
//   state { anim: 'idle', warn (0..1: zittert, Augen glühen rot, Dampf), slam (0..1: Zähne gefletscht, Aufprall-Stauchung) }
// wurfball          Wurfball Ø 0,5 m (6-Haus): cremeweißer Lederball mit zwei geschwungenen orangen Nahtbändern, blauen Stichen und
//   goldenem Stern. Ursprung = Bodenpunkt (Mitte y = 0,25).
//   state { anim: 'idle'|'carried'|'thrown'|'hit', roll? (rad, dreht um −Z), progress? (hit 0,4 s) }
// riesen_frageblock großer ?-Block (Funkel-Stempel wie question_block) Kante size; wächst mit grow zu einem Turm aus Blöcken.
//   **Ursprung = Mitte der Unterseite.**  opts { size (2), height (Turmhöhe bei grow 1 unter dem Kopfblock, 6) }
//   state { grow (0..1), anim: 'idle'|'bump', n? }  root.userData.top → aktuelle Oberkante (grow·height + size).
// wippe             Wippe (Mine): Holzbrett mit Eisenbändern und Griffleisten auf einem Holzbock mit Achse.
//   **Ursprung = Drehpunkt = Mitte der Brett-Oberseite**, Bock bis −height.  opts { length (6), width (2), thick (0,3), height (1,1) }
//   state { tilt (rad um Z; positiv hebt das +X-Ende) }
// wolkenplattform   flauschige Wolke mit flacher Oberseite. **Ursprung = Mitte der Unterseite**, Oberseite y = h.
//   opts  { size: [w, h, d] ([3, 0,6, 3]) }  state { anim: 'idle'|'step'|'reveal'|'hidden', progress? (reveal 0,5 s) }
//   root.userData.top → h.

import {
  THREE, TAU, Build, cached, vcol, basic, std, metal, mesh, joint, eyes, makeModel, Clock, Blinker, damp, clamp, mix, col,
  smoothstep, lerp, instMesh, setInst, glowSprite, sparkleSprite, placed, roundedBox, SIDE, puffyStarGeo, onEllipsoid,
} from '../lib/kit.js';
import {
  W6, glassMat, spikeBallGeo, spikeMat, hullGeo, hullShape, gitterGeo, beltTexture, beltFrameGeo, beltRollerGeo, beltTopGeo, cloudGeo, cloudPuffs, puffyGeo, mouthShape, gradV,
  ownMat, Puffs, taperTube, glowV, addMat, hash1, noise3, stick, superCube,
} from '../lib/w6Geos.js';
import { questionGeo, blockMat } from '../lib/blockGeos.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
const prog = (st, clk, dur, loop = false) => (st.progress !== undefined ? clamp(st.progress, 0, 1) : loop ? (clk.age % dur) / dur : clamp(clk.age / dur, 0, 1));
const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);

// =============================================================================================
// Glasröhren-Teile
// =============================================================================================
const RING = 0xf4fbff;
function glassTubeGeo(kind, L, r) {
  return cached(`w6:glass:${kind}:${L}:${r}`, () => {
    const parts = [];
    const straight = (x0, x1, rotY = 0, z0 = 0) => {
      const g = new THREE.CylinderGeometry(r, r, x1 - x0, 32, 1, true);
      g.rotateZ(Math.PI / 2); g.translate((x0 + x1) / 2, 0, 0);
      if (rotY) { g.rotateY(rotY); }
      if (z0) g.translate(0, 0, z0);
      parts.push(g);
    };
    if (kind === 'gerade') straight(0, L);
    else if (kind === 'bogen') { const g = new THREE.TorusGeometry(2 * r, r, 20, 24, Math.PI / 2); g.rotateX(-Math.PI / 2); g.translate(0, 0, 2 * r); parts.push(g); }
    else if (kind === 't' || kind === 'kreuz') {
      straight(0, 4 * r);
      const b1 = new THREE.CylinderGeometry(r, r, r * 1.05, 32, 1, true); b1.rotateX(Math.PI / 2); b1.translate(2 * r, 0, r * 1.45); parts.push(b1);
      if (kind === 'kreuz') { const b2 = b1.clone(); b2.translate(0, 0, -r * 2.9); parts.push(b2); }
    } else { // ende
      straight(0.35, 1.4);
      const bell = new THREE.LatheGeometry([[r * 1.32, 0], [r * 1.2, 0.08], [r * 1.06, 0.22], [r, 0.36]].map(([x, y]) => new THREE.Vector2(x, y)), 32);
      bell.rotateZ(-Math.PI / 2); parts.push(bell);
    }
    const nonIdx = parts.map((g) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k); return n; });
    const b = new Build();
    for (const g of nonIdx) b.parts.push(g);
    return b.geometry();
  });
}
function glassRingGeo(kind, L, r) {
  return cached(`w6:glassRing:${kind}:${L}:${r}`, () => {
    const b = new Build();
    const ring = (p, dir, R = r + 0.03, t = 0.075) => {
      const d = new THREE.Vector3(...dir).normalize();
      b.add(new THREE.TorusGeometry(R, t, 8, 40), { v: (x, y, z, nx, ny) => mix(0xc8dcf0, RING, smoothstep(ny * 0.5 + 0.6)) }, placed(new THREE.Vector3(...p), d, new THREE.Vector3(1, 1, 1)));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + 0.26;
        const side = new THREE.Vector3(0, 1, 0); if (Math.abs(d.y) > 0.9) side.set(1, 0, 0);
        const u = new THREE.Vector3().crossVectors(d, side).normalize(), v = new THREE.Vector3().crossVectors(d, u);
        const q = new THREE.Vector3(...p).addScaledVector(u, Math.cos(a) * (R + t * 0.55)).addScaledVector(v, Math.sin(a) * (R + t * 0.55));
        b.sphere(0.03, W6.gold, { p: q.toArray() }, 6, 4);
      }
    };
    const glint = (x0, x1) => { for (const a of [0.55, 0.85]) b.box(Math.max(0.1, x1 - x0 - 0.3), 0.025, 0.06, 0xffffff, { p: [(x0 + x1) / 2, Math.cos(a) * r * 0.985, -Math.sin(a) * r * 0.985], r: [a, 0, 0] }, 0, 1); };
    if (kind === 'gerade') { ring([0, 0, 0], [1, 0, 0]); ring([L, 0, 0], [1, 0, 0]); glint(0, L); for (let x = 4; x < L - 0.5; x += 4) ring([x, 0, 0], [1, 0, 0], r + 0.015, 0.04); }
    else if (kind === 'bogen') { ring([0, 0, 0], [1, 0, 0]); ring([2 * r, 0, 2 * r], [0, 0, 1]); }
    else if (kind === 't' || kind === 'kreuz') {
      ring([0, 0, 0], [1, 0, 0]); ring([4 * r, 0, 0], [1, 0, 0]); ring([2 * r, 0, 2 * r], [0, 0, 1]);
      ring([2 * r, 0, r * 0.97], [0, 0, 1], r + 0.05, 0.06);
      if (kind === 'kreuz') { ring([2 * r, 0, -2 * r], [0, 0, 1]); ring([2 * r, 0, -r * 0.97], [0, 0, 1], r + 0.05, 0.06); }
      glint(0, 4 * r);
    } else {
      ring([0, 0, 0], [1, 0, 0], r * 1.32 + 0.02, 0.14); ring([1.4, 0, 0], [1, 0, 0]); glint(0.4, 1.4);
      b.torus(r * 1.32 + 0.02, 0.05, W6.gold, { p: [0.02, 0, 0], r: [0, Math.PI / 2, 0] }, 6, 40);
    }
    return b.geometry();
  });
}
function buildGlasroehre(defKind) {
  return (opts = {}) => {
    const kind = ['gerade', 'bogen', 't', 'kreuz', 'ende'].includes(opts.kind) ? opts.kind : defKind;
    const r = Math.max(0.3, num(opts.radius, 1));
    const L = Math.max(0.5, num(opts.length, 4));
    const root = new THREE.Group();
    const tube = mesh(glassTubeGeo(kind, kind === 'gerade' ? L : 0, r), glassMat());
    tube.renderOrder = 2;
    const rings = mesh(glassRingGeo(kind, kind === 'gerade' ? L : 0, r), vcol(0.25), {}, true);
    root.add(rings, tube);
    return makeModel(defKind === 'kreuz' && !opts.kind ? 'glasroehre_kreuzung' : 'glasroehre_teil', root, () => {});
  };
}

// =============================================================================================
// Stachelkugel
// =============================================================================================
function buildStachelkugel(opts = {}) {
  const size = Math.max(0.2, num(opts.size, 1));
  const color = ['eisen', 'lila', 'rot'].includes(opts.color) ? opts.color : 'eisen';
  const root = new THREE.Group();
  const own = [];
  const spin = joint([0, size / 2, 0], mesh(spikeBallGeo(color), spikeMat(), {}, true));
  spin.scale.setScalar(size);
  const dust = new Puffs(10, 0xd8d0e8, { opacity: 0.85, radius: 3 * size, cy: size / 2 });
  own.push(dust);
  root.add(spin, dust.mesh);
  const clk = new Clock();
  let ang = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'roll';
    clk.tick(dt, anim);
    if (st.roll !== undefined) ang = -Number(st.roll) || 0;
    else ang -= dt * num(st.speed, 0) / (size / 2);
    spin.rotation.z = ang;
    if (anim === 'break') {
      const p = prog(st, clk, 0.6);
      if (clk.entered) dust.burst([0, size / 2, 0], { count: 10, speed: 2.5 * size, up: 1, size: 0.25 * size, life: 0.6, spread: 0.3 * size, force: true });
      const k = smoothstep(p * 2.5);
      spin.scale.setScalar(size * Math.max(0.001, 1 - k));
      spin.visible = k < 0.99;
    } else { spin.scale.setScalar(size); spin.visible = true; }
    dust.step(dt);
  };
  return makeModel('stachelkugel', root, update, own, { initial: 'roll' });
}

// =============================================================================================
// Geisterschiff
// =============================================================================================
const shipMat = () => vcol(0.72, { toy: { rim: 0.45, spec: 0.3, sat: 1 } }, 'w6ship');
const woodV = (lo = W6.ghostLow, hi = W6.ghostHi) => ({ v: (x, y, z, nx, ny) => mix(lo, hi, smoothstep(ny * 0.4 + nx * 0.25 + 0.45 + noise3(x * 4, y * 4, z * 4) * 0.3 - 0.15)) });
/** Bullaugen-Lagen auf der Außenhaut: [{ p, n }]. */
function portSpots(L, W, H) {
  const hs = hullShape(L, W, H), out = [];
  for (const t of [-0.28, -0.12, 0.04, 0.2]) for (const s of [1, -1]) {
    const a = s > 0 ? 0.42 : Math.PI - 0.42;
    const p = hs.at(t * L, a), q = hs.at(t * L, a + 0.05 * s), n = new THREE.Vector3(0, 0, s);
    const tg = q.clone().sub(p).normalize();
    n.addScaledVector(tg, -n.dot(tg)).normalize();
    out.push({ p, n });
  }
  return out;
}
function portholeGeo(L, W, H, stern = false) {
  return cached(`w6:ship:port:${L}:${W}:${H}:${stern}`, () => {
    const b = new Build();
    for (const { p, n } of portSpots(L, W, H)) b.add(new THREE.CircleGeometry(0.16, 16), { v: (xx, y) => mix(0x2affb8, 0xd8fff0, smoothstep(0.6 - Math.hypot(xx, y) / 0.16)) }, placed(p.clone().addScaledVector(n, 0.03), n, new THREE.Vector3(1, 1, 1)));
    if (stern) {
      // Fenster der Achterdeck-Kajüte (zeigen nach +X zum Hauptdeck)
      const x = -L * 0.22 + 0.02;
      for (const z of [-W * 0.18, W * 0.18]) b.box(0.02, 0.42, 0.36, { v: (xx, y, zz) => mix(0x2affb8, 0xd8fff0, smoothstep(0.7 - Math.hypot(y / 0.21, zz / 0.18) * 0.6)) }, { p: [x + 0.01, 0.62, z] }, 0, 1);
    }
    return b.geometry();
  });
}
/** Aufbauten des ganzen Schiffs: Achterdeck mit Kajüte und Geländer, Relingpfosten mit Handlauf, Bugspriet, Heckflagge. */
function shipExtrasGeo(L, W, H) {
  return cached(`w6:ship:extras:${L}:${W}:${H}`, () => {
    const b = new Build();
    const hs = hullShape(L, W, H);
    const wood = woodV(W6.woodLow, 0x9a8468), dark = woodV(W6.ghostDark, W6.ghostLow);
    const x0 = -L / 2 + 0.25, x1 = -L * 0.22, ah = 1.2;
    const wAt = (x) => hs.width((x + L / 2) / L), yAt = (x) => hs.sheer((x + L / 2) / L);
    // Achterdeck: Kasten mit Planken, Kajütenwand mit Tür
    const ww = Math.min(wAt(x0), wAt(x1)) * 1.9;
    b.box(x1 - x0, ah, ww, { v: (x, y, z, nx, ny) => (ny > 0.7 ? mix(0x8a7a68, 0xb8a888, hash1(Math.floor(z / 0.4 + 20)) * 0.7) : Math.floor((y + 2) / 0.3) % 2 ? col(W6.ghostLow) : col(W6.ghost)) }, { p: [(x0 + x1) / 2, yAt(x1) + ah / 2 - 0.05, 0] }, 0.05, 1);
    b.box(0.06, 0.9, 0.55, dark, { p: [x1 + 0.03, yAt(x1) + 0.45, 0] }, 0.02, 1);
    b.sphere(0.04, W6.bronzeHi, { p: [x1 + 0.07, yAt(x1) + 0.45, 0.18] }, 6, 4);
    for (const z of [-W * 0.18, W * 0.18]) b.box(0.06, 0.5, 0.44, dark, { p: [x1 + 0.0, yAt(x1) + 0.62, z] }, 0.02, 1);
    // Geländer des Achterdecks
    const top = yAt(x1) + ah - 0.05;
    for (const s of [1, -1]) {
      for (let x = x0 + 0.1; x <= x1 + 0.01; x += 0.45) b.cyl(0.04, 0.05, 0.55, wood, { p: [x, top + 0.27, s * (ww / 2 - 0.06)] }, 6);
      b.box(x1 - x0, 0.08, 0.1, wood, { p: [(x0 + x1) / 2, top + 0.56, s * (ww / 2 - 0.06)] }, 0.02, 1);
    }
    for (let z = -ww / 2 + 0.1; z <= ww / 2 - 0.05; z += 0.45) b.cyl(0.04, 0.05, 0.55, wood, { p: [x1 - 0.06, top + 0.27, z] }, 6);
    b.box(0.1, 0.08, ww, wood, { p: [x1 - 0.06, top + 0.56, 0] }, 0.02, 1);
    // Relingpfosten mit Handlauf mittschiffs bis zum Bug
    for (const s of [1, -1]) {
      const rail = [];
      for (let x = x1 + 0.4; x < L * 0.4; x += 0.55) {
        const z = s * (wAt(x) - 0.06), y = yAt(x);
        b.cyl(0.035, 0.045, 0.6, wood, { p: [x, y + 0.3, z] }, 6);
        rail.push([x, y + 0.62, z]);
      }
      if (rail.length > 1) b.add(taperTube(rail, 0.045, rail.length * 4, 6), wood, null);
    }
    // Bugspriet
    const bx = L / 2 - 0.2, by = yAt(L / 2) + 0.2;
    const d = new THREE.Vector3(Math.cos(0.42), Math.sin(0.42), 0);
    b.add(taperTube([[bx - 0.6, by - 0.15, 0], [bx, by, 0], new THREE.Vector3(bx, by, 0).addScaledVector(d, L * 0.18).toArray()], (t) => 0.11 - t * 0.06, 8, 7), wood, null);
    // Heckflagge (Fetzen) am Flaggenstock
    b.cyl(0.04, 0.04, 1.6, dark, { p: [x0 + 0.1, top + 0.8, 0] }, 6);
    const fs = new THREE.Shape(); fs.moveTo(0, 0); fs.lineTo(0.85, -0.06); fs.lineTo(0.62, -0.22); fs.lineTo(0.9, -0.36); fs.lineTo(0.45, -0.44); fs.lineTo(0, -0.5); fs.closePath();
    const flag = new THREE.ShapeGeometry(fs); flag.rotateY(Math.PI);
    b.add(flag, 0x2a2a3a, { p: [x0 + 0.08, top + 1.58, 0] });
    return b.geometry();
  });
}
function portRimGeo(L, W, H) {
  return cached(`w6:ship:rim:${L}:${W}:${H}`, () => {
    const b = new Build();
    for (const { p, n } of portSpots(L, W, H)) b.add(new THREE.TorusGeometry(0.19, 0.05, 6, 16), gradV(W6.bronzeLow, W6.bronzeHi), placed(p.clone().addScaledVector(n, 0.01), n, new THREE.Vector3(1, 1, 1)));
    return b.geometry();
  });
}
function mastGeo(h) {
  return cached(`w6:ship:mast:${h}`, () => {
    const b = new Build();
    const w = woodV(W6.woodLow, 0x9a8468);
    b.cyl(0.16, 0.22, h, w, { p: [0, h / 2, 0] }, 12);
    for (const y of [0.4, h * 0.45, h * 0.8]) b.torus(0.19, 0.035, W6.ghostDark, { p: [0, y, 0], r: [Math.PI / 2, 0, 0] }, 5, 14);
    // Rah (quer, entlang Z) mit Enden
    b.cyl(0.09, 0.09, Math.min(5, h * 0.75), w, { p: [0.18, h * 0.78, 0], r: [Math.PI / 2, 0, 0] }, 10);
    // Krähennest
    b.cyl(0.55, 0.45, 0.45, (x, y, z) => (Math.floor((Math.atan2(z, x) + 4) * 4) % 2 ? col(0x6a5a48) : col(0x8a7a62)), { p: [0, h * 0.9, 0] }, 14, true);
    b.cyl(0.5, 0.5, 0.06, 0x5a4a3a, { p: [0, h * 0.9 - 0.2, 0] }, 14);
    // zerfledderte Fahne
    const fs = new THREE.Shape(); fs.moveTo(0, 0); fs.lineTo(0.9, -0.05); fs.lineTo(0.7, -0.2); fs.lineTo(0.95, -0.32); fs.lineTo(0.55, -0.4); fs.lineTo(0.0, -0.45); fs.closePath();
    b.add(new THREE.ShapeGeometry(fs), 0x3a2a3a, { p: [-0.05, h + 0.35, 0], r: [0, Math.PI, 0] });
    b.cyl(0.04, 0.04, 0.5, 0x4a3a2a, { p: [0, h + 0.2, 0] }, 6);
    return b.geometry();
  });
}
function sailGeo(w, h) {
  return cached(`w6:ship:sail:${w}:${h}`, () => {
    // zerfetztes Segel: Gitter in Y-Z (Oberkante y = 0), nach +X gebläht; Zellen in Rissen und am ausgefransten Saum fehlen
    const NU = 16, NV = 12, pos = [], idx = [];
    for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) {
      const u = i / NU, v = j / NV;
      const jit = j > 0 && i > 0 && i < NU ? (hash1(i * 13.1 + j * 7.7) - 0.5) * 0.35 : 0;
      const z = (u - 0.5) * w + jit * w / NU, y = -v * h + (j > 0 ? jit * h / NV : 0);
      pos.push(Math.sin(Math.PI * u) * (0.25 + 0.3 * v) * Math.min(1, w / 3), y, z);
    }
    const hole = (u, v) => ((u - 0.3) ** 2 / 0.012 + (v - 0.45) ** 2 / 0.02 < 1) || ((u - 0.68) ** 2 / 0.006 + (v - 0.7) ** 2 / 0.012 < 1);
    const edge = (u) => 0.82 + 0.18 * Math.abs(Math.sin(u * 11.3 + 0.7)) - (u < 0.12 || u > 0.9 ? 0.25 : 0);
    for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
      const u = (i + 0.5) / NU, v = (j + 0.5) / NV;
      if (hole(u, v) || v > edge(u)) continue;
      const a = j * (NU + 1) + i, b2 = a + 1, c = a + NU + 1, d = c + 1;
      idx.push(a, c, b2, b2, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const b = new Build();
    b.add(g, { v: (x, y, z) => mix(0x8a9488, 0xeceed8, smoothstep(0.8 + y / h * 0.55 + noise3(z * 2, y * 2, 0) * 0.5 - 0.25)) }, null);
    return b.geometry();
  });
}
function lanternGeo() {
  return cached('w6:ship:lantern', () => {
    const b = new Build();
    const iron = gradV(0x1e2428, 0x5a6a70);
    b.torus(0.06, 0.015, iron, { p: [0, -0.06, 0] }, 5, 12);
    b.cyl(0.015, 0.015, 0.12, iron, { p: [0, -0.15, 0] }, 5);
    b.cone(0.2, 0.16, iron, { p: [0, -0.28, 0] }, 12);
    b.cyl(0.17, 0.17, 0.04, iron, { p: [0, -0.37, 0] }, 12);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + Math.PI / 4; b.cyl(0.018, 0.018, 0.34, iron, { p: [Math.cos(a) * 0.15, -0.55, Math.sin(a) * 0.15] }, 5); }
    b.cyl(0.18, 0.15, 0.06, iron, { p: [0, -0.74, 0] }, 12);
    b.sphere(0.03, W6.bronzeHi, { p: [0, -0.8, 0] }, 6, 4);
    return b.geometry();
  });
}
const lanternGlassGeo = () => cached('w6:ship:lglass', () => new Build().cyl(0.14, 0.14, 0.32, { v: (x, y) => mix(0x2affb8, 0xe0fff4, smoothstep(0.5 - Math.abs(y) / 0.2)) }, { p: [0, -0.55, 0] }, 12).geometry());
function buildGeisterschiff(opts = {}) {
  const part = ['ganz', 'rumpf', 'deck', 'mast', 'segel', 'laterne'].includes(opts.part) ? opts.part : 'ganz';
  const L = Math.max(3, num(opts.length, 12)), W = Math.max(1.5, num(opts.width, 5));
  const H = Math.max(1, num(opts.height, part === 'mast' ? 7 : 3));
  const sail = Array.isArray(opts.sail) ? opts.sail : [Math.min(4, W * 0.85), 3.5];
  const root = new THREE.Group();
  const own = [];
  const clk = new Clock();
  const glows = [];
  let sailM = null, sailJ = null, lamp = null, lampGlow = null;
  const addLantern = (parent, p) => {
    lamp = joint(p);
    lamp.add(mesh(lanternGeo(), vcol(0.45, { metalness: 0.4 }, 'w6iron'), {}, true));
    const gl = mesh(lanternGlassGeo(), glowV());
    lamp.add(gl); glows.push(gl);
    lampGlow = glowSprite(0x5affc8, 1.4, 0.7); lampGlow.position.y = -0.55;
    lamp.add(lampGlow);
    parent.add(lamp);
  };
  if (part === 'ganz' || part === 'rumpf') {
    const hull = mesh(hullGeo(L, W, H), shipMat(), {}, true);
    hull.receiveShadow = true;
    const ports = mesh(portholeGeo(L, W, H, part === 'ganz'), glowV());
    const rims = mesh(portRimGeo(L, W, H), vcol(0.4), {}, false);
    glows.push(ports);
    root.add(hull, ports, rims);
    if (part === 'ganz') {
      const mh = Math.max(4, H * 2.4);
      root.add(mesh(mastGeo(mh), shipMat(), { p: [-L * 0.05, 0, 0] }, true));
      sailJ = joint([-L * 0.05 + 0.28, mh * 0.78 - 0.1, 0]);
      sailM = mesh(sailGeo(sail[0], Math.min(sail[1], mh * 0.6)), vcol(0.8, { side: THREE.DoubleSide, toy: { rim: 0.3, spec: 0.2, sat: 1 } }, 'w6sail'), {}, true);
      sailJ.add(sailM);
      root.add(sailJ);
      addLantern(root, [L * 0.36 - 0.2, 1.9 + hullShape(L, W, H).sheer(0.86), 0]);
      root.add(mesh(shipExtrasGeo(L, W, H), shipMat(), {}, true));
      root.add(mesh(cached('w6:ship:bowpost', () => new Build().cyl(0.06, 0.08, 1.9, woodV(W6.woodLow, 0x9a8468), { p: [0, 0.95, 0] }, 8).cyl(0.04, 0.04, 0.5, 0x4a3a2a, { p: [-0.2, 1.85, 0], r: [0, 0, Math.PI / 2] }, 6).geometry()), shipMat(), { p: [L * 0.36, hullShape(L, W, H).sheer(0.86), 0] }, true));
    }
  } else if (part === 'deck') {
    root.add(mesh(cached(`w6:ship:deck:${L}:${W}`, () => {
      const b = new Build();
      const n = Math.max(2, Math.round(W / 0.42));
      for (let i = 0; i < n; i++) {
        const z = (i + 0.5) / n * W - W / 2;
        b.box(L, 0.3, W / n - 0.03, mix(0x8a7a68, 0xb8a888, hash1(i * 7.7) * 0.7), { p: [0, -0.15, z] }, 0.04, 1);
      }
      for (const x of [-L / 2 + 0.3, 0, L / 2 - 0.3]) b.box(0.25, 0.25, W, W6.ghostDark, { p: [x, -0.42, 0] }, 0.03, 1);
      for (let i = 0; i < n; i++) for (const x of [-L / 2 + 0.3, L / 2 - 0.3]) b.sphere(0.03, 0x5a6a70, { p: [x, 0.005, (i + 0.5) / n * W - W / 2] }, 5, 3);
      return b.geometry();
    }), shipMat(), {}, true));
  } else if (part === 'mast') {
    root.add(mesh(mastGeo(H), shipMat(), {}, true));
  } else if (part === 'segel') {
    sailJ = joint();
    sailM = mesh(sailGeo(sail[0], sail[1]), vcol(0.8, { side: THREE.DoubleSide, toy: { rim: 0.3, spec: 0.2, sat: 1 } }, 'w6sail'), {}, true);
    sailJ.add(sailM);
    root.add(sailJ, mesh(cached(`w6:ship:yard:${sail[0]}`, () => new Build().cyl(0.09, 0.09, sail[0] + 0.4, woodV(W6.woodLow, 0x9a8468), { p: [0, 0.05, 0], r: [Math.PI / 2, 0, 0] }, 10).geometry()), shipMat(), {}, true));
  } else {
    addLantern(root, [0, 0, 0]);
  }
  const update = (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    const t = clk.t;
    const lit = st.lit !== false;
    for (const g of glows) g.visible = lit;
    if (lampGlow) { lampGlow.visible = lit; lampGlow.scale.setScalar(1.3 + Math.sin(t * 5) * 0.1 + Math.sin(t * 13) * 0.05); }
    if (lamp && part === 'laterne') { const sw = num(st.sway, 0.4); lamp.rotation.z = Math.sin(t * 1.6) * 0.12 * sw; lamp.rotation.x = Math.sin(t * 1.1) * 0.06 * sw; }
    if (sailJ) {
      const wind = clamp(num(st.wind, 0.3), 0, 1);
      sailJ.scale.x = 1;
      sailJ.rotation.z = Math.sin(t * 1.3) * 0.05 * (0.3 + wind) - wind * 0.35;
      sailJ.rotation.y = Math.sin(t * 2.3) * 0.06 * wind;
      sailM.scale.set(0.6 + wind * 0.9 + Math.sin(t * 3.1) * 0.08 * wind, 1, 1);
    }
  };
  return makeModel('geisterschiff', root, update, own, { initial: 'idle' });
}

// =============================================================================================
// Kippsteg
// =============================================================================================
function buildKippsteg(opts = {}) {
  const L = Math.max(1, num(opts.length, 8)), W = Math.max(0.4, num(opts.width, 1)), T = Math.max(0.08, num(opts.thick, 0.25));
  const root = new THREE.Group();
  const tilt = joint();
  tilt.add(mesh(cached(`w6:kippsteg:${L}:${W}:${T}`, () => {
    const b = new Build();
    const n = Math.max(2, Math.round(L / 0.32));
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) / n * L - L / 2;
      const c = mix(0x7a8a82, 0xb8b8a0, hash1(i * 5.1) * 0.8);
      b.box(L / n - 0.035, T * 0.6, W * (0.96 + hash1(i * 2.2) * 0.04), c, { p: [x, -T * 0.3, (hash1(i * 9.1) - 0.5) * 0.03], r: [0, (hash1(i * 3.7) - 0.5) * 0.04, 0] }, 0.025, 1);
      for (const s of [1, -1]) b.sphere(0.022, 0x3a4a50, { p: [x, 0.002, s * W * 0.36] }, 5, 3);
    }
    for (const s of [1, -1]) b.box(L, T * 0.45, 0.12, woodV(W6.ghostDark, W6.ghostLow), { p: [0, -T * 0.78, s * (W / 2 - 0.08)] }, 0.03, 1);
    // Eisenbänder an den Enden und in der Mitte (Drehachse)
    for (const x of [-L / 2 + 0.1, 0, L / 2 - 0.1]) b.box(0.08, T + 0.04, W + 0.06, gradV(0x2a3238, 0x6a7a80), { p: [x, -T * 0.5, 0] }, 0.02, 1);
    b.cyl(0.07, 0.07, W + 0.3, 0x4a5a60, { p: [0, -T * 0.5, 0], r: [Math.PI / 2, 0, 0] }, 10);
    return b.geometry();
  }), shipMat(), {}, true));
  tilt.children[0].receiveShadow = true;
  root.add(tilt);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    const shake = st.warn ? Math.sin(clk.t * 47) * 0.012 : 0;
    tilt.rotation.x = num(st.tilt, 0) + shake;
  };
  return makeModel('kippsteg', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Schiebetür
// =============================================================================================
function shojiFrameGeo(w, h) {
  return cached(`w6:shoji:frame:${w}:${h}`, () => {
    const b = new Build();
    const lac = { v: (x, y, z, nx, ny) => mix(W6.lacquerLow, W6.lacquer, smoothstep(nx * 0.4 + ny * 0.3 + 0.5)) };
    for (const s of [1, -1]) {
      b.box(0.22, h + 0.2, 0.16, lac, { p: [0, (h + 0.2) / 2, s * (w / 2 + 0.08)] }, 0.03, 1);
      b.box(0.28, 0.12, 0.24, W6.ink2, { p: [0, 0.06, s * (w / 2 + 0.08)] }, 0.02, 1);
    }
    b.box(0.26, 0.2, w + 0.5, lac, { p: [0, h + 0.1, 0] }, 0.03, 1);
    b.box(0.14, 0.08, w + 0.7, W6.gold, { p: [0.02, h + 0.24, 0] }, 0.02, 1);
    for (const s of [1, -1]) b.cone(0.07, 0.12, W6.gold, { p: [0.02, h + 0.24, s * (w / 2 + 0.38)], r: [s * Math.PI / 2, 0, 0] }, 8);
    // Laufschiene unten
    b.box(0.24, 0.05, w, 0x5a2a14, { p: [0, 0.025, 0] }, 0.01, 1);
    return b.geometry();
  });
}
function shojiPanelGeo(pw, h) {
  return cached(`w6:shoji:panel:${pw}:${h}`, () => {
    const b = new Build();
    const H = h - 0.06;
    // Papier (leicht durchscheinend warm)
    b.box(0.03, H - 0.1, pw - 0.1, { v: (x, y) => mix(W6.paperShade, W6.paper, smoothstep(y / H + 0.2)) }, { p: [0, 0.05 + H / 2, 0] }, 0, 1);
    // Rahmen und Holzgitter (beidseitig)
    const wood = gradV(0x6a3a1a, 0xa86a3a);
    for (const s of [1, -1]) {
      b.box(0.07, H, 0.06, wood, { p: [0, H / 2 + 0.03, s * (pw / 2 - 0.03)] }, 0.012, 1);
    }
    for (const y of [0.05, H]) b.box(0.07, 0.07, pw, wood, { p: [0, y, 0] }, 0.012, 1);
    const cols = 3, rows = 5;
    for (let i = 1; i < cols; i++) b.box(0.05, H - 0.1, 0.022, wood, { p: [0, H / 2 + 0.03, -pw / 2 + (i / cols) * pw] }, 0, 1);
    for (let j = 1; j < rows; j++) b.box(0.05, 0.022, pw - 0.08, wood, { p: [0, 0.05 + (j / rows) * (H - 0.06), 0] }, 0, 1);
    // Griffmulde
    b.cyl(0.035, 0.035, 0.08, 0x2a1a10, { p: [0, H * 0.48, pw / 2 - 0.13], r: [0, 0, Math.PI / 2] }, 10);
    return b.geometry();
  });
}
function buildSchiebetuer(opts = {}) {
  const w = Math.max(0.8, num(opts.width, 2)), h = Math.max(1.2, num(opts.height, 2.4));
  const n = opts.panels === 1 ? 1 : 2;
  const root = new THREE.Group();
  const own = [];
  root.add(mesh(shojiFrameGeo(w, h), vcol(0.35), {}, true));
  const pw = w / n;
  const panels = [];
  const pmat = vcol(0.5, { emissive: 0x2a1c08 }, 'w6paper');
  for (let i = 0; i < n; i++) {
    const p = joint([0, 0, n === 1 ? 0 : (i ? -1 : 1) * pw / 2], mesh(shojiPanelGeo(pw, h), pmat, {}, true));
    panels.push(p); root.add(p);
  }
  const hintMat = new THREE.MeshBasicMaterial({ color: 0xffd84a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  own.push(hintMat);
  const hint = mesh(cached(`w6:shoji:hint:${w}:${h}`, () => { const g = new THREE.PlaneGeometry(w + 0.25, h + 0.2); g.rotateY(Math.PI / 2); g.translate(0.13, h / 2, 0); return g; }), hintMat);
  hint.renderOrder = 3;
  root.add(hint);
  const clk = new Clock();
  let open = 0;
  const update = (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    const t = clk.t;
    open = damp(open, clamp(num(st.open, 0), 0, 1), 14, dt);
    const tap = clamp(num(st.tap, 0), 0, 1);
    panels.forEach((p, i) => {
      const s = n === 1 ? -1 : (i ? -1 : 1);
      p.position.z = (n === 1 ? 0 : s * pw / 2) + s * open * pw * 1.02;
      p.position.x = (i ? -0.04 : 0.04) * (n === 1 ? 0 : 1);
      p.rotation.x = Math.sin(t * 40 + i) * 0.01 * tap;
    });
    hint.visible = !!st.hint;
    hintMat.opacity = st.hint ? 0.18 + 0.14 * Math.sin(t * 5) : 0;
  };
  return makeModel('schiebetuer', root, update, own, { initial: 'idle' });
}

// =============================================================================================
// Gong
// =============================================================================================
function gongFrameGeo() {
  return cached('w6:gong:frame', () => {
    const b = new Build();
    const lac = { v: (x, y, z, nx, ny) => mix(W6.lacquerLow, W6.lacquer, smoothstep(nx * 0.4 + ny * 0.3 + 0.5)) };
    for (const s of [1, -1]) {
      b.box(0.5, 0.25, 0.5, gradV(0x5a5a68, 0x9a9aa8), { p: [0, 0.125, s * 1.05] }, 0.05, 2);
      b.cyl(0.09, 0.11, 2.3, lac, { p: [0, 1.4, s * 1.05] }, 14);
      b.torus(0.1, 0.03, W6.gold, { p: [0, 0.32, s * 1.05], r: [Math.PI / 2, 0, 0] }, 6, 16);
      b.torus(0.1, 0.03, W6.gold, { p: [0, 2.3, s * 1.05], r: [Math.PI / 2, 0, 0] }, 6, 16);
    }
    b.box(0.3, 0.12, 2.3, W6.ink2, { p: [0, 0.18, 0] }, 0.03, 1);
    // geschwungener Querbalken mit hochgezogenen Enden und Gold-Kappen
    const beam = [[0, 2.55, -1.6], [0, 2.47, -1.0], [0, 2.45, 0], [0, 2.47, 1.0], [0, 2.55, 1.6]];
    b.add(taperTube(beam, (t) => 0.12 - Math.abs(t - 0.5) * 0.06, 24, 10), lac, { s: [1.3, 1, 1] });
    for (const s of [1, -1]) b.sphere(0.08, W6.gold, { p: [0, 2.6, s * 1.62] }, 10, 8);
    b.box(0.18, 0.1, 2.3, lac, { p: [0, 2.28, 0] }, 0.02, 1);
    // Schlägel am rechten Pfosten
    b.cyl(0.025, 0.025, 0.8, 0x8a5a2a, { p: [0.18, 1.2, -1.0], r: [0.15, 0, 0] }, 6);
    b.sphere(0.1, gradV(0xb8202a, 0xff6a5a), { p: [0.18, 1.62, -0.94] }, 12, 8);
    b.torus(0.06, 0.015, W6.gold, { p: [0.12, 1.75, -1.0], r: [0, Math.PI / 2, 0] }, 4, 10);
    return b.geometry();
  });
}
function gongDiscGeo() {
  return cached('w6:gong:disc', () => {
    const b = new Build();
    const R = 0.72;
    const prof = [[0, 0.06], [0.12, 0.07], [0.16, 0.035], [0.22, 0.02], [R * 0.8, 0.02], [R * 0.95, 0.03], [R, 0.0], [R * 0.97, -0.05], [0, -0.04]];
    const g = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 48);
    g.rotateZ(-Math.PI / 2); // Achse → +X
    b.add(g, { v: (x, y, z, nx) => { const r = Math.hypot(y, z); const ring = Math.abs(Math.sin(r * 26)) * 0.25; return mix(W6.bronzeLow, W6.bronzeHi, smoothstep(nx * 0.4 + 0.45 - ring + (y > 0 ? 0.1 : 0))); } }, null);
    b.torus(R * 0.55, 0.012, 0xfff0a0, { p: [0.022, 0, 0], r: [0, Math.PI / 2, 0] }, 4, 40);
    // Seile zum Balken
    for (const s of [1, -1]) b.add(taperTube([[0, R * 0.7, s * 0.4], [0, R * 0.7 + 0.55, s * 0.55], [0, R * 0.7 + 1.0, s * 0.62]], 0.02, 8, 5), 0xe8d8a8, null);
    return b.geometry();
  });
}
function buildGong() {
  const root = new THREE.Group();
  const own = [];
  root.add(mesh(gongFrameGeo(), vcol(0.32), {}, true));
  const swing = joint([0, 2.43, 0]);
  const disc = mesh(gongDiscGeo(), vcol(0.28, { metalness: 0.55 }, 'w6bronze'), { p: [0, -1.04, 0] }, true);
  swing.add(disc);
  root.add(swing);
  const waveMat = new THREE.MeshBasicMaterial({ color: 0xffd860, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  own.push(waveMat);
  const waves = instMesh(cached('w6:gong:wave', () => { const g = new THREE.TorusGeometry(1, 0.025, 6, 48); g.rotateY(Math.PI / 2); return g; }), waveMat, 3, 4, 1.4);
  waves.frustumCulled = false;
  root.add(waves);
  const clk = new Clock();
  let amp = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    let target = 0;
    if (st.ring !== undefined) target = clamp(Number(st.ring) || 0, 0, 1);
    else if (anim === 'ring') target = 1 - prog(st, clk, 1.6);
    amp = st.ring !== undefined || anim === 'ring' ? target : damp(amp, 0, 3, dt);
    if (st.ring !== undefined || anim === 'ring') amp = target;
    swing.rotation.z = Math.sin(t * 5) * 0.12 * amp;
    swing.rotation.x = Math.sin(t * 3.3) * 0.04 * amp;
    disc.position.x = Math.sin(t * 60) * 0.012 * amp;
    waves.visible = amp > 0.03;
    waveMat.opacity = 0.5 * amp;
    for (let i = 0; i < 3; i++) {
      const k = ((t * 0.9) + i / 3) % 1;
      setInst(waves, i, 0.15 + k * 1.2, 1.39, 0, 0, 0, 0, 0.62 + k * 0.55);
    }
    waves.instanceMatrix.needsUpdate = true;
  };
  return makeModel('gong', root, update, [...own, waves], { initial: 'idle' });
}

// =============================================================================================
// Pilz-Maske
// =============================================================================================
const PZM = { cap: 0xff7a1f, capHi: 0xffb060, capLow: 0xd8540a, spot: 0xfff1c4, face: 0xfbe2bd, faceLow: 0xe8c08a, ink: 0x3a2216, tooth: 0xffffff, strap: 0x8a4a1c };
/** Maske in Einheitsgröße (Breite ≈1, Mitte = Kopfmitte, Gesicht nach +X). */
function maskGeo() {
  return cached('w6:pilzmaske', () => {
    const b = new Build();
    // Gesichtsplatte: vordere Kugelschale
    const face = new THREE.SphereGeometry(0.5, 32, 20, -Math.PI * 0.42, Math.PI * 0.84, Math.PI * 0.22, Math.PI * 0.58);
    face.rotateY(Math.PI); // Wölbung nach +X
    b.add(face, { v: (x, y, z, nx, ny) => mix(PZM.faceLow, PZM.face, smoothstep(ny * 0.4 + nx * 0.4 + 0.3)) }, { s: [0.85, 1, 1.05] });
    // Kappe (orange, über Stirn und Kopf), Cremetupfen
    const cap = new THREE.SphereGeometry(0.62, 36, 16, 0, TAU, 0, Math.PI * 0.42);
    b.add(cap, { v: (x, y, z, nx, ny) => mix(PZM.capLow, PZM.capHi, smoothstep(ny * 0.6 + nx * 0.2 + 0.2)) }, { p: [-0.04, 0.02, 0], s: [1, 0.85, 1] });
    b.torus(0.6, 0.06, PZM.capLow, { p: [-0.04, 0.12, 0], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.8] }, 8, 40);
    for (const [az, el, r] of [[0, 1.2, 0.09], [0.5, 0.75, 0.07], [-0.5, 0.75, 0.07], [1.3, 0.8, 0.07], [-1.3, 0.8, 0.07], [2.3, 0.85, 0.07], [-2.3, 0.85, 0.07], [Math.PI, 0.9, 0.08], [0.9, 1.25, 0.06], [-0.9, 1.25, 0.06]]) {
      const d = new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
      const p = new THREE.Vector3(-0.04 + d.x * 0.62, 0.02 + d.y * 0.527, d.z * 0.62);
      b.add(new THREE.SphereGeometry(1, 12, 4, 0, TAU, 0, Math.PI / 2).rotateX(Math.PI / 2), PZM.spot, placed(p.addScaledVector(d, -0.01), d, new THREE.Vector3(r, r, 0.02)));
    }
    // aufgemaltes Pilzling-Gesicht: Augen, grimmige Brauen, Mund mit Zähnchen
    for (const s of [1, -1]) {
      b.sphere(1, 0xffffff, { p: [0.4, -0.02, s * 0.14], s: [0.03, 0.12, 0.085] }, 14, 10);
      b.sphere(1, PZM.ink, { p: [0.425, -0.03, s * 0.12], s: [0.02, 0.085, 0.055] }, 12, 8);
      b.sphere(1, 0xffffff, { p: [0.442, 0.01, s * 0.11 - 0.015], s: [0.006, 0.02, 0.016] }, 6, 4);
      b.capsule(0.022, 0.13, PZM.ink, { p: [0.4, 0.12, s * 0.13], r: [Math.PI / 2 - s * 0.45, 0, 0] }, 3, 8);
    }
    b.torus(0.075, 0.018, PZM.ink, { p: [0.4, -0.2, 0], r: [0, Math.PI / 2, 0] }, 6, 14, Math.PI);
    for (const s of [1, -1]) b.cone(0.022, 0.05, PZM.tooth, { p: [0.415, -0.18, s * 0.04], r: [0, 0, -0.2] }, 6);
    // Bänder nach hinten
    for (const s of [1, -1]) b.add(taperTube([[0.05, -0.05, s * 0.5], [-0.25, -0.03, s * 0.47], [-0.45, -0.05, s * 0.3], [-0.52, -0.06, 0]], 0.025, 12, 5), PZM.strap, { s: [1, 1, 1] });
    return b.geometry();
  });
}
function buildPilzMaske(opts = {}) {
  const head = opts.mode === 'kopf';
  const size = Math.max(0.2, num(opts.size, head ? 0.5 : 0.62));
  const root = new THREE.Group();
  const spin = joint([0, head ? 0 : 0.6, 0]);
  const m = mesh(maskGeo(), vcol(0.35), {}, true);
  m.scale.setScalar(size);
  spin.add(m);
  root.add(spin);
  let glow = null, spark = null;
  if (!head) {
    glow = glowSprite(0xffc070, 1.1, 0.55); spin.add(glow);
    spark = sparkleSprite(0xffffff, 0.35); spark.position.set(0.25, 0.25, 0.1); spin.add(spark);
  }
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    if (head) return;
    let k = 1, up = 0;
    if (anim === 'collected') { const p = prog(st, clk, 0.5); k = 1 - smoothstep((p - 0.3) / 0.7); up = p * 0.8; spin.rotation.y += dt * 18; }
    else spin.rotation.y = Math.sin(t * 1.2) * 0.6;
    spin.position.y = 0.6 + Math.sin(t * 2.2) * 0.06 + up;
    spin.scale.setScalar(Math.max(0.001, k));
    spin.visible = k > 0.01;
    spark.visible = (t % 1.6) < 0.5 || anim === 'collected';
    spark.scale.setScalar(0.2 + Math.abs(Math.sin(t * 6)) * 0.25);
    glow.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
  };
  return makeModel('pilz_maske', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Klettergitter
// =============================================================================================
function buildKlettergitter(opts = {}) {
  const sz = Array.isArray(opts.size) ? opts.size : [2, 2];
  const w = Math.max(0.5, num(sz[0], 2)), h = Math.max(0.5, num(sz[1], 2));
  const root = new THREE.Group();
  const g = joint();
  g.add(mesh(gitterGeo(w, h, opts.frame !== false), vcol(0.55, {}, 'w6gitter'), {}, true));
  root.add(g);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    const k = clamp(num(st.shake, 0), 0, 1);
    g.position.x = Math.sin(clk.t * 38) * 0.03 * k;
    g.rotation.x = Math.sin(clk.t * 29) * 0.01 * k;
  };
  return makeModel('klettergitter', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Windanzeige
// =============================================================================================
function windPoleGeo(h) {
  return cached(`w6:wind:pole:${h}`, () => {
    const b = new Build();
    b.cyl(0.055, 0.07, h, (x, y) => (Math.floor(y / 0.35) % 2 ? col(0xffffff) : col(0xe8283a)), { p: [0, h / 2, 0] }, 12);
    b.lathe([[0, 0], [0.38, 0], [0.34, 0.12], [0.2, 0.2], [0, 0.22]], gradV(0xa8b8d0, 0xffffff), null, 18, 1);
    b.sphere(0.08, W6.gold, { p: [0, h + 0.04, 0] }, 10, 8);
    return b.geometry();
  });
}
function windSockGeo() {
  return cached('w6:wind:sock', () => {
    const b = new Build();
    // Windsack entlang +X (Öffnung bei x = 0), Ring, Bügel
    const g = new THREE.CylinderGeometry(0.11, 0.2, 1.1, 18, 5, true);
    g.rotateZ(Math.PI / 2); g.translate(0.62, 0, 0);
    b.add(g, (x) => (Math.floor((x - 0.07) / 0.22) % 2 ? col(0xffffff) : col(0xff6a1a)), null);
    b.torus(0.2, 0.025, 0x5a6a80, { p: [0.07, 0, 0], r: [0, Math.PI / 2, 0] }, 6, 18);
    b.cyl(0.02, 0.02, 0.2, 0x5a6a80, { p: [0.03, 0, 0], r: [0, 0, Math.PI / 2] }, 5);
    return b.geometry();
  });
}
const windStreakGeo = () => cached('w6:wind:streak', () => {
  const g = taperTube([[0, 0, 0], [0.4, 0.08, 0.05], [0.75, 0.12, -0.05], [1, 0.05, 0]], (t) => 0.035 * Math.sin(Math.PI * Math.min(1, t * 1.05)) + 0.004, 18, 5);
  g.scale(1, 1, 0.4);
  return g;
});
function buildWindboe(opts = {}) {
  const h = Math.max(1, num(opts.height, 2.6));
  const root = new THREE.Group();
  const own = [];
  root.add(mesh(windPoleGeo(h), vcol(0.35), {}, true));
  const yawJ = joint([0, h - 0.12, 0]);
  const sock = joint();
  sock.add(mesh(windSockGeo(), vcol(0.5, { side: THREE.DoubleSide }, 'w6sock'), {}, true));
  yawJ.add(sock);
  root.add(yawJ);
  const smat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
  own.push(smat);
  const streaks = instMesh(windStreakGeo(), smat, 6, 5, h / 2);
  streaks.frustumCulled = false;
  root.add(streaks);
  const clk = new Clock();
  let wind = 0, dir = 0;
  const update = (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    const t = clk.t;
    wind = damp(wind, clamp(num(st.wind, 0), 0, 1), 4, dt);
    const d = num(st.dir, 0);
    dir += Math.atan2(Math.sin(d - dir), Math.cos(d - dir)) * (1 - Math.exp(-5 * dt));
    yawJ.rotation.y = dir + Math.sin(t * 7) * 0.08 * wind;
    sock.rotation.z = -1.25 * (1 - wind) + Math.sin(t * 9) * 0.06 * wind;
    sock.scale.set(0.75 + wind * 0.25, 0.8 + wind * 0.2, 0.8 + wind * 0.2);
    const show = Math.max(wind > 0.3 ? wind : 0, st.gust ? 0.8 : 0);
    streaks.visible = show > 0.05;
    smat.opacity = 0.65 * show;
    for (let i = 0; i < 6; i++) {
      const k = (t * (0.8 + wind) + i / 6) % 1;
      const r = 1.2 + (i % 3) * 0.6, y = 0.6 + (i * 0.37 % 1) * h;
      const along = (k - 0.5) * 4;
      const cx = Math.cos(dir) * along - Math.sin(dir) * (i % 2 ? r : -r) * 0.6;
      const cz = -Math.sin(dir) * along - Math.cos(dir) * (i % 2 ? r : -r) * 0.6;
      setInst(streaks, i, cx, y, cz, 0, dir, 0, [1.2 * Math.sin(k * Math.PI) + 0.001, 1, 1]);
    }
    streaks.instanceMatrix.needsUpdate = true;
  };
  return makeModel('windboe_fahne', root, update, [...own, streaks], { initial: 'idle' });
}

// =============================================================================================
// Förderband
// =============================================================================================
function buildFoerderband(opts = {}) {
  const L = Math.max(0.5, num(opts.length, 4)), W = Math.max(0.4, num(opts.width, 2)), T = Math.max(0.15, num(opts.thick, 0.5));
  const root = new THREE.Group();
  const own = [];
  root.add(mesh(beltFrameGeo(L, W, T), vcol(0.3, { metalness: 0.3 }, 'w6steel'), {}, true));
  const tex = beltTexture().clone();
  tex.needsUpdate = true;
  tex.repeat.set(L, Math.max(1, Math.round(W)));
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 });
  own.push(tex, mat);
  const top = mesh(beltTopGeo(L, W, T), mat);
  top.receiveShadow = true;
  root.add(top);
  const rollers = instMesh(beltRollerGeo(W, T), vcol(0.35), 2, Math.max(L, W), T / 2);
  root.add(rollers);
  const clk = new Clock();
  let off = 0;
  const update = (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    if (st.offset !== undefined) off = Number(st.offset) || 0; else off += dt * num(st.speed, 0);
    tex.offset.x = -off;
    for (let i = 0; i < 2; i++) setInst(rollers, i, (i ? -1 : 1) * (L / 2 - T * 0.1), T * 0.55, 0, 0, 0, -off / (T * 0.42));
    rollers.instanceMatrix.needsUpdate = true;
  };
  return makeModel('foerderband', root, update, [...own, rollers], { initial: 'idle' });
}

// =============================================================================================
// Quetschblock
// =============================================================================================
function qbBodyGeo(sx, sy, sz) {
  return cached(`w6:qb:body:${sx}:${sy}:${sz}`, () => {
    const b = new Build();
    b.add(roundedBox(sx, sy, sz, Math.min(sx, sy, sz) * 0.12, SIDE.ALL, 0, 3), { v: (x, y, z, nx, ny) => mix(W6.iron, W6.ironHi, smoothstep(ny * 0.45 + nx * 0.2 + 0.45 + noise3(x * 3, y * 3, z * 3) * 0.2 - 0.1)) }, null);
    // Warnstreifen-Rahmen um das Gesicht (+X)
    const fx = sx / 2 + 0.005, bw = 0.16;
    const stripe = (y, z) => (Math.floor((y + z) / 0.18 + 100) % 2 ? col(W6.hazard) : col(0x1e1e28));
    for (const s of [1, -1]) {
      b.box(0.04, sy - 0.25, bw, (x, y, z) => stripe(y, z), { p: [fx, 0, s * (sz / 2 - bw / 2 - 0.08)] }, 0.01, 1);
      b.box(0.04, bw, sz - 0.25, (x, y, z) => stripe(y, z), { p: [fx, s * (sy / 2 - bw / 2 - 0.08), 0] }, 0.01, 1);
    }
    // Nieten an allen Kanten der Vorderseite und Seiten
    for (const [y, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      b.sphere(0.06, W6.ironHi, { p: [fx, y * (sy / 2 - 0.16), z * (sz / 2 - 0.16)] }, 8, 6);
      for (const xx of [-0.3, 0.3]) b.sphere(0.05, W6.ironHi, { p: [xx * sx, y * (sy / 2 - 0.14), z * (sz / 2 + 0.005)] }, 8, 6);
    }
    // Kolben-Flansch hinten
    b.cyl(0.42, 0.42, 0.14, gradV(W6.steelLow, W6.steelHi), { p: [-sx / 2 - 0.06, 0, 0], r: [0, 0, Math.PI / 2] }, 20);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; b.sphere(0.035, W6.steelHi, { p: [-sx / 2 - 0.14, Math.cos(a) * 0.33, Math.sin(a) * 0.33] }, 6, 4); }
    return b.geometry();
  });
}
const qbMouthGeo = (sx, sy, sz) => cached(`w6:qb:mouth:${sx}:${sy}:${sz}`, () => {
  const b = new Build();
  const fx = sx / 2;
  b.box(0.05, sy * 0.2, sz * 0.5, 0x2a0a10, { p: [fx, -sy * 0.2, 0] }, 0.02, 1);
  const n = 6;
  for (let i = 0; i < n; i++) {
    const z = (i + 0.5) / n * sz * 0.48 - sz * 0.24;
    b.box(0.06, sy * 0.075, sz * 0.48 / n - 0.02, 0xffffff, { p: [fx + 0.02, -sy * 0.135, z] }, 0.012, 1);
    b.box(0.06, sy * 0.075, sz * 0.48 / n - 0.02, 0xf4f0e8, { p: [fx + 0.02, -sy * 0.265, z] }, 0.012, 1);
  }
  return b.geometry();
});
function buildQuetschblock(opts = {}) {
  const sz3 = Array.isArray(opts.size) ? opts.size : [2, 2, 2];
  const sx = Math.max(0.5, num(sz3[0], 2)), sy = Math.max(0.5, num(sz3[1], 2)), sz = Math.max(0.5, num(sz3[2], 2));
  const rod = Math.max(0, num(opts.rod, 1.5));
  const root = new THREE.Group();
  const own = [];
  const flash = ownMat(vcol(0.42, { metalness: 0.35 }, 'w6qb'), { emissive: 0x000000 });
  own.push(flash);
  const body = joint();
  body.add(mesh(qbBodyGeo(sx, sy, sz), flash, {}, true));
  const k = Math.min(sy, sz) / 2;
  const eye = eyes([1, -1].map((s) => ({ p: [sx / 2 - 0.02, sy * 0.12, s * sz * 0.2], r: 0.19 * k, sy: 1.0, dir: [1, 0, 0] })), { key: `w6:qb:${sx}:${sy}:${sz}`, iris: 0xff3a1a, pupil: 0.5, depth: 0.45 });
  const brows = instMesh(cached(`w6:qb:brow:${sz}`, () => new Build().box(0.12, 0.1 * k, 0.42 * k, gradV(W6.steelLow, W6.steelHi), {}, 0.03, 1).geometry()), vcol(0.35), 2, 2, 0.5);
  const mouthM = mesh(qbMouthGeo(sx, sy, sz), vcol(0.3));
  body.add(eye, brows, mouthM);
  root.add(body);
  if (rod > 0) root.add(mesh(cached(`w6:qb:rod:${rod}:${sx}`, () => new Build().cyl(0.17, 0.17, rod, { v: (x, y, z, nx) => mix(0x9aa8b8, 0xffffff, smoothstep(Math.abs(nx) * 0.3 + (y > 0 ? 0.5 : 0.3))) }, { p: [-sx / 2 - 0.12 - rod / 2, 0, 0], r: [0, 0, Math.PI / 2] }, 16).geometry()), metal('w6:chrome', { color: 0xdfe6f2, metalness: 0.9, roughness: 0.15 }, 1.2), {}, true));
  const glow = glowSprite(0xff3a1a, 1.6 * k, 0.0);
  glow.material = glow.material.clone(); own.push(glow.material);
  glow.position.set(sx / 2 + 0.1, sy * 0.12, 0);
  root.add(glow);
  const steam = new Puffs(10, 0xe8eef8, { opacity: 0.8, radius: Math.max(sx, sy) * 1.5, cy: 0 });
  own.push(steam);
  root.add(steam.mesh);
  const clk = new Clock(), blink = new Blinker();
  let emit = 0;
  const update = (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    const t = clk.t;
    const warn = clamp(num(st.warn, 0), 0, 1), slam = clamp(num(st.slam, 0), 0, 1);
    body.position.set(Math.sin(t * 50) * 0.02 * warn, Math.cos(t * 43) * 0.015 * warn, 0);
    body.scale.set(1 - slam * 0.08, 1 + slam * 0.04, 1 + slam * 0.04);
    for (let i = 0; i < 2; i++) {
      const s = i ? -1 : 1;
      const a = -s * (0.25 + warn * 0.25 + slam * 0.2);
      _e.set(a, 0, 0);
      brows.setMatrixAt(i, _m.compose(_v.set(sx / 2 + 0.03, sy * 0.12 + 0.25 * k - slam * 0.04 * k, s * sz * 0.2), _q.setFromEuler(_e), _s.setScalar(1)));
    }
    brows.instanceMatrix.needsUpdate = true;
    mouthM.scale.set(1, 1 + slam * 0.25, 1);
    flash.emissive.setRGB(warn * 0.25 * (0.6 + 0.4 * Math.sin(t * 16)), 0, 0);
    glow.material.opacity = warn * (0.45 + 0.25 * Math.sin(t * 16));
    glow.visible = warn > 0.02;
    emit -= dt;
    if (warn > 0.3 && emit <= 0) { steam.burst([-sx / 2, sy / 2, (Math.random() - 0.5) * sz], { count: 2, speed: 0.8, up: 1.4, size: 0.18, life: 0.6, spread: 0.1 }); emit = 0.15; }
    if (slam > 0.8 && emit <= 0) { steam.burst([sx / 2 + 0.1, -sy / 2 + 0.1, 0], { count: 5, speed: 2.4, up: 0.6, size: 0.22, life: 0.5, spread: 0.3 }); emit = 0.4; }
    steam.step(dt);
    let bk = blink.update(dt);
    if (slam > 0.5) bk = 0.35; else if (warn > 0.3) bk = 0.75;
    eye.userData.blink(bk);
  };
  return makeModel('quetschblock', root, update, [...own, brows], { initial: 'idle' });
}

// =============================================================================================
// Wurfball
// =============================================================================================
function seamCurve(n = 96, R = 0.25) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * TAU;
    const th = Math.PI / 2 + 0.72 * Math.sin(2 * t);
    pts.push(new THREE.Vector3(Math.sin(th) * Math.cos(t) * R, Math.cos(th) * R, Math.sin(th) * Math.sin(t) * R));
  }
  return pts;
}
function wurfballGeo() {
  return cached('w6:wurfball', () => {
    const b = new Build();
    const R = 0.25;
    b.sphere(R, { v: (x, y, z, nx, ny) => mix(0xe8dcc4, 0xfffaf0, smoothstep(ny * 0.4 + nx * 0.3 + 0.45)) }, {}, 32, 22);
    const pts = seamCurve(120, R * 1.005);
    const curve = new THREE.CatmullRomCurve3(pts, true);
    b.add(new THREE.TubeGeometry(curve, 160, 0.018, 6, true), 0xff7a1a, null);
    // Stiche quer zur Naht
    for (let i = 0; i < 40; i++) {
      const u = i / 40;
      const p = curve.getPointAt(u), tg = curve.getTangentAt(u);
      const n = p.clone().normalize();
      const side = new THREE.Vector3().crossVectors(tg, n).normalize();
      for (const s of [1, -1]) {
        const q = p.clone().addScaledVector(side, s * 0.03).addScaledVector(n, 0.006);
        b.add(new THREE.CapsuleGeometry(0.006, 0.026, 2, 4), 0x2a5ae8, placed(q, side.clone().multiplyScalar(s).add(tg.clone().multiplyScalar(0.5)), new THREE.Vector3(1, 1, 1)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)));
      }
    }
    // goldener Stern auf einer Fläche
    const sp = new THREE.Vector3(0.6, 0.2, 0.75).normalize();
    b.add(puffyStarGeo(0.07, 0.033, 0.012, 0.006), W6.gold, placed(sp.clone().multiplyScalar(R + 0.002), sp, new THREE.Vector3(1, 1, 1)));
    return b.geometry();
  });
}
function buildWurfball() {
  const root = new THREE.Group();
  const own = [];
  const flash = ownMat(vcol(0.38), { emissive: 0x000000 });
  own.push(flash);
  const spin = joint([0, 0.25, 0], mesh(wurfballGeo(), flash, {}, true));
  root.add(spin);
  const clk = new Clock();
  let ang = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    if (st.roll !== undefined) ang = -Number(st.roll) || 0;
    else if (anim === 'thrown') ang -= dt * 18;
    spin.rotation.set(anim === 'carried' ? Math.sin(t * 6) * 0.1 : 0, anim === 'idle' ? t * 0.5 : 0, ang);
    let sq = 1;
    if (anim === 'hit') { const p = prog(st, clk, 0.4); sq = 1 - Math.sin(p * Math.PI) * 0.3; flash.emissive.setScalar((1 - p) * 0.3); } else flash.emissive.setScalar(0);
    spin.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    spin.position.y = 0.25 * sq;
  };
  return makeModel('wurfball', root, update, own, { initial: 'idle' });
}

// =============================================================================================
// Riesen-?-Block
// =============================================================================================
function buildRiesenFrage(opts = {}) {
  const S = Math.max(0.5, num(opts.size, 2)), H = Math.max(0, num(opts.height, 6));
  const n = Math.max(1, Math.ceil(H / S));
  const root = new THREE.Group();
  const head = joint();
  const block = mesh(questionGeo('high'), blockMat(), { s: [S, S, S] }, true);
  block.receiveShadow = true;
  head.add(block);
  const stack = instMesh(questionGeo('low'), blockMat(), n, Math.max(S, H), H / 2);
  stack.castShadow = true; stack.receiveShadow = true; stack.frustumCulled = false;
  const spark = sparkleSprite(0xfff2b0, S * 0.6);
  spark.position.set(S * 0.55, S * 0.85, S * 0.3);
  head.add(spark);
  root.add(head, stack);
  const clk = new Clock();
  let grow = 0, lastN;
  root.userData.top = S;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    if ((st.n !== undefined && st.n !== lastN) || (clk.entered && anim === 'bump')) clk.age = 0;
    lastN = st.n;
    grow = damp(grow, clamp(num(st.grow, 0), 0, 1), 10, dt);
    const top = grow * H;
    let bump = 0, sy = 1;
    if (anim === 'bump' && clk.age < 0.3) { const k = clk.age / 0.3; bump = Math.sin(k * Math.PI) * 0.35 * S / 2; sy = 1 + Math.sin(k * Math.PI) * 0.06; }
    head.position.y = top + bump;
    head.scale.set(1, sy, 1);
    root.userData.top = top + S;
    let shown = 0;
    for (let i = 0; i < n; i++) {
      const y0 = i * S;
      const hgt = clamp(top - y0, 0, S);
      if (hgt <= 0.001) { setInst(stack, i, 0, 0, 0, 0, 0, 0, 0); continue; }
      setInst(stack, i, 0, y0, 0, 0, 0, 0, [S * 0.98, hgt, S * 0.98]);
      shown++;
    }
    stack.instanceMatrix.needsUpdate = true;
    stack.visible = shown > 0;
    spark.visible = (t % 2.2) < 0.45;
    spark.scale.setScalar(S * (0.3 + Math.sin(((t % 2.2) / 0.45) * Math.PI) * 0.4));
  };
  return makeModel('riesen_frageblock', root, update, [stack], { initial: 'idle' });
}

// =============================================================================================
// Wippe
// =============================================================================================
function buildWippe(opts = {}) {
  const L = Math.max(1, num(opts.length, 6)), W = Math.max(0.5, num(opts.width, 2)), T = Math.max(0.1, num(opts.thick, 0.3)), H = Math.max(0.4, num(opts.height, 1.1));
  const root = new THREE.Group();
  const wood = (lo, hi) => ({ v: (x, y, z, nx, ny) => mix(lo, hi, smoothstep(ny * 0.4 + nx * 0.2 + 0.45 + noise3(x * 3, y * 9, z * 3) * 0.3 - 0.15)) });
  root.add(mesh(cached(`w6:wippe:bock:${W}:${T}:${H}`, () => {
    const b = new Build();
    for (const s of [1, -1]) {
      for (const k of [1, -1]) b.box(0.18, H * 1.1, 0.18, wood(W6.woodLow, W6.wood), { p: [k * H * 0.28, -T - H * 0.5 + 0.02, s * (W / 2 - 0.15)], r: [0, 0, k * 0.5] }, 0.03, 1);
      b.box(H * 1.3, 0.16, 0.2, wood(W6.woodDark, W6.woodLow), { p: [0, -T - H + 0.08, s * (W / 2 - 0.15)] }, 0.03, 1);
      b.cyl(0.13, 0.13, 0.12, gradV(0x3a4050, 0x8a94a8), { p: [0, -T - 0.12, s * (W / 2 - 0.05)], r: [Math.PI / 2, 0, 0] }, 14);
    }
    b.cyl(0.07, 0.07, W + 0.1, 0x5a6478, { p: [0, -T - 0.12, 0], r: [Math.PI / 2, 0, 0] }, 12);
    return b.geometry();
  }), vcol(0.6), {}, true));
  const tilt = joint();
  tilt.add(mesh(cached(`w6:wippe:brett:${L}:${W}:${T}`, () => {
    const b = new Build();
    const n = Math.max(2, Math.round(W / 0.4));
    for (let i = 0; i < n; i++) b.box(L, T * 0.8, W / n - 0.03, wood(mix(W6.woodLow, W6.wood, hash1(i) * 0.6), W6.woodHi), { p: [0, -T * 0.4, (i + 0.5) / n * W - W / 2] }, 0.04, 1);
    for (const x of [-L / 2 + 0.25, -L * 0.18, L * 0.18, L / 2 - 0.25]) b.box(0.12, T * 0.95 + 0.02, W + 0.04, gradV(0x2a3038, 0x6a7480), { p: [x, -T * 0.5, 0] }, 0.02, 1);
    b.box(0.5, T * 0.6, W - 0.1, wood(W6.woodDark, W6.woodLow), { p: [0, -T - 0.05, 0] }, 0.04, 1);
    for (const s of [1, -1]) b.box(0.08, 0.14, W * 0.6, (x, y, z) => (Math.floor(z / 0.2 + 10) % 2 ? col(W6.hazard) : col(0x1e1e28)), { p: [s * (L / 2 - 0.55), 0.07, 0] }, 0.02, 1);
    return b.geometry();
  }), vcol(0.55, {}, 'w6wood'), {}, true));
  tilt.children[0].receiveShadow = true;
  root.add(tilt);
  const update = (dt, st) => { tilt.rotation.z = num(st.tilt, 0); };
  return makeModel('wippe', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Wolkenplattform
// =============================================================================================
function buildWolkenplattform(opts = {}) {
  const sz = Array.isArray(opts.size) ? opts.size : [3, 0.6, 3];
  const w = Math.max(0.6, num(sz[0], 3)), h = Math.max(0.2, num(sz[1], 0.6)), d = Math.max(0.6, num(sz[2], 3));
  const root = new THREE.Group();
  const pose = joint();
  const key = `plat:${w}:${h}:${d}`;
  pose.add(mesh(cloudGeo(key, cloudPuffs(w, h, d, Math.round(w * 7 + d * 3)), { flatTop: h, ws: 16, hs: 11 }), vcol(0.55, {}, 'w6cloud'), {}, true));
  pose.children[0].receiveShadow = true;
  const spark = sparkleSprite(0xffffff, 0.5);
  spark.visible = false;
  root.add(pose, spark);
  const clk = new Clock();
  root.userData.top = h;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    let s = 1, sy = 1;
    if (anim === 'step') { sy = 1 - 0.1 * Math.max(0, Math.sin(Math.min(1, clk.age * 3) * Math.PI)) - 0.04; s = 1.03; }
    else if (anim === 'reveal') { const p = prog(st, clk, 0.5); s = smoothstep(p) * (1 + Math.sin(p * Math.PI) * 0.15); spark.visible = p < 0.9; spark.position.set(0, h, 0); spark.scale.setScalar(0.5 + p * 1.5); }
    else spark.visible = false;
    pose.visible = anim !== 'hidden' && s > 0.01;
    pose.scale.set(Math.max(0.001, s), Math.max(0.001, s * sy), Math.max(0.001, s));
    pose.position.y = anim === 'idle' ? Math.sin(t * 1.5) * 0.02 : 0;
  };
  return makeModel('wolkenplattform', root, update, [], { initial: 'idle' });
}

export const MODELS = {
  glasroehre_teil: buildGlasroehre('gerade'),
  glasroehre_kreuzung: buildGlasroehre('kreuz'),
  stachelkugel: buildStachelkugel,
  geisterschiff: buildGeisterschiff,
  kippsteg: buildKippsteg,
  schiebetuer: buildSchiebetuer,
  gong: buildGong,
  pilz_maske: buildPilzMaske,
  klettergitter: buildKlettergitter,
  windboe_fahne: buildWindboe,
  foerderband: buildFoerderband,
  quetschblock: buildQuetschblock,
  wurfball: buildWurfball,
  riesen_frageblock: buildRiesenFrage,
  wippe: buildWippe,
  wolkenplattform: buildWolkenplattform,
};
