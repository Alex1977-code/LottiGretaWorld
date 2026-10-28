// Abspann-Bühnenbild Welt 8 (nach dem Sieg über Baron Brummbär): eine kleine Festwiese als Modellgruppe für den Szenen-Agenten.
// Eigene Gestaltung. Maßstab Meter, Ursprung = Mitte der Wiese (y = 0), Blick der Freunde zur Kamera-Seite (+Z) bzw. zur Decke.
//
// abspann_buehne  Wiese Ø 12 m (runde, sanft gewölbte Insel mit Blumen, Kleeblättern und Steinchen), rot-weiß karierte
//   Picknickdecke (3 × 3 m) mit Korb, Möhren, Teekanne, Bechern und einer Feiertorte mit Kerze, drei Laternenmasten mit
//   Lampion-Ketten (bunte Papierlampions, leuchtend, schaukeln sacht) und alle befreiten Freunde als kleine Figuren
//   (Krümel, Flocke, Hoppel – Häschen aus bunny_small – und der Fernglas-Kobold aus fairy_spotter) rund um die Decke.
//   opts  { size (Faktor, 1), friends (Liste, Standard alle vier) }
//   state { wave (0..1: Freunde hüpfen und winken – je größer, desto ausgelassener; Standard 0 = sitzen, wippen, schauen sich
//           an), glow (0..1 Lampions und Kerze, Standard 1) }
//   root.userData.friends → Namen; root.userData.spots → Plätze für die Hauptfiguren, die der Szenen-Agent selbst aufstellt:
//   { lotti, greta, pflaume, kruemel_kapitaen }: je [x, z, yaw] (Wiese, Blick zur Decke).

import {
  THREE, TAU, Build, cached, vcol, mesh, joint, makeModel, Clock, damp, clamp, col, mix, smoothstep, lerp, instMesh, setInst,
  glowSprite,
} from '../lib/kit.js';
import {
  W8, num, kulMat8, glow8, gradV, hash1, noise3, taperTube, lumpyEllipsoid, friendFigure, FRIEND_KEYS, puffyStarGeo, memo,
} from '../lib/w8Geos.js';

const MEADOW = { grass: 0x6ac84a, grassHi: 0xb8ec7a, grassLow: 0x3a8a3a, earth: 0x8a5a3a, earthLow: 0x5a3a2a };
const LAMP_COLS = [0xff5a7a, 0xffc83a, 0x5ad8ff, 0xa87aff, 0x7ae85a];
const POLES = [[-4.6, -3.2], [4.8, -3.0], [0.4, -5.6]];
function meadowGeo() {
  return memo('w8:abspann:wiese', () => {
    const b = new Build();
    // Insel: Rasenkuppe mit Erdrand
    const top = new THREE.CircleGeometry(6, 48, 0, TAU); top.rotateX(-Math.PI / 2);
    const P = top.attributes.position;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i), r = Math.hypot(x, z) / 6; P.setY(i, (1 - r * r) * 0.35 + (noise3(x * 0.5, 0, z * 0.5) - 0.5) * 0.08); }
    top.computeVertexNormals();
    b.add(top, { v: (x, y, z) => mix(MEADOW.grassLow, mix(MEADOW.grass, MEADOW.grassHi, noise3(x * 0.7, 0, z * 0.7)), smoothstep(y / 0.3 + 0.3)) });
    b.cyl(6, 5.4, 1.2, { v: (x, y) => mix(MEADOW.earthLow, MEADOW.earth, smoothstep(y + 0.6)) }, { p: [0, -0.6, 0] }, 48, true);
    b.torus(6, 0.12, MEADOW.grass, { p: [0, 0.0, 0], r: [Math.PI / 2, 0, 0] }, 5, 48);
    // Picknickdecke (kariert), leicht gewellt
    const blanket = new THREE.PlaneGeometry(3, 3, 12, 12); blanket.rotateX(-Math.PI / 2);
    const B = blanket.attributes.position;
    for (let i = 0; i < B.count; i++) { const x = B.getX(i), z = B.getZ(i), r = Math.hypot(x, z) / 6; B.setY(i, (1 - r * r) * 0.35 + 0.03 + Math.sin(x * 3) * Math.sin(z * 2) * 0.015); }
    blanket.computeVertexNormals();
    b.add(blanket, (x, y, z) => ((Math.floor((x + 3) * 2) + Math.floor((z + 3) * 2)) % 2 ? col(0xe8283a) : col(0xfff6ee)), { p: [0.3, 0, 0.6] });
    const yb = 0.38;
    // Korb mit Henkel und Möhren
    b.cyl(0.32, 0.26, 0.36, { v: (x, y, z) => (Math.sin(Math.atan2(z, x) * 12 + y * 20) > 0 ? col(0xc8884a) : col(0xa86a32)) }, { p: [-0.5, yb + 0.18, 0.2] }, 18);
    b.torus(0.3, 0.035, 0xa86a32, { p: [-0.5, yb + 0.36, 0.2], r: [0, 0, 0], s: [1, 1.1, 1] }, 5, 18, Math.PI);
    for (let i = 0; i < 3; i++) { b.cone(0.05, 0.3, 0xff7a1a, { p: [-0.45 + i * 0.08, yb + 0.42, 0.15 + i * 0.05], r: [0.4 - i * 0.3, 0, 0.3] }, 8); b.cone(0.04, 0.12, 0x3ac43a, { p: [-0.42 + i * 0.08, yb + 0.58, 0.12 + i * 0.05], r: [0.4 - i * 0.3, 0, 0.3 + Math.PI] }, 5); }
    // Torte mit Sahnetupfen und Erdbeeren, Teekanne, Becher
    b.cyl(0.42, 0.44, 0.3, { v: (x, y) => (y > 0.08 ? col(0xfff0f6) : col(0xffb8d8)) }, { p: [0.6, yb + 0.15, 0.7] }, 24);
    b.cyl(0.3, 0.32, 0.22, 0xff9ac8, { p: [0.6, yb + 0.41, 0.7] }, 20);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; b.sphere(0.05, 0xffffff, { p: [0.6 + Math.cos(a) * 0.36, yb + 0.32, 0.7 + Math.sin(a) * 0.36] }, 8, 6); }
    for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + 0.5; b.sphere(0.06, 0xe8283a, { p: [0.6 + Math.cos(a) * 0.17, yb + 0.55, 0.7 + Math.sin(a) * 0.17] }, 8, 6); }
    b.cyl(0.035, 0.035, 0.22, 0xfff6ee, { p: [0.6, yb + 0.63, 0.7] }, 8);
    b.sphere(1, 0x5ad8ff, { p: [1.3, yb + 0.2, -0.1], s: [0.22, 0.2, 0.22] }, 16, 10);
    b.tube([[1.5, yb + 0.22, -0.1], [1.62, yb + 0.3, -0.1], [1.7, yb + 0.36, -0.1]], 0.03, 0x5ad8ff, null, 6, 4);
    b.torus(0.08, 0.025, 0x5ad8ff, { p: [1.08, yb + 0.22, -0.1] }, 5, 10);
    b.sphere(0.05, 0xffd23a, { p: [1.3, yb + 0.42, -0.1] }, 6, 4);
    for (const [x, z, c] of [[1.0, 0.6, 0xffd23a], [-0.2, 1.4, 0xa87aff], [1.4, 1.3, 0x3ac4a8]]) b.cyl(0.08, 0.07, 0.16, c, { p: [x, yb + 0.08, z] }, 12);
    // Blumen, Kleeblätter, Steinchen
    for (let i = 0; i < 34; i++) {
      const a = hash1(i) * TAU, r = 2.3 + hash1(i + 50) * 3.4;
      const x = Math.cos(a) * r, z = Math.sin(a) * r, y = (1 - (r / 6) ** 2) * 0.35;
      if (Math.abs(x - 0.3) < 1.7 && Math.abs(z - 0.6) < 1.7) continue;
      if (i % 3 === 2) { b.add(lumpyEllipsoid([0.15, 0.08, 0.12], 0.02, 3, i, 7, 5), gradV(0x8a8a9a, 0xd8d8e0), { p: [x, y, z] }); continue; }
      b.cyl(0.015, 0.015, 0.22, 0x3a8a2a, { p: [x, y + 0.11, z] }, 4);
      const pc = [0xffffff, 0xffd23a, 0xff8ac8, 0x8ac8ff, 0xff6a5a][i % 5];
      for (let k = 0; k < 5; k++) { const pa = (k / 5) * TAU; b.sphere(1, pc, { p: [x + Math.cos(pa) * 0.05, y + 0.23, z + Math.sin(pa) * 0.05], s: [0.045, 0.02, 0.045] }, 5, 3); }
      b.sphere(0.03, i % 5 === 1 ? 0xff9a1a : 0xffd23a, { p: [x, y + 0.24, z] }, 6, 4);
    }
    // Laternenmasten
    for (const [x, z] of POLES) {
      const y = (1 - (Math.hypot(x, z) / 6) ** 2) * 0.35;
      b.cyl(0.07, 0.09, 3.4, gradV(0x6a4a2a, 0xa87a4a), { p: [x, y + 1.7, z] }, 8);
      b.sphere(0.12, W8.gold, { p: [x, y + 3.45, z] }, 8, 6);
    }
    // Lampion-Schnüre zwischen den Masten
    for (let k = 0; k < 3; k++) {
      const [x0, z0] = POLES[k], [x1, z1] = POLES[(k + 1) % 3];
      const pts = []; for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push([lerp(x0, x1, u), 3.35 - Math.sin(u * Math.PI) * 0.7, lerp(z0, z1, u)]); }
      b.add(taperTube(pts, 0.015, 24, 3), 0x3a2a2a);
    }
    return b.geometry();
  });
}
/** Lampion (Mitte im Ursprung, hängt an y = +0,25), Papier mit Rippen, Deckel, Boden. */
const lampionGeo = () => cached('w8:lampion', () => {
  const b = new Build();
  b.add(new THREE.SphereGeometry(0.22, 10, 8), { v: (x, y, z) => (Math.abs(Math.sin(y * 28)) < 0.18 ? new THREE.Color(0.7, 0.7, 0.7) : new THREE.Color(1, 1, 1)) }, { s: [1, 1.15, 1] });
  b.cyl(0.1, 0.1, 0.06, 0x8a6a3a, { p: [0, 0.25, 0] }, 8);
  b.cyl(0.1, 0.1, 0.05, 0x8a6a3a, { p: [0, -0.25, 0] }, 8);
  return b.geometry();
});
function lampSpots() {
  const out = [];
  for (let k = 0; k < 3; k++) {
    const [x0, z0] = POLES[k], [x1, z1] = POLES[(k + 1) % 3];
    for (let i = 1; i < 6; i++) { const u = i / 6; out.push([lerp(x0, x1, u), 3.35 - Math.sin(u * Math.PI) * 0.7 - 0.3, lerp(z0, z1, u)]); }
  }
  return out;
}
// Plätze der Freunde (um die Decke, Blick zur Deckenmitte) und der Hauptfiguren
const CENTER = [0.3, 0.6];
const faceCenter = (x, z) => Math.atan2(-(CENTER[1] - z), CENTER[0] - x);
const FRIEND_AT = [[-1.5, 1.8], [2.2, 1.9], [-1.4, -0.9], [2.1, -1.0]].map(([x, z]) => [x, z, faceCenter(x, z)]);
const SPOTS = Object.fromEntries(Object.entries({ lotti: [-0.7, 2.6], greta: [1.3, 2.7], pflaume: [-2.5, 0.6], kruemel_kapitaen: [0.4, -1.6] }).map(([k, [x, z]]) => [k, [x, z, faceCenter(x, z)]]));
function buildAbspann(opts = {}) {
  const S = clamp(num(opts.size, 1), 0.3, 5);
  const keys = (Array.isArray(opts.friends) ? opts.friends : FRIEND_KEYS).filter((k) => FRIEND_KEYS.includes(k)).slice(0, 4);
  const root = new THREE.Group();
  const own = [];
  const sj = joint(); sj.scale.setScalar(S);
  const ground = mesh(meadowGeo(), kulMat8(0.8), {}, true);
  ground.receiveShadow = true;
  const LS = lampSpots();
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, toneMapped: false });
  own.push(lampMat);
  const lamps = instMesh(lampionGeo(), lampMat, LS.length, 8, 3);
  LS.forEach((_, i) => lamps.setColorAt(i, new THREE.Color(LAMP_COLS[i % LAMP_COLS.length])));
  const flame = mesh(cached('w8:abspann:flame', () => new Build().add(puffyStarGeo(0.06, 0.035, 0.03, 0.015, 6), { v: (x, y) => mix(0xff8a1a, 0xfff2a0, smoothstep(y * 10 + 0.5)) }, { s: [0.8, 1.6, 0.8] }).geometry()), glow8(), { p: [0.6, 0.38 + 0.8, 0.7] });
  const friends = keys.map((k, i) => {
    const f = friendFigure(k);
    const [x, z, yaw] = FRIEND_AT[i];
    const y = (1 - (Math.hypot(x, z) / 6) ** 2) * 0.35;
    const j = joint([x, y, z], f);
    j.rotation.y = yaw;
    const sc = k === 'kobold' ? 1.0 : 1.35;
    j.scale.setScalar(sc);
    j.userData = { x, y, z, yaw, sc, ph: i * 1.9 };
    return j;
  });
  sj.add(ground, lamps, flame, ...friends);
  root.add(sj);
  root.userData.friends = keys;
  root.userData.spots = Object.fromEntries(Object.entries(SPOTS).map(([k, [x, z, yaw]]) => [k, [x * S, z * S, yaw]]));
  const clk = new Clock();
  let wv = 0;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t = clk.t;
    wv = damp(wv, clamp(num(st.wave, 0), 0, 1), 4, dt);
    const g = clamp(num(st.glow, 1), 0, 1);
    LS.forEach(([x, y, z], i) => setInst(lamps, i, x + Math.sin(t * 0.9 + i) * 0.04, y, z, Math.sin(t * 1.1 + i * 0.7) * 0.08, i, Math.cos(t * 1.3 + i) * 0.08));
    lamps.instanceMatrix.needsUpdate = true;
    lampMat.color.setScalar(0.35 + g * 0.65);
    flame.visible = g > 0.05;
    flame.scale.set(1, 1 + Math.sin(t * 17) * 0.12, 1);
    friends.forEach((f) => {
      const u = f.userData;
      let y = u.y, rz = 0, ry = u.yaw, sx = 1;
      if (wv > 0.02) {
        const p = ((t * (1.6 + wv * 0.8) + u.ph * 0.3) % 1);
        y += Math.sin(p * Math.PI) * 0.4 * wv; rz = Math.sin(t * 6 + u.ph) * 0.25 * wv; ry += Math.sin(t * 2.5 + u.ph) * 0.6 * wv;
        sx = 1 + Math.pow(Math.max(0, Math.cos(p * TAU)), 6) * 0.08 * wv;
      } else {
        y += Math.max(0, Math.sin(t * 2.2 + u.ph)) * 0.03;
        ry += Math.sin(t * 0.5 + u.ph) * 0.3;
      }
      f.position.set(u.x, y, u.z);
      f.rotation.set(0, ry, rz);
      f.scale.set(u.sc * sx, u.sc / sx, u.sc * sx);
    });
  };
  return makeModel('abspann_buehne', root, update, [...own, lamps], { initial: 'idle' });
}

export const MODELS = {
  abspann_buehne: buildAbspann,
};
