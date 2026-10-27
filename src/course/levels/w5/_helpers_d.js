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
//   3) Goldzug 5-Zug    Wagenreihe (goldLineUp, goldWagen: Goldwagen/Lok mit Modell goldzug_waggon), Theme-Variante
//                       Goldküste, ohneZeitlimit, ZugGoldschalter (Goldregen aus der Felsspalte), FelsLadung,
//                       WolkenWagen, gluecksHaus (Spielautomat), kuestenKulisse, goldzugSzene (Welt-3-Zug-Hilfen)
//   4) Tempel 5-Burg    siehe unten (Lochstern, Tempel-Kulisse, Baron-Szene)
// Statische Teile gehen über addStatic in die Abschnitts-Meshes (keine zusätzlichen Zeichenaufrufe), belebte
// Kleinigkeiten sind je ein Mesh bzw. eine Instanz-Gruppe ohne Sonnenschatten.

import * as THREE from 'three';
import { colorize, merge, lin, mixc, smooth, hex, addStatic, addObject, Rnd, box } from '../../blocks/kit.js';
import { bakeModel, figures } from '../../blocks/w2kit.js';
import { banner as hudBanner } from '../../blocks/w3kit.js';
import { runAction, visDt, Gimmick, countdown } from '../../entities/gimmick.js';
import { glowTexture } from '../../blocks/w4kit.js';
import { getModel, hasModel } from '../../models/index.js';
import { BEACH_THEME } from '../../view/theme_beach.js';
import { beachSea } from '../../view/backdrop_w5.js';
import { birdFlock, animateBirds } from '../../view/backdrop_w4.js';
import { SlotMachine } from '../../map/slot.js';
import {
  solveTrainRide, ZugRoehre, zugRules, trainCull, StaticCullE, skyDiet, heroShadowDiet, spawnLocal, shadowDiet, trackChunks,
} from '../w3/_helpers_e.js';

export { solveTrainRide, trackChunks };
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

// =====================================================================================================================
// 3) Goldzug (5-Zug)
// =====================================================================================================================
//
// Zug-Koordinate c: Meter entlang des Zugs nach vorn (−Z) ab dem Heck des letzten Wagens, gemessen beim Fahrtbeginn
// (Weltlage z = ZR − c). Das Gleis liegt bei x = 0, der Fensterpfad auch (anders als 3-Zug kein Parallelgleis). Der Zug
// fährt mit VT; das Bildfenster gleitet schneller am Zug entlang nach vorn (Fahrplan mit Halte-Pausen: solveTrainRide
// der Welt-3-Hilfen). Am Ende halten Fenster und Zug gemeinsam am Muschelkap.

export const GZ = { VT: 6, ZP: 30, ZR: 14, ACCEL: 6, BRAKE: 3, GAP: 0.8 };
/** Weltlage (Fahrtbeginn) zu Zug-Koordinate c, seitlich x, Höhe y. */
export const gzP = (c, x = 0, y = 0) => [x, y, GZ.ZR - c];
/** Pfadlänge des Fensterpfads (x = 0, Start bei z = ZP) zu Zug-Koordinate c beim Fahrtbeginn. */
export const gzS = (c) => GZ.ZP - (GZ.ZR - c);
/** Begehbare Oberkanten: Münzberg der Goldwagen, Holzdeck der Flachwagen, Führerhaus-Dach der Lok. */
export const WAGEN_TOP = { gold: 2.9, flach: 1.39, lok: 3.5 };

/** Wagenreihe von hinten nach vorn: cars = [{ id, kind: 'gold' | 'flach' | 'lok', len, parts }] → { list, byId }. */
export function goldLineUp(cars, c0 = 0) {
  const list = [];
  let c = c0;
  for (const car of cars) {
    const len = car.len ?? (car.kind === 'lok' ? 8 : 9);
    const it = { ...car, len, c0: c, c1: c + len, cc: c + len / 2 };
    list.push(it);
    c += len + GZ.GAP;
  }
  return { list, byId: Object.fromEntries(list.map((x) => [x.id, x])) };
}
/** Weltlage (Fahrtbeginn) eines Punkts auf einem Wagen (dc vorn, dx rechts, y über der Schiene). */
export const aufWagen = (car, dc, dx, y) => gzP(car.cc + dc, dx, y);
/** Aufbau auf einem Wagen (Wagen-Koordinaten dc vorn, dx rechts, y Unterkante) → vehicle-part. */
export const teil = (dc, dx, y, size, o = {}) => ({ pos: [dx, y, -dc], size, ...o });

/**
 * Wagen → Baustein vehicle (fährt mit VT, hält nach ride.D Metern). Goldwagen und Lok zeigen das Modell
 * 'goldzug_waggon' (Räder und Dampf über den Zug-Stil 'flach' bzw. 'lok'), Flachwagen das Welt-3-Modell mit Holzdeck.
 * Kollision der Goldwagen und der Lok über eigene unsichtbare Teile (Kasten, Münzberg; Rahmen, Kessel, Führerhaus);
 * über der Kupplungslücke eine unsichtbare Platte auf Höhe der niedrigeren Oberkante (wie 3-Zug).
 */
export function goldWagen(car, ride, next = null) {
  const L2 = car.len / 2;
  const parts = [...(car.parts ?? [])];
  let spec;
  if (car.kind === 'gold') {
    parts.push({ pos: [0, 0.6, 0], size: [3, 1.9, car.len - 0.1], visible: false, tag: 'goldwagen' });
    parts.push({ pos: [0, 2.5, 0], size: [2.7, 0.4, car.len - 0.5], visible: false, tag: 'muenzberg' });
    spec = { style: 'flach', size: [3, WAGEN_TOP.gold, car.len], model: 'goldzug_waggon', modelOpts: { kind: 'wagen', length: car.len }, deck: false };
  } else if (car.kind === 'lok') {
    parts.push({ pos: [0, 0.45, 0], size: [3, 0.81, car.len], visible: false, tag: 'lok:rahmen' });
    parts.push({ pos: [0, 1.26, -0.95], size: [2.0, 1.79, 4.8], visible: false, tag: 'lok:kessel' });
    parts.push({ pos: [0, 1.26, L2 - 1.25], size: [3, 2.24, 2.5], visible: false, tag: 'lok:fuehrerhaus' });
    spec = { style: 'lok', size: [3, WAGEN_TOP.lok, car.len], model: 'goldzug_waggon', modelOpts: { kind: 'lok', length: car.len }, deck: false };
  } else {
    spec = { style: 'flach', size: [3, WAGEN_TOP.flach, car.len] };
  }
  if (next) {
    const back = (k) => (k === 'gold' ? WAGEN_TOP.gold : k === 'lok' ? 1.26 : WAGEN_TOP.flach);
    const front = (k) => (k === 'gold' ? WAGEN_TOP.gold : k === 'lok' ? 3.05 : WAGEN_TOP.flach);
    const y = Math.min(front(car.kind), back(next.kind));
    parts.push({ pos: [0, y - 0.15, -(L2 + GZ.GAP / 2)], size: [2.4, 0.15, GZ.GAP + 0.06], visible: false, tag: 'uebergang' });
  }
  const at = gzS(car.cc);
  return { type: 'vehicle', id: car.id, ...spec, at, speed: GZ.VT, stop: at + ride.D, brake: GZ.BRAKE, offset: [0, 0], parts };
}

/**
 * Lokale Theme-Variante „Goldküste“ (LEVEL.prebuild, wie das Abendrot in 2-Panzer): Thema train (Zugfahrt) im goldenen
 * Spätnachmittag an der Lila Strand-Insel – Himmel von Tiefblau über Pfirsich zu Lila, warmes tiefes Sonnenlicht,
 * Sand statt Schnee (Farben des Strand-Themas), ringsum das Meer mit Lila-Klippen und Segelbooten, Möwen. Das
 * gemeinsame Thema bleibt unverändert.
 */
export function goldkuestenThema(level) {
  const v = level.view;
  if (!v) return null;
  const th = {
    ...BEACH_THEME,
    label: 'Goldküste',
    sky: [[1, 0x2a58c4], [0.5, 0x4c86dc], [0.24, 0x9cc0ee], [0.09, 0xffd2b0], [0.02, 0xffb48a], [0, 0xffc4a0], [-0.1, 0xe6a6c6], [-1, 0x9a76c8]],
    background: 0xf8d8c2,
    fog: { color: 0xf6d6c6, near: 95, far: 340 },
    hemi: { sky: 0xffeedd, ground: 0xd8a070, intensity: 1.42 },
    sun: { color: 0xffd8a2, intensity: 2.8, dir: [-0.5, 0.66, 0.42] },
    buildBackdrop(sky, bounds, rnd) {
      beachSea(sky, bounds, rnd, 0, { y: -0.95 });
      sky.birds = birdFlock(sky, bounds, rnd, { n: 9, color: 0xfff8f0 });
    },
    updateBackdrop(sky, dt) { animateBirds(sky.birds, dt); },
  };
  const k = v.toyLight;
  v.theme = th;
  if (v.three.background?.isColor) v.three.background.set(th.background);
  if (v.three.fog) { v.three.fog.color.set(th.fog.color); v.three.fog.near = th.fog.near; v.three.fog.far = th.fog.far; }
  if (v.hemi) { v.hemi.color.set(th.hemi.sky); v.hemi.groundColor.set(th.hemi.ground); v.hemi.intensity = th.hemi.intensity * (k?.hemi ?? 1); }
  if (v.sun) { v.sun.color.set(th.sun.color); v.sun.intensity = th.sun.intensity * (k?.sun ?? 1); }
  v.sunDir?.set(...th.sun.dir).normalize();
  const sky = v.sky;
  if (sky) {
    sky.theme = th;
    if (sky.domeGroup) sky.group.remove(sky.domeGroup);
    sky.buildDome();
  }
  return th;
}

/**
 * Kein Zeitlimit (Bonus-Level, Bauplan „Kein Zeitlimit“): die Uhr bleibt stehen, die Zeitwarnung entfällt; die
 * Uhr-Anzeige im HUD zeigt „– – –“ statt einer Zahl (nur in diesem Level, über die Anzeige selbst).
 */
export function ohneZeitlimit(level) {
  const rt = level.runtime;
  const upd = rt.update.bind(rt);
  rt.update = (dt) => { upd(dt); if (rt.status === 'play') { rt.timeLeft = rt.timeLimit; rt.warned = true; } };
  rt.warned = true;
  let done = false;
  level.onStep(() => {
    if (done) return;
    const ui = level.scene?.game?.scene?.getScene?.('CourseUI') ?? globalThis.__game?.scene?.getScene?.('CourseUI');
    const tt = ui?.timeText;
    if (!tt) return;
    done = true;
    const set = tt.setText.bind(tt);
    tt.setText = () => tt;
    tt.setColor = () => tt;
    set('– – –');
  });
}

/**
 * Goldener Schalter in der Felsspalte (Bauplan 5-Zug „Geheimnis: goldener P-Schalter in einer Felsspalte“): fährt auf
 * dem Felswagen mit (attach). Wer mit Schwung darauf landet (oder stampft), löst time s lang einen Goldregen aus: rate
 * Münzen/s fallen über dem Zug (ahead m voraus, behind m dahinter), jede hängt am Wagen darunter und fährt mit ihm
 * (auch im Fallen). Modell 'push_switch_gold' (Welt 2). spec { id, pos, attach, time: 8, rate: 7, ahead: 16, behind: 6,
 * height: 6.5 } – info(): { state, rained, presses }.
 */
export class ZugGoldschalter extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'goldschalter_zug');
    this.half.set(0.5, 0.28, 0.5);
    this.touch = false;
    const p = this.pos;
    this.btn = this.addSolid({ type: 'box', min: [p.x - 0.5, p.y, p.z - 0.5], max: [p.x + 0.5, p.y + 0.55, p.z + 0.5], tag: 'goldschalter' });
    this.state = 'idle'; this.t = 0; this.acc = 0; this.rained = 0; this.presses = 0;
    this.rnd = new Rnd(31);
    if (level.view && hasModel('push_switch_gold')) this.setModel(getModel('push_switch_gold'));
  }

  onPound() { this.press(); }

  press() {
    if (this.state !== 'idle') return;
    this.state = 'rain'; this.t = 0; this.presses++;
    this.level.sfx('slam'); this.level.sfx('key');
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 0.6, z: this.pos.z }, 18);
    const s = this.btn;
    s.max = [s.x1, this.pos.y + 0.2, s.z1]; s.min = [s.x0, this.pos.y, s.z0];
    if (s.id !== undefined) this.level.world.update(s.id);
    hudBanner(this.level, 'Goldregen!', { color: '#ffd23a', size: 20, hold: 1.2 });
  }

  update(dt) {
    if (this.state === 'idle') {
      const hard = figures(this.level).some((p) => p.mode === 'ground' && p.ground?.owner === this && (p.lastLandVy ?? 0) < -2 && p.stateTime < 0.1);
      if (hard) this.press();
      return;
    }
    if (this.state !== 'rain') return;
    this.t += dt;
    const T = this.spec.time ?? 8;
    countdown(this.level).show(this, T - this.t, 'Goldregen!', '#ffc21a');
    this.acc += dt * (this.spec.rate ?? 7);
    const veh = (this.level._zug?.vehicles ?? []).filter((v) => !v.removed && v.pos.y < 2);
    while (this.acc >= 1) {
      this.acc -= 1;
      const z = this.pos.z - this.rnd.real(-(this.spec.behind ?? 6), this.spec.ahead ?? 16);
      const x = this.rnd.real(-1.1, 1.1);
      let car = null;
      for (const v of veh) if (Math.abs(z - v.pos.z) < v.size.d / 2 + 0.4 && Math.abs(x - v.pos.x) < 2) { car = v; break; }
      const y = (car ? car.pos.y + car.size.h : this.pos.y) + (this.spec.height ?? 6.5);
      this.level.spawn('fallmuenze', { pos: [x, y, z], vel: [0, -2, 0], life: 10, ...(car ? { attach: car.spec.id } : {}) });
      this.rained++;
    }
    if (this.t >= T) { this.state = 'done'; countdown(this.level).hide(this); }
  }

  modelState() { return { anim: this.state === 'idle' ? 'idle' : 'pressed' }; }
  info() { return { state: this.state, rained: this.rained, presses: this.presses, t: +this.t.toFixed(2) }; }
  dispose() { countdown(this.level).hide(this); super.dispose(); }
}

/**
 * Felsbrocken auf dem Felswagen (nur Darstellung; Kollision liefern unsichtbare Teile des Wagens): lila-graue
 * Felsblöcke mit Goldadern, Moospolstern und Strandblümchen, dazwischen die Spalte mit Goldnuggets und einer kleinen
 * Felsstufe zum Hinausklettern. Fährt mit (attach). spec { id, pos (Wagenmitte auf dem Deck), attach, rocks: [{ dc, len,
 * h }], step: { dc, dx, w, len, h }, w: 3 }.
 */
export class FelsLadung extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'felsladung');
    this.touch = false;
    this.shadow = 0;
    if (!level.view) return;
    const rnd = new Rnd(17);
    const W = spec.w ?? 3;
    const rock = L(0x9a84b8), rockD = L(0x5e4a86), rockL = L(0xc8b4e0), gold = L(0xffc83a), moss = L(0x5ab04a), mossL = L(0x9ad86a);
    const parts = [];
    const shade = (g, seed) => colorize(g, (p, n, o) => {
      mixc(rockD, rock, smooth(-0.7, 0.8, n.y * 0.7 + n.x * 0.2 - n.z * 0.2), o);
      if (n.y > 0.6) mixc(o, rockL, 0.35, o);
      const vein = Math.sin(p.x * 3.1 + p.y * 4.7 + p.z * 1.9 + seed) + Math.sin(p.z * 5.3 - p.y * 2.2);
      if (vein > 1.72) mixc(o, gold, 0.9, o);
      if (n.y > 0.8 && Math.sin(p.x * 2.3 + p.z * 1.7 + seed * 3) > 0.55) mixc(o, moss, 0.75, o);
    });
    spec.rocks.forEach((r, i) => {
      const h = r.h, z = -r.dc;
      parts.push(shade(box(W, h, r.len, 0, h / 2, z, 0xffffff, { r: 0.42, seg: 2 }), i * 1.7));
      // Buckel an den Flanken (überragen die Oberkante nicht)
      for (let k = 0; k < 5; k++) {
        const g = new THREE.DodecahedronGeometry(0.55 + rnd.real(0, 0.3), 0);
        const sx = k % 2 ? 1 : -1;
        g.scale(0.7, 1, 1);
        g.translate(sx * (W / 2 - 0.05), rnd.real(0.5, h - 0.7), z + rnd.real(-r.len / 2 + 0.5, r.len / 2 - 0.5));
        parts.push(shade(g, k));
      }
      // Moospolster und Blümchen oben
      for (let k = 0; k < 4; k++) {
        const g = new THREE.SphereGeometry(0.32 + rnd.real(0, 0.2), 8, 5, 0, TAU, 0, Math.PI / 2).toNonIndexed();
        g.scale(1.3, 0.35, 1);
        g.translate(rnd.real(-W / 2 + 0.5, W / 2 - 0.5), h - 0.04, z + rnd.real(-r.len / 2 + 0.5, r.len / 2 - 0.5));
        parts.push(colorize(g, (p, n, o) => mixc(moss, mossL, smooth(0, 1, n.y), o)));
      }
      for (let k = 0; k < 6; k++) {
        const g = new THREE.IcosahedronGeometry(0.09, 0);
        g.translate(rnd.real(-W / 2 + 0.3, W / 2 - 0.3), h + 0.06, z + rnd.real(-r.len / 2 + 0.3, r.len / 2 - 0.3));
        const col = L([0xff5a8a, 0xffd23a, 0xffffff, 0xb070ff][k % 4]);
        parts.push(colorize(g, (p, n, o) => { o[0] = col[0]; o[1] = col[1]; o[2] = col[2]; }));
      }
    });
    if (spec.step) {
      const s = spec.step;
      parts.push(shade(box(s.w, s.h, s.len, s.dx, s.h / 2, -s.dc, 0xffffff, { r: 0.2, seg: 1 }), 9));
    }
    // Goldnuggets auf dem Spaltboden
    for (let i = 0; i < 7; i++) {
      const g = new THREE.IcosahedronGeometry(0.13 + rnd.real(0, 0.08), 0);
      g.translate(rnd.real(-W / 2 + 0.3, W / 2 - 0.3), 0.08, rnd.real(-0.5, 0.5) - (spec.gapDc ?? 0));
      parts.push(colorize(g, (p, n, o) => mixc(L(0xc88a10), gold, smooth(-0.5, 1, n.y), o)));
    }
    const m = new THREE.Mesh(merge(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.06 }));
    m.castShadow = true; m.receiveShadow = true;
    const root = new THREE.Group();
    root.name = 'felsladung';
    root.add(m);
    this.setModel({ root, update: () => {}, dispose: () => { m.geometry.dispose(); m.material.dispose(); } });
  }
}

/**
 * Wolkenwagen (Ziel der geheimen Röhre): eine weiße, rosa schattierte Wolke aus Kugeln auf dem unsichtbaren Fahrzeug
 * spec.attach (fährt neben dem Zug über dem Strand mit); wird durchscheinend, wenn sie die Figur verdeckt. spec { id,
 * pos (Mitte der Oberseite), attach, len: 18, w: 3.6 }.
 */
export class WolkenWagen extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'wolkenwagen');
    this.touch = false;
    this.shadow = 0;
    if (!level.view) return;
    const len = spec.len ?? 18, w = spec.w ?? 3.6;
    const rnd = new Rnd(5);
    const parts = [];
    const white = L(0xffffff), shade = L(0xdce4ff), pink = L(0xffd6ea);
    const n = Math.round(len / 1.15);
    for (let i = 0; i < n; i++) {
      for (const sx of [-1, 0, 1]) {
        const r = (sx === 0 ? 1.0 : 0.78) + rnd.real(0, 0.22);
        const g = new THREE.SphereGeometry(r, 10, 7).toNonIndexed();
        g.scale(1, 0.62, 1);
        g.translate(sx * (w / 2 - 0.55), -0.42 + rnd.real(-0.05, 0.1), -len / 2 + (i + 0.5) * (len / n));
        colorize(g, (p, nn, o) => mixc(nn.y > 0 ? shade : pink, white, smooth(-0.3, 0.7, nn.y), o));
        parts.push(g);
      }
    }
    // Unterseite: ein paar hängende Wölkchen
    for (let i = 0; i < 6; i++) {
      const g = new THREE.SphereGeometry(0.7 + rnd.real(0, 0.3), 9, 6).toNonIndexed();
      g.scale(1, 0.55, 1);
      g.translate(rnd.real(-0.8, 0.8), -0.95, -len / 2 + 1.5 + i * (len - 3) / 5);
      colorize(g, (p, nn, o) => mixc(pink, shade, smooth(-0.8, 0.5, nn.y), o));
      parts.push(g);
    }
    this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, emissive: 0x403850, emissiveIntensity: 0.6 });
    const m = new THREE.Mesh(merge(parts), this.mat);
    m.castShadow = true; m.receiveShadow = false;
    m.name = 'wolkenwagen';
    const root = new THREE.Group();
    root.add(m);
    this.len = len; this.w = w;
    this.box3 = new THREE.Box3();
    this.setModel({ root, update: () => {}, dispose: () => { m.geometry.dispose(); this.mat.dispose(); } });
    level.view.xray(m, this.box3, { min: 0.3 });
  }

  render(dt, t) {
    super.render(dt, t);
    if (!this.box3) return;
    const p = this.pos;
    this.box3.min.set(p.x - this.w / 2 - 0.6, p.y - 1.4, p.z - this.len / 2 - 0.6);
    this.box3.max.set(p.x + this.w / 2 + 0.6, p.y + 0.5, p.z + this.len / 2 + 0.6);
  }
}

/**
 * Glückshaus am Ende (Bauplan 5-Zug „Endröhre zu einem Glückshaus“): Haus mit Spielautomat der Kurs-Karte
 * (map/slot.js, nur benutzt). Auf die Matte hüpfen (mit einem Sprung landen) zieht den Hebel – Einsatz 10 Bitcoins
 * aus diesem Level; Gewinne wie auf der Karte: 3 × Bitcoin 30 Bitcoins, 3 × Herz ein Leben (+ 10), 3 × Power-up fürs
 * nächste Level, zwei gleiche Einsatz zurück. def = { pos (Haus), machine, pad, stake } → level._glueck
 * { slot, pulls, prizes, poor, force(symbols), info() }.
 */
export function gluecksHaus(level, def) {
  const slot = new SlotMachine(level, def);
  const save = () => level.runtime?.save;
  const st = level._glueck = { slot, pulls: 0, prizes: [], poor: 0, force: (s) => slot.force(s), info: () => ({ ...slot.info(), pulls: st.pulls, prizes: st.prizes.slice(), poor: st.poor }) };
  const LABEL = { funken: 'Funkenblüte', krallen: 'Krallen-Anzug', stern: 'Funkelstern' };
  slot.onPrize = (prize) => {
    st.prizes.push(prize.kind === 'power' ? `power:${prize.power}` : `${prize.kind}:${prize.n ?? 0}`);
    const rt = level.runtime;
    if (prize.kind === 'coins') level.addCoins(prize.n);
    else if (prize.kind === 'life') { rt.addLife(1); level.sfx('oneup'); if (prize.coins) level.addCoins(prize.coins); }
    else if (prize.kind === 'power') { save().carryPower = prize.power; level.sfx('powerup'); }
    const text = prize.text ?? (prize.kind === 'power' ? `3 × ${LABEL[prize.power] ?? prize.power} – fürs nächste Level!` : '');
    if (text) hudBanner(level, text, { color: prize.kind === 'none' ? '#ffd0c0' : '#ffe066', size: 15, hold: 1.8 });
    level.effects?.sparks({ x: slot.pos.x, y: slot.pos.y + 2.4, z: slot.pos.z + 0.6 }, prize.kind === 'none' ? 4 : 22);
  };
  let prevMode = 'ground';
  level.onStep((dt) => {
    slot.step(dt);
    const p = level.player;
    if (!p) return;
    const landed = prevMode === 'air' && slot.onPad(p) && (p.lastLandVy ?? 0) < -1.5;
    prevMode = p.mode;
    if (!landed || slot.busy) return;
    const rt = level.runtime;
    if (rt.coins < slot.stake) { st.poor++; level.sfx('bump'); hudBanner(level, `Zu wenig Bitcoins – ${slot.stake} nötig!`, { color: '#ffb0a0', size: 13, hold: 1.4 }); return; }
    const r = slot.pull(save());
    if (r === 'spin') { st.pulls++; rt.coins -= slot.stake; }
    else if (r === 'poor') st.poor++;
  });
  if (level.view) level.view.onFrame((dt) => slot.render(dt, level.time));
  return st;
}

/**
 * Küsten-Kulisse entlang der Strecke (statisch, Abschnitts-Meshes): bunte Strandhäuschen mit Streifen und Spitzdach,
 * ein rot-weißer Leuchtturm mit leuchtender Laterne, Holzstege in die Lagunen, schwimmende Bojen, Strandkörbe.
 * cfg = { huts: [[x, z, yaw, color]], lighthouse: [x, y, z], jetties: [[x, z, len, yaw]], buoys: [[x, z, color]],
 * baskets: [[x, z, yaw, color]], y: Strandhöhe }.
 */
export function kuestenKulisse(level, cfg) {
  if (!level.view) return;
  const y = cfg.y ?? -0.35;
  const parts = [], glow = [];
  const rot = (g, yaw, x, yy, z) => { if (yaw) g.rotateY(yaw); g.translate(x, yy, z); return g; };
  const flat = (g, hexc) => { const k = L(hexc); return colorize(g, (p, n, o) => { o[0] = k[0]; o[1] = k[1]; o[2] = k[2]; }); };
  for (const [x, z, yaw = 0, col = 0x4ab8f0] of cfg.huts ?? []) {
    const P = [];
    const c = L(col), w = L(0xffffff);
    const body = new THREE.BoxGeometry(2.4, 2.2, 2.0, 6, 1, 1).toNonIndexed();
    body.translate(0, 1.1 + 0.3, 0);
    P.push(colorize(body, (p, n, o) => { const s = Math.floor((p.x + 1.2) / 0.4 + 0.01) % 2; mixc(s ? c : w, w, Math.abs(n.y) > 0.5 ? 0.5 : 0, o); }));
    const roof = new THREE.ConeGeometry(2.0, 1.2, 4, 1).toNonIndexed();
    roof.rotateY(Math.PI / 4);
    roof.scale(1, 1, 0.85);
    roof.translate(0, 3.2, 0);
    P.push(colorize(roof, (p, n, o) => mixc(L(0xd83a4a), L(0xff7a6a), smooth(-0.2, 0.8, n.y), o)));
    const door = new THREE.BoxGeometry(0.7, 1.3, 0.06).toNonIndexed();
    door.translate(0, 0.95, 1.02);
    P.push(flat(door, 0x7a4a2a));
    const deck = new THREE.BoxGeometry(2.8, 0.3, 2.6).toNonIndexed();
    deck.translate(0, 0.15, 0.3);
    P.push(colorize(deck, (p, n, o) => mixc(L(0x9a6a3a), L(0xd8a46a), smooth(-0.5, 1, n.y), o)));
    for (const g of P) parts.push(rot(g, yaw, x, y, z));
  }
  if (cfg.lighthouse) {
    const [x, ly, z] = cfg.lighthouse;
    const red = L(0xe8304a), w = L(0xfff6ee);
    const tower = new THREE.CylinderGeometry(1.3, 2.1, 12, 18, 6).toNonIndexed();
    tower.translate(x, ly + 6, z);
    parts.push(colorize(tower, (p, n, o) => mixc(Math.floor((p.y - ly) / 2) % 2 ? red : w, w, 0, o)));
    const base = new THREE.CylinderGeometry(3.2, 3.6, 1.2, 18).toNonIndexed();
    base.translate(x, ly + 0.6, z);
    parts.push(colorize(base, (p, n, o) => mixc(L(0x8a74a8), L(0xc8b4e0), smooth(-0.5, 1, n.y), o)));
    const gal = new THREE.CylinderGeometry(1.8, 1.8, 0.3, 18).toNonIndexed();
    gal.translate(x, ly + 12.15, z);
    parts.push(flat(gal, 0x3a3a4a));
    const cap = new THREE.ConeGeometry(1.4, 1.4, 18).toNonIndexed();
    cap.translate(x, ly + 14.4, z);
    parts.push(colorize(cap, (p, n, o) => mixc(L(0xb81e34), red, smooth(0, 1, n.y), o)));
    const lamp = new THREE.CylinderGeometry(1.0, 1.0, 1.4, 14).toNonIndexed();
    lamp.translate(x, ly + 13.0, z);
    glow.push(flat(lamp, 0xfff0a0));
  }
  for (const [x, z, len, yaw = 0] of cfg.jetties ?? []) {
    const P = [];
    const plank = new THREE.BoxGeometry(1.8, 0.18, len, 1, 1, Math.max(1, Math.round(len / 0.5))).toNonIndexed();
    plank.translate(0, 0, -len / 2);
    P.push(colorize(plank, (p, n, o) => mixc(L(0x8a5a32), L(0xd8a46a), (Math.floor(-p.z / 0.5) % 2 ? 0.45 : 0.9) * smooth(-0.5, 1, n.y), o)));
    for (let i = 0; i <= Math.floor(len / 2); i++) for (const sx of [-0.8, 0.8]) {
      const post = new THREE.CylinderGeometry(0.12, 0.12, 2.2, 6).toNonIndexed();
      post.translate(sx, -1.0, -i * 2);
      P.push(flat(post, 0x7a5232));
    }
    for (const g of P) parts.push(rot(g, yaw, x, y - 0.1, z));
  }
  for (const [x, z, col = 0xe8304a] of cfg.buoys ?? []) {
    const g = new THREE.SphereGeometry(0.45, 10, 7).toNonIndexed();
    g.translate(x, -0.9, z);
    const c = L(col), w = L(0xffffff);
    parts.push(colorize(g, (p, n, o) => mixc(Math.abs(p.y + 0.9) < 0.12 ? w : c, c, 0, o)));
    const stick = new THREE.CylinderGeometry(0.06, 0.06, 1.0, 5).toNonIndexed();
    stick.translate(x, -0.35, z);
    parts.push(flat(stick, 0x3a3a4a));
  }
  for (const [x, z, yaw = 0, col = 0x3aa0e8] of cfg.baskets ?? []) {
    const c = L(col), w = L(0xfff4e0);
    const seat = new THREE.BoxGeometry(1.4, 0.8, 0.9, 6, 1, 1).toNonIndexed();
    seat.translate(0, 0.4, 0);
    const hood = new THREE.CylinderGeometry(0.75, 0.75, 1.4, 10, 1, false, 0, Math.PI).toNonIndexed();
    hood.rotateZ(Math.PI / 2);
    hood.translate(0, 1.0, -0.2);
    const stripe = (g) => colorize(g, (p, n, o) => mixc(Math.floor((p.x + 0.7) / 0.23) % 2 ? c : w, w, 0, o));
    parts.push(rot(stripe(seat), yaw, x, y, z), rot(stripe(hood), yaw, x, y, z));
  }
  bakeParts(level, parts, { castShadow: true });
  if (glow.length) addStatic(level, merge(glow), { material: level.view.mats.glow, castShadow: false });
}

/**
 * Szene des Goldzugs (LEVEL.setup): Mitfahr-Regeln der Welt-3-Hilfen (zugRules: neue Dinge über einem Wagen fahren mit,
 * Röhren auf Wagen), Röhren aus cfg.pipes (ZugRoehre), Felsladung, Wolkenwagen, Goldschalter, Abfahrt-/Halt-Ansagen,
 * Budget (Wagen/Schatten nur nah, statische Abschnitte nur vor der Kamera, Himmel-Kulisse nur mit Horizont im Bild).
 * cfg = LEVEL.zug = { pipes: [{ id, car | veh+pos, dc, dx, y, target, h, r, color, arrow }], fels: { car, rocks, step },
 * wolke: { veh, len }, schalter: { car, dc, dx, y }, endHint: [x, z], shadowZones } → level._goldzug.
 */
export function goldzugSzene(level, cfg, M) {
  const sc = level._goldzug = { pipes: {}, said: {}, schalter: null };
  zugRules(level);
  for (const p of cfg.pipes ?? []) {
    const car = p.car ? M[p.car] : null;
    const pos = car ? aufWagen(car, p.dc, p.dx ?? 0, p.y) : p.pos;
    sc.pipes[p.id] = spawnLocal(level, new ZugRoehre(level, { id: p.id, attach: car ? car.id : p.veh, pos, target: p.target, height: p.h ?? 1.1, radius: p.r ?? 0.85, color: p.color ?? 0x2fbf4a, arrow: !!p.arrow }));
  }
  if (cfg.fels) {
    const car = M[cfg.fels.car];
    sc.fels = spawnLocal(level, new FelsLadung(level, { id: 'felsladung', attach: car.id, pos: aufWagen(car, 0, 0, WAGEN_TOP.flach), rocks: cfg.fels.rocks, step: cfg.fels.step, gapDc: cfg.fels.gapDc ?? 0 }));
  }
  if (cfg.wolke) {
    const v = level.named.get(cfg.wolke.veh);
    if (v) sc.wolke = spawnLocal(level, new WolkenWagen(level, { id: 'wolkendeko', attach: v.spec.id, pos: [v.pos.x, v.pos.y, v.pos.z], len: cfg.wolke.len }));
  }
  if (cfg.schalter) {
    const s = cfg.schalter, car = M[s.car];
    sc.schalter = spawnLocal(level, new ZugGoldschalter(level, { id: 'goldschalter', attach: car.id, pos: aufWagen(car, s.dc, s.dx ?? 0, s.y ?? WAGEN_TOP.flach), time: s.time ?? 8, rate: s.rate ?? 7, ahead: s.ahead ?? 16, behind: s.behind ?? 6 }));
  }
  level.onStep((dt) => {
    const w = level.scroll, hud = level.archetype?.hud;
    if (!w) return;
    if (w.state === 'run' && !sc.said.go) { sc.said.go = true; hud?.banner?.('Abfahrt!', { hold: 1.2, size: 18, color: '#ffe066' }); level.sfx('pfiff'); }
    if (w.state === 'done' && !sc.said.end && (sc.endT = (sc.endT ?? 0) + dt) > 2.0) {
      sc.said.end = true;
      const p = level.player;
      if (p && cfg.endHint && Math.abs(p.pos.z - cfg.endHint[1]) < 40) hud?.banner?.('Ab in die Röhre – zum Glückshaus!', { hold: 2.2, size: 13, y: 0.38, color: '#ffe066' });
    }
  });
  if (level.view) {
    for (const v of level.entities) if (v.kind === 'vehicle') v.model?.root.traverse((o) => { if (o.isInstancedMesh) o.castShadow = false; });
    shadowDiet(level, ['crate', 'checkpoint_flag', 'endlessblock', 'rouletteblock', 'question'], 0);
    const sz = cfg.shadowZones ?? [];
    sc.cull = new StaticCullE(level, { shadowRange: 30, maxDist: 100, merge: true, shadowKeep: (b) => sz.some(([z0, z1]) => b.max.z > z1 && b.min.z < z0) });
    sc.trainCull = trainCull(level, { shadow: 18, wheels: 18, far: 1e9, attached: 40 });
    sc.sky = skyDiet(level);
    heroShadowDiet(level, 0.12);
  }
  return sc;
}

// =====================================================================================================================
// 4) Rumpeltempel (5-Burg)
// =====================================================================================================================

/**
 * Stern im Loch eines Kippquaders (5-Burg Stern 1, Bauplan „nach dem Checkpoint in einem Kippquader“): ein Rahmen-
 * Kippquader (hole) fällt auf den „Mut-Platz“; steht eine Figur dabei im Loch, ist sie sicher – und der versteckte Stern
 * erscheint genau dort (in diesem Augenblick im Loch, also gleich eingesammelt). o = { kq: Id, star: Index,
 * rect: [x0, x1, z0, z1] (Lochfläche liegend), y } → Zustand { lands, tries, given } (level._lochStern).
 */
export function lochStern(level, o) {
  const st = level._lochStern = { lands: 0, given: false };
  const [x0, x1, z0, z1] = o.rect;
  const inside = (f) => f.pos.x > x0 && f.pos.x < x1 && f.pos.z > z0 && f.pos.z < z1 && f.pos.y < o.y + 0.9;
  const brave = new Set();          // Figuren, die während des ganzen Kippens im Loch standen
  let kq = null;
  level.onStep(() => {
    if (kq) {
      if (kq.state === 'tip') { for (const f of figures(level)) if (!inside(f)) brave.delete(f); }
      else if (kq.state === 'warn') { brave.clear(); for (const f of figures(level)) if (inside(f)) brave.add(f); }
      return;
    }
    kq = level.named.get(o.kq);
    if (!kq?.onLand) { kq = null; return; }
    kq.onLand((boxes) => {
      st.lands++;
      const lying = boxes.length === 4 && Math.max(...boxes.map((b) => b.y1)) < o.y + 1.2;
      if (!lying || st.given || level.runtime?.stars?.[o.star]) return;
      // nur wer schon beim Kippen im Loch stand (nicht wer erst vom Rahmen hineingeschoben wurde)
      const inHole = figures(level).some((f) => inside(f) && brave.has(f));
      if (!inHole) return;
      st.given = true;
      runAction(level, { star: o.star }, { pos: [(x0 + x1) / 2, o.y + 0.6, (z0 + z1) / 2] });
      level.sfx('powerup_appear');
      level.effects?.sparks({ x: (x0 + x1) / 2, y: o.y + 1, z: (z0 + z1) / 2 }, 24);
      hudBanner(level, 'Mutig! Sicher im Loch!', { color: '#9affc0', size: 16, hold: 1.2 });
    });
  });
  return st;
}

/** Leuchtender „Mut-Platz“ (Stern-Zeichen im Boden, pulsiert): zeigt, wo man im Loch des Kippquaders stehen muss. */
export function mutPlatz(level, x, y, z, r = 0.7) {
  if (!level.view) return;
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    if (i === 0) shape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else shape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: 0x7dffa0, transparent: true, opacity: 0.75, depthWrite: false, fog: true });
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y + 0.03, z);
  m.name = 'mutplatz';
  m.renderOrder = 2;
  const holder = {};
  let t = 0;
  addObject(level, m, (dt) => { t += visDt(level, holder, dt); mat.opacity = 0.45 + 0.35 * Math.sin(t * 3.4); m.rotation.y = t * 0.6; });
}

/**
 * Baron Brummbär nach dem Sieg über den Kippquader-König: braust im Sportwagen über die Tempelbrücke heran, hüpft vor
 * Wut im Sitz, schimpft (text) und flieht; Kamera schwenkt mit; danach Ansage done ('Welt 5 geschafft!'). Startet,
 * sobald der Endgegner (cfg.boss) ganz verschwunden ist; ein Neustart vor dem Sieg setzt die Szene zurück.
 * cfg = { from, stop, away: [x, y, z], boss: 'koenig', text, done }. Rein darstellerisch → level._baron ({ state, info() }).
 */
export function baronAuftritt(level, cfg) {
  const sc = {
    state: 'wait', t: 0, pos: new THREE.Vector3(...cfg.from), yaw: 0, speed: 0, hop: 0, said: false, log: [], model: null,
    get active() { return this.state === 'in' || this.state === 'stop' || this.state === 'away'; },
    info() { return { state: this.state, t: +this.t.toFixed(2), x: +this.pos.x.toFixed(2), z: +this.pos.z.toFixed(2), log: this.log.slice() }; },
  };
  if (level.view && hasModel('baron_brummbaer')) {
    sc.model = getModel('baron_brummbaer', { withCar: true });
    sc.model.root.visible = false;
    sc.model.root.traverse((x) => { if (x.isMesh) x.userData.owned = true; });
    level.view.add(sc.model.root);
  }
  const hud = () => level.archetype?.hud;
  const dir = (a, b) => Math.atan2(-(b[2] - a[2]), b[0] - a[0]);
  const rt = level.runtime, respawn = rt.respawn.bind(rt);
  rt.respawn = (...a) => { respawn(...a); if (!level.archetype?.won) { sc.state = 'wait'; sc.t = 0; sc.said = false; sc.pos.set(...cfg.from); } };
  level.onStep((dt) => {
    if (sc.state === 'wait') {
      const b = level.named.get(cfg.boss ?? 'koenig');
      if (b && b.state === 'gone' && b.hp <= 0) { sc.state = 'in'; sc.t = 0; level.sfx('swoop'); sc.log.push('in'); }
      return;
    }
    if (!sc.active) return;
    sc.t += dt;
    const { from, stop, away } = cfg;
    if (sc.state === 'in') {
      const k = Math.min(1, sc.t / 2.2), e = 1 - (1 - k) * (1 - k);
      sc.pos.set(from[0] + (stop[0] - from[0]) * e, from[1] + (stop[1] - from[1]) * e, from[2] + (stop[2] - from[2]) * e);
      sc.yaw = dir(from, stop); sc.speed = 15 * (1 - k * 0.7);
      if (k >= 1) { sc.state = 'stop'; sc.t = 0; level.sfx('skid'); sc.log.push('stop'); }
    } else if (sc.state === 'stop') {
      sc.speed = 0;
      const p = level.player;
      const want = p ? Math.atan2(-(p.pos.z - stop[2]), p.pos.x - stop[0]) : sc.yaw;
      if (sc.t < 1.6) sc.yaw += Math.atan2(Math.sin(want - sc.yaw), Math.cos(want - sc.yaw)) * Math.min(1, dt * 3);
      sc.hop = sc.t > 0.4 && sc.t < 2.4 ? Math.abs(Math.sin(sc.t * 9)) * 0.35 : 0;
      if (!sc.said && sc.t > 0.3) { sc.said = true; hud()?.banner?.(cfg.text ?? 'Baron Brummbär: „Mein Kippquader-König! Na wartet!“', { hold: 2.8, size: 11, color: '#ffb0a0', y: 0.7 }); level.sfx('panic'); }
      if (sc.t > 2.4) { const w2 = dir(stop, away); sc.yaw += Math.atan2(Math.sin(w2 - sc.yaw), Math.cos(w2 - sc.yaw)) * Math.min(1, dt * 5); }
      if (sc.t > 3.2) { sc.state = 'away'; sc.t = 0; sc.hop = 0; level.sfx('swoop'); sc.log.push('away'); }
    } else if (sc.state === 'away') {
      const k = Math.min(1, sc.t / 2.4);
      sc.pos.set(stop[0] + (away[0] - stop[0]) * k * k, stop[1] + (away[1] - stop[1]) * k * k, stop[2] + (away[2] - stop[2]) * k * k);
      sc.yaw = dir(stop, away); sc.speed = 4 + k * 26;
      if (k >= 1) { sc.state = 'gone'; sc.log.push('gone'); hud()?.banner?.(cfg.done ?? 'Welt 5 geschafft!', { hold: 2.8, size: 18, color: '#7dffa0' }); level.sfx('victory'); }
    }
  });
  // Kamera: Blickziel schwenkt zum Wagen (beim ersten Schritt einhängen)
  let wrapped = false, kc = 0;
  level.onStep(() => {
    const arch = level.archetype;
    if (wrapped || !level.view || !arch?.camera) return;
    wrapped = true;
    const cam = arch.camera.bind(arch);
    arch.camera = (dt, player, world) => {
      const r = cam(dt, player, world);
      const want = sc.active && sc.state !== 'away' ? 0.9 : sc.state === 'away' && sc.t < 1.4 ? 0.55 : 0;
      kc += (want - kc) * Math.min(1, dt * 2.5);
      if (kc > 0.01) {
        const rig = level.view.rig;
        rig.target.set(rig.target.x + (sc.pos.x - rig.target.x) * kc, rig.target.y + (sc.pos.y + 2.6 - rig.target.y) * kc, rig.target.z + (sc.pos.z + 2 - rig.target.z) * kc);
        rig.distNow += (17 - rig.distNow) * kc;
        rig.place({ ...rig.cur, pitch: rig.cur.pitch + (34 - rig.cur.pitch) * kc }, dt);
      }
      return r;
    };
  });
  if (level.view) level.view.onFrame((dt) => {
    const m = sc.model;
    if (!m) return;
    m.root.visible = sc.active;
    if (!m.root.visible) return;
    m.root.position.set(sc.pos.x, sc.pos.y + sc.hop, sc.pos.z);
    m.root.rotation.y = sc.yaw;
    m.update(Math.min(dt || 0, 0.1), { anim: sc.state === 'stop' ? 'stunned' : 'drive', speed: sc.speed, steer: 0 });
  });
  level._baron = sc;
  return sc;
}
