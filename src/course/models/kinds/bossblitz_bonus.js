// Modelle des Boss-Marathons B-12 (Präzisierung Gegner Bonuswelten): Boss-Schlüssel, Schmuck der Hub-Warp-Boxen (Boss-Plakette,
// Vorhängeschloss, Deckel, Erledigt-Haken, Leuchtring) und der Sternenstaub-Kranz der Nacht-Weltraum-Fassung der Endgegner.
// Maßstab Meter, Ursprung = Fußpunkt, Blick nach +X (Plakette blickt zur Kamera +Z). state darf ein String sein.
//
// bossblitz_schluessel  ≈1,25 m  großer goldener Schlüssel mit Stern im Griff-Ring und blauem Edelstein, schwebt, dreht sich,
//   funkelt. **Ursprung = Boden unter dem Schlüssel** (Unterkante des Barts 0,35 m darüber).
//   state { anim: 'idle' | 'rise' (progress 0..1: steigt aus dem Boden, wächst) | 'collect' (progress 0..1: hüpft, dreht schnell,
//           schrumpft weg) }
// bossblitz_box_deko  Schmuck einer Hub-Warp-Box (Box 1,6 × 1,2 × 1,6 m, Ursprung = Mitte der Box-Unterseite; die Box selbst ist das
//   Registry-Modell 'warp_box'): Boss-Plakette (Ø 1,2 m, Bild des Endgegners) auf einem Goldstab hinter der Box, Deckel mit
//   Goldstern (zu, wenn erledigt oder verschlossen), großes Vorhängeschloss vorn (verschlossen), grüner Haken auf der Plakette
//   (erledigt), pulsierender Leuchtring am Boden (bereit).
//   opts  { icon: 'kippquader' | 'schatten' | 'lavafelsen' | 'wirbel' | 'schlangen' | 'blase' | 'stern' (Standard), color }
//   state { locked (0|1), open (0..1: Schloss springt auf – Bügel hoch, Schloss fällt und verblasst), done (0|1: Deckel zu,
//           Haken), glow (0..1 Leuchtring) }
// sternenstaub  Kranz aus funkelnden Sternchen (ein Punktwolken-Mesh, additiv) – Nacht-Weltraum-Fassung der Endgegner (B-12).
//   opts  { radius (1,8), height (2,4), count (22), color (0xbfd8ff) }
//   state { k (0..1 Stärke), spin (rad/s, Standard 0,6) }

import {
  THREE, TAU, Build, cached, vcol, basic, mesh, joint, makeModel, Clock, damp, clamp, mix, smoothstep, lerp, metal, gold,
  canvasTexture, sparkleTexture, glowSprite, sparkleSprite, puffyStarGeo,
} from '../lib/kit.js';
import { keyShape, puffyGeo } from '../lib/w5Geos.js';
import { num, prog, memo } from '../lib/w8Geos.js';

// =============================================================================================
// Boss-Schlüssel
// =============================================================================================
const KEY_S = 1.3;
function keyGeos() {
  return memo('bonus:bb:key', () => {
    const g = puffyGeo(keyShape(), 0.12, 0.045, 10, 3);
    g.scale(KEY_S, KEY_S, KEY_S);
    g.rotateZ(-Math.PI / 2);          // Griff oben, Bart unten
    const star = puffyStarGeo(0.13, 0.06, 0.07, 0.025);
    star.translate(0, 0.25 * KEY_S, 0);
    const gem = new THREE.SphereGeometry(0.055, 12, 8);
    gem.scale(1, 1, 0.7);
    gem.translate(0, 0.05, 0.085);
    return { key: g, star, gem };
  });
}
function buildSchluessel() {
  const root = new THREE.Group();
  const G = keyGeos();
  const spinJ = joint([0, 0.95, 0]);
  const key = mesh(G.key, gold(), {}, true);
  const star = mesh(cached('bonus:bb:keystar:c', () => { const b = new Build(); b.add(G.star.clone(), 0xff4a8a); return b.geometry(); }), vcol(0.3, { emissive: 0x6a1030 }, 'bonuskeystar'), {}, false);
  const gem = mesh(cached('bonus:bb:gem:c', () => { const b = new Build(); b.add(G.gem.clone(), 0x4ab0ff); b.add(G.gem.clone().translate(0, 0, -0.17), 0x4ab0ff); return b.geometry(); }), vcol(0.15, { emissive: 0x0a2a6a }, 'bonuskeygem'), {}, false);
  spinJ.add(key, star, gem);
  const glow = glowSprite(0xffe68a, 1.9, 0.5); glow.position.set(0, 0.95, 0);
  const sp1 = sparkleSprite(0xffffff, 0.35), sp2 = sparkleSprite(0xfff2a0, 0.28);
  root.add(spinJ, glow, sp1, sp2);
  const clk = new Clock();
  let s = 1;
  const update = (dt, st) => {
    let anim = st.anim ?? 'idle';
    if (!['idle', 'rise', 'collect'].includes(anim)) anim = 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    let y = 0.95 + Math.sin(t * 2.2) * 0.08, spin = t * 1.6, want = 1;
    if (anim === 'rise') { const p = prog(st, clk, 0.8); want = Math.max(0.05, smoothstep(p)); y = lerp(-0.4, 0.95, smoothstep(p)); spin = t * 6; }
    else if (anim === 'collect') { const p = prog(st, clk, 0.6); y = 0.95 + Math.sin(p * Math.PI) * 0.8; spin = t * 14; want = Math.max(0.01, 1 - smoothstep((p - 0.4) / 0.6)); }
    s = anim === 'idle' ? damp(s, 1, 8, dt) : want;
    spinJ.position.y = y;
    spinJ.rotation.y = spin;
    spinJ.scale.setScalar(s);
    glow.position.y = y; glow.scale.setScalar(1.9 * s * (0.9 + Math.sin(t * 3) * 0.1));
    sp1.position.set(Math.cos(t * 1.7) * 0.55, y + 0.35 + Math.sin(t * 2.3) * 0.2, Math.sin(t * 1.7) * 0.55);
    sp2.position.set(Math.cos(t * 1.3 + 2) * 0.5, y - 0.2 + Math.sin(t * 1.9) * 0.25, Math.sin(t * 1.3 + 2) * 0.5);
    sp1.material.rotation = t; sp1.scale.setScalar(0.35 * s * (0.6 + 0.4 * Math.abs(Math.sin(t * 4))));
    sp2.scale.setScalar(0.28 * s * (0.6 + 0.4 * Math.abs(Math.cos(t * 3.3))));
  };
  return makeModel('bossblitz_schluessel', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Boss-Plaketten (Bilder der Endgegner, Leinwand-Texturen)
// =============================================================================================
const ICONS = ['kippquader', 'schatten', 'lavafelsen', 'wirbel', 'schlangen', 'blase', 'stern'];

function star5(ctx, x, y, R, r, fill, stroke) {
  ctx.beginPath();
  for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r : R; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = 4; ctx.strokeStyle = stroke; ctx.stroke(); }
}
function eyesAt(ctx, x, y, dx, r, iris = '#2a2a6a', angry = 0) {
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x + s * dx, y, r * 0.8, r, 0, 0, TAU); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#1a1030'; ctx.stroke();
    ctx.fillStyle = iris; ctx.beginPath(); ctx.ellipse(x + s * dx + s * -2, y + 2, r * 0.45, r * 0.55, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x + s * dx - 3, y - r * 0.3, r * 0.18, 0, TAU); ctx.fill();
    if (angry) { ctx.lineWidth = 7; ctx.strokeStyle = '#2a1410'; ctx.beginPath(); ctx.moveTo(x + s * dx - s * r, y - r * 1.25); ctx.lineTo(x + s * dx + s * r * 0.6, y - r * 0.8 - angry); ctx.stroke(); }
  }
}
function crown(ctx, x, y, w, h) {
  ctx.fillStyle = '#ffd23a'; ctx.strokeStyle = '#a86a0a'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2, y - h * 0.55); ctx.lineTo(x - w / 4, y - h * 0.2); ctx.lineTo(x, y - h);
  ctx.lineTo(x + w / 4, y - h * 0.2); ctx.lineTo(x + w / 2, y - h * 0.55); ctx.lineTo(x + w / 2, y); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff3a6a'; ctx.beginPath(); ctx.arc(x, y - h * 0.32, h * 0.12, 0, TAU); ctx.fill();
}
function drawIcon(ctx, icon, c) {
  const x = c, y = c;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  switch (icon) {
    case 'kippquader': {
      ctx.fillStyle = '#e8c88a'; ctx.strokeStyle = '#8a5a26'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.roundRect(x - 52, y - 46, 104, 112, 14); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(138,90,38,0.45)'; ctx.lineWidth = 3;
      for (const yy of [-10, 26]) { ctx.beginPath(); ctx.moveTo(x - 50, y + yy); ctx.lineTo(x + 50, y + yy); ctx.stroke(); }
      crown(ctx, x, y - 44, 88, 40);
      eyesAt(ctx, x, y + 2, 22, 14, '#1a3a8a', 6);
      ctx.strokeStyle = '#4a2a10'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, y + 52, 18, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      break;
    }
    case 'schatten': {
      ctx.fillStyle = '#2e2458';
      ctx.beginPath(); ctx.moveTo(x - 58, y - 18); ctx.lineTo(x - 46, y - 74); ctx.lineTo(x - 12, y - 46); ctx.lineTo(x + 12, y - 46); ctx.lineTo(x + 46, y - 74); ctx.lineTo(x + 58, y - 18); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y + 6, 60, 0, TAU); ctx.fill();
      ctx.fillStyle = '#efe6ff'; ctx.beginPath(); ctx.roundRect(x - 56, y - 14, 112, 34, 16); ctx.fill();
      for (const s of [-1, 1]) { ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.ellipse(x + s * 22, y + 3, 13, 10, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#1a1030'; ctx.beginPath(); ctx.ellipse(x + s * 22, y + 3, 3.5, 9, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#ff5ab0'; ctx.beginPath(); ctx.ellipse(x + 50, y - 62, 18, 11, 0.5, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(x + 30, y - 72, 14, 9, -0.6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x + 41, y - 66, 6, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffb0d8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y + 34, 10, 0.2, Math.PI - 0.2); ctx.stroke();
      break;
    }
    case 'lavafelsen': {
      const g = ctx.createRadialGradient(x - 18, y - 6, 8, x, y + 10, 70);
      g.addColorStop(0, '#6a5a5a'); g.addColorStop(1, '#2a2020');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y + 14, 64, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ff7a1a'; ctx.lineWidth = 5;
      for (const [a, b, cc, d] of [[-50, 30, -20, 50], [30, 55, 52, 20], [-10, 70, 14, 46], [40, -8, 60, 6]]) { ctx.beginPath(); ctx.moveTo(x + a, y + b); ctx.lineTo(x + cc, y + d); ctx.stroke(); }
      ctx.fillStyle = '#ff6a1a'; ctx.beginPath(); ctx.ellipse(x, y - 40, 58, 18, 0, Math.PI, 0); ctx.fill();
      crown(ctx, x, y - 50, 70, 36);
      eyesAt(ctx, x, y + 8, 24, 13, '#ff6a1a', 5);
      break;
    }
    case 'wirbel': {
      for (const s of [-1, 1]) { ctx.fillStyle = '#ff8a2a'; ctx.strokeStyle = '#9a4a0a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x + s * 72, y + 26, 28, 0, TAU); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = '#d8a060'; ctx.strokeStyle = '#7a4a1a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, y + 12, 56, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(122,74,26,0.6)'; ctx.lineWidth = 5;
      for (const r of [-30, -48]) { ctx.beginPath(); ctx.ellipse(x, y + 12, 56, 56 + r * 0.2, 0, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
      ctx.fillStyle = '#f4dcb0'; ctx.beginPath(); ctx.ellipse(x, y + 30, 34, 26, 0, 0, TAU); ctx.fill();
      eyesAt(ctx, x, y + 2, 20, 13, '#3a1a0a', 7);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x - 14, y + 36); ctx.lineTo(x + 14, y + 36); ctx.lineTo(x, y + 48); ctx.closePath(); ctx.fill();
      break;
    }
    case 'schlangen': {
      for (const [s, fill, dark] of [[-1, '#3ec44a', '#1a6a20'], [1, '#ff6ab4', '#a82a70']]) {
        const cx = x + s * 36;
        ctx.fillStyle = fill; ctx.strokeStyle = dark; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(cx - 14, y + 90); ctx.quadraticCurveTo(cx + s * 30, y + 50, cx, y + 20); ctx.lineTo(cx + 20, y + 22); ctx.quadraticCurveTo(cx + s * 40, y + 60, cx + 16, y + 90); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(cx + 4, y + 2, 34, 28, 0, 0, TAU); ctx.fill(); ctx.stroke();
        crown(ctx, cx + 4, y - 22, 40, 26);
        eyesAt(ctx, cx + 4, y - 2, 13, 9, '#1a1a1a', 3);
        ctx.strokeStyle = '#ff2a3a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx + 4, y + 24); ctx.lineTo(cx + 4, y + 38); ctx.lineTo(cx - 2, y + 44); ctx.moveTo(cx + 4, y + 38); ctx.lineTo(cx + 10, y + 44); ctx.stroke();
      }
      break;
    }
    case 'blase': {
      const g = ctx.createLinearGradient(x, y - 30, x, y + 70);
      g.addColorStop(0, '#ff9ae8'); g.addColorStop(1, '#c03aa8');
      ctx.fillStyle = g; ctx.strokeStyle = '#7a1a6a'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.roundRect(x - 56, y - 26, 112, 96, 26); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(x - 30, y - 6, 14, 9, -0.4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#7a3ad8'; ctx.strokeStyle = '#3a1478'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(x, y - 30, 46, 34, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#b88aff'; ctx.lineWidth = 4;
      for (const dx of [-24, 0, 24]) { ctx.beginPath(); ctx.moveTo(x + dx, y - 31); ctx.quadraticCurveTo(x + dx * 1.2, y - 50, x + dx * 0.5, y - 62); ctx.stroke(); }
      eyesAt(ctx, x, y + 18, 22, 13, '#6a1a8a', 0);
      ctx.strokeStyle = '#5a1040'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y + 40, 14, 0.2, Math.PI - 0.2); ctx.stroke();
      break;
    }
    default:
      star5(ctx, x, y + 4, 70, 30, '#ffd23a', '#a86a0a');
      eyesAt(ctx, x, y + 6, 16, 10, '#1a1a4a', 0);
  }
}
/** Plaketten-Textur je Bild und Variante ('normal' | 'done'). */
function iconTexture(icon, variant) {
  const ic = ICONS.includes(icon) ? icon : 'stern';
  return canvasTexture(`bonus:bb:icon:${ic}:${variant}`, 256, 256, (ctx, w, h) => {
    const c = w / 2;
    ctx.clearRect(0, 0, w, h);
    const bg = ctx.createRadialGradient(c, c - 20, 10, c, c, c);
    bg.addColorStop(0, '#2a3a9a'); bg.addColorStop(1, '#0a0c34');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(c, c, c - 4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 22; i++) { const a = i * 2.4, r = 40 + ((i * 37) % 70); ctx.globalAlpha = 0.35 + (i % 3) * 0.2; ctx.beginPath(); ctx.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, 1.5 + (i % 2), 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    ctx.save(); ctx.beginPath(); ctx.arc(c, c, c - 10, 0, TAU); ctx.clip();
    drawIcon(ctx, ic, c);
    ctx.restore();
    ctx.lineWidth = 12; ctx.strokeStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(c, c, c - 8, 0, TAU); ctx.stroke();
    if (variant === 'done') {
      ctx.fillStyle = 'rgba(8,16,40,0.5)'; ctx.beginPath(); ctx.arc(c, c, c - 14, 0, TAU); ctx.fill();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 46; ctx.beginPath(); ctx.moveTo(c - 58, c + 2); ctx.lineTo(c - 14, c + 46); ctx.lineTo(c + 64, c - 46); ctx.stroke();
      ctx.strokeStyle = '#3ee05a'; ctx.lineWidth = 30; ctx.beginPath(); ctx.moveTo(c - 58, c + 2); ctx.lineTo(c - 14, c + 46); ctx.lineTo(c + 64, c - 46); ctx.stroke();
    }
  });
}

// =============================================================================================
// Schmuck der Hub-Warp-Box
// =============================================================================================
const PLAQ_R = 0.6, PLAQ_Y = 2.75, PLAQ_Z = -1.05;
function decoGeos() {
  return memo('bonus:bb:deco', () => {
    const frame = new Build();
    frame.cyl(0.05, 0.065, PLAQ_Y - PLAQ_R + 0.05, { v: (x, y) => mix(0xb87a0a, 0xffe08a, smoothstep(y + 0.5)) }, { p: [0, (PLAQ_Y - PLAQ_R) / 2, PLAQ_Z - 0.04] }, 10);
    frame.sphere(0.12, 0xffd23a, { p: [0, 0.06, PLAQ_Z - 0.04], s: [1.6, 0.5, 1.6] }, 14, 8);
    frame.torus(PLAQ_R, 0.07, { v: (x, y, z, nx, ny) => mix(0xb87a0a, 0xfff0a0, smoothstep(ny * 0.6 + 0.5)) }, { p: [0, PLAQ_Y, PLAQ_Z] }, 10, 40);
    frame.cyl(PLAQ_R - 0.02, PLAQ_R - 0.02, 0.06, 0x2a2a6a, { p: [0, PLAQ_Y, PLAQ_Z - 0.035], r: [Math.PI / 2, 0, 0] }, 32);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; frame.sphere(0.045, 0xfff6c0, { p: [Math.cos(a) * PLAQ_R, PLAQ_Y + Math.sin(a) * PLAQ_R, PLAQ_Z + 0.05] }, 8, 6); }
    const face = new THREE.CircleGeometry(PLAQ_R - 0.03, 36);
    face.translate(0, PLAQ_Y, PLAQ_Z + 0.002);
    // Deckel mit Goldstern (auf der Box-Öffnung, Oberseite 1,2 m)
    const lid = new Build();
    lid.box(1.42, 0.12, 1.42, { v: (x, y, z, nx, ny) => mix(0x2a1e6a, 0x5a4ab8, smoothstep(ny * 0.7 + 0.3)) }, { p: [0, 1.25, 0] }, 0.05, 2);
    lid.add(puffyStarGeo(0.42, 0.18, 0.06, 0.02), 0xffd23a, { p: [0, 1.33, 0], r: [-Math.PI / 2, 0, 0] });
    // Vorhängeschloss (Körper; Bügel getrennt)
    const lock = new Build();
    lock.box(0.62, 0.52, 0.22, { v: (x, y, z, nx, ny) => mix(0xb07a10, 0xffe070, smoothstep(ny * 0.5 + nx * 0.2 + 0.5)) }, { p: [0, 0, 0] }, 0.08, 2);
    lock.sphere(0.065, 0x3a2410, { p: [0, 0.05, 0.11], s: [1, 1, 0.3] }, 12, 8);
    lock.box(0.05, 0.13, 0.02, 0x3a2410, { p: [0, -0.06, 0.112] }, 0.01, 1);
    const shackle = new Build();
    shackle.torus(0.19, 0.055, { v: (x, y, z, nx, ny) => mix(0x8a8a9a, 0xf0f0ff, smoothstep(ny * 0.6 + 0.5)) }, { p: [0, 0, 0] }, 10, 24, Math.PI);
    shackle.cyl(0.055, 0.055, 0.14, 0xc8c8d8, { p: [0.19, -0.07, 0] }, 10);
    shackle.cyl(0.055, 0.055, 0.14, 0xc8c8d8, { p: [-0.19, -0.07, 0] }, 10);
    // Leuchtring am Boden
    const ring = new THREE.RingGeometry(1.05, 1.35, 40, 1);
    ring.rotateX(-Math.PI / 2); ring.translate(0, 0.04, 0);
    return { frame: frame.geometry(), face, lid: lid.geometry(), lock: lock.geometry(), shackle: shackle.geometry(), ring };
  });
}
function buildBoxDeko(opts = {}) {
  const G = decoGeos();
  const root = new THREE.Group();
  const own = [];
  const icon = opts.icon ?? 'stern';
  const frame = mesh(G.frame, vcol(0.32, {}, 'bonusbbframe'), {}, true);
  const faceMat = new THREE.MeshBasicMaterial({ map: iconTexture(icon, 'normal'), transparent: true, toneMapped: false });
  own.push(faceMat);
  const face = mesh(G.face, faceMat, {}, false);
  const plaqueJ = joint([0, 0, 0], frame, face);
  const lid = mesh(G.lid, vcol(0.35, {}, 'bonusbblid'), {}, true);
  const lockMat = metal('bonusbblock', { color: 0xffffff, vertexColors: true, metalness: 0.55, roughness: 0.3 }, 0.9);
  const lockBody = mesh(G.lock, lockMat, {}, true);
  const shackle = mesh(G.shackle, lockMat, { p: [0, 0.33, 0] }, true);
  const lockJ = joint([0, 0.7, 0.92], lockBody, shackle);
  const ringMat = new THREE.MeshBasicMaterial({ color: opts.color ?? 0x7af0ff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  own.push(ringMat);
  const ring = mesh(G.ring, ringMat, {}, false);
  ring.renderOrder = 2;
  root.add(plaqueJ, lid, lockJ, ring);
  const clk = new Clock();
  let doneK = 0, lidK = 0, variant = 'normal';
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t = clk.t;
    const locked = num(st.locked, 0) > 0.5, done = num(st.done, 0) > 0.5;
    const open = clamp(num(st.open, locked ? 0 : 1), 0, 1);
    doneK = damp(doneK, done ? 1 : 0, 6, dt);
    lidK = damp(lidK, done || (locked && open < 0.3) ? 1 : 0, 8, dt);
    const v = done ? 'done' : 'normal';
    if (v !== variant) { variant = v; faceMat.map = iconTexture(icon, v); faceMat.needsUpdate = true; }
    plaqueJ.position.y = Math.sin(t * 1.4) * 0.04;
    plaqueJ.rotation.y = Math.sin(t * 0.7) * 0.12;
    lid.visible = lidK > 0.02;
    lid.position.y = (1 - lidK) * 0.6;
    lid.scale.set(lidK, 1, lidK);
    // Schloss: verschlossen sichtbar; open 0 → 1: Bügel springt auf (0–0,35), Schloss fällt und verblasst
    const showLock = locked || (open > 0 && open < 1);
    lockJ.visible = showLock && open < 0.999;
    if (lockJ.visible) {
      const pop = smoothstep(open / 0.35), fall = smoothstep((open - 0.35) / 0.65);
      shackle.position.y = 0.33 + pop * 0.18;
      shackle.rotation.y = pop * 0.9;
      lockJ.position.set(0, 0.7 - fall * 0.65, 0.92 + fall * 0.4);
      lockJ.rotation.z = fall * 0.9;
      lockJ.scale.setScalar(Math.max(0.01, 1 - fall * 0.85));
      lockJ.rotation.x = locked && open === 0 ? Math.sin(t * 2.2) * 0.04 : 0;
    }
    const glow = clamp(num(st.glow, 0), 0, 1) * (1 - doneK);
    ring.visible = glow > 0.02;
    ringMat.opacity = 0.35 + 0.35 * glow * (0.6 + 0.4 * Math.sin(t * 4));
    ring.scale.setScalar(1 + Math.sin(t * 2) * 0.04);
  };
  return makeModel('bossblitz_box_deko', root, update, own, { initial: 'idle' });
}

// =============================================================================================
// Sternenstaub
// =============================================================================================
function buildSternenstaub(opts = {}) {
  const R = num(opts.radius, 1.8), H = num(opts.height, 2.4), N = clamp(Math.round(num(opts.count, 22)), 4, 64);
  const base = new THREE.Color(opts.color ?? 0xbfd8ff);
  const pos = new Float32Array(N * 3), colr = new Float32Array(N * 3);
  const ph = [], fr = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU + Math.sin(i * 7.3) * 0.3, r = R * (0.75 + 0.25 * Math.sin(i * 3.7) ** 2);
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = H * (0.15 + 0.85 * ((i * 0.618) % 1)); pos[i * 3 + 2] = Math.sin(a) * r;
    ph.push(i * 2.1); fr.push(2 + (i % 5) * 0.7);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, H / 2, 0), R + H);
  const mat = new THREE.PointsMaterial({ size: 0.34, map: sparkleTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false });
  const pts = new THREE.Points(g, mat);
  pts.renderOrder = 3;
  const root = new THREE.Group();
  root.add(pts);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t = clk.t, k = clamp(num(st.k, 1), 0, 1);
    pts.rotation.y += dt * num(st.spin, 0.6);
    for (let i = 0; i < N; i++) {
      const tw = (0.5 + 0.5 * Math.sin(t * fr[i] + ph[i])) ** 2 * k;
      colr[i * 3] = base.r * tw; colr[i * 3 + 1] = base.g * tw; colr[i * 3 + 2] = base.b * tw;
      pos[i * 3 + 1] += dt * 0.25;
      if (pos[i * 3 + 1] > H) pos[i * 3 + 1] -= H;
    }
    g.attributes.color.needsUpdate = true;
    g.attributes.position.needsUpdate = true;
  };
  return makeModel('sternenstaub', root, update, [g, mat], { initial: 'idle' });
}

export const MODELS = {
  bossblitz_schluessel: buildSchluessel,
  bossblitz_box_deko: buildBoxDeko,
  sternenstaub: buildSternenstaub,
};
