import { POWER_COLORS } from '../palette.js';

// Pflaume – rundliches schwarz-weißes Kaninchen mit Schlappohren als Reittier (24x20), Vektorgrafik im
// 3D-World-Look. Blickt nach rechts, Pfoten auf der Unterkante, Hitbox allein 14x12 mittig unten (x 5–19, y 8–20).
// Beim Reiten liegen die Füße der Heldin auf y = 8: der Rücken (Scheitel bei y ≈ 4.6) ist die Sitzfläche,
// Kopf, Auge und Ohren vorn rechts bleiben sichtbar. Kraft-Farben (g.colors.Z Grundton, g.colors.z Glanz)
// liegen auf dem Halstuch.

const W = 24, H = 20;
const TAU = Math.PI * 2;

const FUR = ['#ffffff', '#f4f1f8', '#c3bbd2'];      // weißes Fell, kühler Schatten
const BLACK = ['#747288', '#302e3e', '#15131d'];    // schwarze Scheckung
const PINK = ['#ffd6e2', '#ff9dbd', '#cf5f88'];     // Nase, Innenohr

/** Hex-Farbe abdunkeln/aufhellen (f < 1 dunkler). */
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

/** Kugel/Ellipse mit radialem Verlauf (Licht oben links) und Glanzpunkt. */
function ball(ctx, cx, cy, rx, ry, cols, hl = 0.55) {
  const r = Math.max(rx, ry);
  const grad = ctx.createRadialGradient(cx - rx * 0.35, cy - ry * 0.35, r * 0.08, cx, cy, r * 1.1);
  grad.addColorStop(0, cols[0]); grad.addColorStop(0.5, cols[1]); grad.addColorStop(1, cols[2]);
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.fill();
  if (hl > 0) {
    ctx.fillStyle = `rgba(255,255,255,${hl})`;
    ctx.beginPath(); ctx.ellipse(cx - rx * 0.42, cy - ry * 0.46, rx * 0.3, ry * 0.16, -0.7, 0, TAU); ctx.fill();
  }
}

/** Punkt auf einer quadratischen Bézierkurve. */
const qpt = (x0, y0, cx, cy, x1, y1, t) => [
  (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1,
  (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1,
];

/**
 * Ohr: weicher dicker Strich mit runden Enden entlang einer Kurve Wurzel → Spitze,
 * Schattierung durch versetzte Striche; inner > 0 zeigt die rosa Innenseite.
 */
function ear(ctx, x0, y0, cx, cy, x1, y1, w, cols, inner = 0) {
  const trace = (dx, dy, t0 = 0, t1 = 1) => {
    ctx.beginPath();
    const [sx, sy] = qpt(x0, y0, cx, cy, x1, y1, t0);
    ctx.moveTo(sx + dx, sy + dy);
    for (let i = 1; i <= 8; i++) { const [px, py] = qpt(x0, y0, cx, cy, x1, y1, t0 + (t1 - t0) * i / 8); ctx.lineTo(px + dx, py + dy); }
  };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = cols[2]; ctx.lineWidth = w; trace(0, 0); ctx.stroke();
  ctx.strokeStyle = cols[1]; ctx.lineWidth = w * 0.72; trace(-w * 0.12, -w * 0.12); ctx.stroke();
  ctx.strokeStyle = cols[0]; ctx.lineWidth = w * 0.28; trace(-w * 0.22, -w * 0.22, 0.05, 0.85); ctx.stroke();
  if (inner > 0) {
    ctx.strokeStyle = `rgba(255,150,185,${inner})`; ctx.lineWidth = w * 0.42; trace(0, 0, 0.3, 0.9); ctx.stroke();
  }
}

/** Pfote: flaches weißes Oval mit Zehenkerben. */
function paw(ctx, x, y, rx, ry, cols = FUR) {
  ball(ctx, x, y, rx, ry, cols, 0.3);
  ctx.strokeStyle = 'rgba(80,70,100,0.3)'; ctx.lineWidth = 0.4;
  ctx.beginPath(); ctx.moveTo(x + rx * 0.3, y - ry * 0.3); ctx.lineTo(x + rx * 0.35, y + ry * 0.6);
  ctx.moveTo(x + rx * 0.7, y - ry * 0.2); ctx.lineTo(x + rx * 0.75, y + ry * 0.5); ctx.stroke();
}

/**
 * Ganzes Kaninchen. o: dy (Körper hoch/runter), sx/sy (Körper breiter/flacher), head [dx, dy],
 * earNear/earFar [cx, cy, x1, y1] (Kontrollpunkt und Spitze), inner (Innenohr sichtbar), eye ('open' | 'wide'),
 * mouth ('smile' | 'open'), nose (Versatz Nasenwackeln), sweat, flutter, legs ('stand' | 'crouch' | 'stretch' | 'tuck' | 'spread').
 */
function rabbit(g, o) {
  const { ctx, colors } = g;
  const Z = colors.Z ?? '#b47fe6', z = colors.z ?? '#d9b8f0';
  const dy = o.dy ?? 0, sx = o.sx ?? 1, sy = o.sy ?? 1;
  const hx = 19.4 + (o.head?.[0] ?? 0), hy = 11.7 + dy * 0.8 + (o.head?.[1] ?? 0);
  const legs = o.legs ?? 'stand';
  ctx.save();
  // Bodenschatten
  ctx.fillStyle = `rgba(40,20,60,${legs === 'tuck' ? 0.16 : 0.26})`;
  ctx.beginPath(); ctx.ellipse(11.5, 19.1, 9.6 + dy * 0.6, 1.2, 0, 0, TAU); ctx.fill();
  // Puschelschwanz (hinter dem Körper)
  ball(ctx, 2.0, 10.6 + dy, 1.9, 1.9, FUR, 0.5);
  // hintere Pfoten (dunkler, hinter dem Körper)
  const far = ['#e9e4f0', '#cfc7dc', '#9d94b2'];
  if (legs === 'stretch') paw(ctx, 6.0, 18.3, 2.4, 0.9, far);
  else if (legs === 'spread') paw(ctx, 9.0, 18.4, 2.2, 0.9, far);
  else if (legs !== 'tuck') paw(ctx, 8.6, 18.4, 2.2, 0.9, far);
  // Körper: weicher Laib, Rücken als Sitzfläche (Scheitel bei y ≈ 4.6)
  ctx.save();
  ctx.translate(10.2, 11.8 + dy); ctx.scale(sx, sy); ctx.translate(-10.2, -11.8);
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(16.8, 7.6);
    ctx.quadraticCurveTo(14.5, 4.2, 9.4, 4.6);
    ctx.quadraticCurveTo(2.6, 5.0, 1.5, 11.0);
    ctx.quadraticCurveTo(1.0, 17.4, 7.0, 18.3);
    ctx.quadraticCurveTo(13.0, 19.2, 18.0, 18.0);
    ctx.quadraticCurveTo(21.4, 16.8, 19.6, 13.0);
    ctx.closePath();
  };
  const fg = ctx.createRadialGradient(6.5, 7.5, 0.5, 10.2, 11.8, 10.5);
  fg.addColorStop(0, FUR[0]); fg.addColorStop(0.55, FUR[1]); fg.addColorStop(1, FUR[2]);
  ctx.fillStyle = fg; body(); ctx.fill();
  ctx.strokeStyle = 'rgba(90,75,125,0.4)'; ctx.lineWidth = 0.6; body(); ctx.stroke(); // weiche Trennkante
  ctx.save(); body(); ctx.clip();
  // schwarze Scheckung
  ball(ctx, 8.4, 7.6, 3.4, 2.5, BLACK, 0.25);
  ball(ctx, 3.9, 12.8, 2.5, 2.8, BLACK, 0.2);
  ball(ctx, 13.4, 16.6, 1.3, 0.9, BLACK, 0);
  // Hinterlauf-Falte, Bauchschatten
  ctx.strokeStyle = 'rgba(90,70,120,0.22)'; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.arc(6.2, 14.4, 3.2, Math.PI * 0.75, Math.PI * 1.6); ctx.stroke();
  ctx.fillStyle = 'rgba(80,60,110,0.18)';
  ctx.beginPath(); ctx.ellipse(11, 17.6, 7.5, 1.6, 0, 0, TAU); ctx.fill();
  // Glanz auf dem Rücken
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath(); ctx.ellipse(6.0, 6.3, 2.2, 0.8, -0.35, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.restore();
  // fernes Ohr (hinter dem Kopf, vor dem Körper)
  const ef = o.earFar ?? [hx - 4.8, hy + 0.2, hx - 4.9, hy + 3.4];
  ear(ctx, hx - 2.8, hy - 2.7, ef[0], ef[1], ef[2], ef[3], 2.4, ['#5c5a70', '#262433', '#0f0e16'], o.inner ? 0.75 : 0);
  // vordere Pfoten
  if (legs === 'stretch') { paw(ctx, 17.4, 17.6, 1.5, 0.9); paw(ctx, 19.6, 18.0, 1.5, 0.9); }
  else if (legs === 'tuck') { paw(ctx, 16.6, 17.6, 1.5, 0.85); paw(ctx, 18.4, 17.9, 1.4, 0.8); }
  else if (legs === 'spread') { paw(ctx, 16.0, 18.6, 1.5, 0.95); paw(ctx, 20.4, 18.7, 1.5, 0.95); }
  else { paw(ctx, 16.4, 18.5, 1.5, 0.95); paw(ctx, 18.8, 18.7, 1.5, 0.95); }
  // nahe Hinterpfote (großer Hasenfuß)
  if (legs === 'stretch') paw(ctx, 3.6, 18.8, 2.8, 1.0);
  else if (legs === 'spread') paw(ctx, 4.4, 18.8, 2.8, 1.0);
  else if (legs === 'tuck') paw(ctx, 6.4, 18.0, 2.4, 0.85);
  else paw(ctx, 5.8, 18.8, 2.7, 1.0);
  // Kopf
  ball(ctx, hx, hy, 4.2, 4.1, FUR, 0.5);
  ctx.strokeStyle = 'rgba(90,75,125,0.4)'; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.ellipse(hx, hy, 4.2, 4.1, 0, 0, TAU); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.ellipse(hx, hy, 4.2, 4.1, 0, 0, TAU); ctx.clip();
  ball(ctx, hx + 1.7, hy - 0.7, 2.8, 2.9, BLACK, 0.2);           // schwarze Augenpartie
  ctx.restore();
  // Halstuch (Kraftfarbe): Band um den Hals, Zipfel vor der Brust
  ctx.lineCap = 'round';
  ctx.strokeStyle = shade(Z, 0.7); ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(hx - 2.6, hy + 2.8); ctx.quadraticCurveTo(hx + 0.4, hy + 5.6, hx + 3.8, hy + 3.0); ctx.stroke();
  ctx.strokeStyle = Z; ctx.lineWidth = 1.0;
  ctx.beginPath(); ctx.moveTo(hx - 2.6, hy + 2.6); ctx.quadraticCurveTo(hx + 0.4, hy + 5.2, hx + 3.8, hy + 2.8); ctx.stroke();
  const tg = ctx.createLinearGradient(hx - 1.5, hy + 3.5, hx + 1.5, hy + 7.5);
  tg.addColorStop(0, z); tg.addColorStop(0.45, Z); tg.addColorStop(1, shade(Z, 0.6));
  ctx.fillStyle = tg;
  ctx.beginPath(); ctx.moveTo(hx - 1.8, hy + 3.5); ctx.quadraticCurveTo(hx + 0.8, hy + 4.8, hx + 2.6, hy + 4.4);
  ctx.quadraticCurveTo(hx + 1.2, hy + 5.8, hx + 0.4, hy + 6.8); ctx.quadraticCurveTo(hx - 1.2, hy + 5.4, hx - 1.8, hy + 3.5);
  ctx.closePath(); ctx.fill();
  ball(ctx, hx + 3.6, hy + 2.7, 0.75, 0.65, [z, Z, shade(Z, 0.6)], 0.4); // Knoten
  // Auge
  const wide = o.eye === 'wide';
  const ex = hx + 1.6, ey = hy - 0.6, erx = wide ? 2.0 : 1.7, ery = wide ? 2.3 : 1.95;
  const wg = ctx.createLinearGradient(ex, ey - ery, ex, ey + ery);
  wg.addColorStop(0, '#d5d8ea'); wg.addColorStop(0.4, '#ffffff'); wg.addColorStop(1, '#ffffff');
  ctx.fillStyle = wg; ctx.beginPath(); ctx.ellipse(ex, ey, erx, ery, 0, 0, TAU); ctx.fill();
  const ir = wide ? 0.8 : 1.3, ix = ex + (wide ? 0.5 : 0.4), iy = ey + (wide ? 0.4 : 0.25);
  const ig = ctx.createRadialGradient(ix, iy + ir * 0.4, 0.1, ix, iy, ir);
  ig.addColorStop(0, '#8a5a3a'); ig.addColorStop(0.6, '#4a2a1a'); ig.addColorStop(1, '#1a0c08');
  ctx.fillStyle = ig; ctx.beginPath(); ctx.ellipse(ix, iy, ir, ir * 1.1, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#0d0608'; ctx.beginPath(); ctx.ellipse(ix, iy + 0.1, ir * 0.6, ir * 0.66, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(ix - ir * 0.4, iy - ir * 0.42, ir * 0.32, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(ix + ir * 0.35, iy + ir * 0.4, ir * 0.15, 0, TAU); ctx.fill();
  // Nase (rosa, wackelt), Mund, Wange, Schnurrhaare
  const nz = o.nose ?? 0;
  ball(ctx, hx + 3.7, hy + 0.5 - nz, 0.8 + nz * 0.3, 0.6, PINK, 0.5);
  ctx.strokeStyle = 'rgba(90,50,70,0.7)'; ctx.lineWidth = 0.4;
  if (o.mouth === 'open') {
    ctx.fillStyle = '#6a2238';
    ctx.beginPath(); ctx.ellipse(hx + 3.2, hy + 1.9, 0.8, 0.9, 0, 0, TAU); ctx.fill();
  } else {
    ctx.beginPath(); ctx.moveTo(hx + 3.7, hy + 1.1 - nz); ctx.lineTo(hx + 3.6, hy + 1.6);
    ctx.moveTo(hx + 2.8, hy + 1.5); ctx.quadraticCurveTo(hx + 3.6, hy + 2.3, hx + 4.3, hy + 1.6); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,120,150,0.4)';
  ctx.beginPath(); ctx.ellipse(hx + 1.6, hy + 2.3, 0.9, 0.5, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(60,40,70,0.45)'; ctx.lineWidth = 0.3;
  ctx.beginPath(); ctx.moveTo(hx + 3.0, hy + 1.2); ctx.lineTo(hx + 4.7, hy + 0.9);
  ctx.moveTo(hx + 3.0, hy + 1.5); ctx.lineTo(hx + 4.7, hy + 2.0); ctx.stroke();
  // nahes Ohr (vor dem Kopf)
  const en = o.earNear ?? [hx - 2.6, hy + 0.2, hx - 2.4, hy + 3.9];
  ear(ctx, hx - 0.8, hy - 3.8, en[0], en[1], en[2], en[3], 2.6, BLACK, o.inner ? 0.85 : 0);
  // Flatterlinien
  if (o.flutter) {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 0.5; ctx.lineCap = 'round';
    for (const [ax, ay] of [[en[2] + 0.6, en[3] + 2.2], [en[2] - 1.6, en[3] + 3.4]]) {
      ctx.beginPath(); ctx.arc(ax, ay, 1.1, Math.PI * 0.8, Math.PI * 1.4); ctx.stroke();
    }
  }
  // Schweißtropfen
  if (o.sweat) {
    for (const [tx, ty, s] of [[23.0, 5.0, 1], [15.2, 2.6, 0.8]]) {
      ctx.fillStyle = '#9fd0ff';
      ctx.beginPath(); ctx.moveTo(tx, ty - 1.5 * s);
      ctx.quadraticCurveTo(tx + 1.1 * s, ty + 0.4 * s, tx, ty + 0.9 * s);
      ctx.quadraticCurveTo(tx - 1.1 * s, ty + 0.4 * s, tx, ty - 1.5 * s); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.arc(tx - 0.3 * s, ty, 0.3 * s, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
}

export const SHEETS = [
  {
    key: 'pflaume', frameWidth: W, frameHeight: H, variants: POWER_COLORS,
    draw: {
      idle0: (g) => rabbit(g, {}),
      idle1: (g) => rabbit(g, { dy: 0.35, sx: 1.03, sy: 0.96, nose: 0.3, earNear: [16.6, 12.3, 16.6, 16.2], earFar: [14.4, 12.3, 14.1, 15.6] }),
      // Hoppeln: geduckt (Pfoten zusammen) → gestreckt (Körper hoch, Ohren schwingen zurück)
      walk0: (g) => rabbit(g, { dy: 0.4, sx: 1.04, sy: 0.94, legs: 'crouch', earNear: [17.4, 12.5, 17.6, 16.0], earFar: [15.0, 12.5, 15.2, 15.6] }),
      walk1: (g) => rabbit(g, { dy: -1.2, sx: 0.98, sy: 1.04, legs: 'stretch', head: [0.3, -0.4],
        earNear: [15.6, 7.9, 13.4, 11.2], earFar: [13.4, 7.3, 11.0, 10.0] }),
      // Panik: Ohren stehen hoch, Auge weit, Mund offen, Schweiß, Pfoten gespreizt
      panic: (g) => rabbit(g, { dy: 0.5, sx: 1.04, sy: 0.93, eye: 'wide', mouth: 'open', sweat: true, legs: 'spread', inner: true,
        earNear: [19.2, 4.6, 19.0, 1.0], earFar: [16.0, 5.0, 15.6, 1.3] }),
      // Flug (blaue Beere, nur mit Reiterin sichtbar): Schlappohren flattern wie Flügel nach oben/außen,
      // das ferne Ohr schaut links neben der Reiterin über den Rücken hinaus
      fly: (g) => rabbit(g, { dy: -1.0, legs: 'tuck', inner: true, flutter: true,
        earNear: [21.2, 4.6, 23.3, 1.6], earFar: [11.2, 7.0, 5.2, 3.2] }),
    },
  },
];
