// Modelle aus der Modell-Registry (models/kinds/*_w2.js: Palme, Kaktus, Säulenruine, Sandsteinbogen, Pyramide,
// Blütenbaum, Panzerwagen, Sandblock …; Welt 3: Tanne, Schneemann, Iglu, Eiszapfen, Koralle, Wrack, Hecken-Hase …)
// als statische Kulisse in die Karte „einbacken“: Die Geometrie jedes
// vertexgefärbten Meshes (auch Instanz-Puffer) wird mit der Weltlage in die verschmolzenen Karten-Kacheln gegeben
// (view.addStatic → MapBatcher) – gleiche Optik wie in den Leveln, aber keine eigenen Zeichenaufrufe je Requisite.
// Unbeleuchtete Teile (MeshBasicMaterial, z. B. Glanzpunkte) landen im Material 'glow'; Durchsichtiges, Sprites und
// reine Texturflächen werden ausgelassen. Fehlt ein Modell (Platzhalter), liefert bakeModel null → eigene Geometrie.

import * as THREE from 'three';
import { getModel, hasModel } from '../models/index.js';

const _m = new THREE.Matrix4(), _i = new THREE.Matrix4(), _c = new THREE.Color();

/**
 * @param {(g: THREE.BufferGeometry, o: object) => void} addStatic view.addStatic
 * @param {string} name Modellname
 * @param {object} opts Modell-Optionen
 * @param {number[]} pos Fußpunkt [x, y, z]
 * @param {number} yaw Drehung um +Y (Modelle blicken bei 0 nach +X)
 * @param {number} scale
 * @param {number} [dt] Zeitschritt für das einmalige update vor dem Einbacken (Welt 6: Modelle, die einem Zustand gedämpft
 *   folgen, z. B. 'riesen_frageblock' { grow: 1 } – mit dt > 0 stehen sie schon in der Endlage)
 * @returns {{ tris: number } | null}
 */
export function bakeModel(addStatic, name, opts, pos, yaw = 0, scale = 1, state = null, dt = 0) {
  if (!hasModel(name)) return null;
  let model;
  try { model = getModel(name, opts ?? {}); } catch (err) { console.warn(`[Weltkarte] Modell ${name}:`, err); return null; }
  if (!model?.root || model.placeholder) return null;
  if (state) model.update?.(dt, state);
  const root = model.root;
  root.position.set(pos[0], pos[1], pos[2]);
  root.rotation.set(0, yaw, 0);
  root.scale.setScalar(scale);
  root.updateMatrixWorld(true);
  let tris = 0;
  root.traverseVisible((o) => {
    if (!o.isMesh || o.isSprite) return;
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!mat || mat.transparent || (mat.map && !mat.vertexColors)) return;
    const glow = mat.isMeshBasicMaterial;
    const n = o.isInstancedMesh ? o.count : 1;
    for (let k = 0; k < n; k++) {
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const a of Object.keys(g.attributes)) if (a !== 'position' && a !== 'normal' && a !== 'color') g.deleteAttribute(a);
      if (!g.attributes.normal) g.computeVertexNormals();
      // Farbe: Vertexfarben × Materialfarbe (bzw. nur Materialfarbe)
      const mc = mat.color ?? _c.set(0xffffff);
      const cnt = g.attributes.position.count;
      let col = g.attributes.color;
      if (!col || !mat.vertexColors) {
        col = new THREE.BufferAttribute(new Float32Array(cnt * 3), 3);
        for (let v = 0; v < cnt; v++) col.setXYZ(v, mc.r, mc.g, mc.b);
        g.setAttribute('color', col);
      } else if (mc.r !== 1 || mc.g !== 1 || mc.b !== 1) {
        for (let v = 0; v < cnt; v++) col.setXYZ(v, col.getX(v) * mc.r, col.getY(v) * mc.g, col.getZ(v) * mc.b);
      }
      if (o.isInstancedMesh) { o.getMatrixAt(k, _i); _m.multiplyMatrices(o.matrixWorld, _i); g.applyMatrix4(_m); }
      else g.applyMatrix4(o.matrixWorld);
      tris += cnt / 3;
      addStatic(g, { material: glow ? 'glow' : 'world', castShadow: !glow && o.castShadow !== false });
    }
  });
  model.dispose?.();
  return { tris };
}

/**
 * Requisiten-Art (map.props) → Modell der Registry: [name, opts, yaw-Korrektur, scale] oder null.
 * Vorderseite der Modelle +X, die der Karten-Requisiten +Z (Kamera) → yaw − π/2.
 */
export function propModel(it) {
  const s = it.size;
  switch (it.kind) {
    case 'palm': return ['palme', { height: (s ?? 5) * 0.95, lean: Math.min(0.35, Math.max(0.06, (it.lean ?? 0.8) / (s ?? 5))) }, 0, 1];
    case 'cactus': return ['kaktus', { variant: it.variant ?? 'saeule', size: (s ?? 2.2) / 2.3 }, 0, 1];
    case 'column': return ['ruine_saeule', { height: s ?? 4, broken: !!it.broken }, 0, 1];
    case 'arch': return ['sandsteinbogen', { width: (it.width ?? 3.4) + 0.9, height: s ?? 4, thickness: 1.1 }, Math.PI / 2, 1];
    case 'pyramid': return ['pyramide', { size: s?.[0] ?? 16, steps: it.steps ?? 6 }, -Math.PI / 2, 1];
    case 'pinktree': return ['bluetenbaum', { size: s ?? 4 }, 0, 1];
    case 'tank': return ['panzer_fahrzeug', { length: 6.4, width: 3.4, deck: 1.6, color: it.color ?? 'oliv' }, 0, s ?? 1];
    case 'bigtank': return ['panzer_fahrzeug', { length: 8, width: 4, deck: 2, color: 'rot' }, 0, 1];
    // Welt 3 (models/kinds/*_w3.js)
    case 'fir': return ['tanne_schnee', { size: s ?? 3.5 }, 0, 1];
    case 'snowman': return ['schneemann', {}, -Math.PI / 2, s ?? 1];
    case 'igloo': return ['iglu', { size: s ?? 3.4 }, -Math.PI / 2, 1];
    case 'icicles': return ['eiszapfen', { length: s ?? 1, count: it.n ?? 3 }, 0, 1];
    case 'snowblock': return ['schneeblock', {}, 0, s ?? 1];
    case 'coral': return ['koralle', { kind: it.variant ?? 'ast' }, 0, s ?? 1];
    case 'wreck': return ['schiffswrack', { size: s ?? 1 }, -Math.PI / 2, 1];
    case 'flower': return ['pastell_blume', {}, 0, s ?? 1];
    case 'hedgebunny': return ['hecken_hase', {}, -Math.PI / 2, s ?? 1];
    case 'barrier': return ['bande', { length: s ?? 4 }, 0, 1];
    case 'trampoline': return ['pilztrampolin', {}, 0, s ?? 1];
    case 'bunny': return ['bunny_small', {}, -Math.PI / 2, s ?? 1];
    case 'snowpillar': return ['schneesaeule', { segments: it.n ?? 4 }, -Math.PI / 2, s ?? 1];
    // Welt 4 (models/kinds/*_w4.js); dunkle Basalt-Nadeln und Kakteen bleiben eigene Geometrie (canyon.js)
    case 'needle': return it.color === 'dark' ? null : ['felsnadel', { height: s ?? 8 }, 0, 1];
    case 'seaarch': return ['canyon_bogen', { width: 7 * (s ?? 1), height: 8 * (s ?? 1), thickness: 2 * (s ?? 1) }, Math.PI / 2, 1];
    case 'tafelberg': return ['tafelberg', { radius: it.radius ?? 4, height: s ?? 6 }, 0, 1];
    case 'cloudisle': return ['wolkeninsel', { size: s ?? 4 }, 0, 1];
    default: return null;
  }
}
