// Hilfen für die Welt-8-Level 8-1 „Stachelstege der Regenfestung“, 8-2 „Pflaumes Dünenrutsche“ und 8-3 „Keksräder in der
// Zuckerfabrik“ (kein Level: exportiert kein LEVEL, die Level-Registry überspringt dieses Modul). Nur für diese drei Level –
// andere Welt-8-Level haben eigene Hilfsdateien. Gemeinsame Dateien werden nicht verändert; alles Level-Lokale hängt sich über
// die offiziellen Aufbau-Haken an (LEVEL.prebuild / LEVEL.build / LEVEL.setup) und über level.onStep / view.onFrame.
//
//   1) Daten-Helfer   isl, line, ring, arc, column, sign (aus den Welt-7-Hilfen), falle (Stachelfalle im Takt), punkt
//   2) Mechanik       (je Level weiter unten)
//   3) Kulisse        (je Level weiter unten)
// Statische Teile gehen über addStatic in die Abschnitts-Meshes (keine zusätzlichen Zeichenaufrufe), belebte Kleinigkeiten
// sind je ein Mesh bzw. eine Instanz-Gruppe ohne Sonnenschatten.

import * as THREE from 'three';
import { lin, hex, addStatic, addObject, Rnd } from '../../blocks/kit.js';
import { visDt } from '../../entities/gimmick.js';
import { isl, line, ring, arc, column, sign } from '../w7/_helpers_a.js';
import { Bld, litTop, gradY } from '../w5/_helpers_b.js';

export { isl, line, ring, arc, column, sign, Bld, litTop, gradY };

const TAU = Math.PI * 2;

// =====================================================================================================================
// 1) Daten-Helfer
// =====================================================================================================================

/** Stachelfalle (Welt-7-Entität, frei stehend): Stahlplatte mit Lochraster, Stacheln fahren im Takt heraus. y = Oberseite. */
export const falle = (id, x, y, z, o = {}) => ({ kind: 'stachelfalle', id, pos: [x, y, z], size: o.size ?? [2.4, 2.2], period: o.period ?? 3.2, up: o.up ?? 1.2, warn: o.warn ?? 0.8, phase: o.phase ?? 0, ...(o.yaw !== undefined ? { yaw: o.yaw } : {}) });

// =====================================================================================================================
// 2) Mechanik
// =====================================================================================================================

/**
 * Fallblöcke ohne Wackel-Schwung (8-1 Stern 2): Ein wackelnder Fallblock (Baustein fallblock_bruecke) schüttelt sich mit
 * ±2,8 m/s; wer in dieser Zeit abspringt, erbte diese zufällige Seitengeschwindigkeit (der Hüpfer zum nächsten Block gelang
 * dann mal, mal nicht). Dieser Haken (LEVEL.setup, läuft nach dem Baustein) lässt die Figur weiter mitwackeln, gibt beim
 * Absprung aber keinen Schwung mehr mit. Nur dieses Level; der Baustein bleibt unverändert.
 */
export function fallblockRuhig(level, id) {
  const h = level.named.get(id);
  if (!h?.blocks) return;
  level.onStep(() => {
    for (const b of h.blocks) if (b.state === 'wackelt') { b.mb.mover.vx = 0; b.mb.mover.vz = 0; }
  });
}

// =====================================================================================================================
// 3) Kulisse 8-1: Regenfestung
// =====================================================================================================================

/** Farben der Regenfestung: nasser blaugrauer Stein mit Moos, bunte Dächer, warmes Fensterlicht. */
export const RF = {
  brick: [0x7684a6, 0x6e7c9e, 0x8290b0, 0x67749a, 0x7a88aa, 0x8896b8],
  moss: [0x5a9a5a, 0x6aac5e, 0x4e8a52],
  mortar: 0x2a3046, cap: 0xb4bed8, capDark: 0x6a7494,
  tile: [0x8a94b2, 0x828cab, 0x96a0bc, 0x7c86a4, 0x9098b4, 0x8690ae],
  roofs: [0xe8423a, 0x9a5ae8, 0x2ab0c8, 0xff9a3a, 0xe85aa8],
  gold: 0xffc83a, red: 0xd8323a, iron: 0x3a3e52, wood: 0x8a5a34, woodDark: 0x5a3a20,
  window: 0xffd27a, lamp: 0xffe2a0, water: 0x5a8ac8,
};

/** Ziegel auf einer senkrechten Fläche (wie w7 ziegel) mit Moos-Flecken: f = { axis, at, a0, a1, y0, y1, dir, row, depth, moss }. */
export function ziegel8(b, f, rnd) {
  const row = f.row ?? 0.56, dep = f.depth ?? 0.12, pal = f.pal ?? RF.brick, gap = 0.06;
  const col = new THREE.Color();
  const mossK = f.moss ?? 0.12;
  for (let y = f.y0, r = 0; y < f.y1 - 0.08; y += row, r++) {
    const h = Math.min(row, f.y1 - y) - gap;
    let a = f.a0 + ((r + (f.shift ?? 0)) % 2 ? -0.55 : 0);
    while (a < f.a1 - 0.1) {
      const e = Math.min(a + rnd.real(0.9, 1.5), f.a1);
      const s = Math.max(a, f.a0), w = e - s - gap;
      if (w > 0.2) {
        // Moos sitzt eher oben an der Kante und unten
        const top = (y - f.y0) / Math.max(1, f.y1 - f.y0);
        const mossy = rnd.frac() < mossK * (top > 0.8 ? 2.2 : top < 0.25 ? 1.6 : 0.6);
        col.set(mossy ? RF.moss[rnd.int(0, RF.moss.length - 1)] : pal[rnd.int(0, pal.length - 1)]).multiplyScalar(0.88 + rnd.frac() * 0.22);
        const m = (s + e) / 2, off = f.at + f.dir * (dep / 2 - 0.02);
        if (f.axis === 'x') b.box(w, h, dep, m, y + gap / 2, off, col.clone(), { r: 0 });
        else b.box(dep, h, w, off, y + gap / 2, m, col.clone(), { r: 0 });
      }
      a = e;
    }
  }
}

/**
 * Mauerfassaden an Inselseiten: rects [[x0, x1, zA, zB, top, sides?, depth?]] – sides aus 'f' (vorn, +z), 'l', 'x' (links/
 * rechts), 'b' (hinten); depth = wie weit die Fassade hinabreicht (Standard 5 m). Oben eine helle, nasse Steinleiste.
 */
export function fassaden8(b, rects, rnd, o = {}) {
  for (const [x0, x1, zA, zB, top, sides, depth] of rects) {
    const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB), y1 = top - 0.12, y0 = top - (depth ?? o.depth ?? 5);
    const S = sides ?? 'flx';
    if (S.includes('f')) ziegel8(b, { axis: 'x', at: z0, a0: x0, a1: x1, y0, y1, dir: 1 }, rnd);
    if (S.includes('l')) ziegel8(b, { axis: 'z', at: x0, a0: z1, a1: z0, y0, y1, dir: -1, shift: 1 }, rnd);
    if (S.includes('x')) ziegel8(b, { axis: 'z', at: x1, a0: z1, a1: z0, y0, y1, dir: 1, shift: 1 }, rnd);
    if (S.includes('b')) ziegel8(b, { axis: 'x', at: z1, a0: x0, a1: x1, y0, y1, dir: -1 }, rnd);
    // Abdeckleiste (nass glänzend) an den sichtbaren Kanten
    const cap = litTop(RF.cap, 0.62);
    if (S.includes('f')) b.box(x1 - x0 + 0.16, 0.18, 0.26, (x0 + x1) / 2, top - 0.2, z0 + 0.08, cap, { r: 0.03 });
    if (S.includes('l')) b.box(0.26, 0.18, z0 - z1, x0 - 0.08, top - 0.2, (z0 + z1) / 2, cap, { r: 0.03 });
    if (S.includes('x')) b.box(0.26, 0.18, z0 - z1, x1 + 0.08, top - 0.2, (z0 + z1) / 2, cap, { r: 0.03 });
    // Tropfnasen (kleine Steinzapfen) unter der Leiste vorn
    if (S.includes('f') && o.drips !== false) for (let x = x0 + 0.9; x < x1 - 0.5; x += rnd.real(1.6, 2.6)) b.cone(0.09, 0.32, x, top - 0.56, z0 + 0.1, RF.capDark, 5, { rx: Math.PI });
  }
}

/**
 * Steinplatten im Verband (nasser Schiefer, ein paar dunkle „Pfützenplatten“ mit Glanzpunkt): rects [[x0, x1, zA, zB, y]],
 * o.avoid [[x0, x1, zA, zB]].
 */
export function platten8(b, rects, rnd, o = {}) {
  const row = o.row ?? 1.1, gap = 0.07, col = new THREE.Color();
  const avoid = o.avoid ?? [];
  const free = (x, z) => !avoid.some((a) => x > a[0] && x < a[1] && z < Math.max(a[2], a[3]) && z > Math.min(a[2], a[3]));
  for (const [x0, x1, zA, zB, y] of rects) {
    const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
    for (let z = z1 + 0.05, r = 0; z < z0 - 0.15; z += row, r++) {
      const d = Math.min(row, z0 - 0.05 - z) - gap;
      if (d < 0.2) continue;
      let x = x0 + 0.05 - (r % 2 ? 0.55 : 0);
      while (x < x1 - 0.15) {
        const e = Math.min(x + rnd.real(0.9, 1.6), x1 - 0.05), s = Math.max(x, x0 + 0.05), w = e - s - gap;
        const cx = (s + e) / 2, cz = z + d / 2;
        if (w > 0.2 && free(cx, cz)) {
          const wet = rnd.frac() < 0.08;
          col.set(wet ? 0x5a6688 : RF.tile[rnd.int(0, RF.tile.length - 1)]).multiplyScalar(0.92 + rnd.frac() * 0.14);
          b.box(w, 0.05, d, cx, y, cz, col.clone(), { r: 0 });
        }
        x = e;
      }
    }
  }
}

/**
 * Brüstung mit Zinnen entlang x oder z: { from: [x, z], to: [x, z], y, h 1.1, t 0.6, merlons true, solid true, faces [±1] }.
 * Niedrig genug, dass die Kamera darüber schaut; die Kollision hält Kinder vom Abgrund fern.
 */
export function bruestung8(level, b, m, rnd) {
  const [ax, az] = m.from, [bx, bz] = m.to;
  const alongX = Math.abs(bx - ax) >= Math.abs(bz - az);
  const H = m.h ?? 1.1, T = m.t ?? 0.6, y = m.y;
  const a0 = alongX ? Math.min(ax, bx) : Math.min(az, bz), a1 = alongX ? Math.max(ax, bx) : Math.max(az, bz);
  const c = alongX ? az : ax, L = a1 - a0, mid = (a0 + a1) / 2;
  const box = (w, h, d, u, yy, v, col, o) => (alongX ? b.box(w, h, d, u, yy, v, col, o) : b.box(d, h, w, v, yy, u, col, o));
  box(L, H, T - 0.1, mid, y, c, RF.mortar, { r: 0 });
  for (const dir of m.faces ?? [1, -1]) ziegel8(b, { axis: alongX ? 'x' : 'z', at: c + dir * (T / 2 - 0.05), a0, a1, y0: y, y1: y + H - 0.12, dir, row: 0.4, depth: 0.1 }, rnd);
  box(L + 0.08, 0.16, T + 0.1, mid, y + H - 0.12, c, litTop(RF.cap, 0.6), { r: 0.02 });
  if (m.merlons !== false) {
    const n = Math.max(1, Math.round(L / 1.6));
    for (let i = 0; i < n; i++) box(Math.min(0.7, L / n - 0.4), 0.42, T - 0.04, a0 + (i + 0.5) * (L / n), y + H + 0.02, c, litTop(RF.cap, 0.55), { r: 0.02 });
  }
  if (m.solid !== false) {
    const top = y + H + (m.merlons === false ? 0 : 0.42);
    level.world.add(alongX ? { type: 'box', min: [a0, y, c - T / 2], max: [a1, top, c + T / 2], tag: 'bruestung', camIgnore: true }
      : { type: 'box', min: [c - T / 2, y, a0], max: [c + T / 2, top, a1], tag: 'bruestung', camIgnore: true });
  }
}

/**
 * Rundturm (Kulisse): { x, y, z, r 1.4, h 7, roof (Farbe), flag true, windows true, solid false, flagColor }.
 * Nasser Stein mit Moosbändern, Zinnenkranz, buntes Spitzdach mit Goldknauf und Wimpel, warm leuchtende Fenster zur Kamera.
 */
export function turm8(level, b, g, t) {
  const { x, y, z } = t, r = t.r ?? 1.4, H = t.h ?? 7;
  b.cyl(r, r * 1.08, H, x, y, z, gradY(0x4e5a7c, 0x8a98ba, y, y + H), 16);
  for (let k = 1; k * 1.5 < H - 0.6; k++) b.torus(r + 0.02, 0.05, x, y + k * 1.5, z, RF.mortar, { rx: Math.PI / 2, ts: 18, rs: 4 });
  b.cyl(r * 1.1, r * 1.14, 0.35, x, y + 0.1, z, 0x4e8a52, 16);                  // Moos am Fuß
  b.cyl(r * 1.24, r, 0.5, x, y + H, z, litTop(RF.cap, 0.6), 16);
  const nm = Math.max(6, Math.round(r * 5));
  for (let i = 0; i < nm; i++) {
    const a = (i / nm) * TAU;
    b.box(0.5, 0.55, 0.38, x + Math.cos(a) * r * 1.14, y + H + 0.5, z + Math.sin(a) * r * 1.14, litTop(RF.cap, 0.55), { yaw: -a + Math.PI / 2, r: 0 });
  }
  const rc = t.roof ?? RF.roofs[0], rh = r * 2.2;
  b.cone(r * 1.36, rh, x, y + H + 0.45, z, litTop(rc, 0.55), 14);
  b.sphere(0.2, x, y + H + 0.45 + rh + 0.12, z, RF.gold, { ws: 8, hs: 6 });
  if (t.flag !== false) {
    const fy = y + H + 0.45 + rh + 0.2;
    b.cyl(0.04, 0.04, 1.4, x, fy, z, RF.iron, 5);
    b.box(1.0, 0.56, 0.04, x + 0.52, fy + 0.78, z, t.flagColor ?? RF.red, { r: 0 });
    b.box(0.26, 0.26, 0.05, x + 0.55, fy + 0.92, z, RF.gold, { r: 0 });
  }
  if (t.windows !== false) {
    for (const [dy, da] of [[0.36, 0], [0.64, 0.6], [0.64, -0.6]]) {
      const a = Math.PI / 2 + da, wx = x + Math.cos(a) * (r + 0.03), wz = z + Math.sin(a) * (r + 0.03);
      g.box(0.38, 0.72, 0.08, wx, y + H * dy, wz, RF.window, { yaw: -a + Math.PI / 2, r: 0 });
      b.box(0.58, 0.12, 0.16, wx, y + H * dy - 0.06, wz, litTop(RF.cap), { yaw: -a + Math.PI / 2, r: 0 });
      b.cone(0.36, 0.32, wx, y + H * dy + 0.72, wz, litTop(rc, 0.6), 4, { yaw: -a + Math.PI / 4 });
    }
  }
  if (t.solid) level.world.add({ type: 'cyl', x, z, r: r * 1.05, y0: y, y1: y + H + 1, tag: 'turm' });
}

/** Schmaler Steg: niedrige Bordsteine an beiden Seiten (nur Optik) und Laternenpfähle mit warmem Licht. */
export function stegRand8(b, g, s, rnd) {
  const [x0, x1, zA, zB, y] = s;
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  const alongX = x1 - x0 > z0 - z1;
  // in Steg-Koordinaten: u entlang, v quer
  const a0 = alongX ? x0 : z1, a1 = alongX ? x1 : z0, v0 = alongX ? z1 : x0, v1 = alongX ? z0 : x1;
  const B = (w, h, d, u, yy, v, col, o) => (alongX ? b.box(w, h, d, u, yy, v, col, o) : b.box(d, h, w, v, yy, u, col, o));
  for (const v of [v0 + 0.14, v1 - 0.14]) {
    for (let u = a0 + 0.1; u < a1 - 0.2; u += 1.1) B(Math.min(1.0, a1 - 0.1 - u), 0.16, 0.24, u + 0.5, y, v, litTop(RF.cap, 0.65), { r: 0.03 });
  }
  if (s[5] !== false) {
    const n = Math.max(1, Math.floor((a1 - a0) / 6));
    for (let i = 0; i < n; i++) {
      const u = a0 + (i + 0.5) * ((a1 - a0) / n), v = i % 2 ? v1 + 0.2 : v0 - 0.2;
      const px = alongX ? u : v, pz = alongX ? v : u;
      b.cyl(0.07, 0.09, 2.2, px, y - 0.6, pz, RF.iron, 6);
      b.box(0.36, 0.08, 0.36, px, y + 1.6, pz, RF.iron, { r: 0 });
      g.box(0.24, 0.32, 0.24, px, y + 1.68, pz, RF.lamp, { r: 0 });
      b.cone(0.3, 0.26, px, y + 2.0, pz, litTop(RF.roofs[rnd.int(0, 3)], 0.6), 4, { yaw: Math.PI / 4 });
    }
  }
}

/**
 * 8-1: Regenfestungs-Kulisse. o: { Y, plaetze: [[x0, x1, zA, zB, sides?]], stege: [[x0, x1, zA, zB]], avoid, mauern, tuerme }.
 */
export function regenfestung81(level, o) {
  const { Y } = o;
  const rnd = new Rnd(8181);
  const b = new Bld(), g = new Bld();
  fassaden8(b, [...o.plaetze.map(([x0, x1, zA, zB, sides]) => [x0, x1, zA, zB, Y, sides ?? 'flx', 6]), ...o.stege.map(([x0, x1, zA, zB]) => [x0, x1, zA, zB, Y, 'flx', 1.6])], rnd);
  platten8(b, [...o.plaetze, ...o.stege].map(([x0, x1, zA, zB]) => [x0, x1, zA, zB, Y]), rnd, { avoid: o.avoid });
  for (const s of o.stege) stegRand8(b, g, [s[0], s[1], s[2], s[3], Y, s[4]], rnd);
  for (const m of o.mauern ?? []) bruestung8(level, b, { y: Y, ...m }, rnd);
  for (const t of o.tuerme ?? []) turm8(level, b, g, t);
  b.flush(level, { castShadow: false });
  g.flush(level, { material: 'glow', castShadow: false });
}

// =====================================================================================================================
// 4) 8-2 „Pflaumes Dünenrutsche“: das Ritt-Netz (Archetyp ride, Baustein river Form A) als Sandstrom
// =====================================================================================================================

/** Farben des Ritt-Netzes als Düne (ersetzt theme.jungle nur in diesem Level): Sandstrom, Dünenkämme, Sandstein. */
export const SAND8 = {
  water: 0xf4c77e, waterDeep: 0xe9b066, waterEdge: 0xfde0a8, foam: 0xfff6e0,
  bankRock: 0xe7a95e, bankRockDark: 0xc98a4a, moss: 0xf2c074, lip: 0xffe4ae, floor: 0xf6cc86, floor2: 0xeab872,
  skirt: 0xdc9a54, skirtDark: 0xb4733c, lowland: 0xebb56e,
  palmTrunk: 0xb0844e, palmTrunkDark: 0x7d5a32, frond: 0x5cb83a, frondLight: 0x9ae05a, frondDark: 0x2d7e2a,
  canopy: [[0x9ac85a, 0x6a9a3a, 0x48702a], [0xb4d468, 0x7aa842, 0x527a2e]],
  blooms: [0xff4f7a, 0xff9a2e, 0xffd23a, 0xff6ad5],
};

/** LEVEL.prebuild: Ritt-Netz in Sandfarben (die Fluss-Bausteine lesen themeOf(level).jungle beim Aufbau). */
export function duenenThema(level) {
  const v = level.view;
  if (!v?.theme) return;
  v.theme = { ...v.theme, jungle: SAND8 };
}

/**
 * LEVEL.setup: Sand statt Wasser – Strom-Fläche matt (statt glänzend), die wandernden Schaumstreifen werden helle
 * Sandschlieren, Spritzer werden Sandfontänen, das Kielwasser eine helle Sandspur. Nur Materialien dieses Levels.
 */
export function sandAnsicht(level, scene) {
  const v = level.view;
  if (!v) return;
  v.three.traverse((o) => {
    if (!o.isMesh || typeof o.name !== 'string') return;
    if (o.name.startsWith('wasser:')) { o.material.roughness = 0.95; o.material.metalness = 0; o.material.needsUpdate = true; }
    else if (o.name.startsWith('schaum:')) { o.material.opacity = 0.42; o.material.color.set(0xfff0cc); }
  });
  for (const fx of new Set([level.effects, v.effects])) {
    const m = fx?.splashPool?.mesh?.material;
    if (m) { m.color.set(0xf2cf92); m.roughness = 0.9; m.opacity = 0.95; }
  }
  const w = scene?.rig?.wake?.material;
  if (w) w.color.set(0xfff3d6);
}

/**
 * Sterne im Sandstrom (8-2): Ein Stern, der in den Sand fällt (Sandflosser, Sandstatue, Flatterkäfer), treibt mit dem
 * Strom weiter – wie Pflaume selbst. Wer ihn verpasst hat, holt ihn so mit Bremsen/Lenken noch ein. Der vom Flatterkäfer
 * losgelassene Stern fällt (über dem Sandstrom gibt es keinen festen Boden) bis auf die Sandoberfläche.
 */
export function sandStrom(level) {
  const net = level.river;
  if (!net) return;
  const f = {}, rc = {};
  const carriers = level.entities.filter((e) => e.carry);
  level.onStep((dt) => {
    for (const k of carriers) { const s = k.carry?.star; if (k.starDropped && s && !s.__sand) s.__sand = true; }
    for (const e of level.entities) {
      if (e.kind !== 'star' || !e.alive || e.removed || e.hidden || e.touch === false) continue;
      if (!(e.falling || e.landed || e.__sand)) continue;
      net.sample(e.pos.x, e.pos.z, f);
      if (!f.ok || !f.inside) continue;
      e.pos.x += f.dx * f.speed * dt;
      e.pos.z += f.dz * f.speed * dt;
      net.constrain(e.pos, 0.6, rc);
      const top = f.y + 0.15;
      if (e.__sand || e.landed) {
        if (e.pos.y > top + 0.01) { e.__vy = (e.__vy ?? 0) - 22 * dt; e.pos.y = Math.max(top, e.pos.y + e.__vy * dt); }
        else { e.__vy = 0; e.pos.y = top; }
      } else if (e.pos.y < top) e.pos.y = top;
      e.drift = (e.drift ?? 0) + dt;
    }
  });
}

/**
 * Stempel im ?-Block (8-2): Der Stempel (LEVEL.stamp, über dem Block) ist verborgen, bis der ?-Block an pos gestoßen
 * wurde; dann steigt er funkelnd aus dem Block auf und bleibt auf ihm stehen.
 */
export function stempelBlock(level, pos) {
  const st = level.entities.find((e) => e.kind === 'stamp');
  const blk = level.entities.find((e) => e.kind === 'question' && Math.abs(e.pos.x - pos[0]) < 0.3 && Math.abs(e.pos.y - pos[1]) < 0.3 && Math.abs(e.pos.z - pos[2]) < 0.3);
  if (!st || !blk) return null;
  const home = st.pos.clone();
  const h = { shown: false, t: 0 };
  st.touch = false;
  st.pos.y = home.y - 40;
  level.onStep((dt) => {
    if (!st.alive) return;
    if (!h.shown) {
      if (blk.kind !== 'used') { st.touch = false; st.pos.y = home.y - 40; return; }
      h.shown = true;
      level.sfx('powerup_appear');
      level.effects?.sparks({ x: home.x, y: home.y + 0.4, z: home.z }, 22);
    }
    if (h.t < 0.6) {
      h.t += dt;
      const k = Math.min(1, h.t / 0.6);
      st.pos.y = home.y - 0.9 * (1 - k) * (1 - k);
      if (k >= 1) st.touch = true;
    }
  });
  if (!level.named.has('stempelblock')) level.named.set('stempelblock', h);
  return h;
}

/**
 * Sanddunst (8-2): Der lange Blick die Düne hinab zeigt sonst sämtliche Abschnitte bis zum Horizont. Nebel etwas näher
 * (Dunst über dem Sand) und statische Abschnitte, deren Quader weiter als dist m von der Kamera entfernt liegt, werden
 * nicht gezeichnet (nur Darstellung; Kollision und Kulisse am Himmel bleiben). Nur dieses Level.
 */
export function sandDunst(level, o = {}) {
  const v = level.view;
  if (!v) return;
  const fog = v.three.fog;
  if (fog) { fog.near = o.near ?? 45; fog.far = o.far ?? 175; }
  const dist = o.dist ?? 130;
  let list = null;
  v.onFrame(() => {
    if (!list) {
      list = [];
      for (const m of v.three.children) {
        if (!m.isMesh || typeof m.name !== 'string' || !m.name.startsWith('statisch:')) continue;
        if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
        list.push({ m, box: m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld) });
      }
    }
    const cp = v.camera.position;
    for (const it of list) it.m.visible = it.box.distanceToPoint(cp) < dist;
  });
}
