// Baustein `appear`: erscheinender Weg – Plattformen/Blöcke, die erst auf ein Signal hin auftauchen (Bauplan 1-5:
// „Schaltfelder – erst alle aktiv, dann erscheint der Weg“). Die Teile ploppen nacheinander auf und werden fest.
// Mit hint (Standard) sind vorher halbdurchsichtige Umrisse zu sehen. hide() lässt sie wieder verschwinden.
//
// Parameter:
//   id:      Name (Pflicht für Signale: { reveal: id } / { hide: id })
//   parts:   [{ pos: [x, y, z] (Mitte der Unterseite), size: [w, h, d], color? }, …]  – oder ein Teil über pos/size
//   style:   'block' (Standard, kräftige Farbe) | 'stone' | 'cloud' (Einweg)
//   color:   Standardfarbe der Teile ('yellow')
//   delay:   0.12   s zwischen zwei Teilen
//   hint:    true   Umrisse vor dem Erscheinen
//   visible: false  true → beginnt sichtbar (hide() lässt verschwinden)
//   onShown: Aktion (entities/gimmick.js), sobald alle Teile da sind
// Beispiel: { type: 'appear', id: 'weg1', parts: [{ pos: [0, 1, -30], size: [2, 0.5, 2] }, { pos: [0, 1.5, -33], size: [2, 0.5, 2] }] }

import * as THREE from 'three';
import { v3, sz3, box, hex, themeOf, addObject, merge } from '../kit.js';
import { cloudGeo } from './cloud.js';
import { runAction, visDt } from '../../entities/gimmick.js';

export function buildAppear(level, spec) {
  const th = themeOf(level);
  const style = spec.style ?? 'block';
  const list = spec.parts ?? [{ pos: spec.pos, size: spec.size }];
  const delay = spec.delay ?? 0.12;
  const parts = list.map((q, i) => {
    const p = v3(q.pos), s = sz3(q.size, [2, 0.5, 2]);
    const shape = { type: 'box', min: [p.x - s.x / 2, p.y, p.z - s.z / 2], max: [p.x + s.x / 2, p.y + s.y, p.z + s.z / 2], oneWay: style === 'cloud', tag: 'appear' };
    return { p, s, shape, id: null, shown: false, pop: 0, at: i * delay, color: q.color };
  });
  const handle = { parts, shown: false, t: 0, want: !!spec.visible };
  const place = (q, on) => {
    if (on && !q.id) q.id = level.world.add(q.shape);
    if (!on && q.id) { level.world.remove(q.id); q.id = null; }
    q.shown = on;
  };
  handle.reveal = () => { if (handle.want) return; handle.want = true; handle.t = 0; level.sfx('switch'); };
  handle.hide = () => { if (!handle.want) return; handle.want = false; handle.t = 0; for (const q of parts) place(q, false); level.sfx('vanish'); };
  if (spec.visible) for (const q of parts) { place(q, true); q.pop = 1; }
  handle.shown = !!spec.visible;
  if (spec.id) level.named.set(spec.id, handle);
  level.onStep((dt) => {
    if (!handle.want || handle.shown) return;
    handle.t += dt;
    let all = true;
    for (const q of parts) {
      if (!q.shown && handle.t >= q.at) {
        place(q, true);
        level.sfx('blockhit');
        level.effects?.sparks({ x: q.p.x, y: q.p.y + q.s.y, z: q.p.z }, 6);
      }
      if (!q.shown) all = false;
    }
    if (all) { handle.shown = true; runAction(level, spec.onShown, { pos: [parts[0].p.x, parts[0].p.y, parts[0].p.z], source: handle }); }
  });
  if (!level.view) return handle;
  // Darstellung: je Teil ein Mesh (Ploppen), Umrisse gemeinsam
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 });
  for (const q of parts) {
    let g;
    if (style === 'cloud') g = cloudGeo(q.s, Math.floor(q.p.x * 13 + q.p.z * 7));
    else {
      const col = style === 'stone' ? th.stoneDark : hex(q.color ?? spec.color ?? 'yellow', 0xffd23d);
      g = box(q.s.x, q.s.y, q.s.z, 0, q.s.y / 2, 0, col, { r: Math.min(0.14, q.s.y * 0.3), topColor: style === 'stone' ? th.stone : undefined });
    }
    const mesh = new THREE.Mesh(g, mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.position.set(q.p.x, q.p.y, q.p.z);
    mesh.visible = q.shown;
    addObject(level, mesh, (dt) => {
      dt = visDt(level, q, dt);
      if (q.shown) q.pop = Math.min(1, q.pop + dt * 3.5); else q.pop = 0;
      mesh.visible = q.shown;
      const k = q.pop < 1 ? Math.sin(q.pop * Math.PI * 0.5) + Math.sin(q.pop * Math.PI) * 0.15 : 1;
      mesh.scale.set(Math.max(0.05, k), Math.max(0.05, k), Math.max(0.05, k));
    });
  }
  if (spec.hint !== false) {
    const ghost = new THREE.Mesh(merge(parts.map((q) => { const g = new THREE.BoxGeometry(q.s.x, q.s.y, q.s.z).toNonIndexed(); g.translate(q.p.x, q.p.y + q.s.y / 2, q.p.z); return g; })),
      new THREE.MeshBasicMaterial({ color: 0x9ad8ff, transparent: true, opacity: 0.22, depthWrite: false }));
    ghost.renderOrder = 2;
    addObject(level, ghost, () => { ghost.visible = !handle.shown && !(handle.want && parts.every((q) => q.shown)); });
  }
  return handle;
}

export const TYPES = { appear: buildAppear };
