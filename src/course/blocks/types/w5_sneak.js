// Suchscheinwerfer (Bauplan 5-7 „Schleich-Festung: Festung mit Suchscheinwerfern; entdeckt → Suchkopf-Kanonen feuern“;
// Baustein-Tabelle „Licht-Kegel (Suchscheinwerfer): entdeckt Figur → Kanonen feuern | Bahn“).
//
// suchscheinwerfer – Lampe mit Lichtkegel, dessen Lichtfleck eine Bahn auf dem Boden abfährt. Steht eine Figur im Kegel
//   (Fleck-Radius `radius`, vom Kegel umschlossen, nicht von festen Wänden verdeckt), gilt sie als „entdeckt“: die Lampe
//   färbt sich rot und blinkt `alarmTime` s (Alarmlicht, sfx 'alarm', Ansage „Entdeckt!“), die Aktion `onDetect` läuft
//   (Standard { signal: 'alarm' } → level.signal('alarm', { pos, source, figure, light })), danach `cooldown` s Ruhe, bevor
//   sie erneut melden kann. Bleibt die Figur im Licht, folgt der Fleck ihr (track, Standard true) – erst wenn sie dem
//   Licht entkommt, fährt er seine Bahn weiter. Der Gegner-Agent hängt Suchkopf-Kanonen daran:
//   level.onSignal('alarm', fn) bzw. level.named.get(id).onDetect(fn(info)).
//   { type: 'suchscheinwerfer' (auch kind), id, path: [[x, y, z], …] (Bahn des Lichtflecks, y = Boden), speed: 2.5,
//     radius: 2.2, mode: 'pingpong' | 'loop', wait: 0.5 (s Halt an den Enden), phase: 0 (0..1 der Bahn), lamp: [x, y, z]
//     (Standort; Standard 10 m über der Bahnmitte, 5 m zur Kamera hin), post: true (Mast bis zum Boden unter der Lampe),
//     cooldown: 3, alarmTime: 2, track: true, trackSpeed: 3.2, occlude: true, onDetect: Aktion | null, banner: 'Entdeckt!',
//     color: 0xfff2b0, idle: false (steht, bis { start: id }) }
//   level.named.get(id) = { spot {x,y,z}, lamp, radius, seen (Figur im Licht | null), alarm (bool), alarms (Zahl),
//     lastSeen {x,y,z} | null, onDetect(fn) → abmelden, start(), stop(), sees(fig), info() }; alle in level.searchlights.
// Modell aus der Registry, sobald es den Namen gibt: 'suchscheinwerfer' (Lampe, Ursprung = Drehpunkt, Blick +X; state
// { alarm, yaw, pitch }); sonst eigene Geometrie. Lichtkegel und Fleck zeichnet der Baustein selbst (additiv, 2 Aufrufe).

import * as THREE from 'three';
import { v3, lin, mixc, smooth, colorize, merge, hex, box, addObject, addStatic } from '../kit.js';
import { figures } from '../w2kit.js';
import { banner } from '../w3kit.js';
import { runAction, visDt } from '../../entities/gimmick.js';
import { hasModel, getModel } from '../../models/index.js';

let SPOT_TEX = null;
function spotTexture() {
  if (SPOT_TEX) return SPOT_TEX;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.62, 'rgba(255,255,255,0.75)');
  grad.addColorStop(0.86, 'rgba(255,255,255,0.32)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  SPOT_TEX = new THREE.CanvasTexture(c);
  SPOT_TEX.colorSpace = THREE.SRGBColorSpace;
  return SPOT_TEX;
}

/** Polylinie mit Bogenlänge (gerade Stücke): { L, at(s, out) }. */
function polyline(points) {
  const P = points.map(v3);
  const seg = [];
  let L = 0;
  for (let i = 0; i < P.length - 1; i++) { const l = Math.hypot(P[i + 1].x - P[i].x, P[i + 1].y - P[i].y, P[i + 1].z - P[i].z); seg.push({ a: P[i], b: P[i + 1], s0: L, l }); L += l; }
  return {
    L, P,
    at(s, out) {
      if (!seg.length) { out.x = P[0].x; out.y = P[0].y; out.z = P[0].z; return out; }
      s = Math.max(0, Math.min(L, s));
      let k = seg.findIndex((q) => s <= q.s0 + q.l + 1e-9);
      if (k < 0) k = seg.length - 1;
      const q = seg[k], u = q.l > 1e-9 ? (s - q.s0) / q.l : 0;
      out.x = q.a.x + (q.b.x - q.a.x) * u; out.y = q.a.y + (q.b.y - q.a.y) * u; out.z = q.a.z + (q.b.z - q.a.z) * u;
      return out;
    },
  };
}

function lampGeo() {
  const parts = [];
  const body = new THREE.CylinderGeometry(0.42, 0.55, 0.9, 16, 1);
  body.rotateZ(Math.PI / 2);
  parts.push(colorize(body.toNonIndexed(), (p, n, o) => mixc(lin(0x2a2a34), lin(0x6a6a78), smooth(-0.6, 0.9, n.y), o)));
  const rim = new THREE.TorusGeometry(0.5, 0.07, 6, 18);
  rim.rotateY(Math.PI / 2);
  rim.translate(0.46, 0, 0);
  parts.push(colorize(rim.toNonIndexed(), (p, n, o) => { o[0] = 0.75; o[1] = 0.62; o[2] = 0.25; }));
  const yoke = new THREE.BoxGeometry(0.16, 0.9, 1.3);
  yoke.translate(-0.05, -0.3, 0);
  parts.push(colorize(yoke.toNonIndexed(), (p, n, o) => { o[0] = 0.12; o[1] = 0.12; o[2] = 0.15; }));
  return merge(parts);
}

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);

export function buildSuchscheinwerfer(level, spec) {
  const path = polyline(spec.path ?? [spec.pos ?? [0, 0, 0], spec.pos ?? [0, 0, 0]]);
  const radius = spec.radius ?? 2.2, speed = spec.speed ?? 2.5, wait = spec.wait ?? 0.5;
  const mode = spec.mode ?? 'pingpong';
  const mid = path.at(path.L / 2, { x: 0, y: 0, z: 0 });
  const lamp = v3(spec.lamp ?? [mid.x, mid.y + 10, mid.z + 5]);
  const cooldown = spec.cooldown ?? 3, alarmTime = spec.alarmTime ?? 2;
  const track = spec.track !== false, trackSpeed = spec.trackSpeed ?? 3.2;
  const onDetect = spec.onDetect === undefined ? { signal: 'alarm' } : spec.onDetect;
  const listeners = new Set();
  const st = {
    s: (spec.phase ?? 0) * path.L, dir: 1, pause: 0, running: !spec.idle,
    spot: path.at((spec.phase ?? 0) * path.L, { x: 0, y: 0, z: 0 }), off: { x: 0, z: 0 },
    seen: null, alarm: 0, cool: 0, alarms: 0, lastSeen: null, inLight: 0,
  };
  const occludes = (fig) => {
    if (spec.occlude === false) return false;
    _b.set(fig.pos.x, fig.pos.y + fig.half.y, fig.pos.z);
    const hit = level.world.raycast(lamp, _b, (s) => s.solid && !s.oneWay && !s.trigger && !s.water && !s.kill && !s.fromBelowOnly);
    return !!hit && hit.t < 0.985;
  };
  /** Steht die Figur im Lichtkegel? (Achse Lampe → Fleck, Radius wächst linear bis radius am Fleck) */
  const sees = (fig) => {
    if (!fig || fig.dead || fig.removedFigure || fig.hidden || fig.statue) return false;
    _a.set(st.spot.x - lamp.x, st.spot.y - lamp.y, st.spot.z - lamp.z);
    const L2 = _a.lengthSq();
    _c.set(fig.pos.x - lamp.x, fig.pos.y + fig.half.y * 0.6 - lamp.y, fig.pos.z - lamp.z);
    const t = _c.dot(_a) / L2;
    if (t <= 0.05 || t > 1.12) return false;
    const d = Math.sqrt(Math.max(0, _c.lengthSq() - t * t * L2));
    if (d > radius * t + fig.half.x * 0.6) return false;
    return !occludes(fig);
  };
  const handle = {
    get spot() { return st.spot; }, lamp, radius,
    get seen() { return st.seen; }, get alarm() { return st.alarm > 0; }, get alarms() { return st.alarms; }, get lastSeen() { return st.lastSeen; },
    onDetect(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    start() { st.running = true; }, stop() { st.running = false; }, sees,
    info: () => ({ spot: [+st.spot.x.toFixed(2), +st.spot.y.toFixed(2), +st.spot.z.toFixed(2)], seen: !!st.seen, alarm: st.alarm > 0, alarms: st.alarms, cool: +st.cool.toFixed(2) }),
  };
  level.searchlights ??= [];
  level.searchlights.push(handle);
  if (spec.id) level.named.set(spec.id, handle);
  const base = { x: 0, y: 0, z: 0 };
  level.onStep((dt) => {
    if (st.alarm > 0) st.alarm = Math.max(0, st.alarm - dt);
    if (st.cool > 0) st.cool = Math.max(0, st.cool - dt);
    // Bahn fahren (solange niemand im Licht ist)
    if (st.running && !st.seen) {
      if (st.pause > 0) st.pause -= dt;
      else if (path.L > 1e-6) {
        st.s += st.dir * speed * dt;
        if (st.s >= path.L) { if (mode === 'loop') st.s -= path.L; else { st.s = path.L; st.dir = -1; st.pause = wait; } }
        else if (st.s <= 0) { st.s = 0; st.dir = 1; st.pause = wait; }
      }
    }
    path.at(st.s, base);
    // Verfolgen: Fleck rückt zur gesehenen Figur (Versatz zur Bahn), sonst zurück auf die Bahn
    const seen = figures(level).find((f) => sees(f)) ?? null;
    if (seen && track) {
      const dx = seen.pos.x - (base.x + st.off.x), dz = seen.pos.z - (base.z + st.off.z), l = Math.hypot(dx, dz), m = Math.min(l, trackSpeed * dt);
      if (l > 1e-4) { st.off.x += (dx / l) * m; st.off.z += (dz / l) * m; }
    } else if (!seen) {
      const l = Math.hypot(st.off.x, st.off.z), m = Math.min(l, trackSpeed * 0.6 * dt);
      if (l > 1e-4) { st.off.x -= (st.off.x / l) * m; st.off.z -= (st.off.z / l) * m; }
    }
    st.spot.x = base.x + st.off.x; st.spot.y = base.y; st.spot.z = base.z + st.off.z;
    const wasSeen = st.seen;
    st.seen = seen;
    st.inLight = seen ? st.inLight + dt : 0;
    if (seen) st.lastSeen = { x: seen.pos.x, y: seen.pos.y, z: seen.pos.z };
    if (seen && st.cool <= 0) {
      st.alarms++;
      st.alarm = alarmTime;
      st.cool = cooldown + alarmTime;
      level.sfx('alarm');
      if (spec.banner !== false && !wasSeen) banner(level, spec.banner ?? 'Entdeckt!', { color: '#ff6a5a', size: 22, hold: 0.8 });
      const info = { pos: [seen.pos.x, seen.pos.y, seen.pos.z], source: handle, figure: seen, light: spec.id ?? null };
      for (const fn of [...listeners]) fn(info);
      if (onDetect) runAction(level, onDetect, { pos: info.pos, source: handle });
    }
  });
  if (spec.post !== false) {
    const hb = level.world.raycastDown(lamp.x, lamp.y - 0.8, lamp.z, 60);
    const y0 = hb ? hb.y : lamp.y - 10;
    const h = lamp.y - 0.4 - y0;
    if (h > 0.3) {
      const g = new THREE.CylinderGeometry(0.16, 0.24, h, 8);
      g.translate(lamp.x, y0 + h / 2, lamp.z);
      addStatic(level, colorize(g.toNonIndexed(), (p, n, o) => mixc(lin(0x2a2630), lin(0x5a5664), smooth(-0.5, 0.8, n.x * 0.6 + n.z * 0.4), o)));
      level.world.add({ type: 'cyl', x: lamp.x, z: lamp.z, r: 0.22, y0, y1: lamp.y - 0.4, tag: 'suchscheinwerfer:mast' });
    }
  }
  if (level.view) {
    const col = new THREE.Color(hex(spec.color ?? 0xfff2b0)), red = new THREE.Color(0xff3a2a);
    const coneGeo = new THREE.ConeGeometry(1, 1, 28, 1, true);
    coneGeo.translate(0, -0.5, 0);                 // Spitze im Ursprung, öffnet nach −Y
    const coneMat = new THREE.MeshBasicMaterial({ color: col.clone(), transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.renderOrder = 4; cone.castShadow = false; cone.frustumCulled = false;
    const spotMat = new THREE.MeshBasicMaterial({ map: spotTexture(), color: col.clone(), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });
    const spot = new THREE.Mesh(new THREE.CircleGeometry(1, 32), spotMat);
    spot.rotation.x = -Math.PI / 2;
    spot.renderOrder = 3; spot.frustumCulled = false;
    const lampRoot = new THREE.Group();
    lampRoot.position.set(lamp.x, lamp.y, lamp.z);
    let model = null;
    if (hasModel('suchscheinwerfer')) { model = getModel('suchscheinwerfer', {}); lampRoot.add(model.root); }
    else {
      const m = new THREE.Mesh(lampGeo(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.3 }));
      m.castShadow = true;
      lampRoot.add(m);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.4, 18), new THREE.MeshBasicMaterial({ color: col.clone() }));
      lens.rotation.y = Math.PI / 2; lens.position.x = 0.47;
      lampRoot.add(lens);
      lampRoot.userData.lens = lens;
    }
    const group = new THREE.Group();
    group.add(cone, spot, lampRoot);
    const holder = {};
    let tt = 0;
    const tmp = new THREE.Color();
    addObject(level, group, (dt) => {
      const d = visDt(level, holder, dt);
      tt += d;
      const sx = st.spot.x, sy = st.spot.y, sz = st.spot.z;
      _a.set(sx - lamp.x, sy - lamp.y, sz - lamp.z);
      const len = _a.length();
      cone.position.set(lamp.x, lamp.y, lamp.z);
      cone.quaternion.setFromUnitVectors(_up.set(0, -1, 0), _a.clone().normalize());
      cone.scale.set(radius, len, radius);
      spot.position.set(sx, sy + 0.035, sz);
      spot.scale.setScalar(radius * 1.08);
      const blink = st.alarm > 0 ? 0.5 + 0.5 * Math.sin(tt * 18) : 0;
      tmp.copy(col).lerp(red, st.alarm > 0 ? 0.65 + 0.35 * blink : st.seen ? 0.4 : 0);
      coneMat.color.copy(tmp); spotMat.color.copy(tmp);
      coneMat.opacity = st.alarm > 0 ? 0.2 + 0.08 * blink : 0.14;
      lampRoot.rotation.set(0, Math.atan2(-_a.z, _a.x), Math.atan2(_a.y, Math.hypot(_a.x, _a.z)), 'YZX');
      if (lampRoot.userData.lens) lampRoot.userData.lens.material.color.copy(tmp);
      model?.update?.(d, { alarm: st.alarm > 0, seen: !!st.seen });
    });
  }
  return handle;
}

export const TYPES = { suchscheinwerfer: buildSuchscheinwerfer };
