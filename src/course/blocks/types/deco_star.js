// Baustein `deco_star`: Kulisse der Bonuswelt Stern „Sternenzelt“ (Präzisierung „Motor und Bausteine Bonuswelten“) – Weltraum,
// Regenbogenwege, Planetoiden, Holz-Athletik, Riesenblockland, Waben, Riesendschungel, verschneiter Spukfriedhof, Kanonen-
// Kosmos. Eigene Geometrie wird in die statische Geometrie verschmolzen (keine zusätzlichen Zeichenaufrufe), Leuchtendes
// (Sterne, Fenster, Laternen, Irrlichter, Neon) ins Glüh-Material. Gibt es ein Registry-Modell `deco_star_<kind>` (Kulissen-
// Agent; Ursprung = Fußpunkt, Blick nach +X), wird stattdessen dieses gebacken (statisch, mit Instanzfarben; opts = Felder
// des Eintrags ohne kind/pos); die Kollision (solid) bleibt gleich; look: 'eigen' erzwingt die eigene Geometrie.
// Kulissen-Modelle der Bonuswelten (MODEL_MAP, gebacken): planet → planet { kind: variant 'ring' | 'pilz' | 'blume' | 'eis'
// (Standard ring; ring: false → pilz), size 2·radius }, rakete → spielzeugrakete, komet → sternschnuppe (Schweif gegen dir),
// riesenblock → retro_block { kind: block 'gras' | 'erde' | 'ziegel' | 'frage' | 'hart' (sonst aus color) }, retro_wolke,
// retro_busch, wabe → wabensaeule (variant 'normal' | 'lava' | 'eis'), riesenpflanze/riesenpilz/riesenblume → riesenpflanze
// ('blatt'/'pilz'/'blume'), grabstein → schneegrab (variant 'rund' | 'kreuz' | 'spitz'), antenne → weltraum_antenne; nur als
// Modell: kuppel (weltraum_kuppel: size 6), torbogen (sternen_torbogen: width 6, height 5), regenbogenweg (length, width,
// bend, rise), walzen_schiene, brett_schiene (variant 'gerade' | 'bogen'), nebelbank (durchsichtig, zieht – bewegtes Objekt:
// size [w, d], count, color, opacity, height). Übrige Arten: eigene Geometrie.
//
// Einzeln:  { type: 'deco_star', kind, pos: [x, y, z], … }   oder Liste: { type: 'deco_star', items: [{ kind, pos, … }, …] }
// pos = Fußpunkt (schwebende Dinge: Mitte); yaw in Radiant; scale; Streuungen deterministisch (seed) in size: [w, d] um pos.
// shadow: false → wirft keinen Schatten; solid: true → Kollision (Quader um den Fuß, Größe je Art) bzw. solid: [w, h, d].
// kind:
//   Weltraum   planet (schwebender Planet: radius 2, color 'rosa' | 'mint' | 'gold' | 'blau' | 'lila', ring true) · stern
//              (leuchtender Fünfzackstern: size 1, pole: Höhe einer Stange darunter, 0 = schwebt) · sterne (Streuung kleiner
//              Leuchtsterne: n 12, size: [w, d], height 3) · rakete (Spielzeug-Rakete mit Fenster und Flossen: height 4, color
//              'rot' | 'blau' | 'weiss') · kristall (Pastell-Kristallgruppe: size 1, n 5, color) · komet (Komet mit Schweif,
//              schwebt: size 1, dir [dx, dy, dz]) · regenbogen (kleiner Regenbogen-Bogen: width 6, height 3, yaw)
//   Holz       holzkiste (size 1.2) · holzbalken (length 4, yaw) · walzenstapel (n 3, radius 0.6)
//   Blockland  riesenblock (bunter Riesenblock mit Nieten: size 3, color) · retro_wolke (drei Kugeln, flache Unterseite: size 2)
//              · retro_busch (drei grüne Halbkugeln: size 1.2) · roehre_deko (grüne Röhre ohne Funktion: radius 1, height 2)
//   Waben      wabe (sechseckige Säule: radius 1, height 2, color 'honig' | 'weiss') · honigtopf (size 1)
//   Dschungel  riesenpflanze (übergroßes Blattbüschel: size 4) · riesenpilz (gepunkteter Hut: height 5, radius 3, color) ·
//              riesenblume (Blüte auf langem Stiel: height 5, color) · liane (from → to, hängt durch: sag 1)
//   Friedhof   grabstein (mit Schneehaube: size 1, round true) · kahler_baum (height 5) · schneehuegel (radius 3) · laterne
//              (Pfahl mit warmem Licht, Laternenlicht des Themas: height 2.6) · irrlicht (schwebendes Leuchten: color)
//   Kosmos     antenne (Satellitenschüssel auf Mast: height 3) · neonring (leuchtender Ring: radius 2, color 'cyan' | 'pink' |
//              'gruen', yaw) · leuchtsaeule (schlanker Turm mit Kristallkopf: height 6)
//   modell     beliebiges Registry-Modell ({ name, opts, state })
// Beispiel: { type: 'deco_star', items: [{ kind: 'planet', pos: [-12, 6, -20], radius: 3 }, { kind: 'rakete', pos: [9, 0, -4] }] }

import * as THREE from 'three';
import { v3, lin, mixc, smooth, colorize, merge, Rnd, addStatic, hex, addObject } from '../kit.js';
import { bakeW8 } from '../w8kit.js';
import { hasModel, getModel } from '../../models/index.js';
import { visDt } from '../../entities/gimmick.js';

const TAU = Math.PI * 2;
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const C = (h) => lin(typeof h === 'number' ? h : hex(h));
const fill = (g, col) => { const c = C(col); return colorize(ni(g), (p, n, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }); };
const shade = (g, lo, hi) => { const L = C(lo), H = C(hi); return colorize(ni(g), (p, n, o) => mixc(L, H, smooth(-0.6, 0.85, n.y * 0.7 + n.z * 0.2 - n.x * 0.15), o)); };
const at = (g, p, yaw = 0, s = 1) => { if (s !== 1) g.scale(s, s, s); if (yaw) g.rotateY(yaw); g.translate(p.x, p.y, p.z); return g; };

const PCOL = { rosa: [0xff9ad0, 0xffe0f0], mint: [0x7ae8c0, 0xd8fff0], gold: [0xffc83a, 0xfff0a0], blau: [0x6aa8ff, 0xd0e8ff], lila: [0xa87aff, 0xe8d8ff], rot: [0xff5a5a, 0xffd0c8], weiss: [0xe8e8f4, 0xffffff], orange: [0xff9a3a, 0xffe0b0] };
const pc = (c, d = 'rosa') => PCOL[c] ?? PCOL[d];

function starShape(r1 = 0.5, r0 = 0.22, depth = 0.2) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + (i / 10) * TAU, r = i % 2 ? r0 : r1; if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 1 });
  g.translate(0, 0, -depth / 2);
  g.deleteAttribute('uv');
  return g;
}

const SINGLE = {
  // ------------------------------------------------------------ Weltraum
  planet(it, p, rnd, P, G) {
    const r = it.radius ?? 2, [a, b] = pc(it.color);
    const g = new THREE.SphereGeometry(r, 20, 14);
    P.push(at(colorize(ni(g), (q, n, o) => { const band = Math.sin(q.y / r * 7 + Math.sin(q.x) * 0.6) * 0.5 + 0.5; mixc(C(a), C(b), band * 0.6 + smooth(-0.4, 0.9, n.y) * 0.3, o); }), p));
    if (it.ring !== false) {
      const ring = new THREE.TorusGeometry(r * 1.55, r * 0.09, 4, 36);
      ring.rotateX(Math.PI / 2 + 0.35); ring.rotateZ(0.2);
      G.push(at(fill(ring, b), p));
    }
  },
  stern(it, p, rnd, P, G) {
    const s = it.size ?? 1, pole = it.pole ?? 0;
    const g = starShape(0.5 * s, 0.22 * s, 0.22 * s);
    g.rotateY(it.yaw ?? 0);
    G.push(at(fill(g, it.color ?? 0xffe04a), { x: p.x, y: p.y + pole + 0.5 * s, z: p.z }));
    if (pole > 0) { const st = new THREE.CylinderGeometry(0.06, 0.08, pole, 6); st.translate(0, pole / 2, 0); P.push(at(fill(st, 0xd8d0f0), p)); }
  },
  sterne(it, p, rnd, P, G) {
    const [w, d] = it.size ?? [10, 10], h = it.height ?? 3;
    for (let i = 0; i < (it.n ?? 12); i++) {
      const s = rnd.real(0.25, 0.55);
      const g = starShape(0.5 * s, 0.22 * s, 0.12 * s);
      g.rotateY(rnd.real(0, TAU)); g.rotateX(rnd.real(-0.3, 0.3));
      G.push(at(fill(g, rnd.pick([0xffe04a, 0xffffff, 0xffb0e0, 0xa8e8ff])), { x: p.x + rnd.real(-w / 2, w / 2), y: p.y + rnd.real(0.5, h), z: p.z + rnd.real(-d / 2, d / 2) }));
    }
  },
  rakete(it, p, rnd, P, G) {
    const h = it.height ?? 4, r = h * 0.16, [a, b] = pc(it.color, 'rot');
    const body = new THREE.CylinderGeometry(r, r * 1.05, h * 0.62, 16); body.translate(0, h * 0.31 + h * 0.08, 0);
    P.push(at(shade(body, 0xd8d8e8, 0xffffff), p));
    const nose = new THREE.ConeGeometry(r, h * 0.3, 16); nose.translate(0, h * 0.7 + h * 0.15, 0);
    P.push(at(shade(nose, a, b), p));
    for (let i = 0; i < 3; i++) {
      const fin = new THREE.BoxGeometry(0.08, h * 0.24, r * 1.1); fin.translate(0, h * 0.14, r * 1.05); fin.rotateY((i / 3) * TAU);
      P.push(at(shade(fin, a, b), p));
    }
    const win = new THREE.CylinderGeometry(r * 0.38, r * 0.38, 0.06, 14); win.rotateX(Math.PI / 2); win.translate(0, h * 0.52, r * 0.98);
    G.push(at(fill(win, 0x8ae8ff), p, it.yaw ?? 0));
    const flame = new THREE.ConeGeometry(r * 0.6, h * 0.18, 10); flame.rotateX(Math.PI); flame.translate(0, h * 0.06, 0);
    G.push(at(fill(flame, 0xffb03a), p));
  },
  kristall(it, p, rnd, P, G) {
    const s = it.size ?? 1, [a, b] = pc(it.color, 'lila');
    for (let i = 0; i < (it.n ?? 5); i++) {
      const h = rnd.real(0.8, 1.8) * s;
      const g = new THREE.OctahedronGeometry(0.35 * s, 0); g.scale(1, h / (0.35 * s), 1);
      g.rotateZ(rnd.real(-0.4, 0.4)); g.rotateX(rnd.real(-0.3, 0.3)); g.translate(rnd.real(-0.5, 0.5) * s, h * 0.5, rnd.real(-0.5, 0.5) * s);
      G.push(at(colorize(ni(g), (q, n, o) => mixc(C(a), C(b), smooth(-0.3, 0.9, n.y) * 0.8, o)), p));
    }
  },
  komet(it, p, rnd, P, G) {
    const s = it.size ?? 1, dir = new THREE.Vector3(...(it.dir ?? [1, -0.3, 0])).normalize();
    const head = new THREE.SphereGeometry(0.5 * s, 12, 8);
    G.push(at(fill(head, 0xfff4c8), p));
    for (let i = 1; i <= 5; i++) {
      const t = new THREE.SphereGeometry(0.45 * s * (1 - i * 0.15), 8, 6);
      t.translate(-dir.x * i * 0.55 * s, -dir.y * i * 0.55 * s, -dir.z * i * 0.55 * s);
      G.push(at(fill(t, i % 2 ? 0xa8e8ff : 0xffd0f0), p));
    }
  },
  regenbogen(it, p, rnd, P, G) {
    const w = it.width ?? 6, h = it.height ?? 3;
    const cols = [0xff5a6a, 0xff9a3a, 0xffd23a, 0x5ad86a, 0x3ab8ff, 0x8a6aff];
    cols.forEach((c, i) => {
      const r = w / 2 - i * 0.22;
      const g = new THREE.TorusGeometry(r, 0.12, 5, 28, Math.PI);
      g.scale(1, h / (w / 2), 1);
      g.rotateY(it.yaw ?? 0);
      G.push(at(fill(g, c), p));
    });
  },
  // ------------------------------------------------------------ Holz
  holzkiste(it, p, rnd, P) {
    const s = it.size ?? 1.2;
    const g = new THREE.BoxGeometry(s, s, s); g.translate(0, s / 2, 0);
    P.push(at(colorize(ni(g), (q, n, o) => { const plank = Math.abs(((q.y + 10) % (s / 3)) - s / 6) < 0.03 || Math.abs(Math.abs(q.x) - s / 2) < 0.06 && Math.abs(Math.abs(q.z) - s / 2) < 0.06; mixc(C(0xb07a40), C(0xe8b878), plank ? 0.1 : 0.6 + smooth(-0.5, 0.9, n.y) * 0.3, o); }), p, it.yaw ?? rnd.real(-0.3, 0.3)));
  },
  holzbalken(it, p, rnd, P) {
    const L = it.length ?? 4;
    const g = new THREE.BoxGeometry(L, 0.5, 0.6); g.translate(0, 0.25, 0);
    P.push(at(shade(g, 0x9a5e2a, 0xe0a868), p, it.yaw ?? 0));
  },
  walzenstapel(it, p, rnd, P) {
    const r = it.radius ?? 0.6, n = it.n ?? 3;
    for (let i = 0; i < n; i++) {
      const row = i < 2 ? 0 : 1;
      const g = new THREE.CylinderGeometry(r, r, 3, 14); g.rotateX(Math.PI / 2);
      g.translate((i % 2 ? 1 : -1) * r * (row ? 0 : 1.02), r + row * r * 1.7, 0);
      P.push(at(colorize(ni(g), (q, nn, o) => mixc(C(0x9a5e2a), C(0xf0c890), Math.abs(nn.z) > 0.9 ? 0.8 : 0.4, o)), p, it.yaw ?? 0));
    }
  },
  // ------------------------------------------------------------ Blockland
  riesenblock(it, p, rnd, P) {
    const s = it.size ?? 3, c = C(typeof it.color === 'number' ? it.color : PCOL[it.color]?.[0] ?? 0xff6a3a);
    const g = new THREE.BoxGeometry(s, s, s); g.translate(0, s / 2, 0);
    P.push(at(colorize(ni(g), (q, n, o) => { const edge = Math.max(Math.abs(q.x), Math.abs(q.z)) > s / 2 - 0.2 || q.y > s - 0.2 || q.y < 0.2; const k = (n.y > 0.5 ? 1.1 : Math.abs(n.x) > 0.5 ? 0.82 : 0.95) * (edge ? 0.85 : 1); o[0] = c[0] * k; o[1] = c[1] * k; o[2] = c[2] * k; }), p, it.yaw ?? 0));
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const r = new THREE.SphereGeometry(s * 0.06, 6, 4); r.translate(x * s * 0.36, s - 0.02, z * s * 0.36);
      P.push(at(fill(r, 0xffffff), p));
    }
  },
  retro_wolke(it, p, rnd, P, G) {
    const s = it.size ?? 2;
    for (let k = -1; k <= 1; k++) {
      const g = new THREE.SphereGeometry(s * (k === 0 ? 0.62 : 0.48), 14, 10);
      g.scale(1, 0.85, 0.8); g.translate(k * s * 0.62, k === 0 ? s * 0.15 : 0, 0);
      G.push(at(colorize(ni(g), (q, n, o) => mixc(C(0xd8e8ff), C(0xffffff), smooth(-0.6, 0.3, n.y), o)), p));
    }
  },
  retro_busch(it, p, rnd, P) {
    const s = it.size ?? 1.2;
    for (let k = -1; k <= 1; k++) {
      const g = new THREE.SphereGeometry(s * (k === 0 ? 0.62 : 0.48), 12, 8, 0, TAU, 0, Math.PI / 2);
      g.translate(k * s * 0.6, 0, 0);
      P.push(at(shade(g, 0x2a9a3a, 0x8ae86a), p, it.yaw ?? 0));
    }
  },
  roehre_deko(it, p, rnd, P) {
    const r = it.radius ?? 1, h = it.height ?? 2;
    const body = new THREE.CylinderGeometry(r * 0.88, r * 0.88, h - 0.5, 18); body.translate(0, (h - 0.5) / 2, 0);
    const rim = new THREE.CylinderGeometry(r, r, 0.5, 18); rim.translate(0, h - 0.25, 0);
    P.push(at(shade(body, 0x1a8a3a, 0x6ae86a), p), at(shade(rim, 0x2aa84a, 0x8af08a), p));
  },
  // ------------------------------------------------------------ Waben
  wabe(it, p, rnd, P) {
    const r = it.radius ?? 1, h = it.height ?? 2;
    const g = new THREE.CylinderGeometry(r, r, h, 6); g.translate(0, h / 2, 0);
    const [a, b] = it.color === 'weiss' ? [0xd8d4f0, 0xffffff] : [0xc8881a, 0xffd23a];
    P.push(at(shade(g, a, b), p, it.yaw ?? 0));
  },
  honigtopf(it, p, rnd, P, G) {
    const s = it.size ?? 1;
    const pot = new THREE.SphereGeometry(0.6 * s, 14, 10); pot.scale(1, 0.85, 1); pot.translate(0, 0.5 * s, 0);
    P.push(at(shade(pot, 0xb86a2a, 0xf0a860), p));
    const honey = new THREE.CylinderGeometry(0.5 * s, 0.5 * s, 0.12 * s, 14); honey.translate(0, 0.96 * s, 0);
    G.push(at(fill(honey, 0xffc83a), p));
  },
  // ------------------------------------------------------------ Dschungel
  riesenpflanze(it, p, rnd, P) {
    const s = it.size ?? 4;
    for (let i = 0; i < 6; i++) {
      const g = new THREE.SphereGeometry(1, 12, 6); g.scale(s * 0.18, 0.06 * s, s * 0.45);
      g.translate(0, 0, s * 0.42); g.rotateX(-0.5 - rnd.real(0, 0.4)); g.rotateY((i / 6) * TAU + rnd.real(-0.2, 0.2)); g.translate(0, s * 0.25, 0);
      P.push(at(colorize(ni(g), (q, n, o) => mixc(C(0x1a8a3a), C(0x9af07a), smooth(-0.4, 0.9, n.y) * 0.8, o)), p));
    }
  },
  riesenpilz(it, p, rnd, P) {
    const h = it.height ?? 5, r = it.radius ?? 3, hc = C(typeof it.color === 'number' ? it.color : PCOL[it.color]?.[0] ?? 0xff5a4a);
    const st = new THREE.CylinderGeometry(r * 0.22, r * 0.3, h, 12); st.translate(0, h / 2, 0);
    P.push(at(shade(st, 0xd8c8a8, 0xfff4e0), p));
    const cap = new THREE.SphereGeometry(r, 18, 9, 0, TAU, 0, Math.PI / 2); cap.scale(1, 0.62, 1); cap.translate(0, h - 0.3, 0);
    P.push(at(colorize(ni(cap), (q, n, o) => { const dot = Math.sin(q.x * 2.2) * Math.sin(q.z * 2.2) > 0.6 && n.y > 0.2; const c = dot ? C(0xffffff) : hc; const k = 0.75 + 0.25 * n.y; o[0] = c[0] * k; o[1] = c[1] * k; o[2] = c[2] * k; }), p));
  },
  riesenblume(it, p, rnd, P, G) {
    const h = it.height ?? 5, [a, b] = pc(it.color, 'rosa');
    const st = new THREE.CylinderGeometry(0.12, 0.18, h, 8); st.translate(0, h / 2, 0);
    P.push(at(fill(st, 0x3aa84a), p));
    for (let i = 0; i < 6; i++) {
      const pe = new THREE.SphereGeometry(1, 10, 6); pe.scale(0.5, 0.12, 0.9); pe.translate(0, 0, 0.8); pe.rotateY((i / 6) * TAU); pe.translate(0, h, 0);
      P.push(at(shade(pe, a, b), p));
    }
    const c = new THREE.SphereGeometry(0.45, 12, 8); c.translate(0, h + 0.1, 0);
    G.push(at(fill(c, 0xffe04a), p));
  },
  liane(it, p, rnd, P) {
    const a = v3(it.from ?? it.pos), b = v3(it.to ?? [a.x + 4, a.y, a.z]), sag = it.sag ?? 1, n = 10;
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n;
      const y0 = a.y + (b.y - a.y) * u0 - Math.sin(Math.PI * u0) * sag, y1 = a.y + (b.y - a.y) * u1 - Math.sin(Math.PI * u1) * sag;
      const x0 = a.x + (b.x - a.x) * u0, x1 = a.x + (b.x - a.x) * u1, z0 = a.z + (b.z - a.z) * u0, z1 = a.z + (b.z - a.z) * u1;
      const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
      const g = new THREE.CylinderGeometry(0.07, 0.07, len, 5);
      g.rotateX(Math.PI / 2);   // Achse entlang +Z, dann zur Strecke drehen
      g.lookAt(new THREE.Vector3(x1 - x0, y1 - y0, z1 - z0));
      g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      P.push(fill(g, 0x3a8a3a));
    }
  },
  // ------------------------------------------------------------ Friedhof
  grabstein(it, p, rnd, P) {
    const s = it.size ?? 1, w = 0.9 * s, h = 1.3 * s;
    const b = new THREE.BoxGeometry(w, h, 0.32 * s); b.translate(0, h / 2, 0);
    P.push(at(shade(b, 0x6a708a, 0xb8c0d8), p, it.yaw ?? 0));
    if (it.round !== false) {
      const t = new THREE.CylinderGeometry(w / 2, w / 2, 0.32 * s, 16); t.rotateX(Math.PI / 2);   // Scheibe: oben runder Abschluss
      t.translate(0, h, 0);
      P.push(at(shade(t, 0x6a708a, 0xb8c0d8), p, it.yaw ?? 0));
    }
    const cap = new THREE.SphereGeometry(w * 0.52, 10, 6, 0, TAU, 0, Math.PI / 2); cap.scale(1, 0.32, 0.5); cap.translate(0, h + (it.round !== false ? w * 0.45 : 0), 0);
    P.push(at(shade(cap, 0xe0e8ff, 0xffffff), p, it.yaw ?? 0));
  },
  kahler_baum(it, p, rnd, P) {
    const h = it.height ?? 5;
    const t = new THREE.CylinderGeometry(0.16 * h / 5, 0.3 * h / 5, h, 7); t.translate(0, h / 2, 0);
    P.push(at(fill(t, 0x4a3a4a), p));
    for (let i = 0; i < 4; i++) {
      const a = new THREE.CylinderGeometry(0.04, 0.12, h * 0.42, 5);
      a.translate(0, h * 0.21, 0); a.rotateZ((i % 2 ? 1 : -1) * (0.6 + rnd.real(0, 0.4))); a.rotateY(rnd.real(0, TAU)); a.translate(0, h * (0.5 + i * 0.1), 0);
      P.push(at(fill(a, 0x4a3a4a), p));
    }
  },
  schneehuegel(it, p, rnd, P) {
    const r = it.radius ?? 3;
    const g = new THREE.SphereGeometry(r, 16, 8, 0, TAU, 0, Math.PI / 2); g.scale(1, 0.45, 1);
    P.push(at(shade(g, 0xc8d4f0, 0xffffff), p));
  },
  laterne(it, p, rnd, P, G, level) {
    const h = it.height ?? 2.6;
    const pole = new THREE.CylinderGeometry(0.07, 0.1, h, 6); pole.translate(0, h / 2, 0);
    P.push(at(fill(pole, 0x3a3a4a), p));
    const cage = new THREE.BoxGeometry(0.42, 0.5, 0.42); cage.translate(0, h + 0.25, 0);
    P.push(at(fill(cage, 0x2a2a3a), p));
    const light = new THREE.BoxGeometry(0.32, 0.4, 0.32); light.translate(0, h + 0.25, 0);
    G.push(at(fill(light, 0xffd890), p));
    level.view?.addLantern?.(p.x, p.y + h + 0.25, p.z);
  },
  irrlicht(it, p, rnd, P, G) {
    const g = new THREE.SphereGeometry(0.22, 10, 8);
    G.push(at(fill(g, it.color ?? 0x9af0ff), p));
    const halo = new THREE.SphereGeometry(0.34, 10, 8);
    G.push(at(fill(halo, 0x3a6a8a), p));
  },
  // ------------------------------------------------------------ Kosmos
  antenne(it, p, rnd, P, G) {
    const h = it.height ?? 3;
    const m = new THREE.CylinderGeometry(0.08, 0.14, h, 8); m.translate(0, h / 2, 0);
    P.push(at(shade(m, 0x6a7090, 0xd0d8f0), p));
    const dish = new THREE.SphereGeometry(0.9, 16, 6, 0, TAU, 0, Math.PI / 3); dish.rotateX(-Math.PI / 2 - 0.5); dish.translate(0, h, 0.2);
    P.push(at(shade(dish, 0xa8b0c8, 0xffffff), p, it.yaw ?? 0));
    const tip = new THREE.SphereGeometry(0.12, 8, 6); tip.translate(0, h + 0.6, 0.6);
    G.push(at(fill(tip, 0xff4ad8), p, it.yaw ?? 0));
  },
  neonring(it, p, rnd, P, G) {
    const r = it.radius ?? 2, col = { cyan: 0x3af0ff, pink: 0xff4ad8, gruen: 0x8aff6a, gold: 0xffd23a }[it.color] ?? 0x3af0ff;
    const g = new THREE.TorusGeometry(r, 0.12, 6, 32); g.rotateY(it.yaw ?? 0); g.translate(0, r, 0);
    G.push(at(fill(g, col), p));
  },
  leuchtsaeule(it, p, rnd, P, G) {
    const h = it.height ?? 6;
    const t = new THREE.CylinderGeometry(0.25, 0.6, h, 8); t.translate(0, h / 2, 0);
    P.push(at(shade(t, 0x2a2e48, 0xa8b0d0), p));
    const head = new THREE.OctahedronGeometry(0.6); head.translate(0, h + 0.7, 0);
    G.push(at(fill(head, it.color === 'pink' ? 0xff4ad8 : 0x3af0ff), p));
  },
};

/** Standard-Kollisionsquader je Art (solid: true) – [Breite, Höhe, Tiefe] um den Fuß. */
const SOLID = {
  rakete: (it) => [1.4 * (it.height ?? 4) / 4, it.height ?? 4, 1.4 * (it.height ?? 4) / 4], holzkiste: (it) => [it.size ?? 1.2, it.size ?? 1.2, it.size ?? 1.2],
  riesenblock: (it) => [it.size ?? 3, it.size ?? 3, it.size ?? 3], roehre_deko: (it) => [2 * (it.radius ?? 1), it.height ?? 2, 2 * (it.radius ?? 1)],
  wabe: (it) => [1.7 * (it.radius ?? 1), it.height ?? 2, 1.7 * (it.radius ?? 1)], grabstein: (it) => [0.9 * (it.size ?? 1), 1.6 * (it.size ?? 1), 0.4 * (it.size ?? 1)],
  riesenpilz: (it) => [0.6 * (it.radius ?? 3), it.height ?? 5, 0.6 * (it.radius ?? 3)], kahler_baum: () => [0.6, 5, 0.6], laterne: () => [0.3, 2.6, 0.3],
  antenne: () => [0.4, 3, 0.4], leuchtsaeule: () => [1, 6, 1],
};

/**
 * Kulissen-Modelle der Bonuswelten (Registry, Modell-Agent; props_weltraum_star.js, props_retro_star.js) je Art: Name,
 * opts und Höhenversatz des Ursprungs (Modell-Fußpunkt bzw. -Mitte gegenüber pos). Gebacken (statisch); nebelbank (durch-
 * sichtig) bleibt ein bewegtes Objekt.
 */
const MODEL_MAP = {
  planet: (it) => ['planet', { kind: it.variant ?? (it.ring === false ? 'pilz' : 'ring'), size: 2 * (it.radius ?? 2), tilt: it.tilt }, -(it.radius ?? 2)],
  rakete: (it) => ['spielzeugrakete', { color: it.color === 'weiss' ? 'lila' : it.color ?? 'rot', size: (it.height ?? 4) * 1.15 }, 0],
  komet: (it) => ['sternschnuppe', { length: 4.5 * (it.size ?? 1), size: 1.4 * (it.size ?? 1) }, 0],
  riesenblock: (it) => ['retro_block', { kind: it.block ?? ({ rot: 'ziegel', braun: 'erde', grau: 'hart', gruen: 'gras' }[it.color] ?? 'frage'), size: it.size ?? 3 }, 0],
  retro_wolke: (it) => ['retro_wolke', { size: 2 * (it.size ?? 2), seed: it.seed ?? 0 }, 0],
  retro_busch: (it) => ['retro_busch', { size: 2.5 * (it.size ?? 1.2), seed: it.seed ?? 0 }, 0],
  wabe: (it) => ['wabensaeule', { height: it.height ?? 2, size: it.radius ?? 1, kind: it.variant ?? (it.color === 'weiss' ? 'eis' : 'normal') }, 0],
  riesenpflanze: (it) => ['riesenpflanze', { kind: 'blatt', size: 1.5 * (it.size ?? 4) }, 0],
  riesenpilz: (it) => ['riesenpflanze', { kind: 'pilz', size: it.height ?? 5 }, 0],
  riesenblume: (it) => ['riesenpflanze', { kind: 'blume', size: it.height ?? 5 }, 0],
  grabstein: (it) => ['schneegrab', { kind: it.variant ?? (it.round === false ? 'spitz' : 'rund'), size: 1.2 * (it.size ?? 1), tilt: it.tilt ?? 0 }, 0],
  antenne: (it) => ['weltraum_antenne', { size: it.height ?? 3 }, 0],
  kuppel: (it) => ['weltraum_kuppel', { size: it.size ?? 6 }, 0],
  torbogen: (it) => ['sternen_torbogen', { width: it.width ?? 6, height: it.height ?? 5 }, 0],
  regenbogenweg: (it) => ['regenbogenweg', { length: it.length ?? 8, width: it.width ?? 3, bend: it.bend ?? 0, rise: it.rise ?? 0 }, 0],
  walzen_schiene: (it) => ['walzen_schiene', { length: it.length ?? 12, gauge: it.gauge ?? 6, height: it.height ?? 3 }, 0],
  brett_schiene: (it) => ['brett_schiene', { kind: it.variant ?? 'gerade', length: it.length ?? 8, posts: it.posts ?? 0 }, 0],
  nebelbank: (it) => ['nebelbank', { size: it.size ?? [10, 6], count: it.count ?? 10, color: it.color ?? 0xe8eaff, opacity: it.opacity ?? 0.5, height: it.height ?? 1.2 }, 0],
};

export function buildDecoStar(level, spec) {
  const items = spec.items ?? [spec];
  const parts = { shadow: [], flat: [] };
  const glow = [];
  for (const it0 of items) {
    const it = spec.items && spec.shadow === false && it0.shadow === undefined ? { ...it0, shadow: false } : it0;
    const p = v3(it.pos ?? it.from);
    const rnd = new Rnd((it.seed ?? Math.floor(p.x * 73 + p.z * 37 + p.y * 11)) >>> 0);
    const P = it.shadow === false ? parts.flat : parts.shadow;
    // Kollision
    if (it.solid) {
      const s = Array.isArray(it.solid) ? it.solid : SOLID[it.kind]?.(it);
      if (s) level.world.add({ type: 'box', min: [p.x - s[0] / 2, p.y, p.z - s[2] / 2], max: [p.x + s[0] / 2, p.y + s[1], p.z + s[2] / 2], tag: `deco_star:${it.kind}` });
    }
    // Registry-Modell (Kulissen-Agent) bzw. beliebiges Modell
    const reg = it.kind === 'modell' ? it.name : `deco_star_${it.kind}`;
    if (it.look !== 'eigen' && reg && hasModel(reg)) {
      const { kind, pos, yaw, scale, solid, shadow, look, seed, name, state, ...opts } = it;
      void kind; void pos; void solid; void look; void seed; void name;
      bakeW8(level, reg, it.opts ?? opts, p.x, p.y, p.z, yaw ?? -Math.PI / 2, scale ?? 1, state ?? {}, { castShadow: shadow !== false });
      continue;
    }
    const mm = it.look !== 'eigen' && MODEL_MAP[it.kind]?.(it);
    if (mm && hasModel(mm[0])) {
      const [name, opts, dy] = mm;
      for (const k of Object.keys(opts)) if (opts[k] === undefined) delete opts[k];
      let yaw = it.yaw ?? -Math.PI / 2;
      if (it.kind === 'komet' && Array.isArray(it.dir)) yaw = Math.atan2(-it.dir[2], it.dir[0]);
      if (name === 'nebelbank') {
        // durchsichtig, zieht langsam: als bewegtes Objekt (nicht backen)
        if (level.view) {
          const m = getModel(name, opts);
          m.root.position.set(p.x, p.y, p.z); m.root.rotation.y = it.yaw ?? 0;
          const hd = {};
          addObject(level, m.root, (dt) => m.update?.(visDt(level, hd, dt), {}));
        }
        continue;
      }
      bakeW8(level, name, opts, p.x, p.y + dy, p.z, yaw, it.scale ?? 1, it.state ?? {}, { castShadow: it.shadow !== false });
      continue;
    }
    if (it.kind === 'modell') { console.warn(`[deco_star] Modell ${it.name} fehlt`); continue; }
    const fn = SINGLE[it.kind];
    if (!fn) { console.warn(`[deco_star] unbekannte Art ${it.kind}`); continue; }
    const before = P.length, gb = glow.length;
    fn(it, p, rnd, P, glow, level);
    if (it.scale && it.scale !== 1) {
      for (const g of [...P.slice(before), ...glow.slice(gb)]) { g.translate(-p.x, -p.y, -p.z); g.scale(it.scale, it.scale, it.scale); g.translate(p.x, p.y, p.z); }
    }
  }
  if (!level.view) { for (const g of [...parts.shadow, ...parts.flat, ...glow]) g.dispose(); return; }
  if (parts.shadow.length) addStatic(level, merge(parts.shadow));
  if (parts.flat.length) addStatic(level, merge(parts.flat), { castShadow: false });
  if (glow.length) addStatic(level, merge(glow), { material: 'glow', castShadow: false });
}

export const TYPES = { deco_star: buildDecoStar };
