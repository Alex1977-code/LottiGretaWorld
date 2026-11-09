// Oberflächen-Detail für die Welt-Materialien (Gras, Sand, Stein, Mauern): feine Körnung, weiche Farbflecken und ein
// leichtes Relief – ohne ein einziges zusätzliches Dreieck und ohne Zeichenaufruf. applySurfaceDetail() erweitert ein
// MeshStandardMaterial per onBeforeCompile:
//   - eine kleine, kachelbare Rausch-Textur (256², im Speicher erzeugt: R feine Körnung, G mittlere Flecken, B Höhe fürs
//     Relief, A Grashalme für die Oberseiten grüner Flächen) wird über die Objekt-Koordinaten gelegt, je Fläche entlang
//     ihrer Hauptachse (statische Level-Geometrie liegt in Weltkoordinaten, also nahtlos über Bausteine hinweg; bewegte
//     Objekte tragen ihr Muster mit),
//   - die Grundfarbe (Vertexfarbe) wird damit um wenige Prozent heller/dunkler (im Mittel unverändert: die Helligkeit des
//     Levels bleibt gleich), dazu große, weiche Flecken (dieselbe Textur, 6× größer),
//   - die Normale bekommt ein feines Relief aus dem Höhenkanal (Ableitung im Bildraum, wie three.js-Bumpmaps),
//   - mit dem Abstand zur Kamera blendet alles aus (kein Flimmern in der Ferne); fast weiße Flächen (Wolken, Schnee) bleiben
//     ruhig.
// Alle Detail-Materialien teilen EIN onBeforeCompile und einen festen customProgramCacheKey (ein Programm je Grund-
// Variante). ?detail=0 schaltet ab (Vergleich); auf langsamen Geräten schaltet die adaptive Qualität das Detail ab, bevor
// sie die Auflösung senkt (setSurfaceDetailActive). ?detailk=grain:1.5,blotch:0.5,bump:2,far:40 stimmt ab.

import * as THREE from 'three';

function pickEnabled() {
  try { const q = new URLSearchParams(window.location.search).get('detail'); return q !== '0' && q !== 'false'; } catch { return true; }
}
function urlK() {
  try {
    const q = new URLSearchParams(window.location.search).get('detailk');
    if (!q) return {};
    return Object.fromEntries(q.split(',').map((p) => p.split(':')).filter(([a, b]) => a && Number.isFinite(+b)).map(([a, b]) => [a, +b]));
  } catch { return {}; }
}

export const DETAIL_ENABLED = pickEnabled();
const K = { grain: 1, blotch: 1, bump: 1, far: 46, ...urlK() };

// ------------------------------------------------------------------ Textur

/** Kachelbares Werte-Rauschen: n × n Gitterpunkte über die ganze Kachel, weich überblendet. */
function tileNoise(size, n, seed) {
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const grid = new Float32Array(n * n);
  for (let i = 0; i < grid.length; i++) grid[i] = rnd();
  const out = new Float32Array(size * size);
  const f = n / size;
  for (let y = 0; y < size; y++) {
    const gy = y * f, y0 = Math.floor(gy), ty = gy - y0, sy = ty * ty * (3 - 2 * ty);
    for (let x = 0; x < size; x++) {
      const gx = x * f, x0 = Math.floor(gx), tx = gx - x0, sx = tx * tx * (3 - 2 * tx);
      const a = grid[(y0 % n) * n + (x0 % n)], b = grid[(y0 % n) * n + ((x0 + 1) % n)];
      const c = grid[((y0 + 1) % n) * n + (x0 % n)], d = grid[((y0 + 1) % n) * n + ((x0 + 1) % n)];
      out[y * size + x] = a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    }
  }
  return out;
}

/** Summe mehrerer Oktaven, auf Mittelwert 0,5 und volle Spanne gebracht. */
function octaves(size, list, seed) {
  const out = new Float32Array(size * size);
  let wsum = 0;
  list.forEach(([n, w], i) => { const o = tileNoise(size, n, seed + i * 7919); for (let k = 0; k < out.length; k++) out[k] += o[k] * w; wsum += w; });
  let mean = 0, lo = Infinity, hi = -Infinity;
  for (let k = 0; k < out.length; k++) { out[k] /= wsum; mean += out[k]; }
  mean /= out.length;
  for (let k = 0; k < out.length; k++) { lo = Math.min(lo, out[k]); hi = Math.max(hi, out[k]); }
  const span = Math.max(mean - lo, hi - mean) || 1;
  for (let k = 0; k < out.length; k++) out[k] = 0.5 + ((out[k] - mean) / span) * 0.5;
  return out;
}

/** Kachelbare Grashalme: viele kurze, leicht schräge Striche (heller oder dunkler), weich gezeichnet; Mittel 0,5. */
function strokes(size, n, seed) {
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const out = new Float32Array(size * size);
  for (let i = 0; i < n; i++) {
    const cx = rnd() * size, cy = rnd() * size, a = (rnd() - 0.5) * 1.1, len = 5 + rnd() * 7, v = (rnd() < 0.5 ? -1 : 1) * (0.45 + rnd() * 0.55);
    const dx = Math.sin(a), dy = Math.cos(a);
    for (let t = -len / 2; t <= len / 2; t += 0.5) {
      const px = cx + dx * t, py = cy + dy * t, taper = 1 - Math.abs(t / (len / 2)) ** 2;
      const x0 = Math.floor(px), y0 = Math.floor(py), fx = px - x0, fy = py - y0;
      for (const [ox, oy, w] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]]) {
        const k = (((y0 + oy) % size + size) % size) * size + (((x0 + ox) % size + size) % size);
        out[k] += v * w * taper * 0.5;
      }
    }
  }
  let mean = 0, span = 0;
  for (let k = 0; k < out.length; k++) mean += out[k];
  mean /= out.length;
  for (let k = 0; k < out.length; k++) span = Math.max(span, Math.abs(out[k] - mean));
  for (let k = 0; k < out.length; k++) out[k] = 0.5 + ((out[k] - mean) / (span || 1)) * 0.5;
  return out;
}

let TEX = null;
function detailTexture() {
  if (TEX) return TEX;
  const S = 256;
  const fine = octaves(S, [[96, 1], [48, 0.7], [128, 0.5]], 0x51d7);       // Körnung (Kachel 4 m: ≈ 3–8 cm)
  const mid = octaves(S, [[10, 1], [20, 0.55], [5, 0.5]], 0x9e37);         // Flecken (≈ 0,2–0,8 m)
  const gras = strokes(S, 2600, 0x6a55);                                    // Grashalme (nur Oberseiten grüner Flächen)
  const data = new Uint8Array(S * S * 4);
  for (let i = 0; i < S * S; i++) {
    data[i * 4] = Math.round(fine[i] * 255);
    data[i * 4 + 1] = Math.round(mid[i] * 255);
    data[i * 4 + 2] = Math.round((mid[i] * 0.55 + fine[i] * 0.45) * 255);   // Höhe fürs Relief
    data[i * 4 + 3] = Math.round(gras[i] * 255);
  }
  TEX = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
  TEX.wrapS = TEX.wrapT = THREE.RepeatWrapping;
  TEX.magFilter = THREE.LinearFilter;
  TEX.minFilter = THREE.LinearMipmapLinearFilter;
  TEX.generateMipmaps = true;
  TEX.colorSpace = THREE.NoColorSpace;
  TEX.needsUpdate = true;
  return TEX;
}

// ------------------------------------------------------------------ Shader

const U = {
  sdMap: { value: null },
  // x Körnung, y Flecken, z Relief (globale Faktoren), w Sichtweite des Details (m)
  sdEnv: { value: new THREE.Vector4(K.grain, K.blotch, K.bump, K.far) },
};

const V_PARS = `
varying vec3 vSdPos;
varying vec3 vSdNrm;
`;
const V_BODY = `
	vSdPos = transformed;
	vSdNrm = objectNormal;
`;
const F_PARS = `
uniform sampler2D sdMap;
uniform vec4 sdEnv;
uniform vec4 sdMat;
varying vec3 vSdPos;
varying vec3 vSdNrm;
vec3 sdPerturb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDir ) {
	vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
	vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
	vec3 R1 = cross( vSigmaY, surf_norm );
	vec3 R2 = cross( surf_norm, vSigmaX );
	float fDet = dot( vSigmaX, R1 ) * faceDir;
	vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
	return normalize( abs( fDet ) * surf_norm - vGrad );
}
`;
// nach color_fragment: Grundfarbe modulieren (Mittel 1), Höhe fürs Relief merken. Drei Textur-Zugriffe: die Projektion der
// Hauptachse der Fläche (statt alle drei zu mischen – Bausteine sind fast immer achsparallel, das Rauschen verbirgt die
// Naht auf Rundungen), dieselbe 6× größer (Flecken) und die Halme von oben.
const F_COLOR = `
	vec3 sdN = abs( normalize( vSdNrm ) );
	vec2 sdUv = sdN.y >= max( sdN.x, sdN.z ) ? vSdPos.xz : ( sdN.x > sdN.z ? vSdPos.zy : vSdPos.xy );
	sdUv *= sdMat.w;
	float sdFade = 1.0 - smoothstep( sdEnv.w * 0.45, sdEnv.w, length( vViewPosition ) );
	// fast weiße Flächen (Wolken, Schnee) bleiben ruhig
	float sdCalm = mix( 0.3, 1.0, 1.0 - smoothstep( 0.62, 0.9, min( diffuseColor.r, min( diffuseColor.g, diffuseColor.b ) ) ) );
	float sdAmp = sdFade * sdCalm;
	// (ohne Verzweigung: Textur-Ableitungen sind nur in gleichförmigem Ablauf definiert)
	vec3 sdA = texture2D( sdMap, sdUv ).rgb;
	float sdB = texture2D( sdMap, sdUv * 0.17 ).g;
	// Gras: Oberseiten grüner Flächen bekommen Halme statt Körnung
	float sdGrass = smoothstep( 0.02, 0.14, diffuseColor.g - max( diffuseColor.r, diffuseColor.b ) * 1.05 ) * smoothstep( 0.75, 0.92, sdN.y );
	float sdHalm = texture2D( sdMap, vSdPos.xz * ( sdMat.w * 0.5 ) ).a;
	float sdFine = mix( sdA.r - 0.5, ( sdHalm - 0.5 ) * 2.1, sdGrass );
	float sdMod = sdFine * sdEnv.x * sdMat.x + ( ( sdA.g - 0.5 ) * 0.55 + ( sdB - 0.5 ) ) * sdEnv.y * sdMat.y;
	diffuseColor.rgb *= 1.0 + sdMod * sdAmp;
	float sdH = mix( sdA.b, sdHalm, sdGrass * 0.8 );
`;
// nach normal_fragment_maps: feines Relief
const F_NORMAL = `
	vec2 sdD = vec2( dFdx( sdH ), dFdy( sdH ) ) * ( sdEnv.z * sdMat.z * sdAmp );
	normal = sdPerturb( - vViewPosition, normal, sdD, faceDirection );
`;

const PATCHED = new WeakSet();
const LIVE = new Set();          // gepatchte, noch nicht freigegebene Materialien (für setSurfaceDetailActive)
let count = 0;
let active = DETAIL_ENABLED;

function sdCompile(shader, renderer) {
  const prev = this.__sdPrev;
  if (prev) prev.call(this, shader, renderer);
  if (!active) return;
  U.sdMap.value = detailTexture();
  shader.uniforms.sdMap = U.sdMap;
  shader.uniforms.sdEnv = U.sdEnv;
  shader.uniforms.sdMat = this.__sd;
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${V_PARS}`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>\n${V_BODY}`);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\n${F_PARS}`)
    .replace('#include <color_fragment>', `#include <color_fragment>\n${F_COLOR}`)
    .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${F_NORMAL}`);
}
const SD_KEY = 'surfdetail:1';
function sdKey() { const k = active ? SD_KEY : 'surfdetail:0'; return this.__sdPrevKey ? `${this.__sdPrevKey.call(this)}|${k}` : k; }

/**
 * Material um das Oberflächen-Detail erweitern (einmal je Material; ohne Wirkung bei ?detail=0 und bei Materialien ohne
 * Standard-Beleuchtung). opts: { grain: 0.11 (± Anteil der Körnung an der Grundfarbe), blotch: 0.09 (Flecken), bump: 1
 * (Relief), tile: 4 (Kachelgröße in m) }. Liefert das Material.
 */
export function applySurfaceDetail(material, opts = {}) {
  if (!DETAIL_ENABLED || !material?.isMeshStandardMaterial || PATCHED.has(material)) return material;
  PATCHED.add(material);
  count++;
  const hidden = (k, v) => Object.defineProperty(material, k, { value: v, writable: true, enumerable: false, configurable: true });
  hidden('__sd', { value: new THREE.Vector4((opts.grain ?? 0.11) * 2, (opts.blotch ?? 0.09) * 2, (opts.bump ?? 1) * 2.2, 1 / (opts.tile ?? 4)) });
  if (Object.prototype.hasOwnProperty.call(material, 'onBeforeCompile')) {
    hidden('__sdPrev', material.onBeforeCompile);
    hidden('__sdPrevKey', Object.prototype.hasOwnProperty.call(material, 'customProgramCacheKey') ? material.customProgramCacheKey : null);
  }
  material.onBeforeCompile = sdCompile;
  material.customProgramCacheKey = sdKey;
  material.needsUpdate = true;
  LIVE.add(material);
  material.addEventListener('dispose', () => LIVE.delete(material));
  return material;
}

/**
 * Detail zur Laufzeit ab-/anschalten (die Materialien übersetzen ihr Programm einmal neu). Die adaptive Qualität
 * (three/renderer.js) schaltet es auf langsamen Geräten ab, bevor sie die Auflösung senkt. Liefert true bei Wechsel.
 */
export function setSurfaceDetailActive(on) {
  on = !!on && DETAIL_ENABLED;
  if (on === active) return false;
  active = on;
  for (const m of LIVE) m.needsUpdate = true;
  return true;
}
export const surfaceDetailActive = () => active;

export const hasSurfaceDetail = (m) => !!m && PATCHED.has(m) && active;
/** Kennzahlen für Tests. */
export const surfaceDetailStats = () => ({ enabled: DETAIL_ENABLED, active, materials: count, k: { ...K } });
