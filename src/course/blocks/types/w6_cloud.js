// Welt-6-Baustein Wolkenplattform (Bauplan 6-6 „Wolken und Förderband“, „obere Wolken“; 6-7 „Wolkenplattformen“ im
// senkrechten Schacht). Weiche Wolke zum Draufstehen, von unten durchspringbar (Einweg), federt unter Last etwas ein;
// optional fahrend (Pfad wie `cloud`) und/oder verpuffend (nach dem Betreten löst sie sich auf und kommt wieder).
// Die einfache Welt-1-Wolke `cloud` bleibt unverändert.
//
// wolkenplattform:
//   { type: 'wolkenplattform', id, pos: [x, y, z] (Mitte unten), size: [w, h, d] (3 × 0,6 × 3), path: [[x, y, z], …]
//     (fährt; erster Punkt = Start), speed: 2, mode: 'pingpong' | 'loop', wait: 0.5, phase: 0, idle: false (fährt erst auf
//     Signal start), sink: 0.2 (m Einsinken unter Last), vanish: 0 (s nach dem Betreten verpufft sie; 0 = bleibt),
//     respawn: 3 (s bis sie wiederkommt), color: 'weiss' | 'grau' | 'rosa' | 'gold', oneWay: true, hidden }
//   level.named.get(id) = { state ('da'|'zittert'|'weg'), load, start(), stop(), reveal(), hide(), info() }
// Modell aus der Registry für weiße Wolken: 'wolkenplattform' ({ size: [w, h, d] }, Ursprung Mitte unten; state.anim 'step'
// unter Last, Verpuffen/Wiederkommen skaliert der Baustein); getönte Wolken und ohne Registry: eigene Geometrie (Bäusche wie `cloud`).

import * as THREE from 'three';
import { v3, sz3, addObject, lin, colorize, mixc } from '../kit.js';
import { MovingBox } from '../w2kit.js';
import { PathMover } from '../../level/PathMover.js';
import { visDt } from '../../entities/gimmick.js';
import { hasModel, getModel } from '../../models/index.js';
import { cloudGeo } from './cloud.js';

const TINT = { weiss: null, grau: [0x9aa0b4, 0xd8dce6], rosa: [0xffb0d8, 0xfff0f8], gold: [0xffc83a, 0xfff2b0] };

export function buildWolkenplattform(level, spec) {
  const p = v3(spec.pos ?? spec.path?.[0] ?? [0, 0, 0]), s = sz3(spec.size, [3, 0.6, 3]);
  const pm = spec.path?.length >= 2 ? new PathMover(spec.path, { speed: spec.speed ?? 2, mode: spec.mode, wait: spec.wait ?? 0.5, phase: spec.phase ?? 0 }) : null;
  const home = pm ? { ...pm.pos } : { x: p.x, y: p.y, z: p.z };
  const mb = new MovingBox(level, home.x, home.y, home.z, s.x, s.y, s.z, { oneWay: spec.oneWay !== false, camIgnore: true, tag: 'wolkenplattform', solid: !spec.hidden });
  const st = { state: spec.hidden ? 'weg' : 'da', t: 0, sink: 0, load: 0, running: !spec.idle, hidden: !!spec.hidden, k: spec.hidden ? 0 : 1, wob: 0 };
  const sinkMax = spec.sink ?? 0.2, vanish = spec.vanish ?? 0, respawn = spec.respawn ?? 3;
  const handle = {
    get state() { return st.state; }, get load() { return st.load; }, mb,
    start() { st.running = true; }, stop() { st.running = false; },
    reveal() { if (!st.hidden) return; st.hidden = false; st.state = 'da'; mb.setSolid(true); level.sfx('powerup_appear'); },
    hide() { st.hidden = true; st.state = 'weg'; mb.setSolid(false); },
    info: () => ({ state: st.state, load: st.load, sink: +st.sink.toFixed(2), y: +mb.pos.y.toFixed(2) }),
  };
  if (spec.id) level.named.set(spec.id, handle);
  let base = { ...home };
  level.onStep((dt) => {
    if (pm && st.running && !st.hidden) { pm.step(dt); base = { ...pm.pos }; }
    st.load = st.state !== 'weg' ? mb.carried(level) : 0;
    // Verpuffen: nach dem Betreten zittern, dann weg, nach respawn s wieder da
    if (vanish > 0 && !st.hidden) {
      if (st.state === 'da' && st.load > 0) { st.state = 'zittert'; st.t = 0; }
      else if (st.state === 'zittert') { st.t += dt; if (st.t >= vanish) { st.state = 'weg'; st.t = 0; mb.setSolid(false); level.sfx('poof'); level.effects?.dust({ x: mb.pos.x, y: mb.pos.y + s.y, z: mb.pos.z }, 8, 1.2); } }
      else if (st.state === 'weg') { st.t += dt; if (respawn > 0 && st.t >= respawn) { st.state = 'da'; mb.setSolid(true); level.sfx('poof'); } }
    }
    st.sink += ((st.load > 0 ? sinkMax : 0) - st.sink) * Math.min(1, dt * 5);
    mb.moveTo(base.x, base.y - st.sink, base.z, dt);
  });
  if (level.view) {
    const root = new THREE.Group();
    root.name = 'wolkenplattform';
    let model = null;
    if ((spec.color ?? 'weiss') === 'weiss' && hasModel('wolkenplattform')) { model = getModel('wolkenplattform', { size: [s.x, s.y, s.z] }); root.add(model.root); }
    else {
      let g = cloudGeo(s, Math.floor(p.x * 13 + p.z * 7 + p.y * 3) >>> 0);
      const tint = TINT[spec.color ?? 'weiss'];
      if (tint) { const a = lin(tint[0]), b = lin(tint[1]); g = colorize(g, (q, n, o) => mixc(a, b, Math.max(0, n.y * 0.6 + 0.4), o)); }
      const m = new THREE.Mesh(g, level.view.mats.world);
      m.castShadow = true; m.receiveShadow = true;
      root.add(m);
    }
    const hv = {};
    let tt = 0;
    addObject(level, root, (dt) => {
      const d = visDt(level, hv, dt);
      tt += d;
      const want = st.state === 'weg' || st.hidden ? 0 : 1;
      st.k += (want - st.k) * Math.min(1, d * 8);
      root.visible = st.k > 0.03;
      const wob = st.state === 'zittert' ? Math.sin(tt * 40) * 0.06 : 0;
      root.position.set(mb.pos.x + wob, mb.pos.y + Math.sin(tt * 1.6 + p.x) * 0.03, mb.pos.z);
      root.scale.set(st.k, 0.6 + 0.4 * st.k, st.k);
      model?.update?.(d, { anim: st.load > 0 || st.state === 'zittert' ? 'step' : 'idle' });
    });
  }
  return handle;
}

export const TYPES = { wolkenplattform: buildWolkenplattform };
