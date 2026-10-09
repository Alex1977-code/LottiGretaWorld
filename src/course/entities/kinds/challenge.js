// Zeit-Herausforderungen (Sonder-Bausteine): Auslösen → Münzen erscheinen für `time` s, alle einsammeln →
// Belohnung (meist grüner Stern). Zeitanzeige über der Figur (Sekunden + „gesammelt/gesamt“). Läuft die Zeit ab,
// verschwinden die übrigen Münzen; mit retry (Standard) lässt sich die Herausforderung erneut starten.
//
// starring – Sternenring (1-Burg): Durchlaufen → acht Sternmünzen (starcoin). Modell 'star_ring'.
// timering – Zeitring: Durchlaufen → blaue Münzen (bluecoin). Modell 'time_ring'.
// pswitch  – Druckschalter (statt P-Schalter, 1-3): Draufspringen/Stampfen → blaue Münzen. Modell 'push_switch'.
//
//   { kind: 'starring' | 'timering' | 'pswitch', pos: [x, y, z] (Fußpunkt),
//     yaw: Ringe – Durchlaufrichtung (Standard π/2 = entlang z, also quer zur Kamera gut sichtbar),
//     coins: [[x, y, z], …] | { from, to, n } | { pos, r, n } (Standard: Kreis r 3 um pos, n 8),
//     time: 10 (s), star: Index (Belohnung grüner Stern) | reward: Aktion (entities/gimmick.js; Standard
//     { star } bzw. 5 Münzen), retry: true, id?, hidden? }
//   Beispiel: { kind: 'starring', pos: [0, 0, -20], star: 0,
//               coins: { from: [-4, 0.3, -26], to: [4, 0.3, -34], n: 8 } }
//
// bluecoin / starcoin – Münzen der Herausforderung (meist von ihr erzeugt; einzeln: { kind, pos, hidden }).
//   Zählen als normale Münze (+1). Darstellung als Instanzen (Modelle 'coin_blue', 'star_coin').

import { Gimmick, countdown, playerOn, runAction, visDt } from '../gimmick.js';
import { getModel } from '../../models/index.js';

// ------------------------------------------------------------------ Münzen der Herausforderung

class ChallengeCoin extends Gimmick {
  constructor(level, spec, kind) {
    super(level, spec, kind);
    this.owner = spec.owner ?? null;
    this.half.set(0.38, 0.42, 0.38);
    const model = kind === 'starcoin' ? 'star_coin' : 'coin_blue';
    this.pool = level.view?.pool(model, () => getModel(model).root, { castShadow: false, capacity: 16 }) ?? null;
    this.idx = this.pool ? this.pool.alloc() : -1;
    this.phase = (this.pos.x * 1.3 + this.pos.z * 0.7) % 6.28;
    this.render(0, 0);
  }

  render(dt, t) {
    dt = visDt(this.level, this, dt);
    if (this.popT > 0) this.popT = Math.max(0, this.popT - dt);
    if (this.idx < 0) return;
    if (this.hidden) { this.pool.hide(this.idx); return; }
    const k = this.popT > 0 ? 1 - this.popT / 0.45 : 1;
    const blink = this.owner?.state === 'active' && this.owner.timeLeft < 3 && Math.floor(t * 8) % 2 === 0;
    if (blink) { this.pool.hide(this.idx); return; }
    this.pool.set(this.idx, this.pos.x, this.pos.y + Math.sin(t * 2.6 + this.phase) * 0.05, this.pos.z, t * 3 + this.phase, Math.min(1, 0.2 + k));
  }

  onPlayer() { this.collect(); return 'collect'; }
  onHit(kind) { if (kind === 'claw' || kind === 'mega' || kind === 'fire') this.collect(); }

  collect() {
    if (!this.alive || this.hidden) return;
    this.level.addCoins(1);
    this.level.sfx('coin');
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 0.45, z: this.pos.z }, 8);
    this.kill();
    this.owner?.onCoin?.(this);
  }

  dispose() {
    if (this.idx >= 0) this.pool.release(this.idx);
    this.idx = -1;
    super.dispose();
  }
}

// ------------------------------------------------------------------ Herausforderung

const LOOK = {
  starring: { model: 'star_ring', coin: 'starcoin', color: '#3ee05a', n: 8 },
  timering: { model: 'time_ring', coin: 'bluecoin', color: '#ff9a2e', n: 8 },
  pswitch: { model: 'push_switch', coin: 'bluecoin', color: '#5aa2ff', n: 8 },
};

/** Münzpositionen aus der Angabe coins. */
function coinSpots(spec, pos) {
  const c = spec.coins;
  if (Array.isArray(c) && Array.isArray(c[0])) return c;
  if (c?.from && c?.to) {
    const n = c.n ?? 8, out = [];
    for (let i = 0; i < n; i++) { const t = n === 1 ? 0.5 : i / (n - 1); out.push(c.from.map((a, k) => a + (c.to[k] - a) * t)); }
    return out;
  }
  const p = c?.pos ?? [pos.x, pos.y + 0.4, pos.z], r = c?.r ?? 3, n = c?.n ?? LOOK[spec.kind]?.n ?? 8;
  return Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [p[0] + Math.cos(a) * r, p[1], p[2] + Math.sin(a) * r]; });
}

class Challenge extends Gimmick {
  constructor(level, spec, kind) {
    super(level, spec, kind);
    this.look = LOOK[kind];
    this.ring = kind !== 'pswitch';
    this.time = spec.time ?? 10;
    this.retry = spec.retry !== false;
    this.spots = coinSpots({ ...spec, kind }, this.pos);
    this.reward = spec.reward ?? (spec.star !== undefined ? { star: spec.star } : { coins: 5 });
    this.state = 'idle';
    this.timeLeft = 0;
    this.got = 0;
    this.coins = [];
    this.rearm = 0;
    if (this.ring) {
      this.yaw = spec.yaw ?? Math.PI / 2;
      // Berührbereich: Scheibe Ø 2,1 m, 0,9 m dick in Durchlaufrichtung
      const ax = Math.abs(Math.cos(this.yaw)), az = Math.abs(Math.sin(this.yaw));
      this.half.set(ax * 0.45 + az * 1.05, 1.1, az * 0.45 + ax * 1.05);
    } else {
      this.half.set(0.5, 0.25, 0.5);
      this.touch = false;
      const p = this.pos;
      this.btn = this.addSolid({ type: 'box', min: [p.x - 0.5, p.y, p.z - 0.5], max: [p.x + 0.5, p.y + 0.55, p.z + 0.5], tag: 'pswitch' });
      this.wasOn = false;
    }
    if (level.view) this.setModel(getModel(this.look.model));
  }

  center(out = this._c) { return out.set(this.pos.x, this.pos.y + (this.ring ? 1.1 : 0.25), this.pos.z); }

  onPlayer() {
    if (this.ring && this.state === 'idle' && this.rearm <= 0) this.begin();
    return 'none';
  }

  onPound() { if (!this.ring) this.begin(); }

  begin() {
    if (this.state !== 'idle' || this.hidden) return;
    this.state = 'active';
    this.timeLeft = this.time;
    this.got = 0;
    for (const c of this.coins) if (c.alive) c.kill();
    this.coins = this.spots.map((p) => this.level.spawn(this.look.coin, { pos: p, owner: this })).filter(Boolean);
    for (const c of this.coins) c.popT = 0.45;
    this.level.sfx(this.ring ? 'switch' : 'slam');
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 1, z: this.pos.z }, 14);
    if (!this.ring) {
      // Knopf ist gedrückt: Form flach
      const s = this.btn; s.max = [s.x1, this.pos.y + 0.18, s.z1]; s.min = [s.x0, this.pos.y, s.z0];
      if (s.id) this.level.world.update(s.id);
    }
  }

  onCoin() {
    if (this.state !== 'active') return;
    this.got++;
    if (this.got >= this.coins.length) this.succeed();
  }

  succeed() {
    this.state = 'done';
    countdown(this.level).hide(this);
    this.level.sfx('key');
    const r = this.reward;
    const rp = r && !Array.isArray(r) && r.pos ? r.pos : [this.pos.x, this.pos.y + 0.6, this.pos.z];
    runAction(this.level, r, { pos: rp, source: this });
  }

  fail() {
    for (const c of this.coins) if (c.alive) c.kill();
    this.coins = [];
    countdown(this.level).hide(this);
    this.level.sfx('vanish');
    this.state = this.retry ? 'idle' : 'done';
    this.rearm = 1.0;
    if (!this.ring) {
      const s = this.btn; s.max = [s.x1, this.pos.y + 0.55, s.z1]; s.min = [s.x0, this.pos.y, s.z0];
      if (s.id) this.level.world.update(s.id);
      this.wasOn = true;
    }
  }

  update(dt) {
    if (this.rearm > 0) this.rearm -= dt;
    if (!this.ring && this.state === 'idle') {
      const on = playerOn(this.level, this);
      if (on && !this.wasOn && this.rearm <= 0 && this.level.player.lastLandVy < -2) this.begin();
      this.wasOn = on;
    }
    if (this.state !== 'active') return;
    this.timeLeft -= dt;
    countdown(this.level).show(this, this.timeLeft, `${this.got}/${this.coins.length}`, this.look.color);
    if (this.timeLeft <= 0) this.fail();
  }

  modelState() {
    if (!this.ring) return { anim: this.state === 'idle' ? 'idle' : 'pressed' };
    return { anim: this.state, progress: this.state === 'active' ? this.timeLeft / this.time : 1 };
  }

  dispose() {
    countdown(this.level).hide(this);
    super.dispose();
  }
}

const make = (kind) => (level, spec) => new Challenge(level, spec, kind);
const coin = (kind) => (level, spec) => new ChallengeCoin(level, spec, kind);

export const KINDS = {
  starring: make('starring'),
  timering: make('timering'),
  pswitch: make('pswitch'),
  bluecoin: coin('bluecoin'),
  starcoin: coin('starcoin'),
};
