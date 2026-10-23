// Gemeinsame Grundlage der Welt-2-Gegner (Präzisierung Gegner Welt 2). Erweitert Enemy (Welt 1) additiv:
//
//   - Ziel ist immer die **nächste Figur**: level.nearestPlayer?.(pos) ?? level.player (Spiegelfrucht-Klone;
//     ohne Klone wie bisher die Heldin). Alle Ziel-Hilfen von Enemy (player, playerActive, playerDist, canSee,
//     toPlayer, facePlayer, chase, poundLandedNear) laufen darüber.
//   - Lava und Absturz besiegen (markDefeated → level.onEnemyDefeated zählt, z. B. Arena 2-A: Großrollpilze in
//     die Lava stoßen), statt nur zu verschwinden.
//   - Starke Treffer: STRONG = cannon (Kanonen-Helm-Kugel), bomb, mega, star.
//   - Rutschen: rutscht eine Figur schnell (state 'slide', ≥ 2 m/s) seitlich in einen Welt-2-Gegner, ist das ein
//     Angriff: onHit('slide', figur) statt Treffer der Figur (Standard: der Gegner fliegt weg). Unverwundbare
//     (Wuschel), Stachel-/Feuerköpfe auf Kopfhöhe und Fallen überschreiben das.
//   - Hilfen: figures(level), nearestFigure(level, pos), playerJumped(p), localOffset() (Abwurfpunkte aus den
//     Modellen, einmal vermessen → deterministisch), toWorld(), sharedSlot() (eine Instanz-Gruppe je Level für
//     Kolonnen aus createInstanced: Marschblöcke, Wuschel).
//   - Welt 4 (additiv): modelInstances(level, name, opts, n) zeichnet n Kopien eines Registry-Modells als Instanzen
//     (gleiche Pose für alle; z. B. Flatterkäfer-Rad: 8 Käfer ≈ 8 Zeichenaufrufe statt ≈ 70).
//   - Schatten-Stufen (nur Darstellung): initShadows(keep) lässt nur die keep größten Teile des Modells einen
//     Sonnenschatten werfen (Blob bleibt immer); weiter als SHADOW_NEAR m (bzw. 1,35 × Kameraabstand) vom Blickziel
//     der Kamera wirft das Modell keinen Sonnenschatten (spart Zeichenaufrufe im Schattenpass ±22 m).
//
// Wie Enemy: state, stateT, defeated, dir; Konter-Standard: draufspringen → platt, seitlich → Treffer.

import * as THREE from 'three';
import { Enemy, spawnLoot, wrapAngle, clamp } from './Enemy.js';
import { createInstanced } from '../models/lib/instanced.js';
import { getModel } from '../models/index.js';

export { spawnLoot, wrapAngle, clamp };

/** Starke Treffer (besiegen auch zähe Gegner bzw. mehrere Trefferpunkte auf einmal). */
export const STRONG = new Set(['cannon', 'bomb', 'mega', 'star']);
/** Sprung-Zustände der Figur (Hüpfmaus springt mit). */
export const JUMP_STATES = new Set(['jump', 'jump2', 'jump3', 'backflip', 'sideflip', 'longjump', 'walljump']);

/** Alle Figuren des Levels (mit Klonen level.players, sonst [level.player]). */
export function figures(level) {
  if (level.players?.length) return level.players;
  return level.player ? [level.player] : [];
}

/** Nächste Figur zu pos – funktioniert mit und ohne Klon-Motor. */
export function nearestFigure(level, pos) {
  return level.nearestPlayer?.(pos) ?? level.player ?? null;
}

/** Figur aktiv (lebt, nicht im Skript-Modus, kein entfernter Klon)? */
export function activeFigure(p) {
  return !!p && !p.dead && p.mode !== 'script' && !p.removedFigure;
}

/** Hat die Figur in diesem Schritt abgesprungen? (Zustandswechsel in einen Sprung, steigt) */
export function playerJumped(p) {
  return activeFigure(p) && JUMP_STATES.has(p.state) && p.stateTime < 1e-6 && p.vel.y > 3;
}

/** Lokaler Punkt (x vorn, y oben, z rechts) → Weltpunkt bei Gier yaw. */
export function toWorld(pos, yaw, lx, ly, lz, out = {}) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  out.x = pos.x + lx * c + lz * s;
  out.y = pos.y + ly;
  out.z = pos.z - lx * s + lz * c;
  return out;
}

const OFFSETS = new Map();
/**
 * Lokaler Versatz eines Modellpunkts (z. B. feuer_werfer.hand() bei throw-progress 0,5), einmal je Schlüssel
 * vermessen: Pose mit großen Zeitschritten einschwingen lassen, Weltpunkt ohne Lage/Gier der Wurzel ablesen. So hängt
 * die Simulation nicht vom Zeichnen ab (deterministisch, auch bei step(n) ohne Bild). fallback ohne Modell.
 */
export function localOffset(key, model, state, getter, fallback) {
  if (OFFSETS.has(key)) return OFFSETS.get(key);
  let v = fallback;
  if (model && typeof getter === 'function') {
    try {
      const r = model.root;
      const p0 = r.position.clone(), ry = r.rotation.y, sc = r.scale.clone();
      r.position.set(0, 0, 0); r.rotation.y = 0; r.scale.set(1, 1, 1);
      for (let i = 0; i < 8; i++) model.update(0.5, state);
      const w = getter(new THREE.Vector3());
      r.position.copy(p0); r.rotation.y = ry; r.scale.copy(sc);
      if (w && Number.isFinite(w.x)) v = { x: w.x, y: w.y, z: w.z };
    } catch (_) { /* Rückfall */ }
  }
  OFFSETS.set(key, v);
  return v;
}

// ------------------------------------------------------------------ Welt 3 (additiv): Blick, Wasser

/**
 * Schaut die Figur fig zum Punkt pos (innerhalb ±deg Grad um ihre Blickrichtung)? Nutzt level.isFacing (Motor), sonst
 * eigene Rechnung über fig.yaw (Spuk: folgt nur, wenn man wegschaut).
 */
export function looksAt(level, fig, pos, deg = 70) {
  if (!fig) return false;
  if (typeof level.isFacing === 'function') {
    const r = level.isFacing(fig, pos, deg);
    if (typeof r === 'boolean') return r;
  }
  const dx = pos.x - fig.pos.x, dz = pos.z - fig.pos.z, d = Math.hypot(dx, dz);
  if (d < 1e-4) return true;
  const fx = Math.cos(fig.yaw), fz = -Math.sin(fig.yaw);
  return (dx * fx + dz * fz) / d >= Math.cos((deg * Math.PI) / 180);
}

/**
 * Wasserform an (x, z) um die Höhe y (Punkt im Wasser oder bis `below` m darüber) → { shape, top, bottom } | null.
 * Folgt steigendem/fallendem Wasser (Motor ändert die Form; jede Abfrage liest den aktuellen Stand).
 */
export function waterAt(level, x, y, z, below = 0.6) {
  let best = null;
  for (const s of level.world.overlapAABB({ x, y: y - below / 2, z }, { x: 0.05, y: below / 2 + 0.6, z: 0.05 })) {
    if (!s.water) continue;
    if (!best || s.top > best.top) best = s;
  }
  return best ? { shape: best, top: best.top, bottom: best.bot ?? best.top - 1 } : null;
}

/** Sonnenschatten nur bis zu diesem Abstand (m) vom Blickziel der Kamera. */
export const SHADOW_NEAR = 18;

/** Schatten werfen? (Abstand zum Blickziel der Kamera, waagerecht) */
export function shadowNear(level, x, z, extra = 0) {
  const rig = level.view?.rig;
  if (!rig?.target) return true;
  const r = Math.max(SHADOW_NEAR, (rig.distNow ?? 13) * 1.35) + extra;
  return Math.hypot(x - rig.target.x, z - rig.target.z) < r;
}

export class EnemyW2 extends Enemy {
  constructor(level, spec = {}, kind = 'enemy') {
    super(level, spec, kind);
    this.fellOut = false;
    this.shadowMeshes = null;
    this.shadowOn = true;
  }

  /** Nur die keep größten Modellteile werfen Sonnenschatten (Rest: nur Blob). */
  initShadows(keep = 1) {
    if (!this.model) return;
    const list = [];
    this.model.root.traverse((o) => { if (o.isMesh && o.castShadow) list.push(o); });
    const size = (o) => o.geometry?.attributes?.position?.count ?? 0;
    list.sort((a, b) => size(b) - size(a));
    for (const m of list.slice(keep)) m.castShadow = false;
    this.shadowMeshes = list.slice(0, keep);
  }

  render(dt, t) {
    super.render(dt, t);
    const list = this.shadowMeshes;
    if (!list?.length) return;
    const on = shadowNear(this.level, this.pos.x, this.pos.z);
    if (on !== this.shadowOn) { this.shadowOn = on; for (const m of list) m.castShadow = on; }
  }

  // ------------------------------------------------------------------ Ziel: nächste Figur

  get player() { return nearestFigure(this.level, this.pos); }

  playerActive() { return activeFigure(this.player); }

  playerDist() {
    const p = this.player;
    if (!p) return Infinity;
    return Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
  }

  canSee(range, dy = 2.5) {
    const p = this.player;
    if (!activeFigure(p)) return false;
    return Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < range && Math.abs(p.pos.y - this.pos.y) < dy;
  }

  toPlayer(out = {}) {
    const p = this.player;
    const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z, d = Math.hypot(dx, dz) || 1e-6;
    out.x = dx / d; out.z = dz / d; out.d = d;
    return out;
  }

  /** Stampfattacke irgendeiner Figur gerade neben diesem Gegner gelandet? → Figur oder null. */
  poundLandedNear(radius) {
    for (const p of figures(this.level)) {
      if (!p || p.dead || p.state !== 'land' || !p.poundLanded || p.stateTime > 0.004) continue;
      if (Math.abs(p.pos.y - this.pos.y) > 1.2) continue;
      if (this.distanceTo(p.pos.x, this.pos.y + this.half.y, p.pos.z) < radius) return p;
    }
    return null;
  }

  /** Figur rutscht schnell seitlich hinein → Angriff (true = erledigt, Rückgabe 'none'). */
  slideAttack(player, contact) {
    if (this.defeated || contact.fromAbove || contact.pound) return false;
    if (player.state !== 'slide' || player.hSpeed() < 2) return false;
    this.onHit('slide', player);
    return true;
  }

  onPlayer(player, contact) {
    if (this.slideAttack(player, contact)) return 'none';
    return super.onPlayer(player, contact);
  }

  /** Blickrichtung als Einheitsvektor. */
  facing(out = {}) { out.x = Math.cos(this.yaw); out.z = -Math.sin(this.yaw); return out; }

  // ------------------------------------------------------------------ Lava und Absturz besiegen

  moveWithGravity(dt, opts = {}) {
    const res = super.moveWithGravity(dt, opts);
    if (this.removed) { if (!this.defeated) this.fallOut('fall'); return res; }
    this.checkLava();
    return res;
  }

  /** In einer Lava-Form (kill: 'lava') → verglüht. true = erledigt. */
  checkLava() {
    if (this.removed || this.fellOut) return false;
    const c = this.center();
    for (const s of this.level.world.overlapAABB(c, this.half)) {
      if (s.kill === 'lava' && this.pos.y < s.top + 0.02) { this.fallOut('lava'); return true; }
    }
    return false;
  }

  /** Absturz/Lava: zählt als besiegt (Arena), Effekt, weg. */
  fallOut(cause) {
    if (this.fellOut) return;
    this.fellOut = true;
    if (cause === 'lava') {
      this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 0.3, z: this.pos.z }, 12);
      this.level.effects?.dust(this.pos, 6, 1.2);
      this.level.sfx('burn');
    }
    if (this.carrier) { const p = this.carrier; this.carrier = null; if (p.holding === this) p.holding = null; }
    this.touch = false;
    this.markDefeated();
    this.kill();
  }
}

// ------------------------------------------------------------------ Gemeinsame Instanz-Gruppen (Kolonnen)

const SHARED = new WeakMap();

/**
 * Eine createInstanced-Gruppe je Level und Art (z. B. alle Marschblöcke des Levels: 5 Zeichenaufrufe statt 5 je
 * Block). alloc() → { set(pos, yaw, scale, state), state(st), release() } oder null (ohne Darstellung).
 * Weitere Gruppen werden angelegt, wenn eine voll ist (chunk Plätze je Gruppe).
 */
export function sharedSlot(level, name, opts = {}, chunk = 48) {
  if (!level.view) return null;
  let byName = SHARED.get(level);
  if (!byName) { byName = new Map(); SHARED.set(level, byName); }
  let groups = byName.get(name);
  if (!groups) { groups = []; byName.set(name, groups); }
  let g = groups.find((x) => x.free.length > 0);
  if (!g) {
    const inst = createInstanced(name, chunk, opts);
    const free = [];
    for (let i = chunk - 1; i >= 0; i--) free.push(i);
    g = { inst, free, used: 0, off: null, pos: [], shadow: true };
    const view = level.view;
    const casters = inst.meshes.filter((m) => m.castShadow);
    const gr = g;
    view.add(inst.root, (dt) => {
      // Gruppe ganz weit weg: nicht zeichnen; außerhalb der Schattenreichweite: kein Sonnenschatten
      let near = false, vis = false;
      for (const p of gr.pos) {
        if (!p) continue;
        if (!near && shadowNear(level, p.x, p.z)) near = true;
        if (!vis && shadowNear(level, p.x, p.z, 22)) vis = true;
        if (near) break;
      }
      inst.root.visible = vis;
      if (near !== gr.shadow) { gr.shadow = near; for (const m of casters) m.castShadow = near; }
      if (vis) inst.update(dt);
    });
    g.off = () => { view.remove(inst.root); inst.dispose(); };
    groups.push(g);
  }
  const i = g.free.pop();
  g.used++;
  const inst = g.inst;
  return {
    index: i,
    inst,
    set(pos, yaw = 0, scale = 1, state = 'idle') { g.pos[i] = pos; inst.setAt(i, pos, yaw, scale, state); },
    state(st) { inst.setState(i, st); },
    getState() { return inst.getState(i); },
    color(c) { inst.setColor?.(i, c); },
    release() {
      inst.setState(i, 'hidden');
      g.pos[i] = null;
      g.free.push(i);
      g.used--;
      if (g.used <= 0) {
        g.off();
        const k = groups.indexOf(g);
        if (k >= 0) groups.splice(k, 1);
      }
    },
  };
}

// ------------------------------------------------------------------ Welt 4 (additiv): Modell-Instanzen

const _mi = new THREE.Matrix4(), _mj = new THREE.Matrix4(), _mq = new THREE.Quaternion(), _mp = new THREE.Vector3(), _ms = new THREE.Vector3();
const _Y = new THREE.Vector3(0, 1, 0);
const ZERO_M = new THREE.Matrix4().makeScale(0, 0, 0);

/**
 * n Kopien eines Registry-Modells als Instanzen (eine Vorlage wird animiert, alle Kopien zeigen dieselbe Pose).
 * Jedes Mesh der Vorlage wird zu einem InstancedMesh (Instanz-Meshes der Vorlage, z. B. Beine, werden aufgefächert).
 * → { group, set(i, pos, yaw | Quaternion, scale), hide(i), update(dt, state), dispose(), count } oder null ohne Ansicht.
 * Die Gruppe hängt an der Ansicht; update() je Bild aufrufen (z. B. in render()).
 */
export function modelInstances(level, name, opts, n, castShadow = 1) {
  if (!level.view) return null;
  const tpl = getModel(name, opts);
  const root = tpl.root;
  root.position.set(0, 0, 0); root.rotation.set(0, 0, 0); root.scale.set(1, 1, 1);
  const parts = [];
  root.traverse((o) => { if (o.isMesh) parts.push(o); });
  const group = new THREE.Group();
  group.name = `instanzen:${name}`;
  let shadowLeft = castShadow;
  const list = parts.map((src) => {
    const per = src.isInstancedMesh ? src.count : 1;
    const im = new THREE.InstancedMesh(src.geometry, src.material, Math.max(1, n * per));
    im.frustumCulled = false;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.castShadow = !!src.castShadow && shadowLeft-- > 0;
    im.receiveShadow = !!src.receiveShadow;
    im.renderOrder = src.renderOrder;
    for (let i = 0; i < n * per; i++) im.setMatrixAt(i, ZERO_M);
    group.add(im);
    return { src, im, per };
  });
  const slots = Array.from({ length: n }, () => ({ on: false, m: new THREE.Matrix4(), x: 0, z: 0 }));
  const casters = list.filter((p) => p.im.castShadow).map((p) => p.im);
  let shadowOn = true;
  level.view.add(group);
  const api = {
    group, count: n, template: tpl,
    set(i, pos, yaw = 0, scale = 1) {
      const s = slots[i];
      if (!s) return;
      if (yaw && yaw.isQuaternion) _mq.copy(yaw); else _mq.setFromAxisAngle(_Y, Number(yaw) || 0);
      s.m.compose(_mp.set(pos.x, pos.y, pos.z), _mq, _ms.setScalar(scale));
      s.on = true; s.x = pos.x; s.z = pos.z;
    },
    hide(i) { if (slots[i]) slots[i].on = false; },
    update(dt, state) {
      // ganz weit weg: nicht zeichnen; außerhalb der Schattenreichweite: kein Sonnenschatten (wie sharedSlot)
      let near = false, vis = false;
      for (const s of slots) {
        if (!s.on) continue;
        if (!vis && shadowNear(level, s.x, s.z, 22)) vis = true;
        if (!near && shadowNear(level, s.x, s.z)) near = true;
        if (near) break;
      }
      group.visible = vis;
      if (near !== shadowOn) { shadowOn = near; for (const m of casters) m.castShadow = near; }
      if (!vis) return;
      tpl.update(dt, state);
      root.updateMatrixWorld(true);
      for (const { src, im, per } of list) {
        let vis = src.visible;
        for (let o = src.parent; vis && o && o !== root; o = o.parent) vis = o.visible;
        for (let i = 0; i < n; i++) {
          const s = slots[i];
          for (let j = 0; j < per; j++) {
            if (!s.on || !vis) { im.setMatrixAt(i * per + j, ZERO_M); continue; }
            _mi.multiplyMatrices(s.m, src.matrixWorld);
            if (src.isInstancedMesh) { src.getMatrixAt(j, _mj); _mi.multiply(_mj); }
            im.setMatrixAt(i * per + j, _mi);
          }
        }
        im.instanceMatrix.needsUpdate = true;
      }
    },
    dispose() {
      level.view?.remove(group);
      for (const { im } of list) im.dispose();
      tpl.dispose?.();
    },
  };
  return api;
}
