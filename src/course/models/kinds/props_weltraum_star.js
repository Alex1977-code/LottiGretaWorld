// Kulisse Welt Stern „Sternenzelt“, Teil 1: Weltraum (S-1, S-2, S-6, S-9, B-12, Weltkarte). Eigene Gestaltung, Kartenqualität,
// ohne Spielzeug-Look (Kulissen-Materialien `toy: false`), backbar (undurchsichtig vertexgefärbt + unbeleuchtete Leuchtteile;
// Schein-Sprites fallen beim Backen weg). Maßstab Meter, Vorderseite +X, Ursprung = Fußpunkt (Ausnahmen genannt).
// Planeten: die vorhandene Kulisse 'planet' (props_w2.js) bekommt mit opts.kind die Sternenzelt-Planetoiden (buildPlanetStar unten,
// additiv – ohne kind bleibt der gestreifte Ringplanet unverändert).
//
// planet { kind }   Planetoiden (≈ size Ø, **Mitte bei y = size/2** wie der vorhandene planet):
//                   'ring' (Pfirsich-Korallen-Bänder mit Wolkenwirbeln, schräger Doppelring aus Sternsteinen, Mini-Mond),
//                   'pilz' (Graskugel mit sechs Riesenpilzen und Grasbüscheln), 'blume' (Wiesenkugel mit Riesenblumen und Blütenkranz),
//                   'eis' (Eiskugel mit Schneekappe, Kristallbüscheln und Eisbrocken-Ring).
//                   opts { kind, size (Ø, 6), tilt (Neigung der Achse, rad; Standard je Art) }  state { speed (rad/s, 0,08) }
// sternschnuppe     Sternschnuppe: puffiger Goldstern mit dreifarbigem Leuchtschweif (gold, rosa, türkis) und Funkelsternchen.
//                   **Ursprung = Sternmitte**, Schweif nach −X (fliegt nach +X).  opts { length (Schweif, 6), size (Stern-Ø, 1,4) }
//                   state – (funkelt)
// spielzeugrakete   runde Spielzeugrakete ≈4,6 m: eiförmiger Rumpf mit Bauchbinde, drei Bullaugen, Spitze mit Goldstern, drei puffige
//                   Flossen, Düse mit Flamme.  opts { color: 'rot' (Standard) | 'blau' | 'gruen' | 'lila', size (Höhe, 4,6) }
//                   Flossen stehen auf dem Boden (y = 0), Düse 0,4 m darüber.  state { flame (0..1, Standard 0: aus) }
// regenbogenweg     Regenbogenweg-Stück (S-1, Karte): sieben Farbbahnen mit weißen Randwülsten, Goldsternen und funkelnder Unterseite.
//                   **Ursprung = Mitte der Anfangskante, Oberseite (y = 0)**, verläuft nach +X.
//                   opts { length (8), width (3), bend (rad über die ganze Länge; positiv biegt nach −Z, 0), rise (Höhenunterschied, 0),
//                          thick (0,35) }  state –   root.userData.end → { x, y, z, yaw } am Ende (lokal).
// wabensaeule       Waben-Säule (S-6): sechseckige Säule aus Waben-Trommeln mit hellen Fugenringen, oben eine Wabe (normal: Honig,
//                   lava: Glut, eis: Raureif), unten dunkler.  opts { height (8), size (Umkreisradius, 1,2), kind: 'normal'|'lava'|'eis' }
// weltraum_antenne  Sternwerk-Antenne ≈7,5 m (S-9): Kuppelsockel, rot-weißer Gittermast, Parabolschüssel mit Goldempfänger, Funkring und
//                   blinkende Spitze.  opts { size (Höhe, 7,5) }  state { blink (true) }
// weltraum_kuppel   Sternwerk-Kuppel Ø ≈6 m (S-9): weißer Ringbau mit Neon-Fensterband, große Glaskuppel (undurchsichtig gemalt) mit
//                   Spiegelstreifen, kleine Sternantenne.  opts { size (Ø, 6) }  state –
// sternen_torbogen  Sternen-Torbogen (S-1, S-2, Karte): zwei weiß-goldene Säulen, darüber ein Bogen aus Regenbogen-Sternen mit großem
//                   Schlussstern. Füße bei z = ±width/2, Durchgang entlang ±X.  opts { width (6), height (5, Scheitel) }  state –

import { THREE, TAU, Build, cached, mesh, joint, makeModel, Clock, clamp, col, mix, smoothstep, lerp, glowSprite, sparkleSprite, puffyStarGeo, placed, onEllipsoid } from '../lib/kit.js';
import {
  ST, num, gradV, noise3, hash1, taperTube, memo, kulS, kulSD, kulSMetal, kulGold, kulSGlow, glowS, hexShape, hexPrismGeo, flatStarGeo, k2, rod, dirTo,
  puffyGeo, starRing, rainbowAt, lumpyEllipsoid,
} from '../lib/starGeos.js';

const UP = new THREE.Vector3(0, 1, 0);

// =============================================================================================
// Planeten
// =============================================================================================
export const PLANET_KINDS = ['ring', 'pilz', 'blume', 'eis'];
/** Punkt/Normale auf der Einheitskugel aus Richtung (az, el). */
const onUnit = (az, el) => onEllipsoid([0, 0, 0], [1, 1, 1], az, el);
/** Grundkörper auf der Kugel aufstellen (lokales +Y entlang der Normalen). */
const standOn = (h, lift = 0, spin = 0, s = 1) => {
  const q = new THREE.Quaternion().setFromUnitVectors(UP, h.n).multiply(new THREE.Quaternion().setFromAxisAngle(UP, spin));
  return new THREE.Matrix4().compose(h.p.clone().addScaledVector(h.n, lift), q, typeof s === 'number' ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s));
};
/** Pilz (Fuß im Ursprung, Höhe ≈ h): Stiel, Kappe mit Tupfen. */
function mushroom(b, M, h, cap, capHi, spot) {
  const stem = new THREE.LatheGeometry([[0, 0], [0.16, 0], [0.19, 0.2], [0.16, 0.55], [0.13, 0.75], [0, 0.78]].map(([r, y]) => new THREE.Vector2(r * h, y * h)), 10);
  b.add(stem, { v: (x, y) => mix(ST.stalkLow, ST.stalk, smoothstep(y / h)) }, M);
  const capG = new THREE.LatheGeometry([[0, 0.66], [0.3, 0.64], [0.46, 0.7], [0.48, 0.78], [0.42, 0.92], [0.26, 1.02], [0, 1.06]].map(([r, y]) => new THREE.Vector2(r * h, y * h)), 16);
  b.add(capG, { v: (x, y, z, nx, ny) => (ny < -0.2 ? col(ST.gill) : mix(cap, capHi, smoothstep(ny * 0.6 + 0.2))) }, M);
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26, el = i === 0 ? 1.4 : 0.55;
    const p = new THREE.Vector3(Math.cos(a) * Math.cos(el) * 0.4 * h, (0.82 + Math.sin(el) * 0.2) * h, Math.sin(a) * Math.cos(el) * 0.4 * h);
    const n = new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el) + 0.3, Math.sin(a) * Math.cos(el)).normalize();
    b.add(new THREE.SphereGeometry(1, 8, 5), spot, M.clone().multiply(placed(p, n, new THREE.Vector3(0.09 * h, 0.09 * h, 0.03 * h))));
  }
}
/** Blume (Fuß im Ursprung, Höhe ≈ h): Stiel, zwei Blätter, Blütenblätter um eine gelbe Mitte. */
function flower(b, M, h, petal, petalHi) {
  b.add(taperTube([[0, 0, 0], [0.04 * h, 0.4 * h, 0], [0, 0.78 * h, 0]], (t) => 0.06 * h * (1 - t * 0.4), 8, 6), { v: (x, y) => mix(ST.leafLow, ST.stem, smoothstep(y / h)) }, M);
  for (const s of [1, -1]) b.add(new THREE.SphereGeometry(1, 8, 5), { v: (x, y, z, nx, ny) => mix(ST.leafLow, ST.leafHi, smoothstep(ny * 0.6 + 0.4)) }, M.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(s * 0.16 * h, 0.3 * h, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -s * 0.9)), new THREE.Vector3(0.2 * h, 0.06 * h, 0.1 * h))));
  const head = M.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(0, 0.8 * h, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.25, 0, 0)), new THREE.Vector3(1, 1, 1)));
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU;
    b.add(new THREE.SphereGeometry(1, 10, 6), { v: (x, y, z) => mix(petal, petalHi, smoothstep(Math.hypot(x, z) * 1.2 - 0.1)) }, head.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * 0.2 * h, 0, Math.sin(a) * 0.2 * h), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a, 0.15)), new THREE.Vector3(0.2 * h, 0.04 * h, 0.1 * h))));
  }
  b.add(new THREE.SphereGeometry(1, 12, 8), { v: (x, y, z, nx, ny) => mix(0xe89a0a, 0xffe03a, smoothstep(ny * 0.7 + 0.3)) }, head.clone().multiply(new THREE.Matrix4().makeScale(0.11 * h, 0.06 * h, 0.11 * h)).multiply(new THREE.Matrix4().makeTranslation(0, 0.4, 0)));
}
/** Eiskristall-Büschel (Fuß im Ursprung, Höhe ≈ h): 3–4 sechseckige Spitzen. */
function crystals(b, M, h, seed) {
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7 + seed, tilt = i ? 0.45 : 0.05, hh = h * (i ? 0.6 + hash1(seed + i) * 0.3 : 1);
    const g = new THREE.CylinderGeometry(0, 0.17 * h, hh * 0.35, 6, 1);
    g.translate(0, hh * 0.825, 0);
    const g2 = new THREE.CylinderGeometry(0.17 * h, 0.15 * h, hh * 0.65, 6, 1);
    g2.translate(0, hh * 0.325, 0);
    const R = M.clone().multiply(new THREE.Matrix4().makeRotationY(a)).multiply(new THREE.Matrix4().makeRotationZ(tilt));
    const cv = { v: (x, y, z, nx) => mix(ST.iceLow, ST.iceHi, smoothstep(y / hh * 0.8 + nx * 0.3)) };
    b.add(g, cv, R); b.add(g2, cv, R);
  }
}
function planetGeo(kind, tiltDefault) {
  return memo(`star:planet:${kind}`, () => {
    const b = new Build(), gl = new Build();
    void tiltDefault;
    if (kind === 'ring') {
      b.sphere(1, { v: (x, y, z) => {
        const w = y + Math.sin(x * 3 + z * 2) * 0.06 + (noise3(x * 2, y * 2, z * 2) - 0.5) * 0.12;
        const band = Math.floor((w + 1) * 4.5);
        return [0xffb48a, 0xff7a6a, 0xffe2c0, 0xff9a7a, 0xffd0a0, 0xe86a6a, 0xfff0d8, 0xffa07a, 0xff8a6a, 0xffc8a0][band % 10];
      } }, {}, 48, 32);
      // Doppelring aus Sternsteinen (geschlossene Lathe-Ringe)
      for (const [r0, r1, c0, c1] of [[1.38, 1.62, 0xd8b8ff, 0xffffff], [1.7, 1.86, 0xffd06a, 0xfff4c8]]) {
        const g = new THREE.LatheGeometry([[r0, 0], [r0 + 0.04, -0.03], [r1 - 0.04, -0.03], [r1, 0], [r1 - 0.04, 0.03], [r0 + 0.04, 0.03], [r0, 0]].map(([r, y]) => new THREE.Vector2(r, y)), 72);
        b.add(g, { v: (x, y, z) => (Math.floor(Math.atan2(z, x) / TAU * 36 + 36) % 2 ? col(c0) : col(c1)) }, { r: [0.42, 0, 0.18] });
      }
      starRing(b, 1.5, 9, 0.07, (i) => (i % 2 ? ST.star : ST.white), 0.05, 0);
      b.parts.slice(-9).forEach((g) => g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.42, 0, 0.18))));
      b.sphere(0.18, { v: (x, y, z, nx, ny) => mix(0x9a8ab8, 0xf0e8ff, smoothstep(ny * 0.5 + nx * 0.4 + 0.3)) }, { p: [1.25, 0.95, -0.9] }, 14, 10);
    } else if (kind === 'pilz') {
      b.add(lumpyEllipsoid([1, 1, 1], 0.025, 2.5, 3, 40, 28), { v: (x, y, z, nx, ny) => mix(ST.leafLow, ST.leafHi, smoothstep(y * 0.5 + 0.5 + (noise3(x * 4, y * 4, z * 4) - 0.5) * 0.5)) });
      const spots = [[0.3, 0.9, 0.55, 0], [2.0, 0.5, 0.45, 1], [3.5, 0.2, 0.5, 0], [5.0, 0.6, 0.38, 2], [1.2, -0.3, 0.42, 1], [4.2, -0.5, 0.36, 0], [2.8, 1.3, 0.3, 2]];
      const caps = [[ST.capRed, ST.capRedHi, ST.white], [0x3a7aff, 0x9ac4ff, ST.white], [0xffb21a, 0xfff08a, 0xffffff]];
      for (const [az, el, h, c] of spots) mushroom(b, standOn(onUnit(az, el), -0.05, az), h * 1.35, caps[c][0], caps[c][1], caps[c][2]);
      for (let i = 0; i < 14; i++) { const h = onUnit(i * 2.4, Math.asin(((i * 0.618) % 1) * 2 - 1)); b.add(new THREE.ConeGeometry(0.035, 0.14, 5), ST.leafHi, standOn(h, 0.04, i)); }
    } else if (kind === 'blume') {
      b.add(lumpyEllipsoid([1, 1, 1], 0.02, 2.5, 7, 40, 28), { v: (x, y, z, nx, ny) => { const n = noise3(x * 3, y * 3, z * 3); return n > 0.76 ? mix(0x9ae890, 0xfff0f8, smoothstep((n - 0.76) / 0.06)) : mix(0x4ad860, 0xb8f488, smoothstep(y * 0.4 + 0.5 + (n - 0.5) * 0.6)); } });
      const F = [[0.2, 1.0, 0.6, 0], [1.5, 0.4, 0.5, 1], [2.9, 0.7, 0.55, 2], [4.3, 0.3, 0.45, 0], [5.4, 0.9, 0.42, 1], [0.9, -0.4, 0.4, 2], [3.6, -0.3, 0.38, 1]];
      const P = [[ST.petal, ST.petalHi], [0xffb21a, 0xfff2a0], [0x8a6aff, 0xe0d0ff]];
      for (const [az, el, h, c] of F) flower(b, standOn(onUnit(az, el), -0.03, az), h * 1.4, P[c][0], P[c][1]);
      // Blütenkranz am Äquator
      for (let i = 0; i < 18; i++) { const h = onUnit((i / 18) * TAU, -0.05 + Math.sin(i * 1.3) * 0.06); b.add(new THREE.SphereGeometry(1, 8, 5), i % 3 ? ST.white : 0xffe03a, standOn(h, 0.0, i, [0.06, 0.035, 0.06])); }
    } else {
      b.sphere(1, { v: (x, y, z) => { const n = noise3(x * 3, y * 3, z * 3); return y > 0.5 + (n - 0.5) * 0.25 ? mix(ST.snowLow, ST.snow, smoothstep(y * 2 - 0.8)) : mix(ST.iceLow, ST.ice, smoothstep(y * 0.5 + 0.5 + (n - 0.5) * 0.6)); } }, {}, 48, 32);
      const C = [[0.4, 0.3, 0.42], [1.9, -0.2, 0.36], [3.2, 0.5, 0.4], [4.6, 0.1, 0.32], [5.6, -0.5, 0.3], [2.6, -0.8, 0.28]];
      C.forEach(([az, el, h], i) => crystals(b, standOn(onUnit(az, el), -0.05, az), h * 1.6, i));
      // Eisbrocken-Ring
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU, r = 1.5 + Math.sin(i * 2.1) * 0.08;
        b.add(new THREE.OctahedronGeometry(0.07 + hash1(i) * 0.05, 0), { v: (x, y, z, nx, ny) => mix(ST.ice, ST.iceHi, smoothstep(ny + 0.3)) }, new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.35, 0, -0.2)).multiply(new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * r, Math.sin(i * 1.7) * 0.04, Math.sin(a) * r), new THREE.Quaternion().setFromEuler(new THREE.Euler(i, i * 2, 0)), new THREE.Vector3(1, 1, 1))));
      }
    }
    return { body: b.geometry(), glow: gl.parts.length ? gl.geometry() : null };
  });
}
const PLANET_TILT = { ring: 0.25, pilz: 0.15, blume: -0.12, eis: 0.3 };
/** Sternenzelt-Planetoid (für planet mit opts.kind; Mitte bei y = size/2). */
export function buildPlanetStar(opts = {}, makeName = 'planet') {
  const kind = PLANET_KINDS.includes(opts.kind) ? opts.kind : 'ring';
  const D = clamp(num(opts.size, 6), 0.5, 200);
  const root = new THREE.Group();
  const axis = joint([0, D / 2, 0]);
  axis.rotation.z = num(opts.tilt, PLANET_TILT[kind]);
  const spin = joint();
  spin.scale.setScalar(D / 2);
  const G = planetGeo(kind);
  const body = mesh(G.body, kulS(0.6), {}, false);
  body.receiveShadow = true;
  spin.add(body);
  axis.add(spin);
  root.add(axis);
  root.userData.radius = D / 2;
  const clk = new Clock();
  const update = (dt, st) => { clk.tick(dt, 'idle'); spin.rotation.y = clk.t * num(st.speed, 0.08); };
  return makeModel(makeName, root, update, []);
}

// =============================================================================================
// Sternschnuppe
// =============================================================================================
function schnuppeGeo(L) {
  return cached(`star:schnuppe:${k2(L)}`, () => {
    const gl = new Build();
    const strands = [[ST.star, 0.0, 0.0, 0.34], [0xff6ac8, 0.16, 0.12, 0.24], [0x3ae0ff, -0.16, -0.1, 0.24]];
    strands.forEach(([c, dy, dz, r], i) => {
      const pts = [[0, dy * 0.3, dz * 0.3], [-L * 0.3, dy + Math.sin(i) * 0.1, dz], [-L * 0.65, dy * 1.6 - 0.1, dz * 1.4], [-L, dy * 2.2 - 0.25, dz * 1.8]];
      gl.add(taperTube(pts, (t) => r * (1 - t) ** 1.2 + 0.005, 32, 8), { v: (x) => mix(c, 0xffffff, smoothstep(1 + x / (L * 0.25)) * 0.7) });
    });
    for (let i = 0; i < 9; i++) {
      const x = -L * (0.15 + (i / 9) * 0.8), y = Math.sin(i * 2.3) * 0.45 - (i / 9) * 0.3, z = Math.cos(i * 1.7) * 0.4;
      const s = 0.16 * (1 - i / 12);
      gl.add(puffyStarGeo(s, s * 0.4, s * 0.3, s * 0.1, 4), i % 3 === 1 ? 0xff9ad8 : i % 3 === 2 ? 0x9af0ff : 0xfff4b0, { p: [x, y, z], r: [0, Math.PI / 2, i] });
    }
    return gl.geometry();
  });
}
const schnuppeStarGeo = () => cached('star:schnuppe:star', () => new Build().add(puffyStarGeo(0.7, 0.33, 0.36, 0.16), { v: (x, y, z, nx, ny, nz) => mix(ST.starLow, ST.starHi, smoothstep(ny * 0.4 + nz * 0.3 + 0.4)) }, { r: [0, Math.PI / 2, 0] }).geometry());
function buildSternschnuppe(opts = {}) {
  const L = clamp(num(opts.length, 6), 0.5, 80), S = clamp(num(opts.size, 1.4), 0.2, 20) / 1.4;
  const root = new THREE.Group();
  const own = [];
  const starJ = joint();
  starJ.scale.setScalar(S);
  const star = mesh(schnuppeStarGeo(), kulSGlow(), {}, false);
  starJ.add(star);
  const tail = mesh(schnuppeGeo(L), glowS(), {});
  tail.scale.set(1, S, S);
  const halo = glowSprite(0xfff0a0, 3.2 * S, 0.45); halo.material = halo.material.clone(); own.push(halo.material);
  const sp = sparkleSprite(0xffffff, 1.2 * S); sp.position.set(0.25 * S, 0.3 * S, 0.2 * S);
  root.add(starJ, tail, halo, sp);
  const clk = new Clock();
  const update = (dt) => {
    clk.tick(dt, 'idle');
    const t = clk.t;
    star.rotation.x = t * 1.6;
    halo.material.opacity = 0.38 + Math.sin(t * 7) * 0.1;
    const ph = (t * 0.8) % 1; sp.visible = ph < 0.35; sp.scale.setScalar(Math.max(0.001, Math.sin(ph / 0.35 * Math.PI)) * 1.4 * S);
  };
  return makeModel('sternschnuppe', root, update, own);
}

// =============================================================================================
// Spielzeugrakete
// =============================================================================================
const RAKETE_COLORS = { rot: [0xe8323e, 0xff8a8a, 0x8a1022], blau: [0x2a6ae8, 0x8ac4ff, 0x123a8a], gruen: [0x2ec85a, 0xa8f4a0, 0x0e7a3a], lila: [0x9a4ae8, 0xdcb0ff, 0x4a1a9a] };
function raketeGeo(color) {
  return memo(`star:rakete:${color}`, () => {
    const C = RAKETE_COLORS[color] ?? RAKETE_COLORS.rot;
    const b = new Build(), gl = new Build();
    // Rumpf (Höhe 4,6 bei Standard): Ei-Profil
    const prof = [[0, 0.7], [0.42, 0.72], [0.7, 0.95], [0.86, 1.4], [0.9, 2.0], [0.84, 2.6], [0.66, 3.2], [0.4, 3.7], [0.14, 4.05], [0, 4.12]];
    b.lathe(prof, { v: (x, y, z, nx, ny) => {
      const band = y > 1.55 && y < 1.95; const nose = y > 3.25;
      const base = nose ? mix(C[2], C[0], smoothstep(nx * 0.5 + 0.5)) : band ? mix(C[2], C[0], smoothstep(nx * 0.5 + 0.6)) : mix(0xb8c0d8, ST.white, smoothstep(nx * 0.5 + 0.55));
      return base;
    } }, null, 28, 3);
    // Bullaugen (vorn und seitlich)
    for (const [az, y] of [[0, 2.55], [TAU / 3, 2.55], [-TAU / 3, 2.55]]) {
      const rr = 0.85;
      const n = new THREE.Vector3(Math.cos(az), 0.05, Math.sin(az)).normalize();
      const p = new THREE.Vector3(Math.cos(az) * rr, y, Math.sin(az) * rr);
      b.add(new THREE.TorusGeometry(0.26, 0.06, 8, 24), gradV(ST.starLow, ST.starHi), placed(p, n, new THREE.Vector3(1, 1, 1)));
      b.add(new THREE.SphereGeometry(1, 16, 10), { v: (x, yy, z) => mix(0x1a4ab8, 0x8ad8ff, smoothstep(yy * 0.6 + 0.4)) }, placed(p.clone().addScaledVector(n, -0.02), n, new THREE.Vector3(0.24, 0.24, 0.08)));
      b.add(new THREE.SphereGeometry(1, 8, 5), 0xffffff, placed(p.clone().addScaledVector(n, 0.05).add(new THREE.Vector3(0, 0.08, 0)), n, new THREE.Vector3(0.06, 0.04, 0.02)));
    }
    // Goldstern auf der Spitze
    b.add(puffyStarGeo(0.32, 0.15, 0.14, 0.06), gradV(ST.starLow, ST.starHi, 0.5, 0.5), { p: [0, 4.38, 0], r: [0, Math.PI / 2, 0] });
    b.cyl(0.05, 0.08, 0.24, ST.star, { p: [0, 4.12, 0] }, 8);
    // Flossen (drei, puffig) mit weißem Rand
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU + Math.PI / 3;
      const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(0.75, 0.0, 0.95, -0.7); s.lineTo(0.92, -1.55); s.lineTo(0.62, -1.55); s.quadraticCurveTo(0.45, -0.85, 0, -0.62); s.lineTo(0, 0);
      const g = puffyGeo(s, 0.12, 0.05, 8, 2);
      const M = new THREE.Matrix4().makeRotationY(-a).multiply(new THREE.Matrix4().makeTranslation(0.7, 1.6, 0));
      b.add(g, { v: (x, y) => mix(C[2], C[0], smoothstep(y * 1.2 + 0.9)) }, M);
    }
    // Düse
    b.lathe([[0, 0.42], [0.46, 0.4], [0.5, 0.44], [0.44, 0.56], [0.36, 0.7], [0, 0.74]], { v: (x, y, z, nx, ny) => mix(0x2a2e46, 0x9aa6c8, smoothstep(ny * 0.5 + nx * 0.3 + 0.4)) }, null, 20);
    // Flamme (unbeleuchtet), Ursprung oben an der Düse
    gl.lathe([[0, -0.75], [0.1, -0.6], [0.26, -0.25], [0.38, 0.2], [0.34, 0.44], [0, 0.5]], { v: (x, y) => mix(0xff4a1a, 0xfff6c0, smoothstep((y + 0.4) / 0.8)) }, null, 16);
    gl.lathe([[0, -0.35], [0.1, -0.2], [0.2, 0.15], [0.18, 0.42], [0, 0.48]], { v: () => col(0xffffff) }, null, 12);
    return { body: b.geometry(), flame: gl.geometry() };
  });
}
function buildSpielzeugrakete(opts = {}) {
  const color = RAKETE_COLORS[opts.color] ? opts.color : 'rot';
  const S = clamp(num(opts.size, 4.6), 0.5, 60) / 4.6;
  const root = new THREE.Group();
  const sj = joint(); sj.scale.setScalar(S);
  const G = raketeGeo(color);
  const body = mesh(G.body, kulS(0.4), {}, true);
  const flameJ = joint([0, 0.5, 0]);
  const flame = mesh(G.flame, glowS(), { p: [0, -0.5, 0] });
  flameJ.add(flame);
  sj.add(body, flameJ);
  root.add(sj);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const f = clamp(num(st.flame, 0), 0, 1);
    flameJ.visible = f > 0.02;
    const fl = 1 + Math.sin(clk.t * 30) * 0.08 + Math.sin(clk.t * 17) * 0.05;
    flameJ.scale.set(0.6 + f * 0.4, Math.max(0.01, f * fl * 1.3), 0.6 + f * 0.4);
  };
  return makeModel('spielzeugrakete', root, update, []);
}

// =============================================================================================
// Regenbogenweg
// =============================================================================================
/** Mittellinie: Punkt, Richtung und Höhe für u ∈ 0..1. */
function rbFrame(u, L, bend, rise) {
  if (Math.abs(bend) < 1e-4) return { p: new THREE.Vector3(u * L, rise * smoothstep(u), 0), yaw: 0 };
  const R = L / bend, a = u * bend;
  return { p: new THREE.Vector3(Math.sin(a) * R, rise * smoothstep(u), -(R - Math.cos(a) * R)), yaw: a };
}
function rbGeo(L, W, bend, rise, T) {
  return memo(`star:rb:${k2(L)}:${k2(W)}:${k2(bend)}:${k2(rise)}:${k2(T)}`, () => {
    const b = new Build(), gl = new Build();
    const n = Math.max(6, Math.round(L * 2)), m = 7;
    const pos = [], top = [], side = [];
    const at = (u, v, dy = 0) => { const f = rbFrame(u, L, bend, rise); const nx = -Math.sin(f.yaw), nz = -Math.cos(f.yaw); return [f.p.x + nx * v, f.p.y + dy, f.p.z + nz * v]; };
    void pos; void side;
    // Oberseite: sieben Bahnen (je Dreieck einfarbig)
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
      const u0 = i / n, u1 = (i + 1) / n, v0 = -W / 2 + (j / m) * W, v1 = -W / 2 + ((j + 1) / m) * W;
      const a = at(u0, v0), bb = at(u1, v0), c = at(u1, v1), d = at(u0, v1);
      top.push([a, bb, c], [a, c, d]);
    }
    const tg = new THREE.BufferGeometry(), tp = [];
    for (const [a, bb, c] of top) tp.push(...a, ...bb, ...c);
    tg.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
    tg.computeVertexNormals();
    // Farben je Dreieck (paint mit Funktion: Schwerpunkt → Bahn)
    b.add(tg, (x, y, z) => {
      // Bahn aus dem Abstand zur Mittellinie (Querrichtung)
      let best = 0, bd = 1e9;
      for (let i = 0; i <= n; i++) { const f = rbFrame(i / n, L, bend, rise); const d = (x - f.p.x) ** 2 + (z - f.p.z) ** 2; if (d < bd) { bd = d; best = i; } }
      const f = rbFrame(best / n, L, bend, rise);
      const v = (x - f.p.x) * -Math.sin(f.yaw) + (z - f.p.z) * -Math.cos(f.yaw);
      const k = clamp((v + W / 2) / W, 0, 0.999);
      return rainbowAt(1 - k);
    });
    // Unterseite und Seiten (lila-weiß) als Band
    const sides = [];
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n;
      for (const [v, s] of [[-W / 2, -1], [W / 2, 1]]) {
        const a = at(u0, v), bb = at(u1, v), c = at(u1, v, -T), d = at(u0, v, -T);
        if (s > 0) sides.push(a, bb, c, a, c, d); else sides.push(a, c, bb, a, d, c);
      }
      const a = at(u0, -W / 2, -T), bb = at(u1, -W / 2, -T), c = at(u1, W / 2, -T), d = at(u0, W / 2, -T);
      sides.push(a, c, bb, a, d, c);
    }
    // Stirnseiten am Anfang (−X) und Ende (+X)
    for (const [u, s] of [[0, 1], [1, -1]]) {
      const p1 = at(u, -W / 2), p2 = at(u, W / 2), p3 = at(u, W / 2, -T), p4 = at(u, -W / 2, -T);
      if (s > 0) sides.push(p1, p2, p3, p1, p3, p4); else sides.push(p1, p3, p2, p1, p4, p3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sides.flat(), 3));
    sg.computeVertexNormals();
    b.add(sg, { v: (x, y, z, nx, ny) => mix(0x8a7ad8, 0xf0e8ff, smoothstep(ny * 0.5 + 0.5)) });
    // weiße Randwülste mit Goldsternen
    for (const v of [-W / 2, W / 2]) {
      const pts = Array.from({ length: n + 1 }, (_, i) => at(i / n, v, -0.02));
      b.add(taperTube(pts, 0.12, n * 2, 8), { v: (x, y, z, nx, ny) => mix(0xc8d0f0, 0xffffff, smoothstep(ny * 0.6 + 0.5)) });
      const ns = Math.max(1, Math.round(L / 1.6));
      for (let i = 0; i <= ns; i++) b.add(flatStarGeo(0.14, 0.04, 0.02), ST.star, { p: at(i / ns, v, 0.1) });
    }
    // Funkel-Sternchen unter dem Weg (unbeleuchtet)
    const nf = Math.max(2, Math.round(L / 1.2));
    for (let i = 0; i < nf; i++) {
      const p = at((i + 0.5) / nf, (hash1(i) - 0.5) * W * 0.8, -T - 0.25 - hash1(i + 3) * 0.5);
      gl.add(puffyStarGeo(0.1, 0.04, 0.03, 0.01, 4), [0xfff4b0, 0xffb8e8, 0xb8f4ff][i % 3], { p, r: [0, i, 0] });
    }
    const end = rbFrame(1, L, bend, rise);
    return { body: b.geometry(), glow: gl.geometry(), end: { x: end.p.x, y: end.p.y, z: end.p.z, yaw: end.yaw } };
  });
}
function buildRegenbogenweg(opts = {}) {
  const L = clamp(num(opts.length, 8), 0.5, 200), W = clamp(num(opts.width, 3), 0.5, 30), bend = clamp(num(opts.bend, 0), -TAU, TAU), rise = clamp(num(opts.rise, 0), -100, 100), T = clamp(num(opts.thick, 0.35), 0.05, 5);
  const G = rbGeo(L, W, bend, rise, T);
  const root = new THREE.Group();
  const body = mesh(G.body, kulS(0.4), {}, true);
  body.receiveShadow = true;
  root.add(body, mesh(G.glow, glowS(), {}));
  root.userData.end = G.end;
  return makeModel('regenbogenweg', root, () => {}, []);
}

// =============================================================================================
// Waben-Säule
// =============================================================================================
function saeuleGeo(H, r, kind) {
  return memo(`star:wsaeule:${k2(H)}:${k2(r)}:${kind}`, () => {
    const b = new Build(), gl = new Build();
    const C = kind === 'lava' ? [ST.crust, ST.crustHi, 0x8a4a3a] : kind === 'eis' ? [ST.iceLow, ST.ice, ST.iceHi] : [ST.combLow, ST.comb, ST.combHi];
    const n = Math.max(1, Math.round(H / 1.2)), sh = H / n;
    for (let i = 0; i < n; i++) {
      const y0 = i * sh, k = (i + 0.5) / n;
      const g = hexPrismGeo(r * (1 - (i % 2) * 0.03), sh - 0.06, 0.05, 1);
      b.add(g, { v: (x, y, z, nx, ny) => mix(mix(0x120c2a, C[0], 0.35 + k * 0.65), C[1], smoothstep(nx * 0.3 + ny * 0.4 + 0.3) * (0.4 + k * 0.6)) }, { p: [0, y0 + 0.03, 0] });
      const ring = hexPrismGeo(r * 1.04, 0.07, 0.02, 1);
      b.add(ring, mix(C[0], C[2], 0.5 + k * 0.5), { p: [0, y0, 0] });
    }
    // Deckwabe
    const top = new THREE.ShapeGeometry(hexShape(r * 0.88, r * 0.06), 3); top.rotateX(-Math.PI / 2);
    if (kind === 'lava') gl.add(top, { v: (x, y, z) => mix(ST.lavaWhite, ST.lava, smoothstep(Math.hypot(x, z) / r * 1.2)) }, { p: [0, H + 0.01, 0] });
    else b.add(top, { v: (x, y, z) => (kind === 'eis' ? mix(ST.frost, ST.ice, smoothstep(Math.hypot(x, z) / r)) : mix(ST.honeyHi, ST.honey, smoothstep(Math.hypot(x, z) / r))) }, { p: [0, H + 0.01, 0] });
    if (kind === 'normal') b.add(flatStarGeo(r * 0.3, 0.05, 0.02), ST.white, { p: [0, H + 0.04, 0] });
    if (kind === 'eis') for (let i = 0; i < 3; i++) { const a = i * 2.1; b.add(new THREE.ConeGeometry(r * 0.12, r * 0.5, 6), ST.iceHi, { p: [Math.cos(a) * r * 0.5, H + r * 0.25, Math.sin(a) * r * 0.5], r: [Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3] }); }
    return { body: b.geometry(), glow: gl.parts.length ? gl.geometry() : null };
  });
}
function buildWabensaeule(opts = {}) {
  const H = clamp(num(opts.height, 8), 0.5, 120), r = clamp(num(opts.size, 1.2), 0.2, 20);
  const kind = ['normal', 'lava', 'eis'].includes(opts.kind) ? opts.kind : 'normal';
  const G = saeuleGeo(H, r, kind);
  const root = new THREE.Group();
  root.add(mesh(G.body, kulS(0.5), {}, true));
  if (G.glow) root.add(mesh(G.glow, glowS(), {}));
  return makeModel('wabensaeule', root, () => {}, []);
}

// =============================================================================================
// Antenne, Kuppel
// =============================================================================================
function antenneGeo() {
  return memo('star:antenne', () => {
    const b = new Build(), gl = new Build();
    const hull = { v: (x, y, z, nx, ny) => mix(ST.hullLow, ST.hullHi, smoothstep(ny * 0.5 + nx * 0.3 + 0.4)) };
    b.dome(1.4, hull, { s: [1, 0.6, 1] }, Math.PI / 2, 28, 8);
    b.cyl(1.45, 1.5, 0.2, 0x3a3e58, { p: [0, 0.1, 0] }, 28);
    gl.torus(1.46, 0.04, ST.neon, { p: [0, 0.22, 0], r: [Math.PI / 2, 0, 0] }, 4, 40);
    // Gittermast (dreieckig, rot-weiße Abschnitte)
    const H = 5.2, y0 = 0.75;
    const corner = (i, y) => { const a = (i / 3) * TAU, r = lerp(0.42, 0.14, (y - y0) / H); return [Math.cos(a) * r, y, Math.sin(a) * r]; };
    for (let i = 0; i < 3; i++) {
      for (let k = 0; k < 5; k++) {
        const ya = y0 + (k / 5) * H, yb = y0 + ((k + 1) / 5) * H;
        rod(b, corner(i, ya), corner(i, yb), 0.06, 0.06, k % 2 ? ST.white : 0xe8323e, 6);
        rod(b, corner(i, ya), corner((i + 1) % 3, yb), 0.025, 0.025, 0x9aa6c8, 4);
      }
    }
    // Schüssel (Paraboloid) mit Goldempfänger, schräg nach +X oben
    const dish = new THREE.LatheGeometry(Array.from({ length: 9 }, (_, i) => { const r = (i / 8) * 1.15; return new THREE.Vector2(r, r * r * 0.32); }).concat([new THREE.Vector2(1.12, 0.46), new THREE.Vector2(0.0, 0.08)]), 28);
    const DM = new THREE.Matrix4().compose(new THREE.Vector3(0.55, 3.6, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.85)), new THREE.Vector3(1, 1, 1));
    b.add(dish, { v: (x, y, z, nx, ny) => mix(0xb8c4e0, ST.white, smoothstep(ny * 0.5 + 0.5)) }, DM);
    b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), 0x9aa6c8, DM.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.5, 0)));
    b.add(new THREE.SphereGeometry(0.1, 10, 8), ST.star, DM.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.95, 0)));
    // Funkring und Spitze
    b.torus(0.32, 0.04, ST.star, { p: [0, y0 + H - 0.4, 0], r: [Math.PI / 2, 0, 0] }, 6, 20);
    b.cyl(0.03, 0.05, 1.0, ST.silver, { p: [0, y0 + H + 0.4, 0] }, 6);
    gl.sphere(0.13, 0xff3a4a, { p: [0, y0 + H + 0.95, 0] }, 10, 8);
    return { body: b.geometry(), glow: gl.geometry(), tip: y0 + H + 0.95 };
  });
}
function buildAntenne(opts = {}) {
  const S = clamp(num(opts.size, 7.5), 0.5, 80) / 7.5;
  const G = antenneGeo();
  const root = new THREE.Group();
  const own = [];
  const sj = joint(); sj.scale.setScalar(S);
  sj.add(mesh(G.body, kulS(0.35), {}, true), mesh(G.glow, glowS(), {}));
  const blink = glowSprite(0xff3a4a, 1.4, 0.8); blink.material = blink.material.clone(); own.push(blink.material);
  blink.position.y = G.tip;
  sj.add(blink);
  root.add(sj);
  const clk = new Clock();
  const update = (dt, st) => { clk.tick(dt, 'idle'); const on = st.blink !== false && (clk.t % 1.2) < 0.5; blink.visible = on; };
  return makeModel('weltraum_antenne', root, update, own);
}
function kuppelGeo() {
  return memo('star:kuppel', () => {
    const b = new Build(), gl = new Build();
    const hull = { v: (x, y, z, nx, ny) => mix(ST.hullLow, ST.hullHi, smoothstep(ny * 0.5 + nx * 0.3 + 0.45)) };
    // Ringbau (Ø 6, 1,4 hoch) mit Fensterband
    b.lathe([[0, 0], [3.0, 0], [3.1, 0.15], [3.05, 1.2], [2.85, 1.45], [2.6, 1.5], [0, 1.5]], hull, null, 40);
    const nw = 16;
    for (let i = 0; i < nw; i++) {
      const a = (i / nw) * TAU;
      const n = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      gl.add(new THREE.CircleGeometry(0.2, 12), { v: (x, y) => mix(0x3ae8ff, 0xd8ffff, smoothstep(y * 3 + 0.5)) }, placed(n.clone().multiplyScalar(3.09).setY(0.72), n, new THREE.Vector3(1, 1, 1)));
    }
    gl.torus(3.1, 0.035, ST.neonPink, { p: [0, 0.18, 0], r: [Math.PI / 2, 0, 0] }, 4, 48);
    // Glaskuppel (undurchsichtig gemalt: Himmel spiegelt sich), Rippen
    b.dome(2.6, { v: (x, y, z) => {
      const s = Math.sin((x * 0.8 - z * 0.3) * 2.2 + y);
      const base = mix(0x2a5ad8, 0x9ae0ff, smoothstep(y / 2.6 * 0.9 + x / 2.6 * 0.3));
      return s > 0.86 ? mix(base, 0xffffff, 0.7) : base;
    } }, { p: [0, 1.45, 0], s: [1, 0.9, 1] }, Math.PI / 2, 36, 12);
    for (let i = 0; i < 6; i++) b.torus(2.6, 0.045, ST.hullHi, { p: [0, 1.45, 0], r: [0, (i / 6) * Math.PI, 0], s: [1, 0.9, 1] }, 4, 24, Math.PI);
    // Sternantenne oben
    b.cyl(0.04, 0.06, 0.8, ST.silver, { p: [0, 1.45 + 2.34 + 0.35, 0] }, 6);
    b.add(puffyStarGeo(0.22, 0.1, 0.1, 0.04), gradV(ST.starLow, ST.starHi), { p: [0, 1.45 + 2.34 + 0.9, 0], r: [0, Math.PI / 2, 0] });
    // Eingang vorn (+X)
    b.box(0.6, 1.1, 1.3, hull, { p: [3.05, 0.6, 0] }, 0.12, 2);
    gl.add(new THREE.PlaneGeometry(0.9, 0.8), { v: (x, y) => mix(0xffc84a, 0xfff6c0, smoothstep(y + 0.4)) }, { p: [3.36, 0.55, 0], r: [0, Math.PI / 2, 0] });
    return { body: b.geometry(), glow: gl.geometry() };
  });
}
function buildKuppel(opts = {}) {
  const S = clamp(num(opts.size, 6), 0.5, 80) / 6;
  const G = kuppelGeo();
  const root = new THREE.Group();
  const sj = joint(); sj.scale.setScalar(S);
  const body = mesh(G.body, kulS(0.3), {}, true);
  body.receiveShadow = true;
  sj.add(body, mesh(G.glow, glowS(), {}));
  root.add(sj);
  return makeModel('weltraum_kuppel', root, () => {}, []);
}

// =============================================================================================
// Sternen-Torbogen
// =============================================================================================
function torbogenGeo(W, H) {
  return memo(`star:torbogen:${k2(W)}:${k2(H)}`, () => {
    const b = new Build(), gl = new Build(), au = new Build();
    const pillarH = Math.max(1, H - W / 2);
    for (const s of [1, -1]) {
      const z = s * W / 2;
      au.cyl(0.55, 0.65, 0.4, gradV(ST.starLow, ST.starHi), { p: [0, 0.2, z] }, 20);
      b.cyl(0.38, 0.42, pillarH - 0.4, { v: (x, y, zz, nx) => (Math.floor(Math.atan2(zz - z, x) / TAU * 10 + 10) % 2 ? mix(0xc8d0f0, ST.white, smoothstep(nx * 0.5 + 0.5)) : mix(0xe8eef8, ST.white, 0.6)) }, { p: [0, 0.4 + (pillarH - 0.4) / 2, z] }, 20);
      au.cyl(0.5, 0.44, 0.25, gradV(ST.starLow, ST.starHi), { p: [0, pillarH, z] }, 20);
    }
    // Bogen aus Sternen (Halbkreis über den Säulen), Schlussstern oben
    const R = W / 2, n = 11;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI;
      const z = Math.cos(a) * R, y = pillarH + Math.sin(a) * R * ((H - pillarH) / R);
      const big = i === Math.round(n / 2);
      if (big) continue;
      const s = 0.42;
      b.add(puffyStarGeo(s, s * 0.46, s * 0.55, s * 0.18), { v: (x, yy, zz, nx) => mix(rainbowAt(i / n), 0xffffff, smoothstep(nx * 0.5 + 0.1) * 0.35) }, { p: [0, y, z], r: [0, Math.PI / 2, a - Math.PI / 2], order: 'YXZ' });
    }
    // Verbindungsband (weißer Wulst) hinter den Sternen
    const pts = Array.from({ length: 25 }, (_, i) => { const a = (i / 24) * Math.PI; return [-0.12, pillarH + Math.sin(a) * (H - pillarH), Math.cos(a) * R]; });
    b.add(taperTube(pts, 0.14, 48, 8), { v: (x, y, z, nx, ny) => mix(0xd8dcf4, 0xffffff, smoothstep(ny * 0.5 + 0.5)) });
    au.add(puffyStarGeo(0.9, 0.42, 0.6, 0.22), gradV(ST.starLow, ST.starHi, 0.5, 0.5), { p: [0, H + 0.2, 0], r: [0, Math.PI / 2, 0] });
    gl.add(puffyStarGeo(0.32, 0.14, 0.1, 0.04, 4), 0xfffbe0, { p: [0.62, H + 0.25, 0], r: [0, Math.PI / 2, 0] });
    return { body: b.geometry(), glow: gl.geometry(), gold: au.geometry() };
  });
}
function buildTorbogen(opts = {}) {
  const W = clamp(num(opts.width, 6), 1, 60), H = clamp(num(opts.height, 5), 1, 60);
  const G = torbogenGeo(W, H);
  const root = new THREE.Group();
  root.add(mesh(G.body, kulS(0.35), {}, true), mesh(G.gold, kulGold(), {}, true), mesh(G.glow, glowS(), {}));
  const own = [];
  const halo = glowSprite(0xfff0a0, 3, 0.35); halo.material = halo.material.clone(); own.push(halo.material);
  halo.position.set(0.3, H + 0.2, 0);
  root.add(halo);
  const clk = new Clock();
  const update = (dt) => { clk.tick(dt, 'idle'); halo.material.opacity = 0.3 + Math.sin(clk.t * 2) * 0.08; };
  return makeModel('sternen_torbogen', root, update, own);
}

export const MODELS = {
  sternschnuppe: buildSternschnuppe,
  spielzeugrakete: buildSpielzeugrakete,
  regenbogenweg: buildRegenbogenweg,
  wabensaeule: buildWabensaeule,
  weltraum_antenne: buildAntenne,
  weltraum_kuppel: buildKuppel,
  sternen_torbogen: buildTorbogen,
};
