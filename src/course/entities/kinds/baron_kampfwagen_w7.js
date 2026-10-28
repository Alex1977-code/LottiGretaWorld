// Baron Brummbär im Kampfwagen – Endgegner Welt 7 (7-Burg „Lava-Festung“, zweites Duell mit dem Erzfeind) mit seiner Boss-Straße
// und den Stachelfallen. Eigene Gestaltung (Modelle 'baron_kampfwagen', 'kampfwagen_strasse'; zur Flucht 'baron_brummbaer' ohne
// Auto). Muster: Baron-Kampf aus 1-Burg – aber auf einer **echten Autoscroll-Straße** über Lava statt Laufband.
//
// ---------------------------------------------------------------------------------------------------------------------------------
// kampfwagen_strasse – Boss-Straße (≈ 150 m) über einem Lavasee, verläuft nach −Z.
//   Basalt-Fahrbahn (Platten des Modells, Mittellinie, Randsteine) mit Kollision; **Lavalücken** quer über die ganze Breite (Bruch-
//   kanten, glühende Lava 1,2 m tiefer – hineinfallen = Lava), **Mittellücken** (durchgehende Lücke in der Mitte, links und rechts
//   bleibt je eine Fahrspur), **Stachelfallen** (Entität 'stachelfalle', vom Endgegner getaktet). Unsichtbare Leitplanken an den
//   Außenkanten (1,2 m, camIgnore; nicht über Lücken), damit niemand seitlich hinunterfällt (rails: false = keine).
//   Daten: { kind: 'kampfwagen_strasse', id: 'strasse', from: [x, y, z] (Mitte der Oberkante am Anfang), length?: 150, width?: 12,
//            thick?: 1.2, depth?: 1.5 (Tiefe der Bruchkanten), rails?: true,
//            gaps?: [{ at (m ab dem Anfang, Lückenmitte), width?: 3 }],
//            middle?: [{ from (m), to (m), width?: 2 }],
//            traps?: [{ at (m), x?: 0 (seitlich zur Mitte), size?: [2, 3] (x, z), phase?: 0..1 (Versatz im Takt) }] }
//   Schnittstelle: top, cx, z0, z1, W, solidAt(x, z), gapsBetween(zHi, zLo) → [{ z, w, near, far }], midAt(zHi, zLo) → { half } | null,
//   trapsOn, trapPeriod, clock, traps (Entitäten), info().
//
// stachelfalle – Stahlplatte mit Lochraster und Warnstreifen; Stacheln fahren im Takt heraus (Vorwarnung: Lampen blinken, Stacheln
//   zucken – warn s; draußen up s). Draußen: **jede Berührung von oben bzw. Hineinlaufen verletzt** (bis 0,65 m über der Platte).
//   Gesteuert von einer Boss-Straße (ctrl: Takt = Phase des Barons, nur im Kampf) oder frei (period).
//   Daten: { kind: 'stachelfalle', pos: [x, y, z] (Mitte der Oberseite), size?: [2, 3], period?: 3.2, up?: 1.2, warn?: 0.8,
//            phase?: 0..1, active?: true, yaw? }  Laufzeit: state ('down' | 'warn' | 'up'), upK (0..1), cycles, info().
//
// ---------------------------------------------------------------------------------------------------------------------------------
// baron_kampfwagen – Baron Brummbär im gepanzerten roten Kampfwagen (Wagen ≈ 5,4 × 2,7 m, blickt zur Figur, fährt rückwärts vor
//   ihr die Straße entlang).
//   Ablauf: wait (unsichtbar) → begin(): intro (2,4 s, der Wagen braust heran und bremst) → **Autoscroll**: das Kampffenster
//   wandert mit speed m/s (je Phase) die Straße entlang; der Wagen fährt an seiner Vorderkante, die Figur muss mithalten – bleibt
//   sie window m hinter dem Wagen zurück, **schiebt die Fenstergrenze sie vorwärts** (auch in Lücken!); am Wagen vorbei kommt sie
//   nicht. Kommt eine Lavalücke, **springt der Wagen hinüber** (0,9 s Bogen) und wartet drüben, bis das Fenster nachkommt; über
//   Mittellücken fährt er mittig (Räder auf beiden Spuren). Am Straßenende (Endplatz, endHold m vor dem Ende) bleibt das Fenster
//   stehen; der Kampf geht dort weiter.
//   Angriffe (drive → throw | fire → drive …, alle every s): **Kickbomben werfen** (Ausholen, bei der Hälfte verlässt die Bombe die
//   Tatze – model.hand(); 1 bzw. 2 Bomben 1,6 m vor die Figur, nie in eine Lücke; Landemarke) – jede shortEvery-te Bombe landet
//   **kurz vor der Explosion** (Lunte shortFuse s statt fuse s) –, **Feuer spucken** (Kanone: laden, Feuerstoß aus model.muzzle(),
//   jeder fire-te Angriff; fireShots Kugeln, ab Phase 2 als Fächer = Feuerstoß). Die **Stachelfallen** der Straße fahren im Takt
//   traps s aus (Phase 3 öfter).
//   **Treffer: zurückgekickte (oder geworfene) Kickbomben** (onBombHit; Zielhilfe: gekickte Bomben, die grob auf den Wagen zu
//   rollen, lenken ein, rollen bis zu ihm und hüpfen über Lavalücken) → hit (0,6 s, Zylinder fliegt) → stunned (1,1 s) → drive.
//   **Wurfsichel = Zusatzschaden** (onSichelHit): jeder Sichel-Treffer ist ein Kratzer (Lebensleiste: goldene Punkte =
//   carHits), sichel Kratzer = ein Treffer.
//   9 Treffer in 3 Phasen (je 3): Phase 2 mehr Bomben (Doppelwurf) und Feuerstoß, Phase 3 schneller und Stachelfallen öfter.
//   Ansagen: „Kick die Bomben zurück!“ (Archetyp), „Mehr Bomben – und ein Feuerstoß!“, „Er wird schneller – Vorsicht, Stacheln!“,
//   „Vorsicht – gleich explodiert sie!“ (erste kurze Lunte), „Kratzer!“ (Sichel). Draufspringen = Abprall ohne Schaden; Feuer,
//   Krallen, Panzer, Stern, Riese, Explosionen daneben zählen nicht. Berührung des Wagens verletzt.
//   Besiegt → defeated (2,2 s: Wagen bremst, sackt schief ab und qualmt dicht, eigene Bomben verpuffen, Fanfare über den Archetyp)
//   → flee (3,0 s: der Baron springt aus dem qualmenden Wagen und hüpft schwindelig davon, den Zylinder in der Tatze – lustig) →
//   gone (Stern star erscheint; Archetyp: Warp-Box). Tod im Kampf (reset): Baron 9/9, Wagen und Fenster zurück zum Anfang,
//   Bomben/Feuerkugeln weg, Stachelfallen eingefahren, Kampf beim nächsten Betreten von vorn.
//   Daten: { kind: 'baron_kampfwagen', id: 'baron', road: 'strasse' (Id der Boss-Straße), pos: [x, y, z] (Wagenmitte beim
//            Kampfbeginn), hp?: 9, window?: 14, speed?: [2.4, 2.8, 3.2], lane?: [-3.6, 3.6], endHold?: 9,
//            every?: [2.7, 2.3, 2.0], bombs?: [1, 2, 2], shortEvery?: [4, 3, 2], flight?: 1.0, fuse?: 2.8, shortFuse?: 1.0,
//            fire?: [3, 2, 2] (jeder n-te Angriff), fireShots?: [1, 3, 3], fireSpeed?: 7, traps?: [3.4, 3.0, 2.0],
//            sichel?: 2, star?: { pos, index } | [x, y, z], wakeR?: 12, seed? }
//   boss: { id: 'baron', name: 'Baron Brummbär', speed: 0, trigger, lock?, warp, warpPos, warpTo, frame: 0.5, center }
//   Schnittstelle wie Graf Brummbär / Schubser-Prinz: begin, reset, state, stateT, hp, maxHp, phase, visible, home (= Wagenmitte,
//   wandert mit – Kampfkamera), half, carHits (Sichel-Kratzer), vulnerable, info(); level.onBossHit(boss, 'bombe' | 'sichel'),
//   level.onBossDefeated(boss); boss: true, kein enemy. Laufzeit: s (gefahrene Fenster-Strecke), frontZ, backZ, throws, bombsThrown,
//   shortBombs, fires, fireballs, jumps, pushes (Fenster schob die Figur), hits, hitLog, sichelHits, bounces, info().
// Sound: 'panic' (Auftritt), 'slam', 'swoop' (Wurf), 'cannon' (Feuer), 'fireball', 'boss_hit', 'stomp', 'blockhit' (Kratzer),
//   'bounce', 'powerdown', 'hop', 'land', 'switch' (Stachelfalle warnt), 'kick'.

import * as THREE from 'three';
import { CourseEntity } from '../CourseEntity.js';
import { activeFigure, figures, localOffset, toWorld } from '../EnemyW2.js';
import { getModel } from '../../models/index.js';
import { ballistic, LandingMarkers } from './bomb_cannon.js';
import { Lcg, bossManaged } from '../w6help.js';
import { spawnLoot } from '../Enemy.js';

const TAU = Math.PI * 2;
const YAW = -Math.PI / 2;                  // Wagen blickt nach +Z (zur Figur)
const INTRO = 2.4, THROW = 1.0, RELEASE = 0.5, FIRE = 0.8, FIRE_AT = 0.45, HIT = 0.6, STUN = 1.1, DEFEAT = 2.2, FLEE = 3.0, JUMP = 0.9;
const HALF_L = 2.75, HALF_W = 1.6, HALF_H = 1.5;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ease = (k) => 1 - (1 - k) * (1 - k) * (1 - k);
const pick = (v, ph, def) => (Array.isArray(v) ? v[Math.min(v.length - 1, ph - 1)] : v ?? def[ph - 1]);

// =====================================================================================================================
// Boss-Straße
// =====================================================================================================================
class KampfwagenStrasse extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'kampfwagen_strasse');
    this.touch = false;
    this.shadow = 0;
    this.half.set(0.1, 0.1, 0.1);
    const f = spec.from ?? [0, 0, 0];
    this.cx = f[0]; this.top = f[1]; this.z0 = f[2];
    this.L = spec.length ?? 150;
    this.z1 = this.z0 - this.L;
    this.W = spec.width ?? 12;
    this.T = spec.thick ?? 1.2;
    this.D = spec.depth ?? 1.5;
    this.gaps = (spec.gaps ?? []).map((g) => ({ a: g.at, w: g.width ?? 3 })).sort((a, b) => a.a - b.a);
    this.mids = (spec.middle ?? []).map((m) => ({ a0: Math.min(m.from, m.to), a1: Math.max(m.from, m.to), w: m.width ?? 2 }));
    this.trapsOn = false;
    this.trapPeriod = 3.4;
    this.clock = 0;
    this.models = [];
    this.traps = [];
    this.build();
    for (const [i, t] of (spec.traps ?? []).entries()) {
      const e = level.spawn('stachelfalle', { pos: [this.cx + (t.x ?? 0), this.top, this.z0 - t.at], size: t.size ?? [2, 3], phase: t.phase ?? (i * 0.37) % 1, ctrl: this });
      if (e) this.traps.push(e);
    }
  }

  zAt(a) { return this.z0 - a; }

  /** Feste Fahrbahn-Stücke entlang der Straße: [{ a0, a1, mid: { w } | null, gapStart, gapEnd }]. */
  pieces() {
    const solid = [];
    let a = 0;
    for (const g of this.gaps) {
      const g0 = g.a - g.w / 2, g1 = g.a + g.w / 2;
      if (g0 > a) solid.push([a, g0, a > 0, true]);
      a = Math.max(a, g1);
    }
    if (a < this.L) solid.push([a, this.L, a > 0, false]);
    const out = [];
    for (const [s0, s1, gs, ge] of solid) {
      // an Mittellücken aufteilen
      const cuts = [s0, s1];
      for (const m of this.mids) { if (m.a0 > s0 && m.a0 < s1) cuts.push(m.a0); if (m.a1 > s0 && m.a1 < s1) cuts.push(m.a1); }
      cuts.sort((x, y) => x - y);
      for (let i = 0; i < cuts.length - 1; i++) {
        const p0 = cuts[i], p1 = cuts[i + 1];
        if (p1 - p0 < 1e-3) continue;
        const mid = this.mids.find((m) => m.a0 <= p0 + 1e-3 && m.a1 >= p1 - 1e-3) ?? null;
        out.push({ a0: p0, a1: p1, mid, gapStart: gs && i === 0, gapEnd: ge && i === cuts.length - 2 });
      }
    }
    return out;
  }

  build() {
    const lv = this.level, W = this.W, T = this.T, D = this.D, top = this.top, cx = this.cx;
    const rails = this.spec.rails !== false;
    const addBox = (min, max, extra = {}) => this.addShape({ type: 'box', min, max, tag: 'bossstrasse', ...extra });
    const addModel = (opts, x, z, yaw) => {
      if (!lv.view) return null;
      const m = getModel('kampfwagen_strasse', opts);
      m.root.position.set(x, top, z);
      m.root.rotation.y = yaw;
      lv.view.add(m.root);
      this.models.push(m);
      return m;
    };
    for (const p of this.pieces()) {
      const za = this.zAt(p.a0), zb = this.zAt(p.a1);     // za > zb
      const lanes = p.mid ? [[-W / 2, -p.mid.w / 2], [p.mid.w / 2, W / 2]] : [[-W / 2, W / 2]];
      for (const [x0, x1] of lanes) {
        addBox([cx + x0, top - T, zb], [cx + x1, top, za]);
        if (rails) {
          if (x0 <= -W / 2 + 1e-3) addBox([cx + x0 - 0.3, top, zb], [cx + x0, top + 1.2, za], { camIgnore: true, tag: 'bossstrasse-planke' });
          if (x1 >= W / 2 - 1e-3) addBox([cx + x1, top, zb], [cx + x1 + 0.3, top + 1.2, za], { camIgnore: true, tag: 'bossstrasse-planke' });
        }
      }
      // Fahrbahn-Platten (Stücke ≤ 12 m; an Lücken reicht die Bruchkante D m in die Straße)
      const v0 = p.a0 + (p.gapStart ? D : 0), v1 = p.a1 - (p.gapEnd ? D : 0);
      if (v1 - v0 < 0.2) continue;
      const n = Math.max(1, Math.ceil((v1 - v0) / 12));
      const len = (v1 - v0) / n;
      for (let i = 0; i < n; i++) {
        const zc = this.zAt(v0 + (i + 0.5) * len);
        if (p.mid) {
          const lw = W / 2 - p.mid.w / 2 - D;
          if (lw > 0.3) for (const s of [-1, 1]) addModel({ kind: 'fahrbahn', length: len, width: lw, thick: 0.5 }, cx + s * (W / 2 - lw / 2), zc, Math.PI / 2);
        } else addModel({ kind: 'fahrbahn', length: len, width: W, thick: 0.5 }, cx, zc, Math.PI / 2);
      }
    }
    // Lavalücken quer: Bruchkanten + Lava 1,2 m tiefer (Kollision: Lava)
    for (const g of this.gaps) {
      const zc = this.zAt(g.a);
      addModel({ kind: 'luecke', width: g.w, length: W, depth: D }, cx, zc, Math.PI / 2);
      addBox([cx - W / 2 - 1, top - 1.7, zc - g.w / 2], [cx + W / 2 + 1, top - 1.15, zc + g.w / 2], { kill: 'lava', tag: 'bossstrasse-lava' });
    }
    // Mittellücken: Bruchkanten längs, Lava dazwischen
    for (const m of this.mids) {
      const za = this.zAt(m.a0), zb = this.zAt(m.a1);
      addModel({ kind: 'luecke', width: m.w, length: m.a1 - m.a0, depth: D }, cx, (za + zb) / 2, 0);
      addBox([cx - m.w / 2, top - 1.7, zb], [cx + m.w / 2, top - 1.15, za], { kill: 'lava', tag: 'bossstrasse-lava' });
    }
  }

  /** Steht hier feste Fahrbahn (nicht in einer Lücke)? */
  solidAt(x, z, pad = 0) {
    const a = this.z0 - z;
    if (a < pad || a > this.L - pad || Math.abs(x - this.cx) > this.W / 2 - pad) return false;
    for (const g of this.gaps) if (Math.abs(a - g.a) < g.w / 2 + pad) return false;
    for (const m of this.mids) if (a > m.a0 - pad && a < m.a1 + pad && Math.abs(x - this.cx) < m.w / 2 + pad) return false;
    return true;
  }

  /** Querlücken zwischen zHi und zLo (zHi > zLo) → [{ z, w, near (Kante bei größerem z), far }]. */
  gapsBetween(zHi, zLo) {
    const out = [];
    for (const g of this.gaps) {
      const z = this.zAt(g.a);
      if (z + g.w / 2 >= zLo && z - g.w / 2 <= zHi) out.push({ z, w: g.w, near: z + g.w / 2, far: z - g.w / 2 });
    }
    return out;
  }

  /** Mittellücke im z-Bereich [zLo, zHi] → { half } | null. */
  midAt(zHi, zLo = zHi) {
    for (const m of this.mids) {
      const za = this.zAt(m.a0), zb = this.zAt(m.a1);
      if (zLo <= za && zHi >= zb) return { half: m.w / 2, za, zb };
    }
    return null;
  }

  resetTraps() {
    this.trapsOn = false;
    this.clock = 0;
    for (const t of this.traps) t.resetTrap?.();
  }

  update(dt) {
    if (this.trapsOn) this.clock += dt;
  }

  render(dt) {
    for (const m of this.models) m.update(dt, { anim: 'idle' });
  }

  info() { return { length: this.L, gaps: this.gaps.length, middle: this.mids.length, traps: this.traps.length, on: this.trapsOn, period: this.trapPeriod, clock: +this.clock.toFixed(2) }; }

  dispose() {
    for (const m of this.models) { this.level.view?.remove(m.root); m.dispose?.(); }
    this.models = [];
    super.dispose();
  }
}

// =====================================================================================================================
// Stachelfalle
// =====================================================================================================================
class Stachelfalle extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'stachelfalle');
    this.touch = false;
    this.shadow = 0;
    const sz = spec.size ?? [2, 3];
    this.sx = sz[0]; this.sz = sz[1];
    this.half.set(this.sx / 2, 0.35, this.sz / 2);
    this.ctrl = spec.ctrl ?? null;
    this.period = spec.period ?? 3.2;
    this.upT = spec.up ?? 1.2;
    this.warnT = spec.warn ?? 0.8;
    this.phase = ((spec.phase ?? 0) % 1 + 1) % 1;
    this.active = spec.active !== false;
    this.yaw = spec.yaw ?? 0;
    this.clock = 0;
    this.state = 'down';
    this.upK = 0;
    this.cycles = 0;
    this.hurts = 0;
    if (level.view) {
      this.setModel(getModel('kampfwagen_strasse', { kind: 'stachelfalle', size: [this.sx, this.sz] }));
    }
  }

  resetTrap() { this.clock = 0; this.state = 'down'; this.upK = 0; }

  update(dt) {
    const c = this.ctrl;
    const on = c ? c.trapsOn : this.active;
    const period = Math.max(this.upT + this.warnT + 0.4, c ? c.trapPeriod : this.period);
    let st = 'down';
    if (on) {
      if (!c) this.clock += dt;
      const t = ((c ? c.clock : this.clock) + this.phase * period) % period;
      if (t >= period - this.upT) st = 'up';
      else if (t >= period - this.upT - this.warnT) st = 'warn';
    }
    if (st !== this.state) {
      if (st === 'warn') this.level.sfx('switch');
      if (st === 'up') { this.cycles++; this.level.sfx('slam'); }
      this.state = st;
    }
    this.upK = st === 'up' ? Math.min(1, this.upK + dt / 0.12) : Math.max(0, this.upK - dt / 0.25);
    if (this.upK > 0.5) this.hurtFigures();
  }

  /** Figuren auf/in der Falle (Füße über der Platte, bis 0,65 m hoch) verletzen. */
  hurtFigures() {
    const c = Math.cos(this.yaw), s = Math.sin(this.yaw);
    for (const p of figures(this.level)) {
      if (!activeFigure(p) || p.invuln > 0) continue;
      const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z;
      const lx = dx * c - dz * s, lz = dx * s + dz * c;
      if (Math.abs(lx) > this.sx / 2 + p.half.x * 0.6 || Math.abs(lz) > this.sz / 2 + p.half.z * 0.6) continue;
      if (p.pos.y > this.pos.y + 0.65 * this.upK || p.pos.y < this.pos.y - 0.6) continue;
      if (p.hurt(this)) this.hurts++;
    }
  }

  onPlayer() { return 'none'; }

  modelState() { return { anim: 'idle', up: this.upK, warn: this.state === 'warn' }; }

  syncModel() {
    if (!this.model) return;
    this.model.root.position.set(this.pos.x, this.pos.y + 0.012, this.pos.z);
    this.model.root.rotation.y = this.yaw;
  }

  info() { return { state: this.state, up: +this.upK.toFixed(2), cycles: this.cycles, hurts: this.hurts }; }
}

// =====================================================================================================================
// Baron Brummbär im Kampfwagen
// =====================================================================================================================
const RUN = new Set(['drive', 'throw', 'fire', 'hit', 'stunned']);
const ATTACK = new Set(['drive', 'throw', 'fire']);

class BaronKampfwagen extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'baron_kampfwagen');
    this.enemy = false;
    this.boss = true;
    this.half.set(HALF_W, HALF_H, HALF_L);
    this.shadow = 0;
    this.start = this.pos.clone();
    this.home = this.pos.clone();
    this.yaw = YAW;
    this.maxHp = spec.hp ?? 9;
    this.hp = this.maxHp;
    this.lane = spec.lane ?? [-3.6, 3.6];
    this.window = spec.window ?? 14;
    this.endHold = spec.endHold ?? 9;
    this.sichelPer = Math.max(1, spec.sichel ?? 2);
    this.wakeR = spec.wakeR ?? 12;
    this.markers = new LandingMarkers(level);
    this.bombs = [];
    this.fires = [];
    this.visible = false;
    this.touch = false;
    this.fleeBear = null;
    this.carBear = null;
    let model = null;
    if (level.view) {
      model = this.setModel(getModel('baron_kampfwagen'));
      model.root.visible = false;
      // Bär im Wagen (für die Flucht ausblenden) – Gelenk am Sitz; fehlt es, bleibt er sitzen
      const car = model.root.children[0];
      this.carBear = car?.children?.find((o) => o.isGroup && Math.abs(o.position.x + 0.55) < 0.02 && Math.abs(o.position.y - 1.32) < 0.02) ?? null;
    }
    this.handOff = localOffset('baron_kampfwagen:hand', model, { anim: 'throw', progress: RELEASE, hp: 9 }, (o) => model.hand(o), { x: 0.05, y: 2.9, z: 0.7 });
    this.muzzleOff = localOffset('baron_kampfwagen:muzzle', model, { anim: 'fire', progress: FIRE_AT, hp: 9 }, (o) => model.muzzle(o), { x: 2.6, y: 2.2, z: 0 });
    this.resetFields();
  }

  resetFields() {
    this.state = 'wait';
    this.stateT = 0;
    this.clock = 0;
    this.s = 0;
    this.v = 0;
    this.pos.copy(this.start);
    this.home.copy(this.start);
    this.carY = 0;
    this.steer = 0;
    this.shake = 0;
    this.defeated = false;
    this.carHits = 0;
    this.sichelHits = 0;
    this.sichelSeen = new WeakSet();
    this.attackCool = 1.4;
    this.attacks = 0;
    this.throws = 0; this.bombsThrown = 0; this.shortBombs = 0; this.fires = []; this.firesN = 0; this.fireballs = 0; this.jumps = 0;
    this.pushes = 0; this.hits = 0; this.hitLog = []; this.bounces = 0;
    this.released = false;
    this.hitGrace = 0; this.sichelGrace = 0;
    this.jump = null;
    this.hinted = {};
    this.starDone = false; this.dropped = false;
    this.flee = null;
    this.rnd = new Lcg(this.spec.seed ?? 0xb7a9);
  }

  get road() {
    if (this._road && !this._road.removed) return this._road;
    const r = this.spec.road ? this.level.named.get(this.spec.road) : this.level.entities.find((e) => e.kind === 'kampfwagen_strasse');
    this._road = r ?? null;
    return this._road;
  }

  get phase() { return clamp(1 + Math.floor((this.maxHp - this.hp) / 3), 1, 3); }
  val(key, def) { return pick(this.spec[key], this.phase, def); }
  get managed() { return bossManaged(this.level, this.spec.id); }
  get running() { return RUN.has(this.state); }
  get vulnerable() { return this.hp > 0 && (ATTACK.has(this.state) || this.state === 'stunned'); }
  /** Vorderkante des Kampffensters (Soll-Lage der Wagenmitte) und hintere Grenze. */
  get frontZ() { return this.start.z - this.s; }
  get backZ() { return this.frontZ + this.window; }
  get sMax() { const r = this.road; return r ? Math.max(0, this.start.z - (r.z1 + this.endHold)) : 1e9; }

  setState(s) { this.state = s; this.stateT = 0; this.released = false; }

  // ------------------------------------------------------------------ Archetyp-Schnittstelle

  begin() {
    if (this.state !== 'wait') return;
    this.visible = true;
    if (this.model) this.model.root.visible = true;
    this.pos.set(this.start.x, this.start.y, this.start.z - 30);
    this.setState('intro');
    this.level.sfx('panic');
  }

  reset() {
    for (const b of this.bombs) if (!b.removed) b.kill();
    this.bombs.length = 0;
    for (const f of this.fires) if (!f.removed) f.kill();
    this.markers.clear();
    this.road?.resetTraps();
    this.removeFleeBear();
    if (this.carBear) this.carBear.visible = true;
    this.visible = false;
    this.touch = false;
    if (this.model) this.model.root.visible = false;
    this.hp = this.maxHp;
    this.resetFields();
  }

  // ------------------------------------------------------------------ Schritt

  update(dt) {
    this.stateT += dt;
    this.clock += dt;
    if (this.hitGrace > 0) this.hitGrace -= dt;
    if (this.sichelGrace > 0) this.sichelGrace -= dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 2.5);
    this.bombs = this.bombs.filter((b) => !b.removed);
    this.fires = this.fires.filter((f) => !f.removed);
    this.markers.update(dt);
    const road = this.road;
    if (road) {
      road.trapsOn = this.running;
      road.trapPeriod = this.val('traps', [3.4, 3.0, 2.0]);
    }
    switch (this.state) {
      case 'wait':
        if (!this.managed) {
          for (const p of figures(this.level)) if (activeFigure(p) && Math.hypot(p.pos.x - this.start.x, p.pos.z - this.start.z) < this.wakeR + this.window) { this.begin(); break; }
        }
        return;
      case 'intro': {
        const k = Math.min(1, this.stateT / INTRO);
        this.pos.z = this.start.z - 30 * (1 - ease(k));
        this.steer = Math.sin(this.stateT * 5) * (1 - k) * 0.6;
        this.home.copy(this.pos);
        if (k >= 1) { this.touch = true; this.setState('drive'); this.level.sfx('slam'); this.level.effects?.dust(this.pos, 8, 1.6); }
        return;
      }
      case 'defeated': {
        this.v = Math.max(0, this.v - dt * 3);
        this.s = Math.min(this.sMax, this.s + this.v * dt);
        if (this.pos.z > this.frontZ) this.pos.z = this.frontZ;
        this.home.copy(this.pos);
        if (this.stateT % 0.2 < dt) this.level.effects?.dust({ x: this.pos.x, y: this.pos.y + 1.6, z: this.pos.z + 1.5 }, 2, 0.6);
        if (this.stateT >= DEFEAT) this.startFlee();
        return;
      }
      case 'flee': this.fleeStep(dt); return;
      case 'gone': return;
      default: break;
    }
    // ---- Kampf: Fenster wandert, Wagen fährt, Figur wird mitgeschoben
    this.v = this.val('speed', [2.4, 2.8, 3.2]);
    this.s = Math.min(this.sMax, this.s + this.v * dt);
    this.drive(dt);
    this.pushFigures();
    this.aimAssist(dt);
    if (this.state !== 'hit' && this.state !== 'stunned') this.attackCool -= dt;
    switch (this.state) {
      case 'drive': this.maybeAttack(); break;
      case 'throw':
        if (!this.released && this.stateT >= THROW * RELEASE) { this.released = true; this.throwBombs(); }
        if (this.stateT >= THROW) this.setState('drive');
        break;
      case 'fire':
        if (!this.released && this.stateT >= FIRE * FIRE_AT) { this.released = true; this.fireBurst(); }
        if (this.stateT >= FIRE) this.setState('drive');
        break;
      case 'hit': if (this.stateT >= HIT) this.setState(this.hp <= 0 ? 'defeated' : 'stunned'); break;
      case 'stunned': if (this.stateT >= STUN) { this.setState('drive'); this.attackCool = 0.9; } break;
      default: break;
    }
    this.syncArch();
  }

  /** Wagen an der Fenster-Vorderkante halten (wartet nach einem Sprung), seitlich pendeln, über Lavalücken springen. */
  drive(dt) {
    const road = this.road;
    const j = this.jump;
    if (j) {
      // Sprung über eine Lavalücke (läuft neben dem Zustand: auch benommen/getroffen)
      j.t += dt;
      const k = Math.min(1, j.t / JUMP);
      this.pos.z = j.z0 + (j.z1 - j.z0) * k;
      this.carY = 4 * 1.5 * k * (1 - k);
      if (k >= 1) {
        this.carY = 0;
        this.jump = null;
        this.attackCool = Math.max(this.attackCool, 0.5);
        this.level.sfx('land');
        this.level.shake(0.35);
        this.level.effects?.dust(this.pos, 10, 1.8);
      }
    } else {
      // Sollage: Fenster-Vorderkante; ist er voraus (nach einem Sprung), wartet er
      if (this.frontZ < this.pos.z) this.pos.z = this.frontZ;
      // Lavalücke direkt hinter dem Wagenheck (in Fahrtrichtung −Z) → Sprung
      const g = road?.gapsBetween(this.pos.z - HALF_L + 0.6, this.pos.z - HALF_L - 0.4)[0];
      if (g) this.startJump(g);
    }
    // seitlich: pendeln und der Figur ein wenig folgen; über Mittellücken mittig
    const p = this.level.nearestPlayer(this.pos);
    const ph = this.phase;
    const sway = [0, 2.0, 2.8, 3.3][ph], swayW = [0, 0.8, 1.1, 1.4][ph];
    const px = p && !p.dead ? p.pos.x : this.start.x;
    let want = this.start.x + clamp((px - this.start.x) * 0.45 + Math.sin(this.clock * swayW) * sway, this.lane[0], this.lane[1]);
    const mid = road?.midAt(this.pos.z + HALF_L + 2, this.pos.z - HALF_L - 2);
    if (mid) want = clamp(want, road.cx - 0.25, road.cx + 0.25);
    const sp = (mid ? 4 : 2.2 + ph * 0.6) * dt;
    const d = clamp(want - this.pos.x, -sp, sp);
    this.pos.x += d;
    this.steer += ((dt > 0 ? d / dt / 3 : 0) - this.steer) * Math.min(1, dt * 6);
    this.pos.y = this.start.y;
    this.home.copy(this.pos);
  }

  startJump(g) {
    const z1 = Math.min(this.pos.z, g.far - HALF_L - 0.4);
    this.jump = { z0: this.pos.z, z1, t: 0 };
    this.jumps++;
    this.level.sfx('boost');
    this.level.effects?.dust(this.pos, 6, 1.2);
  }

  /** Figuren hinter der Fenstergrenze vorwärts schieben, am Wagen vorbei kommt niemand. */
  pushFigures() {
    const back = this.backZ, front = this.pos.z + HALF_L - 0.3;
    for (const p of figures(this.level)) {
      if (!activeFigure(p)) continue;
      if (p.pos.z > back) {
        p.pos.z = back;
        if (p.vel.z > 0) p.vel.z = 0;
        this.pushes++;
      }
      if (p.pos.z < front) { p.pos.z = front; if (p.vel.z < 0) p.vel.z = 0; }
    }
  }

  maybeAttack() {
    const p = this.level.nearestPlayer(this.pos);
    if (this.attackCool > 0 || !activeFigure(p) || this.jump) return;
    // keine Angriffe kurz vor einem Sprung
    const road = this.road;
    if (road && road.gapsBetween(this.pos.z - HALF_L, this.pos.z - HALF_L - this.v * (THROW + 0.3) - 1).length && this.s < this.sMax - 0.01) { this.attackCool = 0.2; return; }
    if (this.bombs.length >= 5) { this.attackCool = 0.4; return; }
    this.attacks++;
    const fe = this.val('fire', [3, 2, 2]);
    if (fe > 0 && this.attacks % fe === 0) { this.setState('fire'); this.level.sfx('cannon'); }
    else { this.setState('throw'); this.level.sfx('swoop'); }
    this.attackCool = this.val('every', [2.7, 2.3, 2.0]);
  }

  /** Bomben-Ziel: vor die Figur (Richtung Wagen), im Fenster, nie in eine Lücke. */
  bombTarget(x, z) {
    const road = this.road;
    const zMin = this.pos.z + HALF_L + 2.2, zMax = Math.max(zMin + 0.5, this.backZ - 0.6);
    let tz = clamp(z, zMin, zMax);
    let tx = clamp(x, this.start.x + this.lane[0] - 1, this.start.x + this.lane[1] + 1);
    if (!road || road.solidAt(tx, tz, 0.45)) return [tx, this.start.y, tz];
    for (let k = 1; k <= 16; k++) {
      for (const sgn of [1, -1]) {
        const z2 = clamp(tz + sgn * k * 0.5, zMin, zMax);
        if (road.solidAt(tx, z2, 0.45)) return [tx, this.start.y, z2];
        const mid = road.midAt(z2);
        if (mid) { const x2 = road.cx + Math.sign(tx - road.cx || 1) * (mid.half + 0.9); if (road.solidAt(x2, z2, 0.45)) return [x2, this.start.y, z2]; }
      }
    }
    return [tx, this.start.y, tz];
  }

  throwBombs() {
    const p = this.level.nearestPlayer(this.pos);
    const n = this.val('bombs', [1, 2, 2]);
    const base = p ? [p.pos.x, p.pos.z - 1.6] : [this.pos.x, this.pos.z + 8];
    const offs = n >= 2 ? [-1.8, 1.8] : [this.rnd.real(-0.5, 0.5)];
    for (const ox of offs.slice(0, n)) this.throwBomb(this.bombTarget(base[0] + ox, base[1] + (ox > 0 ? 0.6 : 0)));
    this.throws++;
  }

  throwBomb(t) {
    const h = toWorld(this.pos, YAW, this.handOff.x, this.handOff.y + this.carY, this.handOff.z, {});
    const T = this.spec.flight ?? 1.0;
    this.bombsThrown++;
    const short = this.bombsThrown % this.val('shortEvery', [4, 3, 2]) === 0;
    if (short) this.shortBombs++;
    const fuse = T + (short ? (this.spec.shortFuse ?? 1.0) : (this.spec.fuse ?? 2.8));
    const v = ballistic([h.x, h.y, h.z], t, T);
    const b = this.level.spawn('kickbombe', { pos: [h.x, h.y, h.z], vel: v, owner: this, fuse });
    if (!b) return;
    b.shortFuse = short;
    this.bombs.push(b);
    this.markers.add(b, t[0], t[1], t[2], T);
    if (short) this.hint('short', 'Vorsicht – gleich explodiert sie!', { color: '#ff8a6a' });
  }

  /** Feuer aus der Kanone: eine Kugel bzw. (ab Phase 2) ein Fächer = Feuerstoß. */
  fireBurst() {
    const p = this.level.nearestPlayer(this.pos);
    const n = this.val('fireShots', [1, 3, 3]);
    const m = toWorld(this.pos, YAW, this.muzzleOff.x, this.muzzleOff.y + this.carY, this.muzzleOff.z, {});
    const sp = this.spec.fireSpeed ?? 7;
    const base = p && !p.dead ? Math.atan2(-(p.pos.z - m.z), p.pos.x - m.x) : -YAW;
    for (let i = 0; i < n; i++) {
      const a = base + (n <= 1 ? 0 : -0.3 + (0.6 * i) / (n - 1));
      const f = this.level.spawn('feuerkugel', { pos: [m.x, m.y - 0.17, m.z], vel: [Math.cos(a) * sp, 2.5, -Math.sin(a) * sp], mode: 'bounce', owner: this, life: 3.2 });
      if (f) { this.fires.push(f); this.fireballs++; }
    }
    this.firesN++;
    this.level.sfx('fireball');
    this.level.effects?.sparks(m, 10);
  }

  /**
   * Zielhilfe: gekickte Bomben, die grob auf den Wagen zurollen (±53°), lenken zu ihm ein (über Mittellücken zur Fahrspur),
   * rollen bis zu ihm (Lunte hält) und **hüpfen über Lavalücken** (vor einer Lücke mit fester Fahrbahn dahinter).
   */
  aimAssist(dt) {
    const road = this.road;
    for (const e of this.level.entities) {
      if (e.kind !== 'kickbombe' || !e.kicker || e.state !== 'kicked' || e.removed) continue;
      let tx = clamp(e.pos.x, this.pos.x - 1.1, this.pos.x + 1.1);
      const mid = road?.midAt(e.pos.z + 0.4, e.pos.z - 4) ?? road?.midAt(this.pos.z + HALF_L, this.pos.z - HALF_L);
      if (mid) tx = road.cx + Math.sign(e.pos.x - road.cx || 1) * Math.max(Math.abs(tx - road.cx), mid.half + 0.45);
      const tz = this.pos.z + HALF_L;
      const dx = tx - e.pos.x, dz = tz - e.pos.z, d = Math.hypot(dx, dz);
      if (d > 24 || d < 0.3) continue;
      const ux = dx / d, uz = dz / d;
      if (e.dir.x * ux + e.dir.z * uz < 0.6) continue;
      const cross = e.dir.x * uz - e.dir.z * ux;
      const rate = mid ? 6 : 2.5;
      const a = clamp(Math.asin(clamp(cross, -1, 1)), -rate * dt, rate * dt);
      const c = Math.cos(a), s = Math.sin(a);
      const nx = e.dir.x * c - e.dir.z * s, nz = e.dir.x * s + e.dir.z * c;
      e.dir.x = nx; e.dir.z = nz;
      e.rollSpeed = Math.max(e.rollSpeed, 7);
      e.fuse = Math.max(e.fuse, 0.6);
      // Lavalücke voraus, dahinter Fahrbahn: hüpfen (Bogen 0,7 s)
      if (road && e.grounded) {
        const ah = e.half.x + 0.35;
        const ax = e.pos.x + e.dir.x * ah, az = e.pos.z + e.dir.z * ah;
        if (!road.solidAt(ax, az)) {
          for (const L of [2.5, 3.5, 4.5]) {
            if (!road.solidAt(e.pos.x + e.dir.x * L, e.pos.z + e.dir.z * L, 0.3)) continue;
            const v = Math.max(e.rollSpeed, (L + 0.5) / 0.7);
            e.vel.set(e.dir.x * v, 14, e.dir.z * v);
            e.grounded = false;
            e.setState('air');
            e.hops = (e.hops ?? 0) + 1;
            this.level.sfx('hop');
            break;
          }
        }
      }
    }
  }

  // ------------------------------------------------------------------ Treffer

  onBombHit(bomb) {
    if (!this.vulnerable || this.hitGrace > 0) return;
    this.hitGrace = 0.5;
    this.takeHit('bombe');
  }

  /** Wurfsichel: Kratzer; sichel Kratzer = ein Treffer (Zusatzschaden). */
  sichelHit(source) {
    if (!this.vulnerable || this.sichelGrace > 0) return;
    // eine geworfene Sichel kratzt nur einmal (Hin- und Rückflug zählen zusammen)
    if (source?.sichel && typeof source === 'object') { if (this.sichelSeen.has(source)) return; this.sichelSeen.add(source); }
    this.sichelGrace = 0.35;
    this.sichelHits++;
    this.carHits++;
    this.shake = 0.7;
    this.level.sfx('blockhit');
    this.level.effects?.sparks({ x: source?.pos?.x ?? this.pos.x, y: this.pos.y + 1.8, z: source?.pos?.z ?? this.pos.z + HALF_L }, 10);
    this.hitLog.push({ kind: 'kratzer', t: +this.level.time.toFixed(2), hp: this.hp });
    if (this.carHits >= this.sichelPer) { this.carHits = 0; this.takeHit('sichel'); }
    else this.level.archetype?.hud?.banner?.('Kratzer!', { hold: 0.8, size: 13, color: '#ffe066' });
  }

  takeHit(where) {
    if (this.hp <= 0) return;
    this.hp = Math.max(0, this.hp - 1);
    this.hits++;
    this.hitLog.push({ kind: where, t: +this.level.time.toFixed(2), hp: this.hp, s: +this.s.toFixed(1) });
    this.setState('hit');
    this.shake = 1;
    this.level.sfx('boss_hit');
    this.level.sfx('stomp');
    this.level.shake(0.6);
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 3, z: this.pos.z }, 20);
    this.level.onBossHit?.(this, where);
    if (this.hp <= 0) {
      this.defeated = true;
      this.touch = false;
      if (this.jump) { this.pos.z = this.jump.z1; this.carY = 0; this.jump = null; }
      for (const b of this.bombs) if (!b.removed && !b.kicker) { b.lit = false; b.flip?.(null, 6); }
      for (const f of this.fires) if (!f.removed) f.poof?.();
      this.markers.clear();
      this.level.sfx('powerdown');
      this.level.onBossDefeated?.(this);
    }
  }

  /** Wurfsichel der Figur (Motor: onSichelHit; ältere Form onHit('sichel' | 'throw' mit sichel)). */
  onSichelHit(sichel) { if (this.visible && this.hp > 0) this.sichelHit(sichel); }

  onHit(kind, source) {
    if (!this.visible || this.hp <= 0) return;
    if (kind === 'sichel' || source?.sichel) { this.sichelHit(source); return; }
    if (kind === 'fire' || kind === 'claw' || kind === 'shell') this.level.effects?.sparks(this.center(), 3);
    // Explosionen daneben, Stern, Riese …: zählen nicht (nur onBombHit)
  }

  onPlayer(player, contact) {
    if (!this.visible || this.hp <= 0 || this.state === 'wait' || this.state === 'gone') return 'none';
    if (contact.fromAbove || contact.pound) { this.bounces++; this.level.sfx('bounce'); return 'stomp'; }
    return 'hurt';
  }

  hint(key, text, o = {}) {
    if (this.hinted[key]) return;
    this.hinted[key] = true;
    this.level.archetype?.hud?.banner?.(text, { hold: 1.6, size: 13, y: 0.36, ...o });
  }

  /** Eigene Phasen-Ansagen (statt der Standardtexte des Boss-Archetyps). */
  syncArch() {
    const arch = this.level.archetype;
    if (!arch || arch.boss !== this) return;
    const ph = this.phase;
    if (arch.seenPhase !== ph && this.state !== 'hit' && this.hp > 0) {
      arch.seenPhase = ph;
      if (ph === 2) arch.hud?.banner?.('Mehr Bomben – und ein Feuerstoß!', { hold: 1.6, size: 14, color: '#ffb040' });
      if (ph === 3) arch.hud?.banner?.('Er wird schneller – Vorsicht, Stacheln!', { hold: 1.8, size: 14, color: '#ff7a3a' });
    }
  }

  // ------------------------------------------------------------------ Flucht (lustig)

  startFlee() {
    this.setState('flee');
    this.level.sfx('panic');
    const x = this.pos.x, y = this.pos.y + 1.4, z = this.pos.z;
    this.flee = { x, y, z, x0: x, z0: z, hops: 0 };
    if (this.carBear) this.carBear.visible = false;
    if (this.level.view) {
      const m = getModel('baron_brummbaer', { withCar: false });
      m.root.position.set(x, y, z);
      m.root.rotation.y = Math.PI / 2;      // Blick nach −Z (rennt weg)
      this.level.view.add(m.root);
      this.fleeBear = m;
      // Zylinder in die rechte Tatze (Modell-Teile: Hut am Rumpf bei y ≈ 1,84, rechter Arm bei z ≈ +0,62)
      const body = m.root.children[0]?.children?.[0]?.children?.find((o) => o.isGroup && o.children.some((c) => c.isMesh && Math.abs(c.position.y - 1.84) < 0.02));
      this.fleeHat = body?.children?.find((c) => c.isMesh && Math.abs(c.position.y - 1.84) < 0.02) ?? null;
      this.fleeArm = body?.children?.find((c) => c.isGroup && Math.abs(c.position.z - 0.62) < 0.02) ?? null;
      this.fleeBody = body ?? null;
    }
    this.level.effects?.dust({ x, y: this.pos.y + 1, z }, 10, 1.4);
  }

  fleeStep(dt) {
    const f = this.flee;
    const k = this.stateT;
    // hüpft schwindelig in Bögen davon (nach −Z), schwankt seitlich
    const hopT = 0.42;
    const hk = (k % hopT) / hopT;
    const n = Math.floor(k / hopT);
    if (n !== f.hops) { f.hops = n; this.level.sfx('hop'); }
    f.z = f.z0 - Math.min(k, FLEE) * 4.2 - 1.5 * Math.min(1, k / 0.5);
    f.x = f.x0 + Math.sin(k * 3.3) * 0.9;
    f.y = this.pos.y + (k < 0.5 ? 1.4 + Math.sin(k / 0.5 * Math.PI) * 1.6 - (k / 0.5) * 1.4 : 4 * 0.75 * hk * (1 - hk));
    if (this.stateT >= FLEE) this.vanish();
  }

  removeFleeBear() {
    if (this.fleeBear) { this.level.view?.remove(this.fleeBear.root); this.fleeBear.dispose?.(); this.fleeBear = null; }
    this.fleeHat = this.fleeArm = this.fleeBody = null;
  }

  vanish() {
    this.setState('gone');
    this.removeFleeBear();
    this.level.effects?.dust({ x: this.flee?.x ?? this.pos.x, y: this.pos.y + 0.5, z: this.flee?.z ?? this.pos.z }, 10, 1.4);
    const st = this.spec.star;
    if (st && !this.starDone) {
      this.starDone = true;
      const pos = Array.isArray(st) ? st : st.pos;
      this.level.spawn('star', { pos, index: Array.isArray(st) ? 0 : (st.index ?? 0) });
      this.level.effects?.sparks({ x: pos[0], y: pos[1] + 0.6, z: pos[2] }, 24);
    }
    if (!this.managed && !this.dropped && this.spec.drop) {
      this.dropped = true;
      spawnLoot(this.level, this.spec.drop, this.pos.x, this.pos.y + 0.5, this.pos.z + HALF_L + 2);
    }
  }

  // ------------------------------------------------------------------ Darstellung

  modelState() {
    const s = this.state, hp = Math.max(0, this.hp);
    const speed = this.jump ? 9 : this.running ? Math.max(this.v, 1) * 2.5 : 0;
    if (s === 'throw') return { anim: 'throw', hp, speed, steer: this.steer, progress: Math.min(1, this.stateT / THROW) };
    if (s === 'fire') return { anim: 'fire', hp, speed, steer: this.steer, progress: Math.min(1, this.stateT / FIRE) };
    if (s === 'hit') return { anim: 'hit', hp, speed, steer: this.steer, progress: Math.min(1, this.stateT / HIT) };
    if (s === 'stunned') return { anim: 'stunned', hp, speed, steer: this.steer };
    if (s === 'defeated' || s === 'flee' || s === 'gone') return { anim: 'defeated', hp: 0 };
    if (s === 'wait' || s === 'intro') return { anim: s === 'intro' ? 'drive' : 'idle', hp, speed: s === 'intro' ? 9 : 0, steer: this.steer };
    return { anim: 'drive', hp, speed, steer: this.steer };
  }

  syncModel() {
    if (!this.model) return;
    const r = this.model.root;
    r.position.set(this.pos.x, this.pos.y + this.carY, this.pos.z);
    r.visible = this.visible;
    if (this.shake > 0) { r.position.x += Math.sin(this.clock * 60) * 0.08 * this.shake; r.rotation.z = Math.sin(this.clock * 47) * 0.03 * this.shake; }
    else r.rotation.z = 0;
    // im Sprung: Nase hoch, dann runter
    r.rotation.x = this.jump ? -0.18 * Math.cos(Math.min(1, this.jump.t / JUMP) * Math.PI) : 0;
    r.rotation.y = YAW + this.steer * 0.12;
  }

  render(dt, t) {
    super.render(dt, t);
    this.markers.render(dt);
    const b = this.fleeBear, f = this.flee;
    if (b && f) {
      b.root.position.set(f.x, f.y, f.z);
      b.root.rotation.set(0, Math.PI / 2 + Math.sin(this.stateT * 9) * 0.35, Math.sin(this.stateT * 7) * 0.12);
      b.update(dt, { anim: 'stunned' });
      // den Zylinder in der Tatze schwenken
      if (this.fleeHat && this.fleeArm && this.fleeBody) {
        this.fleeArm.rotation.z = 2.3 + Math.sin(this.stateT * 10) * 0.35;
        this.fleeArm.updateMatrixWorld(true);
        const w = this.fleeArm.localToWorld(new THREE.Vector3(0.12, -0.85, 0));
        this.fleeBody.worldToLocal(w);
        this.fleeHat.position.copy(w);
        this.fleeHat.rotation.set(0.4, this.stateT * 6, 2.6);
      }
    }
  }

  info() {
    return {
      state: this.state, hp: this.hp, maxHp: this.maxHp, phase: this.phase, carHits: this.carHits, sichelHits: this.sichelHits,
      throws: this.throws, bombs: this.bombsThrown, shortBombs: this.shortBombs, fires: this.firesN, fireballs: this.fireballs,
      jumps: this.jumps, pushes: this.pushes, hits: this.hits, bounces: this.bounces, vulnerable: this.vulnerable,
      s: +this.s.toFixed(2), v: +this.v.toFixed(2), frontZ: +this.frontZ.toFixed(2), backZ: +this.backZ.toFixed(2),
      x: +this.pos.x.toFixed(2), z: +this.pos.z.toFixed(2),
    };
  }

  dispose() {
    this.markers.clear();
    this.removeFleeBear();
    super.dispose();
  }
}

export const KINDS = {
  kampfwagen_strasse: (level, spec) => new KampfwagenStrasse(level, spec),
  stachelfalle: (level, spec) => new Stachelfalle(level, spec),
  baron_kampfwagen: (level, spec) => new BaronKampfwagen(level, spec),
};
