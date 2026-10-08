// Phaser-Szene 'Course': ein Kurs-Level (3D). Keine Phaser-Physik – die Simulation läuft in festen
// Schritten von 1/120 s (höchstens 8 je Bild) über Level.step(); die 3D-Ansicht zeichnet je Bild über den
// gemeinsamen Renderer (Leinwand unter der transparenten Phaser-Leinwand). HUD/Touch: 'CourseUI'.
//
// Start: this.scene.start('Course', { id: '1-1' }) bzw. ?course=1-1.
// Ablauf: Tod → Neustart am Checkpoint (Leben −1); Zielmast → 'CourseResult'; Pause → 'CoursePause';
// Spielende/Zur Weltkarte → 'CourseMap' (falls registriert) sonst 'WorldMap'.
//
// Test-/Debug-Schnittstelle window.__course (= diese Szene):
//   player, level, world, entities, view, runtime
//   step(n)        n Simulationsschritte synchron (schaltet den Echtzeit-Takt ab → deterministisch)
//   setInput(o)    Testeingabe { x, y, jump, crouch, run, action } (null = Tastatur/Touch)
//   setManual(b)   Echtzeit-Takt aus/an
//   teleport(x, y, z)   Figur versetzen (Kamera springt mit)
//   state()        Kurzinfo { id, time, player, runtime, camera, entities }
//   snapCamera(), stats() (Zeichenaufrufe/Dreiecke des letzten Bildes), setHero('lotti'|'greta')

import Phaser from 'phaser';
import { getLevel } from './levels/index.js';
import { CourseView } from './view/CourseView.js';
import { CourseInput } from './input/CourseInput.js';
import { Level } from './level/Level.js';
import { buildLevel } from './level/LevelLoader.js';
import { Player } from './player/Player.js';
import { HeroRig } from './player/HeroRig.js';
import { courseSave } from './level/CourseSave.js';
import { music, sfx } from '../audio/index.js';
import { RENDER3D } from '../render3d.js';

export const DT = 1 / 120;
const MAX_STEPS = 8;

/** Ziel „Zur Weltkarte“: die Kurs-Weltkarte, sobald es sie gibt, sonst die bisherige Karte. */
export function mapSceneKey(scene) {
  try { if (scene.scene.get('CourseMap')) return 'CourseMap'; } catch (_) { /* nicht registriert */ }
  return 'WorldMap';
}

export class CourseScene extends Phaser.Scene {
  constructor() {
    super('Course');
  }

  init(data) {
    this.levelId = data?.id ?? this.registry.get('startCourse') ?? '0-0';
    this.manual = false;
    this.acc = 0;
    this.finished = false;
    this.level = null;
    this.debug = false;
  }

  create() {
    const data = getLevel(this.levelId);
    if (!data) { console.error(`[Kurs] Level ${this.levelId} nicht gefunden`); this.scene.start(mapSceneKey(this), {}); return; }
    if (!RENDER3D.enabled) { console.error('[Kurs] Der Kurs-Modus braucht die 3D-Darstellung (WebGL2).'); this.scene.start(mapSceneKey(this), {}); return; }
    this.levelData = data;
    this.cinput = new CourseInput(this);
    this.view = new CourseView(this, data);
    this.level = new Level(this, data, { view: this.view, save: courseSave });
    buildLevel(this.level);
    const s = data.start ?? {};
    this.player = new Player(this.level, { hero: courseSave.hero, pos: s.pos ?? [0, 1, 0], yaw: s.yaw ?? Math.PI / 2 });
    this.level.player = this.player;
    this.rig = new HeroRig(this.view, this.player);
    const p = this.player;
    this.view.shadows.add({ pos: p.pos, radius: 0.5, alive: () => true, visible: () => !(p.dead && p.deathCause === 'fall') && !(p.script?.type === 'pipe') });
    this.level.controlYaw = this.view.rig.controlYaw(p.pos);
    this.view.rig.snap(p);

    this.events.on(Phaser.Scenes.Events.RENDER, this.renderFrame, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.scene.launch('CourseUI', { course: this });
    music.play(data.music ?? 'course_grass');
    window.__course = this;
  }

  get world() { return this.level?.world ?? null; }
  get entities() { return this.level?.entities ?? []; }
  get runtime() { return this.level?.runtime ?? null; }

  // ------------------------------------------------------------------ Simulation

  update(time, delta) {
    if (!this.level || this.manual || this.finished) return;
    this.acc += Math.min(delta, 100) / 1000;
    let n = 0;
    while (this.acc >= DT && n < MAX_STEPS) {
      this.simStep();
      this.acc -= DT;
      n++;
      if (this.sys.isPaused() || this.finished) { this.acc = 0; break; }
    }
    if (n >= MAX_STEPS) this.acc = 0;
  }

  simStep() {
    const inp = this.cinput.sample();
    if (inp.pause) { this.pauseGame(); return; }
    const rig = this.view.rig;
    if (inp.camLeft) rig.rotate(-1);
    if (inp.camRight) rig.rotate(1);
    if (inp.zoom) rig.toggleZoom();
    if (inp.debug) this.debug = !this.debug;
    this.level.controlYaw = rig.controlYaw(this.player.pos);
    this.level.step(DT, inp);
  }

  /** n Schritte synchron rechnen (Tests). Schaltet den Echtzeit-Takt ab. */
  step(n = 1) {
    this.manual = true;
    for (let i = 0; i < n; i++) { if (this.finished) break; this.simStep(); }
    return this.state();
  }

  setManual(on) { this.manual = !!on; this.acc = 0; }
  setInput(o) { this.cinput.setOverride(o); }

  teleport(x, y, z) {
    const p = this.player;
    p.reset([x, y, z], p.yaw);
    this.level.controlYaw = this.view.rig.controlYaw(p.pos);
    this.view.rig.snap(p);
  }

  snapCamera() { this.view.rig.snap(this.player); }

  setHero(key) {
    courseSave.hero = key;
    this.player.setHero(courseSave.hero);
  }

  state() {
    return {
      id: this.levelId, time: +this.level.time.toFixed(3), player: this.player.info(), runtime: this.level.runtime.info(),
      camera: this.view.rig.info(), entities: this.level.entities.length, finished: this.finished,
    };
  }

  stats() { return { ...this.view.stats(), shapes: this.level.world.count, entities: this.level.entities.length }; }

  // ------------------------------------------------------------------ Darstellung

  renderFrame() {
    if (!this.level) return;
    const paused = this.sys.isPaused();
    const dt = paused ? 0 : Math.min(this.game.loop.delta, 50) / 1000;
    const t = this.view.time + dt;
    this.rig.update(dt, t);
    this.level.render(dt, t);
    this.view.render(dt, this.player, this.level.world);
  }

  // ------------------------------------------------------------------ Ablauf

  pauseGame() {
    if (this.finished || this.sys.isPaused() || !this.level) return;
    sfx('pause');
    this.scene.pause();
    this.scene.pause('CourseUI');
    this.scene.launch('CoursePause', { course: this });
  }

  resumeGame() {
    this.scene.stop('CoursePause');
    this.scene.resume('CourseUI');
    this.scene.resume();
    this.acc = 0;
  }

  /** Level neu starten (Pause → Neustart, Ergebnis → Nochmal). */
  restartLevel() {
    this.scene.stop('CoursePause');
    this.scene.stop('CourseResult');
    this.scene.stop('CourseUI');
    this.scene.restart({ id: this.levelId });
  }

  /** Zur Weltkarte (Pause, Ergebnis, Spielende). */
  exitToMap(data = {}) {
    const target = mapSceneKey(this);
    for (const k of ['CoursePause', 'CourseResult', 'CourseUI']) this.scene.stop(k);
    this.scene.start(target, { from: this.levelId, ...data });
  }

  /** Von der Laufzeit nach der Siegessequenz aufgerufen. */
  onLevelDone(result) {
    this.finished = true;
    this.lastResult = result;
    this.scene.launch('CourseResult', { course: this, result });
  }

  onGameOver() {
    this.finished = true;
    this.gameOver = true;
    if (this.manual) return; // Tests entscheiden selbst
    this.time.delayedCall(900, () => this.exitToMap({ gameOver: true }));
  }

  cleanup() {
    this.events.off(Phaser.Scenes.Events.RENDER, this.renderFrame, this);
    if (window.__course === this) window.__course = null;
    this.rig?.dispose();
    this.level?.dispose();
    this.view?.dispose();
    this.cinput?.destroy();
    this.level = null;
  }
}
