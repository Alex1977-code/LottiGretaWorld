// Weltkarte: Hero läuft auf einem Pfad zwischen den Level-Punkten.
// Freie Pfade sind durchgezogen, Geheimpfade golden. Tippen/Taste startet das Level.

import Phaser from 'phaser';
import { GAME } from '../config.js';
import { WORLD } from '../levels/worldmap.js';
import { LEVELS } from '../levels/index.js';
import { saveGame } from '../systems/SaveGame.js';
import { vibrate } from '../systems/haptics.js';
import { sfx, music, engine } from '../audio/index.js';

const WALK_SPEED = 70; // px/s auf der Karte

export class WorldMapScene extends Phaser.Scene {
  constructor() {
    super('WorldMap');
  }

  init(data) {
    this.arrived = data ?? {};   // { from, exit } nach einem Level
    this.starting = false;       // Szenen-Instanz wird wiederverwendet → zurücksetzen
    this.moving = false;
  }

  create() {
    this.world = WORLD;
    this.nodeByKey = Object.fromEntries(this.world.nodes.map((n) => [n.key, n]));
    this.current = this.nodeByKey[saveGame.current] ? saveGame.current : this.world.start;
    this.moving = false;
    this.resetTaps = 0;

    this.drawBackground();
    this.pathGfx = this.add.graphics().setDepth(2);
    this.drawPaths();
    this.drawNodes();

    // Heldin auf der Karte
    this.heroKey = saveGame.hero;
    const n = this.nodeByKey[this.current];
    this.hero = this.add.sprite(n.x, n.y - 10, this.heroKey, 'idle0').setDepth(10);
    this.hero.play(`${this.heroKey}-idle`);

    this.title = this.add.text(GAME.width / 2, 12, this.world.name, { fontFamily: 'monospace', fontSize: '10px', color: '#fff2a8', stroke: '#4a230a', strokeThickness: 3 }).setOrigin(0.5).setDepth(20);
    this.info = this.add.text(GAME.width / 2, GAME.height - 30, '', { fontFamily: 'monospace', fontSize: '10px', color: '#f3e7d3', stroke: '#2a1a10', strokeThickness: 3, align: 'center' }).setOrigin(0.5).setDepth(20);
    this.hint = this.add.text(GAME.width / 2, GAME.height - 12, 'Tippen/Leertaste: Level starten  •  Pfeile: laufen  •  Tab: Figur wechseln', { fontFamily: 'monospace', fontSize: '7px', color: '#d8c8b0' }).setOrigin(0.5).setDepth(20).setAlpha(0.8);
    this.resetBtn = this.add.text(GAME.width - 4, 4, 'Spielstand löschen', { fontFamily: 'monospace', fontSize: '7px', color: '#d8c8b0', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 3, y: 2 } }).setOrigin(1, 0).setDepth(20).setInteractive({ useHandCursor: true });
    this.resetBtn.on(Phaser.Input.Events.POINTER_DOWN, (p, lx, ly, ev) => { ev.stopPropagation(); this.onResetTap(); });

    this.coinIcons = [];
    this.updateInfo();

    // Figur wählen (Lotti / Greta)
    this.heroBtn = this.add.text(4, 16, '', { fontFamily: 'monospace', fontSize: '7px', color: '#fff2a8', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 3, y: 2 } }).setDepth(20).setInteractive({ useHandCursor: true });
    this.heroBtn.on(Phaser.Input.Events.POINTER_DOWN, (p, lx, ly, ev) => { ev.stopPropagation(); this.switchHero(); });
    this.input.keyboard.on('keydown-TAB', (ev) => { ev.preventDefault(); this.switchHero(); });
    this.hero.setInteractive({ useHandCursor: true });
    this.hero.on(Phaser.Input.Events.POINTER_DOWN, (p, lx, ly, ev) => { ev.stopPropagation(); this.switchHero(); });
    this.updateHeroLabel();

    // Ton an/aus
    this.muteBtn = this.add.text(4, 4, '', { fontFamily: 'monospace', fontSize: '7px', color: '#d8c8b0', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 3, y: 2 } }).setDepth(20).setInteractive({ useHandCursor: true });
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
    const { width: w, height: h } = GAME;
    const g = this.add.graphics().setDepth(0);
    // Abendlicher Wald: Verlauf + Hügel + Bäume (deterministisch)
    for (let y = 0; y < h; y++) {
      const t = y / h;
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(new Phaser.Display.Color(43, 58, 122), new Phaser.Display.Color(60, 90, 50), h, y);
      g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
      g.fillRect(0, y, w, 1);
    }
    const rnd = new Phaser.Math.RandomDataGenerator(['map']);
    g.fillStyle(0x3f6b3a, 1);
    for (let i = 0; i < 9; i++) {
      g.fillEllipse(rnd.between(0, w), h * 0.55 + rnd.between(0, 40), rnd.between(120, 220), rnd.between(60, 110));
    }
    g.fillStyle(0x2f5230, 1);
    g.fillRect(0, h * 0.5, w, h * 0.5);
    for (let i = 0; i < 70; i++) {
      const x = rnd.between(0, w), y = rnd.between(h * 0.4, h - 10);
      const r = rnd.between(5, 11);
      g.fillStyle(rnd.pick([0xa04a3a, 0xb8702a, 0x8a4a5a, 0x6d8a2b]), 1);
      g.fillCircle(x, y, r);
      g.fillStyle(0x4a2a1a, 1);
      g.fillRect(x - 1, y + r - 2, 2, 5);
    }
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
  }

  drawNodes() {
    this.nodeSprites = {};
    for (const n of this.world.nodes) {
      const unlocked = saveGame.nodeUnlocked(this.world, n.key);
      const lvl = saveGame.level(n.key);
      const c = this.add.container(n.x, n.y).setDepth(5);
      const base = this.add.circle(0, 0, 7, unlocked ? 0xf3b36a : 0x5a4a3a).setStrokeStyle(2, 0x4a230a);
      c.add(base);
      if (lvl.done) c.add(this.add.image(0, -14, 'flag', 'flag0').setScale(0.6).setOrigin(0.5, 0.75));
      if (lvl.secret) c.add(this.add.image(8, -6, 'key', 'key').setScale(0.6));
      const label = this.add.text(0, 10, LEVELS[n.key]?.name ?? n.key, { fontFamily: 'monospace', fontSize: '7px', color: unlocked ? '#fff2a8' : '#8a7a6a', stroke: '#2a1a10', strokeThickness: 2 }).setOrigin(0.5, 0);
      c.add(label);
      base.setInteractive({ useHandCursor: unlocked });
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
    this.coinIcons = lvl.coins.map((c, i) => this.add.image(GAME.width / 2 - 24 + i * 12, GAME.height - 46, 'coin_hud', c ? 'full' : 'empty').setDepth(20));
  }

  /** Neue Pfade nach einem Levelabschluss kurz aufblitzen lassen. */
  revealNewPaths() {
    const fresh = this.world.edges.filter((e) => e.from === this.arrived.from && e.exit === this.arrived.exit && saveGame.edgeUnlocked(e));
    for (const e of fresh) {
      const n = this.nodeSprites[e.to];
      if (n) this.tweens.add({ targets: n, scaleX: 1.4, scaleY: 1.4, duration: 300, yoyo: true, repeat: 2, delay: 400 });
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
  walkTo(target) {
    const nb = this.neighbors(this.current).find((n) => n.key === target);
    if (!nb || this.moving) return;
    this.moving = true;
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
    let step = key;
    while (prev[step] !== this.current) step = prev[step];
    this.walkTo(step);
  }

  onPointer(pointer) {
    if (this.moving) return;
    // Tippen irgendwo: Richtung relativ zu Hero
    const dx = pointer.worldX - this.hero.x, dy = pointer.worldY - this.hero.y;
    if (Math.hypot(dx, dy) < 18) { this.startLevel(); return; }
    const len = Math.hypot(dx, dy);
    this.walkDirection(dx / len, dy / len);
  }

  /** Zwischen Lotti und Greta wechseln (wird gespeichert). */
  switchHero() {
    if (this.moving || this.starting) return;
    this.heroKey = this.heroKey === 'lotti' ? 'greta' : 'lotti';
    saveGame.hero = this.heroKey;
    this.hero.setTexture(this.heroKey, 'idle0');
    this.hero.play(`${this.heroKey}-idle`);
    this.tweens.add({ targets: this.hero, scaleX: 1.3, scaleY: 1.3, duration: 120, yoyo: true });
    this.updateHeroLabel();
    sfx('select');
  }

  updateHeroLabel() {
    const name = this.heroKey === 'lotti' ? 'Lotti' : 'Greta';
    this.heroBtn.setText(`Figur: ${name} (Tab)`);
  }

  toggleMute() {
    engine.toggleMuted();
    this.updateMuteLabel();
    sfx('select');
  }

  updateMuteLabel() {
    this.muteBtn.setText(engine.muted ? 'Ton: aus (M)' : 'Ton: an (M)');
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
