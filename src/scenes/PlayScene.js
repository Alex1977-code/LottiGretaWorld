// Spiel-Szene: Level laden, Hintergrund, Lotti, Kamera, Debug.

import Phaser from 'phaser';
import { GAME, DEBUG } from '../config.js';
import { TILE_INDEX } from '../gfx/tiles.js';
import { LEVELS } from '../levels/index.js';
import { Coin } from '../entities/Coin.js';
import { Key, Gate, Flag, Thorns } from '../entities/Items.js';
import { saveGame } from '../systems/SaveGame.js';
import { Lotti } from '../entities/Lotti.js';
import { Walker } from '../entities/Walker.js';
import { Hopper } from '../entities/Hopper.js';
import { Checkpoint } from '../entities/Checkpoint.js';
import { Greta } from '../entities/Greta.js';
import { Berry } from '../entities/Berry.js';
import { ENEMIES, DAMAGE, GRETA } from '../config.js';
import { initGameState, STATE_KEYS } from '../systems/GameState.js';
import { vibrate } from '../systems/haptics.js';
import { sfx, music, engine as audioEngine } from '../audio/index.js';

const vibrateStomp = () => vibrate([40, 30, 60]);
import { InputManager } from '../systems/InputManager.js';
import { Effects } from '../systems/Effects.js';
import { CameraRig } from '../systems/CameraRig.js';
import { DebugOverlay } from '../systems/DebugOverlay.js';

export class PlayScene extends Phaser.Scene {
  constructor() {
    super('Play');
  }

  init(data) {
    this.levelKey = data?.level && LEVELS[data.level] ? data.level : 'level1';
    this.completing = false;
  }

  create() {
    initGameState(this.registry);
    this.registry.set(STATE_KEYS.hearts, this.registry.get(STATE_KEYS.maxHearts));
    this.registry.set(STATE_KEYS.power, '');
    this.registry.set(STATE_KEYS.coins, [false, false, false, false, false]);
    this.registry.set(STATE_KEYS.hasKey, false);

    this.input_ = new InputManager(this);
    this.effects = new Effects(this);

    this.createBackground();
    this.createMap();
    this.createPlayer();
    this.createObjects();

    this.cameraRig = new CameraRig(this, this.lotti);
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.setRoundPixels(true);

    this.debug = new DebugOverlay(this, this.lotti, DEBUG.startEnabled);

    // UI-Szene (Touch-Steuerung, HUD) über dem Spiel starten
    this.scene.launch('UI', { ctrl: this.input_ });

    // Pause (Esc/P oder Knopf in der UI)
    this.input.keyboard.on('keydown-ESC', this.pauseGame, this);
    this.input.keyboard.on('keydown-P', this.pauseGame, this);
    this.input.keyboard.on('keydown-M', () => { audioEngine.toggleMuted(); sfx('select'); });
    if (this.levelKey !== 'test') saveGame.current = this.levelKey;

    // Musik: Welt-Thema; Trommeln kommen beim Reiten dazu
    music.setDrums(false);
    music.play('world1');

    // Eingabe vor dem Lotti-Update einlesen (keine Frame-Verzögerung)
    this.events.on(Phaser.Scenes.Events.PRE_UPDATE, this.input_.update, this.input_);

    // Fenster-Fokus verloren → keine hängenden Tasten
    this.game.events.on(Phaser.Core.Events.BLUR, () => this.input.keyboard.resetKeys());
  }

  createBackground() {
    const w = GAME.width, h = GAME.height;
    this.add.image(0, 0, 'sky').setOrigin(0).setScrollFactor(0).setDepth(-10);
    this.bgFar = this.add.tileSprite(0, 0, w, h, 'bg_far').setOrigin(0).setScrollFactor(0).setDepth(-9);
    this.bgMid = this.add.tileSprite(0, 0, w, h, 'bg_mid').setOrigin(0).setScrollFactor(0).setDepth(-8);
    this.bgNear = this.add.tileSprite(0, 0, w, h, 'bg_near').setOrigin(0).setScrollFactor(0).setDepth(-7);
  }

  createMap() {
    const key = `map-${this.levelKey}`;
    // Level wird bei jedem Start neu erzeugt (zerbrochene Blöcke etc. zurücksetzen)
    if (this.cache.tilemap.has(key)) this.cache.tilemap.remove(key);
    this.cache.tilemap.add(key, { format: Phaser.Tilemaps.Formats.TILED_JSON, data: LEVELS[this.levelKey].build() });
    this.map = this.make.tilemap({ key });
    const tileset = this.map.addTilesetImage('tiles', 'tiles', GAME.tile, GAME.tile, 0, 0);
    this.groundLayer = this.map.createLayer('ground', tileset, 0, 0).setDepth(0);

    // Kollision: Boden (0..15) und Steinblöcke – Index = GID - 1 + firstgid... Phaser nutzt GIDs
    const first = tileset.firstgid;
    this.groundLayer.setCollisionBetween(first + TILE_INDEX.ground, first + TILE_INDEX.ground + 15);
    this.groundLayer.setCollisionBetween(first + TILE_INDEX.brick, first + TILE_INDEX.brickAlt);
    // Einseitige Plattformen: nur von oben begehbar
    const platformGid = first + TILE_INDEX.platform;
    this.groundLayer.forEachTile((t) => {
      if (t.index === platformGid) t.setCollision(false, false, true, false, false);
    });
    this.groundLayer.calculateFacesWithin();

    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels + 64);
    // Unten offen lassen (Sturz in die Tiefe = Respawn), seitlich geschlossen
    this.physics.world.setBoundsCollision(true, true, true, false);
  }

  createPlayer() {
    const objLayer = this.map.getObjectLayer('objects');
    const start = objLayer?.objects.find((o) => o.name === 'player') ?? { x: 48, y: 200 };
    this.lotti = new Lotti(this, start.x + GAME.tile / 2, start.y, this.input_, this.effects);
    this.physics.add.collider(this.lotti, this.groundLayer);
  }

  /** Gegner und Checkpoints aus der Objektebene erzeugen. */
  createObjects() {
    this.enemies = this.add.group();
    this.checkpoints = this.add.group();
    this.mounts = this.add.group();
    this.berries = this.add.group();
    this.fireballs = this.add.group();
    this.coins = this.add.group();
    this.keys = this.add.group();
    this.gates = this.add.group();
    this.flags = this.add.group();
    this.thorns = this.add.group();
    const saved = saveGame.level(this.levelKey);
    const objLayer = this.map.getObjectLayer('objects');
    for (const o of objLayer?.objects ?? []) {
      const cx = o.x + GAME.tile / 2;
      if (o.type === 'coin') {
        const idx = o.properties?.find((p) => p.name === 'index')?.value ?? 0;
        this.coins.add(new Coin(this, cx, o.y, idx, saved.coins[idx]));
        continue;
      }
      if (o.type === 'key') { this.keys.add(new Key(this, cx, o.y)); continue; }
      if (o.type === 'gate') { this.gates.add(new Gate(this, cx, o.y)); continue; }
      if (o.type === 'flag') { this.flags.add(new Flag(this, cx, o.y)); continue; }
      if (o.type === 'thorns') { this.thorns.add(new Thorns(this, cx, o.y)); continue; }
      if (o.type === 'enemy') {
        const e = o.name === 'walker' ? new Walker(this, cx, o.y, this.groundLayer) : new Hopper(this, cx, o.y, this.lotti);
        this.enemies.add(e);
      } else if (o.type === 'checkpoint') {
        this.checkpoints.add(new Checkpoint(this, cx, o.y));
      } else if (o.type === 'mount') {
        this.mounts.add(new Greta(this, cx, o.y, this.groundLayer));
      } else if (o.type === 'berry') {
        this.berries.add(new Berry(this, cx, o.y - GAME.tile / 2, o.name));
      }
    }
    this.physics.add.collider(this.enemies, this.groundLayer);
    this.physics.add.collider(this.mounts, this.groundLayer);
    this.physics.add.collider(this.fireballs, this.groundLayer);
    this.physics.add.overlap(this.lotti, this.enemies, this.onLottiEnemy, (lotti, e) => e.alive, this);
    this.physics.add.overlap(this.lotti, this.checkpoints, this.onCheckpoint, null, this);
    this.physics.add.overlap(this.lotti, this.mounts, this.onLottiMount, (lotti, m) => m.canMount, this);
    this.physics.add.overlap(this.lotti, this.berries, this.onLottiBerry, (lotti) => !!lotti.mount, this);
    this.physics.add.overlap(this.fireballs, this.enemies, this.onFireballEnemy, (f, e) => e.alive, this);
    this.physics.add.overlap(this.lotti, this.coins, this.onCoin, (lotti, c) => c.body.enable, this);
    this.physics.add.overlap(this.lotti, this.keys, this.onKey, (lotti, k) => !k.collected, this);
    this.physics.add.overlap(this.lotti, this.gates, this.onGate, (lotti, g) => !g.opened, this);
    this.physics.add.overlap(this.lotti, this.flags, this.onFlag, null, this);
    this.physics.add.overlap(this.lotti, this.thorns, this.onThorns, null, this);
  }

  onCoin(lotti, coin) {
    coin.collect();
    const coins = [...this.registry.get(STATE_KEYS.coins)];
    coins[coin.index] = true;
    this.registry.set(STATE_KEYS.coins, coins);
    vibrate(10);
    sfx('bigCoin');
  }

  onKey(lotti, key) {
    key.collect(lotti);
    this.registry.set(STATE_KEYS.hasKey, true);
    vibrate(15);
    sfx('key');
  }

  onGate(lotti, gate) {
    if (!this.registry.get(STATE_KEYS.hasKey) || this.completing) return;
    gate.open();
    sfx('gate');
    this.keys.getChildren().forEach((k) => k.setVisible(false));
    this.completeLevel('secret');
  }

  onFlag(lotti) {
    if (this.completing) return;
    this.completeLevel('normal');
  }

  onThorns(lotti, thorns) {
    if (lotti.dead || lotti.respawnLock) return;
    if (lotti.mount) {
      if (!lotti.invincible) lotti.mount.panic(thorns.x);
    } else if (lotti.hurt(thorns.x)) {
      this.loseHeart();
    }
  }

  /** Levelende: Eingabe sperren, kurze Feier, Ergebnis speichern und anzeigen. */
  completeLevel(exit) {
    this.completing = true;
    const lotti = this.lotti;
    lotti.locked = true;
    lotti.body.setVelocityX(0);
    vibrate([30, 50, 30, 50, 60]);
    music.play('complete');
    this.time.addEvent({ delay: 180, repeat: 6, callback: () => this.effects.sparks(lotti.x + Phaser.Math.Between(-30, 30), lotti.y - Phaser.Math.Between(0, 40), 8) });
    const coins = this.registry.get(STATE_KEYS.coins);
    saveGame.completeLevel(this.levelKey, exit, coins);
    this.time.delayedCall(1600, () => {
      this.scene.pause('UI');
      this.scene.launch('LevelComplete', { exit, coins, levelKey: this.levelKey });
      this.scene.pause();
    });
  }

  /** Lotti berührt Greta: aufsteigen (auch während der Flucht = wieder einfangen). */
  onLottiMount(lotti, greta) {
    if (lotti.dead || lotti.respawnLock || lotti.mount) return;
    greta.mount(lotti);
  }

  /** Beim Reiten über eine Beere: Greta frisst sie. */
  onLottiBerry(lotti, berry) {
    lotti.mount.eat(berry.berryType);
    berry.consume();
  }

  onFireballEnemy(fireball, enemy) {
    enemy.knockOut(fireball.dir);
    this.effects.sparks(enemy.x, enemy.y, 8);
    fireball.pop();
    this.hitstop(ENEMIES.hitstop);
    sfx('stomp');
  }

  /** Stampfsprung-Landung: Erschütterung, Gegner im Umkreis, Blöcke darunter zerbrechen. */
  onStompLand(lotti, greta) {
    const body = lotti.body;
    this.cameras.main.shake(220, GRETA.stompShake);
    this.effects.dust(body.left, body.bottom, 8, 1.2);
    this.effects.dust(body.right, body.bottom, 8, 1.2);
    vibrateStomp();
    sfx('slam');
    // Gegner am Boden im Umkreis
    for (const e of this.enemies.getChildren()) {
      if (!e.alive) continue;
      if (Math.abs(e.x - lotti.x) < GRETA.stompRadius && Math.abs(e.body.bottom - body.bottom) < 20) {
        e.knockOut(Math.sign(e.x - lotti.x) || 1);
      }
    }
    // Steinblöcke direkt unter den Füßen
    const first = this.groundLayer.tileset[0].firstgid;
    const brickGids = [first + TILE_INDEX.brick, first + TILE_INDEX.brickAlt];
    const y = body.bottom + 2;
    let broke = false;
    for (let x = body.left + 2; x <= body.right - 2; x += 8) {
      const t = this.groundLayer.getTileAtWorldXY(x, y);
      if (t && brickGids.includes(t.index)) {
        this.groundLayer.removeTileAt(t.x, t.y);
        this.effects.dust(t.getCenterX(), t.getCenterY(), 10, 1.5);
        this.effects.sparks(t.getCenterX(), t.getCenterY(), 4);
        broke = true;
      }
    }
    if (broke) this.groundLayer.calculateFacesWithin();
  }

  /** Lotti berührt einen Gegner: von oben = besiegen, sonst Schaden. */
  onLottiEnemy(lotti, enemy) {
    if (lotti.dead || lotti.respawnLock) return;
    const fromAbove = lotti.body.bottom - enemy.body.top < ENEMIES.stompTolerance && lotti.body.velocity.y > 0;
    if (enemy.stompable && fromAbove) {
      enemy.squash();
      // Füße auf die Gegner-Oberkante setzen (verhindert Durchrutschen)
      lotti.y = enemy.body.top - (lotti.body.offset.y + lotti.body.height - lotti.displayOriginY);
      lotti.bounce(this.input_.jumpHeld);
      this.effects.sparks(enemy.x, enemy.body.top, 6);
      this.hitstop(ENEMIES.hitstop);
      sfx('stomp');
    } else if (lotti.mount) {
      if (!lotti.invincible) lotti.mount.panic(enemy.x);
    } else if (lotti.hurt(enemy.x)) {
      this.loseHeart();
    }
  }

  onCheckpoint(lotti, cp) {
    if (cp.activate()) {
      lotti.setSpawn(cp.x, cp.body.bottom);
      sfx('checkpoint');
      // Herzen auffrischen
      this.registry.set(STATE_KEYS.hearts, this.registry.get(STATE_KEYS.maxHearts));
    }
  }

  pauseGame() {
    if (this.completing || this.scene.isPaused()) return;
    this.input.keyboard.resetKeys();
    sfx('pause');
    this.scene.pause('UI');
    this.scene.launch('Pause');
    this.scene.pause();
  }

  /** Kurzer Freeze-Frame (Physik pausiert). */
  hitstop(ms) {
    this.physics.world.pause();
    this.time.delayedCall(ms, () => this.physics.world.resume());
  }

  loseHeart() {
    const hearts = this.registry.get(STATE_KEYS.hearts) - 1;
    this.registry.set(STATE_KEYS.hearts, Math.max(0, hearts));
    this.cameras.main.shake(120, 0.006);
    this.cameras.main.flash(80, 255, 80, 80, false);
    if (hearts <= 0) this.killLotti();
  }

  /** Lotti stirbt: kurzer Moment, dann Respawn am Checkpoint mit vollen Herzen. */
  killLotti() {
    if (this.lotti.dead || this.lotti.respawnLock) return;
    this.lotti.dead = true;
    this.lotti.respawnLock = true;
    this.lotti.body.setVelocity(0, -260);
    this.lotti.body.checkCollision.none = true;
    this.lotti.setAngle(0);
    sfx('die');
    music.setDrums(false);
    this.time.delayedCall(450, () => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.lotti.body.checkCollision.none = false;
        this.lotti.respawn();
        this.registry.set(STATE_KEYS.hearts, this.registry.get(STATE_KEYS.maxHearts));
        this.cameras.main.fadeIn(250, 0, 0, 0);
      });
    });
  }

  update(time, delta) {
    if (this.input_.debugJustPressed) this.debug.toggle();
    if (this.input_.resetJustPressed) this.lotti.respawn();

    // In die Tiefe gefallen → Tod, zurück zum Checkpoint
    if (this.lotti.y > this.map.heightInPixels + 40 && !this.lotti.respawnLock) {
      this.lotti.respawnLock = true;
      sfx('die');
      music.setDrums(false);
      this.cameras.main.fadeOut(150, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.lotti.respawn();
        this.registry.set(STATE_KEYS.hearts, this.registry.get(STATE_KEYS.maxHearts));
        this.cameras.main.fadeIn(200, 0, 0, 0);
      });
    }

    this.cameraRig.update();
    this.updateParallax();
    this.debug.update();

    // Aktionsknopf nur hervorheben, wenn er etwas bewirkt
    const ui = this.scene.get('UI');
    ui?.touchControls?.setActionAvailable(!!this.lotti.mount && (this.lotti.mount.power === 'red' || this.lotti.mount.power === 'yellow'));
  }

  updateParallax() {
    const sx = this.cameras.main.scrollX;
    const sy = this.cameras.main.scrollY;
    this.bgFar.tilePositionX = sx * 0.15;
    this.bgMid.tilePositionX = sx * 0.35;
    this.bgNear.tilePositionX = sx * 0.6;
    // Leichte vertikale Verschiebung, damit die Ebenen beim Steigen/Fallen mitgehen
    this.bgFar.tilePositionY = sy * 0.05;
    this.bgMid.tilePositionY = sy * 0.12;
    this.bgNear.tilePositionY = sy * 0.25;
  }
}
