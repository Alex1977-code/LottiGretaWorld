// Phaser-Szene 'CourseMap': Kurs-Weltkarte – eine frei begehbare 3D-Insel je Welt, auf der die Level als Eingänge
// stehen (Bauplan: Weltkarte & Weltstruktur). Nutzt die Level-Infrastruktur des Motors: Level-Objekt mit
// Kollisionswelt, CourseView (Renderer, Kamera-Rig, Licht, Himmel, Schatten), dieselbe Spielfigur (Player + HeroRig),
// dieselbe Eingabe (Tastatur, Touch-Stick + A/B/Y) im festen Zeitschritt 1/120 s. Die Karte ist ein besonderes
// „Level“ (archetype 'map') aus Weltdaten (worlds/w<n>.js); ihre Laufzeit (MapRuntime) kennt keinen Timer und keine
// Lebensverluste.
//
// Ablauf: Auf einem freien Eingang A / Leertaste / Enter (Touch: „Los!“) → scene.start('Course', { id }).
// Rückkehr aus dem Level: scene.start('CourseMap', { from, done?, gameOver? }) → Figur steht vor dem Eingang;
// frisch freigeschaltete Wege: Kamera schwenkt zur Schranke, die Blöcke versinken, das Podest hüpft.
// Klassik-Knopf → 'WorldMap' (bisherige Weltkarte).
//
// URL: ?map=1 (Karte direkt), ?mapAlias=1-1:0-0,… (Testparameter: Eingang startet ein anderes Level).
// Test-Schnittstelle window.__courseMap (= diese Szene): step(n), setInput(o), setManual(b), teleport(x,y,z),
//   state(), enter() (Enter-Taste), pressGo() (Touch „Los!“), selectHero(k), toggleMute(), toClassic(),
//   resetSave(), status(id), snapCamera().

import Phaser from 'phaser';
import * as THREE from 'three';
import { CourseView } from '../view/CourseView.js';
import { CourseInput } from '../input/CourseInput.js';
import { Level } from '../level/Level.js';
import { Player } from '../player/Player.js';
import { HeroRig } from '../player/HeroRig.js';
import { courseSave } from '../level/CourseSave.js';
import { getLevel } from '../levels/index.js';
import { getPower, normalizePower } from '../player/powers.js';
import { music, sfx, engine } from '../../audio/index.js';
import { vibrate } from '../../systems/haptics.js';
import { RENDER3D } from '../../render3d.js';
import { getWorldMap } from './worlds/index.js';
import { buildMap, finalizeMap } from './MapBuilder.js';
import { MapRuntime } from './MapRuntime.js';
import { MapRoamer, MapItem, addEntity } from './entities.js';
import * as unlock from './unlock.js';
import { exitPoint, entranceById, ENTER_R } from './layout.js';
import { MapHud } from './MapHud.js';
import { MapBatcher } from './MapBatcher.js';

export const DT = 1 / 120;
const MAX_STEPS = 8;
const NEAR_R = 6.5;          // so nah → Hinweis-Leiste unten
const FACE_CAMERA = -Math.PI / 2;
const NEUTRAL = Object.freeze({
  moveX: 0, moveY: 0, mag: 0, run: false, jump: false, jumpPressed: false, jumpReleased: false,
  crouch: false, crouchPressed: false, actionPressed: false, camLeft: false, camRight: false, zoom: false, pause: false, debug: false,
});

/** ?mapAlias=1-1:0-0,1-A:0-0 → { '1-1': '0-0', … } (Testparameter). */
function parseAlias() {
  const out = {};
  try {
    const p = new URLSearchParams(window.location.search).get('mapAlias');
    if (p) for (const pair of p.split(',')) { const [a, b] = pair.split(':'); if (a && b) out[a.trim()] = b.trim(); }
  } catch { /* ohne URL */ }
  return out;
}

export class CourseMapScene extends Phaser.Scene {
  constructor() {
    super('CourseMap');
  }

  init(data) {
    this.arrive = data ?? {};
    this.manual = false;
    this.acc = 0;
    this.leaving = false;
    this.level = null;
    this.debug = false;
    this.cine = null;
    this.focus = null;
    this.pendingEnter = false;
    this.inputLocked = false;
    this.lastStart = null;
    this.onPad = null;
    this.nearEntrance = null;
    this.safe = null;
    this.roamers = [];
    this.item = null;
  }

  create() {
    if (!RENDER3D.enabled) {
      console.error('[Weltkarte] Die Kurs-Weltkarte braucht die 3D-Darstellung (WebGL2) – Klassik-Karte.');
      this.scene.start('WorldMap', {});
      return;
    }
    this.alias = parseAlias();
    this.reverseAlias = Object.fromEntries(Object.entries(this.alias).map(([a, b]) => [b, a]));
    const arrive = this.translateArrival(this.arrive);
    const worldNo = arrive.world ?? (arrive.from ? this.worldOfLevel(arrive.from) : null) ?? courseSave.data.world ?? 1;
    this.map = getWorldMap(worldNo) ?? getWorldMap(1);
    const map = this.map;
    courseSave.data.world = map.world;
    courseSave.beginMapVisit();

    // Level-Objekt der Karte (gleiche Infrastruktur wie ein Kurs-Level)
    this.cinput = new CourseInput(this);
    const data = {
      id: map.id, world: map.world, title: map.title, archetype: 'map', theme: map.theme ?? 'map', music: map.music,
      camera: map.camera, start: map.spawn, timeLimit: 0,
    };
    this.view = new CourseView(this, data);
    this.level = new Level(this, data, { view: this.view, save: courseSave });
    this.level.runtime = new MapRuntime(this.level, courseSave, this);

    // Statische Geometrie in Kacheln verschmelzen (besseres Culling auf der breiten Insel): addStatic umleiten
    this.batcher = new MapBatcher(this.view);
    this.view.addStatic = (g, o) => this.batcher.add(g, o);

    // Zustände der Eingänge (aus dem Speicherstand) und frisch zu öffnende Schranken
    this.computeStatuses();
    const fresh = [];
    this.built = buildMap(this.level, map, {
      entranceInfo: (def) => ({ label: this.labelOf(def.id) }),
      gateClosed: (g) => {
        if (!unlock.pathOpen(map, courseSave, g.for)) return true;
        if (!courseSave.mapOpened(g.for)) { fresh.push(g.for); return true; }
        return false;
      },
    });
    this.grid = this.built.grid;
    this.spawnRoamers();
    this.spawnBerryItem();
    this.batcher.build();
    finalizeMap(this.level, this.built);
    this.level.killY = (map.sea ?? 0) - 1.6;

    // Eingänge darstellen (frisch freigeschaltete erst nach dem Öffnen der Schranke)
    for (const [id, ev] of this.built.entrances) {
      const st = this.status(id);
      const hidden = fresh.includes(id);
      ev.setState(hidden ? { locked: true } : { locked: st.locked, soon: st.soon, enterable: st.enterable, done: st.done });
      if (st.roamer) ev.setPodiumVisible(false);
    }

    // Spielfigur
    const place = this.arrivalPoint(arrive);
    this.player = new Player(this.level, { hero: courseSave.hero, pos: place.pos, yaw: place.yaw });
    this.level.player = this.player;
    this.safe = { pos: place.pos.slice(), yaw: place.yaw };
    if (courseSave.carryPower) this.player.setPower(normalizePower(courseSave.carryPower));
    this.rig = new HeroRig(this.view, this.player);
    const p = this.player;
    this.view.shadows.add({ pos: p.pos, radius: 0.5, alive: () => true, visible: () => !(p.dead && p.deathCause === 'fall') });
    this.level.controlYaw = this.view.rig.controlYaw(p.pos);
    this.view.rig.snap(p);
    this.focusVec = new THREE.Vector3();
    this.focusProxy = { pos: this.focusVec, vel: new THREE.Vector3(), mode: 'ground', dead: false, half: p.half };
    // Anflug beim Betreten der Welt (nicht nach einem Level): flacher Blick über die Insel mit Himmel und Sonne,
    // dann Flug zur Heldin. Jede Eingabe überspringt ihn; Tests (setManual) schalten ihn ab.
    this.intro = null;
    if (!arrive.from && !arrive.done && !arrive.gameOver && !fresh.length && map.intro !== false) {
      const cam = this.view.camera;
      const i = map.intro ?? {};
      this.intro = {
        t: 0, dur: i.duration ?? 3.0,
        fromPos: new THREE.Vector3(...(i.from ?? [-2, 14, 72])), fromLook: new THREE.Vector3(...(i.look ?? [-2, 5, -40])),
        toPos: cam.position.clone(), toLook: this.view.rig.target.clone(),
        pos: new THREE.Vector3(), look: new THREE.Vector3(),
      };
      this.inputLocked = true;
    }

    // HUD und Tasten
    this.hud = new MapHud(this);
    const kb = this.input.keyboard;
    if (kb) {
      kb.addCapture([Phaser.Input.Keyboard.KeyCodes.TAB, Phaser.Input.Keyboard.KeyCodes.ENTER]);
      kb.on('keydown-ENTER', this.onEnterKey, this);
      kb.on('keydown-TAB', this.onTabKey, this);
      kb.on('keydown-M', this.toggleMute, this);
    }

    this.events.on(Phaser.Scenes.Events.RENDER, this.renderFrame, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    music.play(map.music ?? 'course_map');
    window.__courseMap = this;
    window.__courseSave = courseSave; // Tests/Fehlersuche

    // Ankunft: Meldung, frische Schranken öffnen
    if (arrive.gameOver) this.hud.toast('Spiel vorbei – du hast wieder 5 Leben!', 3);
    else if (arrive.done) this.hud.toast(`${this.labelOf(arrive.done)} geschafft!`, 2.4);
    if (fresh.length) this.startGateCinematic(fresh);
    this.cameras.main.fadeIn(280, 0, 0, 0);
  }

  // ------------------------------------------------------------------ Daten

  /** Rückkehrdaten in Eingangs-Ids übersetzen (Testparameter mapAlias) und Alias-Abschluss übernehmen. */
  translateArrival(a) {
    const out = { ...a };
    // Eingang des zuletzt gestarteten Levels (gemerkt beim Betreten), sonst Rückwärts-Alias
    const mp = courseSave.mapPos;
    for (const k of ['from', 'done']) {
      if (!out[k]) continue;
      if (mp?.entrance && mp.level === out[k]) out[k] = mp.entrance;
      else if (this.reverseAlias[out[k]]) out[k] = this.reverseAlias[out[k]];
    }
    // Alias: das Ersatz-Level wurde unter seiner eigenen Id gespeichert → Ergebnis auf den Eingang übertragen
    if (a.done && out.done !== a.done) {
      const src = courseSave.peek(a.done);
      courseSave.completeLevel(out.done, { stars: src?.stars ?? [], stamp: !!src?.stamp, time: src?.bestTime ?? null, pole: src?.bestPole ?? 0 });
    }
    return out;
  }

  worldOfLevel(id) { const n = parseInt(String(id).split('-')[0], 10); return Number.isFinite(n) ? n : null; }

  labelOf(id) { return unlock.levelRule(this.map, id)?.label ?? id; }

  /** Status aller Eingänge neu berechnen (Speicherstand). */
  computeStatuses() {
    this.statuses = new Map();
    for (const rule of this.map.levels) this.statuses.set(rule.id, this.computeStatus(rule));
  }

  computeStatus(rule) {
    const id = rule.id, map = this.map;
    const target = this.alias[id] ?? id;
    const lvl = rule.next ? null : getLevel(target);
    const reason = unlock.reason(map, courseSave, id);
    const prog = unlock.levelProgress(courseSave, id);
    const roamer = (map.roamers ?? []).some((r) => r.level === id) && !prog.done;
    return {
      id, target, label: rule.label ?? id, title: lvl?.title ?? 'Bald', reason, locked: reason !== null,
      exists: !!lvl, enterable: reason === null && !!lvl, soon: reason === null && !lvl, next: rule.next ?? null,
      pathOpen: unlock.pathOpen(map, courseSave, id), done: prog.done, stars: prog.stars,
      starsMax: lvl && Array.isArray(lvl.stars) && !this.alias[id] ? lvl.stars.length : (rule.stars ?? 0),
      hasStamp: lvl && !this.alias[id] ? !!lvl.stamp : !!rule.stamp, stamp: prog.stamp, minStars: rule.minStars ?? 0, roamer,
    };
  }

  status(id) { return this.statuses.get(id) ?? null; }
  worldStars() { return unlock.worldStars(this.map, courseSave); }
  worldStarsMax() { return unlock.worldStarsMax(this.map); }
  entranceViews() { return this.built?.entrances ?? new Map(); }

  /** Ankerpunkt der Beschriftung (über dem Podest bzw. über der wandernden Gruppe). */
  labelAnchor(id, out) {
    const st = this.status(id);
    if (st?.roamer && this.roamers.length) {
      out.set(0, 0, 0);
      for (const r of this.roamers) out.add(r.pos);
      out.multiplyScalar(1 / this.roamers.length);
      out.y += 2.9;
      return out;
    }
    return this.built.entrances.get(id).anchor(out);
  }

  /** Startpunkt: vor dem Eingang des letzten Levels, sonst gemerkte Lage, sonst Startpunkt der Welt. */
  arrivalPoint(arrive) {
    const map = this.map;
    const ent = arrive.from ? entranceById(map, arrive.from) : null;
    if (ent) return { pos: exitPoint(ent), yaw: FACE_CAMERA };
    const mp = courseSave.mapPos;
    if (mp && mp.world === map.world && Array.isArray(mp.pos) && this.grid.isWalk(mp.pos[0], mp.pos[2])) return { pos: mp.pos.slice(), yaw: mp.yaw ?? FACE_CAMERA };
    return { pos: map.spawn.pos.slice(), yaw: map.spawn.yaw ?? Math.PI / 2 };
  }

  safePoint() { return this.safe ?? { pos: this.map.spawn.pos.slice(), yaw: this.map.spawn.yaw }; }

  // ------------------------------------------------------------------ Kartenelemente

  spawnRoamers() {
    for (const r of this.map.roamers ?? []) {
      const st = this.status(r.level);
      if (!st || st.done) continue;
      const n = r.count ?? 1;
      for (let i = 0; i < n; i++) {
        const spec = { ...r, start: n > 1 ? 0.15 + (0.7 * i) / (n - 1) : 0.5, dir: i % 2 ? -1 : 1 };
        const e = new MapRoamer(this.level, spec, (ro) => this.onRoamerTouch(r.level, ro));
        addEntity(this.level, e);
        this.roamers.push(e);
      }
    }
  }

  onRoamerTouch(id, roamer) {
    if (this.leaving || this.inputLocked) return;
    const st = this.status(id);
    if (st?.enterable) { this.enterLevel(id); return; }
    // nicht startbar: freundlich zurückschubsen
    const p = this.player;
    const dx = p.pos.x - roamer.pos.x, dz = p.pos.z - roamer.pos.z, l = Math.hypot(dx, dz) || 1;
    p.vel.set((dx / l) * 6, 6.5, (dz / l) * 6);
    p.airMax = 6;
    if (p.mode === 'ground') p.mode = 'air';
    p.enterAir(null, false);
    p.setState('fall');
    sfx('bounce');
    this.hud?.toast(st?.soon ? `${st.label}: Bald!` : 'Noch nicht frei', 1.6);
  }

  spawnBerryItem() {
    const h = this.map.houses?.find((x) => x.item);
    if (!h || !courseSave.berryAvailable()) return;
    const items = h.items ?? ['krallen'];
    const power = normalizePower(items[(courseSave.data.mapVisit ?? 0) % items.length]);
    this.item = addEntity(this.level, new MapItem(this.level, { pos: [h.item[0], h.item[1] + 0.56, h.item[2]], power }, (it) => this.onBerry(it)));
  }

  onBerry(item) {
    courseSave.useBerry();
    courseSave.carryPower = item.power;
    this.player.setPower(item.power);
    sfx('powerup');
    vibrate([15, 30, 15]);
    const def = getPower(item.power);
    this.hud?.toast(`${def.label ?? item.power} eingepackt – für das nächste Level!`, 2.8);
    this.item = null;
  }

  // ------------------------------------------------------------------ Schranken-Schwenk

  startGateCinematic(ids) {
    const gates = this.built.gates.filter((g) => ids.includes(g.for));
    if (!gates.length) return;
    this.cine = { gates, i: 0, t: 0, phase: 'wait' };
    this.inputLocked = true;
  }

  /** Simulationsschritt der Animation. true = Eingabe gesperrt. */
  stepCinematic(dt) {
    const c = this.cine;
    if (!c) return false;
    c.t += dt;
    const g = c.gates[c.i];
    if (c.phase === 'wait') {
      this.focus = g.center;
      if (c.t > 1.0) { g.open(true); courseSave.markMapOpened(g.for); c.phase = 'open'; c.t = 0; }
    } else if (c.phase === 'open') {
      if (g.state === 'open' && c.t > g.duration() + 0.25) {
        const ev = this.built.entrances.get(g.for);
        const st = this.status(g.for);
        if (ev && st) { ev.setState({ locked: st.locked, soon: st.soon, enterable: st.enterable, done: st.done }); ev.hop(); }
        sfx('oneup');
        c.i++;
        c.t = 0;
        c.phase = c.i < c.gates.length ? 'wait' : 'back';
      }
    } else if (c.phase === 'back') {
      this.focus = null;
      if (c.t > 0.7) { this.cine = null; this.inputLocked = false; }
    }
    return true;
  }

  // ------------------------------------------------------------------ Simulation

  update(time, delta) {
    if (!this.level || this.manual || this.leaving) return;
    this.acc += Math.min(delta, 100) / 1000;
    let n = 0;
    while (this.acc >= DT && n < MAX_STEPS) {
      this.simStep();
      this.acc -= DT;
      n++;
      if (this.leaving) { this.acc = 0; break; }
    }
    if (n >= MAX_STEPS) this.acc = 0;
  }

  simStep() {
    if (this.leaving) return;
    const inp = this.cinput.sample();
    const rig = this.view.rig;
    if (inp.camLeft) rig.rotate(-1);
    if (inp.camRight) rig.rotate(1);
    if (inp.zoom) rig.toggleZoom();
    if (inp.debug) this.debug = !this.debug;
    const busy = this.stepCinematic(DT) || this.inputLocked;
    const use = busy ? NEUTRAL : inp;
    const enter = this.pendingEnter && !busy;
    this.pendingEnter = false;
    // Eingang betreten (A / Leertaste / Enter / „Los!“ auf einem freien Podest)
    const pad = this.padUnder();
    if (pad && pad.id !== this.onPad?.id && !busy) this.rememberPos();   // Lage merken (Neuladen der Seite)
    this.onPad = pad;
    if (this.onPad && !busy && (use.jumpPressed || enter)) {
      const st = this.status(this.onPad.id);
      if (st?.enterable) { this.enterLevel(this.onPad.id); return; }
      if (enter) { sfx('bump'); this.hud?.toast(st?.reason === 'stars' ? `Benötigt ${st.minStars} Sterne` : st?.soon ? 'Bald!' : 'Noch nicht frei', 1.4); }
    }
    this.level.controlYaw = rig.controlYaw(this.player.pos);
    this.level.step(DT, use);
    for (const g of this.built.gates) g.step(DT);
    // sicherer Punkt (Rückkehr nach einem Sturz)
    const p = this.player;
    if (p.mode === 'ground' && !p.dead && this.grid.isWalk(p.pos.x, p.pos.z)) {
      if (!this.safe) this.safe = { pos: [0, 0, 0], yaw: 0 };
      this.safe.pos[0] = p.pos.x; this.safe.pos[1] = p.pos.y; this.safe.pos[2] = p.pos.z; this.safe.yaw = p.yaw;
    }
    this.nearEntrance = this.findNear();
  }

  /** Freies oder gesperrtes Podest unter der Figur (stehend). */
  padUnder() {
    const p = this.player;
    if (p.mode !== 'ground' || p.dead) return null;
    for (const [id, ev] of this.built.entrances) {
      if (!ev.podiumGroup.visible) continue;
      const dx = p.pos.x - ev.pos.x, dz = p.pos.z - ev.pos.z;
      if (dx * dx + dz * dz < ENTER_R * ENTER_R && Math.abs(p.pos.y - ev.pos.y) < 0.8) return { id, view: ev };
    }
    return null;
  }

  /** Nächster Eingang in Reichweite (Hinweis-Leiste); die Gegnergruppe zählt mit ihrer Mitte. */
  findNear() {
    if (this.onPad) return { id: this.onPad.id };
    const p = this.player;
    let best = null, bd = NEAR_R * NEAR_R;
    for (const [id, ev] of this.built.entrances) {
      const st = this.status(id);
      let x = ev.pos.x, z = ev.pos.z;
      if (st?.roamer && this.roamers.length) { x = 0; z = 0; for (const r of this.roamers) { x += r.pos.x; z += r.pos.z; } x /= this.roamers.length; z /= this.roamers.length; }
      const d = (p.pos.x - x) ** 2 + (p.pos.z - z) ** 2;
      if (d < bd && Math.abs(p.pos.y - ev.pos.y) < 3) { bd = d; best = { id }; }
    }
    return best;
  }

  // ------------------------------------------------------------------ Eingabe-Aktionen

  onEnterKey() { if (!this.inputLocked) this.pendingEnter = true; }
  onTabKey(ev) { ev?.preventDefault?.(); this.switchHero(); }
  /** Test/Touch: wie die Enter-Taste. */
  enter() { this.pendingEnter = true; }
  pressGo() { if (!this.leaving) { this.pendingEnter = true; if (this.manual) this.simStep(); } }
  setInputLocked(on) { this.inputLocked = !!on || !!this.cine; }

  selectHero(key) {
    if (this.leaving || !['lotti', 'greta'].includes(key) || key === this.player.hero) return;
    courseSave.hero = key;
    this.player.setHero(key);
    this.hud?.pulseHero(key);
    this.hud?.refresh(true);
    sfx('select');
  }

  switchHero() { this.selectHero(this.player.hero === 'lotti' ? 'greta' : 'lotti'); }
  setHero(key) { this.selectHero(key); }

  toggleMute() {
    engine.toggleMuted();
    this.hud?.updateMute();
    sfx('select');
  }

  /** Lage merken (Rückkehr nach Neuladen). */
  rememberPos(pos = null, yaw = null, extra = {}) {
    const p = this.player;
    if (!p) return;
    courseSave.setMapPos(this.map.world, pos ?? [p.pos.x, p.pos.y, p.pos.z], yaw ?? p.yaw, extra);
  }

  /** Level starten (Eingang `id`); false, wenn es (noch) nicht geht. */
  enterLevel(id) {
    if (this.leaving) return false;
    const st = this.status(id);
    if (!st?.enterable) return false;
    const target = st.target;
    if (!getLevel(target)) return false;
    this.leaving = true;
    const ent = entranceById(this.map, id);
    this.rememberPos(ent ? exitPoint(ent) : null, FACE_CAMERA, { entrance: id, level: target });
    this.lastStart = { entrance: id, id: target };
    sfx('select');
    vibrate(15);
    const go = () => this.scene.start('Course', { id: target });
    if (this.manual) { go(); return true; }
    this.cameras.main.fadeOut(260, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, go);
    return true;
  }

  /** Zur bisherigen (Klassik-)Weltkarte. */
  toClassic() {
    if (this.leaving) return;
    this.leaving = true;
    this.rememberPos();
    sfx('select');
    this.lastStart = { classic: true };
    this.scene.start('WorldMap', {});
  }

  /** Spielstand des Kurs-Modus löschen und die Karte neu aufbauen. */
  resetSave() {
    courseSave.reset();
    this.leaving = true;
    this.scene.restart({});
  }

  // ------------------------------------------------------------------ Tests

  step(n = 1) {
    this.manual = true;
    for (let i = 0; i < n; i++) { if (this.leaving) break; this.simStep(); }
    return this.leaving ? { leaving: true, lastStart: this.lastStart } : this.state();
  }

  setManual(on) { this.manual = !!on; this.acc = 0; if (on) this.endIntro(); }
  setInput(o) { this.cinput.setOverride(o); }

  teleport(x, y, z, yaw) {
    const p = this.player;
    p.reset([x, y, z], yaw ?? p.yaw);
    this.level.controlYaw = this.view.rig.controlYaw(p.pos);
    this.view.rig.snap(p);
  }

  snapCamera() { this.view.rig.snap(this.player); }

  state() {
    const gates = {};
    for (const g of this.built.gates) gates[g.for] = g.state;
    for (const gt of this.map.gates ?? []) if (!gates[gt.for]) gates[gt.for] = 'open';
    const entrances = {};
    for (const [id, st] of this.statuses) entrances[id] = { locked: st.locked, reason: st.reason, enterable: st.enterable, soon: st.soon, done: st.done, stars: st.stars, starsMax: st.starsMax, stamp: st.stamp, title: st.title };
    return {
      world: this.map.world, player: this.player.info(), onPad: this.onPad?.id ?? null, near: this.nearEntrance?.id ?? null,
      entrances, gates, cinematic: !!this.cine, carryPower: courseSave.carryPower, berry: !!this.item?.alive,
      roamers: this.roamers.filter((r) => r.alive).map((r) => [+r.pos.x.toFixed(2), +r.pos.y.toFixed(2), +r.pos.z.toFixed(2)]),
      stars: this.worldStars(), starsMax: this.worldStarsMax(), lives: courseSave.lives, coins: courseSave.coins,
      leaving: this.leaving, lastStart: this.lastStart, goVisible: !!this.hud?.goBtn.visible,
    };
  }

  stats() {
    return { ...this.view.stats(), staticMeshes: this.batcher.stats.meshes, staticParts: this.batcher.stats.parts, staticTriangles: this.batcher.stats.triangles,
      shapes: this.level.world.count, walls: this.built.walls, hedges: this.built.hedges, tiles: this.built.tiles };
  }

  // ------------------------------------------------------------------ Darstellung

  renderFrame() {
    if (!this.level || !this.player) return;
    const dt = Math.min(this.game.loop.delta, 50) / 1000;
    const t = this.view.time + dt;
    this.rig.update(dt, t);
    this.level.render(dt, t);
    for (const ev of this.built.entrances.values()) ev.update(dt, t);
    for (const g of this.built.gates) g.render(dt, t);
    this.built.scenery?.update(dt);
    let target = this.player;
    if (this.focus) { this.focusVec.set(this.focus.x, this.focus.y, this.focus.z); target = this.focusProxy; }
    if (this.intro && this.flyIntro(dt)) target = null;   // Kamera setzt der Anflug selbst
    this.view.render(dt, target, this.level.world);
    this.hud?.update(dt);
  }

  /** Anflug: Kamera zwischen Start- und Spielansicht überblenden. true, solange er läuft. */
  flyIntro(dt) {
    const it = this.intro;
    it.t += dt;
    const k = Math.min(1, it.t / it.dur);
    const skip = this.cinput.keys && Object.values(this.cinput.keys).some((key) => key.isDown);
    if (k >= 1 || skip || this.input.activePointer.isDown) { this.endIntro(); return false; }
    // erst kurz verweilen, dann weich hinfliegen
    const u = Math.max(0, (k - 0.25) / 0.75), e = u * u * (3 - 2 * u);
    it.pos.lerpVectors(it.fromPos, it.toPos, e);
    it.look.lerpVectors(it.fromLook, it.toLook, e);
    const cam = this.view.camera;
    cam.position.copy(it.pos);
    cam.lookAt(it.look);
    this.view.rig.target.copy(it.look);
    return true;
  }

  endIntro() {
    if (!this.intro) return;
    this.intro = null;
    this.inputLocked = !!this.cine || !!this.hud?.confirm;
    this.view.rig.snap(this.player);
  }

  cleanup() {
    this.events.off(Phaser.Scenes.Events.RENDER, this.renderFrame, this);
    const kb = this.input.keyboard;
    if (kb) { kb.off('keydown-ENTER', this.onEnterKey, this); kb.off('keydown-TAB', this.onTabKey, this); kb.off('keydown-M', this.toggleMute, this); }
    if (window.__courseMap === this) window.__courseMap = null;
    if (this.player && !this.leaving) this.rememberPos();
    this.hud?.destroy();
    this.hud = null;
    for (const g of this.built?.gates ?? []) g.dispose();
    for (const ev of this.built?.entrances?.values() ?? []) ev.dispose();
    this.built?.scenery?.dispose();
    this.batcher?.dispose();
    this.rig?.dispose();
    this.level?.dispose();
    this.view?.dispose();
    this.cinput?.destroy();
    this.level = null;
    this.player = null;
  }
}
