// Regie des Autoscrollers je Pfadlänge s (Präzisierung „Leistung und Level-Haken 2“; aus 3-2 „Gitterbahn über den
// Wolken“ in den Motor übernommen). Bei senkrechter oder seitlicher Fahrt bleibt z gleich – die Kameraschiene (nach
// z-Abschnitten) könnte die Fahrtabschnitte nicht trennen; hier gelten Tabellen über die Pfadlänge des Bildfensters.
// Alles optional in LEVEL.scroll:
//
//   cams:   [{ s, pitch, dist, fov, height }]     Kamera während der Fahrt (weich überblendet; Gier 0 – frame.turn:
//                                                 false setzen); nach dem Halt gilt wieder LEVEL.camera
//   frames: [{ s, back, front, ahead, followX }]  Fenstergrenzen (überblendet)
//   killUp: 0.6                                   backMode 'kill', solange die Fahrt so steil nach oben zeigt (unten
//                                                 aus dem Bild = Absturz statt von der Grenze getragen)
//   gates:  [{ id, open: s }]                     Glasröhre `id` nimmt die Figur erst ab Pfadlänge s auf
//   reveal: [{ id, at: s | 'done', sfx? }]        benannte Objekte (Warp-Box …) erscheinen ab s bzw. beim Halt
//   fall:   { minS, y, x: [x0, x1] }              ab Pfadlänge minS: unter y (in diesem X-Bereich) = Absturz
//   cap:    { s0, s1, up, x: [x0, x1], z: [z0, z1] }  Decke: nicht höher als up m über der Fenstermitte (Kletterturm)
//   sync:   { id: t0 }                            fahrende Plattformen/Zäune (Pfad pingpong, PathMover `pm`) im Takt der
//                                                 Fahrt-Uhr: u = (clock + t0) mod T – nach einem Neustart stehen sie wie
//                                                 damals, der Takt passt immer zum Fenster
// Immer: am Kettenzaun trägt der Zaun die Figur; das geerbte Fahrzeugtempo wird dort gelöscht (sonst schöbe es die
// Figur am Zaun entlang und zählte beim Absprung doppelt).
// Ergebnis: arch.director = { info() → { s, mode, back, front, revealed, falls } }.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sstep = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

/** Lineare Überblendung einer Tabelle [{ s, …Werte }] (sortiert) an s; weich (smoothstep) zwischen Einträgen. */
function sampleTable(table, s, keys, out) {
  let a = table[0], b = table[table.length - 1];
  if (s <= a.s) b = a;
  else if (s >= b.s) a = b;
  else for (let i = 0; i < table.length - 1; i++) if (s >= table[i].s && s <= table[i + 1].s) { a = table[i]; b = table[i + 1]; break; }
  const t = a === b ? 0 : sstep((s - a.s) / (b.s - a.s));
  for (const k of keys) out[k] = (a[k] ?? b[k]) + ((b[k] ?? a[k]) - (a[k] ?? b[k])) * t;
  return out;
}

/** Fahrende Objekte im Takt der Fahrt-Uhr (cfg.sync). */
export function clockSync(level, w, sync) {
  if (!w) return;
  for (const [id, t0] of Object.entries(sync ?? {})) {
    const f = level.named.get(id), pm = f?.pm;
    if (!pm || pm.mode === 'loop') continue;
    const L = pm.length, v = pm.speed, wait = pm.wait, tr = L / v, T = 2 * (tr + wait);
    const sAt = (u) => (u < wait ? 0 : u < wait + tr ? (u - wait) * v : u < 2 * wait + tr ? L : L - (u - 2 * wait - tr) * v);
    pm.step = function step() {
      const ox = this.pos.x, oy = this.pos.y, oz = this.pos.z;
      const u = (((w.clock + t0) % T) + T) % T;
      this.s = clamp(sAt(u), 0, L);
      this.dir = u >= wait && u < wait + tr ? 1 : -1;
      this.at(this.s, this.pos);
      this.delta.dx = this.pos.x - ox; this.delta.dy = this.pos.y - oy; this.delta.dz = this.pos.z - oz;
      return this.delta;
    };
    pm.syncT = T;
    pm.step(0);
    f.pos.set(pm.pos.x, pm.pos.y, pm.pos.z);
    f.placeShapes?.();
  }
}

/** Regie anmelden (aus Autoscroller.setup). */
export function installScrollDirector(arch, level, scene, cfg) {
  const w = level.scroll, rig = scene?.view?.rig;
  if (!w) return null;
  clockSync(level, w, cfg.sync);
  const camKeys = ['pitch', 'dist', 'fov', 'height'];
  const frameKeys = ['back', 'front', 'ahead', 'followX'];
  const cam = { pitch: 42, dist: 14, fov: 40, height: 1 };
  const fr = arch.frame;
  const st = { s: w.s, mode: fr.backMode, revealed: [], gated: 0, falls: 0, capped: 0 };
  if (rig && cfg.cams?.length) {
    const orig = rig.railAt.bind(rig);
    rig.railAt = (x, z, out = {}) => {
      if (w.state === 'done') return orig(x, z, out);
      sampleTable(cfg.cams, w.s, camKeys, cam);
      out.pitch = cam.pitch; out.dist = cam.dist; out.fov = cam.fov; out.height = cam.height;
      out.yaw = 0; out.lead = 1; out.ahead = 2; out.lockX = null; out.lockW = 0;
      return out;
    };
  }
  const gates = (cfg.gates ?? []).map((g) => ({ ...g, net: level.named.get(g.id) }));
  const reveals = (cfg.reveal ?? []).map((r) => ({ ...r, done: false }));
  const tableFrames = cfg.frames?.length ? cfg.frames : null;
  const apply = () => {
    if (tableFrames) sampleTable(tableFrames, w.s, frameKeys, fr);
    if (cfg.killUp !== undefined) fr.backMode = w.state !== 'done' && w.dir.y > cfg.killUp ? 'kill' : 'push';
    st.mode = fr.backMode;
  };
  apply();
  const figs = () => level.players ?? [level.player];
  level.onStep(() => {
    st.s = w.s;
    apply();
    if (arch.fstate) {
      for (const p of figs()) {
        if (!p?.fence || p.mode !== 'wall') continue;
        const fs = arch.fstate(p);
        if (fs?.inh) { fs.inh.x = 0; fs.inh.z = 0; }
      }
    }
    for (const g of gates) {
      if (!g.net) continue;
      if (w.state !== 'done' && w.s < g.open) { g.net.cool = Math.max(g.net.cool ?? 0, 0.05); st.gated++; }
    }
    for (const r of reveals) {
      if (r.done) continue;
      if ((r.at === 'done' && w.state === 'done') || (typeof r.at === 'number' && w.s >= r.at)) {
        r.done = true;
        level.named.get(r.id)?.reveal?.();
        st.revealed.push(r.id);
        if (r.sfx !== false) level.sfx('powerup_appear');
      }
    }
    const cap = cfg.cap;
    if (cap && w.state !== 'done' && w.s >= cap.s0 && w.s <= cap.s1) {
      for (const p of figs()) {
        if (!p || p.dead || p.removedFigure || p.mode === 'script') continue;
        if (p.pos.x < cap.x[0] || p.pos.x > cap.x[1] || p.pos.z < cap.z[0] || p.pos.z > cap.z[1]) continue;
        const top = w.center.y + cap.up;
        if (p.pos.y > top) { p.pos.y = top; if (p.vel.y > 0) p.vel.y = 0; st.capped++; }
      }
    }
    const f = cfg.fall;
    if (f && w.s >= f.minS) {
      for (const p of figs()) {
        if (!p || p.dead || p.removedFigure || p.mode === 'script') continue;
        if (p.pos.y < f.y && p.pos.x > f.x[0] && p.pos.x < f.x[1]) { st.falls++; p.die('fall'); }
      }
    }
  });
  return { st, info: () => ({ s: +w.s.toFixed(2), mode: st.mode, back: fr.back, front: fr.front, revealed: st.revealed.slice(), falls: st.falls }) };
}
