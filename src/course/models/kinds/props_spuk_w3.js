// Spukhaus-Requisiten Welt 3 (3-3 Spukvilla). Eigene Gestaltung. Maßstab Meter, Ursprung = Mitte der Unterseite
// (Ausnahmen genannt), Vorderseite nach +X; state darf ein String sein.
//
// spuk_treppe     verschiebbare Holztreppe mit violettem Läufer und Messingstangen, Laufrollen unten. Steigt nach +X an:
//                 erste Stufe bei x = 0 … run, oben bei x = steps·0,6. **Ursprung = Mitte der unteren Vorderkante**.
//                 opts  { steps (4), width (Breite z, 2), rise (Stufenhöhe, 0,5), run (Stufentiefe, 0,6) }
//                 state { anim: 'idle'|'move' }  move: ruckelt, Rollen drehen, Staub.
//                 root.userData.height → Gesamthöhe.
// kronleuchter    Kronleuchter: Messingkette (opts.chain m), Ring mit sechs Armen, Kerzen mit Flammen, Kristalltropfen.
//                 **Ursprung = Aufhängung an der Decke** (hängt nach −Y).
//                 opts  { chain (1,2) }  state { anim: 'idle'|'swing'|'off' }  swing: pendelt (±0,3 rad, 1,6 s); off: aus.
// bilderrahmen    Spuk-Gemälde im goldenen Prunkrahmen, Bild zeigt nach +X (hängt an einer Wand in der YZ-Ebene).
//                 opts  { motif: 'spuk'|'portraet'|'landschaft' (Standard 'spuk'), size: [breite, höhe] ([1,4, 1,8]) }
//                 state { anim: 'idle'|'watch' }  watch: die Augen im Bild (spuk, portraet) folgen hin und her.
// kerze           Kerze in Messingschale (count 1) oder dreiarmiger Leuchter (count 3), flackernde Flammen.
//                 opts  { count: 1|3 }  state { anim: 'on'|'off' }
// spinnweben      Eck-Spinnennetz in der YZ-Ebene (Vorderseite +X) mit kleiner Spinne am Faden.
//                 **Ursprung = Raumecke oben** (Netz spannt nach −Y und +Z).  opts { size (1,2) }  state –
// buecherregal    hohes Bücherregal (verschiebbar): dunkles Holz, Kranzleiste, vier Böden voller bunter Bücher,
//                 Kristallkugel und Kerze.  opts { width (2), height (2,8) }  state { anim: 'idle'|'shake' }
// spuk_sofa       Spuk-Sofa (Lift): pflaumenfarbener Samt, geknöpfte Lehne, goldene Klauenfüße ≈2,2 × 1,0 m.
//                 state { anim: 'idle'|'float' }  float: schwebt (0,25 m) mit violettem Schein.
// spuk_tuer       Flügeltür im Rahmen (2,2 × 3,0 m), Bogen oben, Messingknäufe, Klopfer; dunkler Durchgang.
//                 state { open: 0..1 }  (Flügel schwenken nach +X auf)
// zielmast_spuk   falscher Zielmast (3-3): sieht aus wie der Zielmast (Steinblock, Mast, Fahne, Stern), nur blasser.
//                 opts  { height (6) }  state { anim: 'idle'|'reveal' }  reveal: Fahne bekommt ein Spukgesicht, steigt
//                 auf, alles wackelt und verblasst in 1,2 s (danach unsichtbar).

import {
  THREE, TAU, Build, cached, vcol, basic, std, mesh, joint, eyes, makeModel, Clock, Blinker, damp, clamp, mix,
  smoothstep, instMesh, setInst, glowSprite, canvasTexture, metal, puffyStarGeo,
} from '../lib/kit.js';
import { Puffs, fadeMats, setOpacity, alongY } from '../lib/kit_w3.js';

const WOOD = { dark: 0x4a2a1e, mid: 0x6e3e26, light: 0x9a5e36 };
const brass = () => metal('w3:brass', { color: 0xe0b040, metalness: 0.7, roughness: 0.3, emissive: 0x1a1000 }, 1);
const flameMat = () => basic('w3:flame', { vertexColors: true });
function flameGeo() {
  return cached('w3:flame', () => {
    const b = new Build();
    b.sphere(1, { v: (x, y) => mix(0xff7a1a, 0xfff6c0, smoothstep(0.6 - y * 0.6)) }, { p: [0, 0.05, 0], s: [0.035, 0.07, 0.035] }, 10, 8);
    b.cone(0.03, 0.06, { v: (x, y) => mix(0xffd84a, 0xffffff, smoothstep(y / 0.06 + 0.5)) }, { p: [0, 0.12, 0] }, 8);
    return b.geometry();
  });
}

// =============================================================================================
// Treppe
// =============================================================================================
function stairsGeo(n, W, rise, run) {
  return cached(`w3:stairs:${n}:${W}:${rise}:${run}`, () => {
    const b = new Build();
    const H = n * rise, L = n * run;
    for (let i = 0; i < n; i++) {
      const x0 = i * run, h = (i + 1) * rise;
      // Stufenkörper (Holz), Läufer (violett) mit Goldkante, Messingstange
      b.box(run, h, W - 0.16, { v: (x, y, z, nx, ny) => (ny > 0.5 ? mix(WOOD.mid, WOOD.light, 0.4) : mix(WOOD.dark, WOOD.mid, smoothstep(y / h + 0.5))) }, { p: [x0 + run / 2, h / 2, 0] }, 0.03, 1);
      b.box(run + 0.01, 0.03, W * 0.62, 0x6a2a8a, { p: [x0 + run / 2, h + 0.01, 0] }, 0.012, 1);
      b.box(0.04, rise * 0.95, W * 0.62, 0x5a1f7a, { p: [x0 + 0.005, h - rise / 2, 0] }, 0.012, 1);
      for (const s of [1, -1]) b.box(run + 0.01, 0.032, 0.03, 0xffc21a, { p: [x0 + run / 2, h + 0.012, s * W * 0.31] }, 0.01, 1);
      b.cyl(0.018, 0.018, W * 0.7, 0xe0b040, { p: [x0 + 0.03, h + 0.02, 0], r: [Math.PI / 2, 0, 0] }, 8);
    }
    // Wangen (Seitenbretter) mit Schnitzkante
    for (const s of [1, -1]) {
      const sh = new THREE.Shape();
      sh.moveTo(0, 0); sh.lineTo(L, 0); sh.lineTo(L, H + 0.08);
      for (let i = n - 1; i >= 0; i--) { sh.lineTo((i + 1) * run, (i + 1) * rise + 0.08); sh.lineTo(i * run, (i + 1) * rise + 0.08); }
      sh.lineTo(0, 0);
      b.extrude(sh, 0.08, { v: (x, y, z, nx, ny) => mix(WOOD.dark, WOOD.mid, smoothstep(Math.abs(nz(nx, ny)))) }, { p: [0, 0, s * (W / 2 - 0.04)] }, 0.015, 2, 1);
    }
    return b.geometry();
  });
}
const nz = (nx, ny) => 1 - Math.abs(nx) - Math.abs(ny);
const casterGeo = () => cached('w3:caster', () => {
  const b = new Build();
  b.cyl(0.07, 0.07, 0.05, 0x2a2a34, { r: [Math.PI / 2, 0, 0] }, 12);
  b.cyl(0.03, 0.03, 0.06, 0xe0b040, { r: [Math.PI / 2, 0, 0] }, 8);
  return b.geometry();
});
function buildSpukTreppe(opts = {}) {
  const n = clamp(Math.round(opts.steps ?? 4), 1, 16), W = clamp(Number(opts.width ?? 2), 0.6, 8);
  const rise = clamp(Number(opts.rise ?? 0.5), 0.1, 2), run = clamp(Number(opts.run ?? 0.6), 0.2, 2);
  const root = new THREE.Group();
  const body = joint([0, 0.08, 0]);
  const m = mesh(stairsGeo(n, W, rise, run), vcol(0.55, {}, 'w3wood'), {}, true);
  m.receiveShadow = true;
  body.add(m);
  const L = n * run;
  const wheels = instMesh(casterGeo(), vcol(0.4), 4, L + 1, 0.1);
  const wp = [[0.15, 1], [0.15, -1], [L - 0.15, 1], [L - 0.15, -1]];
  const dust = new Puffs(8, 0xb8a8c8, { opacity: 0.6, radius: L + 1, cy: 0.3 });
  root.add(body, wheels, dust.mesh);
  root.userData.height = n * rise + 0.08;
  const clk = new Clock();
  let roll = 0, emit = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, mv = anim === 'move';
    if (mv) roll += dt * 8;
    body.position.y = 0.08 + (mv ? Math.abs(Math.sin(t * 25)) * 0.012 : 0);
    body.rotation.x = mv ? Math.sin(t * 19) * 0.006 : 0;
    wp.forEach(([x, s], i) => setInst(wheels, i, x, 0.07, s * (W / 2 - 0.2), 0, 0, -roll));
    wheels.instanceMatrix.needsUpdate = true;
    if (mv) { emit -= dt; if (emit <= 0) { emit = 0.15; dust.burst([Math.random() * L, 0.05, (Math.random() - 0.5) * W], { count: 2, speed: 0.5, up: 0.3, size: 0.12, life: 0.7, spread: 0.1 }); } }
    dust.step(dt);
  };
  return makeModel('spuk_treppe', root, update, [wheels, dust], { initial: 'idle' });
}

// =============================================================================================
// Kronleuchter
// =============================================================================================
function chandelierGeo() {
  return cached('w3:chandelier', () => {
    const b = new Build();
    // Mittelsäule (Drehkörper), Ring, sechs geschwungene Arme mit Kerzentellern
    b.lathe([[0, -0.75], [0.1, -0.72], [0.14, -0.62], [0.07, -0.5], [0.12, -0.4], [0.06, -0.25], [0.08, -0.1], [0.03, 0], [0, 0.0]], 0xe0b040, null, 18);
    b.torus(0.62, 0.03, 0xe0b040, { p: [0, -0.55, 0], r: [Math.PI / 2, 0, 0] }, 6, 40);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU, c = Math.cos(a), s = Math.sin(a);
      b.tube([[c * 0.08, -0.5, s * 0.08], [c * 0.35, -0.62, s * 0.35], [c * 0.6, -0.55, s * 0.6], [c * 0.7, -0.42, s * 0.7]], 0.022, 0xe0b040, null, 14, 6);
      b.cyl(0.07, 0.04, 0.05, 0xe0b040, { p: [c * 0.7, -0.4, s * 0.7] }, 12);
      b.cyl(0.035, 0.04, 0.2, { v: (x, y) => mix(0xf4e6c8, 0xfffaf0, smoothstep(y / 0.2 + 0.5)) }, { p: [c * 0.7, -0.28, s * 0.7] }, 10);
      // Kristalltropfen am Ring
      const a2 = a + Math.PI / 6;
      b.add(new THREE.OctahedronGeometry(0.045, 0), { v: (x, y) => mix(0x8adcff, 0xffffff, smoothstep(y / 0.045)) }, { p: [Math.cos(a2) * 0.62, -0.66, Math.sin(a2) * 0.62], s: [1, 1.8, 1] });
    }
    b.add(new THREE.OctahedronGeometry(0.07, 0), { v: (x, y) => mix(0x8adcff, 0xffffff, smoothstep(y / 0.07)) }, { p: [0, -0.86, 0], s: [1, 1.8, 1] });
    return b.geometry();
  });
}
function chainGeo(L) {
  return cached(`w3:chain:${L}`, () => {
    const b = new Build();
    const k = Math.max(2, Math.round(L / 0.12));
    for (let i = 0; i < k; i++) b.torus(0.045, 0.013, 0xc89a30, { p: [0, -i * (L / k) - 0.05, 0], r: [0, i % 2 ? Math.PI / 2 : 0, 0], s: [0.8, 1.3, 1] }, 5, 10);
    b.cyl(0.14, 0.1, 0.06, 0xc89a30, { p: [0, -0.02, 0] }, 14);
    return b.geometry();
  });
}
function buildKronleuchter(opts = {}) {
  const L = clamp(Number(opts.chain ?? 1.2), 0.1, 8);
  const root = new THREE.Group();
  const pend = joint();
  const chain = mesh(chainGeo(L), vcol(0.3, { metalness: 0.5 }, 'w3brassV'), {}, false);
  const body = joint([0, -L, 0], mesh(chandelierGeo(), vcol(0.28, { metalness: 0.45 }, 'w3brassV'), {}, true));
  const fl = instMesh(flameGeo(), flameMat(), 6, 1.2, -0.2);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; setInst(fl, i, Math.cos(a) * 0.7, -0.18, Math.sin(a) * 0.7); }
  const glow = glowSprite(0xffc860, 2.2, 0.45); glow.position.y = -0.3;
  body.add(fl, glow);
  pend.add(chain, body);
  root.add(pend);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, off = anim === 'off';
    const amp = anim === 'swing' ? 0.3 : 0.02;
    pend.rotation.z = Math.sin(t * TAU / 1.6) * amp;
    pend.rotation.x = Math.cos(t * TAU / 2.1) * amp * 0.3;
    fl.visible = !off; glow.visible = !off;
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU, f = 1 + Math.sin(t * 17 + i * 2) * 0.12; setInst(fl, i, Math.cos(a) * 0.7, -0.18, Math.sin(a) * 0.7, 0, 0, Math.sin(t * 11 + i) * 0.1, [f, f * (1 + Math.sin(t * 23 + i) * 0.1), f]); }
    fl.instanceMatrix.needsUpdate = true;
    glow.scale.setScalar(2.2 + Math.sin(t * 13) * 0.1);
  };
  return makeModel('kronleuchter', root, update, [fl], { initial: 'idle' });
}

// =============================================================================================
// Bilderrahmen
// =============================================================================================
const MOTIFS = {
  spuk: (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h * 0.42, 10, w / 2, h / 2, h * 0.7);
    g.addColorStop(0, '#6a4a9a'); g.addColorStop(1, '#1e1238');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // Spukgeist-Porträt (Zwiebelform mit Flammenspitze, Augen leer – die echten Augen sind 3D)
    ctx.fillStyle = '#e8dcff';
    ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.14); ctx.quadraticCurveTo(w * 0.86, h * 0.42, w * 0.78, h * 0.7); ctx.quadraticCurveTo(w * 0.5, h * 0.86, w * 0.22, h * 0.7); ctx.quadraticCurveTo(w * 0.14, h * 0.42, w * 0.5, h * 0.14); ctx.fill();
    ctx.fillStyle = '#3a1450'; ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.62, w * 0.12, h * 0.05, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#ff9fd0'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(w * (0.5 + s * 0.2), h * 0.56, w * 0.05, h * 0.02, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#c8b0ff'; for (let i = 0; i < 22; i++) { ctx.beginPath(); ctx.arc((i * 97) % w, (i * 53) % (h * 0.3), 2, 0, TAU); ctx.fill(); }
  },
  portraet: (ctx, w, h) => {
    ctx.fillStyle = '#3a2a3e'; ctx.fillRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w / 2, h * 0.4, 5, w / 2, h * 0.45, h * 0.6);
    g.addColorStop(0, 'rgba(160,120,90,0.9)'); g.addColorStop(1, 'rgba(40,20,30,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // vornehme Katzen-Baronin mit Perlenkette (eigene Figur)
    ctx.fillStyle = '#6a2a4a'; ctx.beginPath(); ctx.ellipse(w / 2, h * 0.95, w * 0.42, h * 0.3, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#9a9aa8'; ctx.beginPath(); ctx.ellipse(w / 2, h * 0.46, w * 0.26, h * 0.2, 0, 0, TAU); ctx.fill();
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(w * (0.5 + s * 0.12), h * 0.32); ctx.lineTo(w * (0.5 + s * 0.24), h * 0.16); ctx.lineTo(w * (0.5 + s * 0.26), h * 0.36); ctx.fill(); }
    ctx.fillStyle = '#e8e4ee'; ctx.beginPath(); ctx.ellipse(w / 2, h * 0.53, w * 0.1, h * 0.06, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff8aa8'; ctx.beginPath(); ctx.arc(w / 2, h * 0.5, w * 0.022, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff6f0'; for (let i = 0; i < 9; i++) { const a = Math.PI * (0.15 + 0.7 * i / 8); ctx.beginPath(); ctx.arc(w / 2 + Math.cos(a) * w * 0.17, h * 0.66 + Math.sin(a) * h * 0.06, w * 0.022, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#2a1a2a'; ctx.beginPath(); ctx.ellipse(w / 2, h * 0.27, w * 0.2, h * 0.04, 0, 0, TAU); ctx.fill(); ctx.fillRect(w * 0.4, h * 0.13, w * 0.2, h * 0.14);
  },
  landschaft: (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1a1e48'); g.addColorStop(0.6, '#4a3a7a'); g.addColorStop(1, '#2a3a2a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff6c8'; ctx.beginPath(); ctx.arc(w * 0.72, h * 0.22, w * 0.11, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1a1e48'; ctx.beginPath(); ctx.arc(w * 0.68, h * 0.2, w * 0.1, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1c2a20'; ctx.beginPath(); ctx.moveTo(0, h * 0.75); ctx.quadraticCurveTo(w * 0.3, h * 0.6, w * 0.6, h * 0.72); ctx.quadraticCurveTo(w * 0.85, h * 0.8, w, h * 0.7); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
    ctx.fillStyle = '#2a2040'; ctx.fillRect(w * 0.3, h * 0.48, w * 0.22, h * 0.2);
    ctx.beginPath(); ctx.moveTo(w * 0.27, h * 0.5); ctx.lineTo(w * 0.41, h * 0.36); ctx.lineTo(w * 0.55, h * 0.5); ctx.fill();
    ctx.fillRect(w * 0.47, h * 0.38, w * 0.04, h * 0.1);
    ctx.fillStyle = '#ffd84a'; for (const [x, y] of [[0.34, 0.55], [0.44, 0.55], [0.39, 0.62]]) ctx.fillRect(w * x, h * y, w * 0.035, h * 0.035);
  },
};
function frameGeo(W, H) {
  return cached(`w3:frame:${W}:${H}`, () => {
    const b = new Build();
    const t = 0.16;
    const gold = { v: (x, y, z, nx, ny) => mix(0xb8801a, 0xffd860, smoothstep(nx * 0.6 + ny * 0.3 + 0.4)) };
    b.box(0.12, t, W + t, gold, { p: [0, H / 2 + t / 2 - 0.01, 0] }, 0.05, 2);
    b.box(0.12, t, W + t, gold, { p: [0, -H / 2 - t / 2 + 0.01, 0] }, 0.05, 2);
    for (const s of [1, -1]) b.box(0.12, H + t * 2, t, gold, { p: [0, 0, s * (W / 2 + t / 2 - 0.01)] }, 0.05, 2);
    for (const sy of [1, -1]) for (const sz of [1, -1]) b.sphere(0.09, 0xffd860, { p: [0.04, sy * (H / 2 + t / 2), sz * (W / 2 + t / 2)] }, 12, 8);
    b.sphere(1, 0xffd860, { p: [0.04, H / 2 + t + 0.03, 0], s: [0.06, 0.1, 0.2] }, 14, 8);
    b.box(0.04, H, W, 0x2a1a2a, { p: [-0.04, 0, 0] }, 0, 1);
    return b.geometry();
  });
}
function buildBilderrahmen(opts = {}) {
  const motif = MOTIFS[opts.motif] ? opts.motif : 'spuk';
  const sz = Array.isArray(opts.size) ? opts.size : [1.4, 1.8];
  const W = clamp(Number(sz[0]) || 1.4, 0.4, 6), H = clamp(Number(sz[1]) || 1.8, 0.4, 6);
  const root = new THREE.Group();
  const holder = joint([0, H / 2 + 0.16, 0]);
  const frame = mesh(frameGeo(W, H), vcol(0.3, { metalness: 0.35 }, 'w3goldframe'), {}, true);
  const tex = canvasTexture(`w3:motif:${motif}`, 256, Math.round(256 * 1.3), MOTIFS[motif]);
  const canvas = mesh(cached(`w3:canvas:${W}:${H}`, () => { const g = new THREE.PlaneGeometry(W, H); g.rotateY(Math.PI / 2); return g; }), std(`w3:canvas:${motif}`, { map: tex, roughness: 0.7 }), { p: [0.0, 0, 0] });
  holder.add(frame, canvas);
  let eye = null;
  if (motif !== 'landschaft') {
    const ey = motif === 'spuk' ? 0.08 : 0.07, ez = W * (motif === 'spuk' ? 0.14 : 0.1), er = W * (motif === 'spuk' ? 0.075 : 0.05);
    eye = eyes([{ p: [0.0, H * ey, ez], r: er, sy: 1.2, dir: [1, 0, 0] }, { p: [0.0, H * ey, -ez], r: er, sy: 1.2, dir: [1, 0, 0] }],
      { key: `w3:paint:${motif}:${W}:${H}`, iris: motif === 'spuk' ? 0xffc21a : 0x2a8a4a, pupil: 0.6, slit: motif !== 'spuk', depth: 0.3 });
    holder.add(eye);
  }
  root.add(holder);
  const clk = new Clock(), blink = new Blinker();
  const base = eye ? eye.position.clone() : null;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    if (!eye) return;
    const t = clk.t, watch = anim === 'watch';
    const look = watch ? Math.sin(t * 1.4) : 0;
    eye.position.set(base.x, base.y + (watch ? Math.sin(t * 0.9) * 0.012 : 0), base.z + look * W * 0.035);
    eye.userData.blink(blink.update(dt));
  };
  return makeModel('bilderrahmen', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Kerze / Leuchter
// =============================================================================================
function candleGeo(count) {
  return cached(`w3:candle:${count}`, () => {
    const b = new Build();
    const wax = (h) => ({ v: (x, y) => mix(0xf0e0c0, 0xfffaf0, smoothstep(y / h + 0.5)) });
    const candle = (x, y, z, h) => {
      b.cyl(0.045, 0.05, h, wax(h), { p: [x, y + h / 2, z] }, 12);
      for (let i = 0; i < 3; i++) b.sphere(0.018, 0xfff6e6, { p: [x + Math.cos(i * 2.1) * 0.045, y + h - 0.03 - i * 0.03, z + Math.sin(i * 2.1) * 0.045], s: [1, 1.8, 1] }, 6, 5);
      b.cyl(0.004, 0.004, 0.03, 0x2a2020, { p: [x, y + h + 0.015, z] }, 4);
    };
    const gold = { v: (x, y, z, nx, ny) => mix(0xa87018, 0xffd860, smoothstep(ny * 0.5 + 0.5)) };
    if (count === 1) {
      b.cyl(0.14, 0.12, 0.03, gold, { p: [0, 0.015, 0] }, 18);
      b.torus(0.12, 0.012, 0xffd860, { p: [0.14, 0.05, 0], r: [0, Math.PI / 2, 0] }, 5, 12);
      b.cyl(0.06, 0.06, 0.04, gold, { p: [0, 0.05, 0] }, 12);
      candle(0, 0.07, 0, 0.26);
    } else {
      b.lathe([[0.18, 0], [0.18, 0.03], [0.06, 0.06], [0.04, 0.4], [0.07, 0.45], [0.03, 0.5], [0, 0.5]], gold, null, 18);
      for (const s of [1, -1]) b.tube([[0, 0.42, 0], [0, 0.4, s * 0.15], [0, 0.5, s * 0.25], [0, 0.56, s * 0.26]], 0.02, 0xe0b040, null, 12, 6);
      for (const [z, y] of [[0.26, 0.56], [0, 0.5], [-0.26, 0.56]]) { b.cyl(0.06, 0.04, 0.04, gold, { p: [0, y + 0.02, z] }, 12); candle(0, y + 0.04, z, 0.24); }
    }
    return b.geometry();
  });
}
function buildKerze(opts = {}) {
  const count = Number(opts.count) === 3 ? 3 : 1;
  const root = new THREE.Group();
  root.add(mesh(candleGeo(count), vcol(0.35, { metalness: 0.2 }, 'w3candle'), {}, true));
  const tips = count === 1 ? [[0, 0.37, 0]] : [[0, 0.87, 0.26], [0, 0.81, 0], [0, 0.87, -0.26]];
  const fl = instMesh(flameGeo(), flameMat(), tips.length, 1, 0.6);
  const glow = glowSprite(0xffc060, count === 1 ? 0.8 : 1.3, 0.55); glow.position.set(0, tips[1 % tips.length][1] + 0.08, 0);
  root.add(fl, glow);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'on';
    clk.tick(dt, anim);
    const t = clk.t, on = anim !== 'off';
    fl.visible = on; glow.visible = on;
    tips.forEach(([x, y, z], i) => { const f = 1 + Math.sin(t * 19 + i * 2) * 0.12; setInst(fl, i, x, y, z, Math.sin(t * 9 + i) * 0.08, 0, Math.sin(t * 13 + i) * 0.12, [f, f * (1 + Math.sin(t * 27 + i) * 0.12), f]); });
    fl.instanceMatrix.needsUpdate = true;
    glow.scale.setScalar((count === 1 ? 0.8 : 1.3) * (1 + Math.sin(t * 15) * 0.06));
  };
  return makeModel('kerze', root, update, [fl], { initial: 'on' });
}

// =============================================================================================
// Spinnweben
// =============================================================================================
function webTexture() {
  return canvasTexture('w3:web', 256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    // Ecke oben links (0,0); Speichen und durchhängende Bögen
    const R = w * 0.98, n = 7;
    const ang = (i) => (i / (n - 1)) * (Math.PI / 2);
    for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(ang(i)) * R, Math.sin(ang(i)) * R); ctx.stroke(); }
    for (let r = 0.18; r < 1; r += 0.15) {
      ctx.beginPath();
      for (let i = 0; i < n - 1; i++) {
        const a0 = ang(i), a1 = ang(i + 1), am = (a0 + a1) / 2, sag = 0.88;
        const x0 = Math.cos(a0) * R * r, y0 = Math.sin(a0) * R * r, x1 = Math.cos(a1) * R * r, y1 = Math.sin(a1) * R * r;
        if (i === 0) ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(Math.cos(am) * R * r * sag, Math.sin(am) * R * r * sag, x1, y1);
      }
      ctx.stroke();
    }
  });
}
const spiderGeo = () => cached('w3:spider', () => {
  const b = new Build();
  b.sphere(0.07, 0x2a2238, { p: [0, 0, 0] }, 12, 10);
  b.sphere(0.05, 0x3a3048, { p: [0.0, 0.07, 0] }, 10, 8);
  for (const s of [1, -1]) {
    b.sphere(0.022, 0xffffff, { p: [0.05, 0.0, s * 0.03] }, 8, 6);
    b.sphere(0.012, 0x101018, { p: [0.068, 0.0, s * 0.03] }, 6, 5);
    for (let i = 0; i < 4; i++) b.tube([[0, 0, s * 0.04], [0.02 - i * 0.03, 0.04, s * 0.11], [0.03 - i * 0.04, -0.06, s * 0.15]], 0.008, 0x2a2238, null, 6, 4);
  }
  return b.geometry();
});
function buildSpinnweben(opts = {}) {
  const S = clamp(Number(opts.size ?? 1.2), 0.3, 5);
  const root = new THREE.Group();
  const web = mesh(cached(`w3:webPlane:${S}`, () => {
    const g = new THREE.PlaneGeometry(S, S);
    g.translate(S / 2, -S / 2, 0); // Ecke im Ursprung, Netz nach +x/−y
    g.rotateY(-Math.PI / 2);      // Ebene YZ, Vorderseite +X; Netz nach +Z, −Y
    return g;
  }), std('w3:web', { map: webTexture(), transparent: true, alphaTest: 0.1, side: THREE.DoubleSide, roughness: 0.6, depthWrite: false }));
  const thread = mesh(cached('w3:thread', () => { const g = new THREE.CylinderGeometry(0.004, 0.004, 1, 4); g.translate(0, -0.5, 0); return g; }), basic('w3:thread', { color: 0xffffff }), { p: [0.02, -S * 0.25, S * 0.45] });
  const spider = mesh(spiderGeo(), vcol(0.4), {}, true);
  root.add(web, thread, spider);
  const clk = new Clock();
  const update = (dt) => {
    clk.tick(dt, 'idle');
    const t = clk.t;
    const len = S * 0.35 + Math.sin(t * 0.9) * S * 0.12;
    thread.scale.y = len;
    spider.position.set(0.02, -S * 0.25 - len - 0.07, S * 0.45);
    spider.rotation.y = Math.sin(t * 0.7) * 0.6;
  };
  return makeModel('spinnweben', root, update);
}

// =============================================================================================
// Bücherregal
// =============================================================================================
function shelfGeo(W, H) {
  return cached(`w3:shelf:${W}:${H}`, () => {
    const b = new Build();
    const D = 0.5;
    const wood = { v: (x, y, z, nx, ny) => mix(WOOD.dark, WOOD.mid, smoothstep(nx * 0.4 + ny * 0.3 + 0.5)) };
    b.box(0.05, H, W, 0x2e1810, { p: [-D / 2 + 0.03, H / 2, 0] }, 0, 1);
    for (const s of [1, -1]) b.box(D, H, 0.08, wood, { p: [0, H / 2, s * (W / 2 - 0.04)] }, 0.02, 1);
    b.box(D + 0.12, 0.14, W + 0.14, wood, { p: [0.03, H + 0.04, 0] }, 0.04, 1);
    b.box(D + 0.06, 0.12, W + 0.06, wood, { p: [0.02, 0.06, 0] }, 0.03, 1);
    const shelves = 4, gap = (H - 0.25) / shelves;
    const colors = [0xd8283a, 0x2a6ad8, 0x3aa84a, 0xffb21a, 0x8a3ad8, 0x1fa8a8, 0xe8603a, 0x6a3a1a];
    let seed = 7;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let k = 0; k < shelves; k++) {
      const y0 = 0.12 + k * gap;
      b.box(D - 0.04, 0.05, W - 0.14, wood, { p: [0, y0, 0] }, 0.015, 1);
      let z = -W / 2 + 0.1;
      while (z < W / 2 - 0.16) {
        const bw = 0.06 + rnd() * 0.07, bh = gap * (0.55 + rnd() * 0.32), tilt = rnd() < 0.12 ? 0.25 : 0;
        if (k === 2 && z > W * 0.15 && z < W * 0.15 + 0.35) { z += 0.35; continue; }
        const c = colors[Math.floor(rnd() * colors.length)];
        b.box(D * 0.75, bh, bw, { v: (x, y, zz, nx) => (nx > 0.8 && Math.abs(y) < bh * 0.12 ? mix(c, 0xffd860, 0.7) : mix(c, 0x000000, 0.15 * (1 - nx))) }, { p: [0.02, y0 + 0.025 + bh / 2, z + bw / 2], r: [tilt, 0, 0] }, 0.012, 1);
        z += bw + 0.008 + (tilt ? 0.04 : 0);
      }
      if (k === 2) {
        b.sphere(0.13, { v: (x, y) => mix(0x8a5ad8, 0xe8d8ff, smoothstep(y / 0.13 + 0.3)) }, { p: [0.03, y0 + 0.2, W * 0.15 + 0.17] }, 16, 12);
        b.cyl(0.09, 0.11, 0.06, 0xe0b040, { p: [0.03, y0 + 0.055, W * 0.15 + 0.17] }, 12);
      }
    }
    return b.geometry();
  });
}
function buildBuecherregal(opts = {}) {
  const W = clamp(Number(opts.width ?? 2), 0.6, 8), H = clamp(Number(opts.height ?? 2.8), 0.8, 8);
  const root = new THREE.Group();
  const body = joint();
  const m = mesh(shelfGeo(W, H), vcol(0.6, {}, 'w3shelf'), {}, true);
  m.receiveShadow = true;
  body.add(m);
  root.add(body);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const k = anim === 'shake' ? 1 : 0;
    body.rotation.x = Math.sin(clk.t * 27) * 0.01 * k;
    body.position.z = Math.sin(clk.t * 31) * 0.02 * k;
  };
  return makeModel('buecherregal', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Spuk-Sofa
// =============================================================================================
function sofaGeo() {
  return cached('w3:sofa', () => {
    const b = new Build();
    const velvet = { v: (x, y, z, nx, ny) => mix(0x4a1a5a, 0x9a4ab8, smoothstep(ny * 0.5 + nx * 0.3 + 0.45)) };
    b.box(0.95, 0.32, 2.1, velvet, { p: [0, 0.42, 0] }, 0.12, 2);
    for (const s of [1, -1]) b.box(0.8, 0.18, 0.98, velvet, { p: [0.07, 0.66, s * 0.5] }, 0.09, 2);
    b.box(0.3, 0.75, 2.2, velvet, { p: [-0.38, 0.85, 0] }, 0.14, 2);
    for (const s of [1, -1]) b.box(0.95, 0.32, 0.26, velvet, { p: [0, 0.72, s * 1.07] }, 0.13, 2);
    for (const s of [1, -1]) b.cyl(0.13, 0.13, 0.95, velvet, { p: [0, 0.89, s * 1.07], r: [0, 0, Math.PI / 2] }, 14);
    // Knöpfe in der Lehne
    for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) b.sphere(0.03, 0xffd860, { p: [-0.22, 0.86 + j * 0.22, -0.8 + i * 0.4 + j * 0.2 - 0.1] }, 8, 6);
    // goldene Klauenfüße und Zierleiste
    for (const sx of [1, -1]) for (const sz of [1, -1]) {
      b.cyl(0.05, 0.035, 0.22, 0xe0b040, { p: [sx * 0.36, 0.16, sz * 0.95] }, 10);
      b.sphere(0.06, 0xffd860, { p: [sx * 0.36 + 0.02, 0.05, sz * 0.95], s: [1.3, 0.8, 1.1] }, 10, 8);
    }
    b.box(0.04, 0.05, 2.0, 0xe0b040, { p: [0.47, 0.3, 0] }, 0.015, 1);
    return b.geometry();
  });
}
function buildSpukSofa() {
  const root = new THREE.Group();
  const body = joint();
  body.add(mesh(sofaGeo(), vcol(0.75, {}, 'w3sofa'), {}, true));
  const glow = glowSprite(0xb06aff, 2.6, 0.5); glow.position.y = 0.1;
  root.add(body, glow);
  const clk = new Clock();
  let up = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, fl = anim === 'float';
    up = damp(up, fl ? 1 : 0, 3, dt);
    body.position.y = up * (0.25 + Math.sin(t * 1.8) * 0.06);
    body.rotation.set(Math.sin(t * 1.3) * 0.03 * up, 0, Math.sin(t * 1.1) * 0.03 * up);
    glow.visible = up > 0.05;
    glow.scale.set(2.6 * up, 1.2 * up, 1);
  };
  return makeModel('spuk_sofa', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Spuk-Tür
// =============================================================================================
const DOOR_W = 2.2, DOOR_H = 3.0;
function doorFrameGeo() {
  return cached('w3:doorframe', () => {
    const b = new Build();
    const wood = { v: (x, y, z, nx, ny) => mix(WOOD.dark, WOOD.mid, smoothstep(nx * 0.5 + ny * 0.3 + 0.4)) };
    for (const s of [1, -1]) b.box(0.3, DOOR_H - 0.4, 0.25, wood, { p: [0, (DOOR_H - 0.4) / 2, s * (DOOR_W / 2 + 0.12)] }, 0.05, 1);
    b.add(new THREE.TorusGeometry(DOOR_W / 2 + 0.12, 0.14, 8, 24, Math.PI), wood, { p: [0, DOOR_H - 0.4, 0], r: [0, Math.PI / 2, 0] });
    b.box(0.06, DOOR_H, DOOR_W + 0.1, 0x0e0814, { p: [-0.12, DOOR_H / 2 - 0.05, 0] }, 0, 1);
    b.add(new THREE.CircleGeometry(DOOR_W / 2, 20, 0, Math.PI), 0x0e0814, { p: [-0.09, DOOR_H - 0.4, 0], r: [0, Math.PI / 2, 0] });
    b.box(0.5, 0.08, DOOR_W + 0.7, 0x5a5a6a, { p: [0.1, 0.04, 0] }, 0.03, 1);
    return b.geometry();
  });
}
function doorLeafGeo() {
  return cached('w3:doorleaf', () => {
    const b = new Build();
    const w = DOOR_W / 2 - 0.02, h = DOOR_H - 0.45;
    // Flügel: Scharnier bei z = 0, Flügel nach −z (lokal), Paneele
    b.box(0.1, h, w, { v: (x, y, z, nx) => mix(0x5a2e1c, 0x8a4e2e, smoothstep(nx * 0.5 + 0.5)) }, { p: [0, h / 2, -w / 2] }, 0.03, 1);
    for (let i = 0; i < 3; i++) b.box(0.03, h * 0.24, w * 0.66, 0x6e3a22, { p: [0.05, h * (0.2 + i * 0.3), -w / 2] }, 0.015, 1);
    b.sphere(0.06, 0xe0b040, { p: [0.08, h * 0.45, -w + 0.15] }, 10, 8);
    b.torus(0.08, 0.015, 0xe0b040, { p: [0.08, h * 0.7, -w + 0.2], r: [0, Math.PI / 2, 0] }, 6, 14);
    return b.geometry();
  });
}
function buildSpukTuer() {
  const root = new THREE.Group();
  const frame = mesh(doorFrameGeo(), vcol(0.6, {}, 'w3door'), {}, true);
  frame.receiveShadow = true;
  const leafMat = vcol(0.55, {}, 'w3door');
  const leaves = [1, -1].map((s) => {
    const j = joint([0, 0.05, s * DOOR_W / 2], mesh(doorLeafGeo(), leafMat, {}, true));
    j.scale.z = s;   // gespiegelt: Flügel zeigen zur Mitte
    return j;
  });
  root.add(frame, ...leaves);
  const update = (dt, st) => {
    const o = clamp(Number(st.open ?? (st.anim === 'open' ? 1 : 0)), 0, 1);
    leaves.forEach((l, i) => { l.rotation.y = (i ? 1 : -1) * smoothstep(o) * 1.6; });
  };
  return makeModel('spuk_tuer', root, update);
}

// =============================================================================================
// Falscher Zielmast
// =============================================================================================
function fakePoleGeo(H) {
  return cached(`w3:fakepole:${H}`, () => {
    const b = new Build();
    b.box(1, 1, 1, { v: (x, y, z, nx, ny) => mix(0x7a7488, 0xb8b2c8, smoothstep(ny * 0.5 + 0.5)) }, { p: [0, 0.5, 0] }, 0.08, 2);
    b.cyl(0.09, 0.09, H - 1, (x, y) => (Math.sin(y * 7 + Math.atan2(0, 1)) > 0.6 ? 0xc8b4e8 : 0xf2eefa), { p: [0, 1 + (H - 1) / 2, 0] }, 12);
    // Spirale (blass-lila statt korallenrot)
    const pts = [];
    for (let i = 0; i <= 80; i++) { const a = i * 0.45, y = 1 + (i / 80) * (H - 1.1); pts.push([Math.cos(a) * 0.1, y, Math.sin(a) * 0.1]); }
    b.tube(pts, 0.025, 0xb49ae0, null, 160, 5);
    b.add(puffyStarGeo(0.24, 0.11, 0.12, 0.04), 0xf0e6a8, { p: [0, H + 0.2, 0], r: [0, Math.PI / 2, 0] });
    return b.geometry();
  });
}
function ghostFlagGeo() {
  return cached('w3:ghostflag', () => {
    const b = new Build();
    // Fahne als Tuch (wellig) – wird beim Enttarnen zum Spuk-Laken
    const g = new THREE.PlaneGeometry(1.2, 0.8, 12, 6);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i); P.setZ(i, Math.sin(x * 4) * 0.06 * (x + 0.6)); if (P.getY(i) < -0.35) P.setY(i, P.getY(i) + Math.sin(x * 14) * 0.04); }
    g.computeVertexNormals();
    b.add(g, { v: (x, y) => mix(0xd8ccf0, 0xffffff, smoothstep(y + 0.5)) }, { p: [0.0, 0, 0.7], r: [0, Math.PI / 2, 0] });
    return b.geometry();
  });
}
function buildZielmastSpuk(opts = {}) {
  const H = clamp(Number(opts.height ?? 6), 2, 14);
  const root = new THREE.Group();
  const wob = joint();
  const poleMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, transparent: true, opacity: 1 });
  const pole = mesh(fakePoleGeo(H), poleMat, {}, true);
  const flagMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 1, emissive: 0x000000 });
  const flag = joint([0, H - 0.6, 0], mesh(ghostFlagGeo(), flagMat, {}, true));
  const face = eyes([{ p: [0.03, 0.08, 0.55], r: 0.09, sy: 1.3, dir: [1, 0, 0] }, { p: [0.03, 0.08, 0.85], r: 0.09, sy: 1.3, dir: [1, 0, 0] }], { key: 'w3:ghostflag', iris: 0xffc21a, pupil: 0.6, depth: 0.4 });
  const faceMats = fadeMats(face);
  flag.children[0].add(face);
  wob.add(pole, flag);
  root.add(wob);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, a = clk.age, rev = anim === 'reveal';
    flag.children[0].rotation.y = Math.sin(t * 2.4) * 0.12;
    face.visible = rev;
    if (!rev) { setOpacity([poleMat, flagMat], 1); flag.position.y = H - 0.6; wob.rotation.z = 0; flagMat.emissive.setRGB(0, 0, 0); return; }
    const k = clamp(a / 1.2, 0, 1);
    wob.rotation.z = Math.sin(a * 20) * 0.05 * (1 - k);
    flag.position.y = H - 0.6 + smoothstep(k) * 1.5;
    flagMat.emissive.setRGB(0.25, 0.15, 0.4);
    const op = 1 - smoothstep((k - 0.3) / 0.7);
    setOpacity([poleMat, flagMat], op);
    setOpacity(faceMats, op);
    wob.visible = op > 0.01;
  };
  return makeModel('zielmast_spuk', root, update, [poleMat, flagMat, ...faceMats], { initial: 'idle' });
}

export const MODELS = {
  spuk_treppe: buildSpukTreppe,
  kronleuchter: buildKronleuchter,
  bilderrahmen: buildBilderrahmen,
  kerze: buildKerze,
  spinnweben: buildSpinnweben,
  buecherregal: buildBuecherregal,
  spuk_sofa: buildSpukSofa,
  spuk_tuer: buildSpukTuer,
  zielmast_spuk: buildZielmastSpuk,
};
