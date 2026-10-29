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

const BLUMEN = [0xff4a4a, 0xffffff, 0xffd23a, 0xff8ad0, 0x5aa8ff, 0xffa03a];
/** Pixelblume (Würfel: Stiel, zwei Blätter, Kreuz aus Blütenblättern um eine gelbe Mitte), Fuß bei (x, y, z), Größe s. */
function pixelblume(parts, x, y, z, s, col) {
  const B = (w, h, d, px, py, pz, c, k = 1) => {
    const g = new THREE.BoxGeometry(w * s, h * s, d * s).toNonIndexed();
    g.translate(x + px * s, y + py * s, z + pz * s);
    const cc = lin(c);
    parts.push(colorize(g, (p, n, o) => { const f = (n.y > 0.5 ? 1.1 : n.y < -0.5 ? 0.55 : 0.82 + n.z * 0.1) * k; o[0] = cc[0] * f; o[1] = cc[1] * f; o[2] = cc[2] * f; }));
  };
  B(0.07, 0.42, 0.07, 0, 0.21, 0, 0x2a9a2a);
  B(0.16, 0.05, 0.08, -0.1, 0.14, 0, 0x4ac83a); B(0.16, 0.05, 0.08, 0.1, 0.22, 0, 0x4ac83a);
  B(0.13, 0.1, 0.13, 0, 0.47, 0, 0xffd23a);
  for (const [px, pz] of [[0.13, 0], [-0.13, 0], [0, 0.13], [0, -0.13]]) B(0.13, 0.08, 0.13, px, 0.46, pz, col);
}

/**
 * S-5 Wiesen-Kulisse (ohne Form): o.y Höhe der Wiese tief unten (Thema blockland: Levelboden − 20); o.fluesse [{ pts: [[x, z], …],
 * width }] gewundene Bäche mit Sandufer und Glitzern; o.baeume [[x, z, s]] runde Pixelbäume auf der Wiese; o.beete [[x, z, r, n]]
 * Blumenbeete (große Pixelblumen) auf der Wiese; o.blumen [[x, y, z, s?]] kleine Pixelblumen auf den Grasinseln;
 * o.inselRand [[x0, x1, zA, zB, top, skip?]] streut Blumen entlang der Inselränder (skip: [[x, z, r]] frei halten).
 */
export function wiesenDeko(level, o = {}) {
  if (!level.view) return;
  const parts = [], Y = o.y ?? -25;
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed & 0xffff) / 0xffff; };
  // Bäche (Band entlang einer weichen Kurve)
  for (const f of o.fluesse ?? []) {
    const curve = new THREE.CatmullRomCurve3(f.pts.map(([x, z]) => new THREE.Vector3(x, 0, z)));
    const N = Math.max(8, Math.round(curve.getLength() / 3));
    const pts = curve.getSpacedPoints(N), W = f.width ?? 6;
    const ribbon = (half, y, colFn) => {
      const pos = [], col = [];
      for (let i = 0; i < N; i++) {
        const a = pts[i], b = pts[i + 1];
        const t0 = curve.getTangentAt(i / N), t1 = curve.getTangentAt((i + 1) / N);
        const n0 = [-t0.z, t0.x], n1 = [-t1.z, t1.x];
        const A = [a.x + n0[0] * half, y, a.z + n0[1] * half], Bq = [a.x - n0[0] * half, y, a.z - n0[1] * half];
        const Cq = [b.x + n1[0] * half, y, b.z + n1[1] * half], D = [b.x - n1[0] * half, y, b.z - n1[1] * half];
        for (const [q, e] of [[A, 1], [Cq, 1], [Bq, -1], [Bq, -1], [Cq, 1], [D, -1]]) { pos.push(...q); col.push(...colFn(e, i)); }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      // Dreiecke nach oben ausrichten
      const P = g.attributes.position;
      for (let i = 0; i < P.count; i += 3) {
        const ax = P.getX(i), az = P.getZ(i), bx = P.getX(i + 1), bz = P.getZ(i + 1), cx = P.getX(i + 2), cz = P.getZ(i + 2);
        if ((bx - ax) * (cz - az) - (bz - az) * (cx - ax) > 0) { P.setXYZ(i + 1, cx, y, cz); P.setXYZ(i + 2, bx, y, bz); }
      }
      g.computeVertexNormals();
      return g;
    };
    const sand = lin(0xf4d890), sandD = lin(0xd8b468), deep = lin(0x2a78e8), light = lin(0x6ac8ff);
    parts.push(ribbon(W / 2 + 1.3, Y + 0.04, (e) => (e > 0 ? sand : sandD)));
    parts.push(ribbon(W / 2, Y + 0.08, (e, i) => { const k = 0.5 + 0.5 * Math.sin(i * 0.7); const c = [0, 0, 0]; mixc(deep, light, 0.25 + 0.35 * k, c); return c; }));
    for (let i = 1; i < N; i += 2) {
      const p = pts[i], t = curve.getTangentAt(i / N), off = (rnd() - 0.5) * W * 0.6;
      const g = new THREE.BoxGeometry(0.4 + rnd() * 0.8, 0.04, 0.16).toNonIndexed();
      g.rotateY(-Math.atan2(t.z, t.x)); g.translate(p.x - t.z * off, Y + 0.12, p.z + t.x * off);
      parts.push(colorize(g, solidCol(0xe8f8ff)));
    }
  }
  // Pixelbäume
  for (const [x, z, s = 1] of o.baeume ?? []) {
    const tr = new THREE.CylinderGeometry(0.45 * s, 0.6 * s, 4.5 * s, 6, 1).toNonIndexed();
    tr.translate(x, Y + 2.25 * s, z);
    parts.push(colorize(tr, (p, n, out) => mixc(lin(0x7a4a2a), lin(0xb87a4a), smooth(-0.6, 0.8, n.x * 0.5 + n.z * 0.5), out)));
    const lo = lin(0x2a9a3a), hi = lin(0x8ae85a);
    for (const [dx, dy, dz, r] of [[0, 5.6, 0, 2.6], [1.4, 4.6, 0.6, 1.7], [-1.2, 4.8, -0.8, 1.8]]) {
      const c = new THREE.SphereGeometry(r * s, 10, 7).toNonIndexed();
      c.translate(x + dx * s, Y + dy * s, z + dz * s);
      parts.push(colorize(c, (p, n, out) => mixc(lo, hi, smooth(-0.5, 0.9, n.y * 0.8 - n.x * 0.2), out)));
    }
  }
  // Blumenbeete auf der Wiese (große Blumen)
  for (const [x, z, r, n = 8] of o.beete ?? []) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * 2 * PI, d = Math.sqrt(rnd()) * r;
      pixelblume(parts, x + Math.cos(a) * d, Y, z + Math.sin(a) * d, 3.2 + rnd(), BLUMEN[Math.floor(rnd() * BLUMEN.length)]);
    }
  }
  // kleine Blumen auf den Inseln (einzeln bzw. als Tupfer [x, y, z, r, n])
  for (const [x, y, z, s = 1, c] of o.blumen ?? []) pixelblume(parts, x, y, z, s, c ?? BLUMEN[Math.floor(rnd() * BLUMEN.length)]);
  for (const [x, y, z, r = 1.2, n = 5] of o.tupfer ?? []) {
    const c0 = Math.floor(rnd() * BLUMEN.length);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 2 * PI + rnd() * 0.8, d = i === 0 ? 0 : r * (0.45 + rnd() * 0.55);
      pixelblume(parts, x + Math.cos(a) * d, y, z + Math.sin(a) * d, 0.9 + rnd() * 0.45, BLUMEN[(c0 + (i % 2) * 2) % BLUMEN.length]);
    }
  }
  // Felsbrocken (grau, oben Moos): [x, y, z, s]
  for (const [x, y, z, s = 1] of o.steine ?? []) {
    for (let i = 0; i < 2; i++) {
      const r = (i ? 0.32 : 0.5) * s;
      const g = new THREE.IcosahedronGeometry(r, 0).toNonIndexed();
      g.scale(1.25, 0.8, 1); g.rotateY(rnd() * PI);
      g.translate(x + (i ? 0.55 * s : 0), y + r * 0.62, z + (i ? 0.3 * s : 0));
      parts.push(faceColor(g, (cx, cy, cz, out) => { const c = lin(cy > y + r * 0.95 ? 0x6ac84a : ((Math.floor(cx * 7 + cz * 5) & 1) ? 0xa8a4b4 : 0x8e8a9c)); out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; }));
      parts[parts.length - 1].computeVertexNormals();
    }
  }
  // Feldwege (Sand-Schachbrett im Raster der Grasdecke, knapp darüber): [x0, x1, zA, zB, top]
  const S1 = lin(0xf6dca0), S2 = lin(0xe8c47e);
  for (const [x0, x1, zA, zB, top] of o.wege ?? []) {
    const za = Math.min(zA, zB), zb = Math.max(zA, zB), pos = [], col = [];
    for (let z = za; z < zb - 1e-3; z = Math.min(zb, Math.floor(z + 1 + 1e-4))) {
      const z1 = Math.min(zb, Math.floor(z + 1 + 1e-4));
      for (let x = x0; x < x1 - 1e-3; x += 1) {
        const c = ((Math.floor(x + 1e-4) + Math.floor(z + 1e-4)) & 1) ? S2 : S1, y = top + 0.015;
        pos.push(x, y, z, x, y, z1, x + 1, y, z1, x, y, z, x + 1, y, z1, x + 1, y, z);
        for (let k = 0; k < 6; k++) col.push(c[0], c[1], c[2]);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    parts.push(g);
  }
  for (const [x0, x1, zA, zB, top, skip = []] of o.inselRand ?? []) {
    const za = Math.min(zA, zB), zb = Math.max(zA, zB);
    for (const side of [-1, 1]) {
      const x = side < 0 ? x0 + 0.6 : x1 - 0.6;
      for (let z = zb - 1.2; z > za + 0.8; z -= 2.2 + rnd() * 1.6) {
        if (skip.some(([sx, sz, sr]) => Math.hypot(sx - x, sz - z) < sr)) continue;
        const n = 1 + Math.floor(rnd() * 2.4);
        for (let i = 0; i < n; i++) pixelblume(parts, x - side * (rnd() * 0.5), top, z - i * 0.42 + rnd() * 0.2, 0.9 + rnd() * 0.4, BLUMEN[Math.floor(rnd() * BLUMEN.length)]);
      }
    }
  }
  if (parts.length) addStatic(level, merge(parts), { castShadow: false });
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
    const W = lin(0xffffff), S = lin(o.tint ?? 0xdce8fa), D = lin(0xc4d4f0), U = lin(o.under ?? 0xf6c4e4), L = lin(0xd8c8ff);
    // oben weiß, Seiten lavendelblau, Unterseiten rosa (Abendlicht von unten)
    const shadeC = (p, n, out) => {
      mixc(D, W, smooth(-0.7, 0.75, n.y * 0.85 + n.z * 0.12), out);
      if (n.y < 0.2) mixc(out, S, 0.4, out);
      if (n.y < 0.1) mixc(out, L, smooth(0.1, -0.4, n.y) * 0.35, out);
      if (n.y < -0.15) mixc(out, U, smooth(-0.15, -0.85, n.y) * 0.75, out);
    };
    // Decke (flach, Kanten weich)
    const slab = box(xb - xa, 0.5, zb - za, (xa + xb) / 2, top - 0.25, (za + zb) / 2, 0xffffff, { r: 0.24, seg: 2 });
    colorize(slab, shadeC);
    parts.push(slab);
    // Wolkenmuster auf der Decke: weiche Pastell-Wirbel (lila, rosa, himmelblau) in einem feinen Raster knapp darüber
    if (o.muster !== false) {
      const w = xb - xa - 0.5, d = zb - za - 0.5, cx = (xa + xb) / 2, cz = (za + zb) / 2;
      const pl = new THREE.PlaneGeometry(w, d, Math.max(1, Math.round(w / 0.9)), Math.max(1, Math.round(d / 0.9)));
      pl.rotateX(-PI / 2); pl.translate(cx, top + 0.012, cz);
      const P1 = lin(0xe6d6ff), P2 = lin(0xffd6ea), P3 = lin(0xd2ecff);
      parts.push(colorize(pl.toNonIndexed(), (p, n, out) => {
        const f = Math.sin(p.x * 0.52 + Math.sin(p.z * 0.29) * 1.8) * Math.cos(p.z * 0.43 + Math.sin(p.x * 0.21) * 1.4);
        const g = Math.sin(p.x * 0.31 - p.z * 0.37 + 1.3) * Math.sin(p.z * 0.19 + 0.7);
        out[0] = W[0]; out[1] = W[1]; out[2] = W[2];
        mixc(out, P1, smooth(0.35, 0.95, f) * 0.55, out);
        mixc(out, P2, smooth(0.4, 0.95, -f) * 0.5, out);
        mixc(out, P3, smooth(0.5, 1, g) * 0.4, out);
        // Rand der Decke leicht heller (geht in die Bäusche über)
        const e = Math.max(Math.abs(p.x - cx) / (w / 2), Math.abs(p.z - cz) / (d / 2));
        mixc(out, W, smooth(0.8, 1, e) * 0.8, out);
      }));
    }
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

/** Farben je Dreieck (Mittelpunkt) statt je Ecke – für scharfe Streifen. fn(cx, cy, cz, out). */
function faceColor(g, fn) {
  if (g.index) g = g.toNonIndexed();
  const P = g.attributes.position, col = new Float32Array(P.count * 3), out = [0, 0, 0];
  for (let i = 0; i + 2 < P.count; i += 3) {
    const cx = (P.getX(i) + P.getX(i + 1) + P.getX(i + 2)) / 3, cy = (P.getY(i) + P.getY(i + 1) + P.getY(i + 2)) / 3, cz = (P.getZ(i) + P.getZ(i + 1) + P.getZ(i + 2)) / 3;
    fn(cx, cy, cz, out);
    for (let k = 0; k < 3; k++) col.set(out, (i + k) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.deleteAttribute('uv');
  return g;
}

let BALLON_GEO = null, LUFT_GEO = null;
/** Luftballon an der Schnur (Ursprung = Schnurende unten, Ballon oben; weiß – die Instanzfarbe färbt ihn). */
function ballonGeo() {
  if (BALLON_GEO) return BALLON_GEO;
  const s = new THREE.CylinderGeometry(0.014, 0.014, 1.5, 3, 1);
  s.translate(0, 0.75, 0);
  const b = new THREE.SphereGeometry(0.36, 10, 7);
  b.scale(1, 1.18, 1); b.translate(0, 1.5 + 0.44, 0);
  const k = new THREE.ConeGeometry(0.07, 0.12, 5);
  k.translate(0, 1.5 + 0.03, 0);
  const g = lin(0xffffff), dk = lin(0xc8c8d0);
  BALLON_GEO = merge([colorize(s, solidCol(0xf4f4f4)), colorize(b.toNonIndexed(), (p, n, o) => mixc(dk, g, smooth(-0.8, 0.6, n.y * 0.7 + n.x * 0.3), o)), colorize(k.toNonIndexed(), solidCol(0xd8d8e0))]);
  return BALLON_GEO;
}
/** Heißluftballon (Hülle mit Streifen, Korb, Seile; Ursprung = Korbboden). Instanzfarbe färbt die Hülle (Streifen weiß/gelb). */
function luftGeo() {
  if (LUFT_GEO) return LUFT_GEO;
  const R = 2.2;
  const env = new THREE.SphereGeometry(R, 12, 9);
  const P = env.attributes.position;
  for (let i = 0; i < P.count; i++) { const y = P.getY(i); if (y < 0) { const f = 1 - (-y / R) * 0.62; P.setX(i, P.getX(i) * f); P.setZ(i, P.getZ(i) * f); } }
  env.computeVertexNormals();
  env.translate(0, 1.6 + R * 1.05, 0);
  const a = lin(0xffffff), b2 = lin(0xfff0a0), lo = lin(0xd8d8e0);
  const envC = faceColor(env, (x, y, z, o) => { const s = Math.floor(((Math.atan2(z, x) + PI) / (2 * PI)) * 12) % 2; mixc(s ? a : b2, lo, smooth(1.6 + R * 1.4, 1.6, y) * 0.25, o); });
  const basket = colorize(new THREE.BoxGeometry(0.8, 0.55, 0.8).translate(0, 0.28, 0).toNonIndexed(), solidCol(0x9a5a2a));
  const rim = colorize(new THREE.BoxGeometry(0.88, 0.1, 0.88).translate(0, 0.56, 0).toNonIndexed(), solidCol(0x6a3a1a));
  const ropes = [];
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const r = new THREE.CylinderGeometry(0.02, 0.02, 1.3, 3, 1);
    r.rotateX(sz * 0.22); r.rotateZ(-sx * 0.22); r.translate(sx * 0.5, 1.2, sz * 0.5);
    ropes.push(colorize(r.toNonIndexed(), solidCol(0xc8a070)));
  }
  LUFT_GEO = { env: envC, basket: merge([basket, rim, ...ropes]) };
  return LUFT_GEO;
}

/**
 * S-4 Himmels-Kulisse (ohne Form): o.ballons [{ pos: [x, y, z], n: 3, colors }] Luftballon-Trauben an den Wolken (eine
 * Instanzgruppe, jeder Ballon wippt für sich); o.heissluft [[x, y, z, color, scale]] Heißluftballons (schweben auf und ab;
 * Hülle + Korb je eine Instanzgruppe); o.blueten [[x, y, z, color, scale]] Pastell-Wolkenblüten flach auf den Wolken
 * (statisch); o.zielbogen { pos, width, height } Ziel-Torbogen mit Regenbogen-Pfeilern und Schachbrett-Banner.
 */
export function himmelsDeko(level, o = {}) {
  if (!level.view) return;
  const COLS = [0xff5a7a, 0xffc83a, 0x4aa8ff, 0x5ad86a, 0xb87aff, 0xff9a3a, 0xff7ad0, 0x3ad8d0];
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
  // Luftballons
  const bl = [];
  let ci = 0;
  for (const t of o.ballons ?? []) {
    const n = t.n ?? 3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 2 * PI + (t.yaw ?? 0);
      bl.push({ x: t.pos[0], y: t.pos[1], z: t.pos[2], ax: Math.cos(a), az: Math.sin(a), tilt: 0.16 + (i % 2) * 0.12, s: 0.85 + ((i * 7) % 5) * 0.06, ph: i * 1.7 + t.pos[2] * 0.3,
        col: (t.colors ?? COLS)[(ci++) % (t.colors ?? COLS).length] });
    }
  }
  if (bl.length) {
    const im = new THREE.InstancedMesh(ballonGeo(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.05 }), bl.length);
    im.name = 'ballons'; im.castShadow = false; im.receiveShadow = false;
    bl.forEach((b, i) => im.setColorAt(i, _c.setHex(b.col)));
    const bb = new THREE.Box3();
    for (const b of bl) { bb.expandByPoint(_v.set(b.x, b.y, b.z)); bb.expandByPoint(_v.set(b.x, b.y + 2.6, b.z)); }
    bb.expandByScalar(1.2);
    im.boundingSphere = bb.getBoundingSphere(new THREE.Sphere());
    const holder = {};
    let tt = 0;
    addObject(level, im, (dt) => {
      tt += visDt(level, holder, dt);
      bl.forEach((b, i) => {
        const w = Math.sin(tt * 1.3 + b.ph) * 0.07, tl = b.tilt + Math.sin(tt * 0.9 + b.ph * 1.3) * 0.04;
        _e.set(b.az * tl + w * 0.5, Math.sin(tt * 0.4 + b.ph) * 0.6, -b.ax * tl + w, 'YXZ');
        im.setMatrixAt(i, _m.compose(_v.set(b.x, b.y, b.z), _q.setFromEuler(_e), _s.set(b.s, b.s, b.s)));
      });
      im.instanceMatrix.needsUpdate = true;
    });
  }
  // Heißluftballons
  const hl = (o.heissluft ?? []).map(([x, y, z, col, s = 1], i) => ({ x, y, z, col: col ?? COLS[i % COLS.length], s, ph: i * 2.1 }));
  if (hl.length) {
    const G = luftGeo();
    const mk = (geo, colored) => {
      const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 }), hl.length);
      im.castShadow = false; im.receiveShadow = false; im.frustumCulled = false;
      if (colored) hl.forEach((b, i) => im.setColorAt(i, _c.setHex(b.col)));
      return im;
    };
    const env = mk(G.env, true), bas = mk(G.basket, false);
    env.name = 'heissluft'; bas.name = 'heissluft_korb';
    const grp = new THREE.Group();
    grp.add(env, bas);
    const holder = {};
    let tt = 0;
    addObject(level, grp, (dt) => {
      tt += visDt(level, holder, dt);
      hl.forEach((b, i) => {
        _m.compose(_v.set(b.x + Math.sin(tt * 0.11 + b.ph) * 1.5, b.y + Math.sin(tt * 0.5 + b.ph) * 0.8, b.z), _q.setFromEuler(_e.set(0, tt * 0.08 + b.ph, Math.sin(tt * 0.7 + b.ph) * 0.03)), _s.set(b.s, b.s, b.s));
        env.setMatrixAt(i, _m); bas.setMatrixAt(i, _m);
      });
      env.instanceMatrix.needsUpdate = true; bas.instanceMatrix.needsUpdate = true;
    });
  }
  // Wolkenblüten (flach, fünf Blätter um eine goldene Mitte)
  const parts = [];
  const PAST = [0xff9ad0, 0xb89aff, 0x8ad0ff, 0xffd27a, 0x9ae8b8, 0xffa8a0];
  (o.blueten ?? []).forEach(([x, y, z, col, s = 1], i) => {
    const c = col ?? PAST[i % PAST.length], rot = i * 0.7;
    for (let k = 0; k < 5; k++) {
      const a = rot + (k / 5) * 2 * PI;
      const g = new THREE.SphereGeometry(0.13 * s, 6, 3);
      g.scale(1.7, 0.35, 1); g.rotateY(-a); g.translate(x + Math.cos(a) * 0.2 * s, y + 0.05, z + Math.sin(a) * 0.2 * s);
      const cc = lin(c), hi = lin(0xffffff);
      parts.push(colorize(g.toNonIndexed(), (p, n, out) => mixc(cc, hi, smooth(0.6, 1, n.y) * 0.25, out)));
    }
    const m = new THREE.SphereGeometry(0.09 * s, 6, 4);
    m.scale(1, 0.6, 1); m.translate(x, y + 0.08, z);
    parts.push(colorize(m.toNonIndexed(), solidCol(0xffd23a)));
  });
  // Ziel-Torbogen
  const zb = o.zielbogen;
  if (zb) {
    const [x, y, z] = zb.pos, W = zb.width ?? 12, H = zb.height ?? 6, RB = [0xff4a4a, 0xff9a2a, 0xffd23a, 0x4ad86a, 0x3a9aff, 0xa86aff];
    for (const sx of [-1, 1]) {
      const n = RB.length, h = H / n;
      for (let i = 0; i < n; i++) parts.push(box(0.9, h - 0.04, 0.9, x + sx * W / 2, y + (i + 0.5) * h, z, RB[i], { r: 0.1, seg: 1 }));
      parts.push(box(1.3, 0.3, 1.3, x + sx * W / 2, y + 0.15, z, 0xffffff, { r: 0.1, seg: 1 }));
    }
    // Schachbrett-Banner (zwei Reihen) und Leiste
    const cell = 0.5, cols = Math.round((W + 0.9) / cell);
    for (let r = 0; r < 2; r++) for (let c = 0; c < cols; c++) {
      parts.push(box(cell, cell, 0.24, x - (cols * cell) / 2 + (c + 0.5) * cell, y + H + 0.1 + (r + 0.5) * cell, z, (r + c) % 2 ? 0x2a2a3a : 0xffffff, { r: 0.02, seg: 1 }));
    }
    parts.push(box(cols * cell + 0.3, 0.16, 0.34, x, y + H + 0.04, z, 0xffc81a, { r: 0.05, seg: 1 }), box(cols * cell + 0.3, 0.16, 0.34, x, y + H + 0.18 + 2 * cell, z, 0xffc81a, { r: 0.05, seg: 1 }));
  }
  if (parts.length) addStatic(level, merge(parts), { castShadow: false });
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
