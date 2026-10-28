// Hilfen für die Welt-6-Level 6-5 „Pustewind am Eisgipfel“, 6-6 „Kanonenturm im Wolkenwerk“ und 6-Haus „Haus Volltreffer“
// (kein Level: exportiert kein LEVEL, die Level-Registry überspringt dieses Modul). Gemeinsame Dateien werden nicht
// verändert; alles Level-Lokale hängt sich über die offiziellen Level-Haken `LEVEL.build`/`LEVEL.setup`
// (Präzisierung „Level-Haken“, „Leistung und Level-Haken 2“) sowie `level.onStep` / `view.onFrame` an.
//
//   1) Grundlagen        Geometrie-Kleinteile (aus den Welt-4-Hilfen), Leinwand-Texturen, Instanz-Streuungen
//   2) Prüfungs-Haus     kraftfeld (nur Bälle kommen hindurch), tapete (eigene Tapeten je Raum), ballKorb, baellebad,
//                        maeusehaus (Mauseloch mit Glas darüber), theater (Vorhänge, Bühne, Scheinwerfer),
//                        sprungturm (Turm mit Fangwand), gehege (Zaun, Heu), schiessbude (Theke, Markise, Preise),
//                        sternFolgt (Stern reitet auf einer Plattform), sternVersteckt (Raum-Stern erst nach Auslöser)
//
// Alles, was hier gezeichnet wird, ist entweder statisch verschmolzen (bakeParts → Abschnitts-Meshes) oder ein
// einzelnes Objekt mit eigenem Haken (Kraftfeld-Flimmern, Bällebad als Instanzen) – je Raum wenige Zeichenaufrufe.

import * as THREE from 'three';
import { lin, hex, mixc, smooth, colorize, merge, addObject, Rnd } from '../../blocks/kit.js';
import { visDt, giveStar } from '../../entities/gimmick.js';
import { hasModel, getModel } from '../../models/index.js';
import {
  isl, line, ring, blk, cyl, sph, cone, quadG, bakeParts, glowPoints, canvasTex, hausRaum, hausFertig, raumHaken, wimpel,
  levelSetup, cullStatic, farHide, heroShadowDiet, teileInstanzen,
} from '../w4/_helpers_d.js';

export {
  isl, line, ring, blk, cyl, sph, cone, quadG, bakeParts, glowPoints, canvasTex, hausRaum, hausFertig, raumHaken, wimpel,
  levelSetup, cullStatic, farHide, heroShadowDiet, teileInstanzen,
};

const TAU = Math.PI * 2;
const L = (c) => lin(hex(c));

/**
 * Rampen für den Kamerastrahl durchlässig machen: CollisionWorld.raycast prüft Rampen als ganzen Quader, die Kamera
 * rückte an Hängen bis auf 3 m heran (Blick über die Schräge). Setzt nur die Flagge camIgnore der Rampen dieses Levels.
 */
export function rampenKameraFrei(level) {
  let n = 0;
  level.world.forEach((s) => { if (s.type === 'ramp' && !s.camIgnore) { s.camIgnore = true; n++; } });
  return n;
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export { TAU, clamp };

// ====================================================================== 1) Grundlagen

/** Rechteckige Fläche mit UV (für Leinwand-Texturen): Mitte unten (x, y, z), Breite w, Höhe h, Blick face. */
function uvQuad(acc, x, y, z, w, h, face, u = [0, 0, 1, 1]) {
  let c;
  if (face === '+z') c = [[x - w / 2, y, z], [x + w / 2, y, z], [x + w / 2, y + h, z], [x - w / 2, y + h, z]];
  else if (face === '-z') c = [[x + w / 2, y, z], [x - w / 2, y, z], [x - w / 2, y + h, z], [x + w / 2, y + h, z]];
  else if (face === '+x') c = [[x, y, z + w / 2], [x, y, z - w / 2], [x, y + h, z - w / 2], [x, y + h, z + w / 2]];
  else c = [[x, y, z - w / 2], [x, y, z + w / 2], [x, y + h, z + w / 2], [x, y + h, z - w / 2]];
  const uv = [[u[0], u[1]], [u[2], u[1]], [u[2], u[3]], [u[0], u[3]]];
  for (const k of [0, 1, 2, 0, 2, 3]) { acc.pos.push(...c[k]); acc.uv.push(...uv[k]); }
}

function texMesh(level, acc, tex, o = {}) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(acc.pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(acc.uv, 2));
  g.computeVertexNormals();
  const mat = o.basic
    ? new THREE.MeshBasicMaterial({ map: tex, transparent: !!o.transparent, opacity: o.opacity ?? 1, depthWrite: !o.transparent, side: o.side ?? THREE.FrontSide })
    : new THREE.MeshStandardMaterial({ map: tex, roughness: o.roughness ?? 0.85, transparent: !!o.transparent, opacity: o.opacity ?? 1, side: o.side ?? THREE.FrontSide });
  const m = new THREE.Mesh(g, mat);
  m.receiveShadow = !o.basic;
  m.name = o.name ?? 'leinwand';
  addObject(level, m, o.update);
  return m;
}

/** Viele gleiche Kugeln (eine InstancedMesh mit Farben je Exemplar, ohne Schatten). list [[x, y, z, r, color], …]. */
export function kugelStreu(level, list, o = {}) {
  if (!level.view || !list.length) return null;
  const g = new THREE.IcosahedronGeometry(1, o.detail ?? 1);
  const m = new THREE.MeshStandardMaterial({ roughness: o.rough ?? 0.35, metalness: 0.0 });
  const im = new THREE.InstancedMesh(g, m, list.length);
  const M = new THREE.Matrix4(), C = new THREE.Color();
  list.forEach(([x, y, z, r, c], i) => { M.makeScale(r, r, r).setPosition(x, y, z); im.setMatrixAt(i, M); im.setColorAt(i, C.setHex(c)); });
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.castShadow = false; im.receiveShadow = true;
  im.name = o.name ?? 'kugeln';
  im.computeBoundingSphere();
  addObject(level, im);
  return im;
}

// ====================================================================== 2) Prüfungs-Haus

/**
 * Kraftfeld (Prüfungs-Haus 6-Haus): flimmernde, durchscheinende Wand – Figuren und Gegner prallen ab, Wurfbälle fliegen
 * hindurch (Kollision mit solid + trigger: der Wurfball überspringt Auslöser-Formen, alle anderen stoßen sich daran).
 * o = { x0, x1, z, y0, y1, color, label: 'NUR BÄLLE!' } – Ebene quer zur Laufrichtung (Blick +Z); oder axis 'x':
 * { z0, z1, x, … } (Ebene längs). Kamera geht hindurch (camIgnore), kein Wandsprung (noWallSlide).
 */
export function kraftfeld(level, o) {
  const alongX = o.axis !== 'x';
  const a0 = alongX ? o.x0 : o.z0, a1 = alongX ? o.x1 : o.z1, c = alongX ? o.z : o.x;
  const y0 = o.y0, y1 = o.y1;
  const t = 0.12;
  level.world.add({
    type: 'box', min: alongX ? [a0, y0 - 1, c - t] : [c - t, y0 - 1, a0], max: alongX ? [a1, y1 + 6, c + t] : [c + t, y1 + 6, a1],
    solid: true, trigger: true, camIgnore: true, noWallSlide: true, tag: 'kraftfeld',
  });
  if (!level.view) return null;
  const col = o.color ?? '#7fe8ff';
  // Rahmen: Pfosten an den Enden, Leiste oben und unten (statisch)
  const parts = [];
  const frame = o.frame ?? 0x5a6aa8, glow = o.glowColor ?? 0x9af4ff;
  for (const a of [a0, a1]) {
    parts.push(alongX ? blk(0.36, y1 - y0 + 0.3, 0.36, a, y0 - 0.15, c, frame, { top: glow }) : blk(0.36, y1 - y0 + 0.3, 0.36, c, y0 - 0.15, a, frame, { top: glow }));
  }
  parts.push(alongX ? blk(a1 - a0, 0.18, 0.3, (a0 + a1) / 2, y0 - 0.02, c, frame) : blk(0.3, 0.18, a1 - a0, c, y0 - 0.02, (a0 + a1) / 2, frame));
  bakeParts(level, parts, { castShadow: false });
  // Feld: Waben, Ballsymbole, sanfter Verlauf – läuft langsam aufwärts
  const tex = canvasTex(128, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(160,240,255,0.55)'); gr.addColorStop(0.5, 'rgba(200,170,255,0.35)'); gr.addColorStop(1, 'rgba(160,240,255,0.55)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2;
    const R = 16;
    for (let j = -1; j < 6; j++) for (let i = -1; i < 6; i++) {
      const cx = i * R * 1.73 + (j % 2 ? R * 0.866 : 0), cy = j * R * 1.5;
      g.beginPath();
      for (let k = 0; k < 6; k++) { const an = (k / 6) * TAU + Math.PI / 6; g.lineTo(cx + Math.cos(an) * R, cy + Math.sin(an) * R); }
      g.closePath(); g.stroke();
    }
    // kleine Bälle (weiß mit orangem Nahtband)
    for (const [bx, by] of [[30, 34], [94, 98]]) {
      g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(bx, by, 9, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,140,40,0.95)'; g.lineWidth = 2; g.beginPath(); g.arc(bx - 9, by, 7, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(bx + 9, by, 7, Math.PI - 0.9, Math.PI + 0.9); g.stroke();
    }
  }, { repeat: true });
  const acc = { pos: [], uv: [] };
  const W = a1 - a0, H = y1 - y0;
  if (alongX) uvQuad(acc, (a0 + a1) / 2, y0 + 0.16, c, W - 0.3, H - 0.16, '+z', [0, 0, W / 2.2, H / 2.2]);
  else uvQuad(acc, c, y0 + 0.16, (a0 + a1) / 2, W - 0.3, H - 0.16, o.face ?? '+x', [0, 0, W / 2.2, H / 2.2]);
  let tt = 0;
  const hv = {};
  const m = texMesh(level, acc, tex, { basic: true, transparent: true, opacity: 0.62, side: THREE.DoubleSide, name: 'kraftfeld', update: (dt) => {
    tt += visDt(level, hv, dt);
    if (tex) tex.offset.y = (tt * 0.12) % 1;
    m.material.opacity = 0.5 + 0.12 * Math.sin(tt * 3.1);
  } });
  m.renderOrder = 3;
  m.material.color = new THREE.Color(col);
  // Schild oben: „NUR BÄLLE!“
  if (o.label !== false) {
    const sTex = canvasTex(256, 64, (g, w, h) => {
      g.fillStyle = '#2a2f6a'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffd23d'; g.fillRect(4, 4, w - 8, h - 8);
      g.fillStyle = '#2a2f6a'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(o.label ?? 'NUR BÄLLE!', w / 2 + 16, h / 2 + 2);
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(26, h / 2, 15, 0, TAU); g.fill();
      g.strokeStyle = '#ff8a2a'; g.lineWidth = 3; g.beginPath(); g.arc(14, h / 2, 12, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(38, h / 2, 12, Math.PI - 0.9, Math.PI + 0.9); g.stroke();
    });
    const sa = { pos: [], uv: [] };
    const sw = Math.min(3.2, W * 0.5), sy = Math.min(y1 - 0.9, y0 + (o.labelY ?? 2.6));
    if (alongX) { uvQuad(sa, o.labelX ?? (a0 + a1) / 2, sy, c + 0.16, sw, sw / 4, '+z'); }
    else uvQuad(sa, c + 0.16, sy, o.labelX ?? (a0 + a1) / 2, sw, sw / 4, '+x');
    texMesh(level, sa, sTex, { name: 'kraftfeld:schild', roughness: 0.6 });
  }
  return m;
}

// ---------------------------------------------------------------------- Tapeten

const TAPETE = {
  kugeln(g, S) {      // Kullerbahn: zartblau mit bunten Bällen und Punkten
    g.fillStyle = '#d6ecff'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#c4e0fa'; for (let i = 0; i < 4; i++) g.fillRect(0, i * 32 + 14, S, 4);
    const cols = ['#ff6a6a', '#ffd23d', '#5ac85a', '#a86aff'];
    [[22, 24, 12], [86, 58, 10], [52, 100, 13], [112, 112, 8]].forEach(([x, y, r], i) => {
      g.fillStyle = cols[i]; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.35, r * 0.3, 0, TAU); g.fill();
    });
  },
  theater(g, S) {     // Bühne frei: dunkelrot, goldene Masken-Rauten
    g.fillStyle = '#7a1428'; g.fillRect(0, 0, S, S);
    g.strokeStyle = '#c89a3a'; g.lineWidth = 2;
    for (let i = -1; i < 3; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64 + 128, S); g.stroke(); g.beginPath(); g.moveTo(i * 64 + 128, 0); g.lineTo(i * 64, S); g.stroke(); }
    g.fillStyle = '#ffd86a';
    for (const [x, y] of [[64, 32], [0, 96], [128, 96]]) { g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill(); g.fillStyle = '#7a1428'; g.beginPath(); g.arc(x - 2.5, y - 1, 1.6, 0, TAU); g.arc(x + 2.5, y - 1, 1.6, 0, TAU); g.fill(); g.fillStyle = '#ffd86a'; }
  },
  sterne(g, S) {      // Sprungfeld: Nachtblau mit gelben Sternen und Raketenstreifen
    g.fillStyle = '#28307a'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#323c94'; g.fillRect(0, 60, S, 8);
    const star = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU - Math.PI / 2, rr = k % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); };
    star(24, 26, 11, '#ffd23d'); star(92, 40, 7, '#ffffff'); star(60, 98, 12, '#ffd23d'); star(112, 104, 6, '#9ad8ff'); star(18, 92, 5, '#ffffff');
  },
  zoo(g, S) {         // Gehege: hellgrün mit Blättern und Pilz-Tapsen
    g.fillStyle = '#c8ecb0'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#9ad87a';
    for (const [x, y, a] of [[24, 30, 0.5], [90, 20, -0.4], [60, 76, 0.2], [112, 96, 0.8], [20, 108, -0.6]]) { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.ellipse(0, 0, 14, 6, 0, 0, TAU); g.fill(); g.restore(); }
    g.fillStyle = '#8a5a3a';
    for (const [x, y] of [[48, 40], [56, 46], [100, 64], [108, 70]]) { g.beginPath(); g.arc(x, y, 3.5, 0, TAU); g.fill(); }
  },
  kirmes(g, S) {      // Schießbude: rot-weiße Streifen mit kleinen Glühbirnen
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#e8323a'; g.fillRect(i * 16, 0, 16, S); }
    g.fillStyle = '#ffe680';
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(i * 32 + 8, j * 32 + 16, 3, 0, TAU); g.fill(); }
  },
};

/**
 * Eigene Tapete (Leinwand) über der Täfelung an beiden Seitenwänden und hinten – wie in hausRaum, aber mit den Mustern
 * dieses Hauses. r = { id, z0, len, w: 14, h, y: 1 }, style ∈ TAPETE.
 */
export function tapete(level, r, style) {
  if (!level.view || !TAPETE[style] || typeof document === 'undefined') return;
  const W = r.w ?? 14, H = r.h ?? 5, y = r.y ?? 1, x0 = -W / 2, x1 = W / 2, zEnd = r.z0 - r.len;
  const zMid = (r.z0 + 1 + zEnd) / 2, zLen = r.len + 1;
  const tex = canvasTex(128, 128, TAPETE[style], { repeat: true });
  const acc = { pos: [], uv: [] };
  const hh = H - 1.08 - 0.14;
  uvQuad(acc, 0, y + 1.08, zEnd + 0.012, W, hh, '+z', [0, 0, W / 2, hh / 2]);
  uvQuad(acc, x0 + 0.012, y + 1.08, zMid, zLen, hh, '+x', [0, 0, zLen / 2, hh / 2]);
  uvQuad(acc, x1 - 0.012, y + 1.08, zMid, zLen, hh, '-x', [0, 0, zLen / 2, hh / 2]);
  texMesh(level, acc, tex, { name: `tapete:${r.id}`, roughness: 0.9 });
}

// ---------------------------------------------------------------------- Kleinteile

/** Weidenkorb mit Bällen (Kulisse; die Wurfbälle selbst sind Entitäten). */
export function ballKorbParts(x, y, z, o = {}) {
  const r = o.r ?? 0.55, h = o.h ?? 0.45;
  const p = [];
  const g = new THREE.CylinderGeometry(r, r * 0.82, h, 16, 3, true).toNonIndexed();
  const a = L(0xc8904a), b = L(0x9a6a32);
  colorize(g, (q, n, out) => { const k = (Math.floor((Math.atan2(q.z, q.x) / TAU) * 16 + 16) + Math.floor((q.y + h / 2) / (h / 3))) % 2; mixc(a, b, k, out); });
  g.translate(x, y + h / 2, z);
  p.push(g);
  p.push(cyl(r * 0.8, r * 0.8, 0.04, x, y + 0.02, z, 0x7a5228, 14));
  p.push(cyl(r + 0.05, r + 0.05, 0.07, x, y + h - 0.03, z, 0xa8743a, 16, { open: false }));
  for (const [dx, dz, c] of o.balls ?? []) p.push(sph(0.21, x + dx, y + h - 0.08, z + dz, c ?? 0xfff6ea, { ws: 10, hs: 7 }));
  return p;
}

/** Bällebad: bunte Kugeln (Instanzen) in einem Becken x0..x1, z0..z1, Oberfläche y (lockere Schicht). */
export function baellebad(level, x0, x1, z0, z1, y, o = {}) {
  const rnd = new Rnd(o.seed ?? 7);
  const cols = o.colors ?? [0xff5a6a, 0xffd23d, 0x4ab8ff, 0x5ad86a, 0xb87aff, 0xff9a3a];
  const list = [];
  const n = o.n ?? Math.round(Math.abs((x1 - x0) * (z1 - z0)) * 2.4);
  for (let i = 0; i < n; i++) {
    const r = rnd.real(0.17, 0.23);
    list.push([rnd.real(Math.min(x0, x1) + r, Math.max(x0, x1) - r), y - rnd.real(0, 0.45) + r * 0.2, rnd.real(Math.min(z0, z1) + r, Math.max(z0, z1) - r), r, cols[Math.floor(rnd.frac() * cols.length)]]);
  }
  return kugelStreu(level, list, { name: 'baellebad', detail: 1 });
}

/**
 * Mäusehaus mit Mauseloch (6-Haus Raum 1): Fassade quer durch den Raum (Ebene z, von yBot bis yTop), Loch hx0..hx1
 * × hy0..hy1 (nur der Ball passt hindurch), darüber Glas bis yGlass (fest für alles). Innen eine schmale Stube (Breite
 * inner) bis zur Rückwand zBack; links/rechts davon massives Mauerwerk bis yTop. Nur Kollision + verschmolzene Optik;
 * das Glas ist ein eigenes, durchscheinendes Mesh.
 */
export function maeusehaus(level, o) {
  const { z, zBack, yBot, yTop, yGlass, hx0, hx1, hy0, hy1 } = o;
  const W = o.w ?? 14, x0 = -W / 2, x1 = W / 2, inner = o.inner ?? 1.2;
  const add = (min, max, tag = 'maeusehaus') => level.world.add({ type: 'box', min, max, camIgnore: true, tag });
  const T = 0.5;
  // Fassade: links/rechts des Lochs, über dem Loch, unter dem Loch
  add([x0, yBot, z - T], [hx0, yTop, z]);
  add([hx1, yBot, z - T], [x1, yTop, z]);
  add([hx0, hy1, z - T], [hx1, yTop, z]);
  if (hy0 > yBot + 0.01) add([hx0, yBot, z - T], [hx1, hy0, z]);
  // Mauerwerk neben der Stube (bis zur Rückwand)
  add([x0, yBot, zBack], [-inner, yTop, z - T]);
  add([inner, yBot, zBack], [x1, yTop, z - T]);
  // Glas über der Fassade (bis zur Decke)
  level.world.add({ type: 'box', min: [x0, yTop, z - 0.25], max: [x1, yGlass + 6, z], camIgnore: true, noWallSlide: true, tag: 'glas' });
  if (!level.view) return;
  const P = [];
  const cream = 0xf6e6c8, creamD = 0xe0c89a, brick = 0xd8784a, roof = 0xe8483a;
  // Fassade (Putz) mit Fachwerk-Balken und Dachkante
  P.push(blk(hx0 - x0, yTop - yBot, T, (x0 + hx0) / 2, yBot, z - T / 2, cream, { top: creamD }));
  P.push(blk(x1 - hx1, yTop - yBot, T, (hx1 + x1) / 2, yBot, z - T / 2, cream, { top: creamD }));
  P.push(blk(hx1 - hx0, yTop - hy1, T, (hx0 + hx1) / 2, hy1, z - T / 2, cream, { top: creamD }));
  if (hy0 > yBot + 0.01) P.push(blk(hx1 - hx0, hy0 - yBot, T, (hx0 + hx1) / 2, yBot, z - T / 2, creamD));
  for (const bx of [-5.6, -3.2, 3.2, 5.6]) P.push(blk(0.22, yTop - yBot - 0.2, 0.08, bx, yBot + 0.1, z + 0.04, 0x8a5a2e));
  P.push(blk(W, 0.22, 0.1, 0, yTop - 0.3, z + 0.05, 0x8a5a2e));
  P.push(blk(W + 0.2, 0.3, T + 0.5, 0, yTop, z - T / 2, roof, { top: 0xff6a5a }));
  // Mauseloch-Bogen (Holzrahmen) und Fußmatte
  const hw = hx1 - hx0, hc = (hx0 + hx1) / 2;
  P.push(blk(0.16, hy1 - hy0 + 0.1, 0.12, hx0 - 0.08, hy0, z + 0.06, 0x6a3a1e), blk(0.16, hy1 - hy0 + 0.1, 0.12, hx1 + 0.08, hy0, z + 0.06, 0x6a3a1e));
  P.push(blk(hw + 0.32, 0.14, 0.12, hc, hy1, z + 0.06, 0x6a3a1e));
  // runde Fenster mit Mäusegesichtern (Kreisscheiben)
  for (const [wx, wy] of [[-4.4, yTop - 1.3], [4.4, yTop - 1.3]]) {
    const ring = new THREE.TorusGeometry(0.42, 0.07, 6, 18).toNonIndexed(); colorize(ring, (q, n, out) => { const c = L(0x6a3a1e); out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; });
    ring.translate(wx, wy, z + 0.06); P.push(ring);
    const pane = new THREE.CircleGeometry(0.4, 18).toNonIndexed(); colorize(pane, (q, n, out) => { const c = L(0x3a4a7a); out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; });
    pane.translate(wx, wy, z + 0.03); P.push(pane);
    // Maus lugt heraus: Kopf, Ohren, Nase
    P.push(sph(0.2, wx, wy - 0.1, z + 0.12, 0xb8b0c0, { sy: 0.9 }));
    P.push(sph(0.13, wx - 0.17, wy + 0.1, z + 0.08, 0xd8b0c8), sph(0.13, wx + 0.17, wy + 0.1, z + 0.08, 0xd8b0c8));
    P.push(sph(0.045, wx, wy - 0.12, z + 0.31, 0xff7a9a), sph(0.03, wx - 0.07, wy - 0.02, z + 0.29, 0x1a1a24), sph(0.03, wx + 0.07, wy - 0.02, z + 0.29, 0x1a1a24));
  }
  // Käse-Ecken neben dem Loch
  for (const [kx, ky, s] of [[hx0 - 1.0, hy0, 0.5], [hx1 + 1.1, hy0, 0.42], [-6.1, yTop + 0.3, 0.55]]) {
    const ch = new THREE.CylinderGeometry(s, s, s * 0.7, 3, 1).toNonIndexed();
    colorize(ch, (q, n, out) => mixc(L(0xffc83a), L(0xffe27a), smooth(-1, 1, n.y), out));
    ch.translate(kx, ky + s * 0.35, z + s * 0.6); P.push(ch);
    for (const [dx, dy] of [[-0.12, 0.12], [0.1, 0.22], [0.02, 0.05]]) P.push(sph(0.06 * s * 2, kx + dx * s * 2, ky + dy * s * 2 + 0.05, z + s * 1.12, 0xe8a82a, { sy: 0.6 }));
  }
  // Stube innen: Dielen, Bettchen, Kerze (sieht man über die Fassade hinweg)
  const zIn = (z + zBack) / 2;
  P.push(blk(inner * 2, 0.04, z - T - zBack, 0, o.yIn ?? yBot, zIn, 0x9a6a3a));
  P.push(blk(0.7, 0.3, 0.45, -0.75, o.yIn ?? yBot, zBack + 0.35, 0xff8ab0, { top: 0xffd0e0 }));
  P.push(cyl(0.06, 0.07, 0.24, 0.85, o.yIn ?? yBot, zBack + 0.3, 0xfff6ea, 8));
  bakeParts(level, P, { castShadow: false });
  // Glas: durchscheinend, leicht bläulich, mit Glanzstreifen
  const gTex = canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = 'rgba(200,235,255,0.22)'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.save(); g.translate(w * 0.3, 0); g.rotate(0.35); g.fillRect(0, -10, 6, h * 1.4); g.fillRect(12, -10, 2, h * 1.4); g.restore();
  }, { repeat: true });
  const ga = { pos: [], uv: [] };
  uvQuad(ga, 0, yTop + 0.3, z - 0.1, W, yGlass - yTop - 0.3, '+z', [0, 0, W / 3, (yGlass - yTop) / 3]);
  const gm = texMesh(level, ga, gTex, { basic: true, transparent: true, opacity: 0.9, name: 'glas' });
  gm.renderOrder = 3;
  bakeParts(level, [blk(W, 0.12, 0.2, 0, yGlass, z - 0.12, 0xc8d8e8)], { castShadow: false });
}

/** Bühnenvorhänge (rote Falten, Goldkante) links/rechts und oben; z = Bühnenkante, Öffnung ox0..ox1, Höhe yTop. */
export function theater(level, o) {
  if (!level.view) return;
  const { z, y, ox0, ox1, yTop } = o;
  const W = o.w ?? 14, P = [];
  const red = L(0xc81e3a), redD = L(0x7a0e22);
  const fold = (xa, xb, ya, yb, zz) => {
    const n = Math.max(3, Math.round((xb - xa) / 0.45));
    for (let i = 0; i < n; i++) {
      const xs = xa + ((xb - xa) * (i + 0.5)) / n;
      const g = new THREE.CylinderGeometry(0.24, 0.3, yb - ya, 8, 1, false, 0, Math.PI).toNonIndexed();
      g.rotateY(-Math.PI / 2);
      colorize(g, (q, nn, out) => mixc(redD, red, smooth(-0.8, 0.9, nn.z), out));
      g.translate(xs, ya + (yb - ya) / 2, zz);
      P.push(g);
    }
  };
  fold(-W / 2, ox0, y, yTop, z);
  fold(ox1, W / 2, y, yTop, z);
  fold(ox0, ox1, yTop - 1.1, yTop, z + 0.05);
  P.push(blk(ox1 - ox0, 0.16, 0.3, (ox0 + ox1) / 2, yTop - 1.2, z + 0.12, 0xffc21a));
  for (const x of [ox0 - 0.15, ox1 + 0.15]) P.push(blk(0.18, yTop - y, 0.32, x, y, z + 0.1, 0xffc21a));
  // Raffhalter (Quasten)
  for (const x of [ox0 - 0.5, ox1 + 0.5]) P.push(sph(0.16, x, y + 1.6, z + 0.35, 0xffd23d), cone(0.12, 0.4, x, y + 1.1, z + 0.35, 0xffc21a, 8));
  bakeParts(level, P, { castShadow: false });
}

/** Scheinwerfer an der Decke (Lichtkegel als additive Kegel, ein Mesh); list [[x, y, z, tx, tz, color], …]. */
export function lichtkegel(level, list, o = {}) {
  if (!level.view || !list.length) return null;
  const parts = [];
  for (const [x, y, z, tx, ty, tz, c] of list) {
    const h = Math.hypot(tx - x, ty - y, tz - z);
    const g = new THREE.ConeGeometry(o.r ?? 1.1, h, 16, 1, true).toNonIndexed();
    const col = L(c ?? 0xfff2b0);
    const pos = g.attributes.position, cl = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) { const k = clamp(0.5 - pos.getY(i) / h, 0, 1); const f = (1 - k) * (o.k ?? 0.5); cl[i * 3] = col[0] * f; cl[i * 3 + 1] = col[1] * f; cl[i * 3 + 2] = col[2] * f; }
    g.setAttribute('color', new THREE.BufferAttribute(cl, 3));
    g.translate(0, -h / 2, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(tx - x, ty - y, tz - z).normalize());
    g.applyQuaternion(q);
    g.translate(x, y, z);
    parts.push(g);
  }
  const m = new THREE.Mesh(merge(parts), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.name = 'lichtkegel';
  m.renderOrder = 4;
  addObject(level, m);
  return m;
}

/** Wellenmarkise (Schießbude): Streifen rot/weiß mit Bogenkante; x0..x1 bei z, Höhe y, Tiefe d (nach +z). */
export function markise(level, x0, x1, z, y, d = 1.2) {
  if (!level.view) return;
  const P = [];
  const n = Math.max(4, Math.round((x1 - x0) / 0.6));
  for (let i = 0; i < n; i++) {
    const xa = x0 + ((x1 - x0) * i) / n, xb = x0 + ((x1 - x0) * (i + 1)) / n;
    const c = i % 2 ? 0xffffff : 0xe8323a;
    const g = new THREE.BufferGeometry();
    const pos = [xa, y, z, xb, y, z, xb, y - 0.35, z + d, xa, y, z, xb, y - 0.35, z + d, xa, y - 0.35, z + d];
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    const cc = L(c), arr = new Float32Array(18); for (let k = 0; k < 6; k++) { arr[k * 3] = cc[0]; arr[k * 3 + 1] = cc[1]; arr[k * 3 + 2] = cc[2]; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    P.push(g);
    // Bogenkante (Halbkreis-Lappen)
    const lap = new THREE.CircleGeometry((xb - xa) / 2, 10, Math.PI, Math.PI).toNonIndexed();
    colorize(lap, (q, nn, out) => { out[0] = cc[0]; out[1] = cc[1]; out[2] = cc[2]; });
    lap.translate((xa + xb) / 2, y - 0.35, z + d + 0.01);
    P.push(lap);
  }
  bakeParts(level, P, { castShadow: false });
}

/**
 * Stern reitet auf einer bewegten Plattform (6-Haus Raum 2): Stern-Entität des Index folgt der Oberseite der Form
 * (mover-Handle aus level.named). dy = Abstand über der Oberseite.
 */
export function sternFolgt(level, index, moverId, dy = 0.06) {
  const h = level.named.get(moverId);
  if (!h) return;
  level.onStep(() => {
    const st = level.entities.find((e) => e.kind === 'star' && e.index === index && !e.removed);
    if (!st) return;
    const s = h.shape;
    st.pos.set((s.x0 + s.x1) / 2, s.y1 + dy, (s.z0 + s.z1) / 2);
  });
}

/**
 * Raum-Stern erst nach einem Auslöser (6-Haus Räume 3 und 5): beim Start des Raums (auch nach Neustart) versteckt, solange
 * er nicht eingesammelt ist. reveal(pos) zeigt ihn (über giveStar). Liefert { reveal(pos), hide() }.
 */
export function sternVersteckt(level, index) {
  const find = () => level.entities.find((e) => e.kind === 'star' && e.index === index && !e.removed);
  const hide = () => {
    const st = find();
    if (!st || level.runtime.stars[index]) return;
    st.hidden = true; st.touch = false;
    if (st.model) st.model.root.visible = false;
  };
  hide();
  return { hide, reveal: (pos) => giveStar(level, { index, pos }, { x: pos[0], y: pos[1], z: pos[2] }) };
}

/**
 * Kullerrinne (6-Haus Raum 1): Wurfbälle, die in der Rinne liegen oder rollen, bekommen Schwung rinnenabwärts und werden
 * zur Rinnenmitte geführt (U-förmige Holzrinne). Die Wurfball-Physik des Motors beschleunigt auf Rampen nur in Bodenschritten
 * (auf steilen Hängen hüpft der Ball und rollt kaum an) – hier wirkt die Hangabtriebskraft je Schritt.
 * o = { x0, x1, z0, z1 (Rinnenbereich), top(z) (Oberfläche), dir: −1 (rollt nach −Z), accel: 6, vmax: 9, center: 6 }.
 */
export function kullerRinne(level, o) {
  const xm = (o.x0 + o.x1) / 2, zA = Math.min(o.z0, o.z1), zB = Math.max(o.z0, o.z1), dir = o.dir ?? -1;
  const st = { pushed: 0 };
  level.onStep((dt) => {
    for (const e of level.entities) {
      if (e.kind !== 'wurfball' || e.removed || e.carrier || e.goneT >= 0) continue;
      const x = e.pos.x, z = e.pos.z;
      if (x < o.x0 || x > o.x1 || z < zA || z > zB) continue;
      if (e.pos.y > o.top(z) + 0.7) continue;
      const vmax = o.vmax ?? 9;
      if (e.vel.z * dir < vmax) e.vel.z += dir * (o.accel ?? 6) * dt;
      e.vel.x += (xm - x) * (o.center ?? 6) * dt - e.vel.x * 2 * dt;
      st.pushed += dt;
    }
  });
  return st;
}

// ====================================================================== 3) Maschinenhalle (6-6)

/** Neustart nach einem Tod verketten (wie der Archetyp house): fn() nach runtime.respawn. */
export function nachNeustart(level, fn) {
  const rt = level.runtime;
  const prev = rt.respawn.bind(rt);
  rt.respawn = () => { prev(); fn(); };
}

/**
 * Fahrende Plattform startet erst, wenn eine Figur daraufsteht (Fahrzeug `vehicle` mit eigenem Pfad, mode 'once'):
 * bis dahin ruht die Fahrt-Uhr (delay sehr groß); nach einem Tod steht sie wieder am Start. Liefert { started, info() }.
 */
export function startBeimDraufstehen(level, id) {
  const v = level.named.get(id);
  if (!v) return null;
  const st = { started: false, t: 0 };
  v.delay = 1e9;
  level.onStep(() => {
    if (st.started) return;
    for (const f of level.players ?? [level.player]) {
      if (f.mode === 'ground' && f.ground?.mover === v.mover) {
        st.started = true;
        v.delay = level.time - v.t0;
        level.sfx('switch');
        break;
      }
    }
  });
  nachNeustart(level, () => { st.started = false; v.delay = 1e9; });
  st.info = () => ({ started: st.started, s: +v.s.toFixed(2) });
  return st;
}

/**
 * Krallen-Automat (6-6 vor der hohen Förderband-Wand): eine Kostüm-Kapsel, aus der immer wieder ein Krallen-Anzug
 * steigt, solange die Figur keinen trägt und keiner daliegt (alle `every` s). Kulisse: Automat mit Glaskuppel, Lämpchen.
 * o = { pos: [x, y, z], every: 1.5, yaw }. Liefert { given }.
 */
export function krallenAutomat(level, o) {
  const [x, y, z] = o.pos;
  const st = { given: 0, t: 0.3 };
  level.onStep((dt) => {
    const p = level.player;
    if (!p || p.dead) return;
    if (p.power === 'krallen') { st.t = 0.6; return; }
    const lying = level.entities.some((e) => e.kind === 'powerup' && !e.removed && e.power === 'krallen' && Math.hypot(e.pos.x - x, e.pos.z - z) < 3);
    if (lying) return;
    st.t -= dt;
    if (st.t > 0) return;
    st.t = o.every ?? 1.5;
    st.given++;
    level.spawn('powerup', { pos: [x, y + 0.08, z], power: 'krallen', emerge: true });
    level.sfx('powerup_appear');
  });
  if (level.view) {
    const P = [];
    P.push(cyl(0.85, 0.95, 0.08, x, y, z, 0xffc21a, 20, { top: 0xffe06a }));
    for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; P.push(blk(0.14, 0.03, 0.14, x + Math.cos(a) * 0.78, y + 0.08, z + Math.sin(a) * 0.78, k % 2 ? 0x2a2a34 : 0xffffff)); }
    // Rückwand mit Krallen-Schild (Pfote) und Lämpchen
    const bz = z - 0.9;
    P.push(blk(1.8, 2.6, 0.3, x, y, bz, 0x5a6476, { top: 0x8a92a8 }));
    P.push(cyl(0.5, 0.5, 0.06, 0, 0, 0, 0xffffff, 18, { rx: Math.PI / 2, center: true }).translate(x, y + 1.9, bz + 0.18));
    for (const [dx, dy, r] of [[0, -0.08, 0.2], [-0.2, 0.14, 0.08], [-0.07, 0.22, 0.08], [0.07, 0.22, 0.08], [0.2, 0.14, 0.08]]) P.push(sph(r, x + dx, y + 1.9 + dy, bz + 0.22, 0xff8a2a, { sy: 0.5 }));
    bakeParts(level, P, { castShadow: true });
    glowPoints(level, [[x - 0.6, y + 2.45, bz + 0.2], [x + 0.6, y + 2.45, bz + 0.2]], 0xffc21a, 0.6);
  }
  return st;
}

/** Stahlträger (Fachwerk) von a nach b (waagerecht oder senkrecht), Breite w; als verschmolzene Teile in parts. */
export function traeger(parts, a, b, o = {}) {
  const w = o.w ?? 0.5, col = o.color ?? 0xd8483a;
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L2 = Math.hypot(dx, dy, dz);
  const n = Math.max(1, Math.round(L2 / (o.cell ?? 1.2)));
  const vert = Math.abs(dy) > Math.max(Math.abs(dx), Math.abs(dz));
  const at = (t, off) => [a[0] + dx * t + (vert ? off : 0), a[1] + dy * t + (vert ? 0 : off), a[2] + dz * t];
  const rod = (p, q, r) => {
    const g = new THREE.CylinderGeometry(r, r, Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]), 5).toNonIndexed();
    const c = L(col);
    colorize(g, (pp, nn, out) => { const k = 0.75 + 0.25 * smooth(-1, 1, nn.y + nn.x * 0.3); out[0] = c[0] * k; out[1] = c[1] * k; out[2] = c[2] * k; });
    const v = new THREE.Vector3(q[0] - p[0], q[1] - p[1], q[2] - p[2]).normalize();
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v));
    g.translate((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2);
    parts.push(g);
  };
  rod(at(0, -w / 2), at(1, -w / 2), 0.07);
  rod(at(0, w / 2), at(1, w / 2), 0.07);
  for (let i = 0; i < n; i++) rod(at(i / n, (i % 2 ? 1 : -1) * w / 2), at((i + 1) / n, (i % 2 ? -1 : 1) * w / 2), 0.045);
}

/**
 * Drehende Zahnräder (Kulisse, Registry-Modell 'zahnrad' – drehen sich; ohne Modell nichts). list [{ pos, radius, axis:
 * 'x' | 'z', speed, color }]. Ein Objekt je Rad (wenige, große Räder an den Hallenwänden).
 */
export function zahnraeder(level, list) {
  if (!level.view) return;
  for (const z of list) {
    if (!hasModel('zahnrad')) return;
    const m = getModel('zahnrad', { radius: z.radius ?? 1.5, thick: z.thick ?? 0.35, color: z.color ?? 'messing' });
    m.root.position.set(z.pos[0], z.pos[1], z.pos[2]);
    if (z.axis === 'z') m.root.rotation.y = Math.PI / 2;
    m.root.traverse((q) => { if (q.isMesh) { q.castShadow = false; q.receiveShadow = true; } });
    let a = z.phase ?? 0;
    const hv = {};
    addObject(level, m.root, (dt) => { a += (z.speed ?? 0.4) * visDt(level, hv, dt); m.update?.(dt, { angle: a }); });
  }
}

/** Dampfwölkchen über Schloten (Punkte, steigen auf; ein Objekt): list [[x, y, z], …]. */
export function dampf(level, list, o = {}) {
  if (!level.view || !list.length) return null;
  const n = o.n ?? 6;
  const pts = new Float32Array(list.length * n * 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  const tex = canvasTex(64, 64, (c, w, h) => { const gr = c.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const mat = new THREE.PointsMaterial({ map: tex, size: o.size ?? 1.6, transparent: true, opacity: 0.75, depthWrite: false, color: o.color ?? 0xf4f6ff });
  const P = new THREE.Points(g, mat);
  P.name = 'dampf';
  let t = 0;
  const hv = {};
  addObject(level, P, (dt) => {
    t += visDt(level, hv, dt);
    let i = 0;
    for (const [x, y, z] of list) for (let k = 0; k < n; k++) {
      const u = ((t * 0.35 + k / n) % 1);
      pts[i++] = x + Math.sin(k * 2.1 + t * 0.7) * 0.3 * u;
      pts[i++] = y + u * (o.rise ?? 3.2);
      pts[i++] = z + Math.cos(k * 1.7) * 0.25 * u;
    }
    g.attributes.position.needsUpdate = true;
  });
  P.frustumCulled = false;
  return P;
}
