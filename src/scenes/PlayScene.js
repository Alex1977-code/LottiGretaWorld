// Spiel-Szene: Level laden, Hintergrund, Pip, Kamera, Debug.

import Phaser from 'phaser';
import { GAME, DEBUG } from '../config.js';
import { TILE_INDEX } from '../gfx/tiles.js';
import { buildTestLevel } from '../levels/testlevel.js';
import { Pip } from '../entities/Pip.js';
import { Walker } from '../entities/Walker.js';
import { Hopper } from '../entities/Hopper.js';
import { Checkpoint } from '../entities/Checkpoint.js';
import { ENEMIES, DAMAGE } from '../config.js';
import { initGameState, STATE_KEYS, DEFAULTS } from '../systems/GameState.js';
import { InputManager } from '../systems/InputManager.js';
import { Effects } from '../systems/Effects.js';
import { CameraRig } from '../systems/CameraRig.js';
import { DebugOverlay } from '../systems/DebugOverlay.js';

export class PlayScene extends Phaser.Scene {
  constructor() {
    super('Play');
  }

  init(data) {
    this.levelKey = data?.level ?? 'test';
  }

  create() {
    initGameState(this.registry);
    this.registry.set(STATE_KEYS.hearts, this.registry.get(STATE_KEYS.maxHearts));

    this.input_ = new InputManager(this);
    this.effects = new Effects(this);

    this.createBackground();
    this.createMap();
    this.createPlayer();
    this.createObjects();

    this.cameraRig = new CameraRig(this, this.pip);
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.setRoundPixels(true);

    this.debug = new DebugOverlay(this, this.pip, DEBUG.startEnabled);

    // UI-Szene (Touch-Steuerung, HUD) über dem Spiel starten
    this.scene.launch('UI', { ctrl: this.input_ });

    // Eingabe vor dem Pip-Update einlesen (keine Frame-Verzögerung)
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
    if (!this.cache.tilemap.has(key)) {
      const json = buildTestLevel();
      this.cache.tilemap.add(key, { format: Phaser.Tilemaps.Formats.TILED_JSON, data: json });
    }
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
    this.pip = new Pip(this, start.x + GAME.tile / 2, start.y, this.input_, this.effects);
    this.physics.add.collider(this.pip, this.groundLayer);
  }

  /** Gegner und Checkpoints aus der Objektebene erzeugen. */
  createObjects() {
    this.enemies = this.add.group();
    this.checkpoints = this.add.group();
    const objLayer = this.map.getObjectLayer('objects');
    for (const o of objLayer?.objects ?? []) {
      const cx = o.x + GAME.tile / 2;
      if (o.type === 'enemy') {
        const e = o.name === 'walker' ? new Walker(this, cx, o.y, this.groundLayer) : new Hopper(this, cx, o.y, this.pip);
        this.enemies.add(e);
      } else if (o.type === 'checkpoint') {
        this.checkpoints.add(new Checkpoint(this, cx, o.y));
      }
    }
    this.physics.add.collider(this.enemies, this.groundLayer);
    this.physics.add.overlap(this.pip, this.enemies, this.onPipEnemy, (pip, e) => e.alive, this);
    this.physics.add.overlap(this.pip, this.checkpoints, this.onCheckpoint, null, this);
  }

  /** Pip berührt einen Gegner: von oben = besiegen, sonst Schaden. */
  onPipEnemy(pip, enemy) {
    if (pip.dead || pip.respawnLock) return;
    const fromAbove = pip.body.bottom - enemy.body.top < ENEMIES.stompTolerance && pip.body.velocity.y > 0;
    if (enemy.stompable && fromAbove) {
      enemy.squash();
      // Füße auf die Gegner-Oberkante setzen (verhindert Durchrutschen)
      pip.y = enemy.body.top - (pip.body.offset.y + pip.body.height - pip.displayOriginY);
      pip.bounce(this.input_.jumpHeld);
      this.effects.sparks(enemy.x, enemy.body.top, 6);
      this.hitstop(ENEMIES.hitstop);
    } else if (pip.hurt(enemy.x)) {
      this.loseHeart();
    }
  }

  onCheckpoint(pip, cp) {
    if (cp.activate()) {
      pip.setSpawn(cp.x, cp.body.bottom);
      // Herzen auffrischen
      this.registry.set(STATE_KEYS.hearts, this.registry.get(STATE_KEYS.maxHearts));
    }
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
    if (hearts <= 0) this.killPip();
  }

  /** Pip stirbt: kurzer Moment, dann Respawn am Checkpoint mit vollen Herzen. */
  killPip() {
    if (this.pip.dead || this.pip.respawnLock) return;
    this.pip.dead = true;
    this.pip.respawnLock = true;
    this.pip.body.setVelocity(0, -260);
    this.pip.body.checkCollision.none = true;
    this.pip.setAngle(0);
    this.time.delayedCall(450, () => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.pip.body.checkCollision.none = false;
        this.pip.respawn();
        this.registry.set(STATE_KEYS.hearts, this.registry.get(STATE_KEYS.maxHearts));
        this.cameras.main.fadeIn(250, 0, 0, 0);
      });
    });
  }

  update(time, delta) {
    if (this.input_.debugJustPressed) this.debug.toggle();
    if (this.input_.resetJustPressed) this.pip.respawn();

    // In die Tiefe gefallen → Tod, zurück zum Checkpoint
    if (this.pip.y > this.map.heightInPixels + 40 && !this.pip.respawnLock) {
      this.pip.respawnLock = true;
      this.cameras.main.fadeOut(150, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.pip.respawn();
        this.registry.set(STATE_KEYS.hearts, this.registry.get(STATE_KEYS.maxHearts));
        this.cameras.main.fadeIn(200, 0, 0, 0);
      });
    }

    this.cameraRig.update();
    this.updateParallax();
    this.debug.update();
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
