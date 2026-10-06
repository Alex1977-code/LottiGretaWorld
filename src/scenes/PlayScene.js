// Spiel-Szene: Level laden, Hintergrund, Pip, Kamera, Debug.

import Phaser from 'phaser';
import { GAME, DEBUG } from '../config.js';
import { TILE_INDEX } from '../gfx/tiles.js';
import { buildTestLevel } from '../levels/testlevel.js';
import { Pip } from '../entities/Pip.js';
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
    this.input_ = new InputManager(this);
    this.effects = new Effects(this);

    this.createBackground();
    this.createMap();
    this.createPlayer();

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

  update(time, delta) {
    if (this.input_.debugJustPressed) this.debug.toggle();
    if (this.input_.resetJustPressed) this.pip.respawn();

    // In die Tiefe gefallen → zurück zum Start
    if (this.pip.y > this.map.heightInPixels + 40 && !this.pip.respawnLock) {
      this.pip.respawnLock = true;
      this.cameras.main.fadeOut(150, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.pip.respawn();
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
