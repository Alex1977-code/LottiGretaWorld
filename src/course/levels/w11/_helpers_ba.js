// Hilfen für die Remix-Level der Welt Blume B-1 „Funkentanz in der Kippfeld-Manege“, B-2 „Wasserwürfel im
// Glitzerschacht“, B-3 „Fackelnacht am Lila Nebelmoor“ und B-4 „Uhrenhatz durch die Werferburg“ (kein Level: exportiert
// kein LEVEL, die Level-Registry überspringt dieses Modul). Nur für diese vier Level – andere Remix-Level haben eigene
// Hilfsdateien; gemeinsame Dateien und die Basislevel werden nicht verändert. Alles Level-Lokale hängt sich über die
// eigenen Haken der Remix-Regeln an (build/setup, level.onStep, view.add).
//
//   B-1  wandSchalter (Schaltfelder an zwei Wänden eines Wandsprung-Schachts: Berühren im Sprung/Wandrutschen färbt um,
//        alle an → Aktion), kanonenSperre (goldener Gitterkäfig vor einer Glasrohr-Öffnung, öffnet auf das Signal open),
//        wurfbude (Zirkus-Wurfbude über dem Abgrund: der Stern liegt als Hauptgewinn drinnen; trifft der Wurfball oder die
//        Wurfsichel die Zielscheibe vorn, fliegt er hinüber auf den Sims)
//   B-2  hohlraum (Felsquader der Schachtdaten um Hohlräume beschneiden), kletterpfeiler (Felspfeiler mit Kletterranken:
//        nur mit dem Krallen-Anzug hinauf), schwebewuerfel (schwebende Wasserwürfel, die sanft auf und ab wippen)
//   B-3  moorfackeln (Fackeln in Gruppen: nur Feuerbälle der Funkenblüte zünden sie; alle einer Gruppe an → Aktion; alle
//        Fackeln des Levels als vier Instanz-Gruppen – Sockel, Flammen, Lichthof, Hinweis-Schimmer – und drei Punktlichter
//        bei den nächsten brennenden)
//   B-4  leuchtfleck (beleuchtete Bodenplatte unter einem Lichtkegel: Stampfattacke bricht sie auf → Aktion)
//
// Daten-Helfer (alle Level): stage (Zirkusbühne wie in 1-5), line, ring, arc.

import * as THREE from 'three';
import { lin, hex, addStatic, addObject } from '../../blocks/kit.js';
import { runAction, visDt } from '../../entities/gimmick.js';
import { getModel } from '../../models/index.js';
import { Bld, litTop, gradY } from '../w5/_helpers_b.js';

const TAU = Math.PI * 2;

// =====================================================================================================================
// Daten-Helfer
// =====================================================================================================================

/** Zirkusbühne (deco_w1b stage): Mitte x/z, Oberseite top, Größe w × d, Dicke o.h (Standard 1). */
export const stage = (x, top, z, w, d, o = {}) => ({ kind: 'stage', pos: [x, top - (o.h ?? 1), z], size: [w, o.h ?? 1, d], ...o });
/** Münzen in einer Reihe. */
export const line = (from, to, n) => ({ kind: 'coins', from, to, n });
/** Münzring um pos. */
export const ring = (pos, r, n) => ({ kind: 'coins', pos, r, n });
/** Münzbogen von a nach b mit Scheitel h über der Verbindungslinie. */
export function arc(a, b, n, h = 2) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    out.push({ kind: 'coin', pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * h * t * (1 - t), a[2] + (b[2] - a[2]) * t] });
  }
  return out;
}

const figuresOf = (level) => (level.players?.length ? level.players : [level.player]).filter((p) => p && !p.dead);

// =====================================================================================================================
// B-1: Wand-Schaltfelder
// =====================================================================================================================

/**
 * Schaltfelder an Wänden (Bauplan B-1 Stern 1 „Rätselbox hinter dem Start, 4 Wand-Schaltfelder“): blaue Felder (Modell
 * 'switch_tile', um 90° an die Wand gedreht). Berührt die Figur eines in der Luft oder beim Wandrutschen (Körper reicht
 * an die Feldfläche), färbt es sich golden (bleibt an); vom Boden aus sind die Felder zu hoch. Alle an → onAll (einmal).
 *   spec { id, tiles: [{ pos: [x, y, z] (Mitte der Feldfläche an der Wand), n: [nx, nz] (Wandnormale, zeigt in den Raum) }],
 *          size: 1.4, onAll, at: [x, y, z] (Ort der Aktion) }
 *   level.named.get(id) = { tiles [{ on }], count, done, info() }
 */
export function wandSchalter(level, spec) {
  const S = spec.size ?? 1.4;
  const tiles = spec.tiles.map((t) => ({ x: t.pos[0], y: t.pos[1], z: t.pos[2], nx: t.n[0], nz: t.n[1], on: false, model: null, flash: 0 }));
  const handle = {
    tiles, count: 0, done: false,
    info: () => ({ count: handle.count, of: tiles.length, done: handle.done, on: tiles.map((t) => (t.on ? 1 : 0)).join('') }),
  };
  if (spec.id) level.named.set(spec.id, handle);
  const touches = (p, t) => {
    // Körper-Quader der Figur gegen die Feldfläche (0,35 m tief in den Raum hinein, S × S)
    const hx = p.half.x, hz = p.half.z, c = p.pos.y + p.half.y;
    const ax = Math.abs(t.nx) > 0.5, d = 0.35;
    const lo = ax ? (t.nx > 0 ? t.x : t.x - d) : (t.nz > 0 ? t.z : t.z - d);
    const hi = lo + d;
    const q = ax ? p.pos.x : p.pos.z, h = ax ? hx : hz;
    if (q + h < lo || q - h > hi) return false;
    const side = ax ? Math.abs(p.pos.z - t.z) : Math.abs(p.pos.x - t.x);
    if (side > S / 2 + (ax ? hz : hx) - 0.1) return false;
    return Math.abs(c - t.y) < S / 2 + p.half.y - 0.15;
  };
  level.onStep(() => {
    if (handle.done) return;
    for (const p of figuresOf(level)) {
      if (p.mode === 'ground') continue;
      for (const t of tiles) {
        if (t.on || !touches(p, t)) continue;
        t.on = true; t.flash = 1;
        handle.count++;
        level.sfx('switch');
        level.effects?.sparks({ x: t.x + t.nx * 0.3, y: t.y, z: t.z + t.nz * 0.3 }, 8);
        if (handle.count === tiles.length) {
          handle.done = true;
          level.sfx('key');
          const at = spec.at ?? [t.x, t.y, t.z];
          runAction(level, spec.onAll, { pos: at, source: handle });
        }
      }
    }
  });
  if (!level.view) return handle;
  for (const t of tiles) {
    const m = getModel('switch_tile');
    const root = new THREE.Group();
    root.add(m.root);
    // Feld liegt flach (Oberseite +Y) → an die Wand: +Y zeigt in Richtung der Normalen
    if (Math.abs(t.nx) > 0.5) root.rotation.z = t.nx > 0 ? -Math.PI / 2 : Math.PI / 2;
    else root.rotation.x = t.nz > 0 ? Math.PI / 2 : -Math.PI / 2;
    root.scale.setScalar(S / 1.4);
    root.position.set(t.x, t.y, t.z);
    m.root.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    t.model = m;
    addObject(level, root, (dt) => { const d = visDt(level, t, dt); t.flash = Math.max(0, t.flash - d * 2); m.update?.(d, { anim: t.on ? 'on' : 'off' }); });
  }
  return handle;
}

// =====================================================================================================================
// B-1: Kanonen-Sperre
// =====================================================================================================================

/**
 * Goldener Gitterkäfig mit rotem Vorhängeschloss vor einer Glasrohr-Öffnung (Bauplan B-1 „bewegte Schaltfelder öffnen eine
 * Glasrohr-Kanone“): Vordergitter, zwei Seitengitter und Dach umschließen den Einstiegsbereich der Röhre (er reicht 1 m vor die
 * Öffnung), fest, bis das Signal open (bzw. hide) kommt – dann springt das Schloss auf, der Käfig fährt nach oben weg (0,7 s)
 * und die Öffnung ist frei.
 *   spec { id, pos: [x, y, z] (Mitte unten der Vorderseite), width: 2.6, height: 2.4, depth: 1.6 (Tiefe zur Öffnung hin, entlang
 *          dir), dir: [0, -1] (von der Vorderseite zur Öffnung; nur Achsen), thick: 0.2 }
 *   level.named.get(id) = { opened, open(), hide(), info() }  (Signal-Verben open/hide)
 */
export function kanonenSperre(level, spec) {
  const [x, y, z] = spec.pos, W = spec.width ?? 2.6, H = spec.height ?? 2.4, Dp = spec.depth ?? 1.6, T = spec.thick ?? 0.2;
  const dir = spec.dir ?? [0, -1];
  const alongZ = Math.abs(dir[1]) > 0.5;
  const sg = alongZ ? Math.sign(dir[1]) : Math.sign(dir[0]);
  // lokale Achsen: u quer (Breite), v entlang dir (Tiefe, von der Vorderseite zur Öffnung)
  const box = (u0, u1, v0, v1, y0, y1) => {
    const va = Math.min(v0 * sg, v1 * sg), vb = Math.max(v0 * sg, v1 * sg);
    return alongZ ? { min: [x + u0, y + y0, z + va], max: [x + u1, y + y1, z + vb] } : { min: [x + va, y + y0, z + u0], max: [x + vb, y + y1, z + u1] };
  };
  const parts = [
    box(-W / 2, W / 2, 0, T, 0, H),                 // Vordergitter
    box(-W / 2, -W / 2 + T, 0, Dp, 0, H),           // Seite
    box(W / 2 - T, W / 2, 0, Dp, 0, H),             // Seite
    box(-W / 2, W / 2, 0, Dp, H - T, H),            // Dach
  ];
  const st = { opened: false, k: 0 };
  let ids = parts.map((q) => level.world.add({ type: 'box', min: q.min, max: q.max, tag: 'kanonensperre', noWallSlide: true }));
  const open = () => {
    if (st.opened) return;
    st.opened = true;
    for (const id of ids) level.world.remove(id);
    ids = [];
    level.sfx('gate');
    level.sfx('key');
    level.effects?.sparks({ x, y: y + H * 0.6, z }, 22);
  };
  // Signal-Verben (runAction ruft o.open bzw. o.hide)
  const handle = { open, hide: open, get opened() { return st.opened; }, info: () => ({ open: st.opened, k: +st.k.toFixed(2) }) };
  if (spec.id) level.named.set(spec.id, handle);
  if (!level.view) return handle;
  // Gitter in lokalen Koordinaten (u = X, Tiefe v = −Z), danach auf dir gedreht
  const b = new Bld();
  const gold = litTop(0xffc21a), dark = litTop(0xb07a10);
  const bars = (u0, u1, v0, v1, n) => {
    for (let i = 0; i < n; i++) {
      const k = (i + 0.5) / n, u = u0 + (u1 - u0) * k, v = v0 + (v1 - v0) * k;
      b.cyl(0.05, 0.05, H, u, 0, -v, gold, 7);
      b.sphere(0.08, u, H, -v, gold);
    }
  };
  bars(-W / 2 + 0.1, W / 2 - 0.1, 0.1, 0.1, Math.max(5, Math.round(W / 0.32)));
  bars(-W / 2 + 0.1, -W / 2 + 0.1, 0.25, Dp - 0.05, 4);
  bars(W / 2 - 0.1, W / 2 - 0.1, 0.25, Dp - 0.05, 4);
  for (const yy of [0.1, H * 0.5, H - 0.1]) {
    b.box(W, 0.1, 0.1, 0, yy - 0.05, -0.1, dark, { r: 0.02 });
    for (const s of [-1, 1]) b.box(0.1, 0.1, Dp, s * (W / 2 - 0.1), yy - 0.05, -Dp / 2, dark, { r: 0.02 });
  }
  for (let i = 0; i < 4; i++) b.box(W, 0.06, 0.08, 0, H - 0.06, -0.2 - (i * (Dp - 0.3)) / 3, dark, { r: 0.02 });
  const cage = new THREE.Mesh(b.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.55 }));
  cage.castShadow = true;
  // Vorhängeschloss (rot mit goldenem Bügel) vorn in der Mitte
  const lk = new Bld();
  lk.box(0.5, 0.42, 0.18, 0, -0.21, 0, litTop(0xe8283a), { r: 0.06 });
  lk.torus(0.17, 0.045, 0, 0.02, 0, 0xffd23a, { rx: 0, ts: 14, arc: Math.PI });
  lk.sphere(0.05, 0, -0.12, 0.1, 0x2a1a10);
  const lock = new THREE.Mesh(lk.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.3 }));
  lock.position.set(0, H * 0.55, 0.12);
  const root = new THREE.Group();
  const inner = new THREE.Group();
  inner.add(cage, lock);
  // lokale −Z-Achse auf dir drehen
  inner.rotation.y = Math.atan2(-dir[0], -dir[1]);
  root.position.set(x, y, z);
  root.add(inner);
  addObject(level, root, (dt, t) => {
    const d = visDt(level, st, dt);
    if (st.opened) st.k = Math.min(1, st.k + d / 0.7);
    cage.position.y = st.k * st.k * (H + 0.6);
    lock.position.y = H * 0.55 - st.k * 3;
    lock.rotation.z = st.opened ? st.k * 2.5 : Math.sin(t * 2.2) * 0.06;
    lock.visible = st.k < 0.98;
    cage.visible = st.k < 0.999;
  });
  return handle;
}

// =====================================================================================================================
// B-1: Wurfbude
// =====================================================================================================================

/**
 * Zirkus-Wurfbude über dem Abgrund (Bauplan B-1 Stern 3 „rechts neben dem Sims am Ende per Ball oder Wurfsichel“): ein
 * geschlossenes Holzhäuschen mit gestreiftem Dach auf einem Mast; der grüne Stern liegt als Hauptgewinn drinnen (durch die
 * gläserne Seitenwand zur Kamera zu sehen, nicht erreichbar). Vorn (zur Figur) hängt eine große Zielscheibe (Entität
 * zielscheibe, by 'alles': Wurfball, Wurfsichel, Feuer – Berühren, Anspringen und Stampfen auf dem Dach zählen nicht).
 * Getroffen klappt die Scheibe um, die Klappe springt auf und der Stern fliegt im Bogen hinüber zu prizeTo (auf den Sims).
 *   spec { pos: [x, y, z] (Mitte der Bodenplatte innen, y = Oberseite der Bodenplatte), face: -1 (Front zeigt nach −X) | 1,
 *          size: [d (entlang X), h, w (entlang Z)] = [2.2, 2.6, 3], target: { y, size: 1.4 } (Mitte der Scheibe), prize: Index des
 *          Sterns (LEVEL.stars), prizeTo: [x, y, z] (Landeplatz), pole: y (Fuß des Masts), id }
 *   level.named.get(id) = { won, flying, info() }
 */
export function wurfbude(level, spec) {
  const [cx, y0, cz] = spec.pos;
  const [D, Hh, Wd] = spec.size ?? [2.2, 2.6, 3];
  const f = spec.face ?? -1;
  const fx = cx + f * D / 2;            // Frontebene
  const bx = cx - f * D / 2;            // Rückebene
  const xa = Math.min(fx, bx), xb = Math.max(fx, bx);
  const z0 = cz - Wd / 2, z1 = cz + Wd / 2;
  const T = 0.24, top = y0 + Hh;
  const W = level.world;
  const add = (mn, mx, o = {}) => W.add({ type: 'box', min: mn, max: mx, tag: 'wurfbude', ...o });
  add([xa - T, y0 - 0.3, z0 - T], [xb + T, y0, z1 + T]);                                   // Boden
  add([xa - T, top, z0 - T], [xb + T, top + 0.3, z1 + T]);                                 // Dach
  add([xa - T, y0, z0 - T], [xa, top, z1 + T]);                                            // Wand −X
  add([xb, y0, z0 - T], [xb + T, top, z1 + T]);                                            // Wand +X
  add([xa, y0, z0 - T], [xb, top, z0]);                                                    // Seite −Z
  add([xa, y0, z1], [xb, top, z1 + T], { camIgnore: true });                               // Seite +Z (Glas)
  const st = { won: false, flying: false, t: 0, from: null, to: spec.prizeTo, star: null, via: null };
  const handle = { get won() { return st.won; }, get flying() { return st.flying; }, info: () => ({ won: st.won, flying: st.flying, via: st.via }) };
  if (spec.id) level.named.set(spec.id, handle);
  // Zielscheibe vorn an der Bude (Mitte der Scheibe, blickt zur Figur)
  const tg = spec.target ?? {};
  const tSize = tg.size ?? 1.4;
  const win = (lv, ctx) => {
    if (st.won) return;
    st.won = true;
    st.via = ctx?.via ?? null;
    const s = lv.entities.find((e) => e.kind === 'star' && e.index === (spec.prize ?? 2) && e.alive && !e.removed);
    if (!s || !st.to) return;
    st.star = s; st.flying = true; st.t = 0;
    st.from = [s.pos.x, s.pos.y, s.pos.z];
    s.touch = false;
    lv.sfx('powerup_appear');
    lv.effects?.sparks({ x: s.pos.x, y: s.pos.y + 0.6, z: s.pos.z }, 20);
  };
  level.spawn('zielscheibe', { id: spec.id ? `${spec.id}_scheibe` : undefined, pos: [fx + f * (T + 0.16), tg.y ?? y0 + 0.95, cz], yaw: f < 0 ? Math.PI : 0, size: tSize, group: spec.id ?? 'wurfbude', by: 'alles', onAll: { fn: win } });
  level.onStep((dt) => {
    if (!st.flying) return;
    st.t = Math.min(1, st.t + dt / 0.9);
    const k = st.t, a = st.from, b = st.to;
    const h = 2.2 * 4 * k * (1 - k);
    st.star.pos.set(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k + h, a[2] + (b[2] - a[2]) * k);
    if (st.t >= 1) {
      st.flying = false;
      st.star.touch = true;
      level.effects?.sparks({ x: b[0], y: b[1] + 0.6, z: b[2] }, 16);
      level.sfx('land');
    }
  });
  if (!level.view) return handle;
  const b = new Bld();
  const wood = litTop(0xf4ead8), red = litTop(0xd0302a), gold = litTop(0xffc21a), blue = litTop(0x2a4fd0);
  const cxm = (xa + xb) / 2;
  // Bodenplatte, Wände (Holz, Rückwand blau), Front mit goldenem Rahmen
  b.box(xb - xa + 2 * T, 0.3, Wd + 2 * T, cxm, y0 - 0.3, cz, red, { r: 0.05 });
  b.box(T, Hh, Wd + 2 * T, f < 0 ? xb + T / 2 : xa - T / 2, y0, cz, blue, { r: 0.04 });
  b.box(T, Hh, Wd + 2 * T, f < 0 ? xa - T / 2 : xb + T / 2, y0, cz, wood, { r: 0.04 });
  b.box(xb - xa, Hh, T, cxm, y0, z0 - T / 2, wood, { r: 0.04 });
  for (const yy of [y0 + 0.02, top - 0.1]) b.box(T + 0.08, 0.1, Wd + 2 * T, fx + f * T * 0.5, yy, cz, gold, { r: 0.02 });
  // Prunkkissen für den Hauptgewinn
  b.box(1.0, 0.18, 1.0, cxm, y0, cz, litTop(0x8a2ad0), { r: 0.08 });
  // gestreiftes Dach mit Goldknauf, Wimpel
  const rn = 8;
  for (let i = 0; i < rn; i++) {
    const zz = z0 - T + ((Wd + 2 * T) * (i + 0.5)) / rn;
    b.box(xb - xa + 2 * T + 0.3, 0.32, (Wd + 2 * T) / rn, cxm, top + 0.3, zz, i % 2 ? wood : red, { r: 0.03 });
  }
  b.cone(0.5, 0.7, cxm, top + 0.62, cz, red, 10);
  b.sphere(0.13, cxm, top + 1.35, cz, gold);
  // Mast bis hinunter in die Manege (rot-weiß)
  const py = spec.pole ?? y0 - 12;
  const segs = Math.max(2, Math.round((y0 - 0.3 - py) / 1.2));
  for (let i = 0; i < segs; i++) {
    const h = (y0 - 0.3 - py) / segs;
    b.cyl(0.22, 0.22, h, cxm, py + i * h, cz, i % 2 ? wood : red, 10);
  }
  addStatic(level, b.geometry(), { castShadow: true });
  // Glasscheibe zur Kamera (durchsichtig, eigenes Objekt)
  const glass = new THREE.Mesh(new THREE.BoxGeometry(xb - xa, Hh - 0.1, 0.06), new THREE.MeshStandardMaterial({ color: 0xd8f4ff, transparent: true, opacity: 0.2, roughness: 0.05, metalness: 0.1, depthWrite: false }));
  glass.position.set(cxm, y0 + Hh / 2, z1 + T / 2);
  glass.renderOrder = 2;
  addObject(level, glass);
  return handle;
}

// =====================================================================================================================
// B-2: Hohlräume in Felsquadern (Schachtdaten)
// =====================================================================================================================

/**
 * Felsquader (Schachtdaten { min, max, skip, … }) um Hohlräume beschneiden: jeder Quader, der einen Hohlraum schneidet,
 * wird in bis zu sechs Teile zerlegt (unten, oben, −X, +X, −Z, +Z). Weggelassene Seiten (skip) behält ein Teil nur, wenn
 * seine Fläche noch auf der Außenfläche des alten Quaders liegt. holes: [{ min: [x, y, z], max: [x, y, z] }].
 */
export function hohlraum(rocks, holes) {
  let list = rocks.slice();
  for (const h of holes) {
    const out = [];
    for (const r of list) {
      const a = r.min, b = r.max;
      const hit = [0, 1, 2].every((i) => h.min[i] < b[i] - 1e-6 && h.max[i] > a[i] + 1e-6);
      if (!hit) { out.push(r); continue; }
      const lo = [0, 1, 2].map((i) => Math.max(a[i], h.min[i])), hi = [0, 1, 2].map((i) => Math.min(b[i], h.max[i]));
      const piece = (mn, mx) => {
        if ([0, 1, 2].some((i) => mx[i] - mn[i] < 1e-3)) return;
        const keep = (r.skip ?? []).filter((s) => {
          const ax = 'xyz'.indexOf(s[1]), hiSide = s[0] === '+';
          return hiSide ? Math.abs(mx[ax] - b[ax]) < 1e-6 : Math.abs(mn[ax] - a[ax]) < 1e-6;
        });
        out.push({ ...r, min: mn, max: mx, skip: keep });
      };
      piece([a[0], a[1], a[2]], [b[0], lo[1], b[2]]);                       // unten
      piece([a[0], hi[1], a[2]], [b[0], b[1], b[2]]);                       // oben
      piece([a[0], lo[1], a[2]], [lo[0], hi[1], b[2]]);                     // −X
      piece([hi[0], lo[1], a[2]], [b[0], hi[1], b[2]]);                     // +X
      piece([lo[0], lo[1], a[2]], [hi[0], hi[1], lo[2]]);                   // −Z
      piece([lo[0], lo[1], hi[2]], [hi[0], hi[1], b[2]]);                   // +Z
    }
    list = out;
  }
  return list;
}

// =====================================================================================================================
// B-2: Kletterpfeiler
// =====================================================================================================================

/**
 * Felspfeiler mit Kletterranken (Bauplan B-2 Stern 1 „Wand nahe dem Start (Krallen-Anzug)“): fester Quader; die Seite face
 * ist mit dem Krallen-Anzug kletterbar (climbable) und trägt grüne Ranken mit Blüten als Hinweis.
 *   spec { min: [x, y, z], max: [x, y, z], face: '-x' | '+x' | '-z' | '+z', colors? }
 */
export function kletterpfeiler(level, spec, felsGeo) {
  const { min, max } = spec;
  level.world.add({ type: 'box', min, max, climbable: true, tag: 'kletterpfeiler' });
  if (!level.view) return;
  addStatic(level, felsGeo(min[0], min[1], min[2], max[0], max[1], max[2], { seed: 17, cell: 1.0, vein: 0x7affc8 }));
  const b = new Bld();
  const green = litTop(0x3aa83a), leaf = litTop(0x6ad84a);
  for (const face of [].concat(spec.face ?? '-x')) {
  const ax = face[1] === 'x';
  const fv = face[0] === '+' ? (ax ? max[0] : max[2]) : (ax ? min[0] : min[2]);
  const out = face[0] === '+' ? 1 : -1;
  const a0 = ax ? min[2] : min[0], a1 = ax ? max[2] : max[0];
  const n = Math.max(2, Math.round((a1 - a0) / 0.55));
  for (let i = 0; i < n; i++) {
    const u = a0 + ((a1 - a0) * (i + 0.5)) / n;
    const h = max[1] - min[1];
    const px = ax ? fv + out * 0.06 : u, pz = ax ? u : fv + out * 0.06;
    b.cyl(0.05, 0.05, h, px, min[1], pz, green, 6);
    for (let k = 0; k < Math.floor(h / 0.7); k++) {
      const yy = min[1] + 0.4 + k * 0.7 + (i % 2) * 0.3;
      const ox = ax ? out * 0.1 : (k % 2 ? 0.14 : -0.14), oz = ax ? (k % 2 ? 0.14 : -0.14) : out * 0.1;
      b.sphere(0.13, px + ox, yy, pz + oz, leaf, { s: [1, 0.5, 1] });
      if ((k + i) % 3 === 0) b.sphere(0.07, px + ox * 1.6, yy + 0.08, pz + oz * 1.6, (k + i) % 2 ? 0xff7ac0 : 0xffd23a);
    }
  }
  }
  addStatic(level, b.geometry(), { castShadow: false });
}

// =====================================================================================================================
// B-2: schwebende Wasserwürfel
// =====================================================================================================================

/**
 * Schwebende Wasserwürfel (Bauplan B-2 „Kippplattformen ersetzt durch schwebende Wasserwürfel“): wie der Baustein
 * wasserkoerper (hineinspringen, darin schwimmen, oben herausspringen; wer unten oder seitlich hinausschwimmt, fällt), aber
 * sie wippen sanft auf und ab (bob m, period s, phase). Wasserform tag 'wasserkoerper', Registry-Modell 'wasserkoerper'.
 *   spec { id, list: [{ pos: [x, y, z] (Mitte der Unterseite in der Mittellage), size: [w, h, d], bob: 0.35, period: 3.6,
 *          phase: 0 }] }
 *   level.named.get(id) = { cubes [{ box, y }], inside(fig), info() }
 */
export function schwebewuerfel(level, spec) {
  const cubes = spec.list.map((q, i) => {
    const [x, y, z] = q.pos, [w, h, d] = q.size ?? [4, 4, 4];
    const box = { x0: x - w / 2, x1: x + w / 2, y0: y, y1: y + h, z0: z - d / 2, z1: z + d / 2 };
    const shape = { type: 'box', min: [box.x0, box.y0, box.z0], max: [box.x1, box.y1, box.z1], water: true, solid: false, camIgnore: true, tag: 'wasserkoerper', waterId: `${spec.id ?? 'schwebe'}${i}#w` };
    const sid = level.world.add(shape);
    return { i, x, y, z, w, h, d, box, shape, sid, bob: q.bob ?? 0.35, period: q.period ?? 3.6, phase: q.phase ?? i * 0.37, off: 0, model: null, root: null, wob: 0, was: false };
  });
  const inside = (f, c) => { const b = c.box, m = f.pos.y + f.half.y; return f.pos.x > b.x0 && f.pos.x < b.x1 && f.pos.z > b.z0 && f.pos.z < b.z1 && m > b.y0 && m < b.y1; };
  const handle = {
    cubes,
    inside: (f) => cubes.some((c) => inside(f, c)),
    info: () => ({ cubes: cubes.length, y: cubes.map((c) => +(c.y + c.off).toFixed(2)), inside: figuresOf(level).some((f) => handle.inside(f)) }),
  };
  if (spec.id) level.named.set(spec.id, handle);
  level.onStep((dt, t) => {
    const time = t ?? level.time;
    for (const c of cubes) {
      const off = Math.sin(((time / c.period) + c.phase) * TAU) * c.bob;
      const dy = off - c.off;
      c.off = off;
      c.box.y0 = c.y + off; c.box.y1 = c.y + c.h + off;
      c.shape.min[1] = c.box.y0; c.shape.max[1] = c.box.y1;
      level.world.update(c.sid);
      // schwimmende Figuren wippen mit
      if (dy) for (const f of figuresOf(level)) if (f.mode === 'swim' && inside(f, c)) f.pos.y += dy;
    }
  });
  if (!level.view) return handle;
  for (const c of cubes) {
    const root = new THREE.Group();
    root.position.set(c.x, c.y, c.z);
    c.model = getModel('wasserkoerper', { size: [c.w, c.h, c.d] });
    root.add(c.model.root);
    c.root = root;
    addObject(level, root, (dt) => {
      const d = visDt(level, c, dt);
      root.position.y = c.y + c.off;
      const now = figuresOf(level).some((f) => inside(f, c));
      if (now !== c.was) c.wob = 1;
      c.was = now;
      c.wob = Math.max(now ? 0.25 : 0, c.wob - d * 1.6);
      c.model.update?.(d, { wobble: c.wob });
    });
  }
  return handle;
}

// =====================================================================================================================
// B-3: Moorfackeln
// =====================================================================================================================

/**
 * Fackeln in Gruppen (Bauplan B-3 „23 Fackeln (8/12/3) in drei Bereichen mit der Funkenblüte anzünden = Sterne“): Holzpfahl
 * mit Eisenkorb auf einem Steinsockel. Nur ein Feuerball der Funkenblüte zündet sie – er prallt an den Pfahl (fester Körper
 * mit owner = Fackel → onHit('fire')); Anspringen, Tatze, Stampfen zünden nicht. Einmal an, brennt sie für immer (auch nach
 * einem Neustart am Kontrollpunkt). Sind alle Fackeln einer Gruppe an, läuft deren Aktion (einmal). Zündet eine Fackel,
 * leuchtet ein Laternenlicht (view.addLantern, wo das Thema Laternen hat) über ihr.
 * Darstellung: alle Fackeln als vier Instanz-Gruppen (Sockel/Pfahl/Korb, Flammen, warmer Lichthof, kalter Hinweis-Schimmer
 * über den unangezündeten) – 4 Zeichenaufrufe (+ 1 im Schattenpass) für das ganze Level; dazu o.lights (3) Punktlichter, die
 * den nächsten brennenden Fackeln am Kameraziel folgen (einmal angelegt, nur Lage/Stärke ändern sich).
 *   groups: { name: { list: [[x, y, z] …] (Fußpunkt), onAll: Aktion, at?: [x, y, z] } },
 *   o { id: 'fackeln', h: 1.3, lights: 3, lightColor, lightDist: 9, lightPower: 14 }
 *   level.named.get(id) = { torches [{ x, y, z, group, lit, hits }], groups { name: { lit, of, done } }, light(i), info() }
 */
export function moorfackeln(level, groups, o = {}) {
  const H = o.h ?? 1.3;
  const torches = [];
  const G = {};
  for (const [name, g] of Object.entries(groups)) {
    G[name] = { lit: 0, of: g.list.length, done: false, onAll: g.onAll, at: g.at ?? null };
    for (const p of g.list) torches.push({ i: torches.length, x: p[0], y: p[1], z: p[2], group: name, lit: false, hits: 0 });
  }
  const handle = {
    torches, groups: G,
    light: (i) => lightUp(torches[i]),
    info: () => ({ lit: torches.filter((t) => t.lit).length, of: torches.length, groups: Object.fromEntries(Object.entries(G).map(([k, v]) => [k, `${v.lit}/${v.of}${v.done ? '✓' : ''}`])) }),
  };
  level.named.set(o.id ?? 'fackeln', handle);
  const lightUp = (t) => {
    if (t.lit) return false;
    t.lit = true;
    t.litT = level.time;
    level.sfx('burn');
    level.effects?.sparks({ x: t.x, y: t.y + H + 0.5, z: t.z }, 16);
    level.view?.addLantern?.(t.x, t.y + H + 0.9, t.z);
    const g = G[t.group];
    g.lit++;
    if (g.lit === g.of && !g.done) {
      g.done = true;
      level.sfx('key');
      runAction(level, g.onAll, { pos: g.at ?? [t.x, t.y + 1, t.z], source: handle });
    }
    return true;
  };
  for (const t of torches) {
    const owner = { kind: 'moorfackel', onHit(kind) { if (kind === 'fire') { t.hits++; lightUp(t); } } };
    level.world.add({ type: 'box', min: [t.x - 0.34, t.y, t.z - 0.34], max: [t.x + 0.34, t.y + 0.45, t.z + 0.34], owner, tag: 'fackel-sockel' });
    level.world.add({ type: 'box', min: [t.x - 0.16, t.y + 0.45, t.z - 0.16], max: [t.x + 0.16, t.y + H, t.z + 0.16], owner, tag: 'fackel' });
  }
  if (!level.view || !torches.length) return handle;
  // ---- Sockel, Pfahl, Korb (eine Geometrie, Instanzen)
  const b = new Bld();
  b.cyl(0.36, 0.42, 0.45, 0, 0, 0, litTop(0x6a6478), 9);
  b.cyl(0.4, 0.4, 0.06, 0, 0.42, 0, litTop(0x8a849a), 9);
  b.cyl(0.11, 0.13, H - 0.45, 0, 0.45, 0, gradY(0x4a2e1a, 0x8a5a30, 0.45, H), 7);
  b.cyl(0.3, 0.16, 0.34, 0, H - 0.08, 0, litTop(0x3a3440), 9, { open: true });
  b.torus(0.3, 0.035, 0, H + 0.26, 0, 0x5a5466, { rx: Math.PI / 2, ts: 10, rs: 4 });
  for (let i = 0; i < 4; i++) { const a = i * TAU / 4; b.box(0.04, 0.34, 0.04, Math.cos(a) * 0.24, H - 0.08, Math.sin(a) * 0.24, 0x2a2430, { r: 0 }); }
  for (let i = 0; i < 3; i++) { const a = i * 2.1; b.sphere(0.1, Math.cos(a) * 0.1, H + 0.16, Math.sin(a) * 0.1, 0x2a2026, { s: [1, 0.6, 1], ws: 6, hs: 4 }); }
  const bodyGeo = b.geometry();
  const bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
  const body = new THREE.InstancedMesh(bodyGeo, bodyMat, torches.length);
  body.castShadow = true; body.receiveShadow = true;
  body.name = 'moorfackeln';
  // ---- Flammen (additiv, Instanzen; unangezündet Maßstab 0)
  const fb = new Bld();
  fb.cone(0.3, 1.0, 0, 0, 0, 0xd8501a, 8);
  fb.cone(0.2, 0.75, 0, 0, 0, 0xe8a030, 8);
  fb.cone(0.1, 0.48, 0, 0, 0, 0xf8e8a8, 8);
  const flame = new THREE.InstancedMesh(fb.geometry(), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.92, depthWrite: false, blending: THREE.AdditiveBlending }), torches.length);
  flame.name = 'moorfackeln-flamme';
  // ---- kalter Schimmer (Hinweis: hier gehört Feuer hinein)
  const hint = new THREE.InstancedMesh(new THREE.TorusGeometry(0.36, 0.045, 4, 14), new THREE.MeshBasicMaterial({ color: 0x8ad0ff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }), torches.length);
  hint.name = 'moorfackeln-hinweis';
  // ---- warmer Lichthof um brennende Fackeln (additiv, Instanzen) und wenige Punktlichter bei den nächsten brennenden
  const glow = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff8a30, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending }), torches.length);
  glow.name = 'moorfackeln-schein';
  const lights = [];
  for (let i = 0; i < (o.lights ?? 3); i++) {
    const pl = new THREE.PointLight(o.lightColor ?? 0xffa050, 0, o.lightDist ?? 9, 2);
    lights.push(pl);
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
  for (const t of torches) { m4.makeTranslation(t.x, t.y, t.z); body.setMatrixAt(t.i, m4); }
  body.instanceMatrix.needsUpdate = true;
  // Hüllkugeln für das Frustum-Culling (alle Fackeln)
  let mx = Infinity, Mx = -Infinity, my = Infinity, My = -Infinity, mz = Infinity, Mz = -Infinity;
  for (const t of torches) { mx = Math.min(mx, t.x); Mx = Math.max(Mx, t.x); my = Math.min(my, t.y); My = Math.max(My, t.y + H + 1.4); mz = Math.min(mz, t.z); Mz = Math.max(Mz, t.z); }
  const sph = new THREE.Sphere(new THREE.Vector3((mx + Mx) / 2, (my + My) / 2, (mz + Mz) / 2), Math.hypot(Mx - mx, My - my, Mz - mz) / 2 + 2);
  for (const m of [body, flame, hint, glow]) { m.boundingSphere = sph.clone(); m.frustumCulled = true; }
  bodyGeo.boundingSphere = sph.clone();
  const root = new THREE.Group();
  root.add(body, flame, hint, glow, ...lights);
  const holder = {};
  const tgt = new THREE.Vector3();
  addObject(level, root, (dt, time) => {
    visDt(level, holder, dt);
    // Punktlichter: die nächsten brennenden Fackeln am Kameraziel (bzw. der Figur)
    const fp = level.view?.rig?.target ?? level.player?.pos;
    if (fp) tgt.set(fp.x, fp.y, fp.z);
    const near = torches.filter((t) => t.lit).sort((a, b) => ((a.x - tgt.x) ** 2 + (a.z - tgt.z) ** 2) - ((b.x - tgt.x) ** 2 + (b.z - tgt.z) ** 2));
    lights.forEach((pl, k) => {
      const t = near[k];
      if (!t || Math.hypot(t.x - tgt.x, t.z - tgt.z) > 30) { pl.intensity = 0; return; }
      const grow = Math.min(1, (level.time - (t.litT ?? 0)) / 0.35);
      pl.position.set(t.x, t.y + H + 0.6, t.z);
      pl.intensity = (o.lightPower ?? 14) * grow * (1 + 0.08 * Math.sin(time * 11 + t.i));
    });
    for (const t of torches) {
      if (t.lit) {
        const k = 1 + 0.13 * Math.sin(time * 13 + t.x * 3) + 0.06 * Math.sin(time * 23 + t.z);
        const grow = Math.min(1, (level.time - (t.litT ?? 0)) / 0.35);
        s.set(grow / Math.sqrt(k), grow * k, grow / Math.sqrt(k));
        e.set(0, time * 1.7 + t.i, 0); q.setFromEuler(e);
        p.set(t.x, t.y + H + 0.18, t.z);
        m4.compose(p, q, s);
        flame.setMatrixAt(t.i, m4);
        const gs = grow * (1.15 + 0.06 * Math.sin(time * 9 + t.i));
        q.identity(); s.set(gs, gs, gs); p.set(t.x, t.y + H + 0.5, t.z);
        m4.compose(p, q, s); glow.setMatrixAt(t.i, m4);
        m4.makeScale(0, 0, 0); hint.setMatrixAt(t.i, m4);
      } else {
        m4.makeScale(0, 0, 0); flame.setMatrixAt(t.i, m4); glow.setMatrixAt(t.i, m4);
        const a = 0.85 + 0.15 * Math.sin(time * 3 + t.z);
        e.set(Math.PI / 2, 0, 0); q.setFromEuler(e); s.set(a, a, a); p.set(t.x, t.y + H + 0.34, t.z);
        m4.compose(p, q, s); hint.setMatrixAt(t.i, m4);
      }
    }
    flame.instanceMatrix.needsUpdate = true;
    hint.instanceMatrix.needsUpdate = true;
    glow.instanceMatrix.needsUpdate = true;
  });
  return handle;
}

// =====================================================================================================================
// B-4: beleuchtete Bodenstelle
// =====================================================================================================================

/**
 * Beleuchtete Bodenstelle (Bauplan B-4 „beleuchtete Bodenstelle nach den Lava-Glasröhren, per Stampfen öffnen“): eine runde,
 * rissige Bodenplatte (0,12 m hoch) unter einem Lichtkegel von einer Laterne darüber; eine Stampfattacke darauf bricht sie
 * auf (Splitter, Staub, die Laterne flackert hell) → Aktion onOpen (z. B. ein Stern steigt aus dem Spalt). Darauflaufen,
 * Springen und Feuer tun nichts.
 *   spec { id, pos: [x, y, z] (Mitte, y = Boden), r: 0.9, lamp: [x, y, z] (Laterne), color: 0xfff0b8, onOpen }
 *   level.named.get(id) = { open (bool), pounds, info() }
 */
export function leuchtfleck(level, spec) {
  const [x, y, z] = spec.pos, R = spec.r ?? 0.9;
  const st = { opened: false, pounds: 0, k: 0 };
  const owner = {
    kind: 'leuchtfleck',
    onPound() {
      st.pounds++;
      if (st.opened) return;
      st.opened = true;
      level.world.remove(sid);
      level.sfx('brickbreak');
      level.sfx('powerup_appear');
      level.shake?.(0.2);
      level.effects?.debris?.({ x, y: y + 0.2, z }, 0x8a90a8, 12);
      level.effects?.sparks({ x, y: y + 0.6, z }, 24);
      runAction(level, spec.onOpen, { pos: [x, y + 0.2, z], source: handle });
    },
  };
  const sid = level.world.add({ type: 'box', min: [x - R * 0.8, y, z - R * 0.8], max: [x + R * 0.8, y + 0.12, z + R * 0.8], owner, tag: 'leuchtfleck' });
  const handle = { get open() { return st.opened; }, get pounds() { return st.pounds; }, info: () => ({ open: st.opened, pounds: st.pounds }) };
  if (spec.id) level.named.set(spec.id, handle);
  if (!level.view) return handle;
  const col = spec.color ?? 0xfff0b8;
  // Platte: heller Steinkreis mit Rissen (eigenes Objekt – verschwindet beim Öffnen), darunter der dunkle Spalt (statisch)
  const pb = new Bld();
  pb.cyl(R, R, 0.12, 0, 0, 0, litTop(0xb8b4c8), 22);
  for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + 0.3; pb.box(0.05, 0.02, R * 0.9, Math.cos(a) * R * 0.45, 0.12, Math.sin(a) * R * 0.45, 0x4a4660, { yaw: -a + Math.PI / 2, r: 0 }); }
  pb.cyl(0.18, 0.18, 0.03, 0, 0.12, 0, 0xfff4c8, 12);
  const plate = new THREE.Mesh(pb.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, emissive: new THREE.Color(col), emissiveIntensity: 0.25 }));
  plate.position.set(x, y, z);
  plate.receiveShadow = true;
  const sb = new Bld();
  sb.cyl(R * 0.9, R * 0.9, 0.02, x, y + 0.005, z, 0x161222, 18);
  addStatic(level, sb.geometry(), { castShadow: false });
  // Lichtkegel (additiv) von der Laterne zum Boden und Lichtfleck
  const lamp = spec.lamp ?? [x, y + 7, z];
  const dx = lamp[0] - x, dy = lamp[1] - y, dz = lamp[2] - z, L = Math.hypot(dx, dy, dz);
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.18, R * 1.15, L, 20, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  cone.position.set((lamp[0] + x) / 2, (lamp[1] + y) / 2, (lamp[2] + z) / 2);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz).normalize());
  const spot = new THREE.Mesh(new THREE.CircleGeometry(R * 1.25, 24), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
  spot.rotation.x = -Math.PI / 2;
  spot.position.set(x, y + 0.14, z);
  // Laterne (Kasten mit Leuchtglas)
  const lb = new Bld();
  lb.box(0.5, 0.6, 0.5, 0, -0.3, 0, litTop(0x3a3448), { r: 0.05 });
  lb.cone(0.42, 0.34, 0, 0.3, 0, 0x2a2436, 4);
  const lampBody = new THREE.Mesh(lb.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }));
  const lampGlow = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshBasicMaterial({ color: col }));
  lampGlow.position.y = -0.3;
  const lampG = new THREE.Group();
  lampG.add(lampBody, lampGlow);
  lampG.position.set(lamp[0], lamp[1], lamp[2]);
  const root = new THREE.Group();
  root.add(plate, cone, spot, lampG);
  const holder = {};
  addObject(level, root, (dt, t) => {
    const d = visDt(level, holder, dt);
    if (st.opened) st.k = Math.min(1, st.k + d / 0.5);
    plate.visible = !st.opened;
    const fl = st.opened ? 0.6 * (1 - st.k) + 0.25 : 1;
    cone.material.opacity = 0.16 * fl * (0.9 + 0.1 * Math.sin(t * 5));
    spot.material.opacity = 0.35 * fl;
  });
  return handle;
}

export { TAU, lin, hex };
