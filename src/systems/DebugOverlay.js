// Debug-Modus (Taste D): Hitboxen, FPS, Hero-Zustand.

export class DebugOverlay {
  constructor(scene, lotti, startEnabled = false) {
    this.scene = scene;
    this.hero = lotti;
    this.enabled = false;

    this.text = scene.add.text(4, 16, '', {
      fontFamily: 'monospace', fontSize: '8px', color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 2, y: 1 },
    }).setScrollFactor(0).setDepth(1000).setVisible(false);

    if (startEnabled) this.toggle();
  }

  toggle() {
    this.enabled = !this.enabled;
    const world = this.scene.physics.world;
    if (this.enabled) {
      if (!world.debugGraphic) world.createDebugGraphic();
      world.drawDebug = true;
      world.debugGraphic.setVisible(true).setDepth(999);
    } else {
      world.drawDebug = false;
      world.debugGraphic?.clear();
      world.debugGraphic?.setVisible(false);
    }
    this.text.setVisible(this.enabled);
  }

  update() {
    if (!this.enabled) return;
    const p = this.hero;
    const b = p.body;
    const fps = this.scene.game.loop.actualFps.toFixed(0);
    this.text.setText([
      `FPS ${fps}`,
      `state ${p.moveState}${p.swooping ? ' (swoop)' : ''}`,
      `pos ${b.x.toFixed(0)},${b.y.toFixed(0)}  vel ${b.velocity.x.toFixed(0)},${b.velocity.y.toFixed(0)}`,
      `coyote ${Math.max(0, p.coyoteTimer).toFixed(0)}  buffer ${Math.max(0, p.jumpBufferTimer).toFixed(0)}`,
    ]);
  }
}
