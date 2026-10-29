// Baustein Drehdiorama der Bonuswelt Stern (Präzisierung „Motor und Bausteine Bonuswelten“; Bauplan S-Kapitän „mechanisches
// Diorama, das per Schalter gedreht wird; Drehen ist Pflicht; Stern 4 nur mit gedrehter Kamera sichtbar“). Für den
// Archetyp `diorama` (Orbit-Kamera, Krümel) wie für Parcours-Level.
//
// drehdiorama – mechanischer Diorama-Teil, der sich per Schalter (Druckknopf außen, Signal toggle/start) in 90°-Schritten
//   um eine senkrechte Achse dreht: alle Teile (Kästen relativ zum Drehpunkt) samt Figuren darauf, Gegnern, Münzen und
//   Sternen drehen mit (Mitnahme über mover.dyaw) – so verbinden sich Wege neu. Teile bleiben dabei begehbar. Sterne mit
//   `sicht` sind nur aus einer bestimmten Blickrichtung (Kamera-Gier in Grad, von der Drehmitte aus) bzw. nur in bestimmten
//   Drehstellungen sichtbar und einsammelbar – „Stern nur in gedrehter Ansicht“.
//   { type: 'drehdiorama', id, pos: [x, y, z] (Drehpunkt; y = Unterkante), parts: [{ pos: [dx, dy, dz] (Mitte Unterseite,
//     relativ), size: [w, h, d], color, top (Deckfarbe), climbable }], turn: 0 (Startstellung 0..3), time: 1.2 (s je
//     Vierteldrehung), dir: 1 (+1 = von oben gegen den Uhrzeigersinn), schalter: { pos, id, color } | [ … ],
//     items: [{ kind: 'coin' | …, pos: [dx, dy, dz] } | { star: id | Index }] (drehen mit), sicht: [{ star: id | Index,
//     yaw: [a, b] (Grad) | turn: [Stellungen] }], onTurn: Aktion, disc: { radius, height, color } (feste Drehscheibe unter
//     den Teilen; begehbar, dreht mit), gear: true (Zahnkranz am Rand der Scheibe) }
//   level.named.get(id) = { turn (0..3), turning, turns, angle, toggle() (= start(), eine Vierteldrehung), visible(star),
//     info() }; Formen tag 'drehdiorama' (owner = Griff, mover mit dyaw); star(level).dioramas.
//   Beispiel: { type: 'drehdiorama', id: 'dreh', pos: [0, 0, -20], disc: { radius: 6 },
//               parts: [{ pos: [3, 0, 0], size: [2, 3, 6] }], schalter: { pos: [8, 0, -14] },
//               sicht: [{ star: 'blickstern', yaw: [60, 150] }] }

import * as THREE from 'three';
import { v3, addObject, box, merge, lin, mixc, colorize } from '../kit.js';
import { runAction, visDt } from '../../entities/gimmick.js';
import { defineHandle, star, figures, ease, camYawAt, yawIn, TAU } from '../starkit.js';

export function buildDrehdiorama(level, spec) {
  const P = v3(spec.pos);
  const time = spec.time ?? 1.2, dirS = spec.dir === -1 ? -1 : 1;
  const st = { turn: ((spec.turn ?? 0) % 4 + 4) % 4, turning: false, t: 0, from: 0, angle: 0, turns: 0 };
  st.angle = st.turn * dirS * Math.PI / 2;
  const handle = { kind: 'drehdiorama' };
  const mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: P.x, cz: P.z };
  // Teile in lokalen Koordinaten (relativ zum Drehpunkt)
  // Lange Teile werden für die Kollision in kurze Stücke zerlegt: während der Drehung ist jede Form die Hülle eines gedrehten
  // Stücks – kurze Stücke halten diese Hülle eng an der echten Grundfläche (bei 90°-Stellungen ohnehin exakt)
  const parts = [];
  (spec.parts ?? []).forEach((q, i) => {
    const p = v3(q.pos ?? [0, 0, 0]), s = q.size ?? [2, 1, 2];
    const along = s[0] >= s[2] ? 0 : 2, len = s[along], wid = s[2 - along];
    const k = Math.max(1, Math.ceil(len / Math.max(1.2, wid)));
    for (let j = 0; j < k; j++) {
      const off = -len / 2 + (j + 0.5) * (len / k);
      const pp = { x: p.x + (along === 0 ? off : 0), y: p.y, z: p.z + (along === 2 ? off : 0) };
      const ss = along === 0 ? [len / k, s[1], s[2]] : [s[0], s[1], len / k];
      parts.push({ i, j, p: pp, s: ss, whole: j === 0 ? { p, s } : null, color: q.color, top: q.top, climbable: !!q.climbable, id: null, sh: null });
    }
  });
  if (spec.disc) {
    const r = spec.disc.radius ?? 5, h = spec.disc.height ?? 0.6;
    parts.unshift({ i: -1, disc: true, r, h, p: { x: 0, y: -h, z: 0 }, s: [2 * r, h, 2 * r], color: spec.disc.color, id: null, sh: null });
  }
  /** Weltlage eines lokalen Punkts bei Winkel a (Drehung um +Y: x' = x·cos + z·sin, z' = −x·sin + z·cos). */
  const toW = (x, z, a) => ({ x: P.x + x * Math.cos(a) + z * Math.sin(a), z: P.z - x * Math.sin(a) + z * Math.cos(a) });
  const shapeFor = (q, a) => {
    if (q.disc) return { type: 'cyl', x: P.x, z: P.z, r: q.r, y0: P.y - q.h, y1: P.y };
    // Hülle der gedrehten Grundfläche (bei 90°-Stellungen exakt)
    const hx = q.s[0] / 2, hz = q.s[2] / 2;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [cx, cz] of [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]]) {
      const w = toW(q.p.x + cx, q.p.z + cz, a);
      x0 = Math.min(x0, w.x); x1 = Math.max(x1, w.x); z0 = Math.min(z0, w.z); z1 = Math.max(z1, w.z);
    }
    return { type: 'box', min: [x0, P.y + q.p.y, z0], max: [x1, P.y + q.p.y + q.s[1], z1] };
  };
  for (const q of parts) {
    q.sh = { ...shapeFor(q, st.angle), owner: handle, mover, tag: 'drehdiorama', climbable: q.climbable || undefined };
    q.id = level.world.add(q.sh);
  }
  const place = (a) => {
    for (const q of parts) {
      if (q.disc) continue;
      const s = shapeFor(q, a);
      q.sh.min = s.min; q.sh.max = s.max;
      level.world.update(q.id);
    }
  };
  // mitdrehende Items (eigene Entitäten oder vorhandene Sterne)
  const items = (spec.items ?? []).map((it) => {
    if (it.star !== undefined) return { it, e: null, local: null };
    const lp = v3(it.pos ?? [0, 0, 0]);
    const w = toW(lp.x, lp.z, st.angle);
    return { it, local: lp, e: level.spawn(it.kind ?? 'coin', { ...it, pos: [w.x, P.y + lp.y, w.z] }) };
  });
  const findStar = (ref) => level.entities.find((x) => x.kind === 'star' && !x.removed && (x.spec?.id === ref || x.index === ref)) ?? null;
  const resolveItems = () => {
    for (const r of items) {
      if (r.e || r.it.star === undefined) continue;
      r.e = findStar(r.it.star);
      if (r.e) { const dxw = r.e.pos.x - P.x, dzw = r.e.pos.z - P.z, a = -st.angle; r.local = { x: dxw * Math.cos(a) + dzw * Math.sin(a), y: r.e.pos.y - P.y, z: -dxw * Math.sin(a) + dzw * Math.cos(a) }; }
    }
  };
  const placeItems = (a) => {
    for (const r of items) {
      if (!r.e || r.e.removed || !r.local) continue;
      const w = toW(r.local.x, r.local.z, a);
      r.e.pos.x = w.x; r.e.pos.z = w.z; r.e.pos.y = P.y + r.local.y;
    }
  };
  // Sicht-Sterne
  const sicht = (spec.sicht ?? []).map((s) => ({ ...s, e: null, vis: true }));
  const visible = (s) => {
    let ok = true;
    if (Array.isArray(s.turn)) ok = ok && s.turn.includes(st.turn) && !st.turning;
    if (Array.isArray(s.yaw)) ok = ok && yawIn(camYawAt(level, P.x, P.z), s.yaw);
    return ok;
  };
  const turnOnce = () => {
    if (st.turning) return false;
    st.turning = true; st.t = 0; st.from = st.turn; st.turns++;
    level.sfx('rumble'); level.sfx('chain');
    return true;
  };
  defineHandle(handle, {
    get turn() { return st.turn; }, get turning() { return st.turning; }, get turns() { return st.turns; }, get angle() { return st.angle; },
    toggle: turnOnce, start: turnOnce,
    visible: (ref) => { const s = sicht.find((q) => q.star === ref); return s ? s.vis : true; },
    info: () => ({ turn: st.turn, turning: st.turning, turns: st.turns, angle: +(st.angle * 180 / Math.PI).toFixed(1), sicht: sicht.map((s) => s.vis) }),
  });
  if (spec.id) level.named.set(spec.id, handle);
  star(level).dioramas.push(handle);
  const sw = Array.isArray(spec.schalter) ? spec.schalter : spec.schalter ? [spec.schalter] : [];
  if (sw.length) {
    const id = spec.id ?? `drehdiorama_${Math.round(P.x)}_${Math.round(P.z)}`;
    if (!spec.id) level.named.set(id, handle);
    for (const s of sw) level.spawn('druckknopf', { pos: s.pos, id: s.id, color: s.color ?? 'rot', once: false, reset: time + 0.5, onPress: { toggle: id } });
  }
  level.onStep((dt) => {
    resolveItems();
    mover.dyaw = 0; mover.dx = mover.dz = mover.vx = mover.vz = 0;
    if (st.turning) {
      st.t += dt;
      const u = Math.min(1, ease(st.t / time));
      const a = (st.from + u) * dirS * Math.PI / 2;
      mover.dyaw = a - st.angle;
      st.angle = a;
      if (st.t >= time) {
        st.turning = false;
        st.turn = (st.from + 1) % 4;
        const exact = st.turn * dirS * Math.PI / 2;
        mover.dyaw += exact - st.angle;
        st.angle = exact;
        level.sfx('slam');
        runAction(level, spec.onTurn, { pos: [P.x, P.y + 1, P.z], source: handle });
        level.signal?.('drehdiorama', { id: spec.id ?? null, turn: st.turn });
      }
      place(st.angle);
    }
    placeItems(st.angle);
    for (const s of sicht) {
      s.e ??= findStar(s.star);
      if (!s.e || s.e.removed) continue;
      const v = visible(s);
      if (v !== s.vis || s.e.hidden === v) {
        s.vis = v;
        s.e.hidden = !v;
        s.e.touch = v;
        if (s.e.model) s.e.model.root.visible = v;
        if (v) level.effects?.sparks({ x: s.e.pos.x, y: s.e.pos.y + 0.6, z: s.e.pos.z }, 8);
      }
    }
    void figures;
  });
  if (!level.view) return handle;
  // ---------------- Darstellung: eine drehende Gruppe (Teile verschmolzen), Zahnkranz am Scheibenrand
  const root = new THREE.Group();
  root.name = 'drehdiorama';
  root.position.set(P.x, P.y, P.z);
  const geos = [];
  for (const q of parts) {
    if (q.disc) {
      const g = new THREE.CylinderGeometry(q.r, q.r, q.h, 40);
      g.translate(0, -q.h / 2, 0);
      const c = lin(typeof q.color === 'number' ? q.color : 0xc8a060), hi = lin(0xf0d8a0);
      geos.push(colorize(g, (p, n, o) => { if (n.y > 0.5) { const r = Math.hypot(p.x, p.z) / q.r; mixc(c, hi, (Math.floor(r * 4) % 2) * 0.35, o); } else mixc(c, [0.3, 0.2, 0.1], 0.4, o); }));
      if (spec.gear !== false) {
        const teeth = Math.max(12, Math.round(q.r * 5));
        for (let i = 0; i < teeth; i++) {
          const a = (i / teeth) * TAU;
          const tooth = box(0.5, q.h * 0.8, 0.45, 0, -q.h * 0.5, 0, 0xd8b048, { r: 0.06, seg: 1 });
          tooth.applyMatrix4(new THREE.Matrix4().makeRotationY(-a));
          tooth.translate(Math.cos(a) * (q.r + 0.18), 0, Math.sin(a) * (q.r + 0.18));
          geos.push(tooth);
        }
      }
      continue;
    }
    if (!q.whole) continue;   // Darstellung je Teil im Ganzen
    const col = typeof q.color === 'number' ? q.color : 0x8ab0ff;
    const W = q.whole;
    geos.push(box(W.s[0], W.s[1], W.s[2], W.p.x, W.p.y + W.s[1] / 2, W.p.z, col, { r: 0.1, topColor: q.top ?? undefined }));
  }
  if (geos.length) {
    const mesh = new THREE.Mesh(merge(geos), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.08 }));
    mesh.castShadow = true; mesh.receiveShadow = true;
    root.add(mesh);
  }
  const holder = {};
  addObject(level, root, (dt) => { visDt(level, holder, dt); root.rotation.y = st.angle; });
  return handle;
}

export const TYPES = { drehdiorama: buildDrehdiorama };
