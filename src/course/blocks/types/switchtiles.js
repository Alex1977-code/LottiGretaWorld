// Baustein `switchtiles`: Gruppe von Kipp-Schaltfeldern (Bauplan 1-5). Betreten färbt ein Feld um (blau → gold);
// sind alle an, löst die Gruppe einmal ihr Ereignis aus (onAll) und bleibt an. toggle: true = Wechselschalter:
// jedes Betreten schaltet um (auch zurück). Fortschritts-Anzeige: Perlen-Tafel über der Gruppe (blickt zur Kamera).
// Felder können auf einer fahrenden Plattform liegen (on: Id einer mover-Plattform oder platform: eigene).
//
// Parameter:
//   pos:      [x, y, z]   Mitte der Gruppe auf Bodenhöhe (bei grid), y = Oberkante des Untergrunds
//   grid:     [Spalten, Reihen]  (Standard [3, 3]) mit spacing (Standard 1.6 m)  – oder –
//   tiles:    [[x, y, z], …]     einzelne Felder (Fußpunkt)
//   toggle:   false       true → jedes Betreten schaltet um (Wechselschalter)
//   onAll:    Aktion       (entities/gimmick.js) z. B. { reveal: 'weg1' } (Weg erscheint), { star: 2 },
//                          { spawn: { kind: 'chest', … } }, { start: 'lift1' } (Plattform startet), { drop: 'p9' }
//   at:       [x, y, z]   Ort für star/spawn/power des Ereignisses (Standard: Mitte der Gruppe, 1 m darüber)
//   indicator: true | [x, y, z] | false   Fortschritts-Tafel (Standard 3,2 m über der Mitte)
//   on:       Id einer mover-Plattform (blocks/types/mover.js mit id; muss vorher in segments stehen) – die
//             Felder fahren mit (Positionen in Weltkoordinaten zur Startlage der Plattform)
//   platform: { path, size, speed, color, mode, wait, … } eigene fahrende Plattform (mover); ohne pos liegen die
//             Felder auf ihrer Oberseite
//   id:       Name → level.named: { tiles, done, count, reset() }
// Kollision: je Feld ein flacher Quader (0,16 m, wird automatisch erstiegen), owner = Feld.
// Beispiele:
//   { type: 'switchtiles', pos: [0, 1, -20], grid: [3, 2], onAll: { reveal: 'weg1' } }
//   { type: 'switchtiles', toggle: true, grid: [2, 2], platform: { path: [[0, 4, -60], [8, 4, -60]], size: [5, 0.5, 5] },
//     onAll: { star: 2 } }
// Modell 'switch_tile' (state off/on).

import * as THREE from 'three';
import { v3, addObject } from '../kit.js';
import { buildMover } from './mover.js';
import { runAction, visDt } from '../../entities/gimmick.js';
import { getModel } from '../../models/index.js';

const HALF = 0.7, H = 0.16;

export function buildSwitchTiles(level, spec) {
  let carrier = null;
  if (spec.platform) carrier = buildMover(level, { ...spec.platform, id: spec.platform.id });
  let base = spec.pos ? v3(spec.pos) : null;
  if (!base && carrier) { const sz = spec.platform.size ?? [3, 0.5, 3]; base = { x: carrier.origin.x, y: carrier.origin.y + sz[1], z: carrier.origin.z }; }
  base = base ?? { x: 0, y: 0, z: 0 };
  let spots = spec.tiles;
  if (!spots) {
    const [cols, rows] = spec.grid ?? [3, 3];
    const sp = spec.spacing ?? 1.6;
    spots = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) spots.push([base.x + (c - (cols - 1) / 2) * sp, base.y, base.z + (r - (rows - 1) / 2) * sp]);
  }
  const group = { tiles: [], done: false, count: 0, toggle: !!spec.toggle, lock: spec.lock !== false };
  for (const s of spots) {
    const t = { group, x: s[0], y: s[1], z: s[2], bx: s[0], by: s[1], bz: s[2], on: false, flipT: 0 };
    t.shape = { type: 'box', min: [t.x - HALF, t.y, t.z - HALF], max: [t.x + HALF, t.y + H, t.z + HALF], owner: t, tag: 'switchtile' };
    t.id = level.world.add(t.shape);
    group.tiles.push(t);
    if (level.view) {
      t.model = getModel('switch_tile');
      t.model.root.position.set(t.x, t.y, t.z);
      t.model.root.traverse((o) => { if (o.isMesh) o.castShadow = false; }); // flach: spart den Schattenpass
      addObject(level, t.model.root, (dt) => { t.model.root.position.set(t.x, t.y, t.z); t.model.update(visDt(level, t, dt), { anim: t.on ? 'on' : 'off' }); });
    }
  }
  const n = group.tiles.length;
  const cx = group.tiles.reduce((a, t) => a + t.x, 0) / n, cz = group.tiles.reduce((a, t) => a + t.z, 0) / n;
  const top = Math.max(...group.tiles.map((t) => t.y));
  const at = spec.at ? v3(spec.at) : { x: cx, y: top, z: cz };

  // Fortschritts-Tafel
  let board = null;
  if (spec.indicator !== false && level.view) board = makeBoard(level, n, Array.isArray(spec.indicator) ? v3(spec.indicator) : { x: cx, y: top + 3.2, z: cz });
  board?.draw(0, false);

  const complete = () => {
    group.done = true;
    level.sfx('key');
    level.effects?.sparks({ x: at.x, y: at.y + 1, z: at.z }, 20);
    runAction(level, spec.onAll, { pos: [at.x, at.y, at.z], source: group });
  };
  const stepOn = (t) => {
    if (group.done && group.lock) return;
    if (group.toggle) t.on = !t.on;
    else if (!t.on) t.on = true;
    else return;
    level.sfx('switch');
    level.effects?.sparks({ x: t.x, y: t.y + 0.3, z: t.z }, 5);
    group.count = group.tiles.filter((q) => q.on).length;
    board?.draw(group.count, false);
    if (group.count === n && !group.done) { complete(); board?.draw(n, true); }
  };
  group.reset = () => { for (const t of group.tiles) t.on = false; group.count = 0; group.done = false; board?.draw(0, false); };
  if (spec.id) level.named.set(spec.id, group);

  let prev = null, attached = carrier, resolved = !!carrier || !spec.on;
  level.onStep(() => {
    if (!resolved) {
      const h = level.named.get(spec.on);
      if (h?.pm) attached = h; else console.warn(`[switchtiles] Plattform ${spec.on} fehlt`);
      resolved = true;
    }
    if (attached) {
      const ox = attached.pm.pos.x - attached.origin.x, oy = attached.pm.pos.y - attached.origin.y, oz = attached.pm.pos.z - attached.origin.z;
      for (const t of group.tiles) {
        t.x = t.bx + ox; t.y = t.by + oy; t.z = t.bz + oz;
        const s = t.shape;
        s.min = [t.x - HALF, t.y, t.z - HALF]; s.max = [t.x + HALF, t.y + H, t.z + HALF];
        s.mover = attached.mover;
        level.world.update(t.id);
      }
      if (board) board.offset.set(ox, oy, oz);
    }
    const p = level.player;
    const cur = p && !p.dead && p.mode === 'ground' && p.ground?.owner?.group === group ? p.ground.owner : null;
    if (cur && cur !== prev) stepOn(cur);
    prev = cur;
  });
  return group;
}

/** Perlen-Tafel als Sprite (blickt immer zur Kamera): n Perlen, gold = an. */
function makeBoard(level, n, pos) {
  const cols = Math.min(n, 8), rows = Math.ceil(n / 8);
  const cw = 44, W = cols * cw + 28, Hh = rows * cw + 28;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = Hh;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  const k = 0.012;
  sprite.scale.set(W * k, Hh * k, 1);
  sprite.position.set(pos.x, pos.y, pos.z);
  sprite.renderOrder = 3;
  const offset = new THREE.Vector3();
  let flash = 0;
  addObject(level, sprite, (dt, t) => {
    sprite.position.set(pos.x + offset.x, pos.y + offset.y + Math.sin(t * 2) * 0.06, pos.z + offset.z);
    if (flash > 0) { flash -= dt; const s = 1 + Math.sin(flash * 18) * 0.06 * Math.min(1, flash); sprite.scale.set(W * k * s, Hh * k * s, 1); }
  });
  return {
    offset,
    draw(count, done) {
      const g = canvas.getContext('2d');
      g.clearRect(0, 0, W, Hh);
      g.fillStyle = done ? 'rgba(255,214,58,0.85)' : 'rgba(26,24,48,0.7)';
      g.beginPath(); g.roundRect(4, 4, W - 8, Hh - 8, 20); g.fill();
      g.lineWidth = 4; g.strokeStyle = '#ffffff'; g.stroke();
      for (let i = 0; i < n; i++) {
        const c = i % 8, r = Math.floor(i / 8);
        const x = 14 + c * cw + cw / 2, y = 14 + r * cw + cw / 2;
        g.beginPath(); g.arc(x, y, 15, 0, Math.PI * 2);
        if (i < count) { g.fillStyle = '#ffc21a'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#fff6c0'; g.stroke(); }
        else { g.fillStyle = '#3a6ad8'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#ffffff'; g.stroke(); }
      }
      tex.needsUpdate = true;
      if (done) flash = 1.5;
    },
  };
}

export const TYPES = { switchtiles: buildSwitchTiles };
