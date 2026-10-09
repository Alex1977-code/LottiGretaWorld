// Archetyp `boss` (Bauplan „Boss“: eigene Arena, 3 Treffer, Muster steigert sich; 1-Burg Baron Brummbär).
// Das Level ist ein normaler Parcours bis zur Bossarena; dort übernimmt der Archetyp:
//   - Start: betritt die Figur `trigger`, schließt sich die Sperre hinter ihr (`lock`), der Endgegner tritt auf
//     (boss.begin()), Ansage, HUD-Lebensleiste. Die Straße beginnt zu „fahren“ (level.highway.speed → speed):
//     Markierungen, Leitplankenpfosten, Laternen, Schilder und die Stadt ziehen vorbei (Laufband-Illusion,
//     blocks/types/highway.js `bossroad`); Figur und Endgegner bleiben im Kampffenster. Steht die Figur auf der
//     fahrenden Straße, zeigt sie die Laufbewegung (Rig), damit sie nicht „rutscht“.
//   - Kamera: Auftritt und Flucht mit kleiner Kamerafahrt, sonst die Schiene aus LEVEL.camera.
//   - Sieg: Endgegner besiegt → er flieht (state 'gone'), die Straße bremst ab, die Sperre öffnet sich, die
//     versteckte Warp-Box (`warp`) erscheint – sie führt zum Zielbereich (Zielmast, befreite Figur).
//   - Tod der Figur im Kampf: Neustart am Checkpoint vor der Arena, der Kampf beginnt von vorn (volle Leiste).
//
// LEVEL.boss = {
//   id: 'baron',                                  Endgegner-Entität (level.named), Schnittstelle wie entities/kinds/baron.js
//   name: 'Baron Brummbär',                       Anzeige in der Lebensleiste
//   trigger: { min: [x, y, z], max: [x, y, z] },  Kampfbeginn
//   lock: { min: [x, y, z], max: [x, y, z] },     Sperre (Kollision, camIgnore) während des Kampfs
//   speed: 10,                                    Fahrtempo der Illusion (m/s)
//   warp: 'warp_sieg',                            versteckte Warp-Box (reveal() nach dem Sieg); fehlt sie, erscheint
//                                                 eine eigene Warp-Röhre am Punkt warpPos mit Ziel warpTo
//   warpPos: [x, y, z], warpTo: [x, y, z],
//   frame: 0.42,                                  Kampfkamera: Blickziel so weit von der Figur zum Wagen (0..1)
// }
// info(): { started, won, speed, boss: baron.info(), hud, deaths }.

import * as THREE from 'three';
import { ArchHud } from '../hud.js';
import { HeroRig } from '../../player/HeroRig.js';
import { highwayState } from '../../blocks/types/highway.js';
import { music } from '../../../audio/index.js';

const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const inBox = (p, b) => p.x >= b.min[0] && p.x <= b.max[0] && p.y >= b.min[1] && p.y <= b.max[1] && p.z >= b.min[2] && p.z <= b.max[2];

/** Heldin auf der fahrenden Straße: im Stand/Gehen nach vorn Laufbewegung zeigen (nur Darstellung). */
class TreadmillRig extends HeroRig {
  build(key) {
    super.build(key);
    const av = this.avatar;
    if (!av) return;
    const orig = av.animate.bind(av);
    av.animate = (dt, t) => { this.adjust(); orig(dt, t); };
  }

  adjust() {
    const hw = this.player.level.highway;
    if (!hw || hw.speed < 2) return;
    const p = this.player, c = this.proxy.course;
    if (p.mode !== 'ground' || -Math.sin(p.yaw) > 0.3) return;   // nur mit Blick nach vorn (−Z)
    if (c.state === 'idle' || c.state === 'walk' || c.state === 'land') {
      c.state = 'run';
      c.speed = Math.max(c.speed, Math.min(9, hw.speed * 0.8));
      this.proxy.body.velocity.x = c.speed * 16;
    }
  }
}

class Boss {
  constructor(scene) {
    this.scene = scene;
    this.hud = new ArchHud(scene);
    this.started = false;
    this.won = false;
    this.wonT = 0;
    this.deaths = 0;
    this.lockId = null;
    this.introT = 0;
    this.seenPhase = 1;
  }

  createRig(view, player) { return new TreadmillRig(view, player); }

  setup() {
    const level = this.level = this.scene.level;
    const cfg = this.cfg = level.data.boss ?? {};
    this.boss = level.named.get(cfg.id ?? 'baron') ?? null;
    if (!this.boss) console.warn('[Boss] Endgegner fehlt:', cfg.id);
    this.hw = highwayState(level);
    this.name = cfg.name ?? 'Baron Brummbär';
    const rt = level.runtime;
    const respawn = rt.respawn.bind(rt);
    rt.respawn = () => { if (this.started && !this.won) this.resetFight(); respawn(); };
    // Treffer-Rückmeldung (Baron ruft diese Haken)
    const prevHit = level.onBossHit, prevDef = level.onBossDefeated;
    level.onBossHit = (b, where) => { prevHit?.(b, where); this.onHit(b, where); };
    level.onBossDefeated = (b) => { prevDef?.(b); this.onDefeated(b); };
  }

  start() {
    if (this.started || !this.boss) return;
    this.started = true;
    this.introT = 0;
    const L = this.cfg.lock;
    if (L) this.lockId = this.level.world.add({ type: 'box', min: L.min, max: L.max, camIgnore: true, tag: 'boss-lock' });
    this.boss.begin();
    this.hud.boss({ name: this.name, hp: this.boss.hp, max: this.boss.maxHp, car: 0 });
    this.level.sfx('gate');
  }

  /** Tod im Kampf: alles zurück, der Kampf beginnt beim nächsten Betreten neu. */
  resetFight() {
    this.deaths++;
    this.started = false;
    this.seenPhase = 1;
    this.boss?.reset();
    for (const e of this.level.entities) if (e.kind === 'kickbombe' && e.owner === this.boss) e.kill();
    if (this.lockId !== null) { this.level.world.remove(this.lockId); this.lockId = null; }
    this.hw.speed = 0;
    this.hud.hideBoss();
  }

  onHit(b, where) {
    this.hud.boss({ name: this.name, hp: b.hp, max: b.maxHp, car: b.carHits });
    if (b.hp > 0) this.hud.banner(where === 'car' ? 'Blechschaden!' : 'Treffer!', { hold: 0.9, size: 14, color: '#ffb0a0' });
  }

  onDefeated() {
    this.hud.banner(`${this.name} ist besiegt!`, { hold: 2.4, color: '#7dffa0' });
    music.play('course_clear');
  }

  afterStep(dt) {
    const level = this.level, p = level.player, b = this.boss;
    if (!b) return;
    if (!this.started && !this.won && !p.dead && this.cfg.trigger && inBox(p.pos, this.cfg.trigger)) this.start();
    // Fahrtempo der Illusion
    let want = 0;
    if (this.started) {
      const s = b.state;
      if (s === 'intro') want = b.stateT > 1.2 ? this.cfg.speed ?? 10 : 0;
      else if (s === 'defeated') want = (this.cfg.speed ?? 10) * 0.4;
      else if (s === 'flee' || s === 'gone') want = 0;
      else want = this.cfg.speed ?? 10;
    }
    this.hw.speed += Math.max(-6 * dt, Math.min(6 * dt, want - this.hw.speed));
    if (this.started && !this.won) {
      this.introT += dt;
      if (b.state === 'intro' && b.stateT > 1.0 && !this.introSaid) { this.introSaid = true; this.hud.banner(`${this.name}!`, { hold: 1.6, color: '#ff8a6a' }); }
      if (b.state === 'drive' && this.introSaid !== 'done') { this.introSaid = 'done'; this.hud.banner('Kick die Bomben zurück!', { hold: 1.8, size: 13, y: 0.36 }); }
      if (b.phase !== this.seenPhase && b.state !== 'hit') {
        this.seenPhase = b.phase;
        if (b.phase === 3) this.hud.banner('Vorsicht – Feuerspur!', { hold: 1.5, size: 14, color: '#ffb040' });
        else if (b.phase === 2) this.hud.banner('Er wird wütend!', { hold: 1.3, size: 14, color: '#ffb040' });
      }
      this.hud.boss({ name: this.name, hp: b.hp, max: b.maxHp, car: b.carHits });
      if (b.state === 'gone') this.win();
    }
    if (this.won) this.wonT += dt;
  }

  win() {
    this.won = true;
    this.wonT = 0;
    this.started = false;
    if (this.lockId !== null) { this.level.world.remove(this.lockId); this.lockId = null; }
    this.hud.hideBoss();
    const level = this.level;
    // Bomben des Barons entschärfen
    for (const e of level.entities) if (e.kind === 'kickbombe' && !e.kicker && e.owner === this.boss) { e.lit = false; e.flip?.(null, 6); }
    const w = this.cfg.warp ? level.named.get(this.cfg.warp) : null;
    if (w && typeof w.reveal === 'function') w.reveal();
    else this.fallbackWarp();
    const at = w?.pos ?? (this.cfg.warpPos ? { x: this.cfg.warpPos[0], y: this.cfg.warpPos[1], z: this.cfg.warpPos[2] } : null);
    if (at) { level.effects?.sparks({ x: at.x, y: at.y + 1.2, z: at.z }, 30); level.effects?.ring(at, 2); }
    level.sfx('powerup');
    this.hud.banner('Spring in die Warp-Box!', { hold: 2.2, size: 13, y: 0.36 });
  }

  /** Ohne Warp-Box-Baustein: Röhre am Siegpunkt, die zum Ziel führt (Rückfall). */
  fallbackWarp() {
    const c = this.cfg;
    if (!c.warpPos || !c.warpTo) return;
    const [x, y, z] = c.warpPos;
    const top = y + 1.2;
    const lv = this.level;
    lv.world.add({ type: 'cyl', x, z, r: 0.9, y0: y, y1: top, pipe: { x, z, top, enterRadius: 0.85, exit: { pos: c.warpTo }, enter: (pl) => pl.enterPipe({ x, z, top, exit: { pos: c.warpTo } }) }, tag: 'boss-warp' });
    if (lv.view) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.2, 24), new THREE.MeshStandardMaterial({ color: 0x9a5ae0, roughness: 0.3 }));
      m.position.set(x, y + 0.6, z);
      m.userData.owned = true;
      lv.view.add(m);
    }
    this.fallback = { x, y, z };
  }

  camera(dt, player, world) {
    const rig = this.scene.view.rig;
    const own = rig.custom;
    rig.custom = null;
    rig.update(dt, player, world);
    rig.custom = own;
    const b = this.boss;
    if (!b || !b.visible) return true;
    // Kampf: Blickziel zwischen Figur und Wagen (beide im Bild), weich eingeblendet
    const fight = b.state !== 'wait' && b.state !== 'gone' && b.state !== 'flee';
    this.frame = Math.max(0, Math.min(1, (this.frame ?? 0) + (fight ? dt : -dt) * 1.6));
    if (this.frame > 0) {
      const f = smooth(this.frame);
      const front = b.home.z + b.half.z;
      const tz = lerp(player.pos.z, front, this.cfg.frame ?? 0.42);
      rig.target.z = lerp(rig.target.z, tz, f);
      rig.target.x = lerp(rig.target.x, player.pos.x * 0.5, f);
      rig.place(rig.cur, dt);
    }
    let k = 0, tgt = null, dist = null;
    if (b.state === 'intro') {
      k = smooth(b.stateT / 0.5) * (1 - smooth((b.stateT - 1.9) / 0.5));
      tgt = { x: b.pos.x, y: b.pos.y + 1.5, z: b.pos.z + 4 }; dist = 17;
    } else if (b.state === 'defeated' || b.state === 'flee') {
      k = 0.55 * (1 - smooth((b.stateT - (b.state === 'flee' ? 2.2 : 99)) / 0.6));
      tgt = { x: b.pos.x, y: b.pos.y + 1.5, z: Math.max(b.pos.z, b.home.z - 14) + 2 }; dist = 17;
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
    return { started: this.started, won: this.won, speed: +this.hw.speed.toFixed(2), boss: this.boss?.info?.() ?? null, hud: this.hud.state(), deaths: this.deaths, lock: this.lockId !== null };
  }

  dispose() { this.hud.dispose(); }
}

export const ARCHETYPES = { boss: (scene) => new Boss(scene) };
