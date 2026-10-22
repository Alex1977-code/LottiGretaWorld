// Szenen-Requisiten Welt 3: Zug (3-Zug), Zirkuszelt-Arena (3-B), Seilbahn, Pastell-Garten (3-4). Eigene Gestaltung.
// Maßstab Meter, Ursprung = Mitte der Unterseite (Ausnahmen genannt), Fahr-/Blickrichtung +X; state darf ein String sein.
//
// zug_waggon      Spielzeug-Zug, Breite 3 m. **Ursprung = Schienen-Oberkante unter der Wagenmitte**, fährt nach +X.
//                 opts { kind: 'lok'|'wagen'|'flach' (Standard 'wagen'), length (lok 8,5 / sonst 10) }
//                   lok: roter Kessel mit Goldringen, Schornstein, Dampfdom, Führerhaus (Dach y = 3,95), Kuhfänger,
//                        Laterne, drei große Treibräder je Seite mit Kuppelstangen, Dampfwolken;
//                   wagen: königsblauer Personenwagen mit Cremestreifen, gelb erleuchteten Fenstern, Bogendach (y = 3,75);
//                   flach: Flachwagen mit Holzdeck (y = 1,42) und Rungen.
//                 state { anim: 'idle'|'drive', speed (m/s, Räder; drive Standard 6) }
//                 root.userData.top → begehbare Oberkante (Dach bzw. Deck), root.userData.length → Länge.
// zirkuszelt      Zirkuszelt als Arena-Hülle (innen und außen sichtbar): rot-weiße Bahnen, Zackenbehang, Mast mit
//                 Wimpel, Wimpelketten. opts { radius (12,5), height (12) }  state –
// manege          Manegen-Rand: roter Ring mit Goldsternen und weißem Polster, Sägemehl-Boden.
//                 opts { radius (Außenradius, 4), floor (true) }  state –
// zirkuspodest    Zirkus-Podest (Trommel) mit Stern oben.  opts { radius (1,2), height (0,9) }  state –
// seilbahn_gondel Seilbahn-Plattform: zwei Laufrollen auf dem Seil, Gehänge, runde Plattform (Ø 2,4 m) mit Geländer
//                 und gestreiftem Sonnendach-Kranz. **Ursprung = Seil (Laufrollen)**; Boden bei y = −2,2
//                 (root.userData.floorY).  state { anim: 'idle'|'move' }  move: Rollen drehen, Gondel pendelt.
// rosa_gras       Pastell-Garten-Block: cremefarbene Erde mit Schichten, dicke rosa Grasdecke mit Büscheln und Blüten.
//                 opts { size: [w, h, d] ([2, 1, 2]) }  state –
// bunter_stein    bunter Pastell-Stein: Block aus erhabenen Mosaikplatten (Minze, Flieder, Pfirsich, Himmelblau, Zitrone).
//                 opts { size: [w, h, d] ([2, 1, 2]) }  state –
// pastell_blume   Blumenbüschel ≈0,9 m: drei Pastellblüten mit gelber Mitte, Blätter; wiegt sich.  state –
// hecken_hase     Hecken-Hase ≈2,1 m: Formschnitt-Hase aus mintgrüner Hecke mit rosa Blüten auf weißem Sockel.  state –

import {
  THREE, TAU, Build, cached, vcol, basic, std, mesh, joint, makeModel, Clock, damp, clamp, mix, col, smoothstep,
  instMesh, setInst, glowSprite, puffyStarGeo, roundedBox, SIDE,
} from '../lib/kit.js';
import { Puffs, alongY, circusDrumGeo, onEll, stick } from '../lib/kit_w3.js';

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

// =============================================================================================
// Zug
// =============================================================================================
const TR = { red: 0xe8283a, redDark: 0xa8141c, gold: 0xffc21a, black: 0x22222a, steel: 0x5a5e6e, blue: 0x2a4ac8, blueDark: 0x1a2a88, cream: 0xfff2d6, win: 0xffe680, wood: 0xa86a3a, roof: 0x8a8e9e, wheel: 0xd8202a };
const GAUGE = 1.05;
function wheelGeo(r) {
  return cached(`w3:trainwheel:${r}`, () => {
    const b = new Build();
    b.cyl(r, r, 0.14, TR.wheel, { r: [Math.PI / 2, 0, 0] }, 24);
    b.cyl(r * 1.08, r * 1.08, 0.04, TR.black, { p: [0, 0, -0.08], r: [Math.PI / 2, 0, 0] }, 24);
    b.cyl(r * 0.28, r * 0.28, 0.18, TR.gold, { r: [Math.PI / 2, 0, 0] }, 12);
    for (let i = 0; i < 6; i++) b.box(r * 1.6, 0.06, 0.05, 0xffffff, { p: [0, 0, 0.075], r: [0, 0, (i / 6) * Math.PI] }, 0.01, 1);
    b.cyl(0.05, 0.05, 0.22, 0xe0e4ee, { p: [r * 0.6, 0, 0.06], r: [Math.PI / 2, 0, 0] }, 8);
    return b.geometry();
  });
}
function chassisPart(b, L) {
  b.box(L, 0.45, 2.6, { v: (x, y, z, nx, ny) => mix(0x15151c, 0x3a3a46, smoothstep(ny * 0.5 + 0.5)) }, { p: [0, 0.95, 0] }, 0.06, 1);
  for (const s of [1, -1]) {
    b.box(0.3, 0.3, 0.5, TR.steel, { p: [s * (L / 2 + 0.1), 0.95, 0] }, 0.05, 1);   // Kupplung
    for (const z of [0.8, -0.8]) b.cyl(0.13, 0.13, 0.22, TR.gold, { p: [s * (L / 2 + 0.05), 0.95, z], r: [0, 0, Math.PI / 2] }, 12); // Puffer
  }
}
function locoGeo(L) {
  return cached(`w3:loco:${L}`, () => {
    const b = new Build();
    chassisPart(b, L);
    const red = { v: (x, y, z, nx, ny) => mix(TR.redDark, TR.red, smoothstep(ny * 0.5 + 0.55)) };
    // Kessel mit Goldringen, Rauchkammer, Tür
    b.cyl(1.0, 1.0, 4.4, red, { p: [1.2, 2.2, 0], r: [0, 0, Math.PI / 2] }, 28);
    for (const x of [-0.4, 0.9, 2.2]) b.torus(1.01, 0.06, TR.gold, { p: [x, 2.2, 0], r: [0, Math.PI / 2, 0] }, 6, 28);
    b.cyl(1.04, 1.04, 0.8, TR.black, { p: [3.6, 2.2, 0], r: [0, 0, Math.PI / 2] }, 28);
    b.cyl(0.75, 0.75, 0.06, 0x30303a, { p: [4.02, 2.2, 0], r: [0, 0, Math.PI / 2] }, 24);
    b.torus(0.75, 0.05, TR.gold, { p: [4.04, 2.2, 0], r: [0, Math.PI / 2, 0] }, 6, 24);
    b.sphere(0.08, TR.gold, { p: [4.08, 2.2, 0] }, 8, 6);
    // Schornstein, Dom, Pfeife
    b.lathe([[0.32, 0], [0.3, 0.6], [0.42, 0.95], [0.5, 1.1], [0.44, 1.15], [0.28, 0.9], [0.0, 0.9]], TR.black, { p: [3.4, 3.05, 0] }, 20);
    b.torus(0.48, 0.05, TR.gold, { p: [3.4, 4.17, 0], r: [Math.PI / 2, 0, 0] }, 6, 20);
    b.dome(0.42, TR.gold, { p: [1.6, 3.1, 0] }, Math.PI / 2, 18, 8);
    b.cyl(0.07, 0.05, 0.4, TR.gold, { p: [0.4, 3.35, 0] }, 8);
    // Laterne vorn oben
    b.box(0.35, 0.35, 0.35, TR.black, { p: [3.8, 3.4, 0] }, 0.06, 1);
    b.cyl(0.13, 0.13, 0.04, 0xfff6c0, { p: [3.98, 3.4, 0], r: [0, 0, Math.PI / 2] }, 14);
    // Führerhaus mit Fenstern, geschwungenes Dach
    b.box(2.6, 2.6, 2.7, red, { p: [-2.4, 2.45, 0] }, 0.12, 1);
    for (const s of [1, -1]) {
      b.box(0.9, 0.8, 0.04, 0x18264a, { p: [-2.1, 2.95, s * 1.36] }, 0.02, 1);
      b.box(0.95, 0.06, 0.06, TR.gold, { p: [-2.1, 3.38, s * 1.37] }, 0.02, 1);
    }
    b.box(0.04, 0.7, 0.8, 0x18264a, { p: [-1.08, 3.0, 0.7] }, 0.02, 1);
    b.box(0.04, 0.7, 0.8, 0x18264a, { p: [-1.08, 3.0, -0.7] }, 0.02, 1);
    b.box(3.0, 0.22, 3.0, TR.black, { p: [-2.4, 3.85, 0] }, 0.1, 2);
    // Laufbleche mit Goldkante, Kuhfänger
    for (const s of [1, -1]) b.box(5.6, 0.08, 0.32, TR.gold, { p: [1.0, 1.22, s * 1.25] }, 0.02, 1);
    const cc = new THREE.Shape();
    cc.moveTo(0, 0.0); cc.lineTo(0.9, 0.0); cc.lineTo(0.0, 0.85); cc.closePath();
    const g = new THREE.ExtrudeGeometry(cc, { depth: 2.2, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 1 });
    g.translate(0, 0, -1.1);
    b.add(g, (x, y, z, nx, ny) => (Math.abs(Math.sin(z * 9)) < 0.3 ? TR.gold : 0xd89a10), { p: [L / 2 - 0.25, 0.15, 0] });
    return b.geometry();
  });
}
function coachGeo(L) {
  return cached(`w3:coach:${L}`, () => {
    const b = new Build();
    chassisPart(b, L);
    const blue = { v: (x, y, z, nx, ny) => (y > 0.38 && y < 0.62 ? col(TR.cream) : mix(TR.blueDark, TR.blue, smoothstep(ny * 0.5 + 0.55))) };
    b.box(L - 0.4, 2.4, 2.8, { v: (x, y, z, nx, ny) => (y > 0.3 && y < 0.5 ? col(TR.cream) : mix(TR.blueDark, TR.blue, smoothstep(ny * 0.4 + nx * 0.2 + 0.5))) }, { p: [0, 2.35, 0] }, 0.14, 2);
    // Fenster (leuchtend), Türen an den Enden
    const n = Math.max(2, Math.round((L - 2.4) / 1.3));
    for (const s of [1, -1]) {
      for (let i = 0; i < n; i++) {
        const x = -L / 2 + 1.6 + i * ((L - 3.2) / Math.max(1, n - 1));
        b.box(0.85, 0.75, 0.05, { v: (xx, y) => mix(0xffc040, TR.win, smoothstep(y / 0.75 + 0.5)) }, { p: [x, 2.75, s * 1.41] }, 0.08, 1);
        b.box(0.95, 0.06, 0.07, TR.gold, { p: [x, 3.17, s * 1.42] }, 0.02, 1);
      }
      for (const e of [1, -1]) b.box(0.7, 1.9, 0.05, TR.blueDark, { p: [e * (L / 2 - 0.75), 2.15, s * 1.41] }, 0.06, 1);
    }
    // Bogendach (begehbar), Lüfter
    b.add(new THREE.CylinderGeometry(1.75, 1.75, L - 0.1, 24, 1, false, -0.9, 1.8), { v: (x, y, z, nx, ny) => mix(0x6a6e7e, 0xa8acba, smoothstep(ny)) }, { p: [0, 2.0, 0], r: [-Math.PI / 2, 0, -Math.PI / 2] });
    for (let i = 0; i < 3; i++) b.box(0.5, 0.18, 0.5, TR.roof, { p: [-L / 3 + i * L / 3, 3.78, 0] }, 0.06, 1);
    return b.geometry();
  });
}
function flatGeo(L) {
  return cached(`w3:flatcar:${L}`, () => {
    const b = new Build();
    chassisPart(b, L);
    const n = Math.round(L / 0.5);
    for (let i = 0; i < n; i++) b.box(L / n - 0.03, 0.14, 2.9, i % 2 ? TR.wood : 0xc08048, { p: [-L / 2 + (i + 0.5) * (L / n), 1.32, 0] }, 0.02, 1);
    for (const s of [1, -1]) {
      b.box(L, 0.12, 0.12, TR.gold, { p: [0, 1.25, s * 1.45] }, 0.03, 1);
      for (let i = 0; i < 5; i++) b.box(0.12, 0.5, 0.12, TR.redDark, { p: [-L / 2 + 0.6 + i * (L - 1.2) / 4, 1.6, s * 1.45] }, 0.03, 1);
    }
    return b.geometry();
  });
}
const BOGIE_X = (L) => [-L / 2 + 1.6, L / 2 - 1.6];
function buildZugWaggon(opts = {}) {
  const kind = ['lok', 'wagen', 'flach'].includes(opts.kind) ? opts.kind : 'wagen';
  const L = clamp(Number(opts.length ?? (kind === 'lok' ? 8.5 : 10)), 4, 30);
  const root = new THREE.Group();
  const body = joint();
  const geo = kind === 'lok' ? locoGeo(L) : kind === 'wagen' ? coachGeo(L) : flatGeo(L);
  const bodyM = mesh(geo, vcol(0.35, {}, 'w3train'), {}, true);
  bodyM.receiveShadow = true;
  body.add(bodyM);
  // Räder: Lok drei große Treibräder + vorderes Laufrad je Seite, Wagen zwei Drehgestelle à zwei Achsen
  const wheelsPos = kind === 'lok'
    ? [[2.7, 0.5], [1.0, 0.65], [-0.5, 0.65], [-2.0, 0.65]]
    : BOGIE_X(L).flatMap((x) => [[x - 0.6, 0.45], [x + 0.6, 0.45]]);
  const radii = [...new Set(wheelsPos.map(([, r]) => r))];
  const wheelSets = radii.map((r) => {
    const list = wheelsPos.filter(([, rr]) => rr === r);
    const m = instMesh(wheelGeo(r), vcol(0.35, {}, 'w3wheel'), list.length * 2, L, 0.6);
    m.castShadow = true;
    root.add(m);
    return { m, r, list };
  });
  let rods = null, puffs = null, glow = null;
  if (kind === 'lok') {
    rods = instMesh(cached('w3:rod', () => { const b = new Build(); b.box(3.12, 0.1, 0.06, 0xe0e4ee, {}, 0.03, 1); for (const x of [-1.5, 0, 1.5]) b.cyl(0.07, 0.07, 0.08, 0xffc21a, { p: [x, 0, 0], r: [Math.PI / 2, 0, 0] }, 10); return b.geometry(); }), vcol(0.3, { metalness: 0.4 }, 'w3rod'), 2, L, 0.6);
    root.add(rods);
    puffs = new Puffs(16, 0xf4f4f8, { opacity: 0.85, radius: L * 1.5, cy: 4 });
    root.add(puffs.mesh);
    glow = glowSprite(0xfff2b0, 1.2, 0.6); glow.position.set(4.05, 3.4, 0);
    body.add(glow);
  } else {
    // Drehgestell-Rahmen
    const bg = mesh(cached('w3:bogie', () => { const b = new Build(); for (const s of [1, -1]) b.box(2.0, 0.3, 0.12, TR.steel, { p: [0, 0.45, s * (GAUGE + 0.12)] }, 0.05, 1); b.box(0.6, 0.25, 2.2, TR.black, { p: [0, 0.68, 0] }, 0.05, 1); return b.geometry(); }), vcol(0.4), {}, true);
    const bogies = instMesh(bg.geometry, bg.material, 2, L, 0.5);
    BOGIE_X(L).forEach((x, i) => setInst(bogies, i, x, 0, 0));
    root.add(bogies);
  }
  root.add(body);
  root.userData.top = kind === 'lok' ? 3.95 : kind === 'wagen' ? 3.75 : 1.42;
  root.userData.length = L;
  const clk = new Clock();
  let ang = 0, emit = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, drive = anim === 'drive';
    const v = drive ? (st.speed ?? 6) : 0;
    ang -= dt * v;  // Bogenmaß × Radius: ang ist zurückgelegte Strecke
    for (const ws of wheelSets) {
      let k = 0;
      // Räder der −Z-Seite gespiegelt (Kurbelzapfen außen), gleiche Rollrichtung
      for (const [x] of ws.list) for (const s of [1, -1]) setInst(ws.m, k++, x, ws.r, s * GAUGE, 0, s > 0 ? 0 : Math.PI, s > 0 ? ang / ws.r : -ang / ws.r);
      ws.m.instanceMatrix.needsUpdate = true;
    }
    if (rods) {
      const a = ang / 0.65;
      for (const [i, s] of [[0, 1], [1, -1]]) setInst(rods, i, -0.5 + Math.cos(a + (s > 0 ? 0 : Math.PI)) * 0.39, 0.65 + Math.sin(a + (s > 0 ? 0 : Math.PI)) * 0.39, s * (GAUGE + 0.14));
      rods.instanceMatrix.needsUpdate = true;
      if (drive) { emit -= dt; if (emit <= 0) { emit = Math.max(0.08, 0.5 - v * 0.04); puffs.burst([3.4, 4.3, 0], { count: 2, speed: 0.6, up: 2.2, size: 0.45, life: 1.4, spread: 0.2, grow: 2.4 }); } }
      puffs.step(dt);
      // Dampfwolken wehen nach hinten
      for (const it of puffs.items) if (it.age < it.life) it.p.x -= dt * v * 0.6;
      glow.scale.setScalar(1.2 + Math.sin(t * 7) * 0.05);
    }
    body.position.y = drive ? Math.abs(Math.sin(t * 9)) * 0.02 : 0;
    body.rotation.x = drive ? Math.sin(t * 3.1) * 0.006 : 0;
  };
  return makeModel('zug_waggon', root, update, puffs ? [puffs] : [], { initial: 'idle' });
}

// =============================================================================================
// Zirkuszelt, Manege, Podest
// =============================================================================================
function tentGeo(R, H) {
  return cached(`w3:tent:${R}:${H}`, () => {
    const b = new Build();
    const hw = Math.max(2.5, H * 0.35), n = 20;
    const stripe = (x, y, z) => (Math.floor(((Math.atan2(z, x) / TAU) + 1) * n) % 2 ? 0xe8283a : 0xfff6ee);
    b.add(new THREE.CylinderGeometry(R, R, hw, n * 4, 1, true), stripe, { p: [0, hw / 2, 0] });
    // Dach: leicht durchhängender Kegel
    const pts = [];
    for (let i = 0; i <= 10; i++) { const k = i / 10; pts.push([R * (1 - k) + 0.3 * k, hw + (H - hw) * Math.pow(k, 1.25)]); }
    b.add(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), n * 4), stripe);
    // Zackenbehang an der Traufe
    const k = n * 2;
    for (let i = 0; i < k; i++) {
      const a = ((i + 0.5) / k) * TAU;
      const g = new THREE.CircleGeometry(R * Math.PI / k * 0.95, 10, Math.PI, Math.PI);
      b.add(g, i % 2 ? 0xffc21a : 0x2a6ae8, { p: [Math.cos(a) * (R + 0.04), hw + 0.02, Math.sin(a) * (R + 0.04)], r: [0, Math.PI / 2 - a, 0] });
    }
    // Mast mit Kugel und Wimpel
    b.cyl(0.12, 0.15, 2.0, 0xffc21a, { p: [0, H + 0.9, 0] }, 10);
    b.sphere(0.25, 0xffc21a, { p: [0, H + 1.95, 0] }, 12, 8);
    const pen = new THREE.Shape(); pen.moveTo(0, 0); pen.lineTo(1.4, 0.3); pen.lineTo(0, 0.6); pen.closePath();
    b.extrude(pen, 0.04, 0xe8283a, { p: [0.1, H + 1.2, 0] }, 0, 1, 1);
    // Wimpelketten von der Spitze (innen) zur Traufe
    const cols = [0xe8283a, 0xffc21a, 0x2a6ae8, 0x3ab84a, 0xff6ac8];
    for (let s = 0; s < 8; s++) {
      const a = (s / 8) * TAU;
      const p0 = new THREE.Vector3(0.4 * Math.cos(a), H - 0.6, 0.4 * Math.sin(a)), p1 = new THREE.Vector3((R - 0.6) * Math.cos(a), hw + 0.3, (R - 0.6) * Math.sin(a));
      const mid = p0.clone().lerp(p1, 0.5); mid.y -= 1.2;
      const curve = new THREE.QuadraticBezierCurve3(p0, mid, p1);
      b.add(new THREE.TubeGeometry(curve, 16, 0.025, 4, false), 0xffffff);
      for (let i = 1; i < 9; i++) {
        const p = curve.getPoint(i / 9), tng = curve.getTangent(i / 9);
        const f = new THREE.ConeGeometry(0.22, 0.45, 3);
        f.rotateX(Math.PI);
        b.add(f, cols[(i + s) % cols.length], { p: [p.x, p.y - 0.24, p.z], r: [0, Math.atan2(-tng.z, tng.x), 0], s: [1, 1, 0.12] });
      }
    }
    return b.geometry();
  });
}
function buildZirkuszelt(opts = {}) {
  const R = clamp(Number(opts.radius ?? 12.5), 3, 60), H = clamp(Number(opts.height ?? 12), 3, 60);
  const root = new THREE.Group();
  const m = mesh(tentGeo(R, H), vcol(0.75, { side: THREE.DoubleSide }, 'w3tent'), {}, true);
  m.receiveShadow = true;
  root.add(m);
  return makeModel('zirkuszelt', root, () => {});
}
function ringGeo(R, floor) {
  return cached(`w3:manege:${R}:${floor}`, () => {
    const b = new Build();
    const w = 0.45, h = 0.5;
    b.lathe([[R - w, 0], [R, 0], [R, h - 0.08], [R - 0.08, h], [R - w + 0.08, h], [R - w, h - 0.08], [R - w, 0]].reverse(), (x, y, z, nx, ny) => (ny > 0.6 ? 0xfff6ee : 0xd8202a), null, 64);
    b.torus(R - w / 2, 0.11, 0xffffff, { p: [0, h + 0.02, 0], r: [Math.PI / 2, 0, 0] }, 8, 64);
    const k = Math.max(6, Math.round(R * 2.4));
    for (let i = 0; i < k; i++) {
      const a = ((i + 0.5) / k) * TAU;
      b.add(puffyStarGeo(0.14, 0.06, 0.04, 0.015), 0xffc21a, { p: [Math.cos(a) * (R + 0.01), h * 0.5, Math.sin(a) * (R + 0.01)], r: [0, Math.PI / 2 - a, 0] });
    }
    if (floor) {
      const g = new THREE.CircleGeometry(R - w, 48);
      g.rotateX(-Math.PI / 2);
      b.add(g, { v: (x, y, z) => mix(0xe8c890, 0xf6dcaa, 0.5 + 0.5 * Math.sin(Math.hypot(x, z) * 3)) }, { p: [0, 0.02, 0] });
    }
    return b.geometry();
  });
}
function buildManege(opts = {}) {
  const R = clamp(Number(opts.radius ?? 4), 1, 40);
  const root = new THREE.Group();
  const m = mesh(ringGeo(R, opts.floor !== false), vcol(0.6, {}, 'w3manege'), {}, true);
  m.receiveShadow = true;
  root.add(m);
  return makeModel('manege', root, () => {});
}
function buildZirkuspodest(opts = {}) {
  const R = clamp(Number(opts.radius ?? 1.2), 0.3, 10), H = clamp(Number(opts.height ?? 0.9), 0.2, 6);
  const root = new THREE.Group();
  const m = mesh(circusDrumGeo(R, H, 0), vcol(0.4), {}, true);
  m.receiveShadow = true;
  const star = mesh(cached('w3:podeststar', () => new Build().add(puffyStarGeo(0.5, 0.22, 0.06, 0.03), 0xffd21f, { r: [-Math.PI / 2, 0, 0] }).geometry()), vcol(0.3), { p: [0, H + 0.04, 0], s: Math.min(1, R / 1.2) });
  root.add(m, star);
  return makeModel('zirkuspodest', root, () => {});
}

// =============================================================================================
// Seilbahn-Gondel
// =============================================================================================
function gondolaGeo() {
  return cached('w3:gondola', () => {
    const b = new Build();
    // Gehänge: Bügel von den Rollen hinunter zur Plattform
    b.box(1.2, 0.18, 0.18, 0xffc21a, { p: [0, -0.2, 0] }, 0.05, 1);
    b.cyl(0.06, 0.06, 1.7, 0x9aa0b0, { p: [0, -1.05, 0] }, 8);
    b.cyl(0.04, 0.04, 2.4, 0x9aa0b0, { p: [0, -1.4, 0], r: [0, 0, 0.0] }, 6);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + Math.PI / 4; b.tube([[0, -1.85, 0], [Math.cos(a) * 1.1, -2.2 + 0.7, Math.sin(a) * 1.1]], 0.025, 0x9aa0b0, null, 2, 4); }
    // Sonnendach-Kranz (gestreift) über der Plattform
    b.add(new THREE.CylinderGeometry(0.6, 1.25, 0.35, 24, 1, true), (x, y, z) => (Math.floor((Math.atan2(z, x) / TAU + 1) * 12) % 2 ? 0xe8283a : 0xffffff), { p: [0, -1.55, 0] });
    // Plattform mit Goldrand und Geländer
    b.cyl(1.2, 1.15, 0.2, { v: (x, y, z, nx, ny) => mix(0x6a3a8a, 0x9a5ac8, smoothstep(ny * 0.5 + 0.5)) }, { p: [0, -2.3, 0] }, 28);
    b.torus(1.2, 0.05, 0xffc21a, { p: [0, -2.2, 0], r: [Math.PI / 2, 0, 0] }, 6, 32);
    b.torus(1.15, 0.035, 0xffc21a, { p: [0, -1.6, 0], r: [Math.PI / 2, 0, 0] }, 6, 32, Math.PI * 1.5);
    for (let i = 0; i < 7; i++) { const a = (i / 6) * Math.PI * 1.5; b.cyl(0.025, 0.025, 0.6, 0xffc21a, { p: [Math.cos(a) * 1.15, -1.9, Math.sin(a) * 1.15] }, 6); }
    return b.geometry();
  });
}
const pulleyGeo = () => cached('w3:pulley', () => {
  const b = new Build();
  b.cyl(0.22, 0.22, 0.12, 0x2a2a34, { r: [Math.PI / 2, 0, 0] }, 16);
  b.torus(0.2, 0.03, 0xffc21a, { r: [0, 0, 0] }, 6, 16);
  b.cyl(0.06, 0.06, 0.16, 0xe0e4ee, { r: [Math.PI / 2, 0, 0] }, 8);
  return b.geometry();
});
function buildSeilbahnGondel() {
  const root = new THREE.Group();
  const pulleys = instMesh(pulleyGeo(), vcol(0.35), 2, 1, 0);
  const swing = joint();
  swing.add(mesh(gondolaGeo(), vcol(0.4, { side: THREE.DoubleSide }, 'w3gondola'), {}, true));
  root.add(pulleys, swing);
  root.userData.floorY = -2.2;
  const clk = new Clock();
  let ang = 0, amp = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const mv = anim === 'move';
    if (mv) ang -= dt * 12;
    [-0.45, 0.45].forEach((x, i) => setInst(pulleys, i, x, -0.02, 0, 0, 0, ang));
    pulleys.instanceMatrix.needsUpdate = true;
    amp = damp(amp, mv ? 0.06 : 0.015, 2, dt);
    swing.rotation.z = Math.sin(clk.t * 1.9) * amp;
    swing.rotation.x = Math.sin(clk.t * 1.3) * amp * 0.5;
  };
  return makeModel('seilbahn_gondel', root, update, [pulleys], { initial: 'idle' });
}

// =============================================================================================
// Pastell-Garten
// =============================================================================================
function rosaGrasGeo(w, h, d) {
  return cached(`w3:rosagras:${w}:${h}:${d}`, () => {
    const b = new Build();
    const gh = Math.min(0.3, h * 0.35);
    b.box(w, h - gh * 0.6, d, { v: (x, y, z, nx, ny) => (Math.abs(ny) < 0.5 && Math.abs(Math.sin(y * 9)) < 0.15 ? col(0xe0c0d8) : mix(0xe8cce0, 0xfaeaf2, smoothstep(y / h + 0.5))) }, { p: [0, (h - gh * 0.6) / 2, 0] }, 0.08, 2);
    b.box(w + 0.08, gh, d + 0.08, { v: (x, y, z, nx, ny) => mix(0xff7ab8, 0xffc4e2, smoothstep(ny * 0.6 + 0.4)) }, { p: [0, h - gh / 2, 0] }, Math.min(0.12, gh / 2), 2);
    // Grasfransen über die Kanten
    const fr = (x, z, rx, rz) => b.cone(0.045, 0.16, 0xff8ac0, { p: [x, h - gh - 0.02, z], r: [rx, 0, rz] }, 4);
    for (let i = 0; i <= Math.round(w / 0.16); i++) { const x = -w / 2 + i * (w / Math.round(w / 0.16)); fr(x, d / 2 + 0.04, Math.PI - 0.3, 0); fr(x, -d / 2 - 0.04, Math.PI + 0.3, 0); }
    for (let i = 1; i < Math.round(d / 0.16); i++) { const z = -d / 2 + i * (d / Math.round(d / 0.16)); fr(w / 2 + 0.04, z, 0, Math.PI + 0.3); fr(-w / 2 - 0.04, z, 0, Math.PI - 0.3); }
    // Büschel und Blüten (deterministisch)
    const n = Math.round(w * d * 9);
    for (let i = 0; i < n; i++) {
      const x = (((i * 0.618) % 1) - 0.5) * (w - 0.2), z = (((i * 0.382 + 0.3) % 1) - 0.5) * (d - 0.2);
      if (i % 6 === 0) {
        for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; b.sphere(0.035, 0xffffff, { p: [x + Math.cos(a) * 0.04, h + 0.03, z + Math.sin(a) * 0.04], s: [1, 0.4, 1] }, 6, 4); }
        b.sphere(0.025, 0xffd21f, { p: [x, h + 0.04, z] }, 6, 4);
      } else for (let k = 0; k < 3; k++) b.cone(0.03, 0.15, k === 1 ? 0xffb0d8 : 0xff7ab8, { p: [x + (k - 1) * 0.035, h + 0.06, z + (k % 2) * 0.03], r: [(k % 2) * 0.2, 0, (k - 1) * 0.35] }, 4);
    }
    return b.geometry();
  });
}
function buildRosaGras(opts = {}) {
  const sz = Array.isArray(opts.size) ? opts.size : [2, 1, 2];
  const [w, h, d] = [0, 1, 2].map((i) => clamp(Number(sz[i]) || [2, 1, 2][i], 0.3, 40));
  const root = new THREE.Group();
  const m = mesh(rosaGrasGeo(w, h, d), vcol(0.75, {}, 'w3pastel'), {}, true);
  m.receiveShadow = true;
  root.add(m);
  return makeModel('rosa_gras', root, () => {});
}
const PASTEL = [0x9ae8c8, 0xc8b0f0, 0xffc8a0, 0x9ad0ff, 0xfff0a0, 0xffb0d0];
function bunterSteinGeo(w, h, d) {
  return cached(`w3:buntstein:${w}:${h}:${d}`, () => {
    const b = new Build();
    b.box(w - 0.06, h - 0.03, d - 0.06, 0xb8a8c0, { p: [0, (h - 0.03) / 2, 0] }, 0.04, 1);
    const T = 0.5, g = 0.035, th = 0.06;
    let k = 0;
    const tile = (p, s) => { b.box(s[0], s[1], s[2], { v: (x, y, z, nx, ny) => mix(PASTEL[k % PASTEL.length], 0xffffff, 0.25 * smoothstep(ny * 0.5 + nx * 0.2 + 0.4)) }, { p }, 0.02, 1); k += 7; };
    const nx = Math.max(1, Math.round(w / T)), nz = Math.max(1, Math.round(d / T)), ny = Math.max(1, Math.round(h / T));
    const tx = w / nx, tz = d / nz, ty = h / ny;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) tile([-w / 2 + (i + 0.5) * tx, h - th / 2 + 0.01, -d / 2 + (j + 0.5) * tz], [tx - g, th, tz - g]);
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (const s of [1, -1]) tile([-w / 2 + (i + 0.5) * tx, (j + 0.5) * ty, s * (d / 2 - th / 2 + 0.01)], [tx - g, ty - g, th]);
    for (let i = 0; i < nz; i++) for (let j = 0; j < ny; j++) for (const s of [1, -1]) tile([s * (w / 2 - th / 2 + 0.01), (j + 0.5) * ty, -d / 2 + (i + 0.5) * tz], [th, ty - g, tz - g]);
    return b.geometry();
  });
}
function buildBunterStein(opts = {}) {
  const sz = Array.isArray(opts.size) ? opts.size : [2, 1, 2];
  const [w, h, d] = [0, 1, 2].map((i) => clamp(Number(sz[i]) || [2, 1, 2][i], 0.3, 40));
  const root = new THREE.Group();
  const m = mesh(bunterSteinGeo(w, h, d), vcol(0.45, {}, 'w3buntstein'), {}, true);
  m.receiveShadow = true;
  root.add(m);
  return makeModel('bunter_stein', root, () => {});
}
function flowerGeo() {
  return cached('w3:pastellblume', () => {
    const b = new Build();
    const fl = [[0, 0.9, 0, 0xff9ac8, 0.3], [0.22, 0.65, 0.18, 0xc8a8ff, -0.2], [-0.2, 0.55, -0.15, 0xffc090, 0.5]];
    for (const [x, y, z, c, tilt] of fl) {
      b.tube([[0, 0, 0], [x * 0.3, y * 0.5, z * 0.3], [x, y, z]], 0.025, 0x4ab84a, null, 10, 5);
      const C = [x, y + 0.02, z];
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU;
        const g = new THREE.SphereGeometry(1, 12, 6); g.scale(0.07, 0.025, 0.12); g.translate(0, 0, 0.11);
        b.add(g, { v: (xx, yy, zz) => mix(c, 0xffffff, smoothstep(0.6 - zz * 3)) }, { p: C, r: [tilt * 0.4, a, 0.25], order: 'YXZ' });
      }
      b.sphere(0.055, 0xffd21f, { p: [x, y + 0.05, z] }, 10, 8);
    }
    for (const s of [1, -1]) { const g = new THREE.SphereGeometry(1, 10, 6); g.scale(0.07, 0.015, 0.2); g.translate(0, 0, 0.18); b.add(g, 0x5fd04a, { p: [0, 0.15, 0], r: [-0.5, s > 0 ? 0.6 : 3.6, 0], order: 'YXZ' }); }
    return b.geometry();
  });
}
function buildPastellBlume() {
  const root = new THREE.Group();
  const sway = joint();
  sway.add(mesh(flowerGeo(), vcol(0.45), {}, true));
  root.add(sway);
  const clk = new Clock();
  const update = (dt) => { clk.tick(dt, 'idle'); sway.rotation.set(Math.sin(clk.t * 1.4) * 0.05, 0, Math.sin(clk.t * 1.1) * 0.06); };
  return makeModel('pastell_blume', root, update);
}
function heckenHaseGeo() {
  return cached('w3:heckenhase', () => {
    const b = new Build();
    b.box(1.3, 0.4, 1.1, { v: (x, y, z, nx, ny) => mix(0xd8d4e4, 0xffffff, smoothstep(ny * 0.5 + 0.5)) }, { p: [0, 0.2, 0] }, 0.08, 2);
    b.box(1.4, 0.08, 1.2, 0xffffff, { p: [0, 0.42, 0] }, 0.04, 1);
    const leaf = (base) => ({ v: (x, y, z) => mix(base, 0x2f9a6a, 0.35 * (0.5 + 0.5 * Math.sin(x * 23 + y * 17) * Math.sin(z * 19 + y * 7))) });
    const g1 = 0x5fd8a0;
    b.sphere(1, leaf(g1), { p: [-0.05, 0.95, 0], s: [0.55, 0.52, 0.45] }, 22, 16);
    b.sphere(1, leaf(g1), { p: [0.32, 1.55, 0], s: [0.34, 0.32, 0.32] }, 20, 14);
    for (const s of [1, -1]) b.capsule(0.11, 0.42, leaf(g1), { p: [0.22, 2.0, s * 0.14], r: [s * 0.25, 0, 0.25] }, 4, 10);
    b.sphere(0.16, leaf(0x8ae8b8), { p: [-0.58, 0.85, 0] }, 12, 10);
    for (const s of [1, -1]) b.sphere(1, leaf(g1), { p: [0.35, 0.6, s * 0.25], s: [0.22, 0.14, 0.14] }, 12, 8);
    // rosa Blüten verstreut
    const hits = [[0.8, 0.3], [2.2, 0.5], [-2.0, 0.2], [3.0, -0.3], [1.5, -0.4], [-1.0, 0.7], [0.2, -0.2]].map(([az, el]) => onEll([-0.05, 0.95, 0], [0.55, 0.52, 0.45], az, el));
    for (const h of hits) stick(b, h, 0xff8ac0, [0.06, 0.06, 0.03], 0.2);
    for (const h of [[0.5, 0.4], [-0.6, 0.6]].map(([az, el]) => onEll([0.32, 1.55, 0], [0.34, 0.32, 0.32], az, el))) stick(b, h, 0xff8ac0, [0.05, 0.05, 0.03], 0.2);
    // Augen als dunkle Beeren
    for (const s of [1, -1]) b.sphere(0.035, 0x2a2a3a, { p: [0.6, 1.6, s * 0.12] }, 8, 6);
    b.sphere(0.04, 0xff6aa8, { p: [0.66, 1.5, 0] }, 8, 6);
    return b.geometry();
  });
}
function buildHeckenHase() {
  const root = new THREE.Group();
  root.add(mesh(heckenHaseGeo(), vcol(0.75, {}, 'w3hedge'), {}, true));
  return makeModel('hecken_hase', root, () => {});
}

export const MODELS = {
  zug_waggon: buildZugWaggon,
  zirkuszelt: buildZirkuszelt,
  manege: buildManege,
  zirkuspodest: buildZirkuspodest,
  seilbahn_gondel: buildSeilbahnGondel,
  rosa_gras: buildRosaGras,
  bunter_stein: buildBunterStein,
  pastell_blume: buildPastellBlume,
  hecken_hase: buildHeckenHase,
};
