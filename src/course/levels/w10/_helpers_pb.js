// Hilfen für die Remix-Level der Welt Pilz P-5 „Werfertrubel im Sonnensaal“ (Basis 6-3), P-6 „Riesenwracks im Morgenwind“
// (Basis 6-2), P-7 „Sinkschollen über dem Blauglutsee“ (Basis 7-4) und das Kampf-Haus P-Haus „Haus Zehnkampf“ (kein Level:
// exportiert kein LEVEL, die Level-Registry überspringt dieses Modul). Gemeinsame Dateien und die Basislevel werden nicht
// verändert; alles Level-Lokale hängt sich über die Remix-Haken (`build`/`setup`, Präzisierung „Motor und Bausteine
// Bonuswelten“: eigene Haken laufen nach denen der Basis) bzw. `LEVEL.build`/`LEVEL.setup` sowie `level.onStep` /
// `view.onFrame` an.
//
//   P-5  pfropfen       Stachelkugel verstopft eine Glasröhre: Wurfball/Feuer (an Kugel oder Riegel) sprengt sie heraus
//        werferStockwerk  Werfer im Saal zielen nur auf Figuren auf ihrem Stockwerk
//        sternBalkon    Geländer, Goldleiste und Blumenkästen des Sternbalkons (Optik)
//   P-6  wrackheck      schräg gehobenes Wrackheck auf einer Sandbank (begehbare Planken, darunter Platz für Münzen)
//        deckPlanken    Längsplanken auf großen Kippschiffen (hängt an der Schiffsdarstellung, kippt mit)
//   P-7  sinkschollen   zerbrochene Steinschollen über der blauen Lava: steht eine Figur darauf, sinken sie (zuerst
//                       zittern, dann gleichmäßig) bis unter die Lava; ohne Last steigen sie wieder auf. Kollision mit
//                       mover (die Figur fährt mit), Darstellung als zwei Instanz-Gruppen (Stein + Glutrisse).
//        geheimPlatte   unsichtbare Plattform (fest, aber nicht gezeichnet), die beim ersten Betreten sichtbar wird
//                       (Glimmern, Glaskante) – nur im Gleitflug erreichbar.
//   P-Haus kraftKapsel  Werkzeug je Kampf-Raum (Power-up oder Helm beim Raumstart, Nachschub nach Verlust), Sockel-Optik
//
// Alles Statische ist verschmolzen (Bld → Abschnitts-Meshes); Bewegtes zeichnet je Gruppe in wenigen Aufrufen.

import * as THREE from 'three';
import { addObject } from '../../blocks/kit.js';
import { playerOn, visDt } from '../../entities/gimmick.js';
import { Bld, litTop, isl, line, ring, arc } from '../w5/_helpers_b.js';
import { glowPoints } from '../w4/_helpers_d.js';

export { Bld, litTop, isl, line, ring, arc };

const TAU = Math.PI * 2;

// =====================================================================================================================
// P-5: Sonnensaal (Werfer im Saal, verstopfte Glasröhre, Sternbalkon)
// =====================================================================================================================

/**
 * Verstopfte Glasröhre (P-5 Geheimnis „Glasröhre im 3. Stock durch Stachelkugel verstopft (Ball oder Funkenblüte)“): die
 * Stachelkugel mit Daten-Id `id` steckt in der Röhrenmündung; ein Riegel (unsichtbarer Quader `block` vor der Öffnung)
 * hält die Figur fern. Wurfball ('throw') oder Feuerball ('fire') – an der Kugel oder am Riegel –, auch Funkelstern,
 * Riesentrank, Explosion sprengen sie heraus: sie zerplatzt, der Riegel verschwindet, Signal 'pfropfen' { id, by }. Andere
 * Angriffe prallen wie gewohnt ab. o: { block: { min, max }, by: [...], name } → level.named.get(name ?? `${id}:pfropfen`) =
 * { popped, by, info() }.
 */
export function pfropfen(level, id, o = {}) {
  const by = new Set(o.by ?? ['throw', 'fire', 'star', 'mega', 'bomb']);
  let e = null, bid = null;
  const st = { popped: false, by: null };
  const pop = (kind) => {
    if (st.popped) return;
    st.popped = true; st.by = kind;
    if (bid !== null && bid >= 0) level.world.remove(bid);
    const c = e?.center?.() ?? { x: o.block.min[0], y: o.block.min[1] + 1, z: (o.block.min[2] + o.block.max[2]) / 2 };
    level.sfx('brickbreak');
    level.sfx('pipe');
    level.effects?.debris(c, 0x9aa0b0, 12);
    level.effects?.sparks(c, 16);
    if (e && !e.removed) e.kill();
    level.signal?.('pfropfen', { id, by: kind });
  };
  // Riegel: Würfe/Feuer, die ihn treffen, sprengen die Kugel ebenfalls (Wurfball und Feuerball melden Wandtreffer an owner.onHit)
  const owner = { onHit: (kind) => { if (by.has(kind)) pop(kind); } };
  if (o.block) bid = level.world.add({ type: 'box', min: o.block.min, max: o.block.max, camIgnore: true, noWallSlide: true, owner, tag: 'pfropfen' });
  const hook = () => {
    if (e || st.popped) return;
    e = level.entities.find((x) => x.spec?.id === id && !x.removed) ?? null;
    if (!e) return;
    const orig = e.onHit.bind(e);
    e.onHit = (kind, src) => { if (st.popped) return; if (by.has(kind)) pop(kind); else orig(kind, src); };
  };
  hook();
  level.onStep(hook);
  st.info = () => ({ popped: st.popped, by: st.by, found: !!e });
  level.named.set(o.name ?? `${id}:pfropfen`, st);
  return st;
}

/**
 * Werfer im Saal sehen nur ihr eigenes Stockwerk, damit Hammer und Bumerang nicht durch die Decken auf die Figur im Stockwerk
 * darunter fliegen: ein Werfer zielt nur, wenn die Figur zuletzt auf seinem Stockwerk stand (floors: Bodenhöhen, aufsteigend;
 * Stockwerk = höchster Boden ≤ y + 0,5). kinds: Arten der Werfer. Wirkt auch auf später erscheinende Werfer.
 */
export function werferStockwerk(level, kinds, floors) {
  const set = new Set(kinds), done = new WeakSet();
  const floorOf = (y) => { let k = -1; floors.forEach((f, i) => { if (y >= f - 0.5) k = i; }); return k; };
  let figFloor = -1;
  const apply = () => {
    for (const e of level.entities) {
      if (!set.has(e.kind) || done.has(e) || typeof e.canSee !== 'function') continue;
      done.add(e);
      const own = floorOf(e.spec?.pos?.[1] ?? e.pos.y);
      const orig = e.canSee.bind(e);
      e.canSee = (range, h) => own === figFloor && orig(range, h);
    }
  };
  apply();
  let t = 0;
  level.onStep((d) => {
    const p = level.player;
    if (p && p.mode === 'ground' && !p.dead) figFloor = floorOf(p.pos.y);
    t += d; if (t > 0.5) { t = 0; apply(); }
  });
}

/** Sternbalkon außen am Saal (P-5 Stern 0): rotes Geländer an drei Seiten, Laternen, Blumenkästen (nur Optik, verschmolzen). */
export function sternBalkon(level, o) {
  if (!level.view) return;
  const { x0, x1, zA, zB, y } = o;
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  const b = new Bld();
  const rail = litTop(0xd8443a, 0.7), gold = 0xffc84a;
  const side = (ax, az, bx, bz) => {
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.round(len / 1.1));
    for (let i = 0; i <= n; i++) { const t = i / n; b.box(0.12, 0.95, 0.12, ax + (bx - ax) * t, y, az + (bz - az) * t, rail, { r: 0.02 }); }
    const yaw = Math.atan2(-(bz - az), bx - ax);
    b.box(len + 0.12, 0.12, 0.16, (ax + bx) / 2, y + 0.86, (az + bz) / 2, gold, { yaw, r: 0.03 });
  };
  for (const s of o.sides ?? ['l', 'f', 'b']) {
    if (s === 'l') side(x0, z0, x0, z1);
    if (s === 'r') side(x1, z0, x1, z1);
    if (s === 'f') side(x0, z0, x1, z0);
    if (s === 'b') side(x0, z1, x1, z1);
  }
  b.box(x1 - x0 - 0.3, 0.05, z0 - z1 - 0.3, (x0 + x1) / 2, y, (z0 + z1) / 2, litTop(0xc8323a, 0.85), { r: 0 });   // Läufer
  for (const [x, z] of o.boxes ?? []) {
    b.box(1.1, 0.4, 0.45, x, y, z, litTop(0x8a5a3a, 0.7), { r: 0.04 });
    for (let k = 0; k < 4; k++) b.sphere(0.13, x - 0.4 + k * 0.27, y + 0.48, z, [0xff7ac0, 0xffd23d, 0xffffff, 0xff9a3a][k]);
  }
  b.flush(level, { castShadow: false });
}

// =====================================================================================================================
// P-6: Riesenwracks (gehobenes Wrackheck mit Münzen darunter)
// =====================================================================================================================

/**
 * Gehobenes Ende eines Wracks (P-6 Geheimnis „Münzen unter dem gehobenen Ende von Wrack 1“): ein schräg aus der Sandbank
 * ragendes Heckdeck (x0..x1, von zLow mit Höhe yLow bis zHigh mit Höhe yHigh) auf Spanten. Kollision: dünne, ansteigende
 * Deckstreifen (begehbar wie eine flache Treppe) – unter dem hohen Ende bleibt Platz (dort liegen die Münzen der Daten).
 * o: { x0, x1, zLow, zHigh, yLow, yHigh, n: 8 }.
 */
export function wrackheck(level, o) {
  const { x0, x1, zLow, zHigh, yLow, yHigh } = o;
  const n = o.n ?? 8, th = 0.28;
  for (let i = 0; i < n; i++) {
    const za = zLow + ((zHigh - zLow) * i) / n, zb = zLow + ((zHigh - zLow) * (i + 1)) / n;
    const top = yLow + ((yHigh - yLow) * (i + 0.5)) / n;
    level.world.add({ type: 'box', min: [x0, top - th, Math.min(za, zb)], max: [x1, top, Math.max(za, zb)], tag: 'wrackheck' });
  }
  if (!level.view) return;
  const b = new Bld();
  const len = Math.abs(zHigh - zLow), rise = yHigh - yLow, ang = Math.atan2(rise, len);
  const dirZ = Math.sign(zHigh - zLow);
  const cz = (zLow + zHigh) / 2, cy = (yLow + yHigh) / 2;
  const planks = Math.max(3, Math.round((x1 - x0) / 0.45));
  for (let k = 0; k < planks; k++) {
    const x = x0 + ((x1 - x0) * (k + 0.5)) / planks;
    const c = k % 3 === 0 ? 0x6a5640 : k % 3 === 1 ? 0x7c6448 : 0x5e4c38;
    b.box((x1 - x0) / planks - 0.04, th, Math.hypot(len, rise), x, cy - th, cz, litTop(c, 0.6), { rx: -dirZ * ang, r: 0.02 });
  }
  // Spanten (Rippen) unter dem hohen Ende und ein zerbrochener Heckspiegel
  for (let k = 0; k < 4; k++) {
    const t = 0.45 + k * 0.17, z = zLow + (zHigh - zLow) * t, y = yLow + rise * t;
    for (const x of [x0 + 0.15, x1 - 0.15]) b.box(0.22, y - yLow + 0.4, 0.22, x, yLow - 0.4, z, litTop(0x4a3a2a, 0.6), { r: 0.03 });
  }
  b.box(x1 - x0 + 0.3, 1.1, 0.25, (x0 + x1) / 2, yHigh - 0.2, zHigh + dirZ * 0.1, litTop(0x5a4632, 0.6), { r: 0.05 });
  b.box(0.18, 1.6, 0.18, x0 + 0.3, yHigh + 0.3, zHigh + dirZ * 0.15, 0x3a2a1e, { r: 0.03 });
  b.flush(level);
}

// =====================================================================================================================
// P-7: sinkende Schollen über der blauen Lava
// =====================================================================================================================

/** Geometrie einer zerbrochenen Scholle (Ursprung = Mitte der Oberseite, w × h × d): zwei bis drei Bruchstücke. */
function schollenGeo(w, h, d, seed) {
  const b = new Bld();
  const r = (k) => { const x = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  const cut = (r(1) - 0.5) * 0.5 * w;                     // Bruchkante quer (x)
  const gap = 0.09;
  const stone = litTop(0x5a5e8a, 0.5), top = litTop(0x8a8eb8, 0.75);
  const parts = [[-w / 2, cut - gap], [cut + gap, w / 2]];
  parts.forEach(([x0, x1], i) => {
    const pw = x1 - x0, cx = (x0 + x1) / 2, dz = (r(3 + i) - 0.5) * 0.12;
    b.box(pw, h, d - Math.abs(dz) * 2, cx, -h, dz, stone, { r: 0.08 });
    b.box(pw - 0.08, 0.06, d - 0.12 - Math.abs(dz) * 2, cx, -0.05, dz, top, { r: 0.03 });
    // Kanten-Brocken
    b.box(0.32, 0.22, 0.4, cx + (r(5 + i) - 0.5) * pw * 0.6, -0.2, dz + d / 2 - 0.1, stone, { r: 0.06, yaw: r(7 + i) });
  });
  return b.geometry();
}

/** Glutrisse (unbeleuchtet) einer Scholle: Bruchfuge und feine Risse, knapp über der Oberseite. */
function schollenGlut(w, d, seed) {
  const b = new Bld();
  const r = (k) => { const x = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  const cut = (r(1) - 0.5) * 0.5 * w;
  b.box(0.1, 0.03, d * 0.96, cut, -0.03, 0, 0x5ad0ff, { r: 0 });
  for (let k = 0; k < 4; k++) {
    const x = (r(10 + k) - 0.5) * w * 0.8, z = (r(20 + k) - 0.5) * d * 0.7;
    b.box(0.6 + r(30 + k) * 0.6, 0.02, 0.05, x, -0.01, z, 0x7ae0ff, { r: 0, yaw: r(40 + k) * TAU });
  }
  return b.geometry();
}

/**
 * Sinkschollen (P-7 „sinkende Plattformen über blauer Lava“). list: [{ id?, pos: [x, top, z] (Mitte der Oberseite),
 * size?: [w, h, d] (3 × 0,6 × 3) }]. o: { sink: 0.42 (m/s unter Last), delay: 0.25 (s Zittern vor dem Sinken), rise: 0.7
 * (m/s ohne Last zurück), low: −0.45 (tiefste Oberseite – unter der Lava), lava: 0 (Lavaspiegel, für Blasen) }.
 * level.named.get(id) = { top, top0, load, sinks, state ('ruht'|'zittert'|'sinkt'|'steigt'), info() }.
 * Gegner mit Gewicht sinken nicht mit (nur Figuren).
 */
export function sinkschollen(level, list, o = {}) {
  const sink = o.sink ?? 0.42, rise = o.rise ?? 0.7, low = o.low ?? -0.45, delay = o.delay ?? 0.25;
  const S = list.map((sp, i) => {
    const [x, top, z] = sp.pos;
    const w = sp.size?.[0] ?? 3, h = sp.size?.[1] ?? 0.6, d = sp.size?.[2] ?? 3;
    const st = { id: sp.id ?? null, x, z, top0: top, top, w, h, d, load: false, sinks: 0, t: 0, state: 'ruht', seed: i * 1.7 + x * 0.13 - z * 0.07 };
    st.mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: x, cz: z };
    st.shape = { type: 'box', min: [x - w / 2, top - h, z - d / 2], max: [x + w / 2, top, z + d / 2], mover: st.mover, owner: st, tag: 'sinkscholle' };
    st.sid = level.world.add(st.shape);
    st.info = () => ({ top: +st.top.toFixed(3), top0: st.top0, load: st.load, sinks: st.sinks, state: st.state });
    if (st.id) level.named.set(st.id, st);
    return st;
  });
  level.onStep((dt) => {
    for (const st of S) {
      st.mover.dy = 0; st.mover.vy = 0;
      const on = playerOn(level, st);
      if (on && !st.load) { st.t = 0; st.sinks++; }
      st.load = on;
      st.t += dt;
      let v = 0;
      if (on) { st.state = st.t < delay ? 'zittert' : 'sinkt'; v = st.t < delay ? 0 : -sink; }
      else if (st.top < st.top0 - 1e-4) { st.state = 'steigt'; v = rise; }
      else st.state = 'ruht';
      if (!v) continue;
      const ny = Math.max(low, Math.min(st.top0, st.top + v * dt));
      const dy = ny - st.top;
      if (Math.abs(dy) < 1e-7) continue;
      st.top = ny;
      st.mover.dy = dy; st.mover.vy = dy / dt;
      st.shape.min[1] = ny - st.h; st.shape.max[1] = ny;
      level.world.update(st.sid);
    }
  });
  if (level.view && S.length) {
    // je Größe eine Geometrie (alle Schollen gleicher Größe teilen sich die Instanz-Gruppe)
    const groups = new Map();
    for (const st of S) {
      const key = `${st.w}|${st.h}|${st.d}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(st);
    }
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), SC = new THREE.Vector3(1, 1, 1);
    const h = {};
    for (const [, sts] of groups) {
      const { w, h: hh, d } = sts[0];
      const stone = new THREE.InstancedMesh(schollenGeo(w, hh, d, 3), level.view.mats.world, sts.length);
      const glow = new THREE.InstancedMesh(schollenGlut(w, d, 3), level.view.mats.glow, sts.length);
      stone.name = 'sinkschollen'; glow.name = 'sinkschollen-glut';
      stone.castShadow = true; stone.receiveShadow = true; glow.castShadow = false;
      stone.frustumCulled = false; glow.frustumCulled = false;
      let t = 0;
      addObject(level, stone, (dt) => {
        t += visDt(level, h, dt);
        sts.forEach((st, k) => {
          const shake = st.state === 'zittert' || st.state === 'sinkt' ? 0.025 : 0;
          const tilt = st.state === 'sinkt' ? 0.035 : 0;
          P.set(st.x + Math.sin(t * 57 + k) * shake, st.top + Math.sin(t * 1.3 + k * 2.1) * 0.025, st.z + Math.cos(t * 49 + k) * shake);
          E.set(Math.sin(t * 2.1 + k) * tilt + 0.012 * Math.sin(k * 3.3), (k * 1.37) % TAU, Math.cos(t * 1.7 + k) * tilt + 0.012 * Math.cos(k * 2.1));
          Q.setFromEuler(E);
          M.compose(P, Q, SC);
          stone.setMatrixAt(k, M);
          glow.setMatrixAt(k, M);
        });
        stone.instanceMatrix.needsUpdate = true;
        glow.instanceMatrix.needsUpdate = true;
      });
      addObject(level, glow);
    }
  }
  return S;
}

/**
 * Unsichtbare Plattform (P-7 Stern 2 „unsichtbare Plattform hinter der Zielröhre, nur gleitend“): fester Quader x0..x1,
 * zA..zB mit Oberseite top, ohne Darstellung, bis eine Figur darauf landet – dann blendet eine gläsern-blaue Platte ein
 * (Funkeln). o: { id, h: 0.5, color }. level.named.get(id) = { shown, landed, info() }.
 */
export function geheimPlatte(level, o) {
  const x0 = Math.min(o.x0, o.x1), x1 = Math.max(o.x0, o.x1), z0 = Math.min(o.zA, o.zB), z1 = Math.max(o.zA, o.zB);
  const h = o.h ?? 0.5, top = o.top;
  const st = { shown: false, landed: 0, k: 0 };
  st.shape = { type: 'box', min: [x0, top - h, z0], max: [x1, top, z1], owner: st, tag: 'geheimplatte' };
  level.world.add(st.shape);
  st.info = () => ({ shown: st.shown, landed: st.landed });
  if (o.id) level.named.set(o.id, st);
  level.onStep(() => {
    if (!playerOn(level, st)) return;
    if (!st.shown) {
      st.shown = true;
      level.sfx('powerup_appear');
      level.effects?.sparks({ x: (x0 + x1) / 2, y: top + 0.3, z: (z0 + z1) / 2 }, 18);
    }
    st.landed++;
  });
  if (level.view) {
    const b = new Bld();
    b.box(x1 - x0, h, z1 - z0, 0, -h, 0, litTop(o.color ?? 0x6ab8ff, 0.6), { r: 0.08 });
    const g = b.geometry();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0, roughness: 0.25, metalness: 0.1, emissive: 0x1a4a8a, emissiveIntensity: 0.6 });
    const m = new THREE.Mesh(g, mat);
    m.position.set((x0 + x1) / 2, top, (z0 + z1) / 2);
    m.visible = false;
    m.name = 'geheimplatte';
    const hh = {};
    addObject(level, m, (dt) => {
      dt = visDt(level, hh, dt);
      if (st.shown) st.k = Math.min(1, st.k + dt * 1.6);
      m.visible = st.k > 0.01;
      mat.opacity = 0.75 * st.k;
    });
  }
  return st;
}

/**
 * Plankendeck für ein großes Kippschiff (P-6 Riesenwracks): Längsplanken mit versetzten Stößen, Nagelreihen und Fugen auf
 * der Deckfläche (dem Deckumriss des Bausteins folgend: hinten breit, zum Bug spitz). Hängt als eigenes Mesh an der
 * Darstellung des Kippschiffs (kippt mit); nur Optik. o: { pos (wie das Kippschiff), length, width, colors: [hell,
 * dunkel, Fuge], seed }. Ein Zeichenaufruf je Schiff, kein Schattenwurf.
 */
export function deckPlanken(level, o) {
  if (!level.view) return null;
  const [px, py, pz] = o.pos, L = o.length, W = o.width;
  const hit = level.view.frameFns?.find((f) => f.obj?.name === 'kippschiff' && Math.abs(f.obj.position.x - px) < 0.01 && Math.abs(f.obj.position.z - pz) < 0.01);
  if (!hit) return null;
  const halfW = (u) => (W / 2) * (u > 0 ? 1 - Math.pow(u, 2.2) * 0.85 : 1 - Math.pow(-u, 3) * 0.25);
  const [ca, cb, cf] = o.colors ?? [0xb88450, 0x9a6a3e, 0x4a321e];
  const b = new Bld();
  let seed = o.seed ?? 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed & 0xffff) / 0xffff; };
  const PW = 0.5, step = 0.25;
  for (let s = -W / 2 + PW / 2 + 0.1, k = 0; s < W / 2 - PW / 2 - 0.05; s += PW, k++) {
    // Abschnitte entlang der Länge, in denen die Planke ganz auf dem Deck liegt (Bug = −z)
    let z = L / 2 - 0.05, run = null;
    const flush = (z0, z1) => {
      let a = z0;
      const off = rnd() * 2.2;
      let seg = 1.4 + off;
      while (a > z1 + 0.05) {
        const e = Math.max(z1, a - seg);
        const c = rnd() < 0.5 ? ca : cb;
        b.box(PW - 0.05, 0.05, a - e - 0.04, s, 0.004, (a + e) / 2, c, { r: 0.01 });
        b.box(0.06, 0.012, 0.06, s - PW / 2 + 0.1, 0.055, a - 0.12, cf, { r: 0 });
        b.box(0.06, 0.012, 0.06, s + PW / 2 - 0.1, 0.055, a - 0.12, cf, { r: 0 });
        a = e; seg = 2.6 + rnd() * 1.2;
      }
    };
    for (; z > -L / 2 + 0.05; z -= step) {
      const u = -z / (L / 2);
      const ok = halfW(u) > Math.abs(s) + PW / 2 + 0.05;
      if (ok && run === null) run = z;
      if (!ok && run !== null) { flush(run, z + step); run = null; }
    }
    if (run !== null) flush(run, -L / 2 + 0.1);
    void k;
  }
  const g = b.geometry();
  if (!g) return null;
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
  m.name = 'deckplanken';
  m.castShadow = false; m.receiveShadow = true;
  m.position.set(0, 0.004, 0);
  m.userData.owned = true;
  hit.obj.add(m);
  void py;
  return m;
}

// =====================================================================================================================
// P-Haus: Kraftkapseln der Kampf-Räume
// =====================================================================================================================

const KRAFT_FARBE = { riese: 0xc04cff, funken: 0xff7a2a, krallen: 0xffb02a, stern: 0xfff04a, maske: 0x7ad84a };

/**
 * Kraftkapsel je Kampf-Raum (P-Haus): beim Start jedes Raums (Phase play) bekommt die Figur das Werkzeug des Raums –
 * ein Power-up (`power`: 'riese' | 'funken' | 'krallen' | 'stern') oder einen Helm (`helmet`: 'maske') – bzw. legt ein
 * mitgebrachtes ab (Räume ohne Kapsel: nur Springen, Stampfen, Rennen, POW-Block). Geht ein dauerhaftes Werkzeug
 * (Funkenblüte, Krallen-Anzug, Pilz-Maske) durch einen Treffer verloren, kommt nach `every` s ein neues aus der Kapsel.
 * rooms: [{ pos: [x, y, z] (Kapsel), power?, helmet? }] je Raum (Index = Raumnummer). Darstellung: goldener Sockel mit
 * Leuchtkugel in der Farbe des Werkzeugs (eine Geometrie + eine Leuchtgeometrie + ein Schein-Mesh für alle Räume).
 * Liefert { given, refills, off, info() } (off: Gegenprobe ohne Kapseln).
 */
export function kraftKapsel(level, rooms, o = {}) {
  const st = { given: 0, refills: 0, t: 0, lastRoom: -1, off: false };
  const has = (p, r) => (r.power ? p.power === r.power : true) && (r.helmet ? p.helmet === r.helmet : true);
  const give = (p, r) => {
    if (r.power) { if (p.power !== r.power) p.setPower(r.power); } else if (p.power !== 'none') p.setPower('none');
    if (r.helmet) { if (p.helmet !== r.helmet) p.wearHelmet(r.helmet); } else if (p.helmet) p.dropHelmet?.('gone');
  };
  level.onStep((dt) => {
    const h = level.house, p = level.player;
    if (!h || !p || p.dead) return;
    const r = rooms[h.room];
    if (!r) return;
    if (h.phase === 'play' && h.room !== st.lastRoom) {
      st.lastRoom = h.room; st.t = 0;
      if (st.off) { if (p.power !== 'none') p.setPower('none'); if (p.helmet) p.dropHelmet?.('gone'); return; }
      give(p, r); st.given++;
      if (r.power || r.helmet) level.sfx('powerup');
      return;
    }
    if (st.off || h.phase !== 'play' || has(p, r) || r.power === 'riese' || r.power === 'stern' || (!r.power && !r.helmet)) { st.t = 0; return; }
    st.t += dt;
    if (st.t < (o.every ?? 1.2)) return;
    st.t = 0; st.refills++;
    give(p, r);
    level.sfx('powerup_appear');
    level.effects?.sparks({ x: r.pos[0], y: r.pos[1] + 1.2, z: r.pos[2] }, 12);
  });
  // nach einem Tod (Raum von vorn) gibt die Kapsel beim Neustart wieder aus
  const rt = level.runtime, prev = rt.respawn.bind(rt);
  rt.respawn = () => { prev(); st.lastRoom = -1; };
  if (level.view) {
    const b = new Bld(), g = new Bld(), glow = [];
    for (const r of rooms) {
      if (!r || (!r.power && !r.helmet)) continue;
      const [x, y, z] = r.pos, c = KRAFT_FARBE[r.power ?? r.helmet] ?? 0xffffff;
      b.cyl(0.5, 0.58, 0.18, x, y, z, litTop(0xc8901a), 16);
      b.cyl(0.36, 0.44, 0.5, x, y + 0.18, z, litTop(0x5a4a6a), 12);
      b.torus(0.36, 0.05, x, y + 0.7, z, 0xffd860, { rx: Math.PI / 2 });
      g.sphere(0.24, x, y + 0.96, z, c, { ws: 12, hs: 8 });
      glow.push([x, y + 0.96, z]);
    }
    b.flush(level, { castShadow: false });
    g.flush(level, { material: 'glow', castShadow: false });
    if (glow.length) glowPoints(level, glow, 0xfff0c0, 1.2, { opacity: 0.5, name: 'kraftkapsel-schein' });
  }
  st.info = () => ({ given: st.given, refills: st.refills, off: st.off });
  return st;
}
