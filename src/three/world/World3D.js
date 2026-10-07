// 3D-Welt eines Levels im Super-Mario-3D-World-Look: Gelände aus der Logik-Tilemap (Erde mit
// runder Grasdecke, Höhlen, Felsschicht, Rückwand), Steinblöcke, Holzstege, Zier-Objekte,
// Hintergrund in echter Tiefe (Himmel, Sonne, Wolken, Hügel, Bäume, Berge), Licht und Schatten.
// Alles Code-generiert; aufgeteilt in terrain.js, props.js, scenery.js, lighting.js, materials.js.
// Schnittstelle, die die Spielszene nutzt:
//   new World3D(view, map, groundLayer)   removeTile(tx, ty)   update(dt, t)   dispose()

import * as THREE from 'three';
import { makeMaterials } from './materials.js';
import { LevelGrid, buildTerrain } from './terrain.js';
import { Scenery } from './scenery.js';
import { Lighting } from './lighting.js';

export class World3D {
  constructor(view, map, layer) {
    this.view = view;
    this.map = map;
    this.layer = layer;
    this.group = new THREE.Group();
    view.three.add(this.group);
    this.disposables = [];
    this.mats = makeMaterials();
    this.disposables.push(...this.mats.all);
    const ctx = { group: this.group, track: (x) => this.track(x), mats: this.mats };
    this.grid = new LevelGrid(map, layer);
    this.terrain = buildTerrain(this.grid, ctx);
    this.scenery = new Scenery(this.grid, ctx, view);
    this.lighting = new Lighting(ctx);
    this.update(0, 0);
  }

  track(x) { this.disposables.push(x); return x; }

  /** Block zerbrochen (Stampfsprung): Instanz verschwinden lassen. */
  removeTile(tx, ty) {
    this.terrain.bricks.remove(tx, ty);
  }

  update(dt, t) {
    const tg = this.view.target;
    this.lighting.update(tg);
    this.scenery.update(dt, t, tg);
  }

  dispose() {
    this.group.parent?.remove(this.group);
    this.lighting.dispose();
    for (const d of this.disposables) d.dispose?.();
    this.disposables.length = 0;
  }
}
