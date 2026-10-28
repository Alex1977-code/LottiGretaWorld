// Welt-7-Bausteine Plattformen: Pfeilplattform, Zylinder (Laufwalze) und rotierende Stachelwalze (Präzisierung Motor und
// Bausteine Welt 7).
//
// pfeilplattform – Plattform mit Pfeil, die aus der Lava (oder aus einer Wand) auftaucht, eine Weile bleibt und wieder
//   versinkt (Bauplan 7-4 „Pfeilplattformen tauchen auf und versinken“, „Pfeilplattformen aus Wänden“, „3 Schubser besiegen
//   → 3 Pfeilplattformen zum Ziel“). Der Pfeil zeigt, wohin die Reihe weitergeht. Vorwarnung: vor dem Auftauchen glüht und
//   brodelt die Stelle (bzw. staubt der Wandschlitz), vor dem Versinken blinkt der Pfeil rot und die Platte zittert. Wer beim
//   Versinken darauf steht, fährt mit hinab (in die Lava); an der Wand schiebt die Wand die Figur von der Platte.
//   { type: 'pfeilplattform', id, pos: [x, y, z] (Mitte der Unterseite in ausgefahrener Lage), size: [3, 0.5, 3],
//     from: 'lava' | 'wand', depth: size.y + 1.2 (m unter der Ausfahr-Lage, lava), dir: [dx, dz] (wand: Ausfahr-Richtung aus
//     der Wand; Standard [0, 1]), travel: Ausdehnung entlang dir (wand), arrow: [dx, dz] (Pfeil; Standard dir bzw. [0, −1]),
//     mode: 'takt' | 'signal' (reveal()/start() = auftauchen und bleiben, hide()/stop() = versinken) | 'immer',
//     wait: 2 (s versunken), warn: 0.8, out: 0.6, up: 3.2 (s oben), blink: 0.9 (Vorwarnung vor dem Versinken, Teil von up),
//     in: 0.7, phase: 0 (s Versatz; Reihen: phase je Platte versetzen), move: 0 (m – oben gleitet sie so weit in
//     Pfeilrichtung), hidden: (signal: Standard true), style: 'stein' | 'blau' | 'metall', color }
//   level.named.get(id) = { state ('weg'|'warn'|'kommt'|'oben'|'blinkt'|'geht'), k (0 weg … 1 oben), carries(fig),
//                           reveal(), hide(), start(), stop(), info() }; w7(level).arrows
//   Modell aus der Registry 'pfeilplattform' ({ size: [w, h, d] }, Ursprung Mitte der Unterseite, Pfeil +X; state { rise, warn })
//   – sonst eigene Platte mit leuchtendem Pfeil.
//
// zylinder – großer liegender Zylinder, der sich dreht; man läuft oben darauf (Bauplan 7-4 „Zylinderzone“). Die Oberfläche
//   läuft wie ein Förderband (Mitnahme), zu den Seiten wird er steil (Abrutschen). Mit spikes > 0 trägt er Stachelreihen,
//   die mitdrehen und bei Berührung verletzen (rechtzeitig darüber springen).
//   { type: 'zylinder', id, pos: [x, y, z] (Mitte der Achse), radius: 2.5, length: 8, axis: 'x' | 'z' (Achse entlang),
//     speed: 0.6 (rad/s; + = Oberseite läuft bei axis 'x' zur Kamera (+Z), bei axis 'z' nach +X), slice: 0.3 (m Rampen-
//     streifen der Kollision), spikes: 0 (Stachelreihen), spikeLen: 0.5, angle: 0 (rad Lage der ersten Reihe; 0 = oben),
//     style: 'stein' | 'blau' | 'rot' | 'metall', ends: true (Endscheiben mit Nabe), idle: false }
//   level.named.get(id) = { angle, speed, hits, start(), stop(), reverse(), spikeAt(i) → { u, v }, info() }; w7(level).rollers
//   Modell aus der Registry 'zylinder_walze' ({ radius, length, spikes }, Ursprung Achsmitte, Achse entlang X; state { angle })
//   – sonst eigene Walze (gestreift, damit die Drehung sichtbar ist).
// stachelwalze_rot – rotierende Stachelwalze (Bauplan 7-3/7-4 „Stachelwalzen“, „rotierende Stachelwalzen“): ein zylinder mit
//   Stachelreihen und kleinerem Radius – gleiche Felder wie zylinder, Standard radius 1.1, length 6, spikes 4,
//   speed 1.4, style 'rot'. Modell 'stachelwalze_rot' (state { angle }).

import * as THREE from 'three';
import { v3, sz3, addObject, lin, mixc, smooth, colorize, merge } from '../kit.js';
import { MovingBox } from '../w2kit.js';
import { visDt, runAction } from '../../entities/gimmick.js';
import { hasModel, getModel } from '../../models/index.js';
import { w7, figures, hurtFigures, sphereTouches, w7Sfx, lavaTopAt, lavaColorAt, LAVA_PAL, glowTexture, cycle, ease, clamp, TAU } from '../w7kit.js';

// =====================================================================================================================
// Pfeilplattform
// =====================================================================================================================

const PSTYLE = {
  stein: { body: 0x8a7a86, top: 0xb8a8b2, dark: 0x4a3c46, arrow: 0xffd23a },
  blau: { body: 0x4a5a9a, top: 0x8aa0e0, dark: 0x262e5a, arrow: 0x9af0ff },
  metall: { body: 0x7a8494, top: 0xb8c2d0, dark: 0x3a4250, arrow: 0xffd23a },
};

function arrowShape() {
  const s = new THREE.Shape();
  s.moveTo(0.5, 0); s.lineTo(0.02, 0.42); s.lineTo(0.02, 0.18); s.lineTo(-0.48, 0.18); s.lineTo(-0.48, -0.18); s.lineTo(0.02, -0.18); s.lineTo(0.02, -0.42); s.closePath();
  return s;
}

export function buildPfeilplattform(level, spec) {
  const p = v3(spec.pos), s = sz3(spec.size, [3, 0.5, 3]);
  const from = spec.from === 'wand' ? 'wand' : 'lava';
  const mode = spec.mode ?? 'takt';
  const dv = Array.isArray(spec.dir) ? spec.dir : [0, 1];
  const dl = Math.hypot(dv[0], dv[1]) || 1;
  const dir = { x: dv[0] / dl, z: dv[1] / dl };
  const av = Array.isArray(spec.arrow) ? spec.arrow : from === 'wand' ? [dir.x, dir.z] : [0, -1];
  const al = Math.hypot(av[0], av[1]) || 1;
  const arrow = { x: av[0] / al, z: av[1] / al };
  const depth = spec.depth ?? s.y + 1.2;
  const travel = spec.travel ?? (Math.abs(dir.x) > Math.abs(dir.z) ? s.x : s.z);
  const T = { wait: spec.wait ?? 2, warn: Math.max(0, spec.warn ?? 0.8), out: spec.out ?? 0.6, up: spec.up ?? 3.2, blink: spec.blink ?? 0.9, in: spec.in ?? 0.7 };
  const plan = cycle([
    { name: 'weg', t: Math.max(0, T.wait - T.warn) }, { name: 'warn', t: T.warn }, { name: 'kommt', t: T.out },
    { name: 'oben', t: Math.max(0, T.up - T.blink) }, { name: 'blinkt', t: T.blink }, { name: 'geht', t: T.in },
  ], spec.phase ?? 0);
  const move = spec.move ?? 0;
  const startHidden = mode === 'signal' ? spec.hidden !== false : false;
  const st = { state: startHidden ? 'weg' : mode === 'immer' ? 'oben' : 'weg', k: startHidden || mode === 'takt' ? 0 : 1, want: !startHidden, warnK: 0, sig: null, moveK: 0 };
  const offAt = (k) => (from === 'lava' ? { x: 0, y: -depth * (1 - k), z: 0 } : { x: -dir.x * travel * (1 - k), y: 0, z: -dir.z * travel * (1 - k) });
  const o0 = offAt(st.k);
  const mb = new MovingBox(level, p.x + o0.x, p.y + o0.y, p.z + o0.z, s.x, s.y, s.z, { tag: 'pfeilplattform', solid: st.k > 0.05 });
  const handle = {
    get state() { return st.state; }, get k() { return st.k; }, mb, from,
    carries: (f) => mb.carries(f),
    reveal() { if (mode !== 'signal' || st.want) return; st.want = true; st.sig = { name: 'warn', t: 0 }; },
    hide() { if (mode !== 'signal' || !st.want) return; st.want = false; st.sig = { name: 'blinkt', t: 0 }; },
    start() { handle.reveal(); }, stop() { handle.hide(); },
    info: () => ({ state: st.state, k: +st.k.toFixed(2), y: +mb.pos.y.toFixed(2), x: +mb.pos.x.toFixed(2), z: +mb.pos.z.toFixed(2), solid: mb.on }),
  };
  mb.shape.owner = handle;
  if (spec.id) level.named.set(spec.id, handle);
  w7(level).arrows.push(handle);
  const lavaY = () => lavaTopAt(level, p.x, p.z, p.y + 1) ?? p.y - 0.4;

  level.onStep((dt, time) => {
    let name, u;
    if (mode === 'takt') ({ name, u } = plan.at(time));
    else if (mode === 'immer') { name = 'oben'; u = 1; }
    else {
      // signal: Ablauf warn → kommt → oben (bleibt) bzw. blinkt → geht → weg (bleibt)
      const sg = st.sig;
      if (!sg) { name = st.want ? 'oben' : 'weg'; u = 1; }
      else {
        sg.t += dt;
        const D = { warn: T.warn, kommt: T.out, blinkt: T.blink, geht: T.in }[sg.name];
        u = D > 0 ? Math.min(1, sg.t / D) : 1;
        name = sg.name;
        if (sg.t >= D) {
          const next = { warn: 'kommt', kommt: null, blinkt: 'geht', geht: null }[sg.name];
          st.sig = next ? { name: next, t: 0 } : null;
        }
      }
    }
    if (name !== st.state) {
      if (name === 'kommt') { w7Sfx(level, 'pfeil'); level.effects?.sparks({ x: p.x, y: from === 'lava' ? lavaY() + 0.2 : p.y + s.y / 2, z: p.z }, 8); }
      if (name === 'geht') w7Sfx(level, 'rumble');
      if (name === 'oben' && st.state === 'kommt') runAction(level, spec.onUp, { pos: [p.x, p.y + s.y, p.z], source: handle });
    }
    st.state = name;
    st.warnK = name === 'warn' ? u : name === 'blinkt' ? u : 0;
    const k = name === 'kommt' ? ease(u) : name === 'oben' || name === 'blinkt' ? 1 : name === 'geht' ? 1 - ease(u) : 0;
    st.k = k;
    st.moveK = move ? (name === 'oben' ? ease(u) : name === 'blinkt' || name === 'geht' ? 1 : 0) : 0;
    const o = offAt(k);
    const mx = arrow.x * move * st.moveK, mz = arrow.z * move * st.moveK;
    const shake = name === 'blinkt' ? Math.sin(time * 70) * 0.02 : 0;
    mb.setSolid(k > 0.05);
    mb.moveTo(p.x + o.x + mx + shake, p.y + o.y, p.z + o.z + mz, dt);
  });

  if (!level.view) return handle;
  // ---------------- Darstellung
  const S = PSTYLE[spec.style] ?? PSTYLE[lavaColorAt(level, p.x, p.z) === 'blau' ? 'blau' : 'stein'];
  const root = new THREE.Group();
  root.name = 'pfeilplattform';
  const inner = new THREE.Group();
  root.add(inner);
  let model = null, arrowMat = null;
  if (hasModel('pfeilplattform')) {
    model = getModel('pfeilplattform', { size: [s.x, s.y, s.z] });
    model.root.rotation.y = Math.atan2(-arrow.z, arrow.x);
    inner.add(model.root);
  } else {
    const body = lin(S.body), top = lin(S.top), dark = lin(S.dark);
    const g = new THREE.BoxGeometry(s.x, s.y, s.z, 2, 1, 2);
    g.translate(0, s.y / 2, 0);
    const parts = [colorize(g.toNonIndexed(), (q, n, o) => {
      if (n.y > 0.5) { const e = Math.min(s.x / 2 - Math.abs(q.x), s.z / 2 - Math.abs(q.z)); mixc(body, top, smooth(0, 0.25, e), o); }
      else if (n.y < -0.5) { o[0] = dark[0]; o[1] = dark[1]; o[2] = dark[2]; }
      else mixc(dark, body, smooth(0, s.y, q.y), o);
    })];
    // Unterbau (Säulenstumpf, verschwindet in Lava/Wand)
    const stem = from === 'lava' ? new THREE.BoxGeometry(s.x * 0.62, depth, s.z * 0.62) : new THREE.BoxGeometry(Math.abs(dir.x) > 0.5 ? travel : s.x * 0.9, s.y * 0.8, Math.abs(dir.z) > 0.5 ? travel : s.z * 0.9);
    if (from === 'lava') stem.translate(0, -depth / 2, 0); else stem.translate(-dir.x * travel / 2, s.y * 0.45, -dir.z * travel / 2);
    parts.push(colorize(stem.toNonIndexed(), (q, n, o) => mixc(dark, body, 0.35 + 0.3 * smooth(-1, 1, n.y), o)));
    const mesh = new THREE.Mesh(merge(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }));
    mesh.castShadow = true; mesh.receiveShadow = true;
    inner.add(mesh);
    const ag = new THREE.ShapeGeometry(arrowShape());
    ag.rotateX(-Math.PI / 2);
    const k = Math.min(s.x, s.z) * 0.8;
    ag.scale(k, 1, k);
    ag.rotateY(Math.atan2(-arrow.z, arrow.x));
    ag.translate(0, s.y + 0.015, 0);
    arrowMat = new THREE.MeshBasicMaterial({ color: S.arrow, toneMapped: false });
    inner.add(new THREE.Mesh(ag, arrowMat));
  }
  // Vorwarnung an der Austrittsstelle: Glühen auf der Lava bzw. Staub am Wandschlitz
  const pal = LAVA_PAL[lavaColorAt(level, p.x, p.z)];
  const warnGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTexture(), color: from === 'lava' ? pal.hi : 0xffe0b0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  if (from === 'lava') warnGlow.rotation.x = -Math.PI / 2; else warnGlow.rotation.y = Math.atan2(dir.x, dir.z);
  warnGlow.renderOrder = 2;
  root.add(warnGlow);
  const arrowCol = new THREE.Color(S.arrow), red = new THREE.Color(0xff3a2a);
  const holder = {};
  let t = 0;
  const lv = from === 'lava' ? lavaY() : 0;
  addObject(level, root, (dt) => {
    const d = visDt(level, holder, dt);
    t += d;
    root.position.set(0, 0, 0);
    inner.position.set(mb.pos.x, mb.pos.y, mb.pos.z);
    inner.visible = st.k > 0.01 || st.state === 'warn';
    const wk = st.state === 'warn' ? st.warnK : 0;
    warnGlow.material.opacity = wk * (0.55 + 0.45 * Math.sin(t * 20));
    const gs = Math.max(s.x, s.z) * (1.4 + wk * 0.6);
    warnGlow.scale.set(gs, gs, 1);
    if (from === 'lava') warnGlow.position.set(p.x, lv + 0.05, p.z);
    else warnGlow.position.set(p.x - dir.x * (travel - 0.05), p.y + s.y / 2, p.z - dir.z * (travel - 0.05));
    const blink = st.state === 'blinkt' && Math.sin(t * 26) > 0;
    if (arrowMat) arrowMat.color.copy(blink ? red : arrowCol);
    model?.update?.(d, { rise: st.k, warn: st.state === 'blinkt' ? 1 : wk });
  });
  return handle;
}

// =====================================================================================================================
// Zylinder / Stachelwalze
// =====================================================================================================================

const ZSTYLE = {
  stein: { a: 0xb8a89a, b: 0x8a7a70, end: 0x5a4c48, hub: 0xffc040, spike: 0xe8e8f0 },
  blau: { a: 0x8a9ae0, b: 0x5a6ab0, end: 0x2a3060, hub: 0x9af0ff, spike: 0xe8f0ff },
  rot: { a: 0xe0503a, b: 0xa82a20, end: 0x5a1410, hub: 0xffd23a, spike: 0xf4f0f0 },
  metall: { a: 0xb8c0cc, b: 0x7a8494, end: 0x3a4250, hub: 0xffc040, spike: 0xf0f0f6 },
};

function buildRoller(level, spec, kind) {
  const isSpiky = kind === 'stachelwalze_rot';
  const p = v3(spec.pos);
  const R = spec.radius ?? (isSpiky ? 1.1 : 2.5), L = spec.length ?? (isSpiky ? 6 : 8);
  const axis = spec.axis === 'z' ? 'z' : 'x';
  const rows = Math.max(0, Math.round(spec.spikes ?? (isSpiky ? 4 : 0)));
  const sLen = spec.spikeLen ?? 0.5;
  const st = { angle: spec.angle ?? 0, speed: spec.speed ?? (isSpiky ? 1.4 : 0.6), running: !spec.idle, hits: 0 };
  // Querachse (senkrecht zur Achse, waagerecht): u; bei axis 'x' ist u = z, bei axis 'z' ist u = x
  // Drehsinn: + = Oberseite läuft nach +u
  const step = spec.slice ?? 0.3;
  const n = Math.max(4, Math.round((2 * R) / step));
  const w = (2 * R) / n;
  const slices = [];
  const cu = axis === 'x' ? p.z : p.x;
  for (let i = 0; i < n; i++) {
    const u0 = -R + i * w, u1 = u0 + w;
    const h0 = Math.sqrt(Math.max(0, R * R - u0 * u0)), h1 = Math.sqrt(Math.max(0, R * R - u1 * u1));
    const hi = Math.max(h0, h1), lo = Math.min(h0, h1);
    const um = (u0 + u1) / 2, hm = Math.sqrt(Math.max(0, R * R - um * um));
    const bot = -Math.max(0.2, hm);
    const conv = { x: 0, z: 0 };
    const shape = axis === 'x'
      ? { type: 'ramp', axis: 'z', dir: h1 >= h0 ? 1 : -1, min: [p.x - L / 2, p.y + bot, cu + u0], max: [p.x + L / 2, p.y + hi, cu + u1], low: p.y + lo, conveyor: conv, tag: kind, noWallSlide: true }
      : { type: 'ramp', axis: 'x', dir: h1 >= h0 ? 1 : -1, min: [cu + u0, p.y + bot, p.z - L / 2], max: [cu + u1, p.y + hi, p.z + L / 2], low: p.y + lo, conveyor: conv, tag: kind, noWallSlide: true };
    // Oberflächen-Tempo in u-Richtung: ω·R·cos θ, θ = asin(u/R)
    const cosT = hm / R;
    slices.push({ shape, conv, cosT, id: level.world.add(shape) });
  }
  const setConv = () => {
    for (const sl of slices) {
      const v = st.running ? st.speed * R * sl.cosT : 0;
      if (axis === 'x') { sl.conv.x = 0; sl.conv.z = v; } else { sl.conv.x = v; sl.conv.z = 0; }
    }
  };
  setConv();
  const handle = {
    get angle() { return st.angle; }, get speed() { return st.speed; }, get hits() { return st.hits; }, kind,
    start() { st.running = true; setConv(); }, stop() { st.running = false; setConv(); }, reverse() { st.speed = -st.speed; setConv(); },
    // Lage der Stachelreihe i im Querschnitt: u (quer, + = Laufrichtung der Oberseite), v (oben)
    spikeAt: (i) => { const a = st.angle + (i * TAU) / Math.max(1, rows); return { u: Math.sin(a), v: Math.cos(a) }; },
    info: () => ({ angle: +st.angle.toFixed(3), speed: st.speed, rows, hits: st.hits, running: st.running }),
  };
  for (const sl of slices) sl.shape.owner = handle;
  if (spec.id) level.named.set(spec.id, handle);
  w7(level).rollers.push(handle);

  level.onStep((dt) => {
    if (st.running) st.angle += st.speed * dt;
    if (!rows) return;
    // Stachelreihen: drei Kugeln entlang des Stachels (Grund, Mitte, Spitze) gegen den Hüllquader der Figur
    hurtFigures(level, (f) => {
      const ax = axis === 'x' ? f.pos.x : f.pos.z;
      const ca = axis === 'x' ? p.x : p.z;
      const along = clamp(ax, ca - L / 2 + 0.15, ca + L / 2 - 0.15);
      for (let i = 0; i < rows; i++) {
        const a = st.angle + (i * TAU) / rows;
        const su = Math.sin(a), sv = Math.cos(a);
        for (const r of [R + 0.08, R + sLen * 0.55, R + sLen * 0.95]) {
          const uu = cu + su * r, yy = p.y + sv * r;
          const X = axis === 'x' ? along : uu, Z = axis === 'x' ? uu : along;
          if (sphereTouches(f, X, yy, Z, 0.2)) { st.hits++; return true; }
        }
      }
      return false;
    }, (f) => ({ pos: { x: axis === 'x' ? f.pos.x : p.x, y: p.y, z: axis === 'x' ? p.z : f.pos.z } }));
  });

  if (!level.view) return handle;
  // ---------------- Darstellung: Walze dreht um ihre Achse (eine Gruppe), Endscheiben mit Nabe
  const S = ZSTYLE[spec.style] ?? ZSTYLE[isSpiky ? 'rot' : lavaColorAt(level, p.x, p.z) === 'blau' ? 'blau' : 'stein'];
  const root = new THREE.Group();
  root.name = kind;
  root.position.set(p.x, p.y, p.z);
  if (axis === 'z') root.rotation.y = Math.PI / 2;   // lokal: Achse entlang X
  const spin = new THREE.Group();
  root.add(spin);
  const regName = isSpiky ? 'stachelwalze_rot' : 'zylinder_walze';
  let model = null;
  if (hasModel(regName)) {
    model = getModel(regName, { radius: R, length: L, spikes: rows, spikeLen: sLen });
    root.add(model.root);
  } else {
    const a = lin(S.a), b = lin(S.b), e = lin(S.end), hub = lin(S.hub);
    const parts = [];
    // Mantel aus 12 Streifen (abwechselnd hell/dunkel, scharf getrennt – die Drehung ist gut zu sehen), Ränder dunkel
    const NS = 12, light = mixc(a, [1, 1, 1], 0.12, [0, 0, 0]);
    for (let k = 0; k < NS; k++) {
      const st = new THREE.CylinderGeometry(R, R, L, 3, 1, true, (k / NS) * TAU, TAU / NS);
      st.rotateZ(Math.PI / 2);
      const col = k % 2 ? b : light;
      parts.push(colorize(st.toNonIndexed(), (q, nn, o) => { o[0] = col[0]; o[1] = col[1]; o[2] = col[2]; }));
    }
    for (const sx of [-1, 1]) {
      const ring = new THREE.CylinderGeometry(R * 1.015, R * 1.015, 0.3, 28, 1, true);
      ring.rotateZ(Math.PI / 2); ring.translate(sx * (L / 2 - 0.15), 0, 0);
      parts.push(colorize(ring.toNonIndexed(), (q, nn, o) => { o[0] = e[0]; o[1] = e[1]; o[2] = e[2]; }));
    }
    if (spec.ends !== false) {
      for (const sx of [-1, 1]) {
        const cap = new THREE.CylinderGeometry(R * 1.04, R * 1.04, 0.22, 28);
        cap.rotateZ(Math.PI / 2); cap.translate(sx * (L / 2 + 0.08), 0, 0);
        parts.push(colorize(cap.toNonIndexed(), (q, nn, o) => { o[0] = e[0]; o[1] = e[1]; o[2] = e[2]; }));
        const h = new THREE.CylinderGeometry(R * 0.32, R * 0.4, 0.3, 12);
        h.rotateZ(Math.PI / 2); h.translate(sx * (L / 2 + 0.24), 0, 0);
        parts.push(colorize(h.toNonIndexed(), (q, nn, o) => { o[0] = hub[0]; o[1] = hub[1]; o[2] = hub[2]; }));
        // Speichen-Muster auf der Endscheibe (zeigt die Drehung von der Seite)
        for (let k = 0; k < 4; k++) {
          const sp = new THREE.BoxGeometry(0.08, R * 1.7, 0.18);
          sp.rotateX((k * Math.PI) / 4); sp.translate(sx * (L / 2 + 0.2), 0, 0);
          parts.push(colorize(sp.toNonIndexed(), (q, nn, o) => { o[0] = hub[0] * 0.8; o[1] = hub[1] * 0.8; o[2] = hub[2] * 0.8; }));
        }
      }
    }
    if (rows) {
      const sp = lin(S.spike), spD = mixc(sp, [0.4, 0.4, 0.45], 0.5, [0, 0, 0]);
      const per = Math.max(2, Math.floor((L - 0.4) / 0.62));
      for (let i = 0; i < rows; i++) {
        const ang = (i * TAU) / rows;
        for (let j = 0; j < per; j++) {
          const x = -L / 2 + 0.3 + (j + 0.5) * ((L - 0.6) / per);
          const c = new THREE.ConeGeometry(0.2, sLen, 6);
          c.translate(0, R + sLen / 2 - 0.02, 0);
          c.rotateX(ang);
          c.translate(x, 0, 0);
          parts.push(colorize(c.toNonIndexed(), (q, nn, o) => mixc(spD, sp, smooth(-0.5, 0.8, nn.y), o)));
        }
      }
    }
    const mesh = new THREE.Mesh(merge(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.1 }));
    mesh.castShadow = true; mesh.receiveShadow = true;
    spin.add(mesh);
  }
  const holder = {};
  addObject(level, root, (dt) => {
    const d = visDt(level, holder, dt);
    // lokale Achse +X: positive Drehung um +X hebt +Y nach +Z → Oberseite läuft nach lokal +Z (= Welt +Z bei axis 'x',
    // Welt +X bei axis 'z' wegen rotation.y = π/2) – passt in beiden Fällen zur Mitnahme und zu den Stachel-Treffern
    const a = st.angle;
    spin.rotation.x = a;
    model?.update?.(d, { angle: a });
  });
  return handle;
}

export const buildZylinder = (level, spec) => buildRoller(level, spec, 'zylinder');
export const buildStachelwalzeRot = (level, spec) => buildRoller(level, spec, 'stachelwalze_rot');

export const TYPES = { pfeilplattform: buildPfeilplattform, zylinder: buildZylinder, stachelwalze_rot: buildStachelwalzeRot };
