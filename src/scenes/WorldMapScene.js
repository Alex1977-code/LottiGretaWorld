// Weltkarte: Hero läuft auf einem Pfad zwischen den Level-Punkten.
// Freie Pfade sind durchgezogen, Geheimpfade golden. Tippen/Taste startet das Level.
// In der 3D-Darstellung (RENDER3D.enabled) zeichnet MapView3D Insel, Wege, Podeste und die
// Heldin auf der 3D-Leinwand; Logik, Treffflächen und Beschriftungen bleiben hier in Phaser.

import Phaser from 'phaser';
import { RENDER, Z, fit, setupUiCamera } from '../render.js';
import { RENDER3D } from '../render3d.js';
import { MapView3D } from '../three/map/MapView3D.js';
import { GAME } from '../config.js';
import { WORLD } from '../levels/worldmap.js';
import { LEVELS } from '../levels/index.js';
import { saveGame } from '../systems/SaveGame.js';
import { HERO_VARIANTS } from '../config.js';
import { vibrate } from '../systems/haptics.js';
import { sfx, music, engine } from '../audio/index.js';
import { uiText, uiButton } from '../ui.js';

const WALK_SPEED = 70; // px/s auf der Karte

export class WorldMapScene extends Phaser.Scene {
  constructor() {
    super('WorldMap');
  }

  init(data) {
    this.arrived = data ?? {};   // { from, exit } nach einem Level
    this.starting = false;       // Szenen-Instanz wird wiederverwendet → zurücksetzen
    this.moving = false;
    this.view3d = null;          // alte 3D-Ansicht wurde beim SHUTDOWN zerstört; create() legt ggf. eine neue an
  }

  create() {
    this.world = WORLD;
    this.nodeByKey = Object.fromEntries(this.world.nodes.map((n) => [n.key, n]));
    this.current = this.nodeByKey[saveGame.current] ? saveGame.current : this.world.start;
    this.moving = false;
    this.resetTaps = 0;

    setupUiCamera(this);
    this.drawBackground();
    this.pathGfx = this.add.graphics().setDepth(2);
    this.drawPaths();
    this.drawNodes();

    // Heldin auf der Karte
    this.heroKey = saveGame.hero;
    const n = this.nodeByKey[this.current];
    this.hero = fit(this.add.sprite(n.x, n.y - 10, this.heroKey, 'idle0')).setDepth(10);
    this.hero.play(`${this.heroKey}-idle`);
    if (RENDER3D.enabled) {
      // 3D-Karte: der Hero-Avatar liest Sprite-Felder der Spielszene – auf der Karte gibt es keine
      // Physik, deshalb bekommt das Sprite einen Ersatzkörper (Geschwindigkeit aus der Tween-Bewegung,
      // siehe update()) und ruhige Zustände. destroy() braucht Phaser beim Zerstören des Sprites.
      this.hero.body = { velocity: { x: 0, y: 0 }, destroy() {} };
      this.hero.moveState = 'ground';
      this.hero.onGround = true;
      this.hero.mount = null;
      this.hero.leaf = { visible: false };
      this.hero.swooping = false;
      this.hero.dead = false;
      this.heroPrev = { x: this.hero.x, y: this.hero.y };
      try {
        this.view3d = new MapView3D(this);
      } catch (err) {
        // Gerät kann die 3D-Karte nicht aufbauen: für diese Sitzung 2D-Darstellung
        console.error('3D-Karte nicht verfügbar, 2D-Darstellung wird genutzt:', err);
        RENDER3D.enabled = false;
        this.view3d = null;
      }
    }

    this.title = uiText(this, GAME.width / 2, 14, this.world.name, { size: 14, color: '#ffffff', stroke: '#3a2a6a', thickness: 4 }).setDepth(20);
    this.info = uiText(this, GAME.width / 2, GAME.height - 26, '', { size: 10, color: '#ffffff', stroke: '#2a2550', thickness: 3 }).setDepth(20);
    this.hint = uiText(this, 8, GAME.height - 8, 'Punkt antippen: hinlaufen  •  PC: Pfeile + Leertaste', { size: 7, color: '#eef0ff', stroke: '#2a2550', thickness: 2, shadow: false, originX: 0 }).setDepth(20).setAlpha(0.9);
    this.resetBtn = uiButton(this, GAME.width - 44, 10, 'Spielstand löschen', { size: 7, dark: true, padX: 6, padY: 2 }).setDepth(20);
    this.resetBtn.on(Phaser.Input.Events.POINTER_DOWN, (p, lx, ly, ev) => { ev.stopPropagation(); this.onResetTap(); });
    // Zurück zur Kurs-Weltkarte (3D-Kurs), sofern es die 3D-Darstellung gibt
    if (RENDER3D.enabled && this.scene.get('CourseMap')) {
      this.courseBtn = uiButton(this, GAME.width - 34, 31, '3D-Kurs', { size: 8, color: 0x3a7bff, padX: 8, padY: 4 }).setDepth(20);
      this.courseBtn.on(Phaser.Input.Events.POINTER_DOWN, (p, lx, ly, ev) => { ev.stopPropagation(); this.scene.start('CourseMap', {}); });
    }

    this.coinIcons = [];
    // Großer Start-Knopf (Handy): startet das Level am aktuellen Punkt
    this.startBtn = uiButton(this, GAME.width - 70, GAME.height - 18, 'Level starten', { size: 10, color: 0x4fb833, minWidth: 124, padY: 5 }).setDepth(21);
    this.startBtn.on(Phaser.Input.Events.POINTER_DOWN, (p, lx, ly, ev) => { ev.stopPropagation(); this.startLevel(); });
    this.updateInfo();

    // Figur wählen: zwei Porträt-Knöpfe (Lotti / Greta), Tab am PC
    this.createHeroPicker();
    this.input.keyboard.on('keydown-TAB', (ev) => { ev.preventDefault(); this.switchHero(); });

    // Ton an/aus
    this.muteBtn = uiButton(this, 44, 11, '', { size: 8, dark: true, padX: 8, padY: 3, minWidth: 80 }).setDepth(20);
    this.muteBtn.on(Phaser.Input.Events.POINTER_DOWN, (p, lx, ly, ev) => { ev.stopPropagation(); this.toggleMute(); });
    this.input.keyboard.on('keydown-M', this.toggleMute, this);
    this.updateMuteLabel();
    music.setDrums(false);
    music.play('map');

    // Eingabe (Events statt Abfrage, damit kurze Tipps nicht verloren gehen)
    const kb = this.input.keyboard;
    kb.on('keydown-LEFT', () => this.walkDirection(-1, 0));
    kb.on('keydown-RIGHT', () => this.walkDirection(1, 0));
    kb.on('keydown-UP', () => this.walkDirection(0, -1));
    kb.on('keydown-DOWN', () => this.walkDirection(0, 1));
    this.input.keyboard.on('keydown-SPACE', this.startLevel, this);
    this.input.keyboard.on('keydown-ENTER', this.startLevel, this);
    this.input.keyboard.on('keydown-X', this.startLevel, this);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointer, this);

    // Neu freigeschalteten Pfad hervorheben
    if (this.arrived.from) this.revealNewPaths();
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  // ---------- Darstellung ----------

  drawBackground() {
    // Vektor-Karte (heller Himmel, Pastellberge, sonnige Wiese mit Kugelbäumen, Teich) aus
    // gfx/background.js – beim Start in Render-Auflösung erzeugt
    this.bgImage = fit(this.add.image(0, 0, 'worldmap_bg')).setOrigin(0).setDepth(0);
  }

  /** Alle Kanten als Punktlinien; gesperrte Kanten nur angedeutet. */
  drawPaths() {
    const g = this.pathGfx;
    g.clear();
    for (const e of this.world.edges) {
      const unlocked = saveGame.edgeUnlocked(e);
      const color = e.exit === 'secret' ? 0xf2c230 : 0xe8d8c0;
      const pts = this.edgePoints(e);
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const dist = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
        const steps = Math.max(1, Math.floor(dist / 8));
        for (let s = 0; s <= steps; s++) {
          const x = Phaser.Math.Linear(a.x, b.x, s / steps), y = Phaser.Math.Linear(a.y, b.y, s / steps);
          g.fillStyle(color, unlocked ? 0.95 : 0.18);
          g.fillCircle(Math.round(x), Math.round(y), unlocked ? 1.6 : 1);
        }
      }
    }
    this.view3d?.updatePaths();
  }

  drawNodes() {
    this.nodeSprites = {};
    for (const n of this.world.nodes) {
      const unlocked = saveGame.nodeUnlocked(this.world, n.key);
      const lvl = saveGame.level(n.key);
      const c = this.add.container(n.x, n.y).setDepth(5);
      c.setData('unlocked', unlocked);
      const base = this.add.circle(0, 0, 10, unlocked ? 0xffc21a : 0x8a8aa0).setStrokeStyle(2, unlocked ? 0xffffff : 0xd0d0e0);
      c.add(base);
      const num = uiText(this, 0, 0.5, String(this.world.nodes.indexOf(n) + 1), { size: 9, color: unlocked ? '#5a3a00' : '#e8e8f0', stroke: unlocked ? '#fff2a8' : '#5a5a70', thickness: 2, shadow: false });
      c.add(num);
      const flag = lvl.done ? this.add.image(0, -14, 'flag', 'flag0').setScale(0.6 * Z).setOrigin(0.5, 0.75) : null;
      if (flag) c.add(flag);
      const key = lvl.secret ? this.add.image(8, -6, 'key', 'key').setScale(0.6 * Z) : null;
      if (key) c.add(key);
      const label = uiText(this, 0, 12, LEVELS[n.key]?.name ?? n.key, { size: 7, color: unlocked ? '#ffffff' : '#b8b0c8', stroke: '#2a2550', thickness: 2, shadow: false, originY: 0 });
      c.add(label);
      // Einzelteile merken: die 3D-Karte blendet Kreis/Fahne/Schlüssel aus, Nummer und Name bleiben
      c.parts = { base, num, flag, key, label };
      // große Trefffläche fürs Handy
      base.setInteractive({ hitArea: new Phaser.Geom.Circle(10, 10, 20), hitAreaCallback: Phaser.Geom.Circle.Contains, useHandCursor: unlocked });
      base.on(Phaser.Input.Events.POINTER_DOWN, (p, lx, ly, ev) => { ev.stopPropagation(); this.onNodeTap(n.key); });
      this.nodeSprites[n.key] = c;
    }
  }

  updateInfo() {
    const key = this.current;
    const lvl = saveGame.level(key);
    const name = LEVELS[key]?.name ?? key;
    const status = lvl.done ? (lvl.secret ? 'geschafft • geheimer Ausgang gefunden' : 'geschafft') : 'noch offen';
    this.info.setText(`${name}\n${status}`);
    this.coinIcons.forEach((c) => c.destroy());
    this.coinIcons = lvl.coins.map((c, i) => fit(this.add.image(GAME.width / 2 - 24 + i * 12, GAME.height - 38, 'coin_hud', c ? 'full' : 'empty')).setDepth(20));
  }

  /** Neue Pfade nach einem Levelabschluss kurz aufblitzen lassen. */
  revealNewPaths() {
    const fresh = this.world.edges.filter((e) => e.from === this.arrived.from && e.exit === this.arrived.exit && saveGame.edgeUnlocked(e));
    for (const e of fresh) {
      const n = this.nodeSprites[e.to];
      if (n) this.tweens.add({ targets: n, scaleX: 1.4, scaleY: 1.4, duration: 300, yoyo: true, repeat: 2, delay: 400 });
      this.view3d?.hopNode(e.to);
    }
    if (fresh.length) this.time.delayedCall(400, () => vibrate([20, 40, 20]));
  }

  // ---------- Bewegung ----------

  edgePoints(e) {
    return [this.nodeByKey[e.from], ...e.points, this.nodeByKey[e.to]];
  }

  /** Nachbarn des aktuellen Punkts über freie Kanten (in beide Richtungen). */
  neighbors(key) {
    const out = [];
    for (const e of this.world.edges) {
      if (!saveGame.edgeUnlocked(e)) continue;
      if (e.from === key) out.push({ key: e.to, points: this.edgePoints(e) });
      else if (e.to === key) out.push({ key: e.from, points: [...this.edgePoints(e)].reverse() });
    }
    return out;
  }

  /** Läuft entlang der Punkte zum Zielknoten. */
  walkTo(target, onArrive) {
    const nb = this.neighbors(this.current).find((n) => n.key === target);
    if (!nb || this.moving) return;
    this.moving = true;
    this.startBtn?.setVisible(false);
    this.hero.play(`${this.heroKey}-run`);
    const pts = nb.points;
    let i = 1;
    const step = () => {
      if (i >= pts.length) {
        this.moving = false;
        this.current = target;
        saveGame.current = target;
        this.hero.play(`${this.heroKey}-idle`);
        this.updateInfo();
        vibrate(8);
        sfx('step');
        if (onArrive) onArrive();
        if (!this.moving) this.startBtn?.setVisible(true);
        return;
      }
      const p = pts[i++];
      const d = Phaser.Math.Distance.Between(this.hero.x, this.hero.y + 10, p.x, p.y);
      this.hero.setFlipX(p.x < this.hero.x);
      this.tweens.add({ targets: this.hero, x: p.x, y: p.y - 10, duration: (d / WALK_SPEED) * 1000, onComplete: step });
    };
    step();
  }

  /** Richtungstaste → Nachbar, dessen Richtung am besten passt. */
  walkDirection(dx, dy) {
    if (this.moving || this.starting) return;
    const here = this.nodeByKey[this.current];
    let best = null, bestDot = 0.3;
    for (const n of this.neighbors(this.current)) {
      // Richtung des ersten Pfadsegments (so, wie der Pfad auf der Karte losläuft)
      const t = n.points[1] ?? this.nodeByKey[n.key];
      const v = new Phaser.Math.Vector2(t.x - here.x, t.y - here.y).normalize();
      const dot = v.x * dx + v.y * dy;
      if (dot > bestDot) { bestDot = dot; best = n.key; }
    }
    if (best) this.walkTo(best);
  }

  // ---------- Eingabe ----------

  onNodeTap(key) {
    if (this.moving) return;
    if (key === this.current) { this.startLevel(); return; }
    if (!saveGame.nodeUnlocked(this.world, key)) return;
    // Kürzesten Weg über freie Kanten suchen (Breitensuche) und ersten Schritt gehen
    const prev = { [this.current]: null };
    const queue = [this.current];
    while (queue.length) {
      const k = queue.shift();
      if (k === key) break;
      for (const n of this.neighbors(k)) if (!(n.key in prev)) { prev[n.key] = k; queue.push(n.key); }
    }
    if (!(key in prev)) return;
    // Pfad vom Ziel zurück zum Start aufsammeln und Etappe für Etappe laufen
    const path = [];
    for (let k = key; k !== this.current; k = prev[k]) path.unshift(k);
    this.walkPath(path);
  }

  /** Mehrere Etappen nacheinander laufen. */
  walkPath(path) {
    if (!path.length) return;
    const [next, ...rest] = path;
    this.walkTo(next, () => this.walkPath(rest));
  }

  onPointer(pointer) {
    if (this.moving) return;
    // Antippen der Figur startet das Level; sonst passiert nichts (Ziele sind die Punkte und der Start-Knopf).
    // In 3D zählt die projizierte Position der Figur, nicht ihre logische Kartenposition.
    const hp = this.view3d ? this.view3d.heroScreen : this.hero;
    const dx = pointer.worldX - hp.x, dy = pointer.worldY - hp.y;
    if (Math.hypot(dx, dy) < 24) this.startLevel();
  }

  /** 3D-Karte: Geschwindigkeit des Ersatzkörpers aus der Tween-Bewegung (px/s), damit der Avatar läuft. */
  update(time, delta) {
    if (!this.view3d || !this.hero?.body) return;
    // Tweens laufen auf der echten verstrichenen Zeit (rawDelta), nicht auf dem geglätteten delta
    const dt = Math.max(1, this.game.loop.rawDelta || delta) / 1000;
    const vx = (this.hero.x - this.heroPrev.x) / dt, vy = (this.hero.y - this.heroPrev.y) / dt;
    this.heroPrev.x = this.hero.x; this.heroPrev.y = this.hero.y;
    const v = this.hero.body.velocity;
    // x trägt das Tempo in der Ebene (vorzeichenbehaftet: Laufanimation in jede Richtung), kein Fallen
    v.x = Math.hypot(vx, vy) * (vx < 0 ? -1 : 1);
    v.y = 0;
  }

  /** Zwei runde Porträt-Knöpfe oben links; die gewählte Figur hat einen goldenen Ring. */
  createHeroPicker() {
    this.heroPicker = {};
    uiText(this, 50, 28, 'Figur', { size: 7, color: '#ffffff', stroke: '#2a2550', thickness: 2, shadow: false }).setDepth(20);
    [['lotti', 26, 'Lotti'], ['greta', 74, 'Greta']].forEach(([key, x, name]) => {
      const c = this.add.container(x, 48).setDepth(20);
      const ring = this.add.circle(0, 0, 15, 0xffffff, 0.9).setStrokeStyle(2.5, 0xffc21a);
      const face = fit(this.add.image(0, 1, key, 'idle0'), 1.1).setOrigin(0.5, 0.5);
      const label = uiText(this, 0, 19, name, { size: 7, color: '#ffffff', stroke: '#2a2550', thickness: 2, shadow: false });
      const trait = uiText(this, 0, 27, HERO_VARIANTS[key].trait, { size: 5, color: '#ffe9a8', stroke: '#2a2550', thickness: 1.5, shadow: false });
      c.add([ring, face, label, trait]);
      c.setSize(36, 44);
      // Kreis um die Container-Mitte (ursprungs-normiert: Mitte = (18, 22))
      c.setInteractive({ hitArea: new Phaser.Geom.Circle(18, 24, 20), hitAreaCallback: Phaser.Geom.Circle.Contains, useHandCursor: true });
      c.on(Phaser.Input.Events.POINTER_DOWN, (p, lx, ly, ev) => { ev.stopPropagation(); this.selectHero(key); });
      this.heroPicker[key] = { c, ring };
    });
    this.updateHeroPicker();
  }

  updateHeroPicker() {
    for (const [key, { ring, c }] of Object.entries(this.heroPicker)) {
      const active = key === this.heroKey;
      ring.setStrokeStyle(active ? 3 : 1.5, active ? 0xffc21a : 0x9a9ab0);
      ring.setFillStyle(0xffffff, active ? 0.95 : 0.55);
      c.setAlpha(active ? 1 : 0.8);
    }
  }

  /** Figur wählen (wird gespeichert). */
  selectHero(key) {
    if (this.moving || this.starting || key === this.heroKey) return;
    this.heroKey = key;
    saveGame.hero = key;
    this.hero.setTexture(key, 'idle0');
    this.hero.play(`${key}-idle`);
    this.tweens.add({ targets: this.hero, scaleX: 1.3 * Z, scaleY: 1.3 * Z, duration: 120, yoyo: true });
    this.tweens.add({ targets: this.heroPicker[key].c, scaleX: 1.15, scaleY: 1.15, duration: 100, yoyo: true });
    this.updateHeroPicker();
    sfx('select');
  }

  /** Tab: zur jeweils anderen Figur wechseln. */
  switchHero() {
    this.selectHero(this.heroKey === 'lotti' ? 'greta' : 'lotti');
  }

  toggleMute() {
    engine.toggleMuted();
    this.updateMuteLabel();
    sfx('select');
  }

  updateMuteLabel() {
    this.muteBtn.setText(engine.muted ? 'Ton: aus' : 'Ton: an');
  }

  onResetTap() {
    this.resetTaps++;
    if (this.resetTaps === 1) {
      this.resetBtn.setText('Wirklich löschen? Nochmal tippen');
      this.time.delayedCall(2500, () => { this.resetTaps = 0; this.resetBtn.setText('Spielstand löschen'); });
    } else {
      saveGame.reset();
      this.scene.restart({});
    }
  }

  startLevel() {
    if (this.moving || this.starting) return;
    this.starting = true;
    vibrate(15);
    sfx('select');
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Play', { level: this.current });
    });
  }

}
