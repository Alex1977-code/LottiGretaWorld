// Hilfen für die Welt-8-Level 8-Haus „Haus Krallenkraxel“, 8-6 „Finsterfahrt im Spiegelspukhaus“ und 8-7 „Kullerklotz-Ritt
// durchs Glutinferno“ (kein Level: exportiert kein LEVEL, die Level-Registry überspringt dieses Modul). Gemeinsame Dateien
// werden nicht verändert; alles Level-Lokale hängt sich über die offiziellen Level-Haken `LEVEL.build`/`LEVEL.setup`
// (Präzisierung „Level-Haken“, „Leistung und Level-Haken 2“) sowie `level.onStep` / `view.onFrame` an.
//
//   1) Grundlagen     Geometrie-Kleinteile (aus den Welt-4-Hilfen), Leinwand-Texturen, Leuchtpunkte
//   2) Lava-Inferno   kristalle (leuchtende Kristallgruppen), basalt (Säulen-Gruppen), lavaHang (schräger Lavastrom mit
//      (8-7)          Absturzform), kristallBogen (Torbogen über der Fahrt), glutRand (glühende Ränder), felsklotzSchild
//   3) Spukhaus       spukRaum (Boden, Wände, Täfelung im Dunkeln), aufzug (runde Aufzugplattform startet beim
//      (8-6)          Draufstehen), statuen, tuerReihe (Türen der Großspuk-Jagd)
//   4) Krallen-Haus   kletterwand (Kletterwand mit Griffmulden), krallenRaum (Anzug je Raum), piepWand (Wandblöcke im
//      (8-Haus)       Takt), lavaRinnen (Lavaströme an der Wand), broeckelWand (zerfallende Großblöcke), tapete8 (Tapeten)
//
// Alles, was hier gezeichnet wird, ist entweder statisch verschmolzen (bakeParts → Abschnitts-Meshes) oder ein einzelnes
// Objekt mit eigenem Haken (wenige Zeichenaufrufe je Abschnitt).

import * as THREE from 'three';
import { lin, hex, mixc, smooth, colorize, merge, addObject, addStatic, Rnd } from '../../blocks/kit.js';
import { visDt, giveStar } from '../../entities/gimmick.js';
import { lavaMaterial } from '../../blocks/w7kit.js';
import {
  isl, line, ring, blk, cyl, sph, cone, quadG, bakeParts, glowPoints, canvasTex, hausRaum, hausFertig, raumHaken, wimpel,
  levelSetup, cullStatic, farHide, heroShadowDiet, teileInstanzen, lavaFaelle, funkenFlug, glutSaum,
} from '../w4/_helpers_d.js';

export {
  isl, line, ring, blk, cyl, sph, cone, quadG, bakeParts, glowPoints, canvasTex, hausRaum, hausFertig, raumHaken, wimpel,
  levelSetup, cullStatic, farHide, heroShadowDiet, teileInstanzen, lavaFaelle, funkenFlug, glutSaum,
};

export const TAU = Math.PI * 2;
const L = (c) => lin(hex(c));
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** Bogen aus Münzen von a nach b (Scheitel h über der Verbindungslinie) – Liste einzelner Münzen (mit ... einsetzen). */
export function arc(a, b, n, h = 2) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    out.push({ kind: 'coin', pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + Math.sin(t * Math.PI) * h, a[2] + (b[2] - a[2]) * t] });
  }
  return out;
}

/** Münzen an einer Liste von Punkten (je eine Münze). */
export const coinsAt = (pts) => pts.map((pos) => ({ kind: 'coin', pos }));

/** Holzschild (Baustein sign) mit Text. */
export const sign = (x, y, z, text, o = {}) => ({ type: 'sign', pos: [x, y, z], text, ...o });

// ====================================================================== 2) Lava-Inferno (8-7)

const KRISTALL = {
  lila: { body: 0x7a3aa8, tip: 0xe6b8ff, glow: 0xd890ff },
  blau: { body: 0x2a6ab8, tip: 0xc8f2ff, glow: 0x7ad8ff },
  rosa: { body: 0xb83a8a, tip: 0xffc8ec, glow: 0xff8ad8 },
  gold: { body: 0xc8901a, tip: 0xfff0a0, glow: 0xffd860 },
};

/**
 * Kristallgruppen (Kulisse): list [[x, y, z, size = 1, farbe = 'lila' | 'blau' | 'rosa' | 'gold', seed]]. Je Gruppe 3–6 Kristalle
 * aus einem dunklen Felsfuß, Spitzen hell; dazu ein Leuchtpunkt je Gruppe (ein Zeichenaufruf für alle). Statisch verschmolzen.
 * o.solid: Kollision (Zylinder um den Fuß, Standard nur ab size ≥ 1.2).
 */
export function kristalle(level, list, o = {}) {
  const parts = [], glows = { lila: [], blau: [], rosa: [], gold: [] };
  for (const [x, y, z, size = 1, col = 'lila', seed = 1] of list) {
    const P = KRISTALL[col] ?? KRISTALL.lila;
    const rnd = new Rnd(Math.round(Math.abs(x * 13 + z * 7 + seed * 101)) + 3);
    parts.push(cyl(0.45 * size, 0.7 * size, 0.35 * size, x, y - 0.05, z, 0x2a1e30, 7));
    const n = 3 + Math.floor(rnd.frac() * 4);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rnd.frac() * 0.8, r = (i === 0 ? 0 : 0.25 + rnd.frac() * 0.25) * size;
      const h = (i === 0 ? 1.6 : 0.7 + rnd.frac() * 0.9) * size, w = (i === 0 ? 0.32 : 0.16 + rnd.frac() * 0.12) * size;
      const g = new THREE.ConeGeometry(w, h, 5).toNonIndexed();
      const lo = L(P.body), hi = L(P.tip);
      colorize(g, (p, n2, out) => mixc(lo, hi, smooth(-h * 0.3, h * 0.5, p.y) * 0.8 + Math.max(0, n2.x) * 0.2, out));
      g.translate(0, h / 2, 0);
      g.rotateZ(i === 0 ? 0 : Math.cos(a) * 0.45);
      g.rotateX(i === 0 ? 0 : Math.sin(a) * 0.45);
      g.translate(x + Math.cos(a) * r, y + 0.15 * size, z + Math.sin(a) * r);
      parts.push(g);
    }
    glows[col]?.push([x, y + 1.0 * size, z]);
    if ((o.solid ?? size >= 1.2) && o.solid !== false) level.world.add({ type: 'cyl', x, z, r: 0.5 * size, y0: y, y1: y + 1.4 * size, camIgnore: true, tag: 'kristall' });
  }
  bakeParts(level, parts, { castShadow: o.shadow ?? false });
  for (const [k, pts] of Object.entries(glows)) if (pts.length) glowPoints(level, pts, KRISTALL[k].glow, o.glow ?? 2.6, { opacity: 0.55, name: `kristall-schein-${k}` });
}

/**
 * Basaltsäulen-Gruppen (sechseckige Säulen, Kulisse und – mit solid – Kollision): list [[x, y, z, n = 5, h = 2, r = 0.5]].
 */
export function basalt(level, list, o = {}) {
  const parts = [];
  for (const [x, y, z, n = 5, h = 2, r = 0.5] of list) {
    const rnd = new Rnd(Math.round(Math.abs(x * 31 + z * 17)) + 11);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rnd.frac(), d = i === 0 ? 0 : r * 1.7;
      const hh = h * (i === 0 ? 1 : 0.45 + rnd.frac() * 0.5);
      const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      parts.push(cyl(r, r * 1.05, hh, px, y - 0.2, pz, i % 2 ? 0x3a2e42 : 0x4a3c50, 6, { top: 0x6a5874 }));
      if (o.solid) level.world.add({ type: 'cyl', x: px, z: pz, r, y0: y - 0.2, y1: y - 0.2 + hh, tag: 'basalt' });
    }
  }
  bakeParts(level, parts, { castShadow: o.shadow ?? true });
}

/**
 * Lavahang (8-7 „Felsklotz rutscht einen Lavahang hinab“): schräger Lavastrom von (zA, yA) nach (zB, yB) zwischen x0 und x1 –
 * Shader-Fläche (Lava-Material Welt 7, fließt hangab), tödliche Form in Stufen knapp unter der Oberfläche (kill 'lava'),
 * Felsufer links und rechts (bank m breit, Oberkante bankH über der Lava) mit glühendem Saum. Liefert { topAt(z) }.
 */
export function lavaHang(level, o) {
  const x0 = Math.min(o.x0, o.x1), x1 = Math.max(o.x0, o.x1);
  const zA = o.zA, zB = o.zB, yA = o.yA, yB = o.yB;
  const topAt = (z) => yA + (yB - yA) * clamp((z - zA) / (zB - zA), 0, 1);
  const steps = o.steps ?? Math.max(4, Math.round(Math.abs(zB - zA) / 2));
  for (let i = 0; i < steps; i++) {
    const za = zA + ((zB - zA) * i) / steps, zb = zA + ((zB - zA) * (i + 1)) / steps;
    const lo = Math.min(topAt(za), topAt(zb));
    level.world.add({ type: 'box', min: [x0, lo - 5, Math.min(za, zb)], max: [x1, lo - 0.12, Math.max(za, zb)], kill: 'lava', lava: true, surface: lo, solid: false, camIgnore: true, tag: 'lavahang', lavaColor: 'rot' });
  }
  // Ufer: Felsrippen, oben dunkel mit glühendem Saum zur Lava
  const bank = o.bank ?? 2.2, bankH = o.bankH ?? 1.6;
  const parts = [], glow = [];
  const n = Math.max(4, Math.round(Math.abs(zB - zA) / 3));
  for (const side of [-1, 1]) {
    const bx = side < 0 ? x0 - bank / 2 : x1 + bank / 2;
    for (let i = 0; i < n; i++) {
      const za = zA + ((zB - zA) * i) / n, zb = zA + ((zB - zA) * (i + 1)) / n, zm = (za + zb) / 2;
      const ytop = Math.max(topAt(za), topAt(zb)) + bankH;
      const h = ytop - (Math.min(topAt(za), topAt(zb)) - 3);
      parts.push(blk(bank, h, Math.abs(zb - za) + 0.3, bx, ytop - h, zm, i % 2 ? 0x3a2c40 : 0x45354c, { top: 0x5a4864 }));
      glow.push(quadG(side < 0 ? x0 + 0.01 : x1 - 0.01, topAt(zm) - 0.15, zm, Math.abs(zb - za) + 0.3, 0.5, side < 0 ? '+x' : '-x', [L(0xffa030), L(0xffa030), L(0xb02008), L(0xb02008)]));
      if (o.solid !== false) level.world.add({ type: 'box', min: [bx - bank / 2, ytop - h, Math.min(za, zb) - 0.15], max: [bx + bank / 2, ytop, Math.max(za, zb) + 0.15], tag: 'lavaufer' });
    }
  }
  bakeParts(level, parts, { castShadow: false });
  bakeParts(level, glow, { material: 'glow', castShadow: false });
  if (level.view) {
    const nz = Math.max(4, Math.round(Math.abs(zB - zA) / 1.5)), nx = Math.max(2, Math.round((x1 - x0) / 1.5));
    const g = new THREE.PlaneGeometry(x1 - x0, 1, nx, nz);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i) / (x1 - x0) + 0.5, v = pos.getY(i) + 0.5;     // v 0 … 1 von zB nach zA
      const z = zB + (zA - zB) * v;
      pos.setXYZ(i, x0 + u * (x1 - x0), topAt(z) - 0.04 + Math.sin(u * 9 + v * 7) * 0.03, z);
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, lavaMaterial(level, 'rot', { speed: 3, bright: 1.1, side: THREE.DoubleSide }));
    m.name = 'lavahang';
    m.renderOrder = -1;
    addObject(level, m);
  }
  return { topAt };
}

/**
 * Kristall-Torbogen über einer Fahrstrecke (nur Kulisse; die Pfeiler sind fest): o = { x, z, y (Fuß), w: 7, h: 6, axis: 'x'
 * (Bogen quer zur Fahrt nach −Z) | 'z', color: 'blau' }.
 */
export function kristallBogen(level, o) {
  const parts = [], w = o.w ?? 7, h = o.h ?? 6, y = o.y ?? 0;
  const P = KRISTALL[o.color ?? 'blau'];
  const along = o.axis === 'z';
  const at = (u, v) => (along ? [o.x, y + v, o.z + u] : [o.x + u, y + v, o.z]);
  for (const s of [-1, 1]) {
    const [px, , pz] = at(s * w / 2, 0);
    parts.push(cyl(0.7, 0.95, h * 0.8, px, y - 2, pz, 0x3a2c44, 7, { top: 0x5a4864 }));
    if (o.solid !== false) level.world.add({ type: 'cyl', x: px, z: pz, r: 0.85, y0: y - 2, y1: y + h * 0.8 - 2, tag: 'bogenpfeiler' });
  }
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = Math.PI * t;
    const u = -Math.cos(a) * w / 2, v = h * 0.62 + Math.sin(a) * h * 0.38;
    const [px, py, pz] = at(u, v - 2);
    parts.push(sph(0.62, px, py, pz, 0x45354c, { ws: 7, hs: 5 }));
    const g = new THREE.ConeGeometry(0.22, 0.9 + (i % 3) * 0.35, 5).toNonIndexed();
    colorize(g, (p, n2, out) => mixc(L(P.body), L(P.tip), smooth(-0.3, 0.4, p.y), out));
    g.translate(0, 0.5, 0);
    g.rotateZ(along ? 0 : -Math.cos(a) * 0.9);
    g.rotateX(along ? Math.cos(a) * 0.9 : 0);
    g.translate(px, py + 0.4, pz);
    parts.push(g);
  }
  bakeParts(level, parts, { castShadow: false });
  const top = at(0, h - 2);
  glowPoints(level, [top], P.glow, 3.2, { opacity: 0.6, name: 'bogen-schein' });
}

// ====================================================================== 3) Spukhaus (8-6)

/**
 * Runde Aufzugplattform (mover mit shape 'cyl', idle, once): fährt los, sobald eine Figur daraufsteht; nach einem Tod
 * (Checkpoint-Neustart) wieder am Start und angehalten. Ein goldener Rand mit Lämpchen läuft mit (eigenes Objekt).
 * Liefert { started, info() }.
 */
export function aufzugStart(level, id, o = {}) {
  const h = level.named.get(id);
  if (!h) return null;
  const st = { started: false, rides: 0 };
  const home = h.pm.s;
  level.onStep(() => {
    if (st.started) return;
    for (const f of level.players ?? [level.player]) {
      if (f && !f.dead && f.mode === 'ground' && f.ground?.mover === h.mover) {
        st.started = true; st.rides++;
        h.start();
        level.sfx('switch');
        break;
      }
    }
  });
  const rt = level.runtime;
  const prev = rt.respawn.bind(rt);
  rt.respawn = () => {
    prev();
    st.started = false;
    h.stop();
    h.pm.s = home; h.pm.dir = 1; h.pm.pause = 0;
    h.pm.at(h.pm.s, h.pm.pos);       // der mover setzt seine Form im nächsten Schritt nach pm.pos (ohne Mitnahme-Versatz)
  };
  st.info = () => ({ started: st.started, s: +h.pm.s.toFixed(2), len: +h.pm.length.toFixed(1) });
  return st;
}
