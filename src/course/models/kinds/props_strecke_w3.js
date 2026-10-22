// Rennstrecken- (3-6 Bergrennen) und Schienen-Requisiten (3-7 Herbstwald-Schalttafeln) Welt 3. Eigene Gestaltung.
// Maßstab Meter, Ursprung = Mitte der Unterseite (Ausnahmen genannt), Fahr-/Blickrichtung +X; state darf ein String sein.
//
// boost_rampe    Boost-Schräge: Keil von x = 0 (Fuß) bis length, steigt auf height; dunkelblaue Fahrbahn mit Lauflicht-
//                Pfeilen, gelb-blau gestreifte Flanken. **Ursprung = Mitte der Fußkante.**
//                opts { length (2,5), width (1,6), height (0,8) }  state –
// boost_tor      Boost-Tor: Bogen über der Fahrbahn (Durchfahrt nach +X), Pfeil-Lauflichter rund um den Bogen,
//                Sockel mit Leuchtstreifen.  opts { width (lichte Weite z, 4) }  state –
// sprungfeld     Sprungfeld Ø 1,6 m: gelbe Platte mit rotem Ring und weißem Doppelpfeil nach oben, flach (0,22 m).
//                state { anim: 'idle'|'launch', n? }  launch: Platte schnellt hoch, Ringwelle (0,6 s).
// pilztrampolin  Pilz-Trampolin ≈1,25 m: dicker türkiser Hut (Ø 2,4 m) mit lindgrünen Punkten auf cremefarbenem Stiel.
//                Hut-Oberkante bei y ≈ 1,25.  state { anim: 'idle'|'bounce', n? }  bounce: Hut federt nach (0,9 s).
// bande          Kart-Bande: rot-weiße Polsterblöcke mit Rolle oben auf grauem Sockel, 0,8 m hoch.
//                Verlauf x = 0 … length.  opts { length (4) }  state –
// start_bogen    Start-/Zielbogen: zwei karierte Pfeiler, Banner mit Zielflaggen-Muster, drei Ampellampen, Ballons.
//                Durchfahrt nach +X.  opts { width (lichte Weite z, 8) }  state { anim: 'idle'|'go' }  go: Lampen grün.
// schalttafel    Schalttafel (3-7): Metallplattform 3 × 3 m mit Pfeil-Anzeige, Warnkante und Rollenwagen auf der Schiene.
//                **Ursprung = Schienen-Oberkante unter der Mitte**; Tafel-Oberkante bei y = 0,75.
//                opts { size (Kante, 3) }  state { anim: 'idle'|'active'|'off', dir (1 = fährt nach +X, −1 = −X) }
//                active: Pfeile laufen in Fahrtrichtung, Rollen drehen; off: dunkel.
// schiene        Schiene (3-7): orange Rohrschiene mit Halteklammern und Endpuffern. **Schienen-Oberkante y = 0.**
//                opts { kind: 'gerade'|'bogen', length (gerade, 4), radius (bogen: Viertelbogen von +X nach +Z, 3),
//                       posts (Höhe der Stützen unter der Schiene, 0 = keine) }  state –
// schaltblock    Schaltblock 1 m (kehrt die Schienen um): Block mit drehbarer Pfeilscheibe – blau → (+X) bzw. rot ← (−X).
//                state { anim: 'idle'|'bump', dir (1|−1), n? }  bump: hüpft; Richtungswechsel: Scheibe dreht sich (0,3 s).

import {
  THREE, TAU, Build, cached, vcol, basic, std, mesh, joint, makeModel, Clock, damp, clamp, mix, smoothstep, instMesh,
  setInst, glowSprite, metal,
} from '../lib/kit.js';
import { Puffs, alongY, odd } from '../lib/kit_w3.js';

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
function chevronGeo(w, t = 0.16) {
  return cached(`w3:chev:${w}:${t}`, () => {
    const s = new THREE.Shape();
    const a = w * 0.42, d = 0.2;
    s.moveTo(-d, a); s.lineTo(-d + t, a); s.lineTo(d + t, 0); s.lineTo(-d + t, -a); s.lineTo(-d, -a); s.lineTo(d, 0); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    return g;
  });
}
/** Lauflicht über Instanzfarben (orange → hellgelb), dir = Laufrichtung. */
function runLights(inst, n, t, speed = 6, dir = 1) {
  const c = new THREE.Color(), lo = new THREE.Color(0xff7a1a), hi = new THREE.Color(0xfff6a0);
  for (let i = 0; i < n; i++) {
    const k = Math.pow(Math.max(0, Math.sin(t * speed - i * 1.1 * dir)), 3);
    inst.setColorAt(i, c.copy(lo).lerp(hi, k));
  }
  inst.instanceColor.needsUpdate = true;
}

// =============================================================================================
// Boost-Schräge, Boost-Tor
// =============================================================================================
function rampGeo(L, W, H) {
  return cached(`w3:ramp:${L}:${W}:${H}`, () => {
    const b = new Build();
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.lineTo(L, 0); s.lineTo(L, H); s.lineTo(0, 0.02);
    const g = new THREE.ExtrudeGeometry(s, { depth: W, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1 });
    g.translate(0, 0, -W / 2);
    const slope = Math.atan2(H, L);
    b.add(g, (x, y, z, nx, ny, nz) => (Math.abs(nz) > 0.7 ? (odd((x - y) * 3) ? 0xffc21a : 0x1a2a8a) : ny > 0.5 ? 0x24339a : 0x1a2266), null);
    // gelbe Randstreifen auf der Fahrbahn
    for (const sz of [1, -1]) b.box(Math.hypot(L, H) - 0.1, 0.02, 0.07, 0xffd21f, { p: [L / 2, H / 2 + 0.035, sz * (W / 2 - 0.1)], r: [0, 0, slope] }, 0, 1);
    return b.geometry();
  });
}
function buildBoostRampe(opts = {}) {
  const L = clamp(Number(opts.length ?? 2.5), 0.8, 20), W = clamp(Number(opts.width ?? 1.6), 0.6, 12), H = clamp(Number(opts.height ?? 0.8), 0.1, 6);
  const root = new THREE.Group();
  const body = mesh(rampGeo(L, W, H), vcol(0.4, {}, 'w3ramp'), {}, true);
  body.receiveShadow = true;
  const slope = Math.atan2(H, L), len = Math.hypot(L, H);
  const n = Math.max(2, Math.round(len / 0.62));
  const chev = instMesh(chevronGeo(W), basic('w3:chev', { color: 0xffffff }), n, len, H / 2);
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    setInst(chev, i, u * L, u * H + 0.04, 0, 0, 0, slope);
    chev.setColorAt(i, new THREE.Color(0xffd21f));
  }
  root.add(body, chev);
  const clk = new Clock();
  const update = (dt) => { clk.tick(dt, 'idle'); runLights(chev, n, clk.t); };
  return makeModel('boost_rampe', root, update, [chev]);
}
function gateGeo(W) {
  return cached(`w3:gate:${W}`, () => {
    const b = new Build();
    const R = W / 2 + 0.35;
    b.add(new THREE.TorusGeometry(R, 0.32, 14, 40, Math.PI), { v: (x, y, z, nx, ny) => mix(0xff6a1a, 0xffb21a, smoothstep(ny * 0.5 + 0.5)) }, { p: [0, 0.6, 0], r: [0, Math.PI / 2, 0] });
    for (const s of [1, -1]) {
      b.box(0.9, 0.6, 0.9, { v: (x, y, z, nx, ny) => mix(0x1a2266, 0x3a4ab8, smoothstep(ny * 0.5 + 0.5)) }, { p: [0, 0.3, s * R] }, 0.08, 1);
      b.box(0.92, 0.08, 0.92, 0xfff2a0, { p: [0, 0.45, s * R] }, 0.03, 1);
    }
    return b.geometry();
  });
}
function buildBoostTor(opts = {}) {
  const W = clamp(Number(opts.width ?? 4), 1.5, 20);
  const R = W / 2 + 0.35;
  const root = new THREE.Group();
  root.add(mesh(gateGeo(W), vcol(0.35, {}, 'w3gate'), {}, true));
  // Lauflicht-Birnen auf Vorder- und Rückseite des Bogens (laufen von beiden Füßen zur Mitte)
  const k = Math.max(6, Math.round(Math.PI * R / 0.42));
  const n = k * 2;
  const bulbs = instMesh(cached('w3:bulb', () => new THREE.SphereGeometry(0.11, 10, 8)), basic('w3:bulb', { color: 0xffffff }), n, R + 1, R / 2);
  for (let i = 0; i < k; i++) for (const s of [0, 1]) {
    const a = Math.PI * (i + 0.5) / k;
    setInst(bulbs, i * 2 + s, (s ? 1 : -1) * 0.3, 0.6 + Math.sin(a) * R, Math.cos(a) * R);
    bulbs.setColorAt(i * 2 + s, new THREE.Color(0xffd21f));
  }
  root.add(bulbs);
  const clk = new Clock();
  const c = new THREE.Color(), lo = new THREE.Color(0xff6a1a), hi = new THREE.Color(0xfffbe0);
  const update = (dt) => {
    clk.tick(dt, 'idle');
    for (let i = 0; i < k; i++) {
      const d = Math.min(i, k - 1 - i);   // Abstand zum Fuß
      const kk = Math.pow(Math.max(0, Math.sin(clk.t * 9 - d * 0.9)), 3);
      for (const s of [0, 1]) bulbs.setColorAt(i * 2 + s, c.copy(lo).lerp(hi, kk));
    }
    bulbs.instanceColor.needsUpdate = true;
  };
  return makeModel('boost_tor', root, update, [bulbs]);
}

// =============================================================================================
// Sprungfeld, Pilz-Trampolin
// =============================================================================================
function padBaseGeo() {
  return cached('w3:jumppad:base', () => {
    const b = new Build();
    b.cyl(0.8, 0.85, 0.12, { v: (x, y, z, nx, ny) => mix(0x2a2a3a, 0x5a5a6a, smoothstep(ny * 0.5 + 0.5)) }, { p: [0, 0.06, 0] }, 36);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; b.cyl(0.05, 0.05, 0.03, 0xffd21f, { p: [Math.cos(a) * 0.76, 0.125, Math.sin(a) * 0.76] }, 8); }
    return b.geometry();
  });
}
function padTopGeo() {
  return cached('w3:jumppad:top', () => {
    const b = new Build();
    b.cyl(0.68, 0.7, 0.1, { v: (x, y, z, nx, ny) => mix(0xffb21a, 0xffe24a, smoothstep(ny)) }, { p: [0, 0.05, 0] }, 36);
    b.torus(0.6, 0.045, 0xe8283a, { p: [0, 0.1, 0], r: [Math.PI / 2, 0, 0] }, 6, 36);
    // Doppelpfeil nach oben (liegt flach, zeigt nach +X)
    for (let k = 0; k < 2; k++) {
      const s = new THREE.Shape();
      s.moveTo(0.2, 0); s.lineTo(-0.05, 0.25); s.lineTo(-0.05, 0.12); s.lineTo(-0.2, 0.12); s.lineTo(-0.2, -0.12); s.lineTo(-0.05, -0.12); s.lineTo(-0.05, -0.25); s.closePath();
      b.extrude(s, 0.02, 0xffffff, { p: [-0.18 + k * 0.32, 0.105, 0], r: [-Math.PI / 2, 0, 0] }, 0.006, 1, 1);
    }
    return b.geometry();
  });
}
function buildSprungfeld() {
  const root = new THREE.Group();
  root.add(mesh(padBaseGeo(), vcol(0.4), {}, true));
  const top = joint([0, 0.12, 0], mesh(padTopGeo(), vcol(0.3), {}, true));
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xfff2a0, transparent: true, opacity: 0, depthWrite: false });
  const ring = mesh(cached('w3:padring', () => { const g = new THREE.RingGeometry(0.62, 0.75, 36); g.rotateX(-Math.PI / 2); return g; }), ringMat, { p: [0, 0.3, 0] });
  root.add(top, ring);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    if (st.n !== undefined && st.n !== clk.lastN) { clk.age = 0; clk.lastN = st.n; }
    const a = clk.age, la = anim === 'launch' && a < 0.6;
    top.position.y = 0.12 + (la ? Math.max(0, Math.sin(Math.min(1, a / 0.12) * Math.PI * 0.5)) * 0.25 * Math.exp(-a * 5) : 0);
    ring.visible = la;
    ring.scale.setScalar(1 + a * 3);
    ring.position.y = 0.3 + a * 1.5;
    ringMat.opacity = la ? 0.8 * (1 - a / 0.6) : 0;
  };
  return makeModel('sprungfeld', root, update, [ringMat], { initial: 'idle' });
}
function shroomCapGeo() {
  return cached('w3:shroomtramp:cap', () => {
    const b = new Build();
    const pts = [[0, -0.05], [0.9, -0.1], [1.15, -0.02], [1.22, 0.08], [1.18, 0.2], [1.0, 0.33], [0.7, 0.42], [0.35, 0.46], [0, 0.47]];
    b.lathe(pts, (x, y, z, nx, ny) => (ny < -0.5 ? 0xe8f8f0 : 0x1fc8b8), null, 40, 2);
    const hits = [[0, 1.4], [0.6, 0.6], [2.2, 0.6], [-2.2, 0.6], [-0.9, 0.55], [1.5, 0.3], [-1.5, 0.3], [2.9, 0.35], [0.3, 0.25], [-0.3, 0.25]];
    for (const [az, el] of hits) {
      const d = new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
      const p = new THREE.Vector3(d.x * 1.12, 0.12 + d.y * 0.36, d.z * 1.12);
      b.add(new THREE.SphereGeometry(1, 14, 6, 0, TAU, 0, Math.PI / 2), 0xb8f05a, alongY(p.clone().addScaledVector(d, -0.02), d, 0, [0.17, 0.05, 0.17]));
    }
    return b.geometry();
  });
}
const shroomStemGeo = () => cached('w3:shroomtramp:stem', () => {
  const b = new Build();
  b.lathe([[0.42, 0], [0.4, 0.15], [0.32, 0.4], [0.3, 0.7], [0.34, 0.82], [0, 0.82]], { v: (x, y) => mix(0xe8d2a8, 0xfff4dc, smoothstep(y / 0.8)) }, null, 24);
  return b.geometry();
});
function buildPilztrampolin() {
  const root = new THREE.Group();
  root.add(mesh(shroomStemGeo(), vcol(0.5), {}, true));
  const cap = joint([0, 0.8, 0], mesh(shroomCapGeo(), vcol(0.3), {}, true));
  cap.children[0].receiveShadow = true;
  root.add(cap);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    if (st.n !== undefined && st.n !== clk.lastN) { clk.age = 0; clk.lastN = st.n; }
    const a = clk.age;
    const s = anim === 'bounce' && a < 0.9 ? 1 - 0.35 * Math.exp(-a * 6) * Math.cos(a * 20) : 1 + Math.sin(clk.t * 2) * 0.01;
    cap.scale.set(1 + (1 - s) * 0.4, s, 1 + (1 - s) * 0.4);
  };
  return makeModel('pilztrampolin', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Bande, Start-/Zielbogen
// =============================================================================================
function bandeGeo(L) {
  return cached(`w3:bande:${L}`, () => {
    const b = new Build();
    b.box(L, 0.16, 0.6, 0x7a8090, { p: [L / 2, 0.08, 0] }, 0.04, 1);
    const n = Math.max(1, Math.round(L / 1));
    for (let i = 0; i < n; i++) {
      const c = i % 2 ? 0xffffff : 0xe8283a;
      b.box(L / n - 0.04, 0.5, 0.42, { v: (x, y, z, nx, ny) => mix(c, 0x000000, 0.12 * (1 - ny) * (Math.abs(nz2(nx, ny)) < 0.5 ? 1 : 0)) }, { p: [(i + 0.5) * (L / n), 0.42, 0] }, 0.12, 2);
    }
    b.cyl(0.1, 0.1, L, (x, y, z) => (Math.floor((y + L / 2) * 2) % 2 ? 0xffd21f : 0x2a2a3a), { p: [L / 2, 0.72, 0], r: [0, 0, Math.PI / 2] }, 12);
    return b.geometry();
  });
}
const nz2 = (nx, ny) => 1 - Math.abs(nx) - Math.abs(ny);
function buildBande(opts = {}) {
  const L = clamp(Number(opts.length ?? 4), 0.5, 60);
  const root = new THREE.Group();
  const m = mesh(bandeGeo(L), vcol(0.45, {}, 'w3bande'), {}, true);
  m.receiveShadow = true;
  root.add(m);
  return makeModel('bande', root, () => {});
}
function archGeo(W) {
  return cached(`w3:startarch:${W}`, () => {
    const b = new Build();
    const H = 4.6, z0 = W / 2 + 0.45;
    const checker = (x, y, z) => (odd(Math.floor(y * 2.5) + Math.floor((x + z) * 2.5)) ? 0x1a1a22 : 0xffffff);
    for (const s of [1, -1]) {
      b.box(0.8, H, 0.8, checker, { p: [0, H / 2, s * z0] }, 0.06, 1);
      b.box(1.0, 0.3, 1.0, 0xe8283a, { p: [0, 0.15, s * z0] }, 0.06, 1);
      // Ballontraube oben
      const cols = [0xe8283a, 0xffd21f, 0x2a7ae8];
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TAU;
        b.sphere(0.3, cols[i], { p: [Math.cos(a) * 0.25, H + 0.75 + (i % 2) * 0.15, s * z0 + Math.sin(a) * 0.25], s: [1, 1.15, 1] }, 14, 10);
        b.cyl(0.01, 0.01, 0.5, 0xffffff, { p: [Math.cos(a) * 0.12, H + 0.3, s * z0 + Math.sin(a) * 0.12] }, 4);
      }
    }
    // Banner mit Zielflaggen-Muster und Rahmen
    b.add(new THREE.BoxGeometry(0.25, 1.1, 2 * z0, 1, 6, Math.round(z0 * 10)), (x, y, z) => (odd(Math.floor((y + 0.55) * 5) + Math.floor((z + z0) * 5)) ? 0x1a1a22 : 0xffffff), { p: [0, H - 0.6, 0] });
    b.box(0.3, 0.1, 2 * z0 + 0.1, 0xe8283a, { p: [0, H - 0.02, 0] }, 0.03, 1);
    b.box(0.3, 0.1, 2 * z0 + 0.1, 0xe8283a, { p: [0, H - 1.18, 0] }, 0.03, 1);
    // Ampelkasten mittig
    b.box(0.35, 0.5, 1.5, 0x2a2a34, { p: [0.12, H + 0.25, 0] }, 0.08, 1);
    return b.geometry();
  });
}
function buildStartBogen(opts = {}) {
  const W = clamp(Number(opts.width ?? 8), 2, 30);
  const H = 4.6;
  const root = new THREE.Group();
  root.add(mesh(archGeo(W), vcol(0.4, {}, 'w3arch'), {}, true));
  const lampMat = [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ color: 0x441010 }));
  const lampGeo = cached('w3:archlamp', () => { const g = new THREE.SphereGeometry(0.16, 14, 10); return g; });
  const lamps = [0, 1, 2].map((i) => mesh(lampGeo, lampMat[i], { p: [0.3, H + 0.25, (i - 1) * 0.45] }));
  const glow = glowSprite(0x6aff6a, 1.6, 0.6); glow.position.set(0.5, H + 0.25, 0);
  root.add(...lamps, glow);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const go = anim === 'go';
    lampMat.forEach((m, i) => m.color.setHex(go ? 0x4aff5a : Math.floor(clk.t * 2) % 3 === i ? 0xff3a2a : 0x441010));
    glow.visible = go;
  };
  return makeModel('start_bogen', root, update, lampMat, { initial: 'idle' });
}

// =============================================================================================
// Schalttafel, Schiene, Schaltblock
// =============================================================================================
function boardGeo(S) {
  return cached(`w3:board:${S}`, () => {
    const b = new Build();
    const h = 0.25;
    b.box(S, h, S, { v: (x, y, z, nx, ny) => mix(0x4a5a7a, 0x8a9ab8, smoothstep(ny * 0.5 + 0.5)) }, { p: [0, 0.75 - h / 2, 0] }, 0.06, 1);
    // gelb-schwarze Warnkante
    for (const s of [1, -1]) {
      b.add(new THREE.BoxGeometry(S, 0.08, 0.12, Math.round(S * 8), 1, 1), (x) => (odd(x * 4) ? 0xffd21f : 0x1a1a22), { p: [0, 0.75 - 0.04, s * (S / 2 - 0.06)] });
      b.add(new THREE.BoxGeometry(0.12, 0.08, S - 0.24, 1, 1, Math.round(S * 8)), (x, y, z) => (odd(z * 4) ? 0xffd21f : 0x1a1a22), { p: [s * (S / 2 - 0.06), 0.75 - 0.04, 0] });
    }
    // Anzeige-Feld (dunkel), Rollenwagen unten
    b.box(S * 0.62, 0.02, S * 0.42, 0x101820, { p: [0, 0.755, 0] }, 0, 1);
    b.box(0.8, 0.32, 0.5, 0x3a3a48, { p: [0, 0.3, 0] }, 0.06, 1);
    b.box(0.25, 0.25, 0.25, 0x5a5a6a, { p: [0, 0.55, 0] }, 0.04, 1);
    return b.geometry();
  });
}
const rollerGeo = () => cached('w3:roller', () => {
  const b = new Build();
  b.cyl(0.13, 0.13, 0.14, 0x2a2a34, { r: [Math.PI / 2, 0, 0] }, 14);
  b.cyl(0.06, 0.06, 0.16, 0xd8dce8, { r: [Math.PI / 2, 0, 0] }, 8);
  for (const s of [1, -1]) b.cyl(0.16, 0.16, 0.02, 0xff6a1a, { p: [0, 0, s * 0.08], r: [Math.PI / 2, 0, 0] }, 14);
  return b.geometry();
});
function buildSchalttafel(opts = {}) {
  const S = clamp(Number(opts.size ?? 3), 1, 10);
  const root = new THREE.Group();
  const body = joint();
  body.add(mesh(boardGeo(S), vcol(0.35, { metalness: 0.2 }, 'w3board'), {}, true));
  body.children[0].receiveShadow = true;
  const rollers = instMesh(rollerGeo(), vcol(0.4), 2, 1, 0.2);
  const n = 3;
  const arrows = instMesh(chevronGeo(S * 0.36, 0.13), basic('w3:chev', { color: 0xffffff }), n, S, 0.8);
  for (let i = 0; i < n; i++) arrows.setColorAt(i, new THREE.Color(0xffd21f));
  body.add(rollers, arrows);
  root.add(body);
  const clk = new Clock();
  let roll = 0, d = 1;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, act = anim === 'active', off = anim === 'off';
    const dir = (st.dir ?? 1) < 0 ? -1 : 1;
    d = damp(d, dir, 12, dt);
    if (act) roll -= dt * 6 * dir;
    [-0.25, 0.25].forEach((x, i) => setInst(rollers, i, x, 0.13, 0, 0, 0, roll));
    rollers.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < n; i++) setInst(arrows, i, (i - 1) * S * 0.18 * Math.sign(d || 1), 0.77, 0, 0, d < 0 ? Math.PI : 0, 0);
    arrows.instanceMatrix.needsUpdate = true;
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const k = act ? Math.pow(Math.max(0, Math.sin(t * 7 - i * 1.6)), 2) : 0.15;
      arrows.setColorAt(i, off ? c.setHex(0x2a2a30) : c.setHex(0x3a6aff).lerp(new THREE.Color(0xbff0ff), k));
    }
    arrows.instanceColor.needsUpdate = true;
    body.position.y = act ? Math.abs(Math.sin(t * 22)) * 0.008 : 0;
  };
  return makeModel('schalttafel', root, update, [rollers, arrows], { initial: 'idle' });
}

function railGeo(kind, L, R, posts) {
  return cached(`w3:rail:${kind}:${L}:${R}:${posts}`, () => {
    const b = new Build();
    const rail = { v: (x, y, z, nx, ny) => mix(0xd8501a, 0xff9a3a, smoothstep(ny * 0.5 + 0.5)) };
    const r = 0.09;
    const pts = [];
    if (kind === 'bogen') { for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI / 2; pts.push([Math.sin(a) * R, -r, R - Math.cos(a) * R]); } }
    else { pts.push([0, -r, 0], [L / 2, -r, 0], [L, -r, 0]); }
    b.tube(pts, r, rail, null, kind === 'bogen' ? 40 : Math.max(8, Math.round(L * 3)), 10);
    // Klammern alle ≈1 m, Endpuffer
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    const len = curve.getLength(), k = Math.max(2, Math.round(len));
    for (let i = 0; i <= k; i++) {
      const p = curve.getPointAt(i / k), tng = curve.getTangentAt(i / k);
      const yaw = Math.atan2(-tng.z, tng.x);
      b.box(0.08, 0.1, 0.3, 0x5a5a6a, { p: [p.x, p.y - 0.1, p.z], r: [0, yaw, 0] }, 0.02, 1);
      if (posts > 0 && i % 2 === 0) b.cyl(0.06, 0.08, posts, 0x6a6a7a, { p: [p.x, p.y - 0.15 - posts / 2, p.z] }, 8);
    }
    for (const u of [0, 1]) { const p = curve.getPointAt(u); b.sphere(0.14, 0xffd21f, { p: [p.x, p.y, p.z] }, 12, 8); }
    return b.geometry();
  });
}
function buildSchiene(opts = {}) {
  const kind = opts.kind === 'bogen' ? 'bogen' : 'gerade';
  const L = clamp(Number(opts.length ?? 4), 0.5, 60), R = clamp(Number(opts.radius ?? 3), 0.5, 30), posts = clamp(Number(opts.posts ?? 0), 0, 30);
  const root = new THREE.Group();
  root.add(mesh(railGeo(kind, L, R, posts), vcol(0.3, { metalness: 0.25 }, 'w3rail'), {}, true));
  return makeModel('schiene', root, () => {});
}

function switchBlockGeo() {
  return cached('w3:switchblock', () => {
    const b = new Build();
    b.box(1, 1, 1, { v: (x, y, z, nx, ny) => mix(0x5a5a7a, 0x9a9ab8, smoothstep(ny * 0.5 + 0.5)) }, { p: [0, 0.5, 0] }, 0.1, 2);
    for (const s of [1, -1]) b.torus(0.36, 0.05, 0xffd21f, { p: [0, 0.5, s * 0.505] }, 6, 32);
    b.torus(0.36, 0.05, 0xffd21f, { p: [0.505, 0.5, 0], r: [0, Math.PI / 2, 0] }, 6, 32);
    b.torus(0.36, 0.05, 0xffd21f, { p: [-0.505, 0.5, 0], r: [0, Math.PI / 2, 0] }, 6, 32);
    return b.geometry();
  });
}
function arrowDiscGeo() {
  return cached('w3:arrowdisc', () => {
    const b = new Build();
    // Scheibe in der XY-Ebene (zeigt nach ±Z): eine Hälfte blau mit Pfeil →, Rückseite rot mit Pfeil ←
    for (const s of [1, -1]) {
      b.cyl(0.32, 0.32, 0.02, s > 0 ? 0x2a6ae8 : 0xe8283a, { p: [0, 0, s * 0.01], r: [Math.PI / 2, 0, 0] }, 28);
      const sh = new THREE.Shape();
      sh.moveTo(0.22, 0); sh.lineTo(0.02, 0.18); sh.lineTo(0.02, 0.07); sh.lineTo(-0.2, 0.07); sh.lineTo(-0.2, -0.07); sh.lineTo(0.02, -0.07); sh.lineTo(0.02, -0.18); sh.closePath();
      b.extrude(sh, 0.02, 0xffffff, { p: [0, 0, s * 0.03], r: [s > 0 ? 0 : Math.PI, 0, 0] }, 0.005, 1, 1);
    }
    return b.geometry();
  });
}
function buildSchaltblock() {
  const root = new THREE.Group();
  const body = joint();
  body.add(mesh(switchBlockGeo(), vcol(0.35, { metalness: 0.15 }, 'w3sblock'), {}, true));
  // je eine Pfeilscheibe auf den Seiten ±Z (dreht um Y beim Richtungswechsel)
  const discs = [1, -1].map((s) => { const j = joint([0, 0.5, s * 0.53], mesh(arrowDiscGeo(), vcol(0.3))); j.scale.z = s; return j; });
  body.add(...discs);
  root.add(body);
  const clk = new Clock();
  let ang = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    if (st.n !== undefined && st.n !== clk.lastN) { clk.age = 0; clk.lastN = st.n; }
    const a = clk.age;
    body.position.y = anim === 'bump' && a < 0.25 ? Math.sin((a / 0.25) * Math.PI) * 0.3 : 0;
    const dir = (st.dir ?? 1) < 0 ? -1 : 1;
    ang = damp(ang, dir > 0 ? 0 : Math.PI, 10, dt);
    discs.forEach((d) => { d.rotation.y = ang; });
  };
  return makeModel('schaltblock', root, update, [], { initial: 'idle' });
}

export const MODELS = {
  boost_rampe: buildBoostRampe,
  boost_tor: buildBoostTor,
  sprungfeld: buildSprungfeld,
  pilztrampolin: buildPilztrampolin,
  bande: buildBande,
  start_bogen: buildStartBogen,
  schalttafel: buildSchalttafel,
  schiene: buildSchiene,
  schaltblock: buildSchaltblock,
};
