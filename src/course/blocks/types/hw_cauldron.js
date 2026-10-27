// Halloween-Bausteine Hexenturm (H-4): Hexenkessel (Trampolin mit Blubber, Zaubertrank-Blasen) und Spinnennetz-Trampolin.
//
// hexenkessel – runder Eisenkessel mit leuchtend grünem Zaubertrank: Draufspringen schleudert hoch (Form mit bounce wie
//   das Trampolin: gehaltene Sprungtaste ×1,15, Stampfattacke ×1,3), der Trank blubbert (Blasen steigen und platzen),
//   bei jedem Abprall spritzt er. Optional steigen Zaubertrank-Blasen auf: schwebende Plattformen (von unten durchlässig),
//   die die Figur mit nach oben tragen, oben wackeln (Vorwarnung) und platzen.
//   { type: 'hexenkessel', id, pos: [x, y, z] (Fußpunkt), size: 2 (Ø), height: 1.2 (Rand über pos), strength: 20 (m/s)
//     | jump: m (gewünschte Sprunghöhe), color: 'gruen' | 'lila' | 'orange', light: true (Kessellicht im Thema mit
//     lanternLight), potions: false | true | { every: 2.6 (s), rise: 1.6 (m/s), height: 8 (m über dem Rand, dann
//     platzen), size: 1.7 (Ø), wobble: 0.7 (s Vorwarnung), max: 3, offset: [dx, dz] (Austritt neben der Mitte),
//     first: 0.5 } }
//   level.named.get(id) = { bounces, top, bubbles: [{ x, y, z, r, state }], pops, spawned, info() }
// spinnennetz_trampolin – Spinnennetz zwischen vier krummen Pfählen: federnde Fläche (bounce), das Netz dellt sich beim
//   Abprall ein und schwingt nach; eine kleine freundliche Spinne baumelt an einem Faden.
//   { type: 'spinnennetz_trampolin', id, pos: [x, y, z] (Boden unter der Netzmitte), size: [3, 3] (w × d), height: 1.0
//     (Netz über pos), strength: 17 | jump: m, spider: true, posts: true }
//   level.named.get(id) = { bounces, sag, info() }
// Modelle aus der Registry, sobald es sie gibt: 'hexenkessel' ({ size, height, color }; state { squash, bubble, brew }),
//   'zaubertrank_blase' ({ size }; state { wobble }), 'spinnennetz_trampolin' ({ size: [w, d], height }; state { sag,
//   spider }); sonst eigene Geometrie.

import * as THREE from 'three';
import { v3, lin, mixc, smooth, colorize, merge, hex, addObject, addStatic } from '../kit.js';
import { visDt } from '../../entities/gimmick.js';
import { hasModel, getModel } from '../../models/index.js';
import { modelOr, HWC, softTexture, hwSfx, figures } from '../hwkit.js';

const G_UP = 27;   // Steig-Schwerkraft nach dem Abprall (Motor: enterAir('bounce'))
const C = (h) => lin(hex(h));
const BREW = { gruen: [HWC.potionLow, HWC.potion, HWC.potionHi], lila: [0x5a2aa8, 0xb07aff, 0xf0d8ff], orange: [0xc0500a, 0xff9a2a, 0xffe08a] };

// ------------------------------------------------------------------ Hexenkessel

function cauldronGeo(R, H, color) {
  const parts = [], glow = [];
  const iron = C(HWC.iron), ironHi = C(HWC.ironHi), [b0, b1, b2] = (BREW[color] ?? BREW.gruen).map(C);
  // Bauch (Drehkörper)
  const prof = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const y = t * (H - 0.12);
    const r = R * (0.62 + 0.42 * Math.sin(Math.PI * (0.18 + t * 0.72))) * (t > 0.92 ? 0.97 : 1);
    prof.push(new THREE.Vector2(Math.max(0.05, r), y + 0.06));
  }
  const belly = new THREE.LatheGeometry(prof, 28);
  parts.push(colorize(belly.toNonIndexed(), (p, n, o) => { mixc(iron, ironHi, smooth(-0.4, 0.9, n.y * 0.5 + n.x * 0.35 + n.z * 0.25), o); if (Math.abs(p.y - H * 0.55) < 0.05) mixc(o, C(0x8a7a9a), 0.5, o); }));
  const rim = new THREE.TorusGeometry(R * 0.97, 0.1, 8, 32); rim.rotateX(Math.PI / 2); rim.translate(0, H - 0.04, 0);
  parts.push(colorize(rim.toNonIndexed(), (p, n, o) => mixc(iron, C(0x8a8498), smooth(-0.2, 1, n.y), o)));
  // Füßchen und Henkel
  for (let k = 0; k < 3; k++) {
    const a = k * 2.094 + 0.5;
    const f = new THREE.CylinderGeometry(0.1, 0.07, 0.3, 6); f.translate(Math.cos(a) * R * 0.55, 0.12, Math.sin(a) * R * 0.55);
    parts.push(colorize(f.toNonIndexed(), (p, n, o) => mixc(iron, ironHi, 0.3, o)));
  }
  for (const sd of [-1, 1]) {
    const h = new THREE.TorusGeometry(0.16, 0.04, 6, 12, Math.PI); h.rotateY(Math.PI / 2); h.rotateZ(sd * -0.2); h.translate(sd * R * 1.02, H * 0.78, 0);
    parts.push(colorize(h.toNonIndexed(), (p, n, o) => mixc(iron, ironHi, 0.5, o)));
  }
  // Trank (Oberfläche, Wirbel) – leuchtet
  const brew = new THREE.CircleGeometry(R * 0.92, 28, 0, Math.PI * 2); brew.rotateX(-Math.PI / 2); brew.translate(0, H - 0.1, 0);
  glow.push(colorize(brew.toNonIndexed(), (p, n, o) => { const a = Math.atan2(p.z, p.x), d = Math.hypot(p.x, p.z) / R; const sw = Math.sin(a * 3 + d * 9) * 0.5 + 0.5; mixc(b0, b1, 0.35 + 0.65 * smooth(0.95, 0.2, d), o); mixc(o, b2, sw * 0.35 * (1 - d), o); }));
  // Glut unter dem Kessel
  for (let k = 0; k < 4; k++) {
    const a = k * 1.57 + 0.3;
    const lg = new THREE.CylinderGeometry(0.07, 0.07, R * 0.9, 6); lg.rotateZ(Math.PI / 2); lg.rotateY(a); lg.translate(0, 0.07, 0);
    parts.push(colorize(lg.toNonIndexed(), (p, n, o) => mixc(C(0x4a2a14), C(0x8a5a2a), 0.4, o)));
  }
  const ember = new THREE.SphereGeometry(R * 0.3, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); ember.scale(1, 0.4, 1); ember.translate(0, 0.02, 0);
  glow.push(colorize(ember.toNonIndexed(), (p, n, o) => mixc(C(0xff5a1a), C(0xffd04a), smooth(0, 0.1, p.y), o)));
  return { body: merge(parts), glow: merge(glow) };
}

export function buildHexenkessel(level, spec) {
  const p = v3(spec.pos);
  const R = (spec.size ?? 2) / 2, H = spec.height ?? 1.2;
  const top = p.y + H;
  const strength = spec.strength ?? (spec.jump ? Math.sqrt(2 * G_UP * spec.jump) : 20);
  const color = spec.color ?? 'gruen';
  const st = { bounces: 0, squash: 0, splash: 0, pops: 0, spawned: 0 };
  const owner = { onBounce() { st.bounces++; st.squash = 1; st.splash = 1; hwSfx(level, 'kessel', 'bounce'); } };
  level.world.add({ type: 'cyl', x: p.x, z: p.z, r: R, y0: p.y, y1: top, bounce: strength, owner, tag: 'hexenkessel' });
  // Zaubertrank-Blasen
  const po = spec.potions === true ? {} : spec.potions || null;
  const bubbles = [];
  const handle = {
    get bounces() { return st.bounces; }, get pops() { return st.pops; }, get spawned() { return st.spawned; }, top, strength, bubbles,
    info: () => ({ bounces: st.bounces, pops: st.pops, spawned: st.spawned, bubbles: bubbles.map((b) => ({ y: +b.y.toFixed(2), state: b.state, solid: b.sid !== null })) }),
  };
  if (spec.id) level.named.set(spec.id, handle);
  if (po) {
    const every = po.every ?? 2.6, rise = po.rise ?? 1.6, maxH = po.height ?? 8, br = (po.size ?? 1.7) / 2, wob = po.wobble ?? 0.7, max = po.max ?? 3;
    const [ox, oz] = po.offset ?? [0, 0];
    let timer = po.first ?? 0.5;
    const mk = () => {
      const b = { x: p.x + ox, y: top - br * 0.3, z: p.z + oz, r: br, state: 'grow', t: 0, sid: null, mover: { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: p.x + ox, cz: p.z + oz } };
      b.shape = { type: 'cyl', x: b.x, z: b.z, r: br * 0.92, y0: b.y - br * 0.4, y1: b.y + br * 0.55, oneWay: true, mover: b.mover, tag: 'zaubertrank_blase', owner: b };
      bubbles.push(b);
      st.spawned++;
    };
    level.onStep((dt) => {
      timer -= dt;
      if (timer <= 0) { timer = every; if (bubbles.length < max) mk(); }
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        b.t += dt;
        const oy = b.y;
        if (b.state === 'grow') { b.y += rise * 0.4 * dt; if (b.t >= 0.6) { b.state = 'rise'; b.t = 0; } }
        else if (b.state === 'rise') { b.y += rise * dt; if (b.y >= top + maxH) { b.y = top + maxH; b.state = 'wobble'; b.t = 0; } }
        else if (b.state === 'wobble' && b.t >= wob) {
          if (b.sid !== null) level.world.remove(b.sid);
          bubbles.splice(i, 1);
          st.pops++;
          hwSfx(level, 'blase', 'vanish');
          level.effects?.sparks({ x: b.x, y: b.y, z: b.z }, 10);
          continue;
        }
        b.mover.dy = b.y - oy; b.mover.vy = b.mover.dy / dt;
        b.shape.y0 = b.y - br * 0.4; b.shape.y1 = b.y + br * 0.55;
        // fest erst, wenn sie über dem Rand schwebt (fängt keine Figur im Kessel ein)
        const solid = b.state !== 'grow' && b.shape.y0 > top + 0.35;
        if (solid && b.sid === null) {
          const inside = figures(level).some((f) => Math.hypot(f.pos.x - b.x, f.pos.z - b.z) < br + f.half.x && f.pos.y < b.shape.y1 - 0.05 && f.pos.y + f.half.y * 2 > b.shape.y0);
          if (!inside) b.sid = level.world.add(b.shape);
        } else if (b.sid !== null) level.world.update(b.sid);
      }
    });
  }
  if (!level.view) return handle;
  // Darstellung
  const root = new THREE.Group();
  root.position.set(p.x, p.y, p.z);
  const model = modelOr('hexenkessel', { size: R * 2, height: H, color }, () => {
    const { body, glow } = cauldronGeo(R, H, color);
    const g = new THREE.Group();
    const mb = new THREE.Mesh(body, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.35 }));
    mb.castShadow = true; mb.receiveShadow = true;
    g.add(mb, new THREE.Mesh(glow, new THREE.MeshBasicMaterial({ vertexColors: true })));
    return { root: g };
  });
  root.add(model.root);
  const [, bc, bh] = (BREW[color] ?? BREW.gruen);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(), color: bc, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(R * 4.2, R * 2.6, 1); halo.position.set(0, H + 0.5, 0);
  root.add(halo);
  // Blubber-Blasen im Trank (Instanzen)
  const NB = 10;
  const bgeo = new THREE.SphereGeometry(1, 8, 6);
  const bub = new THREE.InstancedMesh(bgeo, new THREE.MeshBasicMaterial({ color: bh, transparent: true, opacity: 0.85 }), NB + 8);
  bub.frustumCulled = false; bub.castShadow = false;
  root.add(bub);
  const bs = Array.from({ length: NB + 8 }, (_, i) => ({ a: (i * 2.39) % 6.28, d: ((i * 0.37) % 1) * R * 0.75, t: (i * 0.29) % 1.4, life: 1.1 + ((i * 0.13) % 0.6), burst: i >= NB, vy: 0, y: 0 }));
  // Zaubertrank-Blasen (Instanzen, Welt)
  let potions = null;
  if (po) {
    potions = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 18, 12), new THREE.MeshStandardMaterial({ color: bc, emissive: bc, emissiveIntensity: 0.45, roughness: 0.15, transparent: true, opacity: 0.62, depthWrite: false }), po.max ?? 3);
    potions.frustumCulled = false; potions.castShadow = false; potions.renderOrder = 2;
    addObject(level, potions);
  }
  if (spec.light !== false) level.view.addLantern?.(p.x, top + 0.8, p.z);
  const M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
  const hold = {};
  addObject(level, root, (dt, t) => {
    const d = visDt(level, hold, dt);
    st.squash = Math.max(0, st.squash - d * 4);
    const sq = Math.sin(st.squash * Math.PI) * 0.08;
    root.scale.set(1 + sq, 1 - sq, 1 + sq);
    halo.material.opacity = 0.42 + 0.12 * Math.sin(t * 3) + st.splash * 0.4;
    model.update?.(d, { squash: st.squash, bubble: 0.5 + 0.5 * Math.sin(t * 4), brew: color });
    // Blubbern: kleine Blasen wachsen und platzen; nach einem Abprall spritzen Blasen hoch
    if (st.splash > 0.99) for (let i = NB; i < NB + 8; i++) { const b = bs[i]; b.t = 0; b.y = 0; b.vy = 3 + (i % 4) * 0.8; }
    st.splash = Math.max(0, st.splash - d * 2);
    let n = 0;
    for (let i = 0; i < bs.length; i++) {
      const b = bs[i];
      b.t += d;
      let y, s;
      if (b.burst) {
        if (b.vy <= 0 && b.y <= 0) continue;
        b.vy -= 14 * d; b.y += b.vy * d;
        if (b.y < 0) { b.y = 0; b.vy = 0; continue; }
        y = H - 0.08 + b.y; s = 0.09;
      } else {
        if (b.t > b.life) { b.t = 0; b.a = (b.a + 2.1) % 6.28; }
        const k = b.t / b.life;
        y = H - 0.1 + k * 0.05; s = 0.04 + k * 0.12;
        if (k > 0.92) s *= 1.3;
      }
      P.set(Math.cos(b.a) * b.d, y, Math.sin(b.a) * b.d); S.set(s, s, s);
      M.compose(P, Q, S); bub.setMatrixAt(n++, M);
    }
    bub.count = n; bub.instanceMatrix.needsUpdate = true;
    if (potions) {
      let k = 0;
      for (const b of bubbles) {
        const grow = b.state === 'grow' ? Math.min(1, b.t / 0.6) : 1;
        const w = b.state === 'wobble' ? Math.sin(b.t * 30) * 0.08 * (1 + b.t) : Math.sin(t * 3 + b.x) * 0.03;
        P.set(b.x, b.y, b.z); S.set(b.r * grow * (1 + w), b.r * grow * (0.85 - w), b.r * grow * (1 + w));
        M.compose(P, Q, S); potions.setMatrixAt(k++, M);
      }
      potions.count = k; potions.instanceMatrix.needsUpdate = true;
    }
  });
  return handle;
}

// ------------------------------------------------------------------ Spinnennetz-Trampolin

/** Netz (lokal, Mitte im Ursprung): Speichen + Spirale als flache Bänder; liefert Geometrie + Radius-Anteil je Ecke. */
function webGeo(w, d) {
  const pos = [], rk = [];
  const R = 1;
  const strand = (ax, az, bx, bz, wd) => {
    const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1;
    const nx = -dz / l * wd / 2, nz = dx / l * wd / 2;
    const quad = [[ax + nx, az + nz], [ax - nx, az - nz], [bx - nx, bz - nz], [ax + nx, az + nz], [bx - nx, bz - nz], [bx + nx, bz + nz]];
    for (const [x, z] of quad) { pos.push(x * w / 2, 0, z * d / 2); rk.push(Math.min(1, Math.hypot(x, z))); }
  };
  const spokes = 12;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    const ex = Math.cos(a), ez = Math.sin(a);
    // bis zum Rechteckrand
    const k = 1 / Math.max(Math.abs(ex), Math.abs(ez));
    strand(0, 0, ex * k * R, ez * k * R, 0.026);
  }
  const rings = 6;
  for (let j = 1; j <= rings; j++) {
    const rr = j / (rings + 0.4);
    for (let i = 0; i < spokes; i++) {
      const a0 = (i / spokes) * Math.PI * 2, a1 = ((i + 1) / spokes) * Math.PI * 2;
      const k0 = 1 / Math.max(Math.abs(Math.cos(a0)), Math.abs(Math.sin(a0))), k1 = 1 / Math.max(Math.abs(Math.cos(a1)), Math.abs(Math.sin(a1)));
      const s0 = rr * (0.92 + 0.08 * k0), s1 = rr * (0.92 + 0.08 * k1);
      strand(Math.cos(a0) * s0, Math.sin(a0) * s0, Math.cos(a1) * s1, Math.sin(a1) * s1, 0.02);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return { g, rk: Float32Array.from(rk), base: Float32Array.from(pos) };
}

export function buildSpinnennetzTrampolin(level, spec) {
  const p = v3(spec.pos);
  const [w, d] = spec.size ?? [3, 3];
  const H = spec.height ?? 1.0;
  const top = p.y + H;
  const strength = spec.strength ?? (spec.jump ? Math.sqrt(2 * G_UP * spec.jump) : 17);
  const st = { bounces: 0, sag: 0, sagV: 0 };
  const owner = { onBounce(f) { st.bounces++; st.sagV -= 6; st.hit = f ? { x: f.pos.x - p.x, z: f.pos.z - p.z } : null; hwSfx(level, 'netz', 'bounce'); } };
  level.world.add({ type: 'box', min: [p.x - w / 2, top - 0.22, p.z - d / 2], max: [p.x + w / 2, top, p.z + d / 2], bounce: strength, owner, tag: 'spinnennetz' });
  const posts = spec.posts !== false;
  if (posts) for (const sx of [-1, 1]) for (const sz of [-1, 1]) level.world.add({ type: 'cyl', x: p.x + sx * (w / 2 + 0.12), z: p.z + sz * (d / 2 + 0.12), r: 0.14, y0: p.y, y1: top + 0.45, tag: 'spinnennetz:pfahl' });
  const handle = { get bounces() { return st.bounces; }, get sag() { return st.sag; }, top, strength, info: () => ({ bounces: st.bounces, sag: +st.sag.toFixed(3) }) };
  if (spec.id) level.named.set(spec.id, handle);
  if (!level.view) return handle;
  if (posts) {
    const parts = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const g = new THREE.CylinderGeometry(0.1, 0.15, H + 0.55, 7, 4);
      const gp = g.attributes.position;
      for (let i = 0; i < gp.count; i++) { const y = gp.getY(i); gp.setX(i, gp.getX(i) + Math.sin(y * 2.4 + sx) * 0.06); gp.setZ(i, gp.getZ(i) + Math.cos(y * 2 + sz) * 0.05); }
      g.computeVertexNormals();
      g.translate(p.x + sx * (w / 2 + 0.12), p.y + (H + 0.55) / 2, p.z + sz * (d / 2 + 0.12));
      parts.push(colorize(g.toNonIndexed(), (q, n, o) => mixc(C(0x3a2a22), C(0x7a5a42), smooth(-0.5, 0.9, n.x * 0.5 + n.y), o)));
      const k = new THREE.SphereGeometry(0.13, 6, 5); k.translate(p.x + sx * (w / 2 + 0.12), top + 0.55, p.z + sz * (d / 2 + 0.12));
      parts.push(colorize(k.toNonIndexed(), (q, n, o) => mixc(C(0x4a3a2a), C(0x8a6a4a), 0.5, o)));
    }
    addStatic(level, merge(parts));
  }
  const root = new THREE.Group();
  root.position.set(p.x, top - 0.02, p.z);
  let model = null, web = null;
  if (hasModel('spinnennetz_trampolin')) { model = getModel('spinnennetz_trampolin', { size: [w, d], height: H }); model.root.position.y = -(H - 0.02); root.add(model.root); }
  else {
    web = webGeo(w, d);
    const mesh = new THREE.Mesh(web.g, new THREE.MeshBasicMaterial({ color: 0xe8e0ff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
    mesh.renderOrder = 2;
    root.add(mesh);
  }
  // kleine Spinne am Faden (freundlich: runder lila Körper, große Augen)
  let spider = null;
  if (spec.spider !== false && !model) {
    spider = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshStandardMaterial({ color: 0x5a3a9a, roughness: 0.5 }));
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), body.material); head.position.set(0, -0.15, 0.04);
    const eyeM = new THREE.MeshBasicMaterial({ color: 0xffffff }), pupM = new THREE.MeshBasicMaterial({ color: 0x1a1020 });
    for (const sd of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), eyeM); e.position.set(sd * 0.05, -0.15, 0.13);
      const pp = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 4), pupM); pp.position.set(sd * 0.05, -0.155, 0.17);
      spider.add(e, pp);
      for (let k = 0; k < 4; k++) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.26, 4), body.material);
        leg.position.set(sd * 0.17, -0.02 - k * 0.04, 0.04 - k * 0.04); leg.rotation.z = sd * (1.1 + k * 0.1);
        spider.add(leg);
      }
    }
    const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 3), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
    thread.position.y = 0.5;
    spider.add(body, head, thread);
    spider.userData.thread = thread;
    spider.position.set(w / 2, 0.55, d / 2);
    root.add(spider);
  }
  const hold = {};
  addObject(level, root, (dt, t) => {
    const dd = visDt(level, hold, dt);
    // gedämpfte Feder der Netzmitte (Teilschritte: stabil, auch wenn zwischen zwei Bildern viel Simulationszeit liegt)
    for (let rem = Math.min(dd, 0.5); rem > 1e-6; rem -= 1 / 120) {
      const h = Math.min(rem, 1 / 120);
      st.sagV += (-60 * st.sag - 5 * st.sagV) * h;
      st.sag += st.sagV * h;
    }
    if (Math.abs(st.sag) < 1e-4 && Math.abs(st.sagV) < 1e-3) { st.sag = 0; st.sagV = 0; }
    if (web) {
      const a = web.g.attributes.position.array;
      for (let i = 0; i < web.rk.length; i++) { const k = 1 - web.rk[i] * web.rk[i]; a[i * 3 + 1] = web.base[i * 3 + 1] + st.sag * 0.5 * k; }
      web.g.attributes.position.needsUpdate = true;
    }
    model?.update?.(dd, { sag: st.sag, spider: Math.sin(t * 1.4) });
    if (spider) {
      const L = 0.5 + 0.25 * Math.sin(t * 1.1);
      spider.position.y = 1.0 - L;
      spider.userData.thread.scale.y = L; spider.userData.thread.position.y = L / 2 + 0.05;
      spider.rotation.y = Math.sin(t * 0.8) * 0.6;
    }
  });
  return handle;
}

export const TYPES = { hexenkessel: buildHexenkessel, spinnennetz_trampolin: buildSpinnennetzTrampolin };
