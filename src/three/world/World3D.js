// 3D-Welt eines Levels: Himmel, Licht, Boden/Blöcke/Plattformen aus der Logik-Tilemap,
// Hintergrund. Diese Fassung ist ein PLATZHALTER mit einfachen Kuben; der endgültige Look
// (Super Mario 3D World: runde Kanten, Grasdecke, Tiefe, Hügel, Bäume, Wolken) ersetzt sie.
// Schnittstelle, die die Spielszene nutzt:
//   new World3D(view, map, groundLayer)   removeTile(tx, ty)   update(dt, t)   dispose()

import * as THREE from 'three';
import { TILE_INDEX, EDGE } from '../../gfx/tiles.js';
import { RENDER3D } from '../../render3d.js';

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3(1, 1, 1);

export class World3D {
  constructor(view, map, layer) {
    this.view = view;
    this.map = map;
    this.layer = layer;
    this.group = new THREE.Group();
    view.three.add(this.group);
    this.brickSlots = new Map(); // "tx,ty" → Instanz-Index (zum Zerbrechen)
    this.disposables = [];
    this.buildSky();
    this.buildLights();
    this.buildTiles();
  }

  track(x) { this.disposables.push(x); return x; }

  buildSky() {
    this.view.three.background = new THREE.Color(0x7ec8f5);
    this.view.three.fog = new THREE.Fog(0x9ad8ff, 40, 120);
  }

  buildLights() {
    this.hemi = new THREE.HemisphereLight(0xcfe8ff, 0x5a8a3a, 0.9);
    this.sun = new THREE.DirectionalLight(0xfff2d8, 2.2);
    this.sun.castShadow = RENDER3D.shadows;
    const r = RENDER3D.shadowRadius;
    const sc = this.sun.shadow.camera;
    sc.left = -r; sc.right = r; sc.top = r * 0.7; sc.bottom = -r * 0.7; sc.near = 1; sc.far = 80;
    this.sun.shadow.mapSize.set(RENDER3D.shadowMapSize, RENDER3D.shadowMapSize);
    this.sun.shadow.bias = -0.0015;
    this.sun.shadow.normalBias = 0.02;
    this.sunOffset = new THREE.Vector3(-8, 18, 14);
    this.group.add(this.hemi, this.sun, this.sun.target);
  }

  /** Tiles der Logik-Ebene in Instanzen übersetzen. */
  buildTiles() {
    const map = this.map, layer = this.layer;
    const first = layer.tileset[0].firstgid;
    const w = map.width, h = map.height;
    const lists = { dirt: [], grass: [], brick: [], platform: [], deco: [], cave: [] };
    for (let ty = 0; ty < h; ty++) {
      for (let tx = 0; tx < w; tx++) {
        const t = layer.getTileAt(tx, ty);
        if (!t) continue;
        const idx = t.index - first;
        if (idx >= TILE_INDEX.ground && idx < TILE_INDEX.ground + 16) {
          lists.dirt.push([tx, ty]);
          if (idx & EDGE.TOP) lists.grass.push([tx, ty]);
        } else if (idx === TILE_INDEX.caveFloor) lists.cave.push([tx, ty]);
        else if (idx === TILE_INDEX.brick || idx === TILE_INDEX.brickAlt) lists.brick.push([tx, ty]);
        else if (idx === TILE_INDEX.platform) lists.platform.push([tx, ty]);
        else if (idx >= TILE_INDEX.decoGrass && idx <= TILE_INDEX.decoStone) lists.deco.push([tx, ty]);
      }
    }
    // Boden unter dem Level fortsetzen (Kamera blickt leicht von oben → Unterkante sichtbar)
    for (let tx = -12; tx < w + 12; tx++) for (let ty = h; ty < h + 3; ty++) lists.dirt.push([tx, ty]);
    const DEPTH = 4; // Boden reicht nach hinten
    const mk = (name, geo, mat, items, place) => {
      if (!items.length) return null;
      const mesh = new THREE.InstancedMesh(this.track(geo), this.track(mat), items.length);
      mesh.castShadow = true; mesh.receiveShadow = true;
      items.forEach(([tx, ty], i) => { place(tx, ty, i, mesh); });
      mesh.instanceMatrix.needsUpdate = true;
      this.group.add(mesh);
      return mesh;
    };
    const set = (mesh, i, x, y, z, sx = 1, sy = 1, sz = 1) => { _p.set(x, y, z); _s.set(sx, sy, sz); _m.compose(_p, _q, _s); mesh.setMatrixAt(i, _m); };
    // Tile (tx,ty) deckt X ∈ [tx, tx+1], Y ∈ [-(ty+1), -ty] ab
    mk('dirt', new THREE.BoxGeometry(1, 1, DEPTH), new THREE.MeshStandardMaterial({ color: 0xb8743a, roughness: 0.95 }), lists.dirt,
      (tx, ty, i, m) => set(m, i, tx + 0.5, -ty - 0.5, 0.5 - DEPTH / 2));
    mk('grass', new THREE.BoxGeometry(1.02, 0.22, DEPTH + 0.04), new THREE.MeshStandardMaterial({ color: 0x5fd13f, roughness: 0.9 }), lists.grass,
      (tx, ty, i, m) => set(m, i, tx + 0.5, -ty - 0.11, 0.5 - DEPTH / 2));
    mk('cave', new THREE.BoxGeometry(1, 1, DEPTH), new THREE.MeshStandardMaterial({ color: 0x6b4a33, roughness: 1 }), lists.cave,
      (tx, ty, i, m) => set(m, i, tx + 0.5, -ty - 0.5, 0.5 - DEPTH / 2));
    this.brickMesh = mk('brick', new THREE.BoxGeometry(0.96, 0.96, 0.96), new THREE.MeshStandardMaterial({ color: 0xb9bbc6, roughness: 0.6 }), lists.brick,
      (tx, ty, i, m) => { set(m, i, tx + 0.5, -ty - 0.5, 0); this.brickSlots.set(`${tx},${ty}`, i); });
    mk('platform', new THREE.BoxGeometry(1, 0.28, 1.4), new THREE.MeshStandardMaterial({ color: 0xd9a060, roughness: 0.8 }), lists.platform,
      (tx, ty, i, m) => set(m, i, tx + 0.5, -ty - 0.14, 0));
    mk('deco', new THREE.SphereGeometry(0.25, 10, 8), new THREE.MeshStandardMaterial({ color: 0x3f9e2f, roughness: 0.9 }), lists.deco,
      (tx, ty, i, m) => set(m, i, tx + 0.5, -ty - 0.8, 0.3));
  }

  /** Block zerbrochen (Stampfsprung): Instanz unsichtbar machen. */
  removeTile(tx, ty) {
    const i = this.brickSlots.get(`${tx},${ty}`);
    if (i === undefined || !this.brickMesh) return;
    _m.makeScale(0, 0, 0);
    this.brickMesh.setMatrixAt(i, _m);
    this.brickMesh.instanceMatrix.needsUpdate = true;
    this.brickSlots.delete(`${tx},${ty}`);
  }

  update(dt, t) {
    // Sonne (und ihr Schattenbereich) wandert mit der Kamera mit
    const tg = this.view.target;
    this.sun.target.position.set(tg.x, tg.y, 0);
    this.sun.position.copy(tg).add(this.sunOffset);
  }

  dispose() {
    this.group.parent?.remove(this.group);
    for (const d of this.disposables) d.dispose?.();
    this.disposables.length = 0;
    this.sun.shadow.map?.dispose();
  }
}
