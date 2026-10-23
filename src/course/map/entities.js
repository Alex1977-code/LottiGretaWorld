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
 * Gegnergruppe instanziert zeichnen (Welt 4: drei Feuer-Werfer bzw. Lavabrocken): Teile, die bei allen Roamern der
 * Gruppe dieselbe Geometrie und dasselbe Material haben, werden als je eine InstancedMesh gezeichnet; die Einzelteile
 * bleiben im Modell (die Roamer rechnen und animieren weiter, Sichtbarkeitsschalter des Modells gelten), werden aber
 * über ihre Ebenen (layers) nicht mehr gezeichnet. Teile mit eigenem Material je Exemplar (Glühen, Treffer-Blitz …)
 * und Sprites zeichnen sich weiter selbst. Ferne Roamer (> far m vor der Kamera, wie lod.js) und solche außerhalb des
 * Bildes werden nicht instanziert gezeichnet.
 * @returns {{ dispose(): void, parts: number } | null}
 */
export function instanceRoamers(view, roamers, o = {}) {
  if (!view || roamers.length < 2) return null;
  const ents = [];
  for (const e of roamers) {
    if (!e.model?.root) return null;
    const meshes = [];
    let ok = true;
    e.model.root.traverse((m) => { if (m.isSkinnedMesh || (m.isMesh && Array.isArray(m.material))) ok = false; else if (m.isMesh) meshes.push(m); });
    if (!ok || !meshes.length) return null;
    ents.push({ e, meshes });
  }
  const n0 = ents[0].meshes.length;
  if (ents.some(({ meshes }) => meshes.length !== n0)) return null;
  const per = (m) => (m.isInstancedMesh ? m.count : 1);
  const parts = [];
  const hidden = [];
  for (let k = 0; k < n0; k++) {
    const m0 = ents[0].meshes[k];
    if (!ents.every(({ meshes }) => meshes[k].geometry === m0.geometry && meshes[k].material === m0.material && per(meshes[k]) === per(m0))) continue;
    const im = new THREE.InstancedMesh(m0.geometry, m0.material, ents.length * per(m0));
    im.castShadow = m0.castShadow; im.receiveShadow = m0.receiveShadow;
    im.frustumCulled = false;
    im.count = 0;
    im.visible = false;
    im.name = 'instanzen:gegnergruppe';
    view.three.add(im);
    for (const { meshes } of ents) { hidden.push([meshes[k], meshes[k].layers.mask]); meshes[k].layers.disableAll(); }
    parts.push({ k, im, n: per(m0) });
  }
  if (!parts.length) return null;
  const far = o.far ?? 90;
  const vis = (m, root) => { for (let q = m; q && q !== root.parent; q = q.parent) if (!q.visible) return false; return true; };
  const M = new THREE.Matrix4(), Mi = new THREE.Matrix4(), F = new THREE.Frustum(), S = new THREE.Sphere();
  const off = view.onFrame(() => {
    const cam = view.camera;
    cam.updateMatrixWorld();
    F.setFromProjectionMatrix(M.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const fill = parts.map(() => 0);
    for (const { e, meshes } of ents) {
      const root = e.model?.root;
      if (!root) continue;
      S.center.set(e.pos.x, e.pos.y + 0.8, e.pos.z); S.radius = o.radius ?? 2;
      if (!(e.alive && !e.removed && root.parent && cam.position.distanceTo(S.center) - S.radius < far && F.intersectsSphere(S))) continue;
      root.updateMatrixWorld(true);
      parts.forEach(({ k, im, n }, pi) => {
        const m = meshes[k];
        if (!vis(m, root)) return;
        if (m.isInstancedMesh) {
          for (let j = 0; j < Math.min(m.count, n); j++) { m.getMatrixAt(j, Mi); im.setMatrixAt(fill[pi]++, M.multiplyMatrices(m.matrixWorld, Mi)); }
        } else im.setMatrixAt(fill[pi]++, m.matrixWorld);
      });
    }
    parts.forEach(({ im }, pi) => { im.count = fill[pi]; im.visible = fill[pi] > 0; im.instanceMatrix.needsUpdate = true; });
  });
  return {
    parts: parts.length,
    dispose() {
      off();
      for (const { im } of parts) { im.parent?.remove(im); im.dispose(); }
      for (const [m, mask] of hidden) m.layers.mask = mask;
    },
  };
}
