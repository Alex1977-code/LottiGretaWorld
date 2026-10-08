// Level-Requisiten (Kurs-Modus). Eigene Gestaltung. Maßstab Meter, Ursprung = Fußpunkt (Ausnahmen genannt),
// Blick/Laufrichtung +X. state darf ein String sein ('on' ≙ { anim: 'on' }).
//
// pipe                Warp-Röhre, glänzend.  opts { height (Standard 2), radius (0,9), color (0x3cbf3a) }
//                     Oberkante bei y = height (Rand 0,45 m hoch, 0,12 m breiter), dunkles Inneres.  state –
// glass_pipe_segment  Glasröhre (durchsichtig, weiße Ringe an den Enden, Glanzstreifen).
//                     opts { length (4), radius (1,0), elbow: false|true (Viertelbogen nach +Z, Biegeradius 2·radius) }
//                     Ursprung = Achsmitte am Anfang, Achse entlang +X (gerade) bzw. Bogen von +X nach +Z.  state –
// beanstalk           Bohnenranke mit Blättern, Spirale oben.  opts { height (6) }
//                     state { anim: 'idle'|'grow', grow (0..1, Wuchshöhe; Standard 1) }  idle: wiegt sich leicht.
// trampoline          Sprungfeder Ø 1,2 m, 0,7 m hoch: rot-weißer Sockel, Feder, rotes Polster mit Stern.
//                     state { anim: 'idle'|'bounce', n? }  bounce: Polster federt ≈0,9 s nach (beim Wechsel/neuem n).
// boost_arrow         Boden-Pfeilfeld 2 × 1,4 m, Pfeile zeigen nach +X, Lauflicht.  opts { length (2), width (1,4) }
// switch_tile         Kipp-Schaltfeld 1,4 × 1,4 m: aus = blau mit weißem Ring, an = gold mit weißem Stern;
//                     klappt beim Wechsel um (0,3 s, mit Hüpfer).  state { anim: 'off'|'on' }
// lantern             Höhlen-Laterne 2 m (Pfosten) bzw. hängend.  opts { hanging: false|true (hängt an Kette von y = 2,4) }
//                     state { anim: 'off'|'on' }  on: warmes Leuchten, flackert.
// checkpoint_flag     Checkpoint-Fahne 2,4 m: weißer Mast, Goldkugel; aus = graue Fahne mit Pfote, an = Lotti-Blau/
//                     Greta-Grün mit Herz, flattert, Glitzern.  state { anim: 'off'|'on' }
// goal_pole           Zielmast: Steinblock 1 m, weißer Mast mit Korallen-Spirale, goldener Stern oben, Fahne.
//                     opts { height (8, Gesamthöhe ohne Stern) }  state { flagY (0 = unten am Block .. 1 = oben), anim }
//                     root.userData.flagHeight(flagY) → Höhe der Fahnenmitte.
// bunny_small         kleiner flinker Hase ≈0,5 m (karamell, Cremebauch, rotes Halstuch).
//                     state { anim: 'idle'|'hop'|'caught' }  hop: Sprungzyklus 0,45 s (Bogen 0,35 m);
//                     caught: dreht sich glücklich, schrumpft in 0,7 s weg (Glitzern).
// fairy_spotter       Waldkobold ≈0,65 m: grüner Kittel, rote Zipfelmütze mit Bommel, goldenes Fernglas.
//                     state { anim: 'idle'|'look'|'cheer' }  look: Fernglas an den Augen, sucht hin und her;
//                     cheer: hüpft und winkt.
// guardrail           Leitplanke für die Rennbahn.  opts { length (4) }  Verlauf von x = 0 bis length.
// traffic_light       Start-Ampel 3,4 m, Lampen blicken nach +X.  state { anim: 'off'|'red'|'yellow'|'green' }
// river_rock          bemooster Flussfelsen mit Schaumkranz.  opts { size (1) }
// speed_wave          Strömungspfeil im Fluss (schwimmende Platte 1,6 × 1,2 m, Lauflicht nach +X), wippt.

import {
  THREE, TAU, Build, cached, vcol, basic, std, mesh, joint, eyes, makeModel, Clock, Blinker, damp, clamp, col, mix,
  smoothstep, glowSprite, sparkleSprite, spriteMat, glowTexture, instMesh, setInst, gold, puffyStarGeo, starShape,
  canvasTexture, roundedBox, SIDE, metal,
} from '../lib/kit.js';

// =============================================================================================
// Warp-Röhre
// =============================================================================================
function pipeGeo(h, r) {
  return cached(`pipe:${h}:${r}`, () => {
    const lip = 0.45, e = 0.12;
    const pts = [[r, 0], [r, h - lip - 0.02], [r + e - 0.05, h - lip], [r + e, h - lip + 0.05], [r + e, h - 0.06], [r + e - 0.05, h], [r - 0.1, h], [r - 0.14, h - 0.04], [r - 0.14, h - 0.75]];
    const g = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 40);
    return g;
  });
}
function buildPipe(opts = {}) {
  const h = Math.max(0.6, Number(opts.height ?? 2)), r = Math.max(0.3, Number(opts.radius ?? 0.9));
  const color = opts.color ?? 0x3cbf3a;
  const root = new THREE.Group();
  const body = mesh(pipeGeo(h, r), std(`pipe:${color}`, { color, roughness: 0.24 }), {}, true);
  body.receiveShadow = true;
  const dark = mesh(cached(`pipe:hole:${r}`, () => { const g = new THREE.CircleGeometry(r - 0.13, 32); g.rotateX(-Math.PI / 2); return g; }),
    basic('pipeHole', { color: 0x0b140c }), { p: [0, h - 0.72, 0] });
  root.add(body, dark);
  return makeModel('pipe', root, () => {});
}

// =============================================================================================
// Glasröhre
// =============================================================================================
const glassMat = () => std('glassPipe', { color: 0xbfeaff, transparent: true, opacity: 0.34, roughness: 0.04, side: THREE.DoubleSide, depthWrite: false, emissive: 0x0a2a3a });
function buildGlassPipe(opts = {}) {
  const r = Math.max(0.3, Number(opts.radius ?? 1.0));
  const elbow = !!opts.elbow;
  const L = Math.max(0.5, Number(opts.length ?? 4));
  const root = new THREE.Group();
  const key = elbow ? `gp:elbow:${r}` : `gp:${L}:${r}`;
  const tube = mesh(cached(`${key}:tube`, () => {
    if (elbow) { const g = new THREE.TorusGeometry(2 * r, r, 20, 24, Math.PI / 2); g.rotateX(Math.PI / 2); g.translate(0, 0, 2 * r); g.rotateY(0); return g; }
    const g = new THREE.CylinderGeometry(r, r, L, 32, 1, true); g.rotateZ(Math.PI / 2); g.translate(L / 2, 0, 0); return g;
  }), glassMat());
  tube.renderOrder = 2;
  const rings = mesh(cached(`${key}:rings`, () => {
    const b = new Build();
    const ring = (p, ry) => b.torus(r + 0.03, 0.07, 0xf4fbff, { p, r: [0, ry, 0] }, 8, 36);
    if (elbow) { ring([0, 0, 0], Math.PI / 2); ring([2 * r, 0, 2 * r], 0); }
    else {
      ring([0, 0, 0], Math.PI / 2); ring([L, 0, 0], Math.PI / 2);
      // Glanzstreifen oben (machen das Glas lesbar)
      for (const a of [0.55, 0.85]) b.box(L - 0.2, 0.025, 0.06, 0xffffff, { p: [L / 2, Math.cos(a) * r * 0.985, -Math.sin(a) * r * 0.985], r: [a, 0, 0] }, 0, 1);
    }
    return b.geometry();
  }), vcol(0.25));
  root.add(rings, tube);
  return makeModel('glass_pipe_segment', root, () => {});
}

// =============================================================================================
// Bohnenranke
// =============================================================================================
function beanGeo(h) {
  return cached(`bean:${h}`, () => {
    const b = new Build();
    const pts = [];
    for (let y = 0; y <= h; y += 0.25) pts.push([Math.sin(y * 1.4) * 0.1, y, Math.cos(y * 1.4) * 0.1]);
    b.tube(pts, 0.12, { v: (x, y, z, nx) => mix(0x2f9a2a, 0x5fd03a, smoothstep(nx * 0.5 + 0.5)) }, null, Math.ceil(h * 6), 10);
    // Spirale oben
    const top = [];
    for (let i = 0; i <= 14; i++) { const a = i * 0.45; const rr = 0.22 * (1 - i / 16); top.push([Math.sin(h * 1.4) * 0.1 + Math.sin(a) * rr, h + 0.1 + i * 0.02, Math.cos(a) * rr]); }
    b.tube(top, 0.07, 0x4fbf3a, null, 24, 6);
    // Blätter abwechselnd
    let i = 0;
    for (let y = 0.6; y < h - 0.2; y += 0.7, i++) {
      const a = i * 2.2;
      const g = new THREE.SphereGeometry(1, 14, 8); g.scale(0.24, 0.03, 0.42); g.translate(0, 0, 0.42);
      b.add(g, { v: (x, yy, z) => (Math.abs(x) < 0.015 ? 0x3a9a2a : 0x7fe04a) }, { p: [Math.sin(y * 1.4) * 0.1, y, Math.cos(y * 1.4) * 0.1], r: [-0.45, a, 0], order: 'YXZ' });
    }
    return b.geometry();
  });
}
function buildBeanstalk(opts = {}) {
  const h = Math.max(1, Math.round(Number(opts.height ?? 6) * 2) / 2);
  const root = new THREE.Group();
  const sway = joint();
  sway.add(mesh(beanGeo(h), vcol(0.45), {}, true));
  root.add(sway);
  const clk = new Clock();
  let g = 1;
  const update = (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    const t = clk.t;
    g = damp(g, clamp(st.grow ?? 1, 0, 1), 6, dt);
    sway.scale.set(0.6 + 0.4 * g, Math.max(0.001, g), 0.6 + 0.4 * g);
    sway.rotation.z = Math.sin(t * 1.1) * 0.015; sway.rotation.x = Math.cos(t * 0.9) * 0.015;
  };
  return makeModel('beanstalk', root, update);
}

// =============================================================================================
// Trampolin
// =============================================================================================
function trampBaseGeo() {
  return cached('tramp:base', () => {
    const b = new Build();
    b.cyl(0.6, 0.62, 0.26, (x, y, z, nx, ny) => (ny > 0.5 ? 0xe8e8f0 : Math.sin(Math.atan2(z, x) * 6) > 0 ? 0xe8283a : 0xffffff), { p: [0, 0.13, 0] }, 36);
    b.torus(0.6, 0.04, 0xffd21f, { p: [0, 0.26, 0], r: [Math.PI / 2, 0, 0] }, 6, 36);
    return b.geometry();
  });
}
function springGeo() {
  return cached('tramp:spring', () => {
    const b = new Build();
    const pts = [];
    for (let i = 0; i <= 64; i++) { const a = i / 64 * TAU * 4; pts.push([Math.cos(a) * 0.32, i / 64 * 0.3, Math.sin(a) * 0.32]); }
    b.tube(pts, 0.035, 0xc8ccd8, null, 96, 6);
    return b.geometry();
  });
}
function padGeo() {
  return cached('tramp:pad', () => {
    const b = new Build();
    b.cyl(0.56, 0.56, 0.12, { v: (x, y, z, nx, ny) => (ny > 0.5 ? col(0xff3a4a) : col(0xd0202e)) }, { p: [0, 0.06, 0] }, 36);
    b.torus(0.56, 0.05, 0xffffff, { p: [0, 0.1, 0], r: [Math.PI / 2, 0, 0] }, 6, 36);
    b.extrude(starShape(0.28, 0.12, 5), 0.02, 0xffffff, { p: [0, 0.125, 0], r: [-Math.PI / 2, 0, -Math.PI / 2] }, 0.008, 1, 1);
    return b.geometry();
  });
}
function buildTrampoline() {
  const root = new THREE.Group();
  const base = mesh(trampBaseGeo(), vcol(0.35), {}, true);
  const spring = mesh(springGeo(), metal('chrome', { color: 0xdfe4ee, metalness: 0.8, roughness: 0.25 }, 1), { p: [0, 0.26, 0] }, true);
  const pad = mesh(padGeo(), vcol(0.3), { p: [0, 0.56, 0] }, true);
  root.add(base, spring, pad);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    if (st.n !== undefined && st.n !== clk.lastN) { clk.age = 0; clk.lastN = st.n; }
    const a = clk.age;
    // Feder: sofort gestaucht, dann gedämpft nachschwingend
    const s = anim === 'bounce' && a < 0.9 ? 1 - 0.55 * Math.exp(-a * 6) * Math.cos(a * 20) : 1;
    spring.scale.y = Math.max(0.2, s);
    pad.position.y = 0.26 + 0.3 * Math.max(0.2, s);
  };
  return makeModel('trampoline', root, update);
}

// =============================================================================================
// Boost-Pfeil
// =============================================================================================
function chevronGeo(w) {
  return cached(`boost:chev:${w}`, () => {
    const s = new THREE.Shape();
    const a = w * 0.42, d = 0.22, t = 0.16;
    s.moveTo(-d, a); s.lineTo(-d + t, a); s.lineTo(d + t, 0); s.lineTo(-d + t, -a); s.lineTo(-d, -a); s.lineTo(d, 0); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    return g;
  });
}
function buildBoost(opts = {}) {
  const L = Math.max(1, Number(opts.length ?? 2)), W = Math.max(0.6, Number(opts.width ?? 1.4));
  const root = new THREE.Group();
  const plate = mesh(cached(`boost:plate:${L}:${W}`, () => {
    const b = new Build();
    b.box(L, 0.08, W, { v: (x, y, z, nx, ny) => (ny > 0.9 ? col(0x2a3a9a) : col(0x1a2266)) }, { p: [0, 0.04, 0] }, 0.04, 2);
    b.box(L - 0.12, 0.02, 0.06, 0xffd21f, { p: [0, 0.085, W / 2 - 0.08] }, 0, 1);
    b.box(L - 0.12, 0.02, 0.06, 0xffd21f, { p: [0, 0.085, -W / 2 + 0.08] }, 0, 1);
    return b.geometry();
  }), vcol(0.4));
  plate.receiveShadow = true;
  const n = Math.max(2, Math.round(L / 0.62));
  const chev = instMesh(chevronGeo(W), basic('boostChev', { color: 0xffffff }), n, L, 0.1);
  for (let i = 0; i < n; i++) { setInst(chev, i, -L / 2 + (i + 0.5) * (L / n) - 0.05, 0.085, 0); chev.setColorAt(i, new THREE.Color(0xffd21f)); }
  root.add(plate, chev);
  const clk = new Clock();
  const c = new THREE.Color(), lo = new THREE.Color(0xff7a1a), hi = new THREE.Color(0xfff6a0);
  const update = (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    for (let i = 0; i < n; i++) {
      const k = Math.pow(Math.max(0, Math.sin(clk.t * 6 - i * 1.1)), 3);
      chev.setColorAt(i, c.copy(lo).lerp(hi, k));
    }
    chev.instanceColor.needsUpdate = true;
  };
  return makeModel('boost_arrow', root, update, [chev]);
}

// =============================================================================================
// Kipp-Schaltfeld
// =============================================================================================
function switchGeo() {
  return cached('switch:tile', () => {
    const b = new Build();
    b.box(1.4, 0.16, 1.4, { v: (x, y) => (y > 0 ? col(0x3a6ad8) : col(0xffc21a)) }, {}, 0.06, 2);
    // Oberseite (aus): weißer Ring; Unterseite (an): weißer Stern
    b.torus(0.38, 0.06, 0xffffff, { p: [0, 0.082, 0], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.5] }, 6, 32);
    b.extrude(starShape(0.48, 0.22, 5), 0.02, 0xffffff, { p: [0, -0.085, 0], r: [Math.PI / 2, 0, Math.PI / 2] }, 0.01, 1, 1);
    return b.geometry();
  });
}
function buildSwitch() {
  const root = new THREE.Group();
  const flip = joint([0, 0.08, 0]);
  const tile = mesh(switchGeo(), vcol(0.3), {}, true);
  tile.receiveShadow = true;
  flip.add(tile);
  const sp = sparkleSprite(0xffffff, 0.5); sp.position.set(0.3, 0.4, 0.3);
  root.add(flip, sp);
  const clk = new Clock();
  let rot = 0, first = true;
  const update = (dt, st) => {
    const anim = st.anim === 'on' ? 'on' : 'off';
    clk.tick(dt, anim);
    const target = anim === 'on' ? Math.PI : 0;
    rot = first ? target : damp(rot, target, 14, dt);
    first = false;
    flip.rotation.x = rot;
    const prog = 1 - Math.abs(rot - target) / Math.PI;
    flip.position.y = 0.08 + Math.sin(prog * Math.PI) * 0.3;
    const k = anim === 'on' && clk.age < 0.6 ? Math.sin(clk.age / 0.6 * Math.PI) : 0;
    sp.visible = k > 0.03; sp.scale.setScalar(Math.max(0.001, k * 0.8));
  };
  const model = makeModel('switch_tile', root, update, [], { initial: 'off' });
  return model;
}

// =============================================================================================
// Laterne
// =============================================================================================
function lanternFrameGeo(hanging) {
  return cached(`lantern:${hanging}`, () => {
    const b = new Build();
    const iron = 0x3a3f4a;
    if (hanging) {
      for (let i = 0; i < 7; i++) b.torus(0.04, 0.012, iron, { p: [0, 2.4 - i * 0.07, 0], r: [0, (i % 2) * Math.PI / 2, 0] }, 4, 8);
    } else {
      b.cyl(0.24, 0.3, 0.18, 0x9aa0b0, { p: [0, 0.09, 0] }, 12);
      b.cyl(0.05, 0.065, 1.55, iron, { p: [0, 0.95, 0] }, 10);
    }
    const y0 = hanging ? 1.6 : 1.72;
    b.cyl(0.17, 0.12, 0.08, iron, { p: [0, y0, 0] }, 12);
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + Math.PI / 4; b.box(0.025, 0.36, 0.025, iron, { p: [Math.cos(a) * 0.15, y0 + 0.22, Math.sin(a) * 0.15] }, 0, 1); }
    b.cone(0.24, 0.18, iron, { p: [0, y0 + 0.48, 0] }, 12);
    b.torus(0.05, 0.015, iron, { p: [0, y0 + 0.6, 0] }, 4, 10);
    return b.geometry();
  });
}
function buildLantern(opts = {}) {
  const hanging = !!opts.hanging;
  const y0 = hanging ? 1.6 : 1.72;
  const root = new THREE.Group();
  const frame = mesh(lanternFrameGeo(hanging), vcol(0.5), {}, true);
  const offM = std('lanternGlassOff', { color: 0x8a90a8, roughness: 0.3, transparent: true, opacity: 0.85 });
  const onM = basic('lanternGlassOn', { color: 0xffd27a });
  const glass = mesh(cached('lantern:glass', () => new THREE.CylinderGeometry(0.14, 0.14, 0.34, 12)), offM, { p: [0, y0 + 0.22, 0] });
  const flame = mesh(cached('lantern:flame', () => { const g = new THREE.SphereGeometry(0.06, 10, 8); g.scale(1, 1.8, 1); return g; }), basic('lanternFlame', { color: 0xfffbe0 }), { p: [0, y0 + 0.2, 0] });
  const halo = glowSprite(0xffb050, 1.4, 0.6); halo.position.set(0, y0 + 0.22, 0);
  root.add(frame, glass, flame, halo);
  const clk = new Clock();
  let on = 0;
  const update = (dt, st) => {
    const anim = st.anim === 'on' ? 'on' : 'off';
    clk.tick(dt, anim);
    const t = clk.t;
    on = damp(on, anim === 'on' ? 1 : 0, 6, dt);
    glass.material = on > 0.5 ? onM : offM;
    flame.visible = halo.visible = on > 0.05;
    const fl = 0.85 + Math.sin(t * 13) * 0.08 + Math.sin(t * 7.3) * 0.07;
    halo.scale.setScalar(1.4 * on * fl);
    flame.scale.set(fl, fl * (1 + Math.sin(t * 17) * 0.1), fl);
    if (hanging) root.rotation.z = Math.sin(t * 1.3) * 0.03;
  };
  return makeModel('lantern', root, update, [], { initial: 'off' });
}

// =============================================================================================
// Fahnen (Checkpoint, Ziel)
// =============================================================================================
function flagTex(kind) {
  return canvasTexture(`cm:flag:${kind}`, 256, 160, (ctx, w, h) => {
    if (kind === 'off') {
      ctx.fillStyle = '#d4d8e2'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#9aa0b0';
      ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.6, 30, 24, 0, 0, TAU); ctx.fill();
      for (const [x, y] of [[-34, -22], [-12, -40], [12, -40], [34, -22]]) { ctx.beginPath(); ctx.ellipse(w * 0.5 + x, h * 0.6 + y, 11, 14, 0, 0, TAU); ctx.fill(); }
    } else if (kind === 'on') {
      ctx.fillStyle = '#3b7cf0'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#4fb833'; ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd23a'; ctx.fillRect(0, 0, 14, h);
      ctx.save(); ctx.translate(w * 0.54, h * 0.52); ctx.scale(2.6, 2.6);
      ctx.fillStyle = '#f0609f'; ctx.beginPath(); ctx.moveTo(0, 15); ctx.bezierCurveTo(-26, -1, -14, -24, 0, -9); ctx.bezierCurveTo(14, -24, 26, -1, 0, 15); ctx.fill();
      ctx.scale(0.75, 0.75); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(0, 15); ctx.bezierCurveTo(-26, -1, -14, -24, 0, -9); ctx.bezierCurveTo(14, -24, 26, -1, 0, 15); ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = '#ff5a2a'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffd23a'; ctx.fillRect(0, 0, w, 12); ctx.fillRect(0, h - 12, w, 12);
      ctx.save(); ctx.translate(w * 0.5, h * 0.5);
      ctx.fillStyle = '#ffffff'; ctx.beginPath();
      for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const r = i % 2 ? 22 : 52; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.fill();
      ctx.fillStyle = '#ff5a2a'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('L&G', 0, 4);
      ctx.restore();
    }
  });
}
/** Wehendes Tuch: eigene Geometrie (Ecken werden bewegt), linke Kante bei x = 0. */
function cloth(w, h) {
  const g = new THREE.PlaneGeometry(w, h, 12, 6);
  g.translate(w / 2, 0, 0);
  const base = Float32Array.from(g.attributes.position.array);
  return {
    g,
    wave(t, amp, droop = 0) {
      const pos = g.attributes.position, a = pos.array;
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3], f = x / w;
        a[i * 3 + 2] = Math.sin(f * 6 - t * 6) * 0.1 * f * amp + Math.sin(f * 3 - t * 4) * 0.04 * f * amp;
        a[i * 3 + 1] = base[i * 3 + 1] - f * f * droop - Math.sin(f * 4 - t * 5) * 0.02 * f * amp;
        a[i * 3] = x * (1 - droop * 0.25 * f);
      }
      pos.needsUpdate = true;
      g.computeVertexNormals();
    },
  };
}
function cpPoleGeo() {
  return cached('cp:pole', () => {
    const b = new Build();
    b.cyl(0.3, 0.36, 0.2, 0x9aa0b0, { p: [0, 0.1, 0] }, 16);
    b.cyl(0.05, 0.06, 2.3, 0xf6f4ee, { p: [0, 1.3, 0] }, 12);
    return b.geometry();
  });
}
function buildCheckpoint() {
  const root = new THREE.Group();
  const pole = mesh(cpPoleGeo(), vcol(0.35), {}, true);
  const ball = mesh(cached('cp:ball', () => new THREE.SphereGeometry(0.11, 16, 12)), gold(), { p: [0, 2.52, 0] }, true);
  const c = cloth(1.0, 0.64);
  const offM = std('cpFlagOff', { map: flagTex('off'), side: THREE.DoubleSide, roughness: 0.75 });
  const onM = std('cpFlagOn', { map: flagTex('on'), side: THREE.DoubleSide, roughness: 0.6, emissive: 0x101010 });
  const flag = mesh(c.g, offM, { p: [0.05, 2.05, 0] }, true);
  const sps = [0, 1, 2].map((i) => { const s = sparkleSprite(0xffffff, 0.4); s.position.set(0.3 + i * 0.3, 2.2 + (i % 2) * 0.35, 0.2); root.add(s); return s; });
  root.add(pole, ball, flag);
  const clk = new Clock();
  let on = 0;
  const update = (dt, st) => {
    const anim = st.anim === 'on' ? 'on' : 'off';
    clk.tick(dt, anim);
    const t = clk.t;
    on = damp(on, anim === 'on' ? 1 : 0, 5, dt);
    flag.material = anim === 'on' ? onM : offM;
    c.wave(t, 0.25 + on * 0.9, (1 - on) * 0.25);
    const pop = anim === 'on' && clk.age < 0.6 ? Math.sin(clk.age / 0.6 * Math.PI) : 0;
    flag.position.y = 2.05 + pop * 0.12;
    sps.forEach((s, i) => { const k = anim === 'on' ? Math.max(pop, Math.pow(Math.max(0, Math.sin(t * 2 + i * 2)), 8)) : 0; s.visible = k > 0.03; s.scale.setScalar(Math.max(0.001, k * 0.45)); });
  };
  return makeModel('checkpoint_flag', root, update, [c.g], { initial: 'off' });
}

function goalGeo(H) {
  return cached(`goal:${H}`, () => {
    const b = new Build();
    // Steinblock 1 m mit hellen Kanten
    b.add(roundedBox(1, 1, 1, 0.08, SIDE.ALL, 0, 2), { v: (x, y, z, nx, ny, nz) => mix(ny > 0.9 ? 0xc8ccd8 : 0xa8acbc, 0x6a6e80, (1 - Math.max(Math.abs(nx), Math.abs(ny), Math.abs(nz))) * 2) }, { p: [0, 0.5, 0] });
    // Mast mit Korallen-Spirale (Streifen entlang der Schraubenlinie)
    const len = H - 1;
    const g = new THREE.CylinderGeometry(0.085, 0.095, len, 16, Math.ceil(len * 8), false);
    b.add(g, (x, y, z) => ((((y + len / 2) * 1.6 + Math.atan2(z, x) / TAU) % 1 + 1) % 1 < 0.42 ? 0xff6f61 : 0xfdfbf6), { p: [0, 1 + len / 2, 0] });
    b.torus(0.1, 0.03, 0xffd23a, { p: [0, 1.02, 0], r: [Math.PI / 2, 0, 0] }, 6, 16);
    return b.geometry();
  });
}
function buildGoal(opts = {}) {
  const H = Math.max(3, Math.round(Number(opts.height ?? 8) * 2) / 2);
  const root = new THREE.Group();
  const pole = mesh(goalGeo(H), vcol(0.3), {}, true);
  pole.receiveShadow = true;
  const star = mesh(cached('goal:star', () => puffyStarGeo(0.36, 0.17, 0.12, 0.06)), gold(), { p: [0, H + 0.4, 0] }, true);
  const glow = glowSprite(0xfff0a0, 1.6, 0.4); glow.position.set(0, H + 0.4, 0);
  const c = cloth(1.3, 0.85);
  const flagM = std('goalFlag', { map: flagTex('goal'), side: THREE.DoubleSide, roughness: 0.6 });
  const flag = mesh(c.g, flagM, {}, true);
  const ring = mesh(cached('goal:ring', () => new THREE.TorusGeometry(0.13, 0.035, 6, 16).rotateX(Math.PI / 2)), gold());
  root.add(pole, star, glow, flag, ring);
  const lo = 1.6, hi = H - 0.6;
  root.userData.flagHeight = (fy) => lo + clamp(fy, 0, 1) * (hi - lo);
  const clk = new Clock();
  let fy = 1;
  const update = (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    const t = clk.t;
    fy = st.flagY === undefined ? fy : clamp(st.flagY, 0, 1);
    const y = lo + fy * (hi - lo);
    flag.position.set(0.08, y, 0);
    ring.position.set(0, y + 0.45, 0);
    c.wave(t, 0.9, 0.05);
    star.rotation.y = t * 1.5;
    glow.scale.setScalar(1.6 + Math.sin(t * 3) * 0.12);
  };
  return makeModel('goal_pole', root, update, [c.g]);
}

// =============================================================================================
// Kleiner Hase
// =============================================================================================
const BN = { fur: 0xd99a5a, furLight: 0xf0c890, belly: 0xfff2dc, ear: 0xffa8c0, nose: 0xff6f9a, scarf: 0xe8322a };
function bunnyGeo() {
  return cached('bunny:body', () => {
    const b = new Build();
    b.sphere(1, { v: (x, y, z, nx) => mix(BN.fur, BN.belly, smoothstep((nx - 0.3) / 0.4)) }, { p: [0, 0.2, 0], s: [0.17, 0.16, 0.15] }, 18, 14);
    b.sphere(0.14, BN.fur, { p: [0.12, 0.38, 0] }, 18, 14);
    b.sphere(1, BN.belly, { p: [0.23, 0.35, 0], s: [0.06, 0.05, 0.08] }, 12, 8);
    b.sphere(0.025, BN.nose, { p: [0.285, 0.37, 0] }, 8, 6);
    b.sphere(0.07, 0xffffff, { p: [-0.17, 0.22, 0] }, 12, 8); // Puschelschwanz
    b.torus(0.105, 0.03, BN.scarf, { p: [0.08, 0.28, 0], r: [Math.PI / 2, 0, 0.35] }, 6, 18);
    b.box(0.03, 0.09, 0.06, BN.scarf, { p: [0.03, 0.22, 0.09], r: [0.3, 0, 0.3] }, 0.01, 1);
    for (const s of [1, -1]) b.sphere(1, BN.fur, { p: [-0.02, 0.06, s * 0.09], s: [0.12, 0.045, 0.055] }, 12, 8); // Hinterpfoten
    return b.geometry();
  });
}
const earGeo = () => cached('bunny:ear', () => {
  const b = new Build();
  b.sphere(1, BN.fur, { p: [0, 0.14, 0], s: [0.04, 0.15, 0.06] }, 12, 10);
  b.sphere(1, BN.ear, { p: [0.022, 0.14, 0], s: [0.02, 0.12, 0.04] }, 10, 8);
  return b.geometry();
});
function buildBunny() {
  const root = new THREE.Group();
  const hop = joint();
  const body = mesh(bunnyGeo(), vcol(0.5), {}, true);
  const eye = eyes([{ p: [0.215, 0.42, 0.065], r: 0.045, sy: 1.25, dir: [1, 0.1, 0.6] }, { p: [0.215, 0.42, -0.065], r: 0.045, sy: 1.25, dir: [1, 0.1, -0.6] }], { key: 'bunny', iris: 0x3a2214, pupil: 0.6, depth: 0.55 });
  const ears = [1, -1].map((s) => joint([0.08, 0.49, s * 0.05], mesh(earGeo(), vcol(0.5), {}, true)));
  hop.add(body, eye, ...ears);
  const sp = sparkleSprite(0xffffff, 0.5); sp.position.y = 0.45;
  root.add(hop, sp);
  const clk = new Clock(), blink = new Blinker();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    let y = 0, tilt = 0, earBack = 0, sc = 1, spin = 0;
    if (anim === 'hop') {
      const p = (age % 0.45) / 0.45;
      y = Math.sin(p * Math.PI) * 0.35; tilt = (0.5 - p) * 0.6; earBack = Math.sin(p * Math.PI) * 0.8;
    } else if (anim === 'caught') {
      const k = clamp(age / 0.7, 0, 1);
      y = Math.sin(k * Math.PI) * 0.4; spin = k * TAU * 2; sc = 1 - smoothstep((k - 0.5) * 2);
    } else {
      y = 0; tilt = 0;
      hop.rotation.y = Math.sin(t * 0.8) * 0.25;
    }
    hop.position.y = y;
    hop.rotation.z = tilt;
    if (anim !== 'idle') hop.rotation.y = spin;
    hop.scale.setScalar(Math.max(0.001, sc));
    hop.visible = sc > 0.01;
    ears.forEach((e, i) => { e.rotation.z = -0.15 - earBack + (anim === 'idle' ? Math.sin(t * 3 + i) * 0.08 : 0); e.rotation.x = (i ? -1 : 1) * 0.2; });
    const twitch = anim === 'idle' ? Math.max(0, Math.sin(t * 9)) * 0.02 : 0;
    body.scale.set(1, 1 + twitch, 1);
    eye.userData.blink(anim === 'caught' ? 0.15 : blink.update(dt));
    const k = anim === 'caught' ? Math.sin(clamp(age / 0.8, 0, 1) * Math.PI) : 0;
    sp.visible = k > 0.03; sp.scale.setScalar(Math.max(0.001, k * 0.7));
  };
  return makeModel('bunny_small', root, update);
}

// =============================================================================================
// Waldkobold mit Fernglas
// =============================================================================================
const KO = { tunic: 0x4fb84a, tunicDark: 0x2f8a2a, skin: 0xffd2b0, cap: 0xe8322a, pom: 0xffffff, belt: 0x6a3a1c, buckle: 0xffd21f, boot: 0x6a3a1c };
function koboldGeo() {
  return cached('kobold:body', () => {
    const b = new Build();
    b.lathe([[0, 0.08], [0.17, 0.08], [0.2, 0.15], [0.18, 0.32], [0.12, 0.38], [0, 0.39]], { v: (x, y) => (y < 0.12 ? col(KO.tunicDark) : col(KO.tunic)) }, null, 20, 2);
    b.torus(0.188, 0.025, KO.belt, { p: [0, 0.2, 0], r: [Math.PI / 2, 0, 0] }, 6, 20);
    b.box(0.03, 0.06, 0.07, KO.buckle, { p: [0.19, 0.2, 0] }, 0.01, 1);
    for (const s of [1, -1]) b.sphere(1, KO.boot, { p: [0.04, 0.05, s * 0.08], s: [0.09, 0.05, 0.06] }, 12, 8);
    b.sphere(0.15, KO.skin, { p: [0.02, 0.5, 0] }, 18, 14);
    b.sphere(0.035, 0xffa890, { p: [0.17, 0.48, 0] }, 8, 6); // Nase
    for (const s of [1, -1]) b.cone(0.05, 0.16, KO.skin, { p: [-0.02, 0.53, s * 0.17], r: [s * 1.2, 0, 0] }, 8); // spitze Ohren
    // Zipfelmütze mit Bommel
    b.cone(0.16, 0.34, KO.cap, { p: [-0.03, 0.72, 0], r: [0, 0, 0.35] }, 16);
    b.torus(0.145, 0.03, KO.cap, { p: [0.0, 0.6, 0], r: [Math.PI / 2, 0, 0.2] }, 6, 18);
    b.sphere(0.055, KO.pom, { p: [-0.15, 0.88, 0] }, 10, 8);
    return b.geometry();
  });
}
function binocGeo() {
  return cached('kobold:binoc', () => {
    const b = new Build();
    for (const s of [1, -1]) {
      b.cyl(0.045, 0.055, 0.14, 0xffc21a, { p: [0.07, 0, s * 0.05], r: [0, 0, Math.PI / 2] }, 12);
      b.cyl(0.04, 0.04, 0.01, 0x8fd8ff, { p: [0.145, 0, s * 0.05], r: [0, 0, Math.PI / 2] }, 12);
    }
    b.box(0.04, 0.03, 0.06, 0x8a5a1a, { p: [0.07, 0, 0] }, 0.01, 1);
    return b.geometry();
  });
}
function koboldArmGeo() {
  return cached('kobold:arm', () => {
    const b = new Build();
    b.capsule(0.036, 0.15, KO.tunic, { p: [0, -0.09, 0] }, 3, 8);
    b.sphere(0.042, KO.skin, { p: [0, -0.2, 0] }, 8, 6);
    return b.geometry();
  });
}
function buildKobold() {
  const root = new THREE.Group();
  const hop = joint();
  const body = joint();
  const torso = mesh(koboldGeo(), vcol(0.5), {}, true);
  const eye = eyes([{ p: [0.135, 0.53, 0.06], r: 0.04, sy: 1.25, dir: [1, 0.05, 0.5] }, { p: [0.135, 0.53, -0.06], r: 0.04, sy: 1.25, dir: [1, 0.05, -0.5] }], { key: 'kobold', iris: 0x2a6a2a, pupil: 0.6, depth: 0.55 });
  const head = joint([0, 0, 0]);
  head.add(eye);
  const arms = [1, -1].map((s) => joint([0.03, 0.34, s * 0.17], mesh(koboldArmGeo(), vcol(0.5), {}, true)));
  const binoc = mesh(binocGeo(), vcol(0.3), {}, true);
  body.add(torso, head, ...arms, binoc);
  hop.add(body);
  root.add(hop);
  const clk = new Clock(), blink = new Blinker();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    const look = anim === 'look', cheer = anim === 'cheer';
    hop.position.y = cheer ? Math.abs(Math.sin(t * 7)) * 0.18 : 0;
    body.rotation.y = damp(body.rotation.y, look ? Math.sin(t * 0.9) * 0.7 : Math.sin(t * 0.5) * 0.2, 5, dt);
    body.rotation.z = look ? -0.08 : 0;
    // Fernglas: vor den Augen (look), am Bauch (idle), geschwenkt (cheer)
    const bp = look ? [0.14, 0.53, 0, 0] : cheer ? [0.05, 0.62 + Math.sin(t * 14) * 0.05, 0.22, 0.6] : [0.17, 0.28, 0, -0.3];
    binoc.position.set(damp(binoc.position.x, bp[0], 10, dt), damp(binoc.position.y, bp[1], 10, dt), damp(binoc.position.z, bp[2], 10, dt));
    binoc.rotation.z = damp(binoc.rotation.z, bp[3], 10, dt);
    arms.forEach((a, i) => {
      const s = i ? -1 : 1;
      // Hände greifen das Fernglas (Winkel so gewählt, dass die Hand am Glas liegt)
      let rz = 0.82, rx = s * 1.1;
      if (look) { rz = 2.6; rx = -s * 0.62; }
      if (cheer) { rz = i ? 2.6 + Math.sin(t * 14) * 0.3 : 2.4; rx = s * 0.4; }
      a.rotation.z = damp(a.rotation.z, rz, 10, dt);
      a.rotation.x = damp(a.rotation.x, rx, 10, dt);
    });
    eye.visible = !look;
    eye.userData.blink(cheer ? 0.3 : blink.update(dt));
  };
  return makeModel('fairy_spotter', root, update);
}

// =============================================================================================
// Rennbahn: Leitplanke, Start-Ampel
// =============================================================================================
function buildGuardrail(opts = {}) {
  const L = Math.max(1, Math.round(Number(opts.length ?? 4)));
  const root = new THREE.Group();
  root.add(mesh(cached(`rail:${L}`, () => {
    const b = new Build();
    b.box(L, 0.32, 0.06, { v: (x, y, z, nx, ny) => (Math.abs(y - 0.0) < 0.03 || Math.abs(y) > 0.12 ? col(0xdfe4ee) : col(0xb8c0cc)) }, { p: [L / 2, 0.62, 0.08] }, 0.025, 1);
    b.box(L, 0.03, 0.03, 0x8a92a0, { p: [L / 2, 0.58, 0.115] }, 0, 1);
    b.box(L, 0.03, 0.03, 0x8a92a0, { p: [L / 2, 0.68, 0.115] }, 0, 1);
    for (let x = 0; x <= L + 0.01; x += 2) {
      b.box(0.1, 0.8, 0.1, 0x6a7080, { p: [Math.min(x, L - 0.05) + (x === 0 ? 0.05 : 0), 0.4, 0] }, 0.02, 1);
      b.box(0.12, 0.08, 0.02, 0xff3a2a, { p: [Math.min(x, L - 0.05) + (x === 0 ? 0.05 : 0), 0.62, 0.125] }, 0, 1);
    }
    return b.geometry();
  }), vcol(0.35), {}, true));
  return makeModel('guardrail', root, () => {});
}
function buildTrafficLight() {
  const root = new THREE.Group();
  const frame = mesh(cached('tlight:frame', () => {
    const b = new Build();
    b.cyl(0.07, 0.09, 3.4, 0x3a3f4a, { p: [0, 1.7, 0] }, 10);
    b.cyl(0.25, 0.3, 0.12, 0x5a606e, { p: [0, 0.06, 0] }, 12);
    b.box(0.32, 1.05, 0.38, 0x23262e, { p: [0.12, 2.8, 0] }, 0.06, 2);
    for (let i = 0; i < 3; i++) b.add(new THREE.CylinderGeometry(0.15, 0.15, 0.14, 12, 1, true, 0, Math.PI), 0x23262e, { p: [0.33, 3.12 - i * 0.32, 0], r: [0, Math.PI / 2, Math.PI / 2], order: 'ZYX' });
    return b.geometry();
  }), vcol(0.4), {}, true);
  const COLORS = { red: 0xff2a2a, yellow: 0xffc21a, green: 0x2aff5a };
  const names = ['red', 'yellow', 'green'];
  const lamps = names.map((nm, i) => mesh(cached('tlight:lamp', () => { const g = new THREE.SphereGeometry(0.12, 14, 10); g.scale(0.5, 1, 1); return g; }), std(`lampOff:${nm}`, { color: new THREE.Color(COLORS[nm]).multiplyScalar(0.25), roughness: 0.3 }), { p: [0.28, 3.12 - i * 0.32, 0] }));
  const onMats = names.map((nm) => basic(`lampOn:${nm}`, { color: COLORS[nm] }));
  const offMats = names.map((nm) => std(`lampOff:${nm}`));
  const glow = glowSprite(0xffffff, 0.9, 0.7);
  root.add(frame, ...lamps, glow);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'off';
    clk.tick(dt, anim);
    const idx = names.indexOf(anim);
    lamps.forEach((l, i) => { l.material = i === idx ? onMats[i] : offMats[i]; });
    glow.visible = idx >= 0;
    if (idx >= 0) {
      glow.position.set(0.4, 3.12 - idx * 0.32, 0);
      glow.material = spriteMat(`glow:${COLORS[names[idx]]}:0.75`, { map: glowTexture(), color: COLORS[names[idx]], blending: THREE.AdditiveBlending, opacity: 0.75 });
      glow.scale.setScalar(0.9 + Math.sin(clk.t * 6) * 0.05);
    }
  };
  return makeModel('traffic_light', root, update, [], { initial: 'off' });
}

// =============================================================================================
// Fluss: Felsen, Strömungspfeil
// =============================================================================================
function rockGeo() {
  return cached('river:rock', () => {
    const b = new Build();
    const rocks = [[0, 0.25, 0, 0.6, 0.42, 0.5], [0.45, 0.15, 0.3, 0.35, 0.28, 0.32], [-0.4, 0.12, -0.25, 0.3, 0.22, 0.28]];
    for (const [x, y, z, sx, sy, sz] of rocks) {
      const g = new THREE.IcosahedronGeometry(1, 3);
      const P = g.attributes.position;
      for (let i = 0; i < P.count; i++) { const k = 1 + Math.sin(P.getX(i) * 5.1 + P.getZ(i) * 3.7) * 0.06 + Math.cos(P.getY(i) * 4.3) * 0.05; P.setXYZ(i, P.getX(i) * k, P.getY(i) * k, P.getZ(i) * k); }
      g.computeVertexNormals();
      b.add(g, (px, py, pz, nx, ny) => (ny > 0.55 ? 0x5cbf3a : py < -0.2 ? 0x5a5e6e : 0x8a8e9e), { p: [x, y, z], s: [sx, sy, sz] });
    }
    return b.geometry();
  });
}
function buildRiverRock(opts = {}) {
  const s = Math.max(0.2, Number(opts.size ?? 1));
  const root = new THREE.Group();
  const rock = mesh(rockGeo(), vcol(0.7), { s }, true);
  const foam = mesh(cached('river:foam', () => { const g = new THREE.TorusGeometry(0.75, 0.07, 6, 32); g.rotateX(Math.PI / 2); g.scale(1, 0.4, 0.8); return g; }), basic('foamRing', { color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false }), { p: [0, 0.03, 0], s });
  root.add(rock, foam);
  const clk = new Clock();
  const update = (dt, st) => { clk.tick(dt, st.anim ?? 'idle'); foam.scale.set(s * (1 + Math.sin(clk.t * 2.4) * 0.05), s, s * (1 + Math.cos(clk.t * 2.1) * 0.05)); };
  return makeModel('river_rock', root, update);
}
function buildSpeedWave() {
  const root = new THREE.Group();
  const bob = joint();
  bob.add(mesh(cached('river:wave', () => {
    const b = new Build();
    b.box(1.6, 0.1, 1.2, { v: (x, y, z, nx, ny) => (ny > 0.9 ? col(0x2ac8e8) : col(0x1a8ab8)) }, { p: [0, 0.05, 0] }, 0.05, 2);
    for (let i = 0; i < 6; i++) b.sphere(0.07 + (i % 2) * 0.02, 0xffffff, { p: [-0.82, 0.05, -0.5 + i * 0.2], s: [1, 0.6, 1] }, 8, 6);
    return b.geometry();
  }), vcol(0.3), {}, true));
  const n = 3;
  const chev = instMesh(chevronGeo(1.2), basic('waveChev', { color: 0xffffff }), n, 1.2, 0.1);
  for (let i = 0; i < n; i++) { setInst(chev, i, -0.5 + i * 0.45, 0.105, 0); chev.setColorAt(i, new THREE.Color(0xffffff)); }
  bob.add(chev);
  root.add(bob);
  const clk = new Clock();
  const c = new THREE.Color(), lo = new THREE.Color(0x8ff0ff), hi = new THREE.Color(0xffffff);
  const update = (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    const t = clk.t;
    bob.position.y = Math.sin(t * 2) * 0.04;
    bob.rotation.z = Math.sin(t * 1.7) * 0.03; bob.rotation.x = Math.cos(t * 1.3) * 0.03;
    for (let i = 0; i < n; i++) chev.setColorAt(i, c.copy(lo).lerp(hi, Math.pow(Math.max(0, Math.sin(t * 6 - i * 1.2)), 3)));
    chev.instanceColor.needsUpdate = true;
  };
  return makeModel('speed_wave', root, update, [chev]);
}

export const MODELS = {
  pipe: buildPipe,
  glass_pipe_segment: buildGlassPipe,
  beanstalk: buildBeanstalk,
  trampoline: buildTrampoline,
  boost_arrow: buildBoost,
  switch_tile: buildSwitch,
  lantern: buildLantern,
  checkpoint_flag: buildCheckpoint,
  goal_pole: buildGoal,
  bunny_small: buildBunny,
  fairy_spotter: buildKobold,
  guardrail: buildGuardrail,
  traffic_light: buildTrafficLight,
  river_rock: buildRiverRock,
  speed_wave: buildSpeedWave,
};
