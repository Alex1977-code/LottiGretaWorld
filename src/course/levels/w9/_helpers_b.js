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
//   holzdecks(level, list)              S-3: Holz-Athletik-Decks (Planken, bunte Lackkante, Stelzen mit Sternanker) + Form
//   wimpel(level, list)                 Wimpelketten (bunte Dreiecksfähnchen an einer durchhängenden Schnur)
//   turnzeug(level, list)               S-3: Turnmatten, Pylonen, Medizinbälle, Sternlampen, Fahnenmasten (Kulisse)

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

// ===================================================================================================================== S-3 Holz-Athletik

const LACK = { rot: 0xe8403a, blau: 0x3a8aff, gelb: 0xffc81a, gruen: 0x4ccf5a, lila: 0xa865ff, orange: 0xff8a2a, tuerkis: 0x2ad0c8, rosa: 0xff7ac0 };
const LACKS = ['rot', 'blau', 'gelb', 'gruen', 'lila', 'orange'];
const solidCol = (hexc) => { const c = lin(hexc); return (p, n, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }; };

/**
 * Holz-Athletik-Decks: je [x0, x1, zA, zB, top, o?] ein festes Deck (Quader top − h … top) mit Planken quer zur Laufrichtung,
 * bunter Lackkante (o.lack oder reihum), weißer Zierlinie, dunklerem Holzkörper und Stelzen mit leuchtendem Sternanker
 * (o.legs: false lässt sie weg, o.leg Länge). Alles statisch verschmolzen; Leuchtendes ins Glüh-Material.
 */
export function holzdecks(level, list) {
  const parts = [], glow = [];
  let li = 0;
  for (const [x0, x1, zA, zB, top, o = {}] of list) {
    const xa = Math.min(x0, x1), xb = Math.max(x0, x1), za = Math.min(zA, zB), zb = Math.max(zA, zB);
    const h = o.h ?? 1.2, w = xb - xa, d = zb - za, cx = (xa + xb) / 2, cz = (za + zb) / 2;
    level.world.add({ type: 'box', min: [xa, top - h, za], max: [xb, top, zb], tag: o.tag ?? 'holzdeck' });
    const lack = LACK[o.lack] ?? LACK[LACKS[li % LACKS.length]];
    li++;
    if (!level.view) continue;
    // Körper (dunkles Holz) und Lackband mit weißer Zierlinie
    parts.push(box(w, h - 0.14, d, cx, top - 0.14 - (h - 0.14) / 2, cz, 0x9a6232, { r: 0.08, seg: 1, bottomShade: 0.6 }));
    parts.push(box(w + 0.06, 0.26, d + 0.06, cx, top - 0.3, cz, lack, { r: 0.06, seg: 1 }));
    parts.push(box(w + 0.08, 0.05, d + 0.08, cx, top - 0.16, cz, 0xffffff, { r: 0.02, seg: 1 }));
    // Planken (je ≈ 0,62 m, schmale Fugen)
    const along = o.planks ?? (d >= w * 0.6 ? 'x' : 'z');
    const L = along === 'x' ? d : w, n = Math.max(2, Math.round(L / 0.62)), step = L / n;
    for (let i = 0; i < n; i++) {
      const tone = [0xf0c088, 0xe2ac6e, 0xeab87e, 0xd9a062][(i * 7 + li) % 4];
      if (along === 'x') parts.push(box(w - 0.04, 0.13, step - 0.06, cx, top - 0.065, za + (i + 0.5) * step, tone, { r: 0.03, seg: 1, sideShade: 0.15 }));
      else parts.push(box(step - 0.06, 0.13, d - 0.04, xa + (i + 0.5) * step, top - 0.065, cz, tone, { r: 0.03, seg: 1, sideShade: 0.15 }));
    }
    // Stelzen mit Sternanker und Kreuzstreben
    if (o.legs !== false) {
      const leg = o.leg ?? Math.min(6, 2.4 + (w + d) * 0.1);
      const lx = Math.max(0.5, w / 2 - 0.7), lz = Math.max(0.5, d / 2 - 0.7);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const x = cx + sx * lx, z = cz + sz * lz, y1 = top - h, y0 = y1 - leg;
        parts.push(box(0.3, leg, 0.3, x, (y0 + y1) / 2, z, 0x7a4a22, { r: 0.05, seg: 1 }));
        const g = new THREE.OctahedronGeometry(0.34, 0);
        g.scale(1, 1.25, 1); g.translate(x, y0 - 0.28, z);
        glow.push(colorize(g, solidCol(0xffd84a)));
      }
      for (const sz of [-1, 1]) parts.push(box(2 * lx, 0.18, 0.16, cx, top - h - leg * 0.45, cz + sz * lz, 0x8a5a2a, { r: 0.03, seg: 1 }));
    }
  }
  if (parts.length) addStatic(level, merge(parts));
  if (glow.length) addStatic(level, merge(glow), { material: 'glow', castShadow: false });
}

/** Dreieck (beidseitig) als nicht indizierte Geometrie, einfarbig. */
function tri(a, b, c, col) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([...a, ...b, ...c, ...b, ...a, ...c]), 3));
  g.computeVertexNormals();
  return colorize(g, solidCol(col));
}

/**
 * Wimpelketten: je { from: [x, y, z], to: [x, y, z], n: 12, sag: 0.6, colors, size, poles, y0 } bunte Dreiecksfähnchen an einer
 * Schnur (beidseitig, ohne Schatten); poles: true → weiße Masten mit goldenem Knauf bis y0.
 */
export function wimpel(level, list) {
  if (!level.view) return;
  const parts = [];
  const COLS = [0xe8403a, 0xffc81a, 0x3a8aff, 0x4ccf5a, 0xff7ac0, 0xa865ff, 0xff8a2a];
  for (const w of list) {
    const [ax, ay, az] = w.from, [bx, by, bz] = w.to, n = w.n ?? 12, sag = w.sag ?? 0.6, cols = w.colors ?? COLS;
    const P = (t) => [ax + (bx - ax) * t, ay + (by - ay) * t - Math.sin(t * PI) * sag, az + (bz - az) * t];
    const len = Math.hypot(bx - ax, bz - az) || 1, ux = (bx - ax) / len, uz = (bz - az) / len;
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < 16; i++) {
      const p0 = P(i / 16), p1 = P((i + 1) / 16);
      const dv = new THREE.Vector3(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
      const g = new THREE.CylinderGeometry(0.025, 0.025, dv.length(), 3, 1);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dv.normalize()));
      g.translate((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2);
      parts.push(colorize(g, solidCol(0xf4f0e8)));
    }
    for (let i = 0; i < n; i++) {
      const [x, y, z] = P((i + 0.5) / n), s = w.size ?? 0.42;
      parts.push(tri([x - ux * s / 2, y, z - uz * s / 2], [x + ux * s / 2, y, z + uz * s / 2], [x, y - s * 1.1, z], cols[i % cols.length]));
    }
    if (w.poles) for (const [px, py, pz] of [w.from, w.to]) {
      const y0 = w.y0 ?? 0;
      parts.push(box(0.16, py - y0 + 0.3, 0.16, px, (py + y0 + 0.3) / 2, pz, 0xf4f0e8, { r: 0.04, seg: 1 }));
      parts.push(box(0.3, 0.3, 0.3, px, py + 0.4, pz, 0xffc81a, { r: 0.12, seg: 2 }));
    }
  }
  addStatic(level, merge(parts), { castShadow: false });
}

/**
 * Turnhallen-Kulisse im All (S-3), statisch: je { kind, pos, … }: matte (Turnmatte: size [w, d], color), pylon (Hütchen),
 * ball (Medizinball: r, color; solid), kasten (Sprungkasten: size [w, h, d]; solid), lampe (Sternlampe auf Stange: height,
 * color; leuchtet), fahne (Fahnenmast mit Fahne und Leuchtstern: height, color, yaw), reifen (stehender Turnreifen: r, color, yaw).
 */
export function turnzeug(level, list) {
  const parts = [], glow = [];
  for (const it of list) {
    const [x, y, z] = it.pos;
    if (it.kind === 'ball' && it.solid) level.world.add({ type: 'cyl', x, z, r: (it.r ?? 0.45) * 0.9, y0: y, y1: y + 2 * (it.r ?? 0.45), tag: 'ball' });
    if (it.kind === 'kasten' && it.solid) { const [w, h, d] = it.size ?? [1.6, 1.2, 1]; level.world.add({ type: 'box', min: [x - w / 2, y, z - d / 2], max: [x + w / 2, y + h, z + d / 2], tag: 'kasten' }); }
    if (!level.view) continue;
    if (it.kind === 'matte') {
      const [w, d] = it.size ?? [3, 2];
      parts.push(box(w, 0.16, d, x, y + 0.08, z, it.color ?? 0x3a7aff, { r: 0.07, seg: 2 }));
      parts.push(box(w + 0.02, 0.04, 0.08, x, y + 0.15, z - d / 2 + 0.1, 0xffffff, { r: 0.02, seg: 1 }), box(w + 0.02, 0.04, 0.08, x, y + 0.15, z + d / 2 - 0.1, 0xffffff, { r: 0.02, seg: 1 }));
    } else if (it.kind === 'pylon') {
      const g = new THREE.ConeGeometry(0.28, 0.7, 10, 3);
      g.translate(x, y + 0.43, z);
      parts.push(colorize(g, (p, n, o) => mixc(lin(0xff5a1a), lin(0xffffff), Math.floor((p.y - y) / 0.2) % 2 ? 1 : 0, o)));
      parts.push(box(0.62, 0.08, 0.62, x, y + 0.04, z, 0xff5a1a, { r: 0.03, seg: 1 }));
    } else if (it.kind === 'ball') {
      const r = it.r ?? 0.45;
      const g = new THREE.SphereGeometry(r, 12, 8);
      g.translate(x, y + r, z);
      const c = lin(it.color ?? 0xe8403a), w = lin(0xffffff);
      parts.push(colorize(g, (p, n, o) => mixc(c, w, Math.abs(n.y) < 0.12 ? 0.9 : 0, o)));
    } else if (it.kind === 'kasten') {
      const [w, h, d] = it.size ?? [1.6, 1.2, 1];
      const n = Math.max(2, Math.round(h / 0.3));
      for (let i = 0; i < n; i++) parts.push(box(w * (1 - i * 0.03), h / n - 0.02, d * (1 - i * 0.03), x, y + (i + 0.5) * (h / n), z, i === n - 1 ? 0xf4ecd8 : 0xc8884a, { r: 0.05, seg: 1 }));
    } else if (it.kind === 'lampe' || it.kind === 'fahne') {
      const hgt = it.height ?? 2.6;
      parts.push(box(0.12, hgt, 0.12, x, y + hgt / 2, z, 0xf4f0e8, { r: 0.03, seg: 1 }));
      parts.push(box(0.4, 0.14, 0.4, x, y + 0.07, z, 0x8a5a2a, { r: 0.04, seg: 1 }));
      if (it.kind === 'lampe') {
        const g = new THREE.OctahedronGeometry(0.36, 0);
        g.scale(1, 1.2, 0.55); g.translate(x, y + hgt + 0.3, z);
        glow.push(colorize(g, solidCol(it.color ?? 0xffe04a)));
      } else {
        const yaw = it.yaw ?? 0, col = LACK[it.color] ?? it.color ?? LACK.rot, fw = 1.2, fh = 0.75;
        const c = Math.cos(yaw), sn = Math.sin(yaw), top = y + hgt;
        const P = (u, v) => [x + c * u, top - v, z - sn * u];
        const wav = (u) => Math.sin(u * 2.6) * 0.08;
        for (let i = 0; i < 3; i++) {
          const u0 = 0.06 + (i / 3) * fw, u1 = 0.06 + ((i + 1) / 3) * fw;
          const a = P(u0, 0), b = P(u1, 0), cc = P(u1, fh), dd = P(u0, fh);
          for (const q of [a, b, cc, dd]) { const k = q === a || q === dd ? wav(u0) : wav(u1); q[0] += sn * k; q[2] += c * k; }
          parts.push(tri(a, b, cc, col), tri(a, cc, dd, col));
        }
        const st = new THREE.OctahedronGeometry(0.17, 0);
        st.translate(x + c * 0.66, top - fh / 2, z - sn * 0.66);
        glow.push(colorize(st, solidCol(0xfff0a0)));
      }
    } else if (it.kind === 'reifen') {
      const r = it.r ?? 0.8;
      const g = new THREE.TorusGeometry(r, 0.07, 6, 24);
      g.rotateY(it.yaw ?? 0); g.translate(x, y + r + 0.05, z);
      parts.push(colorize(g, solidCol(LACK[it.color] ?? it.color ?? LACK.gelb)));
    }
  }
  if (parts.length) addStatic(level, merge(parts));
  if (glow.length) addStatic(level, merge(glow), { material: 'glow', castShadow: false });
}
