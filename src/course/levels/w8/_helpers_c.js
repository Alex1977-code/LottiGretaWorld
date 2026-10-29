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

/**
 * Entität fährt auf einer mover-Plattform mit (8-6: POW-Block auf der runden Aufzugplattform): je Schritt Lage und
 * Kollisionsform um den Versatz der Plattform verschieben. id = Entitäts-Id (spec.id), moverId = mover-Handle.
 */
export function mitfahren(level, id, moverId) {
  const h = level.named.get(moverId);
  if (!h) return;
  const offs = new Map();       // Entität → Versatz zur Plattform (beim ersten Schritt gemessen)
  level.onStep(() => {
    const e = level.entities.find((x) => x.spec?.id === id && !x.removed);
    if (!e) return;
    const p = h.pm.pos;
    if (!offs.has(e)) offs.set(e, { x: e.pos.x - p.x, y: e.pos.y - p.y, z: e.pos.z - p.z });
    const o = offs.get(e);
    const dx = p.x + o.x - e.pos.x, dy = p.y + o.y - e.pos.y, dz = p.z + o.z - e.pos.z;
    if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) < 1e-9) return;
    e.pos.x += dx; e.pos.y += dy; e.pos.z += dz;
    const s = e.shape;
    if (s?.min) {
      s.min = [s.min[0] + dx, s.min[1] + dy, s.min[2] + dz];
      s.max = [s.max[0] + dx, s.max[1] + dy, s.max[2] + dz];
      if (s.id) level.world.update(s.id);
    }
  });
}

/** Aktion für POW-Blöcke im Spukhaus: die Erschütterung lässt kleine Geister im Umkreis r verpuffen (Großspuke bleiben). */
export function geisterSchreck(r = 9) {
  return {
    fn: (level, ctx) => {
      const o = ctx.pos ?? [0, 0, 0];
      const ox = o.x ?? o[0], oz = o.z ?? o[2];
      let n = 0;
      for (const e of level.entities) {
        if (!e.alive || e.removed || e.defeated || typeof e.vanish !== 'function') continue;
        if (!['spuk', 'kreisgeist', 'kreisgeist_glied'].includes(e.kind) || (e.size ?? 1) > 1.5) continue;
        if (Math.hypot(e.pos.x - ox, e.pos.z - oz) > r) continue;
        e.vanish('pow'); n++;
      }
      level.geisterSchreck = (level.geisterSchreck ?? 0) + n;
    },
  };
}

/**
 * Schmuck der runden Aufzugplattform (läuft mit): goldener Rand, Lämpchen-Kranz (leuchtet), violettes Samtpolster und ein
 * dunkler Kegel darunter; ein Objekt (Standard- und Glüh-Material). r = Radius, h = Dicke.
 */
export function aufzugSchmuck(level, moverId, r = 2.4, h = 0.5) {
  const hd = level.named.get(moverId);
  if (!level.view || !hd) return;
  const parts = [], glow = [];
  const rim = new THREE.TorusGeometry(r - 0.06, 0.09, 6, 40).toNonIndexed();
  rim.rotateX(Math.PI / 2); rim.translate(0, h + 0.02, 0);
  colorize(rim, (p, n, o) => mixc(L(0xb8862a), L(0xffe08a), smooth(-0.2, 0.9, n.y), o));
  parts.push(rim);
  parts.push(cyl(r * 0.72, r * 0.72, 0.03, 0, h, 0, 0x5a2a7a, 32, { top: 0x6a3a8a }));
  parts.push(cyl(r * 0.3, r * 0.3, 0.035, 0, h, 0, 0xc8983a, 24, { top: 0xe8b84a }));
  parts.push(cyl(r + 0.06, r - 0.3, 0.6, 0, -0.62, 0, 0x2a1a34, 24));
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    glow.push(sph(0.08, Math.cos(a) * (r - 0.05), h + 0.13, Math.sin(a) * (r - 0.05), i % 2 ? 0xfff0a0 : 0xffb0ff, { ws: 6, hs: 4 }));
  }
  const mesh = new THREE.Mesh(merge(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.2 }));
  const lamps = new THREE.Mesh(merge(glow), new THREE.MeshBasicMaterial({ vertexColors: true }));
  mesh.add(lamps);
  mesh.name = `aufzug:${moverId}`;
  const p0 = hd.pm.pos;
  mesh.position.set(p0.x, p0.y, p0.z);
  addObject(level, mesh, () => { const p = hd.pm.pos; mesh.position.set(p.x, p.y, p.z); });
}

/**
 * Kerzen-Inseln im Dunkel (8-6, Orientierung entlang der Fahrten): kleine schwebende Steinsockel mit dreiarmigem Leuchter;
 * jede Insel ist ein Laternenlicht-Punkt (Thema darkghost: die nächsten Lichter leuchten wirklich) und ein Leuchtpunkt.
 * list [[x, y, z, s = 1]] (y = Oberkante des Sockels). Statisch, ohne Kollision.
 */
export function kerzenInseln(level, list) {
  const parts = [], flames = [];
  for (const [x, y, z, s = 1] of list) {
    parts.push(cyl(0.55 * s, 0.25 * s, 0.9 * s, x, y - 0.9 * s, z, 0x3a2c44, 8, { top: 0x5a4864 }));
    parts.push(cone(0.25 * s, 0.7 * s, x, y - 0.9 * s - 0.7 * s, z, 0x2a1e30, 6, { rx: Math.PI }));
    parts.push(cyl(0.05 * s, 0.08 * s, 0.9 * s, x, y, z, 0xc8983a, 6));
    parts.push(blk(0.9 * s, 0.05 * s, 0.06 * s, x, y + 0.7 * s, z, 0xc8983a));
    for (const dx of [-0.42, 0, 0.42]) {
      const up = dx === 0 ? 0.18 * s : 0;
      parts.push(cyl(0.05 * s, 0.05 * s, 0.26 * s, x + dx * s, y + 0.75 * s + up, z, 0xfff6e0, 6));
      flames.push([x + dx * s, y + 1.08 * s + up, z]);
    }
    level.view?.addLantern(x, y + 1.3 * s, z);
  }
  bakeParts(level, parts, { castShadow: false });
  glowPoints(level, flames, 0xffc860, 0.55, { opacity: 0.95, name: 'kerzen-flammen' });
  glowPoints(level, flames.filter((_, i) => i % 3 === 1), 0xff9a40, 2.4, { opacity: 0.35, name: 'kerzen-schein' });
}

/**
 * Helmregal (8-6 am Start): Holzregal mit Fächern und Lämpchen (Kulisse, fest); die Helme selbst sind Entitäten davor.
 * o = { x, y, z, n: 4, gap: 1.2 } (Mitte vor dem Regal).
 */
export function helmRegal(level, o) {
  const parts = [], glow = [];
  const n = o.n ?? 4, gap = o.gap ?? 1.2, W = n * gap + 0.4;
  const { x, y, z } = o;
  parts.push(blk(W, 1.4, 0.4, x, y, z - 0.75, 0x5a3422, { top: 0x6e4228 }));
  for (let i = 0; i <= n; i++) parts.push(blk(0.08, 1.4, 0.44, x - W / 2 + 0.2 + i * gap, y, z - 0.73, 0x3a2216));
  parts.push(blk(W + 0.2, 0.1, 0.5, x, y + 1.4, z - 0.75, 0xc8983a));
  for (let i = 0; i < n; i++) glow.push(sph(0.1, x - W / 2 + 0.2 + (i + 0.5) * gap, y + 1.2, z - 0.52, 0xfff0a0, { ws: 6, hs: 4 }));
  bakeParts(level, parts, { castShadow: false });
  bakeParts(level, glow, { material: 'glow', castShadow: false });
  level.world.add({ type: 'box', min: [x - W / 2, y, z - 0.95], max: [x + W / 2, y + 1.5, z - 0.55], tag: 'helmregal' });
}

// ====================================================================== 4) Krallen-Haus (8-Haus)

const GRIFFE = [0xff5a5a, 0xffd23d, 0x4aa8ff, 0x5ac85a, 0xc87aff, 0xff9a3a, 0xff7ac8];
const LOOK = {
  kletter: { body: 0x4a6ab8, alt: 0x5a7ac8, top: 0xe8e0d0, line: 0x34508a },     // Kletterwand (Platten mit Fugen)
  fels: { body: 0x7a5a48, alt: 0x8a6a52, top: 0x9a8a6a, line: 0x5a4234 },        // Höhlenfels
  turm: { body: 0xf4f0ea, alt: 0xe8323a, top: 0xfff6e0, line: 0xc8c0b8 },        // Leuchtturm (rot-weiß geringelt)
  bauklotz: { body: 0xffc21a, alt: 0xff5a5a, top: 0xfff0a0, line: 0xc8901a },    // Riesen-Bauklotz
  glatt: { body: 0xb8c4d8, alt: 0xc8d4e8, top: 0xe8eef8, line: 0x9aa8c0 },       // glatter Marmor (nicht kletterbar)
  holz: { body: 0x9a6a3e, alt: 0x8a5a32, top: 0xc8945a, line: 0x6a4422 },
};

/**
 * Kraxel-Block (8-Haus): Quader x0..x1 × zA..zB × y0..y1 als Kollision und Kulisse. climb: true → Krallen-Kletterwand
 * (Form climbable; bunte Griffe auf den Seiten faces, Standard alle vier) – sonst glatt (noWallSlide: kein Wandrutschen, kein
 * Wandsprung; „hier geht's nicht hoch“). look: kletter | fels | turm | bauklotz | glatt | holz; color überschreibt den
 * Grundton; stripes: Ringel-Höhe (turm). Statisch (bakeParts), Kollision ein Quader.
 */
export function kraxelBlock(level, o) {
  const x0 = Math.min(o.x0, o.x1), x1 = Math.max(o.x0, o.x1), z0 = Math.min(o.zA, o.zB), z1 = Math.max(o.zA, o.zB);
  const y0 = o.y0, y1 = o.y1, climb = o.climb !== false;
  const lk = { ...(LOOK[o.look ?? (climb ? 'kletter' : 'glatt')] ?? LOOK.kletter) };
  if (o.color !== undefined) lk.body = o.color;
  if (o.alt !== undefined) lk.alt = o.alt;
  level.world.add({ type: 'box', min: [x0, y0, z0], max: [x1, y1, z1], climbable: climb || undefined, noWallSlide: !climb || undefined, camIgnore: o.camIgnore ?? undefined, tag: climb ? 'kraxelwand' : 'glattwand' });
  if (!level.view || o.visual === false) return;
  const parts = [];
  const w = x1 - x0, d = z1 - z0, h = y1 - y0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const rnd = new Rnd(Math.round(Math.abs(cx * 17 + cz * 7 + y0 * 3)) + 5);
  // Körper in Lagen (Ringel/Platten): je Lage abwechselnd Grund- und Zweitton
  const band = o.stripes ?? (lk === LOOK.turm || o.look === 'turm' ? 1.4 : 2);
  const nb = Math.max(1, Math.round(h / band));
  for (let k = 0; k < nb; k++) {
    const ya = y0 + (h * k) / nb, yb = y0 + (h * (k + 1)) / nb;
    const col = o.look === 'turm' || o.look === 'bauklotz' ? (k % 2 ? lk.alt : lk.body) : (k % 2 ? lk.alt : lk.body);
    parts.push(blk(w, yb - ya, d, cx, ya, cz, col, { top: k === nb - 1 ? lk.top : undefined }));
    if (k > 0) parts.push(blk(w + 0.04, 0.05, d + 0.04, cx, ya - 0.025, cz, lk.line));
  }
  // Griffe (kletterbar) bzw. Glanzstreifen (glatt) auf den Seitenflächen
  const faces = o.faces ?? ['+z', '-z', '+x', '-x'];
  for (const f of faces) {
    const along = f === '+z' || f === '-z' ? w : d;
    const nx = Math.max(1, Math.floor(along / (o.step ?? 0.95))), ny = Math.max(1, Math.floor(h / (o.step ?? 0.95)));
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      if (!climb && (i + j) % 5) continue;
      const u = -along / 2 + (i + 0.5) * (along / nx) + (rnd.frac() - 0.5) * 0.35, v = y0 + (j + 0.5) * (h / ny) + (rnd.frac() - 0.5) * 0.3;
      if (v > y1 - 0.25 || v < y0 + 0.2) continue;
      const pos = f === '+z' ? [cx + u, v, z1] : f === '-z' ? [cx - u, v, z0] : f === '+x' ? [x1, v, cz + u] : [x0, v, cz - u];
      if (climb) {
        const r = 0.09 + rnd.frac() * 0.07;
        const col = o.look === 'fels' ? (rnd.frac() < 0.5 ? 0x5a4234 : 0x6a5040) : GRIFFE[Math.floor(rnd.frac() * GRIFFE.length)];
        const g = sph(r, 0, 0, 0, col, { ws: 6, hs: 4 });
        g.scale(f === '+x' || f === '-x' ? 0.55 : 1.2, 0.8, f === '+z' || f === '-z' ? 0.55 : 1.2);
        g.translate(...pos);
        parts.push(g);
      } else {
        const g = quadG(pos[0], pos[1] - 0.4, pos[2] + (f === '+z' ? 0.01 : f === '-z' ? -0.01 : 0), 0.08, 0.8, f === 'y' ? '+z' : f, 0xffffff);
        if (f === '+x' || f === '-x') g.translate(f === '+x' ? 0.01 : -0.01, 0, 0);
        parts.push(g);
      }
    }
  }
  bakeParts(level, parts, { castShadow: o.shadow ?? false });
}

/**
 * Krallen-Anzug je Raum (8-Haus): zu Beginn jedes Raums (Phase play) trägt die Figur den Krallen-Anzug; geht er verloren
 * (Treffer), springt nach `every` s am Raumstart ein neuer aus der Kapsel (Kulisse: goldene Kapsel mit Pfote je Raum).
 * starts: [[x, y, z], …] (Raumstarts). Liefert { given, refills, info() }.
 */
export function krallenHaus(level, starts, o = {}) {
  const st = { given: 0, refills: 0, t: 0, lastRoom: -1, off: false };
  level.onStep((dt) => {
    const h = level.house, p = level.player;
    if (!h || !p || p.dead || st.off) return;    // off: Gegenprobe ohne Anzug (Tests)
    if (h.phase === 'fadein' || (h.phase === 'play' && h.room !== st.lastRoom)) {
      if (p.power !== 'krallen') { p.setPower('krallen'); st.given++; }
      st.lastRoom = h.room; st.t = 0;
      return;
    }
    if (h.phase !== 'play' || p.power === 'krallen') { st.t = 0; return; }
    const s = starts[h.room];
    if (!s) return;
    if (level.entities.some((e) => e.kind === 'powerup' && !e.removed && e.power === 'krallen' && Math.hypot(e.pos.x - s[0], e.pos.z - s[2]) < 3)) return;
    st.t += dt;
    if (st.t < (o.every ?? 1.2)) return;
    st.t = 0; st.refills++;
    level.spawn('powerup', { pos: [s[0] + 1.6, s[1] + 0.05, s[2]], power: 'krallen', emerge: true });
    level.sfx('powerup_appear');
  });
  if (level.view) {
    const P = [], G = [];
    for (const [x, y, z] of starts) {
      const kx = x + 1.6;
      P.push(cyl(0.55, 0.62, 0.12, kx, y, z, 0xc8901a, 16, { top: 0xffd860 }));
      P.push(blk(1.1, 1.6, 0.18, kx, y, z - 0.75, 0x5a6476, { top: 0x8a92a8 }));
      for (const [dx, dy, r] of [[0, -0.08, 0.17], [-0.17, 0.12, 0.07], [-0.06, 0.2, 0.07], [0.06, 0.2, 0.07], [0.17, 0.12, 0.07]]) P.push(sph(r, kx + dx, y + 1.25 + dy, z - 0.64, 0xff8a2a, { sy: 0.6, ws: 8, hs: 5 }));
      G.push([kx - 0.4, y + 1.62, z - 0.62], [kx + 0.4, y + 1.62, z - 0.62]);
    }
    bakeParts(level, P, { castShadow: false });
    glowPoints(level, G, 0xffc21a, 0.5, { name: 'kapsel-lampen' });
  }
  st.info = () => ({ given: st.given, refills: st.refills });
  return st;
}

/**
 * Lavarinnen an einer Kletterwand (8-Haus Raum 4): senkrechte Lavaströme vor der Wandfläche (z = Fläche, Blick +Z):
 * tödliche Form (kill 'lava') d m vor der Wand, Lavafall-Kulisse. list [[x, w]] (Mitte, Breite), y0..y1.
 */
export function lavaRinnen(level, o) {
  const d = o.d ?? 0.45;
  for (const [x, w] of o.list) {
    level.world.add({ type: 'box', min: [x - w / 2, o.y0 - 1, o.z], max: [x + w / 2, o.y1, o.z + d], kill: 'lava', lava: true, solid: false, camIgnore: true, tag: 'lavarinne' });
  }
  lavaFaelle(level, o.list.map(([x, w]) => ({ pos: [x, o.y0, o.z + 0.12], width: w * 1.1, height: o.y1 - o.y0, yaw: 0 })), { glow: 3.6 });
  // Glutrand oben, wo die Lava aus der Wand quillt
  const parts = o.list.map(([x, w]) => blk(w + 0.5, 0.35, 0.6, x, o.y1 - 0.35, o.z + 0.2, 0x3a2a30, { top: 0xff8a2a }));
  bakeParts(level, parts, { castShadow: false });
}

/**
 * Bröckelwand (8-Haus Raum 10): Bruchstücke (Gegner-Baustein `bruchstueck`, climbable) wackeln los, sobald eine Figur an ihnen
 * klettert (nicht beim Draufstehen), und brechen nach `warn` s (startWarn). Sucht die Stücke je Schritt neu (Raum-Neustart erzeugt
 * sie frisch). prefix = Id-Anfang. Liefert { touched, info() }.
 */
export function broeckelWand(level, prefix, o = {}) {
  const st = { touched: 0 };
  level.onStep(() => {
    const p = level.player;
    if (!p || p.dead) return;
    const list = level.entities.filter((e) => e.kind === 'bruchstueck' && !e.removed && String(e.spec?.id ?? '').startsWith(prefix) && e.state === 'ganz');
    if (!list.length) return;
    let pt = null;
    if (p.mode === 'wall') {
      const n = p.wallNormal;
      pt = { x: p.pos.x - n.x * (p.half.x + 0.12), y: p.pos.y + p.half.y, z: p.pos.z - n.z * (p.half.z + 0.12) };
    }   // nur beim Klettern (wer oben steht, bleibt heil – ein brechendes Stück würde ihn treffen)
    if (!pt) return;
    for (const e of list) {
      const h = e.half;
      if (Math.abs(pt.x - e.pos.x) <= h.x + 0.05 && Math.abs(pt.z - e.pos.z) <= h.z + 0.05 && pt.y >= e.pos.y - 0.05 && pt.y <= e.pos.y + 2 * h.y + 0.05) {
        if (e.startWarn(o.warn ?? 0.75)) st.touched++;
      }
    }
  });
  st.info = () => ({ touched: st.touched });
  return st;
}
