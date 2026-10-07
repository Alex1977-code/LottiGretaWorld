import { POWER_COLORS } from '../palette.js';

// Sammelobjekte und Level-Elemente als Vektorgrafik (3D-World-Look): Münze, HUD-Münze, Schlüssel, Tor,
// Zielfahne, Dornen, Checkpoint, Herz, Beere, Feuerball. Licht von oben links, weiche Verläufe, Glanz,
// Kernschatten unten rechts. g = { ctx, w, h, S, colors }; Koordinaten in Weltpixeln.

// --- Farben ---
const GOLD = { hi: '#fff6c0', light: '#ffe066', base: '#ffc21a', dark: '#c98700', deep: '#8a5a00' };
const STONE = { hi: '#f4f5f8', light: '#e3e4ea', base: '#b9bbc6', dark: '#7f8290', deep: '#50535f' };
const WOOD = { light: '#e0a865', base: '#b97a3f', dark: '#7d4d22', deep: '#4a2a12' };
const IRON = { light: '#c6d2de', base: '#8a9bac', dark: '#4d5a68', deep: '#2b323c' };
const CLOTH = { light: '#ffa43a', base: '#e0561f', dark: '#962c10' };

// --- Helfer ---
function hex2rgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a, b, t) {
  const A = hex2rgb(a), B = hex2rgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}
function shade(hex, f) { return `rgb(${hex2rgb(hex).map((v) => Math.max(0, Math.min(255, Math.round(v * f)))).join(',')})`; }
function ellipse(ctx, cx, cy, rx, ry, rot = 0) {
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
}
function gloss(ctx, cx, cy, rx, ry, rot = -0.6, a = 0.6) {
  ctx.fillStyle = `rgba(255, 255, 255, ${a})`; ellipse(ctx, cx, cy, rx, ry, rot); ctx.fill();
}
function radial(ctx, cx, cy, r, stops, lx = -0.35, ly = -0.35) {
  const grad = ctx.createRadialGradient(cx + r * lx, cy + r * ly, r * 0.08, cx, cy, r);
  for (const [p, c] of stops) grad.addColorStop(p, c);
  return grad;
}
function linear(ctx, x0, y0, x1, y1, stops) {
  const grad = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [p, c] of stops) grad.addColorStop(p, c);
  return grad;
}
// Abgerundetes Rechteck als Teilpfad (ohne beginPath) bzw. als eigener Pfad
function rrect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); rrect(ctx, x, y, w, h, r); }
// Blattform (spitz an beiden Enden, bauchig oben) um (cx, cy), gedreht um rot
function leafPath(ctx, cx, cy, len, wid, rot) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
  ctx.beginPath(); ctx.moveTo(0, -len / 2);
  ctx.quadraticCurveTo(wid * 0.62, -len * 0.12, 0, len / 2);
  ctx.quadraticCurveTo(-wid * 0.62, -len * 0.12, 0, -len / 2);
  ctx.closePath(); ctx.restore();
}
// Blattmotiv mit Mittelader
function leafMotif(ctx, cx, cy, len, wid, rot, fill, vein) {
  leafPath(ctx, cx, cy, len, wid, rot); ctx.fillStyle = fill; ctx.fill();
  const dx = Math.sin(rot) * len * 0.42, dy = -Math.cos(rot) * len * 0.42;
  ctx.strokeStyle = vein; ctx.lineWidth = Math.max(0.35, wid * 0.14);
  ctx.beginPath(); ctx.moveTo(cx - dx, cy - dy); ctx.lineTo(cx + dx, cy + dy); ctx.stroke();
}
// Vierzackiger Funkelstern
function sparkle(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx, cy, cx + r, cy); ctx.quadraticCurveTo(cx, cy, cx, cy + r);
  ctx.quadraticCurveTo(cx, cy, cx - r, cy); ctx.quadraticCurveTo(cx, cy, cx, cy - r);
  ctx.fill();
}

// ======================= Bitcoin-Münze =======================
const BTC = { hi: '#ffd9a8', light: '#ffb45c', base: '#f7931a', dark: '#c46a0c', deep: '#8a4606' };

// ₿-Symbol (B mit je zwei senkrechten Strichen oben und unten), Höhe ≈ 1.1·r, leicht gekippt wie das Logo
function btcSymbol(ctx, r, color, lw) {
  ctx.save();
  ctx.scale(r / 5.3, r / 5.3); ctx.rotate(0.22);
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-1.0, -2.3); ctx.lineTo(-1.0, 2.3);                       // Stamm
  ctx.moveTo(-1.0, -2.3); ctx.lineTo(0.3, -2.3);                       // oberer Bauch
  ctx.arc(0.3, -1.15, 1.15, -Math.PI / 2, Math.PI / 2); ctx.lineTo(-1.0, 0);
  ctx.moveTo(-1.0, 0); ctx.lineTo(0.55, 0);                            // unterer Bauch
  ctx.arc(0.55, 1.15, 1.15, -Math.PI / 2, Math.PI / 2); ctx.lineTo(-1.0, 2.3);
  for (const x of [-0.35, 0.55]) {                                      // Striche oben und unten
    ctx.moveTo(x, -3.0); ctx.lineTo(x, -2.3);
    ctx.moveTo(x, 2.3); ctx.lineTo(x, 3.0);
  }
  ctx.stroke();
  ctx.restore();
}

// Münzfläche mit Radius r um (0,0): glänzender Randwulst, Innenfläche, ₿-Relief, Glanzbogen (phase 0..1)
function coinFace(ctx, r, phase, lw = 0.9) {
  ctx.fillStyle = radial(ctx, 0, 0, r, [[0, BTC.hi], [0.3, BTC.light], [0.72, BTC.base], [1, BTC.dark]], -0.4, -0.4);
  ellipse(ctx, 0, 0, r, r); ctx.fill();
  // Innenfläche: oben im Schatten des Randes, unten Lichtkante
  const ri = r * 0.8;
  ctx.fillStyle = linear(ctx, 0, -ri, 0, ri, [[0, BTC.dark], [0.4, BTC.base], [1, BTC.light]]);
  ellipse(ctx, 0, 0, ri, ri); ctx.fill();
  ctx.lineWidth = r * 0.1;
  ctx.strokeStyle = 'rgba(110, 50, 0, 0.4)';
  ctx.beginPath(); ctx.arc(0, 0, ri - r * 0.04, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 240, 210, 0.5)';
  ctx.beginPath(); ctx.arc(0, 0, ri - r * 0.04, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
  // ₿ als Relief: Schatten unten rechts, weißes Symbol darüber
  ctx.save(); ctx.translate(r * 0.04, r * 0.045); btcSymbol(ctx, r, 'rgba(120, 55, 0, 0.5)', lw); ctx.restore();
  btcSymbol(ctx, r, '#fff8ee', lw);
  // weicher Glanz auf der Fläche und wandernder Glanzbogen am Rand
  gloss(ctx, -r * 0.35, -r * 0.4, r * 0.32, r * 0.16, -0.7, 0.3);
  const a0 = Math.PI * (1.05 + phase * 0.6);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'; ctx.lineWidth = r * 0.15;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.9, a0, a0 + Math.PI * 0.35); ctx.stroke();
}

// Münze (12x12): sx = seitliche Stauchung (Drehung), side = Seite der sichtbaren Dicke, phase = Glanzlage
function coin(g, sx, side, phase) {
  const { ctx } = g;
  const cx = 6, cy = 6, r = 5.3, t = 1.4;
  if (sx < 0.3) {
    // Kante: schmaler orangener Streifen mit Riffelung
    const w = 2.8;
    roundRect(ctx, cx - w / 2, cy - r, w, 2 * r, w / 2);
    ctx.fillStyle = linear(ctx, cx - w / 2, 0, cx + w / 2, 0, [[0, BTC.hi], [0.3, BTC.light], [0.65, BTC.base], [1, BTC.deep]]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(110, 50, 0, 0.35)'; ctx.lineWidth = 0.4;
    ctx.beginPath();
    for (let y = cy - r + 1.6; y < cy + r - 1.2; y += 1.25) { ctx.moveTo(cx - w / 2 + 0.5, y); ctx.lineTo(cx + w / 2 - 0.5, y); }
    ctx.stroke();
    gloss(ctx, cx - 0.55, cy - 2.2, 0.4, 1.6, 0, 0.6);
    return;
  }
  // Dicke auf der abgewandten Seite
  ctx.save(); ctx.translate(cx + side * t * 0.9, cy); ctx.scale(sx, 1);
  ctx.fillStyle = radial(ctx, 0, 0, r, [[0, BTC.base], [0.6, BTC.dark], [1, BTC.deep]], 0, 0);
  ellipse(ctx, 0, 0, r, r); ctx.fill();
  ctx.restore();
  if (side) {
    // Riffelung der Kante
    ctx.strokeStyle = 'rgba(90, 40, 0, 0.35)'; ctx.lineWidth = 0.4;
    ctx.beginPath();
    for (let y = -3.5; y <= 3.5; y += 1.4) {
      const ex = cx + side * (Math.sqrt(Math.max(0, r * r - y * y)) * sx + t * 0.5);
      ctx.moveTo(ex - side * 0.6, cy + y); ctx.lineTo(ex + side * 0.4, cy + y);
    }
    ctx.stroke();
  }
  ctx.save(); ctx.translate(cx, cy); ctx.scale(sx, 1);
  coinFace(ctx, r, phase);
  ctx.restore();
}

// HUD-Münze (8x8): voll (kleine Bitcoin-Münze mit ₿) / leer (heller Ring als Platzhalter)
function coinHud(g, full) {
  const { ctx } = g;
  if (full) {
    ctx.save(); ctx.translate(4, 4); coinFace(ctx, 3.6, 0.15, 1.0); ctx.restore();
    return;
  }
  ctx.fillStyle = 'rgba(40, 30, 70, 0.3)';
  ellipse(ctx, 4, 4, 3.2, 3.2); ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; ctx.lineWidth = 0.8;
  ellipse(ctx, 4, 4, 3.0, 3.0); ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'; ctx.lineWidth = 0.5;
  ellipse(ctx, 4, 4, 1.9, 1.9); ctx.stroke();
}

// ======================= Schlüssel =======================
// Ring oben, Schaft, zweizackiger Bart unten rechts (12x12)
function keyPath(ctx, ox, oy) {
  ctx.beginPath();
  ctx.arc(5.8 + ox, 3.9 + oy, 3.3, 0, Math.PI * 2);
  ctx.moveTo(7.1 + ox, 3.9 + oy);
  ctx.arc(5.8 + ox, 3.9 + oy, 1.3, 0, Math.PI * 2, true); // Loch gegenläufig
  rrect(ctx, 4.8 + ox, 6.5 + oy, 2.0, 5.2, 0.7);
  rrect(ctx, 6.4 + ox, 8.3 + oy, 3.2, 1.2, 0.45);
  rrect(ctx, 6.4 + ox, 10.2 + oy, 2.4, 1.2, 0.45);
}
function key(g) {
  const { ctx } = g;
  keyPath(ctx, 0.5, 0.6);
  ctx.fillStyle = 'rgba(70, 35, 0, 0.28)'; ctx.fill();
  keyPath(ctx, 0, 0);
  ctx.fillStyle = radial(ctx, 5.6, 5.5, 7.5, [[0, GOLD.hi], [0.25, GOLD.light], [0.65, GOLD.base], [1, GOLD.dark]], -0.45, -0.55);
  ctx.fill();
  // Kragen zwischen Ring und Schaft, Schattenkanten
  ctx.fillStyle = 'rgba(140, 80, 0, 0.45)';
  ctx.fillRect(4.8, 6.9, 2.0, 0.6);
  ctx.strokeStyle = 'rgba(140, 80, 0, 0.4)'; ctx.lineWidth = 0.45;
  ctx.beginPath(); ctx.moveTo(6.7, 9.3); ctx.lineTo(9.3, 9.3); ctx.moveTo(6.7, 11.2); ctx.lineTo(8.5, 11.2);
  ctx.moveTo(6.6, 7.4); ctx.lineTo(6.6, 11.3); ctx.stroke();
  // Glanz auf Ring und Schaft
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.arc(5.8, 3.9, 2.5, Math.PI * 1.08, Math.PI * 1.55); ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)'; ctx.lineWidth = 0.45;
  ctx.beginPath(); ctx.moveTo(5.25, 7.4); ctx.lineTo(5.25, 11.0); ctx.stroke();
}

// ======================= Tor =======================
// Steinbogen (16x32): Öffnung x 3–13 mit Halbkreis r 5 um (8, 8), Schwelle ab y 29.5 (Unterkante = Boden)
function openingPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(3, 29.5); ctx.lineTo(3, 8); ctx.arc(8, 8, 5, Math.PI, 0); ctx.lineTo(13, 29.5); ctx.closePath();
}
function stoneBlock(ctx, x, y, w, h, light = STONE.light) {
  roundRect(ctx, x, y, w, h, 0.5);
  ctx.fillStyle = linear(ctx, x, y, x + w, y + h, [[0, light], [0.55, STONE.base], [1, STONE.dark]]);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; ctx.lineWidth = 0.4;
  ctx.beginPath(); ctx.moveTo(x + 0.3, y + h - 0.4); ctx.lineTo(x + 0.3, y + 0.3); ctx.lineTo(x + w - 0.4, y + 0.3); ctx.stroke();
}
function arch(ctx) {
  // Fugengrund
  ctx.fillStyle = STONE.deep;
  ctx.beginPath(); ctx.moveTo(0, 29.6); ctx.lineTo(0, 8); ctx.arc(8, 8, 8, Math.PI, 0); ctx.lineTo(16, 29.6); ctx.closePath(); ctx.fill();
  // Pfeiler: links ganze Blöcke, rechts um einen halben versetzt
  for (let i = 0; i < 5; i++) stoneBlock(ctx, 0.25, 8.3 + i * 4.25, 2.5, 3.9);
  stoneBlock(ctx, 13.25, 8.3, 2.5, 1.8);
  for (let i = 0; i < 4; i++) stoneBlock(ctx, 13.25, 10.45 + i * 4.25, 2.5, 3.9);
  stoneBlock(ctx, 13.25, 27.4, 2.5, 1.8);
  // Bogensteine (Keilsteine), Schlussstein heller
  const n = 7, gap = 0.035, ro = 7.75, ri = 5.3;
  const grad = linear(ctx, 1, 0, 15, 10, [[0, STONE.light], [0.5, STONE.base], [1, STONE.dark]]);
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI + (i * Math.PI) / n + gap, a1 = Math.PI + ((i + 1) * Math.PI) / n - gap;
    ctx.beginPath(); ctx.arc(8, 8, ro, a0, a1); ctx.arc(8, 8, ri, a1, a0, true); ctx.closePath();
    ctx.fillStyle = i === 3 ? linear(ctx, 6, 0, 10, 3, [[0, STONE.hi], [1, STONE.base]]) : grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.arc(8, 8, ro - 0.3, a0 + 0.02, a1 - 0.02); ctx.stroke();
  }
}
function gateFrame(ctx, open) {
  arch(ctx);
  ctx.save(); openingPath(ctx); ctx.clip();
  if (!open) {
    // Holztür mit Brettern, Eisenbändern und goldenem Schlüsselschild
    ctx.fillStyle = linear(ctx, 3, 4, 13, 30, [[0, WOOD.light], [0.5, WOOD.base], [1, WOOD.dark]]);
    ctx.fillRect(2, 2, 12, 28);
    for (const x of [5.5, 8, 10.5]) {
      ctx.fillStyle = 'rgba(70, 40, 12, 0.45)'; ctx.fillRect(x - 0.25, 2, 0.5, 28);
      ctx.fillStyle = 'rgba(255, 230, 180, 0.22)'; ctx.fillRect(x + 0.3, 2, 0.4, 28);
    }
    for (const y of [12.3, 23.3]) {
      roundRect(ctx, 2.5, y, 11, 1.8, 0.5);
      ctx.fillStyle = linear(ctx, 0, y, 0, y + 1.8, [[0, IRON.light], [0.5, IRON.base], [1, IRON.dark]]); ctx.fill();
      for (const x of [4.3, 8, 11.7]) {
        ctx.fillStyle = IRON.deep; ellipse(ctx, x, y + 0.9, 0.45, 0.45); ctx.fill();
        gloss(ctx, x - 0.12, y + 0.75, 0.15, 0.15, 0, 0.7);
      }
    }
    roundRect(ctx, 6.3, 16.2, 3.4, 4.5, 0.9);
    ctx.fillStyle = radial(ctx, 8, 18.4, 3, [[0, GOLD.hi], [0.3, GOLD.light], [0.75, GOLD.base], [1, GOLD.dark]], -0.4, -0.5);
    ctx.fill();
    ctx.fillStyle = '#3a2410';
    ellipse(ctx, 8, 17.9, 0.6, 0.6); ctx.fill();
    ctx.beginPath(); ctx.moveTo(7.6, 18.2); ctx.lineTo(8.4, 18.2); ctx.lineTo(8.6, 19.9); ctx.lineTo(7.4, 19.9); ctx.closePath(); ctx.fill();
  } else {
    // dunkler Gang mit warmem Lichtschein
    ctx.fillStyle = '#1a1018'; ctx.fillRect(2, 2, 12, 28);
    ctx.fillStyle = radial(ctx, 8, 25, 15, [[0, '#ffe09a'], [0.25, '#f5a84e'], [0.55, '#8c4a30'], [1, 'rgba(26, 16, 24, 0)']], 0, 0.25);
    ctx.fillRect(2, 2, 12, 28);
    ctx.fillStyle = linear(ctx, 0, 24, 0, 29.5, [[0, 'rgba(255, 220, 150, 0)'], [1, 'rgba(255, 230, 170, 0.6)']]);
    ctx.fillRect(3, 24, 10, 5.5);
    // offene Tür, nach innen geschwungen (schräg)
    ctx.beginPath(); ctx.moveTo(3, 8.4); ctx.lineTo(5.6, 10.3); ctx.lineTo(5.6, 28.4); ctx.lineTo(3, 29.5); ctx.closePath();
    ctx.fillStyle = linear(ctx, 3, 0, 5.6, 0, [[0, WOOD.dark], [1, WOOD.deep]]); ctx.fill();
    ctx.strokeStyle = 'rgba(255, 220, 160, 0.4)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(5.5, 10.4); ctx.lineTo(5.5, 28.3); ctx.stroke();
    ctx.strokeStyle = 'rgba(40, 45, 55, 0.7)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(3, 13.0); ctx.lineTo(5.6, 13.6); ctx.moveTo(3, 24.2); ctx.lineTo(5.6, 23.6); ctx.stroke();
  }
  // Innenschatten der Laibung
  openingPath(ctx);
  ctx.strokeStyle = 'rgba(20, 15, 30, 0.4)'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.restore();
  // Schwelle
  stoneBlock(ctx, 0, 29.7, 7.8, 2.3, STONE.hi);
  stoneBlock(ctx, 8.2, 29.7, 7.8, 2.3, STONE.hi);
  if (open) {
    ctx.fillStyle = radial(ctx, 8, 30.2, 7, [[0, 'rgba(255, 210, 120, 0.55)'], [1, 'rgba(255, 210, 120, 0)']], 0, 0);
    ctx.fillRect(0, 27, 16, 5);
  }
}

// ======================= Zielfahne =======================
// Stange links (x ≈ 2.2) mit Goldkugel, Steinsockel unten; Tuch weht nach rechts (phase, amp = Welle)
function pole(ctx, x, top, bottom, w) {
  roundRect(ctx, x - w / 2, top, w, bottom - top, w / 2);
  ctx.fillStyle = linear(ctx, x - w / 2, 0, x + w / 2, 0, [[0, WOOD.light], [0.45, WOOD.base], [1, WOOD.dark]]);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 235, 200, 0.4)'; ctx.lineWidth = 0.35;
  ctx.beginPath(); ctx.moveTo(x - w * 0.22, top + 1); ctx.lineTo(x - w * 0.22, bottom - 1); ctx.stroke();
}
function goldBall(ctx, cx, cy, r) {
  ctx.fillStyle = radial(ctx, cx, cy, r, [[0, GOLD.hi], [0.35, GOLD.light], [0.75, GOLD.base], [1, GOLD.dark]], -0.4, -0.45);
  ellipse(ctx, cx, cy, r, r); ctx.fill();
  gloss(ctx, cx - r * 0.35, cy - r * 0.4, r * 0.3, r * 0.2, -0.6, 0.75);
}
function flag(g, phase, amp) {
  const { ctx } = g;
  const x0 = 2.4, x1 = 15.4, top = 4.4, hgt = 9.0, lambda = 11.5, n = 12;
  const wave = (x) => Math.sin(((x - x0) / lambda) * Math.PI * 2 + phase) * amp * 1.3 * ((x - x0) / (x1 - x0));
  const lit = (x) => Math.cos(((x - x0) / lambda) * Math.PI * 2 + phase) * amp * (0.45 + 0.85 * ((x - x0) / (x1 - x0)));
  ctx.beginPath();
  for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n; ctx.lineTo(x, top + wave(x)); }
  for (let i = n; i >= 0; i--) { const x = x0 + ((x1 - x0) * i) / n; ctx.lineTo(x, top + hgt + wave(x)); }
  ctx.closePath();
  const grad = ctx.createLinearGradient(x0, 0, x1, 0);
  for (let i = 0; i <= n; i++) {
    const t = i / n, l = lit(x0 + (x1 - x0) * t);
    grad.addColorStop(t, l > 0 ? mix(CLOTH.base, CLOTH.light, Math.min(1, l)) : mix(CLOTH.base, CLOTH.dark, Math.min(1, -l)));
  }
  ctx.fillStyle = grad; ctx.fill();
  ctx.strokeStyle = 'rgba(110, 30, 8, 0.4)'; ctx.lineWidth = 0.5; ctx.stroke();
  // Blattmotiv in der Tuchmitte
  const mx = 9.4, my = top + hgt / 2 + wave(mx);
  leafMotif(ctx, mx, my, 6.2, 4.4, 0.5 + wave(mx) * 0.1, GOLD.light, 'rgba(200, 120, 0, 0.7)');
  // Stange, Kugel, Sockel
  pole(ctx, 2.2, 2.6, 29.6, 1.6);
  goldBall(ctx, 2.2, 2.1, 2.0);
  stoneBlock(ctx, 0, 28.6, 5.6, 3.4, STONE.hi);
}

// ======================= Dornen =======================
// Dunkle Brombeerranke mit hellen Dornenspitzen (16x8), liegt am Boden
function thorn(ctx, bx, by, tx, ty, wid) {
  // Richtung Spitze, Basis quer dazu
  const dx = tx - bx, dy = ty - by, len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * wid * 0.5, ny = (dx / len) * wid * 0.5;
  ctx.beginPath(); ctx.moveTo(bx + nx, by + ny);
  ctx.quadraticCurveTo(bx + dx * 0.55 + nx * 0.4, by + dy * 0.55 + ny * 0.4, tx, ty);
  ctx.quadraticCurveTo(bx + dx * 0.55 - nx * 0.4, by + dy * 0.55 - ny * 0.4, bx - nx, by - ny);
  ctx.closePath();
  ctx.fillStyle = linear(ctx, bx, by, tx, ty, [[0, '#7a6a52'], [0.5, '#c9bda0'], [1, '#f6f0dc']]);
  ctx.fill();
}
function thorns(g) {
  const { ctx } = g;
  ctx.fillStyle = 'rgba(40, 20, 30, 0.28)';
  ellipse(ctx, 8, 7.3, 7.6, 0.9); ctx.fill();
  // Ranken: dunkler Grundstrich, hellerer Lichtstrich oben links
  const vines = [
    [[0.3, 7.2], [3.5, 2.6, 7.5, 6.4], [11.5, 2.6, 15.7, 6.6]],
    [[0.6, 5.2], [4.5, 7.6, 8.5, 5.2], [11.5, 7.8, 15.4, 7.0]],
  ];
  for (const [w, color, off] of [[1.6, '#3a2010', 0], [0.7, '#7a4a28', -0.35]]) {
    ctx.strokeStyle = color; ctx.lineWidth = w;
    for (const [start, ...segs] of vines) {
      ctx.beginPath(); ctx.moveTo(start[0] + off, start[1] + off);
      for (const [c1x, c1y, x, y] of segs) ctx.quadraticCurveTo(c1x + off, c1y + off, x + off, y + off);
      ctx.stroke();
    }
  }
  // Dornen
  for (const [bx, by, tx, ty] of [[3.6, 4.4, 2.6, 0.7], [5.0, 4.6, 5.8, 1.6], [11.4, 4.3, 12.4, 0.5], [9.8, 4.6, 8.9, 1.5],
    [1.4, 6.0, 0.3, 3.6], [14.6, 6.2, 15.8, 3.5], [7.2, 6.6, 6.6, 3.9], [13.0, 7.2, 13.9, 4.7]]) {
    thorn(ctx, bx, by, tx, ty, 1.5);
  }
  // zwei kleine Brombeeren
  for (const [x, y] of [[8.6, 6.2], [2.4, 7.0]]) {
    ctx.fillStyle = radial(ctx, x, y, 0.95, [[0, '#8a4aa8'], [0.5, '#4a1a5a'], [1, '#24082c']]);
    ellipse(ctx, x, y, 0.95, 0.9); ctx.fill();
    gloss(ctx, x - 0.3, y - 0.3, 0.22, 0.18, 0, 0.8);
  }
}

// ======================= Checkpoint =======================
// Holzpfosten mit Kappe und Steinfuß (16x32); off: graue schlaffe Fahne, on: leuchtender Wimpel mit Funkeln
function checkpoint(g, on) {
  const { ctx } = g;
  const px = 6.2;
  if (on) {
    // warmer Schein hinter dem Wimpel
    ctx.fillStyle = radial(ctx, 11.5, 6.5, 7.5, [[0, 'rgba(255, 190, 80, 0.45)'], [1, 'rgba(255, 190, 80, 0)']], 0, 0);
    ctx.fillRect(3, 0, 13, 15);
  }
  pole(ctx, px, 1.4, 29.4, 2.4);
  // Kappe
  roundRect(ctx, px - 2.1, 0.3, 4.2, 2.0, 0.7);
  ctx.fillStyle = linear(ctx, px - 2, 0.3, px + 2, 2.3, [[0, WOOD.light], [0.6, WOOD.base], [1, WOOD.dark]]); ctx.fill();
  gloss(ctx, px - 0.9, 0.9, 0.9, 0.3, 0, 0.5);
  if (!on) {
    // graue Fahne hängt schlaff herab
    ctx.beginPath(); ctx.moveTo(px + 1.0, 2.6);
    ctx.quadraticCurveTo(11.4, 3.2, 11.0, 6.4);
    ctx.quadraticCurveTo(10.6, 9.6, 10.2, 13.2);
    ctx.quadraticCurveTo(9.0, 12.6, 8.4, 10.0);
    ctx.quadraticCurveTo(7.8, 6.6, px + 1.0, 4.6); ctx.closePath();
    ctx.fillStyle = linear(ctx, px + 1, 2.6, 11.5, 13, [[0, '#cfd1d9'], [0.5, '#9a9ca8'], [1, '#666977']]); ctx.fill();
    ctx.strokeStyle = 'rgba(60, 62, 75, 0.35)'; ctx.lineWidth = 0.45;
    ctx.beginPath(); ctx.moveTo(9.4, 4.0); ctx.quadraticCurveTo(9.8, 8, 9.6, 12.2); ctx.stroke();
  } else {
    // leuchtend oranger Wimpel weht nach rechts
    ctx.beginPath(); ctx.moveTo(px + 1.0, 2.4);
    ctx.quadraticCurveTo(12.0, 2.8, 15.8, 6.2);
    ctx.quadraticCurveTo(12.0, 9.4, px + 1.0, 11.4); ctx.closePath();
    ctx.fillStyle = radial(ctx, 10, 6.8, 7.5, [[0, '#ffc060'], [0.4, '#ff7a2d'], [1, '#c43f1b']], -0.3, -0.4); ctx.fill();
    ctx.strokeStyle = 'rgba(150, 45, 10, 0.35)'; ctx.lineWidth = 0.45; ctx.stroke();
    leafMotif(ctx, 10.3, 6.8, 3.8, 2.4, 0.5, GOLD.light, 'rgba(200, 120, 0, 0.7)');
    gloss(ctx, 9.4, 3.9, 1.7, 0.45, -0.1, 0.5);
    sparkle(ctx, 13.6, 11.6, 1.6, '#fff6c0');
    sparkle(ctx, 11.8, 1.0, 1.1, '#fff6c0');
    sparkle(ctx, 15.0, 9.4, 0.8, '#ffe066');
  }
  // Steinfuß
  stoneBlock(ctx, 2.6, 28.6, 7.2, 3.4, STONE.hi);
}

// ======================= Herz =======================
function heartPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(4, 7.3);
  ctx.bezierCurveTo(1.3, 5.3, 0.3, 3.7, 0.55, 2.4);
  ctx.bezierCurveTo(0.85, 1.05, 2.6, 0.55, 4, 1.95);
  ctx.bezierCurveTo(5.4, 0.55, 7.15, 1.05, 7.45, 2.4);
  ctx.bezierCurveTo(7.7, 3.7, 6.7, 5.3, 4, 7.3);
  ctx.closePath();
}
function heart(g, full) {
  const { ctx } = g;
  heartPath(ctx);
  if (!full) {
    ctx.fillStyle = 'rgba(70, 10, 25, 0.35)'; ctx.fill();
    ctx.strokeStyle = 'rgba(95, 16, 32, 0.85)'; ctx.lineWidth = 0.7; ctx.stroke();
    return;
  }
  ctx.fillStyle = radial(ctx, 4, 4, 4.4, [[0, '#ffa098'], [0.45, '#ff3b2f'], [1, '#a81e1a']], -0.35, -0.4);
  ctx.fill();
  gloss(ctx, 2.3, 2.5, 0.95, 0.55, -0.55, 0.75);
  gloss(ctx, 5.6, 1.9, 0.35, 0.3, 0, 0.5);
}

// ======================= Beere =======================
// Pralle Beere mit Blatt (8x8). Farben je Kraft: g.colors.Z Grundton, g.colors.z Glanz (POWER_COLORS)
function berry(g) {
  const { ctx, colors } = g;
  const Z = colors.Z ?? POWER_COLORS.none.Z, z = colors.z ?? POWER_COLORS.none.z;
  const cx = 4, cy = 4.9, r = 3.0;
  ctx.fillStyle = radial(ctx, cx, cy, r, [[0, z], [0.45, Z], [0.85, shade(Z, 0.72)], [1, shade(Z, 0.5)]], -0.38, -0.4);
  ellipse(ctx, cx, cy, r, r); ctx.fill();
  // Stiel und Blatt
  ctx.strokeStyle = '#6d4a2a'; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(4.1, 2.3); ctx.quadraticCurveTo(4.0, 1.4, 3.6, 0.8); ctx.stroke();
  leafMotif(ctx, 5.4, 1.4, 3.0, 1.7, 1.25, '#6cc84a', 'rgba(40, 110, 30, 0.7)');
  gloss(ctx, 2.9, 3.6, 0.9, 0.55, -0.6, 0.7);
  gloss(ctx, 5.5, 6.4, 0.45, 0.25, 0.4, 0.3);
}
const BERRY_VARIANTS = POWER_COLORS;

// ======================= Feuerball =======================
// Heiße Kugel: weißer Kern, gelb/orange Hülle, Flammenzungen als Schweif nach oben (2 Frames)
function fireball(g, phase) {
  const { ctx } = g;
  const cx = 4, cy = 5.3, r = 2.6;
  // Glut um die Kugel
  ctx.fillStyle = radial(ctx, cx, cy, 4, [[0, 'rgba(255, 140, 40, 0.5)'], [1, 'rgba(255, 120, 30, 0)']], 0, 0);
  ctx.fillRect(0, 0, 8, 8);
  // Flamme über der Kugel: eine geneigte Zunge (Tropfen), Neigung wechselt je Frame; dazu ein Funke
  const d = phase ? 1 : -1;
  const X = (o) => cx + d * o;
  const tongue = (w, top, c0, c1) => {
    ctx.beginPath();
    ctx.moveTo(X(-w), cy - 1.0);
    ctx.quadraticCurveTo(X(-w - 0.7), cy - 3.2, X(-0.6), cy - top);
    ctx.quadraticCurveTo(X(w * 0.7), cy - 3.3, X(w), cy - 1.0);
    ctx.closePath();
    ctx.fillStyle = linear(ctx, 0, cy - 1.5, 0, cy - top, [[0, c0], [1, c1]]);
    ctx.fill();
  };
  tongue(1.8, 5.0, '#ff9a2a', 'rgba(235, 80, 20, 0.9)');
  tongue(1.1, 4.0, '#ffe066', '#ffb030');
  ctx.fillStyle = '#ffd050';
  ellipse(ctx, X(2.1), cy - 3.6, 0.45, 0.45); ctx.fill();
  // Kugel
  ctx.fillStyle = radial(ctx, cx, cy, r, [[0, '#ffffff'], [0.3, '#fff2a8'], [0.6, '#ffb020'], [0.85, '#ff6a1a'], [1, '#c0301a']], -0.25, -0.3);
  ellipse(ctx, cx, cy, r, r); ctx.fill();
}

export const SHEETS = [
  {
    key: 'coin', frameWidth: 12, frameHeight: 12,
    draw: {
      coin0: (g) => coin(g, 1, 0, 0),
      coin1: (g) => coin(g, 0.66, 1, 0.35),
      coin2: (g) => coin(g, 0, 0, 0.5),
      coin3: (g) => coin(g, 0.66, -1, 0.7),
    },
  },
  { key: 'coin_hud', frameWidth: 8, frameHeight: 8, draw: { full: (g) => coinHud(g, true), empty: (g) => coinHud(g, false) } },
  { key: 'key', frameWidth: 12, frameHeight: 12, draw: { key } },
  { key: 'gate', frameWidth: 16, frameHeight: 32, draw: { closed: (g) => gateFrame(g.ctx, false), open: (g) => gateFrame(g.ctx, true) } },
  {
    key: 'flag', frameWidth: 16, frameHeight: 32,
    draw: { flag0: (g) => flag(g, 0, 1), flag1: (g) => flag(g, Math.PI / 2, 0.5), flag2: (g) => flag(g, Math.PI, 1) },
  },
  { key: 'thorns', frameWidth: 16, frameHeight: 8, draw: { thorns } },
  { key: 'checkpoint', frameWidth: 16, frameHeight: 32, draw: { off: (g) => checkpoint(g, false), on: (g) => checkpoint(g, true) } },
  { key: 'heart', frameWidth: 8, frameHeight: 8, draw: { full: (g) => heart(g, true), empty: (g) => heart(g, false) } },
  { key: 'berry', frameWidth: 8, frameHeight: 8, draw: { berry }, variants: BERRY_VARIANTS },
  { key: 'fireball', frameWidth: 8, frameHeight: 8, draw: { fire0: (g) => fireball(g, 0), fire1: (g) => fireball(g, 1) } },
];
