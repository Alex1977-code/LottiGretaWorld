// Bausteine Draufsicht der Bonuswelt Stern (Präzisierung „Motor und Bausteine Bonuswelten“; Bauplan S-6 „Kamera senkrecht
// von oben, Waben-Plattformen aus Lava/Eis“, B-10 „Taghimmel statt Weltraum“).
//
// draufsicht – Kamera senkrecht von oben (Neigung 89,5°) für das ganze Level oder einen Bereich; am Rand weich (blend m)
//   in die normale Kameraschiene überblendet. Die Steuerung bleibt intuitiv: oben im Bild = −Z (Stick nach oben läuft nach
//   oben), die Steuerungs-Gier kommt wie immer unverzögert aus der Schiene (deterministisch). Mehrere Bereiche möglich.
//   { type: 'draufsicht', id, area: [x0, z0, x1, z1] | whole: true, height: 24 (Abstand Kamera–Figur), fov: 42, blend: 6,
//     yaw: 0 (Grad; 0 = oben im Bild ist −Z), ahead: 1.5 (m Blickziel voraus, nach −Z), lead: 0.5 }
//   level.named.get(id) = { area, weight(x, z) (0..1), info() → { weight (an der Figur), pitch } }; star(level).topdown.
//   Beispiel: { type: 'draufsicht', id: 'oben', area: [-30, -40, 30, -140] }
//
// waben – Feld aus sechseckigen Waben-Platten (spitze Ecke nach ±Z, Reihen versetzt): normal (Honig-gelb), Lava (glüht,
//   Draufstehen = Treffer und Hochspringen; damage 'tod' = Lava-Tod), Eis (glatt: Formflag ice), hoch (eine Stufe höher).
//   Kollision je Wabe ein senkrechter Zylinder (Innenradius), Lava-Waben mit Hitze-Prüfung. 3 Zeichenaufrufe je Feld.
//   { type: 'waben', id, pos: [x, y, z] (Oberseite der Wabe Zeile 0 / Spalte 0), size: 1.6 (Eckradius), height: 0.6 (Dicke),
//     map: ['nnl', ' iin', …] (Zeilen nach −Z, Spalten nach +X; n normal, l Lava, i Eis, h hoch (+1 m), ' '/'.' leer),
//     gap: 0.06, rise: 1 (m für 'h'), damage: 'treffer' | 'tod', color: 'honig' | 'weiss' | 'lila' (nur eigene Optik),
//     look: 'eigen' }
//   Optik: Registry-Modell 'wabe' als Instanz-Variante je Art (normal/lava/eis; ≤ 3 Gruppen, feste Hüllkugel), Waben unter
//   stehenden Figuren drücken sich ein (state press); ohne Modell bzw. look 'eigen' eigene Prismen.
//   level.named.get(id) = { cells: [{ q, r, type, x, y, z }], at(x, z) → Zelle | null, hits, info() }; Form-Tags 'wabe',
//   'wabe-lava', 'wabe-eis'; star(level).combs.
//   Beispiel: { type: 'waben', id: 'feld', pos: [-6, 0, -40], map: ['nnnn', 'nlin', 'nnnn'] }

import * as THREE from 'three';
import { v3, addObject } from '../kit.js';
import { visDt } from '../../entities/gimmick.js';
import { star, figures, lin, mixc, smooth, colorize, clamp, useModel, instancedModel, sphereOf } from '../starkit.js';

const groupsOf = (cells, type) => cells.filter((c) => c.type === type);

// ===================================================================== Draufsicht

export function buildDraufsicht(level, spec) {
  const area = spec.whole ? null : (spec.area ?? [-1e4, -1e4, 1e4, 1e4]);
  const A = area ? { x0: Math.min(area[0], area[2]), x1: Math.max(area[0], area[2]), z0: Math.min(area[1], area[3]), z1: Math.max(area[1], area[3]) } : null;
  const blend = spec.blend ?? 6;
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const weight = (x, z) => {
    if (!A) return 1;
    const dx = Math.max(A.x0 - x, 0, x - A.x1), dz = Math.max(A.z0 - z, 0, z - A.z1);
    const d = Math.hypot(dx, dz);
    return d <= 0 ? 1 : 1 - sm(d / Math.max(0.01, blend));
  };
  const top = { pitch: 89.5, dist: spec.height ?? 24, fov: spec.fov ?? 42, yaw: spec.yaw ?? 0, ahead: spec.ahead ?? 1.5, height: 0.5, lead: spec.lead ?? 0.5 };
  const handle = {
    area, weight, kind: 'draufsicht',
    info: () => { const p = level.player?.pos; const r = level.view?.rig; return { weight: p ? +weight(p.x, p.z).toFixed(3) : 0, pitch: r ? +(r.cur?.pitch ?? 0).toFixed(2) : null }; },
  };
  if (spec.id) level.named.set(spec.id, handle);
  star(level).topdown.push(handle);
  const rig = level.view?.rig;
  if (rig) {
    const prev = rig.railAt.bind(rig);
    rig.railAt = (x, z, out = {}) => {
      const r = prev(x, z, out);
      const w = weight(x, z);
      if (w <= 0) return r;
      for (const k of ['pitch', 'dist', 'fov', 'yaw', 'ahead', 'height', 'lead']) r[k] = r[k] + (top[k] - r[k]) * w;
      if (w > 0.5) r.lockW = (r.lockW ?? 0) * (1 - w);
      return r;
    };
  }
  return handle;
}

// ===================================================================== Waben

const COMB = {
  honig: { n: [0xffd23a, 0xfff2a8, 0xc88a10], h: [0xffb82a, 0xffe08a, 0xb87008] },
  weiss: { n: [0xf4f2ff, 0xffffff, 0xb8b4d8], h: [0xe0dcff, 0xffffff, 0xa8a0d0] },
  lila: { n: [0xc8a8ff, 0xf0e4ff, 0x7a5ad8], h: [0xb890ff, 0xe8d8ff, 0x6a48c8] },
};

/** Waben-Prisma (Ursprung Oberseiten-Mitte, Ecke nach ±Z), Rand hell, Oberseite mit Wabenmuster-Aufhellung. */
function hexGeo(R, H, cols) {
  const g = new THREE.CylinderGeometry(R, R * 0.96, H, 6, 1);
  g.translate(0, -H / 2, 0);
  const [a, hi, lo] = cols.map(lin);
  return colorize(g, (p, n, o) => {
    if (n.y > 0.5) { const r = Math.hypot(p.x, p.z) / R; mixc(a, hi, smooth(0.62, 0.95, r) * 0.8 + (r < 0.35 ? 0.2 : 0), o); }
    else if (n.y < -0.5) mixc(lo, lo, 0, o);
    else mixc(lo, a, smooth(-H, 0, p.y) * 0.8, o);
  });
}

export function buildWaben(level, spec) {
  const p0 = v3(spec.pos);
  const R = spec.size ?? 1.6, H = spec.height ?? 0.6, gap = spec.gap ?? 0.06;
  const rise = spec.rise ?? 1;
  const ri = (Math.sqrt(3) / 2) * R;            // Innenradius
  const colW = 2 * ri + gap, rowD = 1.5 * R + gap * 0.87;
  const map = spec.map ?? ['nnn', 'nnn'];
  const cells = [];
  map.forEach((row, r) => {
    for (let q = 0; q < row.length; q++) {
      const ch = row[q];
      const type = ch === 'l' ? 'lava' : ch === 'i' ? 'eis' : ch === 'h' ? 'hoch' : ch === 'n' ? 'normal' : null;
      if (!type) continue;
      const x = p0.x + q * colW + (r % 2 ? colW / 2 : 0), z = p0.z - r * rowD;
      const y = p0.y + (type === 'hoch' ? rise : 0);
      cells.push({ q, r, type, x, y, z, i: cells.length });
    }
  });
  const handle = { cells, kind: 'waben', hits: 0 };
  for (const c of cells) {
    c.shape = { type: 'cyl', x: c.x, z: c.z, r: ri - gap * 0.3, y0: c.y - H - (c.type === 'hoch' ? rise : 0), y1: c.y, owner: c, tag: c.type === 'lava' ? 'wabe-lava' : c.type === 'eis' ? 'wabe-eis' : 'wabe' };
    if (c.type === 'eis') c.shape.ice = true;
    c.id = level.world.add(c.shape);
  }
  handle.at = (x, z) => { let best = null, bd = Infinity; for (const c of cells) { const d = Math.hypot(x - c.x, z - c.z); if (d < bd && d < ri) { bd = d; best = c; } } return best; };
  handle.info = () => ({ cells: cells.length, lava: cells.filter((c) => c.type === 'lava').length, eis: cells.filter((c) => c.type === 'eis').length, hits: handle.hits });
  if (spec.id) level.named.set(spec.id, handle);
  star(level).combs.push(handle);
  // Lava-Waben: Landen = Federn (Formflag bounce) + Treffer (onBounce); wer hinüberläuft, wird ebenso hochgeschleudert.
  // damage 'tod' = Lava-Tod.
  const lava = cells.filter((c) => c.type === 'lava');
  const burn = (f) => {
    if (f.dead) return;
    if (spec.damage === 'tod') { f.die('lava'); handle.hits++; return; }
    if (!(f.invuln > 0.05) && !f.invulnerable && f.hurt?.({ pos: { x: f.pos.x, y: f.pos.y - 0.6, z: f.pos.z } })) handle.hits++;
    level.sfx('burn');
    level.effects?.sparks({ x: f.pos.x, y: f.pos.y + 0.2, z: f.pos.z }, 8);
  };
  for (const c of lava) { c.shape.bounce = 10.5; c.onBounce = burn; }
  if (lava.length) {
    level.onStep(() => {
      for (const f of figures(level)) {
        if (f.mode !== 'ground' || !f.ground?.owner || !lava.includes(f.ground.owner)) continue;
        f.vel.y = 10.5;
        f.enterAir?.('bounce', false);
        f.setState?.('jump2');
        burn(f);
      }
    });
  }
  if (!level.view || !cells.length) return handle;
  if (useModel(spec, 'wabe')) {
    // Registry-Modell (Instanz-Variante je Art: lila Körper mit Honig-Deckfläche, Lava-Kruste mit Glut, Eis mit Raureif;
    // Ecke nach +X → um 90° gedreht wie hier Ecke nach ±Z); 'hoch' = gestreckte normale Wabe; stehende Figuren drücken ein
    const sp = sphereOf(cells, R + rise + 0.5);
    const kinds = { normal: cells.filter((c) => c.type === 'normal' || c.type === 'hoch'), lava: groupsOf(cells, 'lava'), eis: groupsOf(cells, 'eis') };
    const apis = [];
    for (const [kind, list] of Object.entries(kinds)) {
      if (!list.length) continue;
      const api = instancedModel(level, 'wabe', list.length, { kind, size: R - gap * 0.5, thick: H }, sp);
      list.forEach((c, i) => {
        c.api = api; c.slot = i; c.press = 0;
        if (c.type === 'hoch') api.setAt(i, [c.x, c.y - H - rise, c.z], Math.PI / 2, [1, (H + rise) / H, 1]);
        else api.setAt(i, [c.x, c.y - H, c.z], Math.PI / 2, 1);
      });
      apis.push(api);
    }
    const holder = {};
    level.view.onFrame((dt) => {
      const dd = visDt(level, holder, dt);
      const on = new Set();
      for (const f of figures(level)) if (f.mode === 'ground' && f.ground?.owner && cells.includes(f.ground.owner)) on.add(f.ground.owner);
      for (const c of cells) {
        const target = on.has(c) ? 1 : 0;
        if (c.press === target && target === 0) continue;
        c.press += (target - c.press) * Math.min(1, dd * 14);
        if (Math.abs(c.press - target) < 0.01) c.press = target;
        c.api.setState(c.slot, { press: c.press });
      }
    });
    return handle;
  }
  const C = COMB[spec.color] ?? COMB.honig;
  const groups = { normal: [], hoch: [], lava: [], eis: [] };
  for (const c of cells) groups[c.type].push(c);
  const m4 = new THREE.Matrix4();
  const mk = (list, geo, mat, name, shadow = true) => {
    if (!list.length) return null;
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    mesh.name = name;
    mesh.castShadow = shadow; mesh.receiveShadow = true;
    list.forEach((c, i) => { m4.makeTranslation(c.x, c.y, c.z); if (c.type === 'hoch') m4.scale(new THREE.Vector3(1, (H + rise) / H, 1)); m4.setPosition(c.x, c.y, c.z); mesh.setMatrixAt(i, m4); });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    addObject(level, mesh);
    return mesh;
  };
  const solidMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 });
  mk([...groups.normal, ...groups.hoch], hexGeo(R - gap * 0.5, H, C.n), solidMat, 'waben');
  const iceMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.08, metalness: 0.1, emissive: 0x16304a });
  mk(groups.eis, hexGeo(R - gap * 0.5, H, [0xbfeaff, 0xffffff, 0x6aa8d8]), iceMat, 'waben_eis');
  const lavaMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, emissive: 0xff4a10, emissiveIntensity: 0.9 });
  const lm = mk(groups.lava, hexGeo(R - gap * 0.5, H, [0xff7a1a, 0xffe060, 0xa8200a]), lavaMat, 'waben_lava', false);
  if (lm) {
    const holder = {};
    let t = 0;
    level.view.onFrame((dt) => { t += visDt(level, holder, dt); lavaMat.emissiveIntensity = 0.75 + Math.sin(t * 3.2) * 0.25; });
  }
  return handle;
}

export const TYPES = { draufsicht: buildDraufsicht, waben: buildWaben };
