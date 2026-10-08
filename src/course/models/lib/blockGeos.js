// Geteilte Geometrien und Materialien der 1-m-Blöcke (Einzelmodelle in kinds/blocks.js und der
// Instanz-Helfer in lib/instanced.js). Würfel 1 × 1 × 1 m, Ursprung = Mitte der Unterseite (y 0..1).
// detail: 'high' (Einzelmodell) | 'low' (Instanzen: weniger Dreiecke, ohne Nieten oben).

import { THREE, Build, cached, roundedBox, SIDE, col, mix, sparkShape, canvasTexture, std, vcol } from './kit.js';

export const BLOCK = {
  gold: 0xffbf1f, goldTop: 0xffd64a, goldEdge: 0xe08a12, sym: 0xfffbe8, symShadow: 0xb8601a, rivetGold: 0xfff0b0,
  used: 0xb07838, usedTop: 0xc48a48, usedEdge: 0x7a4a22, rivetUsed: 0x6a3a1a, plate: 0x9a6430,
};

/** Färbt einen Würfel: Grundfarbe, Oberseite heller, runde Kanten dunkler. */
const cubeShade = (base, top, edge) => ({ v: (x, y, z, nx, ny, nz) => {
  const flatness = Math.max(Math.abs(nx), Math.abs(ny), Math.abs(nz));
  const c = ny > 0.9 ? col(top) : col(base);
  return mix(c, edge, (1 - flatness) * 2.2);
} });

/** Nieten an den vier Ecken einer Würfelseite (Achse ax, Vorzeichen sg). */
function rivets(b, ax, sg, color, r, seg) {
  for (const u of [-1, 1]) for (const v of [-1, 1]) {
    const p = [0, 0.5, 0];
    p[ax] = sg * 0.5;
    const others = [0, 1, 2].filter((k) => k !== ax);
    p[others[0]] += u * 0.37; p[others[1]] += v * 0.37;
    b.sphere(r, color, { p }, seg, Math.max(4, seg - 2));
  }
}

/** Seitenflächen (±X, ±Z) als [Achse, Vorzeichen, Drehung um Y für eine Fläche, die nach +Z zeigt]. */
const SIDES = [[0, 1, Math.PI / 2], [0, -1, -Math.PI / 2], [2, 1, 0], [2, -1, Math.PI]];

/** Fragezeichen-Ersatz: goldener Block mit weißem Funkel-Stempel auf vier Seiten und Nieten. */
export function questionGeo(detail = 'high', withSymbol = true) {
  return cached(`block:q:${detail}:${withSymbol}`, () => {
    const hi = detail === 'high';
    const b = new Build();
    b.add(roundedBox(1, 1, 1, 0.09, SIDE.ALL, 0, hi ? 2 : 1), cubeShade(BLOCK.gold, BLOCK.goldTop, BLOCK.goldEdge), { p: [0, 0.5, 0] });
    for (const [ax, sg, ry] of SIDES) {
      if (hi) rivets(b, ax, sg, BLOCK.rivetGold, 0.045, 8);
      if (withSymbol) {
        const off = [0, 0.5, 0]; off[ax] = sg * 0.5;
        b.extrude(sparkShape(0.34, 0.2), 0.03, BLOCK.symShadow, { p: off, r: [0, ry, 0] }, 0, hi ? 5 : 2);
        const off2 = [0, 0.52, 0]; off2[ax] = sg * 0.53;
        b.extrude(sparkShape(0.28, 0.2), 0.03, BLOCK.sym, { p: off2, r: [0, ry, 0] }, hi ? 0.012 : 0, hi ? 6 : 2, 1);
      }
    }
    if (hi) rivets(b, 1, 1, BLOCK.rivetGold, 0.045, 8);
    return b.geometry();
  });
}

/** Benutzter Block: bronzebraun mit eingelassener Platte und dunklen Nieten. */
export function usedGeo(detail = 'high') {
  return cached(`block:used:${detail}`, () => {
    const hi = detail === 'high';
    const b = new Build();
    b.add(roundedBox(1, 1, 1, 0.09, SIDE.ALL, 0, hi ? 2 : 1), cubeShade(BLOCK.used, BLOCK.usedTop, BLOCK.usedEdge), { p: [0, 0.5, 0] });
    for (const [ax, sg] of SIDES) {
      if (hi) rivets(b, ax, sg, BLOCK.rivetUsed, 0.045, 8);
      const p = [0, 0.5, 0]; p[ax] = sg * 0.495;
      const s = [0.62, 0.62, 0.62]; s[ax] = 0.03;
      b.box(...s, BLOCK.plate, { p }, hi ? 0.012 : 0, 1);
    }
    if (hi) rivets(b, 1, 1, BLOCK.rivetUsed, 0.045, 8);
    return b.geometry();
  });
}

// ------------------------------------------------------------------ Ziegel (Textur)
function brickTexture() {
  return canvasTexture('cm:brick', 128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#f0d0a0'; ctx.fillRect(0, 0, w, h); // Mörtel
    const rows = 4, rh = h / rows, gap = 5;
    for (let r = 0; r < rows; r++) {
      const off = r % 2 ? w / 4 : 0;
      for (let i = -1; i < 3; i++) {
        const x = off + i * (w / 2) + gap / 2, y = r * rh + gap / 2, bw = w / 2 - gap, bh = rh - gap;
        const g = ctx.createLinearGradient(0, y, 0, y + bh);
        g.addColorStop(0, '#f08a4a'); g.addColorStop(0.18, '#d8662c'); g.addColorStop(0.85, '#c4561f'); g.addColorStop(1, '#94401a');
        ctx.fillStyle = g;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, bw, bh, 4); else ctx.rect(x, y, bw, bh);
        ctx.fill();
      }
    }
  });
}
/** Würfel-Projektion der UVs (je Ecke nach der stärksten Normalenachse), Maßstab 1 m = 1 Kachel. */
export function boxUV(g, scale = 1) {
  const P = g.attributes.position, N = g.attributes.normal;
  const uv = new Float32Array(P.count * 2);
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    const ax = Math.abs(N.getX(i)), ay = Math.abs(N.getY(i)), az = Math.abs(N.getZ(i));
    let u, v;
    if (ax >= ay && ax >= az) { u = z * Math.sign(N.getX(i)); v = y; }
    else if (ay >= az) { u = x; v = z; }
    else { u = -x * Math.sign(N.getZ(i)); v = y; }
    uv[i * 2] = u * scale + 0.5; uv[i * 2 + 1] = v * scale + 0.5;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
export function brickGeo(detail = 'high') {
  return cached(`block:brick:${detail}`, () => {
    const g = roundedBox(1, 1, 1, 0.07, SIDE.ALL, 0, detail === 'high' ? 2 : 1);
    boxUV(g);
    g.translate(0, 0.5, 0);
    return g;
  });
}
export const brickMat = () => std('brick', { map: brickTexture(), roughness: 0.75 });
/** Ziegel-Bruchstück (Viertel-Würfel mit Textur), Mitte im Ursprung. */
export function brickChunkGeo() {
  return cached('block:brickChunk', () => {
    const g = roundedBox(0.42, 0.42, 0.42, 0.06, SIDE.ALL, 0, 1);
    boxUV(g, 1);
    return g;
  });
}
export const blockMat = () => vcol(0.35, {}, 'block');
