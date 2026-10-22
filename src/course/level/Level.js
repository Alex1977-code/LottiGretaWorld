// Level-Objekt des Kurs-Modus: hält Kollisionswelt, Ansicht, Entitäten, Laufzeit und die Spielfigur und
// rechnet einen Simulationsschritt (step). Bausteine und Entitäten bekommen es als `level`.
//
// Schnittstelle (Präzisierung Motor):
//   level.data, level.id, level.world (CollisionWorld), level.view (CourseView), level.runtime (LevelRuntime)
//   level.player, level.entities, level.time (Simulationszeit s), level.killY, level.bounds
//   level.spawn(kind, spec) → Entität | null      level.hasKind(kind)      level.named.get(id)
//   level.onStep(fn(dt, time)) → Abmelden         je Simulationsschritt vor der Figur (bewegte Plattformen)
//   level.sfx(name), level.effects (Partikel), level.shake(a)
//   level.addCoins(n), level.addLife(n), level.attackArea(pos, radius, kind, source)
//   level.rnd (Rnd, je Level-Id deterministisch)
//
// Reihenfolge je Schritt: onStep-Funktionen (Plattformen) → Figur → Entitäten → Berührungen
// (onPlayer) → Angriffe → Laufzeit (Timer, Absturz) → Entfernen erledigter Entitäten.
//
// Mehrere Spielfiguren (Präzisierung Motor Welt 2, Spiegelfrucht):
//   level.players               Liste aller Figuren; [0] = Haupt-Figur = level.player (Altcode, Kamera-Anker)
//   level.nearestPlayer(pos)    nächste lebende, steuerbare Figur (Gegner-KI); ohne Klone = level.player
//   level.squad                 Figurengruppe (player/Squad.js, von CourseScene gesetzt): Klone, Darstellung
//   level.addClone(src)         Klon neben src (Spiegelfrucht) → Figur | null (höchstens 5 Figuren)
//   level.removeFigure(f, why)  Figur mit „Poff“ entfernen (Treffer/Absturz/verloren); die letzte nie
//   level.setMainFigure(f)      Figur wird Haupt-Figur (Röhre, Zielmast, Glasröhre …)
//   level.focus(out)            Schwerpunkt der aktiven Figuren (Kamera, Steuerungs-Gier)
// Jeder Schritt rechnet jede Figur mit derselben Eingabe; Berührungen/Angriffe/Auslöser laufen je Figur.
//
// Ergänzungen (Präzisierung Motor Welt 3):
//   level.isFacing(fig, pos, angleDeg = 70)   blickt die Figur (waagerecht, ±angleDeg) zu pos? (Spuk: „schaut sie mich an?“)
//   level.anyFacing(pos, angleDeg = 70)       blickt irgendeine aktive Figur zu pos?
//   level.fences                              Kettenzäune (entities/kinds/kettenzaun.js) für das Zaun-Klettern
//   level.waterAt(x, y, z)                    { shape, top, current, id } der Wasserform an diesem Punkt | null
//   level.currentAt(x, y, z, out)             Strömung {x, y, z} (m/s) an diesem Punkt (0 außerhalb)
//   level.setWaterLevel(id, y, speed = 1.5)   Wasserspiegel aller Wasserformen mit dieser id (waterId) auf y fahren
//                                             (m/s; speed ≤ 0 = sofort) → Anzahl Formen; level.waterLevel(id) = aktuelle Höhe
//   Entitäten mit floats: true (floatDepth m, Standard 0,3) schwimmen an der Oberfläche (auch bei steigendem Wasser)
//   Angriffe mit attackInfo.around (Schwanzhieb) treffen rundum statt vor der Figur; spawn('powerup', { power:
//   'schlittschuh' }) erzeugt die Entität schlittschuh; Berührung von oben auf dem Schlittschuh: player/skating.js.

import { CollisionWorld } from '../physics/CollisionWorld.js';
import { getEntityKind, hasEntityKind } from '../entities/index.js';
import { LevelRuntime } from './LevelRuntime.js';
import { Rnd } from '../../three/world/geometry.js';
import { sfx as playSfx } from '../../audio/index.js';
import { normalizePower } from '../player/powers.js';
import { skateContact } from '../player/skating.js';

const DEG = Math.PI / 180;

export class Level {
  /**
   * @param {object} scene CourseScene (oder Test-Attrappe mit view)
   * @param {object} data LEVEL
   * @param {{ view?: object, save?: object }} opts
   */
  constructor(scene, data, opts = {}) {
    this.scene = scene;
    this.data = data;
    this.id = data.id;
    this.world = new CollisionWorld();
    this.view = opts.view ?? null;
    this.entities = [];
    this.named = new Map();
    this.steppers = [];
    this.players = [];
    this.squad = null;
    this._figs = [];
    this.time = 0;
    this.controlYaw = 0;
    this.killY = -30;
    this.bounds = null;
    let seed = 7;
    for (const ch of String(data.id)) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    this.rnd = new Rnd(seed);
    this.runtime = new LevelRuntime(this, opts.save);
    this.muted = false;
    // Welt 3
    this.fences = [];
    this.waterMoves = new Map();   // Form-Id → { shape, target, speed } (setWaterLevel)
    this._floaters = 0;
  }

  get effects() { return this.view?.effects ?? null; }

  // ------------------------------------------------------------------ Spielfiguren (eine oder mehrere)

  /** Haupt-Figur (= players[0]); Altcode, Kamera, HUD. */
  get player() { return this.players[0] ?? null; }

  /** Haupt-Figur setzen: schon in der Liste → nach vorn; sonst ersetzt sie die bisherige Haupt-Figur. */
  set player(p) {
    const list = this.players;
    if (!p) { list.length = 0; return; }
    const i = list.indexOf(p);
    if (i === 0) return;
    if (i > 0) { list.splice(i, 1); list.unshift(p); return; }
    if (list.length) list[0] = p; else list.push(p);
  }

  /**
   * Nächste Figur zu pos (Gegner zielen auf sie): bevorzugt lebende, steuerbare Figuren (nicht im Skript-Modus);
   * gibt es keine, die Haupt-Figur (wie bisher level.player – Aufrufer prüfen dead/mode selbst).
   */
  nearestPlayer(pos) {
    const list = this.players;
    if (list.length <= 1 || !pos) return list[0] ?? null;
    let best = null, bd = Infinity;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (p.dead || p.mode === 'script' || p.removedFigure) continue;
      const dx = p.pos.x - pos.x, dy = p.pos.y - pos.y, dz = p.pos.z - pos.z;
      const d = dx * dx + dz * dz + dy * dy * 0.5;
      if (d < bd) { bd = d; best = p; }
    }
    return best ?? list[0];
  }

  /** Schwerpunkt der aktiven Figuren (ohne Skript-Modus, außer alle sind darin) → out {x,y,z}. */
  focus(out = { x: 0, y: 0, z: 0 }) {
    const list = this.players;
    let n = 0, x = 0, y = 0, z = 0;
    for (const p of list) { if (p.mode === 'script' && list.length > 1) continue; x += p.pos.x; y += p.pos.y; z += p.pos.z; n++; }
    if (!n) { const p = list[0]; if (p) { x = p.pos.x; y = p.pos.y; z = p.pos.z; } n = 1; }
    out.x = x / n; out.y = y / n; out.z = z / n;
    return out;
  }

  /** Klon der Figur src (Spiegelfrucht) – nur mit Figurengruppe (CourseScene). → neue Figur | null */
  addClone(src = this.player) { return this.squad?.addClone(src) ?? null; }

  /** Figur entfernen (Treffer/Absturz/verloren) – die letzte Figur bleibt (normaler Tod über player.die). */
  removeFigure(fig, cause = 'hit') { return this.squad?.remove(fig, cause) ?? false; }

  /** Figur wird Haupt-Figur (Kamera, Röhre, Zielmast). */
  setMainFigure(fig) {
    if (!fig || this.players[0] === fig || !this.players.includes(fig)) return;
    if (this.squad) this.squad.promote(fig); else this.player = fig;
  }

  sfx(name) { if (!this.muted) playSfx(name); }

  shake(a) { this.view?.rig?.shake(a); }

  hasKind(kind) { return hasEntityKind(kind); }

  /** Entität erzeugen und anmelden. Unbekannte Art → Warnung, null. */
  spawn(kind, spec = {}) {
    // Power-ups, die eine eigene Entität sind (Präzisierung Motor Welt 3): Schlittschuh
    if (kind === 'powerup' && normalizePower(spec.power) === 'schlittschuh' && hasEntityKind('schlittschuh')) kind = 'schlittschuh';
    const f = getEntityKind(kind);
    if (!f) { console.warn(`[Level ${this.id}] unbekannte Entität: ${kind}`); return null; }
    const e = f(this, spec);
    if (!e) return null;
    if (!e.kind || e.kind === 'entity') e.kind = kind;
    this.entities.push(e);
    if (e.floats) this._floaters++;
    if (spec.id) this.named.set(spec.id, e);
    if (e.shadow > 0 && this.view) {
      this.view.shadows.add({ pos: e.pos, radius: e.shadow, alive: () => !e.removed, visible: () => e.alive && e.shadowVisible !== false });
    }
    return e;
  }

  onStep(fn) {
    this.steppers.push(fn);
    return () => { const i = this.steppers.indexOf(fn); if (i >= 0) this.steppers.splice(i, 1); };
  }

  addCoins(n = 1) { this.runtime.addCoins(n); }
  addLife(n = 1) { this.runtime.addLife(n); }

  /** Angriff im Umkreis (Stampfattacke, Explosion): onHit(kind) für Entitäten in Reichweite. */
  attackArea(pos, radius, kind, source) {
    for (const e of this.entities) {
      if (!e.alive || e === source) continue;
      const dx = e.pos.x - pos.x, dz = e.pos.z - pos.z;
      if (dx * dx + dz * dz > radius * radius) continue;
      if (Math.abs(e.pos.y - pos.y) > 1.2) continue;
      e.onHit?.(kind, source);
    }
  }

  /** Umriss aus den Kollisionsformen (ohne riesige Ebenen) → Hintergrund und Absturzhöhe. */
  computeBounds() {
    const b = { min: { x: Infinity, y: Infinity, z: Infinity }, max: { x: -Infinity, y: -Infinity, z: -Infinity } };
    this.world.forEach((s) => {
      if (s._big || s.kill) return;
      b.min.x = Math.min(b.min.x, s.x0); b.max.x = Math.max(b.max.x, s.x1);
      b.min.y = Math.min(b.min.y, s.bot); b.max.y = Math.max(b.max.y, s.top);
      b.min.z = Math.min(b.min.z, s.z0); b.max.z = Math.max(b.max.z, s.z1);
    });
    if (!Number.isFinite(b.min.x)) { b.min = { x: -10, y: 0, z: -10 }; b.max = { x: 10, y: 1, z: 10 }; }
    this.bounds = b;
    this.killY = (this.data.killY ?? b.min.y - 14);
    return b;
  }

  // ------------------------------------------------------------------ Simulation

  step(dt, input) {
    this.time += dt;
    for (let i = 0; i < this.steppers.length; i++) this.steppers[i](dt, this.time);
    if (this.waterMoves.size) this.moveWater(dt);
    else if (this._waterDyLeft) { this.world.forEach((q) => { if (q.waterDy) q.waterDy = 0; }); this._waterDyLeft = false; }
    // Alle Figuren mit derselben Eingabe (Kopie der Liste: Figuren können im Schritt verschwinden/wechseln)
    const figs = this._figs;
    figs.length = 0;
    for (const f of this.players) figs.push(f);
    for (let i = 0; i < figs.length; i++) {
      const p = figs[i];
      if (p.removedFigure) continue;
      p.update(dt, this.squad ? this.squad.inputFor(p, input) : input);
      if (!p.dead && !p.removedFigure && p.pos.y < this.killY) p.die('fall');
    }
    this.squad?.afterFigures(dt, input);
    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i];
      if (!e.removed) e.update(dt);
    }
    if (this._floaters) this.floatEntities(dt);
    for (let i = 0; i < figs.length; i++) {
      const p = figs[i];
      if (p.removedFigure || p.dead || p.mode === 'script') continue;
      this.contacts(input, p);
      this.attacks(p);
    }
    this.runtime.update(dt);
    // Erledigte Entitäten entfernen
    let w = 0;
    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i];
      if (e.removed && !e.keepModel) { e.dispose(); continue; }
      this.entities[w++] = e;
    }
    this.entities.length = w;
  }

  /** Berührungen Figur ↔ Entitäten (AABB) → onPlayer → Abprall oder Treffer. p = Figur (Standard Haupt-Figur). */
  contacts(input, p = this.player) {
    if (!p) return;
    const pc = p.center(), ph = p.half;
    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i];
      if (!e.alive || e.touch === false || p.dead || p.mode === 'script') continue;
      const ec = e.center();
      if (Math.abs(pc.x - ec.x) > ph.x + e.half.x || Math.abs(pc.y - ec.y) > ph.y + e.half.y || Math.abs(pc.z - ec.z) > ph.z + e.half.z) continue;
      const top = e.pos.y + e.half.y * 2;
      const fall = Math.max(0, -p.vel.y) / 120;
      const contact = {
        fromAbove: p.vel.y <= 1 && p.prevPos.y >= top - Math.max(0.28, fall * 2.5) && p.mode !== 'ground',
        pound: p.state === 'groundpound', dive: p.state === 'dive',
        star: !!p.powerDef.invulnerable,
        dx: pc.x - ec.x, dz: pc.z - ec.z, speed: p.hSpeed(),
      };
      let r;
      if (e.enemy) r = p.powerDef.onTouchEntity?.(p, e, contact);
      if (r === undefined && p.skate) r = skateContact(p, e, contact);   // Schlittschuh: Stachel-Gegner von oben zertreten
      if (r === undefined) r = e.onPlayer(p, contact);
      if (r === 'stomp') { p.bounceOff(input); this.sfx('stomp'); }
      else if (r === 'hurt') p.hurt(e);
      if (p.dead || p.removedFigure || p.mode === 'script') break;   // Figur weg (Klon-Treffer) oder Zielmast/Röhre
    }
  }

  /** Angriffsbereich der Figur (Tatzenhieb, Sturzflug) → onHit. p = Figur (Standard Haupt-Figur). */
  attacks(p = this.player) {
    if (!p) return;
    const a = p.attackInfo;
    if (!a) return;
    const f = p.facingVec();
    const reach = a.reach;
    if (a.around) {
      // rundum (Schwanzhieb): waagerechter Abstand Figur-Mitte → Hüllquader ≤ reach + Halbbreite der Figur
      const px = p.pos.x, pz = p.pos.z, cy = p.pos.y + p.half.y, r = reach + p.half.x;
      for (const e of this.entities) {
        if (!e.alive || a.hit.has(e) || !e.onHit || e === p.holding) continue;
        const ec = e.center();
        const dx = Math.max(0, Math.abs(ec.x - px) - e.half.x), dz = Math.max(0, Math.abs(ec.z - pz) - e.half.z);
        if (dx * dx + dz * dz > r * r || Math.abs(ec.y - cy) > p.half.y + e.half.y) continue;
        a.hit.add(e);
        e.onHit(a.kind, p);
      }
      return;
    }
    const cx = p.pos.x + f.x * (p.half.x + reach * 0.5), cz = p.pos.z + f.z * (p.half.z + reach * 0.5), cy = p.pos.y + p.half.y;
    for (const e of this.entities) {
      if (!e.alive || a.hit.has(e) || !e.onHit) continue;
      const ec = e.center();
      if (Math.abs(ec.x - cx) > reach * 0.5 + 0.3 + e.half.x || Math.abs(ec.z - cz) > reach * 0.5 + 0.3 + e.half.z || Math.abs(ec.y - cy) > p.half.y + e.half.y) continue;
      a.hit.add(e);
      e.onHit(a.kind, p);
    }
  }

  // ------------------------------------------------------------------ Welt 3: Blick, Wasser (Präzisierung Motor Welt 3)

  /**
   * Blickt die Figur zu pos? Waagerechter Blickkegel ±angleDeg um die Blickrichtung (Standard 70°). Für Geister (Spuk:
   * erstarrt, solange die nächste Figur ihn ansieht). fig null/tot/im Skript-Modus (Röhre, Statue …) → false.
   */
  isFacing(fig, pos, angleDeg = 70) {
    if (!fig || fig.dead || fig.removedFigure || fig.mode === 'script' || !pos) return false;
    const d = fig.facingDot ? fig.facingDot(pos) : 1;
    return d >= Math.cos(angleDeg * DEG);
  }

  /** Blickt irgendeine aktive Figur zu pos? (mehrere Figuren: Spiegelfrucht) */
  anyFacing(pos, angleDeg = 70) {
    for (const p of this.players) if (this.isFacing(p, pos, angleDeg)) return true;
    return false;
  }

  /** Wasserform an (x, y, z) (höchste Oberfläche; Strömung aus jeder Form dort) → { shape, top, current, id } | null. */
  waterAt(x, y, z) {
    let best = null, cur = null;
    for (const s of this.world.overlapAABB({ x, y, z }, { x: 0.01, y: 0.01, z: 0.01 }, { filter: (q) => q.water })) {
      if (!best || s.top > best.top) best = s;
      if (s.current) cur = s.current;
    }
    return best ? { shape: best, top: best.top, current: cur, id: best.waterId ?? null } : null;
  }

  /** Strömung an (x, y, z) in m/s (out {x, y, z}; 0 außerhalb von Wasser mit current). */
  currentAt(x, y, z, out = { x: 0, y: 0, z: 0 }) {
    const w = this.waterAt(x, y, z);
    out.x = w?.current?.x ?? 0; out.y = w?.current?.y ?? 0; out.z = w?.current?.z ?? 0;
    return out;
  }

  /**
   * Wasserspiegel fahren: alle Wasserformen mit waterId === id (Baustein water mit id) steigen/sinken mit speed m/s
   * auf die Höhe y (Oberfläche). speed ≤ 0 → sofort. Schwimmende Figuren steigen mit (Auftrieb), am Boden stehende
   * beginnen zu schwimmen, Entitäten mit floats schwimmen oben. → Anzahl betroffener Formen.
   */
  setWaterLevel(id, y, speed = 1.5) {
    let n = 0;
    this.world.forEach((s) => {
      if (!s.water || s.waterId !== id) return;
      this.waterMoves.set(s.id, { shape: s, target: y, speed });
      n++;
    });
    if (!n) console.warn(`[Level ${this.id}] setWaterLevel: keine Wasserform mit id „${id}“`);
    return n;
  }

  /** Aktuelle Oberfläche der Wasserform(en) mit dieser id (höchste) oder null. */
  waterLevel(id) {
    let top = null;
    this.world.forEach((s) => { if (s.water && s.waterId === id && (top === null || s.top > top)) top = s.top; });
    return top;
  }

  /** Je Schritt (vor den Figuren): Wasserspiegel fahren. */
  moveWater(dt) {
    for (const [sid, m] of this.waterMoves) {
      const s = m.shape;
      if (!this.world.get(sid)) { this.waterMoves.delete(sid); continue; }
      const top = s.top;
      const d = m.target - top;
      const step = m.speed > 0 ? m.speed * dt : Infinity;
      const ny = Math.abs(d) <= step ? m.target : top + Math.sign(d) * step;
      const mx = Array.isArray(s.max) ? s.max : [s.max.x, s.max.y, s.max.z];
      const mn = Array.isArray(s.min) ? s.min : [s.min.x, s.min.y, s.min.z];
      s.max = [mx[0], Math.max(mn[1] + 0.05, ny), mx[2]];
      this.world.update(sid);
      s.waterDy = s.top - top;
      this._waterDyLeft = true;
      if (ny === m.target) this.waterMoves.delete(sid);
    }
  }

  /** Je Schritt (nach den Entitäten): Entitäten mit floats an der Oberfläche halten. */
  floatEntities(dt) {
    for (const e of this.entities) {
      if (!e.floats || e.removed || e.carrier || !e.alive) continue;
      const w = this.waterAt(e.pos.x, e.pos.y + 0.05, e.pos.z);
      if (!w) continue;
      const y = w.top - (e.floatDepth ?? 0.3);
      if (e.pos.y < y) { e.pos.y = Math.min(y, e.pos.y + 6 * dt + Math.max(0, w.shape.waterDy ?? 0)); if (e.vel?.y < 0) e.vel.y = 0; e.floating = true; }
      else e.floating = e.pos.y < y + 0.05;
    }
  }

  /** Darstellung je Bild (Modelle nachführen/animieren). */
  render(dt, t) {
    for (let i = 0; i < this.entities.length; i++) this.entities[i].render?.(dt, t);
  }

  onPlayerDeath(cause) { this.runtime.onPlayerDeath(cause); }
  onPlayerDeathDone(cause) { this.runtime.onPlayerDeathDone(cause); }
  onGoalDone() { this.runtime.finish(); }
  onTeleport() { if (this.player) this.view?.rig?.snap(this.player); }

  dispose() {
    for (const e of this.entities) e.dispose();
    this.entities.length = 0;
    this.steppers.length = 0;
  }
}
