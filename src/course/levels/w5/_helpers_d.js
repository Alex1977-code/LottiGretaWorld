// Hilfen für die Welt-5-Level 5-7 „Auf Zehenspitzen durch die Glutfestung“, 5-Zug „Bimmelbahn voller Bitcoins“ und
// 5-Burg „Rumpeltempel des Kippquader-Königs“ (kein Level: exportiert kein LEVEL, die Level-Registry überspringt dieses
// Modul). Nur für diese drei Level – andere Welt-5-Level haben eigene Hilfsdateien. Gemeinsame Dateien werden nicht
// verändert; alles Level-Lokale hängt sich über die offiziellen Aufbau-Haken an (LEVEL.prebuild / LEVEL.build /
// LEVEL.setup, Präzisierung „Leistung und Level-Haken 2“) und über level.onStep / view.onFrame.
//
//   1) Daten-Helfer     Inseln, Münzspuren, Dächer (Unterstände) als Bausteine
//   2) Glutfestung 5-7  festungsKulisse (Lavasee, Burgboden, Festungsmauern, Türme, Fackeln, Banner, Ketten, Glut,
//                       Alarmlampen, Markisen), rissWand (Riss in der grauen Mauer, Hinweis-Glitzer), kletterRaum
//                       (Rätselraum: Steinblöcke kommen beim Wiederbetreten zurück), steinStern (Stern im Steinblock),
//                       schleichZaehler (Entdeckungen je Scheinwerfer, für Tests und Ansagen)
//   3) Goldzug 5-Zug    siehe unten (Wagenreihe, Fahrplan, Goldschalter im Felswagen, Wolkenwagen, Glückshaus, Küste)
//   4) Tempel 5-Burg    siehe unten (Lochstern, Tempel-Kulisse, Baron-Szene)
// Statische Teile gehen über addStatic in die Abschnitts-Meshes (keine zusätzlichen Zeichenaufrufe), belebte
// Kleinigkeiten sind je ein Mesh bzw. eine Instanz-Gruppe ohne Sonnenschatten.

import * as THREE from 'three';
import { colorize, merge, lin, mixc, smooth, hex, addStatic, addObject, Rnd } from '../../blocks/kit.js';
import { bakeModel, figures } from '../../blocks/w2kit.js';
import { banner as hudBanner } from '../../blocks/w3kit.js';
import { runAction, visDt } from '../../entities/gimmick.js';
import { glowTexture } from '../../blocks/w4kit.js';
import { getModel, hasModel } from '../../models/index.js';
import {
  lavaSee, lavaFaelle, glutSaum, burgBoden, tuerme, fackeln, banner, ketten, funkenFlug, glowPoints, bakeParts, blk, cyl,
  sph, cone, quadG,
} from '../w4/_helpers_d.js';

export { lavaSee, lavaFaelle, glutSaum, burgBoden, tuerme, fackeln, banner, ketten, funkenFlug, glowPoints, bakeParts, blk, cyl, sph, cone, quadG };

const TAU = Math.PI * 2;
const L = (c) => lin(hex(c));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// =====================================================================================================================
// 1) Daten-Helfer
// =====================================================================================================================

/** Insel über ihre Grundfläche x0..x1, zA..zB (Reihenfolge egal), Oberseite top, Höhe h; o: weitere Felder. */
export function isl(x0, x1, zA, zB, top, h = 6, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  return { type: 'island', pos: [(x0 + x1) / 2, top - h, (z0 + z1) / 2], size: [x1 - x0, h, z0 - z1], top: 'stone', under: 0, ...o };
}
/** Münzreihe von a nach b. */
export const line = (a, b, n) => ({ kind: 'coins', from: a, to: b, n });
/** Münzring um c. */
export const ring = (c, r, n) => ({ kind: 'coins', pos: c, r, n });
/** Münzbogen von a nach b mit Scheitel h (n Münzen). */
export function arc(a, b, n, h) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    out.push({ kind: 'coin', pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * h * t * (1 - t), a[2] + (b[2] - a[2]) * t] });
  }
  return out;
}

/**
 * Unterstand (Markisen-Dach auf Pfosten): Pfosten als Bausteine (wall) – das Dach selbst baut daecher() im Aufbau-Haken
 * (Durchsicht, gestreiftes Tuch). r = { x0, x1, zA, zB, floor, h: 2.6, posts: 'corners' | [[x, z], …] | 'none', colors }.
 * Liefert die Pfosten-Bausteine; roof(r) liefert den Eintrag für daecher().
 */
export function pfosten(r) {
  const z0 = Math.max(r.zA, r.zB), z1 = Math.min(r.zA, r.zB), ins = 0.3, h = r.h ?? 2.6;
  let posts = r.posts ?? 'corners';
  if (posts === 'corners') posts = [[r.x0 + ins, z0 - ins], [r.x1 - ins, z0 - ins], [r.x0 + ins, z1 + ins], [r.x1 - ins, z1 + ins]];
  else if (posts === 'none') posts = [];
  return posts.map(([px, pz]) => ({ type: 'wall', pos: [px, r.floor, pz], size: [0.36, h, 0.36], style: 'stone' }));
}
export const roof = (r) => ({ x0: r.x0, x1: r.x1, zA: r.zA, zB: r.zB, y: r.floor + (r.h ?? 2.6), colors: r.colors });

// =====================================================================================================================
// 2) Glutfestung (5-7)
// =====================================================================================================================

/**
 * Markisen-Dächer (Unterstände) mit Durchsicht: je Dach eine Kollisionsform (begehbar, camIgnore – die Kamera rückt nicht
 * davor) und ein eigenes Mesh, das weich durchscheinend wird, solange es die Figur verdeckt (view.xray) – unter dem Dach
 * sieht man die Heldin. Oben gestreiftes Tuch, ringsum Zackenbehang, Holzrahmen. Das Dach verdeckt die Figur vor den
 * Suchscheinwerfern (feste Form zwischen Lampe und Figur). list [{ x0, x1, zA, zB, y (Unterkante), colors: [a, b],
 * thick: 0.35, valance: true }]; Pfosten liefert dach() (Bausteine).
 */
export function daecher(level, list) {
  for (const d of list) {
    const x0 = Math.min(d.x0, d.x1), x1 = Math.max(d.x0, d.x1), z0 = Math.min(d.zA, d.zB), z1 = Math.max(d.zA, d.zB);
    const th = d.thick ?? 0.35, y = d.y;
    level.world.add({ type: 'box', min: [x0, y, z0], max: [x1, y + th, z1], camIgnore: true, tag: 'dach' });
    if (!level.view) continue;
    const [ca, cb] = (d.colors ?? [0xd8283a, 0xfff2e0]).map(L);
    const wood = L(0x6a4428), woodHi = L(0x9a6a40);
    const parts = [];
    const W = x1 - x0, D = z1 - z0, alongX = W >= D;
    // Rahmen (Holz)
    const frame = blk(W + 0.12, th * 0.55, D + 0.12, (x0 + x1) / 2, y, (z0 + z1) / 2, 0x6a4428, { top: 0x8a5a34 });
    parts.push(frame);
    // gestreiftes Tuch obenauf, leicht gewölbt (Streifen quer zur längeren Seite)
    const n = Math.max(2, Math.round((alongX ? W : D) / 0.55));
    for (let i = 0; i < n; i++) {
      const a = i / n, b = (i + 1) / n;
      const col = i % 2 ? cb : ca;
      const nx = alongX ? 1 : Math.max(2, Math.round(W / 0.6)), nz = alongX ? Math.max(2, Math.round(D / 0.6)) : 1;
      const g = new THREE.PlaneGeometry(alongX ? W / n : W, alongX ? D : D / n, nx, nz).toNonIndexed();
      g.rotateX(-Math.PI / 2);
      const cx = alongX ? x0 + (a + b) / 2 * W : (x0 + x1) / 2, cz = alongX ? (z0 + z1) / 2 : z0 + (a + b) / 2 * D;
      g.translate(cx, 0, cz);
      const pos = g.attributes.position;
      for (let k = 0; k < pos.count; k++) {
        const px = pos.getX(k), pz = pos.getZ(k);
        const u = alongX ? (pz - z0) / D : (px - x0) / W;
        pos.setY(k, y + th + 0.02 + Math.sin(u * Math.PI) * 0.22);
      }
      g.computeVertexNormals();
      colorize(g, (p, nrm, o) => { const k = 0.86 + 0.14 * nrm.y; o[0] = col[0] * k; o[1] = col[1] * k; o[2] = col[2] * k; });
      parts.push(g);
    }
    // Zackenbehang an allen vier Kanten
    if (d.valance !== false) {
      const edges = [[x0, z1, x1, z1, 0, 1], [x1, z0, x0, z0, 0, -1], [x1, z1, x1, z0, 1, 0], [x0, z0, x0, z1, -1, 0]];
      for (const [ax, az, bx, bz, ox, oz] of edges) {
        const len = Math.hypot(bx - ax, bz - az), m = Math.max(2, Math.round(len / 0.45));
        for (let i = 0; i < m; i++) {
          const t0 = i / m, t1 = (i + 1) / m, tm = (t0 + t1) / 2;
          const p0 = [ax + (bx - ax) * t0 + ox * 0.07, y + th, az + (bz - az) * t0 + oz * 0.07];
          const p1 = [ax + (bx - ax) * t1 + ox * 0.07, y + th, az + (bz - az) * t1 + oz * 0.07];
          const pm = [ax + (bx - ax) * tm + ox * 0.07, y + th - 0.36, az + (bz - az) * tm + oz * 0.07];
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.Float32BufferAttribute([...p0, ...pm, ...p1, ...p1, ...pm, ...p0], 3));
          g.setAttribute('normal', new THREE.Float32BufferAttribute([ox, 0.3, oz, ox, 0.3, oz, ox, 0.3, oz, -ox, 0.3, -oz, -ox, 0.3, -oz, -ox, 0.3, -oz], 3));
          const c = i % 2 ? cb : ca;
          g.setAttribute('color', new THREE.Float32BufferAttribute([0, 1, 2, 3, 4, 5].flatMap(() => c), 3));
          parts.push(g);
        }
      }
    }
    void wood; void woodHi;
    const mesh = new THREE.Mesh(merge(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, side: THREE.DoubleSide }));
    mesh.name = 'markisendach';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    addObject(level, mesh);
    level.view.xray(mesh, new THREE.Box3(new THREE.Vector3(x0 - 0.1, y - 0.4, z0 - 0.1), new THREE.Vector3(x1 + 0.1, y + th + 0.3, z1 + 0.1)), { min: 0.22 });
  }
}

/**
 * Burghof-Pflaster (Oberseiten der Inseln): Steinplatten in Reihen (je Platte eigene Tönung aus palette), dunkle Fugen,
 * Randsteine, ein heller Mittelweg (path: [x0, x1]) und wenige glühende Risse. list [{ x0, x1, zA, zB, y, path, cracks }].
 */
export function hofPflaster(level, list, o = {}) {
  const parts = [], glow = [];
  const rnd = new Rnd(o.seed ?? 2207);
  const pal = (o.palette ?? [0x6a6090, 0x5e5684, 0x726a98, 0x645a7e, 0x7a6e94, 0x585074]).map(L);
  const warm = (o.warm ?? [0xa08a7a, 0x9a8270, 0xb09a84]).map(L);
  const mortar = L(o.mortar ?? 0x2a2438), rim = L(0x4a4260), rimHi = L(0x5e5478);
  for (const f of list) {
    const x0 = Math.min(f.x0, f.x1), x1 = Math.max(f.x0, f.x1), z0 = Math.min(f.zA, f.zB), z1 = Math.max(f.zA, f.zB);
    const y = f.y;
    const pos = [], col = [];
    const quad = (ax, bx, az, bz, c, dy) => {
      const q = [[ax, y + dy, az], [ax, y + dy, bz], [bx, y + dy, bz], [bx, y + dy, az]];
      for (const k of [0, 1, 2, 0, 2, 3]) { pos.push(...q[k]); col.push(c[0], c[1], c[2]); }
    };
    quad(x0, x1, z0, z1, mortar, 0.006);
    const fr = 0.5;
    for (const [ax, bx, az, bz] of [[x0, x1, z1 - fr, z1], [x0, x1, z0, z0 + fr], [x0, x0 + fr, z0 + fr, z1 - fr], [x1 - fr, x1, z0 + fr, z1 - fr]]) {
      const alongX = bx - ax > bz - az, len = alongX ? bx - ax : bz - az, n = Math.max(1, Math.round(len / 1.2));
      for (let i = 0; i < n; i++) {
        const c = i % 2 ? rim : rimHi;
        if (alongX) quad(ax + (i / n) * len + 0.03, ax + ((i + 1) / n) * len - 0.03, az + 0.03, bz - 0.03, c, 0.014);
        else quad(ax + 0.03, bx - 0.03, az + (i / n) * len + 0.03, az + ((i + 1) / n) * len - 0.03, c, 0.014);
      }
    }
    const [px0, px1] = f.path ?? [1e9, -1e9];
    for (let z = z0 + fr, r = 0; z < z1 - fr - 1e-3; z += 0.85, r++) {
      const zb = Math.min(z1 - fr, z + 0.85);
      let x = x0 + fr - (r % 2) * 0.5;
      while (x < x1 - fr - 1e-3) {
        const w = 0.75 + rnd.frac() * 0.7;
        const ax = Math.max(x0 + fr, x), bx = Math.min(x1 - fr, x + w);
        if (bx - ax > 0.12) {
          const mid = (ax + bx) / 2;
          const onPath = mid > px0 && mid < px1;
          const c = onPath ? warm[Math.floor(rnd.frac() * warm.length)] : pal[Math.floor(rnd.frac() * pal.length)];
          const k = 0.9 + rnd.frac() * 0.16;
          quad(ax + 0.035, bx - 0.035, z + 0.035, zb - 0.035, [c[0] * k, c[1] * k, c[2] * k], 0.014);
        }
        x += w;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(0).flatMap(() => [0, 1, 0]), 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    parts.push(g);
    const nc = f.cracks ?? 1;
    for (let i = 0; i < nc; i++) {
      let x = rnd.real(x0 + 1.2, x1 - 1.2), z = rnd.real(z0 + 1.2, z1 - 1.2);
      const pp = [], cc = [];
      const hot = L(0xffb040), red = L(0xff5010);
      for (let s2 = 0; s2 < 4; s2++) {
        const x2 = x + rnd.real(-0.7, 0.7), z2 = z + rnd.real(-0.9, -0.4), w = 0.06 * (1 - s2 / 4) + 0.025;
        const q = [[x - w, y + 0.02, z], [x2 - w * 0.6, y + 0.02, z2], [x2 + w * 0.6, y + 0.02, z2], [x + w, y + 0.02, z]];
        for (const k of [0, 1, 2, 0, 2, 3]) { pp.push(...q[k]); const c2 = k === 1 || k === 2 ? red : hot; cc.push(c2[0], c2[1], c2[2]); }
        x = x2; z = z2;
      }
      const gg = new THREE.BufferGeometry();
      gg.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3));
      gg.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pp.length / 3).fill(0).flatMap(() => [0, 1, 0]), 3));
      gg.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3));
      glow.push(gg);
    }
  }
  bakeParts(level, parts, { castShadow: false });
  bakeParts(level, glow, { material: 'glow', castShadow: false });
}

/** Laternenlicht (Thema mit lanternLight, z. B. sneak): warme Lichtpfützen an Fackeln/Feuerschalen. */
export function laternen(level, pts) {
  for (const [x, y, z] of pts) level.view?.addLantern(x, y, z);
}

/**
 * Festungsmauer aus schiefer-lila Quadern (eigene, sparsame Geometrie: Körper, Quader-Bild auf beiden Längsseiten als
 * flache Vierecke mit Fugen, Mauerkrone, Zinnen, Moosflecken unten, glühende Schießscharten) – in die statische Geometrie
 * gebacken, ohne Sonnenschatten. list [{ from: [x, y, z], to: [x, y, z] (gleiches x oder z), height: 4, thick: 1,
 * zinnen: true, slits: true, solid: true, camIgnore: true }]. Kollision als Quader (bis über die Zinnen).
 */
export function festungsMauern(level, list) {
  const parts = [], glow = [];
  const rnd = new Rnd(4242);
  const pal = [0x5a547e, 0x4e4870, 0x66608c, 0x544e78, 0x5e5684].map(L);
  const mortar = 0x221e34, cap = 0x6e6890, moss = L(0x4a7a36);
  for (const it of list) {
    const a = it.from, b = it.to;
    const alongX = Math.abs(b[0] - a[0]) >= Math.abs(b[2] - a[2]);
    const len = alongX ? Math.abs(b[0] - a[0]) : Math.abs(b[2] - a[2]);
    const H = it.height ?? 4, T = it.thick ?? 1, y0 = a[1];
    const cx = (a[0] + b[0]) / 2, cz = (a[2] + b[2]) / 2;
    const w = alongX ? len : T, d = alongX ? T : len;
    parts.push(blk(w, H, d, cx, y0, cz, mortar));
    parts.push(blk(w + (alongX ? 0.04 : 0.24), 0.2, d + (alongX ? 0.24 : 0.04), cx, y0 + H - 0.04, cz, cap, { top: 0x8a84a8 }));
    // Quader-Bild auf beiden Längsseiten (Reihen 0,62 m, Quader 1,0–1,5 m, versetzt)
    for (const side of [1, -1]) {
      const pos = [], col = [], nor = [];
      const off = (alongX ? T : T) / 2 + 0.012;
      const P = (u, v) => (alongX ? [cx - len / 2 + u, y0 + v, cz + side * off] : [cx + side * off, y0 + v, cz - len / 2 + u]);
      const N = alongX ? [0, 0, side] : [side, 0, 0];
      const rowH = 0.62;
      for (let r = 0; r * rowH < H - 0.25; r++) {
        const v0 = r * rowH, v1 = Math.min(H - 0.2, v0 + rowH);
        let u = -(r % 2) * 0.55;
        while (u < len - 1e-3) {
          const bw = 1.0 + rnd.frac() * 0.5;
          const u0 = Math.max(0, u), u1 = Math.min(len, u + bw);
          if (u1 - u0 > 0.1) {
            const c = pal[Math.floor(rnd.frac() * pal.length)], k = 0.9 + rnd.frac() * 0.2;
            const cc = r === 0 && rnd.frac() < 0.5 ? mixc(c, moss, 0.55, [0, 0, 0]) : [c[0] * k, c[1] * k, c[2] * k];
            const g = 0.03;
            let q = [P(u0 + g, v0 + g), P(u1 - g, v0 + g), P(u1 - g, v1 - g), P(u0 + g, v1 - g)];
            if ((side > 0) !== alongX) q = [q[1], q[0], q[3], q[2]];
            for (const k2 of [0, 1, 2, 0, 2, 3]) { pos.push(...q[k2]); col.push(...cc); nor.push(...N); }
          }
          u += bw;
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      parts.push(g);
      // glühende Schießscharten
      if (it.slits !== false && H >= 4) {
        const m = Math.max(1, Math.floor(len / 6));
        for (let i = 0; i < m; i++) {
          const u = ((i + 0.5) / m) * len;
          const [sx, , sz] = P(u, 0);
          const f = alongX ? (side > 0 ? '+z' : '-z') : (side > 0 ? '+x' : '-x');
          glow.push(quadG(sx + (alongX ? 0 : side * 0.02), y0 + H * 0.5, sz + (alongX ? side * 0.02 : 0), 0.26, 0.9, f, [L(0xff6a10), L(0xff6a10), L(0xffd060), L(0xffd060)]));
        }
      }
    }
    // Zinnen
    if (it.zinnen !== false) {
      const m = Math.max(1, Math.round(len / 1.3));
      for (let i = 0; i < m; i++) {
        const u = (i + 0.5) / m;
        const mx = alongX ? a[0] + (b[0] - a[0]) * u : cx, mz = alongX ? cz : a[2] + (b[2] - a[2]) * u;
        parts.push(blk(alongX ? (len / m) * 0.58 : T * 0.92, 0.75, alongX ? T * 0.92 : (len / m) * 0.58, mx, y0 + H + 0.16, mz, [0x5a547e, 0x524c74, 0x625c88][i % 3], { top: 0x7a74a0 }));
      }
    }
    if (it.solid !== false) {
      const xs = alongX ? [Math.min(a[0], b[0]), Math.max(a[0], b[0])] : [a[0] - T / 2, a[0] + T / 2];
      const zs = alongX ? [a[2] - T / 2, a[2] + T / 2] : [Math.min(a[2], b[2]), Math.max(a[2], b[2])];
      level.world.add({ type: 'box', min: [xs[0], y0, zs[0]], max: [xs[1], y0 + H + (it.zinnen === false ? 0 : 0.9), zs[1]], camIgnore: it.camIgnore ?? true, tag: 'festungsmauer' });
    }
  }
  bakeParts(level, parts, { castShadow: false });
  bakeParts(level, glow, { material: 'glow', castShadow: false });
}

/**
 * Budget der Suchscheinwerfer: Lichtkegel und -fleck zeichnet der Baustein ohne Sichtprüfung (je Licht 3 Aufrufe, der
 * doppelseitige Kegel zweimal) – hier zeichnen nur Lichter, deren Fleck oder Lampe nahe am Blickziel liegt (near m), und
 * der Kegel in einem Durchgang. Nur Darstellung (Erkennen, Alarm, Bahn laufen weiter).
 */
export function scheinwerferSparen(level, near = 42) {
  const v = level.view;
  if (!v) return;
  const groups = [];
  v.three.traverse((o) => {
    if (!o.isGroup || o.children.length < 3) return;
    const cone = o.children.find((c) => c.isMesh && c.geometry?.type === 'ConeGeometry' && c.material?.isMeshBasicMaterial && c.renderOrder === 4);
    const spot = o.children.find((c) => c.isMesh && c.geometry?.type === 'CircleGeometry' && c.renderOrder === 3);
    if (!cone || !spot) return;
    cone.material.forceSinglePass = true;
    groups.push({ g: o, cone, spot });
  });
  level._scheinwerfer = groups.length;
  v.onFrame(() => {
    const t = v.rig?.target ?? level.player?.pos;
    if (!t) return;
    for (const q of groups) {
      const sx = q.spot.position.x, sz = q.spot.position.z, lx = q.cone.position.x, lz = q.cone.position.z;
      q.g.visible = Math.hypot(sx - t.x, sz - t.z) < near || Math.hypot(lx - t.x, lz - t.z) < near;
    }
  });
}

/** Gestreifte Markisen an den Vorderkanten der Unterstände (nur Optik, in die statische Geometrie): list [{ x0, x1, z
 *  (Vorderkante), y (Dach-Unterkante), colors: [a, b], depth: 0.7, face: +1 (zur Kamera) }]. */
export function markisen(level, list) {
  const parts = [];
  for (const m of list) {
    const [ca, cb] = (m.colors ?? [0xd8283a, 0xfff2e0]).map(L);
    const n = Math.max(2, Math.round((m.x1 - m.x0) / 0.5));
    const w = (m.x1 - m.x0) / n, dep = m.depth ?? 0.7, f = m.face ?? 1;
    for (let i = 0; i < n; i++) {
      const g = new THREE.PlaneGeometry(w, dep, 1, 2).toNonIndexed();
      g.rotateX(-Math.PI / 2 + f * 0.75);
      const col = i % 2 ? cb : ca;
      colorize(g, (p, nrm, o) => { o[0] = col[0]; o[1] = col[1]; o[2] = col[2]; });
      g.translate(m.x0 + (i + 0.5) * w, m.y + 0.18 - Math.sin(0.75) * dep * 0.5, m.z + f * Math.cos(0.75) * dep * 0.5);
      parts.push(g);
      // Bogenkante (Zacken)
      const tri = new THREE.CircleGeometry(w * 0.5, 6, Math.PI, Math.PI).toNonIndexed();
      colorize(tri, (p, nrm, o) => { o[0] = col[0]; o[1] = col[1]; o[2] = col[2]; });
      tri.translate(m.x0 + (i + 0.5) * w, m.y + 0.18 - Math.sin(0.75) * dep, m.z + f * Math.cos(0.75) * dep + f * 0.01);
      if (f < 0) tri.rotateY(0);
      parts.push(tri);
    }
  }
  if (parts.length) bakeParts(level, parts, { castShadow: false });
}

/**
 * Alarmlampen (Registry-Modell 'alarmlampe', Ursprung = Wandpunkt, ragt nach +X) an den Festungswänden: sie blinken rot,
 * solange ein Suchscheinwerfer in der Nähe (≤ r m) Alarm gibt. list [{ pos: [x, y, z], yaw, r: 22 }]. Ohne Modell nichts.
 */
export function alarmLampen(level, list) {
  if (!level.view || !hasModel('alarmlampe')) return;
  for (const it of list) {
    const m = getModel('alarmlampe', {});
    m.root.name = 'alarmlampe';
    m.root.position.set(it.pos[0], it.pos[1], it.pos[2]);
    m.root.rotation.y = it.yaw ?? 0;
    m.root.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    const r2 = (it.r ?? 22) ** 2;
    const holder = {};
    addObject(level, m.root, (dt) => {
      const d = visDt(level, holder, dt);
      // nur in der Nähe der Figur zeichnen (je Lampe 3–4 Aufrufe)
      const pl = level.player;
      m.root.visible = !pl || Math.hypot(pl.pos.x - it.pos[0], pl.pos.z - it.pos[2]) < (it.near ?? 26);
      if (!m.root.visible) return;
      let a = 0;
      for (const s of level.searchlights ?? []) {
        if (!s.alarm) continue;
        const dx = s.lamp.x - it.pos[0], dz = s.lamp.z - it.pos[2];
        if (dx * dx + dz * dz < r2) { a = 1; break; }
      }
      m.update(d, { alarm: a });
    });
  }
}

/**
 * Riss in einer grauen Blockwand (megawall, Kopf mit breaks zerschlägt sie): dunkle Zickzack-Risse und ein feines
 * Staub-Glitzern auf der Vorderseite (Hinweis für Kinder), verschwinden, sobald die Wand bricht.
 * o = { wall: Id der megawall, x, y, z (Mitte der Vorderseite unten), w (Breite entlang der Fläche), h, face: '+x' | '+z' }
 */
export function rissWand(level, o) {
  if (!level.view) return;
  const parts = [];
  const dark = L(0x1a1620), glowC = L(0xffb050);
  const rnd = new Rnd(o.seed ?? 77);
  const P = (u, v, off = 0.04) => (o.face === '+z' ? [o.x - o.w / 2 + u, o.y + v, o.z + off] : [o.x + off, o.y + v, o.z + o.w / 2 - u]);
  const N = o.face === '+z' ? [0, 0, 1] : [1, 0, 0];
  for (let k = 0; k < 3; k++) {
    let u = o.w * (0.25 + 0.25 * k) + rnd.real(-0.3, 0.3), v = 0.2;
    while (v < o.h - 0.3) {
      const u2 = u + rnd.real(-0.45, 0.45), v2 = v + rnd.real(0.35, 0.65), w = 0.07;
      const q = [P(u - w, v), P(u + w, v), P(u2 + w * 0.7, v2), P(u2 - w * 0.7, v2)];
      const pos = [];
      for (const i of [0, 1, 2, 0, 2, 3]) pos.push(...q[i]);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 2, 3, 4, 5].flatMap(() => N), 3));
      const c = v > o.h * 0.5 ? dark : mixc(dark, glowC, 0.25, [0, 0, 0]);
      g.setAttribute('color', new THREE.Float32BufferAttribute([0, 1, 2, 3, 4, 5].flatMap(() => c), 3));
      parts.push(g);
      u = u2; v = v2;
    }
  }
  const mesh = new THREE.Mesh(merge(parts), new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }));
  mesh.name = 'risswand';
  const pts = [];
  for (let i = 0; i < 12; i++) pts.push(P(rnd.real(0.3, o.w - 0.3), rnd.real(0.3, o.h - 0.2), 0.12));
  const sparkle = glowPoints(level, pts, 0xffe6a0, 0.32, { opacity: 0.0, name: 'riss-glitzer' });
  const holder = {};
  let t = 0;
  addObject(level, mesh, (dt) => {
    t += visDt(level, holder, dt);
    const w = level.named.get(o.wall);
    const broken = (w?.broken ?? 0) > 0;
    mesh.visible = !broken;
    if (sparkle) { sparkle.visible = !broken; sparkle.material.opacity = 0.35 + 0.35 * Math.sin(t * 3.1); }
  });
}

/**
 * Rätselraum mit Steinblock-Treppe (5-7 Stern 1): Suchköpfe mit breaks zertrümmern die Blöcke, also schnell hinauf.
 * Betritt die Figur den Raum (area) erneut, solange der Stern fehlt, kommen alle zertrümmerten Blöcke zurück (fairer neuer
 * Versuch); Köpfe im Raum verpuffen dabei. o = { area: [x0, x1, z0, z1], blocks: [[x, y, z], …], star: Index, idPrefix }
 * → Zustand { inside, entries, resets, blocks() } (level._kletterRaum).
 */
export function kletterRaum(level, o) {
  const [x0, x1, z0, z1] = o.area;
  const pre = o.idPrefix ?? 'kr_stein';
  const st = level._kletterRaum = { inside: false, entries: 0, resets: 0, specs: o.blocks.map((p, i) => ({ id: `${pre}${i}`, pos: p })) };
  const inArea = (p) => p.pos.x > x0 && p.pos.x < x1 && p.pos.z > z0 && p.pos.z < z1;
  st.alive = () => st.specs.filter((s) => { const e = level.named.get(s.id); return e && e.alive && !e.removed; }).length;
  level.onStep(() => {
    const p = level.player;
    if (!p) return;
    const inside = !p.dead && inArea(p);
    if (inside && !st.inside) {
      st.entries++;
      const starDone = level.runtime?.stars?.[o.star];
      if (!starDone) {
        let n = 0;
        for (const s of st.specs) {
          const e = level.named.get(s.id);
          if (e && e.alive && !e.removed) continue;
          level.spawn('steinblock', { id: s.id, pos: s.pos });
          n++;
        }
        for (const e of level.entities) if ((e.kind === 'suchkopf' || e.kind === 'projektilkopf') && inArea(e)) e.kill();
        if (n) st.resets++;
      }
    }
    st.inside = inside;
  });
  return st;
}

/** Stern im Steinblock: bricht der Block blockId (Kopf mit breaks, Riesentrank, Bombe), erscheint der versteckte Stern. */
export function steinStern(level, blockId, star) {
  let done = false;
  level.onStep(() => {
    if (done) return;
    const b = level.named.get(blockId);
    if (b && b.alive && !b.removed) return;
    done = true;
    runAction(level, { star }, { pos: b ? [b.pos.x, b.pos.y + 0.6, b.pos.z] : [0, 0, 0] });
    level.sfx('powerup_appear');
  });
}

/**
 * Entdeckungen zählen (alle Suchscheinwerfer des Levels): level._schleich = { alarms, byLight: { id: n }, heads } –
 * für Tests und die Ansage, wenn man einen Hof ganz unentdeckt durchquert hat (zones [{ z0, z1, lights, text }]).
 */
export function schleichZaehler(level, zones = []) {
  const st = level._schleich = { alarms: 0, byLight: {}, heads: 0, praised: [] };
  for (const s of level.searchlights ?? []) {
    const id = [...level.named.entries()].find(([, v]) => v === s)?.[0] ?? `licht${level.searchlights.indexOf(s)}`;
    s.onDetect(() => { st.alarms++; st.byLight[id] = (st.byLight[id] ?? 0) + 1; });
  }
  const seen = new WeakSet();
  const zs = zones.map((z) => ({ ...z, entered: false, done: false, a0: 0 }));
  level.onStep(() => {
    for (const e of level.entities) if (e.kind === 'suchkopf' && !seen.has(e)) { seen.add(e); st.heads++; }
    const p = level.player;
    if (!p || p.dead) return;
    for (const z of zs) {
      if (z.done) continue;
      const inside = p.pos.z < z.z0 && p.pos.z > z.z1;
      if (inside && !z.entered) {
        if (p.pos.z < z.z0 - 3) { z.done = true; continue; }       // mitten hinein versetzt: zählt nicht
        z.entered = true; z.a0 = (z.lights ?? []).reduce((n, id) => n + (st.byLight[id] ?? 0), 0);
      }
      if (z.entered && p.pos.z <= z.z1) {
        z.done = true;
        const a = (z.lights ?? []).reduce((n, id) => n + (st.byLight[id] ?? 0), 0);
        if (a === z.a0) { st.praised.push(z.text); hudBanner(level, z.text ?? 'Unentdeckt!', { color: '#9affc0', size: 16, hold: 1.1 }); level.sfx('coin'); }
      }
    }
  });
  return st;
}

/** Mondlicht-Schimmer: weiche Leuchtpunkte (Glühwürmchen/Lavafunken) über Bereichen; boxes [[x0, x1, z0, z1, y]]. */
export function gluehwuermchen(level, boxes, o = {}) {
  if (!level.view) return null;
  const rnd = new Rnd(o.seed ?? 5);
  const n = o.n ?? 40;
  const P = [];
  for (let i = 0; i < n; i++) {
    const b = boxes[i % boxes.length];
    P.push({ x: rnd.real(b[0], b[1]), z: rnd.real(b[2], b[3]), y: b[4] + rnd.real(0.5, 2.6), a: rnd.real(0, TAU), s: rnd.real(0.4, 1) });
  }
  const arr = new Float32Array(n * 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const m = new THREE.PointsMaterial({ map: glowTexture(), color: o.color ?? 0xb8ff8a, size: o.size ?? 0.22, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  pts.name = 'gluehwuermchen';
  const holder = {};
  let t = 0;
  addObject(level, pts, (dt) => {
    t += visDt(level, holder, dt);
    for (let i = 0; i < n; i++) {
      const q = P[i];
      arr[i * 3] = q.x + Math.sin(t * 0.7 * q.s + q.a) * 0.8;
      arr[i * 3 + 1] = q.y + Math.sin(t * 1.3 * q.s + q.a * 2) * 0.35;
      arr[i * 3 + 2] = q.z + Math.cos(t * 0.6 * q.s + q.a) * 0.8;
    }
    g.attributes.position.needsUpdate = true;
    m.opacity = 0.65 + 0.3 * Math.sin(t * 2.1);
  });
  return pts;
}

export { TAU, clamp, L };
