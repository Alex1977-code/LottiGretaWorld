// Gemeinsame Hilfen der Halloween-Bausteine „Kürbisinsel“ (blocks/types/hw_*.js, deco_hw.js,
// entities/kinds/hw_gimmicks.js). Liegt bewusst außerhalb von types/ (die Registry sammelt nur types/*.js).
//
//   HWC                        Farben (Kürbis, Licht, Lila, Knochen, Hexengrün, Glibber, Süßigkeiten)
//   hwSfx(level, name, fb)     Effekt abspielen; fehlt der Halloween-Klang noch (src/audio), den Ersatz fb
//   modelOr(name, opts, make)  Registry-Modell (hasModel) oder eigene Ersatz-Optik (aus w5kit)
//   pumpkinGeo(o) / faceGeo(o) Kürbis mit Rippen (Vertexfarben) und geschnitztes Gesicht (Glüh-Geometrie)
//   lanternParts()             Handlaterne (Körper + Glas) als Geometrien (Ursprung = Griff unten, Höhe 0,42 m)
//   candyGeo(variant)          Süßigkeit (bonbon | lolli | zuckermais | schoko), ≈ 0,5 m, Ursprung Mitte
//   softTexture() / fogTexture()  weiche Kreis- bzw. Nebel-Textur (Canvas, geteilt)
//   hwLight(level)             Laternenlicht-System (eine je Level, `level.hwLight`), siehe unten
//   ghostBatch(level)          alle Geisterplattformen eines Levels in einem Shader-Mesh (Lichtmaske je Pixel)
//   hwHud(level)               Zähler oben rechts („Türen 3/8“, „Süßes 12“): set(key, { text, icon, done, color })
//   modelGeometry(name, o, st) Registry-Modell zu einer Geometrie (Vertexfarben) backen; modelBox(model) Hüllquader
//   ghostGeometry(size, color) einfache Form der Registry-Geisterplatte (für das Licht-Shader-Mesh)
//   bakeInstanced(level, name, opts, list)  viele Kulissenstücke über die Instanz-Variante der Registry (einfachere
//                              Form: kuerbis | grabstein | maisstaude) in die statische Welt backen
//
// Laternenlicht (`hwLight(level)`): Lichtquellen je Simulationsschritt –
//   · Figuren mit Laterne (alle Figuren, sobald `carried`; Item `laterne` oder LEVEL.lantern: true | { carry, radius,
//     soft, lose, helmet }), Licht in Handhöhe, Radius `radius` (Standard 5 m)
//   · Laternenpfähle (Entität `laternenpfahl`, an/aus/blinken) über addPost()
//   · angezündete Höhlen-Laternen (Entität `lantern`, Welt 1) mit ihrem Radius
//   · Licht-Helm (Kegel nach vorn, drei Lichtkugeln entlang des Kegels)
//   at(x, y, z) → 0..1, box({ x0, x1, y0, y1, z0, z1 }) → 0..1 (Licht am nächsten Punkt des Quaders), list (Quellen),
//   carry(on), info(). Abstand mit gestauchter Höhe (dy · 0,7), weicher Rand `soft` m.
//   Darstellung: Handlaterne an jeder Figur (Modell 'laterne_hand', state { swing, lit }), Lichtkreis am Boden unter
//   jeder Quelle (eine InstancedMesh), Figurenlicht des Themas (playerLight) wird zur warmen Laterne in der Hand.
//   Schnittstelle für Figuren-/Kostüm-Agenten: `player.hwLantern` (true, solange die Figur eine Laterne trägt) – der
//   Avatar kann sie selbst in die Hand nehmen; dann `level.hwLight.handLantern = false` setzen (keine eigene Optik).

import * as THREE from 'three';
import Phaser from 'phaser';
import { GAME } from '../../config.js';
import { uiText } from '../../ui.js';
import { SFX_NAMES } from '../../audio/sfx.js';
import { colorize, merge, lin, mixc, smooth, hex, addStatic } from './kit.js';
import { figures } from './w2kit.js';
import { modelOr } from './w5kit.js';
import { hasModel, getModel } from '../models/index.js';
import * as HW_GIMMICK_MODELS from '../models/kinds/gimmicks_hw.js';
import { createInstanced } from '../models/lib/instanced.js';
import { LIGHT as HELM_LIGHT } from '../player/helmets.js';

export { modelOr, figures };

// ------------------------------------------------------------------ Farben

export const HWC = {
  pk: 0xff8a1a, pkHi: 0xffb84a, pkLow: 0xd85c0c, pkGroove: 0xa8420a,
  pkYellow: 0xffc83a, pkWhite: 0xf4ead8, pkGreen: 0x7aa83a, pkRed: 0xe8502a,
  stem: 0x6a7a2a, stemHi: 0x9aaa4a, leaf: 0x4ec83a, leafLow: 0x2a8a2a,
  glowCore: 0xfff6c0, glow: 0xffd040, glowEdge: 0xff8a14,
  lila: 0x8a4ae0, lilaHi: 0xc59aff, lilaLow: 0x56289e, night: 0x1c1238, ink: 0x1e1428,
  bone: 0xfff7ea, boneLow: 0xd8c8b0, stone: 0x9a96a8, stoneHi: 0xc8c4d4, stoneLow: 0x5e5a6e, moss: 0x6a9a5a,
  potion: 0x7aff4a, potionHi: 0xd8ffb0, potionLow: 0x2ab82a, iron: 0x2e2a36, ironHi: 0x5a5466,
  glibber: 0x8aee3a, glibberHi: 0xe0ff9a, glibberLow: 0x3a9a1a,
  wood: 0xa8743e, woodHi: 0xd29a5a, woodLow: 0x6a4424, straw: 0xf0c860, strawLow: 0xc0943a,
  ghost: 0xc8b8ff, ghostHi: 0xf0e8ff, ghostRim: 0x8af0ff,
  candy: [0xff5a8a, 0xffd23a, 0x6ad8ff, 0x9a6aff, 0x6aea7a, 0xff8a2a],
};

const C = (h) => lin(hex(h));
const ni = (g) => (g.index ? g.toNonIndexed() : g);

// ------------------------------------------------------------------ Klänge

/**
 * Halloween-Klang name (falls es ihn gibt), sonst fallback (vorhandener Effekt). Alle bisher benutzten Namen sind eigene
 * Effekte (src/audio/sfx.js HW_SFX: klingel, tuer, alle_tueren, kessel, blase, netz, laterne, laterne_aus, suessigkeit,
 * muenzregen, buh, grabstein, kuerbis_platzt) – die Ersatznamen an den Aufrufstellen greifen nur noch für neue Namen.
 */
export function hwSfx(level, name, fallback) {
  level.sfx(SFX_NAMES.includes(name) ? name : (fallback ?? name));
}

// ------------------------------------------------------------------ Geometrie: Kürbis, Gesicht, Laterne, Süßigkeit

const PK_SHAPES = { rund: [1, 0.82], flach: [1.08, 0.62], hoch: [0.92, 1.05], dick: [1.1, 0.9] };
const PK_COLORS = {
  orange: [HWC.pk, HWC.pkHi, HWC.pkGroove], gelb: [HWC.pkYellow, 0xfff08a, 0xb88a1a], weiss: [HWC.pkWhite, 0xffffff, 0xc8b8a0],
  gruen: [HWC.pkGreen, 0xb8d870, 0x4a6a2a], rot: [HWC.pkRed, 0xff8a5a, 0x9a2a1a],
};

/**
 * Kürbis mit Rippen (Vertexfarben, nicht indiziert): Ursprung = Mitte der Unterseite, Ø 2·r. o: { r: 0.5, shape:
 * 'rund' | 'flach' | 'hoch' | 'dick', color: 'orange' | 'gelb' | 'weiss' | 'gruen' | 'rot', ribs: 10, stem: true,
 * leaf: true, hole: 0 (Öffnung oben, Radius-Anteil 0..0.8 – Kürbis-Kanone), seg }. Liefert { body, glow, h }.
 */
export function pumpkinGeo(o = {}) {
  const r = o.r ?? 0.5, [sx, sy] = PK_SHAPES[o.shape] ?? PK_SHAPES.rund;
  const [cMain, cHi, cGroove] = (PK_COLORS[o.color] ?? PK_COLORS.orange).map(C);
  const ribs = o.ribs ?? 10, hole = o.hole ?? 0;
  const W = o.seg ?? 28, H = Math.round((o.seg ?? 28) * 0.6);
  const g = new THREE.SphereGeometry(1, W, H);
  const pos = g.attributes.position;
  const ry = r * sy;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const rib = Math.pow(Math.abs(Math.cos(a * ribs / 2)), 0.6);   // 1 = Rippe, 0 = Furche
    const k = 0.9 + 0.1 * rib;
    // oben und unten eingedellt
    const dent = 1 - 0.22 * Math.pow(1 - Math.min(1, Math.hypot(x, z)), 3) * (y > 0 ? 1.4 : 1);
    pos.setXYZ(i, x * r * sx * k, y * ry * dent, z * r * sx * k);
  }
  g.computeVertexNormals();
  g.translate(0, ry * 0.94, 0);
  const body = colorize(ni(g), (p, n, out) => {
    const a = Math.atan2(p.z, p.x);
    const rib = Math.pow(Math.abs(Math.cos(a * ribs / 2)), 0.6);
    mixc(cGroove, cMain, smooth(0.05, 0.6, rib), out);
    mixc(out, cHi, smooth(0.2, 1, n.y * 0.6 + n.x * 0.25 + 0.2) * 0.45 * rib, out);
    if (p.y < ry * 0.2) { out[0] *= 0.82; out[1] *= 0.8; out[2] *= 0.8; }
  });
  const parts = [body];
  const glowParts = [];
  const top = ry * 1.88 - 0.02 * r;
  if (hole > 0) {
    // Öffnung: dunkles Loch mit Rand (die Kürbis-Kanone)
    const R = r * sx * hole;
    const rim = new THREE.TorusGeometry(R, r * 0.09, 8, 24);
    rim.rotateX(Math.PI / 2); rim.translate(0, top - r * 0.04, 0);
    parts.push(colorize(ni(rim), (p, n, out) => mixc(cMain, cHi, smooth(-0.2, 1, n.y), out)));
    const disc = new THREE.CircleGeometry(R * 0.96, 24);
    disc.rotateX(-Math.PI / 2); disc.translate(0, top - r * 0.02, 0);
    parts.push(colorize(ni(disc), (p, n, out) => { out[0] = 0.05; out[1] = 0.02; out[2] = 0.02; }));
    // glühendes Inneres (Rand des Lochs)
    const inner = new THREE.CylinderGeometry(R * 0.95, R * 0.8, r * 0.3, 20, 1, true);
    inner.translate(0, top - r * 0.17, 0);
    glowParts.push(colorize(ni(inner), (p, n, out) => mixc(C(HWC.glowEdge), C(HWC.glow), smooth(top - r * 0.3, top, p.y), out)));
  } else if (o.stem !== false) {
    const sh = r * 0.38;
    const stem = new THREE.CylinderGeometry(r * 0.07, r * 0.11, sh, 7, 2);
    const sp = stem.attributes.position;
    for (let i = 0; i < sp.count; i++) { const y = sp.getY(i) + sh / 2; sp.setX(i, sp.getX(i) + y * y * 0.6); }
    stem.computeVertexNormals();
    stem.translate(0, top + sh / 2 - r * 0.06, 0);
    parts.push(colorize(ni(stem), (p, n, out) => mixc(C(HWC.stem), C(HWC.stemHi), smooth(-0.5, 0.9, n.x + n.y), out)));
    if (o.leaf !== false) {
      const lf = new THREE.CircleGeometry(r * 0.32, 6);
      lf.scale(1.4, 1, 1); lf.rotateX(-Math.PI / 2 + 0.35); lf.rotateY(o.leafYaw ?? 2.4);
      lf.translate(-r * 0.12, top + r * 0.02, r * 0.18);
      parts.push(colorize(ni(lf), (p, n, out) => mixc(C(HWC.leafLow), C(HWC.leaf), 0.55, out)));
    }
  }
  return { body: merge(parts), glow: glowParts.length ? merge(glowParts) : null, h: ry * 1.88 };
}

/**
 * Geschnitztes Gesicht (Glüh-Geometrie, unbeleuchtet) auf der +X-Seite eines Kürbisses (pumpkinGeo mit gleichem r/shape):
 * Dreiecksaugen, Nase, breites Lachen mit Zahnlücken. o: { r, shape, kind: 'lachen' | 'grinsen' | 'staunen', color }.
 */
export function faceGeo(o = {}) {
  const r = o.r ?? 0.5, [sx, sy] = PK_SHAPES[o.shape] ?? PK_SHAPES.rund;
  const ry = r * sy, cy = ry * 0.94, R = r * sx;
  const kind = o.kind ?? 'lachen';
  const shapes = [];
  const tri = (cx, cyy, w, h, tilt = 0) => {
    const s = new THREE.Shape();
    s.moveTo(cx - w / 2, cyy - h / 3 + tilt); s.lineTo(cx + w / 2, cyy - h / 3 - tilt); s.lineTo(cx, cyy + h * 2 / 3); s.closePath();
    shapes.push(s);
  };
  const ew = 0.26, eh = 0.24;
  if (kind === 'staunen') {
    for (const sd of [-1, 1]) { const s = new THREE.Shape(); s.absellipse(sd * 0.22, 0.16, 0.1, 0.12, 0, Math.PI * 2); shapes.push(s); }
    const m = new THREE.Shape(); m.absellipse(0, -0.2, 0.1, 0.13, 0, Math.PI * 2); shapes.push(m);
  } else {
    tri(-0.22, 0.16, ew, eh, kind === 'grinsen' ? 0.03 : 0);
    tri(0.22, 0.16, ew, eh, kind === 'grinsen' ? -0.03 : 0);
    tri(0, -0.02, 0.1, 0.1);
    // Mund: Bogen mit zwei Zahnlücken
    const m = new THREE.Shape();
    const w = kind === 'grinsen' ? 0.5 : 0.42, y0 = -0.14, d = kind === 'grinsen' ? 0.2 : 0.17;
    m.moveTo(-w, y0 + 0.04);
    m.quadraticCurveTo(0, y0 - 0.06, w, y0 + 0.04);
    m.quadraticCurveTo(w * 0.7, y0 - d * 0.9, 0.16, y0 - d);
    m.lineTo(0.12, y0 - d + 0.07); m.lineTo(0.06, y0 - d);
    m.lineTo(-0.06, y0 - d); m.lineTo(-0.12, y0 - d + 0.07); m.lineTo(-0.16, y0 - d);
    m.quadraticCurveTo(-w * 0.7, y0 - d * 0.9, -w, y0 + 0.04);
    shapes.push(m);
  }
  const g = new THREE.ShapeGeometry(shapes, 6);
  const pos = g.attributes.position;
  // auf die Kürbisfläche legen (+X-Seite): Gesichtsfläche (u, v) → Punkt knapp vor den Rippen (Ellipsoid mit dem
  // Rippen-Radius), so verdecken die Rippen das Gesicht nicht
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) * R * 1.0, v = pos.getY(i) * ry * 1.15;
    const t = 1 - (u * u) / (R * R) - (v * v) / (ry * ry);
    const x = R * Math.sqrt(Math.max(0.02, t)) + 0.01 + 0.012 * R;
    pos.setXYZ(i, x, cy + v, -u);
  }
  g.computeVertexNormals();
  const core = C(o.color ?? HWC.glowCore), edge = C(HWC.glow);
  return colorize(ni(g), (p, n, out) => mixc(edge, core, smooth(cy - ry * 0.5, cy + ry * 0.3, p.y), out));
}

/** Handlaterne (Ursprung = Griff oben, hängt nach unten; ≈ 0,42 m): { body, glass } (Glas unbeleuchtet). */
export function lanternParts(scale = 1) {
  const s = scale;
  const body = [], glass = [];
  const dark = C(HWC.iron), hi = C(HWC.ironHi), gold = C(0xd8a040);
  const sh = (g, a = dark, b = hi) => colorize(ni(g), (p, n, out) => mixc(a, b, smooth(-0.5, 0.9, n.y * 0.6 + n.x * 0.4), out));
  const ring = new THREE.TorusGeometry(0.06 * s, 0.012 * s, 5, 12); ring.translate(0, 0, 0);
  body.push(sh(ring, gold, C(0xffe08a)));
  const cap = new THREE.ConeGeometry(0.11 * s, 0.08 * s, 8); cap.translate(0, -0.1 * s, 0);
  body.push(sh(cap));
  const top = new THREE.CylinderGeometry(0.11 * s, 0.11 * s, 0.03 * s, 8); top.translate(0, -0.15 * s, 0);
  body.push(sh(top, gold, C(0xffe08a)));
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const bar = new THREE.BoxGeometry(0.018 * s, 0.2 * s, 0.018 * s);
    bar.translate(Math.cos(a) * 0.085 * s, -0.27 * s, Math.sin(a) * 0.085 * s);
    body.push(sh(bar));
  }
  const bot = new THREE.CylinderGeometry(0.1 * s, 0.12 * s, 0.05 * s, 8); bot.translate(0, -0.39 * s, 0);
  body.push(sh(bot, gold, C(0xffe08a)));
  const gl = new THREE.CylinderGeometry(0.075 * s, 0.075 * s, 0.19 * s, 8); gl.translate(0, -0.27 * s, 0);
  glass.push(colorize(ni(gl), (p, n, out) => mixc(C(HWC.glowEdge), C(HWC.glowCore), smooth(-0.37 * s, -0.2 * s, p.y), out)));
  return { body: merge(body), glass: merge(glass) };
}

const CANDY_V = ['bonbon', 'lolli', 'zuckermais', 'schoko'];
export const CANDY_VARIANTS = CANDY_V;

/** Süßigkeit (≈ 0,5 m, Ursprung Mitte, Vertexfarben): bonbon (Wickel), lolli, zuckermais, schoko (Riegel). */
export function candyGeo(variant = 'bonbon', tint = 0) {
  const parts = [];
  const col = C(HWC.candy[tint % HWC.candy.length]), white = C(0xffffff);
  const sh = (g, a, b) => colorize(ni(g), (p, n, out) => mixc(a, b, smooth(-0.6, 0.9, n.y * 0.7 + n.x * 0.3), out));
  if (variant === 'lolli') {
    const disc = new THREE.CylinderGeometry(0.2, 0.2, 0.08, 20); disc.rotateX(Math.PI / 2); disc.translate(0, 0.08, 0);
    parts.push(colorize(ni(disc), (p, n, out) => {
      const a = Math.atan2(p.y - 0.08, p.x), d = Math.hypot(p.x, p.y - 0.08);
      const sw = Math.sin(a * 2 + d * 26) > 0;
      mixc(sw ? col : C(0xff5a8a), white, Math.abs(n.z) > 0.5 ? 0 : 0.2, out);
    }));
    const stick = new THREE.CylinderGeometry(0.018, 0.018, 0.3, 6); stick.translate(0, -0.2, 0);
    parts.push(sh(stick, C(0xe8e0d0), white));
  } else if (variant === 'zuckermais') {
    const g = new THREE.ConeGeometry(0.16, 0.42, 12, 6); g.translate(0, 0, 0);
    parts.push(colorize(ni(g), (p, n, out) => { const y = p.y; const c = y < -0.07 ? C(0xffd23a) : y < 0.08 ? C(0xff8a1a) : white; mixc(c, white, smooth(0.4, 1, n.y) * 0.3, out); }));
  } else if (variant === 'schoko') {
    const bar = new THREE.BoxGeometry(0.42, 0.1, 0.2);
    parts.push(sh(bar, C(0x5a2a14), C(0x9a5a30)));
    const wrap = new THREE.BoxGeometry(0.22, 0.12, 0.22); wrap.translate(-0.11, 0, 0);
    parts.push(sh(wrap, col, C(0xffffff)));
  } else {
    const ball = new THREE.SphereGeometry(0.15, 14, 10); ball.scale(1.25, 1, 1);
    parts.push(colorize(ni(ball), (p, n, out) => { const st = Math.sin(p.x * 30 + p.y * 18) > 0.55; mixc(st ? white : col, white, smooth(0.6, 1, n.y) * 0.25, out); }));
    for (const sd of [-1, 1]) {
      const tw = new THREE.ConeGeometry(0.12, 0.16, 8); tw.rotateZ(sd * Math.PI / 2); tw.translate(sd * 0.25, 0, 0);
      parts.push(sh(tw, col, white));
    }
  }
  return merge(parts);
}

// ------------------------------------------------------------------ Texturen

let SOFT = null, FOG = null;
/** Weicher Kreis (weiß, Rand durchsichtig). */
export function softTexture() {
  if (SOFT || typeof document === 'undefined') return SOFT;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.85, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  SOFT = new THREE.CanvasTexture(c); SOFT.colorSpace = THREE.SRGBColorSpace;
  return SOFT;
}

/** Nebel-Textur (weiche Wolkenflecken, kachelbar). */
export function fogTexture() {
  if (FOG || typeof document === 'undefined') return FOG;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 128, 128);
  let s = 1234;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 46; i++) {
    const x = rnd() * 128, y = rnd() * 128, r = 10 + rnd() * 26, a = 0.08 + rnd() * 0.16;
    for (const ox of [-128, 0, 128]) for (const oy of [-128, 0, 128]) {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      gr.addColorStop(0, `rgba(255,255,255,${a.toFixed(3)})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    }
  }
  FOG = new THREE.CanvasTexture(c); FOG.colorSpace = THREE.SRGBColorSpace;
  FOG.wrapS = FOG.wrapT = THREE.RepeatWrapping;
  return FOG;
}

// ------------------------------------------------------------------ Laternenlicht

const MAXL = 8;

class HwLight {
  constructor(level) {
    this.level = level;
    const d = level.data ?? {};
    const cfg = d.lantern && typeof d.lantern === 'object' ? d.lantern : {};
    this.radius = cfg.radius ?? 5;
    this.soft = cfg.soft ?? 1.2;
    this.carried = d.lantern === true || !!cfg.carry;
    this.lose = !!cfg.lose;
    this.helmet = cfg.helmet !== false;
    this.handLantern = true;
    this.posts = [];
    this.list = [];
    this.pickups = 0;
    this.wasDead = false;
    this.onLose = [];
    level.onStep(() => this.step());
    this.step();
    if (level.view) this.view = new HwLightView(this);
  }

  /** Einstellungen (Baustein laternenlicht): radius, soft, carry (Figuren tragen von Anfang an), lose, helmet. */
  configure(o = {}) {
    if (o.radius !== undefined) this.radius = o.radius;
    if (o.soft !== undefined) this.soft = o.soft;
    if (o.carry) this.carried = true;
    if (o.lose !== undefined) this.lose = !!o.lose;
    if (o.helmet !== undefined) this.helmet = !!o.helmet;
  }

  carry(on = true) {
    if (on === this.carried) return;
    this.carried = on;
    if (on) this.pickups++;
  }

  /** Laternenpfahl anmelden: post = { x, y, z, r, on } (on wird gelesen). */
  addPost(post) { this.posts.push(post); return post; }
  removePost(post) { const i = this.posts.indexOf(post); if (i >= 0) this.posts.splice(i, 1); }

  step() {
    const L = this.level;
    const p = L.player;
    if (p) {
      if (p.dead && !this.wasDead && this.carried && this.lose) { this.carried = false; for (const fn of this.onLose) fn(); }
      this.wasDead = !!p.dead;
    }
    const list = this.list;
    list.length = 0;
    for (const f of figures(L)) {
      f.hwLantern = this.carried;
      if (f.hidden) continue;
      const h = f.half.y * 2;
      if (this.carried) list.push({ x: f.pos.x, y: f.pos.y + h * 0.62, z: f.pos.z, r: this.radius, kind: 'figur', fig: f });
      if (this.helmet && f.helmet === 'licht') {
        const fv = f.facingVec();
        const hy = f.pos.y + h * 0.92;
        for (const a of [1.6, 3.6, 5.6]) {
          list.push({ x: f.pos.x + fv.x * a, y: hy - a * Math.tan(HELM_LIGHT.pitch), z: f.pos.z + fv.z * a, r: 0.5 + a * HELM_LIGHT.tan * 0.9, kind: 'helm', fig: f });
        }
      }
    }
    for (const q of this.posts) if (q.on) list.push({ x: q.x, y: q.y, z: q.z, r: q.r, kind: 'pfahl', post: q });
    for (const e of L.entities) {
      if (e.kind === 'lantern' && e.lit && e.alive) list.push({ x: e.pos.x, y: e.lampY ?? e.pos.y + 1.9, z: e.pos.z, r: e.radius ?? 6, kind: 'laterne' });
    }
  }

  /** Licht an einem Punkt 0..1. */
  at(x, y, z) {
    let k = 0;
    for (const s of this.list) {
      const d = Math.hypot(x - s.x, (y - s.y) * 0.7, z - s.z);
      k = Math.max(k, Math.min(1, Math.max(0, (s.r - d) / this.soft)));
      if (k >= 1) break;
    }
    return k;
  }

  /** Licht am nächsten Punkt des Quaders b = { x0, x1, y0, y1, z0, z1 } (0..1); kinds: nur diese Quellenarten. */
  box(b, kinds = null) {
    let k = 0;
    for (const s of this.list) {
      if (kinds && !kinds.includes(s.kind)) continue;
      const cx = Math.max(b.x0, Math.min(s.x, b.x1)), cy = Math.max(b.y0, Math.min(s.y, b.y1)), cz = Math.max(b.z0, Math.min(s.z, b.z1));
      const d = Math.hypot(s.x - cx, (s.y - cy) * 0.7, s.z - cz);
      k = Math.max(k, Math.min(1, Math.max(0, (s.r - d) / this.soft)));
      if (k >= 1) break;
    }
    return k;
  }

  info() {
    return { carried: this.carried, radius: this.radius, pickups: this.pickups, sources: this.list.map((s) => [s.kind, +s.x.toFixed(2), +s.y.toFixed(2), +s.z.toFixed(2), +s.r.toFixed(2)]), posts: this.posts.length };
  }
}

/** Darstellung des Laternenlichts: Handlaternen, Lichtkreise am Boden, Figurenlicht als Laterne. */
class HwLightView {
  constructor(sys) {
    this.sys = sys;
    const level = this.level = sys.level;
    const view = level.view;
    this.hands = new Map();
    // Lichtkreise am Boden (alle Quellen außer Helm-Kugeln), eine InstancedMesh
    const g = new THREE.PlaneGeometry(2, 2); g.rotateX(-Math.PI / 2);
    this.pools = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ map: softTexture(), color: 0xffc070, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending, fog: true }), 16);
    this.pools.frustumCulled = false; this.pools.renderOrder = 2; this.pools.count = 0; this.pools.castShadow = false; this.pools.receiveShadow = false;
    this.pools.name = 'lichtkreise';
    view.add(this.pools);
    this.pools.userData.owned = true;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3();
    this.base = view.playerLight ? { color: view.playerLight.color.clone(), intensity: view.playerLight.intensity, distance: view.playerLight.distance } : null;
    this.warm = new THREE.Color(0xffb860);
    this.groundY = new Map();
    view.onFrame((dt, t) => this.frame(dt, t));
  }

  handFor(f) {
    let h = this.hands.get(f);
    if (h) return h;
    const root = new THREE.Group();
    root.name = 'handlaterne';
    const model = modelOr('laterne_hand', {}, () => {
      const { body, glass } = lanternParts(1);
      const r = new THREE.Group();
      const mb = new THREE.Mesh(body, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.3 }));
      const mg = new THREE.Mesh(glass, new THREE.MeshBasicMaterial({ vertexColors: true }));
      mb.castShadow = true;
      r.add(mb, mg);
      return { root: r };
    });
    root.add(model.root);
    const reg = hasModel('laterne_hand');
    if (!reg) {
      // Ersatz-Optik: eigener Schein (das Registry-Modell hat einen)
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(), color: 0xffc860, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.scale.set(1.3, 1.3, 1);
      glow.position.y = -0.27;
      model.root.add(glow);
      root.traverse((o) => { if (o.isMesh || o.isSprite) o.userData.owned = true; });
    }
    this.level.view.add(root);
    // Registry-Laterne ≈ 0,6 m → in der Hand ≈ 0,42 m (Figur 0,95 m)
    h = { root, model, swing: 0, swingV: 0, last: null, k: reg ? 0.7 : 1 };
    this.hands.set(f, h);
    return h;
  }

  frame(dt, t) {
    const sys = this.sys, level = this.level, view = level.view;
    const figs = figures(level);
    const show = sys.carried && sys.handLantern;
    // Handlaternen
    for (const [f, h] of this.hands) if (!figs.includes(f) || !show || f.hidden) h.root.visible = false;
    if (show) {
      for (const f of figs) {
        if (f.hidden) continue;
        const h = this.handFor(f);
        h.root.visible = true;
        const fx = Math.cos(f.yaw), fz = -Math.sin(f.yaw);
        const H = f.half.y * 2;
        const x = f.pos.x - fz * 0.34 * H + fx * 0.1, z = f.pos.z + fx * 0.34 * H + fz * 0.1, y = f.pos.y + H * 0.6;
        // Pendeln: Beschleunigung der Hand schiebt die Laterne nach hinten
        const d = Math.min(0.25, Math.max(1e-3, dt));
        const along = h.last ? ((x - h.last.x) * fx + (z - h.last.z) * fz) / d : 0;
        // gedämpftes Pendel in Teilschritten (stabil bei großen Bild-Abständen)
        for (let rem = d; rem > 1e-6; rem -= 1 / 120) {
          const s = Math.min(rem, 1 / 120);
          h.swingV += (-along * 0.06 - h.swing * 30 - h.swingV * 4) * s;
          h.swing += h.swingV * s;
        }
        h.swing = Math.max(-0.6, Math.min(0.6, h.swing));
        h.last = { x, z };
        h.root.position.set(x, y, z);
        h.root.rotation.set(0, f.yaw, h.swing, 'YXZ');
        h.root.scale.setScalar((H / 0.95) * h.k);
        h.model.update?.(dt, { lit: true, swing: h.swing });
      }
    }
    // Figurenlicht als warme Laterne
    const pl = view.playerLight, main = level.player;
    if (pl && this.base) {
      if (show && main && !main.dead) {
        const h = this.hands.get(main);
        // über der Hand, etwas höher (keine grellen Flecken auf nahen Flächen)
        if (h?.root.visible) pl.position.set(h.root.position.x, main.pos.y + main.half.y * 2 + 1.1, h.root.position.z);
        pl.color.copy(this.warm);
        pl.intensity = Math.max(pl.intensity, 11);
        pl.distance = sys.radius * 2.2;
      }
    }
    // Lichtkreise am Boden
    let n = 0;
    const M = this._m, P = this._p, Q = this._q, S = this._s;
    for (const s of sys.list) {
      if (s.kind === 'helm' || n >= 16) continue;
      let gy = s.y - 1.2;
      if (s.kind === 'figur') {
        const hit = level.world.raycastDown(s.x, s.y + 0.2, s.z, 12);
        gy = hit ? hit.y : s.fig.pos.y;
      } else if (s.post) gy = s.post.ground ?? s.y - 2;
      P.set(s.x, gy + 0.05, s.z);
      const r = s.r * (s.kind === 'figur' ? 1 : 0.9) * (1 + 0.02 * Math.sin(t * 7 + n));
      S.set(r, 1, r);
      M.compose(P, Q, S);
      this.pools.setMatrixAt(n++, M);
    }
    this.pools.count = n;
    this.pools.instanceMatrix.needsUpdate = true;
  }
}

/**
 * Geometrie eines Registry-Modells (Modell-Raum, Ursprung wie das Modell) als ein nicht indiziertes Mesh mit position,
 * normal, color – für eigene Shader (Geisterplatten). Nur sichtbare Meshes ohne Textur; Instanz-Teile je Instanz;
 * einfarbige Teile bekommen ihre Materialfarbe. null, wenn es das Modell nicht gibt.
 */
export function modelGeometry(name, opts = {}, state = {}) {
  if (!hasModel(name)) return null;
  const m = getModel(name, opts);
  m.update?.(0, state);
  const root = m.root;
  root.position.set(0, 0, 0); root.rotation.set(0, 0, 0); root.scale.set(1, 1, 1);
  root.updateMatrixWorld(true);
  const parts = [];
  const M = new THREE.Matrix4(), IM = new THREE.Matrix4();
  root.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    for (let q = o.parent; q; q = q.parent) if (!q.visible) return;
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!mat || mat.map || mat.blending === THREE.AdditiveBlending) return;
    const mats = [];
    if (o.isInstancedMesh) for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, IM); if (Math.abs(IM.determinant()) > 1e-9) mats.push(M.clone().multiplyMatrices(o.matrixWorld, IM)); }
    else mats.push(o.matrixWorld.clone());
    for (const W of mats) {
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const a of Object.keys(g.attributes)) if (a !== 'position' && a !== 'normal' && a !== 'color') g.deleteAttribute(a);
      if (!g.attributes.normal) g.computeVertexNormals();
      if (!g.attributes.color || !mat.vertexColors) {
        const c = mat.color ?? new THREE.Color(1, 1, 1), n = g.attributes.position.count;
        const arr = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
        g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      } else if (g.attributes.color.itemSize !== 3) {
        const src = g.attributes.color, n = src.count, arr = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { arr[i * 3] = src.getX(i); arr[i * 3 + 1] = src.getY(i); arr[i * 3 + 2] = src.getZ(i); }
        g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      }
      g.applyMatrix4(W);
      parts.push(g);
    }
  });
  m.dispose?.();
  return parts.length ? merge(parts) : null;
}

/** Geisterplatte für das Licht-Shader-Mesh: die einfache Form (lo) des Registry-Modells 'geisterplattform'
 *  (ghostPlatformGeo aus models/kinds/gimmicks_hw.js; spart ≈⅔ der Dreiecke), sonst das ganze Modell gebacken. */
export function ghostGeometry(size, color) {
  const f = HW_GIMMICK_MODELS.ghostPlatformGeo;
  if (typeof f !== 'function') return modelGeometry('geisterplattform', { size, color });
  const src = f(size[0], size[1], size[2], color, true, true);
  const g = src.index ? src.toNonIndexed() : src.clone();
  for (const a of Object.keys(g.attributes)) if (a !== 'position' && a !== 'normal' && a !== 'color') g.deleteAttribute(a);
  if (!g.attributes.normal) g.computeVertexNormals();
  const c = g.attributes.color, n = g.attributes.position.count;
  if (!c || c.itemSize !== 3) {
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = c ? c.getX(i) : 1; arr[i * 3 + 1] = c ? c.getY(i) : 1; arr[i * 3 + 2] = c ? c.getZ(i) : 1; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  }
  return g;
}

/** Rückseite einer nicht indizierten Geometrie (Dreiecke umgedreht, Normalen gespiegelt). */
function flipped(g) {
  const r = g.clone();
  for (const name of Object.keys(r.attributes)) {
    const a = r.attributes[name], k = a.itemSize, arr = a.array;
    for (let t = 0; t < a.count; t += 3) for (let c = 0; c < k; c++) { const i1 = (t + 1) * k + c, i2 = (t + 2) * k + c; const tmp = arr[i1]; arr[i1] = arr[i2]; arr[i2] = tmp; }
  }
  const n = r.attributes.normal.array;
  for (let i = 0; i < n.length; i++) n[i] = -n[i];
  return r;
}

/** Viele gleiche Kulissenstücke über die Instanz-Variante der Registry (createInstanced(name, n, opts) – einfachere Form,
 *  z. B. kuerbis | grabstein | maisstaude) in die statische Welt backen: list [{ x, y, z, yaw, scale, tilt }] (Ursprung
 *  wie das Einzelmodell). false = Art nicht vorhanden (dann Einzelmodelle/eigene Geometrie). */
export function bakeInstanced(level, name, opts, list, castShadow = true) {
  if (!level.view || !list.length) return false;
  let api = null;
  try { api = createInstanced(name, list.length, opts); } catch { return false; }
  const q = new THREE.Quaternion(), qt = new THREE.Quaternion(), ax = new THREE.Vector3(0, 1, 0), tx = new THREE.Vector3(1, 0, 0);
  list.forEach((it, i) => {
    q.setFromAxisAngle(ax, it.yaw ?? 0);
    if (it.tilt) q.multiply(qt.setFromAxisAngle(tx, it.tilt));
    api.setAt(i, [it.x, it.y, it.z], q.clone(), it.scale ?? 1, 'idle');
  });
  api.update?.(0);
  api.root.updateMatrixWorld(true);
  const world = [], glow = [];
  const M = new THREE.Matrix4(), IM = new THREE.Matrix4();
  api.root.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!mat || mat.map || mat.transparent) return;
    const out = mat.isMeshBasicMaterial ? glow : world;
    const n = o.isInstancedMesh ? o.count : 1;
    for (let i = 0; i < n; i++) {
      if (o.isInstancedMesh) { o.getMatrixAt(i, IM); if (Math.abs(IM.determinant()) < 1e-9) continue; M.multiplyMatrices(o.matrixWorld, IM); } else M.copy(o.matrixWorld);
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const a of Object.keys(g.attributes)) if (a !== 'position' && a !== 'normal' && a !== 'color') g.deleteAttribute(a);
      if (!g.attributes.normal) g.computeVertexNormals();
      const c = mat.color ?? new THREE.Color(1, 1, 1), cnt = g.attributes.position.count;
      const src = mat.vertexColors && g.attributes.color ? g.attributes.color : null;
      const arr = new Float32Array(cnt * 3);
      for (let k = 0; k < cnt; k++) {
        arr[k * 3] = (src ? src.getX(k) : 1) * c.r; arr[k * 3 + 1] = (src ? src.getY(k) : 1) * c.g; arr[k * 3 + 2] = (src ? src.getZ(k) : 1) * c.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      g.applyMatrix4(M);
      out.push(g);
      if (mat.side === THREE.DoubleSide) out.push(flipped(g));   // zweiseitige Blätter: Rückseite als eigene Dreiecke
    }
  });
  api.dispose?.();
  if (world.length) addStatic(level, merge(world), { material: 'world', castShadow });
  if (glow.length) addStatic(level, merge(glow), { material: 'glow', castShadow: false });
  return true;
}

/** Hüllquader eines Modells (lokal, ohne Lage/Drehung) → THREE.Box3; nur Meshes. largest: nur das größte Mesh. */
export function modelBox(model, largest = false) {
  const root = model.root;
  const p = root.position.clone(), r = root.rotation.clone(), s = root.scale.clone();
  root.position.set(0, 0, 0); root.rotation.set(0, 0, 0); root.scale.set(1, 1, 1);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3(), tmp = new THREE.Box3();
  let best = -1;
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || !o.geometry) return;
    for (let q = o; q; q = q.parent) if (!q.visible) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
    if (largest) { const v = tmp.getSize(new THREE.Vector3()); const vol = v.x * v.y * v.z; if (vol > best) { best = vol; box.copy(tmp); } }
    else box.union(tmp);
  });
  root.position.copy(p); root.rotation.copy(r); root.scale.copy(s);
  root.updateMatrixWorld(true);
  return box;
}

/** Laternenlicht-System des Levels (eine Instanz, `level.hwLight`). */
export function hwLight(level) {
  if (!level.hwLight) level.hwLight = new HwLight(level);
  return level.hwLight;
}

// ------------------------------------------------------------------ Geisterplattformen (ein Shader-Mesh je 64)

const GHOST_N = 64;

const GHOST_VERT = `
attribute float aGid;
attribute vec2 aMask;
uniform float uVis[${GHOST_N}];
varying vec3 vWp;
varying vec3 vN;
varying vec3 vCol;
varying float vVis;
varying vec2 vMask;
#include <common>
#include <fog_pars_vertex>
void main() {
  vCol = color;
  vMask = aMask;
  vVis = uVis[int(aGid + 0.5)];
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWp = wp.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const GHOST_FRAG = `
uniform vec4 uL[${MAXL}];
uniform float uK[${MAXL}];
uniform int uN;
uniform float uSoft;
uniform float uTime;
uniform float uHint;
uniform vec3 uRim;
varying vec3 vWp;
varying vec3 vN;
varying vec3 vCol;
varying float vVis;
varying vec2 vMask;
#include <common>
#include <fog_pars_fragment>
void main() {
  float m = 0.0;
  for (int i = 0; i < ${MAXL}; i++) {
    if (i >= uN) break;
    vec4 L = uL[i];
    vec3 d = vWp - L.xyz; d.y *= 0.7;
    // Lichtart der Quelle (uK: 0 = Figur/Helm, 1 = Pfahl/Laterne) muss zur Platte passen (light 'laterne' | 'pfahl')
    float w = uK[i] < 0.5 ? vMask.x : vMask.y;
    m = max(m, w * (1.0 - smoothstep(L.w - uSoft, L.w, length(d))));
  }
  float vis = max(m, vVis);
  float sh = 0.5 + 0.5 * sin(vWp.x * 2.3 + vWp.z * 1.7 + uTime * 2.0);
  float a = max(vis, uHint * (0.55 + 0.45 * sh));
  if (a < 0.01) discard;
  vec3 V = normalize(cameraPosition - vWp);
  float fr = pow(1.0 - abs(dot(normalize(vN), V)), 2.0);
  float edge = clamp(m * (1.0 - m) * 4.0, 0.0, 1.0);
  float sp = smoothstep(0.93, 1.0, sin(vWp.x * 9.1 + uTime * 1.3) * sin(vWp.z * 8.3 - uTime * 1.1) * 0.5 + 0.5) * m;
  vec3 col = vCol * (0.7 + 0.45 * m) + uRim * (fr * 0.8 + edge * 0.6) + vec3(1.0) * sp * 0.8;
  gl_FragColor = vec4(col, clamp(a * (0.62 + 0.3 * fr + 0.2 * edge), 0.0, 0.95));
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

class GhostBatch {
  constructor(level) {
    this.level = level;
    this.items = [];          // { geo, vis }
    this.meshes = [];
    this.dirty = false;
    this.shared = { uL: { value: Array.from({ length: MAXL }, () => new THREE.Vector4(0, -1e4, 0, 0)) }, uK: { value: new Float32Array(MAXL) }, uN: { value: 0 }, uSoft: { value: 1.2 }, uTime: { value: 0 }, uHint: { value: 0 }, uRim: { value: new THREE.Color(HWC.ghostRim) } };
    if (level.view) level.view.onFrame((dt, t) => this.frame(dt, t));
  }

  /** Geometrie (Weltkoordinaten, nicht indiziert, mit color) anmelden → Index für setVis. mask [Figur, Pfahl]: welche
   *  Lichtquellen die Platte im Licht-Shader zeigen (Geisterplattform light 'laterne' → [1, 0], 'pfahl' → [0, 1]). */
  add(geo, mask = [1, 1]) {
    const i = this.items.length;
    const n = geo.attributes.position.count;
    geo.setAttribute('aGid', new THREE.Float32BufferAttribute(new Float32Array(n).fill(i % GHOST_N), 1));
    const mk = new Float32Array(n * 2);
    for (let k = 0; k < n; k++) { mk[k * 2] = mask[0]; mk[k * 2 + 1] = mask[1]; }
    geo.setAttribute('aMask', new THREE.Float32BufferAttribute(mk, 2));
    this.items.push({ geo, vis: 0 });
    this.dirty = true;
    return i;
  }

  setVis(i, v) { if (this.items[i]) this.items[i].vis = v; }

  build() {
    this.dirty = false;
    for (const m of this.meshes) { m.parent?.remove(m); m.geometry.dispose(); m.material.dispose(); }
    this.meshes = [];
    for (let c = 0; c * GHOST_N < this.items.length; c++) {
      const geos = this.items.slice(c * GHOST_N, (c + 1) * GHOST_N).map((it) => it.geo);
      const g = merge(geos.map((x) => x.clone()));
      const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog]);
      Object.assign(uniforms, this.shared, { uVis: { value: new Float32Array(GHOST_N) } });
      const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: GHOST_VERT, fragmentShader: GHOST_FRAG, transparent: true, depthWrite: false, fog: true, vertexColors: true });
      const mesh = new THREE.Mesh(g, mat);
      mesh.name = 'geisterplattformen';
      mesh.renderOrder = 3;
      mesh.castShadow = false; mesh.receiveShadow = false;
      mesh.userData.chunk = c;
      this.level.view.add(mesh);
      this.meshes.push(mesh);
    }
  }

  frame(dt, t) {
    if (this.dirty) this.build();
    if (!this.meshes.length) return;
    const sys = this.level.hwLight;
    const s = this.shared;
    s.uTime.value = t;
    s.uSoft.value = sys?.soft ?? 1.2;
    // Lichtquellen: die nächsten MAXL zur Kamera-Zielfigur
    const list = sys ? sys.list.slice() : [];
    const tg = this.level.view.rig?.target;
    if (tg && list.length > MAXL) list.sort((a, b) => Math.hypot(a.x - tg.x, a.z - tg.z) - Math.hypot(b.x - tg.x, b.z - tg.z));
    const n = Math.min(MAXL, list.length);
    for (let i = 0; i < MAXL; i++) {
      const q = list[i];
      if (i < n) s.uL.value[i].set(q.x, q.y, q.z, q.r); else s.uL.value[i].set(0, -1e4, 0, 0);
      s.uK.value[i] = i < n && (q.kind === 'pfahl' || q.kind === 'laterne') ? 1 : 0;
    }
    s.uN.value = n;
    for (const m of this.meshes) {
      const arr = m.material.uniforms.uVis.value, c = m.userData.chunk;
      for (let i = 0; i < GHOST_N; i++) arr[i] = this.items[c * GHOST_N + i]?.vis ?? 0;
    }
  }
}

/** Geister-Mesh des Levels (eine Instanz, `level._hwGhosts`). hint (Schimmer im Dunkeln) über batch.shared.uHint. */
export function ghostBatch(level) {
  if (!level._hwGhosts) level._hwGhosts = new GhostBatch(level);
  return level._hwGhosts;
}

// ------------------------------------------------------------------ Zähler-HUD oben rechts

const ICON = {
  tuer(g, x, y) { g.fillStyle(0xb86a3a, 1); g.fillRoundedRect(x - 3.5, y - 5, 7, 10, { tl: 3.5, tr: 3.5, bl: 0, br: 0 }); g.fillStyle(0xffd23a, 1); g.fillCircle(x + 1.6, y + 1, 0.9); },
  bonbon(g, x, y) { g.fillStyle(0xff5a8a, 1); g.fillCircle(x, y, 3.2); g.fillTriangle(x - 3, y, x - 6.5, y - 3, x - 6.5, y + 3); g.fillTriangle(x + 3, y, x + 6.5, y - 3, x + 6.5, y + 3); g.fillStyle(0xffffff, 0.8); g.fillCircle(x - 1, y - 1, 1); },
  kuerbis(g, x, y) { g.fillStyle(0xff8a1a, 1); g.fillEllipse(x, y + 0.5, 9, 7.5); g.fillStyle(0x6a7a2a, 1); g.fillRect(x - 0.6, y - 5, 1.4, 2.5); g.fillStyle(0xffe070, 1); g.fillTriangle(x - 2.6, y - 0.6, x - 0.8, y - 0.6, x - 1.7, y - 2); g.fillTriangle(x + 0.8, y - 0.6, x + 2.6, y - 0.6, x + 1.7, y - 2); },
  laterne(g, x, y) { g.fillStyle(0x3a3440, 1); g.fillRect(x - 3, y - 5, 6, 1.5); g.fillRect(x - 3, y + 3.5, 6, 1.5); g.fillStyle(0xffc84a, 1); g.fillRect(x - 2.2, y - 3.5, 4.4, 7); },
};

class HwHud {
  constructor(level) {
    this.level = level;
    this.course = level.scene ?? null;
    this.rows = new Map();     // key → { text, icon, done, color, order, t }
    this.ui = null; this.objs = null; this.key = '';
    if (level.view) level.view.onFrame((dt) => this.tick(dt));
  }

  /** Zeile setzen/ändern: { text, icon: 'tuer'|'bonbon'|'kuerbis'|'laterne', done, color, hold (s sichtbar nach done) }. */
  set(key, o) {
    const old = this.rows.get(key);
    const row = { order: old?.order ?? this.rows.size, ...old, ...o };
    row.t = row.done ? (o.hold ?? old?.t ?? 3) : Infinity;
    this.rows.set(key, row);
  }

  remove(key) { this.rows.delete(key); }

  state() { return Object.fromEntries([...this.rows].map(([k, r]) => [k, { text: r.text, done: !!r.done, visible: r.t > 0 }])); }

  tick(dt) {
    for (const r of this.rows.values()) if (r.done && r.t !== Infinity) r.t -= dt || 0;
    let ui = null;
    try { ui = this.course?.scene?.get('CourseUI'); } catch (_) { ui = null; }
    if (!ui || !ui.sys.isActive() || ui.course !== this.course) return;
    if (this.ui !== ui || !this.objs) this.attach(ui);
    const vis = [...this.rows.entries()].filter(([, r]) => r.t > 0).sort((a, b) => a[1].order - b[1].order);
    const key = vis.map(([k, r]) => `${k}:${r.text}:${r.done}`).join('|');
    if (key === this.key) return;
    this.key = key;
    const o = this.objs, g = o.g;
    g.clear();
    o.texts.forEach((t) => t.setVisible(false));
    const W = GAME.width, w = 78;
    // unter einer evtl. Schlüssel-Anzeige (w5kit keyHud, y 37) beginnen
    const y0 = this.level._keyHud?.visible?.() ? 55 : 37;
    vis.forEach(([k, r], i) => {
      const x = W - 68, y = y0 + i * 18;
      g.fillStyle(r.done ? 0x2a6a30 : 0x1a1830, 0.62); g.fillRoundedRect(x - w / 2, y - 8, w, 16, 8);
      g.lineStyle(1, r.color ?? 0xff9a2e, 0.9); g.strokeRoundedRect(x - w / 2 + 0.5, y - 7.5, w - 1, 15, 7.5);
      (ICON[r.icon] ?? ICON.kuerbis)(g, x - w / 2 + 10, y);
      let t = o.texts[i];
      if (!t) { t = uiText(ui, 0, 0, '', { size: 9, thickness: 2, originX: 0 }).setDepth(46); o.texts[i] = t; }
      t.setVisible(true).setText(r.text).setPosition(x - w / 2 + 19, y).setColor(r.done ? '#a8ffb0' : '#ffffff');
    });
  }

  attach(ui) {
    this.ui = ui;
    this.objs = { g: ui.add.graphics().setDepth(44), texts: [] };
    this.key = '';
    ui.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.objs = null; this.ui = null; });
  }
}

/** Zähler-HUD des Levels (eine Instanz). */
export function hwHud(level) {
  if (!level._hwHud) level._hwHud = new HwHud(level);
  return level._hwHud;
}
