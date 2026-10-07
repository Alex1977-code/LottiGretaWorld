// Gemeinsamer Three.js-Renderer für alle 3D-Ansichten (Level, Weltkarte). Die 3D-Leinwand #gl3d
// wird einmalig erzeugt und unter die transparente Phaser-Leinwand gelegt; jede Ansicht
// (View3D, MapView3D) holt sich den Renderer, gleicht die Leinwand-Lage an und gibt sie beim
// Beenden mit hideCanvas() frei. Ein Renderer pro Seite spart WebGL-Kontexte und Ladezeit.

import * as THREE from 'three';
import { RENDER3D } from '../render3d.js';

let shared = null;

/** Renderer und Leinwand holen (beim ersten Aufruf erzeugen). */
export function getRenderer() {
  if (shared) return shared;
  const canvas = document.createElement('canvas');
  canvas.id = 'gl3d';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance', stencil: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = RENDER3D.shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  shared = { renderer, canvas };
  return shared;
}

/** 3D-Leinwand als Geschwister vor die Phaser-Leinwand hängen (Phaser-Leinwand liegt per CSS darüber). */
export function mountCanvas(game, canvas) {
  const pc = game.canvas;
  const parent = pc.parentElement;
  if (canvas.parentElement !== parent) parent.insertBefore(canvas, pc);
  canvas.style.display = 'block';
  if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
}

/**
 * Lage, Größe und Auflösung der 3D-Leinwand an die Phaser-Leinwand angleichen.
 * state: { w, h } merkt sich die letzte Größe; liefert true, wenn sich etwas geändert hat.
 */
export function layoutCanvas(game, renderer, canvas, camera, state, force = false) {
  const pc = game.canvas;
  const w = pc.clientWidth, h = pc.clientHeight;
  if (!force && w === state.w && h === state.h) return false;
  if (w === 0 || h === 0) return false;
  state.w = w; state.h = h;
  const pr = pc.getBoundingClientRect();
  const pp = pc.parentElement.getBoundingClientRect();
  const st = canvas.style;
  st.left = `${pr.left - pp.left}px`;
  st.top = `${pr.top - pp.top}px`;
  st.width = `${pr.width}px`;
  st.height = `${pr.height}px`;
  // Auflösung: Gerätepixel, aber begrenzt (Füllrate auf dem Handy)
  let ratio = Math.min(window.devicePixelRatio || 1, RENDER3D.maxPixelRatio);
  ratio = Math.min(ratio, Math.sqrt(RENDER3D.maxPixels / (pr.width * pr.height)));
  renderer.setPixelRatio(ratio);
  renderer.setSize(pr.width, pr.height, false);
  if (camera) {
    camera.aspect = pr.width / pr.height;
    camera.updateProjectionMatrix();
  }
  return true;
}

/** Leinwand leeren und verstecken (Szene ohne 3D-Ansicht). */
export function hideCanvas(renderer, canvas) {
  renderer.setClearColor(0x000000, 1);
  renderer.clear();
  canvas.style.display = 'none';
}
