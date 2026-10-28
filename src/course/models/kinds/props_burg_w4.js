// Kulisse Welt 4 (Kurs-Modus), Teil 3: Lava-Burg (4-Burg, 4-A) und Werfer-Festung (4-B). Eigene Gestaltung,
// Kartenqualität. Maßstab Meter, Ursprung = Mitte der Unterseite (Ausnahmen genannt), Vorderseite +X; state darf ein
// String sein.
//
// burgmauer         Burgmauer aus dunklen Basaltziegeln (Textur, einzelne Ziegel mit Glutriss) mit Zinnen, Sockel und zwei
//                   glühenden Schießscharten; verläuft entlang z (−length/2 … +length/2), Vorderseite +X.
//                   opts { length (5), height (3,5, ohne Zinnen), thickness (1) }  state –
// lavafall          Lavafall: glühender, fließender Lavavorhang (unbeleuchtet hell, Schlieren laufen nach unten) über einer
//                   Basaltkante, unten brodelnde Glutblasen und Schein. Ursprung = Aufprallpunkt unten, Vorderseite +X.
//                   opts { width (3), height (5), color: 'rot' (Standard) | 'blau' (Welt 7: blaue Lava) }  state –
// burg_kette        hängende Eisenkette mit Wandhalter oben und Haken unten. **Ursprung = Aufhängung oben**, hängt nach −Y.
//                   opts { length (3) }  state { sway (0..1, Standard 0,2) }
// fallgitter        Fallgitter in Steinrahmen (Basalt mit Goldkante): eisernes Gitter mit Spitzen unten, Goldnieten;
//                   Durchgang entlang ±X.  opts { width (lichte Weite, 3), height (lichte Höhe, 3,5) }
//                   state { open (0..1: 0 = unten/zu, 1 = ganz oben/offen) }
// brummbaer_banner  Banner des Baron Brummbär: karminrotes Tuch mit Goldsaum und Schwalbenschwanz, darauf das Wappen
//                   (Bärenkopf mit Zylinder und Monokel, gold auf Schwarz), an einer Stange mit Goldknäufen.
//                   **Ursprung = Mitte der Stange (oben)**, das Tuch hängt nach −Y, Wappen nach ±X.
//                   opts { height (Tuchlänge, 3), width (1,4) }  state { sway (0..1, Standard 0,3) }
// festungsgitter    blau vergitterte Festungswand (Werfer-Festung): Rautengitter (Textur mit Alpha) zwischen blauen
//                   Stahlpfosten mit Goldkappen, Ober- und Unterholm; verläuft entlang z, Fläche nach ±X.
//                   opts { width (4), height (3) }  state –

import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  THREE, TAU, Build, cached, vcol, basic, std, mesh, joint, makeModel, Clock, clamp, mix, smoothstep, instMesh, setInst,
  glowSprite, placed, circleShape,
} from '../lib/kit.js';
import { LAVA, displace, hash1, noise3 } from '../lib/w4Geos.js';
import { brickTexture, latticeTexture, fallTexture, boxUV } from '../lib/w4Props.js';

const BURG = { gold: 0xffc21a, goldHi: 0xfff0a0, iron: 0x2e2a36, ironHi: 0x5a5468, red: 0xc8142e, redLow: 0x7a0a1e, black: 0x1a1418, blue: 0x2a5ae8, blueHi: 0x7aa8ff, blueLow: 0x14307a };

// =============================================================================================
// Burgmauer
// =============================================================================================
function mauerGeo(L, H, T) {
  return cached(`w4:mauer:${L}:${H}:${T}`, () => {
    const parts = [];
    const add = (g, x, y, z) => { g.translate(x, y, z); parts.push(g); };
    add(boxUV(T, H, L, 2), 0, H / 2, 0);
    add(boxUV(T + 0.25, 0.45, L + 0.1, 2), 0, 0.225, 0);
    // Zinnen
    const n = Math.max(2, Math.round(L / 1.2));
    for (let i = 0; i < n; i++) {
      const z = (i + 0.5) * (L / n) - L / 2;
      add(boxUV(T, 0.7, (L / n) * 0.55, 2), 0, H + 0.35, z);
    }
    add(boxUV(T + 0.12, 0.16, L + 0.06, 2), 0, H + 0.02, 0);
    for (const p of parts) { for (const k of Object.keys(p.attributes)) if (!['position', 'normal', 'uv'].includes(k)) p.deleteAttribute(k); }
    const g = mergeGeometries(parts.map((p) => p.toNonIndexed()), false);
    parts.forEach((p) => p.dispose());
    return g;
  });
}
function mauerGlowGeo(L, H, T) {
  return cached(`w4:mauer:glow:${L}:${H}:${T}`, () => {
    const b = new Build();
    const n = Math.max(1, Math.min(3, Math.floor(L / 2.5)));
    for (let i = 0; i < n; i++) {
      const z = ((i + 0.5) / n - 0.5) * L;
      const sh = new THREE.Shape();
      sh.moveTo(-0.12, 0); sh.lineTo(0.12, 0); sh.lineTo(0.12, 0.6); sh.absarc(0, 0.6, 0.12, 0, Math.PI, false); sh.closePath();
      b.add(new THREE.ShapeGeometry(sh, 6), { v: (x, y) => mix(LAVA.deep, LAVA.hotter, smoothstep(y / 0.7)) }, placed(new THREE.Vector3(T / 2 + 0.006, H * 0.55, z), new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, 1, 1)));
    }
    return b.geometry();
  });
}
function buildBurgmauer(opts = {}) {
  const L = clamp(Math.round((opts.length ?? 5) * 2) / 2, 1, 60), H = clamp(Math.round((opts.height ?? 3.5) * 2) / 2, 1, 30), T = clamp(Math.round((opts.thickness ?? 1) * 4) / 4, 0.25, 6);
  const root = new THREE.Group();
  const wall = mesh(mauerGeo(L, H, T), std('w4:brick', { map: brickTexture(), roughness: 0.85 }), {}, true);
  wall.receiveShadow = true;
  const glow = mesh(mauerGlowGeo(L, H, T), basic('w4:glowV', { vertexColors: true }));
  root.add(wall, glow);
  return makeModel('burgmauer', root, () => {});
}

// =============================================================================================
// Lavafall
// =============================================================================================
function lavaSheetGeo(W, H) {
  return cached(`w4:lavafall:sheet:${W}:${H}`, () => {
    const g = new THREE.PlaneGeometry(W, H, 8, 10);
    const P = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i) + H / 2;
      const bulge = Math.cos((x / W) * Math.PI) * 0.15;
      const lip = Math.max(0, (y - (H - 0.6)) / 0.6);
      P.setXYZ(i, bulge - lip * lip * 0.5 + 0.12, y, x);
      uv.setXY(i, uv.getX(i) * W / 1.5, uv.getY(i) * H / 1.5);
    }
    g.computeVertexNormals();
    return g;
  });
}
function buildLavafall(opts = {}) {
  const W = clamp(Math.round((opts.width ?? 3) * 2) / 2, 0.5, 30), H = clamp(Math.round((opts.height ?? 5) * 2) / 2, 1, 40);
  const blue = opts.color === 'blau';   // Welt 7: blaue Lava (eigene Textur/Farben, gleicher Aufbau)
  const root = new THREE.Group();
  const sheet = mesh(lavaSheetGeo(W, H), blue
    ? basic('w4:lavaFall:blau', { map: fallTexture('lava_blau', '#2a6cff', 'rgba(200,244,255,0.9)', 'rgba(14,24,140,0.6)'), side: THREE.DoubleSide })
    : basic('w4:lavaFall', { map: fallTexture('lava', '#ff6a10', 'rgba(255,236,140,0.9)', 'rgba(160,24,0,0.6)'), side: THREE.DoubleSide }));
  const top = blue ? 0x3a8aff : LAVA.hot;
  const lip = mesh(cached(`w4:lavafall:lip:${W}${blue ? ':blau' : ''}`, () => new Build().add(displace(new THREE.BoxGeometry(1.1, 0.7, W + 0.8, 2, 2, 4), 0.12, 2, W + 1, false), { v: (x, y, z, nx, ny) => (ny > 0.6 ? top : mix(LAVA.rockLow, LAVA.rockHi, smoothstep(ny * 0.5 + 0.5))) }).geometry()),
    vcol(0.8, {}, 'w4rock3'), { p: [-0.35, H + 0.05, 0] }, true);
  const nb = Math.max(4, Math.round(W * 3));
  const blobs = instMesh(cached('w4:lavafall:blob', () => new THREE.IcosahedronGeometry(1, 1)), blue ? basic('w4:lavaBlob:blau', { color: 0x7ad8ff }) : basic('w4:lavaBlob', { color: 0xffa02a }), nb, W + 2, 0.3);
  const glow = glowSprite(blue ? 0x3a8aff : 0xff6a1a, Math.max(W, 2) * 1.6, 0.55);
  glow.position.set(0.5, 0.6, 0);
  root.add(sheet, lip, blobs, glow);
  const seeds = Array.from({ length: nb }, (_, i) => ({ z: ((i + 0.5) / nb - 0.5) * W * 0.95, ph: hash1(i + 7) * TAU, r: 0.16 + hash1(i + 11) * 0.14 }));
  const update = () => {
    const now = performance.now() / 1000;
    sheet.material.map.offset.y = (now * 0.55) % 1;
    for (let i = 0; i < nb; i++) {
      const sd = seeds[i];
      const k = (now * 0.9 + sd.ph) % 1;
      setInst(blobs, i, 0.25 + k * 0.4, 0.02 + Math.sin(k * Math.PI) * 0.18, sd.z, k * 2, sd.ph, 0, sd.r * (1 - k * 0.7));
    }
    blobs.instanceMatrix.needsUpdate = true;
  };
  return makeModel('lavafall', root, update, [blobs]);
}

// =============================================================================================
// Burg-Kette (Ursprung oben)
// =============================================================================================
function ketteGeo(L) {
  return cached(`w4:kette:${L}`, () => {
    const b = new Build();
    const iron = { v: (x, y, z, nx, ny) => mix(BURG.iron, BURG.ironHi, smoothstep(nx * 0.4 + ny * 0.3 + 0.5)) };
    // Wandhalter: Platte mit Ring
    b.box(0.08, 0.36, 0.3, iron, { p: [-0.12, 0, 0] }, 0.03, 1);
    for (const y of [-0.12, 0.12]) b.sphere(0.03, BURG.gold, { p: [-0.07, y, 0] }, 6, 5);
    b.torus(0.07, 0.022, iron, { p: [-0.02, -0.08, 0], r: [0, Math.PI / 2, 0] }, 6, 12);
    // Glieder abwechselnd gedreht
    const link = 0.16, n = Math.max(2, Math.round((L - 0.3) / link));
    for (let i = 0; i < n; i++) {
      const g = new THREE.TorusGeometry(0.06, 0.018, 6, 12);
      g.scale(0.75, 1.25, 1);
      b.add(g, iron, { p: [0, -0.18 - i * link, 0], r: [0, i % 2 ? Math.PI / 2 : 0, 0] });
    }
    // Haken
    const y0 = -0.18 - n * link;
    b.torus(0.1, 0.028, iron, { p: [0.05, y0 - 0.08, 0], r: [0, 0, Math.PI * 0.2] }, 6, 14, Math.PI * 1.3);
    b.cone(0.03, 0.08, BURG.gold, { p: [0.15, y0 - 0.02, 0] }, 6);
    return b.geometry();
  });
}
function buildBurgKette(opts = {}) {
  const L = clamp(Math.round((opts.length ?? 3) * 4) / 4, 0.5, 20);
  const root = new THREE.Group();
  const sw = joint();
  sw.add(mesh(ketteGeo(L), vcol(0.35, { metalness: 0.4 }, 'w4iron'), {}, true));
  root.add(sw);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const s = clamp(Number(st.sway ?? 0.2), 0, 1);
    sw.rotation.set(Math.sin(clk.t * 1.4) * 0.08 * s, 0, Math.sin(clk.t * 1.1 + 1) * 0.12 * s);
  };
  return makeModel('burg_kette', root, update);
}

// =============================================================================================
// Fallgitter
// =============================================================================================
function fgFrameGeo(W, H) {
  return cached(`w4:fg:frame:${W}:${H}`, () => {
    const b = new Build();
    const rock = { v: (x, y, z, nx, ny) => mix(LAVA.rockLow, LAVA.rockHi, smoothstep(ny * 0.4 + 0.45 + (noise3(x * 3, y * 3, z * 3) - 0.5) * 0.5)) };
    for (const s of [1, -1]) {
      b.add(displace(new THREE.BoxGeometry(1.0, H + 1.2, 0.9, 2, 6, 2), 0.04, 3, s, false), rock, { p: [0, (H + 1.2) / 2, s * (W / 2 + 0.45)] });
      b.box(0.12, H, 0.12, BURG.ironHi, { p: [0.0, H / 2, s * (W / 2 + 0.03)] }, 0.02, 1);
    }
    b.add(displace(new THREE.BoxGeometry(1.0, 1.2, W + 1.8, 2, 2, 6), 0.04, 3, 7, false), rock, { p: [0, H + 0.6, 0] });
    b.box(1.05, 0.1, W + 1.85, BURG.gold, { p: [0, H + 0.05, 0] }, 0.03, 1);
    // Wappenplatte über dem Tor: Goldkrone
    b.cyl(0.38, 0.38, 0.06, BURG.black, { p: [0.52, H + 0.6, 0], r: [0, 0, Math.PI / 2] }, 20);
    for (let i = 0; i < 3; i++) b.cone(0.07, 0.18, BURG.gold, { p: [0.56, H + 0.62 + (i === 1 ? 0.06 : 0), (i - 1) * 0.14] }, 4);
    b.box(0.04, 0.1, 0.38, BURG.gold, { p: [0.56, H + 0.5, 0] }, 0.01, 1);
    return b.geometry();
  });
}
function fgGridGeo(W, H) {
  return cached(`w4:fg:grid:${W}:${H}`, () => {
    const b = new Build();
    const iron = { v: (x, y, z, nx, ny) => mix(BURG.iron, BURG.ironHi, smoothstep(nx * 0.5 + 0.5)) };
    const n = Math.max(3, Math.round(W / 0.38));
    for (let i = 0; i < n; i++) {
      const z = ((i + 0.5) / n - 0.5) * W;
      b.box(0.08, H, 0.08, iron, { p: [0, H / 2 + 0.1, z] }, 0.02, 1);
      b.cone(0.06, 0.22, iron, { p: [0, 0.0, z], r: [Math.PI, 0, 0] }, 6);
    }
    for (const y of [H * 0.25, H * 0.55, H * 0.85]) {
      b.box(0.1, 0.09, W, iron, { p: [0.02, y, 0] }, 0.02, 1);
      for (let i = 0; i < n; i++) b.sphere(0.035, BURG.gold, { p: [0.07, y, ((i + 0.5) / n - 0.5) * W] }, 6, 4);
    }
    return b.geometry();
  });
}
function buildFallgitter(opts = {}) {
  const W = clamp(Math.round((opts.width ?? 3) * 2) / 2, 1, 20), H = clamp(Math.round((opts.height ?? 3.5) * 2) / 2, 1, 20);
  const root = new THREE.Group();
  const frame = mesh(fgFrameGeo(W, H), vcol(0.75, {}, 'w4rock3'), {}, true);
  frame.receiveShadow = true;
  const grid = mesh(fgGridGeo(W, H), vcol(0.35, { metalness: 0.4 }, 'w4iron'), {}, true);
  root.add(frame, grid);
  const update = (dt, st) => { grid.position.y = clamp(Number(st.open ?? 0), 0, 1) * (H - 0.35); };
  return makeModel('fallgitter', root, update);
}

// =============================================================================================
// Brummbär-Banner (Ursprung = Stangenmitte oben)
// =============================================================================================
function bannerGeo(H, W) {
  return cached(`w4:banner:${H}:${W}`, () => {
    const b = new Build();
    // Stange mit Goldknäufen
    b.cyl(0.04, 0.04, W + 0.5, 0x6a3a1a, { r: [Math.PI / 2, 0, 0] }, 10);
    for (const s of [1, -1]) b.sphere(0.08, BURG.gold, { p: [0, 0, s * (W / 2 + 0.28)] }, 10, 8);
    // Tuch mit Schwalbenschwanz (Fläche in YZ, beidseitig sichtbar)
    const notch = (u) => -H + W * 0.35 * (1 - (2 * Math.abs(u)) / W);
    const cloth = new THREE.PlaneGeometry(W, H, 8, 14);
    const CP = cloth.attributes.position;
    for (let i = 0; i < CP.count; i++) {
      const x = CP.getX(i), t = (CP.getY(i) + H / 2) / H; // 0 unten … 1 oben
      CP.setXYZ(i, x, notch(x) * (1 - t), 0);
    }
    cloth.rotateY(Math.PI / 2);
    b.add(cloth, (x, y, z) => (Math.abs(z) > W / 2 - 0.09 || y > -0.12 || y < notch(z) * 0.97 + 0.1 ? BURG.gold : mix(BURG.redLow, BURG.red, smoothstep((y + H) / H + 0.2))), { p: [0.0, -0.05, 0] });
    // Wappen auf beiden Seiten: schwarzer Kreis, Bärenkopf (gold) mit Zylinder und Monokel
    for (const s of [1, -1]) {
      const cy = -H * 0.42, x = s * 0.012;
      const emb = (g, color, dy = 0, dz = 0, sc = [1, 1, 1], dx = 0) => {
        g.rotateY(s > 0 ? Math.PI / 2 : -Math.PI / 2);
        b.add(g, color, { p: [x + s * dx, cy + dy, dz], s: sc });
      };
      emb(new THREE.CircleGeometry(W * 0.36, 28), BURG.black);
      emb(new THREE.ShapeGeometry(circleShape(W * 0.17), 16), BURG.gold, -0.04, 0, [1, 1, 1], 0.004);
      for (const e of [1, -1]) emb(new THREE.ShapeGeometry(circleShape(W * 0.07), 10), BURG.gold, W * 0.12, e * W * 0.15, [1, 1, 1], 0.004);
      // Zylinder
      emb(new THREE.PlaneGeometry(W * 0.22, W * 0.2), BURG.black, W * 0.2, 0, [1, 1, 1], 0.008);
      emb(new THREE.PlaneGeometry(W * 0.34, W * 0.05), BURG.black, W * 0.1, 0, [1, 1, 1], 0.008);
      emb(new THREE.PlaneGeometry(W * 0.22, W * 0.035), BURG.red, W * 0.14, 0, [1, 1, 1], 0.012);
      // Augen, Monokel, Schnauze
      for (const e of [1, -1]) emb(new THREE.CircleGeometry(W * 0.022, 8), BURG.black, -0.0, e * W * 0.06, [1, 1, 1], 0.008);
      emb(new THREE.RingGeometry(W * 0.035, W * 0.05, 16), BURG.goldHi, 0.0, W * 0.06 * s, [1, 1, 1], 0.012);
      emb(new THREE.CircleGeometry(W * 0.06, 14), 0xf0d49a, -W * 0.07, 0, [1.3, 1, 1], 0.008);
      emb(new THREE.CircleGeometry(W * 0.025, 10), BURG.black, -W * 0.05, 0, [1, 1, 1], 0.012);
    }
    return b.geometry();
  });
}
function buildBanner(opts = {}) {
  const H = clamp(Math.round((opts.height ?? 3) * 4) / 4, 0.5, 20), W = clamp(Math.round((opts.width ?? 1.4) * 4) / 4, 0.3, 10);
  const root = new THREE.Group();
  const sw = joint();
  sw.add(mesh(bannerGeo(H, W), vcol(0.75, { side: THREE.DoubleSide }, 'w4cloth'), {}, true));
  root.add(sw);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const s = clamp(Number(st.sway ?? 0.3), 0, 1);
    sw.rotation.z = Math.sin(clk.t * 1.3) * 0.06 * s;
    sw.rotation.x = Math.sin(clk.t * 0.9 + 1) * 0.03 * s;
  };
  return makeModel('brummbaer_banner', root, update);
}

// =============================================================================================
// Festungsgitter (Werfer-Festung)
// =============================================================================================
function fgPanelGeo(W, H) {
  return cached(`w4:fest:panel:${W}:${H}`, () => {
    const g = new THREE.PlaneGeometry(W, H - 0.3);
    g.rotateY(Math.PI / 2);
    g.translate(0, (H - 0.3) / 2 + 0.15, 0);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * W, uv.getY(i) * (H - 0.3));
    return g;
  });
}
function festFrameGeo(W, H) {
  return cached(`w4:fest:frame:${W}:${H}`, () => {
    const b = new Build();
    const blue = { v: (x, y, z, nx, ny) => mix(BURG.blueLow, BURG.blueHi, smoothstep(nx * 0.4 + ny * 0.3 + 0.5)) };
    const n = Math.max(2, Math.round(W / 2) + 1);
    for (let i = 0; i < n; i++) {
      const z = (i / (n - 1) - 0.5) * W;
      b.box(0.22, H, 0.22, blue, { p: [0, H / 2, z] }, 0.04, 1);
      b.sphere(0.15, BURG.gold, { p: [0, H + 0.08, z] }, 12, 8);
      b.box(0.3, 0.12, 0.3, BURG.blueLow, { p: [0, 0.06, z] }, 0.03, 1);
    }
    for (const y of [0.12, H - 0.12]) b.box(0.14, 0.14, W, blue, { p: [0, y, 0] }, 0.03, 1);
    return b.geometry();
  });
}
function buildFestungsgitter(opts = {}) {
  const W = clamp(Math.round((opts.width ?? 4) * 2) / 2, 1, 40), H = clamp(Math.round((opts.height ?? 3) * 2) / 2, 1, 20);
  const root = new THREE.Group();
  const panel = mesh(fgPanelGeo(W, H), std('w4:lattice', { map: latticeTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.4, metalness: 0.3 }), {}, true);
  const frame = mesh(festFrameGeo(W, H), vcol(0.35, { metalness: 0.3 }, 'w4blue'), {}, true);
  root.add(panel, frame);
  return makeModel('festungsgitter', root, () => {});
}

export const MODELS = {
  burgmauer: buildBurgmauer,
  lavafall: buildLavafall,
  burg_kette: buildBurgKette,
  fallgitter: buildFallgitter,
  brummbaer_banner: buildBanner,
  festungsgitter: buildFestungsgitter,
};
