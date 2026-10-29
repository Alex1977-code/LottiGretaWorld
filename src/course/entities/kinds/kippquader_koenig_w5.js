// Kippquader-König – Endgegner Welt 5 (5-Burg „Ruinen-Tempel mit Kippquadern“). Eigene Figur: aufrechte Sandstein-Platte
// (3,4 m breit, 3,6 m hoch, 1,5 m tief) mit Gesicht vorn, Zackenkrone und einem leuchtend blauen **Schwachpunkt-Feld mit
// weißem Stern auf dem Rücken**. Bauplan: „König wandert, roter Boden zeigt die Landestelle, er kippt herab. Treffer nur per
// Sprung auf den Rücken; 3 Treffer, nach jedem brechen 2 Arenaecken weg und er wird schneller.“
//
// Ablauf (Phase = maxHp − hp + 1; Werte je Phase als [P1, P2, P3]):
//   wait → begin(): intro (2,2 s, stampft auf) → Runde:
//     walk  (walk s) watschelt auf die nächste Figur zu und richtet sich so aus, dass sie in seiner Kipp-Bahn steht. Er
//           blickt immer in eine der vier Himmelsrichtungen (±X, ±Z) – so liegt seine Landefläche achsenparallel.
//     warn  (warn s) bleibt stehen, zittert; **rote Landefläche** (Modell 'landemarke', sonst blocks/w5kit.js landingHint)
//           zeigt genau den Grundriss, auf den er gleich fällt (3,6 × 3,4 m vor ihm) – jetzt ausweichen! Steht die Figur
//           in seiner Bahn, beginnt warn
//           sofort, sonst nach Ablauf von walk (er kippt also auch ins Leere – „kippt öfter“, je Phase kürzer).
//     tilt  (tilt s) kippt nach vorn aufs Gesicht. Aufschlag: wer im Grundriss steht, wird getroffen und hinausgeschoben,
//           Gegner darunter onHit('mega'); Beben. Phase mit shock: eine **Schockwelle** (Ring, 0,45 m hoch, wächst mit
//           shockSpeed m/s bis shockR m) läuft über den Boden – drüberspringen. Phase ≥ escortFrom: die Begleit-Kippquader
//           (Baustein kippquader mit start: 'signal', Ids in escorts) kippen beim Kippen des Königs mit.
//     lie   (lie s) liegt flach, **begehbar** (feste Kollisions-Box 3,6 × 3,4 × 1,5 m, Oberseite = Rücken), Schwindelsterne.
//           **Nur eine Landung (Sprung oder Stampfattacke) auf dem Schwachpunkt-Feld** (1,9 × 1,9 m um model.back(), Mitte
//           2,6 m vor dem Fuß) ist ein Treffer: hit (0,6 s, Abprall) → rise. Landen daneben, Berührung von vorn/seitlich,
//           Feuer, Krallen, Kanonenkugel, Bombe, Stern, Riese, Würfe zählen nicht.
//     rise  (0,8 s) richtet sich auf; wer noch auf ihm steht, wird abgeworfen. Nach einem Treffer: corners[i] (Ids von
//           `bruchplatte`) brechen weg, roar (1 s, neue Phase, Ansage) → walk; ohne Treffer gleich → walk.
//   3. Treffer → defeated (2,2 s, zerbröckelt, Krone springt) → gone: Stern (star) erscheint, Boss-Archetyp öffnet die
//   Warp-Box (Fanfare course_clear, Lebensleiste wie die anderen Bosse). Berührung von vorn/seitlich (stehend) verletzt,
//   auf den Kopf springen = Abprall ohne Schaden. Kein `enemy`, `boss: true` (Stern/Riese wirken nicht).
// Ansagen über arch.hud.banner: „Spring auf den blauen Stern auf seinem Rücken!“ (erster Gang), Phase 2 „Er wird schneller!“,
//   Phase 3 „Der Boden bebt – spring über die Welle!“ (mit shock) bzw. „Jetzt kippt er öfter!“; die Standardtexte des
//   Archetyps werden ersetzt.
// Boss-Archetyp-Schnittstelle wie lavafelsen_koenig.js: begin(), reset(), state, stateT, hp, maxHp, phase, visible, home,
//   half, carHits (0), vulnerable, info(); level.onBossHit(boss, 'ruecken'), level.onBossDefeated(boss). Ohne Archetyp
//   beginnt der Kampf ab wakeR m, drop erscheint nach 'gone' in der Arenamitte.
//
// Daten: { kind: 'kippquader_koenig', id: 'koenig', pos (Start, Fußpunkt), dir?: [dx, dz] (Start-Blick, Standard +Z zur
//          Kamera), arena?: { center: [x, y, z], r: 9 } | { min: [x, z], max: [x, z] } (er bleibt mit seinem stehenden und
//          liegenden Grundriss darin), hp?: 3, speed?: [1.4, 1.9, 2.4], walk?: [2.6, 1.9, 1.3], warn?: [0.95, 0.8, 0.65],
//          tilt?: [0.7, 0.6, 0.5], lie?: [2.8, 2.4, 2.1], shock?: [false, false, true], shockR?: 7, shockSpeed?: 6.5,
//          escorts?: ['kq_a', …], escortFrom?: 3, corners?: [['e1', 'e2'], ['e3', 'e4']] (nach Treffer 1 / 2),
//          star?: { pos, index } | [x, y, z], wakeR?: 10, drop? }
// Laufzeit: facing (0 +X, 1 −Z, 2 −X, 3 +Z), lying (Kollisions-Box liegt), tips, hits, misses (Landungen neben dem Feld),
//   shocks, escortTips, hitLog, lyingBox(), backField() → { x, z, half }, info().
//
// bruchplatte – Bodenplatte (Arenaecke), die auf Abruf wegbricht: crumble() → wackelt warn s (Risse, Staub) → fällt (Form
//   weg) → nach 2,5 s weg; restore() setzt sie zurück (Neustart des Kampfs).
//   Daten: { kind: 'bruchplatte', id, pos (Mitte der Oberseite), size?: [4, 4] (w × d), thick?: 1, warn?: 0.9,
//            style?: 'tempel' | 'stein' }   Laufzeit: state ('solid' | 'warn' | 'fall' | 'gone'), rect, info().

import * as THREE from 'three';
import { EnemyW2, figures, activeFigure, clamp, wrapAngle } from '../EnemyW2.js';
import { CourseEntity } from '../CourseEntity.js';
import { spawnLoot } from '../Enemy.js';
import { landingHint } from '../../blocks/w5kit.js';
import { getModel, hasModel } from '../../models/index.js';
import { bossManaged } from '../w6help.js';

const W = 3.4, H = 3.6, D = 1.5;
const LX0 = D / 2, LX1 = D / 2 + H, LH = D;
const BACK_AT = D / 2 + 1.85, BACK_HALF = 0.95;
const INTRO = 2.2, HIT = 0.6, RISE = 0.8, ROAR = 1.0, DEFEAT = 2.2, LAND = 0.35;
const DIRS = [[1, 0], [0, -1], [-1, 0], [0, 1]];
const pick = (v, ph, def) => (Array.isArray(v) ? v[Math.min(v.length - 1, ph - 1)] : v ?? def[ph - 1]);
const LIST = (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);

/**
 * Rote Landefläche: Registry-Modell 'landemarke' (rote Fläche, heller Rand, nach innen laufender Warnrahmen), sonst
 * landingHint aus blocks/w5kit.js – gleiche Schnittstelle show(rects, y, k), hide(), shown, info().
 */
function markHint(level) {
  if (!level.view || !hasModel('landemarke')) return landingHint(level);
  const m = getModel('landemarke', { size: [LX1 - LX0, W] });
  const st = { shown: false, k: 0, y: 0, rects: [] };
  m.root.visible = false;
  level.view.add(m.root, (dt) => m.update(dt, { k: st.shown ? st.k : 0 }));
  return {
    show(rects, y, k = 1) {
      const r = rects?.[0];
      if (!r) return;
      st.rects = rects; st.y = y; st.k = clamp(k, 0, 1); st.shown = true;
      m.root.position.set((r.x0 + r.x1) / 2, y, (r.z0 + r.z1) / 2);
      m.root.rotation.y = (r.x1 - r.x0) >= (r.z1 - r.z0) ? 0 : Math.PI / 2;
    },
    hide() { st.shown = false; },
    get shown() { return st.shown; },
    info: () => ({ shown: st.shown, k: +st.k.toFixed(2), y: st.y, rects: st.rects.map((r) => [+r.x0.toFixed(2), +r.z0.toFixed(2), +r.x1.toFixed(2), +r.z1.toFixed(2)]), model: true }),
    dispose() { level.view?.remove(m.root); m.dispose?.(); },
  };
}

/** Blickrichtung (Index) zu einem Vektor: größere Achse. */
const facingOf = (dx, dz) => (Math.abs(dx) >= Math.abs(dz) ? (dx >= 0 ? 0 : 2) : (dz < 0 ? 1 : 3));
const overlap = (a, b, m = 0) => a.x0 < b.x1 - m && a.x1 > b.x0 + m && a.z0 < b.z1 - m && a.z1 > b.z0 + m;
const penetrates = (pos, half, b, eps = 0.05) => pos.x + half.x > b.x0 + eps && pos.x - half.x < b.x1 - eps
  && pos.z + half.z > b.z0 + eps && pos.z - half.z < b.z1 - eps && pos.y + 2 * half.y > b.y0 + eps && pos.y < b.y1 - eps;

class KippquaderKoenig extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'kippquader_koenig');
    this.enemy = false;
    this.boss = true;
    this.wake = 0;
    this.edges = false;
    this.shadow = 1.6;
    this.home = this.pos.clone();
    const a = spec.arena ?? {};
    if (a.min && a.max) this.arena = { rect: { x0: Math.min(a.min[0], a.max[0]), z0: Math.min(a.min[1], a.max[1]), x1: Math.max(a.min[0], a.max[0]), z1: Math.max(a.min[1], a.max[1]) } };
    else { const c = a.center ?? [this.home.x, this.home.y, this.home.z]; this.arena = { x: c[0], y: c[1], z: c[2], r: a.r ?? 9 }; }
    this.maxHp = spec.hp ?? 3;
    this.hp = this.maxHp;
    this.carHits = 0;
    this.visible = true;
    this.wakeR = spec.wakeR ?? 10;
    this.startFacing = facingOf(...(Array.isArray(spec.dir) ? [spec.dir[0], spec.dir[1]] : [0, 1]));
    this.hint = markHint(level);
    this.waves = [];
    this.waveMeshes = [];
    this.lyingSid = null;
    this.resetFields();
    if (level.view) this.setModel(getModel('kippquader_koenig'));
    this.initShadows(2);
  }

  resetFields() {
    this.state = 'wait';
    this.stateT = 0;
    this.facing = this.startFacing;
    this.yaw = this.facing * Math.PI / 2;
    this.yawVis = this.yaw;
    this.turnCool = 0;
    this.tips = 0; this.hits = 0; this.misses = 0; this.shocks = 0; this.escortTips = 0;
    this.hitLog = [];
    this.fromHit = false;
    this.hinted = false;
    this.dropped = false;
    this.starDone = false;
    this.cornersBroken = 0;
    this.landSeen = new Set();
    this.setHalf();
  }

  get phase() { return clamp(this.maxHp - this.hp + 1, 1, 3); }
  // LEVEL.boss wie bisher; additiv (Präzisierung Gegner Bonuswelten): auch LEVEL.bosses und Boss-Gruppen (bossManaged)
  get managed() { return bossManaged(this.level, this.spec.id); }
  val(key, def) { return pick(this.spec[key], this.phase, def); }
  /** Lava/Absturz: der König bleibt auf der Insel (die Arenagrenze hält ihn). */
  checkLava() { return false; }
  get lying() { return this.lyingSid !== null; }
  get vulnerable() { return this.state === 'lie' && this.hp > 0; }

  setState(s) { this.state = s; this.stateT = 0; }

  /** Hülle stehend (Fußpunkt pos): 1,5 m tief in Blickrichtung, 3,4 m breit, 3,6 m hoch. */
  setHalf() {
    const along = DIRS[this.facing][0] !== 0;
    this.half.set(along ? D / 2 : W / 2, H / 2, along ? W / 2 : D / 2);
  }

  /** Rechteck entlang der Blickrichtung k: Abschnitt [a0, a1] vor dem Fuß, seitlich ±lat. */
  rect(k, a0, a1, lat, x = this.pos.x, z = this.pos.z) {
    const [fx, fz] = DIRS[k];
    if (fx) { const u = x + fx * a0, v = x + fx * a1; return { x0: Math.min(u, v), x1: Math.max(u, v), z0: z - lat, z1: z + lat }; }
    const u = z + fz * a0, v = z + fz * a1;
    return { x0: x - lat, x1: x + lat, z0: Math.min(u, v), z1: Math.max(u, v) };
  }

  standRect(k = this.facing, x, z) { return this.rect(k, -D / 2, D / 2, W / 2, x, z); }
  lieRect(k = this.facing, x, z) { return this.rect(k, LX0, LX1, W / 2, x, z); }

  /** Kollisions-Box im Liegen. */
  lyingBox(k = this.facing) { const r = this.lieRect(k); return { ...r, y0: this.pos.y, y1: this.pos.y + LH }; }

  /** Schwachpunkt-Feld (liegend): Mitte und halbe Kantenlänge. */
  backField(k = this.facing) {
    const [fx, fz] = DIRS[k];
    return { x: this.pos.x + fx * BACK_AT, z: this.pos.z + fz * BACK_AT, half: BACK_HALF, y: this.pos.y + LH };
  }

  /** Ecken (Bruchplatten) und Begleit-Kippquader (samt ihrer nächsten Lage), die er nie betritt. */
  holes() {
    const out = [];
    for (const pair of LIST(this.spec.corners)) for (const id of LIST(pair)) { const e = this.level.named.get(id); if (e?.rect) out.push(e.rect); }
    for (const id of LIST(this.spec.escorts)) {
      const q = this.level.named.get(id);
      if (!q?.box) continue;
      const b = q.box;
      out.push({ x0: b.x0 - 0.3, x1: b.x1 + 0.3, z0: b.z0 - 0.3, z1: b.z1 + 0.3 });
      for (const r of q.nextRects?.() ?? []) out.push({ x0: r.x0 - 0.3, x1: r.x1 + 0.3, z0: r.z0 - 0.3, z1: r.z1 + 0.3 });
    }
    return out;
  }

  /** Rechteck ganz in der Arena (und nicht über einer Ecke)? */
  fits(r) {
    const A = this.arena;
    if (A.rect) { if (r.x0 < A.rect.x0 || r.x1 > A.rect.x1 || r.z0 < A.rect.z0 || r.z1 > A.rect.z1) return false; }
    else for (const [x, z] of [[r.x0, r.z0], [r.x1, r.z0], [r.x0, r.z1], [r.x1, r.z1]]) if (Math.hypot(x - A.x, z - A.z) > A.r) return false;
    for (const h of this.holes()) if (overlap(r, h, 0.05)) return false;
    return true;
  }

  arenaCenter() { const A = this.arena; return A.rect ? { x: (A.rect.x0 + A.rect.x1) / 2, z: (A.rect.z0 + A.rect.z1) / 2 } : { x: A.x, z: A.z }; }

  // ------------------------------------------------------------------ Archetyp-Schnittstelle

  begin() {
    if (this.state !== 'wait') return;
    this.setState('intro');
    this.faceFigure(true);
    this.level.sfx('slam');
  }

  reset() {
    this.removeLying();
    this.hint.hide();
    this.clearWaves();
    this.hp = this.maxHp;
    this.defeated = false;
    this.visible = true;
    this.touch = true;
    this.fellOut = false;
    this.pos.copy(this.home);
    this.vel.set(0, 0, 0);
    if (this.model) this.model.root.visible = true;
    for (const pair of LIST(this.spec.corners)) for (const id of LIST(pair)) this.level.named.get(id)?.restore?.();
    for (const id of LIST(this.spec.escorts)) resetKippquader(this.level.named.get(id));
    this.resetFields();
  }

  // ------------------------------------------------------------------ Schritt

  update(dt) {
    this.stateT += dt;
    if (this.turnCool > 0) this.turnCool -= dt;
    this.run(dt);
    this.stepWaves(dt);
    this.syncArch();
  }

  run(dt) {
    switch (this.state) {
      case 'wait':
        this.stand(dt);
        if (!this.managed) {
          for (const p of figures(this.level)) if (activeFigure(p) && Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < this.wakeR) { this.begin(); break; }
        }
        return;
      case 'intro':
        this.stand(dt);
        if (this.stateT > 0.8 && this.stateT - dt <= 0.8) { this.level.shake(0.5); this.level.sfx('slam'); this.level.effects?.ring(this.pos, 2.4); }
        if (this.stateT >= INTRO) this.startWalk();
        return;
      case 'walk': this.walkStep(dt); return;
      case 'warn': {
        this.stand(dt);
        const T = this.val('warn', [0.95, 0.8, 0.65]);
        this.hint.show([this.lieRect()], this.pos.y, 0.35 + 0.65 * Math.min(1, this.stateT / T));
        if (this.stateT >= T) this.startTilt();
        return;
      }
      case 'tilt': {
        this.stand(dt);
        const T = this.val('tilt', [0.7, 0.6, 0.5]);
        this.hint.show([this.lieRect()], this.pos.y, 1);
        if (this.stateT >= T * 0.5) this.touch = false;
        if (this.stateT >= T) this.impact();
        return;
      }
      case 'lie':
        this.stand(dt);
        this.checkBackLanding();
        if (this.state === 'lie' && this.stateT >= this.val('lie', [2.8, 2.4, 2.1])) this.startRise(false);
        return;
      case 'hit':
        this.stand(dt);
        if (this.stateT >= HIT) this.startRise(true);
        return;
      case 'rise':
        this.stand(dt);
        if (this.stateT >= RISE) {
          this.touch = true;
          if (this.fromHit) { this.breakCorners(); this.setState('roar'); this.level.sfx('boss_spin'); this.level.shake(0.3); }
          else this.startWalk();
        }
        return;
      case 'roar':
        this.stand(dt);
        this.faceFigure(false, dt);
        if (this.stateT >= ROAR) this.startWalk();
        return;
      case 'defeated':
        this.stand(dt);
        if (this.stateT >= DEFEAT) this.vanish();
        return;
      default: this.stand(dt);
    }
  }

  /** Blick (Himmelsrichtung) zur nächsten Figur; mit Zögern beim Wechseln (turnCool), now = sofort. */
  faceFigure(now = false) {
    const p = this.player;
    if (!activeFigure(p)) return;
    const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z;
    const k = facingOf(dx, dz);
    if (k === this.facing) return;
    const [fx, fz] = DIRS[this.facing];
    const along = dx * fx + dz * fz, cross = Math.abs(dx * -fz + dz * fx);
    if (!now && this.turnCool > 0) return;
    if (!now && along > 0 && cross < along * 1.25 + 0.6) return;   // steht noch ungefähr vor ihm
    this.setFacing(k);
  }

  setFacing(k) {
    if (k === this.facing) return;
    const r = this.standRect(k);
    if (!this.fits(r) && this.fits(this.standRect())) return;   // Drehen würde über den Rand ragen
    this.facing = k;
    this.yaw = k * Math.PI / 2;
    this.turnCool = 0.45;
    this.setHalf();
    this.level.effects?.dust(this.pos, 4, 1.2);
  }

  startWalk() {
    this.setState('walk');
    this.walkT = this.val('walk', [2.6, 1.9, 1.3]);
    this.walkToCenter = false;
    this.faceFigure(true);
    if (!this.hinted) {
      this.hinted = true;
      this.level.archetype?.hud?.banner?.('Spring auf den blauen Stern auf seinem Rücken!', { hold: 2.2, size: 13, y: 0.36 });
    }
  }

  walkStep(dt) {
    this.faceFigure(false);
    const p = this.player;
    const [fx, fz] = DIRS[this.facing];
    let vx = 0, vz = 0;
    const sp = this.val('speed', [1.4, 1.9, 2.4]);
    if (activeFigure(p) || this.walkToCenter) {
      // Ziel: die Figur liegt mitten in seiner Kipp-Bahn (2,6 m vor ihm, seitlich bündig); passt dort keine Landefläche,
      // geht er erst zur Arenamitte
      const c = this.walkToCenter ? this.arenaCenter() : null;
      const gx = c ? c.x : p.pos.x - fx * BACK_AT, gz = c ? c.z : p.pos.z - fz * BACK_AT;
      const dx = gx - this.pos.x, dz = gz - this.pos.z, d = Math.hypot(dx, dz);
      if (d > 0.15) { vx = (dx / d) * Math.min(sp, d * 4); vz = (dz / d) * Math.min(sp, d * 4); }
    }
    // nicht über den Rand bzw. auf eine Ecke
    const nx = this.pos.x + vx * dt, nz = this.pos.z + vz * dt;
    if (!this.fits(this.standRect(this.facing, nx, nz))) {
      if (this.fits(this.standRect(this.facing, nx, this.pos.z))) vz = 0;
      else if (this.fits(this.standRect(this.facing, this.pos.x, nz))) vx = 0;
      else { vx = 0; vz = 0; }
    }
    this.vel.x = vx; this.vel.z = vz;
    this.moveWithGravity(dt);
    this.walkSpeed = Math.hypot(vx, vz);
    if (this.stateT > 0.35 && (this.inLane(p) || this.stateT >= this.walkT)) this.tryWarn();
  }

  /** Steht die Figur in der Kipp-Bahn? */
  inLane(p) {
    if (!activeFigure(p)) return false;
    const r = this.lieRect();
    return p.pos.x > r.x0 - 0.3 && p.pos.x < r.x1 + 0.3 && p.pos.z > r.z0 - 0.3 && p.pos.z < r.z1 + 0.3 && p.pos.y < this.pos.y + 3;
  }

  /** Kippen ankündigen, wenn die Landefläche passt (sonst eine andere Richtung bzw. weitergehen). */
  tryWarn() {
    if (!this.fits(this.lieRect())) {
      const p = this.player;
      const want = activeFigure(p) ? { x: p.pos.x - this.pos.x, z: p.pos.z - this.pos.z } : (() => { const c = this.arenaCenter(); return { x: c.x - this.pos.x, z: c.z - this.pos.z }; })();
      const order = [0, 1, 2, 3].sort((a, b) => (want.x * DIRS[b][0] + want.z * DIRS[b][1]) - (want.x * DIRS[a][0] + want.z * DIRS[a][1]));
      const k = order.find((q) => this.fits(this.lieRect(q)) && this.fits(this.standRect(q)));
      if (k === undefined) { this.walkT = this.stateT + 0.8; this.walkToCenter = true; return; }
      this.facing = k; this.yaw = k * Math.PI / 2; this.setHalf();
    }
    this.walkToCenter = false;
    this.setState('warn');
    this.vel.x = 0; this.vel.z = 0;
    this.level.sfx('panic');
  }

  startTilt() {
    this.setState('tilt');
    this.tips++;
    this.level.sfx('swoop');
    if (this.phase >= (this.spec.escortFrom ?? 3)) {
      // Begleit-Kippquader: laufen ab jetzt mit Vorwarnung (roter Boden) ihre eigene Bahn
      for (const id of LIST(this.spec.escorts)) {
        const q = this.level.named.get(id);
        if (!q || q.state === 'done') continue;
        if (!q.running) this.escortTips++;
        q.running = true;
        if (q.state === 'wait' && q.t < q.wait - q.warnT) q.t = q.wait - q.warnT;
      }
    }
  }

  /** Aufschlag: Treffer im Grundriss, liegende Box, Beben, Schockwelle. */
  impact() {
    const box = this.lyingBox();
    for (const p of figures(this.level)) {
      if (p.mode === 'script' || !penetrates(p.pos, p.half, box)) continue;
      p.hurt({ pos: { x: (box.x0 + box.x1) / 2, y: box.y0, z: (box.z0 + box.z1) / 2 }, kippquader: this });
      this.pushOut(p, box);
    }
    for (const e of this.level.entities) {
      if (!e.enemy || !e.alive || e.defeated || e.removed || e === this) continue;
      if (penetrates(e.pos, e.half, box)) e.onHit?.('mega', this);
    }
    this.lyingSid = this.addShape({ type: 'box', min: [box.x0, box.y0, box.z0], max: [box.x1, box.y1, box.z1], tag: 'kippquader_koenig', camIgnore: true });
    this.hint.hide();
    this.landSeen.clear();
    for (const p of figures(this.level)) if (p.mode === 'ground' && p.ground?.owner === this) this.landSeen.add(p);
    const c = { x: (box.x0 + box.x1) / 2, y: box.y0, z: (box.z0 + box.z1) / 2 };
    this.level.shake(0.6);
    this.level.sfx('slam'); this.level.sfx('land');
    this.level.effects?.ring(c, 3.2);
    this.level.effects?.dust(c, 14, 1.8);
    if (this.val('shock', [false, false, true])) this.shockwave(c);
    this.setState('lie');
  }

  pushOut(f, b) {
    for (let k = 0; k < 3; k++) {
      if (!penetrates(f.pos, f.half, b, 0.02)) return;
      const opts = [[b.x0 - f.half.x - 0.06 - f.pos.x, 0], [b.x1 + f.half.x + 0.06 - f.pos.x, 0], [0, b.z0 - f.half.z - 0.06 - f.pos.z], [0, b.z1 + f.half.z + 0.06 - f.pos.z]];
      opts.sort((u, v) => Math.hypot(u[0], u[1]) - Math.hypot(v[0], v[1]));
      f.pos.x += opts[0][0]; f.pos.z += opts[0][1];
    }
  }

  /** Landungen auf dem Rücken prüfen: auf dem Feld = Treffer, daneben = nichts. */
  checkBackLanding() {
    for (const p of figures(this.level)) {
      const on = p.mode === 'ground' && p.ground?.owner === this;
      if (!on) { this.landSeen.delete(p); continue; }
      if (this.landSeen.has(p)) continue;
      this.landSeen.add(p);
      if (p.state !== 'land' || p.stateTime > 0.05) continue;   // hinaufgelaufen/geschoben zählt nicht
      const f = this.backField();
      const m = 0.15;
      if (Math.abs(p.pos.x - f.x) <= f.half + m && Math.abs(p.pos.z - f.z) <= f.half + m) { this.takeHit(p); return; }
      this.misses++;
      this.level.sfx('blockhit');
    }
  }

  takeHit(p) {
    if (this.hp <= 0) return;
    this.hp--;
    this.hits++;
    this.hitLog.push({ t: +this.level.time.toFixed(2), hp: this.hp, pound: !!p.poundLanded });
    p.bounceOff?.({});
    this.level.sfx('boss_hit');
    this.level.shake(0.5);
    const f = this.backField();
    this.level.effects?.sparks({ x: f.x, y: f.y + 0.3, z: f.z }, 20);
    this.level.onBossHit?.(this, 'ruecken');
    if (this.hp <= 0) {
      this.defeated = true;
      this.removeLying();
      this.touch = false;
      this.setState('defeated');
      this.level.sfx('powerdown');
      this.level.onBossDefeated?.(this);
      return;
    }
    this.setState('hit');
  }

  startRise(fromHit) {
    this.fromHit = fromHit;
    // wer noch auf dem Rücken steht, wird abgeworfen (nach hinten, weg vom Gesicht)
    const [fx, fz] = DIRS[this.facing];
    for (const p of figures(this.level)) {
      if (p.mode !== 'ground' || p.ground?.owner !== this) continue;
      p.bounceOff?.({});
      p.vel.x = -fx * 4; p.vel.z = -fz * 4;
    }
    this.removeLying();
    this.setState('rise');
  }

  removeLying() {
    if (this.lyingSid === null) return;
    this.level.world.remove(this.lyingSid);
    const k = this.shapes.indexOf(this.lyingSid);
    if (k >= 0) this.shapes.splice(k, 1);
    this.lyingSid = null;
  }

  breakCorners() {
    const list = LIST(this.spec.corners);
    const pair = list[this.cornersBroken];
    if (!pair) return;
    this.cornersBroken++;
    for (const id of LIST(pair)) this.level.named.get(id)?.crumble?.();
  }

  // ------------------------------------------------------------------ Schockwelle

  shockwave(c) {
    this.shocks++;
    this.waves.push({ x: c.x, z: c.z, y: c.y, r: 2.0, rMax: this.spec.shockR ?? 7, hit: new Set() });
  }

  stepWaves(dt) {
    if (!this.waves.length) return;
    const sp = this.spec.shockSpeed ?? 6.5;
    const fx = this.level.effects;
    for (const w of this.waves) {
      w.r += sp * dt;
      // Staub am Wellenkamm (lesbar auf hellem Boden)
      w.dustT = (w.dustT ?? 0) - dt;
      if (fx && w.dustT <= 0) {
        w.dustT = 0.09;
        for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + w.r * 0.7; fx.dust({ x: w.x + Math.cos(a) * w.r, y: w.y, z: w.z + Math.sin(a) * w.r }, 1, 0.5); }
      }
      for (const p of figures(this.level)) {
        if (!activeFigure(p) || w.hit.has(p)) continue;
        if (p.pos.y > w.y + 0.45 || p.pos.y + p.half.y * 2 < w.y - 0.2) continue;
        const d = Math.hypot(p.pos.x - w.x, p.pos.z - w.z);
        if (Math.abs(d - w.r) < 0.3 + p.half.x && p.hurt({ pos: { x: w.x, y: w.y, z: w.z } })) w.hit.add(p);
      }
    }
    this.waves = this.waves.filter((w) => w.r < w.rMax);
  }

  clearWaves() { this.waves.length = 0; }

  // ------------------------------------------------------------------ Ansagen

  syncArch() {
    const arch = this.level.archetype;
    if (!arch || arch.boss !== this) return;
    const ph = this.phase;
    // vor dem Archetyp (afterStep) – so erscheinen die eigenen Texte statt der Standardtexte
    if (arch.seenPhase !== ph && this.state !== 'hit' && this.hp > 0) {
      arch.seenPhase = ph;
      if (ph === 2) arch.hud?.banner?.('Er wird schneller!', { hold: 1.4, size: 14, color: '#ffb040' });
      if (ph === 3) arch.hud?.banner?.(this.val('shock', [false, false, true]) ? 'Der Boden bebt – spring über die Welle!' : 'Jetzt kippt er öfter!', { hold: 1.7, size: 14, color: '#ff7a3a' });
    }
  }

  // ------------------------------------------------------------------ Treffer und Berührung

  onHit(kind) {
    if (!this.visible || this.hp <= 0) return;
    if (kind !== 'pound' && kind !== 'bump') { this.level.effects?.sparks(this.center(), 3); this.level.sfx('blockhit'); }
  }

  onPlayer(player, contact) {
    if (!this.visible || this.hp <= 0) return 'none';
    switch (this.state) {
      case 'wait': case 'lie': case 'hit': case 'rise': case 'defeated': case 'gone': return 'none';
      default:
        if (contact.fromAbove || contact.pound) { this.level.sfx('bounce'); return 'stomp'; }
        return 'hurt';
    }
  }

  vanish() {
    this.setState('gone');
    this.visible = false;
    this.touch = false;
    this.hint.hide();
    this.clearWaves();
    // Begleit-Kippquader kommen nach dem Sieg zur Ruhe (bleiben, wo sie liegen)
    for (const id of LIST(this.spec.escorts)) {
      const q = this.level.named.get(id);
      if (!q?.stop) continue;
      const rest = () => { q.stop(); if (q.state === 'warn') { q.state = 'wait'; q.t = 0; } q.hint?.hide?.(); };
      if (q.state === 'tip' && q.onLand) { const off = q.onLand(() => { off(); rest(); }); } else rest();
    }
    if (this.model) this.model.root.visible = false;
    this.level.effects?.dust(this.pos, 14, 2);
    const st = this.spec.star;
    if (st && !this.starDone) {
      this.starDone = true;
      const pos = Array.isArray(st) ? st : st.pos;
      this.level.spawn('star', { pos, index: Array.isArray(st) ? 0 : (st.index ?? 0) });
      this.level.effects?.sparks({ x: pos[0], y: pos[1] + 0.6, z: pos[2] }, 24);
    }
    if (!this.managed && !this.dropped && this.spec.drop) {
      this.dropped = true;
      const c = this.arenaCenter();
      spawnLoot(this.level, this.spec.drop, c.x, this.home.y + 0.5, c.z);
    }
  }

  // ------------------------------------------------------------------ Darstellung

  modelState() {
    const s = this.state, hp = Math.max(0, this.hp);
    if (s === 'walk') return { anim: 'walk', hp, speed: this.walkSpeed ?? 1.5 };
    if (s === 'tilt') return { anim: 'tilt', hp, progress: Math.min(1, this.stateT / this.val('tilt', [0.7, 0.6, 0.5])), mark: 0 };
    if (s === 'lie') return { anim: this.stateT < LAND ? 'land' : 'stunned', hp };
    if (s === 'hit') return { anim: 'hit', hp, progress: Math.min(1, this.stateT / HIT) };
    if (s === 'rise') return { anim: 'rise', hp, progress: Math.min(1, this.stateT / RISE) };
    if (s === 'defeated' || s === 'gone') return { anim: 'defeated', hp: 0, progress: Math.min(1, this.stateT / 1.6) };
    return { anim: 'idle', hp, mark: 0 };
  }

  syncModel() {
    if (!this.model) return;
    const r = this.model.root;
    r.visible = this.visible;
    this.yawVis += wrapAngle(this.yaw - this.yawVis) * Math.min(1, 0.25);
    r.position.copy(this.pos);
    r.rotation.y = this.yawVis;
    const shake = this.state === 'warn' ? 0.05 : this.state === 'roar' ? 0.035 : this.state === 'intro' && this.stateT < 0.9 ? 0.02 : 0;
    if (shake) { const t = this.level.time; r.position.x += Math.sin(t * 61) * shake; r.position.z += Math.cos(t * 53) * shake; }
  }

  render(dt, t) {
    super.render(dt, t);
    this.renderWaves();
  }

  renderWaves() {
    const view = this.level.view;
    if (!view) return;
    while (this.waveMeshes.length < this.waves.length) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.45, 56, 1, true), new THREE.MeshBasicMaterial({ color: 0xff9a3a, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
      m.renderOrder = 3;
      view.add(m);
      this.waveMeshes.push(m);
    }
    this.waveMeshes.forEach((m, i) => {
      const w = this.waves[i];
      m.visible = !!w;
      if (!w) return;
      m.position.set(w.x, w.y + 0.225, w.z);
      m.scale.set(w.r, 1, w.r);
      m.material.opacity = 0.8 * (1 - Math.max(0, (w.r - w.rMax * 0.7) / (w.rMax * 0.3)));
    });
  }

  info() {
    return {
      state: this.state, hp: this.hp, maxHp: this.maxHp, phase: this.phase, facing: this.facing, lying: this.lying, tips: this.tips,
      hits: this.hits, misses: this.misses, shocks: this.shocks, waves: this.waves.length, escortTips: this.escortTips,
      corners: this.cornersBroken, vulnerable: this.vulnerable, x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2),
      hint: this.hint.info().shown,
    };
  }

  dispose() {
    for (const m of this.waveMeshes) { this.level.view?.remove(m); m.geometry.dispose(); m.material.dispose(); }
    this.waveMeshes.length = 0;
    this.hint.dispose?.();
    super.dispose();
  }
}

/** Begleit-Kippquader (Baustein) an seinen Ausgangsplatz zurücksetzen (Neustart des Kampfs). */
function resetKippquader(q) {
  if (!q?.home || !q.R) return;
  q.R.copy(q.home.R); q.c.copy(q.home.c);
  q.anim = null; q.riders = []; q.queue = null; q.state = 'wait'; q.t = 0; q.idx = 0; q.dirSign = 1;
  q.running = q.startMode === 'auto';
  q.hint?.hide?.();
  q.place?.();
}

// =====================================================================================================================
// Bruchplatte
// =====================================================================================================================

const PLATE_STYLE = { tempel: [0xf0d49a, 0xc8965a, 0x8a5e34], stein: [0xd6d2de, 0x9a96a8, 0x5e5a6e] };

class Bruchplatte extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'bruchplatte');
    this.touch = false;
    this.shadow = 0;
    const s = spec.size ?? [4, 4];
    this.w = s[0]; this.d = s[1] ?? s[0];
    this.thick = spec.thick ?? 1;
    this.warnT = spec.warn ?? 0.9;
    this.top = this.pos.y;
    this.rect = { x0: this.pos.x - this.w / 2, x1: this.pos.x + this.w / 2, z0: this.pos.z - this.d / 2, z1: this.pos.z + this.d / 2 };
    this.half.set(this.w / 2, this.thick / 2, this.d / 2);
    this.state = 'solid';
    this.t = 0; this.dy = 0; this.vy = 0;
    this.addSolidShape();
    if (level.view) this.buildMesh(spec.style);
  }

  addSolidShape() {
    if (this.shapes.length) return;
    const r = this.rect;
    this.addShape({ type: 'box', min: [r.x0, this.top - this.thick, r.z0], max: [r.x1, this.top, r.z1], tag: 'bruchplatte' });
  }

  buildMesh(style) {
    const C = (PLATE_STYLE[style] ?? PLATE_STYLE.tempel).map((c) => new THREE.Color(c));
    const g = new THREE.BoxGeometry(this.w - 0.04, this.thick, this.d - 0.04, 2, 1, 2).toNonIndexed();
    const n = g.attributes.normal, p = g.attributes.position;
    const col = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const up = n.getY(i);
      if (up > 0.5) { c.copy(C[0]); const seam = Math.abs(p.getX(i)) < 0.05 || Math.abs(p.getZ(i)) < 0.05; if (seam) c.lerp(C[1], 0.4); }
      else if (up < -0.5) c.copy(C[2]);
      else c.copy(C[1]).lerp(C[0], (p.getY(i) / this.thick + 0.5) * 0.6);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, emissive: 0x000000 }));
    this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this.level.view.add(this.mesh);
    this.placeMesh();
  }

  placeMesh() {
    const m = this.mesh;
    if (!m) return;
    let x = this.pos.x, z = this.pos.z;
    if (this.state === 'warn') { const t = this.level.time; x += Math.sin(t * 57) * 0.05; z += Math.cos(t * 49) * 0.05; }
    m.position.set(x, this.top - this.thick / 2 + this.dy, z);
    m.rotation.set(this.state === 'fall' ? this.t * 0.6 : 0, 0, this.state === 'fall' ? this.t * 0.35 : 0);
    m.visible = this.state !== 'gone';
    m.material.emissive.setRGB(this.state === 'warn' ? 0.25 + 0.2 * Math.sin(this.level.time * 20) : 0, 0.02, 0);
  }

  crumble() {
    if (this.state !== 'solid') return false;
    this.state = 'warn'; this.t = 0;
    this.level.sfx('sand_crumble');
    this.level.effects?.dust({ x: this.pos.x, y: this.top, z: this.pos.z }, 6, 1.2);
    return true;
  }

  restore() {
    this.state = 'solid'; this.t = 0; this.dy = 0; this.vy = 0;
    this.addSolidShape();
    this.placeMesh();
  }

  update(dt) {
    if (this.state === 'solid' || this.state === 'gone') return;
    this.t += dt;
    if (this.state === 'warn' && this.t >= this.warnT) {
      this.state = 'fall'; this.t = 0;
      this.removeShapes();
      this.level.sfx('brickbreak');
      this.level.effects?.debris({ x: this.pos.x, y: this.top, z: this.pos.z }, 0xc8965a, 10);
      this.level.shake(0.2);
      return;
    }
    if (this.state === 'fall') {
      this.vy -= 25 * dt;
      this.dy += this.vy * dt;
      if (this.t > 2.5) this.state = 'gone';
    }
  }

  render() { this.placeMesh(); }

  info() { return { state: this.state, dy: +this.dy.toFixed(2), solid: this.shapes.length > 0 }; }

  dispose() {
    if (this.mesh) { this.level.view?.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh.material.dispose(); this.mesh = null; }
    super.dispose();
  }
}

export const KINDS = {
  kippquader_koenig: (level, spec) => new KippquaderKoenig(level, spec),
  bruchplatte: (level, spec) => new Bruchplatte(level, spec),
};
