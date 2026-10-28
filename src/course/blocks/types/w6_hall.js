// Welt-6-Bausteine Fernost-Halle (Bauplan 6-3 „Schiebetüren antippen“, „Gong im 3. Stock lässt Münzen regnen“, „zwei
// Scheinwände hinter Schiebetüren“, „Gong lässt Rätselbox erscheinen“). Eigene Fantasie-Gestaltung: Papier-Schiebewände
// mit Holzgitter, lackierter Gong-Rahmen – keine realen religiösen Symbole.
//
// schiebetuer – Schiebetür aus Papier und Holz: Antippen (Touch-Strahl) oder Aktion in Reichweite öffnet sie (Flügel gleitet
//   zur Seite), optional bei Nähe oder nur per Signal. Geschlossen versperrt sie den Durchgang. `behind: 'wand'` = Scheinwand:
//   dahinter liegt nur eine bemalte Wand (Durchgang bleibt zu).
//   { type: 'schiebetuer', id, pos: [x, y, z] (Mitte der Unterkante), width: 2.4, height: 3, yaw: −π/2 (Vorderseite blickt
//     dorthin; −π/2 = zur Kamera, Tür quer entlang X; 0 = Vorderseite nach +X, Tür entlang Z; 90°-Raster),
//     open: 'tap' | 'near' | 'signal', near: 2.5, slide: 'links' | 'rechts' | 'beide', speed: 2.5 (m/s), close: 0 (s offen,
//     dann wieder zu; 0 = bleibt offen), behind: 'frei' | 'wand', onOpen: Aktion (erstes Öffnen), style: 'papier' | 'holz',
//     color: 0xd8443a (Rahmen), frame: true, reach: 3.5, hint: true, hidden }
//   level.named.get(id) = { open(), close(), toggle(), reveal(), hide(), state ('zu'|'oeffnet'|'auf'|'schliesst'), k (0..1),
//                           opens, info() }
// gong – Gong im Holzrahmen: Antippen, Aktion in Reichweite, Stampfen auf der Platte davor, Angriffe (Tatze, Wurfball,
//   Panzer, Feuer) schlagen ihn → Münzregen (fallende Münzen ringsum), Aktion und Signal (z. B. Rätselbox erscheint).
//   { type: 'gong', id, pos: [x, y, z] (Fußpunkt des Rahmens), yaw: −π/2 (Gongscheibe blickt dorthin), size: 1.8 (Ø),
//     coins: 10 (0 = kein Münzregen), rain: { r: 5, height: 9, time: 1.6 }, onHit: Aktion (jeder Schlag; mit once nur der
//     erste), signal: 'gong' (level.signal je Schlag), once: false, cooldown: 1.2, plate: true (Stampf-Platte 2,4 × 2,4 m
//     vor dem Gong), trigger: ['tap', 'pound', 'hit'] (Standard alle), reach: 3.5, hidden }
//   level.named.get(id) = { hits, ring(via), reveal(), hide(), info() }; Entität-Schnittstelle für Würfe: onHit(kind) über
//   die Kollisionsform (owner) bzw. w6(level).gongs.
// Modelle aus der Registry, sobald es sie gibt: 'schiebetuer' ({ width, height, style }, Flügel entlang +X, Ursprung Mitte
//   unten; state { open }), 'gong' ({ size }, Scheibe blickt +X, Ursprung Fußpunkt; state { swing, glow }).

import * as THREE from 'three';
import { v3, lin, mixc, smooth, colorize, merge, hex, box, addObject, Rnd } from '../kit.js';
import { runAction, visDt } from '../../entities/gimmick.js';
import { tapTargets } from '../../entities/tap.js';
import { hasModel, getModel } from '../../models/index.js';
import { w6, figures, flatColor } from '../w6kit.js';

const HALF_PI = Math.PI / 2;
const snap90 = (y) => Math.round((y ?? 0) / HALF_PI) * HALF_PI;

/** Lage in der Türebene: u entlang der Tür (Breite), n entlang der Vorderseiten-Normale. */
function frameOf(yaw) {
  const nx = Math.cos(yaw), nz = -Math.sin(yaw);   // Blickrichtung der Vorderseite
  return { nx, nz, ax: nz, az: -nx };              // Tür entlang (ax, az): von vorn gesehen nach rechts
}

// ------------------------------------------------------------------ Geometrie

/** Schiebeflügel (lokal: Breite entlang X, Mitte unten im Ursprung, Dicke entlang Z). */
function leafGeo(w, h, style, frameCol) {
  const parts = [];
  const wood = style === 'holz' ? 0x8a5a32 : 0x5a3a24, paper = 0xfff4dc, paper2 = 0xf2e2bc;
  const t = 0.1;
  // Papierfläche (beidseitig) mit leichtem Verlauf
  const pg = new THREE.BoxGeometry(w - 0.12, h - 0.12, 0.04);
  pg.translate(0, h / 2, 0);
  const pc = lin(style === 'holz' ? 0xc89a62 : paper), pc2 = lin(style === 'holz' ? 0xb08250 : paper2);
  parts.push(colorize(pg.toNonIndexed(), (p, n, o) => mixc(pc2, pc, smooth(0, h, p.y) * 0.6 + 0.4, o)));
  // Gitter aus Holzleisten
  const nx = Math.max(2, Math.round(w / 0.5)), ny = Math.max(3, Math.round(h / 0.5));
  for (let i = 1; i < nx; i++) parts.push(flatColor(box(0.04, h - 0.1, t * 0.7, -w / 2 + (i * w) / nx, h / 2, 0, wood, { r: 0.01, seg: 1 }), wood));
  for (let j = 1; j < ny; j++) parts.push(flatColor(box(w - 0.1, 0.04, t * 0.7, 0, (j * h) / ny, 0, wood, { r: 0.01, seg: 1 }), wood));
  // Rahmen (lackiert)
  parts.push(box(w, 0.12, t, 0, h - 0.06, 0, frameCol, { r: 0.03, seg: 1 }), box(w, 0.12, t, 0, 0.06, 0, frameCol, { r: 0.03, seg: 1 }));
  parts.push(box(0.12, h, t, -w / 2 + 0.06, h / 2, 0, frameCol, { r: 0.03, seg: 1 }), box(0.12, h, t, w / 2 - 0.06, h / 2, 0, frameCol, { r: 0.03, seg: 1 }));
  // Griffmulde
  parts.push(flatColor(box(0.08, 0.3, t * 1.4, w / 2 - 0.3, h * 0.48, 0, 0x2a1a10, { r: 0.03, seg: 1 }), 0x2a1a10));
  return merge(parts);
}

/** Türrahmen mit Sturz (lokal wie leafGeo; Pfosten außerhalb der Öffnung). */
function doorFrameGeo(w, h, frameCol) {
  const parts = [];
  parts.push(box(0.26, h + 0.3, 0.32, -w / 2 - 0.13, (h + 0.3) / 2, 0, frameCol, { r: 0.05 }), box(0.26, h + 0.3, 0.32, w / 2 + 0.13, (h + 0.3) / 2, 0, frameCol, { r: 0.05 }));
  parts.push(box(w + 0.52, 0.28, 0.4, 0, h + 0.2, 0, frameCol, { r: 0.06 }));
  return merge(parts);
}

/** Bemalte Scheinwand (Wolken und Berge) – lokal wie leafGeo. */
function fakeWallGeo(w, h, rnd) {
  const g = new THREE.BoxGeometry(w + 0.2, h, 0.3, 8, 6, 1);
  g.translate(0, h / 2, 0);
  const sky = lin(0xf6e6c8), hill = lin(0x7aa86a), cloud = lin(0xffffff), sun = lin(0xff7a4a);
  const ph = rnd.real(0, 6);
  return colorize(g.toNonIndexed(), (p, n, o) => {
    const ridge = h * 0.35 + Math.sin(p.x * 1.6 + ph) * h * 0.12;
    if (p.y < ridge) mixc(hill, sky, 0.15, o); else mixc(sky, cloud, smooth(h * 0.6, h, p.y) * 0.4, o);
    if (Math.hypot(p.x - w * 0.2, p.y - h * 0.72) < h * 0.1) mixc(o, sun, 0.8, o);
  });
}

export function buildSchiebetuer(level, spec) {
  const p = v3(spec.pos);
  const W = spec.width ?? 2.4, H = spec.height ?? 3;
  const yaw = snap90(spec.yaw ?? -HALF_PI);
  const F = frameOf(yaw);
  const mode = spec.open ?? 'tap';
  const slide = spec.slide ?? 'rechts';
  const speed = spec.speed ?? 2.5;
  const frameCol = spec.color ?? 0xd8443a;
  const D = 0.3;   // Dicke (Kollision)
  const st = { k: 0, want: 0, state: 'zu', opens: 0, openT: 0, hidden: !!spec.hidden, first: true };
  const leaves = slide === 'beide' ? [{ s: -1, w: W / 2, c: -W / 4 }, { s: 1, w: W / 2, c: W / 4 }] : [{ s: slide === 'links' ? -1 : 1, w: W, c: 0 }];
  // Kollision: Flügel als Quader (gleiten mit k zur Seite in die Wandtasche), Pfosten, Scheinwand
  const boxAt = (u, n, hw, hn, y0, y1) => {
    const cx = p.x + F.ax * u + F.nx * n, cz = p.z + F.az * u + F.nz * n;
    const ex = Math.abs(F.ax) * hw + Math.abs(F.nx) * hn, ez = Math.abs(F.az) * hw + Math.abs(F.nz) * hn;
    return { min: [cx - ex, y0, cz - ez], max: [cx + ex, y1, cz + ez] };
  };
  const shapes = leaves.map((lf) => ({ type: 'box', ...boxAt(lf.c, 0, lf.w / 2, D / 2, p.y, p.y + H), tag: 'schiebetuer', camIgnore: true, owner: null }));
  const fixed = [];
  fixed.push({ type: 'box', ...boxAt(-W / 2 - 0.13, 0, 0.13, 0.16, p.y, p.y + H + 0.3), tag: 'schiebetuer:rahmen' });
  fixed.push({ type: 'box', ...boxAt(W / 2 + 0.13, 0, 0.13, 0.16, p.y, p.y + H + 0.3), tag: 'schiebetuer:rahmen' });
  if (spec.behind === 'wand') fixed.push({ type: 'box', ...boxAt(0, -0.5, W / 2 + 0.1, 0.15, p.y, p.y + H), tag: 'scheinwand' });
  let ids = [];
  let leafIds = [];
  const setSolid = (on) => {
    for (const id of [...ids, ...leafIds]) level.world.remove(id);
    ids = on ? fixed.map((s) => level.world.add(s)) : [];
    leafIds = on ? shapes.map((s) => level.world.add(s)) : [];
  };
  const placeLeaves = () => {
    shapes.forEach((sh, i) => {
      const lf = leaves[i];
      const u = lf.c + lf.s * st.k * (lf.w - 0.12);
      Object.assign(sh, boxAt(u, 0, lf.w / 2, D / 2, p.y, p.y + H));
      if (leafIds[i]) level.world.update(leafIds[i]);
    });
  };
  setSolid(!st.hidden);
  const handle = {
    get state() { return st.state; }, get k() { return st.k; }, get opens() { return st.opens; },
    open() {
      if (st.hidden || st.want === 1) return;
      st.want = 1; st.openT = 0; st.opens++; st.tapT = 1;
      level.sfx('door');
      if (st.first) { st.first = false; runAction(level, spec.onOpen, { pos: [p.x + F.nx, p.y + 1, p.z + F.nz], source: handle }); }
    },
    close() { if (st.want === 0) return; st.want = 0; level.sfx('door'); },
    toggle() { if (st.want) handle.close(); else handle.open(); },
    reveal() { if (!st.hidden) return; st.hidden = false; setSolid(true); placeLeaves(); level.sfx('powerup_appear'); },
    hide() { st.hidden = true; setSolid(false); },
    info: () => ({ state: st.state, k: +st.k.toFixed(2), opens: st.opens, blocked: st.k < 0.75, behind: spec.behind ?? 'frei' }),
  };
  for (const sh of shapes) sh.owner = handle;
  if (spec.id) level.named.set(spec.id, handle);
  level.onStep((dt) => {
    if (st.hidden) return;
    if (mode === 'near' && st.want === 0) {
      for (const f of figures(level)) if (Math.hypot(f.pos.x - p.x, f.pos.z - p.z) < (spec.near ?? 2.5) && Math.abs(f.pos.y - p.y) < 2) { handle.open(); break; }
    }
    if (st.want === 1 && spec.close > 0) { st.openT += dt; if (st.openT > spec.close) handle.close(); }
    const target = st.want;
    if (st.k !== target) {
      const step = (speed / W) * dt;
      st.k = target > st.k ? Math.min(target, st.k + step) : Math.max(target, st.k - step);
      placeLeaves();
    }
    st.state = st.k <= 0 ? 'zu' : st.k >= 1 ? 'auf' : target > st.k ? 'oeffnet' : 'schliesst';
  });
  if (mode === 'tap') {
    tapTargets(level).add({
      owner: handle,
      box: () => boxAt(0, 0.2, W / 2, 0.4, p.y, p.y + H),
      enabled: () => !st.hidden && st.want === 0,
      reach: spec.reach ?? 3.5,
      hint: spec.hint !== false,
      onTap: () => handle.open(),
    });
  }
  if (level.view) {
    const root = new THREE.Group();
    root.name = 'schiebetuer';
    root.position.set(p.x, p.y, p.z);
    root.rotation.y = yaw + HALF_PI;   // lokal: Breite entlang X, Vorderseite +Z → Welt
    const leafRoots = [];
    let model = null;
    if (hasModel('schiebetuer')) {
      // Registry-Tür (Fläche Y-Z, Vorderseite +X, Flügel gleiten selbst nach state.open): in den Tür-Rahmen drehen,
      // ein Flügel gleitet beim Modell nach −Z = hier „rechts“ – für „links“ gespiegelt
      model = getModel('schiebetuer', { width: W, height: H, panels: slide === 'beide' ? 2 : 1 });
      const mg = new THREE.Group();
      mg.rotation.y = -HALF_PI;
      if (slide === 'links') mg.scale.z = -1;
      mg.add(model.root);
      root.add(mg);
    } else {
      for (const lf of leaves) {
        const m = new THREE.Mesh(leafGeo(lf.w, H, spec.style ?? 'papier', frameCol), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, emissive: 0x2a2010, emissiveIntensity: 0.25 }));
        m.castShadow = true; m.receiveShadow = true;
        const g = new THREE.Group(); g.add(m); root.add(g); leafRoots.push(g);
      }
    }
    if (spec.frame !== false && !model) {
      const fm = new THREE.Mesh(doorFrameGeo(W, H, frameCol), level.view.mats.world);
      fm.castShadow = true; fm.receiveShadow = true;
      root.add(fm);
    }
    if (spec.behind === 'wand') {
      const wm = new THREE.Mesh(fakeWallGeo(W, H, new Rnd(Math.floor(p.x * 9 + p.z * 5) >>> 0)), level.view.mats.world);
      wm.position.z = -0.5;
      root.add(wm);
    }
    const holder = {};
    addObject(level, root, (dt) => {
      const d = visDt(level, holder, dt);
      root.visible = !st.hidden;
      st.tapT = Math.max(0, (st.tapT ?? 0) - d * 2.5);
      if (model) { model.update?.(d, { open: st.k, hint: mode === 'tap' && st.want === 0 && !st.hidden, tap: st.tapT }); return; }
      leaves.forEach((lf, i) => {
        // root.rotation.y = yaw + π/2: lokal +X = Welt (ax, az) (Türbreite), lokal +Z = Vorderseite
        leafRoots[i].position.set(lf.c + lf.s * st.k * (lf.w - 0.12), 0, i % 2 ? 0.06 : 0);
      });
    });
  }
  return handle;
}

// ------------------------------------------------------------------ Gong

function gongGeo(size) {
  const parts = [], disc = [];
  const R = size / 2, H = size + 1.6;
  const red = 0xc8302a, gold = 0xffc83a, dark = 0x3a2418;
  // Rahmen: zwei Pfosten, Querbalken mit geschwungenen Enden, Fußbalken
  for (const s of [-1, 1]) {
    parts.push(box(0.24, H, 0.24, 0, H / 2, s * (R + 0.35), red, { r: 0.05 }));
    parts.push(box(0.6, 0.22, 0.5, 0, 0.11, s * (R + 0.35), dark, { r: 0.05 }));
    parts.push(flatColor(box(0.3, 0.12, 0.3, 0, H + 0.06, s * (R + 0.35), gold, { r: 0.04, seg: 1 }), gold));
  }
  parts.push(box(0.3, 0.26, size + 1.4, 0, H - 0.2, 0, red, { r: 0.06 }));
  const cap = new THREE.CylinderGeometry(0.1, 0.18, size + 1.8, 8); cap.rotateX(HALF_PI); cap.translate(0, H + 0.06, 0);
  parts.push(flatColor(cap, dark));
  // Scheibe (lokal: blickt +X), Mitte bei y = H − 0.4 − R; Seile
  const cy = H - 0.45 - R;
  const g = new THREE.CylinderGeometry(R, R * 0.96, 0.12, 36, 1);
  g.rotateZ(HALF_PI);
  const bronze = lin(0xd8a040), bronzeD = lin(0x8a5a1a), ring = lin(0xffe08a);
  disc.push(colorize(g.toNonIndexed(), (p, n, o) => {
    const r = Math.hypot(p.y, p.z) / R;
    mixc(bronzeD, bronze, smooth(0, 1, Math.abs(n.x)), o);
    if (Math.abs(r - 0.35) < 0.05 || Math.abs(r - 0.7) < 0.04 || r > 0.93) mixc(o, ring, 0.7, o);
  }));
  const boss = new THREE.SphereGeometry(R * 0.22, 14, 8, 0, Math.PI * 2, 0, HALF_PI); boss.rotateZ(-HALF_PI); boss.translate(0.06, 0, 0);
  disc.push(colorize(boss.toNonIndexed(), (p, n, o) => mixc(bronze, ring, smooth(0, 1, n.x), o)));
  for (const s of [-1, 1]) { const rope = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 4); rope.translate(0, R + 0.22, s * R * 0.5); disc.push(flatColor(rope, 0x6a4a2a)); }
  return { frame: merge(parts), disc: merge(disc), cy, H };
}

export function buildGong(level, spec) {
  const p = v3(spec.pos);
  const yaw = spec.yaw ?? -HALF_PI;
  const size = spec.size ?? 1.8, R = size / 2;
  const fx = Math.cos(yaw), fz = -Math.sin(yaw);
  const trig = new Set(spec.trigger ?? ['tap', 'pound', 'hit']);
  const rnd = new Rnd(Math.floor(p.x * 31 + p.z * 17) >>> 0);
  const st = { hits: 0, cool: 0, swing: 0, swingV: 0, glow: 0, hidden: !!spec.hidden, rain: [] };
  // Registry-Gong: fester Bau (Scheibe Ø 1,44 m, Mitte 1,39 m hoch, Pfosten bei ±1,05 m) – auf size skaliert
  const reg = !!level.view && hasModel('gong');
  const gk = size / 1.44;
  const H = reg ? 2.6 * gk : size + 1.6, cy = reg ? p.y + 1.39 * gk : p.y + H - 0.45 - R;
  const postZ = reg ? 1.05 * gk : R + 0.35;
  const center = { x: p.x, y: cy, z: p.z };
  const handle = {
    get hits() { return st.hits; },
    ring(via = 'tap') {
      if (st.hidden || st.cool > 0) return false;
      if (spec.once && st.hits > 0) return false;
      st.hits++; st.cool = spec.cooldown ?? 1.2;
      st.swingV += 2.4; st.glow = 1;
      level.sfx('gong'); level.sfx('bump');
      level.shake(0.2);
      level.effects?.ring({ x: p.x + fx * 0.3, y: cy, z: p.z + fz * 0.3 }, R + 0.6);
      level.effects?.sparks({ x: p.x + fx * 0.3, y: cy, z: p.z + fz * 0.3 }, 14);
      const n = spec.coins ?? 10;
      const rain = spec.rain ?? {};
      for (let i = 0; i < n; i++) {
        const a = rnd.real(0, Math.PI * 2), r = Math.sqrt(rnd.frac()) * (rain.r ?? 5);
        st.rain.push({ t: rnd.real(0, rain.time ?? 1.6), x: p.x + fx * 2.5 + Math.cos(a) * r, z: p.z + fz * 2.5 + Math.sin(a) * r, y: p.y + (rain.height ?? 9) });
      }
      runAction(level, spec.onHit, { pos: [p.x + fx * 2, p.y + 1, p.z + fz * 2], source: handle, via });
      if (spec.signal !== false) level.signal(spec.signal ?? 'gong', { pos: [p.x, cy, p.z], source: handle, via });
      return true;
    },
    // Treffer über die Kollisionsform (Angriffe, Würfe, Kopfstoß)
    onHit(kind) { if (trig.has('hit')) handle.ring(kind); },
    onBump() { if (trig.has('hit')) handle.ring('bump'); },
    onPound() { if (trig.has('pound')) handle.ring('pound'); },
    reveal() { if (!st.hidden) return; st.hidden = false; setSolid(true); level.sfx('powerup_appear'); },
    hide() { st.hidden = true; setSolid(false); },
    info: () => ({ hits: st.hits, cool: +st.cool.toFixed(2), raining: st.rain.length, swing: +st.swing.toFixed(2) }),
    center, pos: p,
  };
  // Kollision: Pfosten, Scheibe (dünner Quader, Treffer-Ziel), Stampf-Platte davor
  const side = { x: -fz, z: fx };
  const shapes = [];
  for (const s of [-1, 1]) {
    const x = p.x + side.x * s * postZ, z = p.z + side.z * s * postZ;
    shapes.push({ type: 'box', min: [x - 0.14, p.y, z - 0.14], max: [x + 0.14, p.y + H, z + 0.14], tag: 'gong:pfosten' });
  }
  const ex = Math.abs(side.x) * R + Math.abs(fx) * 0.12, ez = Math.abs(side.z) * R + Math.abs(fz) * 0.12;
  shapes.push({ type: 'box', min: [p.x - ex, cy - R, p.z - ez], max: [p.x + ex, cy + R, p.z + ez], tag: 'gong', owner: handle, camIgnore: true });
  if (spec.plate !== false && trig.has('pound')) {
    const px = p.x + fx * 1.8, pz = p.z + fz * 1.8;
    shapes.push({ type: 'box', min: [px - 1.2, p.y, pz - 1.2], max: [px + 1.2, p.y + 0.22, pz + 1.2], tag: 'gong:platte', owner: handle });
  }
  let ids = [];
  const setSolid = (on) => { for (const id of ids) level.world.remove(id); ids = on ? shapes.map((s) => level.world.add(s)) : []; };
  setSolid(!st.hidden);
  if (spec.id) level.named.set(spec.id, handle);
  w6(level).gongs.push(handle);
  if (trig.has('tap')) {
    tapTargets(level).add({
      owner: handle,
      box: () => ({ min: [p.x - ex - 0.2, cy - R, p.z - ez - 0.2], max: [p.x + ex + 0.2, cy + R, p.z + ez + 0.2] }),
      enabled: () => !st.hidden && st.cool <= 0 && !(spec.once && st.hits > 0),
      reach: spec.reach ?? 3.5,
      hint: spec.hint !== false,
      onTap: (via) => handle.ring(via),
    });
  }
  level.onStep((dt) => {
    if (st.cool > 0) st.cool -= dt;
    // Pendel der Scheibe
    st.swingV += (-28 * st.swing - 1.6 * st.swingV) * dt;
    st.swing += st.swingV * dt;
    st.glow = Math.max(0, st.glow - dt * 0.8);
    // Münzregen: fallende Münzen nacheinander
    for (let i = st.rain.length - 1; i >= 0; i--) {
      const r = st.rain[i];
      r.t -= dt;
      if (r.t > 0) continue;
      level.spawn('fallmuenze', { pos: [r.x, r.y, r.z], vel: [0, -2, 0], life: 8 });
      st.rain.splice(i, 1);
    }
  });
  if (level.view) {
    const root = new THREE.Group();
    root.name = 'gong';
    root.position.set(p.x, p.y, p.z);
    root.rotation.y = yaw;
    let model = null, discPivot = null, discMesh = null;
    if (reg) { model = getModel('gong', { size }); model.root.scale.setScalar(gk); root.add(model.root); }
    else {
      const g = gongGeo(size);
      const fm = new THREE.Mesh(g.frame, level.view.mats.world);
      fm.castShadow = true; fm.receiveShadow = true;
      root.add(fm);
      discPivot = new THREE.Group();
      discPivot.position.y = H - 0.45 + 0.25;
      discMesh = new THREE.Mesh(g.disc, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.6, emissive: 0xffa020, emissiveIntensity: 0 }));
      discMesh.position.y = -(0.25 + R);
      discMesh.castShadow = true;
      discPivot.add(discMesh);
      root.add(discPivot);
    }
    const holder = {};
    addObject(level, root, (dt) => {
      const d = visDt(level, holder, dt);
      root.visible = !st.hidden;
      if (discPivot) { discPivot.rotation.z = -st.swing * 0.25; discMesh.material.emissiveIntensity = st.glow * 0.8; }
      model?.update?.(d, { anim: st.glow > 0.02 ? 'ring' : 'idle', ring: Math.min(1, st.glow * 1.2) });
    });
  }
  return handle;
}

export const TYPES = { schiebetuer: buildSchiebetuer, gong: buildGong };
