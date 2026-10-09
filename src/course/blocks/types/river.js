// Bausteine `river` (Fluss mit Strömung, Reit-Level 1-4) und `riverrock` (Flussfelsen).
//
// river – Wasserlauf entlang einer Mittellinie (Polylinie, y = Wasseroberfläche): schwimmbares Wasser, Strömung
//   (trägt das Blatt-Floß `raft` und treibt schwimmende Figuren langsam mit), sichtbare Fließ-Streifen, optional
//   Flussbett und Ufer. Steile Abschnitte (Höhenunterschied ≥ Länge) sind Wasserfälle: das Floß stürzt hinab.
//   path:   [[x, y, z], …]   Mittellinie, y = Oberfläche (Zickzack-Kehren, schräge Abschnitte, Wasserfälle)
//   width:  8      Breite (m);   depth: 2.5 (Wassertiefe bis zum Bett)
//   speed:  4      m/s Strömung (je Abschnitt überschreibbar: speeds: [v0, v1, …])
//   bed:    true   Sandbett unter dem Wasser;  banks: true  Grasufer links/rechts (bank: 3 m breit, bankH: 1 m über
//                  der Oberfläche) – Rinne, Ufer und Bett werden auf einem 1-m-Raster ausgelegt (ganzzahlige Punkte und
//                  gerade Breiten ergeben glatte Kanten); Ufer an Kehren schließen sich automatisch
//   open:   ['start', 'end']  kein Ufer hinter dem Anfang/Ende (dort schließt z. B. ein Steg oder Strand an)
//   color:  Wasserfarbe (Thema water);  id: Name → level.named (flowAt, surfaceAt, nearest)
//   Beispiel: { type: 'river', id: 'fluss', path: [[0, 0, 0], [0, 0, -60], [12, 0, -60], [12, -8, -64], [12, -8, -110]],
//               width: 8, speed: 4 }
// Strömung: flowAt(x, z) → { x, z } (m/s) längs des nächsten Abschnitts + leichter Zug zur Mitte; surfaceAt(x, z) → y.
// Alle Flüsse eines Levels: level.rivers (Liste; das Floß nimmt den nächstgelegenen).
//
// riverrock – bemooster Felsen im Wasser (Hindernis): { type: 'riverrock', pos: [x, y, z] (y = Wasseroberfläche),
//   size: 1 }  Kollision: Zylinder r 0,75·size, Modell 'river_rock'.

import * as THREE from 'three';
import { v3, hex, box, themeOf, addStatic, addObject } from '../kit.js';
import { getModel } from '../../models/index.js';
import { visDt } from '../../entities/gimmick.js';

/** Nächster Punkt der Polylinie (nur XZ) → { i (Abschnitt), t (0..1), d (Abstand), x, y, z }. */
function nearestOn(segs, x, z) {
  let best = null;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z, l2 = dx * dx + dz * dz;
    let t = l2 > 1e-9 ? ((x - s.a.x) * dx + (z - s.a.z) * dz) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    const px = s.a.x + dx * t, pz = s.a.z + dz * t;
    const d = Math.hypot(x - px, z - pz);
    // bei Gleichstand (Kehren: Außenecke) gewinnt der spätere Abschnitt → Strömung führt um die Kurve
    if (!best || d <= best.d + 1e-6) best = { i, t, d, x: px, y: s.a.y + (s.b.y - s.a.y) * t, z: pz };
  }
  return best;
}

export function buildRiver(level, spec) {
  const th = themeOf(level);
  const pts = (spec.path ?? []).map(v3);
  if (pts.length < 2) { console.warn('[river] path braucht mindestens 2 Punkte'); return null; }
  const W = spec.width ?? 8, depth = spec.depth ?? 2.5;
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    segs.push({ a, b, len, dir: { x: (b.x - a.x) / (len || 1), z: (b.z - a.z) / (len || 1) }, speed: spec.speeds?.[i] ?? spec.speed ?? 4, fall: Math.abs(b.y - a.y) >= Math.max(1, len) });
  }
  const river = {
    id: spec.id ?? null, segs, width: W, depth,
    nearest: (x, z) => nearestOn(segs, x, z),
    /** Liegt (x, z) im Fluss (innerhalb der halben Breite)? */
    contains(x, z, margin = 0) { const n = nearestOn(segs, x, z); return !!n && n.d <= W / 2 + margin; },
    surfaceAt(x, z) { const n = nearestOn(segs, x, z); return n ? n.y : null; },
    /** Strömung (m/s) am Ort: längs des Abschnitts, nahe den Ufern ein Zug zur Mitte. */
    flowAt(x, z, out = { x: 0, z: 0 }) {
      const n = nearestOn(segs, x, z);
      if (!n || n.d > W / 2 + 1) { out.x = 0; out.z = 0; return out; }
      const s = segs[n.i];
      out.x = s.dir.x * s.speed; out.z = s.dir.z * s.speed;
      // Zug zur Mitte (Floß schrammt nicht dauernd am Ufer)
      const k = Math.min(1, n.d / (W / 2)) * 1.2;
      if (n.d > 0.3) { out.x += ((n.x - x) / n.d) * k; out.z += ((n.z - z) / n.d) * k; }
      return out;
    },
  };
  (level.rivers ??= []).push(river);
  if (spec.id) level.named.set(spec.id, river);

  // Wasser (schwimmbar), Bett und Ufer auf einem 1-m-Raster: Zelle im Abstand ≤ Breite/2 zur Linie = Rinne,
  // bis Breite/2 + bank = Ufer. Gleiche Läufe werden zu Quadern zusammengefasst (auch über Reihen hinweg).
  const bank = spec.banks === false ? 0 : spec.bank ?? 3, bankH = spec.bankH ?? 1;
  const reach = W / 2 + Math.max(bank, spec.bed === false ? 0 : bank);
  let gx0 = Infinity, gx1 = -Infinity, gz0 = Infinity, gz1 = -Infinity;
  for (const p of pts) { gx0 = Math.min(gx0, p.x); gx1 = Math.max(gx1, p.x); gz0 = Math.min(gz0, p.z); gz1 = Math.max(gz1, p.z); }
  gx0 = Math.floor(gx0 - reach); gx1 = Math.ceil(gx1 + reach); gz0 = Math.floor(gz0 - reach); gz1 = Math.ceil(gz1 + reach);
  const q = (v) => Math.round(v * 20) / 20;
  const openStart = (spec.open ?? []).includes('start'), openEnd = (spec.open ?? []).includes('end');
  const rows = [];
  for (let z = gz0; z < gz1; z++) {
    const runs = [];
    let cur = null;
    for (let x = gx0; x < gx1; x++) {
      const n = nearestOn(segs, x + 0.5, z + 0.5);
      let cell = null;
      const beyond = (openStart && n.i === 0 && n.t === 0) || (openEnd && n.i === segs.length - 1 && n.t === 1);
      if (n.d <= W / 2) cell = { kind: 'water', top: q(n.y), bot: q(n.y - depth) };
      else if (n.d <= W / 2 + bank && !beyond) cell = { kind: 'bank', top: q(n.y + bankH), bot: q(n.y - depth - 1) };
      if (cur && cell && cell.kind === cur.kind && cell.top === cur.top && cell.bot === cur.bot) cur.x1 = x + 1;
      else { if (cur) runs.push(cur); cur = cell ? { ...cell, x0: x, x1: x + 1, z0: z, z1: z + 1 } : null; }
    }
    if (cur) runs.push(cur);
    rows.push(runs);
  }
  // Reihen zusammenfassen: gleicher Lauf in der nächsten Reihe → Quader wächst in z
  const boxes = [];
  let open = [];
  for (const runs of rows) {
    const next = [];
    for (const r of runs) {
      const o = open.find((b) => b.kind === r.kind && b.x0 === r.x0 && b.x1 === r.x1 && b.top === r.top && b.bot === r.bot && b.z1 === r.z0);
      if (o) { o.z1 = r.z1; next.push(o); open.splice(open.indexOf(o), 1); }
      else next.push(r);
    }
    boxes.push(...open);
    open = next;
  }
  boxes.push(...open);
  const bedParts = [];
  for (const b of boxes) {
    if (b.kind === 'water') {
      level.world.add({ type: 'box', min: [b.x0, b.bot, b.z0], max: [b.x1, b.top, b.z1], water: true, solid: false, camIgnore: true, tag: 'river' });
      if (spec.bed !== false) {
        level.world.add({ type: 'box', min: [b.x0, b.bot - 1, b.z0], max: [b.x1, b.bot, b.z1], tag: 'river:bett' });
        bedParts.push(box(b.x1 - b.x0, 1, b.z1 - b.z0, (b.x0 + b.x1) / 2, b.bot - 0.5, (b.z0 + b.z1) / 2, 0xd9bd78, { r: 0.02, seg: 1, topColor: 0xf3dc96 }));
      }
    } else {
      // Ufer als schlichte Quader (nahtlos aneinander), Grasdecke oben
      level.world.add({ type: 'box', min: [b.x0, b.bot, b.z0], max: [b.x1, b.top, b.z1], tag: 'river:ufer' });
      bedParts.push(box(b.x1 - b.x0, b.top - b.bot, b.z1 - b.z0, (b.x0 + b.x1) / 2, (b.bot + b.top) / 2, (b.z0 + b.z1) / 2, th.dirt, { r: 0.02, seg: 1, topColor: th.grassTop, bottomShade: 0.6 }));
    }
  }
  river.boxes = boxes.length;
  for (const g of bedParts) addStatic(level, g);
  if (level.view) buildSurface(level, river, spec, th);
  return river;
}

/** Wasseroberfläche als Band entlang der Linie, Fließ-Streifen wandern flussabwärts. */
function buildSurface(level, river, spec, th) {
  const W = river.width;
  const pos = [], uv = [], idx = [];
  let v = 0, base = 0;
  const pts = [river.segs[0].a, ...river.segs.map((s) => s.b)];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    // Querrichtung: Mittel der Nachbar-Abschnitte (Ecken ohne Lücke)
    const s0 = river.segs[Math.max(0, i - 1)], s1 = river.segs[Math.min(river.segs.length - 1, i)];
    let nx = -(s0.dir.z + s1.dir.z), nz = s0.dir.x + s1.dir.x;
    const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
    const k = 1 / Math.max(0.5, Math.abs(nx * -s1.dir.z + nz * s1.dir.x)); // Ecke: Band verbreitern
    if (i > 0) v += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y, p.z - pts[i - 1].z) / W;
    pos.push(p.x + nx * W / 2 * k, p.y - 0.04, p.z + nz * W / 2 * k, p.x - nx * W / 2 * k, p.y - 0.04, p.z - nz * W / 2 * k);
    uv.push(0, v, 1, v);
    if (i > 0) { const a = base - 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } // Normale nach oben
    base += 2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // Fließ-Streifen (Textur, wiederholt)
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const ctx = c.getContext('2d');
  const water = new THREE.Color(hex(spec.color, th.water));
  ctx.fillStyle = `#${water.getHexString()}`;
  ctx.fillRect(0, 0, 64, 128);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (const [x, y, l] of [[10, 10, 26], [40, 40, 34], [22, 76, 22], [52, 98, 18], [6, 110, 14]]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + l); ctx.stroke(); }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, opacity: 0.84, roughness: 0.12, metalness: 0.05, depthWrite: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(g, mat);
  mesh.receiveShadow = true;
  mesh.renderOrder = 1;
  const speed = spec.speed ?? 4;
  const hold = {};
  addObject(level, mesh, (dt) => { tex.offset.y -= (visDt(level, hold, dt) * speed) / W; });
}

export function buildRiverRock(level, spec) {
  const p = v3(spec.pos), s = spec.size ?? 1;
  level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.75 * s, y0: p.y - 1.5 * s, y1: p.y + 0.7 * s, tag: 'riverrock' });
  if (!level.view) return;
  const m = getModel('river_rock', { size: s });
  m.root.position.set(p.x, p.y - 0.3 * s, p.z);
  addObject(level, m.root, (dt) => m.update?.(dt, {}));
}

export const TYPES = { river: buildRiver, riverrock: buildRiverRock };
