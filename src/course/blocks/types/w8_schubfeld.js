// Welt-8-Baustein Schubfeld (Präzisierung Motor und Bausteine Welt 8; Bauplan 8-2 „Wüsten-Abfahrt auf Pflaume: Schubfelder“).
//
// schubfeld – leuchtendes Sandfeld mit wandernden Pfeilen, das in Pfeilrichtung beschleunigt:
//   · im Ritt-Level (Fluss-/Dünennetz level.river, Archetyp ride): Temposchwelle des Netzes – Pflaume schießt +boost m/s für
//     1,15 s voran (RideController, wie river_wave); y folgt der Netz-Oberfläche,
//   · Reittier-/Floß-Entitäten mit boost(dir, v, t) (raft): Schub wie speedwave (time s),
//   · zu Fuß: Boost-Auslöser wie der Baustein boost (Form-Flag boost, Tempo speed m/s).
//   { type: 'schubfeld', id, pos: [x, y, z] (Mitte, y = Oberfläche), dir: [dx, dz] | yaw (Standard: Fließrichtung im
//     Ritt-Level, sonst −Z), size: [w, len] (Standard [3, 4]), boost: 5 (m/s zusätzlich im Ritt), speed: 15 (m/s zu Fuß),
//     time: 1.3 (s, Reittier-Entitäten), color: 'gold' | 'tuerkis' | 'rosa', look: 'eigen' }
//   level.named.get(id) = { hits (Figuren/Reittiere, die beschleunigt wurden), wave (Netz-Schwelle | null), info() };
//   w8(level).fields. Modell: Registry 'schubfeld' ({ size: [len, w], color }, Ursprung Mitte, Pfeil nach +X; state { t }) –
//   sonst eigene Sandplatte mit drei Lauflicht-Pfeilen.
//   Beispiel: { type: 'schubfeld', id: 'schub1', pos: [0, 0, -60], size: [3, 4], boost: 5 }

import * as THREE from 'three';
import { v3, lin, hex, box, merge, addObject } from '../kit.js';
import { visDt } from '../../entities/gimmick.js';
import { getModel } from '../../models/index.js';
import { w8, figures, regModel } from '../w8kit.js';

const COL = { gold: [0xffc23a, 0xfff2a0, 0x8a5a1a], tuerkis: [0x3ad8e8, 0xd0fcff, 0x1a5a6a], rosa: [0xff7ac0, 0xffe0f2, 0x8a2a5a] };

export function buildSchubfeld(level, spec) {
  const p = v3(spec.pos);
  const [w, len] = spec.size ?? [3, 4];
  const net = level.river ?? null;
  let dx = 0, dz = -1;
  if (Array.isArray(spec.dir)) { dx = spec.dir[0]; dz = spec.dir[1]; }
  else if (typeof spec.dir === 'number') { dx = Math.cos(spec.dir); dz = -Math.sin(spec.dir); }
  else if (net) { const f = net.sample(p.x, p.z); dx = f.dx; dz = f.dz; }
  const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  const yaw = Math.atan2(-dz, dx);
  const y = net ? net.sample(p.x, p.z).y : p.y;
  const boost = spec.boost ?? 5, speed = spec.speed ?? 15, time = spec.time ?? 1.3;
  const st = { hits: 0, inside: new WeakSet() };
  const wave = net ? net.addWave({ x: p.x, z: p.z, yaw, len, wid: w, boost }) : null;
  // zu Fuß: Boost-Auslöser (Form-Flag boost, Player.applyBoost); onEnter zählt
  const hx = (Math.abs(dx) * len + Math.abs(dz) * w) / 2, hz = (Math.abs(dz) * len + Math.abs(dx) * w) / 2;
  const handle = { get hits() { return st.hits; }, wave, info: () => ({ hits: st.hits, ride: !!wave, yaw: +yaw.toFixed(3) }) };
  level.world.add({ type: 'box', min: [p.x - hx, y - 0.05, p.z - hz], max: [p.x + hx, y + 0.3, p.z + hz], trigger: true, solid: false, boost: { x: dx, z: dz, speed }, tag: 'schubfeld', owner: handle });
  if (spec.id) level.named.set(spec.id, handle);
  w8(level).fields.push(handle);
  // Treffer zählen (Figuren am Boden bzw. im Ritt über dem Feld) und Reittier-Entitäten anschieben
  const inField = (x, z) => { const ax = x - p.x, az = z - p.z; const a = ax * dx + az * dz, b = -ax * dz + az * dx; return Math.abs(a) <= len / 2 && Math.abs(b) <= w / 2; };
  level.onStep(() => {
    for (const f of figures(level)) {
      const inn = inField(f.pos.x, f.pos.z) && Math.abs(f.pos.y - y) < 1.2 && f.mode !== 'air';
      if (inn && !st.inside.has(f)) { st.inside.add(f); st.hits++; if (wave) level.sfx('boost'); }
      else if (!inn && st.inside.has(f)) st.inside.delete(f);
    }
    for (const e of level.entities) {
      if (typeof e.boost !== 'function' || e.removed) continue;
      if (inField(e.pos.x, e.pos.z) && Math.abs(e.pos.y - y) < 1.5) {
        if (!st.inside.has(e)) { st.inside.add(e); st.hits++; }
        e.boost({ x: dx, z: dz }, boost + 2, time);
      } else st.inside.delete(e);
    }
  });
  if (!level.view) return handle;
  // ---------------- Darstellung: Sandplatte, drei Pfeile laufen nacheinander auf (Lauflicht)
  const C = COL[spec.color] ?? COL.gold;
  const root = new THREE.Group();
  root.name = 'schubfeld';
  root.position.set(p.x, y + 0.02, p.z);
  root.rotation.y = yaw;
  let model = null;
  const mats = [];
  if (regModel(spec, 'schubfeld')) {
    model = getModel('schubfeld', { size: [len, w], color: spec.color ?? 'gold' });
    root.add(model.root);
  } else {
    const plate = box(len, 0.08, w, 0, 0.0, 0, C[2], { r: 0.04, seg: 1, topColor: C[0] });
    const pm = new THREE.Mesh(plate, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, emissive: new THREE.Color(C[0]), emissiveIntensity: 0.25 }));
    pm.receiveShadow = true;
    root.add(pm);
    for (let k = 0; k < 3; k++) {
      const parts = [];
      for (const s of [-1, 1]) {
        const a = box(0.18, 0.05, w * 0.42, 0, 0, 0, 0xffffff, { r: 0.02, seg: 0 });
        a.rotateY(s * 0.75);
        a.translate(0, 0, s * w * 0.15);
        parts.push(a);
      }
      const g = merge(parts);
      g.translate(-len * 0.3 + k * len * 0.3, 0.07, 0);
      const m = new THREE.MeshBasicMaterial({ color: C[1], toneMapped: false });
      mats.push(m);
      root.add(new THREE.Mesh(g, m));
    }
  }
  const holder = {};
  let t = 0;
  const base = new THREE.Color(C[0]), hi = new THREE.Color(C[1]);
  addObject(level, root, (dt) => {
    const d = visDt(level, holder, dt);
    t += d;
    for (let k = 0; k < mats.length; k++) {
      const a = Math.pow(Math.max(0, Math.sin(t * 7 - k * 1.25)), 3);
      mats[k].color.copy(base).lerp(hi, a);
    }
    model?.update?.(d, { t });
  });
  return handle;
}

export const TYPES = { schubfeld: buildSchubfeld };
