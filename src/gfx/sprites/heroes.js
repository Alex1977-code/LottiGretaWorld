// Heldinnen 'lotti' und 'greta' (24x24) als Vektorgrafik im 3D-World-Look: runde Formen, weiche Verläufe,
// Glanzlichter oben links, Kernschatten unten rechts, keine harten Konturen.
// Blick nach rechts, Füße auf der Unterkante, Hitbox 10x14 mittig unten (x 7–17, y 10–24);
// Kopf, Haare und Arme dürfen hinausragen. g = { ctx, w, h, S, colors }, Kontext in Weltkoordinaten.
// Aufbau: eine Pose (Gelenkpunkte, Haarbewegung, Mimik) + ein Stil (Farben, Frisur) → drawHero.

const W = 24, H = 24;
const TAU = Math.PI * 2;

// Lichtrichtung (oben links). Beim Sturzflug wird das Bild senkrecht gespiegelt → Licht von unten links.
let LIGHT = { x: -1, y: -1 };

// ---------------------------------------------------------------- Farben (Licht / Grund / Schatten)
const SKIN = ['#ffeedb', '#ffd6b0', '#e4a97c'];
const LOTTI = {
  hair: ['#efcb70', '#cc9a40', '#8a5f22'], hairTip: '#f6dc8e',
  dress: ['#82b4ff', '#3b7cf0', '#1b47b0'],
  shoe: ['#b8783f', '#7c4a24', '#43240e'],
  iris: ['#a6d4ff', '#3e82f5', '#193b8c'],
  bow: ['#ff9a90', '#e83a30', '#951a13'],
};
const GRETA = {
  hair: ['#fff6c2', '#f4da7c', '#c99f3a'], hairTip: '#fffae0',
  dress: ['#9ae472', '#4fb833', '#287a20'],
  shoe: ['#b05064', '#7d2e42', '#43131f'],
  iris: ['#b2eaa6', '#49a84a', '#1d6628'],
  band: ['#ffb9dc', '#f0609f', '#9e2c62'],
};

// ---------------------------------------------------------------- Grundformen
/** Kugel/Ellipse mit radialem Verlauf von der Lichtseite weg und Glanzpunkt. */
function ball(ctx, cx, cy, rx, ry, cols, hl = 0.55) {
  const r = Math.max(rx, ry);
  const grad = ctx.createRadialGradient(cx + LIGHT.x * rx * 0.35, cy + LIGHT.y * ry * 0.35, r * 0.08, cx, cy, r * 1.1);
  grad.addColorStop(0, cols[0]); grad.addColorStop(0.5, cols[1]); grad.addColorStop(1, cols[2]);
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.fill();
  if (hl > 0) {
    ctx.fillStyle = `rgba(255,255,255,${hl})`;
    ctx.beginPath();
    ctx.ellipse(cx + LIGHT.x * rx * 0.42, cy + LIGHT.y * ry * 0.46, rx * 0.3, ry * 0.16, -0.7 * LIGHT.x * LIGHT.y, 0, TAU);
    ctx.fill();
  }
}

/** Linearer Verlauf über ein Rechteck, von der Lichtecke zur Schattenecke. */
function lin(ctx, x, y, w, h, cols) {
  const x0 = LIGHT.x < 0 ? x : x + w, x1 = LIGHT.x < 0 ? x + w : x;
  const y0 = LIGHT.y < 0 ? y : y + h, y1 = LIGHT.y < 0 ? y + h : y;
  const grad = ctx.createLinearGradient(x0, y0, x1, y1);
  grad.addColorStop(0, cols[0]); grad.addColorStop(0.5, cols[1]); grad.addColorStop(1, cols[2]);
  return grad;
}

/** Röhre (Arm/Bein): dicker Schattenstrich, darauf nach links oben versetzt Grund- und Lichtstrich. */
function tube(ctx, pts, w, cols) {
  const trace = () => {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = cols[2]; ctx.lineWidth = w; trace(); ctx.stroke();
  ctx.save();
  ctx.translate(LIGHT.x * w * 0.12, LIGHT.y * w * 0.12);
  ctx.strokeStyle = cols[1]; ctx.lineWidth = w * 0.74; trace(); ctx.stroke();
  ctx.translate(LIGHT.x * w * 0.1, LIGHT.y * w * 0.1);
  ctx.strokeStyle = cols[0]; ctx.lineWidth = w * 0.28; trace(); ctx.stroke();
  ctx.restore();
}

/** Haarsträhne: gebogene Tropfenform von der Wurzel (Breite w) zur Spitze. */
function lock(ctx, x0, y0, cx, cy, x1, y1, w, cols) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  ctx.fillStyle = lin(ctx, Math.min(x0, x1) - w, Math.min(y0, y1), Math.abs(dx) + 2 * w, Math.abs(dy) + w, cols);
  ctx.beginPath();
  ctx.moveTo(x0 - nx * w / 2, y0 - ny * w / 2);
  ctx.quadraticCurveTo(cx - nx * w * 0.35, cy - ny * w * 0.35, x1, y1);
  ctx.quadraticCurveTo(cx + nx * w * 0.35, cy + ny * w * 0.35, x0 + nx * w / 2, y0 + ny * w / 2);
  ctx.closePath(); ctx.fill();
}

/** Auge: Weiß mit Lidschatten, Iris mit Verlauf, Pupille, zwei Glanzpunkte. mode: open | blink | wide */
function eye(ctx, cx, cy, rx, ry, iris, look, mode) {
  if (mode === 'blink') {
    ctx.strokeStyle = 'rgba(110,60,30,0.85)'; ctx.lineWidth = 0.55;
    ctx.beginPath(); ctx.ellipse(cx, cy + ry * 0.15, rx * 0.85, ry * 0.5, 0, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
    return;
  }
  const wide = mode === 'wide';
  const ex = rx * (wide ? 1.12 : 1), ey = ry * (wide ? 1.18 : 1);
  const wg = ctx.createLinearGradient(cx, cy + LIGHT.y * ey, cx, cy - LIGHT.y * ey);
  wg.addColorStop(0, '#d9e1ee'); wg.addColorStop(0.4, '#ffffff'); wg.addColorStop(1, '#ffffff');
  ctx.fillStyle = wg; ctx.beginPath(); ctx.ellipse(cx, cy, ex, ey, 0, 0, TAU); ctx.fill();
  const ir = Math.min(ex, ey) * (wide ? 0.62 : 0.78);
  const ix = cx + look * ex * 0.3, iy = cy + ey * 0.12;
  const ig = ctx.createRadialGradient(ix, iy + ir * 0.45, ir * 0.1, ix, iy, ir);
  ig.addColorStop(0, iris[0]); ig.addColorStop(0.65, iris[1]); ig.addColorStop(1, iris[2]);
  ctx.fillStyle = ig; ctx.beginPath(); ctx.ellipse(ix, iy, ir, ir * 1.1, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#1b1222'; ctx.beginPath(); ctx.ellipse(ix, iy + ir * 0.08, ir * 0.55, ir * 0.62, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(ix + LIGHT.x * ir * 0.38, iy + LIGHT.y * ir * 0.42, ir * 0.3, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(ix - LIGHT.x * ir * 0.35, iy - LIGHT.y * ir * 0.4, ir * 0.14, 0, TAU); ctx.fill();
  // dünne Lidlinie oben
  const a0 = LIGHT.y < 0 ? Math.PI * 1.12 : Math.PI * 0.12;
  ctx.strokeStyle = 'rgba(110,60,30,0.55)'; ctx.lineWidth = 0.4;
  ctx.beginPath(); ctx.ellipse(cx, cy, ex, ey, 0, a0, a0 + Math.PI * 0.76); ctx.stroke();
}

/** Stiefel/Schuh: Knöchel bei (ax, ay), Spitze nach rechts, ang dreht den Fuß. */
function boot(ctx, ax, ay, ang, cols, sock) {
  ctx.save(); ctx.translate(ax, ay); ctx.rotate(ang);
  if (sock) { ctx.fillStyle = '#fff8f0'; ctx.beginPath(); ctx.ellipse(0, -0.7, 1.35, 0.9, 0, 0, TAU); ctx.fill(); }
  ctx.fillStyle = lin(ctx, -1.6, -1, 4.2, 3, cols);
  ctx.beginPath();
  ctx.moveTo(-1.5, sock ? -0.1 : -1.0);
  ctx.lineTo(1.2, sock ? -0.1 : -1.0);
  ctx.quadraticCurveTo(1.5, 0.5, 2.4, 1.0);
  ctx.quadraticCurveTo(2.8, 2.0, 1.7, 2.0);
  ctx.lineTo(-0.8, 2.0);
  ctx.quadraticCurveTo(-1.7, 2.0, -1.5, 1.1);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  ctx.beginPath(); ctx.ellipse(-0.5, 0.2, 0.55, 0.7, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

/** Arm: Haut-Röhre, Hand, Puffärmel über der Schulter. */
function arm(ctx, pts, style) {
  tube(ctx, pts, 1.5, SKIN);
  const [hx, hy] = pts[pts.length - 1];
  ball(ctx, hx, hy, 1.05, 1.05, SKIN, 0.4);
  ball(ctx, pts[0][0], pts[0][1], 1.6, 1.5, style.dress, 0.45);
}

/** Bein: Haut-Röhre + Stiefel am Knöchel. */
function leg(ctx, pts, footAng, style) {
  tube(ctx, pts, 2.0, SKIN);
  const [ax, ay] = pts[pts.length - 1];
  boot(ctx, ax, ay, footAng, style.shoe, style.socks);
}

// ---------------------------------------------------------------- Frisuren
/** Lotti: dicker Zopf von (bx, by) in Richtung dir (-1 links / +1 rechts), Winkel ang (>0 = nach oben), Krümmung curl. */
function braid(ctx, bx, by, dir, ang, curl, style) {
  let a = ang, x = bx, y = by;
  const segs = [1.8, 1.65, 1.5], step = [1.0, 1.6, 1.5];
  for (let i = 0; i < 3; i++) {
    x += dir * Math.cos(a) * step[i]; y -= Math.sin(a) * step[i];
    const theta = dir > 0 ? -a : Math.PI + a;
    // Schattenkerbe zwischen den Flechtsegmenten, dann die pralle Kugel
    if (i > 0) {
      ctx.fillStyle = 'rgba(70,45,10,0.45)';
      ctx.beginPath(); ctx.ellipse(x - dir * Math.cos(a) * step[i] * 0.5, y + Math.sin(a) * step[i] * 0.5, segs[i] * 0.95, segs[i] * 0.8, theta, 0, TAU); ctx.fill();
    }
    ball(ctx, x, y, segs[i], segs[i] * 0.88, style.hair, i === 0 ? 0.5 : 0.4);
    // schräge Flechtlinie
    ctx.strokeStyle = 'rgba(90,60,20,0.4)'; ctx.lineWidth = 0.45; ctx.lineCap = 'round';
    ctx.save(); ctx.translate(x, y); ctx.rotate(theta);
    ctx.beginPath(); ctx.moveTo(-segs[i] * 0.45, -segs[i] * 0.6); ctx.quadraticCurveTo(segs[i] * 0.3, 0, -segs[i] * 0.45, segs[i] * 0.6); ctx.stroke();
    ctx.restore();
    a += curl;
  }
  // Haargummi (rot) quer zum Zopf, dann helle Quaste
  x += dir * Math.cos(a) * 1.45; y -= Math.sin(a) * 1.45;
  const theta = dir > 0 ? -a : Math.PI + a;
  ctx.save(); ctx.translate(x, y); ctx.rotate(theta);
  ball(ctx, 0, 0, 0.7, 1.2, style.bow, 0.5);
  ctx.translate(1.6, 0);
  ball(ctx, 0, 0, 1.25, 1.05, [style.hairTip, style.hairTip, style.hair[1]], 0.3);
  ctx.strokeStyle = 'rgba(120,80,20,0.4)'; ctx.lineWidth = 0.4;
  ctx.beginPath(); ctx.moveTo(0.2, -0.6); ctx.lineTo(1.0, -0.9); ctx.moveTo(0.3, 0); ctx.lineTo(1.2, 0); ctx.moveTo(0.2, 0.6); ctx.lineTo(1.0, 0.9); ctx.stroke();
  ctx.restore();
}

/** Lotti: rote Haarschleife auf dem Kopf. */
function bow(ctx, bx, by, style) {
  for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(bx + s * 1.6, by); ctx.rotate(s * 0.5);
    ball(ctx, 0, 0, 1.75, 1.1, style.bow, 0.45);
    // Schleifenfalte
    ctx.strokeStyle = 'rgba(90,10,10,0.45)'; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(-s * 1.2, 0); ctx.quadraticCurveTo(0, 0.4, s * 0.6, 0.1); ctx.stroke();
    ctx.restore();
  }
  ball(ctx, bx, by + 0.1, 0.85, 0.8, style.bow, 0.5);
}

/** Lotti: hinterer Zopf (hinter dem Kopf). */
function lottiBackHair(ctx, hx, hy, hair, style) {
  braid(ctx, hx - 4.4, hy + 0.9, -1, hair.l ?? 0.15, hair.curl ?? 0, style);
}

/** Lotti: Pony mit drei Bögen, Schleife und vorderer Zopf. */
function lottiFrontHair(ctx, hx, hy, hair, style) {
  ctx.save();
  ctx.beginPath(); ctx.arc(hx - 0.4, hy - 0.4, 5.7, 0, TAU); ctx.clip();
  ctx.fillStyle = lin(ctx, hx - 6, hy - 6, 12, 7, style.hair);
  ctx.beginPath();
  ctx.moveTo(hx - 6, hy - 1.4);
  ctx.quadraticCurveTo(hx - 3.9, hy + 0.9, hx - 2.3, hy - 1.0);
  ctx.quadraticCurveTo(hx - 0.1, hy + 1.0, hx + 1.9, hy - 0.9);
  ctx.quadraticCurveTo(hx + 3.9, hy + 1.1, hx + 6, hy - 0.4);
  ctx.lineTo(hx + 6, hy - 6.5); ctx.lineTo(hx - 6, hy - 6.5);
  ctx.closePath(); ctx.fill();
  // Glanzbogen im Haar
  ctx.strokeStyle = 'rgba(255,245,210,0.5)'; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.arc(hx - 0.4, hy - 0.4, 4.2, Math.PI * 1.12, Math.PI * 1.42); ctx.stroke();
  ctx.restore();
  bow(ctx, hx - 1.4, hy - 5.1, style);
  braid(ctx, hx + 4.4, hy + 0.7, 1, hair.r ?? 0.15, -(hair.curl ?? 0), style);
}

/** Greta: lange offene Haare hinter Kopf und Schultern; flow = Richtung Wurzel → Spitze. */
function gretaBackHair(ctx, hx, hy, hair, style) {
  const [fx, fy] = hair.flow ?? [0.3, 9.2];
  const len = Math.hypot(fx, fy) || 1;
  const px = -fy / len, py = fx / len;   // Normale zur Flugrichtung
  const phi = Math.atan2(fy, fx);        // Flugrichtung; die Wurzeln sitzen am Kopfrand in dieser Richtung
  const cx = hx - 0.4, cy = hy - 0.4, r = 5.0;
  // [Winkelversatz zur Flugrichtung, Längenfaktor, Ausbauchung, Wurzelbreite]
  const strands = [
    [0.95, 1.0, 1.5, 3.4],
    [0.4, 0.85, 0.5, 3.0],
    [-0.95, 0.8, -1.3, 2.6],
  ];
  for (const [d, k, bulge, w] of strands) {
    const x0 = cx + Math.cos(phi + d) * r, y0 = cy + Math.sin(phi + d) * r;
    const x1 = x0 + fx * k, y1 = y0 + fy * k;
    lock(ctx, x0, y0, x0 + fx * k * 0.5 + px * bulge, y0 + fy * k * 0.5 + py * bulge, x1, y1, w, style.hair);
  }
}

/** Greta: seitlich geschwungener Pony, Haarreif, eine Strähne vor der Schulter. */
function gretaFrontHair(ctx, hx, hy, hair, style) {
  const [fx, fy] = hair.flow ?? [0.3, 9.2];
  ctx.save();
  ctx.beginPath(); ctx.arc(hx - 0.4, hy - 0.4, 5.7, 0, TAU); ctx.clip();
  ctx.fillStyle = lin(ctx, hx - 6, hy - 6, 12, 7, style.hair);
  ctx.beginPath();
  ctx.moveTo(hx - 6, hy - 1.0);
  ctx.quadraticCurveTo(hx - 3.2, hy + 0.3, hx - 0.6, hy - 1.2);
  ctx.quadraticCurveTo(hx + 2.6, hy - 2.6, hx + 6, hy + 0.9);
  ctx.lineTo(hx + 6, hy - 6.5); ctx.lineTo(hx - 6, hy - 6.5);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,235,0.55)'; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.arc(hx - 0.4, hy - 0.4, 4.3, Math.PI * 1.1, Math.PI * 1.4); ctx.stroke();
  ctx.restore();
  // Haarreif (rosa Bogen über den Kopf)
  ctx.lineCap = 'round';
  ctx.strokeStyle = style.band[2]; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.arc(hx - 0.4, hy - 0.4, 5.3, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  ctx.strokeStyle = style.band[1]; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.arc(hx - 0.6, hy - 0.6, 5.3, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
  ctx.strokeStyle = style.band[0]; ctx.lineWidth = 0.4;
  ctx.beginPath(); ctx.arc(hx - 0.7, hy - 0.7, 5.3, Math.PI * 1.2, Math.PI * 1.5); ctx.stroke();
  // Strähne vor der rechten Schulter
  lock(ctx, hx + 4.6, hy + 2.2, hx + 5.6 + fx * 0.2, hy + 4.5 + fy * 0.3, hx + 4.4 + fx * 0.45, hy + 2.2 + fy * 0.62, 1.7, style.hair);
}

// ---------------------------------------------------------------- Figur
/** Baut eine Pose mit Standardwerten (Stand, Blick nach rechts). Gelenkpunkte in Frame-Koordinaten. */
function pose(o = {}) {
  const dy = o.dy ?? 0, lean = o.lean ?? 0;
  const sL = 9.3 + lean, sR = 14.7 + lean, shY = 12.9 + dy;
  return {
    dy, lean, sL, sR, shY,
    swing: 0, spread: 0, flare: 0,
    eyes: 'open', mouth: 'smile',
    head: [12 + lean * 0.9, 6.6 + dy],
    hair: {},
    armBack: [[sL - 0.1, shY + 1.1], [sL - 1.2, shY + 5.0]],
    armFront: [[sR + 0.1, shY + 1.1], [sR + 1.2, shY + 5.0]],
    legBack: [[10.9, 18.4 + dy], [10.6, 22 + dy]], footBack: 0,
    legFront: [[13.3, 18.4 + dy], [13.6, 22 + dy]], footFront: 0,
    armsFront: false, flipY: false,
    ...o,
  };
}

/** Kleid: Mieder, Rock mit Saumbogen, Kragen; Greta zusätzlich Schürze mit Latz. */
function dress(ctx, p, style) {
  const { sL, sR, shY, lean, dy, swing, spread, flare } = p;
  const waistY = shY + 2.7, hemY = 19.8 + dy;
  const cx = 12 + lean;
  const wL = cx - 2.3, wR = cx + 2.3;
  const hL = 7.3 + swing - spread, hR = 16.7 + swing * 0.5 + spread;
  const skirt = () => {
    ctx.beginPath();
    ctx.moveTo(sL, shY);
    ctx.quadraticCurveTo(wL - 0.4, waistY, wL, waistY);
    ctx.lineTo(hL, hemY - 0.7 - flare);
    ctx.quadraticCurveTo((hL + hR) / 2 - 1, hemY + 1.0 - flare * 0.5, hR, hemY - 0.6);
    ctx.lineTo(wR, waistY);
    ctx.quadraticCurveTo(wR + 0.4, waistY, sR, shY);
    ctx.quadraticCurveTo(cx, shY - 0.9, sL, shY);
    ctx.closePath();
  };
  const grad = ctx.createRadialGradient(cx - 3, shY + 1.5, 1, cx, hemY - 2.5, 10);
  grad.addColorStop(0, style.dress[0]); grad.addColorStop(0.5, style.dress[1]); grad.addColorStop(1, style.dress[2]);
  ctx.fillStyle = grad; skirt(); ctx.fill();
  // Taillenschatten und Saumkante
  ctx.save(); skirt(); ctx.clip();
  ctx.fillStyle = 'rgba(20,30,80,0.18)';
  ctx.beginPath(); ctx.ellipse(cx, waistY + 0.3, 3.2, 0.9, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(hL + 0.5, hemY - 1.0 - flare); ctx.quadraticCurveTo((hL + hR) / 2 - 1, hemY + 0.4 - flare * 0.5, hR - 0.5, hemY - 1.0); ctx.stroke();
  if (style.apron) {
    // weiße Schürze: Latz + Rockteil
    ctx.fillStyle = lin(ctx, cx - 4, shY, 8, hemY - shY, ['#ffffff', '#f7f3ea', '#cfc6b4']);
    ctx.beginPath();
    ctx.moveTo(cx - 1.4, shY + 1.4); ctx.lineTo(cx + 1.4, shY + 1.4);
    ctx.lineTo(wR - 0.7, waistY); ctx.lineTo(hR - 1.9, hemY - 0.6);
    ctx.quadraticCurveTo((hL + hR) / 2 - 0.6, hemY + 0.5 - flare * 0.4, hL + 2.0, hemY - 0.9 - flare * 0.6);
    ctx.lineTo(wL + 0.7, waistY); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(80,60,40,0.25)'; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(wL + 0.9, waistY + 0.2); ctx.lineTo(wR - 0.9, waistY + 0.2); ctx.stroke();
  }
  ctx.restore();
  // Kragen: zwei weiße Rundungen am Hals
  for (const s of [-1, 1]) ball(ctx, cx + s * 1.25, shY + 0.9, 1.35, 1.15, ['#ffffff', '#faf7f0', '#cfc8ba'], 0);
  ctx.fillStyle = 'rgba(60,40,20,0.25)';
  ctx.beginPath(); ctx.ellipse(cx, shY + 0.3, 0.9, 0.5, 0, 0, TAU); ctx.fill();
}

/** Kopf: Haarkappe, Gesicht, Augen, Mund, Wangen, dann Frisur vorn. */
function face(ctx, p, style) {
  const [hx, hy] = p.head;
  ball(ctx, hx - 0.4, hy - 0.4, 5.7, 5.7, style.hair, 0);                        // Haarkappe
  ball(ctx, hx + 0.6, hy + 0.9, 4.7, 4.8, SKIN, 0.22);                            // Gesicht
  // Augen (3/4-Ansicht: hinteres Auge etwas schmaler)
  eye(ctx, hx - 0.7, hy + 1.9, 1.2, 1.6, style.iris, 0.4, p.eyes);
  eye(ctx, hx + 2.9, hy + 1.8, 1.4, 1.7, style.iris, 0.4, p.eyes);
  // Wangen
  ctx.fillStyle = 'rgba(255,110,110,0.42)';
  ctx.beginPath(); ctx.ellipse(hx - 2.3, hy + 3.9, 1.0, 0.65, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(hx + 4.4, hy + 3.7, 1.0, 0.65, 0, 0, TAU); ctx.fill();
  // Näschen
  ctx.fillStyle = 'rgba(200,120,80,0.35)';
  ctx.beginPath(); ctx.ellipse(hx + 1.5, hy + 3.4, 0.4, 0.3, 0, 0, TAU); ctx.fill();
  // Mund
  const mx = hx + 1.6, my = hy + 4.5;
  if (p.mouth === 'smile') {
    ctx.strokeStyle = 'rgba(130,40,30,0.9)'; ctx.lineWidth = 0.55; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(mx, my - 0.3, 1.15, 0.75, 0, Math.PI * 0.12, Math.PI * 0.88); ctx.stroke();
  } else if (p.mouth === 'open') {
    ctx.fillStyle = '#7a2230';
    ctx.beginPath(); ctx.ellipse(mx, my + 0.1, 1.0, 0.95, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff7d8a';
    ctx.beginPath(); ctx.ellipse(mx, my + 0.6, 0.6, 0.4, 0, 0, TAU); ctx.fill();
  } else {
    ctx.fillStyle = '#7a2230';
    ctx.beginPath(); ctx.ellipse(mx, my + 0.1, 0.7, 0.8, 0, 0, TAU); ctx.fill();
  }
  style.frontHair(ctx, hx, hy, p.hair, style);
}

function drawHero(g, style, p) {
  const { ctx } = g;
  ctx.save();
  if (p.flipY) { ctx.translate(0, H); ctx.scale(1, -1); LIGHT = { x: -1, y: 1 }; }
  const [hx, hy] = p.head;
  style.backHair(ctx, hx, hy, p.hair, style);
  if (!p.armsFront) arm(ctx, p.armBack, style);
  leg(ctx, p.legBack, p.footBack, style);
  leg(ctx, p.legFront, p.footFront, style);
  // Hals
  ctx.fillStyle = SKIN[2];
  ctx.beginPath(); ctx.ellipse(12 + p.lean, p.shY + 0.2, 1.1, 1.6, 0, 0, TAU); ctx.fill();
  dress(ctx, p, style);
  if (!p.armsFront) arm(ctx, p.armFront, style);
  face(ctx, p, style);
  if (p.armsFront) { arm(ctx, p.armBack, style); arm(ctx, p.armFront, style); }
  LIGHT = { x: -1, y: -1 };
  ctx.restore();
}

// ---------------------------------------------------------------- Posen
const POSES = {
  idle0: pose({ hair: { l: 0.15, r: 0.15, flow: [0.3, 9.2] } }),
  idle1: pose({ dy: 0.35, eyes: 'blink', hair: { l: -0.05, r: -0.05, flow: [0.5, 9.5] } }),
  // Lauf: Kontakt (Beine gespreizt) – hinterer Arm schwingt vor, vorderer zurück
  run0: pose({
    lean: 0.9, swing: -1.6, flare: 0.9, mouth: 'smile',
    hair: { l: 0.5, r: 0.7, curl: -0.2, flow: [-5.5, 6.0] },
    legBack: [[11.0, 18.4], [9.0, 20.3], [8.0, 22]], footBack: -0.35,
    legFront: [[13.4, 18.4], [15.6, 20.2], [16.6, 22]], footFront: 0.3,
    armBack: [[9.2, 14.0], [13.2, 16.6], [17.4, 14.0]],
    armFront: [[15.6, 14.0], [14.6, 17.0], [12.4, 18.0]],
  }),
  // Lauf: Durchgang (Körper hoch) – hinteres Bein angewinkelt
  run1: pose({
    dy: -1.0, lean: 0.7, swing: -1.0, flare: 0.5,
    hair: { l: 0.1, r: 0.2, curl: 0.15, flow: [-4.5, 7.5] },
    legBack: [[11.0, 17.4], [9.6, 19.4], [10.4, 21.0]], footBack: -0.7,
    legFront: [[13.2, 17.4], [13.4, 21.0]], footFront: 0,
    armBack: [[9.1, 13.0], [8.6, 15.4], [10.4, 16.8]],
    armFront: [[15.5, 13.0], [16.4, 15.4], [15.2, 16.9]],
  }),
  // Lauf: zweiter Kontakt – vorderer Arm angewinkelt vor, hinterer zurück
  run2: pose({
    lean: 0.9, swing: -1.6, flare: 0.9,
    hair: { l: 0.5, r: 0.7, curl: -0.2, flow: [-5.5, 6.0] },
    legBack: [[11.0, 18.4], [13.8, 20.3], [15.2, 22]], footBack: 0.3,
    legFront: [[13.4, 18.4], [11.0, 20.3], [8.6, 22]], footFront: -0.3,
    armBack: [[9.2, 14.0], [7.6, 16.0], [6.6, 17.8]],
    armFront: [[15.6, 14.0], [17.0, 16.2], [17.6, 13.6]],
  }),
  run3: pose({
    dy: -1.0, lean: 0.7, swing: -1.0, flare: 0.5,
    hair: { l: 0.1, r: 0.2, curl: 0.15, flow: [-4.5, 7.5] },
    legBack: [[11.0, 17.4], [11.0, 21.0]], footBack: 0,
    legFront: [[13.4, 17.4], [15.2, 19.4], [14.6, 21.0]], footFront: -0.6,
    armBack: [[9.1, 13.0], [8.2, 15.4], [9.0, 17.2]],
    armFront: [[15.5, 13.0], [16.6, 15.2], [16.0, 17.0]],
  }),
  // Sprung: Faust hoch, Beine angezogen, Haare hängen
  jump: pose({
    dy: -0.6, lean: 0.6, swing: -0.8, flare: 0.4, mouth: 'open', armsFront: true,
    hair: { l: -0.45, r: -0.35, curl: -0.1, flow: [-1.8, 9.5] },
    legBack: [[11.0, 17.8], [9.0, 19.8], [9.8, 21.2]], footBack: -0.75,
    legFront: [[13.4, 17.8], [15.4, 19.9], [14.4, 21.4]], footFront: -0.5,
    armBack: [[9.1, 13.4], [7.6, 15.8], [6.8, 17.8]],
    armFront: [[15.5, 13.4], [16.6, 8.0], [16.4, 1.9]],
  }),
  // Fall: Arme ausgebreitet, Haare hoch, Mund offen
  fall: pose({
    spread: 0.8, eyes: 'wide', mouth: 'o',
    hair: { l: 0.95, r: 0.95, curl: 0.15, flow: [-3.6, -6.5] },
    legBack: [[10.9, 18.4], [9.0, 20.3], [8.4, 22]], footBack: -0.25,
    legFront: [[13.3, 18.4], [15.2, 20.3], [15.8, 22]], footFront: 0.2,
    armBack: [[9.2, 14.0], [5.6, 13.6], [3.0, 13.0]],
    armFront: [[15.6, 14.0], [18.6, 13.6], [21.0, 13.0]],
  }),
  // Gleiten: beide Hände oben am Schirmstiel (bei x≈11, y≈1), Beine baumeln
  glide: pose({
    armsFront: true,
    hair: { l: -0.2, r: -0.2, flow: [0.6, 9.6] },
    legBack: [[10.9, 18.4], [10.4, 20.4], [10.2, 22]], footBack: -0.15,
    legFront: [[13.3, 18.4], [14.6, 20.5], [14.4, 22]], footFront: 0.15,
    armBack: [[9.2, 14.0], [7.0, 8.6], [10.6, 1.9]],
    armFront: [[15.6, 14.0], [17.0, 8.6], [12.8, 1.9]],
  }),
  // Reiten: Beine nach vorn-unten auf Pflaume, vordere Hand hält sich fest, hintere jubelt
  ride: pose({
    swing: 0.4, spread: 1.2, mouth: 'open',
    hair: { l: 0.35, r: 0.35, flow: [-0.6, 9.0] },
    legBack: [[11.6, 18.6], [14.6, 20.0], [16.6, 22]], footBack: 0.3,
    legFront: [[13.4, 18.8], [16.4, 20.2], [18.4, 22]], footFront: 0.35,
    armBack: [[9.2, 14.0], [6.8, 11.4], [5.8, 8.0]],
    armFront: [[15.6, 14.0], [16.6, 16.8], [17.6, 19.2]],
  }),
  // Sturzflug: Bild senkrecht gespiegelt (Kopf unten), Körper gestreckt, Arme angelegt, Haare „nach oben“
  dive: pose({
    flipY: true, spread: 0.9, eyes: 'wide', mouth: 'o',
    hair: { l: -0.85, r: -0.85, curl: -0.1, flow: [-4.5, 6.5] }, // gespiegelt: Haare fliegen zu den Füßen = nach oben
    legBack: [[10.9, 18.4], [10.4, 22]], footBack: -1.1,
    legFront: [[13.3, 18.4], [13.8, 22]], footFront: -1.1,
    armBack: [[9.2, 14.0], [8.0, 16.6], [8.6, 19.2]],
    armFront: [[15.6, 14.0], [16.8, 16.6], [16.2, 19.2]],
  }),
};

const LOTTI_STYLE = { ...LOTTI, backHair: lottiBackHair, frontHair: lottiFrontHair, socks: false, apron: false };
const GRETA_STYLE = { ...GRETA, backHair: gretaBackHair, frontHair: gretaFrontHair, socks: true, apron: true };

const drawSet = (style) => Object.fromEntries(Object.entries(POSES).map(([name, p]) => [name, (g) => drawHero(g, style, p)]));

export const HERO_FRAME = { width: W, height: H };

export const SHEETS = [
  { key: 'lotti', frameWidth: W, frameHeight: H, draw: drawSet(LOTTI_STYLE) },
  { key: 'greta', frameWidth: W, frameHeight: H, draw: drawSet(GRETA_STYLE) },
];
