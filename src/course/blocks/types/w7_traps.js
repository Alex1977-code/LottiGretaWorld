// Welt-7-Bausteine Fallen: Pendelstachel und Klappstampfer (Präzisierung Motor und Bausteine Welt 7).
//
// pendelstachel – Stachelkugel an einer Kette, pendelt im Takt (Bauplan 7-4 „Pendelstacheln“). Die Kugel verletzt bei
//   Berührung (Funkelstern/Riesentrank: unverwundbar); Kette und Aufhängung sind harmlos. Alle Pendel laufen auf der
//   Level-Uhr (Reihen über phase versetzen).
//   { type: 'pendelstachel', id, pos: [x, y, z] (Aufhängepunkt), length: 4 (m bis zur Kugelmitte), radius: 0.6 (Kugel),
//     swing: 60 (° Ausschlag zu jeder Seite), period: 3 (s je Hin und Her), phase: 0 (0..1), plane: 'x' (schwingt entlang
//     X) | 'z', mount: true (Aufhängung mit Balken), idle: false (steht still senkrecht), color: 'eisen' | 'rot' | 'blau' }
//   level.named.get(id) = { angle (rad, aktuell), ball → { x, y, z }, hits, start(), stop(), info() }; w7(level).pendulums
//   Modell aus der Registry 'pendelstachel' ({ length, radius }, Ursprung Aufhängepunkt, hängt nach −Y, schwingt um Z;
//   state { angle }) – sonst eigene Kette und Kugel.
//
// klappstampfer – schwere Platte (mit Stacheln oder als Stampfplatte), die im Takt um ihre untere Kante nach vorn
//   herunterklappt und aufschlägt (Bauplan 7-Burg „Wachbereich: Klappstampfer“). Vorwarnung: sie zittert, die Augen glühen,
//   ein roter Landeboden-Hinweis zeigt die Aufschlagfläche. Wer beim Aufschlag darunter steht, wird getroffen (damage
//   'treffer': Figur verletzt und oben auf die Platte geschoben; 'tod': zerquetscht, deathCause 'crush'); ein Loch (hole)
//   in der Platte ist sicher. Liegend ist sie eine Plattform; danach richtet sie sich langsam wieder auf.
//   { type: 'klappstampfer', id, pos: [x, y, z] (Scharnier: Mitte der Unterkante auf dem Boden), width: 3 (entlang der
//     Kante), length: 4 (Höhe aufrecht = Länge liegend), thick: 0.6, dir: [dx, dz] (klappt in diese Richtung; Standard
//     [0, 1] = zur Kamera), spikes: true, damage: 'treffer' | 'tod', hole: [u0, u1, v0, v1] (Loch: u quer −w/2…w/2, v vom
//     Scharnier 0…length) | null, wait: 2.4, warn: 0.9, fall: 0.32, hold: 1.2, up: 1.4, phase: 0 (s), mode: 'takt' | 'nah'
//     (Figur in der Aufschlagfläche + near m) | 'signal' (start()/fire() = einmal), near: 1.5, hint: true, style: 'stein' |
//     'metall' | 'holz', face: true, idle: false }
//   level.named.get(id) = { state ('oben'|'warn'|'faellt'|'liegt'|'hebt'), fold (0 aufrecht … 1 liegend), slams, hits, hint,
//                           start(), stop(), fire(), footprint() → { x0, x1, z0, z1, y }, info() }; w7(level).stompers
//   Modell aus der Registry 'klappstampfer' ({ width, length, thick, spikes }, Ursprung Scharnier, liegt aufrecht nach +Y,
//   klappt nach +X; state { fold, warn }) – sonst eigene Platte.

import * as THREE from 'three';
import { v3, addObject, lin, mixc, smooth, colorize, merge } from '../kit.js';
import { landingHint } from '../w5kit.js';
import { visDt, runAction } from '../../entities/gimmick.js';
import { hasModel, getModel } from '../../models/index.js';
import { w7, figures, hurtFigures, sphereTouches, w7Sfx, cycle, ease, clamp, TAU } from '../w7kit.js';

// =====================================================================================================================
// Pendelstachel
// =====================================================================================================================

const PCOL = { eisen: [0x6a6a7a, 0xb8b8c8], rot: [0x8a2a22, 0xe05a40], blau: [0x2a3a7a, 0x6a8ae0] };

export function buildPendelstachel(level, spec) {
  const p = v3(spec.pos);
  const Ln = spec.length ?? 4, R = spec.radius ?? 0.6;
  const A = ((spec.swing ?? 60) * Math.PI) / 180, P = spec.period ?? 3, ph = spec.phase ?? 0;
  const plane = spec.plane === 'z' ? 'z' : 'x';
  const st = { angle: 0, running: !spec.idle, hits: 0, t0: 0 };
  const ball = { x: p.x, y: p.y - Ln, z: p.z };
  const handle = {
    get angle() { return st.angle; }, ball, get hits() { return st.hits; },
    start() { st.running = true; }, stop() { st.running = false; },
    info: () => ({ angle: +st.angle.toFixed(3), ball: [+ball.x.toFixed(2), +ball.y.toFixed(2), +ball.z.toFixed(2)], hits: st.hits }),
  };
  if (spec.id) level.named.set(spec.id, handle);
  w7(level).pendulums.push(handle);
  let prevSide = 0;
  level.onStep((dt, time) => {
    st.angle = st.running ? A * Math.sin(TAU * (time / P + ph)) : st.angle * Math.max(0, 1 - dt * 2);
    const s = Math.sin(st.angle), c = Math.cos(st.angle);
    ball.x = p.x + (plane === 'x' ? s * Ln : 0);
    ball.z = p.z + (plane === 'z' ? s * Ln : 0);
    ball.y = p.y - c * Ln;
    const side = Math.sign(st.angle);
    if (side !== prevSide && side !== 0 && prevSide !== 0 && level.player && Math.hypot(level.player.pos.x - p.x, level.player.pos.z - p.z) < 10) w7Sfx(level, 'pendel');
    prevSide = side || prevSide;
    hurtFigures(level, (f) => { if (sphereTouches(f, ball.x, ball.y, ball.z, R * 0.92)) { st.hits++; return true; } return false; }, { pos: ball });
  });
  if (!level.view) return handle;
  const root = new THREE.Group();
  root.name = 'pendelstachel';
  root.position.set(p.x, p.y, p.z);
  if (plane === 'z') root.rotation.y = -Math.PI / 2;   // lokal schwingt entlang X
  const swing = new THREE.Group();
  root.add(swing);
  let model = null;
  if (hasModel('pendelstachel')) {
    model = getModel('pendelstachel', { length: Ln, radius: R });
    swing.add(model.root);
  } else {
    const [dk, hi] = (PCOL[spec.color] ?? PCOL.eisen).map((c) => lin(c));
    const parts = [];
    // Kette aus Gliedern (abwechselnd gedreht)
    const nl = Math.max(3, Math.floor((Ln - R) / 0.28));
    for (let i = 0; i < nl; i++) {
      const g = new THREE.TorusGeometry(0.1, 0.035, 5, 8);
      if (i % 2) g.rotateY(Math.PI / 2);
      g.rotateX(Math.PI / 2 * 0);
      g.scale(1, 1.5, 1);
      g.translate(0, -0.15 - i * ((Ln - R - 0.1) / nl), 0);
      parts.push(colorize(g.toNonIndexed(), (q, n, o) => mixc(dk, hi, smooth(-0.6, 0.8, n.x * 0.5 + n.y * 0.5), o)));
    }
    const b = new THREE.IcosahedronGeometry(R, 2);
    b.translate(0, -Ln, 0);
    parts.push(colorize(b.index ? b.toNonIndexed() : b, (q, n, o) => mixc(dk, hi, smooth(-0.7, 0.9, n.y * 0.6 + n.z * 0.4), o)));
    const spike = lin(0xf0f0f6), spikeD = lin(0x8a8a98);
    const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [0.7, 0.7, 0], [-0.7, 0.7, 0], [0.7, -0.7, 0], [-0.7, -0.7, 0], [0, 0.7, 0.7], [0, -0.7, 0.7], [0, 0.7, -0.7], [0, -0.7, -0.7], [0.7, 0, 0.7], [-0.7, 0, 0.7], [0.7, 0, -0.7], [-0.7, 0, -0.7]];
    const up = new THREE.Vector3(0, 1, 0);
    for (const d of dirs) {
      const v = new THREE.Vector3(...d).normalize();
      const c = new THREE.ConeGeometry(R * 0.2, R * 0.55, 6);
      c.translate(0, R + R * 0.22, 0);
      c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, v));
      c.translate(0, -Ln, 0);
      parts.push(colorize(c.toNonIndexed(), (q, n, o) => mixc(spikeD, spike, smooth(-0.4, 0.9, n.y * 0.5 + n.z * 0.5), o)));
    }
    const mesh = new THREE.Mesh(merge(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.35 }));
    mesh.castShadow = true;
    swing.add(mesh);
  }
  if (spec.mount !== false) {
    const g = new THREE.BoxGeometry(1.1, 0.3, 0.5);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x4a3c44, roughness: 0.7 }));
    m.position.y = 0.12;
    m.castShadow = true;
    root.add(m);
  }
  const holder = {};
  addObject(level, root, (dt) => {
    const d = visDt(level, holder, dt);
    swing.rotation.z = st.angle;   // lokal: +Winkel → Kugel nach +X (Rotation um +Z hebt −Y nach +X)
    model?.update?.(d, { angle: st.angle });
  });
  return handle;
}

// =====================================================================================================================
// Klappstampfer
// =====================================================================================================================

const KSTYLE = {
  stein: { body: 0x8e8698, hi: 0xc8c0d2, dark: 0x4a4458, face: 0x221e2a },
  metall: { body: 0x6e7888, hi: 0xc0c8d6, dark: 0x343c4a, face: 0x161a22 },
  holz: { body: 0xa87444, hi: 0xdcac70, dark: 0x5a3a1e, face: 0x2a1a10 },
};

export function buildKlappstampfer(level, spec) {
  const p = v3(spec.pos);
  const W = spec.width ?? 3, Ln = spec.length ?? 4, Th = spec.thick ?? 0.6;
  const dv = Array.isArray(spec.dir) ? spec.dir : [0, 1];
  const dl = Math.hypot(dv[0], dv[1]) || 1;
  // auf das 90°-Raster runden
  const fx = Math.abs(dv[0]) >= Math.abs(dv[1]) ? Math.sign(dv[0]) : 0, fz = fx ? 0 : Math.sign(dv[1] / dl) || 1;
  const ax = { x: fx, z: fz };                 // Klapprichtung
  const cr = { x: -fz, z: fx };                // quer (rechts von der Klapprichtung)
  const spikes = spec.spikes !== false;
  const damage = spec.damage === 'tod' ? 'tod' : 'treffer';
  const mode = spec.mode ?? 'takt';
  const T = { wait: spec.wait ?? 2.4, warn: Math.max(0, spec.warn ?? 0.9), fall: spec.fall ?? 0.32, hold: spec.hold ?? 1.2, up: spec.up ?? 1.4 };
  const plan = cycle([{ name: 'oben', t: Math.max(0, T.wait - T.warn) }, { name: 'warn', t: T.warn }, { name: 'faellt', t: T.fall }, { name: 'liegt', t: T.hold }, { name: 'hebt', t: T.up }], spec.phase ?? 0);
  const hole = Array.isArray(spec.hole) ? spec.hole : null;
  const st = { state: 'oben', fold: 0, running: !spec.idle && mode === 'takt', fireT: -1, slams: 0, hits: 0, warnK: 0 };
  // lokale Lage (u quer, v entlang der Klapprichtung) → Welt
  const W2 = (u, v) => ({ x: p.x + cr.x * u + ax.x * v, z: p.z + cr.z * u + ax.z * v });
  const rect = (u0, u1, v0, v1) => {
    const a = W2(u0, v0), b = W2(u1, v1);
    return { x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), z0: Math.min(a.z, b.z), z1: Math.max(a.z, b.z) };
  };
  const foot = rect(-W / 2, W / 2, 0, Ln);
  const sids = [];
  const clear = () => { for (const id of sids) level.world.remove(id); sids.length = 0; };
  const add = (r, y0, y1, tag) => sids.push(level.world.add({ type: 'box', min: [r.x0, y0, r.z0], max: [r.x1, y1, r.z1], tag, owner: handle, camIgnore: true }));
  const upright = () => { clear(); add(rect(-W / 2, W / 2, -Th, 0), p.y, p.y + Ln, 'klappstampfer'); };
  const flat = () => {
    clear();
    if (!hole) { add(foot, p.y, p.y + Th, 'klappstampfer'); return; }
    const [u0, u1, v0, v1] = hole;
    // Platte um das Loch: bis zu vier Quader
    if (v0 > 0.02) add(rect(-W / 2, W / 2, 0, v0), p.y, p.y + Th, 'klappstampfer');
    if (v1 < Ln - 0.02) add(rect(-W / 2, W / 2, v1, Ln), p.y, p.y + Th, 'klappstampfer');
    if (u0 > -W / 2 + 0.02) add(rect(-W / 2, u0, v0, v1), p.y, p.y + Th, 'klappstampfer');
    if (u1 < W / 2 - 0.02) add(rect(u1, W / 2, v0, v1), p.y, p.y + Th, 'klappstampfer');
  };
  const inHole = (f) => {
    if (!hole) return false;
    const dx = f.pos.x - p.x, dz = f.pos.z - p.z;
    const u = dx * cr.x + dz * cr.z, v = dx * ax.x + dz * ax.z;
    return u - f.half.x > hole[0] - 0.05 && u + f.half.x < hole[1] + 0.05 && v - f.half.z > hole[2] - 0.05 && v + f.half.z < hole[3] + 0.05;
  };
  const under = (f) => f.pos.x + f.half.x > foot.x0 && f.pos.x - f.half.x < foot.x1 && f.pos.z + f.half.z > foot.z0 && f.pos.z - f.half.z < foot.z1 && f.pos.y < p.y + Th + 0.6 && f.pos.y > p.y - 1.5;
  const handle = {
    get state() { return st.state; }, get fold() { return st.fold; }, get slams() { return st.slams; }, get hits() { return st.hits; },
    get hint() { return !!hint?.shown; },
    start() { if (mode === 'takt') st.running = true; else handle.fire(); }, stop() { st.running = false; },
    fire() { if (st.fireT < 0) st.fireT = 0; },
    footprint: () => ({ ...foot, y: p.y }),
    info: () => ({ state: st.state, fold: +st.fold.toFixed(2), slams: st.slams, hits: st.hits }),
  };
  upright();
  if (spec.id) level.named.set(spec.id, handle);
  w7(level).stompers.push(handle);
  const hint = spec.hint !== false ? landingHint(level, { color: 0xff2a2a }) : null;
  const slam = () => {
    st.slams++;
    w7Sfx(level, 'klapp');
    level.shake(0.4);
    level.effects?.dust({ x: (foot.x0 + foot.x1) / 2, y: p.y + 0.1, z: (foot.z0 + foot.z1) / 2 }, 12, 1.6);
    for (const f of figures(level)) {
      if (f.dead || f.mode === 'script' || !under(f) || inHole(f)) continue;
      if (damage === 'tod') { st.hits++; f.die('crush'); continue; }
      st.hits++;
      if (!f.invulnerable) f.hurt({ pos: { x: f.pos.x - ax.x, y: p.y, z: f.pos.z - ax.z } });
      // aus der Platte heraus nach oben schieben (steht danach auf ihr)
      f.pos.y = Math.max(f.pos.y, p.y + Th + 0.02);
    }
    // Gegner unter der Platte
    for (const e of level.entities) {
      if (!e.enemy || !e.alive || e.removed || e.defeated) continue;
      if (e.pos.x + e.half.x > foot.x0 && e.pos.x - e.half.x < foot.x1 && e.pos.z + e.half.z > foot.z0 && e.pos.z - e.half.z < foot.z1 && Math.abs(e.pos.y - p.y) < 1) e.onHit?.('crush', handle);
    }
    flat();
    runAction(level, spec.onSlam, { pos: [(foot.x0 + foot.x1) / 2, p.y + Th, (foot.z0 + foot.z1) / 2], source: handle });
  };
  const near = () => figures(level).some((f) => f.pos.x > foot.x0 - (spec.near ?? 1.5) && f.pos.x < foot.x1 + (spec.near ?? 1.5) && f.pos.z > foot.z0 - (spec.near ?? 1.5) && f.pos.z < foot.z1 + (spec.near ?? 1.5) && Math.abs(f.pos.y - p.y) < 2);
  level.onStep((dt, time) => {
    let ph;
    if (mode === 'takt') ph = st.running ? plan.at(time) : { name: 'oben', u: 0 };
    else {
      if (mode === 'nah' && st.fireT < 0 && near()) st.fireT = 0;
      if (st.fireT >= 0) {
        st.fireT += dt;
        const u = T.wait - T.warn + st.fireT;
        ph = plan.at(u - (spec.phase ?? 0));
        if (st.fireT >= T.warn + T.fall + T.hold + T.up) { st.fireT = -1; ph = { name: 'oben', u: 0 }; }
      } else ph = { name: 'oben', u: 0 };
    }
    const prev = st.state;
    if (ph.name !== prev) {
      if (ph.name === 'warn') w7Sfx(level, 'rumble');
      if (ph.name === 'faellt') clear();
      if (ph.name === 'liegt') slam();
      if (ph.name === 'hebt') clear();
      if (ph.name === 'oben' && prev !== 'warn') upright();
    }
    st.state = ph.name;
    st.warnK = ph.name === 'warn' ? ph.u : 0;
    st.fold = ph.name === 'faellt' ? ph.u * ph.u : ph.name === 'liegt' ? 1 : ph.name === 'hebt' ? 1 - ease(ph.u) : 0;
    if (hint) {
      if (ph.name === 'warn' || ph.name === 'faellt') hint.show([foot], p.y, ph.name === 'faellt' ? 1 : 0.35 + 0.65 * st.warnK);
      else hint.hide();
    }
  });

  if (!level.view) return handle;
  // ---------------- Darstellung: Platte dreht um die Scharnierkante (lokal: Klapprichtung +X, aufrecht +Y)
  const root = new THREE.Group();
  root.name = 'klappstampfer';
  root.position.set(p.x, p.y, p.z);
  root.rotation.y = Math.atan2(-ax.z, ax.x);
  const hinge = new THREE.Group();
  root.add(hinge);
  let model = null, mat = null;
  if (hasModel('klappstampfer')) {
    model = getModel('klappstampfer', { width: W, length: Ln, thick: Th, spikes });
    root.add(model.root);
  } else {
    const S = KSTYLE[spec.style] ?? KSTYLE.stein;
    const body = lin(S.body), hi = lin(S.hi), dark = lin(S.dark), face = lin(S.face);
    const parts = [];
    // aufrecht: Platte von x = −Th … 0, y = 0 … Ln, z = −W/2 … W/2; Stoßseite = +X
    const g = new THREE.BoxGeometry(Th, Ln, W, 1, 4, 3);
    g.translate(-Th / 2, Ln / 2, 0);
    parts.push(colorize(g.toNonIndexed(), (q, n, o) => {
      mixc(dark, body, smooth(-0.8, 0.6, n.y * 0.4 - n.x * 0.5 + 0.3), o);
      const seam = Math.abs(((q.y + 10) % 1) - 0.5) < 0.03 || Math.abs(((q.z + 10.25) % 1.5) - 0.75) < 0.03;
      if (seam) mixc(o, dark, 0.6, o);
      if (n.x < -0.5) mixc(o, hi, 0.25, o);
    }));
    if (hole) {
      // Loch als dunkle Fläche auf beiden Seiten (Kollision hat das echte Loch)
      const [u0, u1, v0, v1] = hole;
      for (const sx of [0.012, -Th - 0.012]) {
        const hg = new THREE.PlaneGeometry(u1 - u0, v1 - v0);
        hg.rotateY(sx > 0 ? Math.PI / 2 : -Math.PI / 2);
        hg.translate(sx, (v0 + v1) / 2, (u0 + u1) / 2);
        parts.push(colorize(hg.toNonIndexed(), (q, n, o) => { o[0] = face[0] * 0.6; o[1] = face[1] * 0.6; o[2] = face[2] * 0.6; }));
      }
    }
    if (spikes) {
      const sp = lin(0xf2f2f8), spD = lin(0x8a8a9a);
      const nu = Math.max(2, Math.round(W / 0.55)), nv = Math.max(2, Math.round(Ln / 0.55));
      for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
        const z = -W / 2 + (i + 0.5) * (W / nu), y = (j + 0.5) * (Ln / nv);
        if (hole && z > hole[0] && z < hole[1] && y > hole[2] && y < hole[3]) continue;
        const c = new THREE.ConeGeometry(0.16, 0.38, 5);
        c.rotateZ(-Math.PI / 2);
        c.translate(0.19, y, z);
        parts.push(colorize(c.toNonIndexed(), (q, n, o) => mixc(spD, sp, smooth(-0.4, 0.9, n.y * 0.5 + n.x * 0.5), o)));
      }
    } else if (spec.face !== false) {
      // grimmiges Gesicht auf der Stoßseite
      for (const s of [-1, 1]) {
        const eye = new THREE.BoxGeometry(0.05, Ln * 0.12, W * 0.16); eye.translate(0.01, Ln * 0.62, s * W * 0.2);
        parts.push(colorize(eye.toNonIndexed(), (q, n, o) => { o[0] = 1; o[1] = 1; o[2] = 1; }));
      }
      const m = new THREE.BoxGeometry(0.05, Ln * 0.08, W * 0.5); m.translate(0.01, Ln * 0.3, 0);
      parts.push(colorize(m.toNonIndexed(), (q, n, o) => { o[0] = face[0]; o[1] = face[1]; o[2] = face[2]; }));
    }
    // Scharnier-Rolle
    const hr = new THREE.CylinderGeometry(0.16, 0.16, W + 0.3, 8);
    hr.rotateX(Math.PI / 2); hr.translate(-Th / 2, 0.12, 0);
    parts.push(colorize(hr.toNonIndexed(), (q, n, o) => mixc(dark, hi, smooth(-1, 1, n.y), o)));
    mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.15, emissive: 0xff2a1a, emissiveIntensity: 0 });
    const mesh = new THREE.Mesh(merge(parts), mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    hinge.add(mesh);
  }
  const holder = {};
  let t = 0;
  addObject(level, root, (dt) => {
    const d = visDt(level, holder, dt);
    t += d;
    // Drehung um die Scharnierkante (lokal Z) – liegend zeigt die Stoßseite (+X) nach unten
    hinge.rotation.z = -st.fold * Math.PI / 2;
    const sh = st.state === 'warn' ? 0.03 * (0.5 + st.warnK) : 0;
    root.position.set(p.x + Math.sin(t * 61) * sh, p.y, p.z + Math.cos(t * 53) * sh);
    if (mat) mat.emissiveIntensity = st.state === 'warn' ? 0.15 + 0.2 * Math.sin(t * 22) * st.warnK + 0.1 : 0;
    model?.update?.(d, { fold: st.fold, warn: st.warnK });
  });
  return handle;
}

export const TYPES = { pendelstachel: buildPendelstachel, klappstampfer: buildKlappstampfer };
