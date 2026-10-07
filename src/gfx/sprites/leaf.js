// Blätterschirm (22x12 Weltpixel) als Vektorgrafik – Referenz für den 3D-World-Look:
// weiche Verläufe, Glanzpunkt oben links, Schatten unten rechts, keine harten Pixelkanten.
// g = { ctx, w, h, S, colors }; gezeichnet wird in Weltkoordinaten (Kontext ist vorskaliert).

function leaf(g, tilt) {
  const { ctx, w, h } = g;
  const cx = w / 2 + tilt, top = 0.8, bottom = 8.5;
  // Schatten unter dem Blatt
  ctx.fillStyle = 'rgba(60, 20, 10, 0.25)';
  ctx.beginPath(); ctx.ellipse(cx + 0.6, bottom - 0.2, 9.5, 1.6, 0, 0, Math.PI * 2); ctx.fill();
  // Blattkörper: Halbkreis-Kuppel mit gezacktem Rand
  const grad = ctx.createRadialGradient(cx - 4, top + 2.5, 1, cx, bottom - 3, 11);
  grad.addColorStop(0, '#ffb257');
  grad.addColorStop(0.55, '#ff7a2d');
  grad.addColorStop(1, '#c43f1b');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(cx - 10.5, bottom);
  ctx.quadraticCurveTo(cx - 10, top + 1.5, cx - 4, top + 0.5);
  ctx.quadraticCurveTo(cx, top - 0.6, cx + 4, top + 0.5);
  ctx.quadraticCurveTo(cx + 10, top + 1.5, cx + 10.5, bottom);
  // Zacken am unteren Rand
  for (let i = 0; i < 6; i++) {
    const x0 = cx + 10.5 - i * 3.5, x1 = x0 - 3.5;
    ctx.quadraticCurveTo((x0 + x1) / 2, bottom - 1.6, x1, bottom);
  }
  ctx.closePath();
  ctx.fill();
  // Blattadern
  ctx.strokeStyle = 'rgba(120, 40, 10, 0.55)';
  ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(cx, bottom - 0.5); ctx.lineTo(cx, top + 1.2); ctx.stroke();
  for (const [dy, len] of [[2.5, 5], [4.5, 7], [6.5, 8]]) {
    ctx.beginPath(); ctx.moveTo(cx, bottom - dy); ctx.lineTo(cx - len, bottom - dy + 1.5);
    ctx.moveTo(cx, bottom - dy); ctx.lineTo(cx + len, bottom - dy + 1.5); ctx.stroke();
  }
  // Glanz oben links
  ctx.fillStyle = 'rgba(255, 245, 220, 0.55)';
  ctx.beginPath(); ctx.ellipse(cx - 5, top + 2.6, 3.2, 1.3, -0.5, 0, Math.PI * 2); ctx.fill();
  // Stiel
  ctx.strokeStyle = '#6d8a2b';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(w / 2, bottom - 0.5); ctx.lineTo(w / 2, h - 0.5); ctx.stroke();
}

export const SHEETS = [
  {
    key: 'leaf', frameWidth: 22, frameHeight: 12,
    draw: {
      leaf0: (g) => leaf(g, 0),
      leaf1: (g) => leaf(g, 0.8),
    },
  },
];
