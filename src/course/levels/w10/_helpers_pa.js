// Hilfen für die Pilz-Remix-Level P-1 „Mondscheinwalzen am Mühlenhügel“, P-2 „Stachelranken im Abendrot“, P-3 „Spukfloß
// im Finsterdschungel“ und P-4 „Schattenspuk-Gerangel“ (kein Level: exportiert kein LEVEL, die Level-Registry überspringt
// dieses Modul). Nur für diese vier Level – andere Remix-Level haben eigene Hilfsdateien; Basislevel und gemeinsame Dateien
// bleiben unverändert. Alles Level-Lokale hängt sich über die Remix-Haken (prebuild/build/setup, level.onStep) an.
//
//   uhrenZurueck(level, id)    Zeit-Uhren erscheinen nach jedem Neustart wieder (P-1 hat keinen Checkpoint: ohne die Uhren
//                              wäre der Kurs nach einem Sturz nicht mehr zu schaffen)
//   (weitere Hilfen der Level P-2 … P-4 folgen unten)

import * as THREE from 'three';
import { lin, addStatic, addObject, box, merge } from '../../blocks/kit.js';
import { CourseEntity } from '../../entities/CourseEntity.js';
import { runAction, visDt } from '../../entities/gimmick.js';

/** Münzen in einer Reihe. */
export const line = (from, to, n) => ({ kind: 'coins', from, to, n });
/** Münzring um pos. */
export const ring = (pos, r, n) => ({ kind: 'coins', pos, r, n });
/** Münzbogen von a nach b mit Scheitel h über der Verbindungslinie. */
export function arc(a, b, n, h = 2) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    out.push({ kind: 'coin', pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * h * t * (1 - t), a[2] + (b[2] - a[2]) * t] });
  }
  return out;
}
/** Insel über ihre Grundfläche x0..x1, zA..zB, Oberseite top, Höhe h. */
export function isl(x0, x1, zA, zB, top, h = 3, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  return { type: 'island', pos: [(x0 + x1) / 2, top - h, (z0 + z1) / 2], size: [x1 - x0, h, z0 - z1], ...o };
}
/** Holzbrett (platform style wood) mit Oberkante top. */
export const plank = (x, top, z, w = 2.2, d = 2.2, h = 0.4, o = {}) => ({ type: 'platform', style: 'wood', pos: [x, top - h, z], size: [w, h, d], ...o });

// =====================================================================================================================
// P-1: Zeit-Uhren nach einem Neustart wieder da
// =====================================================================================================================

/** Nach jedem Neustart (Sturz, Zeit um) erscheinen alle Zeit-Uhren der Gruppe id wieder. → Zahl der Neustarts. */
export function uhrenZurueck(level, id) {
  const rt = level.runtime, h = level.named.get(id);
  if (!rt || !h || rt._uhrenZurueck) return;
  rt._uhrenZurueck = true;
  const orig = rt.respawn.bind(rt);
  h.resets = 0;
  rt.respawn = () => {
    for (const it of h.items) { it.taken = false; it.pop = 0; }
    h.resets++;
    return orig();
  };
}

// =====================================================================================================================
// Holzbretter (P-1 oberer Weg im Mühlenkeller): fester Quader mit Brettern wie die Kellerdielen
// =====================================================================================================================

const DIELEN = [0x8a5a34, 0x7a4c2a, 0x966438, 0x6e4426, 0x845530];

/**
 * Holzbretter: list [[x, top, z, w = 2.2, d = 2.2, h = 0.4] …] – Kollisionsquader (Oberkante top) und Optik aus längs gelegten
 * Dielen (Farben der Mühlenkeller-Dielen von 2-4), dunkler Unterbau, Querleisten. In LEVEL.build aufrufen (verschmolzen).
 */
export function holzbretter(level, list, o = {}) {
  const parts = [];
  for (const [x, top, z, w = 2.2, d = 2.2, h = 0.4] of list) {
    level.world.add({ type: 'box', min: [x - w / 2, top - h, z - d / 2], max: [x + w / 2, top, z + d / 2], tag: o.tag ?? 'holzbrett' });
    if (!level.view) continue;
    parts.push(box(w - 0.08, h - 0.08, d - 0.08, x, top - h / 2 - 0.04, z, 0x4a2e1a, { r: 0.04, seg: 1 }));
    const n = Math.max(2, Math.round(w / 0.62)), bw = w / n;
    for (let i = 0; i < n; i++) {
      const c = DIELEN[(((i * 3 + Math.round(x * 7 + z * 3)) % DIELEN.length) + DIELEN.length) % DIELEN.length];
      parts.push(box(bw - 0.05, 0.1, d, x - w / 2 + bw * (i + 0.5), top - 0.05, z, c, { r: 0, seg: 0, topColor: c }));
    }
    for (const s of [-1, 1]) parts.push(box(w + 0.04, 0.14, 0.22, x, top - h + 0.12, z + s * (d / 2 - 0.3), 0x3a2414, { r: 0.03, seg: 1 }));
  }
  if (parts.length) addStatic(level, merge(parts));
}

// =====================================================================================================================
// P-2: Stachelringe an den Bohnenranken, Glockenbäume
// =====================================================================================================================

const TAU = Math.PI * 2;

/**
 * Stachelring (Bauplan Welt Pilz „Stacheln an Kletterwänden und Ranken“): Kragen um eine Bohnenranke, dessen Stacheln im Takt
 * ausfahren (out s draußen), wieder einfahren und kurz vorher zittern (warn s). Ausgefahren verletzt jede Berührung (auch
 * kletternd an der Ranke); eingefahren ist er harmlos – man klettert vorbei, wenn die Stacheln drin sind.
 *   { pos: [x, y, z] (Mitte des Kragens auf der Rankenachse), period: 3.2, out: 1.4, warn: 0.5, phase: 0..1, r: 0.72, id }
 * Laufzeit: state ('aus' | 'ein' | 'warn'), k (0 eingefahren … 1 ausgefahren), hurts (Treffer), info(); level.named.get(id).
 */
class Stachelring extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'stachelring');
    this.r = spec.r ?? 0.72;
    this.half.set(this.r, 0.34, this.r);
    this.pos.y -= this.half.y;            // pos = Mitte → Fußpunkt
    this.period = spec.period ?? 3.2;
    this.out = spec.out ?? 1.4;
    this.warn = spec.warn ?? 0.5;
    this.phase = spec.phase ?? 0;
    this.k = 0;
    this.hurts = 0;
    this.state = 'ein';
    this.update(0);
    this.k = this.state === 'aus' ? 1 : 0;
    if (level.view) this.buildLook();
  }

  phaseT() { const P = this.period; return ((((this.level.time ?? 0) / P + this.phase) % 1) + 1) % 1 * P; }

  update(dt) {
    const t = this.phaseT();
    const prev = this.state;
    this.state = t < this.out ? 'aus' : t > this.period - this.warn ? 'warn' : 'ein';
    const want = this.state === 'aus' ? 1 : this.state === 'warn' ? 0.22 : 0;
    this.k += (want - this.k) * Math.min(1, dt * (want > this.k ? 16 : 9));
    if (dt === 0) this.k = want;
    if (prev !== 'aus' && this.state === 'aus' && this.level.player && Math.abs(this.level.player.pos.y - this.pos.y) < 9) this.level.sfx('flip');
  }

  onPlayer(player) {
    if (this.k < 0.55) return 'none';
    this.hurts++;
    return 'hurt';
  }

  onHit() {}

  buildLook() {
    const root = new THREE.Group();
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.09, 8, 18), new THREE.MeshStandardMaterial({ color: 0x6a3a8a, roughness: 0.5, metalness: 0.2 }));
    collar.rotation.x = Math.PI / 2;
    collar.position.y = this.half.y;
    root.add(collar);
    const spikes = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      const g = new THREE.ConeGeometry(0.11, 0.46, 6);
      g.rotateZ(-Math.PI / 2);
      g.translate(0.23, 0, 0);
      g.rotateY(-a);
      g.translate(0, (i % 2 ? 0.12 : -0.12), 0);
      spikes.push(g);
    }
    const sg = merge(spikes);
    const sp = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ color: 0xffd04a, roughness: 0.35, metalness: 0.35, emissive: 0x3a2000 }));
    sp.position.y = this.half.y;
    root.add(sp);
    this.spikes = sp;
    this.setModel({ root, update: () => {}, dispose() { collar.geometry.dispose(); collar.material.dispose(); sg.dispose(); sp.material.dispose(); } });
  }

  render(dt, t) {
    super.render(dt, t);
    if (!this.spikes) return;
    const k = this.k, shake = this.state === 'warn' ? Math.sin(t * 60) * 0.05 : 0;
    const s = 0.3 + 0.7 * k + 0.06;
    this.spikes.scale.set(s + shake, 0.6 + 0.4 * k, s + shake);
    this.spikes.rotation.y = t * 0.6;
  }

  info() { return { state: this.state, k: +this.k.toFixed(2), hurts: this.hurts }; }
}

/** Stachelringe anlegen (LEVEL.setup oder build): list [{ pos, period, out, warn, phase, id }]. */
export function stachelringe(level, list) {
  const out = [];
  for (const q of list) {
    const e = new Stachelring(level, q);
    level.entities.push(e);
    if (q.id) level.named.set(q.id, e);
    out.push(e);
  }
  return out;
}

/**
 * Glockenbaum (Bauplan P-2 „Gipfelbrücke ersetzt durch 3 Glockenbäume (Krallen-Anzug)“): Kletterstamm (climbable – nur mit dem
 * Krallen-Anzug hinauf, sonst Wandrutschen), oben eine Krone als Plattform (von unten durchlässig, damit der Kletterer
 * hinaufkommt) mit einer goldenen Glocke, die beim Landen läutet und im Wind schwingt.
 *   glockenbaeume(level, [{ id, pos: [x, y0, z] (Fuß des Stamms), top (Oberkante der Krone), w: 1.3 (Stamm), crown: 3.2, side: ±1 (Glockengestell) }])
 * Griff: level.named.get(id) = { rung (Zahl der Läut-Landungen), top, x, z, info() }.
 */
export function glockenbaeume(level, list) {
  const parts = [], bells = [];
  const handles = [];
  for (const q of list) {
    const [x, y0, z] = q.pos, top = q.top, w = q.w ?? 1.3, cr = q.crown ?? 3.2;
    level.world.add({ type: 'box', min: [x - w / 2, y0, z - w / 2], max: [x + w / 2, top - 0.02, z + w / 2], climbable: true, tag: 'glockenbaum' });
    const crownId = level.world.add({ type: 'box', min: [x - cr / 2, top - 0.5, z - cr / 2], max: [x + cr / 2, top, z + cr / 2], oneWay: true, tag: 'glockenkrone' });
    const h = { id: q.id, x, z, top, rung: 0, ringT: 0, crownId, info: () => ({ rung: h.rung, top }) };
    if (q.id) level.named.set(q.id, h);
    handles.push(h);
    if (!level.view) continue;
    // Stamm: Rinde mit Krallen-Kerben (hell), unten Wurzeln
    parts.push(box(w, top - y0 - 0.3, w, x, y0 + (top - y0 - 0.3) / 2, z, 0x7a4a2a, { r: 0.18 }));
    for (let yy = y0 + 0.8; yy < top - 0.8; yy += 0.9) {
      for (const [fx, fz, sx, sz] of [[0, 1, 0.32, 0.06], [0, -1, 0.32, 0.06], [1, 0, 0.06, 0.32], [-1, 0, 0.06, 0.32]]) {
        const off = ((yy * 7) % 1) * 0.3 - 0.15;
        parts.push(box(sx, 0.09, sz, x + fx * (w / 2 + 0.01) + (fz ? off : 0), yy, z + fz * (w / 2 + 0.01) + (fx ? off : 0), 0xe8c890, { r: 0, seg: 0 }));
      }
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.4;
      parts.push(box(0.5, 0.5, 1.4, x + Math.cos(a) * (w / 2 + 0.3), y0 + 0.25, z + Math.sin(a) * (w / 2 + 0.3), 0x6a3e22, { r: 0.2 }));
    }
    // Krone: Platte mit Laub (Herbstfarben im Abendrot), Rand aus Laubbüscheln
    parts.push(box(cr, 0.5, cr, x, top - 0.25, z, 0x5a8a3a, { r: 0.22, topColor: 0x7ab04a }));
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      const g = new THREE.SphereGeometry(0.55 + (i % 3) * 0.08, 8, 6);
      g.scale(1, 0.55, 1);
      g.translate(x + Math.cos(a) * (cr / 2 - 0.05), top - 0.35, z + Math.sin(a) * (cr / 2 - 0.05));
      const c = [0xd8782a, 0xe8a83a, 0x9ab84a][i % 3];
      parts.push(colorizeFlat(g, c));
    }
    // Glockengestell am Kronenrand (Seite side, weg vom nächsten Baum): zwei Pfosten, Querbalken, die Glocke hängt darunter
    const side = q.side ?? 1;
    const gx = x + side * (cr / 2 - 0.3);
    for (const dz of [-0.85, 0.85]) parts.push(box(0.2, 2.2, 0.2, gx, top + 1.1, z + dz, 0x6a3e22, { r: 0.06 }));
    parts.push(box(0.24, 0.22, 2.1, gx, top + 2.25, z, 0x5a3218, { r: 0.08 }));
    bells.push({ h, x: gx, y: top + 2.12, z });
  }
  if (parts.length) addStatic(level, merge(parts));
  // Glocken (bewegt): eine Gruppe, je Glocke ein Pendel
  if (level.view && bells.length) {
    const group = new THREE.Group();
    const bellGeo = bellGeometry();
    const mat = new THREE.MeshStandardMaterial({ color: 0xffe066, roughness: 0.35, metalness: 0.15, emissive: 0x806000 });
    for (const b of bells) {
      const piv = new THREE.Group();
      piv.position.set(b.x, b.y, b.z);
      const m = new THREE.Mesh(bellGeo, mat);
      m.position.y = -0.95;
      m.scale.setScalar(1.7);
      m.castShadow = true;
      piv.add(m);
      group.add(piv);
      b.piv = piv;
    }
    let t = 0;
    addObject(level, group, (dt) => {
      t += dt;
      for (const b of bells) {
        if (b.h.ringT > 0) b.h.ringT = Math.max(0, b.h.ringT - dt);
        const amp = 0.12 + b.h.ringT * 0.5;
        b.piv.rotation.x = Math.sin(t * (2.2 + b.h.ringT * 6) + b.x) * amp;
        b.piv.rotation.z = Math.sin(t * 1.7 + b.z) * 0.05;
      }
    });
  }
  // Läuten: Landung auf der Krone
  const was = new Map();
  level.onStep(() => {
    const p = level.player;
    if (!p) return;
    for (const h of handles) {
      const on = p.mode === 'ground' && p.ground?.id === h.crownId;
      if (on && !was.get(h)) {
        h.rung++; h.ringT = 1.2;
        level.sfx('klingel');
        level.effects?.sparks?.({ x: h.x, y: h.top + 0.4, z: h.z }, 10);
        level.signal?.('glockenbaum', { id: h.id, rung: h.rung });
      }
      was.set(h, on);
    }
  });
  return handles;
}

/** Glocke (Ursprung Aufhängung oben, hängt nach −Y). */
function bellGeometry() {
  const pts = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(0.08 + 0.34 * Math.pow(t, 1.6) + (t > 0.9 ? 0.06 : 0), 0.55 - t * 0.55)); }
  const g = new THREE.LatheGeometry(pts, 14);
  const k = new THREE.SphereGeometry(0.08, 8, 6);
  k.translate(0, -0.02, 0);
  return merge([g.toNonIndexed(), k.toNonIndexed()].map((x) => colorizeFlat(x, 0xffffff)));
}

/** Geometrie einfarbig einfärben (Vertexfarben, linear). */
function colorizeFlat(g, color) {
  const geo = g.index ? g.toNonIndexed() : g;
  const c = lin(color);
  const n = geo.attributes.position.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2]; }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.deleteAttribute('uv');
  if (!geo.attributes.normal) geo.computeVertexNormals();
  return geo;
}

export { THREE, lin, addStatic, addObject, CourseEntity, runAction, visDt };
