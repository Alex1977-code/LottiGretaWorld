// Bausteine Walzen der Bonuswelt Stern (Präzisierung „Motor und Bausteine Bonuswelten“; Bauplan S-3 „Holz-Athletik mit
// rollenden Schienenwalzen, Walzentrio, Walzenaufstieg, große Walze mit Seitenweg; Rätselbox: Walzenraum drehen; kleine Walze
// am Checkpoint drehen“).
//
// schienenwalze – großer Holzzylinder, der auf zwei Schienen (an seinen Enden) einen Pfad entlangrollt; man steht oben und
//   fährt mit (Mitnahme der Fahrt), die Oberfläche läuft dabei langsam gegen die Fahrtrichtung (`roll`) – wer stehen bleibt,
//   rutscht nach hinten und fällt herunter, wer mitläuft, bleibt oben. Seitlich steil (runde Kollision aus Scheiben).
//   Start beim Betreten (bzw. sofort/Signal); am Ende hält sie, rollt zurück oder fällt in die Tiefe und erscheint nach
//   `respawn` s wieder am Anfang. Neustart am Checkpoint setzt zurück.
//   { type: 'schienenwalze', id, path: [[x, y, z] …] (Achsmitte; Fahrt entlang der Punkte, Achse quer dazu) | pos + to,
//     radius: 1.6, length: 7 (Achslänge), speed: 2.6 (m/s Fahrt), roll: 1.1 (m/s Oberfläche gegen die Fahrt; 0 = nur
//     Mitfahrt), start: 'stand' | 'auto' | 'signal', wait: 0.35 (s nach dem Betreten), end: 'fallen' | 'halt' | 'zurueck',
//     respawn: 3, rails: true (Schienen über den ganzen Pfad zeichnen), style: 'holz' | 'birke' | 'rot', slice: 0.3 }
//   level.named.get(id) = { state ('ruhe'|'wartet'|'rollt'|'ende'|'faellt'|'weg'), s (Weg m), pos {x,y,z}, rolls, carried(),
//     start(), stop(), reset(), info() }; Formen tag 'schienenwalze' (Rampen-Scheiben mit mover und conveyor); star(level).rollers.
//   Beispiel: { type: 'schienenwalze', id: 'walze1', path: [[0, 1.6, -20], [0, 1.6, -60]], radius: 1.6, length: 7 }
//
// walzenraum – hohle Riesenwalze (Raum), die sich per Schalter (bzw. Signal toggle/start) in 90°-Schritten um ihre Achse dreht:
//   die Einbauten (Kästen im Querschnitt) drehen mit, der runde Mantel bleibt (ringförmig, innen begehbar). Während der
//   Drehung schweben Figuren im Raum an ihrem Platz und landen danach auf dem, was nun unten ist. Mitgedrehte Items (Sterne,
//   Münzen) wandern mit.
//   { type: 'walzenraum', id, pos: [x, y, z] (Achsmitte), radius: 4, length: 8, axis: 'z' (Achse entlang Z, Querschnitt
//     x/y) | 'x', thick: 0.5 (Mantel), parts: [{ u, v, w, h, color }] (Kästen im Querschnitt: Mitte u quer, v hoch relativ zur
//     Achse; ganze Länge, sonst a: [a0, a1] entlang der Achse), turn: 0 (Startstellung 0..3), time: 0.9 (s je Viertel-
//     drehung), items: [{ kind: 'coin' | …, u, v, a } | { star: id | Index, u, v, a } (Stern aus LEVEL.stars)] (drehen mit), schalter: { pos, id } (Druckknopf
//     außen, löst eine Vierteldrehung aus), onTurn: Aktion, ends: 'offen' | 'zu' (Stirnwände; offen = Eingänge),
//     color: 'holz' | 'birke' }
//   level.named.get(id) = { turn (0..3), turning, turns, toggle() (= start(), eine Vierteldrehung), info() }; star(level).drums.
//   Beispiel: { type: 'walzenraum', id: 'raum', pos: [0, 4.5, -90], radius: 4, length: 8,
//               parts: [{ u: 0, v: -2.5, w: 3, h: 0.5 }, { u: 2.5, v: 0, w: 0.5, h: 3 }], schalter: { pos: [6, 0, -86] } }

import * as THREE from 'three';
import { v3, addObject, lin, mixc, smooth, colorize, merge, box } from '../kit.js';
import { runAction, visDt } from '../../entities/gimmick.js';
import { star, figures, onRespawn, ease, clamp, TAU, figureInside } from '../starkit.js';

const WOOD = {
  holz: { a: 0xc8884a, b: 0x9a5e2a, end: 0xe8c08a, ring: 0x7a4a1e },
  birke: { a: 0xf0e8d8, b: 0xd0c4ac, end: 0xf8f0dc, ring: 0x6a5a48 },
  rot: { a: 0xe0503a, b: 0xa82a20, end: 0xffd0a0, ring: 0x6a1a10 },
};

// ===================================================================== Schienenwalze

export function buildSchienenwalze(level, spec) {
  let pts = (spec.path ?? []).map((q) => v3(q));
  if (!pts.length) pts = [v3(spec.pos ?? [0, 0, 0]), v3(spec.to ?? [0, 0, -30])];
  if (pts.length === 1) pts.push({ x: pts[0].x, y: pts[0].y, z: pts[0].z - 30 });
  const segs = [];
  let L = 0;
  for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; const l = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z); segs.push({ a, b, s0: L, l }); L += l; }
  const R = spec.radius ?? 1.6, LEN = spec.length ?? 7, speed = spec.speed ?? 2.6, roll = spec.roll ?? 1.1;
  // Achse quer zur Fahrt: Fahrt überwiegend entlang z → Achse x
  const d0 = { x: pts[1].x - pts[0].x, z: pts[1].z - pts[0].z };
  const axis = Math.abs(d0.z) >= Math.abs(d0.x) ? 'x' : 'z';
  const at = (s, out = {}) => {
    s = clamp(s, 0, L);
    let g = segs[segs.length - 1];
    for (const q of segs) if (s <= q.s0 + q.l) { g = q; break; }
    const u = g.l > 0 ? (s - g.s0) / g.l : 0;
    const hl = Math.hypot(g.b.x - g.a.x, g.b.z - g.a.z) || 1;
    return Object.assign(out, { x: g.a.x + (g.b.x - g.a.x) * u, y: g.a.y + (g.b.y - g.a.y) * u, z: g.a.z + (g.b.z - g.a.z) * u, tx: (g.b.x - g.a.x) / hl, tz: (g.b.z - g.a.z) / hl });
  };
  const st = { state: spec.start === 'auto' ? 'rollt' : 'ruhe', s: 0, t: 0, angle: 0, rolls: 0, vy: 0, drop: 0, pos: at(0) };
  const handle = { kind: 'schienenwalze' };
  // Kollision: Rampen-Scheiben quer zur Achse (Oberseite auf dem Kreis), alle mit demselben mover
  const step = spec.slice ?? 0.3;
  const n = Math.max(4, Math.round((2 * R) / step));
  const sw = (2 * R) / n;
  const mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: 0, cz: 0 };
  const slices = [];
  for (let i = 0; i < n; i++) {
    const u0 = -R + i * sw, u1 = u0 + sw;
    const h0 = Math.sqrt(Math.max(0, R * R - u0 * u0)), h1 = Math.sqrt(Math.max(0, R * R - u1 * u1));
    const um = (u0 + u1) / 2, hm = Math.sqrt(Math.max(0, R * R - um * um));
    const conv = { x: 0, z: 0 };
    const sh = { type: 'ramp', axis: axis === 'x' ? 'z' : 'x', dir: h1 >= h0 ? 1 : -1, min: [0, 0, 0], max: [1, 1, 1], low: 0, conveyor: conv, mover, owner: handle, tag: 'schienenwalze', noWallSlide: true };
    slices.push({ u0, u1, hi: Math.max(h0, h1), lo: Math.min(h0, h1), bot: -Math.max(0.2, hm), cosT: hm / R, sh, conv, id: null });
  }
  const place = (p) => {
    for (const q of slices) {
      const sh = q.sh;
      if (axis === 'x') { sh.min = [p.x - LEN / 2, p.y + q.bot, p.z + q.u0]; sh.max = [p.x + LEN / 2, p.y + q.hi, p.z + q.u1]; }
      else { sh.min = [p.x + q.u0, p.y + q.bot, p.z - LEN / 2]; sh.max = [p.x + q.u1, p.y + q.hi, p.z + LEN / 2]; }
      sh.low = p.y + q.lo;
      if (q.id !== null) level.world.update(q.id);
    }
  };
  const setConv = (on) => {
    const p = st.pos;
    for (const q of slices) { const v = on ? -roll * q.cosT : 0; q.conv.x = p.tx * v; q.conv.z = p.tz * v; }
  };
  const solid = (on) => {
    for (const q of slices) {
      if (on && q.id === null) q.id = level.world.add(q.sh);
      else if (!on && q.id !== null) { level.world.remove(q.id); q.id = null; }
    }
  };
  place(st.pos); solid(true); setConv(st.state === 'rollt');
  const carried = () => figures(level).filter((f) => f.mode === 'ground' && f.ground?.owner === handle).length;
  const reset = () => {
    st.state = spec.start === 'auto' ? 'rollt' : 'ruhe'; st.s = 0; st.t = 0; st.vy = 0; st.drop = 0;
    at(0, st.pos); place(st.pos); solid(true); setConv(st.state === 'rollt');
  };
  Object.assign(handle, {
    get state() { return st.state; }, get s() { return st.s; }, get pos() { return st.pos; }, get rolls() { return st.rolls; }, length: L,
    carried, reset,
    start() { if (st.state === 'ruhe' || st.state === 'wartet' || st.state === 'ende') { st.state = 'rollt'; st.rolls++; setConv(true); } },
    stop() { if (st.state === 'rollt') { st.state = 'ende'; setConv(false); } },
    info: () => ({ state: st.state, s: +st.s.toFixed(2), y: +st.pos.y.toFixed(2), z: +st.pos.z.toFixed(2), carried: carried(), rolls: st.rolls }),
  });
  if (spec.id) level.named.set(spec.id, handle);
  star(level).rollers.push(handle);
  onRespawn(level, reset);
  const end = spec.end ?? 'fallen', wait = spec.wait ?? 0.35, respawn = spec.respawn ?? 3;
  const prev = { x: 0, y: 0, z: 0 };
  level.onStep((dt) => {
    prev.x = st.pos.x; prev.y = st.pos.y; prev.z = st.pos.z;
    st.t += dt;
    if (st.state === 'ruhe') {
      if (spec.start !== 'signal' && carried() > 0) { st.state = 'wartet'; st.t = 0; }
    } else if (st.state === 'wartet') {
      if (st.t >= wait) { st.state = 'rollt'; st.rolls++; setConv(true); level.sfx('rumble'); }
    } else if (st.state === 'rollt') {
      st.s = Math.min(L, st.s + speed * dt);
      at(st.s, st.pos);
      if (st.s >= L) {
        if (end === 'halt') { st.state = 'ende'; setConv(false); }
        else if (end === 'zurueck') { st.state = 'zurueck'; }
        else { st.state = 'faellt'; st.t = 0; st.vy = 0; setConv(false); level.sfx('fall'); }
      }
    } else if (st.state === 'zurueck') {
      st.s = Math.max(0, st.s - speed * 1.5 * dt);
      at(st.s, st.pos);
      if (st.s <= 0) { st.state = 'ruhe'; setConv(false); }
    } else if (st.state === 'faellt') {
      st.vy -= 22 * dt;
      st.pos.y += st.vy * dt;
      st.pos.x += st.pos.tx * speed * dt * 0.6; st.pos.z += st.pos.tz * speed * dt * 0.6;
      if (st.t > 1.6) { st.state = 'weg'; st.t = 0; solid(false); }
    } else if (st.state === 'weg') {
      if (st.t >= respawn) {
        at(0, st.pos); place(st.pos);
        const b = axis === 'x' ? { x0: st.pos.x - LEN / 2, x1: st.pos.x + LEN / 2, y0: st.pos.y - R, y1: st.pos.y + R, z0: st.pos.z - R, z1: st.pos.z + R }
          : { x0: st.pos.x - R, x1: st.pos.x + R, y0: st.pos.y - R, y1: st.pos.y + R, z0: st.pos.z - LEN / 2, z1: st.pos.z + LEN / 2 };
        if (!figureInside(level, b)) { st.s = 0; st.state = 'ruhe'; solid(true); setConv(false); }
      }
    }
    if (st.state !== 'weg') place(st.pos);
    mover.dx = st.pos.x - prev.x; mover.dy = st.pos.y - prev.y; mover.dz = st.pos.z - prev.z;
    const k = dt > 0 ? 1 / dt : 0;
    mover.vx = mover.dx * k; mover.vy = mover.dy * k; mover.vz = mover.dz * k;
    mover.cx = st.pos.x; mover.cz = st.pos.z;
    // Drehung (Darstellung): Oberfläche läuft relativ zur Achse mit roll gegen die Fahrt, dazu das Abrollen der Fahrt
    if (st.state === 'rollt' || st.state === 'zurueck' || st.state === 'faellt') st.angle += ((st.state === 'zurueck' ? -1 : 1) * roll) / R * dt;
  });
  if (!level.view) return handle;
  // ---------------- Darstellung: Walze (dreht um ihre Achse), Schienen über den Pfad
  const W = WOOD[spec.style] ?? WOOD.holz;
  const root = new THREE.Group();
  root.name = 'schienenwalze';
  const spin = new THREE.Group();
  root.add(spin);
  if (axis === 'z') root.rotation.y = Math.PI / 2;   // lokal: Achse entlang X
  const A = lin(W.a), B = lin(W.b), E = lin(W.end), RG = lin(W.ring);
  const body = new THREE.CylinderGeometry(R, R, LEN, 28, 1, true);
  body.rotateZ(Math.PI / 2);
  const bodyC = colorize(body, (p, nn, o) => { const ang = Math.atan2(p.z, p.y); const st2 = Math.sin(ang * 14) * 0.5 + 0.5; mixc(B, A, 0.55 + st2 * 0.45, o); });
  const caps = [];
  for (const s of [-1, 1]) {
    const c = new THREE.CircleGeometry(R, 28);
    c.rotateY(s * Math.PI / 2); c.translate(s * LEN / 2, 0, 0);
    caps.push(colorize(c.toNonIndexed(), (p, nn, o) => { const r = Math.hypot(p.y, p.z) / R; mixc(E, RG, (Math.sin(r * 18) * 0.5 + 0.5) * 0.35 + smooth(0.9, 1, r) * 0.6, o); }));
    const flange = new THREE.TorusGeometry(R * 0.98, 0.09, 6, 28);
    flange.rotateY(Math.PI / 2); flange.translate(s * (LEN / 2 - 0.05), 0, 0);
    caps.push(colorize(flange.toNonIndexed(), (p, nn, o) => { o[0] = 0.55; o[1] = 0.56; o[2] = 0.62; }));
  }
  // Längsstreifen (Holzleisten) für sichtbares Rollen
  const strips = [];
  for (let i = 0; i < 6; i++) {
    const b = new THREE.BoxGeometry(LEN * 0.98, 0.08, 0.3);
    b.translate(0, R + 0.01, 0); b.rotateX((i / 6) * TAU);
    strips.push(colorize(b.toNonIndexed(), (p, nn, o) => { o[0] = RG[0] * 1.3; o[1] = RG[1] * 1.3; o[2] = RG[2] * 1.3; }));
  }
  const geo = merge([bodyC, ...caps, ...strips]);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, side: THREE.DoubleSide }));
  mesh.castShadow = true; mesh.receiveShadow = true;
  spin.add(mesh);
  const holder = {};
  addObject(level, root, (dt) => {
    visDt(level, holder, dt);
    root.position.set(st.pos.x, st.pos.y, st.pos.z);
    root.visible = st.state !== 'weg';
    // Achse lokal X; Fahrt nach −Z (axis x): Oberfläche gegen die Fahrt = Drehung um +X
    spin.rotation.x = (axis === 'x' ? 1 : -1) * Math.sign(st.pos.tz || st.pos.tx || -1) * -st.angle;
  });
  if (spec.rails !== false) addRails(level, pts, axis, LEN, R);
  return handle;
}

/** Schienen (zwei Metallstränge an den Walzenenden) mit Holzschwellen entlang des Pfads – statisch verschmolzen. */
function addRails(level, pts, axis, LEN, R) {
  const parts = [];
  const metal = 0x9aa4b8, tie = 0x8a5a2e;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const l = Math.hypot(b.x - a.x, b.z - a.z), dy = b.y - a.y;
    if (l < 0.01) continue;
    const yaw = Math.atan2(b.x - a.x, b.z - a.z);
    const pitch = Math.atan2(dy, l);
    for (const s of [-1, 1]) {
      const g = new THREE.BoxGeometry(0.22, 0.22, Math.hypot(l, dy) + 0.2);
      g.rotateX(-pitch); g.rotateY(yaw);
      const off = (LEN / 2 + 0.05) * s;
      g.translate((a.x + b.x) / 2 + (axis === 'x' ? off : 0), (a.y + b.y) / 2 - R - 0.11, (a.z + b.z) / 2 + (axis === 'z' ? off : 0));
      parts.push(colorize(g.toNonIndexed(), (p, nn, o) => { const c = lin(metal); const k = nn.y > 0.5 ? 1.15 : 0.8; o[0] = c[0] * k; o[1] = c[1] * k; o[2] = c[2] * k; }));
    }
    const nT = Math.max(1, Math.floor(l / 1.6));
    for (let k = 0; k <= nT; k++) {
      const u = k / nT;
      const x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u, z = a.z + (b.z - a.z) * u;
      parts.push(box(axis === 'x' ? LEN + 0.9 : 0.35, 0.16, axis === 'x' ? 0.35 : LEN + 0.9, x, y - R - 0.3, z, tie, { r: 0.04, seg: 1 }));
    }
  }
  if (parts.length) level.view.addStatic(merge(parts), { material: 'world' });
}

// ===================================================================== Walzenraum

export function buildWalzenraum(level, spec) {
  const p = v3(spec.pos);
  const R = spec.radius ?? 4, LEN = spec.length ?? 8, thick = spec.thick ?? 0.5;
  const axis = spec.axis === 'x' ? 'x' : 'z';
  const time = spec.time ?? 0.9;
  const st = { turn: ((spec.turn ?? 0) % 4 + 4) % 4, turning: false, t: 0, turns: 0, from: 0, angle: 0, held: [] };
  st.angle = st.turn * Math.PI / 2;
  // Querschnitt (u quer, v hoch) → Welt; Achse entlang a
  const toW = (u, v, a = 0) => (axis === 'z' ? { x: p.x + u, y: p.y + v, z: p.z + a } : { x: p.x + a, y: p.y + v, z: p.z + u });
  const rot = (u, v, k) => { let x = u, y = v; for (let i = 0; i < k; i++) { const t = x; x = -y; y = t; } return { u: x, v: y }; };
  // Mantel: 16 Ring-Kästen (symmetrisch zu 90°-Drehungen → bleibt fest)
  const N = 16;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU, am = (a0 + a1) / 2;
    const cu = Math.cos(am) * (R + thick / 2), cv = Math.sin(am) * (R + thick / 2);
    const span = 2 * (R + thick) * Math.sin(Math.PI / N) + 0.05;
    // achsenparallele Näherung: je nach Lage breit/flach
    const horiz = Math.abs(Math.sin(am)) > 0.7071;
    const hw = horiz ? span / 2 : thick / 2 + 0.1, hh = horiz ? thick / 2 + 0.1 : span / 2;
    const c = toW(cu, cv);
    const ext = (axis === 'z') ? [hw, LEN / 2] : [LEN / 2, hw];
    level.world.add({ type: 'box', min: [c.x - ext[0], c.y - hh, c.z - ext[1]], max: [c.x + ext[0], c.y + hh, c.z + ext[1]], tag: 'walzenraum-mantel' });
    void a1;
  }
  // Einbauten
  const parts = (spec.parts ?? []).map((q, i) => ({ i, u: q.u ?? 0, v: q.v ?? 0, w: q.w ?? 2, h: q.h ?? 0.5, a: q.a ?? null, color: q.color, id: null }));
  const boxOf = (q, k) => {
    const c = rot(q.u, q.v, k);
    const w = k % 2 ? q.h : q.w, h = k % 2 ? q.w : q.h;
    const a0 = q.a ? q.a[0] : -LEN / 2, a1 = q.a ? q.a[1] : LEN / 2;
    const A = toW(c.u - w / 2, c.v - h / 2, a0), B = toW(c.u + w / 2, c.v + h / 2, a1);
    return { x0: Math.min(A.x, B.x), x1: Math.max(A.x, B.x), y0: Math.min(A.y, B.y), y1: Math.max(A.y, B.y), z0: Math.min(A.z, B.z), z1: Math.max(A.z, B.z) };
  };
  const handle = { kind: 'walzenraum' };
  const solid = (on) => {
    for (const q of parts) {
      if (on && q.id === null) { const b = boxOf(q, st.turn); q.id = level.world.add({ type: 'box', min: [b.x0, b.y0, b.z0], max: [b.x1, b.y1, b.z1], owner: handle, tag: 'walzenraum' }); }
      else if (!on && q.id !== null) { level.world.remove(q.id); q.id = null; }
    }
  };
  solid(true);
  // mitdrehende Items
  // Items: eigene Entitäten (kind) oder ein vorhandener Stern aus LEVEL.stars (star: id | Index; wird beim ersten Schritt gesucht)
  const items = (spec.items ?? []).map((it) => {
    if (it.star !== undefined) return { it, e: null };
    const c = rot(it.u ?? 0, it.v ?? 0, st.turn);
    const w = toW(c.u, c.v, it.a ?? 0);
    return { it, e: level.spawn(it.kind ?? 'coin', { ...it, pos: [w.x, w.y, w.z] }) };
  });
  const placeItems = (ang) => {
    for (const ref of items) {
      const it = ref.it;
      if (!ref.e && it.star !== undefined) ref.e = level.entities.find((x) => x.kind === 'star' && !x.removed && (x.spec?.id === it.star || x.index === it.star)) ?? null;
      const e = ref.e;
      if (!e || e.removed) continue;
      const u = it.u ?? 0, v = it.v ?? 0, ca = Math.cos(ang), sa = Math.sin(ang);
      const w = toW(u * ca - v * sa, u * sa + v * ca, it.a ?? 0);
      e.pos.set(w.x, w.y, w.z);
    }
  };
  level.onStep(() => { if (!st.turning) placeItems(st.angle); });
  const inside = (f) => {
    const du = axis === 'z' ? f.pos.x - p.x : f.pos.z - p.z, dv = f.pos.y + f.half.y - p.y, da = axis === 'z' ? f.pos.z - p.z : f.pos.x - p.x;
    return Math.hypot(du, dv) < R && Math.abs(da) < LEN / 2;
  };
  const turnOnce = () => {
    if (st.turning) return false;
    st.turning = true; st.t = 0; st.from = st.turn; st.turns++;
    solid(false);
    st.held = figures(level).filter(inside).map((f) => ({ f, x: f.pos.x, y: f.pos.y, z: f.pos.z }));
    level.sfx('rumble');
    return true;
  };
  Object.assign(handle, {
    get turn() { return st.turn; }, get turning() { return st.turning; }, get turns() { return st.turns; },
    toggle: turnOnce, start: turnOnce,
    info: () => ({ turn: st.turn, turning: st.turning, turns: st.turns, held: st.held.length }),
  });
  if (spec.id) level.named.set(spec.id, handle);
  star(level).drums.push(handle);
  if (spec.schalter) {
    const s = spec.schalter;
    const id = spec.id ?? `walzenraum_${Math.round(p.x)}_${Math.round(p.z)}`;
    if (!spec.id) level.named.set(id, handle);
    level.spawn('druckknopf', { pos: s.pos, id: s.id, color: s.color ?? 'blau', once: false, reset: time + 0.6, onPress: { toggle: id } });
  }
  level.onStep((dt) => {
    if (!st.turning) return;
    st.t += dt;
    const u = ease(st.t / time);
    st.angle = (st.from + u) * Math.PI / 2;
    placeItems(st.angle);
    for (const h of st.held) { if (h.f.dead) continue; h.f.pos.set(h.x, h.y, h.z); h.f.vel.set(0, 0, 0); h.f.mode = 'air'; }
    if (st.t >= time) {
      st.turning = false;
      st.turn = (st.from + 1) % 4;
      st.angle = st.turn * Math.PI / 2;
      solid(true);
      // steckt eine Figur nun in einem Einbau: obendrauf setzen
      for (const h of st.held) {
        for (const q of parts) {
          const b = boxOf(q, st.turn);
          const f = h.f;
          if (f.pos.x + f.half.x > b.x0 && f.pos.x - f.half.x < b.x1 && f.pos.z + f.half.z > b.z0 && f.pos.z - f.half.z < b.z1 && f.pos.y < b.y1 && f.pos.y + f.half.y * 2 > b.y0) f.pos.y = b.y1 + 0.01;
        }
      }
      st.held = [];
      level.sfx('slam');
      runAction(level, spec.onTurn, { pos: [p.x, p.y, p.z], source: handle });
    }
  });
  if (!level.view) return handle;
  // ---------------- Darstellung: Mantel (statisch: Ring mit Leisten), Einbauten drehen (eine Gruppe)
  const W = WOOD[spec.color] ?? WOOD.birke;
  const A = lin(W.a), B = lin(W.b);
  const shell = new THREE.CylinderGeometry(R + thick, R + thick, LEN, 32, 1, true);
  const inner = new THREE.CylinderGeometry(R, R, LEN, 32, 1, true);
  inner.scale(-1, 1, 1);
  const rings = [];
  for (const s of [-1, 1]) {
    const r = new THREE.RingGeometry(R, R + thick, 32);
    r.rotateX(s * Math.PI / 2); r.translate(0, s * LEN / 2, 0);
    rings.push(r.toNonIndexed());
  }
  const ms = merge([shell.toNonIndexed(), inner.toNonIndexed(), ...rings]);
  colorize(ms, (q, nn, o) => { const ang = Math.atan2(q.z, q.x); mixc(B, A, 0.6 + 0.4 * Math.sin(ang * 16), o); });
  if (axis === 'z') ms.rotateX(Math.PI / 2); else ms.rotateZ(Math.PI / 2);
  ms.translate(p.x, p.y, p.z);
  const shellMesh = new THREE.Mesh(ms, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide, transparent: true, opacity: 0.55, depthWrite: false }));
  shellMesh.name = 'walzenraum_mantel';
  addObject(level, shellMesh);
  const root = new THREE.Group();
  root.name = 'walzenraum';
  root.position.set(p.x, p.y, p.z);
  const spin = new THREE.Group();
  root.add(spin);
  const pg = [];
  for (const q of parts) {
    const a0 = q.a ? q.a[0] : -LEN / 2, a1 = q.a ? q.a[1] : LEN / 2;
    const L2 = a1 - a0, am = (a0 + a1) / 2;
    const g = axis === 'z' ? box(q.w, q.h, L2, q.u, q.v, am, q.color ?? 0x8ad0ff, { r: 0.08 }) : box(L2, q.h, q.w, am, q.v, q.u, q.color ?? 0x8ad0ff, { r: 0.08 });
    pg.push(g);
  }
  if (pg.length) {
    const m = new THREE.Mesh(merge(pg), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }));
    m.castShadow = true; m.receiveShadow = true;
    spin.add(m);
  }
  const holder = {};
  addObject(level, root, (dt) => {
    visDt(level, holder, dt);
    if (axis === 'z') spin.rotation.z = st.angle; else spin.rotation.x = -st.angle;
  });
  return handle;
}

export const TYPES = { schienenwalze: buildSchienenwalze, walzenraum: buildWalzenraum };
