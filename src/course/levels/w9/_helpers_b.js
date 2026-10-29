// Hilfen der Level S-3, S-4 und S-5 (Bonuswelt Stern „Sternenzelt“). Kein LEVEL – nur Daten-Bausteine und kleine
// Aufbau-/Laufzeit-Haken für diese drei Level (andere Level-Agenten bauen eigene Hilfen).
//
//   deck(x0, x1, zA, zB, top, h, o)    Insel/Deck (Oberseite top) über einem Rechteck
//   line / ring / arc / column          Bitcoin-Pfade (Münzen)
//   sign(x, y, z, text, o)              Holzschild
//   huerden(level, list)                Holz-Athletik: Hürden-Balken (feste Form) mit Pfosten bis zu den Schienen (S-3)
//   versteckteMuenzen(level, o)         unsichtbare Münzen erscheinen nacheinander, sobald eine Figur den Bereich betritt
//   beiZustand(level, id, test, action) Aktion einmal, sobald der Griff level.named.get(id) die Bedingung erfüllt
//   blockSaeule(...)                    S-5: Riesenblock-Säulen (Retro-Blöcke mit Nieten) als statische Geometrie + Form
//   wolke(...)                          S-4: Wattewolken-Insel (Wolkenplattform, fest von oben und von der Seite)

import * as THREE from 'three';
import { box, merge, addStatic, lin, mixc, smooth, colorize } from '../../blocks/kit.js';
import { runAction } from '../../entities/gimmick.js';
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
 * Versteckte Münzen (coins/coin mit hidden: true und group) erscheinen nacheinander (gap s), sobald eine Figur am Boden im
 * Bereich area [x0, x1, z0, z1] (y > ymin) steht. Mit banner: kurze Ansage.
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
      list = level.entities.filter((e) => e.kind === 'coin' && e.hidden && e.alive && !e.removed && e.spec?.group === o.group);
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
