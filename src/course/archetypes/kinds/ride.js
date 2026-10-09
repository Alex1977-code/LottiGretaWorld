// Archetyp `ride` (Reit-Level, Welt 1: 1-4 „Pflaumes Wildwasserfahrt“; Präzisierung Ritt/Diorama):
//   createPlayer → RideController (Floß-Physik auf dem Fluss-Netz level.river, zu Fuß = Player)
//   createRig    → RideRig (Pflaume paddelt auf dem Blatt-Floß, Heldin reitet; an Land hoppelt Pflaume hinterher)
//   camera       → RideCamera (hinter dem Floß entlang der Strömung, Absturz-Kamera)
//   beforeStep   → Steuer-Gier = Floß-Kamera (deterministisch, aus der Simulation)
//   afterStep    → Checkpoints beim Vorbeifahren (Neustart im Fluss), Energie-Ebene der Musik beim Reiten
//   render       → Blasen vor dem Auftauchen der Wühler (Vorwarnung), Wühler weit weg ausblenden (Zeichenaufrufe)
// Level-Daten: LEVEL.ride (siehe RideController), Fluss-Bausteine blocks/types/river.js.

import * as THREE from 'three';
import { RideController } from '../RideController.js';
import { RideRig } from '../RideRig.js';
import { RideCamera } from '../RideCamera.js';
import { music } from '../../../audio/index.js';

const BUBBLES = 48;
const MOLE_FAR = 36;      // m: weiter entfernte Wühler werden nicht gezeichnet

class RideArchetype {
  constructor(scene) {
    this.scene = scene;
    this.drums = null;
  }

  createPlayer(level, opts) { return new RideController(level, opts); }
  createRig(view, player) { return new RideRig(view, player); }

  setup() {
    const sc = this.scene;
    this.level = sc.level;
    this.player = sc.player;
    this.view = sc.view;
    this.cam = new RideCamera(sc.view);
    this.moles = this.level.entities.filter((e) => e.kind === 'wuehler');
    // Wühler werfen keine Schatten (Wasser ist undurchsichtig; spart Zeichenaufrufe im Schattenpass)
    for (const m of this.moles) m.model?.root.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    this.checkpoints = this.level.entities.filter((e) => e.kind === 'checkpoint');
    this.buildBubbles();
    this.setDrums(!!this.player.riding);
    this.level.controlYaw = this.cam.controlYaw(this.player);
  }

  setDrums(on) {
    if (this.drums === on) return;
    this.drums = on;
    try { music.setDrums(on); } catch (_) { /* Audio optional */ }
  }

  beforeStep() {
    this.level.controlYaw = this.cam.controlYaw(this.player);
  }

  afterStep() {
    const p = this.player;
    this.setDrums(!!p.riding && !p.dead);
    if (!p.riding || p.dead) return;
    // Checkpoint beim Vorbeifahren (Fahne steht am Ufer): Neustart im Fluss oberhalb der Fahne
    for (const cp of this.checkpoints) {
      if (cp.active) continue;
      const dz = Math.abs(p.pos.z - cp.pos.z), dx = Math.abs(p.pos.x - cp.pos.x);
      if (dz < 2.2 && dx < 14) {
        cp.onPlayer(p);
        const f = this.level.river.sample(p.pos.x, p.pos.z);
        const q = f.ch.at(Math.max(0, f.s - 4), {});
        this.level.runtime.checkpoint = { pos: [q.x, q.y, q.z], yaw: Math.atan2(-q.tz, q.tx) };
      }
    }
  }

  // ------------------------------------------------------------------ Blasen (Wühler-Vorwarnung)

  buildBubbles() {
    const g = new THREE.SphereGeometry(0.09, 7, 5);
    const m = new THREE.MeshStandardMaterial({ color: 0xeaffff, roughness: 0.1, transparent: true, opacity: 0.85 });
    this.bub = new THREE.InstancedMesh(g, m, BUBBLES);
    this.bub.frustumCulled = false;
    this.bub.name = 'wuehler-blasen';
    this.bubItems = Array.from({ length: BUBBLES }, () => ({ life: 0, x: 0, y: 0, z: 0, s: 1, vx: 0, vz: 0 }));
    this.bubNext = 0;
    this.bubT = 0;
    const Z = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < BUBBLES; i++) this.bub.setMatrixAt(i, Z);
    this.view.three.add(this.bub);
    this._m = new THREE.Matrix4(); this._p = new THREE.Vector3(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3();
  }

  render(dt) {
    if (!this.bub) return;
    const tg = this.view.rig.target;
    this.bubT -= dt;
    const emit = this.bubT <= 0;
    if (emit) this.bubT = 0.07;
    for (const m of this.moles) {
      if (!m.model) continue;
      const far = Math.hypot(m.pos.x - tg.x, m.pos.z - tg.z) > MOLE_FAR;
      m.model.root.visible = !far && !m.removed;
      if (far || !emit || m.defeated || m.state !== 'hide') continue;
      // 0,8 s vor dem Auftauchen: Blasen steigen auf
      if (m.stateT > m.hideTime - 0.8) {
        const it = this.bubItems[this.bubNext];
        this.bubNext = (this.bubNext + 1) % BUBBLES;
        const a = Math.random() * Math.PI * 2, d = Math.random() * 0.45;
        it.life = 0.55; it.x = m.pos.x + Math.cos(a) * d; it.z = m.pos.z + Math.sin(a) * d; it.y = m.pos.y - 0.05;
        it.s = 0.6 + Math.random() * 0.9;
      }
    }
    for (let i = 0; i < BUBBLES; i++) {
      const it = this.bubItems[i];
      if (it.life <= 0) { this._m.makeScale(0, 0, 0); this.bub.setMatrixAt(i, this._m); continue; }
      it.life -= dt;
      it.y += dt * 0.7;
      const k = Math.max(0, it.life) / 0.55;
      const s = it.s * (0.4 + 0.8 * (1 - k)) * (it.life > 0 ? 1 : 0);
      this._p.set(it.x, it.y, it.z); this._s.set(s, s, s); this._q.identity();
      this._m.compose(this._p, this._q, this._s);
      this.bub.setMatrixAt(i, this._m);
    }
    this.bub.instanceMatrix.needsUpdate = true;
  }

  camera(dt, player) {
    this.cam.update(dt, player);
    return true;
  }

  info() {
    const p = this.player;
    return { riding: !!p.riding, moored: !!p.raftMoored, dismounted: !!p.dismounted, plunging: !!p.plunging, camYaw: +(p.camYaw ?? 0).toFixed(3), cam: this.cam?.info() };
  }

  dispose() {
    this.setDrums(false);
    if (this.bub) { this.bub.parent?.remove(this.bub); this.bub.geometry.dispose(); this.bub.material.dispose(); this.bub.dispose(); this.bub = null; }
  }
}

export const ARCHETYPES = { ride: (scene) => new RideArchetype(scene) };
