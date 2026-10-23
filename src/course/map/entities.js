// Entitäten der Kurs-Weltkarte (eigene Klassen, nicht in der Entitäten-Registry – sie gehören nur zur Karte):
//   MapRoamer  wandernde Gegnerfigur (z. B. Rammbock-Bulle für 1-A): läuft auf einem Wegstück hin und her (from/to)
//              oder im Kreis (circle: [x, z, r], Welt 2: Großrollpilze auf der Lava-Felsinsel), schaut die Heldin an,
//              wenn sie näher kommt; Berührung → onTouch(roamer) (startet das Level, wenn frei).
//              Fehlt das Modell (model) noch, nimmt sie fallback (z. B. 'pilzling', vergrößert um fallbackScale)
//              bzw. – Welt 4 – einen Stellvertreter (spec.makeStandIn(): { root, update, dispose }).
//   MapItem    schwebendes Gratis-Power-up (Beerenhaus): Berührung → onCollect(item).
// Beide nutzen CourseEntity (Schwerkraft, Kollision, Modell) und werden mit addEntity() angemeldet.
// instanceRoamers (Welt 4): gleiche Gegnermodelle einer Gruppe als Instanzen zeichnen (weniger Zeichenaufrufe).

import * as THREE from 'three';
import { CourseEntity } from '../entities/CourseEntity.js';
import { getModel, hasModel } from '../models/index.js';

/** Entität ohne Registry anmelden (wie Level.spawn: Liste, Schatten-Blob). */
export function addEntity(level, e) {
  level.entities.push(e);
  if (e.shadow > 0 && level.view) {
    level.view.shadows.add({ pos: e.pos, radius: e.shadow, alive: () => !e.removed, visible: () => e.alive && e.shadowVisible !== false });
  }
  return e;
}

const wrap = (a) => { a %= Math.PI * 2; if (a > Math.PI) a -= Math.PI * 2; else if (a < -Math.PI) a += Math.PI * 2; return a; };

export class MapRoamer extends CourseEntity {
  /**
   * @param {object} level
   * @param {{ from: number[], to: number[], speed?: number, start?: number, dir?: number, model?: string, level: string }} spec
   * @param {(r: MapRoamer) => void} onTouch
   */
  constructor(level, spec, onTouch) {
    const t = spec.start ?? 0;
    let pos;
    if (spec.circle) {
      const [cx, cz, r] = spec.circle;
      const a = t * Math.PI * 2;
      pos = [cx + Math.cos(a) * r, spec.y ?? 1, cz + Math.sin(a) * r];
    } else pos = spec.from.map((v, i) => v + (spec.to[i] - v) * t);
    super(level, { ...spec, pos }, 'map_roamer');
    const hs = spec.half ?? [0.55, 0.8, 0.55];
    this.half.set(hs[0], hs[1], hs[2]);
    this.circle = spec.circle ?? null;
    this.ang = t * Math.PI * 2;
    this.wobble = 0;
    this.shadow = 0.75;
    this.enemy = false;
    this.onTouch = onTouch;
    this.a = spec.from; this.b = spec.to;
    this.dir = spec.dir ?? 1;              // 1 = Richtung to, −1 = Richtung from
    this.speed = spec.speed ?? 2;
    this.anim = 'walk';
    this.pause = 0;
    this.cool = 0;
    const name = spec.model ?? 'rammbock_bulle';
    const useFallback = !hasModel(name) && spec.fallback && hasModel(spec.fallback);
    const standIn = !hasModel(name) && !useFallback && typeof spec.makeStandIn === 'function';
    this.setModel(standIn ? spec.makeStandIn(spec) : getModel(useFallback ? spec.fallback : name, spec.modelOpts ?? {}));
    this.standInUsed = standIn;
    const sc = useFallback ? (spec.fallbackScale ?? 1) : (spec.scale ?? 1);
    if (sc !== 1 && this.model?.root) this.model.root.scale.setScalar(sc);
    // spec.castShadow === false (Welt 3): vielteilige Modelle ohne Sonnenschatten (der Schatten-Blob bleibt) – spart
    // Zeichenaufrufe im Schattenpass
    if (spec.castShadow === false) this.model?.root?.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    this.fallbackUsed = !!useFallback;
  }

  /** Ziel auf dem Kreis: ein Stück voraus in Laufrichtung (mit kleinem Schlenker). */
  circleTarget(dt) {
    const [cx, cz, r] = this.circle;
    this.ang += (this.dir * this.speed * dt) / r;
    this.wobble += dt;
    const rr = r + Math.sin(this.wobble * 0.9 + this.spec.start * 9) * 0.6;
    const a = this.ang + this.dir * 0.35;
    return [cx + Math.cos(a) * rr, 0, cz + Math.sin(a) * rr];
  }

  update(dt) {
    if (this.cool > 0) this.cool -= dt;
    const p = this.level.player;
    const near0 = p && !p.dead && Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < 4.2;
    const target = this.circle ? (this.pause > 0 || near0 ? [this.pos.x, 0, this.pos.z] : this.circleTarget(dt)) : (this.dir > 0 ? this.b : this.a);
    let dx = target[0] - this.pos.x, dz = target[2] - this.pos.z;
    const d = Math.hypot(dx, dz);
    const near = p && !p.dead && Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < 4.2 && Math.abs(p.pos.y - this.pos.y) < 2;
    if (this.pause > 0) {
      this.pause -= dt;
      this.vel.x = this.vel.z = 0;
      this.anim = 'idle';
    } else if (near) {
      // stehen bleiben, schnauben, die Heldin ansehen
      this.vel.x = this.vel.z = 0;
      this.anim = 'idle';
      const want = Math.atan2(-(p.pos.z - this.pos.z), p.pos.x - this.pos.x);
      this.yaw += wrap(want - this.yaw) * Math.min(1, dt * 6);
    } else if (d < 0.15 && !this.circle) {
      this.dir = -this.dir;
      this.pause = 0.7;
    } else if (d < 0.05) {
      this.vel.x = this.vel.z = 0;
    } else {
      dx /= d; dz /= d;
      this.vel.x = dx * this.speed; this.vel.z = dz * this.speed;
      this.anim = 'walk';
      const want = Math.atan2(-dz, dx);
      this.yaw += wrap(want - this.yaw) * Math.min(1, dt * 8);
    }
    this.moveWithGravity(dt);
  }

  modelState() {
    // spec.anims (Welt 3): Modelle ohne Laufanimation (z. B. Zauberkröte) – { walk: 'idle', idle: 'cast' }
    const anim = this.spec.anims?.[this.anim] ?? this.anim;
    return { anim, speed: this.anim === 'walk' ? this.speed : 0, hp: 3 };
  }

  onPlayer(player) {
    if (this.cool <= 0) { this.cool = 0.6; this.onTouch?.(this, player); }
    return 'none';
  }
}

export class MapItem extends CourseEntity {
  /**
   * @param {object} level
   * @param {{ pos: number[], power: string }} spec
   * @param {(item: MapItem, player) => void} onCollect
   */
  constructor(level, spec, onCollect) {
    super(level, spec, 'map_item');
    this.power = spec.power;
    this.half.set(1.0, 0.7, 1.0);       // großzügig: Hinlaufen an den Sockel genügt
    this.shadow = 0;
    this.onCollect = onCollect;
    this.base = this.pos.y;
    this.t = 0;
    this.setModel(getModel(`powerup_${spec.power}`));
  }

  update(dt) { this.t += dt; }

  render(dt, t) {
    if (!this.model) return;
    this.model.root.position.set(this.pos.x, this.base + 0.12 + Math.sin(t * 2.2) * 0.08, this.pos.z);
    this.model.root.rotation.y = t * 1.4;
    this.model.update?.(dt, { anim: 'idle' });
  }

  onPlayer(player) {
    if (!this.alive) return 'none';
    this.onCollect?.(this, player);
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 0.6, z: this.pos.z }, 14);
    this.kill();
    return 'collect';
  }
}

/**
 * Gegnergruppe instanziert zeichnen (Welt 4: drei Feuer-Werfer ≈ 9 statt 27 Zeichenaufrufe): Roamer mit gleichem
 * Modell (gleiche Geometrien/Materialien je Teil) werden als je eine InstancedMesh pro Modellteil gezeichnet. Die
 * Roamer rechnen und animieren ihre Modelle weiter; je Bild werden die Weltmatrizen der Teile übernommen und die
 * Einzelmodelle ausgeblendet (wie instanceEnemies der Welt-3-Level). Sprites der Modelle entfallen dabei.
 * Ferne Roamer (> far m vor der Kamera, wie lod.js) und solche außerhalb des Bildes werden nicht gezeichnet.
 * @returns {{ dispose(): void, groups: number } | null}
 */
export function instanceRoamers(view, roamers, o = {}) {
  if (!view || roamers.length < 2) return null;
  const groups = new Map();
  for (const e of roamers) {
    if (!e.model?.root) continue;
    const meshes = [];
    let ok = true;
    e.model.root.traverse((m) => { if (m.isSkinnedMesh || (m.isMesh && Array.isArray(m.material))) ok = false; else if (m.isMesh) meshes.push(m); });
    if (!ok || !meshes.length) continue;
    const key = meshes.map((m) => `${m.geometry.uuid}:${m.material.uuid}:${m.isInstancedMesh ? m.count : 1}`).join(',');
    if (!groups.has(key)) groups.set(key, { ents: [], parts: meshes.map((m) => ({ geo: m.geometry, mat: m.material, cast: m.castShadow, recv: m.receiveShadow, n: m.isInstancedMesh ? m.count : 1 })) });
    groups.get(key).ents.push({ e, meshes });
  }
  const live = [];
  const added = [];
  for (const G of groups.values()) {
    if (G.ents.length < 2) continue;
    G.inst = G.parts.map((pt) => {
      const im = new THREE.InstancedMesh(pt.geo, pt.mat, G.ents.length * pt.n);
      im.castShadow = pt.cast; im.receiveShadow = pt.recv;
      im.frustumCulled = false;
      im.count = 0;
      im.visible = false;
      im.name = 'instanzen:gegnergruppe';
      view.three.add(im);
      added.push(im);
      return im;
    });
    live.push(G);
  }
  if (!live.length) return null;
  const far = o.far ?? 90;
  const vis = (m, root) => { for (let q = m; q && q !== root; q = q.parent) if (!q.visible) return false; return true; };
  const M = new THREE.Matrix4(), Mi = new THREE.Matrix4(), F = new THREE.Frustum(), S = new THREE.Sphere();
  const off = view.onFrame(() => {
    const cam = view.camera;
    cam.updateMatrixWorld();
    F.setFromProjectionMatrix(M.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    for (const G of live) {
      const fill = G.inst.map(() => 0);
      for (const { e, meshes } of G.ents) {
        const root = e.model?.root;
        if (!root) continue;
        S.center.set(e.pos.x, e.pos.y + 0.8, e.pos.z); S.radius = o.radius ?? 2;
        const show = e.alive && !e.removed && root.parent && cam.position.distanceTo(S.center) - S.radius < far && F.intersectsSphere(S);
        if (show) {
          root.visible = true;
          root.updateMatrixWorld(true);
          meshes.forEach((m, k) => {
            if (!vis(m, root)) return;
            const im = G.inst[k];
            if (m.isInstancedMesh) {
              for (let j = 0; j < Math.min(m.count, G.parts[k].n); j++) { m.getMatrixAt(j, Mi); im.setMatrixAt(fill[k]++, M.multiplyMatrices(m.matrixWorld, Mi)); }
            } else im.setMatrixAt(fill[k]++, m.matrixWorld);
          });
        }
        root.visible = false;
      }
      G.inst.forEach((im, k) => { im.count = fill[k]; im.visible = fill[k] > 0; im.instanceMatrix.needsUpdate = true; });
    }
  });
  return {
    groups: live.length,
    dispose() {
      off();
      for (const im of added) { im.parent?.remove(im); im.dispose(); }
      for (const G of live) for (const { e } of G.ents) if (e.model?.root) e.model.root.visible = true;
    },
  };
}
