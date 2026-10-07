// Wege und Level-Punkte der 3D-Weltkarte.
//  - Wege: flache, leicht gewölbte Bänder entlang Catmull-Rom-Kurven durch die Kantenpunkte,
//    auf das Gelände gelegt. Frei = sandfarben, Geheimweg = golden, gesperrt = dunkel/halbdurchsichtig.
//  - Knoten (NodeMarkers): rundes Podest (gold = frei, grau = gesperrt) mit weißem Rand,
//    Zielfahne (geschafft), goldener Schlüssel (geheimer Ausgang gefunden); aktueller Knoten pulsiert,
//    neu freigeschaltete hüpfen. Die Nummer/Beschriftung bleibt als Phaser-Text über dem Podest.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { saveGame } from '../../systems/SaveGame.js';
import { U } from './terrain.js';
import { setInstance, colored } from './props.js';

export const PATH_LIFT = 0.06;
export const PODIUM_R = 0.8;
export const PODIUM_H = 0.22;

/** Kantenpunkte (Kartenpixel) → Kurvenpunkte in Einheiten (Y wird später vom Gelände geholt). */
export function edgeCurve(points) {
  const v = points.map((p) => new THREE.Vector3(p.x * U, 0, p.y * U));
  return new THREE.CatmullRomCurve3(v, false, 'centripetal', 0.5);
}

/** Abtastpunkte aller Kanten (für Deko-Verteilung: Wege frei halten). */
export function samplePaths(scene) {
  const out = [];
  for (const e of scene.world.edges) {
    const curve = edgeCurve(scene.edgePoints(e));
    const n = Math.max(8, Math.ceil(curve.getLength() / 0.5));
    for (const p of curve.getPoints(n)) out.push({ X: p.x, Z: p.z });
  }
  return out;
}

/**
 * Band-Geometrie für eine Liste von Kanten. Drei Vertizes je Querschnitt (links, Mitte, rechts),
 * Mitte leicht erhöht und heller – wirkt wie ein weicher Sandweg.
 */
function ribbonGeometry(edges, scene, heightAt, { width, colorEdge, colorMid, colorSecretEdge, colorSecretMid }) {
  const pos = [], col = [], idx = [];
  const ce = new THREE.Color(), cm = new THREE.Color();
  for (const e of edges) {
    const secret = e.exit === 'secret';
    ce.setHex(secret ? colorSecretEdge : colorEdge);
    cm.setHex(secret ? colorSecretMid : colorMid);
    const curve = edgeCurve(scene.edgePoints(e));
    const n = Math.max(12, Math.ceil(curve.getLength() / 0.22));
    const pts = curve.getPoints(n);
    const base = pos.length / 3;
    for (let i = 0; i <= n; i++) {
      const p = pts[i];
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)];
      let tx = b.x - a.x, tz = b.z - a.z;
      const len = Math.hypot(tx, tz) || 1;
      tx /= len; tz /= len;
      const sx = -tz, sz = tx; // Seitenvektor in der Ebene
      const w = width / 2;
      const L = [p.x - sx * w, p.z - sz * w], R = [p.x + sx * w, p.z + sz * w];
      pos.push(L[0], heightAt(L[0], L[1]) + PATH_LIFT, L[1]);
      pos.push(p.x, heightAt(p.x, p.z) + PATH_LIFT + 0.05, p.z);
      pos.push(R[0], heightAt(R[0], R[1]) + PATH_LIFT, R[1]);
      col.push(ce.r, ce.g, ce.b, cm.r, cm.g, cm.b, ce.r, ce.g, ce.b);
      if (i < n) {
        const k = base + i * 3;
        // Blick von oben (+Y): gegen den Uhrzeigersinn (L, C, L'), (C, C', L'), (C, R, C'), (R, R', C')
        idx.push(k, k + 1, k + 3, k + 1, k + 4, k + 3);
        idx.push(k + 1, k + 2, k + 4, k + 2, k + 5, k + 4);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** Wege als zwei Meshes (frei/gesperrt) bauen. */
export function buildPathMeshes(scene, heightAt, track) {
  const open = [], locked = [];
  for (const e of scene.world.edges) (saveGame.edgeUnlocked(e) ? open : locked).push(e);
  const out = new THREE.Group();
  out.name = 'paths';
  if (open.length) {
    const geo = track(ribbonGeometry(open, scene, heightAt, { width: 0.62, colorEdge: 0xdcc48e, colorMid: 0xf6e7bd, colorSecretEdge: 0xe0a92a, colorSecretMid: 0xffe27a }));
    const mesh = new THREE.Mesh(geo, track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
    mesh.receiveShadow = true;
    mesh.name = 'paths-open';
    out.add(mesh);
  }
  if (locked.length) {
    const geo = track(ribbonGeometry(locked, scene, heightAt, { width: 0.46, colorEdge: 0x5a6a60, colorMid: 0x7a8a7a, colorSecretEdge: 0x8a7a3a, colorSecretMid: 0xb09a4a }));
    const mesh = new THREE.Mesh(geo, track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, transparent: true, opacity: 0.32, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
    mesh.name = 'paths-locked';
    out.add(mesh);
  }
  return out;
}

/** Podeste, Fahnen und Schlüssel an den Level-Punkten (je ein InstancedMesh). */
export class NodeMarkers {
  constructor(view, island) {
    this.view = view;
    this.island = island;
    this.scene = view.scene;
    this.nodes = island.nodes;
    this.disposables = [];
    this.group = new THREE.Group();
    this.group.name = 'nodes';
    this.hops = new Map(); // key → Startzeit des Hüpfers
    this.hopped = new Set(); // Knoten, die seit dem Aufbau gehüpft sind (Tests/Fehlersuche)
    this.build();
    this.refresh();
  }

  track(x) { this.disposables.push(x); return x; }

  build() {
    const n = this.nodes.length;
    // Podest: Scheibe mit etwas breiterem Sockel
    const top = new THREE.CylinderGeometry(PODIUM_R, PODIUM_R, PODIUM_H, 28).translate(0, PODIUM_H / 2, 0);
    const foot = new THREE.CylinderGeometry(PODIUM_R + 0.14, PODIUM_R + 0.22, 0.1, 28).translate(0, 0.05, 0);
    this.podiums = new THREE.InstancedMesh(this.track(mergeGeometries([top, foot])), this.track(new THREE.MeshStandardMaterial({ roughness: 0.55 })), n);
    top.dispose(); foot.dispose();
    this.podiums.castShadow = true; this.podiums.receiveShadow = true;
    this.podiums.name = 'podiums';
    // weißer Rand oben
    this.rims = new THREE.InstancedMesh(this.track(new THREE.TorusGeometry(PODIUM_R - 0.02, 0.06, 8, 36).rotateX(Math.PI / 2).translate(0, PODIUM_H, 0)), this.track(new THREE.MeshStandardMaterial({ roughness: 0.5 })), n);
    this.rims.name = 'rims';
    // Zielfahne: weißer Mast, rot-orangene Fahne
    const pole = colored(new THREE.CylinderGeometry(0.035, 0.045, 1.25, 8).translate(0, 0.625, 0), 0xf4f4f8);
    const knob = colored(new THREE.SphereGeometry(0.07, 8, 6).translate(0, 1.27, 0), 0xffd23a);
    const cloth = colored(new THREE.BoxGeometry(0.5, 0.3, 0.035).translate(0.27, 1.05, 0), 0xff5a3c);
    this.flags = new THREE.InstancedMesh(this.track(mergeGeometries([pole, knob, cloth])), this.track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 })), n);
    pole.dispose(); knob.dispose(); cloth.dispose();
    this.flags.name = 'flags'; // kein Schattenwurf (Kleinteil, spart einen Zeichenaufruf)
    // Schlüssel: Ring + Bart, golden
    const ring = new THREE.TorusGeometry(0.16, 0.05, 8, 18).translate(0, 0.42, 0);
    const bar = new THREE.BoxGeometry(0.07, 0.45, 0.07).translate(0, 0.0, 0);
    const bit1 = new THREE.BoxGeometry(0.14, 0.07, 0.07).translate(0.08, -0.2, 0);
    const bit2 = new THREE.BoxGeometry(0.11, 0.07, 0.07).translate(0.065, -0.07, 0);
    this.keys = new THREE.InstancedMesh(this.track(mergeGeometries([ring, bar, bit1, bit2])), this.track(new THREE.MeshStandardMaterial({ color: 0xf6c230, roughness: 0.35, metalness: 0.3 })), n);
    [ring, bar, bit1, bit2].forEach((g) => g.dispose());
    this.keys.name = 'keys'; // kein Schattenwurf (Kleinteil)
    this.group.add(this.podiums, this.rims, this.flags, this.keys);
  }

  /** Zustand aus dem Spielstand lesen (Farben, Fahnen, Schlüssel). */
  refresh() {
    const c = new THREE.Color();
    const world = this.scene.world;
    this.state = this.nodes.map((n) => {
      const lvl = saveGame.level(n.key);
      return { unlocked: saveGame.nodeUnlocked(world, n.key), done: lvl.done, secret: lvl.secret, y: this.island.heightAt(n.X, n.Z) };
    });
    this.state.forEach((s, i) => {
      this.podiums.setColorAt(i, c.setHex(s.unlocked ? 0xffc21a : 0x9a9ab0));
      this.rims.setColorAt(i, c.setHex(s.unlocked ? 0xffffff : 0xd8d8e6));
    });
    this.podiums.instanceColor.needsUpdate = true;
    this.rims.instanceColor.needsUpdate = true;
    this.update(0, 0);
  }

  /** Höhe der Podest-Oberseite am Knoten i. */
  topY(i) { return this.state[i].y + PODIUM_H; }

  /** Neu freigeschalteten Knoten hüpfen lassen. */
  hop(key) {
    this.hops.set(key, this.view.time + 0.4);
    this.hopped.add(key);
  }

  update(dt, t) {
    const current = this.scene.current;
    this.nodes.forEach((n, i) => {
      const s = this.state[i];
      let scale = 1, lift = 0;
      if (n.key === current) scale = 1 + 0.05 * Math.sin(t * 3.2);
      const h0 = this.hops.get(n.key);
      if (h0 !== undefined) {
        const u = t - h0;
        if (u < 0) { /* noch nicht losgehüpft */ }
        else if (u < 1.8) { const ph = (u % 0.6) / 0.6; lift = 0.5 * Math.sin(ph * Math.PI); scale *= 1 + 0.15 * Math.sin(ph * Math.PI); }
        else this.hops.delete(n.key);
      }
      const y = s.y - 0.06 + lift;
      setInstance(this.podiums, i, n.X, y, n.Z, scale, 1, scale);
      setInstance(this.rims, i, n.X, y, n.Z, scale, 1, scale);
      // Fahne hinten links, Schlüssel rechts (schwebt und dreht sich)
      const fs = s.done ? 1 : 0;
      setInstance(this.flags, i, n.X - 0.5, y + PODIUM_H, n.Z - 0.45, fs, fs, fs, -0.3);
      const ks = s.secret ? 1 : 0;
      setInstance(this.keys, i, n.X + 0.72, y + PODIUM_H + 0.45 + 0.06 * Math.sin(t * 2.3), n.Z - 0.25, ks, ks, ks, t * 1.4);
    });
    this.podiums.instanceMatrix.needsUpdate = true;
    this.rims.instanceMatrix.needsUpdate = true;
    this.flags.instanceMatrix.needsUpdate = true;
    this.keys.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.group.parent?.remove(this.group);
    for (const d of this.disposables) d.dispose?.();
    this.disposables.length = 0;
  }
}
