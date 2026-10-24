// Gemeinsamer Three.js-Renderer für alle 3D-Ansichten (Level, Weltkarte). Die 3D-Leinwand #gl3d
// wird einmalig erzeugt und unter die transparente Phaser-Leinwand gelegt; jede Ansicht
// (View3D, MapView3D) holt sich den Renderer, gleicht die Leinwand-Lage an und gibt sie beim
// Beenden mit hideCanvas() frei. Ein Renderer pro Seite spart WebGL-Kontexte und Ladezeit.

import * as THREE from 'three';
import { RENDER3D } from '../render3d.js';

let shared = null;

// Adaptive Auflösung: Fällt die Bildrate über längere Zeit, wird die Zeichenfläche stufenweise
// verkleinert (bis 60 %). Das hält Mittelklasse-Handys bei 60 fps; der Wert gilt für alle Ansichten.
const quality = { scale: 1, slow: 0, fast: 0 };
const QUALITY_MIN = 0.6, QUALITY_STEP = 0.15;

/**
 * Je Frame aufrufen (delta in ms). Liefert true, wenn sich die Qualitätsstufe geändert hat und
 * die Leinwand neu ausgelegt werden muss (layoutCanvas mit force).
 */
export function adaptQuality(delta) {
  if (!RENDER3D.adaptive) return false;
  if (delta > 1000 / 45) { quality.slow++; quality.fast = 0; } else { quality.fast++; if (quality.fast > 20) quality.slow = 0; }
  // 90 langsame Frames in Folge (ca. 2 s bei 45 fps) → eine Stufe runter
  if (quality.slow >= 90 && quality.scale > QUALITY_MIN) {
    quality.scale = Math.max(QUALITY_MIN, quality.scale - QUALITY_STEP);
    quality.slow = 0;
    return true;
  }
  return false;
}

/** Aktuelle Qualitätsstufe (1 = volle Auflösung). */
export const getQualityScale = () => quality.scale;

// Tonemapping je Ansicht: alle Ansichten zeichnen ohne Tonemapping (Farben von Gelände, Himmel und Figuren sind darauf
// abgestimmt). Geprüft für den Spielzeug-Look (tests/toylook.mjs): „Neutral“ (Khronos PBR Neutral) staucht schon
// mittelhelles Gras und den hellen Himmel (Gras dunkler, Himmel grau), ACES/AgX zusätzlich Farbstich/Entsättigung –
// die weiche Lichter-Schulter sitzt deshalb nur in den Figuren-Materialien (three/lib/toyLook.js).
const TONE = { none: THREE.NoToneMapping, neutral: THREE.NeutralToneMapping, aces: THREE.ACESFilmicToneMapping, agx: THREE.AgXToneMapping };

/**
 * Tonemapping und Belichtung setzen (Wechsel übersetzt die betroffenen Shader einmal neu). urlOverride: Vergleichs-
 * schalter ?tone=neutral|aces|agx|none und ?exposure=1.1 aus der Adresse übernehmen (Kurs-Ansicht mit Spielzeug-Look).
 */
export function setToneMapping(renderer, mode = 'none', exposure = 1, urlOverride = false) {
  if (urlOverride) {
    try {
      const q = new URLSearchParams(window.location.search);
      if (TONE[q.get('tone')] !== undefined) mode = q.get('tone');
      if (q.has('exposure') && Number.isFinite(+q.get('exposure'))) exposure = +q.get('exposure');
    } catch { /* kein window */ }
  }
  renderer.toneMapping = TONE[mode] ?? THREE.NoToneMapping;
  renderer.toneMappingExposure = exposure;
}

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
  ratio = Math.min(ratio, Math.sqrt(RENDER3D.maxPixels / (pr.width * pr.height))) * quality.scale;
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
