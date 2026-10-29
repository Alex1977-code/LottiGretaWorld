// Kulisse Welt Krone „Kronen-Gipfel“ (Abschlussprüfung, Kronen-Karte): goldenes Siegerpodest mit Krone und großer Pokal. Eigene
// Gestaltung, Kartenqualität, ohne Spielzeug-Look (`toy: false`), backbar (undurchsichtig vertexgefärbt; Gold als Kulissen-Metall,
// Funkel-Sprites fallen beim Backen weg). Maßstab Meter, Vorderseite +X, Ursprung = Fußpunkt.
//
// krone_podest  Siegerpodest ≈ 3,4 × 6,4 m (x × z), ≈ 4 m hoch: Marmorstufe mit rotem Teppich nach +X, drei goldene Treppchen (Mitte 1,6 m,
//               links −Z 1,1 m, rechts +Z 0,75 m) mit eingelassenen Sternen (3/2/1), auf der Mitte ein rotes Samtkissen mit großer
//               Krone (fünf Zacken mit Perlen, Rubin, Saphir und Smaragden, Hermelin-Rand).  opts { size (Maßstab, 1) }
//               state { sparkle (true: Funkeln an der Krone) }   root.userData.crown → Kronenmitte (lokal).
// pokal_gross   großer Pokal ≈3 m: achteckiger Marmorsockel mit Goldkante und Sternplakette, Goldfuß mit Knauf, bauchige Schale mit
//               zwei Schwingen-Henkeln, Sternwappen vorn (+X), Deckel mit Goldstern.  opts { size (Höhe, 3) }
//               state { sparkle (true) }

import { THREE, TAU, Build, mesh, joint, makeModel, Clock, clamp, col, mix, smoothstep, lerp, placed, puffyStarGeo, sparkleSprite, glowSprite, roundedBox, SIDE } from '../lib/kit.js';
import { ST, num, gradV, noise3, hash1, taperTube, memo, kulS, kulGold, glowS, flatStarGeo, puffyGeo, roundRectShape } from '../lib/starGeos.js';

const goldV = (lo = ST.goldLow, hi = ST.goldHi) => ({ v: (x, y, z, nx, ny) => mix(lo, mix(ST.gold, hi, smoothstep(ny * 0.6 + nx * 0.3)), smoothstep(ny * 0.5 + nx * 0.35 + 0.55)) });
const marbleV = { v: (x, y, z, nx, ny) => { const n = noise3(x * 1.4, y * 1.4, z * 1.4), vein = Math.abs(Math.sin((x + z) * 2.2 + n * 6)) < 0.06; return vein ? col(ST.marbleLow) : mix(ST.marbleLow, ST.marble, smoothstep(ny * 0.4 + 0.6 + (n - 0.5) * 0.3)); } };

// =============================================================================================
// Krone (Ursprung Mitte unten, Ø ≈ 1,8, Höhe ≈ 1,5)
// =============================================================================================
function crownParts(b, gem, au) {
  const R = 0.9, H = 0.62;
  // Reif (offener Zylinder doppelt: außen/innen) mit Zackenkante
  au.lathe([[R * 0.92, 0], [R, 0.02], [R * 1.02, H * 0.5], [R, H], [R * 0.93, H], [R * 0.9, 0.04]], goldV(), null, 40);
  // Hermelin-Rand unten
  b.torus(R * 1.0, 0.12, { v: (x, y, z) => (Math.floor(Math.atan2(z, x) / TAU * 18 + 18) % 3 === 0 && y < 0.02 ? col(0x1a1420) : mix(0xe8e2f0, 0xffffff, smoothstep(y * 6 + 0.5))) }, { p: [0, 0.06, 0], r: [Math.PI / 2, 0, 0] }, 8, 40);
  // fünf Zacken mit Perlen
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    const s = new THREE.Shape(); s.moveTo(-0.32, 0); s.quadraticCurveTo(-0.12, 0.25, 0, 0.62); s.quadraticCurveTo(0.12, 0.25, 0.32, 0); s.lineTo(-0.32, 0);
    const g = puffyGeo(s, 0.07, 0.04, 6, 2);
    const n = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const M = placed(n.clone().multiplyScalar(R * 0.98).setY(H - 0.04), n, new THREE.Vector3(1, 1, 1));
    au.add(g, goldV(), M);
    b.sphere(0.11, { v: (x, y, z, nx, ny) => mix(0xe8dcf0, ST.pearl, smoothstep(ny * 0.6 + 0.5)) }, { p: [Math.cos(a) * R * 0.98, H + 0.62, Math.sin(a) * R * 0.98] }, 12, 8);
    // Edelsteine im Reif
    const gc = [ST.ruby, ST.sapphire, ST.emerald, ST.sapphire, ST.emerald][i];
    gem.add(new THREE.SphereGeometry(1, 12, 8), { v: (x, y) => mix(gc, 0xffffff, smoothstep(y * 0.8 + 0.2) * 0.45) }, placed(n.clone().multiplyScalar(R * 1.03).setY(H * 0.45), n, new THREE.Vector3(0.11, 0.13, 0.06)));
    au.add(new THREE.TorusGeometry(0.13, 0.025, 5, 16), ST.goldHi, placed(n.clone().multiplyScalar(R * 1.03).setY(H * 0.45), n, new THREE.Vector3(1, 1.15, 1)));
  }
  // Samthaube innen und Kreuzbügel mit Reichsstern
  b.dome(R * 0.88, { v: (x, y, z, nx, ny) => mix(ST.velvetLow, ST.velvet, smoothstep(ny * 0.6 + 0.3)) }, { p: [0, H * 0.6, 0], s: [1, 0.85, 1] }, Math.PI / 2, 24, 8);
  for (const r of [0, Math.PI / 2]) au.torus(R * 0.86, 0.05, goldV(), { p: [0, H * 0.6, 0], r: [0, r, 0], s: [1, 0.86, 1] }, 5, 24, Math.PI);
  au.sphere(0.16, goldV(), { p: [0, H * 0.6 + R * 0.75 + 0.1, 0] }, 14, 10);
  au.add(puffyStarGeo(0.22, 0.1, 0.1, 0.04), goldV(), { p: [0, H * 0.6 + R * 0.75 + 0.42, 0], r: [0, Math.PI / 2, 0] });
}
function podestGeo() {
  return memo('bonus:podest', () => {
    const b = new Build(), gem = new Build(), au = new Build();
    // Marmorstufe 3,4 (x) × 0,4 × 6,4 (z) und roter Teppich nach +X
    b.add(roundedBox(3.4, 0.4, 6.4, 0.08, SIDE.ALL, 0, 2), marbleV, { p: [0, 0.2, 0] });
    for (const [x, y, len, h] of [[2.8, 0.03, 2.2, 0.06], [1.3, 0.42, 0.82, 0.04]]) {
      b.box(len, h, 1.2, { v: (px, py, pz, nx, ny) => mix(ST.velvetLow, ST.velvet, smoothstep(ny * 0.5 + 0.5)) }, { p: [x, y, 0] }, 0.015, 1);
      for (const sz of [1, -1]) au.box(len, h + 0.01, 0.1, goldV(), { p: [x, y, sz * 0.65] }, 0.01, 1);
    }
    // drei Treppchen (Gold mit dunklerem Sockel), Sterne vorn
    const steps = [[0, 1.6, 3], [-1.85, 1.1, 2], [1.85, 0.75, 1]];
    for (const [z, h, n] of steps) {
      au.add(roundedBox(1.8, h, 1.8, 0.1, SIDE.ALL, 0, 2), goldV(), { p: [0, 0.4 + h / 2, z] });
      au.add(roundedBox(1.9, 0.14, 1.9, 0.05, SIDE.ALL, 0, 1), goldV(ST.goldLow, ST.gold), { p: [0, 0.47, z] });
      au.add(roundedBox(1.86, 0.1, 1.86, 0.04, SIDE.ALL, 0, 1), goldV(), { p: [0, 0.4 + h - 0.02, z] });
      for (let k = 0; k < n; k++) {
        const g = puffyStarGeo(0.2, 0.09, 0.07, 0.03);
        g.rotateY(Math.PI / 2);
        b.add(g, { v: (x, y) => mix(0xffffff, 0xfff4c0, smoothstep(y * 2 + 0.5)) }, { p: [0.92, 0.4 + h * 0.55, z + (k - (n - 1) / 2) * 0.46] });
      }
    }
    // Samtkissen mit Quasten auf der Mitte, Krone darauf
    const top = 0.4 + 1.6;
    b.add(roundedBox(1.3, 0.3, 1.3, 0.14, SIDE.ALL, 0, 3), { v: (x, y, z, nx, ny) => mix(ST.velvetLow, ST.velvetHi, smoothstep(ny * 0.5 + 0.45)) }, { p: [0, top + 0.15, 0] });
    for (const sx of [1, -1]) for (const sz of [1, -1]) { au.sphere(0.07, ST.gold, { p: [sx * 0.6, top + 0.22, sz * 0.6] }, 8, 6); au.cyl(0.02, 0.06, 0.22, ST.gold, { p: [sx * 0.66, top + 0.1, sz * 0.66] }, 6); }
    const cb = new Build(), cg = new Build(), ca = new Build();
    crownParts(cb, cg, ca);
    const crownY = top + 0.28;
    for (const [src, dst] of [[cb, b], [cg, gem], [ca, au]]) { const g = src.geometry(); g.translate(0, crownY, 0); dst.parts.push(g); }
    return { body: b.geometry(), gem: gem.geometry(), gold: au.geometry(), crownY };
  });
}
function buildKronePodest(opts = {}) {
  const S = clamp(num(opts.size, 1), 0.1, 20);
  const G = podestGeo();
  const root = new THREE.Group();
  const own = [];
  const sj = joint(); sj.scale.setScalar(S);
  const body = mesh(G.body, kulS(0.45), {}, true);
  body.receiveShadow = true;
  const goldM = mesh(G.gold, kulGold(), {}, true);
  goldM.receiveShadow = true;
  const gems = mesh(G.gem, kulS(0.1), {}, false);
  const sps = [0, 1, 2].map((i) => { const s = sparkleSprite(0xffffff, 0.7); s.position.set(0.6 - i * 0.4, G.crownY + 0.8 + (i % 2) * 0.5, (i - 1) * 0.6); sj.add(s); return s; });
  const halo = glowSprite(0xfff0a0, 3.5, 0.3); halo.material = halo.material.clone(); own.push(halo.material);
  halo.position.set(0, G.crownY + 0.8, 0);
  sj.add(body, goldM, gems, halo);
  root.add(sj);
  root.userData.crown = new THREE.Vector3(0, (G.crownY + 0.75) * S, 0);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const on = st.sparkle !== false;
    sps.forEach((s, i) => { const ph = (clk.t * 0.7 + i / 3) % 1; s.visible = on && ph < 0.3; s.scale.setScalar(Math.max(0.001, Math.sin(ph / 0.3 * Math.PI)) * 0.8); });
    halo.visible = on;
    halo.material.opacity = 0.25 + Math.sin(clk.t * 2) * 0.06;
  };
  return makeModel('krone_podest', root, update, own);
}

// =============================================================================================
// Pokal
// =============================================================================================
function pokalGeo() {
  return memo('bonus:pokal', () => {
    const b = new Build(), gem = new Build(), au = new Build();
    // achteckiger Marmorsockel mit Goldkanten und Sternplakette
    b.cyl(0.7, 0.78, 0.55, marbleV, { p: [0, 0.275, 0], r: [0, Math.PI / 8, 0] }, 8);
    au.cyl(0.74, 0.74, 0.07, goldV(), { p: [0, 0.56, 0], r: [0, Math.PI / 8, 0] }, 8);
    au.cyl(0.82, 0.82, 0.06, goldV(), { p: [0, 0.03, 0], r: [0, Math.PI / 8, 0] }, 8);
    const pl = puffyGeo(roundRectShape(0.6, 0.32, 0.06), 0.03, 0.015, 4, 1); pl.rotateY(Math.PI / 2);
    au.add(pl, goldV(), { p: [0.68, 0.28, 0] });
    const ps = puffyStarGeo(0.11, 0.05, 0.04, 0.015); ps.rotateY(Math.PI / 2);
    b.add(ps, ST.white, { p: [0.71, 0.28, 0] });
    // Goldfuß mit Knauf und Schale
    au.lathe([[0, 0.6], [0.45, 0.6], [0.42, 0.68], [0.2, 0.78], [0.12, 0.95], [0.11, 1.15], [0.2, 1.22], [0.22, 1.3], [0.12, 1.38], [0.13, 1.55], [0.3, 1.62], [0.55, 1.78], [0.72, 2.05], [0.78, 2.35], [0.76, 2.62], [0.82, 2.7], [0.78, 2.74], [0.68, 2.64], [0, 2.6]], goldV(), null, 40, 2);
    // Henkel (Schwingen)
    for (const s of [1, -1]) {
      const pts = [[0, 2.5, s * 0.74], [0, 2.62, s * 1.12], [0, 2.3, s * 1.28], [0, 1.95, s * 1.1], [0, 1.8, s * 0.6]];
      au.add(taperTube(pts, (t) => 0.07 * (1 - Math.sin(t * Math.PI) * 0.3), 28, 8), goldV());
      au.sphere(0.09, ST.goldHi, { p: [0, 2.62, s * 1.12] }, 10, 8);
    }
    // Sternwappen vorn
    const wg = puffyGeo(roundRectShape(0.5, 0.5, 0.2), 0.04, 0.02, 6, 2); wg.rotateY(Math.PI / 2);
    b.add(wg, { v: (x, y) => mix(0x1a3aa8, 0x4a8aff, smoothstep(y * 2 + 0.5)) }, { p: [0.74, 2.2, 0], r: [0, 0, 0.18] });
    const sg = puffyStarGeo(0.17, 0.08, 0.05, 0.02); sg.rotateY(Math.PI / 2);
    au.add(sg, goldV(), { p: [0.79, 2.21, 0], r: [0, 0, 0.18] });
    // Deckel mit Goldstern
    au.lathe([[0, 2.74], [0.74, 2.74], [0.7, 2.8], [0.45, 2.92], [0.18, 3.0], [0.1, 3.08], [0, 3.1]], goldV(), null, 32, 2);
    const st = puffyStarGeo(0.24, 0.11, 0.12, 0.05); st.rotateY(Math.PI / 2);
    au.add(st, goldV(), { p: [0, 3.34, 0] });
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + Math.PI / 4; gem.add(new THREE.SphereGeometry(1, 10, 6), [ST.ruby, ST.sapphire, ST.emerald, ST.ruby][i], placed(new THREE.Vector3(Math.cos(a) * 0.79, 2.42, Math.sin(a) * 0.79), new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), new THREE.Vector3(0.07, 0.07, 0.04))); }
    return { body: b.geometry(), gem: gem.geometry(), gold: au.geometry() };
  });
}
function buildPokal(opts = {}) {
  const S = clamp(num(opts.size, 3), 0.2, 60) / 3.5;
  const G = pokalGeo();
  const root = new THREE.Group();
  const own = [];
  const sj = joint(); sj.scale.setScalar(S);
  sj.add(mesh(G.body, kulS(0.45), {}, true), mesh(G.gold, kulGold(), {}, true), mesh(G.gem, kulS(0.1), {}, false));
  const sps = [0, 1].map((i) => { const s = sparkleSprite(0xffffff, 0.6); s.position.set(0.7, 2.6 - i * 0.8, (i ? -1 : 1) * 0.5); sj.add(s); return s; });
  root.add(sj);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const on = st.sparkle !== false;
    sps.forEach((s, i) => { const ph = (clk.t * 0.6 + i * 0.5) % 1; s.visible = on && ph < 0.3; s.scale.setScalar(Math.max(0.001, Math.sin(ph / 0.3 * Math.PI)) * 0.7); });
  };
  void own;
  return makeModel('pokal_gross', root, update, own);
}

export const MODELS = {
  krone_podest: buildKronePodest,
  pokal_gross: buildPokal,
};
