// Halloween-Bausteine Laternenlicht (H-3 Nebelfriedhof, H-Kapitän): Laterne und Geisterplattformen.
//
// laternenlicht – stellt das Laternenlicht des Levels ein (System blocks/hwkit.js hwLight, eines je Level).
//   { type: 'laternenlicht', radius: 5 (m Lichtradius der Handlaterne), soft: 1.2 (m weicher Rand), carry: false (true =
//     alle Figuren tragen von Anfang an eine Laterne, wie LEVEL.lantern: true), lose: false (true = Laterne geht beim Tod
//     verloren, das Item `laterne` erscheint wieder), helmet: true (Licht-Helm-Kegel leuchtet mit) }
//   Gleichwertig: LEVEL.lantern = true | { radius, soft, lose, helmet }. Item zum Aufheben: { kind: 'laterne', pos }.
//   Feste Laternen: { kind: 'laternenpfahl', pos, radius: 4.5, … } (entities/kinds/hw_gimmicks.js).
//
// geisterplattform – Plattform, die nur im Licht sichtbar und begehbar ist: jede Lichtquelle (Handlaterne, Laternenpfahl,
//   Höhlen-Laterne, Licht-Helm) zeigt den Teil im Lichtradius (Lichtmaske je Pixel, heller Rand); sobald irgendein Teil
//   im Licht liegt, ist die ganze Platte fest und schwach als Ganzes zu sehen. Verlässt das Licht sie, bleibt sie noch
//   `linger` s fest und flackert (Vorwarnung), dann löst sie sich auf. Steckt beim Erscheinen eine Figur in ihr, wird
//   sie erst fest, wenn die Figur heraus ist. Im Dunkeln nur ein zarter Schimmer (hint).
//   { type: 'geisterplattform', id, pos: [x, y, z] (Mitte der Unterseite), size: [w, h, d] (Standard [2.4, 0.5, 2.4])
//     | parts: [{ pos, size }, …] | from: [x, y, z], to: [x, y, z], n: 4 (Reihe von Trittplatten, size je Platte),
//     linger: 0.8, hint: 0.1 (0 = im Dunkeln ganz unsichtbar), color: 'lila' | 'blau' | 'gruen', light: 'alle' |
//     'laterne' (nur Handlaterne/Helm) | 'pfahl' (nur feste Laternen), face: true (Geistergesicht vorn), oneWay: false,
//     always: false (immer fest – zum Ausprobieren) }
//   level.named.get(id) = { parts: [{ lit, k, solid, warn, box }], lit, solid, info() }; Kollision tag 'geisterplattform'.
// Modelle: die Platten zeichnet ein gemeinsames Shader-Mesh (hwkit ghostBatch: 1 Zeichenaufruf für bis zu 64 Platten);
//   ein Registry-Modell 'geisterplattform' wird nur als Vorlage für die Form genutzt, wenn es Geometrie liefert.

import * as THREE from 'three';
import { v3, sz3, lin, mixc, smooth, colorize, merge, hex, box } from '../kit.js';
import { figuresIn } from '../w4kit.js';
import { hwLight, ghostBatch } from '../hwkit.js';
import { visDt } from '../../entities/gimmick.js';

const GCOL = {
  lila: [0xb8a0ff, 0xf0e8ff, 0x7a5ad8],
  blau: [0x9ac8ff, 0xeaf6ff, 0x4a7ad8],
  gruen: [0x9af0c0, 0xeafff2, 0x3aa87a],
};

export function buildLaternenlicht(level, spec) {
  const sys = hwLight(level);
  sys.configure(spec);
  return sys;
}

/** Platte im Geister-Look (Weltkoordinaten): runde Kanten, Tropfen unten, Gesicht vorn (+Z). */
function ghostSlab(p, s, color, face) {
  const [cBody, cTop, cLow] = (GCOL[color] ?? GCOL.lila).map((h) => lin(hex(h)));
  const parts = [];
  const r = Math.min(0.18, s.y * 0.45, s.x / 4, s.z / 4);
  const g = box(s.x, s.y, s.z, p.x, p.y + s.y / 2, p.z, 0xffffff, { r, seg: 2 });
  parts.push(colorize(g.index ? g.toNonIndexed() : g, (q, n, o) => {
    mixc(cLow, cBody, smooth(p.y, p.y + s.y, q.y), o);
    if (n.y > 0.6) mixc(o, cTop, 0.75, o);
    const w = Math.sin(q.x * 3.1 + q.z * 2.3) * 0.5 + 0.5;
    mixc(o, cTop, w * 0.12, o);
  }));
  // Ektoplasma-Tropfen unten
  const nd = Math.max(2, Math.round((s.x + s.z) * 0.9));
  for (let i = 0; i < nd; i++) {
    const t = (i + 0.5) / nd;
    const side = i % 4;
    const x = side < 2 ? p.x - s.x / 2 + t * s.x : p.x + (side === 2 ? -1 : 1) * (s.x / 2 - 0.12);
    const z = side < 2 ? p.z + (side ? 1 : -1) * (s.z / 2 - 0.12) : p.z - s.z / 2 + t * s.z;
    const h = 0.18 + ((i * 37) % 7) * 0.035;
    const d = new THREE.ConeGeometry(0.09, h, 7); d.rotateX(Math.PI); d.translate(x, p.y - h / 2 + 0.02, z);
    parts.push(colorize(d.toNonIndexed(), (q, n, o) => mixc(cLow, cBody, 0.5, o)));
  }
  if (face && s.x >= 1.2) {
    // freundliches Geistergesicht auf der Vorderseite (+Z, zur Kamera)
    const ink = lin(0x2a1a4a), zf = p.z + s.z / 2 + 0.012, yc = p.y + s.y * 0.55;
    for (const sd of [-1, 1]) {
      const e = new THREE.CircleGeometry(0.075, 10); e.scale(0.8, 1.15, 1); e.translate(p.x + sd * 0.2, yc + 0.02, zf);
      parts.push(colorize(e.toNonIndexed(), (q, n, o) => { o[0] = ink[0]; o[1] = ink[1]; o[2] = ink[2]; }));
    }
    const m = new THREE.RingGeometry(0.07, 0.11, 10, 1, Math.PI * 1.1, Math.PI * 0.8); m.translate(p.x, yc - 0.02, zf);
    parts.push(colorize(m.toNonIndexed(), (q, n, o) => { o[0] = ink[0]; o[1] = ink[1]; o[2] = ink[2]; }));
  }
  return merge(parts);
}

export function buildGeisterplattform(level, spec) {
  const sys = hwLight(level);
  const batch = ghostBatch(level);
  if (spec.hint !== undefined || batch.shared.uHint.value === 0) batch.shared.uHint.value = spec.hint ?? 0.1;
  const s0 = sz3(spec.size, [2.4, 0.5, 2.4]);
  let defs;
  if (spec.parts) defs = spec.parts.map((q) => ({ p: v3(q.pos), s: sz3(q.size ?? spec.size, [s0.x, s0.y, s0.z]) }));
  else if (spec.from && spec.to) {
    const a = v3(spec.from), b = v3(spec.to), n = Math.max(1, spec.n ?? 4);
    defs = Array.from({ length: n }, (_, i) => { const u = n > 1 ? i / (n - 1) : 0; return { p: { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u }, s: s0 }; });
  } else defs = [{ p: v3(spec.pos), s: s0 }];
  const linger = spec.linger ?? 0.8;
  const kinds = spec.light === 'laterne' ? ['figur', 'helm'] : spec.light === 'pfahl' ? ['pfahl', 'laterne'] : null;
  const parts = defs.map(({ p, s }) => {
    const box = { x0: p.x - s.x / 2, x1: p.x + s.x / 2, y0: p.y, y1: p.y + s.y, z0: p.z - s.z / 2, z1: p.z + s.z / 2 };
    const shape = { type: 'box', min: [box.x0, box.y0, box.z0], max: [box.x1, box.y1, box.z1], oneWay: !!spec.oneWay, tag: 'geisterplattform' };
    const part = { p, s, box, shape, id: null, lit: false, k: 0, solid: false, warn: false, left: 0, vis: 0, gid: -1, waits: 0 };
    shape.owner = part;
    if (level.view) part.gid = batch.add(ghostSlab(p, s, spec.color ?? 'lila', spec.face !== false));
    return part;
  });
  const handle = {
    parts,
    get lit() { return parts.some((q) => q.lit); },
    get solid() { return parts.some((q) => q.solid); },
    info: () => ({ parts: parts.map((q) => ({ lit: q.lit, k: +q.k.toFixed(2), solid: q.solid, warn: q.warn, waits: q.waits })) }),
  };
  if (spec.id) level.named.set(spec.id, handle);
  const setSolid = (q, on) => {
    if (on === q.solid) return;
    if (on) q.id = level.world.add(q.shape); else { level.world.remove(q.id); q.id = null; }
    q.solid = on;
  };
  level.onStep((dt) => {
    for (const q of parts) {
      q.k = spec.always ? 1 : sys.box(q.box, kinds);
      q.lit = q.k > 0;
      if (q.lit) q.left = linger; else q.left = Math.max(0, q.left - dt);
      const want = q.lit || q.left > 0;
      q.warn = !q.lit && q.left > 0;
      if (want && !q.solid) {
        // erst fest, wenn keine Figur in der Platte steckt
        if (figuresIn(level, q.box, 0.04).length) q.waits++;
        else setSolid(q, true);
      } else if (!want && q.solid) {
        setSolid(q, false);
        level.effects?.sparks({ x: q.p.x, y: q.p.y + q.s.y, z: q.p.z }, 4);
      }
    }
  });
  if (level.view) {
    const hold = {};
    level.view.onFrame((dt, t) => {
      const d = visDt(level, hold, dt);
      for (const q of parts) {
        let target = q.lit ? 0.3 : 0;
        if (q.warn) target = (Math.floor(t * 10) & 1) ? 0.75 : 0.18;
        q.vis += (target - q.vis) * Math.min(1, d * (target > q.vis ? 10 : 4));
        if (q.warn) q.vis = target;
        batch.setVis(q.gid, q.vis);
      }
    });
  }
  return handle;
}

export const TYPES = { laternenlicht: buildLaternenlicht, geisterplattform: buildGeisterplattform };
