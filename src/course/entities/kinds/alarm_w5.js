// Suchkopf-Welle – Welt 5 (5-7 „Schleich-Festung: Suchscheinwerfer; entdeckt → Suchkopf-Kanonen feuern“).
//
// suchkopf_welle – unsichtbarer Leitstand. Meldet ein Suchscheinwerfer „entdeckt“ (Signal `signal`, Standard 'alarm' –
// level.onSignal; mit lights nur die genannten Scheinwerfer über ihr onDetect), feuert eine **Welle**: jede Kanone aus
// cannons (vorhandene `kanone_turm`, am besten mit active: false und shot: 'suchkopf') wird für shots Schüsse scharf
// geschaltet (Abstand every s, Versatz stagger s je Kanone; Ankündigung wie gewohnt: Rohr zittert 0,5 s), danach wieder
// still; zusätzlich (oder ohne Kanonen) starten an den Punkten from Köpfe direkt (Funken + sfx 'bullet' als Ankündigung
// 0,4 s vorher). Nach der Welle cooldown s Ruhe – Alarme in dieser Zeit verpuffen (ignored zählt mit), danach wieder
// bereit. Die Köpfe sind gewöhnliche suchkopf/projektilkopf-Entitäten (draufspringen, ausweichen).
// Daten: { kind: 'suchkopf_welle', id?, signal?: 'alarm' | ['alarm', …], lights?: ['licht1', …], cannons?: ['k1', …],
//          shots?: 3, every?: 1.2 (≥ 1,1 s je Kanone), stagger?: 0.35, cooldown?: 4, range?: 40 (Reichweite der Kanonen
//          während der Welle), from?: [{ pos: [x, y, z] (Unterkante des Kopfs), dir: [dx, dz], shot?: 'suchkopf' }, …],
//          shot?: 'suchkopf', speed?, seek?, turn?, life?, breaks? (für die from-Köpfe; Kanonen: eigenes breaks),
//          onWave?: Aktion (je Welle) }
// Laufzeit: state ('ready' | 'wave' | 'cool'), waves, ignored, fired (Köpfe der from-Punkte), shotsBy (je Kanone in der
//   letzten Welle), trigger(data) (Welle von Hand), info().

import { CourseEntity } from '../CourseEntity.js';
import { runAction } from '../gimmick.js';

const LIST = (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);

class SuchkopfWelle extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'suchkopf_welle');
    this.touch = false;
    this.shadow = 0;
    this.shots = Math.max(1, spec.shots ?? 3);
    this.every = Math.max(1.1, spec.every ?? 1.2);
    this.stagger = spec.stagger ?? 0.35;
    this.cooldown = spec.cooldown ?? 4;
    this.range = spec.range ?? 40;
    this.from = LIST(spec.from).filter((f) => Array.isArray(f?.pos));
    this.state = 'ready';
    this.t = 0;
    this.waves = 0;
    this.ignored = 0;
    this.fired = 0;
    this.active = [];        // [{ c, shot0, saved }]
    this.queue = [];         // from-Köpfe: [{ t, f, warned }]
    this.shotsBy = {};
    this.offs = [];
    const lights = LIST(spec.lights);
    if (!lights.length) {
      for (const name of LIST(spec.signal ?? 'alarm')) { const off = level.onSignal?.(name, (data) => this.trigger(data)); if (off) this.offs.push(off); }
    } else {
      // Scheinwerfer erst nach dem Aufbau anmelden (sie können nach dieser Entität entstehen)
      queueMicrotask(() => {
        if (this.removed) return;
        for (const id of lights) {
          const l = level.named.get(id);
          if (l?.onDetect) this.offs.push(l.onDetect((info) => this.trigger(info)));
          else console.warn(`[suchkopf_welle] Suchscheinwerfer „${id}“ fehlt`);
        }
      });
    }
  }

  cannons() {
    return LIST(this.spec.cannons).map((id) => this.level.named.get(id)).filter((c) => c && !c.removed && !c.defeated && typeof c.setActive === 'function');
  }

  /** Welle auslösen (Signal/Suchscheinwerfer oder von Hand). → true, wenn sie startet. */
  trigger(data = null) {
    if (this.removed) return false;
    if (this.state !== 'ready') { this.ignored++; return false; }
    this.state = 'wave';
    this.t = 0;
    this.waves++;
    this.shotsBy = {};
    this.active = this.cannons().map((c, i) => {
      const saved = { interval: c.interval, range: c.range, maxHeads: c.maxHeads, active: c.active };
      c.interval = this.every;
      c.range = Math.max(c.range, this.range);
      c.maxHeads = Math.max(c.maxHeads, this.shots);
      c.active = true;
      if (c.state === 'idle') c.cool = i * this.stagger;
      return { c, shot0: c.shots, saved, done: false, id: c.spec?.id ?? `k${i}` };
    });
    this.queue = [];
    for (let k = 0; k < this.shots; k++) this.from.forEach((f, j) => this.queue.push({ t: 0.45 + k * this.every + j * this.stagger, f, warned: false }));
    this.level.sfx('panic');
    if (this.spec.onWave) runAction(this.level, this.spec.onWave, { pos: data?.pos ?? [this.pos.x, this.pos.y, this.pos.z], source: this });
    return true;
  }

  update(dt) {
    if (this.state === 'cool') {
      this.t += dt;
      if (this.t >= this.cooldown) { this.state = 'ready'; this.t = 0; }
      return;
    }
    if (this.state !== 'wave') return;
    this.t += dt;
    let open = 0;
    for (const a of this.active) {
      if (a.done) continue;
      const n = a.c.shots - a.shot0;
      this.shotsBy[a.id] = n;
      if (n >= this.shots || a.c.removed || a.c.defeated) { this.release(a); continue; }
      open++;
    }
    for (const q of this.queue) {
      if (q.fired) continue;
      if (!q.warned && this.t >= q.t - 0.4) { q.warned = true; const p = q.f.pos; this.level.effects?.sparks({ x: p[0], y: p[1] + 0.4, z: p[2] }, 6); this.level.sfx('fuse'); }
      if (this.t >= q.t) { q.fired = true; this.fire(q.f); }
      else open++;
    }
    // fertig (oder Zeit um: Kanonen ohne Ziel in Reichweite)
    if (!open || this.t > this.shots * this.every + 5) {
      for (const a of this.active) if (!a.done) this.release(a);
      this.state = 'cool';
      this.t = 0;
    }
  }

  release(a) {
    a.done = true;
    const c = a.c;
    c.interval = a.saved.interval; c.range = a.saved.range; c.maxHeads = a.saved.maxHeads;
    if (!c.removed && !c.defeated) c.setActive(a.saved.active);
  }

  fire(f) {
    const kind = f.shot ?? this.spec.shot ?? 'suchkopf';
    const spec = { pos: f.pos, dir: f.dir ?? [0, 1] };
    for (const k of ['speed', 'seek', 'turn', 'life', 'breaks']) if (this.spec[k] !== undefined) spec[k] = this.spec[k];
    const h = this.level.spawn(kind, spec);
    if (h) this.fired++;
    this.level.sfx('bullet');
    this.level.effects?.dust({ x: f.pos[0], y: f.pos[1], z: f.pos[2] }, 4, 0.9);
  }

  info() { return { state: this.state, waves: this.waves, ignored: this.ignored, fired: this.fired, shotsBy: { ...this.shotsBy }, t: +this.t.toFixed(2) }; }

  dispose() {
    for (const off of this.offs) off?.();
    this.offs.length = 0;
    for (const a of this.active) if (!a.done) this.release(a);
    super.dispose();
  }
}

export const KINDS = { suchkopf_welle: (level, spec) => new SuchkopfWelle(level, spec) };
