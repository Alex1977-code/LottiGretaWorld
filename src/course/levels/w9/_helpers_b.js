// Hilfen der Level S-3, S-4 und S-5 (Bonuswelt Stern „Sternenzelt“). Kein LEVEL – nur Daten-Bausteine und kleine
// Aufbau-/Laufzeit-Haken für diese drei Level (andere Level-Agenten bauen eigene Hilfen).
//
//   deck(x0, x1, zA, zB, top, h, o)    Insel/Deck (Oberseite top) über einem Rechteck
//   line / ring / arc / column          Bitcoin-Pfade (Münzen)
//   sign(x, y, z, text, o)              Holzschild
//   huerden(level, list)                Holz-Athletik: Hürden-Balken (feste Form) mit Pfosten bis zu den Schienen (S-3)
//   versteckteMuenzen(level, o)         unsichtbare Münzen erscheinen nacheinander, sobald eine Figur den Bereich betritt
//   beiZustand(level, id, test, action) Aktion einmal, sobald der Griff level.named.get(id) die Bedingung erfüllt
//   riesenblock(level, pos, size, color) S-5: bunter Riesenblock mit Nieten (statische Geometrie + feste Form)
//   wolkenInseln(level, list)           S-4: Wattewolken-Inseln (fest von oben und von der Seite), Bäusche rundum
//   wolkenteiche(level, list)           S-4: Wolkenteiche (Rand + Wasserfläche) für die Glotzfisch-Löcher
//   donutBloecke(level, list)           S-4: Donut-Blöcke (Mechanik des Bausteins donutblock) mit sparsamer Instanz-Optik

import * as THREE from 'three';
import { box, merge, addStatic, addObject, lin, mixc, smooth, colorize } from '../../blocks/kit.js';
import { runAction, visDt } from '../../entities/gimmick.js';
import { buildDonutblock } from '../../blocks/types/w5_donut.js';
import { banner } from '../../blocks/w3kit.js';

export const PI = Math.PI;

/** Insel/Deck über [x0, x1] × [zA, zB] mit Oberseite top (Körper h m hoch, verjüngter Unterbau under). */
export function deck(x0, x1, zA, zB, top, h = 1.6, o = {}) {
  return { type: 'island', pos: [(x0 + x1) / 2, top - h, (zA + zB) / 2], size: [Math.abs(x1 - x0), h, Math.abs(zA - zB)], under: o.under ?? 1.4, ...o };
}

export const line = (a, b, n, o = {}) => ({ kind: 'coins', from: a, to: b, n, ...o });
export const ring = (p, r, n, o = {}) => ({ kind: 'coins', pos: p, r, n, ...o });
/** Münzbogen von a nach b (h m Scheitel), n Münzen als Einzel-Münzen. */
export function arc(a, b, n, h = 1.5, o = {}) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0.5 : i / (n - 1);
    out.push({ kind: 'coin', pos: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u + Math.sin(u * PI) * h, a[2] + (b[2] - a[2]) * u], ...o });
  }
  return out;
}
/** Münzsäule (senkrecht) bei x, z von y0 bis y1. */
export function column(x, z, y0, y1, n, o = {}) { return line([x, y0, z], [x, y1, z], n, o); }

export const sign = (x, y, z, text, o = {}) => ({ type: 'sign', pos: [x, y, z], text, ...o });

// ===================================================================================================================== Hürden

/**
 * Holz-Athletik-Hürden über einer Walzenbahn: je Eintrag ein Balken (feste Form, Kopf- und Seitenstoß) von x0 bis x1 bei z,
 * Unterkante y0, Oberkante y1; Pfosten an den Enden in posts (x-Werte) reichen bis zur Schiene hinab (bottom).
 * Rot-weiß lackiert wie Turnhallen-Hürden. Kollision wirkt nur auf Figuren – die Walze rollt darunter durch.
 *   { x0, x1, z, y0, y1, posts: [x …], bottom, depth: 0.36 }
 */
export function huerden(level, list) {
  const parts = [];
  for (const h of list) {
    const d = h.depth ?? 0.36, w = h.x1 - h.x0, yc = (h.y0 + h.y1) / 2, ht = h.y1 - h.y0;
    level.world.add({ type: 'box', min: [h.x0, h.y0, h.z - d / 2], max: [h.x1, h.y1, h.z + d / 2], tag: 'huerde', noWallSlide: true });
    if (!level.view) continue;
    // Balken in rot-weißen Feldern (je 0,6 m)
    const n = Math.max(2, Math.round(w / 0.6));
    for (let i = 0; i < n; i++) {
      const xa = h.x0 + (i / n) * w, xb = h.x0 + ((i + 1) / n) * w;
      parts.push(box(xb - xa + 0.01, ht, d, (xa + xb) / 2, yc, h.z, i % 2 ? 0xffffff : 0xe8403a, { r: 0.05, seg: 1 }));
    }
    for (const x of h.posts ?? []) {
      const bot = h.bottom ?? h.y0 - 3;
      parts.push(box(0.28, h.y1 + 0.25 - bot, 0.28, x, (h.y1 + 0.25 + bot) / 2, h.z, 0x9a6232, { r: 0.06, seg: 1 }));
      parts.push(box(0.42, 0.22, 0.42, x, h.y1 + 0.32, h.z, 0xffd24a, { r: 0.08, seg: 1 }));
    }
  }
  if (parts.length) addStatic(level, merge(parts));
}

// ===================================================================================================================== Laufzeit

/**
 * Versteckte Münzen (coins/coin mit hidden: true im Bereich coins [x0, x1, z0, z1], Standard area) erscheinen nacheinander
 * (gap s), sobald eine Figur am Boden im Bereich area [x0, x1, z0, z1] (y > ymin) steht. Mit banner: kurze Ansage.
 */
export function versteckteMuenzen(level, o) {
  const [x0, x1, z0, z1] = o.area;
  let state = 'wait', t = 0, list = null;
  level.onStep((dt) => {
    if (state === 'done') return;
    if (state === 'wait') {
      const f = level.players ?? [level.player];
      const hit = f.some((p) => p && !p.dead && p.mode === 'ground' && p.pos.x > Math.min(x0, x1) && p.pos.x < Math.max(x0, x1) && p.pos.z > Math.min(z0, z1) && p.pos.z < Math.max(z0, z1) && p.pos.y > (o.ymin ?? -99));
      if (!hit) return;
      const [cx0, cx1, cz0, cz1] = o.coins ?? o.area;
      list = level.entities.filter((e) => e.kind === 'coin' && e.hidden && !e.hiddenUntilLit && e.alive && !e.removed && e.pos.x > Math.min(cx0, cx1) && e.pos.x < Math.max(cx0, cx1) && e.pos.z > Math.min(cz0, cz1) && e.pos.z < Math.max(cz0, cz1));
      list.sort((a, b) => Math.hypot(a.pos.x - level.player.pos.x, a.pos.z - level.player.pos.z) - Math.hypot(b.pos.x - level.player.pos.x, b.pos.z - level.player.pos.z));
      state = 'show'; t = 0;
      level.sfx('powerup_appear');
      if (o.banner) banner(level, o.banner, { hold: 1.4, size: 13, y: 0.36 });
      level.revealedCoins = (level.revealedCoins ?? 0);
    }
    if (state === 'show') {
      t -= dt;
      if (t > 0) return;
      const e = list.shift();
      if (e) { e.reveal(); level.revealedCoins++; t = o.gap ?? 0.12; }
      if (!list.length) state = 'done';
    }
  });
}

/** Aktion einmal ausführen, sobald test(griff) für level.named.get(id) wahr wird (z. B. Walze am Ende angekommen). */
export function beiZustand(level, id, test, action, ctx = {}) {
  let fired = false;
  level.onStep(() => {
    if (fired) return;
    const h = level.named.get(id);
    if (!h || !test(h)) return;
    fired = true;
    runAction(level, action, ctx);
  });
}

export { banner };

// ===================================================================================================================== S-5 Riesenblöcke

const RETRO = {
  gras: [0x6ae04a, 0x3aa830], erde: [0xe0904a, 0xa85a2a], ziegel: [0xd8683a, 0x8a3a1a], hart: [0xc8a070, 0x7a5a3a],
  blau: [0x5aa8ff, 0x2a68c8], rot: [0xff5a4a, 0xb8302a], gelb: [0xffd23a, 0xc89a1a], gruen: [0x5ad06a, 0x2a8a3a],
  weiss: [0xf4f2ea, 0xc8c4b8], rosa: [0xff8ac8, 0xc85a98], lila: [0xa87aff, 0x6a4ac8], orange: [0xff9a3a, 0xc8601a],
};

/**
 * Bunter Riesenblock (Nieten an den Ecken, dunklere Kanten) als statische Geometrie; Kollision als Quader.
 * pos = Mitte der Unterseite, size = [w, h, d], color = Name aus RETRO. solid: false = nur Optik. id → level.named
 * (für den Stempel-Block: Stampfen erkennt man an der Form mit tag).
 */
export function riesenblock(level, pos, size, color = 'gelb', o = {}) {
  const [x, y, z] = pos, [w, h, d] = size;
  let shape = null;
  if (o.solid !== false) shape = level.world.add({ type: 'box', min: [x - w / 2, y, z - d / 2], max: [x + w / 2, y + h, z + d / 2], tag: o.tag ?? 'riesenblock', owner: o.owner });
  if (!level.view) return shape;
  const [a, b] = (RETRO[color] ?? RETRO.gelb).map(lin);
  const g = box(w, h, d, x, y + h / 2, z, 0xffffff, { r: Math.min(0.22, w * 0.08), seg: 2 });
  colorize(g, (p, n, out) => {
    // Kanten dunkler (Rahmen), Flächen hell; leichtes Verlaufen nach oben
    const ex = Math.abs(p.x - x) / (w / 2), ey = Math.abs(p.y - (y + h / 2)) / (h / 2), ez = Math.abs(p.z - z) / (d / 2);
    const edge = Math.max(n.y > 0.5 ? 0 : 0, Math.max(Math.abs(n.x) > 0.5 ? Math.max(ey, ez) : 0, Math.abs(n.y) > 0.5 ? Math.max(ex, ez) : 0, Math.abs(n.z) > 0.5 ? Math.max(ex, ey) : 0));
    mixc(a, b, smooth(0.82, 0.94, edge) * 0.85 + (n.y < -0.5 ? 0.3 : 0), out);
    const k = n.y > 0.5 ? 1.12 : 1 - Math.abs(n.x) * 0.08;
    out[0] *= k; out[1] *= k; out[2] *= k;
  });
  const parts = [g];
  // Nieten (vier je Vorder-/Rückseite)
  const r = Math.min(0.16, Math.min(w, h) * 0.06);
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const s = new THREE.SphereGeometry(r, 6, 4);
    s.translate(x + sx * (w / 2 - r * 2.6), y + h / 2 + sy * (h / 2 - r * 2.6), z + sz * (d / 2 + r * 0.25));
    parts.push(colorize(s.toNonIndexed(), (p, n, out) => mixc(lin(0x2a2a3a), lin(0xffffff), smooth(-0.2, 1, n.y) * 0.5, out)));
  }
  addStatic(level, merge(parts));
  return shape;
}

// ===================================================================================================================== S-4 Wolken

/**
 * Wattewolken-Inseln: je Eintrag [x0, x1, zA, zB, top, o?] eine feste Wolke (Quader top − depth … top) mit weicher, flach
 * gewölbter Decke und Wattebäuschen rundum (oben bündig mit der Lauffläche, unten hängend). Alles statisch verschmolzen.
 * o: { depth 1.2, puff 1 (Größe der Bäusche), tint 0xeaf2ff (Schatten-Ton), seed }.
 */
export function wolkenInseln(level, list) {
  const parts = [];
  let seed = 1;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed & 0xffff) / 0xffff; };
  for (const [x0, x1, zA, zB, top, o = {}] of list) {
    const depth = o.depth ?? 1.2;
    const xa = Math.min(x0, x1), xb = Math.max(x0, x1), za = Math.min(zA, zB), zb = Math.max(zA, zB);
    level.world.add({ type: 'box', min: [xa, top - depth, za], max: [xb, top, zb], tag: 'wolke' });
    if (!level.view) continue;
    seed = o.seed ?? (Math.round(xa * 7 + za * 13) & 0x7fff) + 11;
    const W = lin(0xffffff), S = lin(o.tint ?? 0xdce8fa), D = lin(0xc4d4f0);
    const shadeC = (p, n, out) => { mixc(D, W, smooth(-0.7, 0.75, n.y * 0.85 + n.z * 0.12), out); if (n.y < 0.2) mixc(out, S, 0.4, out); };
    // Decke (flach, Kanten weich)
    const slab = box(xb - xa, 0.5, zb - za, (xa + xb) / 2, top - 0.25, (za + zb) / 2, 0xffffff, { r: 0.24, seg: 2 });
    colorize(slab, shadeC);
    parts.push(slab);
    // Bäusche am Rand (oben bündig) und darunter hängend
    const per = 2 * ((xb - xa) + (zb - za));
    const n = Math.max(8, Math.round(per / 1.5));
    const pf = o.puff ?? 1;
    for (let i = 0; i < n; i++) {
      let u = (i + 0.5) / n * per, x, z;
      const w = xb - xa, d = zb - za;
      if (u < w) { x = xa + u; z = zb; } else if ((u -= w) < d) { x = xb; z = zb - u; } else if ((u -= d) < w) { x = xb - u; z = za; } else { u -= w; x = xa; z = za + u; }
      const r = (0.75 + rnd() * 0.45) * pf;
      const g = new THREE.SphereGeometry(r, 9, 6);
      g.scale(1.25, 0.62, 1.15);
      g.translate(x, top - 0.38 - r * 0.25, z);
      parts.push(colorize(g.toNonIndexed(), shadeC));
      if (i % 2 === 0) {
        const r2 = (1.0 + rnd() * 0.6) * pf;
        const g2 = new THREE.SphereGeometry(r2, 9, 6);
        g2.scale(1.2, 0.7, 1.2);
        const cx = (xa + xb) / 2, cz = (za + zb) / 2;
        g2.translate(x + (cx - x) * 0.18, top - depth - r2 * 0.15, z + (cz - z) * 0.18);
        parts.push(colorize(g2.toNonIndexed(), shadeC));
      }
    }
    // Unterseite: ein paar große Bäusche
    const m = Math.max(1, Math.round((xb - xa) * (zb - za) / 40));
    for (let i = 0; i < m; i++) {
      const r = (1.4 + rnd() * 1.2) * pf;
      const g = new THREE.SphereGeometry(r, 10, 6);
      g.scale(1.3, 0.6, 1.3);
      g.translate(xa + (xb - xa) * (0.2 + rnd() * 0.6), top - depth - r * 0.2, za + (zb - za) * (0.2 + rnd() * 0.6));
      parts.push(colorize(g.toNonIndexed(), shadeC));
    }
  }
  if (parts.length) addStatic(level, merge(parts), { castShadow: true });
}

/** Wolkenteiche (Glotzfisch-Löcher): je [x, y, z, r] ein weißer Wolkenwulst mit blauer Wasserfläche (Kulisse, ohne Form). */
export function wolkenteiche(level, list) {
  if (!level.view) return;
  const parts = [];
  for (const [x, y, z, r = 0.9] of list) {
    const rim = new THREE.TorusGeometry(r + 0.12, 0.2, 6, 18);
    rim.rotateX(PI / 2); rim.translate(x, y + 0.05, z);
    parts.push(colorize(rim.toNonIndexed(), (p, n, o) => mixc(lin(0xd0def6), lin(0xffffff), smooth(-0.4, 0.9, n.y), o)));
    const wa = new THREE.CircleGeometry(r, 18);
    wa.rotateX(-PI / 2); wa.translate(x, y + 0.035, z);
    parts.push(colorize(wa.toNonIndexed(), (p, n, o) => { const k = Math.hypot(p.x - x, p.z - z) / r; mixc(lin(0x2a8ae8), lin(0x7ad4ff), smooth(0.2, 1, k), o); }));
  }
  addStatic(level, merge(parts), { castShadow: false });
}

// ===================================================================================================================== S-4 Donut-Blöcke

const GLAZE = { rosa: [0xff8ac8, 0xffd8ee], schoko: [0x8a4a2a, 0xc88a5a], gelb: [0xffc83a, 0xfff0a8], minze: [0x6ae0c0, 0xd0fff0] };
const DONUT_GEO = {};
/** Donut-Block (1 m, Ursprung Mitte der Unterseite) mit ≈ 340 Dreiecken: Keks-Sockel, Glasur-Ring, Streusel (wie 7-3). */
function donutLowGeo(color) {
  if (DONUT_GEO[color]) return DONUT_GEO[color];
  const [gh, hh] = GLAZE[color] ?? GLAZE.rosa;
  const dough = lin(0xe8b070), doughD = lin(0xa86a34), glaze = lin(gh), hi = lin(hh);
  const parts = [];
  const base = new THREE.BoxGeometry(0.98, 0.62, 0.98, 1, 1, 1);
  base.translate(0, 0.31, 0);
  parts.push(colorize(base, (p, n, o) => mixc(doughD, dough, smooth(-0.6, 0.9, n.y + p.y * 0.5), o)));
  const rim = new THREE.CylinderGeometry(0.5, 0.49, 0.06, 8, 1, true);
  rim.translate(0, 0.6, 0);
  parts.push(colorize(rim, (p, n, o) => mixc(glaze, hi, 0.25, o)));
  const tor = new THREE.TorusGeometry(0.3, 0.16, 6, 12);
  tor.rotateX(PI / 2); tor.translate(0, 0.66, 0);
  parts.push(colorize(tor, (p, n, o) => (n.y > -0.15 ? mixc(glaze, hi, smooth(0.4, 1, n.y) * 0.6, o) : mixc(doughD, dough, 0.6, o))));
  const SP = [0xffffff, 0x5ad0ff, 0xff5a8a, 0x6aff7a, 0xa86aff].map(lin);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 2 * PI + (i % 3) * 0.3;
    const sp = new THREE.BoxGeometry(0.11, 0.035, 0.035);
    sp.rotateY(a * 1.7); sp.translate(Math.cos(a) * 0.3, 0.81, Math.sin(a) * 0.3);
    const c = SP[i % SP.length];
    parts.push(colorize(sp, (p, n, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }));
  }
  DONUT_GEO[color] = merge(parts);
  return DONUT_GEO[color];
}

/**
 * Donut-Blöcke: Mechanik unverändert aus dem Baustein `donutblock` (einsinken, zittern, fallen, wiederkommen), aber je Eintrag
 * eine Instanz-Gruppe mit eng gesetzter Begrenzungskugel und dem sparsamen Donut (statt ≈ 4500 Dreiecken je Block).
 * list: [{ id, blocks | from/to | grid, size, delay, respawn, color, …Felder des Bausteins }]. Liefert die Griffe.
 */
export function donutBloecke(level, list) {
  const v = level.view;
  const out = [];
  for (const spec of list) {
    level.view = null;
    let h = null;
    try { h = buildDonutblock(level, spec); } finally { level.view = v; }
    if (!h || !v) { out.push(h); continue; }
    out.push(h);
    const blocks = h.blocks, size = spec.size ?? 1, delay = spec.delay ?? 0.5;
    const im = new THREE.InstancedMesh(donutLowGeo(spec.color ?? 'rosa'), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }), blocks.length);
    im.name = 'donuts';
    im.castShadow = spec.shadow !== false; im.receiveShadow = true;
    const bb = new THREE.Box3(), pv = new THREE.Vector3();
    for (const b of blocks) { bb.expandByPoint(pv.set(b.x, b.y0 + size, b.z)); bb.expandByPoint(pv.set(b.x, b.y0 - 6, b.z)); }
    bb.expandByScalar(size);
    im.boundingSphere = bb.getBoundingSphere(new THREE.Sphere());
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
    const holder = {};
    let tt = 0;
    addObject(level, im, (dt) => {
      const d = visDt(level, holder, dt);
      tt += d;
      blocks.forEach((b, i) => {
        if (b.state === 'gone') { im.setMatrixAt(i, ZERO); return; }
        if (b.pop > 0) b.pop = Math.max(0, b.pop - d);
        const k = b.pop > 0 ? 1 - b.pop / 0.35 : 1;
        const sh = b.state === 'loaded' ? 0.035 * Math.min(1, b.load / Math.max(0.05, delay)) : 0;
        pv.set(b.x + Math.sin(tt * 47 + i) * sh, b.y, b.z + Math.cos(tt * 41 + i) * sh);
        const s = size * (k < 1 ? Math.max(0.05, Math.sin(k * PI * 0.5) + Math.sin(k * PI) * 0.15) : 1);
        im.setMatrixAt(i, m.compose(pv, q, sc.set(s, s, s)));
      });
      im.instanceMatrix.needsUpdate = true;
    });
  }
  return out;
}
