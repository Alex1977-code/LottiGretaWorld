// Archetyp `arena` (Gegner-Blockade, Bauplan „Arena“, 1-A): kleiner Kampfplatz – alle Arena-Gegner besiegen,
// danach erscheint der Stern (kleine Kamerafahrt mit Funkeln); Einsammeln beendet das Level (Siegespose, Ergebnis,
// Stern gespeichert; kein Zielmast). Tod → Neustart der Arena (alle Gegner wieder da, Timer voll).
//
// LEVEL.arena = {
//   enemies: 'all' (Standard: alle Gegner aus LEVEL.enemies) | ['id', …] (nur diese zählen),
//   star: [x, y, z] (Fußpunkt des Sterns), starIndex: 0,
//   reveal: 1.4 (s nach dem letzten Sieg bis zum Erscheinen), intro: 'Besiege alle Gegner!' (Ansage, '' = keine),
//   crowd: 'crowd' (Id der Zuschauer-Tribünen, jubeln bei Treffern; optional),
//   center: [x, y, z] (Arena-Mitte) + camPull: 0.3 (Blickziel wird so stark zur Mitte gezogen – Überblick),
// }
// HUD (archetypes/hud.js): Bullen-/Gegnerköpfe mit „noch N“, Ansagen. info(): { total, left, cleared, starShown,
// won, resets, camera }.
// Hooks: level.onEnemyDefeated (verkettet), runtime.respawn (umhüllt: setzt die Arena zurück).

import { ArchHud } from '../hud.js';
import { music } from '../../../audio/index.js';

const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

class Arena {
  constructor(scene) {
    this.scene = scene;
    this.hud = new ArchHud(scene);
    this.total = 0;
    this.left = 0;
    this.counted = new Set();
    this.members = [];
    this.specs = [];
    this.clearT = null;
    this.star = null;
    this.starAppear = 0;
    this.won = false;
    this.winT = 0;
    this.resets = 0;
    this.cut = null;           // Kamerafahrt { t, dur, target }
    this.hp = new Map();
  }

  setup() {
    const sc = this.scene, level = this.level = sc.level;
    const cfg = this.cfg = level.data.arena ?? {};
    this.starIndex = cfg.starIndex ?? 0;
    this.starPos = cfg.star ?? [0, 1, 0];
    const list = cfg.enemies ?? 'all';
    for (const e of level.entities) {
      if (!e.enemy) continue;
      if (list !== 'all' && !list.includes(e.spec?.id)) continue;
      this.counted.add(e);
      this.members.push(e);
      this.specs.push(e.spec);
    }
    this.total = this.left = this.counted.size;
    // Verketten: andere Archetyp-/Level-Haken bleiben erhalten
    const prev = level.onEnemyDefeated;
    level.onEnemyDefeated = (e) => { prev?.(e); this.onDefeated(e); };
    const rt = level.runtime;
    const respawn = rt.respawn.bind(rt);
    rt.respawn = () => { this.resetArena(); respawn(); };
    this.crowd = level.named.get(cfg.crowd ?? 'crowd') ?? null;
    this.hud.arena({ left: this.left, total: this.total });
    if (cfg.intro !== '') this.hud.banner(cfg.intro ?? 'Besiege alle Gegner!', { hold: 1.8 });
  }

  onDefeated(e) {
    if (!this.counted.has(e)) return;
    this.counted.delete(e);
    this.left = Math.max(0, this.left - 1);
    this.hud.arena({ left: this.left, total: this.total });
    this.crowd?.cheer(1, 2.2);
    this.level.sfx('key');
    if (this.left === 0 && this.clearT === null) {
      this.clearT = 0;
      this.hud.banner('Alle besiegt!', { hold: 1.2, color: '#7dffa0' });
    }
  }

  /** Tod der Figur: Arena neu – Gegner frisch (volle Treffer), Stern weg. */
  resetArena() {
    const level = this.level;
    for (const e of this.members) if (!e.removed) e.kill();
    this.counted.clear();
    this.members = [];
    for (const spec of this.specs) {
      const e = level.spawn(spec.kind, spec);
      if (e) { this.counted.add(e); this.members.push(e); }
    }
    if (this.star && !this.star.removed) this.star.kill();
    this.star = null;
    this.clearT = null;
    this.cut = null;
    this.left = this.total;
    this.hp.clear();
    this.resets++;
    this.hud.arena({ left: this.left, total: this.total });
    if (this.cfg.intro !== '') this.hud.banner('Noch einmal!', { hold: 1.2 });
  }

  afterStep(dt) {
    const level = this.level, rt = level.runtime;
    // Jubel bei jedem Treffer (Lebenspunkte der Arena-Gegner beobachten)
    for (const e of this.counted) {
      const hp = e.hp ?? (e.defeated ? 0 : 1);
      const was = this.hp.get(e);
      if (was !== undefined && hp < was) this.crowd?.cheer(0.6, 1.0);
      this.hp.set(e, hp);
    }
    if (this.clearT !== null && !this.star) {
      this.clearT += dt;
      if (this.clearT >= (this.cfg.reveal ?? 1.4)) this.revealStar();
    }
    if (this.star && this.starAppear < 1) {
      this.starAppear = Math.min(1, this.starAppear + dt / 1.1);
      const k = smooth(this.starAppear);
      this.star.pos.y = this.starPos[1] - 1.2 + 1.2 * k + Math.sin(this.starAppear * Math.PI) * 1.2;
      if (this.starAppear >= 1) { this.star.touch = true; this.star.pos.y = this.starPos[1]; }
    }
    if (this.cut) { this.cut.t += dt; if (this.cut.t >= this.cut.dur) this.cut = null; }
    // Stern eingesammelt → Sieg
    if (!this.won && this.star && rt.stars[this.starIndex] && this.star.removed) {
      this.won = true;
      this.winT = 0;
      this.hud.banner('Arena geschafft!', { hold: 2.2, color: '#ffe066' });
      this.crowd?.cheer(1, 4);
      music.play('course_clear');
    }
    if (this.won) this.victory(dt);
  }

  revealStar() {
    const level = this.level;
    const [x, y, z] = this.starPos;
    this.star = level.spawn('star', { pos: [x, y - 1.2, z], index: this.starIndex });
    if (!this.star) return;
    this.star.touch = false;
    this.starAppear = 0;
    level.sfx('powerup');
    level.effects?.ring({ x, y: y - 0.9, z }, 2.2);
    level.effects?.sparks({ x, y, z }, 30);
    this.crowd?.cheer(1, 3);
    this.cut = { t: 0, dur: 2.4, target: { x, y: y + 0.4, z } };
  }

  /** Siegespose (erst auf dem Boden), dann Ergebnis. */
  victory(dt) {
    const p = this.level.player, rt = this.level.runtime;
    this.winT += dt;
    if (p.mode !== 'script') {
      if (p.mode === 'ground' || this.winT > 1.5) {
        p.dropHeld?.();
        p.mode = 'script';
        p.script = { type: 'arena-win', t: 0 };
        p.vel.set(0, 0, 0);
        p.gs = 0;
        p.yaw = -Math.PI / 2;
        p.setState('victory');
        this.level.sfx('victory');
        this.poseT = 0;
      }
      return;
    }
    this.poseT = (this.poseT ?? 0) + dt;
    if (this.poseT >= 1.8 && rt.status === 'play') rt.finish();
  }

  /** Kamerafahrt zum Stern bzw. Sieger-Nahaufnahme; sonst Standard-Kamera. */
  camera(dt, player, world) {
    const rig = this.scene.view.rig;
    const own = rig.custom;
    rig.custom = null;
    rig.update(dt, player, world);
    rig.custom = own;
    // Arena-Überblick: Blickziel ein Stück zur Mitte ziehen (camPull 0..1, Standard 0,3)
    const pull = this.cfg.camPull ?? 0.3;
    if (pull > 0 && this.cfg.center) {
      const [cx, , cz] = this.cfg.center;
      rig.target.x = lerp(rig.target.x, cx, pull * 0.5);
      rig.target.z = lerp(rig.target.z, cz, pull * 0.5);
      rig.place(rig.cur, dt);
    }
    let k = 0, tgt = null, dist = null;
    if (this.cut) {
      const c = this.cut;
      k = smooth(c.t / 0.6) * (1 - smooth((c.t - (c.dur - 0.7)) / 0.7));
      tgt = c.target; dist = 12;
    } else if (this.won && player.mode === 'script') {
      k = smooth((this.poseT ?? 0) / 0.8);
      tgt = { x: player.pos.x, y: player.pos.y + 0.8, z: player.pos.z }; dist = 8.5;
    }
    if (k > 0 && tgt) {
      rig.target.set(lerp(rig.target.x, tgt.x, k), lerp(rig.target.y, tgt.y, k), lerp(rig.target.z, tgt.z, k));
      rig.distNow = lerp(rig.distNow, dist, k);
      rig.place(rig.cur, dt);
    }
    return true;
  }

  render() { this.hud.tick(); }

  info() {
    return {
      total: this.total, left: this.left, cleared: this.clearT !== null, starShown: !!this.star, starTouch: !!this.star?.touch,
      won: this.won, resets: this.resets, cut: !!this.cut, hud: this.hud.state(),
    };
  }

  dispose() { this.hud.dispose(); }
}

export const ARCHETYPES = { arena: (scene) => new Arena(scene) };
