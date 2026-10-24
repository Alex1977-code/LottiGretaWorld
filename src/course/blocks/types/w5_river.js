// Bewegliche Brücken über dem Fluss (Bauplan 5-1 „Höhlenfluss: Ritt auf dem Reittier, Sandtaucher, bewegliche
// Brücken“) – für den Ritt-Abschnitt im Parcours (archetype 'parcours_ride', Präzisierung Motor und Bausteine Welt 5).
//
// flussbruecke – Holzbrücke quer über den Fluss, die sich hebt und senkt (Hubbrücke): Unten liegt sie knapp über dem
//   Wasser und versperrt dem Floß den Weg (es prallt ab und wartet – oder hüpft hinüber, wenn sie nur wenig aufragt),
//   oben fährt Pflaume darunter durch. Zu Fuß ist sie eine bewegte Plattform (trägt Figuren/Gegner, mover). Senkt sie
//   sich, während das Floß darunter ist, hält sie über ihm an (kein Einklemmen).
//   { type: 'flussbruecke', id, from: [x, y, z], to: [x, y, z] (Enden der Lauffläche in der unteren Lage, achsenparallel
//     quer zum Fluss), width: 2.6, thick: 0.45, lift: 2.8 (m Hub), wait: 1.6 (s Halt oben/unten), speed: 1.8 (m/s),
//     phase: 0 (s Versatz), start: 'low' | 'high', idle: false (wartet auf { start: id }), posts: true (Pfosten an den
//     Enden), rails: true }
//   level.named.get(id) = { y (Lauffläche), state ('low' | 'up' | 'high' | 'down' | 'hold'), hits (Floß-Abpraller),
//     box(), start() (Takt), stop(), hold('low' | 'high') (anfahren und dort bleiben), toggle() (Signal { toggle: id }:
//     gehaltene Lage wechseln), info() }; trägt sich in level.rideObstacles ein (RideController.collideObstacles).
// Modell aus der Registry, sobald es den Namen gibt: 'flussbruecke' ({ length, width, thick }, Ursprung = Mitte der
// Lauffläche, Brücke entlang +X); sonst eigene Geometrie (Bohlen, Geländer, Ketten zu den Pfosten).

import * as THREE from 'three';
import { v3, lin, mixc, smooth, colorize, merge, hex, box, addObject, addStatic } from '../kit.js';
import { MovingBox, figures } from '../w2kit.js';
import { visDt } from '../../entities/gimmick.js';
import { hasModel, getModel } from '../../models/index.js';

function deckGeo(L, W, thick, rails) {
  const parts = [];
  const a = lin(0xd8a060), b = lin(0xb8803e), dark = lin(0x6a4424);
  const n = Math.max(3, Math.round(L / 0.5));
  for (let i = 0; i < n; i++) {
    const x = -L / 2 + (i + 0.5) * (L / n);
    const g = box(L / n - 0.05, thick * 0.55, W, x, -thick * 0.28, 0, 0xd8a060, { r: 0.03, seg: 1 });
    const c = i % 2 ? a : b;
    parts.push(colorize(g, (p, nn, o) => mixc(dark, c, smooth(-0.6, 0.9, nn.y), o)));
  }
  for (const sz of [-1, 1]) {
    const beam = box(L, thick * 0.5, 0.2, 0, -thick * 0.7, sz * (W / 2 - 0.1), 0x8a5a2e, { r: 0.04, seg: 1 });
    parts.push(colorize(beam, (p, nn, o) => mixc(dark, lin(0x8a5a2e), smooth(-0.5, 1, nn.y), o)));
    if (rails) {
      const rail = box(L - 0.2, 0.09, 0.09, 0, 0.82, sz * (W / 2 - 0.08), 0xe8c088, { r: 0.03, seg: 1 });
      parts.push(colorize(rail, (p, nn, o) => mixc(b, a, smooth(-0.3, 1, nn.y), o)));
      for (let k = 0; k <= Math.round(L / 1.2); k++) {
        const x = -L / 2 + 0.1 + k * ((L - 0.2) / Math.round(L / 1.2));
        const post = box(0.1, 0.85, 0.1, x, 0.42, sz * (W / 2 - 0.08), 0xb8803e, { r: 0.02, seg: 1 });
        parts.push(colorize(post, (p, nn, o) => mixc(dark, b, smooth(-0.5, 1, nn.y), o)));
      }
    }
  }
  return merge(parts);
}

export function buildFlussbruecke(level, spec) {
  const a = v3(spec.from), b = v3(spec.to);
  const alongX = Math.abs(b.x - a.x) >= Math.abs(b.z - a.z);
  const L = alongX ? Math.abs(b.x - a.x) : Math.abs(b.z - a.z);
  const W = spec.width ?? 2.6, thick = spec.thick ?? 0.45;
  const cx = (a.x + b.x) / 2, cz = (a.z + b.z) / 2, low = Math.min(a.y, b.y);
  const lift = spec.lift ?? 2.8, wait = spec.wait ?? 1.6, speed = spec.speed ?? 1.8;
  const sx = alongX ? L : W, sz = alongX ? W : L;
  const st = { y: spec.start === 'high' ? low + lift : low, state: spec.start === 'high' ? 'high' : 'low', t: -(spec.phase ?? 0), running: !spec.idle, hits: 0 };
  const mb = new MovingBox(level, cx, st.y - thick, cz, sx, thick, sz, { tag: 'flussbruecke', camIgnore: true });
  const handle = {
    get y() { return st.y; }, get state() { return st.state; },
    get hits() { return obstacle.hits ?? 0; },
    box: () => ({ x0: cx - sx / 2, x1: cx + sx / 2, y0: st.y - thick, y1: st.y + 0.9, z0: cz - sz / 2, z1: cz + sz / 2 }),
    start() { st.running = true; st.hold = null; }, stop() { st.running = false; },
    /** In die Lage 'low' | 'high' fahren und dort bleiben (Signal toggle wechselt die gehaltene Lage). */
    hold(where = 'low') { st.hold = where === 'high' ? 'high' : 'low'; st.running = true; },
    toggle() { handle.hold(st.hold === 'low' || (!st.hold && st.y < low + lift / 2) ? 'high' : 'low'); },
    info: () => ({ y: +st.y.toFixed(3), state: st.state, hits: obstacle.hits ?? 0, riders: mb.carried(level) }),
  };
  mb.shape.owner = handle;
  const obstacle = { box: handle.box, hits: 0, id: spec.id ?? null };
  level.rideObstacles ??= [];
  level.rideObstacles.push(obstacle);
  if (spec.id) level.named.set(spec.id, handle);
  /** Floß (Reiterin) unter der Brücke? Dann nicht weiter senken. */
  const raftUnder = () => figures(level).some((f) => f.riding && Math.abs(f.pos.x - cx) < sx / 2 + 0.7 && Math.abs(f.pos.z - cz) < sz / 2 + 0.7 && f.pos.y + 1.45 > st.y - thick - 0.05 - speed / 120);
  level.onStep((dt) => {
    let y = st.y;
    if (st.hold) {
      // gehaltene Lage anfahren (nach unten nur, wenn kein Floß darunter ist)
      if (st.hold === 'high') { y = Math.min(low + lift, y + speed * dt); st.state = y >= low + lift - 1e-6 ? 'high' : 'up'; }
      else if (raftUnder() && y > low + 1e-6) st.state = 'hold';
      else { y = Math.max(low, y - speed * dt); st.state = y <= low + 1e-6 ? 'low' : 'down'; }
    } else if (st.running) {
      st.t += dt;
      if (st.state === 'low' || st.state === 'high') { if (st.t >= wait) { st.state = st.state === 'low' ? 'up' : 'down'; st.t = 0; level.sfx('chain'); } }
      else if (st.state === 'up') { y = Math.min(low + lift, y + speed * dt); if (y >= low + lift - 1e-6) { st.state = 'high'; st.t = 0; } }
      else if (st.state === 'down' || st.state === 'hold') {
        if (raftUnder()) st.state = 'hold';
        else { st.state = 'down'; y = Math.max(low, y - speed * dt); if (y <= low + 1e-6) { st.state = 'low'; st.t = 0; level.sfx('land'); } }
      }
    }
    st.y = y;
    mb.moveTo(cx, y - thick, cz, dt);
  });
  if (spec.posts !== false) {
    for (const s of [-1, 1]) {
      const px = alongX ? cx + s * (L / 2 + 0.35) : cx, pz = alongX ? cz : cz + s * (L / 2 + 0.35);
      for (const o of [-1, 1]) {
        const qx = px + (alongX ? 0 : o * (W / 2 - 0.2)), qz = pz + (alongX ? o * (W / 2 - 0.2) : 0);
        const h = lift + 2.2;
        const g = box(0.34, h, 0.34, qx, low - 0.8 + h / 2, qz, 0x8a5a2e, { r: 0.05, seg: 1 });
        addStatic(level, colorize(g, (p, n, oo) => mixc(lin(0x5a3a1e), lin(0x9a6a38), smooth(-0.5, 0.9, n.y + n.x * 0.3), oo)));
        const cap = box(0.48, 0.2, 0.48, qx, low - 0.8 + h + 0.1, qz, 0xe8c088, { r: 0.05, seg: 1 });
        addStatic(level, cap);
      }
    }
  }
  if (level.view) {
    const root = new THREE.Group();
    root.position.set(cx, st.y, cz);
    root.rotation.y = alongX ? 0 : Math.PI / 2;
    let model = null;
    if (hasModel('flussbruecke')) { model = getModel('flussbruecke', { length: L, width: W, thick }); root.add(model.root); }
    else {
      const m = new THREE.Mesh(deckGeo(L, W, thick, spec.rails !== false), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
      m.castShadow = true; m.receiveShadow = true;
      root.add(m);
    }
    const holder = {};
    addObject(level, root, (dt) => { const d = visDt(level, holder, dt); root.position.y = st.y; model?.update?.(d, { state: st.state, y: st.y }); });
  }
  return handle;
}

export const TYPES = { flussbruecke: buildFlussbruecke };
