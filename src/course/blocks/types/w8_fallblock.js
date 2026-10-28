// Welt-8-Baustein Fallblock-Brücke (Präzisierung Motor und Bausteine Welt 8; Bauplan 8-5 „kurzer Reittier-Abschnitt,
// Fallblock-Brücke“, 8-1 Stern 3 „auf einem Fallblock“).
//
// fallblock_bruecke – Brücke aus einer Reihe gelber Fallblöcke. Betritt eine Figur einen Block (bzw. per Signal start()),
//   beginnt der Einsturz: mode 'kette' (Standard) – ab dem ersten Block (dir 'vor': vom Anfang `from` aus; 'beide': vom
//   betretenen Block in beide Richtungen) wackelt Block für Block `warn` s und fällt dann, im Abstand `delay` s – die Brücke
//   stürzt hinter der Figur ein und jagt sie; mode 'einzeln' – nur der betretene Block wackelt `warn` s und fällt.
//   Gefallene Blöcke kommen nach `respawn` s zurück (0 = nie); Neustart am Checkpoint setzt die Brücke zurück.
//   { type: 'fallblock_bruecke', id, from: [x, y, z], to: [x, y, z] (Mitte der Unterseite des ersten/letzten Blocks) |
//     blocks: [[x, y, z], …], size: [1.6, 0.6, 1.6] (je Block; Reihe: Abstand = Länge/(n−1), n Standard aus Länge / size.z),
//     n, mode: 'kette' | 'einzeln', dir: 'vor' | 'beide', delay: 0.28, warn: 0.45, respawn: 6, color: 'gelb' | 'orange' |
//     'blau', start: 'stand' | 'signal' }
//   level.named.get(id) = { blocks: [{ state ('fest'|'wackelt'|'faellt'|'weg'), x, y, z }], state ('ruhe'|'stuerzt'|'leer'),
//     fallen (Zahl gefallener Blöcke), start(), reset(), info() }; w8(level).bridges. Kollision: MovingBox je Block (mover:
//   wer darauf steht, fällt mit).
//   Modell: Registry 'fallblock' ({ size: [w, h, d], color }, Ursprung Mitte der Unterseite; state { warn }) – sonst eigener Block
//   mit Ausrufezeichen-Muster (eine InstancedMesh für die ganze Brücke).
//   Beispiel: { type: 'fallblock_bruecke', id: 'bruecke', from: [0, 0, -100], to: [0, 0, -116], size: [1.8, 0.6, 1.8] }

import * as THREE from 'three';
import { v3, sz3, lin, mixc, smooth, colorize, merge, hex, addObject } from '../kit.js';
import { MovingBox } from '../w2kit.js';
import { getModel } from '../../models/index.js';
import { w8, figures, onRespawn, regModel, stdMat } from '../w8kit.js';

const COL = { gelb: [0xffd23a, 0xfff2a0, 0xb8861a], orange: [0xff9a2e, 0xffd09a, 0xb85a12], blau: [0x5a9aff, 0xc0dcff, 0x2a4ab8] };
const G = 28;

function blockGeo(s, color) {
  const [c, hi, lo] = (COL[color] ?? COL.gelb).map((h) => lin(hex(h)));
  const g = new THREE.BoxGeometry(s.x, s.y, s.z, 1, 1, 1).toNonIndexed();
  g.translate(0, s.y / 2, 0);
  const parts = [colorize(g, (p, n, o) => {
    if (n.y > 0.5) {
      // Oberseite: Ausrufezeichen-Raute in der Mitte, heller Rand
      const e = Math.min(s.x / 2 - Math.abs(p.x), s.z / 2 - Math.abs(p.z));
      mixc(c, hi, smooth(0.14, 0.02, e), o);
    } else if (n.y < -0.5) mixc(c, lo, 0.6, o);
    else mixc(lo, c, smooth(0, s.y, p.y), o);
  })];
  const mark = new THREE.BoxGeometry(0.16, 0.02, Math.min(0.7, s.z * 0.4));
  mark.translate(0, s.y + 0.011, -0.08);
  const dot = new THREE.BoxGeometry(0.16, 0.02, 0.16);
  dot.translate(0, s.y + 0.011, Math.min(0.7, s.z * 0.4) / 2 + 0.06);
  for (const m of [mark, dot]) parts.push(colorize(m.toNonIndexed(), (p, n, o) => mixc(lo, [0.05, 0.03, 0.02], 0.5, o)));
  return merge(parts);
}

export function buildFallblockBruecke(level, spec) {
  const s = sz3(spec.size, [1.6, 0.6, 1.6]);
  let list = [];
  if (Array.isArray(spec.blocks)) list = spec.blocks.map(v3);
  else {
    const a = v3(spec.from ?? spec.pos), b = v3(spec.to ?? spec.from ?? spec.pos);
    const L = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    const n = Math.max(1, spec.n ?? Math.round(L / Math.max(s.x, s.z)) + 1);
    for (let i = 0; i < n; i++) { const u = n === 1 ? 0 : i / (n - 1); list.push({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u }); }
  }
  const mode = spec.mode === 'einzeln' ? 'einzeln' : 'kette';
  const T = { delay: spec.delay ?? 0.28, warn: spec.warn ?? 0.45, respawn: spec.respawn ?? 6 };
  const blocks = list.map((q, i) => {
    const mb = new MovingBox(level, q.x, q.y, q.z, s.x, s.y, s.z, { tag: 'fallblock' });
    return { i, x: q.x, y: q.y, z: q.z, state: 'fest', t: 0, due: Infinity, vy: 0, mb };
  });
  const st = { state: 'ruhe', fallen: 0, t: 0 };
  const trigger = (k) => {
    if (mode === 'einzeln') { const b = blocks[k]; if (b.state === 'fest') { b.state = 'wackelt'; b.t = 0; } return; }
    if (st.state === 'stuerzt') return;
    st.state = 'stuerzt'; st.t = 0;
    const both = spec.dir === 'beide';
    for (const b of blocks) {
      if (b.state !== 'fest') continue;
      const order = both ? Math.abs(b.i - k) : b.i;
      b.due = order * T.delay;
    }
    level.sfx('rumble');
  };
  const handle = {
    blocks, get state() { return st.state; }, get fallen() { return st.fallen; },
    start() { trigger(0); },
    reset() {
      st.state = 'ruhe'; st.t = 0;
      for (const b of blocks) { b.state = 'fest'; b.t = 0; b.due = Infinity; b.vy = 0; b.mb.setSolid(true); b.mb.moveTo(b.x, b.y, b.z, 0); b.mb.still(); }
    },
    info: () => ({ state: st.state, fallen: st.fallen, blocks: blocks.map((b) => b.state[0]).join('') }),
  };
  for (const b of blocks) b.mb.shape.owner = handle;
  if (spec.id) level.named.set(spec.id, handle);
  w8(level).bridges.push(handle);
  onRespawn(level, () => handle.reset());
  level.onStep((dt, time) => {
    st.t += dt;
    if (spec.start !== 'signal') {
      for (const f of figures(level)) {
        if (f.mode !== 'ground') continue;
        const b = blocks.find((q) => q.mb.shape === f.ground && q.state === 'fest');
        if (b) trigger(b.i);
      }
    }
    let gone = 0;
    for (const b of blocks) {
      if (b.state === 'fest' && st.state === 'stuerzt' && st.t >= b.due) { b.state = 'wackelt'; b.t = 0; }
      b.t += dt;
      if (b.state === 'wackelt') {
        b.mb.moveTo(b.x + Math.sin(time * 70 + b.i) * 0.04, b.y, b.z, dt);
        if (b.t >= T.warn) { b.state = 'faellt'; b.t = 0; b.vy = 0; level.sfx('blockhit'); }
      } else if (b.state === 'faellt') {
        b.vy = Math.max(-22, b.vy - G * dt);
        b.mb.moveTo(b.x, b.mb.pos.y + b.vy * dt, b.z, dt);
        if (b.t > 2.2) { b.state = 'weg'; b.t = 0; b.mb.setSolid(false); st.fallen++; }
      } else if (b.state === 'weg') {
        gone++;
        if (T.respawn > 0 && b.t >= T.respawn && !figures(level).some((f) => Math.abs(f.pos.x - b.x) < s.x && Math.abs(f.pos.z - b.z) < s.z && Math.abs(f.pos.y - b.y) < 2)) {
          b.state = 'fest'; b.t = 0; b.due = Infinity; b.mb.setSolid(true); b.mb.moveTo(b.x, b.y, b.z, 0); b.mb.still();
        }
      } else b.mb.still();
    }
    if (st.state === 'stuerzt' && blocks.every((b) => b.state === 'weg' || b.state === 'fest' && b.due === Infinity)) st.state = gone === blocks.length ? 'leer' : 'ruhe';
    if (st.state === 'leer' && gone < blocks.length) st.state = 'ruhe';
  });

  if (!level.view) return handle;
  // ---------------- Darstellung: eine InstancedMesh für alle Blöcke (bzw. Registry-Modell je Block)
  const color = spec.color ?? 'gelb';
  let im = null, models = null;
  if (regModel(spec, 'fallblock')) {
    models = blocks.map(() => { const m = getModel('fallblock', { size: [s.x, s.y, s.z], color }); level.view.add(m.root); return m; });
  } else {
    im = new THREE.InstancedMesh(blockGeo(s, color), stdMat('w8fallblock', { roughness: 0.5 }), blocks.length);
    im.castShadow = true; im.receiveShadow = true;
    im.frustumCulled = false;
    level.view.add(im);
  }
  const M = new THREE.Matrix4();
  const root = new THREE.Group();
  addObject(level, root, (dt) => {
    let k = 0;
    for (const b of blocks) {
      const vis = b.state !== 'weg';
      if (models) { const m = models[b.i]; m.root.visible = vis; m.root.position.set(b.mb.pos.x, b.mb.pos.y, b.mb.pos.z); m.update?.(dt, { warn: b.state === 'wackelt' }); continue; }
      if (!vis) continue;
      M.makeTranslation(b.mb.pos.x, b.mb.pos.y, b.mb.pos.z);
      im.setMatrixAt(k++, M);
    }
    if (im) { im.count = k; im.instanceMatrix.needsUpdate = true; }
  });
  return handle;
}

export const TYPES = { fallblock_bruecke: buildFallblockBruecke };
