// Archetyp `house` (Prüfungs-Haus, Bauplan „Serie von 5–30 Mini-Räumen à 10 s, je ein Stern“: 2-Haus 5 Räume,
// 4-Haus 10, 6-Haus 5, 8-Haus 10, K-Haus 30). Die Räume liegen getrennt im Level (eigene Geometrie je Raum aus
// LEVEL.segments, Kamera je Raum über `area`). Die Figur beginnt im ersten Raum; je Raum läuft ein 10-s-Countdown
// (großer Timer im HUD, `sfx('house_tick')` in den letzten 3 s). Ziel erfüllt → der Stern erscheint und zählt
// (`sfx('room_clear')`), kurzer Jubel, Überblendung in den nächsten Raum. Zeit abgelaufen → das Haus wird mit den
// bisher gesammelten Sternen verlassen (Ergebnis „Prüfungs-Haus: n von N Sternen“, gespeichert) – wie im Vorbild;
// mit `fail: 'retry'` beginnt der Raum stattdessen von vorn. Das Gesamtzeit-Limit des Levels gilt nicht.
//
// LEVEL.house = {
//   rooms: [{
//     id: 'r1',
//     area: { min: [x, y, z], max: [x, y, z] } | [x0, z0, x1, z1],   Raum (Gegner darin zählen, Kamera-Abschnitt)
//     start: { pos: [x, y, z], yaw } | [x, y, z],                     Startpunkt der Figur (yaw Standard: nach −Z)
//     camera: { pitch, dist, yaw, fov, height, ahead, x, xLock, center: [x, y, z], pull: 0..1 },
//             Kameraschiene für diesen Raum (gilt im X-Bereich von area); center + pull ziehen den Blick zur Mitte
//     goal: 'defeatAll' | 'collect' | 'reach',
//             defeatAll: alle Gegner des Raums (spec.roomId = id bzw. ohne roomId: Fußpunkt in area) besiegt
//             collect:   alle Gegenstände mit spec.roomId = id eingesammelt (Münzen, blaue Münzen …; count: n reicht)
//             reach:     den Stern berühren (er ist von Anfang an sichtbar)
//     time: 10,                       s (Standard house.time bzw. 10)
//     star: [x, y, z],                Stern dieses Raums (Index = Raumnummer)
//     grab: false,                    defeatAll/collect: true = Stern erscheint und muss noch berührt werden
//                                     (Zeit läuft weiter); Standard: er fliegt zur Figur und zählt sofort
//     title: 'Besiege alle Gegner!',  Ansage beim Betreten ('' = keine; Standard je goal)
//     count: n                        collect: so viele reichen (Standard alle)
//   }, …],
//   fail: 'exit' | 'retry',           Zeit abgelaufen: Haus verlassen (Standard) oder Raum neu
//   time: 10, cheer: 1.5 (s Jubel), fade: 0.35 (s Überblendung je Richtung),
// }
// Sterne: Zahl = Räume (LevelRuntime bekommt N Plätze; HUD/Ergebnis zeigen N). Tod in einem Raum: Leben −1, der
// Raum beginnt von vorn (Gegner/Gegenstände neu, volle Zeit).
// level.house (HUD-Zustand, CourseUIScene): { room, rooms, time, limit, phase, fade, cleared, stars }.
// info(): { room, rooms, phase, time, left, cleared, stars, timeouts, resets, ticks, exited, done }.

import { ArchHud } from '../hud.js';
import { CAM_DEFAULT } from '../../view/CameraRig.js';
import { music } from '../../../audio/index.js';

const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const TITLES = { defeatAll: 'Besiege alle Gegner!', collect: 'Sammle alle Münzen!', reach: 'Hol den Stern!' };

function normArea(a) {
  if (!a) return null;
  if (Array.isArray(a)) return { x0: Math.min(a[0], a[2]), x1: Math.max(a[0], a[2]), z0: Math.min(a[1], a[3]), z1: Math.max(a[1], a[3]), y0: -1e9, y1: 1e9 };
  return { x0: a.min[0], y0: a.min[1], z0: a.min[2], x1: a.max[0], y1: a.max[1], z1: a.max[2] };
}
const inArea = (p, a) => !!a && p.x >= a.x0 && p.x <= a.x1 && p.z >= a.z0 && p.z <= a.z1 && p.y >= a.y0 - 0.5 && p.y <= a.y1 + 0.5;

class House {
  constructor(scene) {
    this.scene = scene;
    this.hud = new ArchHud(scene);
    this.i = 0;
    this.phase = 'fadein';
    this.phaseT = 0;
    this.fade = 1;
    this.timeLeft = 10;
    this.timeouts = 0;
    this.resets = 0;
    this.ticks = 0;
    this.cleared = 0;
    this.exited = false;
    this.done = false;
    this.flying = null;
  }

  setup() {
    const sc = this.scene, level = this.level = sc.level;
    const cfg = this.cfg = level.data.house ?? { rooms: [] };
    this.F = cfg.fade ?? 0.35;
    this.cheer = cfg.cheer ?? 1.5;
    this.rooms = (cfg.rooms ?? []).map((r, i) => {
      const st = Array.isArray(r.start) ? { pos: r.start } : (r.start ?? {});
      const start = { pos: st.pos ?? [0, 1, 0], yaw: st.yaw ?? Math.PI / 2 };
      return {
        ...r, index: i, id: r.id ?? `r${i + 1}`, area: normArea(r.area), goal: r.goal ?? 'reach', time: r.time ?? cfg.time ?? 10, start,
        starPos: r.star ?? [start.pos[0], start.pos[1] + 1.5, start.pos[2] - 2],   // ohne Angabe: vor dem Start
        star: null,                                                               // Stern-Entität (setup)
        enemies: [], specs: [], items: [], itemSpecs: [], down: new Set(),
      };
    });
    const N = this.rooms.length;
    // Laufzeit: N Stern-Plätze, kein Gesamtzeit-Limit (der Raum-Timer zählt)
    const rt = level.runtime;
    rt.timeLimit = 9999; rt.timeLeft = 9999;
    rt.starCount = N;
    rt.stars = Array.from({ length: Math.max(3, N) }, () => false);
    while (rt.starsSaved.length < N) rt.starsSaved.push(false);
    // Mitglieder je Raum: Gegner (roomId oder Fußpunkt im Bereich), Gegenstände (roomId)
    for (const e of level.entities) {
      const rid = e.spec?.roomId;
      if (e.enemy) {
        const room = this.rooms.find((r) => (rid !== undefined ? r.id === rid : inArea(e.pos, r.area)));
        if (room) { room.enemies.push(e); room.specs.push(e.spec); }
      } else if (rid !== undefined && e.kind !== 'star') {
        const room = this.rooms.find((r) => r.id === rid);
        if (room) { room.items.push(e); room.itemSpecs.push({ kind: e.kind, spec: e.spec }); }
      }
    }
    // Sterne je Raum (reach: sichtbar; sonst versteckt bis zum Ziel)
    for (const r of this.rooms) r.star = level.spawn('star', { pos: r.starPos, index: r.index, hidden: r.goal !== 'reach' });
    // Kamera je Raum: Schienenabschnitt im X-Bereich des Raums
    const rig = sc.view.rig;
    for (const r of this.rooms) {
      if (!r.area) continue;
      const c = r.camera ?? {};
      const s = { ...CAM_DEFAULT, pitch: 52, dist: 14, ...c, from: r.area.z1 + 1, to: r.area.z0 - 1, area: [r.area.x0 - 1, r.area.x1 + 1] };
      s.zMin = Math.min(s.from, s.to); s.zMax = Math.max(s.from, s.to);
      rig.sections.push(s);
    }
    // Haken: Gegner besiegt (verkettet), Neustart nach Tod
    const prev = level.onEnemyDefeated;
    level.onEnemyDefeated = (e) => { prev?.(e); this.onDefeated(e); };
    const respawn = rt.respawn.bind(rt);
    rt.respawn = () => {
      // Raum schon geschafft (Tod während des Jubels, z. B. Absturz vor der Landung): weiter im nächsten Raum
      if (this.room?.done) {
        if (this.flying) { this.flying.t = 1; this.updateFlight(0); }     // fliegender Stern zählt sofort
        respawn();
        if (this.i + 1 < this.rooms.length) this.enterRoom(this.i + 1);
        else { this.freeze('victory'); this.setPhase('final'); }
        return;
      }
      this.resetRoom(this.room); this.resets++; respawn(); this.enterRoom(this.i, { respawn: true });
    };
    level.house = this.ui = { room: 0, rooms: N, time: 10, limit: 10, phase: 'fadein', fade: 1, cleared: 0, stars: N };
    if (N) this.enterRoom(0, { first: true });
  }

  get room() { return this.rooms[this.i]; }

  /** level.onEnemyDefeated: Gegner des laufenden Raums zählen. */
  onDefeated(e) {
    const r = this.rooms.find((x) => x.enemies.includes(e));
    if (!r || r.down.has(e)) return;
    r.down.add(e);
    if (r === this.room && this.phase === 'play') {
      const n = this.left(r);
      if (n > 0) this.hud.banner(`noch ${n}`, { hold: 0.6, size: 12, y: 0.36, color: '#ffffff' });
    }
  }

  /** Figur in den Raum setzen, Timer voll, Überblendung herein. */
  enterRoom(i, o = {}) {
    const level = this.level, p = level.player, r = this.rooms[i], rt = level.runtime;
    this.i = i;
    this.timeLeft = r.time;
    this.lastCeil = Math.ceil(r.time);
    this.flying = null;
    rt.checkpoint = { pos: r.start.pos.slice(), yaw: r.start.yaw };     // Neustart nach Tod hier
    if (!o.respawn) {
      p.dead = false;
      p.reset(r.start.pos, r.start.yaw);
      p.invuln = 0;
      // Spiegelfrucht-Klone reisen mit: im Kreis um die Heldin am Raumstart
      if (level.players.length > 1) level.squad?.gather(p);
    }
    this.freeze('idle');
    level.controlYaw = this.scene.view.rig.controlYaw(p.pos);
    level.onTeleport();
    this.setPhase('fadein');
    this.fade = o.respawn ? 0.6 : 1;
    const title = r.title ?? TITLES[r.goal] ?? '';
    if (title !== '') this.hud.banner(`Raum ${i + 1}/${this.rooms.length}`, { hold: 0.9, size: 13, y: 0.24, color: '#ffffff' });
    if (title) this.queueTitle = title;
  }

  /** Alle Figuren (Heldin und Spiegelfrucht-Klone) anhalten: Überblendung, Jubel, Zeit um. */
  freeze(state) { for (const p of this.level.players) this.freezeOne(p, state); }

  freezeOne(p, state) {
    if (p.removedFigure || p.dead) return;
    p.dropHeld?.();
    p.mode = 'script';
    p.script = { type: 'house', t: 0 };
    p.vel.set(0, 0, 0);
    p.gs = 0;
    p.setState(state);
  }

  release() {
    for (const p of this.level.players) {
      if (p.mode !== 'script' || p.script?.type !== 'house') continue;
      p.script = null;
      p.mode = 'air';
      p.ground = null;
      p.setState('fall');
    }
  }

  setPhase(ph) { this.phase = ph; this.phaseT = 0; }

  // ------------------------------------------------------------------ Schritt

  afterStep(dt) {
    const level = this.level, rt = level.runtime, p = level.player, r = this.room;
    if (!r || this.done) return;
    rt.timeLeft = 9999;
    this.phaseT += dt;
    switch (this.phase) {
      case 'fadein':
        this.fade = Math.max(0, this.fade - dt / this.F);
        if (this.fade <= 0) {
          this.release();
          this.setPhase('play');
          if (this.queueTitle) { this.hud.banner(this.queueTitle, { hold: 1.3, size: 15 }); this.queueTitle = null; }
        }
        break;
      case 'play': {
        if (p.dead) break;                       // Todesanimation: Timer ruht
        this.timeLeft = Math.max(0, this.timeLeft - dt);
        const c = Math.ceil(this.timeLeft);
        if (c < this.lastCeil) {
          this.lastCeil = c;
          if (c >= 1 && c <= 3) { this.ticks++; level.sfx('house_tick'); }
        }
        if (this.goalMet(r)) { this.clear(r); break; }
        if (this.timeLeft <= 0) this.timeUp();
        break;
      }
      case 'clear':
        this.updateClear();
        break;
      case 'timeout':
        if (this.phaseT >= 1.6) {
          if ((this.cfg.fail ?? 'exit') === 'retry') { this.next = this.i; this.setPhase('fadeout'); }
          else this.exit();
        }
        break;
      case 'fadeout':
        this.fade = Math.min(1, this.fade + dt / this.F);
        if (this.fade >= 1) {
          if (this.next === this.i) { this.resetRoom(r); this.resets++; }
          this.enterRoom(this.next);
        }
        break;
      case 'final':
        if (this.phaseT >= 1.2 && rt.status === 'play') { this.done = true; rt.finish(); }
        break;
      default: break;
    }
    // Stern, der zur Figur fliegt (defeatAll/collect ohne grab)
    if (this.flying) this.updateFlight(dt);
    const u = this.ui;
    u.room = this.i; u.time = this.timeLeft; u.limit = r.time; u.phase = this.phase; u.fade = this.fade; u.cleared = this.cleared;
  }

  /** Ziel des Raums erfüllt? */
  goalMet(r) {
    const rt = this.level.runtime;
    if (r.goal === 'reach') return !!rt.stars[r.index];
    if (r.goal === 'defeatAll') {
      if (r.grab && r.revealed) return !!rt.stars[r.index];
      if (!r.enemies.length) return false;
      const ok = r.enemies.every((e) => r.down.has(e) || e.removed);
      if (ok && r.grab) { this.revealStar(r, true); return false; }
      return ok;
    }
    if (r.goal === 'collect') {
      if (r.grab && r.revealed) return !!rt.stars[r.index];
      const need = r.count ?? r.items.length;
      const got = r.items.filter((e) => e.removed || !e.alive).length;
      const ok = need > 0 && got >= need;
      if (ok && r.grab) { this.revealStar(r, true); return false; }
      return ok;
    }
    return false;
  }

  left(r = this.room) {
    if (!r) return 0;
    if (r.goal === 'defeatAll') return r.enemies.filter((e) => !(r.down.has(e) || e.removed)).length;
    if (r.goal === 'collect') return Math.max(0, (r.count ?? r.items.length) - r.items.filter((e) => e.removed || !e.alive).length);
    return this.level.runtime.stars[r.index] ? 0 : 1;
  }

  revealStar(r, touchable) {
    if (r.revealed) return;
    r.revealed = true;
    const st = r.star;
    if (!st || st.removed) return;
    st.reveal(r.starPos);
    st.touch = !!touchable;
    this.level.effects?.ring({ x: r.starPos[0], y: r.starPos[1] - 0.5, z: r.starPos[2] }, 1.8);
  }

  /** Ziel erfüllt: Timer steht, Stern erscheint und zählt, Jubel. */
  clear(r) {
    const level = this.level, rt = level.runtime;
    this.setPhase('clear');
    r.done = true;
    level.sfx('room_clear');
    if (!rt.stars[r.index]) {
      // Stern erscheint am Sternpunkt und fliegt zur Figur
      this.revealStar(r, false);
      if (r.star && !r.star.removed) this.flying = { star: r.star, t: 0, from: r.star.pos.clone(), index: r.index };
      else rt.collectStar(r.index);
    }
    this.cleared++;
    this.hud.banner(this.i + 1 >= this.rooms.length ? 'Alle Räume geschafft!' : 'Geschafft!', { hold: 1.2, color: '#7dffa0' });
  }

  updateFlight(dt) {
    const f = this.flying, p = this.level.player, st = f.star;
    f.t += dt;
    const k = smooth(f.t / 0.7);
    const tx = p.pos.x, ty = p.pos.y + p.half.y * 2 + 0.4, tz = p.pos.z;
    st.pos.set(lerp(f.from.x, tx, k), lerp(f.from.y, ty, k) + Math.sin(k * Math.PI) * 1.2, lerp(f.from.z, tz, k));
    if (f.t >= 0.7) {
      this.level.runtime.collectStar(f.index);
      this.level.effects?.sparks({ x: tx, y: ty, z: tz }, 16);
      st.kill();
      this.flying = null;
    }
  }

  updateClear() {
    // erst landen, dann Siegespose (je Figur, Klone auch)
    for (const p of this.level.players) {
      if (p.mode === 'script' || p.dead || p.removedFigure || !(p.mode === 'ground' || this.phaseT > 0.8)) continue;
      this.freezeOne(p, 'victory');
      if (p === this.level.player) this.level.sfx('victory');
    }
    if (this.phaseT >= this.cheer && !this.flying) {
      if (this.i + 1 < this.rooms.length) { this.next = this.i + 1; this.setPhase('fadeout'); }
      else { this.setPhase('final'); music.play('course_clear'); }
    }
  }

  timeUp() {
    this.timeouts++;
    this.setPhase('timeout');
    this.level.sfx('timewarn');
    this.freeze('idle');
    this.hud.banner('Zeit abgelaufen!', { hold: 1.4, color: '#ffb0a0' });
  }

  /** Haus verlassen (Zeit um): Ergebnis mit den bisherigen Sternen. */
  exit() {
    this.exited = true;
    this.done = true;
    this.phase = 'exit';
    const rt = this.level.runtime;
    if (rt.status === 'play') rt.finish();
  }

  /** Raum zurücksetzen: Gegner und Gegenstände frisch, Stern wieder versteckt. */
  resetRoom(r) {
    if (!r) return;
    const level = this.level;
    for (const e of r.enemies) if (!e.removed) e.kill();
    r.enemies = [];
    r.down.clear();
    for (const spec of r.specs) { const e = level.spawn(spec.kind, spec); if (e) r.enemies.push(e); }
    for (const e of r.items) if (!e.removed) e.kill();
    r.items = [];
    for (const it of r.itemSpecs) { const e = level.spawn(it.kind, it.spec); if (e) r.items.push(e); }
    if (r.goal !== 'reach' && r.star && !r.star.removed && !level.runtime.stars[r.index]) {
      r.star.hidden = true; r.star.touch = false;
      r.star.pos.set(r.starPos[0], r.starPos[1], r.starPos[2]);
      if (r.star.model) r.star.model.root.visible = false;
    }
    r.revealed = false;
    this.flying = null;
  }

  // ------------------------------------------------------------------ Kamera

  camera(dt, player, world) {
    const rig = this.scene.view.rig;
    const own = rig.custom;
    rig.custom = null;
    rig.update(dt, player, world);
    rig.custom = own;
    const c = this.room?.camera;
    if (c?.center) {
      const pull = c.pull ?? 0.4;
      rig.target.x = lerp(rig.target.x, c.center[0], pull);
      rig.target.z = lerp(rig.target.z, c.center[2], pull);
      rig.place(rig.cur, dt);
    }
    if (this.phase === 'clear' || this.phase === 'final') {
      const k = smooth(this.phaseT / 0.8) * 0.6;
      rig.target.set(lerp(rig.target.x, player.pos.x, k), lerp(rig.target.y, player.pos.y + 0.9, k), lerp(rig.target.z, player.pos.z, k));
      rig.distNow = lerp(rig.distNow, 9.5, k);
      rig.place(rig.cur, dt);
    }
    return true;
  }

  render() { this.hud.tick(); }

  info() {
    const rt = this.level?.runtime;
    return {
      room: this.i, rooms: this.rooms?.length ?? 0, id: this.room?.id ?? null, goal: this.room?.goal ?? null, phase: this.phase,
      time: +this.timeLeft.toFixed(3), fade: +this.fade.toFixed(3), left: this.left(), cleared: this.cleared,
      stars: rt ? rt.stars.slice(0, this.rooms.length) : [], timeouts: this.timeouts, resets: this.resets, ticks: this.ticks,
      exited: this.exited, done: this.done, flying: !!this.flying, hud: this.hud.state(),
    };
  }

  dispose() { this.hud.dispose(); }
}

export const ARCHETYPES = { house: (scene) => new House(scene) };
