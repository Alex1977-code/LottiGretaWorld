// Halloween-Bausteine: Riesenkürbis-Spender und Entitäts-Gimmicks als `type` in LEVEL.segments.
//
// riesenkuerbis_roll – rollende Riesenkürbisse (Entität `riesenkuerbis`, entities/kinds/hw_gimmicks.js) aus einem Spender:
//   ein Holzverschlag mit Kürbisstapel stößt alle `every` s einen Kürbis in Richtung dir aus (auf Bahnen und Hängen
//   rollen sie bergab schneller). Ohne every (0) ein einzelner Kürbis an pos (respawn: s → kommt nach dem Platzen wieder).
//   { type: 'riesenkuerbis_roll', id, pos: [x, y, z] (Austrittspunkt am Boden), dir: [dx, dz] | yaw, every: 3.5, first:
//     0.5, max: 3 (gleichzeitig), start: 'auto' | 'near' (Figur näher als near m) | 'signal' ({ start: id }), near: 20,
//     spawner: true (Verschlag zeichnen + Kollision), respawn: 0, …Felder des Kürbisses (size 1.8, speed 3, max →
//     vmax, path, life 16, hurt, face, drop, color) }
//   level.named.get(id) = { spawned, alive, running, start(), stop(), spawn(), info() }
// Entitäts-Gimmicks auch als type ({ type: 'suessigkeiten_tuer', … } ≙ { kind: 'suessigkeiten_tuer', … }):
//   laterne · laternenpfahl · suessigkeit · suessigkeiten · suessigkeiten_tuer · grabstein_schalter · riesenkuerbis

import * as THREE from 'three';
import { v3, lin, mixc, smooth, colorize, merge, hex, box, addStatic } from '../kit.js';
import { yawBox, snapYaw } from '../w3kit.js';
import { figures, HWC, pumpkinGeo, faceGeo } from '../hwkit.js';

const C = (h) => lin(hex(h));

/** Holzverschlag mit Bogen-Öffnung (Blick +X lokal) und Kürbisstapel; Weltkoordinaten. */
function spawnerGeo(p, yaw, size) {
  const parts = [], glow = [];
  const W = size + 1.1, D = 1.7, H = size + 1.3;
  const L = (g, lx, ly, lz) => { g.translate(lx, ly, lz); g.rotateY(yaw); g.translate(p.x, p.y, p.z); return g; };
  const cx = -(size / 2 + 0.95);
  const wood = (g) => colorize(g, (q, n, o) => { const pl = Math.sin(q.y * 7.5) > 0.85; mixc(C(HWC.woodLow), C(HWC.wood), smooth(-0.5, 0.9, n.y * 0.4 + n.x * 0.5 + n.z * 0.3), o); if (pl) mixc(o, C(0x4a2a14), 0.5, o); });
  // Seitenwände, Rückwand, Dach
  for (const sd of [-1, 1]) parts.push(wood(L(box(D, H, 0.22, 0, 0, 0, HWC.wood, { r: 0.05, seg: 1 }), cx, H / 2, sd * (W / 2 - 0.11))));
  parts.push(wood(L(box(0.22, H, W, 0, 0, 0, HWC.wood, { r: 0.05, seg: 1 }), cx - D / 2 + 0.11, H / 2, 0)));
  parts.push(wood(L(box(D + 0.3, 0.25, W + 0.3, 0, 0, 0, HWC.wood, { r: 0.06, seg: 1 }), cx, H + 0.12, 0)));
  // Bogen über der Öffnung (Holzbalken mit Kürbis-Schild)
  parts.push(wood(L(box(0.25, 0.35, W, 0, 0, 0, HWC.wood, { r: 0.05, seg: 1 }), cx + D / 2 - 0.1, H - 0.17, 0)));
  // Kürbisstapel auf dem Dach
  const pr = size * 0.32;
  for (const [dz, dy, k] of [[-0.55, 0, 1], [0.55, 0, 0.9], [0, 0.55, 0.85]]) {
    const pk = pumpkinGeo({ r: pr * k, color: 'orange', leaf: false });
    pk.body.rotateY(yaw); pk.body.translate(...rot(p, yaw, cx, H + 0.25 + dy * pr * 2, dz * pr * 2));
    parts.push(pk.body);
  }
  const f = faceGeo({ r: pr * 0.85, kind: 'grinsen' });
  f.rotateY(yaw); f.translate(...rot(p, yaw, cx, H + 0.25 + 0.55 * pr * 2, 0));
  glow.push(f);
  // Rampe (Stroh) vor der Öffnung
  parts.push(colorize(L(box(0.9, 0.08, W - 0.5, 0, 0, 0, HWC.straw, { r: 0.03, seg: 1 }), -size / 2 + 0.25, 0.04, 0), (q, n, o) => mixc(C(HWC.strawLow), C(HWC.straw), 0.5 + 0.3 * Math.sin(q.x * 30), o)));
  return { body: merge(parts), glow: merge(glow), box: yawBox(p.x, p.y, p.z, cx - D / 2, cx + D / 2, H + 0.25, -W / 2, W / 2, yaw) };
}

function rot(p, yaw, lx, ly, lz) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return [p.x + lx * c + lz * s, p.y + ly, p.z - lx * s + lz * c];
}

export function buildRiesenkuerbisRoll(level, spec) {
  const p = v3(spec.pos);
  const d = spec.dir ?? (spec.yaw !== undefined ? [Math.cos(spec.yaw), -Math.sin(spec.yaw)] : [0, 1]);
  const dl = Math.hypot(d[0], d[1]) || 1;
  const dir = [d[0] / dl, d[1] / dl];
  const yaw = snapYaw(Math.atan2(-dir[1], dir[0]));
  const size = spec.size ?? 1.8;
  const every = spec.every ?? 0;
  const startMode = spec.start ?? 'auto';
  const st = { spawned: 0, running: startMode === 'auto', timer: spec.first ?? 0.5, respawnT: 0 };
  const list = [];
  const pumpkinSpec = () => {
    const { type, id, every: _e, first, start, near, spawner, respawn, max, vmax, ...rest } = spec;
    return { ...rest, pos: [p.x, p.y, p.z], dir, size, max: vmax ?? spec.vmax ?? 9 };
  };
  const spawn = () => {
    const e = level.spawn('riesenkuerbis', pumpkinSpec());
    if (e) { list.push(e); st.spawned++; level.effects?.dust({ x: p.x, y: p.y, z: p.z }, 5, 1); }
    return e;
  };
  const handle = {
    get spawned() { return st.spawned; }, get alive() { return list.filter((e) => !e.removed && e.state !== 'burst').length; }, get running() { return st.running; }, list,
    start() { st.running = true; }, stop() { st.running = false; }, spawn,
    info: () => ({ spawned: st.spawned, alive: handle.alive, running: st.running, pumpkins: list.filter((e) => !e.removed).map((e) => e.info()) }),
  };
  if (spec.id) level.named.set(spec.id, handle);
  if (spec.spawner !== false && every > 0) {
    const g = spawnerGeo(p, yaw, size);
    level.world.add({ type: 'box', ...g.box, tag: 'kuerbis_spender' });
    if (level.view) { addStatic(level, g.body); addStatic(level, g.glow, { material: 'glow', castShadow: false }); } else { g.body.dispose(); g.glow.dispose(); }
  }
  if (every <= 0) {
    if (startMode === 'auto') spawn();
    level.onStep((dt) => {
      for (let i = list.length - 1; i >= 0; i--) if (list[i].removed) list.splice(i, 1);
      if (!st.running) return;
      if (!list.length && st.spawned > 0 && spec.respawn > 0) { st.respawnT += dt; if (st.respawnT >= spec.respawn) { st.respawnT = 0; spawn(); } }
      else if (!list.length && st.spawned === 0) spawn();
    });
    return handle;
  }
  const near = spec.near ?? 20;
  level.onStep((dt) => {
    for (let i = list.length - 1; i >= 0; i--) if (list[i].removed) list.splice(i, 1);
    if (!st.running && startMode === 'near' && figures(level).some((f) => Math.hypot(f.pos.x - p.x, f.pos.z - p.z) < near)) st.running = true;
    if (!st.running) return;
    st.timer -= dt;
    if (st.timer > 0) return;
    st.timer = every;
    if (handle.alive < (spec.max ?? 3)) spawn();
  });
  return handle;
}

const KINDS = ['laterne', 'laternenpfahl', 'suessigkeit', 'suessigkeiten', 'suessigkeiten_tuer', 'grabstein_schalter', 'riesenkuerbis'];

export const TYPES = {
  ...Object.fromEntries(KINDS.map((k) => [k, (level, spec) => level.spawn(k, spec)])),
  riesenkuerbis_roll: buildRiesenkuerbisRoll,
};
