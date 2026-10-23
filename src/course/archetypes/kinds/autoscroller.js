// Archetyp `autoscroller` (Bauplan „Autoscroller – Plattform/Fahrzeug bewegt sich, Kamera folgt fest“: 2-Panzer,
// 3-2 Kettenzäune, 3-Zug, 5-Zug, 6-Panzer, 8-Zug). Ein **Bildfenster** (ScrollWindow) fährt mit konstantem,
// abschnittsweise wechselndem Tempo entlang eines Pfads; die Kamera folgt dem Fenster (nicht der Figur). Die Figur
// bewegt sich frei im Fenster, wird an der vorderen Grenze sanft gebremst und an der hinteren Grenze mitgeschoben;
// steckt sie zwischen einem Hindernis und der hinteren Grenze fest, wird sie zerquetscht (Tod, wie im Vorbild).
// Fahrzeuge (Entität `vehicle`) fahren mit dem Fenster oder mit eigenem Tempo und tragen Figur, Gegner, Objekte;
// Unterobjekte über `attach: '<Fahrzeug-Id>'`. Am Ende (`end`) hält das Fenster, die Grenzen fallen weg, die Kamera
// gleitet zurück zur normalen Verfolgung, die Figur läuft frei weiter (z. B. zur Röhre in die Bossarena).
//
// LEVEL.scroll = {
//   path: [[x, y, z], …]   Fensterlinie (Mitte des Fensters; y = Fahrebene der Fahrzeuge, z. B. Schienenoberkante)
//   axis: '-z', line: [x, y]   statt path: gerade Fahrt (start/end/speeds.from als Koordinate auf der Achse)
//   start: 0, end: L        Pfadlänge (m) der Fenstermitte am Anfang/Ende (bei axis: Koordinaten)
//   speed: 4                m/s; speeds: [{ from, speed }] ab dieser Pfadlänge (bzw. Koordinate) gilt speed
//   accel: 6                m/s² Anfahren/Tempowechsel (abgebremst wird weich bis genau `end`)
//   delay: 1                s nach Levelstart (bzw. nach dem Auslöser) bis zur Abfahrt
//   trigger: { min, max }   optional: Abfahrt erst, wenn die Figur diesen Quader betritt
//   frame: { back: 5, front: 8, side: null,   Grenzen (m) hinter/vor der Fenstermitte, seitlich ± (null = frei);
//            back + front ≤ 13 (Spiegelfrucht: weiter auseinander gehen Klone „verloren“, Squad.LOST_BEHIND)
//            soft: 1.5,      m vor der vorderen Grenze wird gebremst (sanft)
//            crush: 0.35,    m – so weit darf die Figur hinter der hinteren Grenze festhängen, dann Tod
//            backMode: 'push' (Standard) | 'kill' (senkrechte Fahrt: unten raus = Tod)
//            ahead: 0,       Kamera-Blickziel so viele m vor der Fenstermitte
//            followX: 0.3,   seitliches Mitgehen der Kamera mit der Figur (0..1)
//            followY: 1,     senkrechtes Mitgehen (1 = Standhöhe der Figur wie üblich, 0 = Fensterhöhe)
//            turn: true }    Kamera dreht mit der Fahrtrichtung (Kurven); LEVEL.camera-yaw kommt hinzu
//   with: 'boss'            optional zweiter Archetyp (z. B. Bossarena nach der Fahrt) – seine Haken laufen mit,
//                           Kamera/Darstellung übernimmt er nach dem Ende der Fahrt
//   endBanner: 'Endstation!' Ansage beim Halt ('' = keine), startBanner: 'Los geht's!'
//   cams, frames, killUp, gates, reveal, fall, cap, sync   Regie je Pfadlänge (archetypes/ScrollDirector.js):
//                           Kamera und Fenstergrenzen je Pfadlänge s, fahrende Plattformen im Takt der Fahrt-Uhr …
// }
// Mit `with: 'boss'` zeigen archetype.boss/seenPhase auf den Zusatz-Archetyp (Endgegner lesen sie).
// Ansagen von Autoscroller und Zusatz-Archetyp teilen sich eine Warteschlange (hud.js: keine Überlagerung).
// Kamera-Schienenwerte (pitch, dist, yaw, fov, height) kommen weiter aus LEVEL.camera, ausgewertet an der
// Fenstermitte. HUD/Timer wie gewohnt. Tod → Neustart am letzten Checkpoint (auch auf einem Fahrzeug, attach) mit
// der Fensterlage von damals, sonst am Levelstart mit Fahrt von vorn.
// level.scroll = ScrollWindow (Fahrzeuge lesen es). info(): { state, s, speed, clock, center, dir, player: { along,
// across }, pushes, crushed, camK, inherit, sub }.

import { ScrollWindow } from '../ScrollWindow.js';
import { installScrollDirector } from '../ScrollDirector.js';
import { ArchHud } from '../hud.js';
import { createArchetype } from '../index.js';

const DEG = Math.PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;
const wrap = (a) => { a %= Math.PI * 2; if (a > Math.PI) a -= Math.PI * 2; else if (a < -Math.PI) a += Math.PI * 2; return a; };
const FREE = new Set(['ground', 'air', 'wall', 'swim']);

class Autoscroller {
  constructor(scene) {
    this.scene = scene;
    const data = scene.levelData ?? scene.level?.data ?? {};
    this.cfg = data.scroll ?? {};
    this.frame = { back: 5, front: 8, side: null, soft: 1.5, crush: 0.35, backMode: 'push', ahead: 0, followX: 0.3, followY: 1, turn: true, ...(this.cfg.frame ?? {}) };
    this.win = new ScrollWindow(this.cfg, data.start?.pos ?? [0, 0, 0]);
    // Fahrzeuge lesen das Fenster schon beim Levelaufbau (vor setup)
    if (scene.level) scene.level.scroll = this.win;
    this.hud = new ArchHud(scene);
    this.sub = this.cfg.with ? createArchetype(this.cfg.with, scene) : null;
    this.figState = new WeakMap();   // je Figur: geerbtes Fahrzeugtempo in der Luft (inh), Modus vor dem Schritt (prev)
    this.camK = 1;                   // 1 = Kamera am Fenster, 0 = normale Verfolgung (nach dem Ende)
    this.pushes = 0;
    this.crushed = 0;
    this.snap = null;                // Fensterlage beim letzten Checkpoint
    this.ended = false;
    this._l = {};
    this._rail = {};
  }

  /** Endgegner des Zusatz-Archetyps (with: 'boss') – Entitäten lesen level.archetype.boss/seenPhase. */
  get boss() { return this.sub?.boss; }
  get seenPhase() { return this.sub?.seenPhase; }
  set seenPhase(v) { if (this.sub) this.sub.seenPhase = v; }

  createPlayer(level, opts) { return this.sub?.createPlayer?.(level, opts); }
  createRig(view, player) { return this.sub?.createRig?.(view, player); }

  setup() {
    const level = this.level = this.scene.level;
    level.scroll = this.win;
    const rt = level.runtime;
    const respawn = rt.respawn.bind(rt);
    rt.respawn = () => { this.onRespawn(); respawn(); };
    const setCp = rt.setCheckpoint.bind(rt);
    rt.setCheckpoint = (pos, yaw) => { setCp(pos, yaw); this.snap = this.win.snapshot(); };
    this.sub?.setup?.();
    this.director = installScrollDirector(this, level, this.scene, this.cfg);
    if (this.cfg.startBanner) this.hud.banner(this.cfg.startBanner, { hold: 1.4 });
  }

  /** Neustart: Fenster auf die Lage beim Checkpoint (bzw. Anfang), Fahrzeuge folgen im nächsten Schritt. */
  onRespawn() {
    this.win.restore(this.snap);
    for (const f of this.level.players) this.fstate(f).inh = { x: 0, z: 0 };
    this.ended = this.win.state === 'done';
    this.camK = this.ended ? 0 : 1;
  }

  /** Zustand je Figur (Spiegelfrucht-Klone: jede Figur erbt ihr eigenes Fahrzeugtempo). */
  fstate(f) {
    let s = this.figState.get(f);
    if (!s) { s = { inh: { x: 0, z: 0 }, prev: f.mode }; this.figState.set(f, s); }
    return s;
  }

  /** Alle Figuren im Spiel (Haupt-Figur zuerst; entfernte Klone nicht). */
  figures() { return this.level.players.filter((f) => !f.removedFigure); }

  // ------------------------------------------------------------------ Schritt

  beforeStep(dt, input) {
    const level = this.level, w = this.win;
    if (w.step(dt, level.player)) this.onEnd();
    // Steuerungs-Gier: aus der Kamera am Fenster (deterministisch, wie CameraRig.controlYaw)
    if (this.camK > 0) {
      const rig = this.scene.view.rig;
      const own = this.windowYaw(rig) + rig.userYawTarget * DEG;
      level.controlYaw = this.camK >= 1 ? own : level.controlYaw + wrap(own - level.controlYaw) * this.camK;
    }
    // In der Luft: Bewegung relativ zum geerbten Fahrzeugtempo rechnen (Luftsteuerung/Luftwiderstand der Figur
    // wirken dann relativ zum Fahrzeug – Springen auf fahrenden Wagen fühlt sich wie im Stand an)
    for (const p of this.figures()) {
      const st = this.fstate(p), inh = st.inh;
      st.prev = p.mode;
      if ((p.mode !== 'air' && p.mode !== 'wall') || (!inh.x && !inh.z)) continue;
      p.vel.x -= inh.x; p.vel.z -= inh.z;
      const cc = { x: p.pos.x, y: p.pos.y + p.half.y, z: p.pos.z };
      const res = level.world.moveAABB(cc, p.half, { x: inh.x * dt, y: 0, z: inh.z * dt }, { step: 0.32 });
      p.pos.set(cc.x, cc.y - p.half.y, cc.z);
      if (res.hitWall) {
        const n = res.wallNormal, d = inh.x * n.x + inh.z * n.z;
        if (d < 0) { inh.x -= n.x * d; inh.z -= n.z * d; }
      }
      p.platformVel.set(0, 0, 0);        // Coyote-Sprung soll das Tempo nicht doppelt aufschlagen
    }
    this.sub?.beforeStep?.(dt, input);
  }

  afterStep(dt, input) {
    for (const p of this.figures()) this.inherit(p);
    if (!this.ended) { for (const p of this.figures()) this.constrain(dt, p); }
    else this.camK = Math.max(0, this.camK - dt / 1.1);
    this.sub?.afterStep?.(dt, input);
  }

  /** Geerbtes Tempo nach dem Schritt fortschreiben (siehe beforeStep). */
  inherit(p) {
    const st = this.fstate(p), inh = st.inh;
    const was = st.prev, now = p.mode;
    const inAir = now === 'air' || now === 'wall';
    if (!inAir) { inh.x = 0; inh.z = 0; return; }
    if (was === 'ground') {
      // gerade abgesprungen/abgegangen: Sprung und Kante haben das Plattformtempo schon aufgeschlagen,
      // der Rückstoß eines Treffers nicht
      const pv = p.platformVel;
      inh.x = pv.x; inh.z = pv.z;
      if (p.state === 'hurt') { p.vel.x += pv.x; p.vel.z += pv.z; }
      return;
    }
    if (was === 'air' || was === 'wall') { p.vel.x += inh.x; p.vel.z += inh.z; return; }
    inh.x = 0; inh.z = 0;
  }

  /**
   * Grenzen des Fensters für eine Figur: vorne bremsen, hinten schieben, Einklemmen = Tod; seitlich optional.
   * Klone: Einklemmen bzw. unten hinaus (backMode 'kill') entfernt nur diesen Klon (player.die → level.removeFigure).
   */
  constrain(dt, p) {
    if (p.dead || p.removedFigure || !FREE.has(p.mode)) return;
    const w = this.win, f = this.frame, world = this.level.world;
    const L = w.local(p.pos, this._l);
    const d = w.dir;
    // hinten
    if (L.along < -f.back) {
      if (f.backMode === 'kill') { p.die('fall'); return; }
      const need = -f.back - L.along;
      const c = { x: p.pos.x, y: p.pos.y + p.half.y, z: p.pos.z };
      world.moveAABB(c, p.half, { x: d.x * need, y: Math.max(0, d.y * need), z: d.z * need }, { step: 0.32 });
      p.pos.set(c.x, c.y - p.half.y, c.z);
      this.pushes++;
      const after = w.local(p.pos, this._l).along;
      if (after < -f.back - f.crush) { this.crushed++; p.die('crush'); return; }
      // nicht weiter nach hinten laufen als das Fenster fährt
      this.limitSpeed(p, w.speed, 'min');
    }
    // vorne: hart an der Grenze, davor sanft bremsen
    const L2 = w.local(p.pos, this._l);
    if (L2.along > f.front) {
      const back = L2.along - f.front;
      const c = { x: p.pos.x, y: p.pos.y + p.half.y, z: p.pos.z };
      world.moveAABB(c, p.half, { x: -d.x * back, y: 0, z: -d.z * back }, { step: 0.32 });
      p.pos.set(c.x, c.y - p.half.y, c.z);
    }
    const room = f.front - w.local(p.pos, this._l).along;
    if (room < f.soft) this.limitSpeed(p, w.speed + Math.max(0, room) * (6 / Math.max(0.1, f.soft)), 'max');
    // seitlich
    if (f.side !== null && f.side !== undefined) {
      const a = w.local(p.pos, this._l).across;
      if (Math.abs(a) > f.side) {
        const over = Math.abs(a) - f.side, sg = Math.sign(a), sd = w.side;
        const c = { x: p.pos.x, y: p.pos.y + p.half.y, z: p.pos.z };
        world.moveAABB(c, p.half, { x: -sd.x * sg * over, y: 0, z: -sd.z * sg * over }, { step: 0.32 });
        p.pos.set(c.x, c.y - p.half.y, c.z);
      }
    }
  }

  /** Tempo der Figur entlang der Fahrtrichtung begrenzen ('max': höchstens v, 'min': mindestens v). */
  limitSpeed(p, v, kind) {
    const d = this.win.dir;
    if (p.mode === 'ground') {
      const fx = Math.cos(p.yaw), fz = -Math.sin(p.yaw);
      const fa = fx * d.x + fz * d.z;
      const pv = p.platformVel.x * d.x + p.platformVel.z * d.z;
      const along = p.gs * fa + pv;
      if (kind === 'max' && along > v && fa > 0.05) p.gs = Math.max(0, (v - pv) / fa);
      if (kind === 'min' && along < v && fa < -0.05) p.gs = Math.max(0, (v - pv) / fa);
      return;
    }
    const along = p.vel.x * d.x + p.vel.z * d.z;
    if ((kind === 'max' && along > v) || (kind === 'min' && along < v)) { p.vel.x += d.x * (v - along); p.vel.z += d.z * (v - along); }
  }

  onEnd() {
    this.ended = true;
    if (this.cfg.endBanner !== '') this.hud.banner(this.cfg.endBanner ?? 'Endstation!', { hold: 1.4, size: 14 });
    this.level.sfx('switch');
  }

  // ------------------------------------------------------------------ Kamera

  /** Kamera-Gier (rad ohne Spielerdrehung) am Fenster: Schiene + Fahrtrichtung. */
  windowYaw(rig) {
    const c = this.win.center;
    const r = rig.railAt(c.x, c.z, this._rail);
    return r.yaw * DEG + (this.frame.turn ? this.win.headingYaw() : 0);
  }

  camera(dt, player, world) {
    const rig = this.scene.view.rig;
    // Grundlage: Kamera des Zusatz-Archetyps (nach der Fahrt) bzw. die normale Verfolgung
    const own = rig.custom;
    if (this.sub?.camera && this.camK < 1) this.sub.camera(dt, player, world);
    else { rig.custom = null; rig.update(dt, player, world); rig.custom = own; }
    const k = this.camK;
    if (k <= 0) return true;
    const w = this.win, f = this.frame, c = w.center, d = w.dir;
    const r = rig.railAt(c.x, c.z, this._rail);
    const yawDeg = r.yaw + (f.turn ? w.headingYaw() / DEG : 0);
    // Blickziel: Fenstermitte (+ ahead), seitlich/senkrecht teilweise bei der Figur
    const ty0 = rig.anchorY + r.height;
    const rel = { x: player.pos.x - c.x, y: ty0 - c.y, z: player.pos.z - c.z };
    const al = rel.x * d.x + rel.y * d.y + rel.z * d.z;
    const px = rel.x - d.x * al, py = rel.y - d.y * al, pz = rel.z - d.z * al;
    const sd = w.side;
    const lat = px * sd.x + pz * sd.z;                  // seitlicher Anteil
    const tx = c.x + d.x * f.ahead + sd.x * lat * f.followX;
    const tz = c.z + d.z * f.ahead + sd.z * lat * f.followX;
    const ty = c.y + d.y * f.ahead + py * f.followY;
    if (k >= 1) rig.target.set(tx, ty, tz);
    else rig.target.set(lerp(rig.target.x, tx, k), lerp(rig.target.y, ty, k), lerp(rig.target.z, tz, k));
    const cur = rig.cur;
    cur.pitch = lerp(cur.pitch, r.pitch, k);
    cur.fov = lerp(cur.fov, r.fov, k);
    cur.yaw = cur.yaw + wrap((yawDeg - cur.yaw) * DEG) / DEG * k;
    const want = r.dist * rig.zoom * rig.powerZoom;
    rig.distNow = lerp(rig.distNow, want, k);
    rig.place(cur, dt);
    return true;
  }

  render(dt, t) {
    this.hud.tick();
    this.sub?.render?.(dt, t);
  }

  info() {
    const p = this.level?.player;
    const L = p ? this.win.local(p.pos, {}) : null;
    return {
      ...this.win.info(), ended: this.ended, camK: +this.camK.toFixed(3),
      player: L ? { along: +L.along.toFixed(3), across: +L.across.toFixed(3) } : null,
      pushes: this.pushes, crushed: this.crushed, inherit: p ? [+this.fstate(p).inh.x.toFixed(3), +this.fstate(p).inh.z.toFixed(3)] : null, figures: this.level?.players.length ?? 0,
      frame: { back: this.frame.back, front: this.frame.front, side: this.frame.side },
      sub: this.sub?.info?.() ?? null, hud: this.hud.state(),
    };
  }

  dispose() {
    this.hud.dispose();
    this.sub?.dispose?.();
  }
}

export const ARCHETYPES = { autoscroller: (scene) => new Autoscroller(scene) };
