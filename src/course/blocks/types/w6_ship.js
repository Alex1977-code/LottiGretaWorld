// Welt-6-Bausteine Kippen (Bauplan 6-2 „zwei kippende Schiffe, 1 m breiter Kippsteg“, „Kippbrücke“; 6-7 „horizontaler
// Abschnitt mit Wippen“). Alle drei sind kippende Laufflächen (blocks/w6kit.js TiltDeck: Rampen-Streifen, die mitnehmen):
// das Gewicht der Figuren (auch Klone) und schwerer Gegner (Entitäten mit `weight`, Gegner Standard 1) neigt sie, Wellen
// schaukeln Schiff und Steg; auf schrägem Boden rutscht alles langsam hangab (slide).
//
// kippschiff – ganzes Schiff (Deck mit Reling, Rumpf, Masten, zerrissene Segel, Laternen; Geisterschiff-Look) rollt um
//   seine Längsachse.
//   { type: 'kippschiff', id, pos: [x, y, z] (Deckmitte, Oberseite bei Neigung 0), length: 16, width: 7,
//     yaw: 0 (0 = Bug nach −Z; π/2 = Bug nach +X; nur 90°-Raster), maxTilt: 14 (°), weight: 2.2 (° je m Abstand einer
//     Figur zur Mittellinie), wave: { amp: 5 (°), period: 5 (s), phase: 0 }, slide: 2.4 (m/s hangab bei maxTilt),
//     response: 1.6 (1/s Nachführen), back: 0.8 (1/s Aufrichten ohne Last und Welle), rails: true (Reling an den
//     Längsseiten, 0,7 m), hull: 2.4 (m Rumpf, Optik),
//     masts: 2, sails: true, lanterns: 2, style: 'geist' | 'holz', thick: 0.6 }
// kippsteg – 1 m breiter Steg, rollt um seine Längsachse (seitlich): Figur am Rand neigt ihn, Wellen schaukeln.
//   { type: 'kippsteg', id, from: [x, y, z], to: [x, y, z] (Mitte der Oberseite an den Enden, achsenparallel),
//     width: 1, thick: 0.3, maxTilt: 22, weight: 40 (° je m seitlichem Versatz), wave: { amp: 7, period: 3.2 },
//     slide: 3, response: 2.4, back: 1, posts: true (Pfähle an den Enden), style: 'holz' | 'geist' }
// wippe – Wippe: Brett auf einem Bock, kippt um die Quer­achse in der Mitte; Last am Hebel drückt die Seite hinab.
//   { type: 'wippe', id, pos: [x, y, z] (Drehpunkt = Mitte der Oberseite), length: 8, width: 2.5, yaw: 0 (0 = Brett
//     entlang X, π/2 = entlang Z), maxTilt: 24, weight: 9 (° je m Hebel je Figur), response: 2.2, back: 0.6 (1/s zurück
//     zur Waage ohne Last; 0 = bleibt), slide: 0, thick: 0.4, stand: true, style: 'holz' | 'metall' | 'mine' }
// level.named.get(id) = { angle (°), target (°), load (Figuren darauf), deck (TiltDeck), push(deg), info() }
// Modelle aus der Registry, sobald es sie gibt: 'geisterschiff' ({ length, width, hull, masts }, Ursprung = Deckmitte,
// Bug nach +X), 'kippsteg' ({ length, width, thick }, Steg entlang +X, Ursprung = Mitte der Oberseite), 'wippe'
// ({ length, width, thick }, Brett entlang +X, Ursprung = Drehpunkt); sonst eigene Geometrie.

import * as THREE from 'three';
import { v3, lin, mixc, smooth, colorize, merge, hex, addObject, box, Rnd } from '../kit.js';
import { TiltDeck, w6, figures, shove, flatColor } from '../w6kit.js';
import { visDt } from '../../entities/gimmick.js';
import { hasModel, getModel } from '../../models/index.js';

const DEG = Math.PI / 180;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const C = (h) => lin(hex(h));

/**
 * Gemeinsamer Ablauf: Neigung aus Gewicht (+ Welle), Mitnahme (TiltDeck), Rutschen, Reling, Darstellung (tilt-Gruppe).
 * o: { cx, cz, y, axis, lenA, lenB, thick, strips, maxTilt, weight, wave, slide, response, back, rails, railH, tag }
 */
class Tilter {
  constructor(level, spec, o) {
    this.level = level;
    this.spec = spec;
    this.o = o;
    this.maxT = (o.maxTilt ?? 14) * DEG;
    this.k = (o.weight ?? 2) * DEG;
    this.wave = o.wave ? { amp: (o.wave.amp ?? 0) * DEG, period: o.wave.period ?? 5, phase: o.wave.phase ?? 0 } : null;
    this.slide = o.slide ?? 0;
    this.response = o.response ?? 1.6;
    this.back = o.back ?? 0;
    this.angle = 0; this.target = 0; this.load = 0; this.kick = 0; this.t = 0; this.slid = 0;
    this.deck = new TiltDeck(level, { cx: o.cx, cz: o.cz, y: o.y, axis: o.axis, lenA: o.lenA, lenB: o.lenB, thick: o.thick, strips: o.strips, owner: this, tag: o.tag });
    this.rails = [];
    if (o.rails) {
      // Reling quer zu axis an beiden Enden des Querschnitts (Längsseiten) – feste Quader, die mitkippen
      for (const sgn of [-1, 1]) {
        const mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: o.cx, cz: o.cz };
        const sh = { type: 'box', min: [0, 0, 0], max: [1, 1, 1], mover, owner: this, tag: `${o.tag}:reling`, camIgnore: true, noWallSlide: true };
        this.rails.push({ sgn, sh, mover, id: null });
      }
      this.placeRails(0);
      for (const r of this.rails) r.id = level.world.add(r.sh);
    }
    w6(level).tilts.push(this);
    level.onStep((dt) => this.step(dt));
  }

  placeRails(dy) {
    const o = this.o, t = this.deck.tan, H = o.railH ?? 0.7, thick = 0.16;
    for (const r of this.rails) {
      const a = r.sgn * (o.lenA / 2 - thick / 2);
      const top = o.y + a * t;
      const b0 = -o.lenB / 2 + (o.railInset ?? 0.6), b1 = o.lenB / 2 - (o.railInset ?? 0.6);
      if (o.axis === 'x') { r.sh.min = [o.cx + a - thick / 2, top - 0.4, o.cz + b0]; r.sh.max = [o.cx + a + thick / 2, top + H, o.cz + b1]; }
      else { r.sh.min = [o.cx + b0, top - 0.4, o.cz + a - thick / 2]; r.sh.max = [o.cx + b1, top + H, o.cz + a + thick / 2]; }
      r.mover.dy = a * dy;
      if (r.id) this.level.world.update(r.id);
    }
  }

  /** Neigungs-Anteil aller Lasten (Figuren, Entitäten mit weight). */
  weightAngle() {
    let sum = 0, n = 0;
    for (const f of figures(this.level)) {
      if (f.mode === 'ground' && this.deck.onTop(f)) { sum += this.deck.offset(f.pos.x, f.pos.z); n++; }
    }
    for (const e of this.level.entities) {
      if (!e.alive || e.removed || !e.grounded || !e.ground || e.ground.owner !== this) continue;
      const w = e.weight ?? (e.enemy ? 1 : 0);
      if (!w) continue;
      sum += this.deck.offset(e.pos.x, e.pos.z) * w; n++;
    }
    this.load = n;
    return -sum * this.k;   // Last auf der +Seite drückt diese Seite hinab (Winkel < 0)
  }

  step(dt) {
    this.t += dt;
    const wa = this.weightAngle();
    const waving = !!(this.wave && this.wave.amp > 0);
    let target = wa + this.kick;
    if (waving) target += this.wave.amp * Math.sin((this.t / this.wave.period + this.wave.phase) * Math.PI * 2);
    this.kick *= Math.max(0, 1 - dt * 1.5);
    this.target = clamp(target, -this.maxT, this.maxT);
    let na;
    if (!this.load && !waving && Math.abs(this.kick) < 1e-3) {
      // ohne Last: Wippe bleibt stehen (back 0) bzw. kehrt langsam zur Waage zurück
      na = this.back > 0 ? this.angle * (1 - Math.min(1, this.back * dt)) : this.angle;
      this.target = this.back > 0 ? 0 : this.angle;
    } else {
      const d = this.target - this.angle;
      const maxRate = 40 * DEG * dt;
      na = this.angle + clamp(d * Math.min(1, this.response * dt), -maxRate, maxRate);
    }
    const old = this.deck.tan;
    this.angle = na;
    this.deck.setAngle(na, dt);
    if (this.rails.length) this.placeRails(this.deck.tan - old);
    // Rutschen hangab (Figuren und Entitäten auf dem Deck)
    if (this.slide > 0) {
      const s = this.slide * (this.deck.tan / Math.tan(this.maxT));
      if (Math.abs(s) > 0.01) {
        const dx = this.o.axis === 'x' ? -s * dt : 0, dz = this.o.axis === 'z' ? -s * dt : 0;
        for (const f of figures(this.level)) if (f.mode === 'ground' && this.deck.onTop(f)) { const m = shove(this.level, f, dx, 0, dz); this.slid += Math.hypot(m.x, m.z); }
        for (const e of this.level.entities) {
          if (!e.alive || e.removed || !e.grounded || e.ground?.owner !== this || e.carrier) continue;
          const own = new Set(e.shapes ?? []);
          shove(this.level, e, dx, 0, dz, own.size ? (q) => own.has(q.id) : null);
        }
      }
    }
  }

  /** Anstoß (Grad) – Treffer, Explosion, Signal. */
  push(deg = 6) { this.kick += deg * DEG; }

  info() { return { angle: +(this.angle / DEG).toFixed(2), target: +(this.target / DEG).toFixed(2), load: this.load, slid: +this.slid.toFixed(2) }; }

  /** Darstellung: outer (Neigung um die Drehachse), inner (Gier) – Geometrie lokal: Länge entlang +X, Breite entlang Z. */
  attach(root, inner, yawLocal) {
    const o = this.o;
    root.position.set(o.cx, o.y, o.cz);
    inner.rotation.y = yawLocal;
    root.add(inner);
    const holder = {};
    addObject(this.level, root, (dt) => {
      visDt(this.level, holder, dt);
      if (o.axis === 'x') { root.rotation.z = this.angle; root.rotation.x = 0; } else { root.rotation.x = -this.angle; root.rotation.z = 0; }
    });
  }
}

/** Handle für level.named. */
function handleOf(t) {
  return {
    get angle() { return t.angle / DEG; }, get target() { return t.target / DEG; }, get load() { return t.load; }, deck: t.deck,
    push: (deg) => t.push(deg), info: () => t.info(), tilter: t,
  };
}

// ------------------------------------------------------------------ Geometrie

const WOOD = {
  geist: { plank: 0x6a6a5a, plank2: 0x5a5a4c, hull: 0x3e3a3a, hull2: 0x2a2626, trim: 0x8aa894, sail: 0xc8d0bc, sail2: 0x9aa898, mast: 0x4a4038 },
  holz: { plank: 0xc8955a, plank2: 0xb07e48, hull: 0x7a4a2a, hull2: 0x5a321c, trim: 0xf2d27a, sail: 0xfff6e0, sail2: 0xe8d8b8, mast: 0x6a4424 },
  metall: { plank: 0x9aa4b4, plank2: 0x8690a0, hull: 0x5a6274, hull2: 0x3e4452, trim: 0xffc83a, sail: 0xffffff, sail2: 0xdddddd, mast: 0x4a5060 },
  mine: { plank: 0xa87a4a, plank2: 0x8e6436, hull: 0x5a3a20, hull2: 0x3a2412, trim: 0x9aa0aa, sail: 0xffffff, sail2: 0xdddddd, mast: 0x4a3420 },
};

/** Schiffsrumpf (lokal: Bug +X, Deck bei y = 0) mit Planken-Deck, Reling-Pfosten, Masten, Segeln. */
function shipGeo(L, W, hullD, o, rnd) {
  const S = WOOD[o.style] ?? WOOD.geist;
  const parts = [], glow = [];
  const nx = 18, nr = 9;
  const halfW = (u) => (W / 2) * (u > 0 ? 1 - Math.pow(u, 2.2) * 0.85 : 1 - Math.pow(-u, 3) * 0.25);
  const depth = (u) => hullD * (1 - u * u * 0.25);
  const pos = [];
  const pt = (i, j) => {
    const u = -1 + (2 * i) / nx, x = (u * L) / 2;
    const a = Math.PI * (j / nr);   // 0 = rechte Deckkante, π = linke
    const w = halfW(u), dd = depth(u);
    return [x, -Math.sin(a) * dd, Math.cos(a) * w];
  };
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nr; j++) {
      const p00 = pt(i, j), p10 = pt(i + 1, j), p01 = pt(i, j + 1), p11 = pt(i + 1, j + 1);
      pos.push(...p00, ...p11, ...p10, ...p00, ...p01, ...p11);
    }
  }
  const hull = new THREE.BufferGeometry();
  hull.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  hull.computeVertexNormals();
  const hc = C(S.hull), hc2 = C(S.hull2), tc = C(S.trim);
  parts.push(colorize(hull, (p, n, out) => {
    mixc(hc2, hc, smooth(-hullD, 0, p.y), out);
    if (p.y > -0.35) mixc(out, tc, 0.55, out);                       // Zierleiste
    if (Math.abs(((p.x + 50) % 0.9) - 0.45) < 0.03) mixc(out, hc2, 0.5, out);   // Plankenfugen
  }));
  // Deck: Planken entlang der Länge
  const deckPos = [];
  for (let i = 0; i < nx; i++) {
    const u0 = -1 + (2 * i) / nx, u1 = -1 + (2 * (i + 1)) / nx;
    const x0 = (u0 * L) / 2, x1 = (u1 * L) / 2, w0 = halfW(u0), w1 = halfW(u1);
    deckPos.push(x0, 0.002, -w0, x0, 0.002, w0, x1, 0.002, w1, x0, 0.002, -w0, x1, 0.002, w1, x1, 0.002, -w1);
  }
  const deck = new THREE.BufferGeometry();
  deck.setAttribute('position', new THREE.Float32BufferAttribute(deckPos, 3));
  deck.computeVertexNormals();
  const pc = C(S.plank), pc2 = C(S.plank2);
  parts.push(colorize(deck, (p, n, out) => mixc(pc, pc2, (Math.floor((p.z + 20) / 0.5) & 1) * 0.7, out)));
  // Reling: Handlauf + Pfosten an den Längsseiten
  if (o.rails !== false) {
    for (const sz of [-1, 1]) {
      for (let i = 1; i < nx; i++) {
        const u = -1 + (2 * i) / nx, x = (u * L) / 2, w = halfW(u) - 0.08;
        parts.push(flatColor(box(0.1, 0.7, 0.1, x, 0.35, sz * w, S.trim, { r: 0.02, seg: 1 }), S.trim));
      }
      parts.push(flatColor(box(L * 0.82, 0.1, 0.14, -L * 0.04, 0.72, sz * (W / 2 - 0.08), S.trim, { r: 0.04, seg: 1 }), S.trim));
    }
  }
  // Masten mit Rahen und (zerrissenen) Segeln – Segel als eigenes Mesh (wird durchscheinend, wenn es die Figur verdeckt)
  const sails = [];
  const sailBox = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, z0: -W * 0.4, z1: W * 0.4 };
  const masts = o.masts ?? 2;
  for (let m = 0; m < masts; m++) {
    const x = masts === 1 ? 0 : -L * 0.22 + (m / (masts - 1)) * L * 0.5;
    const H = W * 1.05 + (m === 0 ? 0 : 1.0);
    // Mast und Rahen gehören zur Takelage (durchscheinend wie die Segel, wenn sie die Figur verdecken)
    const mast = new THREE.CylinderGeometry(0.14, 0.2, H - 0.8, 8); mast.translate(x, 0.8 + (H - 0.8) / 2, 0);
    sails.push(flatColor(mast, S.mast));
    parts.push(flatColor(new THREE.CylinderGeometry(0.22, 0.26, 0.8, 8).translate(x, 0.4, 0), S.mast));
    for (const k of [0.45, 0.8]) {
      const yard = new THREE.CylinderGeometry(0.07, 0.07, W * 0.8 * (1.1 - k * 0.4), 6); yard.rotateX(Math.PI / 2); yard.translate(x, H * k, 0);
      sails.push(flatColor(yard, S.mast));
    }
    sailBox.x0 = Math.min(sailBox.x0, x - 0.4); sailBox.x1 = Math.max(sailBox.x1, x + 0.7);
    sailBox.y0 = Math.min(sailBox.y0, 0.8); sailBox.y1 = Math.max(sailBox.y1, H + 0.3);
    if (o.sails !== false) {
      const sw = W * 0.75, sh = H * 0.38;
      const sail = new THREE.PlaneGeometry(sw, sh, 6, 4);
      const a = sail.attributes.position;
      for (let i = 0; i < a.count; i++) {
        const z = a.getX(i), y = a.getY(i);
        a.setXYZ(i, Math.cos((z / sw) * Math.PI) * 0.35 + (o.style === 'geist' ? (rnd.frac() - 0.5) * 0.12 : 0), y, z);
      }
      sail.computeVertexNormals();
      sail.translate(x + 0.15, H * 0.62, 0);
      sailBox.x0 = Math.min(sailBox.x0, x - 0.4); sailBox.x1 = Math.max(sailBox.x1, x + 0.7);
      sailBox.y0 = Math.min(sailBox.y0, H * 0.62 - sh / 2 - 0.3); sailBox.y1 = Math.max(sailBox.y1, H * 0.62 + sh / 2 + 0.3);
      const s1 = C(S.sail), s2 = C(S.sail2);
      const sg = colorize(sail.toNonIndexed(), (p, n, out) => mixc(s2, s1, smooth(-0.5, 0.8, Math.abs(n.x)), out));
      // zerrissene Ecken: Dreiecke unten zufällig entfernen (Geisterschiff)
      if (o.style === 'geist') {
        const ps = sg.attributes.position.array, cs = sg.attributes.color.array;
        const keepP = [], keepC = [];
        for (let t = 0; t < ps.length; t += 9) {
          const yy = (ps[t + 1] + ps[t + 4] + ps[t + 7]) / 3;
          if (yy < H * 0.62 - sh * 0.2 && rnd.frac() < 0.35) continue;
          for (let k = 0; k < 9; k++) { keepP.push(ps[t + k]); keepC.push(cs[t + k]); }
        }
        const g2 = new THREE.BufferGeometry();
        g2.setAttribute('position', new THREE.Float32BufferAttribute(keepP, 3));
        g2.setAttribute('color', new THREE.Float32BufferAttribute(keepC, 3));
        g2.computeVertexNormals();
        sails.push(g2);
      } else sails.push(sg);
    }
  }
  // Bugspriet
  const bs = new THREE.CylinderGeometry(0.08, 0.12, L * 0.25, 6); bs.rotateZ(Math.PI / 2 - 0.35); bs.translate(L / 2 + L * 0.08, 0.6, 0);
  parts.push(flatColor(bs, S.mast));
  // Laternen (leuchten grünlich bzw. warm)
  for (let i = 0; i < (o.lanterns ?? 2); i++) {
    const x = i === 0 ? -L * 0.42 : L * 0.36, z = (i % 2 ? 1 : -1) * (W / 2 - 0.2);
    const post = new THREE.CylinderGeometry(0.05, 0.05, 1.3, 5); post.translate(x, 0.65, z); parts.push(flatColor(post, S.mast));
    const lamp = new THREE.OctahedronGeometry(0.22, 0); lamp.scale(1, 1.4, 1); lamp.translate(x, 1.45, z);
    glow.push(flatColor(lamp, o.style === 'geist' ? 0x9affc8 : 0xffd27a));
  }
  return { body: merge(parts), glow: merge(glow), sails: merge(sails), sailBox };
}

function plankGeo(L, W, thick, style) {
  const S = WOOD[style] ?? WOOD.holz;
  const parts = [];
  const n = Math.max(2, Math.round(L / 0.5));
  for (let i = 0; i < n; i++) {
    const x = -L / 2 + (i + 0.5) * (L / n);
    const c = i % 3 === 0 ? S.plank2 : S.plank;
    parts.push(box(L / n - 0.04, thick, W, x, -thick / 2, 0, c, { r: 0.03, seg: 1 }));
  }
  for (const sz of [-1, 1]) parts.push(box(L, thick * 0.5, 0.12, 0, -thick * 0.85, sz * (W / 2 - 0.06), S.hull, { r: 0.03, seg: 1 }));
  return merge(parts);
}

function meshOf(g, opts = {}) {
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: opts.rough ?? 0.75, side: opts.side ?? THREE.FrontSide }));
  m.castShadow = opts.cast !== false; m.receiveShadow = true;
  return m;
}

// ------------------------------------------------------------------ Bausteine

export function buildKippschiff(level, spec) {
  const p = v3(spec.pos);
  const L = spec.length ?? 16, W = spec.width ?? 7;
  const yaw = Math.round((spec.yaw ?? 0) / (Math.PI / 2)) * (Math.PI / 2);
  const alongZ = Math.abs(Math.sin(yaw)) < 0.5;   // yaw 0 / π: Schiff entlang Z
  const t = new Tilter(level, spec, {
    cx: p.x, cz: p.z, y: p.y, axis: alongZ ? 'x' : 'z', lenA: W, lenB: L, thick: spec.thick ?? 0.6,
    strips: Math.max(4, Math.ceil(W / 0.7)), maxTilt: spec.maxTilt ?? 14, weight: spec.weight ?? 2.2,
    wave: spec.wave === false ? null : { amp: 5, period: 5, ...(spec.wave ?? {}) }, slide: spec.slide ?? 2.4,
    response: spec.response ?? 1.6, back: spec.back ?? 0.8, rails: spec.rails !== false, railInset: L * 0.12, tag: 'kippschiff',
  });
  const h = handleOf(t);
  if (spec.id) level.named.set(spec.id, h);
  if (level.view) {
    const root = new THREE.Group(), inner = new THREE.Group();
    root.name = 'kippschiff';
    if (hasModel('geisterschiff')) inner.add(getModel('geisterschiff', { length: L, width: W, hull: spec.hull ?? 2.4, masts: spec.masts ?? 2, style: spec.style ?? 'geist' }).root);
    else {
      const g = shipGeo(L, W, spec.hull ?? 2.4, { ...spec, rails: spec.rails }, new Rnd(Math.floor(p.x * 7 + p.z * 13) >>> 0));
      inner.add(meshOf(g.body, { side: THREE.DoubleSide }));
      if (g.glow) { const gm = new THREE.Mesh(g.glow, level.view.mats.glow); gm.castShadow = false; inner.add(gm); }
      if (g.sails) {
        const sm = meshOf(g.sails, { side: THREE.DoubleSide });
        inner.add(sm);
        // Durchsicht: Segel zwischen Kamera und Figur werden durchscheinend (Kasten in Weltkoordinaten, Neigung grob mit drin)
        const b = g.sailBox, c = new THREE.Vector3(), q = (lx, lz) => (alongZ ? { x: lz, z: -lx * Math.sign(Math.cos(yaw) || 1) } : { x: lx * Math.sign(Math.sin(yaw) || 1), z: lz });
        const a1 = q(b.x0, b.z0), a2 = q(b.x1, b.z1);
        c.set(p.x, p.y, p.z);
        const box3 = new THREE.Box3(new THREE.Vector3(c.x + Math.min(a1.x, a2.x) - 1, c.y + b.y0 - 1, c.z + Math.min(a1.z, a2.z) - 1), new THREE.Vector3(c.x + Math.max(a1.x, a2.x) + 1, c.y + b.y1 + 1, c.z + Math.max(a1.z, a2.z) + 1));
        level.view.xray?.(sm, box3, { min: 0.22 });
      }
    }
    // Bug +X lokal → Weltrichtung: yaw 0 = −Z
    t.attach(root, inner, alongZ ? (Math.cos(yaw) > 0 ? Math.PI / 2 : -Math.PI / 2) : (Math.sin(yaw) > 0 ? 0 : Math.PI));
  }
  return h;
}

export function buildKippsteg(level, spec) {
  const a = v3(spec.from ?? [0, 1, 0]), b = v3(spec.to ?? [0, 1, -8]);
  const alongZ = Math.abs(b.z - a.z) >= Math.abs(b.x - a.x);
  const L = alongZ ? Math.abs(b.z - a.z) : Math.abs(b.x - a.x);
  const W = spec.width ?? 1, thick = spec.thick ?? 0.3;
  const cx = (a.x + b.x) / 2, cz = (a.z + b.z) / 2, y = (a.y + b.y) / 2;
  const t = new Tilter(level, spec, {
    cx, cz, y, axis: alongZ ? 'x' : 'z', lenA: W, lenB: L, thick, strips: Math.max(2, Math.round(W / 0.5)),
    maxTilt: spec.maxTilt ?? 22, weight: spec.weight ?? 40, wave: spec.wave === false ? null : { amp: 7, period: 3.2, ...(spec.wave ?? {}) },
    slide: spec.slide ?? 3, response: spec.response ?? 2.4, back: spec.back ?? 1, tag: 'kippsteg',
  });
  const h = handleOf(t);
  if (spec.id) level.named.set(spec.id, h);
  if (level.view) {
    const root = new THREE.Group(), inner = new THREE.Group();
    root.name = 'kippsteg';
    if (hasModel('kippsteg')) inner.add(getModel('kippsteg', { length: L, width: W, thick, style: spec.style ?? 'holz' }).root);
    else inner.add(meshOf(plankGeo(L, W, thick, spec.style ?? 'holz')));
    t.attach(root, inner, alongZ ? Math.PI / 2 : 0);
    if (spec.posts !== false) {
      // Pfähle an den Enden (fest, verschmolzen)
      const parts = [];
      for (const q of [a, b]) for (const s of [-1, 1]) {
        const off = alongZ ? { x: s * (W / 2 + 0.25), z: 0 } : { x: 0, z: s * (W / 2 + 0.25) };
        const g = new THREE.CylinderGeometry(0.16, 0.2, 3.2, 7); g.translate(q.x + off.x, q.y - 1.3, q.z + off.z);
        parts.push(flatColor(g, (WOOD[spec.style ?? 'holz'] ?? WOOD.holz).hull));
      }
      level.view.addStatic(merge(parts));
    }
  }
  return h;
}

export function buildWippe(level, spec) {
  const p = v3(spec.pos);
  const L = spec.length ?? 8, W = spec.width ?? 2.5, thick = spec.thick ?? 0.4;
  const alongX = Math.abs(Math.cos(spec.yaw ?? 0)) > 0.5;
  const t = new Tilter(level, spec, {
    cx: p.x, cz: p.z, y: p.y, axis: alongX ? 'x' : 'z', lenA: L, lenB: W, thick, strips: Math.max(6, Math.round(L / 0.5)),
    maxTilt: spec.maxTilt ?? 24, weight: spec.weight ?? 9, wave: null, slide: spec.slide ?? 0, response: spec.response ?? 2.2,
    back: spec.back ?? 0.6, tag: 'wippe',
  });
  const h = handleOf(t);
  if (spec.id) level.named.set(spec.id, h);
  if (spec.stand !== false) level.world.add({ type: 'box', min: [p.x - 0.35, p.y - 2.2, p.z - 0.35], max: [p.x + 0.35, p.y - thick - 0.05, p.z + 0.35], tag: 'wippe:bock' });
  if (level.view) {
    const root = new THREE.Group(), inner = new THREE.Group();
    root.name = 'wippe';
    const style = spec.style ?? 'holz';
    if (hasModel('wippe')) inner.add(getModel('wippe', { length: L, width: W, thick, style }).root);
    else {
      const parts = [plankGeo(L, W, thick, style)];
      // Griffe an den Enden
      for (const sx of [-1, 1]) parts.push(flatColor(box(0.12, 0.5, W * 0.7, sx * (L / 2 - 0.3), 0.25, 0, 0xffd23a, { r: 0.05, seg: 1 }), 0xffd23a));
      inner.add(meshOf(merge(parts)));
    }
    t.attach(root, inner, alongX ? 0 : Math.PI / 2);
    if (spec.stand !== false) {
      const S = WOOD[style] ?? WOOD.holz;
      const g = new THREE.CylinderGeometry(0.2, 0.75, 2.2, 3); g.rotateY(alongX ? 0 : Math.PI / 2);
      g.translate(p.x, p.y - thick - 1.1, p.z);
      const hub = new THREE.CylinderGeometry(0.26, 0.26, W * 0.6, 10); hub.rotateX(Math.PI / 2); if (!alongX) hub.rotateY(Math.PI / 2);
      hub.translate(p.x, p.y - thick - 0.05, p.z);
      level.view.addStatic(merge([flatColor(g, S.hull), flatColor(hub, S.trim)]));
    }
  }
  return h;
}

export const TYPES = { kippschiff: buildKippschiff, kippsteg: buildKippsteg, wippe: buildWippe };
