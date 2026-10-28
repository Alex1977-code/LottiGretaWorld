// Welt-8-Bausteine Keksfabrik (Präzisierung Motor und Bausteine Welt 8; Bauplan 8-3 „Keksräder – drehende Kekse und
// Keks-Zahnräder“).
//
// keksrad – drehender Riesenkeks als Plattform (Schokostückchen, Zuckerguss-Rand).
//   axis 'y' (waagerecht, Standard): liegender Keks dreht sich um die Hochachse und nimmt Figuren und Gegner mit (wie ein
//     Drehteller; Form cyl mit mover.dyaw). pos = Mitte der Unterseite.
//   axis 'x' | 'z' (senkrecht): stehender Keks dreht sich um die waagerechte Achse (entlang X bzw. Z); oben läuft er wie ein
//     Förderband (Mitnahme quer zur Achse), zu den Seiten wird er steil (Abrutschen). pos = Mitte der Achse.
//   { type: 'keksrad', id, pos, radius: 2.5, thick: 0.6 (waagerecht) bzw. 1.6 (senkrecht, Breite entlang der Achse),
//     axis: 'y' | 'x' | 'z', speed: 0.7 (rad/s; waagerecht + = gegen den Uhrzeigersinn von oben; senkrecht + = Oberseite
//     läuft bei axis 'x' nach +Z, bei axis 'z' nach +X), angle: 0, idle: false, slice: 0.3, icing: 'rosa' | 'weiss' |
//     'schoko' | 'gruen', post: true (waagerecht: Stiel nach unten, postDown 5), look: 'eigen' }
//   level.named.get(id) = { angle, speed, axis, start(), stop(), reverse(), info() }; w8(level).cookies.
//   Modell: Registry 'keksrad' ({ size: 2·radius, thick, axis, color: icing 'schoko' → 'schoko', sonst 'hell' }, Ursprung
//   Mitte; state { angle }) – liegend um thick/2 angehoben; sonst (bzw. look: 'eigen') eigener Keks.
//   Beispiele: { type: 'keksrad', id: 'keks1', pos: [0, 0, -30], radius: 3, speed: 0.6 }
//              { type: 'keksrad', id: 'keks2', axis: 'x', pos: [0, -1.2, -40], radius: 2.6, thick: 2, speed: 0.5 }
//
// keks_zahnrad – Keks-Zahnrad.
//   axis 'y' (waagerecht, Standard): liegendes Zahnrad dreht sich wie das waagerechte Keksrad; die Zähne (teeth, toothLen)
//     ragen über den Rand hinaus und sind begehbar – zwei Zahnräder nebeneinander greifen ineinander (gleiche speed mit
//     umgekehrtem Vorzeichen, Achsabstand 2·radius + toothLen).
//   axis 'x' | 'z' (senkrecht): stehendes Zahnrad (Paternoster): jeder Zahn ist eine kleine Plattform, die auf dem Kreis
//     mitfährt (bleibt waagerecht, trägt Figuren), der Radkörper läuft oben wie ein Förderband.
//   { type: 'keks_zahnrad', id, pos (waagerecht Mitte der Unterseite, senkrecht Achsmitte), radius: 3, thick: 0.6 (senkrecht
//     1.6), teeth: 8, toothLen: 0.9, toothW: 1.1, axis, speed: 0.5, angle, idle, icing, look }
//   level.named.get(id) = { angle, speed, teeth: [{ x, y, z }], start(), stop(), reverse(), info() }; w8(level).gears.
//   Modell: Registry 'keks_zahnrad' ({ radius (Zahnspitzen), teeth, thick, axis }, Ursprung Mitte; state { angle }). Mit Modell
//   folgen die Kollisions-Zähne dessen Zahnform: liegend Körper radius, Zähne bis radius + d (d = min(0,45, 0,22·Rm), toothLen
//   wird dann ignoriert), Zahn k beim Winkel (k + 0,375)/teeth·2π; stehend ist der Modell-Radius = radius und die mitfahrenden
//   Zahn-Plattformen sitzen vor den Modell-Zähnen.

import * as THREE from 'three';
import { v3, lin, mixc, smooth, colorize, merge, hex, addObject } from '../kit.js';
import { MovingBox } from '../w2kit.js';
import { visDt } from '../../entities/gimmick.js';
import { getModel } from '../../models/index.js';
import { w8, regModel, stdMat, TAU } from '../w8kit.js';

const ICING = { rosa: 0xff9ac8, weiss: 0xfff6ee, schoko: 0x6a3a20, gruen: 0x9ae8a0, gelb: 0xffe07a };
const DOUGH = 0xd89a52, DOUGH_HI = 0xf0c27a, DOUGH_LO = 0x9a5a2a, CHIP = 0x4a2412;

/**
 * Liegender Keks (Achse +Y, Ursprung Mitte der Unterseite): Teigscheibe mit Rand, Schokostückchen oben und unten, Zuckerguss-
 * Kranz; teeth > 0 = Zahnrad (Zähne ragen um toothLen hinaus).
 */
function cookieGeo(R, thick, icing, teeth = 0, toothLen = 0, toothW = 1) {
  const d = lin(hex(DOUGH)), dh = lin(hex(DOUGH_HI)), dl = lin(hex(DOUGH_LO)), ch = lin(hex(CHIP)), ic = lin(hex(ICING[icing] ?? ICING.rosa));
  const parts = [];
  const body = new THREE.CylinderGeometry(R, R * 0.97, thick, 40, 1);
  body.translate(0, thick / 2, 0);
  parts.push(colorize(body.toNonIndexed(), (p, n, o) => {
    if (n.y > 0.5) { const r = Math.hypot(p.x, p.z) / R; mixc(d, dh, 0.5 + 0.5 * Math.sin(p.x * 3.1 + p.z * 2.7) * 0.4, o); if (r > 0.9) mixc(o, dl, 0.3, o); }
    else if (n.y < -0.5) mixc(d, dl, 0.6, o);
    else mixc(dl, d, smooth(0, thick, p.y), o);
  }));
  if (teeth > 0) {
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * TAU;
      const t = new THREE.BoxGeometry(toothLen + 0.3, thick * 0.96, toothW, 2, 1, 1);
      // Zahn leicht verjüngt
      const ps = t.attributes.position;
      for (let k = 0; k < ps.count; k++) if (ps.getX(k) > 0) ps.setZ(k, ps.getZ(k) * 0.75);
      t.translate(R + toothLen / 2 - 0.15, thick / 2, 0);
      t.rotateY(a);
      parts.push(colorize(t.toNonIndexed(), (p, n, o) => (n.y > 0.5 ? mixc(d, dh, 0.4, o) : mixc(dl, d, 0.5, o))));
    }
  }
  // Zuckerguss-Kranz und Tupfen
  const ring = new THREE.TorusGeometry(R * 0.72, Math.min(0.16, thick * 0.3), 6, 36);
  ring.rotateX(Math.PI / 2); ring.translate(0, thick + 0.02, 0);
  parts.push(colorize(ring.toNonIndexed(), (p, n, o) => mixc(ic, [1, 1, 1], smooth(0.3, 1, n.y) * 0.3, o)));
  const rnd = (k) => { const s = Math.sin(k * 127.1) * 43758.5453; return s - Math.floor(s); };
  const n = Math.round(R * R * 1.4);
  for (let i = 0; i < n; i++) {
    const r = Math.sqrt(rnd(i + 1)) * R * 0.86, a = rnd(i + 7) * TAU;
    if (Math.abs(r - R * 0.72) < 0.25) continue;
    const c = new THREE.SphereGeometry(0.11 + rnd(i + 3) * 0.06, 5, 3, 0, TAU, 0, Math.PI / 2);
    c.scale(1, 0.6, 1);
    c.translate(Math.cos(a) * r, thick - 0.01, Math.sin(a) * r);
    parts.push(colorize(c.toNonIndexed(), (p, nn, o) => { o[0] = ch[0]; o[1] = ch[1]; o[2] = ch[2]; }));
  }
  // Schokostückchen am Rand (sieht man beim stehenden Keks)
  for (let i = 0; i < Math.round(R * 6); i++) {
    const a = (i / Math.round(R * 6)) * TAU + 0.3;
    const c = new THREE.SphereGeometry(0.1, 5, 4);
    c.translate(Math.cos(a) * R * 0.99, thick * (0.3 + 0.4 * rnd(i + 11)), Math.sin(a) * R * 0.99);
    parts.push(colorize(c.toNonIndexed(), (p, nn, o) => { o[0] = ch[0]; o[1] = ch[1]; o[2] = ch[2]; }));
  }
  return merge(parts);
}

/** Senkrechte Rolle: Kollisions-Scheiben wie der Zylinder (Welt 7) – Rampen mit Förderband-Mitnahme. */
function rollerSlices(level, p, R, L, axis, step, tag) {
  const n = Math.max(4, Math.round((2 * R) / step));
  const w = (2 * R) / n;
  const cu = axis === 'x' ? p.z : p.x;
  const out = [];
  for (let i = 0; i < n; i++) {
    const u0 = -R + i * w, u1 = u0 + w;
    const h0 = Math.sqrt(Math.max(0, R * R - u0 * u0)), h1 = Math.sqrt(Math.max(0, R * R - u1 * u1));
    const hi = Math.max(h0, h1), lo = Math.min(h0, h1);
    const um = (u0 + u1) / 2, hm = Math.sqrt(Math.max(0, R * R - um * um));
    const conv = { x: 0, z: 0 };
    const shape = axis === 'x'
      ? { type: 'ramp', axis: 'z', dir: h1 >= h0 ? 1 : -1, min: [p.x - L / 2, p.y - Math.max(0.2, hm), cu + u0], max: [p.x + L / 2, p.y + hi, cu + u1], low: p.y + lo, conveyor: conv, tag, noWallSlide: true }
      : { type: 'ramp', axis: 'x', dir: h1 >= h0 ? 1 : -1, min: [cu + u0, p.y - Math.max(0.2, hm), p.z - L / 2], max: [cu + u1, p.y + hi, p.z + L / 2], low: p.y + lo, conveyor: conv, tag, noWallSlide: true };
    out.push({ shape, conv, cosT: hm / R, id: level.world.add(shape) });
  }
  return out;
}

function setConveyor(slices, axis, v) {
  for (const sl of slices) {
    const c = v * sl.cosT;
    if (axis === 'x') { sl.conv.x = 0; sl.conv.z = c; } else { sl.conv.x = c; sl.conv.z = 0; }
  }
}

function buildCookie(level, spec, kind) {
  const gear = kind === 'keks_zahnrad';
  const p = v3(spec.pos);
  const axis = spec.axis === 'x' || spec.axis === 'z' ? spec.axis : 'y';
  const flat = axis === 'y';
  const R = spec.radius ?? (gear ? 3 : 2.5);
  const thick = spec.thick ?? (flat ? 0.6 : 1.6);
  const teeth = gear ? Math.max(3, spec.teeth ?? 8) : 0;
  const reg = gear ? 'keks_zahnrad' : 'keksrad';
  const useModel = regModel(spec, reg);
  let toothLen = gear ? spec.toothLen ?? 0.9 : 0;
  const toothW = gear ? spec.toothW ?? 1.1 : 0;
  // Zahn k: Winkel-Lage (im Modell: Zahnspitze k bei (k + 0,375)/teeth·2π)
  const toothB = (k) => (useModel ? (k + 0.375) / teeth : k / teeth) * TAU;
  let modelR = R;
  if (gear && useModel && flat) { const dM = Math.min(0.45, (R + 0.45) * 0.22); toothLen = dM; modelR = R + dM; }
  const st = { angle: spec.angle ?? 0, speed: spec.speed ?? (gear ? 0.5 : 0.7), running: !spec.idle };
  const W = w8(level);
  const handle = {
    kind, axis, get angle() { return st.angle; }, get speed() { return st.speed; }, teeth: [],
    start() { st.running = true; }, stop() { st.running = false; }, reverse() { st.speed = -st.speed; },
    info: () => ({ angle: +st.angle.toFixed(3), speed: st.speed, running: st.running, axis, teeth: teeth || undefined }),
  };
  if (flat) {
    // Drehteller: Mittelscheibe (+ Zähne als kleine Zylinder) mit gemeinsamem mover (dyaw um die Mitte)
    const mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: p.x, cz: p.z };
    const discs = [{ dist: 0, a: 0, r: R, shape: null }];
    if (teeth) {
      const dist = useModel ? R + toothLen * 0.5 : R + toothLen * 0.45;
      const r = useModel ? Math.min(toothLen * 0.8, (TAU * modelR / teeth) * 0.2) : Math.min(toothW * 0.55, toothLen * 0.7);
      for (let i = 0; i < teeth; i++) discs.push({ dist, a: toothB(i), r, shape: null });
    }
    for (const c of discs) {
      c.shape = { type: 'cyl', x: p.x + Math.cos(c.a + st.angle) * c.dist, z: p.z - Math.sin(c.a + st.angle) * c.dist, r: c.r, y0: p.y, y1: p.y + thick, mover, tag: kind, owner: handle };
      c.id = level.world.add(c.shape);
    }
    level.onStep((dt) => {
      const da = st.running ? st.speed * dt : 0;
      st.angle += da;
      mover.dyaw = da;
      for (const c of discs) {
        if (!c.dist) continue;
        c.shape.x = p.x + Math.cos(c.a + st.angle) * c.dist; c.shape.z = p.z - Math.sin(c.a + st.angle) * c.dist;
        level.world.update(c.id);
      }
    });
    if (spec.post !== false && level.view) {
      const pd = spec.postDown ?? 5;
      const g = new THREE.CylinderGeometry(0.35, 0.45, pd, 10);
      g.translate(p.x, p.y - pd / 2, p.z);
      const c0 = lin(hex(0xc8a070)), c1 = lin(hex(0x8a6a40));
      level.view.addStatic(colorize(g.toNonIndexed(), (q, n, o) => mixc(c1, c0, smooth(-0.6, 0.8, n.x * 0.5 + n.z * 0.5), o)));
    }
  } else {
    // stehend: Radkörper als Förderband-Scheiben (Oberseite läuft mit ω·R), Zähne (Zahnrad) als mitfahrende Plattformen
    const step = spec.slice ?? 0.3;
    const Rb = R;
    const slices = rollerSlices(level, p, Rb, thick, axis, step, kind);
    for (const sl of slices) sl.shape.owner = handle;
    const tb = [];
    if (teeth) {
      for (let i = 0; i < teeth; i++) {
        // Winkel 0 = oben, + Richtung +u; mit Modell vor dessen Zähnen (axis 'x': b + π, axis 'z': π/2 − b)
        const b = toothB(i);
        const a = !useModel ? b : axis === 'x' ? b + Math.PI : Math.PI / 2 - b;
        const tw = axis === 'x' ? [thick * 0.9, 0.45, toothW] : [toothW, 0.45, thick * 0.9];
        const mb = new MovingBox(level, p.x, p.y, p.z, tw[0], tw[1], tw[2], { tag: `${kind}-zahn` });
        mb.shape.owner = handle;
        tb.push({ a, mb });
      }
    }
    const placeTeeth = (dt) => {
      const rr = R + toothLen * 0.5;
      for (const t of tb) {
        const a = t.a + st.angle;
        // Winkel 0 = oben; + dreht die Oberseite nach +u (u = z bei axis 'x', x bei axis 'z')
        const u = Math.sin(a) * rr, v = Math.cos(a) * rr;
        const x = axis === 'x' ? p.x : p.x + u, z = axis === 'x' ? p.z + u : p.z;
        t.mb.moveTo(x, p.y + v - 0.225, z, dt);
      }
      handle.teeth = tb.map((t) => ({ x: +t.mb.pos.x.toFixed(2), y: +t.mb.pos.y.toFixed(2), z: +t.mb.pos.z.toFixed(2) }));
    };
    placeTeeth(0);
    let lastRun = null;
    level.onStep((dt) => {
      if (st.running) st.angle += st.speed * dt;
      const v = st.running ? st.speed * Rb : 0;
      if (v !== lastRun) { setConveyor(slices, axis, v); lastRun = v; }
      if (tb.length) placeTeeth(dt);
    });
  }
  if (spec.id) level.named.set(spec.id, handle);
  (gear ? W.gears : W.cookies).push(handle);

  if (!level.view) return handle;
  // ---------------- Darstellung: liegender Keks; stehend um die Achse aufgerichtet (Mitte = Achse)
  const root = new THREE.Group();
  root.name = kind;
  root.position.set(p.x, p.y, p.z);
  const spin = new THREE.Group();
  root.add(spin);
  const holder = new THREE.Group();   // liegender Keks: Ursprung Mitte der Unterseite
  spin.add(holder);
  const icing = spec.icing ?? (gear ? 'weiss' : 'rosa');
  let model = null;
  if (useModel) {
    model = gear
      ? getModel(reg, { radius: modelR, teeth, thick, axis })
      : getModel(reg, { size: 2 * R, thick, axis, color: icing === 'schoko' ? 'schoko' : 'hell' });
    // Modell: Ursprung Mitte, eigene Achse – liegend um thick/2 angehoben, nicht mitdrehen (Winkel über update)
    if (flat) model.root.position.y = thick / 2;
    root.add(model.root);
  } else {
    const mesh = new THREE.Mesh(cookieGeo(R, thick, icing, flat ? teeth : 0, toothLen, toothW), stdMat('w8keks', { roughness: 0.85 }));
    mesh.castShadow = true; mesh.receiveShadow = true;
    holder.add(mesh);
  }
  if (!flat && !model) {
    // stehend: der liegende Keks wird um seine Mitte (y = thick/2) aufgestellt – Achse entlang X (axis 'x') bzw. Z
    holder.position.y = -thick / 2;
    root.rotation.z = axis === 'x' ? Math.PI / 2 : 0;
    root.rotation.x = axis === 'z' ? Math.PI / 2 : 0;
  }
  // stehendes Zahnrad: Zähne als eigene Plattformen (mitfahrend, waagerecht)
  const toothMeshes = [];
  if (!flat && teeth && level.view) {
    const tw = axis === 'x' ? [thick * 0.9, 0.45, toothW] : [toothW, 0.45, thick * 0.9];
    const d = lin(hex(DOUGH)), dh = lin(hex(DOUGH_HI)), ic = lin(hex(ICING[icing] ?? ICING.weiss));
    const g = new THREE.BoxGeometry(tw[0], tw[1], tw[2], 1, 1, 1);
    g.translate(0, tw[1] / 2, 0);
    const tg = colorize(g.toNonIndexed(), (q, n, o) => (n.y > 0.5 ? mixc(dh, ic, 0.5, o) : mixc(d, dh, 0.3, o)));
    const im = new THREE.InstancedMesh(tg, stdMat('w8keks'), teeth);
    im.castShadow = true;
    im.frustumCulled = false;
    level.view.add(im);
    toothMeshes.push(im);
  }
  const M = new THREE.Matrix4(), hold = {};
  addObject(level, root, (dt) => {
    const dd = visDt(level, hold, dt);
    if (flat) spin.rotation.y = st.angle;
    // stehend: Drehung um die Achse; Oberseite läuft nach +u (axis 'x': +Z, axis 'z': +X)
    // root.rotation.z = π/2 (axis 'x'): lokal +X = Welt oben, lokal Z = Welt Z; root.rotation.x = π/2 (axis 'z'): lokal −Z = oben,
    // lokal X = Welt X – in beiden Fällen bringt −angle um die lokale Y-Achse die Oberseite nach +u
    else spin.rotation.y = -st.angle;
    // Modell (Drehung um die eigene Achse): liegend + = gegen den Uhrzeigersinn von oben wie die Kollision; stehend bringt bei
    // axis 'x' +angle die Oberseite nach +Z, bei axis 'z' −angle die Oberseite nach +X
    model?.update?.(dd, { angle: flat || axis === 'x' ? st.angle : -st.angle });
    if (toothMeshes.length) {
      const W8 = handle.teeth;
      for (let i = 0; i < W8.length; i++) { M.makeTranslation(W8[i].x, W8[i].y, W8[i].z); toothMeshes[0].setMatrixAt(i, M); }
      toothMeshes[0].instanceMatrix.needsUpdate = true;
    }
  });
  return handle;
}

export const buildKeksrad = (level, spec) => buildCookie(level, spec, 'keksrad');
export const buildKeksZahnrad = (level, spec) => buildCookie(level, spec, 'keks_zahnrad');

export const TYPES = { keksrad: buildKeksrad, keks_zahnrad: buildKeksZahnrad };
