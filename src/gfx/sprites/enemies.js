// Gegner als Vektorgrafik (3D-World-Look): Laufkäfer (16x16) und hüpfender Pilz (16x16).
// Licht von oben links, weiche Verläufe, Glanzpunkte, weicher Bodenschatten. Beide blicken nach rechts,
// Füße an der Frame-Unterkante. g = { ctx, w, h, S, colors }; Koordinaten in Weltpixeln.

// --- Helfer ---
function ellipse(ctx, cx, cy, rx, ry, rot = 0) {
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
}
function groundShadow(ctx, cx, cy, rx, ry, a = 0.25) {
  ctx.fillStyle = `rgba(40, 20, 30, ${a})`; ellipse(ctx, cx, cy, rx, ry); ctx.fill();
}
function gloss(ctx, cx, cy, rx, ry, rot = -0.6, a = 0.6) {
  ctx.fillStyle = `rgba(255, 255, 255, ${a})`; ellipse(ctx, cx, cy, rx, ry, rot); ctx.fill();
}
// Radialer Verlauf mit Lichtfokus oben links (lx/ly = Versatz des Fokus in Radien)
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
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
// Auge: Weiß, Pupille (px/py = Blickrichtung, pr = Pupillengröße relativ), Glanzpunkt
function eye(ctx, cx, cy, r, px = 0, py = 0, pr = 0.5) {
  ctx.fillStyle = '#ffffff'; ellipse(ctx, cx, cy, r, r); ctx.fill();
  ctx.fillStyle = '#1a1020'; ellipse(ctx, cx + px, cy + py, r * pr, r * pr); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ellipse(ctx, cx - r * 0.3 + px * 0.5, cy - r * 0.35 + py * 0.5, r * 0.22, r * 0.22); ctx.fill();
}
// Kuppel: obere Halbellipse (rx, ry) über einer leicht gewölbten Unterkante (rimRy); Unterkante bei y = rim
function domePath(ctx, cx, rim, rx, ry, rimRy) {
  ctx.beginPath();
  ctx.ellipse(cx, rim, rx, ry, 0, Math.PI, 0);
  ctx.ellipse(cx, rim, rx, rimRy, 0, 0, Math.PI);
  ctx.closePath();
}

// ======================= Laufkäfer =======================
// Hitbox 12x9 unten (x 2–14, y 7–16): Panzer y ≈ 6.6–13.3, Beine bis 15.5, Kopf rechts.
const BUG = {
  light: '#ff9d88', base: '#ff3b2f', dark: '#b3221a', deep: '#7a1410',
  spot: 'rgba(40, 12, 30, 0.9)', leg: '#2a1c30', legFar: '#5a4a6a',
};

// Beinchen: Hüfte (hx, hy) → Knie → Fuß; dx = Schwung des Fußes nach vorn/hinten
function leg(ctx, hx, hy, dx, color, width) {
  ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(hx, hy);
  ctx.quadraticCurveTo(hx + dx * 0.9, hy + 1.5, hx + dx * 1.7, hy + 3.0);
  ctx.stroke();
}

// Panzer mit Naht, Punkten und Glanz; (cx, rim) = Mitte/Unterkante, rx/ry Maße, flat = plattgedrückt
function shell(ctx, cx, rim, rx, ry, flat = false) {
  domePath(ctx, cx, rim, rx, ry, flat ? ry * 0.9 : 0.9);
  ctx.fillStyle = radial(ctx, cx, rim - ry * 0.45, Math.max(rx, ry) * 1.05,
    [[0, BUG.light], [0.4, BUG.base], [0.82, BUG.dark], [1, BUG.deep]], -0.42, -0.45);
  ctx.fill();
  // Kernschatten unten rechts
  ctx.fillStyle = 'rgba(100, 10, 20, 0.22)';
  ctx.beginPath(); ctx.ellipse(cx + rx * 0.35, rim - ry * 0.15, rx * 0.6, ry * 0.5, 0.3, 0, Math.PI * 2); ctx.fill();
  // Naht: Bogen vom Kopf zum Heck, teilt Panzer in obere (ferne) und untere (nahe) Hälfte
  ctx.strokeStyle = 'rgba(70, 6, 18, 0.65)'; ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(cx + rx * 0.78, rim - ry * 0.55);
  ctx.quadraticCurveTo(cx, rim - ry * 0.75, cx - rx * 0.96, rim - ry * 0.32);
  ctx.stroke();
  // Punkte
  ctx.fillStyle = BUG.spot;
  const sy = flat ? 0.45 : 1;
  for (const [fx, fy, s] of [[-0.1, 0.83, 0.85], [0.42, 0.72, 0.75], [-0.52, 0.3, 0.9], [0.12, 0.26, 0.9]]) {
    ellipse(ctx, cx + fx * rx, rim - fy * ry, s * (1 - 0.3 * Math.abs(fx)), s * sy * (1 - 0.3 * fy)); ctx.fill();
  }
  // Glanz oben links
  gloss(ctx, cx - rx * 0.5, rim - ry * 0.7, rx * 0.27, ry * 0.13, -0.6, 0.65);
  gloss(ctx, cx - rx * 0.72, rim - ry * 0.42, rx * 0.08, ry * 0.08, 0, 0.45);
}

// Kopf mit großem Auge und Fühlern; wag = Fühlerwippen
function bugHead(ctx, cx, cy, r, wag) {
  // Fühler
  ctx.strokeStyle = BUG.leg; ctx.lineWidth = 0.55;
  ctx.beginPath();
  ctx.moveTo(cx + 0.6, cy - r * 0.8); ctx.quadraticCurveTo(cx + 1.9, cy - r - 0.4, cx + 2.3 + wag, cy - r - 2.1);
  ctx.moveTo(cx - 0.8, cy - r * 0.85); ctx.quadraticCurveTo(cx - 1.1, cy - r - 0.9, cx - 0.4 - wag, cy - r - 2.4);
  ctx.stroke();
  ctx.fillStyle = BUG.leg;
  ellipse(ctx, cx + 2.3 + wag, cy - r - 2.1, 0.45, 0.45); ctx.fill();
  ellipse(ctx, cx - 0.4 - wag, cy - r - 2.4, 0.45, 0.45); ctx.fill();
  // Kopfkugel
  ctx.fillStyle = radial(ctx, cx, cy, r, [[0, '#6a6088'], [0.55, '#2a2436'], [1, '#120e1c']]);
  ellipse(ctx, cx, cy, r, r); ctx.fill();
  gloss(ctx, cx - r * 0.35, cy - r * 0.45, r * 0.3, r * 0.16, -0.5, 0.35);
  // großes Auge, blickt nach rechts
  eye(ctx, cx + r * 0.3, cy - r * 0.18, r * 0.5, r * 0.14, 0.02, 0.5);
}

function walker(g, phase) {
  const { ctx } = g;
  const bob = phase ? -0.4 : 0;   // leichtes Wippen beim Laufen
  const sw = phase ? -1 : 1;      // Beinschwung (Schere)
  groundShadow(ctx, 8, 15.3, 6.6, 1.1, 0.25);
  // Beine: hintere Reihe heller, vordere dunkler, gegenläufig
  [4.2, 7.2, 10.2].forEach((hx, i) => {
    const s = (i % 2 ? -sw : sw) * 0.85;
    leg(ctx, hx + 0.7, 12.4 + bob, -s, BUG.legFar, 1.05);
    leg(ctx, hx, 12.5 + bob, s, BUG.leg, 1.3);
  });
  const rim = 13.3 + bob;
  shell(ctx, 7.4, rim, 6.3, 6.7);
  // Halskragen (dunkel) zwischen Panzer und Kopf
  ctx.fillStyle = '#2e2238';
  ellipse(ctx, 12.4, rim - 2.3, 1.5, 2.7); ctx.fill();
  bugHead(ctx, 13.2, 11.1 + bob, 2.5, phase ? 0.5 : 0);
}

function walkerSquashed(g) {
  const { ctx } = g;
  groundShadow(ctx, 8, 15.4, 7.8, 1.0, 0.3);
  // abgespreizte Beine
  ctx.strokeStyle = BUG.leg; ctx.lineWidth = 1.1;
  for (const [x0, y0, x1, y1] of [[2.8, 14.4, 0.5, 15.3], [3.4, 14.9, 1.4, 15.9], [4.6, 15.1, 3.8, 15.9],
    [10.2, 15.1, 11.2, 15.9], [11.0, 14.9, 13.4, 15.9], [11.6, 14.4, 14.2, 15.2]]) {
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  shell(ctx, 7.3, 15.3, 7.0, 3.0, true);
  // platter Kopf, benommenes Auge, Fühler liegen flach
  ctx.strokeStyle = BUG.leg; ctx.lineWidth = 0.55;
  ctx.beginPath(); ctx.moveTo(14.4, 14.0); ctx.quadraticCurveTo(15.3, 13.2, 15.9, 13.6);
  ctx.moveTo(13.6, 13.6); ctx.quadraticCurveTo(14.2, 12.4, 15.0, 12.5); ctx.stroke();
  ctx.fillStyle = radial(ctx, 13.4, 14.6, 2.6, [[0, '#6a6088'], [0.55, '#2a2436'], [1, '#120e1c']]);
  ellipse(ctx, 13.4, 14.7, 2.6, 1.35); ctx.fill();
  eye(ctx, 14.0, 14.4, 0.95, 0.15, 0.1, 0.3);
}

// ======================= Hüpfender Pilz =======================
// Hitbox 12x14 unten (x 2–14, y 2–16). Violetter Kuppelhut mit gelben Punkten, cremefarbener Stiel mit
// grimmigem Gesicht, kleine dunkle Füße.
const CAP = { light: '#dcb0ff', base: '#b06ee8', dark: '#7a46b0', deep: '#4e2a7c', rim: '#653a9a' };
const STEM = { light: '#fff8e8', base: '#efe0bf', dark: '#c9ab80' };
const FOOT = { light: '#8a68a8', base: '#4a2d5c', dark: '#2e1c40' };
const INK = '#3a2446';

function foot(ctx, x, y, rx, ry) {
  ctx.fillStyle = radial(ctx, x, y, rx, [[0, FOOT.light], [0.5, FOOT.base], [1, FOOT.dark]], -0.3, -0.5);
  ellipse(ctx, x, y, rx, ry); ctx.fill();
}

// Stiel (abgerundet) mit Hutschatten oben
function stem(ctx, x, y, w, h, rim) {
  roundRect(ctx, x, y, w, h, Math.min(2.4, w / 2));
  ctx.fillStyle = linear(ctx, x, y, x + w, y + h, [[0, STEM.light], [0.55, STEM.base], [1, STEM.dark]]);
  ctx.fill();
  ctx.fillStyle = linear(ctx, 0, rim, 0, rim + 1.8, [[0, 'rgba(60, 30, 100, 0.45)'], [1, 'rgba(60, 30, 100, 0)']]);
  ctx.fillRect(x, rim, w, 1.8);
}

// Grimmiges Gesicht: Brauen auf Höhe y, darunter Augen und Schmollmund; s = Größe, look = Blickrichtung
function face(ctx, cx, y, s, look) {
  ctx.strokeStyle = INK; ctx.lineWidth = 0.9 * s;
  ctx.beginPath();
  ctx.moveTo(cx - 2.7 * s, y); ctx.lineTo(cx - 0.9 * s, y + 0.85 * s);
  ctx.moveTo(cx + 2.7 * s, y); ctx.lineTo(cx + 0.9 * s, y + 0.85 * s);
  ctx.stroke();
  eye(ctx, cx - 1.55 * s, y + 1.85 * s, 1.05 * s, look[0] * s, look[1] * s, 0.5);
  eye(ctx, cx + 1.55 * s, y + 1.85 * s, 1.05 * s, look[0] * s, look[1] * s, 0.5);
  // kleiner Schmollmund, leicht nach rechts (Blickrichtung)
  ctx.strokeStyle = INK; ctx.lineWidth = 0.7 * s;
  ctx.beginPath(); ctx.arc(cx + 0.15 * s, y + 4.5 * s, 0.95 * s, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
}

// Hut: Kuppel über Unterkante rim; Punkte als Bruchteile (fx: -1..1, fy: 0 Rand .. 1 Scheitel)
function cap(ctx, cx, rim, rx, ry, rimRy) {
  domePath(ctx, cx, rim, rx, ry, rimRy);
  ctx.fillStyle = radial(ctx, cx, rim - ry * 0.4, Math.max(rx, ry) * 1.1,
    [[0, CAP.light], [0.42, CAP.base], [0.85, CAP.dark], [1, CAP.deep]], -0.4, -0.45);
  ctx.fill();
  // Hutunterseite: dunkler Saum
  ctx.fillStyle = CAP.rim;
  ctx.beginPath(); ctx.ellipse(cx, rim, rx, rimRy, 0, 0, Math.PI); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath(); ctx.ellipse(cx, rim - 0.1, rx * 0.98, rimRy * 0.5, 0, 0, Math.PI); ctx.closePath(); ctx.fill();
  // gelbe Punkte, zum Rand hin perspektivisch gestaucht
  const k = rx / 7;
  for (const [fx, fy, s] of [[-0.58, 0.34, 1.25], [0.18, 0.84, 1.0], [0.7, 0.3, 0.95], [-0.08, 0.12, 0.65], [0.46, 0.08, 0.6]]) {
    const x = cx + fx * rx, y = rim - fy * ry;
    const sx = s * k * (1 - 0.45 * Math.abs(fx)), sy = s * k * (0.55 + 0.45 * fy) * (ry / 6.4);
    ctx.fillStyle = radial(ctx, x, y, Math.max(sx, sy), [[0, '#fff0a0'], [0.5, '#ffe066'], [1, '#e0a81a']], -0.3, -0.3);
    ellipse(ctx, x, y, sx, sy); ctx.fill();
  }
  gloss(ctx, cx - rx * 0.42, rim - ry * 0.74, rx * 0.3, ry * 0.14, -0.55, 0.6);
}

function hopper(g, p) {
  const { ctx } = g;
  groundShadow(ctx, 8, 15.4, p.shadow, 1.0, 0.25);
  for (const [fx, fy, rx, ry] of p.feet) foot(ctx, fx, fy, rx, ry);
  stem(ctx, p.stem[0], p.stem[1], p.stem[2], p.stem[3], p.rim + p.rimRy * 0.6);
  face(ctx, 8, p.face, p.faceScale, p.look);
  cap(ctx, 8, p.rim, p.capRx, p.capRy, p.rimRy);
}

const HOPPER_POSES = {
  idle: { rim: 8.4, capRx: 7.0, capRy: 6.2, rimRy: 1.1, stem: [4.6, 7.5, 6.8, 7.3], face: 10.0, faceScale: 1, look: [0.3, 0.1],
    feet: [[5.3, 15.2, 2.0, 1.1], [10.7, 15.2, 2.0, 1.1]], shadow: 5.5 },
  // geduckt: Hut breit und flach, Stiel kurz, Füße gespreizt
  squat: { rim: 10.0, capRx: 7.9, capRy: 4.8, rimRy: 1.0, stem: [4.6, 9.4, 6.8, 5.4], face: 11.0, faceScale: 0.85, look: [0.3, -0.2],
    feet: [[3.8, 15.2, 2.1, 1.1], [12.2, 15.2, 2.1, 1.1]], shadow: 7.0 },
  // Sprung: Hut schmal und hoch, Stiel gestreckt, Füße angezogen
  jump: { rim: 7.0, capRx: 6.0, capRy: 6.4, rimRy: 1.0, stem: [5.0, 6.2, 6.0, 8.0], face: 8.4, faceScale: 1, look: [0.25, -0.3],
    feet: [[6.3, 14.7, 1.7, 1.1], [9.7, 14.7, 1.7, 1.1]], shadow: 4.0 },
};

function hopperSquashed(g) {
  const { ctx } = g;
  groundShadow(ctx, 8, 15.5, 8.2, 0.9, 0.3);
  foot(ctx, 2.0, 15.2, 2.0, 0.9);
  foot(ctx, 14.0, 15.2, 2.0, 0.9);
  // zerquetschter Stiel als Band, Augen schauen benommen hervor
  roundRect(ctx, 3.6, 13.4, 8.8, 2.6, 1.2);
  ctx.fillStyle = linear(ctx, 3.6, 13.4, 12.4, 16, [[0, STEM.light], [0.6, STEM.base], [1, STEM.dark]]);
  ctx.fill();
  eye(ctx, 6.2, 15.3, 0.65, 0, 0.1, 0.35);
  eye(ctx, 9.8, 15.3, 0.65, 0, 0.1, 0.35);
  // platter Hut
  cap(ctx, 8, 13.9, 7.8, 3.4, 0.7);
}

export const SHEETS = [
  {
    key: 'walker', frameWidth: 16, frameHeight: 16,
    draw: { walk0: (g) => walker(g, 0), walk1: (g) => walker(g, 1), squashed: walkerSquashed },
  },
  {
    key: 'hopper', frameWidth: 16, frameHeight: 16,
    draw: {
      idle: (g) => hopper(g, HOPPER_POSES.idle),
      squat: (g) => hopper(g, HOPPER_POSES.squat),
      jump: (g) => hopper(g, HOPPER_POSES.jump),
      squashed: hopperSquashed,
    },
  },
];
